#!/usr/bin/env python3
"""Build bounded English supplemental WoC-era promo catalogs.

TCGdex names W Promotional and Sample as English-era sets, but returns no card
refs. Bulbapedia exposes row-level wikitext for the W stamped promos and the 10
English New York Press Conference Sample cards, so this corpus models those two
small products conservatively.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "english-supplemental-wotc"
RELEASE_DIR = OUT_DIR / "releases"
CACHE_DIR = ROOT / ".cache" / "bulbapedia_english_supplemental_wotc"
TCGDEX_CACHE_DIR = ROOT / ".cache" / "tcgdex_english_supplemental_wotc"
TCGDEX_API_BASE = "https://api.tcgdex.net/v2"
TCGDEX_DOCS_URL = "https://tcgdex.dev/rest"
BULBAPEDIA_RAW_BASE = "https://bulbapedia.bulbagarden.net/w/index.php"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"
BULBAPEDIA_SOURCE_VERSION = "bulbapedia-english-supplemental-wotc-v0.1"
TCGDEX_SOURCE_VERSION = "tcgdex-english-supplemental-wotc-v0.1"
USER_AGENT = "MarketplaceEnglishSupplementalCatalog/0.1 (+local catalog builder)"


NOT_CLAIMING = [
    "complete English miscellaneous promo coverage",
    "complete Jumbo coverage",
    "approved image rights",
    "seller possession",
    "authenticity",
    "condition truth",
    "price truth",
    "spendability",
]


@dataclass(frozen=True)
class SupplementalSet:
    tcgdex_set_id: str
    release_family_id: str
    name_en: str
    raw_title: str
    release_date: str
    expected_row_count: int
    release_type: str
    parse_section: str
    special_instruction_kind: str
    product_count_basis: str


SUPPLEMENTAL_SETS: tuple[SupplementalSet, ...] = (
    SupplementalSet(
        "wp",
        "en_wotc_w_promotional_19990901",
        "W Promotional",
        "W_Promotional_cards_(TCG)",
        "1999-09-01",
        7,
        "stamped_promo",
        "all_setlist_entries",
        "w_stamp",
        "Bulbapedia W Promotional raw wikitext lists 7 stamped promo rows; TCGdex supplies English set count/date but no row refs.",
    ),
    SupplementalSet(
        "sp",
        "en_wotc_sample_set_new_york_20020801",
        "Sample Set - New York Press Conference",
        "Sample_Set_(TCG)",
        "2002-08-01",
        10,
        "sample_press_conference",
        "new_york_press_conference",
        "sample_stamp",
        "Bulbapedia Sample Set raw wikitext lists 10 English New York Press Conference sample rows; TCGdex supplies English set count/date but no row refs.",
    ),
    SupplementalSet(
        "jumbo",
        "en_wotc_jumbo_bounded_200002_200307",
        "Jumbo cards - WoC-era bounded subset",
        "Jumbo_cards_(TCG)",
        "2000-02-01",
        10,
        "jumbo_partial_bounded_subset",
        "jumbo_wotc_bounded",
        "jumbo_card",
        "Bulbapedia Jumbo cards raw wikitext spans many eras; this corpus models only the clearly early English WoC-era/edge rows through July 2003, ending with Best of Game Winner Jumbo rows before the Nintendo/e-League rows begin.",
    ),
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical_hash(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def raw_url(title: str) -> str:
    return f"{BULBAPEDIA_RAW_BASE}?title={urllib.parse.quote(title)}&action=raw"


def cache_path(url: str, source_version: str, directory: Path, suffix: str) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    return directory / f"{hashlib.sha256(f'{source_version}|{url}'.encode('utf-8')).hexdigest()}.{suffix}"


def fetch_text(url: str) -> str:
    cache_file = cache_path(url, BULBAPEDIA_SOURCE_VERSION, CACHE_DIR, "txt")
    if cache_file.exists():
        return cache_file.read_text(encoding="utf-8")
    request = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=30) as response:
            text = response.read().decode("utf-8", "replace")
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        raise RuntimeError(f"failed to fetch {url}: {error}") from error
    cache_file.write_text(text, encoding="utf-8")
    time.sleep(0.05)
    return text


def fetch_tcgdex_set(set_id: str) -> dict[str, Any]:
    url = f"{TCGDEX_API_BASE}/en/sets/{urllib.parse.quote(set_id, safe='')}"
    cache_file = cache_path(url, TCGDEX_SOURCE_VERSION, TCGDEX_CACHE_DIR, "json")
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


def parse_tcg_id(value: str) -> dict[str, str]:
    match = re.search(r"\{\{TCG ID\|([^|{}]+)\|([^|{}]+)\|([^|{}]+)\}\}", value)
    if not match:
        return {"source_set": "", "name": value.strip(), "source_number": ""}
    return {
        "source_set": match.group(1).strip(),
        "name": match.group(2).strip(),
        "source_number": match.group(3).strip(),
    }


def clean_wikitext(value: str) -> str:
    text = value
    text = re.sub(r"\{\{exp\|([^{}|]+)\}\}", r"\1", text)
    text = re.sub(r"\{\{TCG\|([^{}|]+)\}\}", r"\1", text)
    text = re.sub(r"\[\[[^|\]]+\|([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("'''", "").replace("''", "")
    text = text.replace("}}", "")
    return " ".join(text.split())


def parse_nmentry(line: str) -> dict[str, str]:
    text = line.strip()
    prefix = "{{Setlist/nmentry|"
    if not text.startswith(prefix):
        raise ValueError(f"not a Setlist/nmentry line: {line}")
    first_split = text[len(prefix) :].split("|{{TCG ID", 1)
    if len(first_split) != 2:
        raise ValueError(f"missing TCG ID template: {line}")
    printed_number = clean_wikitext(first_split[0].strip())
    tcg_match = re.search(r"\{\{TCG ID\|([^|{}]+)\|([^|{}]+)\|([^|{}]+)\}\}", text)
    if not tcg_match:
        raise ValueError(f"malformed TCG ID template: {line}")
    tcg = {
        "source_set": tcg_match.group(1).strip(),
        "name": tcg_match.group(2).strip(),
        "source_number": tcg_match.group(3).strip(),
    }
    rest = text[tcg_match.end() :]
    rest = re.sub(r"\(''\s*''\)", "", rest)
    rest = re.sub(r"\(''[^']*''\)", "", rest)
    rest = re.sub(r"\[\[[^|\]]+\|([^\]]+)\]\]", r"\1", rest)
    rest = re.sub(r"\[\[([^\]]+)\]\]", r"\1", rest)
    fields = rest.split("|", 1)[1].split("|") if "|" in rest else []
    while len(fields) < 4:
        fields.append("")
    fields = [clean_wikitext(field) for field in fields]
    return {
        "printed_number": printed_number,
        "source_set": tcg["source_set"],
        "name": tcg["name"],
        "source_number": tcg["source_number"],
        "type": fields[0],
        "rarity": fields[2],
        "promotion": fields[3],
        "raw_entry": line.strip(),
    }


def sample_new_york_lines(raw: str) -> list[str]:
    start = raw.index("{{Setlist/nmheader|title=New York Press Conference")
    end = raw.index("{{Setlist/nmfooter", start)
    return re.findall(r"\{\{Setlist/nmentry\|[^\n]+", raw[start:end])


def jumbo_wotc_bounded_lines(raw: str) -> list[str]:
    entries = re.findall(r"\{\{Setlist/nmentry\|[^\n]+", raw)
    bounded: list[str] = []
    for line in entries:
        if any(marker in line for marker in (
            "Top Deck Magazine (February 2000)",
            "Pokémon The Movie 2000]] promotion (July 2000)",
            "BattleZone (December 2002)",
            "BattleZone (January 2003)",
            "BattleZone (February 2003)",
            "BattleZone (March 2003)",
            "BattleZone (April 2003)",
            "BattleZone (May 2003)",
            "BattleZone (June 2003)",
            "BattleZone (July 2003)",
        )):
            bounded.append(line)
    return bounded


def row_inputs(config: SupplementalSet, raw: str) -> list[dict[str, str]]:
    if config.parse_section == "all_setlist_entries":
        lines = re.findall(r"\{\{Setlist/nmentry\|[^\n]+", raw)
    elif config.parse_section == "new_york_press_conference":
        lines = sample_new_york_lines(raw)
    elif config.parse_section == "jumbo_wotc_bounded":
        lines = jumbo_wotc_bounded_lines(raw)
    else:
        raise ValueError(f"unknown parse section {config.parse_section}")
    return [parse_nmentry(line) for line in lines]


def special_identification_instruction(kind: str) -> dict[str, Any]:
    if kind == "w_stamp":
        return {
            "id": "w_promotional_gold_stamp_v0.1",
            "authority_label": "legible",
            "trigger": "Identifying a W Promotional stamped card.",
            "summary": "Confirm both the underlying expansion card identity and the gold foil W stamp; do not treat the base expansion row as sufficient.",
            "steps": [
                "Identify the underlying source card named in the W Promotional row.",
                "Confirm the card carries the stylized gold foil W stamp.",
                "Preserve the magazine/event distribution note when supplied.",
                "Do not merge this row with the unstamped source expansion card.",
            ],
            "source_refs": [{"source": "Bulbapedia raw wikitext", "source_page_url": raw_url("W_Promotional_cards_(TCG)")}],
            "not_claiming": ["seller possession", "authenticity", "condition", "stamp authenticity"],
        }
    if kind == "sample_stamp":
        return {
            "id": "english_sample_stamp_new_york_v0.1",
            "authority_label": "legible",
            "trigger": "Identifying an English New York Press Conference Sample Set card.",
            "summary": "Confirm the Sample stamp / sample-set numbering and keep it separate from the later Expedition Base Set release.",
            "steps": [
                "Identify the card as an English New York Pokémon Center press-conference sample, not the regular Expedition print.",
                "Confirm the Sample stamp appears in place of a regular set logo.",
                "Use the sample card number as printed in the Sample Set row, not the final Expedition numbering.",
                "Do not infer copy count or authenticity from the catalog row.",
            ],
            "source_refs": [{"source": "Bulbapedia raw wikitext", "source_page_url": raw_url("Sample_Set_(TCG)")}],
            "not_claiming": ["seller possession", "authenticity", "condition", "stamp authenticity", "copy count truth"],
        }
    if kind == "jumbo_card":
        return {
            "id": "jumbo_card_physical_format_v0.1",
            "authority_label": "legible",
            "trigger": "Identifying an English Jumbo / oversized promotional card.",
            "summary": "Confirm this is the oversized Jumbo physical format, not the regular-size card with the same name and art lineage.",
            "steps": [
                "Identify the underlying card row named by the source.",
                "Confirm the seller card is the Jumbo / oversized physical format.",
                "Preserve the promotion or distribution note when supplied.",
                "Do not merge this row with the regular-size card or a later jumbo reissue.",
            ],
            "source_refs": [{"source": "Bulbapedia raw wikitext", "source_page_url": raw_url("Jumbo_cards_(TCG)")}],
            "not_claiming": ["seller possession", "authenticity", "condition", "format authenticity", "complete Jumbo coverage"],
        }
    return {}


def build_card_row(config: SupplementalSet, raw_hash: str, raw_source_url: str, tcgdex_result: dict[str, Any], index: int, item: dict[str, str]) -> dict[str, Any]:
    printed_number = item["printed_number"]
    if printed_number.lower() == "none":
        local_basis = f"{item['source_set']}-{item['source_number']}"
    else:
        local_basis = printed_number
    local_number = re.sub(r"[^A-Za-z0-9]+", "-", local_basis).strip("-").lower() or f"{index:03d}"
    local_id = f"{config.tcgdex_set_id}-{local_number}"
    row_id = f"{config.release_family_id}:{local_id}"
    instruction = special_identification_instruction(config.special_instruction_kind)
    source_set = item["source_set"]
    return {
        "schema": "marketplace.english_supplemental_wotc_card_row.v0.1",
        "row_id": row_id,
        "release_family_id": config.release_family_id,
        "local_id": local_id,
        "card_number": printed_number,
        "name_en": item["name"],
        "name_ja": "",
        "name_ja_status": "not_applicable_english_row",
        "name_source_note": "Bulbapedia raw wikitext Setlist row supplies the English display name.",
        "category": "Pokemon" if item["type"] in {"Grass", "Fire", "Water", "Lightning", "Psychic", "Fighting", "Colorless"} else "",
        "rarity_source": item["rarity"],
        "holo_source": False,
        "pokemon_profile": {
            "abilities": [],
            "attacks": [],
            "convertedRetreatCost": None,
            "dex_id": [],
            "evolvesFrom": "",
            "evolvesTo": [],
            "hp": None,
            "level": None,
            "resistances": [],
            "retreatCost": None,
            "rules": [],
            "stage": "",
            "types": [item["type"]] if item["type"] else [],
            "weaknesses": [],
        },
        "illustrator": {
            "authority": "Primary source row does not provide illustrator for this supplemental slice.",
            "caption": "",
            "credit_status": "not_provided_by_primary_source",
            "display": "",
            "name": "",
            "not_claiming": ["seller possession", "authenticity", "condition", "print authority"],
            "requested_page_title": "",
            "resolved_page_title": "",
            "source": "Bulbapedia raw wikitext",
            "source_page_sha256": raw_hash,
            "source_page_url": raw_source_url,
        },
        "tcgdex": {
            "id": "",
            "set_id": config.tcgdex_set_id,
            "set_api_url": tcgdex_result["url"],
            "set_payload_hash": canonical_hash(tcgdex_result["body"]),
            "set_cards_returned": len(tcgdex_result["body"].get("cards", []) or []),
            "url": "",
            "variants": {},
            "image_field_present": False,
        },
        "product_scope": {
            "authority": "English supplemental WoC-era row derived from Bulbapedia raw wikitext, with TCGdex set metadata as count/date cross-check.",
            "catalog_treatment": "Catalog target",
            "counting_note": "This supplemental row is modeled separately from its underlying regular expansion card.",
            "date_precision": "day",
            "english_context_name": config.name_en,
            "japanese_set_name": "",
            "parent_release_family_id": "",
            "product_card_count": config.expected_row_count,
            "product_count_basis": config.product_count_basis,
            "release_date": config.release_date,
            "release_type": config.release_type,
            "source_expansion_name": source_set,
            "source_expansion_number": item["source_number"],
            "strict_release_member": True,
            "unique_catalog_row_count": config.expected_row_count,
        },
        "symbol_status": {
            "prints_without_rarity_symbol": "not_applicable_english_supplemental_wotc",
            "confidence": "high",
            "scope": "release_context_not_row_fact",
            "source_mode": "not_applicable_english_supplemental_wotc",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller-card symbol state", "seller possession"],
        },
        "image_provenance": {
            "allowed_use": [],
            "display_allowed": False,
            "exactness_basis": ["Bulbapedia raw wikitext row identity only; no row-specific image URL promoted by this builder."],
            "image_large": "",
            "image_role": "No external reference image is promoted for this row until a row-specific source supplies one.",
            "image_small": "",
            "not_allowed_by_default": ["training", "seller evidence", "authentication proof"],
            "not_claiming": ["seller possession", "seller card match", "condition", "authenticity", "image availability", "image rights approval"],
            "provider_id": f"bulbapedia:{config.raw_title}:{printed_number}",
            "provider_title": f"{item['name']} - {config.name_en} {printed_number}",
            "release_family_id": config.release_family_id,
            "rights_status": "no_image_source_supplied",
            "row_id": row_id,
            "source": "Bulbapedia raw wikitext",
            "source_page_url": raw_source_url,
            "status": "source_payload_without_image",
            "verification_status": "raw_wikitext_catalog_row_without_image_witness",
        },
        "special_identification_instructions": [instruction] if instruction else [],
        "collector_texture": {
            "authority": "Collector texture only. It helps an agent search and explain the row; it is not transaction evidence.",
            "basis": ["Bulbapedia raw wikitext Setlist row", "TCGdex English set metadata"],
            "note": f"{item['name']} is cataloged as {config.name_en} {printed_number}. Treat this as a supplemental reference row, then ask for seller evidence before any trade.",
            "signals": [config.name_en, config.release_date, printed_number, item["type"], item["rarity"], item["promotion"], source_set],
        },
        "information_audit": {
            "audit_scope": "Information architecture only. This row does not authenticate a physical card, condition, possession, or price.",
            "earns_keep": [
                {"field": "Bulbapedia raw row", "surface": "primary", "why": "The agent needs row identity for a source TCGdex exposes only at set level."},
                {"field": "special identification instructions", "surface": "agent", "why": "The supplemental stamp/sample status is the whole identification risk."},
                {"field": "source expansion reference", "surface": "agent", "why": "Prevents merging the supplemental row with its regular expansion counterpart."},
            ],
            "agent_only": [
                {"field": "TCGdex empty card-ref cross-check", "why": "Explains why this row exists outside the main English WoC corpus."},
                {"field": "raw wikitext hash", "why": "Useful for audit and re-fetch checks, noisy for the human glance."},
            ],
        },
        "source_contacts": [
            {
                "source": "Bulbapedia raw wikitext",
                "source_page_url": raw_source_url,
                "source_page_sha256": raw_hash,
                "raw_entry": item["raw_entry"],
                "not_claiming": ["official source", "seller possession", "authenticity", "condition", "image rights approval"],
            },
            {
                "source": "TCGdex REST API",
                "set_api_url": tcgdex_result["url"],
                "set_payload_hash": canonical_hash(tcgdex_result["body"]),
                "card_refs_returned": len(tcgdex_result["body"].get("cards", []) or []),
                "not_claiming": ["card-row model from TCGdex", "seller possession", "authenticity", "condition"],
            },
        ],
        "provider_row": {
            "adapter": "bulbapedia_raw_setlist",
            "raw_title": config.raw_title,
            "printed_number": printed_number,
            "promotion": item["promotion"],
            "source_expansion_name": source_set,
            "source_expansion_number": item["source_number"],
            "tcgdex_set_id": config.tcgdex_set_id,
            "type": item["type"],
        },
        "not_claiming": ["seller possession", "authenticity", "condition truth", "price truth", "spendability"],
        "tags": [config.release_family_id, config.name_en, printed_number, item["name"], item["type"], item["rarity"], source_set],
    }


def build_release(config: SupplementalSet) -> dict[str, Any]:
    source_url = raw_url(config.raw_title)
    raw = fetch_text(source_url)
    raw_hash = sha256_text(raw)
    tcgdex_result = fetch_tcgdex_set(config.tcgdex_set_id)
    rows = row_inputs(config, raw)
    cards = [
        build_card_row(config, raw_hash, source_url, tcgdex_result, index, item)
        for index, item in enumerate(rows, start=1)
    ]
    return {
        "schema": "marketplace.english_supplemental_wotc_release_catalog.v0.1",
        "release": {
            "release_family_id": config.release_family_id,
            "name_en": config.name_en,
            "name_ja": "",
            "release_date": config.release_date,
            "date_precision": "day",
            "release_type": config.release_type,
            "expected_row_count": config.expected_row_count,
            "count_confidence": "tcgdex_set_count_plus_bulbapedia_raw_setlist",
            "parent_release_family_id": "",
            "product_card_count": config.expected_row_count,
            "product_count_basis": config.product_count_basis,
            "strict_release_member": True,
            "unique_catalog_row_count": len(cards),
            "catalog_treatment": "Catalog target",
            "note": "English supplemental WoC-era product modeled because TCGdex set payload lacks row refs.",
        },
        "symbol_status": {
            "prints_without_rarity_symbol": "not_applicable_english_supplemental_wotc",
            "confidence": "high",
            "source": "release-era context; not a No Rarity product family",
            "scope": "release_context_not_row_fact",
            "source_mode": "not_applicable_english_supplemental_wotc",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller possession", "No Rarity proof without seller evidence"],
        },
        "sources": [
            {
                "source": "Bulbapedia raw wikitext + TCGdex REST API",
                "bulbapedia_raw_url": source_url,
                "bulbapedia_raw_sha256": raw_hash,
                "bulbapedia_rows_found": len(rows),
                "tcgdex_set_api_url": tcgdex_result["url"],
                "tcgdex_set_payload_hash": canonical_hash(tcgdex_result["body"]),
                "tcgdex_set_cards_returned": len(tcgdex_result["body"].get("cards", []) or []),
                "tcgdex_card_count": tcgdex_result["body"].get("cardCount", {}),
                "source_resolution_note": "TCGdex supplies set/date/count but no card refs; Bulbapedia raw wikitext supplies row-level list entries.",
                "not_claiming": ["official source", "seller possession", "authenticity", "condition", "image rights approval"],
            }
        ],
        "cards": cards,
        "not_claiming": NOT_CLAIMING,
    }


def audit_release(release: dict[str, Any]) -> dict[str, Any]:
    cards = release.get("cards", [])
    meta = release.get("release", {})
    expected = int(meta.get("expected_row_count") or 0)
    failures: list[str] = []
    if len(cards) != expected:
        failures.append(f"row_count_mismatch {len(cards)} != {expected}")
    seen: set[str] = set()
    for card in cards:
        row_id = str(card.get("row_id", ""))
        if not row_id:
            failures.append("row_id_missing")
        if row_id in seen:
            failures.append(f"duplicate_row_id {row_id}")
        seen.add(row_id)
        if "special_identification_instructions" not in card or not isinstance(card.get("special_identification_instructions"), list):
            failures.append(f"{row_id}: special_identification_instructions_bad_shape")
        if not card.get("source_contacts"):
            failures.append(f"{row_id}: missing_source_contacts")
    return {
        "release_family_id": meta.get("release_family_id", ""),
        "row_count": len(cards),
        "expected_row_count": expected,
        "source_payload_without_image_rows": sum(1 for card in cards if card.get("image_provenance", {}).get("status") == "source_payload_without_image"),
        "special_identification_instruction_rows": sum(1 for card in cards if card.get("special_identification_instructions")),
        "passed": not failures,
        "failures": failures,
    }


def build_all(write_releases: bool = True) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, Any]]:
    manifests: list[dict[str, Any]] = []
    audit_rows: list[dict[str, Any]] = []
    stamp = utc_now()
    for config in SUPPLEMENTAL_SETS:
        release = build_release(config)
        release_hash = canonical_hash(release)
        path = RELEASE_DIR / f"{config.release_family_id}.json"
        if write_releases:
            write_json(path, release)
        audit = audit_release(release)
        audit_rows.append(audit)
        source = release.get("sources", [{}])[0]
        manifests.append(
            {
                "release_family_id": config.release_family_id,
                "path": str(path.relative_to(ROOT)),
                "schema": release["schema"],
                "hash_algorithm": HASH_ALGORITHM,
                "canonicalization": CANONICALIZATION,
                "catalog_hash": release_hash,
                "row_count": len(release["cards"]),
                "expected_row_count": config.expected_row_count,
                "release_type": config.release_type,
                "product_card_count": release.get("release", {}).get("product_card_count", 0),
                "product_count_basis": release.get("release", {}).get("product_count_basis", ""),
                "strict_release_member": True,
                "catalog_treatment": "Catalog target",
                "release_not_claiming": release.get("not_claiming", []),
                "source_payload_without_image_rows": audit["source_payload_without_image_rows"],
                "special_identification_instruction_rows": audit["special_identification_instruction_rows"],
                "tcgdex_set_id": config.tcgdex_set_id,
                "tcgdex_set_api_url": source.get("tcgdex_set_api_url", ""),
                "tcgdex_set_payload_hash": source.get("tcgdex_set_payload_hash", ""),
                "tcgdex_set_cards_returned": source.get("tcgdex_set_cards_returned", 0),
                "bulbapedia_raw_url": source.get("bulbapedia_raw_url", ""),
                "bulbapedia_raw_sha256": source.get("bulbapedia_raw_sha256", ""),
            }
        )
    manifest = {
        "schema": "marketplace.english_supplemental_wotc_manifest.v0.1",
        "generated_at": stamp,
        "release_count": len(manifests),
        "total_rows": sum(item["row_count"] for item in manifests),
        "source_payload_without_image_rows": sum(item["source_payload_without_image_rows"] for item in manifests),
        "special_identification_instruction_rows": sum(item["special_identification_instruction_rows"] for item in manifests),
        "hash_algorithm": HASH_ALGORITHM,
        "canonicalization": CANONICALIZATION,
        "source_contact_policy": "Rows are raw-wikitext reference identities without image promotion unless a row-specific image source is later added.",
        "releases": manifests,
        "not_claiming": NOT_CLAIMING,
    }
    audit = {
        "schema": "marketplace.english_supplemental_wotc_audit.v0.1",
        "generated_at": stamp,
        "passed": all(row["passed"] for row in audit_rows),
        "release_count": len(audit_rows),
        "total_rows": sum(row["row_count"] for row in audit_rows),
        "source_payload_without_image_rows": sum(row["source_payload_without_image_rows"] for row in audit_rows),
        "special_identification_instruction_rows": sum(row["special_identification_instruction_rows"] for row in audit_rows),
        "release_audits": audit_rows,
        "not_claiming": [
            "multi-agent audit complete",
            "complete English miscellaneous promo coverage",
            "approved image rights",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
        ],
    }
    return manifests, manifest, audit


def main() -> None:
    parser = argparse.ArgumentParser(description="Build bounded English supplemental WoC-era catalogs.")
    parser.add_argument("--check", action="store_true", help="build and audit without writing release/manifest/audit files")
    args = parser.parse_args()
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    _, manifest, audit = build_all(write_releases=not args.check)
    if not args.check:
        write_json(OUT_DIR / "manifest.json", manifest)
        write_json(OUT_DIR / "audit.json", audit)
    print(
        json.dumps(
            {
                "release_count": manifest["release_count"],
                "total_rows": manifest["total_rows"],
                "audit_passed": audit["passed"],
                "wrote": [] if args.check else ["data/english-supplemental-wotc/manifest.json", "data/english-supplemental-wotc/audit.json"],
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    if not audit["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
