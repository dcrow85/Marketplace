# Spendability Gate Bypass Drill: spendability_gate_bypass_drill_20260519T181706Z

- Generated: `2026-05-19T18:17:07.536910+00:00`
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

- `create bypass drill trade`: `0xef8b7f2d49bc5854dc32378b868641f1f2ea9758b62cca324a60b6cfe961171d`
- `seller posts bypass drill bond`: `0xad5881e566f0dfa1b5f1b99ee5ffdb6a438592c00f9ff5479f90abd62a983cdd`
- `attach bypass manifest`: `0x7b057fa7d894b5c9d1af8b6a4258e7d730e55f0a204f82ca070860c9ce48782c`
- `commit bypass item fingerprint`: `0xb4729d8153b81b797847fd40344781a188f09ba05d87cef65839c23b1b7ecf08`
- `commit bypass inventory lock`: `0x9d6b2d882600f39ccaa69d216ac58a1df2b7b2a3922b1a15eaad000ec06af004`

## Packets

- `bypass_intent` `0x77ebbb2078b26785783473cd00d2e1c0078fb6d88f1fc4ee01701591b8ac24cb` (marketplace.intent.v0.2, valid)
- `bypass_terms` `0xbf4a6581b328065c9e1b61bf84bf15f687a9bbe610c994e02202b37dee1a9502` (marketplace.escrow_terms.v0.2, valid)
- `bypass_item_fingerprint` `0xa025b3d3116e1b7e8df0728a2007707ad78d0a4fce777ea3172048ca5dad3b09` (marketplace.item_fingerprint.v0.2, valid)
- `bypass_item_manifest` `0x1bfe030bea8c8184eaadf0b44a2fbb3beeeebecb96dc677dc26b138e7e715ce5` (marketplace.evidence_manifest.v0.3, valid)
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
