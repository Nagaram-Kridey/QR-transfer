# CP-02C development review

Date: **2026-10-07, Asia/Kolkata (IST)**. Reviewer: development agent.
Base: `6cd5d925adc1251cffbc90099010f1ec525f802b`.
Scope: bounded larger-file software capacity in the independent Python and browser implementations.

## Final revision and verdict

The independently confirmed 22-path revision fingerprint is:

`9836cda788f8b43884907fe016c54921106036f071a140b73c5509052f6c129d`

**PASS. All confirmed in-scope issues are resolved; no known blocking issue remains.**

The development agent explicitly agrees with the adversarial testing agent on this same final
revision. The testing agent confirmed PASS after the final browser/camera checks. This is approval
to submit the local checkpoint for the user's decision; it is not user approval or delivery.

Fingerprint algorithm: combine changed tracked paths and new nonignored paths, select `.github/`,
`python/`, `web/`, `tools/`, `docs/spec/` and `.gitignore`, then sort unique paths. Normalize CRLF to
LF, hash each UTF-8 file with SHA-256, concatenate `path:lowercase_digest` plus a newline for every
path, and SHA-256 that UTF-8 concatenation. Review reports and other planning documents are outside
this implementation/specification fingerprint.

## Source and resource review

Original file capacity increases from 1 MiB to **5 MiB (5,242,880 bytes)**. Repeat source-symbol
capacity increases to **8192**, and frame JSON intake is bounded at **16,000,000 bytes**. The 4 KiB
manifest, 1024-byte symbol, frame layout, flags, checksum, padding and wire-v2 serialization remain
unchanged. Frame metadata is validated before a session is admitted; a receiver still admits one
session, stores bounded source indices and exposes a file only after exact size/hash verification.

Browser preparation promotes the selected density among 256/512/1024 bytes only when needed to fit
the prepared container, updates the selector and shows a notice. The default CLI and simulator
choose a fitting density; an explicit CLI density remains explicit and receives usable minimum-size
guidance when it cannot fit. Empty and small files retain their previous default density and bytes.
Browser file-size rejection occurs before `arrayBuffer`, and import byte limits precede JSON parsing.

Both frame importers validate every entry's bounds, checksum and immutable session metadata before
ingestion. Bounded source-index maps reject conflicting duplicates even after an otherwise complete
cycle; the temporary validation maps are released before reconstruction. A narrow Python JSON-parser
catch converts excessive nesting into a controlled rejection before receiver allocation or saving.
Camera decoding still uses one attempt per submitted image and one image in flight.

The benchmark recorder accepts larger payloads as exploratory evidence. Acceptance retains the
original 1 MiB/2048-symbol profile and standard FPS limit. The expected-payload selector adds 2 MiB
and 5 MiB with the existing timeout formula. Supplied observation bytes are preserved and ignored;
their analysis is documented separately, without changing physical qualification.

## Actual verification

Independently run by the development agent on the final Python source:

- Ruff lint, formatting check and mypy passed.
- Five focused maximum-file, maximum-manifest and hostile-header checks passed, including exact
  5 MiB reconstruction and rejection before locking/allocating an invalid session.
- Nine final CLI rejection checks passed: excessive JSON nesting, byte/count limits, malformed
  trailing entries, mixed sessions and checksum-valid conflicting trailing symbols; no file saved.
- The final 22-path fingerprint matched the root and testing agent; diff whitespace check passed.

The testing agent's final report records 147 Vitest checks, 36 Chromium/Firefox/WebKit harness checks
and seven targeted Chromium camera regressions passing. Python coverage ran 337 tests, followed by
two newly added CLI regressions on the final parser repair (339 distinct passing checks). Reported
coverage is 99.67% on configured Python protocol modules; TypeScript codec coverage is 99.56%
statements, 100% branches/functions and 99.34% lines. Coverage scope excludes the camera/UI adapters.
Large interoperability checks verified 2,097,169 bytes and 2049 symbols in both directions, including
byte-identical independently generated frames. Exact 5 MiB export/import/save passed in all three
browser engines. WebKit's large case took about 1.7 minutes within the existing 120-second test
timeout; no test limit was relaxed.

The root separately verified unchanged shared-vector reproduction, all four existing TypeScript to
Python cases, final-source sdist/wheel creation and an isolated Python 3.12 wheel CLI help/install
smoke. Production builds passed for the GitHub Pages `/QR-transfer/` base and the restored default
base, with local worker/WASM asset paths. The
reviewed workflows now exercise the large cross-language cases as well. These are local verification
results at local review; subsequent delivery verification is recorded below.

## Limits and decision

This expands software capacity and does not improve measured optical throughput. Larger payloads
remain experimental. Older receivers reject streams exceeding their previous file/container limits
or 2048-symbol cap; that can include a file below 1 MiB encoded into a longer cycle. Update both
endpoints for this profile. Large JSON imports can take appreciable time on some engines.

No larger-file physical reliability, autoframing benefit, security, offline installation or G2
qualification is established. Plaintext labeling remains in place. Existing physical gates and the
future fountain experiment's original bounds are retained. Commit/push and Pages deployment required
the user's explicit CP-02C approval, subsequently recorded in the delivery section. See
[testing review](CP-02C-testing.md) for the adversarial
findings and matching final verdict.

## Delivery verification — 2026-10-07 (Asia/Kolkata)

The user explicitly approved CP-02C commit/push and Pages deployment after hosted CI. The reviewed
source was delivered as `c451a1a5dc7509eb5f84eb590a81357af46c2044`. The development agent independently
confirmed the committed 22-path fingerprint remained
`9836cda788f8b43884907fe016c54921106036f071a140b73c5509052f6c129d`. The coordinator verified that
[hosted CI](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37662957793) and
[Pages](https://github.com/Nagaram-Kridey/QR-transfer/actions/runs/37664035403) passed for that commit
before authorizing the independent live smoke.

The development agent then exercised the deployed
[project-base site](https://nagaram-kridey.github.io/QR-transfer/) with headless Chromium and public
synthetic fixtures. Actual results:

- HTTP 200 with expected approved `index-BpzRN7xr.js`; default 8 fps and Full frame preserved.
- Both experimental expected-payload presets present: 2 MiB/6144 seconds and 5 MiB/15360 seconds.
- Exact 5,242,880-byte public file prepared from the default density, visibly promoted to 1024-byte
  symbols and exported as 5121 frames (8,152,675 JSON bytes). Frame import verified and explicitly
  saved the byte-identical 5 MiB file. SHA-256:
  `38d3b1d32cdc2f4e84637fd017fe40bc09e794c106fe395e586f776171f7d4ed`.
- A separate public synthetic camera stream completed in Auto region through the actual deployed
  worker/WASM path and saved the exact 320-byte fixture. The final scan completed, with three ROI
  scans and one full-frame scan, no pending attempt and zero interruptions. Observation-v1 and
  diagnostic-v2 formats and the exact observation digest linkage passed.
- Local project-base `receiver.worker-DYrXf6hs.js` and `zxing_reader-Bb9Mx2Pu.wasm` returned HTTP 200.
  Zero page errors, HTTP failures, failed requests, external requests or upload requests observed.

The ignored smoke report is `artifacts/CP-02C-live-development-smoke.json`; generated frame exports,
verified fixture files and observation/diagnostic sidecars remain ignored. This confirms software
delivery. The 5 MiB transfer above used frame JSON, and the optical path used a synthetic 320-byte
stream. These checks establish no 5 MiB physical camera transfer, phone qualification, throughput
improvement or physical gate result.
