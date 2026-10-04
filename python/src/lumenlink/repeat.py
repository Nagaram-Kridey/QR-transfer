"""Repeat transport with one bounded, explicitly resettable receive session."""

import secrets
from dataclasses import dataclass, field

from .container import ReceivedFile, open_container
from .errors import ProtocolError
from .frame import Frame, decode_frame, encode_frame


@dataclass(frozen=True, slots=True)
class Transfer:
    container: bytes
    symbol_size: int = 256
    session_id: bytes = field(default_factory=lambda: secrets.token_bytes(16))

    def __post_init__(self) -> None:
        self.frame(0).validate()

    @property
    def k(self) -> int:
        return (len(self.container) + self.symbol_size - 1) // self.symbol_size

    def frame(self, seq: int) -> Frame:
        # Validate the divisors before using them, including on direct library calls.
        if not 1 <= self.symbol_size <= 1024 or not self.container:
            raise ProtocolError("SYMBOL_SIZE", "Invalid symbol size or empty container")
        offset = (seq % self.k) * self.symbol_size
        symbol = self.container[offset : offset + self.symbol_size].ljust(self.symbol_size, b"\0")
        result = Frame(self.session_id, len(self.container), self.symbol_size, seq, symbol)
        result.validate()
        return result

    def text(self, seq: int) -> str:
        return encode_frame(self.frame(seq))


class Receiver:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.metadata: tuple[int, bytes, int, int] | None = None
        self.symbols: dict[int, bytes] = {}
        self.seen = 0
        self.rejected = 0
        self.duplicates = 0
        self.total = 0
        self.state = "IDLE"
        self.result: ReceivedFile | None = None

    def ingest(self, text: str) -> ReceivedFile | None:
        if self.state == "FAILED":
            raise ProtocolError("STATE", "Reset the failed receiver before retrying")
        if self.state == "DONE":
            return self.result
        self.seen += 1
        try:
            frame = decode_frame(text)
            if self.metadata is not None and frame.metadata != self.metadata:
                raise ProtocolError("SESSION_MISMATCH", "Reset to accept a different session")
            if self.metadata is None:
                self.metadata = frame.metadata
                self.total = frame.k
                self.state = "RECEIVING"
            index = frame.seq % frame.k
            previous = self.symbols.get(index)
            if previous is not None:
                if previous != frame.symbol:
                    raise ProtocolError("SYMBOL_CONFLICT", "Conflicting duplicate symbol")
                self.duplicates += 1
                return None
            self.symbols[index] = frame.symbol
            if len(self.symbols) == self.total:
                self.state = "VERIFYING"
                raw = b"".join(self.symbols[i] for i in range(self.total))[: frame.container_len]
                try:
                    self.result = open_container(raw)
                except ProtocolError:
                    self.state = "FAILED"
                    self.symbols.clear()
                    raise
                self.state = "DONE"
                self.symbols.clear()
                return self.result
        except ProtocolError:
            self.rejected += 1
            raise
        return None

    @property
    def recovered(self) -> int:
        return self.total if self.state == "DONE" else len(self.symbols)
