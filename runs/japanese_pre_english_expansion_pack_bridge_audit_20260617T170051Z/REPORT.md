# Expansion Pack / No Rarity Lab Bridge Audit

Generated: 2026-06-17T17:00:51Z

## Scope

This run adds `jp_tcg_expansion_pack_19961020` to the Japanese pre-English release catalog as a bridge over the existing local No Rarity lab.

The bridge preserves the No Rarity lab's original boundary:

- 102 PMCG1 protocol-anchor rows are retained.
- 96 rows are strict Japanese First Expansion Pack booster members and active No Rarity targets.
- 6 Basic Energy rows are retained only as broader launch-family caveats.
- Active target rows carry source-labeled No Rarity reference images.
- Basic Energy caveat rows intentionally carry no substitute reference images.

## Deterministic Results

- Release catalog hash: `c7c42555177ef22509975dc2cd3fb06b298b7eb317ca8897bc4bbdebb4c0321e`
- Aggregate release count: 18
- Aggregate row count: 781
- Aggregate active No Rarity rows: 96
- Aggregate Basic Energy caveat rows: 6
- Aggregate strict booster rows: 96
- Aggregate exact source image rows: 489
- Aggregate provider-path reference image rows: 286
- Aggregate audit: passed

The No Rarity lab manifest was also re-pinned during this run:

- Catalog hash: `9d17b8bf8f249e98ed0796411f9fbf1c3004f0f936b1d9db1ad55db56f2d61d8`
- Policy hash: `73897dcd4bf574230494ee6cf2f1775f058b3f4a78b9b08f8077899db23705df`
- Symbol-status hash: `be057d141fa4c0a02229ed0657dbe8804f5bd3f6d672aac79409e0ce9b1b6642`
- Bundle hash: `6dde6db31ffe9e99c8e31fa6f12a25b7b1acdab1f0b5fa57e70f426f348d4d53`

## Mutation Checks

All tested bridge mutations were detected by `audit_release`:

- Active target demotion
- Basic Energy caveat promotion
- Active target image removal
- Basic Energy substitute-image insertion
- Basic Energy image-boundary narrowing
- Row-level symbol status scalarization
- Release-level symbol status scalarization
- Provider local-anchor drift
- Local source-contact row-anchor drift
- Release source catalog hash drift
- Release source policy hash drift
- Release source manifest hash drift
- Release source URL drift
- Release source row-count drift
- Release source active-target count drift
- Release source caveat count drift
- Row source-contact catalog hash drift
- Row source-contact policy hash drift
- Row source-contact manifest hash drift
- Row source-contact URL drift
- Row source-contact boundary narrowing
- Quick Starter trap-row removal
- Row-count changes

The important hardening is that the bridge now checks the No Rarity manifest's embedded catalog, policy, symbol-status, bundle preimage, and bundle hash against current disk bytes. It also verifies each row's local source-contact hash chain, local row id, and boundary language.

## Fresh Agent Audit

Two fresh read-only agents audited this bridge.

### Pasteur: collector/product correctness

Verdict: no P0 findings.

Findings folded:

- P1 stale symbol-status hash in `data/no-rarity-catalog-manifest.json`: fixed by re-running the No Rarity pinning script and adding bridge audit checks for embedded catalog/policy/symbol/bundle hashes.
- P2 manifest/audit summaries did not expose the 96/6 split: fixed by adding `active_no_rarity_rows`, `basic_energy_caveat_rows`, and `strict_booster_rows` to audit rows and manifest entries.
- P2 one raw provider title carries condition language: kept as raw provenance, added `provider_display_title` as the neutral display label for bridge image provenance.
- P2 generated audit wording was out of sync: regenerated `data/japanese-pre-english/audit.json` from the updated builder.

Pasteur confirmed that PMCG1 anchors, strict booster membership, Basic Energy caveats, 96 exact source-labeled target images, no substitute caveat images, Quick Starter trap rows, and Japanese booster order were preserved.

### Ohm: schema/provenance/reproducibility

Verdict: no P0 findings.

Findings folded:

- P1 stale No Rarity manifest hash chain: fixed by re-pinning `data/no-rarity-catalog-manifest.json`.
- P1 bridge validator gaps: fixed by exact validation for primary and per-row `catalog_hash`, `policy_hash`, `catalog_manifest_hash`, source URL, source counts, local row ids, and boundary language.
- P2 Basic Energy caveat image `not_claiming` too narrow: fixed by normalizing bridge image provenance to include seller possession, seller card match, condition, and authenticity boundaries even when the local lab row had a narrower caveat.
- P2 `tcgdex_enriched_rows` undercounted bridge rows: fixed by adding `tcgdex.id` to bridged rows from their PMCG1 anchors.

## Not Claiming

- This bridge does not make the pre-English catalog complete.
- The No Rarity lab is not seller evidence.
- Source-labeled reference images are not seller possession, authenticity, condition, price truth, or approved display/training rights.
- Basic Energy caveats are not active premium No Rarity targets.
- Missing-symbol status remains release/context metadata until seller evidence supports a physical-card claim.
