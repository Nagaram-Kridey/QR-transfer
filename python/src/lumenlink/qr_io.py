"""Local display/camera adapters. No networking; imports are lazy in the CLI."""

import time
from collections.abc import Callable
from typing import Any

import cv2
import numpy as np
import segno
import zxingcpp
from numpy.typing import NDArray

from .constants import MAX_SEQ
from .container import ReceivedFile
from .errors import ProtocolError
from .repeat import Receiver, Transfer


def render_qr(text: str, pixels: int = 720, ecc: str = "M") -> NDArray[np.uint8]:
    qr = segno.make(text, error=ecc, mode="alphanumeric", micro=False, boost_error=False)
    matrix = np.array(list(qr.matrix_iter(scale=1, border=4)), dtype=np.uint8)
    scale = pixels // matrix.shape[0]
    if scale < 2:
        raise ValueError("QR display is too small for this density (minimum 2 pixels/module)")
    return np.repeat(np.repeat((1 - matrix) * 255, scale, axis=0), scale, axis=1)


def display(transfer: Transfer, *, fps: float = 8, pixels: int = 720, ecc: str = "M") -> None:
    if not 0 < fps <= 10:
        raise ValueError("FPS must be greater than zero and at most 10")
    paused = False
    seq = 0
    try:
        while seq <= MAX_SEQ:
            started = time.perf_counter()
            image = render_qr(transfer.text(seq), pixels, ecc)
            cv2.imshow("LumenLink PLAINTEXT - Space: pause | Esc: stop", image)
            remaining = max(1, int((1 / fps - (time.perf_counter() - started)) * 1000))
            key = cv2.waitKey(remaining) & 0xFF
            if (
                key == 27
                or cv2.getWindowProperty(
                    "LumenLink PLAINTEXT - Space: pause | Esc: stop", cv2.WND_PROP_VISIBLE
                )
                < 1
            ):
                break
            if key == ord(" "):
                paused = not paused
            if not paused:
                seq += 1
    finally:
        cv2.destroyAllWindows()


def capture(
    camera: int,
    *,
    timeout: float = 120,
    on_progress: Callable[[Receiver], None] | None = None,
) -> tuple[ReceivedFile | None, dict[str, Any]]:
    if camera < 0 or timeout <= 0:
        raise ValueError("Camera index and timeout must be positive/nonnegative")
    video = cv2.VideoCapture(camera)
    receiver = Receiver()
    started: float | None = None

    def observation(
        outcome: str, result: ReceivedFile | None = None, reason: str = ""
    ) -> dict[str, Any]:
        return {
            "kind": "camera_observation",
            "outcome": outcome,
            "reason": reason,
            "elapsed_seconds": time.perf_counter() - started if started is not None else None,
            "frames_seen": receiver.seen,
            "rejected": receiver.rejected,
            "duplicates": receiver.duplicates,
            "payload_bytes": len(result.data) if result else None,
            "payload_sha256": result.sha256 if result else None,
            "session_id": receiver.metadata[1].hex() if receiver.metadata else "",
        }

    try:
        if not video.isOpened():
            return None, observation(
                "failed", reason="Cannot open camera; check camera permissions"
            )
        while started is None or time.perf_counter() - started < timeout:
            ok, image = video.read()
            if not ok:
                return None, observation("failed", reason="Camera disconnected")
            cv2.imshow("LumenLink receive - Space: begin trial | Esc: cancel", image)
            key = cv2.waitKey(1) & 0xFF
            if key == 27:
                return None, observation("cancelled", reason="User cancelled")
            if started is None:
                if key != ord(" "):
                    continue
                started = time.perf_counter()
            formats = zxingcpp.BarcodeFormats(zxingcpp.BarcodeFormat.QRCode)
            for code in zxingcpp.read_barcodes(image, formats=formats)[:4]:
                try:
                    result = receiver.ingest(code.text)
                except ProtocolError as exc:
                    if receiver.state == "FAILED":
                        return None, observation("failed", reason=str(exc))
                    continue
                if on_progress is not None:
                    on_progress(receiver)
                if result is not None:
                    if time.perf_counter() - started >= timeout:
                        return None, observation("timeout", reason="Verification exceeded timeout")
                    return result, observation("success", result)
        return None, observation(
            "timeout", reason=f"No complete transfer within {timeout:g} seconds"
        )
    finally:
        video.release()
        cv2.destroyAllWindows()
