# Browser camera diagnostics (CP-02B.1)

This checkpoint instruments the existing full-frame browser receiver. It does not implement
autoframing or establish a camera bottleneck, performance gain, supported phone or physical G2 pass.
See the [experiment plan](../planning/AUTOFRAMING_PLAN.md) and [approval status](../../CHECKPOINTS.md).

## Collect an observation and its diagnostics

1. Use a known non-sensitive payload and select its correct expected size before enabling the camera.
   Public 10 KiB and 100 KiB fixtures use 60-second and 300-second timeouts respectively.
2. Start the sender, enable the receiver, align the complete QR and start receiving. Acquisition
   begins with the timed trial; merely arming the camera does not decode or seed tracking.
3. Retain the actual success, timeout, failure or cancellation. Export the trial observation and
   its separate camera diagnostics. An interrupted in-flight scan may have unavailable timings.
4. Keep the observation bytes unchanged. The sidecar's SHA-256 identifies the exact UTF-8 observation
   export, including indentation and with no appended newline. It is a linkage checksum, not proof
   of physical provenance or authenticated evidence.
5. Associate that observation/digest with the operator's trial ID and frozen run metadata. Continue
   passing the original observation to `lumenlink benchmark record`; the diagnostics sidecar is
   not a replacement observation and is not an input to that strict command.

For a local byte check, compare the sidecar's observation digest with:

```powershell
Get-FileHash -LiteralPath '.\camera-observation.json' -Algorithm SHA256
```

If hashing/diagnostics export fails, the original observation remains available. Do not silently
discard a failed physical trial because it lacks a sidecar. Frame-JSON imports have no camera
diagnostics. No files are uploaded; no QR contents or camera images belong in the sidecar.

## Interpret measurements carefully

The sidecar format is `lumenlink-camera-diagnostics-v1`. Its top-level `observation` object carries
`filename`, `utf8_bytes` and lowercase `sha256`; `diagnostics` contains a `full_frame` mode snapshot.
The observation document itself retains its original `lumenlink-camera-observation-v1` format.

| Snapshot field | Meaning |
|---|---|
| `totals` | Started/submitted/completed/interrupted attempts, capture/initialization failures, measured decode/admission errors and busy skips |
| `pixels` | Submitted/completed/interrupted input pixel totals |
| `timings` | Count, total, minimum and maximum milliseconds for capture, readback, round-trip, decoding, admission and full-scan gaps |
| `frames` | Decoded QR count, new symbols, duplicates and rejected ingests |
| `first_valid_acquisition_ms` | Trial-relative time when the main thread receives the first valid admission result; null if none |
| `latest_attempts`, `dropped_records` | At most 256 terminal records and the number removed from that buffer |
| `pending`, `stopped` | Current attempt if unfinished, and whether collection has ended |

Scan records identify the attempt, source/input dimensions, trial-relative capture/dispatch/finish
times, completion/interruption/failure status, measured stage durations and admission deltas.
Unknown timings/counts are null. Error stages are fixed labels, not copies of arbitrary decoder
exceptions or decoded text. All recorded attempts are full-frame scans in CP-02B.1.

- Submitted images count successful dispatches to the worker, rather than pump ticks or decoded
  QR texts. A capture/readback/dispatch failure must not be called a submitted image.
- Completed scan counters are separate from in-flight scans interrupted at trial end. Missing
  decode/admission timings are unknown, not zero. Pixel totals describe submitted/completed input
  dimensions, not CPU instructions or the number of distinct camera exposures.
- Capture/readback and worker decode/admission durations use their own monotonic clocks. The main
  thread measures round-trip locally; absolute worker/main clock timestamps are not subtracted.
  These are elapsed-time proxies and must not be summed or renamed as battery/CPU consumption.
  Capture includes canvas sizing/draw and measurement overhead; round-trip includes dispatch,
  queuing, worker execution and delivery to the UI. `worker_errors` counts completed scans reporting
  decode/admission exceptions; a native worker crash without those metrics remains an interrupted
  attempt with unknown worker timings. Initialization failures here mean canvas setup after timing
  starts; pre-trial camera permission/setup failures do not become timed camera observations.
- First valid admission measures acquisition from trial start; unique symbol progress, duplicates
  and rejections remain distinct. The existing observation's `stats.seen` counts receiver ingests,
  not all camera images or successful new source symbols.
  A terminal container verification failure can increase the recovered-symbol delta while rejecting
  admission; those deltas describe receiver processing and do not certify verified file bytes.
- Full-scan dispatch gaps expose actual scheduling frequency. The unchanged 33 ms polling interval
  does not guarantee 30 images/second: one image remains in flight and busy frames are skipped.
  Gaps are between successive successful dispatch starts, excluding trial-to-first and last-to-end.
- Aggregate counts/sums/minima/maxima cover the recorded trial. Only the latest 256 terminal scan
  records are retained, with a discarded-record count. That sample cannot establish session p95
  or be substituted for the complete paired-reentry dataset required by CP-02B.2.
- Verified completion is still the existing observation's elapsed time, excluding download and
  sidecar hashing. Diagnostic failures cannot turn a verified file into an unverified save.
  Collection/validation failure disables the sidecar rather than exporting a silently incomplete
  summary. The original outcome remains exportable, including when diagnostics hashing fails.

## What this can and cannot decide

Measure control acquisition, capture/readback, worker delays, useful admissions and repeated work
before attributing loss to decoding. A 506-symbol stream at an assumed 8 fps needs at least 63.125
seconds even with an immediately available first symbol; the prior 60-second timeout does not
prove an image-processing bottleneck. Its actual source settings remain unconfirmed.

Autoframing must later pass the predeclared completion-time/reliability/recovery comparisons. Smaller
per-attempt pixel counts alone do not qualify adoption. The current pipeline retains its camera
constraints, width-960 scaling, 33 ms polling, QR decoder options and one-image-in-flight behavior.
Use the same diagnostics in both eventual comparison arms and retain all outcomes.

No measured baseline, physical comparison or ROI adoption result has been recorded by this document.
