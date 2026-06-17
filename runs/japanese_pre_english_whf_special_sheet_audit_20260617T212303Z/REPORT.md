# WHF Special Limited Expansion Sheet source-slice audit

Run: `japanese_pre_english_whf_special_sheet_audit_20260617T212303Z`

## Scope

This run adds the bounded promo-family source slice `jp_promo_whf_special_limited_expansion_sheet_199712`.

Modeled rows:

- `jp_promo_whf_special_limited_expansion_sheet_199712:025` — Pikachu
- `jp_promo_whf_special_limited_expansion_sheet_199712:026` — Mew
- `jp_promo_whf_special_limited_expansion_sheet_199712:027` — Mewtwo

The slice models the three currently source-pinned PokéCardex UPC rows for the World Hobby Fair Special Sheet / Special Limited Expansion Sheet context. It does not model a complete event schedule, venue-by-venue sale ledger, sheet-object variant catalog, later CD reprint census, copy count, seller possession, authenticity, condition, image rights, or price truth.

## Source witnesses

- Selected-line snapshot: `data/japanese-pre-english/source-snapshots/pokumon_bulbapedia_whf_special_sheet_1997_selected_lines.json`
- Primary source URL: `https://pokumon.com/timeline/`
- Supporting source URL: `https://bulbapedia.bulbagarden.net/wiki/Vending_Machine_cards_(TCG)`
- Snapshot hash: `21873c7136f1d7c3963216164806b1158c8116175b025c3a6542e10c2936a652`
- Release-map hash: `a3ffb8f10375e96ee957021c1d04e404e260e086dc0eeee4387acb34dc134941`

Source claims carried into the slice:

- Event window: December 7, 1997 to February 1, 1998.
- Event context: 7th Next Generation World Hobby Fair.
- Product context: special limited Expansion Sheet / special preview expansion sheet.
- Three promo cards: Pikachu, Mew, and Mewtwo.
- Classification caveat: officially Unnumbered Promotional cards; often treated as Vending Machine additions / Series 00.
- Version caveat: Pokumon associates Mew and Mewtwo with Pokemon Song Best Collection CD 1997, while Pikachu is identified as World Hobby Fair Special Sheet 1997 without that parenthetical.

## Image witnesses

All images are provider-path-derived external reference witnesses only.

- Pikachu: `https://www.pokecardex.com/assets/images/sets_jp/UPC/25.jpg`
- Mew: `https://www.pokecardex.com/assets/images/sets_jp/UPC/26.jpg`
- Mewtwo: `https://www.pokecardex.com/assets/images/sets_jp/UPC/27.jpg`

Image policy:

- `display_allowed: false`
- `allowed_use: ["manual_review", "catalog_reference_link"]`
- `not_allowed_by_default` includes training, seller evidence, and authentication proof.
- `exact_source_image_rows: 0`
- `provider_path_reference_image_rows: 3`

## Rebuild result

Bounded rebuild refreshed the UPC parent source slice, affected promo-family child slices, and releases affected by the release-map hash pin.

- Manifest: 30 releases, 1234 rows.
- Audit: passed.
- Source gaps remain 3.
- Reference image witness rows: 1210.
- Provider-path reference image rows: 303.

## Deterministic checks

Baseline:

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py` passed.
- Direct `audit_release()` on `jp_promo_whf_special_limited_expansion_sheet_199712` returned `passed: true`, `failures: []`.
- All release files carrying `release_map_sha256` match the current map hash.

Mutation checks:

- Selected-text drift rejected with `promo_family_child_context_selected_text_mismatch`.
- Release expected-count drift rejected with `promo_family_child_release_expected_source_count_mismatch` and count-closure mismatch.
- Primary-source expected-count drift rejected with `promo_family_child_source_expected_count_mismatch` and count-closure mismatch.
- `display_allowed: true` rejected with image display overclaim failures.
- Adding `training` to `allowed_use` rejected with `promo_family_child_image_allowed_use_mismatch`.
- `complete_family_modeled: true` rejected with complete-family overclaim failures.
- Removing `complete event source` from the family context non-claims rejected with `promo_family_child_context_complete_source_boundary_missing`.
- Mislabeling the closed slice as `promo_family_child_source_slice_with_source_gap` rejected with `promo_family_child_count_confidence_mismatch`.
- Removing the Bulbapedia supporting URL from family context rejected with `promo_family_child_context_supporting_urls_mismatch`.
- Removing the Bulbapedia supporting URL from a row-level source contact rejected with `promo_family_child_context_contact_supporting_urls_mismatch`.

## Multi-agent audit

Three read-only agents audited the slice independently.

- Meitner, source/context honesty: no findings. It confirmed the event window, 7th Next Generation World Hobby Fair context, Pikachu/Mew/Mewtwo trio, Series 00 caveat, and no-overclaim boundaries.
- Gibbs, image/count/provenance closure: one low finding. Closed slices were labeled `promo_family_child_source_slice_with_source_gap`. Fixed by deriving `promo_family_child_source_slice_closed` when `source_gap_count == 0` and adding an audit guard. Gibbs re-verified no remaining issue.
- Bohr, schema/no-overclaim guard quality: one P3 finding plus one follow-up low issue. The raw WHF snapshot preserved the Bulbapedia supporting URL, but generated summaries did not. Fixed by carrying `supporting_page_urls` into row source contacts, release family context, manifest rows, and audit rows, plus adding family-context and row-contact guards. Bohr re-verified no remaining issue.

## Verdict

Passed after two low/P3 audit fixes. The slice is useful to agents as a bounded catalog/contact witness for the WHF Special Limited Expansion Sheet trio, without promoting the catalog row into seller evidence, authentication, display permission, training material, retail vending-release proof, or a complete event model.
