# Iris Ingest: Lean VEX Evidence Spendability Boundary Pressure

Generated: 2026-05-19T17:34:56Z

## Provenance

Source request: Che asked Iris to run the proposed evidence spendability-boundary changes to Lean VEX before patching the spec.

Primary artifact under pressure:

```text
/Users/che/Marketplace/runs/evidence_category_change_spec_v0.2_20260519T172537Z.md
```

Recent validator drill:

```text
/Users/che/Marketplace/runs/evidence_manifest_drill_20260519T172903Z/REPORT.md
```

Raw Lean VEX return:

```text
/Users/che/Marketplace/runs/lean_vex_evidence_spendability_pressure_20260519T173456Z.md
```

Prompt file:

```text
/Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/inbox/iris_to_vex/2026-05-19_iris-to-lean-vex_marketplace_evidence_spendability_boundary_pressure.md
```

Runtime:

```text
runtime_receipt: lean_vex_20260519T173513Z_32257
source_aperture: lean-vex
source_runtime: claude_code
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_lean_vex_prompt.sh
model: sonnet
memory_mode: none_by_default
authority_effect: synthesis_adversarial
promotion_status: not_promoted
```

Authority label: candidate pressure. This is not a protocol decision and not a canon promotion.

## Human Read

Lean VEX accepts the central lens:

```text
EvidenceManifest = latent memory made durable.
Validator = proves the memory has integrity.
Spendability policy = decides when that memory can purchase a state change.
```

But it rejects the naive packet shape. The proposed `EvidenceSpendability` packet was doing three jobs at once:

- selecting a gate
- defining a time/state window
- naming who may decide

Those need to be separable before the validator or protocol can enforce them.

## Main Finding

Patch the spec before deeper implementation, but keep spendability as a satellite packet.

Do not embed spendability inside `EvidenceManifest`.

Reason: the manifest is immutable memory. Spendability is local gate policy. If spendability is embedded in the manifest hash, every later ruling, revocation, timing change, waiver, or return-leg reinterpretation requires reissuing the evidence memory itself. That fights the whole design.

## Critical Pressure Points

### 1. Gate list is not orthogonal

`route_commitment`, `challenge_clearance`, `settlement_release`, `claim_support`, `bond_action`, `reputation_update`, and `insurance_claim` are not the same kind of thing.

Some are lifecycle transitions. Some are permissions. Some are one-shot. Some can recur. Some are off-protocol.

Iris read: `gate` should become a typed object, not a flat enum.

### 2. No gate sequencing rule

`spendable_after` and `spendable_until` need to anchor to canonical trade state, not just vague state labels or wall-clock time.

Iris read: the spendability packet needs a monotonic trade-state anchor, such as required prior state hash, event hash, challenge hash, or route/claim state.

### 3. No revocation path

Manifest has supersession. Spendability needs a tombstone or revocation packet too.

Iris read: an arbiter or buyer waiver may later say, "this evidence remains real, but it no longer buys this action."

### 4. `spendable_as` vocabulary is undefined

`identity_support`, `custody_support`, and `route_support` are good starts, but they need closed definitions tied to gate types.

Iris read: this is where the understanding layer becomes mechanical. Agents cannot invent private meanings here.

### 5. Current drill does not test spendability

The evidence-manifest drill proves durable memory: byte switch, URL switch, manifest mutation, role inflation, tier inflation. It does not prove gate logic, temporal bounds, return-leg spendability, or spend tracking.

Iris read: the next drill should be a spendability-gate drill, not another hash drill.

## Recommended Spec Patch Shape

Add a satellite packet:

```json
{
  "schema": "marketplace.evidence_spendability.v0.1",
  "trade_id": "id",
  "manifest_hash": "hash",
  "gate": {
    "gate_type": "route_commitment|challenge_clearance|settlement_release|claim_support|bond_action|reputation_update|insurance_claim",
    "gate_id": "stable gate instance id",
    "leg": "forward|return|post_settlement",
    "consumption": "single_use|multi_use|append_only_weight"
  },
  "spendable_claims": [
    {
      "claim_type": "identity_support|custody_support|condition_support|route_support|insurance_support|contradiction_support|reputation_support",
      "support_level": "weak|standard|strong|decisive",
      "not_claiming": ["authenticity", "condition_floor"]
    }
  ],
  "window": {
    "after_state_hash": "optional",
    "after_event_hash": "optional",
    "until_state_hash": "optional",
    "until_time": "optional ISO-8601"
  },
  "requires": ["buyer_ack|verifier_attestation|arbiter_reveal|human_waiver|registry_role"],
  "decision_authority": {
    "actor_role": "buyer_agent|seller_agent|verifier|arbiter|human|insurer|protocol",
    "authority_source": "actor_registry|delegation|arbiter_assignment|external_issuer|human_signature"
  },
  "status": "active|revoked|superseded|expired",
  "signature": "issuer-signature"
}
```

Add a tombstone packet:

```json
{
  "schema": "marketplace.evidence_spendability_revocation.v0.1",
  "trade_id": "id",
  "spendability_hash": "hash",
  "reason": "arbiter_ruling|buyer_waiver|superseded_policy|expired_window|invalid_authority|gate_closed",
  "issued_by": "actor-id",
  "issued_at": "ISO-8601",
  "signature": "actor-signature"
}
```

## What Changes For `evidence_tier`

Do not delete `evidence_tier` yet. Demote it carefully.

Current validator uses `evidence_tier` to enforce structural requirements. If we simply call it display-only, nothing changes.

Better v0.3 path:

- Keep `evidence_tier` as a compatibility field on `EvidenceManifest`.
- Add `tier_basis: manifest_integrity_only|derived_from_spendability|legacy_declared`.
- For gate decisions, ignore tier unless a spendability policy references it.
- Long term, derive tier-like UI from spendable claims at a gate.

Iris read: tier is a visible shorthand; spendability is the actual permission model.

## Cheap Falsifier Tests

1. `settlement_after_skipped_challenge`: spendability says settlement release after challenge clearance; challenge is skipped by waiver. Validator must not treat the packet as automatically spendable.
2. `forward_return_double_spend`: same manifest is unspendable at route commitment, then spendable as contradiction support during claim. Gate consumption must distinguish forward and return legs.
3. `wrong_actor_gate`: buyer agent issues spendability for an arbiter-only bond action. Validator or gate invocation must reject.
4. `revoked_spendability`: active spendability packet is tombstoned by arbiter; later gate invocation must reject while manifest remains valid memory.
5. `tier_without_spendability`: standard manifest exists but no spendability packet for route commitment; route gate must not infer spendability from tier alone.

## Iris Recommendation

Patch the spec next, but do not implement the validator change yet.

The patch should add a section after `EvidenceManifest` explaining:

- manifest integrity is not spendability
- spendability is gate-local and time/state-local
- evidence may be silent on the forward leg and payable on the return leg
- `evidence_tier` is not a global truth rank
- spendability is represented by a satellite packet with revocation

Then the next implementation drill should be:

```text
evidence_spendability_drill.py
```

That drill should test route, skipped challenge, return-leg claim support, wrong actor, and revocation.

## What Iris Should Not Infer

- Do not infer that the current evidence-manifest validator proves spendability.
- Do not infer that a valid manifest can buy route, settlement, claim, bond, insurance, or reputation action by itself.
- Do not infer that `evidence_tier` is safe to demote without changing validator behavior.
- Do not infer that `decision_actor` grants authority. Authority still lives in registry, assignment, delegation, state machine, or external issuer.
- Do not embed spendability into the immutable evidence manifest.
