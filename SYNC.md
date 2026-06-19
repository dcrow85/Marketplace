# SYNC — Cairn live coordination head

The stable entrypoint for parallel work between **Claude** (surface + judged-layer
agent) and **Codex** (enforced/legible backbone). This filename never moves; dated
Briefs are point-in-time archives it links to. Read this first, every session.

```
UNREAD-FOR: none   ·   LAST: 2026-06-18 · Codex
```

## Sync routine — do this BEFORE working any lane
1. Read this file, top to handshake log.
2. `git log --oneline main..@ ; git worktree list ; git branch -a` — see the other lane.
3. Check `UNREAD-FOR` above. If it names YOU: read the new handshake entries, act,
   then set it to `none` (or to the other agent when you post back).
4. Before touching a SHARED SEAM, append a `[BLOCKING: <seam>]` handshake entry FIRST.

## Worktrees (the parallel substrate)
This repo runs one git worktree per lane (shared object store, separate dirs/branches):
```
/Users/che/Marketplace                       claude/surface-agent   (Claude)
<persistent path>                             main                   (Codex / trunk)
```
**Trunk is `main`.** Coordination files (this file, AGENTS.md, the CLAUDE.md pointer)
live on `main`; each lane branch merges `main` to pick them up. KEEP WORKTREES OUT OF
`/tmp` — the prior `main` worktree was at `/private/tmp/...` and got wiped on cleanup
(commits survived; the dir did not). `git worktree prune` clears a stale slot.

## Lanes — who owns what
- **Codex** — `chain/` (Solidity spine; Lane-1 D6 binds), `simulations/protocol_*` +
  `scripts/qwen_e2e_*` + the drills (Lane-2), `data/japanese-pre-english/` +
  `scripts/build_japanese_pre_english_catalogs.py` (catalog data),
  `agent_tools/no_rarity_catalog_tools.py` (incl. `evaluate_gate`). **Do not touch `mockups/`.**
- **Claude** — `mockups/` (binder, landing, glance), the UI generators + `download_*` +
  `interrupt_bar_probe` + `cairn_browse` in `simulations/`, `agent_tools/inventory_tools.py`,
  the Interrupt_Bar / Human_Surface / Payment docs, the Qwen serving.
- Full state + "what landed this arc": `Protocol_Codex_Brief_2026_06_17.md` (archive).

## Shared seams — change one → append `[BLOCKING]` first
1. `mockups/catalog-sample.json` is DERIVED from Codex's catalog. Codex owns the data +
   manifest schema; Claude regenerates the UI payload. Codex: note schema/release changes;
   never hand-edit the generated JSON.
2. `evaluate_gate` (`no_rarity_catalog_tools.py`) — shared contract; Interrupt_Bar §7
   proposes extending it. Change → note.
3. The Qwen runtime is a SINGLETON: `mlx_lm.server` may hold the 35B on `:8081`. Don't
   double-load (OOM). Coordinate via the log.
4. `Protocol_Arbitration_v0.1.md` — both have edits; reconcile before committing.
5. GIT: lane worktrees + branches; trunk is `main`. NEVER `git add -A` / `git add .` —
   path-scope to your lane. Claude's lane is committed on branch `claude/surface-agent`.

## Working discipline — the law
- Enforced / legible / judged on every claim. **No-overclaim is the law** — nothing
  (doc, UI, model) may imply the contract/image/model proves an off-chain physical fact.
- Author != verifier on contract/execution work. Findings get one ledger disposition.
- Commit in focused, path-scoped units; report before/after test counts + ledger rows moved.

## Handshake log — newest on top; tag `[passive]` or `[BLOCKING: seam]`
- `[passive]` 2026-06-19 · Codex — completed the twentieth
  hand-researched catalog-history deepening pass in
  `data/catalog-history/source-sets/quick_starter_red_deck_v0_1.json`.
  Japanese Quick Starter Gift Set Red Deck is now a hand-authored child
  release dossier, with Squirtle 001, Pikachu 009, Pikachu 010, Raichu
  011, Zapdos 015, Gust of Wind 028, and Switch 032 promoted from
  generated baseline to sourced card dossiers. The pass frames the Red
  Deck as the charged half of Quick Starter: Squirtle as the friendly
  water doorway, two adjacent Pikachu rows as the row-identity lesson,
  Raichu and Zapdos as the electric ceiling, and Gust of Wind / Switch as
  text-layout trap rows where missing-symbol appearance is not Base No
  Rarity proof. Added special identification rails for Red Deck
  child-lane provenance, parent rollup versus child release, duplicate
  Pikachu row preservation, Raichu / Zapdos separation from Base/Fossil
  or generic Pikachu-line searches, and trainer text/layout comparison
  before any No Rarity claim can advance. Sources: local Japanese
  pre-English Red Deck and parent Quick Starter catalogs, PokeCardex
  QSGSR, Bulbapedia Quick Starter Gift Set, Bulbapedia Original TCG Era
  merchandise, local pre-English symbol-status matrix, and lower-tier
  Elite Fourum collector discussion for Quick Starter / No Rarity trainer
  confusion. Generated gap moved from 188 releases / 4,440 cards to 187
  releases / 4,433 cards. Current catalog-history corpus: 22,863 claims,
  5,042 sources, corpus hash
  `87816313dc5c01c599a04fc2d688877a3ab17a29abb4d052f4d971cda6162ed8`;
  index hash `e7994316841a817e3abd98a7cab166789829914d940b4ca32e89c618939a8365`;
  queue hash `717d7fc35d098f90ceb89244300bd94485a6b6e5a1e433edf46430e5eafa7514`.
- `[passive]` 2026-06-19 · Codex — completed the nineteenth
  hand-researched catalog-history deepening pass in
  `data/catalog-history/source-sets/quick_starter_green_deck_v0_1.json`.
  Japanese Quick Starter Gift Set Green Deck is now a hand-authored child
  release dossier, with Bulbasaur 001, Scyther 006, Moltres 014, Mewtwo
  020, Chansey 023, and Pokemon Trader 031 promoted from generated baseline
  to sourced card dossiers. The pass frames the Green Deck as the gentler
  half of Quick Starter: Bulbasaur at the door, Scyther and Moltres adding
  collector silhouettes, Mewtwo and Chansey adding gravity, and Pokemon
  Trader carrying the child lane's strongest missing-symbol warning.
  Added special identification rails for Green Deck child-lane provenance,
  parent rollup versus child release, row-number preservation, Scyther /
  Moltres / Mewtwo / Chansey separation from other early identities, and
  Pokemon Trader as a Green Deck text-layout trap where missing-symbol
  appearance is not Base No Rarity proof. Sources: local Japanese
  pre-English Green Deck and parent Quick Starter catalogs, PokeCardex
  QSGSG, Bulbapedia Quick Starter Gift Set, Bulbapedia Original TCG Era
  merchandise, local pre-English symbol-status matrix, and lower-tier
  Elite Fourum collector discussion for Quick Starter / No Rarity trainer
  confusion. Generated gap moved from 189 releases / 4,446 cards to 188
  releases / 4,440 cards. Current catalog-history corpus: 22,871 claims,
  5,025 sources, corpus hash
  `7e8f520cc7db3de36c600e0f9494e137d29cdd184541abfe11f940706bb3f9eb`;
  index hash `3bf6803ac0a70304a90709de38276aa3807f756e5299f58073cb4c8a81e3f2c1`;
  queue hash `4930bdac32ae80f1a33213bcef9a021405647bfd18df186546f82d12cd5260cc`.
- `[passive]` 2026-06-19 · Codex — completed the eighteenth
  hand-researched catalog-history deepening pass in
  `data/catalog-history/source-sets/quick_starter_gift_set_v0_1.json`.
  Japanese Quick Starter Gift Set is now a hand-authored release dossier,
  with Mewtwo green-020, Chansey green-023, Pikachu red-009, Pikachu
  red-010, Raichu red-011, Zapdos red-015, and Pokemon Trader red-030
  promoted from generated baseline to sourced card dossiers. The pass
  frames Quick Starter as both a ready-to-play red/green deck kit and a
  provenance trap: missing-symbol Vending/Expansion Sheet reprints that can
  look close enough to Base No Rarity to fool a name-or-corner-only agent.
  Added special identification rails for parent rollup versus red/green
  child lanes, lane prefixes, duplicate Pikachu rows, Mewtwo/Chansey/
  Raichu/Zapdos row separation, the five sensitive trainer overlap rows,
  and Pokemon Trader as a text-layout trap where absence of a rarity symbol
  is not spendable provenance. Sources: local Japanese pre-English Quick
  Starter parent/red/green catalogs, PokeCardex QSGSR/QSGSG, Bulbapedia
  Quick Starter Gift Set, Bulbapedia Original TCG Era merchandise, local
  pre-English symbol-status matrix, and lower-tier Elite Fourum collector
  discussions for Quick Starter / No Rarity trainer confusion. Generated
  gap moved from 190 releases / 4,453 cards to 189 releases / 4,446 cards.
  Current catalog-history corpus: 22,879 claims, 5,011 sources, corpus
  hash `8718e5adbbcacd0cfbb2937204893f47ae9222fe74cff0ea004782352ccf3433`;
  index hash `3a9eccb1fa5731c7945f7fe5d89c700bf0b121065ff3698ba9c122e0df56353a`;
  queue hash `386a5e6c2b50006851fc22273caff8f16084137920f41481178f4ef92a9ab323`.
- `[passive]` 2026-06-19 · Codex — completed the seventeenth
  hand-researched catalog-history deepening pass in
  `data/catalog-history/source-sets/pokemon_song_best_collection_v0_1.json`.
  Pokemon Song Best Collection is now a hand-authored release dossier, with
  Venusaur 001, Charizard 002, Blastoise 003, Mewtwo 005, Mew 006, and
  Pikachu 011 promoted from generated baseline to sourced card dossiers.
  The pass frames Song Best as a media-product reprint object rather than a
  normal booster set: a music CD with an eleven-card memory cabinet inside,
  bundling starters, mythics, prior campaign/promo routes, Computer Error
  variant context, and one English Pikachu inside a Japanese CD product.
  Added special identification rails for CD inclusion versus first
  distribution, Song Best membership versus earlier promo/campaign lanes,
  Base/Trade Please/WHF lineage boundaries, Computer Error glossy
  CoroCoro/Song Best versus non-glossy Kamex variant context, mixed symbol
  status not being Base No Rarity proof, and Pikachu 011 as the
  language-boundary trap. Sources: local Japanese pre-English Song Best
  catalog, Bulbapedia Pokemon Song Best Collection, Bulbapedia card pages
  for Venusaur, Charizard, Blastoise, Mewtwo, Mew, Pikachu, Bulbapedia
  Computer Error, and the local Kamex Computer Error variant snapshot.
  Generated gap moved from 191 releases / 4,459 cards to 190 releases /
  4,453 cards. Current catalog-history corpus: 22,889 claims, 4,994
  sources, corpus hash
  `fe0ff6eb329a09e857606c4af8731ee6a2bdee578157afeb976733dadc5e155c`;
  index hash `6e307dfb288be6ede99d14ec5cb40ee2f64fc6dd8a713774bfeb505bc791c482`;
  queue hash `859a1560a49865cb1aa9d203ca3f6bd1d67fcc8a760f5d80f30ba56fd83f7ba2`.
- `[passive]` 2026-06-19 · Codex — completed the sixteenth
  hand-researched catalog-history deepening pass in
  `data/catalog-history/source-sets/miracle_of_the_desert_v0_1.json`.
  Japanese ADV2 Miracle of the Desert is now a hand-authored release
  dossier, with Shiftry 003/053, Cradily 010/053, Armaldo 039/053,
  Typhlosion ex 013/053, Wailord ex 021/053, and Raichu ex 023/053
  promoted from generated baseline to sourced card dossiers. The pass
  frames Miracle of the Desert as early ADV becoming an environment:
  Hoenn desert/fossil context, Mirage Tower mood, Root Fossil / Claw
  Fossil branches, evolution-stage lowercase Pokemon-ex risk, and Ryo
  Ueda's 3D ex language making mass and shine visible without overclaiming
  physical authenticity or condition. Added special identification rails
  for Japanese ADV2 versus English EX Sandstorm, 053 numbering, lowercase
  ex versus later uppercase EX, fossil theme versus row identity, Shiftry
  versus Seedot/Nuzleaf, Cradily versus Lileep/Root Fossil, Armaldo versus
  Anorith/Claw Fossil, and Raichu ex versus generic Pikachu-line searches.
  Sources: local Japanese ADV pre-WotC catalog, TCG Collector Miracle of
  the Desert set/card pages, TCGdex ADV2 set record, Bulbapedia EX
  Sandstorm, Bulbapedia ADV TCG Era merchandise, and Bulbapedia Pokemon-ex.
  Generated gap moved from 192 releases / 4,465 cards to 191 releases /
  4,459 cards. Current catalog-history corpus: 22,895 claims, 4,985
  sources, corpus hash
  `76bee4d43dbb99ebad67071e41b332da4aa86b8641b85f140342503d3dfabc0f`;
  index hash `e7deaa348f0f691603275d72b35a8d7fe461fcff4e9ce59ec8ad67c8f33f8e00`;
  queue hash `5f3f034f1b053040f20d86be7d60781342164cf1c6005f61b9fda9572adb542d`.
- `[passive]` 2026-06-19 · Codex — completed the fifteenth
  hand-researched catalog-history deepening pass in
  `data/catalog-history/source-sets/jp_unnumbered_promos_v0_1.json`.
  Japanese pre-English unnumbered promotional source slice is now a
  hand-authored release dossier, with Mew 005, Surfing Pikachu 014,
  Pokemon Illustrator 032, Trade Please! 036, _____'s Pikachu 053, and
  Pikachu 001 promoted from generated baseline to sourced card dossiers.
  The pass frames the slice as a contact-history map before English Base:
  CoroCoro inserts and contests, JR Stamp Rally, Trade Please, Pokemon
  Center birthday context, CD/tie-in routes, and magazine campaign logic
  without pretending the aggregate is one sealed product or one release day.
  Added special identification rails for aggregate-source-slice boundaries,
  local/PokeCardex "Sans rarete" not being Japanese Base No Rarity proof,
  Mew glossy versus Stamp Rally route context, Surfing Pikachu 014 versus
  016, Pokemon Illustrator contest-prize trophy boundaries, Trade Please
  campaign context, Birthday Pikachu calendar versus Pokemon Center branch,
  and generic Pikachu name traps. Sources: local Japanese pre-English promo
  slice, PokeCardex UPC, Bulbapedia unnumbered promotional card pages, and
  Bulbapedia community pages for Mew, Surfing Pikachu, Pokemon Illustrator,
  Trade Please!, _____'s Pikachu, and Pikachu. Generated gap moved from
  193 releases / 4,471 cards to 192 releases / 4,465 cards. Current
  catalog-history corpus: 22,899 claims, 4,967 sources, corpus hash
  `b2cb939c8446f8379dbb78330c21a2094d58d6fa8d81bcf61f828bc6f6b272cd`;
  index hash `69f5b4afd817244a6b0c70aa98f67fd50f37b02c46f10703dcd4aaa401b70f8e`;
  queue hash `946f3e4749dbb882fb7fec9b7f326f80fa291a8aa30172a7820cf78d1b4f3101`.
- `[passive]` 2026-06-19 · Codex — completed the fourteenth
  hand-researched catalog-history deepening pass in
  `data/catalog-history/source-sets/skyridge_v0_1.json`.
  Skyridge is now a hand-authored release dossier, with Crystal Charizard
  146, Crystal Ho-Oh 149, Crystal Kabutops 150, Crystal Celebi 145,
  Alakazam H1, and Umbreon H30 promoted from generated baseline to sourced
  card dossiers. The pass frames Skyridge as the late-Wizards e-Reader
  summit: machine-readable card architecture, H-number holos, Crystal Type
  secret rows, and a final-English-WoC aura without overclaiming physical
  scanability or authenticity. Added special identification rails for
  English ecard3 count basis (printedTotal 144 / total 182), e-Reader /
  Dot-Code context, H-number holos versus regular Rare counterparts,
  Crystal Charizard versus earlier Charizard rows, Crystal Ho-Oh versus Neo
  Revelation Ho-Oh, Crystal Kabutops versus H13 / 14, Crystal Celebi versus
  Neo Revelation Celebi, Alakazam H1 versus 2, and Umbreon H30 versus 32 /
  Aquapolis H29 / Neo Discovery branches. Sources: local English WoC catalog,
  Pokemon TCG API v2 set/card endpoints, Bulbapedia community pages for
  Skyridge, Crystal Pokemon, and the promoted cards, plus PSA's Skyridge
  collecting overview as a lower-tier context source. Generated gap moved
  from 194 releases / 4,477 cards to 193 releases / 4,471 cards. Current
  catalog-history corpus: 22,904 claims, 4,955 sources, corpus hash
  `99c01938ae110b92d4b197e51a0cac73c6f80e54cd55a319e46176121f6f08fb`;
  index hash `bdccebf84878a3b08bf466e76dd270effd7252011e30cf20271abb2850404f6d`;
  queue hash `811787aadc3fd7218f21f27c065f00fc5bd5252a445b3447714800812e8478d1`.
- `[passive]` 2026-06-19 · Codex — completed the thirteenth
  hand-researched catalog-history deepening pass in
  `data/catalog-history/source-sets/neo_revelation_v0_1.json`.
  Neo Revelation is now a hand-authored release dossier, with Ho-Oh 7,
  Ho-Oh 18, Lugia 20, Celebi 3, Shining Gyarados 65, and Shining Magikarp
  66 promoted from generated baseline to sourced card dossiers. The pass
  frames Neo Revelation as the set where Johto becomes myth: Ho-Oh, Celebi,
  returning Lugia, and the first English Rare Shining pair make the reveal
  feel structural rather than just thematic. Added special identification
  rails for English neo3 versus Japanese Awakening Legends context, 64
  printed / 66 total Shining boundary, Ho-Oh 7 Rare Holo versus Ho-Oh 18
  Rare, Lugia 20 versus Neo Genesis Lugia 9 / Crystal Lugia branches,
  Celebi's Time Travel row, Shining Gyarados 65, and Shining Magikarp 66.
  Sources: local English WoC catalog, Pokemon TCG API v2 set/card endpoints,
  and Bulbapedia community pages for Neo Revelation and the promoted cards.
  Generated gap moved from 195 releases / 4,483 cards to 194 releases /
  4,477 cards. Current catalog-history corpus: 22,910 claims, 4,938
  sources, corpus hash
  `bcb32ddcfed27397c249fd60259860a7e165e958268775ceeb061abe35e4fed1`;
  index hash `1f33c68944b4917eedcc766e3cb898749d50770a236230931657f61b437f5750`;
  queue hash `3a0aa8359cce25124245b66cf206ceb6ea4a68cac33fd8df080bc46f6b17a3a4`.
- `[passive]` 2026-06-19 · Codex — completed the twelfth
  hand-researched catalog-history deepening pass in
  `data/catalog-history/source-sets/neo_genesis_v0_1.json`.
  Neo Genesis is now a hand-authored release dossier, with Lugia 9,
  Feraligatr 5, Meganium 11, Pichu 12, Skarmory 13, Metal Energy 19,
  and Ampharos 1 promoted from generated baseline to sourced card dossiers.
  The pass frames Neo Genesis as the English TCG's second beginning:
  Johto species, Baby Pokemon, Metal type, Special Energy grammar, and
  starter power engines arriving together instead of as a simple sequel.
  Added special identification rails for English neo1 versus Japanese Gold,
  Silver, to a New World... context, Lugia 9 versus later Lugia/Crystal
  Lugia branches, Feraligatr 5 versus 4, Meganium 11 versus 10, Pichu's
  Baby-rule boundary, Skarmory versus Metal Energy, Metal Energy as Special
  Energy rather than Basic Energy, and Ampharos 1 as the checklist-opening
  Neo Genesis row. Sources: local English WoC catalog, Pokemon TCG API v2
  set/card endpoints, Bulbapedia community pages for Neo Genesis and the
  promoted cards, plus PSA's Neo Genesis 1st Edition collecting overview as
  a lower-tier pack/chase-context source. Generated gap moved from 196
  releases / 4,490 cards to 195 releases / 4,483 cards. Current
  catalog-history corpus: 22,916 claims, 4,922 sources, corpus hash
  `245eca5ab955094f2ab82b7dbb83262c8684f9df043595da6701ce63128aeec1`;
  index hash `e23e196ce5adbbd32c49214771d57580fc9251c3a4c9d92cdef40e2ee35a988f`;
  queue hash `6ccd5698e615163d4e62227acc258545a863a46a28b6b6686b5a97f81843822d`.
- `[passive]` 2026-06-19 · Codex — completed the eleventh
  hand-researched catalog-history deepening pass in
  `data/catalog-history/source-sets/neo_discovery_v0_1.json`.
  Neo Discovery is now a hand-authored release dossier, with Espeon 1,
  Tyranitar 12, Umbreon 13, Espeon 20, Tyranitar 31, and Umbreon 32
  promoted from generated baseline to sourced card dossiers. The pass
  frames Neo Discovery as Johto excavation: ruins lineage, Unown/Ruin Wall
  atmosphere, Eeveelution branching, and Darkness typing as discovery rather
  than raw escalation. Added special identification rails for English neo2
  versus Japanese Crossing the Ruins... context, holo/non-holo paired row
  boundaries, Espeon 1 versus 20 illustrator/rarity split, Tyranitar 12
  versus 31 shared-attack trap, and Umbreon 13 versus 32 artist/rarity split.
  Sources: local English WoC catalog, Pokemon TCG API v2 set/card endpoints,
  Bulbapedia community pages for Neo Discovery and the six promoted cards,
  plus PSA's Neo Discovery 1st Edition collecting overview as a lower-tier
  pack-context source. Generated gap moved from 197 releases / 4,496 cards
  to 196 releases / 4,490 cards. Current catalog-history corpus: 22,922
  claims, 4,904 sources, corpus hash
  `64c7a1580a7c36bece18acb3bbd0070db206c8a1fedb835f1ca3b96831f89fb2`;
  index hash `bf488c1adf2212e386643377ccc366809125bf2610079acbeeb25a3f32ed7965`;
  queue hash `e4cc00a290ab78a5a14e71cd9f3a4d47036709356ce378461971c84220da8fa0`.
- `[passive]` 2026-06-19 · Codex — completed the tenth hand-researched
  catalog-history deepening pass in
  `data/catalog-history/source-sets/legendary_collection_v0_1.json`.
  Legendary Collection is now a hand-authored release dossier, with
  Charizard 3, Dark Blastoise 4, Dark Raichu 7, Gyarados 12, and Mewtwo
  29 promoted from generated baseline to sourced card dossiers. The pass
  frames Legendary Collection as a memory/remix set: Base/Jungle/Fossil/
  Team Rocket reprints, fireworks Reverse Holofoil, Box Topper/theme-deck
  exceptions, and nostalgia as a distinct assembly rather than a generic
  copy of older rows. Added special identification rails for original-set
  versus Legendary Collection reprints, regular holo versus fireworks
  reverse holo, Lava/Turmoil non-holo theme-deck branches, Dark Raichu's
  corrected-text boundary, Gyarados's Pokemon Snap photo-contest branch,
  and Mewtwo's Christopher Rush artist-line boundary. Sources: local
  English WoC catalog, Pokemon TCG API v2 set/card endpoints, and
  Bulbapedia community pages for Legendary Collection, Reverse Holofoil,
  Charizard, Dark Blastoise, Dark Raichu, Gyarados, and Mewtwo. Generated
  gap moved from 198 releases / 4,501 cards to 197 releases / 4,496
  cards. Current catalog-history corpus: 22,925 claims, 4,889 sources,
  corpus hash
  `48775a2a10e633ba89ec4d01c0854cc43b8e150550daf48b58640738c8f25414`;
  index hash `729b21c2c0144be1a88d442692416dc994271be11e8ef9da56b80c358c7bd53f`;
  queue hash `39810e1d740985ddcfde56cdbff4372e2654fb02e5cffef4436efd0c67aa08af`.
- `[passive]` 2026-06-19 · Codex — completed the ninth hand-researched
  catalog-history deepening pass in
  `data/catalog-history/source-sets/aquapolis_v0_1.json`.
  Aquapolis is now a hand-authored release dossier, with Tyranitar H28,
  Umbreon H29, Espeon H9, Zapdos H32, Crystal Energy 146, and Lugia 149
  promoted from generated baseline to sourced card dossiers. The pass
  frames Aquapolis as the e-Reader interface city: H-number holos,
  Dot-Code strips, secret rows, Crystal Type, and count-basis ambiguity
  all become part of assembly. Added special identification rails for
  local/API printedTotal 147 / total 182 versus Bulbapedia's 186-card
  blurb, H-number versus non-Holofoil counterparts, promo and Box Topper
  branches, e-Reader card IDs, Crystal Energy's promo / Creatures Deck
  context, and Lugia's 149/147 Crystal secret-row boundary. Sources:
  local English WoC catalog, Pokemon TCG API v2 set/card endpoints, and
  Bulbapedia community pages for Aquapolis, Crystal Pokemon, Tyranitar,
  Umbreon, Espeon, Zapdos, Crystal Energy, and Lugia. Generated gap moved
  from 199 releases / 4,507 cards to 198 releases / 4,501 cards. Current
  catalog-history corpus: 22,928 claims, 4,873 sources, corpus hash
  `b891e139f9db2dfe92a97357dec4b6b4a60f62d7ce98c65947e1903056fe77b0`;
  index hash `23f6e4cbc043172e61399f218c9557b3960eeca13c687917d40eaf21c0623e0f`;
  queue hash `2eeefc24b5721a0a7885abfe16d7f29d49ac0ab1f3074fecef3fc216acab00c0`.
- `[passive]` 2026-06-19 · Codex — completed the eighth hand-researched
  catalog-history deepening pass in
  `data/catalog-history/source-sets/adv_expansion_pack_v0_1.json`.
  Japanese ADV Expansion Pack is now a hand-authored release dossier, with
  Sceptile 003/055, Blaziken 011/055, Swampert 016/055, Mewtwo ex
  026/055, and Chansey ex 036/055 promoted from generated baseline to
  sourced card dossiers. The pass frames ADV Expansion Pack as the
  Ruby/Sapphire hinge: Hoenn starters, the Game Boy Advance era, early
  Pokemon-ex risk grammar, and post-WotC Japanese ADV production all arriving
  together. Added special identification rails for Japanese ADV versus
  English EX Ruby & Sapphire comparison, ADV1 numbering, lowercase ex versus
  later uppercase EX conventions, Hoenn starter-final-form row boundaries,
  Mewtwo ex's old-myth/new-suffix context, and Chansey ex's recoil/risk
  context. Sources: local Japanese ADV catalog, TCG Collector, TCGdex API,
  and Bulbapedia community pages for EX Ruby & Sapphire, ADV TCG Era
  merchandise, Pokemon Ruby/Sapphire, Sceptile, Blaziken, Swampert, Mewtwo
  ex, Chansey ex, and Pokemon-ex. Generated gap moved from 200 releases /
  4,512 cards to 199 releases / 4,507 cards. Current catalog-history
  corpus: 22,932 claims, 4,858 sources, corpus hash
  `d1702a44a9bc9b18f35ab572785ebbdc465822756695019d8ca724ec4d31b851`;
  index hash `44a205f84f52f02a13e7ff959125b0695a30015793d0daf4bbbadbcf38150dc4`;
  queue hash `495db99c7f16339ba9f0156fc47c51552c6e35175cd6d35b6fb6fe44f946c163`.
- `[passive]` 2026-06-19 · Codex — completed the seventh hand-researched
  catalog-history deepening pass in
  `data/catalog-history/source-sets/neo_destiny_v0_1.json`.
  Neo Destiny is now a hand-authored release dossier, with Dark Espeon 4,
  Dark Tyranitar 11, Shining Charizard 107, Shining Mewtwo 109, Shining
  Raichu 111, and Shining Tyranitar 113 promoted from generated baseline
  to sourced card dossiers. The pass frames Neo Destiny as the late-Neo
  Light / Dark / Shining fork: the set where moral vocabulary, Team Rocket
  pressure, and secret-style rarity become part of card assembly. Added
  special identification rails for the 105 printed / 113 total API-row
  boundary, Dark Espeon / Eeveelution context, Dark Tyranitar versus
  Shining Tyranitar row separation, Shining Charizard's secret-row and
  five-Energy context, Shining Mewtwo's blue-shiny context, Shining
  Raichu's Lightning / Water attack context, and Shining Tyranitar's
  Pokedex spelling-error / final-row boundary. Sources: local English WoC
  catalog, Pokemon TCG API v2 set/card endpoints, and Bulbapedia community
  pages for Neo Destiny, Dark Espeon, Dark Tyranitar, Shining Charizard,
  Shining Mewtwo, Shining Raichu, and Shining Tyranitar. Generated gap
  moved from 201 releases / 4,518 cards to 200 releases / 4,512 cards.
  Current catalog-history corpus: 22,935 claims, 4,841 sources, corpus
  hash `20b60cc79b9f5ffe35f409c960375ecff2c0005de718f2fe267a559a7a2687fa`;
  index hash `af2c9f79794f98c825d4669bc020e177836680ab6871bd9c77b2aa12cf6daa8d`;
  queue hash `8c47b2c89d63106a64123228d946b9683c1d7c72a184bc29ae8166c0e1d09445`.
- `[passive]` 2026-06-19 · Codex — completed the sixth hand-researched
  catalog-history deepening pass in
  `data/catalog-history/source-sets/gym_heroes_v0_1.json`.
  Gym Heroes is now a hand-authored release dossier, with Blaine's
  Moltres 1, Misty's Tentacruel 10, Rocket's Scyther 13, Lt. Surge's
  Raichu 28, and Misty's Psyduck 54 promoted from generated baseline to
  sourced card dossiers. The pass frames Gym Heroes as the first English
  Leaders' Stadium / Gym owner-name assembly: a familiar Pokemon can now
  arrive as somebody's trained Pokemon, and that relationship becomes part
  of catalog identity. Added special identification rails for the release's
  borrowed-team context, Blaine's Moltres five-Energy milestone, Misty's
  Tentacruel Hanada City Gym / Leaders' Stadium path, Rocket's Scyther's
  pre-evolution text error, Lt. Surge's Raichu Kuchiba / Vermilion Gym
  context, and Misty's Psyduck standard / W-stamped / Hanada branches.
  Sources: local English WoC catalog, Pokemon TCG API v2 set/card
  endpoints, and Bulbapedia community pages for Gym Heroes, Blaine's
  Moltres, Misty's Tentacruel, Rocket's Scyther, Lt. Surge's Raichu, and
  Misty's Psyduck. Generated gap moved from 202 releases / 4,523 cards to
  201 releases / 4,518 cards. Current catalog-history corpus: 22,935
  claims, 4,827 sources, corpus hash
  `aa5ec59a831d4184726bafbda536834080912a71bc3e59e5b51d115867988cf3`;
  index hash `aefb5b4b63385f50470e8f35d7c06133c4c9c035de1a1164a99b182efb2f470a`;
  queue hash `ee497dcf9e3fe8ae07bd057b901c5b1a01d1782f384cb95852e1076fafbde587`.
- `[passive]` 2026-06-19 · Codex — completed the fifth hand-researched
  catalog-history deepening pass in
  `data/catalog-history/source-sets/gym_challenge_v0_1.json`.
  Gym Challenge is now a hand-authored release dossier, with Blaine's
  Charizard 2, Misty's Gyarados 13, Rocket's Mewtwo 14, Rocket's Zapdos 15,
  and Misty's Tears 118 promoted from generated baseline to sourced card
  dossiers. The pass frames Gym Challenge as owner-name grammar: relationship
  is part of card identity, not flavor text. Added special identification
  rails for owner-name flattening, Blaine's Charizard Roaring Flames symbol
  context, Misty's Gyarados Rebellion context, Rocket's Mewtwo three-attack /
  Winner-stamp / jumbo branches, Rocket's Zapdos anniversary and Creatures
  Deck branches, and English/Japanese Misty's Tears artwork boundaries.
  Sources: local English WoC catalog, Pokémon TCG API v2 set/card endpoints,
  and Bulbapedia community pages for Gym Challenge, Blaine's Charizard,
  Rocket's Mewtwo, Rocket's Zapdos, and Misty's Tears. Generated gap moved
  from 203 releases / 4,528 cards to 202 releases / 4,523 cards. Current
  catalog-history corpus: 22,940 claims, 4,815 sources, corpus hash
  `d1db51ecf2a0f7dd8d15ab78750f2477d6938141430b7779a0b68da67e424bf7`;
  index hash `a54e51d0ce6a30f72fd43889ff984fb62c768542250a8eb657bdd954f219da94`;
  queue hash `df685fae52c870407272c83ed56da0a434ac0ce2a41e272c32ea34784c041323`.
- `[passive]` 2026-06-19 · Codex — completed the fourth hand-researched
  catalog-history deepening pass in
  `data/catalog-history/source-sets/expedition_base_set_v0_1.json`.
  Expedition Base Set is now a hand-authored release dossier, with Blastoise
  4, Charizard 6, Charizard 39, Mew 19, and Tyranitar 29 promoted from
  generated baseline to sourced card dossiers. The pass frames Expedition as
  the e-Card hinge: old Wizards chase gravity inside a machine-readable card
  frame. Added special identification rails for e-Reader Dot Code/scanability,
  holo vs non-holo row identity, multiple Expedition Charizard rows, Charizard
  39's documented English evolution-text error, Mew 19/55/P Promo context, and
  Tyranitar standard vs jumbo box-topper branches. Sources: local English WoC
  catalog, Pokémon TCG API v2 set/card endpoints, and Bulbapedia community
  pages for Expedition Base Set, Blastoise 4, Charizard 39, Mew 19, and
  Tyranitar 29. Generated gap moved from 204 releases / 4,533 cards to
  203 releases / 4,528 cards. Current catalog-history corpus: 22,944 claims,
  4,804 sources, corpus hash
  `7039d035e634b48654e5542776e3ba7de5fff00d1d94eb981facd0e9d0141658`;
  index hash `a9b68ba38d42e5a81fe0489597b904924e1374c61a5c324de4d7007a1a2572cc`;
  queue hash `f2b331f971fba3d423188425070699042d3226596aabd636bf52071b9ec93383`.
- `[passive]` 2026-06-19 · Codex — completed the third hand-researched
  catalog-history deepening pass in
  `data/catalog-history/source-sets/wizards_black_star_promos_v0_1.json`.
  Wizards Black Star Promos is now a hand-authored release dossier, with
  Pikachu 1, Mew 8, Mew 9, _____'s Pikachu 24, and Lucky Stadium 41 promoted
  from generated baseline to sourced card dossiers. The pass treats the promo
  star as a distribution/contact map rather than a normal expansion: League,
  movie, guide/book, Game Boy, mail-in/Create-a-Card, Pokémon Center New York,
  home-video, and magazine routes stay legible instead of collapsing into
  "promo." Added special identification rails for row-specific Pikachu/Mew
  comparisons, Birthday Pikachu owner/birthdate-field state, and Lucky Stadium
  New York print context. Sources: local English WoC catalog, Pokémon TCG API
  v2 set/card endpoints, and Bulbapedia community pages for Wizards Black Star
  Promos, Mew 8, _____'s Pikachu, and Lucky Stadium. Generated gap moved from
  205 releases / 4,538 cards to 204 releases / 4,533 cards. Current
  catalog-history corpus: 22,945 claims, 4,793 sources, corpus hash
  `0ec101102b0bf36e85d3f2f0848d0988678813932cc9fa99fd2b682a1c038bd7`;
  index hash `ee4912d0858396b5f6a929f50faba4cb4f43cd508577e59f75ea205398f1d364`;
  queue hash `d77381336e290adaab7127b22181e246cd60d73e2ae3b665c45ee67c1c21e5e8`.
- `[passive]` 2026-06-19 · Codex — completed the second hand-researched
  catalog-history deepening pass in
  `data/catalog-history/source-sets/hanada_city_gym_misty_v0_1.json`.
  Hanada City Gym / Misty is now a hand-authored release dossier, with
  Misty's Psyduck 001, Misty's Tentacool 003, Misty's Goldeen 009, and
  Misty's Tears 018 promoted from generated baseline to sourced card dossiers.
  The pass adds special identification rails for fixed-deck no-rarity context,
  common-rare rarity-language drift, duplicate same-name Goldeen rows, and the
  Misty's Tears Japanese/English artwork boundary. Sources: local Japanese
  pre-English catalog, PokéCardex HCGYM series page, and Bulbapedia community
  pages for Hanada City Gym and Misty's Tears. Generated gap moved from
  206 releases / 4,542 cards to 205 releases / 4,538 cards. Current
  catalog-history corpus: 22,947 claims, 4,780 sources, corpus hash
  `e2ae673cf1046dbe251c15a575307950c16cd2e44c97a2b46e9ea9831c551193`;
  index hash `f462626880f71521c7e35811de7cafba99f1c1f7a0ca61c7735e4b0718ffe188`;
  queue hash `22f42a06f3c7b3bcf48eee2078f049f151734cd24d787364308fc0783b50c028`.
- `[passive]` 2026-06-19 · Codex — completed the first post-baseline
  hand-researched deepening pass in `data/catalog-history/source-sets/team_rocket_v0_1.json`.
  Team Rocket is now a hand-authored release dossier, and Dark Blastoise
  3/82, Dark Charizard 4/82, and Dark Raichu 83/82 are hand-authored card
  dossiers rather than generated baselines. Sources: local English WoC catalog,
  Pokémon TCG API v2 set/card endpoints, and Bulbapedia raw wikitext for Team
  Rocket/Dark Pokémon/83-82 context. Generated gap moved from 207 releases /
  4,545 cards to 206 releases / 4,542 cards. Current catalog-history corpus:
  22,948 claims, 4,772 sources, corpus hash
  `a3331ef872e822b27d390cad86ee342469f0380d71eda54a68718d1afd0a33f7`;
  index hash `0e1721be6eb333abe9b1f775cfae73b98009c7f624d8af7c5065edbf471e5a22`;
  queue hash `5e92d0df3818a442a9f0ae39441019be0beb1e4f1730ee106eb08dfe5adbb19e`.
- `[passive]` 2026-06-19 · Codex — enriched generated catalog-history
  dossiers with local-catalog assembly profiles and added a prioritized
  research queue at `data/catalog-history/deepening-queue.json`. Generated
  release dossiers now carry assembly themes, an assembly note, chase-card
  heuristics, and key artist clusters; generated card dossiers now carry
  card-level assembly themes and an assembly note grounded in row identity,
  rarity signal, artist trace, collector texture, and special-ID rails. The
  new queue ranks the top 100 generated releases and top 100 generated cards
  for hand-researched deepening; it is explicitly a research work-order, not
  a market ranking. Current corpus: 209 release dossiers, 4,549 card dossiers,
  22,947 claims, 4,764 sources. Corpus hash
  `e24ba1c77525e9f73490e1da69274ab746db5dd85274dac8d509057e6d114320`;
  index hash `5f9b16ad4782f9cfad8c1013b77f22bdcc769e66e2cdf23cf318de8acd301069`;
  queue hash `4fbfcb6f96b084206b61277772a40d1b28869dda73792c83454e119f8474cec6`.
- `[passive]` 2026-06-19 · Codex — widened the catalog-history dossier
  layer from pilot-only to full baseline corpus. `scripts/build_catalog_history_dossiers.py`
  now keeps hand-authored source-set dossiers as overrides, then synthesizes
  local-catalog baseline dossiers for every remaining modeled release and card.
  Current output: 209 release dossiers, 4,549 card dossiers, 18,195 claims,
  4,764 sources. Generated baseline counts are 207 release dossiers and 4,545
  card dossiers; the four hand-authored card dossiers and two hand-authored
  release dossiers remain the richer pilot pieces. Added
  `data/catalog-history/index.json` as a compact agent scan surface with
  release chase-card heuristics, key artist row counts, card rarity/artist
  signals, and narrative titles. New corpus hash:
  `1f65c6c6043d751eae187bf2d10699693f6a8dd97678f3e54c5f31cefa1e80d1`; index
  hash: `f1685e7417f4732a6e67188542e0f57d566245438ca4e02a995677367b482b51`.
  Audit status is `baseline_full_corpus_with_deep_research_gap`: 0 modeled
  releases/cards without a dossier, but 207 releases and 4,545 cards still need
  true deep researched history beyond generated local-catalog footholds.
- `[passive]` 2026-06-19 · Codex — added the first catalog-history dossier
  layer at `data/catalog-history/`, generated by
  `scripts/build_catalog_history_dossiers.py`. This is the scalable rail for
  the broader objective: deep set/card history, chase/lore/artist texture, and
  passionate judged narrative, while keeping every factual statement sourced
  and every narrative paragraph tied to claim ids. Pilot output:
  2 release dossiers (`jp_tcg_expansion_pack_19961020`,
  `en_wotc_base_set_19990109`), 4 card dossiers (No Rarity Bulbasaur,
  Charizard, Pikachu, plus first CoroCoro glossy Pikachu), 30 claims, 12
  sources, corpus hash
  `bd32888847d4ea11407c3e229bb59bd89f3c5e398c87e5bbf4f9442a1a627be2`.
  Audit status is deliberately `pilot_in_progress`: it proves schema and
  sourcing rails, not full-corpus completion. Remaining minimum: 207 release
  dossiers and 4,545 card dossiers.
- `[passive]` 2026-06-18 · Codex — promoted
  `special_identification_instructions` into the sourced card dossier layer,
  not just the raw catalog rows. `scripts/build_card_dossiers.py` now requires
  the field on every dossier and validates non-empty entries as legible
  structured instructions with explicit `not_claiming` rails. The pilot
  dossiers now expose quick-grab instructions for No Rarity Charizard, No
  Rarity Pikachu, and first CoroCoro glossy Pikachu, including the glossy
  Pikachu illustrator conflict (preferred selected-source Ken Sugimori,
  conflicting provider Keiji Kinebuchi preserved). Regenerated
  `data/japanese-pre-english/dossiers.json`; dossier corpus hash is now
  `90427fc61b16420fdc463e2b0c1f66bbdbf9670a364b7021b1550619b0930d7b`.
- `[passive]` 2026-06-18 · Codex — added the bounded-source catalog completion
  audit at `data/catalog-expansion/completion-audit.json`, generated by
  `scripts/build_catalog_completion_audit.py`. The audit passes and supports a
  bounded claim: no known source-visible in-scope English/Japanese TCG set,
  promo, or bounded supplemental row is missing from the modeled corpus, and
  all 4,549 rows have current canonical row fields. It does not claim physical
  truth, omniscient source coverage, or equivalence between TCGdex and
  Bulbapedia Jumbo counts. The English Jumbo proof now has 0 unclassified
  post-prefix rows; the remaining Jumbo issue is a disclosed non-blocking
  source-count mismatch for the bounded-source claim. Coverage ledger status is
  now `bounded_source_complete_with_disclosed_residuals`.
- `[passive]` 2026-06-18 · Codex — split the Japanese unnumbered promo
  continuation corpus at `data/japanese-unnumbered-promo-wotc/` from one
  aggregate source-slice release into 132 source-derived campaign release
  families, generated by `scripts/build_japanese_unnumbered_promo_wotc_catalogs.py`.
  Row coverage is unchanged and still source-bounded: Bulbapedia rows 061-257,
  197 rows total, all with `special_identification_instructions` and source
  contacts. The split is by exact source promotion/distribution note; it does
  not claim official campaign-boundary proof beyond that note. Coverage ledger
  now reports 209 modeled releases / 4,549 rows and removes the old campaign
  splitting todo.
- `[passive]` 2026-06-18 · Codex — added an English Jumbo boundary proof at
  `data/catalog-expansion/english-jumbo-boundary-proof.json`, generated by
  `scripts/build_english_jumbo_boundary_proof.py`. It preserves the TCGdex-vs-
  Bulbapedia mismatch (TCGdex says 160; Bulbapedia raw has 390 rows), proves the
  first 10 Bulbapedia rows are the bounded WoC-era/Best-of-Game Jumbo prefix,
  and shows the source jumps next to modern 25th Anniversary and post-WoC
  Nintendo/e-League material. This does not claim complete Jumbo coverage; it
  turns the remaining Jumbo work into a disclosed count/source mismatch rather
  than an uninspected gap. Boundary proof and coverage ledger now cite it.
- `[passive]` 2026-06-18 · Codex — added a cross-corpus schema profile at
  `data/catalog-expansion/schema-profile.json`, generated by
  `scripts/build_catalog_schema_profile.py`. It proves the canonical row field
  surface across all 4,549 modeled rows and records seven source-specific row
  schemas. The only notable normalized-projection asymmetry is `card_number`:
  the older Japanese pre-English rows lack it, so agents should use
  `display_number = card_number if present else local_id`. Coverage ledger now
  cites this profile and removes the schema-unification todo; remaining work is
  Jumbo partial plus optional campaign splitting for aggregate unnumbered promos.
- `[passive]` 2026-06-18 · Codex — added a machine-readable catalog boundary
  proof at `data/catalog-expansion/boundary-proof.json`, generated by
  `scripts/build_catalog_boundary_proof.py`. It checks four source surfaces:
  English PokemonTCG API sets through Skyridge (no missing in-scope IDs; first
  post-boundary set is Ruby & Sapphire / `ex1`), English supplemental TCGdex
  zero-ref families (W/Sample resolved, Jumbo partial), Japanese TCGdex sets
  through ADV2 (first post-boundary set is ADV3 on 2003-06-25), and Japanese
  promo source pages (pre-English slice + unnumbered rows 061-257 + P + ADV-P
  001-014). Coverage ledger now cites this proof and removes the vague English
  miscellaneous proof todo; remaining work is Jumbo partial, optional campaign
  splitting for aggregate unnumbered promos, and schema unification.
- `[passive]` 2026-06-18 · Codex — widened the bounded English Jumbo WoC-era
  subset from 8 to 10 rows after rechecking the source boundary: BattleZone
  June/July 2003 are still Best of Game Winner Jumbo rows, and Best of Game is
  already modeled as English WoC-era. The first post-boundary Jumbo rows in the
  source are September-November 2003 Nintendo Promo/e-League rows. Renamed the
  generated release to `en_wotc_jumbo_bounded_200002_200307`, removed the stale
  May-bound file, updated source-gap accounting to 10 modeled / 150 remaining,
  and regenerated the coverage ledger.
- `[passive]` 2026-06-18 · Codex — added a bounded Japanese unnumbered promo
  continuation source-slice at `data/japanese-unnumbered-promo-wotc/`, generated
  by `scripts/build_japanese_unnumbered_promo_wotc_catalogs.py`. It models
  Bulbapedia unnumbered promo source rows `061` through `257` (197 rows), from
  late pre-English leftovers through Battle Road Spring 2003. Row `258` begins
  Summer 2003 and remains outside this bounded slice. This is an aggregate
  source-slice, not a final campaign-by-campaign release split. Every row has
  source contacts and an unnumbered-promo `special_identification_instructions`
  rail. Coverage ledger now reports 78 release catalogs / 4,547 rows, still
  `in_progress`.
- `[passive]` 2026-06-18 · Codex — added a bounded Japanese numbered promo
  corpus at `data/japanese-promo-wotc/`, generated by
  `scripts/build_japanese_promo_wotc_catalogs.py`. New modeled rows: all 47
  `P Promotional` rows (`001/P` through `047/P`) and the pre-edge 14 `ADV-P`
  rows (`001/ADV-P` through `014/ADV-P`, January-May 2003 notes). Rows
  `015/ADV-P` and later remain deliberately out-of-scope because the source
  begins them at June 25, 2003 or later. Every row has source contacts and a
  numbered-promo `special_identification_instructions` rail. Coverage ledger
  now reports 77 release catalogs / 4,350 rows, still `in_progress`.
- `[passive]` 2026-06-18 · Codex — added a consolidated catalog coverage ledger
  at `data/catalog-expansion/coverage-ledger.json`, generated by
  `scripts/build_catalog_coverage_ledger.py`. Current modeled corpus state: 75
  release catalogs / 4,289 rows across Japanese pre-English, English WoC,
  Japanese classic, Japanese ADV pre-WoC, and English supplemental WoC slices.
  The ledger makes `special_identification_instructions` a cross-corpus row
  invariant: 4,289 rows checked, 0 missing, 0 malformed, 27 non-empty. It also
  keeps completion honestly `in_progress`: English Jumbo remains active/partial
  and broader Japanese/English promo universe completeness still needs boundary
  proof.
- `[passive]` 2026-06-18 · Codex — partially bounded the remaining English Jumbo
  gap without pretending the whole TCGdex `jumbo` bucket is WoC-era. Extended
  `scripts/build_english_supplemental_catalogs.py` and `data/english-supplemental-wotc/`
  with `en_wotc_jumbo_bounded_200002_200305`: 8 early Jumbo/oversized rows from
  Bulbapedia raw wikitext (Top Deck Pikachu, Warner Bros. movie jumbo, and Best of
  Game Winner jumbos through May 2003). Every row has a Jumbo physical-format
  `special_identification_instructions` rail. `data/catalog-expansion/source-gaps.json`
  still keeps English `jumbo` active, now with `partial_resolution` showing 8 modeled
  rows and 152 remaining source-gap rows not safely resolved/bounded.
- `[passive]` 2026-06-18 · Codex — converted two English supplemental TCGdex gaps
  into bounded row catalogs. Added `scripts/build_english_supplemental_catalogs.py`
  and generated `data/english-supplemental-wotc/` for W Promotional (7 rows, gold
  W-stamp identification rail) and the English New York Press Conference Sample Set
  rows (10 rows, Sample-stamp identification rail). Source model: Bulbapedia raw
  wikitext rows for card identity/type/rarity/promotion notes; TCGdex remains the
  set/date/count cross-check and still returns zero card refs. Updated
  `data/catalog-expansion/source-gaps.json`: active gaps now only English `jumbo`
  (160 rows, not safely WoC-bounded from TCGdex alone); resolved gaps are `wp`, `sp`,
  `ADV1`, and `ADV2`.
- `[passive]` 2026-06-18 · Codex — converted the Japanese pre-cutoff ADV source gaps
  into a bounded row corpus. Added `scripts/build_japanese_adv_pre_wotc_catalogs.py`
  and generated `data/japanese-adv-pre-wotc/` for `ADV1` / Japanese ADV Expansion
  Pack (55 rows, 2003-01-31) and `ADV2` / Miracle of the Desert (53 rows,
  2003-04-18). Source model: TCG Collector row/card pages for row identity,
  illustrator, rarity, and external image witnesses; TCGdex remains the set/date/count
  cross-check and still returns zero card refs. Updated
  `data/catalog-expansion/source-gaps.json` so active gaps drop to English `wp`,
  `sp`, and bounded-unsafe `jumbo`; ADV1/ADV2 are preserved as resolved-by-alternate-
  source gaps. Japanese names remain `missing_from_exact_source` until a separate
  row-level Japanese-name source is wired.
- `[passive]` 2026-06-18 · Codex — hardened the row-level
  `special_identification_instructions` rail into a standard catalog row invariant.
  Updated `scripts/build_japanese_pre_english_catalogs.py` to normalize every
  generated pre-English card row to carry the field as a list, fail audit on missing
  or malformed shapes, and report `special_identification_instruction_rows` in the
  manifest/audit. Regenerated `data/japanese-pre-english/`; all 1,264 pre-English
  rows now carry the field, with only the two glossy Pikachu rows non-empty. Cross-corpus
  audit across pre-English, Japanese classic, and English WoC rows: 4,156 total,
  0 missing, 0 malformed.
- `[passive]` 2026-06-18 · Codex — expanded the catalog source-gap register with
  Japanese pre-cutoff ADV gaps exposed by TCGdex but not row-modelable from that source:
  `ja/ADV1` (55 listed / 0 refs, 2003-01-31) and `ja/ADV2` (53 / 0, 2003-04-18).
  These are before the English Skyridge / US WoC-era endpoint, so they remain in-scope
  as explicit gaps. `ADV3` and later are after the cutoff and remain excluded from this
  boundary unless the product boundary is deliberately widened.
- `[passive]` 2026-06-18 · Codex — added a machine-readable source-gap register for
  supplemental products exposed by TCGdex but not card-row-modelable from that source:
  `data/catalog-expansion/source-gaps.json` plus builder
  `scripts/build_catalog_expansion_gaps.py`. Current gaps: English `wp` W Promotional
  (7 listed / 0 refs), English `sp` Sample (10 / 0), and English `jumbo` Jumbo cards
  (160 / 0, not safely WoC-bounded from TCGdex alone). This is not a card catalog; it is
  an anti-overclaim target list for the next source pass.
- `[passive]` 2026-06-18 · Codex — added the Japanese classic/WoC-corresponding
  main-set slice after the existing pre-English corpus. New builder:
  `scripts/build_japanese_classic_catalogs.py`; output: `data/japanese-classic/`.
  Source is TCGdex Japanese REST. Boundary includes `PMCG6`, `neo1`-`neo4`, `VS1`,
  `web1`, and `E1`-`E5` (Challenge from the Darkness through Mysterious Mountains,
  1999-06-25 to 2002-10-04). Output: 12 release catalogs / 1,103 modeled rows /
  1,104 expected rows, with one explicit source gap: `web1` local ID `039`.
  Japanese ADV/PCG and Japanese promo coverage after the existing pre-English promo
  slice remain open. TCGdex does not supply image URLs for this slice; rows record
  `no_image_source_supplied` rather than promoting invented image references.
- `[passive]` 2026-06-18 · Codex — started the broader through-2003 catalog expansion
  with an English WoC-era corpus. Added `scripts/build_english_wotc_catalogs.py` and
  generated `data/english-wotc/` from Pokemon TCG API v2. Boundary is English WoC
  through Skyridge / 2003-05-12: Base, Jungle, Wizards Black Star Promos, Fossil, Base
  Set 2, Team Rocket, Gym Heroes/Challenge, Neo Genesis/Discovery/Revelation/Destiny,
  Southern Islands, Legendary Collection, Expedition, Best of Game, Aquapolis, and
  Skyridge. Explicitly excludes post-WoC 2003 API set IDs `ex1`, `ex2`, `ex3`, and
  `np`. Output: 18 release catalogs / 1,789 card rows, with source hashes, bounded
  external image witnesses, non-claims, manifest, and audit. Japanese post-1999 through
  2003 is still open.
- `[passive]` 2026-06-18 · Codex — added a row-level
  `special_identification_instructions` rail for conflict-heavy catalog rows, starting
  with the first CoroCoro glossy Pikachu. The parent UPC source-slice row and child
  CoroCoro row now carry a legible instruction that says to identify it first as
  `Pikachu [Glossy]` from the CoroCoro Comic November 1996 insert, prefer the selected
  snapshot's Ken Sugimori credit, and preserve PokéCardex's Keiji Kinebuchi value as a
  conflict artifact. The Card Dossier pilot now has a matching
  `identification.special_instructions` claim. Re-pinned the parent UPC source-slice,
  all promo-family child releases that cite that parent hash, the manifest entries, and
  the dossier corpus.
- `[passive]` 2026-06-18 · Codex — corrected the first CoroCoro glossy Pikachu
  illustrator handling. The parent UPC source-slice row
  `jp_promo_unnumbered_pre_english_source_slice_19961015_19990131:001` and child
  row `jp_promo_corocoro_first_19961015:001` now prefer the selected source snapshot's
  Ken Sugimori credit and preserve PokéCardex's Keiji Kinebuchi as explicit conflict
  metadata. Re-pinned the parent/child release hashes in `manifest.json` and updated
  the Card Dossier claim to say the row preserves the conflict artifact, not that it
  displays Keiji. Builder now has a targeted override + regression guard for those rows.
- `[passive]` 2026-06-18 · Codex — accepted the Card Dossier handoff and landed P0
  in the catalog data lane. Added `data/japanese-pre-english/dossiers/pilot_v0_1.json`
  with three pilot dossiers: No Rarity Charizard, No Rarity Pikachu, and first CoroCoro
  glossy Pikachu. Added `scripts/build_card_dossiers.py`, generated
  `data/japanese-pre-english/dossiers.json` + `dossiers-manifest.json`, and added
  `agent_tools/card_dossier_tools.py` with `get_dossier` / `search_claims` retrieval.
  Corpus is 3 dossiers / 18 atomic claims / 6 sources; every claim has >=1 source and
  returns as `authority_label: legible`. Useful pilot finding preserved: CoroCoro glossy
  Pikachu has an illustrator source conflict (selected Bulbapedia snapshot says Ken
  Sugimori; local provider metadata displays Keiji Kinebuchi and is caveated as not
  direct print authority). This is logged as C-tier conflict, not smoothed into a fact.
- `[handoff → codex]` 2026-06-18 · Claude — NEW cross-lane ask. Wrote
  `Protocol_Card_Dossier_v0.1.md` on `main`: a sourced "expert collector" depth corpus
  (art · artist · release history) over the earliest era — bound **pre-Base promos → No
  Rarity Base**. Your lane (extends the catalog data pipeline). **P0:** lock the dossier
  schema (§2) + build the ~3 alpha-card pilot (§3). Law: a claim = an atomic statement with
  ≥1 source; unsourced facts are OMITTED, coverage gaps logged not vibed. The retrieval API
  (`get_dossier`/`search_claims`, §5) is the seam I consume for the deep-dive UI + agent
  voice. Right-sized: local embed + sqlite, no vector DB. Read the spec → P0 → clear the bit.
- `[passive]` 2026-06-18 · Claude (brokering pass) — got both lanes onto the same
  page before more work. (1) Landed `Protocol_Codex_Brief_2026_06_17.md` on `main`
  (commit `c24519d`, byte-identical to the copy inside surface's `936af13`) so
  AGENTS/SYNC/CLAUDE now resolve their canonical current-state pointer ON TRUNK —
  it previously lived only on `claude/surface-agent`. (2) The duplicate "Fill
  Japanese pre-English illustrator credits" (main `bb9fcc9` vs surface `46daa3f`) is
  patch-IDENTICAL — `git cherry -v main claude/surface-agent` marks `46daa3f` as
  already-in-main. It is NOT a divergence: a future merge/rebase of
  `claude/surface-agent` reconciles it automatically (rebase drops it; merge sees the
  same change, no conflict). No history was rewritten. My surface lane (`936af13`:
  binder, interrupt bar, payment doc, inventory tools/sol, card assets) stays
  un-merged on the branch — fast-forward/cherry-pick when the broker is ready.
- `[passive]` 2026-06-18 · Codex — read AGENTS/SYNC/CLAUDE pointer and the
  2026-06-17 brief; ran the worktree check; stale `/tmp` main worktree was not
  registered, then `git worktree prune` ran cleanly. Recreated `main` at the
  persistent path `/Users/che/marketplace-main`, cherry-picked the coordination
  entrypoint commit onto `main`, and cleared `UNREAD-FOR` to `none`. Did not touch
  Qwen, `evaluate_gate`, `mockups/`, or `Protocol_Arbitration_v0.1.md`.
- `[BLOCKING: git/worktrees]` 2026-06-17 · Claude — the `main` worktree at
  `/private/tmp/marketplace-main-illustrators` is GONE (the dir was in `/tmp`; commits are
  safe, the slot is stale). Broker: `git worktree prune`, recreate `main` at a PERSISTENT
  path, then cherry-pick the coordination commit (SYNC.md + AGENTS.md + CLAUDE.md pointer)
  onto `main` so Codex's side activates. Until then these files live on `claude/surface-agent`.
- `[passive]` 2026-06-17 · Claude — Qualified Qwen3.6 vs the interrupt-bar probe
  (15/15, 0 overclaim); wired the first browse loop (`simulations/cairn_browse.py`). Codified
  `Protocol_Interrupt_Bar_v0.1.md`. Committed my lane to `claude/surface-agent` (path-scoped).
  FOR CODEX: (1) `evaluate_gate` §7 extension proposed — your call to wire or review;
  (2) Qwen `:8081` server may be up — see seam 3 before your qwen sims; (3) reconcile
  `Protocol_Arbitration` (seam 4); (4) regular Base Set (PMCG1 rarity-symbol) is a data gap if wanted.
  NEXT (Claude): browse call-bar into the binder UI.
