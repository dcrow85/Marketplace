# Unified Pokemon Alpha Stress: unified_stress_20260609T160155Z

- Trades: `250`
- Route-ready trades: `0` (0.0%)
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
  "attempted": false,
  "reason": "no route-ready trades selected"
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
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0235 / claim_missing_buyer_arrival

- Card: Japanese Neo Discovery Espeon holo
- Value: `$3995` (grail)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0090 / stale_wall_bundle_ref

- Card: Japanese Neo Discovery Espeon holo
- Value: `$3404` (grail)
- Seller trust: `unknown`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0086 / missing_external_availability

- Card: Neo Umbreon holo
- Value: `$3314` (grail)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `wrong_card`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0203 / sparse_evidence_no_waiver

- Card: Vending Series Mewtwo
- Value: `$3241` (grail)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0236 / claim_missing_buyer_arrival

- Card: Vending Series Mewtwo
- Value: `$3028` (grail)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0049 / missing_route_spendability

- Card: Vending Series Mewtwo
- Value: `$2887` (grail)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `insured_damaged`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0003 / sparse_evidence_no_waiver

- Card: Japanese Fossil Dragonite holo
- Value: `$2800` (high)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `authenticity_flag`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0164 / claim_missing_buyer_arrival

- Card: Japanese Neo Discovery Espeon holo
- Value: `$2781` (grail)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `seller_nonship`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0050 / spendability_missing_wall_ref

- Card: Sabrina's Gengar
- Value: `$2751` (grail)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `seller_nonship`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0006 / missing_inventory_lock

- Card: Japanese Neo Discovery Espeon holo
- Value: `$2524` (grail)
- Seller trust: `unknown`
- Route: `local_meetup`
- Outcome: `local_handoff_dispute`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0212 / manual_database_gap

- Card: Japanese Fossil Dragonite holo
- Value: `$2496` (grail)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `route_delay`
- Route ready: `False`
- Wall contacts: `CardReferenceCandidate:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0183 / bond_gap

- Card: Vending Gastly
- Value: `$2424` (grail)
- Seller trust: `new`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `BondScope:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0199 / scope_laundering

- Card: Neo Umbreon holo
- Value: `$2344` (grail)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0237 / unassigned_insurance_gap

- Card: CD Promo Venusaur
- Value: `$2340` (grail)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `RouteInsuranceRiskOwner:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0008 / spendability_missing_wall_ref

- Card: Carddass prism oddball
- Value: `$2324` (grail)
- Seller trust: `trusted`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0208 / spendability_missing_wall_ref

- Card: Vending Gastly
- Value: `$2080` (grail)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `insured_damaged`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0024 / missing_external_availability

- Card: Japanese Neo Discovery Espeon holo
- Value: `$2075` (grail)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0056 / manual_database_gap

- Card: Japanese Fossil Dragonite holo
- Value: `$1729` (grail)
- Seller trust: `new`
- Route: `underinsured_ship`
- Outcome: `seller_nonship`
- Route ready: `False`
- Wall contacts: `CardReferenceCandidate:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0031 / sparse_evidence_no_waiver

- Card: Neo Umbreon holo
- Value: `$1521` (grail)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `minor_condition_delta`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0144 / missing_external_availability

- Card: Sabrina's Gengar
- Value: `$1510` (grail)
- Seller trust: `trusted`
- Route: `underinsured_ship`
- Outcome: `underinsured_lost`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0172 / manual_database_gap

- Card: Corocoro Mew
- Value: `$1493` (grail)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `porch_theft`
- Route ready: `False`
- Wall contacts: `CardReferenceCandidate:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0246 / spendability_missing_wall_ref

- Card: Vending Gastly
- Value: `$1114` (high)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `insured_lost`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0225 / sparse_evidence_no_waiver

- Card: Japanese Neo Discovery Espeon holo
- Value: `$1083` (high)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `minor_condition_delta`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0176 / sparse_evidence_no_waiver

- Card: Japanese Fossil Dragonite holo
- Value: `$995` (high)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0194 / missing_external_availability

- Card: Vending Series Mewtwo
- Value: `$973` (high)
- Seller trust: `trusted`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0106 / sparse_evidence_no_waiver

- Card: Japanese Fossil Dragonite holo
- Value: `$961` (high)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `minor_condition_delta`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0021 / missing_route_spendability

- Card: Sabrina's Gengar
- Value: `$949` (high)
- Seller trust: `unknown`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0080 / missing_inventory_lock

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$941` (high)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0063 / missing_route_spendability

- Card: Carddass prism oddball
- Value: `$937` (high)
- Seller trust: `new`
- Route: `show_pickup`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0013 / bond_gap

- Card: CD Promo Venusaur
- Value: `$936` (high)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `route_delay`
- Route ready: `False`
- Wall contacts: `BondScope:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0047 / unassigned_insurance_gap

- Card: Neo Umbreon holo
- Value: `$923` (high)
- Seller trust: `new`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `RouteInsuranceRiskOwner:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0131 / manual_database_gap

- Card: Sabrina's Gengar
- Value: `$854` (high)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `CardReferenceCandidate:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0123 / stale_wall_bundle_ref

- Card: Japanese Base Gyarados holo
- Value: `$844` (high)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0096 / unassigned_insurance_gap

- Card: Sabrina's Gengar
- Value: `$839` (high)
- Seller trust: `trusted`
- Route: `underinsured_ship`
- Outcome: `route_delay`
- Route ready: `False`
- Wall contacts: `RouteInsuranceRiskOwner:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0101 / outside_scope_magic

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$832` (high)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ALPHA_SCOPE:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0154 / unassigned_insurance_gap

- Card: Carddass prism oddball
- Value: `$830` (high)
- Seller trust: `known`
- Route: `local_meetup`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `RouteInsuranceRiskOwner:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0065 / unassigned_insurance_gap

- Card: Japanese Neo Discovery Espeon holo
- Value: `$822` (high)
- Seller trust: `trusted`
- Route: `local_meetup`
- Outcome: `material_misdescription`
- Route ready: `False`
- Wall contacts: `RouteInsuranceRiskOwner:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0041 / bond_gap

- Card: Neo Umbreon holo
- Value: `$766` (high)
- Seller trust: `trusted`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `BondScope:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0061 / unassigned_insurance_gap

- Card: Neo Umbreon holo
- Value: `$759` (high)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `wrong_card`
- Route ready: `False`
- Wall contacts: `RouteInsuranceRiskOwner:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0014 / manual_database_gap

- Card: Corocoro Mew
- Value: `$741` (high)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `CardReferenceCandidate:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0030 / sparse_evidence_with_waiver

- Card: CD Promo Venusaur
- Value: `$741` (high)
- Seller trust: `trusted`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waived, ExternalAvailabilityCovenant:waived`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0245 / claim_missing_buyer_arrival

- Card: Carddass prism oddball
- Value: `$735` (high)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `insured_damaged`
- Route ready: `False`
- Wall contacts: `ClaimClosureEvidenceMatrix:escalate`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0019 / unassigned_insurance_gap

- Card: Japanese Neo Discovery Espeon holo
- Value: `$734` (high)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `RouteInsuranceRiskOwner:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0191 / sparse_evidence_no_waiver

- Card: Vending Series Mewtwo
- Value: `$733` (high)
- Seller trust: `unknown`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0171 / stale_wall_bundle_ref

- Card: Japanese Fossil Dragonite holo
- Value: `$700` (high)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0138 / spendability_missing_wall_ref

- Card: Japanese Base Gyarados holo
- Value: `$696` (high)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0040 / outside_scope_magic

- Card: Carddass prism oddball
- Value: `$684` (high)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ALPHA_SCOPE:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0023 / stale_wall_bundle_ref

- Card: Japanese Neo Discovery Espeon holo
- Value: `$679` (high)
- Seller trust: `known`
- Route: `local_meetup`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0027 / bond_gap

- Card: Japanese Base Gyarados holo
- Value: `$662` (high)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `BondScope:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0132 / manual_database_gap

- Card: Vending Series Mewtwo
- Value: `$615` (high)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `CardReferenceCandidate:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0042 / manual_database_gap

- Card: Japanese Base Gyarados holo
- Value: `$600` (high)
- Seller trust: `unknown`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `CardReferenceCandidate:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0139 / missing_external_availability

- Card: Vending Series Mewtwo
- Value: `$592` (high)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0190 / scope_laundering

- Card: Vending Gastly
- Value: `$572` (high)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0064 / missing_external_availability

- Card: Corocoro Mew
- Value: `$567` (high)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required, ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0071 / claim_missing_buyer_arrival

- Card: Japanese Fossil Dragonite holo
- Value: `$556` (high)
- Seller trust: `trusted`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0077 / spendability_missing_wall_ref

- Card: Japanese Fossil Dragonite holo
- Value: `$550` (grail)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `authenticity_flag`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0033 / unassigned_insurance_gap

- Card: CD Promo Venusaur
- Value: `$540` (high)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `RouteInsuranceRiskOwner:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0152 / stale_wall_bundle_ref

- Card: Vending Series Mewtwo
- Value: `$540` (high)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0231 / sparse_evidence_with_waiver

- Card: CD Promo Venusaur
- Value: `$532` (high)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waived, ExternalAvailabilityCovenant:waived`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0218 / spendability_missing_wall_ref

- Card: Corocoro Mew
- Value: `$520` (high)
- Seller trust: `trusted`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0234 / sparse_evidence_no_waiver

- Card: Japanese Neo Discovery Espeon holo
- Value: `$438` (high)
- Seller trust: `trusted`
- Route: `show_pickup`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0038 / missing_external_availability

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$343` (mid)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `minor_condition_delta`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0059 / claim_missing_buyer_arrival

- Card: Corocoro Mew
- Value: `$343` (mid)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0044 / sparse_evidence_with_waiver

- Card: Masaki Gengar
- Value: `$336` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waived`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0210 / missing_external_availability

- Card: Vending Gastly
- Value: `$336` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0055 / bond_gap

- Card: Japanese Neo Discovery Espeon holo
- Value: `$335` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `BondScope:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0186 / claim_missing_buyer_arrival

- Card: Carddass prism oddball
- Value: `$335` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0230 / outside_scope_magic

- Card: Vending Series Mewtwo
- Value: `$326` (mid)
- Seller trust: `known`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ALPHA_SCOPE:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0146 / unassigned_insurance_gap

- Card: Sabrina's Gengar
- Value: `$325` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `RouteInsuranceRiskOwner:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0200 / missing_external_availability

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$324` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0037 / stale_wall_bundle_ref

- Card: Masaki Gengar
- Value: `$308` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0162 / claim_missing_buyer_arrival

- Card: Vending Series Mewtwo
- Value: `$306` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0084 / bond_gap

- Card: Vending Series Mewtwo
- Value: `$302` (mid)
- Seller trust: `trusted`
- Route: `local_meetup`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `BondScope:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0150 / manual_database_gap

- Card: Vending Series Mewtwo
- Value: `$299` (mid)
- Seller trust: `unknown`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `CardReferenceCandidate:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0181 / scope_laundering

- Card: Vending Gastly
- Value: `$293` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0223 / scope_laundering

- Card: Japanese Base Gyarados holo
- Value: `$292` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0173 / stale_wall_bundle_ref

- Card: Japanese Base Gyarados holo
- Value: `$284` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0143 / outside_scope_magic

- Card: Carddass prism oddball
- Value: `$280` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ALPHA_SCOPE:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0004 / scope_laundering

- Card: Carddass prism oddball
- Value: `$278` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `minor_condition_delta`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0133 / missing_route_spendability

- Card: Neo Umbreon holo
- Value: `$274` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0088 / scope_laundering

- Card: Japanese Base Gyarados holo
- Value: `$268` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0116 / missing_inventory_lock

- Card: Corocoro Mew
- Value: `$256` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0229 / claim_missing_buyer_arrival

- Card: Sabrina's Gengar
- Value: `$250` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `minor_condition_delta`
- Route ready: `False`
- Wall contacts: `ClaimClosureEvidenceMatrix:escalate`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0091 / stale_wall_bundle_ref

- Card: Neo Umbreon holo
- Value: `$238` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0082 / missing_route_spendability

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$237` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `wrong_card`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0053 / claim_missing_buyer_arrival

- Card: Vending Series Mewtwo
- Value: `$235` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `material_misdescription`
- Route ready: `False`
- Wall contacts: `ClaimClosureEvidenceMatrix:escalate`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0079 / missing_inventory_lock

- Card: Neo Umbreon holo
- Value: `$233` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0227 / missing_external_availability

- Card: Neo Umbreon holo
- Value: `$224` (mid)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0205 / missing_external_availability

- Card: Neo Umbreon holo
- Value: `$218` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0036 / spendability_missing_wall_ref

- Card: Japanese Neo Discovery Espeon holo
- Value: `$212` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0177 / scope_laundering

- Card: Corocoro Mew
- Value: `$211` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0017 / sparse_evidence_no_waiver

- Card: Japanese Fossil Dragonite holo
- Value: `$204` (mid)
- Seller trust: `known`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0187 / bond_gap

- Card: Vending Gastly
- Value: `$204` (mid)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `BondScope:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0233 / missing_external_availability

- Card: Japanese Neo Discovery Espeon holo
- Value: `$200` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0145 / missing_inventory_lock

- Card: Vending Gastly
- Value: `$186` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `minor_condition_delta`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0224 / scope_laundering

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$174` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0018 / scope_laundering

- Card: Japanese Neo Discovery Espeon holo
- Value: `$167` (mid)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `seller_nonship`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0005 / unassigned_insurance_gap

- Card: Neo Umbreon holo
- Value: `$160` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `buyer_remorse`
- Route ready: `False`
- Wall contacts: `RouteInsuranceRiskOwner:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0170 / outside_scope_magic

- Card: Sabrina's Gengar
- Value: `$160` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ALPHA_SCOPE:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0009 / stale_wall_bundle_ref

- Card: CD Promo Venusaur
- Value: `$152` (mid)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `material_misdescription`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0232 / stale_wall_bundle_ref

- Card: Carddass prism oddball
- Value: `$151` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0217 / scope_laundering

- Card: Vending Series Mewtwo
- Value: `$148` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0109 / outside_scope_magic

- Card: Japanese Neo Discovery Espeon holo
- Value: `$145` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ALPHA_SCOPE:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0110 / sparse_evidence_with_waiver

- Card: Japanese Base Gyarados holo
- Value: `$144` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waived`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0115 / missing_inventory_lock

- Card: Sabrina's Gengar
- Value: `$133` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0219 / sparse_evidence_no_waiver

- Card: Corocoro Mew
- Value: `$126` (mid)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `seller_nonship`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0226 / bond_gap

- Card: Japanese Neo Discovery Espeon holo
- Value: `$124` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `BondScope:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0149 / claim_missing_buyer_arrival

- Card: Japanese Base Gyarados holo
- Value: `$120` (mid)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0135 / scope_laundering

- Card: Carddass prism oddball
- Value: `$118` (mid)
- Seller trust: `known`
- Route: `international_ship`
- Outcome: `minor_condition_delta`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0201 / sparse_evidence_no_waiver

- Card: Japanese Base Gyarados holo
- Value: `$116` (mid)
- Seller trust: `known`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0243 / sparse_evidence_no_waiver

- Card: Japanese Fossil Dragonite holo
- Value: `$114` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0222 / stale_wall_bundle_ref

- Card: Vending Series Mewtwo
- Value: `$106` (mid)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0112 / unassigned_insurance_gap

- Card: Vending Series Mewtwo
- Value: `$105` (mid)
- Seller trust: `unknown`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `RouteInsuranceRiskOwner:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0067 / claim_missing_buyer_arrival

- Card: Vending Gastly
- Value: `$104` (mid)
- Seller trust: `unknown`
- Route: `show_pickup`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0103 / stale_wall_bundle_ref

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$100` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0011 / claim_missing_buyer_arrival

- Card: Sabrina's Gengar
- Value: `$99` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0051 / stale_wall_bundle_ref

- Card: Japanese Fossil Dragonite holo
- Value: `$97` (low)
- Seller trust: `known`
- Route: `show_pickup`
- Outcome: `material_misdescription`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0039 / claim_missing_buyer_arrival

- Card: Corocoro Mew
- Value: `$95` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `insured_lost`
- Route ready: `False`
- Wall contacts: `ClaimClosureEvidenceMatrix:escalate`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0034 / missing_inventory_lock

- Card: Japanese Base Gyarados holo
- Value: `$93` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0127 / claim_missing_buyer_arrival

- Card: Vending Series Mewtwo
- Value: `$93` (low)
- Seller trust: `unknown`
- Route: `show_pickup`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0180 / sparse_evidence_no_waiver

- Card: Vending Gastly
- Value: `$92` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0052 / missing_external_availability

- Card: Japanese Base Gyarados holo
- Value: `$90` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `insured_lost`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0035 / missing_route_spendability

- Card: Corocoro Mew
- Value: `$89` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0108 / missing_external_availability

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$88` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `insured_lost`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0016 / sparse_evidence_with_waiver

- Card: Japanese Base Gyarados holo
- Value: `$85` (low)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waived`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0026 / outside_scope_magic

- Card: Vending Series Mewtwo
- Value: `$83` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ALPHA_SCOPE:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0119 / claim_missing_buyer_arrival

- Card: CD Promo Venusaur
- Value: `$83` (low)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0188 / missing_external_availability

- Card: Neo Umbreon holo
- Value: `$80` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0125 / scope_laundering

- Card: CD Promo Venusaur
- Value: `$79` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0174 / sparse_evidence_no_waiver

- Card: Sabrina's Gengar
- Value: `$77` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0228 / missing_inventory_lock

- Card: Sabrina's Gengar
- Value: `$77` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0072 / missing_route_spendability

- Card: Vending Gastly
- Value: `$72` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `minor_condition_delta`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0178 / outside_scope_magic

- Card: Corocoro Mew
- Value: `$72` (low)
- Seller trust: `trusted`
- Route: `show_pickup`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ALPHA_SCOPE:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0214 / bond_gap

- Card: Vending Series Mewtwo
- Value: `$72` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `BondScope:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0020 / missing_inventory_lock

- Card: Vending Series Mewtwo
- Value: `$71` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `route_delay`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0151 / missing_route_spendability

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$65` (low)
- Seller trust: `known`
- Route: `uninsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0007 / missing_route_spendability

- Card: Vending Series Mewtwo
- Value: `$64` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0025 / claim_missing_buyer_arrival

- Card: Japanese Base Gyarados holo
- Value: `$62` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0179 / bond_gap

- Card: CD Promo Venusaur
- Value: `$62` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `BondScope:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0085 / missing_external_availability

- Card: Neo Umbreon holo
- Value: `$61` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `seller_nonship`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0094 / sparse_evidence_no_waiver

- Card: Japanese Neo Discovery Espeon holo
- Value: `$59` (low)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `minor_condition_delta`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0129 / stale_wall_bundle_ref

- Card: Vending Gastly
- Value: `$57` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `insured_lost`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0002 / sparse_evidence_with_waiver

- Card: Carddass prism oddball
- Value: `$56` (low)
- Seller trust: `known`
- Route: `show_pickup`
- Outcome: `buyer_remorse`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waived`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0045 / sparse_evidence_no_waiver

- Card: Japanese Base Gyarados holo
- Value: `$56` (low)
- Seller trust: `trusted`
- Route: `show_pickup`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0010 / missing_external_availability

- Card: Carddass prism oddball
- Value: `$55` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0175 / stale_wall_bundle_ref

- Card: Japanese Neo Discovery Espeon holo
- Value: `$55` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0169 / missing_route_spendability

- Card: Masaki Gengar
- Value: `$54` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `insured_damaged`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0054 / outside_scope_magic

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$53` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `seller_nonship`
- Route ready: `False`
- Wall contacts: `POKEMON_ALPHA_SCOPE:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0048 / missing_inventory_lock

- Card: Corocoro Mew
- Value: `$52` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `minor_condition_delta`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0197 / missing_route_spendability

- Card: Carddass prism oddball
- Value: `$50` (low)
- Seller trust: `known`
- Route: `uninsured_ship`
- Outcome: `uninsured_lost`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0159 / scope_laundering

- Card: Carddass prism oddball
- Value: `$49` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0241 / sparse_evidence_with_waiver

- Card: Japanese Base Gyarados holo
- Value: `$49` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waived`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0249 / sparse_evidence_with_waiver

- Card: Sabrina's Gengar
- Value: `$49` (low)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `porch_theft`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waived`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0058 / missing_inventory_lock

- Card: Japanese Neo Discovery Espeon holo
- Value: `$48` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0202 / bond_gap

- Card: Japanese Base Gyarados holo
- Value: `$48` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `BondScope:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0046 / scope_laundering

- Card: Neo Umbreon holo
- Value: `$46` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0209 / missing_route_spendability

- Card: Carddass prism oddball
- Value: `$42` (low)
- Seller trust: `trusted`
- Route: `uninsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0022 / spendability_missing_wall_ref

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$41` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0028 / manual_database_gap

- Card: Sabrina's Gengar
- Value: `$41` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `CardReferenceCandidate:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0161 / sparse_evidence_no_waiver

- Card: CD Promo Venusaur
- Value: `$41` (low)
- Seller trust: `trusted`
- Route: `uninsured_ship`
- Outcome: `uninsured_lost`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0120 / outside_scope_magic

- Card: Vending Series Mewtwo
- Value: `$38` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ALPHA_SCOPE:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0216 / sparse_evidence_no_waiver

- Card: Japanese Fossil Dragonite holo
- Value: `$38` (low)
- Seller trust: `trusted`
- Route: `local_meetup`
- Outcome: `local_handoff_dispute`
- Route ready: `False`
- Wall contacts: `ExternalAvailabilityCovenant:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0097 / spendability_missing_wall_ref

- Card: Japanese Base Gyarados holo
- Value: `$37` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `buyer_remorse`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0165 / unassigned_insurance_gap

- Card: Japanese Neo Discovery Espeon holo
- Value: `$36` (low)
- Seller trust: `new`
- Route: `show_pickup`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `RouteInsuranceRiskOwner:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0185 / claim_missing_buyer_arrival

- Card: Carddass prism oddball
- Value: `$34` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0060 / spendability_missing_wall_ref

- Card: Corocoro Mew
- Value: `$32` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=False`

### SIM-0078 / missing_route_spendability

- Card: Neo Umbreon holo
- Value: `$32` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=False; cites_current=False`

### SIM-0012 / outside_scope_magic

- Card: Masaki Gengar
- Value: `$31` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `POKEMON_ALPHA_SCOPE:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0032 / scope_laundering

- Card: CD Promo Venusaur
- Value: `$31` (low)
- Seller trust: `unknown`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `ProofVectorScope:block`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0113 / full_compliant

- Card: Vending Gastly
- Value: `$4318` (grail)
- Seller trust: `new`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0242 / full_compliant

- Card: Masaki Gengar
- Value: `$3628` (grail)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0121 / full_compliant

- Card: Vending Gastly
- Value: `$3508` (grail)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0114 / full_compliant

- Card: Carddass prism oddball
- Value: `$3086` (grail)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0107 / full_compliant

- Card: Japanese Fossil Dragonite holo
- Value: `$1554` (grail)
- Seller trust: `new`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0142 / full_compliant

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$1453` (high)
- Seller trust: `unknown`
- Route: `underinsured_ship`
- Outcome: `underinsured_lost`
- Route ready: `False`
- Wall contacts: `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000:waiver_required`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0244 / full_compliant

- Card: Japanese Base Gyarados holo
- Value: `$1167` (high)
- Seller trust: `unknown`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0184 / full_compliant

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$1129` (high)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0015 / full_compliant

- Card: Japanese Base Gyarados holo
- Value: `$1080` (grail)
- Seller trust: `trusted`
- Route: `underinsured_ship`
- Outcome: `underinsured_lost`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0092 / full_compliant

- Card: Neo Umbreon holo
- Value: `$1066` (high)
- Seller trust: `trusted`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0182 / full_compliant

- Card: Carddass prism oddball
- Value: `$1012` (high)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0248 / full_compliant

- Card: Japanese Base Gyarados holo
- Value: `$994` (high)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `porch_theft`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0167 / full_compliant

- Card: Sabrina's Gengar
- Value: `$933` (high)
- Seller trust: `known`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0247 / full_compliant

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$865` (high)
- Seller trust: `unknown`
- Route: `underinsured_ship`
- Outcome: `buyer_remorse`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0148 / full_compliant

- Card: Sabrina's Gengar
- Value: `$800` (high)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `route_delay`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0157 / full_compliant

- Card: Japanese Base Gyarados holo
- Value: `$743` (high)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0163 / full_compliant

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$717` (high)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0195 / full_compliant

- Card: Masaki Gengar
- Value: `$679` (high)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0100 / full_compliant

- Card: CD Promo Venusaur
- Value: `$673` (high)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0075 / full_compliant

- Card: Neo Umbreon holo
- Value: `$650` (high)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0155 / full_compliant

- Card: Vending Gastly
- Value: `$638` (high)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0117 / full_compliant

- Card: Japanese Neo Discovery Espeon holo
- Value: `$593` (high)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `buyer_remorse`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0057 / full_compliant

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$560` (high)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `insured_damaged`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0095 / full_compliant

- Card: Japanese Neo Discovery Espeon holo
- Value: `$550` (grail)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `authenticity_flag`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0158 / full_compliant

- Card: Neo Umbreon holo
- Value: `$510` (high)
- Seller trust: `unknown`
- Route: `underinsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0043 / full_compliant

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$457` (high)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0153 / full_compliant

- Card: Corocoro Mew
- Value: `$408` (high)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `route_delay`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0098 / full_compliant

- Card: Japanese Neo Discovery Espeon holo
- Value: `$349` (mid)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `insured_lost`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0029 / full_compliant

- Card: Carddass prism oddball
- Value: `$347` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `wrong_card`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0102 / full_compliant

- Card: Japanese Base Gyarados holo
- Value: `$344` (mid)
- Seller trust: `known`
- Route: `international_ship`
- Outcome: `porch_theft`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0221 / full_compliant

- Card: Masaki Gengar
- Value: `$341` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0066 / full_compliant

- Card: Vending Gastly
- Value: `$326` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0136 / full_compliant

- Card: Corocoro Mew
- Value: `$304` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0070 / full_compliant

- Card: Japanese Fossil Dragonite holo
- Value: `$301` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0166 / full_compliant

- Card: Sabrina's Gengar
- Value: `$292` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0250 / full_compliant

- Card: Sabrina's Gengar
- Value: `$290` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0089 / full_compliant

- Card: Japanese Base Gyarados holo
- Value: `$280` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0215 / full_compliant

- Card: Japanese Fossil Dragonite holo
- Value: `$260` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0220 / full_compliant

- Card: Corocoro Mew
- Value: `$260` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0118 / full_compliant

- Card: Japanese Base Gyarados holo
- Value: `$250` (mid)
- Seller trust: `known`
- Route: `international_ship`
- Outcome: `material_misdescription`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0156 / full_compliant

- Card: Neo Umbreon holo
- Value: `$240` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0207 / full_compliant

- Card: Masaki Gengar
- Value: `$239` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0126 / full_compliant

- Card: Vending Series Mewtwo
- Value: `$237` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0160 / full_compliant

- Card: Neo Umbreon holo
- Value: `$229` (mid)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0141 / full_compliant

- Card: Japanese Base Gyarados holo
- Value: `$223` (mid)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `insured_damaged`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0137 / full_compliant

- Card: Vending Gastly
- Value: `$215` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0147 / full_compliant

- Card: Carddass prism oddball
- Value: `$205` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0128 / full_compliant

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$190` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `buyer_remorse`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0130 / full_compliant

- Card: Corocoro Mew
- Value: `$188` (mid)
- Seller trust: `known`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0204 / full_compliant

- Card: Japanese Neo Discovery Espeon holo
- Value: `$174` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0062 / full_compliant

- Card: Japanese Base Gyarados holo
- Value: `$159` (mid)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0240 / full_compliant

- Card: Japanese Neo Discovery Espeon holo
- Value: `$145` (mid)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0076 / full_compliant

- Card: Corocoro Mew
- Value: `$121` (mid)
- Seller trust: `new`
- Route: `local_meetup`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0111 / full_compliant

- Card: Vending Series Mewtwo
- Value: `$98` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `insured_lost`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0122 / full_compliant

- Card: Neo Umbreon holo
- Value: `$98` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0189 / full_compliant

- Card: Japanese Neo Discovery Espeon holo
- Value: `$97` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0168 / full_compliant

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$96` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0099 / full_compliant

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$94` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `route_delay`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0192 / full_compliant

- Card: Japanese Neo Discovery Espeon holo
- Value: `$91` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0081 / full_compliant

- Card: Vending Series Mewtwo
- Value: `$85` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `minor_condition_delta`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0239 / full_compliant

- Card: Japanese Neo Discovery Espeon holo
- Value: `$84` (low)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `wrong_card`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0068 / full_compliant

- Card: Neo Umbreon holo
- Value: `$80` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0140 / full_compliant

- Card: Vending Gastly
- Value: `$75` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0213 / full_compliant

- Card: Japanese Neo Discovery Espeon holo
- Value: `$71` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0074 / full_compliant

- Card: Japanese Base Gyarados holo
- Value: `$70` (low)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0087 / full_compliant

- Card: Carddass prism oddball
- Value: `$70` (low)
- Seller trust: `known`
- Route: `uninsured_ship`
- Outcome: `uninsured_lost`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0193 / full_compliant

- Card: Corocoro Mew
- Value: `$65` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0104 / full_compliant

- Card: Carddass prism oddball
- Value: `$60` (low)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0196 / full_compliant

- Card: Masaki Gengar
- Value: `$60` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0083 / full_compliant

- Card: Sabrina's Gengar
- Value: `$58` (low)
- Seller trust: `known`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0073 / full_compliant

- Card: Japanese Fossil Dragonite holo
- Value: `$49` (low)
- Seller trust: `known`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0124 / full_compliant

- Card: Vending Gastly
- Value: `$44` (low)
- Seller trust: `unknown`
- Route: `show_pickup`
- Outcome: `route_delay`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0001 / full_compliant

- Card: Japanese Base Gyarados holo
- Value: `$42` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `wrong_card`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0198 / full_compliant

- Card: Vending Series Mewtwo
- Value: `$41` (low)
- Seller trust: `trusted`
- Route: `uninsured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0105 / full_compliant

- Card: CD Promo Venusaur
- Value: `$35` (low)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0211 / full_compliant

- Card: Vending Series Mewtwo
- Value: `$29` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0093 / full_compliant

- Card: Vending Series Mewtwo
- Value: `$27` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Outcome: `insured_lost`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0238 / full_compliant

- Card: Vending Gastly
- Value: `$25` (low)
- Seller trust: `new`
- Route: `insured_ship`
- Outcome: `material_misdescription`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0206 / full_compliant

- Card: Corocoro Mew
- Value: `$23` (low)
- Seller trust: `trusted`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

### SIM-0069 / full_compliant

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$22` (low)
- Seller trust: `unknown`
- Route: `international_ship`
- Outcome: `clean_close`
- Route ready: `False`
- Wall contacts: `all pass`
- Route gate: `assembly_witness=False; spendability=True; cites_current=True`

## Artifacts

- `summary.json`: aggregate metrics and pass/fail criteria.
- `trades.jsonl`: agent-market rows plus wall state, packet commitments, and route gate status.
- `wall_cases.jsonl`: compact wall-only records.
- `agent_decisions.csv`: every prompt variant decision for each trade.
- `evm_replay_output.txt`: stdout from the optional Anvil replay.

