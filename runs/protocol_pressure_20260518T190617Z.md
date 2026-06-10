# Protocol Pressure Test: 2026-05-18T19:06:17Z

## Scope

Pressure tested the next hardening layer:

- on-chain signatures for packet hashes that move trade state
- buyer-seller co-signed arbiter replacement
- revoked-arbiter claim recovery
- existing registry, verifier, route, claim, and settlement checks

## Hardening Applied

1. **State-moving packet gates now require actor signatures on-chain.**
   - `createTrade` requires buyer signatures for intent and terms.
   - `attachProof` requires issuer signature.
   - `attachEvidence` requires issuer signature.
   - `commitRoute` requires seller signature.
   - `buyerAccept` requires buyer receipt signature.
   - `openClaim` requires buyer claim signature.
   - `resolveClaim` requires arbiter ruling signature.
   - `cancelBeforeSellerBond` requires buyer reason signature.

2. **Arbiter replacement is now a protocol path.**
   - Buyer and seller must approve the same replacement proposal hash.
   - The replacement arbiter must be active in the registry.
   - A single party cannot unilaterally replace the arbiter.
   - A revoked arbiter cannot resolve a pending claim.

## Foundry Results

Command:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
forge test -vv
```

Result:

```text
30 passed; 0 failed; 0 skipped
```

New pressure coverage:

- wrong signer rejected at packet gate
- buyer/seller can replace revoked arbiter
- single-party replacement cannot resolve
- inactive replacement arbiter rejected
- replacement approval requires approver signature

## Anvil E2E Results

Command:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
python3 script/protocol_e2e.py
```

Latest E2E report:

```text
/Users/che/Marketplace/runs/local_evm_protocol_20260518T190617Z/REPORT.md
```

Result:

```text
happy_path_insured_card: trade 1 -> Settled
new_seller_material_claim: trade 2 -> Settled
revoked_arbiter_replacement: trade 3 -> Settled
```

## Remaining Gaps

- Replacement is buyer-seller consent only; no timeout or emergency panel fallback yet.
- On-chain gates verify packet signer, but not packet schema or semantic contents.
- Duplicate evidence/spam controls are still absent.
- Verifier conflict policy remains metadata rather than enforceable logic.
- Registry governance is still centralized in the local harness.
- ZK fields are reserved, but no proof verifier is wired.
