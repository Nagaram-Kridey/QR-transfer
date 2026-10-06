# LumenLink implementation plan and execution status

The normative protocol is `docs/spec/SPEC-v2.md`. Shared vectors define byte-level expectations.
Public application versions and wire versions are separate. Work is staged; unchecked gates
must not be inferred from passing unit tests.

## Approval and review workflow

Follow [CHECKPOINTS.md](CHECKPOINTS.md). The user resumed work on 2026-10-05 and now requires a
reviewable phase/feature checkpoint, independent development/testing agreement, and explicit user
approval before commit/push and before the next checkpoint. CP-01 is trial-readiness correction;
CP-02 collects the physical Windows–Android evidence with the available devices. iPhone testing
remains pending for full v1. Feature approval cannot substitute for a physical or security exit.

## Stage 0 — Foundation

- [x] Initialize Git, preserve supplied documents, reconcile current planning documents.
- [x] Python 3.12 package/CLI, locked dependencies, MIT license and development tooling.
- [x] React/Vite/TypeScript strict project, npm lockfile, local decoder WASM.
- [x] Wire-v2 repeat profile, canonical manifest and shared positive/negative vectors.
- [x] CI configuration for Windows/Linux Python, browser engines, interoperability and audits.
- [x] Document prior art, threat assumptions and benchmark protocol.
- [x] Connect to the supplied Nagaram-Kridey/QR-transfer repository and retain its initial history.
- [x] Push verified work and run hosted CI (Windows/Linux Python, browser/interop and audits passed).

Exit: reproducible setup and passing checks. No camera or security claims.

## Stage 1 — Baseline and feasibility

- [x] Python Base45, bounded frame parser, canonical container, repeat sender/receiver.
- [x] Session locking, duplicate/conflict detection, safe filenames, no overwrite/auto-open.
- [x] CLI local QR display/capture, frame import/export, deterministic lossy-channel simulator.
- [x] Independent TypeScript codec and both-direction conformance checks.
- [x] Minimal browser harness: file/text, static/animated QR, camera, worker, verified download.
- [x] Permission errors, cancellation, first-send acknowledgement, ≤10 fps and 2 fps option.
- [x] Synthetic clean/degraded video regression through the actual WASM worker path.
- [x] CP-02A bounded observation recorder/per-cell summaries, independent review, approval and
  GitHub delivery (`d6b0a7b`; hosted Windows/Linux/browser/audit checks passed).
- [ ] CP-02B.1 full-frame browser diagnostics and bounded sidecar export (local checks passed;
  both final peer reviews PASS; user approved, delivery checks in progress).
- [ ] CP-02B.2 optional ROI prototype, only after CP-02B.1 approval.
- [ ] CP-02B.3 measured autoframing adoption/rejection; no assumed speed benefit.
- [ ] Retain user-reported both-direction smoke successes with measured exports/settings.
- [ ] Android Chrome and iPhone Safari physical camera smoke tests.
- [ ] Frozen 20-trial cells at 10 KiB and 100 KiB; record all outcomes.
- [ ] Evaluate and record G2; permit one eight-hour investigation for inconclusive results.

Exit: a physical feasibility decision. **Current handoff is at this gate.** Browser harness
controls exist to run the experiment; they do not establish a supported mobile product.

The user accepted the [autoframing experiment](docs/planning/AUTOFRAMING_PLAN.md) on October 6.
It has an eight-hour engineering cap (2 diagnostics, 3 tracking, 3 tests/docs), excludes physical
trial time, and preserves approval stops between CP-02B.1, CP-02B.2 and CP-02B.3. It does not bypass
G2 or grant a second eight-hour investigation if used as the existing G2 tuning allowance.

## Stage 2 — Early portfolio checkpoint

Dependency: physical gate passes Tier A or Tier B.

- [x] Configure GitHub repository/Pages and publish the warned feasibility harness for physical testing.
  This early deployment enables the experiment; it does not complete the Stage 2 performance gate.
- [ ] Tune only from exploratory measurements; freeze settings before acceptance runs.
- [ ] Record usable Python-receiver/browser-sender demonstration and verified README numbers.
- [ ] Package installation smoke test and honest résumé wording tied to raw evidence.

Keep this checkpoint within 4–5 weeks. Browser sender + Python receiver is acceptable; explicitly
defer the full browser receiver/PWA if required. No encryption or fountain claims.

## Stage 3 — Production browser receiving and PWA

Dependency: Stage 2 and supported-device evidence.

- [ ] Harden the harness lifecycle across real phone browsers, camera interruptions and saves.
- [ ] Add install manifest/icons and versioned service worker; precache WASM and worker assets.
- [ ] Display offline-ready only after every required runtime asset is available offline.
- [ ] Verify startup and bidirectional transfer with networking disabled on both phone platforms.
- [ ] Defer service-worker activation during an active transfer; provide explicit update UI.
- [ ] Add offline regressions and published performance measurements; maintain one image in flight.

Do not replace physical mobile checks with desktop WebKit emulation or Lighthouse scores.

## Stage 4 — Security and compression

Dependency: reliable browser transfer. Future reserved modes are rejected by the current build.

- [ ] Implement the exact PBKDF2/HKDF/AES-GCM profile in the wire spec in both languages.
- [ ] Share fixed salt/nonce/passphrase known-answer vectors and negative authentication vectors.
- [ ] Verify frame authentication before accepting symbols; one KDF per explicitly selected session.
- [ ] Bundle a licensed high-entropy wordlist and generate six words with CSPRNG selection.
- [ ] Hide passphrase during playback; do not place it in QR data, URLs, logs or exports.
- [ ] Add zlib-wrapped DEFLATE of file bytes only; streaming decompression bounded by size/cap.
- [ ] Cross-decode compression outputs; do not require different compressors to emit equal bytes.
- [ ] Test wrong passphrases, changed metadata, bombs, resource exhaustion and malicious names.
- [ ] Publish threat model and KDF device timings; make encryption default only after this exit.

## Stage 5 — Optional shipping LT transport, mandatory bounded study

Dependency: prior stages. Maximum research/port budget 30 hours.

- [ ] Freeze FNV-1a input as session bytes + big-endian seq; unsigned Mulberry32 operations.
- [ ] Generate CDF per k=1..2048, c=0.1, delta=0.5; k=1 is degree one. Check in tables and checksum.
- [ ] Encode CDF thresholds as inclusive u32 (final 0xffffffff), select first threshold ≥ random u32.
- [ ] Specify partial Fisher–Yates order/rejection sampling and boundary vectors before the port.
- [ ] Peeling first; at most 2k live equations. Gaussian fallback only for ≤64 unresolved symbols,
  at most once per 32 admitted droplets, with 16 million cumulative symbol-byte XOR operations.
- [ ] Compare equal display opportunities, random/burst loss, delayed start, duplicates and reorder.
  Use a finite transmission budget; report total displayed frames and failures, not just unique frames.
- [ ] Adopt only under PROJECT_PLAN criteria; port and cache the ~8 MiB tables only if adopted.
- [ ] Publish the result, including a negative result. If time expires, ship repeat and stop the study.

## Stage 6 — Release

- [ ] Link Lab with local JSON export; no telemetry.
- [ ] Twenty trials per required direction/device/settings cell; all failures retained.
- [ ] Full two-device-pair gate, installation/offline acceptance and security claims audit.
- [ ] Verify PyPI name, clean install, release metadata and publishing identity.
- [ ] Tag v1.0.0 only after all required evidence; publish package and Pages build.
- [ ] Demo video, limitations, interview-ready ADRs and measured résumé bullets.

## Local verification

From the repository root:

```powershell
uv sync --project python --locked
uv run --project python ruff check python/src python/tests
uv run --project python mypy python/src
uv run --project python pytest python/tests --cov=lumenlink --cov-config=python/pyproject.toml
uv run --project python python tools/generate_vectors.py --check
npm --prefix web ci
npm --prefix web run lint
npm --prefix web run typecheck
npm --prefix web run test:coverage
npm --prefix web run vectors:emit
uv run --project python python tools/verify_ts_vectors.py
uv run --project python python tools/generate_camera_fixtures.py
npm --prefix web run build
```

From `web/`, install Playwright browsers with `npx playwright install chromium firefox webkit`,
then run `npm run e2e`. Linux CI additionally installs browser system dependencies.
