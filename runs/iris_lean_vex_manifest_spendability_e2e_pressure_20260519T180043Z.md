---
source_aperture: iris
ingested_aperture: lean-vex
runtime_receipt: lean_vex_20260519T180043Z_37057
authority_effect: candidate_pressure
promotion_status: not_promoted
raw_return: /Users/che/Marketplace/runs/lean_vex_manifest_spendability_e2e_pressure_20260519T180043Z.md
prompt_file: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/inbox/iris_to_vex/2026-05-19_iris-to-lean-vex_marketplace_manifest_spendability_e2e_pressure.md
---

# Iris Read: Manifest + Spendability E2E LeanVEX Pressure

## Human Summary

LeanVEX accepts the conceptual spine as sound: manifest is durable memory, spendability is local permission, and the separation is real hardening. The pressure lands on authority language and coverage integrity. We should stop implying contract-level spendability enforcement until the contract records or requires a spendability hash.

## Findings

1. The strongest objection is contract bypass.

The Python E2E runner checks `validate_spendability_gate` before sending state-moving transactions, but Solidity currently sees only packet hashes/signatures. A direct `cast send commitRoute(...)` can bypass the off-chain spendability check if existing contract state/signature preconditions are satisfied.

2. The v0.2/v0.3 manifest split is now the coverage hole.

The standalone manifest drill passes against `marketplace.evidence_manifest.v0.2`. The E2E path now uses `marketplace.evidence_manifest.v0.3` with local packet-envelope hashing. The v0.2 drill remains valuable, but it does not prove the exact v0.3 path.

3. `authority_hash` is not doing enough work.

It is currently derived from actor id and role text, not from a registry/delegation/assignment record. The validator checks a hardcoded role map, but not an actual authority record hash.

4. Single-use spendability is not persistent.

The consumed set exists inside a Python run. It does not survive restarts and is not shared by other runners or contracts.

## Useful Hardening Credit

- Manifest-versus-permission is now structural, not merely prose.
- Subject hash recomputation is checked in the E2E v0.3 path.
- Gate policy is table-driven by gate type, leg, authority, claim type, and consumption mode.
- The forward/return distinction is represented in spendability policy.
- Revocation works in the standalone spendability drill.

## Recommended Next Move

Do two small falsifiers before a larger Solidity design:

1. On-chain bypass drill:
   run the local stack, create a trade, then call `commitRoute` directly without invoking `validate_spendability_gate`. If it lands, label the current spendability as "off-chain admission control", not "protocol gate".

2. v0.3 manifest falsifier drill:
   extract the E2E v0.3 manifest builder/validator into a standalone drill and repeat byte-switch, role-inflation, tier-inflation, and asset-root mismatch against the actual v0.3 code path.

After those, add the lightest contract anchor: require or record a `spendabilityHash` on state-moving calls and emit `SpendabilityConsumed(tradeId, spendabilityHash)`. Full on-chain spendability validation can come later.

## What Iris Should Not Infer

- Do not infer that settled E2E scenarios prove contract-enforced spendability.
- Do not infer that v0.2 manifest falsifiers cover v0.3 manifest code.
- Do not infer that `authority_hash` is registry-backed yet.
- Do not infer that in-memory consumed-set logic prevents replay across processes.
- Do not infer that subject hashes uniquely identify a physical card; they bind memory to an anchor, not reality itself.
