# Browser QR autoframing experiment

Accepted for staged local implementation on **2026-10-06 (Asia/Kolkata)**. This is a browser-first
experiment targeting faster verified transfers on the Samsung A17 5G, not an adoption decision.
Full-frame scanning remains the default. Physical G2 is still pending.

Current status **2026-10-07 (IST)**: CP-02B.1 diagnostics is locally implemented; 69 unit and
46 browser checks pass, and development/testing explicitly agree PASS on the same frozen revision.
The user approved its commit/push/Pages deployment on October 7; `6fb59f3` is delivered with
hosted CI, Pages and both independent live reviews passing.
CP-02B.2 and CP-02B.3 have not started.
See CHECKPOINTS.md and the latest UPDATE.md for the precise packet and measured work interval.

## Checkpoints and budget

| Checkpoint | Engineering budget | Required outcome |
|---|---|---|
| CP-02B.1: diagnostics | 2 hours | Instrumented full-frame control and bounded, separately linked exports |
| CP-02B.2: tracking | 3 hours implementation + 3 hours tests/docs | Opt-in native-pixel ROI and independent adversarial review |
| CP-02B.3: physical comparison | Physical trials scheduled separately | Frozen comparisons and explicit adopt/reject decision |

Work on one checkpoint at a time. Development and testing agents must agree on the same final
revision before user approval. Stop before commit/push, deployment or the next checkpoint until
the user approves the concrete packet. Include Pages deployment explicitly in that packet.
Maintain UPDATE.md, CHECKPOINTS.md and MODEL_HANDOFF.md after meaningful changes.

Hard engineering cap: eight hours, including tests/docs. Stop with full-frame default if the candidate
is incomplete, unsafe, inconclusive or has insufficient plausible performance headroom. Record
elapsed implementation/review time separately from physical trial time and approval waits. Parallel
agent elapsed time is not a measurement of human engineering effort. If this becomes the existing
G2 eight-hour investigation, debit that allowance; do not grant another automatic tuning period.

## Debate and hypotheses

- Smaller images may reduce pixel-dependent work, but capture/copy/fixed overhead may dominate.
  Faster processing can increase scan frequency and duplicate work under the unchanged 33 ms sampler.
- Tracking starts after a valid QR decodes. It cannot rescue unreadable initial acquisition, autofocus,
  poor exposure, missing source symbols, sender pauses or incorrect trial timeouts.
- Tight crops may cut quiet zones; portrait downscaling may remove more detail than the control.
- Stale coordinates, abrupt movement and same-session duplicate decoys may trap the crop. Full scans
  and paired recovery tests must challenge this, rather than assume an outline implies improvement.
- The existing 434/506-symbol timeout is not bottleneck proof. Conditionally at 8 fps, the earliest
  506 distinct symbols require (506 - 1) / 8 = 63.125 seconds, exceeding the selected 60 seconds.
  Actual source FPS/payload/settings remain unconfirmed. Preserve that observation unchanged.

Illustration only: 960x540 = 518,400 pixels; 420x420 = 176,400 (about 66% fewer). If 30% of attempt
time is fixed and 70% scales with pixels, the candidate saves about 46% per cropped attempt, or 42%
with 10% full attempts. This is not a measured or predicted transfer gain. Five full attempts process
2.59 million pixels/second; 25 crops process 4.41 million before fallback. Pixel counts and elapsed
timing proxies do not establish CPU cycles or battery savings.

## CP-02B.1: instrument the control

Keep camera constraints, width-960 resize, 33 ms polling, decoder options and one image in flight.
Record submitted/completed images, pixels, capture/readback time, worker round-trip, decode/admission
time, unique symbols, duplicates/rejections, first valid admission and full-scan gaps. Preserve the
strict observation-v1/CSV contracts. Export a separate diagnostics document linked to the exact
UTF-8 observation export's SHA-256, with aggregate metrics and the latest 256 scan records plus an
explicit discarded-record count. Do not export camera pixels or QR text.

Final-attempt diagnostics must precede completion/worker termination. Cancellation, timeout,
capture failure and in-flight interruption retain honest partial measurements. Reset and stale
worker/hash results must not revive abandoned exports. Frame imports are not camera diagnostics.
Timing uses each context's monotonic clock; cross-context absolute timestamps must not be subtracted.
No ROI selector, corner tracking, acquisition changes, codec API changes or second frame hash belongs
to this checkpoint. Link exact sidecar semantics and actual checks from its review packet.

## CP-02B.2: bounded post-acquisition tracking

1. Begin each timed trial with full-frame acquisition; never seed tracking while merely armed.
2. Use the installed ZXing result corners only after existing receiver validation/session admission
   succeeds, including valid duplicates. No second protocol decode/hash is needed.
3. Map corners using the submitted attempt's native crop origin and actual per-axis resize factors.
4. Take an axis-aligned box; pad each side by max(12 native pixels, 20% of that axis's box dimension),
   round outward and clip to the native image. Reject nonfinite/degenerate/invalid geometry.
5. Crop before Canvas readback/worker transfer. No upscaling; output longest side <=960 and pixel count
   no greater than the control's actual output. Bypass crops covering >=80% of the native image or
   requiring stronger downscaling than the full control (including portrait feeds).
6. Two unsuccessful ROI attempts or 500 ms without valid admission return to full acquisition at the
   next processing opportunity. A separate one-second full-scan timer has priority and cannot be
   postponed by duplicates. Record actual gaps because busy work can delay dispatch.
7. Keep one decode attempt per image. Clear tracking on trial/reset/camera/dimension changes; ignore
   stale geometry using attempt identity and capture transforms.

UI: Full frame / Auto region selector locked during a trial; stable preview plus outline and
Searching/Tracking/Reacquiring state. Extend only internal camera worker messages for identity,
accepted geometry and timings. Preserve saving, integrity checks and plaintext labeling.
Exclude Python receiver changes, camera zoom/focus controls, ML/YOLO, perspective correction,
sampler redesign and transport/security changes.

## Tests and physical adoption

Test odd/portrait transforms, clipping/quiet zones, rotations/perspective, tiny/near-full QR codes,
movement/occlusion, unrelated sessions, duplicate decoys, malformed geometry, stale results and
reset/resize/background/timeout/cancellation. Run browser lint/types, Vitest, Playwright, production
build and independent cross-language conformance checks.

Use 20 paired known-reentry replay events. Every event recovered by full control must recover with
ROI. Reacquisition p95 must be <= control p95 +250 ms. Keep every outcome and distinguish the expected
moved target from stale decoys. Calculate event percentiles from the complete event dataset, never
from the last-256 scan buffer. Synthetic evidence does not qualify phone performance.

Before physical trials confirm computer/camera identity and complete OS/Chrome versions. Use public
10/100 KiB fixtures with correct 60/300-second timeouts. Freeze settings, distance, lighting, payload,
symbol size/FPS/ECC and a repeatable movement procedure after exploration. Compare steady-centered
and gentle lateral-motion conditions while the QR remains fully visible. Use the same deployed
build, 20 trials per mode per condition, balanced paired order, all failures/cancellations retained,
and distinct frozen run IDs. Do not pool payloads, variants or conditions.

Adopt only if all pass:

- >=15% lower median verified completion in the predeclared movement condition.
- >=18/20 successes in each mode/condition and no observed success decline.
- <=10% worse p95 completion in either condition; <=10% worse median in the steady condition.
- Paired replay recovery checks pass.

Report successful-trial timing statistics beside all outcomes. No processing-only adoption route.
Failure/inconclusive evidence preserves the research with full-frame shipping default. Physical G2,
two-direction/device qualification, PWA and security gates remain independent and unfinished.
