"""Freeze public synthetic QR reentry scenes, never physical benchmark evidence.

The checked-in case list is declared before any replay. PNGs and the generated
manifest belong under ignored artifacts/. Every scene holds a real wire-v2 QR;
the target is source symbol one and any stale decoy is source symbol zero.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
import zxingcpp
from lumenlink import Transfer, prepare_container
from lumenlink.qr_io import render_qr

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts" / "reentry"
SESSION = "00112233445566778899aabbccddeeff"
WIDTH, HEIGHT = 1280, 720
SMALL, NORMAL, LARGE = 231, 308, 385

# ID, challenge, seed x/y/side, target x/y/side/rotation, occlusion ms, stale decoy.
# This order and geometry are frozen independently of any measured outcomes.
CASES = (
    ("R01", "jump_right", (110, 206, NORMAL), (862, 206, NORMAL, 0), 0, False),
    ("R02", "jump_left", (862, 206, NORMAL), (110, 206, NORMAL, 0), 0, False),
    ("R03", "jump_down", (486, 20, NORMAL), (486, 392, NORMAL, 0), 0, False),
    ("R04", "jump_up", (486, 392, NORMAL), (486, 20, NORMAL, 0), 0, False),
    ("R05", "edge_top_left", (862, 392, NORMAL), (12, 12, NORMAL, 0), 0, False),
    ("R06", "edge_top_right", (12, 392, NORMAL), (960, 12, NORMAL, 0), 0, False),
    ("R07", "edge_bottom_left", (960, 12, NORMAL), (12, 400, NORMAL, 0), 0, False),
    ("R08", "edge_bottom_right", (12, 12, NORMAL), (960, 400, NORMAL, 0), 0, False),
    ("R09", "quarter_turn_right", (110, 206, NORMAL), (862, 206, NORMAL, 90), 0, False),
    ("R10", "half_turn_left", (862, 206, NORMAL), (110, 206, NORMAL, 180), 0, False),
    ("R11", "grow_and_move", (110, 240, SMALL), (780, 180, LARGE, 0), 0, False),
    ("R12", "shrink_and_move", (60, 160, LARGE), (910, 240, SMALL, 0), 0, False),
    (
        "R13",
        "short_occlusion_lateral",
        (110, 206, NORMAL),
        (862, 206, NORMAL, 0),
        250,
        False,
    ),
    ("R14", "occlusion_vertical", (486, 20, NORMAL), (486, 392, NORMAL, 0), 500, False),
    (
        "R15",
        "duplicate_decoy_top_left",
        (20, 20, SMALL),
        (486, 206, NORMAL, 0),
        0,
        True,
    ),
    (
        "R16",
        "duplicate_decoy_top_right",
        (1029, 20, SMALL),
        (486, 206, NORMAL, 0),
        0,
        True,
    ),
    (
        "R17",
        "duplicate_decoy_bottom_left",
        (20, 469, SMALL),
        (486, 206, NORMAL, 0),
        0,
        True,
    ),
    (
        "R18",
        "duplicate_decoy_bottom_right",
        (1029, 469, SMALL),
        (486, 206, NORMAL, 0),
        0,
        True,
    ),
    (
        "R19",
        "duplicate_decoy_small_target",
        (20, 20, SMALL),
        (600, 280, SMALL, 0),
        0,
        True,
    ),
    (
        "R20",
        "duplicate_decoy_large_target",
        (1029, 469, SMALL),
        (400, 120, LARGE, 90),
        0,
        True,
    ),
)


def place(canvas: np.ndarray, qr: np.ndarray, x: int, y: int) -> None:
    height, width = qr.shape
    if not (0 <= x <= WIDTH - width and 0 <= y <= HEIGHT - height):
        raise ValueError("Declared scene exceeds native source dimensions")
    canvas[y : y + height, x : x + width] = qr


def write_scene(path: Path, image: np.ndarray) -> str:
    if not cv2.imwrite(str(path), image):
        raise RuntimeError(f"Cannot write fixture {path.name}")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def generate() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    payload = bytes(index % 251 for index in range(16000))
    transfer = Transfer(
        prepare_container(
            payload, "reentry-public.bin", "application/octet-stream", created=0
        ),
        session_id=bytes.fromhex(SESSION),
    )
    if transfer.k != 64:
        raise RuntimeError("Frozen public source must have exactly 64 symbols")
    blank = np.full((HEIGHT, WIDTH), 255, dtype=np.uint8)
    blank_hash = write_scene(OUTPUT / "blank.png", blank)
    events = []
    for case_id, challenge, seed, target, occlusion, decoy in CASES:
        seed_x, seed_y, seed_side = seed
        target_x, target_y, target_side, rotation = target
        seed_qr = render_qr(transfer.text(0), pixels=seed_side)
        target_qr = render_qr(transfer.text(1), pixels=target_side)
        if seed_qr.shape != (seed_side, seed_side) or target_qr.shape != (
            target_side,
            target_side,
        ):
            raise RuntimeError("Frozen module geometry changed")
        target_qr = np.rot90(target_qr, rotation // 90).copy()
        initial = blank.copy()
        place(initial, seed_qr, seed_x, seed_y)
        reentered = blank.copy()
        if decoy:
            place(reentered, seed_qr, seed_x, seed_y)
        place(reentered, target_qr, target_x, target_y)
        seed_codes = zxingcpp.read_barcodes(initial)
        target_codes = zxingcpp.read_barcodes(reentered)
        if not any(code.text == transfer.text(0) for code in seed_codes):
            raise RuntimeError(f"Seed QR cannot decode in {case_id}")
        if not any(code.text == transfer.text(1) for code in target_codes):
            raise RuntimeError(f"Target QR cannot decode in {case_id}")
        seed_file, target_file = f"{case_id}-seed.png", f"{case_id}-target.png"
        events.append(
            {
                "event_id": case_id,
                "challenge": challenge,
                "source_width": WIDTH,
                "source_height": HEIGHT,
                "seed": {
                    "x": seed_x,
                    "y": seed_y,
                    "side": seed_side,
                    "symbol_index": 0,
                },
                "target": {
                    "x": target_x,
                    "y": target_y,
                    "side": target_side,
                    "rotation_degrees": rotation,
                    "center_x": target_x + target_side / 2,
                    "center_y": target_y + target_side / 2,
                    "symbol_index": 1,
                },
                "occlusion_ms": occlusion,
                "stale_same_session_decoy": decoy,
                "seed_png": seed_file,
                "target_png": target_file,
                "seed_png_sha256": write_scene(OUTPUT / seed_file, initial),
                "target_png_sha256": write_scene(OUTPUT / target_file, reentered),
                "paired_order": ["full_frame", "auto_region"]
                if len(events) % 2 == 0
                else ["auto_region", "full_frame"],
            }
        )
    manifest = {
        "format": "lumenlink-synthetic-reentry-fixtures-v1",
        "evidence": "Synthetic software replay only; not physical camera qualification.",
        "session_id": SESSION,
        "source_symbol_count": transfer.k,
        "symbol_size": transfer.symbol_size,
        "payload_bytes": len(payload),
        "payload_sha256": hashlib.sha256(payload).hexdigest(),
        "blank_png": "blank.png",
        "blank_png_sha256": blank_hash,
        "events": events,
    }
    (OUTPUT / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(
        "Frozen 20 public paired QR reentry scenes (synthetic, not physical evidence)"
    )


if __name__ == "__main__":
    generate()
