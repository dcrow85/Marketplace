# Catalog Evolution Drill: catalog_evolution_drill_20260610T175909Z

- Passed: `True`
- Manifest matches current bytes: `True`
- Catalog contains bundled evidence policy: `False`
- Catalog hash: `02b979ccfd4ff215511f11b879b1251b81d6f8edecf7e876b26eabcdc14650c7`
- Policy hash: `7dd79f0d833084f956f2dc4800ebf37a0d4eb03bbad7fbd628c40034fd03faeb`
- Bundle hash: `52730fd4d6cbf4c46790f76ceeb98ea76fc3e733f336aff5cacc6591dda7016e`

## Overclaim Attempts

### catalog_location_as_authority

- Claim: The catalog is valid because it lives on this Mac.
- Blocked by: `catalog_hash, not location`
- Passed: `True`

### policy_as_fact

- Claim: Evidence requirements are catalog facts.
- Blocked by: `separate policy_hash`
- Passed: `True`

### agent_vote_as_truth

- Claim: Many agents agreed, so the row is true.
- Blocked by: `evidence-weighted challenges`
- Passed: `True`

### clean_settlements_as_proof

- Claim: Fifty clean trades prove a row is true.
- Blocked by: `row calibration is no surfaced error, not truth`
- Passed: `True`

## Revision Cases

### good_row_hardens_against_sybil_noise

- A conservative row texture update survives unevidenced sybil challenges.
- Row: `PMCG1-025`
- Flags: `sybil_challenge_no_evidence`
- Challenge weights: `[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]`
- Outcome: `harden`
- Passed: `True`

### energy_premium_poison_blocked

- A poisoned proposal tries to make a basic Energy row an active premium No Rarity target.
- Row: `PMCG1-097`
- Flags: `energy_caveat_poison, evidence_weighted_challenge`
- Challenge weights: `[5]`
- Outcome: `block`
- Passed: `True`

### quick_starter_scope_flagged

- A proposal tries to erase the Quick Starter text-layout caveat on a sensitive trainer.
- Row: `PMCG1-093`
- Flags: `evidence_weighted_challenge, quick_starter_scope_poison`
- Challenge weights: `[5]`
- Outcome: `flag`
- Passed: `True`

### url_only_source_blocked

- A revision cites a URL but no content hash, so future agents cannot inspect the same bytes.
- Row: `PMCG1-035`
- Flags: `source_without_content_hash`
- Challenge weights: `[]`
- Outcome: `block`
- Passed: `True`

### unchallenged_poison_held_at_flag

- A poisoned Energy-premium proposal with zero challengers and reworded claim text is held at flag by field-level detection. It must not harden just because no challenger showed up.
- Row: `PMCG1-098`
- Flags: `energy_caveat_poison`
- Challenge weights: `[]`
- Outcome: `flag`
- Passed: `True`

## What This Proves

- Card references can cite `(catalog_hash, row_id)` rather than a storage location.
- Evidence policy defaults are separate bytes from catalog facts.
- A good revision can harden against unevidenced agent noise.
- A poisoned revision can be blocked or flagged by one strong challenge.
- Poison detection reads the structured field diff, not the claim phrasing.
- An unchallenged poisoned revision is held at flag; it never hardens silently.
- URL-only sources fail because future agents cannot inspect the same bytes.
