import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('prepares, exports, verifies and saves the exact message', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const external: string[] = [];
  page.on('request', request => { if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') external.push(request.url()); });
  await page.goto('/');
  await expect(page.getByText('Experimental plaintext demo.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Or write a message' }).fill('A cross-browser transfer 🌍\n');
  await page.getByRole('button', { name: 'Prepare QR', exact: true }).click();
  await expect(page.getByLabel('Transfer QR code')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play QR stream' })).toBeDisabled();
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export frames' }).click();
  const exportPath = await (await exported).path();
  await page.getByText('Conformance testing without a camera').click();
  await page.getByLabel('Frame JSON').setInputFiles(exportPath!);
  await expect(page.getByText('File verified', { exact: true })).toBeVisible({ timeout: 15000 });
  const received = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save verified file' }).click();
  const result = await received;
  expect(result.suggestedFilename()).toBe('message.txt');
  expect(await readFile((await result.path())!, 'utf8')).toBe('A cross-browser transfer 🌍\n');
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  await expect(page.getByRole('button', { name: 'Export trial observation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export camera diagnostics' })).toHaveCount(0);
});

test('starts and pauses playback only after the flashing acknowledgement', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Prepare QR', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Play QR stream' }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play QR stream' })).toBeVisible();
});

test('experimental sender targets require a fresh rate acknowledgement and preserve paused session', async ({ page }) => {
  await page.goto('/');
  const rate = page.getByLabel('Playback rate');
  await expect(rate).toHaveValue('8');
  expect(await rate.locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))).toEqual(['2', '4', '8', '10', '15', '20', '30']);
  await page.getByRole('button', { name: 'Prepare QR', exact: true }).click();
  const firstExport = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export frames' }).click();
  const firstFrames = await readFile((await (await firstExport).path())!, 'utf8');
  const flashing = page.getByRole('checkbox', { name: /I understand that animated QR codes flash/ });
  const highRate = page.getByRole('checkbox', { name: /I agree to test the experimental/ });
  const play = page.getByRole('button', { name: 'Play QR stream' });
  await flashing.check();
  await expect(play).toBeEnabled();
  await rate.selectOption('15');
  await expect(highRate).not.toBeChecked();
  await expect(highRate).toHaveAccessibleName(/15 fps target/);
  await expect(play).toBeDisabled();
  await highRate.check();
  await expect(play).toBeEnabled();
  await rate.selectOption('20');
  await expect(highRate).not.toBeChecked();
  await expect(play).toBeDisabled();
  await highRate.check();
  await flashing.uncheck();
  await expect(play).toBeDisabled();
  await flashing.check();
  await rate.selectOption('30');
  await expect(highRate).not.toBeChecked();
  await expect(highRate).toHaveAccessibleName(/30 fps target/);
  await expect(play).toBeDisabled();
  await highRate.check();
  await play.click();
  await expect(rate).toBeDisabled();
  await expect(page.getByLabel('Symbol size')).toBeDisabled();
  await expect(highRate).toBeDisabled();
  await expect(flashing).toBeDisabled();
  const counter = page.getByText(/frames drawn/);
  const displayed = async (): Promise<number> => Number((await counter.textContent())?.match(/(\d+) frames drawn/)?.[1]);
  await expect.poll(displayed).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(rate).toBeEnabled();
  const paused = await displayed();
  await page.waitForTimeout(100);
  expect(await displayed()).toBe(paused);
  await expect(highRate).toBeChecked();
  await play.click();
  await expect.poll(displayed).toBeGreaterThan(paused);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const afterExport = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export frames' }).click();
  expect(await readFile((await (await afterExport).path())!, 'utf8')).toBe(firstFrames);
  await rate.selectOption('8');
  await expect(highRate).toHaveCount(0);
  await expect(play).toBeEnabled();
  await rate.selectOption('30');
  await expect(highRate).not.toBeChecked();
  await expect(play).toBeDisabled();
});

test('handles camera denial without leaving an active session', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async () => { throw new DOMException('Camera permission denied', 'NotAllowedError'); },
    } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enable camera' }).click();
  await expect(page.getByRole('alert')).toContainText('Camera permission denied');
  await expect(page.getByRole('button', { name: 'Enable camera' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Start receiving' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Export trial observation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export camera diagnostics' })).toHaveCount(0);
});

test('rejects incomplete frame imports without leaving the receiver busy', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Conformance testing without a camera').click();
  await page.getByLabel('Frame JSON').setInputFiles({
    name: 'incomplete.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'lumenlink-frames-v2', frames: [] })),
  });
  await expect(page.getByRole('alert')).toContainText('incomplete');
  await expect(page.getByRole('button', { name: 'Enable camera' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Save verified file' })).toHaveCount(0);
});

test('fits a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Prepare QR', exact: true }).click();
  await expect(page.getByLabel('Transfer QR code')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('reset abandons a pending frame import before it can expose a file', async ({ page }) => {
  await page.addInitScript(() => {
    const original = File.prototype.text;
    let workersCreated = 0;
    Object.defineProperty(window, 'importWorkersCreated', { get: () => workersCreated });
    window.Worker = new Proxy(Worker, { construct(target, args) {
      workersCreated++;
      return Reflect.construct(target, args);
    } });
    Object.defineProperty(File.prototype, 'text', { configurable: true, value: async function (this: File) {
      await new Promise(resolve => {
        Object.defineProperty(window, 'releaseImportRead', { configurable: true, value: resolve });
      });
      const text = await original.call(this);
      Object.defineProperty(window, 'importReadSettled', { configurable: true, value: true });
      return text;
    } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Prepare QR', exact: true }).click();
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export frames' }).click();
  const exportPath = await (await exported).path();
  await page.getByText('Conformance testing without a camera').click();
  await page.getByLabel('Frame JSON').setInputFiles(exportPath!);
  await expect(page.locator('.state')).toHaveText('IMPORTING');
  await page.getByRole('button', { name: 'Reset session' }).click();
  await page.evaluate(() => (window as unknown as { releaseImportRead: () => void }).releaseImportRead());
  await page.waitForFunction(() => (window as unknown as { importReadSettled: boolean }).importReadSettled);
  expect(await page.evaluate(() => (window as unknown as { importWorkersCreated: number }).importWorkersCreated)).toBe(0);
  await expect(page.locator('.state')).toHaveText('IDLE');
  await expect(page.getByRole('button', { name: 'Save verified file' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enable camera' })).toBeEnabled();
});
