import { test, expect } from '@playwright/test';
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
