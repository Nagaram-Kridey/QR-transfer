/** Local, bounded timing/count diagnostics. Never stores camera pixels or QR contents. */
import type { CameraMode, ScanKind } from '../camera/geometry';
import type { CaptureAttempt } from '../camera/tracker';
export type ErrorStage = 'initialization' | 'capture' | 'readback' | 'submit' | 'decode' | 'admission';
export interface ScanMetrics {
  attempt_id: number;
  decode_ms: number | null;
  admission_ms: number | null;
  decoded_qr_count: number;
  unique_delta: number;
  duplicate_delta: number;
  rejected_delta: number;
  admitted: boolean;
  error_stage: 'decode' | 'admission' | null;
}
export interface TimingAggregate {
  count: number; total_ms: number; min_ms: number | null; max_ms: number | null;
}
export interface AttemptRecord {
  attempt_id: number;
  kind: ScanKind; capture_epoch: number; reason: CaptureAttempt['reason'];
  crop_x: number; crop_y: number; crop_width: number; crop_height: number;
  scale_x: number; scale_y: number;
  source_width: number; source_height: number; input_width: number; input_height: number; pixels: number;
  started_ms: number; submitted_ms: number | null; finished_ms: number;
  outcome: 'completed' | 'interrupted' | 'capture_failed';
  error_stage: ErrorStage | null;
  capture_ms: number | null; readback_ms: number | null; worker_roundtrip_ms: number | null;
  decode_ms: number | null; admission_ms: number | null;
  decoded_qr_count: number | null; unique_delta: number | null; duplicate_delta: number | null;
  rejected_delta: number | null; admitted: boolean | null;
}
type PublicPendingAttempt = Omit<AttemptRecord, 'finished_ms' | 'outcome'>;
interface PendingAttempt extends PublicPendingAttempt { submitted_at: number | null }
export interface ScanAggregate {
  started: number; submitted: number; completed: number; interrupted: number; capture_failed: number;
  pixels_submitted: number; pixels_completed: number; pixels_interrupted: number;
}
export interface DiagnosticSnapshot {
  mode: CameraMode;
  totals: {
    started: number; submitted: number; completed: number; interrupted: number;
    capture_failed: number; initialization_failed: number; worker_errors: number; busy_skips: number;
  };
  pixels: { submitted: number; completed: number; interrupted: number };
  scans: Record<ScanKind, ScanAggregate>;
  timings: {
    capture_ms: TimingAggregate; readback_ms: TimingAggregate; worker_roundtrip_ms: TimingAggregate;
    decode_ms: TimingAggregate; admission_ms: TimingAggregate; full_scan_gap_ms: TimingAggregate;
    dispatch_gap_ms: TimingAggregate; roi_scan_gap_ms: TimingAggregate;
  };
  frames: { decoded_qr: number; unique: number; duplicates: number; rejected: number };
  first_valid_acquisition_ms: number | null;
  latest_attempts: readonly AttemptRecord[];
  dropped_records: number;
  pending: Readonly<PublicPendingAttempt> | null;
  stopped: boolean;
  note: string;
}
export interface DiagnosticExport {
  format: 'lumenlink-camera-diagnostics-v2';
  observation: { filename: 'camera-observation.json'; utf8_bytes: number; sha256: string };
  diagnostics: DiagnosticSnapshot;
}
export type DigestFunction = (bytes: Uint8Array<ArrayBuffer>) => Promise<string>;
export const MAX_RECENT_ATTEMPTS = 256;

const aggregate = (): TimingAggregate => ({ count: 0, total_ms: 0, min_ms: null, max_ms: null });
const scanAggregate = (): ScanAggregate => ({ started: 0, submitted: 0, completed: 0, interrupted: 0, capture_failed: 0, pixels_submitted: 0, pixels_completed: 0, pixels_interrupted: 0 });
function finite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid diagnostics ${label}`);
  return value;
}
function counter(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid diagnostics ${label}`);
  return value;
}
function add(target: TimingAggregate, duration: number): void {
  finite(duration, 'duration'); target.count++; target.total_ms += duration;
  target.min_ms = target.min_ms === null ? duration : Math.min(target.min_ms, duration);
  target.max_ms = target.max_ms === null ? duration : Math.max(target.max_ms, duration);
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export class CameraDiagnostics {
  private readonly data: DiagnosticSnapshot = {
    mode: 'full_frame',
    totals: { started: 0, submitted: 0, completed: 0, interrupted: 0, capture_failed: 0, initialization_failed: 0, worker_errors: 0, busy_skips: 0 },
    pixels: { submitted: 0, completed: 0, interrupted: 0 },
    scans: { full_frame: scanAggregate(), roi: scanAggregate() },
    timings: { capture_ms: aggregate(), readback_ms: aggregate(), worker_roundtrip_ms: aggregate(), decode_ms: aggregate(), admission_ms: aggregate(), full_scan_gap_ms: aggregate(), dispatch_gap_ms: aggregate(), roi_scan_gap_ms: aggregate() },
    frames: { decoded_qr: 0, unique: 0, duplicates: 0, rejected: 0 },
    first_valid_acquisition_ms: null, latest_attempts: [], dropped_records: 0, pending: null, stopped: false,
    note: 'Wall-time/utilization proxies only. Aggregates cover the session; the ring covers recent attempts. No session p95 or CPU/battery claim.',
  };
  private pending: PendingAttempt | null = null;
  private readonly records: AttemptRecord[] = [];
  private lastSubmittedAt: number | null = null;
  private lastFullAt: number | null = null;
  private lastRoiAt: number | null = null;
  constructor(private readonly trialStartMs: number, mode: CameraMode = 'full_frame') {
    finite(trialStartMs, 'trial start');
    if (mode !== 'full_frame' && mode !== 'auto_region') throw new Error('Invalid diagnostics mode');
    this.data.mode = mode;
  }
  private active(): void { if (this.data.stopped) throw new Error('Diagnostics trial is stopped'); }
  private elapsed(now: number): number { return finite(now - this.trialStartMs, 'elapsed time'); }
  private current(id: number): PendingAttempt {
    if (!this.pending || this.pending.attempt_id !== id) throw new Error('No matching diagnostics attempt');
    return this.pending;
  }
  private store(record: AttemptRecord): void {
    this.records.push(record);
    if (this.records.length > MAX_RECENT_ATTEMPTS) { this.records.shift(); this.data.dropped_records++; }
  }
  busySkip(): void { this.active(); this.data.totals.busy_skips++; }
  initializationFailed(): void { this.active(); this.data.totals.initialization_failed++; }
  begin(now: number, sourceWidth: number, sourceHeight: number, inputWidth: number, inputHeight: number, context?: CaptureAttempt): number {
    this.active(); if (this.pending) throw new Error('One diagnostics attempt in flight');
    const dimensions = [sourceWidth, sourceHeight, inputWidth, inputHeight];
    for (const dimension of dimensions) if (!counter(dimension, 'dimension')) throw new Error('Empty diagnostics image');
    const pixels = counter(inputWidth * inputHeight, 'pixels');
    const kind = context?.kind ?? 'full_frame';
    const cropX = context?.crop_x ?? 0, cropY = context?.crop_y ?? 0;
    const cropWidth = context?.crop_width ?? sourceWidth, cropHeight = context?.crop_height ?? sourceHeight;
    const epoch = context?.epoch ?? 0, reason = context?.reason ?? 'control';
    if (!['full_frame', 'roi'].includes(kind) || (kind === 'roi' && this.data.mode !== 'auto_region')
      || !['control', 'acquisition', 'reacquisition', 'periodic', 'tracking', 'bypass'].includes(reason)) throw new Error('Invalid diagnostics capture kind');
    for (const value of [cropX, cropY, cropWidth, cropHeight, epoch]) counter(value, 'capture transform');
    if (!cropWidth || !cropHeight || cropX + cropWidth > sourceWidth || cropY + cropHeight > sourceHeight
      || inputWidth > cropWidth || inputHeight > cropHeight
      || (context && (context.source_width !== sourceWidth || context.source_height !== sourceHeight
        || context.input_width !== inputWidth || context.input_height !== inputHeight))) throw new Error('Inconsistent diagnostics capture transform');
    const id = this.data.totals.started + 1;
    if (context && context.attempt_id !== id) throw new Error('Inconsistent diagnostics attempt identity');
    this.pending = {
      attempt_id: id, kind, capture_epoch: epoch, reason,
      crop_x: cropX, crop_y: cropY, crop_width: cropWidth, crop_height: cropHeight,
      scale_x: inputWidth / cropWidth, scale_y: inputHeight / cropHeight,
      source_width: sourceWidth, source_height: sourceHeight, input_width: inputWidth, input_height: inputHeight, pixels,
      started_ms: this.elapsed(now), submitted_ms: null, submitted_at: null, error_stage: null,
      capture_ms: null, readback_ms: null, worker_roundtrip_ms: null, decode_ms: null, admission_ms: null,
      decoded_qr_count: null, unique_delta: null, duplicate_delta: null, rejected_delta: null, admitted: null,
    };
    this.data.totals.started++;
    this.data.scans[kind].started++;
    return id;
  }
  stage(id: number, stage: 'capture' | 'readback', duration: number): void {
    this.active(); const pending = this.current(id); finite(duration, stage);
    const key = stage === 'capture' ? 'capture_ms' : 'readback_ms';
    if (pending[key] !== null) throw new Error('Diagnostics stage already measured');
    pending[key] = duration; add(this.data.timings[key], duration);
  }
  submitted(id: number, now: number): void {
    this.active(); const pending = this.current(id);
    if (pending.submitted_at !== null) throw new Error('Diagnostics attempt already submitted');
    const relative = this.elapsed(now);
    if (relative < pending.started_ms) throw new Error('Diagnostics submission precedes capture');
    if (this.lastSubmittedAt !== null) add(this.data.timings.dispatch_gap_ms, finite(now - this.lastSubmittedAt, 'dispatch gap'));
    const prior = pending.kind === 'full_frame' ? this.lastFullAt : this.lastRoiAt;
    if (prior !== null) add(pending.kind === 'full_frame' ? this.data.timings.full_scan_gap_ms : this.data.timings.roi_scan_gap_ms, finite(now - prior, 'scan gap'));
    if (pending.kind === 'full_frame') this.lastFullAt = now;
    else this.lastRoiAt = now;
    pending.submitted_at = now; pending.submitted_ms = relative; this.lastSubmittedAt = now;
    this.data.totals.submitted++; this.data.pixels.submitted += pending.pixels;
    this.data.scans[pending.kind].submitted++; this.data.scans[pending.kind].pixels_submitted += pending.pixels;
  }
  completed(metrics: ScanMetrics, now: number): void {
    this.active(); const pending = this.current(metrics.attempt_id);
    if (pending.submitted_at === null) throw new Error('Unsubmitted diagnostics attempt');
    for (const value of [metrics.decoded_qr_count, metrics.unique_delta, metrics.duplicate_delta, metrics.rejected_delta]) counter(value, 'frame count');
    for (const value of [metrics.decode_ms, metrics.admission_ms]) if (value !== null) finite(value, 'worker duration');
    if (typeof metrics.admitted !== 'boolean' || ![null, 'decode', 'admission'].includes(metrics.error_stage)) throw new Error('Invalid diagnostics scan outcome');
    const roundtrip = finite(now - pending.submitted_at, 'worker roundtrip');
    const finished = this.elapsed(now);
    const { submitted_at: _submittedAt, ...base } = pending;
    void _submittedAt;
    this.store({ ...base, decode_ms: metrics.decode_ms, admission_ms: metrics.admission_ms,
      decoded_qr_count: metrics.decoded_qr_count, unique_delta: metrics.unique_delta,
      duplicate_delta: metrics.duplicate_delta, rejected_delta: metrics.rejected_delta,
      admitted: metrics.admitted, error_stage: metrics.error_stage,
      worker_roundtrip_ms: roundtrip, finished_ms: finished, outcome: 'completed' });
    this.data.totals.completed++; this.data.pixels.completed += pending.pixels;
    this.data.scans[pending.kind].completed++; this.data.scans[pending.kind].pixels_completed += pending.pixels;
    if (metrics.error_stage) this.data.totals.worker_errors++;
    add(this.data.timings.worker_roundtrip_ms, roundtrip);
    if (metrics.decode_ms !== null) add(this.data.timings.decode_ms, metrics.decode_ms);
    if (metrics.admission_ms !== null) add(this.data.timings.admission_ms, metrics.admission_ms);
    this.data.frames.decoded_qr += metrics.decoded_qr_count; this.data.frames.unique += metrics.unique_delta;
    this.data.frames.duplicates += metrics.duplicate_delta; this.data.frames.rejected += metrics.rejected_delta;
    if (metrics.admitted && this.data.first_valid_acquisition_ms === null) this.data.first_valid_acquisition_ms = finished;
    this.pending = null;
  }
  captureFailed(id: number, now: number, errorStage: 'capture' | 'readback' | 'submit'): void {
    this.active(); const pending = this.current(id);
    if (pending.submitted_at !== null) throw new Error('Submitted attempt cannot be a capture failure');
    const { submitted_at: _submittedAt, ...base } = pending;
    void _submittedAt;
    this.store({ ...base, finished_ms: this.elapsed(now), outcome: 'capture_failed', error_stage: errorStage });
    this.data.totals.capture_failed++; this.data.scans[pending.kind].capture_failed++; this.pending = null;
  }
  finish(now: number): void {
    if (this.data.stopped) return;
    if (this.pending) {
      const { submitted_at: _submittedAt, ...base } = this.pending;
      void _submittedAt;
      this.store({ ...base, finished_ms: this.elapsed(now), outcome: this.pending.submitted_at === null ? 'capture_failed' : 'interrupted' });
      const scan = this.data.scans[this.pending.kind];
      if (this.pending.submitted_at !== null) { this.data.totals.interrupted++; this.data.pixels.interrupted += this.pending.pixels; scan.interrupted++; scan.pixels_interrupted += this.pending.pixels; }
      else { this.data.totals.capture_failed++; scan.capture_failed++; }
      this.pending = null;
    }
    this.data.stopped = true;
  }
  snapshot(): DiagnosticSnapshot {
    let pending: PublicPendingAttempt | null = null;
    if (this.pending) {
      const { submitted_at: _submittedAt, ...publicFields } = this.pending;
      void _submittedAt;
      pending = publicFields;
    }
    return freeze(structuredClone({ ...this.data, latest_attempts: this.records, pending }));
  }
}

async function digestSha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const result = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(result)].map(value => value.toString(16).padStart(2, '0')).join('');
}
export async function buildDiagnosticsExport(observationText: string, snapshot: DiagnosticSnapshot, digest: DigestFunction = digestSha256): Promise<DiagnosticExport> {
  const bytes = new TextEncoder().encode(observationText);
  const frozenSnapshot = freeze(structuredClone(snapshot));
  const hash = await digest(bytes);
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error('Invalid observation digest');
  return freeze({ format: 'lumenlink-camera-diagnostics-v2', observation: { filename: 'camera-observation.json', utf8_bytes: bytes.length, sha256: hash }, diagnostics: frozenSnapshot });
}
