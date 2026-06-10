# Protocol Pressure Test: 2026-05-18T18:52:42Z

## Scope

Pressure tested the executable local protocol harness:

- `MarketplaceActorRegistry`
- `MarketplaceEscrow`
- signed packet verification in the Anvil E2E runner
- clean settlement and new-seller claim settlement paths

## Hardening Applied

Two issues were tightened during the pressure pass:

1. **Revoked arbiters could still resolve existing claims.**
   - Patch: `onlyArbiter` now also checks `actorRegistry.isArbiterActive(msg.sender)`.
   - Result: safer money movement, but it exposes the need for an arbiter replacement path.

2. **A route could set `insured = true` while declaring zero coverage.**
   - Patch: `commitRoute` rejects insured routes with `declaredInsurance == 0`.
   - Result: the contract now blocks the most obvious hidden-underinsurance contradiction.

## Foundry Pressure Results

Command:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
forge test -vv
```

Result:

```text
25 passed; 0 failed; 0 skipped
```

Covered pressure areas:

- actor signature verification
- tampered payload rejection
- revoked actor signature invalidation
- unknown buyer rejection
- unknown seller rejection
- revoked seller rejection
- unknown arbiter rejection
- revoked arbiter rejection at trade creation
- revoked arbiter rejection at claim resolution
- registry owner-only registration/revocation
- underfunded seller bond rejection
- route mutation rejection
- insured route zero-coverage rejection
- stranger evidence rejection
- revoked verifier evidence rejection
- registered verifier evidence acceptance
- late claim rejection
- auto-settlement blocked while claim is pending
- non-arbiter claim resolution rejection
- post-settlement proof rejection
- clean close payout
- claim payout with seller-bond penalty and dispute-bond return

## Anvil E2E Results

Command:

```bash
source ~/.zshenv
cd /Users/che/Marketplace/chain
python3 script/protocol_e2e.py
```

Latest E2E report:

```text
/Users/che/Marketplace/runs/local_evm_protocol_20260518T185242Z/REPORT.md
```

Result:

```text
happy_path_insured_card: trade 1 -> Settled
new_seller_material_claim: trade 2 -> Settled
```

The E2E still carries:

- registry setup packets
- signed ActorRecords
- verifier and arbiter authority records
- signed intents and escrow terms
- private predicate proofs
- circuit profile hook
- evidence packets
- route packets
- claim and ruling packets

## Coverage Attempt

`forge coverage --report summary` hit Solidity stack-depth limits.
`forge coverage --ir-minimum --report summary` also failed inside Yul lowering.

This is a tooling/reporting gap, not a failing protocol behavior. The current pressure signal is from executable unit tests plus live Anvil E2E.

## Remaining Gaps

- **Arbiter replacement:** if an arbiter is revoked mid-claim, resolution is now blocked. That is safer than allowing revoked authority to move money, but the protocol needs replacement/appeal mechanics.
- **On-chain signature enforcement:** packets are signed and verified in the E2E runner, but `MarketplaceEscrow` only anchors hashes. A stricter path would add signed attach methods or release gates that verify signatures on-chain.
- **Duplicate/spam evidence:** repeated packet hashes are not deduplicated or priced on-chain.
- **Underinsurance semantics:** the contract now rejects zero declared coverage for insured routes, but it does not compare coverage to escrow value or accepted risk gaps.
- **Verifier conflicts:** verifiers are registered and revocable, but conflict policy is still off-chain metadata.
- **Registry governance:** registry owner power is centralized in the local harness.
- **ZK:** private predicate and circuit profile hooks exist, but no proof verifier runs on-chain yet.
- **Agent negotiation:** no live buyer-agent/seller-agent negotiation loop is connected to the EVM harness yet.
