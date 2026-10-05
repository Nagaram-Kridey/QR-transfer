import itertools

import numpy as np
import pytest

from lumenlink import Transfer, prepare_container, qr_io


class FakeCamera:
    def __init__(self, frames, opened=True):
        self.frames = itertools.cycle(frames)
        self.opened = opened
        self.released = False

    def isOpened(self):
        return self.opened

    def read(self):
        return True, next(self.frames)

    def release(self):
        self.released = True


def mock_camera(monkeypatch, frames, keys, *, opened=True):
    camera = FakeCamera(frames, opened)
    key_iterator = iter(keys)
    monkeypatch.setattr(qr_io.cv2, "VideoCapture", lambda _: camera)
    monkeypatch.setattr(qr_io.cv2, "imshow", lambda *_: None)
    monkeypatch.setattr(qr_io.cv2, "destroyAllWindows", lambda: None)
    monkeypatch.setattr(qr_io.cv2, "waitKey", lambda _: next(key_iterator, 0))
    monkeypatch.setattr(qr_io.cv2, "getWindowProperty", lambda *_: 1)
    return camera


def test_python_camera_arms_then_decodes_real_qr_pixels(monkeypatch):
    data = b"An actual QR render/scan adapter test" * 10
    transfer = Transfer(prepare_container(data, "optical.txt", created=0))
    images = [qr_io.render_qr(transfer.text(i), 640) for i in range(transfer.k)]
    camera = mock_camera(monkeypatch, images, [0, 0, ord(" ")])
    counts = []
    result, report = qr_io.capture(0, on_progress=lambda receiver: counts.append(receiver.seen))
    assert result.data == data
    assert report["outcome"] == "success" and report["payload_bytes"] == len(data)
    assert report["elapsed_seconds"] > 0
    assert camera.released and counts


def test_cancel_and_camera_failure_produce_observations(monkeypatch):
    blank = np.full((100, 100), 255, dtype=np.uint8)
    camera = mock_camera(monkeypatch, [blank], [27])
    result, report = qr_io.capture(0)
    assert result is None and report["outcome"] == "cancelled"
    assert report["elapsed_seconds"] is None and camera.released
    camera = mock_camera(monkeypatch, [blank], [], opened=False)
    result, report = qr_io.capture(0)
    assert result is None and report["outcome"] == "failed" and camera.released


def test_camera_timeout_and_bounds(monkeypatch):
    blank = np.full((100, 100), 255, dtype=np.uint8)
    camera = mock_camera(monkeypatch, [blank], [ord(" ")])
    times = itertools.count(0, 1)
    monkeypatch.setattr(qr_io.time, "perf_counter", lambda: next(times))
    result, report = qr_io.capture(0, timeout=0.5)
    assert result is None and report["outcome"] == "timeout" and camera.released
    with pytest.raises(ValueError):
        qr_io.capture(-1)
    with pytest.raises(ValueError):
        qr_io.capture(0, timeout=0)
    with pytest.raises(ValueError, match="small"):
        qr_io.render_qr("TEST", pixels=1)


def test_display_rate_cap_and_escape(monkeypatch):
    transfer = Transfer(prepare_container(b"hello", "x", created=0))
    for fps in (0, 11):
        with pytest.raises(ValueError):
            qr_io.display(transfer, fps=fps)
    monkeypatch.setattr(qr_io.cv2, "imshow", lambda *_: None)
    monkeypatch.setattr(qr_io.cv2, "waitKey", lambda _: 27)
    monkeypatch.setattr(qr_io.cv2, "destroyAllWindows", lambda: None)
    qr_io.display(transfer)


def test_closed_receive_window_records_cancellation(monkeypatch):
    blank = np.full((100, 100), 255, dtype=np.uint8)
    camera = mock_camera(monkeypatch, [blank], [ord(" "), 0])
    visibility = iter([1, 0])
    monkeypatch.setattr(qr_io.cv2, "getWindowProperty", lambda *_: next(visibility))
    clock = itertools.count(0, 1)
    monkeypatch.setattr(qr_io.time, "perf_counter", lambda: next(clock))
    result, report = qr_io.capture(0, timeout=5)
    assert result is None and report["outcome"] == "cancelled"
    assert "window" in report["reason"].lower()
    assert report["elapsed_seconds"] is not None and camera.released


@pytest.mark.parametrize(
    ("error_type", "outcome"),
    [
        (KeyboardInterrupt, "cancelled"),
        (RuntimeError, "failed"),
        (qr_io.cv2.error, "failed"),
    ],
)
def test_adapter_interruptions_preserve_started_trial_observations(monkeypatch, error_type, outcome):
    blank = np.full((100, 100), 255, dtype=np.uint8)
    camera = mock_camera(monkeypatch, [blank], [ord(" ")])

    def interrupt_decoder(*_args, **_kwargs):
        raise error_type("Decoder adapter failed")

    monkeypatch.setattr(qr_io.zxingcpp, "read_barcodes", interrupt_decoder)
    result, report = qr_io.capture(0)
    assert result is None and report["outcome"] == outcome
    assert report["reason"] and report["elapsed_seconds"] is not None
    assert camera.released


def test_verification_after_deadline_is_not_success(monkeypatch):
    transfer = Transfer(prepare_container(b"late", "late.txt", created=0))
    image = qr_io.render_qr(transfer.text(0), 640)
    camera = mock_camera(monkeypatch, [image], [ord(" ")])
    moments = iter([0, 2, 2])
    monkeypatch.setattr(qr_io.time, "perf_counter", lambda: next(moments))
    result, report = qr_io.capture(0, timeout=1)
    assert result is None and report["outcome"] == "timeout"
    assert report["payload_bytes"] is None and camera.released


def test_camera_constructor_failure_returns_setup_observation(monkeypatch):
    def fail_constructor(_camera):
        raise qr_io.cv2.error("Camera backend initialization failed")

    monkeypatch.setattr(qr_io.cv2, "VideoCapture", fail_constructor)
    monkeypatch.setattr(qr_io.cv2, "destroyAllWindows", lambda: None)
    result, report = qr_io.capture(0)
    assert result is None and report["outcome"] == "failed"
    assert report["elapsed_seconds"] is None
    assert "Camera backend initialization failed" in report["reason"]


@pytest.mark.parametrize("cleanup", ["release", "destroyAllWindows"])
def test_cleanup_errors_cannot_discard_a_started_cancelled_observation(monkeypatch, cleanup):
    blank = np.full((100, 100), 255, dtype=np.uint8)
    camera = mock_camera(monkeypatch, [blank], [ord(" "), 27])

    def fail_cleanup():
        raise qr_io.cv2.error("Camera cleanup failed")

    if cleanup == "release":
        monkeypatch.setattr(camera, "release", fail_cleanup)
    else:
        monkeypatch.setattr(qr_io.cv2, "destroyAllWindows", fail_cleanup)
    result, report = qr_io.capture(0)
    assert result is None and report["outcome"] == "cancelled"
    assert report["elapsed_seconds"] is not None
    assert any("Camera cleanup failed" in error for error in report["cleanup_errors"])
    if cleanup == "destroyAllWindows":
        assert camera.released


@pytest.mark.parametrize("cleanup", ["release", "destroyAllWindows"])
def test_cleanup_errors_preserve_verified_success_and_are_reported(monkeypatch, cleanup):
    transfer = Transfer(prepare_container(b"verified", "verified.txt", created=0))
    image = qr_io.render_qr(transfer.text(0), 640)
    camera = mock_camera(monkeypatch, [image], [ord(" ")])

    def fail_cleanup():
        raise qr_io.cv2.error("Cleanup failed after verification")

    if cleanup == "release":
        monkeypatch.setattr(camera, "release", fail_cleanup)
    else:
        monkeypatch.setattr(qr_io.cv2, "destroyAllWindows", fail_cleanup)
    result, report = qr_io.capture(0)
    assert result is not None and result.data == b"verified"
    assert report["outcome"] == "success" and report["payload_sha256"] == result.sha256
    assert any("Cleanup failed after verification" in error for error in report["cleanup_errors"])
