"""Reproducible Python-owned fixtures; --check never rewrites committed vectors."""

import argparse
import hashlib
import json
from pathlib import Path

from lumenlink import Transfer, prepare_container
from lumenlink import base45
from lumenlink.frame import pack_frame

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "vectors" / "repeat-v2.json"


def generate() -> dict:
    examples = [
        ("empty", b"", "empty.bin", 64),
        ("text", b"LumenLink: light carries bytes.\n", "notes.txt", 64),
        ("unicode", "Hello, ప్రపంచం 👋\n".encode(), "నమస్కారం-🌍.txt", 256),
        ("binary", bytes(range(256)) * 3, "binary.dat", 256),
        ("path", b"Never trust a filename", "../../CON.txt", 128),
    ]
    transfers = []
    for index, (case, data, name, size) in enumerate(examples):
        session = bytes((index + n) % 256 for n in range(16))
        created = 1_700_000_000 + index
        container = prepare_container(data, name, created=created)
        transfer = Transfer(container, size, session)
        sequences = list(range(transfer.k + 2)) + [0x80000000, 0xFFFFFFFF]
        transfers.append(
            {
                "id": case,
                "producer": "python",
                "data_hex": data.hex(),
                "name": name,
                "mime": "application/octet-stream",
                "created": created,
                "session_hex": session.hex(),
                "symbol_size": size,
                "container_hex": container.hex(),
                "frames": [
                    {
                        "seq": seq,
                        "hex": pack_frame(transfer.frame(seq)).hex(),
                        "text": transfer.text(seq),
                    }
                    for seq in sequences
                ],
            }
        )
    reference = bytes.fromhex(transfers[3]["frames"][0]["hex"])
    invalid = []
    for case, offset, value, error in [
        ("old-version", 0, 0x14, "VERSION"),
        ("reserved-bit", 0, 0x2C, "FLAGS"),
        ("encrypted-unsupported", 0, 0x25, "MODE"),
        ("compression-unsupported", 0, 0x26, "MODE"),
    ]:
        modified = bytearray(reference)
        modified[offset] = value
        modified[-8:] = hashlib.sha256(modified[:-8]).digest()[:8]
        invalid.append({"id": case, "text": base45.encode(modified), "error": error})
    invalid.extend(
        [
            {
                "id": "checksum",
                "text": base45.encode(reference[:-1] + bytes([reference[-1] ^ 1])),
                "error": "CHECKSUM",
            },
            {
                "id": "truncated",
                "text": base45.encode(reference[:-1]),
                "error": "LENGTH",
            },
            {
                "id": "trailing-byte",
                "text": base45.encode(reference + b"\0"),
                "error": "LENGTH",
            },
            {"id": "base45-overflow", "text": ":::", "error": "BASE45"},
            {"id": "base45-length", "text": "0", "error": "BASE45"},
            {"id": "base45-invalid", "text": "aa", "error": "BASE45"},
            {"id": "oversized", "text": "0" * 1590, "error": "LENGTH"},
        ]
    )
    return {
        "format": "lumenlink-conformance-v2",
        "wire_version": 2,
        "base45": [
            {"hex": data.hex(), "text": text}
            for data, text in [
                (b"AB", "BB8"),
                (b"Hello!!", "%69 VD92EX0"),
                (b"base-45", "UJCLQE7W581"),
                (b"$", " 0"),
                (b"", ""),
            ]
        ],
        "transfers": transfers,
        "invalid_frames": invalid,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encoded = json.dumps(generate(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if TARGET.read_text(encoding="utf-8") != encoded:
            raise SystemExit("Conformance fixtures are stale")
        print("Python fixtures match the checked-in wire contract")
    else:
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        TARGET.write_text(encoded, encoding="utf-8", newline="\n")
