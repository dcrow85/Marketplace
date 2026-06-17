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
BULBAPEDIA_BASE = "https://bulbapedia.bulbagarden.net"
BULBAGARDEN_ARCHIVES_BASE = "https://archives.bulbagarden.net"
POKUMON_BASE = "https://pokumon.com"
POKECARDEX_DATA_KEY = b"oe61R0RgVTJm9omokoKuRem2N2GUbUZ8"
USER_AGENT = "MarketplaceCatalogBuilder/0.1 (+https://github.com/dcrow85/Marketplace)"

UPC_PRE_ENGLISH_PROMO_CONTEXT: dict[int, dict[str, str]] = {
    1: {"promo_family_id": "jp_promo_corocoro_first_19961015", "date_label": "1996-10-15", "date_source": "source_comment"},
    4: {"promo_family_id": "jp_promo_how_to_play_book_19961130", "date_label": "1996-11-30", "date_source": "source_comment"},
    5: {"promo_family_id": "jp_promo_corocoro_early_1997", "date_label": "1997-01-15", "date_source": "source_comment"},
    6: {"promo_family_id": "jp_promo_accessory_book_199705_199706", "date_label": "1997-05-02", "date_source": "source_comment"},
    7: {"promo_family_id": "jp_promo_corocoro_early_1997", "date_label": "1997-05-15", "date_source": "source_comment"},
    8: {"promo_family_id": "jp_promo_accessory_book_199705_199706", "date_label": "1997-05-20", "date_source": "source_comment"},
    9: {"promo_family_id": "jp_promo_accessory_book_199705_199706", "date_label": "1997-05-20", "date_source": "source_comment"},
    10: {"promo_family_id": "jp_promo_accessory_book_199705_199706", "date_label": "1997-06-13", "date_source": "source_comment"},
    11: {"promo_family_id": "jp_promo_first_official_tournament_199706", "date_label": "1997-06-14 to 1997-06-15", "date_source": "release_map"},
    12: {"promo_family_id": "jp_promo_first_official_tournament_199706", "date_label": "1997-06-14 to 1997-06-15", "date_source": "release_map"},
    13: {"promo_family_id": "jp_promo_first_official_tournament_199706", "date_label": "1997-06-14 to 1997-06-15", "date_source": "release_map"},
    14: {"promo_family_id": "jp_promo_jr_east_stamp_rally_199708", "date_label": "1997-08-09 to 1997-08-17", "date_source": "source_comment"},
    16: {"promo_family_id": "jp_promo_corocoro_early_1997", "date_label": "1997-08-15", "date_source": "source_comment"},
    17: {"promo_family_id": "jp_promo_corocoro_early_1997", "date_label": "1997-08-15", "date_source": "source_comment"},
    18: {"promo_family_id": "jp_promo_toyota_auto_199710_199712", "date_label": "1997-10 to 1997-12", "date_source": "source_comment"},
    19: {"promo_family_id": "jp_promo_toyota_auto_199710_199712", "date_label": "1997-10 to 1997-12", "date_source": "source_comment"},
    20: {"promo_family_id": "jp_promo_corocoro_early_1997", "date_label": "1997-10-15", "date_source": "source_comment"},
    21: {"promo_family_id": "jp_promo_lizardon_mega_battle_199711_199804", "date_label": "1997-11-08 to 1998-04-26", "date_source": "release_map"},
    22: {"promo_family_id": "jp_promo_lizardon_mega_battle_199711_199804", "date_label": "1997-11-08 to 1998-04-26", "date_source": "release_map"},
    23: {"promo_family_id": "jp_promo_lizardon_mega_battle_199711_199804", "date_label": "1997-11-08 to 1998-04-26", "date_source": "release_map"},
    24: {"promo_family_id": "jp_promo_fan_club_vol3_19971118", "date_label": "1997-11-18", "date_source": "source_comment"},
    25: {"promo_family_id": "jp_promo_whf_special_limited_expansion_sheet_199712", "date_label": "1997-12 to 1998-02", "date_source": "release_map"},
    26: {"promo_family_id": "jp_promo_whf_special_limited_expansion_sheet_199712", "date_label": "1997-12 to 1998-02", "date_source": "release_map"},
    27: {"promo_family_id": "jp_promo_whf_special_limited_expansion_sheet_199712", "date_label": "1997-12 to 1998-02", "date_source": "release_map"},
    28: {"promo_family_id": "jp_promo_n64_double_get_199712", "date_label": "1997-12-10 to 1998-01-31", "date_source": "source_comment"},
    29: {"promo_family_id": "jp_promo_n64_double_get_199712", "date_label": "1997-12-10 to 1998-01-31", "date_source": "source_comment"},
    30: {"promo_family_id": "jp_promo_corocoro_19971215", "date_label": "1997-12-15", "date_source": "source_comment"},
    32: {"promo_family_id": "jp_promo_pokemon_illustrator_contests_1997_1998", "date_label": "1997-12 / 1998", "date_source": "release_map"},
    33: {"promo_family_id": "jp_promo_trade_please_199802", "date_label": "1998-02-10 to 1998-07-31", "date_source": "source_comment"},
    34: {"promo_family_id": "jp_promo_trade_please_199802", "date_label": "1998-02-10 to 1998-07-31", "date_source": "source_comment"},
    35: {"promo_family_id": "jp_promo_trade_please_199802", "date_label": "1998-02-10 to 1998-07-31", "date_source": "source_comment"},
    36: {"promo_family_id": "jp_promo_trade_please_199802", "date_label": "1998-02-10 to 1998-07-31", "date_source": "source_comment"},
    37: {"promo_family_id": "jp_promo_corocoro_1998", "date_label": "1998-02-15", "date_source": "source_comment"},
    38: {"promo_family_id": "jp_promo_corocoro_1998", "date_label": "1998-02-15", "date_source": "source_comment"},
    39: {"promo_family_id": "jp_promo_corocoro_1998", "date_label": "1998-03-15", "date_source": "source_comment"},
    40: {"promo_family_id": "jp_promo_corocoro_1998", "date_label": "1998-03-15", "date_source": "source_comment"},
    41: {"promo_family_id": "jp_promo_corocoro_1998", "date_label": "1998-03-15", "date_source": "source_comment"},
    42: {"promo_family_id": "jp_promo_garura_parent_child_199805", "date_label": "1998-05", "date_source": "release_map"},
    43: {"promo_family_id": "jp_promo_garura_parent_child_199805", "date_label": "1998-05", "date_source": "release_map"},
    45: {"promo_family_id": "jp_promo_kamex_mega_battle_199807", "date_label": "1998-07 to 1998-08", "date_source": "release_map"},
    46: {"promo_family_id": "jp_promo_kamex_mega_battle_199807", "date_label": "1998-07 to 1998-08", "date_source": "release_map"},
    47: {"promo_family_id": "jp_promo_kamex_mega_battle_199807", "date_label": "1998-07 to 1998-08", "date_source": "release_map"},
    48: {"promo_family_id": "jp_promo_kamex_mega_battle_199807", "date_label": "1998-07 to 1998-08", "date_source": "release_map"},
    49: {"promo_family_id": "jp_promo_corocoro_1998", "date_label": "1998-07-15", "date_source": "source_comment"},
    50: {"promo_family_id": "jp_promo_corocoro_1998", "date_label": "1998-07-15", "date_source": "source_comment"},
    51: {"promo_family_id": "jp_promo_ana_get_in_a_jet_199811", "date_label": "1998-11-01 to 1999-01-31", "date_source": "release_map"},
    52: {"promo_family_id": "jp_promo_ana_get_in_a_jet_199811", "date_label": "1998-11-01 to 1999-01-31", "date_source": "release_map"},
    53: {"promo_family_id": "jp_promo_all_card_calendar_19981105", "date_label": "1998-11-05", "date_source": "source_comment"},
    54: {"promo_family_id": "jp_promo_latest_how_to_play_book_19981113", "date_label": "1998-11-13", "date_source": "source_comment"},
    55: {"promo_family_id": "jp_promo_latest_how_to_play_book_19981113", "date_label": "1998-11-13", "date_source": "source_comment"},
    56: {"promo_family_id": "jp_promo_corocoro_1998", "date_label": "1998-11-15", "date_source": "source_comment"},
    57: {"promo_family_id": "jp_promo_corocoro_1998", "date_label": "1998-11-15", "date_source": "source_comment"},
    58: {"promo_family_id": "jp_promo_corocoro_1998", "date_label": "1998-11-15", "date_source": "source_comment"},
    59: {"promo_family_id": "jp_promo_corocoro_1998", "date_label": "1998-11-15", "date_source": "source_comment"},
    60: {"promo_family_id": "jp_promo_card_gb_dragonite_19981218", "date_label": "1998-12-18", "date_source": "release_map"},
}


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
    date_precision: str = "exact"
    tcgdex_set_id: str | None = None
    source_adapter: str = "pokellector"
    pokecardex_code: str | None = None
    parent_release_family_id: str = ""
    product_card_count: int = 0
    product_count_basis: str = ""
    strict_release_member: bool = True
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
    ReleaseConfig(
        release_family_id="jp_promo_unnumbered_pre_english_source_slice_19961015_19990131",
        name_en="Unnumbered Promotional Pre-English Source Slice",
        name_ja="プロモーションカード（英語版以前・出典抽出）",
        release_date="1996-10-15/1999-01-31",
        expected_row_count=len(UPC_PRE_ENGLISH_PROMO_CONTEXT),
        release_type="promo_aggregate_filtered_rows",
        prints_without_rarity_symbol="mixed",
        symbol_status_confidence="medium",
        pokellector_path="",
        date_precision="source_slice_mixed_range_crosses_cutoff",
        source_adapter="pokecardex_upc_pre_english",
        pokecardex_code="UPC",
        product_count_basis="Filtered aggregate from PokéCardex Unnumbered Promotional rows. Rows are included only when the source comment or release map places the distribution before English Base Set.",
        strict_release_member=False,
        catalog_treatment="Promo target",
        note="Aggregate source slice for pre-English unnumbered promos. It preserves UPC source sort and promo-family context; later work may split these into smaller per-distribution release catalogs.",
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_pokemon_song_best_collection_19990101",
        name_en="Pokemon Song Best Collection",
        name_ja="ポケモンソング・ベストコレクション",
        release_date="1999-01-01",
        expected_row_count=11,
        release_type="promo_cd_source_rows",
        prints_without_rarity_symbol="mixed",
        symbol_status_confidence="medium",
        pokellector_path="",
        date_precision="exact_source_claim",
        source_adapter="bulbapedia_song_best",
        product_card_count=11,
        product_count_basis=(
            "Bulbapedia membership page lists eleven included cards. Pokumon exposes seven "
            "matching Song Best event rows; the remaining four image witnesses are selected "
            "from Bulbapedia card-page image/reprint fields."
        ),
        catalog_treatment="Promo target",
        note=(
            "CD insert/reprint promo slice. Treat as official TCG promo/reprint context, not as "
            "a Base No Rarity claim; English Pikachu carries a row-level language caveat."
        ),
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


def adapter_source_name(adapter: str) -> str:
    if adapter == "pokecardex":
        return "PokéCardex"
    if adapter == "bulbapedia_song_best":
        return "Bulbapedia/Pokumon"
    return "Pokellector"


def source_url_for_config(config: ReleaseConfig) -> str:
    if config.source_adapter == "pokellector":
        return urllib.parse.urljoin(POKELLECTOR_BASE, config.pokellector_path)
    if config.source_adapter in {"pokecardex", "pokecardex_upc_pre_english"}:
        return f"{POKECARDEX_BASE}/en/series/jp/{config.pokecardex_code}"
    if config.source_adapter == "bulbapedia_song_best":
        return f"{BULBAPEDIA_BASE}/wiki/Pok%C3%A9mon_Song_Best_Collection"
    raise ValueError(f"unknown source_adapter={config.source_adapter}")


def wiki_raw_field(raw_text: str, key: str) -> str:
    match = re.search(rf"\|\s*{re.escape(key)}\s*=\s*([^\n]+)", raw_text)
    if not match:
        return ""
    return match.group(1).strip().rstrip("|").strip()


def clean_wiki_text(value: str) -> str:
    value = re.sub(r"\{\{TCG\|([^|}]+)\|([^}]+)\}\}", r"\2", value)
    value = re.sub(r"\{\{TCG\|([^}]+)\}\}", r"\1", value)
    value = re.sub(r"\{\{wp\|([^|}]+)\|([^}]+)\}\}", r"\2", value)
    value = re.sub(r"\{\{wp\|([^}]+)\}\}", r"\1", value)
    value = re.sub(r"\[\[([^]|]+)\|([^]]+)\]\]", r"\2", value)
    value = re.sub(r"\[\[([^]]+)\]\]", r"\1", value)
    value = re.sub(r"<br\s*/?>", " ", value, flags=re.I)
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def archive_redirect_url(filename: str) -> str:
    request = urllib.request.Request(
        f"{BULBAGARDEN_ARCHIVES_BASE}/wiki/Special:Redirect/file/{urllib.parse.quote(filename)}",
        headers={"User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.url


def follow_bulbapedia_raw_redirect(raw_text: str) -> tuple[str, str]:
    redirect = re.match(r"#REDIRECT\s*\[\[([^]]+)\]\]", raw_text, flags=re.I)
    if not redirect:
        return raw_text, ""
    target = redirect.group(1)
    target_url = f"{BULBAPEDIA_BASE}/wiki/{urllib.parse.quote(target.replace(' ', '_'))}?action=raw"
    return fetch_text(target_url), target_url


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
        promo_context = UPC_PRE_ENGLISH_PROMO_CONTEXT.get(sort_value) if config.source_adapter == "pokecardex_upc_pre_english" else None
        if config.source_adapter == "pokecardex_upc_pre_english" and not promo_context:
            continue
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
                    "comment": card.get("comment", ""),
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
                        "same provider image path convention derived from the public site bundle",
                        "not a per-row image field inside the decrypted source payload",
                    ],
                    "image_large": image_url,
                    "image_role": "Provider-path-derived external reference witness for this catalog row; rights not promoted to approved in-app display.",
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
                    "status": "provider_path_reference_image",
                    "verification_status": "provider_path_derived_external_reference_witness",
                },
                "pokecardex_profile": {
                    "comment": card.get("comment", ""),
                    "dex_id": card.get("id_pokedex_list") or ([card.get("id_pokedex")] if card.get("id_pokedex") else []),
                    "illustrator": card.get("nom_illustrateur", ""),
                    "name_card_de": card.get("name_card_de", ""),
                    "name_card_fr": card.get("name_card_fr", ""),
                    "versions": card.get("versions", []),
                },
                **({"promo_context": promo_context} if promo_context else {}),
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


def parse_pokumon_event_tiles(event_url: str) -> tuple[dict[str, dict[str, str]], str]:
    raw_html = fetch_text(event_url)
    tiles: dict[str, dict[str, str]] = {}
    pattern = re.compile(
        r'<a class="cl-element-featured_media__anchor" href="(?P<href>[^"]+)" title="(?P<title>[^"]+)">'
        r'.*?data-src="(?P<image>[^"]+)"',
        re.S,
    )
    for match in pattern.finditer(raw_html):
        title = html.unescape(match.group("title"))
        name = re.split(r"\s{2,}\(", title, maxsplit=1)[0].strip()
        tiles[name.lower()] = {
            "card_page_url": html.unescape(match.group("href")),
            "event_page_url": event_url,
            "image_url": html.unescape(match.group("image")),
            "title": title,
        }
    return tiles, sha256_hex(tiles)


def parse_bulbapedia_song_best(config: ReleaseConfig) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    event_url = source_url_for_config(config)
    event_raw_url = f"{event_url}?action=raw"
    raw_event_html = fetch_text(event_url)
    raw_event_wiki = fetch_text(event_raw_url)
    event_wiki_hash = sha256_text(raw_event_wiki)
    section_start = raw_event_html.find("All of the cards included")
    section_end = raw_event_html.find("Related_articles")
    if section_start == -1 or section_end == -1:
        raise ValueError("missing Bulbapedia Song Best card-list section")
    card_section = raw_event_html[section_start:section_end]
    event_section_hash = sha256_text(card_section)
    list_pattern = re.compile(
        r'<li><a href="(?P<href>[^"]+)"[^>]*title="(?P<title>[^"]+)">(?P<name>[^<]+)</a>(?P<tail>[^<]*)</li>'
    )
    pokumon_event_url = f"{POKUMON_BASE}/release_event/pokemon-song-best-collection-cd/"
    pokumon_tiles, pokumon_hash = parse_pokumon_event_tiles(pokumon_event_url)
    cards: list[dict[str, Any]] = []
    for index, match in enumerate(list_pattern.finditer(card_section), start=1):
        name_en = html.unescape(match.group("name")).strip()
        card_page_url = urllib.parse.urljoin(BULBAPEDIA_BASE, html.unescape(match.group("href")))
        card_raw_url = f"{card_page_url}?action=raw"
        raw_card_wiki_initial = fetch_text(card_raw_url)
        raw_card_wiki, redirect_raw_url = follow_bulbapedia_raw_redirect(raw_card_wiki_initial)
        card_wiki_hash = sha256_text(raw_card_wiki)
        title = html.unescape(match.group("title"))
        language_note = "English card included in Japanese CD product." if "English" in match.group("tail") else ""
        provider_id = f"bulbapedia:{title}"
        cardname = clean_wiki_text(wiki_raw_field(raw_card_wiki, "cardname")) or name_en
        jname = clean_wiki_text(wiki_raw_field(raw_card_wiki, "jname"))
        jtrans = clean_wiki_text(wiki_raw_field(raw_card_wiki, "jtrans"))
        card_type = clean_wiki_text(wiki_raw_field(raw_card_wiki, "type"))
        hp = clean_wiki_text(wiki_raw_field(raw_card_wiki, "hp"))
        level = clean_wiki_text(wiki_raw_field(raw_card_wiki, "level"))
        illustrator = ""
        caption = clean_wiki_text(wiki_raw_field(raw_card_wiki, "caption"))
        illustrator_match = re.search(r"Illus\.\s+([^|]+)$", caption)
        if illustrator_match:
            illustrator = illustrator_match.group(1).strip()

        image_source = "Bulbagarden Archives via Bulbapedia"
        image_status_note = "Bulbapedia card page image/reprint field"
        exactness_basis = [
            "same Bulbapedia Song Best Collection membership list",
            "same Bulbapedia card page",
            "same card-page image or reprint field selected for the CD/included print",
        ]
        pokumon_tile = pokumon_tiles.get(name_en.lower())
        if pokumon_tile:
            image_url = pokumon_tile["image_url"]
            image_source = "Pokumon"
            image_status_note = "Pokumon Song Best release-event tile"
            exactness_basis = [
                "same Pokumon Song Best Collection CD event page",
                "same event-page card tile",
                "same event-page image path",
                "cross-listed by Bulbapedia Song Best membership list",
            ]
            source_page_url = pokumon_tile["event_page_url"]
        else:
            image_filename = ""
            if name_en in {"Venusaur", "Charizard", "Blastoise"}:
                for field_name in ("reprint1", "reprint2", "reprint3", "reprint4"):
                    candidate = wiki_raw_field(raw_card_wiki, field_name)
                    if "BestCDPromo" in candidate:
                        image_filename = candidate
                        break
            elif language_note:
                image_filename = wiki_raw_field(raw_card_wiki, "image")
                image_status_note = "Bulbapedia card page default image for the English Base Set print included in the CD"
                exactness_basis = [
                    "same Bulbapedia Song Best Collection membership list",
                    "same Bulbapedia card page",
                    "English inclusion caveat present on the Song Best membership row",
                    "default English Base Set image selected because the CD row is explicitly the English card",
                ]
            if not image_filename:
                raise ValueError(f"missing exact image source for {name_en}")
            image_url = archive_redirect_url(image_filename)
            source_page_url = card_page_url

        local_id = f"{index:03d}"
        title_with_context = f"{name_en} - Pokemon Song Best Collection CD #{index}"
        rarity_context = (
            "English Base Set card included in Japanese CD product; apply language caveat"
            if language_note
            else "Unnumbered Promotional / CD included reprint"
        )
        source_contact = {
            "card_page_sha256": card_wiki_hash,
            "card_page_url": card_page_url,
            "card_raw_url": redirect_raw_url or card_raw_url,
            "membership_section_sha256": event_section_hash,
            "membership_raw_sha256": event_wiki_hash,
            "membership_page_url": event_url,
            "source": "Bulbapedia",
            "not_claiming": ["official source", "seller possession", "authenticity", "condition"],
        }
        cards.append(
            {
                "source": source_contact,
                "local_id": local_id,
                "name_en": cardname,
                "name_ja": jname,
                "romaji_source": jtrans,
                "name_source_note": "Bulbapedia card-page infobox fields for English, Japanese, and transliteration.",
                "provider_row": {
                    "adapter": "bulbapedia_song_best",
                    "bulbapedia_card_page_url": card_page_url,
                    "bulbapedia_card_raw_url": redirect_raw_url or card_raw_url,
                    "bulbapedia_title": title,
                    "provider_id": provider_id,
                    "provider_title": title_with_context,
                    "source_index": index,
                    "language_note": language_note,
                    "pokumon_card_page_url": pokumon_tile.get("card_page_url", "") if pokumon_tile else "",
                    "pokumon_event_tile_sha256": pokumon_hash if pokumon_tile else "",
                    "pokumon_title": pokumon_tile.get("title", "") if pokumon_tile else "",
                    "rarity": rarity_context,
                    "sort": index,
                },
                "image_provenance": {
                    "allowed_use": ["manual_review", "catalog_reference_link"],
                    "display_allowed": False,
                    "exactness_basis": exactness_basis,
                    "image_large": image_url,
                    "image_role": "Exact external reference witness for this Song Best catalog row; rights not promoted to approved in-app display.",
                    "image_small": image_url,
                    "image_status_note": image_status_note,
                    "not_allowed_by_default": ["training", "seller evidence", "authentication proof"],
                    "not_claiming": ["seller possession", "seller card match", "condition", "authenticity"],
                    "provider_id": provider_id,
                    "provider_title": title_with_context,
                    "release_family_id": config.release_family_id,
                    "rights_status": "external_reference_witness",
                    "row_id": f"{config.release_family_id}:{local_id}",
                    "source": image_source,
                    "source_page_url": source_page_url,
                    "status": "exact_source_image",
                    "verification_status": "source_labeled_exact_row_external_witness",
                },
                "card_profile": {
                    "hp": hp or None,
                    "illustrator": illustrator,
                    "jtrans": jtrans,
                    "level": level or None,
                    "types": [card_type] if card_type else [],
                },
                "promo_context": {
                    "date_label": config.release_date,
                    "date_source": "Bulbapedia Song Best Collection page",
                    "distribution_comment": (
                        "Bulbapedia states all cards included in the CD were previously released "
                        "through other Japanese promotions; this row records CD inclusion, not first distribution."
                    ),
                    "promo_family_id": "jp_promo_song_best_collection_19990101",
                    "source_sort": index,
                    "not_claiming": ["official copy count", "seller possession", "authenticity", "condition"],
                },
                "print_context": {
                    "authority": "Bulbapedia Song Best membership and card-page print context.",
                    "included_in_cd": True,
                    "language_caveat": language_note,
                    "prior_print_note": (
                        "Previously released through another promotion; the CD inclusion row is a product-context row."
                    ),
                    "not_claiming": ["first distribution", "seller possession", "authenticity", "condition"],
                },
                **(
                    {
                        "symbol_status_override": {
                            "confidence": "medium",
                            "prints_without_rarity_symbol": "no",
                            "row_caveat": language_note,
                            "source_mode": "row_language_caveat_override",
                        }
                    }
                    if language_note
                    else {}
                ),
            }
        )
        time.sleep(0.05)
    source = {
        "source": "Bulbapedia",
        "source_page_url": event_url,
        "source_page_selected_section_sha256": event_section_hash,
        "source_raw_url": event_raw_url,
        "source_raw_sha256": event_wiki_hash,
        "cross_check_source": "Pokumon",
        "cross_check_source_page_url": pokumon_event_url,
        "cross_check_source_selected_tiles_sha256": pokumon_hash,
        "cards_found": len(cards),
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
    source_name = adapter_source_name(adapter)
    rarity = provider_row.get("rarity") or (tcgdex_row or {}).get("rarity", "")
    category = source_row.get("category") or (tcgdex_row or {}).get("category", "")
    variants = (tcgdex_row or {}).get("variants", {})
    image = dict(source_row["image_provenance"])
    image["row_id"] = row_id
    source_profile = source_row.get("pokecardex_profile") or source_row.get("card_profile", {})
    profile = pokemon_profile_from_tcgdex(tcgdex_row)
    if not tcgdex_row and source_profile:
        profile["dex_id"] = source_profile.get("dex_id", [])
        profile["hp"] = source_profile.get("hp")
        profile["level"] = source_profile.get("level")
        profile["types"] = source_profile.get("types", [])
    illustrator_name = source_profile.get("illustrator") or provider_row.get("illustrator") or ""
    illustrator_display = f"Illus. {illustrator_name}" if illustrator_name else ""
    symbol_source_release_id = config.symbol_status_source_release_family_id or config.release_family_id
    symbol_source_mode = "inherited_from_parent_release_family" if symbol_source_release_id != config.release_family_id else "direct_release_family"
    promo_context = source_row.get("promo_context", {})
    return {
        "schema": "marketplace.japanese_pre_english_card_row.v0.1",
        "row_id": row_id,
        "release_family_id": config.release_family_id,
        "local_id": local_id,
        "name_en": source_row["name_en"],
        "name_ja": source_row["name_ja"],
        "name_ja_status": "source_labeled" if source_row["name_ja"] else "missing_from_exact_source",
        "romaji": source_row.get("romaji_source", ""),
        "name_source_note": source_row["name_source_note"],
        "category": category or ("Pokemon" if source_profile.get("dex_id") or source_profile.get("types") else ""),
        "promo_context": {
            "authority": "Promo distribution context derived from the source row comment and/or the Japanese pre-English release map. It is catalog scope, not proof of a physical card.",
            "date_label": promo_context.get("date_label", ""),
            "date_source": promo_context.get("date_source", ""),
            "distribution_comment": promo_context.get("distribution_comment") or provider_row.get("comment", ""),
            "promo_family_id": promo_context.get("promo_family_id", ""),
            "source_sort": provider_row.get("sort", ""),
            "not_claiming": ["official copy count", "seller possession", "authenticity", "condition"],
        } if promo_context else {},
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
            "date_precision": config.date_precision,
            "release_type": config.release_type,
            "strict_release_member": config.strict_release_member,
            "membership_note": (
                "Synthetic source slice member; use promo_context for the narrower distribution family."
                if not config.strict_release_member
                else "Strict release-family catalog row."
            ),
            "unique_catalog_row_count": config.expected_row_count,
        },
        "symbol_status": {
            "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
            "confidence": config.symbol_status_confidence,
            "scope": "release_context_not_row_fact",
            "source_mode": symbol_source_mode,
            "source_release_family_id": symbol_source_release_id,
            **source_row.get("symbol_status_override", {}),
            **({"row_caveat": source_row.get("print_context", {}).get("language_caveat")} if source_row.get("print_context", {}).get("language_caveat") else {}),
            "not_claiming": ["row-level physical truth", "seller-card symbol state", "seller possession"],
        },
        **({"print_context": source_row["print_context"]} if source_row.get("print_context") else {}),
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
    elif config.source_adapter in {"pokecardex", "pokecardex_upc_pre_english"}:
        source_rows, primary_source = parse_pokecardex_set(config)
    elif config.source_adapter == "bulbapedia_song_best":
        source_rows, primary_source = parse_bulbapedia_song_best(config)
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
            "date_precision": config.date_precision,
            "release_type": config.release_type,
            "expected_row_count": config.expected_row_count,
            "count_confidence": count_confidence,
            "parent_release_family_id": config.parent_release_family_id,
            "product_card_count": config.product_card_count,
            "product_count_basis": config.product_count_basis,
            "strict_release_member": config.strict_release_member,
            "unique_catalog_row_count": config.expected_row_count,
            "catalog_treatment": config.catalog_treatment,
            "note": config.note,
        },
        "symbol_status": {
            "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
            "confidence": config.symbol_status_confidence,
            "source": "data/pre-english-symbol-status.json and Japanese_Pre_English_Release_Map_v0.1.md",
            "scope": "release_context_not_row_fact",
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
    release_meta = release.get("release", {})
    release_sources = release.get("sources", [])
    primary_source = release_sources[0] if release_sources else {}
    expected = release_meta.get("expected_row_count")
    release_type = release_meta.get("release_type", "")
    row_ids = [card.get("row_id") for card in cards]
    image_witness_statuses = {"exact_source_image", "provider_path_reference_image"}
    image_rows = [card for card in cards if card.get("image_provenance", {}).get("status") in image_witness_statuses]
    exact_source_image_rows = [card for card in cards if card.get("image_provenance", {}).get("status") == "exact_source_image"]
    provider_path_reference_image_rows = [
        card for card in cards if card.get("image_provenance", {}).get("status") == "provider_path_reference_image"
    ]
    tcgdex_rows = [card for card in cards if card.get("tcgdex", {}).get("id")]
    name_ja_rows = [card for card in cards if card.get("name_ja_status") == "source_labeled"]
    promo_context_rows = [card for card in cards if card.get("promo_context", {}).get("promo_family_id")]
    failures: list[str] = []
    if len(cards) != expected:
        failures.append(f"row_count_mismatch expected={expected} actual={len(cards)}")
    if len(set(row_ids)) != len(row_ids):
        failures.append("duplicate_row_ids")
    if release_type == "promo_aggregate_filtered_rows" and release_meta.get("strict_release_member") is not False:
        failures.append("promo_aggregate_strict_release_member_overclaim")
    if release_type == "promo_cd_source_rows" and release_meta.get("strict_release_member") is not True:
        failures.append("promo_cd_rows_must_be_strict_release_members")
    for card in cards:
        image = card.get("image_provenance", {})
        provider_row = card.get("provider_row", {})
        if image.get("status") not in image_witness_statuses:
            failures.append(f"{card.get('row_id')}: image_not_reference_witness")
        if "seller possession" not in card.get("not_claiming", []):
            failures.append(f"{card.get('row_id')}: missing_seller_possession_boundary")
        if image.get("rights_status") != "external_reference_witness":
            failures.append(f"{card.get('row_id')}: image_rights_status_not_external_witness")
        if image.get("display_allowed") is not False:
            failures.append(f"{card.get('row_id')}: image_display_not_fail_closed")
        if provider_row.get("adapter") == "pokecardex":
            expected_url = (
                f"{POKECARDEX_BASE}/assets/images/sets_jp/"
                f"{provider_row.get('series_code')}/{provider_row.get('sort')}.jpg"
            )
            if image.get("image_large") != expected_url or image.get("image_small") != expected_url:
                failures.append(f"{card.get('row_id')}: pokecardex_image_url_not_provider_path")
            if image.get("status") != "provider_path_reference_image":
                failures.append(f"{card.get('row_id')}: pokecardex_image_status_overclaims_exact_source")
            if image.get("verification_status") != "provider_path_derived_external_reference_witness":
                failures.append(f"{card.get('row_id')}: pokecardex_image_verification_status_overclaims")
            pokecardex_contacts = [
                contact
                for contact in card.get("source_contacts", [])
                if contact.get("source") == "PokéCardex"
            ]
            if not any(
                contact.get("card_data_hash") and contact.get("encrypted_page_sha256")
                for contact in pokecardex_contacts
            ):
                failures.append(f"{card.get('row_id')}: missing_pokecardex_source_hash")
        if card.get("symbol_status", {}).get("scope") != "release_context_not_row_fact":
            failures.append(f"{card.get('row_id')}: missing_symbol_status_scope")
        if release_type == "promo_aggregate_filtered_rows":
            promo_context = card.get("promo_context", {})
            source_sort = provider_row.get("sort")
            expected_context = UPC_PRE_ENGLISH_PROMO_CONTEXT.get(int(source_sort)) if source_sort is not None else None
            if not expected_context:
                failures.append(f"{card.get('row_id')}: promo_context_sort_not_in_selection_table")
            elif {
                "promo_family_id": promo_context.get("promo_family_id"),
                "date_label": promo_context.get("date_label"),
                "date_source": promo_context.get("date_source"),
            } != {
                "promo_family_id": expected_context.get("promo_family_id"),
                "date_label": expected_context.get("date_label"),
                "date_source": expected_context.get("date_source"),
            }:
                failures.append(f"{card.get('row_id')}: promo_context_mismatch")
            if promo_context.get("source_sort") != source_sort:
                failures.append(f"{card.get('row_id')}: promo_source_sort_mismatch")
            if source_sort is None:
                failures.append(f"{card.get('row_id')}: missing_source_sort")
            elif card.get("local_id") != f"{int(source_sort):03d}":
                failures.append(f"{card.get('row_id')}: local_id_not_source_sort")
            if card.get("product_scope", {}).get("strict_release_member") is not False:
                failures.append(f"{card.get('row_id')}: promo_row_strict_release_member_overclaim")
        if release_type == "promo_cd_source_rows":
            promo_context = card.get("promo_context", {})
            source_sort = provider_row.get("sort")
            source_contacts = card.get("source_contacts", [])
            bulbapedia_contacts = [
                contact
                for contact in source_contacts
                if contact.get("source") == "Bulbapedia"
            ]
            if provider_row.get("adapter") != "bulbapedia_song_best":
                failures.append(f"{card.get('row_id')}: song_best_wrong_adapter")
            if not promo_context.get("promo_family_id"):
                failures.append(f"{card.get('row_id')}: song_best_missing_promo_context")
            if promo_context.get("source_sort") != source_sort:
                failures.append(f"{card.get('row_id')}: song_best_source_sort_mismatch")
            try:
                expected_local_id = f"{int(source_sort):03d}"
            except (TypeError, ValueError):
                expected_local_id = ""
            if card.get("local_id") != expected_local_id:
                failures.append(f"{card.get('row_id')}: song_best_local_id_sort_mismatch")
            if card.get("romaji") == "":
                failures.append(f"{card.get('row_id')}: song_best_missing_romaji")
            if not card.get("print_context", {}).get("included_in_cd"):
                failures.append(f"{card.get('row_id')}: song_best_missing_print_context")
            if image.get("row_id") != card.get("row_id"):
                failures.append(f"{card.get('row_id')}: song_best_image_row_id_mismatch")
            if image.get("release_family_id") != card.get("release_family_id"):
                failures.append(f"{card.get('row_id')}: song_best_image_release_family_mismatch")
            if image.get("provider_id") != provider_row.get("provider_id"):
                failures.append(f"{card.get('row_id')}: song_best_image_provider_id_mismatch")
            if image.get("provider_title") != provider_row.get("provider_title"):
                failures.append(f"{card.get('row_id')}: song_best_image_provider_title_mismatch")
            if not image.get("image_large") or image.get("image_large") != image.get("image_small"):
                failures.append(f"{card.get('row_id')}: song_best_image_url_missing_or_split")
            if not image.get("source_page_url"):
                failures.append(f"{card.get('row_id')}: song_best_image_missing_source_page_url")
            if card.get("image_provenance", {}).get("status") != "exact_source_image":
                failures.append(f"{card.get('row_id')}: song_best_image_not_exact_source")
            if card.get("image_provenance", {}).get("source") not in {"Pokumon", "Bulbagarden Archives via Bulbapedia"}:
                failures.append(f"{card.get('row_id')}: song_best_unexpected_image_source")
            if image.get("source") == "Pokumon":
                if image.get("source_page_url") != primary_source.get("cross_check_source_page_url"):
                    failures.append(f"{card.get('row_id')}: song_best_pokumon_source_page_mismatch")
                if not provider_row.get("pokumon_card_page_url"):
                    failures.append(f"{card.get('row_id')}: song_best_missing_pokumon_card_page")
                if provider_row.get("pokumon_event_tile_sha256") != primary_source.get("cross_check_source_selected_tiles_sha256"):
                    failures.append(f"{card.get('row_id')}: song_best_pokumon_tile_hash_mismatch")
            if image.get("source") == "Bulbagarden Archives via Bulbapedia":
                if image.get("source_page_url") != provider_row.get("bulbapedia_card_page_url"):
                    failures.append(f"{card.get('row_id')}: song_best_bulbapedia_image_source_page_mismatch")
                if not image.get("image_large", "").startswith(f"{BULBAGARDEN_ARCHIVES_BASE}/media/upload/"):
                    failures.append(f"{card.get('row_id')}: song_best_bulbagarden_image_url_unexpected")
            if not any(
                contact.get("card_page_url") == provider_row.get("bulbapedia_card_page_url")
                and contact.get("membership_section_sha256") == primary_source.get("source_page_selected_section_sha256")
                and contact.get("membership_raw_sha256") == primary_source.get("source_raw_sha256")
                and contact.get("card_page_sha256")
                for contact in bulbapedia_contacts
            ):
                failures.append(f"{card.get('row_id')}: song_best_missing_bulbapedia_source_contact")
            if card.get("product_scope", {}).get("strict_release_member") is not True:
                failures.append(f"{card.get('row_id')}: song_best_row_not_strict_release_member")
    if release_type == "promo_cd_source_rows":
        if release.get("symbol_status", {}).get("prints_without_rarity_symbol") != "mixed":
            failures.append("song_best_release_symbol_status_should_be_mixed")
        language_caveats = [
            card
            for card in cards
            if card.get("print_context", {}).get("language_caveat")
        ]
        language_symbol_no = [
            card
            for card in language_caveats
            if card.get("symbol_status", {}).get("prints_without_rarity_symbol") == "no"
            and card.get("symbol_status", {}).get("source_mode") == "row_language_caveat_override"
        ]
        if len(promo_context_rows) != len(cards):
            failures.append("song_best_promo_context_not_complete")
        if len(language_caveats) != 1:
            failures.append(f"song_best_expected_one_language_caveat actual={len(language_caveats)}")
        if len(language_symbol_no) != 1:
            failures.append("song_best_language_caveat_symbol_override_missing")
    return {
        "release_family_id": release_meta.get("release_family_id"),
        "row_count": len(cards),
        "expected_row_count": expected,
        "exact_image_witness_rows": len(image_rows),
        "exact_source_image_rows": len(exact_source_image_rows),
        "provider_path_reference_image_rows": len(provider_path_reference_image_rows),
        "promo_context_rows": len(promo_context_rows),
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
        source_url = source_url_for_config(config)
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
                "exact_source_image_rows": audit["exact_source_image_rows"],
                "provider_path_reference_image_rows": audit["provider_path_reference_image_rows"],
                "source_labeled_japanese_name_rows": audit["source_labeled_japanese_name_rows"],
                "missing_japanese_name_rows": audit["missing_japanese_name_rows"],
                "promo_context_rows": audit["promo_context_rows"],
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
        "exact_source_image_rows": sum(item["exact_source_image_rows"] for item in manifests),
        "provider_path_reference_image_rows": sum(item["provider_path_reference_image_rows"] for item in manifests),
        "hash_algorithm": "sha256",
        "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
        "source_contact_policy": "Images are bounded external reference witnesses and are not approved display/training/seller evidence by default; provenance status distinguishes exact source images from provider-path-derived reference images.",
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
        "exact_source_image_rows": sum(row["exact_source_image_rows"] for row in audit_rows),
        "provider_path_reference_image_rows": sum(row["provider_path_reference_image_rows"] for row in audit_rows),
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
