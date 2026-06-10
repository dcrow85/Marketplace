# Marketplace Protocol Massive Edge-Case Simulation

Run: `protocol_edge_case_20260518T160937Z`
Seed: `20260518`
Trades: `50000`

## Diagnosis

- Hard invariant violations found: {'casual_raw_evidence_bloat': 9344}
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
  "packet_complete_rate": 0.9997,
  "route_exception_approval_rate": 0.031,
  "violations": {
    "casual_raw_evidence_bloat": 9344
  }
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
  "insured_ship": 29503,
  "international_ship": 6118,
  "local_meetup": 2138,
  "show_pickup": 1068,
  "underinsured_ship": 7256,
  "uninsured_ship": 857,
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
    "mean": 17.92,
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
    "packet_complete_rate": 0.969,
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

### T032294 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 74,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.426,
    "card": "Japanese Neo Revelation Houndoom holo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 5000,
    "seller_region": "US-OH",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T032294",
    "value": 74
  }
}

### T032306 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 74,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.313,
    "card": "Sabrina's Gengar",
    "condition_claim": "LP",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 5000,
    "seller_region": "US-OH",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T032306",
    "value": 74
  }
}

### T017285 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 73,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.623,
    "card": "Japanese Fossil Dragonite holo",
    "condition_claim": "NM-",
    "condition_sensitivity": 0.47,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-MI",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T017285",
    "value": 73
  }
}

### T027000 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 73,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.584,
    "card": "CD Promo Venusaur",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 5000,
    "seller_region": "US-CA",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T027000",
    "value": 73
  }
}

### T042708 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 73,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.433,
    "card": "Japanese Neo Discovery Espeon holo",
    "condition_claim": "NM-",
    "condition_sensitivity": 0.47,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 500,
    "seller_region": "US-CA",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T042708",
    "value": 73
  }
}

### T009118 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 72,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.577,
    "card": "Neo Umbreon holo",
    "condition_claim": "NM-",
    "condition_sensitivity": 0.47,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 250,
    "seller_region": "US-MI",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T009118",
    "value": 72
  }
}

### T019794 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 72,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.547,
    "card": "Japanese Neo Revelation Houndoom holo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 500,
    "seller_region": "US-TX",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T019794",
    "value": 72
  }
}

### T020047 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 72,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-TX",
    "buyer_risk_tolerance": 0.76,
    "card": "Sabrina's Gengar",
    "condition_claim": "LP",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 5000,
    "seller_region": "US-MI",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T020047",
    "value": 72
  }
}

### T029378 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 72,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.52,
    "card": "CD Promo Venusaur",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.25,
    "distance": "same_region",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 250,
    "seller_region": "US-CA",
    "seller_trust": "trusted",
    "show_overlap": true,
    "trade_id": "T029378",
    "value": 72
  }
}

### T008518 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 71,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.417,
    "card": "Japanese Neo Revelation Houndoom holo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 250,
    "seller_region": "US-IL",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T008518",
    "value": 71
  }
}

### T023600 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 71,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-TX",
    "buyer_risk_tolerance": 0.369,
    "card": "Japanese Fossil Dragonite holo",
    "condition_claim": "NM-",
    "condition_sensitivity": 0.47,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": false,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 500,
    "seller_region": "US-TX",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T023600",
    "value": 71
  }
}

### T029968 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 71,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.602,
    "card": "Japanese Fossil Dragonite holo",
    "condition_claim": "MP",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 250,
    "seller_region": "US-TX",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T029968",
    "value": 71
  }
}

### T044456 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 71,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.467,
    "card": "Japanese Neo Discovery Espeon holo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 250,
    "seller_region": "US-NY",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T044456",
    "value": 71
  }
}

### T045869 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 71,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-TX",
    "buyer_risk_tolerance": 0.569,
    "card": "Corocoro Mew",
    "condition_claim": "LP",
    "condition_sensitivity": 0.25,
    "distance": "same_region",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": true,
    "seller_can_verify": false,
    "seller_insurance_cap": 100,
    "seller_region": "US-IL",
    "seller_trust": "trusted",
    "show_overlap": true,
    "trade_id": "T045869",
    "value": 71
  }
}

### T019928 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 70,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.35,
    "card": "Vending Series Mewtwo",
    "condition_claim": "NM-",
    "condition_sensitivity": 0.47,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 250,
    "seller_region": "US-OH",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T019928",
    "value": 70
  }
}

### T032356 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 70,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.41,
    "card": "Japanese Fossil Dragonite holo",
    "condition_claim": "NM-",
    "condition_sensitivity": 0.47,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 500,
    "seller_region": "US-OH",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T032356",
    "value": 70
  }
}

### T019655 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 69,
    "insurance_required": true,
    "route": "international_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.709,
    "card": "Japanese Base Gyarados holo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.25,
    "distance": "international",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 500,
    "seller_region": "GB-LON",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T019655",
    "value": 69
  }
}

### T047173 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 69,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-TX",
    "buyer_risk_tolerance": 0.236,
    "card": "Vending Series Mewtwo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 250,
    "seller_region": "US-OH",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T047173",
    "value": 69
  }
}

### T009432 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 68,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.294,
    "card": "Japanese Fossil Dragonite holo",
    "condition_claim": "MP",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-CA",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T009432",
    "value": 68
  }
}

### T017039 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 68,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-NY",
    "buyer_risk_tolerance": 0.23,
    "card": "Corocoro Mew",
    "condition_claim": "MP",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 100,
    "seller_region": "US-CA",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T017039",
    "value": 68
  }
}

### T039424 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 68,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.524,
    "card": "Vending Series Mewtwo",
    "condition_claim": "MP",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 100,
    "seller_region": "US-OH",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T039424",
    "value": 68
  }
}

### T044259 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 68,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.126,
    "card": "Japanese Neo Revelation Houndoom holo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": false,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 100,
    "seller_region": "US-NY",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T044259",
    "value": 68
  }
}

### T024172 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 67,
    "insurance_required": true,
    "route": "international_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.229,
    "card": "Vending Series Mewtwo",
    "condition_claim": "NM",
    "condition_sensitivity": 0.47,
    "distance": "international",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 100,
    "seller_region": "GB-LON",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T024172",
    "value": 67
  }
}

### T038583 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 67,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.253,
    "card": "Japanese Base Gyarados holo",
    "condition_claim": "NM",
    "condition_sensitivity": 0.47,
    "distance": "same_city",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": true,
    "seller_can_verify": false,
    "seller_insurance_cap": 5000,
    "seller_region": "US-MI",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T038583",
    "value": 67
  }
}

### T001831 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 66,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-MI",
    "buyer_risk_tolerance": 0.748,
    "card": "Japanese Neo Revelation Houndoom holo",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 100,
    "seller_region": "US-MI",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T001831",
    "value": 66
  }
}

### T025332 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 66,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-CA",
    "buyer_risk_tolerance": 0.153,
    "card": "Sabrina's Gengar",
    "condition_claim": "MP",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": false,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 500,
    "seller_region": "US-OH",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T025332",
    "value": 66
  }
}

### T041664 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 66,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.525,
    "card": "Carddass prism oddball",
    "condition_claim": "LP+",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 500,
    "seller_region": "US-IL",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T041664",
    "value": 66
  }
}

### T042642 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 66,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.291,
    "card": "Carddass prism oddball",
    "condition_claim": "MP",
    "condition_sensitivity": 0.25,
    "distance": "domestic",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 500,
    "seller_region": "US-IL",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T042642",
    "value": 66
  }
}

### T044718 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 66,
    "insurance_required": true,
    "route": "insured_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.479,
    "card": "Japanese Base Gyarados holo",
    "condition_claim": "NM",
    "condition_sensitivity": 0.47,
    "distance": "same_city",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": true,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "US-OH",
    "seller_trust": "known",
    "show_overlap": false,
    "trade_id": "T044718",
    "value": 66
  }
}

### T049322 `uninsured_lost`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 66,
    "insurance_required": true,
    "route": "international_ship",
    "route_cost": 7,
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
    "liability_owner": "seller_route_failure",
    "notable_evidence": [
      "carrier_acceptance",
      "route_promise",
      "tracking_url",
      "uninsured_route_ack"
    ],
    "outcome": "uninsured_lost",
    "packet_complete": true,
    "packet_type": "route_risk_packet",
    "payout_action": "refund_buyer_or_bond",
    "reputation_events": [],
    "resolution_type": "route_risk_dispute",
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-TX",
    "buyer_risk_tolerance": 0.92,
    "card": "Vending Gastly",
    "condition_claim": "NM",
    "condition_sensitivity": 0.47,
    "distance": "international",
    "forced_outcome": "uninsured_lost",
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 250,
    "seller_region": "CA-ON",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T049322",
    "value": 66
  }
}

### T000532 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 65,
    "insurance_required": true,
    "route": "international_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-IL",
    "buyer_risk_tolerance": 0.389,
    "card": "Sabrina's Gengar",
    "condition_claim": "LP",
    "condition_sensitivity": 0.25,
    "distance": "international",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": false,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 250,
    "seller_region": "CA-ON",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T000532",
    "value": 65
  }
}

### T002211 `porch_theft`

{
  "plan": {
    "bond_amount": 0,
    "bond_required": false,
    "buyer_approved_exceptions": [],
    "delayed_payout": false,
    "evidence_items": [
      "agreed_value",
      "back_photo",
      "carrier_acceptance",
      "condition_band",
      "front_photo",
      "insurance_receipt",
      "inventory_claim",
      "label",
      "packaging_attestation",
      "signature_confirmation_required",
      "tracking_history",
      "tracking_url"
    ],
    "evidence_tier": "light",
    "human_gates": [],
    "inspection_hours": 24,
    "insurance_amount": 65,
    "insurance_required": true,
    "route": "international_ship",
    "route_cost": 7,
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
    "violations": [
      "casual_raw_evidence_bloat"
    ]
  },
  "trade": {
    "buyer_prefers_in_person": false,
    "buyer_region": "US-OH",
    "buyer_risk_tolerance": 0.53,
    "card": "Corocoro Mew",
    "condition_claim": "NM",
    "condition_sensitivity": 0.47,
    "distance": "international",
    "forced_outcome": null,
    "mode": "casual_raw",
    "raw": true,
    "seller_can_bond": true,
    "seller_can_meet": false,
    "seller_can_verify": false,
    "seller_insurance_cap": 1000,
    "seller_region": "GB-LON",
    "seller_trust": "trusted",
    "show_overlap": false,
    "trade_id": "T002211",
    "value": 65
  }
}
