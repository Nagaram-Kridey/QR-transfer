# CP-02B.1 independent testing review

Date: **2026-10-07, Asia/Kolkata**. Reviewer: `/root/checkpoint_testing`.
Review base: `5ee3561`. This verdict covers locally implemented full-frame browser diagnostics;
it does not approve delivery, begin CP-02B.2, or qualify physical camera performance.

## Reviewed snapshot

Source/test freeze SHA-256:
`91675844c1ca3f90f87779288a92ec1376bd4284d704916519df49a644287374`.

I independently calculated this fingerprint by sorting the following paths, converting CRLF to LF
in each UTF-8 file, hashing each file, concatenating `path:sha256\n` lines, and hashing that string:

- `web/e2e/camera.spec.ts`
- `web/e2e/harness.spec.ts`
- `web/src/diagnostics/camera.test.ts`
- `web/src/diagnostics/camera.ts`
- `web/src/ui/App.tsx`
- `web/src/workers/messages.ts`
- `web/src/workers/receiver.worker.test.ts`
- `web/src/workers/receiver.worker.ts`

Reviewed the final source/test changes and the browser diagnostics and autoframing documents.
Python source, both codecs, protocol vectors/specification, dependencies and CI workflows are
unchanged. Camera constraints, full-frame width-960 scaling, polling, decoder options and the
one-image-in-flight rule are preserved. No ROI/corner-tracking feature is present.

## Adversarial findings and resolution

Source inspection identified privacy and lifecycle defects in the initial diagnostics implementation.
The development peer corrected them; the added regressions verify the final behavior:

- Copying arbitrary metric properties could expose QR text/pixel arrays or overwrite measured
  dimensions. Terminal records now copy only the defined metric fields; extra properties are ignored.
- Waiting for the digest before cloning the caller's snapshot could export data changed during the
  await. The snapshot is copied immediately, and both snapshots and exports are deeply immutable.
- An absolute dispatch-clock timestamp was initially exposed in pending snapshots. Only public,
  trial-relative fields remain. An undispatched attempt ending at finish is consistently classified
  as a capture failure, rather than an interrupted submitted scan.
- Diagnostic validation errors could escape the UI's worker handler. Collection failures now disable
  the sidecar with a fixed message while preserving receiver processing, observation and verified
  save. Injecting a malformed scan followed by actual worker completion confirms this isolation.

The tests also challenge ring overflow, invalid dimensions/counters/timings, repeated or unmatched
completion, interrupted work, failed capture/readback/dispatch, terminal integrity failure, duplicate
admission, empty decoding, native worker failure and late events after reset.

## Actual verification

All final checks below completed after the last source/test edit:

| Command | Result |
|---|---|
| `npm --prefix web run lint` | PASS |
| `npm --prefix web run typecheck` | PASS |
| `npm --prefix web run test:coverage` | PASS: 69 tests; 32 diagnostics, 7 worker, 30 codec |
| `npm --prefix web run build` | PASS: production app, worker and local WASM assets |
| `npm --prefix web run e2e` | PASS: 46 tests, 39.0 seconds |
| `git diff --check` | PASS |

The coverage configuration measures the codec only: all reported codec lines, branches, functions
and statements are covered. It does not establish 100% coverage of the new diagnostics or UI.

The browser run includes the actual worker/WASM path with clean/degraded synthetic QR recordings,
plus Chromium, Firefox and WebKit harness tests. It verifies final scan metrics precede completion,
new-symbol/duplicate/rejection counts remain distinct, no second decoder/frame-hash pass is added,
and a verified file stays explicitly saveable when diagnostics fails. Native worker crashes have
unknown interrupted worker metrics; `worker_errors` counts completed scan-reported decode/admission
errors only. Capture/readback/dispatch failures count no submitted image.

A deterministic cancelled trial matches the original v1 observation JSON byte-for-byte, including
field order, indentation and no appended newline. The sidecar hashes those exact UTF-8 bytes.
Hash rejection preserves the observation; delayed hashes and late worker events cannot restore
abandoned exports. Permission/setup failures before timing and frame imports create no sidecar.
The 300-attempt unit case retains 256 terminal records, reports 44 discarded records, and keeps
whole-trial aggregate totals. No camera image, QR contents, or arbitrary exception text enters it.

An additional ignored local smoke exported a cancelled, held-camera synthetic trial:

- `artifacts/CP-02B.1-observation.json`: 679 bytes, SHA-256
  `b0e4d178fe2f5d6de0a1cbb2f0466350c6f1235922faa1e32636e27ce66072a4`.
- `artifacts/CP-02B.1-diagnostics.json`: matching exact-byte digest, one submitted/interrupted scan,
  zero completed scans; zero page errors or external requests and locally served WASM.
- `artifacts/CP-02B.1-local-smoke.json`: explicitly labelled synthetic local software evidence.

Root independently verified the exact bytes/digest and accepted the original observation through
the strict Python normalizer using explicit synthetic exploratory 10 KiB target metadata. This
cancelled trial does not claim a successful file transfer or physical provenance.

## Verdict and limits

**PASS for CP-02B.1 on the frozen snapshot. No known unresolved blocking issue remains within this
diagnostics-only scope.** This is a scoped engineering review, not a claim that all bugs are absent.

Timing and pixel statistics are local elapsed-time proxies. Instrumentation overhead, phone
compatibility, speed gains, CPU/battery savings, the physical G2 gate and ROI adoption remain
unproven. The recent ring cannot provide whole-trial p95. No physical acceptance trials were run.
Existing deployed Pages code is unchanged; commit, push and redeployment require user approval.

## Explicit peer agreement

I read the [development verdict](CP-02B.1-development.md) after its independent fingerprint and
final-check confirmation. Development and testing both agree **PASS**, with no known unresolved
blocking issue within CP-02B.1, on the identical
`91675844c1ca3f90f87779288a92ec1376bd4284d704916519df49a644287374` source/test freeze.
No source/test changes followed the checks. This mutual agreement supports submitting the local
candidate for user approval; it does not authorize a commit, push, deployment or the next checkpoint.
