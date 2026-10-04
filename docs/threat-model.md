# Threat model — feasibility build

**Current build is plaintext. No confidentiality or sender authentication is provided.** Checksums
and the final file hash detect accidental corruption; an attacker can recompute both. This document
does not certify that Stage 4 has been implemented or audited.

Assume attackers can observe/record the screen, display injected QR codes and provide malicious files.
Device/browser compromise and malicious installed software are outside the cryptographic threat model.
Hosting/build compromise can replace the client and is not solved by the transfer protocol.

| Threat | Current behavior | Future complete security milestone |
|---|---|---|
| Screen recording | Contents recoverable; clear warning; use non-sensitive data | AES-GCM; high-entropy phrase kept off-screen |
| Frame injection/spoofing | Noise checksum only; no claim of authenticity | HMAC before symbol admission, final GCM verification |
| Session switching | Lock session; explicit reset to switch | Same, plus no unsolicited repeated KDF work |
| Oversized frames/allocation | Bound text, header, S, k and total length before collection | Same + bounded equation/decompression work |
| Duplicate floods | Source-index map ≤k; reject conflicting duplicate | Same + authenticated admission |
| Malicious name/content | Sanitize filename; exclusive save; never auto-open | Same; authenticated data can still be malicious |
| Compression bomb | Compression unsupported/rejected | Bound streaming output; reject trailing/truncated input |
| Weak shared phrase | No encryption yet | Generated high-entropy phrase; fixed KDF; offline guessing documented |
| Runtime dependency leak | Self-host WASM/JS, no analytics/uploads | PWA precache of all dependencies; no transfer networking |
| Browser rendering injection | React text rendering; fixed octet-stream downloads | Retain these boundaries |

SHA-256 success does not mean the file is safe. Passphrase authentication later proves knowledge of
the secret, not a verified person's identity. Disabling compression does not conceal file length.
The 16-byte session ID and length remain public. No application claim of cryptographic memory erasure.

GitHub Pages uses an HTML meta CSP. Header-only protections and worker response CSP are not provided
by that meta tag; document this limit. Lockfiles/actions are pinned and dependency audits are separate
checks, not proof that dependencies are harmless. Manual audits remain required before secure release.

Intended use: authorized offline hand-off. No stealth, hidden-channel or automatic exfiltration features.
