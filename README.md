# LumenLink

Offline screen-to-camera file transfer: a Python reference implementation and an interoperable
TypeScript browser harness. A sender displays QR symbols; the receiver collects them in any order,
checks the reconstructed file and offers an explicit save.

**Current status: Stage 1 feasibility build, plaintext repeat-mode only.**
Anyone who sees the stream can read it. Use non-sensitive test data. Encryption, compression,
fountain coding, offline installation and production mobile support are not implemented or claimed.
No frozen 20-trial device-pair benchmark is recorded. The user supplied one internally consistent
[859 KiB full-frame success](docs/benchmarks/2026-10-07-observation-review.md). The local CP-02C
candidate supports up to 5 MiB experimentally; this is software capacity, with physical reliability
and transfer speed still to measure. The larger-file build awaits approval and deployment.

## Run locally

Requires Node 24 and Python 3.12. `uv` can provision the Python interpreter:

```powershell
uv python install 3.12
uv sync --project python --locked
npm --prefix web ci
npm --prefix web run dev
```

Open the Vite URL on the development computer. Choose a non-sensitive file or enter text,
prepare a QR, acknowledge flashing, then play. The receiver can enable its camera, align the
QR, start timing, verify and explicitly save. No receiver progress is sent back to the sender.

For a phone camera, use an HTTPS-hosted build. A plain HTTP LAN address is not equivalent to
localhost on the phone. Repository: [Nagaram-Kridey/QR-transfer](https://github.com/Nagaram-Kridey/QR-transfer).
Live feasibility harness: **https://nagaram-kridey.github.io/QR-transfer/**. Deployment and verification
history is tracked in [UPDATE.md](UPDATE.md).
An already-open page can transfer with networking disabled after its runtime assets are loaded;
offline reload/installation is a later milestone, not currently supported.

## Python CLI

```powershell
uv run --project python lumenlink send ./example.txt --fps 8 --acknowledge-flashing
uv run --project python lumenlink receive --camera 0 --out ./received --timeout 60 --report ./trial.json
uv run --project python lumenlink simulate --bytes 10240 --loss 0.3 --seed 42
```

In the sender window, Space pauses and Esc stops. In the receiver window, align the QR first,
then press Space to begin processing/timing; Esc cancels. Camera access is local, not a phone
camera feed over Wi-Fi. Keep the sender running until the receiver finishes.

The CLI records failed/cancelled/timed-out camera observations as well as successes when a report
path is supplied. Add the required device/settings metadata before treating observations as trials.
Existing files are never silently overwritten. Received files are never opened automatically.

To check interoperability without cameras:

```powershell
uv run --project python lumenlink send ./example.txt --export ./frames.json
uv run --project python lumenlink receive --frames ./frames.json --out ./received
```

The browser also imports/exports this frame JSON format. These are codec tests, not optical trials.

The CLI also provides `lumenlink benchmark record` and `lumenlink benchmark summarize`
for observation JSON, explicit cell metadata and per-run CSV summaries. See the
[benchmark guide](docs/benchmarks/README.md) for commands, schema and operator attestation.
The tool reports numerical candidates for manual review; physical qualification still requires
the real 20-trial acceptance runs. Check [CHECKPOINTS.md](CHECKPOINTS.md) for approval/delivery status.

The [browser autoframing experiment](docs/planning/AUTOFRAMING_PLAN.md) starts with delivered
full-frame diagnostics. After a timed camera trial, export the observation and separate camera
diagnostics; the [collection guide](docs/benchmarks/BROWSER_DIAGNOSTICS.md) explains their bounds
and checksum linkage. An [opt-in ROI prototype](docs/benchmarks/BROWSER_AUTOFRAMING.md) is deployed
for manual testing with experimental 15/20/30 fps sender targets. Full-frame remains default; measured speed
gains and physical adoption remain pending. See CHECKPOINTS.md.

## Implementation

The [larger-file capacity decision](docs/adr/004-experimental-repeat-capacity.md) expands repeat
mode to 5 MiB and 8192 source symbols. Default sender preparation chooses a supported symbol size
that fits the container, including manifest overhead. Maximum-size files need 1024-byte symbols.
Update both endpoints for larger transfers; older receivers reject streams outside their original
limits. Large-file observations are exploratory and do not qualify the existing feasibility gate.

- Python and TypeScript independent wire-v2 encoders/decoders with shared conformance vectors.
- RFC 9285 Base45, canonical bounded manifest, SHA-256 file integrity and 8-byte frame checksum.
- Repeat transport with duplicate handling, session lock and malformed-frame rejection.
- CLI QR renderer/scanner, seeded lossy-channel simulator, browser worker/WASM camera harness.
- Property tests, parser fuzz cases, cross-language tests and synthetic camera-video regression.
- Locked dependencies and GitHub Actions for checks and Pages publishing.

The checksum is not authentication. Mobile support, secure modes and release milestones remain
behind the physical feasibility gate; see [implementation status](IMPLEMENTATION_PLAN.md).

## Test

```powershell
uv run --project python pytest python/tests --cov=lumenlink --cov-config=python/pyproject.toml
npm --prefix web run test:coverage
npm --prefix web run vectors:emit
uv run --project python python tools/verify_ts_vectors.py
```

The complete lint/type/build/browser commands are in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).
Real-device trials are defined in [the benchmark protocol](docs/benchmarks/README.md). Do not put
simulator or generated-camera results in the physical benchmark table.

## Safety and boundaries

Animated QR codes flash. Check your surroundings, use the 2 fps option to reduce flashing, and
pause whenever needed; no playback rate is represented as medically safe. Standard rates and the
Python sender are capped at 10 fps. The local candidate adds opt-in browser **15/20/30 fps target
rates** for exploratory tests, with a separate acknowledgement for the selected high rate. Actual
display speed depends on rendering/device load; higher targets may miss receiver opportunities.
Only transfer data you are authorized to move. There are no stealth features.

Keep files small. Use a conventional channel when available for large files. Anyone able to
record plaintext QR codes can recover the contents. Treat received files as untrusted even when
the SHA-256 integrity check succeeds.

## Documentation

| Document | Purpose |
|---|---|
| [MODEL_HANDOFF](MODEL_HANDOFF.md) | Start here: completed work, evidence, setup and next-model continuation guide |
| [CHECKPOINTS](CHECKPOINTS.md) | Development/testing review and user approval before each checkpoint push |
| [PROJECT_PLAN](PROJECT_PLAN.md) | Scope, schedule, milestones and gates |
| [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md) | Execution status, dependencies and checks |
| [UPDATE](UPDATE.md) | Dated work log, verification and next steps |
| [CONTEXT](CONTEXT.md) | Goals, conventions and invariants |
| [ARCHITECTURE](ARCHITECTURE.md) | Components and application behavior |
| [Protocol spec](docs/spec/SPEC-v2.md) | Normative wire and container definitions |
| [Risks](RISKS.md) | Active risks and mitigation |
| [Threat model](docs/threat-model.md) | Current boundaries and future security profile |
| [Prior art](docs/prior-art.md) | Attribution and positioning |

Original planning files remain under `docs/planning/original/`. They are archived drafts.
MIT licensed. The Python distribution name is provisional; this project is not published on PyPI.
