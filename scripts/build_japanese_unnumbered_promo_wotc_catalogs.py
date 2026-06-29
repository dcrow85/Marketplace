#!/usr/bin/env python3
"""Build bounded Japanese unnumbered promo continuation campaign catalogs.

The existing japanese-pre-english corpus already preserves the early unnumbered
promo source slice through selected pre-English rows. This builder adds the next
bounded Bulbapedia source slice and splits it into release-family files by the
source's promotion/distribution note. These are source-derived campaign families,
not official product-boundary proofs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "japanese-unnumbered-promo-wotc"
RELEASE_DIR = OUT_DIR / "releases"
CACHE_DIR = ROOT / ".cache" / "bulbapedia_japanese_unnumbered_promo_wotc"
BULBAPEDIA_RAW_BASE = "https://bulbapedia.bulbagarden.net/w/index.php"
RAW_TITLE = "Unnumbered_Promotional_cards_(TCG)/1996-2005"
SOURCE_SLICE_ID = "jp_promo_unnumbered_wotc_continuation_source_slice_19981113_2003spring"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"
BULBAPEDIA_SOURCE_VERSION = "bulbapedia-japanese-unnumbered-promo-wotc-v0.1"
USER_AGENT = "MarketplaceJapaneseUnnumberedPromoCatalog/0.1 (+local catalog builder)"
SOURCE_INDEX_START = 61
SOURCE_INDEX_END = 257
EXPECTED_ROW_COUNT = SOURCE_INDEX_END - SOURCE_INDEX_START + 1


NOT_CLAIMING = [
    "complete Japanese unnumbered promo universe",
    "official campaign boundary proof beyond the source promotion note",
    "approved image rights",
    "seller possession",
    "authenticity",
    "condition truth",
    "price truth",
    "spendability",
]

MONTHS = {
    "January": "01",
    "February": "02",
    "March": "03",
    "April": "04",
    "May": "05",
    "June": "06",
    "July": "07",
    "August": "08",
    "September": "09",
    "October": "10",
    "November": "11",
    "December": "12",
}


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


def raw_url() -> str:
    return f"{BULBAPEDIA_RAW_BASE}?title={urllib.parse.quote(RAW_TITLE)}&action=raw"


def cache_path(url: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{hashlib.sha256(f'{BULBAPEDIA_SOURCE_VERSION}|{url}'.encode('utf-8')).hexdigest()}.txt"


def fetch_text(url: str) -> str:
    cache_file = cache_path(url)
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


def clean_wikitext(value: str) -> str:
    text = value
    text = re.sub(r"\{\{single\|([^{}|]+)\}\}", r"\1", text)
    text = re.sub(r"\{\{vg\|([^{}|]+)\}\}", r"\1", text)
    text = re.sub(r"\{\{wp\|([^{}|]+)\}\}", r"\1", text)
    text = re.sub(r"\{\{tt\|([^{}|]+)\|([^{}]+)\}\}", r"\1", text)
    text = re.sub(r"\{\{TCG\|([^{}|]+)\}\}", r"\1", text)
    text = re.sub(r"\{\{DL\|([^{}]+)\}\}", lambda m: m.group(1).split("|")[-1], text)
    text = re.sub(r"\{\{TCGMerch\|([^{}]+)\}\}", lambda m: " ".join(part for part in m.group(1).split("|") if part), text)
    text = re.sub(r"\{\{OBP\|([^{}|]+)\|([^{}]+)\}\}", r"\1", text)
    text = re.sub(r"\[\[[^|\]]+\|([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"<small>'''\[([^\]]+)\]'''</small>", r"\1", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("'''", "").replace("''", "")
    return " ".join(text.split())


def slugify(value: str, max_len: int = 64) -> str:
    text = value.lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return (text or "unnamed")[:max_len].strip("_")


def date_from_promotion(value: str) -> tuple[str, str]:
    exact = re.search(
        r"\((January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})\)",
        value,
    )
    if exact:
        return f"{exact.group(3)}-{MONTHS[exact.group(1)]}-{int(exact.group(2)):02d}", "day"
    month = re.search(r"\((January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})\)", value)
    if month:
        return f"{month.group(2)}-{MONTHS[month.group(1)]}", "month"
    year = re.search(r"\((\d{4})\)", value)
    if year:
        return year.group(1), "year"
    return "1998-11-13", "mixed_source_notes"


def split_top_level(value: str) -> list[str]:
    fields: list[str] = []
    current = ""
    curly_depth = 0
    square_depth = 0
    i = 0
    while i < len(value):
        two = value[i : i + 2]
        if two == "{{":
            curly_depth += 1
            current += two
            i += 2
            continue
        if two == "}}" and curly_depth:
            curly_depth -= 1
            current += two
            i += 2
            continue
        if two == "[[":
            square_depth += 1
            current += two
            i += 2
            continue
        if two == "]]" and square_depth:
            square_depth -= 1
            current += two
            i += 2
            continue
        if value[i] == "|" and curly_depth == 0 and square_depth == 0:
            fields.append(current)
            current = ""
        else:
            current += value[i]
        i += 1
    fields.append(current)
    return fields


def parse_tcg_identity(text: str) -> dict[str, str]:
    match = re.search(r"\{\{TCG ID\|([^|{}]+)\|([^|{}]+)\|([^|{}]+)\}\}", text)
    if match:
        suffix = text[match.end() :]
        variant_notes = re.findall(r"\[([^\]]+)\]", suffix)
        bracket = " / ".join(clean_wikitext(note) for note in variant_notes)
        small_notes = re.findall(r"<small>'''\[([^\]]+)\]'''</small>", suffix)
        if small_notes:
            bracket = " / ".join([part for part in [bracket, *small_notes] if part])
        return {
            "source_set": match.group(1).strip(),
            "name": match.group(2).strip(),
            "source_number": match.group(3).strip(),
            "variant_note": bracket,
        }
    obp = re.search(r"\{\{OBP\|([^{}|]+)\|([^{}]+)\}\}", text)
    if obp:
        suffix = text[obp.end() :]
        variant_notes = re.findall(r"\[([^\]]+)\]", suffix)
        return {
            "source_set": obp.group(2).strip(),
            "name": obp.group(1).strip(),
            "source_number": "promo",
            "variant_note": " / ".join(clean_wikitext(note) for note in variant_notes),
        }
    raise ValueError(f"missing card identity template: {text}")


def parse_nmentry(line: str, source_index: int) -> dict[str, str]:
    prefix = "{{Setlist/nmentry|"
    text = line.strip()
    if not text.startswith(prefix):
        raise ValueError(f"not a Setlist/nmentry line: {line}")
    body = text[len(prefix) :]
    if body.endswith("}}"):
        body = body[:-2]
    fields = split_top_level(body)
    while len(fields) < 6:
        fields.append("")
    identity = parse_tcg_identity(fields[1])
    return {
        "source_index": f"{source_index:03d}",
        "printed_number": clean_wikitext(fields[0]),
        "source_set": identity["source_set"],
        "name": identity["name"],
        "source_number": identity["source_number"],
        "variant_note": identity["variant_note"],
        "type": clean_wikitext(fields[2]),
        "subtype_or_rarity": clean_wikitext(fields[3]),
        "promotion": clean_wikitext(fields[5] if len(fields) > 5 else fields[4]),
        "raw_entry": line.strip(),
    }


def row_inputs(raw: str) -> list[dict[str, str]]:
    lines = re.findall(r"\{\{Setlist/nmentry\|[^\n]+", raw)
    selected = lines[SOURCE_INDEX_START - 1 : SOURCE_INDEX_END]
    return [parse_nmentry(line, index) for index, line in enumerate(selected, start=SOURCE_INDEX_START)]


def category_from_type(card_type: str) -> str:
    if card_type in {"Grass", "Fire", "Water", "Lightning", "Psychic", "Fighting", "Colorless", "Darkness", "Metal"}:
        return "Pokemon"
    if card_type == "Trainer" or "Trainer" in card_type or card_type.startswith("No."):
        return "Trainer"
    if card_type in {"Energy", "Special Card"}:
        return card_type
    return ""


def special_identification_instruction(release_family_id: str) -> dict[str, Any]:
    return {
        "id": "japanese_unnumbered_promo_distribution_identity_v0.1",
        "authority_label": "legible",
        "trigger": "Identifying a Japanese unnumbered promotional card from the WoC-era continuation slice.",
        "summary": "Because these rows usually have no printed set number, identify by card name, source family, variant note, and distribution note together.",
        "steps": [
            "Do not rely on name alone; many rows share names or art lineage with other releases.",
            "Compare the source family named by the catalog row, such as CoroCoro, ANA, Fan Club, Premium File, or tournament family.",
            "Preserve variant notes such as Jumbo, English, postcard, bilingual, glossy, or trainer-prize context.",
            "Use seller photos to confirm the physical format and distribution tell before treating the row as a candidate match.",
            "Do not infer possession, authenticity, condition, or exact distribution date from this source-slice row.",
        ],
        "source_refs": [{"source": "Bulbapedia raw wikitext", "source_page_url": raw_url()}],
        "not_claiming": ["seller possession", "authenticity", "condition", "official campaign boundary proof beyond the source promotion note", "exact date for season-only rows"],
    }


def build_card_row(raw_hash: str, source_url: str, item: dict[str, str], release_family_id: str, group: dict[str, Any]) -> dict[str, Any]:
    local_id = item["source_index"]
    row_id = f"{release_family_id}:{local_id}"
    card_type = item["type"]
    category = category_from_type(card_type)
    return {
        "schema": "marketplace.japanese_unnumbered_promo_wotc_card_row.v0.1",
        "row_id": row_id,
        "release_family_id": release_family_id,
        "local_id": local_id,
        "card_number": item["printed_number"],
        "source_index": item["source_index"],
        "name_en": item["name"],
        "name_ja": "",
        "name_ja_status": "missing_from_exact_source",
        "name_source_note": "Bulbapedia raw wikitext Setlist row supplies the English display name; no row-level Japanese name is promoted by this builder.",
        "category": category,
        "rarity_source": item["subtype_or_rarity"],
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
            "types": [card_type] if category == "Pokemon" else [],
            "weaknesses": [],
        },
        "illustrator": {
            "authority": "Primary source row does not provide illustrator for this unnumbered promo source slice.",
            "caption": "",
            "credit_status": "not_provided_by_primary_source",
            "display": "",
            "name": "",
            "not_claiming": ["seller possession", "authenticity", "condition", "print authority"],
            "requested_page_title": "",
            "resolved_page_title": "",
            "source": "Bulbapedia raw wikitext",
            "source_page_sha256": raw_hash,
            "source_page_url": source_url,
        },
        "product_scope": {
            "authority": "Japanese unnumbered promo aggregate source-slice derived from Bulbapedia raw wikitext.",
            "boundary_note": (
                f"Models source rows {group['source_index_start']}-{group['source_index_end']} that share the same Bulbapedia promotion/distribution note. "
                "This is a source-derived campaign family, not an official product-boundary proof."
            ),
            "catalog_treatment": "Catalog target",
            "counting_note": "Rows are grouped by the source promotion/distribution note; exact campaign boundaries may need a stronger source for high-stakes use.",
            "date_precision": group["date_precision"],
            "english_context_name": group["name_en"],
            "japanese_set_name": "アンナンバードプロモカード",
            "parent_release_family_id": SOURCE_SLICE_ID,
            "product_card_count": group["row_count"],
            "product_count_basis": f"Bulbapedia raw wikitext source rows {group['source_index_start']}-{group['source_index_end']} with promotion note: {group['promotion']}",
            "release_date": group["release_date"],
            "release_type": "unnumbered_promo_campaign_source_group",
            "source_slice_id": SOURCE_SLICE_ID,
            "source_expansion_name": item["source_set"],
            "source_expansion_number": item["source_number"],
            "strict_release_member": True,
            "unique_catalog_row_count": group["row_count"],
        },
        "symbol_status": {
            "prints_without_rarity_symbol": "mixed_or_not_applicable_unnumbered_promo",
            "confidence": "low",
            "scope": "release_context_not_row_fact",
            "source_mode": "bulbapedia_unnumbered_promo_setlist",
            "source_release_family_id": release_family_id,
            "not_claiming": ["row-level physical truth", "seller-card symbol state", "seller possession", "No Rarity proof"],
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
            "provider_id": f"bulbapedia:{RAW_TITLE}:{item['source_index']}",
            "provider_title": f"{item['name']} - Unnumbered Promotional source row {item['source_index']}",
            "release_family_id": release_family_id,
            "rights_status": "no_image_source_supplied",
            "row_id": row_id,
            "source": "Bulbapedia raw wikitext",
            "source_page_url": source_url,
            "status": "source_payload_without_image",
            "verification_status": "raw_wikitext_catalog_row_without_image_witness",
        },
        "special_identification_instructions": [special_identification_instruction(release_family_id)],
        "collector_texture": {
            "authority": "Collector texture only. It helps an agent search and explain the row; it is not transaction evidence.",
            "basis": ["Bulbapedia raw wikitext Setlist row"],
            "note": f"{item['name']} appears in the unnumbered promotional source slice at row {item['source_index']}. Treat this as a reference identity, then ask for seller evidence before any trade.",
            "signals": [item["source_index"], item["source_set"], item["name"], item["variant_note"], card_type, item["subtype_or_rarity"], item["promotion"]],
        },
        "information_audit": {
            "audit_scope": "Information architecture only. This row does not authenticate a physical card, condition, possession, or price.",
            "earns_keep": [
                {"field": "source index", "surface": "primary", "why": "The row has no printed set number; source order is the stable audit handle."},
                {"field": "distribution note", "surface": "agent", "why": "Distribution context is central to identifying unnumbered promos."},
                {"field": "special identification instructions", "surface": "agent", "why": "Unnumbered promos require source-family and variant checks, not name-only matching."},
            ],
            "agent_only": [
                {"field": "raw wikitext hash", "why": "Useful for audit and re-fetch checks, noisy for the human glance."},
                {"field": "not_claiming", "why": "Keeps source identity separate from physical-card truth."},
            ],
        },
        "source_contacts": [
            {
                "source": "Bulbapedia raw wikitext",
                "source_page_url": source_url,
                "source_page_sha256": raw_hash,
                "source_index": item["source_index"],
                "raw_entry": item["raw_entry"],
                "not_claiming": ["official source", "seller possession", "authenticity", "condition", "image rights approval"],
            }
        ],
        "provider_row": {
            "adapter": "bulbapedia_raw_setlist",
            "raw_title": RAW_TITLE,
            "source_index": item["source_index"],
            "printed_number": item["printed_number"],
            "promotion": item["promotion"],
            "source_expansion_name": item["source_set"],
            "source_expansion_number": item["source_number"],
            "variant_note": item["variant_note"],
            "type": card_type,
        },
        "not_claiming": ["seller possession", "authenticity", "condition truth", "price truth", "spendability"],
        "tags": [release_family_id, SOURCE_SLICE_ID, item["source_index"], item["source_set"], item["name"], card_type, item["subtype_or_rarity"], item["variant_note"]],
    }


def group_rows(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, str]]] = {}
    for item in rows:
        grouped.setdefault(item["promotion"], []).append(item)
    groups: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for promotion, items in grouped.items():
        source_indices = [int(item["source_index"]) for item in items]
        release_date, date_precision = date_from_promotion(promotion)
        base_slug = slugify(promotion)
        release_family_id = f"jp_promo_unnumbered_wotc_{source_indices[0]:03d}_{base_slug}"
        while release_family_id in seen_ids:
            release_family_id = f"{release_family_id}_{source_indices[0]:03d}"
        seen_ids.add(release_family_id)
        groups.append(
            {
                "release_family_id": release_family_id,
                "name_en": promotion,
                "promotion": promotion,
                "release_date": release_date,
                "date_precision": date_precision,
                "source_index_start": f"{min(source_indices):03d}",
                "source_index_end": f"{max(source_indices):03d}",
                "source_indices": [f"{index:03d}" for index in source_indices],
                "source_indices_contiguous": source_indices == list(range(min(source_indices), max(source_indices) + 1)),
                "row_count": len(items),
                "items": items,
            }
        )
    return sorted(groups, key=lambda group: int(group["source_index_start"]))


def build_release(raw_hash: str, source_url: str, group: dict[str, Any]) -> dict[str, Any]:
    release_family_id = group["release_family_id"]
    cards = [build_card_row(raw_hash, source_url, item, release_family_id, group) for item in group["items"]]
    return {
        "schema": "marketplace.japanese_unnumbered_promo_wotc_release_catalog.v0.1",
        "release": {
            "release_family_id": release_family_id,
            "name_en": group["name_en"],
            "name_ja": "アンナンバードプロモカード",
            "release_date": group["release_date"],
            "date_precision": group["date_precision"],
            "release_type": "unnumbered_promo_campaign_source_group",
            "expected_row_count": group["row_count"],
            "count_confidence": "bulbapedia_raw_promotion_group",
            "parent_release_family_id": SOURCE_SLICE_ID,
            "source_slice_id": SOURCE_SLICE_ID,
            "product_card_count": group["row_count"],
            "product_count_basis": f"Bulbapedia raw source rows {group['source_index_start']}-{group['source_index_end']} with promotion note: {group['promotion']}",
            "boundary_note": "Source-derived campaign family grouped by the exact Bulbapedia promotion/distribution note; not an official product-boundary proof.",
            "strict_release_member": True,
            "unique_catalog_row_count": len(cards),
            "catalog_treatment": "Catalog target",
            "source_indices": group["source_indices"],
            "source_indices_contiguous": group["source_indices_contiguous"],
            "note": "Campaign-level split derived from the source promotion note to make unnumbered promo matching more legible for agents.",
        },
        "symbol_status": {
            "prints_without_rarity_symbol": "mixed_or_not_applicable_unnumbered_promo",
            "confidence": "low",
            "source": "Bulbapedia unnumbered promo table; physical symbol state varies by row and must be checked from evidence.",
            "scope": "release_context_not_row_fact",
            "source_mode": "bulbapedia_unnumbered_promo_setlist",
            "source_release_family_id": release_family_id,
            "not_claiming": ["row-level physical truth", "seller possession", "No Rarity proof without seller evidence"],
        },
        "sources": [
            {
                "source": "Bulbapedia raw wikitext",
                "bulbapedia_raw_url": source_url,
                "bulbapedia_raw_sha256": raw_hash,
                "bulbapedia_rows_found": len(cards),
                "source_index_start": group["source_index_start"],
                "source_index_end": group["source_index_end"],
                "source_indices": group["source_indices"],
                "promotion": group["promotion"],
                "not_claiming": ["official source", "approved image rights", "seller possession", "authenticity", "condition"],
            }
        ],
        "cards": cards,
        "not_claiming": NOT_CLAIMING,
    }


def build_releases() -> list[dict[str, Any]]:
    source_url = raw_url()
    raw = fetch_text(source_url)
    raw_hash = sha256_text(raw)
    rows = row_inputs(raw)
    return [build_release(raw_hash, source_url, group) for group in group_rows(rows)]


def audit_release(path: Path, release: dict[str, Any]) -> dict[str, Any]:
    cards = release["cards"]
    source_indices = [int(card["source_index"]) for card in cards]
    missing_special = [card["row_id"] for card in cards if "special_identification_instructions" not in card]
    malformed_special = [card["row_id"] for card in cards if not isinstance(card.get("special_identification_instructions"), list)]
    missing_source = [card["row_id"] for card in cards if not card.get("source_contacts")]
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "release_family_id": release["release"]["release_family_id"],
        "row_count": len(cards),
        "expected_row_count": release["release"]["expected_row_count"],
        "source_index_start": min(source_indices) if source_indices else None,
        "source_index_end": max(source_indices) if source_indices else None,
        "source_indices_contiguous": release["release"]["source_indices_contiguous"],
        "row_count_matches_expected": len(cards) == release["release"]["expected_row_count"],
        "missing_special_identification_instructions": missing_special,
        "malformed_special_identification_instructions": malformed_special,
        "missing_source_contacts": missing_source,
        "passed": (
            len(cards) == release["release"]["expected_row_count"]
            and not missing_special
            and not malformed_special
            and not missing_source
        ),
    }


def build_all(write: bool) -> dict[str, Any]:
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    releases = build_releases()
    if write:
        for old_path in RELEASE_DIR.glob("jp_promo_unnumbered_wotc_*.json"):
            old_path.unlink()
        old_aggregate = RELEASE_DIR / f"{SOURCE_SLICE_ID}.json"
        if old_aggregate.exists():
            old_aggregate.unlink()
    manifest_releases: list[dict[str, Any]] = []
    audit_items: list[dict[str, Any]] = []
    row_count = 0
    source_payload_without_image_rows = 0
    special_rows = 0
    source_indices: list[int] = []
    for release in releases:
        release_family_id = release["release"]["release_family_id"]
        path = RELEASE_DIR / f"{release_family_id}.json"
        if write:
            write_json(path, release)
        catalog_hash = canonical_hash(release)
        audit_item = audit_release(path, release)
        audit_items.append(audit_item)
        source = release["sources"][0]
        cards = release["cards"]
        row_count += len(cards)
        source_indices.extend(int(card["source_index"]) for card in cards)
        source_payload_without_image_rows += sum(1 for card in cards if card["image_provenance"]["status"] == "source_payload_without_image")
        special_rows += sum(1 for card in cards if card.get("special_identification_instructions"))
        manifest_releases.append(
            {
                "schema": "marketplace.japanese_unnumbered_promo_wotc_manifest_release.v0.1",
                "release_family_id": release_family_id,
                "path": path.relative_to(ROOT).as_posix(),
                "catalog_hash": catalog_hash,
                "canonicalization": CANONICALIZATION,
                "hash_algorithm": HASH_ALGORITHM,
                "release_type": release["release"]["release_type"],
                "catalog_treatment": "Catalog target",
                "expected_row_count": release["release"]["expected_row_count"],
                "row_count": len(cards),
                "product_card_count": release["release"]["product_card_count"],
                "product_count_basis": release["release"]["product_count_basis"],
                "boundary_note": release["release"]["boundary_note"],
                "strict_release_member": True,
                "release_not_claiming": NOT_CLAIMING,
                "bulbapedia_raw_url": source["bulbapedia_raw_url"],
                "bulbapedia_raw_sha256": source["bulbapedia_raw_sha256"],
                "source_index_start": source["source_index_start"],
                "source_index_end": source["source_index_end"],
                "source_indices": source["source_indices"],
                "source_indices_contiguous": release["release"]["source_indices_contiguous"],
                "source_payload_without_image_rows": sum(1 for card in cards if card["image_provenance"]["status"] == "source_payload_without_image"),
                "special_identification_instruction_rows": sum(1 for card in cards if card.get("special_identification_instructions")),
            }
        )
    manifest = {
        "schema": "marketplace.japanese_unnumbered_promo_wotc_manifest.v0.1",
        "generated_at": utc_now(),
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "release_count": len(releases),
        "total_rows": row_count,
        "source_slice_id": SOURCE_SLICE_ID,
        "source_index_start": SOURCE_INDEX_START,
        "source_index_end": SOURCE_INDEX_END,
        "source_indices_contiguous_across_corpus": sorted(source_indices) == list(range(SOURCE_INDEX_START, SOURCE_INDEX_END + 1)),
        "source_payload_without_image_rows": source_payload_without_image_rows,
        "special_identification_instruction_rows": special_rows,
        "releases": manifest_releases,
        "source_contact_policy": "Rows are raw-wikitext reference identities without image promotion unless a row-specific image source is later added.",
        "not_claiming": NOT_CLAIMING,
    }
    audit = {
        "schema": "marketplace.japanese_unnumbered_promo_wotc_audit.v0.1",
        "generated_at": utc_now(),
        "release_count": len(releases),
        "total_rows": row_count,
        "source_slice_id": SOURCE_SLICE_ID,
        "source_indices_contiguous_across_corpus": sorted(source_indices) == list(range(SOURCE_INDEX_START, SOURCE_INDEX_END + 1)),
        "special_identification_instruction_rows": special_rows,
        "source_payload_without_image_rows": source_payload_without_image_rows,
        "release_audits": audit_items,
        "passed": all(item["passed"] for item in audit_items) and row_count == EXPECTED_ROW_COUNT and sorted(source_indices) == list(range(SOURCE_INDEX_START, SOURCE_INDEX_END + 1)),
        "not_claiming": NOT_CLAIMING,
    }
    if write:
        write_json(OUT_DIR / "manifest.json", manifest)
        write_json(OUT_DIR / "audit.json", audit)
    return {"manifest": manifest, "audit": audit}


def main() -> None:
    parser = argparse.ArgumentParser(description="Build bounded Japanese unnumbered promo source-slice catalog.")
    parser.add_argument("--check", action="store_true", help="build without writing")
    args = parser.parse_args()
    result = build_all(write=not args.check)
    manifest = result["manifest"]
    audit = result["audit"]
    print(
        json.dumps(
            {
                "release_count": manifest["release_count"],
                "total_rows": manifest["total_rows"],
                "special_identification_instruction_rows": manifest["special_identification_instruction_rows"],
                "passed": audit["passed"],
                "wrote": [] if args.check else [OUT_DIR.relative_to(ROOT).as_posix()],
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    if not audit["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
