#!/usr/bin/env python3
"""
Massive protocol edge-case simulator for the Marketplace TCG protocol.

The test is intentionally synthetic. It does not try to model the Pokemon TCG
market perfectly; it tries to stress the protocol shape: costfield grid,
evidence tiers, route/location, bonded sellers, escrow closure, final receipts,
and claim/dispute packets.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import statistics
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


VALUE_MODES = {
    "casual_raw": (20, 75),
    "collector_raw": (75, 300),
    "new_seller_raw": (90, 450),
    "high_end_raw": (300, 1500),
    "extreme_proof": (1500, 6500),
}

MODE_WEIGHTS = {
    "casual_raw": 0.33,
    "collector_raw": 0.27,
    "new_seller_raw": 0.16,
    "high_end_raw": 0.16,
    "extreme_proof": 0.08,
}

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

SELLER_TRUST_WEIGHTS = {
    "trusted": 0.42,
    "known": 0.26,
    "unknown": 0.20,
    "new": 0.12,
}

DISTANCE_WEIGHTS = {
    "same_city": 0.12,
    "same_region": 0.17,
    "domestic": 0.58,
    "international": 0.13,
}

ROUTE_TYPES = [
    "local_meetup",
    "show_pickup",
    "local_shop_handoff",
    "insured_ship",
    "uninsured_ship",
    "underinsured_ship",
    "verifier_forward",
    "international_ship",
]

OUTCOMES = [
    "clean_close",
    "route_delay",
    "insured_lost",
    "insured_damaged",
    "uninsured_lost",
    "underinsured_lost",
    "local_handoff_dispute",
    "verifier_mismatch",
    "wrong_card",
    "material_misdescription",
    "seller_nonship",
    "buyer_remorse",
    "porch_theft",
]


@dataclass
class Trade:
    trade_id: str
    mode: str
    card: str
    value: int
    raw: bool
    condition_claim: str
    condition_sensitivity: float
    seller_trust: str
    seller_region: str
    buyer_region: str
    distance: str
    show_overlap: bool
    buyer_prefers_in_person: bool
    seller_can_meet: bool
    seller_can_bond: bool
    seller_can_verify: bool
    seller_insurance_cap: int
    buyer_risk_tolerance: float
    forced_outcome: str | None = None


@dataclass
class ProtocolPlan:
    evidence_tier: str
    route: str
    route_cost: int
    insurance_required: bool
    insurance_amount: int
    signature_required: bool
    bond_required: bool
    bond_amount: int
    delayed_payout: bool
    verifier_required: bool
    inspection_hours: int
    human_gates: list[str]
    buyer_approved_exceptions: list[str]
    route_promise: list[str]
    evidence_items: list[str]


@dataclass
class Resolution:
    outcome: str
    resolution_type: str
    escrow_action: str
    bond_action: str
    payout_action: str
    packet_type: str
    packet_complete: bool
    liability_owner: str
    final_receipt: bool
    reputation_events: list[str]
    notable_evidence: list[str]
    human_prompt: str
    violations: list[str]
    ambiguous_without_grid: bool


def weighted_choice(rng: random.Random, weights: dict[str, float]) -> str:
    total = sum(weights.values())
    mark = rng.random() * total
    acc = 0.0
    for key, weight in weights.items():
        acc += weight
        if acc >= mark:
            return key
    return next(reversed(weights))


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def region_for(distance: str, rng: random.Random) -> tuple[str, str]:
    regions = ["US-MI", "US-OH", "US-IL", "US-CA", "US-NY", "US-TX", "CA-ON", "JP-Tokyo", "GB-LON"]
    buyer = rng.choice(regions[:6])
    if distance == "same_city":
        seller = buyer
    elif distance == "same_region":
        seller = rng.choice([r for r in regions[:6] if r != buyer])
    elif distance == "domestic":
        seller = rng.choice(regions[:6])
    else:
        seller = rng.choice(regions[6:])
    return seller, buyer


def generate_trade(index: int, rng: random.Random, forced_outcome: str | None = None) -> Trade:
    mode = weighted_choice(rng, MODE_WEIGHTS)
    if forced_outcome:
        mode = rng.choice(list(VALUE_MODES))
    lo, hi = VALUE_MODES[mode]
    value = int(round(rng.uniform(lo, hi)))
    if mode == "extreme_proof":
        value = int(round(rng.triangular(lo, hi, 2200)))
    elif mode == "high_end_raw":
        value = int(round(rng.triangular(lo, hi, 520)))

    seller_trust_weights = dict(SELLER_TRUST_WEIGHTS)
    if mode == "new_seller_raw":
        seller_trust_weights.update({"new": 0.55, "unknown": 0.28, "known": 0.12, "trusted": 0.05})
    if mode == "extreme_proof":
        seller_trust_weights.update({"trusted": 0.30, "known": 0.25, "unknown": 0.25, "new": 0.20})
    seller_trust = weighted_choice(rng, seller_trust_weights)

    distance = weighted_choice(rng, DISTANCE_WEIGHTS)
    seller_region, buyer_region = region_for(distance, rng)
    show_overlap = distance in {"same_city", "same_region"} and rng.random() < 0.34
    buyer_prefers_in_person = (distance in {"same_city", "same_region"} or show_overlap) and rng.random() < 0.33
    seller_can_meet = distance in {"same_city", "same_region"} and rng.random() < 0.68
    seller_can_bond = seller_trust in {"new", "unknown"} or rng.random() < 0.46
    seller_can_verify = value >= 300 and rng.random() < (0.25 if seller_trust in {"trusted", "known"} else 0.52)
    seller_insurance_cap = rng.choice([100, 250, 500, 1000, 5000])
    if seller_trust in {"trusted", "known"} and value >= 300:
        seller_insurance_cap = max(seller_insurance_cap, 1000)

    condition_claim = rng.choices(
        ["MP", "LP", "LP+", "NM-", "NM"],
        weights=[0.08, 0.22, 0.31, 0.25, 0.14],
        k=1,
    )[0]
    high_claim = condition_claim in {"NM-", "NM"}
    condition_sensitivity = clamp(
        0.25
        + (0.35 if value >= 300 else 0.0)
        + (0.22 if high_claim else 0.0)
        + (0.20 if mode in {"high_end_raw", "extreme_proof"} else 0.0),
        0.0,
        1.0,
    )
    return Trade(
        trade_id=f"T{index:06d}",
        mode=mode,
        card=rng.choice(CARDS),
        value=value,
        raw=rng.random() < 0.91,
        condition_claim=condition_claim,
        condition_sensitivity=round(condition_sensitivity, 3),
        seller_trust=seller_trust,
        seller_region=seller_region,
        buyer_region=buyer_region,
        distance=distance,
        show_overlap=show_overlap,
        buyer_prefers_in_person=buyer_prefers_in_person,
        seller_can_meet=seller_can_meet,
        seller_can_bond=seller_can_bond,
        seller_can_verify=seller_can_verify,
        seller_insurance_cap=seller_insurance_cap,
        buyer_risk_tolerance=round(rng.betavariate(2.2, 2.4), 3),
        forced_outcome=forced_outcome,
    )


def evidence_tier_for(trade: Trade) -> str:
    if trade.value < 75 and trade.seller_trust in {"trusted", "known"} and trade.condition_sensitivity < 0.50:
        return "light"
    if trade.value < 300 and trade.seller_trust not in {"new"} and trade.condition_sensitivity < 0.68:
        return "standard"
    if trade.value < 700 and trade.seller_trust in {"trusted", "known"}:
        return "strong"
    if trade.value < 1500 and trade.seller_trust not in {"new"}:
        return "insurance_grade"
    return "verifier_grade"


def route_for(trade: Trade, tier: str) -> str:
    if tier == "verifier_grade" and trade.seller_can_verify:
        return "verifier_forward"
    if trade.buyer_prefers_in_person and trade.seller_can_meet:
        return "show_pickup" if trade.show_overlap else "local_meetup"
    if trade.distance == "international":
        return "international_ship"
    if trade.value < 75 and trade.buyer_risk_tolerance > 0.78 and trade.seller_trust in {"trusted", "known"}:
        return "uninsured_ship"
    if trade.value > trade.seller_insurance_cap and trade.seller_insurance_cap < trade.value:
        return "underinsured_ship"
    return "insured_ship"


def build_evidence_items(trade: Trade, plan: ProtocolPlan | None, tier: str, route: str) -> list[str]:
    items = ["inventory_claim", "agreed_value", "condition_band"]
    if tier in {"light", "standard", "strong", "insurance_grade", "verifier_grade"}:
        items.extend(["front_photo", "back_photo"])
    if tier in {"standard", "strong", "insurance_grade", "verifier_grade"}:
        items.extend(["flaw_callouts", "inspection_window"])
    if tier in {"strong", "insurance_grade", "verifier_grade"}:
        items.extend(["corner_closeups", "holo_angle_closeups", "timestamped_photos"])
    if tier in {"insurance_grade", "verifier_grade"}:
        items.extend(["packaging_attestation", "declared_value"])
    if tier == "verifier_grade":
        items.extend(["verifier_intake", "verifier_condition_attestation", "chain_of_custody"])

    if route in {"insured_ship", "underinsured_ship", "international_ship", "verifier_forward"}:
        items.extend(["label", "tracking_url", "carrier_acceptance", "tracking_history"])
    if route in {"insured_ship", "international_ship", "verifier_forward"}:
        items.extend(["insurance_receipt", "signature_confirmation_required", "packaging_attestation"])
    if route == "underinsured_ship":
        items.extend(["insurance_receipt", "underinsurance_gap_ack"])
    if route == "uninsured_ship":
        items.extend(["tracking_url", "carrier_acceptance", "uninsured_route_ack"])
    if route in {"local_meetup", "show_pickup", "local_shop_handoff"}:
        items.extend(["handoff_memo", "buyer_confirmation_required"])
    if route == "show_pickup":
        items.append("table_or_badge_note")
    if route == "local_shop_handoff":
        items.append("shop_intake_note")
    if route == "verifier_forward":
        items.extend(["seller_to_verifier_route", "verifier_to_buyer_route"])
    return sorted(set(items))


def protocol_plan(trade: Trade) -> ProtocolPlan:
    tier = evidence_tier_for(trade)
    route = route_for(trade, tier)
    insurance_required = trade.value >= 300 or route in {"insured_ship", "international_ship", "verifier_forward"}
    signature_required = trade.value >= 200 or route in {"insured_ship", "international_ship", "verifier_forward"}
    insurance_amount = 0
    buyer_approved_exceptions: list[str] = []
    human_gates: list[str] = []
    route_promise: list[str] = [route]

    if route in {"insured_ship", "international_ship", "verifier_forward"}:
        insurance_amount = trade.value
        route_promise.extend(["insured", "signature"])
    elif route == "underinsured_ship":
        insurance_amount = min(trade.seller_insurance_cap, trade.value)
        route_promise.extend(["tracked", "underinsured"])
        human_gates.append("underinsurance_gap")
        if trade.buyer_risk_tolerance > 0.72 and trade.value < 900:
            buyer_approved_exceptions.append("underinsured_route")
        else:
            human_gates.append("reject_or_reprice_underinsurance")
    elif route == "uninsured_ship":
        route_promise.extend(["tracked", "uninsured"])
        human_gates.append("uninsured_route")
        buyer_approved_exceptions.append("uninsured_route")
    elif route in {"local_meetup", "show_pickup", "local_shop_handoff"}:
        route_promise.extend(["in_person_or_local_handoff", "buyer_confirms_receipt"])
        human_gates.append("route_privacy_and_meetup_choice")

    bond_required = (
        trade.seller_trust == "new" and trade.value >= 75
    ) or (
        trade.seller_trust == "unknown" and trade.value >= 180
    ) or (
        tier == "verifier_grade" and trade.seller_trust in {"new", "unknown"}
    )
    if bond_required and not trade.seller_can_bond:
        human_gates.append("seller_cannot_bond")

    verifier_required = tier == "verifier_grade"
    if verifier_required and not trade.seller_can_verify:
        human_gates.append("verifier_unavailable")
    if trade.value >= 300:
        human_gates.append("high_value_or_raw_condition")
    if trade.condition_sensitivity >= 0.70:
        human_gates.append("condition_sensitive")

    if tier == "light":
        inspection_hours = 24
    elif tier in {"standard", "strong"}:
        inspection_hours = 48
    else:
        inspection_hours = 72

    route_cost = 0
    if route in {"insured_ship", "international_ship", "verifier_forward"}:
        route_cost = max(6, int(round(6 + 0.015 * trade.value)))
    elif route == "underinsured_ship":
        route_cost = max(5, int(round(5 + 0.008 * insurance_amount)))
    elif route == "uninsured_ship":
        route_cost = 4
    elif route in {"local_meetup", "show_pickup"}:
        route_cost = 0
    elif route == "local_shop_handoff":
        route_cost = 10

    bond_amount = 0
    if bond_required:
        bond_amount = max(25, int(round(min(0.35 * trade.value, 650))))

    evidence_items = build_evidence_items(trade, None, tier, route)
    return ProtocolPlan(
        evidence_tier=tier,
        route=route,
        route_cost=route_cost,
        insurance_required=insurance_required,
        insurance_amount=insurance_amount,
        signature_required=signature_required,
        bond_required=bond_required,
        bond_amount=bond_amount,
        delayed_payout=bond_required or trade.value >= 300,
        verifier_required=verifier_required,
        inspection_hours=inspection_hours,
        human_gates=sorted(set(human_gates)),
        buyer_approved_exceptions=sorted(set(buyer_approved_exceptions)),
        route_promise=sorted(set(route_promise)),
        evidence_items=evidence_items,
    )


def random_outcome(trade: Trade, plan: ProtocolPlan, rng: random.Random) -> str:
    if trade.forced_outcome:
        return trade.forced_outcome

    base = {
        "clean_close": 0.745,
        "route_delay": 0.055,
        "wrong_card": 0.010,
        "material_misdescription": 0.026,
        "seller_nonship": 0.008 if trade.seller_trust != "new" else 0.025,
        "buyer_remorse": 0.020,
    }
    if plan.route in {"insured_ship", "international_ship", "verifier_forward"}:
        base.update({"insured_lost": 0.020, "insured_damaged": 0.026, "porch_theft": 0.018})
    elif plan.route == "uninsured_ship":
        base.update({"uninsured_lost": 0.040, "porch_theft": 0.020})
    elif plan.route == "underinsured_ship":
        base.update({"underinsured_lost": 0.065})
    elif plan.route in {"local_meetup", "show_pickup", "local_shop_handoff"}:
        base.update({"local_handoff_dispute": 0.040, "material_misdescription": 0.034})
    if plan.route == "verifier_forward":
        base.update({"verifier_mismatch": 0.035})
    if trade.mode == "extreme_proof":
        base["clean_close"] -= 0.065
        base["material_misdescription"] += 0.025
        base["verifier_mismatch"] = base.get("verifier_mismatch", 0.0) + 0.025
    return weighted_choice(rng, base)


def has_all(items: list[str], required: list[str]) -> bool:
    item_set = set(items)
    return all(item in item_set for item in required)


def resolve_trade(trade: Trade, plan: ProtocolPlan, outcome: str) -> Resolution:
    violations: list[str] = []
    evidence = list(plan.evidence_items)
    resolution_type = "unknown"
    escrow_action = "hold"
    bond_action = "none"
    payout_action = "none"
    packet_type = "none"
    packet_complete = True
    liability_owner = "none"
    final_receipt = False
    reputation_events: list[str] = []
    notable_evidence = []
    human_prompt = "none"

    if plan.bond_required:
        bond_action = "locked"

    if outcome == "clean_close":
        resolution_type = "final_receipt"
        escrow_action = "release_after_acceptance"
        bond_action = "release_after_window" if plan.bond_required else "none"
        payout_action = "pay_seller"
        packet_type = "trade_receipt"
        final_receipt = True
        reputation_events = ["condition_matched", "route_promise_honored", "clean_close"]
        notable_evidence = ["inventory_claim", "condition_acceptance", "route_evidence", "escrow_release"]
    elif outcome == "route_delay":
        resolution_type = "route_monitoring"
        escrow_action = "hold_until_delivery_or_timeout"
        payout_action = "wait"
        packet_type = "route_status_packet"
        human_prompt = "wait_or_open_route_dispute"
        notable_evidence = ["tracking_history" if "tracking_history" in evidence else "handoff_memo", "route_promise"]
    elif outcome in {"insured_lost", "insured_damaged"}:
        resolution_type = "carrier_claim"
        escrow_action = "hold"
        payout_action = "claim_pending"
        packet_type = "insurance_claim_packet"
        liability_owner = "carrier_pending"
        required = ["agreed_value", "insurance_receipt", "tracking_history", "carrier_acceptance"]
        if outcome == "insured_damaged":
            required.extend(["front_photo", "back_photo", "packaging_attestation"])
        packet_complete = has_all(evidence, required)
        notable_evidence = required
        if not packet_complete:
            violations.append("insured_claim_packet_incomplete")
        if plan.insurance_amount <= 0:
            violations.append("insured_outcome_without_insurance_amount")
    elif outcome == "uninsured_lost":
        resolution_type = "route_risk_dispute"
        escrow_action = "hold"
        packet_type = "route_risk_packet"
        notable_evidence = ["uninsured_route_ack", "carrier_acceptance", "tracking_url", "route_promise"]
        if "uninsured_route" in plan.buyer_approved_exceptions:
            liability_owner = "buyer_accepted_route_risk"
            payout_action = "release_or_split_by_terms"
        else:
            liability_owner = "seller_route_failure"
            payout_action = "refund_buyer_or_bond"
            bond_action = "exposed_for_route_failure" if plan.bond_required else "none"
        packet_complete = has_all(evidence, ["tracking_url", "carrier_acceptance"])
    elif outcome == "underinsured_lost":
        resolution_type = "underinsurance_gap"
        escrow_action = "hold"
        packet_type = "underinsurance_gap_packet"
        notable_evidence = ["agreed_value", "insurance_receipt", "underinsurance_gap_ack", "tracking_history"]
        packet_complete = has_all(evidence, ["agreed_value", "insurance_receipt", "underinsurance_gap_ack"])
        if "underinsured_route" in plan.buyer_approved_exceptions:
            liability_owner = "buyer_accepted_gap"
            payout_action = "carrier_claim_plus_buyer_gap"
        else:
            liability_owner = "seller_unapproved_gap"
            payout_action = "carrier_claim_plus_seller_gap"
            bond_action = "exposed_for_underinsurance" if plan.bond_required else "none"
        if not liability_owner:
            violations.append("underinsurance_gap_without_owner")
    elif outcome == "local_handoff_dispute":
        resolution_type = "handoff_dispute"
        escrow_action = "hold"
        packet_type = "local_handoff_packet"
        notable_evidence = ["handoff_memo", "buyer_confirmation_required", "table_or_badge_note"]
        packet_complete = plan.route in {"local_meetup", "show_pickup", "local_shop_handoff"} and has_all(
            evidence, ["handoff_memo", "buyer_confirmation_required"]
        )
        liability_owner = "unresolved_until_handoff_evidence"
        human_prompt = "confirm_receipt_or_open_dispute"
        if plan.route not in {"local_meetup", "show_pickup", "local_shop_handoff"}:
            violations.append("local_handoff_outcome_on_nonlocal_route")
    elif outcome == "verifier_mismatch":
        resolution_type = "verifier_condition_dispute"
        escrow_action = "hold"
        packet_type = "verifier_packet"
        notable_evidence = ["verifier_intake", "verifier_condition_attestation", "inventory_claim"]
        packet_complete = has_all(evidence, ["verifier_intake", "verifier_condition_attestation"])
        liability_owner = "seller_if_claim_mismatched"
        payout_action = "refund_or_renegotiate"
        bond_action = "exposed_for_claim_mismatch" if plan.bond_required else "none"
        if plan.route != "verifier_forward":
            human_prompt = "decide_whether_to_route_to_verifier"
    elif outcome in {"wrong_card", "material_misdescription"}:
        resolution_type = "condition_or_identity_dispute"
        escrow_action = "hold"
        packet_type = "misdescription_packet"
        notable_evidence = ["inventory_claim", "front_photo", "back_photo", "received_card_photos", "typed_promises"]
        packet_complete = has_all(evidence, ["inventory_claim", "front_photo", "back_photo"])
        liability_owner = "seller_if_material"
        payout_action = "refund_or_reprice"
        bond_action = "exposed_for_misdescription" if plan.bond_required else "none"
    elif outcome == "seller_nonship":
        resolution_type = "nonshipment_dispute"
        escrow_action = "refund_buyer"
        packet_type = "nonshipment_packet"
        packet_complete = True
        liability_owner = "seller"
        payout_action = "no_seller_payout"
        bond_action = "slash_or_hold" if plan.bond_required else "none"
        notable_evidence = ["route_promise", "missed_ship_by", "escrow_lock"]
    elif outcome == "buyer_remorse":
        resolution_type = "buyer_remorse_not_covered"
        escrow_action = "release_if_condition_matched"
        packet_type = "trade_receipt"
        liability_owner = "buyer"
        payout_action = "pay_seller"
        final_receipt = True
        reputation_events = ["condition_matched", "buyer_remorse_not_dispute"]
        notable_evidence = ["condition_acceptance", "inspection_window"]
    elif outcome == "porch_theft":
        resolution_type = "delivered_not_received_review"
        escrow_action = "hold"
        packet_type = "proof_of_delivery_packet"
        notable_evidence = ["delivery_scan", "signature_status", "address_confirmation", "route_promise"]
        if plan.signature_required and "signature" in plan.route_promise:
            liability_owner = "carrier_or_seller_if_signature_missing"
        elif "signature_waived" in plan.buyer_approved_exceptions:
            liability_owner = "buyer_accepted_delivery_risk"
        else:
            liability_owner = "ambiguous_delivery_risk"
            human_prompt = "review_signature_and_address_controls"
        packet_complete = True

    if outcome not in {"clean_close", "buyer_remorse"} and escrow_action.startswith("release"):
        violations.append("escrow_released_before_resolution")
    if trade.value >= 300 and plan.route in {"insured_ship", "international_ship", "verifier_forward"} and plan.insurance_amount < trade.value:
        violations.append("high_value_insured_route_undercovered")
    if trade.value >= 300 and plan.route == "uninsured_ship" and "uninsured_route" not in plan.buyer_approved_exceptions:
        violations.append("high_value_uninsured_without_approval")
    if plan.route in {"local_meetup", "show_pickup", "local_shop_handoff"} and "tracking_url" in evidence:
        violations.append("local_route_requires_carrier_tracking")
    if (
        trade.mode == "casual_raw"
        and trade.value < 75
        and trade.seller_trust in {"trusted", "known"}
        and trade.condition_sensitivity < 0.50
    ):
        bloat_items = {"verifier_intake", "verifier_condition_attestation", "holo_angle_closeups"}
        if bloat_items.intersection(evidence):
            violations.append("casual_raw_evidence_bloat")
    if trade.seller_trust == "new" and trade.value >= 100 and not plan.bond_required:
        violations.append("new_seller_without_bond")
    if outcome in {"wrong_card", "material_misdescription"} and escrow_action != "hold":
        violations.append("misdescription_without_escrow_hold")

    ambiguous_without_grid = outcome in {
        "uninsured_lost",
        "underinsured_lost",
        "local_handoff_dispute",
        "porch_theft",
        "verifier_mismatch",
    }
    if outcome in {"insured_lost", "insured_damaged"} and not packet_complete:
        ambiguous_without_grid = True
    if trade.seller_trust in {"new", "unknown"} and trade.value >= 180 and not plan.bond_required:
        ambiguous_without_grid = True

    return Resolution(
        outcome=outcome,
        resolution_type=resolution_type,
        escrow_action=escrow_action,
        bond_action=bond_action,
        payout_action=payout_action,
        packet_type=packet_type,
        packet_complete=packet_complete,
        liability_owner=liability_owner,
        final_receipt=final_receipt,
        reputation_events=sorted(set(reputation_events)),
        notable_evidence=sorted(set(notable_evidence)),
        human_prompt=human_prompt,
        violations=violations,
        ambiguous_without_grid=ambiguous_without_grid,
    )


def forced_edge_trades(start_index: int, rng: random.Random) -> list[Trade]:
    forced: list[Trade] = []
    scenarios = [
        "clean_close",
        "route_delay",
        "insured_lost",
        "insured_damaged",
        "uninsured_lost",
        "underinsured_lost",
        "local_handoff_dispute",
        "verifier_mismatch",
        "wrong_card",
        "material_misdescription",
        "seller_nonship",
        "buyer_remorse",
        "porch_theft",
    ]
    for scenario in scenarios:
        for _ in range(80):
            trade = generate_trade(start_index + len(forced), rng, forced_outcome=scenario)
            if scenario in {"local_handoff_dispute"}:
                trade.mode = "collector_raw"
                trade.value = int(round(rng.uniform(80, 220)))
                trade.distance = rng.choice(["same_city", "same_region"])
                trade.show_overlap = rng.random() < 0.50
                trade.buyer_prefers_in_person = True
                trade.seller_can_meet = True
                trade.seller_can_verify = False
            if scenario in {"verifier_mismatch"}:
                trade.mode = "extreme_proof"
                lo, hi = VALUE_MODES[trade.mode]
                trade.value = int(round(rng.triangular(lo, hi, 2200)))
                trade.seller_can_verify = True
                trade.buyer_prefers_in_person = False
                trade.seller_can_meet = False
            if scenario in {"uninsured_lost"}:
                trade.mode = "casual_raw"
                trade.value = int(round(rng.uniform(25, 70)))
                trade.seller_trust = rng.choice(["trusted", "known"])
                trade.buyer_risk_tolerance = 0.92
                trade.distance = "domestic"
                trade.buyer_prefers_in_person = False
                trade.seller_can_meet = False
                trade.seller_can_verify = False
            if scenario in {"underinsured_lost"}:
                trade.mode = "high_end_raw"
                trade.value = int(round(rng.uniform(650, 1200)))
                trade.seller_insurance_cap = rng.choice([100, 250, 500])
                trade.seller_trust = rng.choice(["known", "trusted"])
                trade.distance = "domestic"
                trade.buyer_prefers_in_person = False
                trade.seller_can_meet = False
                trade.seller_can_verify = False
            if scenario in {"insured_lost", "insured_damaged", "porch_theft"}:
                trade.mode = rng.choice(["collector_raw", "high_end_raw"])
                trade.value = max(trade.value, 320)
                trade.seller_trust = rng.choice(["known", "trusted"])
                trade.seller_insurance_cap = max(trade.seller_insurance_cap, trade.value)
                trade.distance = "domestic"
                trade.buyer_prefers_in_person = False
                trade.seller_can_meet = False
                trade.seller_can_verify = False
            if scenario in {"wrong_card", "material_misdescription"}:
                trade.condition_sensitivity = max(trade.condition_sensitivity, 0.72)
            forced.append(trade)
    return forced


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = min(len(ordered) - 1, int(round((len(ordered) - 1) * p)))
    return ordered[idx]


def summarize(records: list[dict[str, Any]]) -> dict[str, Any]:
    n = len(records)
    outcomes = Counter(r["resolution"]["outcome"] for r in records)
    modes = Counter(r["trade"]["mode"] for r in records)
    routes = Counter(r["plan"]["route"] for r in records)
    resolution_types = Counter(r["resolution"]["resolution_type"] for r in records)
    evidence_tiers = Counter(r["plan"]["evidence_tier"] for r in records)
    violations = Counter(v for r in records for v in r["resolution"]["violations"])
    packet_types = Counter(r["resolution"]["packet_type"] for r in records)
    liability = Counter(r["resolution"]["liability_owner"] for r in records)
    human_gate_counts = Counter(g for r in records for g in r["plan"]["human_gates"])
    clean_receipts = sum(1 for r in records if r["resolution"]["final_receipt"])
    packet_complete = sum(1 for r in records if r["resolution"]["packet_complete"])
    ambiguous_without_grid = sum(1 for r in records if r["resolution"]["ambiguous_without_grid"])
    route_exception_approval = sum(
        1 for r in records if r["plan"]["buyer_approved_exceptions"]
    )

    evidence_counts_by_mode: dict[str, list[int]] = defaultdict(list)
    human_gates_by_mode: dict[str, list[int]] = defaultdict(list)
    bond_rate_by_seller: dict[str, list[int]] = defaultdict(list)
    for r in records:
        mode = r["trade"]["mode"]
        seller = r["trade"]["seller_trust"]
        evidence_counts_by_mode[mode].append(len(r["plan"]["evidence_items"]))
        human_gates_by_mode[mode].append(len(r["plan"]["human_gates"]))
        bond_rate_by_seller[seller].append(1 if r["plan"]["bond_required"] else 0)

    scenario_packet: dict[str, dict[str, Any]] = {}
    for outcome in sorted(outcomes):
        rows = [r for r in records if r["resolution"]["outcome"] == outcome]
        scenario_packet[outcome] = {
            "n": len(rows),
            "packet_complete_rate": round(sum(r["resolution"]["packet_complete"] for r in rows) / max(1, len(rows)), 3),
            "final_receipt_rate": round(sum(r["resolution"]["final_receipt"] for r in rows) / max(1, len(rows)), 3),
            "ambiguous_without_grid_rate": round(sum(r["resolution"]["ambiguous_without_grid"] for r in rows) / max(1, len(rows)), 3),
            "top_resolution": Counter(r["resolution"]["resolution_type"] for r in rows).most_common(3),
        }

    return {
        "n": n,
        "modes": dict(modes),
        "routes": dict(routes),
        "outcomes": dict(outcomes),
        "resolution_types": dict(resolution_types),
        "evidence_tiers": dict(evidence_tiers),
        "packet_types": dict(packet_types),
        "liability_owners": dict(liability),
        "violations": dict(violations),
        "packet_complete_rate": round(packet_complete / max(1, n), 4),
        "final_receipt_rate": round(clean_receipts / max(1, n), 4),
        "ambiguous_without_grid_rate": round(ambiguous_without_grid / max(1, n), 4),
        "route_exception_approval_rate": round(route_exception_approval / max(1, n), 4),
        "human_gates": dict(human_gate_counts),
        "evidence_items_by_mode": {
            mode: {
                "mean": round(statistics.mean(vals), 2),
                "p90": percentile(vals, 0.9),
            }
            for mode, vals in evidence_counts_by_mode.items()
        },
        "human_gates_by_mode": {
            mode: {
                "mean": round(statistics.mean(vals), 2),
                "p90": percentile(vals, 0.9),
            }
            for mode, vals in human_gates_by_mode.items()
        },
        "bond_rate_by_seller_trust": {
            seller: round(sum(vals) / max(1, len(vals)), 3)
            for seller, vals in bond_rate_by_seller.items()
        },
        "scenario_packet": scenario_packet,
    }


def diagnose(summary: dict[str, Any]) -> list[str]:
    notes: list[str] = []
    violations = summary["violations"]
    if not violations:
        notes.append("No hard invariant violations under the typed-grid protocol.")
    else:
        notes.append(f"Hard invariant violations found: {violations}")
    if summary["ambiguous_without_grid_rate"] >= 0.10:
        notes.append(
            f"{summary['ambiguous_without_grid_rate']:.1%} of cases would be materially ambiguous without typed route/risk evidence."
        )
    if summary["packet_complete_rate"] >= 0.98:
        notes.append("Evidence packet completeness is high across clean receipts, claims, and disputes.")
    else:
        notes.append(f"Evidence packet completeness is only {summary['packet_complete_rate']:.1%}; inspect packet holes.")
    casual = summary["evidence_items_by_mode"].get("casual_raw", {})
    extreme = summary["evidence_items_by_mode"].get("extreme_proof", {})
    if casual and extreme and casual["mean"] < extreme["mean"]:
        notes.append(
            f"Evidence scales in the intended direction: casual raw averages {casual['mean']} items vs extreme proof {extreme['mean']}."
        )
    if summary["bond_rate_by_seller_trust"].get("new", 0) >= 0.70:
        notes.append("New sellers are usually required to bond before accessing serious buyers.")
    if summary["route_exception_approval_rate"] > 0:
        notes.append("Route exceptions exist, but they are explicitly approved rather than hidden in shipping cost.")
    porch = summary["scenario_packet"].get("porch_theft")
    if porch and porch["ambiguous_without_grid_rate"] > 0.5:
        notes.append("Delivered-but-not-received remains a naturally hard edge; signature/address controls need crisp UI.")
    under = summary["scenario_packet"].get("underinsured_lost")
    if under and under["ambiguous_without_grid_rate"] > 0.5:
        notes.append("Underinsurance is a prime example of why gap ownership must be typed before escrow.")
    return notes


def write_report(outdir: Path, summary: dict[str, Any], samples: list[dict[str, Any]], args: argparse.Namespace) -> None:
    lines = [
        "# Marketplace Protocol Massive Edge-Case Simulation",
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
                "packet_complete_rate": summary["packet_complete_rate"],
                "final_receipt_rate": summary["final_receipt_rate"],
                "ambiguous_without_grid_rate": summary["ambiguous_without_grid_rate"],
                "route_exception_approval_rate": summary["route_exception_approval_rate"],
                "violations": summary["violations"],
            },
            indent=2,
            sort_keys=True,
        ),
        "",
        "## Modes",
        "",
        json.dumps(summary["modes"], indent=2, sort_keys=True),
        "",
        "## Routes",
        "",
        json.dumps(summary["routes"], indent=2, sort_keys=True),
        "",
        "## Outcomes",
        "",
        json.dumps(summary["outcomes"], indent=2, sort_keys=True),
        "",
        "## Resolution Types",
        "",
        json.dumps(summary["resolution_types"], indent=2, sort_keys=True),
        "",
        "## Evidence Scaling",
        "",
        json.dumps(summary["evidence_items_by_mode"], indent=2, sort_keys=True),
        "",
        "## Bond Rate By Seller Trust",
        "",
        json.dumps(summary["bond_rate_by_seller_trust"], indent=2, sort_keys=True),
        "",
        "## Scenario Packet Completeness",
        "",
        json.dumps(summary["scenario_packet"], indent=2, sort_keys=True),
        "",
        "## Edge Samples",
        "",
    ]
    for sample in samples:
        lines.extend(
            [
                f"### {sample['trade']['trade_id']} `{sample['resolution']['outcome']}`",
                "",
                json.dumps(sample, indent=2, sort_keys=True),
                "",
            ]
        )
    (outdir / "REPORT.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--trades", type=int, default=50000)
    parser.add_argument("--seed", type=int, default=20260518)
    parser.add_argument("--outdir", default="/Users/che/Marketplace/runs")
    parser.add_argument("--edge-samples", type=int, default=24)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    run_id = datetime.now(timezone.utc).strftime("protocol_edge_case_%Y%m%dT%H%M%SZ")
    outdir = Path(args.outdir) / run_id
    outdir.mkdir(parents=True, exist_ok=True)

    random_count = max(0, args.trades - 13 * 80)
    trades = [generate_trade(i, rng) for i in range(random_count)]
    trades.extend(forced_edge_trades(random_count, rng))

    records: list[dict[str, Any]] = []
    for trade in trades:
        plan = protocol_plan(trade)
        outcome = random_outcome(trade, plan, rng)
        resolution = resolve_trade(trade, plan, outcome)
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
        "probe": "marketplace_protocol_edge_case_sim",
    }
    summary["diagnosis"] = diagnose(summary)

    (outdir / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    with (outdir / "trades.jsonl").open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, sort_keys=True) + "\n")

    with (outdir / "scenario_summary.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["scenario", "n", "packet_complete_rate", "final_receipt_rate", "ambiguous_without_grid_rate", "top_resolution"],
        )
        writer.writeheader()
        for scenario, row in sorted(summary["scenario_packet"].items()):
            writer.writerow({"scenario": scenario, **row})

    interesting = [
        r
        for r in records
        if r["resolution"]["outcome"]
        in {
            "insured_lost",
            "insured_damaged",
            "uninsured_lost",
            "underinsured_lost",
            "local_handoff_dispute",
            "verifier_mismatch",
            "wrong_card",
            "material_misdescription",
            "seller_nonship",
            "porch_theft",
            "clean_close",
        }
    ]
    interesting.sort(
        key=lambda r: (
            0 if r["resolution"]["violations"] else 1,
            0 if r["resolution"]["ambiguous_without_grid"] else 1,
            -r["trade"]["value"],
        )
    )
    samples = interesting[: args.edge_samples]
    write_report(outdir, summary, samples, args)
    print(json.dumps({"run_dir": str(outdir), "summary": summary}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
