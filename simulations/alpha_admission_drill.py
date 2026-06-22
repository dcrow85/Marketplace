#!/usr/bin/env python3
"""Reference falsification drill for A1-A7 alpha-admission blocker gates.

Source: Cairn_Protocol_GPTPRO_Review_Response_v0.1.md.
Deterministic, model-free.

PER-SUBGUARD TEETH: each compound gate is mutated one subclause at a time. For
every subguard, an attack violating only that subguard must (a) BLOCK under the
full gate, and (b) flip to ADMIT when only that subguard is disabled. This proves
the subcondition is load-bearing, not decorative.

Honesty note: Codex authored the A1-A7 response. This drill is a reference
implementation with teeth, not an independent author!=verifier sign-off.

Run: python3 simulations/alpha_admission_drill.py
"""

from __future__ import annotations


def a1(c, off=frozenset()):
    """A1 - AlphaAdmissionPolicy at every exposure-increasing transition."""
    r = []
    delta = c["new_exposure"]
    if "transition_checked" not in off and c["exposure_increasing"] and not c["policy_checked_at_transition"]:
        r.append("exposure-increasing transition did not check the policy snapshot")
    if "policy_known" not in off and not c["policy_known"]:
        r.append("unknown policy hash")
    if "policy_version" not in off and c["policy_version"] not in c["known_policy_versions"]:
        r.append("unknown policy version")
    if "effective_block" not in off and c["current_block"] < c["effective_block"]:
        r.append("policy snapshot not yet effective")
    if "route_class" not in off and c["route_class"] not in c["allowed_route_classes"]:
        r.append("route_class not admitted by policy")
    if "trade_value" not in off and c["trade_value"] > c["max_trade_value"]:
        r.append("trade value exceeds per-trade alpha cap")
    if "principal_cap" not in off and c["principal_exposure"] + delta > c["max_principal_exposure"]:
        r.append("principal exposure cap exceeded")
    if "control_cluster_cap" not in off and c["control_cluster_exposure"] + delta > c["max_control_cluster_exposure"]:
        r.append("control-cluster exposure cap exceeded")
    if "custodian_cap" not in off and c["custodian_exposure"] + delta > c["max_custodian_exposure"]:
        r.append("custodian exposure cap exceeded")
    if "verifier_cap" not in off and c["verifier_exposure"] + delta > c["max_verifier_exposure"]:
        r.append("verifier exposure cap exceeded")
    if "judgment_authority_cap" not in off and (
        c["judgment_authority_exposure"] + delta > c["max_judgment_authority_exposure"]
    ):
        r.append("judgment-authority exposure cap exceeded")
    if "registry_version_cap" not in off and c["registry_version_exposure"] + delta > c["max_registry_version_exposure"]:
        r.append("registry-version exposure cap exceeded")
    if "global_epoch_cap" not in off and c["global_epoch_loss"] + delta > c["max_global_epoch_loss"]:
        r.append("global epoch loss budget exceeded")
    if "delivery_mode" not in off and c["delivery_mode"] not in c["allowed_delivery_modes"]:
        r.append("delivery mode not admitted by policy")
    if "dispute_branch" not in off and c["dispute_branch"] not in c["allowed_dispute_branches"]:
        r.append("dispute branch not admitted by policy")

    if c["manual_override_used"]:
        if "manual_authority" not in off and c["manual_authority"] not in c["allowed_manual_authorities"]:
            r.append("manual override authority not admitted")
        if "manual_two_person" not in off and (
            not c["manual_second_approver"] or c["manual_second_approver"] == c["manual_authority"]
        ):
            r.append("manual override lacks two-person approval")
        if "manual_reason_log" not in off and not c["manual_reason_log"]:
            r.append("manual override lacks a reason log")
        if "manual_loss_budget" not in off and c["manual_override_loss"] > c["manual_remaining_loss_budget"]:
            r.append("manual override exceeds its loss budget")
    return (not r, r)


def a2(c, off=frozenset()):
    """A2 - DeliveryTriggerPolicy: asserted witness is not final value authority."""
    r = []
    if c["delivery_final_requested"]:
        if "final_requires_assertion" not in off and not c["delivery_asserted"]:
            r.append("delivery_final requested without delivery_asserted")
        if "assertion_not_final" not in off and c["finalization_basis"] == "assertion_only":
            r.append("delivery_asserted laundered into delivery_final")
        if "witness_class" not in off and c["witness_class"] not in c["allowed_witness_classes"]:
            r.append("witness class not admitted")
        if "witness_issuer" not in off and c["witness_issuer"] not in c["authorized_witness_issuers"]:
            r.append("witness issuer not authorized")
        if "witness_conflict" not in off and c["witness_conflicted"]:
            r.append("witness has a registered conflict")
        if "scope_match" not in off and c["witness_scope"] != c["route_scope"]:
            r.append("delivery witness scope mismatch")
        if "expiry" not in off and c["current_block"] > c["witness_expiry_block"]:
            r.append("delivery witness expired")
        if "challenge_window" not in off and c["current_block"] < c["challenge_deadline_block"]:
            r.append("delivery final before challenge window elapsed")
        if "settlement_ceiling" not in off and c["settlement_amount"] > c["settlement_ceiling"]:
            r.append("delivery-triggered settlement exceeds ceiling")

    if "seller_singleton" not in off and c["irreversible_buyer_unfavorable"] and c["seller_associated_witness"] \
            and c["independent_witness_count"] < 1:
        r.append("single seller-associated witness controls buyer-unfavorable finality")

    if "missing_witness_not_non_delivery" not in off and c["possible_physical_handoff"] and c["missing_witness"] \
            and c["missing_witness_establishes_non_delivery"]:
        r.append("missing witness after possible handoff establishes non-delivery")
    return (not r, r)


def a3(c, off=frozenset()):
    """A3 - PostHandoffRemedyMatrix for buyer-favoring post-handoff settlement."""
    r = []
    buyer_favoring = c["post_handoff"] and c["remedy_direction"] == "buyer"
    if not buyer_favoring:
        return (True, r)

    if "matrix_entry" not in off and not c["matrix_entry_exists"]:
        r.append("no remedy-matrix entry")
    if "claim_type" not in off and c["claim_type"] not in c["covered_claim_types"]:
        r.append("claim_type not covered by remedy matrix")
    if "remedy_type" not in off and c["remedy_type"] not in c["allowed_remedies_by_claim"].get(c["claim_type"], set()):
        r.append("remedy_type not admitted for claim_type")
    if "max_amount" not in off and c["amount"] > c["max_amount"]:
        r.append("remedy amount exceeds max_amount")
    if "return_or_non_return" not in off and not c["return_required"] and not c["non_return_remedy_allowed"]:
        r.append("non-return remedy not allowed")
    if "return_custody" not in off and c["return_required"] and not c["return_custody_hash"]:
        r.append("return required but return_custody_hash missing")
    if "evidence_root" not in off and not c["evidence_root"]:
        r.append("evidence_root missing")
    if "appeal_final_state" not in off and c["appeal_final_state"] != "final":
        r.append("remedy before final appeal state")
    if "card_plus_refund" not in off and c["remedy_type"] == "full_refund" and c["buyer_may_retain_card"] \
            and c["return_custody_status"] != "third_party_custody":
        r.append("full refund while buyer may still retain the card")
    return (not r, r)


def a4(c, off=frozenset()):
    """A4 - TypedSpendabilityIssuer, blocking spendability-oracle capture."""
    r = []
    if "canonical_preimage" not in off and not c["canonical_preimage"]:
        r.append("spendability preimage is not canonical")
    if "constituent_claims" not in off and not c["constituent_claim_hashes"]:
        r.append("no constituent source claim hashes")
    if "source_claims_available" not in off and not c["source_claims_available"]:
        r.append("constituent source claims unavailable")
    if "validator_code_hash" not in off and c["validator_code_hash"] not in c["registered_validator_code_hashes"]:
        r.append("validator code hash not registered")
    if "validator_policy_hash" not in off and c["validator_policy_hash"] != c["expected_validator_policy_hash"]:
        r.append("validator policy hash mismatch")
    if "issuer_role" not in off and c["issuer_role"] not in c["allowed_issuer_roles"]:
        r.append("issuer role not admitted")
    if "authority_ceiling" not in off and c["requested_authority"] > c["issuer_authority_ceiling"]:
        r.append("issuer authority ceiling exceeded")
    if "conflict_ref" not in off and c["issuer_conflict_status"] == "conflicted":
        r.append("issuer conflict/independence ref is conflicted")
    if "registry_snapshot" not in off and c["registry_snapshot"] != c["frozen_registry_snapshot"]:
        r.append("registry snapshot mismatch")
    if "expiry" not in off and c["current_block"] > c["expiry_block"]:
        r.append("spendability packet expired")
    if "data_availability" not in off and not c["data_availability_receipt"]:
        r.append("data availability receipt missing")
    if "preimage_available" not in off and not c["preimage_available"]:
        r.append("canonical preimage unavailable")
    if "not_claiming" not in off and not c["required_not_claiming"].issubset(c["not_claiming"]):
        r.append("not_claiming boundary incomplete")
    if "no_model_or_reputation_authority" not in off and c["value_authority"] and c["source_basis"] in {
        "model_output",
        "reputation_score",
        "summary",
    }:
        r.append("model/reputation/summary minted value authority")
    if "issuer_not_source_author" not in off and c["issuer"] == c["source_claim_author"] \
            and not (c["downgraded"] and c["value_capped"]):
        r.append("source-claim author is final spendability issuer without downgrade+cap")
    return (not r, r)


def a5(c, off=frozenset()):
    """A5 - SnapshotBeforeBond: roots freeze no later than seller acceptance/bond."""
    r = []
    bond_block = c["seller_bond_block"]
    for sg, field, label in [
        ("authority_root", "authority_root_block", "authority root"),
        ("control_root", "control_root_block", "control-distance root"),
        ("disclosure_root", "disclosure_root_block", "disclosure root"),
        ("eligible_set_root", "eligible_set_root_block", "eligible-set root"),
        ("policy_root", "policy_root_block", "policy root"),
        ("claim_matrix_root", "claim_matrix_root_block", "claim-matrix root"),
    ]:
        if sg not in off and c[field] > bond_block:
            r.append(f"{label} froze after seller bond")
    if "snapshot_hash_in_bond" not in off and not c["snapshot_hash_in_bond"]:
        r.append("seller bond does not bind the snapshot hash")
    if "no_late_governance" not in off and c["later_governance_root_used"]:
        r.append("later governance root retroactively changed the trade")
    return (not r, r)


def a6(c, off=frozenset()):
    """A6 - EvidenceAvailabilityAndSymmetry."""
    r = []
    if "availability_receipt" not in off and not c["availability_receipt"]:
        r.append("availability receipt missing")
    if "content_addressed_manifest" not in off and not c["content_addressed_manifest"]:
        r.append("content-addressed evidence manifest missing")
    if "canonical_bundle_hash" not in off and not c["canonical_bundle_hash"]:
        r.append("canonical bundle hash missing")
    if "retention" not in off and c["retention_until_block"] < c["deadline_block"]:
        r.append("evidence retention expires before deadline")
    if "recipient_commitments" not in off and not c["required_recipients"].issubset(c["recipient_commitments"]):
        r.append("recipient/key commitments do not cover all required parties")
    if "key_commitments" not in off and not c["key_commitments"]:
        r.append("key commitments missing")
    if "notice_timestamp" not in off and c["notice_block"] > c["deadline_block"] - c["min_response_window"]:
        r.append("notice too late for the response window")
    if "equal_response_windows" not in off and len(set(c["response_windows"].values())) != 1:
        r.append("response windows are asymmetric")
    if "theft_sensitive_handling" not in off and c["custody_location_sensitive"] \
            and c["disclosure_mode"] not in {"encrypted", "delayed", "redacted"}:
        r.append("theft-sensitive custody data publicly leaked")
    if "access_logs" not in off and not c["access_logs"]:
        r.append("access log missing")
    if "preimages_available_to_all" not in off and not c["preimages_available_to_all"]:
        r.append("preimages unavailable to all required parties")
    return (not r, r)


def a7(c, off=frozenset()):
    """A7 - G2CapacityAdmission with measurable capacity and failure posture."""
    r = []
    if "snapshot_before_commitment" not in off and not c["capacity_snapshot_before_commitment"]:
        r.append("capacity snapshot missing before route commitment")
    if "clusters_after_exclusions" not in off and c["eligible_clusters_after_exclusions"] < 3:
        r.append("<3 eligible registered control clusters after exclusions")
    if "remove_largest" not in off and c["clusters_after_largest_removed"] < 2:
        r.append("after removing largest cluster, <2 clusters remain")
    if "peak_slots" not in off and c["slots_available"] < 1.5 * c["conservative_peak_demand"]:
        r.append("slots do not cover 1.5x conservative peak demand")
    if "replay_sla" not in off and c["replay_sla_rate"] < 0.99:
        r.append("30-day replay below 99% SLA under one-cluster failure")
    if "zero_conflicted_fallbacks" not in off and c["conflicted_fallbacks"] > 0:
        r.append("conflicted fallback present")
    if "no_silent_custodian_substitution" not in off and c["silent_same_subject_custodian_substitution"]:
        r.append("silent same-subject custodian substitution")
    if "cluster_share" not in off and c["largest_cluster_assignment_share"] > 0.33:
        r.append("cluster assignment share >33%")
    if "buyer_verifier_pair" not in off and c["buyer_verifier_pair_share"] > 0.10:
        r.append("buyer-verifier pair share >10% rolling window")
    if "seller_verifier_pair" not in off and c["seller_verifier_pair_share"] > 0.10:
        r.append("seller-verifier pair share >10% rolling window")
    if "reserved_capacity" not in off and c["assigned_exposure"] > c["reserved_capacity"]:
        r.append("assigned exposure exceeds atomically reserved capacity")
    failed_closed = (
        c["route_status"] == "capacity_failed"
        and c["neutral_placement_claim"] == "forbidden"
        and c["settlement_authority"] in {"none", "manual-capped"}
        and c["automatic_value_cap"] == 0
    )
    if "failure_posture" not in off and c["capacity_failed"] and not failed_closed:
        r.append("capacity failure did not force failed route posture")
    return (not r, r)


GATES = [
    (
        "A1",
        a1,
        {
            "exposure_increasing": True,
            "policy_checked_at_transition": True,
            "policy_known": True,
            "policy_version": "v1",
            "known_policy_versions": {"v1"},
            "current_block": 100,
            "effective_block": 90,
            "route_class": "curated_low_value",
            "allowed_route_classes": {"curated_low_value"},
            "trade_value": 50,
            "max_trade_value": 100,
            "new_exposure": 20,
            "principal_exposure": 10,
            "max_principal_exposure": 100,
            "control_cluster_exposure": 10,
            "max_control_cluster_exposure": 100,
            "custodian_exposure": 10,
            "max_custodian_exposure": 100,
            "verifier_exposure": 10,
            "max_verifier_exposure": 100,
            "judgment_authority_exposure": 10,
            "max_judgment_authority_exposure": 100,
            "registry_version_exposure": 10,
            "max_registry_version_exposure": 100,
            "global_epoch_loss": 100,
            "max_global_epoch_loss": 1000,
            "delivery_mode": "tracked_carrier",
            "allowed_delivery_modes": {"tracked_carrier", "custodian_handoff"},
            "dispute_branch": "manual_dual_control",
            "allowed_dispute_branches": {"manual_dual_control"},
            "manual_override_used": False,
            "manual_authority": "opsA",
            "allowed_manual_authorities": {"opsA"},
            "manual_second_approver": "opsB",
            "manual_reason_log": True,
            "manual_override_loss": 10,
            "manual_remaining_loss_budget": 100,
        },
        [
            ("transition_checked", {"policy_checked_at_transition": False}),
            ("policy_known", {"policy_known": False}),
            ("policy_version", {"policy_version": "v9"}),
            ("effective_block", {"current_block": 80}),
            ("route_class", {"route_class": "open_public"}),
            ("trade_value", {"trade_value": 150}),
            ("principal_cap", {"principal_exposure": 90}),
            ("control_cluster_cap", {"control_cluster_exposure": 90}),
            ("custodian_cap", {"custodian_exposure": 90}),
            ("verifier_cap", {"verifier_exposure": 90}),
            ("judgment_authority_cap", {"judgment_authority_exposure": 90}),
            ("registry_version_cap", {"registry_version_exposure": 90}),
            ("global_epoch_cap", {"global_epoch_loss": 990}),
            ("delivery_mode", {"delivery_mode": "plain_untracked_mail"}),
            ("dispute_branch", {"dispute_branch": "auto_buyer_refund"}),
            ("manual_authority", {"manual_override_used": True, "manual_authority": "seller"}),
            ("manual_two_person", {"manual_override_used": True, "manual_second_approver": "opsA"}),
            ("manual_reason_log", {"manual_override_used": True, "manual_reason_log": False}),
            ("manual_loss_budget", {"manual_override_used": True, "manual_override_loss": 200}),
        ],
    ),
    (
        "A2",
        a2,
        {
            "delivery_final_requested": True,
            "delivery_asserted": True,
            "finalization_basis": "challenge_elapsed",
            "witness_class": "carrier_scan",
            "allowed_witness_classes": {"carrier_scan", "custodian_receipt"},
            "witness_issuer": "carrierA",
            "authorized_witness_issuers": {"carrierA"},
            "witness_conflicted": False,
            "witness_scope": "trade:1",
            "route_scope": "trade:1",
            "current_block": 100,
            "witness_expiry_block": 150,
            "challenge_deadline_block": 90,
            "settlement_amount": 10,
            "settlement_ceiling": 50,
            "irreversible_buyer_unfavorable": False,
            "seller_associated_witness": False,
            "independent_witness_count": 1,
            "possible_physical_handoff": True,
            "missing_witness": False,
            "missing_witness_establishes_non_delivery": False,
        },
        [
            ("final_requires_assertion", {"delivery_asserted": False}),
            ("assertion_not_final", {"finalization_basis": "assertion_only"}),
            ("witness_class", {"witness_class": "seller_photo"}),
            ("witness_issuer", {"witness_issuer": "sellerNode"}),
            ("witness_conflict", {"witness_conflicted": True}),
            ("scope_match", {"witness_scope": "trade:2"}),
            ("expiry", {"current_block": 200}),
            ("challenge_window", {"current_block": 50}),
            ("settlement_ceiling", {"settlement_amount": 60}),
            (
                "seller_singleton",
                {
                    "irreversible_buyer_unfavorable": True,
                    "seller_associated_witness": True,
                    "independent_witness_count": 0,
                },
            ),
            (
                "missing_witness_not_non_delivery",
                {
                    "delivery_final_requested": False,
                    "delivery_asserted": False,
                    "missing_witness": True,
                    "missing_witness_establishes_non_delivery": True,
                },
            ),
        ],
    ),
    (
        "A3",
        a3,
        {
            "post_handoff": True,
            "remedy_direction": "buyer",
            "matrix_entry_exists": True,
            "claim_type": "authenticity",
            "covered_claim_types": {"authenticity", "condition"},
            "remedy_type": "full_refund",
            "allowed_remedies_by_claim": {
                "authenticity": {"full_refund", "partial_refund"},
                "condition": {"partial_refund"},
            },
            "amount": 80,
            "max_amount": 100,
            "return_required": True,
            "return_custody_hash": "return:hash",
            "evidence_root": "evidence:root",
            "appeal_final_state": "final",
            "non_return_remedy_allowed": False,
            "buyer_may_retain_card": False,
            "return_custody_status": "third_party_custody",
        },
        [
            ("matrix_entry", {"matrix_entry_exists": False}),
            (
                "claim_type",
                {
                    "claim_type": "shipping_delay",
                    "allowed_remedies_by_claim": {
                        "authenticity": {"full_refund", "partial_refund"},
                        "condition": {"partial_refund"},
                        "shipping_delay": {"full_refund"},
                    },
                },
            ),
            ("remedy_type", {"remedy_type": "punitive_refund"}),
            ("max_amount", {"amount": 150}),
            ("return_or_non_return", {"return_required": False, "non_return_remedy_allowed": False, "remedy_type": "partial_refund"}),
            ("return_custody", {"return_custody_hash": None}),
            ("evidence_root", {"evidence_root": None}),
            ("appeal_final_state", {"appeal_final_state": "pending"}),
            (
                "card_plus_refund",
                {
                    "buyer_may_retain_card": True,
                    "return_custody_status": "buyer_holds",
                    "return_required": True,
                    "non_return_remedy_allowed": False,
                },
            ),
        ],
    ),
    (
        "A4",
        a4,
        {
            "canonical_preimage": True,
            "constituent_claim_hashes": {"claim:A", "claim:B"},
            "source_claims_available": True,
            "validator_code_hash": "code:v1",
            "registered_validator_code_hashes": {"code:v1"},
            "validator_policy_hash": "policy:v1",
            "expected_validator_policy_hash": "policy:v1",
            "issuer_role": "spendability_validator",
            "allowed_issuer_roles": {"spendability_validator"},
            "requested_authority": 2,
            "issuer_authority_ceiling": 2,
            "issuer_conflict_status": "clear",
            "registry_snapshot": "registry:1",
            "frozen_registry_snapshot": "registry:1",
            "current_block": 100,
            "expiry_block": 200,
            "data_availability_receipt": True,
            "preimage_available": True,
            "required_not_claiming": {"physical_truth", "semantic_independence"},
            "not_claiming": {"physical_truth", "semantic_independence"},
            "value_authority": True,
            "source_basis": "typed_claims",
            "issuer": "issuerA",
            "source_claim_author": "authorB",
            "downgraded": False,
            "value_capped": False,
        },
        [
            ("canonical_preimage", {"canonical_preimage": False}),
            ("constituent_claims", {"constituent_claim_hashes": set()}),
            ("source_claims_available", {"source_claims_available": False}),
            ("validator_code_hash", {"validator_code_hash": "code:rogue"}),
            ("validator_policy_hash", {"validator_policy_hash": "policy:old"}),
            ("issuer_role", {"issuer_role": "agent_summary"}),
            ("authority_ceiling", {"requested_authority": 3}),
            ("conflict_ref", {"issuer_conflict_status": "conflicted"}),
            ("registry_snapshot", {"registry_snapshot": "registry:2"}),
            ("expiry", {"current_block": 250}),
            ("data_availability", {"data_availability_receipt": False}),
            ("preimage_available", {"preimage_available": False}),
            ("not_claiming", {"not_claiming": {"semantic_independence"}}),
            ("no_model_or_reputation_authority", {"source_basis": "model_output"}),
            ("issuer_not_source_author", {"issuer": "authorB"}),
        ],
    ),
    (
        "A5",
        a5,
        {
            "seller_bond_block": 100,
            "authority_root_block": 90,
            "control_root_block": 90,
            "disclosure_root_block": 90,
            "eligible_set_root_block": 90,
            "policy_root_block": 90,
            "claim_matrix_root_block": 90,
            "snapshot_hash_in_bond": True,
            "later_governance_root_used": False,
        },
        [
            ("authority_root", {"authority_root_block": 110}),
            ("control_root", {"control_root_block": 110}),
            ("disclosure_root", {"disclosure_root_block": 110}),
            ("eligible_set_root", {"eligible_set_root_block": 110}),
            ("policy_root", {"policy_root_block": 110}),
            ("claim_matrix_root", {"claim_matrix_root_block": 110}),
            ("snapshot_hash_in_bond", {"snapshot_hash_in_bond": False}),
            ("no_late_governance", {"later_governance_root_used": True}),
        ],
    ),
    (
        "A6",
        a6,
        {
            "availability_receipt": True,
            "content_addressed_manifest": True,
            "canonical_bundle_hash": True,
            "retention_until_block": 200,
            "deadline_block": 150,
            "required_recipients": {"buyer", "seller", "arbiter"},
            "recipient_commitments": {"buyer", "seller", "arbiter"},
            "key_commitments": True,
            "notice_block": 100,
            "min_response_window": 20,
            "response_windows": {"buyer": 50, "seller": 50, "arbiter": 50},
            "custody_location_sensitive": True,
            "disclosure_mode": "encrypted",
            "access_logs": True,
            "preimages_available_to_all": True,
        },
        [
            ("availability_receipt", {"availability_receipt": False}),
            ("content_addressed_manifest", {"content_addressed_manifest": False}),
            ("canonical_bundle_hash", {"canonical_bundle_hash": False}),
            ("retention", {"retention_until_block": 120}),
            ("recipient_commitments", {"recipient_commitments": {"buyer", "arbiter"}}),
            ("key_commitments", {"key_commitments": False}),
            ("notice_timestamp", {"notice_block": 140}),
            ("equal_response_windows", {"response_windows": {"buyer": 50, "seller": 10, "arbiter": 50}}),
            ("theft_sensitive_handling", {"disclosure_mode": "public"}),
            ("access_logs", {"access_logs": False}),
            ("preimages_available_to_all", {"preimages_available_to_all": False}),
        ],
    ),
    (
        "A7",
        a7,
        {
            "capacity_snapshot_before_commitment": True,
            "eligible_clusters_after_exclusions": 3,
            "clusters_after_largest_removed": 2,
            "slots_available": 150,
            "conservative_peak_demand": 100,
            "replay_sla_rate": 0.99,
            "conflicted_fallbacks": 0,
            "silent_same_subject_custodian_substitution": False,
            "largest_cluster_assignment_share": 0.33,
            "buyer_verifier_pair_share": 0.10,
            "seller_verifier_pair_share": 0.10,
            "assigned_exposure": 90,
            "reserved_capacity": 100,
            "capacity_failed": False,
            "route_status": "capacity_ok",
            "neutral_placement_claim": "allowed",
            "settlement_authority": "policy",
            "automatic_value_cap": 100,
        },
        [
            ("snapshot_before_commitment", {"capacity_snapshot_before_commitment": False}),
            ("clusters_after_exclusions", {"eligible_clusters_after_exclusions": 2}),
            ("remove_largest", {"clusters_after_largest_removed": 1}),
            ("peak_slots", {"slots_available": 149}),
            ("replay_sla", {"replay_sla_rate": 0.98}),
            ("zero_conflicted_fallbacks", {"conflicted_fallbacks": 1}),
            ("no_silent_custodian_substitution", {"silent_same_subject_custodian_substitution": True}),
            ("cluster_share", {"largest_cluster_assignment_share": 0.34}),
            ("buyer_verifier_pair", {"buyer_verifier_pair_share": 0.11}),
            ("seller_verifier_pair", {"seller_verifier_pair_share": 0.11}),
            ("reserved_capacity", {"assigned_exposure": 101}),
            (
                "failure_posture",
                {
                    "capacity_failed": True,
                    "route_status": "capacity_ok",
                    "neutral_placement_claim": "allowed",
                    "settlement_authority": "policy",
                    "automatic_value_cap": 100,
                },
            ),
        ],
    ),
]


def run() -> int:
    print("A1-A7 alpha-admission gates - per-subguard falsification drill\n" + "-" * 74)
    gates_ok = 0
    total_subs = 0
    passed_subs = 0
    for gid, fn, clean, subs in GATES:
        ok_clean, clean_reasons = fn(clean)
        gate_pass = ok_clean
        detail = []
        for sg, override in subs:
            attack = {**clean, **override}
            ok_attack, attack_reasons = fn(attack)
            blocked = not ok_attack
            admitted = fn(attack, off=frozenset({sg}))[0]
            teeth = blocked and admitted
            total_subs += 1
            passed_subs += 1 if teeth else 0
            gate_pass = gate_pass and teeth
            suffix = "ok" if teeth else f"FAIL(blocked={blocked}, admit_off={admitted}, reasons={attack_reasons})"
            detail.append(f"{sg}:{suffix}")
        if gate_pass:
            gates_ok += 1
        print(
            f"[{'PASS' if gate_pass else 'FAIL'}] {gid} clean_admits={ok_clean} "
            f"subguards {sum(1 for d in detail if d.endswith(':ok'))}/{len(subs)}"
        )
        if clean_reasons:
            print("        clean reasons: " + "; ".join(clean_reasons))
        print("        " + ", ".join(detail))
    print("-" * 74)
    print(f"{gates_ok}/{len(GATES)} gates pass - {passed_subs}/{total_subs} subguards have independent teeth")
    return 0 if gates_ok == len(GATES) and passed_subs == total_subs else 1


if __name__ == "__main__":
    raise SystemExit(run())
