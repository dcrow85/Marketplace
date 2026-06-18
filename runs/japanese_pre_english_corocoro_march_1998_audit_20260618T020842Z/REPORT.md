# CoroCoro March 1998 Source Slice Audit

Generated: `2026-06-18T02:08:42Z`

## Slice

- Release family: `jp_promo_corocoro_march_1998_19980215`
- Source slice: CoroCoro Comic March 1998 issue insert, released February 15, 1998
- Rows modeled:
  - `037` Brock's Onix / `タケシのイワーク` / `Takeshi's Iwark`
  - `038` Misty's Staryu / `カスミのヒトデマン` / `Kasumi's Hitodeman`
- Reference images:
  - `https://www.pokecardex.com/assets/images/sets_jp/UPC/37.jpg`
  - `https://www.pokecardex.com/assets/images/sets_jp/UPC/38.jpg`

## Generated Catalog Totals

- Release count: `38`
- Total rows: `1252`
- Source gaps: `4`
- Reference image witness rows: `1228`
- Provider-path reference image rows: `321`
- Audit passed: `true`

## Deterministic Checks

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`: passed
- `python3 -m json.tool data/japanese-pre-english/source-snapshots/bulbapedia_corocoro_march_1998_selected_lines.json`: passed
- Generated release JSON parse: passed
- Manifest JSON parse: passed
- Catalog audit: passed
- Dangling reprint-fragment check: passed after cleanup

## Mutation Suite

Result: `19/19` mutations detected.

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

## Multi-Agent Audit

### Source Authority Chair

- Agent: `019ed878-42b0-7413-9c9c-5e73450ecb55`
- Outcome: one P3 finding, fixed.
- Finding: selected source text included two dangling `It was reprinted...` fragments from Bulbapedia rendered card pages.
- Fix: removed those two partial lines from `bulbapedia_corocoro_march_1998_selected_lines.json` and removed the matching `released on February 15, 1998` expected-text guard from the builder. The clean table line `March 1998 issue insert (February 15, 1998)` remains the date support.
- No P0-P2 source-authority or overclaim findings.

### Row and Image Chair

- Agent: `019ed878-44d1-7b91-8f01-69e5b825ebd7`
- Outcome: pass.
- Confirmed exact two-row set, parent UPC sort pins, source-labeled Japanese names/romaji, provider-path-only image witnesses, image-rights boundaries, and coherent manifest/audit totals.

### Schema and Boundary Chair

- Agent: `019ed878-46c9-75d1-b69d-a87aa2db2557`
- Outcome: pass.
- Confirmed expected count `2`, modeled sorts `[37, 38]`, zero source gaps, selected text guards, `complete magazine source` boundary denial, source-labeled names, legacy boundary-claim rejection, provider-path image status, and audit row `passed: true`.

## Boundary Statement

This slice models only the two source-pinned card identities in the CoroCoro Comic March 1998 issue insert. It does not model the complete magazine object, later mail-in prize draws, theme-deck or expansion reprint history, official copy counts, seller possession, physical authenticity, condition, image rights, or complete marketplace pricing.
