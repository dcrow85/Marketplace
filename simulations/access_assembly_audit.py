#!/usr/bin/env python3
"""Access-assembly audit for the Marketplace protocol harness.

This probe makes `Marketplace_Access_Assembly_Note.md` executable. It checks
that remembered trajectory capacity can inform agents without becoming spendable
at trade gates unless situated assembly placement exists.
"""

from __future__ import annotations

import argparse
import copy
import json
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from protocol_agent_api import (
    accept_offer_and_fund_escrow,
    evaluate_offer,
    open_claim,
    seller_commit_route,
)
from protocol_wall_packets import packet_commitments
from protocol_wall_pressure_sim import (
    HARD_ACCEPTANCE_PACKETS,
    Scenario,
    evaluate_walls,
    scenarios,
)


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"

ACCESS_VARIABLES = [
    "CardReferenceCandidate",
    "item_fingerprint_hash",
    "inventory_lock_hash",
    "proof_vector_scope_packet",
    "bond_scope_packet",
    "route_insurance_risk_owner_packet",
    "arbiter_policy_hash",
    "BuyerRiskAcceptance",
    "assembly_history_hash",
    "wall_bundle_hash",
    "route_spendability_hash",
    "routeAssemblyWitnessHash",
]

GATE_REQUIREMENTS = {
    "offer_evaluation": {
        "CardReferenceCandidate",
        "proof_vector_scope_packet",
        "bond_scope_packet",
        "route_insurance_risk_owner_packet",
        "arbiter_policy_hash",
    },
    "funding": set(HARD_ACCEPTANCE_PACKETS) | {"wall_bundle_hash"},
    "route_commitment": {
        "item_fingerprint_hash",
        "inventory_lock_hash",
        "assembly_history_hash",
        "route_insurance_risk_owner_packet",
        "wall_bundle_hash",
        "route_spendability_hash",
        "routeAssemblyWitnessHash",
    },
    "claim_opening": {"ClaimClosureEvidenceMatrix"},
    "bond_action": {"bond_scope_packet", "arbiter_policy_hash", "ClaimClosureEvidenceMatrix"},
}


@dataclass(frozen=True)
class GateCase:
    case_id: str
    gate: str
    scenario: Scenario
    expected_floor: str
    runner: Callable[[Scenario], dict[str, Any]]


def scenario_by_id(scenario_id: str) -> Scenario:
    for scenario in scenarios():
        if scenario.scenario_id == scenario_id:
            return copy.deepcopy(scenario)
    raise KeyError(scenario_id)


def route_ready_clone() -> Scenario:
    scenario = scenario_by_id("full_wall_compliant_offer")
    scenario.scenario_id = "access_route_ready_offer"
    scenario.hard_packets.add("assembly_history_hash")
    scenario.hard_packets.add("route_spendability_hash")
    return scenario


def spendability_without_assembly_clone() -> Scenario:
    scenario = scenario_by_id("full_wall_compliant_offer")
    scenario.scenario_id = "access_route_spendability_without_assembly"
    scenario.hard_packets.add("route_spendability_hash")
    scenario.hard_packets.discard("assembly_history_hash")
    return scenario


def observed_floor_from_decision(gate: str, decision: str) -> str:
    if gate == "offer_evaluation":
        if decision in {"blocked", "request_more_evidence"}:
            return "block"
        if decision in {
            "blocked_until_waiver",
            "accept_with_waiver",
            "continue_with_recorded_waiver",
            "revise_offer_or_request_waiver",
            "request_policy_waiver_or_block",
        }:
            return "waiver_required"
        if decision == "escalate_with_matrix_row":
            return "escalate"
        return "pass"
    if gate == "funding":
        if decision == "escrow_fundable":
            return "pass"
        if decision == "accept_with_recorded_waiver":
            return "waiver_required"
        return "block"
    if gate == "route_commitment":
        if decision == "route_locked":
            return "pass"
        if decision in {"route_lock_requires_waiver", "route_locked_with_recorded_waiver"}:
            return "waiver_required"
        if decision == "route_lock_escalates":
            return "escalate"
        return "block"
    if gate == "claim_opening":
        if decision == "escalate_with_matrix_row":
            return "escalate"
        return "pass"
    if gate == "bond_action":
        return decision
    raise ValueError(gate)


def route_spendability_inherits_assembly(commitments: dict[str, Any]) -> bool:
    packets = commitments.get("packets", {})
    route_spendability = packets.get("route_spendability", {}).get("payload", {})
    return bool(
        commitments.get("assembly_history_hash")
        and route_spendability.get("assembly_history_hash") == commitments.get("assembly_history_hash")
    )


def access_placements(scenario: Scenario) -> set[str]:
    placements = set(scenario.hard_packets) - {"assembly_history_hash", "route_spendability_hash"}
    if "card_reference_packet" in placements:
        placements.add("CardReferenceCandidate")
    if scenario.buyer_risk_acceptance:
        placements.add("BuyerRiskAcceptance")
    if scenario.claim_evidence:
        placements.add("ClaimClosureEvidenceMatrix")

    commitments = packet_commitments(scenario, evaluate_walls(scenario))
    placement_complete = commitments.get("placement_integrity", {}).get("complete", False)
    if scenario.hard_packets and placement_complete and commitments.get("wall_bundle_hash"):
        placements.add("wall_bundle_hash")
    if placement_complete and commitments.get("assembly_history_hash"):
        placements.add("assembly_history_hash")
    if (
        placement_complete
        and commitments.get("route_spendability_hash")
        and route_spendability_inherits_assembly(commitments)
    ):
        placements.add("route_spendability_hash")
    if (
        placement_complete
        and commitments.get("route_spendability_hash")
        and route_spendability_inherits_assembly(commitments)
        and commitments.get("route_assembly_witness_hash")
    ):
        placements.add("routeAssemblyWitnessHash")
    return placements


def terminal_floor_from_walls(scenario: Scenario) -> str:
    outcomes = {wall.outcome for wall in evaluate_walls(scenario)}
    if "block" in outcomes:
        return "block"
    if "escalate" in outcomes:
        return "escalate"
    if "waiver_required" in outcomes or "waived" in outcomes:
        return "waiver_required"
    return "pass"


def run_offer(scenario: Scenario) -> dict[str, Any]:
    response = evaluate_offer(scenario, "convenience_first_buyer").to_dict()
    response["observed_floor"] = observed_floor_from_decision("offer_evaluation", response["decision"])
    return response


def run_funding(scenario: Scenario) -> dict[str, Any]:
    response = accept_offer_and_fund_escrow(scenario, "convenience_first_buyer").to_dict()
    response["observed_floor"] = observed_floor_from_decision("funding", response["decision"])
    return response


def run_route(scenario: Scenario) -> dict[str, Any]:
    response = seller_commit_route(scenario).to_dict()
    response["observed_floor"] = observed_floor_from_decision("route_commitment", response["decision"])
    return response


def run_claim(scenario: Scenario) -> dict[str, Any]:
    response = open_claim(scenario).to_dict()
    response["observed_floor"] = observed_floor_from_decision("claim_opening", response["decision"])
    return response


def run_bond_action(scenario: Scenario) -> dict[str, Any]:
    walls = evaluate_walls(scenario)
    matrix = next(wall for wall in walls if wall.wall_id == "ClaimClosureEvidenceMatrix")
    bond = next(wall for wall in walls if wall.wall_id == "BondScope")
    policy_present = "arbiter_policy_hash" in scenario.hard_packets

    if not scenario.claim_evidence:
        decision = "block"
        missing = ["ClaimClosureEvidenceMatrix"]
    elif bond.outcome == "block" or not policy_present:
        decision = "block"
        missing = sorted(set(bond.missing) | (set() if policy_present else {"arbiter_policy_hash"}))
    elif matrix.outcome == "escalate":
        decision = "escalate"
        missing = matrix.missing
    else:
        decision = "escalate"
        missing = ["arbiter_ruling_packet"]

    return {
        "action": "bondAction",
        "trade_id": scenario.scenario_id,
        "decision": decision,
        "observed_floor": observed_floor_from_decision("bond_action", decision),
        "walls": [
            {
                "wall_id": wall.wall_id,
                "outcome": wall.outcome,
                "label": wall.label,
                "missing": wall.missing,
                "notes": wall.notes,
            }
            for wall in walls
        ],
        "packets_required": missing,
        "packet_commitments": packet_commitments(scenario, walls),
    }


def gate_cases() -> list[GateCase]:
    trajectory_only = scenario_by_id("original_offer")
    waived = scenario_by_id("scoped_offer_with_buyer_waiver")
    compliant = scenario_by_id("full_wall_compliant_offer")
    adversarial = scenario_by_id("adversarial_hash_compliant_offer")
    claim_missing = scenario_by_id("claim_closure_missing_buyer_evidence")
    claim_complete = scenario_by_id("claim_closure_with_required_evidence")
    route_ready = route_ready_clone()
    spendability_without_assembly = spendability_without_assembly_clone()

    return [
        GateCase("trajectory_only_offer", "offer_evaluation", trajectory_only, "block", run_offer),
        GateCase("waived_offer", "offer_evaluation", waived, "waiver_required", run_offer),
        GateCase("compliant_offer", "offer_evaluation", compliant, "pass", run_offer),
        GateCase("adversarial_offer", "offer_evaluation", adversarial, "block", run_offer),
        GateCase("trajectory_only_funding", "funding", trajectory_only, "block", run_funding),
        GateCase("waived_funding", "funding", waived, "waiver_required", run_funding),
        GateCase("compliant_funding", "funding", compliant, "pass", run_funding),
        GateCase("trajectory_only_route", "route_commitment", trajectory_only, "block", run_route),
        GateCase("compliant_route_without_spendability", "route_commitment", compliant, "block", run_route),
        GateCase("route_spendability_without_assembly", "route_commitment", spendability_without_assembly, "block", run_route),
        GateCase("route_ready", "route_commitment", route_ready, "pass", run_route),
        GateCase("claim_missing_buyer_evidence", "claim_opening", claim_missing, "escalate", run_claim),
        GateCase("claim_complete", "claim_opening", claim_complete, "pass", run_claim),
        GateCase("bond_missing_buyer_evidence", "bond_action", claim_missing, "escalate", run_bond_action),
        GateCase("bond_complete_claim_still_needs_ruling", "bond_action", claim_complete, "escalate", run_bond_action),
    ]


def gate_row(case: GateCase) -> dict[str, Any]:
    scenario = copy.deepcopy(case.scenario)
    placements = access_placements(scenario)
    required = GATE_REQUIREMENTS[case.gate]
    response = case.runner(scenario)
    observed_floor = response["observed_floor"]
    commitments = response.get("packet_commitments", {})
    route_witness_ok = bool(
        commitments.get("wall_bundle_hash")
        and commitments.get("assembly_history_hash")
        and commitments.get("route_spendability_hash")
        and commitments.get("route_assembly_witness_hash")
        and route_spendability_inherits_assembly(commitments)
    )
    if case.gate != "route_commitment":
        route_witness_ok = True

    hard_missing = sorted(required - placements)
    waiver_bearing = sorted(
        {
            item
            for wall in evaluate_walls(scenario)
            if wall.outcome in {"waived", "waiver_required"}
            for item in wall.missing
        }
    )
    trajectory_capacity = sorted(scenario.proof_positive_claims)
    wall_floor = terminal_floor_from_walls(scenario)

    return {
        "case_id": case.case_id,
        "trade_id": scenario.scenario_id,
        "gate": case.gate,
        "trajectory_capacity_present": trajectory_capacity,
        "assembly_placement_present": sorted(placements & set(ACCESS_VARIABLES)),
        "hard_missing_access_variables": hard_missing,
        "waiver_bearing_variables": waiver_bearing,
        "predicted_terminal_floor": case.expected_floor,
        "wall_floor": wall_floor,
        "observed_terminal_floor": observed_floor,
        "validator_replay_agrees": observed_floor == case.expected_floor,
        "route_witness_agrees": route_witness_ok,
        "decision": response["decision"],
        "packets_required": response.get("packets_required", []),
        "trajectory_overclaims": response.get("currency_integrity", {}).get("trajectory_overclaims", []),
    }


def run_audit() -> dict[str, Any]:
    rows = [gate_row(case) for case in gate_cases()]
    counters = Counter(row["observed_terminal_floor"] for row in rows)

    no_route_lock_from_trajectory_capacity_alone = not any(
        row["case_id"] == "trajectory_only_route" and row["observed_terminal_floor"] == "pass" for row in rows
    )
    no_ordinary_accept_when_unresolved_ambiguity_waived = not any(
        row["waiver_bearing_variables"] and row["observed_terminal_floor"] == "pass" for row in rows
    )
    no_claim_escalation_without_named_matrix_row = not any(
        row["gate"] in {"claim_opening", "bond_action"}
        and row["observed_terminal_floor"] == "escalate"
        and not row["packets_required"]
        for row in rows
    )
    no_route_lock_without_wall_bundle_spendability_witness = not any(
        row["gate"] == "route_commitment"
        and row["observed_terminal_floor"] == "pass"
        and not row["route_witness_agrees"]
        for row in rows
    )
    no_route_spendability_without_assembly_provenance = not any(
        row["case_id"] == "route_spendability_without_assembly" and row["observed_terminal_floor"] == "pass"
        for row in rows
    )
    no_evidence_promoted_beyond_not_claiming = not any(
        row["trajectory_overclaims"] and row["observed_terminal_floor"] != "block" for row in rows
    )
    validator_replay_agrees = all(row["validator_replay_agrees"] for row in rows)

    passed = all(
        [
            validator_replay_agrees,
            no_route_lock_from_trajectory_capacity_alone,
            no_ordinary_accept_when_unresolved_ambiguity_waived,
            no_claim_escalation_without_named_matrix_row,
            no_route_lock_without_wall_bundle_spendability_witness,
            no_route_spendability_without_assembly_provenance,
            no_evidence_promoted_beyond_not_claiming,
        ]
    )

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "pass": passed,
        "case_count": len(rows),
        "terminal_floor_counts": dict(sorted(counters.items())),
        "validator_replay_agrees": validator_replay_agrees,
        "no_route_lock_from_trajectory_capacity_alone": no_route_lock_from_trajectory_capacity_alone,
        "no_ordinary_accept_when_unresolved_ambiguity_waived": no_ordinary_accept_when_unresolved_ambiguity_waived,
        "no_claim_escalation_without_named_matrix_row": no_claim_escalation_without_named_matrix_row,
        "no_route_lock_without_wall_bundle_spendability_witness": no_route_lock_without_wall_bundle_spendability_witness,
        "no_route_spendability_without_assembly_provenance": no_route_spendability_without_assembly_provenance,
        "no_evidence_promoted_beyond_not_claiming": no_evidence_promoted_beyond_not_claiming,
        "rows": rows,
    }


def report_lines(summary: dict[str, Any]) -> list[str]:
    lines = [
        f"# Marketplace Access-Assembly Audit: {summary['generated_at']}",
        "",
        "## Result",
        "",
        f"- Pass: `{summary['pass']}`",
        f"- Cases: `{summary['case_count']}`",
        f"- Validator replay agrees: `{summary['validator_replay_agrees']}`",
        f"- No route lock from trajectory capacity alone: `{summary['no_route_lock_from_trajectory_capacity_alone']}`",
        f"- No ordinary accept when unresolved ambiguity is waived: `{summary['no_ordinary_accept_when_unresolved_ambiguity_waived']}`",
        f"- No claim escalation without named matrix row: `{summary['no_claim_escalation_without_named_matrix_row']}`",
        f"- No route lock without wall bundle, spendability, and typed witness: `{summary['no_route_lock_without_wall_bundle_spendability_witness']}`",
        f"- No route spendability without assembly provenance: `{summary['no_route_spendability_without_assembly_provenance']}`",
        f"- No evidence promoted beyond not-claiming boundary: `{summary['no_evidence_promoted_beyond_not_claiming']}`",
        "",
        "Terminal floor counts:",
        "",
    ]
    for floor, count in summary["terminal_floor_counts"].items():
        lines.append(f"- `{floor}`: `{count}`")

    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            "The audit treats seller history and proof vectors as trajectory capacity. They can inform agent judgment, but they do not move offer, funding, route, claim, or bond gates without gate-specific assembly placement. Waivers remain visible as `waiver_required`, route lock needs wall bundle plus assembly provenance plus route spendability plus typed route witness, and disputed closure remains policy-bound instead of improvised.",
            "",
            "## Gate Rows",
            "",
        ]
    )

    for row in summary["rows"]:
        lines.extend(
            [
                f"### {row['case_id']}",
                "",
                f"- Gate: `{row['gate']}`",
                f"- Decision: `{row['decision']}`",
                f"- Predicted floor: `{row['predicted_terminal_floor']}`",
                f"- Observed floor: `{row['observed_terminal_floor']}`",
                f"- Validator agrees: `{row['validator_replay_agrees']}`",
                f"- Trajectory capacity: `{', '.join(row['trajectory_capacity_present']) or 'none'}`",
                f"- Assembly placement: `{', '.join(row['assembly_placement_present']) or 'none'}`",
                f"- Hard missing variables: `{', '.join(row['hard_missing_access_variables']) or 'none'}`",
                f"- Waiver-bearing variables: `{', '.join(row['waiver_bearing_variables']) or 'none'}`",
                "",
            ]
        )
    return lines


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Marketplace access-assembly audit.")
    parser.add_argument("--out-dir", type=Path, default=None)
    args = parser.parse_args()

    summary = run_audit()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = args.out_dir or (RUNS / f"access_assembly_audit_{stamp}")
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    (run_dir / "REPORT.md").write_text("\n".join(report_lines(summary)) + "\n")
    print(run_dir)
    print(
        json.dumps(
            {
                "pass": summary["pass"],
                "case_count": summary["case_count"],
                "validator_replay_agrees": summary["validator_replay_agrees"],
                "terminal_floor_counts": summary["terminal_floor_counts"],
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
