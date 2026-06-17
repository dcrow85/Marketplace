# First Official Tournament Promo Source Slice Audit

Generated: 2026-06-17T20:10:40Z

## Scope

This run adds `jp_promo_first_official_tournament_199706`, a narrow promo-family child slice for the June 14-15, 1997 First Official Pokemon Card Game Tournament trophy cards.

Modeled rows:

- `jp_promo_first_official_tournament_199706:011` — No.1 Trainer
- `jp_promo_first_official_tournament_199706:012` — No.2 Trainer
- `jp_promo_first_official_tournament_199706:013` — No.3 Trainer

The slice is intentionally not a complete tournament award ledger. It does not claim official surviving copy counts, session-level award-object completeness, trophy case or plaque variants, winner identities, seller possession, authenticity, condition, image rights approval, or price truth.

## Source Witnesses

- Pokumon, First Official Pokemon Card Game Tournament: `https://pokumon.com/1st-official-pokemon-card-game-tournament/`
- Local selected-lines snapshot: `data/japanese-pre-english/source-snapshots/pokumon_first_official_tournament_1997_selected_lines.json`
- Snapshot canonical hash: `72d65b4a3dfd25c3458ddbbaf403d9752bfd6cdc284f61ad383b1d574b0e3758`
- PokéCardex UPC aggregate source rows: `UPC/11.jpg`, `UPC/12.jpg`, `UPC/13.jpg`

Selected snapshot support:

- Event title and First Official Tournament context.
- Tournament window: June 14-15, 1997.
- No.1, No.2, and No.3 Trainer identities.
- Session prize context across four tournament sessions.
- Confusion boundary against later Charizard/Lizardon Mega Battle No.1-3 Trainer cards.

## Catalog State

- `audit.passed`: `true`
- `release_count`: `26`
- `total_rows`: `1226`
- `source_gap_count`: `3`
- `reference_image_witness_rows`: `1202`
- `provider_path_reference_image_rows`: `295`
- First Official slice rows: `3/3`
- First Official slice source gaps: `0`
- Map hash pinned by all eight map-hash-bearing releases: `e598b7d2b2d927f170684cbb710f12234d3153834456e5b0f461eb9e86a8161d`

## Deterministic Checks

Passed:

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`
- Bounded rebuild of the eight release-map-pinned local rollup/source-slice releases.
- Full manifest/audit recomputation from release bytes with no live network fetches.
- Current-code audit of all 26 releases: `passed true`.
- Stale map-hash search for prior local-rollup hashes: none found.
- Stale unsupported wording search for `Lizardon and Kamex`: none found.
- First Official image rights check: all three rows remain `provider_path_reference_image`, `display_allowed: false`, with allowed use limited to `manual_review` and `catalog_reference_link`.

Mutation probes failed closed:

- Selected-text drift: `promo_family_child_context_selected_text_mismatch`.
- Expected source-count drift: `promo_family_child_release_expected_source_count_mismatch`, `promo_family_child_release_count_closure_mismatch`.
- Image display promotion: `image_display_not_fail_closed`, `promo_family_child_image_display_allowed_overclaim`.
- Complete-family promotion: `promo_family_child_complete_family_overclaim`.

## Multi-Agent Audit

Three read-only audit chairs reviewed the slice.

- Source/context honesty chair found two low issues:
  - The generated note broadened the source-backed confusion boundary to Kamex. Fixed by narrowing the note to later Lizardon/Charizard Mega Battle trophy rows.
  - The map references listed the Pokumon timeline but not the exact First Official page. Fixed by adding the exact Pokumon URL.
- Image/count/provenance chair found no issues. It verified the three inherited UPC image witnesses, rights/use boundaries, count closure, and manifest/audit totals.
- Schema/no-overclaim chair found no issues. It verified selected-text guards, count guards, image-use guards, and complete-family guards.

## Disposition

Accepted as a bounded source slice. The catalog now has a machine-readable First Official Tournament trio with external reference-image witnesses and explicit non-claims, while keeping copy-count and physical-award completeness outside row authority.
