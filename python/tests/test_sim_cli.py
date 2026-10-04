import json

import pytest

from lumenlink.cli import main
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
