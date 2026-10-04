"""RFC 9285. Spaces are data, never whitespace to strip."""

from .errors import ProtocolError

ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:"
VALUES = {char: index for index, char in enumerate(ALPHABET)}


def encode(data: bytes) -> str:
    output: list[str] = []
    for offset in range(0, len(data), 2):
        pair = data[offset : offset + 2]
        value = int.from_bytes(pair, "big")
        digits = 3 if len(pair) == 2 else 2
        for _ in range(digits):
            value, digit = divmod(value, 45)
            output.append(ALPHABET[digit])
    return "".join(output)


def decode(text: str) -> bytes:
    if len(text) % 3 == 1:
        raise ProtocolError("BASE45", "Invalid Base45 group length")
    output = bytearray()
    for offset in range(0, len(text), 3):
        group = text[offset : offset + 3]
        try:
            value = sum(VALUES[char] * 45**index for index, char in enumerate(group))
        except KeyError as exc:
            raise ProtocolError("BASE45", "Invalid Base45 character") from exc
        width = 2 if len(group) == 3 else 1
        if value >= 256**width:
            raise ProtocolError("BASE45", "Base45 group exceeds its byte range")
        output.extend(value.to_bytes(width, "big"))
    return bytes(output)
