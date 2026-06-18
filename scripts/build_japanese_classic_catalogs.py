#!/usr/bin/env python3
"""Build Japanese classic-era Pokemon TCG release catalogs.

This extends the existing Japanese pre-English corpus with the post-1999,
WoC-corresponding Japanese main sets exposed by TCGdex: Challenge from the
Darkness through the Japanese e-Card era. Rows are catalog references only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "japanese-classic"
RELEASE_DIR = OUT_DIR / "releases"
CACHE_DIR = ROOT / ".cache" / "tcgdex_ja_classic"
TCGDEX_API_BASE = "https://api.tcgdex.net/v2"
TCGDEX_DOCS_URL = "https://tcgdex.dev/rest"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"
SOURCE_VERSION = "tcgdex-ja-classic-v0.1"
USER_AGENT = "MarketplaceJapaneseClassicCatalog/0.1 (+local catalog builder)"


NOT_CLAIMING = [
    "complete Japanese promo coverage",
    "Japanese ADV/PCG era coverage",
    "approved image rights",
    "seller possession",
    "authenticity",
    "condition truth",
    "price truth",
    "spendability",
]


@dataclass(frozen=True)
class JapaneseClassicSet:
    tcgdex_set_id: str
    release_family_id: str
    name_en_context: str
    release_type: str
    catalog_treatment: str = "Catalog target"


JAPANESE_CLASSIC_SETS: tuple[JapaneseClassicSet, ...] = (
    JapaneseClassicSet("PMCG6", "jp_tcg_challenge_from_the_darkness_19990625", "Challenge from the Darkness", "main_expansion"),
    JapaneseClassicSet("neo1", "jp_tcg_gold_silver_new_world_20000204", "Gold, Silver, to a New World...", "main_expansion"),
    JapaneseClassicSet("neo2", "jp_tcg_crossing_the_ruins_20000707", "Crossing the Ruins...", "main_expansion"),
    JapaneseClassicSet("neo3", "jp_tcg_awakening_legends_20001123", "Awakening Legends", "main_expansion"),
    JapaneseClassicSet("neo4", "jp_tcg_darkness_and_to_light_20010420", "Darkness, and to Light...", "main_expansion"),
    JapaneseClassicSet("VS1", "jp_tcg_pokemon_card_vs_20010719", "Pokemon Card VS", "main_expansion"),
    JapaneseClassicSet("web1", "jp_tcg_pokemon_card_web_20011020", "Pokemon Card Web", "web_release"),
    JapaneseClassicSet("E1", "jp_tcg_base_expansion_pack_e_20011201", "Pokemon Card e Base Expansion Pack", "main_expansion"),
    JapaneseClassicSet("E2", "jp_tcg_town_on_no_map_20020308", "Town on No Map", "main_expansion"),
    JapaneseClassicSet("E3", "jp_tcg_wind_from_the_sea_20020524", "Wind from the Sea", "main_expansion"),
    JapaneseClassicSet("E4", "jp_tcg_split_earth_20020823", "Split Earth", "main_expansion"),
    JapaneseClassicSet("E5", "jp_tcg_mysterious_mountains_20021004", "Mysterious Mountains", "main_expansion"),
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical_hash(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def cache_path(url: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{hashlib.sha256(f'{SOURCE_VERSION}|{url}'.encode('utf-8')).hexdigest()}.json"


def fetch_json(path: str) -> dict[str, Any]:
    url = f"{TCGDEX_API_BASE}{path}"
    cache_file = cache_path(url)
    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))
    request = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=30) as response:
            payload = {
                "url": url,
                "status": response.status,
                "fetched_at": utc_now(),
                "body": json.loads(response.read().decode("utf-8")),
            }
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as error:
        raise RuntimeError(f"failed to fetch {url}: {error}") from error
    cache_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    time.sleep(0.03)
    return payload


def fetch_set_payload(set_id: str) -> dict[str, Any]:
    return fetch_json(f"/ja/sets/{urllib.parse.quote(set_id, safe='')}")


def fetch_card_payload(card_id: str) -> dict[str, Any]:
    return fetch_json(f"/ja/cards/{urllib.parse.quote(card_id, safe='')}")


def local_id_int(local_id: str) -> int:
    digits = "".join(ch for ch in str(local_id) if ch.isdigit())
    return int(digits) if digits else 9999


def row_from_card(config: JapaneseClassicSet, card: dict[str, Any], set_payload: dict[str, Any]) -> dict[str, Any]:
    row_id = f"{config.release_family_id}:{card['id']}"
    card_url = f"{TCGDEX_API_BASE}/ja/cards/{urllib.parse.quote(card['id'], safe='')}"
    set_url = f"{TCGDEX_API_BASE}/ja/sets/{urllib.parse.quote(config.tcgdex_set_id, safe='')}"
    category = card.get("category", "")
    variants = card.get("variants", {}) or {}
    variants_detailed = card.get("variants_detailed", []) or []
    rarity = card.get("rarity", "")
    return {
        "schema": "marketplace.japanese_classic_card_row.v0.1",
        "row_id": row_id,
        "release_family_id": config.release_family_id,
        "local_id": card.get("id", ""),
        "card_number": str(card.get("localId", "")),
        "name_en": "",
        "name_ja": card.get("name", ""),
        "name_ja_status": "source_labeled" if card.get("name") else "missing_from_exact_source",
        "romaji": "",
        "name_source_note": "TCGdex Japanese card payload name field.",
        "category": category,
        "subtypes": [],
        "rarity_source": rarity,
        "holo_source": bool(variants.get("holo")),
        "pokemon_profile": {
            "abilities": card.get("abilities", []) or [],
            "attacks": card.get("attacks", []) or [],
            "convertedRetreatCost": None,
            "dex_id": card.get("dexId", []) or [],
            "evolvesFrom": card.get("evolveFrom", ""),
            "evolvesTo": card.get("evolveTo", []) or [],
            "hp": card.get("hp"),
            "level": card.get("level"),
            "resistances": card.get("resistances", []) or [],
            "retreatCost": card.get("retreat"),
            "rules": card.get("rules", []) or [],
            "stage": card.get("stage", ""),
            "types": card.get("types", []) or [],
            "weaknesses": card.get("weaknesses", []) or [],
        },
        "illustrator": {
            "authority": "TCGdex Japanese card payload does not consistently provide illustrator for this slice; field remains unresolved unless later sourced.",
            "caption": "",
            "credit_status": "not_provided_by_primary_source",
            "display": "",
            "name": "",
            "not_claiming": ["seller possession", "authenticity", "condition", "Japanese print authority"],
            "requested_page_title": "",
            "resolved_page_title": "",
            "source": "TCGdex REST API",
            "source_page_sha256": "",
            "source_page_url": card_url,
        },
        "tcgdex": {
            "id": card.get("id", ""),
            "set_id": config.tcgdex_set_id,
            "url": card_url,
            "variants": variants,
            "variants_detailed": variants_detailed,
            "image_field_present": False,
            "card_payload_hash": canonical_hash(card),
            "updated": card.get("updated", ""),
            "legal": card.get("legal", {}) or {},
            "pricing": card.get("pricing", {}) or {},
        },
        "pokemon_tcg_api": {},
        "product_scope": {
            "authority": "Japanese classic-era release-family catalog row derived from TCGdex Japanese set and card payloads.",
            "catalog_treatment": config.catalog_treatment,
            "counting_note": (
                "This row belongs to a Japanese classic-era TCGdex source slice. It is not an English WoC row, "
                "not a No Rarity claim, and not proof of a seller's physical copy."
            ),
            "japanese_set_name": set_payload.get("name", ""),
            "english_context_name": config.name_en_context,
            "parent_release_family_id": "",
            "product_card_count": set_payload.get("cardCount", {}).get("official"),
            "product_count_basis": "TCGdex Japanese set metadata supplies official and total counts; rows include every card listed by the set payload.",
            "release_date": set_payload.get("releaseDate", ""),
            "date_precision": "day",
            "release_type": config.release_type,
            "strict_release_member": True,
            "unique_catalog_row_count": set_payload.get("cardCount", {}).get("total"),
            "tcgdex_official_count": set_payload.get("cardCount", {}).get("official"),
            "tcgdex_total_count": set_payload.get("cardCount", {}).get("total"),
        },
        "symbol_status": {
            "prints_without_rarity_symbol": "not_applicable_japanese_classic",
            "confidence": "high",
            "scope": "release_context_not_row_fact",
            "source_mode": "not_applicable_japanese_classic",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller-card symbol state", "seller possession", "Base No Rarity proof"],
        },
        "image_provenance": {
            "allowed_use": [],
            "display_allowed": False,
            "exactness_basis": [
                "TCGdex Japanese card row id",
                "TCGdex Japanese set id",
                "no card image URL supplied in the source payload for this slice",
            ],
            "image_large": "",
            "image_role": "No external reference image is promoted for this row until a source supplies a row-specific image URL.",
            "image_small": "",
            "not_allowed_by_default": ["training", "seller evidence", "authentication proof"],
            "not_claiming": ["seller possession", "seller card match", "condition", "authenticity", "image availability", "image rights approval"],
            "provider_id": card.get("id", ""),
            "provider_title": f"{card.get('name', '')} - {set_payload.get('name', '')} #{card.get('localId', '')}",
            "release_family_id": config.release_family_id,
            "rights_status": "no_image_source_supplied",
            "row_id": row_id,
            "source": "TCGdex REST API",
            "source_page_url": card_url,
            "status": "source_payload_without_image",
            "verification_status": "api_payload_catalog_row_without_image_witness",
        },
        "special_identification_instructions": [],
        "collector_texture": {
            "authority": "Collector texture only. It helps an agent search and explain the row; it is not transaction evidence.",
            "basis": ["TCGdex Japanese set metadata", "TCGdex Japanese card payload"],
            "note": (
                f"{card.get('name', '')} is cataloged as {set_payload.get('name', '')} #{card.get('localId', '')}. "
                "Treat this as a Japanese catalog row, then ask for seller evidence before any trade."
            ),
            "signals": [set_payload.get("name", ""), config.name_en_context, set_payload.get("releaseDate", ""), card.get("localId", ""), rarity, category],
        },
        "information_audit": {
            "audit_scope": "Information architecture only. This row does not authenticate a physical card, condition, possession, or price.",
            "earns_keep": [
                {"field": "TCGdex row id", "surface": "primary", "why": "The agent needs a stable Japanese card-row anchor."},
                {"field": "release family and local id", "surface": "primary", "why": "These prevent cross-set name laundering."},
                {"field": "source image absence", "surface": "agent", "why": "The row must not pretend a visual reference exists when the source does not provide one."},
            ],
            "agent_only": [
                {"field": "source payload hashes", "why": "Useful for audit and re-fetch checks, noisy for the human glance."},
                {"field": "pricing field", "why": "May be useful as source texture, not price truth."},
            ],
        },
        "source_contacts": [
            {
                "source": "TCGdex REST API",
                "docs_url": TCGDEX_DOCS_URL,
                "card_api_url": card_url,
                "set_api_url": set_url,
                "card_payload_hash": canonical_hash(card),
                "set_payload_hash": canonical_hash(set_payload),
                "canonicalization": CANONICALIZATION,
                "hash_algorithm": HASH_ALGORITHM,
                "not_claiming": ["seller possession", "authenticity", "condition", "price truth", "image availability", "image rights approval"],
            }
        ],
        "provider_row": card,
        "not_claiming": ["seller possession", "authenticity", "condition truth", "price truth", "spendability"],
        "tags": [
            "japanese",
            "classic",
            config.release_family_id,
            config.tcgdex_set_id,
            set_payload.get("name", ""),
            config.name_en_context,
            set_payload.get("releaseDate", ""),
            str(card.get("localId", "")),
            rarity,
            category,
        ],
    }


def missing_local_ids(card_refs: list[dict[str, Any]], total: int) -> list[str]:
    if len(card_refs) >= total:
        return []
    present = {local_id_int(card.get("localId", "")) for card in card_refs}
    return [f"{idx:03d}" for idx in range(1, total + 1) if idx not in present]


def build_release(config: JapaneseClassicSet) -> dict[str, Any]:
    set_result = fetch_set_payload(config.tcgdex_set_id)
    set_payload = set_result["body"]
    card_refs = sorted(set_payload.get("cards", []), key=lambda card: local_id_int(card.get("localId", "")))
    detailed_cards = [fetch_card_payload(card_ref["id"])["body"] for card_ref in card_refs]
    total_count = int(set_payload.get("cardCount", {}).get("total") or len(card_refs))
    source_gaps = missing_local_ids(card_refs, total_count)
    rows = [row_from_card(config, card, set_payload) for card in sorted(detailed_cards, key=lambda card: local_id_int(card.get("localId", "")))]
    source = {
        "source": "TCGdex REST API",
        "docs_url": TCGDEX_DOCS_URL,
        "set_api_url": f"{TCGDEX_API_BASE}/ja/sets/{urllib.parse.quote(config.tcgdex_set_id, safe='')}",
        "set_payload_hash": canonical_hash(set_payload),
        "cards_found": len(rows),
        "tcgdex_set_id": config.tcgdex_set_id,
        "tcgdex_official_count": set_payload.get("cardCount", {}).get("official"),
        "tcgdex_total_count": set_payload.get("cardCount", {}).get("total"),
        "source_gap_count": len(source_gaps),
        "unmodeled_expected_cards": source_gaps,
        "fetched_at": set_result.get("fetched_at", ""),
        "not_claiming": ["seller possession", "authenticity", "condition", "price truth", "image availability", "image rights approval"],
    }
    return {
        "schema": "marketplace.japanese_classic_release_catalog.v0.1",
        "release": {
            "release_family_id": config.release_family_id,
            "language": "Japanese",
            "tcgdex_set_id": config.tcgdex_set_id,
            "name_en_context": config.name_en_context,
            "name_ja": set_payload.get("name", ""),
            "series": set_payload.get("serie", {}).get("name", ""),
            "release_date": set_payload.get("releaseDate", ""),
            "date_precision": "day",
            "release_type": config.release_type,
            "expected_row_count": total_count,
            "modeled_row_count": len(rows),
            "tcgdex_official_count": set_payload.get("cardCount", {}).get("official"),
            "tcgdex_total_count": set_payload.get("cardCount", {}).get("total"),
            "source_gap_count": len(source_gaps),
            "unmodeled_expected_cards": source_gaps,
            "count_confidence": "tcgdex_japanese_set_payload_with_explicit_source_gaps" if source_gaps else "tcgdex_japanese_set_payload",
            "catalog_treatment": config.catalog_treatment,
            "strict_release_member": True,
            "product_count_basis": (
                "TCGdex Japanese set metadata and card refs. If card refs are fewer than total count, "
                "the missing local IDs are recorded as source gaps instead of silently claiming completion."
            ),
        },
        "symbol_status": {
            "prints_without_rarity_symbol": "not_applicable_japanese_classic",
            "confidence": "high",
            "source": "TCGdex Japanese set/card context",
            "scope": "release_context_not_row_fact",
            "source_mode": "not_applicable_japanese_classic",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller possession", "Base No Rarity proof"],
        },
        "sources": [source],
        "cards": rows,
        "not_claiming": NOT_CLAIMING,
    }


def audit_release(release: dict[str, Any]) -> dict[str, Any]:
    cards = release.get("cards", [])
    release_meta = release.get("release", {})
    failures: list[str] = []
    row_ids = [card.get("row_id") for card in cards]
    if len(row_ids) != len(set(row_ids)):
        failures.append("duplicate_row_id")
    expected = int(release_meta.get("expected_row_count") or 0)
    source_gap_count = int(release_meta.get("source_gap_count") or 0)
    if len(cards) + source_gap_count != expected:
        failures.append(f"row_count_gap_mismatch rows={len(cards)} gaps={source_gap_count} expected={expected}")
    if source_gap_count != len(release_meta.get("unmodeled_expected_cards", [])):
        failures.append("source_gap_count_list_mismatch")
    for card in cards:
        row_id = card.get("row_id", "")
        for field in ("row_id", "release_family_id", "local_id", "card_number", "name_ja", "product_scope", "image_provenance", "source_contacts", "not_claiming"):
            if field not in card:
                failures.append(f"{row_id}: missing_{field}")
        if card.get("schema") != "marketplace.japanese_classic_card_row.v0.1":
            failures.append(f"{row_id}: wrong_schema")
        if card.get("name_ja_status") != "source_labeled":
            failures.append(f"{row_id}: japanese_name_not_source_labeled")
        if card.get("symbol_status", {}).get("prints_without_rarity_symbol") != "not_applicable_japanese_classic":
            failures.append(f"{row_id}: symbol_status_not_scoped")
        if card.get("product_scope", {}).get("strict_release_member") is not True:
            failures.append(f"{row_id}: strict_release_member_missing")
        image = card.get("image_provenance", {})
        if image.get("rights_status") != "no_image_source_supplied":
            failures.append(f"{row_id}: image_rights_status_should_record_absence")
        if image.get("image_large") or image.get("display_allowed") is not False:
            failures.append(f"{row_id}: image_overclaim")
        if "authenticity" not in card.get("not_claiming", []):
            failures.append(f"{row_id}: missing_authenticity_nonclaim")
        contacts = card.get("source_contacts", [])
        if not contacts or not contacts[0].get("card_payload_hash") or not contacts[0].get("set_payload_hash"):
            failures.append(f"{row_id}: missing_source_hashes")
        if card.get("provider_row", {}).get("id") != card.get("local_id"):
            failures.append(f"{row_id}: provider_row_id_mismatch")
    return {
        "release_family_id": release_meta.get("release_family_id", ""),
        "passed": not failures,
        "failures": failures,
        "row_count": len(cards),
        "expected_row_count": expected,
        "source_gap_count": source_gap_count,
        "unmodeled_expected_cards": release_meta.get("unmodeled_expected_cards", []),
        "tcgdex_official_count": release_meta.get("tcgdex_official_count"),
        "tcgdex_total_count": release_meta.get("tcgdex_total_count"),
        "illustrator_named_rows": sum(1 for card in cards if card.get("illustrator", {}).get("name")),
        "reference_image_witness_rows": sum(1 for card in cards if card.get("image_provenance", {}).get("image_large")),
        "source_payload_without_image_rows": sum(1 for card in cards if card.get("image_provenance", {}).get("status") == "source_payload_without_image"),
    }


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def build_all(*, check: bool = False) -> tuple[dict[str, Any], dict[str, Any]]:
    release_entries: list[dict[str, Any]] = []
    audit_rows: list[dict[str, Any]] = []
    for config in JAPANESE_CLASSIC_SETS:
        release = build_release(config)
        audit = audit_release(release)
        if not audit["passed"]:
            raise ValueError(f"{config.release_family_id} audit failed: {audit['failures'][:5]}")
        path = RELEASE_DIR / f"{config.release_family_id}.json"
        catalog_hash = canonical_hash(release)
        release_entries.append(
            {
                "release_family_id": config.release_family_id,
                "tcgdex_set_id": config.tcgdex_set_id,
                "path": path.relative_to(ROOT).as_posix(),
                "schema": release["schema"],
                "catalog_hash": catalog_hash,
                "row_count": len(release["cards"]),
                "expected_row_count": release["release"]["expected_row_count"],
                "source_gap_count": release["release"]["source_gap_count"],
                "unmodeled_expected_cards": release["release"]["unmodeled_expected_cards"],
                "tcgdex_official_count": release["release"]["tcgdex_official_count"],
                "tcgdex_total_count": release["release"]["tcgdex_total_count"],
                "release_type": config.release_type,
                "catalog_treatment": config.catalog_treatment,
                "release_date": release["release"].get("release_date", ""),
                "series": release["release"].get("series", ""),
                "source_url": release["sources"][0]["set_api_url"],
                "not_claiming": release["not_claiming"],
            }
        )
        audit_rows.append(audit)
        if not check:
            write_json(path, release)
    generated_at = utc_now()
    manifest = {
        "schema": "marketplace.japanese_classic_manifest.v0.1",
        "generated_at": generated_at,
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "source": "TCGdex REST API",
        "source_docs_url": TCGDEX_DOCS_URL,
        "boundary": {
            "language": "Japanese",
            "era": "Japanese classic/WoC-corresponding main sets after existing pre-English corpus through Japanese e-Card E5 / 2002-10-04",
            "included_tcgdex_set_ids": [config.tcgdex_set_id for config in JAPANESE_CLASSIC_SETS],
            "excluded_known_after_boundary_set_ids": ["ADV1", "ADV2", "ADV3"],
            "not_claiming": NOT_CLAIMING,
        },
        "release_count": len(release_entries),
        "row_count": sum(entry["row_count"] for entry in release_entries),
        "expected_row_count": sum(entry["expected_row_count"] for entry in release_entries),
        "source_gap_count": sum(entry["source_gap_count"] for entry in release_entries),
        "releases": release_entries,
        "not_claiming": NOT_CLAIMING,
    }
    audit = {
        "schema": "marketplace.japanese_classic_catalog_audit.v0.1",
        "generated_at": generated_at,
        "passed": all(row["passed"] for row in audit_rows),
        "release_count": len(audit_rows),
        "row_count": sum(row["row_count"] for row in audit_rows),
        "expected_row_count": sum(row["expected_row_count"] for row in audit_rows),
        "source_gap_count": sum(row["source_gap_count"] for row in audit_rows),
        "source_payload_without_image_rows": sum(row["source_payload_without_image_rows"] for row in audit_rows),
        "reference_image_witness_rows": sum(row["reference_image_witness_rows"] for row in audit_rows),
        "illustrator_named_rows": sum(row["illustrator_named_rows"] for row in audit_rows),
        "release_audits": audit_rows,
        "not_claiming": [
            "complete Japanese promo coverage",
            "Japanese ADV/PCG era coverage",
            "row-level physical authentication",
            "image rights approval",
        ],
    }
    if not check:
        write_json(OUT_DIR / "manifest.json", manifest)
        write_json(OUT_DIR / "audit.json", audit)
    return manifest, audit


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Japanese classic-era Pokemon TCG catalogs.")
    parser.add_argument("--check", action="store_true", help="build and audit without writing output files")
    args = parser.parse_args()
    manifest, audit = build_all(check=args.check)
    print(
        json.dumps(
            {
                "release_count": manifest["release_count"],
                "row_count": manifest["row_count"],
                "expected_row_count": manifest["expected_row_count"],
                "source_gap_count": manifest["source_gap_count"],
                "audit_passed": audit["passed"],
                "wrote": [] if args.check else ["data/japanese-classic/manifest.json", "data/japanese-classic/audit.json", "data/japanese-classic/releases/*.json"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
