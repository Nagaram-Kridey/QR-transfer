import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { DiagnosticExport } from '../src/diagnostics/camera';

test('reconstructs Python QR video through the camera, worker and WASM decoder', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Enable camera' }).click();
  await expect(page.getByRole('button', { name: 'Start receiving' })).toBeEnabled({ timeout: 15000 });
  await page.getByRole('button', { name: 'Start receiving' }).click();
  await expect(page.getByText('File verified', { exact: true })).toBeVisible({ timeout: 20000 });
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
  for (const attempt of sidecar.diagnostics.latest_attempts) {
    const scale = Math.min(1, 960 / attempt.source_width);
    expect(attempt.input_width).toBe(Math.round(attempt.source_width * scale));
    expect(attempt.input_height).toBe(Math.round(attempt.source_height * scale));
    expect(attempt.pixels).toBe(attempt.input_width * attempt.input_height);
  }
  expect(errors).toEqual([]);
});

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

async function beginTrial(page: Page): Promise<void> {
  await page.goto('/');
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
