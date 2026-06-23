# Azuki TCG Catalog

This directory is a standalone catalog for Azuki TCG, separate from the
Pokemon catalog layers.

The current import is built from two Azuki sources:

- Gallery: `https://tcg.azuki.com/gallery`
- Card API snapshot: `https://tcg.azuki.com/api/cards`
- Alpha Master Sheet: `http://bit.ly/3JwO6gP`
- Resolved sheet:
  `https://docs.google.com/spreadsheets/d/10HREsBCaSkEvbPdM505PZSbXxiWGEP-Itv96Xa5Ene0/edit?gid=0#gid=0`
- Builder: `scripts/build_azuki_tcg_catalog.py`

The directory now contains two sibling release files:

- `releases/azuki_tcg_official_gallery.json` records **official gallery
  entries** from the website API.
- `releases/azuki_tcg_alpha_master_sheet.json` records **Alpha Master Sheet
  rows** from the linked Google Sheet, including illustrator, reference IP,
  effect text, flavor text, definition/ruling text, stamp, and a card-ID
  crosswalk back to the gallery catalog when available.

The catalog preserves source data as returned by each source, including
variant entries, alternate-art entries, promo entries, starter deck entries,
sheet rows, and source anomalies. It does not silently normalize source scars.

Current snapshot facts:

Official gallery:

- 234 official gallery entries
- 202 unique `cardId` values
- 27 `cardId` values with multiple gallery entries
- Sets surfaced by the endpoint: `Booster`, `Promo`, `Starter Deck 1`,
  `Starter Deck 2`, `Starter Deck 3`, `Starter Deck 4`

Alpha Master Sheet:

- 104 sheet rows
- 104 unique card IDs
- 104 card IDs crosswalked to the official gallery by shared `cardId`
- Prefixes represented: `AZK01`, `STT01`, `STT02`, `AZP`, `IKZ`
- One non-`Alpha` stamp is preserved as source data:
  `AZP-002` / `Azuki Trial Event Winner`

Authority boundary:

- This catalog does not prove seller possession.
- This catalog does not prove physical-card authenticity or condition.
- This catalog does not claim market value.
- This catalog does not adjudicate errata beyond preserving the source text.
- This catalog does not adjudicate rules beyond preserving source text.
- This catalog does not claim completeness beyond the pinned official gallery
  endpoint and linked Alpha Master Sheet snapshots in `source-snapshots/`.
- The Alpha-to-gallery crosswalk means shared card ID only; it does not prove
  identical image treatment, rarity treatment, physical printing, or possession.

Rebuild:

```bash
python3 scripts/build_azuki_tcg_catalog.py --check
```

Refresh from the live official endpoint and linked Alpha Master Sheet:

```bash
python3 scripts/build_azuki_tcg_catalog.py --refresh
```
