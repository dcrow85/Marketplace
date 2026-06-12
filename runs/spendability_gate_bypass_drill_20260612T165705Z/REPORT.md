# Spendability Gate Bypass Drill: spendability_gate_bypass_drill_20260612T165705Z

- Generated: `2026-06-12T16:57:07.279201+00:00`
- RPC: `http://127.0.0.1:18546`
- Registry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Contract: `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e`
- Expected current outcome: `bypass_blocked_after_gate_anchor`
- Outcome: `bypass_blocked_after_gate_anchor`
- Passed expectation: `True`
- Final state: `EvidencePending`

## What Happened

The drill created a normal trade, committed an item fingerprint and inventory lock, then called the old `commitRoute` ABI directly with a seller-signed route packet. It intentionally did not create or validate an `EvidenceSpendability` packet.

## Transactions

- `create bypass drill trade`: `0x840b370e7d2cc9edaebbe1d3576d6a0c5a2403750b682fcf3f5febc77c19c853`
- `seller posts bypass drill bond`: `0xcf309a1ede6bae41037691693aa10baf683ea7a78e23d7dcbcdc45b8d0e9188b`
- `attach bypass manifest`: `0xd46578d0820c643651ac3203c1f25dc748fd70b479553bc7af808e4704c1ffd7`
- `commit bypass item fingerprint`: `0x4c4b87b24a79b4f00de91db135d06fe3acb0b82a5cfa32bf6e51a567b988d19a`
- `commit bypass inventory lock`: `0xc24e604e33a498da3f6fae241c074ce66a8089da4e9c068b77e653d1c2d69c58`

## Packets

- `bypass_intent` `0x77ebbb2078b26785783473cd00d2e1c0078fb6d88f1fc4ee01701591b8ac24cb` (marketplace.intent.v0.2, valid)
- `bypass_terms` `0xbf4a6581b328065c9e1b61bf84bf15f687a9bbe610c994e02202b37dee1a9502` (marketplace.escrow_terms.v0.2, valid)
- `bypass_item_fingerprint` `0xa025b3d3116e1b7e8df0728a2007707ad78d0a4fce777ea3172048ca5dad3b09` (marketplace.item_fingerprint.v0.2, valid)
- `bypass_item_manifest` `0xa3ec9d712a78e49b4342932c02bdca4c84ddd61048c7f74761eeb64ddd3a8b8b` (marketplace.evidence_manifest.v0.3, valid)
- `bypass_inventory_lock` `0x1d04d93dbe2806200b2cb317d6fd11c9c43486c186c5b482409e8ab1c6a8125d` (marketplace.inventory_lock.v0.2, valid)
- `bypass_route_without_spendability` `0xde5fbdb37667d0e84910d7d3278f8e931217100a252f172491d389a91421edda` (marketplace.trade_route.v0.2, valid)

## Observations

- direct commitRoute without spendability reverted as expected.
- No EvidenceSpendability packet was created.
- No validate_spendability_gate call was made before commitRoute.
- The contract rejected the old no-spendability route call and left the trade in EvidencePending.

## What This Proves

- Solidity route commitment now requires a spendability packet hash.
- Stale callers using the old no-spendability ABI fail closed.
- Off-chain validation still decides whether the cited spendability packet is meaningful, but the EVM now requires the citation before a route can lock.

## Remaining Hardening

A later Solidity helper can validate the full EvidenceSpendability schema or a typed hash, but this drill now enforces the first hard boundary: no spendability citation, no route commitment.
