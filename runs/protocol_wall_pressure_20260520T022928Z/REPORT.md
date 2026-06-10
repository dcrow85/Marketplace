# Protocol Wall Pressure Test: 2026-05-20T02:29:28Z

## Result

- Pass: `True`
- Scenarios: `6`
- Prompt variants: `5`
- Runs: `30`
- Silent accepts of unresolved ambiguity: `0`
- Uncontained adversarial semantic attacks: `0`

Decision counts:

- `accept_or_continue`: `10`
- `accept_with_waiver`: `1`
- `blocked`: `10`
- `continue_with_recorded_waiver`: `3`
- `escalate`: `3`
- `escalate_with_matrix_row`: `1`
- `request_more_evidence`: `1`
- `semantic_attack_contained`: `1`

## Interpretation

The v0.1 walls prevent silent progress on the original weak offer. A convenience-first buyer can still proceed only when missing evidence is carried in `BuyerRiskAcceptance`. The adversarial hash-compliant offer is blocked by proof scope, route gap ownership, and bond scope checks.

Claim closure is now policy-bound. Missing buyer arrival or opening evidence does not let an arbiter improvise; the matrix names the missing row evidence and escalates.

## Scenario Outcomes

### original_offer / strict_boundary_buyer

- Decision: `blocked`
- Rationale: hard wall missing; agent cannot narrate around it
- Wall outcomes: `{'block': 4, 'pass': 2, 'waiver_required': 1}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:arbiter_policy_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:bond_scope_packet; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:evidence_profile_id; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:inventory_lock_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:item_fingerprint_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:proof_vector_scope_packet; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:route_insurance_risk_owner_packet; BondScope:bond_scope_packet; ProofVectorScope:proof_vector_scope_packet; RouteInsuranceRiskOwner:route_insurance_risk_owner_packet; ExternalAvailabilityCovenant:external_availability_covenant`

### original_offer / convenience_first_buyer

- Decision: `blocked`
- Rationale: hard wall missing; agent cannot narrate around it
- Wall outcomes: `{'block': 4, 'pass': 2, 'waiver_required': 1}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:arbiter_policy_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:bond_scope_packet; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:evidence_profile_id; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:inventory_lock_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:item_fingerprint_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:proof_vector_scope_packet; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:route_insurance_risk_owner_packet; BondScope:bond_scope_packet; ProofVectorScope:proof_vector_scope_packet; RouteInsuranceRiskOwner:route_insurance_risk_owner_packet; ExternalAvailabilityCovenant:external_availability_covenant`

### original_offer / seller_friendly_market_maker

- Decision: `blocked`
- Rationale: hard wall missing; agent cannot narrate around it
- Wall outcomes: `{'block': 4, 'pass': 2, 'waiver_required': 1}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:arbiter_policy_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:bond_scope_packet; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:evidence_profile_id; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:inventory_lock_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:item_fingerprint_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:proof_vector_scope_packet; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:route_insurance_risk_owner_packet; BondScope:bond_scope_packet; ProofVectorScope:proof_vector_scope_packet; RouteInsuranceRiskOwner:route_insurance_risk_owner_packet; ExternalAvailabilityCovenant:external_availability_covenant`

### original_offer / adversarial_seller

- Decision: `blocked`
- Rationale: hard wall missing; agent cannot narrate around it
- Wall outcomes: `{'block': 4, 'pass': 2, 'waiver_required': 1}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:arbiter_policy_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:bond_scope_packet; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:evidence_profile_id; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:inventory_lock_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:item_fingerprint_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:proof_vector_scope_packet; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:route_insurance_risk_owner_packet; BondScope:bond_scope_packet; ProofVectorScope:proof_vector_scope_packet; RouteInsuranceRiskOwner:route_insurance_risk_owner_packet; ExternalAvailabilityCovenant:external_availability_covenant`

### original_offer / arbiter_policy_agent

- Decision: `blocked`
- Rationale: hard wall missing; agent cannot narrate around it
- Wall outcomes: `{'block': 4, 'pass': 2, 'waiver_required': 1}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:arbiter_policy_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:bond_scope_packet; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:evidence_profile_id; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:inventory_lock_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:item_fingerprint_hash; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:proof_vector_scope_packet; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:route_insurance_risk_owner_packet; BondScope:bond_scope_packet; ProofVectorScope:proof_vector_scope_packet; RouteInsuranceRiskOwner:route_insurance_risk_owner_packet; ExternalAvailabilityCovenant:external_availability_covenant`

### scoped_offer_with_buyer_waiver / strict_boundary_buyer

- Decision: `request_more_evidence`
- Rationale: strict buyer refuses waiver path by default
- Wall outcomes: `{'pass': 5, 'waived': 2}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:edge_or_border_closeups; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:external_availability_covenant; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:four_corner_closeups; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:fresh_nonce_possession; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:surface_or_holo_angle; ExternalAvailabilityCovenant:external_availability_covenant`

### scoped_offer_with_buyer_waiver / convenience_first_buyer

- Decision: `accept_with_waiver`
- Rationale: allowed only as unresolved risk
- Wall outcomes: `{'pass': 5, 'waived': 2}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:edge_or_border_closeups; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:external_availability_covenant; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:four_corner_closeups; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:fresh_nonce_possession; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:surface_or_holo_angle; ExternalAvailabilityCovenant:external_availability_covenant`

### scoped_offer_with_buyer_waiver / seller_friendly_market_maker

- Decision: `continue_with_recorded_waiver`
- Rationale: waived ambiguity remains visible in the trade state
- Wall outcomes: `{'pass': 5, 'waived': 2}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:edge_or_border_closeups; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:external_availability_covenant; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:four_corner_closeups; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:fresh_nonce_possession; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:surface_or_holo_angle; ExternalAvailabilityCovenant:external_availability_covenant`

### scoped_offer_with_buyer_waiver / adversarial_seller

- Decision: `continue_with_recorded_waiver`
- Rationale: waived ambiguity remains visible in the trade state
- Wall outcomes: `{'pass': 5, 'waived': 2}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:edge_or_border_closeups; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:external_availability_covenant; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:four_corner_closeups; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:fresh_nonce_possession; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:surface_or_holo_angle; ExternalAvailabilityCovenant:external_availability_covenant`

### scoped_offer_with_buyer_waiver / arbiter_policy_agent

- Decision: `continue_with_recorded_waiver`
- Rationale: waived ambiguity remains visible in the trade state
- Wall outcomes: `{'pass': 5, 'waived': 2}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:edge_or_border_closeups; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:external_availability_covenant; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:four_corner_closeups; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:fresh_nonce_possession; TCG_ACCEPTANCE_PROFILE_RAW_500_2000:surface_or_holo_angle; ExternalAvailabilityCovenant:external_availability_covenant`

### full_wall_compliant_offer / strict_boundary_buyer

- Decision: `accept_or_continue`
- Rationale: all active walls passed
- Wall outcomes: `{'pass': 7}`

### full_wall_compliant_offer / convenience_first_buyer

- Decision: `accept_or_continue`
- Rationale: all active walls passed
- Wall outcomes: `{'pass': 7}`

### full_wall_compliant_offer / seller_friendly_market_maker

- Decision: `accept_or_continue`
- Rationale: all active walls passed
- Wall outcomes: `{'pass': 7}`

### full_wall_compliant_offer / adversarial_seller

- Decision: `accept_or_continue`
- Rationale: all active walls passed
- Wall outcomes: `{'pass': 7}`

### full_wall_compliant_offer / arbiter_policy_agent

- Decision: `accept_or_continue`
- Rationale: all active walls passed
- Wall outcomes: `{'pass': 7}`

### adversarial_hash_compliant_offer / strict_boundary_buyer

- Decision: `blocked`
- Rationale: hard wall missing; agent cannot narrate around it
- Wall outcomes: `{'block': 3, 'pass': 2, 'waiver_required': 2}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:flaw_callouts; BondScope:failure_to_cure; BondScope:material_condition_mismatch; BondScope:route_negligence; BondScope:underinsurance_without_buyer_acceptance; BondScope:wrong_item; ProofVectorScope:authenticity; ProofVectorScope:current_possession; ProofVectorScope:raw_card_condition; RouteInsuranceRiskOwner:risk_owner_for_gap; ExternalAvailabilityCovenant:external_availability_covenant`

### adversarial_hash_compliant_offer / convenience_first_buyer

- Decision: `blocked`
- Rationale: hard wall missing; agent cannot narrate around it
- Wall outcomes: `{'block': 3, 'pass': 2, 'waiver_required': 2}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:flaw_callouts; BondScope:failure_to_cure; BondScope:material_condition_mismatch; BondScope:route_negligence; BondScope:underinsurance_without_buyer_acceptance; BondScope:wrong_item; ProofVectorScope:authenticity; ProofVectorScope:current_possession; ProofVectorScope:raw_card_condition; RouteInsuranceRiskOwner:risk_owner_for_gap; ExternalAvailabilityCovenant:external_availability_covenant`

### adversarial_hash_compliant_offer / seller_friendly_market_maker

- Decision: `blocked`
- Rationale: hard wall missing; agent cannot narrate around it
- Wall outcomes: `{'block': 3, 'pass': 2, 'waiver_required': 2}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:flaw_callouts; BondScope:failure_to_cure; BondScope:material_condition_mismatch; BondScope:route_negligence; BondScope:underinsurance_without_buyer_acceptance; BondScope:wrong_item; ProofVectorScope:authenticity; ProofVectorScope:current_possession; ProofVectorScope:raw_card_condition; RouteInsuranceRiskOwner:risk_owner_for_gap; ExternalAvailabilityCovenant:external_availability_covenant`

### adversarial_hash_compliant_offer / adversarial_seller

- Decision: `blocked`
- Rationale: hard wall missing; agent cannot narrate around it
- Wall outcomes: `{'block': 3, 'pass': 2, 'waiver_required': 2}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:flaw_callouts; BondScope:failure_to_cure; BondScope:material_condition_mismatch; BondScope:route_negligence; BondScope:underinsurance_without_buyer_acceptance; BondScope:wrong_item; ProofVectorScope:authenticity; ProofVectorScope:current_possession; ProofVectorScope:raw_card_condition; RouteInsuranceRiskOwner:risk_owner_for_gap; ExternalAvailabilityCovenant:external_availability_covenant`

### adversarial_hash_compliant_offer / arbiter_policy_agent

- Decision: `blocked`
- Rationale: hard wall missing; agent cannot narrate around it
- Wall outcomes: `{'block': 3, 'pass': 2, 'waiver_required': 2}`
- Missing or unresolved: `TCG_ACCEPTANCE_PROFILE_RAW_500_2000:flaw_callouts; BondScope:failure_to_cure; BondScope:material_condition_mismatch; BondScope:route_negligence; BondScope:underinsurance_without_buyer_acceptance; BondScope:wrong_item; ProofVectorScope:authenticity; ProofVectorScope:current_possession; ProofVectorScope:raw_card_condition; RouteInsuranceRiskOwner:risk_owner_for_gap; ExternalAvailabilityCovenant:external_availability_covenant`

### claim_closure_missing_buyer_evidence / strict_boundary_buyer

- Decision: `escalate`
- Rationale: judgment required under policy
- Wall outcomes: `{'escalate': 1, 'pass': 6}`
- Missing or unresolved: `ClaimClosureEvidenceMatrix:wrong_item:buyer:arrival_photos; ClaimClosureEvidenceMatrix:wrong_item:buyer:return_fingerprint; ClaimClosureEvidenceMatrix:condition_downgrade:buyer:immediate_arrival_photos; ClaimClosureEvidenceMatrix:empty_package:buyer:opening_sequence; ClaimClosureEvidenceMatrix:empty_package:buyer:package_exterior`

### claim_closure_missing_buyer_evidence / convenience_first_buyer

- Decision: `escalate`
- Rationale: judgment required under policy
- Wall outcomes: `{'escalate': 1, 'pass': 6}`
- Missing or unresolved: `ClaimClosureEvidenceMatrix:wrong_item:buyer:arrival_photos; ClaimClosureEvidenceMatrix:wrong_item:buyer:return_fingerprint; ClaimClosureEvidenceMatrix:condition_downgrade:buyer:immediate_arrival_photos; ClaimClosureEvidenceMatrix:empty_package:buyer:opening_sequence; ClaimClosureEvidenceMatrix:empty_package:buyer:package_exterior`

### claim_closure_missing_buyer_evidence / seller_friendly_market_maker

- Decision: `escalate`
- Rationale: judgment required under policy
- Wall outcomes: `{'escalate': 1, 'pass': 6}`
- Missing or unresolved: `ClaimClosureEvidenceMatrix:wrong_item:buyer:arrival_photos; ClaimClosureEvidenceMatrix:wrong_item:buyer:return_fingerprint; ClaimClosureEvidenceMatrix:condition_downgrade:buyer:immediate_arrival_photos; ClaimClosureEvidenceMatrix:empty_package:buyer:opening_sequence; ClaimClosureEvidenceMatrix:empty_package:buyer:package_exterior`

### claim_closure_missing_buyer_evidence / adversarial_seller

- Decision: `semantic_attack_contained`
- Rationale: ambiguity stayed legible instead of becoming trust
- Wall outcomes: `{'escalate': 1, 'pass': 6}`
- Missing or unresolved: `ClaimClosureEvidenceMatrix:wrong_item:buyer:arrival_photos; ClaimClosureEvidenceMatrix:wrong_item:buyer:return_fingerprint; ClaimClosureEvidenceMatrix:condition_downgrade:buyer:immediate_arrival_photos; ClaimClosureEvidenceMatrix:empty_package:buyer:opening_sequence; ClaimClosureEvidenceMatrix:empty_package:buyer:package_exterior`

### claim_closure_missing_buyer_evidence / arbiter_policy_agent

- Decision: `escalate_with_matrix_row`
- Rationale: arbiter names missing evidence under policy
- Wall outcomes: `{'escalate': 1, 'pass': 6}`
- Missing or unresolved: `ClaimClosureEvidenceMatrix:wrong_item:buyer:arrival_photos; ClaimClosureEvidenceMatrix:wrong_item:buyer:return_fingerprint; ClaimClosureEvidenceMatrix:condition_downgrade:buyer:immediate_arrival_photos; ClaimClosureEvidenceMatrix:empty_package:buyer:opening_sequence; ClaimClosureEvidenceMatrix:empty_package:buyer:package_exterior`

### claim_closure_with_required_evidence / strict_boundary_buyer

- Decision: `accept_or_continue`
- Rationale: all active walls passed
- Wall outcomes: `{'pass': 7}`

### claim_closure_with_required_evidence / convenience_first_buyer

- Decision: `accept_or_continue`
- Rationale: all active walls passed
- Wall outcomes: `{'pass': 7}`

### claim_closure_with_required_evidence / seller_friendly_market_maker

- Decision: `accept_or_continue`
- Rationale: all active walls passed
- Wall outcomes: `{'pass': 7}`

### claim_closure_with_required_evidence / adversarial_seller

- Decision: `accept_or_continue`
- Rationale: all active walls passed
- Wall outcomes: `{'pass': 7}`

### claim_closure_with_required_evidence / arbiter_policy_agent

- Decision: `accept_or_continue`
- Rationale: all active walls passed
- Wall outcomes: `{'pass': 7}`

