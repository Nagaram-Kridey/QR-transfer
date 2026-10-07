# Controlled QR reentry replay

CP-02B.2 software acceptance uses **20 paired known QR reentry events**. The complete event dataset
is separate from the diagnostics ring, which retains only the latest 256 attempts. The first
complete run on **2026-10-07 (Asia/Kolkata)** is retained below; final-revision checks are in progress.

The predeclared fixture contains 20 landscape 1280×720 events: four cardinal moves, four edge moves,
four scale/rotation moves, two occlusion/reentry events and six stationary same-session duplicate
decoys. Portrait/odd-dimension/detail-bypass behavior is covered separately by geometry and browser
lifecycle regressions; it is not a measured arm in this replay. A deterministic public transfer
stays incomplete with 64 symbols: acquisition admits sequence 0 and the moved target carries
sequence 1. A duplicate of sequence 0 cannot count as target recovery.

The test-only canvas-stream feeder supplies known camera images to the production receiver. It
keeps real canvas crop/readback, worker transfer, local ZXing WASM decoding and protocol admission.
Event timing begins after the video reports presentation of the changed image; recovery requires
new-symbol admission (`unique_delta > 0`, recovered count 2) and the expected target center inside
the unpadded accepted QR bounds, mapped through the actual captured transform. Presentation and
admission timestamps use the same browser monotonic clock. The test runner uses its separate Node
monotonic clock only for polling deadlines; their absolute times are never subtracted. Seed timeout
is 6 seconds and reentry timeout 3 seconds. Negative latency is an explicit ordering-ambiguous
failure, never clipped. Both modes run in balanced order, with all 40 outcomes retained. Exact
scene coordinates, rotations, PNG hashes and paired order are in the retained manifest and the
public generator `tools/generate_reentry_fixtures.py`; the test is `web/e2e/reentry.spec.ts`.

Compare event IDs individually: every event recovered by full-frame must also recover with Auto
region. Equal aggregate success totals cannot hide failures on different events. Report all failures
beside successful-event latency statistics. Compute nearest-rank p95 from the complete successful
event array (`ceil(0.95 * n) - 1` after sorting), never the diagnostics ring. Auto region p95 must be
no more than 250 ms above full-frame control. Missing or zero successful events cannot produce a pass.

Preserve failed baseline runs before a bounded correction and rerun the same predeclared events.
Do not remove difficult events, count stationary decoys as reentry or loosen acceptance to fit the
engineering budget. Synthetic results establish software behavior only; physical adoption and G2
remain separate gates under the [accepted plan](../planning/AUTOFRAMING_PLAN.md).

## First complete result

The [retained first dataset](software/2026-10-07-reentry-first.json) contains all 40 outcomes and
the complete fixture manifest, on Chromium 153.0.8010.12. It was captured at 07:57:49–07:58:50 IST
October 7 with unchanged source during the run, before a later indentation-only cleanup.

| Measure | Full frame | Auto region |
|---|---:|---:|
| Intended-target recoveries | 14/20 | 14/20 |
| Timeouts | 6/20 | 6/20 |
| Successful-event nearest-rank p95 | 53.8 ms | 133.9 ms |
| Genuine cropped attempts, including acquisition/failed events | 0 | 540 |

Auto region retained every control-recovered event and its successful-event p95 was 80.1 ms above
control, within the predeclared +250 ms limit. This passes the **comparative replay gate**; it does
not mean all 20 events succeeded or that transfers became faster. R15–R20, all six duplicate-decoy
scenes, timed out in both modes. After target presentation every recorded admission in those scenes
was a duplicate, with no new target symbol or target-bound admission. The unchanged single-QR reader
returned the stationary seed repeatedly even in full-frame control. This is a demonstrated baseline
limitation; the dataset does not establish a general decoder cause or that an earlier probe would
rescue it. Decoder options and the original one-second probe policy remain unchanged.

The compact retained dataset omits camera images, QR text and received bytes; complete operational
scan arrays remain ignored under `artifacts/reentry/results`. Its source fingerprint uses ordered
`path + NUL + LF-normalized text + NUL`, separately from the checkpoint review's `path:sha256` hash.
No physical camera throughput, battery reduction, adoption threshold or G2 result is inferred.
