# LumenLink: next-model handoff

Snapshot: **2026-10-07, Asia/Kolkata (IST)**. Read this before continuing the project.
This document explains the existing implementation and the next steps; it does not replace the
protocol specification or the execution checklist. Refresh it after meaningful progress.

## 1. Where work stopped

Latest task on October 7: **CP-02C larger-file capacity is approved; delivery is in progress.** Base
`6cd5d925adc1251cffbc90099010f1ec525f802b`. Requested scope is a bounded 5 MiB original-file maximum,
8192 repeat symbols and consistent bounded frame imports/usable encoding controls. Read ADR 004
and the current spec. Separate development/testing agents own source and regressions; final
same-revision agreement and explicit user approval must precede commit/push/Pages. Supplied camera
exports match by SHA-256 and record one 859.318 KiB full-frame success; they provide no ROI comparison
or qualified 20-trial cell. Exact original inputs remain local/ignored.
Both reviews agree PASS on the 22-path fingerprint
`9836cda788f8b43884907fe016c54921106036f071a140b73c5509052f6c129d`. The checkpoint packet lists
actual checks and records the user's explicit **"Approved"** on October 7 for commit/push and
Pages deployment after hosted CI. Deliver the frozen part, verify actual outcomes and update this
handoff. No source/test changes are pending, and no new physical qualification is claimed.

**CP-02B.2 has passed combined same-revision review and is deployed for manual testing.** Base
`8fad984`. Reviewed implementation commit `19b5ca3` and workflow correction `e637cdf` are on
`main`; hosted CI and Pages passed. Live URL: https://nagaram-kridey.github.io/QR-transfer/.
The request covers the
opt-in tracker plus browser 15/20/30 fps experimental targets and related exploratory-only benchmark
recording. It does not authorize ROI adoption, G2 or later stages. CP-02B.3 still needs physical data.

The prototype retains full-frame default, admission-only native-coordinate crops, two-miss/500 ms
recovery, independent one-second full probes, one decode in flight, outline/stale-geometry isolation
and separate diagnostic-v2 exports. Observation-v1, CSV, codecs and wire bytes remain unchanged.
The sender retains default 8 fps and standard 2/4/8/10 rates; higher targets require both normal
flashing consent and a rate-specific acknowledgement reset when the rate changes. Python camera
adapters still cap playback at 10. The benchmark tool accepts only 15/20/30 above 10 for exploratory
rows, rejecting acceptance promotion through normalize/read/summarize paths.

Two complete actual-worker/WASM replays each retained all 40 outcomes: **14/20 recovered in each
mode**, with six shared decoy timeouts R15–R20, zero control-success loss and the +250 ms p95 criterion
passing. First successful-event p95: full 53.8 / auto 133.9 ms; final camera run: full 42.1 / auto
109.7 ms. Auto mode genuinely cropped 540/590 attempts respectively. These are target-reentry
software results, not whole-file throughput, 20 successful events, decoy rescue or phone qualification.
Compact datasets and the fixed landscape manifest are under `docs/benchmarks/software`; portrait
behavior has separate geometry/mocked lifecycle regressions. Decoder options remain unchanged.

Current checks reported: 310 Python tests (213 benchmark), 123 Vitest (codec-only coverage 100%),
Ruff/format/mypy/lint/types/build/vector checks; 60 camera/harness cases plus actual replay passed
(61 passes, two non-Chromium replay skips), then 21 cross-engine sender cases passed for the rate
addition. The receiver function is byte-identical across that sender addition. Final project-base
smoke passed; implementation `19b5ca3`, workflow correction `e637cdf` and log update `4153c27` are
pushed, hosted CI and Pages passed, and the live URL is ready for manual testing. No physical
benefit or adoption is claimed.

Budget: B2 began 00:45:30 IST, paused at 00:57:56 and explicitly resumed at 07:52:41 October 7.
Exclude the user pause from the eight-hour engineering cap (2 diagnostics, 3 implementation,
3 testing/docs); physical trials and approval waits are separate. These clock intervals are automation
wall time, not measured human engineering effort. Do not grant another tuning allowance for rates.

CP-02B.1 is already approved/delivered as `6fb59f3`, with passing CI/Pages and both independent live
reviews; administrative delivery notes `8fad984` also passed CI. Its historical review fingerprint
and reports are in CHECKPOINTS.md. Current live Pages still serves that full-frame diagnostics build.

**Stage 1 software is implemented. The physical feasibility gate is still pending.** The repository
contains an independent Python/TypeScript plaintext repeat-mode implementation, a CLI, a minimal
browser sender/receiver harness, automated tests and a deployed GitHub Pages experiment.

The user has now resumed application work and requested explicit approval checkpoints plus separate
development and adversarial-testing agents. Follow [CHECKPOINTS.md](CHECKPOINTS.md): build locally,
resolve confirmed issues with both agents' agreement on the same revision, then wait for user approval
before commit/push or starting the next checkpoint. CP-01 corrects existing trial-readiness defects;
physical G2 evidence remains the next phase dependency. CP-01 code `be174e1` is pushed/deployed and
passed hosted CI plus independent development/testing live checks. The user now reports both-direction
physical smoke success and supplied one browser timeout report (60.0165 seconds, 434/506 symbols).
Successful measured exports and 20-trial acceptance cells are still missing. CP-02A observation
recording/per-cell summaries passed both agent reviews, were explicitly approved on 2026-10-05 and
are delivered as `d6b0a7b` with all hosted CI jobs passing. CP-02A changed no browser code.
CP-02B.1 browser diagnostics `6fb59f3` is pushed/deployed with CI/Pages/live verification passing.
Consult CHECKPOINTS.md and UPDATE.md for actual Git/CI outcomes.
Reported hardware is Windows 10 + Samsung A17 5G / Android 16; this workspace instead reports
Windows 11 build 26200 / Lenovo 83K1, so the selected computer needs clarification. Chrome/camera
details remain to record. No iPhone availability or qualifying acceptance results have been recorded.
Full v1 still needs both device pairs.

| Item | Snapshot |
|---|---|
| Workspace | `C:\Users\NAGARAM KRIDEY\Desktop\QR Project` |
| Authorized repository | [Nagaram-Kridey/QR-transfer](https://github.com/Nagaram-Kridey/QR-transfer) |
| Git remote | `https://github.com/Nagaram-Kridey/QR-transfer.git` |
| Branch at current handoff | `main` at `6cd5d92`; CP-02C local work, CP-02B.2 deployed |
| Implementation commit | `8eb1d1c` — wire-v2 plaintext feasibility build |
| CP-01 review base | `d40966e` — complete handoff and delivery log |
| Latest delivered Python code | `19b5ca3` — exploratory rate recording; CP-02C capacity still local |
| Deployed browser code | `e637cdf` — autoframing/manual-test build and Pages fixture correction |
| Original history retained | `c25d645` — initial commit; no history rewrite |
| Hosted experiment | [GitHub Pages harness](https://nagaram-kridey.github.io/QR-transfer/) |
| Application versions | Python `0.1.0.dev0`; browser `0.1.0-dev.0` |
| Wire / manifest versions | Wire `2`; manifest schema `1` |
| Release status | No v1 release, PyPI publication or physical support qualification |

Commit IDs above are historical anchors, not instructions to reset the repository. Inspect Git on
arrival. The baseline was deployed and checked on **2026-10-04**. Fresh October 5 CP-01 local
acceptance results are recorded in [CHECKPOINTS.md](CHECKPOINTS.md) and the independent review
reports. The user approved CP-01 on October 5; code `be174e1` passed hosted CI, Pages and both
independent live reviews. Consult CHECKPOINTS.md and the latest UPDATE.md entry for links/status.
Those synthetic software checks did not clear physical G2.

## 2. Read order and source of truth

1. [AGENTS.md](AGENTS.md): working rules, authorized remote and logging obligations.
   Read [CHECKPOINTS.md](CHECKPOINTS.md) for the current approval requirement and review queue.
2. [CONTEXT.md](CONTEXT.md): purpose, constraints and durable implementation invariants.
3. [UPDATE.md](UPDATE.md): current summary and latest dated entries. Earlier entries are historical;
   their temporary blockers may have been resolved by later entries.
4. [PROJECT_PLAN.md](PROJECT_PLAN.md) and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): accepted
   scope, dependencies, gates and actual checklist status.
5. [Wire-v2 specification](docs/spec/SPEC-v2.md) and [shared vectors](vectors/repeat-v2.json): normative
   byte contract. Read both before changing either codec.
6. [Architecture](ARCHITECTURE.md), [benchmark procedure](docs/benchmarks/README.md),
   [threat model](docs/threat-model.md), [risks](RISKS.md) and [verification record](docs/verification/2026-10-04.md).

The user's current instructions govern the task. This handoff is a snapshot, not permission to
override a gate or alter the wire contract. Resolve discrepancies explicitly. Preserve
[original planning inputs](docs/planning/original/) as historical documents; do not restore their
obsolete wire-v1 assumptions or dangling product pivots. Record costly decisions in `docs/adr/`.

## 3. What the project is intended to deliver

LumenLink transfers small files through animated QR codes without a network transfer channel.
The sender displays symbols repeatedly; a camera receiver collects them, reconstructs the file,
checks integrity and saves verified bytes. There are no acknowledgements. Sender counters cannot
know receiver completion. Python protocol engineering and interoperability are the portfolio focus;
the channel itself is prior art, documented in [prior-art.md](docs/prior-art.md).

Accepted effort is 15–20 hours per week. The early portfolio target is 4–5 weeks / approximately
60–80 hours; complete v1 is approximately 150–210 hours total / 8–14 weeks. These are planning
budgets, not a claim that elapsed time or completed work has been measured against them.

| Stage | Intended result and dependency | Current position |
|---|---|---|
| 0 — Foundation | Repository, locked toolchains, spec, vectors, checks and documentation | Complete; hosted CI passed |
| 1 — Baseline and feasibility | CLI + independent browser harness, then physical phone trials and G2 decision | Software complete; physical evidence pending |
| 2 — Portfolio checkpoint | After a qualifying gate: measured browser-sender/Python-receiver demo, evidence and accurate README | Harness hosted early to enable trials; checkpoint incomplete |
| 3 — Browser workflow | After feasibility: production camera lifecycle, verified saving, installation and offline PWA | Not implemented beyond experimental harness |
| 4 — Security/compression | After reliable browser transfer: interoperable encryption, frame authentication, passphrases and bounded compression | Reserved design only |
| 5 — Fountain study | After preceding stages: bounded LT-versus-repeat experiment and transport ADR | Not started; 30-hour total study/port budget |
| 6 — Release | Link Lab, both directions on two device pairs, audits, PyPI, tagged release and evidence | Not started |

Early scope can remain **browser sender + Python receiver**. Full v1 needs browser send/receive,
offline installation, encryption by default, compression, Windows–Android and Windows–iPhone
qualification in both directions, Link Lab and package publication. No backend, accounts, telemetry,
transfer uploads, native mobile apps, receiver-key exchange, color codes or YOLO are in v1 scope.

## 4. What is implemented and where to find it

| Area | Files / interface | Existing behavior |
|---|---|---|
| Python protocol | [base45.py](python/src/lumenlink/base45.py), [frame.py](python/src/lumenlink/frame.py), [container.py](python/src/lumenlink/container.py), [repeat.py](python/src/lumenlink/repeat.py) | Camera-independent encoding/parsing, canonical manifests, bounded repeat reconstruction |
| Python API | `prepare_container`, `open_container`, `pack_frame`, `unpack_frame`, `encode_frame`, `decode_frame`, `Transfer`, `Receiver` | Incremental `Receiver.ingest` yields a verified `ReceivedFile` or `None`; `reset` abandons the active session |
| Python optical / CLI | [qr_io.py](python/src/lumenlink/qr_io.py), [cli.py](python/src/lumenlink/cli.py) | Segno display, OpenCV capture, zxing-cpp decode; `send`, `receive`, `simulate`; bounded JSON import/export |
| Simulation | [sim.py](python/src/lumenlink/sim.py) | Seeded loss, bursts, duplicates, reordering and finite transmission budgets; software model only |
| Independent TypeScript codec | [core.ts](web/src/codec/core.ts) | Equivalent containers/frames/transfer/receiver using asynchronous hashes; serialized ingestion required; new receiver resets state |
| Browser optical worker | [receiver.worker.ts](web/src/workers/receiver.worker.ts), [messages.ts](web/src/workers/messages.ts) | Local zxing-wasm decoding and receiver state; current input messages are `start`, `image`, `texts`; outputs include progress/completion/errors |
| Browser harness | [App.tsx](web/src/ui/App.tsx), [style.css](web/src/ui/style.css) | File/text preparation, QR playback/pause/settings, camera alignment/start/cancel, verified explicit download and local observation export |
| Shared conformance | [repeat-v2.json](vectors/repeat-v2.json), [generate_vectors.py](tools/generate_vectors.py), [emit-vectors.ts](web/scripts/emit-vectors.ts), [verify_ts_vectors.py](tools/verify_ts_vectors.py) | Python fixture reproduction plus independent TS-to-Python transfers |
| Automated tests | [Python tests](python/tests/), [codec tests](web/src/codec/core.test.ts), [browser tests](web/e2e/) | Properties, malformed inputs, boundaries, session conflicts, camera errors and synthetic video decoding |
| Experiment preparation | [make_trial_payloads.py](tools/make_trial_payloads.py), [benchmark procedure](docs/benchmarks/README.md), [CSV header](docs/benchmarks/trial-template.csv), [CP-02A contract](docs/benchmarks/CP-02A-CONTRACT.md) | Public fixtures, one raw timeout, approved/delivered CP-02A evidence tooling; no qualifying physical results |
| Delivery | [CI workflow](.github/workflows/ci.yml), [Pages workflow](.github/workflows/pages.yml) | Windows/Linux Python, browser/interoperability/audit checks; manual Pages publication |

Maintain separation between protocol, optical adapters and UI. Keep the two codecs independent;
sharing fixtures does not mean calling Python from the browser codec. QR pixel layouts need not match.
The receiver admits one active session and the camera pipeline keeps one image in flight. Worker
message types above describe the existing harness, not completion of the later production-worker API.

### Wire details that must not be accidentally changed

- QR text is exact RFC 9285 Base45. Spaces are valid data: never trim or normalize decoded QR text.
- Current flag byte is exactly `0x24`: version 2 plus repeat mode. Unsupported modes/reserved bits
  are rejected. The 27-byte header contains flags, a 16-byte random session ID, container length
  (`u32`), symbol size (`u16`) and sequence (`u32`), all integers big-endian.
- A frame is `header | S symbol bytes | 8-byte checksum`, exactly `35 + S` bytes. The current
  checksum is the first eight SHA-256 bytes of header plus symbol. It is **not authentication**.
- Repeat source index is `seq % k`, where `k = ceil(container_length / S)`. Final padding must be
  zero. Session metadata is fixed; changed container or encoding mode/symbol size creates a new
  session. Pause/resume preserves it. FPS/display-only changes do not change wire metadata.
- The plaintext container is `u16 manifest_length | canonical UTF-8 JSON | file bytes`. Manifest
  order is `name,mime,size,sha256,created,v`; compact JSON, integer Unix seconds and schema `v=1`.
  Reject duplicate/extra/missing keys, noncanonical serialization, truncation and trailing bytes.
- CP-02C experimental file maximum is 5 MiB, manifest 4 KiB, symbol 1,024 bytes, repeat source
  symbols 8,192 and QR text 1,589
  characters. Validate overhead and `k` before transmission; the default 256-byte symbol cannot
  carry a maximum-size file within that source-symbol cap. Use the spec's exact container bounds.
- Verify original size and SHA-256 before exposing a result. Normalize/sanitize received filenames,
  prevent traversal and accidental overwrites, and never auto-open files. Python saves with exclusive
  creation/collision suffixes; browser saving is an explicit download action.
- A wire-format change needs a version decision and new positive/negative vectors. Application,
  wire and manifest versions are distinct.

### Deliberately unfinished

No encryption, passphrase UI/wordlist, PBKDF2/HKDF, AES-GCM, frame HMAC or compression is implemented.
The spec reserves the future security profile; it is not evidence that secure transfer works.
Keep every current build labeled **plaintext** until the entire Stage 4 exit passes.

There is no install manifest/service worker or offline cold-start guarantee. A warmed, already-open
page may transfer with networking disabled. Local WASM hosting is implemented, but caching all
runtime assets and the offline-ready indicator are later work. Desktop WebKit and synthetic camera
tests do not qualify iPhone Safari. No physical throughput, reliability or 1 MiB optical claim is valid.

LT coding/CDF assets, bounded Gaussian recovery, Link Lab, final demonstration, PyPI publication and
v1 tagging are also unfinished. The Stage 2 package-installation/résumé checklist item is combined:
installation was tested on October 4, but measured résumé/demo evidence is still missing.

## 5. Evidence already recorded

The [2026-10-04 verification record](docs/verification/2026-10-04.md) is the detailed baseline source.
These are **historical October 4 results**. Read [CHECKPOINTS.md](CHECKPOINTS.md) and its linked
reviews for the fresh CP-01 acceptance results; local checks do not establish hosted or physical support:

- 87 Python tests and 30 TypeScript tests passed; protocol coverage was 100% in both languages.
  The Python protocol threshold excludes CLI, QR I/O and simulation; do not call this whole-project
  100% coverage. The required protocol threshold remains at least 90%.
- Both fixture directions were checked, including four independently generated TS transfers
  reconstructed in Python. Ruff/format/mypy, ESLint/type checks and production build passed.
- 17 Playwright tests passed: UI paths across Chromium/Firefox/WebKit and clean/degraded Chromium
  fake-camera feeds through the actual QR/WASM worker. Generated recordings are not field trials.
- Wheel/sdist build and isolated package/CLI installation passed. Dependency audits reported no
  known vulnerabilities on that date; the unpublished local package was not a PyPI audit entry.
- [Hosted CI](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37196930373) and
  [Pages deployment](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37196947717) passed
  for implementation commit `8eb1d1c`.
- The deployed HTTPS page returned 200, passed an exact-byte export/import/download smoke test,
  and showed no page errors or cross-origin requests during that check. Desktop and 390-pixel
  mobile layouts were inspected. This was not a physical optical transfer.

## 6. Resume and reproduce locally

Use PowerShell from the repository root. Read-only arrival checks first:

```powershell
Get-Location
git status --short --branch
git remote -v
git log -5 --oneline
node --version
uv --version
```

Provision/use Python **3.12** and Node **24**; do not silently substitute the machine's default
interpreter or regenerate locks with another Node major. The October 4 environment was Python
3.12.13 / Node 24.21.0. `.python-version`, `.node-version`, `python/uv.lock` and
`web/package-lock.json` define the intended reproducible setup.

```powershell
uv python install 3.12
uv sync --project python --locked
uv run --project python python --version
npm --prefix web ci
uv run --project python lumenlink --help
npm --prefix web run dev
```

The last command runs the development server until stopped. Use another terminal for CLI work.
Phone camera tests need the HTTPS Pages build; a plain HTTP LAN URL is not phone localhost.

For public trial fixtures and a Windows receiver:

```powershell
uv run --project python python tools/make_trial_payloads.py
uv run --project python lumenlink receive --camera 0 --out ./received --timeout 60 --report ./artifacts/trial-001.json
```

Fixtures and their hash manifest are in ignored `artifacts/trial-payloads/`. Select the correct local
camera index. Enable/align the preview, then press Space to start processing/timing; Esc cancels.
Use a unique report filename for each trial because reports are exclusive creates. For 100 KiB,
use `--timeout 300`. The sender must already be running before timing starts.

For the opposite direction, with the phone browser receiving:

```powershell
uv run --project python lumenlink send ./artifacts/trial-payloads/trial-10KiB.bin --symbol-size 256 --fps 8 --ecc M --acknowledge-flashing
```

Space pauses the sender, Esc stops it; the browser receiver enables its camera, aligns, then starts
receiving. Use 2 fps if needed for reduced flashing; no rate is guaranteed safe for photosensitivity.
Load runtime assets before disabling networking. JSON frame import/export and `simulate` are useful
for software diagnosis only; their commands are in [README.md](README.md).

### Checks after implementation changes

Run relevant checks for the touched components, then the integration checks for protocol changes.
The full baseline command list is in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md); CI is the
executable reference. Protocol changes need both encoders, both decoders and the shared vectors.

```powershell
uv run --project python ruff check python/src python/tests
uv run --project python ruff format --check python/src python/tests
uv run --project python mypy python/src
uv run --project python pytest python/tests --cov=lumenlink --cov-config=python/pyproject.toml
uv run --project python python tools/generate_vectors.py --check
npm --prefix web run lint
npm --prefix web run typecheck
npm --prefix web run test:coverage
npm --prefix web run vectors:emit
uv run --project python python tools/verify_ts_vectors.py
uv run --project python python tools/generate_camera_fixtures.py
uv run --project python python tools/generate_reentry_fixtures.py
npm --prefix web run build
```

`vectors:emit` must run before `verify_ts_vectors.py`. Generate camera fixtures before camera E2E.
From `web/`, run `npx playwright install chromium firefox webkit`, then `npm run e2e`; Linux CI adds
`--with-deps` during installation. For packaging/dependency changes also run `uv build --project python`,
the isolated wheel-install check from CI, `uv run --project python pip-audit` and
`npm --prefix web audit --audit-level=high`. CI's wheel filename includes the package version; update
that reference when intentionally changing the version. Documentation-only edits need accurate
links, status and diff checks, not an invented fresh application-test result.

## 7. Exact next physical checkpoint work (CP-02)

Begin this checkpoint after CP-01 agreement, user approval and delivery. Physical observations need
the user's devices; the camera tests below cannot be completed remotely without those observations.

1. Confirm available Windows/Android/iPhone hardware and versions. Review the latest repo/log state
   and the physical benchmark procedure before collecting evidence. Hardware/observations are the
   outstanding dependency; do not replace them with generated results.
2. Smoke-test physical Android Chrome and iPhone Safari camera access, alignment, cancellation,
   completion and saving. Keep exploratory observations separate from frozen acceptance cells.
3. Generate the public fixtures, record the tested code commit, and choose/freeze the complete cell:
   device pair, direction, payload hash/bytes, OS/browser/app versions, symbol size, FPS, ECC, distance
   and lighting. Defaults for exploration are 256-byte symbols, ECC M, 8 fps and 20–30 cm separation.
4. Run 20 trials per direction/settings cell. Start processing only when an aligned receiver faces
   an already-running sender; stop after verification. Keep failure, timeout and cancellation rows.
   The timeout is `max(60 seconds, 3 * payload_KiB seconds)`. Reset between trials.
5. Export observations and add metadata using [trial-template.csv](docs/benchmarks/trial-template.csv).
   Commit non-sensitive physical evidence under `docs/benchmarks/`; do not commit received payloads,
   generated videos or the ignored `artifacts/` directory. Keep original and repeated acceptance runs.
6. Calculate successes/20, failure reasons, successful-trial median/p95 time and original-file KiB/s,
   explicitly labeling successful-only statistics. Record the G2 decision before changing claims.

| Decision | Required evidence | Continuation |
|---|---|---|
| Tier A | At least 18/20 at 100 KiB; median successful rate at least 1 KiB/s | Continue with measured small-file claims |
| Tier B | A fails; at least 18/20 at 10 KiB and at least 0.5 KiB/s | Restrict scope to small files/configuration; no secrets claim before security |
| Inconclusive | 16–17/20 at 10 KiB or reliability passes but rate misses Tier B | One eight-hour tuning investigation, then repeat a frozen run |
| Stop expansion | Fewer than 16/20 at 10 KiB or Tier B unmet after investigation | Preserve library, simulator, measurements and engineering write-up |

Never pool directions/devices/settings or omit failures. One pair establishes initial feasibility;
v1 requires both directions on Windows–Android and Windows–iPhone. Report 18/20 as observed success,
not a population reliability guarantee. If hardware is unavailable, record the dependency and leave
the gate pending; do not mark later stages complete or silently pivot to another product.

## 8. How implementation continues after the gate

Follow the unchecked work in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), in dependency order:

- **Portfolio:** qualify the tested direction, record the short demo, publish raw evidence, and align
  README/résumé statements to it. Existing deployment is an experiment, not proof of the checkpoint.
- **Browser/PWA:** harden actual phone lifecycle/permissions/interruption/cancellation/saving; add
  installation assets and a versioned service worker, cache all local workers/WASM/runtime assets,
  verify offline readiness and defer service-worker activation while transfers are active. Test
  installed/offline operation on physical Android and iPhone, including cold-start.
- **Security/compression:** implement the reserved spec in both languages with fixed known-answer
  and negative vectors. PBKDF2-SHA256 uses 600,000 iterations and the 16-byte session salt after NFC
  passphrase normalization; HKDF separates keys. AES-256-GCM uses a fresh 12-byte nonce and 16-byte
  tag, with immutable header-prefix AAD. Authenticate frames before admission using the first eight
  HMAC-SHA256 bytes. Derive once per explicitly selected session. Bundle a licensed high-entropy
  wordlist, select six words cryptographically and hide phrases during playback. Compress file
  bytes only with zlib-wrapped DEFLATE and bound authenticated decompression. Exact labels, byte
  layouts and limits are in the spec; do not improvise them from this summary. Make encryption
  default only after the complete milestone passes; plaintext then requires explicit opt-in.
- **Fountain study:** time-box implementation/comparison/port to 30 hours. Freeze deterministic
  FNV-1a/Mulberry32/CDF/neighbor vectors first; bound equations to `2k`, Gaussian fallback and CPU
  work as specified in the plan. Adopt only with at least 15% median improvement, no observed
  success reduction, no more than 10% p95 regression and an acceptable conformant browser port.
  Otherwise ship repeat and publish the negative/inconclusive ADR. No additional coding-family
  investigations in this release; load/cache the approximately 8 MiB CDF asset only if LT ships.
- **Release:** finish Link Lab, required physical/offline/security evidence, clean install and audits,
  confirm the distribution name, and publish/tag only when the checklist passes. MIT is the default.
  Review every README/demo/résumé claim against the recorded implementation and measurements.

## 9. Change, log and delivery workflow

Inspect local changes before editing and preserve others' work. Keep work in small reviewable units.
For each meaningful update, record **Done / Verified / Next / Blockers** in [UPDATE.md](UPDATE.md),
dated in Asia/Kolkata. State commands/results actually observed, distinguishing historical evidence,
untested assumptions and failed checks. Update the implementation checklist only when its exit is
satisfied; refresh this handoff when the stop point or setup changes.

The user requires explicit approval of each phase/feature checkpoint before it is committed/pushed.
This supersedes the earlier standing push permission. The user also requires the update log after
every meaningful change. Preserve history and inspect the staged diff; never force-push as routine cleanup.
Do not stage credentials, received files, virtual environments, `node_modules`, build products,
generated videos or `artifacts/`. After both agents' signoff and explicit user approval, commit the
reviewed source/docs/evidence and push the intended branch
and report actual push/CI status. If a check or authentication fails, record it rather than claiming
delivery. Do not reset to the historical commits in this document.

CI runs on pushes and pull requests. Pages uses **manual `workflow_dispatch`** in
`.github/workflows/pages.yml`; a push alone does not redeploy the app. For an intended app deployment,
use that workflow's GitHub project-base configuration, then verify the live `/QR-transfer/` worker,
WASM and asset URLs. A documentation-only handoff does not need a Pages redeployment. Keep the
HTML CSP and its documented GitHub Pages header limitations explicit; do not introduce runtime CDNs.

### Starter instruction for the next model

> Read AGENTS.md, CONTEXT.md, MODEL_HANDOFF.md, the latest UPDATE.md entries and
> IMPLEMENTATION_PLAN.md. Inspect Git status/history before editing. The software is a plaintext
> Stage 1 feasibility build; physical G2 trials are pending. Work is resumed with approval checkpoints
> in CHECKPOINTS.md: develop and test independently, agree on the final revision, then stop for user
> approval before committing/pushing or starting the next checkpoint. Use SPEC-v2.md and shared
> vectors as the wire contract, keep Python/TypeScript independent, and do not substitute simulation
> for phone evidence. After CP-01 approval/delivery, follow the physical benchmark procedure and
> document actual results. Windows + Android is available; v1 still needs iPhone evidence. Update UPDATE.md after
> each meaningful change, preserve repository history, and push only the explicitly approved part
> to Nagaram-Kridey/QR-transfer without committing private/generated artifacts.
