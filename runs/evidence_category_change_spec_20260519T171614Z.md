# Evidence Category Change Spec

Generated: 2026-05-19T17:16:14Z

Status: candidate hardening target. This is not yet promoted into the protocol core or contract implementation.

## Goal

Make evidence packets strong enough that a buyer agent, seller agent, verifier, arbiter, insurer, or later protocol adapter can tell exactly which real-world bytes were offered as evidence, who signed the packet that referenced them, what those bytes were supposed to prove, and what they still do not prove.

The current hash boundary is too easy to misunderstand. A signed packet hash protects the packet. It does not automatically protect a photo, scan, tracking page, shipping receipt, marketplace screenshot, or insurance document unless the packet commits to the actual evidence bytes.

The new evidence category should make this difference impossible to miss:

- `asset_hash`: hash of the actual bytes, such as an image, PDF, JSON response, video, or snapshot.
- `asset_root_hash`: Merkle root or deterministic root over all asset descriptors in a manifest.
- `evidence_manifest_hash`: canonical hash of the manifest that lists assets, roles, scopes, storage pointers, visibility, and subject bindings.
- `subject_hash`: the trade object, challenge, fingerprint, inventory lock, route, delivery event, receipt, claim, or ruling the evidence is about.
- `attestation_hash`: a verifier, shop, carrier, marketplace, or arbiter claim about evidence and method. This may reference a manifest, but it is not the same thing as the manifest.

## Current Boundary

Already implemented or simulated:

- The contract anchors hashes and actor signatures.
- The local runners generate canonical JSON packets.
- Evidence packets can be attached to trades.
- Item fingerprinting now has collision drills and verifier challenge clearance.
- Verifier scope work has started to separate assignment from actual verification.

Current gap:

- Some simulated evidence uses string refs, URLs, or structured claims as if they were evidence.
- A mutable URL can still look stronger than it is.
- The system does not yet require evidence assets to be content-hashed.
- Image, scan, carrier, and claim bytes are not first-class protocol objects.
- There is no deterministic evidence manifest validator before a hash becomes protocol evidence.

## Principle

Evidence is a bundle of bytes plus context. The bytes prove only that those bytes existed. The context says what those bytes are being offered to support. Neither one should be collapsed into the other.

The protocol should never say:

```text
This URL is evidence.
```

It should say:

```text
This manifest says the seller offered these exact bytes as a front image,
these exact bytes as a back image, this exact snapshot as a carrier event,
and this signer claims those assets support this subject.
```

## New Packet Family

### `marketplace.asset_descriptor.v0.1`

One descriptor per binary or structured asset.

Required fields:

```json
{
  "schema": "marketplace.asset_descriptor.v0.1",
  "asset_id": "stable-local-id",
  "role": "front_photo|back_photo|edge_photo|corner_photo|surface_video|slab_photo|cert_snapshot|tracking_snapshot|shipping_label|dropoff_receipt|delivery_photo|insurance_document|marketplace_profile_snapshot|shop_proof|claim_document|other",
  "media_type": "image/jpeg|image/png|application/pdf|application/json|text/html|video/mp4|text/plain|other",
  "byte_length": 12345,
  "sha256": "hex-or-multibase",
  "keccak256": "hex",
  "storage_refs": [],
  "visibility": "public|buyer_only|buyer_arbiter|arbiter_only|encrypted_commitment|private_unreleased",
  "created_at": "ISO-8601-or-null",
  "captured_at": "ISO-8601-or-null",
  "source_type": "seller_capture|buyer_capture|verifier_capture|carrier_api|marketplace_api|shop_site|manual_upload|memo|other",
  "weak_supplemental": false
}
```

Recommended fields:

```json
{
  "normalized_sha256": "optional hash of a deterministic normalized render",
  "perceptual_hash": "optional matching hint, never a cryptographic gate",
  "capture_device_claim": "optional",
  "issuer": "actor-id-or-did",
  "issuer_signature_ref": "optional",
  "challenge_nonce": "optional buyer/protocol nonce shown in the asset",
  "capture_session_id": "optional",
  "redaction_policy": "none|clear_to_buyer|clear_to_arbiter|salted_commitment|encrypted_envelope",
  "salted_commitment": "optional",
  "encryption": {
    "ciphertext_sha256": "optional",
    "recipient_policy": "buyer|arbiter|buyer_or_arbiter|claim_only",
    "key_release_condition": "optional"
  }
}
```

### `marketplace.evidence_manifest.v0.1`

The signed manifest that binds assets to a subject.

Required fields:

```json
{
  "schema": "marketplace.evidence_manifest.v0.1",
  "trade_id": "protocol-trade-id",
  "manifest_id": "stable-local-id",
  "issuer": "actor-id-or-did",
  "issuer_role": "buyer|seller|verifier|arbiter|shop|marketplace|carrier|insurer|agent",
  "subject": {
    "subject_type": "item_fingerprint|inventory_lock|route|delivery|receipt|claim|ruling|trust_source|fingerprint_challenge|other",
    "subject_hash": "bytes32",
    "subject_version": "optional"
  },
  "asset_descriptors": [],
  "asset_root_hash": "bytes32",
  "issued_at": "ISO-8601",
  "canonicalization": "json-c14n-v0",
  "manifest_hash": "bytes32",
  "signature": "actor-signature-over-manifest-hash"
}
```

Recommended fields:

```json
{
  "evidence_tier": "sparse|standard|challenge_bound|verified|claim_grade",
  "capture_session": "capture_session_id",
  "known_limits": [],
  "known_conflicts": [],
  "supersedes": "prior_manifest_hash_or_null",
  "supersession_reason": "correction|additional_evidence|redaction|challenge_response|claim_update|other",
  "retention_policy": {
    "minimum_retention_days": 180,
    "storage_strategy": "ipfs|arweave|content_addressed_object_store|versioned_s3|local_agent_cache|other"
  }
}
```

### `marketplace.capture_session.v0.1`

Used when the buyer, protocol, verifier, or arbiter asks for fresh evidence.

Required fields:

```json
{
  "schema": "marketplace.capture_session.v0.1",
  "trade_id": "protocol-trade-id",
  "session_id": "stable-local-id",
  "requested_by": "buyer|seller|verifier|arbiter|agent|protocol",
  "nonce": "random challenge string",
  "requested_assets": ["front_photo", "back_photo"],
  "display_instruction": "plain-language instruction",
  "expires_at": "ISO-8601",
  "subject_hash": "bytes32"
}
```

The nonce can appear in an image, a short video, a handwritten note, a screen recording, a shop terminal display, or a structured API response. Metadata alone is not enough. EXIF and timestamps are useful hints, not authority.

### `marketplace.evidence_supersession.v0.1`

Evidence is append-only. Updates do not mutate old evidence.

Required fields:

```json
{
  "schema": "marketplace.evidence_supersession.v0.1",
  "trade_id": "protocol-trade-id",
  "old_manifest_hash": "bytes32",
  "new_manifest_hash": "bytes32",
  "reason": "correction|additional_evidence|redaction|challenge_response|claim_update|other",
  "issued_at": "ISO-8601",
  "issuer": "actor-id-or-did",
  "signature": "actor-signature"
}
```

Old manifests must remain discoverable in claim packets. Supersession can lower current operational reliance on old evidence, but it cannot erase the fact that old evidence existed.

### `marketplace.evidence_stream_checkpoint.v0.1`

For long-running or data-rich trades, evidence can arrive as a stream.

Required fields:

```json
{
  "schema": "marketplace.evidence_stream_checkpoint.v0.1",
  "trade_id": "protocol-trade-id",
  "from_sequence": 1,
  "to_sequence": 8,
  "leaf_hashes": [],
  "stream_root_hash": "bytes32",
  "issued_at": "ISO-8601",
  "issuer": "actor-id-or-did",
  "signature": "actor-signature"
}
```

This lets agents and arbiters checkpoint a shipping trail, claim packet, or verification series without putting every asset on-chain.

## How This Prevents Image Switching

Attack: seller uploads a front photo to a mutable URL, anchors a packet that references the URL, then replaces the image after the buyer or arbiter reads it.

New behavior:

- The URL is only a storage ref.
- The asset descriptor contains `sha256`, `keccak256`, `byte_length`, `media_type`, and role.
- If the bytes at the URL change, the asset hash no longer matches.
- If the seller changes the asset hash in the manifest, the manifest hash changes.
- If the manifest hash changes, the actor signature and on-chain anchor no longer match the original evidence event.
- If the seller submits a corrected manifest, it must be append-only through supersession, so the old and new packets are both visible.

This does not prove the photo is true, fresh, or of the actual card. It proves only that the claimed evidence bytes cannot be silently swapped after anchoring.

## Raw And Normalized Hashing

Use raw byte hashes for integrity:

- `sha256`: default cross-system file digest.
- `keccak256`: EVM-friendly binding and current contract language.

Use normalized hashes only as an additional convenience:

- `normalized_sha256`: hash after deterministic normalization such as image orientation, metadata stripping, and fixed PNG render.
- Useful when phone software rewrites metadata or recompresses a file.
- Not a replacement for raw byte hashing.

Use perceptual hashes only as matching hints:

- Good for "this looks like the same front image."
- Not collision-resistant.
- Not suitable as a route, claim, escrow, or arbitration gate by itself.

## Mutable References

Mutable references are allowed, but they must be typed honestly:

```json
{
  "storage_refs": [
    {
      "kind": "https_url",
      "uri": "https://example.com/photo.jpg",
      "mutable": true,
      "primary": false
    },
    {
      "kind": "ipfs_cid",
      "uri": "ipfs://...",
      "mutable": false,
      "primary": true
    }
  ],
  "weak_supplemental": false
}
```

Rules:

- A mutable URL cannot be primary evidence unless paired with the exact content hash and a retrieval snapshot.
- A memo or non-standard shipping link can be included, but is `weak_supplemental` unless the bytes are snapshotted and hashed.
- A signed issuer response, such as carrier API JSON, marketplace API response, or shop-site proof, is stronger than a screenshot of that response.
- A screenshot can still matter, especially for insurance and arbitration, but the protocol should name it as screenshot evidence, not issuer evidence.

## Shipping And Insurance Evidence

Shipping evidence should be represented as the same asset/manifest pattern.

Examples:

- Carrier tracking API JSON: content-hashed asset, source type `carrier_api`, role `tracking_snapshot`.
- Tracking page HTML/PDF snapshot: content-hashed asset, source type `carrier_page`, role `tracking_snapshot`.
- Shipping label: content-hashed PDF or image, role `shipping_label`.
- Dropoff receipt: content-hashed image or PDF, role `dropoff_receipt`.
- Delivery photo: content-hashed image, role `delivery_photo`.
- Insurance purchase proof: content-hashed PDF/JSON, role `insurance_document`.
- Claim form and correspondence: content-hashed PDF/HTML/email export, role `claim_document`.
- Non-standard shipping memo: content-hashed text or image, role `memo`, `weak_supplemental` unless signed by a trusted issuer.

The insurance claim packet should be able to ask:

```text
Show me every manifest and asset descriptor relevant to route, delivery, declared value, insurance purchase, buyer receipt, and claim event.
```

That packet should not rely on a live web page still existing.

## Privacy And Selective Disclosure

The evidence layer must support private evidence without pretending private evidence is public proof.

Modes:

- `public`: anyone can fetch and hash-check the asset.
- `buyer_only`: buyer can fetch clear bytes.
- `buyer_arbiter`: buyer and arbiter can fetch clear bytes.
- `arbiter_only`: clear bytes are available only if a claim opens.
- `encrypted_commitment`: ciphertext is stored; digest of clear bytes and ciphertext is committed; key release is policy-bound.
- `private_unreleased`: only a commitment is present. This is weak for arbitration unless there is a clear reveal path.

Low-entropy private evidence needs salt. Tracking numbers, cert IDs, phone numbers, addresses, and order IDs may be guessable from bare hashes. Use salted commitments or encrypted envelopes where disclosure risk matters.

## Evidence Tiers

Agents should negotiate evidence based on value, seller trust, route, shipping risk, user attention, and seller attention. Not every trade needs the same burden.

### Sparse

For low-value or high-trust trades.

Minimum:

- item claim
- seller signature
- optional image refs
- weak supplemental links allowed if buyer accepts the risk

Must not imply:

- fresh custody
- condition floor
- authenticity
- insurance readiness

### Standard

For common mid-value trades.

Minimum:

- content-hashed front and back image assets
- evidence manifest signed by seller
- shipping method and cost terms
- receipt closure packet at settlement

Must not imply:

- verifier reviewed the assets
- photos are fresh unless a capture session says so

### Challenge Bound

For buyer concern, new seller, contested card, or higher-value trade.

Minimum:

- capture session with nonce
- nonce-bound front/back or slab/cert assets
- manifest signed after challenge issue time
- explicit `known_limits`

Must not imply:

- third-party truth unless verifier or shop attestation is present

### Verified

For higher-value or lower-trust trades.

Minimum:

- content-hashed asset manifest
- verifier scope attestation
- method-specific checklist
- exact claims and exact non-claims
- conflict disclosure

Must not imply:

- "card is authentic" unless the verifier's method, authority, and scope explicitly support that narrow claim.

### Claim Grade

For insurance, arbitration, damage, non-delivery, or substitution disputes.

Minimum:

- route manifest
- delivery or pickup manifest
- receipt or claim manifest
- all superseded manifests
- relevant asset bytes or release path
- chain of signatures and timestamps

Must not imply:

- insurer acceptance
- arbiter ruling
- fraud

## Validator Gates

Add a deterministic off-chain validator before a manifest hash is anchored or promoted as claim-grade evidence.

Reject when:

- `schema` is unknown.
- `trade_id` is missing.
- `subject_hash` is missing for subject-bound evidence.
- `asset_descriptors` is empty for any manifest above sparse tier.
- primary assets lack `sha256`, `keccak256`, `byte_length`, or `media_type`.
- a mutable URL is marked as primary evidence without a content hash and retrieval snapshot.
- `role` is unknown or incompatible with the subject type.
- `issued_at` is missing or outside allowed freshness windows.
- challenge-bound evidence lacks the expected nonce.
- `weak_supplemental` evidence is used to satisfy a required primary role.
- a second manifest for the same subject appears without `supersedes`.
- an encrypted/private asset lacks a key-release policy when it is required for claim-grade evidence.
- display or claim text collapses the evidence into forbidden labels such as "verified," "safe," "guaranteed," or "authentic" without scoped support.

Warn when:

- EXIF is the only freshness signal.
- perceptual hash is presented as a gate.
- raw and normalized hashes disagree in unexpected ways.
- storage refs have no replication or retention policy.
- important evidence is private with no arbiter reveal path.

## Contract Boundary

The EVM contract should not parse images, JSON, EXIF, carrier APIs, or arbitrary manifests.

The contract should anchor:

- `evidenceManifestHash`
- optional `assetRootHash`
- `subjectHash`
- `issuer`
- typed signature binding

Possible future primitive:

```solidity
commitEvidenceManifest(
    uint256 tradeId,
    bytes32 evidenceManifestHash,
    bytes32 subjectHash,
    bytes32 assetRootHash,
    EvidenceKind kind,
    bytes calldata signature
)
```

Typed binding:

```solidity
keccak256(abi.encode(
    EVIDENCE_MANIFEST_TYPEHASH,
    tradeId,
    evidenceManifestHash,
    subjectHash,
    assetRootHash,
    kind
))
```

This can initially live off-chain by treating the existing `attachEvidence` hash as the `evidenceManifestHash`, as long as validators and agents agree that only validated manifests are promoted as strong evidence.

## Interaction With Fingerprint Challenges

Fingerprint challenge cure should reference an evidence manifest, not loose photos.

Example flow:

1. Buyer opens `FingerprintChallenge` with requested roles: `front_photo`, `back_photo`, `slab_photo`, `nonce_in_frame`.
2. Seller creates `CaptureSession` and image assets.
3. Seller signs `EvidenceManifest` with asset descriptors and challenge nonce.
4. Verifier reviews the manifest and signs `VerifierScopeAttestation` that names the manifest hash, challenge hash, inputs seen, method, and non-claims.
5. Buyer clears challenge only when the attestation is bound to the active challenge and the cure manifest satisfies the requested roles.

The current contract already checks the buyer's challenge-clearance signature and bound attestation hash. The evidence category needs the off-chain validator that says the cure manifest actually contained the expected nonce-bound assets.

## Claim Packet Assembly

A claim packet should include:

- all relevant evidence manifests
- all superseded manifests
- asset descriptors
- available clear bytes or retrieval/reveal paths
- storage availability status
- signatures
- route and delivery events
- insurance purchase and declared value evidence
- buyer receipt or rejection evidence
- verifier or arbiter attestations
- unresolved contradictions

Agents should preserve contradictions. The claim packet should say "front photo in manifest A conflicts with front photo in manifest B," not average the conflict away.

## Acceptance Tests

The next implementation pass should add a local evidence-manifest drill with these cases:

1. Byte switch: hash an image, change one byte, confirm the validator detects asset hash mismatch.
2. URL switch: manifest references a mutable URL plus content hash; retrieved bytes change; validator reports mismatch.
3. Manifest mutation: change asset role or digest after signing; manifest hash/signature no longer matches.
4. Mutable primary rejection: manifest tries to satisfy required front photo with a mutable URL and no content hash; validator rejects.
5. Challenge nonce miss: seller submits photos after a challenge but nonce is absent; validator rejects challenge cure.
6. Weak supplemental misuse: seller tries to satisfy shipping proof with a memo link only; validator rejects for claim-grade packet and warns for sparse tier.
7. Supersession integrity: corrected manifest supersedes old manifest; claim packet still includes both.
8. Private evidence reveal: encrypted asset has commitment but no arbiter release policy; validator rejects claim-grade promotion.
9. Perceptual hash misuse: manifest tries to use perceptual hash as cryptographic digest; validator rejects.
10. Raw/normalized distinction: raw hash changes after recompression but normalized hash matches; validator warns and requires explicit supersession rather than silent replacement.

## Build Order

1. Add schema files or Python dataclasses for `AssetDescriptor`, `EvidenceManifest`, `CaptureSession`, `EvidenceSupersession`, and `EvidenceStreamCheckpoint`.
2. Add canonical hashing helper for manifests and assets.
3. Add validator rules and error codes.
4. Add local fixture assets and the byte-switch drill.
5. Update `protocol_e2e.py` and `fingerprint_collision_drill.py` so image and claim evidence are manifests with asset descriptors.
6. Update `protocol.html` to explain "hash protects bytes, signature protects manifest, neither proves truth."
7. Only after the validator exists, consider a contract helper that distinguishes `evidenceManifestHash` from generic evidence hash.

## Decisions Needed

1. Should v0.1 require both `sha256` and `keccak256`, or only `sha256` with `keccak256` derived for EVM anchoring?
2. Should raw and normalized image digests both be mandatory for photo roles, or should normalized digest be optional until the validator matures?
3. Which evidence tiers should be allowed to settle without content-hashed image assets?
4. What is the default privacy mode for buyer addresses, tracking numbers, shop receipts, and insurance documents?
5. Should high-value route be blocked unless required evidence manifests validate, or should that remain buyer-agent policy for alpha?

## What This Spec Does Not Claim

- It does not prove photos are fresh unless challenge and capture windows are satisfied.
- It does not prove a seller actually possesses the item unless custody evidence supports that claim.
- It does not prove authenticity.
- It does not replace verifier or arbiter judgment.
- It does not make mutable web links reliable.
- It does not prevent collusion.
- It does not make private evidence useful without a reveal path.

It does make evidence harder to silently swap, harder to overstate, and easier for agents to reason about at the exact level of authority it deserves.
