# Marketplace Agentic E2E Simulation

Run: `agent_market_20260518T194505Z`
Seed: `20260518`
Trades: `250`

## Diagnosis

- No simulation invariants broke: automation did not rule past signed friction thresholds.
- Automated policies were selected for 28.8% of trades and produced direct automated rulings in 3.2%.
- 22.2% of automated-policy trades crossed friction and escalated instead of pretending to be simple.
- Human or arbiter-agent paths handled the rest, with a mean buyer attention estimate of 5.02 minutes.
- Top friction sources were human_arbiter_selected_prelock (50), evidence_ambiguity (44), seller_trust_gap (17).
- Low-value trades are where automated arbitration actually pays for itself.

## Topline

{
  "automated_policy_selection_rate": 0.288,
  "automated_ruling_rate": 0.032,
  "automation_escalation_rate": 0.2222,
  "claim_rate": 0.296,
  "clean_close_rate": 0.676,
  "friction_trigger_rate": 0.264,
  "violations": {}
}

## Arbitration Modes

{
  "arbiter_agent_delegated": 2,
  "automated": 8,
  "automated_escalated_to_human": 16,
  "human_arbiter": 24,
  "human_arbiter_agent_assisted": 24,
  "none": 176
}

## Friction Triggers

{
  "authenticity_or_identity_risk": 7,
  "bond_penalty_above_auto_cap": 7,
  "case_scope_outside_automation": 2,
  "delivery_risk_ambiguous": 5,
  "evidence_ambiguity": 44,
  "human_arbiter_selected_prelock": 50,
  "in_person_handoff_ambiguity": 4,
  "refund_above_auto_cap": 8,
  "route_gap_owner_review": 8,
  "seller_trust_gap": 17
}

## Value Bands

{
  "grail": {
    "automated_ruling_rate": 0.0,
    "clean_close_rate": 0.609,
    "friction_escalation_rate": 0.348,
    "mean_value": 2649.78,
    "n": 23
  },
  "high": {
    "automated_ruling_rate": 0.0,
    "clean_close_rate": 0.6,
    "friction_escalation_rate": 0.38,
    "mean_value": 718.78,
    "n": 50
  },
  "low": {
    "automated_ruling_rate": 0.08,
    "clean_close_rate": 0.69,
    "friction_escalation_rate": 0.21,
    "mean_value": 59.13,
    "n": 100
  },
  "mid": {
    "automated_ruling_rate": 0.0,
    "clean_close_rate": 0.727,
    "friction_escalation_rate": 0.234,
    "mean_value": 226.57,
    "n": 77
  }
}

## Selected Arbiters

{
  "did:market:arbiter:auto-low-tcg-1": 72,
  "did:market:arbiter:high-end-panel-1": 81,
  "did:market:arbiter:raw-condition-1": 88,
  "did:market:arbiter:route-claims-1": 9
}

## Outcomes

{
  "authenticity_flag": {
    "n": 3,
    "top_arbitration_mode": [
      [
        "human_arbiter",
        3
      ]
    ],
    "top_friction": [
      [
        "authenticity_or_identity_risk",
        3
      ],
      [
        "evidence_ambiguity",
        3
      ],
      [
        "human_arbiter_selected_prelock",
        3
      ],
      [
        "seller_trust_gap",
        1
      ]
    ]
  },
  "buyer_remorse": {
    "n": 7,
    "top_arbitration_mode": [
      [
        "none",
        7
      ]
    ],
    "top_friction": []
  },
  "clean_close": {
    "n": 169,
    "top_arbitration_mode": [
      [
        "none",
        169
      ]
    ],
    "top_friction": []
  },
  "insured_damaged": {
    "n": 6,
    "top_arbitration_mode": [
      [
        "human_arbiter_agent_assisted",
        2
      ],
      [
        "automated_escalated_to_human",
        2
      ]
    ],
    "top_friction": [
      [
        "evidence_ambiguity",
        6
      ],
      [
        "human_arbiter_selected_prelock",
        4
      ],
      [
        "seller_trust_gap",
        2
      ]
    ]
  },
  "insured_lost": {
    "n": 4,
    "top_arbitration_mode": [
      [
        "automated_escalated_to_human",
        2
      ],
      [
        "automated",
        2
      ]
    ],
    "top_friction": [
      [
        "evidence_ambiguity",
        2
      ]
    ]
  },
  "local_handoff_dispute": {
    "n": 4,
    "top_arbitration_mode": [
      [
        "human_arbiter_agent_assisted",
        2
      ],
      [
        "human_arbiter",
        1
      ]
    ],
    "top_friction": [
      [
        "evidence_ambiguity",
        4
      ],
      [
        "in_person_handoff_ambiguity",
        4
      ],
      [
        "human_arbiter_selected_prelock",
        3
      ],
      [
        "case_scope_outside_automation",
        1
      ]
    ]
  },
  "material_misdescription": {
    "n": 12,
    "top_arbitration_mode": [
      [
        "automated_escalated_to_human",
        6
      ],
      [
        "human_arbiter",
        4
      ]
    ],
    "top_friction": [
      [
        "evidence_ambiguity",
        12
      ],
      [
        "human_arbiter_selected_prelock",
        6
      ],
      [
        "bond_penalty_above_auto_cap",
        6
      ],
      [
        "refund_above_auto_cap",
        6
      ]
    ]
  },
  "minor_condition_delta": {
    "n": 18,
    "top_arbitration_mode": [
      [
        "human_arbiter_agent_assisted",
        8
      ],
      [
        "automated",
        5
      ]
    ],
    "top_friction": [
      [
        "human_arbiter_selected_prelock",
        13
      ],
      [
        "seller_trust_gap",
        3
      ]
    ]
  },
  "porch_theft": {
    "n": 5,
    "top_arbitration_mode": [
      [
        "human_arbiter_agent_assisted",
        4
      ],
      [
        "human_arbiter",
        1
      ]
    ],
    "top_friction": [
      [
        "delivery_risk_ambiguous",
        5
      ],
      [
        "evidence_ambiguity",
        5
      ],
      [
        "human_arbiter_selected_prelock",
        5
      ],
      [
        "seller_trust_gap",
        2
      ]
    ]
  },
  "route_delay": {
    "n": 5,
    "top_arbitration_mode": [
      [
        "human_arbiter_agent_assisted",
        2
      ],
      [
        "human_arbiter",
        1
      ]
    ],
    "top_friction": [
      [
        "human_arbiter_selected_prelock",
        4
      ],
      [
        "seller_trust_gap",
        1
      ]
    ]
  },
  "seller_nonship": {
    "n": 5,
    "top_arbitration_mode": [
      [
        "human_arbiter",
        3
      ],
      [
        "human_arbiter_agent_assisted",
        2
      ]
    ],
    "top_friction": [
      [
        "human_arbiter_selected_prelock",
        5
      ],
      [
        "seller_trust_gap",
        2
      ]
    ]
  },
  "underinsured_lost": {
    "n": 4,
    "top_arbitration_mode": [
      [
        "human_arbiter",
        3
      ],
      [
        "human_arbiter_agent_assisted",
        1
      ]
    ],
    "top_friction": [
      [
        "evidence_ambiguity",
        4
      ],
      [
        "human_arbiter_selected_prelock",
        4
      ],
      [
        "route_gap_owner_review",
        4
      ],
      [
        "seller_trust_gap",
        1
      ]
    ]
  },
  "uninsured_lost": {
    "n": 4,
    "top_arbitration_mode": [
      [
        "automated_escalated_to_human",
        4
      ]
    ],
    "top_friction": [
      [
        "evidence_ambiguity",
        4
      ],
      [
        "route_gap_owner_review",
        4
      ]
    ]
  },
  "wrong_card": {
    "n": 4,
    "top_arbitration_mode": [
      [
        "human_arbiter",
        2
      ],
      [
        "automated_escalated_to_human",
        1
      ]
    ],
    "top_friction": [
      [
        "authenticity_or_identity_risk",
        4
      ],
      [
        "evidence_ambiguity",
        4
      ],
      [
        "human_arbiter_selected_prelock",
        3
      ],
      [
        "bond_penalty_above_auto_cap",
        1
      ]
    ]
  }
}

## Attention and Packet Load

{
  "mean_buyer_attention_minutes": 5.02,
  "mean_packet_count": 5.69,
  "mean_seller_attention_minutes": 9.63,
  "p90_buyer_attention_minutes": 10,
  "p90_seller_attention_minutes": 14
}

## Interesting Trade Transcripts

### SIM-0138 local_handoff_dispute

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$89` (low)
- Seller trust: `unknown`
- Route: `local_meetup`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `case_scope_outside_automation, evidence_ambiguity, in_person_handoff_ambiguity, refund_above_auto_cap`
- Human questions: `approve_severe_remedy_or_escalation, ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0138: local_handoff_dispute on a $89 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: case_scope_outside_automation, evidence_ambiguity, in_person_handoff_ambiguity, refund_above_auto_cap.

### SIM-0063 insured_lost

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$84` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `evidence_ambiguity`
- Human questions: `ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0063: insured_lost on a $84 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: evidence_ambiguity.

### SIM-0217 insured_damaged

- Card: Japanese Neo Discovery Espeon holo
- Value: `$80` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `evidence_ambiguity`
- Human questions: `ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0217: insured_damaged on a $80 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: evidence_ambiguity.

### SIM-0177 uninsured_lost

- Card: Japanese Neo Discovery Espeon holo
- Value: `$76` (low)
- Seller trust: `known`
- Route: `uninsured_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `evidence_ambiguity, route_gap_owner_review`
- Human questions: `ask_human_or_human_arbiter_to_review_evidence, confirm_who_accepted_route_value_gap`
- Narrative: SIM-0177: uninsured_lost on a $76 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: evidence_ambiguity, route_gap_owner_review.

### SIM-0188 material_misdescription

- Card: Japanese Neo Discovery Espeon holo
- Value: `$74` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `bond_penalty_above_auto_cap, evidence_ambiguity, refund_above_auto_cap`
- Human questions: `approve_severe_remedy_or_escalation, ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0188: material_misdescription on a $74 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: bond_penalty_above_auto_cap, evidence_ambiguity, refund_above_auto_cap.

### SIM-0120 uninsured_lost

- Card: Japanese Neo Discovery Espeon holo
- Value: `$72` (low)
- Seller trust: `trusted`
- Route: `uninsured_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `evidence_ambiguity, route_gap_owner_review`
- Human questions: `ask_human_or_human_arbiter_to_review_evidence, confirm_who_accepted_route_value_gap`
- Narrative: SIM-0120: uninsured_lost on a $72 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: evidence_ambiguity, route_gap_owner_review.

### SIM-0222 uninsured_lost

- Card: Vending Gastly
- Value: `$72` (low)
- Seller trust: `known`
- Route: `uninsured_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `evidence_ambiguity, route_gap_owner_review`
- Human questions: `ask_human_or_human_arbiter_to_review_evidence, confirm_who_accepted_route_value_gap`
- Narrative: SIM-0222: uninsured_lost on a $72 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: evidence_ambiguity, route_gap_owner_review.

### SIM-0025 uninsured_lost

- Card: Sabrina's Gengar
- Value: `$57` (low)
- Seller trust: `known`
- Route: `uninsured_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `evidence_ambiguity, route_gap_owner_review`
- Human questions: `ask_human_or_human_arbiter_to_review_evidence, confirm_who_accepted_route_value_gap`
- Narrative: SIM-0025: uninsured_lost on a $57 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: evidence_ambiguity, route_gap_owner_review.

### SIM-0073 material_misdescription

- Card: Corocoro Mew
- Value: `$56` (low)
- Seller trust: `unknown`
- Route: `international_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `bond_penalty_above_auto_cap, evidence_ambiguity, refund_above_auto_cap`
- Human questions: `approve_severe_remedy_or_escalation, ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0073: material_misdescription on a $56 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: bond_penalty_above_auto_cap, evidence_ambiguity, refund_above_auto_cap.

### SIM-0069 material_misdescription

- Card: Carddass prism oddball
- Value: `$48` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `bond_penalty_above_auto_cap, evidence_ambiguity, refund_above_auto_cap`
- Human questions: `approve_severe_remedy_or_escalation, ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0069: material_misdescription on a $48 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: bond_penalty_above_auto_cap, evidence_ambiguity, refund_above_auto_cap.

### SIM-0215 material_misdescription

- Card: Vending Gastly
- Value: `$48` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `bond_penalty_above_auto_cap, evidence_ambiguity, refund_above_auto_cap`
- Human questions: `approve_severe_remedy_or_escalation, ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0215: material_misdescription on a $48 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: bond_penalty_above_auto_cap, evidence_ambiguity, refund_above_auto_cap.

### SIM-0014 insured_lost

- Card: Masaki Gengar
- Value: `$47` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `evidence_ambiguity`
- Human questions: `ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0014: insured_lost on a $47 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: evidence_ambiguity.

### SIM-0242 material_misdescription

- Card: Neo Umbreon holo
- Value: `$45` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `bond_penalty_above_auto_cap, evidence_ambiguity, refund_above_auto_cap`
- Human questions: `approve_severe_remedy_or_escalation, ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0242: material_misdescription on a $45 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: bond_penalty_above_auto_cap, evidence_ambiguity, refund_above_auto_cap.

### SIM-0086 material_misdescription

- Card: Japanese Fossil Dragonite holo
- Value: `$41` (low)
- Seller trust: `unknown`
- Route: `international_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `bond_penalty_above_auto_cap, evidence_ambiguity, refund_above_auto_cap`
- Human questions: `approve_severe_remedy_or_escalation, ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0086: material_misdescription on a $41 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: bond_penalty_above_auto_cap, evidence_ambiguity, refund_above_auto_cap.

### SIM-0077 wrong_card

- Card: Japanese Base Gyarados holo
- Value: `$40` (low)
- Seller trust: `trusted`
- Route: `insured_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `authenticity_or_identity_risk, bond_penalty_above_auto_cap, case_scope_outside_automation, evidence_ambiguity, refund_above_auto_cap`
- Human questions: `approve_severe_remedy_or_escalation, ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0077: wrong_card on a $40 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: authenticity_or_identity_risk, bond_penalty_above_auto_cap, case_scope_outside_automation, evidence_ambiguity, refund_above_auto_cap.

### SIM-0144 insured_damaged

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$28` (low)
- Seller trust: `unknown`
- Route: `insured_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `evidence_ambiguity`
- Human questions: `ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0144: insured_damaged on a $28 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: evidence_ambiguity.

### SIM-0087 seller_nonship

- Card: Japanese Neo Revelation Houndoom holo
- Value: `$2798` (grail)
- Seller trust: `new`
- Route: `underinsured_ship`
- Selected arbiter: `did:market:arbiter:high-end-panel-1`
- Arbitration mode: `human_arbiter`
- Friction: `human_arbiter_selected_prelock, seller_trust_gap`
- Human questions: `approve_severe_remedy_or_escalation`
- Narrative: SIM-0087: seller_nonship on a $2798 grail trade. Selected human arbiter did:market:arbiter:high-end-panel-1. Path: human_ruling. Friction: human_arbiter_selected_prelock, seller_trust_gap.

### SIM-0170 porch_theft

- Card: CD Promo Venusaur
- Value: `$2389` (grail)
- Seller trust: `new`
- Route: `insured_ship`
- Selected arbiter: `did:market:arbiter:high-end-panel-1`
- Arbitration mode: `human_arbiter`
- Friction: `delivery_risk_ambiguous, evidence_ambiguity, human_arbiter_selected_prelock, seller_trust_gap`
- Human questions: `ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0170: porch_theft on a $2389 grail trade. Selected human arbiter did:market:arbiter:high-end-panel-1. Path: human_ruling. Friction: delivery_risk_ambiguous, evidence_ambiguity, human_arbiter_selected_prelock, seller_trust_gap.

## Artifacts

- `summary.json`: aggregate metrics.
- `trades.jsonl`: one packet-shaped simulation record per trade.
- `scenario_summary.csv`: outcome and arbitration mode summary.
