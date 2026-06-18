# Computer Error Gap Closure Audit

Generated: `2026-06-18T04:13:29Z`

## Slice

- Release family: `jp_promo_corocoro_19971215`
- Closed row: `031` Computer Error / `パソコン大暴走！` / `Pasokon Dai Bousou!`
- Row mode: `manual_provider_path_gap_row`
- Reference image: `https://www.pokecardex.com/assets/images/sets_jp/UPC/31.jpg`
- Variant boundary: glossy CoroCoro/Song Best Collection print with red drop-shadow `R`; do not reuse the later non-glossy Kamex Mega Battle `UPC/45` row.

## Generated Catalog Totals

- Release count: `40`
- Total rows: `1264`
- Source gaps: `0`
- Reference image witness rows: `1240`
- Provider-path reference image rows: `333`
- Audit passed: `true`

## Deterministic Checks

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`: passed
- Full catalog rebuild and audit: passed
- CoroCoro January 1998 slice: `2/2` rows, `0` source gaps, passed
- Global source gaps: `0`

## CoroCoro January 1998 Row Set

- `030` Meowth / `ニャース` / `Nyarth`
  - Row mode: `parent_aggregate_row`
  - Reference image: `https://www.pokecardex.com/assets/images/sets_jp/UPC/30.jpg`
- `031` Computer Error / `パソコン大暴走！` / `Pasokon Dai Bousou!`
  - Row mode: `manual_provider_path_gap_row`
  - Reference image: `https://www.pokecardex.com/assets/images/sets_jp/UPC/31.jpg`

The later Kamex Mega Battle Computer Error remains separate at `UPC/45`.

## Manual Row Boundary

The Computer Error row is intentionally not a parent aggregate decrypted row. It is a bounded manual provider-path row:

- `promo_family_scope.source_row_mode = manual_provider_path_gap_row`
- `image_provenance.source_row_mode = manual_provider_path_gap_row`
- `provider_row.adapter = manual_provider_path_gap_row`
- Row and image both deny `parent aggregate decrypted row`
- Image use remains limited to `manual_review` and `catalog_reference_link`
- Image use denies `training`, `seller evidence`, and `authentication proof`
- Row still denies seller possession, authenticity, condition truth, price truth, and spendability
- Manual image URL, provider duplicate image URL, manual contact image URL/path, and variant note are bound back to the configured manual row

## Mutation Suite

Targeted Computer Error mutations: `11/11` detected.

Detected mutation classes:

- `manual_mode_laundered_to_parent`
- `manual_parent_boundary_removed`
- `manual_image_display_promoted`
- `manual_image_parent_boundary_removed`
- `release_boundary_phrase_removed`
- `manual_image_switched_to_kamex_upc45`
- `manual_variant_note_removed`
- `provider_duplicate_image_switched`
- `manual_contact_image_url_switched`
- `manual_contact_image_path_switched`
- `manual_contact_variant_note_removed`

## Multi-Agent Audit

### Source Identity Chair

- Agent: `019ed8ee-1c69-7d23-878e-3e555392f37d`
- Outcome: medium finding, fixed.
- Finding: generated `romaji` used the English gloss `The Computer's Out of Control!` instead of a phonetic romanization.
- Fix: changed Computer Error romaji to `Pasokon Dai Bousou!` and kept the English gloss in source notes.
- Confirmed source support for CoroCoro January 1998, December 15, 1997, two-card insert, later Song Best context, red-drop-shadow/glossy distinction, and zero source gaps.

### Row and Image Lineage Chair

- Agent: `019ed8ee-7b7b-7a83-863a-6a6d0e90e4dd`
- Outcome: pass.
- Confirmed Computer Error `UPC/31` is bounded as a manual provider-path reference only with `display_allowed: false`.
- Confirmed Meowth `UPC/30` remains `parent_aggregate_row`.
- Confirmed Kamex Mega Battle Computer Error `UPC/45` remains a separate parent aggregate row.
- Confirmed no promotion to training, seller evidence, authentication proof, possession, authenticity, condition, image rights, or parent aggregate status.
- Confirmed manifest/audit preserve global `source_gap_count: 0`.

### Schema and No-Overclaim Chair

- Agent: `019ed8ee-d6fd-7a40-87d1-4496c886e16f`
- Outcome: medium finding, fixed.
- Finding: the primary manual image spine rejected a switch from `UPC/31` to `UPC/45`, but duplicate manual metadata could drift in `provider_row.source_provider_row.image_large`, manual contact `provider_image_url`, manual contact `provider_image_path`, and manual contact `variant_boundary_note`.
- Fix: validator now binds those duplicate manual metadata fields to the configured manual source row.
- Confirmed the complete-magazine, variant-catalog, Song Best census, and copy-count boundaries are preserved.

## Boundary Statement

This change makes the glossy CoroCoro/Song Best Collection Computer Error lane legible to agents with a bounded visual reference. It does not claim parent aggregate decrypted-row provenance for the manual row, complete CoroCoro issue archive, complete magazine source, complete Computer Error variant catalog, complete Song Best reprint census, official copy counts, seller possession, physical authenticity, condition, image rights, marketplace pricing, or spendability.
