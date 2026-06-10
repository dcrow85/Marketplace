# Protocol Walls v0.1

Generated 2026-05-20.

This document makes the first prompt-variant findings concrete. The walls do not prove physical truth. They prevent agents from spending ambiguous evidence as if it were settled truth.

## Wall Semantics

Each wall can return one of four outcomes:

```text
pass: all required fields are present
block: a hard prerequisite is missing
waiver_required: trade may proceed only with explicit buyer or seller risk acceptance
escalate: authorized human, verifier, or arbiter judgment is required
```

Each wall must label its material facts:

```text
enforced: mechanically checked by contract or deterministic validator
legible: represented as signed/typed evidence but still judgment-dependent
judged: decided by buyer, seller, verifier, arbiter, or agent policy
```

## 1. POKEMON_ALPHA_SCOPE

Purpose: keep alpha experiments from silently becoming a general marketplace.

Applies to every alpha action.

Hard requirements:

- `domain: tcg`
- `game: pokemon`
- `trade_template: pokemon_single_card_alpha`
- item is a single card, not sealed product, lots, or non-card collectibles

Failure outcome:

```text
block: blocked_outside_alpha_scope
```

## 2. CardReferenceCandidate

Purpose: give Pokemon alpha agents a shared catalog anchor without letting a database row masquerade as physical truth.

Applies to every Pokemon alpha trade.

Hard requirements:

- `card_reference_packet`
- source, source URL, source language, printed name, set name, card number, match kind, source coverage, selected-by
- external card id for database-backed references
- explicit `not_claiming`: possession, condition, authenticity, seller inventory, seller card language, price truth

Manual database-gap requirements:

- reason the source cannot anchor the print,
- human or agent note,
- supporting links or images when available,
- buyer acknowledgement before acceptance.

Failure outcomes:

```text
block: missing card reference or missing non-claims
waiver_required: manual database gap or language-equivalent row used for a claimed print
```

What this wall enforces:

- the trade is talking about a legible Pokemon print candidate,
- the candidate has source provenance,
- the source's limits remain visible.

What this wall does not enforce:

- seller possession,
- authenticity,
- condition,
- language/edition truth,
- price truth.

## 3. POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000

Purpose: prevent $500-$2,000 raw-card trades from closing on vague evidence such as "six photos" or "trusted shop."

Applies when:

```text
domain: tcg
game: pokemon
item_form: raw_card
trade_value_usd: 500..2000
phase: before buyer acceptance or route lock
```

Hard requirements:

- `item_fingerprint_hash`
- `card_reference_packet`
- `inventory_lock_hash`
- `proof_vector_scope_packet`
- `bond_scope_packet`
- `route_insurance_risk_owner_packet`
- `arbiter_policy_hash`
- `evidence_profile_id`

Default evidence profile:

```text
profile_id: pokemon.raw.500_2000.v0.1
seller_evidence:
  - fresh_nonce_possession
  - front_full
  - back_full
  - four_corner_closeups
  - edge_or_border_closeups
  - surface_or_holo_angle
  - flaw_callouts
  - seller_condition_statement
buyer_duties_disclosed:
  - delivery_timestamp
  - package_exterior_photos
  - immediate_arrival_photos
  - opening_video_recommended
```

Waivable items:

- `fresh_nonce_possession`
- `four_corner_closeups`
- `edge_or_border_closeups`
- `surface_or_holo_angle`
- `opening_video_recommended`
- `external_availability_covenant`

Waiver rule:

Any waived item must be listed in `BuyerRiskAcceptance`. The acceptance summary must say what remains unproven and how later claims are weakened.

Agent instruction:

Do not say "condition verified." Say which condition evidence exists and which condition question remains judged.

## 4. BuyerRiskAcceptance

Purpose: let convenience remain possible without turning convenience into certainty.

Required fields:

```text
schema: marketplace.buyer_risk_acceptance.v0.1
trade_id
buyer_agent
buyer_controller_or_delegate
accepted_evidence_refs
waived_evidence_requirements
remaining_unproven_claims
claim_consequences
human_mandate_ref
expires_at
signature
```

Hard rule:

Buyer risk acceptance cannot waive:

- missing item fingerprint,
- missing inventory lock,
- missing bond scope,
- missing route risk owner,
- missing arbiter policy hash,
- missing proof vector scope,
- expired or revoked authority.

Agent instruction:

If accepting with waiver, display "accepted with unresolved risk," not "verified."

## 5. ClaimClosureEvidenceMatrix

Purpose: prevent arbitration from becoming improvisation.

Every arbiter policy hash must resolve to a matrix with:

```text
claim_type
required_seller_evidence
required_buyer_evidence
required_route_evidence
optional_verifier_evidence
allowed_cure_packets
bond_action
remedy_cap
automation_allowed
human_escalation_trigger
```

Initial TCG claim types:

```text
wrong_item
condition_downgrade
empty_package
damaged_package
underinsured_loss
late_shipment
seller_nonship
local_handoff_dispute
frivolous_buyer_claim
seller_cure
```

Minimum matrix:

| Claim Type | Seller Evidence | Buyer Evidence | Route Evidence | Cure | Default Closure |
| --- | --- | --- | --- | --- | --- |
| `wrong_item` | item fingerprint, pre-route photos | arrival photos, return fingerprint | delivery event | seller counter-fingerprint | escalate if buyer arrival evidence missing |
| `condition_downgrade` | condition anchors, seller condition statement | immediate arrival photos, condition notes | delivery event | extra scans or verifier review | judged under TCG condition rubric |
| `empty_package` | packaging proof, route receipt | package exterior, opening sequence, label | carrier acceptance, weight if available | carrier/shop evidence | escalate unless buyer evidence exists |
| `damaged_package` | packaging proof | package damage photos, item damage photos | carrier damage/loss path | insurance packet | route-risk owner and insurance decide liability |
| `underinsured_loss` | route insurance commitment | buyer acceptance or nonacceptance of gap | insurance amount, declared value | insurance correction before ship | seller liable unless buyer accepted gap |
| `late_shipment` | ship-by promise | optional buyer notice | carrier acceptance timestamp | updated route acceptance | mostly enforced/legible |
| `seller_nonship` | inventory lock, route promise | buyer claim | no carrier acceptance by deadline | seller proof of ship | refund plus scoped bond action |
| `local_handoff_dispute` | handoff memo, location, witness if any | buyer confirmation or denial | local handoff packet | signed correction memo | judged under handoff policy |
| `frivolous_buyer_claim` | completed route and evidence compliance | missing or contradictory buyer evidence | delivery event | buyer cure if policy allows | deny claim, possible dispute-bond action |
| `seller_cure` | cure packet | buyer response | affected route or evidence refs | verifier or arbiter review | accepted, rejected, or escalated |

Agent instruction:

Do not ask an arbiter to "figure it out" without naming the matrix row and missing evidence.

## 6. BondScope

Purpose: prevent "seller posted a bond" from becoming general trust.

Required fields:

```text
schema: marketplace.bond_scope.v0.1
trade_id
bond_amount
covered_failures
excluded_failures
penalty_caps
release_conditions
claim_window
arbiter_policy_hash
signature
```

Covered failures should be explicit:

```text
nonship
wrong_item
material_condition_mismatch
underinsurance_without_buyer_acceptance
route_negligence
failure_to_cure
bad_faith_dispute_conduct
```

Agent instruction:

Bond amount is enforced. Bond adequacy is judged. Bond coverage is legible only if scoped.

## 7. ProofVectorScope

Purpose: prevent seller reputation or shop proof from laundering object-specific claims.

Required fields:

```text
schema: marketplace.proof_vector_scope.v0.1
trade_id
proof_vector_id
proof_source
positive_claims
not_claiming
subject_binding
freshness
revocation_or_expiry
signature_or_reference
```

Examples:

```text
positive_claims:
  - seller_controls_shop_domain
  - seller_controls_ebay_account
  - public_reviews_match_shop_identity
not_claiming:
  - current_possession
  - authenticity
  - raw_card_condition
  - shipment_completion
```

Agent instruction:

A proof vector may strengthen seller trust without proving this card.

## 8. RouteInsuranceRiskOwner

Purpose: prevent shipping and insurance ambiguity from surfacing only after loss.

Required fields before route lock:

```text
schema: marketplace.route_insurance_risk_owner.v0.1
trade_id
route_type
carrier_or_handoff_method
declared_value
insurance_amount
signature_required
ship_by
risk_owner_for_gap
claimant_duties
accepted_by_buyer
accepted_by_seller
```

Hard rule:

If `insurance_amount < declared_value`, the insurance gap must be assigned before route lock. If not assigned, route lock is blocked.

Agent instruction:

Do not say "insured shipping" without amount, declared value, and gap owner.

## 9. ExternalAvailabilityCovenant

Purpose: minimize real-world double-sale and nonship risk.

Required fields when used:

```text
schema: marketplace.external_availability_covenant.v0.1
trade_id
seller
item_fingerprint_hash
promise_scope
external_channels_covered
starts_at
expires_at
covered_failure
bond_scope_ref
signature
```

Default alpha rule:

For curated sellers, this is recommended and buyer-waivable. If waived, the buyer must be told the protocol lock prevents internal reuse but does not prevent external sale elsewhere.

Agent instruction:

Do not describe inventory lock as global exclusivity unless this covenant exists.

## 10. EvidenceRequestFeeTerms

Purpose: keep seller time from dissolving into chat while preserving buyer confidence.

Applies when a buyer or buyer agent asks the seller for work beyond already available offer evidence.

Examples:

- extra surface photo,
- fresh timestamp,
- video,
- packaging proof,
- serial lookup,
- local handoff coordination,
- inventory hold,
- item preparation.

Hard requirements:

- `request_id`
- `trade_id`
- requested work
- payer
- recipient
- amount and currency
- trigger for payment
- credit policy
- refund policy
- expiry
- dispute path
- quality floor or explicit statement that quality is judged
- signatures or agent mandates for both sides

Allowed credit policies:

```text
full_credit_if_purchase
partial_credit_if_purchase
no_purchase_credit
fee_waived
deposit_required_for_hold_or_prep
```

Failure outcomes:

```text
block: seller work requested without fee terms where seller policy requires payment
waiver_required: buyer asks seller to proceed without mechanical quality floor
escalate: buyer and seller dispute whether requested work was satisfied
```

What this wall enforces:

- the fee was disclosed,
- the buyer accepted the fee,
- the seller knows what work is covered,
- credit-back terms are explicit,
- seller payout or buyer refund can be computed when the trigger is mechanical.

What this wall does not enforce:

- whether the request was socially fair,
- whether the photo or note was "good enough" unless quality was mechanical,
- whether the buyer should personally like the result.

Agent instruction:

Say "The seller can do this for $5, with $2.50 credited if you buy." Do not hide paid seller labor behind a generic evidence request.

## 11. CostDimensionalIntegrity

Purpose: prevent agents from collapsing unlike costs into one scalar and then spending that scalar as if it were protocol truth.

Applies whenever an API response, agent recommendation, fee quote, evidence request, waiver, or human decision displays a simplified cost.

Hard requirements:

- native dimensions preserved,
- scalar summary marked as display,
- payer and recipient named,
- trigger and deadline named,
- risk reduced named,
- risk not reduced named,
- conversion rationale present if a dollar estimate is shown,
- reversible reference to the underlying signed terms or packets.

Failure outcomes:

```text
block: scalar cost is used to move funds, route, bond, claim, or reputation without native dimensions
waiver_required: human accepts a simplified summary without expanding ambiguous dimensions
escalate: parties dispute what the scalar was meant to cover
```

Agent instruction:

Say "This is $5 of seller time for one photo, credited if you buy." Do not say only "$5 fee" when the fee bundles time, risk reduction, credit terms, and unresolved condition judgment.

## 12. HumanAvailabilityWindow

Purpose: keep human attention from becoming a fake liveness path.

Applies whenever an agent emits `human_question_if_any`, reaches a human-interrupt boundary, or depends on human approval before a deadline.

Hard requirements:

- human or role required,
- gate or decision requiring the human,
- deadline,
- expected response window,
- availability status,
- interrupt budget,
- allowed interrupt reasons,
- default action if unavailable,
- agent authority if acting without response.

Failure outcomes:

```text
block: action exceeds mandate and human is unavailable before deadline
waiver_required: human availability is unknown but action can safely wait
escalate: deadline-critical human decision has no safe default
```

Agent instruction:

If the human is available, ask. If not, act only inside mandate or choose the safe default. Do not pretend the trade can wait for a human who cannot respond in time.

## Wall Success Criteria

The walls are working when:

- a convenience-first agent can still accept with explicit waiver,
- a strict agent can block without inventing requirements,
- a seller-friendly agent gets a clear minimum close path,
- an adversarial seller cannot turn stale or scoped evidence into truth,
- an arbiter can name the missing matrix row instead of improvising.

## Deterministic Pressure Test

Runner:

- `simulations/protocol_wall_pressure_sim.py`

Latest passing run:

- `runs/protocol_wall_pressure_pokemon_alpha_check/REPORT.md`

The test runs Pokemon-alpha scenarios plus an outside-scope non-Pokemon control across five prompt variants. Pass criteria:

```text
silent_accepts == 0
uncontained_adversarial_attacks == 0
```

The first implementation failed with `silent_accepts == 3` because waived ambiguity was recorded by wall checks but summarized as normal `accept_or_continue` for non-buyer variants. The runner now returns `continue_with_recorded_waiver` whenever a waiver remains active.

## Wall Bundle Route Spendability Drill

Runner:

- `chain/script/wall_bundle_route_spendability_drill.py`

Latest passing run:

- `runs/wall_bundle_route_spendability_drill_20260520T030358Z/REPORT.md`

This drill moves the wall bundle into the local EVM route path:

```text
valid wall bundle + assembly history + route spendability citing both + route assembly witness -> RouteLocked
missing wall_bundle_hash or assembly_history_hash -> blocked before EVM route lock
stale wall_bundle_hash or assembly_history_hash -> blocked before EVM route lock
```

The contract consumes `route_spendability_hash`, stores route wall-bundle and assembly-history references, and validates a typed `routeAssemblyWitnessHash` derived from escrow contract, chain ID, trade ID, route hash, spendability hash, wall-bundle hash, assembly-history hash, item fingerprint, inventory lock, and route gate. Full wall and assembly graph semantics remain off-chain, but arbitrary witness substitution now fails closed.

The next gate follows the same pattern. Inspection cannot open from the old
seller-only delivery ABI. The contract consumes `delivery_spendability_hash`
and stores a typed `deliveryWitnessHash` derived from escrow contract, chain
ID, trade ID, committed route hash, delivery hash, spendability hash, and
delivery gate. This proves delivery contact placement, not delivery truth.
