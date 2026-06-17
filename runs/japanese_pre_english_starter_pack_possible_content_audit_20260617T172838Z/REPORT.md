# Series 1 Starter Pack Possible-Content Catalog Audit

Run: `japanese_pre_english_starter_pack_possible_content_audit_20260617T172838Z`

## Scope

This run adds `jp_tcg_starter_pack_19961020` as a possible-content catalog slice for the October 20, 1996 Series 1 Starter Pack.

The slice deliberately does **not** claim a fixed 60-card deck list. It preserves a 102-row possible-content pool inherited from the Expansion Pack / No Rarity bridge:

- 96 active non-Energy No Rarity target rows.
- 6 Basic Energy caveat rows.
- `product_card_count: 60` as product-format context only.
- `unique_catalog_row_count: 102` as possible-content catalog scope.

## Deterministic Result

`data/japanese-pre-english/audit.json` passes.

Key counts after the slice:

- `release_count`: 19
- `total_rows`: 883
- `exact_source_image_rows`: 489
- `provider_path_reference_image_rows`: 286
- `inherited_source_reference_image_rows`: 96
- `tcgdex_enriched_rows`: 461

Starter Pack slice counts:

- `row_count`: 102
- `active_no_rarity_rows`: 96
- `basic_energy_caveat_rows`: 6
- `exact_source_image_rows`: 0
- `inherited_source_reference_image_rows`: 96
- `strict_booster_rows`: 0
- `source_strict_booster_member` rows: 96

## Agent Audit

Three fresh agents audited the slice.

### Huygens: Provenance

Verdict: no high or medium findings.

Low finding:

- Product-rule and symbol-status support was path-cited but not hash-pinned.

Disposition:

- Fixed before commit. The Starter source now carries hashes for `Japanese_Pre_English_Release_Map_v0.1.md` and `data/pre-english-symbol-status.json`, and the audit checks those pins.

### Archimedes: Image/Data Lineage

Verdict: no lineage failure.

P3 findings:

- Provider image contacts carried `image_large` without repeating the use limits.
- The rollup source contact omitted `price truth` from `not_claiming`.

Disposition:

- Fixed before commit. Inherited source contacts are now marked `inherited_from_source_release: true`, carry the source catalog hash/row id, and repeat fixed-deck, sealed-contents, possession, authenticity, condition, and price boundaries. Image-bearing contacts also repeat display/training/seller-evidence restrictions.

### Herschel: Adversarial/No-Overclaim

Findings:

- `strict_booster_member` leaked source booster membership into current Starter rows.
- Product-rule wording sounded like a sealed-unit content guarantee.
- Inherited images were still labeled as direct `exact_source_image` rows for Starter.
- Copied source contacts lacked Starter-specific caveats.
- `catalog_treatment: "Catalog target"` was too strong for a possible-content rollup.

Disposition:

- Fixed before commit.
- Current Starter rows now have `strict_booster_member: false`; source membership is preserved only as `source_strict_booster_member`.
- Product wording now says `source-format context` and explicitly says it is not a guarantee of sealed contents, collation, distribution, or fixed deck composition.
- Inherited images now use `status: inherited_source_reference_image` and carry `source_image_release_family_id`, `source_image_row_id`, `source_image_status`, and `source_image_catalog_hash`.
- Catalog treatment is now `Possible-content context`.

## Mutation Proof

The Starter audit was checked against thirteen mutations. Each mutation caused the audit to fail on the expected axis:

- `fixed_deck_member_overclaim`
- `source_catalog_hash_drift`
- `source_row_id_drift`
- `source_name_drift`
- `energy_caveat_substitute_image`
- `row_strict_membership_overclaim`
- `current_booster_membership_overclaim`
- `missing_rollup_contact`
- `image_status_direct_exact_overclaim`
- `catalog_treatment_overclaim`
- `product_count_basis_overclaim`
- `inherited_contact_boundary_removed`
- `source_doc_hash_drift`

## Boundary

This catalog slice is useful for agent reasoning about Starter Pack source-family ambiguity and No Rarity confusion.

It does not claim:

- a fixed deck list,
- sealed-unit contents,
- seller possession,
- authenticity,
- condition,
- price truth,
- or approved image display/training rights.
