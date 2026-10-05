"""Adversarial evidence-helper checks; all fixtures here are synthetic software inputs."""

import copy
import csv
import json
import math
from statistics import median

import pytest

from lumenlink import benchmark
from lumenlink.cli import main

CSV_FIELDS = (
    "trial_id,commit,source,sender_device,receiver_device,sender_os,receiver_os,"
    "sender_app,receiver_app,direction,payload_bytes,payload_sha256,symbol_size,fps,"
    "ecc,distance_cm,lighting,outcome,elapsed_seconds,frames_seen,duplicates,rejected,"
    "error,run_id,phase,physical_attested,timeout_seconds"
).split(",")
SHA256 = "ab" * 32


@pytest.fixture
def metadata():
    return {
        "commit": "12" * 20,
        "source": "physical",
        "sender_device": "Test Windows computer",
        "receiver_device": "Test Android phone",
        "sender_os": "Test Windows version",
        "receiver_os": "Test Android version",
        "sender_app": "Test Python application version",
        "receiver_app": "Test browser version",
        "direction": "windows-to-android",
        "payload_bytes": 10_240,
        "payload_sha256": SHA256,
        "symbol_size": 256,
        "fps": 8,
        "ecc": "M",
        "distance_cm": 25,
        "lighting": "Steady indoor lighting",
        "run_id": "run-001",
        "timeout_seconds": 60,
    }


@pytest.fixture
def browser_observation():
    return {
        "format": "lumenlink-camera-observation-v1",
        "outcome": "success",
        "reason": "",
        "elapsed_seconds": 12.5,
        "expected_payload_kib": 10,
        "payload_bytes": 10_240,
        "payload_sha256": SHA256,
        "stats": {
            "state": "DONE",
            "recovered": 41,
            "total": 41,
            "seen": 42,
            "duplicates": 1,
            "rejected": 0,
            "session": "ab" * 16,
        },
        "browser": "Synthetic test browser, not physical evidence",
        "recorded_at": "2026-10-05T06:00:00.000Z",
        "note": "Test fixture only",
    }


@pytest.fixture
def python_observation():
    return {
        "kind": "camera_observation",
        "outcome": "success",
        "reason": "",
        "elapsed_seconds": 12.5,
        "frames_seen": 42,
        "rejected": 0,
        "duplicates": 1,
        "payload_bytes": 10_240,
        "payload_sha256": SHA256,
        "session_id": "ab" * 16,
        "cleanup_errors": [],
    }


def normalize(observation, metadata, *, trial_id="trial-001", phase="acceptance", attest=True):
    return benchmark.normalize_observation(
        observation, metadata, trial_id=trial_id, phase=phase, attest_physical=attest
    )


def write_csv(path, rows, *, fields=CSV_FIELDS):
    with path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def write_json(path, value):
    path.write_text(json.dumps(value), encoding="utf-8")


def make_rows(observation, metadata, *, successes=18, count=20, duration=10):
    rows = []
    for index in range(count):
        item = copy.deepcopy(observation)
        item["payload_bytes"] = metadata["payload_bytes"]
        item["payload_sha256"] = metadata["payload_sha256"]
        if "stats" in item:
            item["expected_payload_kib"] = metadata["payload_bytes"] / 1024
            total = math.ceil((metadata["payload_bytes"] + 180) / metadata["symbol_size"])
            item["stats"].update(total=total, recovered=total, seen=total + 1)
        if index < successes:
            item["elapsed_seconds"] = duration
        else:
            item.update(
                outcome="timeout",
                reason="No complete transfer",
                elapsed_seconds=metadata["timeout_seconds"],
                payload_bytes=None,
                payload_sha256=None,
            )
            if "stats" in item:
                item["stats"].update(state="RECEIVING", recovered=total - 1)
        rows.append(normalize(item, metadata, trial_id=f"trial-{index:03d}"))
    return rows


@pytest.mark.parametrize("profile", ["browser", "python"])
def test_normalizes_both_real_report_shapes_without_certifying_provenance(
    profile, metadata, browser_observation, python_observation
):
    observation = browser_observation if profile == "browser" else python_observation
    row = normalize(observation, metadata)
    assert list(row) == CSV_FIELDS
    assert row["source"] == "physical" and row["physical_attested"] == "true"
    assert row["outcome"] == "success" and int(row["payload_bytes"]) == 10_240
    assert row["payload_sha256"] == SHA256 and float(row["elapsed_seconds"]) == 12.5
    assert int(row["frames_seen"]) == 42 and int(row["duplicates"]) == 1
    summary = benchmark.summarize_trials([row])
    assert summary["format"] == "lumenlink-benchmark-summary-v1"
    assert summary["gate_decision"] == "manual_review_required"
    assert "not verified" in summary["evidence"]


@pytest.mark.parametrize(
    "field",
    [
        "commit",
        "source",
        "sender_device",
        "receiver_device",
        "sender_os",
        "receiver_os",
        "sender_app",
        "receiver_app",
        "direction",
        "payload_bytes",
        "payload_sha256",
        "symbol_size",
        "fps",
        "ecc",
        "distance_cm",
        "lighting",
        "run_id",
        "timeout_seconds",
    ],
)
def test_missing_metadata_is_rejected(field, metadata, browser_observation):
    del metadata[field]
    with pytest.raises(ValueError):
        normalize(browser_observation, metadata)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("payload_bytes", True),
        ("payload_bytes", -1),
        ("payload_bytes", 1_048_577),
        ("payload_bytes", 10_240.5),
        ("payload_sha256", "abc"),
        ("payload_sha256", "zz" * 32),
        ("symbol_size", True),
        ("symbol_size", 0),
        ("symbol_size", 1025),
        ("fps", True),
        ("fps", 0),
        ("fps", 11),
        ("fps", math.nan),
        ("fps", math.inf),
        ("distance_cm", False),
        ("distance_cm", -1),
        ("distance_cm", math.inf),
        ("timeout_seconds", True),
        ("timeout_seconds", math.nan),
        ("timeout_seconds", 61),
        ("ecc", "invalid"),
        ("source", "unknown"),
        ("commit", "not-a-commit"),
        ("sender_device", ""),
        ("lighting", ""),
        ("run_id", ""),
    ],
)
def test_metadata_numeric_and_identity_boundaries_rejected(
    field, value, metadata, browser_observation
):
    metadata[field] = value
    with pytest.raises(ValueError):
        normalize(browser_observation, metadata)


def test_metadata_extra_fields_and_missing_physical_attestation_rejected(
    metadata, browser_observation
):
    with pytest.raises(ValueError):
        normalize(browser_observation, metadata, attest=False)
    metadata["made_up"] = "not part of frozen cell"
    with pytest.raises(ValueError):
        normalize(browser_observation, metadata)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("elapsed_seconds", 0),
        ("elapsed_seconds", -1),
        ("elapsed_seconds", True),
        ("elapsed_seconds", math.nan),
        ("elapsed_seconds", math.inf),
        ("elapsed_seconds", 60),
        ("elapsed_seconds", 60.1),
        ("payload_bytes", True),
        ("payload_bytes", 100),
        ("payload_sha256", "cd" * 32),
        ("payload_sha256", None),
        ("expected_payload_kib", True),
        ("expected_payload_kib", 100),
        ("outcome", "complete"),
    ],
)
def test_success_observation_contradictions_rejected(field, value, metadata, browser_observation):
    browser_observation[field] = value
    with pytest.raises(ValueError):
        normalize(browser_observation, metadata)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("seen", True),
        ("seen", -1),
        ("seen", 1.5),
        ("duplicates", math.nan),
        ("rejected", math.inf),
        ("recovered", 40),
        ("total", 0),
        ("state", "RECEIVING"),
    ],
)
def test_browser_success_requires_complete_and_valid_counters(
    field, value, metadata, browser_observation
):
    browser_observation["stats"][field] = value
    with pytest.raises(ValueError):
        normalize(browser_observation, metadata)


@pytest.mark.parametrize("kind", ["frame_import", "simulation", "unknown"])
def test_non_camera_profiles_cannot_be_attested_into_physical_evidence(
    kind, metadata, python_observation
):
    python_observation["kind"] = kind
    with pytest.raises(ValueError):
        normalize(python_observation, metadata)


def test_ambiguous_observation_profile_rejected(metadata, browser_observation):
    browser_observation["kind"] = "camera_observation"
    with pytest.raises(ValueError):
        normalize(browser_observation, metadata)


@pytest.mark.parametrize("outcome", ["failed", "cancelled", "timeout"])
def test_failures_retain_declared_fixture_and_timed_outcome(outcome, metadata, python_observation):
    python_observation.update(
        outcome=outcome,
        reason="Trial did not complete",
        elapsed_seconds=60,
        payload_bytes=None,
        payload_sha256=None,
    )
    row = normalize(python_observation, metadata)
    assert row["outcome"] == outcome and row["error"] == "Trial did not complete"
    assert int(row["payload_bytes"]) == metadata["payload_bytes"]
    assert row["payload_sha256"] == metadata["payload_sha256"]


def test_setup_cancellation_is_exploratory_and_never_an_acceptance_trial(
    metadata, python_observation
):
    python_observation.update(
        outcome="cancelled",
        reason="Setup abandoned",
        elapsed_seconds=None,
        payload_bytes=None,
        payload_sha256=None,
    )
    with pytest.raises(ValueError):
        normalize(python_observation, metadata)
    row = normalize(python_observation, metadata, phase="exploratory")
    assert row["elapsed_seconds"] == ""
    summary = benchmark.summarize_trials([row])
    assert summary["gate_decision"] == "manual_review_required"


def test_failure_size_selection_and_timeout_contradictions_rejected(metadata, browser_observation):
    browser_observation.update(
        outcome="timeout",
        reason="Timeout",
        elapsed_seconds=60,
        payload_bytes=None,
        payload_sha256=None,
    )
    browser_observation["expected_payload_kib"] = 100
    with pytest.raises(ValueError):
        normalize(browser_observation, metadata)
    browser_observation["expected_payload_kib"] = 10
    browser_observation["elapsed_seconds"] = 59.9
    with pytest.raises(ValueError):
        normalize(browser_observation, metadata)


def test_csv_record_append_and_rejected_duplicate_are_not_destructive(
    tmp_path, metadata, python_observation
):
    observation_path, metadata_path, csv_path = (
        tmp_path / "observation.json",
        tmp_path / "metadata.json",
        tmp_path / "trials.csv",
    )
    write_json(observation_path, python_observation)
    write_json(metadata_path, metadata)
    first = benchmark.record_observation(
        observation_path,
        metadata_path,
        csv_path,
        trial_id="001",
        phase="acceptance",
        attest_physical=True,
    )
    assert benchmark.read_trials(csv_path) == [first]
    before = csv_path.read_bytes()
    with pytest.raises(ValueError):
        benchmark.record_observation(
            observation_path,
            metadata_path,
            csv_path,
            trial_id="001",
            phase="acceptance",
            attest_physical=True,
        )
    assert csv_path.read_bytes() == before
    metadata["fps"] = 4
    write_json(metadata_path, metadata)
    with pytest.raises(ValueError):
        benchmark.record_observation(
            observation_path,
            metadata_path,
            csv_path,
            trial_id="002",
            phase="acceptance",
            attest_physical=True,
        )
    assert csv_path.read_bytes() == before


@pytest.mark.parametrize(
    "raw",
    [
        '{"outcome":"failed","outcome":"success"}',
        '{"elapsed_seconds":NaN}',
        '{"elapsed_seconds":Infinity}',
        '{"elapsed_seconds":1e999}',
        "{} {}",
        "[]",
        "\ufeff{}",
    ],
)
def test_json_ambiguity_nonfinite_and_nonobjects_rejected(tmp_path, raw):
    path = tmp_path / "ambiguous.json"
    path.write_text(raw, encoding="utf-8")
    with pytest.raises(ValueError):
        benchmark.load_json(path)


def test_csv_header_and_extra_cells_rejected(tmp_path, metadata, python_observation):
    row = normalize(python_observation, metadata)
    path = tmp_path / "trials.csv"
    write_csv(path, [row], fields=list(reversed(CSV_FIELDS)))
    with pytest.raises(ValueError):
        benchmark.read_trials(path)
    write_csv(path, [row])
    path.write_text(
        path.read_text(encoding="utf-8") + "unexpected,trailing,row\n", encoding="utf-8"
    )
    with pytest.raises(ValueError):
        benchmark.read_trials(path)


def test_summarizer_revalidates_raw_rows_and_global_ids(metadata, python_observation):
    row = normalize(python_observation, metadata)
    duplicate = dict(row, run_id="another-run")
    with pytest.raises(ValueError):
        benchmark.summarize_trials([row, duplicate])
    malformed = dict(row, elapsed_seconds="NaN")
    with pytest.raises(ValueError):
        benchmark.summarize_trials([malformed])
    malformed = dict(row)
    del malformed["phase"]
    with pytest.raises(ValueError):
        benchmark.summarize_trials([malformed])


def test_cli_record_defaults_to_exploration_and_summary_stays_manual(
    tmp_path, capsys, metadata, python_observation
):
    observation_path, metadata_path, csv_path = (
        tmp_path / "observation.json",
        tmp_path / "metadata.json",
        tmp_path / "trials.csv",
    )
    write_json(observation_path, python_observation)
    write_json(metadata_path, metadata)
    args = [
        "benchmark",
        "record",
        "--observation",
        str(observation_path),
        "--metadata",
        str(metadata_path),
        "--csv",
        str(csv_path),
        "--trial-id",
        "001",
    ]
    assert main(args) == 2 and not csv_path.exists()
    assert main([*args, "--attest-physical"]) == 0
    assert benchmark.read_trials(csv_path)[0]["phase"] == "exploratory"
    capsys.readouterr()
    assert main(["benchmark", "summarize", str(csv_path)]) == 0
    summary = json.loads(capsys.readouterr().out)
    assert summary["gate_decision"] == "manual_review_required"


@pytest.mark.parametrize("attestation", [1, "true", None])
def test_attestation_must_be_an_explicit_boolean(attestation, metadata, python_observation):
    with pytest.raises(ValueError):
        normalize(python_observation, metadata, attest=attestation)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("commit", "34" * 20),
        ("sender_device", "Other computer"),
        ("receiver_device", "Other phone"),
        ("sender_os", "Other OS"),
        ("receiver_os", "Other OS"),
        ("sender_app", "Other app"),
        ("receiver_app", "Other browser"),
        ("direction", "android-to-windows"),
        ("payload_sha256", "cd" * 32),
        ("symbol_size", "512"),
        ("fps", "4"),
        ("ecc", "L"),
        ("distance_cm", "26"),
        ("lighting", "Different lighting"),
        ("phase", "exploratory"),
    ],
)
def test_same_run_cannot_change_any_frozen_cell_dimension(
    field, value, metadata, python_observation
):
    first = normalize(python_observation, metadata)
    changed = dict(first, trial_id="second-trial")
    changed[field] = value
    with pytest.raises(ValueError):
        benchmark.summarize_trials([first, changed])


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("source", "synthetic"),
        ("elapsed_seconds", "NaN"),
        ("elapsed_seconds", "Infinity"),
        ("elapsed_seconds", "0"),
        ("elapsed_seconds", "60"),
        ("frames_seen", "True"),
        ("duplicates", "-1"),
        ("rejected", "1.5"),
        ("physical_attested", "yes"),
        ("timeout_seconds", "61"),
        ("payload_sha256", "bad"),
    ],
)
def test_summarizer_does_not_trust_hand_edited_rows(field, value, metadata, python_observation):
    row = normalize(python_observation, metadata)
    row[field] = value
    with pytest.raises(ValueError):
        benchmark.summarize_trials([row])


def test_input_resource_limits_and_bad_utf8_reject_without_creating_csv(
    tmp_path, metadata, python_observation
):
    observation_path, metadata_path, csv_path = (
        tmp_path / "observation.json",
        tmp_path / "metadata.json",
        tmp_path / "trials.csv",
    )
    write_json(metadata_path, metadata)
    observation_path.write_bytes(b" " * 65_537)
    with pytest.raises(ValueError):
        benchmark.record_observation(
            observation_path,
            metadata_path,
            csv_path,
            trial_id="001",
            phase="acceptance",
            attest_physical=True,
        )
    assert not csv_path.exists()
    write_json(observation_path, python_observation)
    metadata_path.write_bytes(b" " * 16_385)
    with pytest.raises(ValueError):
        benchmark.record_observation(
            observation_path,
            metadata_path,
            csv_path,
            trial_id="001",
            phase="acceptance",
            attest_physical=True,
        )
    assert not csv_path.exists()
    observation_path.write_bytes(b"\xff")
    with pytest.raises(ValueError):
        benchmark.load_json(observation_path)


def test_csv_unicode_labels_roundtrip_without_losing_fields(tmp_path, metadata, python_observation):
    metadata["sender_device"] = "Test, computer Γ 🌍"
    row = normalize(python_observation, metadata)
    path = tmp_path / "trials.csv"
    write_csv(path, [row])
    assert benchmark.read_trials(path) == [row]
    assert benchmark.read_trials(path)[0]["sender_device"] == metadata["sender_device"]


def test_csv_surplus_cells_duplicate_header_and_legacy_header_are_rejected(
    tmp_path, metadata, python_observation
):
    row = normalize(python_observation, metadata)
    path = tmp_path / "trials.csv"
    write_csv(path, [row])
    lines = path.read_text(encoding="utf-8").splitlines()
    path.write_text(lines[0] + "\n" + lines[1] + ",unexpected\n", encoding="utf-8")
    with pytest.raises(ValueError):
        benchmark.read_trials(path)
    write_csv(path, [row], fields=[*CSV_FIELDS, "error"])
    with pytest.raises(ValueError):
        benchmark.read_trials(path)
    path.write_text(",".join(CSV_FIELDS[:23]) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="[Hh]eader|[Mm]igrat|[Ll]egacy"):
        benchmark.read_trials(path)


def test_csv_row_and_byte_caps_are_enforced(tmp_path, metadata, python_observation):
    path = tmp_path / "trials.csv"
    row = normalize(python_observation, metadata)
    write_csv(path, [dict(row, trial_id=f"trial-{index}") for index in range(10_001)])
    with pytest.raises(ValueError):
        benchmark.read_trials(path)
    path.write_bytes(b" " * (10 * 1024 * 1024 + 1))
    with pytest.raises(ValueError):
        benchmark.read_trials(path)


@pytest.mark.parametrize(
    ("payload", "successes", "duration", "status"),
    [
        (102_400, 18, 100, "tier_a_candidate"),
        (102_400, 18, 100.0001, "tier_a_not_met_test_10KiB"),
        (102_400, 17, 10, "tier_a_not_met_test_10KiB"),
        (10_240, 18, 20, "tier_b_candidate_requires_tier_a_failure"),
        (10_240, 18, 20.0001, "inconclusive"),
        (10_240, 17, 1, "inconclusive"),
        (10_240, 16, 1, "inconclusive"),
        (10_240, 15, 1, "stop_expansion_candidate"),
        (10_240, 0, 1, "stop_expansion_candidate"),
    ],
)
def test_tier_thresholds_are_only_exact_twenty_trial_manual_candidates(
    payload, successes, duration, status, metadata, browser_observation
):
    metadata.update(payload_bytes=payload, timeout_seconds=max(60, 3 * payload / 1024))
    rows = make_rows(browser_observation, metadata, successes=successes, duration=duration)
    summary = benchmark.summarize_trials(rows)
    assert summary["gate_decision"] == "manual_review_required"
    assert len(summary["runs"]) == 1
    run = summary["runs"][0]
    assert run["status"] == status
    assert run["timed_trials"] == 20 and run["successes"] == successes
    assert run["outcomes"]["timeout"] == 20 - successes


@pytest.mark.parametrize("count", [19, 21])
def test_wrong_trial_count_never_trims_or_selects_successes(count, metadata, python_observation):
    summary = benchmark.summarize_trials(
        make_rows(python_observation, metadata, successes=count, count=count)
    )
    run = summary["runs"][0]
    assert run["status"] == "insufficient_evidence"
    assert run["timed_trials"] == count and run["successes"] == count
    assert any("20" in reason for reason in run["reasons"])


def test_success_only_statistics_and_median_individual_rates_are_exact(
    metadata, python_observation
):
    rows = []
    durations = [10, 30]
    for index, duration in enumerate(durations):
        item = dict(python_observation, elapsed_seconds=duration)
        rows.append(normalize(item, metadata, trial_id=f"success-{index}", phase="exploratory"))
    failed = dict(
        python_observation,
        outcome="timeout",
        reason="No completion",
        elapsed_seconds=60,
        payload_bytes=None,
        payload_sha256=None,
    )
    rows.append(normalize(failed, metadata, trial_id="timeout", phase="exploratory"))
    run = benchmark.summarize_trials(rows)["runs"][0]
    metrics = run["successful_only"]
    assert run["timed_trials"] == 3 and run["successes"] == 2
    assert metrics["median_elapsed_seconds"] == 20
    assert metrics["p95_elapsed_seconds_nearest_rank"] == 30
    assert metrics["median_effective_kib_per_second"] == pytest.approx(
        median([10 / duration for duration in durations])
    )
    assert metrics["median_effective_kib_per_second"] != 10 / 20
    assert run["failures_by_reason"] == [
        {"outcome": "timeout", "reason": "No completion", "count": 1}
    ]


def test_nearest_rank_p95_boundary_and_no_success_nulls(metadata, python_observation):
    rows = make_rows(python_observation, metadata, successes=19)
    for index in range(19):
        rows[index]["elapsed_seconds"] = str(index + 1)
    metrics = benchmark.summarize_trials(rows)["runs"][0]["successful_only"]
    assert metrics["median_elapsed_seconds"] == 10
    assert metrics["p95_elapsed_seconds_nearest_rank"] == 19
    empty_metrics = benchmark.summarize_trials(
        make_rows(python_observation, metadata, successes=0)
    )["runs"][0]["successful_only"]
    assert all(value is None for value in empty_metrics.values())


def test_all_failure_outcomes_remain_in_denominator_and_reasons(metadata, python_observation):
    rows = make_rows(python_observation, metadata, successes=17)
    rows[17].update(outcome="failed", elapsed_seconds="10", error="Camera interrupted")
    rows[18].update(outcome="cancelled", elapsed_seconds="10", error="User cancelled")
    summary = benchmark.summarize_trials(rows)
    run = summary["runs"][0]
    assert run["timed_trials"] == 20 and run["successes"] == 17
    assert run["status"] == "inconclusive"
    assert run["outcomes"] == {"success": 17, "failed": 1, "cancelled": 1, "timeout": 1}
    assert sum(reason["count"] for reason in run["failures_by_reason"]) == 3


@pytest.mark.parametrize("kind", ["direction", "rerun", "phase", "settings"])
def test_distinct_run_cells_do_not_pool_into_twenty(kind, metadata, python_observation):
    first = make_rows(python_observation, metadata, successes=10, count=10)
    second_meta = dict(metadata, run_id="run-002")
    if kind == "direction":
        second_meta["direction"] = "android-to-windows"
    if kind == "settings":
        second_meta["fps"] = 4
    second = make_rows(python_observation, second_meta, successes=10, count=10)
    for row in second:
        row["trial_id"] = "other-" + row["trial_id"]
        if kind == "phase":
            row["phase"] = "exploratory"
    summary = benchmark.summarize_trials([*first, *second])
    assert len(summary["runs"]) == 2
    assert [run["timed_trials"] for run in summary["runs"]] == [10, 10]
    assert all("candidate" not in run["status"] for run in summary["runs"])


def test_unattested_and_synthetic_rows_cannot_qualify(metadata, python_observation):
    rows = make_rows(python_observation, metadata, successes=20)
    for row in rows:
        row["physical_attested"] = "false"
    run = benchmark.summarize_trials(rows)["runs"][0]
    assert run["status"] in {"insufficient_evidence", "not_eligible"}
    assert any("attest" in reason.lower() for reason in run["reasons"])
    for row in rows:
        row["source"] = "synthetic"
    run = benchmark.summarize_trials(rows)["runs"][0]
    assert run["status"] == "not_eligible"
    assert run["timed_trials"] == 20 and run["successes"] == 20


def test_setup_failures_are_counted_separately(metadata, python_observation):
    cancelled = dict(
        python_observation,
        outcome="cancelled",
        reason="Setup abandoned",
        elapsed_seconds=None,
        payload_bytes=None,
        payload_sha256=None,
    )
    timed = normalize(python_observation, metadata, phase="exploratory", trial_id="timed")
    setup = normalize(cancelled, metadata, phase="exploratory", trial_id="setup")
    run = benchmark.summarize_trials([timed, setup])["runs"][0]
    assert run["rows"] == 2 and run["timed_trials"] == 1 and run["setup_observations"] == 1
    assert run["outcomes"]["cancelled"] == 0
    assert run["status"] == "not_eligible"


def test_unsupported_decimal_kb_payload_never_earns_kib_tier(metadata, python_observation):
    metadata["payload_bytes"] = 10_000
    rows = make_rows(python_observation, metadata, successes=20)
    run = benchmark.summarize_trials(rows)["runs"][0]
    assert run["status"] == "insufficient_evidence"
    assert any("payload" in reason.lower() for reason in run["reasons"])


def test_python_cleanup_warnings_preserve_success_and_are_recorded(metadata, python_observation):
    python_observation["cleanup_errors"] = ["Camera release failed", "Window cleanup failed"]
    row = normalize(python_observation, metadata)
    assert row["outcome"] == "success"
    assert "Camera release failed" in row["error"] and "Window cleanup failed" in row["error"]


def test_atomic_write_failure_keeps_existing_rows_and_cleans_lock(
    monkeypatch, tmp_path, metadata, python_observation
):
    observation_path, metadata_path, csv_path = (
        tmp_path / "observation.json",
        tmp_path / "metadata.json",
        tmp_path / "trials.csv",
    )
    write_json(observation_path, python_observation)
    write_json(metadata_path, metadata)
    benchmark.record_observation(
        observation_path,
        metadata_path,
        csv_path,
        trial_id="first",
        phase="acceptance",
        attest_physical=True,
    )
    before = csv_path.read_bytes()

    def fail_replace(*_args):
        raise OSError("Simulated disk replacement failure")

    monkeypatch.setattr(benchmark.os, "replace", fail_replace)
    with pytest.raises(OSError, match="Simulated disk"):
        benchmark.record_observation(
            observation_path,
            metadata_path,
            csv_path,
            trial_id="second",
            phase="acceptance",
            attest_physical=True,
        )
    assert csv_path.read_bytes() == before
    assert not csv_path.with_name(csv_path.name + ".lock").exists()
    assert {path.name for path in tmp_path.iterdir()} == {
        "observation.json",
        "metadata.json",
        "trials.csv",
    }


@pytest.mark.parametrize("state", [[], {}, None, 1])
def test_bad_browser_state_returns_cli_error_without_traceback_or_csv(
    state, tmp_path, capsys, metadata, browser_observation
):
    browser_observation["stats"]["state"] = state
    with pytest.raises(ValueError):
        normalize(browser_observation, metadata)
    observation_path, metadata_path, csv_path = (
        tmp_path / "observation.json",
        tmp_path / "metadata.json",
        tmp_path / "trials.csv",
    )
    write_json(observation_path, browser_observation)
    write_json(metadata_path, metadata)
    assert (
        main(
            [
                "benchmark",
                "record",
                "--observation",
                str(observation_path),
                "--metadata",
                str(metadata_path),
                "--csv",
                str(csv_path),
                "--trial-id",
                "bad-state",
                "--attest-physical",
            ]
        )
        == 2
    )
    assert not csv_path.exists()
    assert "Traceback" not in capsys.readouterr().err


@pytest.mark.parametrize("field", ["browser", "recorded_at", "note"])
@pytest.mark.parametrize("value", [False, [], {}, math.inf, "bad\ud800Unicode"])
def test_optional_browser_fields_are_still_validated(field, value, metadata, browser_observation):
    browser_observation[field] = value
    with pytest.raises(ValueError):
        normalize(browser_observation, metadata)


@pytest.mark.parametrize("profile", ["browser", "python"])
@pytest.mark.parametrize("value", [False, [], {}, "bad", "AB" * 16, "bad\ud800Unicode"])
def test_session_fields_reject_nonstrings_and_malformed_wire_ids(
    profile, value, metadata, browser_observation, python_observation
):
    if profile == "browser":
        browser_observation["stats"]["session"] = value
        item = browser_observation
    else:
        python_observation["session_id"] = value
        item = python_observation
    with pytest.raises(ValueError):
        normalize(item, metadata)


@pytest.mark.parametrize("seen", [0, 1, 40, 41])
def test_success_counters_cannot_claim_more_recovery_than_frames(
    seen, metadata, browser_observation
):
    browser_observation["stats"]["seen"] = seen
    with pytest.raises(ValueError):
        normalize(browser_observation, metadata)


@pytest.mark.parametrize("malformed", [None, True, 0, "row", []])
def test_raw_summary_row_shapes_reject_cleanly(malformed):
    with pytest.raises(ValueError):
        benchmark.summarize_trials([malformed])


def test_lock_prevents_competing_writer_without_destroying_data(
    tmp_path, metadata, python_observation
):
    observation_path, metadata_path, csv_path = (
        tmp_path / "observation.json",
        tmp_path / "metadata.json",
        tmp_path / "trials.csv",
    )
    write_json(observation_path, python_observation)
    write_json(metadata_path, metadata)
    before = normalize(python_observation, metadata)
    write_csv(csv_path, [before])
    bytes_before = csv_path.read_bytes()
    lock_path = csv_path.with_name(csv_path.name + ".lock")
    lock_path.write_text("another writer owns this lock", encoding="utf-8")
    with pytest.raises(OSError):
        benchmark.record_observation(
            observation_path,
            metadata_path,
            csv_path,
            trial_id="other",
            phase="acceptance",
            attest_physical=True,
        )
    assert csv_path.read_bytes() == bytes_before
    assert lock_path.read_text(encoding="utf-8") == "another writer owns this lock"


def test_even_median_of_finite_rates_cannot_overflow_summary(metadata, python_observation):
    rows = make_rows(python_observation, metadata, successes=20, duration=1e-307)
    summary = benchmark.summarize_trials(rows)
    value = summary["runs"][0]["successful_only"]["median_effective_kib_per_second"]
    assert math.isfinite(value)
    assert value == pytest.approx(10 / 1e-307)
    json.dumps(summary, allow_nan=False)


def test_even_median_of_large_finite_times_is_stable(metadata, python_observation):
    metadata["timeout_seconds"] = 1.7e308
    python_observation["elapsed_seconds"] = 1.5e308
    rows = [
        normalize(python_observation, metadata, trial_id=str(index), phase="exploratory")
        for index in range(2)
    ]
    summary = benchmark.summarize_trials(rows)
    value = summary["runs"][0]["successful_only"]["median_elapsed_seconds"]
    assert math.isfinite(value) and value == 1.5e308
    json.dumps(summary, allow_nan=False)


def test_pure_summary_enforces_csv_byte_cap_without_a_file(metadata, python_observation):
    row = normalize(python_observation, metadata)
    rows = [dict(row, trial_id=str(index), error="é" * 8192) for index in range(700)]
    with pytest.raises(ValueError):
        benchmark.summarize_trials(rows)


@pytest.mark.parametrize("total", [40, 58, 506])
def test_success_symbol_total_must_fit_declared_file_and_manifest_bounds(
    total, metadata, browser_observation
):
    browser_observation["stats"].update(total=total, recovered=total, seen=total + 1)
    with pytest.raises(ValueError):
        normalize(browser_observation, metadata)


def test_success_symbol_size_metadata_cannot_contradict_observed_total(
    metadata, browser_observation
):
    metadata["symbol_size"] = 512
    with pytest.raises(ValueError):
        normalize(browser_observation, metadata)


def test_failed_unexpected_stream_total_is_retained_with_warning_and_denominator(
    metadata, browser_observation
):
    browser_observation.update(
        outcome="timeout",
        reason="Trial timed out",
        elapsed_seconds=60.0165,
        payload_bytes=None,
        payload_sha256=None,
    )
    browser_observation["stats"].update(
        state="RECEIVING",
        total=506,
        recovered=434,
        seen=585,
        duplicates=151,
    )
    failure = normalize(browser_observation, metadata, trial_id="wrong-stream-timeout")
    assert failure["outcome"] == "timeout"
    assert "Trial timed out" in failure["error"]
    assert "inconsistent" in failure["error"].lower()
    assert "symbol" in failure["error"].lower()
    # A separate synthetic successful report supplies the other 19 timed attempts.
    successful = copy.deepcopy(browser_observation)
    successful.update(
        outcome="success",
        reason="",
        payload_bytes=10_240,
        payload_sha256=SHA256,
        elapsed_seconds=10,
    )
    successful["stats"].update(state="DONE", total=41, recovered=41, seen=42, duplicates=1)
    rows = make_rows(successful, metadata, successes=19, count=19)
    summary = benchmark.summarize_trials([*rows, failure])
    run = summary["runs"][0]
    assert run["timed_trials"] == 20 and run["successes"] == 19
    assert run["outcomes"]["timeout"] == 1
    assert any("inconsistent" in item["reason"].lower() for item in run["failures_by_reason"])
    assert summary["gate_decision"] == "manual_review_required"


@pytest.mark.parametrize("symbol_size", [1, 512])
def test_acceptance_metadata_cannot_describe_unencodable_maximum_file(
    symbol_size, metadata, python_observation
):
    metadata.update(payload_bytes=1_048_576, timeout_seconds=3072, symbol_size=symbol_size)
    python_observation.update(payload_bytes=1_048_576)
    with pytest.raises(ValueError):
        normalize(python_observation, metadata)
