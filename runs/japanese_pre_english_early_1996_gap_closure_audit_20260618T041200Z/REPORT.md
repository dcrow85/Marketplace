# Early 1996 Promo Gap Closure Audit

Generated: `2026-06-18T03:37:00Z`

## Slice

- Release family: `jp_promo_corocoro_first_19961015`
  - Closed row: `002` Jigglypuff / `プリン` / `Purin`
  - Row mode: `manual_provider_path_gap_row`
  - Reference image: `https://www.pokecardex.com/assets/images/sets_jp/UPC/2.jpg`
- Release family: `jp_promo_how_to_play_book_19961130`
  - Closed row: `003` Pikachu / `ピカチュウ` / `Pikachu`
  - Row mode: `manual_provider_path_gap_row`
  - Reference image: `https://www.pokecardex.com/assets/images/sets_jp/UPC/3.jpg`

## Generated Catalog Totals

- Release count: `40`
- Total rows: `1262`
- Source gaps: `2`
- Reference image witness rows: `1238`
- Provider-path reference image rows: `331`
- Audit passed: `true`

## Deterministic Checks

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`: passed
- Full catalog rebuild and audit: passed
- Early CoroCoro glossy slice: `2/2` rows, `0` source gaps, passed
- How-to-play book slice: `2/2` rows, `0` source gaps, passed
- Remaining source gaps:
  - `jp_promo_jr_east_stamp_rally_199708`: Mew booklet card
  - `jp_promo_corocoro_19971215`: glossy Computer Error row

## Manual Row Boundary

The newly modeled rows are intentionally not parent aggregate decrypted rows. They are bounded manual provider-path rows:

- `promo_family_scope.source_row_mode = manual_provider_path_gap_row`
- `image_provenance.source_row_mode = manual_provider_path_gap_row`
- `provider_row.adapter = manual_provider_path_gap_row`
- Row and image both deny `parent aggregate decrypted row`
- Image use remains limited to `manual_review` and `catalog_reference_link`
- Image use denies `training`, `seller evidence`, and `authentication proof`
- Rows still deny seller possession, authenticity, condition truth, price truth, and spendability

## Mutation Suite

Targeted manual-row mutations: `10/10` detected.

Detected mutation classes:

- `manual_mode_laundered_to_parent`
- `manual_parent_boundary_removed`
- `manual_image_display_promoted`
- `manual_image_parent_boundary_removed`
- `release_boundary_phrase_removed`

The mutation suite was applied to both touched release families.

## Multi-Agent Audit

### Source Identity Chair

- Agent: `019ed8ca-0f90-7c31-af1f-452aad6ae7cc`
- Outcome: pass.
- Confirmed source support for CoroCoro glossy Jigglypuff `UPC/2` and How-to-Play non-glossy Pikachu `UPC/3`.
- Confirmed Japanese names/romaji:
  - Jigglypuff: `プリン` / `Purin`
  - Pikachu: `ピカチュウ` / `Pikachu`
- Confirmed the provider image paths resolve as JPEGs and are bounded as external reference witnesses.
- Confirmed global source gaps reduced to `2` and named the remaining JR East Mew and CoroCoro/Song Best Computer Error gaps.

### Row and Image Lineage Chair

- Agent: `019ed8ca-7a82-7bd2-a25b-f7565d149f37`
- Outcome: pass.
- Confirmed manual rows are reference witnesses only and deny seller evidence, training, authentication proof, image-rights approval, possession, authenticity, and condition truth.
- Confirmed parent aggregate rows remain distinct:
  - CoroCoro Pikachu and How-to-Play Jigglypuff: `parent_aggregate_row`
  - CoroCoro Jigglypuff and How-to-Play Pikachu: `manual_provider_path_gap_row`
- Confirmed manifest/audit preserve the boundary and both release audits pass.

### Schema and No-Overclaim Chair

- Agent: `019ed8ca-cc1b-7481-9663-d517aa4903a9`
- Outcome: pass.
- Confirmed `manual_provider_path_gap_row` validation is explicit.
- Confirmed manual rows fail if they collide with a real parent aggregate row, lack the manual gap flag, or lose the parent-aggregate denial.
- Confirmed no generated release JSON contains legacy `source_slice_boundary_claim` or `expected_complete_source_boundary` keys.

## Boundary Statement

This change makes two previously expected early-1996 promo companions legible to agents with bounded visual references. It does not claim parent aggregate decrypted-row provenance for the manual rows, complete source objects, official copy counts, seller possession, physical authenticity, condition, image rights, marketplace pricing, or spendability.
