#!/usr/bin/env python3
"""Probe the Marketplace agent API facade against wall scenarios."""

from __future__ import annotations

import argparse
import copy
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from protocol_agent_api import (
    accept_offer_and_fund_escrow,
    evaluate_offer,
    open_claim,
    seller_commit_route,
)
from protocol_wall_pressure_sim import VARIANTS, scenarios


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"


def route_ready_clone() -> Any:
    scenario = copy.deepcopy([item for item in scenarios() if item.scenario_id == "full_wall_compliant_offer"][0])
    scenario.scenario_id = "route_ready_offer"
    scenario.hard_packets.add("assembly_history_hash")
    scenario.hard_packets.add("route_spendability_hash")
    return scenario


def route_spendability_without_assembly_clone() -> Any:
    scenario = copy.deepcopy([item for item in scenarios() if item.scenario_id == "full_wall_compliant_offer"][0])
    scenario.scenario_id = "route_spendability_without_assembly"
    scenario.hard_packets.add("route_spendability_hash")
    scenario.hard_packets.discard("assembly_history_hash")
    return scenario


def route_ready_with_proof_scope_block() -> Any:
    scenario = route_ready_clone()
    scenario.scenario_id = "route_ready_with_proof_scope_block"
    scenario.proof_not_claiming = set(scenario.proof_not_claiming) - {"authenticity"}
    return scenario


def route_ready_with_card_reference_block() -> Any:
    scenario = route_ready_clone()
    scenario.scenario_id = "route_ready_with_card_reference_block"
    scenario.card_reference = scenario.card_reference | {"not_claiming": ["price_truth"]}
    return scenario


def route_ready_with_bond_waiver_required() -> Any:
    scenario = route_ready_clone()
    scenario.scenario_id = "route_ready_with_bond_waiver_required"
    scenario.bond_covered_failures = set(scenario.bond_covered_failures) - {"route_negligence"}
    return scenario


def outside_scope_clone() -> Any:
    scenario = copy.deepcopy([item for item in scenarios() if item.scenario_id == "outside_scope_magic_card"][0])
    scenario.scenario_id = "api_outside_scope_magic_card"
    return scenario


def run_probe() -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    counters: Counter[str] = Counter()
    normal_accept_with_waiver = 0
    trajectory_overclaim_accepted = 0
    route_lock_without_spendability = 0
    route_lock_over_active_wall = 0
    generic_claim_escalation = 0
    missing_packet_commitment_refs = 0
    fundable_without_wall_bundle = 0
    route_locked_without_route_spendability_packet = 0
    route_locked_without_route_assembly_witness = 0
    route_locked_without_assembly_history = 0
    route_spendability_without_assembly_accepted = 0
    outside_alpha_scope_accepted = 0

    for scenario in scenarios():
        for variant in VARIANTS:
            response = evaluate_offer(scenario, variant).to_dict()
            counters[response["decision"]] += 1
            if response["decision"] == "accept_or_continue" and response["currency_integrity"]["waived_ambiguity"]:
                normal_accept_with_waiver += 1
            if response["decision"] in {"accept_or_continue", "accept_with_waiver"} and response["currency_integrity"][
                "trajectory_overclaims"
            ]:
                trajectory_overclaim_accepted += 1
            if not response["packet_commitments"]["placement_integrity"]["complete"]:
                missing_packet_commitment_refs += 1
            rows.append(response)

    for scenario in [
        scenarios()[2],
        route_spendability_without_assembly_clone(),
        route_ready_clone(),
        route_ready_with_proof_scope_block(),
        route_ready_with_card_reference_block(),
        route_ready_with_bond_waiver_required(),
    ]:
        response = seller_commit_route(scenario).to_dict()
        counters[response["decision"]] += 1
        if response["decision"] == "route_locked" and "route_spendability_hash" in response["spendability"]["missing"]:
            route_lock_without_spendability += 1
        if response["decision"] in {"route_locked", "route_locked_with_recorded_waiver"}:
            active_bad_walls = [
                wall
                for wall in response["walls"]
                if wall["outcome"] in {"block", "waiver_required", "escalate"}
            ]
            route_lock_over_active_wall += len(active_bad_walls)
        if response["decision"] == "route_locked" and not response["packet_commitments"]["route_spendability_hash"]:
            route_locked_without_route_spendability_packet += 1
        if response["decision"] == "route_locked" and not response["packet_commitments"]["route_assembly_witness_hash"]:
            route_locked_without_route_assembly_witness += 1
        if response["decision"] == "route_locked" and not response["packet_commitments"]["assembly_history_hash"]:
            route_locked_without_assembly_history += 1
        if (
            scenario.scenario_id == "route_spendability_without_assembly"
            and response["decision"] != "route_lock_blocked"
        ):
            route_spendability_without_assembly_accepted += 1
        expected_missing_assembly_falsifier = (
            scenario.scenario_id == "route_spendability_without_assembly"
            and response["decision"] == "route_lock_blocked"
        )
        if not response["packet_commitments"]["placement_integrity"]["complete"] and not expected_missing_assembly_falsifier:
            missing_packet_commitment_refs += 1
        rows.append(response)

    for scenario in scenarios():
        response = open_claim(scenario).to_dict()
        counters[response["decision"]] += 1
        if response["decision"] == "escalate" and not response["packets_required"]:
            generic_claim_escalation += 1
        if not response["packet_commitments"]["placement_integrity"]["complete"]:
            missing_packet_commitment_refs += 1
        rows.append(response)

    fundable = accept_offer_and_fund_escrow(route_ready_clone(), "convenience_first_buyer").to_dict()
    counters[fundable["decision"]] += 1
    if fundable["decision"] in {"escrow_fundable", "accept_with_recorded_waiver"} and not fundable["packet_commitments"][
        "wall_bundle_hash"
    ]:
        fundable_without_wall_bundle += 1
    if not fundable["packet_commitments"]["placement_integrity"]["complete"]:
        missing_packet_commitment_refs += 1
    rows.append(fundable)

    outside_scope = evaluate_offer(outside_scope_clone(), "convenience_first_buyer").to_dict()
    counters[outside_scope["decision"]] += 1
    if outside_scope["decision"] != "blocked":
        outside_alpha_scope_accepted += 1
    rows.append(outside_scope)

    passed = (
        normal_accept_with_waiver == 0
        and trajectory_overclaim_accepted == 0
        and route_lock_without_spendability == 0
        and route_lock_over_active_wall == 0
        and generic_claim_escalation == 0
        and missing_packet_commitment_refs == 0
        and fundable_without_wall_bundle == 0
        and route_locked_without_route_spendability_packet == 0
        and route_locked_without_route_assembly_witness == 0
        and route_locked_without_assembly_history == 0
        and route_spendability_without_assembly_accepted == 0
        and outside_alpha_scope_accepted == 0
    )

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "pass": passed,
        "decision_counts": dict(sorted(counters.items())),
        "normal_accept_with_waiver": normal_accept_with_waiver,
        "trajectory_overclaim_accepted": trajectory_overclaim_accepted,
        "route_lock_without_spendability": route_lock_without_spendability,
        "route_lock_over_active_wall": route_lock_over_active_wall,
        "generic_claim_escalation": generic_claim_escalation,
        "missing_packet_commitment_refs": missing_packet_commitment_refs,
        "fundable_without_wall_bundle": fundable_without_wall_bundle,
        "route_locked_without_route_spendability_packet": route_locked_without_route_spendability_packet,
        "route_locked_without_route_assembly_witness": route_locked_without_route_assembly_witness,
        "route_locked_without_assembly_history": route_locked_without_assembly_history,
        "route_spendability_without_assembly_accepted": route_spendability_without_assembly_accepted,
        "outside_alpha_scope_accepted": outside_alpha_scope_accepted,
        "rows": rows,
    }


def report_lines(summary: dict[str, Any]) -> list[str]:
    lines = [
        f"# Protocol Agent API Probe: {summary['generated_at']}",
        "",
        "## Result",
        "",
        f"- Pass: `{summary['pass']}`",
        f"- Normal accept with waiver: `{summary['normal_accept_with_waiver']}`",
        f"- Trajectory overclaim accepted: `{summary['trajectory_overclaim_accepted']}`",
        f"- Route lock without spendability: `{summary['route_lock_without_spendability']}`",
        f"- Route lock over active wall: `{summary['route_lock_over_active_wall']}`",
        f"- Generic claim escalation: `{summary['generic_claim_escalation']}`",
        f"- Missing packet commitment refs: `{summary['missing_packet_commitment_refs']}`",
        f"- Fundable without wall bundle: `{summary['fundable_without_wall_bundle']}`",
        f"- Route locked without route spendability packet: `{summary['route_locked_without_route_spendability_packet']}`",
        f"- Route locked without route assembly witness: `{summary['route_locked_without_route_assembly_witness']}`",
        f"- Route locked without assembly history: `{summary['route_locked_without_assembly_history']}`",
        f"- Route spendability without assembly accepted: `{summary['route_spendability_without_assembly_accepted']}`",
        f"- Outside alpha scope accepted: `{summary['outside_alpha_scope_accepted']}`",
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
            "The API keeps trajectory capacity and assembly placement separate. Seller proof can enter as trust weight, but action gates require situated packets. Waived ambiguity remains visible in the action decision, route lock requires assembly history, route spendability, and a route wall-bundle EVM hash, claim escalation names missing matrix evidence, outside-alpha trades block, and fundable/route-lockable states carry canonical packet commitments.",
        ]
    )
    return lines


def main() -> None:
    parser = argparse.ArgumentParser(description="Run agent API probe.")
    parser.add_argument("--out-dir", type=Path, default=None)
    args = parser.parse_args()

    summary = run_probe()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = args.out_dir or (RUNS / f"protocol_agent_api_probe_{stamp}")
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    (run_dir / "REPORT.md").write_text("\n".join(report_lines(summary)) + "\n")
    print(run_dir)
    print(
        json.dumps(
            {
                "pass": summary["pass"],
                "normal_accept_with_waiver": summary["normal_accept_with_waiver"],
                "trajectory_overclaim_accepted": summary["trajectory_overclaim_accepted"],
                "route_lock_without_spendability": summary["route_lock_without_spendability"],
                "route_lock_over_active_wall": summary["route_lock_over_active_wall"],
                "generic_claim_escalation": summary["generic_claim_escalation"],
                "missing_packet_commitment_refs": summary["missing_packet_commitment_refs"],
                "fundable_without_wall_bundle": summary["fundable_without_wall_bundle"],
                "route_locked_without_route_spendability_packet": summary[
                    "route_locked_without_route_spendability_packet"
                ],
                "route_locked_without_route_assembly_witness": summary["route_locked_without_route_assembly_witness"],
                "route_locked_without_assembly_history": summary["route_locked_without_assembly_history"],
                "route_spendability_without_assembly_accepted": summary[
                    "route_spendability_without_assembly_accepted"
                ],
                "outside_alpha_scope_accepted": summary["outside_alpha_scope_accepted"],
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
