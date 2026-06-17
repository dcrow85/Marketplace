# Japanese Pre-English Lizardon Mega Battle Source-Slice Audit

Generated: 2026-06-17T19:16:48Z

## Scope

This pass adds a narrow promo-family child source slice:

- `jp_promo_lizardon_mega_battle_199711_199804`

The slice models the three currently source-pinned PokéCardex UPC regional Lizardon Mega Battle trophy rows:

- `No.1 Trainer`
- `No.2 Trainer`
- `No.3 Trainer`

It does not claim official copy counts, plaque variants, national-championship award-object completeness, seller possession, authenticity, condition, or image display/training rights.

## Source Witnesses

- Local UPC aggregate: `data/japanese-pre-english/releases/jp_promo_unnumbered_pre_english_source_slice_19961015_19990131.json`
- Selected-line event context snapshot: `data/japanese-pre-english/source-snapshots/pokumon_lizardon_mega_battle_selected_lines.json`
- Pokumon page: <https://pokumon.com/lizardon-charizard-mega-battle-tournaments/>

Selected-line witness records:

- `Lizardon (Charizard) Mega Battle Tournaments`
- Final event date: April 26, 1998
- Regional qualifier window: November 8, 1997 to February 15, 1998
- Top-three regional prize structure
- Regional `No.1 Trainer`, `No.2 Trainer`, and `No.3 Trainer` card headings
- Plaque context, explicitly not modeled as row-level card identity

## Final Catalog State

- `release_count`: 24
- `total_rows`: 1222
- `source_gap_count`: 2
- `audit.passed`: true
- Lizardon row count: 3
- Lizardon expected source cards: 3
- Lizardon source gaps: 0
- Lizardon image status: `provider_path_reference_image`

## Deterministic Checks

Passed:

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`
- `jq .` over Lizardon release JSON, manifest, audit, and snapshot
- Bounded local regeneration of the three promo-family child releases plus manifest/audit
- `audit_release()` for the Lizardon slice and the two earlier child slices
- Manifest/audit arithmetic closure: `release_count=24`, `total_rows=1222`, `source_gap_count=2`
- Lizardon count closure: `3 modeled rows + 0 source gaps = 3 expected source cards`

## Mutation Checks

All targeted mutants failed as expected:

- selected-text extra passage -> `promo_family_child_context_selected_text_mismatch`
- selected-text missing No.2 Trainer -> `promo_family_child_context_selected_text_mismatch`, `promo_family_child_snapshot_text_missing ...`
- event-source boundary removed -> `promo_family_child_context_complete_source_boundary_missing`
- source count closure broken -> `promo_family_child_source_rows_found_mismatch`, `promo_family_child_source_count_closure_mismatch`
- image promoted to exact -> `promo_family_child_image_status_mismatch`, `promo_family_child_direct_exact_image_overclaim`

## Multi-Agent Audit

Three read-only agents audited this pass:

- Maxwell, source-context honesty: found stale two-card/Bulbapedia/gap wording. Fixed by making child-slice copy derive from the configured context source, expected count, modeled rows, and source gaps.
- Ptolemy, image provenance: passed image authority; independently flagged the same stale two-card wording. Fixed.
- Franklin, schema consistency: found stale generated artifacts after builder edits, event context incorrectly given a UPC boundary, and substring-only selected-text checks. Fixed by regenerating all three child slices, using snapshot-specific `not_claiming`, and asserting exact selected-text equality.

## Boundaries

This pass does not claim:

- complete pre-English promo coverage
- complete Lizardon award-object or plaque-variant coverage
- official copy counts
- row-level physical authentication
- seller possession
- condition truth
- price truth
- image display/training rights

The useful claim is deliberately smaller: the Lizardon Mega Battle regional trophy rows now have a source-slice catalog in the same format as the No Rarity-derived catalog, with provider-path image witnesses, Pokumon event-context anchoring, count closure, exact selected-text snapshot checks, and fail-closed audit guards.
