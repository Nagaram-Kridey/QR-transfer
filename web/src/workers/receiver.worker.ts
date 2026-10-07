import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { ProtocolError, Receiver } from '../codec/core';
import type { ScanMetrics } from '../diagnostics/camera';
import { decoderCorners } from '../camera/geometry';
import type { Point } from '../camera/geometry';
import type { WorkerInput, WorkerOutput } from './messages';

const receiver = new Receiver();
let busy = false;
const send = (message: WorkerOutput): void => self.postMessage(message);
prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => path.endsWith('.wasm') ? wasmUrl : prefix + path } });

async function ingest(texts: string[], onAdmission?: (index: number) => void): Promise<Extract<WorkerOutput, { type: 'progress' | 'complete' }>> {
  let warning: string | undefined;
  for (let index = 0; index < texts.length; index++) {
    const text = texts[index];
    try {
      const file = await receiver.ingest(text);
      onAdmission?.(index);
      if (file) return { type: 'complete', file, stats: { ...receiver.stats } };
    } catch (error) {
      if (!(error instanceof ProtocolError) || receiver.stats.state === 'FAILED') throw error;
      warning = error.code === 'SESSION_MISMATCH' ? 'Another session detected. Stop and reset to switch.' : error.message;
    }
  }
  return { type: 'progress', stats: { ...receiver.stats }, warning };
}
async function scan(message: Extract<WorkerInput, { type: 'image' }>): Promise<void> {
  const before = { ...receiver.stats };
  const metrics: ScanMetrics = {
    attempt_id: message.attempt_id, decode_ms: null, admission_ms: null,
    decoded_qr_count: 0, unique_delta: 0, duplicate_delta: 0, rejected_delta: 0,
    admitted: false, error_stage: null,
  };
  let response: WorkerOutput | undefined;
  let acceptedCorners: readonly Point[] | null = null;
  let stage: 'decode' | 'admission' = 'decode';
  let started = performance.now();
  try {
    const data = new ImageData(message.pixels, message.width, message.height);
    const codes = await readBarcodes(data, { formats: ['QRCode'], maxNumberOfSymbols: 1, tryHarder: false });
    metrics.decode_ms = performance.now() - started;
    metrics.decoded_qr_count = codes.length;
    if (codes.length) {
      stage = 'admission'; started = performance.now();
      response = await ingest(codes.map(code => code.text), index => {
        metrics.admitted = true;
        acceptedCorners = decoderCorners(codes[index].position);
      });
      metrics.admission_ms = performance.now() - started;
    }
  } catch (error) {
    metrics.error_stage = stage;
    if (stage === 'decode') metrics.decode_ms = performance.now() - started;
    else metrics.admission_ms = performance.now() - started;
    response = { type: 'error', message: error instanceof Error ? error.message : 'Camera decoder failed' };
  }
  metrics.unique_delta = Math.max(0, receiver.stats.recovered - before.recovered);
  metrics.duplicate_delta = receiver.stats.duplicates - before.duplicates;
  metrics.rejected_delta = receiver.stats.rejected - before.rejected;
  // Finish the attempt and publish its receiver state before a terminal response
  // can make the UI terminate this worker.
  send({ type: 'scan', capture_epoch: message.capture_epoch, accepted_corners: acceptedCorners, metrics, stats: { ...receiver.stats } });
  if (response) send(response);
}
self.onmessage = async (event: MessageEvent<WorkerInput>): Promise<void> => {
  if (busy) return; // One image/message in flight; the UI drops camera frames while busy.
  busy = true;
  try {
    const message = event.data;
    if (message.type === 'start') {
      await prepareZXingModule({ fireImmediately: true });
      send({ type: 'ready' });
    } else if (message.type === 'image') {
      await scan(message);
    } else {
      if (message.texts.length > 2048 || message.texts.some(text => typeof text !== 'string' || text.length > 1589)) throw new Error('Frame export exceeds limits');
      send(await ingest(message.texts));
      if (receiver.stats.state !== 'DONE') throw new Error('Frame export is incomplete. No file was saved.');
    }
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : 'Camera decoder failed' });
  } finally { busy = false; send({ type: 'idle' }); }
};
