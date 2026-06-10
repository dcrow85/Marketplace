# Marketplace Access-Assembly Audit: 2026-06-09T14:51:45Z

## Result

- Pass: `True`
- Cases: `14`
- Validator replay agrees: `True`
- No route lock from trajectory capacity alone: `True`
- No ordinary accept when unresolved ambiguity is waived: `True`
- No claim escalation without named matrix row: `True`
- No route lock without wall bundle, spendability, and typed witness: `True`
- No evidence promoted beyond not-claiming boundary: `True`

Terminal floor counts:

- `block`: `5`
- `escalate`: `3`
- `pass`: `4`
- `waiver_required`: `2`

## Interpretation

The audit treats seller history and proof vectors as trajectory capacity. They can inform agent judgment, but they do not move offer, funding, route, claim, or bond gates without gate-specific assembly placement. Waivers remain visible as `waiver_required`, route lock needs wall bundle plus route spendability plus typed route witness, and disputed closure remains policy-bound instead of improvised.

## Gate Rows

### trajectory_only_offer

- Gate: `offer_evaluation`
- Decision: `blocked`
- Predicted floor: `block`
- Observed floor: `block`
- Validator agrees: `True`
- Trajectory capacity: `seller_controls_ebay_account, seller_controls_shop_domain`
- Assembly placement: `none`
- Hard missing variables: `CardReferenceCandidate, arbiter_policy_hash, bond_scope_packet, proof_vector_scope_packet, route_insurance_risk_owner_packet`
- Waiver-bearing variables: `external_availability_covenant`

### waived_offer

- Gate: `offer_evaluation`
- Decision: `accept_with_waiver`
- Predicted floor: `waiver_required`
- Observed floor: `waiver_required`
- Validator agrees: `True`
- Trajectory capacity: `seller_controls_ebay_account, seller_controls_shop_domain`
- Assembly placement: `BuyerRiskAcceptance, CardReferenceCandidate, arbiter_policy_hash, bond_scope_packet, inventory_lock_hash, item_fingerprint_hash, proof_vector_scope_packet, route_insurance_risk_owner_packet, wall_bundle_hash`
- Hard missing variables: `none`
- Waiver-bearing variables: `edge_or_border_closeups, external_availability_covenant, four_corner_closeups, fresh_nonce_possession, surface_or_holo_angle`

### compliant_offer

- Gate: `offer_evaluation`
- Decision: `accept_or_continue`
- Predicted floor: `pass`
- Observed floor: `pass`
- Validator agrees: `True`
- Trajectory capacity: `seller_controls_ebay_account, seller_controls_shop_domain`
- Assembly placement: `CardReferenceCandidate, arbiter_policy_hash, bond_scope_packet, inventory_lock_hash, item_fingerprint_hash, proof_vector_scope_packet, route_insurance_risk_owner_packet, wall_bundle_hash`
- Hard missing variables: `none`
- Waiver-bearing variables: `none`

### adversarial_offer

- Gate: `offer_evaluation`
- Decision: `blocked`
- Predicted floor: `block`
- Observed floor: `block`
- Validator agrees: `True`
- Trajectory capacity: `authenticity, raw_card_condition, seller_controls_ebay_account, seller_controls_shop_domain`
- Assembly placement: `CardReferenceCandidate, arbiter_policy_hash, bond_scope_packet, inventory_lock_hash, item_fingerprint_hash, proof_vector_scope_packet, route_insurance_risk_owner_packet, wall_bundle_hash`
- Hard missing variables: `none`
- Waiver-bearing variables: `external_availability_covenant, failure_to_cure, material_condition_mismatch, route_negligence, underinsurance_without_buyer_acceptance, wrong_item`

### trajectory_only_funding

- Gate: `funding`
- Decision: `funding_blocked`
- Predicted floor: `block`
- Observed floor: `block`
- Validator agrees: `True`
- Trajectory capacity: `seller_controls_ebay_account, seller_controls_shop_domain`
- Assembly placement: `none`
- Hard missing variables: `arbiter_policy_hash, bond_scope_packet, card_reference_packet, evidence_profile_id, inventory_lock_hash, item_fingerprint_hash, proof_vector_scope_packet, route_insurance_risk_owner_packet, wall_bundle_hash`
- Waiver-bearing variables: `external_availability_covenant`

### waived_funding

- Gate: `funding`
- Decision: `accept_with_recorded_waiver`
- Predicted floor: `waiver_required`
- Observed floor: `waiver_required`
- Validator agrees: `True`
- Trajectory capacity: `seller_controls_ebay_account, seller_controls_shop_domain`
- Assembly placement: `BuyerRiskAcceptance, CardReferenceCandidate, arbiter_policy_hash, bond_scope_packet, inventory_lock_hash, item_fingerprint_hash, proof_vector_scope_packet, route_insurance_risk_owner_packet, wall_bundle_hash`
- Hard missing variables: `none`
- Waiver-bearing variables: `edge_or_border_closeups, external_availability_covenant, four_corner_closeups, fresh_nonce_possession, surface_or_holo_angle`

### compliant_funding

- Gate: `funding`
- Decision: `escrow_fundable`
- Predicted floor: `pass`
- Observed floor: `pass`
- Validator agrees: `True`
- Trajectory capacity: `seller_controls_ebay_account, seller_controls_shop_domain`
- Assembly placement: `CardReferenceCandidate, arbiter_policy_hash, bond_scope_packet, inventory_lock_hash, item_fingerprint_hash, proof_vector_scope_packet, route_insurance_risk_owner_packet, wall_bundle_hash`
- Hard missing variables: `none`
- Waiver-bearing variables: `none`

### trajectory_only_route

- Gate: `route_commitment`
- Decision: `route_lock_blocked`
- Predicted floor: `block`
- Observed floor: `block`
- Validator agrees: `True`
- Trajectory capacity: `seller_controls_ebay_account, seller_controls_shop_domain`
- Assembly placement: `none`
- Hard missing variables: `inventory_lock_hash, item_fingerprint_hash, routeWallBundleHash, route_insurance_risk_owner_packet, route_spendability_hash, wall_bundle_hash`
- Waiver-bearing variables: `external_availability_covenant`

### compliant_route_without_spendability

- Gate: `route_commitment`
- Decision: `route_lock_blocked`
- Predicted floor: `block`
- Observed floor: `block`
- Validator agrees: `True`
- Trajectory capacity: `seller_controls_ebay_account, seller_controls_shop_domain`
- Assembly placement: `CardReferenceCandidate, arbiter_policy_hash, bond_scope_packet, inventory_lock_hash, item_fingerprint_hash, proof_vector_scope_packet, route_insurance_risk_owner_packet, wall_bundle_hash`
- Hard missing variables: `routeWallBundleHash, route_spendability_hash`
- Waiver-bearing variables: `none`

### route_ready

- Gate: `route_commitment`
- Decision: `route_locked`
- Predicted floor: `pass`
- Observed floor: `pass`
- Validator agrees: `True`
- Trajectory capacity: `seller_controls_ebay_account, seller_controls_shop_domain`
- Assembly placement: `CardReferenceCandidate, arbiter_policy_hash, bond_scope_packet, inventory_lock_hash, item_fingerprint_hash, proof_vector_scope_packet, routeWallBundleHash, route_insurance_risk_owner_packet, route_spendability_hash, wall_bundle_hash`
- Hard missing variables: `none`
- Waiver-bearing variables: `none`

### claim_missing_buyer_evidence

- Gate: `claim_opening`
- Decision: `escalate_with_matrix_row`
- Predicted floor: `escalate`
- Observed floor: `escalate`
- Validator agrees: `True`
- Trajectory capacity: `seller_controls_ebay_account, seller_controls_shop_domain`
- Assembly placement: `CardReferenceCandidate, arbiter_policy_hash, bond_scope_packet, inventory_lock_hash, item_fingerprint_hash, proof_vector_scope_packet, route_insurance_risk_owner_packet, wall_bundle_hash`
- Hard missing variables: `none`
- Waiver-bearing variables: `none`

### claim_complete

- Gate: `claim_opening`
- Decision: `claim_packet_complete`
- Predicted floor: `pass`
- Observed floor: `pass`
- Validator agrees: `True`
- Trajectory capacity: `seller_controls_ebay_account, seller_controls_shop_domain`
- Assembly placement: `CardReferenceCandidate, arbiter_policy_hash, bond_scope_packet, inventory_lock_hash, item_fingerprint_hash, proof_vector_scope_packet, route_insurance_risk_owner_packet, wall_bundle_hash`
- Hard missing variables: `none`
- Waiver-bearing variables: `none`

### bond_missing_buyer_evidence

- Gate: `bond_action`
- Decision: `escalate`
- Predicted floor: `escalate`
- Observed floor: `escalate`
- Validator agrees: `True`
- Trajectory capacity: `seller_controls_ebay_account, seller_controls_shop_domain`
- Assembly placement: `CardReferenceCandidate, arbiter_policy_hash, bond_scope_packet, inventory_lock_hash, item_fingerprint_hash, proof_vector_scope_packet, route_insurance_risk_owner_packet, wall_bundle_hash`
- Hard missing variables: `none`
- Waiver-bearing variables: `none`

### bond_complete_claim_still_needs_ruling

- Gate: `bond_action`
- Decision: `escalate`
- Predicted floor: `escalate`
- Observed floor: `escalate`
- Validator agrees: `True`
- Trajectory capacity: `seller_controls_ebay_account, seller_controls_shop_domain`
- Assembly placement: `CardReferenceCandidate, arbiter_policy_hash, bond_scope_packet, inventory_lock_hash, item_fingerprint_hash, proof_vector_scope_packet, route_insurance_risk_owner_packet, wall_bundle_hash`
- Hard missing variables: `none`
- Waiver-bearing variables: `none`

