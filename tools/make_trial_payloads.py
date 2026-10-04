"""Reproducible incompressible-looking non-sensitive fixtures for physical trials."""

import hashlib
import json
from pathlib import Path

directory = Path(__file__).resolve().parents[1] / "artifacts" / "trial-payloads"
directory.mkdir(parents=True, exist_ok=True)
manifest = []
for size in (10_240, 102_400):
    data = b"".join(
        hashlib.sha256(
            b"LumenLink public test fixture:" + n.to_bytes(4, "big")
        ).digest()
        for n in range((size + 31) // 32)
    )[:size]
    name = f"trial-{size // 1024}KiB.bin"
    (directory / name).write_bytes(data)
    manifest.append(
        {"name": name, "bytes": size, "sha256": hashlib.sha256(data).hexdigest()}
    )
(directory / "manifest.json").write_text(
    json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(manifest, indent=2))
