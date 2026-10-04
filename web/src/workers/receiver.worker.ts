import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { ProtocolError, Receiver } from '../codec/core';
import type { WorkerInput, WorkerOutput } from './messages';

const receiver = new Receiver();
let busy = false;
const send = (message: WorkerOutput): void => self.postMessage(message);
prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => path.endsWith('.wasm') ? wasmUrl : prefix + path } });

async function ingest(texts: string[]): Promise<void> {
  let warning: string | undefined;
  for (const text of texts) {
    try {
      const file = await receiver.ingest(text);
      if (file) { send({ type: 'complete', file, stats: { ...receiver.stats } }); return; }
    } catch (error) {
      if (!(error instanceof ProtocolError) || receiver.stats.state === 'FAILED') throw error;
      warning = error.code === 'SESSION_MISMATCH' ? 'Another session detected. Stop and reset to switch.' : error.message;
    }
  }
  send({ type: 'progress', stats: { ...receiver.stats }, warning });
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
      const data = new ImageData(message.pixels, message.width, message.height);
      const codes = await readBarcodes(data, { formats: ['QRCode'], maxNumberOfSymbols: 1, tryHarder: false });
      if (codes.length) await ingest(codes.map(code => code.text));
    } else {
      if (message.texts.length > 2048 || message.texts.some(text => typeof text !== 'string' || text.length > 1589)) throw new Error('Frame export exceeds limits');
      await ingest(message.texts);
      if (receiver.stats.state !== 'DONE') throw new Error('Frame export is incomplete. No file was saved.');
    }
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : 'Camera decoder failed' });
  } finally { busy = false; send({ type: 'idle' }); }
};
