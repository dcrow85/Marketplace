# Unified Pokemon Alpha Stress: unified_stress_20260611T170433Z

- Trades: `50`
- Route-ready trades: `11` (22.0%)
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
  "route_locked_without_route_assembly_witness": 0,
  "route_locked_without_route_minimum_packets": 0,
  "route_locked_without_route_spendability_packet": 0,
  "silent_accepts": 0,
  "trusted_source_laundered_to_truth": 0,
  "uncontained_adversarial_attacks": 0
}
```

## Agent Market Shape

```json
{
  "arbitration_modes": {
    "automated": 6,
    "automated_escalated_to_human": 4,
    "human_arbiter": 17,
    "human_arbiter_agent_assisted": 8,
    "none": 15
  },
  "friction_triggers": {
    "authenticity_or_identity_risk": 6,
    "bond_penalty_above_auto_cap": 1,
    "delivery_risk_ambiguous": 3,
    "evidence_ambiguity": 22,
    "human_arbiter_selected_prelock": 25,
    "in_person_handoff_ambiguity": 3,
    "refund_above_auto_cap": 1,
    "route_gap_owner_review": 6,
    "seller_trust_gap": 11
  },
  "outcomes": {
    "authenticity_flag": 3,
    "buyer_remorse": 1,
    "clean_close": 14,
    "insured_lost": 3,
    "local_handoff_dispute": 3,
    "material_misdescription": 4,
    "minor_condition_delta": 4,
    "porch_theft": 3,
    "route_delay": 3,
    "seller_nonship": 3,
    "underinsured_lost": 3,
    "uninsured_lost": 3,
    "wrong_card": 3
  },
  "routes": {
    "insured_ship": 33,
    "international_ship": 3,
    "local_meetup": 3,
    "show_pickup": 2,
    "underinsured_ship": 5,
    "uninsured_ship": 4
  },
  "seller_trust": {
    "known": 16,
    "new": 12,
    "trusted": 14,
    "unknown": 8
  },
  "value_bands": {
    "grail": 10,
    "high": 12,
    "low": 19,
    "mid": 9
  }
}
```

## Walls Found

```json
{
  "attacks": {
    "bond_gap": 3,
    "claim_missing_buyer_arrival": 3,
    "full_compliant": 4,
    "manual_database_gap": 3,
    "missing_external_availability": 3,
    "missing_inventory_lock": 4,
    "missing_route_spendability": 4,
    "outside_scope_magic": 3,
    "scope_laundering": 4,
    "sparse_evidence_no_waiver": 4,
    "sparse_evidence_with_waiver": 4,
    "spendability_missing_wall_ref": 4,
    "stale_wall_bundle_ref": 3,
    "unassigned_insurance_gap": 4
  },
  "top_wall_id_outcomes": {
    "BondScope:pass": 47,
    "BondScope:waiver_required": 3,
    "BuyerRiskAcceptance:pass": 50,
    "CardReferenceCandidate:pass": 47,
    "CardReferenceCandidate:waiver_required": 3,
    "ClaimClosureEvidenceMatrix:pass": 48,
    "ExternalAvailabilityCovenant:pass": 39,
    "ExternalAvailabilityCovenant:waived": 4,
    "ExternalAvailabilityCovenant:waiver_required": 7,
    "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:pass": 44,
    "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waived": 2,
    "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required": 4,
    "POKEMON_ALPHA_SCOPE:block": 3,
    "POKEMON_ALPHA_SCOPE:pass": 47,
    "ProofVectorScope:block": 4,
    "ProofVectorScope:pass": 46,
    "RouteInsuranceRiskOwner:block": 4,
    "RouteInsuranceRiskOwner:pass": 46
  },
  "wall_outcomes": {
    "block": 11,
    "escalate": 2,
    "pass": 414,
    "waived": 6,
    "waiver_required": 17
  }
}
```

## Agent Decisions

```json
{
  "adversarial_seller:accept_or_continue": 20,
  "adversarial_seller:blocked": 11,
  "adversarial_seller:continue_with_recorded_waiver": 4,
  "adversarial_seller:semantic_attack_contained": 15,
  "arbiter_policy_agent:accept_or_continue": 20,
  "arbiter_policy_agent:blocked": 11,
  "arbiter_policy_agent:continue_with_recorded_waiver": 4,
  "arbiter_policy_agent:escalate_with_matrix_row": 2,
  "arbiter_policy_agent:request_policy_waiver_or_block": 13,
  "convenience_first_buyer:accept_or_continue": 20,
  "convenience_first_buyer:accept_with_waiver": 4,
  "convenience_first_buyer:blocked": 11,
  "convenience_first_buyer:blocked_until_waiver": 13,
  "convenience_first_buyer:escalate": 2,
  "seller_friendly_market_maker:accept_or_continue": 20,
  "seller_friendly_market_maker:blocked": 11,
  "seller_friendly_market_maker:continue_with_recorded_waiver": 4,
  "seller_friendly_market_maker:escalate": 2,
  "seller_friendly_market_maker:revise_offer_or_request_waiver": 13,
  "strict_boundary_buyer:accept_or_continue": 20,
  "strict_boundary_buyer:blocked": 11,
  "strict_boundary_buyer:escalate": 2,
  "strict_boundary_buyer:request_more_evidence": 17
}
```

## EVM Replay

```json
{
  "attempted": true,
  "output_path": "/Users/che/Marketplace/runs/unified_stress_20260611T170433Z/evm_replay_output.txt",
  "passed": true,
  "report": "/Users/che/Marketplace/runs/agent_market_evm_replay_20260611T170433Z/REPORT.md",
  "returncode": 0,
  "trade_ids": [
    "SIM-0030",
    "SIM-0044",
    "SIM-0011",
    "SIM-0043",
    "SIM-0016"
  ]
}
```

## Sample Wall Contacts

### SIM-0005 / unassigned_insurance_gap

- Card: Vending Series Mewtwo
- Value: `$3674` (grail)
- Seller trust: `trusted`
- Route: `show_pickup`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `RouteInsuranceRiskOwner:block`
- Route gate: `assembly_witness=True; spendability=True; cites_current=True`

### SIM-0022 / spendability_missing_wall_ref

- Card: CD Promo Venusaur
- Value: `$3331` (grail)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=True; spendability=True; cites_current=False`

### SIM-0020 / missing_inventory_lock

- Card: Vending Series Mewtwo
- Value: `$3298` (grail)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `porch_theft`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=True; spendability=True; cites_current=True`

### SIM-0035 / missing_route_spendability

- Card: Vending Series Mewtwo
- Value: `$2036` (grail)
- Seller trust: `new`
- Route: `underinsured_ship`
- Outcome: `seller_nonship`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0040 / outside_scope_magic

- Card: CD Promo Venusaur
- Value: `$1510` (high)
- Seller trust: `new`
- Route: `underinsured_ship`
- Outcome: `underinsured_lost`
- Route ready: `False`
- Wall contacts: `POKEMON_ALPHA_SCOPE:block`
- Route gate: `assembly_witness=True; spendability=True; cites_current=True`

### SIM-0010 / missing_external_availability

- Card: Neo Umbreon holo
- Value: `$1377` (high)
- Seller trust: `trusted`
- Route: `underinsured_ship`
- Outcome: `underinsured_lost`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=True; spendability=True; cites_current=True`

### SIM-0031 / sparse_evidence_no_waiver

- Card: Sabrina's Gengar
- Value: `$930` (high)
- Seller trust: `known`
- Route: `local_meetup`
- Outcome: `local_handoff_dispute`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=True; spendability=True; cites_current=True`

### SIM-0014 / manual_database_gap

- Card: CD Promo Venusaur
- Value: `$879` (high)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `CardReferenceCandidate:waiver_required`
- Route gate: `assembly_witness=True; spendability=True; cites_current=True`

### SIM-0037 / stale_wall_bundle_ref

- Card: Sabrina's Gengar
- Value: `$666` (high)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `route_delay`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=True; spendability=True; cites_current=False`

### SIM-0003 / sparse_evidence_no_waiver

- Card: Sabrina's Gengar
- Value: `$606` (high)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=True; spendability=True; cites_current=True`

### SIM-0038 / missing_external_availability

- Card: Sabrina's Gengar
- Value: `$573` (high)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=True; spendability=True; cites_current=True`

### SIM-0004 / scope_laundering

- Card: CD Promo Venusaur
- Value: `$550` (grail)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `authenticity_flag`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=True; spendability=True; cites_current=True`

### SIM-0027 / bond_gap

- Card: Sabrina's Gengar
- Value: `$550` (grail)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `authenticity_flag`
- Route ready: `False`
- Wall contacts: `BondScope:waiver_required`
- Route gate: `assembly_witness=True; spendability=True; cites_current=True`

### SIM-0024 / missing_external_availability

- Card: Vending Series Mewtwo
- Value: `$439` (high)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `wrong_card`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=True; spendability=True; cites_current=True`

### SIM-0023 / stale_wall_bundle_ref

- Card: Sabrina's Gengar
- Value: `$307` (mid)
- Seller trust: `new`
- Route: `international_ship`
- Outcome: `seller_nonship`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=True; spendability=True; cites_current=False`

### SIM-0026 / outside_scope_magic

- Card: Neo Umbreon holo
- Value: `$296` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `route_delay`
- Route ready: `False`
- Wall contacts: `POKEMON_ALPHA_SCOPE:block`
- Route gate: `assembly_witness=True; spendability=True; cites_current=True`

### SIM-0021 / missing_route_spendability

- Card: Japanese Fossil Dragonite holo
- Value: `$278` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0049 / missing_route_spendability

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$250` (mid)
- Seller trust: `unknown`
- Route: `local_meetup`
- Outcome: `local_handoff_dispute`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

## Artifacts

- `summary.json`: aggregate metrics and pass/fail criteria.
- `trades.jsonl`: agent-market rows plus wall state, packet commitments, and route gate status.
- `wall_cases.jsonl`: compact wall-only records.
- `agent_decisions.csv`: every prompt variant decision for each trade.
- `evm_replay_output.txt`: stdout from the optional Anvil replay.
