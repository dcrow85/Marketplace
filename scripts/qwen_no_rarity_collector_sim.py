#!/usr/bin/env python3
"""Simulate different No Rarity binder collectors and their agent wants.

This is a collector-intent layer, not an EVM settlement run. It asks Qwen to
act as several collector agents while a deterministic binder/evidence evaluator
keeps the No Rarity catalog boundaries intact.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"
DATA = ROOT / "data" / "no-rarity-base-set.json"
SCRIPTS = ROOT / "scripts"

sys.path.insert(0, str(SCRIPTS))

from qwen_e2e_transaction_sim import QWEN_MODEL, json_default, qwen_json, utc_stamp, write_json  # noqa: E402


PROFILE_RANK = {"NR-0": 0, "NR-A": 1, "NR-B": 2, "NR-C": 3, "NR-D": 2}
QS_TEXT_CHECK_IDS = {"PMCG1-071", "PMCG1-072", "PMCG1-073", "PMCG1-076", "PMCG1-093"}
TRUTH_OVERCLAIM_PATTERNS = [
    re.compile(
        r"(?:protocol|catalog|binder).{0,70}(?:proves|verifies|guarantees).{0,90}"
        r"(?:authentic|condition|possession|no rarity|physical)",
        re.I | re.S,
    ),
    re.compile(
        r"(?:authentic|condition|possession|no rarity|physical).{0,70}"
        r"(?:proven|verified|guaranteed)\s+by\s+(?:the\s+)?(?:protocol|catalog|binder)",
        re.I | re.S,
    ),
]


def load_catalog() -> dict[str, Any]:
    return json.loads(DATA.read_text())


def by_id(cards: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {card["tcgdex_id"]: card for card in cards}


def card_brief(card: dict[str, Any]) -> dict[str, Any]:
    profile = card["agent_decision_profile"]
    product = card["product_scope"]
    return {
        "id": card["tcgdex_id"],
        "local_id": card["local_id"],
        "name_en": card["name_en"],
        "name_ja": product.get("japanese_name_from_research", ""),
        "romaji": product.get("romaji_from_research", ""),
        "rarity": card.get("rarity_source"),
        "holo": bool(card.get("holo_source")),
        "active_no_rarity_target": bool(card.get("no_rarity_target")),
        "profile": profile["baseline_evidence_profile_id"],
        "profile_name": profile["baseline_evidence_profile_name"],
        "value_band": profile["value_band"],
        "collector_note": card.get("collector_texture", {}).get("note", ""),
        "tells": profile.get("card_specific_tells", []),
        "traps": card.get("variant_traps", []),
        "recommended_evidence": profile.get("recommended_evidence", [])[:6],
        "not_authority": card.get("not_claiming", []),
    }


def compact_cards(card_map: dict[str, dict[str, Any]], ids: list[str]) -> list[dict[str, Any]]:
    return [card_brief(card_map[item]) for item in ids if item in card_map]


def collectors() -> list[dict[str, Any]]:
    return [
        {
            "collector_id": "binder_completionist",
            "name": "Mika",
            "archetype": "binder completionist",
            "human_style": "wants the binder to fill in quietly; prefers lots and low seller attention",
            "budget_total": 450,
            "budget_per_card": 45,
            "attention_tolerance": "low",
            "risk_tolerance": "medium",
            "human_contact_threshold": "only if a lot is unusually good or evidence cost exceeds card value",
            "holds": ["PMCG1-001", "PMCG1-004", "PMCG1-014", "PMCG1-023", "PMCG1-052", "PMCG1-093"],
            "wants": ["PMCG1-002", "PMCG1-007", "PMCG1-012", "PMCG1-031", "PMCG1-037", "PMCG1-059"],
            "sell_duplicates": [],
        },
        {
            "collector_id": "holo_grail_hunter",
            "name": "Rowan",
            "archetype": "high-value holo hunter",
            "human_style": "happy to wait; wants the right copy, not a fast copy",
            "budget_total": 6500,
            "budget_per_card": 3500,
            "attention_tolerance": "high",
            "risk_tolerance": "low",
            "human_contact_threshold": "any high-value holo, verifier choice, bond gap, or price uncertainty",
            "holds": ["PMCG1-034", "PMCG1-050"],
            "wants": ["PMCG1-021", "PMCG1-032", "PMCG1-038", "PMCG1-068"],
            "sell_duplicates": [],
        },
        {
            "collector_id": "tell_specialist",
            "name": "Sora",
            "archetype": "print-run tell and variant trap specialist",
            "human_style": "likes weird evidence details; wants agents to preserve ambiguity",
            "budget_total": 1200,
            "budget_per_card": 650,
            "attention_tolerance": "medium",
            "risk_tolerance": "medium-low",
            "human_contact_threshold": "when a card-specific tell or Quick Starter text-layout issue appears",
            "holds": ["PMCG1-046", "PMCG1-071"],
            "wants": ["PMCG1-011", "PMCG1-038", "PMCG1-047", "PMCG1-072", "PMCG1-076", "PMCG1-093"],
            "sell_duplicates": [],
        },
        {
            "collector_id": "art_line_collector",
            "name": "Jun",
            "archetype": "illustrator and character-feel collector",
            "human_style": "buys cards that feel alive; evidence should not crush the charm",
            "budget_total": 800,
            "budget_per_card": 160,
            "attention_tolerance": "medium",
            "risk_tolerance": "medium",
            "human_contact_threshold": "only if a card is above budget or the agent sees a beautiful copy",
            "holds": ["PMCG1-001", "PMCG1-002", "PMCG1-006", "PMCG1-035"],
            "wants": ["PMCG1-014", "PMCG1-017", "PMCG1-020", "PMCG1-023", "PMCG1-064", "PMCG1-067"],
            "sell_duplicates": [],
        },
        {
            "collector_id": "seller_collector",
            "name": "Avery",
            "archetype": "collector-seller with duplicates",
            "human_style": "will document once, but seller attention has to be respected and priced",
            "budget_total": 900,
            "budget_per_card": 180,
            "attention_tolerance": "low-to-medium",
            "risk_tolerance": "medium",
            "human_contact_threshold": "when an attention ask should be paid, credited back, or refused",
            "holds": ["PMCG1-035", "PMCG1-096", "PMCG1-093", "PMCG1-021"],
            "wants": ["PMCG1-032", "PMCG1-038", "PMCG1-096"],
            "sell_duplicates": ["PMCG1-035", "PMCG1-093", "PMCG1-096"],
        },
        {
            "collector_id": "slab_investor",
            "name": "Theo",
            "archetype": "slab-first investor",
            "human_style": "does not want raw drama; wants certs, labels, and bounded resale evidence",
            "budget_total": 5000,
            "budget_per_card": 2500,
            "attention_tolerance": "medium",
            "risk_tolerance": "low",
            "human_contact_threshold": "any cert mismatch, label ambiguity, or grader-population uncertainty",
            "holds": [],
            "wants": ["PMCG1-038", "PMCG1-050", "PMCG1-068", "PMCG1-095"],
            "sell_duplicates": [],
        },
    ]


def opportunities() -> list[dict[str, Any]]:
    return [
        {
            "offer_id": "shop_low_value_lot_A",
            "type": "buy_offer",
            "card_ids": ["PMCG1-002", "PMCG1-007", "PMCG1-012", "PMCG1-031", "PMCG1-037", "PMCG1-059"],
            "ask_usd": 128,
            "seller": "curated_shop",
            "seller_trust": "portable_shop_proof",
            "attention_cost": "low",
            "format": "raw_lot",
            "evidence_profile": "NR-A",
            "evidence": ["front_back_each_card", "symbol_crops", "fresh_nonce_group_photo"],
            "seller_proof_chain": True,
            "bond_offered": "lot_nonship_wrong_item",
            "verifier_available": False,
            "notes": "quiet binder-fill lot with low ceremony",
        },
        {
            "offer_id": "new_seller_charizard_crop",
            "type": "buy_offer",
            "card_ids": ["PMCG1-021"],
            "ask_usd": 4200,
            "seller": "new_social_seller",
            "seller_trust": "thin",
            "attention_cost": "low",
            "format": "raw_single",
            "evidence_profile": "NR-A",
            "evidence": ["front_image", "back_image", "cropped_blank_corner"],
            "seller_proof_chain": False,
            "bond_offered": "none",
            "verifier_available": False,
            "notes": "tempting price, weak high-value evidence",
        },
        {
            "offer_id": "known_collector_slab_raichu",
            "type": "buy_offer",
            "card_ids": ["PMCG1-038"],
            "ask_usd": 1850,
            "seller": "known_collector",
            "seller_trust": "portable_prior_receipts",
            "attention_cost": "medium",
            "format": "graded_slab",
            "evidence_profile": "NR-D",
            "evidence": ["slab_front", "slab_back", "label_closeup", "cert_lookup", "fresh_nonce_slab"],
            "seller_proof_chain": True,
            "bond_offered": "nonship_wrong_item",
            "verifier_available": True,
            "notes": "slabbed Raichu with cert trail",
        },
        {
            "offer_id": "shop_pikachu_mid",
            "type": "buy_offer",
            "card_ids": ["PMCG1-035"],
            "ask_usd": 115,
            "seller": "curated_shop",
            "seller_trust": "portable_shop_proof",
            "attention_cost": "medium",
            "format": "raw_single",
            "evidence_profile": "NR-B",
            "evidence": ["front_back", "symbol_crop", "corners", "fresh_nonce"],
            "seller_proof_chain": True,
            "bond_offered": "nonship_wrong_item_condition",
            "verifier_available": False,
            "notes": "popular non-holo with enough binder evidence",
        },
        {
            "offer_id": "trainer_text_trap_lot",
            "type": "buy_offer",
            "card_ids": ["PMCG1-072", "PMCG1-073", "PMCG1-076", "PMCG1-093"],
            "ask_usd": 190,
            "seller": "marketplace_seller",
            "seller_trust": "medium",
            "attention_cost": "medium",
            "format": "raw_lot",
            "evidence_profile": "NR-B",
            "evidence": ["front_back", "symbol_crops", "fresh_nonce"],
            "seller_proof_chain": False,
            "bond_offered": "nonship_wrong_item",
            "verifier_available": False,
            "notes": "Quick Starter-sensitive trainers without text-layout proof",
        },
        {
            "offer_id": "local_venusaur_verified",
            "type": "buy_offer",
            "card_ids": ["PMCG1-011"],
            "ask_usd": 980,
            "seller": "local_show_seller",
            "seller_trust": "local_meetup_possible",
            "attention_cost": "high",
            "format": "raw_single",
            "evidence_profile": "NR-C",
            "evidence": ["front_back", "symbol_crop", "holo_video", "pokedex_68_tell", "fresh_nonce_sequence"],
            "seller_proof_chain": True,
            "bond_offered": "nonship_wrong_item_condition_underinsurance",
            "verifier_available": True,
            "notes": "high-value holo with card-specific tell and local pickup option",
        },
        {
            "offer_id": "premium_basic_energy_mislabel",
            "type": "buy_offer",
            "card_ids": ["PMCG1-098"],
            "ask_usd": 65,
            "seller": "confused_seller",
            "seller_trust": "unknown",
            "attention_cost": "low",
            "format": "raw_single",
            "evidence_profile": "NR-0",
            "evidence": ["front_image", "blank_corner"],
            "seller_proof_chain": False,
            "bond_offered": "none",
            "verifier_available": False,
            "notes": "basic Energy caveat marketed as premium No Rarity",
        },
        {
            "offer_id": "double_colorless_clean",
            "type": "buy_offer",
            "card_ids": ["PMCG1-096"],
            "ask_usd": 82,
            "seller": "curated_shop",
            "seller_trust": "portable_shop_proof",
            "attention_cost": "medium",
            "format": "raw_single",
            "evidence_profile": "NR-B",
            "evidence": ["front_back", "symbol_crop", "corners", "fresh_nonce"],
            "seller_proof_chain": True,
            "bond_offered": "nonship_wrong_item_condition",
            "verifier_available": False,
            "notes": "active special Energy target, not a basic Energy caveat",
        },
    ]


def attention_rank(value: str) -> int:
    return {"low": 1, "low-to-medium": 2, "medium": 2, "medium-low": 2, "medium-to-high": 3, "high": 3}.get(
        value, 2
    )


def opportunity_interests(collector: dict[str, Any], offer: dict[str, Any]) -> bool:
    wanted = set(collector["wants"])
    held = set(collector["holds"])
    ids = set(offer["card_ids"])
    if collector["collector_id"] == "binder_completionist":
        return bool(ids & wanted)
    if collector["collector_id"] == "seller_collector":
        return bool(ids & wanted)
    return bool(ids & wanted) or bool(ids - held and collector["collector_id"] == "art_line_collector")


def evaluate_offer_for_collector(
    collector: dict[str, Any], offer: dict[str, Any], card_map: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    if not opportunity_interests(collector, offer):
        return {"action": "ignore", "reasons": ["outside collector's current wants"], "human_contact": False}

    reasons: list[str] = []
    asks: list[str] = []
    cards = [card_map[item] for item in offer["card_ids"]]
    total_budget = collector["budget_total"]
    per_card_budget = collector["budget_per_card"]
    per_card = offer["ask_usd"] / max(1, len(cards))

    caveats = [card["tcgdex_id"] for card in cards if not card.get("no_rarity_target")]
    if caveats:
        return {
            "action": "reject",
            "reasons": [f"{', '.join(caveats)} is a caveat row, not an active No Rarity target"],
            "human_contact": False,
            "asks": ["do not use premium No Rarity language for basic Energy caveats"],
        }

    if offer["ask_usd"] > total_budget or per_card > per_card_budget * 1.35:
        reasons.append("price exceeds collector's normal budget aperture")

    required_profiles = [card["agent_decision_profile"]["baseline_evidence_profile_id"] for card in cards]
    if offer["format"] == "graded_slab":
        required_profiles = ["NR-D"]
    required_rank = max(PROFILE_RANK.get(profile, 0) for profile in required_profiles)
    provided_rank = PROFILE_RANK.get(offer["evidence_profile"], 0)

    if offer["format"] == "graded_slab":
        if offer["evidence_profile"] != "NR-D":
            reasons.append("slabbed offer needs NR-D slab/cert evidence")
            asks.append("slab front/back, label close-up, cert lookup, and nonce-with-slab")
    elif provided_rank < required_rank:
        reasons.append(
            f"offer provides {offer['evidence_profile']} but cards require {max(required_profiles, key=lambda p: PROFILE_RANK.get(p, 0))}"
        )
        asks.append("upgrade evidence to the card's baseline No Rarity profile")

    if any(card["tcgdex_id"] in QS_TEXT_CHECK_IDS for card in cards) and "text_layout_check" not in offer["evidence"]:
        reasons.append("Quick Starter-sensitive trainer needs text-layout proof")
        asks.append("add Japanese text-layout comparison against Expansion Pack exemplar")

    if any(card.get("holo_source") for card in cards) and max(PROFILE_RANK.get(p, 0) for p in required_profiles) >= 3:
        if not offer["verifier_available"]:
            reasons.append("high-value holo lacks verifier availability")
            asks.append("add verifier review or local inspection before funding")

    if offer["seller_trust"] in {"thin", "unknown"} and not offer["seller_proof_chain"]:
        reasons.append("seller trust is thin or unportable")
        asks.append("add seller proof chain, bond, verifier, or local handoff")

    if attention_rank(offer["attention_cost"]) > attention_rank(collector["attention_tolerance"]):
        reasons.append("seller attention cost exceeds collector's preferred friction")
        asks.append("ask agent to negotiate attention fee or credit-back on purchase")

    if reasons:
        if any("price exceeds" in reason for reason in reasons) or any("high-value" in reason for reason in reasons):
            action = "human_review"
        else:
            action = "request_evidence"
        return {"action": action, "reasons": reasons, "asks": asks, "human_contact": action == "human_review"}

    return {
        "action": "pursue",
        "reasons": ["within collector aperture", "catalog target is active", "evidence shape matches current ask"],
        "asks": ["preserve catalog boundary: this remains seller-card evidence, not catalog truth"],
        "human_contact": False,
    }


def deterministic_plan(collector: dict[str, Any], card_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    offer_results = []
    for offer in opportunities():
        result = evaluate_offer_for_collector(collector, offer, card_map)
        if result["action"] != "ignore":
            offer_results.append({"offer": offer, "evaluation": result})

    sell_plan = []
    for card_id in collector.get("sell_duplicates", []):
        card = card_map[card_id]
        profile = card["agent_decision_profile"]["baseline_evidence_profile_id"]
        sell_plan.append(
            {
                "card": card_brief(card),
                "recommended_public_stance": "have_extra_open_to_sell",
                "baseline_evidence_profile": profile,
                "attention_policy": "price extra asks; credit some attention fee back if buyer purchases",
                "not_public_by_default": ["home address", "full collection value", "unneeded cert/private route data"],
            }
        )

    return {
        "collector": collector,
        "wanted_cards": compact_cards(card_map, collector["wants"]),
        "held_cards": compact_cards(card_map, collector["holds"]),
        "sell_plan": sell_plan,
        "offer_results": offer_results,
    }


def run_collector_agent(plan: dict[str, Any]) -> dict[str, Any]:
    qwen_input = {
        "collector": plan["collector"],
        "wanted_cards": plan["wanted_cards"],
        "sell_plan": plan["sell_plan"],
        "offer_results": [
            {
                "offer": item["offer"],
                "evaluation": item["evaluation"],
                "cards": compact_cards({card["id"]: card for card in plan["wanted_cards"]}, []),
            }
            for item in plan["offer_results"]
        ],
    }
    # Attach compact card context per offer without repeating the whole catalog.
    id_to_brief = {card["id"]: card for card in plan["wanted_cards"] + plan["held_cards"]}
    for item in qwen_input["offer_results"]:
        ids = item["offer"]["card_ids"]
        item["card_context"] = [id_to_brief.get(card_id) for card_id in ids if id_to_brief.get(card_id)]

    return qwen_json(
        "no_rarity_collector_agent",
        f"""You are the agent for one human collector browsing the Japanese No Rarity binder.

The binder catalog is an agent lens, not an authentication authority.
It can anchor PMCG1 rows, evidence profiles, collector texture, and active/caveat status.
It cannot prove seller possession, authenticity, true condition, No Rarity truth, delivery, or price truth.

Collector plan and deterministic binder/evidence evaluations:
{json.dumps(qwen_input, ensure_ascii=False, default=json_default, sort_keys=True)}

Return JSON with keys:
collector_read, top_wants, pursue_now, request_evidence, reject_or_ignore, sell_stances, human_questions, agent_to_agent_messages, what_catalog_knows, what_remains_judgment.

Rules:
- Do not say the catalog/protocol/binder proves a seller card is authentic, No Rarity, possessed, or correctly conditioned.
- If deterministic evaluation says request_evidence, reject, or human_review, preserve that.
- Keep top_wants to at most 4 items.
- Keep pursue_now, request_evidence, reject_or_ignore, sell_stances, human_questions, and agent_to_agent_messages to at most 3 items each.
- Each item should be one concise object or sentence.
- Keep the collector personality visible in one concise sentence.
""",
        max_tokens=1800,
    )


def output_assertions(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: output_assertions(v) for k, v in value.items() if k not in {"_raw", "_repair_raw", "what_remains_judgment"}}
    if isinstance(value, list):
        return [output_assertions(v) for v in value]
    return value


def language_hits(value: Any) -> list[str]:
    text = json.dumps(output_assertions(value), ensure_ascii=False, default=json_default, sort_keys=True)
    hits: list[str] = []
    for pattern in TRUTH_OVERCLAIM_PATTERNS:
        for match in pattern.finditer(text):
            hits.append(re.sub(r"\s+", " ", match.group(0)).strip()[:220])
    return sorted(set(hits))


def movement_violations(plan: dict[str, Any], agent: dict[str, Any]) -> list[str]:
    allowed = {
        item["offer"]["offer_id"]: item["evaluation"]["action"] for item in plan["offer_results"]
    }
    violations: list[str] = []
    pursue_text = json.dumps(agent.get("pursue_now", []), ensure_ascii=False, default=json_default)
    for offer_id, action in allowed.items():
        if action != "pursue" and offer_id in pursue_text:
            violations.append(f"agent pursued {offer_id} despite deterministic action {action}")
    reject_text = json.dumps(agent.get("reject_or_ignore", []), ensure_ascii=False, default=json_default)
    for offer_id, action in allowed.items():
        if action == "pursue" and offer_id in reject_text:
            violations.append(f"agent rejected {offer_id} despite deterministic pursue")
    return violations


def run_simulation() -> dict[str, Any]:
    catalog = load_catalog()
    card_map = by_id(catalog["cards"])
    rows = []
    for collector in collectors():
        plan = deterministic_plan(collector, card_map)
        agent = run_collector_agent(plan)
        row = {
            "collector_id": collector["collector_id"],
            "collector_name": collector["name"],
            "plan": plan,
            "qwen": agent,
        }
        row["score"] = {
            "movement_violations": movement_violations(plan, agent),
            "language_overclaims": language_hits(agent),
        }
        row["pass"] = not row["score"]["movement_violations"] and not row["score"]["language_overclaims"]
        rows.append(row)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": str(QWEN_MODEL),
        "catalog_schema": catalog["schema"],
        "catalog_research_status": catalog["research_status"],
        "set_title": catalog["set_entry"]["title"],
        "cases": rows,
        "pass": all(row["pass"] for row in rows),
    }


def write_report(run_dir: Path, summary: dict[str, Any]) -> None:
    lines = [
        f"# Qwen No Rarity Collector Simulation: {run_dir.name}",
        "",
        f"- Generated: `{summary['generated_at']}`",
        f"- Model: `{summary['model']}`",
        f"- Catalog schema: `{summary['catalog_schema']}`",
        f"- Set: `{summary['set_title']}`",
        f"- Overall pass: `{summary['pass']}`",
        "",
        "## Scoreboard",
        "",
        "| Collector | Archetype | Offers seen | Pursue | Requests/Human | Reject | Pass |",
        "|---|---|---:|---:|---:|---:|---|",
    ]
    for row in summary["cases"]:
        plan = row["plan"]
        counts = {"pursue": 0, "request": 0, "reject": 0}
        for item in plan["offer_results"]:
            action = item["evaluation"]["action"]
            if action == "pursue":
                counts["pursue"] += 1
            elif action in {"request_evidence", "human_review"}:
                counts["request"] += 1
            elif action == "reject":
                counts["reject"] += 1
        lines.append(
            f"| {row['collector_name']} | {plan['collector']['archetype']} | {len(plan['offer_results'])} | "
            f"{counts['pursue']} | {counts['request']} | {counts['reject']} | `{row['pass']}` |"
        )

    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            "This run treats the No Rarity binder as an agent lens. Different collectors produce different wants, evidence costs, and human-contact thresholds, while the deterministic evaluator keeps active targets, caveat rows, evidence profiles, Quick Starter traps, and high-value holo requirements legible.",
            "",
        ]
    )

    for row in summary["cases"]:
        collector = row["plan"]["collector"]
        lines.extend(
            [
                f"## {row['collector_name']} - {collector['archetype']}",
                "",
                f"- Style: {collector['human_style']}",
                f"- Budget: `${collector['budget_total']}` total, `${collector['budget_per_card']}` per card aperture",
                f"- Attention tolerance: `{collector['attention_tolerance']}`",
                f"- Human contact threshold: {collector['human_contact_threshold']}",
                f"- Movement violations: `{len(row['score']['movement_violations'])}`",
                f"- Language overclaims: `{len(row['score']['language_overclaims'])}`",
                "",
            ]
        )
        if row["score"]["movement_violations"]:
            lines.append("### Movement Violations")
            lines.extend(f"- {item}" for item in row["score"]["movement_violations"])
            lines.append("")
        if row["score"]["language_overclaims"]:
            lines.append("### Language Overclaims")
            lines.extend(f"- {item}" for item in row["score"]["language_overclaims"])
            lines.append("")

        lines.extend(["### Deterministic Offer Read", ""])
        for item in row["plan"]["offer_results"]:
            offer = item["offer"]
            evaluation = item["evaluation"]
            card_labels = ", ".join(offer["card_ids"])
            lines.append(
                f"- `{offer['offer_id']}` ({card_labels}, `${offer['ask_usd']}`): "
                f"`{evaluation['action']}` - {'; '.join(evaluation['reasons'])}"
            )
        if row["plan"]["sell_plan"]:
            lines.extend(["", "### Sell Stances", ""])
            for stance in row["plan"]["sell_plan"]:
                card = stance["card"]
                lines.append(
                    f"- `{card['id']}` {card['name_en']}: `{stance['recommended_public_stance']}`, "
                    f"profile `{stance['baseline_evidence_profile']}`"
                )

        lines.extend(
            [
                "",
                "### Qwen Collector Agent",
                "",
                "```json",
                json.dumps(row["qwen"], ensure_ascii=False, indent=2, sort_keys=True),
                "```",
                "",
            ]
        )

    lines.extend(["## Files", "", f"- Summary: `{(run_dir / 'summary.json').relative_to(ROOT)}`", ""])
    (run_dir / "REPORT.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    run_dir = RUNS / f"qwen_no_rarity_collectors_{utc_stamp()}"
    run_dir.mkdir(parents=True, exist_ok=True)
    summary = run_simulation()
    write_json(run_dir / "summary.json", summary)
    write_report(run_dir, summary)
    print(json.dumps({"run": str(run_dir), "pass": summary["pass"], "report": str(run_dir / "REPORT.md")}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
