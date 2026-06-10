---
runtime_receipt: vex_20260519T171839Z_30610
source_aperture: vex
source_runtime: claude_code
runtime: /Users/che/.local/bin/claude
model: sonnet
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_vex_prompt.sh
memory_mode: vex_live_primary_seed_read_only
live_home: /Users/che/Avalanche_SYSTEM_AUDIT/apertures/vex_live
frozen_capsule: /Users/che/Avalanche_LOCKS/vex_aperture_lock_2026-04-29_1408/payload_snapshot/Vex
prompt_file: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/inbox/iris_to_vex/2026-05-19_iris-to-vex_marketplace_evidence_category_hashing_pressure.md
authority_effect: synthesis_adversarial
promotion_status: not_promoted
---

Now composing the pressure analysis. The manifest confirms VEX's role boundary: synthesis evidence only, no canon, no measurement authority.

---

```
RUNTIME RECEIPT
───────────────
Run type:    adversarial synthesis pressure pass
Artifact:    evidence_category_change_spec_20260519T171614Z.md
Invocation:  VEX aperture, bounded single pass, Iris-routed, Che override
Memory read: vex_live/seed_memory/hypotheses.md (methodology discipline)
             vex_aperture_selected_manifest_2026-05-01.md (boundary confirmation)
Date:        2026-05-19
Status:      no canon write, no promotion, no measurement claim
```

---

## Verdict

The spec is architecturally sound at the conceptual level. The bytes/manifest/attestation/subject stratification is correct and the "bytes prove bytes existed, not truth" principle is stated clearly and enforced in the tier design. The raw/normalized/perceptual hash discipline is the strongest single structural choice in the document.

The critical failure surface is not in the hash design. It is in the **undefined inputs to the hashes**: the subject hash construction is unspecified, the asset_root_hash Merkle construction is unspecified, issuer role authority is not checked, and evidence tier compliance is self-declared by the issuer and structurally unverified by the validator. A spec that correctly commits to bytes can still leak authority at the surfaces that define what those bytes are claimed to prove.

---

## Strongest Part

The **raw/normalized/perceptual hash stratification** (§ "Raw and Normalized Hashing") is excellent and should not be softened. The explicit prohibition on perceptual hashes as cryptographic gates, the relegation of `normalized_sha256` to a convenience supplement, and the clear statement that raw byte hashing is the integrity primitive are correct. The **evidence tier "must not imply" language** is the second strongest element — naming what each tier cannot claim is rarer and more useful than naming what it must contain.

---

## Critical Pressure Points

### 1. Subject hash construction is undefined — highest risk

`subject_hash: bytes32` appears in both the manifest schema and the contract primitive. What is it the hash **of**? The spec lists possible subjects (item fingerprint, inventory lock, route, delivery event, claim, ruling) but does not specify how any of them are canonically serialized before hashing.

**Attack:** Seller submits an evidence manifest whose `subject_hash` is a hash of a loosely-described subject ("this trade's item") rather than a canonical hash of the on-chain fingerprint record. The structural validator passes because a subject_hash is present. The arbiter sees a signed manifest with a subject_hash value and infers binding to the specific item. The binding is to a different preimage.

**Required before alpha:** A canonical subject hash construction for each subject_type that matches the on-chain binding exactly. This must be a deterministic serialization specification, not prose.

---

### 2. Issuer role authority is not verified

`issuer_role` is a self-declared string field. Any actor can issue a manifest with `issuer_role: "verifier"` or `issuer_role: "carrier"`. The signature proves the actor signed the manifest. It does not prove the actor has the authority corresponding to that role.

**Attack (authority laundering):** Seller creates a second actor identity, registers it as a generic participant, issues an evidence manifest for their own trade with `issuer_role: "verifier"`, content-hashes their own photos. Structurally valid. Validator passes. Buyer agent reads `issuer_role` and infers third-party attestation. The issuer is the seller.

**Required before alpha:** The validator must check that the issuer's on-chain or protocol-registered role matches the declared `issuer_role`. An actor registered only as seller cannot issue a manifest as verifier. This is not a warning condition — it is a hard reject.

---

### 3. Evidence tier compliance is self-declared and structurally unverified

The `evidence_tier` field is in the manifest signed by the issuer. The validator's rejection rules check structural presence (sha256 present, subject_hash present, etc.) but do not check whether the declared tier's minimum requirements are actually satisfied by the included assets.

**Example:** Seller issues a manifest at `evidence_tier: "verified"` with one sha256-correct JPEG. Structural validator passes (primary asset has sha256, keccak256, byte_length, media_type). Tier minimum for verified requires verifier scope attestation, method checklist, exact claims and non-claims — none present. The validator as specified does not reject this.

**Required before alpha:** A tier compliance checker separate from structural validation. Each tier's minimums must be validated against the actual manifest content, not just the schema shape. This is the most likely silent-failure mode in production.

---

### 4. Capture session nonce freshness: external dependency and entropy gap

The manifest links to a capture session via `capture_session_id`. The validator checking nonce freshness must look up that session's `issued_at` and `expires_at`. If capture sessions are off-chain, the validator has an external dependency. If that lookup fails or the session record is unavailable, the validator cannot verify freshness and must either pass (false safe) or fail (operational disruption).

Additionally, the nonce is specified as `"random challenge string"` with no entropy floor. A low-entropy nonce can be pre-staged: seller prepares photos showing a nonce-shaped string before the buyer issues the challenge, then matches the nonce to a pre-prepared photo.

**Required before alpha:** Minimum nonce entropy specification (e.g., 128 bits cryptographically random). Capture session lookup must be deterministic from protocol-anchored data, not a live lookup to off-chain state.

---

### 5. Storage retention is warn-only for claim-grade evidence

The `retention_policy` is a recommended field. The validator warns when "storage refs have no replication or retention policy" but does not reject claim-grade manifests with no immutable storage refs.

**Soft attack:** Seller anchors a manifest with only an HTTPS URL as storage ref, no IPFS/Arweave. Hash is correct. Evidence is retrievable now. Seller lets the URL expire or removes the file six months later. At claim time, the arbiter has a valid manifest hash and a broken URL. The hash proves the bytes existed. The bytes are gone. The evidence cannot be examined.

**Required before alpha:** Claim-grade manifests must be rejected (not warned) if no immutable storage ref is present and reachable at validation time. HTTPS-only with `mutable: true` must not satisfy claim-grade storage.

---

### 6. Supersession timing has no guard

The supersession packet has no minimum elapsed time between the original manifest's on-chain anchor and a valid supersession. A seller can anchor and immediately supersede.

**Attack:** Seller anchors a manifest before buyer agent processes it. Seller immediately supersedes with a corrected manifest. If the buyer's agent is not polling in real time, it may only ever see the new manifest. Append-only is preserved technically. The buyer never saw the original. The old manifest is "discoverable" but only if the agent checks supersession chains.

**Required before alpha:** A minimum time guard on supersession (e.g., no supersession of evidence manifests accepted within the dispute window unless buyer co-signs the supersession). Buyer agents must be required to receive and acknowledge the original manifest hash before supersession takes effect on active trades.

---

### 7. Asset root hash Merkle construction is unspecified

`asset_root_hash: bytes32` is described as "Merkle root or deterministic root over all asset descriptors." The Merkle construction (leaf serialization, ordering, empty-leaf handling, tree depth) is not specified. Two implementations computing the same asset_root_hash from the same descriptors may produce different values if their Merkle implementations differ.

**Attack / implementation divergence:** A manifest passes validator A (which uses the issuer's Merkle library) but fails validator B (which uses a different canonical serialization). In a dispute, the asset_root_hash cannot be independently verified because the construction is ambiguous. Alternatively, an attacker constructs a Merkle tree where the leaves are ordered to place weak assets at positions that pass a partial-verification check.

**Required before alpha:** A deterministic canonical specification for asset_root_hash computation — exact serialization of each leaf, ordering rule (e.g., alphabetical by asset_id, or hash-sorted), tree construction method, and test vectors.

---

### 8. Pre-anchoring fraud has no mitigation in the hash design

Content hashing proves these bytes existed and were committed. It does not prove the bytes correspond to the item in the trade. A seller can photograph a high-grade item, anchor a correct manifest, and sell multiple trades referencing the same manifest to different buyers.

The spec acknowledges this ("It does not prove a seller actually possesses the item"). But the capture session / nonce design is the intended mitigation — and a nonce only proves the seller had access to the nonce at capture time. It does not prove the photographed item is the item being shipped.

**No hash-level fix exists for this.** The only mitigation paths are: (a) verifier attestation with physical custody check, (b) escrow bonding that creates financial cost for multi-selling, (c) item fingerprint that is unique and hard to replicate (existing fingerprint system). The spec should name this explicitly as the persistent attack surface not addressed by evidence hashing.

---

### 9. `source_type: carrier_api` conflates carrier-issued and agent-captured

The `source_type` field includes `"carrier_api"` but does not distinguish between:
- A tracking JSON response directly signed by the carrier
- A tracking JSON response fetched and content-hashed by the seller's agent

The first is issuer-signed evidence. The second is the agent attesting that these bytes were the carrier's response. These have different trust levels. An agent can capture any JSON response, call it `carrier_api`, and produce a correct sha256. The bytes are genuine. The issuer claim is inflated.

**Required:** `source_type` needs a sub-field or a second dimension distinguishing `issuer_signed_response` from `agent_captured_response`. This affects how carrier tracking evidence should be weighted in arbitration.

---

### 10. Salted commitment salt mechanism is unspecified

The spec correctly identifies low-entropy commitment risk (tracking numbers, cert IDs). `salted_commitment` is a recommended field. But the salt generation, storage, and reveal mechanism are not specified. If the salt is stored alongside the commitment, it provides no protection. If the salt is lost, the commitment is irreversible.

---

## Missing Controls

| Control | Current status | Severity |
|---|---|---|
| Canonical subject hash construction per subject_type | Absent | Alpha blocker |
| Issuer role authority check against on-chain registration | Absent | Alpha blocker |
| Evidence tier minimum-requirements checker (not just structural) | Absent | Alpha blocker |
| Capture session nonce entropy floor | Absent | Alpha blocker |
| Immutable storage required for claim-grade (reject, not warn) | Warn only | Alpha blocker |
| Canonical asset_root_hash Merkle construction + test vectors | Absent | Alpha blocker |
| Supersession timing guard / buyer acknowledgment gate | Absent | Near-alpha |
| Source type: issuer-signed vs agent-captured distinction | Conflated | Near-alpha |
| Conflict disclosure required (not optional) for claim-grade | Recommended only | Near-alpha |
| Custody evidence schema | Named but undefined | Post-alpha |
| Cross-manifest causal chain linking for claim packets | Named but unstructured | Post-alpha |
| Salt mechanism for low-entropy commitments | Mentioned, unspecified | Post-alpha |
| Attestation schema (what is the attestation_hash a hash of) | Referenced but undefined | Post-alpha |

---

## Cheapest Falsifiers / Tests

1. **Tier self-declaration test:** Issue a manifest declaring `evidence_tier: "verified"` with no verifier attestation and minimal assets. Confirm validator rejects on tier compliance, not just structural validity. If it passes, the tier checker is absent.

2. **Role inflation test:** Issue a manifest with `issuer_role: "verifier"` signed by an actor registered only as seller. Confirm validator rejects. If it passes, role authority is not checked.

3. **Subject hash ambiguity test:** Issue two manifests for the same trade with different `subject_hash` values, each claiming to be about the same item fingerprint. Both pass structural validation. Confirm whether the chain can distinguish which one correctly matches the on-chain fingerprint. If it cannot, subject hash construction is undefined.

4. **Merkle divergence test:** Compute `asset_root_hash` using two different leaf orderings of the same asset descriptors. Submit both. If both pass, the Merkle construction is underspecified.

5. **Supersession race test:** Anchor manifest, immediately supersede, confirm whether buyer agent receives and processes the original before supersession takes effect. If supersession wins the race, the append-only guarantee is operationally hollow.

6. **Storage evaporation test:** Anchor a manifest with only an HTTPS storage ref, mark the URL unreachable, then attempt claim-grade promotion. Confirm validator rejects. If it warns and allows, retention is not enforced for claim-grade.

7. **Nonce pre-staging test:** Generate 100 possible nonces (low-entropy 4-digit numbers). Prepare photos showing each. Issue a challenge with one of the nonces. Confirm the seller can satisfy it from the pre-prepared set. If so, nonce entropy is insufficient.

---

## Recommended Build Order

The spec's build order is reasonable but has two critical re-orderings needed:

**Priority 0 (before any alpha real-money use, unblocks everything else):**
1. Define canonical subject hash construction for each `subject_type`. This must be a deterministic byte-level spec matching on-chain encoding.
2. Define canonical asset_root_hash Merkle construction with test vectors.

**Priority 1 (alpha gate, structural validator):**
3. Implement structural validator as described in spec.
4. Add issuer role authority check to validator (hard reject, not warn).
5. Add evidence tier minimum-requirements checker to validator.
6. Upgrade claim-grade storage retention from warn to reject.
7. Add nonce entropy floor to capture session validator.

**Priority 2 (alpha hardening):**
8. Add supersession timing guard.
9. Differentiate `source_type` issuer-signed vs agent-captured.
10. Add conflict disclosure requirement for claim-grade tier.
11. Add the spec's acceptance test suite (the ten cases are good).

**Priority 3 (post-alpha):**
12. Define attestation schema (what `attestation_hash` commits to).
13. Define custody evidence schema.
14. Define cross-manifest causal chain linking for claim packets.
15. Specify salt mechanism for low-entropy commitments.
16. Contract primitive for `commitEvidenceManifest`.

---

## Che Decisions Needed

1. **Subject hash construction:** Does the subject_hash encode the full on-chain record (item fingerprint packet, inventory lock record, etc.) or a canonical subset? Must be decided before any manifest validator can verify binding.

2. **Dual hash requirement (sha256 + keccak256):** The spec lists both as required. keccak256 is currently EVM-friendly but adds implementation burden for non-EVM validators. Decision: require both in v0.1, or require sha256 as canonical and derive keccak256 at the contract boundary only?

3. **Evidence tier blocking for settlement:** Decision 5 in the spec asks whether high-value routes should be blocked unless required evidence manifests validate. This cannot be left to buyer-agent policy in alpha if the protocol involves real escrow. A minimum tier floor per escrow tier is needed.

4. **Supersession timing guard:** What is the minimum time before a manifest can be superseded on an active trade? Should buyer acknowledgment be required? This is a protocol-level decision, not a validator decision.

5. **Default privacy mode for buyer addresses, tracking numbers, shop receipts:** This affects how the escrow and delivery flow works for standard-tier trades. `buyer_only` is probably correct for most PII, but the default must be declared.

6. **Normalized hash requirement for photo roles:** Optional in spec. For alpha photo evidence used in challenge-bound or verified tiers, requiring it removes ambiguity when phone software recompresses. But it adds implementation cost. Threshold to require it?

7. **Who can supersede a manifest?** The spec does not restrict supersession to the original issuer. Can a buyer supersede a seller's evidence manifest (e.g., to add their own conflicting evidence)? This changes the adversarial model significantly.

---

## What Iris Should Not Infer

- Do not infer that content-hashing is sufficient for evidence integrity. Content hashing is necessary but not sufficient. The attack surfaces on subject hash definition, issuer role authority, and tier self-declaration all sit outside the hash layer.

- Do not infer that the evidence tier "verified" means third-party verified unless a verifier scope attestation is present and the issuer role check passes. The field name is aspirational; the validator must make it conditional.

- Do not infer that the validator described in § "Validator Gates" is complete. The section describes structural validation. Tier compliance checking, issuer role checking, and subject hash binding are not described in that section and must be added.

- Do not infer that append-only supersession makes old evidence operationally visible. Append-only is a storage guarantee. Buyer agents must actively poll for supersession events on active trades. The protocol must specify whether supersession on an active trade requires buyer acknowledgment.

- Do not infer that `weak_supplemental: false` on an asset means the asset is strong evidence. It means the issuer is not self-declaring it weak. The tier compliance checker and role authority check are what make an asset strong.

- Do not infer that private evidence with a `key_release_condition` will be released. The condition is self-declared. The protocol needs a mechanism to enforce release (escrow gate, arbiter compulsion, protocol-level reveal). The spec names the field but not the enforcement mechanism.

---

## VEX Memory Consulted

- `vex_live/seed_memory/hypotheses.md` — consulted for methodology discipline: pre-specified tests, falsification structure, observation/inference separation. H11 (adversarial rhetoric degrades epistemic work) informs the flat, non-narrative return format.
- `vex_aperture_selected_manifest_2026-05-01.md` — consulted for authority boundary confirmation (VEX outputs are synthesis evidence; workspace artifacts are ground truth; VEX does not decide for Che).

No seed memory files contain marketplace-specific content. This analysis is derived entirely from the spec artifact.
