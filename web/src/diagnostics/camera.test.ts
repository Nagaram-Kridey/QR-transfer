import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  CameraDiagnostics, MAX_RECENT_ATTEMPTS, buildDiagnosticsExport,
} from './camera';
import type { DiagnosticSnapshot, ScanMetrics } from './camera';
import type { CaptureAttempt } from '../camera/tracker';

function metrics(attempt_id: number, changes: Partial<ScanMetrics> = {}): ScanMetrics {
  return {
    attempt_id, decode_ms: 3, admission_ms: 2, decoded_qr_count: 1,
    unique_delta: 1, duplicate_delta: 0, rejected_delta: 0, admitted: true,
    error_stage: null, ...changes,
  };
}

function dispatch(diagnostics: CameraDiagnostics, now = 100): number {
  const id = diagnostics.begin(now, 1280, 720, 960, 540);
  diagnostics.stage(id, 'capture', 4);
  diagnostics.stage(id, 'readback', 1);
  diagnostics.submitted(id, now + 5);
  return id;
}

describe('bounded camera diagnostics, independent from receiver ingestion', () => {
  it('keeps aggregate accounting for 300 attempts while retaining only the last 256', () => {
    const diagnostics = new CameraDiagnostics(100);
    for (let n = 0; n < 300; n++) {
      const id = dispatch(diagnostics, 100 + n * 33);
      diagnostics.completed(metrics(id, {
        unique_delta: n === 0 ? 1 : 0, duplicate_delta: n ? 1 : 0,
      }), 110 + n * 33);
    }
    diagnostics.finish(10000);
    const snapshot = diagnostics.snapshot();
    expect(snapshot.latest_attempts).toHaveLength(MAX_RECENT_ATTEMPTS);
    expect(snapshot.latest_attempts[0].attempt_id).toBe(45);
    expect(snapshot.latest_attempts.at(-1)?.attempt_id).toBe(300);
    expect(snapshot.dropped_records).toBe(44);
    expect(snapshot.totals).toMatchObject({ started: 300, submitted: 300, completed: 300, interrupted: 0 });
    expect(snapshot.frames).toEqual({ decoded_qr: 300, unique: 1, duplicates: 299, rejected: 0 });
    expect(snapshot.pixels).toEqual({ submitted: 300 * 960 * 540, completed: 300 * 960 * 540, interrupted: 0 });
    expect(snapshot.timings.full_scan_gap_ms).toEqual({ count: 299, total_ms: 299 * 33, min_ms: 33, max_ms: 33 });
    expect(snapshot.timings.worker_roundtrip_ms).toEqual({ count: 300, total_ms: 1500, min_ms: 5, max_ms: 5 });
    expect(snapshot.first_valid_acquisition_ms).toBe(10);
    expect(snapshot.pending).toBeNull();
    expect(snapshot.stopped).toBe(true);
  });

  it('uses immutable detached snapshots and ignores unknown worker fields', () => {
    const diagnostics = new CameraDiagnostics(100);
    const id = dispatch(diagnostics);
    const before = diagnostics.snapshot();
    expect(Object.isFrozen(before)).toBe(true);
    expect(Object.isFrozen(before.totals)).toBe(true);
    expect(Object.isFrozen(before.pending)).toBe(true);
    expect(before.pending).not.toHaveProperty('submitted_at');
    const incoming = { ...metrics(id), qr_text: 'SECRET_QR_CONTENTS', raw_pixels: [12, 34], source_width: 999999 };
    diagnostics.completed(incoming, 110);
    incoming.unique_delta = 100;
    const after = diagnostics.snapshot();
    expect(before.totals.completed).toBe(0);
    expect(after.frames.unique).toBe(1);
    expect(after.latest_attempts[0].source_width).toBe(1280);
    expect(Object.isFrozen(after.latest_attempts[0])).toBe(true);
    expect(() => { (after.totals as { completed: number }).completed = 999; }).toThrow();
    expect(JSON.stringify(after)).not.toContain('SECRET_QR_CONTENTS');
    expect(after.latest_attempts[0]).not.toHaveProperty('qr_text');
    expect(after.latest_attempts[0]).not.toHaveProperty('raw_pixels');
  });

  it('separates no QR, unique, duplicate and rejected attempts', () => {
    const diagnostics = new CameraDiagnostics(100);
    const values: Partial<ScanMetrics>[] = [
      { decoded_qr_count: 0, unique_delta: 0, admission_ms: null, admitted: false },
      {},
      { unique_delta: 0, duplicate_delta: 1 },
      { unique_delta: 0, rejected_delta: 1, admitted: false },
    ];
    values.forEach((value, n) => {
      const id = dispatch(diagnostics, 100 + n * 33);
      diagnostics.completed(metrics(id, value), 110 + n * 33);
    });
    expect(diagnostics.snapshot().frames).toEqual({ decoded_qr: 3, unique: 1, duplicates: 1, rejected: 1 });
    expect(diagnostics.snapshot().first_valid_acquisition_ms).toBe(43);
    expect(diagnostics.snapshot().timings.admission_ms.count).toBe(3);
  });

  it('counts an interrupted submitted scan without inventing decode or admission metrics', () => {
    const diagnostics = new CameraDiagnostics(100);
    const id = dispatch(diagnostics);
    diagnostics.busySkip(); diagnostics.busySkip();
    diagnostics.finish(120);
    diagnostics.finish(999);
    const snapshot = diagnostics.snapshot();
    expect(snapshot.totals).toMatchObject({ started: 1, submitted: 1, completed: 0, interrupted: 1, capture_failed: 0, busy_skips: 2 });
    expect(snapshot.pixels).toEqual({ submitted: 518400, completed: 0, interrupted: 518400 });
    expect(snapshot.latest_attempts[0]).toMatchObject({ outcome: 'interrupted', finished_ms: 20, capture_ms: 4, readback_ms: 1, decode_ms: null, admission_ms: null, worker_roundtrip_ms: null });
    expect(() => diagnostics.completed(metrics(id), 130)).toThrow(/stopped/i);
    expect(diagnostics.snapshot()).toEqual(snapshot);
  });

  it.each(['capture', 'readback', 'submit'] as const)('retains %s failure without counting a submitted image', stage => {
    const diagnostics = new CameraDiagnostics(100);
    const id = diagnostics.begin(100, 1280, 720, 960, 540);
    if (stage !== 'capture') diagnostics.stage(id, 'capture', 4);
    if (stage === 'submit') diagnostics.stage(id, 'readback', 1);
    diagnostics.captureFailed(id, 106, stage);
    diagnostics.finish(107);
    const snapshot = diagnostics.snapshot();
    expect(snapshot.totals).toMatchObject({ started: 1, submitted: 0, completed: 0, interrupted: 0, capture_failed: 1 });
    expect(snapshot.latest_attempts[0]).toMatchObject({ outcome: 'capture_failed', error_stage: stage, submitted_ms: null, decoded_qr_count: null });
    expect(snapshot.pixels).toEqual({ submitted: 0, completed: 0, interrupted: 0 });
  });

  it('retains initialization failure with no fictional scan', () => {
    const diagnostics = new CameraDiagnostics(100);
    diagnostics.initializationFailed(); diagnostics.finish(105);
    expect(diagnostics.snapshot().totals).toMatchObject({ initialization_failed: 1, started: 0, submitted: 0 });
    expect(diagnostics.snapshot().latest_attempts).toEqual([]);
  });

  it('ends an undispatched attempt as capture failure and refuses collection after stop', () => {
    const diagnostics = new CameraDiagnostics(100);
    diagnostics.begin(101, 1280, 720, 960, 540);
    diagnostics.finish(102);
    const snapshot = diagnostics.snapshot();
    expect(snapshot.latest_attempts[0]).toMatchObject({ outcome: 'capture_failed', submitted_ms: null, finished_ms: 2 });
    expect(snapshot.totals).toMatchObject({ capture_failed: 1, interrupted: 0, submitted: 0 });
    expect(() => diagnostics.begin(103, 1280, 720, 960, 540)).toThrow(/stopped/);
    expect(() => diagnostics.busySkip()).toThrow(/stopped/);
    expect(() => diagnostics.initializationFailed()).toThrow(/stopped/);
    expect(diagnostics.snapshot()).toEqual(snapshot);
  });

  it('rejects backward capture/submission/completion times without corrupting the pending attempt', () => {
    const diagnostics = new CameraDiagnostics(100);
    expect(() => diagnostics.begin(99, 1280, 720, 960, 540)).toThrow();
    const id = diagnostics.begin(102, 1280, 720, 960, 540);
    expect(() => diagnostics.submitted(id, 101)).toThrow();
    diagnostics.submitted(id, 103);
    const before = diagnostics.snapshot();
    expect(() => diagnostics.completed(metrics(id), 102)).toThrow();
    expect(diagnostics.snapshot()).toEqual(before);
    diagnostics.completed(metrics(id), 104);
    expect(diagnostics.snapshot().totals.completed).toBe(1);
  });

  it('rejects arbitrary error labels and non-boolean admission without including them in exports', () => {
    const diagnostics = new CameraDiagnostics(100);
    const id = dispatch(diagnostics);
    for (const invalid of [
      { ...metrics(id), error_stage: 'PRIVATE_QR_STRING' },
      { ...metrics(id), admitted: 'yes' },
    ]) {
      expect(() => diagnostics.completed(invalid as ScanMetrics, 110)).toThrow();
    }
    expect(JSON.stringify(diagnostics.snapshot())).not.toContain('PRIVATE_QR_STRING');
    expect(diagnostics.snapshot().totals.completed).toBe(0);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid image dimension %s before mutating counters', dimension => {
    const diagnostics = new CameraDiagnostics(100);
    expect(() => diagnostics.begin(100, 1280, 720, dimension, 540)).toThrow();
    expect(diagnostics.snapshot().totals.started).toBe(0);
    expect(diagnostics.snapshot().pending).toBeNull();
  });

  it('rejects overflow pixels, repeated stages/dispatch, unmatched and unsubmitted completions', () => {
    const diagnostics = new CameraDiagnostics(100);
    expect(() => diagnostics.begin(100, 1280, 720, Number.MAX_SAFE_INTEGER, 2)).toThrow();
    const id = diagnostics.begin(100, 1280, 720, 960, 540);
    expect(() => diagnostics.begin(100, 1280, 720, 960, 540)).toThrow(/flight/);
    expect(() => diagnostics.completed(metrics(id), 101)).toThrow(/Unsubmitted/);
    expect(() => diagnostics.stage(id, 'capture', NaN)).toThrow();
    diagnostics.stage(id, 'capture', 1);
    expect(() => diagnostics.stage(id, 'capture', 1)).toThrow(/already/);
    diagnostics.submitted(id, 102);
    expect(() => diagnostics.submitted(id, 103)).toThrow(/already/);
    expect(() => diagnostics.completed(metrics(id + 1), 104)).toThrow(/matching/);
    expect(() => diagnostics.captureFailed(id, 104, 'submit')).toThrow(/Submitted/);
    diagnostics.completed(metrics(id), 105);
    expect(() => diagnostics.completed(metrics(id), 106)).toThrow(/matching/);
    expect(diagnostics.snapshot().totals.completed).toBe(1);
  });

  it.each([
    { decode_ms: NaN }, { admission_ms: Infinity }, { decode_ms: -1 },
    { unique_delta: 1.5 }, { duplicate_delta: -1 }, { rejected_delta: Infinity },
    { decoded_qr_count: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects malformed metrics %o without partial admission', value => {
    const diagnostics = new CameraDiagnostics(100);
    const id = dispatch(diagnostics);
    const before = diagnostics.snapshot();
    expect(() => diagnostics.completed(metrics(id, value), 110)).toThrow();
    expect(diagnostics.snapshot()).toEqual(before);
  });

  it('counts fixed worker failure stages while preserving measured partial work', () => {
    const diagnostics = new CameraDiagnostics(100);
    const id = dispatch(diagnostics);
    diagnostics.completed(metrics(id, { admitted: false, error_stage: 'admission', rejected_delta: 1 }), 111);
    expect(diagnostics.snapshot().totals.worker_errors).toBe(1);
    expect(diagnostics.snapshot().latest_attempts[0].error_stage).toBe('admission');
  });
});

describe('observation-linked separate diagnostics export', () => {
  const observation = '{\n  "format": "lumenlink-camera-observation-v1",\n  "name": "café नमस्ते😀"\n}';
  const hash = (bytes: Uint8Array<ArrayBuffer>): Promise<string> => Promise.resolve(createHash('sha256').update(bytes).digest('hex'));

  it('links the exact original UTF-8 bytes, indentation and no appended newline', async () => {
    const snapshot = new CameraDiagnostics(100).snapshot();
    const digest = vi.fn(hash);
    const exported = await buildDiagnosticsExport(observation, snapshot, digest);
    expect(digest).toHaveBeenCalledOnce();
    expect(Buffer.from(digest.mock.calls[0][0]).toString('utf8')).toBe(observation);
    expect(exported.observation).toEqual({ filename: 'camera-observation.json', utf8_bytes: Buffer.byteLength(observation), sha256: createHash('sha256').update(observation).digest('hex') });
    expect(Object.keys(exported)).toEqual(['format', 'observation', 'diagnostics']);
    expect(exported.format).toBe('lumenlink-camera-diagnostics-v2');
    expect(exported).not.toHaveProperty('observation_text');
    expect(JSON.stringify(exported)).not.toContain('café');
    expect(Object.isFrozen(exported.diagnostics)).toBe(true);
  });

  it('captures the snapshot before an asynchronous digest can mutate its caller', async () => {
    const snapshot = structuredClone(new CameraDiagnostics(100).snapshot()) as DiagnosticSnapshot;
    let release!: (hash: string) => void;
    const pending = buildDiagnosticsExport(observation, snapshot, () => new Promise(resolve => { release = resolve; }));
    snapshot.totals.started = 999;
    release('a'.repeat(64));
    expect((await pending).diagnostics.totals.started).toBe(0);
  });

  it.each(['A'.repeat(64), 'a'.repeat(63), 'not-a-hash'])('rejects malformed digest %s', async digest => {
    await expect(buildDiagnosticsExport(observation, new CameraDiagnostics(100).snapshot(), () => Promise.resolve(digest))).rejects.toThrow(/digest/);
  });

  it('propagates digest failure without mutating the original text or snapshot', async () => {
    const snapshot = new CameraDiagnostics(100).snapshot();
    await expect(buildDiagnosticsExport(observation, snapshot, () => Promise.reject(new Error('hash unavailable')))).rejects.toThrow('hash unavailable');
    expect(snapshot.totals.started).toBe(0);
    expect(snapshot.stopped).toBe(false);
  });
});

describe('v2 full/ROI capture accounting', () => {
  function capture(id: number, kind: 'full_frame' | 'roi'): CaptureAttempt {
    return { attempt_id: id, epoch: 3, reason: kind === 'roi' ? 'tracking' : 'periodic', kind,
      source_width: 1280, source_height: 720, crop_x: kind === 'roi' ? 101 : 0, crop_y: kind === 'roi' ? 201 : 0,
      crop_width: kind === 'roi' ? 401 : 1280, crop_height: kind === 'roi' ? 301 : 720,
      input_width: kind === 'roi' ? 401 : 960, input_height: kind === 'roi' ? 301 : 540 };
  }
  it('separates per-kind counters/pixels and measures full-only gaps across intervening ROI scans', () => {
    const diagnostics = new CameraDiagnostics(100, 'auto_region');
    for (const [id, now, kind] of [[1, 100, 'full_frame'], [2, 200, 'roi'], [3, 300, 'roi'], [4, 1100, 'full_frame']] as const) {
      const context = capture(id, kind);
      diagnostics.begin(now, 1280, 720, context.input_width, context.input_height, context);
      diagnostics.submitted(id, now);
      diagnostics.completed(metrics(id), now + 1);
    }
    diagnostics.finish(1102);
    const snapshot = diagnostics.snapshot();
    expect(snapshot.mode).toBe('auto_region');
    expect(snapshot.scans.full_frame).toMatchObject({ submitted: 2, completed: 2, pixels_submitted: 2 * 518400 });
    expect(snapshot.scans.roi).toMatchObject({ submitted: 2, completed: 2, pixels_submitted: 2 * 401 * 301 });
    expect(snapshot.timings.full_scan_gap_ms).toEqual({ count: 1, total_ms: 1000, min_ms: 1000, max_ms: 1000 });
    expect(snapshot.timings.roi_scan_gap_ms).toEqual({ count: 1, total_ms: 100, min_ms: 100, max_ms: 100 });
    expect(snapshot.timings.dispatch_gap_ms).toMatchObject({ count: 3, total_ms: 1000 });
    expect(snapshot.latest_attempts[1]).toMatchObject({ kind: 'roi', crop_x: 101, crop_y: 201, crop_width: 401, crop_height: 301, scale_x: 1, scale_y: 1, capture_epoch: 3 });
    expect(snapshot.latest_attempts[1]).not.toHaveProperty('accepted_corners');
  });
  it('retains interrupted ROI dimensions/pixels without inventing worker timing', () => {
    const diagnostics = new CameraDiagnostics(100, 'auto_region');
    const context = capture(1, 'roi');
    diagnostics.begin(100, 1280, 720, 401, 301, context); diagnostics.submitted(1, 101); diagnostics.finish(105);
    expect(diagnostics.snapshot().scans.roi).toMatchObject({ submitted: 1, completed: 0, interrupted: 1, pixels_interrupted: 401 * 301 });
    expect(diagnostics.snapshot().latest_attempts[0]).toMatchObject({ outcome: 'interrupted', kind: 'roi', decode_ms: null });
  });
  it('does not accept ROI context in full mode or mismatched capture identities/dimensions', () => {
    const full = new CameraDiagnostics(100);
    expect(() => full.begin(100, 1280, 720, 401, 301, capture(1, 'roi'))).toThrow();
    const auto = new CameraDiagnostics(100, 'auto_region');
    for (const patch of [{ attempt_id: 2 }, { crop_x: -1 }, { crop_width: 0 }, { source_width: 1279 }, { input_width: 400 }]) {
      expect(() => auto.begin(100, 1280, 720, 401, 301, { ...capture(1, 'roi'), ...patch })).toThrow();
      expect(auto.snapshot().totals.started).toBe(0);
    }
  });
});
