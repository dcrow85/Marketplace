#!/usr/bin/env python3
"""Replay selected agent-market simulation trades against local Anvil.

The large simulation produces rich off-chain intent, evidence, route, and
arbitration paths. This runner picks a varied subset, converts each into
fresh signed protocol packets, anchors those packet hashes in MarketplaceEscrow,
and settles every replayable trade on a local EVM.
"""

from __future__ import annotations

import argparse
import json
import signal
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, ROUND_UP
from pathlib import Path
from typing import Any

import protocol_e2e as e2e


DEFAULT_TRADE_IDS = [
    "SIM-0003",  # clean close, low value, international/insured route
    "SIM-0016",  # automated direct minor-condition ruling
    "SIM-0137",  # automated direct insured-lost hold
    "SIM-0025",  # automated policy escalates uninsured lost route gap
    "SIM-0069",  # automated policy escalates material misdescription
    "SIM-0194",  # arbiter-agent delegated condition ruling
    "SIM-0030",  # high-value underinsured loss
    "SIM-0087",  # grail, new seller, nonship surrogate
    "SIM-0088",  # high-value authenticity flag
    "SIM-0018",  # local handoff dispute
]

ROUTE_FAILURE_OUTCOMES = {
    "insured_lost",
    "uninsured_lost",
    "underinsured_lost",
    "seller_nonship",
}

VERIFIER_REVIEW_SCOPES = ["packet_completeness", "raw_card_identity"]
VERIFIER_REVIEW_METHOD_ID = "tcg.raw.photo_packet_review.v0.1"
ROUTE_COMMIT_ABI = (
    "commitRoute(uint256,bytes32,bytes32,bytes32,bytes32,bytes32,bool,bool,uint256,bytes)"
)


@dataclass
class ReplayAmounts:
    price_eth: Decimal
    seller_bond_eth: Decimal
    dispute_bond_eth: Decimal
    declared_insurance_eth: Decimal


@dataclass
class ReplayTradeResult:
    source_trade_id: str
    evm_trade_id: int
    final_state: str
    value_band: str
    value_usd: int
    route: str
    insured: bool
    seller_trust: str
    selected_arbiter: str
    arbitration_mode: str
    outcome: str
    friction_triggers: list[str]
    remedy: dict[str, Any]
    amount_model: dict[str, str]
    packets: list[e2e.PacketRecord] = field(default_factory=list)
    transactions: list[e2e.TxRecord] = field(default_factory=list)
    observations: list[str] = field(default_factory=list)


def decimal_to_wei(amount: Decimal) -> str:
    return str(int(amount * Decimal(10**18)))


def money(amount: Decimal) -> str:
    quantized = amount.quantize(Decimal("0.000001"), rounding=ROUND_UP)
    return format(quantized, "f").rstrip("0").rstrip(".")


def route_spendability_hash(
    source_trade_id: str,
    evm_trade_id: int,
    route: e2e.PacketRecord,
    row: dict[str, Any] | None = None,
) -> str:
    wall_bundle_hash = route_wall_bundle_root(evm_trade_id, route)
    assembly_history_hash = route_assembly_history_hash(evm_trade_id, route)
    source_hash = None
    if row:
        source_hash = row.get("wall", {}).get("route_spendability_evm_hash")
    payload = {
        "schema": "marketplace.synthetic_route_spendability.v0.2",
        "source_trade_id": source_trade_id,
        "trade_id": evm_trade_id,
        "gate_type": "route_commitment",
        "gate_id": f"route_commitment:{evm_trade_id}:{source_trade_id}",
        "route_hash": route.payload_hash,
        "wall_bundle_hash": wall_bundle_hash,
        "assembly_history_hash": assembly_history_hash,
        "spend_limit": "blocks_or_unblocks_gate",
    }
    if source_hash:
        payload["source_route_spendability_hint"] = source_hash
    return e2e.keccak_payload(payload)


def route_wall_bundle_root(evm_trade_id: int, route: e2e.PacketRecord) -> str:
    return e2e.route_wall_bundle_root(evm_trade_id, route.payload_hash)


def route_assembly_history_hash(evm_trade_id: int, route: e2e.PacketRecord) -> str:
    return e2e.route_assembly_history_hash(
        evm_trade_id,
        route.payload_hash,
        route_wall_bundle_root(evm_trade_id, route),
    )


def route_assembly_witness_hash(
    rpc_url: str,
    contract: str,
    source_trade_id: str,
    evm_trade_id: int,
    route: e2e.PacketRecord,
    row: dict[str, Any] | None = None,
) -> str:
    wall_bundle_hash = route_wall_bundle_root(evm_trade_id, route)
    assembly_history_hash = route_assembly_history_hash(evm_trade_id, route)
    return e2e.route_assembly_witness_hash(
        rpc_url,
        contract,
        evm_trade_id,
        route.payload_hash,
        route_spendability_hash(source_trade_id, evm_trade_id, route, row),
        wall_bundle_hash,
        assembly_history_hash,
    )


def route_commit_args(
    rpc_url: str,
    contract: str,
    source_trade_id: str,
    evm_trade_id: int,
    route: e2e.PacketRecord,
    row: dict[str, Any] | None,
    *,
    in_person_allowed: bool,
    insured: bool,
    declared_insurance_eth: Decimal,
) -> list[str]:
    wall_bundle_hash = route_wall_bundle_root(evm_trade_id, route)
    assembly_history_hash = route_assembly_history_hash(evm_trade_id, route)
    evm_route_spendability = e2e.route_spendability_hash(
        rpc_url,
        contract,
        evm_trade_id,
        route.payload_hash,
        wall_bundle_hash,
        assembly_history_hash,
        e2e.SELLER,
    )
    evm_route_witness = e2e.route_assembly_witness_hash(
        rpc_url,
        contract,
        evm_trade_id,
        route.payload_hash,
        evm_route_spendability,
        wall_bundle_hash,
        assembly_history_hash,
    )
    return [
        str(evm_trade_id),
        route.payload_hash,
        evm_route_spendability,
        wall_bundle_hash,
        assembly_history_hash,
        evm_route_witness,
        str(in_person_allowed).lower(),
        str(insured).lower(),
        decimal_to_wei(declared_insurance_eth),
        route.signature,
    ]


def delivery_spendability_hash(
    source_trade_id: str,
    evm_trade_id: int,
    delivery: e2e.PacketRecord,
) -> str:
    return e2e.keccak_payload(
        {
            "schema": "marketplace.synthetic_delivery_spendability.v0.1",
            "source_trade_id": source_trade_id,
            "trade_id": evm_trade_id,
            "gate_type": "delivery_confirmation",
            "gate_id": f"delivery_confirmation:{evm_trade_id}:{source_trade_id}",
            "delivery_hash": delivery.payload_hash,
            "spend_limit": "opens_inspection",
        }
    )


def latest_agent_market_run() -> Path:
    candidates = sorted(
        candidate
        for candidate in e2e.RUNS.glob("agent_market_*")
        if (candidate / "trades.jsonl").exists()
    )
    if not candidates:
        raise RuntimeError(
            "no agent_market_* run with trades.jsonl found under /Users/che/Marketplace/runs"
        )
    return candidates[-1]


def load_selected_trades(source_run: Path, trade_ids: list[str]) -> list[dict[str, Any]]:
    requested = set(trade_ids)
    by_id: dict[str, dict[str, Any]] = {}
    trades_path = source_run / "trades.jsonl"
    if not trades_path.exists():
        raise RuntimeError(f"missing simulation trades file: {trades_path}")

    for line in trades_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        trade_id = row["trade"]["trade_id"]
        if trade_id in requested:
            by_id[trade_id] = row

    missing = [trade_id for trade_id in trade_ids if trade_id not in by_id]
    if missing:
        raise RuntimeError(f"selected simulation trades were not found: {', '.join(missing)}")

    return [by_id[trade_id] for trade_id in trade_ids]


def amount_model(trade: dict[str, Any]) -> ReplayAmounts:
    price = max(Decimal(trade["value"]) / Decimal(1000), Decimal("0.02"))

    configured_bond_bps = int(trade.get("seller_bond_bps") or 0)
    seller_bond = price * Decimal(configured_bond_bps) / Decimal(10_000)
    if seller_bond == 0:
        seller_bond = Decimal("0.005")

    dispute_bond = price * Decimal("0.02")
    dispute_bond = min(max(dispute_bond, Decimal("0.003")), Decimal("0.05"))

    declared_insurance = Decimal(0)
    if trade.get("insured"):
        insurance_amount = Decimal(trade.get("insurance_amount") or 0)
        if insurance_amount <= 0:
            insurance_amount = Decimal(trade["value"])
        declared_insurance = max(price * insurance_amount / Decimal(trade["value"]), Decimal("0.001"))

    return ReplayAmounts(
        price_eth=price,
        seller_bond_eth=seller_bond,
        dispute_bond_eth=dispute_bond,
        declared_insurance_eth=declared_insurance,
    )


def packet(
    packet_dir: Path,
    row: dict[str, Any],
    suffix: str,
    schema: str,
    signer_role: str,
    body: dict[str, Any],
) -> e2e.PacketRecord:
    signer = e2e.SIGNERS[signer_role]
    trade_id = row["trade"]["trade_id"].lower().replace("-", "_")
    payload = {
        "schema": schema,
        "source_simulation_trade": row["trade"]["trade_id"],
        "source_simulation_hashes": {
            "intent": row["plan"].get("buyer_intent_hash"),
            "seller_offer": row["plan"].get("seller_offer_hash"),
            "escrow_terms": row["plan"].get("escrow_terms_hash"),
            "friction_policy": row["plan"].get("friction_policy_hash"),
            "automated_policy": row["plan"].get("automated_policy_hash"),
        },
        **body,
    }
    return e2e.write_packet(
        packet_dir,
        f"{trade_id}_{suffix}",
        payload,
        signer["key"],
        signer["address"],
    )


def build_packets(packet_dir: Path, row: dict[str, Any], amounts: ReplayAmounts) -> dict[str, e2e.PacketRecord]:
    trade = row["trade"]
    plan = row["plan"]
    resolution = row["resolution"]

    selected_arbiter = plan["selected_arbiter"]
    automation_selected = selected_arbiter == "did:market:arbiter:auto-low-tcg-1"

    item_fingerprint = packet(
        packet_dir,
        row,
        "item_fingerprint",
        "marketplace.item_fingerprint.v0.2",
        "seller",
        {
            "identity_claim": {
                "domain": "tcg",
                "game": "pokemon",
                "card": trade["card"],
                "condition_claim": trade["condition_claim"],
                "value_band": trade["value_band"],
            },
            "evidence_refs": [
                {"type": "seller_offer", "ref": "seller_offer"},
                {"type": "front_photo", "ref": f"{trade['trade_id'].lower()}-front-photo-hash"},
                {"type": "back_photo", "ref": f"{trade['trade_id'].lower()}-back-photo-hash"},
            ],
            "correlation_method": ["visual_match", "seller_custody_nonce"],
            "confidence_scope": (
                "high_for_graded_or_rich_evidence"
                if trade["evidence_tier"] in {"graded_scan", "high"}
                else "bounded_for_raw_card_identity"
            ),
            "challenge_hooks": ["fresh_timestamped_photo", "verifier_review"],
            "privacy_policy": "buyer_arbiter_and_registered_verifier",
        },
    )

    packets = {
        "intent": packet(
            packet_dir,
            row,
            "intent",
            "marketplace.intent.v0.2",
            "buyer",
            {
                "buyer": e2e.SIGNERS["buyer"]["actor_id"],
                "buyer_agent": "did:market:agent:buyer-replay",
                "object": {
                    "domain": "tcg",
                    "game": "pokemon",
                    "card": trade["card"],
                    "condition_floor": trade["condition_claim"],
                },
                "cost_field": {
                    "value_band": trade["value_band"],
                    "max_total_price_usd": trade["value"],
                    "buyer_attention_budget": trade["buyer_attention_budget"],
                    "condition_sensitivity": trade["condition_sensitivity"],
                    "risk_tolerance": trade["buyer_risk_tolerance"],
                    "route_preferences": [trade["route"]],
                    "evidence_floor": plan["evidence_required"],
                },
            },
        ),
        "terms": packet(
            packet_dir,
            row,
            "escrow_terms",
            "marketplace.escrow_terms.v0.2",
            "buyer",
            {
                "trade_template": "tcg_single_card",
                "price_eth_local_probe": money(amounts.price_eth),
                "source_value_usd": trade["value"],
                "seller_bond_eth_local_probe": money(amounts.seller_bond_eth),
                "buyer_dispute_bond_eth_local_probe": money(amounts.dispute_bond_eth),
                "inspection_seconds": inspection_seconds(trade["value_band"]),
                "selected_arbiter": selected_arbiter,
                "selected_arbiter_controller_for_local_evm": e2e.ARBITER,
                "escrow_model": "on_chain_native_eth_local_probe",
                "release_gate": "buyer_accepts_or_claim_resolves",
            },
        ),
        "seller_offer": packet(
            packet_dir,
            row,
            "seller_offer",
            "marketplace.seller_offer.v0.2",
            "seller",
            {
                "seller": e2e.SIGNERS["seller"]["actor_id"],
                "seller_trust": trade["seller_trust"],
                "seller_attention_budget": trade["seller_attention_budget"],
                "card": trade["card"],
                "condition_claim": trade["condition_claim"],
                "route_offered": trade["route"],
                "evidence_tier": trade["evidence_tier"],
                "seller_bond_bps_from_sim": trade["seller_bond_bps"],
                "seller_bond_eth_local_probe": money(amounts.seller_bond_eth),
            },
        ),
        "item_fingerprint": item_fingerprint,
        "inventory_lock": packet(
            packet_dir,
            row,
            "inventory_lock",
            "marketplace.inventory_lock.v0.2",
            "seller",
            {
                "seller": e2e.SIGNERS["seller"]["actor_id"],
                "item_fingerprint_hash": item_fingerprint.payload_hash,
                "inventory_key": f"tcg:pokemon:{trade['trade_id'].lower()}",
                "lock_scope": "single_unique_card",
                "card": trade["card"],
                "condition_claim": trade["condition_claim"],
                "visible_identifiers": [
                    f"{trade['trade_id'].lower()}-front-photo-hash",
                    f"{trade['trade_id'].lower()}-back-photo-hash",
                ],
                "seller_attestation": "this unique card is reserved for this escrow while active",
            },
        ),
        "arbiter_candidates": packet(
            packet_dir,
            row,
            "arbiter_candidates",
            "marketplace.arbiter_candidate_set.v0.2",
            "buyer",
            {
                "selected": selected_arbiter,
                "backup_arbiters": plan["backup_arbiters"],
                "local_evm_controller_mapping": {
                    selected_arbiter: e2e.ARBITER,
                    "did:market:arbiter:replacement-local": e2e.REPLACEMENT_ARBITER,
                },
                "buyer_aperture": {
                    "seller_trust": trade["seller_trust"],
                    "value_band": trade["value_band"],
                    "route": trade["route"],
                },
            },
        ),
        "friction_policy": packet(
            packet_dir,
            row,
            "friction_policy",
            "marketplace.friction_policy.v0.2",
            "buyer",
            {
                "expected_buyer_attention_minutes": plan["expected_buyer_attention_minutes"],
                "expected_seller_attention_minutes": plan["expected_seller_attention_minutes"],
                "human_gates_before_lock": plan["human_gates_before_lock"],
                "friction_triggers_observed": resolution["friction_triggers"],
                "automation_escalation_required": resolution["arbitration_mode"]
                == "automated_escalated_to_human",
            },
        ),
        "item_evidence": packet(
            packet_dir,
            row,
            "item_evidence",
            "marketplace.evidence_packet.v0.2",
            "seller",
            {
                "evidence_tier": trade["evidence_tier"],
                "required_evidence": plan["evidence_required"],
                "card": trade["card"],
                "condition_claim": trade["condition_claim"],
                "seller_disclosures": simulated_packet_summaries(resolution, "marketplace.evidence_packet.v0.2"),
                "media_manifest": [
                    {"type": "front_photo", "availability": "simulated"},
                    {"type": "back_photo", "availability": "simulated"},
                    {"type": "flaw_callout", "availability": "simulated"}
                    if "flaw_callouts" in plan["evidence_required"]
                    else {"type": "flaw_callout", "availability": "not_required"},
                ],
            },
        ),
        "route": packet(
            packet_dir,
            row,
            "route",
            "marketplace.route_packet.v0.2",
            "seller",
            {
                "route": trade["route"],
                "distance": trade["distance"],
                "in_person_allowed": in_person_route(trade["route"]),
                "insured": trade["insured"],
                "insurance_amount_usd": trade["insurance_amount"],
                "declared_insurance_eth_local_probe": money(amounts.declared_insurance_eth),
                "tracking_or_memo": route_reference(trade["route"]),
                "shipping_evidence": route_evidence(trade),
            },
        ),
    }

    verifier_scope_hash = e2e.scope_set_hash(VERIFIER_REVIEW_SCOPES)
    verifier_method_hash = e2e.method_id_hash(VERIFIER_REVIEW_METHOD_ID)
    packets["verifier_scope_approval"] = packet(
        packet_dir,
        row,
        "verifier_scope_approval",
        "marketplace.verifier_scope_approval.v0.1",
        "buyer",
        {
            "buyer": e2e.SIGNERS["buyer"]["actor_id"],
            "verifier": e2e.SIGNERS["verifier"]["actor_id"],
            "scope": VERIFIER_REVIEW_SCOPES,
            "scope_set_hash": verifier_scope_hash,
            "limits": ["packet_review_only", "not_authenticity", "not_shipping"],
        },
    )
    verifier_payload = {
        "schema": "marketplace.verifier_scope_attestation.v0.1",
        "source_simulation_trade": row["trade"]["trade_id"],
        "source_simulation_hashes": {
            "intent": row["plan"].get("buyer_intent_hash"),
            "seller_offer": row["plan"].get("seller_offer_hash"),
            "escrow_terms": row["plan"].get("escrow_terms_hash"),
            "friction_policy": row["plan"].get("friction_policy_hash"),
            "automated_policy": row["plan"].get("automated_policy_hash"),
        },
        "verifier": e2e.SIGNERS["verifier"]["actor_id"],
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "subject": {
            "subject_type": "evidence_packet",
            "subject_hash": packets["item_evidence"].payload_hash,
        },
        "scope": VERIFIER_REVIEW_SCOPES,
        "scope_set_hash": verifier_scope_hash,
        "method": {
            "method_id": VERIFIER_REVIEW_METHOD_ID,
            "method_id_hash": verifier_method_hash,
            "summary": "Compared the submitted item evidence packet against the raw-card identity claim.",
        },
        "verification_model": "remote_self_reported",
        "inputs_seen": [
            {"kind": "front_photo", "hash": f"{trade['trade_id'].lower()}-front-photo-hash"},
            {"kind": "back_photo", "hash": f"{trade['trade_id'].lower()}-back-photo-hash"},
        ],
        "inputs_not_seen": [
            "in_person_card_inspection",
            "shipping_packaging",
            "post_review_custody",
        ],
        "claim": {
            "positive": [verifier_opinion(row)],
            "negative": [
                "This does not authenticate the card.",
                "This does not verify packaging, shipping, or delivery condition.",
            ],
            "known_conflicts": resolution["friction_triggers"],
        },
        "challenge": {
            "hooks": ["fresh_nonce_photo", "arbiter_review"],
            "failure_policy": "separate_buyer_waiver_required",
        },
        "display": {
            "label": "Item packet checked",
            "short_warning": "Not an authenticity guarantee.",
        },
    }
    e2e.validate_verifier_scope_attestation(verifier_payload)
    packets["verifier_note"] = e2e.write_packet(
        packet_dir,
        f"{trade['trade_id'].lower().replace('-', '_')}_verifier_note",
        verifier_payload,
        e2e.VERIFIER_KEY,
        e2e.VERIFIER,
    )

    if resolution["outcome"] not in ROUTE_FAILURE_OUTCOMES:
        packets["delivery"] = packet(
            packet_dir,
            row,
            "delivery",
            "marketplace.delivery_evidence.v0.2",
            "seller",
            {
                "route": trade["route"],
                "delivered": True,
                "delivery_signal": "handoff_memo"
                if in_person_route(trade["route"])
                else "carrier_delivery_scan",
                "tracking_or_memo": route_reference(trade["route"]),
            },
        )

    if automation_selected:
        packets["automation_policy"] = packet(
            packet_dir,
            row,
            "automation_policy",
            "marketplace.automated_arbiter_policy.v0.2",
            "buyer",
            {
                "selected_arbiter": selected_arbiter,
                "authority": "low_value_tcg_policy",
                "max_direct_refund_bps": 2000,
                "max_direct_bond_penalty_bps": 0,
                "friction_thresholds": [
                    "authenticity_or_identity_risk",
                    "seller_trust_gap",
                    "route_gap_owner_review",
                    "refund_above_auto_cap",
                    "bond_penalty_above_auto_cap",
                ],
                "direct_automation_permitted": resolution["arbitration_mode"] == "automated",
            },
        )

    if resolution["outcome"] == "clean_close":
        packets["receipt"] = packet(
            packet_dir,
            row,
            "receipt",
            "marketplace.trade_receipt.v0.2",
            "buyer",
            {
                "result": "accepted",
                "buyer_confirmation": "card roughly matched intent and evidence packet",
                "settlement": resolution["escrow_action"],
            },
        )
    else:
        packets["claim_evidence"] = packet(
            packet_dir,
            row,
            "claim_evidence",
            "marketplace.claim_evidence.v0.2",
            "buyer",
            {
                "outcome": resolution["outcome"],
                "path": resolution["path"],
                "friction_triggers": resolution["friction_triggers"],
                "human_questions": resolution["human_questions"],
                "route_failure_surrogate": resolution["outcome"] in ROUTE_FAILURE_OUTCOMES,
                "buyer_agent_summary": resolution["narrative"],
            },
        )
        packets["claim"] = packet(
            packet_dir,
            row,
            "claim",
            "marketplace.claim.v0.2",
            "buyer",
            {
                "claim_type": resolution["outcome"],
                "requested_remedy": resolution["remedy"],
                "evidence_hashes": [
                    packets["item_evidence"].payload_hash,
                    packets["verifier_note"].payload_hash,
                ],
                "buyer_dispute_bond_eth_local_probe": money(amounts.dispute_bond_eth),
            },
        )
        packets["ruling"] = packet(
            packet_dir,
            row,
            "ruling",
            ruling_schema(resolution["arbitration_mode"]),
            "arbiter",
            {
                "arbiter": selected_arbiter,
                "local_evm_controller": e2e.ARBITER,
                "arbitration_mode": resolution["arbitration_mode"],
                "outcome": resolution["outcome"],
                "friction_triggers": resolution["friction_triggers"],
                "remedy": resolution["remedy"],
                "buyer_refund_bps": resolution["remedy"]["buyer_refund_bps"],
                "seller_bond_penalty_bps": resolution["remedy"]["seller_bond_penalty_bps"],
                "return_dispute_bond_to_buyer": True,
                "agentic_review": arbitration_review_note(resolution["arbitration_mode"]),
            },
        )

    return packets


def simulated_packet_summaries(resolution: dict[str, Any], schema: str) -> list[str]:
    return [
        packet["summary"]
        for packet in resolution.get("packets", [])
        if packet.get("schema") == schema
    ]


def verifier_opinion(row: dict[str, Any]) -> str:
    outcome = row["resolution"]["outcome"]
    if outcome == "clean_close":
        return "packet complete enough for buyer acceptance"
    if outcome in {"authenticity_flag", "wrong_card"}:
        return "identity risk should not be compressed into seller score"
    if outcome in ROUTE_FAILURE_OUTCOMES:
        return "route evidence is enough to open a claim but not enough to automate past friction"
    if outcome == "local_handoff_dispute":
        return "handoff memo and buyer confirmation need human-weighted interpretation"
    return "condition delta can be packetized for arbiter review"


def inspection_seconds(value_band: str) -> int:
    if value_band in {"high", "grail"}:
        return 259200
    if value_band == "mid":
        return 172800
    return 86400


def in_person_route(route: str) -> bool:
    return route in {"local_meetup", "show_pickup"}


def route_reference(route: str) -> str:
    if route in {"local_meetup", "show_pickup"}:
        return "memo://simulated-handoff-window"
    if route == "international_ship":
        return "tracking://simulated-international-carrier"
    return "tracking://simulated-domestic-carrier"


def route_evidence(trade: dict[str, Any]) -> list[str]:
    if in_person_route(trade["route"]):
        return ["handoff_memo", "buyer_confirmation_window"]
    evidence = ["carrier_acceptance", "tracking_history"]
    if trade["insured"]:
        evidence.append("insurance_or_gap_owner")
    return evidence


def ruling_schema(arbitration_mode: str) -> str:
    if arbitration_mode == "automated":
        return "marketplace.automated_ruling.v0.2"
    if arbitration_mode == "arbiter_agent_delegated":
        return "marketplace.delegated_arbiter_agent_ruling.v0.2"
    return "marketplace.arbiter_ruling.v0.2"


def arbitration_review_note(arbitration_mode: str) -> str:
    if arbitration_mode == "automated":
        return "direct automation stayed inside signed thresholds"
    if arbitration_mode == "automated_escalated_to_human":
        return "automation selected, then friction threshold forced human arbiter review"
    if arbitration_mode == "arbiter_agent_delegated":
        return "arbiter accepts agent-prepared ruling and signs final packet"
    return "human arbiter path, with agent-prepared evidence packet available"


def ordered_packet_list(packets: dict[str, e2e.PacketRecord]) -> list[e2e.PacketRecord]:
    order = [
        "intent",
        "terms",
        "seller_offer",
        "item_fingerprint",
        "inventory_lock",
        "arbiter_candidates",
        "friction_policy",
        "automation_policy",
        "item_evidence",
        "verifier_scope_approval",
        "verifier_note",
        "route",
        "delivery",
        "receipt",
        "claim_evidence",
        "claim",
        "ruling",
    ]
    return [packets[name] for name in order if name in packets]


def replay_trade(
    rpc_url: str,
    registry: str,
    contract: str,
    packet_dir: Path,
    row: dict[str, Any],
    evm_trade_id: int,
) -> ReplayTradeResult:
    trade = row["trade"]
    resolution = row["resolution"]
    plan = row["plan"]
    amounts = amount_model(trade)
    packets = build_packets(packet_dir, row, amounts)
    packet_records = ordered_packet_list(packets)
    e2e.verify_packets(rpc_url, registry, packet_records)
    verifier_scope_hash = e2e.scope_set_hash(VERIFIER_REVIEW_SCOPES)
    verifier_method_hash = e2e.method_id_hash(VERIFIER_REVIEW_METHOD_ID)

    result = ReplayTradeResult(
        source_trade_id=trade["trade_id"],
        evm_trade_id=evm_trade_id,
        final_state="",
        value_band=trade["value_band"],
        value_usd=trade["value"],
        route=trade["route"],
        insured=trade["insured"],
        seller_trust=trade["seller_trust"],
        selected_arbiter=plan["selected_arbiter"],
        arbitration_mode=resolution["arbitration_mode"],
        outcome=resolution["outcome"],
        friction_triggers=resolution["friction_triggers"],
        remedy=resolution["remedy"],
        amount_model={
            "price_eth": money(amounts.price_eth),
            "seller_bond_eth": money(amounts.seller_bond_eth),
            "buyer_dispute_bond_eth": money(amounts.dispute_bond_eth),
            "declared_insurance_eth": money(amounts.declared_insurance_eth),
        },
        packets=packet_records,
    )

    result.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.BUYER_KEY,
            contract,
            f"{trade['trade_id']} create trade",
            "createTrade(address,address,uint256,uint256,uint256,bytes32,bytes32,bytes32,address,bytes,bytes)",
            [
                e2e.SELLER,
                e2e.ARBITER,
                decimal_to_wei(amounts.seller_bond_eth),
                decimal_to_wei(amounts.dispute_bond_eth),
                str(inspection_seconds(trade["value_band"])),
                packets["intent"].payload_hash,
                packets["terms"].payload_hash,
                e2e.judgment_supply_commitment_hash(evm_trade_id, f"{trade['trade_id']}-floor"),
                e2e.REPLACEMENT_ARBITER,
                packets["intent"].signature,
                packets["terms"].signature,
            ],
            value_wei=decimal_to_wei(amounts.price_eth),
        )
    )
    result.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            f"{trade['trade_id']} seller posts bond",
            "acceptAndBond(uint256)",
            [str(evm_trade_id)],
            value_wei=decimal_to_wei(amounts.seller_bond_eth),
        )
    )
    result.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            f"{trade['trade_id']} attach seller offer",
            "attachProof(uint256,bytes32,bytes)",
            [str(evm_trade_id), packets["seller_offer"].payload_hash, packets["seller_offer"].signature],
        )
    )

    for name in ["arbiter_candidates", "friction_policy", "automation_policy"]:
        if name in packets:
            result.transactions.append(
                e2e.send_tx(
                    rpc_url,
                    e2e.BUYER_KEY,
                    contract,
                    f"{trade['trade_id']} attach {name}",
                    "attachEvidence(uint256,uint8,bytes32,bytes)",
                    [
                        str(evm_trade_id),
                        str(e2e.EVIDENCE_KIND["trust"]),
                        packets[name].payload_hash,
                        packets[name].signature,
                    ],
                )
            )

    result.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            f"{trade['trade_id']} attach item evidence",
            "attachEvidence(uint256,uint8,bytes32,bytes)",
            [
                str(evm_trade_id),
                str(e2e.EVIDENCE_KIND["item"]),
                packets["item_evidence"].payload_hash,
                packets["item_evidence"].signature,
            ],
            )
        )
    result.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            f"{trade['trade_id']} commit item fingerprint",
            "commitItemFingerprint(uint256,bytes32,bytes)",
            [str(evm_trade_id), packets["item_fingerprint"].payload_hash, packets["item_fingerprint"].signature],
        )
    )
    result.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            f"{trade['trade_id']} commit inventory lock",
            "commitInventoryLock(uint256,bytes32,bytes32,bytes)",
            [
                str(evm_trade_id),
                packets["inventory_lock"].payload_hash,
                packets["item_fingerprint"].payload_hash,
                e2e.sign_inventory_lock_binding(
                    rpc_url,
                    contract,
                    evm_trade_id,
                    packets["inventory_lock"].payload_hash,
                    packets["item_fingerprint"].payload_hash,
                    e2e.SELLER_KEY,
                ),
            ],
        )
    )
    result.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.BUYER_KEY,
            contract,
            f"{trade['trade_id']} approve verifier review scope",
            "approveVerifierScope(uint256,address,bytes32,bytes32,bytes)",
            [
                str(evm_trade_id),
                e2e.VERIFIER,
                verifier_scope_hash,
                packets["verifier_scope_approval"].payload_hash,
                e2e.sign_verifier_scope_approval(
                    rpc_url,
                    contract,
                    evm_trade_id,
                    e2e.VERIFIER,
                    verifier_scope_hash,
                    packets["verifier_scope_approval"].payload_hash,
                    e2e.BUYER_KEY,
                ),
            ],
        )
    )
    result.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.VERIFIER_KEY,
            contract,
            f"{trade['trade_id']} commit scoped verifier review",
            "commitVerifierAttestation(uint256,bytes32,bytes32,bytes32,bytes32,bytes)",
            [
                str(evm_trade_id),
                packets["verifier_note"].payload_hash,
                packets["item_evidence"].payload_hash,
                verifier_scope_hash,
                verifier_method_hash,
                e2e.sign_verifier_attestation_binding(
                    rpc_url,
                    contract,
                    evm_trade_id,
                    packets["verifier_note"].payload_hash,
                    packets["item_evidence"].payload_hash,
                    verifier_scope_hash,
                    verifier_method_hash,
                    e2e.VERIFIER_KEY,
                ),
            ],
        )
    )
    result.transactions.append(
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            f"{trade['trade_id']} commit route",
            ROUTE_COMMIT_ABI,
            route_commit_args(
                rpc_url,
                contract,
                trade["trade_id"],
                evm_trade_id,
                packets["route"],
                row,
                in_person_allowed=in_person_route(trade["route"]),
                insured=bool(trade["insured"]),
                declared_insurance_eth=amounts.declared_insurance_eth,
            ),
        )
    )

    route_failure = resolution["outcome"] in ROUTE_FAILURE_OUTCOMES
    if not in_person_route(trade["route"]) and resolution["outcome"] != "seller_nonship":
        result.transactions.append(
            e2e.send_tx(
                rpc_url,
                e2e.SELLER_KEY,
                contract,
                f"{trade['trade_id']} mark route in progress",
                "markRouteInProgress(uint256)",
                [str(evm_trade_id)],
            )
        )

    if route_failure:
        result.transactions.append(
            e2e.send_tx(
                rpc_url,
                e2e.BUYER_KEY,
                contract,
                f"{trade['trade_id']} attach route-failure claim evidence",
                "attachEvidence(uint256,uint8,bytes32,bytes)",
                [
                    str(evm_trade_id),
                    str(e2e.EVIDENCE_KIND["claim"]),
                    packets["claim_evidence"].payload_hash,
                    packets["claim_evidence"].signature,
                ],
            )
        )
        e2e.increase_time(rpc_url, 3 * 24 * 60 * 60 + 1)
        result.transactions.append(
            e2e.send_tx(
                rpc_url,
                e2e.BUYER_KEY,
                contract,
                f"{trade['trade_id']} open route-timeout claim",
                "openRouteClaimAfterTimeout(uint256,bytes32,bytes)",
                [str(evm_trade_id), packets["claim"].payload_hash, packets["claim"].signature],
                value_wei=decimal_to_wei(amounts.dispute_bond_eth),
            )
        )
        remedy = resolution["remedy"]
        result.transactions.append(
            e2e.send_tx(
                rpc_url,
                e2e.ARBITER_KEY,
                contract,
                f"{trade['trade_id']} resolve route-timeout claim",
                "resolveClaim(uint256,bytes32,uint16,uint16,bool,bytes)",
                [
                    str(evm_trade_id),
                    packets["ruling"].payload_hash,
                    str(remedy["buyer_refund_bps"]),
                    str(remedy["seller_bond_penalty_bps"]),
                    "true",
                    packets["ruling"].signature,
                ],
            )
        )
        result.observations.append(
            "Route failure/nonship now uses the native route-timeout claim gate instead of an inspection surrogate."
        )
    else:
        evm_delivery_spendability = e2e.delivery_spendability_hash(
            rpc_url, contract, evm_trade_id, packets["delivery"].payload_hash, e2e.SELLER
        )
        evm_delivery_witness = e2e.delivery_witness_hash(
            rpc_url,
            contract,
            evm_trade_id,
            packets["delivery"].payload_hash,
            evm_delivery_spendability,
        )
        result.transactions.append(
            e2e.send_tx(
                rpc_url,
                e2e.SELLER_KEY,
                contract,
                f"{trade['trade_id']} mark delivered",
                "markDelivered(uint256,bytes32,bytes32,bytes32,bytes)",
                [
                    str(evm_trade_id),
                    packets["delivery"].payload_hash,
                    evm_delivery_spendability,
                    evm_delivery_witness,
                    packets["delivery"].signature,
                ],
            )
        )

        if resolution["outcome"] == "clean_close":
            result.transactions.append(
                e2e.send_tx(
                    rpc_url,
                    e2e.BUYER_KEY,
                    contract,
                    f"{trade['trade_id']} buyer accepts",
                    "buyerAccept(uint256,bytes32,bytes)",
                    [str(evm_trade_id), packets["receipt"].payload_hash, packets["receipt"].signature],
                )
            )
        else:
            result.transactions.append(
                e2e.send_tx(
                    rpc_url,
                    e2e.BUYER_KEY,
                    contract,
                    f"{trade['trade_id']} attach claim evidence",
                    "attachEvidence(uint256,uint8,bytes32,bytes)",
                    [
                        str(evm_trade_id),
                        str(e2e.EVIDENCE_KIND["claim"]),
                        packets["claim_evidence"].payload_hash,
                        packets["claim_evidence"].signature,
                    ],
                )
            )
            result.transactions.append(
                e2e.send_tx(
                    rpc_url,
                    e2e.BUYER_KEY,
                    contract,
                    f"{trade['trade_id']} open claim",
                    "openClaim(uint256,bytes32,bytes)",
                    [str(evm_trade_id), packets["claim"].payload_hash, packets["claim"].signature],
                    value_wei=decimal_to_wei(amounts.dispute_bond_eth),
                )
            )
            remedy = resolution["remedy"]
            result.transactions.append(
                e2e.send_tx(
                    rpc_url,
                    e2e.ARBITER_KEY,
                    contract,
                    f"{trade['trade_id']} resolve claim",
                    "resolveClaim(uint256,bytes32,uint16,uint16,bool,bytes)",
                    [
                        str(evm_trade_id),
                        packets["ruling"].payload_hash,
                        str(remedy["buyer_refund_bps"]),
                        str(remedy["seller_bond_penalty_bps"]),
                        "true",
                        packets["ruling"].signature,
                    ],
                )
            )

    result.final_state = e2e.call_state(rpc_url, contract, evm_trade_id)
    if result.final_state != "Settled":
        raise RuntimeError(f"{trade['trade_id']} ended in {result.final_state}, expected Settled")

    if resolution["arbitration_mode"] == "automated_escalated_to_human":
        result.observations.append(
            "Automated policy was selected, but signed friction triggers forced human resolution before value moved."
        )
    if resolution["arbitration_mode"] == "automated":
        result.observations.append(
            "Direct automated ruling is represented by a registered arbiter controller until the automated arbiter actor exists on-chain."
        )
    if trade["seller_trust"] == "new":
        result.observations.append(
            "New seller trust is carried as explicit evidence plus bond, not as a single marketplace score."
        )
    if trade["route"] in {"local_meetup", "show_pickup"}:
        result.observations.append(
            "In-person route stays protocol-native through route memo evidence instead of being treated as failed shipping."
        )

    return result


def write_report(
    run_dir: Path,
    source_run: Path,
    rpc_url: str,
    registry_setup: e2e.RegistrySetup,
    contract: str,
    results: list[ReplayTradeResult],
) -> None:
    summary = {
        "run_id": run_dir.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_run": str(source_run.relative_to(e2e.ROOT)),
        "rpc_url": rpc_url,
        "registry": registry_setup.registry,
        "predicate_verifier": registry_setup.predicate_verifier,
        "contract": contract,
        "registry_setup": {
            "packets": [record.__dict__ for record in registry_setup.packets],
            "transactions": [record.__dict__ for record in registry_setup.transactions],
            "observations": registry_setup.observations,
        },
        "trades": [
            {
                "source_trade_id": result.source_trade_id,
                "evm_trade_id": result.evm_trade_id,
                "final_state": result.final_state,
                "value_band": result.value_band,
                "value_usd": result.value_usd,
                "route": result.route,
                "insured": result.insured,
                "seller_trust": result.seller_trust,
                "selected_arbiter": result.selected_arbiter,
                "arbitration_mode": result.arbitration_mode,
                "outcome": result.outcome,
                "friction_triggers": result.friction_triggers,
                "remedy": result.remedy,
                "amount_model": result.amount_model,
                "packets": [record.__dict__ for record in result.packets],
                "transactions": [record.__dict__ for record in result.transactions],
                "observations": result.observations,
            }
            for result in results
        ],
    }
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    selected = [
        {
            "source_trade_id": result.source_trade_id,
            "value_band": result.value_band,
            "value_usd": result.value_usd,
            "route": result.route,
            "seller_trust": result.seller_trust,
            "outcome": result.outcome,
            "arbitration_mode": result.arbitration_mode,
            "selected_arbiter": result.selected_arbiter,
        }
        for result in results
    ]
    (run_dir / "selected_trades.json").write_text(
        json.dumps(selected, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    mode_counts: dict[str, int] = {}
    outcome_counts: dict[str, int] = {}
    for result in results:
        mode_counts[result.arbitration_mode] = mode_counts.get(result.arbitration_mode, 0) + 1
        outcome_counts[result.outcome] = outcome_counts.get(result.outcome, 0) + 1

    lines = [
        f"# Agent Simulation EVM Replay: {run_dir.name}",
        "",
        f"- Source simulation: `{source_run.relative_to(e2e.ROOT)}`",
        f"- RPC: `{rpc_url}`",
        f"- Registry: `{registry_setup.registry}`",
        f"- Predicate verifier: `{registry_setup.predicate_verifier}`",
        f"- Escrow: `{contract}`",
        f"- Trades replayed: `{len(results)}`",
        f"- Final states: `{', '.join(sorted({result.final_state for result in results}))}`",
        "",
        "## Why These 10",
        "",
        "This set deliberately spans low, high, and grail value bands; clean close, condition delta, route loss, nonship, authenticity, and local handoff outcomes; trusted, known, unknown, and new sellers; automated, escalated, delegated, and human arbitration modes.",
        "",
        "## Selected Trades",
        "",
        "| Sim | EVM | Value | Trust | Route | Outcome | Arbitration | Final |",
        "| --- | ---: | ---: | --- | --- | --- | --- | --- |",
    ]
    for result in results:
        lines.append(
            f"| `{result.source_trade_id}` | `{result.evm_trade_id}` | `${result.value_usd}` {result.value_band} | {result.seller_trust} | {result.route} | {result.outcome} | {result.arbitration_mode} | {result.final_state} |"
        )

    lines.extend(
        [
            "",
            "## Counts",
            "",
            "Arbitration modes:",
            "",
            "```json",
            json.dumps(mode_counts, indent=2, sort_keys=True),
            "```",
            "",
            "Outcomes:",
            "",
            "```json",
            json.dumps(outcome_counts, indent=2, sort_keys=True),
            "```",
            "",
            "## Trade Details",
            "",
        ]
    )

    for result in results:
        lines.extend(
            [
                f"### {result.source_trade_id}",
                "",
                f"- EVM trade id: `{result.evm_trade_id}`",
                f"- Amount model: `{result.amount_model}`",
                f"- Selected arbiter: `{result.selected_arbiter}` mapped to `{e2e.ARBITER}` for local EVM.",
                f"- Friction triggers: `{result.friction_triggers}`",
                f"- Remedy: `{result.remedy}`",
                f"- Transactions: `{len(result.transactions)}`",
                f"- Packets: `{len(result.packets)}`; all signatures valid: `{all(packet.signature_valid for packet in result.packets)}`",
            ]
        )
        if result.observations:
            lines.append("- Observations:")
            for observation in result.observations:
                lines.append(f"  - {observation}")
        lines.append("")

    lines.extend(
        [
            "## What This Proves",
            "",
            "- Ten varied agent-simulation trades can be converted into signed packets and settled through the same local escrow contract.",
            "- Automated paths are packetized without silently skipping friction thresholds.",
            "- Human, delegated-agent, and automated rulings all reduce to signed ruling packets before money moves.",
            "- Shipping, insurance, handoff, and evidence facts can stay off-chain while their hashes anchor into the money rail.",
            "- Every replayed trade now commits a seller-signed item fingerprint, then a seller-signed inventory lock bound to that fingerprint, before route commitment.",
            "- Every replayed verifier review is buyer-scope-approved, then committed as a subject-bound scoped attestation instead of loose verifier evidence.",
            "- Buyer and seller trust vectors remain packet-level facts; the contract only enforces authority, signatures, bonds, and settlement.",
            "",
            "## Still Not Proven",
            "",
            "- Automated arbiters are not yet separate on-chain actors; this replay maps them to the registered arbiter controller.",
            "- Seller delivery claims are now signed packets, but the alpha still relies on buyer agents to notice and contest a false delivery before inspection expires.",
            "- ERC-20/stablecoin escrow, protocol fees, and fee routing are not modeled.",
            "- Real shipping APIs, insurance claim APIs, and marketplace reputation attestations are not connected.",
            "- Fingerprint challenges are proven in the local protocol probe, not across every replayed simulation trade.",
            "- Semantically different item fingerprints for the same physical card still require verifier scrutiny, richer image matching, or issuer attestations.",
            "- The full 250-trade simulation has not been replayed on-chain yet; this is a deliberately varied 10-trade probe.",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Replay selected agent simulation trades against local Anvil.")
    parser.add_argument("--source-run", type=Path, default=None, help="agent_market_* run directory")
    parser.add_argument("--trade-ids", nargs="*", default=DEFAULT_TRADE_IDS, help="simulation trade ids to replay")
    parser.add_argument("--port", type=int, default=18546, help="Anvil port to use")
    parser.add_argument("--keep-anvil", action="store_true", help="Leave Anvil running after the replay")
    args = parser.parse_args()

    source_run = args.source_run or latest_agent_market_run()
    if not source_run.is_absolute():
        source_run = (e2e.ROOT / source_run).resolve()
    rows = load_selected_trades(source_run, args.trade_ids)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = e2e.RUNS / f"agent_market_evm_replay_{timestamp}"
    packet_dir = run_dir / "packets"
    packet_dir.mkdir(parents=True, exist_ok=True)
    rpc_url = f"http://127.0.0.1:{args.port}"
    anvil_log = (run_dir / "anvil.log").open("w", encoding="utf-8")
    anvil = subprocess.Popen(
        ["anvil", "--chain-id", "31337", "--port", str(args.port), "--silent"],
        cwd=e2e.CHAIN,
        env=e2e.ENV,
        stdout=anvil_log,
        stderr=subprocess.STDOUT,
        text=True,
    )

    try:
        e2e.wait_for_rpc(rpc_url)
        e2e.run(["forge", "build"])
        registry = e2e.deploy_registry(rpc_url)
        predicate_verifier = e2e.deploy_predicate_verifier(rpc_url)
        registry_setup = e2e.setup_registry(rpc_url, registry, predicate_verifier, packet_dir)
        contract = e2e.deploy_escrow(rpc_url, registry)
        results = [
            replay_trade(rpc_url, registry, contract, packet_dir, row, index)
            for index, row in enumerate(rows, start=1)
        ]
        write_report(run_dir, source_run, rpc_url, registry_setup, contract, results)

        print(f"Wrote {run_dir / 'REPORT.md'}")
        print(f"source: {source_run}")
        print(f"registry: {registry}")
        print(f"predicate verifier: {predicate_verifier}")
        print(f"escrow: {contract}")
        for result in results:
            print(
                f"{result.source_trade_id}: trade {result.evm_trade_id} "
                f"{result.outcome}/{result.arbitration_mode} -> {result.final_state}"
            )
        return 0
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
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"agent simulation replay failed: {exc}", file=sys.stderr)
        raise
