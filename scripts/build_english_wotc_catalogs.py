#!/usr/bin/env python3
"""Build English Wizards-era Pokemon TCG release catalogs.

The corpus is a reference substrate for agents. It catalogs English WoC-era
sets and cards, but does not authenticate physical cards, possession, condition,
price truth, or seller inventory.
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
OUT_DIR = ROOT / "data" / "english-wotc"
RELEASE_DIR = OUT_DIR / "releases"
CACHE_DIR = ROOT / ".cache" / "pokemon_tcg_api_wotc"
API_BASE = "https://api.pokemontcg.io/v2"
DOCS_URL = "https://docs.pokemontcg.io/"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"
USER_AGENT = "MarketplaceCatalogExpansion/0.1 (+local catalog builder)"
SOURCE_VERSION = "pokemon-tcg-api-v2-english-wotc-v0.1"


NOT_CLAIMING = [
    "complete Japanese catalog",
    "post-WoC Nintendo/EX-era coverage",
    "approved image rights",
    "seller possession",
    "authenticity",
    "condition truth",
    "price truth",
    "spendability",
]


@dataclass(frozen=True)
class EnglishWotcSet:
    api_set_id: str
    release_family_id: str
    name: str
    series: str
    release_date: str
    expected_total: int
    printed_total: int
    release_type: str
    catalog_treatment: str = "Catalog target"


ENGLISH_WOTC_SETS: tuple[EnglishWotcSet, ...] = (
    EnglishWotcSet("base1", "en_wotc_base_set_19990109", "Base Set", "Base", "1999/01/09", 102, 102, "main_expansion"),
    EnglishWotcSet("base2", "en_wotc_jungle_19990616", "Jungle", "Base", "1999/06/16", 64, 64, "main_expansion"),
    EnglishWotcSet("basep", "en_wotc_black_star_promos_19990701", "Wizards Black Star Promos", "Base", "1999/07/01", 53, 53, "promo_series"),
    EnglishWotcSet("base3", "en_wotc_fossil_19991010", "Fossil", "Base", "1999/10/10", 62, 62, "main_expansion"),
    EnglishWotcSet("base4", "en_wotc_base_set_2_20000224", "Base Set 2", "Base", "2000/02/24", 130, 130, "main_expansion"),
    EnglishWotcSet("base5", "en_wotc_team_rocket_20000424", "Team Rocket", "Base", "2000/04/24", 83, 82, "main_expansion"),
    EnglishWotcSet("gym1", "en_wotc_gym_heroes_20000814", "Gym Heroes", "Gym", "2000/08/14", 132, 132, "main_expansion"),
    EnglishWotcSet("gym2", "en_wotc_gym_challenge_20001016", "Gym Challenge", "Gym", "2000/10/16", 132, 132, "main_expansion"),
    EnglishWotcSet("neo1", "en_wotc_neo_genesis_20001216", "Neo Genesis", "Neo", "2000/12/16", 111, 111, "main_expansion"),
    EnglishWotcSet("neo2", "en_wotc_neo_discovery_20010601", "Neo Discovery", "Neo", "2001/06/01", 75, 75, "main_expansion"),
    EnglishWotcSet("si1", "en_wotc_southern_islands_20010731", "Southern Islands", "Other", "2001/07/31", 18, 18, "mini_set"),
    EnglishWotcSet("neo3", "en_wotc_neo_revelation_20010921", "Neo Revelation", "Neo", "2001/09/21", 66, 64, "main_expansion"),
    EnglishWotcSet("neo4", "en_wotc_neo_destiny_20020228", "Neo Destiny", "Neo", "2002/02/28", 113, 105, "main_expansion"),
    EnglishWotcSet("base6", "en_wotc_legendary_collection_20020524", "Legendary Collection", "Other", "2002/05/24", 110, 110, "main_expansion"),
    EnglishWotcSet("ecard1", "en_wotc_expedition_base_set_20020915", "Expedition Base Set", "E-Card", "2002/09/15", 165, 165, "main_expansion"),
    EnglishWotcSet("bp", "en_wotc_best_of_game_20021201", "Best of Game", "Other", "2002/12/01", 9, 9, "promo_series"),
    EnglishWotcSet("ecard2", "en_wotc_aquapolis_20030115", "Aquapolis", "E-Card", "2003/01/15", 182, 147, "main_expansion"),
    EnglishWotcSet("ecard3", "en_wotc_skyridge_20030512", "Skyridge", "E-Card", "2003/05/12", 182, 144, "main_expansion"),
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


def fetch_json(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{API_BASE}{path}"
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
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
    time.sleep(0.05)
    return payload


def fetch_set_payload(api_set_id: str) -> dict[str, Any]:
    return fetch_json(f"/sets/{urllib.parse.quote(api_set_id, safe='')}")


def fetch_cards_payload(api_set_id: str) -> dict[str, Any]:
    params = {
        "q": f"set.id:{api_set_id}",
        "pageSize": 250,
        "orderBy": "number",
        "select": ",".join(
            [
                "id",
                "name",
                "supertype",
                "subtypes",
                "level",
                "hp",
                "types",
                "evolvesFrom",
                "evolvesTo",
                "rules",
                "ancientTrait",
                "abilities",
                "attacks",
                "weaknesses",
                "resistances",
                "retreatCost",
                "convertedRetreatCost",
                "set",
                "number",
                "artist",
                "rarity",
                "flavorText",
                "nationalPokedexNumbers",
                "legalities",
                "regulationMark",
                "images",
                "tcgplayer",
                "cardmarket",
            ]
        ),
    }
    return fetch_json("/cards", params)


def normalize_date(api_date: str) -> str:
    return api_date.replace("/", "-")


def card_sort_key(card: dict[str, Any]) -> tuple[int, str, str]:
    number = str(card.get("number", ""))
    digits = "".join(ch for ch in number if ch.isdigit())
    prefix = number[: len(number) - len(number.lstrip("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"))]
    numeric = int(digits) if digits else 9999
    return numeric, prefix, card.get("id", "")


def row_from_api_card(config: EnglishWotcSet, card: dict[str, Any], set_payload: dict[str, Any]) -> dict[str, Any]:
    row_id = f"{config.release_family_id}:{card['id']}"
    images = card.get("images", {}) or {}
    card_url = f"{API_BASE}/cards/{urllib.parse.quote(card['id'], safe='')}"
    set_url = f"{API_BASE}/sets/{urllib.parse.quote(config.api_set_id, safe='')}"
    subtypes = card.get("subtypes", []) or []
    supertype = card.get("supertype", "")
    rarity = card.get("rarity", "")
    is_holo = "holo" in rarity.lower() or any("holo" in str(subtype).lower() for subtype in subtypes)
    pokemon_profile = {
        "abilities": card.get("abilities", []) or [],
        "attacks": card.get("attacks", []) or [],
        "convertedRetreatCost": card.get("convertedRetreatCost"),
        "dex_id": card.get("nationalPokedexNumbers", []) or [],
        "evolvesFrom": card.get("evolvesFrom", ""),
        "evolvesTo": card.get("evolvesTo", []) or [],
        "hp": card.get("hp"),
        "level": card.get("level"),
        "resistances": card.get("resistances", []) or [],
        "retreatCost": card.get("retreatCost", []) or [],
        "rules": card.get("rules", []) or [],
        "stage": next((subtype for subtype in subtypes if subtype in {"Basic", "Stage 1", "Stage 2", "Baby"}), ""),
        "types": card.get("types", []) or [],
        "weaknesses": card.get("weaknesses", []) or [],
    }
    return {
        "schema": "marketplace.english_wotc_card_row.v0.1",
        "row_id": row_id,
        "release_family_id": config.release_family_id,
        "local_id": card["id"],
        "card_number": str(card.get("number", "")),
        "name_en": card.get("name", ""),
        "name_ja": "",
        "name_ja_status": "not_applicable_english_print",
        "romaji": "",
        "name_source_note": "Pokemon TCG API v2 English card row.",
        "category": supertype,
        "subtypes": subtypes,
        "rarity_source": rarity,
        "holo_source": is_holo,
        "pokemon_profile": pokemon_profile,
        "illustrator": {
            "authority": "Pokemon TCG API card artist field. Useful for catalog texture, not direct physical-print authenticity proof.",
            "caption": "",
            "credit_status": "credited" if card.get("artist") else "not_provided_by_primary_source",
            "display": f"Illus. {card.get('artist')}" if card.get("artist") else "",
            "name": card.get("artist", ""),
            "not_claiming": ["seller possession", "authenticity", "condition", "physical-card print authority"],
            "requested_page_title": "",
            "resolved_page_title": "",
            "source": "Pokemon TCG API v2",
            "source_page_sha256": "",
            "source_page_url": card_url,
        },
        "tcgdex": {
            "id": "",
            "set_id": "",
            "url": "",
            "variants": {},
            "image_field_present": False,
        },
        "pokemon_tcg_api": {
            "card_id": card.get("id", ""),
            "set_id": config.api_set_id,
            "url": card_url,
            "card_payload_hash": canonical_hash(card),
            "legalities": card.get("legalities", {}) or {},
            "regulationMark": card.get("regulationMark", ""),
        },
        "product_scope": {
            "authority": "English WoC-era release-family catalog row derived from Pokemon TCG API v2 set and card payloads.",
            "catalog_treatment": config.catalog_treatment,
            "counting_note": (
                "This row belongs to the English Wizards-era source slice. It is not a Japanese card, "
                "not a No Rarity claim, and not proof of a seller's physical copy."
            ),
            "english_set_name": config.name,
            "parent_release_family_id": "",
            "product_card_count": config.printed_total,
            "product_count_basis": (
                "Pokemon TCG API set metadata supplies printedTotal and total. Rows include every "
                "card returned by the set.id query, including secret/extra-numbered cards when present."
            ),
            "release_date": normalize_date(config.release_date),
            "date_precision": "day",
            "release_type": config.release_type,
            "strict_release_member": True,
            "unique_catalog_row_count": config.expected_total,
            "api_printed_total": set_payload.get("printedTotal"),
            "api_total": set_payload.get("total"),
        },
        "symbol_status": {
            "prints_without_rarity_symbol": "not_applicable_english_wotc",
            "confidence": "high",
            "scope": "release_context_not_row_fact",
            "source_mode": "not_applicable_english_wotc",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller-card symbol state", "seller possession"],
        },
        "image_provenance": {
            "allowed_use": ["manual_review", "catalog_reference_link"],
            "display_allowed": False,
            "exactness_basis": [
                "Pokemon TCG API card row id",
                "Pokemon TCG API set id",
                "image URLs supplied on the same card payload",
            ],
            "image_large": images.get("large", ""),
            "image_role": "External reference witness for this English WoC catalog row; rights are not promoted to approved in-app display.",
            "image_small": images.get("small", ""),
            "not_allowed_by_default": ["training", "seller evidence", "authentication proof"],
            "not_claiming": ["seller possession", "seller card match", "condition", "authenticity", "image rights approval"],
            "provider_id": card.get("id", ""),
            "provider_title": f"{card.get('name', '')} - {config.name} #{card.get('number', '')}",
            "release_family_id": config.release_family_id,
            "rights_status": "external_reference_witness",
            "row_id": row_id,
            "source": "Pokemon TCG API v2",
            "source_page_url": card_url,
            "status": "external_api_reference_image",
            "verification_status": "api_payload_external_reference_witness",
        },
        "special_identification_instructions": [],
        "collector_texture": {
            "authority": "Collector texture only. It helps an agent search and explain the row; it is not transaction evidence.",
            "basis": ["Pokemon TCG API set metadata", "Pokemon TCG API card payload"],
            "note": (
                f"{card.get('name', '')} is cataloged as {config.name} #{card.get('number', '')}. "
                "Treat this as a reference row, then ask for seller evidence before any trade."
            ),
            "signals": [config.name, config.release_date, card.get("number", ""), rarity, supertype, *subtypes],
        },
        "information_audit": {
            "audit_scope": "Information architecture only. This row does not authenticate a physical card, condition, possession, or price.",
            "earns_keep": [
                {"field": "external API reference image", "surface": "primary", "why": "The agent needs a row-specific visual reference, but rights/use remain bounded."},
                {"field": "release family and card id", "surface": "primary", "why": "These prevent cross-set image or name laundering."},
                {"field": "set/card number", "surface": "agent", "why": "WoC-era cards are commonly identified by English set and printed number."},
            ],
            "agent_only": [
                {"field": "source payload hashes", "why": "Useful for audit and re-fetch checks, noisy for the human glance."},
                {"field": "market links", "why": "Useful for agent discovery, not price truth."},
            ],
        },
        "source_contacts": [
            {
                "source": "Pokemon TCG API v2",
                "docs_url": DOCS_URL,
                "card_api_url": card_url,
                "set_api_url": set_url,
                "card_payload_hash": canonical_hash(card),
                "set_payload_hash": canonical_hash(set_payload),
                "canonicalization": CANONICALIZATION,
                "hash_algorithm": HASH_ALGORITHM,
                "not_claiming": ["seller possession", "authenticity", "condition", "price truth", "image rights approval"],
            }
        ],
        "provider_row": card,
        "not_claiming": ["seller possession", "authenticity", "condition truth", "price truth", "spendability"],
        "tags": [
            "english",
            "wotc",
            config.release_family_id,
            config.name,
            config.series,
            config.release_date,
            str(card.get("number", "")),
            rarity,
            supertype,
            *subtypes,
        ],
    }


def build_release(config: EnglishWotcSet) -> dict[str, Any]:
    set_result = fetch_set_payload(config.api_set_id)
    cards_result = fetch_cards_payload(config.api_set_id)
    set_payload = set_result["body"]["data"]
    cards_payload = cards_result["body"]
    cards = sorted(cards_payload.get("data", []), key=card_sort_key)
    rows = [row_from_api_card(config, card, set_payload) for card in cards]
    source = {
        "source": "Pokemon TCG API v2",
        "docs_url": DOCS_URL,
        "set_api_url": f"{API_BASE}/sets/{urllib.parse.quote(config.api_set_id, safe='')}",
        "cards_api_url": cards_result["url"],
        "set_payload_hash": canonical_hash(set_payload),
        "cards_payload_hash": canonical_hash(cards_payload),
        "cards_found": len(rows),
        "api_set_id": config.api_set_id,
        "api_printed_total": set_payload.get("printedTotal"),
        "api_total": set_payload.get("total"),
        "page_count": cards_payload.get("count"),
        "total_count": cards_payload.get("totalCount"),
        "fetched_at": max(set_result.get("fetched_at", ""), cards_result.get("fetched_at", "")),
        "not_claiming": ["seller possession", "authenticity", "condition", "price truth", "image rights approval"],
    }
    return {
        "schema": "marketplace.english_wotc_release_catalog.v0.1",
        "release": {
            "release_family_id": config.release_family_id,
            "language": "English",
            "api_set_id": config.api_set_id,
            "name_en": set_payload.get("name", config.name),
            "name_ja": "",
            "series": set_payload.get("series", config.series),
            "release_date": normalize_date(set_payload.get("releaseDate", config.release_date)),
            "date_precision": "day",
            "release_type": config.release_type,
            "expected_row_count": config.expected_total,
            "printed_total": config.printed_total,
            "api_total": set_payload.get("total"),
            "api_printed_total": set_payload.get("printedTotal"),
            "count_confidence": "pokemon_tcg_api_set_and_card_query",
            "catalog_treatment": config.catalog_treatment,
            "strict_release_member": True,
            "product_count_basis": (
                "Pokemon TCG API v2 set metadata and cards query. Includes every card returned for "
                f"set.id:{config.api_set_id}; not a physical-product collation claim."
            ),
        },
        "symbol_status": {
            "prints_without_rarity_symbol": "not_applicable_english_wotc",
            "confidence": "high",
            "source": "Pokemon TCG API v2 set/card context",
            "scope": "release_context_not_row_fact",
            "source_mode": "not_applicable_english_wotc",
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
    api_total = int(release_meta.get("api_total") or 0)
    if len(cards) != expected or len(cards) != api_total:
        failures.append(f"row_count_mismatch rows={len(cards)} expected={expected} api_total={api_total}")
    for card in cards:
        row_id = card.get("row_id", "")
        required = ["row_id", "release_family_id", "local_id", "card_number", "name_en", "product_scope", "image_provenance", "source_contacts", "not_claiming"]
        for field in required:
            if field not in card:
                failures.append(f"{row_id}: missing_{field}")
        if card.get("schema") != "marketplace.english_wotc_card_row.v0.1":
            failures.append(f"{row_id}: wrong_schema")
        if card.get("name_ja_status") != "not_applicable_english_print":
            failures.append(f"{row_id}: japanese_status_overclaim")
        if card.get("symbol_status", {}).get("prints_without_rarity_symbol") != "not_applicable_english_wotc":
            failures.append(f"{row_id}: symbol_status_not_scoped")
        if card.get("product_scope", {}).get("strict_release_member") is not True:
            failures.append(f"{row_id}: strict_release_member_missing")
        if card.get("image_provenance", {}).get("rights_status") != "external_reference_witness":
            failures.append(f"{row_id}: image_rights_overclaim")
        if card.get("image_provenance", {}).get("display_allowed") is not False:
            failures.append(f"{row_id}: image_display_overclaim")
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
        "api_total": api_total,
        "illustrator_named_rows": sum(1 for card in cards if card.get("illustrator", {}).get("name")),
        "reference_image_witness_rows": sum(1 for card in cards if card.get("image_provenance", {}).get("image_large")),
    }


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def build_all(*, check: bool = False) -> tuple[dict[str, Any], dict[str, Any]]:
    releases: list[dict[str, Any]] = []
    audit_rows: list[dict[str, Any]] = []
    release_entries: list[dict[str, Any]] = []
    for config in ENGLISH_WOTC_SETS:
        release = build_release(config)
        audit = audit_release(release)
        if not audit["passed"]:
            raise ValueError(f"{config.release_family_id} audit failed: {audit['failures'][:5]}")
        releases.append(release)
        audit_rows.append(audit)
        path = RELEASE_DIR / f"{config.release_family_id}.json"
        catalog_hash = canonical_hash(release)
        release_entries.append(
            {
                "release_family_id": config.release_family_id,
                "api_set_id": config.api_set_id,
                "path": path.relative_to(ROOT).as_posix(),
                "schema": release["schema"],
                "catalog_hash": catalog_hash,
                "row_count": len(release["cards"]),
                "expected_row_count": config.expected_total,
                "api_total": release["release"].get("api_total"),
                "api_printed_total": release["release"].get("api_printed_total"),
                "release_type": config.release_type,
                "catalog_treatment": config.catalog_treatment,
                "release_date": release["release"].get("release_date", ""),
                "series": release["release"].get("series", ""),
                "source_url": release["sources"][0]["cards_api_url"],
                "not_claiming": release["not_claiming"],
            }
        )
        if not check:
            write_json(path, release)
    generated_at = utc_now()
    manifest = {
        "schema": "marketplace.english_wotc_manifest.v0.1",
        "generated_at": generated_at,
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "source": "Pokemon TCG API v2",
        "source_docs_url": DOCS_URL,
        "boundary": {
            "language": "English",
            "era": "US Wizards of the Coast through Skyridge / May 12, 2003",
            "included_api_set_ids": [config.api_set_id for config in ENGLISH_WOTC_SETS],
            "excluded_post_wotc_2003_api_set_ids": ["ex1", "ex2", "ex3", "np"],
            "not_claiming": NOT_CLAIMING,
        },
        "release_count": len(release_entries),
        "row_count": sum(entry["row_count"] for entry in release_entries),
        "expected_row_count": sum(entry["expected_row_count"] for entry in release_entries),
        "releases": release_entries,
        "not_claiming": NOT_CLAIMING,
    }
    audit = {
        "schema": "marketplace.english_wotc_catalog_audit.v0.1",
        "generated_at": generated_at,
        "passed": all(row["passed"] for row in audit_rows),
        "release_count": len(audit_rows),
        "row_count": sum(row["row_count"] for row in audit_rows),
        "expected_row_count": sum(row["expected_row_count"] for row in audit_rows),
        "reference_image_witness_rows": sum(row["reference_image_witness_rows"] for row in audit_rows),
        "illustrator_named_rows": sum(row["illustrator_named_rows"] for row in audit_rows),
        "release_audits": audit_rows,
        "not_claiming": [
            "complete Japanese catalog",
            "post-WoC Nintendo/EX-era coverage",
            "row-level physical authentication",
            "image rights approval",
        ],
    }
    if not check:
        write_json(OUT_DIR / "manifest.json", manifest)
        write_json(OUT_DIR / "audit.json", audit)
    return manifest, audit


def main() -> None:
    parser = argparse.ArgumentParser(description="Build English WoC-era Pokemon TCG catalogs.")
    parser.add_argument("--check", action="store_true", help="build and audit without writing output files")
    args = parser.parse_args()
    manifest, audit = build_all(check=args.check)
    print(
        json.dumps(
            {
                "release_count": manifest["release_count"],
                "row_count": manifest["row_count"],
                "expected_row_count": manifest["expected_row_count"],
                "audit_passed": audit["passed"],
                "wrote": [] if args.check else ["data/english-wotc/manifest.json", "data/english-wotc/audit.json", "data/english-wotc/releases/*.json"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
