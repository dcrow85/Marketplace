#!/usr/bin/env python3
"""Run semantic item-fingerprint collision drills against local Anvil.

The escrow contract can reject identical active fingerprint hashes. It cannot
look inside off-chain packets to know that two different hashes may describe the
same card, a stale photo, or a mismatched front/back pair. This drill exercises
that boundary: a simple semantic detector raises signed FingerprintChallenge
packets, and the EVM challenge gate blocks route commitment.
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


DRILL_PRICE_ETH = "0.20"
ROUTE_COMMIT_ABI = (
    "commitRoute(uint256,bytes32,bytes32,bytes32,bytes32,bytes32,bool,bool,uint256,bytes)"
)
SELLER_BOND_ETH = "0.03"
DISPUTE_BOND_ETH = "0.005"
INSPECTION_SECONDS = "172800"
CHALLENGE_REVIEW_SCOPES = ["fingerprint_challenge_resolution"]
CHALLENGE_REVIEW_METHOD_ID = "tcg.fingerprint.challenge_review.v0.1"


@dataclass
class TradeDrill:
    slug: str
    title: str
    trade_ids: list[int] = field(default_factory=list)
    detector_signals: list[str] = field(default_factory=list)
    requested_evidence: list[str] = field(default_factory=list)
    packets: list[e2e.PacketRecord] = field(default_factory=list)
    transactions: list[e2e.TxRecord] = field(default_factory=list)
    observations: list[str] = field(default_factory=list)
    outcome: str = ""


@dataclass
class TradeContext:
    trade_id: int
    slug: str
    intent: e2e.PacketRecord
    terms: e2e.PacketRecord
    transactions: list[e2e.TxRecord]


@dataclass
class FingerprintContext:
    trade_id: int
    slug: str
    fingerprint: e2e.PacketRecord
    evidence: e2e.PacketRecord
    inventory_lock: e2e.PacketRecord
    payload: dict[str, Any]
    semantic_keys: dict[str, Any]
    transactions: list[e2e.TxRecord]


def signed_packet(packet_dir: Path, packet_id: str, payload: dict[str, Any], role: str) -> e2e.PacketRecord:
    signer = e2e.SIGNERS[role]
    return e2e.write_packet(packet_dir, packet_id, payload, signer["key"], signer["address"])


def create_trade(
    rpc_url: str,
    contract: str,
    packet_dir: Path,
    trade_id: int,
    slug: str,
    title: str,
    value_band: str = "mid",
) -> TradeContext:
    intent = signed_packet(
        packet_dir,
        f"{slug}_intent",
        {
            "schema": "marketplace.intent.v0.2",
            "trade_id": trade_id,
            "buyer": e2e.SIGNERS["buyer"]["actor_id"],
            "buyer_agent": "did:market:agent:collision-drill",
            "object": {
                "domain": "tcg",
                "game": "pokemon",
                "title": title,
                "value_band": value_band,
            },
            "cost_field": {
                "max_total_price_eth": DRILL_PRICE_ETH,
                "attention_budget": "challenge_when_identity_conflicts",
                "evidence_floor": ["front_photo", "back_photo", "custody_nonce_or_waiver"],
            },
        },
        "buyer",
    )
    terms = signed_packet(
        packet_dir,
        f"{slug}_terms",
        {
            "schema": "marketplace.escrow_terms.v0.2",
            "trade_id": trade_id,
            "trade_template": "tcg_single_card_collision_drill",
            "price_eth": DRILL_PRICE_ETH,
            "seller_bond_eth": SELLER_BOND_ETH,
            "buyer_dispute_bond_eth": DISPUTE_BOND_ETH,
            "inspection_seconds": int(INSPECTION_SECONDS),
            "release_gate": "buyer_accepts_or_inspection_window_expires",
            "covered_promises": ["correct_item", "seller_custody", "no_active_semantic_collision"],
        },
        "buyer",
    )
    transactions = [
        e2e.send_tx(
            rpc_url,
            e2e.BUYER_KEY,
            contract,
            f"{slug} create trade",
            "createTrade(address,address,uint256,uint256,uint256,bytes32,bytes32,bytes,bytes)",
            [
                e2e.SELLER,
                e2e.ARBITER,
                e2e.eth(SELLER_BOND_ETH),
                e2e.eth(DISPUTE_BOND_ETH),
                INSPECTION_SECONDS,
                intent.payload_hash,
                terms.payload_hash,
                intent.signature,
                terms.signature,
            ],
            value_wei=e2e.eth(DRILL_PRICE_ETH),
        ),
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            f"{slug} seller posts bond",
            "acceptAndBond(uint256)",
            [str(trade_id)],
            value_wei=e2e.eth(SELLER_BOND_ETH),
        ),
    ]
    return TradeContext(trade_id=trade_id, slug=slug, intent=intent, terms=terms, transactions=transactions)


def semantic_keys(payload: dict[str, Any]) -> dict[str, Any]:
    cert_ids = [
        cert.get("cert_id_hash")
        for cert in payload.get("cert_refs", [])
        if cert.get("cert_id_hash")
    ]
    markers = payload.get("visual_markers", [])
    marker_by_scope = {marker.get("scope"): marker for marker in markers if marker.get("scope")}
    front = marker_by_scope.get("front", {})
    back = marker_by_scope.get("back", {})
    match_groups = sorted(
        {
            marker.get("match_group")
            for marker in markers
            if marker.get("match_group")
        }
    )
    capture_window = payload.get("capture_window", {})
    return {
        "cert_ids": cert_ids,
        "front_marker_hash": front.get("marker_hash"),
        "front_match_group": front.get("match_group"),
        "back_marker_hash": back.get("marker_hash"),
        "back_match_group": back.get("match_group"),
        "match_groups": match_groups,
        "captured_at": capture_window.get("captured_at"),
        "freshness_seconds": capture_window.get("freshness_seconds"),
        "custody_nonce": payload.get("custody_challenge", {}).get("nonce"),
        "prior_market_refs": payload.get("prior_market_refs", []),
    }


def stale_capture_signal(keys: dict[str, Any]) -> bool:
    captured_at = keys.get("captured_at")
    freshness_seconds = keys.get("freshness_seconds")
    if not captured_at or not freshness_seconds:
        return False
    captured = datetime.fromisoformat(captured_at.replace("Z", "+00:00"))
    age_seconds = (datetime.now(timezone.utc) - captured).total_seconds()
    return age_seconds > int(freshness_seconds)


def detect_semantic_collision(
    payload: dict[str, Any],
    active: list[FingerprintContext],
) -> tuple[list[str], list[str]]:
    keys = semantic_keys(payload)
    signals: list[str] = []
    requested: list[str] = []

    for active_fp in active:
        active_keys = active_fp.semantic_keys
        for cert_id in keys["cert_ids"]:
            if cert_id in active_keys["cert_ids"]:
                signals.append(
                    f"same_cert_active_elsewhere:{cert_id}:trade_{active_fp.trade_id}"
                )
                requested.append("fresh_slab_nonce_photo")

        if keys["front_marker_hash"] and keys["front_marker_hash"] == active_keys["front_marker_hash"]:
            if keys["back_marker_hash"] and keys["back_marker_hash"] != active_keys["back_marker_hash"]:
                signals.append(
                    f"same_front_different_back:trade_{active_fp.trade_id}"
                )
                requested.append("front_back_video_with_buyer_nonce")

        shared_match_groups = sorted(set(keys["match_groups"]) & set(active_keys["match_groups"]))
        for match_group in shared_match_groups:
            if payload.get("match_group_commitment") or active_fp.payload.get("match_group_commitment"):
                signals.append(
                    f"same_private_match_group:{match_group}:trade_{active_fp.trade_id}"
                )
                requested.append("verifier_or_arbiter_image_match_review")

    if (
        keys.get("front_match_group")
        and keys.get("back_match_group")
        and keys["front_match_group"] != keys["back_match_group"]
    ):
        signals.append("front_back_match_group_mismatch")
        requested.append("fresh_front_back_video_with_single_take")

    if stale_capture_signal(keys):
        signals.append("stale_capture_window")
        requested.append("fresh_timestamped_photo")

    if keys["prior_market_refs"] and not keys.get("custody_nonce"):
        signals.append("prior_market_ref_without_current_custody_nonce")
        requested.append("seller_custody_nonce_photo")

    return sorted(set(signals)), sorted(set(requested))


def item_fingerprint_payload(
    trade_id: int,
    title: str,
    evidence_refs: list[dict[str, Any]],
    visual_markers: list[dict[str, Any]],
    *,
    cert_refs: list[dict[str, Any]] | None = None,
    prior_market_refs: list[dict[str, Any]] | None = None,
    captured_at: str | None = None,
    freshness_seconds: int = 86_400,
    custody_nonce: str | None = None,
    match_group_commitment: str | None = None,
    confidence_scope: list[str] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "schema": "marketplace.item_fingerprint.v0.3",
        "trade_id": trade_id,
        "issuer": e2e.SIGNERS["seller"]["actor_id"],
        "issuer_role": "seller",
        "identity_claim": {
            "domain": "tcg",
            "game": "pokemon",
            "object_type": "raw_or_graded_single",
            "card": title,
            "grade_or_condition_claim": "collector-grade or LP+ as applicable",
        },
        "evidence_refs": evidence_refs,
        "correlation_method": ["visual_marker_match", "seller_custody_context"],
        "confidence_scope": confidence_scope or ["raw_card_identity", "seller_custody"],
        "privacy_policy": "buyer_arbiter",
        "challenge_hooks": ["fresh_nonce_photo", "front_back_video", "verifier_review"],
        "capture_window": {
            "captured_at": captured_at or datetime.now(timezone.utc).isoformat(),
            "freshness_seconds": freshness_seconds,
        },
        "visual_markers": visual_markers,
        "known_conflicts": [],
    }
    if custody_nonce:
        payload["custody_challenge"] = {
            "nonce": custody_nonce,
            "requested_pose": "front/back with handwritten buyer nonce",
            "expires_at": "2026-05-20T00:00:00Z",
        }
    if cert_refs:
        payload["cert_refs"] = cert_refs
    if prior_market_refs:
        payload["prior_market_refs"] = prior_market_refs
    if match_group_commitment:
        payload["match_group_commitment"] = match_group_commitment
    return payload


def commit_fingerprint(
    rpc_url: str,
    contract: str,
    packet_dir: Path,
    trade: TradeContext,
    payload: dict[str, Any],
) -> FingerprintContext:
    evidence = signed_packet(
        packet_dir,
        f"{trade.slug}_evidence",
        {
            "schema": "marketplace.evidence_packet.v0.2",
            "trade_id": trade.trade_id,
            "evidence_class": "item",
            "objects": payload["evidence_refs"],
            "agent_read": "Collision drill item evidence packet.",
        },
        "seller",
    )
    fingerprint = signed_packet(packet_dir, f"{trade.slug}_fingerprint", payload, "seller")
    inventory_lock = signed_packet(
        packet_dir,
        f"{trade.slug}_inventory_lock",
        {
            "schema": "marketplace.inventory_lock.v0.2",
            "trade_id": trade.trade_id,
            "seller": e2e.SIGNERS["seller"]["actor_id"],
            "inventory_key": f"collision-drill:{trade.slug}",
            "item_fingerprint_hash": fingerprint.payload_hash,
            "lock_scope": "single_unique_card",
            "seller_attestation": "this unique card is reserved for this escrow while active",
        },
        "seller",
    )
    transactions = [
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            f"{trade.slug} attach item evidence",
            "attachEvidence(uint256,uint8,bytes32,bytes)",
            [
                str(trade.trade_id),
                str(e2e.EVIDENCE_KIND["item"]),
                evidence.payload_hash,
                evidence.signature,
            ],
        ),
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            f"{trade.slug} commit item fingerprint",
            "commitItemFingerprint(uint256,bytes32,bytes)",
            [str(trade.trade_id), fingerprint.payload_hash, fingerprint.signature],
        ),
        e2e.send_tx(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            f"{trade.slug} commit inventory lock",
            "commitInventoryLock(uint256,bytes32,bytes32,bytes)",
            [
                str(trade.trade_id),
                inventory_lock.payload_hash,
                fingerprint.payload_hash,
                e2e.sign_inventory_lock_binding(
                    rpc_url,
                    contract,
                    trade.trade_id,
                    inventory_lock.payload_hash,
                    fingerprint.payload_hash,
                    e2e.SELLER_KEY,
                ),
            ],
        ),
    ]
    return FingerprintContext(
        trade_id=trade.trade_id,
        slug=trade.slug,
        fingerprint=fingerprint,
        evidence=evidence,
        inventory_lock=inventory_lock,
        payload=payload,
        semantic_keys=semantic_keys(payload),
        transactions=transactions,
    )


def challenge_and_block_route(
    rpc_url: str,
    contract: str,
    packet_dir: Path,
    trade: TradeContext,
    fingerprint: e2e.PacketRecord,
    signals: list[str],
    requested: list[str],
) -> tuple[list[e2e.PacketRecord], list[e2e.TxRecord], list[str]]:
    challenge = signed_packet(
        packet_dir,
        f"{trade.slug}_fingerprint_challenge",
        {
            "schema": "marketplace.fingerprint_challenge.v0.1",
            "trade_id": trade.trade_id,
            "challenger": e2e.SIGNERS["buyer"]["actor_id"],
            "target_fingerprint_hash": fingerprint.payload_hash,
            "grounds": signals,
            "requested_evidence": requested,
            "deadline": "2026-05-20T00:00:00Z",
            "failure_policy": "block_route_until_buyer_waiver_or_resolution",
        },
        "buyer",
    )
    route = signed_packet(
        packet_dir,
        f"{trade.slug}_route",
        {
            "schema": "marketplace.trade_route.v0.2",
            "trade_id": trade.trade_id,
            "route_type": "insured_shipping",
            "carrier": "simulated_usps",
            "tracking": f"SIM-COLLISION-{trade.trade_id:04d}",
            "insured": True,
            "declared_insurance_eth": DRILL_PRICE_ETH,
            "item_fingerprint_hash": fingerprint.payload_hash,
        },
        "seller",
    )
    transactions = [
        e2e.send_tx(
            rpc_url,
            e2e.BUYER_KEY,
            contract,
            f"{trade.slug} open fingerprint challenge",
            "openFingerprintChallenge(uint256,bytes32,bytes)",
            [str(trade.trade_id), challenge.payload_hash, challenge.signature],
        )
    ]
    observations = [
        e2e.expect_tx_revert(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            f"{trade.slug} route blocked by active fingerprint challenge",
            ROUTE_COMMIT_ABI,
            route_commit_args(rpc_url, contract, trade, route),
        )
    ]
    return [challenge, route], transactions, observations


def commit_challenge_review_attestation(
    rpc_url: str,
    contract: str,
    packet_dir: Path,
    trade: TradeContext,
    challenge: e2e.PacketRecord,
    signals: list[str],
    requested: list[str],
    verdict: str,
    positive_claim: str,
    negative_claims: list[str],
) -> tuple[list[e2e.PacketRecord], list[e2e.TxRecord]]:
    scope_hash = e2e.scope_set_hash(CHALLENGE_REVIEW_SCOPES)
    method_hash = e2e.method_id_hash(CHALLENGE_REVIEW_METHOD_ID)
    approval = signed_packet(
        packet_dir,
        f"{trade.slug}_challenge_review_scope_approval",
        {
            "schema": "marketplace.verifier_scope_approval.v0.1",
            "trade_id": trade.trade_id,
            "buyer": e2e.SIGNERS["buyer"]["actor_id"],
            "verifier": e2e.SIGNERS["verifier"]["actor_id"],
            "scope": CHALLENGE_REVIEW_SCOPES,
            "scope_set_hash": scope_hash,
            "limits": ["active_fingerprint_challenge_only", "not_card_authentication"],
        },
        "buyer",
    )
    attestation_payload = {
        "schema": "marketplace.verifier_scope_attestation.v0.1",
        "trade_id": trade.trade_id,
        "verifier": e2e.SIGNERS["verifier"]["actor_id"],
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "subject": {
            "subject_type": "fingerprint_challenge",
            "subject_hash": challenge.payload_hash,
        },
        "scope": CHALLENGE_REVIEW_SCOPES,
        "scope_set_hash": scope_hash,
        "method": {
            "method_id": CHALLENGE_REVIEW_METHOD_ID,
            "method_id_hash": method_hash,
            "summary": "Reviewed the active fingerprint challenge packet and submitted cure evidence.",
        },
        "verification_model": "remote_self_reported",
        "inputs_seen": [
            {"kind": "challenge_packet", "hash": challenge.payload_hash},
            {"kind": "detector_signals", "value": signals},
            {"kind": "requested_evidence", "value": requested},
            {"kind": "verdict", "value": verdict},
        ],
        "inputs_not_seen": [
            "in_person_card_inspection",
            "post_review_custody",
            "grading_company_api_response",
        ],
        "claim": {
            "positive": [positive_claim],
            "negative": negative_claims,
            "known_conflicts": signals,
        },
        "challenge": {
            "hooks": ["buyer_clearance", "arbiter_escalation", "fresh_nonce_request"],
            "failure_policy": "route_remains_blocked_until_buyer_clearance",
        },
        "display": {
            "label": "Challenge reviewed",
            "short_warning": "Scope-limited review.",
        },
    }
    attestation = e2e.write_verifier_scope_attestation_packet(
        packet_dir,
        f"{trade.slug}_challenge_review_attestation_{verdict}",
        attestation_payload,
    )
    transactions = [
        e2e.send_tx(
            rpc_url,
            e2e.BUYER_KEY,
            contract,
            f"{trade.slug} approve challenge review scope",
            "approveVerifierScope(uint256,address,bytes32,bytes32,bytes)",
            [
                str(trade.trade_id),
                e2e.VERIFIER,
                scope_hash,
                approval.payload_hash,
                e2e.sign_verifier_scope_approval(
                    rpc_url,
                    contract,
                    trade.trade_id,
                    e2e.VERIFIER,
                    scope_hash,
                    approval.payload_hash,
                    e2e.BUYER_KEY,
                ),
            ],
        ),
        e2e.send_tx(
            rpc_url,
            e2e.VERIFIER_KEY,
            contract,
            f"{trade.slug} commit challenge review attestation {verdict}",
            "commitVerifierAttestation(uint256,bytes32,bytes32,bytes32,bytes32,bytes)",
            [
                str(trade.trade_id),
                attestation.payload_hash,
                challenge.payload_hash,
                scope_hash,
                method_hash,
                e2e.sign_verifier_attestation_binding(
                    rpc_url,
                    contract,
                    trade.trade_id,
                    attestation.payload_hash,
                    challenge.payload_hash,
                    scope_hash,
                    method_hash,
                    e2e.VERIFIER_KEY,
                ),
            ],
        ),
    ]
    return [approval, attestation], transactions


def clear_challenge_with_attestation(
    rpc_url: str,
    contract: str,
    packet_dir: Path,
    trade: TradeContext,
    challenge: e2e.PacketRecord,
    attestation: e2e.PacketRecord,
    verdict: str,
) -> tuple[e2e.PacketRecord, e2e.TxRecord]:
    resolution = signed_packet(
        packet_dir,
        f"{trade.slug}_fingerprint_challenge_clear_{verdict}",
        {
            "schema": "marketplace.fingerprint_challenge_resolution.v0.2",
            "trade_id": trade.trade_id,
            "target_challenge_hash": challenge.payload_hash,
            "verifier_attestation_hash": attestation.payload_hash,
            "buyer_decision": verdict,
            "route_gate": "cleared_for_route_commitment",
        },
        "buyer",
    )
    tx = e2e.send_tx(
        rpc_url,
        e2e.BUYER_KEY,
        contract,
        f"{trade.slug} clear challenge with verifier attestation",
        "clearFingerprintChallengeWithAttestation(uint256,bytes32,bytes32,bytes)",
        [
            str(trade.trade_id),
            resolution.payload_hash,
            attestation.payload_hash,
            e2e.sign_fingerprint_challenge_resolution(
                rpc_url,
                contract,
                trade.trade_id,
                resolution.payload_hash,
                challenge.payload_hash,
                attestation.payload_hash,
                e2e.BUYER_KEY,
            ),
        ],
    )
    return resolution, tx


def route_tx_for_packet(
    rpc_url: str,
    contract: str,
    trade: TradeContext,
    route: e2e.PacketRecord,
) -> e2e.TxRecord:
    return e2e.send_tx(
        rpc_url,
        e2e.SELLER_KEY,
        contract,
        f"{trade.slug} commit route after verifier cure",
        ROUTE_COMMIT_ABI,
        route_commit_args(rpc_url, contract, trade, route),
    )


def route_spendability_hash(trade: TradeContext, route: e2e.PacketRecord) -> str:
    wall_bundle_hash = route_wall_bundle_root(trade, route)
    assembly_history_hash = route_assembly_history_hash(trade, route)
    return e2e.keccak_payload(
        {
            "schema": "marketplace.synthetic_route_spendability.v0.1",
            "trade_id": trade.trade_id,
            "gate_type": "route_commitment",
            "gate_id": f"route_commitment:{trade.trade_id}:{trade.slug}",
            "route_hash": route.payload_hash,
            "wall_bundle_hash": wall_bundle_hash,
            "assembly_history_hash": assembly_history_hash,
            "spend_limit": "blocks_or_unblocks_gate",
        }
    )


def route_wall_bundle_root(trade: TradeContext, route: e2e.PacketRecord) -> str:
    return e2e.route_wall_bundle_root(trade.trade_id, route.payload_hash)


def route_assembly_history_hash(trade: TradeContext, route: e2e.PacketRecord) -> str:
    return e2e.route_assembly_history_hash(
        trade.trade_id,
        route.payload_hash,
        route_wall_bundle_root(trade, route),
    )


def route_assembly_witness_hash(
    rpc_url: str,
    contract: str,
    trade: TradeContext,
    route: e2e.PacketRecord,
) -> str:
    wall_bundle_hash = route_wall_bundle_root(trade, route)
    assembly_history_hash = route_assembly_history_hash(trade, route)
    return e2e.route_assembly_witness_hash(
        rpc_url,
        contract,
        trade.trade_id,
        route.payload_hash,
        route_spendability_hash(trade, route),
        wall_bundle_hash,
        assembly_history_hash,
    )


def route_commit_args(
    rpc_url: str,
    contract: str,
    trade: TradeContext,
    route: e2e.PacketRecord,
    *,
    in_person_allowed: bool = False,
    insured: bool = True,
    declared_insurance_eth: str = DRILL_PRICE_ETH,
) -> list[str]:
    wall_bundle_hash = route_wall_bundle_root(trade, route)
    assembly_history_hash = route_assembly_history_hash(trade, route)
    return [
        str(trade.trade_id),
        route.payload_hash,
        route_spendability_hash(trade, route),
        wall_bundle_hash,
        assembly_history_hash,
        route_assembly_witness_hash(rpc_url, contract, trade, route),
        str(in_person_allowed).lower(),
        str(insured).lower(),
        e2e.eth(declared_insurance_eth),
        route.signature,
    ]


def commit_route_without_challenge(
    rpc_url: str,
    contract: str,
    packet_dir: Path,
    trade: TradeContext,
    fingerprint: e2e.PacketRecord,
) -> tuple[e2e.PacketRecord, e2e.TxRecord]:
    route = signed_packet(
        packet_dir,
        f"{trade.slug}_route",
        {
            "schema": "marketplace.trade_route.v0.2",
            "trade_id": trade.trade_id,
            "route_type": "insured_shipping",
            "carrier": "simulated_usps",
            "tracking": f"SIM-CONTROL-{trade.trade_id:04d}",
            "insured": True,
            "declared_insurance_eth": DRILL_PRICE_ETH,
            "item_fingerprint_hash": fingerprint.payload_hash,
        },
        "seller",
    )
    tx = e2e.send_tx(
        rpc_url,
        e2e.SELLER_KEY,
        contract,
        f"{trade.slug} commit route",
        ROUTE_COMMIT_ABI,
        route_commit_args(rpc_url, contract, trade, route),
    )
    return route, tx


def run_drill(
    rpc_url: str,
    registry: str,
    contract: str,
    packet_dir: Path,
) -> list[TradeDrill]:
    drills: list[TradeDrill] = []
    active: list[FingerprintContext] = []
    next_trade_id = 1

    def new_trade(slug: str, title: str, value_band: str = "mid") -> TradeContext:
        nonlocal next_trade_id
        trade = create_trade(rpc_url, contract, packet_dir, next_trade_id, slug, title, value_band)
        next_trade_id += 1
        return trade

    exact = TradeDrill(
        slug="exact_hash_collision",
        title="Exact same fingerprint hash across active trades",
    )
    exact_source = new_trade("exact_source", "Japanese vintage holo exact-hash source")
    exact_payload = item_fingerprint_payload(
        exact_source.trade_id,
        "Japanese vintage holo exact-hash source",
        [{"type": "front_photo", "ref": "exact-front-a"}, {"type": "back_photo", "ref": "exact-back-a"}],
        [
            {"scope": "front", "marker_hash": "exact-front-a", "match_group": "exact-card-a"},
            {"scope": "back", "marker_hash": "exact-back-a", "match_group": "exact-card-a"},
        ],
        custody_nonce="buyer-nonce-exact-a",
    )
    exact_fp = commit_fingerprint(rpc_url, contract, packet_dir, exact_source, exact_payload)
    active.append(exact_fp)
    exact_attack = new_trade("exact_attack", "Japanese vintage holo exact-hash attack")
    exact.transactions.extend(exact_source.transactions + exact_fp.transactions + exact_attack.transactions)
    exact.packets.extend([exact_source.intent, exact_source.terms, exact_fp.evidence, exact_fp.fingerprint, exact_fp.inventory_lock, exact_attack.intent, exact_attack.terms])
    exact.trade_ids.extend([exact_source.trade_id, exact_attack.trade_id])
    exact.observations.append(
        e2e.expect_tx_revert(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            "exact_attack commit same active fingerprint",
            "commitItemFingerprint(uint256,bytes32,bytes)",
            [str(exact_attack.trade_id), exact_fp.fingerprint.payload_hash, exact_fp.fingerprint.signature],
        )
    )
    exact.detector_signals.append("same_hash_active_elsewhere")
    exact.outcome = "blocked_on_chain_by_activeItemFingerprints"
    drills.append(exact)

    same_cert = TradeDrill(slug="same_cert_reuse", title="Same PSA cert reused with different photos")
    cert_a = new_trade("cert_source", "PSA slab cert source")
    cert_id = "psa-cert-hash-65081234"
    cert_source_payload = item_fingerprint_payload(
        cert_a.trade_id,
        "PSA slab cert source",
        [{"type": "front_slab_photo", "ref": "cert-source-front"}, {"type": "back_slab_photo", "ref": "cert-source-back"}],
        [
            {"scope": "front", "marker_hash": "cert-source-front", "match_group": "psa-slab-65081234"},
            {"scope": "back", "marker_hash": "cert-source-back", "match_group": "psa-slab-65081234"},
        ],
        cert_refs=[{"issuer": "PSA", "cert_id_hash": cert_id, "lookup_ref": "psa://65081234", "custody_evidence_ref": "cert-source-front"}],
        custody_nonce="buyer-nonce-cert-source",
        confidence_scope=["graded_cert_correlation", "seller_custody"],
    )
    cert_source_fp = commit_fingerprint(rpc_url, contract, packet_dir, cert_a, cert_source_payload)
    active.append(cert_source_fp)
    cert_b = new_trade("cert_attack", "PSA slab cert attack")
    cert_attack_payload = item_fingerprint_payload(
        cert_b.trade_id,
        "PSA slab cert attack",
        [{"type": "front_slab_photo", "ref": "cert-attack-front"}, {"type": "back_slab_photo", "ref": "cert-attack-back"}],
        [
            {"scope": "front", "marker_hash": "cert-attack-front", "match_group": "psa-slab-65081234"},
            {"scope": "back", "marker_hash": "cert-attack-back", "match_group": "psa-slab-65081234"},
        ],
        cert_refs=[{"issuer": "PSA", "cert_id_hash": cert_id, "lookup_ref": "psa://65081234", "custody_evidence_ref": "cert-attack-front"}],
        custody_nonce="buyer-nonce-cert-attack",
        confidence_scope=["graded_cert_correlation", "seller_custody"],
    )
    signals, requested = detect_semantic_collision(cert_attack_payload, active)
    cert_attack_fp = commit_fingerprint(rpc_url, contract, packet_dir, cert_b, cert_attack_payload)
    active.append(cert_attack_fp)
    challenge_packets, challenge_txs, observations = challenge_and_block_route(
        rpc_url, contract, packet_dir, cert_b, cert_attack_fp.fingerprint, signals, requested
    )
    challenge_packet = challenge_packets[0]
    route_packet = challenge_packets[1]
    review_packets, review_txs = commit_challenge_review_attestation(
        rpc_url,
        contract,
        packet_dir,
        cert_b,
        challenge_packet,
        signals,
        requested,
        "accepted",
        "Fresh slab nonce evidence satisfies this fingerprint challenge.",
        ["This review does not cover later custody or shipping."],
    )
    resolution_packet, resolution_tx = clear_challenge_with_attestation(
        rpc_url,
        contract,
        packet_dir,
        cert_b,
        challenge_packet,
        review_packets[1],
        "accepted",
    )
    route_tx = route_tx_for_packet(rpc_url, contract, cert_b, route_packet)
    same_cert.trade_ids.extend([cert_a.trade_id, cert_b.trade_id])
    same_cert.detector_signals.extend(signals)
    same_cert.requested_evidence.extend(requested)
    same_cert.transactions.extend(
        cert_a.transactions
        + cert_source_fp.transactions
        + cert_b.transactions
        + cert_attack_fp.transactions
        + challenge_txs
        + review_txs
        + [resolution_tx, route_tx]
    )
    same_cert.packets.extend(
        [
            cert_a.intent,
            cert_a.terms,
            cert_source_fp.evidence,
            cert_source_fp.fingerprint,
            cert_source_fp.inventory_lock,
            cert_b.intent,
            cert_b.terms,
            cert_attack_fp.evidence,
            cert_attack_fp.fingerprint,
            cert_attack_fp.inventory_lock,
            *challenge_packets,
            *review_packets,
            resolution_packet,
        ]
    )
    same_cert.observations.extend(observations)
    same_cert.observations.append(
        "Verifier accepted fresh nonce cure; buyer cleared the challenge with the attestation and route committed."
    )
    same_cert.outcome = "verifier_cure_accepted_route_allowed"
    drills.append(same_cert)

    stale = TradeDrill(slug="stale_prior_market_photo", title="Prior marketplace image reused without custody nonce")
    stale_trade = new_trade("stale_photo", "Raw card with stale marketplace photo")
    stale_payload = item_fingerprint_payload(
        stale_trade.trade_id,
        "Raw card with stale marketplace photo",
        [{"type": "front_photo", "ref": "prior-ebay-front-2026-02"}, {"type": "back_photo", "ref": "prior-ebay-back-2026-02"}],
        [
            {"scope": "front", "marker_hash": "prior-ebay-front-2026-02", "match_group": "raw-card-stale-1"},
            {"scope": "back", "marker_hash": "prior-ebay-back-2026-02", "match_group": "raw-card-stale-1"},
        ],
        prior_market_refs=[
            {"source": "eBay", "claim": "same photo as old listing", "proof_ref": "archive://prior-ebay-listing", "weight_hint": "weak"}
        ],
        captured_at="2026-02-01T00:00:00+00:00",
        freshness_seconds=86_400,
    )
    signals, requested = detect_semantic_collision(stale_payload, active)
    stale_fp = commit_fingerprint(rpc_url, contract, packet_dir, stale_trade, stale_payload)
    active.append(stale_fp)
    challenge_packets, challenge_txs, observations = challenge_and_block_route(
        rpc_url, contract, packet_dir, stale_trade, stale_fp.fingerprint, signals, requested
    )
    review_packets, review_txs = commit_challenge_review_attestation(
        rpc_url,
        contract,
        packet_dir,
        stale_trade,
        challenge_packets[0],
        signals,
        requested,
        "rejected",
        "Stale prior-market photo risk remains unresolved.",
        ["No fresh seller custody nonce was supplied."],
    )
    observations.append(
        e2e.expect_tx_revert(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            "stale_photo route remains blocked after verifier rejection",
            ROUTE_COMMIT_ABI,
            route_commit_args(rpc_url, contract, stale_trade, challenge_packets[1]),
        )
    )
    stale.trade_ids.append(stale_trade.trade_id)
    stale.detector_signals.extend(signals)
    stale.requested_evidence.extend(requested)
    stale.transactions.extend(stale_trade.transactions + stale_fp.transactions + challenge_txs + review_txs)
    stale.packets.extend(
        [
            stale_trade.intent,
            stale_trade.terms,
            stale_fp.evidence,
            stale_fp.fingerprint,
            stale_fp.inventory_lock,
            *challenge_packets,
            *review_packets,
        ]
    )
    stale.observations.extend(observations)
    stale.outcome = "verifier_rejects_route_stays_blocked"
    drills.append(stale)

    mixed = TradeDrill(slug="mixed_front_back", title="Front and back markers appear to be different cards")
    mixed_trade = new_trade("mixed_front_back", "Raw card with mismatched front and back")
    mixed_payload = item_fingerprint_payload(
        mixed_trade.trade_id,
        "Raw card with mismatched front and back",
        [{"type": "front_photo", "ref": "mixed-front-card-a"}, {"type": "back_photo", "ref": "mixed-back-card-b"}],
        [
            {"scope": "front", "marker_hash": "mixed-front-card-a", "match_group": "raw-card-alpha"},
            {"scope": "back", "marker_hash": "mixed-back-card-b", "match_group": "raw-card-beta"},
        ],
        custody_nonce="buyer-nonce-mixed",
    )
    signals, requested = detect_semantic_collision(mixed_payload, active)
    mixed_fp = commit_fingerprint(rpc_url, contract, packet_dir, mixed_trade, mixed_payload)
    active.append(mixed_fp)
    challenge_packets, challenge_txs, observations = challenge_and_block_route(
        rpc_url, contract, packet_dir, mixed_trade, mixed_fp.fingerprint, signals, requested
    )
    review_packets, review_txs = commit_challenge_review_attestation(
        rpc_url,
        contract,
        packet_dir,
        mixed_trade,
        challenge_packets[0],
        signals,
        requested,
        "escalated",
        "Front/back mismatch requires human arbiter review.",
        ["The verifier cannot cure this mismatch from the submitted packet."],
    )
    observations.append(
        e2e.expect_tx_revert(
            rpc_url,
            e2e.SELLER_KEY,
            contract,
            "mixed_front_back route remains blocked after verifier escalation",
            ROUTE_COMMIT_ABI,
            route_commit_args(rpc_url, contract, mixed_trade, challenge_packets[1]),
        )
    )
    mixed.trade_ids.append(mixed_trade.trade_id)
    mixed.detector_signals.extend(signals)
    mixed.requested_evidence.extend(requested)
    mixed.transactions.extend(mixed_trade.transactions + mixed_fp.transactions + challenge_txs + review_txs)
    mixed.packets.extend(
        [
            mixed_trade.intent,
            mixed_trade.terms,
            mixed_fp.evidence,
            mixed_fp.fingerprint,
            mixed_fp.inventory_lock,
            *challenge_packets,
            *review_packets,
        ]
    )
    mixed.observations.extend(observations)
    mixed.outcome = "verifier_escalates_route_stays_blocked"
    drills.append(mixed)

    front_swap = TradeDrill(slug="same_front_different_back", title="Same front photo paired with a different back")
    front_source = new_trade("front_source", "Front reuse source card")
    front_source_payload = item_fingerprint_payload(
        front_source.trade_id,
        "Front reuse source card",
        [{"type": "front_photo", "ref": "shared-front-777"}, {"type": "back_photo", "ref": "source-back-777"}],
        [
            {"scope": "front", "marker_hash": "shared-front-777", "match_group": "raw-card-front-777"},
            {"scope": "back", "marker_hash": "source-back-777", "match_group": "raw-card-front-777"},
        ],
        custody_nonce="buyer-nonce-front-source",
    )
    front_source_fp = commit_fingerprint(rpc_url, contract, packet_dir, front_source, front_source_payload)
    active.append(front_source_fp)
    front_attack = new_trade("front_attack", "Front reuse attack card")
    front_attack_payload = item_fingerprint_payload(
        front_attack.trade_id,
        "Front reuse attack card",
        [{"type": "front_photo", "ref": "shared-front-777"}, {"type": "back_photo", "ref": "attack-back-888"}],
        [
            {"scope": "front", "marker_hash": "shared-front-777", "match_group": "raw-card-front-777"},
            {"scope": "back", "marker_hash": "attack-back-888", "match_group": "raw-card-back-888"},
        ],
        custody_nonce="buyer-nonce-front-attack",
    )
    signals, requested = detect_semantic_collision(front_attack_payload, active)
    front_attack_fp = commit_fingerprint(rpc_url, contract, packet_dir, front_attack, front_attack_payload)
    active.append(front_attack_fp)
    challenge_packets, challenge_txs, observations = challenge_and_block_route(
        rpc_url, contract, packet_dir, front_attack, front_attack_fp.fingerprint, signals, requested
    )
    front_swap.trade_ids.extend([front_source.trade_id, front_attack.trade_id])
    front_swap.detector_signals.extend(signals)
    front_swap.requested_evidence.extend(requested)
    front_swap.transactions.extend(front_source.transactions + front_source_fp.transactions + front_attack.transactions + front_attack_fp.transactions + challenge_txs)
    front_swap.packets.extend([front_source.intent, front_source.terms, front_source_fp.evidence, front_source_fp.fingerprint, front_source_fp.inventory_lock, front_attack.intent, front_attack.terms, front_attack_fp.evidence, front_attack_fp.fingerprint, front_attack_fp.inventory_lock, *challenge_packets])
    front_swap.observations.extend(observations)
    front_swap.outcome = "buyer_challenge_blocks_route"
    drills.append(front_swap)

    crop_alias = TradeDrill(slug="same_card_crop_alias", title="Same raw card cropped into different fingerprint hashes")
    crop_source = new_trade("crop_source", "Raw card crop source")
    crop_group = "private-match-group:raw-omega-42"
    crop_source_payload = item_fingerprint_payload(
        crop_source.trade_id,
        "Raw card crop source",
        [{"type": "front_photo", "ref": "omega-front-wide"}, {"type": "back_photo", "ref": "omega-back-wide"}],
        [
            {"scope": "front", "marker_hash": "omega-front-wide", "match_group": crop_group},
            {"scope": "back", "marker_hash": "omega-back-wide", "match_group": crop_group},
        ],
        custody_nonce="buyer-nonce-crop-source",
        match_group_commitment=crop_group,
    )
    crop_source_fp = commit_fingerprint(rpc_url, contract, packet_dir, crop_source, crop_source_payload)
    active.append(crop_source_fp)
    crop_attack = new_trade("crop_attack", "Raw card crop attack")
    crop_attack_payload = item_fingerprint_payload(
        crop_attack.trade_id,
        "Raw card crop attack",
        [{"type": "front_photo", "ref": "omega-front-crop"}, {"type": "back_photo", "ref": "omega-back-crop"}],
        [
            {"scope": "front", "marker_hash": "omega-front-crop", "match_group": crop_group},
            {"scope": "back", "marker_hash": "omega-back-crop", "match_group": crop_group},
        ],
        custody_nonce="buyer-nonce-crop-attack",
        match_group_commitment=crop_group,
    )
    signals, requested = detect_semantic_collision(crop_attack_payload, active)
    crop_attack_fp = commit_fingerprint(rpc_url, contract, packet_dir, crop_attack, crop_attack_payload)
    active.append(crop_attack_fp)
    challenge_packets, challenge_txs, observations = challenge_and_block_route(
        rpc_url, contract, packet_dir, crop_attack, crop_attack_fp.fingerprint, signals, requested
    )
    crop_alias.trade_ids.extend([crop_source.trade_id, crop_attack.trade_id])
    crop_alias.detector_signals.extend(signals)
    crop_alias.requested_evidence.extend(requested)
    crop_alias.transactions.extend(crop_source.transactions + crop_source_fp.transactions + crop_attack.transactions + crop_attack_fp.transactions + challenge_txs)
    crop_alias.packets.extend([crop_source.intent, crop_source.terms, crop_source_fp.evidence, crop_source_fp.fingerprint, crop_source_fp.inventory_lock, crop_attack.intent, crop_attack.terms, crop_attack_fp.evidence, crop_attack_fp.fingerprint, crop_attack_fp.inventory_lock, *challenge_packets])
    crop_alias.observations.extend(observations)
    crop_alias.outcome = "buyer_challenge_blocks_route"
    drills.append(crop_alias)

    control = TradeDrill(slug="fresh_nonce_control", title="Fresh nonce evidence with no collision signal")
    control_trade = new_trade("fresh_control", "Fresh nonce raw card control", "low")
    control_payload = item_fingerprint_payload(
        control_trade.trade_id,
        "Fresh nonce raw card control",
        [{"type": "front_photo", "ref": "fresh-control-front"}, {"type": "back_photo", "ref": "fresh-control-back"}, {"type": "edge_closeups", "ref": "fresh-control-edges"}],
        [
            {"scope": "front", "marker_hash": "fresh-control-front", "match_group": "fresh-control-card"},
            {"scope": "back", "marker_hash": "fresh-control-back", "match_group": "fresh-control-card"},
            {"scope": "edge", "marker_hash": "fresh-control-edges", "match_group": "fresh-control-card"},
        ],
        custody_nonce="buyer-nonce-fresh-control",
    )
    signals, requested = detect_semantic_collision(control_payload, active)
    control_fp = commit_fingerprint(rpc_url, contract, packet_dir, control_trade, control_payload)
    active.append(control_fp)
    route, route_tx = commit_route_without_challenge(rpc_url, contract, packet_dir, control_trade, control_fp.fingerprint)
    control.trade_ids.append(control_trade.trade_id)
    control.detector_signals.extend(signals)
    control.requested_evidence.extend(requested)
    control.transactions.extend(control_trade.transactions + control_fp.transactions + [route_tx])
    control.packets.extend([control_trade.intent, control_trade.terms, control_fp.evidence, control_fp.fingerprint, control_fp.inventory_lock, route])
    control.observations.append("Fresh nonce control committed route without a collision challenge.")
    control.outcome = "route_allowed_no_collision_signal"
    drills.append(control)

    all_packets = [packet for drill in drills for packet in drill.packets]
    e2e.verify_packets(rpc_url, registry, all_packets)
    return drills


def write_report(
    run_dir: Path,
    rpc_url: str,
    registry_setup: e2e.RegistrySetup,
    contract: str,
    drills: list[TradeDrill],
) -> None:
    summary = {
        "run_id": run_dir.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "rpc_url": rpc_url,
        "registry": registry_setup.registry,
        "predicate_verifier": registry_setup.predicate_verifier,
        "contract": contract,
        "registry_setup": {
            "packets": [packet.__dict__ for packet in registry_setup.packets],
            "transactions": [tx.__dict__ for tx in registry_setup.transactions],
            "observations": registry_setup.observations,
        },
        "drills": [
            {
                "slug": drill.slug,
                "title": drill.title,
                "trade_ids": drill.trade_ids,
                "detector_signals": drill.detector_signals,
                "requested_evidence": drill.requested_evidence,
                "outcome": drill.outcome,
                "packets": [packet.__dict__ for packet in drill.packets],
                "transactions": [tx.__dict__ for tx in drill.transactions],
                "observations": drill.observations,
            }
            for drill in drills
        ],
    }
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    lines = [
        f"# Fingerprint Collision Drill: {run_dir.name}",
        "",
        f"- Generated: `{summary['generated_at']}`",
        f"- RPC: `{rpc_url}`",
        f"- Registry: `{registry_setup.registry}`",
        f"- Predicate verifier: `{registry_setup.predicate_verifier}`",
        f"- Escrow: `{contract}`",
        f"- Drill cases: `{len(drills)}`",
        "",
        "## Result",
        "",
        "The exact same active fingerprint hash is blocked by the EVM. Different hashes that look like the same physical card, a stale photo, or a front/back mismatch are detected off-chain and turned into buyer-signed `FingerprintChallenge` packets. Fresh nonce cure evidence can be accepted only after a verifier commits an attestation bound to the active challenge hash and the buyer signs an attestation-bound resolution. Stale evidence and mixed front/back evidence keep route blocked.",
        "",
        "## Collision Matrix",
        "",
        "| Case | Trades | Detector Signals | EVM Outcome |",
        "| --- | --- | --- | --- |",
    ]
    for drill in drills:
        signals = "<br>".join(f"`{signal}`" for signal in drill.detector_signals) or "`none`"
        trade_ids = ", ".join(str(trade_id) for trade_id in drill.trade_ids)
        lines.append(f"| {drill.title} | `{trade_ids}` | {signals} | `{drill.outcome}` |")

    lines.extend(
        [
            "",
            "## Case Notes",
            "",
        ]
    )
    for drill in drills:
        lines.extend(
            [
                f"### {drill.title}",
                "",
                f"- Slug: `{drill.slug}`",
                f"- Trade ids: `{drill.trade_ids}`",
                f"- Requested evidence: `{drill.requested_evidence or []}`",
                f"- Packets: `{len(drill.packets)}`; all signatures valid: `{all(packet.signature_valid for packet in drill.packets)}`",
                f"- Transactions: `{len(drill.transactions)}`",
                f"- Outcome: `{drill.outcome}`",
            ]
        )
        if drill.observations:
            lines.append("- Observations:")
            for observation in drill.observations:
                lines.append(f"  - {observation}")
        lines.append("")

    lines.extend(
        [
            "## What This Proves",
            "",
            "- Hash-level duplicate fingerprints are enforceable on-chain today.",
            "- Semantic duplicates are not on-chain facts until an agent, verifier, buyer, or arbiter turns them into signed packets.",
            "- The current `FingerprintChallenge` gate is strong enough to pause route commitment after a semantic detector flags a problem.",
            "- The attested cure path now requires `VerifierScopeApproval`, `VerifierScopeAttestation`, and `clearFingerprintChallengeWithAttestation` before route can resume.",
            "- Verifier review can produce different outcomes: accept fresh nonce cure, reject stale evidence, or escalate mixed-front/back ambiguity.",
            "- Collision signals stay non-scalar: same cert, stale capture, front/back mismatch, same front with different back, and private match-group alias remain separate reasons with separate evidence requests.",
            "- A clean low-risk control with fresh nonce evidence can still move forward, so the drill does not collapse into universal over-verification.",
            "",
            "## Still Not Proven",
            "",
            "- The detector is a deterministic local probe, not real image matching.",
            "- No PSA, SGC, BGS, CGC, marketplace, or carrier API is integrated.",
            "- Private match groups are simulated commitments; a production version needs verifier custody, confidential matching, or a ZK/TEE-style proof path.",
            "- Seller cure evidence is simulated; the full interactive cure loop, deadlines, fees, and arbiter handoff are not modeled yet.",
            "- The contract still cannot detect two different hashes that represent the same card unless someone signs and anchors the challenge.",
            "",
            "## Next Hardening Target",
            "",
            "Add verifier-agent cure workflow packets: evidence request, seller response, verifier fee/SLA, accepted cure, rejected cure, escalation handoff, and buyer waiver. Then connect a real or stubbed image/cert matcher behind the verifier method.",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run semantic fingerprint collision drills against local Anvil.")
    parser.add_argument("--port", type=int, default=18547, help="Anvil port to use")
    parser.add_argument("--keep-anvil", action="store_true", help="Leave Anvil running after the drill")
    args = parser.parse_args()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = e2e.RUNS / f"fingerprint_collision_drill_{timestamp}"
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
        drills = run_drill(rpc_url, registry, contract, packet_dir)
        write_report(run_dir, rpc_url, registry_setup, contract, drills)

        print(f"Wrote {run_dir / 'REPORT.md'}")
        print(f"registry: {registry}")
        print(f"predicate verifier: {predicate_verifier}")
        print(f"escrow: {contract}")
        for drill in drills:
            print(f"{drill.slug}: {drill.outcome}")
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
        print(f"fingerprint collision drill failed: {exc}", file=sys.stderr)
        raise
