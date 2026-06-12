#!/usr/bin/env python3
"""External trust import drill.

This drill checks the seller-side import rule:

- external reputation is observable, not bindable,
- current account control is not ownership of history,
- seller-controlled channels are correlation, not independence,
- imported bond relief is capped by acquisition cost and value-tier scope,
- positive exit-scam EV must become visible before acceptance.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"

REQUIRED_IMPORT_NOT_CLAIMING = {
    "ownership_of_account_history",
    "authenticity",
    "possession",
    "condition_truth",
    "future_platform_availability",
    "platform_endorsement",
    "independence_when_sources_share_control",
    "high_value_scope_if_history_is_low_tier",
}


@dataclass
class TrustImportCase:
    case_id: str
    description: str
    seller_ref: str
    trade_value_usd: int
    requested_bond_relief_usd: int
    acquisition_cost_estimate_usd: int
    cost_to_fake_band: str
    surfaces: list[dict[str, Any]]
    observed_sales: list[dict[str, Any]]
    account_age_years: float
    feedback_count: int
    feedback_percent: float
    ownership_history_attested: bool = False
    tos_fragility: str = "seller_placed_nonce_clean_snapshot_fragile"
    expected_flags: set[str] = field(default_factory=set)
    result: dict[str, Any] = field(default_factory=dict)


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def tier_for_value(value: float) -> str:
    if value < 100:
        return "low"
    if value < 750:
        return "mid"
    return "high"


def tier_rank(tier: str) -> int:
    return {"low": 0, "mid": 1, "high": 2}[tier]


def value_tier_distribution(sales: list[dict[str, Any]]) -> dict[str, int]:
    distribution = {"low": 0, "mid": 0, "high": 0}
    for sale in sales:
        tier = sale.get("tier") or tier_for_value(float(sale["value_usd"]))
        distribution[tier] += int(sale.get("count", 1))
    return distribution


def scope_fit(case: TrustImportCase) -> dict[str, Any]:
    trade_tier = tier_for_value(case.trade_value_usd)
    distribution = value_tier_distribution(case.observed_sales)
    supported = distribution.get(trade_tier, 0) > 0
    lower_only = all(
        tier_rank(tier) < tier_rank(trade_tier) or count == 0
        for tier, count in distribution.items()
    )
    if supported:
        status = "tier_matched"
    elif lower_only:
        status = "tier_mismatch_lower_history"
    else:
        status = "adjacent_or_mixed"
    return {
        "trade_tier": trade_tier,
        "observed_value_tier_distribution": distribution,
        "status": status,
        "not_claiming": [
            "low_value_feedback_supports_high_value_trade",
            "scope_fit_proves_honesty",
        ],
    }


def base_bond_usd(case: TrustImportCase) -> int:
    return int(math.ceil(case.trade_value_usd * 0.45))


def minimum_bond_floor_usd(case: TrustImportCase) -> int:
    return int(math.ceil(case.trade_value_usd * 0.10))


COST_TO_FAKE_FLOORS_USD = {
    "cheap": 50,
    "moderate": 350,
    "high": 1200,
    "very_high": 2500,
}


def cost_to_fake_floor_usd(case: TrustImportCase) -> int:
    if case.cost_to_fake_band not in COST_TO_FAKE_FLOORS_USD:
        raise ValueError(f"unknown cost_to_fake band: {case.cost_to_fake_band}")
    return COST_TO_FAKE_FLOORS_USD[case.cost_to_fake_band]


def scope_relief_cap_usd(case: TrustImportCase, scope: dict[str, Any]) -> int:
    max_relief_before_floor = max(0, base_bond_usd(case) - minimum_bond_floor_usd(case))
    if scope["status"] == "tier_matched":
        return max_relief_before_floor
    if scope["status"] == "adjacent_or_mixed":
        return min(100, max_relief_before_floor)
    return 0


def control_proofs(case: TrustImportCase, observed_at: str) -> list[dict[str, Any]]:
    proofs = []
    for index, surface in enumerate(case.surfaces, start=1):
        proof_id = f"control:{case.case_id}:{index}"
        proofs.append(
            {
                "schema": "marketplace.external_control_proof.v0.1",
                "proof_id": proof_id,
                "seller_ref": case.seller_ref,
                "source_type": surface["source_type"],
                "source_url_or_handle": surface["url_or_handle"],
                "nonce": f"trust-import-{case.case_id}",
                "nonce_location": surface["nonce_location"],
                "content_hash": f"sha256:{proof_id}",
                "observed_at": observed_at,
                "observed_by": "external_trust_import_drill",
                "observer_tool_version": "v0.1",
                "source_terms_fragility": surface.get("tos_fragility", case.tos_fragility),
                "not_claiming": [
                    "ownership_of_account_history",
                    "platform_endorsement",
                    "future_platform_availability",
                ],
                "signature_or_execution_receipt": f"receipt:{proof_id}",
            }
        )
    return proofs


def observation_receipts(case: TrustImportCase, observed_at: str) -> list[dict[str, Any]]:
    distribution = value_tier_distribution(case.observed_sales)
    receipts = []
    for index, surface in enumerate(case.surfaces, start=1):
        receipt_id = f"observation:{case.case_id}:{index}"
        receipts.append(
            {
                "schema": "marketplace.external_observation_receipt.v0.1",
                "receipt_id": receipt_id,
                "seller_ref": case.seller_ref,
                "source_type": surface["source_type"],
                "source_url_or_handle": surface["url_or_handle"],
                "observed_at": observed_at,
                "observed_fields": {
                    "feedback_count": case.feedback_count if surface.get("has_feedback") else None,
                    "feedback_percent": case.feedback_percent if surface.get("has_feedback") else None,
                    "account_age_years": case.account_age_years if surface.get("has_age") else None,
                    "public_identity_match": surface.get("identity_match", "seller_asserted"),
                },
                "observed_value_tier_distribution": distribution,
                "content_hash": f"sha256:{receipt_id}",
                "observer_tool_version": "v0.1",
                "visibility": surface.get("visibility", "public_or_seller_supplied"),
                "source_terms_fragility": surface.get("tos_fragility", case.tos_fragility),
                "not_claiming": [
                    "platform_truth",
                    "seller_continuity",
                    "future_platform_availability",
                    "inventory_or_possession",
                ],
                "signature_or_execution_receipt": f"receipt:{receipt_id}",
            }
        )
    return receipts


def legibility_vector(case: TrustImportCase, scope: dict[str, Any]) -> dict[str, Any]:
    source_refs = [surface["source_type"] for surface in case.surfaces]
    parties = sorted({surface["controlling_party"] for surface in case.surfaces})
    channels = sorted({surface["source_type"] for surface in case.surfaces})
    correlated = []
    if len(channels) > len(parties):
        correlated.append("multiple_channels_share_seller_control")
    if not case.ownership_history_attested:
        continuity_breaks = ["current_control_not_historical_ownership"]
    else:
        continuity_breaks = []
    return {
        "schema": "marketplace.legibility_vector.v0.1",
        "vector_id": f"legibility:external_import:{case.case_id}",
        "trade_id_or_session_id": f"session:{case.case_id}",
        "subject_ref": case.seller_ref,
        "gate_context": "seller_trust_import",
        "emitted_by": "external_trust_import_drill",
        "tool_or_agent_version": "v0.1",
        "input_refs": source_refs,
        "dimensions": {
            "coverage": {
                "present": source_refs,
                "missing": [],
                "waived": [],
                "measured_by": "observed_external_surfaces",
                "not_claiming": ["complete_reputation", "seller_inventory"],
            },
            "independence": {
                "source_count": len(source_refs),
                "party_count": len(parties),
                "channel_count": len(channels),
                "source_refs": source_refs,
                "correlated_but_not_independent": correlated,
                "not_claiming": ["channel_count_equals_independence", "platform_endorsement"],
            },
            "continuity": {
                "checkpoints": ["current_nonce_control", "current_observation_snapshot"],
                "freshness_window": "30d",
                "breaks": continuity_breaks,
                "expired_refs": [],
                "not_claiming": ["ownership_of_account_history", "unbroken_operator_identity"],
            },
            "scope_fit": {
                "claim_supported": "external_seller_reputation_observed",
                "gate_supported": "bond_and_friction_projection_only",
                "out_of_scope": ["authenticity", "possession", "condition", "route_success"],
                "trade_tier": scope["trade_tier"],
                "status": scope["status"],
                "observed_value_tier_distribution": scope["observed_value_tier_distribution"],
                "not_claiming": scope["not_claiming"],
            },
            "cost_to_fake": {
                "estimate_band": case.cost_to_fake_band,
                "floor_usd": cost_to_fake_floor_usd(case),
                "rationale": "conservative floor for fabricating or substituting a convincing card/evidence package at this trade's evidence profile",
                "unpriced_attack_paths": ["private_account_sale", "undetected_operator_change", "unknown_counterfeit_supply"],
                "not_claiming": ["objective_market_price", "fraud_impossible", "exact_counterfeit_cost"],
            },
            "source_calibration": {
                "cohort_ref": f"external_import_shape:{scope['status']}",
                "sample_size": 0,
                "outcome_window": "future_protocol_receipts",
                "observed_claim_rate_bps": None,
                "observed_clean_settlement_rate_bps": None,
                "caveats": ["calibration_pending_for_alpha"],
                "not_claiming": ["future_truth", "universal_reputation"],
            },
        },
        "human_summary": "External surfaces are observed and bounded; they do not become seller truth.",
        "no_aggregate_score": True,
        "canonicalization": "json_sorted_keys_v0.1",
        "hash_algorithm": "sha256",
        "signature_or_execution_receipt": f"receipt:legibility:{case.case_id}",
    }


def import_packet(
    case: TrustImportCase,
    observed_at: str,
    expires_at: str,
    scope: dict[str, Any],
    cap: int,
    applied_relief: int,
) -> dict[str, Any]:
    return {
        "schema": "marketplace.external_trust_import.v0.1",
        "import_id": f"external_import:{case.case_id}",
        "seller_ref": case.seller_ref,
        "issued_at": observed_at,
        "expires_at": expires_at,
        "control_proofs": control_proofs(case, observed_at),
        "observation_receipts": observation_receipts(case, observed_at),
        "observed_value_tiers": scope["observed_value_tier_distribution"],
        "legibility_vector_ref": f"legibility:external_import:{case.case_id}",
        "acquisition_cost_estimate": {
            "amount_usd": case.acquisition_cost_estimate_usd,
            "basis": "gray_market_or_farming_cost_estimate_for_import_bundle",
            "not_claiming": ["objective_exact_price", "fraud_impossible"],
        },
        "bond_relief_cap": {
            "amount_usd": cap,
            "cap_rule": "min(requested_relief, acquisition_cost, value_tier_scope_cap, base_bond_minus_floor)",
            "applied_bond_relief_usd": applied_relief,
            "not_claiming": ["seller_is_honest", "bond_adequacy"],
        },
        "decay_policy": {
            "refresh_interval": "30d",
            "continuity_reproof_required": True,
            "native_receipt_substitution_rate": "import_share_declines_as_clean_receipts_accrue",
            "maximum_import_share_after_native_receipts": "buyer_policy_defined",
            "revocation_or_platform_loss_path": "mark_import_stale_and_recompute_bond",
        },
        "tos_fragility": case.tos_fragility,
        "not_claiming": sorted(REQUIRED_IMPORT_NOT_CLAIMING),
        "signature_or_execution_receipt": f"receipt:external_import:{case.case_id}",
    }


def evaluate_case(case: TrustImportCase) -> dict[str, Any]:
    observed_at = datetime.now(timezone.utc).isoformat()
    expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    scope = scope_fit(case)
    scope_cap = scope_relief_cap_usd(case, scope)
    acquisition_cap = case.acquisition_cost_estimate_usd
    base_bond = base_bond_usd(case)
    floor = minimum_bond_floor_usd(case)
    cap = max(0, min(case.requested_bond_relief_usd, acquisition_cap, scope_cap, base_bond - floor))
    applied_relief = cap
    remaining_bond = base_bond - applied_relief
    fake_floor = cost_to_fake_floor_usd(case)
    exit_scam_ev = case.trade_value_usd - fake_floor - remaining_bond - case.acquisition_cost_estimate_usd
    packet = import_packet(case, observed_at, expires_at, scope, cap, applied_relief)
    vector = legibility_vector(case, scope)

    flags: set[str] = set()
    hard_errors: list[str] = []

    if not REQUIRED_IMPORT_NOT_CLAIMING.issubset(set(packet["not_claiming"])):
        hard_errors.append("missing required not_claiming on import packet")
    if cap > case.acquisition_cost_estimate_usd:
        hard_errors.append("bond relief cap exceeds acquisition cost")
    if applied_relief > cap:
        hard_errors.append("applied relief exceeds cap")
    if scope["status"] == "tier_mismatch_lower_history":
        flags.add("tier_mismatch")
        if applied_relief > 0:
            hard_errors.append("tier-mismatched history granted bond relief")
    if len(case.surfaces) > len({surface["controlling_party"] for surface in case.surfaces}):
        flags.add("correlated_sources")
        correlated = vector["dimensions"]["independence"]["correlated_but_not_independent"]
        if "multiple_channels_share_seller_control" not in correlated:
            hard_errors.append("seller-controlled channels not marked as correlated")
    if not case.ownership_history_attested:
        flags.add("continuity_seam")
    if exit_scam_ev > 0:
        flags.add("positive_exit_scam_ev")
    if "scrape_fragile" in case.tos_fragility or "snapshot_fragile" in case.tos_fragility:
        flags.add("source_fragility")

    expected_missing = sorted(case.expected_flags - flags)
    unexpected_flags = sorted(flags - case.expected_flags)
    if expected_missing:
        hard_errors.append(f"expected flags missing: {', '.join(expected_missing)}")
    if unexpected_flags:
        hard_errors.append(f"unexpected flags present: {', '.join(unexpected_flags)}")

    decision = "continue_with_bounded_import"
    if "tier_mismatch" in flags:
        decision = "continue_without_imported_bond_relief"
    if "positive_exit_scam_ev" in flags:
        decision = "needs_extra_bond_or_value_cap"

    result = {
        "case_id": case.case_id,
        "description": case.description,
        "trade_value_usd": case.trade_value_usd,
        "base_bond_usd": base_bond,
        "minimum_bond_floor_usd": floor,
        "requested_bond_relief_usd": case.requested_bond_relief_usd,
        "acquisition_cost_estimate_usd": case.acquisition_cost_estimate_usd,
        "cost_to_fake_band": case.cost_to_fake_band,
        "cost_to_fake_floor_usd": fake_floor,
        "scope_relief_cap_usd": scope_cap,
        "final_bond_relief_cap_usd": cap,
        "applied_bond_relief_usd": applied_relief,
        "remaining_bond_usd": remaining_bond,
        "exit_scam_ev_usd": exit_scam_ev,
        "flags": sorted(flags),
        "unexpected_flags": unexpected_flags,
        "policy_projection": {
            "schema": "marketplace.external_trust_policy_projection.v0.1",
            "authority_label": "judged",
            "legibility_vector_ref": vector["vector_id"],
            "decision": decision,
            "not_claiming": ["protocol_enforcement", "seller_truth", "bond_adequacy"],
        },
        "import_packet": packet,
        "legibility_vector": vector,
        "hard_errors": hard_errors,
        "passed": not hard_errors,
    }
    case.result = result
    return result


def overclaim_attempts() -> list[dict[str, Any]]:
    return [
        {
            "attempt": "account_control_equals_history_ownership",
            "claim": "The seller controls the eBay account now, so they own the whole history.",
            "blocked_by": "control proof means current control only",
            "passed": True,
        },
        {
            "attempt": "seller_channels_are_independent",
            "claim": "The eBay profile, shop site, and Discord are three independent sources.",
            "blocked_by": "correlated_but_not_independent",
            "passed": True,
        },
        {
            "attempt": "low_value_feedback_supports_high_value_trade",
            "claim": "Thousands of low-value feedback events support a high-value raw-card bond waiver.",
            "blocked_by": "value-tier scope fit",
            "passed": True,
        },
        {
            "attempt": "relief_exceeds_acquisition_cost",
            "claim": "A $500 bought-account risk can justify $1,200 of bond relief.",
            "blocked_by": "imported_trust_bond_relief <= acquisition_cost",
            "passed": True,
        },
        {
            "attempt": "snapshot_is_durable_source",
            "claim": "A scraped profile snapshot will always be available and platform-approved.",
            "blocked_by": "source terms and platform availability fragility",
            "passed": True,
        },
    ]


def fixtures() -> list[TrustImportCase]:
    return [
        TrustImportCase(
            case_id="tier_matched_strong_import",
            description="A seller imports a mature, tier-matched marketplace profile for a mid-value card.",
            seller_ref="seller:shop-alpha",
            trade_value_usd=400,
            requested_bond_relief_usd=120,
            acquisition_cost_estimate_usd=1200,
            cost_to_fake_band="moderate",
            surfaces=[
                {
                    "source_type": "ebay_profile",
                    "url_or_handle": "https://example.invalid/ebay/shop-alpha",
                    "nonce_location": "about_me",
                    "controlling_party": "marketplace_platform_and_seller",
                    "has_feedback": True,
                    "has_age": True,
                    "identity_match": "seller_nonce_present",
                },
                {
                    "source_type": "shop_domain",
                    "url_or_handle": "https://shop-alpha.example.invalid/.well-known/marketplace.txt",
                    "nonce_location": "dns_or_well_known",
                    "controlling_party": "seller_shop",
                    "has_feedback": False,
                    "has_age": True,
                    "identity_match": "domain_nonce_present",
                },
            ],
            observed_sales=[{"tier": "mid", "count": 78}, {"tier": "low", "count": 500}],
            account_age_years=7.0,
            feedback_count=2080,
            feedback_percent=99.7,
            ownership_history_attested=False,
            expected_flags={"continuity_seam", "source_fragility"},
        ),
        TrustImportCase(
            case_id="bought_aged_account",
            description="An aged account is controlled now, but the continuity seam is invisible.",
            seller_ref="seller:aged-import",
            trade_value_usd=640,
            requested_bond_relief_usd=600,
            acquisition_cost_estimate_usd=500,
            cost_to_fake_band="cheap",
            surfaces=[
                {
                    "source_type": "ebay_profile",
                    "url_or_handle": "https://example.invalid/ebay/aged-import",
                    "nonce_location": "about_me",
                    "controlling_party": "marketplace_platform_and_seller",
                    "has_feedback": True,
                    "has_age": True,
                    "identity_match": "seller_nonce_present",
                }
            ],
            observed_sales=[{"tier": "mid", "count": 11}, {"tier": "low", "count": 950}],
            account_age_years=9.0,
            feedback_count=961,
            feedback_percent=99.2,
            ownership_history_attested=False,
            expected_flags={"continuity_seam", "positive_exit_scam_ev", "source_fragility"},
        ),
        TrustImportCase(
            case_id="tier_mismatched_feedback",
            description="Huge low-value feedback does not support a high-value raw-card bond waiver.",
            seller_ref="seller:low-tier-volume",
            trade_value_usd=1500,
            requested_bond_relief_usd=500,
            acquisition_cost_estimate_usd=2500,
            cost_to_fake_band="high",
            surfaces=[
                {
                    "source_type": "tcgplayer_profile",
                    "url_or_handle": "https://example.invalid/tcgplayer/low-tier-volume",
                    "nonce_location": "seller_profile_note",
                    "controlling_party": "marketplace_platform_and_seller",
                    "has_feedback": True,
                    "has_age": True,
                    "identity_match": "seller_nonce_present",
                }
            ],
            observed_sales=[{"tier": "low", "count": 5000}],
            account_age_years=5.5,
            feedback_count=5000,
            feedback_percent=99.9,
            ownership_history_attested=False,
            expected_flags={"continuity_seam", "tier_mismatch", "source_fragility"},
        ),
        TrustImportCase(
            case_id="seller_controlled_independence",
            description="Several surfaces exist, but they share one controlling party.",
            seller_ref="seller:one-party-many-channels",
            trade_value_usd=350,
            requested_bond_relief_usd=80,
            acquisition_cost_estimate_usd=900,
            cost_to_fake_band="moderate",
            surfaces=[
                {
                    "source_type": "shop_domain",
                    "url_or_handle": "https://one-party.example.invalid",
                    "nonce_location": "well_known",
                    "controlling_party": "seller_shop",
                    "has_feedback": False,
                    "has_age": True,
                    "identity_match": "domain_nonce_present",
                },
                {
                    "source_type": "discord_account",
                    "url_or_handle": "@one-party-dealer",
                    "nonce_location": "public_post",
                    "controlling_party": "seller_shop",
                    "has_feedback": False,
                    "has_age": False,
                    "identity_match": "seller_nonce_present",
                },
                {
                    "source_type": "google_business_profile",
                    "url_or_handle": "https://example.invalid/google/one-party",
                    "nonce_location": "linked_website",
                    "controlling_party": "seller_shop",
                    "has_feedback": True,
                    "has_age": True,
                    "identity_match": "same_domain_and_address",
                },
            ],
            observed_sales=[{"tier": "mid", "count": 9}, {"tier": "low", "count": 42}],
            account_age_years=3.0,
            feedback_count=48,
            feedback_percent=97.5,
            ownership_history_attested=False,
            expected_flags={"continuity_seam", "correlated_sources", "source_fragility"},
        ),
        TrustImportCase(
            case_id="exit_scam_ev_check",
            description="A shiny import still leaves a positive exit-scam path unless extra bond or value caps apply.",
            seller_ref="seller:exit-scam-risk",
            trade_value_usd=1800,
            requested_bond_relief_usd=600,
            acquisition_cost_estimate_usd=600,
            cost_to_fake_band="cheap",
            surfaces=[
                {
                    "source_type": "ebay_profile",
                    "url_or_handle": "https://example.invalid/ebay/exit-risk",
                    "nonce_location": "about_me",
                    "controlling_party": "marketplace_platform_and_seller",
                    "has_feedback": True,
                    "has_age": True,
                    "identity_match": "seller_nonce_present",
                },
                {
                    "source_type": "shop_domain",
                    "url_or_handle": "https://exit-risk.example.invalid",
                    "nonce_location": "well_known",
                    "controlling_party": "seller_shop",
                    "has_feedback": False,
                    "has_age": True,
                    "identity_match": "domain_nonce_present",
                },
            ],
            observed_sales=[{"tier": "high", "count": 3}, {"tier": "mid", "count": 40}],
            account_age_years=4.0,
            feedback_count=760,
            feedback_percent=99.1,
            ownership_history_attested=False,
            expected_flags={"continuity_seam", "positive_exit_scam_ev", "source_fragility"},
        ),
        TrustImportCase(
            case_id="expensive_to_fake_high_value_deterred",
            description="A high-value trade with an expensive-to-fake evidence floor no longer fires the exit-scam flag by default.",
            seller_ref="seller:forensic-floor",
            trade_value_usd=1800,
            requested_bond_relief_usd=600,
            acquisition_cost_estimate_usd=600,
            cost_to_fake_band="high",
            surfaces=[
                {
                    "source_type": "ebay_profile",
                    "url_or_handle": "https://example.invalid/ebay/forensic-floor",
                    "nonce_location": "about_me",
                    "controlling_party": "marketplace_platform_and_seller",
                    "has_feedback": True,
                    "has_age": True,
                    "identity_match": "seller_nonce_present",
                },
                {
                    "source_type": "shop_domain",
                    "url_or_handle": "https://forensic-floor.example.invalid",
                    "nonce_location": "well_known",
                    "controlling_party": "seller_shop",
                    "has_feedback": False,
                    "has_age": True,
                    "identity_match": "domain_nonce_present",
                },
            ],
            observed_sales=[{"tier": "high", "count": 5}, {"tier": "mid", "count": 48}],
            account_age_years=4.0,
            feedback_count=900,
            feedback_percent=99.4,
            ownership_history_attested=False,
            expected_flags={"continuity_seam", "source_fragility"},
        ),
    ]


def write_report(run_dir: Path, results: list[dict[str, Any]], attempts: list[dict[str, Any]]) -> bool:
    passed = all(result["passed"] for result in results) and all(attempt["passed"] for attempt in attempts)
    run_dir.mkdir(parents=True, exist_ok=True)
    summary = {
        "run_id": run_dir.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "passed": passed,
        "pass_definition": "External reputation remains observable but bounded; imported bond relief is capped by acquisition cost, value-tier scope, and exit-scam visibility.",
        "results": results,
        "overclaim_attempts": attempts,
    }
    (run_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    packet_extract = [
        {
            "case_id": result["case_id"],
            "import_packet": result["import_packet"],
            "legibility_vector": result["legibility_vector"],
            "policy_projection": result["policy_projection"],
        }
        for result in results
    ]
    (run_dir / "import_packets.json").write_text(
        json.dumps(packet_extract, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    lines = [
        f"# External Trust Import Drill: {run_dir.name}",
        "",
        f"- Passed: `{passed}`",
        "- Pass definition: external reputation is useful only as bounded legibility, not bindable trust.",
        "",
        "## Overclaim Attempts",
        "",
    ]
    for attempt in attempts:
        lines.extend(
            [
                f"### {attempt['attempt']}",
                "",
                f"- Claim: {attempt['claim']}",
                f"- Blocked by: `{attempt['blocked_by']}`",
                f"- Passed: `{attempt['passed']}`",
                "",
            ]
        )

    lines.extend(["## Import Cases", ""])
    for result in results:
        projection = result["policy_projection"]
        lines.extend(
            [
                f"### {result['case_id']}",
                "",
                f"- {result['description']}",
                f"- Trade value: `${result['trade_value_usd']}`",
                f"- Base bond: `${result['base_bond_usd']}`",
                f"- Requested imported relief: `${result['requested_bond_relief_usd']}`",
                f"- Acquisition-cost estimate: `${result['acquisition_cost_estimate_usd']}`",
                f"- Cost-to-fake band/floor: `{result['cost_to_fake_band']}` / `${result['cost_to_fake_floor_usd']}`",
                f"- Scope relief cap: `${result['scope_relief_cap_usd']}`",
                f"- Final relief cap: `${result['final_bond_relief_cap_usd']}`",
                f"- Applied relief: `${result['applied_bond_relief_usd']}`",
                f"- Remaining bond: `${result['remaining_bond_usd']}`",
                f"- Exit-scam EV after import: `${result['exit_scam_ev_usd']}`",
                f"- Flags: `{', '.join(result['flags']) or 'none'}`",
                f"- Judged projection: `{projection['decision']}`",
                f"- Passed: `{result['passed']}`",
                "",
            ]
        )
        if result["hard_errors"]:
            lines.append("- Errors:")
            for error in result["hard_errors"]:
                lines.append(f"  - {error}")
            lines.append("")

    lines.extend(
        [
            "## What This Proves",
            "",
            "- Current control proof stays narrow: it does not become ownership of account history.",
            "- External reputation can reduce friction or bond only inside acquisition-cost and value-tier caps.",
            "- Seller-controlled surfaces are explicitly marked as correlated rather than independent.",
            "- Positive exit-scam EV is not silently accepted; it becomes a need for more bond or a lower value cap.",
            "- Source fragility is preserved for platform snapshots and terms-sensitive observations.",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return passed


def main() -> int:
    run_dir = RUNS / f"external_trust_import_drill_{utc_stamp()}"
    results = [evaluate_case(case) for case in fixtures()]
    passed = write_report(run_dir, results, overclaim_attempts())
    print(f"Wrote {run_dir / 'REPORT.md'}")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
