# Toyota Auto Campaign Source Slice Audit

Generated: 2026-06-17T20:40:00Z

## Scope

This run adds `jp_promo_toyota_auto_199710_199712`, a narrow promo-family child slice for the Toyota Auto Campaign pamphlet cards.

Modeled rows:

- `jp_promo_toyota_auto_199710_199712:018` — Arcanine
- `jp_promo_toyota_auto_199710_199712:019` — Pikachu

The slice is intentionally not a complete campaign ledger. It does not claim copy count, participating dealership coverage, pamphlet-object variants, redemption volume, seller possession, authenticity, condition, image rights approval, or price truth.

## Source Witnesses

- Pokumon, Toyota Auto Campaign: `https://pokumon.com/toyota-auto-campaign/`
- Pokumon timeline: `https://pokumon.com/timeline/`
- Local selected-lines snapshot: `data/japanese-pre-english/source-snapshots/pokumon_toyota_auto_campaign_1997_selected_lines.json`
- Snapshot canonical hash: `0ab23fbb4fa8f8ebb12d387ef665a2ffbf58755193ec910474e57870ee7f484e`
- PokéCardex UPC image witnesses:
  - `https://www.pokecardex.com/assets/images/sets_jp/UPC/18.jpg`
  - `https://www.pokecardex.com/assets/images/sets_jp/UPC/19.jpg`

Selected snapshot support:

- Campaign window: October-December 1997.
- Toyota Auto dealership pamphlet context.
- Two promo card identities: Arcanine and Pikachu.
- Pikachu alternate-art CoroCoro connection.
- Arcanine later Song Best Collection reuse, handled as a version distinction rather than a separate Toyota-row claim.
- Timeline corroboration for the same campaign window and pamphlet context.

## Catalog State

- `audit.passed`: `true`
- `release_count`: `28`
- `total_rows`: `1229`
- `source_gap_count`: `3`
- `reference_image_witness_rows`: `1205`
- `provider_path_reference_image_rows`: `298`
- Toyota slice rows: `2/2`
- Toyota slice source gaps: `0`
- Map hash pinned by all ten map-hash-bearing releases: `f364d9a256fb3ad74fdc398028a4018fdef8ed5438882d61386590ef6b5c4d2a`

## Deterministic Checks

Passed:

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`
- Bounded rebuild of the ten release-map-pinned local rollup/source-slice releases.
- Full manifest/audit recomputation from release bytes with no live network fetches.
- Current-code audit of all 28 releases: `passed true`.
- Toyota image rights check: both rows remain `provider_path_reference_image`, `display_allowed: false`, with allowed use limited to `manual_review` and `catalog_reference_link`.

Mutation probes failed closed:

- Selected-text drift: `promo_family_child_context_selected_text_mismatch`.
- Expected source-count drift: `promo_family_child_release_expected_source_count_mismatch`, `promo_family_child_release_count_closure_mismatch`.
- Image display promotion: `image_display_not_fail_closed`, `promo_family_child_image_display_allowed_overclaim`.
- Image allowed-use promotion: `promo_family_child_image_allowed_use_mismatch`.
- Complete-family promotion: `promo_family_child_complete_family_overclaim`.
- Complete-source-boundary removal: `promo_family_child_context_complete_source_boundary_missing`.

## Multi-Agent Audit

Three read-only audit chairs reviewed the slice.

- Source/context honesty chair found no issues. It confirmed the selected Pokumon lines support the campaign window, dealership pamphlet, two card identities, and Song Best reuse as a version distinction rather than a separate row claim.
- Image/count/provenance chair found no issues. It verified UPC sorts 18 and 19, inherited image witnesses `UPC/18.jpg` and `UPC/19.jpg`, bounded image rights, source/catalog hashes, and two-row count closure.
- Schema/no-overclaim chair found no issues. It verified guards for selected-text drift, count drift, image promotion, complete-family promotion, and complete-source-boundary drift.

## Disposition

Accepted as a bounded source slice. The catalog now has a machine-readable Toyota Auto Campaign pair with external reference-image witnesses and explicit non-claims, while keeping dealership, pamphlet-object, and copy-count assertions outside row authority.
