# Qwen No Rarity Collector Simulation: qwen_no_rarity_collectors_20260608T163908Z

- Generated: `2026-06-08T16:41:05.970387+00:00`
- Model: `/Users/che/models/mlx/Qwen3.6-35B-A3B-4bit`
- Catalog schema: `marketplace.no_rarity_base_set.v0.6`
- Set: `Japanese No Rarity Base Set`
- Overall pass: `True`

## Scoreboard

| Collector | Archetype | Offers seen | Pursue | Requests/Human | Reject | Pass |
|---|---|---:|---:|---:|---:|---|
| Mika | binder completionist | 1 | 0 | 1 | 0 | `True` |
| Rowan | high-value holo hunter | 2 | 1 | 1 | 0 | `True` |
| Sora | print-run tell and variant trap specialist | 3 | 0 | 3 | 0 | `True` |
| Jun | illustrator and character-feel collector | 7 | 1 | 5 | 1 | `True` |
| Avery | collector-seller with duplicates | 2 | 1 | 1 | 0 | `True` |
| Theo | slab-first investor | 1 | 1 | 0 | 0 | `True` |

## Interpretation

This run treats the No Rarity binder as an agent lens. Different collectors produce different wants, evidence costs, and human-contact thresholds, while the deterministic evaluator keeps active targets, caveat rows, evidence profiles, Quick Starter traps, and high-value holo requirements legible.

## Mika - binder completionist

- Style: wants the binder to fill in quietly; prefers lots and low seller attention
- Budget: `$450` total, `$45` per card aperture
- Attention tolerance: `low`
- Human contact threshold: only if a lot is unusually good or evidence cost exceeds card value
- Movement violations: `0`
- Language overclaims: `0`

### Deterministic Offer Read

- `shop_low_value_lot_A` (PMCG1-002, PMCG1-007, PMCG1-012, PMCG1-031, PMCG1-037, PMCG1-059, `$128`): `request_evidence` - offer provides NR-A but cards require NR-B

### Qwen Collector Agent

```json
{
  "_raw": "{\n  \"collector_read\": \"Mika wants to fill the binder quietly and efficiently, prioritizing lots that minimize seller attention and cost while maintaining a medium risk tolerance for non-holo commons and rares.\",\n  \"top_wants\": [\n    {\n      \"id\": \"PMCG1-012\",\n      \"name_en\": \"Beedrill\",\n      \"profile\": \"NR-B\",\n      \"reason\": \"Mid-value desirable card; requires higher evidence standards than the current lot provides.\"\n    },\n    {\n      \"id\": \"PMCG1-002\",\n      \"name_en\": \"Caterpie\",\n      \"profile\": \"NR-A\",\n      \"reason\": \"Low-value active target; completes the base set narrative.\"\n    },\n    {\n      \"id\": \"PMCG1-031\",\n      \"name_en\": \"Magikarp\",\n      \"profile\": \"NR-A\",\n      \"reason\": \"Low-value active target; essential for the Gyarados pairing timing.\"\n    },\n    {\n      \"id\": \"PMCG1-059\",\n      \"name_en\": \"Pidgey\",\n      \"profile\": \"NR-A\",\n      \"reason\": \"Low-value active target; completes the Base page without which the binder feels incomplete.\"\n    }\n  ],\n  \"pursue_now\": [],\n  \"request_evidence\": [\n    {\n      \"offer_id\": \"shop_low_value_lot_A\",\n      \"action\": \"request_evidence\",\n      \"reason\": \"The offer provides NR-A evidence, but PMCG1-012 (Beedrill) requires NR-B evidence (front/back scans, corner close-ups).\",\n      \"required_evidence\": [\n        \"full front and full back images for PMCG1-012\",\n        \"sharp lower-right rarity-symbol crop with surrounding border for all cards\",\n        \"front and back corner close-ups for PMCG1-012\",\n        \"fresh nonce possession image\"\n      ]\n    }\n  ],\n  \"reject_or_ignore\": [\n    {\n      \"offer_id\": \"shop_low_value_lot_A\",\n      \"reason\": \"Evidence profile (NR-A) is insufficient for PMCG1-012 (NR-B); protocol requires upgraded evidence before admissibility.\"\n    }\n  ],\n  \"sell_stances\": [],\n  \"human_questions\": [\n    \"Do you accept the risk of purchasing this lot without upgraded evidence for Beedrill, or should we wait for a lot with NR-B evidence for that card?\"\n  ],\n  \"agent_to_agent_messages\": [\n    {\n      \"target\": \"gate\",\n      \"message\": \"Offer shop_low_value_lot_A presents NR-A evidence. PMCG1-012 requires NR-B. Protocol gate must enforce evidence upgrade or reject admissibility.\"\n    }\n  ],\n  \"what_catalog_knows\": [\n    \"The catalog anchors PMCG1 rows, evidence profiles, collector texture, and active/caveat status.\",\n    \"The catalog identifies PMCG1-012 as NR-B (Mid-value desirable) and others as NR-A (Low-value active target).\",\n    \"The catalog records the offer's evidence profile as NR-A and the seller's trust as portable_shop_proof.\"\n  ],\n  \"what_remains_judgment\": [\n    \"The catalog does not prove seller possession, authenticity, true condition, No Rarity truth, delivery, or price truth.\",\n    \"The protocol gate decides admissibility based on packets, hashes, signatures, and explicit risk ownership, not physical fact.\",\n    \"Evidence can be useful without being spendable; the deterministic API determines if the wall blocks or requires waiver.\"\n  ]\n}",
  "agent_to_agent_messages": [
    {
      "message": "Offer shop_low_value_lot_A presents NR-A evidence. PMCG1-012 requires NR-B. Protocol gate must enforce evidence upgrade or reject admissibility.",
      "target": "gate"
    }
  ],
  "collector_read": "Mika wants to fill the binder quietly and efficiently, prioritizing lots that minimize seller attention and cost while maintaining a medium risk tolerance for non-holo commons and rares.",
  "human_questions": [
    "Do you accept the risk of purchasing this lot without upgraded evidence for Beedrill, or should we wait for a lot with NR-B evidence for that card?"
  ],
  "pursue_now": [],
  "reject_or_ignore": [
    {
      "offer_id": "shop_low_value_lot_A",
      "reason": "Evidence profile (NR-A) is insufficient for PMCG1-012 (NR-B); protocol requires upgraded evidence before admissibility."
    }
  ],
  "request_evidence": [
    {
      "action": "request_evidence",
      "offer_id": "shop_low_value_lot_A",
      "reason": "The offer provides NR-A evidence, but PMCG1-012 (Beedrill) requires NR-B evidence (front/back scans, corner close-ups).",
      "required_evidence": [
        "full front and full back images for PMCG1-012",
        "sharp lower-right rarity-symbol crop with surrounding border for all cards",
        "front and back corner close-ups for PMCG1-012",
        "fresh nonce possession image"
      ]
    }
  ],
  "sell_stances": [],
  "top_wants": [
    {
      "id": "PMCG1-012",
      "name_en": "Beedrill",
      "profile": "NR-B",
      "reason": "Mid-value desirable card; requires higher evidence standards than the current lot provides."
    },
    {
      "id": "PMCG1-002",
      "name_en": "Caterpie",
      "profile": "NR-A",
      "reason": "Low-value active target; completes the base set narrative."
    },
    {
      "id": "PMCG1-031",
      "name_en": "Magikarp",
      "profile": "NR-A",
      "reason": "Low-value active target; essential for the Gyarados pairing timing."
    },
    {
      "id": "PMCG1-059",
      "name_en": "Pidgey",
      "profile": "NR-A",
      "reason": "Low-value active target; completes the Base page without which the binder feels incomplete."
    }
  ],
  "what_catalog_knows": [
    "The catalog anchors PMCG1 rows, evidence profiles, collector texture, and active/caveat status.",
    "The catalog identifies PMCG1-012 as NR-B (Mid-value desirable) and others as NR-A (Low-value active target).",
    "The catalog records the offer's evidence profile as NR-A and the seller's trust as portable_shop_proof."
  ],
  "what_remains_judgment": [
    "The catalog does not prove seller possession, authenticity, true condition, No Rarity truth, delivery, or price truth.",
    "The protocol gate decides admissibility based on packets, hashes, signatures, and explicit risk ownership, not physical fact.",
    "Evidence can be useful without being spendable; the deterministic API determines if the wall blocks or requires waiver."
  ]
}
```

## Rowan - high-value holo hunter

- Style: happy to wait; wants the right copy, not a fast copy
- Budget: `$6500` total, `$3500` per card aperture
- Attention tolerance: `high`
- Human contact threshold: any high-value holo, verifier choice, bond gap, or price uncertainty
- Movement violations: `0`
- Language overclaims: `0`

### Deterministic Offer Read

- `new_seller_charizard_crop` (PMCG1-021, `$4200`): `human_review` - offer provides NR-A but cards require NR-C; high-value holo lacks verifier availability; seller trust is thin or unportable
- `known_collector_slab_raichu` (PMCG1-038, `$1850`): `pursue` - within collector aperture; catalog target is active; evidence shape matches current ask

### Qwen Collector Agent

```json
{
  "_raw": "{\n  \"collector_read\": \"Rowan is a high-value holo hunter with low risk tolerance and high attention, prioritizing evidence quality over speed for PMCG1 holos.\",\n  \"top_wants\": [\n    {\n      \"id\": \"PMCG1-021\",\n      \"name\": \"Charizard\",\n      \"priority\": \"critical\",\n      \"reason\": \"High-value holo target requiring NR-C evidence; current offer is NR-A.\"\n    },\n    {\n      \"id\": \"PMCG1-038\",\n      \"name\": \"Raichu\",\n      \"priority\": \"high\",\n      \"reason\": \"Active catalog target with matching evidence profile (NR-D) and portable trust.\"\n    },\n    {\n      \"id\": \"PMCG1-032\",\n      \"name\": \"Blastoise\",\n      \"priority\": \"medium\",\n      \"reason\": \"High-value holo target; no current offer evaluated.\"\n    },\n    {\n      \"id\": \"PMCG1-068\",\n      \"name\": \"Chansey\",\n      \"priority\": \"medium\",\n      \"reason\": \"High-value holo target; no current offer evaluated.\"\n    }\n  ],\n  \"pursue_now\": [\n    {\n      \"offer_id\": \"known_collector_slab_raichu\",\n      \"card_id\": \"PMCG1-038\",\n      \"action\": \"proceed_to_funding\",\n      \"reason\": \"Evidence profile (NR-D) meets or exceeds target (NR-C), seller trust is portable, and verifier is available.\"\n    }\n  ],\n  \"request_evidence\": [\n    {\n      \"offer_id\": \"new_seller_charizard_crop\",\n      \"card_id\": \"PMCG1-021\",\n      \"required_evidence\": [\n        \"full front and full back images\",\n        \"sharp lower-right rarity-symbol crop with surrounding border\",\n        \"front and back high-resolution scans or photos\",\n        \"four-corner front close-ups\",\n        \"four-corner back close-ups\",\n        \"angled holo-surface video\"\n      ],\n      \"reason\": \"Current offer is NR-A; target requires NR-C. Protocol requires upgraded evidence packet before human review.\"\n    }\n  ],\n  \"reject_or_ignore\": [],\n  \"sell_stances\": [],\n  \"human_questions\": [\n    \"Do you accept the Raichu slab offer immediately given the portable trust and verifier availability?\",\n    \"For Charizard, do you want to wait for the upgraded NR-C evidence packet, or is the current NR-A offer insufficient for your risk tolerance?\",\n    \"Are there specific correction prompt checks for Charizard (height/weight text) you want applied before upgrading evidence?\"\n  ],\n  \"agent_to_agent_messages\": [\n    \"Charizard offer (new_seller_charizard_crop) fails NR-C baseline; requires evidence upgrade packet.\",\n    \"Raichu offer (known_collector_slab_raichu) passes NR-C baseline; protocol presents valid packet for pursuit.\",\n    \"No offers exist for PMCG1-032 or PMCG1-068; catalog remains empty for these IDs.\"\n  ],\n  \"what_catalog_knows\": [\n    \"PMCG1-021 (Charizard) has an offer with NR-A evidence, insufficient for NR-C target.\",\n    \"PMCG1-038 (Raichu) has an offer with NR-D evidence, sufficient for NR-C target.\",\n    \"PMCG1-032 (Blastoise) and PMCG1-068 (Chansey) have no active offers in the current lens.\"\n  ],\n  \"what_remains_judgment\": [\n    \"Authenticity, true condition, and seller possession of Charizard remain unproven until upgraded evidence is presented and verified.\",\n    \"Price truth for Charizard remains unproven until the evidence profile matches the NR-C requirement.\",\n    \"Delivery success for Raichu remains unproven until the protocol gate executes the transfer.\"\n  ]\n}",
  "agent_to_agent_messages": [
    "Charizard offer (new_seller_charizard_crop) fails NR-C baseline; requires evidence upgrade packet.",
    "Raichu offer (known_collector_slab_raichu) passes NR-C baseline; protocol presents valid packet for pursuit.",
    "No offers exist for PMCG1-032 or PMCG1-068; catalog remains empty for these IDs."
  ],
  "collector_read": "Rowan is a high-value holo hunter with low risk tolerance and high attention, prioritizing evidence quality over speed for PMCG1 holos.",
  "human_questions": [
    "Do you accept the Raichu slab offer immediately given the portable trust and verifier availability?",
    "For Charizard, do you want to wait for the upgraded NR-C evidence packet, or is the current NR-A offer insufficient for your risk tolerance?",
    "Are there specific correction prompt checks for Charizard (height/weight text) you want applied before upgrading evidence?"
  ],
  "pursue_now": [
    {
      "action": "proceed_to_funding",
      "card_id": "PMCG1-038",
      "offer_id": "known_collector_slab_raichu",
      "reason": "Evidence profile (NR-D) meets or exceeds target (NR-C), seller trust is portable, and verifier is available."
    }
  ],
  "reject_or_ignore": [],
  "request_evidence": [
    {
      "card_id": "PMCG1-021",
      "offer_id": "new_seller_charizard_crop",
      "reason": "Current offer is NR-A; target requires NR-C. Protocol requires upgraded evidence packet before human review.",
      "required_evidence": [
        "full front and full back images",
        "sharp lower-right rarity-symbol crop with surrounding border",
        "front and back high-resolution scans or photos",
        "four-corner front close-ups",
        "four-corner back close-ups",
        "angled holo-surface video"
      ]
    }
  ],
  "sell_stances": [],
  "top_wants": [
    {
      "id": "PMCG1-021",
      "name": "Charizard",
      "priority": "critical",
      "reason": "High-value holo target requiring NR-C evidence; current offer is NR-A."
    },
    {
      "id": "PMCG1-038",
      "name": "Raichu",
      "priority": "high",
      "reason": "Active catalog target with matching evidence profile (NR-D) and portable trust."
    },
    {
      "id": "PMCG1-032",
      "name": "Blastoise",
      "priority": "medium",
      "reason": "High-value holo target; no current offer evaluated."
    },
    {
      "id": "PMCG1-068",
      "name": "Chansey",
      "priority": "medium",
      "reason": "High-value holo target; no current offer evaluated."
    }
  ],
  "what_catalog_knows": [
    "PMCG1-021 (Charizard) has an offer with NR-A evidence, insufficient for NR-C target.",
    "PMCG1-038 (Raichu) has an offer with NR-D evidence, sufficient for NR-C target.",
    "PMCG1-032 (Blastoise) and PMCG1-068 (Chansey) have no active offers in the current lens."
  ],
  "what_remains_judgment": [
    "Authenticity, true condition, and seller possession of Charizard remain unproven until upgraded evidence is presented and verified.",
    "Price truth for Charizard remains unproven until the evidence profile matches the NR-C requirement.",
    "Delivery success for Raichu remains unproven until the protocol gate executes the transfer."
  ]
}
```

## Sora - print-run tell and variant trap specialist

- Style: likes weird evidence details; wants agents to preserve ambiguity
- Budget: `$1200` total, `$650` per card aperture
- Attention tolerance: `medium`
- Human contact threshold: when a card-specific tell or Quick Starter text-layout issue appears
- Movement violations: `0`
- Language overclaims: `0`

### Deterministic Offer Read

- `known_collector_slab_raichu` (PMCG1-038, `$1850`): `human_review` - price exceeds collector's normal budget aperture
- `trainer_text_trap_lot` (PMCG1-072, PMCG1-073, PMCG1-076, PMCG1-093, `$190`): `request_evidence` - Quick Starter-sensitive trainer needs text-layout proof
- `local_venusaur_verified` (PMCG1-011, `$980`): `human_review` - price exceeds collector's normal budget aperture; seller attention cost exceeds collector's preferred friction

### Qwen Collector Agent

```json
{
  "_raw": "{\n  \"collector_read\": \"Sora seeks tell-specific anomalies and text-layout traps within the Japanese No Rarity binder, prioritizing evidence of variant origins over generic authenticity claims.\",\n  \"top_wants\": [\n    \"PMCG1-011 (Venusaur): High-value holo; requires Pokédex #68 verification and holo-surface video.\",\n    \"PMCG1-038 (Raichu): High-value holo; requires Pokédex number check against correction prompts.\",\n    \"PMCG1-072 (Gust of Wind): Trainer; requires text-layout comparison against Expansion Pack exemplar.\",\n    \"PMCG1-076 (Energy Retrieval): Trainer; requires text-layout comparison against Expansion Pack exemplar.\"\n  ],\n  \"pursue_now\": [\n    {\n      \"card_id\": \"PMCG1-011\",\n      \"action\": \"negotiate\",\n      \"reason\": \"Local pickup possible; negotiate attention fee or credit-back to fit budget.\"\n    },\n    {\n      \"card_id\": \"PMCG1-072\",\n      \"action\": \"request_evidence\",\n      \"reason\": \"Missing text-layout proof for Quick Starter claim; request full front image with readable Japanese text.\"\n    },\n    {\n      \"card_id\": \"PMCG1-076\",\n      \"action\": \"request_evidence\",\n      \"reason\": \"Missing text-layout proof for Quick Starter claim; request text-area close-up for line breaks.\"\n    }\n  ],\n  \"request_evidence\": [\n    {\n      \"card_id\": \"PMCG1-093\",\n      \"request\": \"Full front image with readable Japanese text and lower-right rarity-symbol crop.\"\n    },\n    {\n      \"card_id\": \"PMCG1-038\",\n      \"request\": \"Full front/back images and sharp lower-right rarity-symbol crop; verify Pokédex number.\"\n    },\n    {\n      \"card_id\": \"PMCG1-011\",\n      \"request\": \"Angled holo-surface video and Pokédex #68 check.\"\n    }\n  ],\n  \"reject_or_ignore\": [\n    {\n      \"card_id\": \"PMCG1-038\",\n      \"reason\": \"Ask $1850 exceeds budget; slabbed format adds friction without sufficient tell-value.\"\n    },\n    {\n      \"card_id\": \"PMCG1-072\",\n      \"reason\": \"Lot lacks text-layout proof; risk of non-Expansion Pack lookalike is too high for current trust.\"\n    },\n    {\n      \"card_id\": \"PMCG1-076\",\n      \"reason\": \"Lot lacks text-layout proof; risk of non-Expansion Pack lookalike is too high for current trust.\"\n    }\n  ],\n  \"sell_stances\": [],\n  \"human_questions\": [\n    \"Should I accept the local pickup option for Venusaur if the seller waives the attention fee?\",\n    \"Do you have a known Expansion Pack exemplar image to compare against the Quick Starter trainers?\",\n    \"Is the Pokédex #68 on the Venusaur a confirmed correction or a known error variant?\"\n  ],\n  \"agent_to_agent_messages\": [\n    \"Protocol requires text-layout evidence for PMCG1-072/076/093 to validate Quick Starter origin; without it, the 'no-symbol' claim is ambiguous.\",\n    \"Protocol presents holo-video for PMCG1-011 to assess surface condition; slab data for PMCG1-038 is insufficient for tell verification.\",\n    \"Catalog anchors PMCG1-011/038 as high-scrutiny targets; deterministic API flags price as exceeding budget aperture.\"\n  ],\n  \"what_catalog_knows\": [\n    \"Catalog anchors PMCG1 rows, evidence profiles, and active/caveat status.\",\n    \"Catalog identifies PMCG1-072/076/093 as Quick Starter-sensitive with text-layout traps.\",\n    \"Catalog identifies PMCG1-011/038 as high-value holos with Pokédex number tells.\"\n  ],\n  \"what_remains_judgment\": [\n    \"Seller possession, authenticity, true condition, and No Rarity truth are not proven by the catalog or slab data alone.\",\n    \"Price truth and human satisfaction are not enforced by the protocol gates.\",\n    \"The 'no-symbol' claim for trainers remains unverified without specific text-layout comparison.\"\n  ]\n}",
  "agent_to_agent_messages": [
    "Protocol requires text-layout evidence for PMCG1-072/076/093 to validate Quick Starter origin; without it, the 'no-symbol' claim is ambiguous.",
    "Protocol presents holo-video for PMCG1-011 to assess surface condition; slab data for PMCG1-038 is insufficient for tell verification.",
    "Catalog anchors PMCG1-011/038 as high-scrutiny targets; deterministic API flags price as exceeding budget aperture."
  ],
  "collector_read": "Sora seeks tell-specific anomalies and text-layout traps within the Japanese No Rarity binder, prioritizing evidence of variant origins over generic authenticity claims.",
  "human_questions": [
    "Should I accept the local pickup option for Venusaur if the seller waives the attention fee?",
    "Do you have a known Expansion Pack exemplar image to compare against the Quick Starter trainers?",
    "Is the Pokédex #68 on the Venusaur a confirmed correction or a known error variant?"
  ],
  "pursue_now": [
    {
      "action": "negotiate",
      "card_id": "PMCG1-011",
      "reason": "Local pickup possible; negotiate attention fee or credit-back to fit budget."
    },
    {
      "action": "request_evidence",
      "card_id": "PMCG1-072",
      "reason": "Missing text-layout proof for Quick Starter claim; request full front image with readable Japanese text."
    },
    {
      "action": "request_evidence",
      "card_id": "PMCG1-076",
      "reason": "Missing text-layout proof for Quick Starter claim; request text-area close-up for line breaks."
    }
  ],
  "reject_or_ignore": [
    {
      "card_id": "PMCG1-038",
      "reason": "Ask $1850 exceeds budget; slabbed format adds friction without sufficient tell-value."
    },
    {
      "card_id": "PMCG1-072",
      "reason": "Lot lacks text-layout proof; risk of non-Expansion Pack lookalike is too high for current trust."
    },
    {
      "card_id": "PMCG1-076",
      "reason": "Lot lacks text-layout proof; risk of non-Expansion Pack lookalike is too high for current trust."
    }
  ],
  "request_evidence": [
    {
      "card_id": "PMCG1-093",
      "request": "Full front image with readable Japanese text and lower-right rarity-symbol crop."
    },
    {
      "card_id": "PMCG1-038",
      "request": "Full front/back images and sharp lower-right rarity-symbol crop; verify Pokédex number."
    },
    {
      "card_id": "PMCG1-011",
      "request": "Angled holo-surface video and Pokédex #68 check."
    }
  ],
  "sell_stances": [],
  "top_wants": [
    "PMCG1-011 (Venusaur): High-value holo; requires Pokédex #68 verification and holo-surface video.",
    "PMCG1-038 (Raichu): High-value holo; requires Pokédex number check against correction prompts.",
    "PMCG1-072 (Gust of Wind): Trainer; requires text-layout comparison against Expansion Pack exemplar.",
    "PMCG1-076 (Energy Retrieval): Trainer; requires text-layout comparison against Expansion Pack exemplar."
  ],
  "what_catalog_knows": [
    "Catalog anchors PMCG1 rows, evidence profiles, and active/caveat status.",
    "Catalog identifies PMCG1-072/076/093 as Quick Starter-sensitive with text-layout traps.",
    "Catalog identifies PMCG1-011/038 as high-value holos with Pokédex number tells."
  ],
  "what_remains_judgment": [
    "Seller possession, authenticity, true condition, and No Rarity truth are not proven by the catalog or slab data alone.",
    "Price truth and human satisfaction are not enforced by the protocol gates.",
    "The 'no-symbol' claim for trainers remains unverified without specific text-layout comparison."
  ]
}
```

## Jun - illustrator and character-feel collector

- Style: buys cards that feel alive; evidence should not crush the charm
- Budget: `$800` total, `$160` per card aperture
- Attention tolerance: `medium`
- Human contact threshold: only if a card is above budget or the agent sees a beautiful copy
- Movement violations: `0`
- Language overclaims: `0`

### Deterministic Offer Read

- `shop_low_value_lot_A` (PMCG1-002, PMCG1-007, PMCG1-012, PMCG1-031, PMCG1-037, PMCG1-059, `$128`): `request_evidence` - offer provides NR-A but cards require NR-B
- `new_seller_charizard_crop` (PMCG1-021, `$4200`): `human_review` - price exceeds collector's normal budget aperture; offer provides NR-A but cards require NR-C; high-value holo lacks verifier availability; seller trust is thin or unportable
- `known_collector_slab_raichu` (PMCG1-038, `$1850`): `human_review` - price exceeds collector's normal budget aperture
- `trainer_text_trap_lot` (PMCG1-072, PMCG1-073, PMCG1-076, PMCG1-093, `$190`): `request_evidence` - Quick Starter-sensitive trainer needs text-layout proof
- `local_venusaur_verified` (PMCG1-011, `$980`): `human_review` - price exceeds collector's normal budget aperture; seller attention cost exceeds collector's preferred friction
- `premium_basic_energy_mislabel` (PMCG1-098, `$65`): `reject` - PMCG1-098 is a caveat row, not an active No Rarity target
- `double_colorless_clean` (PMCG1-096, `$82`): `pursue` - within collector aperture; catalog target is active; evidence shape matches current ask

### Qwen Collector Agent

```json
{
  "_raw": "{\n  \"collector_read\": \"Jun seeks cards that feel alive and captures the 'tiny and vulnerable' or 'teenage meaner' character of the set, prioritizing charm over high-ceremony authentication.\",\n  \"top_wants\": [\n    {\n      \"id\": \"PMCG1-014\",\n      \"name\": \"Charmander\",\n      \"profile\": \"NR-B\",\n      \"note\": \"Small flame anxiety in cardboard form.\"\n    },\n    {\n      \"id\": \"PMCG1-017\",\n      \"name\": \"Charmeleon\",\n      \"profile\": \"NR-B\",\n      \"note\": \"Teenage middle of the line: sharper, meaner, not yet Charizard.\"\n    },\n    {\n      \"id\": \"PMCG1-023\",\n      \"name\": \"Squirtle\",\n      \"profile\": \"NR-B\",\n      \"note\": \"Round, mischievous, and impossible not to like.\"\n    },\n    {\n      \"id\": \"PMCG1-067\",\n      \"name\": \"Clefairy\",\n      \"profile\": \"NR-C\",\n      \"note\": \"Moonlit and soft, but the holo makes it serious.\"\n    }\n  ],\n  \"pursue_now\": [\n    {\n      \"offer_id\": \"double_colorless_clean\",\n      \"card_id\": \"PMCG1-096\",\n      \"reason\": \"Active special Energy target within budget; evidence shape matches ask.\"\n    }\n  ],\n  \"request_evidence\": [\n    {\n      \"offer_id\": \"shop_low_value_lot_A\",\n      \"card_ids\": [\n        \"PMCG1-002\",\n        \"PMCG1-007\",\n        \"PMCG1-012\",\n        \"PMCG1-031\",\n        \"PMCG1-037\",\n        \"PMCG1-059\"\n      ],\n      \"reason\": \"Offer provides NR-A but cards require NR-B; protocol requires upgrade to baseline profile.\"\n    },\n    {\n      \"offer_id\": \"trainer_text_trap_lot\",\n      \"card_ids\": [\n        \"PMCG1-072\",\n        \"PMCG1-073\",\n        \"PMCG1-076\",\n        \"PMCG1-093\"\n      ],\n      \"reason\": \"Quick Starter-sensitive trainers need text-layout proof against Expansion Pack exemplar.\"\n    }\n  ],\n  \"reject_or_ignore\": [\n    {\n      \"offer_id\": \"premium_basic_energy_mislabel\",\n      \"card_id\": \"PMCG1-098\",\n      \"reason\": \"Caveat row marketed as premium No Rarity; protocol requires rejecting premium language for basic Energy caveats.\"\n    }\n  ],\n  \"sell_stances\": [],\n  \"human_questions\": [\n    {\n      \"offer_id\": \"new_seller_charizard_crop\",\n      \"card_id\": \"PMCG1-021\",\n      \"question\": \"Price exceeds budget and evidence is weak; do you want to add a verifier or local inspection before funding?\"\n    },\n    {\n      \"offer_id\": \"known_collector_slab_raichu\",\n      \"card_id\": \"PMCG1-038\",\n      \"question\": \"Price exceeds budget; do you want to proceed with this graded slab given the portable prior receipts?\"\n    },\n    {\n      \"offer_id\": \"local_venusaur_verified\",\n      \"card_id\": \"PMCG1-011\",\n      \"question\": \"Price exceeds budget and attention cost is high; do you want to negotiate an attention fee or credit-back?\"\n    }\n  ],\n  \"agent_to_agent_messages\": [\n    \"The protocol requires presenting a packet for the low-value lot (shop_low_value_lot_A) to upgrade evidence from NR-A to NR-B.\"\n  ],\n  \"what_catalog_knows\": [\n    \"The catalog anchors PMCG1 rows, evidence profiles, collector texture, and active/caveat status.\"\n  ],\n  \"what_remains_judgment\": [\n    \"The catalog cannot prove seller possession, authenticity, true condition, No Rarity truth, delivery, or price truth.\"\n  ]\n}",
  "agent_to_agent_messages": [
    "The protocol requires presenting a packet for the low-value lot (shop_low_value_lot_A) to upgrade evidence from NR-A to NR-B."
  ],
  "collector_read": "Jun seeks cards that feel alive and captures the 'tiny and vulnerable' or 'teenage meaner' character of the set, prioritizing charm over high-ceremony authentication.",
  "human_questions": [
    {
      "card_id": "PMCG1-021",
      "offer_id": "new_seller_charizard_crop",
      "question": "Price exceeds budget and evidence is weak; do you want to add a verifier or local inspection before funding?"
    },
    {
      "card_id": "PMCG1-038",
      "offer_id": "known_collector_slab_raichu",
      "question": "Price exceeds budget; do you want to proceed with this graded slab given the portable prior receipts?"
    },
    {
      "card_id": "PMCG1-011",
      "offer_id": "local_venusaur_verified",
      "question": "Price exceeds budget and attention cost is high; do you want to negotiate an attention fee or credit-back?"
    }
  ],
  "pursue_now": [
    {
      "card_id": "PMCG1-096",
      "offer_id": "double_colorless_clean",
      "reason": "Active special Energy target within budget; evidence shape matches ask."
    }
  ],
  "reject_or_ignore": [
    {
      "card_id": "PMCG1-098",
      "offer_id": "premium_basic_energy_mislabel",
      "reason": "Caveat row marketed as premium No Rarity; protocol requires rejecting premium language for basic Energy caveats."
    }
  ],
  "request_evidence": [
    {
      "card_ids": [
        "PMCG1-002",
        "PMCG1-007",
        "PMCG1-012",
        "PMCG1-031",
        "PMCG1-037",
        "PMCG1-059"
      ],
      "offer_id": "shop_low_value_lot_A",
      "reason": "Offer provides NR-A but cards require NR-B; protocol requires upgrade to baseline profile."
    },
    {
      "card_ids": [
        "PMCG1-072",
        "PMCG1-073",
        "PMCG1-076",
        "PMCG1-093"
      ],
      "offer_id": "trainer_text_trap_lot",
      "reason": "Quick Starter-sensitive trainers need text-layout proof against Expansion Pack exemplar."
    }
  ],
  "sell_stances": [],
  "top_wants": [
    {
      "id": "PMCG1-014",
      "name": "Charmander",
      "note": "Small flame anxiety in cardboard form.",
      "profile": "NR-B"
    },
    {
      "id": "PMCG1-017",
      "name": "Charmeleon",
      "note": "Teenage middle of the line: sharper, meaner, not yet Charizard.",
      "profile": "NR-B"
    },
    {
      "id": "PMCG1-023",
      "name": "Squirtle",
      "note": "Round, mischievous, and impossible not to like.",
      "profile": "NR-B"
    },
    {
      "id": "PMCG1-067",
      "name": "Clefairy",
      "note": "Moonlit and soft, but the holo makes it serious.",
      "profile": "NR-C"
    }
  ],
  "what_catalog_knows": [
    "The catalog anchors PMCG1 rows, evidence profiles, collector texture, and active/caveat status."
  ],
  "what_remains_judgment": [
    "The catalog cannot prove seller possession, authenticity, true condition, No Rarity truth, delivery, or price truth."
  ]
}
```

## Avery - collector-seller with duplicates

- Style: will document once, but seller attention has to be respected and priced
- Budget: `$900` total, `$180` per card aperture
- Attention tolerance: `low-to-medium`
- Human contact threshold: when an attention ask should be paid, credited back, or refused
- Movement violations: `0`
- Language overclaims: `0`

### Deterministic Offer Read

- `known_collector_slab_raichu` (PMCG1-038, `$1850`): `human_review` - price exceeds collector's normal budget aperture
- `double_colorless_clean` (PMCG1-096, `$82`): `pursue` - within collector aperture; catalog target is active; evidence shape matches current ask

### Sell Stances

- `PMCG1-035` Pikachu: `have_extra_open_to_sell`, profile `NR-B`
- `PMCG1-093` Pokémon Trader: `have_extra_open_to_sell`, profile `NR-B`
- `PMCG1-096` Double Colorless Energy: `have_extra_open_to_sell`, profile `NR-B`

### Qwen Collector Agent

```json
{
  "_raw": "{\n  \"collector_read\": \"Avery, a collector-seller with duplicates, prioritizes efficiency and budget, holding PMCG1-035, 096, 093, and 021 while seeking PMCG1-032, 038, and 096, with a strict $180 per card limit.\",\n  \"top_wants\": [\n    {\n      \"id\": \"PMCG1-096\",\n      \"reason\": \"Active target, within budget ($82), and evidence profile matches current ask.\"\n    },\n    {\n      \"id\": \"PMCG1-032\",\n      \"reason\": \"High-value holo target; requires high-scrutiny evidence but fits collector archetype.\"\n    },\n    {\n      \"id\": \"PMCG1-038\",\n      \"reason\": \"High-value holo target; currently blocked by price exceeding budget aperture.\"\n    }\n  ],\n  \"pursue_now\": [\n    {\n      \"card_id\": \"PMCG1-096\",\n      \"offer_id\": \"double_colorless_clean\",\n      \"action\": \"pursue\",\n      \"reason\": \"Within collector aperture, catalog target is active, and evidence shape matches current ask.\"\n    }\n  ],\n  \"request_evidence\": [\n    {\n      \"card_id\": \"PMCG1-032\",\n      \"required_evidence\": [\n        \"full front and full back images\",\n        \"sharp lower-right rarity-symbol crop with surrounding border\",\n        \"front and back high-resolution scans or photos\",\n        \"four-corner front close-ups\",\n        \"four-corner back close-ups\",\n        \"angled holo-surface video\"\n      ],\n      \"reason\": \"High-value holo profile requires high-scrutiny evidence to justify purchase.\"\n    },\n    {\n      \"card_id\": \"PMCG1-038\",\n      \"required_evidence\": [\n        \"full front and full back images\",\n        \"sharp lower-right rarity-symbol crop with surrounding border\",\n        \"front and back high-resolution scans or photos\",\n        \"four-corner front close-ups\",\n        \"four-corner back close-ups\",\n        \"angled holo-surface video\"\n      ],\n      \"reason\": \"High-value holo profile requires high-scrutiny evidence; currently blocked by price.\"\n    }\n  ],\n  \"reject_or_ignore\": [\n    {\n      \"offer_id\": \"known_collector_slab_raichu\",\n      \"card_id\": \"PMCG1-038\",\n      \"reason\": \"Price ($1850) exceeds collector's normal budget aperture ($180); requires human_review.\"\n    }\n  ],\n  \"sell_stances\": [\n    {\n      \"card_id\": \"PMCG1-035\",\n      \"stance\": \"have_extra_open_to_sell\",\n      \"evidence_profile\": \"NR-B\"\n    },\n    {\n      \"card_id\": \"PMCG1-093\",\n      \"stance\": \"have_extra_open_to_sell\",\n      \"evidence_profile\": \"NR-B\",\n      \"trap_note\": \"Check Japanese text layout line-by-line against known Expansion Pack exemplar before treating missing-symbol claim as clean.\"\n    },\n    {\n      \"card_id\": \"PMCG1-096\",\n      \"stance\": \"have_extra_open_to_sell\",\n      \"evidence_profile\": \"NR-B\"\n    }\n  ],\n  \"human_questions\": [\n    \"Do you want to proceed with the PMCG1-096 pursuit despite the medium attention cost?\",\n    \"Should we ignore the PMCG1-038 slab offer entirely, or is there a lower-price alternative for Raichu?\",\n    \"Do you want to list PMCG1-093 with the specific text-layout trap warning for buyers?\"\n  ],\n  \"agent_to_agent_messages\": [\n    \"Catalog presents PMCG1-096 as active target with NR-B evidence; protocol gate requires verification of seller proof chain before finalizing.\",\n    \"Catalog presents PMCG1-038 slab offer; protocol gate blocks purchase due to price exceeding budget aperture, requiring human_review.\",\n    \"Catalog presents PMCG1-093 for sale; protocol gate requires attention policy credit if buyer purchases.\"\n  ],\n  \"what_catalog_knows\": [\n    \"PMCG1-096 is an active target with NR-B evidence profile and a buy offer at $82.\",\n    \"PMCG1-038 has a slabbed buy offer at $1850 with NR-D evidence profile.\",\n    \"Collector holds PMCG1-035, 096, 093, and 021, and wants 032, 038, and 096.\"\n  ],\n  \"what_remains_judgment\": [\n    \"The catalog does not prove seller possession, authenticity, true condition, or price truth for any offer.\",\n    \"The catalog does not prove the slabbed Raichu is authentic or correctly conditioned; it only presents the packet.\",\n    \"The catalog does not prove the Double Colorless Energy is No Rarity; it only presents the evidence profile.\"\n  ]\n}",
  "agent_to_agent_messages": [
    "Catalog presents PMCG1-096 as active target with NR-B evidence; protocol gate requires verification of seller proof chain before finalizing.",
    "Catalog presents PMCG1-038 slab offer; protocol gate blocks purchase due to price exceeding budget aperture, requiring human_review.",
    "Catalog presents PMCG1-093 for sale; protocol gate requires attention policy credit if buyer purchases."
  ],
  "collector_read": "Avery, a collector-seller with duplicates, prioritizes efficiency and budget, holding PMCG1-035, 096, 093, and 021 while seeking PMCG1-032, 038, and 096, with a strict $180 per card limit.",
  "human_questions": [
    "Do you want to proceed with the PMCG1-096 pursuit despite the medium attention cost?",
    "Should we ignore the PMCG1-038 slab offer entirely, or is there a lower-price alternative for Raichu?",
    "Do you want to list PMCG1-093 with the specific text-layout trap warning for buyers?"
  ],
  "pursue_now": [
    {
      "action": "pursue",
      "card_id": "PMCG1-096",
      "offer_id": "double_colorless_clean",
      "reason": "Within collector aperture, catalog target is active, and evidence shape matches current ask."
    }
  ],
  "reject_or_ignore": [
    {
      "card_id": "PMCG1-038",
      "offer_id": "known_collector_slab_raichu",
      "reason": "Price ($1850) exceeds collector's normal budget aperture ($180); requires human_review."
    }
  ],
  "request_evidence": [
    {
      "card_id": "PMCG1-032",
      "reason": "High-value holo profile requires high-scrutiny evidence to justify purchase.",
      "required_evidence": [
        "full front and full back images",
        "sharp lower-right rarity-symbol crop with surrounding border",
        "front and back high-resolution scans or photos",
        "four-corner front close-ups",
        "four-corner back close-ups",
        "angled holo-surface video"
      ]
    },
    {
      "card_id": "PMCG1-038",
      "reason": "High-value holo profile requires high-scrutiny evidence; currently blocked by price.",
      "required_evidence": [
        "full front and full back images",
        "sharp lower-right rarity-symbol crop with surrounding border",
        "front and back high-resolution scans or photos",
        "four-corner front close-ups",
        "four-corner back close-ups",
        "angled holo-surface video"
      ]
    }
  ],
  "sell_stances": [
    {
      "card_id": "PMCG1-035",
      "evidence_profile": "NR-B",
      "stance": "have_extra_open_to_sell"
    },
    {
      "card_id": "PMCG1-093",
      "evidence_profile": "NR-B",
      "stance": "have_extra_open_to_sell",
      "trap_note": "Check Japanese text layout line-by-line against known Expansion Pack exemplar before treating missing-symbol claim as clean."
    },
    {
      "card_id": "PMCG1-096",
      "evidence_profile": "NR-B",
      "stance": "have_extra_open_to_sell"
    }
  ],
  "top_wants": [
    {
      "id": "PMCG1-096",
      "reason": "Active target, within budget ($82), and evidence profile matches current ask."
    },
    {
      "id": "PMCG1-032",
      "reason": "High-value holo target; requires high-scrutiny evidence but fits collector archetype."
    },
    {
      "id": "PMCG1-038",
      "reason": "High-value holo target; currently blocked by price exceeding budget aperture."
    }
  ],
  "what_catalog_knows": [
    "PMCG1-096 is an active target with NR-B evidence profile and a buy offer at $82.",
    "PMCG1-038 has a slabbed buy offer at $1850 with NR-D evidence profile.",
    "Collector holds PMCG1-035, 096, 093, and 021, and wants 032, 038, and 096."
  ],
  "what_remains_judgment": [
    "The catalog does not prove seller possession, authenticity, true condition, or price truth for any offer.",
    "The catalog does not prove the slabbed Raichu is authentic or correctly conditioned; it only presents the packet.",
    "The catalog does not prove the Double Colorless Energy is No Rarity; it only presents the evidence profile."
  ]
}
```

## Theo - slab-first investor

- Style: does not want raw drama; wants certs, labels, and bounded resale evidence
- Budget: `$5000` total, `$2500` per card aperture
- Attention tolerance: `medium`
- Human contact threshold: any cert mismatch, label ambiguity, or grader-population uncertainty
- Movement violations: `0`
- Language overclaims: `0`

### Deterministic Offer Read

- `known_collector_slab_raichu` (PMCG1-038, `$1850`): `pursue` - within collector aperture; catalog target is active; evidence shape matches current ask

### Qwen Collector Agent

```json
{
  "_raw": "{\n  \"collector_read\": \"Theo, a slab-first investor with low risk tolerance, seeks certified PMCG1 holo rares within a $5000 total budget, prioritizing cert trails and bounded resale evidence over raw drama.\",\n  \"top_wants\": [\n    {\n      \"id\": \"PMCG1-038\",\n      \"name\": \"Raichu\",\n      \"status\": \"active_target\",\n      \"note\": \"High-value holo; catalog target is active and within aperture.\"\n    },\n    {\n      \"id\": \"PMCG1-050\",\n      \"name\": \"Mewtwo\",\n      \"status\": \"active_target\",\n      \"note\": \"High-value holo; catalog target is active.\"\n    },\n    {\n      \"id\": \"PMCG1-068\",\n      \"name\": \"Chansey\",\n      \"status\": \"active_target\",\n      \"note\": \"High-value holo; catalog target is active.\"\n    },\n    {\n      \"id\": \"PMCG1-095\",\n      \"name\": \"Lass\",\n      \"status\": \"active_target\",\n      \"note\": \"Mid-value desirable; catalog target is active.\"\n    }\n  ],\n  \"pursue_now\": [\n    {\n      \"card_id\": \"PMCG1-038\",\n      \"action\": \"pursue\",\n      \"reason\": \"Offer exists with graded slab evidence profile (NR-D) matching collector aperture; ask is $1850, within budget.\"\n    }\n  ],\n  \"request_evidence\": [\n    {\n      \"card_id\": \"PMCG1-038\",\n      \"required_packets\": [\n        \"slab_front\",\n        \"slab_back\",\n        \"label_closeup\",\n        \"cert_lookup\",\n        \"fresh_nonce_slab\"\n      ],\n      \"note\": \"Protocol requires these packets to verify the graded slab claim; does not prove physical authenticity or condition beyond the packet.\"\n    },\n    {\n      \"card_id\": \"PMCG1-050\",\n      \"required_packets\": [\n        \"full_front_back_images\",\n        \"rarity_symbol_crop\",\n        \"four_corner_closeups\",\n        \"angled_holo_video\"\n      ],\n      \"note\": \"Catalog recommends standard holo evidence; protocol requires these to anchor the card context.\"\n    },\n    {\n      \"card_id\": \"PMCG1-068\",\n      \"required_packets\": [\n        \"full_front_back_images\",\n        \"rarity_symbol_crop\",\n        \"four_corner_closeups\",\n        \"angled_holo_video\"\n      ],\n      \"note\": \"Catalog recommends standard holo evidence; protocol requires these to anchor the card context.\"\n    }\n  ],\n  \"reject_or_ignore\": [],\n  \"sell_stances\": [],\n  \"human_questions\": [\n    \"Does the cert lookup for PMCG1-038 match the slab number and grader exactly, and is the label free of ambiguity?\",\n    \"Is the seller willing to provide a fresh nonce possession image for PMCG1-050 and PMCG1-068 to verify current holding?\"\n  ],\n  \"agent_to_agent_messages\": [\n    \"Protocol gate for PMCG1-038 requires verification of the 'known_collector' trust chain and the 'nonship_wrong_item' bond before finalizing the buy offer.\"\n  ],\n  \"what_catalog_knows\": \"The catalog anchors PMCG1 rows, defines evidence profiles (NR-C, NR-D), and lists active targets; it does not prove seller possession, authenticity, condition, or price truth.\",\n  \"what_remains_judgment\": \"Authenticity, true condition, seller possession, and successful delivery remain unproven by the deterministic API; the protocol only enforces the presented packets, hashes, and signatures.\"\n}",
  "agent_to_agent_messages": [
    "Protocol gate for PMCG1-038 requires verification of the 'known_collector' trust chain and the 'nonship_wrong_item' bond before finalizing the buy offer."
  ],
  "collector_read": "Theo, a slab-first investor with low risk tolerance, seeks certified PMCG1 holo rares within a $5000 total budget, prioritizing cert trails and bounded resale evidence over raw drama.",
  "human_questions": [
    "Does the cert lookup for PMCG1-038 match the slab number and grader exactly, and is the label free of ambiguity?",
    "Is the seller willing to provide a fresh nonce possession image for PMCG1-050 and PMCG1-068 to verify current holding?"
  ],
  "pursue_now": [
    {
      "action": "pursue",
      "card_id": "PMCG1-038",
      "reason": "Offer exists with graded slab evidence profile (NR-D) matching collector aperture; ask is $1850, within budget."
    }
  ],
  "reject_or_ignore": [],
  "request_evidence": [
    {
      "card_id": "PMCG1-038",
      "note": "Protocol requires these packets to verify the graded slab claim; does not prove physical authenticity or condition beyond the packet.",
      "required_packets": [
        "slab_front",
        "slab_back",
        "label_closeup",
        "cert_lookup",
        "fresh_nonce_slab"
      ]
    },
    {
      "card_id": "PMCG1-050",
      "note": "Catalog recommends standard holo evidence; protocol requires these to anchor the card context.",
      "required_packets": [
        "full_front_back_images",
        "rarity_symbol_crop",
        "four_corner_closeups",
        "angled_holo_video"
      ]
    },
    {
      "card_id": "PMCG1-068",
      "note": "Catalog recommends standard holo evidence; protocol requires these to anchor the card context.",
      "required_packets": [
        "full_front_back_images",
        "rarity_symbol_crop",
        "four_corner_closeups",
        "angled_holo_video"
      ]
    }
  ],
  "sell_stances": [],
  "top_wants": [
    {
      "id": "PMCG1-038",
      "name": "Raichu",
      "note": "High-value holo; catalog target is active and within aperture.",
      "status": "active_target"
    },
    {
      "id": "PMCG1-050",
      "name": "Mewtwo",
      "note": "High-value holo; catalog target is active.",
      "status": "active_target"
    },
    {
      "id": "PMCG1-068",
      "name": "Chansey",
      "note": "High-value holo; catalog target is active.",
      "status": "active_target"
    },
    {
      "id": "PMCG1-095",
      "name": "Lass",
      "note": "Mid-value desirable; catalog target is active.",
      "status": "active_target"
    }
  ],
  "what_catalog_knows": "The catalog anchors PMCG1 rows, defines evidence profiles (NR-C, NR-D), and lists active targets; it does not prove seller possession, authenticity, condition, or price truth.",
  "what_remains_judgment": "Authenticity, true condition, seller possession, and successful delivery remain unproven by the deterministic API; the protocol only enforces the presented packets, hashes, and signatures."
}
```

## Files

- Summary: `runs/qwen_no_rarity_collectors_20260608T163908Z/summary.json`
