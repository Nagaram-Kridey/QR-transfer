import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { DiagnosticExport } from '../src/diagnostics/camera';

for (const mode of ['full_frame', 'auto_region'] as const) {
test(`reconstructs Python QR video in ${mode} through camera, worker and WASM`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('Camera scan mode').selectOption(mode);
  await page.getByRole('button', { name: 'Enable camera' }).click();
  await expect(page.getByRole('button', { name: 'Start receiving' })).toBeEnabled({ timeout: 15000 });
  await page.getByRole('button', { name: 'Start receiving' }).click();
  await expect(page.getByText('File verified', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('img', { name: 'Tracked scan region' })).toHaveCount(0);
  const saved = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save verified file' }).click();
  const file = await saved;
  expect(file.suggestedFilename()).toBe('camera-test.txt');
  expect(await readFile((await file.path())!, 'utf8')).toBe('LumenLink synthetic optical regression.\n'.repeat(8));
  await expect(page.getByRole('button', { name: 'Export trial observation' })).toBeVisible();
  const observationText = await readExport(page, 'Export trial observation', 'camera-observation.json');
  const sidecar = JSON.parse(await readExport(page, 'Export camera diagnostics', 'camera-diagnostics.json'));
  expect(sidecar.observation.sha256).toBe(createHash('sha256').update(observationText).digest('hex'));
  expect(sidecar.diagnostics.totals.completed).toBeGreaterThan(0);
  expect(sidecar.diagnostics.totals.interrupted).toBe(0);
  expect(sidecar.diagnostics.frames.unique).toBe(JSON.parse(observationText).stats.recovered);
  expect(sidecar.diagnostics.first_valid_acquisition_ms).toBeGreaterThanOrEqual(0);
  expect(sidecar.diagnostics.latest_attempts.at(-1).outcome).toBe('completed');
  expect(sidecar.diagnostics.pending).toBeNull();
  expect(sidecar.format).toBe('lumenlink-camera-diagnostics-v2');
  expect(sidecar.diagnostics.mode).toBe(mode);
  for (const attempt of sidecar.diagnostics.latest_attempts) {
    const scale = Math.min(1, 960 / attempt.source_width);
    if (attempt.kind === 'full_frame') {
      expect(attempt.input_width).toBe(Math.round(attempt.source_width * scale));
      expect(attempt.input_height).toBe(Math.round(attempt.source_height * scale));
    } else {
      expect(attempt.input_width).toBeLessThanOrEqual(attempt.crop_width);
      expect(attempt.input_height).toBeLessThanOrEqual(attempt.crop_height);
    }
    expect(attempt.pixels).toBe(attempt.input_width * attempt.input_height);
  }
  expect(errors).toEqual([]);
});
}

async function holdCameraDecoding(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, message: unknown, options?: Transferable[] | StructuredSerializeOptions): void {
      if ((message as { type?: string }).type === 'image') {
        const state = window as unknown as { cameraImages: number; lateCameraEvent: (data: unknown) => void };
        state.cameraImages = (state.cameraImages ?? 0) + 1;
        const handler = this.onmessage;
        state.lateCameraEvent = data => { handler?.call(this, new MessageEvent('message', { data })); };
      } else {
        if (Array.isArray(options)) original.call(this, message, { transfer: options });
        else original.call(this, message, options);
      }
    };
  });
}

async function readExport(page: Page, button: string, filename: string): Promise<string> {
  await expect(page.getByRole('button', { name: button })).toBeVisible();
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: button }).click();
  const file = await exported;
  expect(file.suggestedFilename()).toBe(filename);
  return readFile((await file.path())!, 'utf8');
}

async function readDiagnostics(page: Page): Promise<DiagnosticExport> {
  return JSON.parse(await readExport(page, 'Export camera diagnostics', 'camera-diagnostics.json'));
}

async function waitForSubmittedImage(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => (window as unknown as { cameraImages?: number }).cameraImages ?? 0)).toBe(1);
}

async function beginTrial(page: Page, mode = 'full_frame'): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Camera scan mode').selectOption(mode);
  await page.getByRole('button', { name: 'Enable camera' }).click();
  await expect(page.getByRole('button', { name: 'Start receiving' })).toBeEnabled({ timeout: 15000 });
  await page.getByRole('button', { name: 'Start receiving' }).click();
}

async function readObservation(page: Page): Promise<Record<string, unknown>> {
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export trial observation' }).click();
  return JSON.parse(await readFile((await (await exported).path())!, 'utf8')) as Record<string, unknown>;
}

test('reset keeps a cancelled observation for an already-started camera trial', async ({ page }) => {
  await holdCameraDecoding(page);
  await beginTrial(page);
  await waitForSubmittedImage(page);
  await page.getByRole('button', { name: 'Reset session' }).click();
  await expect(page.locator('.state')).toHaveText('IDLE');
  await expect(page.getByRole('button', { name: 'Export trial observation' })).toBeVisible();
  const observation = await readObservation(page);
  expect(observation.outcome).toBe('cancelled');
  expect(observation.elapsed_seconds).toBeGreaterThanOrEqual(0);
  await expect(page.getByRole('button', { name: 'Save verified file' })).toHaveCount(0);
  expect(await page.getByLabel('Camera preview').evaluate(element => (element as HTMLVideoElement).srcObject)).toBeNull();
  const diagnostics = (await readDiagnostics(page)).diagnostics;
  expect(diagnostics.totals).toMatchObject({ submitted: 1, completed: 0, interrupted: 1 });
  expect(diagnostics.latest_attempts[0]).toMatchObject({ outcome: 'interrupted', decode_ms: null, admission_ms: null });
  const before = JSON.stringify(diagnostics);
  await page.evaluate(() => {
    const state = window as unknown as { lateCameraEvent: (data: unknown) => void };
    state.lateCameraEvent({ type: 'scan', metrics: { attempt_id: 1, decode_ms: 1, admission_ms: 1, decoded_qr_count: 1, unique_delta: 1, duplicate_delta: 0, rejected_delta: 0, admitted: true, error_stage: null }, stats: { state: 'DONE', recovered: 1, total: 1, seen: 1, duplicates: 0, rejected: 0, session: 'a'.repeat(32) } });
    state.lateCameraEvent({ type: 'complete', file: { name: 'late.txt', data: new Uint8Array([1]), sha256: 'b'.repeat(64) }, stats: { state: 'DONE', recovered: 1, total: 1, seen: 1, duplicates: 0, rejected: 0, session: 'a'.repeat(32) } });
  });
  expect(JSON.stringify((await readDiagnostics(page)).diagnostics)).toBe(before);
  await expect(page.getByRole('button', { name: 'Save verified file' })).toHaveCount(0);
});

type CapturedImage = { attempt_id: number; capture_epoch: number; width: number; height: number; draw: number[] };
async function mockedCameraFrames(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state = window as unknown as { roiImages: CapturedImage[]; replyToImage: (data: unknown) => void; lastVideoDraw: number[] };
    state.roiImages = [];
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image: CanvasImageSource, ...coordinates: number[]): void {
      if (image instanceof HTMLVideoElement) state.lastVideoDraw = coordinates;
      Reflect.apply(draw, this, [image, ...coordinates]);
    };
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, message: unknown, options?: Transferable[] | StructuredSerializeOptions): void {
      const image = message as { type?: string; attempt_id: number; capture_epoch: number; width: number; height: number };
      if (image.type === 'image') {
        state.roiImages.push({ attempt_id: image.attempt_id, capture_epoch: image.capture_epoch, width: image.width, height: image.height, draw: [...state.lastVideoDraw] });
        const handler = this.onmessage?.bind(this);
        state.replyToImage = data => handler?.(new MessageEvent('message', { data }));
      } else if (Array.isArray(options)) post.call(this, message, { transfer: options });
      else post.call(this, message, options);
    };
  });
}
async function capturedImage(page: Page, count: number): Promise<CapturedImage> {
  await expect.poll(() => page.evaluate(() => (window as unknown as { roiImages: CapturedImage[] }).roiImages.length)).toBe(count);
  return page.evaluate(() => (window as unknown as { roiImages: CapturedImage[] }).roiImages.at(-1)!);
}
async function mockedScan(page: Page, image: CapturedImage, admitted: boolean, corners: { x: number; y: number }[] | null, release = true): Promise<void> {
  await page.evaluate(({ image, admitted, corners, release }) => {
    const state = window as unknown as { replyToImage: (data: unknown) => void };
    state.replyToImage({ type: 'scan', capture_epoch: image.capture_epoch, accepted_corners: corners,
      metrics: { attempt_id: image.attempt_id, decode_ms: 1, admission_ms: admitted ? 1 : null, decoded_qr_count: admitted ? 1 : 0, unique_delta: admitted ? 1 : 0, duplicate_delta: 0, rejected_delta: 0, admitted, error_stage: null },
      stats: { state: 'RECEIVING', recovered: 1, total: 64, seen: image.attempt_id, duplicates: 0, rejected: 0, session: 'a'.repeat(32) },
    });
    if (release) state.replyToImage({ type: 'idle' });
  }, { image, admitted, corners, release });
}
const smallAcceptedBox = [{ x: 100, y: 100 }, { x: 220, y: 100 }, { x: 220, y: 220 }, { x: 100, y: 220 }];

test('mocked admission drives native crop/readback and two misses restore full frame', async ({ page }) => {
  await mockedCameraFrames(page);
  await page.goto('/');
  await expect(page.getByLabel('Camera scan mode')).toHaveValue('full_frame');
  await page.getByLabel('Camera scan mode').selectOption('auto_region');
  await page.getByRole('button', { name: 'Enable camera' }).click();
  await expect(page.getByRole('button', { name: 'Start receiving' })).toBeEnabled({ timeout: 15000 });
  await expect(page.getByLabel('Camera scan mode')).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as { roiImages: CapturedImage[] }).roiImages.length)).toBe(0);
  await page.getByRole('button', { name: 'Start receiving' }).click();
  await expect(page.getByText('Searching', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Tracked scan region' })).toHaveCount(0);
  const first = await capturedImage(page, 1);
  expect(first.draw).toEqual([0, 0, first.width, first.height]);
  await mockedScan(page, first, true, smallAcceptedBox);
  await expect(page.getByText('Tracking', { exact: true })).toBeVisible();
  const second = await capturedImage(page, 2);
  expect(second.draw).toEqual([76, 76, 168, 168, 0, 0, 168, 168]);
  await expect(page.getByRole('img', { name: 'Tracked scan region' })).toBeVisible();
  await mockedScan(page, second, false, null);
  const third = await capturedImage(page, 3);
  expect(third.draw).toHaveLength(8);
  await mockedScan(page, third, false, null);
  await expect(page.getByText('Reacquiring', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Tracked scan region' })).toHaveCount(0);
  const fourth = await capturedImage(page, 4);
  expect(fourth.draw).toEqual([0, 0, fourth.width, fourth.height]);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  const diagnostics = (await readDiagnostics(page)).diagnostics;
  expect(diagnostics.mode).toBe('auto_region');
  expect(diagnostics.scans.roi).toMatchObject({ submitted: 2, completed: 2 });
  expect(diagnostics.scans.full_frame).toMatchObject({ submitted: 2, completed: 1, interrupted: 1 });
  expect(diagnostics.latest_attempts.map(attempt => attempt.kind)).toEqual(['full_frame', 'roi', 'roi', 'full_frame']);
});

for (const dimensions of [[640, 480], [720, 1280]]) {
  test(`dark receiver frame follows native ${dimensions.join('x')} geometry without tinting the tracked region`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await mockedCameraFrames(page);
    await page.addInitScript(([width, height]) => {
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
        const camera = document.createElement('canvas'); camera.width = width; camera.height = height;
        const context = camera.getContext('2d')!; context.fillStyle = '#fff'; context.fillRect(0, 0, width, height);
        context.fillStyle = '#000'; context.fillRect(100, 100, 120, 120);
        return camera.captureStream(1);
      } });
    }, dimensions);
    await beginTrial(page, 'auto_region');
    const first = await capturedImage(page, 1);
    expect([first.width, first.height]).toEqual(dimensions);
    await mockedScan(page, first, true, smallAcceptedBox);
    await capturedImage(page, 2);
    const overlay = page.getByRole('img', { name: 'Tracked scan region' });
    await expect(overlay).toBeVisible();
    const visual = await overlay.evaluate(element => {
      const svg = element as SVGSVGElement, dark = svg.querySelector<SVGRectElement>('.tracking-outline-dark')!, light = svg.querySelector<SVGRectElement>('.tracking-outline')!;
      const mask = svg.querySelector<SVGPathElement>('.tracking-mask')!, video = document.querySelector('video')!, view = svg.viewBox.baseVal;
      const bounds = video.getBoundingClientRect(), scale = Math.min(bounds.width / view.width, bounds.height / view.height);
      const offsetX = bounds.left + (bounds.width - view.width * scale) / 2, offsetY = bounds.top + (bounds.height - view.height * scale) / 2;
      const native = { x: dark.x.baseVal.value, y: dark.y.baseVal.value, width: dark.width.baseVal.value, height: dark.height.baseVal.value };
      const projected = new DOMPoint(native.x, native.y).matrixTransform(dark.getScreenCTM()!);
      const actual = dark.getBoundingClientRect(), middle = new DOMPoint(native.x + native.width / 2, native.y + native.height / 2);
      const ds = getComputedStyle(dark), ls = getComputedStyle(light);
      return { native, sameRect: ['x', 'y', 'width', 'height'].every(name => dark.getAttribute(name) === light.getAttribute(name)),
        nativeDimensions: [video.videoWidth, video.videoHeight], offsetError: [projected.x - (offsetX + native.x * scale), projected.y - (offsetY + native.y * scale)],
        sizeError: [actual.width - native.width * scale, actual.height - native.height * scale],
        interiorFilled: mask.isPointInFill(middle), outsideFilled: mask.isPointInFill(new DOMPoint(1, 1)), fillRule: getComputedStyle(mask).fillRule,
        pointerEvents: getComputedStyle(svg).pointerEvents, objectFit: getComputedStyle(video).objectFit,
        dark: { stroke: ds.stroke, width: ds.strokeWidth, fill: ds.fill, effect: dark.getAttribute('vector-effect') },
        light: { stroke: ls.stroke, width: ls.strokeWidth, fill: ls.fill, effect: light.getAttribute('vector-effect') }, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(visual.native).toEqual({ x: 76, y: 76, width: 168, height: 168 });
    expect(visual.sameRect).toBe(true);
    expect(visual.nativeDimensions).toEqual(dimensions);
    for (const error of [...visual.offsetError, ...visual.sizeError]) expect(Math.abs(error), JSON.stringify(visual)).toBeLessThan(0.1);
    expect(visual.interiorFilled).toBe(false); expect(visual.outsideFilled).toBe(true); expect(visual.fillRule).toBe('evenodd');
    expect(visual.pointerEvents).toBe('none'); expect(visual.objectFit).toBe('contain');
    expect(visual.dark).toEqual({ stroke: 'rgb(17, 24, 39)', width: '6px', fill: 'none', effect: 'non-scaling-stroke' });
    expect(visual.light).toEqual({ stroke: 'rgb(255, 255, 255)', width: '2px', fill: 'none', effect: 'non-scaling-stroke' });
    expect(visual.overflow).toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`receiver-dark-${dimensions.join('x')}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    await expect(overlay).toHaveCount(0);
    await mockedScan(page, first, true, smallAcceptedBox, false);
    await expect(overlay).toHaveCount(0);
  });
}

test('intrinsic A-to-portrait-to-A resize invalidates held ROI geometry without rejecting progress', async ({ page }) => {
  await mockedCameraFrames(page); await beginTrial(page, 'auto_region');
  const first = await capturedImage(page, 1);
  await mockedScan(page, first, true, smallAcceptedBox);
  const second = await capturedImage(page, 2);
  await page.evaluate(() => {
    const source = document.querySelector('video')!;
    const originalWidth = source.videoWidth, originalHeight = source.videoHeight;
    Object.defineProperty(source, 'videoWidth', { configurable: true, value: 720 });
    Object.defineProperty(source, 'videoHeight', { configurable: true, value: 1280 });
    source.dispatchEvent(new Event('resize'));
    Object.defineProperty(source, 'videoWidth', { configurable: true, value: originalWidth });
    Object.defineProperty(source, 'videoHeight', { configurable: true, value: originalHeight });
    source.dispatchEvent(new Event('resize'));
  });
  await mockedScan(page, second, true, smallAcceptedBox);
  const third = await capturedImage(page, 3);
  expect(third.capture_epoch).toBeGreaterThan(second.capture_epoch);
  expect(third.draw).toEqual([0, 0, third.width, third.height]);
  await expect(page.getByRole('img', { name: 'Tracked scan region' })).toHaveCount(0);
  await expect(page.getByText(/1\/64 symbols/)).toBeVisible();
  await page.getByRole('button', { name: 'Reset session' }).click();
  await expect(page.getByLabel('Camera scan mode')).toBeEnabled();
  await expect(page.getByRole('img', { name: 'Tracked scan region' })).toHaveCount(0);
});

test('portrait native feed bypasses crops that reduce more detail than full control', async ({ page }) => {
  await mockedCameraFrames(page);
  await page.addInitScript(() => {
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 720 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 1280 });
  });
  await beginTrial(page, 'auto_region');
  const first = await capturedImage(page, 1);
  expect([first.width, first.height]).toEqual([720, 1280]);
  await mockedScan(page, first, true, [{ x: 200, y: 60 }, { x: 400, y: 60 }, { x: 400, y: 1220 }, { x: 200, y: 1220 }]);
  const second = await capturedImage(page, 2);
  expect(second.draw).toEqual([0, 0, 720, 1280]);
  await expect(page.getByRole('img', { name: 'Tracked scan region' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  expect((await readDiagnostics(page)).diagnostics.scans.roi.submitted).toBe(0);
});

for (const ending of ['reset', 'background', 'timeout'] as const) {
  test(`active mocked ROI clears geometry on ${ending} and keeps interruption diagnostics`, async ({ page }) => {
    await mockedCameraFrames(page);
    if (ending === 'timeout') await page.clock.install();
    await beginTrial(page, 'auto_region');
    const first = await capturedImage(page, 1); await mockedScan(page, first, true, smallAcceptedBox);
    await capturedImage(page, 2);
    if (ending === 'reset') await page.getByRole('button', { name: 'Reset session' }).click();
    else if (ending === 'background') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    else await page.clock.fastForward(60001);
    await expect(page.getByRole('img', { name: 'Tracked scan region' })).toHaveCount(0);
    const diagnostics = (await readDiagnostics(page)).diagnostics;
    expect(diagnostics.scans.roi).toMatchObject({ submitted: 1, completed: 0, interrupted: 1 });
    expect(diagnostics.latest_attempts.at(-1)).toMatchObject({ kind: 'roi', outcome: 'interrupted', decode_ms: null });
    expect((await readObservation(page)).outcome).toBe(ending === 'reset' ? 'cancelled' : ending === 'background' ? 'failed' : 'timeout');
    await expect(page.getByRole('button', { name: 'Save verified file' })).toHaveCount(0);
  });
}

test('backgrounding an active trial fails it and preserves a local observation', async ({ page }) => {
  await holdCameraDecoding(page);
  await beginTrial(page);
  await waitForSubmittedImage(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.state')).toHaveText('FAILED');
  const observation = await readObservation(page);
  expect(observation.outcome).toBe('failed');
  expect(String(observation.reason)).toMatch(/background|hidden/i);
  await expect(page.getByRole('button', { name: 'Save verified file' })).toHaveCount(0);
  expect((await readDiagnostics(page)).diagnostics.totals.interrupted).toBe(1);
});

test('camera frame capture failure ends the trial instead of hanging', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    CanvasRenderingContext2D.prototype.getImageData = () => { throw new DOMException('Camera pixels unavailable', 'InvalidStateError'); };
  });
  await beginTrial(page);
  await expect(page.locator('.state')).toHaveText('FAILED');
  const observation = await readObservation(page);
  expect(observation.outcome).toBe('failed');
  expect(String(observation.reason)).toContain('Camera pixels unavailable');
  const diagnostics = (await readDiagnostics(page)).diagnostics;
  expect(diagnostics.totals).toMatchObject({ started: 1, submitted: 0, completed: 0, capture_failed: 1 });
  expect(diagnostics.latest_attempts[0]).toMatchObject({ outcome: 'capture_failed', error_stage: 'readback', decode_ms: null });
  expect(JSON.stringify(diagnostics)).not.toContain('Camera pixels unavailable');
  expect(errors).toEqual([]);
});

test('camera timeout is exportable and never exposes an unverified save', async ({ page }) => {
  await holdCameraDecoding(page);
  await page.clock.install();
  await beginTrial(page);
  await page.clock.fastForward(60_001);
  await expect(page.locator('.state')).toHaveText('TIMEOUT');
  const observation = await readObservation(page);
  expect(observation.outcome).toBe('timeout');
  expect(observation.elapsed_seconds).toBeGreaterThanOrEqual(60);
  expect(observation.payload_bytes).toBeNull();
  await expect(page.getByRole('button', { name: 'Save verified file' })).toHaveCount(0);
});

test('camera canvas initialization failure produces a failed observation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => { throw new DOMException('Canvas initialization unavailable', 'InvalidStateError'); };
  });
  await beginTrial(page);
  await expect(page.locator('.state')).toHaveText('FAILED');
  const observation = await readObservation(page);
  expect(observation.outcome).toBe('failed');
  expect(String(observation.reason)).toContain('Canvas initialization unavailable');
  expect((await readDiagnostics(page)).diagnostics.totals).toMatchObject({ initialization_failed: 1, started: 0, submitted: 0 });
  expect(errors).toEqual([]);
});

test('diagnostics hashes the exact unchanged v1 observation export without logging its contents', async ({ page }) => {
  await holdCameraDecoding(page);
  const recordedAt = '2026-10-06T18:50:00.000Z';
  await page.clock.setFixedTime(new Date(recordedAt));
  await page.addInitScript(() => {
    const state = window as unknown as { diagnosticNow: number };
    state.diagnosticNow = 1000;
    Object.defineProperty(performance, 'now', { value: () => state.diagnosticNow });
  });
  await beginTrial(page);
  await waitForSubmittedImage(page);
  await page.evaluate(() => { (window as unknown as { diagnosticNow: number }).diagnosticNow = 2500; });
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  const text = await readExport(page, 'Export trial observation', 'camera-observation.json');
  const expected = JSON.stringify({
    format: 'lumenlink-camera-observation-v1', outcome: 'cancelled', reason: 'User stopped receiving.',
    elapsed_seconds: 1.5, expected_payload_kib: 10, payload_bytes: null, payload_sha256: null,
    stats: { state: 'IDLE', recovered: 0, total: 0, seen: 0, duplicates: 0, rejected: 0, session: '' },
    browser: await page.evaluate(() => navigator.userAgent), recorded_at: recordedAt,
    note: 'Observation only: add device, commit, optical settings and trial metadata to the benchmark CSV.',
  }, null, 2);
  expect(text).toBe(expected);
  const sidecar = await readDiagnostics(page);
  expect(Object.keys(sidecar)).toEqual(['format', 'observation', 'diagnostics']);
  expect(sidecar.observation).toEqual({ filename: 'camera-observation.json', utf8_bytes: Buffer.byteLength(expected), sha256: createHash('sha256').update(expected).digest('hex') });
  expect(sidecar.diagnostics.totals).toMatchObject({ started: 1, submitted: 1, completed: 0, interrupted: 1 });
  expect(sidecar.diagnostics.pixels.interrupted).toBe(sidecar.diagnostics.pixels.submitted);
  expect(sidecar.diagnostics.latest_attempts[0]).toMatchObject({ outcome: 'interrupted', submitted_ms: 0, finished_ms: 1500, decode_ms: null });
  const serialized = JSON.stringify(sidecar);
  expect(serialized).not.toContain('User stopped receiving.');
  expect(serialized).not.toContain('pixels.buffer');
  expect(serialized).not.toContain('qr_text');
});

test('hash failure preserves observation and never raises an unhandled exception', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await holdCameraDecoding(page);
  await page.addInitScript(() => {
    Object.defineProperty(crypto.subtle, 'digest', { value: () => Promise.reject(new Error('HASH_FAILURE_SECRET')) });
  });
  await beginTrial(page);
  await waitForSubmittedImage(page);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByText('Diagnostics unavailable. The trial observation remains exportable.')).toBeVisible();
  expect((await readObservation(page)).outcome).toBe('cancelled');
  await expect(page.getByRole('button', { name: 'Export camera diagnostics' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('late hash completion after reset cannot restore either export', async ({ page }) => {
  await holdCameraDecoding(page);
  await page.addInitScript(() => {
    const original = crypto.subtle.digest.bind(crypto.subtle);
    const state = window as unknown as { releaseHash: () => void; hashFinished: boolean };
    Object.defineProperty(crypto.subtle, 'digest', { value: (algorithm: AlgorithmIdentifier, bytes: BufferSource) => new Promise<ArrayBuffer>((resolve, reject) => {
      state.releaseHash = () => { void original(algorithm, bytes).then(result => { state.hashFinished = true; resolve(result); }, reject); };
    }) });
  });
  await beginTrial(page);
  await waitForSubmittedImage(page);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByText('Preparing local diagnostics…')).toBeVisible();
  await page.getByRole('button', { name: 'Reset session' }).click();
  await page.evaluate(() => { (window as unknown as { releaseHash: () => void }).releaseHash(); });
  await expect.poll(() => page.evaluate(() => (window as unknown as { hashFinished?: boolean }).hashFinished)).toBe(true);
  await expect(page.locator('.state')).toHaveText('IDLE');
  await expect(page.getByRole('button', { name: 'Export trial observation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export camera diagnostics' })).toHaveCount(0);
});

test('diagnostic validation failure leaves real verified completion and saving available', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    let injected = false;
    Worker.prototype.postMessage = function (this: Worker, message: unknown, options?: Transferable[] | StructuredSerializeOptions): void {
      if ((message as { type?: string }).type === 'image' && !injected) {
        injected = true;
        const emit = this.onmessage?.bind(this);
        setTimeout(() => emit?.(new MessageEvent('message', { data: {
          type: 'scan', metrics: { attempt_id: (message as { attempt_id: number }).attempt_id, decode_ms: -1, admission_ms: null, decoded_qr_count: 0, unique_delta: 0, duplicate_delta: 0, rejected_delta: 0, admitted: false, error_stage: null },
          stats: { state: 'IDLE', recovered: 0, total: 0, seen: 0, duplicates: 0, rejected: 0, session: '' },
        } })), 0);
      }
      if (Array.isArray(options)) original.call(this, message, { transfer: options });
      else original.call(this, message, options);
    };
  });
  await beginTrial(page);
  await expect(page.getByText('File verified', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: 'Save verified file' })).toBeEnabled();
  expect((await readObservation(page)).outcome).toBe('success');
  await expect(page.getByText('Diagnostics unavailable. The trial observation remains exportable.')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const stage of ['capture', 'submit'] as const) {
  test(`${stage} failure records its fixed stage and zero submitted pixels`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(stage => {
      if (stage === 'capture') CanvasRenderingContext2D.prototype.drawImage = () => { throw new DOMException('PRIVATE_CAPTURE_FAILURE'); };
      else {
        const original = Worker.prototype.postMessage;
        Worker.prototype.postMessage = function (this: Worker, message: unknown, options?: Transferable[] | StructuredSerializeOptions): void {
          if ((message as { type?: string }).type === 'image') throw new DOMException('PRIVATE_DISPATCH_FAILURE');
          if (Array.isArray(options)) original.call(this, message, { transfer: options });
          else original.call(this, message, options);
        };
      }
    }, stage);
    await beginTrial(page);
    await expect(page.locator('.state')).toHaveText('FAILED');
    const diagnostics = (await readDiagnostics(page)).diagnostics;
    expect(diagnostics.totals).toMatchObject({ started: 1, submitted: 0, completed: 0, capture_failed: 1 });
    expect(diagnostics.pixels).toEqual({ submitted: 0, completed: 0, interrupted: 0 });
    expect(diagnostics.latest_attempts[0]).toMatchObject({ error_stage: stage, outcome: 'capture_failed', decode_ms: null, admission_ms: null });
    expect(JSON.stringify(diagnostics)).not.toMatch(/PRIVATE_CAPTURE_FAILURE|PRIVATE_DISPATCH_FAILURE/);
    expect((await readObservation(page)).outcome).toBe('failed');
    expect(errors).toEqual([]);
  });
}

test('native worker error interrupts pending work with unknown decoder timings', async ({ page }) => {
  await holdCameraDecoding(page);
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, message: unknown, options?: Transferable[] | StructuredSerializeOptions): void {
      if ((message as { type?: string }).type === 'image') {
        const emit = this.onerror?.bind(this);
        setTimeout(() => emit?.(new ErrorEvent('error', { message: 'PRIVATE_WORKER_CRASH' })), 0);
      }
      if (Array.isArray(options)) original.call(this, message, { transfer: options });
      else original.call(this, message, options);
    };
  });
  await beginTrial(page);
  await expect(page.locator('.state')).toHaveText('FAILED');
  const diagnostics = (await readDiagnostics(page)).diagnostics;
  expect(diagnostics.totals).toMatchObject({ submitted: 1, completed: 0, interrupted: 1, worker_errors: 0 });
  expect(diagnostics.latest_attempts[0]).toMatchObject({ outcome: 'interrupted', error_stage: null, decode_ms: null, admission_ms: null });
  expect(JSON.stringify(diagnostics)).not.toContain('PRIVATE_WORKER_CRASH');
  expect((await readObservation(page)).outcome).toBe('failed');
});

test('stopping an armed camera before timing creates no observation or diagnostics', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enable camera' }).click();
  await expect(page.getByRole('button', { name: 'Start receiving' })).toBeEnabled({ timeout: 15000 });
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export trial observation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export camera diagnostics' })).toHaveCount(0);
});
