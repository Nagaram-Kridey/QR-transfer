import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Transfer, prepareContainer } from '../codec/core';
import type { WorkerInput } from './messages';

const reader = vi.hoisted(() => ({
  prepareZXingModule: vi.fn(async () => undefined),
  readBarcodes: vi.fn<(...args: unknown[]) => Promise<{ text: string }[]>>(async () => []),
}));
vi.mock('zxing-wasm/reader', () => reader);
vi.mock('zxing-wasm/reader/zxing_reader.wasm?url', () => ({ default: '/local-reader.wasm' }));

type Output = { type: string; metrics?: Record<string, unknown>; stats?: Record<string, unknown> };
let output: Output[];
let scope: { onmessage: ((event: MessageEvent<WorkerInput>) => Promise<void>) | null; postMessage: (message: Output) => void };

beforeEach(async () => {
  vi.resetModules();
  reader.prepareZXingModule.mockClear();
  reader.readBarcodes.mockReset();
  reader.readBarcodes.mockResolvedValue([]);
  output = [];
  scope = { onmessage: null, postMessage: message => output.push(message) };
  vi.stubGlobal('self', scope);
  vi.stubGlobal('ImageData', class {
    constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
  });
  await import('./receiver.worker');
  await dispatch({ type: 'start' });
  output = [];
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function dispatch(data: WorkerInput): Promise<void> {
  await scope.onmessage!(new MessageEvent('message', { data }));
}
async function image(id = 1): Promise<void> {
  await dispatch({ type: 'image', attempt_id: id, pixels: new Uint8ClampedArray(4), width: 1, height: 1 });
}
function scan(): Output {
  const scans = output.filter(message => message.type === 'scan');
  expect(scans).toHaveLength(1);
  return scans[0];
}

describe('one camera attempt diagnostics without a second decoder/hash pass', () => {
  it('counts no QR as a completed scan and no protocol admission', async () => {
    await image(7);
    expect(scan().metrics).toMatchObject({
      attempt_id: 7, decoded_qr_count: 0, unique_delta: 0, duplicate_delta: 0,
      rejected_delta: 0, admitted: false, error_stage: null,
    });
    expect(output.map(message => message.type)).toEqual(['scan', 'idle']);
    expect(reader.readBarcodes).toHaveBeenCalledTimes(1);
    expect(reader.readBarcodes.mock.calls[0][1]).toEqual({ formats: ['QRCode'], maxNumberOfSymbols: 1, tryHarder: false });
  });

  it('distinguishes a recovered symbol, duplicate and rejected decoded QR', async () => {
    const transfer = new Transfer(await prepareContainer(new Uint8Array(500), 'synthetic.bin', undefined, 0));
    const text = await transfer.text(0);
    reader.readBarcodes.mockResolvedValue([{ text }]);
    const digest = vi.spyOn(crypto.subtle, 'digest');
    await image();
    expect(scan().metrics).toMatchObject({ unique_delta: 1, duplicate_delta: 0, rejected_delta: 0, admitted: true });
    expect(digest).toHaveBeenCalledTimes(1);
    output = [];
    await image(2);
    expect(scan().metrics).toMatchObject({ unique_delta: 0, duplicate_delta: 1, rejected_delta: 0, admitted: true });
    expect(digest).toHaveBeenCalledTimes(2);
    output = [];
    reader.readBarcodes.mockResolvedValue([{ text: 'THIS IS NOT A LUMENLINK FRAME' }]);
    await image(3);
    expect(scan().metrics).toMatchObject({ unique_delta: 0, duplicate_delta: 0, rejected_delta: 1, admitted: false });
    expect(JSON.stringify(scan().metrics)).not.toContain(text);
    expect(JSON.stringify(scan().metrics)).not.toContain('THIS IS NOT A LUMENLINK FRAME');
  });

  it('emits final scan metrics before verified completion', async () => {
    const transfer = new Transfer(await prepareContainer(new Uint8Array(), 'empty.bin', undefined, 0));
    reader.readBarcodes.mockResolvedValue([{ text: await transfer.text(0) }]);
    await image(8);
    const types = output.map(message => message.type);
    expect(types.indexOf('scan')).toBeLessThan(types.indexOf('complete'));
    expect(types.at(-1)).toBe('idle');
    expect(scan().metrics).toMatchObject({ attempt_id: 8, unique_delta: 1, admitted: true, error_stage: null });
    expect(scan().stats).toMatchObject({ state: 'DONE', recovered: 1 });
  });

  it('preserves terminal verification failure metrics before the error', async () => {
    const container = await prepareContainer(new Uint8Array([1]), 'bad.bin', undefined, 0);
    container[container.length - 1] ^= 1;
    const transfer = new Transfer(container);
    reader.readBarcodes.mockResolvedValue([{ text: await transfer.text(0) }]);
    await image(9);
    const types = output.map(message => message.type);
    expect(types.indexOf('scan')).toBeLessThan(types.indexOf('error'));
    expect(scan().metrics).toMatchObject({ attempt_id: 9, rejected_delta: 1, admitted: false, error_stage: 'admission' });
    expect(scan().stats).toMatchObject({ state: 'FAILED' });
  });

  it('records decoder failure without leaking the thrown text into metrics', async () => {
    reader.readBarcodes.mockRejectedValue(new Error('PRIVATE_QR_TEXT_OR_PIXELS'));
    await image(10);
    expect(scan().metrics).toMatchObject({ attempt_id: 10, error_stage: 'decode', admitted: false });
    expect(output.map(message => message.type)).toEqual(['scan', 'error', 'idle']);
    expect(JSON.stringify(scan().metrics)).not.toContain('PRIVATE_QR_TEXT_OR_PIXELS');
  });

  it('does not start a second image while the first attempt is decoding', async () => {
    let release!: (codes: { text: string }[]) => void;
    reader.readBarcodes.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const first = image(11);
    await image(12);
    expect(reader.readBarcodes).toHaveBeenCalledTimes(1);
    release([]);
    await first;
    expect(scan().metrics).toMatchObject({ attempt_id: 11 });
  });

  it('keeps conformance text import outside camera scan metrics', async () => {
    const transfer = new Transfer(await prepareContainer(new Uint8Array(), 'empty.bin', undefined, 0));
    await dispatch({ type: 'texts', texts: [await transfer.text(0)] });
    expect(output.map(message => message.type)).toEqual(['complete', 'idle']);
    expect(reader.readBarcodes).not.toHaveBeenCalled();
  });
});
