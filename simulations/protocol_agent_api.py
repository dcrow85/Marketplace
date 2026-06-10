#!/usr/bin/env python3
"""Agent-facing API facade for the Marketplace wall harness.

The API is intentionally small. It wraps wall checks into action-shaped
responses and preserves the two memory currencies:

- trajectory_capacity: accumulated actor/path capacity
- assembly_placement: situated admissibility for this trade and gate
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from protocol_wall_pressure_sim import (
    HARD_ACCEPTANCE_PACKETS,
    REQUIRED_PROOF_NOT_CLAIMING,
    Scenario,
    WallResult,
    evaluate_walls,
    sorted_list,
    variant_decision,
)
from protocol_wall_packets import packet_commitments


ROUTE_LOCK_REQUIREMENTS = {
    "assembly_history_hash",
    "item_fingerprint_hash",
    "inventory_lock_hash",
    "route_insurance_risk_owner_packet",
    "route_spendability_hash",
    "route_assembly_witness_hash",
}

TRAJECTORY_ONLY_CLAIMS = {
    "seller_controls_shop_domain",
    "seller_controls_ebay_account",
    "public_reviews_match_shop_identity",
    "prior_protocol_receipts",
    "curated_seller_status",
}

OBJECT_PLACEMENT_CLAIMS = {
    "current_possession",
    "authenticity",
    "raw_card_condition",
    "shipment_completion",
}


@dataclass
class ApiResponse:
    action: str
    trade_id: str
    decision: str
    currency_integrity: dict[str, Any]
    memory: dict[str, list[dict[str, Any]]]
    spendability: dict[str, Any]
    walls: list[dict[str, Any]]
    enforced_facts: list[str] = field(default_factory=list)
    legible_evidence: list[str] = field(default_factory=list)
    judgment_needed: list[str] = field(default_factory=list)
    packets_required: list[str] = field(default_factory=list)
    packets_to_generate: list[str] = field(default_factory=list)
    packet_commitments: dict[str, Any] = field(default_factory=dict)
    human_question_if_any: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def wall_dicts(walls: list[WallResult]) -> list[dict[str, Any]]:
    return [asdict(wall) for wall in walls]


def classify_wall_facts(walls: list[WallResult]) -> tuple[list[str], list[str], list[str]]:
    enforced: list[str] = []
    legible: list[str] = []
    judged: list[str] = []
    for wall in walls:
        line = f"{wall.wall_id}:{wall.outcome}"
        if wall.label == "enforced":
            enforced.append(line)
        elif wall.label == "legible":
            legible.append(line)
        else:
            judged.append(line)
    return enforced, legible, judged


def memory_currencies(scenario: Scenario) -> dict[str, list[dict[str, Any]]]:
    trajectory = []
    assembly = []

    for claim in sorted(scenario.proof_positive_claims):
        currency = "trajectory_capacity"
        if claim in OBJECT_PLACEMENT_CLAIMS:
            currency = "trajectory_overclaim"
        trajectory.append(
            {
                "claim": claim,
                "currency": currency,
                "spendable_as": "trust_weight_only",
            }
        )

    for packet in sorted(scenario.hard_packets):
        spendable_as = "gate_prerequisite"
        if packet == "card_reference_packet":
            spendable_as = "catalog_candidate_only"
        assembly.append(
            {
                "placement": packet,
                "currency": "assembly_placement",
                "spendable_as": spendable_as,
            }
        )

    if scenario.buyer_risk_acceptance:
        assembly.append(
            {
                "placement": "buyer_risk_acceptance",
                "currency": "assembly_placement",
                "spendable_as": "waiver_record",
                "waived": sorted(scenario.buyer_risk_acceptance.get("waived_evidence_requirements", [])),
            }
        )

    if scenario.external_availability_covenant:
        assembly.append(
            {
                "placement": "external_availability_covenant",
                "currency": "assembly_placement",
                "spendable_as": "external_availability_promise",
            }
        )

    return {
        "trajectory_capacity": trajectory,
        "assembly_placement": assembly,
    }


def currency_integrity(scenario: Scenario, walls: list[WallResult]) -> dict[str, Any]:
    overclaims = sorted(scenario.proof_positive_claims & OBJECT_PLACEMENT_CLAIMS)
    missing_not_claiming = sorted(REQUIRED_PROOF_NOT_CLAIMING - scenario.proof_not_claiming)
    waived = sorted({item for wall in walls if wall.outcome == "waived" for item in wall.missing})
    waiver_required = sorted({item for wall in walls if wall.outcome == "waiver_required" for item in wall.missing})
    blocked = sorted({item for wall in walls if wall.outcome == "block" for item in wall.missing})
    return {
        "trajectory_overclaims": overclaims,
        "missing_not_claiming": missing_not_claiming,
        "waived_ambiguity": waived,
        "waiver_required": waiver_required,
        "blocked_missing": blocked,
        "ordinary_acceptance_allowed": not blocked and not waiver_required and not waived and not overclaims,
    }


def packets_required_from_walls(walls: list[WallResult]) -> list[str]:
    packets = set()
    for wall in walls:
        for missing in wall.missing:
            if missing.endswith("_packet") or missing.endswith("_hash") or missing in HARD_ACCEPTANCE_PACKETS:
                packets.add(missing)
    return sorted(packets)


def terminal_floor(walls: list[WallResult]) -> str:
    outcomes = {wall.outcome for wall in walls}
    if "block" in outcomes:
        return "block"
    if "escalate" in outcomes:
        return "escalate"
    if "waiver_required" in outcomes:
        return "waiver_required"
    if "waived" in outcomes:
        return "waived"
    return "pass"


def evaluate_offer(scenario: Scenario, prompt_variant: str) -> ApiResponse:
    walls = evaluate_walls(scenario)
    decision, rationale = variant_decision(prompt_variant, walls)
    enforced, legible, judged = classify_wall_facts(walls)
    integrity = currency_integrity(scenario, walls)

    packets_to_generate = []
    if decision in {"blocked_until_waiver", "revise_offer_or_request_waiver"} or integrity["waiver_required"]:
        packets_to_generate.append("BuyerRiskAcceptance")
    if "bond_scope_packet" in integrity["blocked_missing"]:
        packets_to_generate.append("BondScope")
    if "proof_vector_scope_packet" in integrity["blocked_missing"]:
        packets_to_generate.append("ProofVectorScope")
    if "route_insurance_risk_owner_packet" in integrity["blocked_missing"]:
        packets_to_generate.append("RouteInsuranceRiskOwner")

    return ApiResponse(
        action="evaluateOffer",
        trade_id=scenario.scenario_id,
        decision=decision,
        currency_integrity=integrity | {"rationale": rationale},
        memory=memory_currencies(scenario),
        spendability={
            "gate": "offer_acceptance",
            "required": sorted(HARD_ACCEPTANCE_PACKETS),
            "present": sorted(scenario.hard_packets & HARD_ACCEPTANCE_PACKETS),
            "missing": sorted(HARD_ACCEPTANCE_PACKETS - scenario.hard_packets),
        },
        walls=wall_dicts(walls),
        enforced_facts=enforced,
        legible_evidence=legible,
        judgment_needed=judged,
        packets_required=packets_required_from_walls(walls),
        packets_to_generate=sorted(set(packets_to_generate)),
        packet_commitments=packet_commitments(scenario, walls),
        human_question_if_any=human_question_for_decision(decision),
    )


def accept_offer_and_fund_escrow(scenario: Scenario, prompt_variant: str) -> ApiResponse:
    response = evaluate_offer(scenario, prompt_variant)
    if response.decision in {"accept_or_continue", "accept_with_waiver", "continue_with_recorded_waiver"}:
        response.action = "acceptOfferAndFundEscrow"
        response.packets_to_generate = sorted(set(response.packets_to_generate + ["EscrowTerms", "AcceptanceReceipt"]))
        if response.currency_integrity["waived_ambiguity"]:
            response.decision = "accept_with_recorded_waiver"
        else:
            response.decision = "escrow_fundable"
        return response

    response.action = "acceptOfferAndFundEscrow"
    response.decision = "funding_blocked"
    return response


def seller_commit_route(scenario: Scenario) -> ApiResponse:
    walls = evaluate_walls(scenario)
    enforced, legible, judged = classify_wall_facts(walls)
    commitments = packet_commitments(scenario, walls)
    floor = terminal_floor(walls)
    present = set(scenario.hard_packets & ROUTE_LOCK_REQUIREMENTS)
    if commitments.get("assembly_history_hash"):
        present.add("assembly_history_hash")
    if commitments.get("route_assembly_witness_hash"):
        present.add("route_assembly_witness_hash")
    missing = sorted(ROUTE_LOCK_REQUIREMENTS - present)

    if missing or floor == "block":
        decision = "route_lock_blocked"
    elif floor == "escalate":
        decision = "route_lock_escalates"
    elif floor == "waiver_required":
        decision = "route_lock_requires_waiver"
    elif floor == "waived":
        decision = "route_locked_with_recorded_waiver"
    else:
        decision = "route_locked"

    return ApiResponse(
        action="sellerCommitRoute",
        trade_id=scenario.scenario_id,
        decision=decision,
        currency_integrity=currency_integrity(scenario, walls),
        memory=memory_currencies(scenario),
        spendability={
            "gate": "route_commitment",
            "required": sorted(ROUTE_LOCK_REQUIREMENTS),
            "present": sorted(present),
            "missing": missing,
        },
        walls=wall_dicts(walls),
        enforced_facts=enforced,
        legible_evidence=legible,
        judgment_needed=judged,
        packets_required=sorted(set(missing) | set(packets_required_from_walls(walls))),
        packets_to_generate=["BuyerRiskAcceptance"]
        if floor == "waiver_required"
        else (["EvidenceSpendability"] if "route_spendability_hash" in missing else []),
        packet_commitments=commitments,
        human_question_if_any=(
            "Does the buyer accept the named unresolved risk before route lock?"
            if floor == "waiver_required"
            else ""
        ),
    )


def open_claim(scenario: Scenario) -> ApiResponse:
    walls = evaluate_walls(scenario)
    enforced, legible, judged = classify_wall_facts(walls)
    matrix = [wall for wall in walls if wall.wall_id == "ClaimClosureEvidenceMatrix"][0]
    if matrix.outcome == "escalate":
        decision = "escalate_with_matrix_row"
    elif matrix.outcome == "pass" and scenario.claim_evidence:
        decision = "claim_packet_complete"
    else:
        decision = "no_claim_opened"

    return ApiResponse(
        action="openClaim",
        trade_id=scenario.scenario_id,
        decision=decision,
        currency_integrity=currency_integrity(scenario, walls),
        memory=memory_currencies(scenario),
        spendability={
            "gate": "claim_support",
            "required": ["ClaimClosureEvidenceMatrix"],
            "present": ["ClaimClosureEvidenceMatrix"],
            "missing": matrix.missing,
        },
        walls=wall_dicts(walls),
        enforced_facts=enforced,
        legible_evidence=legible,
        judgment_needed=judged,
        packets_required=matrix.missing,
        packets_to_generate=["ClaimPacket"] if scenario.claim_evidence else [],
        packet_commitments=packet_commitments(scenario, walls),
        human_question_if_any="Should the claim escalate under the named matrix row?" if matrix.outcome == "escalate" else "",
    )


def human_question_for_decision(decision: str) -> str:
    if decision in {"blocked_until_waiver", "accept_with_waiver", "continue_with_recorded_waiver"}:
        return "Does the buyer accept the named unresolved risk and claim consequences?"
    if decision == "request_more_evidence":
        return "Does the buyer want to spend seller attention for stronger evidence?"
    if decision == "escalate_with_matrix_row":
        return "Should the arbiter review the named missing evidence row?"
    return ""
