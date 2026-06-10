#!/usr/bin/env python3
"""Run a local Anvil end-to-end probe for the Marketplace protocol.

The runner creates off-chain protocol packets, hashes their canonical JSON with
Ethereum keccak, anchors those hashes in MarketplaceEscrow, and writes a report.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import signal
import subprocess
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
CHAIN = ROOT / "chain"
RUNS = ROOT / "runs"

BUYER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
SELLER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
ARBITER = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
VERIFIER = "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
REPLACEMENT_ARBITER = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"

BUYER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
SELLER_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
ARBITER_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
VERIFIER_KEY = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
REPLACEMENT_ARBITER_KEY = "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"

SIGNERS = {
    "buyer": {"address": BUYER, "key": BUYER_KEY, "actor_id": "did:market:buyer:anvil-0"},
    "seller": {"address": SELLER, "key": SELLER_KEY, "actor_id": "did:market:seller:anvil-1"},
    "arbiter": {"address": ARBITER, "key": ARBITER_KEY, "actor_id": "did:market:arbiter:anvil-2"},
    "verifier": {"address": VERIFIER, "key": VERIFIER_KEY, "actor_id": "did:market:verifier:anvil-3"},
    "replacement_arbiter": {
        "address": REPLACEMENT_ARBITER,
        "key": REPLACEMENT_ARBITER_KEY,
        "actor_id": "did:market:arbiter:anvil-4",
    },
}

ROLE = {
    "buyer": "1",
    "seller": "2",
    "agent": "3",
    "verifier": "4",
    "arbiter": "5",
    "attester": "6",
}

STATE_NAMES = {
    0: "None",
    1: "EscrowFunded",
    2: "EvidencePending",
    3: "RouteLocked",
    4: "RouteInProgress",
    5: "InspectionOpen",
    6: "ClaimOrDisputePending",
    7: "Settled",
    8: "Cancelled",
}

EVIDENCE_KIND = {
    "item": 0,
    "trust": 1,
    "route": 2,
    "settlement": 3,
    "claim": 4,
    "private_predicate": 5,
}

ALLOWED_VERIFIER_SCOPES = {
    "packet_completeness",
    "schema_validity",
    "signature_provenance",
    "seller_custody",
    "raw_card_identity",
    "graded_cert_correlation",
    "slab_custody",
    "raw_condition_floor",
    "authenticity_screen",
    "route_readiness",
    "insurance_claim_readiness",
    "marketplace_reputation_linkage",
    "shop_identity_linkage",
    "private_predicate_threshold",
    "fingerprint_challenge_resolution",
}

ALLOWED_VERIFIER_METHODS = {
    "tcg.raw.photo_packet_review.v0.1",
    "tcg.slab.cert_custody_photo.v0.1",
    "tcg.fingerprint.challenge_review.v0.1",
    "route.claim_packet_review.v0.1",
    "private_predicate.registry_check.v0.1",
}

ALLOWED_VERIFICATION_MODELS = {
    "remote_self_reported",
    "third_party_witnessed",
    "in_person_intake",
    "tee_assisted",
    "carrier_or_shop_integrated",
}

BANNED_VERIFIER_DISPLAY_PHRASES = {
    "verified card",
    "verified item",
    "verified seller",
    "authentic",
    "authenticity confirmed",
    "safe trade",
    "guaranteed",
    "no risk",
    "confirmed genuine",
}


@dataclass
class PacketRecord:
    packet_id: str
    path: str
    payload_hash: str
    schema: str
    signer: str
    signature: str
    signature_valid: bool = False


@dataclass
class TxRecord:
    label: str
    tx_hash: str


@dataclass
class ScenarioResult:
    name: str
    trade_id: int
    final_state: str
    packets: list[PacketRecord] = field(default_factory=list)
    transactions: list[TxRecord] = field(default_factory=list)
    observations: list[str] = field(default_factory=list)


@dataclass
class RegistrySetup:
    registry: str
    predicate_verifier: str
    packets: list[PacketRecord] = field(default_factory=list)
    transactions: list[TxRecord] = field(default_factory=list)
    observations: list[str] = field(default_factory=list)


@dataclass
class SpendabilityRecord:
    packet: PacketRecord
    payload: dict[str, Any]


@dataclass
class EvidenceManifestRecord:
    packet: PacketRecord
    payload: dict[str, Any]


@dataclass
class SpendabilityGateContext:
    gate_type: str
    gate_id: str
    leg: str
    state_name: str
    state_hash: str
    wall_bundle_hash: str | None = None
    assembly_history_hash: str | None = None
    event_hashes: set[str] = field(default_factory=set)
    requirements: set[str] = field(default_factory=set)
    waivers: set[str] = field(default_factory=set)


def env_with_foundry() -> dict[str, str]:
    env = os.environ.copy()
    foundry_bin = str(Path.home() / ".foundry" / "bin")
    env["PATH"] = f"{foundry_bin}:{env.get('PATH', '')}"
    return env


ENV = env_with_foundry()


def run(cmd: list[str], cwd: Path = CHAIN, check: bool = True) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(
        cmd,
        cwd=cwd,
        env=ENV,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if check and completed.returncode != 0:
        command = " ".join(cmd)
        raise RuntimeError(f"command failed ({completed.returncode}): {command}\n{completed.stdout}")
    return completed


def eth(amount: str) -> str:
    return str(int(Decimal(amount) * Decimal(10**18)))


def canonical_payload(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def keccak_payload(payload: dict[str, Any]) -> str:
    return run(["cast", "keccak", canonical_payload(payload)]).stdout.strip()


def keccak_text(value: str) -> str:
    return run(["cast", "keccak", value]).stdout.strip()


def sign_hash(payload_hash: str, signer_key: str) -> str:
    return run(["cast", "wallet", "sign", payload_hash, "--private-key", signer_key]).stdout.strip()


def scope_set_hash(scopes: list[str]) -> str:
    return keccak_payload(
        {
            "schema": "marketplace.scope_set.v0.1",
            "scopes": sorted(scopes),
        }
    )


def method_id_hash(method_id: str) -> str:
    return keccak_payload(
        {
            "schema": "marketplace.method_id.v0.1",
            "method_id": method_id,
        }
    )


MANIFEST_SCHEMA = "marketplace.evidence_manifest.v0.3"
ASSET_DESCRIPTOR_SCHEMA = "marketplace.asset_descriptor.v0.3"
SUBJECT_HASH_SCHEMA = "marketplace.subject_hash.v0.3"
MANIFEST_CANONICALIZATION = "canonical-json-payload-v1"
MANIFEST_HASH_ALGORITHM = "keccak256(utf8(canonical-json-payload-v1))"

ALLOWED_MANIFEST_TIERS = {"sparse", "standard", "challenge_bound", "verified", "claim_grade"}
ALLOWED_TIER_BASIS = {
    "manifest_integrity_only",
    "legacy_declared",
    "derived_from_spendability",
}
ALLOWED_MANIFEST_SUBJECT_TYPES = {
    "item_fingerprint",
    "inventory_lock",
    "route",
    "delivery",
    "receipt",
    "claim",
    "fingerprint_challenge",
    "verifier_attestation",
    "trust_source",
    "other",
}
ALLOWED_ASSET_ROLES = {
    "front_photo",
    "back_photo",
    "edge_photo",
    "corner_photo",
    "surface_video",
    "slab_photo",
    "cert_snapshot",
    "tracking_snapshot",
    "shipping_label",
    "dropoff_receipt",
    "delivery_photo",
    "insurance_document",
    "marketplace_profile_snapshot",
    "shop_proof",
    "claim_document",
    "retrieval_snapshot",
    "memo",
    "other",
}
ALLOWED_ASSET_VISIBILITY = {
    "public",
    "buyer_only",
    "buyer_arbiter",
    "arbiter_only",
    "encrypted_commitment",
    "private_unreleased",
}
MANIFEST_ACTOR_ROLES = {
    SIGNERS["seller"]["actor_id"]: {"seller"},
    SIGNERS["buyer"]["actor_id"]: {"buyer"},
    SIGNERS["verifier"]["actor_id"]: {"verifier"},
    SIGNERS["arbiter"]["actor_id"]: {"arbiter"},
    "did:market:agent:buyer-alpha": {"agent", "buyer_agent"},
}


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def keccak_hex_bytes(data: bytes) -> str:
    return run(["cast", "keccak", "0x" + data.hex()]).stdout.strip().lower()


def is_hash_hex(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    if value.startswith("0x") and len(value) == 66:
        return all(ch in "0123456789abcdef" for ch in value[2:])
    return len(value) == 64 and all(ch in "0123456789abcdef" for ch in value)


def evidence_subject_hash(subject_type: str, trade_id: int, anchor_hash: str) -> str:
    return keccak_payload(
        {
            "schema": SUBJECT_HASH_SCHEMA,
            "subject_type": subject_type,
            "trade_id": trade_id,
            "anchor_hash": anchor_hash,
        }
    )


def asset_descriptor_hash(descriptor: dict[str, Any]) -> str:
    return keccak_payload(
        {
            "schema": "marketplace.asset_descriptor_hash.v0.3",
            "descriptor": descriptor,
        }
    )


def evidence_asset_root_hash(descriptors: list[dict[str, Any]]) -> str:
    descriptor_hashes = [
        asset_descriptor_hash(descriptor)
        for descriptor in sorted(descriptors, key=lambda item: str(item["asset_id"]))
    ]
    return keccak_payload(
        {
            "schema": "marketplace.asset_root.v0.3",
            "descriptor_hashes": descriptor_hashes,
        }
    )


def write_fixture_asset(asset_dir: Path, filename: str, data: bytes) -> Path:
    asset_dir.mkdir(parents=True, exist_ok=True)
    path = asset_dir / filename
    path.write_bytes(data)
    return path


def evidence_asset_descriptor(
    packet_dir: Path,
    packet_id: str,
    asset_id: str,
    role: str,
    media_type: str,
    data: bytes,
    filename: str,
    captured_at: str,
    visibility: str = "buyer_arbiter",
    source_origin: str = "seller",
    capture_mode: str = "generated_fixture",
    weak_supplemental: bool = False,
) -> dict[str, Any]:
    asset_path = write_fixture_asset(packet_dir.parent / "assets" / packet_id, filename, data)
    return {
        "schema": ASSET_DESCRIPTOR_SCHEMA,
        "asset_id": asset_id,
        "role": role,
        "media_type": media_type,
        "byte_length": len(data),
        "sha256": sha256_hex(data),
        "keccak256": keccak_hex_bytes(data),
        "storage_refs": [
            {
                "kind": "file",
                "uri": str(asset_path.relative_to(ROOT)),
                "mutable": False,
                "primary": True,
            }
        ],
        "visibility": visibility,
        "created_at": captured_at,
        "captured_at": captured_at,
        "source": {"origin": source_origin, "capture_mode": capture_mode},
        "weak_supplemental": weak_supplemental,
    }


def validate_evidence_manifest_payload(payload: dict[str, Any]) -> None:
    if payload.get("schema") != MANIFEST_SCHEMA:
        raise ValueError("manifest has wrong schema")
    if payload.get("canonicalization") != MANIFEST_CANONICALIZATION:
        raise ValueError("manifest has wrong canonicalization")
    if payload.get("hash_algorithm") != MANIFEST_HASH_ALGORITHM:
        raise ValueError("manifest has wrong hash algorithm")
    if payload.get("manifest_hash_source") != "packet_envelope_payload_hash":
        raise ValueError("manifest must use the local EVM packet envelope hash source")
    if payload.get("evidence_tier") not in ALLOWED_MANIFEST_TIERS:
        raise ValueError(f"unknown evidence tier: {payload.get('evidence_tier')}")
    if payload.get("tier_basis") not in ALLOWED_TIER_BASIS:
        raise ValueError(f"unknown tier basis: {payload.get('tier_basis')}")

    issuer = str(payload.get("issuer"))
    issuer_role = str(payload.get("issuer_role"))
    if issuer_role not in MANIFEST_ACTOR_ROLES.get(issuer, set()):
        raise ValueError(f"manifest issuer {issuer} lacks role {issuer_role}")

    subject = payload.get("subject")
    if not isinstance(subject, dict):
        raise ValueError("manifest subject is required")
    subject_type = str(subject.get("subject_type"))
    if subject_type not in ALLOWED_MANIFEST_SUBJECT_TYPES:
        raise ValueError(f"unknown subject type: {subject_type}")
    if int(subject.get("trade_id")) != int(payload.get("trade_id")):
        raise ValueError("manifest subject trade_id mismatch")
    anchor_hash = str(subject.get("anchor_hash"))
    if not is_hash_hex(anchor_hash):
        raise ValueError("manifest subject anchor_hash must be a hash")
    expected_subject_hash = evidence_subject_hash(subject_type, int(payload["trade_id"]), anchor_hash)
    if subject.get("subject_hash") != expected_subject_hash:
        raise ValueError("manifest subject_hash mismatch")

    descriptors = payload.get("asset_descriptors")
    if not isinstance(descriptors, list):
        raise ValueError("manifest asset_descriptors must be a list")
    descriptor_ids: set[str] = set()
    for descriptor in descriptors:
        if descriptor.get("schema") != ASSET_DESCRIPTOR_SCHEMA:
            raise ValueError("asset descriptor has wrong schema")
        asset_id = descriptor.get("asset_id")
        if not isinstance(asset_id, str) or not asset_id or asset_id in descriptor_ids:
            raise ValueError(f"invalid or duplicate asset_id: {asset_id}")
        descriptor_ids.add(asset_id)
        if descriptor.get("role") not in ALLOWED_ASSET_ROLES:
            raise ValueError(f"unknown asset role: {descriptor.get('role')}")
        if descriptor.get("visibility") not in ALLOWED_ASSET_VISIBILITY:
            raise ValueError(f"unknown visibility: {descriptor.get('visibility')}")
        if not isinstance(descriptor.get("byte_length"), int) or descriptor["byte_length"] <= 0:
            raise ValueError("asset byte_length must be positive")
        if not is_hash_hex(descriptor.get("sha256")) or not is_hash_hex(descriptor.get("keccak256")):
            raise ValueError("asset hashes are malformed")
        refs = descriptor.get("storage_refs")
        if not isinstance(refs, list) or not refs:
            raise ValueError("asset storage_refs required")
        primary_refs = [ref for ref in refs if ref.get("primary")]
        if not primary_refs:
            raise ValueError(f"asset {asset_id} has no primary storage ref")
        for ref in primary_refs:
            if ref.get("kind") != "file" or ref.get("mutable"):
                raise ValueError(f"unsupported primary storage ref for {asset_id}")
            data = (ROOT / str(ref.get("uri"))).read_bytes()
            if len(data) != descriptor["byte_length"]:
                raise ValueError(f"asset byte_length mismatch for {asset_id}")
            if sha256_hex(data) != descriptor["sha256"]:
                raise ValueError(f"asset sha256 mismatch for {asset_id}")
            if keccak_hex_bytes(data) != descriptor["keccak256"]:
                raise ValueError(f"asset keccak mismatch for {asset_id}")

    if payload.get("asset_root_hash") != evidence_asset_root_hash(descriptors):
        raise ValueError("manifest asset_root_hash mismatch")
    tier = payload["evidence_tier"]
    roles = {descriptor.get("role") for descriptor in descriptors if not descriptor.get("weak_supplemental")}
    if tier in {"standard", "challenge_bound", "verified", "claim_grade"}:
        if not {"front_photo", "back_photo"}.issubset(roles):
            raise ValueError(f"{tier} manifest requires front and back photo assets")
    if tier == "verified" and not payload.get("verifier_attestation_refs"):
        raise ValueError("verified manifest requires verifier attestation refs")
    if tier == "claim_grade":
        retention = payload.get("retention_policy")
        if not isinstance(retention, dict) or int(retention.get("minimum_retention_days", 0)) < 180:
            raise ValueError("claim_grade manifest requires 180 day retention")


def write_evidence_manifest_packet(
    packet_dir: Path,
    packet_id: str,
    trade_id: int,
    issuer_role: str,
    subject_type: str,
    subject_anchor_hash: str,
    evidence_tier: str,
    tier_basis: str,
    assets: list[dict[str, Any]],
    known_limits: list[str] | None = None,
    known_conflicts: list[str] | None = None,
    verifier_attestation_refs: list[str] | None = None,
    retention_policy: dict[str, Any] | None = None,
) -> EvidenceManifestRecord:
    signer = signer_for_role(issuer_role)
    issued_at = datetime.now(timezone.utc).isoformat()
    descriptors = [
        evidence_asset_descriptor(
            packet_dir,
            packet_id,
            str(asset["asset_id"]),
            str(asset["role"]),
            str(asset.get("media_type", "image/png")),
            asset["data"],
            str(asset["filename"]),
            issued_at,
            visibility=str(asset.get("visibility", "buyer_arbiter")),
            source_origin=str(asset.get("source_origin", issuer_role)),
            capture_mode=str(asset.get("capture_mode", "generated_fixture")),
            weak_supplemental=bool(asset.get("weak_supplemental", False)),
        )
        for asset in assets
    ]
    payload: dict[str, Any] = {
        "schema": MANIFEST_SCHEMA,
        "trade_id": trade_id,
        "manifest_id": packet_id,
        "issuer": signer["actor_id"],
        "issuer_role": issuer_role,
        "evidence_tier": evidence_tier,
        "tier_basis": tier_basis,
        "subject": {
            "subject_type": subject_type,
            "trade_id": trade_id,
            "anchor_hash": subject_anchor_hash,
            "subject_hash": evidence_subject_hash(subject_type, trade_id, subject_anchor_hash),
        },
        "asset_descriptors": descriptors,
        "asset_root_hash": evidence_asset_root_hash(descriptors),
        "issued_at": issued_at,
        "canonicalization": MANIFEST_CANONICALIZATION,
        "hash_algorithm": MANIFEST_HASH_ALGORITHM,
        "manifest_hash_source": "packet_envelope_payload_hash",
        "known_limits": known_limits or [],
        "known_conflicts": known_conflicts or [],
    }
    if verifier_attestation_refs is not None:
        payload["verifier_attestation_refs"] = verifier_attestation_refs
    if retention_policy is not None:
        payload["retention_policy"] = retention_policy
    validate_evidence_manifest_payload(payload)
    packet = write_packet(packet_dir, packet_id, payload, signer["key"], signer["address"])
    return EvidenceManifestRecord(packet=packet, payload=payload)


SPENDABILITY_ACTOR_ROLES = {
    "did:market:agent:buyer-alpha": {"buyer_agent", "agent"},
    "did:market:buyer:anvil-0": {"human", "buyer"},
    "did:market:seller:anvil-1": {"seller"},
    "did:market:verifier:anvil-3": {"verifier"},
    "did:market:arbiter:anvil-2": {"arbiter"},
    "did:market:protocol:local-evm": {"protocol"},
}

SPENDABILITY_GATE_POLICIES = {
    "route_commitment": {
        "leg": "forward",
        "consumption": "single_use",
        "allowed_authority": {"buyer_agent", "protocol"},
        "allowed_claims": {"identity_support", "custody_support", "packet_completeness"},
        "allowed_spend_limits": {"advisory", "blocks_or_unblocks_gate"},
    },
    "challenge_clearance": {
        "leg": "forward",
        "consumption": "single_use",
        "allowed_authority": {"buyer_agent", "verifier", "protocol"},
        "allowed_claims": {"identity_support", "custody_support", "packet_completeness"},
        "allowed_spend_limits": {"blocks_or_unblocks_gate"},
    },
    "delivery_confirmation": {
        "leg": "forward",
        "consumption": "single_use",
        "allowed_authority": {"seller", "arbiter", "protocol"},
        "allowed_claims": {"delivery_event", "route_support"},
        "allowed_spend_limits": {"opens_inspection"},
    },
    "claim_support": {
        "leg": "return",
        "consumption": "append_only_weight",
        "allowed_authority": {"buyer_agent", "arbiter", "protocol"},
        "allowed_claims": {"contradiction_support", "condition_support", "route_support", "insurance_support"},
        "allowed_spend_limits": {"advisory", "assembles_claim_packet"},
    },
    "bond_action": {
        "leg": "return",
        "consumption": "single_use",
        "allowed_authority": {"arbiter", "protocol"},
        "allowed_claims": {"route_support", "condition_support", "contradiction_support"},
        "allowed_spend_limits": {"moves_funds"},
    },
}

ALLOWED_SPENDABILITY_REQUIREMENTS = {
    "buyer_ack",
    "seller_ack",
    "human_waiver",
    "verifier_attestation",
    "arbiter_assignment",
    "arbiter_reveal",
    "registry_role",
    "delegation",
    "route_event",
    "delivery_event",
    "receipt_event",
    "claim_opened",
    "insurance_policy",
    "private_key_release",
}


def spendability_state_hash(trade_id: int, state_name: str, marker: str = "") -> str:
    return keccak_payload(
        {
            "schema": "marketplace.spendability_state_anchor.v0.1",
            "trade_id": trade_id,
            "state_name": state_name,
            "marker": marker,
        }
    )


def route_wall_bundle_root(trade_id: int, route_hash: str) -> str:
    return keccak_payload(
        {
            "schema": "marketplace.route_wall_bundle_root.v0.1",
            "trade_id": trade_id,
            "route_hash": route_hash,
        }
    )


def route_assembly_history_hash(trade_id: int, route_hash: str, wall_bundle_hash: str) -> str:
    return keccak_payload(
        {
            "schema": "marketplace.route_assembly_history_ref.v0.1",
            "trade_id": trade_id,
            "route_hash": route_hash,
            "wall_bundle_hash": wall_bundle_hash,
        }
    )


def route_assembly_witness_hash(
    rpc_url: str,
    contract: str,
    trade_id: int,
    route_hash: str,
    spendability_hash: str,
    wall_bundle_hash: str,
    assembly_history_hash: str,
) -> str:
    return run(
        [
            "cast",
            "call",
            contract,
            "routeAssemblyWitnessHash(uint256,bytes32,bytes32,bytes32,bytes32)(bytes32)",
            str(trade_id),
            route_hash,
            spendability_hash,
            wall_bundle_hash,
            assembly_history_hash,
            "--rpc-url",
            rpc_url,
        ]
    ).stdout.strip()


def delivery_witness_hash(
    rpc_url: str,
    contract: str,
    trade_id: int,
    delivery_hash: str,
    spendability_hash: str,
) -> str:
    return run(
        [
            "cast",
            "call",
            contract,
            "deliveryWitnessHash(uint256,bytes32,bytes32)(bytes32)",
            str(trade_id),
            delivery_hash,
            spendability_hash,
            "--rpc-url",
            rpc_url,
        ]
    ).stdout.strip()


def signer_for_role(role: str) -> dict[str, str]:
    if role == "buyer_agent":
        return {"key": BUYER_KEY, "address": BUYER, "actor_id": "did:market:agent:buyer-alpha"}
    if role == "arbiter":
        return {"key": ARBITER_KEY, "address": ARBITER, "actor_id": SIGNERS["arbiter"]["actor_id"]}
    if role == "protocol":
        return {"key": BUYER_KEY, "address": BUYER, "actor_id": "did:market:protocol:local-evm"}
    return SIGNERS[role]


def write_spendability_packet(
    packet_dir: Path,
    packet_id: str,
    trade_id: int,
    manifest_hash: str,
    subject_hash: str,
    gate_type: str,
    gate_id: str,
    claim_type: str,
    spend_limit: str,
    signer_role: str = "buyer_agent",
    authority_role: str = "buyer_agent",
    after_state: str = "EvidencePending",
    after_event_hash: str | None = None,
    requires: list[str] | None = None,
    waiver_policy: str = "none",
    not_claiming: list[str] | None = None,
    support_level: str = "standard",
    wall_bundle_hash: str | None = None,
    assembly_history_hash: str | None = None,
) -> SpendabilityRecord:
    policy = SPENDABILITY_GATE_POLICIES[gate_type]
    signer = signer_for_role(signer_role)
    window: dict[str, Any] = {
        "after_state": {
            "state_name": after_state,
            "state_hash": spendability_state_hash(trade_id, after_state),
        },
        "waiver_policy": waiver_policy,
    }
    if after_event_hash:
        window["after_event_hash"] = after_event_hash
    payload = {
        "schema": "marketplace.evidence_spendability.v0.1",
        "trade_id": trade_id,
        "spendability_id": packet_id,
        "manifest_hash": manifest_hash,
        "manifest_subject_hash": subject_hash,
        "manifest_kind": MANIFEST_SCHEMA,
        "manifest_hash_source": "packet_envelope_payload_hash",
        "wall_bundle_hash": wall_bundle_hash,
        "assembly_history_hash": assembly_history_hash,
        "issued_by": signer["actor_id"],
        "issued_role": signer_role,
        "gate": {
            "gate_type": gate_type,
            "gate_id": gate_id,
            "leg": policy["leg"],
            "consumption": policy["consumption"],
        },
        "spendable_claims": [
            {
                "claim_type": claim_type,
                "support_level": support_level,
                "spend_limit": spend_limit,
                "not_claiming": not_claiming or ["authenticity", "condition_floor"],
                "basis": ["actor_signature", "packet_hash", "local_evm_gate_policy"],
            }
        ],
        "window": window,
        "requires": requires or ["buyer_ack"],
        "decision_authority": {
            "actor_role": authority_role,
            "actor_id": signer["actor_id"],
            "authority_source": "actor_registry_or_delegation",
            "authority_hash": keccak_text(f"authority:{signer['actor_id']}:{authority_role}"),
        },
        "status": "active",
        "issued_at": datetime.now(timezone.utc).isoformat(),
        "canonicalization": "canonical-json-payload-v1",
        "hash_algorithm": "keccak256(utf8(canonical-json-payload-v1))",
        "spendability_hash_source": "packet_envelope_payload_hash",
    }
    packet = write_packet(packet_dir, packet_id, payload, signer["key"], signer["address"])
    return SpendabilityRecord(packet=packet, payload=payload)


def validate_spendability_gate(
    spendability: SpendabilityRecord,
    context: SpendabilityGateContext,
    consumed: set[str],
) -> str:
    packet = spendability.packet
    payload = spendability.payload
    if not packet.signature_valid:
        raise ValueError(f"spendability packet signature is not valid: {packet.packet_id}")
    if payload.get("schema") != "marketplace.evidence_spendability.v0.1":
        raise ValueError("SPENDABILITY_SCHEMA: wrong schema")
    if payload.get("status") != "active":
        raise ValueError("SPENDABILITY_STATUS: spendability is not active")

    gate = payload.get("gate", {})
    gate_type = gate.get("gate_type")
    policy = SPENDABILITY_GATE_POLICIES.get(str(gate_type))
    if not policy:
        raise ValueError(f"GATE_TYPE: unknown gate {gate_type}")
    if gate_type != context.gate_type or gate.get("gate_id") != context.gate_id:
        raise ValueError(f"GATE_TYPE: {gate_type}:{gate.get('gate_id')} cannot spend at {context.gate_type}:{context.gate_id}")
    if gate.get("leg") != context.leg or gate.get("leg") != policy["leg"]:
        raise ValueError("GATE_LEG: leg mismatch")
    if gate.get("consumption") != policy["consumption"]:
        raise ValueError("SPENDABILITY_CONSUMED: consumption mode violates policy")
    if gate.get("consumption") == "single_use" and packet.payload_hash in consumed:
        raise ValueError("SPENDABILITY_CONSUMED: single-use spendability already consumed")
    if context.gate_type == "route_commitment":
        if not context.wall_bundle_hash:
            raise ValueError("ASSEMBLY_WALL_BUNDLE: route context missing wall bundle")
        if not context.assembly_history_hash:
            raise ValueError("ASSEMBLY_HISTORY: route context missing assembly history")
        if payload.get("wall_bundle_hash") != context.wall_bundle_hash:
            raise ValueError("ASSEMBLY_WALL_BUNDLE: wall bundle mismatch")
        if payload.get("assembly_history_hash") != context.assembly_history_hash:
            raise ValueError("ASSEMBLY_HISTORY: assembly history mismatch")

    window = payload.get("window", {})
    after_state = window.get("after_state", {})
    if after_state.get("state_name") != context.state_name or after_state.get("state_hash") != context.state_hash:
        raise ValueError("GATE_WINDOW: state anchor mismatch")
    after_event_hash = window.get("after_event_hash")
    if after_event_hash and after_event_hash not in context.event_hashes:
        raise ValueError("GATE_WINDOW: required event hash absent")
    if "human_waiver" in set(payload.get("requires", [])) and window.get("waiver_policy") == "none":
        raise ValueError("GATE_WINDOW: waiver required but not named")

    requirements = set(payload.get("requires", []))
    unknown_requirements = requirements - ALLOWED_SPENDABILITY_REQUIREMENTS
    if unknown_requirements:
        raise ValueError(f"GATE_REQUIREMENT: unknown requirements {sorted(unknown_requirements)}")
    missing_requirements = requirements - context.requirements - context.waivers
    if missing_requirements:
        raise ValueError(f"GATE_REQUIREMENT: missing requirements {sorted(missing_requirements)}")

    authority = payload.get("decision_authority", {})
    actor_role = authority.get("actor_role")
    actor_id = str(authority.get("actor_id"))
    if actor_role not in policy["allowed_authority"]:
        raise ValueError(f"GATE_AUTHORITY: {actor_role} cannot decide {gate_type}")
    if actor_role not in SPENDABILITY_ACTOR_ROLES.get(actor_id, set()):
        raise ValueError(f"GATE_AUTHORITY: {actor_id} lacks {actor_role}")

    for claim in payload.get("spendable_claims", []):
        claim_type = claim.get("claim_type")
        spend_limit = claim.get("spend_limit")
        if claim_type not in policy["allowed_claims"]:
            raise ValueError(f"CLAIM_SCOPE: {claim_type} cannot spend at {gate_type}")
        if spend_limit not in policy["allowed_spend_limits"]:
            raise ValueError(f"CLAIM_SCOPE: {spend_limit} cannot spend at {gate_type}")

    if gate.get("consumption") == "single_use":
        consumed.add(packet.payload_hash)
    return f"{packet.packet_id} spendability accepted at {context.gate_type}."


def inventory_lock_binding_hash(
    rpc_url: str,
    contract: str,
    trade_id: int,
    inventory_lock_hash: str,
    item_fingerprint_hash: str,
) -> str:
    return run(
        [
            "cast",
            "call",
            contract,
            "inventoryLockBindingHash(uint256,bytes32,bytes32)(bytes32)",
            str(trade_id),
            inventory_lock_hash,
            item_fingerprint_hash,
            "--rpc-url",
            rpc_url,
        ]
    ).stdout.strip()


def sign_inventory_lock_binding(
    rpc_url: str,
    contract: str,
    trade_id: int,
    inventory_lock_hash: str,
    item_fingerprint_hash: str,
    signer_key: str,
) -> str:
    binding_hash = inventory_lock_binding_hash(
        rpc_url, contract, trade_id, inventory_lock_hash, item_fingerprint_hash
    )
    return sign_hash(binding_hash, signer_key)


def verifier_scope_approval_hash(
    rpc_url: str,
    contract: str,
    trade_id: int,
    verifier: str,
    scope_set_hash_: str,
    approval_hash: str,
) -> str:
    return run(
        [
            "cast",
            "call",
            contract,
            "verifierScopeApprovalHash(uint256,address,bytes32,bytes32)(bytes32)",
            str(trade_id),
            verifier,
            scope_set_hash_,
            approval_hash,
            "--rpc-url",
            rpc_url,
        ]
    ).stdout.strip()


def sign_verifier_scope_approval(
    rpc_url: str,
    contract: str,
    trade_id: int,
    verifier: str,
    scope_set_hash_: str,
    approval_hash: str,
    signer_key: str,
) -> str:
    binding_hash = verifier_scope_approval_hash(
        rpc_url, contract, trade_id, verifier, scope_set_hash_, approval_hash
    )
    return sign_hash(binding_hash, signer_key)


def verifier_attestation_binding_hash(
    rpc_url: str,
    contract: str,
    trade_id: int,
    attestation_hash: str,
    subject_hash: str,
    scope_set_hash_: str,
    method_id_hash_: str,
) -> str:
    return run(
        [
            "cast",
            "call",
            contract,
            "verifierAttestationBindingHash(uint256,bytes32,bytes32,bytes32,bytes32)(bytes32)",
            str(trade_id),
            attestation_hash,
            subject_hash,
            scope_set_hash_,
            method_id_hash_,
            "--rpc-url",
            rpc_url,
        ]
    ).stdout.strip()


def sign_verifier_attestation_binding(
    rpc_url: str,
    contract: str,
    trade_id: int,
    attestation_hash: str,
    subject_hash: str,
    scope_set_hash_: str,
    method_id_hash_: str,
    signer_key: str,
) -> str:
    binding_hash = verifier_attestation_binding_hash(
        rpc_url,
        contract,
        trade_id,
        attestation_hash,
        subject_hash,
        scope_set_hash_,
        method_id_hash_,
    )
    return sign_hash(binding_hash, signer_key)


def fingerprint_challenge_resolution_hash(
    rpc_url: str,
    contract: str,
    trade_id: int,
    resolution_hash: str,
    challenge_hash: str,
    attestation_hash: str,
) -> str:
    return run(
        [
            "cast",
            "call",
            contract,
            "fingerprintChallengeResolutionHash(uint256,bytes32,bytes32,bytes32)(bytes32)",
            str(trade_id),
            resolution_hash,
            challenge_hash,
            attestation_hash,
            "--rpc-url",
            rpc_url,
        ]
    ).stdout.strip()


def sign_fingerprint_challenge_resolution(
    rpc_url: str,
    contract: str,
    trade_id: int,
    resolution_hash: str,
    challenge_hash: str,
    attestation_hash: str,
    signer_key: str,
) -> str:
    binding_hash = fingerprint_challenge_resolution_hash(
        rpc_url, contract, trade_id, resolution_hash, challenge_hash, attestation_hash
    )
    return sign_hash(binding_hash, signer_key)


def verify_packet_signature(
    rpc_url: str, registry: str, signer: str, payload_hash: str, signature: str
) -> bool:
    output = run(
        [
            "cast",
            "call",
            registry,
            "verifyActorSignature(address,bytes32,bytes)(bool)",
            signer,
            payload_hash,
            signature,
            "--rpc-url",
            rpc_url,
        ]
    ).stdout.strip()
    return output == "true" or output.endswith("1")


def write_packet(
    packet_dir: Path,
    packet_id: str,
    payload: dict[str, Any],
    signer_key: str,
    signer_address: str,
) -> PacketRecord:
    payload_hash = keccak_payload(payload)
    signature = sign_hash(payload_hash, signer_key)
    path = packet_dir / f"{packet_id}.json"
    envelope = {
        "hash_algorithm": "keccak256(utf8(canonical-json-payload-v1))",
        "signature_scheme": "eip191-personal-sign(payload_hash)",
        "signer": signer_address,
        "signature": signature,
        "payload_hash": payload_hash,
        "canonical_payload": canonical_payload(payload),
        "payload": payload,
    }
    path.write_text(json.dumps(envelope, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return PacketRecord(
        packet_id=packet_id,
        path=str(path.relative_to(ROOT)),
        payload_hash=payload_hash,
        schema=str(payload.get("schema", "unknown")),
        signer=signer_address,
        signature=signature,
    )


def _text_has_banned_verifier_phrase(value: str) -> bool:
    lowered = value.lower()
    return any(phrase in lowered for phrase in BANNED_VERIFIER_DISPLAY_PHRASES)


def _collect_text(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        texts: list[str] = []
        for item in value:
            texts.extend(_collect_text(item))
        return texts
    if isinstance(value, dict):
        texts = []
        for item in value.values():
            texts.extend(_collect_text(item))
        return texts
    return []


def validate_verifier_scope_attestation(payload: dict[str, Any]) -> None:
    if payload.get("schema") != "marketplace.verifier_scope_attestation.v0.1":
        raise ValueError("verifier attestation has wrong schema")

    scopes = payload.get("scope")
    if not isinstance(scopes, list) or not scopes:
        raise ValueError("verifier attestation requires nonempty scope list")
    unknown_scopes = sorted(set(scopes) - ALLOWED_VERIFIER_SCOPES)
    if unknown_scopes:
        raise ValueError(f"unknown verifier scopes: {unknown_scopes}")

    method = payload.get("method")
    if not isinstance(method, dict) or method.get("method_id") not in ALLOWED_VERIFIER_METHODS:
        raise ValueError("verifier attestation requires registered method_id")

    if payload.get("verification_model") not in ALLOWED_VERIFICATION_MODELS:
        raise ValueError("verifier attestation requires known verification_model")

    if not payload.get("issued_at"):
        raise ValueError("verifier attestation requires issued_at")

    if not payload.get("inputs_seen"):
        raise ValueError("verifier attestation requires inputs_seen")

    if not payload.get("inputs_not_seen"):
        raise ValueError("verifier attestation requires inputs_not_seen")

    display = payload.get("display")
    if not isinstance(display, dict) or not display.get("label") or not display.get("short_warning"):
        raise ValueError("verifier attestation requires display label and warning")

    for text in (
        _collect_text(display.get("label"))
        + _collect_text(payload.get("claim", {}).get("positive", []))
        + _collect_text(method)
    ):
        if _text_has_banned_verifier_phrase(text):
            raise ValueError(f"forbidden verifier display language: {text}")


def write_verifier_scope_attestation_packet(
    packet_dir: Path,
    packet_id: str,
    payload: dict[str, Any],
) -> PacketRecord:
    validate_verifier_scope_attestation(payload)
    return write_packet(packet_dir, packet_id, payload, VERIFIER_KEY, VERIFIER)


def wait_for_rpc(rpc_url: str) -> None:
    last_output = ""
    for _ in range(60):
        completed = run(["cast", "chain-id", "--rpc-url", rpc_url], check=False)
        if completed.returncode == 0:
            return
        last_output = completed.stdout
        time.sleep(0.25)
    raise RuntimeError(f"Anvil RPC did not become ready at {rpc_url}\n{last_output}")


def deploy_registry(rpc_url: str) -> str:
    created = run(
        [
            "forge",
            "create",
            "src/MarketplaceActorRegistry.sol:MarketplaceActorRegistry",
            "--rpc-url",
            rpc_url,
            "--private-key",
            BUYER_KEY,
            "--broadcast",
            "--json",
        ]
    )
    data = json.loads(created.stdout)
    return data["deployedTo"]


def deploy_escrow(rpc_url: str, registry: str) -> str:
    created = run(
        [
            "forge",
            "create",
            "src/MarketplaceEscrow.sol:MarketplaceEscrow",
            "--rpc-url",
            rpc_url,
            "--private-key",
            BUYER_KEY,
            "--broadcast",
            "--json",
            "--constructor-args",
            registry,
        ]
    )
    data = json.loads(created.stdout)
    return data["deployedTo"]


def deploy_predicate_verifier(rpc_url: str) -> str:
    created = run(
        [
            "forge",
            "create",
            "src/MarketplacePredicateVerifierStub.sol:MarketplacePredicateVerifierStub",
            "--rpc-url",
            rpc_url,
            "--private-key",
            BUYER_KEY,
            "--broadcast",
            "--json",
        ]
    )
    data = json.loads(created.stdout)
    return data["deployedTo"]


def tx_hash_from_output(output: str) -> str:
    text = output.strip()
    if not text:
        return ""
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        for line in text.splitlines():
            if line.strip().startswith("transactionHash"):
                return line.split(maxsplit=1)[1].strip()
        return text.splitlines()[-1].strip()

    if isinstance(data, dict):
        for key in ("transactionHash", "transaction_hash", "hash"):
            if key in data:
                return str(data[key])
        receipt = data.get("receipt")
        if isinstance(receipt, dict):
            for key in ("transactionHash", "transaction_hash", "hash"):
                if key in receipt:
                    return str(receipt[key])
    return text.splitlines()[-1].strip()


def send_tx(
    rpc_url: str,
    private_key: str,
    contract: str,
    label: str,
    signature: str,
    args: list[str],
    value_wei: str | None = None,
) -> TxRecord:
    cmd = [
        "cast",
        "send",
        contract,
        signature,
        *args,
        "--rpc-url",
        rpc_url,
        "--private-key",
        private_key,
        "--json",
    ]
    if value_wei is not None:
        cmd.extend(["--value", value_wei])
    return TxRecord(label=label, tx_hash=tx_hash_from_output(run(cmd).stdout))


def expect_tx_revert(
    rpc_url: str,
    private_key: str,
    contract: str,
    label: str,
    signature: str,
    args: list[str],
    value_wei: str | None = None,
) -> str:
    try:
        send_tx(rpc_url, private_key, contract, label, signature, args, value_wei=value_wei)
    except RuntimeError:
        return f"{label} reverted as expected."
    raise RuntimeError(f"expected revert did not occur: {label}")


def increase_time(rpc_url: str, seconds: int) -> None:
    run(["cast", "rpc", "evm_increaseTime", str(seconds), "--rpc-url", rpc_url])
    run(["cast", "rpc", "evm_mine", "--rpc-url", rpc_url])


def call_state(rpc_url: str, contract: str, trade_id: int) -> str:
    output = run(
        [
            "cast",
            "call",
            contract,
            "getState(uint256)(uint8)",
            str(trade_id),
            "--rpc-url",
            rpc_url,
        ]
    ).stdout.strip()
    state_number = int(output, 16) if output.startswith("0x") else int(output)
    return STATE_NAMES[state_number]


def verify_packets(rpc_url: str, registry: str, packets: list[PacketRecord]) -> None:
    for packet in packets:
        packet.signature_valid = verify_packet_signature(
            rpc_url, registry, packet.signer, packet.payload_hash, packet.signature
        )


def setup_registry(rpc_url: str, registry: str, predicate_verifier: str, packet_dir: Path) -> RegistrySetup:
    setup = RegistrySetup(registry=registry, predicate_verifier=predicate_verifier)

    for role in ["buyer", "seller", "arbiter", "verifier", "replacement_arbiter"]:
        signer = SIGNERS[role]
        registry_role = "arbiter" if role == "replacement_arbiter" else role
        packet = write_packet(
            packet_dir,
            f"actor_{role}",
            {
                "schema": "marketplace.actor_record.v0.2",
                "actor_id": signer["actor_id"],
                "role": registry_role,
                "chain": "anvil:31337",
                "address": signer["address"],
                "status": "active",
                "capabilities": ["sign_packets", "settle_local_evm_probe"],
            },
            signer["key"],
            signer["address"],
        )
        setup.transactions.append(
            send_tx(
                rpc_url,
                BUYER_KEY,
                registry,
                f"register {role} actor",
                "registerActor(address,uint8,bytes32)",
                [signer["address"], ROLE[registry_role], packet.payload_hash],
            )
        )
        packet.signature_valid = verify_packet_signature(
            rpc_url, registry, packet.signer, packet.payload_hash, packet.signature
        )
        setup.packets.append(packet)

    arbiter_authority = write_packet(
        packet_dir,
        "arbiter_authority",
        {
            "schema": "marketplace.arbiter_record.v0.2",
            "actor_id": SIGNERS["arbiter"]["actor_id"],
            "jurisdiction": "local-anvil-probe",
            "scope": ["tcg_single_card", "condition_claim", "route_failure"],
            "conflict_policy": "must_disclose_and_recuse",
            "bond_eth": "1.0",
        },
        ARBITER_KEY,
        ARBITER,
    )
    setup.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            registry,
            "register arbiter authority",
            "registerArbiter(address,bytes32,uint96)",
            [ARBITER, arbiter_authority.payload_hash, eth("1.0")],
        )
    )
    arbiter_authority.signature_valid = verify_packet_signature(
        rpc_url, registry, ARBITER, arbiter_authority.payload_hash, arbiter_authority.signature
    )
    setup.packets.append(arbiter_authority)

    replacement_arbiter_authority = write_packet(
        packet_dir,
        "replacement_arbiter_authority",
        {
            "schema": "marketplace.arbiter_record.v0.2",
            "actor_id": SIGNERS["replacement_arbiter"]["actor_id"],
            "jurisdiction": "local-anvil-probe",
            "scope": ["claim_takeover", "tcg_single_card", "condition_claim"],
            "conflict_policy": "replacement_requires_buyer_and_seller_approval",
            "bond_eth": "1.0",
        },
        REPLACEMENT_ARBITER_KEY,
        REPLACEMENT_ARBITER,
    )
    setup.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            registry,
            "register replacement arbiter authority",
            "registerArbiter(address,bytes32,uint96)",
            [REPLACEMENT_ARBITER, replacement_arbiter_authority.payload_hash, eth("1.0")],
        )
    )
    replacement_arbiter_authority.signature_valid = verify_packet_signature(
        rpc_url,
        registry,
        REPLACEMENT_ARBITER,
        replacement_arbiter_authority.payload_hash,
        replacement_arbiter_authority.signature,
    )
    setup.packets.append(replacement_arbiter_authority)

    verifier_authority = write_packet(
        packet_dir,
        "verifier_authority",
        {
            "schema": "marketplace.verifier_record.v0.2",
            "actor_id": SIGNERS["verifier"]["actor_id"],
            "scope": ["tcg_image_review", "shipping_packet_review", "claim_packet_assembly"],
            "independence": "not_seller_controlled",
            "bond_eth": "0.5",
        },
        VERIFIER_KEY,
        VERIFIER,
    )
    setup.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            registry,
            "register verifier authority",
            "registerVerifier(address,bytes32,uint96)",
            [VERIFIER, verifier_authority.payload_hash, eth("0.5")],
        )
    )
    verifier_authority.signature_valid = verify_packet_signature(
        rpc_url, registry, VERIFIER, verifier_authority.payload_hash, verifier_authority.signature
    )
    setup.packets.append(verifier_authority)

    predicate_verifier_record = write_packet(
        packet_dir,
        "predicate_verifier_contract",
        {
            "schema": "marketplace.predicate_verifier_record.v0.2",
            "verifier_contract": predicate_verifier,
            "mode": "local_stub_acceptance_registry",
            "scope": ["private_predicate_proof", "threshold_predicate"],
            "production_status": "scaffolding_only_not_a_real_zk_verifier",
        },
        VERIFIER_KEY,
        VERIFIER,
    )
    setup.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            registry,
            "register predicate verifier contract",
            "registerPredicateVerifier(address,bytes32,uint96)",
            [predicate_verifier, predicate_verifier_record.payload_hash, "0"],
        )
    )
    predicate_verifier_record.signature_valid = verify_packet_signature(
        rpc_url,
        registry,
        VERIFIER,
        predicate_verifier_record.payload_hash,
        predicate_verifier_record.signature,
    )
    setup.packets.append(predicate_verifier_record)

    setup.observations.extend(
        [
            "Every actor has a controller address and a signed ActorRecord packet.",
            "Verifier and arbiter authority are separate records, not just role labels.",
            "Predicate verifier contracts are registry-gated before private predicate packets can use them.",
            "The escrow can now reject trades that select an inactive or unknown arbiter.",
        ]
    )
    return setup


def run_happy_path(
    rpc_url: str,
    registry: str,
    contract: str,
    predicate_verifier: str,
    packet_dir: Path,
    trade_id: int,
) -> ScenarioResult:
    result = ScenarioResult(name="happy_path_insured_card", trade_id=trade_id, final_state="")

    intent = write_packet(
        packet_dir,
        "happy_intent",
        {
            "schema": "marketplace.intent.v0.2",
            "intent_id": "intent_happy_001",
            "buyer": "did:market:buyer:anvil-0",
            "buyer_agent": "did:market:agent:buyer-alpha",
            "object": {
                "domain": "tcg",
                "game": "pokemon",
                "card": "Japanese vintage holo",
                "condition_floor": "LP",
                "language": "Japanese",
            },
            "cost_field": {
                "max_total_price_eth": "0.80",
                "attention_budget": "low",
                "evidence_floor": ["front_scan", "back_scan", "insured_tracking"],
                "route_preferences": ["insured_shipping", "local_handoff_if_close"],
            },
        },
        BUYER_KEY,
        BUYER,
    )
    terms = write_packet(
        packet_dir,
        "happy_escrow_terms",
        {
            "schema": "marketplace.escrow_terms.v0.2",
            "trade_template": "tcg_single_card",
            "price_eth": "0.80",
            "seller_bond_eth": "0.08",
            "buyer_dispute_bond_eth": "0.01",
            "inspection_seconds": 172800,
            "escrow_model": "on_chain_native_eth_local_probe",
            "covered_promises": ["correct_item", "condition_floor", "insured_route"],
            "release_gate": "buyer_accepts_or_inspection_window_expires",
        },
        BUYER_KEY,
        BUYER,
    )
    proof = write_packet(
        packet_dir,
        "happy_trust_offer",
        {
            "schema": "marketplace.trust_offer.v0.2",
            "seller": "did:market:seller:anvil-1",
            "trust_sources": [
                {
                    "source": "signed_shop_domain",
                    "claim": "same operator as public card shop site",
                    "challenge_nonce": "happy-shop-domain-001",
                    "freshness": "2026-05-18",
                },
                {
                    "source": "prior_marketplace_receipts",
                    "claim": "tcg singles shipped without dispute",
                    "scope": ["tcg", "raw_condition", "insured_shipping"],
                },
            ],
        },
        SELLER_KEY,
        SELLER,
    )
    item_fingerprint = write_packet(
        packet_dir,
        "happy_item_fingerprint",
        {
            "schema": "marketplace.item_fingerprint.v0.2",
            "trade_id": trade_id,
            "identity_claim": {
                "domain": "tcg",
                "game": "pokemon",
                "card": "Japanese vintage holo",
                "language": "Japanese",
                "condition_claim": "LP",
            },
            "evidence_refs": [
                {"type": "front_scan", "ref": "front_scan_hash"},
                {"type": "back_scan", "ref": "back_scan_hash"},
                {"type": "corner_closeups", "ref": "corner_closeups_hash"},
            ],
            "correlation_method": ["visual_match", "seller_custody_nonce"],
            "confidence_scope": "medium_for_raw_card_identity",
            "privacy_policy": "buyer_and_arbiter",
        },
        SELLER_KEY,
        SELLER,
    )
    inventory_lock = write_packet(
        packet_dir,
        "happy_inventory_lock",
        {
            "schema": "marketplace.inventory_lock.v0.2",
            "trade_id": trade_id,
            "seller": SIGNERS["seller"]["actor_id"],
            "item_fingerprint_hash": item_fingerprint.payload_hash,
            "inventory_key": "tcg:pokemon:japanese-vintage-holo:happy-001",
            "item_fingerprint": {
                "game": "pokemon",
                "language": "Japanese",
                "condition_claim": "LP",
                "visible_identifiers": ["front_scan_hash", "back_scan_hash"],
            },
            "lock_scope": "single_unique_card",
        },
        SELLER_KEY,
        SELLER,
    )
    seller_private_predicate = write_packet(
        packet_dir,
        "happy_seller_private_predicate",
        {
            "schema": "marketplace.private_predicate_proof.v0.2",
            "proof_id": "ppp_happy_seller_001",
            "subject": SIGNERS["seller"]["actor_id"],
            "issuer": SIGNERS["seller"]["actor_id"],
            "predicate": {
                "field": "completed_tcg_sales",
                "operator": ">=",
                "threshold": 500,
                "scope": ["tcg", "raw_cards", "insured_shipping"],
            },
            "disclosure": "predicate_only",
            "proof_type": "signed_attestation",
            "source_commitment": "0xsourcecommitment_happy_seller",
            "public_inputs": {
                "subject_commitment": "0xsubject_happy_seller",
                "threshold": 500,
                "scope_hash": "0xscope_tcg_raw_insured",
                "freshness_epoch": "2026-05",
            },
            "zk": {
                "circuit_id": "seller_reputation_threshold_v1",
                "verifying_key_hash": "0xreserved",
                "proof_bytes": None,
            },
        },
        SELLER_KEY,
        SELLER,
    )
    buyer_private_predicate = write_packet(
        packet_dir,
        "happy_buyer_funding_predicate",
        {
            "schema": "marketplace.private_predicate_proof.v0.2",
            "proof_id": "ppp_happy_buyer_001",
            "subject": SIGNERS["buyer"]["actor_id"],
            "issuer": SIGNERS["buyer"]["actor_id"],
            "predicate": {
                "field": "available_funding",
                "operator": ">=",
                "threshold_eth": "0.80",
                "scope": ["trade_escrow", "tcg_single_card"],
            },
            "disclosure": "predicate_only",
            "proof_type": "self_signed_attestation_local_probe",
            "source_commitment": "0xfundingcommitment_happy_buyer",
            "public_inputs": {
                "subject_commitment": "0xsubject_happy_buyer",
                "threshold_wei": eth("0.80"),
                "scope_hash": "0xscope_trade_escrow",
                "freshness_epoch": "2026-05",
            },
            "zk": {
                "circuit_id": "buyer_funding_threshold_v1",
                "verifying_key_hash": "0xreserved",
                "proof_bytes": None,
            },
        },
        BUYER_KEY,
        BUYER,
    )
    item_evidence_manifest = write_evidence_manifest_packet(
        packet_dir,
        "happy_item_evidence",
        trade_id,
        "seller",
        "item_fingerprint",
        item_fingerprint.payload_hash,
        "standard",
        "manifest_integrity_only",
        [
            {
                "asset_id": "front-scan",
                "role": "front_photo",
                "filename": "front-scan.png",
                "data": b"\x89PNG\r\nhappy-japanese-vintage-holo-front-lp",
            },
            {
                "asset_id": "back-scan",
                "role": "back_photo",
                "filename": "back-scan.png",
                "data": b"\x89PNG\r\nhappy-japanese-vintage-holo-back-lp",
            },
            {
                "asset_id": "corner-closeups",
                "role": "corner_photo",
                "filename": "corner-closeups.png",
                "data": b"\x89PNG\r\nhappy-corner-closeups-no-hidden-crease",
            },
        ],
        known_limits=["Manifest integrity only; not authenticity or shipping verification."],
    )
    evidence = item_evidence_manifest.packet
    verifier_scope_scopes = ["packet_completeness", "raw_card_identity"]
    verifier_scope_hash = scope_set_hash(verifier_scope_scopes)
    verifier_method_id = "tcg.raw.photo_packet_review.v0.1"
    verifier_method_hash = method_id_hash(verifier_method_id)
    verifier_scope_approval = write_packet(
        packet_dir,
        "happy_verifier_scope_approval",
        {
            "schema": "marketplace.verifier_scope_approval.v0.1",
            "trade_id": trade_id,
            "buyer": SIGNERS["buyer"]["actor_id"],
            "verifier": SIGNERS["verifier"]["actor_id"],
            "scope": verifier_scope_scopes,
            "scope_set_hash": verifier_scope_hash,
            "limits": ["packet_review_only", "not_authenticity", "not_shipping"],
        },
        BUYER_KEY,
        BUYER,
    )
    verifier_review = write_verifier_scope_attestation_packet(
        packet_dir,
        "happy_verifier_review",
        {
            "schema": "marketplace.verifier_scope_attestation.v0.1",
            "trade_id": trade_id,
            "verifier": SIGNERS["verifier"]["actor_id"],
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "subject": {
                "subject_type": "evidence_manifest",
                "subject_hash": evidence.payload_hash,
            },
            "scope": verifier_scope_scopes,
            "scope_set_hash": verifier_scope_hash,
            "method": {
                "method_id": verifier_method_id,
                "method_id_hash": verifier_method_hash,
                "summary": "Compared the submitted scan packet against the raw-card identity claim.",
            },
            "verification_model": "remote_self_reported",
            "inputs_seen": [
                {"kind": "front_scan", "hash": "front_scan_hash"},
                {"kind": "back_scan", "hash": "back_scan_hash"},
                {"kind": "corner_closeups", "hash": "corner_closeups_hash"},
            ],
            "inputs_not_seen": [
                "in_person_card_inspection",
                "shipping_packaging",
                "post_review_custody",
            ],
            "claim": {
                "positive": [
                    "The scan packet is internally consistent with the raw-card identity claim."
                ],
                "negative": [
                    "This does not authenticate the card.",
                    "This does not verify packaging, shipping, or delivery condition.",
                ],
                "known_conflicts": [],
            },
            "challenge": {
                "hooks": ["fresh_nonce_photo", "arbiter_review"],
                "failure_policy": "separate_buyer_waiver_required",
            },
            "display": {
                "label": "Scan packet checked",
                "short_warning": "Not an authenticity guarantee.",
            },
        },
    )
    unapproved_verifier_fingerprint = write_packet(
        packet_dir,
        "happy_unapproved_verifier_fingerprint",
        {
            "schema": "marketplace.item_fingerprint.v0.2",
            "trade_id": trade_id,
            "issuer": SIGNERS["verifier"]["actor_id"],
            "identity_claim": {
                "domain": "tcg",
                "game": "pokemon",
                "card": "Japanese vintage holo",
                "condition_claim": "LP",
            },
            "evidence_refs": [{"type": "verifier_scan", "ref": "verifier_scan_hash"}],
            "correlation_method": ["visual_match"],
            "confidence_scope": "verifier_identity_claim_unapproved_for_probe",
            "privacy_policy": "buyer_and_arbiter",
        },
        VERIFIER_KEY,
        VERIFIER,
    )
    route = write_packet(
        packet_dir,
        "happy_route",
        {
            "schema": "marketplace.trade_route.v0.2",
            "trade_id": trade_id,
            "route_type": "insured_shipping",
            "carrier": "simulated_usps",
            "tracking": "SIM-HAPPY-0001",
            "insured": True,
            "declared_insurance_eth": "0.80",
            "signature_required": True,
        },
        SELLER_KEY,
        SELLER,
    )
    delivery = write_packet(
        packet_dir,
        "happy_delivery",
        {
            "schema": "marketplace.delivery_evidence.v0.2",
            "trade_id": trade_id,
            "carrier": "simulated_usps",
            "tracking": "SIM-HAPPY-0001",
            "delivered": True,
            "delivery_signal": "carrier_delivery_scan",
        },
        SELLER_KEY,
        SELLER,
    )
    receipt = write_packet(
        packet_dir,
        "happy_final_receipt",
        {
            "schema": "marketplace.trade_receipt.v0.2",
            "trade_id": trade_id,
            "buyer_acceptance": "accepted",
            "received_item": "matches intent and evidence",
            "final_packet": ["intent", "terms", "proof", "evidence", "route"],
        },
        BUYER_KEY,
        BUYER,
    )
    route_wall_bundle = route_wall_bundle_root(trade_id, route.payload_hash)
    route_assembly_history = route_assembly_history_hash(
        trade_id, route.payload_hash, route_wall_bundle
    )
    route_spendability = write_spendability_packet(
        packet_dir,
        "happy_route_spendability",
        trade_id,
        item_evidence_manifest.packet.payload_hash,
        item_evidence_manifest.payload["subject"]["subject_hash"],
        "route_commitment",
        f"route_commitment:{trade_id}:insured-route",
        "identity_support",
        "blocks_or_unblocks_gate",
        requires=["buyer_ack", "verifier_attestation"],
        wall_bundle_hash=route_wall_bundle,
        assembly_history_hash=route_assembly_history,
    )
    delivery_spendability = write_spendability_packet(
        packet_dir,
        "happy_delivery_spendability",
        trade_id,
        delivery.payload_hash,
        route.payload_hash,
        "delivery_confirmation",
        f"delivery_confirmation:{trade_id}:carrier-scan",
        "delivery_event",
        "opens_inspection",
        signer_role="seller",
        authority_role="seller",
        after_state="RouteLocked",
        after_event_hash=delivery.payload_hash,
        requires=["delivery_event"],
        not_claiming=["card_authenticity", "card_condition", "buyer_satisfaction"],
    )
    result.packets.extend(
        [
            intent,
            terms,
            proof,
            item_fingerprint,
            inventory_lock,
            seller_private_predicate,
            buyer_private_predicate,
            evidence,
            verifier_scope_approval,
            verifier_review,
            unapproved_verifier_fingerprint,
            route_spendability.packet,
            route,
            delivery_spendability.packet,
            delivery,
            receipt,
        ]
    )
    verify_packets(rpc_url, registry, result.packets)
    result.observations.append(
        "Item EvidenceManifest v0.3 validated fixture bytes, subject hash, and asset root before anchoring."
    )

    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            contract,
            "create insured trade",
            "createTrade(address,address,uint256,uint256,uint256,bytes32,bytes32,bytes,bytes)",
            [
                SELLER,
                ARBITER,
                eth("0.08"),
                eth("0.01"),
                "172800",
                intent.payload_hash,
                terms.payload_hash,
                intent.signature,
                terms.signature,
            ],
            value_wei=eth("0.80"),
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "seller posts bond",
            "acceptAndBond(uint256)",
            [str(trade_id)],
            value_wei=eth("0.08"),
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "attach trust proof",
            "attachProof(uint256,bytes32,bytes)",
            [str(trade_id), proof.payload_hash, proof.signature],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            predicate_verifier,
            "accept seller private predicate hash",
            "setPredicateAccepted(bytes32,bool)",
            [seller_private_predicate.payload_hash, "true"],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "attach seller private predicate",
            "attachPredicateEvidence(uint256,uint8,bytes32,bytes,address,bytes,bytes)",
            [
                str(trade_id),
                str(EVIDENCE_KIND["private_predicate"]),
                seller_private_predicate.payload_hash,
                seller_private_predicate.signature,
                predicate_verifier,
                "0x19",
                "0x01",
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            predicate_verifier,
            "accept buyer funding predicate hash",
            "setPredicateAccepted(bytes32,bool)",
            [buyer_private_predicate.payload_hash, "true"],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            contract,
            "attach buyer funding predicate",
            "attachPredicateEvidence(uint256,uint8,bytes32,bytes,address,bytes,bytes)",
            [
                str(trade_id),
                str(EVIDENCE_KIND["private_predicate"]),
                buyer_private_predicate.payload_hash,
                buyer_private_predicate.signature,
                predicate_verifier,
                "0x19",
                "0x01",
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "attach item evidence",
            "attachEvidence(uint256,uint8,bytes32,bytes)",
            [str(trade_id), str(EVIDENCE_KIND["item"]), evidence.payload_hash, evidence.signature],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            contract,
            "approve verifier review scope",
            "approveVerifierScope(uint256,address,bytes32,bytes32,bytes)",
            [
                str(trade_id),
                VERIFIER,
                verifier_scope_hash,
                verifier_scope_approval.payload_hash,
                sign_verifier_scope_approval(
                    rpc_url,
                    contract,
                    trade_id,
                    VERIFIER,
                    verifier_scope_hash,
                    verifier_scope_approval.payload_hash,
                    BUYER_KEY,
                ),
            ],
        )
    )
    result.observations.append(
        expect_tx_revert(
            rpc_url,
            VERIFIER_KEY,
            contract,
            "verifier cannot attach loose review evidence",
            "attachEvidence(uint256,uint8,bytes32,bytes)",
            [
                str(trade_id),
                str(EVIDENCE_KIND["item"]),
                verifier_review.payload_hash,
                verifier_review.signature,
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            VERIFIER_KEY,
            contract,
            "commit scoped verifier review",
            "commitVerifierAttestation(uint256,bytes32,bytes32,bytes32,bytes32,bytes)",
            [
                str(trade_id),
                verifier_review.payload_hash,
                evidence.payload_hash,
                verifier_scope_hash,
                verifier_method_hash,
                sign_verifier_attestation_binding(
                    rpc_url,
                    contract,
                    trade_id,
                    verifier_review.payload_hash,
                    evidence.payload_hash,
                    verifier_scope_hash,
                    verifier_method_hash,
                    VERIFIER_KEY,
                ),
            ],
        )
    )
    result.observations.append(
        validate_spendability_gate(
            route_spendability,
            SpendabilityGateContext(
                gate_type="route_commitment",
                gate_id=f"route_commitment:{trade_id}:insured-route",
                leg="forward",
                state_name="EvidencePending",
                state_hash=spendability_state_hash(trade_id, "EvidencePending"),
                wall_bundle_hash=route_wall_bundle,
                assembly_history_hash=route_assembly_history,
                requirements={"buyer_ack", "verifier_attestation"},
            ),
            consumed=set(),
        )
    )
    result.observations.append(
        expect_tx_revert(
            rpc_url,
            VERIFIER_KEY,
            contract,
            "unapproved verifier commits fingerprint",
            "commitItemFingerprint(uint256,bytes32,bytes)",
            [
                str(trade_id),
                unapproved_verifier_fingerprint.payload_hash,
                unapproved_verifier_fingerprint.signature,
            ],
        )
    )
    result.observations.append(
        expect_tx_revert(
            rpc_url,
            SELLER_KEY,
            contract,
            "replay item evidence",
            "attachEvidence(uint256,uint8,bytes32,bytes)",
            [
                str(trade_id),
                str(EVIDENCE_KIND["item"]),
                evidence.payload_hash,
                evidence.signature,
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "commit item fingerprint",
            "commitItemFingerprint(uint256,bytes32,bytes)",
            [str(trade_id), item_fingerprint.payload_hash, item_fingerprint.signature],
        )
    )
    result.observations.append(
        expect_tx_revert(
            rpc_url,
            SELLER_KEY,
            contract,
            "commit inventory lock with wrong fingerprint binding",
            "commitInventoryLock(uint256,bytes32,bytes32,bytes)",
            [
                str(trade_id),
                inventory_lock.payload_hash,
                proof.payload_hash,
                sign_inventory_lock_binding(
                    rpc_url,
                    contract,
                    trade_id,
                    inventory_lock.payload_hash,
                    proof.payload_hash,
                    SELLER_KEY,
                ),
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "commit inventory lock",
            "commitInventoryLock(uint256,bytes32,bytes32,bytes)",
            [
                str(trade_id),
                inventory_lock.payload_hash,
                item_fingerprint.payload_hash,
                sign_inventory_lock_binding(
                    rpc_url,
                    contract,
                    trade_id,
                    inventory_lock.payload_hash,
                    item_fingerprint.payload_hash,
                    SELLER_KEY,
                ),
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "commit insured route",
            "commitRoute(uint256,bytes32,bytes32,bytes32,bytes32,bytes32,bool,bool,uint256,bytes)",
            [
                str(trade_id),
                route.payload_hash,
                route_spendability.packet.payload_hash,
                route_wall_bundle,
                route_assembly_history,
                route_assembly_witness_hash(
                    rpc_url,
                    contract,
                    trade_id,
                    route.payload_hash,
                    route_spendability.packet.payload_hash,
                    route_wall_bundle,
                    route_assembly_history,
                ),
                "false",
                "true",
                eth("0.80"),
                route.signature,
            ],
        )
    )
    result.transactions.append(
        send_tx(rpc_url, SELLER_KEY, contract, "mark route in progress", "markRouteInProgress(uint256)", [str(trade_id)])
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "mark delivered",
            "markDelivered(uint256,bytes32,bytes32,bytes32,bytes)",
            [
                str(trade_id),
                delivery.payload_hash,
                delivery_spendability.packet.payload_hash,
                delivery_witness_hash(
                    rpc_url,
                    contract,
                    trade_id,
                    delivery.payload_hash,
                    delivery_spendability.packet.payload_hash,
                ),
                delivery.signature,
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            contract,
            "buyer accepts",
            "buyerAccept(uint256,bytes32,bytes)",
            [str(trade_id), receipt.payload_hash, receipt.signature],
        )
    )
    result.final_state = call_state(rpc_url, contract, trade_id)
    result.observations.extend(
        [
            "Buyer-funded intent became locked escrow.",
            "Seller attention stayed bounded: one trust proof, one item packet, one route packet.",
            "Final receipt closed the trade and released escrow plus bond.",
        ]
    )
    return result


def run_claim_path(
    rpc_url: str,
    registry: str,
    contract: str,
    predicate_verifier: str,
    packet_dir: Path,
    trade_id: int,
) -> ScenarioResult:
    result = ScenarioResult(name="new_seller_material_claim", trade_id=trade_id, final_state="")

    intent = write_packet(
        packet_dir,
        "claim_intent",
        {
            "schema": "marketplace.intent.v0.2",
            "intent_id": "intent_claim_001",
            "buyer": "did:market:buyer:anvil-0",
            "object": {
                "domain": "tcg",
                "game": "pokemon",
                "card": "hard-to-find vintage raw card",
                "condition_floor": "NM",
            },
            "cost_field": {
                "max_total_price_eth": "1.20",
                "new_seller_allowed": True,
                "required_concessions": ["larger_bond", "clear_claim_path", "route_disclosure"],
                "attention_budget": "medium",
            },
        },
        BUYER_KEY,
        BUYER,
    )
    terms = write_packet(
        packet_dir,
        "claim_escrow_terms",
        {
            "schema": "marketplace.escrow_terms.v0.2",
            "trade_template": "tcg_single_card_new_seller",
            "price_eth": "1.20",
            "seller_bond_eth": "0.24",
            "buyer_dispute_bond_eth": "0.02",
            "inspection_seconds": 172800,
            "covered_promises": ["correct_item", "condition_floor", "route_disclosure"],
            "known_gaps": ["seller has limited protocol-native history", "shipping is not insured"],
        },
        BUYER_KEY,
        BUYER,
    )
    proof = write_packet(
        packet_dir,
        "claim_new_seller_proof",
        {
            "schema": "marketplace.trust_offer.v0.2",
            "seller": "did:market:seller:anvil-1",
            "trust_sources": [
                {
                    "source": "unsigned_marketplace_profile_screenshot",
                    "claim": "outside-platform seller history",
                    "weight": "low_without_challenge_signature",
                }
            ],
            "buyer_agent_decision": "accept only with 20 percent seller bond and explicit claim packet",
        },
        SELLER_KEY,
        SELLER,
    )
    item_fingerprint = write_packet(
        packet_dir,
        "claim_item_fingerprint",
        {
            "schema": "marketplace.item_fingerprint.v0.2",
            "trade_id": trade_id,
            "identity_claim": {
                "domain": "tcg",
                "game": "pokemon",
                "card": "hard-to-find vintage raw card",
                "condition_claim": "NM",
            },
            "evidence_refs": [
                {"type": "front_photo", "ref": "front_photo_hash"},
                {"type": "back_photo", "ref": "back_photo_hash"},
                {"type": "seller_profile", "ref": "claim_new_seller_proof"},
            ],
            "correlation_method": ["visual_match", "seller_custody_nonce"],
            "confidence_scope": "weaker_for_new_seller_raw_card",
            "challenge_hooks": ["fresh_timestamped_photo", "edge_closeups", "verifier_review"],
            "privacy_policy": "buyer_and_arbiter",
        },
        SELLER_KEY,
        SELLER,
    )
    inventory_lock = write_packet(
        packet_dir,
        "claim_inventory_lock",
        {
            "schema": "marketplace.inventory_lock.v0.2",
            "trade_id": trade_id,
            "seller": SIGNERS["seller"]["actor_id"],
            "item_fingerprint_hash": item_fingerprint.payload_hash,
            "inventory_key": "tcg:pokemon:hard-to-find-vintage-raw:claim-002",
            "item_fingerprint": {
                "game": "pokemon",
                "condition_claim": "NM",
                "visible_identifiers": ["front_photo_hash", "back_photo_hash"],
            },
            "lock_scope": "single_unique_card",
        },
        SELLER_KEY,
        SELLER,
    )
    fingerprint_challenge = write_packet(
        packet_dir,
        "claim_fingerprint_challenge",
        {
            "schema": "marketplace.fingerprint_challenge.v0.1",
            "trade_id": trade_id,
            "challenger": SIGNERS["buyer"]["actor_id"],
            "target_fingerprint_hash": item_fingerprint.payload_hash,
            "grounds": ["new_seller_sparse_photos", "custody_not_proven"],
            "requested_evidence": ["fresh_timestamped_photo", "edge_closeups"],
            "failure_policy": "block_route_until_buyer_waiver_or_resolution",
        },
        BUYER_KEY,
        BUYER,
    )
    fingerprint_challenge_clear = write_packet(
        packet_dir,
        "claim_fingerprint_challenge_clear",
        {
            "schema": "marketplace.fingerprint_challenge_resolution.v0.1",
            "trade_id": trade_id,
            "target_fingerprint_hash": item_fingerprint.payload_hash,
            "challenge_hash": fingerprint_challenge.payload_hash,
            "resolution": "buyer_accepts_seller_nonce_photo_for_alpha_probe",
            "route_gate": "cleared_for_route_commitment",
        },
        BUYER_KEY,
        BUYER,
    )
    seller_private_predicate = write_packet(
        packet_dir,
        "claim_seller_private_predicate",
        {
            "schema": "marketplace.private_predicate_proof.v0.2",
            "proof_id": "ppp_claim_seller_001",
            "subject": SIGNERS["seller"]["actor_id"],
            "issuer": SIGNERS["seller"]["actor_id"],
            "predicate": {
                "field": "completed_tcg_sales",
                "operator": ">=",
                "threshold": 25,
                "scope": ["tcg", "raw_cards"],
            },
            "disclosure": "predicate_only",
            "proof_type": "signed_attestation",
            "source_commitment": "0xsourcecommitment_claim_seller",
            "public_inputs": {
                "subject_commitment": "0xsubject_claim_seller",
                "threshold": 25,
                "scope_hash": "0xscope_tcg_raw",
                "freshness_epoch": "2026-05",
            },
            "zk": {
                "circuit_id": "seller_reputation_threshold_v1",
                "verifying_key_hash": "0xreserved",
                "proof_bytes": None,
            },
            "agent_read": "Predicate clears a minimum activity floor but does not erase new-seller risk.",
        },
        SELLER_KEY,
        SELLER,
    )
    circuit_profile = write_packet(
        packet_dir,
        "claim_circuit_profile",
        {
            "schema": "marketplace.circuit_profile.v0.2",
            "circuit_id": "seller_reputation_threshold_v1",
            "version": "reserved-local-alpha",
            "predicate_family": "threshold_over_private_set",
            "public_input_schema": [
                "subject_commitment",
                "issuer_commitment",
                "threshold",
                "scope_hash",
                "freshness_epoch",
            ],
            "verifying_key_hash": "0xreserved",
            "verifier_contract": None,
            "status": "reserved_for_future_zk_verifier",
        },
        BUYER_KEY,
        BUYER,
    )
    item_evidence_manifest = write_evidence_manifest_packet(
        packet_dir,
        "claim_sparse_item_evidence",
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
                "data": b"\x89PNG\r\nclaim-new-seller-front-photo-nm-representation",
            },
            {
                "asset_id": "back-photo",
                "role": "back_photo",
                "filename": "back-photo.png",
                "data": b"\x89PNG\r\nclaim-new-seller-back-photo-edge-wear-not-visible",
            },
        ],
        known_limits=[
            "Sparse seller manifest supports item identity only.",
            "Condition floor and full custody remain explicitly unproven.",
        ],
    )
    item_evidence = item_evidence_manifest.packet
    route = write_packet(
        packet_dir,
        "claim_route_uninsured",
        {
            "schema": "marketplace.trade_route.v0.2",
            "trade_id": trade_id,
            "route_type": "standard_shipping",
            "tracking": "SIM-CLAIM-0002",
            "insured": False,
            "declared_insurance_eth": "0",
            "buyer_accepted_gap": True,
        },
        SELLER_KEY,
        SELLER,
    )
    delivery = write_packet(
        packet_dir,
        "claim_delivery",
        {
            "schema": "marketplace.delivery_evidence.v0.2",
            "trade_id": trade_id,
            "tracking": "SIM-CLAIM-0002",
            "delivered": True,
            "delivery_signal": "seller_delivery_notice",
        },
        SELLER_KEY,
        SELLER,
    )
    claim = write_packet(
        packet_dir,
        "claim_packet",
        {
            "schema": "marketplace.dispute_case.v0.2",
            "trade_id": trade_id,
            "grounds_type": "material_misdescription",
            "promised": {"condition_floor": "NM", "evidence": "front/back photos"},
            "happened": {"received_condition": "LP", "issue": "edge wear not visible in original photos"},
            "requested_remedy": "partial_refund_plus_bond_penalty",
        },
        BUYER_KEY,
        BUYER,
    )
    received_claim_manifest = write_evidence_manifest_packet(
        packet_dir,
        "claim_received_item_evidence",
        trade_id,
        "buyer",
        "claim",
        claim.payload_hash,
        "claim_grade",
        "manifest_integrity_only",
        [
            {
                "asset_id": "received-front",
                "role": "front_photo",
                "filename": "received-front.png",
                "data": b"\x89PNG\r\nbuyer-received-front-photo-lp-condition",
                "source_origin": "buyer",
            },
            {
                "asset_id": "received-back",
                "role": "back_photo",
                "filename": "received-back.png",
                "data": b"\x89PNG\r\nbuyer-received-back-photo-edge-wear",
                "source_origin": "buyer",
            },
            {
                "asset_id": "edge-wear-closeup",
                "role": "edge_photo",
                "filename": "edge-wear-closeup.png",
                "data": b"\x89PNG\r\nbuyer-closeup-edge-wear-visible-after-delivery",
                "source_origin": "buyer",
            },
        ],
        known_limits=["Remote buyer photos support claim assembly but do not decide payout."],
        retention_policy={
            "minimum_retention_days": 180,
            "storage_strategy": "local_agent_cache",
        },
    )
    received_claim_evidence = received_claim_manifest.packet
    claim_verifier_scopes = ["raw_condition_floor"]
    claim_verifier_scope_hash = scope_set_hash(claim_verifier_scopes)
    claim_verifier_method_id = "tcg.raw.photo_packet_review.v0.1"
    claim_verifier_method_hash = method_id_hash(claim_verifier_method_id)
    claim_verifier_scope_approval = write_packet(
        packet_dir,
        "claim_verifier_scope_approval",
        {
            "schema": "marketplace.verifier_scope_approval.v0.1",
            "trade_id": trade_id,
            "buyer": SIGNERS["buyer"]["actor_id"],
            "verifier": SIGNERS["verifier"]["actor_id"],
            "scope": claim_verifier_scopes,
            "scope_set_hash": claim_verifier_scope_hash,
            "limits": ["received_condition_review_only", "not_full_authentication"],
        },
        BUYER_KEY,
        BUYER,
    )
    verifier_claim_note = write_verifier_scope_attestation_packet(
        packet_dir,
        "claim_verifier_note",
        {
            "schema": "marketplace.verifier_scope_attestation.v0.1",
            "trade_id": trade_id,
            "verifier": SIGNERS["verifier"]["actor_id"],
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "subject": {
                "subject_type": "evidence_manifest",
                "subject_hash": received_claim_evidence.payload_hash,
            },
            "scope": claim_verifier_scopes,
            "scope_set_hash": claim_verifier_scope_hash,
            "method": {
                "method_id": claim_verifier_method_id,
                "method_id_hash": claim_verifier_method_hash,
                "summary": "Compared received-item photos against the stated condition floor.",
            },
            "verification_model": "remote_self_reported",
            "inputs_seen": [
                {"kind": "received_front_photo", "hash": "received_front_hash"},
                {"kind": "received_back_photo", "hash": "received_back_hash"},
                {"kind": "edge_wear_closeup", "hash": "edge_wear_closeup_hash"},
            ],
            "inputs_not_seen": [
                "in_person_card_inspection",
                "original_pre_ship_card_in_hand",
                "carrier_damage_review",
            ],
            "claim": {
                "positive": [
                    "Received-item photos support a material gap from NM floor to LP condition."
                ],
                "negative": [
                    "This does not decide payout.",
                    "This does not verify carrier handling or packaging.",
                ],
                "known_conflicts": [],
            },
            "challenge": {
                "hooks": ["arbiter_review", "additional_received_angle"],
                "failure_policy": "separate_buyer_waiver_required",
            },
            "display": {
                "label": "Received condition reviewed",
                "short_warning": "Not a final ruling.",
            },
        },
    )
    ruling = write_packet(
        packet_dir,
        "claim_ruling",
        {
            "schema": "marketplace.resolve_or_claim.v0.2",
            "trade_id": trade_id,
            "arbiter": "did:market:arbiter:anvil-2",
            "finding": "material_misdescription",
            "buyer_refund_bps": 6000,
            "seller_bond_penalty_bps": 5000,
            "dispute_bond_returned_to_buyer": True,
            "reputation_event": "condition_claim_upheld_against_new_seller",
        },
        ARBITER_KEY,
        ARBITER,
    )
    challenge_clearance_spendability = write_spendability_packet(
        packet_dir,
        "claim_challenge_clearance_spendability",
        trade_id,
        item_evidence_manifest.packet.payload_hash,
        item_evidence_manifest.payload["subject"]["subject_hash"],
        "challenge_clearance",
        f"challenge_clearance:{trade_id}:fingerprint",
        "custody_support",
        "blocks_or_unblocks_gate",
        after_event_hash=fingerprint_challenge.payload_hash,
        requires=["buyer_ack", "human_waiver"],
        waiver_policy="buyer_signed",
        not_claiming=["authenticity", "condition_floor", "full_custody_chain"],
    )
    route_wall_bundle = route_wall_bundle_root(trade_id, route.payload_hash)
    route_assembly_history = route_assembly_history_hash(
        trade_id, route.payload_hash, route_wall_bundle
    )
    route_spendability = write_spendability_packet(
        packet_dir,
        "claim_route_spendability",
        trade_id,
        item_evidence_manifest.packet.payload_hash,
        item_evidence_manifest.payload["subject"]["subject_hash"],
        "route_commitment",
        f"route_commitment:{trade_id}:post-challenge",
        "identity_support",
        "blocks_or_unblocks_gate",
        after_event_hash=fingerprint_challenge_clear.payload_hash,
        requires=["buyer_ack", "human_waiver"],
        waiver_policy="buyer_signed",
        not_claiming=["authenticity", "condition_floor", "insured_route"],
        wall_bundle_hash=route_wall_bundle,
        assembly_history_hash=route_assembly_history,
    )
    delivery_spendability = write_spendability_packet(
        packet_dir,
        "claim_delivery_spendability",
        trade_id,
        delivery.payload_hash,
        route.payload_hash,
        "delivery_confirmation",
        f"delivery_confirmation:{trade_id}:seller-notice",
        "delivery_event",
        "opens_inspection",
        signer_role="seller",
        authority_role="seller",
        after_state="RouteLocked",
        after_event_hash=delivery.payload_hash,
        requires=["delivery_event"],
        not_claiming=["card_authenticity", "card_condition", "buyer_satisfaction"],
    )
    claim_support_spendability = write_spendability_packet(
        packet_dir,
        "claim_support_spendability",
        trade_id,
        received_claim_manifest.packet.payload_hash,
        received_claim_manifest.payload["subject"]["subject_hash"],
        "claim_support",
        f"claim_support:{trade_id}:material-condition",
        "condition_support",
        "assembles_claim_packet",
        after_state="ClaimOrDisputePending",
        requires=["buyer_ack", "claim_opened", "verifier_attestation"],
        not_claiming=["final_ruling", "carrier_damage"],
    )
    bond_action_spendability = write_spendability_packet(
        packet_dir,
        "claim_bond_action_spendability",
        trade_id,
        received_claim_manifest.packet.payload_hash,
        received_claim_manifest.payload["subject"]["subject_hash"],
        "bond_action",
        f"bond_action:{trade_id}:condition-ruling",
        "condition_support",
        "moves_funds",
        signer_role="arbiter",
        authority_role="arbiter",
        after_state="ClaimOrDisputePending",
        requires=["arbiter_assignment", "claim_opened", "verifier_attestation"],
        not_claiming=["authenticity", "carrier_damage"],
    )
    result.packets.extend(
        [
            intent,
            terms,
            proof,
            item_fingerprint,
            inventory_lock,
            fingerprint_challenge,
            fingerprint_challenge_clear,
            seller_private_predicate,
            circuit_profile,
            item_evidence,
            claim_verifier_scope_approval,
            route,
            delivery_spendability.packet,
            delivery,
            received_claim_evidence,
            claim,
            verifier_claim_note,
            challenge_clearance_spendability.packet,
            route_spendability.packet,
            claim_support_spendability.packet,
            bond_action_spendability.packet,
            ruling,
        ]
    )
    verify_packets(rpc_url, registry, result.packets)
    result.observations.append(
        "Seller item and buyer claim EvidenceManifest v0.3 packets validated fixture bytes, subject hashes, asset roots, and claim retention before anchoring."
    )

    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            contract,
            "create new-seller trade",
            "createTrade(address,address,uint256,uint256,uint256,bytes32,bytes32,bytes,bytes)",
            [
                SELLER,
                ARBITER,
                eth("0.24"),
                eth("0.02"),
                "172800",
                intent.payload_hash,
                terms.payload_hash,
                intent.signature,
                terms.signature,
            ],
            value_wei=eth("1.20"),
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "seller posts larger bond",
            "acceptAndBond(uint256)",
            [str(trade_id)],
            value_wei=eth("0.24"),
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "attach weak proof",
            "attachProof(uint256,bytes32,bytes)",
            [str(trade_id), proof.payload_hash, proof.signature],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            predicate_verifier,
            "accept claim seller predicate hash",
            "setPredicateAccepted(bytes32,bool)",
            [seller_private_predicate.payload_hash, "true"],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "attach seller activity predicate",
            "attachPredicateEvidence(uint256,uint8,bytes32,bytes,address,bytes,bytes)",
            [
                str(trade_id),
                str(EVIDENCE_KIND["private_predicate"]),
                seller_private_predicate.payload_hash,
                seller_private_predicate.signature,
                predicate_verifier,
                "0x19",
                "0x01",
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            contract,
            "attach circuit profile hook",
            "attachEvidence(uint256,uint8,bytes32,bytes)",
            [
                str(trade_id),
                str(EVIDENCE_KIND["trust"]),
                circuit_profile.payload_hash,
                circuit_profile.signature,
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            contract,
            "approve claim verifier scope",
            "approveVerifierScope(uint256,address,bytes32,bytes32,bytes)",
            [
                str(trade_id),
                VERIFIER,
                claim_verifier_scope_hash,
                claim_verifier_scope_approval.payload_hash,
                sign_verifier_scope_approval(
                    rpc_url,
                    contract,
                    trade_id,
                    VERIFIER,
                    claim_verifier_scope_hash,
                    claim_verifier_scope_approval.payload_hash,
                    BUYER_KEY,
                ),
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "attach sparse evidence",
            "attachEvidence(uint256,uint8,bytes32,bytes)",
            [
                str(trade_id),
                str(EVIDENCE_KIND["item"]),
                item_evidence.payload_hash,
                item_evidence.signature,
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "commit claim item fingerprint",
            "commitItemFingerprint(uint256,bytes32,bytes)",
            [str(trade_id), item_fingerprint.payload_hash, item_fingerprint.signature],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "commit claim inventory lock",
            "commitInventoryLock(uint256,bytes32,bytes32,bytes)",
            [
                str(trade_id),
                inventory_lock.payload_hash,
                item_fingerprint.payload_hash,
                sign_inventory_lock_binding(
                    rpc_url,
                    contract,
                    trade_id,
                    inventory_lock.payload_hash,
                    item_fingerprint.payload_hash,
                    SELLER_KEY,
                ),
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            contract,
            "open fingerprint challenge",
            "openFingerprintChallenge(uint256,bytes32,bytes)",
            [str(trade_id), fingerprint_challenge.payload_hash, fingerprint_challenge.signature],
        )
    )
    result.observations.append(
        expect_tx_revert(
            rpc_url,
            SELLER_KEY,
            contract,
            "commit route while fingerprint challenge is active",
            "commitRoute(uint256,bytes32,bytes32,bytes32,bytes32,bytes32,bool,bool,uint256,bytes)",
            [
                str(trade_id),
                route.payload_hash,
                route_spendability.packet.payload_hash,
                route_wall_bundle,
                route_assembly_history,
                route_assembly_witness_hash(
                    rpc_url,
                    contract,
                    trade_id,
                    route.payload_hash,
                    route_spendability.packet.payload_hash,
                    route_wall_bundle,
                    route_assembly_history,
                ),
                "false",
                "false",
                "0",
                route.signature,
            ],
        )
    )
    result.observations.append(
        validate_spendability_gate(
            challenge_clearance_spendability,
            SpendabilityGateContext(
                gate_type="challenge_clearance",
                gate_id=f"challenge_clearance:{trade_id}:fingerprint",
                leg="forward",
                state_name="EvidencePending",
                state_hash=spendability_state_hash(trade_id, "EvidencePending"),
                event_hashes={fingerprint_challenge.payload_hash},
                requirements={"buyer_ack"},
                waivers={"human_waiver"},
            ),
            consumed=set(),
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            contract,
            "clear fingerprint challenge",
            "clearFingerprintChallenge(uint256,bytes32,bytes)",
            [
                str(trade_id),
                fingerprint_challenge_clear.payload_hash,
                fingerprint_challenge_clear.signature,
            ],
        )
    )
    result.observations.append(
        validate_spendability_gate(
            route_spendability,
            SpendabilityGateContext(
                gate_type="route_commitment",
                gate_id=f"route_commitment:{trade_id}:post-challenge",
                leg="forward",
                state_name="EvidencePending",
                state_hash=spendability_state_hash(trade_id, "EvidencePending"),
                wall_bundle_hash=route_wall_bundle,
                assembly_history_hash=route_assembly_history,
                event_hashes={fingerprint_challenge_clear.payload_hash},
                requirements={"buyer_ack"},
                waivers={"human_waiver"},
            ),
            consumed=set(),
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "commit uninsured route",
            "commitRoute(uint256,bytes32,bytes32,bytes32,bytes32,bytes32,bool,bool,uint256,bytes)",
            [
                str(trade_id),
                route.payload_hash,
                route_spendability.packet.payload_hash,
                route_wall_bundle,
                route_assembly_history,
                route_assembly_witness_hash(
                    rpc_url,
                    contract,
                    trade_id,
                    route.payload_hash,
                    route_spendability.packet.payload_hash,
                    route_wall_bundle,
                    route_assembly_history,
                ),
                "false",
                "false",
                "0",
                route.signature,
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "mark delivered",
            "markDelivered(uint256,bytes32,bytes32,bytes32,bytes)",
            [
                str(trade_id),
                delivery.payload_hash,
                delivery_spendability.packet.payload_hash,
                delivery_witness_hash(
                    rpc_url,
                    contract,
                    trade_id,
                    delivery.payload_hash,
                    delivery_spendability.packet.payload_hash,
                ),
                delivery.signature,
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            contract,
            "attach received-item claim evidence",
            "attachEvidence(uint256,uint8,bytes32,bytes)",
            [
                str(trade_id),
                str(EVIDENCE_KIND["claim"]),
                received_claim_evidence.payload_hash,
                received_claim_evidence.signature,
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            VERIFIER_KEY,
            contract,
            "commit verifier claim note",
            "commitVerifierAttestation(uint256,bytes32,bytes32,bytes32,bytes32,bytes)",
            [
                str(trade_id),
                verifier_claim_note.payload_hash,
                received_claim_evidence.payload_hash,
                claim_verifier_scope_hash,
                claim_verifier_method_hash,
                sign_verifier_attestation_binding(
                    rpc_url,
                    contract,
                    trade_id,
                    verifier_claim_note.payload_hash,
                    received_claim_evidence.payload_hash,
                    claim_verifier_scope_hash,
                    claim_verifier_method_hash,
                    VERIFIER_KEY,
                ),
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            contract,
            "open claim with buyer dispute bond",
            "openClaim(uint256,bytes32,bytes)",
            [str(trade_id), claim.payload_hash, claim.signature],
            value_wei=eth("0.02"),
        )
    )
    result.observations.append(
        validate_spendability_gate(
            claim_support_spendability,
            SpendabilityGateContext(
                gate_type="claim_support",
                gate_id=f"claim_support:{trade_id}:material-condition",
                leg="return",
                state_name="ClaimOrDisputePending",
                state_hash=spendability_state_hash(trade_id, "ClaimOrDisputePending"),
                requirements={"buyer_ack", "claim_opened", "verifier_attestation"},
            ),
            consumed=set(),
        )
    )
    result.observations.append(
        validate_spendability_gate(
            bond_action_spendability,
            SpendabilityGateContext(
                gate_type="bond_action",
                gate_id=f"bond_action:{trade_id}:condition-ruling",
                leg="return",
                state_name="ClaimOrDisputePending",
                state_hash=spendability_state_hash(trade_id, "ClaimOrDisputePending"),
                requirements={"arbiter_assignment", "claim_opened", "verifier_attestation"},
            ),
            consumed=set(),
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            ARBITER_KEY,
            contract,
            "arbiter resolves claim",
            "resolveClaim(uint256,bytes32,uint16,uint16,bool,bytes)",
            [str(trade_id), ruling.payload_hash, "6000", "5000", "true", ruling.signature],
        )
    )
    result.final_state = call_state(rpc_url, contract, trade_id)
    result.observations.extend(
        [
            "A brand-new seller can still clear the trade by posting a larger bond.",
            "Weak trust proof did not need to become a scalar score; it became an explicit gap.",
            "The claim packet and ruling hash give the agent a clean evidence trail after settlement.",
        ]
    )
    return result


def run_arbiter_replacement_path(
    rpc_url: str, registry: str, contract: str, packet_dir: Path, trade_id: int
) -> ScenarioResult:
    result = ScenarioResult(
        name="revoked_arbiter_emergency_replacement", trade_id=trade_id, final_state=""
    )

    intent = write_packet(
        packet_dir,
        "replacement_intent",
        {
            "schema": "marketplace.intent.v0.2",
            "intent_id": "intent_replacement_001",
            "buyer": SIGNERS["buyer"]["actor_id"],
            "object": {
                "domain": "tcg",
                "game": "pokemon",
                "card": "mid-value raw card",
                "condition_floor": "LP",
            },
            "cost_field": {
                "max_total_price_eth": "0.60",
                "replacement_arbiter_allowed_if": [
                    "buyer_seller_cosign",
                    "original_revoked_plus_timeout_plus_replacement_arbiter_acceptance",
                ],
            },
        },
        BUYER_KEY,
        BUYER,
    )
    terms = write_packet(
        packet_dir,
        "replacement_escrow_terms",
        {
            "schema": "marketplace.escrow_terms.v0.2",
            "price_eth": "0.60",
            "seller_bond_eth": "0.12",
            "buyer_dispute_bond_eth": "0.02",
            "inspection_seconds": 172800,
            "arbiter": SIGNERS["arbiter"]["actor_id"],
            "replacement_rule": "two_party_approval_or_inactive_arbiter_timeout",
        },
        BUYER_KEY,
        BUYER,
    )
    item_fingerprint = write_packet(
        packet_dir,
        "replacement_item_fingerprint",
        {
            "schema": "marketplace.item_fingerprint.v0.2",
            "trade_id": trade_id,
            "identity_claim": {
                "domain": "tcg",
                "game": "pokemon",
                "card": "mid-value raw card",
                "condition_claim": "LP",
            },
            "evidence_refs": [{"type": "seller_scan", "ref": "seller_scan_hash"}],
            "correlation_method": ["visual_match", "seller_custody_nonce"],
            "confidence_scope": "medium_for_raw_card_identity",
            "privacy_policy": "buyer_and_arbiter",
        },
        SELLER_KEY,
        SELLER,
    )
    inventory_lock = write_packet(
        packet_dir,
        "replacement_inventory_lock",
        {
            "schema": "marketplace.inventory_lock.v0.2",
            "trade_id": trade_id,
            "seller": SIGNERS["seller"]["actor_id"],
            "item_fingerprint_hash": item_fingerprint.payload_hash,
            "inventory_key": "tcg:pokemon:mid-value-raw:replacement-003",
            "item_fingerprint": {
                "game": "pokemon",
                "condition_claim": "LP",
                "visible_identifiers": ["seller_scan_hash"],
            },
            "lock_scope": "single_unique_card",
        },
        SELLER_KEY,
        SELLER,
    )
    item_evidence_manifest = write_evidence_manifest_packet(
        packet_dir,
        "replacement_item_evidence",
        trade_id,
        "seller",
        "item_fingerprint",
        item_fingerprint.payload_hash,
        "standard",
        "manifest_integrity_only",
        [
            {
                "asset_id": "replacement-front-scan",
                "role": "front_photo",
                "filename": "replacement-front-scan.png",
                "data": b"\x89PNG\r\nreplacement-mid-value-raw-front-lp",
            },
            {
                "asset_id": "replacement-back-scan",
                "role": "back_photo",
                "filename": "replacement-back-scan.png",
                "data": b"\x89PNG\r\nreplacement-mid-value-raw-back-lp",
            },
        ],
        known_limits=["Manifest integrity only; route exception claim still requires arbiter review."],
    )
    evidence = item_evidence_manifest.packet
    route = write_packet(
        packet_dir,
        "replacement_route",
        {
            "schema": "marketplace.trade_route.v0.2",
            "trade_id": trade_id,
            "route_type": "insured_shipping",
            "tracking": "SIM-REPLACE-0003",
            "insured": True,
            "declared_insurance_eth": "0.60",
        },
        SELLER_KEY,
        SELLER,
    )
    route_wall_bundle = route_wall_bundle_root(trade_id, route.payload_hash)
    route_assembly_history = route_assembly_history_hash(
        trade_id, route.payload_hash, route_wall_bundle
    )
    route_spendability = write_spendability_packet(
        packet_dir,
        "replacement_route_spendability",
        trade_id,
        item_evidence_manifest.packet.payload_hash,
        item_evidence_manifest.payload["subject"]["subject_hash"],
        "route_commitment",
        f"route_commitment:{trade_id}:replacement-path",
        "identity_support",
        "blocks_or_unblocks_gate",
        requires=["buyer_ack"],
        not_claiming=["authenticity", "condition_floor", "delivery_success"],
        wall_bundle_hash=route_wall_bundle,
        assembly_history_hash=route_assembly_history,
    )
    delivery = write_packet(
        packet_dir,
        "replacement_delivery",
        {
            "schema": "marketplace.delivery_evidence.v0.2",
            "trade_id": trade_id,
            "tracking": "SIM-REPLACE-0003",
            "delivered": True,
            "delivery_signal": "carrier_scan_under_review",
        },
        SELLER_KEY,
        SELLER,
    )
    delivery_spendability = write_spendability_packet(
        packet_dir,
        "replacement_delivery_spendability",
        trade_id,
        delivery.payload_hash,
        route.payload_hash,
        "delivery_confirmation",
        f"delivery_confirmation:{trade_id}:replacement-carrier-scan",
        "delivery_event",
        "opens_inspection",
        signer_role="seller",
        authority_role="seller",
        after_state="RouteLocked",
        after_event_hash=delivery.payload_hash,
        requires=["delivery_event"],
        not_claiming=["card_authenticity", "card_condition", "buyer_satisfaction"],
    )
    claim = write_packet(
        packet_dir,
        "replacement_claim",
        {
            "schema": "marketplace.dispute_case.v0.2",
            "trade_id": trade_id,
            "grounds_type": "route_exception",
            "promised": {"route": "insured_shipping"},
            "happened": {"exception": "carrier scan mismatch needs arbiter"},
            "requested_remedy": "minor_partial_refund",
        },
        BUYER_KEY,
        BUYER,
    )
    replacement_payload = {
        "schema": "marketplace.arbiter_replacement.v0.2",
        "trade_id": trade_id,
        "old_arbiter": SIGNERS["arbiter"]["actor_id"],
        "new_arbiter": SIGNERS["replacement_arbiter"]["actor_id"],
        "reason": "original_arbiter_revoked_before_resolution",
        "approval_rule": "one_party_timeout_requires_new_arbiter_acceptance",
        "timeout_seconds": 86400,
    }
    buyer_replacement_approval = write_packet(
        packet_dir,
        "replacement_buyer_approval",
        replacement_payload,
        BUYER_KEY,
        BUYER,
    )
    replacement_arbiter_acceptance = write_packet(
        packet_dir,
        "replacement_arbiter_acceptance",
        replacement_payload,
        REPLACEMENT_ARBITER_KEY,
        REPLACEMENT_ARBITER,
    )
    ruling = write_packet(
        packet_dir,
        "replacement_ruling",
        {
            "schema": "marketplace.resolve_or_claim.v0.2",
            "trade_id": trade_id,
            "arbiter": SIGNERS["replacement_arbiter"]["actor_id"],
            "finding": "minor_route_exception",
            "buyer_refund_bps": 1000,
            "seller_bond_penalty_bps": 0,
            "dispute_bond_returned_to_buyer": True,
        },
        REPLACEMENT_ARBITER_KEY,
        REPLACEMENT_ARBITER,
    )
    result.packets.extend(
        [
            intent,
            terms,
            item_fingerprint,
            inventory_lock,
            evidence,
            route_spendability.packet,
            route,
            delivery_spendability.packet,
            delivery,
            claim,
            buyer_replacement_approval,
            replacement_arbiter_acceptance,
            ruling,
        ]
    )
    verify_packets(rpc_url, registry, result.packets)

    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            contract,
            "create replacement-path trade",
            "createTrade(address,address,uint256,uint256,uint256,bytes32,bytes32,bytes,bytes)",
            [
                SELLER,
                ARBITER,
                eth("0.12"),
                eth("0.02"),
                "172800",
                intent.payload_hash,
                terms.payload_hash,
                intent.signature,
                terms.signature,
            ],
            value_wei=eth("0.60"),
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "seller posts replacement-path bond",
            "acceptAndBond(uint256)",
            [str(trade_id)],
            value_wei=eth("0.12"),
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "attach replacement-path item evidence",
            "attachEvidence(uint256,uint8,bytes32,bytes)",
            [
                str(trade_id),
                str(EVIDENCE_KIND["item"]),
                evidence.payload_hash,
                evidence.signature,
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "commit replacement-path item fingerprint",
            "commitItemFingerprint(uint256,bytes32,bytes)",
            [str(trade_id), item_fingerprint.payload_hash, item_fingerprint.signature],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "commit replacement-path inventory lock",
            "commitInventoryLock(uint256,bytes32,bytes32,bytes)",
            [
                str(trade_id),
                inventory_lock.payload_hash,
                item_fingerprint.payload_hash,
                sign_inventory_lock_binding(
                    rpc_url,
                    contract,
                    trade_id,
                    inventory_lock.payload_hash,
                    item_fingerprint.payload_hash,
                    SELLER_KEY,
                ),
            ],
        )
    )
    result.observations.append(
        validate_spendability_gate(
            route_spendability,
            SpendabilityGateContext(
                gate_type="route_commitment",
                gate_id=f"route_commitment:{trade_id}:replacement-path",
                leg="forward",
                state_name="EvidencePending",
                state_hash=spendability_state_hash(trade_id, "EvidencePending"),
                wall_bundle_hash=route_wall_bundle,
                assembly_history_hash=route_assembly_history,
                requirements={"buyer_ack"},
            ),
            consumed=set(),
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "commit replacement-path route",
            "commitRoute(uint256,bytes32,bytes32,bytes32,bytes32,bytes32,bool,bool,uint256,bytes)",
            [
                str(trade_id),
                route.payload_hash,
                route_spendability.packet.payload_hash,
                route_wall_bundle,
                route_assembly_history,
                route_assembly_witness_hash(
                    rpc_url,
                    contract,
                    trade_id,
                    route.payload_hash,
                    route_spendability.packet.payload_hash,
                    route_wall_bundle,
                    route_assembly_history,
                ),
                "false",
                "true",
                eth("0.60"),
                route.signature,
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            SELLER_KEY,
            contract,
            "mark replacement-path delivered",
            "markDelivered(uint256,bytes32,bytes32,bytes32,bytes)",
            [
                str(trade_id),
                delivery.payload_hash,
                delivery_spendability.packet.payload_hash,
                delivery_witness_hash(
                    rpc_url,
                    contract,
                    trade_id,
                    delivery.payload_hash,
                    delivery_spendability.packet.payload_hash,
                ),
                delivery.signature,
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            contract,
            "open replacement-path claim",
            "openClaim(uint256,bytes32,bytes)",
            [str(trade_id), claim.payload_hash, claim.signature],
            value_wei=eth("0.02"),
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            registry,
            "revoke original arbiter",
            "revokeArbiter(address)",
            [ARBITER],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            BUYER_KEY,
            contract,
            "buyer proposes replacement arbiter",
            "approveArbiterReplacement(uint256,address,bytes32,bytes)",
            [
                str(trade_id),
                REPLACEMENT_ARBITER,
                buyer_replacement_approval.payload_hash,
                buyer_replacement_approval.signature,
            ],
        )
    )
    increase_time(rpc_url, 86401)
    result.observations.append("Anvil clock advanced past the 1-day emergency replacement timeout.")
    result.transactions.append(
        send_tx(
            rpc_url,
            REPLACEMENT_ARBITER_KEY,
            contract,
            "replacement arbiter accepts emergency handoff",
            "emergencyReplaceArbiter(uint256,bytes32,bytes)",
            [
                str(trade_id),
                replacement_arbiter_acceptance.payload_hash,
                replacement_arbiter_acceptance.signature,
            ],
        )
    )
    result.transactions.append(
        send_tx(
            rpc_url,
            REPLACEMENT_ARBITER_KEY,
            contract,
            "replacement arbiter resolves claim",
            "resolveClaim(uint256,bytes32,uint16,uint16,bool,bytes)",
            [str(trade_id), ruling.payload_hash, "1000", "0", "true", ruling.signature],
        )
    )
    result.final_state = call_state(rpc_url, contract, trade_id)
    result.observations.extend(
        [
            "The original arbiter can be revoked without letting stale authority resolve.",
            "If the seller does not co-sign, the case still has a liveness path after timeout.",
            "The replacement arbiter must sign the same proposal hash before taking over.",
        ]
    )
    return result


def write_report(
    run_dir: Path,
    registry_setup: RegistrySetup,
    contract: str,
    rpc_url: str,
    scenarios: list[ScenarioResult],
) -> None:
    summary = {
        "run_id": run_dir.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "rpc_url": rpc_url,
        "registry": registry_setup.registry,
        "predicate_verifier": registry_setup.predicate_verifier,
        "contract": contract,
        "registry_setup": {
            "packets": [record.__dict__ for record in registry_setup.packets],
            "transactions": [record.__dict__ for record in registry_setup.transactions],
            "observations": registry_setup.observations,
        },
        "scenarios": [
            {
                "name": scenario.name,
                "trade_id": scenario.trade_id,
                "final_state": scenario.final_state,
                "packets": [record.__dict__ for record in scenario.packets],
                "transactions": [record.__dict__ for record in scenario.transactions],
                "observations": scenario.observations,
            }
            for scenario in scenarios
        ],
    }
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    lines = [
        f"# Local EVM Protocol Probe: {run_dir.name}",
        "",
        f"- RPC: `{rpc_url}`",
        f"- Registry: `{registry_setup.registry}`",
        f"- Predicate verifier: `{registry_setup.predicate_verifier}`",
        f"- Contract: `{contract}`",
        "- Chain: `anvil:31337`",
        "",
        "## Registry Setup",
        "",
        "- Transactions:",
    ]
    for tx in registry_setup.transactions:
        lines.append(f"  - `{tx.label}`: `{tx.tx_hash}`")
    lines.append("- Signed registry packets:")
    for packet in registry_setup.packets:
        verdict = "valid" if packet.signature_valid else "invalid"
        lines.append(
            f"  - `{packet.packet_id}` `{packet.payload_hash}` ({packet.schema}, {verdict} signature)"
        )
    lines.append("- Observations:")
    for observation in registry_setup.observations:
        lines.append(f"  - {observation}")
    lines.extend(
        [
            "",
            "## Scenario Results",
            "",
        ]
    )
    for scenario in scenarios:
        lines.extend(
            [
                f"### {scenario.name}",
                "",
                f"- Trade ID: `{scenario.trade_id}`",
                f"- Final state: `{scenario.final_state}`",
                "- Transactions:",
            ]
        )
        for tx in scenario.transactions:
            lines.append(f"  - `{tx.label}`: `{tx.tx_hash}`")
        lines.append("- Anchored packets:")
        for packet in scenario.packets:
            verdict = "valid" if packet.signature_valid else "invalid"
            lines.append(
                f"  - `{packet.packet_id}` `{packet.payload_hash}` ({packet.schema}, {verdict} signature)"
            )
        lines.append("- Observations:")
        for observation in scenario.observations:
            lines.append(f"  - {observation}")
        lines.append("")

    lines.extend(
        [
            "## What This Proves",
            "",
            "- Off-chain protocol objects can become deterministic hashes that the money rail can enforce.",
            "- Actor packets now carry EIP-191 signatures from registered controller addresses.",
            "- State-moving packet hashes now require on-chain actor signature verification.",
            "- Duplicate packet hashes are rejected per trade, including replayed evidence.",
            "- Item and claim evidence now enter the E2E as EvidenceManifest v0.3 packets with content-hashed assets, subject hashes, and deterministic asset roots.",
            "- Seller-signed ItemFingerprint packets anchor the claimed physical object before inventory can be reserved.",
            "- Verifier-committed fingerprints require buyer approval scoped to the trade.",
            "- Verifier review packets cannot attach as loose evidence; they must enter as buyer-approved scoped attestations.",
            "- Scoped verifier attestations are bound to an anchored subject hash, scope-set hash, and method-id hash.",
            "- Seller-signed InventoryLock packets now use a binding signature over the committed ItemFingerprint hash.",
            "- Active buyer fingerprint challenges block route commitment until the buyer clears them with a signed packet.",
            "- Signed spendability packets are checked off-chain before route commitment, challenge clearance, claim support, and bond action.",
            "- Route commitment now consumes a cited spendability packet hash on-chain before the route can lock.",
            "- Spendability now references EvidenceManifest packet hashes and manifest subject hashes, not legacy loose evidence packet hashes.",
            "- Valid manifests and tier claims do not automatically become spendable; gate permission is a separate packet.",
            "- Verifier and arbiter authority are explicit registry records with metadata hashes.",
            "- Revoked arbiters can be replaced by buyer-seller co-signature or by a timeout-gated emergency handoff.",
            "- PrivatePredicateProof packets can be gated by a registered verifier contract before escrow accepts them.",
            "- CircuitProfile packets reserve real ZK verifier hooks while the alpha uses a local stub.",
            "- A low-friction happy path can close without over-asking for seller attention.",
            "- A risky new-seller path can be made acceptable through bond, packet quality, and explicit gaps.",
            "- Claim resolution can emit a compact on-chain ending while preserving rich off-chain evidence.",
            "",
            "## Still Not Proven",
            "",
            "- DID key rotation and delegated agent signatures are not modeled yet.",
            "- Verifier conflict checks are registered but not independently adjudicated yet.",
            "- ZK proof bytes hit a registered verifier-contract hook, but no production circuit is verified yet.",
            "- Stablecoin/ERC-20 escrow is not modeled yet.",
            "- Multi-agent negotiation is not connected to this runner yet.",
            "- Fingerprint challenges are buyer-gated in this alpha; verifier- or arbiter-opened challenge rails are not modeled yet.",
            "- Semantically different item fingerprints for the same physical card still require verifier scrutiny, richer matching, or issuer attestations.",
            "- EvidenceManifest v0.3 uses the local EVM packet-envelope hash in this harness; no Solidity `evidenceManifestHash` helper exists yet.",
            "- Solidity consumes the route spendability hash, but full EvidenceSpendability schema validation still runs off-chain in this harness.",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the Marketplace protocol against local Anvil.")
    parser.add_argument("--port", type=int, default=18545, help="Anvil port to use")
    parser.add_argument("--keep-anvil", action="store_true", help="Leave Anvil running after the probe")
    args = parser.parse_args()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = RUNS / f"local_evm_protocol_{timestamp}"
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
        wait_for_rpc(rpc_url)
        run(["forge", "build"])
        registry = deploy_registry(rpc_url)
        predicate_verifier = deploy_predicate_verifier(rpc_url)
        registry_setup = setup_registry(rpc_url, registry, predicate_verifier, packet_dir)
        contract = deploy_escrow(rpc_url, registry)
        scenarios = [
            run_happy_path(rpc_url, registry, contract, predicate_verifier, packet_dir, trade_id=1),
            run_claim_path(rpc_url, registry, contract, predicate_verifier, packet_dir, trade_id=2),
            run_arbiter_replacement_path(rpc_url, registry, contract, packet_dir, trade_id=3),
        ]
        write_report(run_dir, registry_setup, contract, rpc_url, scenarios)
        print(f"Wrote {run_dir / 'REPORT.md'}")
        print(f"registry: {registry}")
        print(f"predicate verifier: {predicate_verifier}")
        print(f"escrow:   {contract}")
        for scenario in scenarios:
            print(f"{scenario.name}: trade {scenario.trade_id} -> {scenario.final_state}")
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
        print(f"protocol_e2e failed: {exc}", file=sys.stderr)
        raise
