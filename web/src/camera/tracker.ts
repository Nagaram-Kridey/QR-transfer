import { fullFrameTransform, mapAdmittedCorners, roiTransform, validDimensions } from './geometry';
import type { CameraMode, CaptureTransform, NativeRect, Point } from './geometry';

export type TrackingState = 'Searching' | 'Tracking' | 'Reacquiring';
export interface CaptureAttempt extends CaptureTransform {
  attempt_id: number; epoch: number;
  reason: 'control' | 'acquisition' | 'reacquisition' | 'periodic' | 'tracking' | 'bypass';
}
export interface TrackingSnapshot {
  state: TrackingState; region: NativeRect | null; source_width: number; source_height: number;
  epoch: number; roi_misses: number; last_full_submission_ms: number | null; last_admission_ms: number | null;
  pending: CaptureAttempt | null;
}

export class RegionTracker {
  private state: TrackingState = 'Searching';
  private region: NativeRect | null = null;
  private sourceWidth = 0;
  private sourceHeight = 0;
  private epoch = 0;
  private roiMisses = 0;
  private lastFullAt: number | null = null;
  private lastAdmissionAt: number | null = null;
  private pending: CaptureAttempt | null = null;
  private dispatched = false;
  private hadTracking = false;
  private lastAttemptId = 0;
  constructor(readonly mode: CameraMode) {
    if (mode !== 'full_frame' && mode !== 'auto_region') throw new Error('Invalid camera mode');
  }
  private time(now: number): void { if (!Number.isFinite(now) || now < 0) throw new Error('Invalid tracking time'); }
  private clear(): void {
    this.region = null; this.roiMisses = 0; this.lastAdmissionAt = null;
    this.state = this.hadTracking ? 'Reacquiring' : 'Searching';
  }
  reset(): void {
    this.clear(); this.state = 'Searching'; this.hadTracking = false;
    this.sourceWidth = 0; this.sourceHeight = 0; this.epoch++;
    this.pending = null; this.dispatched = false; this.lastFullAt = null;
    this.lastAttemptId = 0;
  }
  observeDimensions(width: number, height: number): void {
    if (width === this.sourceWidth && height === this.sourceHeight) return;
    this.sourceWidth = validDimensions(width, height) ? width : 0;
    this.sourceHeight = validDimensions(width, height) ? height : 0;
    this.epoch++; this.clear();
  }
  choose(now: number, width: number, height: number, attemptId: number): CaptureAttempt {
    this.time(now);
    if (!Number.isSafeInteger(attemptId) || attemptId <= 0) throw new Error('Invalid capture identity');
    if (attemptId <= this.lastAttemptId) throw new Error('Capture identity must increase within a trial');
    if (this.pending) throw new Error('One tracked image in flight');
    this.observeDimensions(width, height);
    const control = fullFrameTransform(width, height);
    if (this.region && (this.roiMisses >= 2 || this.lastAdmissionAt === null || now - this.lastAdmissionAt >= 500)) this.clear();
    let transform = control;
    let reason: CaptureAttempt['reason'] = this.mode === 'full_frame' ? 'control' : this.hadTracking ? 'reacquisition' : 'acquisition';
    if (this.mode === 'auto_region' && this.region) {
      if (this.lastFullAt === null || now - this.lastFullAt >= 1000) reason = 'periodic';
      else {
        const crop = roiTransform(this.region, width, height);
        if (crop) { transform = crop; reason = 'tracking'; }
        else { this.clear(); reason = 'bypass'; }
      }
    }
    this.pending = Object.freeze({ ...transform, attempt_id: attemptId, epoch: this.epoch, reason });
    this.dispatched = false;
    this.lastAttemptId = attemptId;
    return this.pending;
  }
  submitted(attemptId: number, epoch: number, now: number): void {
    this.time(now);
    if (!this.pending || this.pending.attempt_id !== attemptId || this.pending.epoch !== epoch || this.dispatched) throw new Error('No matching tracked dispatch');
    if (this.pending.kind === 'full_frame') this.lastFullAt = now;
    this.dispatched = true;
  }
  completed(attemptId: number, epoch: number, admitted: boolean, corners: readonly Point[] | null | undefined,
    now: number, currentWidth: number, currentHeight: number): boolean {
    this.time(now);
    const attempt = this.pending;
    if (!attempt || !this.dispatched || attempt.attempt_id !== attemptId || attempt.epoch !== epoch) return false;
    this.pending = null; this.dispatched = false;
    this.observeDimensions(currentWidth, currentHeight);
    if (attempt.epoch !== this.epoch || this.mode === 'full_frame') return false;
    if (!admitted) {
      if (attempt.kind === 'roi') { this.roiMisses++; if (this.roiMisses >= 2) this.clear(); }
      if (this.lastAdmissionAt !== null && now - this.lastAdmissionAt >= 500) this.clear();
      return false;
    }
    this.lastAdmissionAt = now; this.roiMisses = 0;
    const region = mapAdmittedCorners(corners, attempt);
    if (!region || !roiTransform(region, currentWidth, currentHeight)) { this.clear(); return false; }
    this.region = region; this.hadTracking = true; this.state = 'Tracking';
    return true;
  }
  snapshot(): TrackingSnapshot {
    return Object.freeze({ state: this.state, region: this.region, source_width: this.sourceWidth,
      source_height: this.sourceHeight, epoch: this.epoch, roi_misses: this.roiMisses,
      last_full_submission_ms: this.lastFullAt, last_admission_ms: this.lastAdmissionAt, pending: this.pending });
  }
}
