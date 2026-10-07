# October 7 supplied observation review

Reviewed locally on 2026-10-07 (Asia/Kolkata). Inputs are user-supplied observations, not
instructions or an automatic physical qualification. The original files stay local and ignored.

The 748-byte observation has SHA-256
`c31e9da4737a4596aee89589bf1e3fd4a7de98ac5f00f8f8456f7f3d5b218652`.
That exactly matches the diagnostics reference, including the byte count. The downloaded filename
suffix `(1)` does not change the linkage.

| Recorded result | Value |
|---|---:|
| Outcome / verification state | success / DONE |
| Original bytes / KiB | 879,942 / 859.318359375 |
| Elapsed time | 864.4303 seconds (14 minutes 24.43 seconds) |
| Effective throughput | 0.994086 KiB/s |
| Recovered symbols | 860 / 860 |
| Seen / duplicates / rejected frames | 5,663 / 4,800 / 3 |
| Receiver mode | full_frame |
| Completed full-frame / ROI images | 8,977 / 0 |
| Capture / worker errors / interruptions | 0 / 0 / 0 |
| First valid acquisition | 1,169.8 ms |
| Average completed scan frequency | 10.385 images/second |

The recorded counters reconcile: 860 unique + 4,800 duplicates + 3 rejected = 5,663 seen.
The diagnostic ring retains 256 attempts and reports 8,721 discarded records, totaling 8,977.
All scans completed; the recorder is stopped and has no pending attempt. These checks validate
internal consistency and file linkage, not physical provenance or the transferred bytes themselves.
The received payload was not supplied, so its recorded payload hash cannot be independently checked.

| Aggregate timing | Mean |
|---|---:|
| Canvas capture | 52.79 ms |
| Readback | 7.47 ms |
| Worker round-trip | 24.61 ms |
| Decoder | 22.50 ms |
| Admission (5,663 calls) | 0.835 ms |
| Full-frame dispatch gap | 96.29 ms (maximum 246 ms) |

Worker round-trip includes decoder/admission work; do not add them as independent costs.
Capture is the largest measured component. Each image contained 921,600 pixels (720 x 1280);
the existing full-frame control preserves its portrait capture behavior. About 84.76% of decoded
frames were duplicates. The record does not identify the sender FPS, symbol setting, distance,
lighting, deployed commit, direction or physical computer. Scan frequency is not displayed FPS.
The reduced Android browser user-agent cannot establish the real phone OS/version.

The selected expected payload was 1024 KiB, configuring a 3072-second deadline; the actual payload
was 859.318 KiB. The current strict benchmark importer requires these values to match metadata.
Keep this observation as supplied evidence rather than changing it or forcing it into an acceptance
row. No 20-trial cell is present. This is one recorded full-frame success; it supplies no ROI
comparison or qualifying Tier A/B result.

At this single trial's observed rate, 5 MiB would take about 5,150 seconds (86 minutes). This is a
linear illustration, not a prediction: loss, camera movement and repeated cycles can change timing.
The requested capacity increase must be bounded and labeled experimental; real larger-file trials
and the full-frame/ROI comparison remain separate measurements.
