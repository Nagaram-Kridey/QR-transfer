# CP-02A: benchmark evidence tooling contract

Status: both independent reviews passed; **user approved on 2026-10-05**, delivery in progress.
Date: 2026-10-05, Asia/Kolkata. This supports the existing physical feasibility gate; it does not
authorize production PWA/security work or turn generated inputs into physical evidence.

## Scope

Add `lumenlink benchmark record` and `lumenlink benchmark summarize`. The Python module is
independent of camera, UI and the wire codecs. It reads observation/metadata JSON, retains trial
outcomes in CSV and computes explicit per-cell summaries. It never opens received files or uploads
data. Both development and adversarial-testing agents must agree on the final candidate before
the coordinator requests user approval to commit/push it. Pages need not redeploy for this CLI feature.

Parsing a report cannot prove a physical transfer occurred. Physical recording requires explicit
operator attestation; summaries always identify their evidence as operator-supplied and require
manual G2 review. No automatic gate certificate, README claim or phase advancement is produced.

## CSV and immutable cell/run identity

Retain the original ordered columns from trial-template.csv and append, in order:
`run_id,phase,physical_attested,timeout_seconds`. The old header is rejected with a migration error;
the tool must not invent phase or attestation for legacy rows. There are no recorded acceptance
rows to migrate in the supplied header-only template.

`run_id` identifies **one frozen device/direction/payload/settings cell in one run**. Every row with
that ID must use identical commit, source, devices, OS/app versions, direction, original file
size/hash, symbol size, FPS, ECC, distance, lighting, phase, attestation and configured timeout.
Contradictory metadata within an ID is an error, not an extra group silently selected for passing.
Use distinct IDs for opposite directions, payloads, exploratory runs and original/tuned reruns.
Trial IDs must be globally unique within the CSV. Keep earlier failed acceptance runs.

Metadata JSON supplies the cell fields plus `run_id` and `timeout_seconds`. Reject missing/extra
keys and empty required fields; acceptance also rejects unknown placeholder labels. Exploration may
retain an explicit unknown label as nonqualifying evidence. The example has empty fields that must
be completed before recording.
The record command supplies a unique trial ID and phase (default `exploratory`, explicit `acceptance`).
Source is `physical` or `synthetic`; physical requires `--attest-physical`. Synthetic data can be
recorded for testing but can never qualify a physical cell.
When summarizing an external CSV, an explicit physical/unattested row may be retained as
nonqualifying evidence with a missing-attestation reason; recording a new physical row still
requires the flag. Synthetic plus physical attestation is contradictory and rejected in both paths.

## Admission and preservation

- Accept only the existing Python `kind=camera_observation` or browser
  `format=lumenlink-camera-observation-v1` shape. Reject frame imports, simulations, conflicting
  format markers, invalid outcome/counter types and contradictory data.
- Bound observation JSON to 64 KiB, metadata to 16 KiB, CSV to 10 MiB / 10,000 rows. Reject duplicate
  JSON keys, trailing JSON, nonfinite numbers and booleans passed as numeric values.
- Preserve success, failure, timeout and cancellation. Browser reports use `failed`; Python reports
  also use `failed`. Record errors and Python cleanup warnings; do not erase failed attempts.
- Success needs the expected original size/hash and verified completion state where present.
  A successful elapsed time must be positive and strictly less than the configured timeout.
  Successful browser symbol totals must fit the current plaintext container's original bytes,
  symbol size and bounded manifest overhead. Future encryption/compression profiles require an
  explicit update to this benchmark contract; do not reuse plaintext bounds for compressed data.
- A failed receiver may lock an unexpected/untrusted stream. A failed symbol total inconsistent
  with the intended payload/settings is retained with a warning, not discarded or used to infer
  the original file size. Keep the raw report and investigate the actual stream/settings.
- Browser `expected_payload_kib` must equal metadata original bytes / 1024, including failed reports.
  The selector configures timeout; it does not establish the actual file size. Retain contradictory
  raw evidence separately rather than labeling it as an acceptance row for another payload.
- Timeouts must reach the configured deadline. A pre-processing setup failure/cancellation has no
  elapsed time, is exploratory only, and is counted separately from timed trials.
- Acceptance requires positive elapsed time, complete frozen metadata and timeout
  `max(60 seconds, 3 * original payload_KiB seconds)`. Python observations do not include configured
  timeout, so metadata explicitly attests the actual CLI setting used.
  Reject acceptance encoding settings whose minimum possible source-symbol count exceeds 2,048.
- Reject duplicate IDs, malformed existing CSV or inconsistent run metadata before appending.
  A rejected append must leave the prior CSV intact. Existing receive/report files are never changed.

## Summary policy

Summarization independently validates raw CSV rows; it must not trust a file merely because the
record command could have created it. Never pool run IDs, settings, payloads, directions or devices.
Only a physical, attested acceptance cell with **exactly 20 timed trials** is eligible for a numeric
gate candidate. Too few or too many trials are incomplete evidence; do not trim or select successes.
All timed failures/timeouts/cancellations remain in the denominator. Setup observations are separate.

Report outcome counts, failure reasons and:

- Median successful completion time and nearest-rank successful p95 (`ceil(0.95*n)`th sorted time).
- Median of each successful trial's `original payload_KiB / elapsed_seconds` effective rates.
  This is not generally the same as dividing payload size by median time.
- `null` timing/rate statistics when there are no successful trials; label statistics successful-only.

Output JSON uses `format=lumenlink-benchmark-summary-v1`, states that physical provenance is
unverified/operator-supplied, and sets `gate_decision=manual_review_required`. Eligible cell candidates:

| Payload / result | Candidate |
|---|---|
| 100 KiB, at least 18/20 successes and median rate at least 1 KiB/s | `tier_a_candidate` |
| 100 KiB otherwise | `tier_a_not_met_test_10KiB` |
| 10 KiB, at least 18/20 and median rate at least 0.5 KiB/s | `tier_b_candidate_requires_tier_a_failure` |
| 10 KiB, 16–17/20, or at least 18/20 with rate below 0.5 KiB/s | `inconclusive` |
| 10 KiB, fewer than 16/20 | `stop_expansion_candidate` |
| Other payloads, phases, sources, missing attestation or wrong trial count | Nonqualifying evidence with explicit reasons |

Tier B still requires checking the matching Tier A failure; one eight-hour tuning investigation and
the repeat-run decision remain manual. Per-cell output is not an automatic aggregate device-pair
qualification. The original benchmark protocol and PROJECT_PLAN.md govern the final decision.

## Actual evidence at this checkpoint

The user reports successful transfers in both directions. The supplied browser observation is a
timeout after 60.0165 seconds, with 434/506 recovered symbols, 585 seen, 151 duplicates and no rejected
frames. Original file size/hash and optical settings are not present; the selected expected payload
was 10 KiB. A byte-for-byte copy is retained in [raw evidence](raw/2026-10-05-browser-timeout.json).
Successful exports and actual payload/device/settings metadata have been requested. No success
counts, throughput claims, acceptance rows or G2 pass are inferred from the general report.
If a report is inadmissible (for example a verified file mismatches the declared target), retain it
as unresolved evidence and investigate. Admission rejection is not permission to remove a timed
attempt from a physical acceptance run or change its expected metadata to manufacture a pass.
