# Protocol Pressure: 2026-05-18 19:17 UTC

## Hardening Added

- Per-trade packet replay protection: once a packet hash is anchored, it cannot be reused as another proof, evidence packet, route, claim, receipt, ruling, or cancellation packet.
- Predicate verifier hook: `PrivatePredicateProof` packets can now be accepted only after a registry-approved verifier contract returns true.
- Emergency arbiter handoff: if the current arbiter is inactive during a claim, a one-sided replacement proposal can execute only after a 1-day timeout and a replacement-arbiter signature over the same proposal hash.
- Two-party replacement remains the fast path when buyer and seller co-sign the same proposal.

## Tests

- Foundry: `forge test -vv` -> 39 passed.
- Anvil E2E: `python3 script/protocol_e2e.py` -> 3 settled scenarios.
- Latest E2E report: `/Users/che/Marketplace/runs/local_evm_protocol_20260518T191719Z/REPORT.md`.

## What It Proves Now

- State-moving packets require registered actor signatures.
- Evidence/proof replay is rejected at the escrow layer.
- Predicate proofs have a real on-chain verifier-contract gate, even though the local verifier is still a stub.
- A revoked arbiter cannot resolve a claim.
- A stuck claim has a timeout path that does not require the stalled counterparty to co-sign.

## Still Open

- The emergency replacement path needs richer policy around competing proposals and bad-faith arbiter selection.
- The predicate verifier stub must be replaced with production circuit verifiers before any ZK claim is real.
- Registry ownership is still centralized for the local harness.
- Evidence packet schema semantics are still enforced by agents/verifiers, not by Solidity.
