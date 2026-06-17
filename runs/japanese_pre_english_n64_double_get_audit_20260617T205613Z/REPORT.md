# Nintendo 64 W Double Get source-slice audit

Run: `japanese_pre_english_n64_double_get_audit_20260617T205613Z`

## Scope

This run adds the bounded promo-family source slice `jp_promo_n64_double_get_199712`.

Modeled rows:

- `jp_promo_n64_double_get_199712:028` — Cool Porygon
- `jp_promo_n64_double_get_199712:029` — Hungry Snorlax

The slice models the two currently source-pinned PokéCardex UPC rows for the Nintendo 64 W Double Get Campaign. It does not model a complete campaign object, participating-store ledger, sealed CD/booklet variant catalog, Food counter token verification, copy count, seller possession, authenticity, condition, image rights, or price truth.

## Source witnesses

- Pokumon campaign selected-line snapshot: `data/japanese-pre-english/source-snapshots/pokumon_n64_double_get_campaign_1997_selected_lines.json`
- Campaign source URL: `https://pokumon.com/nintendo-64-w-double-get-campaign/`
- Timeline source URL: `https://pokumon.com/timeline/`
- Snapshot hash: `e5bbb27b57f2feb8b3c8613b8f8aa5c90b739899b9a1323be4bb9c6e19a4afe8`
- UPC parent catalog hash: `c2783e796dc85cd73a96c3f73d20af348a3a069ab4155a249c9b4668d13f9e4a`
- N64 child release hash: `f628fdcd0a22d620f4975a702162185d8f88ed56827f5e453bbbfe309e15d7aa`
- Release-map hash: `3aede46721f371759ab51f41d2414a3b9c299f6b57df06b35fba0b115bc95e07`

Source claims carried into the slice:

- Campaign window: December 10, 1997 to January 31, 1998.
- Two promo cards: Hungry Snorlax and Cool Porygon.
- Later Pokemon Song Best Collection CD reprints are recorded as identical to the campaign versions.
- CD/booklet and Food counter context is recorded as physical-object context only, not as a modeled completeness claim.

## Image witnesses

Both images are provider-path-derived external reference witnesses only.

- Cool Porygon: `https://www.pokecardex.com/assets/images/sets_jp/UPC/28.jpg`
- Hungry Snorlax: `https://www.pokecardex.com/assets/images/sets_jp/UPC/29.jpg`

Image policy:

- `display_allowed: false`
- `allowed_use: ["manual_review", "catalog_reference_link"]`
- `not_allowed_by_default` includes training, seller evidence, and authentication proof.
- `exact_source_image_rows: 0`
- `provider_path_reference_image_rows: 2`

## Rebuild result

Bounded rebuild refreshed only the new source slice and the releases affected by the release-map hash pin.

- Manifest: 29 releases, 1231 rows.
- Audit: passed.
- Source gaps remain 3.
- Reference image witness rows: 1207.
- Provider-path reference image rows: 300.

## Deterministic checks

Baseline:

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py` passed.
- Direct `audit_release()` on `jp_promo_n64_double_get_199712` returned `passed: true`, `failures: []`.
- All release files carrying `release_map_sha256` match the current map hash.

Mutation checks:

- Selected-text drift rejected with `promo_family_child_context_selected_text_mismatch`.
- Release expected-count drift rejected with `promo_family_child_release_expected_source_count_mismatch` and count-closure mismatch.
- Primary-source expected-count drift rejected with `promo_family_child_source_expected_count_mismatch` and count-closure mismatch.
- `display_allowed: true` rejected with image display overclaim failures.
- Adding `training` to `allowed_use` rejected with `promo_family_child_image_allowed_use_mismatch`.
- `complete_family_modeled: true` rejected with complete-family overclaim failures.
- Removing `complete campaign source` from the family context non-claims rejected with `promo_family_child_context_complete_source_boundary_missing`.

## Multi-agent audit

Three read-only agents audited the slice independently.

- Popper, source/context honesty: no findings. It checked the local snapshot, release, builder, map, manifest, audit, and spot-checked the live Pokumon campaign and timeline pages.
- Copernicus, image/count/provenance closure: no findings. It confirmed the child slice models exactly source sorts 28 and 29, closes to UPC parent rows, keeps image use bounded, and recomputes the UPC and snapshot hashes.
- Gauss, schema/no-overclaim guard quality: no findings. It confirmed release/map/symbol-status hash pins, manifest uniqueness and totals, direct `audit_release()` pass, and deterministic guards for selected text, counts, image promotion, complete-family overclaim, and complete-source boundaries.

## Verdict

Passed. The slice is useful to agents as a bounded catalog/contact witness for the Nintendo 64 W Double Get campaign pair, without promoting the catalog row into seller evidence, authentication, display permission, training material, or a complete campaign model.
