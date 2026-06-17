# Japanese Pre-English JR East Stamp Rally Source-Slice Audit

Generated: 2026-06-17T19:47:35Z

## Scope

This pass adds a narrow promo-family child source slice:

- `jp_promo_jr_east_stamp_rally_199708`

The slice models the one currently source-pinned PokéCardex UPC row:

- `Surfing Pikachu`

It records the second Pokumon-supported booklet card as an explicit source gap:

- `Mew (JR Train Rally 1997)`

It does not claim a complete JR East booklet checklist, official surviving copy counts, a complete booklet-object variant catalog, seller possession, authenticity, condition, price truth, or image display/training rights.

## Source Witnesses

- Local UPC aggregate: `data/japanese-pre-english/releases/jp_promo_unnumbered_pre_english_source_slice_19961015_19990131.json`
- Selected-line event context snapshot: `data/japanese-pre-english/source-snapshots/pokumon_jr_east_stamp_rally_1997_selected_lines.json`
- Pokumon page: <https://pokumon.com/japan-rail-east-stamp-rally-1997/>

Selected-line witness records:

- `Japan Rail East Stamp Rally 1997`
- Two early Pokemon promo cards were issued
- `Surfing Pikachu (JR Train Rally 1997) (Unnumbered)`
- `Mew (JR Train Rally 1997) (Unnumbered)`
- Event ran from August 9-17, 1997
- The prize booklet contained two promo cards
- The booklet versions were matte rather than glossy
- Surfing Pikachu shows Mt. Fuji and a Japan Rail train

## Final Catalog State

- `release_count`: 25
- `total_rows`: 1223
- `source_gap_count`: 3
- `audit.passed`: true
- JR East row count: 1
- JR East expected source cards: 2
- JR East source gaps: 1
- JR East unmodeled expected card: `Mew (JR Train Rally 1997)`
- JR East image status: `provider_path_reference_image`
- JR East image witness: `https://www.pokecardex.com/assets/images/sets_jp/UPC/14.jpg`

## Deterministic Checks

Passed:

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`
- `jq .` over JR East release JSON, manifest, audit, and snapshot
- Local bounded regeneration of the seven map-pinned rollup releases:
  - `jp_tcg_starter_pack_19961020`
  - `jp_tcg_gift_pack_19961212`
  - `jp_tcg_team_rocket_gift_pack_19971219`
  - `jp_promo_corocoro_first_19961015`
  - `jp_promo_how_to_play_book_19961130`
  - `jp_promo_lizardon_mega_battle_199711_199804`
  - `jp_promo_jr_east_stamp_rally_199708`
- Manifest/audit arithmetic closure: `release_count=25`, `total_rows=1223`, `source_gap_count=3`
- JR East count closure: `1 modeled row + 1 source gap = 2 expected source cards`
- Release-map hash repin across all seven map-pinned rollup releases

## Mutation Checks

All targeted mutants failed as expected:

- selected-text extra passage -> `promo_family_child_context_selected_text_mismatch`
- selected-text missing Mew -> `promo_family_child_context_selected_text_mismatch`, `promo_family_child_snapshot_text_missing Mew (JR Train Rally 1997)`
- source count closure broken -> `promo_family_child_source_expected_count_mismatch`, `promo_family_child_source_count_closure_mismatch`
- image promoted to exact -> `promo_family_child_image_status_mismatch`, `promo_family_child_provider_path_image_count`, `promo_family_child_direct_exact_image_overclaim`
- complete-family overclaim -> `promo_family_child_complete_family_overclaim`
- image `allowed_use` promoted to training -> `promo_family_child_image_allowed_use_mismatch`
- image `not_allowed_by_default` removed -> `promo_family_child_image_not_allowed_boundary_missing`
- image `display_allowed` promoted -> `promo_family_child_image_display_allowed_overclaim`

## Multi-Agent Audit

Three read-only agents audited this pass:

- Goodall, source/context honesty: found that `Japanese_Pre_English_Release_Map_v0.1.md` said a "second-source check" supported the JR East event window while the concrete generated trail only pinned the selected Pokumon snapshot. Fixed by rewriting the map note to name the selected Pokumon snapshot and the explicit Mew source gap.
- Bacon, image provenance and count closure: no findings. Confirmed the child row inherits the `UPC/14.jpg` provider-path image witness, keeps `display_allowed=false`, and closes `1 modeled + 1 gap = 2 expected`.
- Mencius, schema/no-overclaim: found that image-use language could be weakened without failing the promo-family child audit. Fixed by adding row-level guards for `rights_status`, `display_allowed`, exact `allowed_use`, required `not_allowed_by_default`, and required image `not_claiming` boundaries. Mencius also noted that flattened manifest/audit consumers must read `source_gap_count` and `unmodeled_expected_cards`, not only `row_count == expected_row_count`; no data change was needed because those fields are present.

## Boundaries

This pass does not claim:

- complete pre-English promo coverage
- complete JR East booklet-object or variant coverage
- row-level Mew image or identity modeling
- official surviving copy counts
- row-level physical authentication
- seller possession
- condition truth
- price truth
- image display/training rights

The useful claim is deliberately smaller: the JR East Stamp Rally family now has a source-slice catalog in the same format as the No Rarity-derived catalog, with one modeled Surfing Pikachu provider-path image witness, a Pokumon selected-line event/context anchor, an explicit Mew source gap, count closure, exact selected-text snapshot checks, and fail-closed image-rights guards.
