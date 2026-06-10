# EvidenceManifest v0.3 Drill: evidence_manifest_v0_3_drill_20260519T180645Z

- Generated: `2026-05-19T18:06:46.819643+00:00`
- Spec: `marketplace.evidence_manifest.v0.3`
- Canonicalization: `canonical-json-payload-v1`
- Hash algorithm: `keccak256(utf8(canonical-json-payload-v1))`
- Cases: `8`
- Passed: `True`

## Result

This drill exercises the same v0.3 manifest validator used by `protocol_e2e.py`, closing the coverage split where the standalone manifest falsifiers still targeted v0.2.

## Falsifier Matrix

| Case | Expected | Outcome | Passed | Error |
| --- | --- | --- | --- | --- |
| Valid v0.3 standard manifest | validator accepts content-hashed v0.3 front/back assets | `valid` | `True` | `none` |
| v0.3 byte switch after manifest build | validator rejects mutated primary bytes with unchanged descriptor hashes | `rejected` | `True` | `asset byte_length mismatch for front-photo` |
| v0.3 asset root mismatch | validator rejects a stale or forged asset_root_hash | `rejected` | `True` | `manifest asset_root_hash mismatch` |
| v0.3 subject hash mismatch | validator rejects a manifest whose subject hash no longer binds to the anchor | `rejected` | `True` | `manifest subject_hash mismatch` |
| v0.3 seller declares verifier role | validator rejects issuer role inflation against actor authority | `rejected` | `True` | `manifest issuer did:market:seller:anvil-1 lacks role verifier` |
| v0.3 verified tier without attestation refs | validator rejects self-declared verified structure | `rejected` | `True` | `verified manifest requires verifier attestation refs` |
| v0.3 claim grade without retention | validator rejects claim-grade memory without a 180-day retention policy | `rejected` | `True` | `claim_grade manifest requires 180 day retention` |
| v0.3 mutable primary ref | validator rejects mutable primary evidence in the local EVM manifest path | `rejected` | `True` | `unsupported primary storage ref for front-photo` |

## Case Notes

### Valid v0.3 standard manifest

- Slug: `valid_standard_v0_3`
- Outcome: `valid`
- Passed expectation: `True`
- Error: `none`

### v0.3 byte switch after manifest build

- Slug: `byte_switch_v0_3`
- Outcome: `rejected`
- Passed expectation: `True`
- Error: `asset byte_length mismatch for front-photo`
- Observations:
  - pre-switch valid: True
  - mutated asset: assets/byte_switch_v0_3/front-photo.png

### v0.3 asset root mismatch

- Slug: `asset_root_bad_v0_3`
- Outcome: `rejected`
- Passed expectation: `True`
- Error: `manifest asset_root_hash mismatch`

### v0.3 subject hash mismatch

- Slug: `subject_bad_v0_3`
- Outcome: `rejected`
- Passed expectation: `True`
- Error: `manifest subject_hash mismatch`

### v0.3 seller declares verifier role

- Slug: `role_inflation_v0_3`
- Outcome: `rejected`
- Passed expectation: `True`
- Error: `manifest issuer did:market:seller:anvil-1 lacks role verifier`

### v0.3 verified tier without attestation refs

- Slug: `tier_inflation_v0_3`
- Outcome: `rejected`
- Passed expectation: `True`
- Error: `verified manifest requires verifier attestation refs`

### v0.3 claim grade without retention

- Slug: `claim_retention_bad_v0_3`
- Outcome: `rejected`
- Passed expectation: `True`
- Error: `claim_grade manifest requires 180 day retention`

### v0.3 mutable primary ref

- Slug: `mutable_primary_bad_v0_3`
- Outcome: `rejected`
- Passed expectation: `True`
- Error: `unsupported primary storage ref for front-photo`

## What This Proves

- The E2E v0.3 manifest validator rejects mutated primary bytes.
- Subject hashes and asset roots are recomputed, not trusted as inert fields.
- Issuer role, verified tier, claim-grade retention, and mutable primary refs are checked in the actual v0.3 path.

## Still Not Proven

- The fixture bytes are not real card images.
- The validator does not inspect image pixels or visible nonce content.
- v0.3 still uses the local EVM packet-envelope hash as the manifest hash; no Solidity helper is exercised here.
- This drill does not make spendability a contract-enforced gate.
