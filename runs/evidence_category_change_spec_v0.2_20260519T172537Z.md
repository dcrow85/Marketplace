# Evidence Category Change Spec v0.2

Generated: 2026-05-19T17:25:37Z

Status: implementation target for the off-chain `EvidenceManifest` validator. Solidity remains out of scope for this pass.

## Version Delta From v0.1

This patch keeps the v0.1 principle:

```text
A packet hash protects the packet. It does not protect a photo unless the packet commits to the photo bytes.
```

The v0.2 hardening is about deterministic preimages. A validator cannot protect evidence if agents disagree about what was hashed.

New in v0.2:

- canonical manifest serialization
- canonical `asset_root_hash`
- canonical `subject_hash`
- issuer role authority checks
- executable evidence tier requirements
- freshness windows
- unavailable-byte behavior by tier
- supersession authority rules
- source origin vs capture mode split
- byte-switch and URL-switch falsifier drills

## Canonical JSON

`marketplace-json-c14n-v0.2` is the canonical serialization for this validator generation.

Rules:

- UTF-8 JSON bytes.
- Object keys sorted lexicographically.
- No insignificant whitespace.
- Strings are JSON escaped by the implementation.
- Numbers must be integers or strings; floats are invalid in protocol packets.
- `NaN`, `Infinity`, and `-Infinity` are invalid.
- Hashes are lowercase hex strings unless an EVM boundary explicitly uses `0x` bytes32.

Reference Python expression:

```python
json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")
```

Test vector:

```json
{"b":2,"a":"card","nested":{"z":0,"a":1}}
```

Canonical bytes as UTF-8 text:

```text
{"a":"card","b":2,"nested":{"a":1,"z":0}}
```

## Hash Types

### `asset_hash`

Actual bytes of an image, PDF, JSON response, HTML snapshot, video, memo, or other evidence asset.

Required for non-weak primary assets:

- `sha256`: SHA-256 over exact bytes.
- `keccak256`: Ethereum Keccak-256 over exact bytes, represented as `0x` plus 64 lowercase hex characters.
- `byte_length`: exact byte count.

### `asset_root_hash`

Root over the manifest's asset descriptors.

Algorithm:

1. Validate every `asset_id` is unique.
2. Sort descriptors by `asset_id` lexicographically.
3. For each descriptor, compute:

```text
leaf = SHA256(0x00 || marketplace-json-c14n-v0.2(asset_descriptor))
```

4. If there are no leaves:

```text
asset_root_hash = SHA256("marketplace.asset_root.empty.v0.2")
```

5. Otherwise build a binary tree:

```text
parent = SHA256(0x01 || left || right)
```

6. If a level has an odd number of nodes, duplicate the final node.
7. The final 32-byte value, lower hex without `0x`, is `asset_root_hash`.

The root commits to descriptor claims, not to storage availability at future time. Availability remains a separate validation concern.

### `subject_hash`

Evidence is never just "about the trade." It is about a specific subject inside the trade.

For v0.2, every subject hash is:

```json
{
  "schema": "marketplace.subject_hash.v0.2",
  "subject_type": "item_fingerprint|inventory_lock|route|delivery|receipt|claim|fingerprint_challenge|verifier_attestation|trust_source|other",
  "trade_id": "string-or-integer-as-string",
  "anchor_hash": "hash-of-the-subject-packet-or-chain-record"
}
```

Then:

```text
subject_hash = SHA256(marketplace-json-c14n-v0.2(subject_preimage))
```

The `anchor_hash` must be the canonical hash already used for that subject's packet or chain record. A seller-authored description is not a valid anchor.

### `evidence_manifest_hash`

Hash of the manifest body, excluding `manifest_hash` and `signature`.

```text
manifest_hash = SHA256(marketplace-json-c14n-v0.2(manifest_without_manifest_hash_and_signature))
```

The signature must bind to this `manifest_hash`. The current local drill uses a deterministic local signature stub only to prove mutation detection; production signatures must use actor registry keys.

## Schema: `marketplace.asset_descriptor.v0.2`

Required fields:

```json
{
  "schema": "marketplace.asset_descriptor.v0.2",
  "asset_id": "stable-local-id",
  "role": "front_photo|back_photo|edge_photo|corner_photo|surface_video|slab_photo|cert_snapshot|tracking_snapshot|shipping_label|dropoff_receipt|delivery_photo|insurance_document|marketplace_profile_snapshot|shop_proof|claim_document|retrieval_snapshot|memo|other",
  "media_type": "image/jpeg|image/png|application/pdf|application/json|text/html|video/mp4|text/plain|application/octet-stream|other",
  "byte_length": 12345,
  "sha256": "64-lowercase-hex",
  "keccak256": "0x-prefixed-64-lowercase-hex",
  "storage_refs": [],
  "visibility": "public|buyer_only|buyer_arbiter|arbiter_only|encrypted_commitment|private_unreleased",
  "created_at": "ISO-8601-or-null",
  "captured_at": "ISO-8601-or-null",
  "source": {
    "origin": "carrier|marketplace|shop|seller|buyer|verifier|arbiter|insurer|agent|other",
    "capture_mode": "issuer_signed|agent_captured|manual_upload|screenshot|memo|generated_fixture"
  },
  "weak_supplemental": false
}
```

Storage refs:

```json
{
  "kind": "file|https_url|mock_url|ipfs_cid|arweave|content_addressed_store|encrypted_blob",
  "uri": "location-or-id",
  "mutable": true,
  "primary": true
}
```

Rules:

- A non-weak primary asset must be fetchable or revealable at validation time for `standard`, `challenge_bound`, `verified`, and `claim_grade` tiers.
- A mutable primary ref must include `retrieval_snapshot_asset_id` pointing to another descriptor.
- A mutable URL is a pointer, not authority. Its fetched bytes must still match the descriptor hashes.
- `perceptual_hash` may be present only as a matching hint. It cannot satisfy a cryptographic gate.

## Schema: `marketplace.evidence_manifest.v0.2`

Required fields:

```json
{
  "schema": "marketplace.evidence_manifest.v0.2",
  "trade_id": "protocol-trade-id",
  "manifest_id": "stable-local-id",
  "issuer": "actor-id-or-did",
  "issuer_role": "buyer|seller|verifier|arbiter|shop|marketplace|carrier|insurer|agent",
  "evidence_tier": "sparse|standard|challenge_bound|verified|claim_grade",
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

## Issuer Role Authority

`issuer_role` is not self-authorizing.

Validator rule:

```text
declared issuer_role must match registry role, trusted issuer mapping, or signed delegation chain
```

Examples:

- A seller cannot issue a manifest as `verifier`.
- A seller agent can issue as `agent` only if delegated by the seller.
- A carrier API response is `carrier` only if issuer signed it or the protocol has a trusted carrier adapter. Otherwise it is `agent_captured` evidence with `origin: carrier`.

## Tier Requirements

### Sparse

Purpose: low-value or high-trust evidence.

Required:

- valid manifest structure
- valid issuer signature
- valid subject hash

Allowed:

- weak supplemental assets
- unavailable bytes with warning

Must display:

```text
Sparse evidence. Asset bytes may be unavailable or weak.
```

### Standard

Purpose: normal card trade evidence.

Required:

- content-hashed `front_photo`
- content-hashed `back_photo`
- fetched bytes match both `sha256` and `keccak256`
- issuer role authority

Reject:

- mutable primary evidence without retrieval snapshot
- weak supplemental asset satisfying required photo role

### Challenge Bound

Purpose: buyer challenge, new seller, contested identity, or higher value.

Required:

- all standard requirements
- `capture_session`
- nonce entropy at least 128 bits
- required photo descriptors carry the challenge nonce
- `captured_at` is after session issue and before session expiry

The validator can verify nonce fields and timing. Pixel-level confirmation that the nonce visibly appears in an image remains a verifier or computer-vision task, not a pure schema check.

### Verified

Purpose: verifier-reviewed evidence.

Required:

- all standard or challenge-bound requirements selected by buyer policy
- nonempty `verifier_attestation_refs`
- attestation issuer role checks
- attestation scope and method compliance

The tier name must not be displayed as "verified card" unless the attestation scope actually supports that exact claim.

### Claim Grade

Purpose: insurance, arbitration, non-delivery, damage, substitution, or disputed receipt.

Required:

- event timestamps for all relevant route, delivery, receipt, and claim evidence
- bytes retrievable or encrypted reveal path valid
- retention policy with minimum 180 days
- all superseded manifests remain discoverable
- known conflicts are preserved

Reject:

- HTTPS-only primary evidence with no immutable storage or reveal path
- private commitments with no arbiter reveal path
- missing superseded manifest reference when `supersedes` is present

## Freshness Windows

Default validator windows:

| Tier | Rule |
| --- | --- |
| `sparse` | no strict freshness; display warning |
| `standard` | issued within 30 days of capture unless buyer waives |
| `challenge_bound` | captured after challenge issue and before challenge expiry |
| `verified` | verifier attestation issued within 7 days of reviewed inputs unless method specifies stricter |
| `claim_grade` | no expiry, but all event timestamps and retrieval or reveal paths are required |

## Unavailable Bytes

If bytes cannot be fetched or revealed at validation time:

| Tier | Behavior |
| --- | --- |
| `sparse` | warn |
| `standard` | reject if a required primary asset is unavailable |
| `challenge_bound` | reject |
| `verified` | reject if the unavailable asset is an input required by the attestation |
| `claim_grade` | reject unless an encrypted reveal path is valid |

## Supersession

Evidence is append-only. Supersession does not erase old evidence.

Authority rules:

- The original issuer may supersede their own manifest.
- A buyer may add conflicting evidence, but cannot erase seller evidence.
- An arbiter may mark reliance or non-reliance, but cannot delete the chain.
- Active-trade supersession of required evidence needs buyer acknowledgment or a signed waiver.
- Claim packets must include both the old and new manifests.

## Validator Error Families

The off-chain validator should emit stable codes:

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

## Falsifier Drill

Minimum drill before Solidity:

1. Build a valid standard manifest with content-hashed front and back fixture assets.
2. Validate it cleanly.
3. Switch one byte in the front image file without changing the manifest. Validator must reject with `ASSET_HASH_MISMATCH`.
4. Build a valid manifest whose primary front asset comes from a mutable URL with a retrieval snapshot.
5. Validate it cleanly against the original URL bytes.
6. Change the URL catalog to return different bytes without changing the manifest. Validator must reject with `ASSET_HASH_MISMATCH`.
7. Mutate manifest text without recomputing `manifest_hash`. Validator must reject with `MANIFEST_HASH`.
8. Declare `issuer_role: verifier` from a seller issuer. Validator must reject with `ROLE_AUTHORITY`.
9. Declare `evidence_tier: verified` without verifier attestation refs. Validator must reject with `TIER_REQUIREMENT`.
10. Use mutable primary evidence without a retrieval snapshot. Validator must reject with `MUTABLE_PRIMARY`.

## Build Order

1. Implement `EvidenceManifest` validator and fixture drill in Python.
2. Run the falsifier drill and write report artifacts under `/Users/che/Marketplace/runs/evidence_manifest_drill_*`.
3. Update the collision and E2E runners to produce v0.2 manifests for photo and claim evidence.
4. Only after these local validators are passing, consider a contract helper for `evidenceManifestHash`.

## What v0.2 Still Does Not Prove

- Hashes do not prove truth.
- Hashes do not prove current custody.
- Hashes do not prove authenticity.
- Nonce fields do not prove the nonce is visible in image pixels.
- Agent-captured carrier or marketplace pages are not issuer-signed responses.
- Private evidence is not useful for claims without a reveal path.
- Evidence tier names are not trust badges until mechanically validated.
