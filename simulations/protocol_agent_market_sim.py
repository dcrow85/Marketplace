#!/usr/bin/env python3
"""Agentic marketplace simulation for the Marketplace protocol.

This runs above the local EVM harness. It does not send 250 on-chain
transactions; it simulates buyer, seller, arbiter, and automated-arbiter policy
decisions, then writes packet-shaped records and a readable report.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import statistics
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"

CARDS = [
    "Japanese Neo Discovery Espeon holo",
    "Japanese Neo Revelation Houndoom holo",
    "Japanese Fossil Dragonite holo",
    "Vending Series Mewtwo",
    "Masaki Gengar",
    "Corocoro Mew",
    "Japanese Base Gyarados holo",
    "Neo Umbreon holo",
    "Carddass prism oddball",
    "Sabrina's Gengar",
    "CD Promo Venusaur",
    "Vending Gastly",
]

VALUE_BANDS = {
    "low": (20, 100),
    "mid": (100, 350),
    "high": (350, 1200),
    "grail": (1200, 5000),
}

VALUE_WEIGHTS = {
    "low": 0.37,
    "mid": 0.34,
    "high": 0.21,
    "grail": 0.08,
}

SELLER_TRUST_WEIGHTS = {
    "trusted": 0.35,
    "known": 0.28,
    "unknown": 0.23,
    "new": 0.14,
}

DISTANCE_WEIGHTS = {
    "same_city": 0.12,
    "same_region": 0.18,
    "domestic": 0.58,
    "international": 0.12,
}

FORCED_OUTCOMES = [
    "minor_condition_delta",
    "material_misdescription",
    "wrong_card",
    "seller_nonship",
    "insured_lost",
    "underinsured_lost",
    "uninsured_lost",
    "local_handoff_dispute",
    "porch_theft",
    "authenticity_flag",
]


@dataclass(frozen=True)
class ArbiterProfile:
    arbiter_id: str
    mode: str
    scopes: tuple[str, ...]
    max_value: int
    fee: int
    sla_hours: int
    evidence_floor: tuple[str, ...]
    auto_refund_bps_max: int = 0
    auto_bond_penalty_bps_max: int = 0
    delegation_max_value: int = 0


ARBITERS = [
    ArbiterProfile(
        arbiter_id="did:market:arbiter:auto-low-tcg-1",
        mode="automated",
        scopes=("raw_tcg_condition", "route_failure", "non_shipment"),
        max_value=100,
        fee=2,
        sla_hours=1,
        evidence_floor=("locked_inventory_packet", "received_item_photos", "route_event_packet"),
        auto_refund_bps_max=2500,
        auto_bond_penalty_bps_max=2500,
    ),
    ArbiterProfile(
        arbiter_id="did:market:arbiter:raw-condition-1",
        mode="human_agent_assisted",
        scopes=("raw_tcg_condition", "wrong_item"),
        max_value=900,
        fee=35,
        sla_hours=48,
        evidence_floor=("front_back_scan", "received_item_photos", "condition_notes"),
        delegation_max_value=100,
    ),
    ArbiterProfile(
        arbiter_id="did:market:arbiter:route-claims-1",
        mode="human_agent_assisted",
        scopes=("route_failure", "non_shipment", "local_handoff"),
        max_value=1500,
        fee=30,
        sla_hours=36,
        evidence_floor=("route_packet", "tracking_or_handoff", "insurance_or_gap_owner"),
        delegation_max_value=150,
    ),
    ArbiterProfile(
        arbiter_id="did:market:arbiter:high-end-panel-1",
        mode="human",
        scopes=("raw_tcg_condition", "authenticity", "wrong_item", "route_failure"),
        max_value=7000,
        fee=125,
        sla_hours=72,
        evidence_floor=("verifier_note", "high_res_scans", "route_packet", "received_item_photos"),
    ),
    ArbiterProfile(
        arbiter_id="did:market:arbiter:foundation-backstop",
        mode="human_agent_assisted",
        scopes=("raw_tcg_condition", "authenticity", "wrong_item", "route_failure", "non_shipment", "local_handoff"),
        max_value=10000,
        fee=65,
        sla_hours=96,
        evidence_floor=("case_packet", "signed_terms", "available_evidence"),
        delegation_max_value=75,
    ),
]


@dataclass
class TradeContext:
    trade_id: str
    card: str
    value: int
    value_band: str
    condition_claim: str
    condition_sensitivity: float
    seller_trust: str
    distance: str
    route: str
    insured: bool
    insurance_amount: int
    evidence_tier: str
    seller_bond_bps: int
    buyer_risk_tolerance: float
    buyer_attention_budget: str
    seller_attention_budget: str
    automation_allowed: bool
    forced_outcome: str | None = None


@dataclass
class AgentPlan:
    buyer_intent_hash: str
    seller_offer_hash: str
    escrow_terms_hash: str
    selected_arbiter: str
    backup_arbiters: list[str]
    automated_policy_hash: str | None
    friction_policy_hash: str
    human_gates_before_lock: list[str]
    evidence_required: list[str]
    expected_buyer_attention_minutes: int
    expected_seller_attention_minutes: int


@dataclass
class Resolution:
    outcome: str
    path: str
    arbitration_mode: str
    friction_triggers: list[str]
    human_questions: list[str]
    escrow_action: str
    remedy: dict[str, Any]
    packets: list[dict[str, str]]
    final_state: str
    violations: list[str]
    narrative: str


def weighted_choice(rng: random.Random, weights: dict[str, float]) -> str:
    total = sum(weights.values())
    mark = rng.random() * total
    acc = 0.0
    for key, weight in weights.items():
        acc += weight
        if acc >= mark:
            return key
    return next(reversed(weights))


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def canonical_hash(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


def packet(schema: str, payload: dict[str, Any]) -> dict[str, str]:
    body = {"schema": schema, **payload}
    return {
        "schema": schema,
        "hash": canonical_hash(body),
        "summary": payload.get("summary", schema),
    }


def value_for_band(band: str, rng: random.Random) -> int:
    low, high = VALUE_BANDS[band]
    if band == "grail":
        return int(round(rng.triangular(low, high, 1800)))
    if band == "high":
        return int(round(rng.triangular(low, high, 520)))
    return int(round(rng.uniform(low, high)))


def evidence_tier(value: int, seller_trust: str, condition_sensitivity: float) -> str:
    if value <= 75 and seller_trust in {"trusted", "known"} and condition_sensitivity < 0.55:
        return "light"
    if value <= 250 and seller_trust != "new" and condition_sensitivity < 0.72:
        return "standard"
    if value <= 750 and seller_trust in {"trusted", "known", "unknown"}:
        return "strong"
    return "verifier_grade"


def route_for(
    value: int,
    distance: str,
    seller_trust: str,
    buyer_risk_tolerance: float,
    rng: random.Random,
) -> tuple[str, bool, int]:
    if distance in {"same_city", "same_region"} and rng.random() < 0.23:
        return ("local_meetup" if distance == "same_city" else "show_pickup", False, 0)
    if distance == "international":
        return ("international_ship", True, value)
    if value < 75 and seller_trust in {"trusted", "known"} and buyer_risk_tolerance > 0.78:
        return ("uninsured_ship", False, 0)
    insurance_cap = rng.choice([100, 250, 500, 1000, 5000])
    if value > insurance_cap and value >= 500 and rng.random() < 0.35:
        return ("underinsured_ship", True, insurance_cap)
    return ("insured_ship", True, value)


def generate_trade(index: int, rng: random.Random, forced_outcome: str | None = None) -> TradeContext:
    band = weighted_choice(rng, VALUE_WEIGHTS)
    if forced_outcome:
        band = rng.choice(["low", "mid", "high", "grail"])
    value = value_for_band(band, rng)

    seller_weights = dict(SELLER_TRUST_WEIGHTS)
    if band in {"high", "grail"}:
        seller_weights.update({"trusted": 0.30, "known": 0.27, "unknown": 0.25, "new": 0.18})
    if forced_outcome in {"seller_nonship", "material_misdescription", "wrong_card"}:
        seller_weights.update({"trusted": 0.12, "known": 0.21, "unknown": 0.37, "new": 0.30})
    seller_trust = weighted_choice(rng, seller_weights)

    condition_claim = rng.choices(["MP", "LP", "LP+", "NM-", "NM"], weights=[7, 21, 32, 27, 13], k=1)[0]
    condition_sensitivity = clamp(
        0.24
        + (0.22 if condition_claim in {"NM-", "NM"} else 0.0)
        + (0.18 if band in {"high", "grail"} else 0.0)
        + rng.uniform(-0.08, 0.12),
        0,
        1,
    )
    buyer_risk_tolerance = round(rng.betavariate(2.1, 2.5), 3)
    distance = weighted_choice(rng, DISTANCE_WEIGHTS)
    route, insured, insurance_amount = route_for(value, distance, seller_trust, buyer_risk_tolerance, rng)
    tier = evidence_tier(value, seller_trust, condition_sensitivity)
    seller_bond_bps = 0
    if seller_trust == "new" and value >= 75:
        seller_bond_bps = 2500
    elif seller_trust == "unknown" and value >= 150:
        seller_bond_bps = 1500
    elif band == "grail":
        seller_bond_bps = 1000

    buyer_attention_budget = rng.choices(["low", "medium", "high"], weights=[0.48, 0.37, 0.15], k=1)[0]
    seller_attention_budget = rng.choices(["low", "medium", "high"], weights=[0.52, 0.34, 0.14], k=1)[0]
    automation_allowed = value <= (100 if buyer_risk_tolerance >= 0.35 else 75)

    if forced_outcome == "uninsured_lost":
        band = "low"
        value = int(round(rng.uniform(25, 85)))
        seller_trust = rng.choice(["trusted", "known"])
        route, insured, insurance_amount = ("uninsured_ship", False, 0)
        automation_allowed = True
    elif forced_outcome == "minor_condition_delta":
        band = "low"
        value = int(round(rng.uniform(35, 95)))
        seller_trust = rng.choice(["trusted", "known"])
        condition_sensitivity = min(condition_sensitivity, 0.45)
        automation_allowed = True
    elif forced_outcome == "route_delay":
        band = "low"
        value = int(round(rng.uniform(25, 95)))
        seller_trust = rng.choice(["trusted", "known"])
        route, insured, insurance_amount = ("insured_ship", True, value)
        automation_allowed = True
    elif forced_outcome == "insured_lost":
        band = "low"
        value = int(round(rng.uniform(80, 100)))
        seller_trust = rng.choice(["trusted", "known"])
        route, insured, insurance_amount = ("insured_ship", True, value)
        automation_allowed = True
    elif forced_outcome == "underinsured_lost":
        band = rng.choice(["high", "grail"])
        value = int(round(rng.uniform(650, 1800)))
        route, insured, insurance_amount = ("underinsured_ship", True, rng.choice([100, 250, 500]))
        automation_allowed = False
    elif forced_outcome == "local_handoff_dispute":
        distance = rng.choice(["same_city", "same_region"])
        route, insured, insurance_amount = ("local_meetup", False, 0)
    elif forced_outcome == "authenticity_flag":
        band = rng.choice(["high", "grail"])
        value = max(value, 550)
        tier = "verifier_grade"
        automation_allowed = False

    return TradeContext(
        trade_id=f"SIM-{index:04d}",
        card=rng.choice(CARDS),
        value=value,
        value_band=band,
        condition_claim=condition_claim,
        condition_sensitivity=round(condition_sensitivity, 3),
        seller_trust=seller_trust,
        distance=distance,
        route=route,
        insured=insured,
        insurance_amount=min(insurance_amount, value) if insured else 0,
        evidence_tier=tier,
        seller_bond_bps=seller_bond_bps,
        buyer_risk_tolerance=buyer_risk_tolerance,
        buyer_attention_budget=buyer_attention_budget,
        seller_attention_budget=seller_attention_budget,
        automation_allowed=automation_allowed,
        forced_outcome=forced_outcome,
    )


def scope_for_outcome(outcome: str) -> str:
    if outcome in {"minor_condition_delta", "material_misdescription"}:
        return "raw_tcg_condition"
    if outcome in {"wrong_card"}:
        return "wrong_item"
    if outcome in {"authenticity_flag"}:
        return "authenticity"
    if outcome in {"seller_nonship"}:
        return "non_shipment"
    if outcome in {"local_handoff_dispute"}:
        return "local_handoff"
    return "route_failure"


def arbiter_for_trade(trade: TradeContext) -> tuple[ArbiterProfile, list[ArbiterProfile], str | None]:
    likely_scopes = ["raw_tcg_condition", "route_failure", "non_shipment"]
    if trade.value_band in {"high", "grail"} or trade.evidence_tier == "verifier_grade":
        likely_scopes.append("authenticity")

    auto = ARBITERS[0]
    backups = [a for a in ARBITERS[1:] if any(scope in a.scopes for scope in likely_scopes)]
    selected: ArbiterProfile
    automated_policy_hash: str | None = None

    if trade.automation_allowed and trade.value <= auto.max_value and trade.seller_trust != "new":
        selected = auto
        automated_policy_hash = canonical_hash(
            {
                "schema": "marketplace.automated_arbiter_policy.v0.2",
                "trade_id": trade.trade_id,
                "engine_id": auto.arbiter_id,
                "max_trade_value": auto.max_value,
                "allowed_remedies": {
                    "buyer_refund_bps_max": auto.auto_refund_bps_max,
                    "seller_bond_penalty_bps_max": auto.auto_bond_penalty_bps_max,
                },
            }
        )
    elif trade.value_band == "grail" or trade.evidence_tier == "verifier_grade":
        selected = ARBITERS[3]
    elif trade.route in {"underinsured_ship", "uninsured_ship", "local_meetup", "show_pickup"}:
        selected = ARBITERS[2]
    else:
        selected = ARBITERS[1]

    if selected not in backups:
        backups.insert(0, selected)
    fallback = ARBITERS[4]
    if fallback not in backups:
        backups.append(fallback)
    backups = [a for a in backups if a.arbiter_id != selected.arbiter_id][:3]
    return selected, backups, automated_policy_hash


def evidence_required_for(trade: TradeContext) -> list[str]:
    items = ["locked_inventory_packet", "escrow_terms", "route_packet"]
    if trade.evidence_tier in {"light", "standard", "strong", "verifier_grade"}:
        items.extend(["front_photo", "back_photo"])
    if trade.evidence_tier in {"standard", "strong", "verifier_grade"}:
        items.extend(["flaw_callouts", "received_item_photos"])
    if trade.evidence_tier in {"strong", "verifier_grade"}:
        items.extend(["corner_closeups", "holo_angle_closeups"])
    if trade.evidence_tier == "verifier_grade":
        items.extend(["verifier_note", "high_res_scans"])
    if trade.route in {"insured_ship", "underinsured_ship", "international_ship"}:
        items.extend(["tracking_history", "carrier_acceptance", "insurance_or_gap_owner"])
    if trade.route in {"local_meetup", "show_pickup"}:
        items.extend(["handoff_memo", "buyer_confirmation"])
    return sorted(set(items))


def make_plan(trade: TradeContext) -> AgentPlan:
    selected, backups, automated_policy_hash = arbiter_for_trade(trade)
    human_gates: list[str] = []
    if trade.value >= 350:
        human_gates.append("high_value")
    if trade.seller_trust in {"new", "unknown"} and trade.value >= 100:
        human_gates.append("trust_gap")
    if trade.route == "underinsured_ship":
        human_gates.append("underinsurance_gap")
    if trade.route in {"local_meetup", "show_pickup"}:
        human_gates.append("in_person_route")
    if trade.evidence_tier == "verifier_grade":
        human_gates.append("verifier_grade_evidence")

    evidence_required = evidence_required_for(trade)
    buyer_attention = 1 + len(human_gates) * 3 + (2 if selected.mode != "automated" else 0)
    seller_attention = 2 + max(0, len(evidence_required) - 4) + (4 if trade.seller_bond_bps else 0)
    if trade.seller_attention_budget == "low":
        seller_attention = max(1, int(round(seller_attention * 0.82)))
    if trade.buyer_attention_budget == "low":
        buyer_attention = max(1, int(round(buyer_attention * 0.80)))

    intent = packet(
        "marketplace.intent.v0.2",
        {
            "trade_id": trade.trade_id,
            "card": trade.card,
            "value": trade.value,
            "automation_allowed": trade.automation_allowed,
            "summary": "buyer intent",
        },
    )
    offer = packet(
        "marketplace.seller_offer.v0.2",
        {
            "trade_id": trade.trade_id,
            "seller_trust": trade.seller_trust,
            "route": trade.route,
            "seller_bond_bps": trade.seller_bond_bps,
            "summary": "seller offer",
        },
    )
    terms = packet(
        "marketplace.escrow_terms.v0.2",
        {
            "trade_id": trade.trade_id,
            "selected_arbiter": selected.arbiter_id,
            "backups": [a.arbiter_id for a in backups],
            "automated_policy_hash": automated_policy_hash,
            "summary": "escrow terms",
        },
    )
    friction_policy = canonical_hash(
        {
            "schema": "marketplace.friction_threshold_policy.v0.2",
            "trade_id": trade.trade_id,
            "money_at_risk": min(100, trade.value),
            "remedy_bps_max": 2500,
            "ambiguity": "low",
            "default_action": "escalate",
        }
    )

    return AgentPlan(
        buyer_intent_hash=intent["hash"],
        seller_offer_hash=offer["hash"],
        escrow_terms_hash=terms["hash"],
        selected_arbiter=selected.arbiter_id,
        backup_arbiters=[a.arbiter_id for a in backups],
        automated_policy_hash=automated_policy_hash,
        friction_policy_hash=friction_policy,
        human_gates_before_lock=sorted(set(human_gates)),
        evidence_required=evidence_required,
        expected_buyer_attention_minutes=buyer_attention,
        expected_seller_attention_minutes=seller_attention,
    )


def random_outcome(trade: TradeContext, rng: random.Random) -> str:
    if trade.forced_outcome:
        return trade.forced_outcome

    weights = {
        "clean_close": 0.735,
        "route_delay": 0.055,
        "minor_condition_delta": 0.040,
        "material_misdescription": 0.028,
        "wrong_card": 0.009,
        "seller_nonship": 0.010 if trade.seller_trust != "new" else 0.032,
        "buyer_remorse": 0.025,
    }
    if trade.route in {"insured_ship", "international_ship"}:
        weights.update({"insured_lost": 0.018, "insured_damaged": 0.024, "porch_theft": 0.018})
    if trade.route == "uninsured_ship":
        weights.update({"uninsured_lost": 0.055, "porch_theft": 0.025})
    if trade.route == "underinsured_ship":
        weights.update({"underinsured_lost": 0.070})
    if trade.route in {"local_meetup", "show_pickup"}:
        weights.update({"local_handoff_dispute": 0.040})
    if trade.value_band in {"high", "grail"} and trade.condition_claim in {"NM-", "NM"}:
        weights["authenticity_flag"] = 0.012
        weights["material_misdescription"] += 0.018
    return weighted_choice(rng, weights)


def remedy_for(outcome: str, trade: TradeContext) -> dict[str, Any]:
    if outcome == "clean_close":
        return {"type": "release", "buyer_refund_bps": 0, "seller_bond_penalty_bps": 0}
    if outcome == "buyer_remorse":
        return {"type": "seller_release", "buyer_refund_bps": 0, "seller_bond_penalty_bps": 0}
    if outcome == "route_delay":
        return {"type": "hold_until_timeout", "buyer_refund_bps": 0, "seller_bond_penalty_bps": 0}
    if outcome == "minor_condition_delta":
        return {"type": "partial_refund", "buyer_refund_bps": 1200, "seller_bond_penalty_bps": 0}
    if outcome == "material_misdescription":
        return {"type": "partial_refund_plus_bond", "buyer_refund_bps": 5500, "seller_bond_penalty_bps": 4000}
    if outcome == "wrong_card":
        return {"type": "refund_or_return", "buyer_refund_bps": 10000, "seller_bond_penalty_bps": 5000}
    if outcome == "seller_nonship":
        return {"type": "refund_plus_bond", "buyer_refund_bps": 10000, "seller_bond_penalty_bps": 10000}
    if outcome in {"insured_lost", "insured_damaged"}:
        return {"type": "carrier_claim_hold", "buyer_refund_bps": 0, "seller_bond_penalty_bps": 0}
    if outcome == "uninsured_lost":
        approved_gap = trade.automation_allowed and trade.value <= 100
        return {
            "type": "route_gap_split" if approved_gap else "route_failure_review",
            "buyer_refund_bps": 0 if approved_gap else 7000,
            "seller_bond_penalty_bps": 0 if approved_gap else 3000,
        }
    if outcome == "underinsured_lost":
        return {"type": "underinsurance_gap_review", "buyer_refund_bps": 6500, "seller_bond_penalty_bps": 3500}
    if outcome == "local_handoff_dispute":
        return {"type": "handoff_review", "buyer_refund_bps": 5000, "seller_bond_penalty_bps": 0}
    if outcome == "porch_theft":
        return {"type": "delivery_risk_review", "buyer_refund_bps": 2500, "seller_bond_penalty_bps": 0}
    if outcome == "authenticity_flag":
        return {"type": "escalate_authenticity", "buyer_refund_bps": 10000, "seller_bond_penalty_bps": 10000}
    return {"type": "review", "buyer_refund_bps": 0, "seller_bond_penalty_bps": 0}


def ambiguity_score(outcome: str, trade: TradeContext) -> float:
    base = {
        "minor_condition_delta": 0.20,
        "material_misdescription": 0.52,
        "wrong_card": 0.38,
        "seller_nonship": 0.18,
        "insured_lost": 0.25,
        "insured_damaged": 0.42,
        "uninsured_lost": 0.46,
        "underinsured_lost": 0.57,
        "local_handoff_dispute": 0.68,
        "porch_theft": 0.72,
        "authenticity_flag": 0.86,
        "route_delay": 0.18,
        "buyer_remorse": 0.06,
        "clean_close": 0.02,
    }.get(outcome, 0.35)
    if trade.evidence_tier == "light" and outcome not in {"clean_close", "buyer_remorse"}:
        base += 0.12
    if trade.seller_trust in {"new", "unknown"}:
        base += 0.08
    return round(clamp(base, 0, 1), 3)


def resolve_trade(trade: TradeContext, plan: AgentPlan, rng: random.Random) -> Resolution:
    outcome = random_outcome(trade, rng)
    selected = next(a for a in ARBITERS if a.arbiter_id == plan.selected_arbiter)
    remedy = remedy_for(outcome, trade)
    ambiguity = ambiguity_score(outcome, trade)
    friction: list[str] = []
    human_questions: list[str] = []

    if outcome in {"clean_close", "buyer_remorse"}:
        packets = [
            packet("marketplace.intent.v0.2", {"trade_id": trade.trade_id, "summary": "buyer intent"}),
            packet("marketplace.seller_offer.v0.2", {"trade_id": trade.trade_id, "summary": "seller offer"}),
            packet("marketplace.arbiter_candidate_set.v0.2", {"trade_id": trade.trade_id, "summary": "arbiter candidates"}),
            packet("marketplace.evidence_packet.v0.2", {"trade_id": trade.trade_id, "summary": "evidence packet"}),
            packet("marketplace.trade_receipt.v0.2", {"trade_id": trade.trade_id, "summary": "final receipt"}),
        ]
        return Resolution(
            outcome=outcome,
            path="clean_receipt" if outcome == "clean_close" else "buyer_remorse_release",
            arbitration_mode="none",
            friction_triggers=[],
            human_questions=[],
            escrow_action="release_to_seller",
            remedy=remedy,
            packets=packets,
            final_state="Settled",
            violations=[],
            narrative=f"{trade.trade_id}: {outcome}; buyer agent closes with final receipt.",
        )

    scope = scope_for_outcome(outcome)
    if selected.mode == "automated":
        if trade.value > selected.max_value:
            friction.append("money_at_risk_above_auto_cap")
        if scope not in selected.scopes:
            friction.append("case_scope_outside_automation")
        if remedy["buyer_refund_bps"] > selected.auto_refund_bps_max:
            friction.append("refund_above_auto_cap")
        if remedy["seller_bond_penalty_bps"] > selected.auto_bond_penalty_bps_max:
            friction.append("bond_penalty_above_auto_cap")
    else:
        friction.append("human_arbiter_selected_prelock")

    if ambiguity > 0.35:
        friction.append("evidence_ambiguity")
    if outcome in {"authenticity_flag", "wrong_card"}:
        friction.append("authenticity_or_identity_risk")
    if trade.seller_trust in {"new", "unknown"} and trade.value >= 100:
        friction.append("seller_trust_gap")
    if trade.route in {"underinsured_ship", "uninsured_ship"} and outcome in {"underinsured_lost", "uninsured_lost"}:
        friction.append("route_gap_owner_review")
    if outcome == "porch_theft":
        friction.append("delivery_risk_ambiguous")
    if outcome == "local_handoff_dispute":
        friction.append("in_person_handoff_ambiguity")

    friction = sorted(set(friction))
    if "evidence_ambiguity" in friction or "authenticity_or_identity_risk" in friction:
        human_questions.append("ask_human_or_human_arbiter_to_review_evidence")
    if "route_gap_owner_review" in friction:
        human_questions.append("confirm_who_accepted_route_value_gap")
    if remedy["buyer_refund_bps"] >= 5000:
        human_questions.append("approve_severe_remedy_or_escalation")
    human_questions = sorted(set(human_questions))

    if selected.mode == "automated" and not friction:
        arbitration_mode = "automated"
        path = "automated_ruling"
        escrow_action = "execute_automated_remedy"
    elif selected.mode == "automated":
        arbitration_mode = "automated_escalated_to_human"
        path = "friction_threshold_crossed"
        escrow_action = "hold_for_human_arbiter"
    elif selected.mode == "human_agent_assisted" and trade.value <= selected.delegation_max_value and ambiguity <= 0.35:
        arbitration_mode = "arbiter_agent_delegated"
        path = "delegated_ruling"
        escrow_action = "execute_delegated_remedy"
    elif selected.mode == "human_agent_assisted":
        arbitration_mode = "human_arbiter_agent_assisted"
        path = "human_ruling_with_agent_packet"
        escrow_action = "hold_for_arbiter_ruling"
    else:
        arbitration_mode = "human_arbiter"
        path = "human_ruling"
        escrow_action = "hold_for_arbiter_ruling"

    packets = [
        packet("marketplace.intent.v0.2", {"trade_id": trade.trade_id, "summary": "buyer intent"}),
        packet("marketplace.seller_offer.v0.2", {"trade_id": trade.trade_id, "summary": "seller offer"}),
        packet("marketplace.arbiter_candidate_set.v0.2", {"trade_id": trade.trade_id, "summary": "arbiter candidates"}),
        packet("marketplace.evidence_packet.v0.2", {"trade_id": trade.trade_id, "summary": "evidence packet"}),
        packet("marketplace.dispute_case.v0.2", {"trade_id": trade.trade_id, "summary": outcome}),
        packet(
            "marketplace.arbiter_ruling.v0.2",
            {
                "trade_id": trade.trade_id,
                "arbiter": selected.arbiter_id,
                "arbitration_mode": arbitration_mode,
                "summary": "ruling packet",
            },
        ),
        packet("marketplace.trade_receipt.v0.2", {"trade_id": trade.trade_id, "summary": "settlement receipt"}),
    ]
    if selected.mode == "automated":
        packets.append(
            packet(
                "marketplace.friction_threshold_policy.v0.2",
                {"trade_id": trade.trade_id, "summary": "friction policy"},
            )
        )

    violations: list[str] = []
    if arbitration_mode == "automated" and friction:
        violations.append("automated_ruling_despite_friction")
    if arbitration_mode == "automated" and trade.value > selected.max_value:
        violations.append("automated_ruling_over_value_cap")
    if arbitration_mode == "automated" and remedy["buyer_refund_bps"] > selected.auto_refund_bps_max:
        violations.append("automated_refund_over_cap")
    if not plan.selected_arbiter:
        violations.append("missing_selected_arbiter")
    if outcome not in {"clean_close", "buyer_remorse"} and not any(p["schema"] == "marketplace.dispute_case.v0.2" for p in packets):
        violations.append("claim_without_dispute_packet")

    narrative = (
        f"{trade.trade_id}: {outcome} on a ${trade.value} {trade.value_band} trade. "
        f"Selected {selected.mode} arbiter {selected.arbiter_id}. "
        f"Path: {path}. Friction: {', '.join(friction) if friction else 'none'}."
    )

    return Resolution(
        outcome=outcome,
        path=path,
        arbitration_mode=arbitration_mode,
        friction_triggers=friction,
        human_questions=human_questions,
        escrow_action=escrow_action,
        remedy=remedy,
        packets=packets,
        final_state="Settled",
        violations=violations,
        narrative=narrative,
    )


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, int(round((len(ordered) - 1) * p)))
    return ordered[index]


def summarize(records: list[dict[str, Any]]) -> dict[str, Any]:
    n = len(records)
    outcomes = Counter(r["resolution"]["outcome"] for r in records)
    value_bands = Counter(r["trade"]["value_band"] for r in records)
    routes = Counter(r["trade"]["route"] for r in records)
    sellers = Counter(r["trade"]["seller_trust"] for r in records)
    arbitration_modes = Counter(r["resolution"]["arbitration_mode"] for r in records)
    paths = Counter(r["resolution"]["path"] for r in records)
    arbiters = Counter(r["plan"]["selected_arbiter"] for r in records)
    friction = Counter(trigger for r in records for trigger in r["resolution"]["friction_triggers"])
    human_questions = Counter(question for r in records for question in r["resolution"]["human_questions"])
    violations = Counter(v for r in records for v in r["resolution"]["violations"])
    claims = [r for r in records if r["resolution"]["outcome"] not in {"clean_close", "buyer_remorse"}]
    auto_selected = [r for r in records if r["plan"]["automated_policy_hash"]]
    auto_rulings = [r for r in records if r["resolution"]["arbitration_mode"] == "automated"]
    escalated = [r for r in records if r["resolution"]["arbitration_mode"] == "automated_escalated_to_human"]
    clean = [r for r in records if r["resolution"]["outcome"] == "clean_close"]
    buyer_attention = [r["plan"]["expected_buyer_attention_minutes"] for r in records]
    seller_attention = [r["plan"]["expected_seller_attention_minutes"] for r in records]
    packet_counts = [len(r["resolution"]["packets"]) for r in records]

    by_band: dict[str, dict[str, Any]] = {}
    for band in sorted(value_bands):
        rows = [r for r in records if r["trade"]["value_band"] == band]
        by_band[band] = {
            "n": len(rows),
            "clean_close_rate": round(sum(r["resolution"]["outcome"] == "clean_close" for r in rows) / max(1, len(rows)), 3),
            "automated_ruling_rate": round(sum(r["resolution"]["arbitration_mode"] == "automated" for r in rows) / max(1, len(rows)), 3),
            "friction_escalation_rate": round(sum(bool(r["resolution"]["friction_triggers"]) for r in rows) / max(1, len(rows)), 3),
            "mean_value": round(statistics.mean(r["trade"]["value"] for r in rows), 2),
        }

    by_outcome: dict[str, dict[str, Any]] = {}
    for outcome in sorted(outcomes):
        rows = [r for r in records if r["resolution"]["outcome"] == outcome]
        by_outcome[outcome] = {
            "n": len(rows),
            "top_arbitration_mode": arbitration_modes_for(rows).most_common(2),
            "top_friction": Counter(t for r in rows for t in r["resolution"]["friction_triggers"]).most_common(4),
        }

    return {
        "n": n,
        "outcomes": dict(outcomes),
        "value_bands": dict(value_bands),
        "routes": dict(routes),
        "seller_trust": dict(sellers),
        "arbitration_modes": dict(arbitration_modes),
        "resolution_paths": dict(paths),
        "selected_arbiters": dict(arbiters),
        "friction_triggers": dict(friction),
        "human_questions": dict(human_questions),
        "violations": dict(violations),
        "claim_rate": round(len(claims) / max(1, n), 4),
        "clean_close_rate": round(len(clean) / max(1, n), 4),
        "automated_policy_selection_rate": round(len(auto_selected) / max(1, n), 4),
        "automated_ruling_rate": round(len(auto_rulings) / max(1, n), 4),
        "automation_escalation_rate": round(len(escalated) / max(1, len(auto_selected)), 4),
        "friction_trigger_rate": round(sum(bool(r["resolution"]["friction_triggers"]) for r in records) / max(1, n), 4),
        "mean_buyer_attention_minutes": round(statistics.mean(buyer_attention), 2),
        "p90_buyer_attention_minutes": percentile(buyer_attention, 0.9),
        "mean_seller_attention_minutes": round(statistics.mean(seller_attention), 2),
        "p90_seller_attention_minutes": percentile(seller_attention, 0.9),
        "mean_packet_count": round(statistics.mean(packet_counts), 2),
        "by_value_band": by_band,
        "by_outcome": by_outcome,
    }


def arbitration_modes_for(rows: list[dict[str, Any]]) -> Counter[str]:
    return Counter(r["resolution"]["arbitration_mode"] for r in rows)


def diagnose(summary: dict[str, Any]) -> list[str]:
    notes: list[str] = []
    if not summary["violations"]:
        notes.append("No simulation invariants broke: automation did not rule past signed friction thresholds.")
    else:
        notes.append(f"Invariant violations need inspection: {summary['violations']}.")
    notes.append(
        f"Automated policies were selected for {summary['automated_policy_selection_rate']:.1%} of trades and produced direct automated rulings in {summary['automated_ruling_rate']:.1%}."
    )
    if summary["automation_escalation_rate"] > 0:
        notes.append(
            f"{summary['automation_escalation_rate']:.1%} of automated-policy trades crossed friction and escalated instead of pretending to be simple."
        )
    notes.append(
        f"Human or arbiter-agent paths handled the rest, with a mean buyer attention estimate of {summary['mean_buyer_attention_minutes']} minutes."
    )
    top_friction = Counter(summary["friction_triggers"]).most_common(3)
    if top_friction:
        notes.append(
            "Top friction sources were "
            + ", ".join(f"{name} ({count})" for name, count in top_friction)
            + "."
        )
    if summary["by_value_band"].get("low", {}).get("automated_ruling_rate", 0) > 0:
        notes.append("Low-value trades are where automated arbitration actually pays for itself.")
    return notes


def write_report(outdir: Path, summary: dict[str, Any], records: list[dict[str, Any]], args: argparse.Namespace) -> None:
    interesting = sorted(
        records,
        key=lambda r: (
            0 if r["resolution"]["violations"] else 1,
            0 if r["resolution"]["friction_triggers"] else 1,
            0 if r["resolution"]["arbitration_mode"] in {"automated", "automated_escalated_to_human"} else 1,
            -r["trade"]["value"],
        ),
    )[: args.samples]
    lines = [
        "# Marketplace Agentic E2E Simulation",
        "",
        f"Run: `{summary['run']['run_id']}`",
        f"Seed: `{args.seed}`",
        f"Trades: `{summary['n']}`",
        "",
        "## Diagnosis",
        "",
        *[f"- {note}" for note in summary["diagnosis"]],
        "",
        "## Topline",
        "",
        json.dumps(
            {
                "clean_close_rate": summary["clean_close_rate"],
                "claim_rate": summary["claim_rate"],
                "automated_policy_selection_rate": summary["automated_policy_selection_rate"],
                "automated_ruling_rate": summary["automated_ruling_rate"],
                "automation_escalation_rate": summary["automation_escalation_rate"],
                "friction_trigger_rate": summary["friction_trigger_rate"],
                "violations": summary["violations"],
            },
            indent=2,
            sort_keys=True,
        ),
        "",
        "## Arbitration Modes",
        "",
        json.dumps(summary["arbitration_modes"], indent=2, sort_keys=True),
        "",
        "## Friction Triggers",
        "",
        json.dumps(summary["friction_triggers"], indent=2, sort_keys=True),
        "",
        "## Value Bands",
        "",
        json.dumps(summary["by_value_band"], indent=2, sort_keys=True),
        "",
        "## Selected Arbiters",
        "",
        json.dumps(summary["selected_arbiters"], indent=2, sort_keys=True),
        "",
        "## Outcomes",
        "",
        json.dumps(summary["by_outcome"], indent=2, sort_keys=True),
        "",
        "## Attention and Packet Load",
        "",
        json.dumps(
            {
                "mean_buyer_attention_minutes": summary["mean_buyer_attention_minutes"],
                "p90_buyer_attention_minutes": summary["p90_buyer_attention_minutes"],
                "mean_seller_attention_minutes": summary["mean_seller_attention_minutes"],
                "p90_seller_attention_minutes": summary["p90_seller_attention_minutes"],
                "mean_packet_count": summary["mean_packet_count"],
            },
            indent=2,
            sort_keys=True,
        ),
        "",
        "## Interesting Trade Transcripts",
        "",
    ]
    for record in interesting:
        trade = record["trade"]
        plan = record["plan"]
        resolution = record["resolution"]
        lines.extend(
            [
                f"### {trade['trade_id']} {resolution['outcome']}",
                "",
                f"- Card: {trade['card']}",
                f"- Value: `${trade['value']}` ({trade['value_band']})",
                f"- Seller trust: `{trade['seller_trust']}`",
                f"- Route: `{trade['route']}`",
                f"- Selected arbiter: `{plan['selected_arbiter']}`",
                f"- Arbitration mode: `{resolution['arbitration_mode']}`",
                f"- Friction: `{', '.join(resolution['friction_triggers']) if resolution['friction_triggers'] else 'none'}`",
                f"- Human questions: `{', '.join(resolution['human_questions']) if resolution['human_questions'] else 'none'}`",
                f"- Narrative: {resolution['narrative']}",
                "",
            ]
        )
    lines.extend(
        [
            "## Artifacts",
            "",
            "- `summary.json`: aggregate metrics.",
            "- `trades.jsonl`: one packet-shaped simulation record per trade.",
            "- `scenario_summary.csv`: outcome and arbitration mode summary.",
            "",
        ]
    )
    (outdir / "REPORT.md").write_text("\n".join(lines), encoding="utf-8")


def write_csv(outdir: Path, summary: dict[str, Any]) -> None:
    with (outdir / "scenario_summary.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["outcome", "n", "top_arbitration_mode", "top_friction"],
        )
        writer.writeheader()
        for outcome, data in sorted(summary["by_outcome"].items()):
            writer.writerow(
                {
                    "outcome": outcome,
                    "n": data["n"],
                    "top_arbitration_mode": json.dumps(data["top_arbitration_mode"]),
                    "top_friction": json.dumps(data["top_friction"]),
                }
            )


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a 250-trade agentic protocol simulation.")
    parser.add_argument("--trades", type=int, default=250)
    parser.add_argument("--seed", type=int, default=20260518)
    parser.add_argument("--samples", type=int, default=18)
    parser.add_argument("--outdir", default=str(RUNS))
    args = parser.parse_args()

    rng = random.Random(args.seed)
    run_id = datetime.now(timezone.utc).strftime("agent_market_%Y%m%dT%H%M%SZ")
    outdir = Path(args.outdir) / run_id
    outdir.mkdir(parents=True, exist_ok=True)

    forced_count = min(args.trades, len(FORCED_OUTCOMES) * 3)
    forced: list[str | None] = []
    for outcome in FORCED_OUTCOMES:
        forced.extend([outcome] * 3)
    forced = forced[:forced_count]
    random_count = max(0, args.trades - len(forced))
    outcome_plan = [None] * random_count + forced
    rng.shuffle(outcome_plan)

    records: list[dict[str, Any]] = []
    for index, forced_outcome in enumerate(outcome_plan, start=1):
        trade = generate_trade(index, rng, forced_outcome)
        plan = make_plan(trade)
        resolution = resolve_trade(trade, plan, rng)
        records.append(
            {
                "trade": asdict(trade),
                "plan": asdict(plan),
                "resolution": asdict(resolution),
            }
        )

    summary = summarize(records)
    summary["run"] = {
        "run_id": run_id,
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "seed": args.seed,
        "probe": "marketplace_agentic_e2e_sim",
    }
    summary["diagnosis"] = diagnose(summary)

    (outdir / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    with (outdir / "trades.jsonl").open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, sort_keys=True) + "\n")
    write_csv(outdir, summary)
    write_report(outdir, summary, records, args)

    print(json.dumps({"run_dir": str(outdir), "summary": summary}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
