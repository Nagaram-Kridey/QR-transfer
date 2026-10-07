"""Bounded local trial bookkeeping; operator statements are not physical certification."""

import csv
import io
import json
import math
import os
import re
import tempfile
from collections import Counter
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

from .constants import MAX_FILE_BYTES, MAX_MANIFEST_BYTES, MAX_SYMBOLS

CSV_FIELDS = (
    "trial_id",
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
    "outcome",
    "elapsed_seconds",
    "frames_seen",
    "duplicates",
    "rejected",
    "error",
    "run_id",
    "phase",
    "physical_attested",
    "timeout_seconds",
)
METADATA_FIELDS = tuple(
    field
    for field in CSV_FIELDS
    if field
    not in {
        "trial_id",
        "outcome",
        "elapsed_seconds",
        "frames_seen",
        "duplicates",
        "rejected",
        "error",
        "phase",
        "physical_attested",
    }
)
RUN_FIELDS = (*METADATA_FIELDS, "phase", "physical_attested")
MAX_JSON_BYTES = 65_536
MAX_METADATA_BYTES = 16_384
MAX_CSV_BYTES = 10 * 1024 * 1024
MAX_TRIALS = 10_000
MAX_COUNTER = 1_000_000_000
EVIDENCE = "operator-supplied; physical provenance not verified"
OUTCOMES = ("success", "failed", "timeout", "cancelled")
LABEL_FIELDS = (
    "sender_device",
    "receiver_device",
    "sender_os",
    "receiver_os",
    "sender_app",
    "receiver_app",
    "direction",
    "lighting",
)
PLACEHOLDERS = {"unknown", "unspecified", "n/a", "na", "none", "?", "todo", "tbd"}
Trial = dict[str, str]


def _text(value: Any, field: str, *, empty: bool = False, limit: int = 512) -> str:
    if not isinstance(value, str) or len(value) > limit or (not value and not empty):
        raise ValueError(f"Invalid {field}")
    try:
        value.encode("utf-8", errors="strict")
    except UnicodeError as exc:
        raise ValueError(f"Invalid Unicode in {field}") from exc
    if "\0" in value:
        raise ValueError(f"NUL is invalid in {field}")
    return value


def _integer(value: Any, field: str, maximum: int = MAX_COUNTER, minimum: int = 0) -> int:
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError(f"Invalid {field}; expected integer {minimum}..{maximum}")
    return value


def _number(value: Any, field: str, *, zero: bool = False) -> float:
    if type(value) not in (int, float):
        raise ValueError(f"Invalid {field}; expected a finite number")
    try:
        number = float(value)
    except OverflowError as exc:
        raise ValueError(f"Invalid {field}; expected a finite number") from exc
    if not math.isfinite(number) or (number < 0 if zero else number <= 0):
        raise ValueError(
            f"Invalid {field}; expected a finite {'nonnegative' if zero else 'positive'} number"
        )
    return number


def _numeric_text(value: float) -> str:
    return str(int(value)) if value.is_integer() else repr(value)


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def _json_float(text: str) -> float:
    value = float(text)
    if not math.isfinite(value):
        raise ValueError("Nonfinite JSON number")
    return value


def load_json(path: Path, *, max_bytes: int = MAX_JSON_BYTES) -> dict[str, Any]:
    _integer(max_bytes, "max_bytes", MAX_JSON_BYTES, 1)
    with path.open("rb") as stream:
        raw = stream.read(max_bytes + 1)
    if len(raw) > max_bytes:
        raise ValueError(f"JSON exceeds {max_bytes} bytes")
    try:
        value = json.loads(
            raw.decode("utf-8"),
            object_pairs_hook=_unique_object,
            parse_float=_json_float,
            parse_constant=lambda value: (_ for _ in ()).throw(
                ValueError(f"Invalid JSON: {value}")
            ),
        )
    except (UnicodeError, RecursionError) as exc:
        raise ValueError("Invalid JSON") from exc
    if not isinstance(value, dict):
        raise ValueError("Expected a JSON object")
    return value


def _metadata(value: object) -> Trial:
    if not isinstance(value, dict) or set(value) != set(METADATA_FIELDS):
        raise ValueError("Metadata must contain exactly the documented cell fields")
    result = {key: _text(value[key], key) for key in LABEL_FIELDS}
    for key in LABEL_FIELDS:
        if result[key] != result[key].strip() or any(ord(char) < 32 for char in result[key]):
            raise ValueError(f"Invalid whitespace/control character in {key}")
        if result[key].casefold() in PLACEHOLDERS:
            raise ValueError(f"Unknown required metadata: {key}")
    result["commit"] = _text(value["commit"], "commit")
    if not re.fullmatch(r"[0-9a-f]{40}", result["commit"]):
        raise ValueError("Commit must be a full lowercase 40-character Git hash")
    result["run_id"] = _text(value["run_id"], "run_id")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}", result["run_id"]):
        raise ValueError("Invalid run_id")
    result["source"] = _text(value["source"], "source")
    if result["source"] not in {"physical", "synthetic"}:
        raise ValueError("Source must be physical or synthetic")
    result["payload_bytes"] = str(_integer(value["payload_bytes"], "payload_bytes", MAX_FILE_BYTES))
    result["payload_sha256"] = _text(value["payload_sha256"], "payload_sha256")
    if not re.fullmatch(r"[0-9a-f]{64}", result["payload_sha256"]):
        raise ValueError("Invalid payload_sha256")
    result["symbol_size"] = str(_integer(value["symbol_size"], "symbol_size", 1024, 1))
    fps = _number(value["fps"], "fps")
    if fps > 10 and fps not in {15, 20, 30}:
        raise ValueError("FPS exceeds the standard 10 fps limit or supported experimental targets")
    result["fps"] = _numeric_text(fps)
    result["ecc"] = _text(value["ecc"], "ecc")
    if result["ecc"] not in {"L", "M", "Q", "H"}:
        raise ValueError("Invalid ECC")
    for key in ("distance_cm", "timeout_seconds"):
        result[key] = _numeric_text(_number(value[key], key))
    return result


def _complete(metadata: Mapping[str, str]) -> bool:
    return all(metadata[key].casefold() not in PLACEHOLDERS for key in LABEL_FIELDS)


def _symbol_bounds(payload_bytes: int, symbol_size: int) -> tuple[int, int]:
    # The current uncompressed plaintext profile has a two-byte prefix and 1..4096 manifest bytes.
    return (
        (payload_bytes + 3 + symbol_size - 1) // symbol_size,
        (payload_bytes + 2 + MAX_MANIFEST_BYTES + symbol_size - 1) // symbol_size,
    )


def _trial_rules(row: Trial) -> None:
    if row["phase"] not in {"exploratory", "acceptance"}:
        raise ValueError("Phase must be exploratory or acceptance")
    if row["physical_attested"] not in {"true", "false"}:
        raise ValueError("Invalid physical_attested boolean")
    if row["source"] == "synthetic" and row["physical_attested"] == "true":
        raise ValueError("Synthetic observations cannot be physically attested")
    if row["outcome"] not in OUTCOMES:
        raise ValueError("Invalid observation outcome")
    elapsed = float(row["elapsed_seconds"]) if row["elapsed_seconds"] else None
    timeout = float(row["timeout_seconds"])
    payload = int(row["payload_bytes"])
    if row["phase"] == "acceptance":
        if float(row["fps"]) > 10:
            raise ValueError("Experimental FPS targets are exploratory only")
        if elapsed is None or not _complete(row):
            raise ValueError("Acceptance requires a timed trial and complete known metadata")
        if timeout != max(60, 3 * payload / 1024):
            raise ValueError("Acceptance timeout must match max(60, 3 * original payload_KiB)")
        if _symbol_bounds(payload, int(row["symbol_size"]))[0] > MAX_SYMBOLS:
            raise ValueError("Acceptance payload/symbol size cannot fit 2048 source symbols")
    if elapsed is None and row["outcome"] in {"success", "timeout"}:
        raise ValueError("Success/timeout cannot be an untimed setup observation")
    if row["outcome"] == "success":
        if elapsed is None or elapsed >= timeout:
            raise ValueError("Success must finish strictly before the configured timeout")
        if not math.isfinite(payload / 1024 / elapsed):
            raise ValueError("Successful throughput is not finite")
    if row["outcome"] == "timeout" and elapsed is not None and elapsed < timeout:
        raise ValueError("Timeout observation ended before its configured deadline")
    if int(row["duplicates"]) + int(row["rejected"]) > int(row["frames_seen"]):
        raise ValueError("Duplicate/rejected counts exceed frames_seen")


def normalize_observation(
    observation: object,
    metadata: object,
    *,
    trial_id: str,
    phase: str = "exploratory",
    attest_physical: bool = False,
) -> Trial:
    row = _metadata(metadata)
    row["trial_id"] = _text(trial_id, "trial_id")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}", trial_id):
        raise ValueError("Invalid trial_id")
    if type(attest_physical) is not bool:
        raise ValueError("Invalid physical attestation")
    row["phase"] = _text(phase, "phase")
    row["physical_attested"] = "true" if attest_physical else "false"
    if row["source"] == "physical" and not attest_physical:
        raise ValueError("Recording physical source requires explicit operator attestation")
    if not isinstance(observation, dict):
        raise ValueError("Expected a camera observation object")
    counters: Any
    stream_warning = ""
    if observation.get("kind") == "camera_observation":
        allowed = {
            "kind",
            "outcome",
            "reason",
            "elapsed_seconds",
            "frames_seen",
            "rejected",
            "duplicates",
            "payload_bytes",
            "payload_sha256",
            "session_id",
            "cleanup_errors",
        }
        required = allowed - {"session_id", "cleanup_errors"}
        counters = observation
        counter_fields = ("frames_seen", "duplicates", "rejected")
    elif observation.get("format") == "lumenlink-camera-observation-v1":
        allowed = {
            "format",
            "outcome",
            "reason",
            "elapsed_seconds",
            "expected_payload_kib",
            "payload_bytes",
            "payload_sha256",
            "stats",
            "browser",
            "recorded_at",
            "note",
        }
        required = allowed - {"browser", "recorded_at", "note"}
        counters = observation.get("stats")
        if not isinstance(counters, dict) or set(counters) != {
            "state",
            "recovered",
            "total",
            "seen",
            "duplicates",
            "rejected",
            "session",
        }:
            raise ValueError("Invalid browser receive statistics")
        total = _integer(counters["total"], "total", MAX_SYMBOLS)
        recovered = _integer(counters["recovered"], "recovered", total)
        seen = _integer(counters["seen"], "seen")
        if recovered > seen:
            raise ValueError("Recovered symbols exceed seen frames")
        state = _text(counters["state"], "receiver state")
        if state not in {"IDLE", "RECEIVING", "VERIFYING", "DONE", "FAILED"}:
            raise ValueError("Invalid receiver state")
        session = _text(counters["session"], "session", empty=True, limit=32)
        if session and not re.fullmatch(r"[0-9a-f]{32}", session):
            raise ValueError("Invalid receiver session")
        if observation.get("outcome") == "success" and (
            counters["state"] != "DONE" or not total or counters["recovered"] != total
        ):
            raise ValueError("Successful browser observation was not fully verified")
        if observation.get("outcome") == "success" and (
            recovered
            + _integer(counters["duplicates"], "duplicates")
            + _integer(counters["rejected"], "rejected")
            > seen
        ):
            raise ValueError("Successful recovered/duplicate/rejected counts exceed seen frames")
        minimum, maximum = _symbol_bounds(int(row["payload_bytes"]), int(row["symbol_size"]))
        if total and not minimum <= total <= maximum:
            if observation.get("outcome") == "success":
                raise ValueError(
                    "Verified source-symbol total contradicts original size/symbol metadata"
                )
            stream_warning = (
                f"Observed source-symbol total {total} is inconsistent with declared expected "
                "payload/symbol size; review the actual stream and settings."
            )
        expected = _number(
            observation.get("expected_payload_kib"), "expected_payload_kib", zero=True
        )
        if expected != int(row["payload_bytes"]) / 1024:
            raise ValueError("Browser expected_payload_kib contradicts metadata payload bytes")
        counter_fields = ("seen", "duplicates", "rejected")
    else:
        raise ValueError("Expected a supported camera report, not a frame import or simulator")
    if set(observation) - allowed or not required <= set(observation):
        raise ValueError("Observation fields do not match the camera report profile")
    if "session_id" in observation:
        session = _text(observation["session_id"], "session_id", empty=True, limit=32)
        if session and not re.fullmatch(r"[0-9a-f]{32}", session):
            raise ValueError("Invalid receiver session_id")
    for field in ("browser", "recorded_at", "note"):
        if field in observation:
            _text(observation[field], field, empty=True, limit=4096)
    row["outcome"] = _text(observation["outcome"], "outcome")
    elapsed = observation["elapsed_seconds"]
    row["elapsed_seconds"] = (
        "" if elapsed is None else _numeric_text(_number(elapsed, "elapsed_seconds"))
    )
    for target, source in zip(
        ("frames_seen", "duplicates", "rejected"), counter_fields, strict=True
    ):
        row[target] = str(_integer(counters[source], source))
    row["error"] = _text(observation["reason"], "reason", empty=True, limit=8192)
    cleanup = observation.get("cleanup_errors", [])
    if not isinstance(cleanup, list) or len(cleanup) > 16:
        raise ValueError("Invalid cleanup_errors")
    warnings = [_text(error, "cleanup error", limit=2048) for error in cleanup]
    if stream_warning:
        warnings.append(stream_warning)
    if warnings:
        row["error"] = _text("\n".join([row["error"], *warnings]), "error", empty=True, limit=8192)
    if row["outcome"] == "success":
        actual_size = _integer(
            observation["payload_bytes"], "observed payload_bytes", MAX_FILE_BYTES
        )
        if (
            actual_size != int(row["payload_bytes"])
            or observation["payload_sha256"] != row["payload_sha256"]
        ):
            raise ValueError("Success payload size/hash does not match the expected fixture")
    elif observation["payload_bytes"] is not None or observation["payload_sha256"] is not None:
        raise ValueError("Failed observations cannot assert a verified payload")
    _trial_rules(row)
    return {field: row[field] for field in CSV_FIELDS}


def _csv_integer(text: str, field: str, maximum: int = MAX_COUNTER, minimum: int = 0) -> int:
    if not re.fullmatch(r"0|[1-9][0-9]*", text):
        raise ValueError(f"Noncanonical integer in {field}")
    return _integer(int(text), field, maximum, minimum)


def _csv_number(text: str, field: str) -> float:
    try:
        number = _number(float(text), field)
    except (ValueError, OverflowError) as exc:
        raise ValueError(f"Invalid CSV number in {field}") from exc
    if text != _numeric_text(number):
        raise ValueError(f"Noncanonical number in {field}")
    return number


def _validate_rows(rows: Sequence[Mapping[str, str]]) -> list[Trial]:
    if len(rows) > MAX_TRIALS:
        raise ValueError(f"CSV exceeds {MAX_TRIALS} rows")
    result: list[Trial] = []
    identifiers: set[str] = set()
    runs: dict[str, tuple[str, ...]] = {}
    encoded_size = len(",".join(CSV_FIELDS).encode("utf-8")) + 1
    for incoming in rows:
        if (
            not isinstance(incoming, Mapping)
            or set(incoming) != set(CSV_FIELDS)
            or any(not isinstance(value, str) for value in incoming.values())
        ):
            raise ValueError("CSV row must contain exactly the canonical string columns")
        row = dict(incoming)
        # Validate the pure summary API's size bounds too, without constructing a large CSV.
        for value in row.values():
            _text(value, "CSV cell", empty=True, limit=8192)
            encoded_size += len(value.encode("utf-8"))
            if any(char in value for char in ',"\r\n'):
                encoded_size += 2 + value.count('"')
        encoded_size += len(CSV_FIELDS)
        if encoded_size > MAX_CSV_BYTES:
            raise ValueError(f"CSV exceeds {MAX_CSV_BYTES} bytes")
        metadata: dict[str, Any] = {field: row[field] for field in METADATA_FIELDS}
        metadata["payload_bytes"] = _csv_integer(
            row["payload_bytes"], "payload_bytes", MAX_FILE_BYTES
        )
        metadata["symbol_size"] = _csv_integer(row["symbol_size"], "symbol_size", 1024, 1)
        for field in ("fps", "distance_cm", "timeout_seconds"):
            metadata[field] = _csv_number(row[field], field)
        normalized = _metadata(metadata)
        if any(row[field] != normalized[field] for field in METADATA_FIELDS):
            raise ValueError("Noncanonical metadata")
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}", row["trial_id"]):
            raise ValueError("Invalid trial_id")
        if row["trial_id"] in identifiers:
            raise ValueError("Duplicate trial_id")
        identifiers.add(row["trial_id"])
        for field in ("frames_seen", "duplicates", "rejected"):
            _csv_integer(row[field], field)
        if row["elapsed_seconds"]:
            _csv_number(row["elapsed_seconds"], "elapsed_seconds")
        _text(row["error"], "error", empty=True, limit=8192)
        _trial_rules(row)
        key = tuple(row[field] for field in RUN_FIELDS)
        if row["run_id"] in runs and runs[row["run_id"]] != key:
            raise ValueError("Immutable cell metadata changed within run_id; use a new run_id")
        runs[row["run_id"]] = key
        result.append(row)
    return result


def read_trials(path: Path) -> list[Trial]:
    with path.open("rb") as stream:
        raw = stream.read(MAX_CSV_BYTES + 1)
    if len(raw) > MAX_CSV_BYTES:
        raise ValueError(f"CSV exceeds {MAX_CSV_BYTES} bytes")
    try:
        text = raw.decode("utf-8")
        reader = csv.reader(io.StringIO(text, newline=""), strict=True)
        if tuple(next(reader, [])) != CSV_FIELDS:
            raise ValueError(
                "CSV header mismatch; legacy CSV needs explicit migration, "
                "not inferred attestations"
            )
        rows = []
        for values in reader:
            if len(values) != len(CSV_FIELDS):
                raise ValueError("CSV row has the wrong number of columns")
            rows.append(dict(zip(CSV_FIELDS, values, strict=True)))
            if len(rows) > MAX_TRIALS:
                raise ValueError(f"CSV exceeds {MAX_TRIALS} rows")
    except (UnicodeError, csv.Error) as exc:
        raise ValueError("Invalid CSV") from exc
    return _validate_rows(rows)


def record_observation(
    observation_path: Path,
    metadata_path: Path,
    csv_path: Path,
    *,
    trial_id: str,
    phase: str = "exploratory",
    attest_physical: bool = False,
) -> Trial:
    row = normalize_observation(
        load_json(observation_path),
        load_json(metadata_path, max_bytes=MAX_METADATA_BYTES),
        trial_id=trial_id,
        phase=phase,
        attest_physical=attest_physical,
    )
    lock_path = csv_path.with_name(csv_path.name + ".lock")
    with lock_path.open("x", encoding="utf-8") as lock_stream:
        # Exclusive creation owns the lock; close its handle so Windows can unlink it.
        lock_stream.close()
        try:
            if csv_path.is_symlink():
                raise ValueError("Refusing a symbolic-link CSV target")
            rows = read_trials(csv_path) if csv_path.exists() else []
            rows = _validate_rows([*rows, row])
            output = io.StringIO(newline="")
            writer = csv.writer(output, lineterminator="\n")
            writer.writerow(CSV_FIELDS)
            writer.writerows([[trial[field] for field in CSV_FIELDS] for trial in rows])
            content = output.getvalue().encode("utf-8")
            if len(content) > MAX_CSV_BYTES:
                raise ValueError(f"CSV exceeds {MAX_CSV_BYTES} bytes")
            temporary: Path | None = None
            try:
                with tempfile.NamedTemporaryFile(dir=csv_path.parent, delete=False) as stream:
                    temporary = Path(stream.name)
                    stream.write(content)
                    stream.flush()
                    os.fsync(stream.fileno())
                os.replace(temporary, csv_path)
            finally:
                if temporary is not None:
                    temporary.unlink(missing_ok=True)
        finally:
            lock_path.unlink()
    return row


def _median(values: Sequence[float]) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[middle]
    low, high = ordered[middle - 1], ordered[middle]
    return low + (high - low) / 2  # Positive operands: avoid overflow from (low + high) / 2.


def summarize_trials(rows: Sequence[Mapping[str, str]]) -> dict[str, Any]:
    validated = _validate_rows(rows)
    grouped: dict[str, list[Trial]] = {}
    for row in validated:
        grouped.setdefault(row["run_id"], []).append(row)
    runs: list[dict[str, Any]] = []
    for run_id, trials in sorted(grouped.items()):
        cell = trials[0]
        timed = [row for row in trials if row["elapsed_seconds"]]
        successes = [row for row in timed if row["outcome"] == "success"]
        times = sorted(float(row["elapsed_seconds"]) for row in successes)
        rates = [
            int(row["payload_bytes"]) / 1024 / float(row["elapsed_seconds"]) for row in successes
        ]
        median_rate = _median(rates)
        reasons = []
        if cell["phase"] != "acceptance":
            reasons.append("Exploratory/setup observations do not qualify as acceptance")
        if cell["source"] != "physical" or cell["physical_attested"] != "true":
            reasons.append("Requires operator-attested physical observations")
        if not _complete(cell):
            reasons.append("Device/OS/application/direction/lighting metadata is incomplete")
        if len(timed) != 20:
            reasons.append(f"Requires exactly 20 timed trials; observed {len(timed)}")
        payload = int(cell["payload_bytes"])
        if payload not in {10_240, 102_400}:
            reasons.append("No feasibility tier is defined for this payload size")
        status = "insufficient_evidence"
        if reasons:
            if (
                cell["phase"] != "acceptance"
                or cell["source"] != "physical"
                or cell["physical_attested"] != "true"
            ):
                status = "not_eligible"
        elif payload == 102_400:
            status = (
                "tier_a_candidate"
                if len(successes) >= 18 and median_rate is not None and median_rate >= 1
                else "tier_a_not_met_test_10KiB"
            )
        elif len(successes) >= 18 and median_rate is not None and median_rate >= 0.5:
            status = "tier_b_candidate_requires_tier_a_failure"
        elif len(successes) >= 16:
            status = "inconclusive"
        else:
            status = "stop_expansion_candidate"
        failures = Counter(
            (row["outcome"], row["error"]) for row in timed if row["outcome"] != "success"
        )
        runs.append(
            {
                "run_id": run_id,
                "cell": {field: cell[field] for field in RUN_FIELDS},
                "rows": len(trials),
                "timed_trials": len(timed),
                "setup_observations": len(trials) - len(timed),
                "successes": len(successes),
                "outcomes": {
                    outcome: sum(row["outcome"] == outcome for row in timed) for outcome in OUTCOMES
                },
                "failures_by_reason": [
                    {"outcome": outcome, "reason": reason, "count": count}
                    for (outcome, reason), count in sorted(failures.items())
                ],
                "successful_only": {
                    "median_elapsed_seconds": _median(times),
                    "p95_elapsed_seconds_nearest_rank": times[math.ceil(0.95 * len(times)) - 1]
                    if times
                    else None,
                    "median_effective_kib_per_second": median_rate,
                },
                "status": status,
                "reasons": reasons,
            }
        )
    return {
        "format": "lumenlink-benchmark-summary-v1",
        "evidence": EVIDENCE,
        "gate_decision": "manual_review_required",
        "runs": runs,
        "note": (
            "Tier B requires a manually matched Tier A failure; "
            "tuning budget, device coverage and G2 remain human decisions."
        ),
    }
