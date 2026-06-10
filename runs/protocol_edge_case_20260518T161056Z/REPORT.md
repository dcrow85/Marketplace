# Marketplace Protocol Massive Edge-Case Simulation

Run: `protocol_edge_case_20260518T161056Z`
Seed: `20260518`
Trades: `50000`

## Diagnosis

- No hard invariant violations under the typed-grid protocol.
- Evidence packet completeness is high across clean receipts, claims, and disputes.
- Evidence scales in the intended direction: casual raw averages 13.0 items vs extreme proof 21.62.
- New sellers are usually required to bond before accessing serious buyers.
- Route exceptions exist, but they are explicitly approved rather than hidden in shipping cost.
- Delivered-but-not-received remains a naturally hard edge; signature/address controls need crisp UI.
- Underinsurance is a prime example of why gap ownership must be typed before escrow.

## Topline

{
  "ambiguous_without_grid_rate": 0.0402,
  "final_receipt_rate": 0.8026,
  "packet_complete_rate": 1.0,
  "route_exception_approval_rate": 0.0312,
  "violations": {}
}

## Modes

{
  "casual_raw": 16395,
  "collector_raw": 13409,
  "extreme_proof": 4106,
  "high_end_raw": 8102,
  "new_seller_raw": 7988
}

## Routes

{
  "insured_ship": 29528,
  "international_ship": 6065,
  "local_meetup": 2138,
  "show_pickup": 1068,
  "underinsured_ship": 7273,
  "uninsured_ship": 868,
  "verifier_forward": 3060
}

## Outcomes

{
  "buyer_remorse": 1184,
  "clean_close": 38948,
  "insured_damaged": 1193,
  "insured_lost": 880,
  "local_handoff_dispute": 215,
  "material_misdescription": 1593,
  "porch_theft": 838,
  "route_delay": 2955,
  "seller_nonship": 675,
  "underinsured_lost": 555,
  "uninsured_lost": 108,
  "verifier_mismatch": 295,
  "wrong_card": 561
}

## Resolution Types

{
  "buyer_remorse_not_covered": 1184,
  "carrier_claim": 2073,
  "condition_or_identity_dispute": 2154,
  "delivered_not_received_review": 838,
  "final_receipt": 38948,
  "handoff_dispute": 215,
  "nonshipment_dispute": 675,
  "route_monitoring": 2955,
  "route_risk_dispute": 108,
  "underinsurance_gap": 555,
  "verifier_condition_dispute": 295
}

## Evidence Scaling

{
  "casual_raw": {
    "mean": 13.0,
    "p90": 21
  },
  "collector_raw": {
    "mean": 14.42,
    "p90": 21
  },
  "extreme_proof": {
    "mean": 21.62,
    "p90": 23
  },
  "high_end_raw": {
    "mean": 17.93,
    "p90": 21
  },
  "new_seller_raw": {
    "mean": 18.45,
    "p90": 23
  }
}

## Bond Rate By Seller Trust

{
  "known": 0.0,
  "new": 1.0,
  "trusted": 0.0,
  "unknown": 0.534
}

## Scenario Packet Completeness

{
  "buyer_remorse": {
    "ambiguous_without_grid_rate": 0.0,
    "final_receipt_rate": 1.0,
    "n": 1184,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "buyer_remorse_not_covered",
        1184
      ]
    ]
  },
  "clean_close": {
    "ambiguous_without_grid_rate": 0.0,
    "final_receipt_rate": 1.0,
    "n": 38948,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "final_receipt",
        38948
      ]
    ]
  },
  "insured_damaged": {
    "ambiguous_without_grid_rate": 0.0,
    "final_receipt_rate": 0.0,
    "n": 1193,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "carrier_claim",
        1193
      ]
    ]
  },
  "insured_lost": {
    "ambiguous_without_grid_rate": 0.0,
    "final_receipt_rate": 0.0,
    "n": 880,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "carrier_claim",
        880
      ]
    ]
  },
  "local_handoff_dispute": {
    "ambiguous_without_grid_rate": 1.0,
    "final_receipt_rate": 0.0,
    "n": 215,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "handoff_dispute",
        215
      ]
    ]
  },
  "material_misdescription": {
    "ambiguous_without_grid_rate": 0.0,
    "final_receipt_rate": 0.0,
    "n": 1593,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "condition_or_identity_dispute",
        1593
      ]
    ]
  },
  "porch_theft": {
    "ambiguous_without_grid_rate": 1.0,
    "final_receipt_rate": 0.0,
    "n": 838,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "delivered_not_received_review",
        838
      ]
    ]
  },
  "route_delay": {
    "ambiguous_without_grid_rate": 0.0,
    "final_receipt_rate": 0.0,
    "n": 2955,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "route_monitoring",
        2955
      ]
    ]
  },
  "seller_nonship": {
    "ambiguous_without_grid_rate": 0.0,
    "final_receipt_rate": 0.0,
    "n": 675,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "nonshipment_dispute",
        675
      ]
    ]
  },
  "underinsured_lost": {
    "ambiguous_without_grid_rate": 1.0,
    "final_receipt_rate": 0.0,
    "n": 555,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "underinsurance_gap",
        555
      ]
    ]
  },
  "uninsured_lost": {
    "ambiguous_without_grid_rate": 1.0,
    "final_receipt_rate": 0.0,
    "n": 108,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "route_risk_dispute",
        108
      ]
    ]
  },
  "verifier_mismatch": {
    "ambiguous_without_grid_rate": 1.0,
    "final_receipt_rate": 0.0,
    "n": 295,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "verifier_condition_dispute",
        295
      ]
    ]
  },
  "wrong_card": {
    "ambiguous_without_grid_rate": 0.0,
    "final_receipt_rate": 0.0,
    "n": 561,
    "packet_complete_rate": 1.0,
    "top_resolution": [
      [
        "condition_or_identity_dispute",
        561
      ]
    ]
  }
}

## Edge Samples

### T014804 `verifier_mismatch`

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
    "insurance_amount": 6320,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 101,
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
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.138,
    "card": "Japanese Neo Discovery Espeon holo",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 5000,
    "seller_region": "US-MI",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T014804",
    "value": 6320
  }
}

### T049575 `verifier_mismatch`

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
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 72,
    "insurance_amount": 6212,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 99,
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
    "bond_action": "exposed_for_claim_mismatch",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.548,
    "card": "Japanese Neo Revelation Houndoom holo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.25,
    "distance": "same_city",
    "forced_outcome": "verifier_mismatch",
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 5000,
    "seller_region": "US-IL",
    "seller_trust": "new",
    "show_overlap": false,
    "trade_id": "T049575",
    "value": 6212
  }
}

### T047398 `verifier_mismatch`

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
    "insurance_amount": 6205,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 99,
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
    "bond_action": "exposed_for_claim_mismatch",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.599,
    "card": "Japanese Fossil Dragonite holo",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "same_city",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": false,
    "seller_can_bond": true,
    "seller_can_meet": true,
    "seller_can_verify": true,
    "seller_insurance_cap": 250,
    "seller_region": "US-MI",
    "seller_trust": "unknown",
    "show_overlap": true,
    "trade_id": "T047398",
    "value": 6205
  }
}

### T015982 `underinsured_lost`

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
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "underinsurance_gap_ack",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition",
      "reject_or_reprice_underinsurance",
      "underinsurance_gap",
      "verifier_unavailable"
    ],
    "inspection_hours": 72,
    "insurance_amount": 1000,
    "insurance_required": true,
    "route": "underinsured_ship",
    "route_cost": 13,
    "route_promise": [
      "tracked",
      "underinsured",
      "underinsured_ship"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_unapproved_gap",
    "notable_evidence": [
      "agreed_value",
      "insurance_receipt",
      "tracking_history",
      "underinsurance_gap_ack"
    ],
    "outcome": "underinsured_lost",
    "packet_complete": true,
    "packet_type": "underinsurance_gap_packet",
    "payout_action": "carrier_claim_plus_seller_gap",
    "reputation_events": [],
    "resolution_type": "underinsurance_gap",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.624,
    "card": "Masaki Gengar",
    "condition_claim": "NM",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-OH",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T015982",
    "value": 6195
  }
}

### T049588 `verifier_mismatch`

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
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 72,
    "insurance_amount": 6114,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 98,
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
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.467,
    "card": "Neo Umbreon holo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.25,
    "distance": "international",
    "forced_outcome": "verifier_mismatch",
    "mode": "extreme_proof",
    "raw": false,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 250,
    "seller_region": "CA-ON",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T049588",
    "value": 6114
  }
}

### T041432 `porch_theft`

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
    "insurance_amount": 6018,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 96,
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
    "human_prompt": "none",
    "liability_owner": "carrier_or_seller_if_signature_missing",
    "notable_evidence": [
      "address_confirmation",
      "delivery_scan",
      "route_promise",
      "signature_status"
    ],
    "outcome": "porch_theft",
    "packet_complete": true,
    "packet_type": "proof_of_delivery_packet",
    "payout_action": "none",
    "reputation_events": [],
    "resolution_type": "delivered_not_received_review",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.702,
    "card": "Neo Umbreon holo",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 250,
    "seller_region": "US-NY",
    "seller_trust": "unknown",
    "show_overlap": false,
    "trade_id": "T041432",
    "value": 6018
  }
}

### T017697 `underinsured_lost`

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
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "underinsurance_gap_ack",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition",
      "reject_or_reprice_underinsurance",
      "underinsurance_gap",
      "verifier_unavailable"
    ],
    "inspection_hours": 72,
    "insurance_amount": 1000,
    "insurance_required": true,
    "route": "underinsured_ship",
    "route_cost": 13,
    "route_promise": [
      "tracked",
      "underinsured",
      "underinsured_ship"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "exposed_for_underinsurance",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_unapproved_gap",
    "notable_evidence": [
      "agreed_value",
      "insurance_receipt",
      "tracking_history",
      "underinsurance_gap_ack"
    ],
    "outcome": "underinsured_lost",
    "packet_complete": true,
    "packet_type": "underinsurance_gap_packet",
    "payout_action": "carrier_claim_plus_seller_gap",
    "reputation_events": [],
    "resolution_type": "underinsurance_gap",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": true,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.013,
    "card": "Japanese Base Gyarados holo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "same_city",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-MI",
    "seller_trust": "unknown",
    "show_overlap": false,
    "trade_id": "T017697",
    "value": 5971
  }
}

### T010045 `underinsured_lost`

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
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "underinsurance_gap_ack",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition",
      "reject_or_reprice_underinsurance",
      "underinsurance_gap",
      "verifier_unavailable"
    ],
    "inspection_hours": 72,
    "insurance_amount": 1000,
    "insurance_required": true,
    "route": "underinsured_ship",
    "route_cost": 13,
    "route_promise": [
      "tracked",
      "underinsured",
      "underinsured_ship"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_unapproved_gap",
    "notable_evidence": [
      "agreed_value",
      "insurance_receipt",
      "tracking_history",
      "underinsurance_gap_ack"
    ],
    "outcome": "underinsured_lost",
    "packet_complete": true,
    "packet_type": "underinsurance_gap_packet",
    "payout_action": "carrier_claim_plus_seller_gap",
    "reputation_events": [],
    "resolution_type": "underinsurance_gap",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.669,
    "card": "Japanese Neo Discovery Espeon holo",
    "condition_claim": "NM",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-TX",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T010045",
    "value": 5926
  }
}

### T002459 `verifier_mismatch`

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
    "insurance_amount": 5909,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 95,
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
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.693,
    "card": "Vending Gastly",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-MI",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T002459",
    "value": 5909
  }
}

### T045304 `porch_theft`

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
    "insurance_amount": 5860,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 94,
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
    "human_prompt": "none",
    "liability_owner": "carrier_or_seller_if_signature_missing",
    "notable_evidence": [
      "address_confirmation",
      "delivery_scan",
      "route_promise",
      "signature_status"
    ],
    "outcome": "porch_theft",
    "packet_complete": true,
    "packet_type": "proof_of_delivery_packet",
    "payout_action": "none",
    "reputation_events": [],
    "resolution_type": "delivered_not_received_review",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.294,
    "card": "Japanese Fossil Dragonite holo",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "same_region",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 250,
    "seller_region": "US-TX",
    "seller_trust": "unknown",
    "show_overlap": false,
    "trade_id": "T045304",
    "value": 5860
  }
}

### T033126 `underinsured_lost`

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
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "underinsurance_gap_ack",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition",
      "reject_or_reprice_underinsurance",
      "underinsurance_gap",
      "verifier_unavailable"
    ],
    "inspection_hours": 72,
    "insurance_amount": 5000,
    "insurance_required": true,
    "route": "underinsured_ship",
    "route_cost": 45,
    "route_promise": [
      "tracked",
      "underinsured",
      "underinsured_ship"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_unapproved_gap",
    "notable_evidence": [
      "agreed_value",
      "insurance_receipt",
      "tracking_history",
      "underinsurance_gap_ack"
    ],
    "outcome": "underinsured_lost",
    "packet_complete": true,
    "packet_type": "underinsurance_gap_packet",
    "payout_action": "carrier_claim_plus_seller_gap",
    "reputation_events": [],
    "resolution_type": "underinsurance_gap",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.874,
    "card": "Sabrina's Gengar",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 5000,
    "seller_region": "US-TX",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T033126",
    "value": 5850
  }
}

### T040435 `underinsured_lost`

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
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "underinsurance_gap_ack",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition",
      "reject_or_reprice_underinsurance",
      "underinsurance_gap",
      "verifier_unavailable"
    ],
    "inspection_hours": 72,
    "insurance_amount": 1000,
    "insurance_required": true,
    "route": "underinsured_ship",
    "route_cost": 13,
    "route_promise": [
      "tracked",
      "underinsured",
      "underinsured_ship"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_unapproved_gap",
    "notable_evidence": [
      "agreed_value",
      "insurance_receipt",
      "tracking_history",
      "underinsurance_gap_ack"
    ],
    "outcome": "underinsured_lost",
    "packet_complete": true,
    "packet_type": "underinsurance_gap_packet",
    "payout_action": "carrier_claim_plus_seller_gap",
    "reputation_events": [],
    "resolution_type": "underinsurance_gap",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.826,
    "card": "Masaki Gengar",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-MI",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T040435",
    "value": 5746
  }
}

### T040826 `underinsured_lost`

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
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "underinsurance_gap_ack",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition",
      "reject_or_reprice_underinsurance",
      "underinsurance_gap",
      "verifier_unavailable"
    ],
    "inspection_hours": 72,
    "insurance_amount": 1000,
    "insurance_required": true,
    "route": "underinsured_ship",
    "route_cost": 13,
    "route_promise": [
      "tracked",
      "underinsured",
      "underinsured_ship"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "exposed_for_underinsurance",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_unapproved_gap",
    "notable_evidence": [
      "agreed_value",
      "insurance_receipt",
      "tracking_history",
      "underinsurance_gap_ack"
    ],
    "outcome": "underinsured_lost",
    "packet_complete": true,
    "packet_type": "underinsurance_gap_packet",
    "payout_action": "carrier_claim_plus_seller_gap",
    "reputation_events": [],
    "resolution_type": "underinsurance_gap",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.444,
    "card": "Neo Umbreon holo",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-CA",
    "seller_trust": "new",
    "show_overlap": false,
    "trade_id": "T040826",
    "value": 5728
  }
}

### T039498 `verifier_mismatch`

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
    "insurance_amount": 5707,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 92,
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
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": true,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.388,
    "card": "Japanese Neo Discovery Espeon holo",
    "condition_claim": "NM",
    "condition_sensitivity": 1.0,
    "distance": "same_region",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": true,
    "seller_can_verify": true,
    "seller_insurance_cap": 5000,
    "seller_region": "US-TX",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T039498",
    "value": 5707
  }
}

### T049541 `verifier_mismatch`

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
    "insurance_amount": 5649,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 91,
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
    "bond_action": "exposed_for_claim_mismatch",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.35,
    "card": "Vending Gastly",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "international",
    "forced_outcome": "verifier_mismatch",
    "mode": "extreme_proof",
    "raw": false,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 250,
    "seller_region": "CA-ON",
    "seller_trust": "unknown",
    "show_overlap": false,
    "trade_id": "T049541",
    "value": 5649
  }
}

### T049542 `verifier_mismatch`

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
    "insurance_amount": 5600,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 90,
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
    "bond_action": "exposed_for_claim_mismatch",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.464,
    "card": "Corocoro Mew",
    "condition_claim": "MP",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": "verifier_mismatch",
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 100,
    "seller_region": "US-MI",
    "seller_trust": "unknown",
    "show_overlap": false,
    "trade_id": "T049542",
    "value": 5600
  }
}

### T021532 `underinsured_lost`

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
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "underinsurance_gap_ack",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition",
      "reject_or_reprice_underinsurance",
      "underinsurance_gap",
      "verifier_unavailable"
    ],
    "inspection_hours": 72,
    "insurance_amount": 1000,
    "insurance_required": true,
    "route": "underinsured_ship",
    "route_cost": 13,
    "route_promise": [
      "tracked",
      "underinsured",
      "underinsured_ship"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_unapproved_gap",
    "notable_evidence": [
      "agreed_value",
      "insurance_receipt",
      "tracking_history",
      "underinsurance_gap_ack"
    ],
    "outcome": "underinsured_lost",
    "packet_complete": true,
    "packet_type": "underinsurance_gap_packet",
    "payout_action": "carrier_claim_plus_seller_gap",
    "reputation_events": [],
    "resolution_type": "underinsurance_gap",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.88,
    "card": "Sabrina's Gengar",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-CA",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T021532",
    "value": 5583
  }
}

### T044592 `verifier_mismatch`

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
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "underinsurance_gap_ack",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition",
      "reject_or_reprice_underinsurance",
      "underinsurance_gap",
      "verifier_unavailable"
    ],
    "inspection_hours": 72,
    "insurance_amount": 5000,
    "insurance_required": true,
    "route": "underinsured_ship",
    "route_cost": 45,
    "route_promise": [
      "tracked",
      "underinsured",
      "underinsured_ship"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "decide_whether_to_route_to_verifier",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.551,
    "card": "Carddass prism oddball",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 5000,
    "seller_region": "US-CA",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T044592",
    "value": 5549
  }
}

### T002044 `underinsured_lost`

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
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "underinsurance_gap_ack",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition",
      "reject_or_reprice_underinsurance",
      "underinsurance_gap",
      "verifier_unavailable"
    ],
    "inspection_hours": 72,
    "insurance_amount": 500,
    "insurance_required": true,
    "route": "underinsured_ship",
    "route_cost": 9,
    "route_promise": [
      "tracked",
      "underinsured",
      "underinsured_ship"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "exposed_for_underinsurance",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_unapproved_gap",
    "notable_evidence": [
      "agreed_value",
      "insurance_receipt",
      "tracking_history",
      "underinsurance_gap_ack"
    ],
    "outcome": "underinsured_lost",
    "packet_complete": true,
    "packet_type": "underinsurance_gap_packet",
    "payout_action": "carrier_claim_plus_seller_gap",
    "reputation_events": [],
    "resolution_type": "underinsurance_gap",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-TX",
    "buyer_risk_tolerance": 0.709,
    "card": "Sabrina's Gengar",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 500,
    "seller_region": "US-MI",
    "seller_trust": "unknown",
    "show_overlap": false,
    "trade_id": "T002044",
    "value": 5517
  }
}

### T036359 `verifier_mismatch`

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
    "insurance_amount": 5468,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 88,
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
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.483,
    "card": "Vending Series Mewtwo",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-CA",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T036359",
    "value": 5468
  }
}

### T030466 `underinsured_lost`

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
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "underinsurance_gap_ack",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition",
      "reject_or_reprice_underinsurance",
      "underinsurance_gap",
      "verifier_unavailable"
    ],
    "inspection_hours": 72,
    "insurance_amount": 1000,
    "insurance_required": true,
    "route": "underinsured_ship",
    "route_cost": 13,
    "route_promise": [
      "tracked",
      "underinsured",
      "underinsured_ship"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_unapproved_gap",
    "notable_evidence": [
      "agreed_value",
      "insurance_receipt",
      "tracking_history",
      "underinsurance_gap_ack"
    ],
    "outcome": "underinsured_lost",
    "packet_complete": true,
    "packet_type": "underinsurance_gap_packet",
    "payout_action": "carrier_claim_plus_seller_gap",
    "reputation_events": [],
    "resolution_type": "underinsurance_gap",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.73,
    "card": "Sabrina's Gengar",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": false,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-CA",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T030466",
    "value": 5458
  }
}

### T032215 `verifier_mismatch`

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
    "insurance_amount": 5408,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 87,
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
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-TX",
    "buyer_risk_tolerance": 0.941,
    "card": "CD Promo Venusaur",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "same_city",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": true,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-TX",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T032215",
    "value": 5408
  }
}

### T016671 `porch_theft`

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
    "insurance_amount": 5397,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 87,
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
    "human_prompt": "none",
    "liability_owner": "carrier_or_seller_if_signature_missing",
    "notable_evidence": [
      "address_confirmation",
      "delivery_scan",
      "route_promise",
      "signature_status"
    ],
    "outcome": "porch_theft",
    "packet_complete": true,
    "packet_type": "proof_of_delivery_packet",
    "payout_action": "none",
    "reputation_events": [],
    "resolution_type": "delivered_not_received_review",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.646,
    "card": "Sabrina's Gengar",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 5000,
    "seller_region": "US-OH",
    "seller_trust": "unknown",
    "show_overlap": false,
    "trade_id": "T016671",
    "value": 5397
  }
}

### T007909 `verifier_mismatch`

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
    "insurance_amount": 5395,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 87,
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
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.419,
    "card": "CD Promo Venusaur",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-TX",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T007909",
    "value": 5395
  }
}

### T044892 `underinsured_lost`

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
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "underinsurance_gap_ack",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition",
      "reject_or_reprice_underinsurance",
      "underinsurance_gap",
      "verifier_unavailable"
    ],
    "inspection_hours": 72,
    "insurance_amount": 1000,
    "insurance_required": true,
    "route": "underinsured_ship",
    "route_cost": 13,
    "route_promise": [
      "tracked",
      "underinsured",
      "underinsured_ship"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_unapproved_gap",
    "notable_evidence": [
      "agreed_value",
      "insurance_receipt",
      "tracking_history",
      "underinsurance_gap_ack"
    ],
    "outcome": "underinsured_lost",
    "packet_complete": true,
    "packet_type": "underinsurance_gap_packet",
    "payout_action": "carrier_claim_plus_seller_gap",
    "reputation_events": [],
    "resolution_type": "underinsurance_gap",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.626,
    "card": "Japanese Neo Discovery Espeon holo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-IL",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T044892",
    "value": 5391
  }
}

### T030749 `underinsured_lost`

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
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "underinsurance_gap_ack",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition",
      "reject_or_reprice_underinsurance",
      "underinsurance_gap",
      "verifier_unavailable"
    ],
    "inspection_hours": 72,
    "insurance_amount": 5000,
    "insurance_required": true,
    "route": "underinsured_ship",
    "route_cost": 45,
    "route_promise": [
      "tracked",
      "underinsured",
      "underinsured_ship"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "exposed_for_underinsurance",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_unapproved_gap",
    "notable_evidence": [
      "agreed_value",
      "insurance_receipt",
      "tracking_history",
      "underinsurance_gap_ack"
    ],
    "outcome": "underinsured_lost",
    "packet_complete": true,
    "packet_type": "underinsurance_gap_packet",
    "payout_action": "carrier_claim_plus_seller_gap",
    "reputation_events": [],
    "resolution_type": "underinsurance_gap",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.272,
    "card": "Japanese Neo Revelation Houndoom holo",
    "condition_claim": "LP",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 5000,
    "seller_region": "US-NY",
    "seller_trust": "unknown",
    "show_overlap": false,
    "trade_id": "T030749",
    "value": 5355
  }
}

### T049576 `verifier_mismatch`

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
    "insurance_amount": 5328,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 86,
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
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.399,
    "card": "Vending Series Mewtwo",
    "condition_claim": "MP",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": "verifier_mismatch",
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-IL",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T049576",
    "value": 5328
  }
}

### T012993 `verifier_mismatch`

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
    "insurance_amount": 5320,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 86,
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
    "bond_action": "exposed_for_claim_mismatch",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.213,
    "card": "Sabrina's Gengar",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 500,
    "seller_region": "US-CA",
    "seller_trust": "new",
    "show_overlap": false,
    "trade_id": "T012993",
    "value": 5320
  }
}

### T049564 `verifier_mismatch`

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
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 72,
    "insurance_amount": 5284,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 85,
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
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.784,
    "card": "Vending Series Mewtwo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.25,
    "distance": "same_region",
    "forced_outcome": "verifier_mismatch",
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-NY",
    "seller_trust": "known",
    "show_overlap": true,
    "trade_id": "T049564",
    "value": 5284
  }
}

### T006070 `porch_theft`

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
    "insurance_amount": 5281,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 85,
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
    "human_prompt": "none",
    "liability_owner": "carrier_or_seller_if_signature_missing",
    "notable_evidence": [
      "address_confirmation",
      "delivery_scan",
      "route_promise",
      "signature_status"
    ],
    "outcome": "porch_theft",
    "packet_complete": true,
    "packet_type": "proof_of_delivery_packet",
    "payout_action": "none",
    "reputation_events": [],
    "resolution_type": "delivered_not_received_review",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.513,
    "card": "Neo Umbreon holo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.8,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 1000,
    "seller_region": "US-OH",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T006070",
    "value": 5281
  }
}

### T016479 `underinsured_lost`

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
      "timestamped_photos",
      "tracking_history",
      "tracking_url",
      "underinsurance_gap_ack",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "evidence_tier": "verifier_grade",
    "human_gates": [
      "condition_sensitive",
      "high_value_or_raw_condition",
      "reject_or_reprice_underinsurance",
      "underinsurance_gap",
      "verifier_unavailable"
    ],
    "inspection_hours": 72,
    "insurance_amount": 1000,
    "insurance_required": true,
    "route": "underinsured_ship",
    "route_cost": 13,
    "route_promise": [
      "tracked",
      "underinsured",
      "underinsured_ship"
    ],
    "signature_required": true,
    "verifier_required": true
  },
  "resolution": {
    "ambiguous_without_grid": true,
    "bond_action": "none",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_unapproved_gap",
    "notable_evidence": [
      "agreed_value",
      "insurance_receipt",
      "tracking_history",
      "underinsurance_gap_ack"
    ],
    "outcome": "underinsured_lost",
    "packet_complete": true,
    "packet_type": "underinsurance_gap_packet",
    "payout_action": "carrier_claim_plus_seller_gap",
    "reputation_events": [],
    "resolution_type": "underinsurance_gap",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.64,
    "card": "Sabrina's Gengar",
    "condition_claim": "NM-",
    "condition_sensitivity": 1.0,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-OH",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T016479",
    "value": 5273
  }
}

### T049535 `verifier_mismatch`

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
      "high_value_or_raw_condition"
    ],
    "inspection_hours": 72,
    "insurance_amount": 5262,
    "insurance_required": true,
    "route": "verifier_forward",
    "route_cost": 85,
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
    "bond_action": "exposed_for_claim_mismatch",
    "escrow_action": "hold",
    "final_receipt": false,
    "human_prompt": "none",
    "liability_owner": "seller_if_claim_mismatched",
    "notable_evidence": [
      "inventory_claim",
      "verifier_condition_attestation",
      "verifier_intake"
    ],
    "outcome": "verifier_mismatch",
    "packet_complete": true,
    "packet_type": "verifier_packet",
    "payout_action": "refund_or_renegotiate",
    "reputation_events": [],
    "resolution_type": "verifier_condition_dispute",
    "violations": []
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.064,
    "card": "Vending Gastly",
    "condition_claim": "MP",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": "verifier_mismatch",
    "mode": "extreme_proof",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": true,
    "seller_insurance_cap": 250,
    "seller_region": "US-NY",
    "seller_trust": "unknown",
    "show_overlap": false,
    "trade_id": "T049535",
    "value": 5262
  }
}
