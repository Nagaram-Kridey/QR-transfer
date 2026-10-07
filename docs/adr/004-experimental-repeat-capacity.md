# ADR 004: bounded experimental repeat capacity

Date: 2026-10-07 (Asia/Kolkata). Status: CP-02C locally verified and reviewed, awaiting user approval.

The user requested a larger transferable file size after supplying one successful observation for
879,942 bytes. The implementation previously limited original bytes to 1 MiB and repeat symbols to
2048. Increasing only the file limit would leave larger files unsendable or fail frame imports.

Choose a 5 MiB (5,242,880-byte) experimental maximum, 8192 repeat source symbols, and a 16,000,000-byte
frame-import maximum. Manifest and symbol limits remain 4096 and 1024 bytes. Maximum framed container
length is 5,247,006 bytes, including the existing 28-byte reserved encryption overhead; the supported
plaintext container maximum is 5,246,978 bytes. Validate lengths and symbol count before session
admission; preserve one session, bounded duplicate storage, verified saving and plaintext labeling.

The frame layout, flags, big-endian widths, canonical serialization, checksum and wire version remain
v2. This is an expanded receiver resource policy, not a changed byte format. Existing small shared
vectors must remain byte-identical. Older receivers can still read streams within their limits and
will reject streams exceeding their old capacity; update both endpoints for larger transfers.
This includes a file at or below 1 MiB encoded into more than 2048 smaller symbols: file size
alone does not determine backward compatibility.

Browser preparation and the default Python CLI choose a supported symbol size that fits the prepared
container. Explicit undersized CLI settings fail with guidance. At 5 MiB, 1024-byte symbols are needed;
manifest overhead must be counted. Import byte and count caps must cover a complete exported cycle.

Large files above 1 MiB are exploratory; the original benchmark acceptance profile and future
fountain study retain their existing boundaries. No larger CDF asset or new transport is authorized.
The expanded limit establishes software capacity only. Physical reliability, faster transfers,
security and offline installation remain unqualified. CP-02C requires separate developer/tester
agreement and user approval before commit/push and Pages deployment.
