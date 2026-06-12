# Protocol Walls v0.1

Generated 2026-05-20.

This document makes the first prompt-variant findings concrete. The walls do not prove physical truth. They prevent agents from spending ambiguous evidence as if it were settled truth.

This document has a sibling: `Protocol_Gaps_v0.1.md`. The walls name what can
be blocked, gated, validated, or made spendable. The gaps name what remains
permanently open at the physical/digital crossings.

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

Boundary rules:

- The protocol can make a lie accountable; it cannot make physical lying impossible.
- Deterministic does not automatically mean enforced. A catalog tool, search tool, or local classifier may be repeatable and useful while still remaining legible logic rather than spendable truth.
- Accountability has teeth only when deterrence and judgment supply are named: who loses what if they cheat, who is paid to judge, what remedy is actually available, and what happens if that judge does not show up.
- Legibility can be measured, but it must not be aggregated into a trust meter. A vector is legible; a decision from that vector is judged.

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
- catalog hash, row id, canonicalization, hash algorithm
- source, source URL, source language, printed name, set name, card number, match kind, source coverage, selected-by
- external card id for database-backed references
- explicit `not_claiming`: possession, condition, authenticity, seller inventory, seller card language, price truth
- policy hash if evidence defaults from a policy artifact are being used

Manual database-gap requirements:

- reason the source cannot anchor the print,
- human or agent note,
- supporting links or images when available,
- buyer acknowledgement before acceptance.

Failure outcomes:

```text
block: missing card reference, missing catalog hash, missing row id, or missing non-claims
waiver_required: manual database gap or language-equivalent row used for a claimed print
```

What this wall enforces:

- the trade is talking about a legible Pokemon print candidate,
- the candidate has source provenance,
- the candidate cites exact catalog bytes rather than a storage location,
- the source's limits remain visible.

What this wall does not enforce:

- seller possession,
- authenticity,
- condition,
- language/edition truth,
- price truth.

Agent instruction:

Say "this cites catalog hash H and row PMCG1-025." Do not say "the catalog proves the card."

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

## 13. DeterministicToolBoundary

Purpose: prevent catalog tools, image tools, pricing tools, and agent validators from becoming a shadow protocol.

Applies whenever a deterministic or model-assisted tool output is used in an intent packet, offer evaluation, evidence plan, route preparation, claim, reputation summary, or human-facing recommendation.

Implementation note (audit AUD-D4-001): the `tool_output_boundary` packet below
is the single-output form. The current No Rarity catalog tools satisfy this
boundary in an equivalent per-claim form instead — `evaluate_gate` returns an
`enforced` list (empty), plus `legible`, `judgment_needed`, and `missing`
partitions and an explicit `protocol_boundary` string ("cannot authorize
spendability or prove the physical card"). Either form is acceptable; what the
wall requires is that every tool claim is authority-labeled and that the output
names no enforced authority it does not have. Tools that emit a single fused
output should use the packet; tools that partition per claim need not wrap it.

Required fields:

```text
schema: marketplace.tool_output_boundary.v0.1
trade_id_or_session_id
tool_name
tool_version
input_refs
output_ref
output_label
authority_label: legible | judged | missing | enforced
not_claiming
human_summary
downstream_gate_requested
spendability_ref_if_any
signature_or_execution_receipt
```

Hard rules:

- Tool outputs default to `legible` or `judged`, not `enforced`.
- A `low_friction_pass`, exact catalog match, price band, image match, or deterministic evidence plan cannot move funds, route, claim, bond, reputation, or settlement by itself.
- If a tool output is used near a money-moving gate, the packet must name the extra authority that makes it spendable: actor signature, spendability packet, wall bundle, assembly history, verifier scope, arbiter policy, or human waiver.
- If a tool produces an `enforced` label, it must name the mechanical rule and the validator or contract that checked it.

Failure outcomes:

```text
block: deterministic tool output used as spendable authority without gate authority
waiver_required: human accepts a tool-derived shortcut with unresolved physical-world risk
escalate: agent, verifier, or arbiter disputes whether the tool output supports the claim
```

Agent instruction:

Say "the catalog tool found a strong candidate" or "the evidence plan passes the local checklist." Do not say "the card is verified" or "the route is safe" because a deterministic tool returned a pass.

## 14. EconomicDeterrenceProfile

Purpose: test whether accountability is economically meaningful rather than merely ceremonial.

Applies before buyer acceptance for value-bearing trades, and especially before any alpha trade above the low-value/no-bond threshold.

Required fields:

```text
schema: marketplace.economic_deterrence_profile.v0.1
trade_id
item_value
expected_seller_profit_if_honest
expected_fraud_profit_if_successful
seller_bond_amount
seller_bond_scope_ref
seller_identity_cost_refs
buyer_dispute_bond_amount
verifier_fee
verifier_liability_or_not_claiming
arbiter_fee
remedy_cap
expected_loss_if_caught
detection_assumptions
unpriced_risks
human_summary
```

Hard rules:

- Bond amount is enforced only if posted. Bond adequacy is judged.
- A seller bond must not be described as deterrent unless the profile shows which fraud paths it prices.
- A verifier fee must not imply verifier liability unless the verifier explicitly accepted liability or a remedy schedule says so.
- If expected fraud profit can exceed expected loss under a plausible scenario, the buyer must see that as a named residual risk before acceptance.

Failure outcomes:

```text
waiver_required: deterrence profile missing or weak for a material-value trade
escalate: bond adequacy, verifier liability, or remedy cap is disputed
block: trade policy requires deterrence profile and none is present
```

Agent instruction:

Say "the seller has $120 at stake against nonship and wrong-item claims, but condition downgrade remains mostly judgment." Do not say "bonded seller means safe."

## 15. JudgmentSupplyCommitment

Purpose: ensure the protocol does not defer to a verifier or arbiter who is only present as a registry entry.

Applies whenever a verifier, arbiter, automated arbiter, or human escalation path is used as part of acceptance, route lock, claim opening, cure, ruling, or settlement.

Required fields:

```text
schema: marketplace.judgment_supply_commitment.v0.1
trade_id
judgment_provider_id
provider_role: verifier | arbiter | automated_arbiter | human_escalation
policy_hash
scope
not_claiming
fee_source
response_sla
availability_window
conflict_disclosure_ref
remedy_cap
escalation_trigger
replacement_or_fallback
signature_or_delegation_ref
```

Hard rules:

- Registry membership is not judgment supply.
- Arbiter policy hash is not enough unless availability, fee source, remedy cap, and replacement path are legible.
- Automated arbiters require value caps, scope caps, and human escalation triggers.
- A verifier who only reviews photos must not be surfaced as an authenticity backstop.

Failure outcomes:

```text
block: policy requires judgment supply and no provider commitment exists
waiver_required: buyer accepts weak or unavailable judgment supply
escalate: provider conflict, scope, availability, or remedy authority is unclear
```

Agent instruction:

Say "there is a named arbiter with a 48-hour response window and a $250 remedy cap." Do not say "arbitration is available" if no one has committed to the case path.

## 16. LegibilityVectorIntegrity

Purpose: let tools measure evidence shape without turning measurement into a score that agents treat as spendable truth.

Applies whenever a catalog tool, evidence planner, image matcher, pricing tool, verifier assistant, buyer agent, seller agent, or arbiter assistant emits a structural read of an evidence bundle.

Required fields:

```text
schema: marketplace.legibility_vector.v0.1
vector_id
trade_id_or_session_id
subject_ref
gate_context
emitted_by
tool_or_agent_version
input_refs
dimensions:
  coverage
  independence
  continuity
  scope_fit
  cost_to_fake
  source_calibration
human_summary
no_aggregate_score: true
canonicalization
hash_algorithm
signature_or_execution_receipt
```

Each dimension must include `not_claiming`.
Unknown top-level or dimension fields are blocked; this is an allowlisted packet shape, not a forbidden-word list.

Forbidden fields inside the vector:

```text
score
trust_score
rating
grade
probability_of_truth
authenticity_probability
verdict
```

Hard rules:

- The vector may measure structure; it must not decide truth.
- Agent policy projection must be a separate judged packet.
- Source calibration is a track record against prior outcomes, not proof of this trade.
- A vector cannot move funds, route, bond, claim, reputation, or settlement.

Failure outcomes:

```text
block: vector contains score, verdict, or probability-of-truth field
block: vector contains unknown synonym field such as confidence, safety_index, or overall
block: vector dimension lacks not_claiming
waiver_required: human sees simplified legibility without expandable dimensions
escalate: party disputes an agent's judged projection from the vector
```

Agent instruction:

Say "coverage is high, independence is medium, continuity has a custody gap." Do not say "trust is 87/100."

## 17. SettlementRailFinality

Purpose: distinguish contract-settled escrow from reversible payment promises while preserving stablecoin and regulatory caveats.

Required fields:

```text
schema: marketplace.settlement_rail_terms.v0.1
rail_type
asset
chain_id
escrow_contract
escrow_funded
bond_asset
finality_model
chargeback_surface
issuer_or_admin_controls
freeze_or_blacklist_surface
custody_or_money_transmission_notes
conversion_failure_path
not_claiming
```

Hard rules:

- Off-chain fiat authorization cannot be labeled final settlement.
- Stablecoin escrow must disclose issuer, blacklist, off-ramp, custody, and legal-process surfaces.
- Escrowed digital money can prove money state; it cannot prove card truth.

Failure outcomes:

```text
block: fiat payment is treated as final settlement
block: stablecoin rail omits issuer or freeze caveats
waiver_required: buyer or seller accepts conversion/off-ramp risk
escalate: parties dispute rail finality or payout currency
```

Agent instruction:

Say "escrow is funded and contract-settled." Do not say "crypto means no third party can ever intervene."

## 18. BondHistoryExchange

Purpose: let new sellers substitute scoped capital for missing history without making "bonded" mean "trusted."

Required fields:

```text
schema: marketplace.bond_history_exchange.v0.1
seller_ref
trade_value
seller_history_profile
portable_reputation_refs
external_trust_import_refs
clean_receipt_count
claim_count
upheld_claim_count
bond_hit_count
imported_trust_bond_relief_cap
imported_trust_value_tier_scope
required_bond_amount
required_bond_fraction_bps
covered_failures
excluded_failures
release_conditions
calibration_cohort_ref
not_claiming
```

Hard rules:

- Bond reduction requires clean receipts, imported proof, stronger evidence, or scoped underwriting.
- A bond must name covered and excluded failures.
- A reduced bond remains judged policy, not proof of seller honesty.
- Third-party underwriting must be a scoped actor commitment with fee, recourse, exclusions, and track record.
- Imported-trust bond relief is capped by the estimated acquisition cost of the imported reputation bundle.
- Imported trust is also capped by value-tier scope fit; low-value feedback cannot justify a high-value raw-card bond waiver.
- Current account or domain control does not prove ownership of historical reputation.
- Seller-controlled surfaces must be marked as correlated, not independent.
- Imported trust decays as native protocol receipts accumulate.

Failure outcomes:

```text
block: bond reduction has no receipt, proof, evidence, or underwriter basis
block: bond is described as general seller trust
waiver_required: buyer accepts low bond against high-value or thin-history seller
escalate: parties dispute bond coverage, release, or underwriter recourse
```

Agent instruction:

Say "this seller can post $288 against nonship/wrong-item/misdescription." Do not say "this seller bought trust."

## 19. ExternalTrustImport

Purpose: let sellers reuse outside reputation without turning platform-hosted reputation into portable truth.

Required fields:

```text
schema: marketplace.external_trust_import.v0.1
import_id
seller_ref
issued_at
expires_at
control_proofs
observation_receipts
observed_value_tiers
legibility_vector_ref
acquisition_cost_estimate
bond_relief_cap
decay_policy
tos_fragility
not_claiming
signature_or_execution_receipt
```

Control proofs must include:

```text
source_type
source_url_or_handle
nonce
nonce_location
content_hash
observed_at
observed_by
source_terms_fragility
not_claiming
```

Hard rules:

- External reputation is observable, not bindable.
- A control proof means current control of a surface only.
- Observation receipts say what was visible at a time; they do not certify platform truth.
- `not_claiming` must include ownership of account history, possession, authenticity, condition truth, platform endorsement, future platform availability, and high-value scope if history is low-tier.
- Imported trust may reduce friction, attention burden, value caps, or bond only through a separate judged policy projection.
- Imported bond relief cannot exceed estimated acquisition cost of the imported bundle.
- Imported bond relief cannot exceed value-tier scope fit.
- Source terms and platform availability fragility must be visible for scraper or snapshot-based evidence.
- External imports expire and must be refreshed or displaced by native protocol receipts.

Failure outcomes:

```text
block: imported bond relief exceeds acquisition cost or value-tier scope
block: account control is described as ownership of history
block: seller-controlled surfaces are counted as independent
waiver_required: buyer accepts stale, fragile, or low-scope imported reputation
escalate: parties dispute seller continuity, account ownership, platform observation, or scope fit
```

Agent instruction:

Say "the seller currently controls this shop domain and marketplace profile; it can reduce some friction, but it does not prove this card or the account's history." Do not say "the seller is verified by eBay/Google/TCGplayer."

## Wall Success Criteria

The walls are working when:

- a convenience-first agent can still accept with explicit waiver,
- a strict agent can block without inventing requirements,
- a seller-friendly agent gets a clear minimum close path,
- an adversarial seller cannot turn stale or scoped evidence into truth,
- an arbiter can name the missing matrix row instead of improvising.
- deterministic tools improve legibility without becoming route, bond, or settlement authority,
- legibility vectors improve measurement without becoming scores or verdicts,
- settlement rail finality is named without hiding issuer, off-ramp, or regulatory risk,
- bond requirements fall only through clean receipts, imported proof, stronger evidence, or accountable underwriting,
- imported reputation lowers friction only within acquisition-cost, value-tier, continuity, and decay limits,
- catalog rows are cited by content hash and row id while evidence policy remains separately hashed,
- an economically rational adversarial seller cannot find a positive-expected-value fraud path inside the alpha defaults without that weakness becoming visible,
- verifier and arbiter availability is treated as a committed service path, not a hopeful registry lookup.

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

Audit boundary (AUD-D1D2-001, AUD-D2-SW-001): route and delivery spendability
are contract-derived typed digests bound to escrow contract, chain ID, trade ID,
gate, leg, bound artifact hashes, and issuer; the contract requires the supplied
hash to equal the derived value. The same hash cannot be replayed inside one
trade or across gates, and a digest valid for one trade cannot validate for
another — cross-trade replay is blocked on-chain by construction. The digest is
self-minted by the committing party (issuer = `msg.sender`): binding and
non-replayable, not an independent authorization. Wall-bundle and
assembly-history graph coherence remain off-chain.

The next gate follows the same pattern. Inspection cannot open from the old
seller-only delivery ABI. The contract consumes `delivery_spendability_hash`
and stores a typed `deliveryWitnessHash` derived from escrow contract, chain
ID, trade ID, committed route hash, delivery hash, spendability hash, and
delivery gate. This proves delivery contact placement, not delivery truth.
