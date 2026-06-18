# CoroCoro April 1998 Source Slice Audit

Generated: `2026-06-18T02:36:11Z`

## Slice

- Release family: `jp_promo_corocoro_april_1998_19980315`
- Source slice: CoroCoro Comic April 1998 issue insert, released March 15, 1998
- Rows modeled:
  - `039` Jynx / `ルージュラ` / `Rougela`
  - `040` Cubone / `カラカラ` / `Karakara`
  - `041` Farfetch'd / `カモネギ` / `Kamonegi`
- Reference images:
  - `https://www.pokecardex.com/assets/images/sets_jp/UPC/39.jpg`
  - `https://www.pokecardex.com/assets/images/sets_jp/UPC/40.jpg`
  - `https://www.pokecardex.com/assets/images/sets_jp/UPC/41.jpg`

## Generated Catalog Totals

- Release count: `39`
- Total rows: `1255`
- Source gaps: `4`
- Reference image witness rows: `1231`
- Provider-path reference image rows: `324`
- Audit passed: `true`

## Deterministic Checks

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`: passed
- `python3 -m json.tool data/japanese-pre-english/source-snapshots/bulbapedia_corocoro_april_1998_selected_lines.json`: passed
- Generated release JSON parse: passed
- Manifest JSON parse: passed
- Catalog rebuild and audit: passed

## Mutation Suite

Result: `22/22` mutations detected.

Detected mutations:

- `expected_count_inflated`
- `row_removed`
- `modeled_sort_erased`
- `complete_family_promoted`
- `snapshot_text_mutated`
- `snapshot_hash_mutated`
- `release_boundary_removed`
- `image_promoted_exact`
- `image_display_allowed`
- `primary_source_boundary_removed`
- `context_boundary_removed`
- `authority_mutated`
- `japanese_name_mutated`
- `romaji_removed`
- `legacy_boundary_claim_primary_source`
- `legacy_boundary_claim_family_scope`
- `legacy_boundary_claim_product_scope`
- `legacy_boundary_claim_context_contact`
- `legacy_boundary_claim_nested_primary_source`
- `legacy_boundary_claim_top_level_release`
- `legacy_boundary_claim_top_level_card`
- `legacy_boundary_claim_nested_promo_scope`

## Multi-Agent Audit

### Source Authority Chair

- Agent: `019ed88d-6117-7d50-a76f-ac9a2c434453`
- Outcome: pass.
- Confirmed the selected Bulbapedia lines support the three-card April insert, Japanese names, romaji, illustrators, and release context.
- Confirmed the slice does not promote December 1998 mail-in prize draw, complete magazine object, reprint census, official copy count, image-rights, authenticity, seller possession, condition, or price claims.

### Row and Image Chair

- Agent: `019ed88d-6407-7c21-ae6a-8e932b4aaaf9`
- Outcome: pass.
- Confirmed exact three-row set, parent UPC sort pins, source-labeled Japanese names/romaji, provider-path-only image witnesses, image-rights boundaries, and coherent manifest/audit totals.

### Schema and Boundary Chair

- Agent: `019ed88d-6687-76c3-8da5-db1f92647964`
- Outcome: one P2 finding, fixed.
- Finding: legacy `source_slice_boundary_claim` rejection was not whole-object complete. Direct checks caught primary source, product scope, context contacts, and family context, but top-level release/card keys and nested promo-family scope keys could pass.
- Fix: `audit_release()` now recursively rejects both `source_slice_boundary_claim` and `expected_complete_source_boundary` anywhere in the release object before type-specific audit checks.
- Verification: rebuilt catalog passed; mutation suite expanded from `19/19` to `22/22`, adding top-level release, top-level card, and nested promo-scope legacy-key attacks.

## Provider Hash Note

This rebuild re-pinned live PokéCardex encrypted payload hashes and dependent child-rollup hashes for several generated release catalogs. The row counts and audits remained green. These changes are generated provenance churn, not manual row edits.

## Boundary Statement

This slice models only the three source-pinned card identities in the CoroCoro Comic April 1998 issue insert. It does not model the complete magazine object, December 1998 mail-in prize draw, accessory counter or mounted-sheet variants, reprint history, official copy counts, seller possession, physical authenticity, condition, image rights, or complete marketplace pricing.
