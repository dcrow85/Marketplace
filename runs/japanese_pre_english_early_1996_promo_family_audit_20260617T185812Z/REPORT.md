# Japanese Pre-English Early 1996 Promo Family Source-Slice Audit

Generated: 2026-06-17T18:58:12Z

## Scope

This pass adds two narrow promo-family child source slices derived from the existing PokéCardex UPC aggregate and a selected-line Bulbapedia context snapshot:

- `jp_promo_corocoro_first_19961015`
- `jp_promo_how_to_play_book_19961130`

These are not complete promo-family checklists. Each slice models the one currently source-pinned UPC row and records one expected but unmodeled counterpart from the Bulbapedia selected-line witness.

## Source Witnesses

- Local UPC aggregate: `data/japanese-pre-english/releases/jp_promo_unnumbered_pre_english_source_slice_19961015_19990131.json`
- Selected-line context snapshot: `data/japanese-pre-english/source-snapshots/bulbapedia_early_1996_promos_selected_lines.json`
- Bulbapedia page: <https://bulbapedia.bulbagarden.net/wiki/Unnumbered_Promotional_cards_%28TCG%29/1996-2005>

Selected-line witness records:

- `Pikachu [Glossy]`
- `Jigglypuff [Glossy]`
- `Pikachu [Non-glossy]`
- `Jigglypuff [Non-glossy]`
- CoroCoro Comic November 1996 issue insert: October 15, 1996
- Easily Understand How to Play Pokemon Cards: November 30, 1996

## Final Catalog State

- `release_count`: 23
- `total_rows`: 1219
- `source_gap_count`: 2
- `audit.passed`: true

Child-slice summary:

| Release | Modeled rows | Expected source cards | Source gaps | Unmodeled expected cards | Image status |
|---|---:|---:|---:|---|---|
| `jp_promo_corocoro_first_19961015` | 1 | 2 | 1 | `Jigglypuff [Glossy]` | `provider_path_reference_image` |
| `jp_promo_how_to_play_book_19961130` | 1 | 2 | 1 | `Pikachu [Non-glossy, Keiji Kinebuchi]` | `provider_path_reference_image` |

## Deterministic Checks

Passed:

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`
- `jq .` over the two child release JSON files, manifest, audit, and source snapshot
- Bounded local regeneration of the two child releases plus manifest/audit
- `audit_release()` for both child releases
- Lineage check: child rows point back to UPC aggregate catalog hash `c2783e796dc85cd73a96c3f73d20af348a3a069ab4155a249c9b4668d13f9e4a`
- Both child rows preserve `provider_path_reference_image` rather than `exact_source_image`

## Mutation Checks

All mutants failed as expected:

- `release_gap_zero` -> `promo_family_child_release_gap_count_mismatch`, `promo_family_child_release_count_closure_mismatch`
- `source_unmodeled_erased` -> `promo_family_child_source_unmodeled_cards_mismatch`
- `source_count_closure_broken` -> `promo_family_child_source_expected_count_mismatch`, `promo_family_child_source_count_closure_mismatch`
- `row_claims_complete_family` -> `promo_family_child_complete_family_overclaim`
- `image_promoted_to_exact` -> `promo_family_child_image_status_mismatch`, `promo_family_child_direct_exact_image_overclaim`
- `source_hash_changed` -> `promo_family_child_source_hash_mismatch`
- `snapshot_missing_jigglypuff` -> `promo_family_child_snapshot_glossy_jigglypuff_missing`

## Multi-Agent Audit

Three read-only agents audited the slice:

- Godel, source completeness / overclaim: no blocking findings. Caveat recorded that the CoroCoro Pikachu provider metadata carries an illustrator oddity; downstream UI should keep provider trivia subordinate to `promo_family_scope`.
- Singer, image authority: no findings. Confirmed images are bounded as provider-path reference witnesses, not exact source/authentication/seller evidence.
- Nash, schema/protocol consistency: three findings.

Nash findings and dispositions:

- P2 `audit.release_audits[]` dropped family-context proof fields.
  - Disposition: fixed. Audit rows now carry `family_context_snapshot_path`, `family_context_snapshot_hash`, and `family_context_source_url`.
- P2 mutation guards did not enforce count closure.
  - Disposition: fixed. Audit now asserts release and source count closure: modeled rows plus source gaps must equal expected source card count.
- P3 top-level summary boundaries were less specific than child release boundaries.
  - Disposition: fixed. Manifest/audit top-level `not_claiming` now include `complete promo family checklist` and `unmodeled expected card row`.

## Boundaries

This pass does not claim:

- complete pre-English promo coverage
- complete UPC source coverage
- complete family checklists for either early promo family
- row-level physical authentication
- seller possession
- condition truth
- official copy counts
- image display/training rights

The useful claim is smaller and cleaner: two early promo family source slices now exist in the same catalog format as No Rarity-derived rows, with row images, explicit source gaps, family-context snapshot hashes, and fail-closed audit guards.
