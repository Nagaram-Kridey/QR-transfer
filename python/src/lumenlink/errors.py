class ProtocolError(ValueError):
    """A bounded, expected rejection of untrusted protocol input."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        super().__init__(message)
