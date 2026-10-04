# Prior art and positioning

Primary sources reviewed during planning (2026-10-04). This project claims no novel optical channel,
fountain code or cryptographic primitive. It is an independent implementation and measured study.

| Project | Existing contribution | LumenLink relationship |
|---|---|---|
| [Blockchain Commons multipart UR](https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2024-001-multipart-ur.md) | Multipart animated-QR encoding; systematic/fountain strategies and interoperability guidance | Learn from deterministic framing/testing; do not claim UR compatibility |
| [TXQR](https://github.com/divan/txqr) | Animated QR transfer, fountain coding and parameter experimentation | Cite prior art; compare our repeat baseline before adopting LT |
| [Cimbar release notes](https://github.com/sz3/libcimbar/releases) | Browser sender/receiver including offline PWA operation | Browser/offline operation is not a unique contribution |

Differentiation for this portfolio: independent Python/TypeScript codecs, a readable versioned spec,
defensive parsers, evidence-backed transport selection, and reproducible device-pair results. These are
engineering goals; physical performance and complete security remain unmeasured/unimplemented.

Dependencies reused directly: Segno, OpenCV, zxing-cpp/zxing-wasm, qrcode, React/Vite and test tooling.
No claim that the visual QR rendering is original. Retain dependency licenses in distributions.
