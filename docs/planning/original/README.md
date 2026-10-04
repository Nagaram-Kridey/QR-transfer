# LumenLink

> Offline, encrypted, serverless file transfer between two devices using only a **screen and a camera**.
> No Wi-Fi. No Bluetooth. No cable. No account. No server.

**Status:** 🚧 Planning. Nothing below is claimed as achieved until it appears in `docs/benchmarks/`.
**Pre-v1.0 builds (MVP) are plaintext-capable and must not be used for sensitive data.** Security claims apply from Phase 5 onward.
(Working name: rename freely.)

---

## What it is

The sender screen plays a looping stream of QR codes. Each frame carries a small, self-describing slice of
an encrypted, fountain-coded file. The receiver's camera reads frames in *any order*, tolerates dropped or
duplicate frames, and rebuilds the file once enough frames have been seen. The channel is one-way and lossy by
nature, so the protocol is designed so that **no acknowledgements are required**.

```
 [Sender]  file → compress → encrypt → fountain-encode → QR frames ──light──▶ camera → decode → verify → file  [Receiver]
```

## Who it is for (honest scope)

| Good fit | Poor fit |
|---|---|
| Air-gapped or no-network machines | Moving large files (use AirDrop / USB / LocalSend) |
| Offline signing / key & config hand-off | Anything over ~1 MB |
| Zero-pairing, zero-trust, "nothing touches a network" cases | Casual everyday sharing |
| Low-connectivity field sync of small datasets | Hostile lighting, shaky hands |

## Features (target v1.0)

- Browser app (PWA), **fully client-side and installable, works offline**
- Send: pick a file or paste text, choose density/FPS, see loop count and progress
- Receive: live camera view, symbol-recovery grid, ETA, integrity verdict, save
- Fountain-coded stream, so any sufficient subset of frames rebuilds the file (validated against a naive repeat-loop baseline; if the baseline wins at realistic sizes, the project ships the baseline)
- Compression (zstd/deflate), AES-256-GCM encryption, per-frame authentication tag
- Python reference implementation + CLI (`pip install lumenlink`) for air-gapped Linux
- Language-neutral protocol spec with **conformance test vectors** (Python ⇄ TypeScript interop)
- In-app **Link Lab** that benchmarks your own device pair

## Quickstart (planned)

```bash
# Web app
cd web && npm install && npm run dev        # http://localhost:5173

# Python CLI
pip install -e ./python
lumenlink send ./config.json --fps 10 --density medium
lumenlink receive --camera 0 --out ./received/

# Tests
pytest python/ -q          # unit + property-based + simulator
npm --prefix web test      # unit + conformance vectors
npm --prefix web run e2e   # Playwright with a virtual camera feed
```

## Safety and intended use

- **Photosensitivity:** the sender flashes images. Default ≤10 fps, a first-run warning and a reduce-flashing/dim mode are built in. Do not use it near anyone with photosensitive epilepsy without enabling them.
- **Intended use:** air-gapped and offline hand-off of your own data. Any screen-to-camera channel can bypass network and USB controls; do not use this to move data you are not authorised to move. There are no stealth or hidden-channel features.

## Prior art

Animated-QR streaming and fountain codes are established ideas (e.g. Blockchain Commons UR, TXQR; high-density colour codes such as Cimbar). LumenLink is a design informed by that work, not a new invention. See `docs/prior-art.md` (Phase 0).

## Security model (summary)

Anyone who can see the screen can record the stream, so **confidentiality rests entirely on the key**.
See `ARCHITECTURE.md §6` and `RISKS.md`. Received files are untrusted and are never opened automatically.

## Benchmarks

Filled in from real device-pair tests (see `PHASE_PLAN.md`, Phase 6). Nothing is reported until measured.

| Payload | Density | FPS | Device pair | Success (n=20) | Median time | Effective KB/s |
|---|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## Documentation map

| File | Purpose |
|---|---|
| `CONTEXT.md` | Goals, non-goals, conventions, glossary; start here |
| `ARCHITECTURE.md` | Layers, frame format, fountain code, crypto, UI, testing, ADRs |
| `PHASE_PLAN.md` | Phased delivery with measurable exit criteria and kill gates |
| `RISKS.md` | Risk register and assumptions to validate |
| `RED_TEAM.md` | The adversarial critique of the idea, and what changed because of it |

## License

MIT (proposed).
