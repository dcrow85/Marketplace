# Japanese No Rarity Base Set Research v0.3

Generated 2026-05-21.

## Scope

This research pass narrows the alpha catalog to one target: Japanese Base Set / Expansion Pack No Rarity.

The local database is:

- `data/no-rarity-base-set.json`
- 96 strict First Expansion Pack booster-checklist rows
- 102 broader Japanese Base-family catalog rows
- 96 active No Rarity targets, local ids `001-096`
- 6 basic Energy caveats, local ids `097-102`, tracked for family completeness rather than booster membership
- 102 collector texture notes that help agents explain why a row may be interesting without turning that texture into trade evidence
- 102 illustrator metadata objects with source, field, authority, and verification status
- 102 information audit objects that separate primary UI value from agent-only provenance and disposable display clutter

## Working Interpretation

Japanese Base Set No Rarity is a missing-rarity-symbol variant, not a separate normal catalog set. The database should anchor the card row and evidence target, but it should not claim that a seller's physical card is authentic, possessed, correctly conditioned, or actually No Rarity.

## Set Entry

No Rarity is the collector name for the earliest Japanese Expansion Pack print run, where the usual lower-right rarity mark is absent. The claim is historically powerful, but physically small: a blank corner only becomes meaningful when the rest of the card, its row, its print cues, and its seller evidence agree.

The Japanese Expansion Pack booster released on October 20, 1996 as the first main Pokémon Card Game booster product, with 96 possible cards and no basic Energy cards. The broader Japanese Base-family count is 102 only when the six basic Energy cards associated with the simultaneous Starter Pack are added back in as caveats. It is not the first Pokémon card object overall: Bandai Carddass cards predate it as non-TCG collectible cards, and glossy CoroCoro Pikachu/Jigglypuff promos appeared five days before the set. It is the first full Pokémon TCG set: the point where the game became something children could open, sort, play, damage, trade, and lose.

The blank corner matters because later Japanese cards use a small grammar there: circle for common, diamond for uncommon, star for rare. The No Rarity print is the moment before that grammar settled onto the cards. Collectors treat it as Japan's functional first-print marker for Base Set, while the protocol should keep the wording careful: hobby consensus is strong, but the official confirmation trail is thinner than the market's confidence sometimes makes it sound.

## Collector Significance

- The ordinary rows matter. Caterpie, Diglett, Potion, and Lass are part of the story because the missing-symbol claim lives across the active target range, not only in Charizard and the other holos.
- Condition carries history. These were children's cards before they were artifacts, so clean copies are scarce partly because the original use case was play, not preservation.
- The set is a useful agent testbed because the meaningful difference is easy to point at and easy to overclaim. That forces the protocol to separate catalog row, seller photo, possession proof, print-run claim, verifier judgment, and market excitement.
- PMCG1 local ids are catalog anchors, not printed card numbers. A seller's Japanese Base card is not expected to show a modern English-style `001/102` number.

## Agent Platform Context

This catalog is agent infrastructure first. It is not a buyer-facing price oracle or an authentication authority. It exists to make the No Rarity market legible to an agent: what the claim is, what evidence matters, what costs are being asked of the seller, what should be shown to the human, and what remains judgment.

The agent decides when to contact its human based on the human's risk tolerance, budget, attention preference, and agreed autonomy. The catalog should give the agent structured reasons, not commands.

Human contact should be reserved for meaningful decisions: price uncertainty, evidence cost, trust gap, verifier escalation, bond size, route risk, or claim ambiguity. Agent-to-agent negotiation should preserve seller attention as a real cost and allow extra asks to be priced, refused, or credited back.

## Agent Card Profile Hardening

Each row now carries an `agent_decision_profile`. This is the first agent-native layer above the catalog row.

The profile gives the agent:

- a baseline evidence profile such as `NR-A`, `NR-B`, `NR-C`, or `NR-0`
- a value-band description without pretending to know price
- conditional overlays for slabbed offers and weak seller trust
- what the catalog lets the agent know
- what the agent still does not know
- recommended evidence for this exact row
- card-specific tells where relevant
- escalation triggers
- agent-to-agent seller questions
- spendability boundaries

This makes the page less like a flat lookup table and more like an agent workbench. Charizard, Lass, Double Colorless Energy, and a basic Energy caveat should no longer ask the agent to think in the same shape.

## Identification Rules

1. Identify the family first: Japanese Expansion Pack / Base Set only. A no-symbol Gym deck card, promo, theme-deck card, or later Japanese card is not the same claim.
2. Anchor the catalog row second: exact card identity, artwork, language, era, and expected Japanese Pocket Monsters back. PMCG1 local ids are database anchors, not printed set numbers.
3. Separate strict product order from local protocol anchors. The 96-card Japanese booster order is useful context, while PMCG1 local ids remain stable catalog keys for the interface.
4. Inspect the lower-right rarity-symbol field third. For active targets, the expected area is blank where later Base prints carry a circle, diamond, or star.
5. Separate absence of rarity from absence of set logo. Base Set also lacks an expansion logo; that is a different fact and should not be confused with No Rarity.
6. Apply the exception wall: local ids `001-096` are active targets; `097-102` basic Energy are caveats. Double Colorless Energy stays active because it is not a basic Energy caveat.
7. Do not accept a crop by itself. Require full front, full back, sharp symbol-region crop, and enough surrounding card border to prove the crop belongs to the same card.
8. Require fresh possession before money moves: nonce photo at minimum, and for high-value cards a short continuity video or staged photo sequence from full card to close-up.
9. Use card-specific tells as supporting pressure, not automatic truth: Venusaur #68, Charizard height/weight text, Raichu Pokédex number, Gastly text, and holo/evolution-box behavior.
10. For Potion, Switch, Gust of Wind, Energy Retrieval, and Pokémon Trader, compare Japanese text layout against a known Expansion Pack exemplar because Quick Starter Gift Set lookalikes can also lack rarity symbols.
11. Check physical authenticity separately: print sharpness, color, fonts, back design, card stock/core, dimensions, corner shape, holo behavior, slab/cert data, and provenance.
12. Keep the conclusion bounded: candidate, possession-supported candidate, verifier-supported No Rarity, or graded/certified No Rarity. Do not collapse those states into one label.

## Identification Pressure Test

Identification is a ladder, not a yes/no switch.

| Gate | Question | Failure Mode | Protocol State |
| --- | --- | --- | --- |
| Scope gate | Is this Japanese Expansion Pack / Base Set, not merely a no-symbol Japanese card? | Gym deck, promo, or later no-symbol card is mislabeled as Base No Rarity. | Out of scope until row family is established. |
| Row gate | Which exact catalog row is being claimed? | Agent overfits from an English API image, nearby card, or modern database row. | Catalog row anchored, not authenticated. |
| Rarity-field gate | Is the lower-right rarity-symbol field visibly blank on the same physical card? | Seller crops away a symbol, glare hides it, or the crop comes from another object. | No Rarity visual candidate. |
| Exception gate | Is the row inside the active target range? | Basic Energy gets marketed as a premium No Rarity hit. | Target accepted or downgraded to Energy caveat. |
| Possession gate | Does the seller possess this card now? | Old auction image, borrowed card, or reference image is reused. | Possession-supported candidate. |
| Physical-authenticity gate | Does the object look like a real 1996 Japanese card? | Counterfeit copies the blank corner but fails print, stock, back, or slab checks. | Verifier or expert review required for high-value trades. |
| Print-run-support gate | Do known card-specific tells support the early-print claim? | Blank-corner claim conflicts with a known correction tell. | Evidence strengthened, weakened, or escalated. |

Pressure cases:

- Only a close crop of the blank corner: ask for full front, full back, and a fresh nonce image that includes the same corner.
- Regular Japanese Base card with glare over the symbol area: ask for a direct sharp crop and an angled-light crop.
- Japanese Gym deck or promo card with no rarity symbol: reject the Base No Rarity claim unless the family and row match Expansion Pack.
- Basic Energy with a blank corner: downgrade to Energy caveat and avoid premium No Rarity language.
- Slab label says No Rarity but images are poor: ask for cert lookup, slab front/back, label close-up, and card surface photos.
- High-value holo passes the blank-corner check: escalate to holo behavior, print quality, card-specific tells, possession continuity, and verifier review.

## Corrections And Tells

Confirmed or strongly documented:

- Bulbapedia notes the No Rarity Venusaur print listed Venusaur as Pokémon #68 instead of #3, later corrected.

Collector-guide prompts:

- Poke Master Center reports No Rarity-specific tells including Charizard height/weight text, Raichu's Pokédex number, and Gastly attack text.
- These are useful inspection prompts, but the protocol should not turn them into automatic proof until the exact physical card is inspected.
- Potion, Switch, Gust of Wind, Energy Retrieval, and Pokémon Trader now carry a Quick Starter Gift Set text-layout trap. This is not a verdict; it is an instruction to keep the no-symbol claim and the Expansion Pack text-layout claim separate until evidence connects them.

## Product Context

Collector guides associate the earliest short 291-yen Japanese booster packs with the plausible No Rarity window, but sealed-product provenance should be treated as probabilistic, not proof of contents. Starter products matter too because basic Energy distribution, Quick Starter trainer lookalikes, early rulebook/box details, and shop-channel context shape how cards entered collections. The December 1996 Gold Gift Box sits close to the origin story, but even collector guides frame No Rarity pulls from sealed early products as possible rather than likely.

## Protocol Implications

- The protocol can anchor the row, preserve evidence, and make claims legible.
- It cannot decide from catalog data alone that a seller's card is a true No Rarity copy.
- The catalog is not the platform authority; it is the agent's No Rarity lens. The agent remains responsible for when and how to contact its human.
- The strongest set-level gate is contact legibility: exact card, blank corner, row identity, possession proof, source weight, and verifier judgment must remain separate but connected.
- Ambiguity should stay visible. If the source is a collector guide, say collector guide. If the source is catalog metadata, say catalog metadata. If the source is the seller's photo, say seller photo.
- Market prices and graded populations move. They belong in timestamped agent calls and receipts, not hard-coded set history.
- The exact switchover date from no-rarity to rarity-symbol copies is not publicly nailed down in this local catalog; store transition claims as source-weighted inference.
- Quick Starter-sensitive trainer labels and population counts need caution because variant recognition and third-party labels can be imperfect.

## Pricing Uncertainty

This card is priceable only after we know whether the evidence supports the No Rarity claim and what condition band it belongs in.

Agent rule: never present a single price without price-state, source trail, condition band, and No Rarity evidence status.

Price states:

- no reliable comp
- thin comps
- usable comps
- strong comps

Comp risks:

- regular Japanese Base mixed into No Rarity comps
- No Rarity claim not visible in listing images
- raw condition described loosely
- slab label or cert not checked
- private sale or best-offer opacity
- stale comp in a volatile card
- venue-specific premium or discount

Human contact triggers:

- funded price is outside likely range
- comps are thin or conflicting
- seller asks for high attention before buyer commitment
- evidence supports candidate status but not condition band
- verifier cost would materially change total price

## Evidence Cost Bridge

The No Rarity catalog now acts as a domain-specific evidence policy layer. It should not move money and it should not authenticate a seller card by itself. It should tell the agent which uncertainty matters, which evidence buys that uncertainty down, and what burden the ask creates.

Cost-field principles:

- Evidence should escalate only when it buys down a named uncertainty.
- Seller attention, handling risk, privacy exposure, time delay, buyer attention, agent compute, verifier cost, fraud resistance, and ambiguity reduction are separate currencies.
- The catalog recommends evidence profiles; the protocol binds which profile was used and which evidence was cited.
- A buyer may ask for more than the profile requires, but the seller's agent can price, reject, or credit-back that extra attention.
- Do not punish low-value honest trades with high-value ceremony. Do not let high-value cards move on low-value evidence.

No Rarity evidence profiles:

| Profile | Applies To | Required Shape | Cost Shape | Still Not Proving |
| --- | --- | --- | --- | --- |
| NR-A Low-value active target | Common or modest non-holo active target from a seller with usable trust. | Full front, full back, symbol crop with border, fresh nonce possession photo. | Low seller attention, low handling risk, no verifier by default. | Professional authenticity, precise grade, full print-run confidence. |
| NR-B Mid-value desirable card | Popular non-holo or desirable row where fraud payoff justifies more seller work. | NR-A plus high-res photos/scans and front/back corner close-ups. | Medium attention and compute, optional verifier. | Slab-grade condition or absence of all alteration. |
| NR-C High-value holo | Charizard, Blastoise, Venusaur, Raichu, Mewtwo, and other high-value holos. | NR-B plus holo video, card-specific tell close-ups, possession continuity, trust proof or bond, verifier review. | High attention, high handling risk, verifier expected. | Legal-grade authenticity without expert custody or future grading outcome. |
| NR-D Slabbed card | Any graded No Rarity claim where the slab is part of the trust story. | Slab front/back, label close-up, cert lookup, card visible through slab, nonce photo with slab. | Medium attention, low handling risk, medium privacy exposure. | That the grader never made a labeling mistake or current market value. |
| NR-E New seller or weak trust | Any claim where seller reputation is thin, unportable, or newly introduced. | Base value-band profile plus seller proof chain or disclosure and bond recommendation. | Medium to high attention, verifier recommended above modest value. | Long-term seller reliability or external reputation ownership without proof. |

This is the bridge from catalog to protocol: the catalog says what profile is appropriate; the agent explains why; the seller can accept, price, or refuse the burden; the protocol records the profile and evidence packet used for the trade.

## Why 96 Targets

The strict Japanese First Expansion Pack booster checklist is treated here as 96 cards. The local 102-row catalog is broader: it includes six basic Energy caveats associated with the simultaneous Starter Pack so agents do not lose the Base-family boundary.

Bulbapedia says the Japanese Expansion Pack is available both with and without rarity symbols and that the no-symbol version is commonly called No Rarity Base Set.

CGC describes the first Japanese Base Set print as lacking a rarity symbol in the bottom-right corner.

Poke Master Center describes 96 cards from the initial Japanese Base Set production as no-rarity-symbol cards, with Energy cards as the exception case.

So the database treats local ids `001-096` as active missing-symbol targets and local ids `097-102` as basic Energy caveats. PMCG1 local ids remain stable protocol anchors; the separate Japanese booster order is stored as product context.

## Source Roles

TCGdex:

- Used for Japanese Expansion Pack row presence and PMCG1 local ids.
- Not treated as print-name truth. The Japanese-name field is retained as raw source data only.

PriceCharting:

- Used for source-labeled No Rarity Symbol reference images where available.
- Current primary coverage is 95 of 96 active No Rarity targets.
- These images are useful for human comparison of the missing-symbol region, but they are not seller possession proof, authenticity proof, or condition proof.

Sports Card Investor:

- Used as a source-labeled cross-check for the No Rarity page language and selected examples.
- In this pass it fills the Pokédex row, where the direct PriceCharting No Rarity page did not resolve cleanly.
- The local builder can use it as a fallback when reachable, but the bulk endpoint may challenge automated local requests.
- These images are still reference images only; they do not authenticate any seller's offered card.

Pokemon TCG API:

- Used for English-name crosswalk metadata only.
- Its images should not appear as reference images on the No Rarity page because they are not the exact Japanese card row.

Collector / grader sources:

- Used to shape the historical No Rarity claim and evidence focus.
- Not treated as transaction proof for any individual seller card.
- Curated example images may be attached when they clearly show a No Rarity example. In this pass, Charizard has CGC and PokeJapan examples.

## Image Rule

The page uses a strict image rule so agents and humans do not overclaim:

1. Source-labeled No Rarity reference image: sourced from PriceCharting or Sports Card Investor when the page/variation explicitly names No Rarity.
2. Marked No Rarity example image: curated collector/grader examples only. These can teach the missing-symbol region, but they still do not prove anything about a seller's offered card.
3. If neither exists, show no reference image.

Do not use English Base Set images, regular Japanese Base / Expansion Pack images with a visible rarity mark, nearby cards, art-only matches, or any other fallback image in the buyer-facing interface.

No Rarity image coverage in this pass:

- 96 of 96 active No Rarity targets have source-labeled No Rarity reference images: 95 PriceCharting rows and 1 Sports Card Investor supplement.
- `097-102` remain basic Energy caveats, not active No Rarity targets.

## Evidence Target

Every active No Rarity target should ask for:

- full front image,
- lower-right rarity-symbol region crop,
- full back image,
- fresh nonce possession image,
- slab label or cert lookup if graded.

The interface should say "No Rarity candidate" until evidence or a scoped verifier supports the claim.

## Collector Texture Rule

Every card row has a short collector-facing note. These notes are allowed to be flavorful and useful for search, but their authority is bounded:

- they may use PMCG1 local id, type, stage, rarity, holo status, artist, attack/ability metadata, and set-order context;
- they may point to familiar collector angles such as starter lines, holo scrutiny, Trainer gameplay memory, or normalization traps;
- they must not prove possession, authenticity, condition, price, or that a seller's physical card is No Rarity.

Collector texture is for attention and interpretation. Evidence remains separate.

## Illustrator Rule

Illustrator is now a first-class metadata object rather than loose copy. Each row records:

- `name`
- `display`
- `source`
- `source_field`
- `source_card_id`
- `source_url`
- `authority`
- `verification_status`
- `not_claiming`

Preference order:

1. Direct Japanese PMCG1 row metadata when TCGdex supplies an `illustrator`.
2. Pokémon TCG API English Base Set `artist` metadata as a crosswalk value.

In the current pass, TCGdex does not expose illustrator values for the Japanese PMCG1 rows checked, so the populated names are crosswalk metadata. That is useful for catalog texture, search, and collector context, but not direct proof of what appears on any seller's physical card. If illustrator becomes dispute-relevant, the agent should inspect the exact card's visible `Illus.` line.

## Information Audit Rule

Every card row now carries an `information_audit` object:

- `verdict`
- `earns_keep`
- `agent_only`
- `disposable_from_primary_ui`
- `recommended_primary_surface`
- `audit_scope`

The goal is to keep the human surface honest and small. The primary card view should earn attention with:

- exact No Rarity reference image,
- card identity and PMCG1 id,
- No Rarity target/caveat,
- one collector texture note,
- illustrator with authority label,
- category, rarity, and holo status,
- type/stage/Pokédex line for Pokémon, Trainer effect identity for Trainers, or caveat status for Energy.

Agent-only fields should remain available for search, provenance, and dispute assembly, but they should not overwhelm the buyer. Disposable fields are not deleted from the database by default; they are marked as disposable from the primary UI so the interface can hide or collapse them without losing auditability.

## Sources

- Bulbapedia Base Set: https://bulbapedia.bulbagarden.net/wiki/Base_Set
- CGC No Rarity Charizard: https://www.cgccards.com/news/article/11258/no-rarity-charizard/
- Poke Master Center Base Set Guide: https://www.pokemastercenter.com/pokemon-base-set-guide/
- PokeJapan No Rarity guide: https://pokejapan.nl/blog/pokemon/wat-zijn-japanse-no-rarity-symbol-pokemon-kaarten
- TCGJapan No Rarity guide: https://tcgjapan.nl/nl/blog/pokemon/wat-zijn-japanse-no-rarity-symbol-pokemon-kaarten
- Bulbapedia Japanese TCG expansions list: https://bulbapedia.bulbagarden.net/wiki/List_of_Japanese_TCG_Expansions
- Bulbapedia Original TCG Era merchandise: https://bulbapedia.bulbagarden.net/wiki/Original_TCG_Era_merchandise
- Bulbapedia Unnumbered Promotional cards: https://bulbapedia.bulbagarden.net/wiki/Unnumbered_Promotional_cards_(TCG)/1996-2005
- Bulbapedia Venusaur Base Set: https://bulbapedia.bulbagarden.net/wiki/Venusaur_(Base_Set_15)
- TCGdex REST API: https://tcgdex.dev/rest
- Pokemon TCG API search docs: https://docs.pokemontcg.io/api-reference/cards/search-cards/
- Sports Card Investor 1996 Japanese Base Set: https://www.sportscardinvestor.com/sets/1996-japanese-base-set-pokemon
- PriceCharting Blastoise No Rarity: https://www.pricecharting.com/game/pokemon-japanese-expansion-pack/blastoise-no-rarity
- PriceCharting Caterpie No Rarity: https://www.pricecharting.com/game/pokemon-japanese-expansion-pack/caterpie-no-rarity
