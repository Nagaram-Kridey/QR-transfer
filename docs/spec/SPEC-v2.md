# LumenLink wire version 2

Status: normative plaintext/uncompressed repeat profile. Application build 0.1.0.dev0.
This supersedes the original unimplemented wire-v1 draft. Future security/compression profiles below
are reserved design decisions, not supported features of the current implementation.

## Frame

All multibyte integers are unsigned and big-endian. QR contents are RFC 9285 Base45 of the complete
binary frame, rendered in QR alphanumeric mode. No prefix, newline, whitespace trimming or case folding.
Checksum is the first 8 bytes of SHA-256(header || symbol); it detects noise, not malicious changes.

| Offset | Bytes | Field |
|---:|---:|---|
| 0 | 1 | High nibble version=2; bit0 encrypted; bit1 compressed; bit2 repeat; bit3 reserved=0 |
| 1 | 16 | CSPRNG session identifier |
| 17 | 4 | Prepared container byte length |
| 21 | 2 | Source symbol size S |
| 23 | 4 | Sequence number |
| 27 | S | Source symbol |
| 27+S | 8 | Checksum (future encrypted mode: authenticated tag) |

Current supported flags are exactly 0x24. Versions other than 2, bit3 and unsupported modes are rejected.
Require exactly 35+S bytes, no trailing data. Experimental repeat-capacity bounds: S=1..1024,
container length=1..5,247,006 and k=ceil(container_len/S) ≤8192. Check framing bounds before
allocating session buffers. Separately reject plaintext containers exceeding 5,246,978 bytes
at final parsing. This October 7 CP-02C expansion changes receiver resource policy, not frame
layout or wire version. Older builds retain the 1 MiB / 2048-symbol limits and reject larger
streams; update both endpoints for the experimental capacity. Existing small vectors are unchanged.

Repeat frame seq contains source symbol seq % k. The final symbol is zero-padded to S; reject
nonzero padding. Trim the reconstructed bytes to the declared container length. Frame seq increases
monotonically to 0xffffffff; do not wrap. Pause/resume keeps the session/sequence. Replaying an
identical prepared stream from seq=0 is legal retransmission. Changed content, manifest, mode or S
requires a new random session. FPS/display changes alone do not.

Session metadata (flags, session ID, length, S) is immutable. Lock one session. Reject conflicting
metadata without resetting it; a user reset explicitly abandons the session. Track duplicates by
source index, at most k entries. Reject conflicting contents for an already accepted index.

## Canonical plaintext container

`u16 manifest_byte_length | UTF-8 manifest_json | original_file_bytes`

Manifest field order is exactly name, mime, size, sha256, created, v. Reject extra, missing or duplicate
keys and noncanonical serialization. JSON has no BOM, whitespace outside strings, or final newline.
Strings contain Unicode scalar values, encoded as UTF-8 without ASCII escaping of non-ASCII characters.
Use ordinary JSON string escapes for quotation mark, backslash and controls; lowercase hex for other
U+0000..U+001F escapes. Do not escape slash. Unpaired surrogates are invalid.

- name and mime: nonempty strings, constrained by total manifest size; MIME is not trusted for execution.
- size: original file byte count, integer 0..5,242,880 inclusive (5 MiB). Empty files are valid.
- sha256: 64 lowercase hexadecimal characters representing the original file digest.
- created: integer Unix seconds, 0..2^53-1, decimal integer spelling (no exponent, -0 or fractional form).
- v: integer 1, the manifest schema version, distinct from the wire/application version.
- Encoded manifest: 1..4096 bytes.

Require the exact declared file size and SHA-256; reject trailing payload bytes. No file/save is exposed
before verification. Filenames on receive are normalized NFC, dangerous/control/format characters
replaced with underscores, leading/trailing spaces/dots removed and capped to 120 Unicode codepoints
and 240 UTF-8 bytes (truncate whole codepoints). This leaves room for a reserved-name prefix/collision suffix.
Prefix Windows reserved names with underscore; use received.bin for empty names. Saves are exclusive
creates with collision suffixes. No auto-open, path traversal or silent overwrites.

## Interface and conformance

Python: prepare_container/open_container; Frame pack/unpack or text encode/decode; Transfer.frame/text;
Receiver.ingest returns a verified ReceivedFile or None, with counters/state. reset explicitly releases
the active session. Browser equivalents have asynchronous hashing and require serialized ingestion;
concurrent ingestion is rejected. Construct a new browser Receiver to reset.

Frame export JSON: {"format":"lumenlink-frames-v2","frames":["BASE45", ...]}. Limit import to
16,000,000 bytes (16 MB) and 8192 text frames of at most 1589 characters. Exports carry one
complete source-symbol cycle. Bound file bytes before parsing and count/text lengths before worker
admission. Count all entries, including entries after an otherwise complete transfer.
Validate every entry's checksum/metadata and reject conflicting symbols at the same source index
before reconstruction can expose a file, including conflicts in trailing entries.
Incomplete imports fail without a save. This file format is a test artifact, not an alternate optical
transport or a field benchmark. Never trim its strings.

Both implementations must reproduce vectors/repeat-v2.json. tools/generate_vectors.py --check
checks Python fixture reproducibility; web's vectors:emit plus tools/verify_ts_vectors.py checks an
independent TS-to-Python path. QR pixel layout and compressor output identity are not wire invariants.

## Reserved security profile — Stage 4, not implemented

- Normalize passphrase NFC, UTF-8, without trimming/case-folding.
- PBKDF2-HMAC-SHA256(passphrase, salt=session ID, iterations=600000, output=32 bytes).
- HKDF-SHA256 on that root key, salt=session ID, labels ASCII LumenLink/v2/aes and
  LumenLink/v2/frame, separately outputting 32-byte encryption/authentication keys.
- AES-256-GCM: 12-byte fresh CSPRNG nonce and full 16-byte authentication tag; serialized as
  nonce || ciphertext || tag. Do not append an API-provided GCM tag a second time.
- AAD is exactly the immutable binary header prefix bytes [0,23): flags, session, length and S.
  Compute the final encrypted length (plaintext length+28) before encryption; sequence is excluded.
- Encrypted frame tag is HMAC-SHA256(frame_key, header || symbol)[0:8]. Authenticate before symbol
  admission. This 64-bit truncated tag has a finite forgery bound; it is not the 128-bit GCM tag.
- Derive once per explicitly selected session. Random untrusted session announcements cannot cause
  repeated KDF work. Fresh content/settings create a fresh session/key/nonce; never nonce-reuse changes.
- Generate six words from a bundled licensed large wordlist using cryptographic randomness; hide
  the phrase during playback and never transmit it as part of the stream.

## Reserved compression profile — Stage 4, not implemented

Compression means zlib-wrapped DEFLATE of file bytes only. Build the manifest around original size/hash;
container is manifest prefix + compressed payload, then optionally encrypt the whole container.
Select compression only if it reduces payload length. Decompress after authentication and manifest
validation, incrementally bounded by min(manifest.size, 5 MiB). Reject excess output, trailing compressed
data, truncation, size/hash mismatch. Different conforming compressors need cross-decoding, not
byte-identical output. Frame bytes are identical for identical *prepared* container/session inputs.

## Future fountain profile

Current non-repeat frames are rejected. The LT distribution, CDF tables, PRNG and neighbor vectors
must be frozen by the bounded experiment before implementing another transport profile. See the
implementation plan; do not silently substitute another RNG/distribution in a decoder.

## Optical defaults

256-byte symbols, ECC M, 8 fps; standard profile maximum 10 fps, reduced mode 2 fps. Quiet zone at
least four modules, integer scaling, black-on-white, minimum two display pixels per module. No rate is guaranteed safe
for photosensitivity. Benchmark density/ECC/hold time on actual devices before changing defaults.

User-authorized browser experiments on October 7 add optional 15/20/30 fps **targets**, requiring
the standard flashing acknowledgement plus a selected-rate experimental acknowledgement. They do
not change wire bytes, default settings or the Python optical 10 fps limit. Record high-rate trials
as exploratory; acceptance cells retain the standard profile. Actual displayed rate and receiver
completion must be measured rather than inferred from the target selector.

## References

- [RFC 9285 Base45](https://www.rfc-editor.org/rfc/rfc9285.html)
- [RFC 8018 PBKDF2](https://www.rfc-editor.org/rfc/rfc8018)
- [RFC 5869 HKDF](https://www.rfc-editor.org/rfc/rfc5869.html)
- [WebCrypto AES-GCM](https://www.w3.org/TR/webcrypto/#aes-gcm)
- [Compression Streams format requirements](https://compression.spec.whatwg.org/)
