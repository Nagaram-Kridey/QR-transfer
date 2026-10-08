# CP-02D independent adversarial testing review

Date: **2026-10-08, Asia/Kolkata**. Reviewer: `/root/throughput_adversary`.
Base: `61dab088964d782f04040db57573c691f975cf7a`.
Scope: throughput debate and ordered plan, its implementation-plan integration, dark sender QR
frame and receiver tracking surround, and correction of the reproduced portrait preview alignment.

## Final revision and verdict

**PASS. All confirmed issues within this scope are resolved; no known blocking issue remains.**
Independently computed final six-path fingerprint:
`b0955b1ca0b6c531937ba5295fe7b0435debbe3ce74cf7490930a3f0984a64a6`.
Development independently matched this fingerprint and agreed PASS. This reviewer explicitly
agrees with development on that same final revision: all confirmed in-scope issues are resolved.
The source, tests and plan remained frozen during the final checks. Administrative checkpoint,
handoff, log and review documents are reviewed separately and excluded from the fingerprint.

For each UTF-8 file, normalize CRLF to LF and calculate lowercase SHA-256. Concatenate
`path:sha256\n` entries in the following exact ordinal order, then hash the resulting UTF-8 bytes:

- `IMPLEMENTATION_PLAN.md`
- `docs/planning/THROUGHPUT_PLAN.md`
- `web/e2e/camera.spec.ts`
- `web/e2e/harness.spec.ts`
- `web/src/ui/App.tsx`
- `web/src/ui/style.css`

## Debate and planning review

Development and adversarial testing agreed on the plan before source changes. The objective is
verified original bytes per total elapsed time, including acquisition and recovery. The supplied
84.76% duplicate fraction cannot distinguish repeated camera exposures from repeat-cycle tail
losses or identify the unknown sender FPS. Capture/readback headroom is a hypothesis, and worker
round-trip already includes decoder work. Larger symbols, faster polling, short holds, stronger
ECC and multiple QRs can each reduce useful admissions under some optics.

The agreed order measures fresh camera/display opportunities and coverage/tail first, compares
symbol density and hold/display geometry, then changes capture only if there is plausible measured
headroom. Compression retains complete Stage 4 bounded cross-decoding/security requirements;
LT retains its existing Stage 5 scope, budget and adoption gates. Neither is implemented here.

Future manual reverse feedback is a separate feasibility study before automatic duplex. Its
contract calls for session/prepared-container identity, capped indices/pages/bytes, snapshot and
expiry rules, reset/stale/conflict rejection, sequence exhaustion and interoperability fixtures.
Plaintext requests are forgeable advisory input; finite priority plus periodic complete source
cycles prevents permanent starvation. Final receiver verification remains required. Camera/display
orientation, pause/re-alignment and feedback latency must pass a whole-transfer comparison with
all failed outcomes retained. Plan inclusion does not start those features or displace existing
physical/PWA/security gates. No speed gain is asserted.

## Confirmed issue and resolution

The first focused run retained **19 passes and two failures**. A true 720x1280 portrait synthetic
stream on a 390-pixel viewport produced approximately **75.7 display pixels** of mismatch between
the native-region SVG and the rendered video. The landscape case passed. This was a confirmed
layout defect, not a decoder or native-coordinate failure.

Development positioned the video absolutely inside the existing 4:3 preview stage while keeping
`object-fit: contain`. The same portrait/landscape assertions then passed with projection/size
error below **0.1 pixels**. Assertions were not weakened; the assertion message was enriched with
the measured geometry. Initial traces/error context remain local under ignored
`artifacts/cp02d-first-portrait-failures`.

## Actual final verification

- `npm run e2e -- --grep "camera.spec.ts|dark sender"` from `web/`: **49/49 passed**, 1.8 minutes,
  zero retries. This covers 23 camera cases in each clean/degraded Chromium project and the sender
  visual case in Chromium, Firefox and WebKit.
- Actual production worker/WASM clean/degraded fixtures saved exact verified bytes in Full frame
  and Auto region, with matching observation/diagnostic hashes and no stale completed overlay.
- Sender tests compare every RGBA pixel against the independently generated QR of the exported
  first frame: desktop 256/512/1024-byte symbols and 390-pixel mobile 256-byte symbols in all three
  engines. Four white quiet-zone modules remain exact; display scale is integer and at least two
  pixels/module, with no CSS rescaling or horizontal overflow. The six-pixel dark shadow is outside
  the canvas and inside its available surrounding space.
- Python `zxingcpp` independently decoded all **12 final full-page sender screenshots**, including
  the dark CSS frame and surrounding UI. `decode_frame` validated each wire checksum and bounds.
  An initial verification command used an incorrect Python API name and was corrected; only the
  successful `decode_frame` run is counted as verification.
- True portrait and landscape camera streams verify SVG/native-region alignment through actual
  `object-fit: contain` letterboxing. Mask point-in-fill checks show a clear tracked interior and
  shaded exterior; dark six-pixel and white two-pixel outlines use non-scaling strokes. Pointer
  events pass through, and preview controls remain usable without horizontal overflow.
- Miss/reacquisition, source resize, stale responses, reset, background, cancellation, timeout,
  worker/capture/dispatch/hash failures, malformed diagnostics and saving regressions passed.
- Reviewer visually inspected the narrow sender and both preview screenshots; the quiet zone is
  visible and the portrait tracking box aligns with the synthetic region. Screenshots stay ignored.
- Final source build passed. Coordinator separately reported lint/strict types, **147 Vitest**,
  original Python and four independent TypeScript conformance outputs, and default/project-base
  builds passing on this same source/plan freeze. These reported checks are distinct from this
  reviewer's independently run browser/optical checks.

## Limits and delivery boundary

This is a visibility/alignment repair and planning checkpoint. Native camera capture, sampler,
tracker, worker, codecs, wire bytes, optical settings and full-frame default are unchanged.
The surround marks the padded admitted scan region after acquisition; it does not add first-QR
detection, feedback, compression, interleaving or new coding. Software camera fixtures and desktop
engines do not qualify phone throughput, physical ROI adoption, G2 or iPhone support.

Commit/push and GitHub Pages deployment require a new explicit CP-02D approval. The current live
site remains CP-02C until that approval and successful delivery. Both agents' agreement is a
technical review result and does not replace the user's checkpoint approval.

## Approved delivery verification — 2026-10-08, Asia/Kolkata

**Independent hosted software verification PASS.** The user approved CP-02D delivery, and
implementation `c5ce0f7c344108b9363d409113ffb125e70137b5` is now published at
https://nagaram-kridey.github.io/QR-transfer/. The reviewer independently recomputed the six-path
fingerprint above and verified those files match the committed revision without differences.
The coordinator reported exact-commit [CI success](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37738942757)
and [Pages success](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37739423881) before
the reviewer began the hosted checks.

Actual hosted checks, using public synthetic fixtures only:

- Mobile 390-pixel/256-byte and desktop 1280-pixel/1024-byte sender preparations passed complete
  RGBA/quiet-zone comparisons: zero mismatched pixels, integer three-pixel module scale, no CSS
  rescaling, external six-pixel dark shadow and no horizontal overflow. Both full-page sender PNGs
  independently decoded through Python `zxingcpp` and `decode_frame` checksum/bounds validation.
- True 640x480 landscape and 720x1280 portrait synthetic video streams, both on a 390-pixel
  viewport, passed native padded-region projection/size checks below 0.1 display pixels. The
  displayed stage remained 4:3. The mask interior was clear, exterior shaded, dark/white outlines
  coincident, pointer events passed through and no horizontal overflow occurred. Reset and a late
  held worker response could not restore the tracking outline. These geometry checks deliberately
  mock worker admission and do not establish camera decoding performance.
- A separate actual production worker/WASM synthetic optical trial saved the exact **320-byte**
  public fixture, SHA-256 `5911335f7416557fb64c1956e6d78a9ad92fd950c152992ceb37de2227c32e2e`.
  One ROI scan completed, observation/diagnostic SHA-256 linkage passed, no pending interruption
  remained, and the completed tracking outline was hidden.
- Hosted index, `index-WDP4yxJJ.js`, `index-CqLTdv7Q.css`, `receiver.worker-DYrXf6hs.js` and
  self-hosted `zxing_reader-Bb9Mx2Pu.wasm` returned HTTP 200. Across these checks there were no
  page errors or external runtime requests. Full frame remains the default.
- Reviewer visually inspected hosted sender and portrait preview screenshots. Original test
  scripts, screenshots, observations, exports and saved fixture remain ignored under
  `artifacts/cp02d-live-testing`; the compact results are in its local `result.json`.

This verifies approved software delivery and manual-test readiness. No physical Samsung/iPhone
trial, faster-transfer result, energy claim, ROI adoption or G2 decision is established.
