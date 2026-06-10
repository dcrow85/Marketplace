#!/usr/bin/env python3
"""Unified stress runner for the Pokemon alpha protocol.

This stitches together the existing layers:

- agent market simulation: varied buyer/seller/verifier/arbiter behavior
- protocol wall checks: deterministic boundaries under different agent prompts
- packet commitments: wall bundle, route spendability, EVM-adjacent hashes
- optional Anvil replay: a varied eligible subset through MarketplaceEscrow

The goal is not to replay 250 trades on-chain. The goal is to let many
agent-shaped trades press against the walls, then send a smaller route-ready
sample through the money rail.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from protocol_agent_market_sim import (
    FORCED_OUTCOMES,
    generate_trade,
    make_plan,
    resolve_trade,
    summarize as summarize_agent_market,
)
from protocol_wall_packets import evm_bytes32_ref, packet_commitments
from protocol_wall_pressure_sim import (
    CLAIM_MATRIX,
    CORE_BOND_FAILURES,
    DEFAULT_RAW_500_2000_EVIDENCE,
    HARD_ACCEPTANCE_PACKETS,
    REQUIRED_CARD_REFERENCE_NOT_CLAIMING,
    REQUIRED_PROOF_NOT_CLAIMING,
    Scenario,
    evaluate_walls,
    risk_acceptance_packet,
    variant_decision,
)


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"
CHAIN = ROOT / "chain"

AGENT_VARIANTS = [
    "strict_boundary_buyer",
    "convenience_first_buyer",
    "seller_friendly_market_maker",
    "adversarial_seller",
    "arbiter_policy_agent",
]

ATTACKS = [
    "full_compliant",
    "sparse_evidence_with_waiver",
    "sparse_evidence_no_waiver",
    "scope_laundering",
    "unassigned_insurance_gap",
    "missing_inventory_lock",
    "missing_route_spendability",
    "spendability_missing_wall_ref",
    "stale_wall_bundle_ref",
    "missing_external_availability",
    "claim_missing_buyer_arrival",
    "outside_scope_magic",
    "bond_gap",
    "manual_database_gap",
]

ROUTE_BLOCKING_WALLS = {
    "POKEMON_ALPHA_SCOPE",
    "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000",
    "CardReferenceCandidate",
    "BuyerRiskAcceptance",
    "BondScope",
    "ProofVectorScope",
    "RouteInsuranceRiskOwner",
    "ExternalAvailabilityCovenant",
}


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def jsonable(value: Any) -> Any:
    if isinstance(value, set):
        return sorted(value)
    if isinstance(value, dict):
        return {key: jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [jsonable(item) for item in value]
    if isinstance(value, tuple):
        return [jsonable(item) for item in value]
    return value


def exact_card_reference(trade: dict[str, Any]) -> dict[str, Any]:
    return {
        "source": "PokemonTCG.io",
        "source_url": "https://images.pokemontcg.io/",
        "source_language": "en",
        "source_card_id": f"fixture:{trade['card'].lower().replace(' ', '-')}",
        "printed_name": trade["card"],
        "set_name": "fixture vintage set",
        "card_number": "fixture",
        "match_kind": "exact_catalog_match",
        "source_coverage": "catalog_reference_only",
        "selected_by": "buyer_agent",
        "not_claiming": sorted(REQUIRED_CARD_REFERENCE_NOT_CLAIMING),
    }


def manual_gap_reference(trade: dict[str, Any]) -> dict[str, Any]:
    reference = exact_card_reference(trade)
    reference.pop("source_card_id", None)
    reference.update(
        {
            "match_kind": "manual_database_gap",
            "manual_reference_reason": "odd Japanese vintage variant not cleanly represented in catalog fixture",
            "human_or_agent_note": "treat as a buyer-visible database gap, not proof of identity",
        }
    )
    return reference


def route_packet_for(trade: dict[str, Any], attack: str) -> dict[str, Any]:
    insurance_amount = int(trade.get("insurance_amount") or 0)
    declared_value = int(trade["value"])
    if attack == "unassigned_insurance_gap":
        insurance_amount = min(insurance_amount, max(0, declared_value - 1))
        risk_owner = ""
    elif insurance_amount < declared_value:
        risk_owner = "buyer_accepted_gap" if trade.get("buyer_risk_tolerance", 0) >= 0.55 else "seller"
    else:
        risk_owner = "carrier_or_seller_until_delivery"

    return {
        "route_type": trade["route"],
        "carrier_or_handoff_method": "local_memo" if trade["route"] in {"local_meetup", "show_pickup"} else "carrier_tracking",
        "declared_value": declared_value,
        "insurance_amount": insurance_amount,
        "signature_required": declared_value >= 250 or trade["route"] == "international_ship",
        "ship_by": "fixture:48h_after_route_lock",
        "risk_owner_for_gap": risk_owner,
        "accepted_by_buyer": attack != "route_not_accepted",
        "accepted_by_seller": True,
    }


def evidence_for(trade: dict[str, Any], attack: str) -> set[str]:
    if attack in {"sparse_evidence_with_waiver", "sparse_evidence_no_waiver"}:
        return {
            "front_full",
            "back_full",
            "flaw_callouts",
            "seller_condition_statement",
        }
    if trade["evidence_tier"] == "light":
        return {"front_full", "back_full", "seller_condition_statement"}
    if trade["evidence_tier"] == "standard":
        return {
            "fresh_nonce_possession",
            "front_full",
            "back_full",
            "flaw_callouts",
            "seller_condition_statement",
        }
    return set(DEFAULT_RAW_500_2000_EVIDENCE)


def claim_type_for(outcome: str) -> str | None:
    if outcome in {"wrong_card", "authenticity_flag"}:
        return "wrong_item"
    if outcome in {"minor_condition_delta", "material_misdescription"}:
        return "condition_downgrade"
    if outcome in {"seller_nonship"}:
        return "late_shipment"
    if outcome in {"insured_lost", "insured_damaged", "porch_theft"}:
        return "empty_package"
    if outcome in {"uninsured_lost", "underinsured_lost"}:
        return "underinsured_loss"
    if outcome == "local_handoff_dispute":
        return "wrong_item"
    return None


def claim_evidence_for(outcome: str, attack: str) -> dict[str, dict[str, set[str]]]:
    claim_type = claim_type_for(outcome)
    if not claim_type:
        return {}
    row = CLAIM_MATRIX[claim_type]
    buyer = set(row["buyer"])
    if attack == "claim_missing_buyer_arrival":
        buyer = set()
    return {
        claim_type: {
            "seller": set(row["seller"]),
            "buyer": buyer,
            "route": set(row["route"]),
        }
    }


def hard_packets_for(attack: str) -> set[str]:
    hard_packets = set(HARD_ACCEPTANCE_PACKETS)
    hard_packets.add("route_spendability_hash")
    if attack == "missing_inventory_lock":
        hard_packets.discard("inventory_lock_hash")
    if attack == "missing_route_spendability":
        hard_packets.discard("route_spendability_hash")
    if attack == "missing_bond_scope":
        hard_packets.discard("bond_scope_packet")
    return hard_packets


def buyer_risk_for(trade: dict[str, Any], seller_evidence: set[str], attack: str) -> dict[str, Any] | None:
    missing = set(DEFAULT_RAW_500_2000_EVIDENCE) - seller_evidence
    waivers = set()
    if attack == "sparse_evidence_with_waiver":
        waivers.update(missing)
        waivers.add("external_availability_covenant")
    if attack == "manual_database_gap":
        waivers.add("database_gap_reference")
    if not waivers:
        return None
    allowed = {
        "fresh_nonce_possession",
        "four_corner_closeups",
        "edge_or_border_closeups",
        "surface_or_holo_angle",
        "external_availability_covenant",
    }
    allowed_waivers = waivers & allowed
    if not allowed_waivers:
        return None
    return risk_acceptance_packet(*sorted(allowed_waivers))


def scenario_for(record: dict[str, Any], attack: str) -> Scenario:
    trade = record["trade"]
    seller_evidence = evidence_for(trade, attack)
    hard_packets = hard_packets_for(attack)
    proof_not_claiming = set(REQUIRED_PROOF_NOT_CLAIMING)
    if attack == "scope_laundering":
        proof_not_claiming.discard("authenticity")
        proof_not_claiming.discard("current_possession")

    bond_failures = set(CORE_BOND_FAILURES)
    if attack == "bond_gap":
        bond_failures.discard("underinsurance_without_buyer_acceptance")
        bond_failures.discard("route_negligence")

    external_availability = attack not in {
        "missing_external_availability",
        "sparse_evidence_with_waiver",
        "sparse_evidence_no_waiver",
    }
    risk = buyer_risk_for(trade, seller_evidence, attack)

    game = "pokemon"
    template = "pokemon_single_card_alpha"
    card_reference = exact_card_reference(trade)
    if attack == "outside_scope_magic":
        game = "magic"
        template = "magic_single_card_alpha"
        card_reference = {
            **card_reference,
            "game": "magic",
            "printed_name": "fixture non-Pokemon card",
            "source_card_id": "fixture:magic-card",
        }
    elif attack == "manual_database_gap":
        card_reference = manual_gap_reference(trade)

    return Scenario(
        scenario_id=trade["trade_id"],
        description=f"{trade['card']} / {attack}",
        value_usd=int(trade["value"]),
        game=game,
        trade_template=template,
        item_form="raw_card",
        hard_packets=hard_packets,
        seller_evidence=seller_evidence,
        buyer_risk_acceptance=risk,
        proof_positive_claims={"seller_account_control", "shop_or_marketplace_history"},
        proof_not_claiming=proof_not_claiming,
        bond_covered_failures=bond_failures,
        route=route_packet_for(trade, attack),
        card_reference=card_reference,
        external_availability_covenant=external_availability,
        claim_evidence=claim_evidence_for(record["resolution"]["outcome"], attack),
    )


def route_gate_for(
    scenario: Scenario,
    attack: str,
    walls: list[Any],
    commitments: dict[str, Any],
) -> dict[str, Any]:
    wall_by_id = {wall.wall_id: wall for wall in walls}
    route_wall_outcomes = {
        wall_id: wall.outcome
        for wall_id, wall in wall_by_id.items()
        if wall_id in ROUTE_BLOCKING_WALLS
    }
    route_blocked_by_walls = any(outcome == "block" for outcome in route_wall_outcomes.values())
    route_needs_unaccepted_waiver = any(outcome == "waiver_required" for outcome in route_wall_outcomes.values())
    route_minimum_missing = sorted(
        {
            "item_fingerprint_hash",
            "inventory_lock_hash",
            "route_insurance_risk_owner_packet",
            "route_spendability_hash",
        }
        - scenario.hard_packets
    )

    route_packet = commitments["packets"].get("route_spendability")
    route_spendability_hash = commitments.get("route_spendability_hash") or ""
    cited_wall_bundle_hash = ""
    if route_packet:
        cited_wall_bundle_hash = route_packet["payload"].get("wall_bundle_hash", "")
    if attack == "spendability_missing_wall_ref":
        cited_wall_bundle_hash = ""
    if attack == "stale_wall_bundle_ref":
        cited_wall_bundle_hash = "sha256:stale-wall-bundle"

    spendability_cites_current_bundle = bool(
        route_packet
        and cited_wall_bundle_hash
        and cited_wall_bundle_hash == commitments["wall_bundle_hash"]
    )
    route_spendability_evm_hash = (
        evm_bytes32_ref(
            schema="marketplace.route_spendability_evm_hash.v0.1",
            value=route_spendability_hash,
        )
        if route_spendability_hash
        else ""
    )
    ready = bool(
        not route_blocked_by_walls
        and not route_needs_unaccepted_waiver
        and not route_minimum_missing
        and commitments["placement_integrity"]["complete"]
        and route_packet
        and spendability_cites_current_bundle
        and commitments.get("route_assembly_witness_hash")
    )
    return {
        "ready_for_route_lock": ready,
        "route_blocked_by_walls": route_blocked_by_walls,
        "route_needs_unaccepted_waiver": route_needs_unaccepted_waiver,
        "route_minimum_missing": route_minimum_missing,
        "placement_complete": commitments["placement_integrity"]["complete"],
        "missing_packet_refs": commitments["placement_integrity"]["missing_packet_refs"],
        "wall_bundle_hash": commitments["wall_bundle_hash"],
        "wall_bundle_evm_ref": commitments["wall_bundle_evm_ref"],
        "assembly_history_evm_ref": commitments["assembly_history_evm_ref"],
        "route_assembly_witness_hash": commitments["route_assembly_witness_hash"],
        "route_spendability_hash": route_spendability_hash,
        "route_spendability_evm_hash": route_spendability_evm_hash,
        "spendability_packet_present": bool(route_packet),
        "spendability_cited_wall_bundle_hash": cited_wall_bundle_hash,
        "spendability_cites_current_bundle": spendability_cites_current_bundle,
        "route_wall_outcomes": route_wall_outcomes,
    }


def agent_decisions_for(walls: list[Any]) -> list[dict[str, str]]:
    rows = []
    for variant in AGENT_VARIANTS:
        decision, rationale = variant_decision(variant, walls)
        rows.append({"variant": variant, "decision": decision, "rationale": rationale})
    return rows


def choose_attack(index: int, rng: random.Random) -> str:
    if index <= len(ATTACKS) * 4:
        return ATTACKS[(index - 1) % len(ATTACKS)]
    return rng.choices(
        ATTACKS,
        weights=[34, 8, 7, 7, 6, 4, 5, 4, 4, 7, 5, 3, 4, 2],
        k=1,
    )[0]


def build_records(count: int, seed: int) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    forced_count = min(count, len(FORCED_OUTCOMES) * 3)
    forced: list[str | None] = []
    for outcome in FORCED_OUTCOMES:
        forced.extend([outcome] * 3)
    forced = forced[:forced_count]
    outcome_plan = [None] * max(0, count - len(forced)) + forced
    rng.shuffle(outcome_plan)

    records = []
    for index, forced_outcome in enumerate(outcome_plan, start=1):
        trade = generate_trade(index, rng, forced_outcome)
        plan = make_plan(trade)
        resolution = resolve_trade(trade, plan, rng)
        base = {
            "trade": asdict(trade),
            "plan": asdict(plan),
            "resolution": asdict(resolution),
        }
        attack = choose_attack(index, rng)
        scenario = scenario_for(base, attack)
        walls = evaluate_walls(scenario)
        commitments = packet_commitments(scenario, walls)
        route_gate = route_gate_for(scenario, attack, walls, commitments)
        decisions = agent_decisions_for(walls)
        base["wall"] = {
            "attack": attack,
            "scenario": jsonable(asdict(scenario)),
            "results": [asdict(wall) for wall in walls],
            "agent_decisions": decisions,
            "commitments": {
                key: value
                for key, value in commitments.items()
                if key not in {"packets"}
            },
            "packet_count": len(commitments["packets"]),
            **route_gate,
        }
        records.append(base)
    return records


def invariant_counts(records: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter()
    for record in records:
        wall = record["wall"]
        outcomes = {result["outcome"] for result in wall["results"]}
        decisions = {row["variant"]: row["decision"] for row in wall["agent_decisions"]}
        route_ready = wall["ready_for_route_lock"]

        if route_ready and wall["route_blocked_by_walls"]:
            counts["route_locked_when_walls_block"] += 1
        if route_ready and wall["route_needs_unaccepted_waiver"]:
            counts["route_locked_with_unaccepted_waiver"] += 1
        if route_ready and not wall["placement_complete"]:
            counts["route_locked_without_complete_placement"] += 1
        if route_ready and wall["route_minimum_missing"]:
            counts["route_locked_without_route_minimum_packets"] += 1
        if route_ready and not wall["spendability_packet_present"]:
            counts["route_locked_without_route_spendability_packet"] += 1
        if route_ready and not wall["spendability_cites_current_bundle"]:
            counts["route_locked_with_wrong_wall_bundle"] += 1
        if route_ready and not wall["route_assembly_witness_hash"]:
            counts["route_locked_without_route_assembly_witness"] += 1
        if wall["attack"] == "scope_laundering" and route_ready:
            counts["trusted_source_laundered_to_truth"] += 1
        if wall["attack"] == "outside_scope_magic" and route_ready:
            counts["outside_scope_trade_routed"] += 1

        unresolved = bool({"waiver_required", "escalate"} & outcomes)
        for decision in decisions.values():
            if decision == "accept_or_continue" and unresolved:
                counts["silent_accepts"] += 1

        if wall["attack"] in {
            "scope_laundering",
            "unassigned_insurance_gap",
            "missing_inventory_lock",
            "missing_route_spendability",
            "spendability_missing_wall_ref",
            "stale_wall_bundle_ref",
            "outside_scope_magic",
        }:
            adversarial_decision = decisions.get("adversarial_seller", "")
            contained = (
                adversarial_decision
                in {
                    "blocked",
                    "blocked_until_waiver",
                    "semantic_attack_contained",
                    "continue_with_recorded_waiver",
                    "escalate",
                    "escalate_with_matrix_row",
                }
                or not route_ready
            )
            if not contained:
                counts["uncontained_adversarial_attacks"] += 1

    for key in [
        "route_locked_when_walls_block",
        "route_locked_with_unaccepted_waiver",
        "route_locked_without_complete_placement",
        "route_locked_without_route_minimum_packets",
        "route_locked_without_route_spendability_packet",
        "route_locked_with_wrong_wall_bundle",
        "route_locked_without_route_assembly_witness",
        "trusted_source_laundered_to_truth",
        "outside_scope_trade_routed",
        "silent_accepts",
        "uncontained_adversarial_attacks",
    ]:
        counts.setdefault(key, 0)
    return dict(counts)


def select_evm_trade_ids(records: list[dict[str, Any]], limit: int) -> list[str]:
    eligible = [record for record in records if record["wall"]["ready_for_route_lock"]]
    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in eligible:
        resolution = record["resolution"]
        trade = record["trade"]
        key = f"{trade['value_band']}:{resolution['outcome']}:{resolution['arbitration_mode']}"
        buckets[key].append(record)

    selected: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for key in sorted(
        buckets,
        key=lambda item: (
            0 if "clean_close" not in item else 1,
            0 if "automated" in item else 1,
            item,
        ),
    ):
        if len(selected) >= limit:
            break
        candidate = sorted(buckets[key], key=lambda row: -row["trade"]["value"])[0]
        if candidate["trade"]["trade_id"] not in seen_ids:
            selected.append(candidate)
            seen_ids.add(candidate["trade"]["trade_id"])

    if len(selected) < limit:
        for candidate in sorted(eligible, key=lambda row: -row["trade"]["value"]):
            if len(selected) >= limit:
                break
            if candidate["trade"]["trade_id"] not in seen_ids:
                selected.append(candidate)
                seen_ids.add(candidate["trade"]["trade_id"])
    return [record["trade"]["trade_id"] for record in selected]


def summarize(records: list[dict[str, Any]], seed: int, run_id: str) -> dict[str, Any]:
    agent_summary = summarize_agent_market(records)
    wall_outcomes = Counter(
        result["outcome"]
        for record in records
        for result in record["wall"]["results"]
    )
    wall_ids = Counter(
        f"{result['wall_id']}:{result['outcome']}"
        for record in records
        for result in record["wall"]["results"]
    )
    decisions = Counter(
        f"{row['variant']}:{row['decision']}"
        for record in records
        for row in record["wall"]["agent_decisions"]
    )
    attacks = Counter(record["wall"]["attack"] for record in records)
    route_ready = [record for record in records if record["wall"]["ready_for_route_lock"]]
    invariants = invariant_counts(records)
    return {
        "run": {
            "run_id": run_id,
            "created_utc": datetime.now(timezone.utc).isoformat(),
            "seed": seed,
            "probe": "unified_pokemon_alpha_wall_stress",
        },
        "n": len(records),
        "route_ready_count": len(route_ready),
        "route_ready_rate": round(len(route_ready) / max(1, len(records)), 4),
        "agent_market": agent_summary,
        "attacks": dict(attacks),
        "wall_outcomes": dict(wall_outcomes),
        "wall_id_outcomes": dict(wall_ids),
        "agent_decisions": dict(decisions),
        "invariants": invariants,
        "pass": all(value == 0 for value in invariants.values()),
    }


def write_records(outdir: Path, records: list[dict[str, Any]], summary: dict[str, Any]) -> None:
    (outdir / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    with (outdir / "trades.jsonl").open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(jsonable(record), sort_keys=True) + "\n")
    with (outdir / "wall_cases.jsonl").open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(
                json.dumps(
                    jsonable({"trade_id": record["trade"]["trade_id"], "wall": record["wall"]}),
                    sort_keys=True,
                )
                + "\n"
            )
    with (outdir / "agent_decisions.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["trade_id", "attack", "variant", "decision", "rationale", "route_ready"],
        )
        writer.writeheader()
        for record in records:
            for row in record["wall"]["agent_decisions"]:
                writer.writerow(
                    {
                        "trade_id": record["trade"]["trade_id"],
                        "attack": record["wall"]["attack"],
                        "variant": row["variant"],
                        "decision": row["decision"],
                        "rationale": row["rationale"],
                        "route_ready": record["wall"]["ready_for_route_lock"],
                    }
                )


def run_evm_replay(outdir: Path, trade_ids: list[str], port: int) -> dict[str, Any]:
    if not trade_ids:
        return {"attempted": False, "reason": "no route-ready trades selected"}
    cmd = [
        sys.executable,
        str(CHAIN / "script" / "replay_agent_sim_trades.py"),
        "--source-run",
        str(outdir),
        "--port",
        str(port),
        "--trade-ids",
        *trade_ids,
    ]
    completed = subprocess.run(
        cmd,
        cwd=CHAIN,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    output = completed.stdout
    (outdir / "evm_replay_output.txt").write_text(output, encoding="utf-8")
    report = ""
    for line in output.splitlines():
        if line.startswith("Wrote "):
            report = line.removeprefix("Wrote ").strip()
            break
    return {
        "attempted": True,
        "returncode": completed.returncode,
        "trade_ids": trade_ids,
        "output_path": str(outdir / "evm_replay_output.txt"),
        "report": report,
        "passed": completed.returncode == 0,
    }


def write_report(
    outdir: Path,
    summary: dict[str, Any],
    records: list[dict[str, Any]],
    evm_result: dict[str, Any],
    sample_count: int,
) -> None:
    interesting = sorted(
        records,
        key=lambda record: (
            0 if record["wall"]["attack"] != "full_compliant" else 1,
            0 if not record["wall"]["ready_for_route_lock"] else 1,
            -record["trade"]["value"],
        ),
    )[:sample_count]

    lines = [
        f"# Unified Pokemon Alpha Stress: {summary['run']['run_id']}",
        "",
        f"- Trades: `{summary['n']}`",
        f"- Route-ready trades: `{summary['route_ready_count']}` ({summary['route_ready_rate']:.1%})",
        f"- Pass: `{summary['pass']}`",
        f"- EVM replay: `{'passed' if evm_result.get('passed') else 'not passed' if evm_result.get('attempted') else 'skipped'}`",
        "",
        "## Pass Criteria",
        "",
        "```json",
        json.dumps(summary["invariants"], indent=2, sort_keys=True),
        "```",
        "",
        "## Agent Market Shape",
        "",
        "```json",
        json.dumps(
            {
                "outcomes": summary["agent_market"]["outcomes"],
                "value_bands": summary["agent_market"]["value_bands"],
                "routes": summary["agent_market"]["routes"],
                "seller_trust": summary["agent_market"]["seller_trust"],
                "arbitration_modes": summary["agent_market"]["arbitration_modes"],
                "friction_triggers": summary["agent_market"]["friction_triggers"],
            },
            indent=2,
            sort_keys=True,
        ),
        "```",
        "",
        "## Walls Found",
        "",
        "```json",
        json.dumps(
            {
                "attacks": summary["attacks"],
                "wall_outcomes": summary["wall_outcomes"],
                "top_wall_id_outcomes": dict(Counter(summary["wall_id_outcomes"]).most_common(18)),
            },
            indent=2,
            sort_keys=True,
        ),
        "```",
        "",
        "## Agent Decisions",
        "",
        "```json",
        json.dumps(dict(Counter(summary["agent_decisions"]).most_common(24)), indent=2, sort_keys=True),
        "```",
        "",
        "## EVM Replay",
        "",
        "```json",
        json.dumps(evm_result, indent=2, sort_keys=True),
        "```",
        "",
        "## Sample Wall Contacts",
        "",
    ]

    for record in interesting:
        trade = record["trade"]
        wall = record["wall"]
        blocking = [
            f"{result['wall_id']}:{result['outcome']}"
            for result in wall["results"]
            if result["outcome"] != "pass"
        ]
        lines.extend(
            [
                f"### {trade['trade_id']} / {wall['attack']}",
                "",
                f"- Card: {trade['card']}",
                f"- Value: `${trade['value']}` ({trade['value_band']})",
                f"- Seller trust: `{trade['seller_trust']}`",
                f"- Route: `{trade['route']}`",
                f"- Outcome: `{record['resolution']['outcome']}`",
                f"- Route ready: `{wall['ready_for_route_lock']}`",
                f"- Wall contacts: `{', '.join(blocking) if blocking else 'all pass'}`",
                f"- Route gate: `assembly_witness={bool(wall['route_assembly_witness_hash'])}; spendability={wall['spendability_packet_present']}; cites_current={wall['spendability_cites_current_bundle']}`",
                "",
            ]
        )

    lines.extend(
        [
            "## Artifacts",
            "",
            "- `summary.json`: aggregate metrics and pass/fail criteria.",
            "- `trades.jsonl`: agent-market rows plus wall state, packet commitments, and route gate status.",
            "- `wall_cases.jsonl`: compact wall-only records.",
            "- `agent_decisions.csv`: every prompt variant decision for each trade.",
            "- `evm_replay_output.txt`: stdout from the optional Anvil replay.",
            "",
        ]
    )
    (outdir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run unified Pokemon alpha wall stress.")
    parser.add_argument("--trades", type=int, default=250)
    parser.add_argument("--seed", type=int, default=20260520)
    parser.add_argument("--samples", type=int, default=18)
    parser.add_argument("--evm-sample", type=int, default=10)
    parser.add_argument("--evm-port", type=int, default=18548)
    parser.add_argument("--skip-evm", action="store_true")
    parser.add_argument("--outdir", type=Path, default=RUNS)
    args = parser.parse_args()

    run_id = f"unified_stress_{utc_stamp()}"
    outdir = args.outdir / run_id
    outdir.mkdir(parents=True, exist_ok=True)

    records = build_records(args.trades, args.seed)
    summary = summarize(records, args.seed, run_id)
    selected_evm_ids = select_evm_trade_ids(records, args.evm_sample)
    (outdir / "selected_evm_trade_ids.txt").write_text("\n".join(selected_evm_ids) + "\n", encoding="utf-8")

    write_records(outdir, records, summary)
    if args.skip_evm or args.evm_sample <= 0:
        evm_result = {"attempted": False, "reason": "skipped by CLI", "trade_ids": selected_evm_ids}
    else:
        evm_result = run_evm_replay(outdir, selected_evm_ids, args.evm_port)
        if evm_result.get("attempted") and not evm_result.get("passed"):
            summary["pass"] = False
            summary["evm_failure"] = evm_result
            (outdir / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    write_report(outdir, summary, records, evm_result, args.samples)
    print(json.dumps({"run_dir": str(outdir), "pass": summary["pass"], "evm": evm_result}, indent=2, sort_keys=True))
    return 0 if summary["pass"] and (not evm_result.get("attempted") or evm_result.get("passed")) else 1


if __name__ == "__main__":
    raise SystemExit(main())
