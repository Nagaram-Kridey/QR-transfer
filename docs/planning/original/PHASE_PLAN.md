# PHASE PLAN: LumenLink

Assumes ~15–20 h/week. **The order is deliberate: retire the scariest risk (does it work through a real camera?) before building any UI.**
Each phase has measurable exit criteria and a go/no-go gate. Targets are hypotheses; adjust only with data.

| Phase | Weeks | Theme | Gate |
|---|---|---|---|
| 0 | 0.5 | Spec, prior art, scaffold | G0 |
| 1 | 1–2 | Python codec + simulator | G1 |
| 2 | 2–3 | **Real-camera spike (risk retirement)** | **G2 (critical)** |
| 3 | 3–4 | Web sender + TS codec + conformance | G3 |
| 4 | 4–5 | Web receiver, PWA → **MVP, resume-ready** | G4 |
| 5 | 5–6 | Security hardening | G5 |
| 6 | 6–7 | Field benchmarks, E2E, CI/CD, release | G6 |
| 7 | stretch | Two-way, color, YOLO, ESP32 | none |

> **Job-hunt rule:** add the project to your resume at the end of Phase 4 with only verified numbers. Phases 5–7 improve it, but must not delay applications.

---

## Phase 0: Spec, prior art, scaffold (≈3–4 days)
**Tasks**
- [ ] Prior-art review: Cimbar/libcimbar, Blockchain Commons UR (animated QR + fountain codes), TXQR, QR-based wallet flows. Write `docs/prior-art.md` with a "what we do differently / what we reuse" table. *Verify each claim from primary sources.*
- [ ] Draft `docs/spec/SPEC-v0.1.md` from `ARCHITECTURE.md §3–6`
- [ ] Repo scaffold, ruff/mypy/eslint/tsc configs, CI skeleton, ADR template, `vectors/` format
- [ ] Write the experiment protocol for Phase 2 (devices, distances, lighting, trial count, CSV columns)

**Exit:** spec v0.1, prior-art table, green empty CI. **G0:** if prior art already delivers the *same niche* in a polished, open, browser-based form, reposition (see RED_TEAM A3) before proceeding.

## Phase 1: Python codec + simulator (≈1.5 weeks)
**Tasks**
- [ ] Base45, frame pack/unpack, tag, container, manifest
- [ ] `mulberry32`, FNV-1a, fixed-point robust-soliton CDF, neighbour selection
- [ ] LT encoder (systematic + repair) and peeling decoder, then GF(2) Gaussian fallback
- [ ] **Naive repeat-loop baseline** for comparison
- [ ] Channel simulator: random loss, burst loss, duplicates, reorder
- [ ] Property-based tests; overhead-vs-k plots (k = 50…2000)
- [ ] Emit first conformance vectors

**Exit criteria (hypotheses):** success ≥ 99% over 1,000 sim trials at 30% random loss; overhead ε ≤ ~15% for k ≥ 200 with fallback; parser fuzz clean; coverage ≥ 90% on codec.
**G1:** if ε > 30% at k = 200 even with GF(2) fallback → switch to RaptorQ/Wirehair binding, or drop fountain for naive loop + RS erasure. If the naive loop wins on time-to-complete for realistic k, **ship the naive loop** and document why.

## Phase 2: Real-camera spike (≈1 week), the critical gate
**Tasks**
- [ ] CLI sender renders frames in a window (OpenCV) and loops
- [ ] Receiver captures from a phone camera feed / webcam and decodes with zxing-cpp
- [ ] Sweep: QR version/density, ECC level, FPS, hold-time, distance, brightness, 2+ device pairs
- [ ] Base45 vs raw-byte benchmark (ADR-001)
- [ ] Record raw CSV in `docs/benchmarks/spike/`

**Exit criteria (hypotheses):** ≥ 90% success across 20 trials for a 100 KB payload at ≥ 1 KB/s effective on one device pair.
**G2 (critical)**, outcome sets the scope tier in `CONTEXT.md §3`:
- **Pass** → continue as planned.
- **Partial** (works, but only ≤ 10–20 KB at ~0.5 KB/s) → **re-scope to "small secrets and config transfer"** (keys, seed phrases, certs, Wi-Fi creds). Still a credible niche, but lower the file-size claims everywhere.
- **Fail** (< 80% at 10 KB) → stop; keep the codec + simulator as a library write-up and pivot to SecureQR (signed credentials) from the earlier plan.

## Phase 3: Web sender + TS codec (≈1.5 weeks)
**Tasks**
- [ ] Vite + React + TS strict scaffold; design tokens; dark/light
- [ ] TS port of framing/Base45/PRNG/LT encoder; **pass all `vectors/` produced by Python**
- [ ] Send screen: file/text input, density/FPS/hold, canvas QR, loop counter, pause/play
- [ ] Photosensitivity warning + FPS cap
- [ ] **iOS Safari + Android Chrome smoke test** (camera permission, installed-PWA mode, worker/WASM decode of a static QR). Do this now, not in Phase 4
- [ ] Repeat-mode (flag bit2) in both implementations
- [ ] vitest + fast-check; CI runs conformance

**Exit:** Python-generated stream decodes in TS and vice versa on all vectors; Send screen usable on mobile viewport.
**G3:** any byte mismatch blocks. Fix determinism (PRNG/CDF) first. **Slip rule:** if Phase 3 runs >30% over, ship TS *sender-only* and use the Python CLI as receiver, so the MVP is not blocked on the TS decoder.

## Phase 4: Web receiver + PWA → **MVP** (≈1.5 weeks)
**Tasks**
- [ ] Camera access + permission UX (iOS Safari + Android Chrome + desktop)
- [ ] Decoder worker (`BarcodeDetector` fast path, zxing-wasm fallback), frame skipping
- [ ] Receiver state machine; symbol-recovery grid; stats; ETA
- [ ] Save/download, hash verification, error states
- [ ] PWA manifest + service worker; verified offline after first load
- [ ] Deploy to static hosting with strict CSP

**Exit:** live demo: phone → laptop and laptop → phone, 100 KB, ≥ 90% of 20 trials on ≥ 1 pair; installable; works with network disabled.
**G4 → resume checkpoint.** Capture a demo GIF, update README with real numbers only. **Describe it as a transfer demo, not a secure transfer**: security claims wait for Phase 5. Scope claims follow the tier set at G2.

## Phase 5: Security hardening (≈1 week)
**Tasks**
- [ ] Manifest + AES-256-GCM + PBKDF2 (≥ 600k) + HKDF; diceware passphrase generator
- [ ] Per-frame HMAC tag; reject-and-count bad frames
- [ ] Resource caps (`K_MAX`, one session, confirm on session change); bounded decompression; filename sanitiser
- [ ] `docs/threat-model.md` (STRIDE-style table), fuzz tests, `pip-audit` / `npm audit` in CI
- [ ] *Stretch:* Receiver-key mode (X25519): receiver shows its public-key QR first

**Exit:** poisoned-frame, oversized-`k`, bomb and traversal-filename tests all pass; threat model published.

## Phase 6: Field benchmarks, E2E, release (≈1.5 weeks)
**Tasks**
- [ ] Device-pair × payload × density matrix, 20 trials per cell; commit raw CSV and plots
- [ ] Link Lab screen exporting JSON
- [ ] Playwright E2E with fake camera video (clean + degraded variants)
- [ ] Full CI/CD: lint → type → test → conformance → E2E → build → deploy on tag
- [ ] Lighthouse PWA ≥ 90; `pip install lumenlink` on PyPI; tagged `v1.0.0`
- [ ] 60–90 s demo video; README with limitations, safety and intended-use sections; blog-style write-up
- [ ] Publish `docs/prior-art.md` (updated) and `docs/threat-model.md`; final claims audit: every number traced to a CSV
- [ ] **Interview prep:** whiteboard the full pipeline; derive why a systematic prefix helps; explain robust soliton and peeling; defend each ADR; rehearse the threat model and the "why not AirDrop/USB?" answer

**Exit:** everything in CONTEXT §11 (Definition of Done).

## Phase 7: Stretch (pick by interest/role target)
| Option | Skill signal |
|---|---|
| Two-way ACK / receiver-key handshake | Protocol design, ECDH |
| Color / multi-channel high-density frames | Information theory, image processing |
| YOLO QR localiser for degraded frames | Ties to existing CV project |
| Adaptive rate control from Link Lab data | Control loops |
| ESP32 + small display sender | Embedded |

---

## Resume bullets unlocked (fill with *measured* numbers only)
- **After P4:** Built an offline, serverless screen-to-camera file-transfer PWA (React/TypeScript + Python) using fountain-coded animated QR streams; transferred **[X] KB** files at **[Y] KB/s** with **[Z]%** success across **[N]** trials on **[M]** device pairs.
- **After P5:** Secured transfers with AES-256-GCM, PBKDF2/HKDF key derivation and per-frame HMAC; wrote a threat model and fuzz/property tests covering poisoned frames, decompression bombs and path traversal.
- **After P6:** Designed a versioned wire protocol with cross-language conformance vectors (Python ⇄ TypeScript); automated lint/type/test/E2E (Playwright virtual camera) and static deployment through GitHub Actions to AWS S3/CloudFront.

**ATS keywords gained:** protocol design, fountain codes / erasure coding, applied cryptography (AES-GCM, PBKDF2, HKDF, ECDH), TypeScript, React, Web Workers, PWA, WebCrypto, OpenCV, computer vision, property-based testing, fuzzing, Playwright, CI/CD, GitHub Actions, AWS S3/CloudFront, threat modelling, PyPI packaging.

## Weekly cadence
Mon plan → build → Thu test/benchmark → Fri write-up (ADR, benchmark CSV, README delta). Each Friday: *one measured number added to the log.*
