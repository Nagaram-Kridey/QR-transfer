import type { ReceivedFile, ReceiveStats } from '../codec/core';
import type { ScanMetrics } from '../diagnostics/camera';
import type { Point } from '../camera/geometry';

export type WorkerInput =
  | { type: 'start' }
  | { type: 'image'; attempt_id: number; capture_epoch: number; pixels: Uint8ClampedArray<ArrayBuffer>; width: number; height: number }
  | { type: 'texts'; texts: string[] };
export type WorkerOutput =
  | { type: 'ready' }
  | { type: 'scan'; capture_epoch: number; accepted_corners: readonly Point[] | null; metrics: ScanMetrics; stats: ReceiveStats }
  | { type: 'progress'; stats: ReceiveStats; warning?: string }
  | { type: 'complete'; file: ReceivedFile; stats: ReceiveStats }
  | { type: 'error'; message: string }
  | { type: 'idle' };
