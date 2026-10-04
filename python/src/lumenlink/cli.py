"""CLI for plaintext transfer, offline frame inspection and channel simulation."""

import argparse
import json
import mimetypes
import sys
from pathlib import Path
from typing import Any

from .constants import MAX_FILE_BYTES
from .container import prepare_container
from .errors import ProtocolError
from .repeat import Receiver, Transfer
from .sim import simulate


def _read_payload(path: Path) -> bytes:
    with path.open("rb") as source:
        data = source.read(MAX_FILE_BYTES + 1)
    if len(data) > MAX_FILE_BYTES:
        raise ProtocolError("FILE_SIZE", "Input exceeds the 1 MiB file limit")
    return data


def _write_json(path: Path, value: Any) -> None:
    # Never overwrite exports accidentally either.
    with path.open("x", encoding="utf-8", newline="\n") as output:
        json.dump(value, output, ensure_ascii=False, indent=2)
        output.write("\n")


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="LumenLink experimental PLAINTEXT QR transfer")
    commands = root.add_subparsers(dest="command", required=True)
    send = commands.add_parser("send", help="Display a local file as animated QR codes")
    send.add_argument("file", type=Path)
    send.add_argument("--symbol-size", type=int, choices=[256, 512, 1024], default=256)
    send.add_argument("--fps", type=float, default=8)
    send.add_argument("--pixels", type=int, default=720)
    send.add_argument("--ecc", choices=["L", "M", "Q", "H"], default="M")
    send.add_argument(
        "--export", type=Path, help="Export one repeat cycle as JSON instead of flashing"
    )
    send.add_argument("--acknowledge-flashing", action="store_true")
    receive = commands.add_parser("receive", help="Receive locally through a webcam")
    receive.add_argument("--camera", type=int, default=0)
    receive.add_argument("--out", type=Path, default=Path("received"))
    receive.add_argument("--timeout", type=float, default=120)
    receive.add_argument(
        "--frames", type=Path, help="Decode a JSON frame export instead of a camera"
    )
    receive.add_argument("--report", type=Path, help="Write a local observation report")
    simulation = commands.add_parser("simulate", help="Run a seeded model, not a camera benchmark")
    simulation.add_argument("--bytes", type=int, default=10_240)
    simulation.add_argument("--seed", type=int, default=0)
    simulation.add_argument("--loss", type=float, default=0.3)
    simulation.add_argument("--duplicates", type=float, default=0.1)
    simulation.add_argument("--reorder-window", type=int, default=4)
    simulation.add_argument("--burst-every", type=int, default=0)
    simulation.add_argument("--burst-length", type=int, default=0)
    simulation.add_argument("--max-cycles", type=int, default=20)
    simulation.add_argument("--symbol-size", type=int, choices=[256, 512, 1024], default=256)
    return root


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    try:
        if args.command == "send":
            data = _read_payload(args.file)
            transfer = Transfer(
                prepare_container(
                    data,
                    args.file.name,
                    mimetypes.guess_type(args.file.name)[0] or "application/octet-stream",
                ),
                args.symbol_size,
            )
            print(
                "PLAINTEXT demo: anyone who sees these QR codes can read the file.", file=sys.stderr
            )
            if args.export:
                _write_json(
                    args.export,
                    {
                        "format": "lumenlink-frames-v2",
                        "frames": [transfer.text(seq) for seq in range(transfer.k)],
                    },
                )
            else:
                if not args.acknowledge_flashing:
                    raise ValueError(
                        "Animated QR codes flash. Read the safety guidance; add "
                        "--acknowledge-flashing to display, or use --export. "
                        "Use --fps 2 to slow down."
                    )
                from .qr_io import display

                display(transfer, fps=args.fps, pixels=args.pixels, ecc=args.ecc)
        elif args.command == "receive":
            if args.frames:
                # Bounded JSON intake even though optical frames are separately bounded.
                with args.frames.open("rb") as source:
                    raw = source.read(4_000_001)
                if len(raw) > 4_000_000:
                    raise ValueError("Frame export exceeds 4 MB")
                exported = json.loads(raw)
                if (
                    not isinstance(exported, dict)
                    or exported.get("format") != "lumenlink-frames-v2"
                ):
                    raise ValueError("Invalid frame export format")
                frames = exported.get("frames")
                if not isinstance(frames, list) or len(frames) > 2048:
                    raise ValueError("Invalid frame list")
                receiver = Receiver()
                result = None
                for text in frames:
                    if not isinstance(text, str):
                        raise ValueError("Frame must be text")
                    result = receiver.ingest(text)
                    if result is not None:
                        break
                if result is None:
                    raise ValueError("Frame export is incomplete")
                report = {"kind": "frame_import", "payload_bytes": len(result.data)}
            else:
                from .qr_io import capture

                print("Align the QR in the camera window, then press Space to begin timing.")
                result, report = capture(args.camera, timeout=args.timeout)
            if args.report:
                _write_json(args.report, report)
            if result is None:
                print(f"Receive {report['outcome']}: {report.get('reason', '')}", file=sys.stderr)
                return 2
            output = result.save(args.out)
            print(f"Verified SHA-256 {result.sha256}\nSaved {output}")
        else:
            if not 0 <= args.bytes <= MAX_FILE_BYTES:
                raise ValueError("Payload size must be between 0 and 1 MiB")
            data = bytes(index % 251 for index in range(args.bytes))
            result_sim = simulate(
                data,
                seed=args.seed,
                loss=args.loss,
                duplicates=args.duplicates,
                reorder_window=args.reorder_window,
                burst_every=args.burst_every,
                burst_length=args.burst_length,
                max_cycles=args.max_cycles,
                symbol_size=args.symbol_size,
            )
            print(json.dumps(result_sim.to_dict(), indent=2))
        return 0
    except (ValueError, OSError, TimeoutError) as exc:
        print(f"lumenlink: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("Cancelled", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
