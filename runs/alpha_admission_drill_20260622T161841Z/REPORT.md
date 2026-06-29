# Alpha Admission Drill

- Passed: `True`
- Clean case admitted: `True`
- Negative cases: `42`
- Mutation teeth: `42`
- Gate counts: `{"A1": 8, "A2": 4, "A3": 6, "A4": 8, "A5": 3, "A6": 5, "A7": 8}`

## Boundary

This drill makes A1-A7 executable as deterministic admission checks. It does not claim the chain enforces them yet.

## Killed Mutations

- `A1.policy_snapshot_present` via `missing_policy_snapshot`: killed `True`
- `A1.known_policy_version` via `unknown_policy_version`: killed `True`
- `A1.route_class_match` via `wrong_route_class`: killed `True`
- `A1.trade_value_cap` via `trade_value_over_cap`: killed `True`
- `A1.aggregate_caps` via `aggregate_exposure_over_cap`: killed `True`
- `A1.allowed_delivery_mode` via `unadmitted_delivery_mode`: killed `True`
- `A1.allowed_dispute_branch` via `unadmitted_dispute_branch`: killed `True`
- `A1.manual_override_bounded` via `weak_manual_override`: killed `True`
- `A2.asserted_not_final` via `delivery_asserted_marked_final`: killed `True`
- `A2.no_single_interested_witness` via `seller_witness_auto_release`: killed `True`
- `A2.witness_scope_expiry_conflict` via `delivery_witness_unscoped`: killed `True`
- `A2.no_missing_witness_auto_non_delivery` via `missing_witness_auto_refund`: killed `True`
- `A3.claim_type_bound` via `remedy_missing_claim_type`: killed `True`
- `A3.remedy_type_bound` via `remedy_missing_type`: killed `True`
- `A3.amount_ceiling` via `remedy_over_amount`: killed `True`
- `A3.return_custody_for_full_refund` via `full_refund_without_return`: killed `True`
- `A3.evidence_root_bound` via `remedy_missing_evidence_root`: killed `True`
- `A3.appeal_final` via `remedy_appeal_not_final`: killed `True`
- `A4.canonical_preimage` via `spendability_missing_preimage`: killed `True`
- `A4.constituent_claims` via `spendability_missing_claims`: killed `True`
- `A4.validator_hashes` via `spendability_missing_validator_hash`: killed `True`
- `A4.issuer_authority` via `spendability_unbounded_issuer`: killed `True`
- `A4.registry_snapshot` via `spendability_missing_registry`: killed `True`
- `A4.availability_and_expiry` via `spendability_missing_da`: killed `True`
- `A4.no_model_or_reputation_authority` via `model_output_mints_spendability`: killed `True`
- `A4.author_issuer_separation` via `same_author_and_issuer`: killed `True`
- `A5.freeze_before_bond` via `snapshot_after_bond`: killed `True`
- `A5.required_roots` via `snapshot_missing_roots`: killed `True`
- `A5.no_retroactive_governance` via `retroactive_governance`: killed `True`
- `A6.availability_receipts` via `evidence_missing_availability`: killed `True`
- `A6.access_and_keys` via `evidence_missing_access_keys`: killed `True`
- `A6.notice_and_equal_windows` via `evidence_asymmetric_deadline`: killed `True`
- `A6.bundle_and_retention` via `evidence_missing_bundle`: killed `True`
- `A6.theft_sensitive_policy` via `evidence_public_theft_data`: killed `True`
- `A7.min_clusters` via `capacity_too_few_clusters`: killed `True`
- `A7.remove_largest_resilience` via `capacity_largest_cluster_failure`: killed `True`
- `A7.peak_slots` via `capacity_under_peak`: killed `True`
- `A7.replay_sla` via `capacity_sla_low`: killed `True`
- `A7.no_conflicted_fallbacks` via `capacity_conflicted_fallback`: killed `True`
- `A7.no_silent_substitution` via `capacity_silent_substitution`: killed `True`
- `A7.assignment_shares` via `capacity_share_over_limit`: killed `True`
- `A7.reserved_capacity` via `capacity_unreserved_exposure`: killed `True`
