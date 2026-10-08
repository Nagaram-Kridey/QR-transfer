# CP-02D development review

Date: 2026-10-08, Asia/Kolkata. Base: `61dab08`. Verdict: **PASS for the bounded local
checkpoint; no known unresolved in-scope blocker.** Commit, push and Pages deployment require
the user's checkpoint approval. This is a throughput investigation plan and visibility repair,
not a demonstrated transfer-speed improvement.

## Reviewed revision

Independently recomputed the same final six-path fingerprint as the coordinator:
`b0955b1ca0b6c531937ba5295fe7b0435debbe3ce74cf7490930a3f0984a64a6`.

The explicit ordinal order is:

- `IMPLEMENTATION_PLAN.md`
- `docs/planning/THROUGHPUT_PLAN.md`
- `web/e2e/camera.spec.ts`
- `web/e2e/harness.spec.ts`
- `web/src/ui/App.tsx`
- `web/src/ui/style.css`

Normalize each UTF-8 file's CRLF to LF, calculate its lowercase SHA-256, concatenate
`path:hash\n` records in that order, then SHA-256 the UTF-8 concatenation. Administrative
checkpoint/log/handoff/review records are outside this fingerprint; they must describe this
same frozen candidate. No source/test edits followed the successful final run.

## Debate and implemented behavior

Read and challenged the complete throughput plan with the independent adversarial agent before
source edits. We agree to measure verified original bytes over total elapsed time, distinguish
repeated camera reads from missing-symbol repeat tails, and compare density, display size and
hold timing using complete failure-inclusive data. Capture/ROI changes need measured headroom.
Compression remains Stage 4; the bounded LT study remains Stage 5. The backlog does not replace
G2, physical ROI, PWA, security or portfolio work.

Missing-frame feedback remains a separately approved feasibility study: independent bounded
schema, session/prepared identity, stale/replay/cancel checks, finite retransmission priority,
periodic full cycles and latency/geometry evidence. Plaintext feedback would be forgeable
advisory input; it cannot authenticate receiver completion or remove final file verification.
No feedback, new transport, sampler or speed algorithm was implemented here.

The sender's six-pixel dark frame is an external CSS shadow around the existing canvas. There
is no wrapper or drawing change: the four-module white quiet zone, original canvas pixels,
integer scaling and density-fit checks remain intact. Receiver Auto region adds a dark mask
outside the admitted padded region and a dark/white outline. Its interior is untinted, input
events pass through, and native SVG coordinates retain `xMidYMid meet` alignment with the
contained video. UI text identifies the padded scan region rather than promising an exact QR
perimeter or faster transfers.

Adversarial testing reproduced a portrait layout defect: a true 720 x 1280 source at a 390-pixel
viewport produced about 75.7 pixels of overlay misalignment. The video was still participating
in the aspect-ratio grid's intrinsic layout. Constraining the displayed video absolutely to
the existing camera stage fixed this visual mismatch; native camera dimensions, capture,
readback, scheduler, worker, tracker and codecs were not changed. The original assertions were
retained and the final portrait/landscape comparisons pass below 0.1 pixels.

## Actual verification

Development ran browser lint, strict type checking and production build successfully, inspected
the final source diff, read both final test additions and independently reproduced the final
fingerprint. Coordinator checks also passed: 147 Vitest cases, shared Python fixture reproduction,
four independent TypeScript vectors verified by Python, default/project-base builds and restoration
of the default build. The coordinator visually inspected the sender and receiver screenshots.

The adversarial agent reports 49/49 relevant Playwright cases passing after the portrait fix,
including clean/degraded actual-worker transfers in both scanning modes, exact saved files,
diagnostic linkage, native overlay alignment, resize/miss recovery, reset, backgrounding, timeout
and late-response clearing. Sender checks compare every canvas RGBA pixel and all four white
quiet-zone margins against the exported-frame QR at desktop symbol sizes 256/512/1024 and mobile
256 across Chromium, Firefox and WebKit. All 12 final full-page sender screenshots independently
decode through Python zxing-cpp and the wire checksum. Screenshots/traces remain ignored artifacts.

These are software and synthetic optical checks. They establish neither Samsung A17/iPhone
physical compatibility nor a speed, detection, energy, ROI adoption or G2 result. Full frame
remains the default, capacity remains the approved experimental 5 MiB and the app remains plaintext.

## Agreement and next step

Development agrees with the adversarial findings, the unrelaxed portrait regression and the
final passing result on the frozen fingerprint above. No confirmed in-scope issue remains.
The coordinator should obtain the independent testing report on that same fingerprint, refresh
the administrative logs, then present CP-02D for explicit approval including any proposed Pages
deployment. Physical comparisons and future throughput mechanisms remain separate checkpoints.
