# LumenLink update log

Update this file after every meaningful project change. Each entry records **done**, **verified**,
**next**, and **blockers**. Do not call a planned step complete or replace physical data with simulation.
Dates use Asia/Kolkata (IST). The implementation checklist is in IMPLEMENTATION_PLAN.md.

**Current handoff — 2026-10-05 (IST):** [MODEL_HANDOFF.md](MODEL_HANDOFF.md) is the next-model
continuation guide. Application implementation remains paused; the latest request is documentation
only. Stage 1 software is implemented; the next required evidence, when resumed, is physical
Android/iPhone trials and the G2 decision. Implementation `8eb1d1c` passed hosted CI and Pages
deployment on 2026-10-04; live harness: https://nagaram-kridey.github.io/QR-transfer/.

Entries below are chronological. Read the latest entry for current verification/blockers; earlier
temporary failures and delivery tasks describe the state at their date, not unresolved issues forever.

## Entry format for future updates

Append a dated entry after every meaningful code, documentation, measurement or release update.
Keep this summary and the implementation checklist consistent with the latest evidence.

```markdown
## YYYY-MM-DD — Short description (Asia/Kolkata)

**Done:** Actual changes, affected components and relevant commit/deployment references.

**Verified:** Commands/checks run and observed results. Identify historical results, failed checks
and checks not run; distinguish automated/synthetic evidence from physical trials.

**Next:** Concrete next action and its dependency or acceptance condition.

**Blockers:** Outstanding inputs, hardware or failures; write "None" only when true.
```

## 2026-10-04 — Repository connection and persistent log

**Done:** Connected origin to https://github.com/Nagaram-Kridey/QR-transfer.git. Fetched and retained
the existing initial commit (`c25d645`) as the local branch parent; no force push or history rewrite.
Added this ongoing log and reconciled the five current planning documents while preserving originals.

**Verified:** The remote contains a main branch with an initial README only. Local Git author identity
is available. Python 3.12 is installed. Initial Python/TS conformance and codec tests pass.

**Next:** Complete protocol/benchmark documentation, rerun the browser regressions after the WebKit
camera-error fix, validate packaging/audits, commit and push the implementation, and inspect hosted CI.

**Blockers:** Android/iPhone physical trials have not been performed. Later product stages remain
behind the explicit physical gate. Pages deployment is not yet verified; no PyPI release exists.

## 2026-10-04 — Foundation and feasibility software

**Done:** Added Python CLI/reference codec, independent TypeScript codec, repeat transport, bounded
parser/session handling, safe filenames/saving, local QR renderer/scanner, seeded simulator, browser
sender/receiver harness, local worker/WASM loading, conformance fixtures and CI/Pages workflows.
Added first-play flashing acknowledgement, pause/reduced-rate controls and explicit plaintext warnings.

**Verified:** Initial 82 Python tests and 30 TypeScript tests passed; protocol-module coverage was
100% in both implementations. Python verified four independent TypeScript-generated transfers.
Production build and wheel build passed. Clean/degraded generated camera videos decoded through
the browser worker. One WebKit permission-test stub needed correction; the full rerun is pending.

**Next:** Finish the acceptance rerun and supporting documents; keep synthetic results separate from
field evidence. Push only after checking the resulting changes and update this log with actual results.

**Blockers:** No physical camera reliability evidence yet; no security/PWA/fountain completion claims.

## 2026-10-04 — Acceptance checks and camera lifecycle corrections

**Done:** Completed the wire spec, threat assumptions, prior-art/ADR documents, benchmark procedure,
CSV header and reproducible 10/100 KiB payload generator. Fixed unavailable-camera and incomplete
import states, recorded failures/timeouts, aligned the trial start with explicit receiver arming,
used high-resolution timing on Windows, and bounded filenames by UTF-8 bytes for Linux compatibility.

**Verified:** 87 Python tests pass; 30 TypeScript tests pass; both protocol coverage reports are 100%.
Ruff, format checks, mypy, ESLint and TypeScript/build checks pass. All 17 Playwright tests pass across
Chromium/Firefox/WebKit UI paths plus clean/degraded Chromium fake-camera feeds. Python fixtures are
reproducible; four independent TS transfers pass Python verification. The wheel builds and installs in
an isolated environment. npm/pip dependency audits report no known vulnerabilities (the unpublished
local package itself is not a PyPI audit entry). These are automated results, not physical measurements.

**Next:** Commit/push to the supplied main branch, inspect hosted CI, configure/verify the Pages
feasibility URL, then collect Android/iPhone physical trials using the documented protocol.

**Blockers:** Physical gate pending. GitHub Pages currently returns no configured site. Secure mode,
PWA/offline cold-start, LT research, Link Lab and final PyPI release remain future gated milestones.

## 2026-10-04 — GitHub push, hosted CI and live Pages verification

**Done:** Pushed implementation commit `8eb1d1c` to the supplied repository's main branch without
rewriting its initial history. Enabled HTTPS GitHub Pages with workflow builds and published the
feasibility harness. Updated README/planning status to link the live app and distinguish deployment
from the still-unpassed physical feasibility gate. UPDATE.md is now a persistent working agreement.

**Verified:** [Hosted CI](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37196930373) passed
all Windows/Linux Python, browser/interoperability and dependency-audit jobs.
[Pages workflow](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37196947717) succeeded.
The live HTTPS page returned 200 and passed a browser export/import/verified-download roundtrip using
its deployed worker and local WASM. No page errors or cross-origin requests were observed. Inspected
desktop/mobile screenshots; no layout overflow found. The live build remains explicitly plaintext.

**Next:** Open the live harness on Android and iPhone, generate public 10/100 KiB test payloads with
`tools/make_trial_payloads.py`, and record the physical trials in docs/benchmarks using its protocol.
Report every failure and complete the G2 decision before production PWA/security/fountain work.
Future meaningful changes must update this log and the implementation checklist before pushing.

**Blockers:** The physical gate needs the user's phone hardware and observations. Automated videos
cannot satisfy it. Encryption, compression, installed/offline cold-start, LT, Link Lab and PyPI remain
unimplemented future milestones; no secure-v1 or physical-performance claim has been made.

## 2026-10-05 — Next-model context and continuation handoff

**Done:** Created MODEL_HANDOFF.md covering accepted scope/budgets, stage status, repository history,
component/API map, wire invariants, dated verification evidence, reproducible commands, physical
gate procedure, later implementation order and logging/push/deployment workflow. Expanded CONTEXT.md
with the current stop point and delivery plan. Linked the handoff from README.md and AGENTS.md,
and added this reusable update format. Preserved the user's application-work pause and archived inputs.
Committed and pushed the handoff as `5f37082` to the authorized repository's main branch.

**Verified:** Read the current plans, spec, benchmark procedure, October 4 evidence, workflows and
relevant source interfaces. Confirmed a clean main tracking origin/main at `c26957e` before editing.
Validated all 65 local Markdown links across the five changed handoff documents; all targets exist.
`git diff --check` passed. Reviewed the documentation against current interfaces/workflows and the
recorded evidence; no application source, wire vectors, lockfiles or archived inputs changed.
Application tests and physical trials have not been rerun locally for this documentation-only update.
Git confirmed the push from `c26957e` to `5f37082`. Hosted CI for this documentation update has not
been inspected; the last verified application/CI results remain the dated October 4 record.
Pages was not redeployed because the app did not change.

**Next:** When the user resumes implementation, follow MODEL_HANDOFF.md: collect physical Android/iPhone
camera trials, retain all outcomes, and record G2 before further product stages.

**Blockers:** Physical hardware/observations are still required to clear feasibility. PWA, security,
compression, LT, Link Lab and PyPI remain future work; this documentation update does not clear a gate.
