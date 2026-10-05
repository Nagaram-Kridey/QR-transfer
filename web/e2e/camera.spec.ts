import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

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
  expect(errors).toEqual([]);
});

async function holdCameraDecoding(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, message: unknown, options?: Transferable[] | StructuredSerializeOptions): void {
      if ((message as { type?: string }).type !== 'image') {
        if (Array.isArray(options)) original.call(this, message, { transfer: options });
        else original.call(this, message, options);
      }
    };
  });
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
  await page.getByRole('button', { name: 'Reset session' }).click();
  await expect(page.locator('.state')).toHaveText('IDLE');
  await expect(page.getByRole('button', { name: 'Export trial observation' })).toBeVisible();
  const observation = await readObservation(page);
  expect(observation.outcome).toBe('cancelled');
  expect(observation.elapsed_seconds).toBeGreaterThanOrEqual(0);
  await expect(page.getByRole('button', { name: 'Save verified file' })).toHaveCount(0);
  expect(await page.getByLabel('Camera preview').evaluate(element => (element as HTMLVideoElement).srcObject)).toBeNull();
});

test('backgrounding an active trial fails it and preserves a local observation', async ({ page }) => {
  await holdCameraDecoding(page);
  await beginTrial(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.state')).toHaveText('FAILED');
  const observation = await readObservation(page);
  expect(observation.outcome).toBe('failed');
  expect(String(observation.reason)).toMatch(/background|hidden/i);
  await expect(page.getByRole('button', { name: 'Save verified file' })).toHaveCount(0);
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
  expect(errors).toEqual([]);
});
