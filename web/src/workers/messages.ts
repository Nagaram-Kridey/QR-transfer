import type { ReceivedFile, ReceiveStats } from '../codec/core';
import type { ScanMetrics } from '../diagnostics/camera';

export type WorkerInput =
  | { type: 'start' }
  | { type: 'image'; attempt_id: number; pixels: Uint8ClampedArray<ArrayBuffer>; width: number; height: number }
  | { type: 'texts'; texts: string[] };
export type WorkerOutput =
  | { type: 'ready' }
  | { type: 'scan'; metrics: ScanMetrics; stats: ReceiveStats }
  | { type: 'progress'; stats: ReceiveStats; warning?: string }
  | { type: 'complete'; file: ReceivedFile; stats: ReceiveStats }
  | { type: 'error'; message: string }
  | { type: 'idle' };
