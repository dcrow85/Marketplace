# Unified Pokemon Alpha Stress: unified_stress_20260520T173024Z

- Trades: `30`
- Route-ready trades: `8` (26.7%)
- Pass: `True`
- EVM replay: `skipped`

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
    "automated": 6,
    "automated_escalated_to_human": 7,
    "human_arbiter": 7,
    "human_arbiter_agent_assisted": 10
  },
  "friction_triggers": {
    "authenticity_or_identity_risk": 6,
    "bond_penalty_above_auto_cap": 1,
    "case_scope_outside_automation": 2,
    "delivery_risk_ambiguous": 3,
    "evidence_ambiguity": 21,
    "human_arbiter_selected_prelock": 17,
    "in_person_handoff_ambiguity": 3,
    "refund_above_auto_cap": 3,
    "route_gap_owner_review": 6,
    "seller_trust_gap": 8
  },
  "outcomes": {
    "authenticity_flag": 3,
    "insured_lost": 3,
    "local_handoff_dispute": 3,
    "material_misdescription": 3,
    "minor_condition_delta": 3,
    "porch_theft": 3,
    "seller_nonship": 3,
    "underinsured_lost": 3,
    "uninsured_lost": 3,
    "wrong_card": 3
  },
  "routes": {
    "insured_ship": 15,
    "international_ship": 5,
    "local_meetup": 3,
    "underinsured_ship": 4,
    "uninsured_ship": 3
  },
  "seller_trust": {
    "known": 8,
    "new": 3,
    "trusted": 12,
    "unknown": 7
  },
  "value_bands": {
    "grail": 3,
    "high": 7,
    "low": 14,
    "mid": 6
  }
}
```

## Walls Found

```json
{
  "attacks": {
    "bond_gap": 2,
    "claim_missing_buyer_arrival": 2,
    "full_compliant": 3,
    "manual_database_gap": 2,
    "missing_external_availability": 2,
    "missing_inventory_lock": 2,
    "missing_route_spendability": 2,
    "outside_scope_magic": 2,
    "scope_laundering": 2,
    "sparse_evidence_no_waiver": 2,
    "sparse_evidence_with_waiver": 3,
    "spendability_missing_wall_ref": 2,
    "stale_wall_bundle_ref": 2,
    "unassigned_insurance_gap": 2
  },
  "top_wall_id_outcomes": {
    "BondScope:pass": 28,
    "BondScope:waiver_required": 2,
    "BuyerRiskAcceptance:pass": 30,
    "CardReferenceCandidate:pass": 28,
    "CardReferenceCandidate:waiver_required": 2,
    "ClaimClosureEvidenceMatrix:escalate": 2,
    "ClaimClosureEvidenceMatrix:pass": 28,
    "ExternalAvailabilityCovenant:pass": 23,
    "ExternalAvailabilityCovenant:waived": 3,
    "ExternalAvailabilityCovenant:waiver_required": 4,
    "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:pass": 27,
    "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required": 2,
    "POKEMON_ALPHA_SCOPE:block": 2,
    "POKEMON_ALPHA_SCOPE:pass": 28,
    "ProofVectorScope:block": 2,
    "ProofVectorScope:pass": 28,
    "RouteInsuranceRiskOwner:block": 2,
    "RouteInsuranceRiskOwner:pass": 28
  },
  "wall_outcomes": {
    "block": 6,
    "escalate": 2,
    "pass": 248,
    "waived": 4,
    "waiver_required": 10
  }
}
```

## Agent Decisions

```json
{
  "adversarial_seller:accept_or_continue": 11,
  "adversarial_seller:blocked": 6,
  "adversarial_seller:continue_with_recorded_waiver": 3,
  "adversarial_seller:semantic_attack_contained": 10,
  "arbiter_policy_agent:accept_or_continue": 11,
  "arbiter_policy_agent:blocked": 6,
  "arbiter_policy_agent:continue_with_recorded_waiver": 3,
  "arbiter_policy_agent:escalate_with_matrix_row": 2,
  "arbiter_policy_agent:request_policy_waiver_or_block": 8,
  "convenience_first_buyer:accept_or_continue": 11,
  "convenience_first_buyer:accept_with_waiver": 3,
  "convenience_first_buyer:blocked": 6,
  "convenience_first_buyer:blocked_until_waiver": 8,
  "convenience_first_buyer:escalate": 2,
  "seller_friendly_market_maker:accept_or_continue": 11,
  "seller_friendly_market_maker:blocked": 6,
  "seller_friendly_market_maker:continue_with_recorded_waiver": 3,
  "seller_friendly_market_maker:escalate": 2,
  "seller_friendly_market_maker:revise_offer_or_request_waiver": 8,
  "strict_boundary_buyer:accept_or_continue": 11,
  "strict_boundary_buyer:blocked": 6,
  "strict_boundary_buyer:escalate": 2,
  "strict_boundary_buyer:request_more_evidence": 11
}
```

## EVM Replay

```json
{
  "attempted": false,
  "reason": "skipped by CLI",
  "trade_ids": [
    "SIM-0029",
    "SIM-0016",
    "SIM-0025",
    "SIM-0011",
    "SIM-0002",
    "SIM-0030",
    "SIM-0015",
    "SIM-0001"
  ]
}
```

## Sample Wall Contacts

### SIM-0006 / missing_inventory_lock

- Card: Vending Gastly
- Value: `$2094` (grail)
- Seller trust: `unknown`
- Route: `international_ship`
- Outcome: `wrong_card`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0018 / scope_laundering

- Card: Vending Gastly
- Value: `$1535` (high)
- Seller trust: `trusted`
- Route: `underinsured_ship`
- Outcome: `underinsured_lost`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ProofVectorScope:block`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0027 / bond_gap

- Card: CD Promo Venusaur
- Value: `$1075` (high)
- Seller trust: `new`
- Route: `underinsured_ship`
- Outcome: `underinsured_lost`
- Route ready: `False`
- Wall contacts: `BondScope:waiver_required`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0024 / missing_external_availability

- Card: Masaki Gengar
- Value: `$571` (high)
- Seller trust: `unknown`
- Route: `international_ship`
- Outcome: `wrong_card`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `bundle=True; spendability=True; cites_current=True`

### SIM-0021 / missing_route_spendability

- Card: Sabrina's Gengar
- Value: `$550` (grail)
- Seller trust: `new`
- Route: `international_ship`
- Outcome: `authenticity_flag`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `bundle=True; spendability=False; cites_current=False`

### SIM-0007 / missing_route_spendability

- Card: Japanese Fossil Dragonite holo
- Value: `$456` (high)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `material_misdescription`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `bundle=True; spendability=False; cites_current=False`

## Artifacts

- `summary.json`: aggregate metrics and pass/fail criteria.
- `trades.jsonl`: agent-market rows plus wall state, packet commitments, and route gate status.
- `wall_cases.jsonl`: compact wall-only records.
- `agent_decisions.csv`: every prompt variant decision for each trade.
- `evm_replay_output.txt`: stdout from the optional Anvil replay.

