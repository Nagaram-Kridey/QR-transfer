"""Generate/verify bounded >1 MiB cross-language fixtures; never physical evidence."""

import argparse
import hashlib
import json
from pathlib import Path

from lumenlink import Receiver, Transfer, prepare_container


def payload() -> bytes:
    return bytes(range(251)) * 8355 + bytes(range(64))  # 2,097,169 bytes


def run(mode: str) -> None:
    data = payload()
    directory = Path("artifacts/large-capacity")
    directory.mkdir(parents=True, exist_ok=True)
    if mode == "emit-python":
        case = {
            "producer": "python",
            "name": "large-python-\u2603.bin",
            "mime": "application/octet-stream",
            "created": 1700100000,
            "session_hex": bytes(range(16)).hex(),
            "symbol_size": 1024,
        }
        container = prepare_container(
            data, case["name"], case["mime"], created=case["created"]
        )
        transfer = Transfer(
            container, case["symbol_size"], bytes.fromhex(case["session_hex"])
        )
        case["container_sha256"] = hashlib.sha256(container).hexdigest()
        case["payload_sha256"] = hashlib.sha256(data).hexdigest()
        case["frames"] = [transfer.text(seq) for seq in reversed(range(transfer.k))]
        (directory / "python.json").write_text(
            json.dumps(case, ensure_ascii=False), encoding="utf-8"
        )
        print(
            f"Emitted {len(data)}-byte Python transfer with {transfer.k} symbols; synthetic only"
        )
    else:
        case = json.loads((directory / "typescript.json").read_text(encoding="utf-8"))
        container = prepare_container(
            data, case["name"], case["mime"], created=case["created"]
        )
        assert hashlib.sha256(container).hexdigest() == case["container_sha256"]
        transfer = Transfer(
            container, case["symbol_size"], bytes.fromhex(case["session_hex"])
        )
        assert transfer.k > 2048
        receiver = Receiver()
        for seq, text in zip(reversed(range(transfer.k)), case["frames"], strict=True):
            assert text == transfer.text(seq)
            receiver.ingest(text)
        assert receiver.result is not None and receiver.result.data == data
        print(
            f"Python verified independent TypeScript {len(data)}-byte transfer; synthetic only"
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["emit-python", "verify-typescript"])
    run(parser.parse_args().mode)
