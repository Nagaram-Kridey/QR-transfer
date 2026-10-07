# Experimental browser QR tracking

CP-02B.2 is the reviewed manual-test candidate on **2026-10-07 (Asia/Kolkata)**, following the
[accepted experiment](../planning/AUTOFRAMING_PLAN.md). The user authorized GitHub/manual-test
delivery with higher sender rates after the combined checks and two same-revision reviews. The
current live build is updated only after hosted CI and Pages verification; physical adoption is
still a separate gate.
Full-frame remains the default; no phone speed benefit, ROI adoption or physical G2 pass is claimed.

## What the candidate changes

The experimental Auto region option tracks a QR only after its frame passes the existing receiver's
validation and session checks. It begins with a timed full-frame scan, not pre-acquisition while the
camera is armed. Accepted duplicates may update tracking, but another session or malformed frame
cannot establish a region. The preview stays full-frame; the outline identifies the padded decoder
input region rather than controlling camera zoom or focus.

Each attempt retains its native source dimensions, crop origin/size, actual integer output dimensions
and identity. Decoder corners are mapped through that attempt's horizontal and vertical scale. A
convex quadrilateral becomes an axis-aligned box with padding on each side of at least 12 native
pixels or 20% of the respective box dimension, rounded outward and clipped to the source image.
Cropping happens before canvas readback and worker transfer. It never upscales, exceeds a 960-pixel
longest side or processes more pixels than the unchanged full-frame control. A crop covering at least
80% of the native image, invalid geometry or a crop that would downscale more strongly than the
control is bypassed. This intentionally makes some portrait or large-region cases stay full-frame.

Two unsuccessful cropped attempts or 500 ms without a valid admission trigger full-frame
reacquisition at the next available processing opportunity. Full probes have an independent timer
and priority at least once per second; duplicate admissions cannot postpone them. Busy workers can
delay a probe, so exported actual full-scan gaps matter. There remains one image/decode in flight and
the existing 33 ms polling, camera constraints and decoder options.

Tracking resets at trial start/reset/camera replacement/source dimension changes. Obsolete corners
cannot restore an old crop, including dimensions that change away and back while work is pending.
Ignoring stale geometry must not discard otherwise valid receiver data or prevent verified completion.
The selector is locked during a trial. Searching, Tracking and Reacquiring describe crop state;
they do not certify receiver completion. Saving still requires successful whole-file verification.

## Measurement and adversarial review

On October 7 the user explicitly requested pushing/deploying the reviewed working code for manual
tests and adding higher sender rates. This authorizes combined delivery after checks and both
reviews. The sender addition exposes 15/20/30 fps targets behind an extra selected-rate
acknowledgement, retaining default 8 fps and the existing standard/reduced rates. These are
exploratory settings; they do not alter receiver sampling, wire frames or Python camera adapters.
The benchmark tool's related recording support retains high-rate trials as exploratory only.

Read the [diagnostics guide](BROWSER_DIAGNOSTICS.md) for exact export semantics. The candidate uses
diagnostics-v2 in both modes so full-frame and ROI attempt counts, input geometry and full-scan gaps
can be distinguished. Observation-v1 and the strict benchmark CSV are unchanged. No pixels, QR text,
received file bytes or arbitrary worker exceptions belong in diagnostic exports.

The [paired replay](AUTOFRAMING_REPLAY.md) challenges known target reentry through the actual browser
capture/worker/WASM/receiver path. Static same-session duplicate decoys can keep the admission timer
alive, making an independent full probe necessary; bounded recovery alone may still fail the
predeclared p95 comparison. Keep failed events and first failed runs. Unit mocks and synthetic replay
describe software behavior, not Samsung camera performance.

Physical comparison is CP-02B.3, after this candidate's approval and deployment. Confirm the actual
Windows computer/camera and browser versions, use known public fixtures and freeze payload/settings,
distance, lighting and the movement procedure before the balanced 20-trial comparison in each mode
and condition. The exact adoption thresholds and correct 60/300-second timeouts are in the accepted
plan. Smaller cropped images or faster decoding alone cannot qualify adoption.

## Current result

The final comparative replay retained **14/20 target recoveries in each mode**, all six shared
duplicate-decoy timeouts, no control-success loss, and Auto p95 within the +250 ms comparative
margin. Auto region genuinely cropped 590 attempts in the final run. This measures synthetic
target recovery, not whole-file transfer improvement. See the replay guide and retained complete
outcomes. Both reviews agree PASS for manual-test delivery at freeze
`27adca065b0f31a1ee319705c731934836dba999146aa07d3731c61a7cd44326`; full-frame remains default
and no physical adoption is approved.
