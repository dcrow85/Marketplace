# Azuki TCG Catalog

This directory is a standalone catalog for Azuki TCG, separate from the
Pokemon catalog layers.

The current import is built from the official Azuki TCG gallery endpoint:

- Gallery: `https://tcg.azuki.com/gallery`
- Card API snapshot: `https://tcg.azuki.com/api/cards`
- Builder: `scripts/build_azuki_tcg_catalog.py`

The catalog records **official gallery entries**, not a stronger physical
market claim. It preserves the source data as returned by the endpoint,
including variant entries, alternate-art entries, promo entries, starter deck
entries, and any source anomalies.

Current snapshot facts:

- 234 official gallery entries
- 202 unique `cardId` values
- 27 `cardId` values with multiple gallery entries
- Sets surfaced by the endpoint: `Booster`, `Promo`, `Starter Deck 1`,
  `Starter Deck 2`, `Starter Deck 3`, `Starter Deck 4`

Authority boundary:

- This catalog does not prove seller possession.
- This catalog does not prove physical-card authenticity or condition.
- This catalog does not claim market value.
- This catalog does not adjudicate errata beyond preserving the source text.
- This catalog does not claim completeness beyond the official gallery
  endpoint snapshot pinned in `source-snapshots/`.

Rebuild:

```bash
python3 scripts/build_azuki_tcg_catalog.py --check
```

Refresh from the live official endpoint:

```bash
python3 scripts/build_azuki_tcg_catalog.py --refresh
```
