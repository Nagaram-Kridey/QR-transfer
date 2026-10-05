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

## Approval packet template

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
