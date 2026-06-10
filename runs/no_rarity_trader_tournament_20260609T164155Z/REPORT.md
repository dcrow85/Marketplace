# No Rarity Trader Tournament: 2026-06-09T16:41:55.285948+00:00

## Result

- Pass: `True`
- Attempts: `16/16`

## Trader Results

### Binder Completionist Buyer

- Aperture: Wants many low/mid cards with low ceremony.
- Pressure: Can the catalog keep asks light while still naming missing evidence?

- `PASS` Natural low-friction Caterpie want
  - Expected: `low_friction_pass`
  - Observed: `low_friction_pass`
  - Decision: `continue`
  - Human summary: The catalog row is legible. It is not physical-card proof.
- `PASS` Vintage Japanese Pikachu search
  - Expected: `search_exact:Pikachu`
  - Observed: `search_exact:Pikachu`
  - Top cards: Pikachu
- `PASS` Collection memory from binder talk
  - Expected: `stance:have`
  - Observed: `stance:have`
  - Inferred stance: `have`
  - Next: save private collection memory, offer optional photo hardening, do not make public sell claim by default

### Low-Risk Holo Grail Buyer

- Aperture: Will pay, but hates ambiguity and thin trust.
- Pressure: Does high value force evidence and review instead of catalog-image confidence?

- `PASS` Charizard with low evidence from thin seller
  - Expected: `request_evidence`
  - Observed: `request_evidence`
  - Decision: `request_evidence`
  - Human summary: This is a plausible want, but the evidence floor is not met.
  - Missing: full front and full back images, sharp lower-right rarity-symbol crop with surrounding border, front and back high-resolution scans or photos, four-corner front close-ups, four-corner back close-ups
- `PASS` Raichu with evidence but unknown seller
  - Expected: `human_or_verifier_review`
  - Observed: `human_or_verifier_review`
  - Decision: `human_or_verifier_review`
  - Human summary: High-value or slabbed No Rarity claims from thin trust need review before funding.
  - Missing: seller proof chain, fresh possession continuity, verifier or bond recommendation
- `PASS` Holo search precision
  - Expected: `search_exact:Raichu`
  - Observed: `search_exact:Raichu`
  - Top cards: Raichu

### Slab-First Investor

- Aperture: Likes certs and labels, but should not mistake labels for truth.
- Pressure: Can slab evidence remain scoped and not become blanket verification?

- `PASS` Slabbed Blastoise from unknown seller
  - Expected: `evidence_plan_named`
  - Observed: `evidence_plan_named`
  - Evidence asks: full front and full back images, sharp lower-right rarity-symbol crop with surrounding border, front and back high-resolution scans or photos, four-corner front close-ups, four-corner back close-ups, angled holo-surface video, fresh possession continuity sequence, seller trust proof or bond recommendation
  - Attention: High-value evidence asks can justify seller attention, verifier review, and human interruption.
- `PASS` Mewtwo with declared slab-level evidence
  - Expected: `human_or_verifier_review`
  - Observed: `human_or_verifier_review`
  - Decision: `human_or_verifier_review`
  - Human summary: High-value or slabbed No Rarity claims from thin trust need review before funding.
  - Missing: seller proof chain, fresh possession continuity, verifier or bond recommendation

### Local Shop Dealer Seller

- Aperture: Can reuse shop proof and may offer local handoff.
- Pressure: Does seller posture require explicit public sharing and bounded proof?

- `PASS` Public sell posture not yet authorized
  - Expected: `hold_private`
  - Observed: `hold_private`
  - Decision: `hold_private`
  - Human summary: This can become a sell posture, but public sharing needs an explicit yes.
  - Missing: public sharing permission
- `PASS` Authorized sell posture for mid-value Double Colorless
  - Expected: `low_friction_pass`
  - Observed: `low_friction_pass`
  - Decision: `continue`
  - Human summary: The catalog row is legible. It is not physical-card proof.

### Duplicate Collector-Seller

- Aperture: Will document once, but attention must be worth it.
- Pressure: Can the agent start with private memory and delay heavy evidence until demand is real?

- `PASS` Might sell Blastoise from natural language
  - Expected: `stance:sell_if_price_right`
  - Observed: `stance:sell_if_price_right`
  - Inferred stance: `sell_if_price_right`
  - Next: confirm public/private posture, request only value-appropriate evidence, price seller attention if needed
- `PASS` Have extra Magikarp private memory
  - Expected: `hold_private`
  - Observed: `hold_private`
  - Decision: `hold_private`
  - Human summary: This can become a sell posture, but public sharing needs an explicit yes.
  - Missing: public sharing permission
- `PASS` Seller attention plan
  - Expected: `public_permission_named`
  - Observed: `public_permission_named`
  - Evidence asks: full front image, full back image, sharp lower-right rarity-symbol crop with surrounding border, fresh nonce possession image, explicit public-sharing permission for any photos and condition notes
  - Attention: Seller attention should be priced or reserved for funded/serious buyers; credit-back can be negotiated.

### Adversarial Seller

- Aperture: Tries plausible No Rarity fraud and scope laundering.
- Pressure: Do the tools refuse shortcut claims before protocol spendability?

- `PASS` Basic Energy premium No Rarity claim
  - Expected: `reject_premium_no_rarity`
  - Observed: `reject_premium_no_rarity`
  - Decision: `reject_premium_no_rarity`
  - Human summary: This row is tracked for completeness, but it should not carry a premium No Rarity claim by itself.
  - Missing: separate provenance story if seller claims a premium
- `PASS` Quick Starter-sensitive Potion laundering
  - Expected: `quick_starter_wall_named`
  - Observed: `quick_starter_wall_named`
  - Evidence asks: full front and full back images, sharp lower-right rarity-symbol crop with surrounding border, front and back scans or high-resolution photos, front and back corner close-ups if condition affects price, fresh nonce possession image, seller proof reuse if trust is thin, Quick Starter text-check: compare the Japanese text layout line-by-line against a known Expansion Pack exemplar before treating the missing-symbol claim as clean., readable Japanese text-layout close-up for Quick Starter comparison
  - Attention: Seller attention should be priced or reserved for funded/serious buyers; credit-back can be negotiated.
- `PASS` Catalog-match-as-possession attack on Charizard
  - Expected: `request_evidence`
  - Observed: `request_evidence`
  - Decision: `request_evidence`
  - Human summary: This is a plausible want, but the evidence floor is not met.
  - Missing: full front and full back images, sharp lower-right rarity-symbol crop with surrounding border, front and back high-resolution scans or photos, four-corner front close-ups, four-corner back close-ups

