#!/usr/bin/env python3
"""Canonical wall packet commitments for the Marketplace protocol harness."""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from typing import Any

from protocol_wall_pressure_sim import (
    CLAIM_MATRIX,
    CORE_BOND_FAILURES,
    DEFAULT_RAW_500_2000_EVIDENCE,
    HARD_ACCEPTANCE_PACKETS,
    REQUIRED_CARD_REFERENCE_NOT_CLAIMING,
    REQUIRED_PROOF_NOT_CLAIMING,
    Scenario,
    WallResult,
    evaluate_walls,
)


WALL_PACKET_KEYS = {
    "card_reference_packet": "card_reference",
    "proof_vector_scope_packet": "proof_vector_scope",
    "bond_scope_packet": "bond_scope",
    "route_insurance_risk_owner_packet": "route_insurance_risk_owner",
}

ROUTE_ASSEMBLY_PACKET_KEYS = {
    "card_reference",
    "item_fingerprint_hash",
    "inventory_lock_hash",
    "proof_vector_scope",
    "bond_scope",
    "route_insurance_risk_owner",
    "arbiter_policy_hash",
    "evidence_profile_id",
}


@dataclass(frozen=True)
class PacketCommitment:
    packet_id: str
    schema: str
    hash: str
    payload: dict[str, Any]


def canonical_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")


def canonical_hash(payload: dict[str, Any]) -> str:
    return "sha256:" + hashlib.sha256(canonical_bytes(payload)).hexdigest()


def packet(packet_id: str, schema: str, payload: dict[str, Any]) -> PacketCommitment:
    body = {"schema": schema, "packet_id": packet_id, **payload}
    return PacketCommitment(packet_id=packet_id, schema=schema, hash=canonical_hash(body), payload=body)


def stub_packet(scenario: Scenario, packet_id: str, schema: str) -> PacketCommitment:
    return packet(
        packet_id,
        schema,
        {
            "trade_id": scenario.scenario_id,
            "status": "fixture_present",
            "subject": f"{scenario.scenario_id}:{packet_id}",
        },
    )


def build_pokemon_acceptance_profile(scenario: Scenario, walls: list[WallResult]) -> PacketCommitment:
    evidence_missing = sorted(DEFAULT_RAW_500_2000_EVIDENCE - scenario.seller_evidence)
    wall = next(wall for wall in walls if wall.wall_id == "POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000")
    return packet(
        "pokemon_acceptance_profile",
        "marketplace.pokemon_acceptance_profile.v0.1",
        {
            "trade_id": scenario.scenario_id,
            "domain": scenario.domain,
            "game": scenario.game,
            "trade_template": scenario.trade_template,
            "profile_id": "pokemon.raw.500_2000.v0.1",
            "item_form": scenario.item_form,
            "value_usd": scenario.value_usd,
            "required_hard_packets": sorted(HARD_ACCEPTANCE_PACKETS),
            "hard_packets_present": sorted(scenario.hard_packets & HARD_ACCEPTANCE_PACKETS),
            "seller_evidence_required": sorted(DEFAULT_RAW_500_2000_EVIDENCE),
            "seller_evidence_present": sorted(scenario.seller_evidence),
            "seller_evidence_missing": evidence_missing,
            "wall_outcome": wall.outcome,
            "wall_missing": wall.missing,
        },
    )


def build_card_reference(scenario: Scenario, walls: list[WallResult]) -> PacketCommitment | None:
    if "card_reference_packet" not in scenario.hard_packets:
        return None
    wall = next(wall for wall in walls if wall.wall_id == "CardReferenceCandidate")
    return packet(
        "card_reference",
        "marketplace.pokemon_card_reference.v0.1",
        {
            "trade_id": scenario.scenario_id,
            "domain": scenario.domain,
            "game": scenario.game,
            "reference": scenario.card_reference,
            "required_not_claiming": sorted(REQUIRED_CARD_REFERENCE_NOT_CLAIMING),
            "wall_outcome": wall.outcome,
            "wall_missing": wall.missing,
        },
    )


def build_buyer_risk_acceptance(scenario: Scenario) -> PacketCommitment | None:
    if not scenario.buyer_risk_acceptance:
        return None
    return packet(
        "buyer_risk_acceptance",
        "marketplace.buyer_risk_acceptance.v0.1",
        {"trade_id": scenario.scenario_id, **scenario.buyer_risk_acceptance},
    )


def build_bond_scope(scenario: Scenario) -> PacketCommitment | None:
    if "bond_scope_packet" not in scenario.hard_packets:
        return None
    return packet(
        "bond_scope",
        "marketplace.bond_scope.v0.1",
        {
            "trade_id": scenario.scenario_id,
            "bond_amount": "fixture:moderate",
            "covered_failures": sorted(scenario.bond_covered_failures),
            "missing_default_failures": sorted(CORE_BOND_FAILURES - scenario.bond_covered_failures),
            "excluded_failures": sorted(CORE_BOND_FAILURES - scenario.bond_covered_failures),
            "penalty_caps": {"default_bps": 2500},
            "release_conditions": ["clean_settlement", "arbiter_ruling"],
            "claim_window": "fixture:inspection_window",
            "arbiter_policy_hash": canonical_hash(
                {
                    "schema": "marketplace.arbiter_policy_ref.v0.1",
                    "trade_id": scenario.scenario_id,
                    "policy_id": "pokemon.default.policy.v0.1",
                }
            ),
            "signature": "fixture:seller_signature",
        },
    )


def build_proof_vector_scope(scenario: Scenario) -> PacketCommitment | None:
    if "proof_vector_scope_packet" not in scenario.hard_packets:
        return None
    return packet(
        "proof_vector_scope",
        "marketplace.proof_vector_scope.v0.1",
        {
            "trade_id": scenario.scenario_id,
            "proof_vector_id": "fixture:seller_shop_and_marketplace",
            "proof_source": "shop_domain_and_marketplace_account",
            "positive_claims": sorted(scenario.proof_positive_claims),
            "not_claiming": sorted(scenario.proof_not_claiming),
            "missing_not_claiming": sorted(REQUIRED_PROOF_NOT_CLAIMING - scenario.proof_not_claiming),
            "subject_binding": "seller_identity",
            "freshness": "fixture",
            "revocation_or_expiry": "fixture",
            "signature_or_reference": "fixture:seller_signature",
        },
    )


def build_route_insurance_risk_owner(scenario: Scenario) -> PacketCommitment | None:
    if "route_insurance_risk_owner_packet" not in scenario.hard_packets:
        return None
    return packet(
        "route_insurance_risk_owner",
        "marketplace.route_insurance_risk_owner.v0.1",
        {
            "trade_id": scenario.scenario_id,
            **scenario.route,
        },
    )


def build_external_availability_covenant(scenario: Scenario) -> PacketCommitment | None:
    if not scenario.external_availability_covenant:
        return None
    return packet(
        "external_availability_covenant",
        "marketplace.external_availability_covenant.v0.1",
        {
            "trade_id": scenario.scenario_id,
            "seller": "fixture:seller",
            "item_fingerprint_hash": packet_ref_hash(scenario, "item_fingerprint_hash"),
            "promise_scope": "no_external_sale_during_lock",
            "external_channels_covered": ["shop", "marketplace", "direct"],
            "starts_at": "fixture:lock_start",
            "expires_at": "fixture:route_lock_or_cancel",
            "covered_failure": "nonship_or_double_sale",
            "bond_scope_ref": packet_ref_hash(scenario, "bond_scope_packet"),
            "signature": "fixture:seller_signature",
        },
    )


def build_claim_closure_matrix(scenario: Scenario, walls: list[WallResult]) -> PacketCommitment | None:
    if not scenario.claim_evidence:
        return None
    matrix_wall = next(wall for wall in walls if wall.wall_id == "ClaimClosureEvidenceMatrix")
    return packet(
        "claim_closure_evidence_matrix",
        "marketplace.claim_closure_evidence_matrix.v0.1",
        {
            "trade_id": scenario.scenario_id,
            "policy_id": "pokemon.default.policy.v0.1",
            "claim_types": sorted(scenario.claim_evidence.keys()),
            "matrix_rows": {
                claim_type: {
                    "required_seller_evidence": sorted(CLAIM_MATRIX[claim_type]["seller"]),
                    "required_buyer_evidence": sorted(CLAIM_MATRIX[claim_type]["buyer"]),
                    "required_route_evidence": sorted(CLAIM_MATRIX[claim_type]["route"]),
                    "seller_evidence_present": sorted(evidence.get("seller", set())),
                    "buyer_evidence_present": sorted(evidence.get("buyer", set())),
                    "route_evidence_present": sorted(evidence.get("route", set())),
                    "closure": CLAIM_MATRIX[claim_type]["closure"],
                }
                for claim_type, evidence in sorted(scenario.claim_evidence.items())
            },
            "wall_outcome": matrix_wall.outcome,
            "missing": matrix_wall.missing,
        },
    )


def build_contact_receipts(
    scenario: Scenario,
    packets: dict[str, PacketCommitment],
) -> dict[str, PacketCommitment]:
    receipts: dict[str, PacketCommitment] = {}
    if "card_reference" in packets:
        receipts["catalog_contact_receipt"] = packet(
            "catalog_contact_receipt",
            "marketplace.contact_receipt.v0.1",
            {
                "trade_id": scenario.scenario_id,
                "subject": {
                    "type": "catalog_candidate",
                    "hash": packets["card_reference"].hash,
                },
                "contact": {
                    "kind": "external_catalog_lookup",
                    "source": scenario.card_reference.get("source", "fixture:catalog"),
                    "observed_at": "fixture:observed_at",
                },
                "issuer": {
                    "actor": "fixture:buyer_agent",
                    "role": "buyer_agent",
                    "signature": "fixture:buyer_agent_signature",
                },
                "use": {
                    "allowed_gates": ["offer_evaluation", "route_commitment"],
                    "spendability_required": True,
                    "expires_at": "fixture:catalog_contact_expiry",
                },
                "claiming": ["catalog candidate was looked up"],
                "not_claiming": ["seller possession", "authenticity", "condition", "price_truth"],
            },
        )
    if scenario.seller_evidence:
        receipts["seller_evidence_contact_receipt"] = packet(
            "seller_evidence_contact_receipt",
            "marketplace.contact_receipt.v0.1",
            {
                "trade_id": scenario.scenario_id,
                "subject": {
                    "type": "seller_evidence_set",
                    "hash": canonical_hash(
                        {
                            "schema": "marketplace.seller_evidence_set.v0.1",
                            "trade_id": scenario.scenario_id,
                            "evidence": sorted(scenario.seller_evidence),
                        }
                    ),
                },
                "contact": {
                    "kind": "seller_supplied_media",
                    "source": "fixture:seller_upload",
                    "observed_at": "fixture:observed_at",
                },
                "issuer": {
                    "actor": "fixture:seller_agent",
                    "role": "seller_agent",
                    "signature": "fixture:seller_agent_signature",
                },
                "use": {
                    "allowed_gates": ["offer_evaluation", "route_commitment", "claim_support"],
                    "spendability_required": True,
                    "expires_at": "fixture:seller_evidence_expiry",
                },
                "claiming": ["seller evidence bytes were supplied"],
                "not_claiming": ["authenticity", "condition_truth", "delivery_success"],
            },
        )
    if "proof_vector_scope" in packets:
        receipts["seller_proof_contact_receipt"] = packet(
            "seller_proof_contact_receipt",
            "marketplace.contact_receipt.v0.1",
            {
                "trade_id": scenario.scenario_id,
                "subject": {
                    "type": "seller_proof_vector",
                    "hash": packets["proof_vector_scope"].hash,
                },
                "contact": {
                    "kind": "seller_reputation_source",
                    "source": "fixture:shop_and_marketplace_accounts",
                    "observed_at": "fixture:observed_at",
                },
                "issuer": {
                    "actor": "fixture:seller_agent",
                    "role": "seller_agent",
                    "signature": "fixture:seller_agent_signature",
                },
                "use": {
                    "allowed_gates": ["offer_evaluation", "route_commitment"],
                    "spendability_required": True,
                    "expires_at": "fixture:proof_contact_expiry",
                },
                "claiming": sorted(scenario.proof_positive_claims),
                "not_claiming": sorted(scenario.proof_not_claiming),
            },
        )
    if "route_insurance_risk_owner" in packets:
        receipts["route_contact_receipt"] = packet(
            "route_contact_receipt",
            "marketplace.contact_receipt.v0.1",
            {
                "trade_id": scenario.scenario_id,
                "subject": {
                    "type": "route_terms",
                    "hash": packets["route_insurance_risk_owner"].hash,
                },
                "contact": {
                    "kind": "route_terms_quote",
                    "source": scenario.route.get("carrier_or_handoff_method", "fixture:route"),
                    "observed_at": "fixture:observed_at",
                },
                "issuer": {
                    "actor": "fixture:seller_agent",
                    "role": "seller_agent",
                    "signature": "fixture:seller_agent_signature",
                },
                "use": {
                    "allowed_gates": ["route_commitment", "claim_support"],
                    "spendability_required": True,
                    "expires_at": "fixture:route_contact_expiry",
                },
                "claiming": ["route terms were proposed"],
                "not_claiming": ["carrier_acceptance", "delivery_success", "package_contents"],
            },
        )
    return receipts


def packet_ref_hash(scenario: Scenario, packet_id: str) -> str:
    if packet_id == "item_fingerprint_hash":
        return stub_packet(scenario, packet_id, "marketplace.item_fingerprint.stub.v0.1").hash
    if packet_id == "inventory_lock_hash":
        return stub_packet(scenario, packet_id, "marketplace.inventory_lock.stub.v0.1").hash
    if packet_id == "arbiter_policy_hash":
        return stub_packet(scenario, packet_id, "marketplace.arbiter_policy.stub.v0.1").hash
    if packet_id == "evidence_profile_id":
        return canonical_hash(
            {
                "schema": "marketplace.evidence_profile_ref.v0.1",
                "trade_id": scenario.scenario_id,
                "profile_id": "pokemon.raw.500_2000.v0.1",
            }
        )
    return canonical_hash(
        {
            "schema": "marketplace.packet_ref.stub.v0.1",
            "trade_id": scenario.scenario_id,
            "packet_id": packet_id,
        }
    )


def build_wall_packets(scenario: Scenario, walls: list[WallResult] | None = None) -> dict[str, PacketCommitment]:
    walls = walls or evaluate_walls(scenario)
    packets: dict[str, PacketCommitment] = {}

    packets["pokemon_acceptance_profile"] = build_pokemon_acceptance_profile(scenario, walls)

    for packet_id, schema in {
        "item_fingerprint_hash": "marketplace.item_fingerprint.stub.v0.1",
        "inventory_lock_hash": "marketplace.inventory_lock.stub.v0.1",
        "arbiter_policy_hash": "marketplace.arbiter_policy.stub.v0.1",
    }.items():
        if packet_id in scenario.hard_packets:
            packets[packet_id] = stub_packet(scenario, packet_id, schema)

    for candidate in [
        build_card_reference(scenario, walls),
        build_buyer_risk_acceptance(scenario),
        build_bond_scope(scenario),
        build_proof_vector_scope(scenario),
        build_route_insurance_risk_owner(scenario),
        build_external_availability_covenant(scenario),
        build_claim_closure_matrix(scenario, walls),
    ]:
        if candidate is not None:
            packets[candidate.packet_id] = candidate

    if "evidence_profile_id" in scenario.hard_packets:
        packets["evidence_profile_id"] = packet(
            "evidence_profile_id",
            "marketplace.evidence_profile_ref.v0.1",
            {
                "trade_id": scenario.scenario_id,
                "profile_id": "pokemon.raw.500_2000.v0.1",
            },
        )

    packets.update(build_contact_receipts(scenario, packets))
    return packets


def bundle_hash_from_packets(packets: dict[str, PacketCommitment]) -> str:
    return canonical_hash(
        {
            "schema": "marketplace.wall_packet_bundle.v0.1",
            "packets": {packet_id: record.hash for packet_id, record in sorted(packets.items())},
        }
    )


def evm_bytes32_ref(*, schema: str, value: str) -> str:
    return "0x" + hashlib.sha256(canonical_bytes({"schema": schema, "value": value})).hexdigest()


def build_assembly_history(
    scenario: Scenario,
    packets: dict[str, PacketCommitment],
    wall_bundle_hash: str,
) -> PacketCommitment | None:
    if "assembly_history_hash" not in scenario.hard_packets:
        return None

    predecessor_refs = {
        packet_id: packets[packet_id].hash
        for packet_id in sorted(ROUTE_ASSEMBLY_PACKET_KEYS)
        if packet_id in packets
    }
    contact_refs = {
        packet_id: packets[packet_id].hash
        for packet_id in sorted(packets)
        if packet_id.endswith("_contact_receipt")
    }
    return packet(
        "assembly_history",
        "marketplace.assembly_provenance.v0.1",
        {
            "trade_id": scenario.scenario_id,
            "gate": {
                "gate_type": "route_commitment",
                "gate_id": f"{scenario.scenario_id}:route_commitment",
                "leg": "forward",
            },
            "foundation": {
                "subject_hash": packet_ref_hash(scenario, "item_fingerprint_hash"),
                "inventory_lock_hash": packet_ref_hash(scenario, "inventory_lock_hash"),
                "route_terms_hash": packets["route_insurance_risk_owner"].hash
                if "route_insurance_risk_owner" in packets
                else "",
                "wall_bundle_hash": wall_bundle_hash,
            },
            "predecessor_packet_refs": predecessor_refs,
            "contact_receipt_refs": contact_refs,
            "causal_edges": [
                {
                    "from": "card_reference",
                    "to": "item_fingerprint_hash",
                    "relation": "catalog_names_candidate_not_physical_truth",
                },
                {
                    "from": "seller_evidence_contact_receipt",
                    "to": "item_fingerprint_hash",
                    "relation": "media_contact_supports_specific_item_claim",
                },
                {
                    "from": "item_fingerprint_hash",
                    "to": "inventory_lock_hash",
                    "relation": "specific_item_must_be_locked_before_route",
                },
                {
                    "from": "inventory_lock_hash",
                    "to": "route_insurance_risk_owner",
                    "relation": "route_terms_apply_to_locked_item",
                },
                {
                    "from": "bond_scope",
                    "to": "route_insurance_risk_owner",
                    "relation": "bond_names_failures_not_general_trust",
                },
                {
                    "from": "arbiter_policy_hash",
                    "to": "bond_scope",
                    "relation": "remedies_are_policy_bound",
                },
            ],
            "allowed_gates": ["route_commitment"],
            "status": "active",
            "not_claiming": [
                "physical_truth",
                "authenticity",
                "condition_truth",
                "price_truth",
                "delivery_success",
            ],
        },
    )


def build_route_spendability(
    scenario: Scenario,
    wall_bundle_hash: str,
    assembly_history_hash: str,
) -> PacketCommitment | None:
    if "route_spendability_hash" not in scenario.hard_packets:
        return None
    return packet(
        "route_spendability",
        "marketplace.evidence_spendability.v0.1",
        {
            "trade_id": scenario.scenario_id,
            "gate": {
                "gate_type": "route_commitment",
                "gate_id": f"{scenario.scenario_id}:route_commitment",
                "leg": "forward",
                "consumption": "single_use",
            },
            "wall_bundle_hash": wall_bundle_hash,
            "assembly_history_hash": assembly_history_hash,
            "spendable_claims": [
                "route_readiness",
                "wall_bundle_satisfied",
                "assembly_provenance_satisfied",
            ],
            "not_claiming": ["physical_truth", "authenticity", "condition_truth"],
            "decision_authority": "buyer_agent_or_protocol",
            "status": "active",
        },
    )


def packet_commitments(scenario: Scenario, walls: list[WallResult] | None = None) -> dict[str, Any]:
    walls = walls or evaluate_walls(scenario)
    packets = build_wall_packets(scenario, walls)
    wall_bundle_hash = bundle_hash_from_packets(packets)
    wall_bundle_evm_ref = evm_bytes32_ref(
        schema="marketplace.wall_bundle_evm_ref.v0.1",
        value=wall_bundle_hash,
    )
    assembly_history = build_assembly_history(scenario, packets, wall_bundle_hash)
    assembly_history_hash = assembly_history.hash if assembly_history is not None else ""
    assembly_history_evm_ref = (
        evm_bytes32_ref(
            schema="marketplace.assembly_history_evm_ref.v0.1",
            value=assembly_history_hash,
        )
        if assembly_history_hash
        else ""
    )
    if assembly_history is not None:
        packets[assembly_history.packet_id] = assembly_history
    route_spendability = build_route_spendability(scenario, wall_bundle_hash, assembly_history_hash)
    if route_spendability is not None:
        packets[route_spendability.packet_id] = route_spendability
    route_assembly_witness_hash = (
        evm_bytes32_ref(
            schema="marketplace.route_assembly_witness_ref.v0.1",
            value=canonical_hash(
                {
                    "wall_bundle_evm_ref": wall_bundle_evm_ref,
                    "assembly_history_evm_ref": assembly_history_evm_ref,
                    "route_spendability_hash": route_spendability.hash,
                }
            ),
        )
        if route_spendability is not None and assembly_history_evm_ref
        else ""
    )

    required_packet_refs = {
        WALL_PACKET_KEYS[packet_key]
        for packet_key in WALL_PACKET_KEYS
        if packet_key in scenario.hard_packets
    }
    required_packet_refs.update(
        packet_key
        for packet_key in ["item_fingerprint_hash", "inventory_lock_hash", "arbiter_policy_hash", "evidence_profile_id"]
        if packet_key in scenario.hard_packets
    )
    if scenario.external_availability_covenant:
        required_packet_refs.add("external_availability_covenant")
    if scenario.buyer_risk_acceptance:
        required_packet_refs.add("buyer_risk_acceptance")
    if scenario.claim_evidence:
        required_packet_refs.add("claim_closure_evidence_matrix")
    if "route_spendability_hash" in scenario.hard_packets:
        required_packet_refs.add("assembly_history")
        required_packet_refs.add("route_spendability")
    if "assembly_history_hash" in scenario.hard_packets:
        required_packet_refs.add("assembly_history")

    missing_packet_refs = sorted(required_packet_refs - packets.keys())
    return {
        "wall_bundle_hash": wall_bundle_hash,
        "wall_bundle_evm_ref": wall_bundle_evm_ref,
        "assembly_history_evm_ref": assembly_history_evm_ref,
        "route_assembly_witness_hash": route_assembly_witness_hash,
        "route_wall_bundle_evm_hash": route_assembly_witness_hash,
        "assembly_history_hash": packets.get("assembly_history").hash if "assembly_history" in packets else "",
        "packet_refs": {packet_id: record.hash for packet_id, record in sorted(packets.items())},
        "route_spendability_hash": packets.get("route_spendability").hash if "route_spendability" in packets else "",
        "placement_integrity": {
            "required_packet_refs": sorted(required_packet_refs),
            "missing_packet_refs": missing_packet_refs,
            "complete": not missing_packet_refs,
        },
        "packets": {packet_id: asdict(record) for packet_id, record in sorted(packets.items())},
    }
