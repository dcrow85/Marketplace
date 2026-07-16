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

It also contains a spreadsheet completion layer:

- `spreadsheets/azuki_tcg_alpha_fields_completion.csv` is a 237-row
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
  records eight promo/variant observations from five user-provided photo sources.
  The 2026-06-24 four-card source is not committed and is anchored only by its
  SHA-256 hash. The user explicitly supplied four 2026-07-10 WINNER photos for
  catalogue display, so those exact images are retained under
  `web/public/assets/observations/` with its hash recorded.
- `observations/azuki_tcg_user_photo_promo_observations_2026_06_24_provenance.json`
  records the observation authority boundary, gallery matches, and conflicts.
  This layer is evidence from a photo, not an official checklist expansion.
- `observations/azuki_tcg_user_image_portrait_alt_observations_2026_06_24.csv`
  records two portrait alternate rare leader images observed from user-provided
  image files.
- `observations/azuki_tcg_user_image_portrait_alt_observations_2026_06_24_provenance.json`
  records their image hashes, gallery matches, and the printed/gallery ID-shape
  boundary.

It also contains a provenance-separated Azuki world layer:

- `source-snapshots/azuki_official_lore_sources_2026-07-10.json` records 42
  concise claims from 10 official Azuki-owned web sources. Official site facts,
  TCG rule facts, future announcements, Bobu governance context, card-art
  observations, event context, and catalog inferences have different authority
  labels. Its Anime Expo 2026 context records Booth 424's dated program while
  leaving the exact AX WINNER award activity unresolved.
- `source-snapshots/azuki_card_art_visual_review_2026-07-10.json` anchors the
  full visual pass: 237 official gallery images plus 100 Alpha Master Sheet
  images and 4 user-observed WINNER images, each with its image hash and review
  batch.
- `source-snapshots/the_gate_community_knowledge_2026-07-15.json` maps The
  Gate's public strategy hub as a separate independent-community layer: 16
  published articles, 37 FAQ entries, 10 quick-rules items, 3 tournament
  records, and 105 public decks at capture time. It stores original Cairn
  summaries and links, not article bodies or decklists. Its strategy, event,
  and lore reads remain attributed; its rules material never outranks the
  current official Azuki TCG rule page.
- `source-snapshots/the_gate_deck_signals_2026-07-15.json` is the refreshable
  deck activity and search layer. At capture it separates 105 visible public
  or author-published records from the 101 with exactly 50 main cards plus a
  Leader and Gate. Its trailing 14-day frequency basis is 36 complete-shaped
  records out of 37 visible records; its homepage recency slot and three dated
  tournament reports remain separate signals. A bounded search index stores
  each public deck's name plus recorded Leader, Gate, and main-card names and
  quantities so Anko can resolve deck calls. Card art, card text, article prose,
  builder notes, and engagement rankings are not copied into the artifact.
- `lore/azuki_world_metadata.json` gives the agent a dual-world guide (Alley,
  Garden, and the Gate threshold), four elemental domains, 85 official subtype
  terms, 9 repeated-character threads, and per-card/per-variant search metadata.
- `lore/azuki_world_metadata_audit.json` requires all 202 official card
  identities, all 353 UI rows, and every one of the 349 image-bearing rows to
  remain covered.
- `scripts/build_azuki_world_metadata.py` regenerates and checks the layer. A
  future gallery refresh with a new or changed image must receive a new explicit
  visual-review snapshot before the check can pass.

The catalog preserves source data as returned by each source, including
variant entries, alternate-art entries, promo entries, starter deck entries,
sheet rows, and source anomalies. It does not silently normalize source scars.

Current snapshot facts:

Official gallery:

- 237 official gallery entries
- 202 unique `cardId` values
- 29 `cardId` values with multiple gallery entries
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

- 237 rows, one per official gallery entry
- 237 unique row keys
- 123 rows crosswalked to the Alpha Master Sheet by shared `cardId`
- 114 rows completed from official gallery data
- 109 official-only rows have illustrator credits filled by image view
- 5 official-only rows remain in the image-review queue because the printed
  credit line is visible but too compressed/stylized to transcribe confidently

Promo observation layer:

- 8 user-photo observation rows
- 2 printed IDs not present in the current official gallery snapshot:
  `AZP-004`, `AZP-005`
- 1 preserved source conflict: photo-observed `AZK01-028` illustrator reads
  `Tomugi`, while the linked Alpha Master Sheet currently supplies `Comiccho`
- 1 Bobu variant observation: printed `STT03-001`, `Illus. nJoo`, with an
  Invader-style visual stamp, matched to gallery `STT03-01` rows only as a
  comparison candidate
- 1 distinct Yojin observation: printed `AZK01-052`, `UC ★`, `Illus. Samuel
  Gildas`, and a visible `WINNER` treatment. The 2026-07-10 live gallery exposes
  only base UC Yojin, so the row remains user-observed rather than an official
  checklist variant.
- 1 distinct Serene Fist, Misaki observation: printed `STT02-008`, `UC ★`, a
  visible gold `WINNER` treatment, and an `Aflorane` credit corroborated by the
  clearer Lady Emberheart photo. The user marks the pictured card `confirmed_real`;
  that status is retained as a user assertion rather than independent catalogue
  verification. The live gallery exposes only base UC Misaki.
- 1 Anime Expo 2026 Shao's Perseverance observation: printed `STT02-017`, `SR`,
  `Illus. Pandart Studio`, Azuki `#187`, and visible `AX WINNER / ANIME EXPO
  2026 EXCLUSIVE` marks. The official event page names stamped full-art Shao's
  Perseverance as an AX promo and describes demos and Starter Deck Battles for
  AX cards, but does not identify this card's exact award activity. User-supplied
  authenticity and event-distribution statuses remain typed assertions.
- 1 distinct Lady Emberheart observation: printed `STT04-008`, `UC ★`, `Illus.
  Aflorane`, and a gold `WINNER` treatment. Two independently hashed user photos
  record the same visible treatment; the clearer sleeved image remains the display
  reference and the second, unsleeved image is retained as corroborating evidence.
  The catalogue does not infer that they depict the same physical copy. No AX stamp
  is visible in either photo, so no Anime Expo association is recorded.

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
- Current findings: 53 rows in scope, 19 review rows, and no high-severity
  rows. The remaining 19 rows are medium-severity completion-layer
  star-flattening comparisons; official source anomalies remain declared in
  the release instead of suppressing their images.

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
- Image-view illustrator reads are useful completion hints, not official API
  facts. They remain lower authority than linked sheet fields.
- User-photo observations do not overwrite official gallery or linked sheet
  fields. They are a separate evidence layer for agents to inspect.
- User-image portrait-alt observations likewise remain evidence rows. A matched
  gallery UID means the observed image aligns with a gallery row; it does not
  prove physical possession, condition, authenticity, or market value.
- Lore-source claims do not turn image observations into canon events.
- Alley/Garden setting cues are labelled visual interpretations with confidence,
  not official location assignments for every illustration.
- Official subtypes remain official vocabulary; the world layer does not call
  every subtype a political faction.
- The Gate remains an independent community source. Community deck tech,
  tournament reports, public-deck counts, and lore interpretation do not become
  official rules, current global metagame claims, or canon.
- The Gate deck-signal layer uses `frequent in recent public submissions`, not
  `most played`, unless a future source provides a legible player-population
  measure. Newest-by-creation, homepage visibility by update time, card
  inclusion frequency, and dated tournament placement must not be blended.
- A public deck search match establishes recorded list membership and quantity,
  not a card's importance, a strategy claim, print treatment, recommendation,
  legality beyond the recorded 50-plus-Leader-and-Gate shape, or win rate.
- The 2026-07-15 cross-check keeps two source conflicts open: The Gate's quick
  rules and FAQ disagree on turn order, and its FAQ overstates Alley-only entity
  play. The agent must answer both from the current official Azuki TCG rules.

Rebuild:

```bash
python3 scripts/build_azuki_tcg_catalog.py --check
python3 scripts/audit_azuki_star_alt_art.py --check
python3 scripts/build_azuki_world_metadata.py --check
python3 scripts/refresh_the_gate_deck_signals.py --check
python3 scripts/vendor_azuki_catalog_images.py --check
python3 scripts/export_azuki_catalog_for_ui.py --check
python3 scripts/audit_azuki_world_agent.py
```

Every non-empty UI `image` is a path under `web/public`; the exporter fails if
that file is absent or if a render field points at an external host. Official
gallery URLs remain in `upstream_image_url` and the dated image manifest only as
refresh provenance. The mirrored official bytes and Alpha workbook exports are
committed so clean Pages builds do not depend on Azuki's CDN or a local-only
worktree cache.

Refresh from the live official endpoint and linked Alpha Master Sheet:

```bash
python3 scripts/build_azuki_tcg_catalog.py --refresh
python3 scripts/vendor_azuki_catalog_images.py --refresh
python3 scripts/export_azuki_catalog_for_ui.py
```

Refresh the independent community deck signal, then regenerate the agent/UI
payload:

```bash
python3 scripts/refresh_the_gate_deck_signals.py --refresh
python3 scripts/export_azuki_catalog_for_ui.py
python3 scripts/audit_azuki_world_agent.py
```
