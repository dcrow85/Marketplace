# Japanese Pre-English Catalog: Song Best Slice Audit

Generated: 2026-06-17T15:57:29Z

## Scope

This run adds `jp_tcg_pokemon_song_best_collection_19990101` to the Japanese pre-English catalog.

The slice is intentionally bounded:

- Bulbapedia is used for the eleven-card membership spine and card-page metadata.
- Pokumon is used as a cross-check and exact event-tile image source for the seven Song Best rows it exposes.
- Bulbagarden Archives via Bulbapedia card-page image/reprint fields is used for the remaining four exact image witnesses.
- Images remain external reference witnesses only; they are not seller evidence, authentication proof, display-rights approval, or training data.

## Result

- Release catalogs: 15
- Total rows: 614
- Total image witnesses: 614
- Exact source image witnesses: 393
- Provider-path reference image witnesses: 221
- Song Best rows: 11/11
- Song Best Japanese-name rows: 11/11
- Song Best promo-context rows: 11/11
- Song Best exact image witnesses: 11/11

Deterministic audit: passed.

## Fresh-Agent Audit

Two read-only fresh agents reviewed the slice before commit.

### Erdos: Membership / Cutoff / Overclaim

Finding: P2.

English Pikachu was caveated in `print_context`, but still inherited release-wide missing-symbol and unnumbered-promo wording. This could mislead downstream agents or UI code that read `rarity_source` or `symbol_status` without the caveat.

Disposition: fixed.

- The release-family symbol status is now `mixed`.
- The seed symbol matrix and release-map row now say `mixed`.
- English Pikachu now has a row-level symbol override:
  - `prints_without_rarity_symbol: "no"`
  - `source_mode: "row_language_caveat_override"`
  - `row_caveat: "English card included in Japanese CD product."`
- English Pikachu rarity wording now says it is an English Base Set card included in the Japanese CD product.

### Ampere: Schema / Provenance / Reproducibility

Finding: P2.

The current data was internally consistent and reproducible, but `audit_release()` did not catch several likely Song Best provenance mutations: wrong image URL, blank source URL, provider-title drift, deleted source contacts, and bad Pokumon selected-tile hash.

Disposition: fixed.

The Song Best audit now checks:

- image row id and release id match the card row;
- image provider id/title match provider row;
- image URL is present and `image_large == image_small`;
- image source page URL is present;
- Pokumon rows point to the Song Best event page and carry the selected-tile hash;
- Bulbagarden/Bulbapedia image rows point back to the Bulbapedia card page and Archives media path;
- each row carries a Bulbapedia source contact linked to the selected membership-section hash and raw-page hash;
- release-level Song Best symbol status is `mixed`;
- exactly one language caveat exists and that row has the `no` symbol-status override.

## Local Verification

Commands run:

```sh
python3 -m py_compile scripts/build_japanese_pre_english_catalogs.py
jq -e '.passed == true and .release_count == 15 and .total_rows == 614' data/japanese-pre-english/audit.json
jq -e '.release_count == 15 and .total_rows == 614 and .exact_source_image_rows == 393 and .provider_path_reference_image_rows == 221' data/japanese-pre-english/manifest.json
```

Live rebuild of only Song Best:

```text
live_hash aec04cbf9594ded35be16b81ee195df23e13d234c4c90dea6b4e56f24584bbd2
file_hash aec04cbf9594ded35be16b81ee195df23e13d234c4c90dea6b4e56f24584bbd2
matches True
audit True
```

Mutation probes now fail for:

- wrong `image_provenance.image_large`;
- blank `image_provenance.source_page_url`;
- wrong `image_provenance.provider_title`;
- deleted `source_contacts`;
- bad `provider_row.pokumon_event_tile_sha256`;
- English Pikachu symbol override changed back to `yes`;
- release symbol status changed back to `yes`.

## Remaining Gaps

- This is still not a complete pre-English catalog.
- Song Best image witnesses are external references, not approved display assets.
- Bulbapedia and Pokumon are hobby/reference sources, not official source-of-truth authorities.
- The slice records CD inclusion; for many rows it does not claim first distribution.
