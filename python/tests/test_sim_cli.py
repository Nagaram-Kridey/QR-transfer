import json
from dataclasses import replace

import pytest

from lumenlink import Transfer, cli, prepare_container
from lumenlink.cli import main
from lumenlink.constants import MAX_FILE_BYTES, MAX_FRAME_EXPORT_BYTES, MAX_SYMBOLS
from lumenlink.frame import decode_frame, encode_frame
from lumenlink.sim import simulate


def test_simulation_seed_loss_budget_and_bursts():
    args = dict(seed=42, loss=0.3, burst_every=20, burst_length=3, duplicates=0.5)
    first = simulate(bytes(range(256)) * 10, **args)
    assert first.complete and first == simulate(bytes(range(256)) * 10, **args)
    assert first.kind == "simulation"
    failed = simulate(b"abc", loss=1, max_cycles=2)
    assert not failed.complete and failed.displayed == failed.symbols * 2


@pytest.mark.parametrize(
    "kwargs",
    [
        {"loss": -1},
        {"duplicates": 2},
        {"reorder_window": 0},
        {"max_cycles": 0},
        {"burst_every": 2, "burst_length": 3},
    ],
)
def test_simulation_invalid_settings(kwargs):
    with pytest.raises(ValueError):
        simulate(b"", **kwargs)


def test_cli_export_receive_and_no_overwrite(tmp_path, capsys):
    source = tmp_path / "example.txt"
    source.write_bytes(b"a CLI transfer\n")
    export = tmp_path / "frames.json"
    output = tmp_path / "received"
    assert main(["send", str(source), "--export", str(export)]) == 0
    assert main(["send", str(source), "--export", str(export)]) == 2
    assert main(["receive", "--frames", str(export), "--out", str(output)]) == 0
    assert (output / source.name).read_bytes() == source.read_bytes()
    assert main(["send", str(source)]) == 2
    capsys.readouterr()
    assert main(["simulate", "--bytes", "1024", "--seed", "13"]) == 0
    assert json.loads(capsys.readouterr().out)["kind"] == "simulation"


def test_cli_adapts_density_for_expanded_maximum_and_preserves_explicit_choice(tmp_path, capsys):
    source = tmp_path / "maximum.bin"
    source.write_bytes(b"a" * MAX_FILE_BYTES)
    export = tmp_path / "frames.json"
    assert main(["send", str(source), "--export", str(export)]) == 0
    frames = json.loads(export.read_text())["frames"]
    assert 2048 < len(frames) <= MAX_SYMBOLS
    assert decode_frame(frames[0]).symbol_size == 1024
    output = tmp_path / "received"
    assert main(["receive", "--frames", str(export), "--out", str(output)]) == 0
    assert (output / source.name).read_bytes() == source.read_bytes()
    invalid = tmp_path / "invalid.json"
    assert main(["send", str(source), "--symbol-size", "256", "--export", str(invalid)]) == 2
    assert not invalid.exists()
    assert "Traceback" not in capsys.readouterr().err


@pytest.mark.parametrize("tail", [None, "A" * 1590, "INVALID", 123])
def test_cli_rejects_invalid_tail_even_after_valid_complete_file(tmp_path, tail):
    transfer = Transfer(prepare_container(b"hello", "file", created=0))
    export = tmp_path / "frames.json"
    export.write_text(
        json.dumps({"format": "lumenlink-frames-v2", "frames": [transfer.text(0), tail]})
    )
    output = tmp_path / "received"
    assert main(["receive", "--frames", str(export), "--out", str(output)]) == 2
    assert not output.exists()


def test_cli_rejects_export_byte_count_before_json_parse(tmp_path, monkeypatch):
    export = tmp_path / "too-large.json"
    export.write_bytes(b" " * (MAX_FRAME_EXPORT_BYTES + 1))
    monkeypatch.setattr(cli.json, "loads", lambda _: pytest.fail("Oversized export was parsed"))
    assert main(["receive", "--frames", str(export), "--out", str(tmp_path / "received")]) == 2


def test_cli_rejects_export_count_before_receiver_admission(tmp_path, monkeypatch):
    export = tmp_path / "too-many.json"
    export.write_text(
        json.dumps({"format": "lumenlink-frames-v2", "frames": ["0"] * (MAX_SYMBOLS + 1)})
    )
    monkeypatch.setattr(cli, "Receiver", lambda: pytest.fail("Oversized list allocated a receiver"))
    assert main(["receive", "--frames", str(export), "--out", str(tmp_path / "received")]) == 2


def test_cli_rejects_checksum_valid_conflicting_symbol_after_complete_cycle(tmp_path):
    transfer = Transfer(prepare_container(b"hello", "file", created=0))
    first = transfer.frame(0)
    changed = bytes([first.symbol[0] ^ 1]) + first.symbol[1:]
    conflict = encode_frame(replace(first, seq=transfer.k, symbol=changed))
    export = tmp_path / "conflict.json"
    export.write_text(
        json.dumps({"format": "lumenlink-frames-v2", "frames": [transfer.text(0), conflict]})
    )
    output = tmp_path / "received"
    assert main(["receive", "--frames", str(export), "--out", str(output)]) == 2
    assert not output.exists()


def test_cli_rejects_valid_other_session_after_complete_cycle(tmp_path):
    container = prepare_container(b"hello", "file", created=0)
    first = Transfer(container, session_id=b"1" * 16)
    other = Transfer(container, session_id=b"2" * 16)
    export = tmp_path / "session.json"
    export.write_text(
        json.dumps({"format": "lumenlink-frames-v2", "frames": [first.text(0), other.text(0)]})
    )
    output = tmp_path / "received"
    assert main(["receive", "--frames", str(export), "--out", str(output)]) == 2
    assert not output.exists()


def test_cli_rejects_deeply_nested_bounded_json_without_traceback_or_save(tmp_path, capsys):
    export = tmp_path / "nested.json"
    export.write_text("[" * 2000 + "0" + "]" * 2000)
    output = tmp_path / "received"
    assert main(["receive", "--frames", str(export), "--out", str(output)]) == 2
    assert not output.exists()
    assert "Traceback" not in capsys.readouterr().err
