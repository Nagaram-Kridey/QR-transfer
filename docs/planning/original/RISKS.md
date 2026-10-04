# RISK REGISTER: LumenLink

Scoring: Likelihood (L) and Impact (I) from 1–5; **Score = L × I**. Review at every phase gate.

## Register

| ID | Risk | Cat. | L | I | Score | Mitigation | Trigger / early signal |
|---|---|---|---:|---:|---:|---|---|
| R1 | Real-world throughput is far below hypothesis (<0.5 KB/s) | Technical | 4 | 4 | **16** | Phase 2 spike *before* UI; tune QR version/ECC/hold; re-scope to small payloads | G2 results |
| R2 | Camera decode reliability <90% across devices (moiré, rolling shutter, focus hunting, glare) | Technical | 4 | 5 | **20** | Hold-time ≥2 camera frames; max-contrast render; fountain absorbs misses; guidance UI (distance/brightness); optional YOLO localiser | Field trials |
| R3 | LT overhead too high at small k; naive loop wins | Technical | 3 | 3 | 9 | Control baseline from day one; GF(2) fallback; RaptorQ/Wirehair fallback; ship naive loop if it wins | G1 |
| R4 | Cross-language non-determinism (PRNG/CDF/float) → Python ≠ TS | Technical | 3 | 5 | **15** | Integer-only PRNG; fixed-point CDF in `vectors/`; conformance in CI from Phase 3 | Any vector mismatch |
| R5 | Browser constraints: iOS PWA camera quirks, `BarcodeDetector` missing, worker/WASM perf | Technical | 4 | 4 | **16** | zxing-wasm worker fallback; test iOS Safari early (Phase 3 smoke test); frame skipping | Phase 3–4 device tests |
| R6 | Frame poisoning / injected droplets corrupt decode | Security | 3 | 4 | 12 | Per-frame HMAC tag; session lock; confirm on new session | Fuzz tests |
| R7 | Offline passphrase brute-force from a filmed stream | Security | 3 | 5 | **15** | High-entropy generated passphrase; PBKDF2 ≥600k; receiver-key (ECDH) mode; documented | Threat review |
| R8 | Malicious file delivery (bomb, traversal name, malware) | Security | 3 | 4 | 12 | Size caps, bounded decompression, sanitised names, never auto-open | Security tests |
| R9 | Decoder DoS (huge `k`, memory growth) | Security | 2 | 3 | 6 | `K_MAX`, one session, bounded queues | Fuzz |
| R10 | Photosensitive-epilepsy risk from flashing frames | Safety | 2 | 5 | 10 | FPS cap ≤10 default, warning, reduce-flashing/dim mode, no strobing color flips | UX review |
| R11 | Prior art makes the project look derivative | Positioning | 4 | 3 | 12 | Honest prior-art doc; position as browser-based/serverless/interop + measured study; do not claim novelty | G0 |
| R12 | Scope creep (two implementations, stretch goals) | Delivery | 4 | 4 | **16** | Phase gates; stretch strictly after MVP; time-box each phase | Phase overrun >30% |
| R13 | Opportunity cost: weeks spent while job hunting | Career | 4 | 4 | **16** | Resume checkpoint at Phase 4; apply in parallel; stop rule at G2 fail | Applications pending |
| R14 | Poor skill signal for "Python Developer" (project is TS/crypto/vision heavy) | Career | 3 | 3 | 9 | Python is the reference impl + CLI + PyPI package, typed, tested; keep a separate Django/DRF project | Resume review |
| R15 | Inflated or unverifiable metrics hurt credibility in interviews | Career | 3 | 5 | **15** | Raw CSVs committed; only measured numbers on resume; rehearse explaining fountain codes and the threat model | Interview prep |
| R16 | Hard to automate camera tests → regressions slip in | Quality | 3 | 3 | 9 | Fake camera stream E2E; degraded-video fixtures; simulator for logic | CI flake rate |
| R17 | Dual-use: tool can move data past DLP controls | Ethical | 2 | 3 | 6 | Document intended use; no stealth features; threat model includes this | n/a |
| R18 | Dependency/supply-chain issues (zxing-wasm, crypto libs) | Security | 2 | 3 | 6 | Pin versions, audit in CI, prefer WebCrypto, SRI | Audit failures |
| R19 | Insecure MVP gets shown/claimed as "secure" before hardening | Security/Integrity | 3 | 4 | 12 | README banner, Phase 4 wording rule, CONTEXT invariant 7; encrypted-by-default only from Phase 5 | Any demo or resume line using "secure"/"encrypted" pre-Phase 5 |

## Top risks (score ≥ 15)
R2 camera reliability (20) · R1 throughput (16) · R5 browser constraints (16) · R12 scope creep (16) · R13 opportunity cost (16) · R4 determinism (15) · R7 offline brute-force (15) · R15 metric credibility (15)

## Assumptions to validate (each maps to a phase gate)
| # | Assumption | Test | Phase |
|---|---|---|---|
| A1 | A phone camera reads ≥600 B QR frames at ≥8 fps from ~20–30 cm | Spike sweep | 2 |
| A2 | Effective throughput ≥1 KB/s after overhead | Spike CSV | 2 |
| A3 | LT+GF(2) overhead ≤15% for k≥200 | Simulator | 1 |
| A4 | zxing-wasm in a worker keeps ≥15 decode attempts/s on a mid-range phone | Device test | 4 |
| A5 | iOS Safari PWA standalone mode grants camera reliably | Device test | 3–4 |
| A6 | PBKDF2 600k completes <1.5 s on target phones | Device test | 5 |
| A7 | Python and TS agree byte-for-byte | Vectors | 3 |

## Kill and pivot criteria
1. **G2 fail** (<80% success at 10 KB): stop the transfer product; keep codec + simulator write-up; pivot to SecureQR.
2. **G2 partial**: re-scope to small-secret transfer; update README claims.
3. **Naive loop beats LT** at realistic k: ship the naive loop; document the finding (a legitimate result).
4. **Schedule**: if Phase 4 is not done by week 6, cut Phases 5–7 to the minimum (passphrase encryption + benchmarks) and finish.
