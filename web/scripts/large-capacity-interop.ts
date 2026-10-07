/** Reconstruct Python >1 MiB fixtures and emit independently prepared TypeScript frames. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Receiver, Transfer, hex, prepareContainer, sha256, unhex } from '../src/codec/core';

const directory = resolve(import.meta.dirname, '../../artifacts/large-capacity');
const data = Uint8Array.from({ length: 251 * 8355 + 64 }, (_, i) => i % 251);
interface Case {
  producer: string; name: string; mime: string; created: number; session_hex: string;
  symbol_size: number; container_sha256: string; payload_sha256: string; frames: string[];
}
const input = JSON.parse(readFileSync(resolve(directory, 'python.json'), 'utf8')) as Case;
const container = await prepareContainer(data, input.name, input.mime, input.created);
if (hex(await sha256(container)) !== input.container_sha256) throw new Error('Python container mismatch');
const transfer = new Transfer(container, input.symbol_size, unhex(input.session_hex));
if (transfer.k <= 2048 || input.frames.length !== transfer.k) throw new Error('Missing expanded source cycle');
const receiver = new Receiver();
for (let index = 0; index < input.frames.length; index++) {
  const text = input.frames[index];
  if (await transfer.text(transfer.k - 1 - index) !== text) throw new Error('Python frame mismatch');
  await receiver.ingest(text);
}
if (!receiver.result || hex(await sha256(receiver.result.data)) !== input.payload_sha256) throw new Error('Python payload mismatch');
const output = { ...input, producer: 'typescript', name: 'large-typescript-\u2603.bin', session_hex: 'fe'.repeat(16), frames: [] as string[] };
const prepared = await prepareContainer(data, output.name, output.mime, output.created);
output.container_sha256 = hex(await sha256(prepared));
const emitted = new Transfer(prepared, output.symbol_size, unhex(output.session_hex));
for (let seq = emitted.k - 1; seq >= 0; seq--) output.frames.push(await emitted.text(seq));
mkdirSync(directory, { recursive: true });
writeFileSync(resolve(directory, 'typescript.json'), JSON.stringify(output));
console.log(`TypeScript verified Python and independently emitted ${data.length}-byte transfer with ${emitted.k} symbols; synthetic only`);
