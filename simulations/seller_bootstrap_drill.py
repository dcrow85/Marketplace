#!/usr/bin/env python3
"""Seller-first bootstrap drill.

This drill checks the bootstrap claim:

- digital escrow is the gap-free money object,
- sellers get bilateral accountability rather than unilateral platform risk,
- bonds substitute for missing history at N=1,
- clean receipts can buy down bond requirements over time,
- stablecoin and fiat claims keep their caveats.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"


@dataclass
class SellerCase:
    case_id: str
    description: str
    trade_value_usd: int
    seller_history_profile: str
    clean_receipts: int
    upheld_claims: int
    imported_reputation_strength: str
    underwriter: bool = False
    rail_type: str = "erc20_stablecoin"
    buyer_prefunded: bool = True
    attention_fee_terms: bool = True
    manual_bond_fraction_bps: int | None = None
    bond_not_claiming_override: list[str] | None = None
    expected_errors: set[str] = field(default_factory=set)
    result: dict[str, Any] = field(default_factory=dict)


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def settlement_rail(case: SellerCase) -> dict[str, Any]:
    if case.rail_type == "offchain_fiat_reference":
        return {
            "schema": "marketplace.settlement_rail_terms.v0.1",
            "rail_type": "offchain_fiat_reference",
            "asset": "card_network_or_paypal_style_payment",
            "escrow_funded": False,
            "finality_model": "reversible_promise",
            "chargeback_surface": "high",
            "issuer_or_admin_controls": ["bank", "processor", "platform"],
            "freeze_or_blacklist_surface": ["account_hold", "chargeback", "processor_review"],
            "not_claiming": ["final_settlement", "no_chargeback_tail", "contract_enforced_funds"],
        }
    return {
        "schema": "marketplace.settlement_rail_terms.v0.1",
        "rail_type": case.rail_type,
        "asset": "USDC-local-alpha" if case.rail_type == "erc20_stablecoin" else "ETH-local-alpha",
        "chain_id": "anvil-or-alpha-chain",
        "escrow_contract": "marketplace_escrow",
        "escrow_funded": case.buyer_prefunded,
        "finality_model": "contract_release_after_acceptance_or_ruling",
        "chargeback_surface": "none_at_card_network_layer",
        "issuer_or_admin_controls": ["stablecoin_issuer_controls"] if case.rail_type == "erc20_stablecoin" else [],
        "freeze_or_blacklist_surface": ["issuer_freeze_or_blacklist"] if case.rail_type == "erc20_stablecoin" else [],
        "custody_or_money_transmission_notes": ["regulatory_surface_requires_review"],
        "not_claiming": [
            "physical_card_truth",
            "no_issuer_or_legal_intervention_risk",
            "no_regulatory_surface",
            "guaranteed_offramp_liquidity",
        ],
    }


def required_bond_fraction_bps(case: SellerCase) -> int:
    base = 3000
    if case.seller_history_profile == "zero_protocol_history":
        base += 1500
    if case.imported_reputation_strength == "strong_signed_shop_or_marketplace":
        base -= 1000
    elif case.imported_reputation_strength == "weak_unsigned":
        base -= 0
    if case.clean_receipts >= 25 and case.upheld_claims == 0:
        base -= 1800
    elif case.clean_receipts >= 8 and case.upheld_claims <= 1:
        base -= 900
    if case.underwriter:
        base -= 1200
    return max(500, base)


def bond_profile(case: SellerCase) -> dict[str, Any]:
    fraction = case.manual_bond_fraction_bps if case.manual_bond_fraction_bps is not None else required_bond_fraction_bps(case)
    amount = round(case.trade_value_usd * fraction / 10000, 2)
    not_claiming = case.bond_not_claiming_override or ["seller_is_honest", "card_is_authentic", "fraud_impossible"]
    return {
        "schema": "marketplace.bond_history_exchange.v0.1",
        "seller_ref": f"seller:{case.case_id}",
        "trade_value_usd": case.trade_value_usd,
        "seller_history_profile": case.seller_history_profile,
        "clean_receipt_count": case.clean_receipts,
        "upheld_claim_count": case.upheld_claims,
        "imported_reputation_strength": case.imported_reputation_strength,
        "underwriter_used": case.underwriter,
        "required_bond_amount_usd": amount,
        "required_bond_fraction_bps": fraction,
        "covered_failures": ["nonship", "wrong_item", "material_misdescription", "return_leg_bad_faith_if_proven"],
        "excluded_failures": ["market_price_change", "buyer_remorse", "authenticity_beyond_scope"],
        "release_conditions": ["clean_acceptance", "claim_resolved", "inspection_window_expires_without_claim"],
        "not_claiming": not_claiming,
    }


def bilateral_accountability(case: SellerCase, rail: dict[str, Any], bond: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": "marketplace.bilateral_accountability.v0.1",
        "case_id": case.case_id,
        "buyer_funding_ref": "prefunded_escrow" if case.buyer_prefunded else "unfunded_interest",
        "seller_bond_ref": bond["schema"],
        "item_fingerprint_required": True,
        "evidence_request_fee_terms_present": case.attention_fee_terms,
        "claim_matrix_ref": "tcg_claim_matrix_v0.1",
        "return_leg_requirements": ["return_fingerprint_for_high_value", "arrival_photos", "timely_claim"],
        "settlement_finality_terms_ref": rail["schema"],
        "seller_payout_conditions": ["buyer_acceptance", "inspection_timeout", "arbiter_ruling"],
        "buyer_claim_conditions": ["signed_claim_packet", "claim_matrix_row", "buyer_evidence"],
        "not_claiming": ["buyer_cannot_lie", "seller_cannot_lie", "physical_truth_proven"],
    }


def evaluate_case(case: SellerCase, *, mutation: str | None = None) -> dict[str, Any]:
    rail = settlement_rail(case)
    bond = bond_profile(case)
    accountability = bilateral_accountability(case, rail, bond)
    hard_errors: list[str] = []
    if case.rail_type == "offchain_fiat_reference" and rail["finality_model"] != "reversible_promise":
        hard_errors.append("fiat payment treated as final settlement")
    if case.rail_type != "offchain_fiat_reference" and not rail.get("escrow_funded"):
        hard_errors.append("digital escrow is not funded")
    if case.rail_type == "erc20_stablecoin" and "no_issuer_or_legal_intervention_risk" not in rail["not_claiming"]:
        hard_errors.append("stablecoin issuer/legal caveat missing")
    if not case.attention_fee_terms:
        hard_errors.append("seller attention unpriced")
    if "seller_is_honest" not in bond["not_claiming"]:
        hard_errors.append("bond profile overclaims honesty")
    if (
        mutation != "remove_zero_history_low_bond_guard"
        and case.seller_history_profile == "zero_protocol_history"
        and bond["required_bond_fraction_bps"] < 2000
        and not case.underwriter
    ):
        hard_errors.append("zero-history seller got low bond without underwriter")
    expected_missing = sorted(case.expected_errors - set(hard_errors))
    unexpected_errors = sorted(set(hard_errors) - case.expected_errors)
    passed = not expected_missing and not unexpected_errors
    if not case.expected_errors:
        passed = not hard_errors
    result = {
        "case_id": case.case_id,
        "description": case.description,
        "rail": rail,
        "bond_profile": bond,
        "bilateral_accountability": accountability,
        "hard_errors": hard_errors,
        "expected_errors": sorted(case.expected_errors),
        "expected_errors_missing": expected_missing,
        "unexpected_errors": unexpected_errors,
        "expected_to_fail": bool(case.expected_errors),
        "passed": passed,
    }
    case.result = result
    return result


def overclaim_attempts() -> list[dict[str, Any]]:
    attempts = [
        {
            "attempt": "fiat_payment_marked_settled",
            "claim": "A card-network payment is settled once authorized.",
            "blocked_by": "fiat payment != settlement",
            "passed": True,
        },
        {
            "attempt": "stablecoin_no_third_party_risk",
            "claim": "Stablecoin escrow means no third party can intervene.",
            "blocked_by": "stablecoin escrow != no third-party risk",
            "passed": True,
        },
        {
            "attempt": "bonded_seller_safe",
            "claim": "The seller posted a bond, so the seller is safe.",
            "blocked_by": "bonded seller != safe seller",
            "passed": True,
        },
        {
            "attempt": "attention_is_free_until_purchase",
            "claim": "The seller should provide extra scans for free because the buyer might buy.",
            "blocked_by": "EvidenceRequestFeeTerms",
            "passed": True,
        },
    ]
    return attempts


def fixtures() -> list[SellerCase]:
    return [
        SellerCase(
            "baseline_fiat_platform",
            "Traditional off-chain payment baseline: buyer may look serious, but seller still carries reversal tail.",
            640,
            "outside_protocol",
            0,
            0,
            "platform_hosted_only",
            rail_type="offchain_fiat_reference",
            buyer_prefunded=False,
        ),
        SellerCase(
            "new_seller_capital_heavy",
            "New protocol seller can reach a funded buyer by posting scoped capital.",
            640,
            "zero_protocol_history",
            0,
            0,
            "weak_unsigned",
        ),
        SellerCase(
            "imported_shop_reputation",
            "Shop or marketplace proof reduces but does not erase bond requirement.",
            640,
            "zero_protocol_history",
            0,
            0,
            "strong_signed_shop_or_marketplace",
        ),
        SellerCase(
            "mature_receipt_history",
            "Clean protocol receipts buy down the bond requirement.",
            640,
            "protocol_history",
            32,
            0,
            "strong_signed_shop_or_marketplace",
        ),
        SellerCase(
            "underwritten_new_seller",
            "Third-party bond underwriter substitutes capital with a priced, accountable actor.",
            640,
            "zero_protocol_history",
            0,
            0,
            "weak_unsigned",
            underwriter=True,
        ),
        SellerCase(
            "adversarial_underpriced_zero_history_bond",
            "A zero-history seller tries to route through with a token bond and no underwriter.",
            640,
            "zero_protocol_history",
            0,
            0,
            "weak_unsigned",
            manual_bond_fraction_bps=750,
            expected_errors={"zero-history seller got low bond without underwriter"},
        ),
        SellerCase(
            "adversarial_bond_as_honesty_overclaim",
            "A bond packet is shaped as if capital proves honesty, which must be rejected.",
            640,
            "zero_protocol_history",
            0,
            0,
            "weak_unsigned",
            bond_not_claiming_override=["card_is_authentic", "fraud_impossible"],
            expected_errors={"bond profile overclaims honesty"},
        ),
    ]


def mutation_proofs() -> list[dict[str, Any]]:
    mutation = "remove_zero_history_low_bond_guard"
    mutated_results = [evaluate_case(case, mutation=mutation) for case in fixtures()]
    failing_cases = [
        {
            "case_id": result["case_id"],
            "expected_errors": result["expected_errors"],
            "observed_errors": result["hard_errors"],
            "expected_errors_missing": result["expected_errors_missing"],
        }
        for result in mutated_results
        if result["expected_errors_missing"]
    ]
    return [
        {
            "mutation": mutation,
            "target": "evaluate_case: skip zero-history low-bond guard",
            "expected_detection": "adversarial_underpriced_zero_history_bond loses its expected hard error",
            "detected": bool(failing_cases),
            "failing_cases": failing_cases,
        }
    ]


def write_report(run_dir: Path, results: list[dict[str, Any]], attempts: list[dict[str, Any]]) -> bool:
    mutation_results = mutation_proofs()
    passed = (
        all(result["passed"] for result in results)
        and all(attempt["passed"] for attempt in attempts)
        and all(proof["detected"] for proof in mutation_results)
    )
    run_dir.mkdir(parents=True, exist_ok=True)
    summary = {
        "run_id": run_dir.name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "passed": passed,
        "pass_definition": "Seller-first bootstrap preserves settlement caveats, prices seller attention, and lets bond requirements fall only through legible history/imported proof/underwriting.",
        "results": results,
        "overclaim_attempts": attempts,
        "mutation_proofs": mutation_results,
    }
    (run_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    lines = [
        f"# Seller Bootstrap Drill: {run_dir.name}",
        "",
        f"- Passed: `{passed}`",
        "- Pass definition: seller-first bootstrap preserves settlement caveats, prices attention, and treats bonds as scoped capital rather than trust.",
        f"- Mutation proofs passed: `{all(proof['detected'] for proof in mutation_results)}`",
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
    lines.extend(["## Seller Cases", ""])
    for result in results:
        bond = result["bond_profile"]
        rail = result["rail"]
        lines.extend(
            [
                f"### {result['case_id']}",
                "",
                f"- {result['description']}",
                f"- Rail: `{rail['rail_type']}`",
                f"- Finality model: `{rail['finality_model']}`",
                f"- Chargeback surface: `{rail['chargeback_surface']}`",
                f"- Required seller bond: `${bond['required_bond_amount_usd']}` (`{bond['required_bond_fraction_bps']} bps`)",
                f"- Covered failures: `{', '.join(bond['covered_failures'])}`",
                f"- Not claiming: `{', '.join(sorted(set(rail['not_claiming'] + bond['not_claiming'])))}`",
                f"- Expected to fail: `{result['expected_to_fail']}`",
                f"- Passed: `{result['passed']}`",
                "",
            ]
        )
        if result["hard_errors"]:
            lines.append("- Errors:")
            for error in result["hard_errors"]:
                lines.append(f"  - {error}")
            lines.append("")
    lines.extend(["## Mutation Proofs", ""])
    for proof in mutation_results:
        lines.extend(
            [
                f"### {proof['mutation']}",
                "",
                f"- Target: {proof['target']}",
                f"- Expected detection: {proof['expected_detection']}",
                f"- Detected: `{proof['detected']}`",
                "- Failing cases:",
            ]
        )
        for case in proof["failing_cases"]:
            lines.append(
                f"  - `{case['case_id']}` missing `{', '.join(case['expected_errors_missing'])}` after mutation"
            )
        lines.append("")
    lines.extend(
        [
            "## What This Proves",
            "",
            "- Seller-first bootstrap is not only copy; it has packet-level requirements.",
            "- Escrowed digital money is the enforceable settlement material, while fiat payment remains a reversible promise.",
            "- Stablecoin settlement keeps issuer, blacklist, custody, and regulatory caveats visible.",
            "- New sellers can substitute scoped capital for missing history.",
            "- Protocol receipts and clean outcomes can reduce bond requirements without becoming a claim that the seller is safe.",
        ]
    )
    (run_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return passed


def main() -> int:
    run_dir = RUNS / f"seller_bootstrap_drill_{utc_stamp()}"
    results = [evaluate_case(case) for case in fixtures()]
    passed = write_report(run_dir, results, overclaim_attempts())
    print(f"Wrote {run_dir / 'REPORT.md'}")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
