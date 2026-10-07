# CP-02C independent adversarial testing review

Date: **2026-10-07, Asia/Kolkata**. Reviewer: `/root/larger_file_testing`.
Base: `6cd5d925adc1251cffbc90099010f1ec525f802b`.
Scope: experimental 5 MiB repeat-mode capacity, 8192-symbol resource policy, adaptive sender
density, bounded 16,000,000-byte frame import and supplied observation analysis. No deployment
or physical qualification is part of this review.

## Final revision and verdict

**PASS. All confirmed issues within this scope are resolved; no known blocking issue remains.**
Independent final 22-path source/test/spec/workflow fingerprint:
`9836cda788f8b43884907fe016c54921106036f071a140b73c5509052f6c129d`.
The development agent and coordinator independently calculated the same fingerprint. The
development agent explicitly agreed PASS on this final revision, and this reviewer agrees with
that verdict: all confirmed issues within the defined scope are resolved.

Each UTF-8 file is normalized from CRLF to LF and hashed. Sorted `path:sha256\n` entries are
concatenated and hashed again. The reviewed paths are:

- `.github/workflows/ci.yml`
- `.github/workflows/pages.yml`
- `.gitignore`
- `docs/spec/SPEC-v2.md`
- `python/src/lumenlink/benchmark.py`
- `python/src/lumenlink/cli.py`
- `python/src/lumenlink/constants.py`
- `python/src/lumenlink/container.py`
- `python/src/lumenlink/frame.py`
- `python/src/lumenlink/repeat.py`
- `python/src/lumenlink/sim.py`
- `python/tests/test_benchmark.py`
- `python/tests/test_protocol.py`
- `python/tests/test_sim_cli.py`
- `tools/large_capacity_interop.py`
- `web/e2e/harness.spec.ts`
- `web/scripts/large-capacity-interop.ts`
- `web/src/codec/core.test.ts`
- `web/src/codec/core.ts`
- `web/src/ui/App.tsx`
- `web/src/workers/receiver.worker.test.ts`
- `web/src/workers/receiver.worker.ts`

## Boundary and hostile-input review

Both implementations reconstruct the exact 5,242,880-byte maximum and reject one byte more.
Tests exercise the former 2048-symbol boundary, exact 8192, 8193 rejection, a 4096-byte canonical
manifest with maximum payload, and the resulting container overhead. Checksum-valid hostile
container length, symbol count and symbol size are rejected before receiver session allocation
or locking. Adaptive choices preserve valid preferences and promote 256 to 512 to 1024 only
when the complete prepared container requires it; explicit undersized CLI choices fail.

Import tests cover byte/count/text caps before reading, hashing or receiver admission as
appropriate. The larger cap prompted a review of all entries even after a complete cycle.
Malformed tails, valid unrelated sessions and checksum-valid conflicting duplicates now reject
before exposing a save. The development agent added bounded source-index comparison during
prevalidation after the coordinator and tester challenged the former early-completion path.
Python's bounded JSON parser could also raise an uncaught `RecursionError`; the developer
identified it and added a narrow conversion to a controlled CLI failure. Its regression returns
exit 2, with no traceback or output file. Standard optical decode behavior is unchanged.

Benchmark regressions allow larger exploratory records while rejecting acceptance promotion
through normalization, CSV reading and direct summarization. Standard acceptance retains its
1 MiB and 2048-symbol policy. Existing vectors were preserved.

## Actual automated results

- Full Python run: **337 passed**, protocol coverage **99.67%**. Two CLI regressions added after
  that run began passed in a separate fresh focused run: **2 passed**. Thus 339 distinct tests
  were verified; this is not a claim that one 339-test run occurred. Source/test/tool Ruff and
  formatting checks passed. The source owner separately passed final mypy and nine focused CLI
  rejection tests after the recursion repair.
- Fresh Vitest coverage run: **147 passed**. Coverage is for `core.ts`: statements **99.56%**,
  branches **100%**, functions **100%**, lines **99.34%**. The unreachable final density fallback
  is the uncovered line; camera/UI coverage is not implied.
- Production default-base build passed. **36 Playwright harness checks passed** across Chromium,
  Firefox and WebKit, including adaptive 2 MiB and 5 MiB preparation, export, import, verified
  byte-exact saving, plus-one rejection, oversized export rejection and malformed tails.
  The local Windows WebKit 2 MiB and 5 MiB artifact workflows took about 1.3 and 1.7 minutes;
  the unchanged 120-second per-case deadline was not relaxed and no outcome failed.
- **7 targeted Chromium camera checks passed**: real clean QR video reconstruction/saving through
  the existing worker/local WASM in full-frame and auto-region modes, reset, backgrounding,
  ROI timeout, camera timeout and stopping before trial timing. Other camera/replay cases were
  not rerun because this feature does not modify tracking/capture/decoder settings.
- The new reproducible interop tools passed all three ordered commands. Python emitted a
  **2,097,169-byte, 2049-symbol** public deterministic fixture; TypeScript independently reproduced
  every frame and reconstructed it, then prepared a different session/filename; Python reproduced
  every TypeScript frame and reconstructed the exact bytes. Generated artifacts remain ignored.
  Existing small vectors were also verified by the coordinator.

Initial test failures were stale assertions expecting the former density-error wording; they
were repaired to match the new minimum-size message and rerun. No product defect or failed
physical trial was hidden by that assertion correction.

## Supplied-file audit and limitations

The 748-byte observation's SHA-256 exactly matches the diagnostic link. It records one verified
879,942-byte success in 864.4303 seconds: **859.318359375 KiB at 0.994086 KiB/s**, 860 recovered
symbols, 4800 duplicates and 3 rejected frames. Diagnostic totals reconcile: 8977 full-frame
scans, zero ROI scans, zero interruptions/errors, and 256 retained plus 8721 discarded attempts.
The expected 1024 KiB setting differs from actual size and cannot be silently promoted through
the strict benchmark recorder. The supplied files stay local and ignored.

This record supplies no autoframing comparison, sender-FPS evidence, independent payload hash
verification, 20-trial acceptance cell or mobile-browser qualification. The reduced browser
user-agent does not establish the phone's actual Android version. Larger capacity is software
evidence, not faster optical transfer or a physical 5 MiB success. Plaintext labeling, full-frame
default, original feasibility gates and the approval-before-commit/push/deployment workflow remain
in force. This reviewer has not committed, pushed or deployed anything.
