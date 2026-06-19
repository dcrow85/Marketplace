#!/usr/bin/env python3
"""Build and validate the catalog history dossier corpus.

This layer is for sourced historical depth and collector texture. It is legible
input for agents, not authentication, pricing truth, possession, or protocol
spendability.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "catalog-history"
SOURCE_DIR = DATA_DIR / "source-sets"
OUT_PATH = DATA_DIR / "dossiers.json"
INDEX_PATH = DATA_DIR / "index.json"
MANIFEST_PATH = DATA_DIR / "manifest.json"
AUDIT_PATH = DATA_DIR / "audit.json"

SOURCE_SCHEMA = "marketplace.catalog_history_source_set.v0.1"
CORPUS_SCHEMA = "marketplace.catalog_history_corpus.v0.1"
MANIFEST_SCHEMA = "marketplace.catalog_history_manifest.v0.1"
AUDIT_SCHEMA = "marketplace.catalog_history_audit.v0.1"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"

SOURCE_TIERS = {"A", "B", "C"}
AUTHORITY_LABELS = {"fact", "local_catalog_fact", "interpretive", "judged_texture"}
COVERAGE_VALUES = {"A", "B", "C", "none"}
DOSSIER_TYPES = {"release", "card"}
CLAIM_FIELDS = {
    "release.date",
    "release.vehicle",
    "release.distribution",
    "release.publisher",
    "release.product_count",
    "release.context",
    "release.boundary",
    "release.chase_structure",
    "artist.credit",
    "artist.impact",
    "artist.other_work",
    "card.identity",
    "card.rarity",
    "card.art",
    "card.play_or_collecting_context",
    "history.significance",
    "history.lineage",
    "history.variant",
    "identification.special_instructions",
}
NOT_CLAIMING = [
    "complete deep-history coverage",
    "seller possession",
    "authenticity",
    "condition truth",
    "price truth",
    "official copy counts unless explicitly sourced",
    "approved image display rights",
    "spendability",
]


def canonical_hash(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def load_catalog_releases() -> dict[str, dict[str, Any]]:
    releases: dict[str, dict[str, Any]] = {}
    for path in sorted(ROOT.glob("data/**/releases/*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        release = data.get("release", {})
        release_id = release.get("release_family_id")
        if release_id:
            releases[str(release_id)] = {"path": path, "data": data}
    return releases


def load_catalog_ids() -> tuple[set[str], set[str]]:
    releases = load_catalog_releases()
    release_ids = set(releases)
    row_ids: set[str] = set()
    for item in releases.values():
        for card in item["data"].get("cards", []):
            row_id = card.get("row_id")
            if row_id:
                row_ids.add(str(row_id))
    return release_ids, row_ids


def clean_text(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text if text else fallback


def display_release_name(release: dict[str, Any]) -> str:
    return clean_text(release.get("name_en") or release.get("name_ja") or release.get("release_family_id"), "Unknown release")


def display_card_name(card: dict[str, Any]) -> str:
    return clean_text(card.get("name_en") or card.get("name_ja") or card.get("row_id"), "Unknown card")


def card_number(card: dict[str, Any]) -> str:
    return clean_text(card.get("card_number") or card.get("local_id") or card.get("provider_row", {}).get("number"), "")


def card_rarity(card: dict[str, Any]) -> str:
    rarity = card.get("rarity")
    if rarity:
        return clean_text(rarity)
    for signal in card.get("collector_texture", {}).get("signals", []):
        if isinstance(signal, str) and any(token in signal.lower() for token in ("rare", "common", "promo")):
            return signal
    rarity_source = card.get("rarity_source")
    if isinstance(rarity_source, dict):
        return clean_text(rarity_source.get("display"), "not provided")
    return clean_text(rarity_source, "not provided")


def illustrator_name(card: dict[str, Any]) -> str:
    illustrator = card.get("illustrator")
    if isinstance(illustrator, dict):
        return clean_text(illustrator.get("name") or illustrator.get("display"))
    return ""


def row_ref(path: Path, row_id: str | None = None) -> str:
    ref = path.relative_to(ROOT).as_posix()
    return f"{ref}#row:{row_id}" if row_id else ref


def release_chase_cards(cards: list[dict[str, Any]], limit: int = 8) -> list[dict[str, Any]]:
    scored: list[tuple[int, dict[str, Any]]] = []
    chase_names = {
        "charizard",
        "blastoise",
        "venusaur",
        "pikachu",
        "mewtwo",
        "mew",
        "lugia",
        "ho-oh",
        "umbreon",
        "espeon",
        "tyranitar",
        "gyarados",
        "raichu",
        "chansey",
        "zapdos",
    }
    for card in cards:
        name = display_card_name(card)
        rarity = card_rarity(card)
        signals = " ".join(str(signal) for signal in card.get("collector_texture", {}).get("signals", []))
        score = 0
        haystack = f"{name} {rarity} {signals}".lower()
        if any(chase in haystack for chase in chase_names):
            score += 50
        if "holo" in haystack:
            score += 40
        if "rare" in haystack:
            score += 25
        if "promo" in haystack:
            score += 15
        if card.get("special_identification_instructions"):
            score += 10
        if score:
            scored.append((score, card))
    scored.sort(key=lambda item: (-item[0], clean_text(card_number(item[1]), "9999"), display_card_name(item[1])))
    result: list[dict[str, Any]] = []
    for score, card in scored[:limit]:
        result.append(
            {
                "row_id": card.get("row_id"),
                "name": display_card_name(card),
                "number": card_number(card),
                "rarity_signal": card_rarity(card),
                "why": "local catalog chase heuristic: iconic name, holo/rare/promo signal, or special identification rail",
                "authority_label": "interpretive",
                "not_claiming": ["price truth", "condition truth", "seller possession", "authenticity"],
            }
        )
    return result


def release_key_artists(cards: list[dict[str, Any]], limit: int = 6) -> list[dict[str, Any]]:
    counts: dict[str, int] = {}
    examples: dict[str, list[str]] = {}
    for card in cards:
        artist = illustrator_name(card)
        if not artist:
            continue
        counts[artist] = counts.get(artist, 0) + 1
        examples.setdefault(artist, [])
        if len(examples[artist]) < 3:
            examples[artist].append(display_card_name(card))
    ordered = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:limit]
    return [
        {
            "name": artist,
            "row_count": count,
            "examples": examples.get(artist, []),
            "authority_label": "local_catalog_fact",
            "not_claiming": ["complete artist biography", "direct physical-card print authority"],
        }
        for artist, count in ordered
    ]


def source_contacts_for_release(data: dict[str, Any]) -> list[str]:
    contacts: list[str] = []
    for source in data.get("sources", []):
        source_name = source.get("source")
        url = source.get("source_page_url") or source.get("cards_api_url") or source.get("set_api_url")
        if source_name:
            contacts.append(f"{source_name}: {url}" if url else str(source_name))
    return contacts[:5]


def make_release_dossier(release_id: str, path: Path, data: dict[str, Any]) -> dict[str, Any]:
    release = data.get("release", {})
    cards = data.get("cards", [])
    name = display_release_name(release)
    count = release.get("expected_row_count") or release.get("unique_catalog_row_count") or release.get("printed_total") or len(cards)
    release_date = clean_text(release.get("release_date"), "date not provided")
    release_type = clean_text(release.get("release_type"), "release type not provided")
    product_basis = clean_text(release.get("product_count_basis"), "local catalog row count")
    chase_cards = release_chase_cards(cards)
    key_artists = release_key_artists(cards)
    source_contacts = source_contacts_for_release(data)
    claims = [
        {
            "id": "g1",
            "field": "release.date",
            "text": f"The local catalog records {release_date} as the release date for {name}.",
            "sources": ["s1"],
            "tier": "B",
            "authority_label": "local_catalog_fact",
        },
        {
            "id": "g2",
            "field": "release.vehicle",
            "text": f"The local catalog classifies {name} as release type {release_type}.",
            "sources": ["s1"],
            "tier": "B",
            "authority_label": "local_catalog_fact",
        },
        {
            "id": "g3",
            "field": "release.product_count",
            "text": f"The local catalog currently models {len(cards)} rows for {name}; its count basis says: {product_basis}",
            "sources": ["s1"],
            "tier": "B",
            "authority_label": "local_catalog_fact",
        },
    ]
    basis_claims = ["g1", "g2", "g3"]
    if chase_cards:
        names = ", ".join(card["name"] for card in chase_cards[:5])
        claims.append(
            {
                "id": "g4",
                "field": "release.chase_structure",
                "text": f"A local catalog heuristic highlights these attention-bearing rows for {name}: {names}. This is a collector-navigation cue, not a price ranking.",
                "sources": ["s1"],
                "tier": "B",
                "authority_label": "interpretive",
                "basis_claims": ["g3"],
            }
        )
        basis_claims.append("g4")
    if key_artists:
        artists = ", ".join(f"{artist['name']} ({artist['row_count']} rows)" for artist in key_artists[:4])
        claims.append(
            {
                "id": "g5",
                "field": "artist.impact",
                "text": f"The local catalog's credited-artist surface for {name} is led by {artists}. This measures row coverage, not full artistic biography.",
                "sources": ["s1"],
                "tier": "B",
                "authority_label": "local_catalog_fact",
            }
        )
        basis_claims.append("g5")
    if source_contacts:
        claims.append(
            {
                "id": "g6",
                "field": "release.context",
                "text": f"The release row preserves source contacts for agent follow-up: {'; '.join(source_contacts)}.",
                "sources": ["s1"],
                "tier": "B",
                "authority_label": "local_catalog_fact",
            }
        )
        basis_claims.append("g6")
    return {
        "uid": release_id,
        "type": "release",
        "generated": True,
        "generation_method": "baseline_from_local_catalog_v0.1",
        "context": {
            "name_en": clean_text(release.get("name_en")),
            "name_ja": clean_text(release.get("name_ja")),
            "release_family_id": release_id,
            "release_date": release_date,
            "release_type": release_type,
            "row_count": len(cards),
            "modeled_count": count,
        },
        "sources": [
            {
                "id": "s1",
                "type": "local_catalog",
                "ref": row_ref(path),
                "title": f"Local release catalog: {name}",
                "retrieved": "2026-06-19",
                "tier": "B",
                "not_claiming": ["seller possession", "authenticity", "condition", "price truth", "complete deep-history research"],
            }
        ],
        "claims": claims,
        "release_highlights": {
            "chase_cards": chase_cards,
            "key_artists": key_artists,
            "source_contacts": source_contacts,
            "authority_label": "local_catalog_fact_with_interpretive_chase_heuristic",
            "not_claiming": ["price ranking", "complete artist biography", "market liquidity", "physical-card truth"],
        },
        "special_identification_instructions": [],
        "narrative": {
            "authority_label": "judged_texture",
            "human_title": f"{name}: first-pass assembly note",
            "why_it_matters": f"{name} is now in the history layer instead of sitting as a silent checklist. This baseline tells an agent when it appeared, what kind of release it is, which rows carry obvious collector attention, and which artists surface in the local catalog, while reserving deeper lore for researched upgrades.",
            "basis_claims": basis_claims,
            "not_claiming": ["complete deep history", "official emotional history", "price truth", "physical-card authenticity"],
        },
        "coverage": {
            "release": "B",
            "art": "B" if key_artists else "none",
            "history": "C",
            "identification": "B",
        },
    }


def make_card_dossier(release_id: str, path: Path, release_data: dict[str, Any], card: dict[str, Any]) -> dict[str, Any]:
    row_id = clean_text(card.get("row_id"))
    name = display_card_name(card)
    release = release_data.get("release", {})
    release_name = display_release_name(release)
    number = card_number(card)
    rarity = card_rarity(card)
    artist = illustrator_name(card)
    texture = card.get("collector_texture", {}) if isinstance(card.get("collector_texture"), dict) else {}
    texture_note = clean_text(texture.get("note"), f"{name} is cataloged in {release_name}.")
    claims = [
        {
            "id": "g1",
            "field": "card.identity",
            "text": f"The local catalog anchors {name} as row {row_id} in {release_name}.",
            "sources": ["s1"],
            "tier": "B",
            "authority_label": "local_catalog_fact",
        },
        {
            "id": "g2",
            "field": "card.rarity",
            "text": f"The local catalog's visible rarity or collector signal for {name} is: {rarity}.",
            "sources": ["s1"],
            "tier": "B",
            "authority_label": "local_catalog_fact",
        },
        {
            "id": "g3",
            "field": "history.significance",
            "text": f"The local collector texture says: {texture_note}",
            "sources": ["s1"],
            "tier": "B",
            "authority_label": "judged_texture",
            "basis_claims": ["g1", "g2"],
        },
    ]
    basis_claims = ["g1", "g2", "g3"]
    art_coverage = "none"
    if artist:
        claims.append(
            {
                "id": "g4",
                "field": "artist.credit",
                "text": f"The local catalog credits {artist} for {name}, with the row's own illustrator authority caveats preserved in the source row.",
                "sources": ["s1"],
                "tier": "B",
                "authority_label": "local_catalog_fact",
            }
        )
        basis_claims.append("g4")
        art_coverage = "B"
    if card.get("special_identification_instructions"):
        claims.append(
            {
                "id": "g5",
                "field": "identification.special_instructions",
                "text": f"The local row carries {len(card.get('special_identification_instructions', []))} special identification instruction packet(s) for this card.",
                "sources": ["s1"],
                "tier": "B",
                "authority_label": "local_catalog_fact",
            }
        )
        basis_claims.append("g5")
    return {
        "uid": row_id,
        "type": "card",
        "generated": True,
        "generation_method": "baseline_from_local_catalog_v0.1",
        "context": {
            "name_en": clean_text(card.get("name_en")),
            "name_ja": clean_text(card.get("name_ja")),
            "romaji": clean_text(card.get("romaji")),
            "release_family_id": release_id,
            "row_id": row_id,
            "catalog_row_id": number,
            "release_name": release_name,
        },
        "sources": [
            {
                "id": "s1",
                "type": "local_catalog",
                "ref": row_ref(path, row_id),
                "title": f"Local catalog row: {name} / {release_name}",
                "retrieved": "2026-06-19",
                "tier": "B",
                "not_claiming": ["seller possession", "authenticity", "condition", "price truth", "complete deep-history research"],
            }
        ],
        "claims": claims,
        "card_highlights": {
            "number": number,
            "rarity_signal": rarity,
            "artist": artist,
            "collector_texture_note": texture_note,
            "signals": texture.get("signals", []),
            "authority_label": "local_catalog_fact_and_judged_texture",
            "not_claiming": ["price truth", "condition truth", "seller possession", "authenticity"],
        },
        "special_identification_instructions": card.get("special_identification_instructions", []),
        "narrative": {
            "authority_label": "judged_texture",
            "human_title": f"{name}: first-pass card note",
            "why_it_matters": f"{name} now has a card-level history foothold: identity, rarity signal, artist when known, and the local collector texture are all available to an agent before any trade evidence appears.",
            "basis_claims": basis_claims,
            "not_claiming": ["complete deep history", "price truth", "condition truth", "physical-card authenticity"],
        },
        "coverage": {
            "release": "B",
            "art": art_coverage,
            "history": "C",
            "identification": "B",
        },
    }


def validate_source_ref(ref: str) -> None:
    if ref.startswith(("http://", "https://", "local-catalog:", "local-rollup:")):
        return
    path = ref.split("#", 1)[0]
    if not path:
        raise ValueError(f"empty source ref path in {ref!r}")
    if not (ROOT / path).exists():
        raise ValueError(f"source ref does not exist: {ref}")


def require_string(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} is required")
    return value


def validate_source(source: dict[str, Any], dossier_uid: str, seen: set[str]) -> str:
    sid = require_string(source.get("id"), f"{dossier_uid}: source id")
    if sid in seen:
        raise ValueError(f"{dossier_uid}: duplicate source id {sid}")
    seen.add(sid)
    if source.get("tier") not in SOURCE_TIERS:
        raise ValueError(f"{dossier_uid}: source {sid} invalid tier {source.get('tier')!r}")
    require_string(source.get("title"), f"{dossier_uid}: source {sid} title")
    validate_source_ref(require_string(source.get("ref"), f"{dossier_uid}: source {sid} ref"))
    not_claiming = source.get("not_claiming")
    if not isinstance(not_claiming, list) or not not_claiming:
        raise ValueError(f"{dossier_uid}: source {sid} must carry not_claiming")
    return sid


def validate_claim(claim: dict[str, Any], dossier_uid: str, source_ids: set[str], claim_ids: set[str]) -> str:
    cid = require_string(claim.get("id"), f"{dossier_uid}: claim id")
    if cid in claim_ids:
        raise ValueError(f"{dossier_uid}: duplicate claim id {cid}")
    claim_ids.add(cid)
    if claim.get("field") not in CLAIM_FIELDS:
        raise ValueError(f"{dossier_uid}/{cid}: invalid field {claim.get('field')!r}")
    if claim.get("tier") not in SOURCE_TIERS:
        raise ValueError(f"{dossier_uid}/{cid}: invalid tier {claim.get('tier')!r}")
    if claim.get("authority_label") not in AUTHORITY_LABELS:
        raise ValueError(f"{dossier_uid}/{cid}: invalid authority_label {claim.get('authority_label')!r}")
    require_string(claim.get("text"), f"{dossier_uid}/{cid}: text")
    refs = claim.get("sources")
    if not isinstance(refs, list) or not refs:
        raise ValueError(f"{dossier_uid}/{cid}: sources must be a non-empty list")
    missing = [ref for ref in refs if ref not in source_ids]
    if missing:
        raise ValueError(f"{dossier_uid}/{cid}: unknown source ids {missing}")
    if claim["authority_label"] in {"interpretive", "judged_texture"}:
        basis = claim.get("basis_claims")
        if not isinstance(basis, list) or not basis:
            raise ValueError(f"{dossier_uid}/{cid}: interpretive claims require basis_claims")
    return cid


def validate_special_instructions(dossier: dict[str, Any]) -> None:
    uid = dossier["uid"]
    instructions = dossier.get("special_identification_instructions")
    if not isinstance(instructions, list):
        raise ValueError(f"{uid}: special_identification_instructions must be a list")
    for index, instruction in enumerate(instructions):
        if not isinstance(instruction, dict):
            raise ValueError(f"{uid}: special_identification_instructions[{index}] must be an object")
        for key in ("id", "authority_label", "trigger", "summary", "steps", "not_claiming"):
            if key not in instruction:
                raise ValueError(f"{uid}: special_identification_instructions[{index}] missing {key}")
        if instruction["authority_label"] != "legible":
            raise ValueError(f"{uid}: special_identification_instructions[{index}] must be legible")
        if not isinstance(instruction["steps"], list) or not instruction["steps"]:
            raise ValueError(f"{uid}: special_identification_instructions[{index}].steps must be non-empty")
        if not isinstance(instruction["not_claiming"], list) or not instruction["not_claiming"]:
            raise ValueError(f"{uid}: special_identification_instructions[{index}].not_claiming must be non-empty")


def validate_narrative(dossier: dict[str, Any], claim_ids: set[str]) -> None:
    uid = dossier["uid"]
    narrative = dossier.get("narrative")
    if not isinstance(narrative, dict):
        raise ValueError(f"{uid}: narrative is required")
    for key in ("human_title", "why_it_matters"):
        require_string(narrative.get(key), f"{uid}: narrative.{key}")
    authority = narrative.get("authority_label")
    if authority != "judged_texture":
        raise ValueError(f"{uid}: narrative.authority_label must be judged_texture")
    refs = narrative.get("basis_claims")
    if not isinstance(refs, list) or not refs:
        raise ValueError(f"{uid}: narrative.basis_claims must be non-empty")
    missing = [ref for ref in refs if ref not in claim_ids]
    if missing:
        raise ValueError(f"{uid}: narrative references unknown claims {missing}")
    not_claiming = narrative.get("not_claiming")
    if not isinstance(not_claiming, list) or not not_claiming:
        raise ValueError(f"{uid}: narrative.not_claiming must be non-empty")


def validate_dossier(dossier: dict[str, Any], release_ids: set[str], row_ids: set[str]) -> None:
    uid = require_string(dossier.get("uid"), "dossier uid")
    dossier_type = dossier.get("type")
    if dossier_type not in DOSSIER_TYPES:
        raise ValueError(f"{uid}: invalid type {dossier_type!r}")
    if dossier_type == "release" and uid not in release_ids:
        raise ValueError(f"{uid}: release dossier uid is not a known release_family_id")
    if dossier_type == "card" and uid not in row_ids:
        raise ValueError(f"{uid}: card dossier uid is not a known row_id")

    context = dossier.get("context")
    if not isinstance(context, dict):
        raise ValueError(f"{uid}: context is required")

    source_ids: set[str] = set()
    sources = dossier.get("sources")
    if not isinstance(sources, list) or not sources:
        raise ValueError(f"{uid}: at least one source is required")
    for source in sources:
        validate_source(source, uid, source_ids)

    claim_ids: set[str] = set()
    claims = dossier.get("claims")
    if not isinstance(claims, list) or not claims:
        raise ValueError(f"{uid}: at least one claim is required")
    for claim in claims:
        validate_claim(claim, uid, source_ids, claim_ids)

    for claim in claims:
        for ref in claim.get("basis_claims", []):
            if ref not in claim_ids:
                raise ValueError(f"{uid}/{claim['id']}: basis claim {ref} not found")

    validate_special_instructions(dossier)
    validate_narrative(dossier, claim_ids)

    coverage = dossier.get("coverage")
    if not isinstance(coverage, dict):
        raise ValueError(f"{uid}: coverage is required")
    for key in ("release", "art", "history", "identification"):
        if coverage.get(key) not in COVERAGE_VALUES:
            raise ValueError(f"{uid}: coverage.{key} invalid {coverage.get(key)!r}")


def load_source_sets() -> list[dict[str, Any]]:
    source_files = sorted(SOURCE_DIR.glob("*.json"))
    if not source_files:
        raise ValueError(f"no catalog-history source sets found in {SOURCE_DIR}")
    source_sets: list[dict[str, Any]] = []
    for path in source_files:
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("schema") != SOURCE_SCHEMA:
            raise ValueError(f"{path}: unexpected schema {data.get('schema')!r}")
        source_sets.append({"path": path.relative_to(ROOT).as_posix(), "data": data})
    return source_sets


def build_index(dossiers: list[dict[str, Any]]) -> dict[str, Any]:
    entries: list[dict[str, Any]] = []
    for dossier in dossiers:
        narrative = dossier.get("narrative", {})
        entry = {
            "uid": dossier["uid"],
            "type": dossier["type"],
            "generated": bool(dossier.get("generated")),
            "human_title": narrative.get("human_title", ""),
            "why_it_matters": narrative.get("why_it_matters", ""),
            "coverage": dossier.get("coverage", {}),
            "claim_count": len(dossier.get("claims", [])),
            "special_identification_instruction_count": len(dossier.get("special_identification_instructions", [])),
        }
        if "release_highlights" in dossier:
            highlights = dossier["release_highlights"]
            entry["chase_cards"] = [
                {"row_id": card.get("row_id"), "name": card.get("name"), "number": card.get("number")}
                for card in highlights.get("chase_cards", [])[:6]
            ]
            entry["key_artists"] = [
                {"name": artist.get("name"), "row_count": artist.get("row_count")}
                for artist in highlights.get("key_artists", [])[:6]
            ]
        if "card_highlights" in dossier:
            highlights = dossier["card_highlights"]
            entry["card"] = {
                "number": highlights.get("number", ""),
                "rarity_signal": highlights.get("rarity_signal", ""),
                "artist": highlights.get("artist", ""),
            }
        entries.append(entry)
    return {
        "schema": "marketplace.catalog_history_index.v0.1",
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "not_claiming": NOT_CLAIMING,
        "entries": entries,
    }


def build() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any]]:
    catalog_releases = load_catalog_releases()
    release_ids, row_ids = load_catalog_ids()
    source_sets = load_source_sets()
    dossiers: list[dict[str, Any]] = []
    source_paths: list[str] = []
    seen: set[str] = set()
    for source_set in source_sets:
        source_paths.append(source_set["path"])
        for dossier in source_set["data"].get("dossiers", []):
            validate_dossier(dossier, release_ids, row_ids)
            uid = dossier["uid"]
            if uid in seen:
                raise ValueError(f"duplicate dossier uid {uid}")
            seen.add(uid)
            dossiers.append(dossier)

    generated_release_count = 0
    generated_card_count = 0
    for release_id, item in sorted(catalog_releases.items()):
        path = item["path"]
        data = item["data"]
        if release_id not in seen:
            dossier = make_release_dossier(release_id, path, data)
            validate_dossier(dossier, release_ids, row_ids)
            seen.add(release_id)
            dossiers.append(dossier)
            generated_release_count += 1
        for card in data.get("cards", []):
            row_id = card.get("row_id")
            if not row_id or row_id in seen:
                continue
            dossier = make_card_dossier(release_id, path, data, card)
            validate_dossier(dossier, release_ids, row_ids)
            seen.add(str(row_id))
            dossiers.append(dossier)
            generated_card_count += 1

    dossiers.sort(key=lambda item: (item["type"], item["uid"]))
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    claim_count = sum(len(dossier["claims"]) for dossier in dossiers)
    source_count = sum(len(dossier["sources"]) for dossier in dossiers)
    release_count = sum(1 for dossier in dossiers if dossier["type"] == "release")
    card_count = sum(1 for dossier in dossiers if dossier["type"] == "card")
    coverage = {
        "status": "baseline_full_corpus_with_deep_research_gap",
        "modeled_catalog_releases": len(release_ids),
        "modeled_catalog_rows": len(row_ids),
        "release_dossier_count": release_count,
        "card_dossier_count": card_count,
        "hand_authored_release_dossier_count": release_count - generated_release_count,
        "hand_authored_card_dossier_count": card_count - generated_card_count,
        "generated_release_dossier_count": generated_release_count,
        "generated_card_dossier_count": generated_card_count,
        "claim_count": claim_count,
        "source_count": source_count,
        "special_identification_instruction_dossiers": sum(
            1 for dossier in dossiers if dossier.get("special_identification_instructions")
        ),
        "coverage_by_dimension": {
            dim: {tier: sum(1 for d in dossiers if d["coverage"].get(dim) == tier) for tier in sorted(COVERAGE_VALUES)}
            for dim in ("release", "art", "history", "identification")
        },
        "not_complete": {
            "release_dossiers_remaining_minimum": max(0, len(release_ids) - release_count),
            "card_dossiers_remaining_minimum": max(0, len(row_ids) - card_count),
            "deep_researched_release_dossiers_remaining_minimum": generated_release_count,
            "deep_researched_card_dossiers_remaining_minimum": generated_card_count,
            "note": "Every modeled release and card now has a baseline dossier; generated dossiers are first-pass local-catalog footholds, not complete researched histories.",
        },
        "uids": [dossier["uid"] for dossier in dossiers],
    }
    corpus = {
        "schema": CORPUS_SCHEMA,
        "generated_at": generated_at,
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "not_claiming": NOT_CLAIMING,
        "source_sets": source_paths,
        "coverage": coverage,
        "dossiers": dossiers,
    }
    index = build_index(dossiers)
    hash_preimage = {key: value for key, value in corpus.items() if key != "generated_at"}
    corpus_hash = canonical_hash(hash_preimage)
    index_hash = canonical_hash(index)
    manifest = {
        "schema": MANIFEST_SCHEMA,
        "generated_at": generated_at,
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "corpus": {
            "path": OUT_PATH.relative_to(ROOT).as_posix(),
            "schema": CORPUS_SCHEMA,
            "corpus_hash": corpus_hash,
            "hash_scope": "canonical corpus excluding generated_at",
            "release_dossier_count": release_count,
            "card_dossier_count": card_count,
            "generated_release_dossier_count": generated_release_count,
            "generated_card_dossier_count": generated_card_count,
            "claim_count": claim_count,
            "source_count": source_count,
        },
        "index": {
            "path": INDEX_PATH.relative_to(ROOT).as_posix(),
            "schema": index["schema"],
            "entry_count": len(index["entries"]),
            "index_hash": index_hash,
            "hash_scope": "canonical index",
        },
        "source_sets": source_paths,
        "not_claiming": NOT_CLAIMING,
    }
    audit = {
        "schema": AUDIT_SCHEMA,
        "generated_at": generated_at,
        "passed": True,
        "status": "baseline_full_corpus_with_deep_research_gap",
        "corpus_hash": corpus_hash,
        "index_hash": index_hash,
        "counts": coverage,
        "residuals": [
            {
                "id": "catalog_history_deep_research_incomplete_v0.1",
                "severity": "expected_baseline_gap",
                "description": "Every modeled release and card has a baseline sourced dossier, but most are generated from local catalog facts. The requested end state still requires deeper fact-checked history, lore, artist context, and card-specific collector texture across the full corpus.",
            }
        ],
    }
    return corpus, index, manifest, audit


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build catalog-history dossiers.")
    parser.add_argument("--check", action="store_true", help="validate and report without writing")
    args = parser.parse_args()
    corpus, index, manifest, audit = build()
    existing_manifest_ok = None
    if args.check and MANIFEST_PATH.exists():
        existing = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        existing_manifest_ok = existing.get("corpus", {}).get("corpus_hash") == manifest["corpus"]["corpus_hash"]
    if not args.check:
        write_json(OUT_PATH, corpus)
        write_json(INDEX_PATH, index)
        write_json(MANIFEST_PATH, manifest)
        write_json(AUDIT_PATH, audit)
    print(
        json.dumps(
            {
                "release_dossiers": manifest["corpus"]["release_dossier_count"],
                "card_dossiers": manifest["corpus"]["card_dossier_count"],
                "generated_release_dossiers": manifest["corpus"]["generated_release_dossier_count"],
                "generated_card_dossiers": manifest["corpus"]["generated_card_dossier_count"],
                "claims": manifest["corpus"]["claim_count"],
                "sources": manifest["corpus"]["source_count"],
                "corpus_hash": manifest["corpus"]["corpus_hash"],
                "existing_manifest_ok": existing_manifest_ok,
                "status": audit["status"],
                "wrote": []
                if args.check
                else [
                    manifest["corpus"]["path"],
                    manifest["index"]["path"],
                    MANIFEST_PATH.relative_to(ROOT).as_posix(),
                    AUDIT_PATH.relative_to(ROOT).as_posix(),
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
