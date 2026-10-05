# CP-02A independent testing review

Date: **2026-10-05 (Asia/Kolkata)**. Role: independent testing/break agent.
Base commit: `79f25e9`. This feature is a local candidate: not approved, committed, pushed or deployed.

## Scope and verdict

**PASS within CP-02A:** all confirmed in-scope findings, including the final cross-field review below,
are resolved and testing identifies no known unresolved blocking issue in the candidate below.
Development independently agrees on this same revised snapshot, as recorded below.

Read the separate [Development verdict](CP-02A-development.md), including its independent final
checks, matching fingerprint, review of the 196 adversarial cases and failure-preservation policy.
**Testing explicitly agrees with Development** on the frozen
`e1b284d84dc6468fd121a763c88941dc7caab6b26b8a718fb2caf932b7d01383` candidate: all confirmed
CP-02A issues are resolved and neither review identifies a known unresolved blocking issue in scope.
Both support submitting this feature for user approval. Agreement is not user approval or a G2 pass.

The scope is local bookkeeping for the existing physical feasibility checkpoint: strict report and
metadata intake, preservation of all outcomes, frozen run identity, bounded CSV storage and honest
per-run statistics. Reviewed the contract, CSV header/template, helper implementation and CLI diff.
Neither optical transport, wire codec, dependency lockfile, browser workflow nor a later gated
product feature changed. Existing send/receive/simulate regressions remain passing.

## Independent adversarial work

Authored `python/tests/test_benchmark.py`: **196 cases**, all explicitly synthetic inputs kept in
test fixtures/temporary directories. A read-only nested testing audit supplied additional provenance,
denominator, ambiguity and statistics cases; it changed no files and did not access the user's report.

Initial runnable checks reproduced:

- **Windows lock cleanup failure:** unlinking the open lock handle caused recording and the CLI to
  fail after writing. The handle now closes before cleanup, and record/append regressions pass.
- **Nonfinite JSON bypass:** exponent overflow `1e999` produced infinity despite a parse-constant
  guard. Finite checking during float parsing now rejects it, including values outside used fields.
- **Contradictory browser recovery counts:** 41 recovered symbols plus a duplicate with only
  1/40/41 seen frames were accepted as success. Consistency checks now reject those cases. Failed
  verification may count its final frame as both recovered and rejected; checks preserve that valid
  failure shape instead of imposing the success-only sum rule universally.

The coordinator's independent shape findings and development's arithmetic/resource review were
also covered: malformed receiver state reports return CLI errors instead of tracebacks; optional
report strings and session IDs are validated; finite extreme medians remain finite; and the pure
summary API enforces the byte cap without relying on a prior CSV read.

Before joint signoff, Development identified a file/symbol-total consistency gap and Testing held
its verdict. Seven additional regressions failed on the earlier candidate: impossible verified
symbol totals/settings, unencodable acceptance metadata and a missing warning on failed unexpected
streams. The final policy requires success totals within the loose current plaintext manifest bounds;
acceptance metadata must permit at most 2048 source symbols. A failed receiver may legitimately lock
an unexpected stream, so its discrepant total is retained with a review warning and stays in the
denominator. Root confirmed that policy, Development implemented it, and all seven regressions pass.

The final suite challenges:

- Missing/extra/unknown metadata, booleans as numbers, numeric/count bounds, malformed hashes,
  unsupported profiles, ambiguous format markers, invalid Unicode, nonfinite/trailing/duplicate-key
  JSON, and observation/expected-size/hash/deadline contradictions.
- Exactly 20 trials, all tier boundary cases, retention of failed/cancelled/timed-out attempts,
  separate setup observations, global duplicate IDs, every frozen run dimension, and separation of
  opposite directions, reruns, exploratory phases and changed settings.
- Successful-only median/nearest-rank p95 and median of individual original-file KiB/s, including
  even-count cases where dividing size by median time gives the wrong answer; empty successes yield
  null statistics. Decimal KB payloads cannot accidentally earn a KiB tier.
- Exact CSV headers/row widths, legacy migration refusal, canonical raw-row validation, Unicode
  label roundtrips, bounded files/rows, competing writer locks and atomic replacement failure.
  Rejected writes preserve the existing CSV and input reports; temporary files/owned locks clean up.
- Physical recording requires explicit operator attestation; synthetic plus attested-physical is
  rejected. Explicitly unattested external physical rows can be summarized but never qualify.
  Synthetic acceptance fixtures also remain nonqualifying. Every summary requires manual G2 review.

## Actual final checks

Executed after the last test edit **and after** development's final CLI help edit, avoiding stale
static-check evidence from the earlier checkpoint:

| Command | Observed result |
|---|---|
| `uv run --project python ruff check python/src python/tests` | Passed |
| `uv run --project python ruff format --check python/src python/tests` | Passed; all 16 files formatted |
| `uv run --project python mypy python/src` | Passed; no issues in 11 source files |
| `uv run --project python pytest python/tests --cov=lumenlink --cov-config=python/pyproject.toml` | **293 passed** in 4.86 seconds; includes all 196 new benchmark cases |
| `git diff --check` | Passed |

Protocol-module coverage is **100%**, and the configured 90% gate passes. The coverage configuration
excludes CLI/optical/simulator/benchmark modules; this is not a claim of 100% whole-project or new
helper coverage. Browser code/tests did not change, so browser suites were not needlessly repeated.
No hosted CI result is claimed for this unpushed candidate.

## Reviewed source/test revision

Independently calculated fingerprint:
`e1b284d84dc6468fd121a763c88941dc7caab6b26b8a718fb2caf932b7d01383`.

Algorithm: sort these paths, normalize CRLF to LF in each file's content, SHA-256 each, concatenate
UTF-8 `path:hash` lines with one LF each, then SHA-256 the combined bytes:

1. `python/src/lumenlink/benchmark.py`
2. `python/src/lumenlink/cli.py`
3. `python/tests/test_benchmark.py`

Development/testing agreement must identify this same candidate. A material source/test change
requires fresh review and relevant reruns before approval submission. Status-only documentation
finalization must accurately state approval and delivery remain pending.

## Physical evidence limitations

The user reports transfers working in both directions. Root inspected and preserved the provided
browser export, which records a **timeout**, with actual payload size/hash/settings missing. Testing
did not access or modify the user's Downloads file and has not performed a new physical trial.
The helper cannot authenticate camera provenance, operator metadata, timing discipline, whether
failed attempts were omitted, or whether a report was fabricated. Attestation is an operator statement.

No complete 20-trial frozen acceptance cell is established. Matching Tier A failure for Tier B,
the one eight-hour investigation, device-pair coverage and G2 remain manual decisions. The Windows
identity discrepancy and incomplete settings/verified success exports remain evidence dependencies.
This scoped PASS does not establish physical reliability, throughput, mobile qualification, security,
offline PWA support or approval for product expansion.

Stop for explicit **CP-02A** user approval before committing/pushing this feature. Pages redeployment
is unnecessary for this CLI-only change; physical evidence collection remains the next dependency.
