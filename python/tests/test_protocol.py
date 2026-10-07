import hashlib
import json
from dataclasses import replace
from pathlib import Path

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from lumenlink import ProtocolError, Receiver, Transfer, base45, prepare_container
from lumenlink.constants import MAX_CONTAINER_BYTES, MAX_FILE_BYTES, MAX_SYMBOLS
from lumenlink.container import ReceivedFile, open_container, sanitize_filename
from lumenlink.frame import decode_frame, pack_frame, unpack_frame
from lumenlink.repeat import choose_symbol_size

VECTORS = json.loads((Path(__file__).parents[2] / "vectors/repeat-v2.json").read_text("utf-8"))


@pytest.mark.parametrize("case", VECTORS["base45"])
def test_rfc9285(case):
    assert base45.encode(bytes.fromhex(case["hex"])) == case["text"]
    assert base45.decode(case["text"]).hex() == case["hex"]


@given(st.binary(max_size=1500))
def test_base45_roundtrip(data):
    assert base45.decode(base45.encode(data)) == data


@pytest.mark.parametrize("text", ["A", "aa", ":::", "ZZ", "\n0"])
def test_invalid_base45(text):
    with pytest.raises(ProtocolError):
        base45.decode(text)


@pytest.mark.parametrize("case", VECTORS["transfers"], ids=lambda case: case["id"])
def test_vectors(case):
    container = prepare_container(
        bytes.fromhex(case["data_hex"]), case["name"], case["mime"], created=case["created"]
    )
    assert container.hex() == case["container_hex"]
    transfer = Transfer(container, case["symbol_size"], bytes.fromhex(case["session_hex"]))
    receiver = Receiver()
    for vector in reversed(case["frames"]):
        assert transfer.text(vector["seq"]) == vector["text"]
        assert pack_frame(transfer.frame(vector["seq"])).hex() == vector["hex"]
        assert decode_frame(vector["text"]) == transfer.frame(vector["seq"])
        receiver.ingest(vector["text"])
    assert receiver.result.data.hex() == case["data_hex"]
    assert receiver.recovered == transfer.k
    assert len(receiver.symbols) == 0


@pytest.mark.parametrize("case", VECTORS["invalid_frames"], ids=lambda case: case["id"])
def test_rejected_vectors(case):
    with pytest.raises(ProtocolError) as error:
        decode_frame(case["text"])
    assert error.value.code == case["error"]


@given(st.binary(max_size=6000), st.integers(min_value=32, max_value=1024))
@settings(max_examples=60)
def test_reorder_duplicate_loss_recovery(data, size):
    transfer = Transfer(prepare_container(data, "property.bin", created=0), size)
    receiver = Receiver()
    # An incomplete first cycle, duplicates, then a complete reverse-order cycle.
    sequence = list(range(0, transfer.k, 2)) * 2 + list(reversed(range(transfer.k)))
    for seq in sequence:
        receiver.ingest(transfer.text(seq))
    assert receiver.result.data == data


@given(st.binary(max_size=2000))
def test_parser_fuzz_is_controlled(raw):
    try:
        frame = unpack_frame(raw)
    except ProtocolError:
        return
    assert pack_frame(frame) == raw


@pytest.mark.parametrize(
    "changes,code",
    [
        ({"flags": 0x14}, "VERSION"),
        ({"flags": 0x2C}, "FLAGS"),
        ({"flags": 0x20}, "MODE"),
        ({"session_id": b"short"}, "SESSION"),
        ({"container_len": 0}, "LENGTH"),
        ({"container_len": MAX_CONTAINER_BYTES + 1}, "LENGTH"),
        ({"symbol_size": 0}, "SYMBOL_SIZE"),
        ({"symbol_size": 1025}, "SYMBOL_SIZE"),
        ({"symbol_size": 1, "container_len": MAX_SYMBOLS + 1}, "SYMBOL_COUNT"),
        ({"seq": -1}, "SEQUENCE"),
        ({"seq": 2**32}, "SEQUENCE"),
        ({"symbol": b""}, "LENGTH"),
    ],
)
def test_frame_bounds(changes, code):
    frame = Transfer(prepare_container(b"x" * 400, "file", created=0)).frame(0)
    with pytest.raises(ProtocolError) as error:
        pack_frame(replace(frame, **changes))
    assert error.value.code == code


def test_padding_and_transfer_bounds():
    transfer = Transfer(prepare_container(b"x", "file", created=0))
    frame = transfer.frame(transfer.k - 1)
    with pytest.raises(ProtocolError, match="padding"):
        pack_frame(replace(frame, symbol=frame.symbol[:-1] + b"\1"))
    for container, size in [(b"", 256), (b"x", 0), (b"x", 1025)]:
        with pytest.raises(ProtocolError):
            Transfer(container, size)


def test_sessions_conflicts_and_reset():
    container = prepare_container(b"x" * 1000, "file", created=0)
    a, b = Transfer(container), Transfer(container)
    receiver = Receiver()
    receiver.ingest(a.text(0))
    receiver.ingest(a.text(a.k))
    assert receiver.duplicates == 1
    with pytest.raises(ProtocolError) as error:
        receiver.ingest(b.text(0))
    assert error.value.code == "SESSION_MISMATCH"
    changed = bytearray(a.frame(0).symbol)
    changed[0] ^= 1
    from lumenlink.frame import encode_frame

    with pytest.raises(ProtocolError) as error:
        receiver.ingest(encode_frame(replace(a.frame(0), symbol=bytes(changed))))
    assert error.value.code == "SYMBOL_CONFLICT"
    assert len(receiver.symbols) == 1
    receiver.reset()
    assert receiver.state == "IDLE" and receiver.seen == 0
    receiver.ingest(b.text(0))


def test_final_hash_failure_is_terminal():
    raw = bytearray(prepare_container(b"x" * 1000, "file", created=0))
    raw[-1] ^= 1
    transfer = Transfer(bytes(raw))
    receiver = Receiver()
    with pytest.raises(ProtocolError, match="integrity"):
        for seq in range(transfer.k):
            receiver.ingest(transfer.text(seq))
    assert receiver.state == "FAILED" and len(receiver.symbols) == 0
    with pytest.raises(ProtocolError, match="Reset"):
        receiver.ingest(transfer.text(0))


def make_container(manifest, data=b"", *, serialized=None):
    raw = (serialized or json.dumps(manifest, ensure_ascii=False, separators=(",", ":"))).encode()
    return len(raw).to_bytes(2, "big") + raw + data


def valid_manifest():
    return dict(
        name="file.bin",
        mime="application/octet-stream",
        size=0,
        sha256=hashlib.sha256(b"").hexdigest(),
        created=0,
        v=1,
    )


@pytest.mark.parametrize(
    "changes",
    [
        {"name": 0},
        {"name": ""},
        {"mime": None},
        {"name": "\ud800"},
        {"size": True},
        {"size": -1},
        {"size": MAX_FILE_BYTES + 1},
        {"created": -1},
        {"created": 1.2},
        {"created": 2**53},
        {"v": True},
        {"v": 2},
        {"sha256": "bad"},
        {"extra": 1},
    ],
)
def test_manifest_rejections(changes):
    manifest = valid_manifest() | changes
    # ensure_ascii handles deliberately invalid Unicode for decoder tests.
    raw = json.dumps(manifest, separators=(",", ":")).encode()
    with pytest.raises(ProtocolError):
        open_container(len(raw).to_bytes(2, "big") + raw)


@pytest.mark.parametrize(
    "raw", [b"", b"\0\0", b"\0\5abc", b"\x10\x01", b"\0\1\xff", b"\0\1[", b"\0\2[]"]
)
def test_container_invalid(raw):
    with pytest.raises(ProtocolError):
        open_container(raw)


def test_container_canonical_duplicate_size_and_hash():
    manifest = valid_manifest()
    for raw in [
        make_container(manifest, serialized=json.dumps(manifest)),
        make_container(manifest, serialized=json.dumps(manifest)[:-1] + ',"v":1}'),
        make_container(manifest, data=b"extra"),
        make_container(manifest | {"sha256": "0" * 64}),
        b"x" * (MAX_FILE_BYTES + 4099),
    ]:
        with pytest.raises(ProtocolError):
            open_container(raw)
    with pytest.raises(ProtocolError):
        prepare_container(b"", "x" * 4096)
    with pytest.raises(ProtocolError):
        prepare_container(b"x" * (MAX_FILE_BYTES + 1), "file")
    assert open_container(prepare_container(b"", "file")).data == b""


@pytest.mark.parametrize(
    "name,expected",
    [
        ("../../secret.txt", "_.._secret.txt"),
        ("CON.txt", "_CON.txt"),
        ("..", "received.bin"),
        ("\x00x:stream", "_x_stream"),
        ("LPT1", "_LPT1"),
        ("name. ", "name"),
        ("e\u0301.txt", "é.txt"),
    ],
)
def test_filename_sanitizer(name, expected):
    assert sanitize_filename(name) == expected


def test_save_does_not_overwrite_or_follow_symlink(tmp_path):
    item = open_container(prepare_container(b"hello", "../CON.txt", created=0))
    first = item.save(tmp_path)
    second = item.save(tmp_path)
    assert first != second and first.parent == second.parent == tmp_path
    assert first.read_bytes() == second.read_bytes() == b"hello"
    for index in range(1000):
        (tmp_path / ("a" if index == 0 else f"a ({index})")).touch()
    with pytest.raises(ProtocolError, match="collisions"):
        ReceivedFile("a", "x", b"", "", 0).save(tmp_path)


def test_maximum_file_supported_only_at_suitable_density():
    raw = prepare_container(b"a" * MAX_FILE_BYTES, "max.bin", created=0)
    with pytest.raises(ProtocolError, match="at least"):
        Transfer(raw, 256)
    transfer = Transfer(raw, 1024)
    receiver = Receiver()
    for seq in range(transfer.k):
        receiver.ingest(transfer.text(seq))
    assert receiver.result.data == b"a" * MAX_FILE_BYTES


def test_expanded_symbol_policy_and_manifest_overhead():
    # The old 2048-symbol cap is expanded; the new cap includes container overhead.
    assert Transfer(b"x" * 2049, 1).k == 2049
    assert Transfer(b"x" * MAX_SYMBOLS, 1).k == MAX_SYMBOLS
    with pytest.raises(ProtocolError) as error:
        Transfer(b"x" * (MAX_SYMBOLS + 1), 1)
    assert error.value.code == "SYMBOL_COUNT"


def test_maximum_manifest_overhead_with_expanded_file_limit():
    data = b"x" * MAX_FILE_BYTES
    plain = prepare_container(data, "a", created=0)
    name_length = 1 + 4096 - int.from_bytes(plain[:2], "big")
    largest = prepare_container(data, "a" * name_length, created=0)
    assert int.from_bytes(largest[:2], "big") == 4096
    assert len(largest) == MAX_FILE_BYTES + 4098
    assert Transfer(largest, 1024).k <= MAX_SYMBOLS
    with pytest.raises(ProtocolError) as error:
        Transfer(largest, 640)
    assert error.value.code == "SYMBOL_COUNT"


@pytest.mark.parametrize(
    "length,preferred,expected",
    [
        (1, 256, 256),
        (8192 * 256, 256, 256),
        (8192 * 256 + 1, 256, 512),
        (8192 * 512 + 1, 256, 1024),
        (1, 512, 512),
        (1, 1024, 1024),
    ],
)
def test_adaptive_density_preserves_preference_and_checks_container_overhead(
    length, preferred, expected
):
    assert choose_symbol_size(length, preferred) == expected


@pytest.mark.parametrize(
    "length,preferred", [(0, 256), (-1, 256), (MAX_CONTAINER_BYTES + 1, 256), (1, 0), (1, 640)]
)
def test_adaptive_density_rejects_invalid_input(length, preferred):
    with pytest.raises(ProtocolError):
        choose_symbol_size(length, preferred)


@pytest.mark.parametrize("length,size", [(MAX_CONTAINER_BYTES + 1, 1024), (8193, 1), (1, 1025)])
def test_hostile_metadata_does_not_allocate_or_lock_session(length, size):
    # Construct a checksum-valid hostile frame without going through the validated encoder.
    body = bytes([0x24]) + bytes(16) + length.to_bytes(4, "big")
    body += size.to_bytes(2, "big") + bytes(4) + bytes(size)
    text = base45.encode(body + hashlib.sha256(body).digest()[:8])
    receiver = Receiver()
    with pytest.raises(ProtocolError):
        receiver.ingest(text)
    assert receiver.state == "IDLE"
    assert receiver.symbols == {}
    assert receiver.recovered == 0
