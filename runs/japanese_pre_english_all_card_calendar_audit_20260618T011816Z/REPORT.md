# Japanese Pre-English Catalog Slice: All Card Calendar

Timestamp: 2026-06-18T01:18:16Z

## Slice

- Release id: `jp_promo_all_card_calendar_19981105`
- Modeled row: `jp_promo_all_card_calendar_19981105:053`
- Card: `_____'s Pikachu`
- Collector alias: `Birthday Pikachu`
- Source boundary: complete source-pinned calendar card identity slice, not a complete calendar-object ledger
- Reference image witness: `https://www.pokecardex.com/assets/images/sets_jp/UPC/53.jpg`

## Sources

- Pokumon: `_____’s Pikachu (Pokemon 2nd Anniversary Calendar 1998) (Unnumbered)`
- Pokumon product context: `Pokemon 2nd Anniversary Calendar`, `Bundle Promo`, `1998`, `Unnumbered`, `Kagemaru Himeno`, `Cosmos`, `Japanese`
- Bulbapedia card page: `_____'s Pikachu`, `Kagemaru Himeno`, `Birthday Surprise`, `おたんじょうび`, `All Card Calendar`
- Bulbapedia release context: released on `November 5, 1998` in celebration of the second anniversary of the Trading Card Game
- Bulbapedia unnumbered promo table: `_____'s Pikachu`, `All Card Calendar`, `(November 5, 1998)`

The selected source lines support the calendar identity, release date, illustrator, and birthday-attack context. They do not quote `Birthday Pikachu` as the official title, so the source-context extracted claims store that phrase only as collector shorthand.

## Output Totals

- Releases: 36
- Rows: 1248
- Source gaps: 4
- Reference image witness rows: 1224
- Provider-path reference image rows: 317
- Audit: passed

## Verification

Commands/checks run:

- `python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py`
- `python3 -m json.tool` over the new source snapshot, new release, manifest, and audit
- Manifest/audit total comparison
- Focused grep confirming the calendar boundary appears only on the calendar slice
- Promo-child regeneration from local release bytes to keep builder output and generated JSONs aligned
- All Card Calendar mutation suite: 11/11 expected failures detected

Mutation cases:

- inflated expected source count
- erased modeled sort
- promoted complete family modeling
- mutated selected source text
- mutated selected source hash
- removed complete calendar denial
- promoted provider-path image to exact source image
- mutated primary source denial
- mutated context source denial
- mutated context authority label
- injected legacy positive boundary claim key

## Multi-Agent Audit

- Source chair: found one Low issue. `Birthday Pikachu` was reading too much like a source-quoted title. Fixed by storing `_____'s Pikachu` as the card name and moving `Birthday Pikachu` into source-context `collector_aliases` with a shorthand caveat.
- Row/image/provenance chair: no findings. Confirmed row 053, provider-path image `UPC/53.jpg`, and inherited source-contact caveats are coherent.
- Schema/boundary chair: found one Low issue. `source_slice_boundary_denial` duplicated the canonical denial field in generated promo-child rows. Fixed by removing the alias and regenerating all promo-child release JSONs.

No high or medium findings remained after patching.

## Residual Boundaries

This slice still does not claim:

- complete All Card Calendar object provenance
- sealed-calendar variant coverage
- complete Birthday Pikachu variant census
- official copy count
- seller possession
- authenticity
- condition
- price truth
- image rights beyond external reference witness/manual review
- Japanese print name authority beyond the selected source lines
