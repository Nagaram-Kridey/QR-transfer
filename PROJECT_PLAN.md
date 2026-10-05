# LumenLink project plan

Accepted direction: Python protocol engineering plus an interoperable browser client for small,
offline screen-to-camera transfers. This is a portfolio/engineering study, not a novel channel.

## Delivery decisions

- Solo developer, 15–20 hours/week; early portfolio checkpoint in 4–5 weeks.
- Approximately 60–80 hours to the checkpoint; 150–210 total for v1, approximately 8–14 weeks.
- GitHub Pages; physical Windows–Android and Windows–iPhone testing.
- Python 3.12, Node 24, TypeScript strict; no backend, accounts, telemetry, or file uploads.
- Repeat-mode first. Encryption, compression, PWA installation, Link Lab and fountain research
  remain behind the physical-feasibility gate.
- MIT license. Distribution/package availability must be checked before publishing.

## Milestones

| Milestone | Required evidence | Current status |
|---|---|---|
| Foundation | Spec, vectors, passing checks, reproducible setup | Implemented; hosted CI passed on Windows/Linux |
| Feasibility | Python CLI + minimal browser harness, physical camera trials | Software + user-reported smoke; measured acceptance pending; evidence helper approved for delivery |
| Early portfolio demo | Qualified real-camera result, hosted sender, measured README/demo | Harness deployed; physical gate pending |
| Browser workflow | Reliable mobile receiving, installable PWA, verified offline startup | Pending gate |
| Secure mode | Both-language crypto vectors, adversarial tests, threat model | Planned; current build is plaintext |
| Transport decision | Bounded LT study versus repeat baseline, published ADR | Planned; repeat is provisional |
| v1.0 | Both directions on two pairs, Link Lab, PyPI, tagged release and demo | Planned |

## Feasibility gate

Use frozen settings, 20 trials per cell and per direction; never pool devices or directions.
Cells include payload, hardware, browser/OS versions, symbol size, FPS, ECC, distance and lighting.
Use original-file KiB for rates. Timing starts when an aligned receiver enables processing and
ends after verification. Timeout is max(60 seconds, 3 × payload_KiB seconds). Keep failures.

| Outcome | Evidence | Decision |
|---|---|---|
| Tier A | ≥18/20 at 100 KiB; median successful rate ≥1 KiB/s | Measured small-file scope |
| Tier B | A fails; ≥18/20 at 10 KiB and ≥0.5 KiB/s | Small file/configuration scope |
| Inconclusive | 16–17/20 at 10 KiB, or rate below Tier B | One eight-hour tuning investigation, then rerun |
| Stop expansion | <16/20 at 10 KiB, or B still unmet after investigation | Preserve library, simulator and write-up |

One pair establishes initial feasibility. Complete v1 requires both directions on Windows–Android
and Windows–iPhone. Do not infer 1 MiB camera reliability from a codec limit. 18/20 means observed
success, not a statistical population guarantee.

## Scope control

The early checkpoint may be a browser sender plus Python receiver. It is not the completed PWA
and is not secure. Ship only claims backed by evidence. Slippage must not produce partial crypto.
Fountain adoption requires ≥15% better median completion time, no success decrease, ≤10% p95
regression, bounded resources, and a conformant browser port within the 30-hour study budget.
Keep repeat on ties or inconclusive findings. No RaptorQ/Wirehair/RS detours in this release.

Backend services, native mobile apps, receiver-key exchange, color codes, YOLO and AWS migration
are outside v1. No automatic pivot to another unspecified product.

## Governance

The user resumed implementation on 2026-10-05 with explicit phase/feature approval checkpoints.
Follow [CHECKPOINTS.md](CHECKPOINTS.md): development and adversarial-testing agents must agree on
the reviewed revision, then wait for user approval before committing/pushing it or starting the next
checkpoint. Earlier standing permission to push is superseded. Windows + Android is available for
initial physical trials; iPhone qualification remains required for complete v1.

Small conventional commits/PRs; green checks before merge; ADR for costly reversals. Every Friday
record actual progress and evidence, including failed experiments. No fabricated throughput,
success rates, installed-PWA support or security claims. Original input documents are preserved
under `docs/planning/original/`; those archived drafts are historical, not normative.
