# CP-01 independent testing review

Date: **2026-10-05 (Asia/Kolkata)**. Role: independent testing/break agent.
Base commit: `d40966e`. Work is local and awaiting user approval; no commit, push or deployment is
part of this review result.

## Scope and verdict

**PASS within CP-01:** all reproduced in-scope lifecycle/reporting defects are resolved, and no
known unresolved blocking issue remains in the reviewed trial-readiness changes. This is a scoped
testing verdict, not a claim that the entire product has no bugs or that the physical G2 gate passed.

I read the separate [development verdict](CP-01-development.md), its source decisions, regression
review, independently calculated fingerprint and limits. **Testing explicitly agrees with Development**
on snapshot `a35ba8645d9cb206a8f9b30cda0eb558c87f79c28ac524aabf0ee23b2b86c1b1`:
all confirmed CP-01 issues are resolved and neither review identifies a known unresolved blocking
issue in scope. Both reviews therefore support submission for user approval. This mutual agreement
does not authorize delivery or satisfy physical G2. No source/test edits occurred after final checks.

Reviewed independent codec boundaries, receiver camera/import cancellation, reset/interruption,
timeout, local observation recording and verified saving. Inspected CHECKPOINTS.md and the changes
to AGENTS.md, CONTEXT.md, IMPLEMENTATION_PLAN.md, PROJECT_PLAN.md, MODEL_HANDOFF.md, README.md and
UPDATE.md. The approval workflow preserves unmet physical/security gates and the user's decision.

## Adversarial findings and regressions

The pre-fix production browser build failed four targeted Chromium regressions: reset erased a
timed trial's observation; backgrounding left it receiving; a pixel-capture exception left it
receiving; and a reset during delayed File.text allowed the abandoned import to finish successfully.
The import regression now waits for the actual file read to settle and asserts that no worker was
created, avoiding a false pass caused by slow WASM startup.

An isolated test process loaded the adapter from the base commit into the imported Python module.
Three targeted regressions failed: closing the receive window produced a timeout, and decoder
RuntimeError/OpenCV exceptions escaped without an observation. Source review additionally found
KeyboardInterrupt was outside the observation path; its new regression now verifies cancellation.

The coordinator found initialization/cleanup gaps. Additional tests reproduced three Python failures
(camera constructor, release and window cleanup exceptions) and a browser canvas-initialization hang.
Fixes now return setup failures, preserve the original timed outcome during cleanup, and record
cleanup error text. Both cancelled and byte-verified successful Python outcomes are tested.

New regressions also assert exportable browser timeouts, payload absence on failure, no unverified
save button, released camera preview on reset, and no uncaught page errors during capture failures.
Existing tests verify exact browser downloads, permission denial, incomplete imports, flashing
acknowledgement, viewport fit, Python exclusive saves, unsafe names and protocol adversarial inputs.

## Actual checks

Toolchains observed: Python **3.12.13**, Node **24.21.0**. The locked existing environments were used.

| Command | Observed final result |
|---|---|
| `uv run --project python pytest python/tests --cov=lumenlink --cov-config=python/pyproject.toml` | **97 passed**; protocol modules **100% coverage**; 90% threshold passed |
| `npm --prefix web run test:coverage` | **30 passed**; codec statements/branches/functions/lines **100%** |
| `npm --prefix web run build` | TypeScript compile and production Vite build passed |
| `npm --prefix web run e2e` | **30 passed** in 27.7 seconds: three desktop browser engines plus Chromium clean/degraded camera fixtures |
| `git diff --check` | Passed |

The coordinator independently reported passing Ruff lint/format, mypy, ESLint, TypeScript and
both-direction conformance checks (shared Python vectors unchanged; four TS transfers verified
by Python). Those are coordinator results, separate from this agent's commands above.

The first passing Python run emitted a nanobind shutdown diagnostic because parametrized exception
instances retained traceback references to the native decoder. Test stubs now create exceptions
inside the call; the final full Python run passed without that diagnostic. No runtime/lockfile
change was needed. Baseline failing runs were intentional reproductions, not unresolved final failures.

## Reviewed application/test revision

Independently confirmed the coordinator's normalized snapshot fingerprint:
`a35ba8645d9cb206a8f9b30cda0eb558c87f79c28ac524aabf0ee23b2b86c1b1`.
Algorithm: sort the five paths below, normalize CRLF to LF in each file's contents, SHA-256 each,
then SHA-256 the UTF-8 concatenation of `path:hash` lines, each ending in LF. Development/testing
agreement must cite this same fingerprint. The per-file values below are the raw working-file hashes.

SHA-256 of the five changed application/test files after final checks:

| File | SHA-256 |
|---|---|
| `python/src/lumenlink/qr_io.py` | `803ef8b6d72b4d38543f62687f5348980547db019937e41aa284469f0b808c04` |
| `python/tests/test_qr_io.py` | `abc74b24aad1f7c6aca821e548dd01e43ed83841767aa3e80c9d8ce606502c15` |
| `web/src/ui/App.tsx` | `224a235cdd5cdf9dc1759cea4ac764787cd7eca8f17f6b1f7497d65d60c770e0` |
| `web/e2e/harness.spec.ts` | `c1c850724581dd571ade88b6aa62e3a2dd5e81c9e256c34355d396a3f60514a1` |
| `web/e2e/camera.spec.ts` | `48ecac7a88d87d650e976eb5fdb30ea059da68a5367eabcc42a97996636609c0` |

A material change after these checks requires renewed review and the relevant rerun. Documentation
status updates must remain consistent with the actual approval and delivery state.

## Remaining limits and next checkpoint

No physical Android or iPhone trial was performed. Synthetic pixels/videos, mocked failures and
desktop WebKit cannot establish phone camera reliability, installation or optical throughput. The
user has Windows and Android available; iPhone availability/qualification remains outstanding for v1.
Current transfers remain plaintext, uncompressed repeat-mode; PWA, encryption, LT, Link Lab and
publication remain future gated work. Existing Pages still serves the earlier implementation.

Await explicit CP-01 user approval before commit/push/deployment or starting CP-02. The physical
checkpoint must record every actual trial outcome and evaluate G2 under the benchmark contract.
