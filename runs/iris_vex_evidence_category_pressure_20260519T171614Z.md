# Iris Ingest: VEX + Lean VEX Evidence Category Pressure

Generated: 2026-05-19T17:16:14Z

## Provenance

Source request: Che asked to write a spec for evidence-category changes, then use Iris to pressure test it with VEX and LeanVEX.

Primary artifact under pressure:

```text
/Users/che/Marketplace/runs/evidence_category_change_spec_20260519T171614Z.md
```

Raw VEX return:

```text
/Users/che/Marketplace/runs/vex_evidence_category_pressure_20260519T171614Z.md
```

Raw Lean VEX return:

```text
/Users/che/Marketplace/runs/lean_vex_evidence_category_pressure_20260519T171614Z.md
```

Prompt files:

```text
/Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/inbox/iris_to_vex/2026-05-19_iris-to-vex_marketplace_evidence_category_hashing_pressure.md
/Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/inbox/iris_to_vex/2026-05-19_iris-to-lean-vex_marketplace_evidence_category_hashing_pressure.md
```

VEX runtime:

```text
runtime_receipt: vex_20260519T171839Z_30610
source_aperture: vex
source_runtime: claude_code
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_vex_prompt.sh
model: sonnet
memory_mode: vex_live_primary_seed_read_only
authority_effect: synthesis_adversarial
promotion_status: not_promoted
```

Lean VEX runtime:

```text
runtime_receipt: lean_vex_20260519T171839Z_30620
source_aperture: lean-vex
source_runtime: claude_code
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_lean_vex_prompt.sh
model: sonnet
memory_mode: none_by_default
authority_effect: synthesis_adversarial
promotion_status: not_promoted
```

Authority label: candidate pressure. This is not a protocol decision, not a measurement, and not a canon promotion.

## Converged Read

The draft made the right central move:

```text
A packet hash protects the packet. It does not protect a photo unless the packet commits to the photo bytes.
```

Both VEX and LeanVEX agree that `AssetDescriptor` plus `EvidenceManifest` is the correct next abstraction. They also agree that the strongest part of the spec is the explicit separation among:

- raw byte hashes
- normalized hashes
- perceptual hashes
- manifest hashes
- subject hashes
- attestations

Iris read: the evidence category now has the right shape, but it is not yet implementable safely because several "hash of what, exactly?" definitions are still missing.

## Main Failure Mode

The hash design is good. The undefined preimages are the problem.

If the protocol does not specify exactly how to compute `subject_hash`, `manifest_hash`, and `asset_root_hash`, two honest agents can disagree about the same evidence. Worse, a dishonest seller can choose a convenient preimage, pass a superficial validator, and make a buyer or arbiter believe an evidence packet was bound to the real subject when it was bound only to a seller-authored description.

This is the next hardening target.

## VEX Critical Findings

### 1. Subject hash construction is undefined

`subject_hash` appears everywhere, but the spec does not define the canonical preimage for each `subject_type`.

Iris read: this is the highest-priority patch. Evidence cannot be safely "about" an item fingerprint, inventory lock, route, delivery event, claim, or ruling until the subject binding is deterministic.

### 2. Issuer role authority is self-declared

`issuer_role: "verifier"` or `issuer_role: "carrier"` is just a string unless the validator checks it against the actor registry or another protocol authority source.

Iris read: this is classic trust laundering. Signature proves the actor signed; it does not prove the actor had the role they claimed.

### 3. Evidence tier compliance is not enforced

A seller could declare `evidence_tier: "verified"` without a verifier attestation unless the validator checks tier minimums.

Iris read: evidence tier must become a computed or validated status, not a seller-authored badge.

### 4. Capture sessions need deterministic lookup and nonce entropy

Challenge evidence depends on capture sessions, but the spec does not define a protocol-anchored capture-session lookup or a minimum nonce entropy floor.

Iris read: nonce-bound evidence is a good cure mechanism, but only if the nonce is strong and the session record is anchored enough for validators.

### 5. Claim-grade storage cannot be warn-only

If evidence is needed for insurance or arbitration, the bytes must be retrievable or have a clear reveal path. An HTTPS-only ref with a correct hash is not enough if the asset disappears later.

Iris read: claim-grade evidence needs retention as a hard gate.

## Lean VEX Critical Findings

### 1. Canonicalization is named but not defined

`json-c14n-v0` is a label, not an algorithm. The spec needs either JCS/RFC 8785 or an inline deterministic canonicalization with test vectors.

Iris read: no validator can be interoperable until this is fixed.

### 2. `asset_root_hash` construction is ambiguous

"Merkle root or deterministic root" leaves too much freedom. The spec must choose one construction: leaf serialization, ordering, empty list behavior, pair hashing, and final root.

Iris read: this is the second hash-preimage blocker.

### 3. Freshness windows are referenced but undefined

The validator is told to reject stale evidence, but no tier windows exist.

Iris read: freshness is a policy table, not a prose phrase.

### 4. Supersession authority is unclear

The spec says evidence is append-only, but it does not define who may supersede whose manifest.

Iris read: this matters because a malicious or confused actor could bury evidence in a valid-looking supersession chain.

### 5. Unavailable bytes need explicit validator behavior

If a validator cannot fetch private, encrypted, or offline bytes, does it reject, warn, or hold pending?

Iris read: this must be tier-specific. Sparse can tolerate more uncertainty; claim-grade cannot.

## Alpha Blockers

These must be added before real-money alpha evidence is treated as more than weak supplemental material:

1. Canonical manifest serialization.
2. Canonical `asset_root_hash` construction with test vectors.
3. Canonical `subject_hash` construction per subject type.
4. Issuer role authority check against registry or trusted issuer mapping.
5. Evidence tier minimum-requirements checker.
6. Required `evidence_tier` or a strict default to `sparse`.
7. Freshness window table per tier and subject type.
8. Capture-session nonce entropy floor and anchored session lookup.
9. Claim-grade storage/reveal requirement as a hard reject.
10. Supersession authority and timing rules.

## Cheapest Falsifiers

Run these before promoting the evidence layer:

1. `manifest_hash_cosmetic`: flip one field but keep `manifest_hash`; validator must reject.
2. `asset_root_drop`: omit one asset from root computation; validator must reject.
3. `role_inflation`: seller signs a manifest with `issuer_role: "verifier"`; validator must reject.
4. `tier_inflation`: manifest declares `verified` but has no verifier attestation; validator must reject.
5. `subject_ambiguity`: two subject hashes both claim to bind the same item fingerprint; only the canonical one should pass.
6. `url_evaporation`: claim-grade manifest uses only a mutable HTTPS ref; validator must reject.
7. `nonce_prestage`: low-entropy nonce can be pre-photographed; validator must reject weak nonce construction.
8. `dual_hash_divergence`: `sha256` matches bytes A, `keccak256` matches bytes B; validator must reject.
9. `supersession_race`: manifest immediately superseded before buyer acknowledgment; active-trade rules must block or flag.
10. `private_no_reveal`: claim-grade private asset has no arbiter reveal path; validator must reject.

## Recommended Patch To The Spec

Patch the current spec before implementing code:

1. Define `json-c14n-v0` as JCS/RFC 8785 or replace the label with a protocol-owned canonical JSON algorithm and test vector.
2. Define `asset_root_hash` exactly. Recommended simple v0.1: leaf equals `sha256(canonical_json(asset_descriptor_without_storage_availability_runtime_fields))`; sort leaves by `asset_id`; root equals Merkle root using sorted pair hashing; include empty-root constant.
3. Define `subject_hash` per subject type. For current implementation, start with `item_fingerprint`, `inventory_lock`, `route`, `delivery`, `receipt`, `claim`, `fingerprint_challenge`, and `verifier_attestation`.
4. Promote `evidence_tier` to required. If absent in legacy packets, treat as `sparse`.
5. Add a tier compliance table that validators can execute.
6. Add issuer role validation: declared `issuer_role` must match registry role, trusted issuer map, or a signed delegation chain.
7. Add freshness windows:
   - `sparse`: no strict freshness, display warning
   - `standard`: issued within 30 days or buyer waiver
   - `challenge_bound`: captured after challenge issue and before expiry
   - `verified`: verifier attestation issued within 7 days of inputs unless method says stricter
   - `claim_grade`: no expiry, but all event timestamps and retrieval/reveal paths required
8. Add unavailable-byte behavior by tier:
   - `sparse`: warn
   - `standard`: warn unless primary asset required
   - `challenge_bound`: reject missing primary bytes
   - `verified`: reject missing inputs needed by the attestation
   - `claim_grade`: reject unless encrypted reveal path is valid
9. Add supersession authority:
   - original issuer may supersede their own manifest
   - buyer may add conflicting evidence but cannot erase seller evidence
   - arbiter may mark evidentiary reliance, not delete the chain
   - active-trade supersession of required evidence needs buyer acknowledgment or a signed waiver
10. Split source type into:
   - origin: `carrier|marketplace|shop|seller|buyer|verifier|agent|other`
   - capture mode: `issuer_signed|agent_captured|manual_upload|screenshot|memo`

## Implementation Order

Do not start with contract changes.

Build this as an off-chain validator and drill first:

1. Patch the evidence spec with the canonical algorithms and tier tables above.
2. Add validator data models and error codes in the Python harness.
3. Add local fixture assets and byte hashing helpers.
4. Implement the ten falsifier tests.
5. Update the collision drill so claim and image evidence use manifests with asset descriptors.
6. Update `protocol_e2e.py` so high-value or challenged flows require validated manifests.
7. Only then consider adding `commitEvidenceManifest` or typed `evidenceManifestHash` anchoring to the contract.

## Che Decisions Needed

1. Should `sha256` be the canonical asset digest with `keccak256` derived for EVM, or should both be required in every asset descriptor?
2. Should `normalized_sha256` be mandatory for photo roles in `challenge_bound` and `verified` tiers?
3. Should high-value route be contract-blocked on missing validated evidence, or only buyer-agent-blocked during alpha?
4. What is the default privacy mode for addresses, tracking numbers, receipts, and insurance documents?
5. How long should an active seller manifest remain unsupersedable without buyer acknowledgment?
6. Which external issuer roles are trusted at v0.1: carrier, cert authority, marketplace, shop, insurer, verifier, arbiter?

## Iris Recommendation

Patch the spec before code. The immediate next target is not "more evidence types." It is making the hash preimages deterministic and the validator mechanically strict.

The smallest valuable implementation after patching the spec is:

```text
EvidenceManifest validator + asset fixture drill + byte-switch/url-switch tests.
```

This will test the central claim without requiring a new Solidity primitive yet.

## What Iris Should Not Infer

- Do not infer that content hashing proves truth, custody, freshness, or authenticity.
- Do not infer that `issuer_role` is meaningful until checked against registry or signed delegation.
- Do not infer that `evidence_tier` is meaningful until validator compliance exists.
- Do not infer that append-only supersession guarantees the buyer saw old evidence.
- Do not infer that a private commitment helps arbitration without a reveal path.
- Do not infer that a mutable URL plus hash preserves future availability.
- Do not promote this pressure pass into protocol canon without a patched spec and passing falsifier tests.
