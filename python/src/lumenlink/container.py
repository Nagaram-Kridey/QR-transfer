"""Bounded manifest and file container; received names never become paths."""

import hashlib
import json
import re
import time
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .constants import MAX_FILE_BYTES, MAX_MANIFEST_BYTES, MAX_SAFE_INT
from .errors import ProtocolError

FIELDS = ("name", "mime", "size", "sha256", "created", "v")
RESERVED = re.compile(r"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)", re.IGNORECASE)


def sanitize_filename(name: str) -> str:
    name = unicodedata.normalize("NFC", name)
    name = "".join(
        "_" if char in '<>:"/\\|?*' or unicodedata.category(char).startswith("C") else char
        for char in name
    )
    name = name.strip(" .")[:120].rstrip(" .")
    # Linux limits a filename component by UTF-8 bytes, not Unicode codepoints.
    while len(name.encode("utf-8")) > 240:
        name = name[:-1]
    name = name.rstrip(" .")
    if not name or name in {".", ".."}:
        name = "received.bin"
    if RESERVED.match(name):
        name = "_" + name
    return name


@dataclass(frozen=True, slots=True)
class ReceivedFile:
    name: str
    mime: str
    data: bytes
    sha256: str
    created: int

    def save(self, directory: Path) -> Path:
        directory.mkdir(parents=True, exist_ok=True)
        name = sanitize_filename(self.name)
        for index in range(1000):
            suffix = "" if index == 0 else f" ({index})"
            path = directory / f"{Path(name).stem}{suffix}{Path(name).suffix}"
            try:
                with path.open("xb") as output:
                    output.write(self.data)
                return path
            except FileExistsError:
                continue
        raise ProtocolError("SAVE", "Too many filename collisions")


def validate_manifest(manifest: Any) -> None:
    if not isinstance(manifest, dict) or set(manifest) != set(FIELDS):
        raise ProtocolError("MANIFEST", "Manifest must contain the six specified fields")
    for field in ("name", "mime", "sha256"):
        if not isinstance(manifest[field], str):
            raise ProtocolError("MANIFEST", f"Invalid manifest {field}")
        try:
            manifest[field].encode("utf-8", errors="strict")
        except UnicodeError as exc:
            raise ProtocolError("MANIFEST", "Manifest contains invalid Unicode") from exc
    if not manifest["name"] or not manifest["mime"]:
        raise ProtocolError("MANIFEST", "Filename and MIME type must not be empty")
    if type(manifest["size"]) is not int or not 0 <= manifest["size"] <= MAX_FILE_BYTES:
        raise ProtocolError("FILE_SIZE", "File size exceeds the 5 MiB limit")
    if type(manifest["created"]) is not int or not 0 <= manifest["created"] <= MAX_SAFE_INT:
        raise ProtocolError("MANIFEST", "Creation time must be a safe nonnegative integer")
    if type(manifest["v"]) is not int or manifest["v"] != 1:
        raise ProtocolError("MANIFEST", "Unsupported manifest version")
    if not re.fullmatch(r"[0-9a-f]{64}", manifest["sha256"]):
        raise ProtocolError("MANIFEST", "Invalid SHA-256")


def prepare_container(
    data: bytes, name: str, mime: str = "application/octet-stream", *, created: int | None = None
) -> bytes:
    manifest = {
        "name": name,
        "mime": mime,
        "size": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "created": int(time.time()) if created is None else created,
        "v": 1,
    }
    validate_manifest(manifest)
    encoded = json.dumps(manifest, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if len(encoded) > MAX_MANIFEST_BYTES:
        raise ProtocolError("MANIFEST", "Manifest exceeds 4 KiB")
    return len(encoded).to_bytes(2, "big") + encoded + data


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    output: dict[str, Any] = {}
    for key, value in pairs:
        if key in output:
            raise ProtocolError("MANIFEST", "Duplicate JSON field")
        output[key] = value
    return output


def open_container(container: bytes) -> ReceivedFile:
    if len(container) < 2 or len(container) > MAX_FILE_BYTES + MAX_MANIFEST_BYTES + 2:
        raise ProtocolError("LENGTH", "Invalid plaintext container length")
    length = int.from_bytes(container[:2], "big")
    if not 1 <= length <= MAX_MANIFEST_BYTES or 2 + length > len(container):
        raise ProtocolError("MANIFEST", "Invalid manifest length")
    try:
        manifest = json.loads(container[2 : 2 + length], object_pairs_hook=_unique_object)
    except (ValueError, UnicodeError, RecursionError) as exc:
        raise ProtocolError("MANIFEST", "Invalid manifest JSON") from exc
    validate_manifest(manifest)
    canonical = json.dumps(manifest, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if tuple(manifest) != FIELDS or canonical != container[2 : 2 + length]:
        raise ProtocolError("MANIFEST", "Manifest is not canonical")
    data = container[2 + length :]
    if len(data) != manifest["size"]:
        raise ProtocolError("FILE_SIZE", "Declared and actual file sizes differ")
    digest = hashlib.sha256(data).hexdigest()
    if digest != manifest["sha256"]:
        raise ProtocolError("FILE_HASH", "File integrity check failed")
    return ReceivedFile(
        sanitize_filename(manifest["name"]), manifest["mime"], data, digest, manifest["created"]
    )
