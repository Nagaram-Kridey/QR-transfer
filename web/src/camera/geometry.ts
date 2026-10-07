/** Geometry only: no QR text, camera pixels or protocol decoding. */
export type CameraMode = 'full_frame' | 'auto_region';
export type ScanKind = 'full_frame' | 'roi';
export interface Point { x: number; y: number }
export interface NativeRect { x: number; y: number; width: number; height: number }
export interface CaptureTransform {
  kind: ScanKind;
  source_width: number; source_height: number;
  crop_x: number; crop_y: number; crop_width: number; crop_height: number;
  input_width: number; input_height: number;
}

const positiveInteger = (value: number): boolean => Number.isSafeInteger(value) && value > 0;
export function validDimensions(width: number, height: number): boolean {
  return positiveInteger(width) && positiveInteger(height) && Number.isSafeInteger(width * height);
}
export function fullFrameTransform(width: number, height: number): CaptureTransform {
  if (!validDimensions(width, height)) throw new Error('Invalid camera dimensions');
  const scale = Math.min(1, 960 / width);
  const inputWidth = Math.round(width * scale), inputHeight = Math.round(height * scale);
  if (!validDimensions(inputWidth, inputHeight)) throw new Error('Invalid camera output dimensions');
  return Object.freeze({ kind: 'full_frame', source_width: width, source_height: height,
    crop_x: 0, crop_y: 0, crop_width: width, crop_height: height,
    input_width: inputWidth, input_height: inputHeight });
}

function validTransform(transform: CaptureTransform): boolean {
  return validDimensions(transform.source_width, transform.source_height)
    && validDimensions(transform.crop_width, transform.crop_height)
    && validDimensions(transform.input_width, transform.input_height)
    && Number.isSafeInteger(transform.crop_x) && Number.isSafeInteger(transform.crop_y)
    && transform.crop_x >= 0 && transform.crop_y >= 0
    && transform.crop_x + transform.crop_width <= transform.source_width
    && transform.crop_y + transform.crop_height <= transform.source_height
    && transform.input_width <= transform.crop_width && transform.input_height <= transform.crop_height;
}

/** Ordered TL, TR, BR, BL corners in the submitted decoder image. */
export function mapAdmittedCorners(corners: readonly Point[] | null | undefined, transform: CaptureTransform): NativeRect | null {
  if (!validTransform(transform) || !Array.isArray(corners) || corners.length !== 4) return null;
  for (const point of corners) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)
      || point.x < 0 || point.y < 0 || point.x > transform.input_width || point.y > transform.input_height) return null;
  }
  // Convexity rejects repeated, collinear, crossed and otherwise invalid quadrilaterals.
  let sign = 0;
  for (let n = 0; n < 4; n++) {
    const a = corners[n], b = corners[(n + 1) % 4], c = corners[(n + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (!Number.isFinite(cross) || cross === 0) return null;
    const direction = Math.sign(cross);
    if (sign && direction !== sign) return null;
    sign = direction;
  }
  const native = corners.map(point => ({
    x: transform.crop_x + point.x * transform.crop_width / transform.input_width,
    y: transform.crop_y + point.y * transform.crop_height / transform.input_height,
  }));
  const xs = native.map(point => point.x), ys = native.map(point => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = Math.max(12, .2 * (maxX - minX)), padY = Math.max(12, .2 * (maxY - minY));
  const left = Math.max(0, Math.floor(minX - padX)), top = Math.max(0, Math.floor(minY - padY));
  const right = Math.min(transform.source_width, Math.ceil(maxX + padX));
  const bottom = Math.min(transform.source_height, Math.ceil(maxY + padY));
  if (right <= left || bottom <= top) return null;
  return Object.freeze({ x: left, y: top, width: right - left, height: bottom - top });
}

export function roiTransform(rect: NativeRect, width: number, height: number): CaptureTransform | null {
  if (!validDimensions(width, height)) return null;
  const control = fullFrameTransform(width, height);
  if (!rect || !Number.isSafeInteger(rect.x) || !Number.isSafeInteger(rect.y)
    || rect.x < 0 || rect.y < 0 || !validDimensions(rect.width, rect.height)
    || rect.x + rect.width > width || rect.y + rect.height > height
    || rect.width * rect.height >= .8 * width * height) return null;
  const budget = control.input_width * control.input_height;
  const scale = Math.min(1, 960 / Math.max(rect.width, rect.height), Math.sqrt(budget / (rect.width * rect.height)));
  const inputWidth = Math.floor(rect.width * scale), inputHeight = Math.floor(rect.height * scale);
  if (!validDimensions(inputWidth, inputHeight) || Math.max(inputWidth, inputHeight) > 960
    || inputWidth * inputHeight > budget
    // Compare the actual rounded per-axis control sampling, not only a nominal scale.
    || inputWidth / rect.width < control.input_width / width
    || inputHeight / rect.height < control.input_height / height) return null;
  return Object.freeze({ kind: 'roi', source_width: width, source_height: height,
    crop_x: rect.x, crop_y: rect.y, crop_width: rect.width, crop_height: rect.height,
    input_width: inputWidth, input_height: inputHeight });
}

/** Copy only numeric coordinates from the local decoder's result position. */
export function decoderCorners(position: unknown): readonly Point[] | null {
  try {
    if (!position || typeof position !== 'object') return null;
    const result: Point[] = [];
    for (const key of ['topLeft', 'topRight', 'bottomRight', 'bottomLeft']) {
      const value: unknown = (position as Record<string, unknown>)[key];
      if (!value || typeof value !== 'object') return null;
      const point = value as Record<string, unknown>;
      if (typeof point.x !== 'number' || typeof point.y !== 'number' || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
      result.push(Object.freeze({ x: point.x, y: point.y }));
    }
    return Object.freeze(result);
  } catch { return null; } // Geometry must never convert an admitted frame into a failure.
}

/** The same centered contain mapping used by the unchanged camera preview. */
export function previewRect(rect: NativeRect, width: number, height: number, boxWidth: number, boxHeight: number): NativeRect | null {
  if (!validDimensions(width, height) || !rect || !Number.isFinite(rect.x) || !Number.isFinite(rect.y)
    || rect.x < 0 || rect.y < 0 || !validDimensions(rect.width, rect.height)
    || rect.x + rect.width > width || rect.y + rect.height > height
    || !Number.isFinite(boxWidth) || !Number.isFinite(boxHeight) || boxWidth <= 0 || boxHeight <= 0) return null;
  const scale = Math.min(boxWidth / width, boxHeight / height);
  return Object.freeze({ x: (boxWidth - width * scale) / 2 + rect.x * scale,
    y: (boxHeight - height * scale) / 2 + rect.y * scale, width: rect.width * scale, height: rect.height * scale });
}
