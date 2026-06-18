# Japanese Pre-English Catalog Slice: Latest How-to-Play Book

Timestamp: 2026-06-18T01:43:40Z

## Slice

- Release id: `jp_promo_latest_how_to_play_book_19981113`
- Modeled rows:
  - `jp_promo_latest_how_to_play_book_19981113:054` — Diglett / `ディグダ` / Digda
  - `jp_promo_latest_how_to_play_book_19981113:055` — Dugtrio / `ダグトリオ` / Dugtrio
- Source boundary: complete source-pinned latest how-to-play book card identity slice, not a complete book-object ledger
- Reference image witnesses:
  - `https://www.pokecardex.com/assets/images/sets_jp/UPC/54.jpg`
  - `https://www.pokecardex.com/assets/images/sets_jp/UPC/55.jpg`

## Sources

- Pokumon Diglett page: `Diglett (Easily Understand How to Play Pokemon Cards 1998) (Unnumbered)`, `Easily Understand How to Play Pokémon Cards Latest Edition (November 1998)`, `Miki Tanaka`
- Pokumon Dugtrio page: `Dugtrio (Easily Understand How to Play Pokemon Cards 1998) (Unnumbered)`, `Easily Understand How to Play Pokémon Cards Latest Edition (November 1998)`, `Miki Tanaka`
- Bulbapedia Diglett Asobikata page: `ディグダ Digda`, paired with Dugtrio, included in `Easily Understand How to Play Pokémon Cards: Latest Edition`, released on `November 13, 1998`
- Bulbapedia Dugtrio Asobikata page: `ダグトリオ Dugtrio`, paired with Diglett, included in `Easily Understand How to Play Pokémon Cards: Latest Edition`, released on `November 13, 1998`
- Bulbapedia unnumbered promo table: Diglett and Dugtrio entries under `Easily Understand How to Play Pokémon Cards: Latest Edition (November 13, 1998)`

The selected source lines support the two card identities, book/date context, Miki Tanaka illustrator lines, Japanese name/transliteration lines, and Asobikata collector shorthand. The source snapshot keeps later Pokémon Web reprint text as selected source context only, not as an extracted row claim.

## Output Totals

- Releases: 37
- Rows: 1250
- Source gaps: 4
- Reference image witness rows: 1226
- Provider-path reference image rows: 319
- Audit: passed

## Verification

Commands/checks run:

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`
- `python3 -m json.tool` over the new source snapshot, new release, manifest, and audit
- Manifest/audit total comparison
- Promo-child regeneration from local release bytes to keep builder output and generated JSONs aligned
- Latest How-to-Play Book mutation suite: 18/18 expected failures detected

Mutation cases:

- inflated expected source count
- removed one row
- erased modeled sort
- promoted complete family modeling
- mutated selected source text
- mutated selected source hash
- removed complete book denial
- promoted provider-path image to exact source image
- mutated primary source denial
- mutated context source denial
- mutated context authority label
- mutated Diglett Japanese name
- removed Dugtrio romaji
- injected legacy positive boundary claim key into promo family scope
- injected legacy positive boundary claim key into primary source
- injected legacy positive boundary claim key into family context
- injected legacy positive boundary claim key into product scope
- injected legacy positive boundary claim key into context contact

## Multi-Agent Audit

- Source chair: passed with two P3 caveats. Fixed normalized card labels so `expected_cards` and `promo_cards` use the exact Pokumon-style source labels, and demoted Pokémon Web reprint text from extracted claims to selected source context only.
- Row/image/provenance chair: no findings. Confirmed rows 054/055, provider-path images `UPC/54.jpg` and `UPC/55.jpg`, inherited hash/caveats, and no exact-image/seller-evidence/authenticity promotion.
- Schema/boundary chair: one P2 hardening finding. `source_slice_boundary_claim` rejection only covered `promo_family_scope`. Fixed by recursively rejecting that legacy positive-boundary key in primary source, product scope, context contacts, and family context; mutation suite now covers each insertion point.

No high findings remained after patching.

## Residual Boundaries

This slice still does not claim:

- complete book-object provenance
- sealed-book variant coverage
- official copy count
- complete Asobikata promo variant census
- complete Pokémon Web reprint context
- seller possession
- authenticity
- condition
- price truth
- image rights beyond external reference witness/manual review
