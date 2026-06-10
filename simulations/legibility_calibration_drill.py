#!/usr/bin/env python3
"""Calibration drill for legibility vectors.

This drill does not authenticate cards. It checks whether structural evidence
vectors are kept separate from judged projections, and whether projected risk
bands are calibrated against settled outcomes.
"""

from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"

FORBIDDEN_VECTOR_FIELDS = {
    "score",
    "trust_score",
    "rating",
    "grade",
    "probability_of_truth",
    "authenticity_probability",
    "verdict",
}

DIMENSIONS = {
    "coverage",
    "independence",
    "continuity",
    "scope_fit",
    "cost_to_fake",
    "source_calibration",
}

TOP_LEVEL_ALLOWED_FIELDS = {
    "schema",
    "vector_id",
    "trade_id_or_session_id",
    "subject_ref",
    "gate_context",
    "emitted_by",
    "tool_or_agent_version",
    "input_refs",
    "dimensions",
    "human_summary",
    "no_aggregate_score",
    "canonicalization",
    "hash_algorithm",
    "signature_or_execution_receipt",
}

DIMENSION_ALLOWED_FIELDS = {
    "coverage": {"band", "present", "missing", "waived", "measured_by", "not_claiming"},
    "independence": {
        "band",
        "source_count",
        "party_count",
        "channel_count",
        "source_refs",
        "correlated_but_not_independent",
        "not_claiming",
    },
    "continuity": {
        "band",
        "checkpoints",
        "freshness_window",
        "breaks",
        "expired_refs",
        "not_claiming",
    },
    "scope_fit": {"band", "claim_supported", "gate_supported", "out_of_scope", "not_claiming"},
    "cost_to_fake": {"estimate_band", "rationale", "unpriced_attack_paths", "not_claiming"},
    "source_calibration": {
        "band",
        "cohort_ref",
        "sample_size",
        "outcome_window",
        "observed_claim_rate_bps",
        "observed_clean_settlement_rate_bps",
        "caveats",
        "not_claiming",
    },
}


@dataclass
class Cohort:
    cohort_ref: str
    description: str
    value_tier: str
    vector: dict[str, Any]
    policy_projection: dict[str, Any]
    settled_outcomes: list[str]
    expected_within_tolerance: bool = True
    minimum_tolerance_bps: int = 500
    result: dict[str, Any] = field(default_factory=dict)


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


# Prose-laundering tripwire: a clean-schema vector can still smuggle a verdict
# through free-text fields ("trust 94/100, safe to buy"). This is a heuristic,
# not a guarantee — agent instructions and review still police prose — but a
# vector that trips it is certainly laundering.
PROSE_AGGREGATE_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"\b\d{1,3}\s*/\s*(?:10|100)\b",
        r"\btrust\s+(?:score|meter|rating)\b",
        r"\bsafe\s+to\s+buy\b",
        r"\b\d{1,3}\s*%\s*safe\b",
        r"\boverall\s+(?:score|rating|grade)\b",
    )
]


def prose_aggregate_hits(value: Any, path: str = "") -> list[str]:
    hits: list[str] = []
    if isinstance(value, str):
        for pattern in PROSE_AGGREGATE_PATTERNS:
            if pattern.search(value):
                hits.append(f"{path or 'value'} matches {pattern.pattern!r}")
    elif isinstance(value, dict):
        for key, inner in value.items():
            hits.extend(prose_aggregate_hits(inner, f"{path}.{key}" if path else key))
    elif isinstance(value, list):
        for index, inner in enumerate(value):
            hits.extend(prose_aggregate_hits(inner, f"{path}[{index}]"))
    return hits


def has_forbidden_field(value: Any, path: str = "") -> list[str]:
    hits: list[str] = []
    if isinstance(value, dict):
        for key, inner in value.items():
            next_path = f"{path}.{key}" if path else key
            if key in FORBIDDEN_VECTOR_FIELDS:
                hits.append(next_path)
            hits.extend(has_forbidden_field(inner, next_path))
    elif isinstance(value, list):
        for index, inner in enumerate(value):
            hits.extend(has_forbidden_field(inner, f"{path}[{index}]"))
    return hits


def vector_signature(vector: dict[str, Any]) -> str:
    dimensions = vector["dimensions"]
    pieces = [
        dimensions["coverage"]["band"],
        dimensions["independence"]["band"],
        dimensions["continuity"]["band"],
        dimensions["scope_fit"]["band"],
        dimensions["cost_to_fake"]["estimate_band"],
        dimensions["source_calibration"]["band"],
    ]
    return "|".join(pieces)


def validate_vector(vector: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    missing_top = sorted(TOP_LEVEL_ALLOWED_FIELDS - set(vector))
    if missing_top:
        errors.append("missing top-level field(s): " + ", ".join(missing_top))
    unknown_top = sorted(set(vector) - TOP_LEVEL_ALLOWED_FIELDS)
    if unknown_top:
        errors.append("unknown top-level field(s): " + ", ".join(unknown_top))
    if vector.get("schema") != "marketplace.legibility_vector.v0.1":
        errors.append("wrong schema")
    if vector.get("no_aggregate_score") is not True:
        errors.append("no_aggregate_score must be true")
    forbidden = has_forbidden_field(vector)
    if forbidden:
        errors.append("forbidden aggregate field(s): " + ", ".join(forbidden))
    prose_hits = prose_aggregate_hits(vector)
    if prose_hits:
        errors.append("prose aggregate language: " + "; ".join(prose_hits))
    dimensions = vector.get("dimensions", {})
    if not isinstance(dimensions, dict):
        return errors + ["dimensions must be object"]
    missing_dimensions = sorted(DIMENSIONS - set(dimensions))
    if missing_dimensions:
        errors.append("missing dimension(s): " + ", ".join(missing_dimensions))
    unknown_dimensions = sorted(set(dimensions) - DIMENSIONS)
    if unknown_dimensions:
        errors.append("unknown dimension(s): " + ", ".join(unknown_dimensions))
    for name in sorted(DIMENSIONS & set(dimensions)):
        dimension = dimensions[name]
        if not isinstance(dimension, dict):
            errors.append(f"{name} must be object")
            continue
        allowed_fields = DIMENSION_ALLOWED_FIELDS[name]
        missing_fields = sorted(allowed_fields - set(dimension))
        if missing_fields:
            errors.append(f"{name} missing field(s): " + ", ".join(missing_fields))
        unknown_fields = sorted(set(dimension) - allowed_fields)
        if unknown_fields:
            errors.append(f"{name} unknown field(s): " + ", ".join(unknown_fields))
        if "not_claiming" not in dimensions[name]:
            errors.append(f"{name} missing not_claiming")
    return errors


def calibration_tolerance_bps(projected_claim_rate_bps: int, sample_size: int, minimum_bps: int) -> int:
    if sample_size <= 0:
        return 10000
    projected = max(0.0001, min(0.9999, projected_claim_rate_bps / 10000))
    # 95% normal-approximation binomial interval. This is deliberately simple:
    # the drill is testing shape, not doing production statistics.
    interval = 1.96 * math.sqrt(projected * (1 - projected) / sample_size) * 10000
    return max(minimum_bps, round(interval))


def evaluate_cohort(cohort: Cohort) -> dict[str, Any]:
    vector_errors = validate_vector(cohort.vector)
    total = len(cohort.settled_outcomes)
    claims = sum(1 for outcome in cohort.settled_outcomes if outcome != "clean_settlement")
    observed_claim_rate_bps = round((claims / total) * 10000) if total else 0
    projected_claim_rate_bps = int(cohort.policy_projection["projected_claim_rate_bps"])
    spread_bps = abs(observed_claim_rate_bps - projected_claim_rate_bps)
    tolerance_bps = calibration_tolerance_bps(
        projected_claim_rate_bps,
        total,
        cohort.minimum_tolerance_bps,
    )
    projection_is_separate = (
        cohort.policy_projection.get("schema") == "marketplace.agent_policy_projection.v0.1"
        and cohort.policy_projection.get("legibility_vector_ref") == cohort.vector["vector_id"]
        and cohort.policy_projection.get("authority_label") == "judged"
    )
    within_tolerance = spread_bps <= tolerance_bps
    result = {
        "cohort_ref": cohort.cohort_ref,
        "description": cohort.description,
        "value_tier": cohort.value_tier,
        "vector_id": cohort.vector["vector_id"],
        "vector_signature": vector_signature(cohort.vector),
        "vector_signature_note": "cohort key for calibration, not a score or verdict",
        "sample_size": total,
        "claim_count": claims,
        "projected_claim_rate_bps": projected_claim_rate_bps,
        "observed_claim_rate_bps": observed_claim_rate_bps,
        "spread_bps": spread_bps,
        "tolerance_bps": tolerance_bps,
        "tolerance_model": "95pct_binomial_normal_approximation_with_minimum_floor",
        "within_tolerance": within_tolerance,
        "expected_within_tolerance": cohort.expected_within_tolerance,
        "calibration_expectation_met": within_tolerance == cohort.expected_within_tolerance,
        "projection_is_separate_judgment": projection_is_separate,
        "vector_errors": vector_errors,
    }
    cohort.result = result
    return result


def vector(
    vector_id: str,
    *,
    coverage_band: str,
    independence_band: str,
    continuity_band: str,
    scope_band: str,
    cost_to_fake_band: str,
    source_calibration_band: str,
    observed_prior_claim_rate_bps: int,
    sample_size: int,
) -> dict[str, Any]:
    return {
        "schema": "marketplace.legibility_vector.v0.1",
        "vector_id": vector_id,
        "trade_id_or_session_id": f"session:{vector_id}",
        "subject_ref": f"subject:{vector_id}",
        "gate_context": "offer_review",
        "emitted_by": "simulated_legibility_tool",
        "tool_or_agent_version": "legibility_calibration_drill.v0.1",
        "input_refs": ["evidence_profile", "proof_vector_scope", "contact_receipts"],
        "dimensions": {
            "coverage": {
                "band": coverage_band,
                "present": ["front", "back"],
                "missing": [] if coverage_band in {"high", "complete"} else ["corner_closeups"],
                "waived": [],
                "measured_by": "evidence_profile_field_count",
                "not_claiming": ["honesty", "authenticity", "condition_truth"],
            },
            "independence": {
                "band": independence_band,
                "source_count": 1 if independence_band == "low" else 3,
                "party_count": 1 if independence_band == "low" else 2,
                "channel_count": 1 if independence_band == "low" else 3,
                "source_refs": ["seller_photo", "contact_receipt", "verifier_note"],
                "correlated_but_not_independent": ["seller_controlled_listing"],
                "not_claiming": ["independent_sources_prove_truth", "source_saw_physical_object"],
            },
            "continuity": {
                "band": continuity_band,
                "checkpoints": ["nonce_photo"] if continuity_band != "low" else ["stale_photo"],
                "freshness_window": "24h" if continuity_band == "high" else "unknown_or_stale",
                "breaks": [] if continuity_band == "high" else ["post_photo_custody_gap"],
                "expired_refs": [] if continuity_band != "low" else ["listing_photo"],
                "not_claiming": ["unbroken_custody", "swap_impossible"],
            },
            "scope_fit": {
                "band": scope_band,
                "claim_supported": ["item_reference", "evidence_shape"],
                "gate_supported": ["offer_review"],
                "out_of_scope": ["authenticity", "condition_truth"],
                "not_claiming": ["gate_spendability", "truth", "cross_gate_authority"],
            },
            "cost_to_fake": {
                "estimate_band": cost_to_fake_band,
                "rationale": "Attacker must defeat the named evidence shape, not the chain.",
                "unpriced_attack_paths": ["borrowed_real_card", "high_quality_counterfeit"],
                "not_claiming": ["fraud_impossible", "deterrence_adequate"],
            },
            "source_calibration": {
                "band": source_calibration_band,
                "cohort_ref": f"prior:{vector_id}",
                "sample_size": sample_size,
                "outcome_window": "simulated_prior_90d",
                "observed_claim_rate_bps": observed_prior_claim_rate_bps,
                "observed_clean_settlement_rate_bps": 10000 - observed_prior_claim_rate_bps,
                "caveats": ["simulated fixture", "not universal reputation"],
                "not_claiming": ["future_truth", "possession", "authenticity"],
            },
        },
        "human_summary": "Evidence shape is measurable, but the vector is not a verdict.",
        "no_aggregate_score": True,
        "canonicalization": "canonical-json-payload-v1",
        "hash_algorithm": "keccak256(utf8(canonical-json-payload-v1))",
        "signature_or_execution_receipt": "simulated-tool-receipt",
    }


def projection(vector_id: str, projected_claim_rate_bps: int, risk_band: str, decision: str) -> dict[str, Any]:
    return {
        "schema": "marketplace.agent_policy_projection.v0.1",
        "policy_id": "buyer_policy.alpha_calibration_fixture.v0.1",
        "legibility_vector_ref": vector_id,
        "authority_label": "judged",
        "buyer_aperture": "simulated_alpha_buyer",
        "projected_claim_rate_bps": projected_claim_rate_bps,
        "risk_band": risk_band,
        "decision": decision,
        "not_claiming": ["truth", "authenticity", "protocol_enforcement"],
    }


def outcomes(total: int, claims: int) -> list[str]:
    return ["claim_or_dispute"] * claims + ["clean_settlement"] * (total - claims)


def fixtures() -> list[Cohort]:
    return [
        Cohort(
            "shop_strong_vector",
            "Strong shop proof with broad photos and prior clean receipts.",
            "mid",
            vector(
                "lv_shop_strong",
                coverage_band="complete",
                independence_band="high",
                continuity_band="high",
                scope_band="high",
                cost_to_fake_band="high",
                source_calibration_band="strong",
                observed_prior_claim_rate_bps=650,
                sample_size=92,
            ),
            projection("lv_shop_strong", 700, "low_named_risk", "continue"),
            outcomes(30, 2),
        ),
        Cohort(
            "thin_seller_sparse_vector",
            "New seller with sparse but valid evidence and explicit gap disclosure.",
            "mid_high",
            vector(
                "lv_thin_sparse",
                coverage_band="partial",
                independence_band="low",
                continuity_band="medium",
                scope_band="medium",
                cost_to_fake_band="moderate",
                source_calibration_band="thin",
                observed_prior_claim_rate_bps=2100,
                sample_size=18,
            ),
            projection("lv_thin_sparse", 2200, "high_named_risk", "continue_only_with_waiver"),
            outcomes(20, 4),
        ),
        Cohort(
            "slab_cert_weak_binding_vector",
            "Slab cert lookup is present, but binding between slab and cert remains scoped.",
            "high",
            vector(
                "lv_slab_weak_binding",
                coverage_band="high",
                independence_band="medium",
                continuity_band="medium",
                scope_band="medium",
                cost_to_fake_band="moderate",
                source_calibration_band="medium",
                observed_prior_claim_rate_bps=1250,
                sample_size=40,
            ),
            projection("lv_slab_weak_binding", 1200, "medium_named_risk", "human_or_verifier_review"),
            outcomes(25, 3),
        ),
        Cohort(
            "quick_starter_sensitive_vector",
            "Quick Starter-sensitive trainer where text-layout laundering is a known trap.",
            "mid",
            vector(
                "lv_qs_sensitive",
                coverage_band="high",
                independence_band="medium",
                continuity_band="high",
                scope_band="medium",
                cost_to_fake_band="moderate",
                source_calibration_band="medium",
                observed_prior_claim_rate_bps=1850,
                sample_size=54,
            ),
            projection("lv_qs_sensitive", 1800, "high_named_variant_risk", "request_text_layout_check"),
            outcomes(20, 4),
        ),
        Cohort(
            "deliberately_miscalibrated_vector",
            "Adversarial fixture: policy projection understates risk and must be flagged.",
            "mid",
            vector(
                "lv_miscalibrated",
                coverage_band="high",
                independence_band="medium",
                continuity_band="medium",
                scope_band="medium",
                cost_to_fake_band="moderate",
                source_calibration_band="overconfident",
                observed_prior_claim_rate_bps=500,
                sample_size=60,
            ),
            projection("lv_miscalibrated", 500, "low_named_risk", "continue"),
            outcomes(50, 20),
            expected_within_tolerance=False,
        ),
    ]


def score_laundering_attempt() -> dict[str, Any]:
    bad = vector(
        "lv_bad_score",
        coverage_band="complete",
        independence_band="high",
        continuity_band="high",
        scope_band="high",
        cost_to_fake_band="high",
        source_calibration_band="strong",
        observed_prior_claim_rate_bps=200,
        sample_size=200,
    )
    bad["trust_score"] = 94
    bad["verdict"] = "safe_to_buy"
    bad["confidence"] = 94
    bad["safety_index"] = "A"
    bad["dimensions"]["coverage"]["overall"] = 94
    return {
        "attempt": "composite trust meter",
        "expected": "blocked_score_laundering",
        "errors": validate_vector(bad),
    }


def prose_laundering_attempt() -> dict[str, Any]:
    bad = vector(
        "lv_bad_prose",
        coverage_band="complete",
        independence_band="high",
        continuity_band="high",
        scope_band="high",
        cost_to_fake_band="high",
        source_calibration_band="strong",
        observed_prior_claim_rate_bps=200,
        sample_size=200,
    )
    bad["human_summary"] = "Coverage is complete. Overall trust 94/100, safe to buy."
    bad["dimensions"]["cost_to_fake"]["rationale"] = "Trust score is strong for this seller."
    return {
        "attempt": "prose trust meter in clean schema",
        "expected": "blocked_prose_laundering",
        "errors": validate_vector(bad),
    }


def write_report(run_dir: Path, cohorts: list[Cohort], blocked_attempts: list[dict[str, Any]]) -> bool:
    results = [evaluate_cohort(cohort) for cohort in cohorts]
    all_blocked = all(bool(attempt["errors"]) for attempt in blocked_attempts)
    passed = (
        all(not result["vector_errors"] for result in results)
        and all(result["projection_is_separate_judgment"] for result in results)
        and all(result["calibration_expectation_met"] for result in results)
        and all_blocked
    )
    summary = {
        "run_id": run_dir.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "passed": passed,
        "pass_definition": "Legibility vectors remain vector-shaped, policy projection is separate judgment, calibrated cohorts stay within tolerance, miscalibrated cohorts are detected, and field-level and prose-level score laundering are blocked.",
        "blocked_laundering_attempts": blocked_attempts,
        "cohorts": results,
    }
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (run_dir / "legibility_vectors.json").write_text(
        json.dumps([cohort.vector for cohort in cohorts], indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (run_dir / "policy_projections.json").write_text(
        json.dumps([cohort.policy_projection for cohort in cohorts], indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    lines = [
        f"# Legibility Calibration Drill: {run_dir.name}",
        "",
        f"- Passed: `{passed}`",
        "- Pass definition: vectors stay unaggregated, policy projection remains judged, calibrated cohorts stay within tolerance, miscalibrated cohorts are detected, and field-level and prose-level score laundering are blocked.",
        "",
        "## Rule Under Test",
        "",
        "The protocol may measure legibility, but it must never aggregate legibility into a verdict. A vector can inform a buyer-agent policy; the policy owns the judgment. Vector signatures are cohort keys for calibration, not mini-scores.",
        "",
        "## Score-Laundering Attempts",
        "",
    ]
    for attempt in blocked_attempts:
        lines.extend(
            [
                f"### {attempt['attempt']}",
                "",
                f"- Expected: `{attempt['expected']}`",
                f"- Blocked: `{bool(attempt['errors'])}`",
                "- Errors:",
            ]
        )
        for error in attempt["errors"]:
            lines.append(f"  - {error}")
        lines.append("")
    lines.extend(["## Cohorts", ""])
    for result in results:
        lines.extend(
            [
                f"### {result['cohort_ref']}",
                "",
                f"- Vector signature: `{result['vector_signature']}`",
                f"- Signature note: {result['vector_signature_note']}",
                f"- Sample size: `{result['sample_size']}`",
                f"- Projected claim rate: `{result['projected_claim_rate_bps']} bps`",
                f"- Observed claim rate: `{result['observed_claim_rate_bps']} bps`",
                f"- Spread: `{result['spread_bps']} bps`",
                f"- Tolerance: `{result['tolerance_bps']} bps` ({result['tolerance_model']})",
                f"- Within tolerance: `{result['within_tolerance']}`",
                f"- Expected within tolerance: `{result['expected_within_tolerance']}`",
                f"- Calibration expectation met: `{result['calibration_expectation_met']}`",
                f"- Projection separate judgment: `{result['projection_is_separate_judgment']}`",
                "",
            ]
        )
    lines.extend(
        [
            "## What This Proves",
            "",
            "- The vector measures evidence structure without claiming truth.",
            "- The buyer policy projection is separate and labeled `judged`.",
            "- Calibration is measured against settled outcomes, not asserted by a trust meter.",
            "- A deliberately miscalibrated cohort is detected as overconfident.",
            "- A composite score/verdict is blocked as certainty laundering.",
            "- A verdict smuggled through free-text fields trips the prose heuristic.",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return passed


def main() -> int:
    run_dir = RUNS / f"legibility_calibration_drill_{utc_stamp()}"
    passed = write_report(
        run_dir,
        fixtures(),
        [score_laundering_attempt(), prose_laundering_attempt()],
    )
    print(f"Wrote {run_dir / 'REPORT.md'}")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
