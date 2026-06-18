# Japanese Pre-English Illustrator Credit Audit

Generated: `2026-06-18T15:14:31Z`

## Slice

Goal: make artist/illustrator credit coverage explicit across the generated Japanese pre-English catalogs.

This pass fills the Pokellector-backed rows that previously carried an empty illustrator object by using Bulbapedia Japanese set-list entries to resolve exact card pages, then reading the card-page `Illus.` caption. The credit is attached as catalog texture only: it is not seller evidence, physical authentication, condition evidence, price truth, or direct Japanese-print authority.

## Coverage

- Total rows: `1264`
- Named illustrator rows: `1256`
- Explicitly not-credited rows: `8`
- Unresolved illustrator rows: `0`
- Catalog audit passed: `true`
- Source gaps: `0`

The `8` non-named rows are all in `jp_tcg_expansion_sheet_3_green_19981124` and are explicitly marked `credit_status: not_credited_in_source_page` rather than left blank. They are pass-card/deck-list/special cards whose Bulbapedia card pages do not carry an `Illus.` caption.

## Source Families Added

Supplemental illustrator credits were added for these source families:

- `jp_tcg_jungle_19970305`
- `jp_tcg_mystery_of_the_fossils_19970621`
- `jp_tcg_rocket_gang_19971121`
- `jp_tcg_team_rocket_gift_pack_19971219` via Rocket Gang inheritance
- `jp_tcg_expansion_sheet_1_blue_19980323`
- `jp_tcg_expansion_sheet_2_red_19980617`
- `jp_tcg_expansion_sheet_3_green_19981124`
- `jp_tcg_leaders_stadium_19981024`

Each filled row now carries:

- `illustrator.name`
- `illustrator.display`
- `illustrator.credit_status`
- `illustrator.requested_page_title`
- `illustrator.resolved_page_title`
- `illustrator.source_page_url`
- `illustrator.source_page_sha256`
- a matching `source_contacts[]` entry for the Bulbapedia card page

## Deterministic Checks

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`: passed
- `python3 scripts/build_japanese_pre_english_catalogs.py`: passed
- Generated manifest/audit totals:
  - `total_rows: 1264`
  - `illustrator_named_rows: 1256`
  - `illustrator_not_credited_rows: 8`
  - `illustrator_unresolved_rows: 0`
  - `source_gap_count: 0`
  - `audit.passed: true`

## Boundary Statement

This change makes artist credit legible to agents. It does not claim that Bulbapedia is an official source, that a seller's physical card has the same printed credit, that the scan authenticates a card, that image rights are approved, or that a credited illustrator field can move any protocol gate.
