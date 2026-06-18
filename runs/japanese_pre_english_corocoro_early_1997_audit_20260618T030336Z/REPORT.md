# CoroCoro Early 1997 Source Slice Audit

Generated: `2026-06-18T03:03:36Z`

## Slice

- Release family: `jp_promo_corocoro_early_1997`
- Source slice: CoroCoro Comic early 1997 issue inserts, released January 15, May 15, August 15, and October 15, 1997
- Rows modeled:
  - `005` Mew / `ミュウ` / `Mew`
  - `007` Mewtwo / `ミュウツー` / `Mewtwo`
  - `016` Surfing Pikachu / `なみのりピカチュウ` / `Surfing Pikachu`
  - `017` Imakuni? / `イマクニ？` / `Imakuni?`
  - `020` Flying Pikachu / `そらをとぶピカチュウ` / `Flying Pikachu`
- Reference images:
  - `https://www.pokecardex.com/assets/images/sets_jp/UPC/5.jpg`
  - `https://www.pokecardex.com/assets/images/sets_jp/UPC/7.jpg`
  - `https://www.pokecardex.com/assets/images/sets_jp/UPC/16.jpg`
  - `https://www.pokecardex.com/assets/images/sets_jp/UPC/17.jpg`
  - `https://www.pokecardex.com/assets/images/sets_jp/UPC/20.jpg`

## Generated Catalog Totals

- Release count: `40`
- Total rows: `1260`
- Source gaps: `4`
- Reference image witness rows: `1236`
- Provider-path reference image rows: `329`
- Audit passed: `true`

## Deterministic Checks

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`: passed
- `python3 -m json.tool data/japanese-pre-english/source-snapshots/bulbapedia_corocoro_early_1997_selected_lines.json`: passed
- Targeted release build and audit: passed
- Full catalog rebuild and audit: passed
- Generated release JSON parse: passed
- Manifest JSON parse: passed
- Legacy boundary-key data scan: passed

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

- Agent: `019ed8ac-4512-7461-a810-5ae1fb4c139c`
- Outcome: pass.
- Confirmed the selected Bulbapedia table and card-page lines support the five CoroCoro issue-insert identities, Japanese names, romaji, illustrator lines, and issue context.
- Confirmed overclaim boundaries for later mail-in prize draws, JR/ANA/Fan Book reprints, official copy counts, complete magazine source, image rights, seller possession, authenticity, condition, and pricing.
- Noted one honest nuance: the slice is five card rows across four issue-insert events because Surfing Pikachu and Imakuni? share the September 1997 insert.

### Row and Image Chair

- Agent: `019ed8ac-47ad-7922-a818-02a258b74491`
- Outcome: pass.
- Confirmed exact five-row set, parent UPC sort pins, source-labeled Japanese names/romaji, provider-path-only image witnesses, image-rights boundaries, and coherent manifest/audit totals.

### Schema and Boundary Chair

- Agent: `019ed8ac-49cf-7890-b4e8-3a507c7ee756`
- Outcome: pass.
- Confirmed expected count `5`, modeled sorts `[5, 7, 16, 17, 20]`, zero source gaps, `complete magazine source` boundary denial, source-labeled Japanese names, provider-path image status, recursive legacy key rejection, and `22/22` mutation credibility.
- Extra in-memory canary: recursive `expected_complete_source_boundary` insertions were detected `5/5`.

## Boundary Statement

This slice models only five source-pinned card identities from CoroCoro Comic early 1997 issue inserts. It does not model complete magazine objects, later mail-in prize drawings, JR East/Fan Book/ANA reprint contexts, official copy counts, seller possession, physical authenticity, condition, image rights, or complete marketplace pricing.
