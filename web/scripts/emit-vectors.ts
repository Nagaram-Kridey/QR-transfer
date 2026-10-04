import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Transfer, hex, packFrame, prepareContainer } from '../src/codec/core';

const transfers = [];
for (const size of [0, 31, 256, 1024]) {
  const data = Uint8Array.from({ length: size }, (_, i) => (i * 17 + 3) % 256);
  const name = `typescript-${size}-🌍.bin`, mime = 'application/octet-stream', created = 1700100000;
  const session = Uint8Array.from({ length: 16 }, (_, i) => 255 - i);
  const container = await prepareContainer(data, name, mime, created);
  const transfer = new Transfer(container, 128, session);
  const frames = [];
  for (let seq = transfer.k - 1; seq >= 0; seq--) {
    frames.push({ seq, hex: hex(await packFrame(transfer.frame(seq))), text: await transfer.text(seq) });
  }
  transfers.push({ producer: 'typescript', data_hex: hex(data), name, mime, created,
    session_hex: hex(session), symbol_size: 128, container_hex: hex(container), frames });
}
const directory = resolve(import.meta.dirname, '../../artifacts');
mkdirSync(directory, { recursive: true });
writeFileSync(resolve(directory, 'typescript-vectors.json'), JSON.stringify({ transfers }, null, 2) + '\n');
console.log(`Emitted ${transfers.length} independent TypeScript fixtures`);
