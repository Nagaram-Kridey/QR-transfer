# CONTEXT: LumenLink

Read this first. It is the single source of truth for *why* the project exists and *how* work is done.
Useful as a project-context file for Claude Code / any AI pair-programmer.

## 1. One-line purpose
Transfer small-to-medium files between two devices using only a display and a camera, reliably and securely,
with no network and no server.

## 2. Why this project (owner context)
- Owner: final-year CS graduate (AI specialisation); ~1 year automation/testing internship; certs in AWS, MongoDB,
  Salesforce, GitHub. Existing projects: RAG scraper, voice assistant, YOLO traffic analyzer.
- Target roles: **Python Developer** (primary), backend/full-stack/AI (secondary).
- Goal: add a project that is **different in shape** from existing ones and demonstrates protocol design,
  applied cryptography, real-time vision, testing rigor, CI/CD and deployment, without lowering the level of the resume.
- **Honest gap:** this project does *not* exercise Django/DRF/SQL. Keep other portfolio work for that.

## 3. Goals
1. A working, deployed, installable web app (send + receive) and a pip-installable Python CLI.
2. A written protocol spec with conformance vectors; two independent implementations that interoperate.
3. Measured (not claimed) throughput and reliability across real device pairs.
4. Encrypted and authenticated by default; documented threat model.
5. Test culture: unit, property-based, simulator, conformance, virtual-camera E2E.

### Scope tiers (set at the Phase 2 gate)
| Tier | Condition | Claim |
|---|---|---|
| A (full) | ≥90% of 20 trials at 100 KB, ≥1 KB/s | General small-to-medium file transfer (≤~1 MB) |
| B (re-scoped) | Reliable only for ≤10–20 KB at ~0.5 KB/s | Small secrets/config transfer only (keys, certs, Wi-Fi creds); README and DoD use Tier B numbers |
| C (stop) | <80% at 10 KB | Stop product; keep codec/simulator write-up; pivot to SecureQR |

## 4. Non-goals
- Competing with AirDrop/Bluetooth/USB on speed or convenience.
- Files larger than ~1 MB (soft cap; configurable).
- A backend, accounts, telemetry, analytics.
- Novel cryptography. Only vetted primitives (WebCrypto / `cryptography`).
- Native mobile apps (PWA only for v1).

## 5. Constraints
- Time-boxed. **MVP must be resume-ready in ~4–5 weeks** (see PHASE_PLAN). Owner is job-hunting in parallel.
- Solo developer, ~15–20 h/week.
- Zero server cost: static hosting only.
- No metric goes on a resume or README unless it exists in `docs/benchmarks/` with the raw data.

## 6. Tech stack
| Area | Choice |
|---|---|
| Reference impl / CLI | Python 3.12, `segno` or `qrcode`, OpenCV, `pyzbar`/`zxing-cpp`, `cryptography`, `zstandard`, pytest, hypothesis, ruff, mypy |
| Web app | TypeScript (strict), React, Vite, Web Workers, WebCrypto, zxing-wasm (primary) / BarcodeDetector (fast path), vitest, Playwright |
| CI/CD | GitHub Actions: lint → typecheck → test → build → deploy |
| Hosting | S3 + CloudFront (uses AWS cert) or GitHub Pages; strict CSP |
| Docs | Markdown + Mermaid; ADRs in `docs/adr/` |

## 7. Repository layout
```
lumenlink/
├─ docs/ (spec/, adr/, benchmarks/, threat-model.md)
├─ python/ (src/lumenlink/{frame,base45,fountain,crypto,container,qr_io,sim,cli}.py, tests/)
├─ web/ (src/{codec,crypto,camera,ui,workers}/, e2e/, public/)
├─ vectors/ (conformance JSON shared by both implementations)
└─ .github/workflows/
```

## 8. Invariants (never break)
1. `docs/spec/` + `vectors/` define the protocol. Code conforms to them, not the reverse.
2. Python and TypeScript must produce byte-identical frames for the same inputs and seeds.
3. No language-native RNG or float-dependent logic inside the fountain code. Integer-only PRNG, fixed-point tables.
4. Received data is untrusted: size caps, no auto-open, sanitised filenames, bounded decompression.
5. Any change to the frame format bumps the version nibble and adds new vectors.
6. Safety: default ≤10 fps; photosensitivity warning on first Send; never ship a flicker/strobe mode.
7. No security claims (README, resume, demo) before Phase 5 is complete; MVP builds are plaintext-capable.
8. The fountain code must beat the naive repeat-loop baseline on measured time-to-complete, or it is removed.

## 9. Glossary
- **Symbol**: fixed-size slice of the container (source block).
- **Droplet / frame**: one transmitted fountain-coded symbol plus header and tag.
- **k**: number of source symbols. **ε (overhead)**: extra frames needed beyond k, as a fraction.
- **Systematic prefix**: first k frames carry raw source symbols (lucky clean pass = zero overhead).
- **Peeling**: belief-propagation decoder that resolves degree-1 droplets iteratively.
- **Link Lab**: in-app benchmark mode.

## 10. Working agreements
- Conventional commits; small PRs even when solo; CI must be green before merge.
- Every module ships with tests; protocol code ships with property-based tests.
- Decisions that cost >1 day to reverse get an ADR.
- Spikes that retire risk come **before** polish (see Phase 2 gate).

## 11. Definition of done (v1.0)
- **Tier A:** phone → laptop and laptop → phone transfer of a 100 KB file succeeds in ≥90% of 20 trials on at least 2 device pairs. **(Tier B: same criterion at the re-scoped payload size.)**
- Python ⇄ TypeScript conformance vectors pass in CI.
- Encrypted mode default; per-frame tag verified; threat model published.
- Live URL, installable PWA, demo GIF/video, benchmark tables with raw data, tagged release, PyPI package.
- `docs/prior-art.md`, `docs/threat-model.md`, README limitations and intended-use sections published.
- Owner can whiteboard the pipeline and defend every ADR and every number (interview-ready).
