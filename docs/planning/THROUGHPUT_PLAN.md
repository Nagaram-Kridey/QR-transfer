# Verified-throughput debate and investigation plan

Date: 2026-10-08, Asia/Kolkata. Status: development/adversarial debate agreed; local CP-02D
documentation, awaiting final same-revision review and user approval. Future experiments below
are planned, not implemented or automatically authorised. Adding this plan does not make it the
sole workstream or replace physical feasibility, PWA, security or release work.

## Objective and evidence

Minimise elapsed time to **verified original file bytes**, including acquisition, recovery,
feedback interruptions and final verification. Primary throughput is original KiB / total seconds.
Increasing file capacity or target FPS alone establishes no speed improvement.

The [supplied October 7 report](../benchmarks/2026-10-07-observation-review.md) records 879,942 bytes
in 864.4303 seconds (0.994086 KiB/s), 860 recovered symbols, 4800 duplicates, three rejected frames
and 8977 full-frame attempts. It contains no ROI comparison or complete sender/camera timeline.
84.76% of decoded frames were duplicates; only 9.58% of scan attempts admitted a unique symbol.
These fractions describe one report, not the cause of delay or a population success rate.
Capture averaged 52.79 ms; readback 7.47 ms; worker round-trip 24.61 ms, including decode 22.50 ms.
Do not sum worker round-trip and decoder/admission as independent costs. The latest 256 records
cannot establish whole-session timing percentiles or a complete repeat-tail diagnosis.

Reasoning model: `useful symbol bytes * newly recovered symbols / total elapsed time`, adjusted
for manifest/padding and optional compression. Larger symbols may lower decode success; a faster
sampler may reread the same displayed QR. Capture frequency is not fresh source/display frequency.
At assumed 8 fps and 1024-byte symbols, one 860-symbol cycle needs at least 107.5 seconds; this is
an illustration only because the supplied trial's sender FPS is unknown. It cannot prove an
eightfold achievable improvement. The 35-byte frame overhead is 12.0% at S=256 and 3.3% at S=1024
of binary frame bytes; reducing headers alone cannot explain the observed repeat overhead.

## Debate and decisions

| Hypothesis | Development case | Adversarial objection | Agreed decision |
|---|---|---|---|
| More useful bytes per symbol | 512/1024-byte symbols carry more original bytes per successful decode. | More modules at fixed display size can erase that gain through lost reads. | Measure symbol density, angular size and verified completion together. |
| Faster capture/ROI | Capture is the largest measured stage; fewer pixels/copies may help. | Capture/readback scaling is unknown; portrait downscaling can destroy detail, and more attempts can just duplicate the stream. | Diagnose fresh-frame opportunities first; keep current ROI physical decision separate. |
| Hold/render timing | Avoid repeated reads and short unreadable exposures. | Target FPS and canvas draws do not establish actual optical exposure; camera/display aliasing matters. | Measure timelines using public fixtures; optimise useful admissions, not a counter. |
| Compression | Fewer encoded bytes can reduce total source symbols. | Already-compressed media may not shrink; CPU/memory and decompression attacks can dominate. | Retain bounded zlib cross-decoding in complete Stage 4; no premature compression shipping. |
| Missing-frame feedback | Send only missing indices near the end rather than full cycles. | Reverse-camera geometry, human pause latency, stale/forged requests and request overhead may cost more than the saved tail. | Plan manual reverse feedback feasibility before automatic duplex; separate approval/schema/security gates. |
| Deterministic interleaving | Change repeat presentation order to challenge periodic losses without a return channel. | A stable order can alias again, random choices cannot promise missing symbols, and seq determines index. | Optional bounded scheduling study with explicit sequences, reproducible vectors and repeat control; no present change. |
| LT repair symbols | New equations can reduce waste when many source symbols are already present. | Coding overhead/CPU may lose; existing 5 MiB repeat capacity does not automatically expand the frozen LT table study. | Keep original Stage 5 budget/adoption criteria and scope; repeat fallback. |
| Multiple simultaneous QR codes | More symbols per image could increase payload throughput. | Current decoder returns at most one QR; each QR gets less area and persistent decoys already defeat single-target selection. | Defer isolated experiment; no sampler/decoder redesign in the visual fix. |
| Binary QR or shorter headers | Reduce transport representation overhead. | Wire/text compatibility and scanner APIs change, with small theoretical gains versus present duplication. | Defer protocol study; preserve Base45/wire v2 and old vectors now. |

Development and adversarial testing explicitly agreed to these decisions before source edits.
Neither agent claims that a particular speed gain is proven. Root owns sequencing and evidence;
confirmed in-scope issues must be resolved by both before any checkpoint is submitted for approval.

## Ordered work packages and existing priorities

1. **CP-02D, current request:** finish this debate/plan and dark framing in both UI views. Preserve
   quiet zones, original QR pixels, admitted-region coordinates and receiver capture/scheduler.
   This is a visibility repair, not a measured detection or throughput gain. Review and approval stop.
2. **Physical CP-02/G2 and CP-02B.3:** collect known 10/100 KiB trials, all failures and frozen
   Windows/Android settings. Compare existing Full frame/Auto region independently of new speed
   ideas. Resolve actual laptop/camera/browser identity. Larger-file trials remain exploratory.
3. **Proposed CP-02E measurement experiment, separate approval:** instrument fresh video/display
   opportunities, acquisition, first systematic-cycle coverage and missing-symbol tail on public
   fixtures. Preserve bounded diagnostics/privacy and observation-v1. Compare density/hold/display
   size first, then capture/copy/ROI options only where timing gives plausible headroom. One changed
   variable per controlled comparison; no more FPS levels needed to establish useful throughput.
4. **Existing portfolio/browser/PWA work:** continue in the existing implementation sequence after
   G2. The speed backlog does not postpone the offline workflow, actual phone checks or portfolio
   documentation merely because the ideas are listed here.
5. **Stage 4:** compression on file bytes only, authenticated/bounded receiving and cross-language
   tests as already planned. Compare compressible and incompressible fixtures including CPU cost;
   choose compression only when useful. No secret-transfer claim before the full security gate.
6. **Proposed feedback feasibility study:** separately approve a plan/prototype only after baseline
   physical evidence. Its first deliverable is hardware geometry and feedback-latency evidence,
   not a shipping duplex protocol. See the contract below. It can be scheduled as a bounded optional
   experiment; it does not block PWA/security work or silently enter v1.
7. **Stage 5:** perform the existing time-boxed LT comparison; retain repeat when inconclusive.
   Consider multi-QR/binary-format studies only after explicit scope/protocol decisions, outside
   this checkpoint and without automatic budget expansion.

## Receiver-to-sender feedback feasibility contract (not implemented)

Start with manual missing-frame feedback at a checkpoint: receiver remains paused with its verified
session state, displays or exports a bounded missing-index request; sender operator imports/scans
it, retains the same container/session/S and prioritises those source indices. Manually scanning
a reverse QR may require moving/turning the phone and suspending forward video; preserve received
symbols and account for switching/re-alignment time. Do not read feedback codes with the data-frame
decoder or treat them as wire-v2 payloads.

Automatic duplex follows only if both cameras and displays can face the required directions and
simultaneous capture/display are usable. The existing phone receiver prefers an environment-facing
camera; its screen generally faces the opposite side. A front-camera alternative changes optics
and must be tested, not assumed interchangeable. No Internet, backend, WebRTC signalling service,
Bluetooth/native permission stack or account is introduced by this plan. A network mode would be
a separately chosen product scope, rather than an invisible fallback for optical transfer.

The return-channel schema needs its own version and conformance fixtures. Before a prototype,
freeze: transfer session and immutable prepared-container identity, k/S, snapshot counter,
bounded valid lifetime, bounded unique indices/ranges or paginated bitmap, page count/assembly
limits and replay/conflict handling. Sender validates all bounds before allocation; one request
snapshot is active, cancel/reset invalidates it, stale/mixed-session pages are rejected. Proposed
upper bound remains k<=8192 for current repeat sessions; an uncompressed bitmap is already 1024
bytes at that k, so do not assume feedback fits a tiny QR. Cap ranges/pages/request bytes in the
future schema before implementation. Sequence selects `seq % k`; targeting an index must use
legal monotonic sequences or an explicitly specified legal retransmission scheme, never mutate
the prepared session metadata or wrap the sequence counter. Define exhaustion handling too.

Feedback is advisory under current plaintext checksums. A forged request can force wasted frames
or claim nothing is missing; it must not auto-delete a file, report authenticated receiver success
or stop systematic opportunities. Give each request a finite priority budget and continue periodic
full source cycles so stale/adversarial feedback cannot starve recovery. Final receiver size/hash
verification is mandatory. A future authenticated feedback design needs its own domain-separated
key/message labels and replay analysis in the complete security profile; do not reuse frame tags
or transmitted passphrases ad hoc. Neither plaintext session IDs nor hashes authenticate feedback.

Break-even model for the remaining tail only: `feedback acquisition + camera switching + request
handling + recovery + verification < control's remaining verified-completion time`. Include every
request attempt, lost/stale feedback, timeout/cancellation and failed forward trial. Whole-session
median/p95 improvement is required for adoption; hypothetical tail savings alone do not qualify.

## Measurement/adoption checks

Predeclare public payload, exact build/OS/browser/hardware, symbol size, ECC, displayed angular
size, FPS/hold, distance, lighting, movement, timing start/stop and reverse workflow. Keep matched
20-trial cells per mode/direction/condition and balance order; freeze settings after exploration.
Use existing timeout and outcome rules and keep all failures. Report original bytes, encoded bytes,
unique admissions, duplicates, stage work, resource bounds, successful-only median/p95 and every
outcome separately. Never pool payloads or opposite directions or substitute virtual cameras for
phones. Preserve the original G2 thresholds and the separate ROI/LT adoption criteria.

A new generic throughput candidate should justify at least 15% better whole-session median with
no observed success decrease, at least 18/20 each arm, at most 10% worse p95 and acceptable CPU,
memory, responsiveness and interoperability; obtain approval for the exact predeclared contract.
The 256-record diagnostic ring is not the dataset for session percentiles. Stop/defer any study
without headroom or within its agreed budget rather than extending it automatically. No such
candidate is measured or adopted at this checkpoint.

## Primary sources and source boundaries

- [DENSO quiet-zone guidance](https://www.qrcode.com/en/howto/code.html): four clear modules around
  the symbol; the sender's dark box must lie outside that area.
- [DENSO error correction](https://www.qrcode.com/en/about/error_correction.html): capacity/error
  correction trade-off; its codeword percentages are not optical success guarantees.
- [zlib format, RFC 1950](https://www.rfc-editor.org/rfc/rfc1950.html): interoperable compression
  representation, not a promise about compression ratio or phone performance.
- [W3C camera facing constraints](https://www.w3.org/TR/mediacapture-streams/#dom-mediatrackconstraintset-facingmode):
  facing selection semantics, not proof that a particular device supports a useful duplex layout.
- [ZXing WASM project](https://github.com/Sec-ant/zxing-wasm): installed local worker settings
  are the implementation evidence for the current single-result path.

Quantitative workload claims above come from the supplied local report; proposed gains and
break-even models are assumptions. None of the external sources establishes LumenLink phone speed.
