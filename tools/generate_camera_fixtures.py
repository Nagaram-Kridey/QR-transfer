"""Generate synthetic camera videos for regression tests, not field evidence."""

import json
from pathlib import Path

import cv2
import numpy as np
import zxingcpp

from lumenlink import Transfer, prepare_container
from lumenlink.qr_io import render_qr

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts" / "camera"
PAYLOAD = b"LumenLink synthetic optical regression.\n" * 8


def generate(degraded: bool) -> None:
    transfer = Transfer(
        prepare_container(PAYLOAD, "camera-test.txt", "text/plain", created=0)
    )
    rng = np.random.default_rng(42)
    frames = []
    for seq in range(transfer.k):
        qr = render_qr(transfer.text(seq), pixels=420)
        canvas = np.full((480, 640), 255, dtype=np.uint8)
        top, left = (480 - qr.shape[0]) // 2, (640 - qr.shape[1]) // 2
        canvas[top : top + qr.shape[0], left : left + qr.shape[1]] = qr
        if degraded:
            canvas = cv2.GaussianBlur(canvas, (3, 3), 0.65)
            noise = rng.normal(0, 2, canvas.shape)
            canvas = np.clip(canvas.astype(float) + noise, 0, 255).astype(np.uint8)
        decoded = zxingcpp.read_barcode(canvas)
        assert decoded is not None and decoded.text == transfer.text(seq)
        bgr = cv2.cvtColor(canvas, cv2.COLOR_GRAY2BGR)
        frames.append(cv2.cvtColor(bgr, cv2.COLOR_BGR2YUV_I420).tobytes())
    destination = OUTPUT / ("degraded.y4m" if degraded else "clean.y4m")
    with destination.open("wb") as video:
        video.write(b"YUV4MPEG2 W640 H480 F30:1 Ip A1:1 C420jpeg\n")
        for _ in range(6):
            for frame in frames:
                for _ in range(6):
                    video.write(b"FRAME\n" + frame)


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    generate(False)
    generate(True)
    (OUTPUT / "expected.json").write_text(
        json.dumps({"name": "camera-test.txt", "data_hex": PAYLOAD.hex()}),
        encoding="utf-8",
    )
    print(
        "Generated clean and degraded synthetic camera fixtures (not real-device benchmarks)"
    )
