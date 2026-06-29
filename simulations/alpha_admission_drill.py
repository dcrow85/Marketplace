#!/usr/bin/env python3
"""Executable A1-A7 alpha-admission drill.

This is a falsification drill for the GPTPRO alpha-readiness blockers. It does
not claim the chain enforces these gates. It turns the prose blockers into a
deterministic validator surface and proves each guard has teeth by mutating it
off against an adversarial fixture.
"""

from __future__ import annotations

import copy
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"


GateResult = dict[str, Any]


@dataclass(frozen=True)
class Guard:
    gate: str
    guard_id: str
    description: str
    mutation: str


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def clean_route() -> dict[str, Any]:
    return {
        "route_id": "alpha-admit-clean-001",
        "trade_value": 180,
        "principal_exposure": 180,
        "control_cluster_exposure": 420,
        "custodian_exposure": 520,
        "verifier_exposure": 480,
        "judgment_authority_exposure": 360,
        "registry_version_exposure": 760,
        "global_epoch_loss": 2100,
        "route_class": "curated_low_value_single_card",
        "delivery_mode": "tracked_insured_carrier",
        "dispute_branch": "manual_dual_control_post_handoff",
        "exposure_increasing_transition": "seller_bond_acceptance",
        "policy_snapshot": {
            "policy_hash": "0xpolicy-a1",
            "version": "alpha-admission-v0.1",
            "effective_block": 101,
            "route_class": "curated_low_value_single_card",
            "max_trade_value": 250,
            "max_principal_exposure": 500,
            "max_control_cluster_exposure": 750,
            "max_custodian_exposure": 900,
            "max_verifier_exposure": 800,
            "max_judgment_authority_exposure": 600,
            "max_registry_version_exposure": 1200,
            "max_global_epoch_loss": 3000,
            "allowed_delivery_modes": ["tracked_insured_carrier", "local_handoff"],
            "allowed_dispute_branches": ["manual_dual_control_post_handoff"],
            "manual_override": {
                "authority": "ops-council-2of2",
                "two_person_required": True,
                "reason_log": "required",
                "loss_budget": 500,
            },
        },
        "delivery": {
            "state": "delivery_asserted",
            "settlement_effect": "none_until_challenge_window_or_manual_final",
            "witness_class": "carrier_tracking_plus_signature",
            "issuer": "carrier:usps",
            "issuer_role": "independent_carrier",
            "issuer_conflict": "none_registered",
            "scope": "route_delivery_attempt",
            "expiry": "2026-07-01T00:00:00Z",
            "challenge_window_seconds": 172800,
            "settlement_ceiling": 0,
            "delivery_final_requires": ["inspection_window_elapsed", "no_open_claim", "manual_dual_control_if_contested"],
        },
        "post_handoff_remedy": {
            "claim_type": "wrong_item_after_delivery",
            "remedy_type": "refund_after_return",
            "max_amount": 180,
            "return_required": True,
            "return_custody_hash": "0xreturn-custody",
            "evidence_root": "0xevidence-root",
            "appeal_final_state": "final",
            "non_return_remedy_allowed": False,
        },
        "spendability": {
            "canonical_preimage": "trade|gate|leg|artifacts|issuer|expiry",
            "constituent_source_claim_hashes": ["0xclaim-card", "0xclaim-route", "0xclaim-policy"],
            "validator_code_hash": "0xvalidator-code",
            "validator_policy_hash": "0xvalidator-policy",
            "issuer_role": "deterministic_validator",
            "issuer_authority_ceiling": "route_commitment_only",
            "issuer_conflict_ref": "registry:none",
            "registry_snapshot": "0xregistry-snapshot",
            "expiry": "2026-07-01T00:00:00Z",
            "data_availability_receipt": "0xda-receipt",
            "not_claiming": ["model_verdict", "physical_card_truth", "reputation_score_truth"],
            "source_claim_author": "seller_agent",
            "issuer": "validator:route-spendability-v1",
            "route_downgraded_and_value_capped": False,
            "model_output_used_as_authority": False,
            "reputation_score_used_as_authority": False,
        },
        "snapshot": {
            "freeze_point": "seller_acceptance_bond",
            "authority_root": "0xauthority-root",
            "control_root": "0xcontrol-root",
            "disclosure_root": "0xdisclosure-root",
            "eligible_set_root": "0xeligible-set-root",
            "policy_root": "0xpolicy-root",
            "claim_matrix_root": "0xclaim-matrix-root",
            "later_governance_changes_apply": False,
        },
        "evidence": {
            "availability_receipts": ["0xda-receipt", "0xcarrier-receipt"],
            "access_logs": ["0xbuyer-access", "0xseller-access"],
            "key_commitments": ["0xbuyer-key", "0xseller-key"],
            "notice_timestamps": ["2026-06-22T12:00:00Z"],
            "equal_response_windows": True,
            "canonical_bundle_manifest": "0xbundle-manifest",
            "retention_policy": "alpha-90-days",
            "theft_sensitive_data_policy": "encrypted_or_delayed",
        },
        "capacity": {
            "cell": "us_raw_low_7day",
            "eligible_registered_control_clusters": 4,
            "clusters_after_largest_removed": 3,
            "replacement_available": True,
            "slots": 18,
            "conservative_peak_concurrent_demand": 10,
            "deterministic_30day_replay_sla": 0.995,
            "conflicted_fallbacks": 0,
            "silent_same_subject_custodian_substitution": False,
            "largest_cluster_assignment_share": 0.31,
            "buyer_verifier_pair_share": 0.08,
            "seller_verifier_pair_share": 0.06,
            "assigned_exposure": 420,
            "atomically_reserved_capacity": 500,
        },
    }


GUARDS: list[Guard] = [
    Guard("A1", "A1.policy_snapshot_present", "Policy snapshot is present.", "missing_policy_snapshot"),
    Guard("A1", "A1.known_policy_version", "Unknown policy versions fail closed.", "unknown_policy_version"),
    Guard("A1", "A1.route_class_match", "Route class must match active policy.", "wrong_route_class"),
    Guard("A1", "A1.trade_value_cap", "Per-trade value cap is enforced.", "trade_value_over_cap"),
    Guard("A1", "A1.aggregate_caps", "Principal/cluster/custodian/verifier/judgment/registry/global caps are enforced.", "aggregate_exposure_over_cap"),
    Guard("A1", "A1.allowed_delivery_mode", "Delivery mode must be admitted.", "unadmitted_delivery_mode"),
    Guard("A1", "A1.allowed_dispute_branch", "Dispute branch must be admitted.", "unadmitted_dispute_branch"),
    Guard("A1", "A1.manual_override_bounded", "Manual override requires 2-person authority and loss budget.", "weak_manual_override"),
    Guard("A2", "A2.asserted_not_final", "delivery_asserted is not delivery_final.", "delivery_asserted_marked_final"),
    Guard("A2", "A2.no_single_interested_witness", "Single seller-associated witness cannot cause irreversible buyer-unfavorable settlement.", "seller_witness_auto_release"),
    Guard("A2", "A2.witness_scope_expiry_conflict", "Witness class/issuer/conflict/scope/expiry/challenge window are bound.", "delivery_witness_unscoped"),
    Guard("A2", "A2.no_missing_witness_auto_non_delivery", "Missing witness cannot auto-establish non-delivery after possible handoff.", "missing_witness_auto_refund"),
    Guard("A3", "A3.claim_type_bound", "Claim type is bound.", "remedy_missing_claim_type"),
    Guard("A3", "A3.remedy_type_bound", "Remedy type is bound.", "remedy_missing_type"),
    Guard("A3", "A3.amount_ceiling", "Remedy amount is capped.", "remedy_over_amount"),
    Guard("A3", "A3.return_custody_for_full_refund", "Full refund after handoff requires return/custody or bounded non-return remedy.", "full_refund_without_return"),
    Guard("A3", "A3.evidence_root_bound", "Evidence root is bound.", "remedy_missing_evidence_root"),
    Guard("A3", "A3.appeal_final", "Appeal must be final before value moves.", "remedy_appeal_not_final"),
    Guard("A4", "A4.canonical_preimage", "Spendability has canonical preimage.", "spendability_missing_preimage"),
    Guard("A4", "A4.constituent_claims", "Spendability cites constituent source claim hashes.", "spendability_missing_claims"),
    Guard("A4", "A4.validator_hashes", "Validator code and policy hashes are bound.", "spendability_missing_validator_hash"),
    Guard("A4", "A4.issuer_authority", "Issuer role and authority ceiling are bound.", "spendability_unbounded_issuer"),
    Guard("A4", "A4.registry_snapshot", "Registry snapshot is bound.", "spendability_missing_registry"),
    Guard("A4", "A4.availability_and_expiry", "Expiry and data availability receipt are bound.", "spendability_missing_da"),
    Guard("A4", "A4.no_model_or_reputation_authority", "Model output/reputation score cannot mint value authority.", "model_output_mints_spendability"),
    Guard("A4", "A4.author_issuer_separation", "Source-claim author cannot be final issuer unless downgraded and capped.", "same_author_and_issuer"),
    Guard("A5", "A5.freeze_before_bond", "Roots freeze no later than seller acceptance/bond.", "snapshot_after_bond"),
    Guard("A5", "A5.required_roots", "Authority/control/disclosure/eligible/policy/claim roots are present.", "snapshot_missing_roots"),
    Guard("A5", "A5.no_retroactive_governance", "Later governance changes cannot retroactively change a trade.", "retroactive_governance"),
    Guard("A6", "A6.availability_receipts", "Evidence has content-addressed availability receipts.", "evidence_missing_availability"),
    Guard("A6", "A6.access_and_keys", "Access logs and key commitments are present.", "evidence_missing_access_keys"),
    Guard("A6", "A6.notice_and_equal_windows", "Notice timestamps and equal response windows are present.", "evidence_asymmetric_deadline"),
    Guard("A6", "A6.bundle_and_retention", "Canonical bundle manifest and retention policy are present.", "evidence_missing_bundle"),
    Guard("A6", "A6.theft_sensitive_policy", "Theft-sensitive data is encrypted or delayed, not public by default.", "evidence_public_theft_data"),
    Guard("A7", "A7.min_clusters", "At least 3 eligible registered control clusters per cell.", "capacity_too_few_clusters"),
    Guard("A7", "A7.remove_largest_resilience", "After removing largest cluster, at least 2 clusters remain with replacement.", "capacity_largest_cluster_failure"),
    Guard("A7", "A7.peak_slots", "Slots cover at least 1.5x conservative peak demand.", "capacity_under_peak"),
    Guard("A7", "A7.replay_sla", "30-day deterministic replay completes at least 99 percent within SLA.", "capacity_sla_low"),
    Guard("A7", "A7.no_conflicted_fallbacks", "No conflicted fallbacks.", "capacity_conflicted_fallback"),
    Guard("A7", "A7.no_silent_substitution", "No silent same-subject custodian substitution.", "capacity_silent_substitution"),
    Guard("A7", "A7.assignment_shares", "No cluster >33 percent and no buyer/seller-verifier pair >10 percent.", "capacity_share_over_limit"),
    Guard("A7", "A7.reserved_capacity", "Assigned exposure is at most atomically reserved capacity.", "capacity_unreserved_exposure"),
]


def mutate_route(route: dict[str, Any], mutation: str) -> dict[str, Any]:
    route = copy.deepcopy(route)
    policy = route.get("policy_snapshot", {})
    if mutation == "missing_policy_snapshot":
        route.pop("policy_snapshot", None)
    elif mutation == "unknown_policy_version":
        policy["version"] = "unknown-alpha-policy"
    elif mutation == "wrong_route_class":
        route["route_class"] = "open_public_route"
    elif mutation == "trade_value_over_cap":
        route["trade_value"] = policy["max_trade_value"] + 1
    elif mutation == "aggregate_exposure_over_cap":
        route["global_epoch_loss"] = policy["max_global_epoch_loss"] + 1
    elif mutation == "unadmitted_delivery_mode":
        route["delivery_mode"] = "untracked_dm"
    elif mutation == "unadmitted_dispute_branch":
        route["dispute_branch"] = "auto_buyer_refund_post_handoff"
    elif mutation == "weak_manual_override":
        policy["manual_override"]["two_person_required"] = False
    elif mutation == "delivery_asserted_marked_final":
        route["delivery"]["state"] = "delivery_final"
        route["delivery"]["settlement_effect"] = "auto_release"
    elif mutation == "seller_witness_auto_release":
        route["delivery"]["issuer_role"] = "seller_associated"
        route["delivery"]["settlement_effect"] = "auto_release"
        route["delivery"]["settlement_ceiling"] = route["trade_value"]
    elif mutation == "delivery_witness_unscoped":
        route["delivery"]["scope"] = ""
    elif mutation == "missing_witness_auto_refund":
        route["delivery"]["witness_class"] = "missing"
        route["delivery"]["settlement_effect"] = "auto_buyer_refund"
    elif mutation == "remedy_missing_claim_type":
        route["post_handoff_remedy"]["claim_type"] = ""
    elif mutation == "remedy_missing_type":
        route["post_handoff_remedy"]["remedy_type"] = ""
    elif mutation == "remedy_over_amount":
        route["post_handoff_remedy"]["max_amount"] = route["trade_value"] + 1
    elif mutation == "full_refund_without_return":
        route["post_handoff_remedy"]["remedy_type"] = "full_refund"
        route["post_handoff_remedy"]["return_required"] = False
        route["post_handoff_remedy"]["return_custody_hash"] = ""
        route["post_handoff_remedy"]["non_return_remedy_allowed"] = False
    elif mutation == "remedy_missing_evidence_root":
        route["post_handoff_remedy"]["evidence_root"] = ""
    elif mutation == "remedy_appeal_not_final":
        route["post_handoff_remedy"]["appeal_final_state"] = "pending"
    elif mutation == "spendability_missing_preimage":
        route["spendability"]["canonical_preimage"] = ""
    elif mutation == "spendability_missing_claims":
        route["spendability"]["constituent_source_claim_hashes"] = []
    elif mutation == "spendability_missing_validator_hash":
        route["spendability"]["validator_code_hash"] = ""
    elif mutation == "spendability_unbounded_issuer":
        route["spendability"]["issuer_authority_ceiling"] = ""
    elif mutation == "spendability_missing_registry":
        route["spendability"]["registry_snapshot"] = ""
    elif mutation == "spendability_missing_da":
        route["spendability"]["data_availability_receipt"] = ""
    elif mutation == "model_output_mints_spendability":
        route["spendability"]["model_output_used_as_authority"] = True
    elif mutation == "same_author_and_issuer":
        route["spendability"]["issuer"] = route["spendability"]["source_claim_author"]
    elif mutation == "snapshot_after_bond":
        route["snapshot"]["freeze_point"] = "after_seller_bond"
    elif mutation == "snapshot_missing_roots":
        route["snapshot"]["authority_root"] = ""
    elif mutation == "retroactive_governance":
        route["snapshot"]["later_governance_changes_apply"] = True
    elif mutation == "evidence_missing_availability":
        route["evidence"]["availability_receipts"] = []
    elif mutation == "evidence_missing_access_keys":
        route["evidence"]["key_commitments"] = []
    elif mutation == "evidence_asymmetric_deadline":
        route["evidence"]["equal_response_windows"] = False
    elif mutation == "evidence_missing_bundle":
        route["evidence"]["canonical_bundle_manifest"] = ""
    elif mutation == "evidence_public_theft_data":
        route["evidence"]["theft_sensitive_data_policy"] = "public_by_default"
    elif mutation == "capacity_too_few_clusters":
        route["capacity"]["eligible_registered_control_clusters"] = 2
    elif mutation == "capacity_largest_cluster_failure":
        route["capacity"]["clusters_after_largest_removed"] = 1
    elif mutation == "capacity_under_peak":
        route["capacity"]["slots"] = 14
    elif mutation == "capacity_sla_low":
        route["capacity"]["deterministic_30day_replay_sla"] = 0.98
    elif mutation == "capacity_conflicted_fallback":
        route["capacity"]["conflicted_fallbacks"] = 1
    elif mutation == "capacity_silent_substitution":
        route["capacity"]["silent_same_subject_custodian_substitution"] = True
    elif mutation == "capacity_share_over_limit":
        route["capacity"]["largest_cluster_assignment_share"] = 0.34
    elif mutation == "capacity_unreserved_exposure":
        route["capacity"]["assigned_exposure"] = route["capacity"]["atomically_reserved_capacity"] + 1
    else:
        raise ValueError(f"unknown mutation: {mutation}")
    return route


def active(skip: set[str], guard_id: str) -> bool:
    return guard_id not in skip


def evaluate(route: dict[str, Any], *, skip: set[str] | None = None) -> GateResult:
    skip = skip or set()
    errors: list[dict[str, str]] = []

    def fail(gate: str, guard_id: str, message: str) -> None:
        if active(skip, guard_id):
            errors.append({"gate": gate, "guard_id": guard_id, "message": message})

    policy = route.get("policy_snapshot")
    if not policy:
        fail("A1", "A1.policy_snapshot_present", "missing policy snapshot")
    else:
        if policy.get("version") != "alpha-admission-v0.1":
            fail("A1", "A1.known_policy_version", "unknown policy version")
        if route.get("route_class") != policy.get("route_class"):
            fail("A1", "A1.route_class_match", "route class not admitted")
        if route.get("trade_value", 0) > policy.get("max_trade_value", -1):
            fail("A1", "A1.trade_value_cap", "trade value exceeds policy cap")
        cap_fields = [
            ("principal_exposure", "max_principal_exposure"),
            ("control_cluster_exposure", "max_control_cluster_exposure"),
            ("custodian_exposure", "max_custodian_exposure"),
            ("verifier_exposure", "max_verifier_exposure"),
            ("judgment_authority_exposure", "max_judgment_authority_exposure"),
            ("registry_version_exposure", "max_registry_version_exposure"),
            ("global_epoch_loss", "max_global_epoch_loss"),
        ]
        if any(route.get(left, 0) > policy.get(right, -1) for left, right in cap_fields):
            fail("A1", "A1.aggregate_caps", "aggregate exposure cap exceeded")
        if route.get("delivery_mode") not in policy.get("allowed_delivery_modes", []):
            fail("A1", "A1.allowed_delivery_mode", "delivery mode not admitted")
        if route.get("dispute_branch") not in policy.get("allowed_dispute_branches", []):
            fail("A1", "A1.allowed_dispute_branch", "dispute branch not admitted")
        override = policy.get("manual_override", {})
        if not (override.get("authority") and override.get("two_person_required") is True and override.get("reason_log") and override.get("loss_budget", 0) > 0):
            fail("A1", "A1.manual_override_bounded", "manual override is not bounded")

    delivery = route.get("delivery", {})
    if delivery.get("state") == "delivery_final" and delivery.get("settlement_effect") != "none_until_challenge_window_or_manual_final":
        fail("A2", "A2.asserted_not_final", "delivery assertion was promoted to finality")
    if delivery.get("issuer_role") in {"seller", "seller_associated"} and delivery.get("settlement_effect") in {"auto_release", "buyer_unfavorable_release"}:
        fail("A2", "A2.no_single_interested_witness", "interested delivery witness controls release")
    if not all(delivery.get(field) for field in ("witness_class", "issuer", "issuer_conflict", "scope", "expiry", "challenge_window_seconds")):
        fail("A2", "A2.witness_scope_expiry_conflict", "delivery witness metadata incomplete")
    if delivery.get("witness_class") == "missing" and delivery.get("settlement_effect") == "auto_buyer_refund":
        fail("A2", "A2.no_missing_witness_auto_non_delivery", "missing witness became auto non-delivery")

    remedy = route.get("post_handoff_remedy", {})
    if not remedy.get("claim_type"):
        fail("A3", "A3.claim_type_bound", "claim type missing")
    if not remedy.get("remedy_type"):
        fail("A3", "A3.remedy_type_bound", "remedy type missing")
    if remedy.get("max_amount", 0) > route.get("trade_value", 0):
        fail("A3", "A3.amount_ceiling", "remedy exceeds trade value")
    full_refund = remedy.get("remedy_type") == "full_refund" or remedy.get("max_amount") == route.get("trade_value")
    if full_refund and not remedy.get("return_required") and not remedy.get("return_custody_hash") and not remedy.get("non_return_remedy_allowed"):
        fail("A3", "A3.return_custody_for_full_refund", "full refund lacks return custody or bounded non-return remedy")
    if not remedy.get("evidence_root"):
        fail("A3", "A3.evidence_root_bound", "evidence root missing")
    if remedy.get("appeal_final_state") != "final":
        fail("A3", "A3.appeal_final", "appeal is not final")

    spend = route.get("spendability", {})
    if not spend.get("canonical_preimage"):
        fail("A4", "A4.canonical_preimage", "spendability preimage missing")
    if not spend.get("constituent_source_claim_hashes"):
        fail("A4", "A4.constituent_claims", "constituent claims missing")
    if not spend.get("validator_code_hash") or not spend.get("validator_policy_hash"):
        fail("A4", "A4.validator_hashes", "validator hashes missing")
    if not spend.get("issuer_role") or not spend.get("issuer_authority_ceiling"):
        fail("A4", "A4.issuer_authority", "issuer authority missing")
    if not spend.get("registry_snapshot"):
        fail("A4", "A4.registry_snapshot", "registry snapshot missing")
    if not spend.get("expiry") or not spend.get("data_availability_receipt"):
        fail("A4", "A4.availability_and_expiry", "expiry or data availability missing")
    if spend.get("model_output_used_as_authority") or spend.get("reputation_score_used_as_authority"):
        fail("A4", "A4.no_model_or_reputation_authority", "model or reputation minted spendability")
    if spend.get("issuer") == spend.get("source_claim_author") and not spend.get("route_downgraded_and_value_capped"):
        fail("A4", "A4.author_issuer_separation", "source author is final issuer without downgrade")

    snap = route.get("snapshot", {})
    if snap.get("freeze_point") not in {"seller_acceptance", "seller_acceptance_bond"}:
        fail("A5", "A5.freeze_before_bond", "snapshot freezes after seller bond")
    root_fields = ("authority_root", "control_root", "disclosure_root", "eligible_set_root", "policy_root", "claim_matrix_root")
    if not all(snap.get(field) for field in root_fields):
        fail("A5", "A5.required_roots", "snapshot roots incomplete")
    if snap.get("later_governance_changes_apply"):
        fail("A5", "A5.no_retroactive_governance", "later governance changes apply retroactively")

    evidence = route.get("evidence", {})
    if not evidence.get("availability_receipts"):
        fail("A6", "A6.availability_receipts", "availability receipts missing")
    if not evidence.get("access_logs") or not evidence.get("key_commitments"):
        fail("A6", "A6.access_and_keys", "access logs or key commitments missing")
    if not evidence.get("notice_timestamps") or evidence.get("equal_response_windows") is not True:
        fail("A6", "A6.notice_and_equal_windows", "notice or equal windows missing")
    if not evidence.get("canonical_bundle_manifest") or not evidence.get("retention_policy"):
        fail("A6", "A6.bundle_and_retention", "bundle manifest or retention missing")
    if evidence.get("theft_sensitive_data_policy") not in {"encrypted_or_delayed", "redacted_then_escrowed"}:
        fail("A6", "A6.theft_sensitive_policy", "theft-sensitive data exposed")

    cap = route.get("capacity", {})
    if cap.get("eligible_registered_control_clusters", 0) < 3:
        fail("A7", "A7.min_clusters", "too few eligible control clusters")
    if cap.get("clusters_after_largest_removed", 0) < 2 or cap.get("replacement_available") is not True:
        fail("A7", "A7.remove_largest_resilience", "largest-cluster removal leaves insufficient replacement")
    if cap.get("slots", 0) < 1.5 * cap.get("conservative_peak_concurrent_demand", 0):
        fail("A7", "A7.peak_slots", "capacity below 1.5x peak")
    if cap.get("deterministic_30day_replay_sla", 0) < 0.99:
        fail("A7", "A7.replay_sla", "30-day replay SLA below 99 percent")
    if cap.get("conflicted_fallbacks", 0) != 0:
        fail("A7", "A7.no_conflicted_fallbacks", "conflicted fallback present")
    if cap.get("silent_same_subject_custodian_substitution"):
        fail("A7", "A7.no_silent_substitution", "silent custodian substitution present")
    if cap.get("largest_cluster_assignment_share", 1) > 0.33 or cap.get("buyer_verifier_pair_share", 1) > 0.10 or cap.get("seller_verifier_pair_share", 1) > 0.10:
        fail("A7", "A7.assignment_shares", "assignment share over limit")
    if cap.get("assigned_exposure", 0) > cap.get("atomically_reserved_capacity", -1):
        fail("A7", "A7.reserved_capacity", "assigned exposure exceeds reserved capacity")

    by_gate: dict[str, int] = {}
    for err in errors:
        by_gate[err["gate"]] = by_gate.get(err["gate"], 0) + 1
    return {"admitted": not errors, "errors": errors, "error_count": len(errors), "errors_by_gate": by_gate}


def run_drill() -> dict[str, Any]:
    base = clean_route()
    clean = evaluate(base)
    negative_cases: list[dict[str, Any]] = []
    mutation_teeth: list[dict[str, Any]] = []

    for guard in GUARDS:
        bad = mutate_route(base, guard.mutation)
        observed = evaluate(bad)
        hit = any(err["guard_id"] == guard.guard_id for err in observed["errors"])
        negative_cases.append(
            {
                "guard_id": guard.guard_id,
                "gate": guard.gate,
                "mutation": guard.mutation,
                "blocked": not observed["admitted"],
                "target_guard_hit": hit,
                "errors": observed["errors"],
            }
        )
        weakened = evaluate(bad, skip={guard.guard_id})
        mutation_teeth.append(
            {
                "guard_id": guard.guard_id,
                "gate": guard.gate,
                "mutation": guard.mutation,
                "original_blocked": not observed["admitted"],
                "weakened_admitted": weakened["admitted"],
                "killed": (not observed["admitted"]) and weakened["admitted"],
                "residual_errors_when_weakened": weakened["errors"],
            }
        )

    gate_counts: dict[str, int] = {}
    for guard in GUARDS:
        gate_counts[guard.gate] = gate_counts.get(guard.gate, 0) + 1

    passed = (
        clean["admitted"]
        and all(case["blocked"] and case["target_guard_hit"] for case in negative_cases)
        and all(tooth["killed"] for tooth in mutation_teeth)
    )
    return {
        "schema": "marketplace.alpha_admission_drill.v0.1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "not_claiming": [
            "chain_enforces_A1_A7",
            "alpha_is_admitted",
            "physical_card_truth",
            "economic_sufficiency",
            "complete_protocol_review",
        ],
        "clean_case": clean,
        "gate_counts": gate_counts,
        "negative_case_count": len(negative_cases),
        "mutation_tooth_count": len(mutation_teeth),
        "negative_cases": negative_cases,
        "mutation_teeth": mutation_teeth,
        "passed": passed,
    }


def write_report(result: dict[str, Any]) -> Path:
    out_dir = RUNS / f"alpha_admission_drill_{utc_stamp()}"
    out_dir.mkdir(parents=True, exist_ok=False)
    (out_dir / "result.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    lines = [
        "# Alpha Admission Drill",
        "",
        f"- Passed: `{result['passed']}`",
        f"- Clean case admitted: `{result['clean_case']['admitted']}`",
        f"- Negative cases: `{result['negative_case_count']}`",
        f"- Mutation teeth: `{result['mutation_tooth_count']}`",
        f"- Gate counts: `{json.dumps(result['gate_counts'], sort_keys=True)}`",
        "",
        "## Boundary",
        "",
        "This drill makes A1-A7 executable as deterministic admission checks. It does not claim the chain enforces them yet.",
        "",
        "## Killed Mutations",
        "",
    ]
    for tooth in result["mutation_teeth"]:
        lines.append(f"- `{tooth['guard_id']}` via `{tooth['mutation']}`: killed `{tooth['killed']}`")
    (out_dir / "REPORT.md").write_text("\n".join(lines) + "\n")
    return out_dir


def main() -> int:
    result = run_drill()
    out_dir = write_report(result)
    print(json.dumps({
        "passed": result["passed"],
        "negative_cases": result["negative_case_count"],
        "mutation_teeth": result["mutation_tooth_count"],
        "gate_counts": result["gate_counts"],
        "report": str(out_dir / "REPORT.md"),
    }, indent=2, sort_keys=True))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
