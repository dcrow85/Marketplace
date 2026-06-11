#!/usr/bin/env python3
"""Continue the active Pokemon alpha trade on the local Anvil escrow."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import protocol_e2e as e2e


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def load_summary(path: Path) -> dict[str, Any]:
    if not path.is_absolute():
        path = e2e.ROOT / path
    return json.loads(path.read_text(encoding="utf-8"))


def packet_hash(summary: dict[str, Any], packet_id: str) -> str:
    for record in summary.get("packets", []):
        if record.get("packet_id") == packet_id:
            return str(record["payload_hash"])
    raise KeyError(packet_id)


def packet_dir_for(summary_path: Path) -> Path:
    if not summary_path.is_absolute():
        summary_path = e2e.ROOT / summary_path
    packet_dir = summary_path.parent / "packets"
    packet_dir.mkdir(parents=True, exist_ok=True)
    return packet_dir


def write_delivery_packet(packet_dir: Path, trade_id: int) -> e2e.PacketRecord:
    return e2e.write_packet(
        packet_dir,
        "alpha_espeon_delivery",
        {
            "schema": "marketplace.delivery_evidence.v0.2",
            "trade_id": trade_id,
            "route_type": "insured_shipping",
            "carrier_or_handoff_method": "simulated_carrier_tracking",
            "tracking_or_memo": "tracking://ALPHA-ESPEON-001",
            "status": "delivered",
            "delivered_at": datetime.now(timezone.utc).isoformat(),
            "route_evidence": [
                {"type": "tracking_event", "ref": "carrier:fixture:delivered"},
                {"type": "insurance_record", "ref": "insurance:fixture:declared-640-usd"},
                {"type": "package_photo", "ref": "seller:fixture:sealed-mailer"},
            ],
            "inspection_window": "opens_on_delivery",
            "not_claiming": ["card_authenticity", "card_condition", "buyer_satisfaction"],
        },
        e2e.SELLER_KEY,
        e2e.SELLER,
    )


def write_delivery_spendability_packet(
    packet_dir: Path,
    trade_id: int,
    delivery: e2e.PacketRecord,
    route_hash: str,
) -> e2e.SpendabilityRecord:
    return e2e.write_spendability_packet(
        packet_dir,
        "alpha_espeon_delivery_spendability",
        trade_id,
        delivery.payload_hash,
        route_hash,
        "delivery_confirmation",
        f"delivery_confirmation:{trade_id}:carrier-delivery",
        "delivery_event",
        "opens_inspection",
        signer_role="seller",
        authority_role="seller",
        after_state="RouteLocked",
        after_event_hash=delivery.payload_hash,
        requires=["delivery_event"],
        not_claiming=["card_authenticity", "card_condition", "buyer_satisfaction"],
    )


def write_acceptance_packet(packet_dir: Path, trade_id: int) -> e2e.PacketRecord:
    return e2e.write_packet(
        packet_dir,
        "alpha_espeon_final_receipt",
        {
            "schema": "marketplace.final_receipt.v0.2",
            "trade_id": trade_id,
            "accepted_by": e2e.SIGNERS["buyer"]["actor_id"],
            "accepted_at": datetime.now(timezone.utc).isoformat(),
            "receipt_type": "buyer_acceptance",
            "result": "buyer_happy_release_escrow",
            "reusable_trust": {
                "seller_completed_route": True,
                "buyer_opened_no_claim": True,
                "attention_fee_credited": True,
            },
            "not_claiming": ["professional_grade", "global_seller_score"],
        },
        e2e.BUYER_KEY,
        e2e.BUYER,
    )


def write_claim_packets(packet_dir: Path, trade_id: int) -> tuple[e2e.PacketRecord, e2e.PacketRecord]:
    evidence = e2e.write_packet(
        packet_dir,
        "alpha_espeon_claim_evidence",
        {
            "schema": "marketplace.claim_evidence.v0.2",
            "trade_id": trade_id,
            "claim_type": "condition_mismatch",
            "inspection_timing": "inside_window",
            "buyer_evidence": [
                {"type": "opening_photo", "ref": "buyer:fixture:package-opened"},
                {"type": "front_surface_photo", "ref": "buyer:fixture:surface-scratch"},
                {"type": "seller_reference_comparison", "ref": "seller_evidence_response:req_surface_01"},
            ],
            "agent_observation": "buyer reports a surface mark not visible in seller photo",
            "not_claiming": ["fraud_intent", "authenticity_failure", "arbiter_ruling"],
        },
        e2e.BUYER_KEY,
        e2e.BUYER,
    )
    claim = e2e.write_packet(
        packet_dir,
        "alpha_espeon_claim",
        {
            "schema": "marketplace.claim.v0.2",
            "trade_id": trade_id,
            "claim_type": "condition_mismatch",
            "opened_by": e2e.SIGNERS["buyer"]["actor_id"],
            "requested_remedy": "arbiter_review_partial_refund_or_return_path",
            "claim_evidence_hash": evidence.payload_hash,
            "buyer_dispute_bond_eth_local_probe": "0.0128",
            "not_claiming": ["seller_bad_faith", "automatic_refund", "authenticity_failure"],
        },
        e2e.BUYER_KEY,
        e2e.BUYER,
    )
    return evidence, claim


def append_report(summary_path: Path, step_receipt: dict[str, Any]) -> str:
    if not summary_path.is_absolute():
        summary_path = e2e.ROOT / summary_path
    report_path = summary_path.parent / f"STEP_{step_receipt['action']}_{utc_stamp()}.md"
    lines = [
        f"# Alpha Trade Step: {step_receipt['action']}",
        "",
        f"- Generated: `{step_receipt['generated_at']}`",
        f"- RPC: `{step_receipt['rpc_url']}`",
        f"- Chain: `anvil:{step_receipt['chain_id']}`",
        f"- Escrow: `{step_receipt['escrow']}`",
        f"- Trade ID: `{step_receipt['trade_id']}`",
        f"- Final state: `{step_receipt['final_state']}`",
        "",
        "## Packets",
        "",
    ]
    for packet in step_receipt["packets"]:
        lines.append(f"- `{packet['packet_id']}`: `{packet['payload_hash']}`")
    lines.extend(["", "## Transactions", ""])
    for tx in step_receipt["transactions"]:
        lines.append(f"- `{tx['label']}`: `{tx['tx_hash']}`")
    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            step_receipt["interpretation"],
            "",
        ]
    )
    report_path.write_text("\n".join(lines), encoding="utf-8")
    return str(report_path.relative_to(e2e.ROOT))


def run_step(action: str, summary_path: Path) -> dict[str, Any]:
    summary = load_summary(summary_path)
    packet_dir = packet_dir_for(summary_path)
    rpc_url = summary["rpc_url"]
    contract = summary["escrow"]
    trade_id = int(summary["trade_id"])
    e2e.wait_for_rpc(rpc_url)

    packets: list[e2e.PacketRecord] = []
    transactions: list[e2e.TxRecord] = []
    interpretation = ""

    if action == "mark-delivered":
        delivery = write_delivery_packet(packet_dir, trade_id)
        route_hash = packet_hash(summary, "alpha_espeon_route")
        delivery_spendability = write_delivery_spendability_packet(
            packet_dir, trade_id, delivery, route_hash
        )
        packets.extend([delivery, delivery_spendability.packet])
        e2e.verify_packets(rpc_url, summary["registry"], packets)
        evm_delivery_spendability = e2e.delivery_spendability_hash(
            rpc_url, contract, trade_id, delivery.payload_hash, e2e.SELLER
        )
        evm_delivery_witness = e2e.delivery_witness_hash(
            rpc_url,
            contract,
            trade_id,
            delivery.payload_hash,
            evm_delivery_spendability,
        )
        transactions.append(
            e2e.send_tx(
                rpc_url,
                e2e.SELLER_KEY,
                contract,
                "alpha Espeon mark delivered",
                "markDelivered(uint256,bytes32,bytes32,bytes32,bytes)",
                [
                    str(trade_id),
                    delivery.payload_hash,
                    evm_delivery_spendability,
                    evm_delivery_witness,
                    delivery.signature,
                ],
            )
        )
        interpretation = (
            "Seller-signed delivery evidence plus the contract-derived typed delivery spendability opened the inspection window. "
            "This proves the delivery gate advanced; it does not prove card condition or buyer satisfaction."
        )
    elif action == "buyer-accept":
        receipt = write_acceptance_packet(packet_dir, trade_id)
        packets.append(receipt)
        e2e.verify_packets(rpc_url, summary["registry"], packets)
        transactions.append(
            e2e.send_tx(
                rpc_url,
                e2e.BUYER_KEY,
                contract,
                "alpha Espeon buyer accepts",
                "buyerAccept(uint256,bytes32,bytes)",
                [str(trade_id), receipt.payload_hash, receipt.signature],
            )
        )
        interpretation = (
            "Buyer acceptance closed the inspection window, released escrow plus seller bond, and "
            "created a reusable final receipt."
        )
    elif action == "open-claim":
        claim_evidence, claim = write_claim_packets(packet_dir, trade_id)
        packets.extend([claim_evidence, claim])
        e2e.verify_packets(rpc_url, summary["registry"], packets)
        transactions.append(
            e2e.send_tx(
                rpc_url,
                e2e.BUYER_KEY,
                contract,
                "alpha Espeon attach claim evidence",
                "attachEvidence(uint256,uint8,bytes32,bytes)",
                [
                    str(trade_id),
                    str(e2e.EVIDENCE_KIND["claim"]),
                    claim_evidence.payload_hash,
                    claim_evidence.signature,
                ],
            )
        )
        transactions.append(
            e2e.send_tx(
                rpc_url,
                e2e.BUYER_KEY,
                contract,
                "alpha Espeon open condition claim",
                "openClaim(uint256,bytes32,bytes)",
                [str(trade_id), claim.payload_hash, claim.signature],
                value_wei=e2e.eth("0.0128"),
            )
        )
        interpretation = (
            "Buyer claim evidence and the dispute bond moved the escrow into ClaimOrDisputePending. "
            "The protocol has preserved the dispute surface; it has not decided who is right."
        )
    else:
        raise ValueError(f"unknown alpha step: {action}")

    final_state = e2e.call_state(rpc_url, contract, trade_id)
    step_receipt = {
        "run_id": summary["run_id"],
        "action": action,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "rpc_url": rpc_url,
        "chain_id": summary["chain_id"],
        "anvil_pid": summary.get("anvil_pid"),
        "escrow": contract,
        "trade_id": trade_id,
        "final_state": final_state,
        "packets": [asdict(packet) for packet in packets],
        "transactions": [asdict(tx) for tx in transactions],
        "interpretation": interpretation,
    }
    step_receipt["report"] = append_report(summary_path, step_receipt)

    summary.setdefault("continuation_steps", []).append(step_receipt)
    summary["final_state"] = final_state
    write_json(summary_path if summary_path.is_absolute() else e2e.ROOT / summary_path, summary)
    print(json.dumps(step_receipt, sort_keys=True))
    return step_receipt


def main() -> int:
    parser = argparse.ArgumentParser(description="Continue active alpha trade on local Anvil.")
    parser.add_argument("--summary", required=True)
    parser.add_argument("--action", required=True, choices=["mark-delivered", "buyer-accept", "open-claim"])
    args = parser.parse_args()
    run_step(args.action, Path(args.summary))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
