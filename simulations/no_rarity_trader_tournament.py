#!/usr/bin/env python3
"""Six-trader pressure test over the No Rarity agent catalog layer."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "agent_tools"))

from no_rarity_catalog_tools import dispatch  # noqa: E402


RUNS = ROOT / "runs"


@dataclass
class Attempt:
    name: str
    tool: str
    args: dict[str, Any]
    expected: str
    result: dict[str, Any] = field(default_factory=dict)
    outcome: str = ""
    pass_: bool = False


@dataclass
class Trader:
    trader_id: str
    name: str
    aperture: str
    pressure: str
    attempts: list[Attempt]


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def run_attempt(attempt: Attempt) -> Attempt:
    result = dispatch(attempt.tool, attempt.args)
    attempt.result = compact_result(result)
    attempt.outcome = classify_outcome(attempt, result)
    attempt.pass_ = attempt.outcome == attempt.expected
    return attempt


def compact_result(result: dict[str, Any]) -> dict[str, Any]:
    if result.get("action") == "evaluate_gate":
        return {
            "decision": result["decision"],
            "human_summary": result["human_summary"],
            "card_ref": result["card"]["card_ref"],
            "card": result["card"]["name"],
            "missing": result["missing"][:5],
            "legible": result["legible"],
            "judgment_needed": result["judgment_needed"],
            "protocol_boundary": result["protocol_boundary"],
        }
    if "cards" in result:
        return {
            "count": result["count"],
            "top_cards": [
                {
                    "card_ref": card["card_ref"],
                    "name": card["name"],
                    "profile": card["agent_profile"]["evidence_profile_id"],
                    "active_target": card["no_rarity"]["active_target"],
                }
                for card in result["cards"][:5]
            ],
            "boundary": result["boundary"],
        }
    if "inferred_stance" in result:
        return {
            "inferred_stance": result["inferred_stance"],
            "top_candidates": [
                {"card_ref": card["card_ref"], "name": card["name"]}
                for card in result["candidates"][:3]
            ],
            "agent_next": result["agent_next"],
            "boundary": result["boundary"],
        }
    if "required_or_recommended_evidence" in result:
        return {
            "card_ref": result["card"]["card_ref"],
            "card": result["card"]["name"],
            "evidence": result["required_or_recommended_evidence"][:8],
            "overlays": result["conditional_overlays"],
            "attention_cost_note": result["attention_cost_note"],
            "not_claiming": result["not_claiming"],
        }
    if "prompts" in result:
        return {
            "cards": [{"card_ref": card["card_ref"], "name": card["name"]} for card in result["cards"]],
            "prompt_count": len(result["prompts"]),
            "expected_wall": result["expected_wall"],
        }
    return result


def classify_outcome(attempt: Attempt, result: dict[str, Any]) -> str:
    if result.get("action") == "evaluate_gate":
        decision = result["decision"]
        if decision in {
            "request_evidence",
            "human_or_verifier_review",
            "reject_premium_no_rarity",
            "hold_private",
            "inspect_candidate",
        }:
            return decision
        if decision in {"continue", "save_collection_memory"}:
            return "low_friction_pass"
        return decision
    if "inferred_stance" in result:
        return f"stance:{result['inferred_stance']}"
    if "required_or_recommended_evidence" in result:
        evidence_blob = " ".join(result["required_or_recommended_evidence"]).lower()
        if "quick starter" in evidence_blob:
            return "quick_starter_wall_named"
        if "public-sharing" in evidence_blob or "public sharing" in evidence_blob:
            return "public_permission_named"
        return "evidence_plan_named"
    if "cards" in result:
        cards = result["cards"]
        if len(cards) == 1:
            return f"search_exact:{cards[0]['name']['en']}"
        return "search_candidates"
    return "observed"


def tournament() -> list[Trader]:
    return [
        Trader(
            trader_id="binder_completionist",
            name="Binder Completionist Buyer",
            aperture="Wants many low/mid cards with low ceremony.",
            pressure="Can the catalog keep asks light while still naming missing evidence?",
            attempts=[
                Attempt(
                    "Natural low-friction Caterpie want",
                    "evaluate_gate",
                    {"card_ref": "Caterpie", "stance": "want", "evidence_level": "NR-A", "seller_trust": "known"},
                    "low_friction_pass",
                ),
                Attempt(
                    "Vintage Japanese Pikachu search",
                    "search_catalog",
                    {"query": "vintage japanese pikachu", "limit": 5},
                    "search_exact:Pikachu",
                ),
                Attempt(
                    "Collection memory from binder talk",
                    "interpret_human_text",
                    {"text": "Add my Japanese no rarity Caterpie and Weedle binder page to my collection", "limit": 4},
                    "stance:have",
                ),
            ],
        ),
        Trader(
            trader_id="holo_grail_buyer",
            name="Low-Risk Holo Grail Buyer",
            aperture="Will pay, but hates ambiguity and thin trust.",
            pressure="Does high value force evidence and review instead of catalog-image confidence?",
            attempts=[
                Attempt(
                    "Charizard with low evidence from thin seller",
                    "evaluate_gate",
                    {"card_ref": "Charizard", "stance": "want", "evidence_level": "NR-A", "seller_trust": "thin"},
                    "request_evidence",
                ),
                Attempt(
                    "Raichu with evidence but unknown seller",
                    "evaluate_gate",
                    {"card_ref": "Raichu", "stance": "want", "evidence_level": "NR-C", "seller_trust": "unknown"},
                    "human_or_verifier_review",
                ),
                Attempt(
                    "Holo search precision",
                    "search_catalog",
                    {"query": "raichu holo", "limit": 5},
                    "search_exact:Raichu",
                ),
            ],
        ),
        Trader(
            trader_id="slab_investor",
            name="Slab-First Investor",
            aperture="Likes certs and labels, but should not mistake labels for truth.",
            pressure="Can slab evidence remain scoped and not become blanket verification?",
            attempts=[
                Attempt(
                    "Slabbed Blastoise from unknown seller",
                    "evidence_plan",
                    {"card_ref": "Blastoise", "posture": "want", "seller_trust": "unknown"},
                    "evidence_plan_named",
                ),
                Attempt(
                    "Mewtwo with declared slab-level evidence",
                    "evaluate_gate",
                    {"card_ref": "Mewtwo", "stance": "want", "evidence_level": "NR-D", "seller_trust": "thin"},
                    "human_or_verifier_review",
                ),
            ],
        ),
        Trader(
            trader_id="shop_dealer_seller",
            name="Local Shop Dealer Seller",
            aperture="Can reuse shop proof and may offer local handoff.",
            pressure="Does seller posture require explicit public sharing and bounded proof?",
            attempts=[
                Attempt(
                    "Public sell posture not yet authorized",
                    "evaluate_gate",
                    {"card_ref": "Blastoise", "stance": "sell_if_price_right", "evidence_level": "NR-B", "seller_trust": "known", "public": False},
                    "hold_private",
                ),
                Attempt(
                    "Authorized sell posture for mid-value Double Colorless",
                    "evaluate_gate",
                    {"card_ref": "Double Colorless Energy", "stance": "sell_if_price_right", "evidence_level": "NR-B", "seller_trust": "known", "public": True},
                    "low_friction_pass",
                ),
            ],
        ),
        Trader(
            trader_id="low_friction_collector_seller",
            name="Duplicate Collector-Seller",
            aperture="Will document once, but attention must be worth it.",
            pressure="Can the agent start with private memory and delay heavy evidence until demand is real?",
            attempts=[
                Attempt(
                    "Might sell Blastoise from natural language",
                    "interpret_human_text",
                    {"text": "I might sell my no rarity Blastoise if someone serious asks", "limit": 4},
                    "stance:sell_if_price_right",
                ),
                Attempt(
                    "Have extra Magikarp private memory",
                    "evaluate_gate",
                    {"card_ref": "Magikarp", "stance": "have_extra", "evidence_level": "none", "seller_trust": "known", "public": False},
                    "hold_private",
                ),
                Attempt(
                    "Seller attention plan",
                    "evidence_plan",
                    {"card_ref": "Magikarp", "posture": "sell_if_price_right", "seller_trust": "known"},
                    "public_permission_named",
                ),
            ],
        ),
        Trader(
            trader_id="adversarial_seller",
            name="Adversarial Seller",
            aperture="Tries plausible No Rarity fraud and scope laundering.",
            pressure="Do the tools refuse shortcut claims before protocol spendability?",
            attempts=[
                Attempt(
                    "Basic Energy premium No Rarity claim",
                    "evaluate_gate",
                    {"card_ref": "Fighting Energy", "stance": "want", "evidence_level": "NR-C", "seller_trust": "known"},
                    "reject_premium_no_rarity",
                ),
                Attempt(
                    "Quick Starter-sensitive Potion laundering",
                    "evidence_plan",
                    {"card_ref": "Potion", "posture": "sell_if_price_right", "seller_trust": "thin"},
                    "quick_starter_wall_named",
                ),
                Attempt(
                    "Catalog-match-as-possession attack on Charizard",
                    "evaluate_gate",
                    {"card_ref": "Charizard", "stance": "want", "evidence_level": "none", "seller_trust": "known"},
                    "request_evidence",
                ),
            ],
        ),
    ]


def run_tournament() -> dict[str, Any]:
    traders = tournament()
    for trader in traders:
        trader.attempts = [run_attempt(attempt) for attempt in trader.attempts]
    total = sum(len(trader.attempts) for trader in traders)
    passed = sum(1 for trader in traders for attempt in trader.attempts if attempt.pass_)
    failures = [
        {
            "trader_id": trader.trader_id,
            "attempt": attempt.name,
            "expected": attempt.expected,
            "observed": attempt.outcome,
            "result": attempt.result,
        }
        for trader in traders
        for attempt in trader.attempts
        if not attempt.pass_
    ]
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pass": not failures,
        "attempts": total,
        "passed": passed,
        "failures": failures,
        "traders": [
            {
                "trader_id": trader.trader_id,
                "name": trader.name,
                "aperture": trader.aperture,
                "pressure": trader.pressure,
                "attempts": [
                    {
                        "name": attempt.name,
                        "tool": attempt.tool,
                        "args": attempt.args,
                        "expected": attempt.expected,
                        "outcome": attempt.outcome,
                        "pass": attempt.pass_,
                        "result": attempt.result,
                    }
                    for attempt in trader.attempts
                ],
            }
            for trader in traders
        ],
    }


def report_lines(summary: dict[str, Any]) -> list[str]:
    lines = [
        f"# No Rarity Trader Tournament: {summary['generated_at']}",
        "",
        "## Result",
        "",
        f"- Pass: `{summary['pass']}`",
        f"- Attempts: `{summary['passed']}/{summary['attempts']}`",
        "",
        "## Trader Results",
        "",
    ]
    for trader in summary["traders"]:
        lines.extend(
            [
                f"### {trader['name']}",
                "",
                f"- Aperture: {trader['aperture']}",
                f"- Pressure: {trader['pressure']}",
                "",
            ]
        )
        for attempt in trader["attempts"]:
            status = "PASS" if attempt["pass"] else "FAIL"
            lines.extend(
                [
                    f"- `{status}` {attempt['name']}",
                    f"  - Expected: `{attempt['expected']}`",
                    f"  - Observed: `{attempt['outcome']}`",
                ]
            )
            result = attempt["result"]
            if "decision" in result:
                lines.append(f"  - Decision: `{result['decision']}`")
                lines.append(f"  - Human summary: {result['human_summary']}")
                if result.get("missing"):
                    lines.append(f"  - Missing: {', '.join(result['missing'])}")
            elif "top_cards" in result:
                cards = ", ".join(card["name"]["en"] for card in result["top_cards"])
                lines.append(f"  - Top cards: {cards}")
            elif "inferred_stance" in result:
                lines.append(f"  - Inferred stance: `{result['inferred_stance']}`")
                lines.append(f"  - Next: {', '.join(result['agent_next'])}")
            elif "evidence" in result:
                lines.append(f"  - Evidence asks: {', '.join(result['evidence'])}")
                lines.append(f"  - Attention: {result['attention_cost_note']}")
        lines.append("")
    if summary["failures"]:
        lines.extend(["## Failures", ""])
        for failure in summary["failures"]:
            lines.append(
                f"- {failure['trader_id']} / {failure['attempt']}: expected `{failure['expected']}`, observed `{failure['observed']}`"
            )
    return lines


def main() -> int:
    summary = run_tournament()
    run_dir = RUNS / f"no_rarity_trader_tournament_{utc_stamp()}"
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    (run_dir / "REPORT.md").write_text("\n".join(report_lines(summary)) + "\n", encoding="utf-8")
    print(json.dumps({"run_dir": str(run_dir), "pass": summary["pass"], "attempts": summary["attempts"]}, indent=2))
    return 0 if summary["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

