/** Wire v2, plaintext repeat mode. No DOM, camera, or network access. */
export const LIMITS = {
  file: 1_048_576, manifest: 4096, container: 1_052_702,
  symbol: 1024, symbols: 2048, frame: 1059, text: 1589,
} as const;
export const FLAGS = 0x24;
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const fields = ['name', 'mime', 'size', 'sha256', 'created', 'v'];

export class ProtocolError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}
function reject(code: string, message: string): never { throw new ProtocolError(code, message); }
export function concat(...arrays: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const output = new Uint8Array(arrays.reduce((sum, value) => sum + value.length, 0));
  let offset = 0;
  for (const array of arrays) { output.set(array, offset); offset += array.length; }
  return output;
}
export const hex = (bytes: Uint8Array): string => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
export function unhex(text: string): Uint8Array<ArrayBuffer> {
  if (text.length % 2 || !/^[0-9a-f]*$/i.test(text)) reject('HEX', 'Invalid hex bytes');
  return Uint8Array.from(text.match(/../g) ?? [], pair => Number.parseInt(pair, 16));
}
export async function sha256(bytes: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)));
}
export function base45Encode(bytes: Uint8Array): string {
  let output = '';
  for (let i = 0; i < bytes.length; i += 2) {
    const pair = i + 1 < bytes.length;
    let value = pair ? bytes[i] * 256 + bytes[i + 1] : bytes[i];
    for (let n = 0; n < (pair ? 3 : 2); n++) {
      output += alphabet[value % 45]; value = Math.floor(value / 45);
    }
  }
  return output;
}
export function base45Decode(text: string): Uint8Array<ArrayBuffer> {
  if (text.length % 3 === 1) reject('BASE45', 'Invalid Base45 group length');
  const output: number[] = [];
  for (let offset = 0; offset < text.length; offset += 3) {
    const group = text.slice(offset, offset + 3);
    let value = 0;
    for (let n = 0; n < group.length; n++) {
      const digit = alphabet.indexOf(group[n]);
      if (digit < 0) reject('BASE45', 'Invalid Base45 character');
      value += digit * 45 ** n;
    }
    if (value >= (group.length === 3 ? 65536 : 256)) reject('BASE45', 'Base45 group overflow');
    if (group.length === 3) output.push(value >> 8);
    output.push(value & 255);
  }
  return Uint8Array.from(output);
}

export interface Manifest {
  name: string; mime: string; size: number; sha256: string; created: number; v: number;
}
export interface ReceivedFile {
  name: string; mime: string; data: Uint8Array<ArrayBuffer>; sha256: string; created: number;
}
export function sanitizeFilename(input: string): string {
  let name = input.normalize('NFC').replace(/[<>:"/\\|?*\p{C}]/gu, '_').replace(/^[ .]+|[ .]+$/g, '');
  name = Array.from(name).slice(0, 120).join('').replace(/[ .]+$/g, '');
  while (encoder.encode(name).length > 240) name = Array.from(name).slice(0, -1).join('');
  name = name.replace(/[ .]+$/g, '');
  if (!name || name === '.' || name === '..') name = 'received.bin';
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name)) name = '_' + name;
  return name;
}
function validateManifest(value: unknown): asserts value is Manifest {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) reject('MANIFEST', 'Invalid manifest');
  const m = value as Record<string, unknown>;
  if (Object.keys(m).length !== fields.length || fields.some(key => !Object.hasOwn(m, key))) reject('MANIFEST', 'Incorrect manifest fields');
  for (const field of ['name', 'mime', 'sha256']) {
    if (typeof m[field] !== 'string' || decoder.decode(encoder.encode(m[field])) !== m[field]) reject('MANIFEST', 'Invalid manifest string');
  }
  if (!m.name || !m.mime) reject('MANIFEST', 'Empty filename or MIME type');
  if (!Number.isSafeInteger(m.size) || (m.size as number) < 0 || (m.size as number) > LIMITS.file) reject('FILE_SIZE', 'File exceeds 1 MiB');
  if (!Number.isSafeInteger(m.created) || (m.created as number) < 0) reject('MANIFEST', 'Invalid timestamp');
  if (m.v !== 1 || !/^[0-9a-f]{64}$/.test(m.sha256 as string)) reject('MANIFEST', 'Invalid version or hash');
}
function serializeManifest(m: Manifest): string {
  return JSON.stringify({ name: m.name, mime: m.mime, size: m.size, sha256: m.sha256, created: m.created, v: m.v });
}
export async function prepareContainer(
  data: Uint8Array, name: string, mime = 'application/octet-stream', created = Math.floor(Date.now() / 1000),
): Promise<Uint8Array<ArrayBuffer>> {
  if (data.length > LIMITS.file) reject('FILE_SIZE', 'File exceeds 1 MiB');
  const manifest = { name, mime, size: data.length, sha256: hex(await sha256(data)), created, v: 1 };
  validateManifest(manifest);
  const encoded = encoder.encode(serializeManifest(manifest));
  if (encoded.length > LIMITS.manifest) reject('MANIFEST', 'Manifest exceeds 4 KiB');
  return concat(Uint8Array.of(encoded.length >> 8, encoded.length & 255), encoded, data);
}
export async function openContainer(raw: Uint8Array): Promise<ReceivedFile> {
  if (raw.length < 2 || raw.length > LIMITS.file + LIMITS.manifest + 2) reject('LENGTH', 'Invalid plaintext container length');
  const length = raw[0] * 256 + raw[1];
  if (length < 1 || length > LIMITS.manifest || 2 + length > raw.length) reject('MANIFEST', 'Invalid manifest length');
  let value: unknown;
  let text: string;
  try { text = decoder.decode(raw.slice(2, 2 + length)); value = JSON.parse(text); }
  catch { return reject('MANIFEST', 'Invalid manifest JSON'); }
  validateManifest(value);
  // Canonical encoding also rejects duplicate JSON keys and non-integer spellings.
  if (serializeManifest(value) !== text) reject('MANIFEST', 'Manifest is not canonical');
  const data = new Uint8Array(raw.slice(2 + length));
  if (data.length !== value.size) reject('FILE_SIZE', 'Declared and actual file sizes differ');
  const digest = hex(await sha256(data));
  if (digest !== value.sha256) reject('FILE_HASH', 'File integrity check failed');
  return { name: sanitizeFilename(value.name), mime: value.mime, data, sha256: digest, created: value.created };
}

export interface Frame {
  flags: number; sessionId: Uint8Array; containerLen: number;
  symbolSize: number; seq: number; symbol: Uint8Array;
}
export const symbolCount = (frame: Frame): number => Math.ceil(frame.containerLen / frame.symbolSize);
export function validateFrame(frame: Frame): void {
  if (frame.flags >> 4 !== 2) reject('VERSION', 'Unsupported wire version');
  if (frame.flags & 8) reject('FLAGS', 'Reserved flag is set');
  if (frame.flags !== FLAGS) reject('MODE', 'This demo supports plaintext repeat-mode only');
  if (frame.sessionId.length !== 16) reject('SESSION', 'Session ID must contain 16 bytes');
  if (!Number.isInteger(frame.containerLen) || frame.containerLen < 1 || frame.containerLen > LIMITS.container) reject('LENGTH', 'Invalid container length');
  if (!Number.isInteger(frame.symbolSize) || frame.symbolSize < 1 || frame.symbolSize > LIMITS.symbol) reject('SYMBOL_SIZE', 'Invalid symbol size');
  const k = symbolCount(frame);
  if (k > LIMITS.symbols) reject('SYMBOL_COUNT', 'Too many symbols; choose a larger symbol size');
  if (!Number.isInteger(frame.seq) || frame.seq < 0 || frame.seq > 0xffffffff) reject('SEQUENCE', 'Sequence exhausted; prepare a new session');
  if (frame.symbol.length !== frame.symbolSize) reject('LENGTH', 'Incorrect symbol length');
  if (frame.seq % k === k - 1) {
    const used = frame.containerLen - (k - 1) * frame.symbolSize;
    if (frame.symbol.slice(used).some(value => value !== 0)) reject('PADDING', 'Last symbol padding must be zero');
  }
}
export async function packFrame(frame: Frame): Promise<Uint8Array<ArrayBuffer>> {
  validateFrame(frame);
  const header = new Uint8Array(27);
  const view = new DataView(header.buffer);
  header[0] = frame.flags; header.set(frame.sessionId, 1);
  view.setUint32(17, frame.containerLen); view.setUint16(21, frame.symbolSize); view.setUint32(23, frame.seq);
  const body = concat(header, frame.symbol);
  return concat(body, (await sha256(body)).slice(0, 8));
}
export async function unpackFrame(raw: Uint8Array): Promise<Frame> {
  if (raw.length < 36 || raw.length > LIMITS.frame) reject('LENGTH', 'Invalid frame length');
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const size = view.getUint16(21);
  if (raw.length !== 35 + size) reject('LENGTH', 'Frame length does not match header');
  const frame = {
    flags: raw[0], sessionId: raw.slice(1, 17), containerLen: view.getUint32(17),
    symbolSize: size, seq: view.getUint32(23), symbol: raw.slice(27, -8),
  };
  validateFrame(frame);
  const tag = (await sha256(raw.slice(0, -8))).slice(0, 8);
  if (hex(tag) !== hex(raw.slice(-8))) reject('CHECKSUM', 'Frame checksum mismatch');
  return frame;
}
export async function decodeFrame(text: string): Promise<Frame> {
  if (text.length > LIMITS.text) reject('LENGTH', 'QR text exceeds the frame limit');
  return unpackFrame(base45Decode(text));
}
export const encodeFrame = async (frame: Frame): Promise<string> => base45Encode(await packFrame(frame));

export class Transfer {
  readonly k: number;
  constructor(
    readonly container: Uint8Array, readonly symbolSize = 256,
    readonly sessionId: Uint8Array = crypto.getRandomValues(new Uint8Array(16)),
  ) {
    if (!Number.isInteger(symbolSize) || symbolSize < 1 || symbolSize > LIMITS.symbol || !container.length) reject('SYMBOL_SIZE', 'Invalid symbol size or empty container');
    this.k = Math.ceil(container.length / symbolSize);
    validateFrame(this.frame(0));
  }
  frame(seq: number): Frame {
    const offset = (seq % this.k) * this.symbolSize;
    const symbol = new Uint8Array(this.symbolSize);
    symbol.set(this.container.slice(offset, offset + this.symbolSize));
    const frame = { flags: FLAGS, sessionId: this.sessionId, containerLen: this.container.length, symbolSize: this.symbolSize, seq, symbol };
    validateFrame(frame); return frame;
  }
  text(seq: number): Promise<string> { return encodeFrame(this.frame(seq)); }
}

export interface ReceiveStats {
  state: 'IDLE' | 'RECEIVING' | 'VERIFYING' | 'DONE' | 'FAILED';
  recovered: number; total: number; seen: number; duplicates: number; rejected: number; session: string;
}
export class Receiver {
  private symbols = new Map<number, Uint8Array>();
  private metadata = '';
  private busy = false;
  result: ReceivedFile | null = null;
  stats: ReceiveStats = { state: 'IDLE', recovered: 0, total: 0, seen: 0, duplicates: 0, rejected: 0, session: '' };
  async ingest(text: string): Promise<ReceivedFile | null> {
    if (this.busy) reject('BUSY', 'Serialize calls to the receiver');
    if (this.stats.state === 'FAILED') reject('STATE', 'Reset the failed receiver before retrying');
    if (this.stats.state === 'DONE') return this.result;
    this.busy = true; this.stats.seen++;
    try {
      const frame = await decodeFrame(text);
      const metadata = `${frame.flags}:${hex(frame.sessionId)}:${frame.containerLen}:${frame.symbolSize}`;
      if (this.metadata && metadata !== this.metadata) reject('SESSION_MISMATCH', 'Reset to accept a different session');
      if (!this.metadata) {
        this.metadata = metadata;
        this.stats = { ...this.stats, state: 'RECEIVING', total: symbolCount(frame), session: hex(frame.sessionId) };
      }
      const index = frame.seq % this.stats.total;
      const previous = this.symbols.get(index);
      if (previous) {
        if (hex(previous) !== hex(frame.symbol)) reject('SYMBOL_CONFLICT', 'Conflicting duplicate symbol');
        this.stats.duplicates++; return null;
      }
      this.symbols.set(index, frame.symbol); this.stats.recovered = this.symbols.size;
      if (this.symbols.size === this.stats.total) {
        this.stats.state = 'VERIFYING';
        const raw = new Uint8Array(frame.containerLen);
        for (let i = 0; i < this.stats.total; i++) {
          const symbol = this.symbols.get(i)!;
          raw.set(symbol.slice(0, Math.min(frame.symbolSize, raw.length - i * frame.symbolSize)), i * frame.symbolSize);
        }
        try { this.result = await openContainer(raw); }
        catch (error) { this.stats.state = 'FAILED'; this.symbols.clear(); throw error; }
        this.stats.state = 'DONE'; this.symbols.clear(); return this.result;
      }
      return null;
    } catch (error) { this.stats.rejected++; throw error; }
    finally { this.busy = false; }
  }
}
