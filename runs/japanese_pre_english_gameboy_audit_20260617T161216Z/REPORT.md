# Japanese Pre-English Catalog: Pokemon Card GB Slice Audit

Generated: 2026-06-17T16:12:16Z

## Scope

This run adds `jp_tcg_gameboy_card_gb_19981218` as a standalone product-family slice for the physical Dragonite promo included with the Japanese Game Boy Color game.

The slice is intentionally bounded:

- PokéCardex UPC sort `60` is used for the Dragonite source row and provider-path image witness.
- Bulbapedia's Dragonite Pokémon Card GB promo page is used only for Japanese name, transliteration, and card-profile metadata.
- The retail video game is not promoted to a TCG set. The catalog row represents the physical TCG insert.
- The same Dragonite source row remains present in the broader unnumbered-promo aggregate; this slice gives the product family its own strict row.

## Result

- Release catalogs: 16
- Total rows: 615
- Total image witnesses: 615
- Exact source image witnesses: 393
- Provider-path reference image witnesses: 222
- Game Boy rows: 1/1
- Game Boy Japanese-name rows: 1/1
- Game Boy promo-context rows: 1/1

Deterministic audit: passed.

## Local Verification

Commands run:

```sh
python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py
jq -e '.passed == true and .release_count == 16 and .total_rows == 615' data/japanese-pre-english/audit.json
jq -e '.release_count == 16 and .total_rows == 615 and .exact_source_image_rows == 393 and .provider_path_reference_image_rows == 222' data/japanese-pre-english/manifest.json
```

Live rebuild of only the Game Boy slice:

```text
live_hash 9c30c01cee2ed4791ec1dc3df3e6a5eaff2f6bfd871a6e4b8c4737e429d82108
file_hash 9c30c01cee2ed4791ec1dc3df3e6a5eaff2f6bfd871a6e4b8c4737e429d82108
matches True
audit True
```

Mutation probes now fail for:

- wrong UPC source sort;
- wrong provider-path image URL;
- missing PokéCardex source contact;
- missing Bulbapedia source contact;
- missing Japanese-name coverage.

## Fresh-Agent Audit

Two read-only fresh agents reviewed the slice before commit.

### Darwin: Membership / Cutoff / Overclaim

Finding: P2.

`collector_texture.basis[0]` said `PokéCardex exact row page`, but this slice uses a decrypted PokéCardex UPC series payload row plus provider-path image convention, not a distinct exact card row page.

Disposition: fixed.

- PokéCardex-derived rows now say `PokéCardex decrypted series payload row and provider-path image convention`.
- Bulbapedia/Song Best rows get their own basis wording.

### Volta: Schema / Provenance / Reproducibility

Finding: P2.

The image provenance fields were correctly bounded as `provider_path_reference_image`, but nearby `information_audit` text still called the image an `exact external reference image`.

Disposition: fixed.

- `information_audit.earns_keep[0].field` is now status-aware:
  - `provider-path external reference image` for provider-path rows;
  - `exact external reference image` only for exact-source rows.

Both agents found no P0/P1 issues.

## Remaining Gaps

- Image witness remains provider-path-derived from PokéCardex, not a per-row image field inside the decrypted payload.
- PokéCardex and Bulbapedia are reference sources, not official source-of-truth authorities.
- The row does not authenticate any physical Dragonite card, condition, possession, or price.
