import type { ReceivedFile, ReceiveStats } from '../codec/core';

export type WorkerInput =
  | { type: 'start' }
  | { type: 'image'; pixels: Uint8ClampedArray<ArrayBuffer>; width: number; height: number }
  | { type: 'texts'; texts: string[] };
export type WorkerOutput =
  | { type: 'ready' }
  | { type: 'progress'; stats: ReceiveStats; warning?: string }
  | { type: 'complete'; file: ReceivedFile; stats: ReceiveStats }
  | { type: 'error'; message: string }
  | { type: 'idle' };
