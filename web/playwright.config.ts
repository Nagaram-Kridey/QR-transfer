import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const cameraArgs = (file: string): string[] => [
  '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
  `--use-file-for-fake-video-capture=${resolve(import.meta.dirname, '../artifacts/camera', file)}`,
];
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 40_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: { command: 'npm run preview -- --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { args: cameraArgs('clean.y4m') } } },
    { name: 'firefox', testIgnore: '**/camera.spec.ts', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testIgnore: '**/camera.spec.ts', use: { ...devices['Desktop Safari'] } },
    { name: 'chromium-degraded', testMatch: '**/camera.spec.ts', use: { ...devices['Desktop Chrome'], launchOptions: { args: cameraArgs('degraded.y4m') } } },
  ],
});
