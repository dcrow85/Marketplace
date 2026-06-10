# Japanese Pre-English Release Map v0.1

Generated 2026-06-10.

This is the first expansion map for the Pokemon catalogue beyond the No Rarity
alpha. It outlines Japanese Pokemon TCG releases and promo-bearing releases
before the English Base Set launch.

Cutoff:

```text
pre_english_cutoff: 1999-01-09
reason: English Base Set release date
```

This document is a release-family map, not a finished card database. Its job is
to give agents a clean reference for what should become catalog rows, what needs
promo-specific research, and what must remain outside the official TCG catalog.

Core rule:

```text
Catalog expansion should preserve boundaries before it increases coverage.
```

## Authority Bands

### Catalog Target

Official Japanese Pokemon TCG cards, products, expansions, decks, vending sheets,
and unnumbered promos that can eventually become rows in the Marketplace Pokemon
catalog.

These can be cited by future `CardReferenceCandidate` packets once their rows
are content-addressed.

### Promo Target

Official Japanese TCG promos where release conditions, counts, or exact dates may
need separate per-card handling.

These should become catalog rows, but with stronger provenance fields:

```text
distribution_method
date_precision: exact | month | range | inferred
copy_count_confidence: official | collector_estimate | unknown
release_family
source_caveats
```

### Boundary-Only Context

Japanese Pokemon card-shaped or sticker/card-adjacent releases that matter to
collectors and search disambiguation, but are not part of the Pokemon TCG.

They should not be mixed into the TCG catalog unless the project intentionally
creates a separate non-TCG catalogue.

## Mainline Japanese TCG Products

These are the cleanest next catalog targets after the No Rarity/Expansion Pack
lab.

| Date | Release family id | Japanese / common name | Type | Count | Catalog treatment | Notes |
|---|---|---|---|---:|---|---|
| 1996-10-20 | `jp_tcg_expansion_pack_19961020` | 第1弾拡張パック / Expansion Pack / Japanese Base Set | Main booster expansion | 96 booster cards / 102 broad launch-family rows | Catalog target | Strict booster product excludes the six Basic Energy cards; broad English-language catalog framing often counts 102. This is the current No Rarity lab. |
| 1996-10-20 | `jp_tcg_starter_pack_19961020` | 第1弾スターターパック / Series 1 Starter Pack | Starter deck | 60-card deck | Catalog target | Random 30 Expansion Pack cards plus 30 Basic Energy. Important for the 96-vs-102 caveat. |
| 1996-12-12 | `jp_tcg_gift_pack_19961212` | ギフトパック / Gift Pack | Two-player gift product | 2 starter decks + extras | Catalog target | Includes play supplies and guide inserts; exact catalog impact depends on promo handling. |
| 1997-03-05 | `jp_tcg_jungle_19970305` | ポケモンジャングル / Pokemon Jungle | Main booster expansion | 48 | Catalog target | Japanese Jungle has no English-style holo/non-holo duplication. |
| 1997-06-21 | `jp_tcg_mystery_of_the_fossils_19970621` | 化石の秘密 / Mystery of the Fossils | Main booster expansion | 48 | Catalog target | Japanese Fossil equivalent. |
| 1997-11-21 | `jp_tcg_rocket_gang_19971121` | ロケット団 / Rocket Gang | Main booster expansion | 65 | Catalog target | Japanese Team Rocket equivalent. |
| 1997-12-19 | `jp_tcg_team_rocket_gift_pack_19971219` | ロケット団ギフトパック / Team Rocket Gift Pack | Two-player gift product | 2 decks + extras | Catalog target | Includes unique Team Rocket starter deck material. |
| 1998-03-23 | `jp_tcg_expansion_sheet_1_blue_19980323` | 拡張シート 第1弾 青版 / Expansion Sheet Series 1 Blue | Vending sheet release | 36 | Catalog target | Sold as peel-off vending sheets; collector name "Vending Machine Series 1." |
| 1998-04-26 | `jp_tcg_nivi_city_gym_brock_19980426` | ニビシティジム タケシ / Nivi City Gym / Brock | Gym standard deck | 64 | Catalog target | 60-card deck plus 4 additional cards. |
| 1998-04-26 | `jp_tcg_hanada_city_gym_misty_19980426` | ハナダシティジム カスミ / Hanada City Gym / Misty | Gym standard deck | 64 | Catalog target | 60-card deck plus 4 additional cards. |
| 1998-06-17 | `jp_tcg_expansion_sheet_2_red_19980617` | 拡張シート 第2弾 赤版 / Expansion Sheet Series 2 Red | Vending sheet release | 36 | Catalog target | Same vending-sheet family as Series 1. |
| 1998-07-25 | `jp_tcg_kuchiba_city_gym_lt_surge_19980725` | クチバシティジム マチス / Kuchiba City Gym / Lt. Surge | Gym standard deck | 64 | Catalog target | 60-card deck plus 4 additional cards. |
| 1998-07-25 | `jp_tcg_tamamushi_city_gym_erika_19980725` | タマムシシティジム エリカ / Tamamushi City Gym / Erika | Gym standard deck | 64 | Catalog target | 60-card deck plus 4 additional cards. |
| 1998-10-24 | `jp_tcg_leaders_stadium_19981024` | リーダーズスタジアム / Leaders' Stadium | Main booster expansion | 96 | Catalog target | First Gym-era booster; English Gym Heroes later combines Japanese deck and booster material. |
| 1998-11-24 | `jp_tcg_expansion_sheet_3_green_19981124` | 拡張シート 第3弾 緑版 / Expansion Sheet Series 3 Green | Vending sheet release | 53 | Catalog target | Often described as 36 standard cards plus 17 non-standard/special cards. Keep count caveat. |
| 1998-12-04 | `jp_tcg_quick_starter_gift_set_19981204` | クイックスターターギフト / Quick Starter Gift Set | Deck kit | 2 x 60-card decks + extras | Catalog target | Crucial for No Rarity authentication: some trainer reprints lack rarity symbols and can be mislabeled as Expansion Pack No Rarity cards. |
| 1998-12-18 | `jp_tcg_gameboy_card_gb_19981218` | ポケモンカードGB / Pokemon Trading Card Game for Game Boy Color | Video game with physical promo | 1 promo | Promo target | Includes Dragonite promo; retail game is not a TCG set, but the inserted card is official TCG. |
| 1999-01-01 | `jp_tcg_pokemon_song_best_collection_19990101` | Pokemon Song Best Collection | CD with promo cards | 11 cards | Promo target | Cutoff-safe even though it is 1999; includes 10 Japanese cards/reprints plus one English Pikachu. |

## Promo And Special Distribution Families

These are official TCG targets, but should be built as promo rows with explicit
distribution context. Some copy counts are collector-derived or unknown; do not
silently upgrade them to official counts.

| Date / range | Release family id | Release family | Distribution | Cards / count | Treatment | Caveat |
|---|---|---|---|---:|---|---|
| 1996-10-15 | `jp_promo_corocoro_first_19961015` | First CoroCoro glossy promos | CoroCoro Comic Nov. 1996 insert | Pikachu, Jigglypuff | Promo target | Often treated as first Japanese TCG promos. |
| 1996-11-30 | `jp_promo_how_to_play_book_19961130` | Easily Understand How to Play Pokemon Cards | How-to-play book insert | Pikachu, Jigglypuff | Promo target | Non-glossy versions. |
| 1997-01-15 to 1997-10-15 | `jp_promo_corocoro_early_1997` | Early CoroCoro / jumbo / glossy promos | Monthly CoroCoro inserts | Mew, Mewtwo, jumbo Pikachu/Jigglypuff/Clefairy, Surfing Pikachu, Imakuni?, jumbo Legendary Birds, Flying Pikachu | Promo target | Split into per-issue families during row build. |
| 1997-05-02 to 1997-06-13 | `jp_promo_accessory_book_199705_199706` | Accessory and book promos | Playmat, fan book, card file inserts | Slowpoke, Mewtwo, Super Energy Retrieval, Electabuzz | Promo target | Multiple product contexts; split rows by product source. |
| 1997-06-14 to 1997-06-15 | `jp_promo_first_official_tournament_199706` | First Official Pokemon Card Game Tournament | Tournament prizes | No.1 Trainer, No.2 Trainer, No.3 Trainer | Promo target | Exact copy counts need careful source treatment. |
| 1997-08-09 to 1997-08-17 | `jp_promo_jr_east_stamp_rally_199708` | JR East Pokemon Stamp Rally | Stamp rally redemption | Surfing Pikachu, Mew | Promo target | Non-glossy versions. |
| 1997-10 to 1997-12 | `jp_promo_toyota_auto_199710_199712` | Toyota Auto Campaign | Dealership campaign/pamphlet | Arcanine, Pikachu | Promo target | Month-range date precision. |
| 1997-11-18 | `jp_promo_fan_club_vol3_19971118` | Pokemon Card Fan Club Vol. 3 | Magazine/book insert | Dark Persian | Promo target | High confidence release family. |
| 1997-12 to 1998-02 | `jp_promo_whf_special_limited_expansion_sheet_199712` | WHF Special Limited Expansion Sheet / Series 00 | World Hobby Fair preview sheet | Pikachu, Mew, Mewtwo | Promo target | Often grouped with Vending; keep as event preview unless source proves retail vending release. |
| 1997-12-10 to 1998-01-31 | `jp_promo_n64_double_get_199712` | Nintendo 64 Double Get Campaign | N64 purchase campaign | Cool Porygon, Hungry Snorlax | Promo target | Campaign crosses calendar year but starts before cutoff. |
| 1997-12-15 | `jp_promo_corocoro_19971215` | CoroCoro Jan. 1998 issue | CoroCoro insert | Meowth, glossy Computer Error | Promo target | Exact issue mapping should be preserved. |
| 1997-12 / 1998 | `jp_promo_pokemon_illustrator_contests_1997_1998` | Pokemon Illustrator contests | CoroCoro illustration contest prizes | Pokemon Illustrator | Promo target | High importance, high caution. Exact contest timing and awarded copies need per-contest rows. |
| 1998-02-10 to 1998-07-31 | `jp_promo_trade_please_199802` | Trade Please Campaign | Mail/campaign exchange | Venusaur, Charizard, Blastoise, Trade Please! | Promo target | Source ranges differ in hobby writeups; preserve citation. |
| 1998-02-15 to 1998-11-15 | `jp_promo_corocoro_1998` | 1998 CoroCoro promo run | Monthly CoroCoro inserts | Brock's Onix, Misty's Staryu, Jynx, Cubone, Farfetch'd, Mewtwo Strikes Back jumbo, Pikachu's Summer Vacation jumbo, Lt. Surge's Electabuzz, Erika's Dratini, Pokemon Plaza jumbo, glossy Pikachu, four Gym promos | Promo target | This is a cluster; row build should split by issue/product. |
| 1998-05 | `jp_promo_garura_parent_child_199805` | Garura Parent/Child Tournament | Tournament participation/winner prizes | Touch Change!, Kangaskhan | Promo target | Copy estimates are collector-derived unless official source found. |
| 1998-06-10 | `jp_promo_fan_club_vol5_19980610` | Pokemon Card Fan Club Vol. 5 | Magazine/book insert | Touch Change! | Promo target | Distinguish from Garura distribution. |
| 1998-07 to 1998-08 | `jp_promo_kamex_mega_battle_199807` | Kamex Mega Battle | Tournament participation/prizes | Computer Error, No.1 Trainer, No.2 Trainer, No.3 Trainer | Promo target | Dates and counts should be caveated. |
| 1998-11-01 to 1999-01-31 | `jp_promo_ana_get_in_a_jet_199811` | ANA Get in a Jet! Double Chance Campaign | All Nippon Airways campaign | Flying Pikachu, Dragonite | Promo target | Campaign crosses cutoff; starts before English Base Set. Use date range precision. |
| 1998-11-05 | `jp_promo_all_card_calendar_19981105` | All Card Calendar | Calendar insert/accessory | _____'s Pikachu / Birthday Pikachu | Promo target | Important collector row. |
| 1998-11-13 | `jp_promo_latest_how_to_play_book_19981113` | Latest how-to-play book | Book insert | Diglett, Dugtrio | Promo target | High confidence release family. |
| 1998-12-18 | `jp_promo_card_gb_dragonite_19981218` | Pokemon Card GB promo | Game Boy Color game insert | Dragonite | Promo target | Duplicates product note above; the promo row should cite this family. |
| 1999-01-01 | `jp_promo_song_best_collection_19990101` | Pokemon Song Best Collection promos | CD insert | Venusaur, Arcanine, Charizard, Blastoise, Mew, Mewtwo, Cool Porygon, Hungry Snorlax, Computer Error, Super Energy Retrieval, English Pikachu | Promo target | Cutoff-safe but should carry language caveat for English Pikachu. |

## Boundary-Only Card-Adjacent Map

These matter because collectors, sellers, and search tools will use the word
"card" loosely. Agents need to recognize them so they do not leak into the TCG
catalog.

| Date | Boundary id | Product family | Type | Count | Treatment | Why it matters |
|---|---|---|---|---:|---|---|
| 1996-09 | `jp_non_tcg_carddass_part_1_2_199609` | Bandai Pokemon Carddass Part 1 / Part 2 | Vending collectible cards, non-playable | 154 + 155 | Boundary-only | Historically important and predates Japanese TCG, but not part of the TCG. |
| 1996 | `jp_non_tcg_amada_retsuden_hyper_sticker_1_1996` | Amada Retsuden Strongest Seal Hyper Sticker Collection 1 | Stickers | 203 | Boundary-only | Sticker line; useful for search disambiguation. |
| 1996-10 onward | `jp_non_tcg_pokemon_kids_cards_199610` | Bandai Pokemon Kids / Kids cards | Candy toy inserts/cards/stickers | variable | Boundary-only | Count varies by wave and source; not TCG. |
| 1997 | `jp_non_tcg_carddass_part_3_4_1997` | Bandai Carddass Part 3 / Part 4 | Vending collectible cards, non-playable | 153 | Boundary-only | Same Carddass namespace, still non-TCG. |
| 1997 | `jp_non_tcg_sealdass_1997` | Bandai Sealdass | Vending sticker cards | 151 stated | Boundary-only | Sticker/card confusion risk. |
| 1997 | `jp_non_tcg_topsun_gum_cards_1997` | Topsun / Top-Seika gum cards | Gum-pack collectible cards | 150 Pokemon, excluding Mew | Boundary-only | Market-relevant and often confused by date/copyright claims; not TCG. |
| 1997 | `jp_non_tcg_topsun_seal_gum_1997` | Topsun Seal Gum | Gum-pack stickers | 102 | Boundary-only | Adjacent sticker line. |
| 1997 | `jp_non_tcg_meiji_get_cards_1997` | Meiji Get Cards | Chocolate-box collectible cards | 170 | Boundary-only | Card-shaped, game-like rock-paper-scissors mechanic, but not TCG. |
| 1997 | `jp_non_tcg_amada_hyper_sticker_2_1997` | Amada Hyper Sticker Collection 2 | Stickers | 217 | Boundary-only | Sticker-only. |
| 1998 | `jp_non_tcg_meiji_movie_1998` | Meiji Movie | Chocolate-box anime/movie scene cards | 48 | Boundary-only | Movie/anime card context. |
| 1998 | `jp_non_tcg_amada_hyper_sticker_waza_1998` | Amada Hyper Sticker Collection Waza | Stickers | 194 | Boundary-only | Sticker-only. |
| 1998 | `jp_non_tcg_amada_super_dx_1998` | Amada Super DX 1998 | Stickers | 88 | Boundary-only | Sticker-only. |
| 1998-1999 | `jp_non_tcg_carddass_anime_series_1998_1999` | Bandai Carddass Anime Series | Anime-scene collectible cards | 360 over 8 quarterly parts | Boundary-only / split needed | Only confirmed 1998 portions are safely before cutoff. |

Boundary instruction:

```text
If a seller says "Japanese 1996 Pokemon card," the agent should not assume TCG.
It should distinguish Expansion Pack, Carddass, Topsun, Meiji, Amada, stickers,
and other card-adjacent objects before forming an intent or evidence request.
```

## Post-Cutoff Releases To Exclude From This Map

These are important later, but they are not pre-English under the 1999-01-09
cutoff:

- 1999-01-15 CoroCoro February 1999 Meowth.
- 1999-01-28 Pokemon Card GB Official Guidebook Venusaur.
- 1999-02-26 Yamabuki City Gym / Sabrina and Guren Town Gym / Blaine.
- 1999-05-28 Pokemon Card Trainers Vol. 1 and Snap Pikachu.
- 1999-06 ANA Everyone's Happy Campaign.
- 1999-06-25 Challenge from the Darkness.
- 1999-07-17 Southern Islands.
- 1999-07-30 Intro Pack.

Uncertain January 1999 families such as Tropical Present postcard and
Tamamushi/Celadon University Magikarp should remain `not_cutoff_safe` until an
exact pre-1999-01-09 date is source-pinned.

## Recommended Build Order

### 1. Preserve The No Rarity Lab

The No Rarity catalog remains the current precision lab:

```text
data/no-rarity-base-set.json
data/no-rarity-catalog-policy.json
data/no-rarity-catalog-manifest.json
```

Do not dilute it by merging broad Japanese Base Set rows without variant logic.

### 2. Build Release Manifests Before Card Rows

Create one manifest per release family before card rows are added.

Minimum manifest fields:

```text
schema
release_family_id
parent_namespace: pokemon_tcg_japanese_pre_english
date
date_precision
name_ja
name_en
release_type
expected_row_count
count_confidence
prints_without_rarity_symbol: yes | no | mixed | unverified
source_refs
not_claiming
```

`prints_without_rarity_symbol` is mandatory and starts as `unverified`, never
assumed. It is the column the No Rarity product-overlap matrix is built from:
every pre-cutoff family that answers `yes` or `mixed` is a candidate
confusion source for missing-symbol claims, and every No Rarity catalog row's
`variant_traps` should eventually be derivable from this column rather than
hand-flagged. A blank trap list must mean "checked against every yes/mixed
family and ruled out," not "nobody looked."

Required `not_claiming`:

- complete per-card row accuracy,
- authenticity,
- possession,
- condition,
- price truth,
- official copy count unless source-pinned,
- no future catalog fork.

### 3. Build Rows In This Order

1. Vending / Expansion Sheets.
2. Quick Starter Gift Set.
3. Jungle, Fossil, Rocket Gang, Leaders' Stadium.
4. Gym standard decks.
5. Early CoroCoro and book promos.
6. Tournament/campaign promos.
7. CD/game/calendar promos.
8. Boundary-only non-TCG disambiguation rows.

Reason:

```text
The first two directly harden No Rarity authentication traps.
The mainline expansions are comparatively regular.
Promo rows need stronger provenance handling.
Boundary objects should help agents say "not this lane."
```

## Agent Instructions

Use this language:

```text
This is a pre-English Japanese TCG release-family candidate.
The release family is source-attributed, but the row is not yet content-addressed.
```

Avoid:

```text
This is verified as a real card.
```

Use:

```text
This object appears to be card-adjacent but outside the Pokemon TCG catalog.
It may still matter for collecting, pricing, and disambiguation.
```

Avoid:

```text
This is a Japanese TCG card because it is old and card-shaped.
```

## Open Verification Items

Review flags from the Fable pass. These are questions, not corrections; none
should be resolved from memory.

- `jp_tcg_starter_pack_19961020`: confirm whether Starter Pack cards lack
  rarity symbols. If yes, this family is the single largest No Rarity
  confusion source (30 random Expansion Pack cards per deck) and outranks
  Quick Starter in trap priority.
- `jp_tcg_expansion_sheet_*`: vending sheet cards are commonly described as
  printed without rarity symbols; confirm and record per series. Confirm
  Series 3 Green's exact date against multiple sources; if any source places
  it in 1999, it needs `date_precision: range` and a cutoff caveat.
- Gym standard decks: confirm the "60-card deck plus 4 additional" structure
  and whether deck cards carry rarity symbols.
- Tournament families: confirm whether a 1997 Lizardon Mega Battle (or
  equivalent pre-Kamex event) distributed promos before the cutoff; it is
  absent from this map and its absence should be deliberate, not an oversight.
- `jp_promo_jr_east_stamp_rally_199708`: confirm the 1997 year against more
  than one source; hobby writeups also describe later JR rallies.
- The map's own sources are URL-only. Under the catalog evolution drill rules,
  URL-only sources block at row build. This map is a v0.1 seed and may cite
  URLs, but every release manifest built from it must snapshot and
  content-hash its sources first. The map itself should not be cited as
  row-level evidence.

## Source Anchors

Primary source anchors used for this v0.1 map:

- Bulbapedia, Base Set: https://bulbapedia.bulbagarden.net/wiki/Base_Set_(TCG)
- Bulbapedia, Japanese expansions list: https://bulbapedia.bulbagarden.net/wiki/List_of_Japanese_Pok%C3%A9mon_Trading_Card_Game_expansions
- Bulbapedia, Original TCG Era merchandise: https://bulbapedia.bulbagarden.net/wiki/Original_TCG_Era_merchandise
- Bulbapedia, Vending Machine cards: https://bulbapedia.bulbagarden.net/wiki/Vending_Machine_cards_(TCG)
- Bulbapedia, Unnumbered Promotional cards 1996-2005: https://bulbapedia.bulbagarden.net/wiki/Unnumbered_Promotional_cards_(TCG)/1996-2005
- Bulbapedia, Pokemon Trading Card Game video game: https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Trading_Card_Game_(video_game)
- Bulbapedia, Bandai Pokemon Carddass Cards: https://bulbapedia.bulbagarden.net/wiki/Bandai_Pok%C3%A9mon_Carddass_Cards
- Bulbapedia, Pokemon Meiji Get Cards: https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Meiji_Get_Cards
- Bulbapedia, Pokemon Meiji Movie: https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Meiji_Movie
- Pokumon timeline and event pages: https://pokumon.com/timeline/
- Elite Fourum ANA promo guide: https://www.elitefourum.com/t/promo-showcase-pokemon-card-ana-all-nippon-airways-promo-campaign/38305
- CGC Carddass / Sealdass / Topsun reference articles: https://www.cgccards.com/news/
- Pokemon Stickerpedia early Japanese sticker references: https://www.pokemonstickerpedia.com/

Source caveat:

```text
This v0.1 map combines official-like catalog pages, collector research, grading
company explainers, and hobby references. It should seed catalog work, not close
it. Each future catalog row should carry its own source hashes and challenge
trail.
```
