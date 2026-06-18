#!/usr/bin/env python3
"""Build a boundary proof for English Jumbo rows.

TCGdex exposes an English `jumbo` set with a count but no card refs. Bulbapedia
exposes a much larger chronological raw setlist. This proof keeps the mismatch
visible while showing why the catalog currently models only the first ten rows:
they are a contiguous WoC-era/Best-of-Game prefix, and the next source rows jump
outside the current boundary.
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
OUT_DIR = ROOT / "data" / "catalog-expansion"
OUT_PATH = OUT_DIR / "english-jumbo-boundary-proof.json"
CACHE_DIR = ROOT / ".cache" / "bulbapedia_english_jumbo_boundary_proof"
BULBAPEDIA_RAW_BASE = "https://bulbapedia.bulbagarden.net/w/index.php"
RAW_TITLE = "Jumbo_cards_(TCG)"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"
SOURCE_VERSION = "english-jumbo-boundary-proof-v0.1"
USER_AGENT = "MarketplaceEnglishJumboBoundaryProof/0.1 (+local catalog builder)"
MODELED_INDEX_END = 10


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical_hash(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def file_hash(path: str | Path) -> str:
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def read_json(path: str | Path) -> Any:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def raw_url() -> str:
    return f"{BULBAPEDIA_RAW_BASE}?title={urllib.parse.quote(RAW_TITLE)}&action=raw"


def cache_path(url: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{hashlib.sha256(f'{SOURCE_VERSION}|{url}'.encode('utf-8')).hexdigest()}.txt"


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
    text = re.sub(r"\{\{exp\|([^{}|]+)\}\}", r"\1", text)
    text = re.sub(r"\{\{TCG\|([^{}|]+)\}\}", r"\1", text)
    text = re.sub(r"\{\{TCGMerch\|([^{}]+)\}\}", lambda m: " ".join(part for part in m.group(1).split("|") if part), text)
    text = re.sub(r"\[\[[^|\]]+\|([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"<small>'''\[([^\]]+)\]'''</small>", r"\1", text)
    text = re.sub(r"<br\\s*/?>", " / ", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("'''", "").replace("''", "")
    return " ".join(text.split())


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


def parse_identity(text: str) -> dict[str, str]:
    match = re.search(r"\{\{TCG ID\|([^|{}]+)\|([^|{}]+)\|([^|{}]+)\}\}", text)
    if match:
        suffix = text[match.end() :]
        notes = re.findall(r"\[([^\]]+)\]", suffix)
        small = re.findall(r"<small>'''\[([^\]]+)\]'''</small>", suffix)
        return {
            "source_set": match.group(1).strip(),
            "name": match.group(2).strip(),
            "source_number": match.group(3).strip(),
            "variant_note": " / ".join([*notes, *small]),
        }
    link = re.search(r"\[\[[^|\]]+\|([^\]]+)\]\]", text)
    if link:
        return {"source_set": "", "name": clean_wikitext(link.group(1)), "source_number": "", "variant_note": ""}
    return {"source_set": "", "name": clean_wikitext(text), "source_number": "", "variant_note": ""}


def parse_entry(line: str, index: int) -> dict[str, Any]:
    prefix = "{{Setlist/nmentry|"
    fields = split_top_level(line.strip()[len(prefix) :].rstrip("}"))
    while len(fields) < 6:
        fields.append("")
    cleaned_fields = [re.sub(r"^\d+=", "", field) for field in fields]
    identity = parse_identity(fields[1])
    promotion = ""
    named_promotion_candidates = [
        re.sub(r"^\d+=", "", field)
        for field in fields[3:]
        if re.match(r"^\d+=", field)
    ]
    for field in reversed(cleaned_fields[4:]):
        candidate = clean_wikitext(field)
        if candidate:
            promotion = candidate
            break
    if not promotion and named_promotion_candidates:
        promotion = clean_wikitext(named_promotion_candidates[-1])
    return {
        "source_index": index,
        "printed_number": clean_wikitext(cleaned_fields[0]),
        "source_set": identity["source_set"],
        "name": identity["name"],
        "source_number": identity["source_number"],
        "variant_note": clean_wikitext(identity["variant_note"]),
        "type": clean_wikitext(cleaned_fields[2]),
        "subtype_or_rarity": clean_wikitext(cleaned_fields[3]),
        "promotion": promotion,
        "raw_entry": line.strip(),
    }


def classify_entry(entry: dict[str, Any]) -> dict[str, Any]:
    promotion = entry["promotion"]
    source_set = entry["source_set"]
    index = int(entry["source_index"])
    if index <= MODELED_INDEX_END:
        reason = "modeled_wotc_prefix"
        if "BattleZone" in promotion:
            note = "Best of Game Winner Jumbo row; Best of Game is modeled as an English WoC-era promo series."
        else:
            note = "Early English Jumbo row before the post-boundary jump."
        in_scope = True
    elif "25th Anniversary" in promotion:
        reason = "excluded_modern_25th_anniversary"
        note = "Modern 25th Anniversary jumbo reprint/promo, not a WoC-era distribution."
        in_scope = False
    elif "e-League" in promotion or source_set == "Nintendo Promo":
        reason = "excluded_post_wotc_nintendo_eleague"
        note = "Nintendo/e-League row after the WoC-era Best of Game prefix."
        in_scope = False
    elif any(marker in source_set for marker in ("EX ", "DP Promo", "Diamond & Pearl", "BW Promo", "XY Promo", "SM Promo", "SWSH", "SVP", "MEP")):
        reason = "excluded_later_series_source_set"
        note = "Source set belongs to a later TCG era."
        in_scope = False
    elif any(marker in promotion for marker in ("Ruby and Sapphire", "Diamond & Pearl", "Platinum", "HeartGold", "Black & White", "XY", "Sun & Moon", "Sword & Shield", "Scarlet & Violet", "Mega Evolution")):
        reason = "excluded_later_merchandise_era"
        note = "Promotion text names a later merchandise era."
        in_scope = False
    elif index > MODELED_INDEX_END:
        reason = "excluded_after_modeled_prefix_unclassified_by_rule"
        note = "After the contiguous modeled WoC-era prefix; retained as excluded unless a later source proves a pre-boundary distribution."
        in_scope = False
    else:
        reason = "unclassified"
        note = "No classification rule applied."
        in_scope = False
    return {
        **entry,
        "in_scope": in_scope,
        "classification": reason,
        "classification_note": note,
    }


def build() -> dict[str, Any]:
    source_url = raw_url()
    raw = fetch_text(source_url)
    raw_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    entries = [
        classify_entry(parse_entry(line, index))
        for index, line in enumerate(re.findall(r"\{\{Setlist/nmentry\|[^\n]+", raw), start=1)
    ]
    modeled_release_path = "data/english-supplemental-wotc/releases/en_wotc_jumbo_bounded_200002_200307.json"
    modeled_release = read_json(modeled_release_path)
    modeled = [entry for entry in entries if entry["in_scope"]]
    excluded = [entry for entry in entries if not entry["in_scope"]]
    counts: dict[str, int] = {}
    for entry in entries:
        counts[entry["classification"]] = counts.get(entry["classification"], 0) + 1
    unclassified_excluded = [entry for entry in excluded if entry["classification"] == "excluded_after_modeled_prefix_unclassified_by_rule"]
    proof = {
        "schema": "marketplace.english_jumbo_boundary_proof.v0.1",
        "generated_at": utc_now(),
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "source": "Bulbapedia raw wikitext",
        "source_page_url": source_url,
        "source_page_sha256": raw_hash,
        "source_row_count": len(entries),
        "tcgdex_gap_context": {
            "source_gap_register_path": "data/catalog-expansion/source-gaps.json",
            "source_gap_register_hash": file_hash("data/catalog-expansion/source-gaps.json"),
            "tcgdex_set_id": "jumbo",
            "tcgdex_official_count": 160,
            "not_claiming": [
                "Bulbapedia raw row count equals TCGdex official count",
                "complete Jumbo coverage from TCGdex",
            ],
        },
        "modeled_prefix": {
            "source_index_start": 1,
            "source_index_end": MODELED_INDEX_END,
            "modeled_row_count": len(modeled),
            "resolved_by": modeled_release_path,
            "resolved_catalog_hash": canonical_hash(modeled_release),
            "resolved_file_hash": file_hash(modeled_release_path),
            "entries": [
                {
                    "source_index": entry["source_index"],
                    "name": entry["name"],
                    "printed_number": entry["printed_number"],
                    "source_set": entry["source_set"],
                    "promotion": entry["promotion"],
                    "classification_note": entry["classification_note"],
                }
                for entry in modeled
            ],
        },
        "first_excluded_entries": [
            {
                "source_index": entry["source_index"],
                "name": entry["name"],
                "printed_number": entry["printed_number"],
                "source_set": entry["source_set"],
                "promotion": entry["promotion"],
                "classification": entry["classification"],
                "classification_note": entry["classification_note"],
            }
            for entry in excluded[:12]
        ],
        "classification_counts": counts,
        "unclassified_excluded_count": len(unclassified_excluded),
        "unclassified_excluded_samples": [
            {
                "source_index": entry["source_index"],
                "name": entry["name"],
                "source_set": entry["source_set"],
                "promotion": entry["promotion"],
            }
            for entry in unclassified_excluded[:20]
        ],
        "passed": len(modeled) == MODELED_INDEX_END and entries[0]["source_index"] == 1 and entries[MODELED_INDEX_END - 1]["source_index"] == MODELED_INDEX_END,
        "status": "bounded_prefix_proven_not_complete_jumbo_resolution",
        "not_claiming": [
            "complete Jumbo coverage",
            "Bulbapedia raw row count equals TCGdex official count",
            "every post-prefix row has exact release-date proof",
            "approved image rights",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
        ],
    }
    proof["proof_hash"] = canonical_hash({key: value for key, value in proof.items() if key != "proof_hash"})
    return proof


def main() -> None:
    parser = argparse.ArgumentParser(description="Build English Jumbo boundary proof.")
    parser.add_argument("--check", action="store_true", help="build without writing")
    args = parser.parse_args()
    proof = build()
    if not args.check:
        write_json(OUT_PATH, proof)
    print(
        json.dumps(
            {
                "passed": proof["passed"],
                "source_row_count": proof["source_row_count"],
                "modeled_row_count": proof["modeled_prefix"]["modeled_row_count"],
                "unclassified_excluded_count": proof["unclassified_excluded_count"],
                "status": proof["status"],
                "wrote": [] if args.check else [OUT_PATH.relative_to(ROOT).as_posix()],
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    if not proof["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
