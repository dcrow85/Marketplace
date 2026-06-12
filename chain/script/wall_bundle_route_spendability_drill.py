#!/usr/bin/env python3
"""Drill route spendability against wall-bundle and assembly commitments.

This proves the next EVM-adjacent boundary:

- valid wall bundle + assembly history + route spendability citing both -> route lock succeeds
- missing wall bundle in route spendability -> off-chain validator blocks before EVM
- stale/wrong wall bundle in route spendability -> off-chain validator blocks before EVM
- missing assembly history in route spendability -> off-chain validator blocks before EVM
- stale/wrong assembly history in route spendability -> off-chain validator blocks before EVM

The Solidity contract consumes the route spendability hash and requires a typed
route assembly witness that binds the wall-bundle and assembly-history hashes.
Full wall-bundle and assembly graph semantics stay off-chain.
"""

from __future__ import annotations

import argparse
import json
import signal
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import protocol_e2e as e2e


ROOT = e2e.ROOT
RUNS = e2e.RUNS
CHAIN = e2e.CHAIN
ENV = e2e.ENV
SIMULATIONS = ROOT / "simulations"
if str(SIMULATIONS) not in sys.path:
    sys.path.insert(0, str(SIMULATIONS))

from protocol_wall_packets import packet_commitments  # noqa: E402
from protocol_wall_pressure_sim import (  # noqa: E402
    CORE_BOND_FAILURES,
    DEFAULT_RAW_500_2000_EVIDENCE,
    HARD_ACCEPTANCE_PACKETS,
    REQUIRED_PROOF_NOT_CLAIMING,
    Scenario,
    route_packet,
)


@dataclass
class DrillCase:
    slug: str
    expected: str
    outcome: str
    passed: bool
    observations: list[str] = field(default_factory=list)
    transactions: list[e2e.TxRecord] = field(default_factory=list)
    packets: list[e2e.PacketRecord] = field(default_factory=list)
    final_state: str = ""
    validator_error: str = ""


@dataclass
class DrillSummary:
    run_id: str
    generated_at: str
    rpc_url: str
    registry: str
    contract: str
    wall_bundle_hash: str
    assembly_history_hash: str
    wall_bundle_evm_ref: str
    assembly_history_evm_ref: str
    route_assembly_witness_hash: str
    route_spendability_hash: str
    passed: bool
    cases: list[DrillCase]


def wall_ready_scenario(trade_marker: str = "evm_wall_bundle_trade") -> Scenario:
    return Scenario(
        scenario_id=trade_marker,
        description="EVM drill wall-compliant raw-card route",
        value_usd=750,
        hard_packets=set(HARD_ACCEPTANCE_PACKETS) | {"assembly_history_hash", "route_spendability_hash"},
        seller_evidence=set(DEFAULT_RAW_500_2000_EVIDENCE),
        proof_positive_claims={"seller_controls_shop_domain", "seller_controls_ebay_account"},
        proof_not_claiming=set(REQUIRED_PROOF_NOT_CLAIMING),
        bond_covered_failures=set(CORE_BOND_FAILURES),
        route=route_packet(750),
        external_availability_covenant=True,
    )


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def evm_ref(schema: str, value: str) -> str:
    return e2e.keccak_payload({"schema": schema, "value": value})


def evm_route_assembly_witness_hash(
    rpc_url: str,
    contract: str,
    trade_id: int,
    route_hash: str,
    spendability_hash: str,
    wall_bundle_hash: str,
    assembly_history_hash: str,
) -> str:
    return e2e.route_assembly_witness_hash(
        rpc_url,
        contract,
        trade_id,
        route_hash,
        spendability_hash,
        wall_bundle_hash,
        assembly_history_hash,
    )


def route_spendability_payload(
    trade_id: int,
    route_hash: str,
    wall_bundle_hash: str | None,
    assembly_history_hash: str | None,
    *,
    packet_id: str,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "schema": "marketplace.evidence_spendability.v0.1",
        "trade_id": trade_id,
        "spendability_id": packet_id,
        "gate": {
            "gate_type": "route_commitment",
            "gate_id": f"route_commitment:{trade_id}:wall-bundle-route",
            "leg": "forward",
            "consumption": "single_use",
        },
        "route_hash": route_hash,
        "spendable_claims": [
            {
                "claim_type": "route_readiness",
                "support_level": "standard",
                "spend_limit": "blocks_or_unblocks_gate",
                "not_claiming": ["physical_truth", "authenticity", "condition_truth"],
                "basis": ["wall_bundle_hash", "route_packet_hash", "buyer_agent_authority"],
            }
        ],
        "decision_authority": {
            "actor_role": "buyer_agent",
            "actor_id": "did:market:agent:buyer-alpha",
            "authority_source": "buyer_delegation",
        },
        "status": "active",
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "canonicalization": "canonical-json-payload-v1",
        "hash_algorithm": "keccak256(utf8(canonical-json-payload-v1))",
    }
    if wall_bundle_hash is not None:
        payload["wall_bundle_hash"] = wall_bundle_hash
    if assembly_history_hash is not None:
        payload["assembly_history_hash"] = assembly_history_hash
    return payload


def validate_route_wall_bundle_spendability(
    payload: dict[str, Any],
    *,
    expected_wall_bundle_hash: str,
    expected_assembly_history_hash: str,
    expected_trade_id: int,
    expected_route_hash: str,
) -> str:
    if payload.get("schema") != "marketplace.evidence_spendability.v0.1":
        raise ValueError("SPENDABILITY_SCHEMA: wrong schema")
    if int(payload.get("trade_id")) != expected_trade_id:
        raise ValueError("SPENDABILITY_TRADE: wrong trade id")
    if payload.get("status") != "active":
        raise ValueError("SPENDABILITY_STATUS: spendability is not active")
    if payload.get("route_hash") != expected_route_hash:
        raise ValueError("ROUTE_HASH: route hash mismatch")

    gate = payload.get("gate", {})
    if gate.get("gate_type") != "route_commitment":
        raise ValueError("GATE_TYPE: not route commitment")
    if gate.get("leg") != "forward":
        raise ValueError("GATE_LEG: route commitment must be forward leg")
    if gate.get("consumption") != "single_use":
        raise ValueError("GATE_CONSUMPTION: route spendability must be single-use")

    if "wall_bundle_hash" not in payload:
        raise ValueError("WALL_BUNDLE_MISSING: route spendability must cite wall bundle")
    if payload["wall_bundle_hash"] != expected_wall_bundle_hash:
        raise ValueError("WALL_BUNDLE_MISMATCH: route spendability cites stale or wrong wall bundle")
    if "assembly_history_hash" not in payload:
        raise ValueError("ASSEMBLY_HISTORY_MISSING: route spendability must cite assembly history")
    if payload["assembly_history_hash"] != expected_assembly_history_hash:
        raise ValueError("ASSEMBLY_HISTORY_MISMATCH: route spendability cites stale or wrong assembly history")

    claims = payload.get("spendable_claims", [])
    if not claims:
        raise ValueError("SPENDABILITY_CLAIMS: missing spendable claims")
    not_claiming = set()
    for claim in claims:
        not_claiming.update(claim.get("not_claiming", []))
    required_not_claiming = {"physical_truth", "authenticity", "condition_truth"}
    if not required_not_claiming.issubset(not_claiming):
        raise ValueError("NOT_CLAIMING: route spendability must preserve physical-truth boundary")
    return "route spendability accepted for current wall bundle"


def write_packet(
    packet_dir: Path,
    packet_id: str,
    payload: dict[str, Any],
    signer_key: str,
    signer_address: str,
) -> e2e.PacketRecord:
    return e2e.write_packet(packet_dir, packet_id, payload, signer_key, signer_address)


def setup_trade(
    rpc_url: str,
    registry: str,
    contract: str,
    packet_dir: Path,
    case: DrillCase,
) -> tuple[int, e2e.PacketRecord, e2e.PacketRecord, e2e.PacketRecord]:
    trade_id = 1
    intent = write_packet(
        packet_dir,
        "wall_bundle_intent",
        {
            "schema": "marketplace.intent.v0.2",
            "intent_id": "intent_wall_bundle_001",
            "buyer": e2e.SIGNERS["buyer"]["actor_id"],
            "object": {"domain": "tcg", "game": "pokemon", "card": "wall drill raw card"},
            "cost_field": {"max_total_price_eth": "0.20"},
        },
        e2e.BUYER_KEY,
        e2e.BUYER,
    )
    terms = write_packet(
        packet_dir,
        "wall_bundle_terms",
        {
            "schema": "marketplace.escrow_terms.v0.2",
            "price_eth": "0.20",
            "seller_bond_eth": "0.03",
            "buyer_dispute_bond_eth": "0.005",
            "inspection_seconds": 172800,
            "policy_note": "Route spendability must cite current wall bundle.",
        },
        e2e.BUYER_KEY,
        e2e.BUYER,
    )
    item_fingerprint = write_packet(
        packet_dir,
        "wall_bundle_item_fingerprint",
        {
            "schema": "marketplace.item_fingerprint.v0.2",
            "trade_id": trade_id,
            "identity_claim": {"domain": "tcg", "condition_claim": "LP"},
            "evidence_profile": "tcg.raw.500_2000.v0.1",
        },
        e2e.SELLER_KEY,
        e2e.SELLER,
    )
    inventory_lock = write_packet(
        packet_dir,
        "wall_bundle_inventory_lock",
        {
            "schema": "marketplace.inventory_lock.v0.2",
            "trade_id": trade_id,
            "seller": e2e.SIGNERS["seller"]["actor_id"],
            "item_fingerprint_hash": item_fingerprint.payload_hash,
            "inventory_key": "tcg:pokemon:wall-bundle:001",
            "lock_scope": "single_unique_card",
        },
        e2e.SELLER_KEY,
        e2e.SELLER,
    )
    route = write_packet(
        packet_dir,
        "wall_bundle_route",
        {
            "schema": "marketplace.trade_route.v0.2",
            "trade_id": trade_id,
            "route_type": "insured_shipping",
            "tracking": "SIM-WALL-0001",
            "insured": True,
            "declared_insurance_eth": "0.20",
        },
        e2e.SELLER_KEY,
        e2e.SELLER,
    )
    case.packets.extend([intent, terms, item_fingerprint, inventory_lock, route])
    e2e.verify_packets(rpc_url, registry, case.packets)
    case.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.BUYER_KEY,
            contract,
            "create wall bundle drill trade",
            "createTrade(address,address,uint256,uint256,uint256,bytes32,bytes32,bytes32,address,bytes,bytes)",
            [
                e2e.SELLER,
                e2e.ARBITER,
                e2e.eth("0.03"),
                e2e.eth("0.005"),
                "172800",
                intent.payload_hash,
                terms.payload_hash,
                e2e.judgment_supply_commitment_hash(trade_id, "wall-bundle-floor"),
                e2e.REPLACEMENT_ARBITER,
                intent.signature,
                terms.signature,
            ],
            value_wei=e2e.eth("0.20"),
        )
    )
    case.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            "seller posts wall bundle drill bond",
            "acceptAndBond(uint256)",
            [str(trade_id)],
            value_wei=e2e.eth("0.03"),
        )
    )
    case.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            "commit wall bundle item fingerprint",
            "commitItemFingerprint(uint256,bytes32,bytes)",
            [str(trade_id), item_fingerprint.payload_hash, item_fingerprint.signature],
        )
    )
    case.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            "commit wall bundle inventory lock",
            "commitInventoryLock(uint256,bytes32,bytes32,bytes)",
            [
                str(trade_id),
                inventory_lock.payload_hash,
                item_fingerprint.payload_hash,
                e2e.sign_inventory_lock_binding(
                    rpc_url,
                    contract,
                    trade_id,
                    inventory_lock.payload_hash,
                    item_fingerprint.payload_hash,
                    e2e.SELLER_KEY,
                ),
            ],
        )
    )
    return trade_id, item_fingerprint, inventory_lock, route


def run_drill(rpc_url: str, registry: str, contract: str, packet_dir: Path) -> DrillSummary:
    scenario = wall_ready_scenario()
    commitments = packet_commitments(scenario)
    wall_bundle_hash = commitments["wall_bundle_hash"]
    assembly_history_hash = commitments["assembly_history_hash"]
    wall_bundle_evm_ref = evm_ref("marketplace.wall_bundle_evm_ref.v0.1", wall_bundle_hash)
    assembly_history_evm_ref = evm_ref(
        "marketplace.assembly_history_evm_ref.v0.1", assembly_history_hash
    )
    cases: list[DrillCase] = []

    valid = DrillCase(
        slug="valid_wall_bundle_route_lock",
        expected="route_locked_with_wall_bundle_spendability",
        outcome="not_run",
        passed=False,
    )
    trade_id, _, _, route = setup_trade(rpc_url, registry, contract, packet_dir, valid)
    valid_payload = route_spendability_payload(
        trade_id,
        route.payload_hash,
        wall_bundle_hash,
        assembly_history_hash,
        packet_id="wall_bundle_route_spendability_valid",
    )
    valid.observations.append(
        validate_route_wall_bundle_spendability(
            valid_payload,
            expected_wall_bundle_hash=wall_bundle_hash,
            expected_assembly_history_hash=assembly_history_hash,
            expected_trade_id=trade_id,
            expected_route_hash=route.payload_hash,
        )
    )
    valid_spendability = write_packet(
        packet_dir,
        "wall_bundle_route_spendability_valid",
        valid_payload,
        e2e.BUYER_KEY,
        e2e.BUYER,
    )
    valid.packets.append(valid_spendability)
    e2e.verify_packets(rpc_url, registry, [valid_spendability])
    evm_route_spendability = e2e.route_spendability_hash(
        rpc_url,
        contract,
        trade_id,
        route.payload_hash,
        wall_bundle_evm_ref,
        assembly_history_evm_ref,
        e2e.SELLER,
    )
    route_assembly_witness_hash = evm_route_assembly_witness_hash(
        rpc_url,
        contract,
        trade_id,
        route.payload_hash,
        evm_route_spendability,
        wall_bundle_evm_ref,
        assembly_history_evm_ref,
    )
    valid.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            "commit route with wall bundle assembly spendability",
            "commitRoute(uint256,bytes32,bytes32,bytes32,bytes32,bytes32,bool,bool,uint256,bytes)",
            [
                str(trade_id),
                route.payload_hash,
                evm_route_spendability,
                wall_bundle_evm_ref,
                assembly_history_evm_ref,
                route_assembly_witness_hash,
                "false",
                "true",
                e2e.eth("0.20"),
                route.signature,
            ],
        )
    )
    valid.final_state = e2e.call_state(rpc_url, contract, trade_id)
    valid.outcome = (
        "route_locked_with_wall_bundle_spendability"
        if valid.final_state == "RouteLocked"
        else f"unexpected_state:{valid.final_state}"
    )
    valid.passed = valid.outcome == valid.expected
    cases.append(valid)

    missing = DrillCase(
        slug="missing_wall_bundle_hash",
        expected="validator_blocked_missing_wall_bundle",
        outcome="not_run",
        passed=False,
    )
    missing_payload = route_spendability_payload(
        trade_id,
        route.payload_hash,
        None,
        assembly_history_hash,
        packet_id="wall_bundle_route_spendability_missing",
    )
    try:
        validate_route_wall_bundle_spendability(
            missing_payload,
            expected_wall_bundle_hash=wall_bundle_hash,
            expected_assembly_history_hash=assembly_history_hash,
            expected_trade_id=trade_id,
            expected_route_hash=route.payload_hash,
        )
    except ValueError as error:
        missing.validator_error = str(error)
        missing.outcome = "validator_blocked_missing_wall_bundle"
        missing.observations.append("Off-chain validator blocked missing wall_bundle_hash before EVM route call.")
    missing.passed = missing.outcome == missing.expected
    cases.append(missing)

    stale = DrillCase(
        slug="stale_wall_bundle_hash",
        expected="validator_blocked_stale_wall_bundle",
        outcome="not_run",
        passed=False,
    )
    stale_payload = route_spendability_payload(
        trade_id,
        route.payload_hash,
        "sha256:" + "00" * 32,
        assembly_history_hash,
        packet_id="wall_bundle_route_spendability_stale",
    )
    try:
        validate_route_wall_bundle_spendability(
            stale_payload,
            expected_wall_bundle_hash=wall_bundle_hash,
            expected_assembly_history_hash=assembly_history_hash,
            expected_trade_id=trade_id,
            expected_route_hash=route.payload_hash,
        )
    except ValueError as error:
        stale.validator_error = str(error)
        stale.outcome = "validator_blocked_stale_wall_bundle"
        stale.observations.append("Off-chain validator blocked stale wall_bundle_hash before EVM route call.")
    stale.passed = stale.outcome == stale.expected
    cases.append(stale)

    missing_assembly = DrillCase(
        slug="missing_assembly_history_hash",
        expected="validator_blocked_missing_assembly_history",
        outcome="not_run",
        passed=False,
    )
    missing_assembly_payload = route_spendability_payload(
        trade_id,
        route.payload_hash,
        wall_bundle_hash,
        None,
        packet_id="wall_bundle_route_spendability_missing_assembly",
    )
    try:
        validate_route_wall_bundle_spendability(
            missing_assembly_payload,
            expected_wall_bundle_hash=wall_bundle_hash,
            expected_assembly_history_hash=assembly_history_hash,
            expected_trade_id=trade_id,
            expected_route_hash=route.payload_hash,
        )
    except ValueError as error:
        missing_assembly.validator_error = str(error)
        missing_assembly.outcome = "validator_blocked_missing_assembly_history"
        missing_assembly.observations.append(
            "Off-chain validator blocked missing assembly_history_hash before EVM route call."
        )
    missing_assembly.passed = missing_assembly.outcome == missing_assembly.expected
    cases.append(missing_assembly)

    stale_assembly = DrillCase(
        slug="stale_assembly_history_hash",
        expected="validator_blocked_stale_assembly_history",
        outcome="not_run",
        passed=False,
    )
    stale_assembly_payload = route_spendability_payload(
        trade_id,
        route.payload_hash,
        wall_bundle_hash,
        "sha256:" + "11" * 32,
        packet_id="wall_bundle_route_spendability_stale_assembly",
    )
    try:
        validate_route_wall_bundle_spendability(
            stale_assembly_payload,
            expected_wall_bundle_hash=wall_bundle_hash,
            expected_assembly_history_hash=assembly_history_hash,
            expected_trade_id=trade_id,
            expected_route_hash=route.payload_hash,
        )
    except ValueError as error:
        stale_assembly.validator_error = str(error)
        stale_assembly.outcome = "validator_blocked_stale_assembly_history"
        stale_assembly.observations.append(
            "Off-chain validator blocked stale assembly_history_hash before EVM route call."
        )
    stale_assembly.passed = stale_assembly.outcome == stale_assembly.expected
    cases.append(stale_assembly)

    return DrillSummary(
        run_id="",
        generated_at=datetime.now(timezone.utc).isoformat(),
        rpc_url=rpc_url,
        registry=registry,
        contract=contract,
        wall_bundle_hash=wall_bundle_hash,
        assembly_history_hash=assembly_history_hash,
        wall_bundle_evm_ref=wall_bundle_evm_ref,
        assembly_history_evm_ref=assembly_history_evm_ref,
        route_assembly_witness_hash=route_assembly_witness_hash,
        route_spendability_hash=evm_route_spendability,
        passed=all(case.passed for case in cases),
        cases=cases,
    )


def write_report(run_dir: Path, summary: DrillSummary) -> None:
    summary.run_id = run_dir.name
    write_json(
        run_dir / "summary.json",
        {
            "run_id": summary.run_id,
            "generated_at": summary.generated_at,
            "rpc_url": summary.rpc_url,
            "registry": summary.registry,
            "contract": summary.contract,
            "wall_bundle_hash": summary.wall_bundle_hash,
            "assembly_history_hash": summary.assembly_history_hash,
            "wall_bundle_evm_ref": summary.wall_bundle_evm_ref,
            "assembly_history_evm_ref": summary.assembly_history_evm_ref,
            "route_assembly_witness_hash": summary.route_assembly_witness_hash,
            "route_spendability_hash": summary.route_spendability_hash,
            "passed": summary.passed,
            "cases": [
                {
                    "slug": case.slug,
                    "expected": case.expected,
                    "outcome": case.outcome,
                    "passed": case.passed,
                    "final_state": case.final_state,
                    "validator_error": case.validator_error,
                    "transactions": [tx.__dict__ for tx in case.transactions],
                    "packets": [packet.__dict__ for packet in case.packets],
                    "observations": case.observations,
                }
                for case in summary.cases
            ],
        },
    )
    lines = [
        f"# Wall Bundle Route Spendability Drill: {run_dir.name}",
        "",
        f"- Generated: `{summary.generated_at}`",
        f"- RPC: `{summary.rpc_url}`",
        f"- Registry: `{summary.registry}`",
        f"- Contract: `{summary.contract}`",
        f"- Wall bundle hash: `{summary.wall_bundle_hash}`",
        f"- Assembly history hash: `{summary.assembly_history_hash}`",
        f"- Wall bundle EVM ref: `{summary.wall_bundle_evm_ref}`",
        f"- Assembly history EVM ref: `{summary.assembly_history_evm_ref}`",
        f"- Route assembly witness hash: `{summary.route_assembly_witness_hash}`",
        f"- Route spendability hash: `{summary.route_spendability_hash}`",
        f"- Passed: `{summary.passed}`",
        "",
        "## Cases",
        "",
    ]
    for case in summary.cases:
        lines.extend(
            [
                f"### {case.slug}",
                "",
                f"- Expected: `{case.expected}`",
                f"- Outcome: `{case.outcome}`",
                f"- Passed: `{case.passed}`",
                f"- Final state: `{case.final_state}`",
            ]
        )
        if case.validator_error:
            lines.append(f"- Validator error: `{case.validator_error}`")
        if case.transactions:
            lines.append("- Transactions:")
            for tx in case.transactions:
                lines.append(f"  - `{tx.label}`: `{tx.tx_hash}`")
        if case.packets:
            lines.append("- Packets:")
            for packet in case.packets:
                lines.append(f"  - `{packet.packet_id}` `{packet.payload_hash}`")
        if case.observations:
            lines.append("- Observations:")
            for observation in case.observations:
                lines.append(f"  - {observation}")
        lines.append("")
    lines.extend(
        [
            "## Interpretation",
            "",
            "The EVM route path succeeds only after the off-chain validator accepts a route spendability packet that cites the current wall bundle and assembly history hashes. Missing or stale wall bundle and assembly hashes are blocked before the EVM route call is made.",
            "",
            "The contract still does not parse wall or assembly packets. It consumes the route spendability hash and validates the typed route assembly witness. Full wall and assembly graph semantics remain off-chain in this drill.",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run wall bundle route spendability drill.")
    parser.add_argument("--port", type=int, default=18547, help="Anvil port to use")
    parser.add_argument("--keep-anvil", action="store_true", help="Leave Anvil running after the drill")
    args = parser.parse_args()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = RUNS / f"wall_bundle_route_spendability_drill_{timestamp}"
    packet_dir = run_dir / "packets"
    packet_dir.mkdir(parents=True, exist_ok=True)
    rpc_url = f"http://127.0.0.1:{args.port}"
    anvil_log = (run_dir / "anvil.log").open("w", encoding="utf-8")
    anvil = subprocess.Popen(
        ["anvil", "--chain-id", "31337", "--port", str(args.port), "--silent"],
        cwd=CHAIN,
        env=ENV,
        stdout=anvil_log,
        stderr=subprocess.STDOUT,
        text=True,
    )

    try:
        e2e.wait_for_rpc(rpc_url)
        e2e.run(["forge", "build"])
        registry = e2e.deploy_registry(rpc_url)
        predicate_verifier = e2e.deploy_predicate_verifier(rpc_url)
        e2e.setup_registry(rpc_url, registry, predicate_verifier, packet_dir)
        contract = e2e.deploy_escrow(rpc_url, registry)
        summary = run_drill(rpc_url, registry, contract, packet_dir)
        write_report(run_dir, summary)
        print(f"Wrote {run_dir / 'REPORT.md'}")
        print(
            json.dumps(
                {
                    "passed": summary.passed,
                    "wall_bundle_hash": summary.wall_bundle_hash,
                    "assembly_history_hash": summary.assembly_history_hash,
                    "wall_bundle_evm_ref": summary.wall_bundle_evm_ref,
                    "assembly_history_evm_ref": summary.assembly_history_evm_ref,
                    "route_assembly_witness_hash": summary.route_assembly_witness_hash,
                    "route_spendability_hash": summary.route_spendability_hash,
                },
                sort_keys=True,
            )
        )
        return 0 if summary.passed else 1
    finally:
        if args.keep_anvil:
            print(f"Anvil left running at {rpc_url} with pid {anvil.pid}")
        else:
            anvil.send_signal(signal.SIGTERM)
            try:
                anvil.wait(timeout=5)
            except subprocess.TimeoutExpired:
                anvil.kill()
                anvil.wait(timeout=5)
        anvil_log.close()


if __name__ == "__main__":
    raise SystemExit(main())
