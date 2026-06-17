#!/usr/bin/env python3
"""Build source-attributed Japanese pre-English release catalogs.

This expands the No Rarity catalog pattern without diluting it. The output is a
set of release-family catalogs plus a manifest. Images are kept as exact external
reference witnesses only: same release page, same row number, same provider row.
They are not seller evidence, authenticity, possession, condition, or training
data.
"""

from __future__ import annotations

import base64
import hashlib
import html
import json
import re
import subprocess
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
POKECARDEX_BASE = "https://www.pokecardex.com"
POKECARDEX_DATA_KEY = b"oe61R0RgVTJm9omokoKuRem2N2GUbUZ8"
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
    source_adapter: str = "pokellector"
    pokecardex_code: str | None = None
    parent_release_family_id: str = ""
    product_card_count: int = 0
    product_count_basis: str = ""
    symbol_status_source_release_family_id: str = ""
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
    ReleaseConfig(
        release_family_id="jp_tcg_nivi_city_gym_brock_19980426",
        name_en="Nivi City Gym / Brock",
        name_ja="ニビシティジム タケシ",
        release_date="1998-04-26",
        expected_row_count=25,
        release_type="gym_standard_deck_unique_rows",
        prints_without_rarity_symbol="yes",
        symbol_status_confidence="medium-high",
        pokellector_path="",
        source_adapter="pokecardex",
        pokecardex_code="NCGYM",
        product_card_count=64,
        product_count_basis="60-card deck plus 4 additional cards; source catalog exposes unique rows only.",
        note="PokéCardex exposes 25 unique catalog rows. The release-map product count remains 60-card deck plus 4 additional cards.",
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_hanada_city_gym_misty_19980426",
        name_en="Hanada City Gym / Misty",
        name_ja="ハナダシティジム カスミ",
        release_date="1998-04-26",
        expected_row_count=24,
        release_type="gym_standard_deck_unique_rows",
        prints_without_rarity_symbol="yes",
        symbol_status_confidence="medium-high",
        pokellector_path="",
        source_adapter="pokecardex",
        pokecardex_code="HCGYM",
        product_card_count=64,
        product_count_basis="60-card deck plus 4 additional cards; source catalog exposes unique rows only.",
        note="PokéCardex exposes 24 unique catalog rows. The release-map product count remains 60-card deck plus 4 additional cards.",
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_kuchiba_city_gym_lt_surge_19980725",
        name_en="Kuchiba City Gym / Lt. Surge",
        name_ja="クチバシティジム マチス",
        release_date="1998-07-25",
        expected_row_count=25,
        release_type="gym_standard_deck_unique_rows",
        prints_without_rarity_symbol="yes",
        symbol_status_confidence="medium-high",
        pokellector_path="",
        source_adapter="pokecardex",
        pokecardex_code="KCGYM",
        product_card_count=64,
        product_count_basis="60-card deck plus 4 additional cards; source catalog exposes unique rows only.",
        note="PokéCardex exposes 25 unique catalog rows. The release-map product count remains 60-card deck plus 4 additional cards.",
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_tamamushi_city_gym_erika_19980725",
        name_en="Tamamushi City Gym / Erika",
        name_ja="タマムシシティジム エリカ",
        release_date="1998-07-25",
        expected_row_count=28,
        release_type="gym_standard_deck_unique_rows",
        prints_without_rarity_symbol="yes",
        symbol_status_confidence="medium-high",
        pokellector_path="",
        source_adapter="pokecardex",
        pokecardex_code="TCGYM",
        product_card_count=64,
        product_count_basis="60-card deck plus 4 additional cards; source catalog exposes unique rows only.",
        note="PokéCardex exposes 28 unique catalog rows. The release-map product count remains 60-card deck plus 4 additional cards.",
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_quick_starter_gift_set_red_deck_19981204",
        name_en="Quick Starter Gift Set Red Deck",
        name_ja="クイックスターターギフト 赤デッキ",
        release_date="1998-12-04",
        expected_row_count=32,
        release_type="deck_kit_unique_rows",
        prints_without_rarity_symbol="yes",
        symbol_status_confidence="high",
        pokellector_path="",
        source_adapter="pokecardex",
        pokecardex_code="QSGSR",
        parent_release_family_id="jp_tcg_quick_starter_gift_set_19981204",
        product_card_count=60,
        product_count_basis="Child catalog for one 60-card deck inside the two-deck Quick Starter Gift Set parent product.",
        symbol_status_source_release_family_id="jp_tcg_quick_starter_gift_set_19981204",
        note="Child catalog for the red deck inside Quick Starter Gift Set. Parent product is two 60-card decks plus extras; this source exposes 32 unique rows.",
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_quick_starter_gift_set_green_deck_19981204",
        name_en="Quick Starter Gift Set Green Deck",
        name_ja="クイックスターターギフト 緑デッキ",
        release_date="1998-12-04",
        expected_row_count=32,
        release_type="deck_kit_unique_rows",
        prints_without_rarity_symbol="yes",
        symbol_status_confidence="high",
        pokellector_path="",
        source_adapter="pokecardex",
        pokecardex_code="QSGSG",
        parent_release_family_id="jp_tcg_quick_starter_gift_set_19981204",
        product_card_count=60,
        product_count_basis="Child catalog for one 60-card deck inside the two-deck Quick Starter Gift Set parent product.",
        symbol_status_source_release_family_id="jp_tcg_quick_starter_gift_set_19981204",
        note="Child catalog for the green deck inside Quick Starter Gift Set. Parent product is two 60-card decks plus extras; this source exposes 32 unique rows.",
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


def decrypt_pokecardex_payload(raw_html: str) -> dict[str, Any]:
    match = re.search(r"window\.__INITIAL_DATA_ENCRYPTED__\s*=\s*(\{.*?\});", raw_html, re.S)
    if not match:
        raise ValueError("missing PokéCardex encrypted initial data")
    envelope = json.loads(match.group(1))
    iv = base64.b64decode(envelope["iv"])
    ciphertext = base64.b64decode(envelope["data"])
    result = subprocess.run(
        [
            "openssl",
            "enc",
            "-aes-256-cbc",
            "-d",
            "-K",
            POKECARDEX_DATA_KEY.hex(),
            "-iv",
            iv.hex(),
        ],
        input=ciphertext,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )
    return json.loads(result.stdout.decode("utf-8"))


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
            "provider_row": {
                "adapter": "pokellector",
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


def parse_pokecardex_set(config: ReleaseConfig) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    if not config.pokecardex_code:
        raise ValueError(f"{config.release_family_id} missing pokecardex_code")
    set_url = f"{POKECARDEX_BASE}/en/series/jp/{urllib.parse.quote(config.pokecardex_code)}"
    raw_html = fetch_text(set_url)
    page_hash = sha256_text(raw_html)
    payload = decrypt_pokecardex_payload(raw_html)
    series = payload["currentSeries"]
    rarity_lookup = {item["id_rarete"]: item["nom_rarete"] for item in payload.get("raretes", [])}
    cards: list[dict[str, Any]] = []
    for card in sorted(payload.get("cartes", []), key=lambda item: int(item.get("sort", 0))):
        sort_value = int(card.get("sort", 0))
        local_id = f"{sort_value:03d}"
        image_url = f"{POKECARDEX_BASE}/assets/images/sets_jp/{config.pokecardex_code}/{sort_value}.jpg"
        provider_id = f"pokecardex:{card.get('id_card')}"
        title = f"{card.get('name_card_en', '')} - {series.get('fullName', config.name_en)} #{sort_value}"
        source_contact = {
            "card_data_hash": sha256_hex(card),
            "encrypted_page_sha256": page_hash,
            "series_code": config.pokecardex_code,
            "source": "PokéCardex",
            "source_page_url": set_url,
            "not_claiming": ["official source", "seller possession", "authenticity", "condition"],
        }
        cards.append(
            {
                "source": source_contact,
                "local_id": local_id,
                "name_en": card.get("name_card_en", ""),
                "name_ja": "",
                "name_source_note": "PokéCardex payload provides English/French/German names for this page; Japanese print name remains pending a separate source.",
                "provider_row": {
                    "adapter": "pokecardex",
                    "cardmarket_url": card.get("cardmarket_url"),
                    "id_card": card.get("id_card"),
                    "id_tcgplayer": card.get("id_tcgplayer"),
                    "illustrator": card.get("nom_illustrateur", ""),
                    "provider_id": provider_id,
                    "provider_title": title,
                    "rarity": rarity_lookup.get(card.get("id_rarete"), ""),
                    "series_code": config.pokecardex_code,
                    "series_name": series.get("fullName", config.name_en),
                    "sort": sort_value,
                    "versions": card.get("versions", []),
                },
                "image_provenance": {
                    "allowed_use": ["manual_review", "catalog_reference_link"],
                    "display_allowed": False,
                    "exactness_basis": [
                        "same PokéCardex Japanese series page",
                        "same decrypted source row order",
                        "same provider image path derived by the site bundle",
                    ],
                    "image_large": image_url,
                    "image_role": "Exact external reference witness for this catalog row; rights not promoted to approved in-app display.",
                    "image_small": image_url,
                    "not_allowed_by_default": ["training", "seller evidence", "authentication proof"],
                    "not_claiming": ["seller possession", "seller card match", "condition", "authenticity"],
                    "provider_id": provider_id,
                    "provider_title": title,
                    "release_family_id": config.release_family_id,
                    "rights_status": "external_reference_witness",
                    "row_id": f"{config.release_family_id}:{local_id}",
                    "source": "PokéCardex",
                    "source_page_url": set_url,
                    "status": "exact_source_image",
                    "verification_status": "source_payload_exact_row_external_witness",
                },
                "pokecardex_profile": {
                    "dex_id": card.get("id_pokedex_list") or ([card.get("id_pokedex")] if card.get("id_pokedex") else []),
                    "illustrator": card.get("nom_illustrateur", ""),
                    "name_card_de": card.get("name_card_de", ""),
                    "name_card_fr": card.get("name_card_fr", ""),
                    "versions": card.get("versions", []),
                },
            }
        )
    source = {
        "source": "PokéCardex",
        "source_page_url": set_url,
        "encrypted_page_sha256": page_hash,
        "payload_hash": sha256_hex(payload),
        "cards_found": len(cards),
        "series": {
            "id": series.get("id"),
            "shortName": series.get("shortName"),
            "fullName": series.get("fullName"),
            "releaseDateFR": series.get("releaseDateFR"),
            "totalCards": series.get("totalCards"),
        },
        "not_claiming": ["official source", "seller possession", "authenticity", "condition"],
    }
    return cards, source


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
    provider_row = source_row.get("provider_row", source_row.get("pokellector", {}))
    adapter = provider_row.get("adapter", "")
    source_name = "PokéCardex" if adapter == "pokecardex" else "Pokellector"
    rarity = provider_row.get("rarity") or (tcgdex_row or {}).get("rarity", "")
    category = (tcgdex_row or {}).get("category", "")
    variants = (tcgdex_row or {}).get("variants", {})
    image = dict(source_row["image_provenance"])
    image["row_id"] = row_id
    source_profile = source_row.get("pokecardex_profile", {})
    profile = pokemon_profile_from_tcgdex(tcgdex_row)
    if not tcgdex_row and source_profile:
        profile["dex_id"] = source_profile.get("dex_id", [])
    illustrator_name = source_profile.get("illustrator") or provider_row.get("illustrator") or ""
    illustrator_display = f"Illus. {illustrator_name}" if illustrator_name else ""
    symbol_source_release_id = config.symbol_status_source_release_family_id or config.release_family_id
    symbol_source_mode = "inherited_from_parent_release_family" if symbol_source_release_id != config.release_family_id else "direct_release_family"
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
        "category": category or ("Pokemon" if source_profile.get("dex_id") else ""),
        "rarity_source": rarity,
        "holo_source": bool(variants.get("holo")),
        "pokemon_profile": profile,
        "illustrator": {
            "authority": "Source provider metadata only. Useful for catalog texture, not direct print-name or authenticity proof.",
            "display": illustrator_display,
            "name": illustrator_name,
            "not_claiming": ["seller possession", "authenticity", "condition", "Japanese print authority"],
            "source": adapter,
        },
        "tcgdex": {
            "id": tcgdex_id,
            "set_id": config.tcgdex_set_id or "",
            "url": f"{TCGDEX_API_BASE}/cards/{tcgdex_id}" if tcgdex_id else "",
            "variants": variants,
            "image_field_present": bool((tcgdex_row or {}).get("image")),
        },
        "product_scope": {
            "authority": f"Release-family catalog row derived from source-attributed {source_name} Japanese set page and TCGdex metadata where available.",
            "catalog_treatment": config.catalog_treatment,
            "counting_note": f"This row belongs to {config.name_en}; it is not a No Rarity Base claim.",
            "japanese_set_name": config.name_ja,
            "parent_release_family_id": config.parent_release_family_id,
            "product_card_count": config.product_card_count,
            "product_count_basis": config.product_count_basis,
            "release_date": config.release_date,
            "release_type": config.release_type,
            "strict_release_member": True,
            "unique_catalog_row_count": config.expected_row_count,
        },
        "symbol_status": {
            "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
            "confidence": config.symbol_status_confidence,
            "source_mode": symbol_source_mode,
            "source_release_family_id": symbol_source_release_id,
            "not_claiming": ["row-level physical truth", "seller-card symbol state", "seller possession"],
        },
        "image_provenance": image,
        "collector_texture": {
            "authority": "Collector texture only. It helps an agent search and explain the row; it is not transaction evidence.",
            "basis": [f"{source_name} exact row page", "TCGdex row metadata when present", "Japanese pre-English release map"],
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
        "provider_row": provider_row,
        "not_claiming": ["seller possession", "authenticity", "condition truth", "price truth", "spendability"],
        "tags": [config.release_family_id, config.name_en, config.release_date, rarity, category],
    }


def build_release(config: ReleaseConfig) -> dict[str, Any]:
    if config.source_adapter == "pokellector":
        source_rows, primary_source = parse_pokellector_set(config)
    elif config.source_adapter == "pokecardex":
        source_rows, primary_source = parse_pokecardex_set(config)
    else:
        raise ValueError(f"unknown source_adapter={config.source_adapter}")
    tcgdex_by_local_id, tcgdex_source = tcgdex_cards(config.tcgdex_set_id)
    rows = [row_from_sources(config, row, tcgdex_by_local_id.get(row["local_id"])) for row in source_rows]
    count_confidence = (
        "source_cross_checked"
        if config.tcgdex_set_id
        else f"{config.source_adapter}_source"
    )
    symbol_source_release_id = config.symbol_status_source_release_family_id or config.release_family_id
    symbol_source_mode = "inherited_from_parent_release_family" if symbol_source_release_id != config.release_family_id else "direct_release_family"
    release = {
        "schema": "marketplace.japanese_pre_english_release_catalog.v0.1",
        "release": {
            "release_family_id": config.release_family_id,
            "name_en": config.name_en,
            "name_ja": config.name_ja,
            "release_date": config.release_date,
            "date_precision": "exact",
            "release_type": config.release_type,
            "expected_row_count": config.expected_row_count,
            "count_confidence": count_confidence,
            "parent_release_family_id": config.parent_release_family_id,
            "product_card_count": config.product_card_count,
            "product_count_basis": config.product_count_basis,
            "unique_catalog_row_count": config.expected_row_count,
            "catalog_treatment": config.catalog_treatment,
            "note": config.note,
        },
        "symbol_status": {
            "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
            "confidence": config.symbol_status_confidence,
            "source": "data/pre-english-symbol-status.json and Japanese_Pre_English_Release_Map_v0.1.md",
            "source_mode": symbol_source_mode,
            "source_release_family_id": symbol_source_release_id,
            "not_claiming": ["row-level physical truth", "seller possession", "Base No Rarity claim"],
        },
        "sources": [primary_source, *([tcgdex_source] if tcgdex_source else [])],
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
    stamp = utc_now()
    for config in RELEASES:
        release = build_release(config)
        release_hash = sha256_hex(release)
        path = RELEASE_DIR / f"{config.release_family_id}.json"
        write_json(path, release)
        audit = audit_release(release)
        audit_rows.append(audit)
        source_url = (
            urllib.parse.urljoin(POKELLECTOR_BASE, config.pokellector_path)
            if config.source_adapter == "pokellector"
            else f"{POKECARDEX_BASE}/en/series/jp/{config.pokecardex_code}"
        )
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
                "source_adapter": config.source_adapter,
                "source_url": source_url,
            }
        )

    manifest = {
        "schema": "marketplace.japanese_pre_english_manifest.v0.1",
        "generated_at": stamp,
        "release_count": len(manifests),
        "total_rows": sum(item["row_count"] for item in manifests),
        "exact_image_witness_rows": sum(item["exact_image_witness_rows"] for item in manifests),
        "hash_algorithm": "sha256",
        "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
        "source_contact_policy": "Images are exact external reference witnesses only and are not approved display/training/seller evidence by default.",
        "releases": manifests,
        "not_claiming": [
            "complete pre-English catalog",
            "approved image rights",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
        ],
    }
    audit = {
        "schema": "marketplace.japanese_pre_english_catalog_audit.v0.1",
        "generated_at": stamp,
        "passed": all(row["passed"] for row in audit_rows),
        "release_count": len(audit_rows),
        "total_rows": sum(row["row_count"] for row in audit_rows),
        "exact_image_witness_rows": sum(row["exact_image_witness_rows"] for row in audit_rows),
        "tcgdex_enriched_rows": sum(row["tcgdex_enriched_rows"] for row in audit_rows),
        "release_audits": audit_rows,
        "not_claiming": [
            "multi-agent audit complete",
            "complete pre-English release coverage",
            "row-level physical authentication",
            "image rights approval",
        ],
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
