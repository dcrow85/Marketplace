# Pokemon Card Reference Layer v0.1

Generated 2026-05-20.

The alpha needs database access, but the database must remain a reference layer. It helps an agent locate a known Pokemon print, disambiguate set/number/language/variant, and show a clean comparison image. It does not prove possession, condition, authenticity, price truth, or successful shipment.

## Purpose

The reference layer answers:

- Is this a known Pokemon card or a plausible manual database gap?
- Which print, set, card number, language, rarity, and variant is being discussed?
- What catalog image should the human and agents compare against seller evidence?
- Which source supplied the row, when was it fetched, and what does that source not cover?

The reference layer must not answer:

- Does the seller possess this physical card?
- Is the card authentic?
- Is the card in the claimed condition?
- Is the seller's language/edition claim true?
- Is the price fair enough to spend funds?
- Did the shipped item match the committed item?

## Alpha Sources

Primary source candidate: Pokemon TCG API.

- Good for English card catalog lookup, set metadata, card numbers, images, and TCGplayer/Cardmarket references when available.
- Current docs expose `GET https://api.pokemontcg.io/v2/cards` for card search.
- API keys are supported through the `X-Api-Key` header; unauthenticated requests work with reduced limits.
- Docs: https://docs.pokemontcg.io/

Secondary source candidate: TCGdex.

- Good for multilingual lookup and variant details.
- Current REST docs expose card listing at `https://api.tcgdex.net/v2/{language}/cards` and single card lookup at `https://api.tcgdex.net/v2/{language}/cards/{id}`.
- Coverage varies by language and era, so a missing row is not proof that the card is invalid.
- Docs: https://tcgdex.dev/rest

Alpha rule: source rows are useful, but source coverage is itself evidence. If Japanese vintage coverage is incomplete, the packet must say so rather than pretending the lookup failed the object.

## No Rarity Path

No Rarity Base Set should be treated as a historically important variant overlay, not as a normal catalog row.

Best path for alpha:

- anchor the card class with Pokemon TCG API when an English reference image is useful,
- anchor the Japanese object class with TCGdex when the Japanese Expansion Pack row exists, for example `PMCG1`,
- attach a local `NoRarityBaseSetVariantClaim` that says the claimed variant is the missing rarity symbol print,
- require seller evidence for the actual variant claim: full front, lower-right symbol crop, back, fresh nonce possession, and slab/cert proof when graded,
- keep the agent language to "No Rarity candidate" until scoped evidence or a verifier supports the claim.

This keeps the database honest. A source can say "this is a Japanese Expansion Pack Charizard row"; it should not be asked to say "this seller's physical card is a No Rarity Charizard."

## CardReferenceCandidate Packet

```text
schema: marketplace.pokemon_card_reference.v0.1
trade_id:
domain: tcg
game: pokemon
source:
source_card_id:
source_url:
source_language:
printed_name:
set_name:
card_number:
rarity:
variant:
catalog_image_url:
match_kind: exact_catalog_match | language_equivalent | manual_database_gap
source_coverage:
selected_by:
fetched_at:
not_claiming:
  - possession
  - condition
  - authenticity
  - seller_inventory_existence
  - seller_card_language
  - price_truth
```

Manual database-gap packets additionally require:

```text
manual_reference_reason:
human_or_agent_note:
supporting_links_or_images:
buyer_acknowledgement_required: true
```

Variant overlay packets additionally require:

```text
schema: marketplace.pokemon_variant_claim.v0.1
variant_profile: no_rarity_base_set
base_reference_packet_hash:
claimed_set_id: PMCG1
claimed_missing_feature: rarity_symbol
evidence_requirements:
  - full_front
  - lower_right_symbol_region_crop
  - full_back
  - fresh_nonce_possession
  - slab_label_or_cert_if_graded
not_claiming:
  - possession
  - authenticity
  - condition
```

## Wall

`CardReferenceCandidate` is now a Pokemon alpha wall.

Hard block:

- no `card_reference_packet`,
- missing source, set, number, name, language, source URL, match kind, selected-by, or not-claiming fields,
- database-backed packet has no external card id,
- reference source silently implies physical truth.

Waiver required:

- manual database gap,
- catalog source is known incomplete for the claimed language/era,
- source row is a language equivalent rather than the exact claimed print.

Pass:

- the reference candidate is scoped, source-attributed, and carries the non-claims.

## Agent Behavior

Buyer agent:

- use the database to narrow identity and catch impossible or ambiguous card claims,
- show the human the catalog match and the seller's evidence separately,
- ask for seller evidence when a language/edition/variant claim is not directly covered by the database source,
- never say "verified" when the correct word is "catalog matched."

Seller agent:

- help the seller select the likely catalog row,
- preserve manual reference gaps for Japanese vintage or unusual promos,
- reuse the catalog row across offers but bind physical evidence to this trade only.

Verifier or arbiter agent:

- use the reference row as the taxonomy anchor,
- judge seller photos, nonce possession, slab certs, condition, route evidence, and claims independently.

## API Shape

```text
lookupCardReference(query, language_preferences, source_preferences)
selectCardReferenceCandidate(intent, seller_claim, candidates)
createManualCardReferenceGap(claim, supporting_links_or_images, reason)
compareSellerEvidenceToReference(candidate, evidence_manifest)
```

These actions return `CardReferenceCandidate`, not item proof.

## Alpha UI Language

Use:

> Catalog candidate: Espeon, Neo Discovery, #1, Rare Holo.

Avoid:

> Verified card.

Use:

> Not proof of possession, condition, authenticity, or language claim.

Avoid:

> Trusted listing.

## Implementation Notes

The local harness includes `card_reference_packet` in the Pokemon alpha acceptance profile. The packet is part of assembly placement, but it is spendable only as a catalog candidate. It cannot move funds or lock route without fingerprint, inventory lock, evidence profile, bond scope, route risk owner, arbiter policy, and route spendability.

The active alpha server now includes a Pokemon TCG API contact layer:

```text
GET /api/catalog/search?q=Neo%20Discovery%20Espeon&pageSize=8
GET /api/catalog/agent-search?q=old%20Espeon%20holo&pageSize=12&page=1
GET /api/catalog/cards/neo2-1
```

Each response returns normalized card rows, color catalog image URLs, source price references when available, and an `ExternalContactReceipt`. The receipt records that the API was contacted or a cached API result was used. It does not promote the catalog row into possession, authenticity, condition, price fairness, or shipment truth.

`agent-search` adds a small catalog agent that translates human phrases into Pokemon TCG API fields. For example, `Base Set Charizard #4 1999 holo` becomes `name:"Charizard" set.name:"Base" set.releaseDate:1999* number:4 rarity:*Holo*`. The agent read is a query plan, not a verification statement.

`/api/alpha/trade` also attaches the fixture card reference (`neo2-1`) and a catalog contact packet so the UI can show the source image beside seller evidence.
