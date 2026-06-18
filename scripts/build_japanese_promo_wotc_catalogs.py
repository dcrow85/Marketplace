#!/usr/bin/env python3
"""Build bounded Japanese numbered promo catalogs through the WoC-era edge.

This corpus extends the existing Japanese pre-English promo slice with later
Japanese numbered promo families that sit before, or at the edge of, the
English WoC-era endpoint. It intentionally keeps source boundaries visible:
P Promotional is modeled as a complete numbered promo page; ADV-P is modeled
only through the May 2003 / pre-cutoff rows.
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
OUT_DIR = ROOT / "data" / "japanese-promo-wotc"
RELEASE_DIR = OUT_DIR / "releases"
CACHE_DIR = ROOT / ".cache" / "bulbapedia_japanese_promo_wotc"
BULBAPEDIA_RAW_BASE = "https://bulbapedia.bulbagarden.net/w/index.php"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"
BULBAPEDIA_SOURCE_VERSION = "bulbapedia-japanese-promo-wotc-v0.1"
USER_AGENT = "MarketplaceJapanesePromoCatalog/0.1 (+local catalog builder)"


NOT_CLAIMING = [
    "complete Japanese promo universe",
    "approved image rights",
    "seller possession",
    "authenticity",
    "condition truth",
    "price truth",
    "spendability",
]


@dataclass(frozen=True)
class PromoSet:
    release_family_id: str
    name_en: str
    name_ja: str
    raw_title: str
    release_date: str
    date_precision: str
    expected_row_count: int
    release_type: str
    parse_mode: str
    max_printed_number: int | None
    product_count_basis: str
    boundary_note: str


PROMO_SETS: tuple[PromoSet, ...] = (
    PromoSet(
        release_family_id="jp_promo_p_promotional_20010701_20021231",
        name_en="P Promotional cards",
        name_ja="Pプロモカード",
        raw_title="P_Promotional_cards_(TCG)",
        release_date="2001-07-01",
        date_precision="month_range_start",
        expected_row_count=47,
        release_type="numbered_p_promo",
        parse_mode="all_setlist_entries",
        max_printed_number=None,
        product_count_basis="Bulbapedia P Promotional raw wikitext lists 47 numbered promo rows, 001/P through 047/P.",
        boundary_note="Complete numbered P Promotional page as exposed by the selected source; promotions run from July 2001 through 2002.",
    ),
    PromoSet(
        release_family_id="jp_promo_adv_p_pre_wotc_edge_200301_200305",
        name_en="ADV-P Promotional cards - pre-WoC-edge subset",
        name_ja="ADV-Pプロモカード",
        raw_title="ADV-P_Promotional_cards_(TCG)",
        release_date="2003-01-01",
        date_precision="month_range_start",
        expected_row_count=14,
        release_type="numbered_adv_p_promo_bounded_subset",
        parse_mode="bounded_numbered_prefix",
        max_printed_number=14,
        product_count_basis=(
            "Bulbapedia ADV-P Promotional raw wikitext spans 63 rows; this corpus models only 001/ADV-P through 014/ADV-P, "
            "whose distribution notes fall in January-May 2003. Rows 015/ADV-P and later begin at June 25, 2003 or later and stay outside this bounded slice."
        ),
        boundary_note="Bounded Japanese ADV-P subset through the May 2003 edge; not claiming complete ADV-P coverage.",
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
    text = re.sub(r"\{\{wp\|([^{}|]+)\}\}", r"\1", text)
    text = re.sub(r"\{\{TCG\|([^{}|]+)\}\}", r"\1", text)
    text = re.sub(r"\{\{TCGMerch\|([^{}]+)\}\}", lambda m: " ".join(part for part in m.group(1).split("|") if part), text)
    text = re.sub(r"\[\[[^|\]]+\|([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("'''", "").replace("''", "")
    return " ".join(text.split())


def parse_tcg_id(text: str) -> dict[str, str]:
    match = re.search(r"\{\{TCG ID\|([^|{}]+)\|([^|{}]+)\|([^|{}]+)\}\}", text)
    if not match:
        raise ValueError(f"missing TCG ID template: {text}")
    suffix = text[match.end() :]
    variant_match = re.search(r"\[([^\]]+)\]", suffix)
    return {
        "source_set": match.group(1).strip(),
        "name": match.group(2).strip(),
        "source_number": match.group(3).strip(),
        "variant_note": clean_wikitext(variant_match.group(1)) if variant_match else "",
    }


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


def parse_nmentry(line: str) -> dict[str, str]:
    text = line.strip()
    prefix = "{{Setlist/nmentry|"
    if not text.startswith(prefix):
        raise ValueError(f"not a Setlist/nmentry line: {line}")
    fields = split_top_level(text[len(prefix) :].rstrip("}"))
    while len(fields) < 6:
        fields.append("")
    tcg = parse_tcg_id(fields[1])
    return {
        "printed_number": clean_wikitext(fields[0]),
        "source_set": tcg["source_set"],
        "name": tcg["name"],
        "source_number": tcg["source_number"],
        "variant_note": tcg["variant_note"],
        "type": clean_wikitext(fields[2]),
        "subtype_or_rarity": clean_wikitext(fields[3]),
        "promotion": clean_wikitext(fields[5] if len(fields) > 5 else fields[4]),
        "raw_entry": line.strip(),
    }


def printed_number_int(value: str) -> int | None:
    match = re.match(r"(\d+)", value)
    return int(match.group(1)) if match else None


def row_inputs(config: PromoSet, raw: str) -> list[dict[str, str]]:
    lines = re.findall(r"\{\{Setlist/nmentry\|[^\n]+", raw)
    rows = [parse_nmentry(line) for line in lines]
    if config.parse_mode == "all_setlist_entries":
        return rows
    if config.parse_mode == "bounded_numbered_prefix":
        if config.max_printed_number is None:
            raise ValueError("bounded_numbered_prefix requires max_printed_number")
        return [row for row in rows if (printed_number_int(row["printed_number"]) or 10**9) <= config.max_printed_number]
    raise ValueError(f"unknown parse mode {config.parse_mode}")


def special_identification_instruction(config: PromoSet) -> dict[str, Any]:
    if config.release_type == "numbered_p_promo":
        return {
            "id": "japanese_p_promo_numbered_symbol_v0.1",
            "authority_label": "legible",
            "trigger": "Identifying a Japanese P Promotional card.",
            "summary": "Confirm the printed promo number uses the NNN/P format and keep it separate from the regular expansion or later reprint with the same Pokemon/name.",
            "steps": [
                "Read the printed promo number and confirm it matches the NNN/P row.",
                "Identify the underlying card name and type from the row.",
                "Preserve the distribution note; do not collapse all P promos into one generic promo bucket.",
                "Do not infer possession, authenticity, or condition from the catalog row.",
            ],
            "source_refs": [{"source": "Bulbapedia raw wikitext", "source_page_url": raw_url(config.raw_title)}],
            "not_claiming": ["seller possession", "authenticity", "condition", "complete Japanese promo universe"],
        }
    return {
        "id": "japanese_adv_p_promo_bounded_number_v0.1",
        "authority_label": "legible",
        "trigger": "Identifying a Japanese ADV-P Promotional card in the pre-WoC-edge subset.",
        "summary": "Confirm the printed promo number uses the NNN/ADV-P format and stays within the bounded 001-014 pre-edge slice.",
        "steps": [
            "Read the printed promo number and confirm it matches the NNN/ADV-P row.",
            "For this corpus, only treat 001/ADV-P through 014/ADV-P as in-scope.",
            "Preserve the distribution note because later ADV-P rows are deliberately out of this bounded slice.",
            "Do not infer possession, authenticity, or condition from the catalog row.",
        ],
        "source_refs": [{"source": "Bulbapedia raw wikitext", "source_page_url": raw_url(config.raw_title)}],
        "not_claiming": ["seller possession", "authenticity", "condition", "complete ADV-P coverage"],
    }


def category_from_type(card_type: str) -> str:
    if card_type in {"Grass", "Fire", "Water", "Lightning", "Psychic", "Fighting", "Colorless", "Darkness", "Metal"}:
        return "Pokemon"
    if card_type == "Trainer":
        return "Trainer"
    if card_type == "Energy":
        return "Energy"
    return ""


def build_card_row(config: PromoSet, raw_hash: str, source_url: str, index: int, item: dict[str, str]) -> dict[str, Any]:
    local_number = re.sub(r"[^A-Za-z0-9]+", "-", item["printed_number"]).strip("-").lower() or f"{index:03d}"
    local_id = f"{config.release_type}-{local_number}"
    row_id = f"{config.release_family_id}:{local_id}"
    instruction = special_identification_instruction(config)
    card_type = item["type"]
    return {
        "schema": "marketplace.japanese_promo_wotc_card_row.v0.1",
        "row_id": row_id,
        "release_family_id": config.release_family_id,
        "local_id": local_id,
        "card_number": item["printed_number"],
        "name_en": item["name"],
        "name_ja": "",
        "name_ja_status": "missing_from_exact_source",
        "name_source_note": "Bulbapedia raw wikitext Setlist row supplies the English display name; no row-level Japanese name is promoted by this builder.",
        "category": category_from_type(card_type),
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
            "types": [card_type] if category_from_type(card_type) == "Pokemon" else [],
            "weaknesses": [],
        },
        "illustrator": {
            "authority": "Primary source row does not provide illustrator for this numbered promo slice.",
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
            "authority": "Japanese numbered promo row derived from Bulbapedia raw wikitext.",
            "boundary_note": config.boundary_note,
            "catalog_treatment": "Catalog target",
            "counting_note": "Modeled as a promo product row, separate from any source expansion or reprint counterpart.",
            "date_precision": config.date_precision,
            "english_context_name": config.name_en,
            "japanese_set_name": config.name_ja,
            "parent_release_family_id": "",
            "product_card_count": config.expected_row_count,
            "product_count_basis": config.product_count_basis,
            "release_date": config.release_date,
            "release_type": config.release_type,
            "source_expansion_name": item["source_set"],
            "source_expansion_number": item["source_number"],
            "strict_release_member": True,
            "unique_catalog_row_count": config.expected_row_count,
        },
        "symbol_status": {
            "prints_without_rarity_symbol": "not_applicable_numbered_japanese_promo",
            "confidence": "medium",
            "scope": "release_context_not_row_fact",
            "source_mode": "bulbapedia_setlist_symbol_promo",
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
            "provider_id": f"bulbapedia:{config.raw_title}:{item['printed_number']}",
            "provider_title": f"{item['name']} - {config.name_en} {item['printed_number']}",
            "release_family_id": config.release_family_id,
            "rights_status": "no_image_source_supplied",
            "row_id": row_id,
            "source": "Bulbapedia raw wikitext",
            "source_page_url": source_url,
            "status": "source_payload_without_image",
            "verification_status": "raw_wikitext_catalog_row_without_image_witness",
        },
        "special_identification_instructions": [instruction],
        "collector_texture": {
            "authority": "Collector texture only. It helps an agent search and explain the row; it is not transaction evidence.",
            "basis": ["Bulbapedia raw wikitext Setlist row"],
            "note": f"{item['name']} is cataloged as {config.name_en} {item['printed_number']}. Treat this as a promo reference row, then ask for seller evidence before any trade.",
            "signals": [config.name_en, config.release_date, item["printed_number"], card_type, item["subtype_or_rarity"], item["promotion"], item["variant_note"]],
        },
        "information_audit": {
            "audit_scope": "Information architecture only. This row does not authenticate a physical card, condition, possession, or price.",
            "earns_keep": [
                {"field": "Bulbapedia raw row", "surface": "primary", "why": "The agent needs row identity for a promo family not modeled in TCGdex set rows."},
                {"field": "special identification instructions", "surface": "agent", "why": "The printed promo numbering and distribution note are the main identification risk."},
                {"field": "boundary note", "surface": "agent", "why": "Prevents silently importing post-boundary ADV-P rows."},
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
                "raw_entry": item["raw_entry"],
                "not_claiming": ["official source", "seller possession", "authenticity", "condition", "image rights approval"],
            }
        ],
        "provider_row": {
            "adapter": "bulbapedia_raw_setlist",
            "raw_title": config.raw_title,
            "printed_number": item["printed_number"],
            "promotion": item["promotion"],
            "source_expansion_name": item["source_set"],
            "source_expansion_number": item["source_number"],
            "variant_note": item["variant_note"],
            "type": card_type,
        },
        "not_claiming": ["seller possession", "authenticity", "condition truth", "price truth", "spendability"],
        "tags": [config.release_family_id, config.name_en, item["printed_number"], item["name"], card_type, item["subtype_or_rarity"], item["variant_note"]],
    }


def build_release(config: PromoSet) -> dict[str, Any]:
    source_url = raw_url(config.raw_title)
    raw = fetch_text(source_url)
    raw_hash = sha256_text(raw)
    rows = row_inputs(config, raw)
    cards = [build_card_row(config, raw_hash, source_url, index, item) for index, item in enumerate(rows, start=1)]
    return {
        "schema": "marketplace.japanese_promo_wotc_release_catalog.v0.1",
        "release": {
            "release_family_id": config.release_family_id,
            "name_en": config.name_en,
            "name_ja": config.name_ja,
            "release_date": config.release_date,
            "date_precision": config.date_precision,
            "release_type": config.release_type,
            "expected_row_count": config.expected_row_count,
            "count_confidence": "bulbapedia_raw_setlist",
            "parent_release_family_id": "",
            "product_card_count": config.expected_row_count,
            "product_count_basis": config.product_count_basis,
            "boundary_note": config.boundary_note,
            "strict_release_member": True,
            "unique_catalog_row_count": len(cards),
            "catalog_treatment": "Catalog target",
            "note": "Japanese numbered promo product modeled from raw setlist rows.",
        },
        "symbol_status": {
            "prints_without_rarity_symbol": "not_applicable_numbered_japanese_promo",
            "confidence": "medium",
            "source": "Bulbapedia setlist header marks this as a promo-symbol page; row-level physical symbol state still requires card evidence.",
            "scope": "release_context_not_row_fact",
            "source_mode": "bulbapedia_setlist_symbol_promo",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller possession", "No Rarity proof without seller evidence"],
        },
        "sources": [
            {
                "source": "Bulbapedia raw wikitext",
                "bulbapedia_raw_url": source_url,
                "bulbapedia_raw_sha256": raw_hash,
                "bulbapedia_rows_found": len(rows),
                "not_claiming": ["official source", "approved image rights", "seller possession", "authenticity", "condition"],
            }
        ],
        "cards": cards,
        "not_claiming": NOT_CLAIMING,
    }


def audit_release(path: Path, release: dict[str, Any], config: PromoSet) -> dict[str, Any]:
    cards = release["cards"]
    missing_special = [card["row_id"] for card in cards if "special_identification_instructions" not in card]
    malformed_special = [card["row_id"] for card in cards if not isinstance(card.get("special_identification_instructions"), list)]
    missing_source = [card["row_id"] for card in cards if not card.get("source_contacts")]
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "release_family_id": config.release_family_id,
        "row_count": len(cards),
        "expected_row_count": config.expected_row_count,
        "row_count_matches_expected": len(cards) == config.expected_row_count,
        "missing_special_identification_instructions": missing_special,
        "malformed_special_identification_instructions": malformed_special,
        "missing_source_contacts": missing_source,
        "passed": len(cards) == config.expected_row_count and not missing_special and not malformed_special and not missing_source,
    }


def build_all(write: bool) -> dict[str, Any]:
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    release_entries = []
    audits = []
    total_rows = 0
    source_payload_without_image_rows = 0
    special_rows = 0
    for config in PROMO_SETS:
        release = build_release(config)
        catalog_hash = canonical_hash(release)
        filename = f"{config.release_family_id}.json"
        path = RELEASE_DIR / filename
        if write:
            write_json(path, release)
        audit = audit_release(path, release, config)
        audits.append(audit)
        row_count = len(release["cards"])
        total_rows += row_count
        release_source_payload_without_image_rows = sum(1 for card in release["cards"] if card["image_provenance"]["status"] == "source_payload_without_image")
        release_special_rows = sum(1 for card in release["cards"] if card.get("special_identification_instructions"))
        source_payload_without_image_rows += release_source_payload_without_image_rows
        special_rows += release_special_rows
        source = release["sources"][0]
        release_entries.append(
            {
                "schema": "marketplace.japanese_promo_wotc_manifest_release.v0.1",
                "release_family_id": config.release_family_id,
                "path": path.relative_to(ROOT).as_posix(),
                "catalog_hash": catalog_hash,
                "canonicalization": CANONICALIZATION,
                "hash_algorithm": HASH_ALGORITHM,
                "release_type": config.release_type,
                "catalog_treatment": "Catalog target",
                "expected_row_count": config.expected_row_count,
                "row_count": row_count,
                "product_card_count": config.expected_row_count,
                "product_count_basis": config.product_count_basis,
                "boundary_note": config.boundary_note,
                "strict_release_member": True,
                "release_not_claiming": NOT_CLAIMING,
                "bulbapedia_raw_url": source["bulbapedia_raw_url"],
                "bulbapedia_raw_sha256": source["bulbapedia_raw_sha256"],
                "source_payload_without_image_rows": release_source_payload_without_image_rows,
                "special_identification_instruction_rows": release_special_rows,
            }
        )
    manifest = {
        "schema": "marketplace.japanese_promo_wotc_manifest.v0.1",
        "generated_at": utc_now(),
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "release_count": len(PROMO_SETS),
        "total_rows": total_rows,
        "source_payload_without_image_rows": source_payload_without_image_rows,
        "special_identification_instruction_rows": special_rows,
        "releases": release_entries,
        "source_contact_policy": "Rows are raw-wikitext reference identities without image promotion unless a row-specific image source is later added.",
        "not_claiming": NOT_CLAIMING,
    }
    audit = {
        "schema": "marketplace.japanese_promo_wotc_audit.v0.1",
        "generated_at": utc_now(),
        "release_count": len(PROMO_SETS),
        "total_rows": total_rows,
        "special_identification_instruction_rows": special_rows,
        "source_payload_without_image_rows": source_payload_without_image_rows,
        "release_audits": audits,
        "passed": all(item["passed"] for item in audits),
        "not_claiming": NOT_CLAIMING,
    }
    if write:
        write_json(OUT_DIR / "manifest.json", manifest)
        write_json(OUT_DIR / "audit.json", audit)
    return {"manifest": manifest, "audit": audit}


def main() -> None:
    parser = argparse.ArgumentParser(description="Build bounded Japanese numbered promo catalogs.")
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
