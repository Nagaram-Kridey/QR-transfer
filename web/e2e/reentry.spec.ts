import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

type Mode = 'full_frame' | 'auto_region';
interface Point { x: number; y: number }
interface Transform {
  source_width: number; source_height: number;
  crop_x: number; crop_y: number; crop_width: number; crop_height: number;
  input_width: number; input_height: number;
}
interface Capture { attempt_id: number; capture_epoch: number; submitted_at_ms: number; transform: Transform }
interface Scan {
  observed_at_ms: number; capture: Capture | null; capture_epoch: number;
  admitted: boolean; unique_delta: number; duplicate_delta: number; rejected_delta: number;
  decoded_qr_count: number; accepted_corners: Point[] | null;
  native_bounds: { left: number; right: number; top: number; bottom: number } | null;
  recovered: number; total: number;
}
interface Event {
  event_id: string; challenge: string; source_width: number; source_height: number;
  seed: { x: number; y: number; side: number; symbol_index: number };
  target: { x: number; y: number; side: number; center_x: number; center_y: number; symbol_index: number };
  occlusion_ms: number; stale_same_session_decoy: boolean;
  seed_png: string; target_png: string; seed_png_sha256: string; target_png_sha256: string;
  paired_order: Mode[];
}
interface Manifest {
  format: string; events: Event[]; blank_png: string; blank_png_sha256: string;
  source_symbol_count: number; session_id: string;
}
interface Feeder {
  scans: Scan[]; dropped_scans: number; last_draw: Transform | null;
  captures: Map<number, Capture>; images: Record<string, HTMLImageElement>;
  canvas: HTMLCanvasElement | null; stream: MediaStream | null;
  track: CanvasCaptureMediaStreamTrack | null; current_scene: string;
  load: (images: Record<string, string>, width: number, height: number) => Promise<void>;
  present: (name: string) => Promise<{ at_ms: number; media_time: number; presented_frames: number }>;
}
interface Outcome {
  event_id: string; mode: Mode; outcome: 'success' | 'seed_timeout' | 'timeout' | 'ordering_ambiguous' | 'harness_error';
  latency_ms: number | null; presented_at_ms: number | null; recovered_at_ms: number | null;
  error: string | null; first_target_scan: Scan | null; scans: Scan[]; dropped_scans: number;
}

const ROOT = resolve(import.meta.dirname, '../..');
const FIXTURES = resolve(ROOT, 'artifacts/reentry');
const TARGET_TIMEOUT_MS = 3000;
const digest = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex');

/** Only synthetic camera input and passive taps change. The product worker is real. */
async function installFeeder(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const harness: Feeder = {
      scans: [], dropped_scans: 0, last_draw: null, captures: new Map(), images: {},
      canvas: null, stream: null, track: null, current_scene: 'seed',
      async load(images, width, height) {
        harness.canvas = document.createElement('canvas');
        harness.canvas.width = width; harness.canvas.height = height;
        for (const [name, url] of Object.entries(images)) {
          const image = new Image(); image.src = url; await image.decode(); harness.images[name] = image;
        }
      },
      async present(name) {
        const canvas = harness.canvas, track = harness.track;
        const video = document.querySelector('video');
        if (!canvas || !track || !video) throw new Error('Synthetic source is not ready');
        return new Promise((accept, reject) => {
          const timer = window.setTimeout(() => reject(new Error('No source video presentation')), 2000);
          video.requestVideoFrameCallback((_now, metadata) => {
            window.clearTimeout(timer);
            accept({ at_ms: performance.now(), media_time: metadata.mediaTime, presented_frames: metadata.presentedFrames });
          });
          harness.current_scene = name;
          const context = canvas.getContext('2d');
          if (!context || !harness.images[name]) throw new Error('Missing synthetic scene');
          context.drawImage(harness.images[name], 0, 0);
          track.requestFrame();
        });
      },
    };
    (window as unknown as { __reentry: Feeder }).__reentry = harness;
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async (): Promise<MediaStream> => {
        if (!harness.canvas || !harness.images.seed) throw new Error('Fixture must load before camera enable');
        harness.canvas.getContext('2d')!.drawImage(harness.images.seed, 0, 0);
        harness.stream = harness.canvas.captureStream(0);
        harness.track = harness.stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
        harness.track.requestFrame();
        return harness.stream;
      },
    });
    const originalDraw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, image: CanvasImageSource, ...args: number[]): void {
      if (image instanceof HTMLVideoElement) {
        const cropped = args.length === 8;
        harness.last_draw = {
          source_width: image.videoWidth, source_height: image.videoHeight,
          crop_x: cropped ? args[0] : 0, crop_y: cropped ? args[1] : 0,
          crop_width: cropped ? args[2] : image.videoWidth,
          crop_height: cropped ? args[3] : image.videoHeight,
          input_width: cropped ? args[6] : args[2], input_height: cropped ? args[7] : args[3],
        };
      }
      originalDraw.apply(this, [image, ...args] as Parameters<typeof originalDraw>);
    } as typeof originalDraw;
    const originalPost = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, options?: Transferable[] | StructuredSerializeOptions): void {
      const input = message as { type?: string; attempt_id: number; capture_epoch: number };
      if (input.type === 'image' && harness.last_draw) {
        harness.captures.set(input.attempt_id, {
          attempt_id: input.attempt_id, capture_epoch: input.capture_epoch,
          submitted_at_ms: performance.now(), transform: { ...harness.last_draw },
        });
      }
      if (Array.isArray(options)) originalPost.call(this, message, { transfer: options });
      else originalPost.call(this, message, options);
    };
    const descriptor = Object.getOwnPropertyDescriptor(Worker.prototype, 'onmessage');
    if (!descriptor?.set || !descriptor.get) throw new Error('Worker event accessor unavailable');
    Object.defineProperty(Worker.prototype, 'onmessage', {
      ...descriptor,
      set(handler: ((this: Worker, event: MessageEvent) => void) | null) {
        descriptor.set!.call(this, function (this: Worker, event: MessageEvent): void {
          const response = event.data as {
            type: string; capture_epoch: number; accepted_corners: Point[] | null;
            metrics: { attempt_id: number; admitted: boolean; unique_delta: number; duplicate_delta: number; rejected_delta: number; decoded_qr_count: number };
            stats: { recovered: number; total: number };
          };
          if (response.type === 'scan') {
            const capture = harness.captures.get(response.metrics.attempt_id) ?? null;
            harness.captures.delete(response.metrics.attempt_id);
            let bounds: Scan['native_bounds'] = null;
            if (capture && capture.capture_epoch === response.capture_epoch && response.accepted_corners?.length === 4) {
              const transform = capture.transform;
              const corners = response.accepted_corners.map(point => ({
                x: transform.crop_x + point.x * transform.crop_width / transform.input_width,
                y: transform.crop_y + point.y * transform.crop_height / transform.input_height,
              }));
              bounds = { left: Math.min(...corners.map(point => point.x)), right: Math.max(...corners.map(point => point.x)),
                top: Math.min(...corners.map(point => point.y)), bottom: Math.max(...corners.map(point => point.y)) };
            }
            harness.scans.push({ observed_at_ms: performance.now(), capture, capture_epoch: response.capture_epoch,
              admitted: response.metrics.admitted, unique_delta: response.metrics.unique_delta,
              duplicate_delta: response.metrics.duplicate_delta, rejected_delta: response.metrics.rejected_delta,
              decoded_qr_count: response.metrics.decoded_qr_count,
              accepted_corners: response.accepted_corners, native_bounds: bounds,
              recovered: response.stats.recovered, total: response.stats.total });
            if (harness.scans.length > 1024) { harness.scans.shift(); harness.dropped_scans++; }
          }
          handler?.call(this, event);
        });
      },
      get() { return descriptor.get!.call(this); },
    });
  });
}

function contains(bounds: Scan['native_bounds'], x: number, y: number): boolean {
  return bounds !== null && x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}
async function scans(page: Page): Promise<{ scans: Scan[]; dropped_scans: number }> {
  return page.evaluate(() => {
    const harness = (window as unknown as { __reentry: Feeder }).__reentry;
    return { scans: harness.scans, dropped_scans: harness.dropped_scans };
  });
}

async function runEvent(page: Page, event: Event, mode: Mode, images: Record<string, string>): Promise<Outcome> {
  const result: Outcome = {
    event_id: event.event_id, mode, outcome: 'harness_error', latency_ms: null,
    presented_at_ms: null, recovered_at_ms: null, error: null, first_target_scan: null,
    scans: [], dropped_scans: 0,
  };
  try {
    await page.goto('/');
    await page.evaluate(async ({ images, width, height }) => {
      await (window as unknown as { __reentry: Feeder }).__reentry.load(images, width, height);
    }, { images, width: event.source_width, height: event.source_height });
    await page.getByLabel('Camera scan mode').selectOption(mode);
    await page.getByRole('button', { name: 'Enable camera', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start receiving', exact: true })).toBeEnabled({ timeout: 15000 });
    await page.getByRole('button', { name: 'Start receiving', exact: true }).click();
    const seedDeadline = performance.now() + 6000;
    let seeded = false;
    while (performance.now() < seedDeadline) {
      const observed = await scans(page);
      const seedX = event.seed.x + event.seed.side / 2, seedY = event.seed.y + event.seed.side / 2;
      const seedAdmission = observed.scans.some(scan => scan.admitted && scan.unique_delta > 0
        && scan.total === 64 && contains(scan.native_bounds, seedX, seedY));
      const duplicates = observed.scans.filter(scan => scan.admitted && scan.duplicate_delta > 0
        && contains(scan.native_bounds, seedX, seedY)).length;
      if (seedAdmission && duplicates >= 2) { seeded = true; break; }
      await page.waitForTimeout(20);
    }
    if (!seeded) { result.outcome = 'seed_timeout'; return result; }
    // Drain a genuine seed presentation before the moved target. No modified clock.
    await page.evaluate(() => (window as unknown as { __reentry: Feeder }).__reentry.present('seed'));
    if (event.occlusion_ms) {
      await page.evaluate(() => (window as unknown as { __reentry: Feeder }).__reentry.present('blank'));
      await page.waitForTimeout(event.occlusion_ms);
    }
    const presented = await page.evaluate(() => (window as unknown as { __reentry: Feeder }).__reentry.present('target'));
    result.presented_at_ms = presented.at_ms;
    const deadline = performance.now() + TARGET_TIMEOUT_MS;
    let target: Scan | undefined;
    while (performance.now() < deadline) {
      const observed = await scans(page);
      target = observed.scans.find(scan => scan.admitted && scan.unique_delta > 0 && scan.recovered === 2
        && contains(scan.native_bounds, event.target.center_x, event.target.center_y));
      if (target) break;
      await page.waitForTimeout(20);
    }
    if (!target) result.outcome = 'timeout';
    else {
      result.first_target_scan = target; result.recovered_at_ms = target.observed_at_ms;
      result.latency_ms = target.observed_at_ms - presented.at_ms;
      if (result.latency_ms < 0) {
        result.outcome = 'ordering_ambiguous';
        result.error = 'Target admission preceded the source presentation anchor; latency is retained unmodified.';
      } else result.outcome = 'success';
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    try {
      const observed = await scans(page); result.scans = observed.scans; result.dropped_scans = observed.dropped_scans;
      const stop = page.getByRole('button', { name: 'Stop', exact: true });
      if (await stop.isEnabled()) await stop.click();
    } catch { /* The explicit harness_error outcome retains the earlier exception. */ }
  }
  return result;
}

function nearestRank(values: number[], quantile: number): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.ceil(quantile * ordered.length) - 1];
}

async function sourceSnapshot(): Promise<{ base_commit: string; source_sha256: string; files: Record<string, string> }> {
  const paths = ['web/src/camera/geometry.ts', 'web/src/camera/tracker.ts', 'web/src/codec/core.ts',
    'web/src/diagnostics/camera.ts', 'web/src/ui/App.tsx', 'web/src/ui/style.css',
    'web/src/workers/messages.ts', 'web/src/workers/receiver.worker.ts'].sort();
  const files: Record<string, string> = {}, aggregate = createHash('sha256');
  for (const path of paths) {
    const text = (await readFile(resolve(ROOT, path), 'utf8')).replace(/\r\n/g, '\n');
    files[path] = digest(text); aggregate.update(path).update('\0').update(text).update('\0');
  }
  return { base_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    source_sha256: aggregate.digest('hex'), files };
}

test('preserves 20 paired intended-target reentries through real capture, worker and WASM', async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One controlled Chromium dataset; other engines have separate lifecycle checks.');
  test.setTimeout(600_000);
  const manifestText = await readFile(resolve(FIXTURES, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestText) as Manifest;
  expect(manifest.format).toBe('lumenlink-synthetic-reentry-fixtures-v1');
  expect(manifest.events.map(event => event.event_id)).toEqual(Array.from({ length: 20 }, (_, index) => `R${String(index + 1).padStart(2, '0')}`));
  expect(manifest.source_symbol_count).toBe(64);
  const started = new Date().toISOString(), before = await sourceSnapshot();
  await installFeeder(page);
  const outcomes: Outcome[] = [];
  const outputDirectory = resolve(FIXTURES, 'results'); await mkdir(outputDirectory, { recursive: true });
  const outputPath = resolve(outputDirectory, `${started.replace(/[:.]/g, '-')}.json`);
  const blank = await readFile(resolve(FIXTURES, manifest.blank_png));
  expect(digest(blank)).toBe(manifest.blank_png_sha256);
  for (const event of manifest.events) {
    const seed = await readFile(resolve(FIXTURES, event.seed_png));
    const target = await readFile(resolve(FIXTURES, event.target_png));
    expect(digest(seed)).toBe(event.seed_png_sha256); expect(digest(target)).toBe(event.target_png_sha256);
    const images = { seed: `data:image/png;base64,${seed.toString('base64')}`,
      target: `data:image/png;base64,${target.toString('base64')}`, blank: `data:image/png;base64,${blank.toString('base64')}` };
    for (const mode of event.paired_order) {
      outcomes.push(await runEvent(page, event, mode, images));
      await writeFile(`${outputPath}.partial`, JSON.stringify({ started_at: started, source: before, manifest, outcomes }, null, 2));
    }
  }
  const after = await sourceSnapshot();
  const byMode = (mode: Mode): Outcome[] => outcomes.filter(outcome => outcome.mode === mode);
  const p95 = (mode: Mode): number | null => nearestRank(byMode(mode).filter(outcome => outcome.outcome === 'success').map(outcome => outcome.latency_ms!), .95);
  const controlP95 = p95('full_frame'), roiP95 = p95('auto_region');
  const lost = manifest.events.filter(event => outcomes.some(outcome => outcome.event_id === event.event_id && outcome.mode === 'full_frame' && outcome.outcome === 'success')
    && !outcomes.some(outcome => outcome.event_id === event.event_id && outcome.mode === 'auto_region' && outcome.outcome === 'success')).map(event => event.event_id);
  const report = {
    format: 'lumenlink-synthetic-reentry-results-v1', evidence: 'Synthetic software replay; no physical camera or adoption claim.',
    started_at: started, finished_at: new Date().toISOString(), browser_version: browser.version(),
    source_before: before, source_after: after, source_unchanged: before.source_sha256 === after.source_sha256,
    fixture_manifest_sha256: digest(manifestText), manifest,
    fixture_generator_sha256: digest(await readFile(resolve(ROOT, 'tools/generate_reentry_fixtures.py'))),
    replay_test_sha256: digest(await readFile(resolve(ROOT, 'web/e2e/reentry.spec.ts'))),
    oracle: 'Seed seq0 must admit with expected seed center and 64-symbol session; target seq1 is the only second symbol. Recovery requires unique_delta>0, recovered==2 and expected target center within unpadded accepted QR bounds mapped by the exact submitted drawImage transform. Start is actual video requestVideoFrameCallback performance.now; negative latency is an ordering_ambiguous failure, never clipped.',
    timing: { sampler: 'Unchanged production 33ms polling', target_timeout_ms: TARGET_TIMEOUT_MS, p95: 'Nearest rank, successful events only; every failed event retained.' },
    summary: { full_successes: byMode('full_frame').filter(outcome => outcome.outcome === 'success').length,
      roi_successes: byMode('auto_region').filter(outcome => outcome.outcome === 'success').length,
      cropped_attempts_by_mode: Object.fromEntries((['full_frame', 'auto_region'] as const).map(mode => [mode,
        byMode(mode).flatMap(outcome => outcome.scans).filter(scan => scan.capture !== null
          && (scan.capture.transform.crop_width < scan.capture.transform.source_width
            || scan.capture.transform.crop_height < scan.capture.transform.source_height)).length])),
      control_successes_lost_by_roi: lost, full_success_p95_ms: controlP95, roi_success_p95_ms: roiP95,
      p95_requirement_ms: controlP95 === null ? null : controlP95 + 250,
      p95_pass: controlP95 !== null && roiP95 !== null && roiP95 <= controlP95 + 250 },
    outcomes,
  };
  await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  try { await writeFile(resolve(outputDirectory, 'first-complete.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  await testInfo.attach('complete-reentry-dataset', { path: outputPath, contentType: 'application/json' });
  console.log(JSON.stringify({ dataset: outputPath, ...report.summary, failures: outcomes.filter(outcome => outcome.outcome !== 'success').map(outcome => ({ event_id: outcome.event_id, mode: outcome.mode, outcome: outcome.outcome, latency_ms: outcome.latency_ms, error: outcome.error })) }));
  expect(outcomes).toHaveLength(40);
  expect(report.source_unchanged).toBe(true);
  expect(lost, 'Every control success must remain a target recovery with ROI').toEqual([]);
  expect(report.summary.p95_pass, 'Successful-event nearest-rank p95 ROI must be <= full control p95 +250ms').toBe(true);
});
