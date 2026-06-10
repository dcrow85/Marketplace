#!/usr/bin/env python3
"""Run EvidenceSpendability v0.1 gate falsifiers.

The manifest validator proves durable memory. This drill proves durable memory
does not automatically become admissible action at route, settlement, claim,
bond, or reputation gates.
"""

from __future__ import annotations

import argparse
import copy
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import evidence_manifest_drill as manifest_layer


RUNS = manifest_layer.RUNS
CANONICALIZATION = manifest_layer.CANONICALIZATION
HASH_ALGORITHM = manifest_layer.HASH_ALGORITHM
SPENDABILITY_SCHEMA = "marketplace.evidence_spendability.v0.1"
REVOCATION_SCHEMA = "marketplace.evidence_spendability_revocation.v0.1"

BUYER_AGENT = "did:market:buyer-agent:fixture-5"
ARBITER = "did:market:arbiter:fixture-2"
PROTOCOL = "did:market:protocol:fixture"

ACTOR_ROLES = {
    BUYER_AGENT: {"buyer_agent", "agent"},
    ARBITER: {"arbiter"},
    PROTOCOL: {"protocol"},
}

GATE_POLICIES = {
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
    "settlement_release": {
        "leg": "forward",
        "consumption": "single_use",
        "allowed_authority": {"buyer_agent", "human", "protocol"},
        "allowed_claims": {"identity_support", "condition_support", "route_support"},
        "allowed_spend_limits": {"moves_funds"},
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
    "reputation_update": {
        "leg": "post_settlement",
        "consumption": "append_only_weight",
        "allowed_authority": {"arbiter", "protocol"},
        "allowed_claims": {"reputation_support", "route_support", "condition_support"},
        "allowed_spend_limits": {"updates_reputation"},
    },
    "insurance_claim": {
        "leg": "return",
        "consumption": "append_only_weight",
        "allowed_authority": {"buyer_agent", "insurer", "protocol"},
        "allowed_claims": {"insurance_support", "route_support", "condition_support"},
        "allowed_spend_limits": {"assembles_claim_packet"},
    },
}

ALLOWED_CLAIM_TYPES = {
    "identity_support",
    "custody_support",
    "condition_support",
    "route_support",
    "insurance_support",
    "contradiction_support",
    "reputation_support",
    "authenticity_support",
    "packet_completeness",
}
ALLOWED_SUPPORT_LEVELS = {"weak", "standard", "strong", "decisive"}
ALLOWED_SPEND_LIMITS = {
    "advisory",
    "blocks_or_unblocks_gate",
    "moves_funds",
    "updates_reputation",
    "assembles_claim_packet",
}
ALLOWED_REQUIREMENTS = {
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


class SpendabilityError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(f"{code}: {message}")
        self.code = code
        self.message = message


@dataclass
class GateContext:
    gate_type: str
    gate_id: str
    leg: str
    state_name: str
    state_hash: str
    event_hashes: set[str] = field(default_factory=set)
    waivers: set[str] = field(default_factory=set)
    requirements: set[str] = field(default_factory=set)


@dataclass
class SpendabilityOutcome:
    ok: bool
    code: str = ""
    message: str = ""


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


def require(condition: bool, code: str, message: str) -> None:
    if not condition:
        raise SpendabilityError(code, message)


def state_hash(trade_id: str, state_name: str, marker: str = "") -> str:
    return manifest_layer.sha256_bytes(f"state:{trade_id}:{state_name}:{marker}".encode("utf-8"))


def event_hash(trade_id: str, event_name: str, marker: str = "") -> str:
    return manifest_layer.sha256_bytes(f"event:{trade_id}:{event_name}:{marker}".encode("utf-8"))


def actor_has_role(actor_id: str, role: str) -> bool:
    return role in ACTOR_ROLES.get(actor_id, set())


def spendability_hash(packet: dict[str, Any]) -> str:
    body = copy.deepcopy(packet)
    body.pop("spendability_hash", None)
    body.pop("signature", None)
    return manifest_layer.sha256_bytes(manifest_layer.canonical_bytes(body))


def revocation_hash(packet: dict[str, Any]) -> str:
    body = copy.deepcopy(packet)
    body.pop("revocation_hash", None)
    body.pop("signature", None)
    return manifest_layer.sha256_bytes(manifest_layer.canonical_bytes(body))


def local_signature(kind: str, issuer: str, digest: str) -> str:
    signed = manifest_layer.sha256_bytes(f"local-{kind}-signature-v0:{issuer}:{digest}".encode("utf-8"))
    return f"local-{kind}-signature-v0:{signed}"


def finalize_spendability(packet: dict[str, Any]) -> dict[str, Any]:
    packet = copy.deepcopy(packet)
    digest = spendability_hash(packet)
    packet["spendability_hash"] = digest
    packet["signature"] = local_signature("spendability", str(packet["issued_by"]), digest)
    return packet


def finalize_revocation(packet: dict[str, Any]) -> dict[str, Any]:
    packet = copy.deepcopy(packet)
    digest = revocation_hash(packet)
    packet["revocation_hash"] = digest
    packet["signature"] = local_signature("spendability-revocation", str(packet["issued_by"]), digest)
    return packet


def build_spendability(
    manifest: dict[str, Any],
    gate_type: str,
    claim_type: str,
    spend_limit: str,
    *,
    issued_by: str = BUYER_AGENT,
    issued_role: str = "buyer_agent",
    authority_role: str = "buyer_agent",
    authority_source: str = "delegation",
    gate_id: str | None = None,
    leg: str | None = None,
    consumption: str | None = None,
    after_state_name: str = "EvidencePending",
    after_state_hash: str | None = None,
    after_event_hash: str | None = None,
    until_state_name: str | None = None,
    until_state_hash: str | None = None,
    waiver_policy: str = "none",
    requires: list[str] | None = None,
    support_level: str = "standard",
    not_claiming: list[str] | None = None,
) -> dict[str, Any]:
    trade_id = str(manifest["trade_id"])
    policy = GATE_POLICIES[gate_type]
    gate = {
        "gate_type": gate_type,
        "gate_id": gate_id or f"{gate_type}:{trade_id}:attempt-1",
        "leg": leg or str(policy["leg"]),
        "consumption": consumption or str(policy["consumption"]),
    }
    window: dict[str, Any] = {
        "after_state": {
            "state_name": after_state_name,
            "state_hash": after_state_hash or state_hash(trade_id, after_state_name),
        },
        "waiver_policy": waiver_policy,
    }
    if after_event_hash:
        window["after_event_hash"] = after_event_hash
    if until_state_name:
        window["until_state"] = {
            "state_name": until_state_name,
            "state_hash": until_state_hash or state_hash(trade_id, until_state_name),
        }
    packet = {
        "schema": SPENDABILITY_SCHEMA,
        "trade_id": trade_id,
        "spendability_id": f"{gate_type}:{claim_type}:{trade_id}",
        "manifest_hash": manifest["manifest_hash"],
        "manifest_subject_hash": manifest["subject"]["subject_hash"],
        "issued_by": issued_by,
        "issued_role": issued_role,
        "gate": gate,
        "spendable_claims": [
            {
                "claim_type": claim_type,
                "support_level": support_level,
                "spend_limit": spend_limit,
                "not_claiming": not_claiming or ["authenticity", "condition_floor"],
                "basis": ["asset_hash_match", "issuer_role"],
            }
        ],
        "window": window,
        "requires": requires or ["buyer_ack"],
        "decision_authority": {
            "actor_role": authority_role,
            "actor_id": issued_by,
            "authority_source": authority_source,
            "authority_hash": manifest_layer.sha256_bytes(f"authority:{issued_by}:{authority_role}".encode("utf-8")),
        },
        "status": "active",
        "issued_at": "2026-05-19T17:42:21+00:00",
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
    }
    return finalize_spendability(packet)


def build_revocation(spendability: dict[str, Any], issued_by: str = ARBITER, issued_role: str = "arbiter") -> dict[str, Any]:
    packet = {
        "schema": REVOCATION_SCHEMA,
        "trade_id": spendability["trade_id"],
        "spendability_hash": spendability["spendability_hash"],
        "reason": "arbiter_ruling",
        "issued_by": issued_by,
        "issued_role": issued_role,
        "issued_at": "2026-05-19T17:42:21+00:00",
        "canonicalization": CANONICALIZATION,
    }
    return finalize_revocation(packet)


def validate_manifest_memory(manifest: dict[str, Any], run_dir: Path) -> None:
    outcome = manifest_layer.validate_manifest(manifest, run_dir, {})
    require(outcome.ok, outcome.code or "MANIFEST_INVALID", outcome.message or "manifest validation failed")


def validate_spendability_packet(spendability: dict[str, Any], manifest: dict[str, Any]) -> None:
    require(spendability.get("schema") == SPENDABILITY_SCHEMA, "SPENDABILITY_SCHEMA", "wrong spendability schema")
    require(spendability.get("canonicalization") == CANONICALIZATION, "SPENDABILITY_SCHEMA", "wrong canonicalization")
    require(spendability.get("hash_algorithm") == HASH_ALGORITHM, "SPENDABILITY_SCHEMA", "wrong hash algorithm")
    require(str(spendability.get("trade_id")) == str(manifest["trade_id"]), "SPENDABILITY_SCHEMA", "trade_id mismatch")
    require(spendability.get("manifest_hash") == manifest["manifest_hash"], "SPENDABILITY_HASH", "manifest hash mismatch")
    require(
        spendability.get("manifest_subject_hash") == manifest["subject"]["subject_hash"],
        "SPENDABILITY_HASH",
        "manifest subject hash mismatch",
    )
    require(
        spendability.get("spendability_hash") == spendability_hash(spendability),
        "SPENDABILITY_HASH",
        "spendability hash mismatch",
    )
    require(
        spendability.get("signature") == local_signature("spendability", str(spendability["issued_by"]), str(spendability["spendability_hash"])),
        "SPENDABILITY_SIGNATURE",
        "signature does not bind spendability hash",
    )
    require(spendability.get("status") == "active", "SPENDABILITY_STATUS", "spendability is not active")
    require(actor_has_role(str(spendability.get("issued_by")), str(spendability.get("issued_role"))), "GATE_AUTHORITY", "issuer role not authorized")


def validate_revocation(revocation: dict[str, Any], spendability: dict[str, Any]) -> None:
    require(revocation.get("schema") == REVOCATION_SCHEMA, "SPENDABILITY_REVOKED", "wrong revocation schema")
    require(revocation.get("spendability_hash") == spendability.get("spendability_hash"), "SPENDABILITY_REVOKED", "revocation target mismatch")
    require(revocation.get("revocation_hash") == revocation_hash(revocation), "SPENDABILITY_REVOKED", "revocation hash mismatch")
    require(
        revocation.get("signature") == local_signature(
            "spendability-revocation", str(revocation["issued_by"]), str(revocation["revocation_hash"])
        ),
        "SPENDABILITY_REVOKED",
        "revocation signature mismatch",
    )
    require(actor_has_role(str(revocation.get("issued_by")), str(revocation.get("issued_role"))), "SPENDABILITY_REVOKED", "revoker role not authorized")


def validate_gate_invocation(
    manifest: dict[str, Any],
    spendability: dict[str, Any] | None,
    context: GateContext,
    run_dir: Path,
    consumed: set[str],
    revocations: list[dict[str, Any]] | None = None,
) -> SpendabilityOutcome:
    try:
        validate_manifest_memory(manifest, run_dir)
        if spendability is None:
            raise SpendabilityError("TIER_NOT_PERMISSION", "manifest tier is not spendability")
        validate_spendability_packet(spendability, manifest)
        for revocation in revocations or []:
            validate_revocation(revocation, spendability)
            raise SpendabilityError("SPENDABILITY_REVOKED", "spendability has active revocation")

        gate = spendability.get("gate", {})
        gate_type = gate.get("gate_type")
        policy = GATE_POLICIES.get(str(gate_type))
        require(policy is not None, "GATE_TYPE", f"unknown gate_type: {gate_type}")
        require(gate_type == context.gate_type, "GATE_TYPE", f"wrong gate: {gate_type} for {context.gate_type}")
        require(gate.get("gate_id") == context.gate_id, "GATE_TYPE", "gate_id mismatch")
        require(gate.get("leg") == context.leg, "GATE_LEG", "gate leg mismatch")
        require(gate.get("leg") == policy["leg"], "GATE_LEG", "gate leg violates policy")
        require(gate.get("consumption") == policy["consumption"], "SPENDABILITY_CONSUMED", "consumption mode violates policy")
        if gate.get("consumption") == "single_use":
            require(spendability["spendability_hash"] not in consumed, "SPENDABILITY_CONSUMED", "single-use spendability already consumed")

        window = spendability.get("window", {})
        after_state = window.get("after_state", {})
        require(after_state.get("state_name") == context.state_name, "GATE_WINDOW", "after_state name mismatch")
        require(after_state.get("state_hash") == context.state_hash, "GATE_WINDOW", "after_state hash mismatch")
        after_event = window.get("after_event_hash")
        if after_event:
            require(after_event in context.event_hashes, "GATE_WINDOW", "after_event_hash not present in gate context")
        until_state = window.get("until_state")
        if until_state:
            require(until_state.get("state_name") != context.state_name, "GATE_WINDOW", "until_state already reached")

        waiver_policy = window.get("waiver_policy", "none")
        if "human_waiver" in spendability.get("requires", []) and waiver_policy == "none":
            raise SpendabilityError("GATE_WINDOW", "waiver required but waiver path is not named")

        requirements = set(spendability.get("requires", []))
        unknown_requirements = requirements - ALLOWED_REQUIREMENTS
        require(not unknown_requirements, "GATE_REQUIREMENT", f"unknown requirements: {sorted(unknown_requirements)}")
        missing = requirements - context.requirements - context.waivers
        require(not missing, "GATE_REQUIREMENT", f"missing requirements: {sorted(missing)}")

        authority = spendability.get("decision_authority", {})
        actor_role = authority.get("actor_role")
        require(actor_role in policy["allowed_authority"], "GATE_AUTHORITY", f"{actor_role} cannot decide {gate_type}")
        actor_id = str(authority.get("actor_id"))
        require(actor_has_role(actor_id, str(actor_role)), "GATE_AUTHORITY", f"{actor_id} lacks {actor_role}")

        claims = spendability.get("spendable_claims")
        require(isinstance(claims, list) and claims, "CLAIM_TYPE", "spendable_claims required")
        for claim in claims:
            claim_type = claim.get("claim_type")
            support_level = claim.get("support_level")
            spend_limit = claim.get("spend_limit")
            require(claim_type in ALLOWED_CLAIM_TYPES, "CLAIM_TYPE", f"unknown claim_type: {claim_type}")
            require(support_level in ALLOWED_SUPPORT_LEVELS, "CLAIM_TYPE", f"unknown support_level: {support_level}")
            require(spend_limit in ALLOWED_SPEND_LIMITS, "CLAIM_TYPE", f"unknown spend_limit: {spend_limit}")
            require(claim_type in policy["allowed_claims"], "CLAIM_SCOPE", f"{claim_type} cannot spend at {gate_type}")
            require(spend_limit in policy["allowed_spend_limits"], "CLAIM_SCOPE", f"{spend_limit} cannot spend at {gate_type}")
            require(context.gate_type not in set(claim.get("not_claiming", [])), "CLAIM_SCOPE", "non-claim conflicts with gate")

        if gate.get("consumption") == "single_use":
            consumed.add(spendability["spendability_hash"])
    except SpendabilityError as error:
        return SpendabilityOutcome(ok=False, code=error.code, message=error.message)
    return SpendabilityOutcome(ok=True)


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def expect_gate(
    slug: str,
    title: str,
    expected: str,
    should_pass: bool,
    manifest: dict[str, Any],
    spendability: dict[str, Any] | None,
    context: GateContext,
    run_dir: Path,
    consumed: set[str],
    expected_code: str = "",
    revocations: list[dict[str, Any]] | None = None,
    observations: list[str] | None = None,
) -> DrillCase:
    outcome = validate_gate_invocation(manifest, spendability, context, run_dir, consumed, revocations=revocations)
    passed = outcome.ok if should_pass else (not outcome.ok and (not expected_code or outcome.code == expected_code))
    return DrillCase(
        slug=slug,
        title=title,
        expected=expected,
        outcome="spendable" if outcome.ok else "not_spendable",
        passed=passed,
        error_code=outcome.code,
        error_message=outcome.message,
        observations=observations or [],
    )


def run_drill(run_dir: Path) -> list[DrillCase]:
    packet_dir = run_dir / "packets"
    cases: list[DrillCase] = []

    route_manifest = manifest_layer.build_standard_manifest(run_dir, "spendability_route_manifest", trade_id="9101")
    write_json(packet_dir / "route_manifest.json", route_manifest)
    route_context = GateContext(
        gate_type="route_commitment",
        gate_id="route_commitment:9101:attempt-1",
        leg="forward",
        state_name="EvidencePending",
        state_hash=state_hash("9101", "EvidencePending"),
        requirements={"buyer_ack"},
    )
    consumed: set[str] = set()
    cases.append(
        expect_gate(
            "tier_without_spendability",
            "Manifest tier cannot buy route",
            "standard manifest exists but route gate rejects without spendability",
            False,
            route_manifest,
            None,
            route_context,
            run_dir,
            consumed,
            expected_code="TIER_NOT_PERMISSION",
        )
    )

    route_spendability = build_spendability(
        route_manifest,
        "route_commitment",
        "identity_support",
        "blocks_or_unblocks_gate",
    )
    write_json(packet_dir / "route_spendability.json", route_spendability)
    consumed = set()
    cases.append(
        expect_gate(
            "route_spendability_accepts",
            "Route spendability accepts",
            "route gate accepts valid spendability packet",
            True,
            route_manifest,
            route_spendability,
            route_context,
            run_dir,
            consumed,
        )
    )

    settlement_manifest = manifest_layer.build_standard_manifest(run_dir, "settlement_manifest", trade_id="9102")
    write_json(packet_dir / "settlement_manifest.json", settlement_manifest)
    challenge_event = event_hash("9102", "challenge_clearance_passed")
    settlement_spendability = build_spendability(
        settlement_manifest,
        "settlement_release",
        "route_support",
        "moves_funds",
        gate_id="settlement_release:9102:attempt-1",
        issued_by=BUYER_AGENT,
        issued_role="buyer_agent",
        authority_role="buyer_agent",
        after_state_name="InspectionOpen",
        after_state_hash=state_hash("9102", "InspectionOpen"),
        after_event_hash=challenge_event,
        requires=["buyer_ack", "human_waiver"],
        waiver_policy="none",
        not_claiming=["authenticity"],
    )
    write_json(packet_dir / "settlement_after_skipped_challenge_spendability.json", settlement_spendability)
    settlement_context = GateContext(
        gate_type="settlement_release",
        gate_id="settlement_release:9102:attempt-1",
        leg="forward",
        state_name="InspectionOpen",
        state_hash=state_hash("9102", "InspectionOpen"),
        event_hashes=set(),
        waivers={"human_waiver"},
        requirements={"buyer_ack"},
    )
    cases.append(
        expect_gate(
            "settlement_after_skipped_challenge",
            "Settlement after skipped challenge",
            "settlement rejects when challenge-clearance event is skipped and waiver path is not named",
            False,
            settlement_manifest,
            settlement_spendability,
            settlement_context,
            run_dir,
            set(),
            expected_code="GATE_WINDOW",
            observations=["human waiver exists, but spendability did not name a waiver path and required challenge event is absent"],
        )
    )

    old_manifest = manifest_layer.build_standard_manifest(run_dir, "old_listing_manifest", trade_id="9103")
    old_manifest["known_limits"] = ["old marketplace photo; no current custody"]
    old_manifest = manifest_layer.finalize_manifest(old_manifest)
    write_json(packet_dir / "old_listing_manifest.json", old_manifest)
    old_route_spendability = build_spendability(
        old_manifest,
        "route_commitment",
        "contradiction_support",
        "advisory",
        gate_id="route_commitment:9103:attempt-1",
        not_claiming=["current_custody", "authenticity"],
    )
    write_json(packet_dir / "old_listing_route_spendability_bad.json", old_route_spendability)
    old_route_context = GateContext(
        gate_type="route_commitment",
        gate_id="route_commitment:9103:attempt-1",
        leg="forward",
        state_name="EvidencePending",
        state_hash=state_hash("9103", "EvidencePending"),
        requirements={"buyer_ack"},
    )
    cases.append(
        expect_gate(
            "old_photo_route_rejects",
            "Old photo cannot spend forward",
            "route gate rejects contradiction-only old listing evidence",
            False,
            old_manifest,
            old_route_spendability,
            old_route_context,
            run_dir,
            set(),
            expected_code="CLAIM_SCOPE",
        )
    )
    old_claim_spendability = build_spendability(
        old_manifest,
        "claim_support",
        "contradiction_support",
        "assembles_claim_packet",
        gate_id="claim_support:9103:claim-1",
        authority_role="buyer_agent",
        after_state_name="ClaimOrDisputePending",
        after_state_hash=state_hash("9103", "ClaimOrDisputePending"),
        requires=["buyer_ack", "claim_opened"],
        not_claiming=["current_custody", "authenticity"],
    )
    write_json(packet_dir / "old_listing_claim_spendability.json", old_claim_spendability)
    old_claim_context = GateContext(
        gate_type="claim_support",
        gate_id="claim_support:9103:claim-1",
        leg="return",
        state_name="ClaimOrDisputePending",
        state_hash=state_hash("9103", "ClaimOrDisputePending"),
        requirements={"buyer_ack", "claim_opened"},
    )
    cases.append(
        expect_gate(
            "old_photo_claim_spends",
            "Old photo spends on return leg",
            "same manifest can support contradiction in a claim packet",
            True,
            old_manifest,
            old_claim_spendability,
            old_claim_context,
            run_dir,
            set(),
            observations=["same durable memory rejected at forward route gate and accepted at return claim gate"],
        )
    )

    bond_manifest = manifest_layer.build_standard_manifest(run_dir, "bond_manifest", trade_id="9104")
    write_json(packet_dir / "bond_manifest.json", bond_manifest)
    wrong_actor_spendability = build_spendability(
        bond_manifest,
        "bond_action",
        "route_support",
        "moves_funds",
        gate_id="bond_action:9104:claim-1",
        issued_by=BUYER_AGENT,
        issued_role="buyer_agent",
        authority_role="buyer_agent",
        after_state_name="ClaimOrDisputePending",
        after_state_hash=state_hash("9104", "ClaimOrDisputePending"),
        requires=["buyer_ack", "claim_opened"],
    )
    write_json(packet_dir / "wrong_actor_bond_spendability_bad.json", wrong_actor_spendability)
    bond_context = GateContext(
        gate_type="bond_action",
        gate_id="bond_action:9104:claim-1",
        leg="return",
        state_name="ClaimOrDisputePending",
        state_hash=state_hash("9104", "ClaimOrDisputePending"),
        requirements={"buyer_ack", "claim_opened"},
    )
    cases.append(
        expect_gate(
            "wrong_actor_gate",
            "Wrong actor cannot move bond",
            "buyer agent cannot authorize arbiter-only bond action",
            False,
            bond_manifest,
            wrong_actor_spendability,
            bond_context,
            run_dir,
            set(),
            expected_code="GATE_AUTHORITY",
        )
    )

    revoked_manifest = manifest_layer.build_standard_manifest(run_dir, "revoked_manifest", trade_id="9105")
    write_json(packet_dir / "revoked_manifest.json", revoked_manifest)
    revoked_spendability = build_spendability(
        revoked_manifest,
        "claim_support",
        "contradiction_support",
        "assembles_claim_packet",
        gate_id="claim_support:9105:claim-1",
        after_state_name="ClaimOrDisputePending",
        after_state_hash=state_hash("9105", "ClaimOrDisputePending"),
        requires=["buyer_ack", "claim_opened"],
    )
    revocation = build_revocation(revoked_spendability)
    write_json(packet_dir / "revoked_claim_spendability.json", revoked_spendability)
    write_json(packet_dir / "revoked_claim_spendability_revocation.json", revocation)
    revoked_context = GateContext(
        gate_type="claim_support",
        gate_id="claim_support:9105:claim-1",
        leg="return",
        state_name="ClaimOrDisputePending",
        state_hash=state_hash("9105", "ClaimOrDisputePending"),
        requirements={"buyer_ack", "claim_opened"},
    )
    cases.append(
        expect_gate(
            "revoked_spendability",
            "Revoked spendability cannot spend",
            "manifest remains valid but tombstoned spendability rejects at gate",
            False,
            revoked_manifest,
            revoked_spendability,
            revoked_context,
            run_dir,
            set(),
            expected_code="SPENDABILITY_REVOKED",
            revocations=[revocation],
        )
    )

    single_manifest = manifest_layer.build_standard_manifest(run_dir, "single_use_manifest", trade_id="9106")
    single_spendability = build_spendability(
        single_manifest,
        "route_commitment",
        "identity_support",
        "blocks_or_unblocks_gate",
        gate_id="route_commitment:9106:attempt-1",
    )
    write_json(packet_dir / "single_use_manifest.json", single_manifest)
    write_json(packet_dir / "single_use_spendability.json", single_spendability)
    single_context = GateContext(
        gate_type="route_commitment",
        gate_id="route_commitment:9106:attempt-1",
        leg="forward",
        state_name="EvidencePending",
        state_hash=state_hash("9106", "EvidencePending"),
        requirements={"buyer_ack"},
    )
    consumed_once: set[str] = set()
    first = validate_gate_invocation(single_manifest, single_spendability, single_context, run_dir, consumed_once)
    second = validate_gate_invocation(single_manifest, single_spendability, single_context, run_dir, consumed_once)
    cases.append(
        DrillCase(
            slug="single_use_consumed",
            title="Single-use spendability cannot double spend",
            expected="first route spend succeeds; second route spend rejects",
            outcome="first_spendable_second_not_spendable",
            passed=first.ok and not second.ok and second.code == "SPENDABILITY_CONSUMED",
            error_code=second.code,
            error_message=second.message,
            observations=[f"first invocation ok: {first.ok}", f"second invocation code: {second.code}"],
        )
    )

    reusable_manifest = manifest_layer.build_standard_manifest(run_dir, "append_only_manifest", trade_id="9107")
    reusable_spendability = build_spendability(
        reusable_manifest,
        "claim_support",
        "contradiction_support",
        "assembles_claim_packet",
        gate_id="claim_support:9107:claim-1",
        after_state_name="ClaimOrDisputePending",
        after_state_hash=state_hash("9107", "ClaimOrDisputePending"),
        requires=["buyer_ack", "claim_opened"],
    )
    write_json(packet_dir / "append_only_manifest.json", reusable_manifest)
    write_json(packet_dir / "append_only_spendability.json", reusable_spendability)
    reusable_context = GateContext(
        gate_type="claim_support",
        gate_id="claim_support:9107:claim-1",
        leg="return",
        state_name="ClaimOrDisputePending",
        state_hash=state_hash("9107", "ClaimOrDisputePending"),
        requirements={"buyer_ack", "claim_opened"},
    )
    append_consumed: set[str] = set()
    first_append = validate_gate_invocation(reusable_manifest, reusable_spendability, reusable_context, run_dir, append_consumed)
    second_append = validate_gate_invocation(reusable_manifest, reusable_spendability, reusable_context, run_dir, append_consumed)
    cases.append(
        DrillCase(
            slug="append_only_weight_reusable",
            title="Append-only claim weight can be reused",
            expected="claim-support spendability can assemble multiple packets without funds-moving double spend",
            outcome="both_spendable" if first_append.ok and second_append.ok else "unexpected_reject",
            passed=first_append.ok and second_append.ok,
            error_code=second_append.code,
            error_message=second_append.message,
            observations=[f"first invocation ok: {first_append.ok}", f"second invocation ok: {second_append.ok}"],
        )
    )

    return cases


def write_report(run_dir: Path, cases: list[DrillCase]) -> None:
    summary = {
        "run_id": run_dir.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "spec": "marketplace.evidence_spendability.v0.1",
        "cases": [case.__dict__ for case in cases],
        "passed": all(case.passed for case in cases),
    }
    write_json(run_dir / "summary.json", summary)

    lines = [
        f"# EvidenceSpendability Drill: {run_dir.name}",
        "",
        f"- Generated: `{summary['generated_at']}`",
        f"- Spec: `{summary['spec']}`",
        f"- Cases: `{len(cases)}`",
        f"- Passed: `{summary['passed']}`",
        "",
        "## Result",
        "",
        "The spendability gate rejects valid durable evidence when it lacks local permission, accepts it at the correct gate, rejects skipped-state shortcuts, distinguishes forward and return legs, blocks wrong-authority spends, honors revocation, prevents single-use double spend, and allows append-only claim weight to be reused.",
        "",
        "## Falsifier Matrix",
        "",
        "| Case | Expected | Outcome | Passed | Error |",
        "| --- | --- | --- | --- | --- |",
    ]
    for case in cases:
        lines.append(
            f"| {case.title} | {case.expected} | `{case.outcome}` | `{case.passed}` | `{case.error_code or 'none'}` |"
        )

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
            "- Valid manifest memory is not permission.",
            "- `evidence_tier` does not buy route commitment by itself.",
            "- Spendability is local to a gate, leg, window, claim scope, and authority source.",
            "- The same manifest can be unspendable on the forward leg and spendable on the return leg.",
            "- Revocation tombstones permission without deleting the evidence manifest.",
            "- Single-use spendability cannot be reused as a funds-moving double spend.",
            "- Append-only claim support can be reused as weight without becoming a double spend.",
            "",
            "## Still Not Proven",
            "",
            "- This is an off-chain deterministic drill, not an EVM gate.",
            "- The manifest builder still uses v0.2 fixture evidence.",
            "- Local signatures are deterministic drill stubs, not production actor signatures.",
            "- Gate state and event hashes are simulated.",
            "- No insurer, carrier, marketplace, shop, or human UI is integrated.",
            "",
            "## Next Hardening Target",
            "",
            "Integrate spendability packets into the E2E harness around route commitment, challenge clearance, and claim support, then decide which spendability hashes eventually need on-chain anchoring.",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run off-chain EvidenceSpendability gate falsifier drill.")
    parser.add_argument("--run-dir", type=Path, help="Optional output directory")
    args = parser.parse_args()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = args.run_dir or (RUNS / f"evidence_spendability_drill_{timestamp}")
    run_dir.mkdir(parents=True, exist_ok=True)
    cases = run_drill(run_dir)
    write_report(run_dir, cases)

    print(f"Wrote {run_dir / 'REPORT.md'}")
    for case in cases:
        print(f"{case.slug}: outcome={case.outcome} passed={case.passed} error={case.error_code or 'none'}")
    return 0 if all(case.passed for case in cases) else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(130)
