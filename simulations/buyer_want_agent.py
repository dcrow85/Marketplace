#!/usr/bin/env python3
"""Draft Buyer Want packets from natural language with a local Gemma agent.

The LLM is allowed to interpret human preference. Deterministic code still
binds the result to the catalog, profile, pricing policy, and protocol walls.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"
CATALOG_PATH = ROOT / "data" / "no-rarity-base-set.json"
OLLAMA_HOST = os.environ.get("MARKETPLACE_OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("MARKETPLACE_BUYER_AGENT_MODEL", "gemma4:31b")
DEFAULT_TIMEOUT_SECONDS = int(os.environ.get("MARKETPLACE_BUYER_AGENT_TIMEOUT", "90"))
ALLOWED_CONDITIONS = ["DMG", "HP", "MP", "LP", "LP+", "NM-", "NM", "NM+", "MINT"]


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def canonical_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")


def canonical_hash(payload: dict[str, Any]) -> str:
    return "sha256:" + hashlib.sha256(canonical_bytes(payload)).hexdigest()


def parse_json_object(text: str) -> dict[str, Any] | None:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            parsed = json.loads(text[start : end + 1])
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None


def normalize(value: str) -> str:
    value = value.lower().replace("pokémon", "pokemon").replace("é", "e")
    value = value.replace("♀", "f").replace("♂", "m")
    return re.sub(r"[^a-z0-9]+", "", value)


def load_catalog() -> dict[str, Any]:
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def find_card(catalog: dict[str, Any], parsed: dict[str, Any], human_text: str) -> tuple[dict[str, Any] | None, str]:
    cards = catalog.get("cards", [])
    candidates = [
        str(parsed.get("card_name") or ""),
        str(parsed.get("row_id") or ""),
        human_text,
    ]
    for candidate in candidates:
        key = normalize(candidate)
        if not key:
            continue
        for card in cards:
            if key in {
                normalize(card.get("name_en", "")),
                normalize(card.get("tcgdex_id", "")),
                normalize(card.get("local_id", "")),
            }:
                return card, "exact_catalog_match"
        for card in cards:
            if normalize(card.get("name_en", "")) and normalize(card.get("name_en", "")) in key:
                return card, "name_in_human_text"
    return None, "no_catalog_match"


def fallback_parse(human_text: str) -> dict[str, Any]:
    lowered = human_text.lower()
    condition = ""
    condition_map = [
        ("near mint", "NM"),
        ("nm+", "NM+"),
        ("nm-", "NM-"),
        ("nm", "NM"),
        ("lightly played", "LP"),
        ("lp+", "LP+"),
        ("lp", "LP"),
        ("moderately played", "MP"),
        ("mp", "MP"),
        ("heavily played", "HP"),
        ("hp", "HP"),
        ("damaged", "DMG"),
        ("dmg", "DMG"),
    ]
    for phrase, code in condition_map:
        if re.search(rf"\b{re.escape(phrase)}\b", lowered):
            condition = code
            break

    price_match = re.search(r"\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)", human_text)
    max_total_price = float(price_match.group(1).replace(",", "")) if price_match else None

    name = human_text
    for phrase, _code in condition_map:
        name = re.sub(rf"\b{re.escape(phrase)}\b", " ", name, flags=re.IGNORECASE)
    name = re.sub(r"\$\s*[0-9][0-9,]*(?:\.[0-9]{1,2})?", " ", name)
    name = re.sub(
        r"\b(no rarity|japanese|base set|pokemon|card|buy|want|looking for|under|or better|shipped|raw|slabbed|graded)\b",
        " ",
        name,
        flags=re.IGNORECASE,
    )
    name = re.sub(r"\s+", " ", name).strip()

    return {
        "card_name": name or None,
        "row_id": None,
        "variant_hint": "no_rarity" if "no rarity" in lowered else None,
        "condition_floor": condition or None,
        "max_total_price": max_total_price,
        "currency": "USD" if max_total_price is not None else None,
        "raw_or_slabbed": "slabbed" if any(word in lowered for word in ["slab", "slabbed", "graded", "psa", "cgc", "bgs"]) else "raw",
        "route_preferences": ["insured_shipping"] if "shipped" in lowered or "ship" in lowered else [],
        "human_contact_style": "ask_before_material_risk",
        "caveats": ["fallback parser used"],
    }


def call_gemma(human_text: str, catalog_hint: dict[str, Any]) -> dict[str, Any] | None:
    prompt = {
        "task": "Draft structured buyer want fields for a Pokemon No Rarity card marketplace protocol.",
        "human_text": human_text,
        "catalog_context": {
            "catalog": "japanese_no_rarity_base_set",
            "allowed_scope": "Pokemon Japanese Base Set / Expansion Pack No Rarity single-card wants only",
            "example_rows": catalog_hint,
        },
        "allowed_json_shape": {
            "card_name": "string or null",
            "row_id": "PMCG1-### or null",
            "variant_hint": "no_rarity | none",
            "condition_floor": "DMG | HP | MP | LP | LP+ | NM- | NM | NM+ | MINT | null",
            "max_total_price": "number or null",
            "currency": "USD or null",
            "raw_or_slabbed": "raw | slabbed | either | null",
            "route_preferences": ["insured_shipping | local_handoff_if_close | signature_required"],
            "human_contact_style": "short policy phrase",
            "caveats": ["short caveat strings"],
        },
        "rules": [
            "Return JSON only.",
            "Do not include markdown.",
            "Do not claim the catalog proves seller possession, authenticity, condition, price, or No Rarity truth.",
            "If the human asks for No Rarity, keep it as a variant_hint, not as verified fact.",
            "max_total_price includes card, shipping, insurance, and seller attention fees unless the human says otherwise.",
            "Use null when the human did not specify a field.",
        ],
    }
    payload = json.dumps(
        {
            "model": OLLAMA_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a buyer agent for a Pokemon card protocol. Return strict JSON only.",
                },
                {"role": "user", "content": json.dumps(prompt, ensure_ascii=True)},
            ],
            "stream": False,
            "think": False,
            "keep_alive": "20m",
            "options": {"temperature": 0, "num_ctx": 8192, "num_predict": 900},
        },
        ensure_ascii=True,
    ).encode("utf-8")
    request = Request(
        f"{OLLAMA_HOST.rstrip('/')}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))
        return parse_json_object(data.get("message", {}).get("content") or "")
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError):
        return None


def clean_condition(value: Any) -> str:
    condition = str(value or "").strip().upper().replace(" ", "")
    aliases = {"LIGHTLYPLAYED": "LP", "NEARMINT": "NM", "MODERATELYPLAYED": "MP", "HEAVILYPLAYED": "HP"}
    condition = aliases.get(condition, condition)
    return condition if condition in ALLOWED_CONDITIONS else ""


def clean_price(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        price = float(value)
    except (TypeError, ValueError):
        return None
    if price <= 0:
        return None
    return round(price, 2)


def merge_with_deterministic_read(human_text: str, parsed: dict[str, Any]) -> dict[str, Any]:
    fallback = fallback_parse(human_text)
    merged = dict(parsed)
    for key in ["card_name", "row_id", "variant_hint", "condition_floor", "max_total_price", "currency", "raw_or_slabbed"]:
        if merged.get(key) in (None, "", []):
            merged[key] = fallback.get(key)
    if not merged.get("route_preferences"):
        merged["route_preferences"] = fallback.get("route_preferences", [])
    caveats = []
    for item in list(parsed.get("caveats") or []) + list(fallback.get("caveats") or []):
        if item and item not in caveats and item != "fallback parser used":
            caveats.append(item)
    merged["caveats"] = caveats
    merged["deterministic_backfill"] = [
        key
        for key in ["condition_floor", "max_total_price", "currency", "route_preferences"]
        if parsed.get(key) in (None, "", []) and fallback.get(key) not in (None, "", [])
    ]
    return merged


def catalog_hint(catalog: dict[str, Any]) -> list[dict[str, str]]:
    names = ["Charizard", "Venusaur", "Raichu", "Lass", "Double Colorless Energy", "Caterpie"]
    rows = []
    for name in names:
        card = next((item for item in catalog["cards"] if item["name_en"] == name), None)
        if card:
            rows.append(
                {
                    "name": card["name_en"],
                    "row_id": card["tcgdex_id"],
                    "profile": card["agent_decision_profile"]["baseline_evidence_profile_id"],
                }
            )
    return rows


def build_buyer_want(human_text: str, parsed: dict[str, Any], card: dict[str, Any] | None, match_kind: str) -> dict[str, Any]:
    issued_at = utc_now()
    expires_at = (datetime.now(timezone.utc) + timedelta(days=14)).strftime("%Y-%m-%dT%H:%M:%SZ")
    condition_floor = clean_condition(parsed.get("condition_floor")) or "LP"
    max_total_price = clean_price(parsed.get("max_total_price"))
    currency = str(parsed.get("currency") or "USD").upper()
    profile = (card or {}).get("agent_decision_profile", {})
    catalog_ref = {
        "catalog": "japanese_no_rarity_base_set",
        "row_id": card.get("tcgdex_id", "") if card else str(parsed.get("row_id") or ""),
        "local_id": card.get("local_id", "") if card else "",
        "card": card.get("name_en", parsed.get("card_name") or "") if card else str(parsed.get("card_name") or ""),
        "variant_claim": "no_rarity" if parsed.get("variant_hint") == "no_rarity" else "candidate_no_rarity",
        "match_kind": match_kind,
    }
    hard_walls = []
    if not card:
        hard_walls.append("blocked_until_catalog_row_selected")
    elif not card.get("no_rarity_target"):
        hard_walls.append("basic_energy_caveat_requires_manual_human_review")
    if max_total_price is None:
        hard_walls.append("max_total_price_missing")

    want_body = {
        "schema": "marketplace.buyer_want.v0.1",
        "issued_at": issued_at,
        "expires_at": expires_at,
        "buyer_agent": {
            "agent_id": "did:market:agent:buyer-gemma-local",
            "agent_model": OLLAMA_MODEL,
            "agent_provider": "ollama",
            "authority": "draft_only_until_human_or_config_signature",
        },
        "human_text": human_text,
        "catalog_ref": catalog_ref,
        "condition_floor": condition_floor,
        "form": parsed.get("raw_or_slabbed") or "raw",
        "max_total_price": {
            "amount": max_total_price,
            "currency": currency,
            "includes": ["card", "shipping", "insurance", "seller_attention_fees"],
            "missing": max_total_price is None,
        },
        "evidence_expectation": {
            "baseline_profile": profile.get("baseline_evidence_profile_id", "unassigned"),
            "baseline_profile_name": profile.get("baseline_evidence_profile_name", ""),
            "required_before_recommendation": profile.get("recommended_evidence", []),
            "conditional_overlays": profile.get("conditional_overlays", []),
            "card_specific_tells": profile.get("card_specific_tells", []),
        },
        "pricing_policy": {
            "status": "agent_discovery_required",
            "must_attach_cost_packet_before_acceptance": True,
            "do_not_average_uncertain_comps": True,
            "comp_requirements": profile.get("price_comp_requirements", []),
            "not_claiming": ["current price", "fair price", "liquidity"],
        },
        "human_contact_policy": {
            "style": parsed.get("human_contact_style") or "ask_before_material_risk",
            "ask_before": [
                "price_above_likely_band",
                "evidence_below_profile",
                "new_seller_without_bond",
                "verifier_required_or_expensive",
                "route_or_insurance_gap",
                "condition_band_unclear",
            ],
            "agent_may_continue_without_human_for": [
                "catalog lookup",
                "pricing discovery",
                "seller-agent evidence request within baseline profile",
                "rejecting out-of-scope or under-evidenced offers",
            ],
        },
        "cost_dimensional_integrity": {
            "native_dimensions": [
                "card_price",
                "shipping",
                "insurance",
                "seller_attention",
                "buyer_attention",
                "agent_compute",
                "verifier_cost",
                "route_risk",
                "trust_gap",
                "condition_risk",
            ],
            "scalar_summary": "max_total_price is a spending boundary, not a collapse of native cost dimensions",
            "reversible": True,
        },
        "route_preferences": parsed.get("route_preferences") or ["insured_shipping"],
        "agent_boundaries": {
            "what_agent_knows": profile.get("what_agent_knows", []),
            "what_agent_does_not_know": profile.get("what_agent_does_not_know", []),
            "spendability_boundaries": profile.get("spendability_boundaries", []),
            "hard_walls": hard_walls,
        },
        "not_claiming": [
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "No Rarity truth without seller evidence",
            "route safety",
            "funding or escrow lock",
        ],
    }
    want_id = "bw_" + hashlib.sha256(canonical_bytes(want_body)).hexdigest()[:16]
    want_body["want_id"] = want_id
    return want_body


def validate_buyer_want(packet: dict[str, Any]) -> dict[str, Any]:
    errors = []
    warnings = []
    if packet.get("schema") != "marketplace.buyer_want.v0.1":
        errors.append("wrong_schema")
    if not packet.get("catalog_ref", {}).get("row_id"):
        errors.append("missing_catalog_row")
    if packet.get("max_total_price", {}).get("missing"):
        warnings.append("max_total_price_missing")
    if not packet.get("evidence_expectation", {}).get("baseline_profile"):
        errors.append("missing_evidence_profile")
    required_not_claiming = {
        "seller possession",
        "authenticity",
        "condition truth",
        "price truth",
        "No Rarity truth without seller evidence",
    }
    missing_not_claiming = sorted(required_not_claiming - set(packet.get("not_claiming", [])))
    if missing_not_claiming:
        errors.append(f"missing_not_claiming:{','.join(missing_not_claiming)}")
    if "agent_discovery_required" != packet.get("pricing_policy", {}).get("status"):
        errors.append("pricing_policy_must_remain_agent_discovery")
    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
    }


def write_run(packet: dict[str, Any], validation: dict[str, Any], parsed: dict[str, Any], llm_used: bool) -> Path:
    run_dir = RUNS / f"buyer_want_gemma_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"
    run_dir.mkdir(parents=True, exist_ok=True)
    envelope = {
        "schema": "marketplace.buyer_want_envelope.v0.1",
        "packet_hash": canonical_hash(packet),
        "packet": packet,
        "validation": validation,
        "agent_parse": parsed,
        "agent_runtime": {
            "provider": "ollama" if llm_used else "fallback_parser",
            "model": OLLAMA_MODEL if llm_used else "",
        },
    }
    (run_dir / "buyer_want.json").write_text(json.dumps(envelope, indent=2, sort_keys=True), encoding="utf-8")
    report = [
        "# Buyer Want Gemma Probe",
        "",
        f"- Want id: `{packet['want_id']}`",
        f"- Card: `{packet['catalog_ref']['card']}`",
        f"- Row: `{packet['catalog_ref']['row_id']}`",
        f"- Evidence profile: `{packet['evidence_expectation']['baseline_profile']}`",
        f"- Condition floor: `{packet['condition_floor']}`",
        f"- Max total price: `{packet['max_total_price']['amount']} {packet['max_total_price']['currency']}`",
        f"- Pricing policy: `{packet['pricing_policy']['status']}`",
        f"- Runtime: `{envelope['agent_runtime']['provider']} {envelope['agent_runtime']['model']}`",
        f"- Valid: `{validation['valid']}`",
        "",
        "## Agent Boundaries",
        "",
        *[f"- {item}" for item in packet["not_claiming"]],
        "",
        "## Human Text",
        "",
        packet["human_text"],
    ]
    (run_dir / "REPORT.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    return run_dir


def main() -> None:
    global OLLAMA_MODEL

    parser = argparse.ArgumentParser(description="Draft a Buyer Want packet with a local Gemma agent.")
    parser.add_argument("human_text", nargs="*", help="Human buyer request")
    parser.add_argument("--model", default=OLLAMA_MODEL, help="Ollama model name")
    parser.add_argument("--no-llm", action="store_true", help="Use deterministic fallback parser only")
    parser.add_argument("--json", action="store_true", help="Print the full envelope JSON")
    args = parser.parse_args()

    OLLAMA_MODEL = args.model

    human_text = " ".join(args.human_text).strip() or "I want a Japanese No Rarity Charizard LP or better under $1500 shipped"
    catalog = load_catalog()
    start = time.monotonic()
    llm_used = False
    parsed = None if args.no_llm else call_gemma(human_text, catalog_hint(catalog))
    if parsed is not None:
        llm_used = True
    if parsed is None:
        parsed = fallback_parse(human_text)
    else:
        parsed = merge_with_deterministic_read(human_text, parsed)
    parsed["elapsed_s"] = round(time.monotonic() - start, 3)
    card, match_kind = find_card(catalog, parsed, human_text)
    packet = build_buyer_want(human_text, parsed, card, match_kind)
    validation = validate_buyer_want(packet)
    run_dir = write_run(packet, validation, parsed, llm_used)
    envelope = {
        "run_dir": str(run_dir),
        "packet_hash": canonical_hash(packet),
        "packet": packet,
        "validation": validation,
        "agent_parse": parsed,
        "agent_runtime": {
            "provider": "ollama" if llm_used else "fallback_parser",
            "model": OLLAMA_MODEL if llm_used else "",
        },
    }
    if args.json:
        print(json.dumps(envelope, indent=2, sort_keys=True))
        return
    print(json.dumps({
        "run_dir": str(run_dir),
        "want_id": packet["want_id"],
        "card": packet["catalog_ref"]["card"],
        "row_id": packet["catalog_ref"]["row_id"],
        "profile": packet["evidence_expectation"]["baseline_profile"],
        "condition_floor": packet["condition_floor"],
        "max_total_price": packet["max_total_price"],
        "valid": validation["valid"],
        "runtime": envelope["agent_runtime"],
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
