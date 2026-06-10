# Spendability Gate Bypass Drill: spendability_gate_bypass_drill_20260519T180645Z

- Generated: `2026-05-19T18:06:47.001389+00:00`
- RPC: `http://127.0.0.1:18546`
- Registry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Contract: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Expected current outcome: `bypass_succeeds_current_gap`
- Outcome: `route_committed_without_spendability`
- Passed expectation: `True`
- Final state: `RouteLocked`

## What Happened

The drill created a normal trade, committed an item fingerprint and inventory lock, then called `commitRoute` directly with a seller-signed route packet. It intentionally did not create or validate an `EvidenceSpendability` packet.

## Transactions

- `create bypass drill trade`: `0x3a8a334391c3532c03853a8cf026c8f022b88538dcca477d3ca956143b0f9e18`
- `seller posts bypass drill bond`: `0x1def8515db7f0228e0fd4563906cea1d6b64a1aed114ea6be89c8306df7f5cb9`
- `attach bypass manifest`: `0xf8b90564a71f89411db1057e09dafabe1d0aac7738f919aacf90632571fb1414`
- `commit bypass item fingerprint`: `0xbd6138b1fc4542d5fe2e4f11263bc9e8c6ed4e0aead0a3b7b8a126e3593926e4`
- `commit bypass inventory lock`: `0x6badfb8a219a675c8abb3081b1700be258c592117eae33765209e6e5e87d6e5a`
- `direct commitRoute without spendability`: `0xb6f0b19786f66e47daafc6c42b74579ade649c90dd18eefb3dc9ece875629e19`

## Packets

- `bypass_intent` `0x77ebbb2078b26785783473cd00d2e1c0078fb6d88f1fc4ee01701591b8ac24cb` (marketplace.intent.v0.2, valid)
- `bypass_terms` `0xbf4a6581b328065c9e1b61bf84bf15f687a9bbe610c994e02202b37dee1a9502` (marketplace.escrow_terms.v0.2, valid)
- `bypass_item_fingerprint` `0xa025b3d3116e1b7e8df0728a2007707ad78d0a4fce777ea3172048ca5dad3b09` (marketplace.item_fingerprint.v0.2, valid)
- `bypass_item_manifest` `0x800e2370172178bffa67ef4f59d45e5c99e9124a51f092218a3b59d7e258c0fb` (marketplace.evidence_manifest.v0.3, valid)
- `bypass_inventory_lock` `0x1d04d93dbe2806200b2cb317d6fd11c9c43486c186c5b482409e8ab1c6a8125d` (marketplace.inventory_lock.v0.2, valid)
- `bypass_route_without_spendability` `0x612369ddfb2c23ecfc37c6f0ac60cfd5a5b6eefe109404575862691e499aa6d1` (marketplace.trade_route.v0.2, valid)

## Observations

- No EvidenceSpendability packet was created.
- No validate_spendability_gate call was made before commitRoute.
- The contract accepted the seller-signed route packet and advanced state to RouteLocked.

## What This Proves

- Current Solidity route commitment does not require a spendability packet hash.
- The Python E2E runner can provide off-chain admission control, but the contract cannot yet distinguish a routed call that cited spendability from one that skipped it.
- This is the exact gap a light `spendabilityHash` parameter/event should close.

## Expected Flip After Hardening

After a Solidity spendability anchor lands, this direct route commit should either revert without a spendability hash or emit a missing/zero spendability citation that fails post-hoc verification.
