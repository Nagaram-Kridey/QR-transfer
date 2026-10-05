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

Stage 1 software exists; physical feasibility remains unmeasured. Current modes are plaintext,
uncompressed repeat-mode. The browser is a test harness, not a completed installable PWA.
No security, mobile support, field throughput or v1 release claims have been earned yet.

As of **2026-10-05 (IST)**, application implementation remains paused at the user's request;
the follow-up task creates documentation for the next model. Resume only when the user directs it.
On resumption, the next required work is physical camera evidence and the G2 decision, before
production PWA/security/fountain work. Hardware and observations are needed from the real devices.

The authorized remote is `https://github.com/Nagaram-Kridey/QR-transfer.git`; preserve its history.
Implementation commit `8eb1d1c` was tested and deployed on 2026-10-04. The
[live feasibility harness](https://nagaram-kridey.github.io/QR-transfer/) and hosted checks are
documented in the [verification record](docs/verification/2026-10-04.md). These historical checks
do not establish real-phone support. Consult Git and the latest log for subsequent commits.

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
6. Default 8 fps, maximum 10; first-play acknowledgement, reduced-flashing option, no strobe mode.
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

Make small conventional commits/PRs and keep CI green. Use ADRs for costly reversals. Keep job
applications in parallel; the early 4–5-week demo is a checkpoint, not completed v1.
