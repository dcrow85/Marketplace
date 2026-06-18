# JR East Mew Gap Closure Audit

Generated: `2026-06-18T03:49:44Z`

## Slice

- Release family: `jp_promo_jr_east_stamp_rally_199708`
- Closed row: `015` Mew / `ミュウ` / `Mew`
- Row mode: `manual_provider_path_gap_row`
- Reference image: `https://www.pokecardex.com/assets/images/sets_jp/UPC/15.jpg`

## Generated Catalog Totals

- Release count: `40`
- Total rows: `1263`
- Source gaps: `1`
- Reference image witness rows: `1239`
- Provider-path reference image rows: `332`
- Audit passed: `true`

## Deterministic Checks

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`: passed
- Full catalog rebuild and audit: passed
- JR East Stamp Rally slice: `2/2` rows, `0` source gaps, passed
- Remaining source gap:
  - `jp_promo_corocoro_19971215`: glossy Computer Error row

## JR East Row Set

- `014` Surfing Pikachu / `なみのりピカチュウ` / `Surfing Pikachu`
  - Row mode: `parent_aggregate_row`
  - Reference image: `https://www.pokecardex.com/assets/images/sets_jp/UPC/14.jpg`
- `015` Mew / `ミュウ` / `Mew`
  - Row mode: `manual_provider_path_gap_row`
  - Reference image: `https://www.pokecardex.com/assets/images/sets_jp/UPC/15.jpg`

## Manual Row Boundary

The Mew row is intentionally not a parent aggregate decrypted row. It is a bounded manual provider-path row:

- `promo_family_scope.source_row_mode = manual_provider_path_gap_row`
- `image_provenance.source_row_mode = manual_provider_path_gap_row`
- `provider_row.adapter = manual_provider_path_gap_row`
- Row and image both deny `parent aggregate decrypted row`
- Image use remains limited to `manual_review` and `catalog_reference_link`
- Image use denies `training`, `seller evidence`, and `authentication proof`
- Row still denies seller possession, authenticity, condition truth, price truth, and spendability

## Mutation Suite

Targeted JR manual-row mutations: `5/5` detected.

Detected mutation classes:

- `manual_mode_laundered_to_parent`
- `manual_parent_boundary_removed`
- `manual_image_display_promoted`
- `manual_image_parent_boundary_removed`
- `release_boundary_phrase_removed`

Additional schema chair probe: parent-row-to-manual laundering and recursive legacy boundary keys are detected by the validator.

## Multi-Agent Audit

### Source Identity Chair

- Agent: `019ed8d7-756e-7d51-a54c-1717f0d5d4ec`
- Outcome: pass.
- Confirmed Pokumon source support for the JR East event window, two-card booklet claim, Surfing Pikachu + Mew identities, matte texture, and Surfing Pikachu's Mt. Fuji/JR train distinction.
- Confirmed Mew `UPC/15` as `manual_provider_path_gap_row` with explicit parent-aggregate denial.
- Confirmed Japanese names/romaji:
  - Surfing Pikachu: `なみのりピカチュウ` / `Surfing Pikachu`
  - Mew: `ミュウ` / `Mew`
- Confirmed global source gaps reduced to `1`.

### Row and Image Lineage Chair

- Agent: `019ed8d8-6d50-7e91-9420-887bd7958d07`
- Outcome: pass.
- Confirmed Mew `UPC/15` is bounded as a manual provider-path reference only with `display_allowed: false`.
- Confirmed Surfing Pikachu `UPC/14` remains `parent_aggregate_row`.
- Confirmed no promotion to training, seller evidence, authentication proof, possession, authenticity, condition, image rights, or parent aggregate row status.
- Confirmed manifest/audit preserve `row_count: 2`, `expected_source_card_count: 2`, and `source_gap_count: 0` for JR East.

### Schema and No-Overclaim Chair

- Agent: `019ed8d9-18ce-78d0-bf22-cb260dbb9af7`
- Outcome: pass.
- Confirmed the existing manual-row validator covers JR Mew and catches laundering into parent rows.
- Confirmed manual Mew rewritten as a parent row fails, a real parent row rewritten as manual fails, removing manual parent-boundary language fails, and recursive legacy boundary keys fail.
- Noted a non-finding wording nuance: row-level `not_claiming` uses broader `complete source object`, while the booklet-specific boundary is explicit in release, manifest, and source contact scopes.

## Boundary Statement

This change makes the JR East Stamp Rally Mew booklet card legible to agents with a bounded visual reference. It does not claim parent aggregate decrypted-row provenance for the manual row, complete event source, complete booklet-object source, official copy counts, seller possession, physical authenticity, condition, image rights, marketplace pricing, or spendability.
