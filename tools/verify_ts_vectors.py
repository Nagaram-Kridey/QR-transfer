"""Verify independently produced TypeScript fixtures in Python."""

import json
import sys
from pathlib import Path

from lumenlink import Receiver, Transfer, prepare_container
from lumenlink.frame import pack_frame

path = (
    Path(sys.argv[1])
    if len(sys.argv) > 1
    else Path("artifacts/typescript-vectors.json")
)
fixtures = json.loads(path.read_text(encoding="utf-8"))
for case in fixtures["transfers"]:
    container = prepare_container(
        bytes.fromhex(case["data_hex"]),
        case["name"],
        case["mime"],
        created=case["created"],
    )
    assert container.hex() == case["container_hex"]
    transfer = Transfer(
        container, case["symbol_size"], bytes.fromhex(case["session_hex"])
    )
    receiver = Receiver()
    for frame in case["frames"]:
        assert pack_frame(transfer.frame(frame["seq"])).hex() == frame["hex"]
        assert transfer.text(frame["seq"]) == frame["text"]
        receiver.ingest(frame["text"])
    assert receiver.result is not None
    assert receiver.result.data.hex() == case["data_hex"]
print(f"Python verified {len(fixtures['transfers'])} independent TypeScript transfers")
