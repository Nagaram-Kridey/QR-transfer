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
results; no new hosted CI or Pages deployment is claimed for CP-02C.

## Limits and decision

This expands software capacity and does not improve measured optical throughput. Larger payloads
remain experimental. Older receivers reject streams exceeding their previous file/container limits
or 2048-symbol cap; that can include a file below 1 MiB encoded into a longer cycle. Update both
endpoints for this profile. Large JSON imports can take appreciable time on some engines.

No larger-file physical reliability, autoframing benefit, security, offline installation or G2
qualification is established. Plaintext labeling remains in place. Existing physical gates and the
future fountain experiment's original bounds are retained. Commit/push and Pages deployment require
the user's explicit CP-02C approval. See [testing review](CP-02C-testing.md) for the adversarial
findings and matching final verdict.
