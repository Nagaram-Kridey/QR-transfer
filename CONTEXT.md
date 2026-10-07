# LumenLink context

## Start here for a new model

Read [MODEL_HANDOFF.md](MODEL_HANDOFF.md) for the complete continuation guide: repository snapshot,
implemented components, protocol cautions, commands, evidence, gates and ordered next steps.
Then read the current [UPDATE.md](UPDATE.md) summary/latest entries and
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). This file contains durable context; the handoff
is a dated snapshot, the implementation plan is the execution checklist, and UPDATE.md is the log.
The normative wire contract remains [SPEC-v2.md](docs/spec/SPEC-v2.md) plus
[shared vectors](vectors/repeat-v2.json).

## Purpose and audience

Small offline transfers through a display and camera, with a Python reference/CLI and interoperable
browser client. Intended for a Python-developer portfolio demonstrating protocol design, testing,
vision, applied cryptography (later), CI and deployment. It does not demonstrate Django/DRF/SQL;
keep separate portfolio work for those skills.

Accepted delivery/scope decisions are in PROJECT_PLAN.md. Execution status is in IMPLEMENTATION_PLAN.md.
The original owner-context narrative is preserved in the archived draft.

## Current state

October 7 continuation: CP-02B.2 is deployed for manual testing (implementation `19b5ca3`,
workflow fix `e637cdf`). The user supplied a full-frame success observation and linked diagnostics,
then requested larger-file capacity. CP-02C is approved and delivered as `c451a1a` with a bounded 5 MiB / 8192
repeat-symbol policy. This changes resource limits, not the v2 byte layout. Existing small vectors
remain stable; old receivers reject larger streams. See ADR 004 and the latest checkpoint/log.
The original report files stay local; retained analysis documents their limits. Hosted CI, Pages
and both independent live software reviews passed for the approved revision. Updated senders and
receivers are required for expanded capacity. Physical larger-file trials and ROI comparison are
next; no adoption or G2 result is claimed. The following dated entries are history.

**Pause/resume:** The user paused work at 00:57:56 IST October 7 and requested continuation from
02:00 IST. All agents were interrupted and partial edits preserved. The user explicitly resumed
with "Continue" at 07:52:41 IST October 7; development/testing resumed from `8fad984`. Exclude the
pause from the experiment timebox. The user subsequently requested GitHub/manual-test delivery
plus higher browser FPS on October 7; that authorizes combined delivery after checks and both reviews.

On **2026-10-06 (IST)** the user requested implementation of the accepted
[browser autoframing experiment](docs/planning/AUTOFRAMING_PLAN.md). Only CP-02B.1 diagnostics is
locally implemented with 69 Vitest/46 browser checks passing and both independent reviews PASS
on the same final revision. The user approved CP-02B.1 commit/push/Pages deployment on October 7;
delivery is verified for `6fb59f3` (CI/Pages/both live reviews passed). CP-02B.2 local implementation
started on October 7 from `8fad984`; separate development/testing agents are building and challenging
the bounded opt-in tracker. The latest explicit manual-test request authorizes delivery with
15/20/30 fps exploratory browser targets after final combined checks and both-agent agreement.
The eight-hour cap includes tests/docs, with two hours for diagnostics; the rate addition stays in
the current bounded checkpoint rather than granting another tuning allowance.
Full-frame remains the default; plaintext status and physical gates remain in force. No ROI benefit
has been measured on the phone, and the live site still serves the approved diagnostics build.

Stage 1 software exists; physical feasibility remains unqualified. The user reports both-direction
physical smoke success; one supplied browser export records a timeout, with successful exports and
frozen acceptance cells still missing. CP-02A observation/summary tooling passed separate
development/testing review, was explicitly approved on 2026-10-05 and is delivered as `d6b0a7b`
with all hosted CI jobs passing. See CHECKPOINTS.md and UPDATE.md for evidence. CP-02A changed only
Python tooling and documents. CP-02B.1 diagnostics is delivered as `6fb59f3` with CI/Pages and both
live reviews passing.
Current modes are plaintext,
uncompressed repeat-mode. The browser is a test harness, not a completed installable PWA.
No security, mobile support, field throughput or v1 release claims have been earned yet.

As of **2026-10-05 (IST)**, the user has resumed implementation under
[CHECKPOINTS.md](CHECKPOINTS.md). Build/review each phase or distinct feature locally, obtain separate
development/testing agreement, then stop for explicit user approval before committing/pushing it
or starting the next checkpoint. This replaces the earlier automatic-push authorization.

CP-01 fixes existing trial readiness and establishes this workflow; the user approved delivery on
2026-10-05. Code `be174e1` passed hosted CI, Pages deployment and both agents' live software checks.
Consult CHECKPOINTS.md and UPDATE.md for delivery evidence. Physical camera evidence
and the G2 decision remain the next phase dependency before production PWA/security/fountain work.
The user reports **Windows 10 + Samsung A17 5G / Android 16** available. The local workspace host
reports Windows 11 build 26200 / Lenovo 83K1; whether this or a separate Windows 10 computer is the
physical sender/receiver is awaiting clarification. Record actual Chrome/camera details before
acceptance. iPhone qualification remains a v1 requirement.

The authorized remote is `https://github.com/Nagaram-Kridey/QR-transfer.git`; preserve its history.
Baseline `8eb1d1c` was tested/deployed on 2026-10-04; approved CP-01 corrections are now deployed
from `be174e1` on October 5. The [live feasibility harness](https://nagaram-kridey.github.io/QR-transfer/)
and fresh hosted/live results are recorded in CHECKPOINTS.md and UPDATE.md; the earlier baseline
record is in [verification](docs/verification/2026-10-04.md). Software checks do not establish
real-phone support. Consult Git and the latest log for subsequent documentation commits.

## Accepted delivery plan

Solo effort is 15–20 hours/week. The early 4–5-week checkpoint budgets 60–80 hours and may deliver
browser sender + Python receiver, measured on real cameras. Full v1 budgets 150–210 hours total
(approximately 8–14 weeks) and includes bidirectional browser transfer, offline installation,
encryption by default, compression, two device pairs, Link Lab and Python package publication.
GitHub Pages is the hosting target; Windows–Android and Windows–iPhone are the physical test pairs.
No backend, accounts, telemetry, native apps, receiver-key exchange, color codes or YOLO in v1.

Sequence: foundation → baseline/physical feasibility → measured portfolio checkpoint → production
browser/PWA → complete security/compression → bounded fountain experiment → release. A failed gate
preserves the library and measurements; it does not authorize an automatic product pivot. See
PROJECT_PLAN.md for numeric gates and IMPLEMENTATION_PLAN.md for stage dependencies and checks.

## Invariants

1. The protocol spec and checked-in vectors govern independent Python/TypeScript implementations.
2. Identical prepared container bytes, session, symbol size, flags and sequence produce identical
   frames. Canonical manifest fixtures fix timestamps. Future encryption fixtures fix nonce and key
   inputs. Independent compressors need cross-decoding, not identical compressed bytes.
3. No native RNG or float-dependent runtime logic in future fountain coding. Channel simulation
   may use a separately seeded RNG because it is not part of the wire contract.
4. Treat every input as untrusted from the first receiver: validate bounds before allocation,
   lock one session, sanitize names, never overwrite silently or auto-open, verify before saving.
5. Frame-format changes increment the wire version and add vectors. Draft v1 became wire v2
   when the session ID increased to 16 bytes; application versions are separate.
6. Default 8 fps; standard browser rates and Python sender remain capped at 10, with 2 fps reduced
   flashing and first-play acknowledgement. On October 7 the user requested browser-only exploratory
   15/20/30 fps targets, with an additional rate-specific acknowledgement. No safe-rate or achieved
   display/receiver-throughput guarantee; high-rate evidence is exploratory, not an acceptance run.
7. No secure-transfer claims before the entire security milestone passes; plaintext is conspicuous.
8. Repeat-mode ships provisionally. Fountain coding must win the bounded measured comparison.
9. No backend, analytics, file uploads or transfer-dependent networking. Self-host every runtime asset.
10. Physical measurements must be raw and reproducible; synthetic fixtures never count as field trials.
11. Update UPDATE.md after each meaningful implementation/documentation/release change with what
    changed, actual verification, blockers and next work. Never record a planned action as completed.

## Tools and structure

Python 3.12 with uv, Segno/OpenCV/zxing-cpp, pytest/Hypothesis/Ruff/mypy; React/Vite/strict TS,
workers and zxing-wasm, Vitest/fast-check/Playwright. Shared vectors and CI are the integration
contract. Static GitHub Pages hosting is selected; remote is Nagaram-Kridey/QR-transfer.

## v1 definition of done

Full browser send/receive, installed/offline verification on Android and iPhone, encrypted defaults,
authenticated frames, bounded decompression, published threat model, cross-language vectors,
observed qualifying results for both directions on two pairs, Link Lab export, package/live URL,
tagged release and demonstrable claims. Payload/rate claims follow the measured tier.

After checkpoint approval, make small conventional commits/PRs and keep CI green. Use ADRs for costly
reversals. Keep job applications in parallel; the early 4–5-week demo is a checkpoint, not completed v1.
