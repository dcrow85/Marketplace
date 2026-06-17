#!/usr/bin/env python3
"""Build source-attributed Japanese pre-English release catalogs.

This expands the No Rarity catalog pattern without diluting it. The output is a
set of release-family catalogs plus a manifest. Images are kept as exact external
reference witnesses only: same release page, same row number, same provider row.
They are not seller evidence, authenticity, possession, condition, or training
data.
"""

from __future__ import annotations

import hashlib
import html
import json
import re
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "japanese-pre-english"
RELEASE_DIR = OUT_DIR / "releases"
MANIFEST_PATH = OUT_DIR / "manifest.json"
AUDIT_PATH = OUT_DIR / "audit.json"
TCGDEX_API_BASE = "https://api.tcgdex.net/v2/ja"
POKELLECTOR_BASE = "https://jp.pokellector.com"
USER_AGENT = "MarketplaceCatalogBuilder/0.1 (+https://github.com/dcrow85/Marketplace)"


@dataclass(frozen=True)
class ReleaseConfig:
    release_family_id: str
    name_en: str
    name_ja: str
    release_date: str
    expected_row_count: int
    release_type: str
    prints_without_rarity_symbol: str
    symbol_status_confidence: str
    pokellector_path: str
    tcgdex_set_id: str | None = None
    catalog_treatment: str = "Catalog target"
    note: str = ""


RELEASES: tuple[ReleaseConfig, ...] = (
    ReleaseConfig(
        release_family_id="jp_tcg_jungle_19970305",
        name_en="Pokemon Jungle",
        name_ja="ポケモンジャングル",
        release_date="1997-03-05",
        expected_row_count=48,
        release_type="main_booster_expansion",
        prints_without_rarity_symbol="no",
        symbol_status_confidence="high",
        pokellector_path="/Pokemon-Jungle-Expansion/",
        tcgdex_set_id="PMCG2",
        note="Japanese Jungle booster rows; no English-style holo/non-holo duplicate numbering.",
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_mystery_of_the_fossils_19970621",
        name_en="Mystery of the Fossils",
        name_ja="化石の秘密",
        release_date="1997-06-21",
        expected_row_count=48,
        release_type="main_booster_expansion",
        prints_without_rarity_symbol="no",
        symbol_status_confidence="high",
        pokellector_path="/Mystery-of-the-Fossils-Expansion/",
        tcgdex_set_id="PMCG3",
        note="Japanese Fossil-equivalent booster rows.",
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_rocket_gang_19971121",
        name_en="Rocket Gang",
        name_ja="ロケット団",
        release_date="1997-11-21",
        expected_row_count=65,
        release_type="main_booster_expansion",
        prints_without_rarity_symbol="no",
        symbol_status_confidence="high",
        pokellector_path="/Rocket-Gang-Expansion/",
        tcgdex_set_id="PMCG4",
        note="Japanese Team Rocket-equivalent booster rows.",
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_expansion_sheet_1_blue_19980323",
        name_en="Expansion Sheet Series 1 Blue",
        name_ja="拡張シート 第1弾 青版",
        release_date="1998-03-23",
        expected_row_count=36,
        release_type="vending_sheet_release",
        prints_without_rarity_symbol="no",
        symbol_status_confidence="high",
        pokellector_path="/Vending-Series-Blue-Expansion/",
        note="Glossy Vending/Expansion Sheet cards; relevant to No Rarity trap disambiguation.",
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_expansion_sheet_2_red_19980617",
        name_en="Expansion Sheet Series 2 Red",
        name_ja="拡張シート 第2弾 赤版",
        release_date="1998-06-17",
        expected_row_count=36,
        release_type="vending_sheet_release",
        prints_without_rarity_symbol="no",
        symbol_status_confidence="high",
        pokellector_path="/Vending-Series-2-Red-Expansion/",
        note="Glossy Vending/Expansion Sheet cards; relevant to No Rarity trap disambiguation.",
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_expansion_sheet_3_green_19981124",
        name_en="Expansion Sheet Series 3 Green",
        name_ja="拡張シート 第3弾 緑版",
        release_date="1998-11-24",
        expected_row_count=53,
        release_type="vending_sheet_release",
        prints_without_rarity_symbol="no",
        symbol_status_confidence="high",
        pokellector_path="/Vending-Series-3-Green-Expansion/",
        note="Often described as 36 standard cards plus 17 special/non-standard cards; preserve count caveat.",
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_leaders_stadium_19981024",
        name_en="Leaders' Stadium",
        name_ja="リーダーズスタジアム",
        release_date="1998-10-24",
        expected_row_count=96,
        release_type="main_booster_expansion",
        prints_without_rarity_symbol="no",
        symbol_status_confidence="high",
        pokellector_path="/Leaders-Stadium-Expansion/",
        tcgdex_set_id="PMCG5",
        note="First Gym-era booster; deck cards without rarity symbols remain separate release-family identities.",
    ),
)


CARD_LIST_RE = re.compile(
    r'<a href="(?P<href>/[^"]+?-Card-(?P<number>\d+))"[^>]*title="(?P<title>[^"]+)"[^>]*>\s*'
    r'<img[^>]+data-src="(?P<thumb>[^"]+)"',
    re.S,
)


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha256_hex(value: Any) -> str:
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", "ignore")


def fetch_json(url: str) -> Any:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def strip_tags(value: str) -> str:
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    value = re.sub(r"<[^>]+>", " ", value)
    value = html.unescape(value)
    return re.sub(r"[ \t\r\f\v]+", " ", value).strip()


def text_field(page_text: str, label: str) -> str:
    match = re.search(rf"{re.escape(label)}:\s*([^\n#<]+)", page_text)
    return match.group(1).strip() if match else ""


def html_label_value(raw_html: str, label: str) -> str:
    match = re.search(
        rf"<strong>{re.escape(label)}:</strong>\s*(?:<a[^>]*>)?([^<]+)",
        raw_html,
        flags=re.I,
    )
    if match:
        return html.unescape(match.group(1)).strip()
    return ""


def meta_content(raw_html: str, name: str) -> str:
    patterns = [
        rf'<meta[^>]+property="{re.escape(name)}"[^>]+content="([^"]+)"',
        rf'<meta[^>]+itemprop="{re.escape(name)}"[^>]+content="([^"]+)"',
    ]
    for pattern in patterns:
        match = re.search(pattern, raw_html)
        if match:
            return html.unescape(match.group(1))
    return ""


def full_image_from_thumb(thumb_url: str) -> str:
    return thumb_url.replace(".thumb.png", ".png")


def parse_pokellector_set(config: ReleaseConfig) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    set_url = urllib.parse.urljoin(POKELLECTOR_BASE, config.pokellector_path)
    raw_set_html = fetch_text(set_url)
    set_hash = sha256_text(raw_set_html)
    cards: list[dict[str, Any]] = []

    for match in CARD_LIST_RE.finditer(raw_set_html):
        title = html.unescape(match.group("title"))
        local_id = f"{int(match.group('number')):03d}"
        card_url = urllib.parse.urljoin(POKELLECTOR_BASE, match.group("href"))
        thumb_url = html.unescape(match.group("thumb"))
        raw_card_html = fetch_text(card_url)
        card_hash = sha256_text(raw_card_html)
        page_text = strip_tags(raw_card_html)
        og_image = meta_content(raw_card_html, "og:image") or full_image_from_thumb(thumb_url)
        title_name = title.split(" - ")[0].strip()
        jpn = html_label_value(raw_card_html, "JPN") or text_field(page_text, "JPN")
        rarity = html_label_value(raw_card_html, "Rarity") or text_field(page_text, "Rarity")
        set_name = html_label_value(raw_card_html, "Set") or text_field(page_text, "Set")
        card_number = html_label_value(raw_card_html, "Card") or text_field(page_text, "Card")
        provider_id_match = re.search(r"<!-- card id #(\d+) -->", raw_card_html)
        provider_id = f"pokellector:{provider_id_match.group(1)}" if provider_id_match else ""
        card = {
            "source": {
                "card_page_sha256": card_hash,
                "card_page_url": card_url,
                "set_page_sha256": set_hash,
                "set_page_url": set_url,
            },
            "local_id": local_id,
            "name_en": title_name,
            "name_ja": jpn,
            "name_source_note": "Pokellector JPN field when present; otherwise blank pending Japanese-row source review.",
            "pokellector": {
                "card_number": card_number,
                "provider_id": provider_id,
                "provider_title": title,
                "rarity": rarity,
                "set_name": set_name,
                "thumb_url": thumb_url,
            },
            "image_provenance": {
                "allowed_use": ["manual_review", "catalog_reference_link"],
                "display_allowed": False,
                "exactness_basis": [
                    "same Pokellector Japanese release page",
                    "same card row number",
                    "same provider card page",
                ],
                "image_large": og_image,
                "image_role": "Exact external reference witness for this catalog row; rights not promoted to approved in-app display.",
                "image_small": thumb_url,
                "not_allowed_by_default": ["training", "seller evidence", "authentication proof"],
                "not_claiming": ["seller possession", "seller card match", "condition", "authenticity"],
                "provider_id": provider_id,
                "provider_title": title,
                "release_family_id": config.release_family_id,
                "retrieved_at": utc_now(),
                "rights_status": "external_reference_witness",
                "row_id": f"{config.release_family_id}:{local_id}",
                "source": "Pokellector",
                "source_page_url": card_url,
                "status": "exact_source_image",
                "verification_status": "source_labeled_exact_row_external_witness",
            },
        }
        cards.append(card)
        time.sleep(0.05)

    set_source = {
        "source": "Pokellector",
        "source_page_url": set_url,
        "source_page_sha256": set_hash,
        "cards_found": len(cards),
        "not_claiming": ["official source", "seller possession", "authenticity", "condition"],
    }
    return cards, set_source


def tcgdex_cards(set_id: str | None) -> tuple[dict[str, dict[str, Any]], dict[str, Any] | None]:
    if not set_id:
        return {}, None
    set_url = f"{TCGDEX_API_BASE}/sets/{urllib.parse.quote(set_id)}"
    set_payload = fetch_json(set_url)
    rows: dict[str, dict[str, Any]] = {}
    for brief in set_payload.get("cards", []):
        card_payload = fetch_json(f"{TCGDEX_API_BASE}/cards/{urllib.parse.quote(brief['id'])}")
        local_id = f"{int(str(card_payload.get('localId', '') or 0)):03d}"
        rows[local_id] = card_payload
        time.sleep(0.02)
    source = {
        "source": "TCGdex",
        "docs_url": "https://tcgdex.dev/rest",
        "set_api_url": set_url,
        "set_payload_hash": sha256_hex(set_payload),
        "cards_found": len(rows),
        "not_claiming": ["seller possession", "authenticity", "condition", "image availability"],
    }
    return rows, source


def pokemon_profile_from_tcgdex(card: dict[str, Any] | None) -> dict[str, Any]:
    if not card:
        return {
            "abilities": [],
            "attacks": [],
            "dex_id": [],
            "hp": None,
            "retreat": None,
            "stage": "",
            "types": [],
        }
    return {
        "abilities": card.get("abilities", []),
        "attacks": card.get("attacks", []),
        "dex_id": card.get("dexId", []),
        "hp": card.get("hp"),
        "retreat": card.get("retreat"),
        "stage": card.get("stage", ""),
        "types": card.get("types", []),
    }


def row_from_sources(config: ReleaseConfig, source_row: dict[str, Any], tcgdex_row: dict[str, Any] | None) -> dict[str, Any]:
    local_id = source_row["local_id"]
    row_id = f"{config.release_family_id}:{local_id}"
    tcgdex_id = tcgdex_row.get("id", "") if tcgdex_row else ""
    rarity = source_row["pokellector"].get("rarity") or (tcgdex_row or {}).get("rarity", "")
    category = (tcgdex_row or {}).get("category", "")
    variants = (tcgdex_row or {}).get("variants", {})
    image = dict(source_row["image_provenance"])
    image["row_id"] = row_id
    return {
        "schema": "marketplace.japanese_pre_english_card_row.v0.1",
        "row_id": row_id,
        "release_family_id": config.release_family_id,
        "local_id": local_id,
        "name_en": source_row["name_en"],
        "name_ja": source_row["name_ja"],
        "name_ja_status": "source_labeled" if source_row["name_ja"] else "missing_from_exact_source",
        "romaji": "",
        "name_source_note": source_row["name_source_note"],
        "category": category,
        "rarity_source": rarity,
        "holo_source": bool(variants.get("holo")),
        "pokemon_profile": pokemon_profile_from_tcgdex(tcgdex_row),
        "tcgdex": {
            "id": tcgdex_id,
            "set_id": config.tcgdex_set_id or "",
            "url": f"{TCGDEX_API_BASE}/cards/{tcgdex_id}" if tcgdex_id else "",
            "variants": variants,
            "image_field_present": bool((tcgdex_row or {}).get("image")),
        },
        "product_scope": {
            "authority": "Release-family catalog row derived from source-attributed Pokellector Japanese set page and TCGdex metadata where available.",
            "catalog_treatment": config.catalog_treatment,
            "counting_note": f"This row belongs to {config.name_en}; it is not a No Rarity Base claim.",
            "japanese_set_name": config.name_ja,
            "release_date": config.release_date,
            "release_type": config.release_type,
            "strict_release_member": True,
        },
        "symbol_status": {
            "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
            "confidence": config.symbol_status_confidence,
            "not_claiming": ["row-level physical truth", "seller-card symbol state", "seller possession"],
        },
        "image_provenance": image,
        "collector_texture": {
            "authority": "Collector texture only. It helps an agent search and explain the row; it is not transaction evidence.",
            "basis": ["Pokellector exact row page", "TCGdex row metadata when present", "Japanese pre-English release map"],
            "note": f"{source_row['name_en']} is cataloged here as row {int(local_id)} of {config.name_en}. Treat the image as a reference witness, then ask for seller evidence before any trade.",
            "signals": [config.name_en, local_id, rarity, config.release_date],
        },
        "information_audit": {
            "audit_scope": "Information architecture only. This row does not authenticate a physical card, condition, possession, or price.",
            "earns_keep": [
                {"field": "exact external reference image", "surface": "primary", "why": "The agent needs a row-specific visual reference, but rights/use remain bounded."},
                {"field": "release family and row id", "surface": "primary", "why": "These prevent cross-set image or name laundering."},
                {"field": "symbol status", "surface": "agent", "why": "Missing-symbol claims must be judged in their release-family context."},
            ],
            "agent_only": [
                {"field": "source page hashes", "why": "Useful for audit and re-fetch checks, noisy for the human glance."},
                {"field": "TCGdex details", "why": "Structured metadata helps agents, but is not seller evidence."},
            ],
        },
        "source_contacts": [
            source_row["source"],
            *(
                [
                    {
                        "source": "TCGdex",
                        "card_api_url": f"{TCGDEX_API_BASE}/cards/{tcgdex_id}",
                        "card_payload_hash": sha256_hex(tcgdex_row),
                        "not_claiming": ["image availability", "seller possession", "authenticity"],
                    }
                ]
                if tcgdex_row
                else []
            ),
        ],
        "not_claiming": ["seller possession", "authenticity", "condition truth", "price truth", "spendability"],
        "tags": [config.release_family_id, config.name_en, config.release_date, rarity, category],
    }


def build_release(config: ReleaseConfig) -> dict[str, Any]:
    pokellector_rows, pokellector_source = parse_pokellector_set(config)
    tcgdex_by_local_id, tcgdex_source = tcgdex_cards(config.tcgdex_set_id)
    rows = [row_from_sources(config, row, tcgdex_by_local_id.get(row["local_id"])) for row in pokellector_rows]
    release = {
        "schema": "marketplace.japanese_pre_english_release_catalog.v0.1",
        "generated_at": utc_now(),
        "release": {
            "release_family_id": config.release_family_id,
            "name_en": config.name_en,
            "name_ja": config.name_ja,
            "release_date": config.release_date,
            "date_precision": "exact",
            "release_type": config.release_type,
            "expected_row_count": config.expected_row_count,
            "count_confidence": "source_cross_checked" if config.tcgdex_set_id else "pokellector_source",
            "catalog_treatment": config.catalog_treatment,
            "note": config.note,
        },
        "symbol_status": {
            "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
            "confidence": config.symbol_status_confidence,
            "source": "data/pre-english-symbol-status.json and Japanese_Pre_English_Release_Map_v0.1.md",
            "not_claiming": ["row-level physical truth", "seller possession", "Base No Rarity claim"],
        },
        "sources": [pokellector_source, *([tcgdex_source] if tcgdex_source else [])],
        "cards": rows,
        "not_claiming": [
            "complete pre-English catalog",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "approved image display rights",
        ],
    }
    return release


def audit_release(release: dict[str, Any]) -> dict[str, Any]:
    cards = release.get("cards", [])
    expected = release.get("release", {}).get("expected_row_count")
    row_ids = [card.get("row_id") for card in cards]
    image_rows = [card for card in cards if card.get("image_provenance", {}).get("status") == "exact_source_image"]
    tcgdex_rows = [card for card in cards if card.get("tcgdex", {}).get("id")]
    name_ja_rows = [card for card in cards if card.get("name_ja_status") == "source_labeled"]
    failures: list[str] = []
    if len(cards) != expected:
        failures.append(f"row_count_mismatch expected={expected} actual={len(cards)}")
    if len(set(row_ids)) != len(row_ids):
        failures.append("duplicate_row_ids")
    for card in cards:
        image = card.get("image_provenance", {})
        if image.get("status") != "exact_source_image":
            failures.append(f"{card.get('row_id')}: image_not_exact_source")
        if "seller possession" not in card.get("not_claiming", []):
            failures.append(f"{card.get('row_id')}: missing_seller_possession_boundary")
        if image.get("rights_status") != "external_reference_witness":
            failures.append(f"{card.get('row_id')}: image_rights_status_not_external_witness")
        if image.get("display_allowed") is not False:
            failures.append(f"{card.get('row_id')}: image_display_not_fail_closed")
    return {
        "release_family_id": release.get("release", {}).get("release_family_id"),
        "row_count": len(cards),
        "expected_row_count": expected,
        "exact_image_witness_rows": len(image_rows),
        "source_labeled_japanese_name_rows": len(name_ja_rows),
        "missing_japanese_name_rows": len(cards) - len(name_ja_rows),
        "tcgdex_enriched_rows": len(tcgdex_rows),
        "passed": not failures,
        "failures": failures,
    }


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main() -> int:
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    manifests: list[dict[str, Any]] = []
    audit_rows: list[dict[str, Any]] = []
    for config in RELEASES:
        release = build_release(config)
        release_hash = sha256_hex(release)
        path = RELEASE_DIR / f"{config.release_family_id}.json"
        write_json(path, release)
        audit = audit_release(release)
        audit_rows.append(audit)
        manifests.append(
            {
                "release_family_id": config.release_family_id,
                "path": str(path.relative_to(ROOT)),
                "schema": release["schema"],
                "hash_algorithm": "sha256",
                "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
                "catalog_hash": release_hash,
                "row_count": len(release["cards"]),
                "expected_row_count": config.expected_row_count,
                "exact_image_witness_rows": audit["exact_image_witness_rows"],
                "tcgdex_set_id": config.tcgdex_set_id or "",
                "pokellector_source": urllib.parse.urljoin(POKELLECTOR_BASE, config.pokellector_path),
                "not_claiming": release["not_claiming"],
            }
        )

    bundle_preimage = {
        "schema": "marketplace.japanese_pre_english_catalog_bundle.v0.1",
        "release_hashes": {item["release_family_id"]: item["catalog_hash"] for item in manifests},
    }
    manifest = {
        "schema": "marketplace.japanese_pre_english_catalog_manifest.v0.1",
        "generated_at": utc_now(),
        "scope": {
            "boundary": "Pre-English Japanese Pokemon TCG release rows generated from exact release-family sources. Promo clusters and deck products remain separate pending split manifests.",
            "cutoff": "1999-01-09",
            "not_claiming": ["complete pre-English catalog", "promo row completion", "seller possession", "authenticity", "condition", "price truth"],
        },
        "bundle": {
            "hash_algorithm": "sha256",
            "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
            "bundle_hash": sha256_hex(bundle_preimage),
            "preimage": bundle_preimage,
        },
        "releases": manifests,
    }
    audit = {
        "schema": "marketplace.japanese_pre_english_catalog_audit.v0.1",
        "generated_at": utc_now(),
        "auditor": "deterministic_builder",
        "checks": [
            "row_count_matches_expected",
            "row_ids_unique",
            "image_witness_exact_source_status",
            "image_rights_fail_closed",
            "seller_possession_boundary_present",
        ],
        "release_results": audit_rows,
        "passed": all(row["passed"] for row in audit_rows),
        "not_claiming": ["multi-agent audit complete", "image rights approval", "physical authentication"],
    }
    write_json(MANIFEST_PATH, manifest)
    write_json(AUDIT_PATH, audit)
    print(f"wrote {len(manifests)} release catalogs")
    print(f"manifest={MANIFEST_PATH.relative_to(ROOT)}")
    print(f"audit_passed={audit['passed']}")
    for row in audit_rows:
        print(
            f"{row['release_family_id']}: rows={row['row_count']}/{row['expected_row_count']} "
            f"images={row['exact_image_witness_rows']} tcgdex={row['tcgdex_enriched_rows']} passed={row['passed']}"
        )
    return 0 if audit["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
