#!/usr/bin/env python3
"""Deterministic pressure test for Protocol Walls v0.1.

This is intentionally not an LLM simulation. It encodes the first walls as
deterministic checks, then runs differently biased agent variants through the
same scenarios. The goal is to catch silent acceptance of ambiguous evidence.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"

HARD_ACCEPTANCE_PACKETS = {
    "card_reference_packet",
    "item_fingerprint_hash",
    "inventory_lock_hash",
    "proof_vector_scope_packet",
    "bond_scope_packet",
    "route_insurance_risk_owner_packet",
    "arbiter_policy_hash",
    "evidence_profile_id",
}

ALPHA_DOMAIN = "tcg"
ALPHA_GAME = "pokemon"
ALPHA_TRADE_TEMPLATE = "pokemon_single_card_alpha"

DEFAULT_RAW_500_2000_EVIDENCE = {
    "fresh_nonce_possession",
    "front_full",
    "back_full",
    "four_corner_closeups",
    "edge_or_border_closeups",
    "surface_or_holo_angle",
    "flaw_callouts",
    "seller_condition_statement",
}

WAIVABLE_ACCEPTANCE_EVIDENCE = {
    "fresh_nonce_possession",
    "four_corner_closeups",
    "edge_or_border_closeups",
    "surface_or_holo_angle",
    "external_availability_covenant",
}

CORE_BOND_FAILURES = {
    "nonship",
    "wrong_item",
    "material_condition_mismatch",
    "underinsurance_without_buyer_acceptance",
    "route_negligence",
    "failure_to_cure",
}

REQUIRED_PROOF_NOT_CLAIMING = {
    "current_possession",
    "authenticity",
    "raw_card_condition",
    "shipment_completion",
}

REQUIRED_CARD_REFERENCE_NOT_CLAIMING = {
    "authenticity",
    "condition",
    "possession",
    "price_truth",
    "seller_card_language",
    "seller_inventory_existence",
}

CLAIM_MATRIX = {
    "wrong_item": {
        "seller": {"item_fingerprint", "pre_route_photos"},
        "buyer": {"arrival_photos", "return_fingerprint"},
        "route": {"delivery_event"},
        "closure": "escalate_if_buyer_arrival_evidence_missing",
    },
    "condition_downgrade": {
        "seller": {"condition_anchors", "seller_condition_statement"},
        "buyer": {"immediate_arrival_photos", "condition_notes"},
        "route": {"delivery_event"},
        "closure": "judged_under_tcg_condition_rubric",
    },
    "empty_package": {
        "seller": {"packaging_proof", "route_receipt"},
        "buyer": {"package_exterior", "opening_sequence", "label_photo"},
        "route": {"carrier_acceptance"},
        "closure": "escalate_unless_buyer_opening_evidence_exists",
    },
    "underinsured_loss": {
        "seller": {"route_insurance_commitment"},
        "buyer": {"buyer_gap_acceptance_or_rejection"},
        "route": {"insurance_amount", "declared_value"},
        "closure": "seller_liable_unless_buyer_accepted_gap",
    },
    "late_shipment": {
        "seller": {"ship_by_promise"},
        "buyer": set(),
        "route": {"carrier_acceptance_timestamp"},
        "closure": "mostly_enforced_or_legible",
    },
    "frivolous_buyer_claim": {
        "seller": {"completed_route", "seller_evidence_compliance"},
        "buyer": set(),
        "route": {"delivery_event"},
        "closure": "deny_claim_if_buyer_evidence_missing_or_contradictory",
    },
    "seller_cure": {
        "seller": {"cure_packet"},
        "buyer": {"buyer_response"},
        "route": set(),
        "closure": "accepted_rejected_or_escalated",
    },
}


@dataclass
class Scenario:
    scenario_id: str
    description: str
    value_usd: int
    domain: str = ALPHA_DOMAIN
    game: str = ALPHA_GAME
    trade_template: str = ALPHA_TRADE_TEMPLATE
    item_form: str = "raw_card"
    phase: str = "offer_review"
    hard_packets: set[str] = field(default_factory=set)
    seller_evidence: set[str] = field(default_factory=set)
    buyer_risk_acceptance: dict[str, Any] | None = None
    proof_positive_claims: set[str] = field(default_factory=set)
    proof_not_claiming: set[str] = field(default_factory=set)
    bond_covered_failures: set[str] = field(default_factory=set)
    route: dict[str, Any] = field(default_factory=dict)
    card_reference: dict[str, Any] = field(default_factory=dict)
    external_availability_covenant: bool = False
    claim_evidence: dict[str, dict[str, set[str]]] = field(default_factory=dict)


@dataclass
class WallResult:
    wall_id: str
    outcome: str
    label: str
    missing: list[str]
    notes: str


def sorted_list(values: set[str] | list[str]) -> list[str]:
    return sorted(values)


def buyer_risk_acceptance_covers(scenario: Scenario, missing: set[str]) -> bool:
    packet = scenario.buyer_risk_acceptance
    if not packet:
        return False
    waived = set(packet.get("waived_evidence_requirements", []))
    required_fields = {
        "accepted_evidence_refs",
        "waived_evidence_requirements",
        "remaining_unproven_claims",
        "claim_consequences",
        "human_mandate_ref",
        "expires_at",
        "signature",
    }
    return missing.issubset(waived) and required_fields.issubset(packet.keys())


def check_alpha_scope(scenario: Scenario) -> WallResult:
    missing: list[str] = []
    if scenario.domain != ALPHA_DOMAIN:
        missing.append("domain:tcg")
    if scenario.game != ALPHA_GAME:
        missing.append("game:pokemon")
    if scenario.trade_template != ALPHA_TRADE_TEMPLATE:
        missing.append("trade_template:pokemon_single_card_alpha")
    if scenario.item_form not in {"raw_card", "graded_slab"}:
        missing.append("item_form:single_card")
    if missing:
        return WallResult(
            "POKEMON_ALPHA_SCOPE",
            "block",
            "enforced",
            missing,
            "blocked_outside_alpha_scope",
        )
    return WallResult(
        "POKEMON_ALPHA_SCOPE",
        "pass",
        "enforced",
        [],
        "pokemon single-card alpha scope satisfied",
    )


def check_acceptance_profile(scenario: Scenario) -> WallResult:
    if not (scenario.item_form == "raw_card" and 500 <= scenario.value_usd <= 2000):
        return WallResult(
            "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000",
            "pass",
            "enforced",
            [],
            "profile does not apply",
        )

    hard_missing = HARD_ACCEPTANCE_PACKETS - scenario.hard_packets
    if hard_missing:
        return WallResult(
            "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000",
            "block",
            "enforced",
            sorted_list(hard_missing),
            "hard acceptance packet missing",
        )

    evidence_missing = DEFAULT_RAW_500_2000_EVIDENCE - scenario.seller_evidence
    hard_evidence_missing = evidence_missing - WAIVABLE_ACCEPTANCE_EVIDENCE
    if hard_evidence_missing:
        return WallResult(
            "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000",
            "block",
            "legible",
            sorted_list(hard_evidence_missing),
            "non-waivable raw-card evidence missing",
        )

    waivable_missing = evidence_missing & WAIVABLE_ACCEPTANCE_EVIDENCE
    if scenario.external_availability_covenant is False:
        waivable_missing.add("external_availability_covenant")

    if waivable_missing:
        if buyer_risk_acceptance_covers(scenario, waivable_missing):
            return WallResult(
                "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000",
                "waived",
                "judged",
                sorted_list(waivable_missing),
                "buyer accepted unresolved risk with consequences",
            )
        return WallResult(
            "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000",
            "waiver_required",
            "judged",
            sorted_list(waivable_missing),
            "waivable evidence missing but not accepted by buyer risk packet",
        )

    return WallResult(
        "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000",
        "pass",
        "legible",
        [],
        "raw-card acceptance profile satisfied",
    )


def check_card_reference(scenario: Scenario) -> WallResult:
    if "card_reference_packet" not in scenario.hard_packets:
        return WallResult(
            "CardReferenceCandidate",
            "block",
            "enforced",
            ["card_reference_packet"],
            "pokemon alpha needs a catalog candidate or explicit database-gap reference",
        )

    required = {
        "source",
        "source_url",
        "source_language",
        "printed_name",
        "set_name",
        "card_number",
        "match_kind",
        "source_coverage",
        "selected_by",
        "not_claiming",
    }
    missing = required - scenario.card_reference.keys()
    if missing:
        return WallResult(
            "CardReferenceCandidate",
            "block",
            "enforced",
            sorted_list(missing),
            "card reference packet incomplete",
        )

    match_kind = scenario.card_reference["match_kind"]
    if match_kind not in {"exact_catalog_match", "language_equivalent", "manual_database_gap"}:
        return WallResult(
            "CardReferenceCandidate",
            "block",
            "enforced",
            ["match_kind"],
            "catalog match kind is outside alpha vocabulary",
        )

    if match_kind != "manual_database_gap" and "source_card_id" not in scenario.card_reference:
        return WallResult(
            "CardReferenceCandidate",
            "block",
            "enforced",
            ["source_card_id"],
            "database-backed reference needs external card id",
        )

    if match_kind == "manual_database_gap":
        gap_required = {"manual_reference_reason", "human_or_agent_note"}
        gap_missing = gap_required - scenario.card_reference.keys()
        if gap_missing:
            return WallResult(
                "CardReferenceCandidate",
                "block",
                "judged",
                sorted_list(gap_missing),
                "manual reference gap needs explicit reason and note",
            )

    not_claiming = set(scenario.card_reference.get("not_claiming", []))
    missing_not_claiming = REQUIRED_CARD_REFERENCE_NOT_CLAIMING - not_claiming
    if missing_not_claiming:
        return WallResult(
            "CardReferenceCandidate",
            "block",
            "legible",
            sorted_list(missing_not_claiming),
            "catalog reference can launder database identity into physical truth",
        )

    if match_kind == "manual_database_gap":
        return WallResult(
            "CardReferenceCandidate",
            "waiver_required",
            "judged",
            ["database_gap_reference"],
            "buyer must acknowledge that catalog lookup could not anchor the print",
        )

    return WallResult(
        "CardReferenceCandidate",
        "pass",
        "legible",
        [],
        "catalog candidate is scoped and bounded",
    )


def check_buyer_risk_acceptance(scenario: Scenario) -> WallResult:
    packet = scenario.buyer_risk_acceptance
    if not packet:
        return WallResult(
            "BuyerRiskAcceptance",
            "pass",
            "judged",
            [],
            "no waiver attempted",
        )

    hard_waivers = set(packet.get("waived_evidence_requirements", [])) - WAIVABLE_ACCEPTANCE_EVIDENCE
    if hard_waivers:
        return WallResult(
            "BuyerRiskAcceptance",
            "block",
            "enforced",
            sorted_list(hard_waivers),
            "buyer attempted to waive non-waivable requirement",
        )

    required_fields = {
        "accepted_evidence_refs",
        "waived_evidence_requirements",
        "remaining_unproven_claims",
        "claim_consequences",
        "human_mandate_ref",
        "expires_at",
        "signature",
    }
    missing = required_fields - packet.keys()
    if missing:
        return WallResult(
            "BuyerRiskAcceptance",
            "block",
            "enforced",
            sorted_list(missing),
            "risk acceptance packet incomplete",
        )

    return WallResult(
        "BuyerRiskAcceptance",
        "pass",
        "judged",
        [],
        "waiver is explicit and scoped",
    )


def check_bond_scope(scenario: Scenario) -> WallResult:
    if "bond_scope_packet" not in scenario.hard_packets:
        return WallResult("BondScope", "block", "enforced", ["bond_scope_packet"], "bond scope packet missing")

    missing = CORE_BOND_FAILURES - scenario.bond_covered_failures
    if missing:
        return WallResult(
            "BondScope",
            "waiver_required",
            "judged",
            sorted_list(missing),
            "bond does not cover all default alpha failures",
        )
    return WallResult("BondScope", "pass", "legible", [], "bond coverage scoped")


def check_proof_vector_scope(scenario: Scenario) -> WallResult:
    if "proof_vector_scope_packet" not in scenario.hard_packets:
        return WallResult(
            "ProofVectorScope",
            "block",
            "enforced",
            ["proof_vector_scope_packet"],
            "proof vector scope packet missing",
        )
    missing = REQUIRED_PROOF_NOT_CLAIMING - scenario.proof_not_claiming
    if missing:
        return WallResult(
            "ProofVectorScope",
            "block",
            "legible",
            sorted_list(missing),
            "proof vector can launder seller proof into object proof",
        )
    return WallResult(
        "ProofVectorScope",
        "pass",
        "legible",
        [],
        "positive claims and not-claiming boundaries present",
    )


def check_route_insurance_risk_owner(scenario: Scenario) -> WallResult:
    if "route_insurance_risk_owner_packet" not in scenario.hard_packets:
        return WallResult(
            "RouteInsuranceRiskOwner",
            "block",
            "enforced",
            ["route_insurance_risk_owner_packet"],
            "route risk owner packet missing",
        )
    required = {
        "route_type",
        "carrier_or_handoff_method",
        "declared_value",
        "insurance_amount",
        "signature_required",
        "ship_by",
        "risk_owner_for_gap",
        "accepted_by_buyer",
        "accepted_by_seller",
    }
    missing = required - scenario.route.keys()
    if missing:
        return WallResult(
            "RouteInsuranceRiskOwner",
            "block",
            "enforced",
            sorted_list(missing),
            "route insurance packet incomplete",
        )
    if scenario.route["insurance_amount"] < scenario.route["declared_value"] and not scenario.route["risk_owner_for_gap"]:
        return WallResult(
            "RouteInsuranceRiskOwner",
            "block",
            "enforced",
            ["risk_owner_for_gap"],
            "insurance gap not assigned",
        )
    return WallResult(
        "RouteInsuranceRiskOwner",
        "pass",
        "legible",
        [],
        "route amount, declared value, and gap owner are explicit",
    )


def check_external_availability_covenant(scenario: Scenario) -> WallResult:
    if scenario.external_availability_covenant:
        return WallResult(
            "ExternalAvailabilityCovenant",
            "pass",
            "legible",
            [],
            "seller signed external availability promise",
        )
    if scenario.buyer_risk_acceptance and "external_availability_covenant" in scenario.buyer_risk_acceptance.get(
        "waived_evidence_requirements", []
    ):
        return WallResult(
            "ExternalAvailabilityCovenant",
            "waived",
            "judged",
            ["external_availability_covenant"],
            "buyer accepted that inventory lock is protocol-local only",
        )
    return WallResult(
        "ExternalAvailabilityCovenant",
        "waiver_required",
        "judged",
        ["external_availability_covenant"],
        "external sale risk remains unaccepted",
    )


def check_claim_closure_matrix(scenario: Scenario) -> WallResult:
    if not scenario.claim_evidence:
        return WallResult(
            "ClaimClosureEvidenceMatrix",
            "pass",
            "judged",
            [],
            "no claim opened",
        )

    missing_items: list[str] = []
    escalations: list[str] = []
    for claim_type, evidence in scenario.claim_evidence.items():
        row = CLAIM_MATRIX[claim_type]
        seller_missing = row["seller"] - evidence.get("seller", set())
        buyer_missing = row["buyer"] - evidence.get("buyer", set())
        route_missing = row["route"] - evidence.get("route", set())
        if seller_missing or buyer_missing or route_missing:
            for item in sorted(seller_missing):
                missing_items.append(f"{claim_type}:seller:{item}")
            for item in sorted(buyer_missing):
                missing_items.append(f"{claim_type}:buyer:{item}")
            for item in sorted(route_missing):
                missing_items.append(f"{claim_type}:route:{item}")
            escalations.append(claim_type)

    if missing_items:
        return WallResult(
            "ClaimClosureEvidenceMatrix",
            "escalate",
            "judged",
            missing_items,
            "claim row named missing evidence instead of improvising",
        )

    return WallResult(
        "ClaimClosureEvidenceMatrix",
        "pass",
        "judged",
        [],
        "claim evidence satisfies matrix rows",
    )


def evaluate_walls(scenario: Scenario) -> list[WallResult]:
    return [
        check_alpha_scope(scenario),
        check_card_reference(scenario),
        check_acceptance_profile(scenario),
        check_buyer_risk_acceptance(scenario),
        check_bond_scope(scenario),
        check_proof_vector_scope(scenario),
        check_route_insurance_risk_owner(scenario),
        check_external_availability_covenant(scenario),
        check_claim_closure_matrix(scenario),
    ]


def variant_decision(variant: str, wall_results: list[WallResult]) -> tuple[str, str]:
    outcomes = {result.outcome for result in wall_results}
    if "block" in outcomes:
        return "blocked", "hard wall missing; agent cannot narrate around it"
    if variant == "strict_boundary_buyer" and ("waiver_required" in outcomes or "waived" in outcomes):
        return "request_more_evidence", "strict buyer refuses waiver path by default"
    if variant == "convenience_first_buyer" and "waiver_required" in outcomes:
        return "blocked_until_waiver", "convenience requires explicit BuyerRiskAcceptance"
    if variant == "convenience_first_buyer" and "waived" in outcomes:
        return "accept_with_waiver", "allowed only as unresolved risk"
    if "waived" in outcomes:
        return "continue_with_recorded_waiver", "waived ambiguity remains visible in the trade state"
    if variant == "seller_friendly_market_maker" and "waiver_required" in outcomes:
        return "revise_offer_or_request_waiver", "seller-friendly close path still needs scoped waiver"
    if variant == "adversarial_seller" and ("waiver_required" in outcomes or "escalate" in outcomes):
        return "semantic_attack_contained", "ambiguity stayed legible instead of becoming trust"
    if variant == "arbiter_policy_agent" and "waiver_required" in outcomes:
        return "request_policy_waiver_or_block", "arbiter policy cannot treat unresolved waiver rows as normal acceptance"
    if variant == "arbiter_policy_agent" and "escalate" in outcomes:
        return "escalate_with_matrix_row", "arbiter names missing evidence under policy"
    if "escalate" in outcomes:
        return "escalate", "judgment required under policy"
    return "accept_or_continue", "all active walls passed"


def risk_acceptance_packet(*waived: str) -> dict[str, Any]:
    return {
        "accepted_evidence_refs": ["front_full", "back_full", "seller_condition_statement"],
        "waived_evidence_requirements": sorted(waived),
        "remaining_unproven_claims": ["current possession strength", "fine condition detail"],
        "claim_consequences": ["condition and wrong-item claims may require stronger buyer arrival evidence"],
        "human_mandate_ref": "buyer.mandate.tcg.medium_risk.v0.1",
        "expires_at": "2026-05-21T00:00:00Z",
        "signature": "local-fixture-signature",
    }


def route_packet(value: int, insurance: int | None = None, gap_owner: str = "") -> dict[str, Any]:
    return {
        "route_type": "insured_ship",
        "carrier_or_handoff_method": "carrier",
        "declared_value": value,
        "insurance_amount": value if insurance is None else insurance,
        "signature_required": True,
        "ship_by": "2026-05-22T18:00:00Z",
        "risk_owner_for_gap": gap_owner,
        "accepted_by_buyer": True,
        "accepted_by_seller": True,
    }


def card_reference_packet(match_kind: str = "language_equivalent") -> dict[str, Any]:
    return {
        "source": "pokemontcg.io",
        "source_card_id": "neo2-1",
        "source_url": "https://api.pokemontcg.io/v2/cards/neo2-1",
        "source_language": "en",
        "printed_name": "Espeon",
        "set_name": "Neo Discovery",
        "card_number": "1",
        "match_kind": match_kind,
        "source_coverage": "english_catalog_anchor_for_japanese_claim",
        "selected_by": "buyer_agent",
        "not_claiming": sorted(REQUIRED_CARD_REFERENCE_NOT_CLAIMING),
    }


def scenarios() -> list[Scenario]:
    hard = set(HARD_ACCEPTANCE_PACKETS)
    good_proof_claims = {"seller_controls_shop_domain", "seller_controls_ebay_account"}
    return [
        Scenario(
            scenario_id="original_offer",
            description="Original social offer: shop/eBay proof, six photos, insured shipping, moderate bond",
            value_usd=750,
            hard_packets=set(),
            seller_evidence={"front_full", "back_full", "seller_condition_statement"},
            proof_positive_claims=good_proof_claims,
            proof_not_claiming=set(),
            bond_covered_failures={"nonship"},
            route={"route_type": "insured_ship"},
            card_reference={},
        ),
        Scenario(
            scenario_id="scoped_offer_with_buyer_waiver",
            description="Hard packets present; buyer waives some evidence to lower seller attention cost",
            value_usd=750,
            hard_packets=hard,
            seller_evidence={"front_full", "back_full", "flaw_callouts", "seller_condition_statement"},
            buyer_risk_acceptance=risk_acceptance_packet(
                "fresh_nonce_possession",
                "four_corner_closeups",
                "edge_or_border_closeups",
                "surface_or_holo_angle",
                "external_availability_covenant",
            ),
            proof_positive_claims=good_proof_claims,
            proof_not_claiming=REQUIRED_PROOF_NOT_CLAIMING,
            bond_covered_failures=CORE_BOND_FAILURES,
            route=route_packet(750),
            card_reference=card_reference_packet(),
            external_availability_covenant=False,
        ),
        Scenario(
            scenario_id="full_wall_compliant_offer",
            description="All default raw-card evidence, scoped trust, full insurance, covenant, and bond scope",
            value_usd=750,
            hard_packets=hard,
            seller_evidence=set(DEFAULT_RAW_500_2000_EVIDENCE),
            proof_positive_claims=good_proof_claims,
            proof_not_claiming=REQUIRED_PROOF_NOT_CLAIMING,
            bond_covered_failures=CORE_BOND_FAILURES,
            route=route_packet(750),
            card_reference=card_reference_packet(),
            external_availability_covenant=True,
        ),
        Scenario(
            scenario_id="outside_scope_magic_card",
            description="A non-Pokemon card with otherwise complete packets is blocked outside alpha",
            value_usd=750,
            domain="tcg",
            game="magic",
            trade_template="magic_single_card_future",
            hard_packets=hard,
            seller_evidence=set(DEFAULT_RAW_500_2000_EVIDENCE),
            proof_positive_claims=good_proof_claims,
            proof_not_claiming=REQUIRED_PROOF_NOT_CLAIMING,
            bond_covered_failures=CORE_BOND_FAILURES,
            route=route_packet(750),
            card_reference=card_reference_packet(),
            external_availability_covenant=True,
        ),
        Scenario(
            scenario_id="adversarial_hash_compliant_offer",
            description="Valid-looking packets with stale evidence, proof overclaim, underinsurance, and narrow bond",
            value_usd=750,
            hard_packets=hard,
            seller_evidence={"front_full", "back_full", "seller_condition_statement"},
            proof_positive_claims=good_proof_claims | {"authenticity", "raw_card_condition"},
            proof_not_claiming={"shipment_completion"},
            bond_covered_failures={"nonship"},
            route=route_packet(750, insurance=250, gap_owner=""),
            card_reference=card_reference_packet()
            | {"not_claiming": ["price_truth", "seller_inventory_existence"]},
            external_availability_covenant=False,
        ),
        Scenario(
            scenario_id="claim_closure_missing_buyer_evidence",
            description="Wrong-item, condition, and empty-package claims without buyer arrival evidence",
            value_usd=750,
            hard_packets=hard,
            seller_evidence=set(DEFAULT_RAW_500_2000_EVIDENCE),
            proof_positive_claims=good_proof_claims,
            proof_not_claiming=REQUIRED_PROOF_NOT_CLAIMING,
            bond_covered_failures=CORE_BOND_FAILURES,
            route=route_packet(750),
            card_reference=card_reference_packet(),
            external_availability_covenant=True,
            claim_evidence={
                "wrong_item": {
                    "seller": {"item_fingerprint", "pre_route_photos"},
                    "buyer": set(),
                    "route": {"delivery_event"},
                },
                "condition_downgrade": {
                    "seller": {"condition_anchors", "seller_condition_statement"},
                    "buyer": {"condition_notes"},
                    "route": {"delivery_event"},
                },
                "empty_package": {
                    "seller": {"packaging_proof", "route_receipt"},
                    "buyer": {"label_photo"},
                    "route": {"carrier_acceptance"},
                },
            },
        ),
        Scenario(
            scenario_id="claim_closure_with_required_evidence",
            description="Claim packets include required seller, buyer, and route evidence rows",
            value_usd=750,
            hard_packets=hard,
            seller_evidence=set(DEFAULT_RAW_500_2000_EVIDENCE),
            proof_positive_claims=good_proof_claims,
            proof_not_claiming=REQUIRED_PROOF_NOT_CLAIMING,
            bond_covered_failures=CORE_BOND_FAILURES,
            route=route_packet(750),
            card_reference=card_reference_packet(),
            external_availability_covenant=True,
            claim_evidence={
                "wrong_item": {
                    "seller": {"item_fingerprint", "pre_route_photos"},
                    "buyer": {"arrival_photos", "return_fingerprint"},
                    "route": {"delivery_event"},
                },
                "condition_downgrade": {
                    "seller": {"condition_anchors", "seller_condition_statement"},
                    "buyer": {"immediate_arrival_photos", "condition_notes"},
                    "route": {"delivery_event"},
                },
                "late_shipment": {
                    "seller": {"ship_by_promise"},
                    "buyer": set(),
                    "route": {"carrier_acceptance_timestamp"},
                },
            },
        ),
    ]


VARIANTS = [
    "strict_boundary_buyer",
    "convenience_first_buyer",
    "seller_friendly_market_maker",
    "adversarial_seller",
    "arbiter_policy_agent",
]


def run_pressure() -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    counters: Counter[str] = Counter()
    silent_accepts = 0
    uncontained_adversarial = 0

    for scenario in scenarios():
        wall_results = evaluate_walls(scenario)
        for variant in VARIANTS:
            decision, rationale = variant_decision(variant, wall_results)
            if decision == "accept_or_continue":
                missing_or_waived = [
                    item
                    for result in wall_results
                    for item in result.missing
                    if result.outcome in {"waived", "waiver_required"}
                ]
                if missing_or_waived:
                    silent_accepts += 1
            if variant == "adversarial_seller" and scenario.scenario_id == "adversarial_hash_compliant_offer":
                if decision not in {"blocked", "semantic_attack_contained", "revise_offer_or_request_waiver"}:
                    uncontained_adversarial += 1

            counters[decision] += 1
            rows.append(
                {
                    "scenario_id": scenario.scenario_id,
                    "variant": variant,
                    "decision": decision,
                    "rationale": rationale,
                    "wall_results": [
                        {
                            "wall_id": result.wall_id,
                            "outcome": result.outcome,
                            "label": result.label,
                            "missing": result.missing,
                            "notes": result.notes,
                        }
                        for result in wall_results
                    ],
                }
            )

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "scenario_count": len(scenarios()),
        "variant_count": len(VARIANTS),
        "run_count": len(rows),
        "decision_counts": dict(sorted(counters.items())),
        "silent_accepts": silent_accepts,
        "uncontained_adversarial_attacks": uncontained_adversarial,
        "pass": silent_accepts == 0 and uncontained_adversarial == 0,
        "rows": rows,
    }


def report_lines(summary: dict[str, Any]) -> list[str]:
    lines = [
        f"# Protocol Wall Pressure Test: {summary['generated_at']}",
        "",
        "## Result",
        "",
        f"- Pass: `{summary['pass']}`",
        f"- Scenarios: `{summary['scenario_count']}`",
        f"- Prompt variants: `{summary['variant_count']}`",
        f"- Runs: `{summary['run_count']}`",
        f"- Silent accepts of unresolved ambiguity: `{summary['silent_accepts']}`",
        f"- Uncontained adversarial semantic attacks: `{summary['uncontained_adversarial_attacks']}`",
        "",
        "Decision counts:",
        "",
    ]
    for decision, count in summary["decision_counts"].items():
        lines.append(f"- `{decision}`: `{count}`")

    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            "The v0.1 walls prevent silent progress on the original weak offer. A convenience-first buyer can still proceed only when missing evidence is carried in `BuyerRiskAcceptance`. The adversarial hash-compliant offer is blocked by proof scope, route gap ownership, and bond scope checks. A non-Pokemon card with otherwise complete packets is blocked by `POKEMON_ALPHA_SCOPE`.",
            "",
            "Claim closure is now policy-bound. Missing buyer arrival or opening evidence does not let an arbiter improvise; the matrix names the missing row evidence and escalates.",
            "",
            "## Scenario Outcomes",
            "",
        ]
    )

    for row in summary["rows"]:
        missing = []
        outcomes = Counter()
        for result in row["wall_results"]:
            outcomes[result["outcome"]] += 1
            for item in result["missing"]:
                missing.append(f"{result['wall_id']}:{item}")
        lines.extend(
            [
                f"### {row['scenario_id']} / {row['variant']}",
                "",
                f"- Decision: `{row['decision']}`",
                f"- Rationale: {row['rationale']}",
                f"- Wall outcomes: `{dict(sorted(outcomes.items()))}`",
            ]
        )
        if missing:
            lines.append(f"- Missing or unresolved: `{'; '.join(missing)}`")
        lines.append("")

    return lines


def main() -> None:
    parser = argparse.ArgumentParser(description="Run deterministic Protocol Walls v0.1 pressure test.")
    parser.add_argument("--out-dir", type=Path, default=None)
    args = parser.parse_args()

    summary = run_pressure()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = args.out_dir or (RUNS / f"protocol_wall_pressure_{stamp}")
    run_dir.mkdir(parents=True, exist_ok=True)

    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    (run_dir / "REPORT.md").write_text("\n".join(report_lines(summary)) + "\n")
    print(run_dir)
    print(json.dumps({k: summary[k] for k in ["pass", "silent_accepts", "uncontained_adversarial_attacks"]}))


if __name__ == "__main__":
    main()
