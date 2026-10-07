# CP-02B.2 independent testing review

Date: **2026-10-07, Asia/Kolkata**. Reviewer: `/root/checkpoint_testing`.
Base: `8fad9841decbe69a0e1b9e90682efccb47b51a7d`.
Scope: opt-in browser ROI prototype, diagnostics-v2 and the subsequently requested experimental
sender targets with exploratory recording support. Physical adoption remains a separate checkpoint.

## Final revision and verdict

Source/test/workflow freeze SHA-256:
`27adca065b0f31a1ee319705c731934836dba999146aa07d3731c61a7cd44326`.

I independently calculated this fingerprint by sorting these 18 paths, normalizing UTF-8 CRLF to LF,
hashing each file, concatenating `path:sha256\n` lines, then hashing that concatenation:

- `.github/workflows/ci.yml`
- `python/src/lumenlink/benchmark.py`
- `python/tests/test_benchmark.py`
- `tools/generate_reentry_fixtures.py`
- `web/e2e/camera.spec.ts`
- `web/e2e/harness.spec.ts`
- `web/e2e/reentry.spec.ts`
- `web/src/camera/geometry.test.ts`
- `web/src/camera/geometry.ts`
- `web/src/camera/tracker.test.ts`
- `web/src/camera/tracker.ts`
- `web/src/diagnostics/camera.test.ts`
- `web/src/diagnostics/camera.ts`
- `web/src/ui/App.tsx`
- `web/src/ui/style.css`
- `web/src/workers/messages.ts`
- `web/src/workers/receiver.worker.test.ts`
- `web/src/workers/receiver.worker.ts`

**PASS for the scoped experimental prototype and rate additions. No known new unresolved blocking
issue remains within this scope.** This is not a claim of universal recovery, faster transfers,
physical reliability, or absence of all bugs. The inherited single-QR selection limitation below
remains explicit; the candidate preserves full-frame as default and does not claim ROI adoption.
The user's latest instruction authorizes GitHub/Pages delivery after final review and checks;
this agent has not committed, pushed or deployed anything.

## Adversarial review and tests

The pure geometry tests cover ordered convex corners, malformed/nonfinite/degenerate shapes,
out-of-bounds transforms, separate rounded axis scales, native crop offsets, minimum/percentage
padding, outward clipping, rotated/perspective boxes and contain-preview offsets. Five hundred
fixed-seed generated cases verify no upscaling, output long-side/pixel limits and sampling at least
as detailed as the actual rounded full-frame control. Portrait crops that would lose detail and
near-full regions are bypassed.

Tracker and worker tests verify full acquisition before admission, accepted unique/duplicate geometry,
unrelated-session and malformed-frame rejection, two ROI misses, the 500 ms admission expiry,
independent one-second full probes despite duplicates, stale identities, reset epochs and transient
A-to-B-to-A resize. Invalid decoder geometry cannot suppress a verified file; no extra protocol
parse/hash is introduced. Diagnostic records separate full/ROI geometry, counts, pixels and gaps,
retain interrupted unknown worker metrics, and preserve bounded immutable exports and the unchanged
observation-v1 contract.

Explicitly mocked browser lifecycle cases exercise native nine-argument cropping before readback,
two-miss recovery, portrait bypass, resize invalidation, selector locking, reset, background and
timeout. These mocks establish lifecycle behavior only. Separate real worker/WASM camera cases
verify whole-file reconstruction, exact saving, final-scan metrics and observation/digest linkage
in both modes with clean/degraded fixtures. The controlled moving replay below exercises actual
cropped decoding rather than treating mocked admission as optical evidence.

Early test-only corrections are preserved honestly: one periodic-probe fixture accidentally let
its admission expire at 700 ms and was corrected before measurement; a drawImage wrapper initially
failed TypeScript overload checking and was repaired. Neither was a reproduced product defect.
The initial landscape/portrait replay proposal was settled to 20 fixed landscape cases before the
first run; portrait behavior is covered separately. No measured case, timeout or threshold was
removed or relaxed, and the one-second scheduler/decoder options were not changed to fit results.

## Complete controlled replay evidence

The fixture is public and deterministic: 20 landscape 1280 x 720 event IDs, a fixed 64-symbol session,
seed sequence 0 and nonterminal target sequence 1. It includes movement, edges, scale, rotation,
occlusion and six persistent same-session duplicate decoys. The generator validates the actual
symbols through Python's optical adapter; generated images remain ignored.

A test-only canvas stream presents known images to the production video/capture/readback, worker,
local ZXing WASM and actual `Receiver.ingest`. Passive taps correlate each submitted crop transform
and returned corners. Recovery requires a new-symbol admission, recovered count two, and the expected
moved target's center inside the **unpadded** accepted QR bounds. Stationary duplicate admissions
cannot count as recovery. There are no fake worker results or permissive receiver mocks in replay.

Presentation and admission timestamps use the same browser monotonic clock; polling deadlines use
the test runner's separate monotonic clock. Absolute clocks are never subtracted across contexts.
A negative latency is retained as an ordering-ambiguous failure, never clipped to zero. Mode order
alternates by event. All 40 outcomes are saved before assertions; nearest-rank p95 uses the complete
successful-event array, with failures reported beside it rather than inferred from the recent ring.

| Run | Full successes | ROI successes | Full / ROI success-only p95 | Cropped attempts |
|---|---|---|---|---|
| First, 02:27:49 UTC | 14/20 | 14/20 | 53.8 / 133.9 ms | 540 |
| Final camera revision, 05:03:05 UTC | 14/20 | 14/20 | 42.1 / 109.7 ms | 590 |

Both runs retain all six timeouts **R15-R20 in each mode**, lose no control-success event, and satisfy
the prescribed comparative p95 margin of control +250 ms. This is a comparative software gate pass,
not 20/20 recovery or a physical 18/20 acceptance result. I independently recomputed the final p95
values and paired result from the whole 40-outcome dataset.

For the first run I independently inspected every failed arm after target presentation: every returned
QR was an admitted seed duplicate, with zero new-symbol admissions, zero returned bounds containing
the target center and zero rejections. The unchanged max-one-QR decoder also fails in full-frame
control on these scenes. This is an inherited target-selection limitation shared by both modes;
ROI periodic full probes do not make these scenes recoverable. Development performed a separate
trace audit and reached the same interpretation. These failures remain in the evidence.

Full ignored traces: `artifacts/reentry/results/first-complete.json` and
`artifacts/reentry/results/2026-10-07T05-03-05-835Z.json`. Root retains all 40 sanitized outcomes in
the [first](../benchmarks/software/2026-10-07-reentry-first.json) and
[final](../benchmarks/software/2026-10-07-reentry-final.json) review artifacts.
The replay source digest uses its documented source-path/NUL/text algorithm; it is distinct from
the 18-file review fingerprint above.

## Experimental sender rates and recording boundary

The user subsequently requested 15, 20 and 30 fps browser targets and GitHub delivery for manual
testing. Default 8 and existing 2/4/8/10 remain. The added browser test verifies both the standard
flashing acknowledgement and an additional selected-rate acknowledgement, clearing the latter on
every rate change; playing locks settings and both checkboxes. Pause/resume advances the same
sequence and preserves byte-identical frame exports. The label is "frames drawn", and the UI calls
the new levels targets rather than measured display/reception rates.

After these sender-only changes I independently proved that the LF-normalized `CameraReceiver`
function remained byte-identical to the passing camera/replay revision, SHA-256
`6eecbb553a67cba431ca4a774d6c9dca8d173016f6bf615f8fec7a5fd5fd07b7`.
Tracker, worker and receiver scheduler/options also remain unchanged. Camera evidence therefore
applies to that unchanged receiver; fresh sender checks cover the added behavior.

I independently reviewed the Python source boundary and the separate adversarial tester's 17 new
cases. Only exact 15/20/30 settings are added above 10, for exploratory observations. Acceptance
admission rejects them through normalization, forged CSV reading and raw-row summary validation.
Unsupported, boolean and nonfinite rates remain rejected. All outcomes and frozen run identity are
retained; existing 10 fps acceptance still works. CSV/observation schemas, Python optical 10 fps cap,
receiver sampling and wire contracts are unchanged. The separate Python tester reported 310 passing
tests, including 213 benchmark cases, and independently passed Ruff, formatting and mypy checks.

## Actual final verification and limits

| Check | Observed result |
|---|---|
| Browser lint / strict types / production build | PASS after the final sender-label and test edits |
| `npm --prefix web run test:coverage` | 123 PASS; configured codec coverage 100% only |
| Full browser run before sender additions | 61 PASS, 2 explicit replay skips; 60 camera/harness checks plus one complete replay |
| Latest `npm --prefix web run e2e -- e2e/harness.spec.ts` | 21 PASS, 24.4 seconds across Chromium/Firefox/WebKit |
| Generator Ruff lint / format | PASS |
| `git diff --check` | PASS |
| Python source/tests, independent rate tester | 310 PASS; Ruff lint/format, mypy and original vectors PASS |

No passing full-browser run on the later sender revision is invented: the receiver's equivalence
check carries forward its scoped camera/replay evidence, and the changed sender has fresh checks.
Protocol-module coverage does not measure all new camera/UI branches. Real Android/iPhone use,
transfer speed gain, higher actual exposure/reception rates, CPU/battery effects, physical G2 and
ROI adoption remain unproven. Timing/pixel diagnostics are proxies with instrumentation overhead.
The prototype remains plaintext and does not complete PWA/security/release milestones.

The development-side review in `CP-02B.2-development.md` independently confirms this same
freeze and agrees on **PASS for manual-test delivery with no known unresolved in-scope blocker**.
The two reviews do not qualify physical adoption, faster transfer, or G2.
