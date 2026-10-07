import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import vectors from '../../../vectors/repeat-v2.json';
import {
  FLAGS, LIMITS, Receiver, Transfer, base45Decode, base45Encode, concat,
  chooseSymbolSize, decodeFrame, encodeFrame, hex, openContainer, packFrame, prepareContainer,
  sanitizeFilename, sha256, unhex, unpackFrame, validateFrame,
} from './core';

describe('cross-language wire contract', () => {
  for (const test of vectors.base45) {
    it(`RFC Base45 ${JSON.stringify(test.text)}`, () => {
      expect(base45Encode(unhex(test.hex))).toBe(test.text);
      expect(hex(base45Decode(test.text))).toBe(test.hex);
    });
  }
  for (const test of vectors.transfers) {
    it(`recreates and receives Python transfer: ${test.id}`, async () => {
      const container = await prepareContainer(unhex(test.data_hex), test.name, test.mime, test.created);
      expect(hex(container)).toBe(test.container_hex);
      const transfer = new Transfer(container, test.symbol_size, unhex(test.session_hex));
      const receiver = new Receiver();
      for (const frame of [...test.frames].reverse()) {
        expect(hex(await packFrame(transfer.frame(frame.seq)))).toBe(frame.hex);
        expect(await transfer.text(frame.seq)).toBe(frame.text);
        expect(hex((await decodeFrame(frame.text)).sessionId)).toBe(test.session_hex);
        await receiver.ingest(frame.text);
      }
      expect(hex(receiver.result!.data)).toBe(test.data_hex);
      expect(receiver.stats.state).toBe('DONE');
    });
  }
  for (const test of vectors.invalid_frames) {
    it(`rejects shared fixture: ${test.id}`, async () => {
      await expect(decodeFrame(test.text)).rejects.toMatchObject({ code: test.error });
    });
  }
});

it('roundtrips arbitrary Base45 and rejects invalid groups', () => {
  fc.assert(fc.property(fc.uint8Array({ maxLength: 1500 }), bytes => { expect(base45Decode(base45Encode(bytes))).toEqual(bytes); }));
  expect(() => base45Decode('ZZ')).toThrow();
  expect(() => unhex('0')).toThrow();
  expect(() => unhex('gg')).toThrow();
});

it('reconstructs dropped first cycles, duplicates and reverse order', async () => {
  await fc.assert(fc.asyncProperty(fc.uint8Array({ maxLength: 5000 }), async data => {
    const transfer = new Transfer(await prepareContainer(data, 'property.bin', undefined, 0), 128);
    const receiver = new Receiver();
    const indices = Array.from({ length: transfer.k }, (_, i) => i);
    for (const seq of [...indices.filter(i => i % 2 === 0), ...indices.filter(i => i % 2 === 0), ...indices.reverse()]) {
      await receiver.ingest(await transfer.text(seq));
    }
    expect(receiver.result!.data).toEqual(data);
  }), { numRuns: 50 });
});

it('fuzzes the parser without uncaught implementation errors', async () => {
  await fc.assert(fc.asyncProperty(fc.uint8Array({ maxLength: 2000 }), async raw => {
    try { await unpackFrame(raw); }
    catch (error) { expect(error).toHaveProperty('code'); }
  }), { numRuns: 150 });
});

it('rejects malformed frame fields, padding and overflowing sequence', async () => {
  const transfer = new Transfer(await prepareContainer(new Uint8Array(400), 'file', undefined, 0));
  const frame = transfer.frame(0);
  for (const change of [
    { flags: 0x14 }, { flags: 0x2c }, { flags: 0x20 }, { sessionId: new Uint8Array(1) },
    { containerLen: 0 }, { containerLen: LIMITS.container + 1 }, { symbolSize: 0 },
    { symbolSize: 1025 }, { containerLen: LIMITS.symbols + 1, symbolSize: 1 }, { seq: -1 },
    { seq: 2 ** 32 }, { seq: 1.5 }, { symbol: new Uint8Array() },
  ]) expect(() => validateFrame({ ...frame, ...change })).toThrow();
  const last = transfer.frame(transfer.k - 1);
  last.symbol[last.symbol.length - 1] = 1;
  expect(() => validateFrame(last)).toThrow('padding');
  expect(() => new Transfer(new Uint8Array())).toThrow();
  expect(() => new Transfer(new Uint8Array(5), 0)).toThrow();
});

it('locks a session and bounds conflicting duplicate input', async () => {
  const container = await prepareContainer(new Uint8Array(1000), 'file', undefined, 0);
  const a = new Transfer(container), b = new Transfer(container);
  const receiver = new Receiver();
  await receiver.ingest(await a.text(0));
  await receiver.ingest(await a.text(a.k));
  expect(receiver.stats.duplicates).toBe(1);
  await expect(receiver.ingest(await b.text(0))).rejects.toMatchObject({ code: 'SESSION_MISMATCH' });
  const altered = a.frame(0); altered.symbol[0] ^= 1;
  await expect(receiver.ingest(await encodeFrame(altered))).rejects.toMatchObject({ code: 'SYMBOL_CONFLICT' });
  expect(receiver.stats.recovered).toBe(1);
});

it('rejects concurrent ingestion and fails terminally on file corruption', async () => {
  const container = await prepareContainer(new Uint8Array(600), 'file', undefined, 0);
  container[container.length - 1] ^= 1;
  const transfer = new Transfer(container);
  const receiver = new Receiver();
  const text = await transfer.text(0);
  const pending = receiver.ingest(text);
  await expect(receiver.ingest(text)).rejects.toMatchObject({ code: 'BUSY' });
  await pending;
  for (let seq = 1; seq < transfer.k - 1; seq++) await receiver.ingest(await transfer.text(seq));
  await expect(receiver.ingest(await transfer.text(transfer.k - 1))).rejects.toMatchObject({ code: 'FILE_HASH' });
  expect(receiver.stats.state).toBe('FAILED');
  await expect(receiver.ingest(text)).rejects.toMatchObject({ code: 'STATE' });
});

it('validates bounded canonical manifests and payloads', async () => {
  const valid = { name: 'file', mime: 'x', size: 0, sha256: hex(await sha256(new Uint8Array())), created: 0, v: 1 };
  const wrap = (text: string, data = new Uint8Array()): Uint8Array => {
    const bytes = new TextEncoder().encode(text);
    return concat(Uint8Array.of(bytes.length >> 8, bytes.length & 255), bytes, data);
  };
  const bad: unknown[] = [null, [], {}, { ...valid, extra: 1 }, { ...valid, name: 0 },
    { ...valid, name: '' }, { ...valid, name: '\ud800' }, { ...valid, mime: '' },
    { ...valid, size: true }, { ...valid, size: -1 }, { ...valid, size: LIMITS.file + 1 },
    { ...valid, created: -1 }, { ...valid, created: 2 ** 53 }, { ...valid, v: 2 },
    { ...valid, sha256: 'bad' }, { ...valid, sha256: '0'.repeat(64) }];
  for (const value of bad) await expect(openContainer(wrap(JSON.stringify(value)))).rejects.toThrow();
  for (const raw of [
    new Uint8Array(), Uint8Array.of(0, 0), Uint8Array.of(0, 1, 255), Uint8Array.of(0, 1, 91),
    Uint8Array.of(0, 20, 1), new Uint8Array(LIMITS.file + LIMITS.manifest + 3),
    wrap(JSON.stringify(valid, null, 2)), wrap(JSON.stringify(valid).slice(0, -1) + ',"v":1}'),
    wrap(JSON.stringify(valid), Uint8Array.of(1)),
  ]) await expect(openContainer(raw)).rejects.toThrow();
  await expect(prepareContainer(new Uint8Array(LIMITS.file + 1), 'file')).rejects.toThrow();
  await expect(prepareContainer(new Uint8Array(), 'x'.repeat(4096))).rejects.toThrow();
  expect((await openContainer(await prepareContainer(new Uint8Array(), 'file'))).data.length).toBe(0);
});

it('sanitizes Unicode and Windows filenames consistently', () => {
  expect(sanitizeFilename('../../secret.txt')).toBe('_.._secret.txt');
  expect(sanitizeFilename('CON.txt')).toBe('_CON.txt');
  expect(sanitizeFilename('..')).toBe('received.bin');
  expect(sanitizeFilename('e\u0301.txt')).toBe('é.txt');
  expect(sanitizeFilename('\0x:stream')).toBe('_x_stream');
  expect(Array.from(sanitizeFilename('😀'.repeat(130))).length).toBe(60);
});

it('handles an exact symbol boundary and maximum supported file', async () => {
  const raw = new Uint8Array(512);
  const exact = new Transfer(raw, 256);
  expect(exact.k).toBe(2);
  expect((await decodeFrame(await exact.text(1))).flags).toBe(FLAGS);
  const container = await prepareContainer(new Uint8Array(LIMITS.file), 'max.bin', undefined, 0);
  expect(() => new Transfer(container, 256)).toThrow('choose at least');
  const transfer = new Transfer(container, 1024);
  const receiver = new Receiver();
  for (let seq = 0; seq < transfer.k; seq++) await receiver.ingest(await transfer.text(seq));
  expect(receiver.result!.data.length).toBe(LIMITS.file);
}, 30_000);

it('expands the old count boundary and accounts for maximum manifest overhead', async () => {
  expect(new Transfer(new Uint8Array(2049), 1).k).toBe(2049);
  expect(new Transfer(new Uint8Array(LIMITS.symbols), 1).k).toBe(LIMITS.symbols);
  expect(() => new Transfer(new Uint8Array(LIMITS.symbols + 1), 1)).toThrow('choose at least');
  const data = new Uint8Array(LIMITS.file);
  const plain = await prepareContainer(data, 'a', undefined, 0);
  const manifestLength = plain[0] * 256 + plain[1];
  const largest = await prepareContainer(data, 'a'.repeat(1 + LIMITS.manifest - manifestLength), undefined, 0);
  expect(largest[0] * 256 + largest[1]).toBe(LIMITS.manifest);
  expect(largest.length).toBe(LIMITS.file + LIMITS.manifest + 2);
  expect(new Transfer(largest, 1024).k).toBeLessThanOrEqual(LIMITS.symbols);
  expect(() => new Transfer(largest, 640)).toThrow('choose at least');
});

it.each([{ length: LIMITS.container + 1, size: 1024 }, { length: 8193, size: 1 }, { length: 1, size: 1025 }])('rejects hostile metadata before allocating or locking a session %j', async ({ length, size }) => {
  const body = new Uint8Array(27 + size);
  const view = new DataView(body.buffer);
  body[0] = FLAGS; view.setUint32(17, length); view.setUint16(21, size);
  const text = base45Encode(concat(body, (await sha256(body)).slice(0, 8)));
  const receiver = new Receiver();
  await expect(receiver.ingest(text)).rejects.toThrow();
  expect(receiver.stats).toMatchObject({ state: 'IDLE', recovered: 0, total: 0, session: '' });
  expect(receiver.result).toBeNull();
});

it.each([[1, 256, 256], [8192 * 256, 256, 256], [8192 * 256 + 1, 256, 512], [8192 * 512 + 1, 256, 1024], [1, 512, 512], [1, 1024, 1024]])('adapts density for native container count %i/preference %i', (length, preferred, expected) => {
  expect(chooseSymbolSize(length, preferred)).toBe(expected);
});

it.each([[0, 256], [-1, 256], [LIMITS.container + 1, 256], [1, 0], [1, 640], [NaN, 256], [1.5, 256]])('rejects invalid density input %i/%i', (length, preferred) => {
  expect(() => chooseSymbolSize(length, preferred)).toThrow();
});
