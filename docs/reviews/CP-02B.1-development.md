# CP-02B.1 development review

Date: **2026-10-07, Asia/Kolkata**. Reviewer: `/root/checkpoint_development`.
Base: `5ee3561`. Scope: local full-frame browser camera diagnostics only.

## Verdict and shared revision

**PASS within CP-02B.1.** I independently inspected the final application and adversarial test
changes, read the [testing verdict](CP-02B.1-testing.md), and agree with that verdict on the identical
frozen source/test revision. All confirmed in-scope findings are resolved; I know of no unresolved
blocking issue within this checkpoint. This is a scoped engineering review, not a guarantee that
undiscovered issues are absent.

I independently calculated SHA-256
`91675844c1ca3f90f87779288a92ec1376bd4284d704916519df49a644287374`
over these eight sorted paths: normalize each file's CRLF to LF, hash its bytes, concatenate UTF-8
`path:sha256\n` lines, and hash that concatenation:

- `web/e2e/camera.spec.ts`
- `web/e2e/harness.spec.ts`
- `web/src/diagnostics/camera.test.ts`
- `web/src/diagnostics/camera.ts`
- `web/src/ui/App.tsx`
- `web/src/workers/messages.ts`
- `web/src/workers/receiver.worker.test.ts`
- `web/src/workers/receiver.worker.ts`

No source/test edits followed that freeze. I also reviewed the
[diagnostics contract](../benchmarks/BROWSER_DIAGNOSTICS.md),
[experiment plan](../planning/AUTOFRAMING_PLAN.md), and current checkpoint/handoff documents.
Their scope and approval stops match this implementation.

## Behavior and corrections reviewed

The existing camera constraints, width-960 full-frame scaling, 33 ms polling, ZXing decoder options,
and one-image-in-flight behavior remain in place. Both independent codecs, their public APIs,
wire vectors/specification, Python source, dependency locks and workflows are unchanged. There is
no ROI selector, geometry, second frame parse/hash, PWA or secure-transfer feature in this change.

The worker measures local decoding/admission durations and emits a scan result with receiver
statistics before completion or failure can terminate it. The main thread separately measures
capture/readback and round-trip durations. A successful `postMessage` counts as submitted; dimensions
are counted before buffer transfer. Native crashes and trial termination leave unfinished worker
measurements null. Terminal integrity failure can advance the recovered-symbol count while admission
returns an error; those deltas are not a verified-file claim.

Whole-trial aggregates and a latest-256 terminal-record buffer have distinct meanings. Discarded
records remain counted, snapshots are detached and deeply immutable, and interrupted/capture-failed
attempt accounting is consistent. Only whitelisted numeric metric fields and fixed error labels
enter records. The tester identified arbitrary-property leakage, absolute pending-clock exposure,
mutable snapshots during digest waits and an uncontained validation error by source inspection,
then verified their fixes with regression tests. No failing baseline test run is claimed for these
concurrently corrected findings.

The original observation-v1 JSON is serialized once without added fields or a trailing newline.
The separate sidecar hashes exactly those downloaded UTF-8 bytes. Generation guards reject stale
worker and digest results. Diagnostic collection/hash failure disables only the sidecar, preserving
the original observation and verified save. Imports and camera setup before timing create neither a
camera observation nor diagnostic evidence.

## Verification and limits

My independent checks on the final frozen source/tests passed: **69 Vitest tests**, ESLint, strict
TypeScript and `git diff --check`. Production build and both-direction shared-vector checks also
passed with the same application source: Python fixtures match the checked-in wire contract and
Python verified four independently emitted TypeScript transfers. The independent testing report
records its final production build, codec coverage and **46 passing Playwright cases**, including
clean/degraded real-WASM synthetic-camera paths and all browser harness projects.

I reviewed the added tests for ring bounds, privacy, invalid metrics, terminal failure ordering,
dispatch/capture errors, unknown interrupted timings, exact observation bytes, hash races, setup/import
exclusion and continued verified saving after a diagnostics validation failure. The existing codec
coverage is 100%; this does not claim 100% coverage of diagnostics or UI. Root independently checked
the ignored 679-byte synthetic cancelled observation and sidecar digest, and confirmed compatibility
with the unchanged strict Python observation normalizer.

Timings/pixels are elapsed-time and utilization proxies with instrumentation overhead, not CPU or
battery measurements. Scan gaps cover consecutive successful dispatch starts, excluding initial and
trailing intervals. The latest-256 buffer cannot establish session p95. Android/iPhone compatibility,
physical G2 qualification, measured speed gain and ROI adoption remain unproven; no physical trials
were performed for this checkpoint.

**Agent agreement is not user approval.** This candidate is local; no commit, push, hosted CI or
Pages redeployment has occurred for it. Stop for explicit CP-02B.1 approval before delivery or any
CP-02B.2 work.
