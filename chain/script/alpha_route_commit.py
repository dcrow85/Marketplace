#!/usr/bin/env python3
"""Commit the active Pokemon alpha route to a local Anvil escrow.

This is the bridge from the human-facing alpha UI into the local money rail.
The active server supplies the wall-bundle and spendability hashes it already
showed the buyer. This runner creates a fresh local escrow, commits the item
fingerprint and inventory lock, then commits route with those exact route-gate
hashes.
"""

from __future__ import annotations

import argparse
import json
import signal
import subprocess
import sys
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import protocol_e2e as e2e


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_protocol_packets(packet_dir: Path, args: argparse.Namespace) -> dict[str, e2e.PacketRecord]:
    trade_id = 1
    intent = e2e.write_packet(
        packet_dir,
        "alpha_espeon_intent",
        {
            "schema": "marketplace.intent.v0.2",
            "intent_id": "alpha-espeon-001",
            "buyer": e2e.SIGNERS["buyer"]["actor_id"],
            "buyer_agent": "did:market:agent:alpha-ui-buyer",
            "object": {
                "domain": "tcg",
                "game": "pokemon",
                "card": "Neo Discovery Espeon #1",
                "condition_floor": "LP",
            },
            "cost_field": {
                "max_total_price_usd": 640,
                "buyer_attention_budget": "medium",
                "route_gate": "requires_wall_bundle_and_spendability",
            },
        },
        e2e.BUYER_KEY,
        e2e.BUYER,
    )
    terms = e2e.write_packet(
        packet_dir,
        "alpha_espeon_terms",
        {
            "schema": "marketplace.escrow_terms.v0.2",
            "trade_id": trade_id,
            "price_eth_local_probe": "0.64",
            "seller_bond_eth_local_probe": "0.08",
            "buyer_dispute_bond_eth_local_probe": "0.0128",
            "inspection_seconds": 172800,
            "selected_arbiter": e2e.SIGNERS["arbiter"]["actor_id"],
            "release_gate": "buyer_accepts_or_claim_resolves",
            "route_gate": {
                "wall_bundle_hash": args.wall_bundle_hash,
                "assembly_history_hash": args.assembly_history_hash,
                "route_assembly_witness_hash": "computed_by_contract_at_route_commit",
                "route_spendability_hash": args.route_spendability_hash,
                "route_spendability_evm_hash": args.route_spendability_evm_hash,
            },
        },
        e2e.BUYER_KEY,
        e2e.BUYER,
    )
    item_fingerprint = e2e.write_packet(
        packet_dir,
        "alpha_espeon_item_fingerprint",
        {
            "schema": "marketplace.item_fingerprint.v0.2",
            "trade_id": trade_id,
            "identity_claim": {
                "domain": "tcg",
                "game": "pokemon",
                "card": "Neo Discovery Espeon #1",
                "condition_claim": "LP or better",
            },
            "evidence_refs": [
                {"type": "front_photo", "ref": "pokemon-tcg-api:neo2/1_hires"},
                {"type": "surface_angle_request", "ref": "seller_evidence_response:req_surface_01"},
            ],
            "correlation_method": ["catalog_reference", "seller_photo_packet", "buyer_agent_judgment"],
            "not_claiming": ["authenticity", "professional_grade", "delivery_success"],
        },
        e2e.SELLER_KEY,
        e2e.SELLER,
    )
    inventory_lock = e2e.write_packet(
        packet_dir,
        "alpha_espeon_inventory_lock",
        {
            "schema": "marketplace.inventory_lock.v0.2",
            "trade_id": trade_id,
            "seller": e2e.SIGNERS["seller"]["actor_id"],
            "item_fingerprint_hash": item_fingerprint.payload_hash,
            "inventory_key": "tcg:pokemon:neo-discovery-espeon-alpha-001",
            "lock_scope": "single_unique_card",
            "external_availability": "seller_promises_no_external_sale_while_route_locked",
        },
        e2e.SELLER_KEY,
        e2e.SELLER,
    )
    route = e2e.write_packet(
        packet_dir,
        "alpha_espeon_route",
        {
            "schema": "marketplace.trade_route.v0.2",
            "trade_id": trade_id,
            "route_type": "insured_shipping",
            "carrier_or_handoff_method": "simulated_carrier_tracking",
            "tracking_or_memo": "tracking://ALPHA-ESPEON-001",
            "insured": True,
            "declared_value_usd": 640,
            "declared_insurance_eth_local_probe": "0.64",
            "wall_bundle_hash": args.wall_bundle_hash,
            "assembly_history_hash": args.assembly_history_hash,
            "route_spendability_hash": args.route_spendability_hash,
            "route_spendability_evm_hash": args.route_spendability_evm_hash,
        },
        e2e.SELLER_KEY,
        e2e.SELLER,
    )
    return {
        "intent": intent,
        "terms": terms,
        "item_fingerprint": item_fingerprint,
        "inventory_lock": inventory_lock,
        "route": route,
    }


def run_commit(args: argparse.Namespace, run_dir: Path, packet_dir: Path) -> dict[str, Any]:
    rpc_url = f"http://127.0.0.1:{args.port}"
    anvil_log = (run_dir / "anvil.log").open("w", encoding="utf-8")
    anvil = subprocess.Popen(
        ["anvil", "--chain-id", "31337", "--port", str(args.port), "--silent"],
        cwd=e2e.CHAIN,
        env=e2e.ENV,
        stdout=anvil_log,
        stderr=subprocess.STDOUT,
        text=True,
        start_new_session=args.keep_anvil,
    )

    try:
        e2e.wait_for_rpc(rpc_url)
        e2e.run(["forge", "build"])
        registry = e2e.deploy_registry(rpc_url)
        predicate_verifier = e2e.deploy_predicate_verifier(rpc_url)
        registry_setup = e2e.setup_registry(rpc_url, registry, predicate_verifier, packet_dir)
        contract = e2e.deploy_escrow(rpc_url, registry)
        packets = write_protocol_packets(packet_dir, args)
        packet_records = list(packets.values())
        e2e.verify_packets(rpc_url, registry, packet_records)
        trade_id = 1
        wall_bundle_evm_ref = e2e.keccak_payload(
            {"schema": "marketplace.wall_bundle_evm_ref.v0.1", "value": args.wall_bundle_hash}
        )
        assembly_history_evm_ref = e2e.keccak_payload(
            {
                "schema": "marketplace.assembly_history_evm_ref.v0.1",
                "value": args.assembly_history_hash,
            }
        )
        transactions = []
        transactions.append(
            e2e.send_tx(
                rpc_url,
                e2e.BUYER_KEY,
                contract,
                "create alpha Espeon trade",
                "createTrade(address,address,uint256,uint256,uint256,bytes32,bytes32,bytes32,address,bytes,bytes)",
                [
                    e2e.SELLER,
                    e2e.ARBITER,
                    e2e.eth("0.08"),
                    e2e.eth("0.0128"),
                    "172800",
                    packets["intent"].payload_hash,
                    packets["terms"].payload_hash,
                    e2e.judgment_supply_commitment_hash(trade_id, "alpha-espeon-floor"),
                    e2e.REPLACEMENT_ARBITER,
                    packets["intent"].signature,
                    packets["terms"].signature,
                ],
                value_wei=e2e.eth("0.64"),
            )
        )
        transactions.append(
            e2e.send_tx(
                rpc_url,
                e2e.SELLER_KEY,
                contract,
                "seller posts alpha Espeon bond",
                "acceptAndBond(uint256)",
                [str(trade_id)],
                value_wei=e2e.eth("0.08"),
            )
        )
        transactions.append(
            e2e.send_tx(
                rpc_url,
                e2e.SELLER_KEY,
                contract,
                "commit alpha Espeon item fingerprint",
                "commitItemFingerprint(uint256,bytes32,bytes)",
                [str(trade_id), packets["item_fingerprint"].payload_hash, packets["item_fingerprint"].signature],
            )
        )
        transactions.append(
            e2e.send_tx(
                rpc_url,
                e2e.SELLER_KEY,
                contract,
                "commit alpha Espeon inventory lock",
                "commitInventoryLock(uint256,bytes32,bytes32,bytes)",
                [
                    str(trade_id),
                    packets["inventory_lock"].payload_hash,
                    packets["item_fingerprint"].payload_hash,
                    e2e.sign_inventory_lock_binding(
                        rpc_url,
                        contract,
                        trade_id,
                        packets["inventory_lock"].payload_hash,
                        packets["item_fingerprint"].payload_hash,
                        e2e.SELLER_KEY,
                    ),
                ],
            )
        )
        evm_route_spendability = e2e.route_spendability_hash(
            rpc_url,
            contract,
            trade_id,
            packets["route"].payload_hash,
            wall_bundle_evm_ref,
            assembly_history_evm_ref,
            e2e.SELLER,
        )
        route_assembly_witness_hash = e2e.route_assembly_witness_hash(
            rpc_url,
            contract,
            trade_id,
            packets["route"].payload_hash,
            evm_route_spendability,
            wall_bundle_evm_ref,
            assembly_history_evm_ref,
        )
        transactions.append(
            e2e.send_tx(
                rpc_url,
                e2e.SELLER_KEY,
                contract,
                "commit alpha Espeon route with wall bundle spendability",
                "commitRoute(uint256,bytes32,bytes32,bytes32,bytes32,bytes32,bool,bool,uint256,bytes)",
                [
                    str(trade_id),
                    packets["route"].payload_hash,
                    evm_route_spendability,
                    wall_bundle_evm_ref,
                    assembly_history_evm_ref,
                    route_assembly_witness_hash,
                    "false",
                    "true",
                    e2e.eth("0.64"),
                    packets["route"].signature,
                ],
            )
        )
        final_state = e2e.call_state(rpc_url, contract, trade_id)
        receipt = {
            "run_id": run_dir.name,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "rpc_url": rpc_url,
            "chain_id": 31337,
            "ephemeral_anvil": not args.keep_anvil,
            "anvil_pid": anvil.pid if args.keep_anvil else None,
            "registry": registry,
            "predicate_verifier": predicate_verifier,
            "escrow": contract,
            "trade_id": trade_id,
            "final_state": final_state,
            "route_tx_hash": transactions[-1].tx_hash,
            "wall_bundle_hash": args.wall_bundle_hash,
            "assembly_history_hash": args.assembly_history_hash,
            "wall_bundle_evm_ref": wall_bundle_evm_ref,
            "assembly_history_evm_ref": assembly_history_evm_ref,
            "route_assembly_witness_hash": route_assembly_witness_hash,
            "route_spendability_hash": args.route_spendability_hash,
            "route_spendability_evm_hash": evm_route_spendability,
            "ui_route_spendability_evm_hint": args.route_spendability_evm_hash,
            "packets": [asdict(record) for record in packet_records],
            "registry_packets": [asdict(record) for record in registry_setup.packets],
            "transactions": [asdict(record) for record in transactions],
            "registry_transactions": [asdict(record) for record in registry_setup.transactions],
            "report": str((run_dir / "REPORT.md").relative_to(e2e.ROOT)),
            "summary": str((run_dir / "summary.json").relative_to(e2e.ROOT)),
        }
        if final_state != "RouteLocked":
            raise RuntimeError(f"alpha route ended in {final_state}, expected RouteLocked")
        return receipt
    finally:
        if args.keep_anvil:
            print(f"Anvil left running at {rpc_url} with pid {anvil.pid}", file=sys.stderr)
        else:
            anvil.send_signal(signal.SIGTERM)
            try:
                anvil.wait(timeout=5)
            except subprocess.TimeoutExpired:
                anvil.kill()
                anvil.wait(timeout=5)
        anvil_log.close()


def write_report(run_dir: Path, receipt: dict[str, Any]) -> None:
    write_json(run_dir / "summary.json", receipt)
    lines = [
        f"# Alpha Route Commit: {run_dir.name}",
        "",
        f"- Generated: `{receipt['generated_at']}`",
        f"- RPC: `{receipt['rpc_url']}`",
        f"- Chain: `anvil:{receipt['chain_id']}`",
        f"- Anvil PID: `{receipt['anvil_pid'] or 'stopped after route commit'}`",
        f"- Escrow: `{receipt['escrow']}`",
        f"- Trade ID: `{receipt['trade_id']}`",
        f"- Final state: `{receipt['final_state']}`",
        f"- Route tx: `{receipt['route_tx_hash']}`",
        "",
        "## Route Gate",
        "",
        f"- Wall bundle hash: `{receipt['wall_bundle_hash']}`",
        f"- Assembly history hash: `{receipt['assembly_history_hash']}`",
        f"- Wall bundle EVM ref: `{receipt['wall_bundle_evm_ref']}`",
        f"- Assembly history EVM ref: `{receipt['assembly_history_evm_ref']}`",
        f"- Route assembly witness hash: `{receipt['route_assembly_witness_hash']}`",
        f"- Route spendability hash: `{receipt['route_spendability_hash']}`",
        f"- Route spendability EVM hash: `{receipt['route_spendability_evm_hash']}`",
        "",
        "## Transactions",
        "",
    ]
    for tx in receipt["transactions"]:
        lines.append(f"- `{tx['label']}`: `{tx['tx_hash']}`")
    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            "The UI-approved wall bundle and assembly history were carried into `commitRoute`, while the spendability value was the contract-derived typed digest for this route gate. The escrow reached `RouteLocked`; this does not prove authenticity, card condition, or delivery success.",
            "",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Commit active alpha route to local Anvil.")
    parser.add_argument("--wall-bundle-hash", required=True)
    parser.add_argument("--assembly-history-hash", required=True)
    parser.add_argument("--route-assembly-witness-hash", default="")
    parser.add_argument("--route-spendability-hash", required=True)
    parser.add_argument("--route-spendability-evm-hash", required=True)
    parser.add_argument("--port", type=int, default=18549)
    parser.add_argument("--keep-anvil", action="store_true")
    args = parser.parse_args()

    run_dir = e2e.RUNS / f"alpha_route_commit_{utc_stamp()}"
    packet_dir = run_dir / "packets"
    packet_dir.mkdir(parents=True, exist_ok=True)
    receipt = run_commit(args, run_dir, packet_dir)
    write_report(run_dir, receipt)
    print(json.dumps(receipt, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"alpha route commit failed: {exc}", file=sys.stderr)
        raise
