#!/usr/bin/env python3
"""Validate EvidenceManifest v0.2 packets and run byte/URL switch falsifiers.

This is intentionally off-chain. It proves evidence bytes and manifests can be
validated before the protocol considers any Solidity helper for
evidenceManifestHash anchoring.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
CHAIN = ROOT / "chain"
RUNS = ROOT / "runs"

CANONICALIZATION = "marketplace-json-c14n-v0.2"
MANIFEST_SCHEMA = "marketplace.evidence_manifest.v0.2"
ASSET_SCHEMA = "marketplace.asset_descriptor.v0.2"
SUBJECT_SCHEMA = "marketplace.subject_hash.v0.2"
HASH_ALGORITHM = "sha256(marketplace-json-c14n-v0.2)"
EMPTY_ASSET_ROOT = hashlib.sha256(b"marketplace.asset_root.empty.v0.2").hexdigest()

ALLOWED_TIERS = {"sparse", "standard", "challenge_bound", "verified", "claim_grade"}
ALLOWED_SUBJECT_TYPES = {
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
ALLOWED_ROLES = {
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
ALLOWED_MEDIA_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/json",
    "text/html",
    "video/mp4",
    "text/plain",
    "application/octet-stream",
    "other",
}
ALLOWED_VISIBILITY = {
    "public",
    "buyer_only",
    "buyer_arbiter",
    "arbiter_only",
    "encrypted_commitment",
    "private_unreleased",
}
ALLOWED_ORIGINS = {
    "carrier",
    "marketplace",
    "shop",
    "seller",
    "buyer",
    "verifier",
    "arbiter",
    "insurer",
    "agent",
    "other",
}
ALLOWED_CAPTURE_MODES = {
    "issuer_signed",
    "agent_captured",
    "manual_upload",
    "screenshot",
    "memo",
    "generated_fixture",
}

ACTOR_ROLES = {
    "did:market:seller:fixture-1": {"seller"},
    "did:market:buyer:fixture-0": {"buyer"},
    "did:market:verifier:fixture-3": {"verifier"},
    "did:market:agent:fixture-5": {"agent"},
}


class ValidationError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(f"{code}: {message}")
        self.code = code
        self.message = message


@dataclass
class ValidationOutcome:
    ok: bool
    code: str = ""
    message: str = ""
    warnings: list[str] = field(default_factory=list)


@dataclass
class DrillCase:
    slug: str
    title: str
    expected: str
    outcome: str
    passed: bool
    error_code: str = ""
    error_message: str = ""
    observations: list[str] = field(default_factory=list)


def env_with_foundry() -> dict[str, str]:
    env = os.environ.copy()
    foundry_bin = str(Path.home() / ".foundry" / "bin")
    env["PATH"] = f"{foundry_bin}:{env.get('PATH', '')}"
    return env


ENV = env_with_foundry()


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def keccak_bytes(data: bytes) -> str:
    completed = subprocess.run(
        ["cast", "keccak", "0x" + data.hex()],
        cwd=CHAIN,
        env=ENV,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if completed.returncode != 0:
        raise RuntimeError(f"cast keccak failed:\n{completed.stdout}")
    return completed.stdout.strip().lower()


def require(condition: bool, code: str, message: str) -> None:
    if not condition:
        raise ValidationError(code, message)


def is_sha256(value: Any) -> bool:
    return isinstance(value, str) and len(value) == 64 and all(ch in "0123456789abcdef" for ch in value)


def is_keccak(value: Any) -> bool:
    if not isinstance(value, str) or not value.startswith("0x") or len(value) != 66:
        return False
    return all(ch in "0123456789abcdef" for ch in value[2:])


def local_signature(issuer: str, manifest_hash: str) -> str:
    digest = sha256_bytes(f"local-drill-signature-v0:{issuer}:{manifest_hash}".encode("utf-8"))
    return f"local-drill-signature-v0:{digest}"


def subject_hash(subject_type: str, trade_id: str, anchor_hash: str) -> str:
    preimage = {
        "schema": SUBJECT_SCHEMA,
        "subject_type": subject_type,
        "trade_id": str(trade_id),
        "anchor_hash": anchor_hash,
    }
    return sha256_bytes(canonical_bytes(preimage))


def descriptor_leaf(descriptor: dict[str, Any]) -> bytes:
    return hashlib.sha256(b"\x00" + canonical_bytes(descriptor)).digest()


def asset_root_hash(descriptors: list[dict[str, Any]]) -> str:
    if not descriptors:
        return EMPTY_ASSET_ROOT
    leaves = [descriptor_leaf(desc) for desc in sorted(descriptors, key=lambda item: item["asset_id"])]
    level = leaves
    while len(level) > 1:
        if len(level) % 2 == 1:
            level = level + [level[-1]]
        next_level = []
        for index in range(0, len(level), 2):
            next_level.append(hashlib.sha256(b"\x01" + level[index] + level[index + 1]).digest())
        level = next_level
    return level[0].hex()


def manifest_hash(manifest: dict[str, Any]) -> str:
    body = copy.deepcopy(manifest)
    body.pop("manifest_hash", None)
    body.pop("signature", None)
    return sha256_bytes(canonical_bytes(body))


def fetch_ref(ref: dict[str, Any], base_dir: Path, url_catalog: dict[str, bytes]) -> bytes:
    kind = ref.get("kind")
    uri = ref.get("uri")
    if kind == "file":
        path = Path(str(uri))
        if not path.is_absolute():
            path = base_dir / path
        if not path.exists():
            raise ValidationError("ASSET_FETCH", f"file storage ref unavailable: {uri}")
        return path.read_bytes()
    if kind == "mock_url":
        if uri not in url_catalog:
            raise ValidationError("ASSET_FETCH", f"mock URL unavailable: {uri}")
        return url_catalog[str(uri)]
    raise ValidationError("ASSET_FETCH", f"unsupported storage ref kind: {kind}")


def validate_asset_descriptor(
    descriptor: dict[str, Any],
    descriptor_ids: set[str],
    base_dir: Path,
    url_catalog: dict[str, bytes],
) -> list[str]:
    warnings: list[str] = []
    require(descriptor.get("schema") == ASSET_SCHEMA, "SCHEMA", "asset descriptor has wrong schema")
    asset_id = descriptor.get("asset_id")
    require(isinstance(asset_id, str) and asset_id, "ASSET_REQUIRED_FIELD", "asset_id required")
    require(asset_id not in descriptor_ids, "ASSET_REQUIRED_FIELD", f"duplicate asset_id: {asset_id}")
    descriptor_ids.add(asset_id)
    require(descriptor.get("role") in ALLOWED_ROLES, "ASSET_REQUIRED_FIELD", f"unknown role: {descriptor.get('role')}")
    require(
        descriptor.get("media_type") in ALLOWED_MEDIA_TYPES,
        "ASSET_REQUIRED_FIELD",
        f"unknown media_type: {descriptor.get('media_type')}",
    )
    require(
        isinstance(descriptor.get("byte_length"), int) and descriptor["byte_length"] > 0,
        "ASSET_REQUIRED_FIELD",
        "byte_length must be positive integer",
    )
    require(is_sha256(descriptor.get("sha256")), "ASSET_REQUIRED_FIELD", "sha256 must be lowercase 64 hex")
    require(is_keccak(descriptor.get("keccak256")), "ASSET_REQUIRED_FIELD", "keccak256 must be 0x-prefixed 64 hex")
    require(descriptor.get("visibility") in ALLOWED_VISIBILITY, "ASSET_REQUIRED_FIELD", "unknown visibility")
    require(isinstance(descriptor.get("weak_supplemental"), bool), "ASSET_REQUIRED_FIELD", "weak_supplemental must be bool")
    source = descriptor.get("source")
    require(isinstance(source, dict), "ASSET_REQUIRED_FIELD", "source object required")
    require(source.get("origin") in ALLOWED_ORIGINS, "ASSET_REQUIRED_FIELD", "unknown source origin")
    require(source.get("capture_mode") in ALLOWED_CAPTURE_MODES, "ASSET_REQUIRED_FIELD", "unknown capture mode")
    refs = descriptor.get("storage_refs")
    require(isinstance(refs, list) and refs, "ASSET_REQUIRED_FIELD", "storage_refs required")

    for ref in refs:
        require(isinstance(ref, dict), "ASSET_REQUIRED_FIELD", "storage_ref must be object")
        if ref.get("primary") and ref.get("mutable"):
            require(
                bool(descriptor.get("retrieval_snapshot_asset_id")),
                "MUTABLE_PRIMARY",
                f"mutable primary ref needs retrieval_snapshot_asset_id: {asset_id}",
            )
        try:
            data = fetch_ref(ref, base_dir, url_catalog)
        except ValidationError:
            if ref.get("primary"):
                raise
            warnings.append(f"non-primary ref unavailable for {asset_id}: {ref.get('uri')}")
            continue
        require(
            len(data) == descriptor["byte_length"],
            "ASSET_HASH_MISMATCH",
            f"byte_length mismatch for {asset_id}",
        )
        require(sha256_bytes(data) == descriptor["sha256"], "ASSET_HASH_MISMATCH", f"sha256 mismatch for {asset_id}")
        require(
            keccak_bytes(data) == descriptor["keccak256"],
            "ASSET_HASH_MISMATCH",
            f"keccak256 mismatch for {asset_id}",
        )
    return warnings


def validate_subject(subject: dict[str, Any], trade_id: str) -> None:
    require(isinstance(subject, dict), "SUBJECT_HASH", "subject object required")
    subject_type = subject.get("subject_type")
    require(subject_type in ALLOWED_SUBJECT_TYPES, "SUBJECT_HASH", f"unknown subject_type: {subject_type}")
    require(str(subject.get("trade_id")) == str(trade_id), "SUBJECT_HASH", "subject trade_id mismatch")
    anchor_hash = subject.get("anchor_hash")
    require(is_sha256(anchor_hash), "SUBJECT_HASH", "subject anchor_hash must be sha256 hex")
    expected = subject_hash(str(subject_type), str(trade_id), str(anchor_hash))
    require(subject.get("subject_hash") == expected, "SUBJECT_HASH", "subject_hash mismatch")


def validate_role_authority(manifest: dict[str, Any]) -> None:
    issuer = manifest.get("issuer")
    issuer_role = manifest.get("issuer_role")
    roles = ACTOR_ROLES.get(str(issuer), set())
    require(issuer_role in roles, "ROLE_AUTHORITY", f"{issuer} is not authorized as {issuer_role}")


def role_descriptors(manifest: dict[str, Any], role: str) -> list[dict[str, Any]]:
    return [desc for desc in manifest.get("asset_descriptors", []) if desc.get("role") == role]


def require_primary_role(manifest: dict[str, Any], role: str) -> None:
    descriptors = role_descriptors(manifest, role)
    require(descriptors, "TIER_REQUIREMENT", f"{role} required")
    usable = [
        desc
        for desc in descriptors
        if not desc.get("weak_supplemental")
        and any(ref.get("primary") for ref in desc.get("storage_refs", []))
    ]
    require(usable, "TIER_REQUIREMENT", f"{role} must be non-weak primary evidence")


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def validate_tier(manifest: dict[str, Any]) -> None:
    tier = manifest.get("evidence_tier")
    require(tier in ALLOWED_TIERS, "TIER_REQUIREMENT", f"unknown evidence_tier: {tier}")
    if tier in {"standard", "challenge_bound", "verified", "claim_grade"}:
        require_primary_role(manifest, "front_photo")
        require_primary_role(manifest, "back_photo")
    if tier == "challenge_bound":
        session = manifest.get("capture_session")
        require(isinstance(session, dict), "NONCE", "capture_session required")
        require(int(session.get("nonce_entropy_bits", 0)) >= 128, "NONCE", "nonce entropy must be >= 128 bits")
        nonce = session.get("nonce")
        require(isinstance(nonce, str) and len(nonce) >= 22, "NONCE", "high entropy nonce string required")
        issued_at = parse_time(str(session.get("issued_at")))
        expires_at = parse_time(str(session.get("expires_at")))
        for role in ("front_photo", "back_photo"):
            for desc in role_descriptors(manifest, role):
                require(desc.get("challenge_nonce") == nonce, "NONCE", f"{role} missing challenge nonce")
                captured_at = parse_time(str(desc.get("captured_at")))
                require(issued_at <= captured_at <= expires_at, "FRESHNESS", f"{role} captured outside session")
    if tier == "verified":
        require(manifest.get("verifier_attestation_refs"), "TIER_REQUIREMENT", "verified tier requires attestation refs")
    if tier == "claim_grade":
        retention = manifest.get("retention_policy")
        require(isinstance(retention, dict), "TIER_REQUIREMENT", "claim_grade retention_policy required")
        require(
            int(retention.get("minimum_retention_days", 0)) >= 180,
            "TIER_REQUIREMENT",
            "claim_grade retention must be at least 180 days",
        )
        for desc in manifest.get("asset_descriptors", []):
            if desc.get("visibility") in {"encrypted_commitment", "private_unreleased"}:
                encryption = desc.get("encryption") or {}
                require(encryption.get("key_release_condition"), "PRIVATE_REVEAL", "private claim-grade asset lacks reveal path")


def validate_manifest(manifest: dict[str, Any], base_dir: Path, url_catalog: dict[str, bytes]) -> ValidationOutcome:
    warnings: list[str] = []
    try:
        require(manifest.get("schema") == MANIFEST_SCHEMA, "SCHEMA", "manifest has wrong schema")
        require(manifest.get("canonicalization") == CANONICALIZATION, "CANONICALIZATION", "wrong canonicalization")
        require(manifest.get("hash_algorithm") == HASH_ALGORITHM, "CANONICALIZATION", "wrong hash algorithm")
        require(manifest.get("trade_id") is not None, "SCHEMA", "trade_id required")
        require(manifest.get("manifest_id"), "SCHEMA", "manifest_id required")
        require(manifest.get("issuer"), "SCHEMA", "issuer required")
        require(manifest.get("issuer_role"), "SCHEMA", "issuer_role required")
        require(manifest.get("issued_at"), "SCHEMA", "issued_at required")
        parse_time(str(manifest.get("issued_at")))
        validate_role_authority(manifest)
        validate_subject(manifest.get("subject"), str(manifest.get("trade_id")))

        descriptors = manifest.get("asset_descriptors")
        require(isinstance(descriptors, list), "ASSET_REQUIRED_FIELD", "asset_descriptors must be list")
        descriptor_ids: set[str] = set()
        for descriptor in descriptors:
            warnings.extend(validate_asset_descriptor(descriptor, descriptor_ids, base_dir, url_catalog))
        for descriptor in descriptors:
            snapshot_id = descriptor.get("retrieval_snapshot_asset_id")
            if snapshot_id:
                require(snapshot_id in descriptor_ids, "MUTABLE_PRIMARY", f"missing retrieval snapshot: {snapshot_id}")

        require(manifest.get("asset_root_hash") == asset_root_hash(descriptors), "ASSET_ROOT", "asset_root_hash mismatch")
        expected_manifest_hash = manifest_hash(manifest)
        require(manifest.get("manifest_hash") == expected_manifest_hash, "MANIFEST_HASH", "manifest_hash mismatch")
        expected_signature = local_signature(str(manifest.get("issuer")), expected_manifest_hash)
        require(manifest.get("signature") == expected_signature, "SIGNATURE", "signature does not bind manifest_hash")
        validate_tier(manifest)
    except ValidationError as error:
        return ValidationOutcome(ok=False, code=error.code, message=error.message, warnings=warnings)
    return ValidationOutcome(ok=True, warnings=warnings)


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_asset(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def asset_descriptor(
    base_dir: Path,
    asset_id: str,
    role: str,
    media_type: str,
    data: bytes,
    storage_refs: list[dict[str, Any]],
    captured_at: str,
    challenge_nonce: str | None = None,
    retrieval_snapshot_asset_id: str | None = None,
    visibility: str = "public",
    weak_supplemental: bool = False,
    source_origin: str = "seller",
    capture_mode: str = "generated_fixture",
) -> dict[str, Any]:
    descriptor: dict[str, Any] = {
        "schema": ASSET_SCHEMA,
        "asset_id": asset_id,
        "role": role,
        "media_type": media_type,
        "byte_length": len(data),
        "sha256": sha256_bytes(data),
        "keccak256": keccak_bytes(data),
        "storage_refs": storage_refs,
        "visibility": visibility,
        "created_at": captured_at,
        "captured_at": captured_at,
        "source": {"origin": source_origin, "capture_mode": capture_mode},
        "weak_supplemental": weak_supplemental,
    }
    if challenge_nonce:
        descriptor["challenge_nonce"] = challenge_nonce
    if retrieval_snapshot_asset_id:
        descriptor["retrieval_snapshot_asset_id"] = retrieval_snapshot_asset_id
    return descriptor


def finalize_manifest(manifest: dict[str, Any]) -> dict[str, Any]:
    manifest = copy.deepcopy(manifest)
    manifest["asset_root_hash"] = asset_root_hash(manifest["asset_descriptors"])
    digest = manifest_hash(manifest)
    manifest["manifest_hash"] = digest
    manifest["signature"] = local_signature(str(manifest["issuer"]), digest)
    return manifest


def make_subject(trade_id: str, subject_type: str = "item_fingerprint") -> dict[str, Any]:
    anchor = sha256_bytes(f"fixture:{subject_type}:{trade_id}:1999-charizard-front-back".encode("utf-8"))
    return {
        "subject_type": subject_type,
        "trade_id": str(trade_id),
        "anchor_hash": anchor,
        "subject_hash": subject_hash(subject_type, str(trade_id), anchor),
    }


def build_standard_manifest(run_dir: Path, manifest_id: str, trade_id: str = "9001") -> dict[str, Any]:
    assets_dir = run_dir / "assets" / manifest_id
    front_bytes = b"\x89PNG\r\nfixture-front-photo-v1-charizard"
    back_bytes = b"\x89PNG\r\nfixture-back-photo-v1-charizard"
    front_path = assets_dir / "front.png"
    back_path = assets_dir / "back.png"
    write_asset(front_path, front_bytes)
    write_asset(back_path, back_bytes)
    captured_at = "2026-05-19T17:25:37+00:00"
    front = asset_descriptor(
        run_dir,
        "front-photo",
        "front_photo",
        "image/png",
        front_bytes,
        [{"kind": "file", "uri": str(front_path.relative_to(run_dir)), "mutable": False, "primary": True}],
        captured_at,
    )
    back = asset_descriptor(
        run_dir,
        "back-photo",
        "back_photo",
        "image/png",
        back_bytes,
        [{"kind": "file", "uri": str(back_path.relative_to(run_dir)), "mutable": False, "primary": True}],
        captured_at,
    )
    manifest = {
        "schema": MANIFEST_SCHEMA,
        "trade_id": trade_id,
        "manifest_id": manifest_id,
        "issuer": "did:market:seller:fixture-1",
        "issuer_role": "seller",
        "evidence_tier": "standard",
        "subject": make_subject(trade_id),
        "asset_descriptors": [front, back],
        "asset_root_hash": "",
        "issued_at": "2026-05-19T17:25:37+00:00",
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "known_limits": ["fixture bytes are not real card images"],
        "known_conflicts": [],
    }
    return finalize_manifest(manifest)


def build_url_manifest(run_dir: Path, url_catalog: dict[str, bytes]) -> dict[str, Any]:
    assets_dir = run_dir / "assets" / "url_switch"
    front_url = "https://seller.example/evidence/front.png"
    front_bytes = b"\x89PNG\r\nfixture-front-photo-from-url-v1"
    back_bytes = b"\x89PNG\r\nfixture-back-photo-from-file-v1"
    snapshot_bytes = b"retrieval snapshot: https://seller.example/evidence/front.png sha256-bound"
    url_catalog[front_url] = front_bytes
    back_path = assets_dir / "back.png"
    snapshot_path = assets_dir / "front-url-snapshot.txt"
    write_asset(back_path, back_bytes)
    write_asset(snapshot_path, snapshot_bytes)
    captured_at = "2026-05-19T17:25:37+00:00"
    snapshot = asset_descriptor(
        run_dir,
        "front-url-retrieval-snapshot",
        "retrieval_snapshot",
        "text/plain",
        snapshot_bytes,
        [{"kind": "file", "uri": str(snapshot_path.relative_to(run_dir)), "mutable": False, "primary": False}],
        captured_at,
        source_origin="agent",
    )
    front = asset_descriptor(
        run_dir,
        "front-photo-url",
        "front_photo",
        "image/png",
        front_bytes,
        [{"kind": "mock_url", "uri": front_url, "mutable": True, "primary": True}],
        captured_at,
        retrieval_snapshot_asset_id="front-url-retrieval-snapshot",
    )
    back = asset_descriptor(
        run_dir,
        "back-photo-file",
        "back_photo",
        "image/png",
        back_bytes,
        [{"kind": "file", "uri": str(back_path.relative_to(run_dir)), "mutable": False, "primary": True}],
        captured_at,
    )
    manifest = {
        "schema": MANIFEST_SCHEMA,
        "trade_id": "9002",
        "manifest_id": "url-switch",
        "issuer": "did:market:seller:fixture-1",
        "issuer_role": "seller",
        "evidence_tier": "standard",
        "subject": make_subject("9002"),
        "asset_descriptors": [front, back, snapshot],
        "asset_root_hash": "",
        "issued_at": "2026-05-19T17:25:37+00:00",
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "known_limits": ["front asset is intentionally served through a mutable mock URL"],
        "known_conflicts": [],
    }
    return finalize_manifest(manifest)


def expect_validation(
    slug: str,
    title: str,
    expected: str,
    should_pass: bool,
    manifest: dict[str, Any],
    run_dir: Path,
    url_catalog: dict[str, bytes],
    expected_code: str = "",
    observations: list[str] | None = None,
) -> DrillCase:
    outcome = validate_manifest(manifest, run_dir, url_catalog)
    passed = outcome.ok if should_pass else (not outcome.ok and (not expected_code or outcome.code == expected_code))
    return DrillCase(
        slug=slug,
        title=title,
        expected=expected,
        outcome="valid" if outcome.ok else "rejected",
        passed=passed,
        error_code=outcome.code,
        error_message=outcome.message,
        observations=(observations or []) + outcome.warnings,
    )


def run_drill(run_dir: Path) -> list[DrillCase]:
    packet_dir = run_dir / "packets"
    url_catalog: dict[str, bytes] = {}
    cases: list[DrillCase] = []

    valid = build_standard_manifest(run_dir, "valid_standard")
    write_json(packet_dir / "valid_standard_manifest.json", valid)
    cases.append(
        expect_validation(
            "valid_standard",
            "Valid standard manifest",
            "validator accepts content-hashed front/back assets",
            True,
            valid,
            run_dir,
            url_catalog,
        )
    )

    byte_switch = build_standard_manifest(run_dir, "byte_switch")
    write_json(packet_dir / "byte_switch_manifest.json", byte_switch)
    pre = validate_manifest(byte_switch, run_dir, url_catalog)
    front_uri = byte_switch["asset_descriptors"][0]["storage_refs"][0]["uri"]
    front_path = run_dir / front_uri
    original = front_path.read_bytes()
    switched = bytearray(original)
    switched[-1] = (switched[-1] + 1) % 256
    write_asset(front_path, bytes(switched))
    cases.append(
        expect_validation(
            "byte_switch",
            "Byte switch after manifest anchor",
            "validator rejects mutated image bytes with same manifest",
            False,
            byte_switch,
            run_dir,
            url_catalog,
            expected_code="ASSET_HASH_MISMATCH",
            observations=[f"pre-switch valid: {pre.ok}", f"mutated file: {front_uri}"],
        )
    )

    url_switch = build_url_manifest(run_dir, url_catalog)
    write_json(packet_dir / "url_switch_manifest.json", url_switch)
    pre_url = validate_manifest(url_switch, run_dir, url_catalog)
    url_catalog["https://seller.example/evidence/front.png"] = b"\x89PNG\r\nattacker-replaced-url-bytes"
    cases.append(
        expect_validation(
            "url_switch",
            "Mutable URL content switch",
            "validator rejects URL bytes that no longer match descriptor hashes",
            False,
            url_switch,
            run_dir,
            url_catalog,
            expected_code="ASSET_HASH_MISMATCH",
            observations=[f"pre-switch valid: {pre_url.ok}", "mock URL catalog now returns different bytes"],
        )
    )

    manifest_mutation = copy.deepcopy(valid)
    manifest_mutation["known_limits"].append("silent post-signature mutation")
    write_json(packet_dir / "manifest_mutation_bad.json", manifest_mutation)
    cases.append(
        expect_validation(
            "manifest_hash_cosmetic",
            "Manifest mutation without rehash",
            "validator rejects changed manifest body with stale manifest_hash",
            False,
            manifest_mutation,
            run_dir,
            url_catalog,
            expected_code="MANIFEST_HASH",
        )
    )

    role_inflation = finalize_manifest({**copy.deepcopy(valid), "issuer_role": "verifier", "manifest_id": "role-inflation"})
    write_json(packet_dir / "role_inflation_bad.json", role_inflation)
    cases.append(
        expect_validation(
            "role_inflation",
            "Seller declares verifier role",
            "validator rejects issuer_role not backed by actor authority",
            False,
            role_inflation,
            run_dir,
            url_catalog,
            expected_code="ROLE_AUTHORITY",
        )
    )

    tier_inflation = finalize_manifest({**copy.deepcopy(valid), "evidence_tier": "verified", "manifest_id": "tier-inflation"})
    write_json(packet_dir / "tier_inflation_bad.json", tier_inflation)
    cases.append(
        expect_validation(
            "tier_inflation",
            "Verified tier without verifier attestation",
            "validator rejects self-declared verified evidence",
            False,
            tier_inflation,
            run_dir,
            url_catalog,
            expected_code="TIER_REQUIREMENT",
        )
    )

    mutable_no_snapshot = build_url_manifest(run_dir, {"https://seller.example/evidence/front.png": b"\x89PNG\r\nfixture-front-photo-from-url-v1"})
    for desc in mutable_no_snapshot["asset_descriptors"]:
        desc.pop("retrieval_snapshot_asset_id", None)
    mutable_no_snapshot = finalize_manifest(mutable_no_snapshot)
    write_json(packet_dir / "mutable_primary_no_snapshot_bad.json", mutable_no_snapshot)
    url_catalog["https://seller.example/evidence/front.png"] = b"\x89PNG\r\nfixture-front-photo-from-url-v1"
    cases.append(
        expect_validation(
            "mutable_primary_no_snapshot",
            "Mutable primary ref without retrieval snapshot",
            "validator rejects mutable primary evidence with no snapshot descriptor link",
            False,
            mutable_no_snapshot,
            run_dir,
            url_catalog,
            expected_code="MUTABLE_PRIMARY",
        )
    )

    return cases


def write_report(run_dir: Path, cases: list[DrillCase]) -> None:
    summary = {
        "run_id": run_dir.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "spec": "marketplace.evidence_manifest.v0.2",
        "canonicalization": CANONICALIZATION,
        "cases": [case.__dict__ for case in cases],
        "passed": all(case.passed for case in cases),
    }
    write_json(run_dir / "summary.json", summary)

    lines = [
        f"# EvidenceManifest Drill: {run_dir.name}",
        "",
        f"- Generated: `{summary['generated_at']}`",
        f"- Spec: `{summary['spec']}`",
        f"- Canonicalization: `{CANONICALIZATION}`",
        f"- Cases: `{len(cases)}`",
        f"- Passed: `{summary['passed']}`",
        "",
        "## Result",
        "",
        "The off-chain validator accepts a clean `EvidenceManifest` with content-hashed front/back assets, then rejects evidence when the underlying bytes or mutable URL contents are switched without a matching manifest update. It also rejects stale manifest hashes, role inflation, self-declared verified tier evidence, and mutable primary evidence without a retrieval snapshot.",
        "",
        "## Falsifier Matrix",
        "",
        "| Case | Expected | Outcome | Passed | Error |",
        "| --- | --- | --- | --- | --- |",
    ]
    for case in cases:
        error = case.error_code or "none"
        lines.append(f"| {case.title} | {case.expected} | `{case.outcome}` | `{case.passed}` | `{error}` |")

    lines.extend(["", "## Case Notes", ""])
    for case in cases:
        lines.extend(
            [
                f"### {case.title}",
                "",
                f"- Slug: `{case.slug}`",
                f"- Outcome: `{case.outcome}`",
                f"- Passed expectation: `{case.passed}`",
                f"- Error code: `{case.error_code or 'none'}`",
                f"- Error message: `{case.error_message or 'none'}`",
            ]
        )
        if case.observations:
            lines.append("- Observations:")
            for observation in case.observations:
                lines.append(f"  - {observation}")
        lines.append("")

    lines.extend(
        [
            "## What This Proves",
            "",
            "- The manifest hash is recomputed from canonical JSON instead of trusted as a field.",
            "- The asset root is recomputed from sorted descriptor leaves.",
            "- Every primary asset's bytes are fetched and rehashed before promotion.",
            "- A changed image file fails even though the manifest is unchanged.",
            "- A changed mutable URL response fails even though the manifest is unchanged.",
            "- `issuer_role` is treated as authority-bound, not self-declared text.",
            "- `evidence_tier` is mechanically checked, not accepted as a seller badge.",
            "",
            "## Still Not Proven",
            "",
            "- The fixture bytes are not real card images.",
            "- The local signature is a deterministic drill stub, not production actor cryptography.",
            "- The validator does not inspect pixels to prove a nonce is visible in a photo.",
            "- The validator does not integrate carrier, marketplace, shop, cert authority, or insurer APIs.",
            "- No Solidity primitive has been added or exercised in this pass.",
            "",
            "## Next Hardening Target",
            "",
            "Promote this validator into the E2E and fingerprint collision runners so photo and claim evidence packets become v0.2 `EvidenceManifest` packets before their hashes are anchored.",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run off-chain EvidenceManifest validator falsifier drill.")
    parser.add_argument("--run-dir", type=Path, help="Optional output directory")
    args = parser.parse_args()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = args.run_dir or (RUNS / f"evidence_manifest_drill_{timestamp}")
    run_dir.mkdir(parents=True, exist_ok=True)
    cases = run_drill(run_dir)
    write_report(run_dir, cases)

    print(f"Wrote {run_dir / 'REPORT.md'}")
    for case in cases:
        print(f"{case.slug}: outcome={case.outcome} passed={case.passed} error={case.error_code or 'none'}")
    if not all(case.passed for case in cases):
        return 1
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
