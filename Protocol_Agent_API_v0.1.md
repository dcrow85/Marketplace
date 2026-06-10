# Protocol Agent API v0.1

Generated 2026-05-20.

The alpha API exposes trade actions, not packet internals. Each action returns enough structure for an agent to preserve ambiguity instead of flattening it into general trust.

## Alpha Scope

The alpha accepts Pokemon single-card trades only.

```text
domain: tcg
game: pokemon
trade_template: pokemon_single_card_alpha
supported_forms:
  - raw_card
  - graded_slab
value_band_usd: 100..2000 preferred
```

Non-Pokemon cards, sealed product, lots, bundles, other collectibles, and general physical goods should return `blocked_outside_alpha_scope` unless the caller is running an explicitly marked future-domain experiment.

## Pokemon Card Reference Layer

Alpha actions should attach a `CardReferenceCandidate` before offer acceptance. The reference layer gives agents a catalog anchor for known Pokemon prints; it does not prove the seller's physical card.

```text
card_reference_packet:
  source:
  source_card_id:
  catalog_hash:
  row_id:
  row_hash:
  policy_hash:
  canonicalization:
  hash_algorithm:
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

Agent-facing actions:

```text
lookupCardReference(query)
selectCardReferenceCandidate(card_id)
createManualCardReferenceGap()
compareSellerEvidenceToReference()
```

Local alpha endpoints:

```text
GET /api/catalog/search?q=<human text or Pokemon TCG API q>&pageSize=8
GET /api/catalog/agent-search?q=<human text>&pageSize=12&page=1
GET /api/catalog/cards/<source_card_id>
```

Catalog endpoints return an `ExternalContactReceipt` so agents can cite the lookup as contact evidence without treating it as object proof. `agent-search` also returns the catalog agent's parsed field read, API query, and caveats.

For the No Rarity alpha catalog, local endpoints also return a `catalog_citation`
with `(catalog_hash, row_id)` plus `row_hash` and `policy_hash`. Historical
packets cite bytes, not a storage location.

Hard API rule:

```text
catalog_candidate cannot become possession, condition, authenticity, price truth, route success, or seller trust.
catalog_hash plus row_id anchors a catalog row; it does not prove a physical seller card.
policy_hash anchors evidence defaults; it is policy, not fact.
```

## Buyer Want Drafting

The first buyer-side contact is a Buyer Want packet. A local agent may interpret the human phrase, but deterministic code must bind the result to the catalog row, evidence profile, pricing-discovery policy, and not-claiming boundaries.

Local alpha script:

```text
python3 simulations/buyer_want_agent.py "I want a Japanese No Rarity Charizard LP or better under $1500 shipped" --model gemma4:31b
```

Packet shape:

```text
marketplace.buyer_want.v0.1
  buyer_agent
  human_text
  catalog_ref
  condition_floor
  form
  max_total_price
  evidence_expectation
  pricing_policy
  human_contact_policy
  cost_dimensional_integrity
  route_preferences
  agent_boundaries
  not_claiming
```

Hard API rules:

```text
Gemma may interpret human desire; it may not promote desire into protocol fact.
The catalog row is not spendable as seller-card proof.
Pricing remains agent discovery until a timestamped cost packet is attached.
Buyer Want does not fund escrow, reserve inventory, verify No Rarity truth, or approve route lock.
```

## Seller Attention Fee Terms

When a buyer request creates seller work, the API should return explicit fee terms instead of hiding the cost in chat. Agents negotiate the amount and credit policy; the protocol records and enforces the terms.

```text
evidence_request_fee_terms:
  request_id:
  trade_id:
  requested_by:
  requested_from:
  work_required:
  reason:
  amount:
  currency:
  payer:
  recipient:
  escrowed:
  trigger_for_payment:
  credit_policy:
    credited_if_purchase:
    credit_amount:
    seller_keeps_amount:
  refund_policy:
  quality_floor:
  expires_at:
  dispute_path:
  not_claiming:
  signature:
```

Supported credit policies:

```text
full_credit_if_purchase
partial_credit_if_purchase
no_purchase_credit
fee_waived
deposit_required_for_hold_or_prep
```

Hard API rule:

```text
seller work requests that affect seller time, inventory hold, item preparation, privacy, or opportunity cost must disclose payment, credit, refund, and expiry terms before the seller is obligated to act.
```

## Settlement Rail Terms

Agents should expose the rail as a settlement fact, not a payment vibe.

```text
settlement_rail_terms:
  schema: marketplace.settlement_rail_terms.v0.1
  rail_type: native_eth | erc20_stablecoin | offchain_fiat_reference
  asset:
  chain_id:
  escrow_contract:
  escrow_funded:
  bond_asset:
  buyer_display_currency:
  seller_payout_currency:
  finality_model:
  chargeback_surface:
  issuer_or_admin_controls:
  freeze_or_blacklist_surface:
  custody_or_money_transmission_notes:
  conversion_provider:
  conversion_failure_path:
  not_claiming:
```

Hard API rules:

```text
fiat payment != settlement.
stablecoin escrow must preserve issuer, blacklist, custody, off-ramp, and regulatory caveats.
escrowed digital money proves funds and rule-bound movement; it does not prove physical-card truth.
```

## Seller Bootstrap Terms

A seller-facing alpha action should make bilateral accountability visible.

```text
seller_bootstrap_terms:
  buyer_prefunded:
  seller_attention_fee_terms_ref:
  seller_bond_ref:
  bond_history_exchange_ref:
  item_fingerprint_ref:
  claim_matrix_ref:
  return_leg_requirements:
  settlement_rail_terms_ref:
  seller_payout_conditions:
  buyer_claim_conditions:
  not_claiming:
```

Hard API rule:

```text
Bond reductions require clean receipts, imported proof, or accountable underwriting. Do not reduce bond because an agent feels good about the seller.
```

## External Trust Import

Seller onboarding may include outside reputation, but the API must keep it
observable rather than bindable.

```text
external_trust_import:
  schema: marketplace.external_trust_import.v0.1
  import_id:
  seller_ref:
  issued_at:
  expires_at:
  control_proofs:
    - source_type:
      source_url_or_handle:
      nonce:
      nonce_location:
      content_hash:
      observed_at:
      observed_by:
      source_terms_fragility:
      not_claiming:
  observation_receipts:
    - source_type:
      observed_fields:
      observed_value_tier_distribution:
      content_hash:
      observed_at:
      source_terms_fragility:
      not_claiming:
  observed_value_tiers:
  legibility_vector_ref:
  acquisition_cost_estimate:
  bond_relief_cap:
  decay_policy:
  tos_fragility:
  not_claiming:
  signature_or_execution_receipt:
```

Agent-facing actions:

```text
createExternalTrustImport()
refreshExternalTrustImport()
projectImportBondRelief()
explainImportedTrustLimits()
```

Hard API rules:

```text
external_trust_import cannot prove possession, authenticity, condition, or seller honesty.
current account control cannot become ownership of historical account reputation.
seller-controlled surfaces must be marked correlated_but_not_independent.
imported_trust_bond_relief cannot exceed acquisition-cost estimate or value-tier scope.
source fragility and platform terms risk must remain visible.
```

## Cost Dimensional Integrity

Agents should avoid collapsing cost fields into a scalar until the human action boundary. If a scalar is shown, it must remain reversible to the native dimensions underneath.

```text
cost_dimensional_integrity:
  native_dimensions:
    seller_time:
      minutes:
      fee:
      credit_policy:
      opportunity_cost:
    buyer_attention:
      interrupts:
      response_deadline:
      risk_acceptances:
    agent_attention:
      tokens:
      tool_calls:
      api_calls:
      latency:
      cost:
    verifier_attention:
      fee:
      scope:
      sla:
    route_cost:
      dollars:
      days:
      insurance:
      liability_gap:
    trust_gap:
      missing_proofs:
      bond_required:
      payout_delay:
    condition_risk:
      ambiguity_class:
      evidence_gap:
      claim_consequence:
  scalar_summary:
  conversion_rationale:
  reversible: true | false
  risk_reduced:
  not_reduced:
```

Hard API rule:

```text
scalar_summary is display, not authority. It cannot be used to spend evidence, waive risk, move route, release funds, or penalize a bond unless the native dimensions and their signed terms are still available.
```

## Human Availability Window

Agents should know whether their human can answer before a deadline. If the human is unavailable, the agent must either act inside mandate or choose the configured safe default.

```text
human_availability:
  human_id:
  agent_id:
  available_before_deadline:
  expected_response_window:
  channels:
  interrupt_budget_remaining:
  may_interrupt_for:
  must_not_interrupt_for:
  default_action_if_unavailable:
  availability_expires_at:
```

Hard API rule:

```text
human_question_if_any must be paired with human_availability. Do not emit a human question as the liveness path when the human is unlikely to answer before the gate deadline.
```

## Memory Currencies

Every API response separates two memory currencies:

```text
trajectory_capacity: accumulated actor or pathway capacity
assembly_placement: situated admissibility for this trade, object, route, gate, policy, waiver, or claim
```

Trajectory examples:

- seller controls a shop domain,
- seller controls an eBay account,
- seller has prior receipts,
- seller has good route history,
- seller has prior clean cure behavior.

Assembly examples:

- this item fingerprint,
- this inventory lock,
- this route risk owner,
- this arbiter policy hash,
- this evidence profile,
- this buyer waiver,
- this claim matrix row.

Hard API rule:

```text
trajectory_capacity cannot move funds, route, bond, claim, or reputation by itself.
assembly_placement can become spendable only at the named gate.
```

## Legibility Vectors

Agents may measure evidence shape, but they must not collapse it into a trust meter.

```text
legibility_vector:
  schema: marketplace.legibility_vector.v0.1
  vector_id:
  subject_ref:
  gate_context:
  dimensions:
    coverage:
      present:
      missing:
      waived:
      not_claiming:
    independence:
      source_count:
      party_count:
      channel_count:
      not_claiming:
    continuity:
      checkpoints:
      breaks:
      not_claiming:
    scope_fit:
      claim_supported:
      gate_supported:
      out_of_scope:
      not_claiming:
    cost_to_fake:
      estimate_band:
      rationale:
      unpriced_attack_paths:
      not_claiming:
    source_calibration:
      cohort_ref:
      sample_size:
      observed_claim_rate_bps:
      caveats:
      not_claiming:
  no_aggregate_score: true
```

If an agent turns a legibility vector into a recommendation, it must emit a separate judged projection:

```text
agent_policy_projection:
  schema: marketplace.agent_policy_projection.v0.1
  policy_id:
  legibility_vector_ref:
  authority_label: judged
  projected_claim_rate_bps:
  risk_band:
  decision:
  not_claiming:
```

Hard API rules:

```text
legibility_vector cannot contain score, trust_score, rating, grade, verdict, probability_of_truth, or authenticity_probability.
legibility_vector uses an allowlisted schema; synonym fields like confidence, safety_index, or overall must be rejected.
legibility_vector cannot move funds, route, bond, claim, reputation, or settlement.
source_calibration is a track record from receipts and claims, not proof this card is true.
```

## Response Envelope

All actions return:

```text
action:
trade_id:
decision:
cost_dimensional_integrity:
human_availability:
currency_integrity:
settlement_rail_terms:
seller_bootstrap_terms:
memory:
  trajectory_capacity:
  assembly_placement:
legibility:
  vector:
  policy_projection:
  calibration_caveats:
spendability:
  gate:
  required:
  present:
  missing:
packet_commitments:
  wall_bundle_hash:
  wall_bundle_evm_ref:
  assembly_history_hash:
  assembly_history_evm_ref:
  route_assembly_witness_hash:
  packet_refs:
  route_spendability_hash:
  placement_integrity:
walls:
enforced_facts:
legible_evidence:
judgment_needed:
packets_required:
packets_to_generate:
human_question_if_any:
```

Allowed decision families:

```text
accept_or_continue
accept_with_waiver
continue_with_recorded_waiver
blocked
blocked_until_waiver
request_more_evidence
revise_offer_or_request_waiver
semantic_attack_contained
escalate
escalate_with_matrix_row
route_locked
route_lock_blocked
claim_packet_complete
```

## Action: evaluateOffer

Purpose: decide whether an offer can move toward buyer acceptance.

Inputs:

```text
intent
seller_offer
evidence_refs
seller_trust_vectors
route_terms
buyer_value_map
prompt_variant
```

Required wall checks:

- `CardReferenceCandidate`
- `CostDimensionalIntegrity`, when costs are summarized
- `HumanAvailabilityWindow`, when human response is needed before a deadline
- `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000`
- `BuyerRiskAcceptance`
- `BondScope`
- `ProofVectorScope`
- `RouteInsuranceRiskOwner`
- `ExternalAvailabilityCovenant`

Output rule:

If any waiver exists, the decision must contain `waiver`. It must never return ordinary `accept_or_continue` while unresolved ambiguity remains waived.

Packet commitment rule:

The response must include a `wall_bundle_hash` derived from canonical wall packets. The bundle may be cited by later spendability packets, but it does not prove the physical truth of the evidence.

## Action: requestEvidence

Purpose: ask the seller for additional evidence without treating seller time as free.

Inputs:

```text
trade_id
requesting_agent
requested_evidence
reason
buyer_value_map
seller_attention_policy
credit_preference
deadline
```

Output rule:

The action must return either an existing evidence reference, a seller-declined response, or `EvidenceRequestFeeTerms`.

Generated packets:

- `EvidenceRequest`
- `EvidenceRequestFeeTerms`, when work is not free

## Action: quoteEvidenceRequestFee

Purpose: let the seller agent price the requested work.

Quote examples:

```text
$5, fully credited if buyer purchases
$5, $2.50 credited if buyer purchases
$5, no credit because request is outside ordinary offer work
$20 deposit for inventory hold or preparation
```

Output rule:

The quote must say what work is covered, what event triggers payment, whether the buyer receives purchase credit, and what happens if the buyer disappears.

## Action: acceptEvidenceRequestFee

Purpose: bind the buyer to the attention fee before the seller performs the work.

Hard blocks:

- missing fee amount,
- missing credit policy,
- missing trigger for payment,
- missing expiry,
- missing dispute path,
- quality floor claims more than the protocol can mechanically evaluate.

Generated packets:

- `AttentionFeeEscrowed`, when the fee is escrowed
- `EvidenceRequested`

## Action: attachCostDimensionalTrace

Purpose: attach the native cost dimensions behind a simplified human-visible cost.

Inputs:

```text
trade_id
scalar_summary
native_dimensions
conversion_rationale
risk_reduced
not_reduced
reversible_refs
```

Output rule:

Any scalar shown to a human must be expandable back to native dimensions before it can support a waiver, fee acceptance, route approval, claim, or bond action.

## Action: updateHumanAvailability

Purpose: let an agent declare whether its human can answer before a deadline.

Inputs:

```text
human_id
agent_id
expected_response_window
channels
interrupt_budget_remaining
may_interrupt_for
must_not_interrupt_for
default_action_if_unavailable
availability_expires_at
signature_or_agent_authority_ref
```

Output rule:

If a later action emits `human_question_if_any`, the response must cite a current human availability window or explain why human response is unknown and which safe default applies.

## Action: acceptOfferAndFundEscrow

Purpose: create the escrow path after offer evaluation.

Hard blocks:

- missing item fingerprint,
- missing inventory lock,
- missing proof vector scope,
- missing bond scope,
- missing route risk owner,
- missing arbiter policy hash,
- incomplete or invalid buyer risk acceptance when waiver is needed.

Generated packets:

- `EscrowTerms`
- `BuyerRiskAcceptance`, when needed
- `AcceptanceReceipt`

Output rule:

Funding may proceed with waived ambiguity only if the waiver is recorded as assembly placement.

Packet commitment rule:

Funding decisions must carry the current `wall_bundle_hash` and packet refs for any required assembly placement. This is the EVM-adjacent bridge: the chain may later cite the bundle hash without parsing every packet.

## Action: sellerCommitRoute

Purpose: lock route after item and evidence gates are satisfied.

Required spendability:

```text
gate: route_commitment
required:
  - item_fingerprint_hash
  - inventory_lock_hash
  - route_insurance_risk_owner_packet
  - route_spendability_hash
  - wall_bundle_hash
  - assembly_history_hash
  - route_assembly_witness_hash
```

Hard rule:

Route cannot lock on seller trajectory capacity. Shop trust, eBay proof, and curated status do not substitute for route spendability.

Packet commitment rule:

Route lock requires a `route_spendability_hash` that cites the current `wall_bundle_hash` and `assembly_history_hash`, plus a nonzero `route_assembly_witness_hash` supplied to escrow. The route spendability packet is permission to use the assembled route provenance at `route_commitment`, not proof that the card is authentic or correctly graded.

Terminal floor rule:

Route lock must read the whole wall set, not only the route packet subset. Any active `block`, unaccepted `waiver_required`, or `escalate` result prevents ordinary `route_locked`.

EVM-adjacent route replay:

- `chain/script/wall_bundle_route_spendability_drill.py`
- `runs/wall_bundle_route_spendability_drill_20260520T030358Z/REPORT.md`

This drill proves:

```text
valid wall bundle + route spendability citing bundle -> route lock succeeds
missing wall_bundle_hash -> off-chain validator blocks before EVM route call
stale/wrong wall_bundle_hash -> off-chain validator blocks before EVM route call
```

## Action: markDelivered

Purpose: open inspection only after route-bound delivery contact has been placed.

Required spendability:

```text
gate: delivery_confirmation
required:
  - delivery_hash
  - delivery_spendability_hash
  - delivery_witness_hash
```

Hard rule:

A seller or arbiter delivery memo is not enough to open inspection. The delivery call must consume delivery spendability and carry a typed witness derived from escrow contract, chain ID, trade ID, committed route hash, delivery hash, spendability hash, and delivery gate.

Boundary:

The delivery witness proves gate placement, not physical truth. Carrier scans, local handoff memos, buyer acknowledgement, and verifier or arbiter observations remain evidence for agents and arbiters to judge.

## Action: openClaim

Purpose: create a claim packet and classify missing evidence before arbitration.

Required wall check:

- `ClaimClosureEvidenceMatrix`

Output rule:

The API must name the matrix row and missing seller, buyer, or route evidence. It must not emit a generic "arbiter decides" result.

## Action: resolveClaim

Purpose: apply policy-bound judgment.

Required placement:

- claim type,
- arbiter policy hash,
- evidence matrix row,
- remedy cap,
- bond scope,
- authority signature.

Output rule:

Arbiter judgment can move funds or bond only inside the scoped policy and bond coverage.

## Minimal Method Set

```text
evaluateOffer()
acceptOfferAndFundEscrow()
sellerCommitRoute()
openClaim()
resolveClaim()
settle()
getReceipt()
```

The methods may hide packet construction from humans, but they must not hide the enforced/legible/judged split from agents.

## Deterministic API Probe

Runner:

- `simulations/protocol_agent_api_probe.py`
- `simulations/protocol_wall_packets.py`

Canonical passing run:

- `runs/protocol_agent_api_pokemon_alpha_check/REPORT.md`

Pass criteria:

```text
normal_accept_with_waiver == 0
trajectory_overclaim_accepted == 0
route_lock_without_spendability == 0
generic_claim_escalation == 0
missing_packet_commitment_refs == 0
fundable_without_wall_bundle == 0
route_locked_without_route_spendability_packet == 0
route_locked_without_route_wall_bundle == 0
outside_alpha_scope_accepted == 0
```
