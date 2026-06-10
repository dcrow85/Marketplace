# Agent Actions

Use this reference when producing structured actions for the Marketplace
Protocol skill.

## Minimal Action Envelope

```json
{
  "action": "evaluate_offer",
  "human_summary": "This is probably the card you want, but the seller has not shown fresh possession yet.",
  "enforced": [],
  "legible": [],
  "judgment_needed": [],
  "missing": [],
  "next_human_decision": null
}
```

Keep `human_summary` plain. The structured fields are for agents and logs.

## Common Actions

### identify_card_candidates

Use for binder photos, seller photos, search talk, or collection import.

```json
{
  "action": "identify_card_candidates",
  "candidates": [
    {
      "card": "Japanese No Rarity Blastoise",
      "confidence": "medium",
      "why": "Japanese Base-era Blastoise art; lower-right rarity area needs close view.",
      "needed": ["lower-right corner closeup", "back photo"]
    }
  ],
  "judgment_needed": ["no-rarity status", "condition estimate"]
}
```

### set_collector_stance

Use when the human marks ownership or desire.

```json
{
  "action": "set_collector_stance",
  "card_ref": "no-rarity:025:kamekkusu",
  "stance": "have",
  "depth": "memory_only",
  "public": false
}
```

Valid stances:

- `have`
- `have_extra`
- `want`
- `want_more`
- `want_check`
- `sell_if_price_right`
- `sell_now`
- `not_interested`

### prepare_sell_posture

Use when the human says "I might sell this" or sends a card image.

```json
{
  "action": "prepare_sell_posture",
  "card_ref": "no-rarity:036:raichu",
  "seller_posture": "sell_if_price_right",
  "evidence_now": ["front_photo"],
  "evidence_worth_asking": ["back_photo", "four_corners", "fresh_timestamp"],
  "attention_policy": {
    "extra_photos": "ask only for funded buyer or serious offer",
    "credit_if_bought": "seller preference"
  }
}
```

### evaluate_offer

Use before a buyer commits.

```json
{
  "action": "evaluate_offer",
  "recommendation": "request_more_evidence",
  "human_summary": "Good candidate, but not ready to fund. The card looks right; possession and condition are still soft.",
  "enforced": ["seller is registered", "terms hash anchored"],
  "legible": ["shop proof", "front photo", "catalog match"],
  "judgment_needed": ["LP condition", "fresh possession"],
  "missing": ["item_fingerprint_hash", "inventory_lock_hash"]
}
```

### prepare_route_lock

Use only when a route is near spendable.

```json
{
  "action": "prepare_route_lock",
  "recommendation": "blocked",
  "missing": ["assembly_history_hash"],
  "human_summary": "The route has support, but the support has not been assembled into permission for this trade."
}
```

### open_claim

Use when delivery, condition, authenticity, or route failure is contested.

```json
{
  "action": "open_claim",
  "claim_type": "condition_mismatch",
  "required_evidence": ["delivery timestamp", "opening photos", "front/back scans"],
  "judgment_needed": ["materiality of condition delta"],
  "human_summary": "This is not automatic. I can assemble the case, but a condition call needs judgment."
}
```

## Attention Cost

If asking for seller attention, name the cost:

```json
{
  "attention_request": "front/back plus four corners",
  "why_worth_it": "buyer is funded and card value justifies condition proof",
  "credit_policy": "credited back if purchase completes"
}
```

