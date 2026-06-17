# Fan Club Vol. 3 Dark Persian Source Slice Audit

Generated: 2026-06-17T20:30:06Z

## Scope

This run adds `jp_promo_fan_club_vol3_19971118`, a narrow promo-family child slice for the Dark Persian promo distributed with Pokemon Card Fan Club Vol. 3.

Modeled row:

- `jp_promo_fan_club_vol3_19971118:024` — Dark Persian

The slice is intentionally not a complete magazine object ledger. It does not claim copy count, sealed-magazine variants, complete magazine provenance, seller possession, authenticity, condition, image rights approval, or price truth.

## Source Witnesses

- Pokumon, Pokemon Card Fan Club Magazine: `https://pokumon.com/pokemon-card-fan-club-magazine/`
- Pokumon, Dark Persian card page: `https://pokumon.com/card/dark-persian-pokemon-card-fan-club-magazine-1997-unnumbered/`
- Pokumon timeline: `https://pokumon.com/timeline/`
- Local selected-lines snapshot: `data/japanese-pre-english/source-snapshots/pokumon_fan_club_vol3_dark_persian_1997_selected_lines.json`
- Snapshot canonical hash: `4ba457052785309ae1a17841c422a5026b0b3d1b3ce83e30856cd2cccd389bb7`
- PokéCardex UPC image witness: `https://www.pokecardex.com/assets/images/sets_jp/UPC/24.jpg`

Selected snapshot support:

- Fan Club Vol. 3 release date: November 18, 1997.
- Exclusive Dark Persian promo identity.
- Non-holo and different-art distinction from the Team Rocket expansion copy.
- Timeline confirmation for the same date and card identity.

The Pokumon magazine page renders `Dark Persion` in one sentence. The catalog keeps that spelling only as source witness text and uses `Dark Persian` in catalog truth fields.

## Catalog State

- `audit.passed`: `true`
- `release_count`: `27`
- `total_rows`: `1227`
- `source_gap_count`: `3`
- `reference_image_witness_rows`: `1203`
- `provider_path_reference_image_rows`: `296`
- Fan Club Vol. 3 slice rows: `1/1`
- Fan Club Vol. 3 slice source gaps: `0`
- Map hash pinned by all nine map-hash-bearing releases: `5a27b15b0ea64773c2970a32dfd0e9cb0d10c711c1b81c18f483f056afe03ea4`

## Deterministic Checks

Passed:

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`
- Bounded rebuild of the nine release-map-pinned local rollup/source-slice releases.
- Full manifest/audit recomputation from release bytes with no live network fetches.
- Current-code audit of all 27 releases: `passed true`.
- Fan Club image rights check: row remains `provider_path_reference_image`, `display_allowed: false`, with allowed use limited to `manual_review` and `catalog_reference_link`.

Mutation probes failed closed:

- Selected-text drift: `promo_family_child_context_selected_text_mismatch`.
- Expected source-count drift: `promo_family_child_release_expected_source_count_mismatch`, `promo_family_child_release_count_closure_mismatch`.
- Image display promotion: `image_display_not_fail_closed`, `promo_family_child_image_display_allowed_overclaim`.
- Image allowed-use promotion: `promo_family_child_image_allowed_use_mismatch`.
- Complete-family promotion: `promo_family_child_complete_family_overclaim`.
- Complete-source-boundary removal: `promo_family_child_context_complete_source_boundary_missing`.

## Multi-Agent Audit

Three read-only audit chairs reviewed the slice.

- Source/context honesty chair found no issues. It confirmed the selected source lines support Vol. 3, November 18, 1997, and Dark Persian; the `Dark Persion` typo remains quarantined as source text only.
- Image/count/provenance chair found no issues. It verified UPC sort 24, inherited image witness `UPC/24.jpg`, bounded image rights, source/catalog hashes, and one-row count closure.
- Schema/no-overclaim chair found no issues. It verified guards for selected-text drift, count drift, image promotion, complete-family promotion, and complete-source-boundary drift.

## Disposition

Accepted as a bounded source slice. The catalog now has a machine-readable Fan Club Vol. 3 Dark Persian row with an external reference-image witness and explicit non-claims, while keeping sealed magazine and copy-count assertions outside row authority.
