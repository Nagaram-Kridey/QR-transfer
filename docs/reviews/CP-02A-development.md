# CP-02A development review

Date: **2026-10-05 (Asia/Kolkata)**. Role: development/check agent.
Base commit: `79f25e9`. Feature remains local: user approval, commit/push and hosted CI are pending.

## Scope and verdict

**PASS within CP-02A:** after the coordinator's final source/test freeze, I agree with the
[independent testing verdict](CP-02A-testing.md) on the identical revised snapshot below. All
confirmed in-scope findings are resolved; I know of no unresolved blocking issue in this evidence
tooling. This is a scoped software review, not a guarantee of undiscovered-bug absence, physical
provenance, G2 qualification or permission to start later product stages.

Implemented `python/src/lumenlink/benchmark.py` and minimal CLI integration for `benchmark record`
and `benchmark summarize`. Existing send/receive/simulate behavior and all browser/wire/crypto
implementations are unchanged. No new dependency, camera access or upload path was introduced.

## Behavior and decisions reviewed

- Strict bounded observation and metadata JSON intake rejects duplicate keys, trailing content,
  nonfinite numbers including exponent overflow, malformed profiles, invalid Unicode, booleans as
  numbers, missing/extra metadata and contradictory verified size/hash/deadline/count claims.
- Physical recording requires an explicit operator flag. Exploration is the default; setup
  failure/cancellation without elapsed time remains outside the timed denominator. External
  physical/unattested CSV rows can be retained for nonqualifying summaries; synthetic plus physical
  attestation is rejected. None of these statements proves where an image/report originated.
- Extended CSV has explicit run identity, phase, attestation and timeout. Each run is one immutable
  cell; changing its device/direction/payload/settings/source/phase requires another run ID. Duplicate
  trial IDs, malformed/legacy headers and inconsistent existing rows reject before replacement.
  Exclusive writer locks and atomic replacement preserve prior CSV bytes on rejected/failed writes.
- Summary independently validates raw rows, bounds both file and pure API inputs, and never pools
  runs or trims more than 20 trials to manufacture eligibility. All timed failure/timeout/cancelled
  outcomes remain in the denominator; setup observations are separately counted.
- Successful-only median time, nearest-rank p95 and median of individual original-file KiB/s are
  labeled explicitly. Safe positive median arithmetic avoids overflowing otherwise finite inputs.
  Empty success sets produce null metrics. Candidate statuses follow the agreed numerical policy;
  every summary retains `gate_decision=manual_review_required` and unverified/operator-supplied
  provenance. Tier B's prerequisite, tuning budget and device coverage remain human decisions.

The tester independently reproduced the initial Windows open-lock cleanup failure, JSON exponent
overflow and inconsistent success recovery counters. The coordinator challenged malformed state
and optional/session fields. I fixed each case and reviewed the independent regressions. My final
source review also found that a verified browser source-symbol total could contradict declared
file/symbol settings. The coordinator froze the precise policy: reject inconsistent success totals
and impossible acceptance encodings, but retain failed unexpected-stream totals with review warnings.
This preserves failed attempts rather than treating an untrusted locked stream as the intended file.
Seven additional independently authored regressions passed after that correction.

Read the final **196 synthetic benchmark cases** and the tester's updated report. They check actual
admission, preservation, grouping, arithmetic and candidate boundaries, including disk replacement
failure and competing locks. Test fixtures/temporary data are explicitly software inputs, not
recorded physical trials. Reviewed the contract, extended template, metadata example and current
benchmark guidance; the example requires actual operator identity/settings before use.

## Actual final development checks

Executed after the final source/test edits and independently of the tester's final executions:

| Command/check | Observed result |
|---|---|
| `uv run --project python ruff check python/src python/tests` | Passed |
| `uv run --project python ruff format --check python/src python/tests` | Passed; all 16 files formatted |
| `uv run --project python mypy python/src` | Passed; no issues in 11 source files |
| `uv run --project python pytest python/tests --cov=lumenlink --cov-config=python/pyproject.toml` | **293 passed** in 4.75 seconds, including 196 new benchmark cases |
| `git diff --check` | Passed |
| Independent normalized source/test fingerprint | Identical to tester/coordinator freeze |

Protocol coverage is **100%** with the configured 90% threshold satisfied. That configuration
excludes CLI/optical/simulator/benchmark modules; it does not establish 100% whole-project or new
helper coverage. The coordinator separately reports passing sdist/wheel builds and an isolated
Python 3.12 wheel installation that runs the new packaged summary CLI against the header-only
template, returning empty runs and manual review. No browser implementation changed; its suites
were not repeated as new evidence for this Python-only feature. No candidate hosted check is claimed.

## Shared frozen snapshot

Independently calculated and explicitly agreed with the tester/coordinator:

`e1b284d84dc6468fd121a763c88941dc7caab6b26b8a718fb2caf932b7d01383`

Sort these three paths, normalize CRLF to LF in each file's bytes, SHA-256 each, concatenate UTF-8
`path:hash` lines with one trailing LF each, then SHA-256 the combined bytes:

1. `python/src/lumenlink/benchmark.py`
2. `python/src/lumenlink/cli.py`
3. `python/tests/test_benchmark.py`

Any source/test change requires renewed review and relevant checks. Earlier intermediate test
counts/fingerprints are superseded by this final snapshot. Coordinator documentation-only status
finalization must accurately preserve the pending user decision and delivery state.

## Physical evidence and next action

The user reports successful transfers in both directions. The coordinator preserved the supplied
browser export, which records a timeout; actual original size/hash/settings and successful exports
remain missing. I did not access the user's Downloads file or perform a physical trial. A selector
value, partial symbol count or operator statement cannot establish original payload size or qualify
an acceptance cell. Raw rejected/contradictory reports must remain evidence for investigation;
they are not permission to omit an attempt or edit expected metadata to manufacture a pass.

No complete frozen 20-trial cell or G2 result has been established. The build remains a plaintext
feasibility experiment; PWA, security, fountain and release stages remain gated. Present CP-02A for
explicit user approval before committing/pushing this reviewed feature. Pages redeployment is
unnecessary for this CLI-only change; continue collecting actual physical evidence afterward.
