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
  entries** from the website API. In the current snapshot, gallery
  `source_entry_id` values beginning with `S1-` are treated in the UI payload as
  **Gates Awakened** rows, not Alpha rows.
- `releases/azuki_tcg_alpha_master_sheet.json` records **Alpha Master Sheet
  rows** from the linked Google Sheet, including illustrator, reference IP,
  effect text, flavor text, definition/ruling text, stamp, and a card-ID
  crosswalk back to the gallery catalog when available.

It also contains a spreadsheet completion layer:

- `spreadsheets/azuki_tcg_alpha_fields_completion.csv` is a 234-row
  Alpha-style spreadsheet for every official gallery entry. The first columns
  match the Alpha Master Sheet fields; trailing provenance columns preserve a
  unique row key, source entry ID, set, image URL, field source, missing-field
  list, and review status.
- `spreadsheets/azuki_tcg_alpha_fields_completion_provenance.json` explains
  how the completion was built. Alpha-crosswalked rows use the linked Alpha
  sheet for Alpha fields. Non-Alpha gallery rows use official API fields where
  available, and use an image-view pass only for manually readable illustrator
  credit lines.

And it contains a user-photo observation layer:

- `observations/azuki_tcg_user_photo_promo_observations_2026_06_24.csv`
  records four promo/variant cards observed from a user-provided photo. The
  photo itself is **not** committed to the public repository; the provenance
  file records only its SHA-256 hash.
- `observations/azuki_tcg_user_photo_promo_observations_2026_06_24_provenance.json`
  records the observation authority boundary, gallery matches, and conflicts.
  This layer is evidence from a photo, not an official checklist expansion.
- `observations/azuki_tcg_user_image_portrait_alt_observations_2026_06_24.csv`
  records two portrait alternate rare leader images observed from user-provided
  image files.
- `observations/azuki_tcg_user_image_portrait_alt_observations_2026_06_24_provenance.json`
  records their image hashes, gallery matches, and the printed/gallery ID-shape
  boundary.

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

Alpha-field completion spreadsheet:

- 234 rows, one per official gallery entry
- 234 unique row keys
- 122 rows crosswalked to the Alpha Master Sheet by shared `cardId`
- 112 rows completed from official gallery data
- 110 official-only rows have illustrator credits filled by image view
- 2 official-only rows remain in the image-review queue because the printed
  credit line is visible but too compressed/stylized to transcribe confidently

Promo observation layer:

- 4 user-photo observation rows
- 2 printed IDs not present in the current official gallery snapshot:
  `AZP-004`, `AZP-005`
- 1 preserved source conflict: photo-observed `AZK01-028` illustrator reads
  `Tomugi`, while the linked Alpha Master Sheet currently supplies `Comiccho`
- 1 Bobu variant observation: printed `STT03-001`, `Illus. nJoo`, with an
  Invader-style visual stamp, matched to gallery `STT03-01` rows only as a
  comparison candidate

Portrait alternate observation layer:

- 2 user-image observation rows
- `STT02-001` Shao matches the official gallery portrait alternate-art booster
  row `STT02-001A_Shao_L_AA_Die`
- `STT04-001` Zero matches the official gallery booster-star row
  `S1-STT04-001_Zero_L_L_die__2`, while the gallery canonical card ID is
  `STT04-01`; both printed and normalized ID shapes are preserved
- Both rows read `Illus. steamboy` and `L ★` from the image

Star / alternate-art signal audit:

- `audits/azuki_tcg_star_alt_art_audit_2026_06_24.csv` compares official
  gallery `★` rarity, Alpha-field completion `★` rarity, source/image filename
  variant markers, and exact image URL reuse across siblings.
- `audits/azuki_tcg_star_alt_art_audit_2026_06_24_provenance.json` records the
  audit policy and counts.
- Current findings: 50 rows in scope, 22 review rows, 5 high-severity rows.
  The high-severity bucket includes one `★` row reusing a non-star image URL
  (`STT04-01` Zero), four source/image card-ID disagreement rows, and the
  completion-layer star-flattening pattern is separated as medium severity.

Reference image / Alpha-field audit:

- `audits/azuki_tcg_reference_image_audit_2026_06_25.csv` is the stricter
  display audit. It decides whether the site may honestly show a row's image as
  that row's reference photo.
- Current findings: 122 rows in scope, 5 high-severity rows, and 117
  medium-severity rows. High severity means the UI suppresses the reference
  image; medium severity means the row stays visible but a field-level warning
  is carried.
- The 5 suppressed-image rows are rows where the source/image card ID points to
  a different gallery row, or where a `★` row reuses the exact image URL of a
  non-`★` sibling. In the site payload those rows have `image: ""` and
  `image_status: "no_reference_photo"`.
- 103 rows suppress an inherited `Alpha` stamp. These are Gates Awakened
  `S1-*` official gallery rows where `STAMP=Alpha` came from a card-level
  Alpha-sheet crosswalk, not a row-specific release confirmation.

UI payload release split:

- `scripts/export_azuki_catalog_for_ui.py` emits Alpha and Gates Awakened as
  separate release families. Shared `card_id` is not release equivalence.
- Alpha Master Sheet rows are first-class catalog rows. They are displayed with
  `image: ""`, `image_status: "no_reference_photo"`, and
  `display_allowed: false` unless an exact Alpha official-gallery row already
  exists.
- Exact Alpha official-gallery promo/token rows such as `AZP-001`, `AZP-002`,
  `IKZ-001`, and `IKZ-002` are not duplicated as no-image Alpha sheet rows.
  Star/alternate official rows remain separate variants.
- Current UI export: 336 rows total — 120 Alpha, 214 Gates Awakened, and 2
  observation-only rows. The 100 Alpha Master Sheet-only rows intentionally
  carry no reference photo. The 229 displayed images are exact source images
  from rows that passed the display audit.

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
- A Gates Awakened `S1-*` row must not inherit Alpha release identity or an
  Alpha stamp merely because its `card_id` crosswalks to the Alpha Master
  Sheet.
- Image-view illustrator reads are useful completion hints, not official API
  facts. They remain lower authority than linked sheet fields.
- Reference images are displayed only when the current source row can honestly
  cite that image as the row's own reference photo. If the row/image identity is
  ambiguous, the catalogue has no reference photo for that row.
- User-photo observations do not overwrite official gallery or linked sheet
  fields. They are a separate evidence layer for agents to inspect.
- User-image portrait-alt observations likewise remain evidence rows. A matched
  gallery UID means the observed image aligns with a gallery row; it does not
  prove physical possession, condition, authenticity, or market value.

Rebuild:

```bash
python3 scripts/build_azuki_tcg_catalog.py --check
python3 scripts/audit_azuki_star_alt_art.py --check
python3 scripts/audit_azuki_reference_images.py --check
python3 scripts/export_azuki_catalog_for_ui.py --check
```

Refresh from the live official endpoint and linked Alpha Master Sheet:

```bash
python3 scripts/build_azuki_tcg_catalog.py --refresh
```
