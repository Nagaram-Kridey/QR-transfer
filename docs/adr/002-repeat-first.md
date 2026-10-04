# ADR 002: Repeat baseline before LT

Status: accepted sequencing; final transport selection pending experiment.

Implement repeated source symbols first to isolate camera feasibility from erasure-code complexity.
Record the delivery channel's losses and total displayed opportunities. Do not claim fountain coding
is present in the demo. The 30-hour LT study and adoption criteria are in PROJECT_PLAN.md.

Consequence: repeat may be slower under burst loss, but a complete reference and measured baseline
exist before adding solver CPU/memory risks. Repeat is the sole fallback; no alternate-code detours.
