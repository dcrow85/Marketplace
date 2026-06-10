# Unified Pokemon Alpha Stress: unified_stress_20260521T010121Z

- Trades: `250`
- Route-ready trades: `105` (42.0%)
- Pass: `True`
- EVM replay: `passed`

## Pass Criteria

```json
{
  "outside_scope_trade_routed": 0,
  "route_locked_when_walls_block": 0,
  "route_locked_with_unaccepted_waiver": 0,
  "route_locked_with_wrong_wall_bundle": 0,
  "route_locked_without_complete_placement": 0,
  "route_locked_without_route_minimum_packets": 0,
  "route_locked_without_route_spendability_packet": 0,
  "route_locked_without_route_wall_bundle": 0,
  "silent_accepts": 0,
  "trusted_source_laundered_to_truth": 0,
  "uncontained_adversarial_attacks": 0
}
```

## Agent Market Shape

```json
{
  "arbitration_modes": {
    "arbiter_agent_delegated": 1,
    "automated": 11,
    "automated_escalated_to_human": 10,
    "human_arbiter": 31,
    "human_arbiter_agent_assisted": 16,
    "none": 181
  },
  "friction_triggers": {
    "authenticity_or_identity_risk": 9,
    "bond_penalty_above_auto_cap": 4,
    "case_scope_outside_automation": 2,
    "delivery_risk_ambiguous": 4,
    "evidence_ambiguity": 35,
    "human_arbiter_selected_prelock": 48,
    "in_person_handoff_ambiguity": 3,
    "refund_above_auto_cap": 5,
    "route_gap_owner_review": 6,
    "seller_trust_gap": 17
  },
  "outcomes": {
    "authenticity_flag": 3,
    "buyer_remorse": 6,
    "clean_close": 175,
    "insured_damaged": 6,
    "insured_lost": 8,
    "local_handoff_dispute": 3,
    "material_misdescription": 6,
    "minor_condition_delta": 12,
    "porch_theft": 4,
    "route_delay": 8,
    "seller_nonship": 7,
    "underinsured_lost": 3,
    "uninsured_lost": 3,
    "wrong_card": 6
  },
  "routes": {
    "insured_ship": 175,
    "international_ship": 31,
    "local_meetup": 8,
    "show_pickup": 10,
    "underinsured_ship": 20,
    "uninsured_ship": 6
  },
  "seller_trust": {
    "known": 70,
    "new": 28,
    "trusted": 86,
    "unknown": 66
  },
  "value_bands": {
    "grail": 29,
    "high": 60,
    "low": 82,
    "mid": 79
  }
}
```

## Walls Found

```json
{
  "attacks": {
    "bond_gap": 11,
    "claim_missing_buyer_arrival": 18,
    "full_compliant": 80,
    "manual_database_gap": 9,
    "missing_external_availability": 17,
    "missing_inventory_lock": 11,
    "missing_route_spendability": 14,
    "outside_scope_magic": 11,
    "scope_laundering": 15,
    "sparse_evidence_no_waiver": 18,
    "sparse_evidence_with_waiver": 8,
    "spendability_missing_wall_ref": 11,
    "stale_wall_bundle_ref": 15,
    "unassigned_insurance_gap": 12
  },
  "top_wall_id_outcomes": {
    "BondScope:pass": 239,
    "BondScope:waiver_required": 11,
    "BuyerRiskAcceptance:pass": 250,
    "CardReferenceCandidate:pass": 241,
    "CardReferenceCandidate:waiver_required": 9,
    "ClaimClosureEvidenceMatrix:escalate": 4,
    "ClaimClosureEvidenceMatrix:pass": 246,
    "ExternalAvailabilityCovenant:pass": 207,
    "ExternalAvailabilityCovenant:waived": 8,
    "ExternalAvailabilityCovenant:waiver_required": 35,
    "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:pass": 237,
    "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required": 10,
    "POKEMON_ALPHA_SCOPE:block": 11,
    "POKEMON_ALPHA_SCOPE:pass": 239,
    "ProofVectorScope:block": 15,
    "ProofVectorScope:pass": 235,
    "RouteInsuranceRiskOwner:block": 12,
    "RouteInsuranceRiskOwner:pass": 238
  },
  "wall_outcomes": {
    "block": 39,
    "escalate": 4,
    "pass": 2132,
    "waived": 10,
    "waiver_required": 65
  }
}
```

## Agent Decisions

```json
{
  "adversarial_seller:accept_or_continue": 143,
  "adversarial_seller:blocked": 39,
  "adversarial_seller:continue_with_recorded_waiver": 8,
  "adversarial_seller:semantic_attack_contained": 60,
  "arbiter_policy_agent:accept_or_continue": 143,
  "arbiter_policy_agent:blocked": 39,
  "arbiter_policy_agent:continue_with_recorded_waiver": 8,
  "arbiter_policy_agent:escalate_with_matrix_row": 4,
  "arbiter_policy_agent:request_policy_waiver_or_block": 56,
  "convenience_first_buyer:accept_or_continue": 143,
  "convenience_first_buyer:accept_with_waiver": 8,
  "convenience_first_buyer:blocked": 39,
  "convenience_first_buyer:blocked_until_waiver": 56,
  "convenience_first_buyer:escalate": 4,
  "seller_friendly_market_maker:accept_or_continue": 143,
  "seller_friendly_market_maker:blocked": 39,
  "seller_friendly_market_maker:continue_with_recorded_waiver": 8,
  "seller_friendly_market_maker:escalate": 4,
  "seller_friendly_market_maker:revise_offer_or_request_waiver": 56,
  "strict_boundary_buyer:accept_or_continue": 143,
  "strict_boundary_buyer:blocked": 39,
  "strict_boundary_buyer:escalate": 4,
  "strict_boundary_buyer:request_more_evidence": 64
}
```

## EVM Replay

```json
{
  "attempted": true,
  "output_path": "/Users/che/Marketplace/runs/unified_stress_20260521T010121Z/evm_replay_output.txt",
  "passed": true,
  "report": "/Users/che/Marketplace/runs/agent_market_evm_replay_20260521T010121Z/REPORT.md",
  "returncode": 0,
  "trade_ids": [
    "SIM-0111",
    "SIM-0093",
    "SIM-0081",
    "SIM-0124",
    "SIM-0087",
    "SIM-0001",
    "SIM-0095",
    "SIM-0164",
    "SIM-0015",
    "SIM-0247"
  ]
}
```

## Sample Wall Contacts

### SIM-0134 / missing_route_spendability

- Card: Masaki Gengar
- Value: `$4141` (grail)
- Seller trust: `known`
- Route: `local_meetup`
- Outcome: `local_handoff_dispute`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `bundle=True; spendability=False; cites_current=False`

### SIM-0090 / stale_wall_bundle_ref

- Card: Japanese Neo Discovery Espeon holo
- Value: `$3404` (grail)
- Seller trust: `unknown`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `bundle=True; spendability=True; cites_current=False`

### SIM-0086 / missing_external_availability

- Card: Neo Umbreon holo
- Value: `$3314` (grail)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `wrong_card`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0203 / sparse_evidence_no_waiver

- Card: Vending Series Mewtwo
- Value: `$3241` (grail)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0049 / missing_route_spendability

- Card: Vending Series Mewtwo
- Value: `$2887` (grail)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `insured_damaged`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `bundle=True; spendability=False; cites_current=False`

### SIM-0003 / sparse_evidence_no_waiver

- Card: Japanese Fossil Dragonite holo
- Value: `$2800` (high)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `authenticity_flag`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0050 / spendability_missing_wall_ref

- Card: Sabrina's Gengar
- Value: `$2751` (grail)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `seller_nonship`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `bundle=True; spendability=True; cites_current=False`

### SIM-0006 / missing_inventory_lock

- Card: Japanese Neo Discovery Espeon holo
- Value: `$2524` (grail)
- Seller trust: `unknown`
- Route: `local_meetup`
- Outcome: `local_handoff_dispute`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0212 / manual_database_gap

- Card: Japanese Fossil Dragonite holo
- Value: `$2496` (grail)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `route_delay`
- Route ready: `False`
- Wall contacts: `CardReferenceCandidate:waiver_required`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0183 / bond_gap

- Card: Vending Gastly
- Value: `$2424` (grail)
- Seller trust: `new`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `BondScope:waiver_required`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0199 / scope_laundering

- Card: Neo Umbreon holo
- Value: `$2344` (grail)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0237 / unassigned_insurance_gap

- Card: CD Promo Venusaur
- Value: `$2340` (grail)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `RouteInsuranceRiskOwner:block`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0008 / spendability_missing_wall_ref

- Card: Carddass prism oddball
- Value: `$2324` (grail)
- Seller trust: `trusted`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `bundle=True; spendability=True; cites_current=False`

### SIM-0208 / spendability_missing_wall_ref

- Card: Vending Gastly
- Value: `$2080` (grail)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `insured_damaged`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `bundle=True; spendability=True; cites_current=False`

### SIM-0024 / missing_external_availability

- Card: Japanese Neo Discovery Espeon holo
- Value: `$2075` (grail)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0056 / manual_database_gap

- Card: Japanese Fossil Dragonite holo
- Value: `$1729` (grail)
- Seller trust: `new`
- Route: `underinsured_ship`
- Outcome: `seller_nonship`
- Route ready: `False`
- Wall contacts: `CardReferenceCandidate:waiver_required`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0031 / sparse_evidence_no_waiver

- Card: Neo Umbreon holo
- Value: `$1521` (grail)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `minor_condition_delta`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0144 / missing_external_availability

- Card: Sabrina's Gengar
- Value: `$1510` (grail)
- Seller trust: `trusted`
- Route: `underinsured_ship`
- Outcome: `underinsured_lost`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `bundle=True; spendability=True; cites_current=True`

## Artifacts

- `summary.json`: aggregate metrics and pass/fail criteria.
- `trades.jsonl`: agent-market rows plus wall state, packet commitments, and route gate status.
- `wall_cases.jsonl`: compact wall-only records.
- `agent_decisions.csv`: every prompt variant decision for each trade.
- `evm_replay_output.txt`: stdout from the optional Anvil replay.

