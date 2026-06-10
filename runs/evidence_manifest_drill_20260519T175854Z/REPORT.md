# EvidenceManifest Drill: evidence_manifest_drill_20260519T175854Z

- Generated: `2026-05-19T17:58:54.629423+00:00`
- Spec: `marketplace.evidence_manifest.v0.2`
- Canonicalization: `marketplace-json-c14n-v0.2`
- Cases: `7`
- Passed: `True`

## Result

The off-chain validator accepts a clean `EvidenceManifest` with content-hashed front/back assets, then rejects evidence when the underlying bytes or mutable URL contents are switched without a matching manifest update. It also rejects stale manifest hashes, role inflation, self-declared verified tier evidence, and mutable primary evidence without a retrieval snapshot.

## Falsifier Matrix

| Case | Expected | Outcome | Passed | Error |
| --- | --- | --- | --- | --- |
| Valid standard manifest | validator accepts content-hashed front/back assets | `valid` | `True` | `none` |
| Byte switch after manifest anchor | validator rejects mutated image bytes with same manifest | `rejected` | `True` | `ASSET_HASH_MISMATCH` |
| Mutable URL content switch | validator rejects URL bytes that no longer match descriptor hashes | `rejected` | `True` | `ASSET_HASH_MISMATCH` |
| Manifest mutation without rehash | validator rejects changed manifest body with stale manifest_hash | `rejected` | `True` | `MANIFEST_HASH` |
| Seller declares verifier role | validator rejects issuer_role not backed by actor authority | `rejected` | `True` | `ROLE_AUTHORITY` |
| Verified tier without verifier attestation | validator rejects self-declared verified evidence | `rejected` | `True` | `TIER_REQUIREMENT` |
| Mutable primary ref without retrieval snapshot | validator rejects mutable primary evidence with no snapshot descriptor link | `rejected` | `True` | `MUTABLE_PRIMARY` |

## Case Notes

### Valid standard manifest

- Slug: `valid_standard`
- Outcome: `valid`
- Passed expectation: `True`
- Error code: `none`
- Error message: `none`

### Byte switch after manifest anchor

- Slug: `byte_switch`
- Outcome: `rejected`
- Passed expectation: `True`
- Error code: `ASSET_HASH_MISMATCH`
- Error message: `sha256 mismatch for front-photo`
- Observations:
  - pre-switch valid: True
  - mutated file: assets/byte_switch/front.png

### Mutable URL content switch

- Slug: `url_switch`
- Outcome: `rejected`
- Passed expectation: `True`
- Error code: `ASSET_HASH_MISMATCH`
- Error message: `byte_length mismatch for front-photo-url`
- Observations:
  - pre-switch valid: True
  - mock URL catalog now returns different bytes

### Manifest mutation without rehash

- Slug: `manifest_hash_cosmetic`
- Outcome: `rejected`
- Passed expectation: `True`
- Error code: `MANIFEST_HASH`
- Error message: `manifest_hash mismatch`

### Seller declares verifier role

- Slug: `role_inflation`
- Outcome: `rejected`
- Passed expectation: `True`
- Error code: `ROLE_AUTHORITY`
- Error message: `did:market:seller:fixture-1 is not authorized as verifier`

### Verified tier without verifier attestation

- Slug: `tier_inflation`
- Outcome: `rejected`
- Passed expectation: `True`
- Error code: `TIER_REQUIREMENT`
- Error message: `verified tier requires attestation refs`

### Mutable primary ref without retrieval snapshot

- Slug: `mutable_primary_no_snapshot`
- Outcome: `rejected`
- Passed expectation: `True`
- Error code: `MUTABLE_PRIMARY`
- Error message: `mutable primary ref needs retrieval_snapshot_asset_id: front-photo-url`

## What This Proves

- The manifest hash is recomputed from canonical JSON instead of trusted as a field.
- The asset root is recomputed from sorted descriptor leaves.
- Every primary asset's bytes are fetched and rehashed before promotion.
- A changed image file fails even though the manifest is unchanged.
- A changed mutable URL response fails even though the manifest is unchanged.
- `issuer_role` is treated as authority-bound, not self-declared text.
- `evidence_tier` is mechanically checked, not accepted as a seller badge.

## Still Not Proven

- The fixture bytes are not real card images.
- The local signature is a deterministic drill stub, not production actor cryptography.
- The validator does not inspect pixels to prove a nonce is visible in a photo.
- The validator does not integrate carrier, marketplace, shop, cert authority, or insurer APIs.
- No Solidity primitive has been added or exercised in this pass.

## Next Hardening Target

Promote this validator into the E2E and fingerprint collision runners so photo and claim evidence packets become v0.2 `EvidenceManifest` packets before their hashes are anchored.
