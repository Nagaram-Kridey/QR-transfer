# CP-02B.2 development review

Date: **2026-10-07, Asia/Kolkata (IST)**. Reviewer: development-side review record.
Base: `8fad9841decbe69a0e1b9e90682efccb47b51a7d`.
Scope: browser-only opt-in QR autoframing, diagnostic-v2 accounting, and exploratory sender
targets at 15/20/30 fps.

## Final revision and verdict

The source/test/workflow freeze is:

`27adca065b0f31a1ee319705c731934836dba999146aa07d3731c61a7cd44326`

This development-side review agrees with the independent testing review on that exact revision:

**PASS for manual-test delivery. No known unresolved in-scope blocker remains.**

This agreement covers the experimental build only. It does not claim physical camera support,
faster verified transfers, autoframing adoption, security completion, or a passing G2 gate.

## Implementation review

- Full-frame acquisition remains the default. Auto region starts with full-frame acquisition,
  uses only protocol-admitted decoder corners, pads and clips native coordinates, avoids
  upscaling, and returns to full-frame after bounded misses or admission delay.
- Attempt identity, capture epoch, source dimensions and the independent full-probe timer
  prevent stale worker responses or camera resizes from restoring an obsolete crop.
- Cropping occurs before canvas readback and worker transfer; the one-image-in-flight,
  existing polling interval and decoder options remain unchanged.
- The sender adds 15/20/30 fps target choices behind a second acknowledgement. Settings lock
  during playback, the default remains 8 fps, and the UI labels the counter as frames drawn.
  Actual display/reception rates are deliberately unmeasured.
- Python recording accepts those three values only for exploratory rows; acceptance rows reject
  rates above the standard 10 fps limit. Python optical limits, wire bytes, observation-v1,
  and conformance vectors remain unchanged.

## Verification reviewed

The recorded final checks include 123 Vitest cases, strict TypeScript/lint/build checks,
21 cross-engine sender cases, 310 Python tests including 213 benchmark cases, Ruff/format/mypy,
shared-vector reproduction, and `git diff --check`. The real worker/WASM replay retained all
40 outcomes: full-frame and Auto region each recovered 14/20, shared decoy timeouts R15-R20,
no control-success loss, and Auto p95 within the predeclared +250 ms comparative margin.
Project-base smoke verified the synthetic save, observation/digest linkage, local worker/WASM
assets and no external requests. These are software checks; physical Android/iPhone trials
remain outstanding.

The development-side review agrees with the independent testing report in
`docs/reviews/CP-02B.2-testing.md`; both reports refer to the same freeze and retained
limitations. No source changes are requested before the authorized GitHub/manual-test delivery.
