# Marketplace Protocol Massive Edge-Case Simulation

Run: `protocol_edge_case_20260518T160810Z`
Seed: `20260518`
Trades: `50000`

## Diagnosis

- Hard invariant violations found: {'insured_claim_packet_incomplete': 810, 'insured_outcome_without_insurance_amount': 6, 'casual_raw_evidence_bloat': 51, 'local_handoff_outcome_on_nonlocal_route': 9}
- Evidence packet completeness is high across clean receipts, claims, and disputes.
- Evidence scales in the intended direction: casual raw averages 12.25 items vs extreme proof 21.61.
- New sellers are usually required to bond before accessing serious buyers.
- Route exceptions exist, but they are explicitly approved rather than hidden in shipping cost.
- Delivered-but-not-received remains a naturally hard edge; signature/address controls need crisp UI.
- Underinsurance is a prime example of why gap ownership must be typed before escrow.

## Topline

{
  "ambiguous_without_grid_rate": 0.0544,
  "final_receipt_rate": 0.8019,
  "packet_complete_rate": 0.9825,
  "route_exception_approval_rate": 0.0304,
  "violations": {
    "casual_raw_evidence_bloat": 51,
    "insured_claim_packet_incomplete": 810,
    "insured_outcome_without_insurance_amount": 6,
    "local_handoff_outcome_on_nonlocal_route": 9
  }
}

## Modes

{
  "casual_raw": 16438,
  "collector_raw": 13327,
  "extreme_proof": 4133,
  "high_end_raw": 8049,
  "new_seller_raw": 8053
}

## Routes

{
  "insured_ship": 29503,
  "international_ship": 6113,
  "local_meetup": 2160,
  "show_pickup": 1062,
  "underinsured_ship": 7259,
  "uninsured_ship": 829,
  "verifier_forward": 3074
}

## Outcomes

{
  "buyer_remorse": 1177,
  "clean_close": 38917,
  "insured_damaged": 1288,
  "insured_lost": 867,
  "local_handoff_dispute": 222,
  "material_misdescription": 1551,
  "porch_theft": 845,
  "route_delay": 2994,
  "seller_nonship": 724,
  "underinsured_lost": 416,
  "uninsured_lost": 117,
  "verifier_mismatch": 309,
  "wrong_card": 573
}

## Resolution Types

{
  "buyer_remorse_not_covered": 1177,
  "carrier_claim": 2155,
  "condition_or_identity_dispute": 2124,
  "delivered_not_received_review": 845,
  "final_receipt": 38917,
  "handoff_dispute": 222,
  "nonshipment_dispute": 724,
  "route_monitoring": 2994,
  "route_risk_dispute": 117,
  "underinsurance_gap": 416,
  "verifier_condition_dispute": 309
}

## Evidence Scaling

{
  "casual_raw": {
    "mean": 12.25,
    "p90": 21
  },
  "collector_raw": {
    "mean": 13.76,
    "p90": 21
  },
  "extreme_proof": {
    "mean": 21.61,
    "p90": 23
  },
  "high_end_raw": {
    "mean": 17.63,
    "p90": 21
  },
  "new_seller_raw": {
    "mean": 18.2,
    "p90": 23
  }
}

## Bond Rate By Seller Trust

{
  "known": 0.0,
  "new": 1.0,
  "trusted": 0.0,
  "unknown": 0.538
}

## Scenario Packet Completeness

{
  "buyer_remorse": {
    "ambiguous_without_grid_rate": 0.0,
    "final_receipt_rate": 1.0,
    "n": 1177,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "buyer_remorse_not_covered",
        1177
      ]
    ]
  },
  "clean_close": {
    "ambiguous_without_grid_rate": 0.0,
    "final_receipt_rate": 1.0,
    "n": 38917,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "final_receipt",
        38917
      ]
    ]
  },
  "insured_damaged": {
    "ambiguous_without_grid_rate": 0.628,
    "final_receipt_rate": 0.0,
    "n": 1288,
    "packet_complete_rate": 0.372,
    "top_resolution": [
      [
        "carrier_claim",
        1288
      ]
    ]
  },
  "insured_lost": {
    "ambiguous_without_grid_rate": 0.001,
    "final_receipt_rate": 0.0,
    "n": 867,
    "packet_complete_rate": 0.999,
    "top_resolution": [
      [
        "carrier_claim",
        867
      ]
    ]
  },
  "local_handoff_dispute": {
    "ambiguous_without_grid_rate": 1.0,
    "final_receipt_rate": 0.0,
    "n": 222,
    "packet_complete_rate": 0.959,
    "top_resolution": [
      [
        "handoff_dispute",
        222
      ]
    ]
  },
  "material_misdescription": {
    "ambiguous_without_grid_rate": 0.0,
    "final_receipt_rate": 0.0,
    "n": 1551,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "condition_or_identity_dispute",
        1551
      ]
    ]
  },
  "porch_theft": {
    "ambiguous_without_grid_rate": 1.0,
    "final_receipt_rate": 0.0,
    "n": 845,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "delivered_not_received_review",
        845
      ]
    ]
  },
  "route_delay": {
    "ambiguous_without_grid_rate": 0.0,
    "final_receipt_rate": 0.0,
    "n": 2994,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "route_monitoring",
        2994
      ]
    ]
  },
  "seller_nonship": {
    "ambiguous_without_grid_rate": 0.0,
    "final_receipt_rate": 0.0,
    "n": 724,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "nonshipment_dispute",
        724
      ]
    ]
  },
  "underinsured_lost": {
    "ambiguous_without_grid_rate": 1.0,
    "final_receipt_rate": 0.0,
    "n": 416,
    "packet_complete_rate": 0.952,
    "top_resolution": [
      [
        "underinsurance_gap",
        416
      ]
    ]
  },
  "uninsured_lost": {
    "ambiguous_without_grid_rate": 1.0,
    "final_receipt_rate": 0.0,
    "n": 117,
    "packet_complete_rate": 0.949,
    "top_resolution": [
      [
        "route_risk_dispute",
        117
      ]
    ]
  },
  "verifier_mismatch": {
    "ambiguous_without_grid_rate": 1.0,
    "final_receipt_rate": 0.0,
    "n": 309,
    "packet_complete_rate": 0.903,
    "top_resolution": [
      [
        "verifier_condition_dispute",
        309
      ]
    ]
  },
  "wrong_card": {
    "ambiguous_without_grid_rate": 0.0,
    "final_receipt_rate": 0.0,
    "n": 573,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "condition_or_identity_dispute",
        573
      ]
    ]
  }
}

## Edge Samples

### T049508 `local_handoff_dispute`

{
  "plan": {
    "bond_amount": 650,
    "bond_required": true,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "chain_of_custody",
      "condition_band",
      "corner_closeups",
      "declared_value",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "seller_to_verifier_route",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "verifier_condition_attestation",
      "verifier_intake",
      "verifier_to_buyer_route"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 72,
    "insurance_amount": 5030,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 81,
    "route_promise": [
      "insured",
      "signature",
      "verifier_forward"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "locked",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "confirm_receipt_or_open_dispute",
    "liability_owner": "unresolved_until_handoff_evidence",
    "notable_evidence": [
      "buyer_confirmation_required",
      "handoff_memo",
      "table_or_badge_note"
    ],
    "outcome": "local_handoff_dispute",
    "packet_complete": false,
    "packet_type": "local_handoff_packet",
    "payout_action": "none",
    "reputation_events": [],
    "resolution_type": "handoff_dispute",
    "violations": [
      "local_handoff_outcome_on_nonlocal_route"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": true,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.423,
    "card": "Masaki Gengar",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "same_city",
    "forced_outcome": "local_handoff_dispute",
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": true,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-IL",
    "seller_trust": "new",
    "show_overlap": true,
    "trade_id": "T049508",
    "value": 5030
  }
}

### T049461 `local_handoff_dispute`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "chain_of_custody",
      "condition_band",
      "corner_closeups",
      "declared_value",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "seller_to_verifier_route",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "verifier_condition_attestation",
      "verifier_intake",
      "verifier_to_buyer_route"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 72,
    "insurance_amount": 4697,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 76,
    "route_promise": [
      "insured",
      "signature",
      "verifier_forward"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "confirm_receipt_or_open_dispute",
    "liability_owner": "unresolved_until_handoff_evidence",
    "notable_evidence": [
      "buyer_confirmation_required",
      "handoff_memo",
      "table_or_badge_note"
    ],
    "outcome": "local_handoff_dispute",
    "packet_complete": false,
    "packet_type": "local_handoff_packet",
    "payout_action": "none",
    "reputation_events": [],
    "resolution_type": "handoff_dispute",
    "violations": [
      "local_handoff_outcome_on_nonlocal_route"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": true,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.201,
    "card": "Japanese Base Gyarados holo",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "same_region",
    "forced_outcome": "local_handoff_dispute",
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": true,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-TX",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T049461",
    "value": 4697
  }
}

### T049477 `local_handoff_dispute`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "chain_of_custody",
      "condition_band",
      "corner_closeups",
      "declared_value",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "seller_to_verifier_route",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "verifier_condition_attestation",
      "verifier_intake",
      "verifier_to_buyer_route"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 72,
    "insurance_amount": 3032,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 51,
    "route_promise": [
      "insured",
      "signature",
      "verifier_forward"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "confirm_receipt_or_open_dispute",
    "liability_owner": "unresolved_until_handoff_evidence",
    "notable_evidence": [
      "buyer_confirmation_required",
      "handoff_memo",
      "table_or_badge_note"
    ],
    "outcome": "local_handoff_dispute",
    "packet_complete": false,
    "packet_type": "local_handoff_packet",
    "payout_action": "none",
    "reputation_events": [],
    "resolution_type": "handoff_dispute",
    "violations": [
      "local_handoff_outcome_on_nonlocal_route"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": true,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.284,
    "card": "Vending Gastly",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "same_region",
    "forced_outcome": "local_handoff_dispute",
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": true,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-MI",
    "seller_trust": "known",
    "show_overlap": true,
    "trade_id": "T049477",
    "value": 3032
  }
}

### T049457 `local_handoff_dispute`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "chain_of_custody",
      "condition_band",
      "corner_closeups",
      "declared_value",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "seller_to_verifier_route",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "verifier_condition_attestation",
      "verifier_intake",
      "verifier_to_buyer_route"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 72,
    "insurance_amount": 2631,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 45,
    "route_promise": [
      "insured",
      "signature",
      "verifier_forward"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "confirm_receipt_or_open_dispute",
    "liability_owner": "unresolved_until_handoff_evidence",
    "notable_evidence": [
      "buyer_confirmation_required",
      "handoff_memo",
      "table_or_badge_note"
    ],
    "outcome": "local_handoff_dispute",
    "packet_complete": false,
    "packet_type": "local_handoff_packet",
    "payout_action": "none",
    "reputation_events": [],
    "resolution_type": "handoff_dispute",
    "violations": [
      "local_handoff_outcome_on_nonlocal_route"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": true,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.642,
    "card": "Masaki Gengar",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "same_city",
    "forced_outcome": "local_handoff_dispute",
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": true,
    "seller_can_verify": true,
    "seller_insurance_cap": 5000,
    "seller_region": "US-MI",
    "seller_trust": "known",
    "show_overlap": true,
    "trade_id": "T049457",
    "value": 2631
  }
}

### T049476 `local_handoff_dispute`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "chain_of_custody",
      "condition_band",
      "corner_closeups",
      "declared_value",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "seller_to_verifier_route",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "verifier_condition_attestation",
      "verifier_intake",
      "verifier_to_buyer_route"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 72,
    "insurance_amount": 2605,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 45,
    "route_promise": [
      "insured",
      "signature",
      "verifier_forward"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "confirm_receipt_or_open_dispute",
    "liability_owner": "unresolved_until_handoff_evidence",
    "notable_evidence": [
      "buyer_confirmation_required",
      "handoff_memo",
      "table_or_badge_note"
    ],
    "outcome": "local_handoff_dispute",
    "packet_complete": false,
    "packet_type": "local_handoff_packet",
    "payout_action": "none",
    "reputation_events": [],
    "resolution_type": "handoff_dispute",
    "violations": [
      "local_handoff_outcome_on_nonlocal_route"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": true,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.453,
    "card": "Japanese Fossil Dragonite holo",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "same_region",
    "forced_outcome": "local_handoff_dispute",
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": true,
    "seller_can_verify": true,
    "seller_insurance_cap": 5000,
    "seller_region": "US-IL",
    "seller_trust": "trusted",
    "show_overlap": true,
    "trade_id": "T049476",
    "value": 2605
  }
}

### T049480 `local_handoff_dispute`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "chain_of_custody",
      "condition_band",
      "corner_closeups",
      "declared_value",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "seller_to_verifier_route",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "verifier_condition_attestation",
      "verifier_intake",
      "verifier_to_buyer_route"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 72,
    "insurance_amount": 2432,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 42,
    "route_promise": [
      "insured",
      "signature",
      "verifier_forward"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "confirm_receipt_or_open_dispute",
    "liability_owner": "unresolved_until_handoff_evidence",
    "notable_evidence": [
      "buyer_confirmation_required",
      "handoff_memo",
      "table_or_badge_note"
    ],
    "outcome": "local_handoff_dispute",
    "packet_complete": false,
    "packet_type": "local_handoff_packet",
    "payout_action": "none",
    "reputation_events": [],
    "resolution_type": "handoff_dispute",
    "violations": [
      "local_handoff_outcome_on_nonlocal_route"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": true,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.529,
    "card": "Neo Umbreon holo",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "same_city",
    "forced_outcome": "local_handoff_dispute",
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": true,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-CA",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T049480",
    "value": 2432
  }
}

### T049275 `insured_damaged`

{
  "plan": {
    "bond_amount": 650,
    "bond_required": true,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "buyer_confirmation_required",
      "chain_of_custody",
      "condition_band",
      "corner_closeups",
      "declared_value",
      "flaw_callouts",
      "front_photo",
      "handoff_memo",
      "holo_angle_closeups",
      "inspection_window",
      "inventory_claim",
      "packaging_attestation",
      "table_or_badge_note",
      "timestamped_photos",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition",
      "route_privacy_and_meetup_choice",
      "verifier_unavailable"
    ],
    "inspection_hours": 72,
    "insurance_amount": 0,
    "insurance_required": true,
    "route": "show_pickup",
    "route_cost": 0,
    "route_promise": [
      "buyer_confirms_receipt",
      "in_person_or_local_handoff",
      "show_pickup"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "locked",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete",
      "insured_outcome_without_insurance_amount"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": true,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.714,
    "card": "Masaki Gengar",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "same_region",
    "forced_outcome": "insured_damaged",
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": true,
    "seller_can_verify": false,
    "seller_insurance_cap": 5000,
    "seller_region": "US-TX",
    "seller_trust": "unknown",
    "show_overlap": true,
    "trade_id": "T049275",
    "value": 1942
  }
}

### T049496 `local_handoff_dispute`

{
  "plan": {
    "bond_amount": 286,
    "bond_required": true,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "chain_of_custody",
      "condition_band",
      "corner_closeups",
      "declared_value",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "seller_to_verifier_route",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "verifier_condition_attestation",
      "verifier_intake",
      "verifier_to_buyer_route"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 72,
    "insurance_amount": 818,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 18,
    "route_promise": [
      "insured",
      "signature",
      "verifier_forward"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "locked",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "confirm_receipt_or_open_dispute",
    "liability_owner": "unresolved_until_handoff_evidence",
    "notable_evidence": [
      "buyer_confirmation_required",
      "handoff_memo",
      "table_or_badge_note"
    ],
    "outcome": "local_handoff_dispute",
    "packet_complete": false,
    "packet_type": "local_handoff_packet",
    "payout_action": "none",
    "reputation_events": [],
    "resolution_type": "handoff_dispute",
    "violations": [
      "local_handoff_outcome_on_nonlocal_route"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": true,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.715,
    "card": "Carddass prism oddball",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "same_city",
    "forced_outcome": "local_handoff_dispute",
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": true,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-IL",
    "seller_trust": "new",
    "show_overlap": true,
    "trade_id": "T049496",
    "value": 818
  }
}

### T049516 `local_handoff_dispute`

{
  "plan": {
    "bond_amount": 257,
    "bond_required": true,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "chain_of_custody",
      "condition_band",
      "corner_closeups",
      "declared_value",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "seller_to_verifier_route",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "verifier_condition_attestation",
      "verifier_intake",
      "verifier_to_buyer_route"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 72,
    "insurance_amount": 734,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 17,
    "route_promise": [
      "insured",
      "signature",
      "verifier_forward"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "locked",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "confirm_receipt_or_open_dispute",
    "liability_owner": "unresolved_until_handoff_evidence",
    "notable_evidence": [
      "buyer_confirmation_required",
      "handoff_memo",
      "table_or_badge_note"
    ],
    "outcome": "local_handoff_dispute",
    "packet_complete": false,
    "packet_type": "local_handoff_packet",
    "payout_action": "none",
    "reputation_events": [],
    "resolution_type": "handoff_dispute",
    "violations": [
      "local_handoff_outcome_on_nonlocal_route"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": true,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.111,
    "card": "Masaki Gengar",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "same_region",
    "forced_outcome": "local_handoff_dispute",
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": true,
    "seller_can_verify": true,
    "seller_insurance_cap": 500,
    "seller_region": "US-MI",
    "seller_trust": "new",
    "show_overlap": false,
    "trade_id": "T049516",
    "value": 734
  }
}

### T036987 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 691,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.57,
    "card": "Masaki Gengar",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-IL",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T036987",
    "value": 691
  }
}

### T046933 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 689,
    "insurance_required": true,
    "route": "international_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "international_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.29,
    "card": "Masaki Gengar",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "international",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "GB-LON",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T046933",
    "value": 689
  }
}

### T012646 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 672,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.869,
    "card": "Neo Umbreon holo",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-IL",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T012646",
    "value": 672
  }
}

### T013046 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 665,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.522,
    "card": "Carddass prism oddball",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 5000,
    "seller_region": "US-CA",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T013046",
    "value": 665
  }
}

### T025993 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 664,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.187,
    "card": "CD Promo Venusaur",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "same_city",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": true,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-OH",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T025993",
    "value": 664
  }
}

### T041313 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 662,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.396,
    "card": "Corocoro Mew",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "same_city",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": true,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-IL",
    "seller_trust": "trusted",
    "show_overlap": true,
    "trade_id": "T041313",
    "value": 662
  }
}

### T047298 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 661,
    "insurance_required": true,
    "route": "international_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "international_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.827,
    "card": "Carddass prism oddball",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "international",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "CA-ON",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T047298",
    "value": 661
  }
}

### T049219 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 660,
    "insurance_required": true,
    "route": "international_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "international_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.277,
    "card": "Masaki Gengar",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "international",
    "forced_outcome": "insured_damaged",
    "mode": "high_end_raw",
    "raw": false,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "JP-Tokyo",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T049219",
    "value": 660
  }
}

### T030271 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 657,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.57,
    "card": "Carddass prism oddball",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-TX",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T030271",
    "value": 657
  }
}

### T039982 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 657,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.506,
    "card": "Masaki Gengar",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "same_city",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": true,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-NY",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T039982",
    "value": 657
  }
}

### T024335 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 650,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.414,
    "card": "Masaki Gengar",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-TX",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T024335",
    "value": 650
  }
}

### T008849 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 649,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.312,
    "card": "Japanese Fossil Dragonite holo",
    "condition_claim": "NM",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-NY",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T008849",
    "value": 649
  }
}

### T037160 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 649,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.275,
    "card": "Masaki Gengar",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-MI",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T037160",
    "value": 649
  }
}

### T034786 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 648,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.179,
    "card": "Sabrina's Gengar",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-CA",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T034786",
    "value": 648
  }
}

### T007705 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 645,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.629,
    "card": "Vending Series Mewtwo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "same_city",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": true,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-MI",
    "seller_trust": "trusted",
    "show_overlap": true,
    "trade_id": "T007705",
    "value": 645
  }
}

### T003550 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 643,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.537,
    "card": "Masaki Gengar",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "same_city",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-OH",
    "seller_trust": "trusted",
    "show_overlap": true,
    "trade_id": "T003550",
    "value": 643
  }
}

### T048060 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 641,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.131,
    "card": "Vending Gastly",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": false,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-MI",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T048060",
    "value": 641
  }
}

### T029872 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 635,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 16,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.82,
    "card": "Japanese Neo Discovery Espeon holo",
    "condition_claim": "NM",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 5000,
    "seller_region": "US-MI",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T029872",
    "value": 635
  }
}

### T033428 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 633,
    "insurance_required": true,
    "route": "international_ship",
    "route_cost": 15,
    "route_promise": [
      "insured",
      "international_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.334,
    "card": "Japanese Neo Revelation Houndoom holo",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "international",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "GB-LON",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T033428",
    "value": 633
  }
}

### T004857 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 631,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 15,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": true,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.643,
    "card": "Japanese Neo Discovery Espeon holo",
    "condition_claim": "MP",
    "condition_sensitivity": 0.8,
    "distance": "same_region",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": false,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-OH",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T004857",
    "value": 631
  }
}

### T026589 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 629,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 15,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.293,
    "card": "Vending Gastly",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-NY",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T026589",
    "value": 629
  }
}

### T027801 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 627,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 15,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.114,
    "card": "Japanese Neo Discovery Espeon holo",
    "condition_claim": "NM",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 5000,
    "seller_region": "US-CA",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T027801",
    "value": 627
  }
}

### T006677 `insured_damaged`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": true,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "corner_closeups",
      "flaw_callouts",
      "front_photo",
      "holo_angle_closeups",
      "inspection_window",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "signature_confirmation_required",
      "timestamped_photos",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "strong",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 48,
    "insurance_amount": 626,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 15,
    "route_promise": [
      "insured",
      "insured_ship",
      "signature"
    ],
    "signature_required": true,
    "verifier_required": false
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "carrier_pending",
    "notable_evidence": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "front_photo",
      "insurance_receipt",
      "packaging_attestation",
      "tracking_history"
    ],
    "outcome": "insured_damaged",
    "packet_complete": false,
    "packet_type": "insurance_claim_packet",
    "payout_action": "claim_pending",
    "reputation_events": [],
    "resolution_type": "carrier_claim",
    "violations": [
      "insured_claim_packet_incomplete"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.875,
    "card": "Japanese Base Gyarados holo",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "high_end_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 5000,
    "seller_region": "US-TX",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T006677",
    "value": 626
  }
}
