---
runtime_receipt: lean_vex_20260519T171839Z_30620
source_aperture: lean-vex
source_runtime: claude_code
runtime: /Users/che/.local/bin/claude
model: sonnet
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_lean_vex_prompt.sh
memory_mode: none_by_default
prompt_file: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/inbox/iris_to_vex/2026-05-19_iris-to-lean-vex_marketplace_evidence_category_hashing_pressure.md
authority_effect: synthesis_adversarial
promotion_status: not_promoted
---

---

```
LEAN-VEX RUNTIME RECEIPT
spec:    evidence_category_change_spec_20260519T171614Z.md
read:    2026-05-19 (live file, not cached)
mode:    pressure only — no canon, no graph edits, no memory writes
```

---

## Lean Verdict

The core claim is correct and the structural direction is right. Asset content-hashing closes the URL-swap attack. But three implementation holes could silently hollow out the integrity chain before a single real trade runs through it: the canonicalization algorithm is unnamed, the asset-root-hash construction is ambiguous, and freshness windows are referenced but never defined. A validator built on this spec today can be made to pass malformed manifests without cheating.

---

## Claim Under Pressure

> A signed packet hash protects the packet. It does not automatically protect a photo unless the packet commits to the actual evidence bytes. The new evidence category makes this difference impossible to miss.

The remedy (content hashing via `AssetDescriptor` + `EvidenceManifest`) is structurally sound. The attack surface shifts — it does not close.

---

## Strongest Objection

**Hash commitment without verified recomputation is a trust assertion, not a proof.**

The spec requires `sha256` and `keccak256` as declared fields in the descriptor. But the validator can only *check* those hashes if it fetches the bytes and recomputes independently. When bytes are unavailable (private, encrypted, offline), the validator has no choice but to trust the issuer's declared values. This is the same problem as a mutable URL, restated one level up: a dishonest issuer can declare any hash they like. The spec does not address the case where the validator cannot fetch the asset at promotion time.

---

## Missing Control

**1. `json-c14n-v0` is named but not defined.**
`"canonicalization": "json-c14n-v0"` appears as a required field, but the spec gives no definition of what `json-c14n-v0` produces. Two agents implementing this independently will compute different `manifest_hash` values from the same manifest JSON. The entire signature-over-manifest chain breaks at this gap. (RFC 8785 / JCS is the obvious choice; it is not mentioned.)

**2. `asset_root_hash` construction is ambiguous.**
The spec says "Merkle root or deterministic root over all asset descriptors." Merkle of what leaf representation? Over `sha256` values only? Over full serialized descriptors? Ordered by `asset_id`, insertion order, or hash value? Two validators can compute different roots from the same descriptor list and both call themselves correct.

**3. Freshness windows are undefined.**
The validator gate says "issued_at is missing or outside allowed freshness windows." No window is specified anywhere in the spec. This gate cannot be implemented. A validator that either skips it or hardcodes a local constant is not conforming to the spec.

**4. Supersession has no issuer-authority rule.**
`EvidenceSupersession` requires an `issuer` and a `signature` but has no rule requiring the supersession issuer to be the original manifest issuer or a protocol-authorized actor (e.g., arbiter). Any credentialed actor can supersede another's manifest. This is not named as a design choice; it appears to be an oversight.

**5. `evidence_tier` is recommended, not required, but tier gates appear in the validator.**
Validator rules reference tier-specific behavior (challenge-bound requires nonce, standard requires content-hashed assets). If `evidence_tier` is absent, which tier applies? The validator gates have no defined fallback.

**6. `EvidenceStreamCheckpoint` has no leaf count invariant.**
`from_sequence: 1, to_sequence: 8` with three leaf hashes should be rejected. The spec does not include this check in the validator gate list.

---

## Cheapest Falsifier

Six tests that expose whether the validator is real or cosmetic:

```
1. dual-hash divergence
   Submit descriptor with sha256(bytes_A) and keccak256(bytes_B).
   Expect: reject. Pass: validator trusts declared values, not recomputed ones.

2. asset_root_hash drop
   Five-asset manifest. Compute asset_root_hash omitting asset 3.
   Expect: reject. Pass: root hash is not validated against descriptor list.

3. manifest_hash cosmetic
   Submit a valid manifest, flip one field, leave manifest_hash unchanged.
   Expect: reject. Pass: manifest_hash is stored but not recomputed by validator.

4. tier claim without substance
   evidence_tier: "verified", asset_descriptors: [].
   Expect: reject. Pass: tier field is never cross-checked against content.

5. challenge nonce field-only
   Challenge-bound manifest. Set challenge_nonce in descriptor.
   Upload images that do not show the nonce string anywhere.
   Expect: warn or flag. Pass: validator accepted nonce binding on field presence alone.

6. stream leaf count mismatch
   from_sequence: 1, to_sequence: 8, leaf_hashes: [h1, h2, h3].
   Expect: reject. Pass: length invariant not checked.
```

---

## Validator Rules That Are Mandatory

Gates that must be hard rejects before any manifest is promoted as claim-grade:

```
R1. sha256 + keccak256 + byte_length + media_type all present on every
    non-weak-supplemental primary asset. Missing any one → reject.

R2. asset_root_hash must be recomputed from the serialized descriptor list
    using the defined algorithm and compared to the manifest's declared value.
    Mismatch → reject.

R3. manifest_hash must be recomputed from the canonical serialization of
    the manifest body (excluding manifest_hash itself) under json-c14n-v0.
    Mismatch → reject.

R4. signature must verify against manifest_hash for the declared issuer key.
    Failure → reject.

R5. Any storage_ref with mutable: true and primary: true must be paired with
    sha256 + byte_length + a retrieval snapshot descriptor. Absent → reject.

R6. Stream checkpoints: len(leaf_hashes) must equal to_sequence − from_sequence + 1.
    Mismatch → reject.

R7. A second manifest for the same trade_id + subject_hash without a supersedes
    pointer → reject (not warn).

R8. Encrypted or private assets required for claim-grade promotion must have
    an explicit key_release_condition or arbiter reveal path. Absent → reject.
```

---

## Minimal Patch List

Changes needed before a validator can be built that is not locally invented:

```
P1. Define json-c14n-v0. Either adopt JCS (RFC 8785) by reference with a
    test vector, or write the algorithm inline. One paragraph, one vector.

P2. Define asset_root_hash construction. Specify: leaf = sha256(canonical_json(descriptor)),
    leaves sorted by asset_id lexicographic order, tree = sha256(concat(leaves))
    for flat or a named Merkle library for tree. One algorithm. One test vector.

P3. Define freshness windows per tier. Example table:
    sparse: no constraint
    standard: issued_at within 30 days
    challenge_bound: issued_at within 24h of capture_session.expires_at
    verified: issued_at within 7 days
    claim_grade: no expiry, but all leaf timestamps must be present.

P4. Add supersession authority rule. Either: supersession issuer must match
    original manifest issuer, OR the protocol must define which roles can
    supersede which. State this as a required gate, not a guideline.

P5. Promote evidence_tier to required in EvidenceManifest. Add a validator
    default rule: if absent, treat as sparse and apply sparse gate only.

P6. Add stream leaf count invariant to the reject list.

P7. Add explicit validator behavior for unavailable bytes: when bytes cannot
    be fetched at promotion time, state whether the declared hash is trusted
    provisionally (with a warn) or the manifest is held pending verification.
    The spec currently implies neither.
```

---

## Wording To Avoid

```
"Merkle root or deterministic root"
  — Pick one. "Or" makes the computation non-deterministic across implementations.

"allowed freshness windows"
  — Meaningless without the table. Replace with the actual values or a reference.

"json-c14n-v0"
  — A label, not a spec. Replace with a standard name or an inline definition.

"impossible to miss"
  — The spec correctly hedges in the final section. The intro overclaims.
  An ambiguous canonicalization makes the boundary very missable.

"This can initially live off-chain by treating the existing attachEvidence hash
as the evidenceManifestHash"
  — This is a compatibility hack that inverts the spec's own principle.
  attachEvidence hashes are not validated manifests. Calling them equivalent
  recreates the original gap for the transition period.
```

---

## What Iris Should Not Infer

- That `json-c14n-v0` is an existing standard. It is a name invented in this spec.
- That the validator exists. The acceptance tests are a build target, not a passing suite.
- That the `asset_root_hash` has a deterministic computation path across agents. It does not yet.
- That a `challenge_nonce` field in a descriptor means the nonce is visible in the image. The protocol cannot check image pixels. The field is a claim by the issuer.
- That the EVM contract snippet is deployable. It is marked explicitly as a possible future primitive.
- That `evidence_tier: "verified"` means a verifier reviewed anything. Tier is self-declared by the manifest issuer and is a recommended field.
- That the dual-hash requirement (`sha256` + `keccak256`) provides independent verification. Both hash the same bytes declared by the same issuer. They are redundant representations, not independent attestations.
- That claim-grade tier implies arbiter or insurer acceptance. The spec explicitly denies this, but the tier name will create inference pressure anyway.
