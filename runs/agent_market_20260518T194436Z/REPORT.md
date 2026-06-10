# Marketplace Agentic E2E Simulation

Run: `agent_market_20260518T194436Z`
Seed: `20260518`
Trades: `250`

## Diagnosis

- No simulation invariants broke: automation did not rule past signed friction thresholds.
- Automated policies were selected for 23.6% of trades and produced direct automated rulings in 0.8%.
- 23.7% of automated-policy trades crossed friction and escalated instead of pretending to be simple.
- Human or arbiter-agent paths handled the rest, with a mean buyer attention estimate of 5.2 minutes.
- Top friction sources were human_arbiter_selected_prelock (55), evidence_ambiguity (41), seller_trust_gap (21).
- Low-value trades are where automated arbitration actually pays for itself.

## Topline

{
  "automated_policy_selection_rate": 0.236,
  "automated_ruling_rate": 0.008,
  "automation_escalation_rate": 0.2373,
  "claim_rate": 0.284,
  "clean_close_rate": 0.68,
  "friction_trigger_rate": 0.276,
  "violations": {}
}

## Arbitration Modes

{
  "arbiter_agent_delegated": 2,
  "automated": 2,
  "automated_escalated_to_human": 14,
  "human_arbiter": 23,
  "human_arbiter_agent_assisted": 30,
  "none": 179
}

## Friction Triggers

{
  "authenticity_or_identity_risk": 8,
  "bond_penalty_above_auto_cap": 7,
  "case_scope_outside_automation": 1,
  "delivery_risk_ambiguous": 5,
  "evidence_ambiguity": 41,
  "human_arbiter_selected_prelock": 55,
  "in_person_handoff_ambiguity": 3,
  "refund_above_auto_cap": 7,
  "route_gap_owner_review": 8,
  "seller_trust_gap": 21
}

## Value Bands

{
  "grail": {
    "automated_ruling_rate": 0.0,
    "clean_close_rate": 0.565,
    "friction_escalation_rate": 0.391,
    "mean_value": 2475.78,
    "n": 23
  },
  "high": {
    "automated_ruling_rate": 0.0,
    "clean_close_rate": 0.596,
    "friction_escalation_rate": 0.385,
    "mean_value": 751.23,
    "n": 52
  },
  "low": {
    "automated_ruling_rate": 0.023,
    "clean_close_rate": 0.744,
    "friction_escalation_rate": 0.198,
    "mean_value": 58.07,
    "n": 86
  },
  "mid": {
    "automated_ruling_rate": 0.0,
    "clean_close_rate": 0.697,
    "friction_escalation_rate": 0.258,
    "mean_value": 222.36,
    "n": 89
  }
}

## Selected Arbiters

{
  "did:market:arbiter:auto-low-tcg-1": 59,
  "did:market:arbiter:high-end-panel-1": 81,
  "did:market:arbiter:raw-condition-1": 99,
  "did:market:arbiter:route-claims-1": 11
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
    "n": 9,
    "top_arbitration_mode": [
      [
        "none",
        9
      ]
    ],
    "top_friction": []
  },
  "clean_close": {
    "n": 170,
    "top_arbitration_mode": [
      [
        "none",
        170
      ]
    ],
    "top_friction": []
  },
  "insured_damaged": {
    "n": 5,
    "top_arbitration_mode": [
      [
        "human_arbiter_agent_assisted",
        2
      ],
      [
        "human_arbiter",
        2
      ]
    ],
    "top_friction": [
      [
        "evidence_ambiguity",
        5
      ],
      [
        "human_arbiter_selected_prelock",
        4
      ],
      [
        "seller_trust_gap",
        3
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
        "human_arbiter_agent_assisted",
        2
      ]
    ],
    "top_friction": [
      [
        "evidence_ambiguity",
        2
      ],
      [
        "human_arbiter_selected_prelock",
        2
      ]
    ]
  },
  "local_handoff_dispute": {
    "n": 3,
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
        3
      ],
      [
        "human_arbiter_selected_prelock",
        3
      ],
      [
        "in_person_handoff_ambiguity",
        3
      ],
      [
        "seller_trust_gap",
        2
      ]
    ]
  },
  "material_misdescription": {
    "n": 10,
    "top_arbitration_mode": [
      [
        "automated_escalated_to_human",
        6
      ],
      [
        "human_arbiter",
        2
      ]
    ],
    "top_friction": [
      [
        "evidence_ambiguity",
        10
      ],
      [
        "bond_penalty_above_auto_cap",
        6
      ],
      [
        "refund_above_auto_cap",
        6
      ],
      [
        "human_arbiter_selected_prelock",
        4
      ]
    ]
  },
  "minor_condition_delta": {
    "n": 16,
    "top_arbitration_mode": [
      [
        "human_arbiter_agent_assisted",
        9
      ],
      [
        "human_arbiter",
        5
      ]
    ],
    "top_friction": [
      [
        "human_arbiter_selected_prelock",
        15
      ],
      [
        "seller_trust_gap",
        6
      ]
    ]
  },
  "porch_theft": {
    "n": 5,
    "top_arbitration_mode": [
      [
        "human_arbiter_agent_assisted",
        5
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
    "n": 6,
    "top_arbitration_mode": [
      [
        "human_arbiter_agent_assisted",
        3
      ],
      [
        "human_arbiter",
        1
      ]
    ],
    "top_friction": [
      [
        "human_arbiter_selected_prelock",
        5
      ],
      [
        "seller_trust_gap",
        1
      ]
    ]
  },
  "seller_nonship": {
    "n": 6,
    "top_arbitration_mode": [
      [
        "human_arbiter",
        3
      ],
      [
        "human_arbiter_agent_assisted",
        3
      ]
    ],
    "top_friction": [
      [
        "human_arbiter_selected_prelock",
        6
      ],
      [
        "seller_trust_gap",
        3
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
    "n": 5,
    "top_arbitration_mode": [
      [
        "human_arbiter",
        3
      ],
      [
        "automated_escalated_to_human",
        1
      ]
    ],
    "top_friction": [
      [
        "authenticity_or_identity_risk",
        5
      ],
      [
        "evidence_ambiguity",
        5
      ],
      [
        "human_arbiter_selected_prelock",
        4
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
  "mean_buyer_attention_minutes": 5.2,
  "mean_packet_count": 5.63,
  "mean_seller_attention_minutes": 9.57,
  "p90_buyer_attention_minutes": 10,
  "p90_seller_attention_minutes": 14
}

## Interesting Trade Transcripts

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

### SIM-0063 insured_lost

- Card: Vending Series Mewtwo
- Value: `$35` (low)
- Seller trust: `known`
- Route: `insured_ship`
- Selected arbiter: `did:market:arbiter:auto-low-tcg-1`
- Arbitration mode: `automated_escalated_to_human`
- Friction: `evidence_ambiguity`
- Human questions: `ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0063: insured_lost on a $35 low trade. Selected automated arbiter did:market:arbiter:auto-low-tcg-1. Path: friction_threshold_crossed. Friction: evidence_ambiguity.

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

### SIM-0141 wrong_card

- Card: Sabrina's Gengar
- Value: `$2532` (grail)
- Seller trust: `known`
- Route: `insured_ship`
- Selected arbiter: `did:market:arbiter:high-end-panel-1`
- Arbitration mode: `human_arbiter`
- Friction: `authenticity_or_identity_risk, evidence_ambiguity, human_arbiter_selected_prelock`
- Human questions: `approve_severe_remedy_or_escalation, ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0141: wrong_card on a $2532 grail trade. Selected human arbiter did:market:arbiter:high-end-panel-1. Path: human_ruling. Friction: authenticity_or_identity_risk, evidence_ambiguity, human_arbiter_selected_prelock.

### SIM-0220 wrong_card

- Card: Corocoro Mew
- Value: `$2320` (grail)
- Seller trust: `known`
- Route: `international_ship`
- Selected arbiter: `did:market:arbiter:high-end-panel-1`
- Arbitration mode: `human_arbiter`
- Friction: `authenticity_or_identity_risk, evidence_ambiguity, human_arbiter_selected_prelock`
- Human questions: `approve_severe_remedy_or_escalation, ask_human_or_human_arbiter_to_review_evidence`
- Narrative: SIM-0220: wrong_card on a $2320 grail trade. Selected human arbiter did:market:arbiter:high-end-panel-1. Path: human_ruling. Friction: authenticity_or_identity_risk, evidence_ambiguity, human_arbiter_selected_prelock.

### SIM-0111 seller_nonship

- Card: Neo Umbreon holo
- Value: `$2313` (grail)
- Seller trust: `unknown`
- Route: `international_ship`
- Selected arbiter: `did:market:arbiter:high-end-panel-1`
- Arbitration mode: `human_arbiter`
- Friction: `human_arbiter_selected_prelock, seller_trust_gap`
- Human questions: `approve_severe_remedy_or_escalation`
- Narrative: SIM-0111: seller_nonship on a $2313 grail trade. Selected human arbiter did:market:arbiter:high-end-panel-1. Path: human_ruling. Friction: human_arbiter_selected_prelock, seller_trust_gap.

## Artifacts

- `summary.json`: aggregate metrics.
- `trades.jsonl`: one packet-shaped simulation record per trade.
- `scenario_summary.csv`: outcome and arbitration mode summary.
