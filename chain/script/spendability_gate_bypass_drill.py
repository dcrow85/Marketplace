#!/usr/bin/env python3
"""Prove that direct route commitment cannot bypass spendability anymore.

This is a regression drill for the route spendability gate. It intentionally
uses the old no-spendability commitRoute ABI and should now revert before the
route can lock.
"""

from __future__ import annotations

import argparse
import json
import signal
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import protocol_e2e as e2e


RUNS = e2e.RUNS
CHAIN = e2e.CHAIN
ENV = e2e.ENV


@dataclass
class DrillResult:
    title: str
    expected: str
    outcome: str
    passed: bool
    final_state: str
    packets: list[e2e.PacketRecord] = field(default_factory=list)
    transactions: list[e2e.TxRecord] = field(default_factory=list)
    observations: list[str] = field(default_factory=list)


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_report(run_dir: Path, result: DrillResult, registry: str, contract: str, rpc_url: str) -> None:
    summary = {
        "run_id": run_dir.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "rpc_url": rpc_url,
        "registry": registry,
        "contract": contract,
        "title": result.title,
        "expected": result.expected,
        "outcome": result.outcome,
        "passed": result.passed,
        "final_state": result.final_state,
        "packets": [packet.__dict__ for packet in result.packets],
        "transactions": [tx.__dict__ for tx in result.transactions],
        "observations": result.observations,
    }
    write_json(run_dir / "summary.json", summary)

    lines = [
        f"# Spendability Gate Bypass Drill: {run_dir.name}",
        "",
        f"- Generated: `{summary['generated_at']}`",
        f"- RPC: `{rpc_url}`",
        f"- Registry: `{registry}`",
        f"- Contract: `{contract}`",
        f"- Expected current outcome: `{result.expected}`",
        f"- Outcome: `{result.outcome}`",
        f"- Passed expectation: `{result.passed}`",
        f"- Final state: `{result.final_state}`",
        "",
        "## What Happened",
        "",
        "The drill created a normal trade, committed an item fingerprint and inventory lock, then called the old `commitRoute` ABI directly with a seller-signed route packet. It intentionally did not create or validate an `EvidenceSpendability` packet.",
        "",
        "## Transactions",
        "",
    ]
    for tx in result.transactions:
        lines.append(f"- `{tx.label}`: `{tx.tx_hash}`")
    lines.extend(["", "## Packets", ""])
    for packet in result.packets:
        verdict = "valid" if packet.signature_valid else "not registry-verified"
        lines.append(f"- `{packet.packet_id}` `{packet.payload_hash}` ({packet.schema}, {verdict})")
    lines.extend(["", "## Observations", ""])
    for observation in result.observations:
        lines.append(f"- {observation}")
    lines.extend(
        [
            "",
            "## What This Proves",
            "",
            "- Solidity route commitment now requires a spendability packet hash.",
            "- Stale callers using the old no-spendability ABI fail closed.",
            "- Off-chain validation still decides whether the cited spendability packet is meaningful, but the EVM now requires the citation before a route can lock.",
            "",
            "## Remaining Hardening",
            "",
            "A later Solidity helper can validate the full EvidenceSpendability schema or a typed hash, but this drill now enforces the first hard boundary: no spendability citation, no route commitment.",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_drill(rpc_url: str, registry: str, contract: str, packet_dir: Path) -> DrillResult:
    trade_id = 1
    result = DrillResult(
        title="Direct commitRoute without spendability is blocked",
        expected="bypass_blocked_after_gate_anchor",
        outcome="not_run",
        passed=False,
        final_state="",
    )

    intent = e2e.write_packet(
        packet_dir,
        "bypass_intent",
        {
            "schema": "marketplace.intent.v0.2",
            "intent_id": "intent_bypass_001",
            "buyer": e2e.SIGNERS["buyer"]["actor_id"],
            "buyer_agent": "did:market:agent:buyer-alpha",
            "object": {
                "domain": "tcg",
                "game": "pokemon",
                "card": "bypass drill raw card",
                "condition_floor": "LP",
            },
            "cost_field": {
                "max_total_price_eth": "0.20",
                "evidence_floor": ["manifest", "spendability_required_by_policy"],
            },
        },
        e2e.BUYER_KEY,
        e2e.BUYER,
    )
    terms = e2e.write_packet(
        packet_dir,
        "bypass_terms",
        {
            "schema": "marketplace.escrow_terms.v0.2",
            "price_eth": "0.20",
            "seller_bond_eth": "0.03",
            "buyer_dispute_bond_eth": "0.005",
            "inspection_seconds": 172800,
            "policy_note": "Route should require spendability once contract anchor exists.",
        },
        e2e.BUYER_KEY,
        e2e.BUYER,
    )
    item_fingerprint = e2e.write_packet(
        packet_dir,
        "bypass_item_fingerprint",
        {
            "schema": "marketplace.item_fingerprint.v0.2",
            "trade_id": trade_id,
            "identity_claim": {
                "domain": "tcg",
                "game": "pokemon",
                "card": "bypass drill raw card",
                "condition_claim": "LP",
            },
            "evidence_refs": [{"type": "front_photo", "ref": "bypass_manifest"}],
            "correlation_method": ["visual_match"],
            "confidence_scope": "bypass_drill_only",
        },
        e2e.SELLER_KEY,
        e2e.SELLER,
    )
    manifest = e2e.write_evidence_manifest_packet(
        packet_dir,
        "bypass_item_manifest",
        trade_id,
        "seller",
        "item_fingerprint",
        item_fingerprint.payload_hash,
        "standard",
        "manifest_integrity_only",
        [
            {
                "asset_id": "front-photo",
                "role": "front_photo",
                "filename": "front-photo.png",
                "data": b"\x89PNG\r\nbypass-front-photo",
            },
            {
                "asset_id": "back-photo",
                "role": "back_photo",
                "filename": "back-photo.png",
                "data": b"\x89PNG\r\nbypass-back-photo",
            },
        ],
        known_limits=["No spendability packet is issued in this drill."],
    )
    inventory_lock = e2e.write_packet(
        packet_dir,
        "bypass_inventory_lock",
        {
            "schema": "marketplace.inventory_lock.v0.2",
            "trade_id": trade_id,
            "seller": e2e.SIGNERS["seller"]["actor_id"],
            "item_fingerprint_hash": item_fingerprint.payload_hash,
            "inventory_key": "tcg:pokemon:bypass-drill:001",
            "lock_scope": "single_unique_card",
        },
        e2e.SELLER_KEY,
        e2e.SELLER,
    )
    route = e2e.write_packet(
        packet_dir,
        "bypass_route_without_spendability",
        {
            "schema": "marketplace.trade_route.v0.2",
            "trade_id": trade_id,
            "route_type": "insured_shipping",
            "tracking": "SIM-BYPASS-0001",
            "insured": True,
            "declared_insurance_eth": "0.20",
            "policy_gap": "Old no-spendability ABI should now revert.",
        },
        e2e.SELLER_KEY,
        e2e.SELLER,
    )
    result.packets.extend([intent, terms, item_fingerprint, manifest.packet, inventory_lock, route])
    e2e.verify_packets(rpc_url, registry, result.packets)

    result.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.BUYER_KEY,
            contract,
            "create bypass drill trade",
            "createTrade(address,address,uint256,uint256,uint256,bytes32,bytes32,bytes32,address,bytes,bytes)",
            [
                e2e.SELLER,
                e2e.ARBITER,
                e2e.eth("0.03"),
                e2e.eth("0.005"),
                "172800",
                intent.payload_hash,
                terms.payload_hash,
                e2e.judgment_supply_commitment_hash(trade_id, "spendability-bypass-floor"),
                e2e.REPLACEMENT_ARBITER,
                intent.signature,
                terms.signature,
            ],
            value_wei=e2e.eth("0.20"),
        )
    )
    result.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            "seller posts bypass drill bond",
            "acceptAndBond(uint256)",
            [str(trade_id)],
            value_wei=e2e.eth("0.03"),
        )
    )
    result.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            "attach bypass manifest",
            "attachEvidence(uint256,uint8,bytes32,bytes)",
            [str(trade_id), str(e2e.EVIDENCE_KIND["item"]), manifest.packet.payload_hash, manifest.packet.signature],
        )
    )
    result.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            "commit bypass item fingerprint",
            "commitItemFingerprint(uint256,bytes32,bytes)",
            [str(trade_id), item_fingerprint.payload_hash, item_fingerprint.signature],
        )
    )
    result.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            "commit bypass inventory lock",
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
    result.observations.append(
        e2e.expect_tx_revert(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            "direct commitRoute without spendability",
            "commitRoute(uint256,bytes32,bool,bool,uint256,bytes)",
            [
                str(trade_id),
                route.payload_hash,
                "false",
                "true",
                e2e.eth("0.20"),
                route.signature,
            ],
        )
    )

    result.final_state = e2e.call_state(rpc_url, contract, trade_id)
    result.outcome = (
        "bypass_blocked_after_gate_anchor"
        if result.final_state == "EvidencePending"
        else "route_committed_without_spendability"
    )
    result.passed = result.outcome == result.expected
    result.observations.extend(
        [
            "No EvidenceSpendability packet was created.",
            "No validate_spendability_gate call was made before commitRoute.",
            "The contract rejected the old no-spendability route call and left the trade in EvidencePending.",
        ]
    )
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Run current spendability gate bypass drill.")
    parser.add_argument("--port", type=int, default=18546, help="Anvil port to use")
    parser.add_argument("--keep-anvil", action="store_true", help="Leave Anvil running after the drill")
    args = parser.parse_args()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = RUNS / f"spendability_gate_bypass_drill_{timestamp}"
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
        result = run_drill(rpc_url, registry, contract, packet_dir)
        write_report(run_dir, result, registry, contract, rpc_url)
        print(f"Wrote {run_dir / 'REPORT.md'}")
        print(f"{result.title}: outcome={result.outcome} passed={result.passed} final_state={result.final_state}")
        return 0 if result.passed else 1
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
