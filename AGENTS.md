# Working on LumenLink

- Read CONTEXT.md and IMPLEMENTATION_PLAN.md; docs/spec/SPEC-v2.md and vectors are the wire contract.
- For continuation, read MODEL_HANDOFF.md and the current summary/latest UPDATE.md entries; verify
  the dated snapshot against Git and preserve any explicit user pause until work is resumed.
- Follow CHECKPOINTS.md: implementation resumed on 2026-10-05 with explicit user approval required
  before each phase/feature checkpoint is committed/pushed or the next checkpoint starts.
- Use separate development and adversarial-testing agents. Both must review the same final change
  and agree all confirmed in-scope issues are resolved before submitting it for user approval.
- Agent agreement is not user approval. After approval, push the reviewed part to the authorized
  remote and record actual delivery/check results; no automatic push while approval is pending.
- After every meaningful change, update UPDATE.md with completed work, actual verification, next
  work and blockers. Keep statuses honest and use dates in Asia/Kolkata.
- Preserve the archived planning inputs. Current documents, not archived drafts, govern behavior.
- Do not bypass physical feasibility gates using simulated or virtual-camera results. Label the
  current build plaintext until the complete security milestone passes.
- Keep Python and TypeScript codecs independent and their conformance tests byte-identical.
- Use the locked Python 3.12 and Node 24 toolchains; run the relevant checks documented in the plan.
- Never commit received files, credentials, node_modules, virtualenvs, generated videos or artifacts.
- The authorized remote is https://github.com/Nagaram-Kridey/QR-transfer.git. Preserve existing history.
