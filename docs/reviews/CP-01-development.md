# CP-01 development review

Date: **2026-10-05 (Asia/Kolkata)**. Role: development/check agent.
Base commit: `d40966e`. This candidate remains local, unapproved, uncommitted and undeployed.

## Scope and verdict

**PASS within CP-01:** I agree with the independent testing verdict on the exact application/test
snapshot below. All confirmed in-scope lifecycle/reporting findings have been resolved, and I know
of no unresolved blocking issue in these trial-readiness changes. This agreement authorizes
submission for the user's decision; it is not user approval, physical feasibility evidence or a
guarantee that undiscovered issues cannot exist.

Reviewed existing Python CLI/camera behavior and browser sender/receiver/worker integration,
including session cancellation, timeouts, verified saving and local observations. Application edits
are confined to `python/src/lumenlink/qr_io.py` and `web/src/ui/App.tsx`. Neither independent codec,
wire contract, vector, dependency lockfile nor future gated feature changed.

## Implemented corrections

- A browser reset during an already-started camera trial preserves an exportable cancelled
  observation, clears the result/stats and returns to IDLE. Setup cancellation remains distinct from
  a timed trial. Receiver backgrounding fails a timed trial under the benchmark procedure.
- Cancelling/resetting a pending frame-file read invalidates its generation. Its eventual read or
  rejection cannot create another decoder worker or expose a result. Stale worker-error and camera
  track-ended callbacks likewise cannot affect a newer session.
- Camera canvas/context initialization, missing context, pixel capture and worker-post errors end
  the trial with a local failure observation. Timer and verification deadline failures, and explicit
  Stop cancellation, carry reasons instead of leaving blank failure explanations.
- Python receiver window closure and keyboard interruption return cancellation observations.
  OpenCV/runtime capture or decoder failures, including camera-constructor failure, return failures.
  Cleanup exceptions preserve the measured outcome and appear in `cleanup_errors`; cleanup after
  byte verification does not retroactively change the measured success into a transfer failure.

The adversarial-testing agent independently authored the regressions and reproduced failures on
the previous implementation. I reviewed the final test changes and
[testing report](CP-01-testing.md). The tests assert observable outcomes, report contents, absence
of unverified saving and cancellation boundaries. The delayed import test waits for the actual
file-read settlement and checks that zero workers were created, avoiding a time-based false pass.

## Actual verification

Development independently ran:

| Command | Observed result |
|---|---|
| `uv run --project python ruff check python/src` | Passed |
| `uv run --project python ruff format --check python/src` | Passed; 10 files already formatted |
| `uv run --project python mypy python/src` | Passed; no issues in 10 source files |
| `npm --prefix web run lint` | Passed |
| `uv run --project python pytest python/tests/test_qr_io.py -q` | Final **14 passed** in 0.52 seconds |
| `git diff --check` | Passed |

The coordinator's final TypeScript/static and both-direction conformance checks passed. I inspected
the independent tester's final results: **97 Python tests**, **30 Vitest tests**, production build,
and **30 Playwright tests** passed, with 100% coverage on protocol/codec modules. Those full-suite
executions belong to the tester/coordinator; they are not claimed as my separate full-suite run.
An earlier TypeScript check encountered a new test mock's Worker.postMessage overload error; the
tester corrected that mock and the final compile/build passed. No runtime workaround was needed.

## Shared reviewed snapshot

Independently recalculated and confirmed the same fingerprint as the tester and coordinator:

`a35ba8645d9cb206a8f9b30cda0eb558c87f79c28ac524aabf0ee23b2b86c1b1`

This identifies the sorted paths:

1. `python/src/lumenlink/qr_io.py`
2. `python/tests/test_qr_io.py`
3. `web/e2e/camera.spec.ts`
4. `web/e2e/harness.spec.ts`
5. `web/src/ui/App.tsx`

For each path normalize its bytes from CRLF to LF and calculate SHA-256. Concatenate UTF-8 lines
`path:sha256` with one LF per line, then SHA-256 the combined bytes. A change to these files requires
fresh joint review and relevant verification. This fingerprint deliberately excludes review documents
and later approval/delivery status entries.

Also reviewed the approval governance in CHECKPOINTS.md, AGENTS.md, CONTEXT.md, plans, handoff,
README.md and UPDATE.md. Their rules require both independent verdicts on the candidate and explicit
user approval before commit/push or moving to the next checkpoint, while preserving physical gates.
Coordinator status-only finalization must accurately record this agreement and pending user decision.

## Remaining limits and next step

Physical G2 remains **unmeasured**. Generated camera feeds and desktop browser tests do not prove
Android/iPhone support or optical throughput. Windows + Android is available for the next physical
checkpoint; iPhone qualification is still required for full v1. The build remains a plaintext,
uncompressed repeat-mode experiment; no PWA, security, fountain or release milestone was completed.

The existing Pages build contains the previous source. No candidate hosted CI, push, deployment
or user approval has occurred. Present CP-01 for approval of commit/push and the explicitly planned
Pages redeployment after hosted checks; then use the corrected deployment for CP-02 physical trials.
