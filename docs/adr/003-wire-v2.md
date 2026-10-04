# ADR 003: Increase the session identifier before implementation

Status: accepted.

The draft v1 used an 8-byte session ID as the future password KDF salt. Use 16 CSPRNG bytes and
increment the wire nibble to 2, preserving the context's format-change invariant. Header overhead
changes from 27 to 35 bytes including the tag; no v1 implementation/data needs migration.

Fix integer lengths, canonical manifests, shared vectors and future key-derivation labels now.
Application version 0.1.0.dev0 is independent of wire version 2. Unsupported future modes fail closed.

Reference: [NIST SP 800-132, salt guidance](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf).
