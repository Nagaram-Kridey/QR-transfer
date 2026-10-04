from lumenlink.container import sanitize_filename


def test_unicode_filename_fits_linux_bytes_and_windows_characters():
    assert sanitize_filename("😀" * 130) == "😀" * 60
    assert len(sanitize_filename("न" * 120).encode("utf-8")) <= 240
