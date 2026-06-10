#!/usr/bin/env python3
"""Local active alpha server for the Pokemon trade interface.

This intentionally stays small: one golden trade, packet-shaped state, and a
few actions that let the UI test paid seller attention without needing a full
marketplace backend.
"""

from __future__ import annotations

import argparse
import atexit
import json
import os
import signal
import socket
import subprocess
import sys
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from pokemon_tcg_catalog import PokemonTcgCatalog
from protocol_wall_packets import canonical_hash, evm_bytes32_ref


ROOT = Path(__file__).resolve().parents[1]
CHAIN = ROOT / "chain"
CATALOG = PokemonTcgCatalog()


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def packet(packet_id: str, schema: str, payload: dict[str, Any]) -> dict[str, Any]:
    body = {"schema": schema, "packet_id": packet_id, **payload}
    return {
        "packet_id": packet_id,
        "schema": schema,
        "hash": canonical_hash(body),
        "payload": body,
    }


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


class AlphaTradeState:
    def __init__(self) -> None:
        self.route_receipt: dict[str, Any] | None = None
        self.reset()

    def reset(self) -> None:
        self.stop_anvil()
        self.phase = "offer_review"
        self.events: list[dict[str, Any]] = []
        self.packets: list[dict[str, Any]] = []
        self.catalog_lookup: dict[str, Any] | None = None
        self.catalog_contact_packet: dict[str, Any] | None = None
        self.route_receipt: dict[str, Any] | None = None
        self.delivery_receipt: dict[str, Any] | None = None
        self.closure_receipt: dict[str, Any] | None = None
        self.route_error = ""
        self.evm_error = ""
        self.started_at = utc_now()
        self.record_event("TradeLoaded", "Golden Pokemon alpha fixture loaded.")

    def ensure_catalog_reference(self) -> None:
        if self.catalog_lookup:
            return

        lookup = CATALOG.get_card("neo2-1", trade_id="alpha-espeon-001")
        self.catalog_lookup = lookup
        receipt = lookup["contact_receipt"]
        receipt_payload = {
            key: value
            for key, value in receipt["payload"].items()
            if key not in {"schema", "packet_id"}
        }
        contact_packet = self.add_packet(
            "catalog_contact:pokemon_tcg_api:neo2-1",
            "marketplace.contact_receipt.external.v0.1",
            receipt_payload,
        )
        self.catalog_contact_packet = contact_packet

        card = lookup.get("selected_card") or {}
        source_mode = "cache" if receipt["payload"]["response"].get("cache_hit") else "live API"
        if receipt["payload"]["response"].get("fallback_static_reference"):
            source_mode = "static fallback"
        self.record_event(
            "CatalogContactReceiptAttached",
            f"Catalog candidate {card.get('id', 'no match')} via {source_mode}: {contact_packet['hash']}",
        )

    def stop_anvil(self) -> None:
        receipt = getattr(self, "route_receipt", None)
        pid = receipt.get("anvil_pid") if isinstance(receipt, dict) else None
        if not pid:
            return
        try:
            os.kill(int(pid), signal.SIGTERM)
        except ProcessLookupError:
            return
        except OSError:
            return

    def record_event(self, event_type: str, summary: str) -> None:
        self.events.append(
            {
                "event_type": event_type,
                "summary": summary,
                "at": utc_now(),
            }
        )

    def add_packet(self, packet_id: str, schema: str, payload: dict[str, Any]) -> dict[str, Any]:
        record = packet(packet_id, schema, payload | {"created_at": utc_now(), "trade_id": "alpha-espeon-001"})
        self.packets.append(record)
        return record

    def work_gradient(self) -> dict[str, Any]:
        if self.phase == "offer_review":
            funded = "none"
            selected = "quick_photo"
        elif self.phase in {
            "fee_accepted",
            "seller_response_received",
            "shipping_approved",
            "route_locked",
            "inspection_open",
            "settled",
            "claim_open",
        }:
            funded = "quick_photo"
            selected = "quick_photo"
        else:
            funded = "none"
            selected = "none"

        return {
            "title": "Funded work gradient",
            "summary": "Work scales from agent review to human-heavy proof. Each rung names who works, what it costs, and what it still does not prove.",
            "selected_key": selected,
            "funded_key": funded,
            "rungs": [
                {
                    "key": "included",
                    "label": "Included",
                    "amount": "$0",
                    "work": "Agent reads saved evidence",
                    "time": "instant",
                    "status": "available",
                },
                {
                    "key": "quick_photo",
                    "label": "Quick seller work",
                    "amount": "$5",
                    "work": "One new surface angle",
                    "time": "~10 min",
                    "status": "funded" if funded == "quick_photo" else "selected",
                },
                {
                    "key": "proof_set",
                    "label": "Proof set",
                    "amount": "$15",
                    "work": "Back, corners, packaging",
                    "time": "~30 min",
                    "status": "available",
                },
                {
                    "key": "human_heavy",
                    "label": "Human-heavy",
                    "amount": "$35+",
                    "work": "Video, shop check, local handoff",
                    "time": "scheduled",
                    "status": "requires_human",
                },
            ],
        }

    def ask_photo(self) -> dict[str, Any]:
        self.ensure_catalog_reference()
        if self.phase != "offer_review":
            return self.snapshot()

        gradient = self.add_packet(
            "seller_attention_gradient:req_surface_01",
            "marketplace.work_funding_gradient.v0.1",
            {
                "gradient_id": "seller_attention_gradient:req_surface_01",
                "funding_principle": "work_requires_a_funded_gradient",
                "selected_rung": "quick_photo",
                "rungs": [
                    {
                        "key": "included",
                        "amount": 0,
                        "currency": "USD",
                        "worker": "buyer_agent",
                        "work": "read existing evidence",
                        "not_claiming": ["new_seller_attention", "new_physical_evidence"],
                    },
                    {
                        "key": "quick_photo",
                        "amount": 5,
                        "currency": "USD",
                        "worker": "seller",
                        "work": "one angled shiny-surface photo",
                        "deadline": "10m",
                        "credit_if_purchase": 5,
                        "not_claiming": ["authenticity", "professional_grade", "full_condition_audit"],
                    },
                    {
                        "key": "proof_set",
                        "amount": 15,
                        "currency": "USD",
                        "worker": "seller",
                        "work": "back, four corners, packaging materials",
                        "deadline": "30m",
                        "credit_if_purchase": "agent_negotiated",
                        "not_claiming": ["third_party_verification", "delivery_success"],
                    },
                    {
                        "key": "human_heavy",
                        "amount": "35+",
                        "currency": "USD",
                        "worker": "seller_or_shop_human",
                        "work": "video walkthrough, shop check, or local handoff",
                        "deadline": "scheduled",
                        "requires_explicit_human_approval": True,
                        "not_claiming": ["automatic_acceptance", "unbounded_seller_availability"],
                    },
                ],
            },
        )
        request = self.add_packet(
            "evidence_request:req_surface_01",
            "marketplace.evidence_request.v0.1",
            {
                "request_id": "req_surface_01",
                "requested_by": "buyer_agent",
                "requested_from": "seller_agent",
                "work_required": "angled shiny-surface photo",
                "funded_gradient_hash": gradient["hash"],
                "funded_gradient_rung": "quick_photo",
                "reason": "glare hides holo surface condition",
                "deadline": "10m",
                "not_claiming": ["condition_truth", "authenticity", "professional_grade"],
            },
        )
        fee_terms = self.add_packet(
            "evidence_request_fee_terms:req_surface_01",
            "marketplace.evidence_request_fee_terms.v0.1",
            {
                "request_id": "req_surface_01",
                "work_required": "angled shiny-surface photo",
                "funded_gradient_hash": gradient["hash"],
                "funded_gradient_rung": "quick_photo",
                "amount": 5,
                "currency": "USD",
                "payer": "buyer",
                "recipient": "seller",
                "escrowed": True,
                "trigger_for_payment": "seller_submits_response_hash_before_expiry",
                "credit_policy": {
                    "credited_if_purchase": True,
                    "credit_amount": 5,
                    "seller_keeps_amount": 0,
                },
                "refund_policy": "refund_if_seller_misses_deadline",
                "quality_floor": "human_or_agent_judged",
                "expires_in": "10m",
                "dispute_path": "agent_review_then_buyer_question",
                "not_claiming": ["photo_quality_truth", "condition_truth"],
            },
        )
        cost_trace = self.add_packet(
            "cost_dimensional_trace:req_surface_01",
            "marketplace.cost_dimensional_trace.v0.1",
            {
                "scalar_summary": "$5 seller time",
                "native_dimensions": {
                    "funded_gradient_rung": "quick_photo",
                    "seller_time_minutes": 10,
                    "seller_fee_usd": 5,
                    "credit_if_purchase_usd": 5,
                    "risk_reduced": "surface condition ambiguity",
                    "not_reduced": ["authenticity", "professional_grade", "seller possession after response"],
                },
                "conversion_rationale": "seller quoted one extra photo",
                "reversible_refs": [gradient["hash"], fee_terms["hash"], request["hash"]],
            },
        )
        availability = self.add_packet(
            "human_availability:buyer_01",
            "marketplace.human_availability_window.v0.1",
            {
                "human_id": "buyer:che-fixture",
                "agent_id": "buyer_agent",
                "available_before_deadline": True,
                "expected_response_window": "5m",
                "channels": ["alpha_ui"],
                "interrupt_budget_remaining": 2,
                "may_interrupt_for": ["risk_acceptance", "shipping_approval"],
                "must_not_interrupt_for": ["already_available_facts"],
                "default_action_if_unavailable": "do_not_ship",
            },
        )

        self.phase = "fee_accepted"
        self.record_event("EvidenceRequestFeeAccepted", "Buyer funded $5 seller-time request.")
        self.record_event("WorkFundingGradientAttached", f"Funded gradient attached: {gradient['hash']}")
        self.record_event("CostDimensionalTraceAttached", f"Cost trace attached: {cost_trace['hash']}")
        self.record_event("HumanAvailabilityUpdated", f"Human availability attached: {availability['hash']}")
        return self.snapshot()

    def seller_response(self) -> dict[str, Any]:
        if self.phase != "fee_accepted":
            return self.snapshot()

        response = self.add_packet(
            "seller_evidence_response:req_surface_01",
            "marketplace.seller_evidence_response.v0.1",
            {
                "request_id": "req_surface_01",
                "response_type": "angled shiny-surface photo",
                "asset_hash": "sha256:fixture-surface-angle-photo",
                "submitted_before_deadline": True,
                "seller_fee_triggered": True,
                "not_claiming": ["authenticity", "professional_grade"],
            },
        )
        review = self.add_packet(
            "agent_surface_review:req_surface_01",
            "marketplace.agent_judgment.v0.1",
            {
                "request_id": "req_surface_01",
                "inputs": [response["hash"]],
                "judgment": "surface glare resolved enough for buyer mandate",
                "confidence": "medium",
                "not_claiming": ["condition_truth", "authenticity", "professional_grade"],
            },
        )
        self.phase = "seller_response_received"
        self.record_event("EvidenceAccepted", f"Seller response accepted for review: {response['hash']}")
        self.record_event("AgentJudgmentAttached", f"Surface judgment attached: {review['hash']}")
        return self.snapshot()

    def approve_shipping(self) -> dict[str, Any]:
        self.ensure_catalog_reference()
        if self.phase != "seller_response_received":
            return self.snapshot()

        wall_bundle = self.add_packet(
            "route_wall_bundle:alpha_espeon_001",
            "marketplace.route_wall_bundle.v0.1",
            {
                "gate": "route_commitment",
                "gate_id": "alpha-espeon-001:route_commitment",
                "leg": "forward",
                "required_commitments": {
                    "buyer_intent": "present",
                    "escrow_terms": "present",
                    "card_reference": "present",
                    "item_fingerprint": "present",
                    "inventory_lock": "present",
                    "evidence_profile": "present",
                    "bond_scope": "present",
                    "proof_vector_scope": "present",
                    "route_risk_owner": "present",
                    "arbiter_policy": "present",
                },
                "blocking_missing": [],
                "waived_or_judged": ["surface_condition_judged_by_buyer_agent"],
                "not_claiming": ["authenticity", "professional_grade", "delivery_success"],
            },
        )
        assembly_history = self.add_packet(
            "assembly_history:alpha_espeon_001",
            "marketplace.assembly_provenance.v0.1",
            {
                "gate": {
                    "gate_type": "route_commitment",
                    "gate_id": "alpha-espeon-001:route_commitment",
                    "leg": "forward",
                },
                "foundation": {
                    "wall_bundle_hash": wall_bundle["hash"],
                    "item_fingerprint": "present",
                    "inventory_lock": "present",
                    "route_terms": "present",
                },
                "predecessor_packet_refs": [
                    "card_reference:alpha_espeon_001",
                    "item_fingerprint:alpha_espeon_001",
                    "inventory_lock:alpha_espeon_001",
                    "route_wall_bundle:alpha_espeon_001",
                ],
                "contact_receipt_refs": [
                    "seller_evidence_response:req_surface_01",
                    "agent_surface_review:req_surface_01",
                ],
                "allowed_gates": ["route_commitment"],
                "not_claiming": ["authenticity", "professional_grade", "delivery_success"],
            },
        )
        spendability = self.add_packet(
            "route_spendability:alpha_espeon_001",
            "marketplace.evidence_spendability.v0.1",
            {
                "gate": {
                    "gate_type": "route_commitment",
                    "gate_id": "alpha-espeon-001:route_commitment",
                    "leg": "forward",
                    "consumption": "single_use",
                },
                "wall_bundle_hash": wall_bundle["hash"],
                "assembly_history_hash": assembly_history["hash"],
                "route_assembly_witness": "contract_derived_at_route_commit",
                "manifest_or_evidence_refs": [
                    "seller_evidence_response:req_surface_01",
                    "agent_surface_review:req_surface_01",
                ],
                "spendable_claims": [
                    "route_readiness_after_surface_photo",
                    "wall_bundle_satisfied",
                    "assembly_provenance_satisfied",
                ],
                "consumption_mode": "single_use_route_lock",
                "decision_authority": "buyer_agent_with_human_available",
                "status": "active",
                "not_claiming": ["authenticity", "professional_grade", "delivery_success"],
            },
        )
        self.phase = "shipping_approved"
        self.record_event("RouteWallBundlePrepared", f"Route wall bundle prepared: {wall_bundle['hash']}")
        self.record_event(
            "AssemblyHistoryPrepared",
            f"Assembly history prepared: {assembly_history['hash']}",
        )
        self.record_event(
            "RouteSpendabilityPrepared",
            f"Route spendability cites wall bundle and assembly: {spendability['hash']}",
        )
        return self.snapshot()

    def route_gate_status(self) -> dict[str, Any]:
        wall_bundle = next(
            (
                record
                for record in reversed(self.packets)
                if record["schema"] == "marketplace.route_wall_bundle.v0.1"
            ),
            None,
        )
        spendability = next(
            (
                record
                for record in reversed(self.packets)
                if record["schema"] == "marketplace.evidence_spendability.v0.1"
                and isinstance(record["payload"].get("gate"), dict)
                and record["payload"]["gate"].get("gate_type") == "route_commitment"
            ),
            None,
        )
        assembly_history = next(
            (
                record
                for record in reversed(self.packets)
                if record["schema"] == "marketplace.assembly_provenance.v0.1"
            ),
            None,
        )
        spendability_cites_bundle = bool(
            wall_bundle
            and spendability
            and spendability["payload"].get("wall_bundle_hash") == wall_bundle["hash"]
        )
        spendability_cites_assembly = bool(
            assembly_history
            and spendability
            and spendability["payload"].get("assembly_history_hash") == assembly_history["hash"]
        )
        route_assembly_witness_hash = (
            self.route_receipt.get("route_assembly_witness_hash")
            if self.route_receipt
            else ""
        )
        route_spendability_evm_hash = (
            evm_bytes32_ref(
                schema="marketplace.route_spendability_evm_hash.v0.1",
                value=spendability["hash"],
            )
            if spendability
            else ""
        )
        return {
            "wall_bundle_ready": bool(wall_bundle),
            "assembly_history_ready": bool(assembly_history),
            "route_spendability_ready": bool(spendability),
            "spendability_cites_bundle": spendability_cites_bundle,
            "spendability_cites_assembly": spendability_cites_assembly,
            "ready_for_evm_route_lock": bool(
                wall_bundle
                and assembly_history
                and spendability
                and spendability_cites_bundle
                and spendability_cites_assembly
            ),
            "evm_route_locked": bool(self.route_receipt),
            "wall_bundle_hash": wall_bundle["hash"] if wall_bundle else "",
            "assembly_history_hash": assembly_history["hash"] if assembly_history else "",
            "route_spendability_hash": spendability["hash"] if spendability else "",
            "route_spendability_evm_hash": route_spendability_evm_hash,
            "route_assembly_witness_hash": route_assembly_witness_hash,
            "route_wall_bundle_evm_hash": route_assembly_witness_hash,
        }

    def commit_route(self) -> dict[str, Any]:
        if self.phase == "route_locked":
            return self.snapshot()
        if self.phase != "shipping_approved":
            return self.snapshot()

        gate = self.route_gate_status()
        if not gate["ready_for_evm_route_lock"]:
            self.route_error = "Route gate is not ready for EVM commit."
            self.record_event("EvmRouteCommitBlocked", self.route_error)
            return self.snapshot()

        script = CHAIN / "script" / "alpha_route_commit.py"
        cmd = [
            sys.executable,
            str(script),
            "--wall-bundle-hash",
            gate["wall_bundle_hash"],
            "--assembly-history-hash",
            gate["assembly_history_hash"],
            "--route-spendability-hash",
            gate["route_spendability_hash"],
            "--route-spendability-evm-hash",
            gate["route_spendability_evm_hash"],
            "--port",
            str(free_port()),
            "--keep-anvil",
        ]
        completed = subprocess.run(
            cmd,
            cwd=str(CHAIN),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=120,
            check=False,
        )
        if completed.returncode != 0:
            self.route_error = completed.stdout.strip()[-1200:] or "EVM route commit failed."
            self.record_event("EvmRouteCommitFailed", self.route_error.splitlines()[-1])
            return self.snapshot()

        try:
            receipt = json.loads(completed.stdout.strip().splitlines()[-1])
        except (json.JSONDecodeError, IndexError) as error:
            self.route_error = f"Could not parse route receipt: {error}"
            self.record_event("EvmRouteCommitFailed", self.route_error)
            return self.snapshot()

        compact = {
            "run_id": receipt["run_id"],
            "generated_at": receipt["generated_at"],
            "rpc_url": receipt["rpc_url"],
            "chain_id": receipt["chain_id"],
            "ephemeral_anvil": receipt["ephemeral_anvil"],
            "anvil_pid": receipt.get("anvil_pid"),
            "escrow": receipt["escrow"],
            "trade_id": receipt["trade_id"],
            "final_state": receipt["final_state"],
            "route_tx_hash": receipt["route_tx_hash"],
            "wall_bundle_hash": receipt["wall_bundle_hash"],
            "assembly_history_hash": receipt["assembly_history_hash"],
            "wall_bundle_evm_ref": receipt["wall_bundle_evm_ref"],
            "assembly_history_evm_ref": receipt["assembly_history_evm_ref"],
            "route_assembly_witness_hash": receipt["route_assembly_witness_hash"],
            "route_wall_bundle_evm_hash": receipt["route_assembly_witness_hash"],
            "route_spendability_hash": receipt["route_spendability_hash"],
            "route_spendability_evm_hash": receipt["route_spendability_evm_hash"],
            "report": receipt["report"],
            "summary": receipt.get("summary"),
        }
        self.route_receipt = compact
        self.route_error = ""
        route_receipt = self.add_packet(
            "evm_route_receipt:alpha_espeon_001",
            "marketplace.evm_route_commit_receipt.v0.1",
            compact,
        )
        self.phase = "route_locked"
        self.record_event("EvmRouteCommitted", f"Route locked on local EVM: {compact['route_tx_hash']}")
        self.record_event("EvmRouteReceiptAttached", f"Route receipt packet attached: {route_receipt['hash']}")
        return self.snapshot()

    def run_evm_step(self, action: str) -> dict[str, Any] | None:
        if not self.route_receipt or not self.route_receipt.get("summary"):
            self.evm_error = "No live EVM route receipt is available."
            self.record_event("EvmStepBlocked", self.evm_error)
            return None

        script = CHAIN / "script" / "alpha_trade_step.py"
        completed = subprocess.run(
            [
                sys.executable,
                str(script),
                "--summary",
                str(ROOT / self.route_receipt["summary"]),
                "--action",
                action,
            ],
            cwd=str(CHAIN),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=120,
            check=False,
        )
        if completed.returncode != 0:
            self.evm_error = completed.stdout.strip()[-1200:] or f"EVM step failed: {action}"
            self.record_event("EvmStepFailed", self.evm_error.splitlines()[-1])
            return None

        try:
            receipt = json.loads(completed.stdout.strip().splitlines()[-1])
        except (json.JSONDecodeError, IndexError) as error:
            self.evm_error = f"Could not parse EVM step receipt: {error}"
            self.record_event("EvmStepFailed", self.evm_error)
            return None

        compact = {
            "run_id": receipt["run_id"],
            "action": receipt["action"],
            "generated_at": receipt["generated_at"],
            "rpc_url": receipt["rpc_url"],
            "chain_id": receipt["chain_id"],
            "anvil_pid": receipt.get("anvil_pid"),
            "escrow": receipt["escrow"],
            "trade_id": receipt["trade_id"],
            "final_state": receipt["final_state"],
            "packets": receipt["packets"],
            "transactions": receipt["transactions"],
            "interpretation": receipt["interpretation"],
            "report": receipt["report"],
        }
        self.evm_error = ""
        return compact

    def mark_delivered(self) -> dict[str, Any]:
        if self.phase != "route_locked":
            return self.snapshot()
        receipt = self.run_evm_step("mark-delivered")
        if not receipt:
            return self.snapshot()

        self.delivery_receipt = receipt
        delivery_packet = self.add_packet(
            "evm_delivery_receipt:alpha_espeon_001",
            "marketplace.evm_delivery_receipt.v0.1",
            receipt,
        )
        self.phase = "inspection_open"
        tx_hash = receipt["transactions"][-1]["tx_hash"]
        self.record_event("EvmDeliveryMarked", f"Inspection opened on local EVM: {tx_hash}")
        self.record_event("EvmDeliveryReceiptAttached", f"Delivery receipt packet attached: {delivery_packet['hash']}")
        return self.snapshot()

    def buyer_accept(self) -> dict[str, Any]:
        if self.phase != "inspection_open":
            return self.snapshot()
        receipt = self.run_evm_step("buyer-accept")
        if not receipt:
            return self.snapshot()

        self.closure_receipt = receipt
        closure_packet = self.add_packet(
            "evm_final_receipt:alpha_espeon_001",
            "marketplace.evm_final_receipt.v0.1",
            receipt,
        )
        self.phase = "settled"
        tx_hash = receipt["transactions"][-1]["tx_hash"]
        self.record_event("EvmBuyerAccepted", f"Trade settled on local EVM: {tx_hash}")
        self.record_event("EvmFinalReceiptAttached", f"Final receipt packet attached: {closure_packet['hash']}")
        return self.snapshot()

    def open_claim(self) -> dict[str, Any]:
        if self.phase != "inspection_open":
            return self.snapshot()
        receipt = self.run_evm_step("open-claim")
        if not receipt:
            return self.snapshot()

        self.closure_receipt = receipt
        claim_packet = self.add_packet(
            "evm_claim_receipt:alpha_espeon_001",
            "marketplace.evm_claim_receipt.v0.1",
            receipt,
        )
        self.phase = "claim_open"
        tx_hash = receipt["transactions"][-1]["tx_hash"]
        self.record_event("EvmClaimOpened", f"Claim opened on local EVM: {tx_hash}")
        self.record_event("EvmClaimReceiptAttached", f"Claim receipt packet attached: {claim_packet['hash']}")
        return self.snapshot()

    def accept_risk(self) -> dict[str, Any]:
        if self.phase not in {"offer_review", "fee_accepted"}:
            return self.snapshot()

        risk = self.add_packet(
            "buyer_risk_acceptance:surface_waiver",
            "marketplace.buyer_risk_acceptance.v0.1",
            {
                "accepted_evidence_refs": ["front_scan", "back_scan", "corner_images", "seller_statement"],
                "waived_evidence_requirements": ["angled_shiny_surface_photo"],
                "remaining_unproven_claims": ["surface condition detail"],
                "claim_consequences": ["later condition claim is weaker without pre-route surface photo"],
                "human_mandate_ref": "buyer.mandate.tcg.medium_risk.v0.1",
                "signature": "fixture:buyer_signature",
            },
        )
        self.phase = "risk_accepted"
        self.record_event("BuyerRiskAccepted", f"Surface risk accepted: {risk['hash']}")
        return self.snapshot()

    def pass_trade(self) -> dict[str, Any]:
        if self.phase == "trade_passed":
            return self.snapshot()
        cancellation = self.add_packet(
            "trade_cancelled:buyer_pass",
            "marketplace.trade_cancellation.v0.1",
            {
                "reason": "buyer_passed",
                "open_fees": "refund_unearned_attention_fee",
                "signature": "fixture:buyer_agent_signature",
            },
        )
        self.phase = "trade_passed"
        self.record_event("TradeCancelled", f"Buyer passed on card: {cancellation['hash']}")
        return self.snapshot()

    def snapshot(self) -> dict[str, Any]:
        self.ensure_catalog_reference()
        ui_by_phase = {
            "offer_review": {
                "state_chip": "One paid question",
                "summary": "Seller has a candidate card at $640 shipped. Your agent likes it; one paid question remains before shipping can be approved.",
                "agent_copy": "This looks like the card you want. I would keep going, but I would not approve shipping yet.",
                "why": "The card, price, seller history, and protections are good enough to keep talking.",
                "need": "One angled photo of the shiny surface before we treat the condition as safe enough.",
                "decision_title": "Spend $5 of seller time?",
                "decision_note": "The seller takes one more photo. If it looks right, your agent can approve shipping. The $5 is credited back if you buy.",
                "primary": {"label": "Ask for angled shiny-surface photo, $5", "action": "ask-photo"},
                "secondary": {"label": "Buy without the extra photo, $0", "action": "accept-risk"},
                "pass": {"label": "Pass on this card", "action": "pass"},
                "checked": "the money is held safely, the seller has something at stake, and the photos are saved.",
                "judgment": "the card looks right and close to lightly played, but glare hides the shiny surface.",
            },
            "fee_accepted": {
                "state_chip": "Request funded",
                "summary": "The $5 seller-time request is funded. The seller has 10 minutes to answer or the fee refunds.",
                "agent_copy": "The request is clean: one photo, one deadline, $5 credited back if you buy.",
                "why": "The seller knows exactly what work is covered, and your fee terms are recorded.",
                "need": "Wait for the seller response before approving shipping.",
                "decision_title": "Waiting on the seller.",
                "decision_note": "For the local demo, simulate the seller sending the requested photo.",
                "primary": {"label": "Simulate seller response", "action": "seller-response"},
                "secondary": {"label": "Buy without waiting", "action": "accept-risk"},
                "pass": {"label": "Pass on this card", "action": "pass"},
                "checked": "the paid request, credit terms, deadline, and human availability are packeted.",
                "judgment": "photo quality is still judged by the agent or human after the seller responds.",
            },
            "seller_response_received": {
                "state_chip": "Photo received",
                "summary": "The seller answered the paid request. Your agent thinks the surface looks safe enough to approve shipping.",
                "agent_copy": "The extra photo reduced the surface question. I can approve shipping inside your mandate.",
                "why": "The seller did the paid work before the deadline, and the response hash is saved.",
                "need": "Approve shipping or ask the human before route commitment.",
                "decision_title": "Approve shipping?",
                "decision_note": "This prepares the route wall bundle and spendability. It does not prove authenticity or guarantee grade.",
                "primary": {"label": "Approve shipping", "action": "approve-shipping"},
                "secondary": {"label": "Buy without more review", "action": "approve-shipping"},
                "pass": {"label": "Pass on this card", "action": "pass"},
                "checked": "the seller response and agent judgment are packeted.",
                "judgment": "surface condition is acceptable enough for this buyer mandate, not professionally graded.",
            },
            "shipping_approved": {
                "state_chip": "Shipping approved",
                "summary": "Shipping approval is ready. The route gate now has both a wall bundle and spendability for that bundle.",
                "agent_copy": "The paid-photo loop completed. I can now carry this exact evidence bundle to the route gate.",
                "why": "The wall bundle says the required commitments are present. Spendability says this evidence may be used at this gate.",
                "need": "The next EVM step would consume spendability and lock the route.",
                "decision_title": "Commit route?",
                "decision_note": "This sends the wall bundle and spendability into a local Anvil escrow. It still does not prove authenticity, grade, or delivery.",
                "primary": {"label": "Commit route on local EVM", "action": "commit-route"},
                "secondary": {"label": "Reset active demo", "action": "reset"},
                "pass": {"label": "Reset active demo", "action": "reset"},
                "checked": "route wall bundle and route spendability are packeted.",
                "judgment": "the physical truth is still a claim surface for delivery and inspection.",
            },
            "route_locked": {
                "state_chip": "Route locked",
                "summary": "The local EVM accepted the route commit. Spendability was consumed and the escrow is now RouteLocked.",
                "agent_copy": "The route is now locked on the local chain. The next human-facing moment would be delivery, inspection, accept, or claim.",
                "why": "The route call carried the route packet, route spendability hash, and wall-bundle hash into escrow.",
                "need": "Delivery evidence or a claim path is the next protocol surface.",
                "decision_title": "Mark delivered?",
                "decision_note": "This records seller-signed delivery evidence and opens the inspection window. It still does not say the buyer is happy.",
                "primary": {"label": "Mark delivered on local EVM", "action": "mark-delivered"},
                "secondary": {"label": "Reset active demo", "action": "reset"},
                "pass": {"label": "Reset active demo", "action": "reset"},
                "checked": "the local escrow reached RouteLocked.",
                "judgment": "delivery, inspection, and claims remain future judgment surfaces.",
            },
            "inspection_open": {
                "state_chip": "Inspection open",
                "summary": "Seller-signed delivery evidence opened the inspection window. Now the buyer can accept or open a claim.",
                "agent_copy": "The package is delivered in the protocol sense. I can release funds only if you are happy with the card.",
                "why": "Delivery evidence moved the escrow to InspectionOpen. That is route completion, not card satisfaction.",
                "need": "Inspect the card. Accept if it matches; open a claim if condition or identity is materially wrong.",
                "decision_title": "Accept or claim?",
                "decision_note": "Accepting releases escrow and seller bond. A claim posts the dispute bond and preserves the evidence trail for arbitration.",
                "primary": {"label": "Accept card and release escrow", "action": "buyer-accept"},
                "secondary": {"label": "Open condition claim", "action": "open-claim"},
                "pass": {"label": "Reset active demo", "action": "reset"},
                "checked": "delivery evidence is signed and the inspection window is open.",
                "judgment": "card condition, authenticity, and buyer satisfaction are still human/agent judgment.",
            },
            "settled": {
                "state_chip": "Settled",
                "summary": "The buyer accepted the card. Escrow and seller bond released, and the final receipt is reusable trust.",
                "agent_copy": "This trade closed cleanly. The seller can carry this receipt into the next negotiation.",
                "why": "Buyer acceptance is the spendable closure event for a clean trade.",
                "need": "Nothing else for this trade.",
                "decision_title": "Final receipt written.",
                "decision_note": "The receipt says this route and inspection closed cleanly. It does not become a universal seller score.",
                "primary": {"label": "Reset active demo", "action": "reset"},
                "secondary": {"label": "Reset active demo", "action": "reset"},
                "pass": {"label": "Reset active demo", "action": "reset"},
                "checked": "escrow reached Settled and object locks were released.",
                "judgment": "future buyers still decide how much this receipt matters.",
            },
            "claim_open": {
                "state_chip": "Claim open",
                "summary": "The buyer opened a condition claim inside the inspection window. The dispute is preserved, not decided.",
                "agent_copy": "I have opened the claim and posted the dispute bond. The next wall is arbiter review.",
                "why": "Claim evidence and a buyer dispute bond moved escrow to ClaimOrDisputePending.",
                "need": "An arbiter or arbiter-agent assembles the case file and applies the bound policy.",
                "decision_title": "Claim packeted.",
                "decision_note": "The protocol has made the disagreement legible. It has not collapsed the disagreement into blame.",
                "primary": {"label": "Reset active demo", "action": "reset"},
                "secondary": {"label": "Reset active demo", "action": "reset"},
                "pass": {"label": "Reset active demo", "action": "reset"},
                "checked": "claim evidence, claim packet, and dispute bond are anchored.",
                "judgment": "arbiter judgment remains the backstop for physical truth.",
            },
            "risk_accepted": {
                "state_chip": "Risk recorded",
                "summary": "You chose to buy without the extra photo. The surface risk is now explicit instead of hidden.",
                "agent_copy": "I can proceed only because the unresolved surface risk is recorded.",
                "why": "Convenience stayed possible, but it did not become certainty.",
                "need": "Route approval would carry this waiver forward.",
                "decision_title": "Risk accepted.",
                "decision_note": "Reset the demo to test the paid-photo path.",
                "primary": {"label": "Reset active demo", "action": "reset"},
                "secondary": {"label": "Reset active demo", "action": "reset"},
                "pass": {"label": "Reset active demo", "action": "reset"},
                "checked": "buyer risk acceptance is packeted.",
                "judgment": "later condition claims are weaker without the extra photo.",
            },
            "trade_passed": {
                "state_chip": "Passed",
                "summary": "You passed on this card. Any unearned attention fee would refund.",
                "agent_copy": "No shipping, no claim, no extra seller work.",
                "why": "Passing is a clean endpoint.",
                "need": "Reset the demo to test again.",
                "decision_title": "Trade closed.",
                "decision_note": "Reset the local state.",
                "primary": {"label": "Reset active demo", "action": "reset"},
                "secondary": {"label": "Reset active demo", "action": "reset"},
                "pass": {"label": "Reset active demo", "action": "reset"},
                "checked": "cancellation is packeted.",
                "judgment": "none needed.",
            },
        }
        latest = self.packets[-1] if self.packets else None
        reference_card = (self.catalog_lookup or {}).get("selected_card") or {
            "id": "neo2-1",
            "name": "Espeon",
            "set": {"name": "Neo Discovery", "series": "Neo"},
            "number": "1",
            "rarity": "Rare Holo",
            "artist": "Atsuko Nishida",
            "images": {
                "small": "https://images.pokemontcg.io/neo2/1.png",
                "large": "https://images.pokemontcg.io/neo2/1_hires.png",
            },
            "pricing_refs": {},
        }
        return {
            "trade_id": "alpha-espeon-001",
            "phase": self.phase,
            "generated_at": utc_now(),
            "card": {
                "title": "Neo Discovery Espeon, raw, lightly played or better.",
                "offer_price_usd": 640,
                "reference": f"{reference_card.get('name', 'Espeon')} / {reference_card.get('set', {}).get('name', 'Neo Discovery')} / #{reference_card.get('number', '1')}",
                "reference_card": reference_card,
            },
            "catalog": {
                "source": (self.catalog_lookup or {}).get("source"),
                "request_url": (self.catalog_lookup or {}).get("request_url", ""),
                "reference_card": reference_card,
                "contact_receipt": self.catalog_contact_packet,
                "not_claiming": [
                    "seller possession",
                    "authenticity",
                    "condition",
                    "seller inventory existence",
                    "price fairness",
                ],
            },
            "ui": ui_by_phase[self.phase],
            "work_gradient": self.work_gradient(),
            "cost_line": {
                "seller_time": "$5",
                "delay": "~10 min",
                "unlocks": "Shipping",
                "safety_work": "$17",
                "shipping_insurance": "$12",
                "marketplace_fee_avoided": "$72",
                "estimated_savings_after_fees": "$39",
            },
            "route_gate": self.route_gate_status(),
            "evm_route": {
                "receipt": self.route_receipt,
                "error": self.route_error,
            },
            "evm_lifecycle": {
                "delivery": self.delivery_receipt,
                "closure": self.closure_receipt,
                "error": self.evm_error,
            },
            "packets": self.packets,
            "events": self.events[-10:],
            "latest_packet": latest,
        }


STATE = AlphaTradeState()


class AlphaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/api/alpha/trade":
            self.send_json(STATE.snapshot())
            return
        if path == "/api/catalog/search":
            params = parse_qs(parsed.query)
            query = params.get("q", [""])[0]
            page_size_raw = params.get("pageSize", ["8"])[0]
            page_raw = params.get("page", ["1"])[0]
            try:
                page_size = int(page_size_raw)
            except ValueError:
                page_size = 8
            try:
                page = int(page_raw)
            except ValueError:
                page = 1
            self.send_json(CATALOG.search(query, page_size=page_size, page=page))
            return
        if path == "/api/catalog/agent-search":
            params = parse_qs(parsed.query)
            query = params.get("q", [""])[0]
            page_size_raw = params.get("pageSize", ["12"])[0]
            page_raw = params.get("page", ["1"])[0]
            try:
                page_size = int(page_size_raw)
            except ValueError:
                page_size = 12
            try:
                page = int(page_raw)
            except ValueError:
                page = 1
            self.send_json(CATALOG.agent_search(query, page_size=page_size, page=page))
            return
        if path.startswith("/api/catalog/cards/"):
            card_id = unquote(path.removeprefix("/api/catalog/cards/"))
            self.send_json(CATALOG.get_card(card_id))
            return
        super().do_GET()

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        action = path.removeprefix("/api/alpha/actions/")
        if path == "/api/alpha/reset" or action == "reset":
            STATE.reset()
            self.send_json(STATE.snapshot())
            return
        handlers = {
            "ask-photo": STATE.ask_photo,
            "seller-response": STATE.seller_response,
            "approve-shipping": STATE.approve_shipping,
            "commit-route": STATE.commit_route,
            "mark-delivered": STATE.mark_delivered,
            "buyer-accept": STATE.buyer_accept,
            "open-claim": STATE.open_claim,
            "accept-risk": STATE.accept_risk,
            "pass": STATE.pass_trade,
        }
        if action in handlers:
            self.send_json(handlers[action]())
            return
        self.send_error(404, "Unknown alpha action")

    def send_json(self, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the active Pokemon alpha local server.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    atexit.register(STATE.stop_anvil)

    def shutdown(_signum: int, _frame: object) -> None:
        STATE.stop_anvil()
        raise SystemExit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    server = ThreadingHTTPServer((args.host, args.port), AlphaHandler)
    print(f"http://{args.host}:{args.port}/alpha-interface.html")
    server.serve_forever()


if __name__ == "__main__":
    main()
