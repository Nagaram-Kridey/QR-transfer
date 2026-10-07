"""CLI for plaintext transfer, offline frame inspection and channel simulation."""

import argparse
import json
import mimetypes
import sys
from pathlib import Path
from typing import Any

from .constants import MAX_FILE_BYTES, MAX_FRAME_EXPORT_BYTES, MAX_QR_CHARS, MAX_SYMBOLS
from .container import prepare_container
from .errors import ProtocolError
from .frame import decode_frame
from .repeat import Receiver, Transfer, choose_symbol_size
from .sim import simulate


def _read_payload(path: Path) -> bytes:
    with path.open("rb") as source:
        data = source.read(MAX_FILE_BYTES + 1)
    if len(data) > MAX_FILE_BYTES:
        raise ProtocolError("FILE_SIZE", "Input exceeds the 5 MiB file limit")
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
    send.add_argument(
        "--symbol-size",
        type=int,
        choices=[256, 512, 1024],
        help="Use an explicit density; default automatically selects 256, 512 or 1024 bytes",
    )
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
    simulation.add_argument("--symbol-size", type=int, choices=[256, 512, 1024])
    benchmark = commands.add_parser(
        "benchmark", help="Record local operator-supplied trials; never automatically certify G2"
    )
    evidence = benchmark.add_subparsers(dest="benchmark_command", required=True)
    record = evidence.add_parser(
        "record", help="Normalize a camera report and explicit cell metadata"
    )
    record.add_argument(
        "--observation", type=Path, required=True, help="Original Python/browser camera report JSON"
    )
    record.add_argument(
        "--metadata",
        type=Path,
        required=True,
        help="Exact frozen cell metadata JSON, including run_id and configured timeout",
    )
    record.add_argument(
        "--csv", type=Path, required=True, help="Create/append a validated extended trial CSV"
    )
    record.add_argument(
        "--trial-id", required=True, help="Globally unique trial ID within this CSV"
    )
    record.add_argument(
        "--phase",
        choices=["exploratory", "acceptance"],
        default="exploratory",
        help="Default exploratory; acceptance explicitly declares a frozen, timed trial",
    )
    record.add_argument(
        "--attest-physical",
        action="store_true",
        help="I witnessed this real-camera observation; this statement is not verified by the tool",
    )
    summary = evidence.add_parser("summarize", help="Summarize each frozen run without pooling")
    summary.add_argument(
        "csv", type=Path, help="Extended trial CSV; outputs candidate metrics for manual review"
    )
    return root


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    try:
        if args.command == "send":
            data = _read_payload(args.file)
            container = prepare_container(
                data,
                args.file.name,
                mimetypes.guess_type(args.file.name)[0] or "application/octet-stream",
            )
            size = (
                args.symbol_size
                if args.symbol_size is not None
                else choose_symbol_size(len(container))
            )
            transfer = Transfer(container, size)
            if args.symbol_size is None and size != 256:
                print(
                    f"Selected {size}-byte symbols to fit the file; "
                    "denser QR codes need camera testing.",
                    file=sys.stderr,
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
                    raw = source.read(MAX_FRAME_EXPORT_BYTES + 1)
                if len(raw) > MAX_FRAME_EXPORT_BYTES:
                    raise ValueError("Frame export exceeds 16 MB")
                try:
                    exported = json.loads(raw)
                except RecursionError as exc:
                    raise ValueError("Frame export JSON nesting exceeds parser limits") from exc
                if (
                    not isinstance(exported, dict)
                    or exported.get("format") != "lumenlink-frames-v2"
                ):
                    raise ValueError("Invalid frame export format")
                frames = exported.get("frames")
                if not isinstance(frames, list) or len(frames) > MAX_SYMBOLS:
                    raise ValueError("Invalid frame list")
                if any(not isinstance(text, str) or len(text) > MAX_QR_CHARS for text in frames):
                    raise ValueError("Frame must be bounded text")
                metadata = None
                checked_symbols: dict[int, bytes] = {}
                for text in frames:
                    frame = decode_frame(text)
                    if metadata is not None and frame.metadata != metadata:
                        raise ValueError("Frame export contains different sessions")
                    metadata = frame.metadata
                    index = frame.seq % frame.k
                    previous = checked_symbols.get(index)
                    if previous is not None and previous != frame.symbol:
                        raise ValueError("Frame export contains conflicting symbols")
                    checked_symbols[index] = frame.symbol
                checked_symbols.clear()
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
        elif args.command == "benchmark":
            from .benchmark import EVIDENCE, read_trials, record_observation, summarize_trials

            if args.benchmark_command == "record":
                row = record_observation(
                    args.observation,
                    args.metadata,
                    args.csv,
                    trial_id=args.trial_id,
                    phase=args.phase,
                    attest_physical=args.attest_physical,
                )
                print(
                    json.dumps(
                        {
                            "format": "lumenlink-benchmark-record-v1",
                            "evidence": EVIDENCE,
                            "record": row,
                        },
                        indent=2,
                        allow_nan=False,
                    )
                )
            else:
                print(
                    json.dumps(summarize_trials(read_trials(args.csv)), indent=2, allow_nan=False)
                )
        else:
            if not 0 <= args.bytes <= MAX_FILE_BYTES:
                raise ValueError("Payload size must be between 0 and 5 MiB")
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
