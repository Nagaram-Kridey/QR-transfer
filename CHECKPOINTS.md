# LumenLink approval checkpoints

Effective **2026-10-05 (Asia/Kolkata)**. The user resumed implementation and requested development
and independent adversarial testing, with approval before each checkpoint is pushed to GitHub.
This supersedes the previous standing permission to push new changes automatically.

## Working agreement

Build one reviewable feature at a time. Stop at each feature checkpoint and each phase exit; do not
start the next checkpoint, commit/push the submitted changes, deploy or publish while approval is
pending. Local implementation and testing are authorized so that approval concerns a concrete result.
User approval applies only to the named checkpoint and the presented revision. A request to revise
it returns it to development/testing; silence, elapsed time and an agent's signoff are not approval.

After explicit approval, commit the reviewed changes and log the approval, push them to
`https://github.com/Nagaram-Kridey/QR-transfer.git`, then inspect hosted checks. Report actual delivery
status. Deployment is a separate action: Pages is manually dispatched and an approved code push
does not itself redeploy it. State any planned deployment in the approval packet. Never force-push or
include private/generated transfer artifacts. If delivery/checks fail, record the failure and repair
the reviewed scope; materially different behavior needs a fresh approval checkpoint.

## Development and testing challenge

- **Development agent:** implement the bounded change, explain decisions, run component checks,
  review testing findings and fix reproduced defects. Own application source files.
- **Testing agent:** independently inspect behavior and boundaries, attempt adverse interactions,
  write meaningful regressions for confirmed issues, and retest fixes. Own regression test files.
- **Coordinator:** define the scope and acceptance checks, arbitrate evidence, maintain current
  documents/logs, run integration checks, and present the review packet. The coordinator cannot
  override an unresolved finding or invent either agent's agreement.

Both agents exchange concrete reproductions and counterexamples. Each must inspect the same final
revision and explicitly agree that all confirmed issues in scope are resolved and no known blocking
issues remain. Each records its own verdict, checks and limitations under `docs/reviews/`.
If either disagrees, continue the fix/retest cycle and keep the checkpoint unapproved. Verification
is scoped evidence, not a guarantee that no undiscovered bug exists. Missing physical evidence must
remain visible; it cannot be relabeled as an automated pass or hidden as a deferred software issue.

## State transitions

`building → independent review → awaiting user approval → approved → committed/pushed → delivery verified`

Failures return to development/review. After submission, freeze application changes while awaiting
approval. If anything material changes, update the packet and obtain both agents' fresh verdicts
before requesting approval again. UPDATE.md records the actual state after every meaningful update.

## Checkpoint queue

The existing [implementation plan](IMPLEMENTATION_PLAN.md) remains the stage/gate contract. The
queue below breaks it into approval units; approval does not bypass an unmet dependency.

| ID | Reviewable part | Required evidence / dependency | State |
|---|---|---|---|
| CP-01 | Stage 1 trial-readiness fixes and this approval workflow | Reproduced lifecycle/reporting fixes, regressions, both agent signoffs; no wire change | Approved and delivered as be174e1; CI, Pages and both live reviews passed |
| CP-02 | Physical Windows–Android feasibility and G2 decision | Real Chrome/camera smoke checks and frozen 20-trial cells; all failures retained | In progress: awaiting computer identity and real smoke observations |
| CP-02A | Observation recorder and per-cell benchmark summaries | Independent dev/test agreement, strict metadata/provenance boundaries, retained failures | Approved/delivered as d6b0a7b; all hosted CI jobs passed |
| CP-02B.1 | Browser full-frame diagnostics | Bounded exports, exact observation linkage, lifecycle regressions, both reviews | Approved/delivered as 6fb59f3; CI, Pages and both live reviews passed |
| CP-02B.2 | Experimental browser autoframing and requested exploratory sender rates | CP-02B.1 delivery; bounded ROI/replay plus combined dev/test agreement | Reviewed, pushed and Pages-deployed for manual testing; full-frame default |
| CP-02B.3 | Autoframing adoption decision | CP-02B.2 approval; frozen physical comparisons and replay results | Pending actual evidence; G2 remains separate |
| CP-02C | Bounded larger-file capacity | Consistent Python/browser limits, oversized-input rejection, independent conformance and both reviews | Approved/delivered as c451a1a; CI, Pages and both independent live reviews passed |
| CP-02D | Throughput debate/plan and QR framing visibility | Agreed debate, bounded sender/preview change, quiet-zone/geometry/optical regressions and both reviews | User approved October 8; frozen commit/push/CI/Pages delivery in progress |
| CP-02E (proposed) | Verified-throughput investigation | Fresh opportunities/missing-tail evidence, frozen contract, budget and explicit approval | Planning only; not authorised by plan inclusion |
| CP-03 | Stage 2 portfolio checkpoint | Qualifying physical gate, measured demo, documented limits and install evidence | Pending G2 |
| CP-04 | Stage 3 production receiver lifecycle | Physical phone permission/interruption/cancellation/save checks plus regressions | Pending portfolio checkpoint |
| CP-05 | Stage 3 offline PWA and phase exit | Cached workers/WASM, update deferral, installed offline cold-start on supported phones | Pending receiver readiness; iPhone qualification still needed |
| CP-06 | Complete Stage 4 security/compression | Independent crypto vectors, bounded compression, passphrases, adversarial checks and full security exit | Pending reliable browser workflow |
| CP-07 | Stage 5 bounded fountain experiment and transport decision | Matched comparison, conformance, resource limits and ADR; repeat fallback | Pending preceding stages; 30-hour study budget |
| CP-08 | Stage 6 Link Lab | Local measurements/export and independent verification | Pending preceding stages |
| CP-09 | v1 release and publication | Two physical device pairs/both directions, offline/security evidence, package and claims audit | Pending all exits and iPhone availability |

Add a named subcheckpoint before building any distinct feature, risky change or expansion of these
units. Each phase exit still gets an explicit decision even when its features have been approved.
Do not skip missing phone evidence to fill the queue. If G2 fails, the checkpoint documents the stop
decision and preservation of the engineering work; it does not authorize later product expansion.

## Completed review packet and delivery: CP-01

Base: `d40966e` on `main`. The user approved this reviewed part on 2026-10-05; delivery is verified.
Scope is existing camera/import cancellation, interruption and outcome-recording correctness plus
the requested approval/agent workflow. The wire contract, security/PWA status and physical gates
remain governed by the existing plans.

Available hardware reported by the user: **Windows 10 + Samsung A17 5G / Android 16**. Chrome
version and laptop/webcam model remain unspecified; record them before frozen acceptance trials.
No iPhone availability has been reported. Initial feasibility can use the available pair;
complete v1 cannot qualify without both pairs.

### Completed local candidate

- Cancelled/reset asynchronous imports cannot revive an abandoned session or expose a file.
- Resetting an active trial retains a cancelled observation. Backgrounding the receiver records a
  failed trial, releases camera/worker resources and prevents a later success for that session.
- Camera pixel/canvas initialization failures produce a failed observation rather than leaving the
  receiver active. Stale worker/camera callbacks cannot change a newer session.
- Python camera factory/decoder failures, window close and KeyboardInterrupt produce explicit
  observations. Cleanup exceptions are included in `cleanup_errors` without erasing the original
  cancelled or verified outcome. Setup failures have no trial elapsed time.
- The approval/development/testing rules, queue and handoff are reconciled across current documents.

The five application/test files are `python/src/lumenlink/qr_io.py`,
`python/tests/test_qr_io.py`, `web/src/ui/App.tsx`, `web/e2e/camera.spec.ts` and
`web/e2e/harness.spec.ts`. Source/test snapshot SHA-256:
`702603a47b09b605066d60d2b74af0059147bac1d3e13410c104448778d368b8`
after the formatting-only delivery correction. The originally approved aggregate was
`a35ba8645d9cb206a8f9b30cda0eb558c87f79c28ac524aabf0ee23b2b86c1b1`; both review reports preserve
that history and include revised signoff for the equivalent test layout.
The review reports define the sorted-path/LF-normalized hash algorithm. The snapshot identifies
application changes and regressions; this packet, logs and verdicts separately record the process.

| Local check on 2026-10-05 | Observed result |
|---|---|
| Python suite with properties/adapter regressions | 97 passed; protocol coverage 100% (CLI/optical/simulator excluded from protocol threshold) |
| TypeScript suite with properties/vectors | 30 passed; codec coverage 100% |
| Playwright | 30 passed across Chromium/Firefox/WebKit UI and clean/degraded Chromium fake-camera fixtures |
| Ruff/format/mypy, ESLint/TypeScript | Passed |
| Production Vite build | Passed |
| Shared-vector reproduction / independent TS-to-Python transfers | Exact checked-in Python match; all 4 TS transfers verified |
| Python sdist/wheel and isolated Python 3.12 install/CLI | Passed |
| Local Markdown links / diff whitespace | Passed at review; final document check recorded in UPDATE.md |

Independent verdicts: [development](docs/reviews/CP-01-development.md) **PASS** and
[testing](docs/reviews/CP-01-testing.md) **PASS** on the identical snapshot above. Both agents agree
all confirmed in-scope defects are resolved and no known blocking issues remain. Application/test
changes match the revised, independently agreed delivery snapshot. Commit/push, hosted CI, Pages
and both independent live checks are complete below. Physical G2 remains pending.

### Approval and delivery: CP-01

User response on **2026-10-05 (IST)**: **"Approved, push the changes and continue"**.
This approves CP-01 commit/push and the requested redeployment of the existing Pages feasibility
harness after hosted checks. The reviewed part includes the source/tests above, current governance/
handoff docs, this packet, both review reports and UPDATE.md. The deployed site still serves the older
code at delivery start. Record actual commit/CI/Pages/live smoke results before CP-02 physical trials.
No secure/PWA/mobile-performance claims are included; real trial observations are still required.

Delivery started: approved source/tests were committed/pushed as `91d76e6`; local HEAD and remote
main matched. [Hosted CI](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37276850490)
passed browser/interoperability and dependency audits, but Linux Python failed Ruff on the final
test signature (101 characters; limit 100); Windows was cancelled. The earlier static check preceded
that last test-stub edit. A formatting-only repair is being independently reviewed and retested
within the approved scope. Keep the failed run in the audit history. Pages remains held until all
required jobs pass; application behavior and the wire contract remain unchanged by this repair.
Fresh full Python checks passed on the repaired layout: Ruff lint/format, mypy and 97 tests with
100% protocol coverage. Development independently verified identical parsed test behavior and the
same revised snapshot; both agents recorded explicit renewed repair agreement before the retry push.
The repair was pushed as `be174e1` and
[CI retry](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37277641419) passed all jobs.
The approved [Pages redeployment](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37277880679)
completed successfully for `be174e181f1b00d7188016c575b88526efada465`. The original failed run remains
historical evidence. The development agent independently passed a live exact-byte export/import/save
smoke. The testing agent independently passed seven deployed checks: exact Unicode save, abandoned
import isolation, reset cancellation reports, background failure, canvas failure, timeout/no payload,
and project-base local worker/WASM URLs. HTTP 200, zero page errors/external requests and zero asset
errors were observed. Both agents agree the approved delivery passed its software checks.

## Current checkpoint: CP-02 physical evidence

The corrected [live harness](https://nagaram-kridey.github.io/QR-transfer/) is ready for physical trials.
Public fixtures were generated locally with `tools/make_trial_payloads.py`; binaries remain ignored.
Start with computer Python sender → Android Chrome receiver at 10 KiB, then reuse the phone's
verified saved fixture for Android Chrome sender → computer Python receiver. Preserve/export each
actual outcome. Smoke/exploration precedes the frozen 20-trial acceptance cells in the benchmark spec.

The user reported Windows 10 and Samsung A17 5G / Android 16. Local read-only inventory instead
identified this workspace host as Windows 11 build 26200, Lenovo 83K1, with Integrated Camera and
Integrated IR Camera (plus an unavailable Smart Connect virtual camera). The physical computer is
awaiting clarification; do not silently combine these identities. Chrome version and camera index
remain to record before acceptance. The user now reports successful physical transfers in both
directions. Their supplied JSON instead records one timeout at 60.0165 seconds (434/506 symbols);
successful exports and actual file/settings metadata have been requested. CP-02 cannot be signed
off from that general smoke report or deployed synthetic checks; the 20-trial gate remains pending.

### CP-02A local feature checkpoint

Implement the [benchmark evidence contract](docs/benchmarks/CP-02A-CONTRACT.md): normalize actual
Python/browser observations with explicit metadata/physical attestation, preserve failures in CSV,
validate frozen run identity and compute labeled per-cell summaries. This supports collection of
physical evidence within Stage 1; it does not replace the gate or start later product stages.
Development owns source, testing owns adversarial regressions and both must agree on the same final
revision. The user explicitly approved this reviewed feature on 2026-10-05; delivery is in progress.

Implementation: `python/src/lumenlink/benchmark.py` and the existing CLI's `benchmark record` /
`benchmark summarize` subcommands. Regressions: `python/tests/test_benchmark.py`. CSV keeps the
original columns then adds `run_id,phase,physical_attested,timeout_seconds`; metadata and raw evidence
are documented in the benchmark guide. Camera/UI, both codecs, wire vectors and dependencies are
unchanged. No Pages redeployment is required for this CLI-only feature.

Final source/test snapshot SHA-256:
`e1b284d84dc6468fd121a763c88941dc7caab6b26b8a718fb2caf932b7d01383`.
Same sorted-path/LF-normalized algorithm as CP-01, now over `benchmark.py`, `cli.py` and
`test_benchmark.py` at their paths above. Both agents independently confirmed this revision.

Actual checks on 2026-10-05: **293 Python tests** passed, including **196 benchmark regressions**;
protocol coverage remains 100% with CLI/optical/simulator/benchmark excluded from that threshold.
Full Ruff lint/format (16 files), mypy (11 sources), original vector regeneration and diff checks
passed. Wheel/sdist built; an isolated Python 3.12 wheel installation successfully ran the new
summary command on the header-only template with empty runs and manual-review status. The incomplete
metadata example was rejected without creating a CSV. New browser tests/audits were not rerun:
browser code and dependency locks are unchanged.

Initial adversarial tests exposed Windows lock cleanup, overflow-to-infinity JSON, malformed
statistics and inconsistent success counters. Their regressions now pass. Final review added
successful symbol-count checks while retaining unexpected-stream failures with explicit warnings.
The original raw timeout remains byte-identical (SHA-256
`ebc4c11d2afb45ac13b0e35960a997f3d25c7d96e5f58cb6f47fadf8fe87b080`).

Both [development](docs/reviews/CP-02A-development.md) and
[testing](docs/reviews/CP-02A-testing.md) explicitly agree **PASS** on this frozen revision, with
no known unresolved blocking issues within scope. User response on **2026-10-05 (IST)**:
**"approved"**. This approves CP-02A commit/push of the evidence tool, schemas/docs/reviews and the
non-sensitive raw timeout report. It does not approve G2, later product stages or Pages deployment.
Record actual Git/CI results here and in UPDATE.md after completion.

Delivery: committed/pushed as `d6b0a7b`; local HEAD and authorized remote main matched
`d6b0a7b92930d36c1f154fa69756ad408570cd9f`. [Hosted CI](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37354625219)
completed successfully: Windows/Linux Python, browser/interoperability and dependency-audit jobs
passed. No Pages workflow was dispatched because this is a CLI-only feature. CP-02A delivery is
complete; CP-02 physical qualification still requires actual measured acceptance data.

## CP-02B.1: browser diagnostics review packet

The user requested staged implementation of the accepted
[autoframing experiment](docs/planning/AUTOFRAMING_PLAN.md) on 2026-10-06 (IST). Base:
`5ee35618ea339a4a6d4ad7e7c667656977b6d00c`. CP-02B.1 is limited to instrumenting the existing
full-frame camera pipeline and separate bounded diagnostic exports linked to unchanged observation-v1
bytes. The sampler, decoder options, codecs, wire contract and benchmark CSV remain unchanged.
Development and testing own separate source/test work and will review the same final revision.

Budget: two hours of the eight-hour experiment cap; physical trials and approval waits are separate.
No ROI behavior or selection UI belongs to this checkpoint. CP-02B.2 must not start before approval.
The user approved commit/push plus Pages deployment of diagnostics for physical testing on October 7,
after hosted CI passes. Actual delivery results are recorded below once completed.

Implemented locally: bounded full-frame scan accounting, immutable recent-256 records plus aggregate
metrics, separate exact-observation-linked JSON export, final scan metrics before terminal messages,
and nonfatal diagnostic/hash failure handling. Frame imports and pre-trial setup create no sidecar.
Native worker crashes retain interrupted/unknown worker metrics; no fabricated timing is recorded.

Source/test freeze SHA-256:
`91675844c1ca3f90f87779288a92ec1376bd4284d704916519df49a644287374`.
Same sorted-path/LF-normalized `path:sha256` algorithm used by earlier checkpoints, over these files:

- `web/src/diagnostics/camera.ts`, `web/src/diagnostics/camera.test.ts`
- `web/src/workers/messages.ts`, `web/src/workers/receiver.worker.ts`,
  `web/src/workers/receiver.worker.test.ts`
- `web/src/ui/App.tsx`, `web/e2e/camera.spec.ts`, `web/e2e/harness.spec.ts`

Actual local checks on **2026-10-07 (IST)**:

| Check | Result |
|---|---|
| Browser lint and strict TypeScript | Passed after the final source/test edit |
| Vitest | 69 passed: 32 diagnostics, 7 worker, 30 codec |
| Configured codec coverage | 100%; does not measure new diagnostics/UI coverage |
| Playwright | 46 passed across harness browser engines and clean/degraded virtual-camera paths |
| Production build | Passed for default base and GitHub Pages `/QR-transfer/` base |
| Interoperability | Checked-in Python vectors match; Python verified four independent TS transfers |
| Strict Python observation compatibility | Exact-byte synthetic cancelled observation accepted; physical attestation false, manual review required |
| Project-base optical software smoke | Exact 320-byte synthetic save, matching sidecar digest, final scan included, local WASM HTTP 200, no page errors/external requests |

Independent [development](docs/reviews/CP-02B.1-development.md) and
[testing](docs/reviews/CP-02B.1-testing.md) verdicts are **PASS** on the identical snapshot above.
Both explicitly agree all confirmed in-scope issues are resolved and no known blocking issue remains.
The reports preserve actual findings/verification and limitations; this is not a global bug-free
guarantee. User response on **2026-10-07 (IST)**: **"approved"** for CP-02B.1 commit/push and Pages
deployment after CI. Application/tests remain frozen at the reviewed revision. Delivery is in progress;
no candidate commit/push/hosted CI/Pages deployment or physical trial is claimed yet. Current Pages
still serves `be174e1`. Full-frame scanning remains the only mode; speed benefit and G2 are unproven.

Requested approval scope: **CP-02B.1 commit/push and Pages deployment after hosted CI passes**,
including the eight source/test files, experiment/diagnostics docs, current plans/handoff/log and
independent review reports. Generated smoke artifacts stay ignored. On approval, deliver this frozen
part, verify actual hosted/deployed outcomes and log them before starting CP-02B.2. The adoption
thresholds and physical decision remain future checkpoints.

Approval permits delivery of CP-02B.1 and then continuation to CP-02B.2 after actual delivery checks.
It is not approval to push the future ROI prototype or declare adoption/G2. Its independently
reviewed local candidate still requires another explicit user decision before push/deployment.

Approved source/docs were committed/pushed as `6fb59f3`; local HEAD and remote main matched
`6fb59f3a4393222f39cd7510d3ea2c8ab514979f` with a clean working tree after push.
[Hosted CI](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37516304612) completed successfully.
All required jobs passed. The approved Pages workflow was dispatched afterward (API HTTP 204);
workflow completed successfully for `6fb59f3`:
[Pages run 37516701077](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37516701077).
Root observed HTTP 200 and the expected `/QR-transfer/assets/index-DX_hoMNl.js` bundle.
That initial availability check preceded the completed independent live reviews below; no physical
result is inferred.

Delivery is verified: both independent live reviews passed at the exact hosted URL. Development
used the actual synthetic camera/worker/WASM path to verify the exact 320-byte file, unchanged v1
observation and its diagnostic digest/final scan. Testing passed seven live cases covering actual
synthetic transfer/save, reset/late events, background interruption, dispatch failure, hash failure,
late hash reset and setup denial. Both observed expected local project-base assets, HTTP 200 and
no page/asset errors or external requests. Committed source/test fingerprint remains identical to
the approved freeze. Generated reports remain ignored. These are software delivery checks, not G2.
CP-02B.1 is complete; continue to local CP-02B.2, which requires a new review/approval before delivery.

## CP-02B.2: reviewed and authorized for manual-test delivery

Base `8fad9841decbe69a0e1b9e90682efccb47b51a7d`; the user approved and delivery verified CP-02B.1
before this work began. CP-02B.2 implements opt-in browser-only QR region tracking, preserving
full-frame default, original camera polling/decoder settings, observation-v1, CSV and wire codecs.
It adds conservative native-coordinate crops, admission-only corner results, stale-geometry
isolation, an experimental selector/outline and diagnostic-v2 accounting in both modes.

The fixed [20-event replay](docs/benchmarks/AUTOFRAMING_REPLAY.md) ran twice with the actual worker/
WASM path: each mode recovered the same 14/20 events; all six decoy scenes timed out in both modes.
No control-success loss and the successful-event p95 margin passed, with complete outcomes retained.
This passes the comparative replay criterion, not all-event recovery or a physical speed/adoption
gate. Guides and retained compact public results are linked from the benchmark README. Source/tests,
public fixture generator and CI fixture generation will be part of the reviewed packet; generated
camera images/videos remain ignored. Final combined agent agreement is still required.

The user explicitly instructed on **October 7**: **"Update to github the current working code for
manual test with the autoframing and also add additional FPS higher level for possible checking
if it is possible or not"**. This authorizes commit/push and the Pages manual-test update after
combined checks and both reviews. It extends the reviewed scope with browser target options
15/20/30 fps and selected-rate acknowledgement, plus related exploratory-only benchmark recording.
Default 8 fps, standard/Python optical 10 fps cap, receiver polling and wire bytes stay unchanged.
Final reports must inspect this combined revision before delivery; authorization cannot replace
their agreement or failed checks. Pages will be dispatched only after hosted CI passes.
Physical adoption is separate CP-02B.3 and remains unapproved/unmeasured; no later phase is authorized.

Both same-revision reviews are recorded in
[development](docs/reviews/CP-02B.2-development.md) and [testing](docs/reviews/CP-02B.2-testing.md).
They agree **PASS** for this manual-test delivery with no known unresolved in-scope blocker at
freeze `27adca065b0f31a1ee319705c731934836dba999146aa07d3731c61a7cd44326`.
Delivery is complete. Reviewed implementation commit `19b5ca391e692d5b1a503529ab9058700fc28eff`
was pushed to `main`; hosted CI passed at
https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37575340215. The first Pages run
failed because its workflow omitted replay-fixture generation; workflow correction
`e637cdf675fe209d695efaedd231e71a88829eb2` was pushed, hosted CI passed at
https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37575923334, and Pages completed at
https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37576176736. The live project-base URL
is https://nagaram-kridey.github.io/QR-transfer/ and returned HTTP 200 with the Auto region and
15/20/30 fps UI assets. This is ready for manual testing; physical adoption remains CP-02B.3.

## CP-02C final approval packet — October 7

Base `6cd5d925adc1251cffbc90099010f1ec525f802b`; implementation/specification freeze:
`9836cda788f8b43884907fe016c54921106036f071a140b73c5509052f6c129d` (22 paths).
The [development](docs/reviews/CP-02C-development.md) and
[testing](docs/reviews/CP-02C-testing.md) reviews agree PASS with all confirmed in-scope issues
resolved. No source changes follow this freeze. Scope includes the Python/browser capacity changes,
regressions, interoperability tooling, workflows, spec/ADR, plans/logs and sanitized observation
analysis. Original supplied JSON and generated payloads/exports/build products remain ignored.

User-visible result: experimental 5 MiB file limit, 8192 symbols, automatic fitting symbol-size
selection, 16 MB bounded frame imports and 2/5 MiB camera timeout choices. Imports reject malformed
or conflicting trailing frames and excessive CLI JSON nesting before save. Older receivers can
reject longer cycles even below 1 MiB; update both endpoints. Larger payloads remain exploratory.

Verification: 147 Vitest; 337 Python coverage-suite tests plus two final CLI regressions; 36 browser
harness cases across Chromium/Firefox/WebKit with byte-exact 5 MiB saving; seven Chromium camera
lifecycle cases; independent 2049-symbol cross-decoding in both directions; unchanged original
vectors; lint/types/style/package/install and default/project-base builds passed. Coverage exceeds
99% on configured protocol modules. Physical performance, ROI adoption and G2 remain separate.

Requested approval: **commit/push CP-02C and deploy it to GitHub Pages after hosted CI passes**.
The user explicitly responded **"Approved" on October 7** for this packet, including commit/push
and Pages deployment after hosted CI passes. The 22-path source fingerprint remains unchanged.
Approved implementation was committed/pushed as `c451a1a5dc7509eb5f84eb590a81357af46c2044`.
[Hosted CI](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37662957793) passed all required
jobs; [Pages](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37664035403) was dispatched
afterward and completed successfully for that exact commit. The live site serves the expected
`index-BpzRN7xr.js`, `receiver.worker-DYrXf6hs.js` and self-hosted WASM assets with HTTP 200.

Both independent live reviews PASS. Testing verified public 2 MiB and 5 MiB artifact workflows,
automatic 512/1024-byte symbol selection, exact verified saving, plus-one rejection and malformed
trailing-frame rejection. Development independently verified a different 5 MiB fixture and a
320-byte synthetic optical Auto-region transfer, including final scan and observation digest
linkage. Both observed no page errors/external runtime requests. Generated data remains ignored.
This verifies software delivery; physical 5 MiB performance, ROI adoption and G2 remain unmeasured.
CP-02C delivery is complete; later features still require their own checkpoint approval.

CP-02C begins on October 7 at the user's request to increase transferable file size and inspect
the supplied reports. Scope: 5 MiB original bytes, 8192 repeat source symbols, consistent bounded
imports, usable symbol-size selection and matching timeout controls. This expands resource policy
without changing the v2 layout or existing vectors. Large transfers remain exploratory. Both final
reviews and explicit approval for commit/push/Pages are required. The supplied reports are reviewed
in [the observation analysis](docs/benchmarks/2026-10-07-observation-review.md); they show a single
full-frame success and do not clear adoption or G2.

## Approval packet template

## CP-02D review packet — October 8

Base `61dab088964d782f04040db57573c691f975cf7a`. Scope: the agreed
[throughput plan](docs/planning/THROUGHPUT_PLAN.md), its IMPLEMENTATION_PLAN.md integration,
dark framing on both sender QR and receiver tracking preview, and reproduced portrait preview
alignment correction. Source changes are limited to App.tsx/style.css; regressions are in the
camera/harness E2E files. Plan inclusion does not implement feedback or other speed mechanisms.

First focused run retained 19 passes and two portrait failures, with about 75.7-pixel offset.
CSS absolute video positioning repaired the shared aspect-ratio/contain layout. The unrelaxed
rerun passed all 49 cases; portrait/landscape projection error was below 0.1 pixels. Twelve complete
sender screenshots across three engines/densities and mobile were independently decoded with
Python ZXing and wire checksum verification; QR canvas pixels/white quiet zone remain exact.
Actual clean/degraded synthetic worker transfers saved verified bytes in both receiver modes;
state clearing/reset/background/timeout/stale-frame cases passed. These are software observations.

Root lint/strict types, 147 Vitest, original both-language vectors, default and project-base builds
passed. Protocol, capture, tracker, worker source and optical settings are unchanged. External
masking leaves the padded region interior clear and ignores pointer events; the preview frame
appears only in Auto region after an admitted QR. Screenshot artifacts and failed traces stay ignored.

The final [development](docs/reviews/CP-02D-development.md) and
[testing](docs/reviews/CP-02D-testing.md) reports record the same six-path source/plan fingerprint
and verdict. Both explicitly agree **PASS**, with all confirmed in-scope issues resolved and no
known blocker, on fingerprint `b0955b1ca0b6c531937ba5295fe7b0435debbe3ce74cf7490930a3f0984a64a6`.
Administrative logs/checkpoint/handoff files are outside that fingerprint. This agreement is
scoped review evidence, not user approval or a physical performance result.

Approval requested: **commit/push CP-02D and deploy to GitHub Pages after hosted CI passes**, including
the source/tests, agreed plan, current documentation/logs and both review reports. This approval
was explicitly received as **"Approved" on October 8**. Delivery is in progress; the live site
still serves CP-02C until the approved deployment is verified. It does not authorise implementing
the planned feedback/throughput experiments or claim any measured transfer-speed gain.

For each checkpoint record:

1. ID, scope, base commit and precise files/revision being approved.
2. User-visible change, reproduced findings and how they were resolved.
3. Actual verification commands/results and limitations; link both independent verdicts.
4. Known out-of-scope work and unmet external gates. Any unresolved in-scope issue blocks submission.
5. Requested decision: approve this checkpoint for commit/push, or request a revision. State whether
   deployment/publication is included. Record the explicit user response in UPDATE.md.
6. After approval: actual commit, push, hosted-check and deployment results, then the next checkpoint.

Keep the latest state in this file and UPDATE.md consistent. Historical approval records remain
dated; future models must not treat them as blanket approval for later work.
