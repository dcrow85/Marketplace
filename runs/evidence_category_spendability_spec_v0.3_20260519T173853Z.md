# Evidence Category And Spendability Spec v0.3

Generated: 2026-05-19T17:38:53Z

Status: candidate spec rework. This patches the v0.2 evidence-category design with the spendability-boundary lens. It does not change Solidity and does not yet change the Python validator.

## Core Frame

Latent structure becomes admissible action only at a local gate.

Evidence is not where a thing becomes real. Evidence is where a memory becomes durable. Validation is where that memory becomes integrity-checked. Understanding is where that memory is interpreted through a buyer, seller, verifier, arbiter, insurer, route, value band, and time window. Spendability is where that interpreted memory receives permission to purchase a state change.

The stack is:

```text
EvidenceManifest  -> durable memory
Validator         -> integrity of memory
Understanding     -> scoped interpretation of memory
Spendability      -> local permission to act
Settlement        -> execution of the permitted change
```

This replaces the dangerous shortcut:

```text
valid evidence -> valid action
```

with:

```text
valid evidence -> possible memory
possible memory + context -> possible interpretation
interpretation + gate policy -> spendable action
```

## Version Delta From v0.2

v0.2 made evidence bytes and manifests deterministic.

v0.3 keeps those rules and adds the permission model:

- `EvidenceManifest` is immutable memory, not permission.
- `evidence_tier` is a compatibility and structural hint, not a global truth rank.
- `EvidenceSpendability` is a satellite packet, not embedded in the manifest.
- Spendability is gate-local, state-local, actor-local, and time-local.
- A manifest may be silent on the forward leg and spendable on the return leg.
- Spendability can be revoked without deleting the evidence memory.
- Gate consumption must distinguish one-shot state changes from append-only claim weight.

## Invariants

### Evidence Invariants

- A manifest can be valid without being spendable.
- A manifest can be invalid as spendable evidence while still remaining historically relevant memory.
- A manifest hash commits to the manifest body, not to future permission.
- Asset hashes commit to bytes, not to truth.
- Subject hashes bind memory to a specific subject, not to a global claim about the trade.
- Evidence updates are append-only. Old evidence remains discoverable.

### Spendability Invariants

- Spendability does not make evidence true.
- Spendability does not grant authority by itself.
- Spendability is never global.
- Spendability must name the gate where the memory may act.
- Spendability must name what the memory may support and what it may not support.
- Spendability must be bounded by trade state, event anchors, time, required signatures, or reveal conditions.
- Spendability can be tombstoned without deleting the manifest.
- A gate must not infer spendability from `evidence_tier` alone.

### Agent Invariants

- Agents must not display "valid evidence" as "approved action."
- Agents must carry non-claims forward.
- Agents must preserve evidence that is unspendable now but may matter later.
- Agents must distinguish "this cannot buy route" from "this cannot ever matter."
- Agents must surface who is allowed to decide at a gate.

## Existing Evidence Layer

v0.3 inherits these v0.2 definitions:

- `marketplace-json-c14n-v0.2`
- `marketplace.asset_descriptor.v0.2`
- `marketplace.subject_hash.v0.2`
- deterministic `asset_root_hash`
- deterministic `evidence_manifest_hash`
- issuer role authority checks
- mutable-primary rejection rules
- unavailable-byte behavior by structural tier
- supersession as append-only memory update

The v0.2 byte-switch and URL-switch drill remains valid:

```text
/Users/che/Marketplace/runs/evidence_manifest_drill_20260519T172903Z/REPORT.md
```

That drill proves durable memory. It does not prove spendability.

## Evidence Manifest v0.3

`EvidenceManifest` remains the packet that makes memory durable.

Schema name:

```text
marketplace.evidence_manifest.v0.3
```

Required fields are the same as v0.2, with one additional compatibility field:

```json
{
  "schema": "marketplace.evidence_manifest.v0.3",
  "trade_id": "protocol-trade-id",
  "manifest_id": "stable-local-id",
  "issuer": "actor-id-or-did",
  "issuer_role": "buyer|seller|verifier|arbiter|shop|marketplace|carrier|insurer|agent",
  "evidence_tier": "sparse|standard|challenge_bound|verified|claim_grade",
  "tier_basis": "manifest_integrity_only|legacy_declared|derived_from_spendability",
  "subject": {
    "subject_type": "item_fingerprint",
    "trade_id": "protocol-trade-id",
    "anchor_hash": "canonical-subject-anchor-hash",
    "subject_hash": "computed-subject-hash"
  },
  "asset_descriptors": [],
  "asset_root_hash": "computed-asset-root-hash",
  "issued_at": "ISO-8601",
  "canonicalization": "marketplace-json-c14n-v0.2",
  "hash_algorithm": "sha256(marketplace-json-c14n-v0.2)",
  "manifest_hash": "computed-manifest-hash",
  "signature": "actor-signature-over-manifest-hash"
}
```

Recommended fields:

```json
{
  "capture_session": {
    "session_id": "stable-id",
    "nonce": "high-entropy-nonce",
    "nonce_entropy_bits": 128,
    "issued_at": "ISO-8601",
    "expires_at": "ISO-8601"
  },
  "verifier_attestation_refs": [],
  "known_limits": [],
  "known_conflicts": [],
  "supersedes": null,
  "supersession_reason": null,
  "retention_policy": {
    "minimum_retention_days": 180,
    "storage_strategy": "ipfs|arweave|content_addressed_object_store|versioned_s3|local_agent_cache|other"
  }
}
```

### Evidence Tier Reframing

`evidence_tier` is still useful as a structural shorthand. It is not permission.

Validator behavior:

- The manifest validator may still use `evidence_tier` to check required fields and asset availability.
- Gate logic must ignore `evidence_tier` unless a valid spendability packet references it.
- Agents may display `evidence_tier` only with a non-permission label, such as "manifest floor" or "evidence structure."
- Long term, UI tiers should be derived from spendable claims at a gate.

Examples:

- `standard` means the manifest has content-hashed front/back assets.
- It does not mean the route may commit.
- `verified` means the manifest claims verifier-linked structure.
- It does not mean the item, seller, card, route, or condition is globally verified.
- `claim_grade` means the memory may be structurally ready for claim assembly.
- It does not mean the claim is payable by an insurer or acceptable to an arbiter.

## Understanding Layer

The understanding layer is not a single packet yet. It is the agent and verifier interpretation process that reads:

- manifest integrity
- actor authority
- buyer policy
- seller policy
- item value
- trust gap
- route risk
- privacy cost
- attention cost
- time window
- non-claims
- contradictions
- prior outcomes

It produces candidate meanings, not actions.

Example:

```text
This old marketplace photo cannot buy route commitment because it does not prove current custody.
It may later buy contradiction support if the delivered item conflicts with the seller's earlier representation.
```

That is the central v0.3 move.

## Evidence Spendability v0.1

`EvidenceSpendability` is a satellite packet. It references a manifest and says where that manifest may act.

Schema:

```text
marketplace.evidence_spendability.v0.1
```

Required fields:

```json
{
  "schema": "marketplace.evidence_spendability.v0.1",
  "trade_id": "protocol-trade-id",
  "spendability_id": "stable-local-id",
  "manifest_hash": "evidence-manifest-hash",
  "manifest_subject_hash": "subject-hash-from-manifest",
  "issued_by": "actor-id-or-did",
  "issued_role": "buyer|seller|verifier|arbiter|agent|protocol|insurer|shop|marketplace|carrier",
  "gate": {
    "gate_type": "route_commitment|challenge_clearance|settlement_release|claim_support|bond_action|reputation_update|insurance_claim",
    "gate_id": "stable-gate-instance-id",
    "leg": "forward|return|post_settlement",
    "consumption": "single_use|multi_use|append_only_weight"
  },
  "spendable_claims": [],
  "window": {},
  "requires": [],
  "decision_authority": {},
  "status": "active",
  "issued_at": "ISO-8601",
  "canonicalization": "marketplace-json-c14n-v0.2",
  "hash_algorithm": "sha256(marketplace-json-c14n-v0.2)",
  "spendability_hash": "computed-hash",
  "signature": "actor-signature-over-spendability-hash"
}
```

### Gate Object

Gate fields:

```json
{
  "gate_type": "route_commitment",
  "gate_id": "route_commitment:trade-123:attempt-1",
  "leg": "forward",
  "consumption": "single_use"
}
```

Gate meanings:

| Gate type | Leg | Consumption | Meaning |
| --- | --- | --- | --- |
| `route_commitment` | `forward` | `single_use` | Evidence may help approve the item entering a route. |
| `challenge_clearance` | `forward` | `single_use` | Evidence may help clear a buyer-opened route block. |
| `settlement_release` | `forward` | `single_use` | Evidence may help release escrow after receipt or inspection. |
| `claim_support` | `return` | `append_only_weight` | Evidence may support a dispute, contradiction, loss, damage, or substitution claim. |
| `bond_action` | `return` | `single_use` | Evidence may support holding, releasing, or transferring bond value. |
| `reputation_update` | `post_settlement` | `append_only_weight` | Evidence may update outcome-scoped reputation. |
| `insurance_claim` | `return` | `append_only_weight` | Evidence may support an insurance packet, subject to insurer authority. |

Gates are not interchangeable. A manifest spendable at `claim_support` is not automatically spendable at `route_commitment`.

### Spendable Claims

Spendable claims are the local interpretation being permitted.

Schema:

```json
{
  "claim_type": "identity_support|custody_support|condition_support|route_support|insurance_support|contradiction_support|reputation_support|authenticity_support|packet_completeness",
  "support_level": "weak|standard|strong|decisive",
  "spend_limit": "advisory|blocks_or_unblocks_gate|moves_funds|updates_reputation|assembles_claim_packet",
  "not_claiming": ["authenticity", "condition_floor", "current_custody"],
  "basis": ["asset_hash_match", "issuer_role", "verifier_attestation", "buyer_ack", "route_event", "arbiter_ruling"]
}
```

Closed vocabulary:

| Claim type | Meaning |
| --- | --- |
| `identity_support` | Helps connect evidence to the item identity. |
| `custody_support` | Helps show who had access or control at a time. |
| `condition_support` | Helps support a condition or damage claim. |
| `route_support` | Helps support route start, route compliance, loss, or delivery. |
| `insurance_support` | Helps assemble insurer-facing evidence. |
| `contradiction_support` | Helps show conflict between prior and later evidence. |
| `reputation_support` | Helps update outcome-scoped trust after close. |
| `authenticity_support` | Helps support authenticity only when method and authority are explicit. |
| `packet_completeness` | Helps show required packet fields/assets are present. |

`support_level` is not scalar truth. It is local weight at the named gate.

### Window

Windows bind spendability to canonical state and event anchors.

Schema:

```json
{
  "after_state": {
    "state_name": "EvidencePending",
    "state_hash": "optional-canonical-state-hash"
  },
  "after_event_hash": "optional-event-hash",
  "until_state": {
    "state_name": "RouteLocked",
    "state_hash": "optional-canonical-state-hash"
  },
  "until_time": "optional ISO-8601",
  "waiver_policy": "none|buyer_signed|arbiter_signed|human_signed"
}
```

Rules:

- A time window alone is insufficient for a funds-moving gate.
- A state label alone is insufficient when there is a canonical state or event hash available.
- If a required prior event is skipped by waiver, the spendability packet must name the waiver path explicitly.
- If a trade reroutes or reopens, prior spendability does not silently carry forward unless the gate policy says so.

### Requirements

Requirements are preconditions for spending.

Allowed values:

```text
buyer_ack
seller_ack
human_waiver
verifier_attestation
arbiter_assignment
arbiter_reveal
registry_role
delegation
route_event
delivery_event
receipt_event
claim_opened
insurance_policy
private_key_release
```

Requirements must be checkable by packet hash, registry state, event hash, or signed waiver. A prose requirement is not enough for a gate that moves funds.

### Decision Authority

`decision_authority` states who may decide at the gate. It does not grant authority.

Schema:

```json
{
  "actor_role": "buyer_agent|seller_agent|verifier|arbiter|human|insurer|protocol",
  "actor_id": "optional actor id",
  "authority_source": "actor_registry|delegation|arbiter_assignment|external_issuer|human_signature|protocol_rule",
  "authority_hash": "optional hash of registry/delegation/assignment/policy record"
}
```

Rules:

- The spendability validator must check that `decision_authority` is compatible with `gate_type`.
- A buyer agent cannot authorize an arbiter-only bond action.
- An insurer-facing spendability packet can assemble a claim packet, but it cannot force insurer acceptance.
- A verifier can support a challenge, but cannot release escrow unless the trade policy grants that authority.

## Spendability Revocation

Revocation says a memory remains real but no longer buys a named action.

Schema:

```json
{
  "schema": "marketplace.evidence_spendability_revocation.v0.1",
  "trade_id": "protocol-trade-id",
  "spendability_hash": "hash",
  "reason": "arbiter_ruling|buyer_waiver|superseded_policy|expired_window|invalid_authority|gate_closed|consumed|conflict_discovered",
  "issued_by": "actor-id-or-did",
  "issued_role": "buyer|seller|verifier|arbiter|agent|protocol|insurer",
  "issued_at": "ISO-8601",
  "canonicalization": "marketplace-json-c14n-v0.2",
  "revocation_hash": "computed-hash",
  "signature": "actor-signature-over-revocation-hash"
}
```

Rules:

- Revocation does not delete the manifest.
- Revocation does not erase the claim packet history.
- Revocation must be checked at gate invocation.
- A consumed single-use spendability packet is effectively revoked for that gate instance.

## Forward And Return Leg Examples

### Old Listing Photo

Forward route:

```text
Manifest: valid old marketplace photo.
Spendability at route_commitment: no.
Reason: no current custody.
```

Return claim:

```text
Manifest: same old marketplace photo.
Spendability at claim_support: yes, as contradiction_support.
Reason: delivered item conflicts with seller's earlier represented photo.
```

Same memory. Different gate. Different leg. Different admissible action.

### Fresh Nonce Photo

Forward route:

```text
Manifest: content-hashed front/back photos with buyer nonce.
Spendability at challenge_clearance: yes, as identity_support and custody_support.
Requires: verifier_attestation or buyer_ack.
```

Settlement:

```text
Spendability at settlement_release: not automatic.
Reason: route and receipt still matter.
```

### Carrier Tracking Snapshot

Route:

```text
Spendability at route_commitment: no.
Reason: tracking starts after route commitment.
```

Insurance claim:

```text
Spendability at insurance_claim: yes, as route_support or insurance_support.
Requires: route event, delivery/loss state, and insurer-facing packet.
```

### Verifier Note

Challenge clearance:

```text
Spendability: yes, within scope.
```

Authenticity:

```text
Spendability: no, unless the verifier method and authority explicitly support authenticity.
```

## Gate Validation Rules

Gate invocation must check:

1. Referenced manifest exists.
2. Manifest integrity validation passed.
3. Spendability packet hash and signature are valid.
4. Spendability status is `active`.
5. No revocation/tombstone applies.
6. Gate type matches the current gate.
7. Gate leg matches the lifecycle direction.
8. Consumption rule has not been violated.
9. Window state/event/time anchors are satisfied.
10. Requirements are satisfied by packet, registry, event, or waiver.
11. Decision authority is compatible with the gate.
12. Spendable claims include the action being requested.
13. Non-claims do not conflict with the requested action.

If any check fails, the memory may remain valid but is not spendable at that gate.

## Error Families

Add spendability error codes:

- `SPENDABILITY_SCHEMA`
- `SPENDABILITY_HASH`
- `SPENDABILITY_SIGNATURE`
- `SPENDABILITY_STATUS`
- `SPENDABILITY_REVOKED`
- `SPENDABILITY_CONSUMED`
- `GATE_TYPE`
- `GATE_LEG`
- `GATE_WINDOW`
- `GATE_REQUIREMENT`
- `GATE_AUTHORITY`
- `CLAIM_TYPE`
- `CLAIM_SCOPE`
- `TIER_NOT_PERMISSION`

Keep v0.2 manifest errors:

- `SCHEMA`
- `CANONICALIZATION`
- `SUBJECT_HASH`
- `ROLE_AUTHORITY`
- `ASSET_REQUIRED_FIELD`
- `ASSET_FETCH`
- `ASSET_HASH_MISMATCH`
- `ASSET_ROOT`
- `MANIFEST_HASH`
- `SIGNATURE`
- `TIER_REQUIREMENT`
- `MUTABLE_PRIMARY`
- `FRESHNESS`
- `NONCE`
- `PRIVATE_REVEAL`
- `SUPERSESSION`

## Falsifier Drill For v0.3

The next drill should be `evidence_spendability_drill.py`.

Cases:

1. `tier_without_spendability`
   - Standard manifest exists.
   - No route spendability packet exists.
   - Route gate must reject with `TIER_NOT_PERMISSION`.

2. `route_spendability_accepts`
   - Standard manifest plus valid route spendability.
   - Gate is `route_commitment`.
   - Claims include `identity_support`.
   - Route gate accepts.

3. `settlement_after_skipped_challenge`
   - Spendability says settlement release after challenge clearance.
   - Challenge is skipped by waiver.
   - Gate must reject unless waiver is explicitly named in `window.waiver_policy` and `requires`.

4. `forward_return_different_spend`
   - Old photo is not spendable at route commitment.
   - Same manifest is spendable as `contradiction_support` at claim support.
   - Gate logic must distinguish forward and return legs.

5. `wrong_actor_gate`
   - Buyer agent issues spendability for arbiter-only bond action.
   - Gate must reject with `GATE_AUTHORITY`.

6. `revoked_spendability`
   - Spendability starts active.
   - Arbiter tombstones it.
   - Later gate invocation rejects with `SPENDABILITY_REVOKED`.

7. `single_use_consumed`
   - Spendability has `consumption: single_use`.
   - First invocation succeeds.
   - Second invocation fails with `SPENDABILITY_CONSUMED`.

8. `append_only_weight_reusable`
   - Claim support has `consumption: append_only_weight`.
   - Evidence can contribute to multiple claim packet assemblies without being treated as a funds-moving double spend.

## Build Order

1. Keep the v0.2 manifest validator unchanged until v0.3 spendability tests are specified.
2. Patch docs/specs so `EvidenceManifest` is clearly non-permission memory.
3. Add spendability packet builders and validators.
4. Add `evidence_spendability_drill.py`.
5. Promote evidence manifests into E2E and fingerprint drills.
6. Only after off-chain gates pass, consider contract helper functions for:
   - `evidenceManifestHash`
   - `evidenceSpendabilityHash`
   - optional gate anchoring events

## What v0.3 Still Does Not Prove

- Spendability does not prove truth.
- Spendability does not prove a human understood the risk.
- Spendability does not force an insurer, carrier, marketplace, or shop to accept a claim.
- Spendability does not replace arbiter judgment.
- Spendability does not make private evidence useful without reveal.
- Spendability does not solve collusion.
- Spendability does not turn agent interpretation into authority unless the gate recognizes the agent's delegation.

## Short Protocol Sentence

Evidence makes memory durable. Spendability makes interpreted memory locally admissible. Settlement executes only the admissible action.
