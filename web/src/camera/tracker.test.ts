import { describe, expect, it } from 'vitest';
import { RegionTracker } from './tracker';
import type { CaptureAttempt } from './tracker';
import type { Point } from './geometry';

const corners: Point[] = [{ x: 200, y: 100 }, { x: 400, y: 100 }, { x: 400, y: 300 }, { x: 200, y: 300 }];
function seed(tracker: RegionTracker): CaptureAttempt {
  const attempt = tracker.choose(0, 1280, 720, 1);
  expect(attempt.kind).toBe('full_frame');
  tracker.submitted(attempt.attempt_id, attempt.epoch, 0);
  expect(tracker.completed(attempt.attempt_id, attempt.epoch, true, corners, 10, 1280, 720)).toBe(true);
  return attempt;
}
function complete(tracker: RegionTracker, now: number, id: number, admitted: boolean, points: Point[] | null = null): CaptureAttempt {
  const attempt = tracker.choose(now, 1280, 720, id);
  tracker.submitted(id, attempt.epoch, now);
  tracker.completed(id, attempt.epoch, admitted, points, now + 1, 1280, 720);
  return attempt;
}

describe('bounded admission-driven region tracking', () => {
  it('starts full and cannot track a merely decoded/rejected QR', () => {
    const tracker = new RegionTracker('auto_region');
    expect(complete(tracker, 0, 1, false, corners).kind).toBe('full_frame');
    expect(tracker.snapshot().region).toBeNull();
    expect(tracker.snapshot().state).toBe('Searching');
    expect(tracker.choose(33, 1280, 720, 2).kind).toBe('full_frame');
  });
  it('preserves full mode even on protocol admission', () => {
    const tracker = new RegionTracker('full_frame');
    const first = tracker.choose(0, 1280, 720, 1);
    tracker.submitted(1, first.epoch, 0);
    expect(tracker.completed(1, first.epoch, true, corners, 1, 1280, 720)).toBe(false);
    expect(tracker.choose(33, 1280, 720, 2)).toMatchObject({ kind: 'full_frame', reason: 'control' });
    expect(tracker.snapshot().region).toBeNull();
  });
  it('tracks only valid admitted corners and keeps the original capture transform', () => {
    const tracker = new RegionTracker('auto_region'); seed(tracker);
    expect(tracker.snapshot().state).toBe('Tracking');
    const attempt = tracker.choose(33, 1280, 720, 2);
    expect(attempt.kind).toBe('roi');
    expect(attempt.crop_x).toBeGreaterThan(0);
    expect(attempt.crop_width).toBeLessThan(1280);
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(() => tracker.choose(34, 1280, 720, 3)).toThrow(/flight/);
  });
  it('two consecutive ROI misses clear tracking for the next attempt', () => {
    const tracker = new RegionTracker('auto_region'); seed(tracker);
    expect(complete(tracker, 33, 2, false).kind).toBe('roi');
    expect(tracker.snapshot().roi_misses).toBe(1);
    expect(complete(tracker, 66, 3, false).kind).toBe('roi');
    expect(tracker.snapshot().region).toBeNull();
    expect(tracker.snapshot().state).toBe('Reacquiring');
    expect(tracker.choose(99, 1280, 720, 4)).toMatchObject({ kind: 'full_frame', reason: 'reacquisition' });
  });
  it('clears at exactly 500 ms without admission, without waiting for two misses', () => {
    const tracker = new RegionTracker('auto_region'); seed(tracker);
    expect(tracker.choose(510, 1280, 720, 2)).toMatchObject({ kind: 'full_frame', reason: 'reacquisition' });
    expect(tracker.snapshot().region).toBeNull();
  });
  it('admitted duplicates do not postpone an independent one-second full probe', () => {
    const tracker = new RegionTracker('auto_region'); seed(tracker);
    for (const [now, id] of [[250, 2], [500, 3], [750, 4], [999, 5]]) {
      const attempt = tracker.choose(now, 1280, 720, id);
      expect(attempt.kind).toBe('roi');
      tracker.submitted(id, attempt.epoch, now);
      const points = [{ x: 50, y: 50 }, { x: 200, y: 50 }, { x: 200, y: 200 }, { x: 50, y: 200 }];
      expect(tracker.completed(id, attempt.epoch, true, points, now, 1280, 720)).toBe(true);
    }
    expect(tracker.snapshot().last_full_submission_ms).toBe(0);
    expect(tracker.choose(1000, 1280, 720, 6)).toMatchObject({ kind: 'full_frame', reason: 'periodic' });
  });
  it('failed periodic full probe does not retarget a known recently admitted region', () => {
    const tracker = new RegionTracker('auto_region'); seed(tracker);
    const points = [{ x: 50, y: 50 }, { x: 200, y: 50 }, { x: 200, y: 200 }, { x: 50, y: 200 }];
    complete(tracker, 400, 2, true, points);
    complete(tracker, 800, 3, true, points);
    const before = tracker.snapshot().region;
    const probe = complete(tracker, 1000, 4, false);
    expect(probe.reason).toBe('periodic');
    expect(tracker.snapshot().region).toEqual(before);
    expect(tracker.snapshot().roi_misses).toBe(0);
  });
  it('invalid geometry clears crop while a valid protocol admission remains independent', () => {
    const tracker = new RegionTracker('auto_region'); seed(tracker);
    const attempt = tracker.choose(33, 1280, 720, 2);
    tracker.submitted(2, attempt.epoch, 33);
    expect(tracker.completed(2, attempt.epoch, true, [{ x: NaN, y: 0 }], 34, 1280, 720)).toBe(false);
    expect(tracker.snapshot().region).toBeNull();
    expect(tracker.choose(66, 1280, 720, 3).kind).toBe('full_frame');
  });
  it('resizing while decoding ignores old geometry and reacquires using the new frame', () => {
    const tracker = new RegionTracker('auto_region'); seed(tracker);
    const attempt = tracker.choose(33, 1280, 720, 2);
    tracker.submitted(2, attempt.epoch, 33);
    tracker.observeDimensions(720, 1280);
    expect(tracker.snapshot().region).toBeNull();
    expect(tracker.completed(2, attempt.epoch, true, corners, 34, 720, 1280)).toBe(false);
    expect(tracker.snapshot().pending).toBeNull();
    expect(tracker.choose(66, 720, 1280, 3)).toMatchObject({ kind: 'full_frame', source_width: 720, source_height: 1280 });
  });
  it('reset epochs prevent reused IDs from accepting abandoned results', () => {
    const tracker = new RegionTracker('auto_region'); seed(tracker);
    const old = tracker.choose(33, 1280, 720, 2); tracker.submitted(2, old.epoch, 33);
    tracker.reset();
    const current = tracker.choose(66, 1280, 720, 2); tracker.submitted(2, current.epoch, 66);
    expect(tracker.completed(2, old.epoch, true, corners, 67, 1280, 720)).toBe(false);
    expect(tracker.snapshot().pending).toBe(current);
    expect(tracker.completed(2, current.epoch, true, corners, 68, 1280, 720)).toBe(true);
  });
  it('transient A-to-B-to-A resize invalidates an old capture even after dimensions match again', () => {
    const tracker = new RegionTracker('auto_region'); seed(tracker);
    const old = tracker.choose(33, 1280, 720, 2); tracker.submitted(2, old.epoch, 33);
    tracker.observeDimensions(720, 1280); tracker.observeDimensions(1280, 720);
    expect(tracker.snapshot().epoch).toBeGreaterThan(old.epoch);
    expect(tracker.completed(2, old.epoch, true, corners, 34, 1280, 720)).toBe(false);
    expect(tracker.snapshot().region).toBeNull();
    expect(tracker.choose(66, 1280, 720, 3).kind).toBe('full_frame');
  });
  it('requires increasing attempt identities within a trial, resetting them only on explicit reset', () => {
    const tracker = new RegionTracker('auto_region'); seed(tracker);
    expect(() => tracker.choose(33, 1280, 720, 1)).toThrow(/increase/);
    const attempt = tracker.choose(33, 1280, 720, 2); tracker.submitted(2, attempt.epoch, 33);
    tracker.completed(2, attempt.epoch, false, null, 34, 1280, 720);
    expect(() => tracker.choose(66, 1280, 720, 2)).toThrow(/increase/);
    tracker.reset();
    expect(tracker.choose(99, 1280, 720, 1).attempt_id).toBe(1);
  });
  it('unsubmitted, mismatched, repeated and late completions cannot change tracking', () => {
    const tracker = new RegionTracker('auto_region');
    const attempt = tracker.choose(0, 1280, 720, 1);
    expect(tracker.completed(1, attempt.epoch, true, corners, 1, 1280, 720)).toBe(false);
    tracker.submitted(1, attempt.epoch, 2);
    expect(() => tracker.submitted(1, attempt.epoch, 3)).toThrow();
    expect(tracker.completed(2, attempt.epoch, true, corners, 4, 1280, 720)).toBe(false);
    expect(tracker.completed(1, attempt.epoch, true, corners, 5, 1280, 720)).toBe(true);
    const before = tracker.snapshot();
    expect(tracker.completed(1, attempt.epoch, false, null, 6, 1280, 720)).toBe(false);
    expect(tracker.snapshot()).toEqual(before);
  });
});
