"""Versioned bounded framing. Plaintext checksums are NOT authentication."""

import hashlib
import hmac
import struct
from dataclasses import dataclass

from . import base45
from .constants import (
    HEADER_SIZE,
    MAX_CONTAINER_BYTES,
    MAX_FRAME_BYTES,
    MAX_QR_CHARS,
    MAX_SEQ,
    MAX_SYMBOL_BYTES,
    MAX_SYMBOLS,
    PLAINTEXT_REPEAT,
    TAG_SIZE,
    WIRE_VERSION,
)
from .errors import ProtocolError

HEADER = struct.Struct(">B16sIHI")


@dataclass(frozen=True, slots=True)
class Frame:
    session_id: bytes
    container_len: int
    symbol_size: int
    seq: int
    symbol: bytes
    flags: int = PLAINTEXT_REPEAT

    @property
    def k(self) -> int:
        return (self.container_len + self.symbol_size - 1) // self.symbol_size

    @property
    def metadata(self) -> tuple[int, bytes, int, int]:
        return self.flags, self.session_id, self.container_len, self.symbol_size

    def validate(self) -> None:
        if self.flags >> 4 != WIRE_VERSION:
            raise ProtocolError("VERSION", "Unsupported wire version")
        if self.flags & 0x08:
            raise ProtocolError("FLAGS", "Reserved flag is set")
        if self.flags != PLAINTEXT_REPEAT:
            raise ProtocolError("MODE", "This demo supports plaintext repeat-mode only")
        if len(self.session_id) != 16:
            raise ProtocolError("SESSION", "Session identifier must contain 16 bytes")
        if not 1 <= self.container_len <= MAX_CONTAINER_BYTES:
            raise ProtocolError("LENGTH", "Container length exceeds protocol bounds")
        if not 1 <= self.symbol_size <= MAX_SYMBOL_BYTES:
            raise ProtocolError("SYMBOL_SIZE", "Symbol size must be between 1 and 1024")
        if self.k > MAX_SYMBOLS:
            raise ProtocolError("SYMBOL_COUNT", "Too many symbols; use a larger symbol size")
        if not 0 <= self.seq <= MAX_SEQ:
            raise ProtocolError("SEQUENCE", "Sequence exhausted; prepare a new session")
        if len(self.symbol) != self.symbol_size:
            raise ProtocolError("LENGTH", "Incorrect symbol length")
        if self.seq % self.k == self.k - 1:
            used = self.container_len - (self.k - 1) * self.symbol_size
            if any(self.symbol[used:]):
                raise ProtocolError("PADDING", "Last symbol padding must be zero")


def pack_frame(frame: Frame) -> bytes:
    frame.validate()
    body = (
        HEADER.pack(
            frame.flags, frame.session_id, frame.container_len, frame.symbol_size, frame.seq
        )
        + frame.symbol
    )
    return body + hashlib.sha256(body).digest()[:TAG_SIZE]


def unpack_frame(raw: bytes) -> Frame:
    if not HEADER_SIZE + TAG_SIZE + 1 <= len(raw) <= MAX_FRAME_BYTES:
        raise ProtocolError("LENGTH", "Invalid frame length")
    flags, session, length, size, seq = HEADER.unpack_from(raw)
    if len(raw) != HEADER_SIZE + size + TAG_SIZE:
        raise ProtocolError("LENGTH", "Frame length does not match header")
    frame = Frame(session, length, size, seq, raw[HEADER_SIZE:-TAG_SIZE], flags)
    frame.validate()
    if not hmac.compare_digest(raw[-TAG_SIZE:], hashlib.sha256(raw[:-TAG_SIZE]).digest()[:8]):
        raise ProtocolError("CHECKSUM", "Frame checksum mismatch")
    return frame


def encode_frame(frame: Frame) -> str:
    return base45.encode(pack_frame(frame))


def decode_frame(text: str) -> Frame:
    if len(text) > MAX_QR_CHARS:
        raise ProtocolError("LENGTH", "QR text exceeds the frame limit")
    return unpack_frame(base45.decode(text))
