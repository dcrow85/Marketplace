#!/usr/bin/env python3
"""Build Japanese ADV rows that fall before the English Skyridge/WoC cutoff.

TCGdex names ADV1 and ADV2 with official counts and dates, but its set payloads
currently return no card refs. TCG Collector exposes row-level pages for those
two Japanese sets, so this corpus uses TCG Collector for row identity/details and
TCGdex only as a set-level cross-check.
"""

from __future__ import annotations

import argparse
import hashlib
import html
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
OUT_DIR = ROOT / "data" / "japanese-adv-pre-wotc"
RELEASE_DIR = OUT_DIR / "releases"
CACHE_DIR = ROOT / ".cache" / "tcgcollector_ja_adv_pre_wotc"
TCGDEX_CACHE_DIR = ROOT / ".cache" / "tcgdex_ja_adv_pre_wotc"
TCGDEX_API_BASE = "https://api.tcgdex.net/v2"
TCGDEX_DOCS_URL = "https://tcgdex.dev/rest"
TCGCOLLECTOR_BASE = "https://www.tcgcollector.com"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"
TCGCOLLECTOR_SOURCE_VERSION = "tcgcollector-ja-adv-pre-wotc-v0.1"
TCGDEX_SOURCE_VERSION = "tcgdex-ja-adv-pre-wotc-v0.1"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)


NOT_CLAIMING = [
    "Japanese ADV sets after the English Skyridge / US WoC-era endpoint",
    "complete Japanese ADV/PCG coverage",
    "approved image rights",
    "seller possession",
    "authenticity",
    "condition truth",
    "price truth",
    "spendability",
]


@dataclass(frozen=True)
class AdvSet:
    tcgdex_set_id: str
    release_family_id: str
    name_en_context: str
    name_ja: str
    release_date: str
    expected_row_count: int
    tcgcollector_url: str
    release_type: str = "main_expansion"
    catalog_treatment: str = "Catalog target"


ADV_PRE_WOTC_SETS: tuple[AdvSet, ...] = (
    AdvSet(
        "ADV1",
        "jp_tcg_adv_expansion_pack_20030131",
        "ADV Expansion Pack",
        "拡張パック",
        "2003-01-31",
        55,
        "https://www.tcgcollector.com/sets/11165/adv-expansion-pack",
    ),
    AdvSet(
        "ADV2",
        "jp_tcg_adv_miracle_of_the_desert_20030418",
        "Miracle of the Desert",
        "砂漠のきせき",
        "2003-04-18",
        53,
        "https://www.tcgcollector.com/sets/11222/miracle-of-the-desert",
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


def html_cache_path(url: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{hashlib.sha256(f'{TCGCOLLECTOR_SOURCE_VERSION}|{url}'.encode('utf-8')).hexdigest()}.html"


def tcgdex_cache_path(url: str) -> Path:
    TCGDEX_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return TCGDEX_CACHE_DIR / f"{hashlib.sha256(f'{TCGDEX_SOURCE_VERSION}|{url}'.encode('utf-8')).hexdigest()}.json"


def fetch_html(url: str) -> str:
    cache_file = html_cache_path(url)
    if cache_file.exists():
        return cache_file.read_text(encoding="utf-8")
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/",
        },
    )
    try:
        with urlopen(request, timeout=30) as response:
            text = response.read().decode("utf-8", "replace")
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        raise RuntimeError(f"failed to fetch {url}: {error}") from error
    cache_file.write_text(text, encoding="utf-8")
    time.sleep(0.05)
    return text


def fetch_tcgdex_set(set_id: str) -> dict[str, Any]:
    url = f"{TCGDEX_API_BASE}/ja/sets/{urllib.parse.quote(set_id, safe='')}"
    cache_file = tcgdex_cache_path(url)
    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))
    request = Request(url, headers={"User-Agent": "MarketplaceJapaneseAdvCatalog/0.1 (+local catalog builder)"})
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


def strip_tags(value: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", value)).split())


def meta_content(raw_html: str, property_name: str) -> str:
    pattern = rf'<meta\s+(?:property|name)="{re.escape(property_name)}"\s+content="([^"]*)"'
    match = re.search(pattern, raw_html)
    return html.unescape(match.group(1)) if match else ""


def extract_footer_field(raw_html: str, title: str) -> str:
    pattern = (
        r'<div class="card-info-footer-item-title">\s*'
        + re.escape(title)
        + r'\s*</div>\s*<div class="card-info-footer-item-text-container">(?P<body>.*?)</div>\s*</div>'
    )
    match = re.search(pattern, raw_html, re.S)
    return strip_tags(match.group("body")) if match else ""


def extract_card_name(raw_html: str) -> str:
    match = re.search(r'<h1 id="card-info-title">\s*<a[^>]*>\s*(.*?)\s*</a>\s*</h1>', raw_html, re.S)
    return strip_tags(match.group(1)) if match else ""


def extract_hp(raw_html: str) -> int | None:
    match = re.search(r'id="card-hit-points-value">(\d+)', raw_html)
    return int(match.group(1)) if match else None


def extract_types(raw_html: str) -> list[str]:
    match = re.search(r'id="card-energy-types"\s*>(?P<body>.*?)</a>', raw_html, re.S)
    if not match:
        return []
    body = match.group("body")
    values = [html.unescape(item) for item in re.findall(r'title="([^"]+)"', body)]
    if not values:
        values = [html.unescape(item) for item in re.findall(r'alt="([^"]+)"', body)]
    return list(dict.fromkeys(value for value in values if value))


def parse_set_page(config: AdvSet, raw_html: str) -> list[dict[str, str]]:
    pattern = re.compile(
        r'<a\s+href="(?P<href>/cards/[^"]+)"\s+title="(?P<title>[^"]+)"\s+class="card-image-grid-item-link"\s*>'
        r'\s*<img\s+src="(?P<src>[^"]+)".*?alt="(?P<alt>[^"]+)"',
        re.S,
    )
    rows: list[dict[str, str]] = []
    for match in pattern.finditer(raw_html):
        title = html.unescape(match.group("title"))
        if f"({config.name_en_context} " not in title:
            continue
        card_number_match = re.search(r"\((?:.*?)\s+([A-Z0-9]+/\d+)\)$", title)
        if not card_number_match:
            continue
        card_number = card_number_match.group(1)
        rows.append(
            {
                "card_url": urllib.parse.urljoin(TCGCOLLECTOR_BASE, match.group("href")),
                "grid_image_url": html.unescape(match.group("src")),
                "title": title,
                "card_number": card_number,
                "local_number": card_number.split("/")[0],
            }
        )
    rows.sort(key=lambda row: int(re.sub(r"\D", "", row["local_number"]) or "9999"))
    return rows


def build_card_row(config: AdvSet, set_hash: str, set_page_hash: str, set_row: dict[str, str], tcgdex_result: dict[str, Any]) -> dict[str, Any]:
    card_html = fetch_html(set_row["card_url"])
    card_page_hash = sha256_text(card_html)
    title = meta_content(card_html, "og:title") or set_row["title"]
    image_large = meta_content(card_html, "og:image") or set_row["grid_image_url"]
    name_en = extract_card_name(card_html)
    if not name_en:
        name_match = re.match(r"^(.*?)\s+\(", title)
        name_en = name_match.group(1) if name_match else ""
    card_number = extract_footer_field(card_html, "Card number") or set_row["card_number"]
    local_number = card_number.split("/")[0]
    local_id = f"{config.tcgdex_set_id}-{local_number}"
    row_id = f"{config.release_family_id}:{local_id}"
    rarity = extract_footer_field(card_html, "Rarity")
    illustrator = extract_footer_field(card_html, "Illustrators")
    pokedex = extract_footer_field(card_html, "Pokédex")
    hp = extract_hp(card_html)
    types = extract_types(card_html)
    category = "Pokemon" if hp or pokedex or types else ""
    return {
        "schema": "marketplace.japanese_adv_pre_wotc_card_row.v0.1",
        "row_id": row_id,
        "release_family_id": config.release_family_id,
        "local_id": local_id,
        "card_number": card_number,
        "name_en": name_en,
        "name_ja": "",
        "name_ja_status": "missing_from_exact_source",
        "name_source_note": "TCG Collector Japanese-TCG row page supplies English display name; Japanese print name remains pending a separate source.",
        "category": category,
        "rarity_source": rarity,
        "holo_source": "Holo" in rarity,
        "pokemon_profile": {
            "abilities": [],
            "attacks": [],
            "convertedRetreatCost": None,
            "dex_id": [int(pokedex.lstrip("#"))] if pokedex.lstrip("#").isdigit() else [],
            "evolvesFrom": "",
            "evolvesTo": [],
            "hp": hp,
            "level": None,
            "resistances": [],
            "retreatCost": None,
            "rules": [],
            "stage": "",
            "types": types,
            "weaknesses": [],
        },
        "illustrator": {
            "authority": "TCG Collector rendered card page footer. Useful for catalog texture, not direct print authenticity proof.",
            "caption": f"Illus. {illustrator}" if illustrator else "",
            "credit_status": "source_labeled" if illustrator else "not_provided_by_primary_source",
            "display": f"Illus. {illustrator}" if illustrator else "",
            "name": illustrator,
            "not_claiming": ["seller possession", "authenticity", "condition", "Japanese print authority"],
            "requested_page_title": "",
            "resolved_page_title": title,
            "source": "TCG Collector card page",
            "source_page_sha256": card_page_hash,
            "source_page_url": set_row["card_url"],
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
            "authority": "Japanese ADV pre-English-Skyridge catalog row derived from TCG Collector card pages, with TCGdex set metadata as count/date cross-check.",
            "catalog_treatment": config.catalog_treatment,
            "counting_note": "This row belongs to a Japanese ADV set released before English Skyridge / the US WoC-era endpoint. It is not an English WoC row and not proof of a seller's physical copy.",
            "date_precision": "day",
            "english_context_name": config.name_en_context,
            "japanese_set_name": config.name_ja,
            "parent_release_family_id": "",
            "product_card_count": config.expected_row_count,
            "product_count_basis": "TCGdex Japanese set metadata supplies official/total counts; TCG Collector supplies row-level card pages.",
            "release_date": config.release_date,
            "release_type": config.release_type,
            "strict_release_member": True,
            "unique_catalog_row_count": config.expected_row_count,
        },
        "symbol_status": {
            "prints_without_rarity_symbol": "not_applicable_japanese_adv_precutoff",
            "confidence": "high",
            "scope": "release_context_not_row_fact",
            "source_mode": "not_applicable_japanese_adv_precutoff",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller-card symbol state", "seller possession"],
        },
        "image_provenance": {
            "allowed_use": ["manual_review", "catalog_reference_link"],
            "display_allowed": False,
            "exactness_basis": [
                "TCG Collector set page card link and image tile",
                "TCG Collector card page canonical URL",
                "TCG Collector card page OpenGraph image",
            ],
            "image_large": image_large,
            "image_role": "External reference witness for this Japanese ADV pre-cutoff catalog row; rights are not promoted to approved in-app display.",
            "image_small": set_row["grid_image_url"],
            "not_allowed_by_default": ["training", "seller evidence", "authentication proof"],
            "not_claiming": ["seller possession", "seller card match", "condition", "authenticity", "image rights approval"],
            "provider_id": set_row["card_url"].rstrip("/").split("/")[-2],
            "provider_title": title,
            "release_family_id": config.release_family_id,
            "rights_status": "external_reference_witness",
            "row_id": row_id,
            "source": "TCG Collector",
            "source_page_url": set_row["card_url"],
            "status": "external_page_reference_image",
            "verification_status": "tcgcollector_card_page_external_reference_witness",
        },
        "special_identification_instructions": [],
        "collector_texture": {
            "authority": "Collector texture only. It helps an agent search and explain the row; it is not transaction evidence.",
            "basis": ["TCG Collector set/card page", "TCGdex Japanese set metadata"],
            "note": f"{name_en} is cataloged as {config.name_en_context} {card_number}. Treat this as a reference row, then ask for seller evidence before any trade.",
            "signals": [config.name_en_context, config.name_ja, config.release_date, card_number, rarity, category, illustrator],
        },
        "information_audit": {
            "audit_scope": "Information architecture only. This row does not authenticate a physical card, condition, possession, or price.",
            "earns_keep": [
                {"field": "TCG Collector card URL", "surface": "primary", "why": "The agent needs a row-specific reference for a set TCGdex exposes only at set level."},
                {"field": "release family and card number", "surface": "primary", "why": "These prevent cross-set image or name laundering."},
                {"field": "external reference image", "surface": "agent", "why": "The agent needs a row-specific visual reference, but rights/use remain bounded."},
            ],
            "agent_only": [
                {"field": "TCGdex empty card-ref cross-check", "why": "Explains why this row exists outside the TCGdex classic corpus."},
                {"field": "source page hashes", "why": "Useful for audit and re-fetch checks, noisy for the human glance."},
            ],
        },
        "source_contacts": [
            {
                "source": "TCG Collector set page",
                "source_page_url": config.tcgcollector_url,
                "set_page_sha256": set_page_hash,
                "set_card_link_title": set_row["title"],
                "not_claiming": ["official source", "seller possession", "authenticity", "condition", "image rights approval"],
            },
            {
                "source": "TCG Collector card page",
                "source_page_url": set_row["card_url"],
                "card_page_sha256": card_page_hash,
                "card_number": card_number,
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
            "adapter": "tcgcollector_card_page",
            "card_format": extract_footer_field(card_html, "Card format"),
            "card_page_title": title,
            "card_url": set_row["card_url"],
            "grid_image_url": set_row["grid_image_url"],
            "set_page_title": set_row["title"],
            "tcgcollector_card_id": set_row["card_url"].rstrip("/").split("/")[-2],
            "tcgdex_set_id": config.tcgdex_set_id,
        },
        "not_claiming": ["seller possession", "authenticity", "condition truth", "price truth", "spendability"],
        "tags": [config.release_family_id, config.name_en_context, config.name_ja, config.tcgdex_set_id, card_number, rarity, category],
    }


def build_release(config: AdvSet) -> dict[str, Any]:
    set_html = fetch_html(config.tcgcollector_url)
    set_page_hash = sha256_text(set_html)
    tcgdex_result = fetch_tcgdex_set(config.tcgdex_set_id)
    tcgdex_body = tcgdex_result["body"]
    set_rows = parse_set_page(config, set_html)
    cards = [
        build_card_row(config, "", set_page_hash, set_row, tcgdex_result)
        for set_row in set_rows
    ]
    source = {
        "source": "TCG Collector + TCGdex REST API",
        "tcgcollector_set_page_url": config.tcgcollector_url,
        "tcgcollector_set_page_sha256": set_page_hash,
        "tcgcollector_rows_found": len(set_rows),
        "tcgdex_set_api_url": tcgdex_result["url"],
        "tcgdex_set_payload_hash": canonical_hash(tcgdex_body),
        "tcgdex_set_cards_returned": len(tcgdex_body.get("cards", []) or []),
        "tcgdex_card_count": tcgdex_body.get("cardCount", {}),
        "source_resolution_note": "TCGdex supplies set/date/count but no card refs; TCG Collector supplies row-level pages for this bounded corpus.",
        "not_claiming": ["official source", "seller possession", "authenticity", "condition", "image rights approval"],
    }
    return {
        "schema": "marketplace.japanese_adv_pre_wotc_release_catalog.v0.1",
        "release": {
            "release_family_id": config.release_family_id,
            "name_en": config.name_en_context,
            "name_ja": config.name_ja,
            "release_date": config.release_date,
            "date_precision": "day",
            "release_type": config.release_type,
            "expected_row_count": config.expected_row_count,
            "count_confidence": "tcgdex_set_count_plus_tcgcollector_row_pages",
            "parent_release_family_id": "",
            "product_card_count": config.expected_row_count,
            "product_count_basis": "TCGdex official/total set count cross-checked against TCG Collector set-page rows.",
            "strict_release_member": True,
            "unique_catalog_row_count": len(cards),
            "catalog_treatment": config.catalog_treatment,
            "note": "Japanese ADV set released before English Skyridge / the US WoC-era endpoint; modeled here because TCGdex set payload lacks row refs.",
        },
        "symbol_status": {
            "prints_without_rarity_symbol": "not_applicable_japanese_adv_precutoff",
            "confidence": "high",
            "source": "release-era context; not a No Rarity product family",
            "scope": "release_context_not_row_fact",
            "source_mode": "not_applicable_japanese_adv_precutoff",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller possession", "No Rarity proof without seller evidence"],
        },
        "sources": [source],
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
        if not card.get("image_provenance", {}).get("image_large"):
            failures.append(f"{row_id}: missing_external_reference_image")
        if not card.get("source_contacts"):
            failures.append(f"{row_id}: missing_source_contacts")
    return {
        "release_family_id": meta.get("release_family_id", ""),
        "row_count": len(cards),
        "expected_row_count": expected,
        "tcgcollector_reference_image_rows": sum(1 for card in cards if card.get("image_provenance", {}).get("image_large")),
        "illustrator_named_rows": sum(1 for card in cards if card.get("illustrator", {}).get("name")),
        "source_labeled_japanese_name_rows": sum(1 for card in cards if card.get("name_ja_status") == "source_labeled"),
        "missing_japanese_name_rows": sum(1 for card in cards if card.get("name_ja_status") != "source_labeled"),
        "special_identification_instruction_rows": sum(1 for card in cards if card.get("special_identification_instructions")),
        "passed": not failures,
        "failures": failures,
    }


def build_all(write_releases: bool = True) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, Any]]:
    manifests: list[dict[str, Any]] = []
    audit_rows: list[dict[str, Any]] = []
    stamp = utc_now()
    for config in ADV_PRE_WOTC_SETS:
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
                "catalog_treatment": config.catalog_treatment,
                "release_not_claiming": release.get("not_claiming", []),
                "tcgcollector_reference_image_rows": audit["tcgcollector_reference_image_rows"],
                "illustrator_named_rows": audit["illustrator_named_rows"],
                "source_labeled_japanese_name_rows": audit["source_labeled_japanese_name_rows"],
                "missing_japanese_name_rows": audit["missing_japanese_name_rows"],
                "special_identification_instruction_rows": audit["special_identification_instruction_rows"],
                "tcgdex_set_id": config.tcgdex_set_id,
                "tcgdex_set_api_url": source.get("tcgdex_set_api_url", ""),
                "tcgdex_set_payload_hash": source.get("tcgdex_set_payload_hash", ""),
                "tcgdex_set_cards_returned": source.get("tcgdex_set_cards_returned", 0),
                "tcgcollector_set_page_url": source.get("tcgcollector_set_page_url", ""),
                "tcgcollector_set_page_sha256": source.get("tcgcollector_set_page_sha256", ""),
            }
        )
    manifest = {
        "schema": "marketplace.japanese_adv_pre_wotc_manifest.v0.1",
        "generated_at": stamp,
        "release_count": len(manifests),
        "total_rows": sum(item["row_count"] for item in manifests),
        "tcgcollector_reference_image_rows": sum(item["tcgcollector_reference_image_rows"] for item in manifests),
        "illustrator_named_rows": sum(item["illustrator_named_rows"] for item in manifests),
        "source_labeled_japanese_name_rows": sum(item["source_labeled_japanese_name_rows"] for item in manifests),
        "missing_japanese_name_rows": sum(item["missing_japanese_name_rows"] for item in manifests),
        "special_identification_instruction_rows": sum(item["special_identification_instruction_rows"] for item in manifests),
        "hash_algorithm": HASH_ALGORITHM,
        "canonicalization": CANONICALIZATION,
        "source_contact_policy": "Images are bounded external reference witnesses and are not approved display/training/seller evidence by default.",
        "releases": manifests,
        "not_claiming": NOT_CLAIMING,
    }
    audit = {
        "schema": "marketplace.japanese_adv_pre_wotc_audit.v0.1",
        "generated_at": stamp,
        "passed": all(row["passed"] for row in audit_rows),
        "release_count": len(audit_rows),
        "total_rows": sum(row["row_count"] for row in audit_rows),
        "tcgcollector_reference_image_rows": sum(row["tcgcollector_reference_image_rows"] for row in audit_rows),
        "illustrator_named_rows": sum(row["illustrator_named_rows"] for row in audit_rows),
        "source_labeled_japanese_name_rows": sum(row["source_labeled_japanese_name_rows"] for row in audit_rows),
        "missing_japanese_name_rows": sum(row["missing_japanese_name_rows"] for row in audit_rows),
        "special_identification_instruction_rows": sum(row["special_identification_instruction_rows"] for row in audit_rows),
        "release_audits": audit_rows,
        "not_claiming": [
            "multi-agent audit complete",
            "complete Japanese ADV/PCG coverage",
            "approved image rights",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
        ],
    }
    return manifests, manifest, audit


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Japanese ADV pre-WoC-cutoff catalogs.")
    parser.add_argument("--check", action="store_true", help="build and audit without writing manifest/audit")
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
                "wrote": [] if args.check else ["data/japanese-adv-pre-wotc/manifest.json", "data/japanese-adv-pre-wotc/audit.json"],
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    if not audit["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
