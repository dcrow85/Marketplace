# Japanese Pre-English Catalog Expansion Audit

Generated: 2026-06-17T14:20:54Z

## Scope

This run expands the Japanese pre-English catalog beyond the No Rarity lab into
seven regular release families where row lists and exact external image
witnesses can be mechanically matched:

- `jp_tcg_jungle_19970305`
- `jp_tcg_mystery_of_the_fossils_19970621`
- `jp_tcg_rocket_gang_19971121`
- `jp_tcg_expansion_sheet_1_blue_19980323`
- `jp_tcg_expansion_sheet_2_red_19980617`
- `jp_tcg_expansion_sheet_3_green_19981124`
- `jp_tcg_leaders_stadium_19981024`

This is not the complete pre-English catalog. Starter Pack, Gift Pack, Team
Rocket Gift Pack, Quick Starter Gift Set, Gym decks, Game Boy / CD promo
containers, and promo/campaign clusters remain pending split manifests.

## Artifacts

- Generator: `scripts/build_japanese_pre_english_catalogs.py`
- Manifest: `data/japanese-pre-english/manifest.json`
- Deterministic audit: `data/japanese-pre-english/audit.json`
- Release catalogs: `data/japanese-pre-english/releases/*.json`

## Deterministic Result

The builder passed its deterministic audit:

```text
jp_tcg_jungle_19970305: rows=48/48 images=48 tcgdex=48 passed=True
jp_tcg_mystery_of_the_fossils_19970621: rows=48/48 images=48 tcgdex=48 passed=True
jp_tcg_rocket_gang_19971121: rows=65/65 images=65 tcgdex=65 passed=True
jp_tcg_expansion_sheet_1_blue_19980323: rows=36/36 images=36 tcgdex=0 passed=True
jp_tcg_expansion_sheet_2_red_19980617: rows=36/36 images=36 tcgdex=0 passed=True
jp_tcg_expansion_sheet_3_green_19981124: rows=53/53 images=53 tcgdex=0 passed=True
jp_tcg_leaders_stadium_19981024: rows=96/96 images=96 tcgdex=96 passed=True
```

Total rows: 382.

Exact external image witnesses: 382.

## Image Boundary

Every row has an `image_provenance` object with:

- `status: exact_source_image`
- `rights_status: external_reference_witness`
- `display_allowed: false`
- `allowed_use: ["manual_review", "catalog_reference_link"]`
- `not_allowed_by_default: ["training", "seller evidence", "authentication proof"]`

This means the catalog now has row-specific image URLs, but those images are not
promoted into seller evidence, authenticity proof, training data, or approved
in-app display rights. A future UI may link or review them under those
constraints.

## Name Boundary

The generator intentionally does not promote TCGdex's `name` field into the
primary Japanese-name field, because the sampled early PMCG rows contain
machine-normalized or translated strings that are not reliable print names.

`name_ja` is filled only when the exact source page exposes a `JPN:` label.
Otherwise the row carries:

```text
name_ja: ""
name_ja_status: "missing_from_exact_source"
```

Coverage from this run:

```text
jp_tcg_jungle_19970305: source-labeled Japanese names 0/48
jp_tcg_mystery_of_the_fossils_19970621: source-labeled Japanese names 30/48
jp_tcg_rocket_gang_19971121: source-labeled Japanese names 23/65
jp_tcg_expansion_sheet_1_blue_19980323: source-labeled Japanese names 31/36
jp_tcg_expansion_sheet_2_red_19980617: source-labeled Japanese names 33/36
jp_tcg_expansion_sheet_3_green_19981124: source-labeled Japanese names 39/53
jp_tcg_leaders_stadium_19981024: source-labeled Japanese names 0/96
```

This is an explicit remaining data gap, not a failure of the image/row audit.

## Multi-Agent Audit

### Hegel: Release Scope Auditor

Hegel confirmed that the current map treats both `Catalog target` and
`Promo target` families as future catalog rows, while boundary-only objects
remain outside the TCG catalog. The strongest finding was that
`data/pre-english-symbol-status.json` covers product families but not the full
promo table yet, so the full goal requires extending the symbol-status matrix
before promo rows are treated as complete.

Priority guidance from Hegel:

1. Preserve the No Rarity lab.
2. Build Quick Starter and Vending because they harden No Rarity traps.
3. Resolve Starter / Gift Pack ambiguity.
4. Map Gym deck missing-symbol lanes.
5. Fill regular mainline expansions.
6. Split promo clusters with stronger provenance.

This run completes one large part of item 5 and the Vending side of item 2.

### Hubble: Image Provenance Auditor

Hubble confirmed the governing image rule:

```text
exact image or no image
```

For new catalogs, exact means same release family, same row, and same
variant/print. English API images, marketplace photos, same-artwork cards, and
nearby promo/deck versions must not be displayed as catalog references.

Hubble recommended a generic `image_provenance` object with exactness, rights,
allowed-use, and `not_claiming` fields. This run implements that recommendation
and fails closed on display rights.

## Open Findings

### JPE-CAT-001: Promo symbol status matrix incomplete

The symbol-status matrix must be extended to promo families. Current rows do not
claim the full pre-English symbol matrix is complete.

### JPE-CAT-002: Deck and promo products not row-split

Starter Pack, Gift Pack, Team Rocket Gift Pack, Quick Starter, Gym decks, Game
Boy promo, Song Best Collection, and campaign/tournament promos remain pending.

### JPE-CAT-003: Japanese print names incomplete

For the seven generated catalogs, exact source pages only expose some Japanese
names. The missing values are explicitly marked and should be filled from a
separately audited source, not from TCGdex machine-normalized names.

### JPE-CAT-004: Image rights not promoted

The catalog has image URLs and source hashes, but image rights remain
`external_reference_witness`. This is appropriate for agent review and catalogue
linking, not automatic public display or model training.

## Verdict

Passed for this slice:

- row count matches expected release counts,
- row ids are unique,
- every row has an exact external image witness,
- image usage fails closed,
- every row preserves seller-possession / authenticity / condition boundaries.

Not complete for the global goal:

- not all gathered Japanese pre-English release families are row-built,
- not all promo families are split,
- not all Japanese print names are source-labeled yet,
- image rights are not approved for display/training.
