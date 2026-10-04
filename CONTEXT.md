# LumenLink context

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
