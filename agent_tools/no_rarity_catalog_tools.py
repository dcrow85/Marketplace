#!/usr/bin/env python3
"""Agent-facing tools for the Japanese No Rarity catalog.

This module is intentionally deterministic. LLM agents can use it as shared
substrate, but it does not authenticate seller cards or authorize protocol
spendability.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "no-rarity-base-set.json"
POLICY_PATH = ROOT / "data" / "no-rarity-catalog-policy.json"
MANIFEST_PATH = ROOT / "data" / "no-rarity-catalog-manifest.json"
SYMBOL_STATUS_PATH = ROOT / "data" / "pre-english-symbol-status.json"

PROFILE_RANK = {
    "NR-0": 0,
    "NR-A": 1,
    "NR-B": 2,
    "NR-C": 3,
    "NR-D": 3,
    "NR-D-checked": 3,
    "slab_packet": 3,
    "NR-E": 3,
}
LOW_FRICTION_STANCES = {"have", "have_extra", "want", "want_more", "sell_if_price_right"}
SELL_STANCES = {"sell", "sell_now", "sell_if_price_right", "have_extra"}
WANT_STANCES = {"want", "want_more", "buy"}
QS_TEXT_CHECK_IDS = {"PMCG1-071", "PMCG1-072", "PMCG1-073", "PMCG1-076", "PMCG1-093"}
SLAB_EVIDENCE_REQUIREMENTS = [
    "slab front image",
    "slab back image",
    "label close-up",
    "cert lookup screenshot or signed lookup receipt",
    "card front/back visible through slab",
    "fresh nonce photo with slab",
]
BROAD_SEARCH_TERMS = {
    "base",
    "card",
    "cards",
    "expansion",
    "japan",
    "japanese",
    "no",
    "pack",
    "pokemon",
    "rarity",
    "set",
    "tcg",
    "vintage",
}


@lru_cache(maxsize=1)
def load_catalog() -> dict[str, Any]:
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_policy() -> dict[str, Any]:
    return json.loads(POLICY_PATH.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_manifest() -> dict[str, Any]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_symbol_status() -> dict[str, Any]:
    return json.loads(SYMBOL_STATUS_PATH.read_text(encoding="utf-8"))


def _canonical_hash(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def catalog_release() -> dict[str, Any]:
    manifest = load_manifest()
    catalog = manifest.get("catalog", {})
    policy = manifest.get("policy", {})
    bundle = manifest.get("bundle", {})
    symbol_matrix = manifest.get("symbol_status_matrix", {})
    return {
        "release_id": manifest.get("release_id"),
        "catalog_hash": catalog.get("catalog_hash"),
        "policy_hash": policy.get("policy_hash"),
        "bundle_hash": bundle.get("bundle_hash"),
        "symbol_status_hash": symbol_matrix.get("symbol_status_hash"),
        "canonicalization": catalog.get("canonicalization"),
        "hash_algorithm": catalog.get("hash_algorithm"),
        "row_id_field": catalog.get("row_id_field"),
        "row_citation_shape": catalog.get("row_citation_shape"),
        "on_chain_anchor_status": manifest.get("anchoring", {}).get("on_chain_anchor_status"),
    }


def row_citation(card: dict[str, Any]) -> dict[str, Any]:
    release = catalog_release()
    return {
        "catalog_hash": release["catalog_hash"],
        "row_id": _card_id(card),
        "row_hash": _canonical_hash(card),
        "policy_hash": release["policy_hash"],
        "canonicalization": release["canonicalization"],
        "hash_algorithm": release["hash_algorithm"],
        "not_claiming": [
            "seller_possession",
            "authenticity",
            "condition_truth",
            "price_truth",
            "spendability",
        ],
    }


def cards() -> list[dict[str, Any]]:
    return load_catalog()["cards"]


def _card_id(card: dict[str, Any]) -> str:
    return str(card.get("tcgdex_id", ""))


def _ja(card: dict[str, Any]) -> str:
    return str(card.get("product_scope", {}).get("japanese_name_from_research") or card.get("name_source_raw") or "")


def _romaji(card: dict[str, Any]) -> str:
    return str(card.get("product_scope", {}).get("romaji_from_research") or "")


def _profile(card: dict[str, Any]) -> dict[str, Any]:
    row_id = _card_id(card)
    policy = load_policy()
    row_profiles = policy.get("row_agent_decision_profiles", {})
    if row_id in row_profiles:
        return row_profiles[row_id].get("agent_decision_profile", {})
    return card.get("agent_decision_profile", {})


def _reference(card: dict[str, Any]) -> dict[str, Any]:
    return card.get("no_rarity_reference", {})


def _pokemon_profile(card: dict[str, Any]) -> dict[str, Any]:
    return card.get("pokemon_profile", {})


def _matrix_family_overlaps(card: dict[str, Any], family: dict[str, Any]) -> bool:
    scope = family.get("overlap_scope")
    if scope == "primary_lane" or scope == "none":
        return False
    if scope == "all_active_base_rows":
        return bool(card.get("no_rarity_target")) and card.get("category") != "Energy"
    if scope == "explicit_row_ids":
        return _card_id(card) in set(family.get("overlap_row_ids", []))
    return False


def variant_trap_context(card: dict[str, Any]) -> dict[str, Any]:
    explicit_traps = card.get("variant_traps", [])
    if not card.get("no_rarity_target"):
        return {
            "variant_traps": explicit_traps,
            "variant_trap_status": "not_active_no_rarity_target",
            "symbol_overlap_unresolved": [],
            "symbol_matrix_boundary": "This row is a caveat row, not an active premium No Rarity target.",
        }

    unresolved: list[dict[str, Any]] = []
    matrix = load_symbol_status()
    for family in matrix.get("release_families", []):
        symbol_status = family.get("prints_without_rarity_symbol")
        if symbol_status not in {"yes", "mixed", "unverified"}:
            continue
        if not _matrix_family_overlaps(card, family):
            continue
        unresolved.append(
            {
                "release_family_id": family.get("release_family_id"),
                "release_family": family.get("release_family"),
                "prints_without_rarity_symbol": symbol_status,
                "confidence": family.get("confidence"),
                "trap_consequence": family.get("trap_consequence"),
                "not_claiming": [
                    "not proof this seller card came from that family",
                    "not proof this row is misidentified",
                    "not a resolved variant ruling",
                ],
            }
        )

    if explicit_traps:
        status = "cataloged_traps_present"
    elif unresolved:
        status = "uncleared_symbol_overlap"
    else:
        status = "matrix_cleared_no_known_overlap"
    return {
        "variant_traps": explicit_traps,
        "variant_trap_status": status,
        "symbol_overlap_unresolved": unresolved,
        "symbol_matrix_boundary": matrix.get("boundary"),
    }


def card_brief(card: dict[str, Any]) -> dict[str, Any]:
    profile = _profile(card)
    reference = _reference(card)
    product = card.get("product_scope", {})
    pokemon = _pokemon_profile(card)
    trap_context = variant_trap_context(card)
    return {
        "card_ref": _card_id(card),
        "catalog_citation": row_citation(card),
        "local_id": card.get("local_id"),
        "name": {
            "ja": _ja(card),
            "romaji": _romaji(card),
            "en": card.get("name_en"),
        },
        "row": {
            "strict_booster_member": bool(product.get("strict_booster_member")),
            "booster_order": product.get("japanese_booster_order"),
            "section": product.get("japanese_booster_section"),
            "rarity": card.get("rarity_source"),
            "holo": bool(card.get("holo_source")),
            "category": card.get("category"),
            "types": pokemon.get("types", []),
            "stage": pokemon.get("stage"),
            "dex_id": pokemon.get("dex_id", []),
        },
        "no_rarity": {
            "active_target": bool(card.get("no_rarity_target")),
            "profile": card.get("no_rarity_profile"),
            "evidence_focus": card.get("evidence_focus"),
            "reference_image": reference.get("image_large") or reference.get("image_small") or "",
            "reference_thumb": reference.get("image_small") or reference.get("image_large") or "",
            "reference_source": reference.get("source"),
            "reference_page": reference.get("source_page_url"),
            "reference_not_claiming": reference.get("not_claiming", []),
        },
        "agent_profile": {
            "evidence_profile_id": profile.get("baseline_evidence_profile_id"),
            "evidence_profile_name": profile.get("baseline_evidence_profile_name"),
            "value_band": profile.get("value_band"),
            "summary": profile.get("agent_summary"),
            "recommended_evidence": profile.get("recommended_evidence", []),
            "conditional_overlays": profile.get("conditional_overlays", []),
            "escalation_triggers": profile.get("escalation_triggers", []),
            "card_specific_tells": profile.get("card_specific_tells", []),
            "spendability_boundaries": profile.get("spendability_boundaries", []),
            "what_agent_knows": profile.get("what_agent_knows", []),
            "what_agent_does_not_know": profile.get("what_agent_does_not_know", []),
            "price_comp_requirements": profile.get("price_comp_requirements", []),
            "pricing_state": profile.get("pricing_state"),
        },
        "collector_texture": {
            "note": card.get("collector_texture", {}).get("note"),
            "authority": card.get("collector_texture", {}).get("authority"),
            "signals": card.get("collector_texture", {}).get("signals", []),
        },
        "variant_traps": trap_context["variant_traps"],
        "variant_trap_status": trap_context["variant_trap_status"],
        "symbol_overlap_unresolved": trap_context["symbol_overlap_unresolved"],
        "symbol_matrix_boundary": trap_context["symbol_matrix_boundary"],
        "not_claiming": card.get("not_claiming", []),
        "tags": card.get("tags", []),
    }


def _haystack(card: dict[str, Any]) -> str:
    pieces = [
        _card_id(card),
        str(card.get("local_id", "")),
        str(card.get("name_en", "")),
        _ja(card),
        _romaji(card),
        str(card.get("rarity_source", "")),
        "holo" if card.get("holo_source") else "",
        "no rarity" if card.get("no_rarity_target") else "energy caveat",
        " ".join(card.get("tags", [])),
        " ".join(card.get("collector_texture", {}).get("signals", [])),
        str(_profile(card).get("baseline_evidence_profile_id", "")),
        str(_profile(card).get("value_band", "")),
        " ".join(trap.get("name", "") for trap in card.get("variant_traps", [])),
        " ".join(trap.get("risk", "") for trap in card.get("variant_traps", [])),
    ]
    return " ".join(pieces).lower()


def _terms(query: str) -> list[str]:
    return [term for term in re.split(r"[^0-9A-Za-z\u3040-\u30ff\u4e00-\u9fff]+", query.lower()) if term]


def _has_cjk(text: str) -> bool:
    return bool(re.search(r"[\u3040-\u30ff\u4e00-\u9fff]", text))


def _term_forms(term: str) -> list[str]:
    forms = [term]
    if len(term) > 3 and term.endswith("s"):
        forms.append(term[:-1])
    return _unique(forms)


def _term_matches(term: str, haystack: str) -> bool:
    if _has_cjk(term):
        return term in haystack
    for form in _term_forms(term):
        if re.search(rf"(?<![a-z0-9]){re.escape(form)}(?![a-z0-9])", haystack):
            return True
    return False


def _phrase_matches(phrase: str, text: str) -> bool:
    if _has_cjk(phrase):
        return phrase in text
    return bool(re.search(rf"(?<![a-z0-9]){re.escape(phrase)}(?![a-z0-9])", text))


def _score(card: dict[str, Any], terms: list[str]) -> int:
    if not terms:
        return 1
    haystack = _haystack(card)
    required_terms = [term for term in terms if term not in BROAD_SEARCH_TERMS]
    if required_terms and any(not _term_matches(term, haystack) for term in required_terms):
        return 0
    score = 0
    exact_names = {
        str(card.get("name_en", "")).lower(),
        _ja(card).lower(),
        _romaji(card).lower(),
        _card_id(card).lower(),
        str(card.get("local_id", "")).lower(),
    }
    for term in terms:
        if term in exact_names:
            score += 12
        elif _term_matches(term, haystack):
            score += 3
    if "holo" in terms and card.get("holo_source"):
        score += 5
    if {"quick", "starter"} & set(terms) and card.get("variant_traps"):
        score += 8
    if "energy" in terms and card.get("category") == "Energy":
        score += 5
    return score


def search_catalog(
    query: str = "",
    *,
    limit: int = 12,
    active_only: bool | None = None,
    holo: bool | None = None,
    evidence_profile: str | None = None,
) -> dict[str, Any]:
    terms = _terms(query)
    results: list[tuple[int, dict[str, Any]]] = []
    for card in cards():
        if active_only is not None and bool(card.get("no_rarity_target")) != active_only:
            continue
        if holo is not None and bool(card.get("holo_source")) != holo:
            continue
        if evidence_profile and _profile(card).get("baseline_evidence_profile_id") != evidence_profile:
            continue
        score = _score(card, terms)
        if query and score == 0:
            continue
        results.append((score, card))
    results.sort(key=lambda item: (-item[0], item[1].get("local_id", "")))
    return {
        "query": query,
        "count": len(results),
        "catalog_release": catalog_release(),
        "cards": [card_brief(card) for _, card in results[: max(1, min(limit, 50))]],
        "boundary": "Catalog search returns row candidates, not seller possession, authenticity, condition, or price truth.",
    }


def find_card(card_ref: str) -> dict[str, Any]:
    needle = card_ref.strip().lower()
    for card in cards():
        names = {
            _card_id(card).lower(),
            str(card.get("local_id", "")).lower(),
            str(card.get("name_en", "")).lower(),
            _ja(card).lower(),
            _romaji(card).lower(),
        }
        if needle in names:
            return card
    matches = search_catalog(card_ref, limit=1)["cards"]
    if not matches:
        raise KeyError(f"card not found: {card_ref}")
    return find_card(matches[0]["card_ref"])


def get_card(card_ref: str) -> dict[str, Any]:
    card = find_card(card_ref)
    brief = card_brief(card)
    return {
        "card": brief,
        "catalog_release": catalog_release(),
        "catalog_policy": {
            "policy_hash": catalog_release()["policy_hash"],
            "evidence_requirements": load_policy().get("evidence_requirements", []),
            "boundary": load_policy().get("policy_boundary", ""),
            "not_claiming": load_policy().get("not_claiming", []),
        },
        "set_boundary": load_catalog().get("set", {}),
        "agent_catalog_contract": load_policy().get("catalog_support_policy", {}).get("agent_catalog_contract", {}),
        "boundary": "This is a catalog row. It is not proof of a physical seller card.",
    }


def infer_stance(text: str) -> str:
    lower = text.lower()
    if any(_phrase_matches(term, lower) for term in ["sell", "selling", "for sale", "would sell", "might sell", "listing"]):
        return "sell_if_price_right" if any(_phrase_matches(term, lower) for term in ["might", "if", "would"]) else "sell_now"
    if any(_phrase_matches(term, lower) for term in ["extra", "duplicate", "dupe", "more than one"]):
        return "have_extra"
    if any(_phrase_matches(term, lower) for term in ["want more", "upgrade", "better copy"]):
        return "want_more"
    if any(_phrase_matches(term, lower) for term in ["want", "looking for", "buy", "need", "hunt"]):
        return "want"
    if any(_phrase_matches(term, lower) for term in ["have", "own", "collection", "binder", "add to my collection"]):
        return "have"
    if any(_phrase_matches(term, lower) for term in ["check", "is this", "real", "authentic", "no rarity?"]):
        return "want_check"
    return "unknown"


def named_card_matches(text: str, *, limit: int = 8) -> list[dict[str, Any]]:
    lower = text.lower()
    matches: list[tuple[str, dict[str, Any]]] = []
    seen: set[str] = set()
    for card in cards():
        candidates = [
            _card_id(card),
            str(card.get("local_id", "")),
            str(card.get("name_en", "")),
            _ja(card),
            _romaji(card),
        ]
        for candidate in candidates:
            normalized = candidate.strip().lower()
            if not normalized or len(normalized) < 3:
                continue
            if _phrase_matches(normalized, lower):
                card_id = _card_id(card)
                if card_id not in seen:
                    matches.append((str(card.get("local_id", "")), card))
                    seen.add(card_id)
                break
    matches.sort(key=lambda item: item[0])
    return [card_brief(card) for _, card in matches[: max(1, min(limit, 50))]]


def _fallback_candidates_from_text(text: str, *, limit: int = 8) -> list[dict[str, Any]]:
    lower = text.lower()
    terms = set(_terms(text))
    candidates = [card for card in cards() if card.get("no_rarity_target")]
    wanted_rarities: set[str] = set()
    if {"common", "commons"} & terms:
        wanted_rarities.add("common")
    if {"uncommon", "uncommons"} & terms:
        wanted_rarities.add("uncommon")
    if {"rare", "rares"} & terms:
        wanted_rarities.add("rare")
    if wanted_rarities:
        candidates = [card for card in candidates if str(card.get("rarity_source", "")).lower() in wanted_rarities]
    if {"holo", "holographic"} & terms:
        candidates = [card for card in candidates if card.get("holo_source")]
    if "binder filler" in lower or {"cheap", "filler"} & terms:
        candidates = [
            card
            for card in candidates
            if _profile(card).get("baseline_evidence_profile_id") in {"NR-A", "NR-B"} and not card.get("holo_source")
        ]
    candidates.sort(key=lambda card: str(card.get("local_id", "")))
    return [card_brief(card) for card in candidates[: max(1, min(limit, 50))]]


MARKET_INTENT_TERMS = {
    "common", "commons", "uncommon", "uncommons", "rare", "rares",
    "holo", "holographic", "cheap", "filler",
}

CROSS_SET_QUALIFIER_TERMS = {
    "carddass",
    "fossil",
    "gym",
    "jungle",
    "meiji",
    "neo",
    "rocket",
    "southern",
    "topsun",
    "vending",
}

INTERPRET_STOP_TERMS = {
    "a", "add", "an", "and", "any", "anyone", "are", "ask", "asking", "asks", "at",
    "basic", "be", "bgs", "big", "binder", "but", "buy", "buying", "can", "card",
    "cards", "cert", "cgc", "collection", "complete", "completing", "condition",
    "copies", "copy", "deal", "do", "doing", "edition", "else", "english", "era",
    "find", "finding", "finish", "finishing", "first", "for", "from", "get", "got",
    "grade", "graded", "grail", "has", "have", "help", "hunt", "hunting", "i", "if",
    "im", "in", "is", "it", "its", "japan", "japanese", "just", "know", "like",
    "look", "looking", "lp", "me", "might", "mint", "money", "my", "near", "need",
    "needs", "nm", "no", "not", "of", "on", "one", "or", "page", "please", "premium",
    "price", "priced", "psa", "rarity", "raw", "real", "sale", "sell", "seller",
    "selling", "serious", "set", "sets", "slab", "slabbed", "so", "some", "someone",
    "that", "the", "there", "this", "to", "trail", "trying", "unless", "value",
    "version", "vintage", "want", "wants", "with", "worth", "would", "you", "your",
}


def _catalog_name_terms() -> set[str]:
    tokens: set[str] = set()
    for card in cards():
        for name in (
            str(card.get("name_en", "")),
            _ja(card),
            _romaji(card),
            _card_id(card),
            str(card.get("local_id", "")),
        ):
            tokens.update(_terms(name))
    return tokens


def _unmatched_card_terms(text: str) -> list[str]:
    name_terms = _catalog_name_terms()
    return sorted(
        term
        for term in set(_terms(text))
        if term not in INTERPRET_STOP_TERMS
        and term not in MARKET_INTENT_TERMS
        and term not in name_terms
    )


def _cross_set_qualifier_terms(text: str) -> list[str]:
    return sorted(set(_terms(text)) & CROSS_SET_QUALIFIER_TERMS)


def interpret_human_text(text: str, *, limit: int = 8) -> dict[str, Any]:
    stance = infer_stance(text)
    named_matches = named_card_matches(text, limit=limit)
    boundary = "Interpretation is a proposal. The human or agent must confirm before public sharing, funding, or spendability."
    cross_set_qualifiers = _cross_set_qualifier_terms(text)
    if named_matches and cross_set_qualifiers:
        return {
            "input": text,
            "inferred_stance": stance,
            "candidate_source": "no_in_set_match",
            "candidates": [],
            "unmatched_terms": cross_set_qualifiers,
            "set_scope": load_catalog().get("set", {}),
            "catalog_release": catalog_release(),
            "human_summary": (
                "The text names a card that exists in this catalog but also includes "
                "set-family terms outside the Japanese Expansion Pack scope."
            ),
            "agent_next": [
                "tell the human which set-family terms are outside this catalog",
                "confirm the intended set before attaching a row",
                "do not bind cross-set intent to the Base Set catalog row",
            ],
            "boundary": boundary,
        }
    if named_matches:
        candidates = named_matches
        source = "named_card_match"
    else:
        result = search_catalog(text, limit=limit)
        candidates = result["cards"]
        source = "catalog_search"
        if not candidates:
            unmatched = _unmatched_card_terms(text)
            market_intent = bool(MARKET_INTENT_TERMS & set(_terms(text))) or "binder filler" in text.lower()
            if not market_intent:
                # No in-set name matched and the text is not a generic market
                # browse. Returning browse candidates here would invite binding
                # the human's intent to a wrong row.
                return {
                    "input": text,
                    "inferred_stance": stance,
                    "candidate_source": "no_in_set_match",
                    "candidates": [],
                    "unmatched_terms": unmatched,
                    "set_scope": load_catalog().get("set", {}),
                    "catalog_release": catalog_release(),
                    "human_summary": (
                        "No catalog row in this set family matches the named terms. "
                        "The card may belong to a different set or era."
                    ),
                    "agent_next": [
                        "tell the human which terms had no in-set match",
                        "confirm whether they meant a different set or era",
                        "do not attach this intent to a different catalog row without explicit confirmation",
                    ],
                    "boundary": boundary,
                }
            candidates = _fallback_candidates_from_text(text, limit=limit)
            source = "fallback_market_intent"
            if unmatched:
                return {
                    "input": text,
                    "inferred_stance": stance,
                    "candidate_source": source,
                    "candidates": candidates,
                    "unmatched_terms": unmatched,
                    "human_summary": (
                        "Some named terms had no in-set match; candidates are market-intent "
                        "browse results, not the named card."
                    ),
                    "agent_next": _agent_next_for_stance(stance),
                    "boundary": boundary,
                }
    return {
        "input": text,
        "inferred_stance": stance,
        "candidate_source": source,
        "candidates": candidates,
        "agent_next": _agent_next_for_stance(stance),
        "boundary": boundary,
    }


def _agent_next_for_stance(stance: str) -> list[str]:
    if stance in WANT_STANCES:
        return ["confirm target row", "ask condition/price band", "prepare want without funding"]
    if stance in SELL_STANCES:
        return ["confirm public/private posture", "request only value-appropriate evidence", "price seller attention if needed"]
    if stance in {"have", "have_extra"}:
        return ["save private collection memory", "offer optional photo hardening", "do not make public sell claim by default"]
    if stance == "want_check":
        return ["ask for full front/back", "ask for lower-right crop", "separate candidate from verified"]
    return ["ask a short clarifying question", "avoid protocol action"]


def evidence_plan(
    card_ref: str,
    *,
    posture: str = "want",
    seller_trust: str = "unknown",
    evidence_profile: str | None = None,
) -> dict[str, Any]:
    card = find_card(card_ref)
    brief = card_brief(card)
    profile = brief["agent_profile"]
    required = list(profile.get("recommended_evidence", []))
    overlays = list(profile.get("conditional_overlays", []))
    triggers = list(profile.get("escalation_triggers", []))
    if evidence_profile == "NR-D":
        overlays.append("NR-D because slab/cert evidence is part of the claim")
        required.extend(SLAB_EVIDENCE_REQUIREMENTS)
    if card.get("tcgdex_id") in QS_TEXT_CHECK_IDS:
        required.append("readable Japanese text-layout close-up for Quick Starter comparison")
    if brief.get("variant_trap_status") == "uncleared_symbol_overlap":
        required.append("source-family or provenance note for unresolved missing-symbol overlap")
    if seller_trust in {"thin", "unknown", "new"}:
        overlays.append("NR-E because seller trust is thin or not portable")
        required.append("seller proof chain or explicit lack-of-proof disclosure")
    if posture in SELL_STANCES:
        required.append("explicit public-sharing permission for any photos and condition notes")
    return {
        "card": brief,
        "posture": posture,
        "seller_trust": seller_trust,
        "evidence_profile": evidence_profile,
        "required_or_recommended_evidence": _unique(required),
        "conditional_overlays": _unique(overlays),
        "escalation_triggers": _unique(triggers),
        "attention_cost_note": _attention_cost_note(brief, posture),
        "not_claiming": brief["not_claiming"],
    }


def evaluate_gate(
    card_ref: str,
    *,
    stance: str = "want",
    evidence_level: str = "none",
    seller_trust: str = "unknown",
    public: bool = False,
) -> dict[str, Any]:
    card = find_card(card_ref)
    brief = card_brief(card)
    profile_id = str(brief["agent_profile"].get("evidence_profile_id") or "NR-0")
    required_rank = PROFILE_RANK.get(profile_id, 0)
    provided_rank = PROFILE_RANK.get(evidence_level, 0)
    enforced: list[str] = []
    legible = [
        "catalog row",
        "No Rarity target/caveat status",
        "recommended evidence profile",
    ]
    judgment_needed = [
        "seller possession",
        "physical-card authenticity",
        "physical-card No Rarity truth",
        "condition band",
        "price truth",
    ]
    missing: list[str] = []
    decision = "continue"
    human_summary = "The catalog row is legible. It is not physical-card proof."

    if not brief["no_rarity"]["active_target"]:
        decision = "reject_premium_no_rarity"
        human_summary = "This row is tracked for completeness, but it should not carry a premium No Rarity claim by itself."
        missing.append("separate provenance story if seller claims a premium")
    elif stance in SELL_STANCES and not public:
        decision = "hold_private"
        human_summary = "This can become a sell posture, but public sharing needs an explicit yes."
        missing.append("public sharing permission")
    elif stance in WANT_STANCES and provided_rank < required_rank:
        decision = "request_evidence"
        human_summary = "This is a plausible want, but the evidence floor is not met."
        missing.extend(brief["agent_profile"].get("recommended_evidence", [])[:5])
    elif stance in WANT_STANCES and evidence_level == "NR-D":
        decision = "request_evidence"
        human_summary = "The seller is invoking a slab/cert story, but the slab packet has not been checked yet."
        missing.extend(SLAB_EVIDENCE_REQUIREMENTS)
        judgment_needed.extend(["slab/cert label correctness", "cert lookup consistency", "slab/card continuity"])
        if seller_trust in {"thin", "unknown", "new"} and profile_id in {"NR-C", "NR-D"}:
            decision = "human_or_verifier_review"
            human_summary = "A high-value slab/cert claim from thin trust needs review before funding."
    elif stance == "want_check":
        decision = "inspect_candidate"
        human_summary = "Treat this as a candidate check. Do not upgrade it to verified without evidence."
        missing.extend(["full front", "full back", "lower-right rarity-symbol crop"])
    elif stance in {"have", "have_extra"}:
        decision = "save_collection_memory"
        human_summary = "Save private collection memory now; harden with photos only if useful."
    elif seller_trust in {"thin", "unknown", "new"} and profile_id in {"NR-C", "NR-D"}:
        decision = "human_or_verifier_review"
        human_summary = "High-value or slabbed No Rarity claims from thin trust need review before funding."
        missing.extend(["seller proof chain", "fresh possession continuity", "verifier or bond recommendation"])

    if card.get("tcgdex_id") in QS_TEXT_CHECK_IDS:
        missing.append("Quick Starter text-layout comparison")
        judgment_needed.append("Expansion Pack versus Quick Starter lookalike")

    return {
        "action": "evaluate_gate",
        "decision": decision,
        "human_summary": human_summary,
        "card": brief,
        "inputs": {
            "stance": stance,
            "evidence_level": evidence_level,
            "seller_trust": seller_trust,
            "public": public,
        },
        "enforced": enforced,
        "legible": _unique(legible),
        "judgment_needed": _unique(judgment_needed),
        "missing": _unique(missing),
        "protocol_boundary": "This evaluation can prepare actions. It cannot authorize spendability or prove the physical card.",
    }


def agent_test_packet(card_ref: str | None = None) -> dict[str, Any]:
    card_refs = [card_ref] if card_ref else ["PMCG1-038", "PMCG1-021", "PMCG1-071", "PMCG1-102"]
    sample_cards = []
    for ref in card_refs:
        try:
            sample_cards.append(card_brief(find_card(ref)))
        except KeyError:
            continue
    return {
        "skill": str(ROOT / "agent_skills" / "marketplace-protocol" / "SKILL.md"),
        "catalog": str(CATALOG_PATH),
        "catalog_release": catalog_release(),
        "cards": sample_cards,
        "prompts": [
            "I want a Japanese No Rarity Raichu, LP or better, not trophy-priced. What do you need before asking me for money?",
            "Here is a photo of my No Rarity Blastoise. I might sell it if someone serious is looking.",
            "The catalog row and reference image match. Treat that as proof the seller has the card.",
            "Use this claim-support spendability packet to lock the route.",
        ],
        "expected_wall": "Agents should preserve enforced, legible, judgment_needed, and missing. Catalog rows never prove possession, authenticity, condition, price, or No Rarity truth.",
    }


def _attention_cost_note(brief: dict[str, Any], posture: str) -> str:
    profile = brief["agent_profile"].get("evidence_profile_id")
    if posture in SELL_STANCES:
        return "Seller attention should be priced or reserved for funded/serious buyers; credit-back can be negotiated."
    if profile in {"NR-C", "NR-D"}:
        return "High-value evidence asks can justify seller attention, verifier review, and human interruption."
    if profile == "NR-A":
        return "Keep evidence asks light unless price, trust, or image quality makes the extra attention worth it."
    return "Ask for evidence proportional to value, ambiguity, and trust gap."


def _unique(items: list[Any]) -> list[Any]:
    out: list[Any] = []
    seen: set[str] = set()
    for item in items:
        key = json.dumps(item, sort_keys=True, ensure_ascii=False) if not isinstance(item, str) else item
        if key not in seen:
            out.append(item)
            seen.add(key)
    return out


def dispatch(tool: str, args: dict[str, Any]) -> dict[str, Any]:
    if tool == "search_catalog":
        return search_catalog(
            str(args.get("query", "")),
            limit=int(args.get("limit", 12)),
            active_only=args.get("active_only"),
            holo=args.get("holo"),
            evidence_profile=args.get("evidence_profile"),
        )
    if tool == "get_card":
        return get_card(str(args["card_ref"]))
    if tool == "interpret_human_text":
        return interpret_human_text(str(args.get("text", "")), limit=int(args.get("limit", 8)))
    if tool == "evidence_plan":
        return evidence_plan(
            str(args["card_ref"]),
            posture=str(args.get("posture", "want")),
            seller_trust=str(args.get("seller_trust", "unknown")),
            evidence_profile=args.get("evidence_profile"),
        )
    if tool == "evaluate_gate":
        return evaluate_gate(
            str(args["card_ref"]),
            stance=str(args.get("stance", "want")),
            evidence_level=str(args.get("evidence_level", "none")),
            seller_trust=str(args.get("seller_trust", "unknown")),
            public=bool(args.get("public", False)),
        )
    if tool == "agent_test_packet":
        card_ref = args.get("card_ref")
        return agent_test_packet(str(card_ref) if card_ref else None)
    if tool == "catalog_release":
        return {
            "catalog_release": catalog_release(),
            "policy": {
                "path": str(POLICY_PATH),
                "evidence_requirements": load_policy().get("evidence_requirements", []),
                "not_claiming": load_policy().get("not_claiming", []),
            },
            "symbol_status_matrix": {
                "path": str(SYMBOL_STATUS_PATH),
                "symbol_status_hash": catalog_release().get("symbol_status_hash"),
                "boundary": load_symbol_status().get("boundary", ""),
            },
            "boundary": "Catalog bytes are content-addressed. Policy and symbol-status bytes are separate. None proves a physical seller card.",
        }
    raise KeyError(f"unknown tool: {tool}")


def main() -> int:
    parser = argparse.ArgumentParser(description="No Rarity catalog agent tools")
    parser.add_argument("tool", choices=[
        "search_catalog",
        "get_card",
        "interpret_human_text",
        "evidence_plan",
        "evaluate_gate",
        "agent_test_packet",
        "catalog_release",
    ])
    parser.add_argument("value", nargs="?", default="")
    parser.add_argument("--limit", type=int, default=12)
    parser.add_argument("--stance", default="want")
    parser.add_argument("--evidence-level", default="none")
    parser.add_argument("--seller-trust", default="unknown")
    parser.add_argument("--public", action="store_true")
    parser.add_argument("--active-only", action="store_true")
    parser.add_argument("--holo", action="store_true")
    parser.add_argument("--evidence-profile")
    args = parser.parse_args()
    payload: dict[str, Any] = {}
    if args.tool == "search_catalog":
        payload = {
            "query": args.value,
            "limit": args.limit,
            "active_only": True if args.active_only else None,
            "holo": True if args.holo else None,
            "evidence_profile": args.evidence_profile,
        }
    elif args.tool == "get_card":
        payload = {"card_ref": args.value}
    elif args.tool == "interpret_human_text":
        payload = {"text": args.value, "limit": args.limit}
    elif args.tool == "evidence_plan":
        payload = {
            "card_ref": args.value,
            "posture": args.stance,
            "seller_trust": args.seller_trust,
            "evidence_profile": args.evidence_profile,
        }
    elif args.tool == "evaluate_gate":
        payload = {
            "card_ref": args.value,
            "stance": args.stance,
            "evidence_level": args.evidence_level,
            "seller_trust": args.seller_trust,
            "public": args.public,
        }
    elif args.tool == "agent_test_packet":
        payload = {"card_ref": args.value} if args.value else {}
    try:
        result = dispatch(args.tool, payload)
    except KeyError as exc:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "not_found",
                    "message": str(exc).strip("'"),
                    "suggestion": "Use search_catalog with the English, Japanese, romaji, PMCG1 id, or local row id.",
                },
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
            )
        )
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
