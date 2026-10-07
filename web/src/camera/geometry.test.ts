import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { decoderCorners, fullFrameTransform, mapAdmittedCorners, previewRect, roiTransform } from './geometry';
import type { CaptureTransform, Point } from './geometry';

const box = (left: number, top: number, right: number, bottom: number): Point[] => [
  { x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom },
];

describe('native-pixel camera geometry', () => {
  it.each([[1280, 720, 960, 540], [720, 1280, 720, 1280], [1001, 777, 960, 745], [640, 480, 640, 480]])(
    'preserves existing full-frame scaling for %s by %s', (width, height, inputWidth, inputHeight) => {
      expect(fullFrameTransform(width, height)).toEqual({ kind: 'full_frame', source_width: width, source_height: height, crop_x: 0, crop_y: 0, crop_width: width, crop_height: height, input_width: inputWidth, input_height: inputHeight });
    },
  );
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])('rejects invalid dimensions %s', width => {
    expect(() => fullFrameTransform(width, 720)).toThrow();
  });
  it('pads twenty percent per axis in native pixels and rounds outward', () => {
    expect(mapAdmittedCorners(box(100, 100, 300, 300), fullFrameTransform(1280, 720))).toEqual({ x: 80, y: 80, width: 374, height: 374 });
  });
  it('uses minimum twelve native pixels, then clips at the source boundary', () => {
    expect(mapAdmittedCorners(box(1, 1, 3, 3), fullFrameTransform(640, 480))).toEqual({ x: 0, y: 0, width: 15, height: 15 });
    expect(mapAdmittedCorners(box(638, 478, 640, 480), fullFrameTransform(640, 480))).toEqual({ x: 626, y: 466, width: 14, height: 14 });
  });
  it('maps odd rounded ROI axes separately with the original crop offset', () => {
    const transform: CaptureTransform = { kind: 'roi', source_width: 1280, source_height: 720, crop_x: 101, crop_y: 201, crop_width: 401, crop_height: 301, input_width: 301, input_height: 226 };
    expect(mapAdmittedCorners(box(0, 0, 301, 226), transform)).toEqual({ x: 20, y: 140, width: 563, height: 423 });
  });
  it('accepts rotated and perspective convex quadrilaterals', () => {
    expect(mapAdmittedCorners([{ x: 200, y: 100 }, { x: 300, y: 200 }, { x: 200, y: 300 }, { x: 100, y: 200 }], fullFrameTransform(640, 480))).toEqual({ x: 60, y: 60, width: 280, height: 280 });
    expect(mapAdmittedCorners([{ x: 100, y: 100 }, { x: 300, y: 120 }, { x: 280, y: 300 }, { x: 90, y: 270 }], fullFrameTransform(640, 480))).not.toBeNull();
  });
  it.each([
    null, [], box(0, 0, 10, 10).slice(1), box(-1, 0, 10, 10), box(0, 0, 641, 10),
    box(0, 0, 10, 481), box(0, 0, Infinity, 10), box(0, 0, NaN, 10),
    box(1, 1, 1, 10), [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }],
    [{ x: 10, y: 10 }, { x: 30, y: 30 }, { x: 30, y: 10 }, { x: 10, y: 30 }],
    [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 15, y: 15 }, { x: 10, y: 30 }],
  ])('rejects malformed corners %j without selecting a crop', corners => {
    expect(mapAdmittedCorners(corners, fullFrameTransform(640, 480))).toBeNull();
  });
  it('rejects transforms outside the native frame or with upscaled input', () => {
    const transform = fullFrameTransform(640, 480);
    for (const value of [{ crop_x: -1 }, { crop_width: 641 }, { input_width: 641 }, { crop_y: 1 }, { input_height: 0 }]) {
      expect(mapAdmittedCorners(box(1, 1, 3, 3), { ...transform, ...value })).toBeNull();
    }
  });
  it('bypasses near-full area and portrait crops that lose more detail than the control', () => {
    expect(roiTransform({ x: 0, y: 0, width: 640, height: 384 }, 640, 480)).toBeNull();
    expect(roiTransform({ x: 0, y: 0, width: 400, height: 1200 }, 720, 1280)).toBeNull();
    expect(roiTransform({ x: 0, y: 0, width: 400, height: 900 }, 720, 1280)).toMatchObject({ input_width: 400, input_height: 900 });
  });
  it('always respects pixel/edge/no-upscale and actual per-axis detail limits', () => {
    fc.assert(fc.property(fc.integer({ min: 32, max: 4096 }), fc.integer({ min: 32, max: 4096 }), fc.nat(), fc.nat(), (width, height, a, b) => {
      const rect = { x: 0, y: 0, width: a % width + 1, height: b % height + 1 };
      const transform = roiTransform(rect, width, height);
      if (!transform) return;
      const full = fullFrameTransform(width, height);
      expect(transform.input_width).toBeLessThanOrEqual(rect.width);
      expect(transform.input_height).toBeLessThanOrEqual(rect.height);
      expect(Math.max(transform.input_width, transform.input_height)).toBeLessThanOrEqual(960);
      expect(transform.input_width * transform.input_height).toBeLessThanOrEqual(full.input_width * full.input_height);
      expect(transform.input_width / rect.width).toBeGreaterThanOrEqual(full.input_width / width);
      expect(transform.input_height / rect.height).toBeGreaterThanOrEqual(full.input_height / height);
    }), { numRuns: 500, seed: 20261007 });
  });
  it('copies ordered decoder coordinates while stripping foreign contents', () => {
    const position = { topLeft: { x: 1, y: 2, text: 'SECRET' }, topRight: { x: 3, y: 2 }, bottomRight: { x: 3, y: 4 }, bottomLeft: { x: 1, y: 4 }, pixels: [1, 2] };
    const copied = decoderCorners(position);
    expect(copied).toEqual(box(1, 2, 3, 4));
    position.topLeft.x = 999;
    expect(copied?.[0].x).toBe(1);
    expect(Object.isFrozen(copied)).toBe(true);
    expect(Object.isFrozen(copied?.[0])).toBe(true);
    expect(JSON.stringify(copied)).not.toContain('SECRET');
    expect(decoderCorners({ ...position, bottomLeft: { x: NaN, y: 4 } })).toBeNull();
    expect(decoderCorners({ get topLeft(): unknown { throw new Error('malformed geometry'); } })).toBeNull();
  });
  it('maps preview outlines through centered contain offsets including portrait letterboxing', () => {
    expect(previewRect({ x: 100, y: 100, width: 200, height: 200 }, 1280, 720, 640, 480)).toEqual({ x: 50, y: 110, width: 100, height: 100 });
    expect(previewRect({ x: 0, y: 0, width: 720, height: 1280 }, 720, 1280, 640, 480)).toEqual({ x: 185, y: 0, width: 270, height: 480 });
    expect(previewRect({ x: -1, y: 0, width: 1, height: 1 }, 720, 1280, 640, 480)).toBeNull();
  });
});
