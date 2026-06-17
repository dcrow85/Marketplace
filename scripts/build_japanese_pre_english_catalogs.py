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
import copy
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
NO_RARITY_CATALOG_PATH = ROOT / "data" / "no-rarity-base-set.json"
NO_RARITY_POLICY_PATH = ROOT / "data" / "no-rarity-catalog-policy.json"
NO_RARITY_MANIFEST_PATH = ROOT / "data" / "no-rarity-catalog-manifest.json"
RELEASE_MAP_PATH = ROOT / "Japanese_Pre_English_Release_Map_v0.1.md"
PRE_ENGLISH_SYMBOL_STATUS_PATH = ROOT / "data" / "pre-english-symbol-status.json"
GIFT_PACK_PRODUCT_SOURCE_URL = (
    "https://wiki.pokemonwiki.com/wiki/"
    "%E3%83%9D%E3%82%B1%E3%83%83%E3%83%88%E3%83%A2%E3%83%B3"
    "%E3%82%B9%E3%82%BF%E3%83%BC%E3%82%AB%E3%83%BC%E3%83%89"
    "%E3%82%B2%E3%83%BC%E3%83%A0_%E3%82%AE%E3%83%95%E3%83%88"
    "%E3%83%91%E3%83%83%E3%82%AF"
)
GIFT_PACK_SOURCE_SNAPSHOT_PATH = (
    OUT_DIR
    / "source-snapshots"
    / "pokemonwiki_gift_pack_19961212_selected_lines.json"
)
TEAM_ROCKET_GIFT_PACK_PRODUCT_SOURCE_URL = (
    "https://wiki.pokemonwiki.com/wiki/"
    "%E3%83%9D%E3%82%B1%E3%83%83%E3%83%88%E3%83%A2%E3%83%B3"
    "%E3%82%B9%E3%82%BF%E3%83%BC%E3%82%AB%E3%83%BC%E3%83%89"
    "%E3%82%B2%E3%83%BC%E3%83%A0_%E3%83%AD%E3%82%B1%E3%83%83%E3%83%88"
    "%E5%9B%A3%E3%82%AE%E3%83%95%E3%83%88%E3%83%91%E3%83%83%E3%82%AF"
)
TEAM_ROCKET_GIFT_PACK_SOURCE_SNAPSHOT_PATH = (
    OUT_DIR
    / "source-snapshots"
    / "pokemonwiki_team_rocket_gift_pack_19971219_selected_lines.json"
)
EARLY_1996_PROMO_SOURCE_SNAPSHOT_PATH = (
    OUT_DIR
    / "source-snapshots"
    / "bulbapedia_early_1996_promos_selected_lines.json"
)
LIZARDON_MEGA_BATTLE_SOURCE_SNAPSHOT_PATH = (
    OUT_DIR
    / "source-snapshots"
    / "pokumon_lizardon_mega_battle_selected_lines.json"
)
JR_EAST_STAMP_RALLY_SOURCE_SNAPSHOT_PATH = (
    OUT_DIR
    / "source-snapshots"
    / "pokumon_jr_east_stamp_rally_1997_selected_lines.json"
)
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

UPC_BULBAPEDIA_CARD_PAGES: dict[int, str] = {
    60: f"{BULBAPEDIA_BASE}/wiki/Dragonite_%28Pok%C3%A9mon_Card_GB_promo%29",
}

PROMO_FAMILY_CHILD_SPECS: dict[str, dict[str, Any]] = {
    "jp_promo_corocoro_first_19961015": {
        "source_snapshot": "early_1996_promos",
        "expected_source_card_count": 2,
        "expected_cards": ["Pikachu [Glossy, Ken Sugimori]", "Jigglypuff [Glossy]"],
        "modeled_source_sorts": [1],
        "unmodeled_expected_cards": ["Jigglypuff [Glossy]"],
        "expected_snapshot_texts": [
            "Pikachu [Glossy]",
            "Jigglypuff [Glossy]",
            "October 15, 1996",
            "Pikachu [Non-glossy]",
            "Jigglypuff [Non-glossy]",
            "November 30, 1996",
        ],
        "source_gap_reason": (
            "Bulbapedia lists glossy Pikachu and glossy Jigglypuff for CoroCoro Comic "
            "November 1996, but the current PokéCardex UPC aggregate source-pins only "
            "Pikachu to this exact family."
        ),
    },
    "jp_promo_how_to_play_book_19961130": {
        "source_snapshot": "early_1996_promos",
        "expected_source_card_count": 2,
        "expected_cards": ["Pikachu [Non-glossy, Keiji Kinebuchi]", "Jigglypuff [Non-glossy]"],
        "modeled_source_sorts": [4],
        "unmodeled_expected_cards": ["Pikachu [Non-glossy, Keiji Kinebuchi]"],
        "expected_snapshot_texts": [
            "Pikachu [Glossy]",
            "Jigglypuff [Glossy]",
            "October 15, 1996",
            "Pikachu [Non-glossy]",
            "Jigglypuff [Non-glossy]",
            "November 30, 1996",
        ],
        "source_gap_reason": (
            "Bulbapedia lists non-glossy Pikachu and non-glossy Jigglypuff for Easily "
            "Understand How to Play Pokemon Cards, but the current PokéCardex UPC "
            "aggregate source-pins only Jigglypuff to this exact family."
        ),
    },
    "jp_promo_lizardon_mega_battle_199711_199804": {
        "source_snapshot": "lizardon_mega_battle",
        "expected_source_card_count": 3,
        "expected_cards": [
            "No.1 Trainer (Regional Lizardon Mega Battle 1997)",
            "No.2 Trainer (Regional Lizardon Mega Battle 1997)",
            "No.3 Trainer (Regional Lizardon Mega Battle 1997)",
        ],
        "modeled_source_sorts": [21, 22, 23],
        "unmodeled_expected_cards": [],
        "expected_snapshot_texts": [
            "Lizardon (Charizard) Mega Battle Tournaments",
            "April 26, 1998",
            "November 8, 1997 to February 15, 1998",
            "No.1 Trainer (Regional Lizardon Mega Battle 1997)",
            "No.2 Trainer (Regional Lizardon Mega Battle 1997)",
            "No.3 Trainer (Regional Lizardon Mega Battle 1997)",
        ],
        "source_gap_reason": (
            "Current PokéCardex UPC aggregate source-pins the three regional Lizardon Mega "
            "Battle trophy rows. The source slice models card identities only; it does not "
            "model plaque variants, award copies, or every physical award context."
        ),
    },
    "jp_promo_jr_east_stamp_rally_199708": {
        "source_snapshot": "jr_east_stamp_rally_1997",
        "expected_source_card_count": 2,
        "expected_cards": [
            "Surfing Pikachu (JR Train Rally 1997)",
            "Mew (JR Train Rally 1997)",
        ],
        "modeled_source_sorts": [14],
        "unmodeled_expected_cards": ["Mew (JR Train Rally 1997)"],
        "expected_snapshot_texts": [
            "Japan Rail East Stamp Rally 1997",
            "issued 2 of the earliest Pokemon promo cards",
            "Surfing Pikachu (JR Train Rally 1997)",
            "Mew (JR Train Rally 1997)",
            "August 9 – 17, 1997",
            "booklet containing 2 promo cards",
            "matte texture instead of glossy",
            "Mt. Fuji and a Japan Rail train",
        ],
        "source_gap_reason": (
            "Pokumon documents a two-card JR East Stamp Rally booklet with Surfing Pikachu "
            "and Mew, but the current PokéCardex UPC aggregate source-pins only Surfing "
            "Pikachu to this exact family. The Mew booklet card remains an explicit source gap."
        ),
    },
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
    pokecardex_sort_filter: tuple[int, ...] = ()


RELEASES: tuple[ReleaseConfig, ...] = (
    ReleaseConfig(
        release_family_id="jp_tcg_expansion_pack_19961020",
        name_en="Expansion Pack / No Rarity Lab",
        name_ja="第1弾 拡張パック",
        release_date="1996-10-20",
        expected_row_count=102,
        release_type="launch_family_no_rarity_lab_rows",
        prints_without_rarity_symbol="mixed",
        symbol_status_confidence="high",
        pokellector_path="",
        tcgdex_set_id="PMCG1",
        source_adapter="no_rarity_lab_catalog",
        product_card_count=96,
        product_count_basis=(
            "Strict Japanese First Expansion Pack booster checklist is 96 cards. "
            "This bridge preserves the existing 102-row No Rarity lab by carrying "
            "six Starter Pack basic Energy caveats as broader launch-family rows."
        ),
        strict_release_member=False,
        catalog_treatment="Catalog target",
        note=(
            "Bridge from the local No Rarity lab catalog into the Japanese pre-English "
            "release catalog format. PMCG1 ids remain protocol anchors; Japanese booster "
            "order and Basic Energy caveats remain row-level scope fields."
        ),
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_starter_pack_19961020",
        name_en="Series 1 Starter Pack possible-content pool",
        name_ja="第1弾スターターパック",
        release_date="1996-10-20",
        expected_row_count=102,
        release_type="launch_starter_pack_possible_rows",
        prints_without_rarity_symbol="mixed",
        symbol_status_confidence="medium-high",
        pokellector_path="",
        tcgdex_set_id="PMCG1",
        source_adapter="starter_pack_possible_rollup",
        product_card_count=60,
        product_count_basis=(
            "Source-format context: Series 1 Starter Pack is treated as a 60-card "
            "deck/product associated with 30 random Expansion Pack-card slots plus "
            "30 Basic Energy slots. This catalog preserves the 102-row possible-content "
            "pool and is not a guarantee of any sealed unit's contents, collation, "
            "distribution, or fixed deck composition."
        ),
        strict_release_member=False,
        catalog_treatment="Possible-content context",
        note=(
            "Deterministic possible-content rollup over the launch Expansion Pack / "
            "No Rarity lab rows. Use this to reason about Starter Pack source-family "
            "ambiguity, not to assert the contents of a sealed deck."
        ),
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_gift_pack_19961212",
        name_en="Gift Pack product-component context",
        name_ja="ギフトパック",
        release_date="1996-12-12",
        expected_row_count=204,
        release_type="gift_pack_starter_component_possible_rows",
        prints_without_rarity_symbol="unverified",
        symbol_status_confidence="medium",
        pokellector_path="",
        tcgdex_set_id="PMCG1",
        source_adapter="gift_pack_product_rollup",
        product_card_count=122,
        product_count_basis=(
            "Source-format context: the Gift Pack product is documented as 122 cards "
            "with two Series 1 Starter Pack products plus two special-card slots. This "
            "catalog models only the two Starter Pack possible-content components as "
            "2 x 102 possible rows and leaves the two special-card slots unresolved "
            "until their promo identities are source-pinned; it is not a guarantee of "
            "sealed-unit contents, collation, distribution, or fixed deck composition."
        ),
        strict_release_member=False,
        catalog_treatment="Product-component context",
        note=(
            "Component rollup over two Series 1 Starter Pack possible-content lanes. "
            "This is useful for Gift Pack source-family reasoning, not a fixed Gift Pack "
            "deck list and not a complete row model for the two special-card slots."
        ),
    ),
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
        release_family_id="jp_tcg_team_rocket_gift_pack_19971219",
        name_en="Team Rocket Gift Pack deck-component context",
        name_ja="ロケット団ギフトパック",
        release_date="1997-12-19",
        expected_row_count=130,
        release_type="team_rocket_gift_pack_deck_component_possible_rows",
        prints_without_rarity_symbol="unverified",
        symbol_status_confidence="medium",
        pokellector_path="",
        tcgdex_set_id="PMCG4",
        source_adapter="team_rocket_gift_pack_product_rollup",
        product_card_count=120,
        product_count_basis=(
            "Source-format context: the Team Rocket Gift Pack product is documented as "
            "120 cards across two fixed 60-card decks made from Rocket Gang expansion "
            "cards. This catalog models unresolved deck-component candidate rows as "
            "2 x 65 Rocket Gang source rows because the fixed per-deck card list is not "
            "source-pinned here; it is not a guarantee of sealed-unit contents, "
            "per-deck counts, collation, distribution, or fixed deck composition."
        ),
        strict_release_member=False,
        catalog_treatment="Product-component context",
        note=(
            "Component rollup over two unresolved Team Rocket Gift Pack deck lanes. "
            "Use this for product-family reasoning until the actual fixed deck lists "
            "are source-pinned."
        ),
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
        note="Child catalog for the red deck inside Quick Starter Gift Set. Parent package contains two 60-card decks; this source exposes 32 unique rows for one deck.",
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
        note="Child catalog for the green deck inside Quick Starter Gift Set. Parent package contains two 60-card decks; this source exposes 32 unique rows for one deck.",
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_quick_starter_gift_set_19981204",
        name_en="Quick Starter Gift Set",
        name_ja="クイックスターターギフト",
        release_date="1998-12-04",
        expected_row_count=64,
        release_type="deck_kit_parent_rollup_rows",
        prints_without_rarity_symbol="yes",
        symbol_status_confidence="high",
        pokellector_path="",
        source_adapter="quick_starter_parent_rollup",
        product_card_count=120,
        product_count_basis=(
            "Parent product view over the two 60-card decks. Source catalogs expose 32 unique "
            "rows for the red deck and 32 unique rows for the green deck; this rollup preserves "
            "both child lanes rather than deduplicating by card name."
        ),
        strict_release_member=True,
        catalog_treatment="Catalog target",
        note=(
            "Parent Quick Starter Gift Set catalog derived from the source-backed red and green "
            "deck child catalogs. It is a product rollup, not a separate source page."
        ),
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
        release_family_id="jp_promo_corocoro_first_19961015",
        name_en="First CoroCoro glossy promos source slice",
        name_ja="月刊コロコロコミック1996年11月号プロモ",
        release_date="1996-10-15",
        expected_row_count=1,
        release_type="promo_family_child_rollup_rows",
        prints_without_rarity_symbol="yes",
        symbol_status_confidence="medium-high",
        pokellector_path="",
        source_adapter="promo_family_child_rollup",
        product_card_count=0,
        product_count_basis=(
            "Bulbapedia source snapshot lists two glossy CoroCoro Comic November 1996 "
            "promo entries. This child slice models only the current source-pinned "
            "PokéCardex UPC row for this exact family and records the missing counterpart "
            "as a source gap; it is not a complete family checklist."
        ),
        strict_release_member=False,
        catalog_treatment="Promo target source-slice",
        note=(
            "Narrow source-slice over the UPC aggregate row currently pinned to the first "
            "CoroCoro promo family. Use it to preserve the exact modeled reference image "
            "while keeping the unmodeled Jigglypuff gap visible."
        ),
    ),
    ReleaseConfig(
        release_family_id="jp_promo_how_to_play_book_19961130",
        name_en="Easily Understand How to Play Pokemon Cards promos source slice",
        name_ja="「ポケモンカードの遊びかたがよくわかる本」プロモ",
        release_date="1996-11-30",
        expected_row_count=1,
        release_type="promo_family_child_rollup_rows",
        prints_without_rarity_symbol="yes",
        symbol_status_confidence="medium-high",
        pokellector_path="",
        source_adapter="promo_family_child_rollup",
        product_card_count=0,
        product_count_basis=(
            "Bulbapedia source snapshot lists two non-glossy Easily Understand How to Play "
            "Pokemon Cards promo entries. This child slice models only the current "
            "source-pinned PokéCardex UPC row for this exact family and records the missing "
            "counterpart as a source gap; it is not a complete family checklist."
        ),
        strict_release_member=False,
        catalog_treatment="Promo target source-slice",
        note=(
            "Narrow source-slice over the UPC aggregate row currently pinned to the how-to-play "
            "book promo family. Use it to preserve the exact modeled reference image while "
            "keeping the unmodeled non-glossy Pikachu gap visible."
        ),
    ),
    ReleaseConfig(
        release_family_id="jp_promo_lizardon_mega_battle_199711_199804",
        name_en="Lizardon / Charizard Mega Battle regional trophy source slice",
        name_ja="リザードンメガバトル プロモ",
        release_date="1997-11-08/1998-04-26",
        expected_row_count=3,
        release_type="promo_family_child_rollup_rows",
        prints_without_rarity_symbol="yes",
        symbol_status_confidence="medium-high",
        pokellector_path="",
        date_precision="source_range_with_final_event",
        source_adapter="promo_family_child_rollup",
        product_card_count=0,
        product_count_basis=(
            "Pokumon event context documents the Lizardon Mega Battle tournament arc and "
            "its regional No.1/No.2/No.3 Trainer trophy cards. This child slice models the "
            "three currently source-pinned PokéCardex UPC regional trophy rows; it does not "
            "claim official copy counts, plaque variants, complete award-object context, "
            "and it is not a complete family checklist beyond the source-pinned regional trophy row trio."
        ),
        strict_release_member=False,
        catalog_treatment="Promo target source-slice",
        note=(
            "Narrow source-slice over the UPC aggregate regional Lizardon Mega Battle trophy "
            "rows. Use it to distinguish these rows from First Official Tournament trophy "
            "cards while keeping copy counts and plaque variants outside the row claim."
        ),
    ),
    ReleaseConfig(
        release_family_id="jp_promo_jr_east_stamp_rally_199708",
        name_en="JR East Pokemon Stamp Rally source slice",
        name_ja="JR東日本ポケモンスタンプラリー プロモ",
        release_date="1997-08-09/1997-08-17",
        expected_row_count=1,
        release_type="promo_family_child_rollup_rows",
        prints_without_rarity_symbol="yes",
        symbol_status_confidence="medium-high",
        pokellector_path="",
        date_precision="source_range",
        source_adapter="promo_family_child_rollup",
        product_card_count=0,
        product_count_basis=(
            "Pokumon documents a two-card JR East Stamp Rally booklet containing Surfing "
            "Pikachu and Mew. This child slice models the one currently source-pinned "
            "PokéCardex UPC row, Surfing Pikachu; it records the Mew booklet card as a "
            "source gap and is not a complete family checklist."
        ),
        strict_release_member=False,
        catalog_treatment="Promo target source-slice",
        note=(
            "Narrow source-slice over the UPC aggregate row currently pinned to the JR East "
            "Stamp Rally family. Use it to preserve the matte JR-train Surfing Pikachu lane "
            "while keeping the unmodeled Mew booklet card visible as a source gap."
        ),
    ),
    ReleaseConfig(
        release_family_id="jp_tcg_gameboy_card_gb_19981218",
        name_en="Pokemon Trading Card Game for Game Boy Color",
        name_ja="ポケモンカードGB",
        release_date="1998-12-18",
        expected_row_count=1,
        release_type="video_game_insert_promo_rows",
        prints_without_rarity_symbol="yes",
        symbol_status_confidence="medium",
        pokellector_path="",
        source_adapter="pokecardex_upc_single",
        pokecardex_code="UPC",
        product_card_count=1,
        product_count_basis=(
            "Standalone product-family view of the Dragonite insert. The same source row is also "
            "present in the UPC aggregate slice at source sort 60."
        ),
        strict_release_member=True,
        catalog_treatment="Promo target",
        note=(
            "Retail Game Boy Color game with one official TCG Dragonite insert. Catalog the card "
            "as the product-family row; do not treat the video game itself as a TCG set."
        ),
        pokecardex_sort_filter=(60,),
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


def source_document_contacts() -> dict[str, Any]:
    release_map_text = RELEASE_MAP_PATH.read_text(encoding="utf-8")
    symbol_status = json.loads(PRE_ENGLISH_SYMBOL_STATUS_PATH.read_text(encoding="utf-8"))
    return {
        "release_map_path": str(RELEASE_MAP_PATH.relative_to(ROOT)),
        "release_map_sha256": sha256_text(release_map_text),
        "symbol_status_path": str(PRE_ENGLISH_SYMBOL_STATUS_PATH.relative_to(ROOT)),
        "symbol_status_hash": sha256_hex(symbol_status),
    }


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


def quick_starter_child_specs() -> tuple[tuple[str, str], ...]:
    return (
        ("red", "jp_tcg_quick_starter_gift_set_red_deck_19981204"),
        ("green", "jp_tcg_quick_starter_gift_set_green_deck_19981204"),
    )


def quick_starter_rollup_source_id() -> str:
    child_paths = [
        f"data/japanese-pre-english/releases/{child_id}.json"
        for _, child_id in quick_starter_child_specs()
    ]
    return "local-rollup:" + "+".join(child_paths)


def no_rarity_lab_source_id() -> str:
    return f"local-catalog:{NO_RARITY_CATALOG_PATH.relative_to(ROOT)}"


def starter_pack_possible_source_id() -> str:
    return "local-rollup:data/japanese-pre-english/releases/jp_tcg_expansion_pack_19961020.json"


def gift_pack_product_source_id() -> str:
    return "local-rollup:data/japanese-pre-english/releases/jp_tcg_starter_pack_19961020.json"


def gift_pack_source_snapshot() -> dict[str, Any]:
    snapshot = json.loads(GIFT_PACK_SOURCE_SNAPSHOT_PATH.read_text(encoding="utf-8"))
    selected_text = "\n".join(str(line.get("text", "")) for line in snapshot.get("selected_lines", []))
    return {
        "snapshot_path": str(GIFT_PACK_SOURCE_SNAPSHOT_PATH.relative_to(ROOT)),
        "snapshot_hash": sha256_hex(snapshot),
        "snapshot_schema": snapshot.get("schema", ""),
        "snapshot_retrieval_method": snapshot.get("retrieval_method", ""),
        "snapshot_content_scope": snapshot.get("content_scope", ""),
        "snapshot_not_claiming": snapshot.get("not_claiming", []),
        "source_page_url": snapshot.get("source_page_url", GIFT_PACK_PRODUCT_SOURCE_URL),
        "oldid_url": snapshot.get("oldid_url", ""),
        "retrieved_at": snapshot.get("retrieved_at", ""),
        "extracted_claims": snapshot.get("extracted_claims", {}),
        "selected_text": selected_text,
    }


def team_rocket_gift_pack_product_source_id() -> str:
    return "local-rollup:data/japanese-pre-english/releases/jp_tcg_rocket_gang_19971121.json"


def team_rocket_gift_pack_source_snapshot() -> dict[str, Any]:
    snapshot = json.loads(TEAM_ROCKET_GIFT_PACK_SOURCE_SNAPSHOT_PATH.read_text(encoding="utf-8"))
    selected_text = "\n".join(str(line.get("text", "")) for line in snapshot.get("selected_lines", []))
    return {
        "snapshot_path": str(TEAM_ROCKET_GIFT_PACK_SOURCE_SNAPSHOT_PATH.relative_to(ROOT)),
        "snapshot_hash": sha256_hex(snapshot),
        "snapshot_schema": snapshot.get("schema", ""),
        "snapshot_retrieval_method": snapshot.get("retrieval_method", ""),
        "snapshot_content_scope": snapshot.get("content_scope", ""),
        "snapshot_not_claiming": snapshot.get("not_claiming", []),
        "source_page_url": snapshot.get("source_page_url", TEAM_ROCKET_GIFT_PACK_PRODUCT_SOURCE_URL),
        "oldid_url": snapshot.get("oldid_url", ""),
        "retrieved_at": snapshot.get("retrieved_at", ""),
        "extracted_claims": snapshot.get("extracted_claims", {}),
        "selected_text": selected_text,
    }


def promo_family_child_source_id() -> str:
    return "local-rollup:data/japanese-pre-english/releases/jp_promo_unnumbered_pre_english_source_slice_19961015_19990131.json"


def early_1996_promo_source_snapshot() -> dict[str, Any]:
    snapshot = json.loads(EARLY_1996_PROMO_SOURCE_SNAPSHOT_PATH.read_text(encoding="utf-8"))
    selected_text = "\n".join(str(line.get("text", "")) for line in snapshot.get("selected_lines", []))
    return {
        "source": snapshot.get("source", "Bulbapedia"),
        "snapshot_path": str(EARLY_1996_PROMO_SOURCE_SNAPSHOT_PATH.relative_to(ROOT)),
        "snapshot_hash": sha256_hex(snapshot),
        "snapshot_schema": snapshot.get("schema", ""),
        "snapshot_retrieval_method": snapshot.get("retrieval_method", ""),
        "snapshot_content_scope": snapshot.get("content_scope", ""),
        "snapshot_not_claiming": snapshot.get("not_claiming", []),
        "source_page_url": snapshot.get("source_page_url", ""),
        "oldid_url": snapshot.get("oldid_url", ""),
        "retrieved_at": snapshot.get("retrieved_at", ""),
        "extracted_claims": snapshot.get("extracted_claims", {}),
        "selected_text": selected_text,
    }


def lizardon_mega_battle_source_snapshot() -> dict[str, Any]:
    snapshot = json.loads(LIZARDON_MEGA_BATTLE_SOURCE_SNAPSHOT_PATH.read_text(encoding="utf-8"))
    selected_text = "\n".join(str(line.get("text", "")) for line in snapshot.get("selected_lines", []))
    return {
        "source": snapshot.get("source", "Pokumon"),
        "snapshot_path": str(LIZARDON_MEGA_BATTLE_SOURCE_SNAPSHOT_PATH.relative_to(ROOT)),
        "snapshot_hash": sha256_hex(snapshot),
        "snapshot_schema": snapshot.get("schema", ""),
        "snapshot_retrieval_method": snapshot.get("retrieval_method", ""),
        "snapshot_content_scope": snapshot.get("content_scope", ""),
        "snapshot_not_claiming": snapshot.get("not_claiming", []),
        "source_page_url": snapshot.get("source_page_url", ""),
        "oldid_url": snapshot.get("oldid_url", ""),
        "retrieved_at": snapshot.get("retrieved_at", ""),
        "extracted_claims": snapshot.get("extracted_claims", {}),
        "selected_text": selected_text,
    }


def jr_east_stamp_rally_source_snapshot() -> dict[str, Any]:
    snapshot = json.loads(JR_EAST_STAMP_RALLY_SOURCE_SNAPSHOT_PATH.read_text(encoding="utf-8"))
    selected_text = "\n".join(str(line.get("text", "")) for line in snapshot.get("selected_lines", []))
    return {
        "source": snapshot.get("source", "Pokumon"),
        "snapshot_path": str(JR_EAST_STAMP_RALLY_SOURCE_SNAPSHOT_PATH.relative_to(ROOT)),
        "snapshot_hash": sha256_hex(snapshot),
        "snapshot_schema": snapshot.get("schema", ""),
        "snapshot_retrieval_method": snapshot.get("retrieval_method", ""),
        "snapshot_content_scope": snapshot.get("content_scope", ""),
        "snapshot_not_claiming": snapshot.get("not_claiming", []),
        "source_page_url": snapshot.get("source_page_url", ""),
        "oldid_url": snapshot.get("oldid_url", ""),
        "retrieved_at": snapshot.get("retrieved_at", ""),
        "extracted_claims": snapshot.get("extracted_claims", {}),
        "selected_text": selected_text,
    }


def promo_family_context_snapshot(snapshot_id: str) -> dict[str, Any]:
    if snapshot_id == "early_1996_promos":
        return early_1996_promo_source_snapshot()
    if snapshot_id == "lizardon_mega_battle":
        return lizardon_mega_battle_source_snapshot()
    if snapshot_id == "jr_east_stamp_rally_1997":
        return jr_east_stamp_rally_source_snapshot()
    raise ValueError(f"unknown promo family context snapshot {snapshot_id}")


def gift_pack_component_lanes() -> tuple[str, ...]:
    return ("starter_a", "starter_b")


def team_rocket_gift_pack_component_lanes() -> tuple[str, ...]:
    return ("rocket_deck_a", "rocket_deck_b")


def source_url_for_config(config: ReleaseConfig) -> str:
    if config.source_adapter == "no_rarity_lab_catalog":
        return no_rarity_lab_source_id()
    if config.source_adapter == "starter_pack_possible_rollup":
        return starter_pack_possible_source_id()
    if config.source_adapter == "gift_pack_product_rollup":
        return gift_pack_product_source_id()
    if config.source_adapter == "team_rocket_gift_pack_product_rollup":
        return team_rocket_gift_pack_product_source_id()
    if config.source_adapter == "promo_family_child_rollup":
        return promo_family_child_source_id()
    if config.source_adapter == "pokellector":
        return urllib.parse.urljoin(POKELLECTOR_BASE, config.pokellector_path)
    if config.source_adapter in {"pokecardex", "pokecardex_upc_pre_english", "pokecardex_upc_single"}:
        return f"{POKECARDEX_BASE}/en/series/jp/{config.pokecardex_code}"
    if config.source_adapter == "bulbapedia_song_best":
        return f"{BULBAPEDIA_BASE}/wiki/Pok%C3%A9mon_Song_Best_Collection"
    if config.source_adapter == "quick_starter_parent_rollup":
        return quick_starter_rollup_source_id()
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


def bulbapedia_card_profile(card_page_url: str) -> dict[str, Any]:
    card_raw_url = f"{card_page_url}?action=raw"
    raw_initial = fetch_text(card_raw_url)
    raw_card, redirect_raw_url = follow_bulbapedia_raw_redirect(raw_initial)
    caption = clean_wiki_text(wiki_raw_field(raw_card, "caption"))
    illustrator = ""
    illustrator_match = re.search(r"Illus\.\s+([^|]+)$", caption)
    if illustrator_match:
        illustrator = illustrator_match.group(1).strip()
    card_type = clean_wiki_text(wiki_raw_field(raw_card, "type"))
    return {
        "card_page_sha256": sha256_text(raw_card),
        "card_page_url": card_page_url,
        "card_raw_url": redirect_raw_url or card_raw_url,
        "hp": clean_wiki_text(wiki_raw_field(raw_card, "hp")),
        "illustrator": illustrator,
        "jname": clean_wiki_text(wiki_raw_field(raw_card, "jname")),
        "jtrans": clean_wiki_text(wiki_raw_field(raw_card, "jtrans")),
        "level": clean_wiki_text(wiki_raw_field(raw_card, "level")),
        "type": card_type,
        "types": [card_type] if card_type else [],
    }


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
        promo_context = (
            UPC_PRE_ENGLISH_PROMO_CONTEXT.get(sort_value)
            if config.source_adapter in {"pokecardex_upc_pre_english", "pokecardex_upc_single"}
            else None
        )
        if config.source_adapter == "pokecardex_upc_pre_english" and not promo_context:
            continue
        if config.source_adapter == "pokecardex_upc_single":
            if sort_value not in config.pokecardex_sort_filter:
                continue
            if not promo_context:
                raise ValueError(f"{config.release_family_id} missing UPC promo context for sort {sort_value}")
        bulbapedia_profile = (
            bulbapedia_card_profile(UPC_BULBAPEDIA_CARD_PAGES[sort_value])
            if config.source_adapter == "pokecardex_upc_single" and sort_value in UPC_BULBAPEDIA_CARD_PAGES
            else {}
        )
        local_id = f"{sort_value:03d}"
        image_url = f"{POKECARDEX_BASE}/assets/images/sets_jp/{config.pokecardex_code}/{sort_value}.jpg"
        provider_id = f"pokecardex:{card.get('id_card')}"
        title = f"{card.get('name_card_en', '')} - {series.get('fullName', config.name_en)} #{sort_value}"
        source_contact = {
            "card_data_hash": sha256_hex(card),
            "series_code": config.pokecardex_code,
            "source": "PokéCardex",
            "source_page_url": set_url,
            "not_claiming": ["official source", "seller possession", "authenticity", "condition"],
        }
        if config.source_adapter == "pokecardex_upc_single":
            source_contact["payload_hash"] = sha256_hex(payload)
        else:
            source_contact["encrypted_page_sha256"] = page_hash
        cards.append(
            {
                "source": source_contact,
                "local_id": local_id,
                "name_en": card.get("name_card_en", ""),
                "name_ja": bulbapedia_profile.get("jname", ""),
                "romaji_source": bulbapedia_profile.get("jtrans", ""),
                "name_source_note": (
                    "PokéCardex payload provides the English name; Bulbapedia card-page infobox provides Japanese name and transliteration."
                    if bulbapedia_profile
                    else "PokéCardex payload provides English/French/German names for this page; Japanese print name remains pending a separate source."
                ),
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
                    "hp": bulbapedia_profile.get("hp") or None,
                    "illustrator": bulbapedia_profile.get("illustrator") or card.get("nom_illustrateur", ""),
                    "jtrans": bulbapedia_profile.get("jtrans", ""),
                    "level": bulbapedia_profile.get("level") or None,
                    "name_card_de": card.get("name_card_de", ""),
                    "name_card_fr": card.get("name_card_fr", ""),
                    "types": bulbapedia_profile.get("types", []),
                    "versions": card.get("versions", []),
                },
                **(
                    {
                        "additional_source_contacts": [
                            {
                                "source": "Bulbapedia",
                                "card_page_sha256": bulbapedia_profile["card_page_sha256"],
                                "card_page_url": bulbapedia_profile["card_page_url"],
                                "card_raw_url": bulbapedia_profile["card_raw_url"],
                                "not_claiming": ["official source", "seller possession", "authenticity", "condition"],
                            }
                        ]
                    }
                    if bulbapedia_profile
                    else {}
                ),
                **({"promo_context": promo_context} if promo_context else {}),
            }
        )
    source = {
        "source": "PokéCardex",
        "source_page_url": set_url,
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
    if config.source_adapter != "pokecardex_upc_single":
        source["encrypted_page_sha256"] = page_hash
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
    source_basis = f"{source_name} exact row page"
    if adapter == "pokecardex":
        source_basis = "PokéCardex decrypted series payload row and provider-path image convention"
    elif adapter == "bulbapedia_song_best":
        source_basis = "Bulbapedia membership/card page plus bounded image witness"
    image_audit_label = (
        "provider-path external reference image"
        if image.get("status") == "provider_path_reference_image"
        else "exact external reference image"
    )
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
            "basis": [source_basis, "TCGdex row metadata when present", "Japanese pre-English release map"],
            "note": f"{source_row['name_en']} is cataloged here as row {int(local_id)} of {config.name_en}. Treat the image as a reference witness, then ask for seller evidence before any trade.",
            "signals": [config.name_en, local_id, rarity, config.release_date],
        },
        "information_audit": {
            "audit_scope": "Information architecture only. This row does not authenticate a physical card, condition, possession, or price.",
            "earns_keep": [
                {"field": image_audit_label, "surface": "primary", "why": "The agent needs a row-specific visual reference, but rights/use remain bounded."},
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
            *source_row.get("additional_source_contacts", []),
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
    if config.source_adapter == "no_rarity_lab_catalog":
        return build_no_rarity_lab_release(config)
    if config.source_adapter == "starter_pack_possible_rollup":
        return build_starter_pack_possible_rollup(config)
    if config.source_adapter == "gift_pack_product_rollup":
        return build_gift_pack_product_rollup(config)
    if config.source_adapter == "team_rocket_gift_pack_product_rollup":
        return build_team_rocket_gift_pack_product_rollup(config)
    if config.source_adapter == "promo_family_child_rollup":
        return build_promo_family_child_rollup(config)
    if config.source_adapter == "quick_starter_parent_rollup":
        return build_quick_starter_parent_rollup(config)
    if config.source_adapter == "pokellector":
        source_rows, primary_source = parse_pokellector_set(config)
    elif config.source_adapter in {"pokecardex", "pokecardex_upc_pre_english", "pokecardex_upc_single"}:
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


def build_no_rarity_lab_release(config: ReleaseConfig) -> dict[str, Any]:
    lab = json.loads(NO_RARITY_CATALOG_PATH.read_text(encoding="utf-8"))
    policy = json.loads(NO_RARITY_POLICY_PATH.read_text(encoding="utf-8"))
    manifest = json.loads(NO_RARITY_MANIFEST_PATH.read_text(encoding="utf-8"))
    catalog_hash = sha256_hex(lab)
    policy_hash = sha256_hex(policy)
    manifest_hash = sha256_hex(manifest)
    cards: list[dict[str, Any]] = []
    for lab_card in lab.get("cards", []):
        local_id = lab_card.get("local_id", "")
        row_id = f"{config.release_family_id}:{local_id}"
        target = bool(lab_card.get("no_rarity_target"))
        strict_booster_member = bool(lab_card.get("product_scope", {}).get("strict_booster_member"))
        ref = lab_card.get("no_rarity_reference", {})
        image_large = ref.get("image_large", "")
        image_status = "exact_source_image" if image_large else "missing_reference_image"
        image_provenance = {
            "allowed_use": ["manual_review", "catalog_reference_link"] if image_large else [],
            "display_allowed": False,
            "exactness_basis": (
                [
                    "same local No Rarity lab row",
                    "source-labeled No Rarity reference image",
                    "same PMCG1 catalog anchor",
                ]
                if image_large
                else [
                    "local No Rarity lab intentionally withholds substitute images",
                    "Basic Energy caveat rows need separate treatment",
                ]
            ),
            "image_large": image_large,
            "image_role": ref.get("image_role", "No source-labeled No Rarity reference image found yet."),
            "image_small": ref.get("image_small", ""),
            "not_allowed_by_default": ["training", "seller evidence", "authentication proof"],
            "not_claiming": list(dict.fromkeys([
                *ref.get("not_claiming", []),
                "seller possession",
                "seller card match",
                "condition",
                "authenticity",
            ])),
            "provider_id": ref.get("provider_id", ""),
            "provider_title": ref.get("provider_title", ""),
            "provider_display_title": f"{lab_card.get('name_en', '')} No Rarity reference" if image_large else "",
            "release_family_id": config.release_family_id,
            "rights_status": "external_reference_witness" if image_large else "no_reference_image",
            "row_id": row_id,
            "source": ref.get("source", "No Rarity local catalog"),
            "source_page_url": ref.get("source_page_url", ""),
            "status": image_status,
            "verification_status": ref.get("verification_status", "missing"),
        }
        japanese_name = (
            lab_card.get("product_scope", {}).get("japanese_name_from_research")
            or lab_card.get("name_source_raw", "")
        )
        romaji = lab_card.get("product_scope", {}).get("romaji_from_research") or ""
        source_contacts = [
            {
                "catalog_hash": catalog_hash,
                "catalog_manifest_hash": manifest_hash,
                "catalog_path": str(NO_RARITY_CATALOG_PATH.relative_to(ROOT)),
                "local_row_id": lab_card.get("tcgdex_id", ""),
                "not_claiming": ["seller possession", "authenticity", "condition", "price truth"],
                "policy_hash": policy_hash,
                "source": "No Rarity local catalog",
                "source_page_url": no_rarity_lab_source_id(),
            }
        ]
        if ref.get("source_page_url") or image_large:
            source_contacts.append(
                {
                    "image_large": image_large,
                    "not_claiming": ref.get("not_claiming", ["seller possession", "seller card match", "condition", "authenticity"]),
                    "provider_id": ref.get("provider_id", ""),
                    "provider_title": ref.get("provider_title", ""),
                    "source": ref.get("source", ""),
                    "source_page_url": ref.get("source_page_url", ""),
                    "verification_status": ref.get("verification_status", ""),
                }
            )
        tcgdex = dict(lab_card.get("tcgdex", {}))
        tcgdex["id"] = lab_card.get("tcgdex_id", "")
        if tcgdex.get("url"):
            source_contacts.append(
                {
                    "card_api_url": tcgdex.get("url", ""),
                    "not_claiming": ["image availability", "seller possession", "authenticity"],
                    "source": "TCGdex",
                }
            )
        tags = [
            config.release_family_id,
            "Expansion Pack",
            lab_card.get("tcgdex_id", ""),
            "No Rarity target" if target else "Basic Energy caveat",
            lab_card.get("category", ""),
            lab_card.get("rarity_source", ""),
        ]
        booster_order = lab_card.get("product_scope", {}).get("japanese_booster_order")
        if booster_order:
            tags.append(f"Japanese booster order {booster_order:03d}")
        return_card = {
            "schema": "marketplace.japanese_pre_english_card_row.v0.1",
            "row_id": row_id,
            "release_family_id": config.release_family_id,
            "local_id": local_id,
            "name_en": lab_card.get("name_en", ""),
            "name_ja": japanese_name,
            "name_ja_status": "source_labeled" if japanese_name else "missing_from_exact_source",
            "romaji": romaji,
            "name_source_note": (
                "Japanese name/romaji imported from the local No Rarity lab research packet; "
                "treat as curated catalog data, not seller-card proof."
            ),
            "category": lab_card.get("category", ""),
            "rarity_source": lab_card.get("rarity_source", ""),
            "holo_source": bool(lab_card.get("holo_source")),
            "pokemon_profile": lab_card.get("pokemon_profile", {}),
            "illustrator": lab_card.get("illustrator", {}),
            "tcgdex": tcgdex,
            "product_scope": {
                "authority": "Local No Rarity lab plus Japanese pre-English release map.",
                "catalog_treatment": config.catalog_treatment,
                "counting_note": lab_card.get("product_scope", {}).get("counting_note", ""),
                "date_precision": config.date_precision,
                "japanese_booster_order": booster_order,
                "japanese_booster_section": lab_card.get("product_scope", {}).get("japanese_booster_section", ""),
                "japanese_set_name": config.name_ja,
                "membership_note": (
                    "Strict 96-card booster member."
                    if strict_booster_member
                    else "Broader launch-family Basic Energy caveat; not part of the strict booster checklist."
                ),
                "parent_release_family_id": config.parent_release_family_id,
                "product_card_count": config.product_card_count,
                "product_count_basis": config.product_count_basis,
                "release_date": config.release_date,
                "release_type": config.release_type,
                "strict_booster_member": strict_booster_member,
                "strict_release_member": strict_booster_member,
                "unique_catalog_row_count": config.expected_row_count,
            },
            "symbol_status": {
                "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
                "confidence": config.symbol_status_confidence,
                "scope": "release_context_not_row_fact",
                "source_mode": "direct_release_family",
                "source_release_family_id": config.release_family_id,
                "not_claiming": ["row-level physical truth", "seller-card symbol state", "seller possession"],
            },
            "no_rarity_scope": {
                "active_target": target,
                "basic_energy_caveat": not target,
                "evidence_focus": lab_card.get("evidence_focus", ""),
                "no_rarity_profile": lab_card.get("no_rarity_profile", ""),
                "not_claiming": ["No Rarity truth without seller evidence", "seller possession", "authenticity", "condition"],
                "variant_traps": lab_card.get("variant_traps", []),
            },
            "image_provenance": image_provenance,
            "collector_texture": lab_card.get("collector_texture", {}),
            "information_audit": lab_card.get("information_audit", {}),
            "source_contacts": source_contacts,
            "provider_row": {
                "adapter": "no_rarity_lab_catalog",
                "local_catalog_row": lab_card.get("tcgdex_id", ""),
                "no_rarity_profile": lab_card.get("no_rarity_profile", ""),
                "reference_provider_id": ref.get("provider_id", ""),
                "reference_source": ref.get("source", ""),
            },
            "variant_traps": lab_card.get("variant_traps", []),
            "not_claiming": lab_card.get("not_claiming", ["seller possession", "authenticity", "condition truth", "price truth", "spendability"]),
            "tags": [tag for tag in tags if tag],
        }
        cards.append(return_card)
    source = {
        "source": "No Rarity local catalog",
        "source_page_url": no_rarity_lab_source_id(),
        "catalog_hash": catalog_hash,
        "catalog_manifest_hash": manifest_hash,
        "catalog_path": str(NO_RARITY_CATALOG_PATH.relative_to(ROOT)),
        "policy_hash": policy_hash,
        "policy_path": str(NO_RARITY_POLICY_PATH.relative_to(ROOT)),
        "rows_found": len(cards),
        "active_no_rarity_rows": sum(1 for card in cards if card.get("no_rarity_scope", {}).get("active_target")),
        "basic_energy_caveat_rows": sum(1 for card in cards if card.get("no_rarity_scope", {}).get("basic_energy_caveat")),
        "not_claiming": ["seller possession", "authenticity", "condition", "price truth", "spendability"],
    }
    return {
        "schema": "marketplace.japanese_pre_english_release_catalog.v0.1",
        "release": {
            "release_family_id": config.release_family_id,
            "name_en": config.name_en,
            "name_ja": config.name_ja,
            "release_date": config.release_date,
            "date_precision": config.date_precision,
            "release_type": config.release_type,
            "expected_row_count": config.expected_row_count,
            "count_confidence": "local_no_rarity_lab_bridge",
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
            "source": "data/no-rarity-base-set.json and data/pre-english-symbol-status.json",
            "scope": "release_context_not_row_fact",
            "source_mode": "direct_release_family",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller possession", "Base No Rarity proof without seller evidence"],
        },
        "sources": [source],
        "cards": cards,
        "not_claiming": [
            "complete pre-English catalog",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "approved image display rights",
            "No Rarity truth without seller evidence",
        ],
    }


def build_starter_pack_possible_rollup(config: ReleaseConfig) -> dict[str, Any]:
    source_path = RELEASE_DIR / "jp_tcg_expansion_pack_19961020.json"
    source_release = json.loads(source_path.read_text(encoding="utf-8"))
    source_hash = sha256_hex(source_release)
    source_docs = source_document_contacts()
    gift_snapshot = gift_pack_source_snapshot()
    gift_claims = gift_snapshot["extracted_claims"]
    cards: list[dict[str, Any]] = []
    for source_card in source_release.get("cards", []):
        local_id = source_card.get("local_id", "")
        row_id = f"{config.release_family_id}:{local_id}"
        possible_card = copy.deepcopy(source_card)
        possible_card["row_id"] = row_id
        possible_card["release_family_id"] = config.release_family_id
        possible_card["starter_pack_scope"] = {
            "authority": "Deterministic possible-content rollup over source-backed Expansion Pack / No Rarity lab rows.",
            "fixed_deck_member": False,
            "possible_content_pool": True,
            "product_rule": (
                "Source-format context: associated with 30 random Expansion Pack-card slots "
                "plus 30 Basic Energy slots per 60-card Starter Pack; not a guarantee of any "
                "sealed unit's contents, collation, distribution, or fixed deck composition."
            ),
            "source_catalog_hash": source_hash,
            "source_local_id": local_id,
            "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
            "source_row_id": source_card.get("row_id", ""),
            "not_claiming": [
                "fixed deck list",
                "sealed deck contents",
                "seller possession",
                "authenticity",
                "condition",
                "price truth",
            ],
        }
        source_product_scope = source_card.get("product_scope", {})
        strict_booster_member = bool(source_product_scope.get("strict_booster_member"))
        possible_card["product_scope"] = {
            "authority": "Starter Pack possible-content rollup plus Japanese pre-English release map.",
            "catalog_treatment": config.catalog_treatment,
            "counting_note": (
                "Possible content pool row for Series 1 Starter Pack. The source-format context is "
                "30 random Expansion Pack-card slots plus 30 Basic Energy slots; this row is not a "
                "guarantee of any sealed unit's contents, collation, distribution, or fixed deck inclusion."
            ),
            "date_precision": config.date_precision,
            "japanese_booster_order": source_product_scope.get("japanese_booster_order"),
            "japanese_booster_section": source_product_scope.get("japanese_booster_section", ""),
            "japanese_set_name": config.name_ja,
            "membership_note": "Possible Starter Pack content pool row; not a fixed deck inclusion.",
            "parent_release_family_id": "jp_tcg_expansion_pack_19961020",
            "product_card_count": config.product_card_count,
            "product_count_basis": config.product_count_basis,
            "release_date": config.release_date,
            "release_type": config.release_type,
            "source_strict_booster_member": strict_booster_member,
            "strict_booster_member": False,
            "strict_release_member": False,
            "unique_catalog_row_count": config.expected_row_count,
        }
        possible_card["symbol_status"] = {
            "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
            "confidence": config.symbol_status_confidence,
            "scope": "release_context_not_row_fact",
            "source_mode": "direct_release_family",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller-card symbol state", "seller possession"],
        }
        possible_card["provider_row"] = {
            "adapter": "starter_pack_possible_rollup",
            "local_catalog_row": source_card.get("provider_row", {}).get("local_catalog_row", ""),
            "source_catalog_hash": source_hash,
            "source_provider_row": source_card.get("provider_row", {}),
            "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
            "source_row_id": source_card.get("row_id", ""),
        }
        image = possible_card.get("image_provenance", {})
        source_image_row_id = image.get("row_id", "")
        source_image_release_family_id = image.get("release_family_id", "")
        source_image_status = image.get("status", "")
        image["release_family_id"] = config.release_family_id
        image["row_id"] = row_id
        image["source_image_catalog_hash"] = source_hash
        image["source_image_release_family_id"] = source_image_release_family_id
        image["source_image_row_id"] = source_image_row_id
        image["source_image_status"] = source_image_status
        if image.get("status") == "exact_source_image":
            image["status"] = "inherited_source_reference_image"
            image["verification_status"] = (
                "inherited from source-labeled Expansion Pack / No Rarity reference image; "
                "not direct Starter Pack image evidence"
            )
        image["exactness_basis"] = list(dict.fromkeys([
            *image.get("exactness_basis", []),
            "inherited possible-content reference from Expansion Pack / No Rarity lab row",
        ]))
        image["not_claiming"] = list(dict.fromkeys([
            *image.get("not_claiming", []),
            "sealed deck contents",
            "fixed deck inclusion",
        ]))
        possible_card["image_provenance"] = image
        collector_texture = possible_card.get("collector_texture", {})
        collector_texture["note"] = (
            f"{source_card.get('name_en', '')} is cataloged here as a possible Series 1 Starter Pack "
            "content row inherited from the launch Expansion Pack / No Rarity lab. The useful claim is source-family "
            "ambiguity: a seller still has to prove the physical card in front of them."
        )
        collector_texture["signals"] = list(dict.fromkeys([
            config.name_en,
            "possible Starter Pack content",
            *collector_texture.get("signals", []),
        ]))
        possible_card["collector_texture"] = collector_texture
        source_contacts = [
            {
                "catalog_hash": source_hash,
                "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
                "catalog_path": str(source_path.relative_to(ROOT)),
                "local_row_id": local_id,
                "not_claiming": ["fixed deck list", "sealed deck contents", "seller possession", "authenticity", "condition", "price truth"],
                "source": "Starter Pack possible-content rollup",
                "source_page_url": starter_pack_possible_source_id(),
                "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
                "source_row_id": source_card.get("row_id", ""),
            },
        ]
        for contact in possible_card.get("source_contacts", []):
            retargeted_contact = copy.deepcopy(contact)
            retargeted_contact["inherited_from_source_release"] = True
            retargeted_contact["source_catalog_hash"] = source_hash
            retargeted_contact["source_release_family_id"] = source_release.get("release", {}).get("release_family_id", "")
            retargeted_contact["source_row_id"] = source_card.get("row_id", "")
            retargeted_contact["not_claiming"] = list(dict.fromkeys([
                *retargeted_contact.get("not_claiming", []),
                "fixed deck list",
                "sealed deck contents",
                "seller possession",
                "authenticity",
                "condition",
                "price truth",
            ]))
            if retargeted_contact.get("image_large"):
                retargeted_contact["not_allowed_by_default"] = list(dict.fromkeys([
                    *retargeted_contact.get("not_allowed_by_default", []),
                    "training",
                    "seller evidence",
                    "authentication proof",
                ]))
                retargeted_contact["rights_status"] = retargeted_contact.get("rights_status", "external_reference_witness")
                retargeted_contact["display_allowed"] = False
            source_contacts.append(retargeted_contact)
        possible_card["source_contacts"] = source_contacts
        possible_card["not_claiming"] = list(dict.fromkeys([
            *possible_card.get("not_claiming", []),
            "fixed deck list",
            "sealed deck contents",
            "seller possession",
            "authenticity",
            "condition",
            "price truth",
        ]))
        possible_card["tags"] = list(dict.fromkeys([
            config.release_family_id,
            config.name_en,
            "possible Starter Pack content",
            *possible_card.get("tags", []),
        ]))
        cards.append(possible_card)
    source = {
        "source": "Marketplace Expansion Pack / No Rarity bridge rollup",
        "source_page_url": starter_pack_possible_source_id(),
        "catalog_hash": source_hash,
        "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
        "path": str(source_path.relative_to(ROOT)),
        **source_docs,
        "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
        "source_release_type": source_release.get("release", {}).get("release_type", ""),
        "cards_found": len(cards),
        "possible_content_rows": len(cards),
        "active_no_rarity_rows": sum(1 for card in cards if card.get("no_rarity_scope", {}).get("active_target")),
        "basic_energy_caveat_rows": sum(1 for card in cards if card.get("no_rarity_scope", {}).get("basic_energy_caveat")),
        "not_claiming": ["fixed deck list", "sealed deck contents", "seller possession", "authenticity", "condition", "price truth"],
    }
    return {
        "schema": "marketplace.japanese_pre_english_release_catalog.v0.1",
        "release": {
            "release_family_id": config.release_family_id,
            "name_en": config.name_en,
            "name_ja": config.name_ja,
            "release_date": config.release_date,
            "date_precision": config.date_precision,
            "release_type": config.release_type,
            "expected_row_count": config.expected_row_count,
            "count_confidence": "possible_content_rollup",
            "parent_release_family_id": "jp_tcg_expansion_pack_19961020",
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
            "source_mode": "direct_release_family",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller possession", "Base No Rarity proof without seller evidence"],
        },
        "sources": [source],
        "cards": cards,
        "not_claiming": [
            "complete pre-English catalog",
            "fixed deck list",
            "sealed deck contents",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "approved image display rights",
        ],
    }


def build_gift_pack_product_rollup(config: ReleaseConfig) -> dict[str, Any]:
    source_path = RELEASE_DIR / "jp_tcg_starter_pack_19961020.json"
    source_release = json.loads(source_path.read_text(encoding="utf-8"))
    source_hash = sha256_hex(source_release)
    source_docs = source_document_contacts()
    gift_snapshot = gift_pack_source_snapshot()
    gift_claims = gift_snapshot["extracted_claims"]
    cards: list[dict[str, Any]] = []
    for lane in gift_pack_component_lanes():
        for source_card in source_release.get("cards", []):
            source_local_id = source_card.get("local_id", "")
            local_id = f"{lane}-{source_local_id}"
            row_id = f"{config.release_family_id}:{local_id}"
            component_card = copy.deepcopy(source_card)
            component_card["row_id"] = row_id
            component_card["release_family_id"] = config.release_family_id
            component_card["local_id"] = local_id
            component_card["gift_pack_scope"] = {
                "authority": "Deterministic Gift Pack product-component rollup over two Starter Pack possible-content lanes.",
                "component_lane": lane,
                "component_type": "starter_pack_possible_content_component",
                "fixed_gift_pack_card_member": False,
                "possible_content_pool": True,
                "product_rule": (
                    "Source-format context: Gift Pack is documented as a 122-card product with two "
                    "Series 1 Starter Pack products plus two special-card slots. This row models a "
                    "possible Starter Pack component slot only; it is not a guarantee of sealed-unit "
                    "contents, collation, distribution, special-card identity, or fixed deck composition."
                ),
                "source_catalog_hash": source_hash,
                "source_local_id": source_local_id,
                "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
                "source_row_id": source_card.get("row_id", ""),
                "unmodeled_special_card_slots": 2,
                "not_claiming": [
                    "fixed Gift Pack deck list",
                    "sealed Gift Pack contents",
                    "special-card identity",
                    "seller possession",
                    "authenticity",
                    "condition",
                    "price truth",
                ],
            }
            source_product_scope = source_card.get("product_scope", {})
            component_card["product_scope"] = {
                "authority": "Gift Pack product-component rollup plus Japanese pre-English release map.",
                "catalog_treatment": config.catalog_treatment,
                "component_lane": lane,
                "counting_note": (
                    "Possible component row for one of two Starter Pack products inside Gift Pack. "
                    "The 204 catalog rows are 2 x 102 possible-content rows, not 204 physical cards "
                    "and not a guarantee of sealed-unit contents, collation, distribution, or fixed deck inclusion."
                ),
                "date_precision": config.date_precision,
                "japanese_booster_order": source_product_scope.get("japanese_booster_order"),
                "japanese_booster_section": source_product_scope.get("japanese_booster_section", ""),
                "japanese_set_name": config.name_ja,
                "membership_note": "Possible Gift Pack Starter Pack component row; not a fixed deck inclusion.",
                "parent_release_family_id": "jp_tcg_starter_pack_19961020",
                "product_card_count": config.product_card_count,
                "product_count_basis": config.product_count_basis,
                "release_date": config.release_date,
                "release_type": config.release_type,
                "source_strict_booster_member": bool(source_product_scope.get("source_strict_booster_member")),
                "source_starter_pack_possible_row": True,
                "strict_booster_member": False,
                "strict_release_member": False,
                "unique_catalog_row_count": config.expected_row_count,
                "unique_underlying_starter_rows": 102,
                "unmodeled_special_card_slots": 2,
            }
            component_card["symbol_status"] = {
                "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
                "confidence": config.symbol_status_confidence,
                "scope": "release_context_not_row_fact",
                "source_mode": "direct_release_family",
                "source_release_family_id": config.release_family_id,
                "not_claiming": ["row-level physical truth", "seller-card symbol state", "seller possession"],
            }
            component_card["provider_row"] = {
                "adapter": "gift_pack_product_rollup",
                "component_lane": lane,
                "local_catalog_row": source_card.get("provider_row", {}).get("local_catalog_row", ""),
                "source_catalog_hash": source_hash,
                "source_provider_row": source_card.get("provider_row", {}),
                "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
                "source_row_id": source_card.get("row_id", ""),
                "unmodeled_special_card_slots": 2,
            }
            image = component_card.get("image_provenance", {})
            component_source_image_status = image.get("status", "")
            image["release_family_id"] = config.release_family_id
            image["row_id"] = row_id
            image["component_source_catalog_hash"] = source_hash
            image["component_source_release_family_id"] = source_release.get("release", {}).get("release_family_id", "")
            image["component_source_row_id"] = source_card.get("row_id", "")
            image["component_source_image_status"] = component_source_image_status
            source_image_lineage_status = image.pop("source_image_status", "")
            if source_image_lineage_status:
                image["source_image_lineage_status"] = source_image_lineage_status.replace(
                    "exact_source_image",
                    "source-row exact reference image",
                )
                image["source_image_lineage_authority"] = (
                    "lineage only; top-level status is the current Gift Pack image authority"
                )
            if image.get("status") == "inherited_source_reference_image":
                image["status"] = "component_inherited_reference_image"
                image["verification_status"] = (
                    "inherited through Gift Pack component rollup from Starter Pack possible-content row; "
                    "not direct Gift Pack image evidence"
                )
            image["exactness_basis"] = list(dict.fromkeys([
                *image.get("exactness_basis", []),
                "inherited Gift Pack component reference from Starter Pack possible-content row",
            ]))
            image["not_claiming"] = list(dict.fromkeys([
                *image.get("not_claiming", []),
                "sealed Gift Pack contents",
                "fixed Gift Pack deck inclusion",
                "special-card identity",
            ]))
            component_card["image_provenance"] = image
            collector_texture = component_card.get("collector_texture", {})
            collector_texture["note"] = (
                f"{source_card.get('name_en', '')} is cataloged here as a possible Gift Pack "
                f"{lane} component row inherited from the Series 1 Starter Pack possible-content pool. "
                "The useful claim is product-context ambiguity; the physical card still needs seller evidence."
            )
            collector_texture["signals"] = list(dict.fromkeys([
                config.name_en,
                lane,
                "possible Gift Pack Starter Pack component",
                *collector_texture.get("signals", []),
            ]))
            component_card["collector_texture"] = collector_texture
            information_audit = copy.deepcopy(component_card.get("information_audit", {}))
            information_audit["audit_scope"] = (
                "Gift Pack component information architecture only. Component-inherited images "
                "and source lineage help agents compare catalogs, but they do not authenticate "
                "a Gift Pack card, sealed contents, possession, condition, or price."
            )
            information_audit["gift_pack_component_override"] = {
                "authority": "Use the top-level image_provenance.status as the image authority.",
                "current_status": image.get("status", ""),
                "primary_surface_rule": (
                    "Do not present component-inherited images as direct Gift Pack images; "
                    "show them only behind lineage/reference comparison controls."
                ),
            }
            for item in information_audit.get("earns_keep", []):
                if item.get("field") == "No Rarity reference image":
                    item["field"] = "component-inherited No Rarity reference image"
                    item["surface"] = "agent"
                    item["why"] = (
                        "Useful as upstream lineage for comparison, but not a direct Gift Pack "
                        "reference image and not primary human-surface evidence."
                    )
            if "recommended_primary_surface" in information_audit:
                information_audit["recommended_primary_surface"] = [
                    "name and PMCG1 id",
                    "Gift Pack component lane and possible-content boundary",
                    "No Rarity target/caveat",
                    "collector texture note",
                    "category, rarity, and holo flag",
                ]
            component_card["information_audit"] = information_audit
            source_contacts = [
                {
                    "catalog_hash": source_hash,
                    "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
                    "catalog_path": str(source_path.relative_to(ROOT)),
                    "component_lane": lane,
                    "local_row_id": source_local_id,
                    "not_claiming": [
                        "fixed Gift Pack deck list",
                        "sealed Gift Pack contents",
                        "special-card identity",
                        "seller possession",
                        "authenticity",
                        "condition",
                        "price truth",
                    ],
                    "source": "Gift Pack product-component rollup",
                    "source_page_url": gift_pack_product_source_id(),
                    "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
                    "source_row_id": source_card.get("row_id", ""),
                },
            ]
            for contact in component_card.get("source_contacts", []):
                retargeted_contact = copy.deepcopy(contact)
                retargeted_contact["component_lane"] = lane
                retargeted_contact["inherited_from_component_release"] = True
                retargeted_contact["component_source_catalog_hash"] = source_hash
                retargeted_contact["component_source_release_family_id"] = source_release.get("release", {}).get("release_family_id", "")
                retargeted_contact["component_source_row_id"] = source_card.get("row_id", "")
                retargeted_contact["not_claiming"] = list(dict.fromkeys([
                    *retargeted_contact.get("not_claiming", []),
                    "fixed Gift Pack deck list",
                    "sealed Gift Pack contents",
                    "special-card identity",
                    "seller possession",
                    "authenticity",
                    "condition",
                    "price truth",
                ]))
                if retargeted_contact.get("image_large"):
                    retargeted_contact["not_allowed_by_default"] = list(dict.fromkeys([
                        *retargeted_contact.get("not_allowed_by_default", []),
                        "training",
                        "seller evidence",
                        "authentication proof",
                    ]))
                    retargeted_contact["rights_status"] = retargeted_contact.get("rights_status", "external_reference_witness")
                    retargeted_contact["display_allowed"] = False
                source_contacts.append(retargeted_contact)
            component_card["source_contacts"] = source_contacts
            component_card["not_claiming"] = list(dict.fromkeys([
                *component_card.get("not_claiming", []),
                "fixed Gift Pack deck list",
                "sealed Gift Pack contents",
                "special-card identity",
                "seller possession",
                "authenticity",
                "condition",
                "price truth",
            ]))
            component_card["tags"] = list(dict.fromkeys([
                config.release_family_id,
                config.name_en,
                lane,
                "possible Gift Pack Starter Pack component",
                *component_card.get("tags", []),
            ]))
            cards.append(component_card)
    source = {
        "source": "Marketplace Starter Pack possible-content rollup plus product context",
        "source_page_url": gift_pack_product_source_id(),
        "catalog_hash": source_hash,
        "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
        "path": str(source_path.relative_to(ROOT)),
        **source_docs,
        "component_lanes": list(gift_pack_component_lanes()),
        "component_rows_per_lane": len(source_release.get("cards", [])),
        "modeled_component_rows": len(cards),
        "product_card_count": config.product_card_count,
        "special_card_slots_documented": 2,
        "special_card_slots_row_modeled": False,
        "product_context_source": {
            "source": "PokemonWiki",
            "source_page_url": gift_snapshot["source_page_url"],
            "oldid_url": gift_snapshot["oldid_url"],
            "snapshot_path": gift_snapshot["snapshot_path"],
            "snapshot_hash": gift_snapshot["snapshot_hash"],
            "snapshot_schema": gift_snapshot["snapshot_schema"],
            "snapshot_retrieval_method": gift_snapshot["snapshot_retrieval_method"],
            "snapshot_content_scope": gift_snapshot["snapshot_content_scope"],
            "snapshot_not_claiming": gift_snapshot["snapshot_not_claiming"],
            "retrieved_at": gift_snapshot["retrieved_at"],
            "observed_release_date": gift_claims.get("release_date", config.release_date),
            "observed_total_card_count": gift_claims.get("product_card_count", 122),
            "observed_starter_pack_component_count": gift_claims.get("starter_pack_component_count", 2),
            "observed_special_card_slots": gift_claims.get("special_card_slots", 2),
            "observed_components": [
                "two Series 1 Starter Pack products",
                "two special-card slots",
                "play/guide materials",
            ],
            "not_claiming": [
                "raw HTML snapshot",
                "special-card identities",
                "sealed-unit contents",
                "seller possession",
                "authenticity",
                "condition",
            ],
        },
        "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
        "source_release_type": source_release.get("release", {}).get("release_type", ""),
        "cards_found": len(cards),
        "possible_content_rows": len(cards),
        "active_no_rarity_rows": sum(1 for card in cards if card.get("no_rarity_scope", {}).get("active_target")),
        "basic_energy_caveat_rows": sum(1 for card in cards if card.get("no_rarity_scope", {}).get("basic_energy_caveat")),
        "not_claiming": [
            "fixed Gift Pack deck list",
            "complete card-row model for special-card slots",
            "sealed Gift Pack contents",
            "seller possession",
            "authenticity",
            "condition",
            "price truth",
        ],
    }
    return {
        "schema": "marketplace.japanese_pre_english_release_catalog.v0.1",
        "release": {
            "release_family_id": config.release_family_id,
            "name_en": config.name_en,
            "name_ja": config.name_ja,
            "release_date": config.release_date,
            "date_precision": config.date_precision,
            "release_type": config.release_type,
            "expected_row_count": config.expected_row_count,
            "count_confidence": "product_component_rollup",
            "parent_release_family_id": "jp_tcg_starter_pack_19961020",
            "product_card_count": config.product_card_count,
            "product_count_basis": config.product_count_basis,
            "strict_release_member": config.strict_release_member,
            "unique_catalog_row_count": config.expected_row_count,
            "catalog_treatment": config.catalog_treatment,
            "component_lanes": list(gift_pack_component_lanes()),
            "unique_underlying_starter_rows": 102,
            "unmodeled_special_card_slots": 2,
            "note": config.note,
        },
        "symbol_status": {
            "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
            "confidence": config.symbol_status_confidence,
            "source": "data/pre-english-symbol-status.json and Japanese_Pre_English_Release_Map_v0.1.md",
            "scope": "release_context_not_row_fact",
            "source_mode": "direct_release_family",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller possession", "Base No Rarity proof without seller evidence"],
        },
        "sources": [source],
        "cards": cards,
        "not_claiming": [
            "complete pre-English catalog",
            "complete Gift Pack special-card row model",
            "fixed Gift Pack deck list",
            "sealed Gift Pack contents",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "approved image display rights",
        ],
    }


def build_team_rocket_gift_pack_product_rollup(config: ReleaseConfig) -> dict[str, Any]:
    source_path = RELEASE_DIR / "jp_tcg_rocket_gang_19971121.json"
    source_release = json.loads(source_path.read_text(encoding="utf-8"))
    source_hash = sha256_hex(source_release)
    source_docs = source_document_contacts()
    product_snapshot = team_rocket_gift_pack_source_snapshot()
    product_claims = product_snapshot["extracted_claims"]
    cards: list[dict[str, Any]] = []
    for lane in team_rocket_gift_pack_component_lanes():
        for source_card in source_release.get("cards", []):
            source_local_id = source_card.get("local_id", "")
            local_id = f"{lane}-{source_local_id}"
            row_id = f"{config.release_family_id}:{local_id}"
            component_card = copy.deepcopy(source_card)
            component_card["row_id"] = row_id
            component_card["release_family_id"] = config.release_family_id
            component_card["local_id"] = local_id
            component_card["team_rocket_gift_pack_scope"] = {
                "authority": (
                    "Deterministic Team Rocket Gift Pack product-component rollup over "
                    "two unresolved Rocket Gang deck lanes."
                ),
                "component_lane": lane,
                "component_type": "rocket_gang_deck_component_candidate",
                "fixed_product_context": True,
                "fixed_deck_card_member": False,
                "possible_content_pool": True,
                "product_rule": (
                    "Source-format context: Team Rocket Gift Pack is documented as a fixed "
                    "120-card product with two 60-card decks made from Rocket Gang expansion "
                    "cards. This row models an unresolved candidate source row only; it is not "
                    "a guarantee of sealed-unit contents, per-deck counts, collation, distribution, "
                    "or fixed deck composition."
                ),
                "source_catalog_hash": source_hash,
                "source_local_id": source_local_id,
                "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
                "source_row_id": source_card.get("row_id", ""),
                "unresolved_fixed_deck_lists": True,
                "not_claiming": [
                    "fixed Team Rocket Gift Pack deck list",
                    "sealed Team Rocket Gift Pack contents",
                    "per-deck card count for this row",
                    "seller possession",
                    "authenticity",
                    "condition",
                    "price truth",
                ],
            }
            source_product_scope = source_card.get("product_scope", {})
            component_card["product_scope"] = {
                "authority": "Team Rocket Gift Pack product-component rollup plus Japanese pre-English release map.",
                "catalog_treatment": config.catalog_treatment,
                "component_lane": lane,
                "counting_note": (
                    "Unresolved component candidate row for one of two fixed Team Rocket Gift Pack decks. "
                    "The 130 catalog rows are 2 x 65 Rocket Gang source candidates, not 130 physical cards "
                    "and not a guarantee of sealed-unit contents, per-deck counts, collation, distribution, "
                    "or fixed deck inclusion."
                ),
                "date_precision": config.date_precision,
                "japanese_booster_order": source_product_scope.get("japanese_booster_order"),
                "japanese_booster_section": source_product_scope.get("japanese_booster_section", ""),
                "japanese_set_name": config.name_ja,
                "membership_note": "Possible Team Rocket Gift Pack deck component candidate row; not a fixed deck inclusion.",
                "parent_release_family_id": "jp_tcg_rocket_gang_19971121",
                "product_card_count": config.product_card_count,
                "product_count_basis": config.product_count_basis,
                "release_date": config.release_date,
                "release_type": config.release_type,
                "source_rocket_gang_row": True,
                "source_strict_booster_member": bool(source_product_scope.get("strict_booster_member", True)),
                "strict_booster_member": False,
                "strict_release_member": False,
                "unique_catalog_row_count": config.expected_row_count,
                "unique_underlying_rocket_gang_rows": 65,
                "unresolved_fixed_deck_lists": True,
            }
            component_card["symbol_status"] = {
                "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
                "confidence": config.symbol_status_confidence,
                "scope": "release_context_not_row_fact",
                "source_mode": "direct_release_family",
                "source_release_family_id": config.release_family_id,
                "not_claiming": ["row-level physical truth", "seller-card symbol state", "seller possession"],
            }
            component_card["provider_row"] = {
                "adapter": "team_rocket_gift_pack_product_rollup",
                "component_lane": lane,
                "source_catalog_hash": source_hash,
                "source_provider_row": source_card.get("provider_row", {}),
                "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
                "source_row_id": source_card.get("row_id", ""),
                "source_local_id": source_local_id,
                "unresolved_fixed_deck_lists": True,
            }
            image = component_card.get("image_provenance", {})
            component_source_image_status = image.get("status", "")
            image["release_family_id"] = config.release_family_id
            image["row_id"] = row_id
            image["component_source_catalog_hash"] = source_hash
            image["component_source_release_family_id"] = source_release.get("release", {}).get("release_family_id", "")
            image["component_source_row_id"] = source_card.get("row_id", "")
            if component_source_image_status:
                image["component_source_image_lineage_status"] = component_source_image_status.replace(
                    "exact_source_image",
                    "source-row exact reference image",
                )
                image["component_source_image_lineage_authority"] = (
                    "lineage only; top-level status is the current Team Rocket Gift Pack image authority"
                )
                image["source_image_lineage_status"] = component_source_image_status.replace(
                    "exact_source_image",
                    "source-row exact reference image",
                )
                image["source_image_lineage_authority"] = (
                    "lineage only; top-level status is the current Team Rocket Gift Pack image authority"
                )
            if image.get("image_large"):
                image["status"] = "component_inherited_reference_image"
                image["image_role"] = (
                    "Component-inherited Rocket Gang reference image for lineage comparison; "
                    "not a direct Team Rocket Gift Pack image witness."
                )
                image["verification_status"] = (
                    "inherited through Team Rocket Gift Pack component rollup from Rocket Gang source row; "
                    "not direct Team Rocket Gift Pack image evidence"
                )
            image["exactness_basis"] = list(dict.fromkeys([
                *image.get("exactness_basis", []),
                "inherited Team Rocket Gift Pack component reference from Rocket Gang source row",
            ]))
            image["not_claiming"] = list(dict.fromkeys([
                *image.get("not_claiming", []),
                "sealed Team Rocket Gift Pack contents",
                "fixed Team Rocket Gift Pack deck inclusion",
                "per-deck count for this row",
            ]))
            component_card["image_provenance"] = image
            collector_texture = component_card.get("collector_texture", {})
            collector_texture["note"] = (
                f"{source_card.get('name_en', '')} is cataloged here as a Team Rocket Gift Pack "
                f"{lane} component candidate inherited from the Rocket Gang source rows. The useful "
                "claim is product-context possibility; the physical card still needs seller evidence."
            )
            collector_texture["signals"] = list(dict.fromkeys([
                config.name_en,
                lane,
                "unresolved Team Rocket Gift Pack deck component",
                *collector_texture.get("signals", []),
            ]))
            component_card["collector_texture"] = collector_texture
            information_audit = copy.deepcopy(component_card.get("information_audit", {}))
            information_audit["audit_scope"] = (
                "Team Rocket Gift Pack component information architecture only. Component-inherited "
                "images and source lineage help agents compare catalogs, but they do not authenticate "
                "a Gift Pack card, sealed contents, possession, condition, or price."
            )
            information_audit["team_rocket_gift_pack_component_override"] = {
                "authority": "Use the top-level image_provenance.status as the image authority.",
                "current_status": image.get("status", ""),
                "primary_surface_rule": (
                    "Do not present component-inherited images as direct Team Rocket Gift Pack images; "
                    "show them only behind lineage/reference comparison controls."
                ),
            }
            for item in information_audit.get("earns_keep", []):
                if item.get("field") in {"exact external reference image", "No Rarity reference image"}:
                    item["field"] = "component-inherited Rocket Gang reference image"
                    item["surface"] = "agent"
                    item["why"] = (
                        "Useful as upstream lineage for comparison, but not a direct Team Rocket "
                        "Gift Pack reference image and not primary human-surface evidence."
                    )
            component_card["information_audit"] = information_audit
            source_contacts = [
                {
                    "catalog_hash": source_hash,
                    "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
                    "catalog_path": str(source_path.relative_to(ROOT)),
                    "component_lane": lane,
                    "local_row_id": source_local_id,
                    "not_claiming": [
                        "fixed Team Rocket Gift Pack deck list",
                        "sealed Team Rocket Gift Pack contents",
                        "per-deck card count for this row",
                        "seller possession",
                        "authenticity",
                        "condition",
                        "price truth",
                    ],
                    "source": "Team Rocket Gift Pack product-component rollup",
                    "source_page_url": team_rocket_gift_pack_product_source_id(),
                    "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
                    "source_row_id": source_card.get("row_id", ""),
                },
            ]
            for contact in component_card.get("source_contacts", []):
                retargeted_contact = copy.deepcopy(contact)
                retargeted_contact["component_lane"] = lane
                retargeted_contact["inherited_from_component_release"] = True
                retargeted_contact["component_source_catalog_hash"] = source_hash
                retargeted_contact["component_source_release_family_id"] = source_release.get("release", {}).get("release_family_id", "")
                retargeted_contact["component_source_row_id"] = source_card.get("row_id", "")
                retargeted_contact["not_claiming"] = list(dict.fromkeys([
                    *retargeted_contact.get("not_claiming", []),
                    "fixed Team Rocket Gift Pack deck list",
                    "sealed Team Rocket Gift Pack contents",
                    "per-deck card count for this row",
                    "seller possession",
                    "authenticity",
                    "condition",
                    "price truth",
                ]))
                if retargeted_contact.get("image_large"):
                    retargeted_contact["not_allowed_by_default"] = list(dict.fromkeys([
                        *retargeted_contact.get("not_allowed_by_default", []),
                        "training",
                        "seller evidence",
                        "authentication proof",
                    ]))
                    retargeted_contact["rights_status"] = retargeted_contact.get("rights_status", "external_reference_witness")
                    retargeted_contact["display_allowed"] = False
                source_contacts.append(retargeted_contact)
            component_card["source_contacts"] = source_contacts
            component_card["not_claiming"] = list(dict.fromkeys([
                *component_card.get("not_claiming", []),
                "fixed Team Rocket Gift Pack deck list",
                "sealed Team Rocket Gift Pack contents",
                "per-deck card count for this row",
                "seller possession",
                "authenticity",
                "condition",
                "price truth",
            ]))
            component_card["tags"] = list(dict.fromkeys([
                config.release_family_id,
                config.name_en,
                lane,
                "unresolved Team Rocket Gift Pack deck component",
                *component_card.get("tags", []),
            ]))
            cards.append(component_card)
    source = {
        "source": "Marketplace Rocket Gang source catalog plus product context",
        "source_page_url": team_rocket_gift_pack_product_source_id(),
        "catalog_hash": source_hash,
        "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
        "path": str(source_path.relative_to(ROOT)),
        **source_docs,
        "component_lanes": list(team_rocket_gift_pack_component_lanes()),
        "component_rows_per_lane": len(source_release.get("cards", [])),
        "modeled_component_rows": len(cards),
        "modeled_candidate_rows": len(cards),
        "physical_product_card_count": config.product_card_count,
        "product_card_count": config.product_card_count,
        "fixed_deck_product_documented": True,
        "fixed_deck_lists_row_modeled": False,
        "product_context_source": {
            "source": "PokemonWiki",
            "source_page_url": product_snapshot["source_page_url"],
            "oldid_url": product_snapshot["oldid_url"],
            "snapshot_path": product_snapshot["snapshot_path"],
            "snapshot_hash": product_snapshot["snapshot_hash"],
            "snapshot_schema": product_snapshot["snapshot_schema"],
            "snapshot_retrieval_method": product_snapshot["snapshot_retrieval_method"],
            "snapshot_content_scope": product_snapshot["snapshot_content_scope"],
            "snapshot_not_claiming": product_snapshot["snapshot_not_claiming"],
            "retrieved_at": product_snapshot["retrieved_at"],
            "observed_release_date": product_claims.get("release_date", config.release_date),
            "observed_total_card_count": product_claims.get("product_card_count", 120),
            "observed_deck_count": product_claims.get("deck_count", 2),
            "observed_cards_per_deck": product_claims.get("cards_per_deck", 60),
            "observed_fixed_flag": product_claims.get("fixed_flag", ""),
            "observed_components": [
                "two 60-card Team Rocket decks",
                "play/guide materials",
            ],
            "not_claiming": [
                "raw HTML snapshot",
                "fixed per-deck card list",
                "sealed-unit contents",
                "seller possession",
                "authenticity",
                "condition",
            ],
        },
        "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
        "source_release_type": source_release.get("release", {}).get("release_type", ""),
        "cards_found": len(cards),
        "possible_content_rows": len(cards),
        "not_claiming": [
            "fixed Team Rocket Gift Pack deck list",
            "sealed Team Rocket Gift Pack contents",
            "per-deck card counts for modeled rows",
            "seller possession",
            "authenticity",
            "condition",
            "price truth",
        ],
    }
    return {
        "schema": "marketplace.japanese_pre_english_release_catalog.v0.1",
        "release": {
            "release_family_id": config.release_family_id,
            "name_en": config.name_en,
            "name_ja": config.name_ja,
            "release_date": config.release_date,
            "date_precision": config.date_precision,
            "release_type": config.release_type,
            "expected_row_count": config.expected_row_count,
            "count_confidence": "product_component_rollup_unresolved_fixed_deck_lists",
            "parent_release_family_id": "jp_tcg_rocket_gang_19971121",
            "product_card_count": config.product_card_count,
            "product_count_basis": config.product_count_basis,
            "strict_release_member": config.strict_release_member,
            "unique_catalog_row_count": config.expected_row_count,
            "catalog_treatment": config.catalog_treatment,
            "component_lanes": list(team_rocket_gift_pack_component_lanes()),
            "unique_underlying_rocket_gang_rows": 65,
            "unresolved_fixed_deck_lists": True,
            "note": config.note,
        },
        "symbol_status": {
            "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
            "confidence": config.symbol_status_confidence,
            "source": "data/pre-english-symbol-status.json and Japanese_Pre_English_Release_Map_v0.1.md",
            "scope": "release_context_not_row_fact",
            "source_mode": "direct_release_family",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller possession", "Base No Rarity proof without seller evidence"],
        },
        "sources": [source],
        "cards": cards,
        "not_claiming": [
            "complete pre-English catalog",
            "fixed Team Rocket Gift Pack deck list",
            "sealed Team Rocket Gift Pack contents",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "approved image display rights",
        ],
    }


def build_promo_family_child_rollup(config: ReleaseConfig) -> dict[str, Any]:
    spec = PROMO_FAMILY_CHILD_SPECS.get(config.release_family_id)
    if not spec:
        raise ValueError(f"missing promo family child spec for {config.release_family_id}")
    source_path = RELEASE_DIR / "jp_promo_unnumbered_pre_english_source_slice_19961015_19990131.json"
    source_release = json.loads(source_path.read_text(encoding="utf-8"))
    source_hash = sha256_hex(source_release)
    source_docs = source_document_contacts()
    promo_snapshot = promo_family_context_snapshot(str(spec.get("source_snapshot", "")))
    promo_claims = promo_snapshot["extracted_claims"]
    modeled_sorts = set(int(value) for value in spec.get("modeled_source_sorts", []))
    unmodeled_expected_cards = list(spec.get("unmodeled_expected_cards", []))
    cards: list[dict[str, Any]] = []
    source_rows = [
        source_card
        for source_card in source_release.get("cards", [])
        if source_card.get("promo_context", {}).get("promo_family_id") == config.release_family_id
        and int(source_card.get("provider_row", {}).get("sort", 0)) in modeled_sorts
    ]
    for source_card in sorted(source_rows, key=lambda card: int(card.get("provider_row", {}).get("sort", 0))):
        source_local_id = source_card.get("local_id", "")
        source_sort = int(source_card.get("provider_row", {}).get("sort", 0))
        row_id = f"{config.release_family_id}:{source_local_id}"
        child_card = copy.deepcopy(source_card)
        child_card["row_id"] = row_id
        child_card["release_family_id"] = config.release_family_id
        child_card["local_id"] = source_local_id
        child_card["promo_family_scope"] = {
            "authority": (
                "Promo-family child source slice over the source-pinned UPC aggregate row plus "
                f"a selected-line {promo_snapshot.get('source', 'context')} context snapshot."
            ),
            "promo_family_id": config.release_family_id,
            "strict_family_member_for_modeled_row": True,
            "complete_family_modeled": False,
            "expected_source_card_count": spec.get("expected_source_card_count", 0),
            "expected_cards": list(spec.get("expected_cards", [])),
            "modeled_source_sorts": list(spec.get("modeled_source_sorts", [])),
            "unmodeled_expected_cards": unmodeled_expected_cards,
            "source_gap_count": len(unmodeled_expected_cards),
            "source_gap_reason": spec.get("source_gap_reason", ""),
            "source_catalog_hash": source_hash,
            "source_local_id": source_local_id,
            "source_provider_sort": source_sort,
            "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
            "source_row_id": source_card.get("row_id", ""),
            "not_claiming": [
                "complete promo family checklist",
                "unmodeled expected card row",
                "official copy count",
                "seller possession",
                "authenticity",
                "condition",
                "price truth",
            ],
        }
        child_card["product_scope"] = {
            "authority": "Promo-family child source slice plus Japanese pre-English release map.",
            "catalog_treatment": config.catalog_treatment,
            "counting_note": (
                "This is a source-pinned child slice for one modeled UPC aggregate row. "
                f"The {promo_snapshot.get('source', 'context')} context snapshot expects "
                f"{spec.get('expected_source_card_count', 0)} cards for this family, while this "
                f"slice currently models {len(source_rows)} source-pinned row(s) and records "
                f"{len(unmodeled_expected_cards)} source gap(s). It must not be read as a full "
                "promo-family checklist beyond the source-pinned and explicitly caveated scope."
            ),
            "date_precision": config.date_precision,
            "japanese_set_name": config.name_ja,
            "membership_note": "Modeled source row is pinned to this promo family; the family checklist remains incomplete.",
            "parent_release_family_id": "jp_promo_unnumbered_pre_english_source_slice_19961015_19990131",
            "product_card_count": config.product_card_count,
            "product_count_basis": config.product_count_basis,
            "release_date": config.release_date,
            "release_type": config.release_type,
            "source_aggregate_row": True,
            "strict_release_member": False,
            "unique_catalog_row_count": config.expected_row_count,
            "expected_source_card_count": spec.get("expected_source_card_count", 0),
            "source_gap_count": len(unmodeled_expected_cards),
            "unmodeled_expected_cards": unmodeled_expected_cards,
        }
        child_card["symbol_status"] = {
            "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
            "confidence": config.symbol_status_confidence,
            "scope": "release_context_not_row_fact",
            "source_mode": "direct_promo_family_context",
            "source_release_family_id": config.release_family_id,
            "row_caveat": "Unnumbered promo context; not a Base No Rarity Expansion Pack claim.",
            "not_claiming": ["row-level physical truth", "seller-card symbol state", "seller possession", "Base No Rarity proof"],
        }
        child_card["provider_row"] = {
            "adapter": "promo_family_child_rollup",
            "source_catalog_hash": source_hash,
            "source_provider_row": source_card.get("provider_row", {}),
            "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
            "source_row_id": source_card.get("row_id", ""),
            "source_local_id": source_local_id,
            "source_sort": source_sort,
            "expected_source_card_count": spec.get("expected_source_card_count", 0),
            "source_gap_count": len(unmodeled_expected_cards),
        }
        image = child_card.get("image_provenance", {})
        image["release_family_id"] = config.release_family_id
        image["row_id"] = row_id
        image["promo_family_source_catalog_hash"] = source_hash
        image["promo_family_source_release_family_id"] = source_release.get("release", {}).get("release_family_id", "")
        image["promo_family_source_row_id"] = source_card.get("row_id", "")
        image["promo_family_source_sort"] = source_sort
        image["image_role"] = (
            "Provider-path-derived reference image for the source-pinned UPC row in this promo family; "
            "not a complete-family image witness and not seller evidence."
        )
        image["exactness_basis"] = list(dict.fromkeys([
            *image.get("exactness_basis", []),
            "source-pinned UPC aggregate row for this promo family child slice",
            f"family-level completeness checked against selected {promo_snapshot.get('source', 'context')} lines with explicit source-gap accounting",
        ]))
        image["not_claiming"] = list(dict.fromkeys([
            *image.get("not_claiming", []),
            "complete promo family",
            "unmodeled expected card row",
        ]))
        child_card["image_provenance"] = image
        collector_texture = child_card.get("collector_texture", {})
        collector_texture["note"] = (
            f"{source_card.get('name_en', '')} is cataloged as the currently source-pinned "
            f"row for {config.name_en}. The useful claim is precise family context plus explicit "
            "source accounting; the physical card still needs seller evidence."
        )
        collector_texture["signals"] = list(dict.fromkeys([
            config.name_en,
            config.release_date,
            "promo family source slice",
            "source accounting recorded",
            *collector_texture.get("signals", []),
        ]))
        child_card["collector_texture"] = collector_texture
        information_audit = copy.deepcopy(child_card.get("information_audit", {}))
        information_audit["audit_scope"] = (
            "Promo-family child information architecture only. The row image and source lineage "
            "help agents compare the modeled UPC row, but they do not complete the promo family, "
            "authenticate a card, prove possession, condition, or price."
        )
        information_audit["promo_family_child_override"] = {
            "authority": "Use promo_family_scope for family completeness; image_provenance remains row-reference only.",
            "current_status": image.get("status", ""),
            "primary_surface_rule": (
                "Show the modeled row as a reference witness and keep expected source count, modeled rows, "
                "and any source gaps visible in agent-facing audit/detail views."
            ),
        }
        child_card["information_audit"] = information_audit
        source_contacts = [
            {
                "catalog_hash": source_hash,
                "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
                "catalog_path": str(source_path.relative_to(ROOT)),
                "local_row_id": source_local_id,
                "not_claiming": [
                    "complete promo family checklist",
                    "unmodeled expected card row",
                    "official copy count",
                    "seller possession",
                    "authenticity",
                    "condition",
                    "price truth",
                ],
                "promo_family_id": config.release_family_id,
                "source": "Promo-family child source-slice rollup",
                "source_page_url": promo_family_child_source_id(),
                "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
                "source_row_id": source_card.get("row_id", ""),
                "source_sort": source_sort,
            },
            {
                "source": promo_snapshot.get("source", ""),
                "source_page_url": promo_snapshot["source_page_url"],
                "oldid_url": promo_snapshot["oldid_url"],
                "snapshot_path": promo_snapshot["snapshot_path"],
                "snapshot_hash": promo_snapshot["snapshot_hash"],
                "snapshot_schema": promo_snapshot["snapshot_schema"],
                "snapshot_retrieval_method": promo_snapshot["snapshot_retrieval_method"],
                "snapshot_content_scope": promo_snapshot["snapshot_content_scope"],
                "snapshot_not_claiming": promo_snapshot["snapshot_not_claiming"],
                "retrieved_at": promo_snapshot["retrieved_at"],
                "expected_cards": list(spec.get("expected_cards", [])),
                "unmodeled_expected_cards": unmodeled_expected_cards,
                "not_claiming": promo_snapshot["snapshot_not_claiming"],
            },
        ]
        for contact in child_card.get("source_contacts", []):
            retargeted_contact = copy.deepcopy(contact)
            retargeted_contact["inherited_from_promo_family_source"] = True
            retargeted_contact["promo_family_source_catalog_hash"] = source_hash
            retargeted_contact["promo_family_source_release_family_id"] = source_release.get("release", {}).get("release_family_id", "")
            retargeted_contact["promo_family_source_row_id"] = source_card.get("row_id", "")
            retargeted_contact["not_claiming"] = list(dict.fromkeys([
                *retargeted_contact.get("not_claiming", []),
                "complete promo family checklist",
                "unmodeled expected card row",
                "seller possession",
                "authenticity",
                "condition",
                "price truth",
            ]))
            source_contacts.append(retargeted_contact)
        child_card["source_contacts"] = source_contacts
        child_card["not_claiming"] = list(dict.fromkeys([
            *child_card.get("not_claiming", []),
            "complete promo family checklist",
            "unmodeled expected card row",
            "official copy count",
            "seller possession",
            "authenticity",
            "condition",
            "price truth",
        ]))
        child_card["tags"] = list(dict.fromkeys([
            config.release_family_id,
            config.name_en,
            "promo family source slice",
            "source accounting recorded",
            *child_card.get("tags", []),
        ]))
        cards.append(child_card)
    source = {
        "source": "Marketplace UPC aggregate promo-family child source-slice",
        "source_page_url": promo_family_child_source_id(),
        "catalog_hash": source_hash,
        "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
        "path": str(source_path.relative_to(ROOT)),
        **source_docs,
        "promo_family_id": config.release_family_id,
        "modeled_source_sorts": list(spec.get("modeled_source_sorts", [])),
        "modeled_source_rows": len(cards),
        "expected_source_card_count": spec.get("expected_source_card_count", 0),
        "expected_cards": list(spec.get("expected_cards", [])),
        "source_gap_count": len(unmodeled_expected_cards),
        "source_gap_reason": spec.get("source_gap_reason", ""),
        "unmodeled_expected_cards": unmodeled_expected_cards,
        "source_release_family_id": source_release.get("release", {}).get("release_family_id", ""),
        "source_release_type": source_release.get("release", {}).get("release_type", ""),
        "cards_found": len(cards),
        "family_context_source": {
            "source": promo_snapshot.get("source", ""),
            "source_page_url": promo_snapshot["source_page_url"],
            "oldid_url": promo_snapshot["oldid_url"],
            "snapshot_path": promo_snapshot["snapshot_path"],
            "snapshot_hash": promo_snapshot["snapshot_hash"],
            "snapshot_schema": promo_snapshot["snapshot_schema"],
            "snapshot_retrieval_method": promo_snapshot["snapshot_retrieval_method"],
            "snapshot_content_scope": promo_snapshot["snapshot_content_scope"],
            "snapshot_not_claiming": promo_snapshot["snapshot_not_claiming"],
            "retrieved_at": promo_snapshot["retrieved_at"],
            "extracted_claims": promo_claims,
            "selected_text": promo_snapshot["selected_text"],
            "not_claiming": promo_snapshot["snapshot_not_claiming"],
        },
        "not_claiming": [
            "complete promo family checklist",
            "unmodeled expected card row",
            "official copy count",
            "seller possession",
            "authenticity",
            "condition",
            "price truth",
        ],
    }
    return {
        "schema": "marketplace.japanese_pre_english_release_catalog.v0.1",
        "release": {
            "release_family_id": config.release_family_id,
            "name_en": config.name_en,
            "name_ja": config.name_ja,
            "release_date": config.release_date,
            "date_precision": config.date_precision,
            "release_type": config.release_type,
            "expected_row_count": config.expected_row_count,
            "count_confidence": "promo_family_child_source_slice_with_source_gap",
            "parent_release_family_id": "jp_promo_unnumbered_pre_english_source_slice_19961015_19990131",
            "product_card_count": config.product_card_count,
            "product_count_basis": config.product_count_basis,
            "strict_release_member": config.strict_release_member,
            "unique_catalog_row_count": config.expected_row_count,
            "catalog_treatment": config.catalog_treatment,
            "expected_source_card_count": spec.get("expected_source_card_count", 0),
            "source_gap_count": len(unmodeled_expected_cards),
            "unmodeled_expected_cards": unmodeled_expected_cards,
            "note": config.note,
        },
        "symbol_status": {
            "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
            "confidence": config.symbol_status_confidence,
            "source": "data/pre-english-symbol-status.json, Japanese_Pre_English_Release_Map_v0.1.md, and selected promo-family context snapshot lines",
            "scope": "release_context_not_row_fact",
            "source_mode": "direct_promo_family_context",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller possession", "Base No Rarity proof without seller evidence"],
        },
        "sources": [source],
        "cards": cards,
        "not_claiming": [
            "complete pre-English catalog",
            "complete promo family checklist",
            "unmodeled expected card row",
            "official copy count",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "approved image display rights",
        ],
    }


def build_quick_starter_parent_rollup(config: ReleaseConfig) -> dict[str, Any]:
    child_releases: list[dict[str, Any]] = []
    parent_rows: list[dict[str, Any]] = []
    for lane, child_id in quick_starter_child_specs():
        child_path = RELEASE_DIR / f"{child_id}.json"
        child_release = json.loads(child_path.read_text(encoding="utf-8"))
        child_releases.append(child_release)
        child_hash = sha256_hex(child_release)
        for child_card in child_release.get("cards", []):
            parent_card = copy.deepcopy(child_card)
            child_local_id = child_card.get("local_id", "")
            parent_local_id = f"{lane}-{child_local_id}"
            parent_row_id = f"{config.release_family_id}:{parent_local_id}"
            parent_card["row_id"] = parent_row_id
            parent_card["release_family_id"] = config.release_family_id
            parent_card["local_id"] = parent_local_id
            parent_card["parent_rollup"] = {
                "authority": "Deterministic parent-product rollup over source-backed child deck rows.",
                "child_catalog_hash": child_hash,
                "child_local_id": child_local_id,
                "child_release_family_id": child_id,
                "child_row_id": child_card.get("row_id", ""),
                "lane": lane,
                "not_claiming": ["new source page", "deduplicated product count", "seller possession", "authenticity"],
            }
            parent_card["product_scope"] = {
                "authority": "Parent product rollup derived from source-backed Quick Starter red and green deck child catalogs.",
                "catalog_treatment": config.catalog_treatment,
                "counting_note": (
                    f"This row belongs to the {lane} deck lane inside Quick Starter Gift Set; "
                    "it is not a No Rarity Base claim."
                ),
                "date_precision": config.date_precision,
                "japanese_set_name": config.name_ja,
                "membership_note": "Strict parent product rollup row; child lane is preserved.",
                "parent_release_family_id": "",
                "product_card_count": config.product_card_count,
                "product_count_basis": config.product_count_basis,
                "release_date": config.release_date,
                "release_type": config.release_type,
                "strict_release_member": config.strict_release_member,
                "unique_catalog_row_count": config.expected_row_count,
            }
            parent_card["symbol_status"] = {
                "prints_without_rarity_symbol": config.prints_without_rarity_symbol,
                "confidence": config.symbol_status_confidence,
                "scope": "release_context_not_row_fact",
                "source_mode": "direct_release_family",
                "source_release_family_id": config.release_family_id,
                "not_claiming": ["row-level physical truth", "seller-card symbol state", "seller possession"],
            }
            parent_card["image_provenance"]["release_family_id"] = config.release_family_id
            parent_card["image_provenance"]["row_id"] = parent_row_id
            parent_card["collector_texture"]["note"] = (
                f"{child_card.get('name_en', '')} is cataloged here as {parent_local_id} "
                f"of Quick Starter Gift Set, inherited from the {lane} child deck source row. "
                "Treat the image as a reference witness, then ask for seller evidence before any trade."
            )
            parent_card["collector_texture"]["signals"] = [
                config.name_en,
                parent_local_id,
                child_card.get("rarity_source", ""),
                config.release_date,
                f"{lane} deck",
            ]
            parent_tags = [
                config.release_family_id,
                config.name_en,
                config.release_date,
                f"{lane} deck",
            ]
            for tag in (child_card.get("rarity_source"), child_card.get("category")):
                if tag and tag not in parent_tags:
                    parent_tags.append(tag)
            parent_card["tags"] = parent_tags
            parent_rows.append(parent_card)
    source = {
        "source": "Marketplace child catalog rollup",
        "source_page_url": quick_starter_rollup_source_id(),
        "child_catalogs": [
            {
                "release_family_id": child.get("release", {}).get("release_family_id", ""),
                "catalog_hash": sha256_hex(child),
                "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
                "path": str((RELEASE_DIR / f"{child.get('release', {}).get('release_family_id', '')}.json").relative_to(ROOT)),
                "row_count": len(child.get("cards", [])),
                "source_adapter": child.get("sources", [{}])[0].get("source", ""),
                "source_page_url": child.get("sources", [{}])[0].get("source_page_url", ""),
                "not_claiming": ["official source", "new source page", "seller possession", "authenticity", "condition"],
            }
            for child in child_releases
        ],
        "cards_found": len(parent_rows),
        "not_claiming": ["official source", "new source page", "seller possession", "authenticity", "condition"],
    }
    return {
        "schema": "marketplace.japanese_pre_english_release_catalog.v0.1",
        "release": {
            "release_family_id": config.release_family_id,
            "name_en": config.name_en,
            "name_ja": config.name_ja,
            "release_date": config.release_date,
            "date_precision": config.date_precision,
            "release_type": config.release_type,
            "expected_row_count": config.expected_row_count,
            "count_confidence": "child_catalog_rollup",
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
            "source_mode": "direct_release_family",
            "source_release_family_id": config.release_family_id,
            "not_claiming": ["row-level physical truth", "seller possession", "Base No Rarity claim"],
        },
        "sources": [source],
        "cards": parent_rows,
        "not_claiming": [
            "complete pre-English catalog",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "approved image display rights",
            "new source page",
        ],
    }


def audit_release(release: dict[str, Any]) -> dict[str, Any]:
    cards = release.get("cards", [])
    release_meta = release.get("release", {})
    release_sources = release.get("sources", [])
    primary_source = release_sources[0] if release_sources else {}
    expected = release_meta.get("expected_row_count")
    release_type = release_meta.get("release_type", "")
    row_ids = [card.get("row_id") for card in cards]
    image_witness_statuses = {
        "exact_source_image",
        "provider_path_reference_image",
        "inherited_source_reference_image",
        "component_inherited_reference_image",
    }
    image_rows = [card for card in cards if card.get("image_provenance", {}).get("status") in image_witness_statuses]
    exact_source_image_rows = [card for card in cards if card.get("image_provenance", {}).get("status") == "exact_source_image"]
    provider_path_reference_image_rows = [
        card for card in cards if card.get("image_provenance", {}).get("status") == "provider_path_reference_image"
    ]
    inherited_source_reference_image_rows = [
        card for card in cards if card.get("image_provenance", {}).get("status") == "inherited_source_reference_image"
    ]
    component_inherited_reference_image_rows = [
        card for card in cards if card.get("image_provenance", {}).get("status") == "component_inherited_reference_image"
    ]
    tcgdex_rows = [card for card in cards if card.get("tcgdex", {}).get("id")]
    name_ja_rows = [card for card in cards if card.get("name_ja_status") == "source_labeled"]
    promo_context_rows = [card for card in cards if card.get("promo_context", {}).get("promo_family_id")]
    product_context_source = primary_source.get("product_context_source", {})
    family_context_source = primary_source.get("family_context_source", {})
    failures: list[str] = []
    starter_source_release: dict[str, Any] = {}
    starter_source_rows: dict[str, dict[str, Any]] = {}
    if release_type == "launch_starter_pack_possible_rows":
        source_path = RELEASE_DIR / "jp_tcg_expansion_pack_19961020.json"
        try:
            starter_source_release = json.loads(source_path.read_text(encoding="utf-8"))
            starter_source_rows = {
                source_card.get("local_id", ""): source_card
                for source_card in starter_source_release.get("cards", [])
            }
        except FileNotFoundError:
            failures.append("starter_pack_possible_source_file_missing")
    gift_pack_source_release: dict[str, Any] = {}
    gift_pack_source_rows: dict[str, dict[str, Any]] = {}
    if release_type == "gift_pack_starter_component_possible_rows":
        source_path = RELEASE_DIR / "jp_tcg_starter_pack_19961020.json"
        try:
            gift_pack_source_release = json.loads(source_path.read_text(encoding="utf-8"))
            gift_pack_source_rows = {
                source_card.get("local_id", ""): source_card
                for source_card in gift_pack_source_release.get("cards", [])
            }
        except FileNotFoundError:
            failures.append("gift_pack_component_source_file_missing")
    team_rocket_gift_pack_source_release: dict[str, Any] = {}
    team_rocket_gift_pack_source_rows: dict[str, dict[str, Any]] = {}
    if release_type == "team_rocket_gift_pack_deck_component_possible_rows":
        source_path = RELEASE_DIR / "jp_tcg_rocket_gang_19971121.json"
        try:
            team_rocket_gift_pack_source_release = json.loads(source_path.read_text(encoding="utf-8"))
            team_rocket_gift_pack_source_rows = {
                source_card.get("local_id", ""): source_card
                for source_card in team_rocket_gift_pack_source_release.get("cards", [])
            }
        except FileNotFoundError:
            failures.append("team_rocket_gift_pack_component_source_file_missing")
    promo_family_source_release: dict[str, Any] = {}
    promo_family_source_rows: dict[str, dict[str, Any]] = {}
    if release_type == "promo_family_child_rollup_rows":
        source_path = RELEASE_DIR / "jp_promo_unnumbered_pre_english_source_slice_19961015_19990131.json"
        try:
            promo_family_source_release = json.loads(source_path.read_text(encoding="utf-8"))
            promo_family_source_rows = {
                source_card.get("local_id", ""): source_card
                for source_card in promo_family_source_release.get("cards", [])
            }
        except FileNotFoundError:
            failures.append("promo_family_child_source_file_missing")
    quick_starter_children: dict[str, dict[str, Any]] = {}
    quick_starter_child_rows: dict[tuple[str, str], dict[str, Any]] = {}
    if release_type == "deck_kit_parent_rollup_rows":
        for _, child_id in quick_starter_child_specs():
            child_path = RELEASE_DIR / f"{child_id}.json"
            try:
                child_release = json.loads(child_path.read_text(encoding="utf-8"))
            except FileNotFoundError:
                failures.append(f"quick_starter_parent_missing_child_file {child_id}")
                continue
            quick_starter_children[child_id] = child_release
            for child_card in child_release.get("cards", []):
                quick_starter_child_rows[(child_id, child_card.get("local_id", ""))] = child_card
    if len(cards) != expected:
        failures.append(f"row_count_mismatch expected={expected} actual={len(cards)}")
    if len(set(row_ids)) != len(row_ids):
        failures.append("duplicate_row_ids")
    if release_type == "promo_aggregate_filtered_rows" and release_meta.get("strict_release_member") is not False:
        failures.append("promo_aggregate_strict_release_member_overclaim")
    if release_type == "promo_cd_source_rows" and release_meta.get("strict_release_member") is not True:
        failures.append("promo_cd_rows_must_be_strict_release_members")
    if release_type == "video_game_insert_promo_rows" and release_meta.get("strict_release_member") is not True:
        failures.append("video_game_insert_rows_must_be_strict_release_members")
    if release_type == "deck_kit_parent_rollup_rows" and release_meta.get("strict_release_member") is not True:
        failures.append("deck_kit_parent_rollup_rows_must_be_strict_release_members")
    if release_type == "launch_starter_pack_possible_rows" and release_meta.get("strict_release_member") is not False:
        failures.append("starter_pack_possible_release_must_not_claim_strict_membership")
    if release_type == "gift_pack_starter_component_possible_rows" and release_meta.get("strict_release_member") is not False:
        failures.append("gift_pack_component_release_must_not_claim_strict_membership")
    if release_type == "team_rocket_gift_pack_deck_component_possible_rows" and release_meta.get("strict_release_member") is not False:
        failures.append("team_rocket_gift_pack_component_release_must_not_claim_strict_membership")
    if release_type == "promo_family_child_rollup_rows" and release_meta.get("strict_release_member") is not False:
        failures.append("promo_family_child_release_must_not_claim_strict_membership")
    for card in cards:
        image = card.get("image_provenance", {})
        provider_row = card.get("provider_row", {})
        allowed_missing_no_rarity_caveat = (
            release_type in {
                "launch_family_no_rarity_lab_rows",
                "launch_starter_pack_possible_rows",
                "gift_pack_starter_component_possible_rows",
            }
            and image.get("status") == "missing_reference_image"
            and card.get("no_rarity_scope", {}).get("basic_energy_caveat") is True
        )
        if image.get("status") not in image_witness_statuses and not allowed_missing_no_rarity_caveat:
            failures.append(f"{card.get('row_id')}: image_not_reference_witness")
        if "seller possession" not in card.get("not_claiming", []):
            failures.append(f"{card.get('row_id')}: missing_seller_possession_boundary")
        if image.get("rights_status") != "external_reference_witness" and not allowed_missing_no_rarity_caveat:
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
                contact.get("card_data_hash")
                and (contact.get("encrypted_page_sha256") or contact.get("payload_hash"))
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
        if release_type == "video_game_insert_promo_rows":
            promo_context = card.get("promo_context", {})
            if provider_row.get("adapter") != "pokecardex":
                failures.append(f"{card.get('row_id')}: gameboy_wrong_adapter")
            if provider_row.get("series_code") != "UPC" or provider_row.get("sort") != 60:
                failures.append(f"{card.get('row_id')}: gameboy_not_upc_sort_60")
            if card.get("local_id") != "060":
                failures.append(f"{card.get('row_id')}: gameboy_local_id_not_source_sort")
            if promo_context.get("promo_family_id") != "jp_promo_card_gb_dragonite_19981218":
                failures.append(f"{card.get('row_id')}: gameboy_promo_context_mismatch")
            if promo_context.get("date_label") != "1998-12-18":
                failures.append(f"{card.get('row_id')}: gameboy_date_mismatch")
            if card.get("product_scope", {}).get("strict_release_member") is not True:
                failures.append(f"{card.get('row_id')}: gameboy_row_not_strict_release_member")
            if card.get("name_ja_status") != "source_labeled" or not card.get("romaji"):
                failures.append(f"{card.get('row_id')}: gameboy_missing_bulbapedia_name_source")
            if card.get("image_provenance", {}).get("release_family_id") != release_meta.get("release_family_id"):
                failures.append(f"{card.get('row_id')}: gameboy_image_release_family_mismatch")
            if card.get("image_provenance", {}).get("row_id") != card.get("row_id"):
                failures.append(f"{card.get('row_id')}: gameboy_image_row_id_mismatch")
            expected_url = f"{POKECARDEX_BASE}/assets/images/sets_jp/UPC/60.jpg"
            if image.get("image_large") != expected_url or image.get("image_small") != expected_url:
                failures.append(f"{card.get('row_id')}: gameboy_image_url_not_provider_path")
            if image.get("status") != "provider_path_reference_image":
                failures.append(f"{card.get('row_id')}: gameboy_image_status_overclaims_exact_source")
            if not any(
                contact.get("source") == "PokéCardex"
                and contact.get("card_data_hash")
                and contact.get("payload_hash")
                for contact in card.get("source_contacts", [])
            ):
                failures.append(f"{card.get('row_id')}: gameboy_missing_pokecardex_source_hash")
            if not any(
                contact.get("source") == "Bulbapedia"
                and contact.get("card_page_sha256")
                and "Dragonite" in contact.get("card_page_url", "")
                for contact in card.get("source_contacts", [])
            ):
                failures.append(f"{card.get('row_id')}: gameboy_missing_bulbapedia_source_hash")
        if release_type == "launch_family_no_rarity_lab_rows":
            no_rarity_scope = card.get("no_rarity_scope", {})
            strict_booster_member = card.get("product_scope", {}).get("strict_booster_member")
            target = no_rarity_scope.get("active_target")
            caveat = no_rarity_scope.get("basic_energy_caveat")
            expected_row_id = f"{release_meta.get('release_family_id')}:{card.get('local_id')}"
            if card.get("row_id") != expected_row_id:
                failures.append(f"{card.get('row_id')}: no_rarity_lab_row_id_mismatch")
            if card.get("tcgdex", {}).get("set_id") != "PMCG1":
                failures.append(f"{card.get('row_id')}: no_rarity_lab_wrong_tcgdex_set")
            if card.get("provider_row", {}).get("local_catalog_row") != f"PMCG1-{card.get('local_id')}":
                failures.append(f"{card.get('row_id')}: no_rarity_lab_local_anchor_mismatch")
            if strict_booster_member is not target:
                failures.append(f"{card.get('row_id')}: no_rarity_lab_target_booster_scope_mismatch")
            if caveat is target:
                failures.append(f"{card.get('row_id')}: no_rarity_lab_target_caveat_not_complementary")
            if target and image.get("status") != "exact_source_image":
                failures.append(f"{card.get('row_id')}: no_rarity_lab_target_missing_exact_image")
            if target and not image.get("image_large"):
                failures.append(f"{card.get('row_id')}: no_rarity_lab_target_missing_image_url")
            if caveat and image.get("status") != "missing_reference_image":
                failures.append(f"{card.get('row_id')}: no_rarity_lab_caveat_should_not_have_reference_image")
            if caveat and image.get("image_large"):
                failures.append(f"{card.get('row_id')}: no_rarity_lab_caveat_has_substitute_image")
            if card.get("symbol_status", {}).get("prints_without_rarity_symbol") != "mixed":
                failures.append(f"{card.get('row_id')}: no_rarity_lab_symbol_status_not_mixed")
            if not any(
                contact.get("source") == "No Rarity local catalog"
                and contact.get("catalog_hash")
                and contact.get("policy_hash")
                for contact in card.get("source_contacts", [])
            ):
                failures.append(f"{card.get('row_id')}: no_rarity_lab_missing_local_catalog_contact")
        if release_type == "launch_starter_pack_possible_rows":
            starter_scope = card.get("starter_pack_scope", {})
            local_id = card.get("local_id", "")
            expected_row_id = f"{release_meta.get('release_family_id')}:{local_id}"
            source_card = starter_source_rows.get(local_id)
            source_hash = sha256_hex(starter_source_release) if starter_source_release else ""
            if card.get("row_id") != expected_row_id:
                failures.append(f"{card.get('row_id')}: starter_pack_possible_row_id_mismatch")
            if card.get("tcgdex", {}).get("set_id") != "PMCG1":
                failures.append(f"{card.get('row_id')}: starter_pack_possible_wrong_tcgdex_set")
            if starter_scope.get("possible_content_pool") is not True:
                failures.append(f"{card.get('row_id')}: starter_pack_possible_pool_flag_missing")
            if starter_scope.get("fixed_deck_member") is not False:
                failures.append(f"{card.get('row_id')}: starter_pack_possible_fixed_deck_overclaim")
            if starter_scope.get("source_release_family_id") != "jp_tcg_expansion_pack_19961020":
                failures.append(f"{card.get('row_id')}: starter_pack_possible_source_release_mismatch")
            if starter_scope.get("source_row_id") != f"jp_tcg_expansion_pack_19961020:{local_id}":
                failures.append(f"{card.get('row_id')}: starter_pack_possible_source_row_mismatch")
            if starter_scope.get("source_catalog_hash") != source_hash:
                failures.append(f"{card.get('row_id')}: starter_pack_possible_source_hash_mismatch")
            if card.get("product_scope", {}).get("release_type") != "launch_starter_pack_possible_rows":
                failures.append(f"{card.get('row_id')}: starter_pack_possible_product_scope_type_mismatch")
            if card.get("product_scope", {}).get("strict_release_member") is not False:
                failures.append(f"{card.get('row_id')}: starter_pack_possible_row_strict_member_overclaim")
            if card.get("product_scope", {}).get("product_card_count") != 60:
                failures.append(f"{card.get('row_id')}: starter_pack_possible_product_count_mismatch")
            counting_note = card.get("product_scope", {}).get("counting_note", "").lower()
            product_rule = starter_scope.get("product_rule", "").lower()
            if "not a guarantee" not in counting_note or "fixed deck" not in counting_note:
                failures.append(f"{card.get('row_id')}: starter_pack_possible_counting_note_missing_boundary")
            if "not a guarantee" not in product_rule or "fixed deck" not in product_rule:
                failures.append(f"{card.get('row_id')}: starter_pack_possible_product_rule_missing_boundary")
            if card.get("product_scope", {}).get("strict_booster_member") is not False:
                failures.append(f"{card.get('row_id')}: starter_pack_possible_current_booster_member_overclaim")
            if card.get("symbol_status", {}).get("prints_without_rarity_symbol") != "mixed":
                failures.append(f"{card.get('row_id')}: starter_pack_possible_symbol_not_mixed")
            if card.get("symbol_status", {}).get("source_release_family_id") != release_meta.get("release_family_id"):
                failures.append(f"{card.get('row_id')}: starter_pack_possible_symbol_source_mismatch")
            if card.get("provider_row", {}).get("adapter") != "starter_pack_possible_rollup":
                failures.append(f"{card.get('row_id')}: starter_pack_possible_provider_adapter_mismatch")
            if card.get("provider_row", {}).get("source_catalog_hash") != source_hash:
                failures.append(f"{card.get('row_id')}: starter_pack_possible_provider_source_hash_mismatch")
            if image.get("release_family_id") != release_meta.get("release_family_id"):
                failures.append(f"{card.get('row_id')}: starter_pack_possible_image_release_family_mismatch")
            if image.get("row_id") != card.get("row_id"):
                failures.append(f"{card.get('row_id')}: starter_pack_possible_image_row_id_mismatch")
            if "sealed deck contents" not in image.get("not_claiming", []):
                failures.append(f"{card.get('row_id')}: starter_pack_possible_image_boundary_missing")
            if image.get("status") == "inherited_source_reference_image":
                if image.get("source_image_release_family_id") != "jp_tcg_expansion_pack_19961020":
                    failures.append(f"{card.get('row_id')}: starter_pack_possible_image_source_release_missing")
                if image.get("source_image_row_id") != f"jp_tcg_expansion_pack_19961020:{local_id}":
                    failures.append(f"{card.get('row_id')}: starter_pack_possible_image_source_row_mismatch")
                if image.get("source_image_catalog_hash") != source_hash:
                    failures.append(f"{card.get('row_id')}: starter_pack_possible_image_source_hash_mismatch")
            if not any(
                contact.get("source") == "Starter Pack possible-content rollup"
                and contact.get("catalog_hash") == source_hash
                and contact.get("source_row_id") == f"jp_tcg_expansion_pack_19961020:{local_id}"
                for contact in card.get("source_contacts", [])
            ):
                failures.append(f"{card.get('row_id')}: starter_pack_possible_missing_rollup_contact")
            inherited_contacts = [
                contact for contact in card.get("source_contacts", [])
                if contact.get("source") != "Starter Pack possible-content rollup"
            ]
            required_contact_boundaries = {"fixed deck list", "sealed deck contents", "seller possession", "authenticity", "condition", "price truth"}
            for contact in inherited_contacts:
                if contact.get("inherited_from_source_release") is not True:
                    failures.append(f"{card.get('row_id')}: starter_pack_possible_inherited_contact_unmarked")
                    break
                if contact.get("source_catalog_hash") != source_hash:
                    failures.append(f"{card.get('row_id')}: starter_pack_possible_inherited_contact_hash_mismatch")
                    break
                if not required_contact_boundaries.issubset(set(contact.get("not_claiming", []))):
                    failures.append(f"{card.get('row_id')}: starter_pack_possible_inherited_contact_boundary_missing")
                    break
                if contact.get("image_large") and (
                    contact.get("display_allowed") is not False
                    or contact.get("rights_status") != "external_reference_witness"
                    or not {"training", "seller evidence", "authentication proof"}.issubset(set(contact.get("not_allowed_by_default", [])))
                ):
                    failures.append(f"{card.get('row_id')}: starter_pack_possible_inherited_image_contact_use_boundary_missing")
                    break
            if source_card:
                copied_fields = [
                    "name_en",
                    "name_ja",
                    "name_ja_status",
                    "romaji",
                    "name_source_note",
                    "category",
                    "rarity_source",
                    "holo_source",
                    "pokemon_profile",
                    "illustrator",
                    "tcgdex",
                    "no_rarity_scope",
                    "variant_traps",
                ]
                for field in copied_fields:
                    if card.get(field) != source_card.get(field):
                        failures.append(f"{card.get('row_id')}: starter_pack_possible_source_field_drift {field}")
                        break
                source_image = source_card.get("image_provenance", {})
                for field in [
                    "image_large",
                    "image_small",
                    "provider_id",
                    "provider_title",
                    "source",
                    "source_page_url",
                    "rights_status",
                ]:
                    if image.get(field) != source_image.get(field):
                        failures.append(f"{card.get('row_id')}: starter_pack_possible_source_image_drift {field}")
                        break
                if image.get("source_image_status") != source_image.get("status"):
                    failures.append(f"{card.get('row_id')}: starter_pack_possible_source_image_status_drift")
                if source_image.get("status") == "exact_source_image" and image.get("status") != "inherited_source_reference_image":
                    failures.append(f"{card.get('row_id')}: starter_pack_possible_image_status_not_inherited")
            else:
                failures.append(f"{card.get('row_id')}: starter_pack_possible_missing_source_row")
        if release_type == "gift_pack_starter_component_possible_rows":
            gift_scope = card.get("gift_pack_scope", {})
            lane = gift_scope.get("component_lane")
            source_local_id = gift_scope.get("source_local_id", "")
            expected_local_id = f"{lane}-{source_local_id}" if lane and source_local_id else ""
            expected_row_id = f"{release_meta.get('release_family_id')}:{expected_local_id}" if expected_local_id else ""
            source_card = gift_pack_source_rows.get(source_local_id)
            source_hash = sha256_hex(gift_pack_source_release) if gift_pack_source_release else ""
            if lane not in set(gift_pack_component_lanes()):
                failures.append(f"{card.get('row_id')}: gift_pack_component_invalid_lane")
            if card.get("local_id") != expected_local_id:
                failures.append(f"{card.get('row_id')}: gift_pack_component_local_id_mismatch")
            if card.get("row_id") != expected_row_id:
                failures.append(f"{card.get('row_id')}: gift_pack_component_row_id_mismatch")
            if gift_scope.get("possible_content_pool") is not True:
                failures.append(f"{card.get('row_id')}: gift_pack_component_pool_flag_missing")
            if gift_scope.get("fixed_gift_pack_card_member") is not False:
                failures.append(f"{card.get('row_id')}: gift_pack_component_fixed_member_overclaim")
            if gift_scope.get("source_release_family_id") != "jp_tcg_starter_pack_19961020":
                failures.append(f"{card.get('row_id')}: gift_pack_component_source_release_mismatch")
            if gift_scope.get("source_row_id") != f"jp_tcg_starter_pack_19961020:{source_local_id}":
                failures.append(f"{card.get('row_id')}: gift_pack_component_source_row_mismatch")
            if gift_scope.get("source_catalog_hash") != source_hash:
                failures.append(f"{card.get('row_id')}: gift_pack_component_source_hash_mismatch")
            if gift_scope.get("unmodeled_special_card_slots") != 2:
                failures.append(f"{card.get('row_id')}: gift_pack_component_special_slot_count_missing")
            product_rule = gift_scope.get("product_rule", "").lower()
            if "not a guarantee" not in product_rule or "special-card" not in product_rule or "fixed deck" not in product_rule:
                failures.append(f"{card.get('row_id')}: gift_pack_component_product_rule_missing_boundary")
            product_scope = card.get("product_scope", {})
            if product_scope.get("release_type") != "gift_pack_starter_component_possible_rows":
                failures.append(f"{card.get('row_id')}: gift_pack_component_product_scope_type_mismatch")
            if product_scope.get("catalog_treatment") == "Catalog target":
                failures.append(f"{card.get('row_id')}: gift_pack_component_catalog_treatment_overclaims_target")
            if product_scope.get("component_lane") != lane:
                failures.append(f"{card.get('row_id')}: gift_pack_component_product_lane_mismatch")
            if product_scope.get("strict_release_member") is not False:
                failures.append(f"{card.get('row_id')}: gift_pack_component_row_strict_member_overclaim")
            if product_scope.get("strict_booster_member") is not False:
                failures.append(f"{card.get('row_id')}: gift_pack_component_current_booster_member_overclaim")
            if product_scope.get("product_card_count") != 122:
                failures.append(f"{card.get('row_id')}: gift_pack_component_product_count_mismatch")
            counting_note = product_scope.get("counting_note", "").lower()
            if "not 204 physical cards" not in counting_note or "not a guarantee" not in counting_note:
                failures.append(f"{card.get('row_id')}: gift_pack_component_counting_note_missing_boundary")
            if card.get("symbol_status", {}).get("prints_without_rarity_symbol") != "unverified":
                failures.append(f"{card.get('row_id')}: gift_pack_component_symbol_not_unverified")
            if card.get("provider_row", {}).get("adapter") != "gift_pack_product_rollup":
                failures.append(f"{card.get('row_id')}: gift_pack_component_provider_adapter_mismatch")
            if card.get("provider_row", {}).get("source_catalog_hash") != source_hash:
                failures.append(f"{card.get('row_id')}: gift_pack_component_provider_source_hash_mismatch")
            if image.get("release_family_id") != release_meta.get("release_family_id"):
                failures.append(f"{card.get('row_id')}: gift_pack_component_image_release_family_mismatch")
            if image.get("row_id") != card.get("row_id"):
                failures.append(f"{card.get('row_id')}: gift_pack_component_image_row_id_mismatch")
            if "sealed Gift Pack contents" not in image.get("not_claiming", []):
                failures.append(f"{card.get('row_id')}: gift_pack_component_image_boundary_missing")
            if image.get("status") == "component_inherited_reference_image":
                if image.get("component_source_release_family_id") != "jp_tcg_starter_pack_19961020":
                    failures.append(f"{card.get('row_id')}: gift_pack_component_image_source_release_missing")
                if image.get("component_source_row_id") != f"jp_tcg_starter_pack_19961020:{source_local_id}":
                    failures.append(f"{card.get('row_id')}: gift_pack_component_image_source_row_mismatch")
                if image.get("component_source_catalog_hash") != source_hash:
                    failures.append(f"{card.get('row_id')}: gift_pack_component_image_source_hash_mismatch")
                if "source_image_status" in image:
                    failures.append(f"{card.get('row_id')}: gift_pack_component_legacy_source_image_status_not_path_safe")
                if "exact_source_image" in image.get("source_image_lineage_status", ""):
                    failures.append(f"{card.get('row_id')}: gift_pack_component_lineage_status_overclaims_exact_source")
                information_audit = card.get("information_audit", {})
                if information_audit.get("gift_pack_component_override", {}).get("current_status") != image.get("status"):
                    failures.append(f"{card.get('row_id')}: gift_pack_component_information_audit_status_mismatch")
                for item in information_audit.get("earns_keep", []):
                    if item.get("field") == "No Rarity reference image" and item.get("surface") == "primary":
                        failures.append(f"{card.get('row_id')}: gift_pack_component_information_audit_primary_image_overclaim")
                        break
            if not any(
                contact.get("source") == "Gift Pack product-component rollup"
                and contact.get("catalog_hash") == source_hash
                and contact.get("component_lane") == lane
                and contact.get("source_row_id") == f"jp_tcg_starter_pack_19961020:{source_local_id}"
                for contact in card.get("source_contacts", [])
            ):
                failures.append(f"{card.get('row_id')}: gift_pack_component_missing_rollup_contact")
            component_contacts = [
                contact for contact in card.get("source_contacts", [])
                if contact.get("source") != "Gift Pack product-component rollup"
            ]
            required_contact_boundaries = {
                "fixed Gift Pack deck list",
                "sealed Gift Pack contents",
                "special-card identity",
                "seller possession",
                "authenticity",
                "condition",
                "price truth",
            }
            for contact in component_contacts:
                if contact.get("inherited_from_component_release") is not True:
                    failures.append(f"{card.get('row_id')}: gift_pack_component_inherited_contact_unmarked")
                    break
                if contact.get("component_source_catalog_hash") != source_hash:
                    failures.append(f"{card.get('row_id')}: gift_pack_component_inherited_contact_hash_mismatch")
                    break
                if not required_contact_boundaries.issubset(set(contact.get("not_claiming", []))):
                    failures.append(f"{card.get('row_id')}: gift_pack_component_inherited_contact_boundary_missing")
                    break
                if contact.get("image_large") and (
                    contact.get("display_allowed") is not False
                    or contact.get("rights_status") != "external_reference_witness"
                    or not {"training", "seller evidence", "authentication proof"}.issubset(set(contact.get("not_allowed_by_default", [])))
                ):
                    failures.append(f"{card.get('row_id')}: gift_pack_component_inherited_image_contact_use_boundary_missing")
                    break
            if source_card:
                copied_fields = [
                    "name_en",
                    "name_ja",
                    "name_ja_status",
                    "romaji",
                    "name_source_note",
                    "category",
                    "rarity_source",
                    "holo_source",
                    "pokemon_profile",
                    "illustrator",
                    "tcgdex",
                    "no_rarity_scope",
                    "variant_traps",
                ]
                for field in copied_fields:
                    if card.get(field) != source_card.get(field):
                        failures.append(f"{card.get('row_id')}: gift_pack_component_source_field_drift {field}")
                        break
                source_image = source_card.get("image_provenance", {})
                for field in [
                    "image_large",
                    "image_small",
                    "provider_id",
                    "provider_title",
                    "source",
                    "source_page_url",
                    "rights_status",
                ]:
                    if image.get(field) != source_image.get(field):
                        failures.append(f"{card.get('row_id')}: gift_pack_component_source_image_drift {field}")
                        break
                if image.get("component_source_image_status") != source_image.get("status"):
                    failures.append(f"{card.get('row_id')}: gift_pack_component_source_image_status_drift")
                if source_image.get("status") == "inherited_source_reference_image" and image.get("status") != "component_inherited_reference_image":
                    failures.append(f"{card.get('row_id')}: gift_pack_component_image_status_not_component_inherited")
            else:
                failures.append(f"{card.get('row_id')}: gift_pack_component_missing_source_row")
        if release_type == "team_rocket_gift_pack_deck_component_possible_rows":
            rocket_scope = card.get("team_rocket_gift_pack_scope", {})
            lane = rocket_scope.get("component_lane")
            source_local_id = rocket_scope.get("source_local_id", "")
            expected_local_id = f"{lane}-{source_local_id}" if lane and source_local_id else ""
            expected_row_id = f"{release_meta.get('release_family_id')}:{expected_local_id}" if expected_local_id else ""
            source_card = team_rocket_gift_pack_source_rows.get(source_local_id)
            source_hash = sha256_hex(team_rocket_gift_pack_source_release) if team_rocket_gift_pack_source_release else ""
            if lane not in set(team_rocket_gift_pack_component_lanes()):
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_invalid_lane")
            if card.get("local_id") != expected_local_id:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_local_id_mismatch")
            if card.get("row_id") != expected_row_id:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_row_id_mismatch")
            if rocket_scope.get("possible_content_pool") is not True:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_pool_flag_missing")
            if rocket_scope.get("fixed_product_context") is not True:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_fixed_product_context_missing")
            if rocket_scope.get("fixed_deck_card_member") is not False:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_fixed_member_overclaim")
            if rocket_scope.get("source_release_family_id") != "jp_tcg_rocket_gang_19971121":
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_source_release_mismatch")
            if rocket_scope.get("source_row_id") != f"jp_tcg_rocket_gang_19971121:{source_local_id}":
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_source_row_mismatch")
            if rocket_scope.get("source_catalog_hash") != source_hash:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_source_hash_mismatch")
            if rocket_scope.get("unresolved_fixed_deck_lists") is not True:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_unresolved_deck_flag_missing")
            product_rule = rocket_scope.get("product_rule", "").lower()
            if "not a guarantee" not in product_rule or "fixed deck" not in product_rule or "120-card" not in product_rule:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_product_rule_missing_boundary")
            product_scope = card.get("product_scope", {})
            if product_scope.get("release_type") != "team_rocket_gift_pack_deck_component_possible_rows":
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_product_scope_type_mismatch")
            if product_scope.get("catalog_treatment") == "Catalog target":
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_catalog_treatment_overclaims_target")
            if product_scope.get("component_lane") != lane:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_product_lane_mismatch")
            if product_scope.get("strict_release_member") is not False:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_row_strict_member_overclaim")
            if product_scope.get("strict_booster_member") is not False:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_current_booster_member_overclaim")
            if product_scope.get("product_card_count") != 120:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_product_count_mismatch")
            counting_note = product_scope.get("counting_note", "").lower()
            if "not 130 physical cards" not in counting_note or "not a guarantee" not in counting_note:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_counting_note_missing_boundary")
            if card.get("symbol_status", {}).get("prints_without_rarity_symbol") != "unverified":
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_symbol_not_unverified")
            if card.get("provider_row", {}).get("adapter") != "team_rocket_gift_pack_product_rollup":
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_provider_adapter_mismatch")
            if card.get("provider_row", {}).get("source_catalog_hash") != source_hash:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_provider_source_hash_mismatch")
            if image.get("release_family_id") != release_meta.get("release_family_id"):
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_image_release_family_mismatch")
            if image.get("row_id") != card.get("row_id"):
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_image_row_id_mismatch")
            if "sealed Team Rocket Gift Pack contents" not in image.get("not_claiming", []):
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_image_boundary_missing")
            if image.get("status") == "component_inherited_reference_image":
                if image.get("component_source_release_family_id") != "jp_tcg_rocket_gang_19971121":
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_image_source_release_missing")
                if image.get("component_source_row_id") != f"jp_tcg_rocket_gang_19971121:{source_local_id}":
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_image_source_row_mismatch")
                if image.get("component_source_catalog_hash") != source_hash:
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_image_source_hash_mismatch")
                if "component_source_image_status" in image:
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_source_image_status_not_path_safe")
                if "source_image_status" in image:
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_legacy_source_image_status_not_path_safe")
                if "exact_source_image" in image.get("component_source_image_lineage_status", ""):
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_component_lineage_status_overclaims_exact_source")
                if "exact_source_image" in image.get("source_image_lineage_status", ""):
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_lineage_status_overclaims_exact_source")
                if "Exact external reference witness" in image.get("image_role", ""):
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_image_role_direct_exact_overclaim")
                information_audit = card.get("information_audit", {})
                override = information_audit.get("team_rocket_gift_pack_component_override", {})
                if override.get("current_status") != image.get("status"):
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_information_audit_status_mismatch")
                for item in information_audit.get("earns_keep", []):
                    if item.get("field") == "exact external reference image" and item.get("surface") == "primary":
                        failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_information_audit_primary_image_overclaim")
                        break
            if not any(
                contact.get("source") == "Team Rocket Gift Pack product-component rollup"
                and contact.get("catalog_hash") == source_hash
                and contact.get("component_lane") == lane
                and contact.get("source_row_id") == f"jp_tcg_rocket_gang_19971121:{source_local_id}"
                for contact in card.get("source_contacts", [])
            ):
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_missing_rollup_contact")
            component_contacts = [
                contact for contact in card.get("source_contacts", [])
                if contact.get("source") != "Team Rocket Gift Pack product-component rollup"
            ]
            required_contact_boundaries = {
                "fixed Team Rocket Gift Pack deck list",
                "sealed Team Rocket Gift Pack contents",
                "per-deck card count for this row",
                "seller possession",
                "authenticity",
                "condition",
                "price truth",
            }
            for contact in component_contacts:
                if contact.get("inherited_from_component_release") is not True:
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_inherited_contact_unmarked")
                    break
                if contact.get("component_source_catalog_hash") != source_hash:
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_inherited_contact_hash_mismatch")
                    break
                if not required_contact_boundaries.issubset(set(contact.get("not_claiming", []))):
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_inherited_contact_boundary_missing")
                    break
                if contact.get("image_large") and (
                    contact.get("display_allowed") is not False
                    or contact.get("rights_status") != "external_reference_witness"
                    or not {"training", "seller evidence", "authentication proof"}.issubset(set(contact.get("not_allowed_by_default", [])))
                ):
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_inherited_image_contact_use_boundary_missing")
                    break
            if source_card:
                copied_fields = [
                    "name_en",
                    "name_ja",
                    "name_ja_status",
                    "romaji",
                    "name_source_note",
                    "category",
                    "rarity_source",
                    "holo_source",
                    "pokemon_profile",
                    "illustrator",
                    "tcgdex",
                    "variant_traps",
                ]
                for field in copied_fields:
                    if card.get(field) != source_card.get(field):
                        failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_source_field_drift {field}")
                        break
                source_image = source_card.get("image_provenance", {})
                for field in [
                    "image_large",
                    "image_small",
                    "provider_id",
                    "provider_title",
                    "source",
                    "source_page_url",
                    "rights_status",
                ]:
                    if image.get(field) != source_image.get(field):
                        failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_source_image_drift {field}")
                        break
                expected_lineage_status = source_image.get("status", "").replace(
                    "exact_source_image",
                    "source-row exact reference image",
                )
                if image.get("component_source_image_lineage_status") != expected_lineage_status:
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_source_image_status_drift")
                if source_image.get("status") == "exact_source_image" and image.get("status") != "component_inherited_reference_image":
                    failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_image_status_not_component_inherited")
            else:
                failures.append(f"{card.get('row_id')}: team_rocket_gift_pack_component_missing_source_row")
        if release_type == "promo_family_child_rollup_rows":
            family_spec = PROMO_FAMILY_CHILD_SPECS.get(release_meta.get("release_family_id", ""), {})
            family_scope = card.get("promo_family_scope", {})
            source_local_id = family_scope.get("source_local_id", "")
            source_card = promo_family_source_rows.get(source_local_id)
            source_hash = sha256_hex(promo_family_source_release) if promo_family_source_release else ""
            expected_row_id = f"{release_meta.get('release_family_id')}:{source_local_id}" if source_local_id else ""
            expected_sorts = set(int(value) for value in family_spec.get("modeled_source_sorts", []))
            source_sort = family_scope.get("source_provider_sort")
            if not family_spec:
                failures.append(f"{card.get('row_id')}: promo_family_child_missing_spec")
            if card.get("row_id") != expected_row_id:
                failures.append(f"{card.get('row_id')}: promo_family_child_row_id_mismatch")
            if family_scope.get("promo_family_id") != release_meta.get("release_family_id"):
                failures.append(f"{card.get('row_id')}: promo_family_child_scope_family_mismatch")
            if family_scope.get("strict_family_member_for_modeled_row") is not True:
                failures.append(f"{card.get('row_id')}: promo_family_child_modeled_row_not_strict")
            if family_scope.get("complete_family_modeled") is not False:
                failures.append(f"{card.get('row_id')}: promo_family_child_complete_family_overclaim")
            if family_scope.get("expected_source_card_count") != family_spec.get("expected_source_card_count"):
                failures.append(f"{card.get('row_id')}: promo_family_child_expected_count_mismatch")
            if family_scope.get("modeled_source_sorts") != family_spec.get("modeled_source_sorts"):
                failures.append(f"{card.get('row_id')}: promo_family_child_modeled_sorts_mismatch")
            if family_scope.get("unmodeled_expected_cards") != family_spec.get("unmodeled_expected_cards"):
                failures.append(f"{card.get('row_id')}: promo_family_child_unmodeled_cards_mismatch")
            if family_scope.get("source_gap_count") != len(family_spec.get("unmodeled_expected_cards", [])):
                failures.append(f"{card.get('row_id')}: promo_family_child_gap_count_mismatch")
            if not family_scope.get("source_gap_reason"):
                failures.append(f"{card.get('row_id')}: promo_family_child_gap_reason_missing")
            if family_scope.get("source_catalog_hash") != source_hash:
                failures.append(f"{card.get('row_id')}: promo_family_child_source_hash_mismatch")
            if family_scope.get("source_release_family_id") != "jp_promo_unnumbered_pre_english_source_slice_19961015_19990131":
                failures.append(f"{card.get('row_id')}: promo_family_child_source_release_mismatch")
            if family_scope.get("source_row_id") != f"jp_promo_unnumbered_pre_english_source_slice_19961015_19990131:{source_local_id}":
                failures.append(f"{card.get('row_id')}: promo_family_child_source_row_mismatch")
            if source_sort not in expected_sorts:
                failures.append(f"{card.get('row_id')}: promo_family_child_source_sort_not_modeled")
            if card.get("product_scope", {}).get("release_type") != "promo_family_child_rollup_rows":
                failures.append(f"{card.get('row_id')}: promo_family_child_product_scope_type_mismatch")
            if card.get("product_scope", {}).get("strict_release_member") is not False:
                failures.append(f"{card.get('row_id')}: promo_family_child_row_strict_member_overclaim")
            if card.get("product_scope", {}).get("expected_source_card_count") != family_spec.get("expected_source_card_count"):
                failures.append(f"{card.get('row_id')}: promo_family_child_product_expected_count_mismatch")
            if card.get("product_scope", {}).get("source_gap_count") != len(family_spec.get("unmodeled_expected_cards", [])):
                failures.append(f"{card.get('row_id')}: promo_family_child_product_gap_count_mismatch")
            counting_note = card.get("product_scope", {}).get("counting_note", "").lower()
            if "not be read as a full promo-family checklist" not in counting_note:
                failures.append(f"{card.get('row_id')}: promo_family_child_counting_note_missing_boundary")
            if card.get("symbol_status", {}).get("prints_without_rarity_symbol") != "yes":
                failures.append(f"{card.get('row_id')}: promo_family_child_symbol_not_yes")
            if card.get("symbol_status", {}).get("source_mode") != "direct_promo_family_context":
                failures.append(f"{card.get('row_id')}: promo_family_child_symbol_source_mode_mismatch")
            if card.get("provider_row", {}).get("adapter") != "promo_family_child_rollup":
                failures.append(f"{card.get('row_id')}: promo_family_child_provider_adapter_mismatch")
            if card.get("provider_row", {}).get("source_catalog_hash") != source_hash:
                failures.append(f"{card.get('row_id')}: promo_family_child_provider_source_hash_mismatch")
            if image.get("release_family_id") != release_meta.get("release_family_id"):
                failures.append(f"{card.get('row_id')}: promo_family_child_image_release_family_mismatch")
            if image.get("row_id") != card.get("row_id"):
                failures.append(f"{card.get('row_id')}: promo_family_child_image_row_id_mismatch")
            if image.get("status") != "provider_path_reference_image":
                failures.append(f"{card.get('row_id')}: promo_family_child_image_status_mismatch")
            if image.get("rights_status") != "external_reference_witness":
                failures.append(f"{card.get('row_id')}: promo_family_child_image_rights_status_mismatch")
            if image.get("display_allowed") is not False:
                failures.append(f"{card.get('row_id')}: promo_family_child_image_display_allowed_overclaim")
            if set(image.get("allowed_use", [])) != {"manual_review", "catalog_reference_link"}:
                failures.append(f"{card.get('row_id')}: promo_family_child_image_allowed_use_mismatch")
            required_not_allowed = {"training", "seller evidence", "authentication proof"}
            if not required_not_allowed.issubset(set(image.get("not_allowed_by_default", []))):
                failures.append(f"{card.get('row_id')}: promo_family_child_image_not_allowed_boundary_missing")
            if image.get("promo_family_source_catalog_hash") != source_hash:
                failures.append(f"{card.get('row_id')}: promo_family_child_image_source_hash_mismatch")
            if image.get("promo_family_source_row_id") != f"jp_promo_unnumbered_pre_english_source_slice_19961015_19990131:{source_local_id}":
                failures.append(f"{card.get('row_id')}: promo_family_child_image_source_row_mismatch")
            if "complete promo family" not in image.get("not_claiming", []):
                failures.append(f"{card.get('row_id')}: promo_family_child_image_family_boundary_missing")
            required_image_not_claiming = {
                "seller possession",
                "seller card match",
                "condition",
                "authenticity",
                "complete promo family",
                "unmodeled expected card row",
            }
            if not required_image_not_claiming.issubset(set(image.get("not_claiming", []))):
                failures.append(f"{card.get('row_id')}: promo_family_child_image_not_claiming_boundary_missing")
            if not any(
                contact.get("source") == "Promo-family child source-slice rollup"
                and contact.get("catalog_hash") == source_hash
                and contact.get("source_row_id") == f"jp_promo_unnumbered_pre_english_source_slice_19961015_19990131:{source_local_id}"
                for contact in card.get("source_contacts", [])
            ):
                failures.append(f"{card.get('row_id')}: promo_family_child_missing_rollup_contact")
            if not any(
                contact.get("source") == family_context_source.get("source")
                and contact.get("snapshot_hash")
                and contact.get("unmodeled_expected_cards") == family_spec.get("unmodeled_expected_cards")
                for contact in card.get("source_contacts", [])
            ):
                failures.append(f"{card.get('row_id')}: promo_family_child_missing_context_gap_contact")
            inherited_contacts = [
                contact for contact in card.get("source_contacts", [])
                if contact.get("source") not in {
                    "Promo-family child source-slice rollup",
                    family_context_source.get("source"),
                }
            ]
            for contact in inherited_contacts:
                if contact.get("inherited_from_promo_family_source") is not True:
                    failures.append(f"{card.get('row_id')}: promo_family_child_inherited_contact_unmarked")
                    break
                if contact.get("promo_family_source_catalog_hash") != source_hash:
                    failures.append(f"{card.get('row_id')}: promo_family_child_inherited_contact_hash_mismatch")
                    break
                if "unmodeled expected card row" not in contact.get("not_claiming", []):
                    failures.append(f"{card.get('row_id')}: promo_family_child_inherited_contact_boundary_missing")
                    break
            if source_card:
                copied_fields = [
                    "name_en",
                    "name_ja",
                    "name_ja_status",
                    "romaji",
                    "name_source_note",
                    "category",
                    "rarity_source",
                    "holo_source",
                    "pokemon_profile",
                    "illustrator",
                    "tcgdex",
                    "promo_context",
                ]
                for field in copied_fields:
                    if card.get(field) != source_card.get(field):
                        failures.append(f"{card.get('row_id')}: promo_family_child_source_field_drift {field}")
                        break
                source_image = source_card.get("image_provenance", {})
                for field in [
                    "image_large",
                    "image_small",
                    "provider_id",
                    "provider_title",
                    "source",
                    "source_page_url",
                    "rights_status",
                    "verification_status",
                ]:
                    if image.get(field) != source_image.get(field):
                        failures.append(f"{card.get('row_id')}: promo_family_child_source_image_drift {field}")
                        break
            else:
                failures.append(f"{card.get('row_id')}: promo_family_child_missing_source_row")
        if release_type == "deck_kit_parent_rollup_rows":
            parent_rollup = card.get("parent_rollup", {})
            lane = parent_rollup.get("lane")
            child_id = parent_rollup.get("child_release_family_id")
            child_local_id = parent_rollup.get("child_local_id")
            if lane not in {"red", "green"}:
                failures.append(f"{card.get('row_id')}: quick_starter_parent_invalid_lane")
            if child_id not in {
                "jp_tcg_quick_starter_gift_set_red_deck_19981204",
                "jp_tcg_quick_starter_gift_set_green_deck_19981204",
            }:
                failures.append(f"{card.get('row_id')}: quick_starter_parent_invalid_child_release")
            if not child_local_id:
                failures.append(f"{card.get('row_id')}: quick_starter_parent_missing_child_local_id")
            expected_local_id = f"{lane}-{child_local_id}" if lane and child_local_id else ""
            if card.get("local_id") != expected_local_id:
                failures.append(f"{card.get('row_id')}: quick_starter_parent_local_id_mismatch")
            expected_child_row_id = f"{child_id}:{child_local_id}" if child_id and child_local_id else ""
            if parent_rollup.get("child_row_id") != expected_child_row_id:
                failures.append(f"{card.get('row_id')}: quick_starter_parent_child_row_id_mismatch")
            expected_row_id = f"{release_meta.get('release_family_id')}:{card.get('local_id')}"
            if card.get("row_id") != expected_row_id:
                failures.append(f"{card.get('row_id')}: quick_starter_parent_row_id_mismatch")
            if image.get("release_family_id") != release_meta.get("release_family_id"):
                failures.append(f"{card.get('row_id')}: quick_starter_parent_image_release_family_mismatch")
            if image.get("row_id") != card.get("row_id"):
                failures.append(f"{card.get('row_id')}: quick_starter_parent_image_row_id_mismatch")
            if card.get("product_scope", {}).get("release_type") != "deck_kit_parent_rollup_rows":
                failures.append(f"{card.get('row_id')}: quick_starter_parent_product_scope_not_parent")
            if card.get("product_scope", {}).get("strict_release_member") is not True:
                failures.append(f"{card.get('row_id')}: quick_starter_parent_row_not_strict_member")
            if card.get("symbol_status", {}).get("source_release_family_id") != release_meta.get("release_family_id"):
                failures.append(f"{card.get('row_id')}: quick_starter_parent_symbol_not_direct")
            child_card = quick_starter_child_rows.get((child_id, child_local_id))
            if not child_card:
                failures.append(f"{card.get('row_id')}: quick_starter_parent_missing_child_row")
            else:
                copied_fields = [
                    "name_en",
                    "name_ja",
                    "name_ja_status",
                    "romaji",
                    "name_source_note",
                    "category",
                    "rarity_source",
                    "holo_source",
                    "pokemon_profile",
                    "illustrator",
                    "provider_row",
                    "tcgdex",
                    "source_contacts",
                ]
                for field in copied_fields:
                    if card.get(field) != child_card.get(field):
                        failures.append(f"{card.get('row_id')}: quick_starter_parent_child_field_drift {field}")
                        break
                child_image = child_card.get("image_provenance", {})
                for field in [
                    "image_large",
                    "image_small",
                    "provider_id",
                    "provider_title",
                    "source",
                    "source_page_url",
                    "status",
                    "rights_status",
                    "verification_status",
                ]:
                    if image.get(field) != child_image.get(field):
                        failures.append(f"{card.get('row_id')}: quick_starter_parent_child_image_drift {field}")
                        break
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
    if release_type == "launch_family_no_rarity_lab_rows":
        targets = [card for card in cards if card.get("no_rarity_scope", {}).get("active_target") is True]
        caveats = [card for card in cards if card.get("no_rarity_scope", {}).get("basic_energy_caveat") is True]
        exact_target_images = [
            card for card in targets
            if card.get("image_provenance", {}).get("status") == "exact_source_image"
            and card.get("image_provenance", {}).get("image_large")
        ]
        caveat_missing_images = [
            card for card in caveats
            if card.get("image_provenance", {}).get("status") == "missing_reference_image"
            and not card.get("image_provenance", {}).get("image_large")
        ]
        trap_rows = [card for card in cards if card.get("variant_traps")]
        expected_caveat_ids = {f"{release_meta.get('release_family_id')}:{local_id}" for local_id in {"097", "098", "099", "100", "101", "102"}}
        if release_meta.get("strict_release_member") is not False:
            failures.append("no_rarity_lab_release_should_not_be_strict_all_rows")
        if release.get("symbol_status", {}).get("prints_without_rarity_symbol") != "mixed":
            failures.append("no_rarity_lab_release_symbol_status_should_be_mixed")
        if len(targets) != 96:
            failures.append(f"no_rarity_lab_target_count actual={len(targets)}")
        if len(caveats) != 6:
            failures.append(f"no_rarity_lab_caveat_count actual={len(caveats)}")
        if len(exact_target_images) != 96:
            failures.append(f"no_rarity_lab_exact_target_image_count actual={len(exact_target_images)}")
        if len(caveat_missing_images) != 6:
            failures.append(f"no_rarity_lab_caveat_missing_image_count actual={len(caveat_missing_images)}")
        if {card.get("row_id") for card in caveats} != expected_caveat_ids:
            failures.append("no_rarity_lab_caveat_ids_mismatch")
        if len(trap_rows) != 5:
            failures.append(f"no_rarity_lab_quick_starter_trap_count actual={len(trap_rows)}")
        try:
            lab = json.loads(NO_RARITY_CATALOG_PATH.read_text(encoding="utf-8"))
            policy = json.loads(NO_RARITY_POLICY_PATH.read_text(encoding="utf-8"))
            no_rarity_manifest = json.loads(NO_RARITY_MANIFEST_PATH.read_text(encoding="utf-8"))
            symbol_status = json.loads((ROOT / no_rarity_manifest["symbol_status_matrix"]["path"]).read_text(encoding="utf-8"))
            expected_catalog_hash = sha256_hex(lab)
            expected_policy_hash = sha256_hex(policy)
            expected_manifest_hash = sha256_hex(no_rarity_manifest)
            expected_symbol_hash = sha256_hex(symbol_status)
            if primary_source.get("catalog_hash") != expected_catalog_hash:
                failures.append("no_rarity_lab_source_hash_mismatch")
            if primary_source.get("policy_hash") != expected_policy_hash:
                failures.append("no_rarity_lab_policy_hash_mismatch")
            if primary_source.get("catalog_manifest_hash") != expected_manifest_hash:
                failures.append("no_rarity_lab_manifest_hash_mismatch")
            if primary_source.get("source_page_url") != no_rarity_lab_source_id():
                failures.append("no_rarity_lab_source_page_url_mismatch")
            if primary_source.get("rows_found") != len(cards):
                failures.append("no_rarity_lab_source_rows_found_mismatch")
            if primary_source.get("active_no_rarity_rows") != 96:
                failures.append("no_rarity_lab_source_active_count_mismatch")
            if primary_source.get("basic_energy_caveat_rows") != 6:
                failures.append("no_rarity_lab_source_caveat_count_mismatch")
            if no_rarity_manifest.get("catalog", {}).get("catalog_hash") != expected_catalog_hash:
                failures.append("no_rarity_lab_manifest_catalog_hash_stale")
            if no_rarity_manifest.get("policy", {}).get("policy_hash") != expected_policy_hash:
                failures.append("no_rarity_lab_manifest_policy_hash_stale")
            if no_rarity_manifest.get("symbol_status_matrix", {}).get("symbol_status_hash") != expected_symbol_hash:
                failures.append("no_rarity_lab_manifest_symbol_status_hash_stale")
            preimage = no_rarity_manifest.get("bundle", {}).get("preimage", {})
            expected_preimage = {
                "catalog_hash": expected_catalog_hash,
                "policy_hash": expected_policy_hash,
                "symbol_status_hash": expected_symbol_hash,
                "release_family": "no_rarity_base_set",
                "schema": "marketplace.catalog_release_bundle.v0.1",
            }
            if preimage != expected_preimage:
                failures.append("no_rarity_lab_manifest_bundle_preimage_stale")
            if no_rarity_manifest.get("bundle", {}).get("bundle_hash") != sha256_hex(expected_preimage):
                failures.append("no_rarity_lab_manifest_bundle_hash_stale")
            for card in cards:
                expected_local_row = f"PMCG1-{card.get('local_id')}"
                local_contacts = [
                    contact for contact in card.get("source_contacts", [])
                    if contact.get("source") == "No Rarity local catalog"
                ]
                if len(local_contacts) != 1:
                    failures.append(f"{card.get('row_id')}: no_rarity_lab_local_contact_count")
                    continue
                contact = local_contacts[0]
                if contact.get("catalog_hash") != expected_catalog_hash:
                    failures.append(f"{card.get('row_id')}: no_rarity_lab_row_catalog_hash_mismatch")
                if contact.get("policy_hash") != expected_policy_hash:
                    failures.append(f"{card.get('row_id')}: no_rarity_lab_row_policy_hash_mismatch")
                if contact.get("catalog_manifest_hash") != expected_manifest_hash:
                    failures.append(f"{card.get('row_id')}: no_rarity_lab_row_manifest_hash_mismatch")
                if contact.get("source_page_url") != no_rarity_lab_source_id():
                    failures.append(f"{card.get('row_id')}: no_rarity_lab_row_source_page_url_mismatch")
                if contact.get("local_row_id") != expected_local_row or card.get("provider_row", {}).get("local_catalog_row") != expected_local_row:
                    failures.append(f"{card.get('row_id')}: no_rarity_lab_row_local_row_id_mismatch")
                not_claiming = set(contact.get("not_claiming", []))
                required = {"seller possession", "authenticity", "condition", "price truth"}
                if not required.issubset(not_claiming):
                    failures.append(f"{card.get('row_id')}: no_rarity_lab_row_contact_boundary_missing")
                image_boundary = set(card.get("image_provenance", {}).get("not_claiming", []))
                image_required = {"seller possession", "seller card match", "condition", "authenticity"}
                if not image_required.issubset(image_boundary):
                    failures.append(f"{card.get('row_id')}: no_rarity_lab_image_boundary_missing")
                    break
        except FileNotFoundError:
            failures.append("no_rarity_lab_source_file_missing")
    if release_type == "launch_starter_pack_possible_rows":
        targets = [card for card in cards if card.get("no_rarity_scope", {}).get("active_target") is True]
        caveats = [card for card in cards if card.get("no_rarity_scope", {}).get("basic_energy_caveat") is True]
        exact_target_images = [
            card for card in targets
            if card.get("image_provenance", {}).get("status") == "inherited_source_reference_image"
            and card.get("image_provenance", {}).get("image_large")
        ]
        caveat_missing_images = [
            card for card in caveats
            if card.get("image_provenance", {}).get("status") == "missing_reference_image"
            and not card.get("image_provenance", {}).get("image_large")
        ]
        fixed_deck_overclaims = [
            card for card in cards
            if card.get("starter_pack_scope", {}).get("fixed_deck_member") is not False
            or card.get("product_scope", {}).get("strict_release_member") is not False
        ]
        source_strict_booster_members = [
            card for card in cards
            if card.get("product_scope", {}).get("source_strict_booster_member") is True
        ]
        if release_meta.get("product_card_count") != 60:
            failures.append("starter_pack_possible_product_count_should_be_60")
        if release_meta.get("unique_catalog_row_count") != 102:
            failures.append("starter_pack_possible_unique_pool_count_should_be_102")
        if release_meta.get("catalog_treatment") == "Catalog target":
            failures.append("starter_pack_possible_catalog_treatment_overclaims_target")
        if "not a guarantee" not in release_meta.get("product_count_basis", "").lower():
            failures.append("starter_pack_possible_product_count_basis_missing_boundary")
        if release.get("symbol_status", {}).get("prints_without_rarity_symbol") != "mixed":
            failures.append("starter_pack_possible_release_symbol_status_should_be_mixed")
        if primary_source.get("source_page_url") != starter_pack_possible_source_id():
            failures.append("starter_pack_possible_source_page_url_mismatch")
        try:
            source_docs = source_document_contacts()
            for key, value in source_docs.items():
                if primary_source.get(key) != value:
                    failures.append(f"starter_pack_possible_source_doc_pin_mismatch {key}")
        except FileNotFoundError:
            failures.append("starter_pack_possible_source_doc_pin_missing")
        if primary_source.get("source_release_family_id") != "jp_tcg_expansion_pack_19961020":
            failures.append("starter_pack_possible_source_release_mismatch")
        if primary_source.get("cards_found") != len(cards) or primary_source.get("possible_content_rows") != len(cards):
            failures.append("starter_pack_possible_source_rows_found_mismatch")
        if len(starter_source_rows) != 102:
            failures.append(f"starter_pack_possible_source_row_count actual={len(starter_source_rows)}")
        if primary_source.get("catalog_hash") != (sha256_hex(starter_source_release) if starter_source_release else ""):
            failures.append("starter_pack_possible_source_hash_mismatch")
        if len(targets) != 96:
            failures.append(f"starter_pack_possible_target_count actual={len(targets)}")
        if len(caveats) != 6:
            failures.append(f"starter_pack_possible_caveat_count actual={len(caveats)}")
        if len(exact_target_images) != 96:
            failures.append(f"starter_pack_possible_inherited_target_image_count actual={len(exact_target_images)}")
        if len(caveat_missing_images) != 6:
            failures.append(f"starter_pack_possible_caveat_missing_image_count actual={len(caveat_missing_images)}")
        if fixed_deck_overclaims:
            failures.append(f"starter_pack_possible_fixed_deck_overclaim_count actual={len(fixed_deck_overclaims)}")
        if source_strict_booster_members != targets:
            failures.append(f"starter_pack_possible_source_booster_member_count actual={len(source_strict_booster_members)}")
        if any(card.get("product_scope", {}).get("strict_booster_member") for card in cards):
            failures.append("starter_pack_possible_current_booster_membership_overclaim")
        if not all(card.get("starter_pack_scope", {}).get("possible_content_pool") is True for card in cards):
            failures.append("starter_pack_possible_pool_flags_incomplete")
    if release_type == "gift_pack_starter_component_possible_rows":
        lanes = [card.get("gift_pack_scope", {}).get("component_lane") for card in cards]
        targets = [card for card in cards if card.get("no_rarity_scope", {}).get("active_target") is True]
        caveats = [card for card in cards if card.get("no_rarity_scope", {}).get("basic_energy_caveat") is True]
        component_target_images = [
            card for card in targets
            if card.get("image_provenance", {}).get("status") == "component_inherited_reference_image"
            and card.get("image_provenance", {}).get("image_large")
        ]
        caveat_missing_images = [
            card for card in caveats
            if card.get("image_provenance", {}).get("status") == "missing_reference_image"
            and not card.get("image_provenance", {}).get("image_large")
        ]
        fixed_overclaims = [
            card for card in cards
            if card.get("gift_pack_scope", {}).get("fixed_gift_pack_card_member") is not False
            or card.get("product_scope", {}).get("strict_release_member") is not False
            or card.get("product_scope", {}).get("strict_booster_member") is not False
        ]
        source_starter_rows = [
            card for card in cards
            if card.get("product_scope", {}).get("source_starter_pack_possible_row") is True
        ]
        for lane in gift_pack_component_lanes():
            if lanes.count(lane) != 102:
                failures.append(f"gift_pack_component_lane_count {lane}={lanes.count(lane)}")
        if release_meta.get("product_card_count") != 122:
            failures.append("gift_pack_component_product_count_should_be_122")
        if release_meta.get("unique_catalog_row_count") != 204:
            failures.append("gift_pack_component_unique_pool_count_should_be_204")
        if release_meta.get("unmodeled_special_card_slots") != 2:
            failures.append("gift_pack_component_unmodeled_special_slots_missing")
        if release_meta.get("catalog_treatment") == "Catalog target":
            failures.append("gift_pack_component_catalog_treatment_overclaims_target")
        if "not a guarantee" not in release_meta.get("product_count_basis", "").lower():
            failures.append("gift_pack_component_product_count_basis_missing_boundary")
        if release.get("symbol_status", {}).get("prints_without_rarity_symbol") != "unverified":
            failures.append("gift_pack_component_release_symbol_status_should_be_unverified")
        if primary_source.get("source_page_url") != gift_pack_product_source_id():
            failures.append("gift_pack_component_source_page_url_mismatch")
        try:
            source_docs = source_document_contacts()
            for key, value in source_docs.items():
                if primary_source.get(key) != value:
                    failures.append(f"gift_pack_component_source_doc_pin_mismatch {key}")
        except FileNotFoundError:
            failures.append("gift_pack_component_source_doc_pin_missing")
        if primary_source.get("source_release_family_id") != "jp_tcg_starter_pack_19961020":
            failures.append("gift_pack_component_source_release_mismatch")
        if primary_source.get("cards_found") != len(cards) or primary_source.get("possible_content_rows") != len(cards):
            failures.append("gift_pack_component_source_rows_found_mismatch")
        if len(gift_pack_source_rows) != 102:
            failures.append(f"gift_pack_component_source_row_count actual={len(gift_pack_source_rows)}")
        if primary_source.get("catalog_hash") != (sha256_hex(gift_pack_source_release) if gift_pack_source_release else ""):
            failures.append("gift_pack_component_source_hash_mismatch")
        product_context = primary_source.get("product_context_source", {})
        try:
            gift_snapshot = gift_pack_source_snapshot()
            gift_claims = gift_snapshot["extracted_claims"]
            if product_context.get("snapshot_hash") != gift_snapshot["snapshot_hash"]:
                failures.append("gift_pack_component_product_context_snapshot_hash_mismatch")
            if product_context.get("snapshot_path") != gift_snapshot["snapshot_path"]:
                failures.append("gift_pack_component_product_context_snapshot_path_mismatch")
            if product_context.get("oldid_url") != gift_snapshot["oldid_url"]:
                failures.append("gift_pack_component_product_context_oldid_mismatch")
            if product_context.get("source_page_url") != gift_snapshot["source_page_url"]:
                failures.append("gift_pack_component_product_context_source_url_mismatch")
            if product_context.get("observed_release_date") != gift_claims.get("release_date"):
                failures.append("gift_pack_component_product_context_release_date_mismatch")
            if product_context.get("observed_total_card_count") != gift_claims.get("product_card_count"):
                failures.append("gift_pack_component_product_context_count_mismatch")
            if product_context.get("observed_starter_pack_component_count") != gift_claims.get("starter_pack_component_count"):
                failures.append("gift_pack_component_product_context_starter_count_mismatch")
            if product_context.get("observed_special_card_slots") != gift_claims.get("special_card_slots"):
                failures.append("gift_pack_component_product_context_special_slot_mismatch")
            selected_text = gift_snapshot.get("selected_text", "")
            for expected_text, failure_name in {
                "1996年12月12日": "gift_pack_component_snapshot_date_line_missing",
                "カード枚数 122枚": "gift_pack_component_snapshot_card_count_line_missing",
                "第1弾スターターパック 2個": "gift_pack_component_snapshot_starter_component_line_missing",
                "スペシャルカード2枚": "gift_pack_component_snapshot_special_card_line_missing",
            }.items():
                if expected_text not in selected_text:
                    failures.append(failure_name)
            if "raw HTML snapshot" not in product_context.get("not_claiming", []):
                failures.append("gift_pack_component_product_context_snapshot_boundary_missing")
            if "special-card identities" not in product_context.get("not_claiming", []):
                failures.append("gift_pack_component_product_context_special_identity_boundary_missing")
        except FileNotFoundError:
            failures.append("gift_pack_component_product_source_snapshot_missing")
        if primary_source.get("special_card_slots_documented") != 2 or primary_source.get("special_card_slots_row_modeled") is not False:
            failures.append("gift_pack_component_special_slots_not_documented_as_unmodeled")
        if len(targets) != 192:
            failures.append(f"gift_pack_component_target_count actual={len(targets)}")
        if len(caveats) != 12:
            failures.append(f"gift_pack_component_caveat_count actual={len(caveats)}")
        if len(component_target_images) != 192:
            failures.append(f"gift_pack_component_target_image_count actual={len(component_target_images)}")
        if len(caveat_missing_images) != 12:
            failures.append(f"gift_pack_component_caveat_missing_image_count actual={len(caveat_missing_images)}")
        if fixed_overclaims:
            failures.append(f"gift_pack_component_fixed_overclaim_count actual={len(fixed_overclaims)}")
        if len(source_starter_rows) != len(cards):
            failures.append(f"gift_pack_component_source_starter_row_count actual={len(source_starter_rows)}")
        if any(card.get("image_provenance", {}).get("status") == "exact_source_image" for card in cards):
            failures.append("gift_pack_component_direct_exact_image_overclaim")
        if not all(card.get("gift_pack_scope", {}).get("possible_content_pool") is True for card in cards):
            failures.append("gift_pack_component_pool_flags_incomplete")
    if release_type == "team_rocket_gift_pack_deck_component_possible_rows":
        lanes = [card.get("team_rocket_gift_pack_scope", {}).get("component_lane") for card in cards]
        component_images = [
            card for card in cards
            if card.get("image_provenance", {}).get("status") == "component_inherited_reference_image"
            and card.get("image_provenance", {}).get("image_large")
        ]
        fixed_overclaims = [
            card for card in cards
            if card.get("team_rocket_gift_pack_scope", {}).get("fixed_deck_card_member") is not False
            or card.get("product_scope", {}).get("strict_release_member") is not False
            or card.get("product_scope", {}).get("strict_booster_member") is not False
        ]
        source_rocket_rows = [
            card for card in cards
            if card.get("product_scope", {}).get("source_rocket_gang_row") is True
        ]
        for lane in team_rocket_gift_pack_component_lanes():
            if lanes.count(lane) != 65:
                failures.append(f"team_rocket_gift_pack_component_lane_count {lane}={lanes.count(lane)}")
        if release_meta.get("product_card_count") != 120:
            failures.append("team_rocket_gift_pack_component_product_count_should_be_120")
        if release_meta.get("unique_catalog_row_count") != 130:
            failures.append("team_rocket_gift_pack_component_unique_pool_count_should_be_130")
        if release_meta.get("unresolved_fixed_deck_lists") is not True:
            failures.append("team_rocket_gift_pack_component_unresolved_deck_lists_missing")
        if release_meta.get("catalog_treatment") == "Catalog target":
            failures.append("team_rocket_gift_pack_component_catalog_treatment_overclaims_target")
        if "not a guarantee" not in release_meta.get("product_count_basis", "").lower():
            failures.append("team_rocket_gift_pack_component_product_count_basis_missing_boundary")
        if release.get("symbol_status", {}).get("prints_without_rarity_symbol") != "unverified":
            failures.append("team_rocket_gift_pack_component_release_symbol_status_should_be_unverified")
        if primary_source.get("source_page_url") != team_rocket_gift_pack_product_source_id():
            failures.append("team_rocket_gift_pack_component_source_page_url_mismatch")
        try:
            source_docs = source_document_contacts()
            for key, value in source_docs.items():
                if primary_source.get(key) != value:
                    failures.append(f"team_rocket_gift_pack_component_source_doc_pin_mismatch {key}")
        except FileNotFoundError:
            failures.append("team_rocket_gift_pack_component_source_doc_pin_missing")
        if primary_source.get("source_release_family_id") != "jp_tcg_rocket_gang_19971121":
            failures.append("team_rocket_gift_pack_component_source_release_mismatch")
        if primary_source.get("cards_found") != len(cards) or primary_source.get("possible_content_rows") != len(cards):
            failures.append("team_rocket_gift_pack_component_source_rows_found_mismatch")
        if len(team_rocket_gift_pack_source_rows) != 65:
            failures.append(f"team_rocket_gift_pack_component_source_row_count actual={len(team_rocket_gift_pack_source_rows)}")
        if primary_source.get("catalog_hash") != (sha256_hex(team_rocket_gift_pack_source_release) if team_rocket_gift_pack_source_release else ""):
            failures.append("team_rocket_gift_pack_component_source_hash_mismatch")
        product_context = primary_source.get("product_context_source", {})
        try:
            product_snapshot = team_rocket_gift_pack_source_snapshot()
            product_claims = product_snapshot["extracted_claims"]
            if product_context.get("snapshot_hash") != product_snapshot["snapshot_hash"]:
                failures.append("team_rocket_gift_pack_component_product_context_snapshot_hash_mismatch")
            if product_context.get("snapshot_path") != product_snapshot["snapshot_path"]:
                failures.append("team_rocket_gift_pack_component_product_context_snapshot_path_mismatch")
            if product_context.get("oldid_url") != product_snapshot["oldid_url"]:
                failures.append("team_rocket_gift_pack_component_product_context_oldid_mismatch")
            if product_context.get("source_page_url") != product_snapshot["source_page_url"]:
                failures.append("team_rocket_gift_pack_component_product_context_source_url_mismatch")
            if product_context.get("observed_release_date") != product_claims.get("release_date"):
                failures.append("team_rocket_gift_pack_component_product_context_release_date_mismatch")
            if product_context.get("observed_total_card_count") != product_claims.get("product_card_count"):
                failures.append("team_rocket_gift_pack_component_product_context_count_mismatch")
            if product_context.get("observed_deck_count") != product_claims.get("deck_count"):
                failures.append("team_rocket_gift_pack_component_product_context_deck_count_mismatch")
            if product_context.get("observed_cards_per_deck") != product_claims.get("cards_per_deck"):
                failures.append("team_rocket_gift_pack_component_product_context_cards_per_deck_mismatch")
            if product_context.get("observed_fixed_flag") != product_claims.get("fixed_flag"):
                failures.append("team_rocket_gift_pack_component_product_context_fixed_flag_mismatch")
            selected_text = product_snapshot.get("selected_text", "")
            for expected_text, failure_name in {
                "1997年12月19日": "team_rocket_gift_pack_component_snapshot_date_line_missing",
                "カード枚数 120枚": "team_rocket_gift_pack_component_snapshot_card_count_line_missing",
                "形態 固定": "team_rocket_gift_pack_component_snapshot_fixed_line_missing",
                "2デッキ（各60枚）": "team_rocket_gift_pack_component_snapshot_deck_count_line_missing",
            }.items():
                if expected_text not in selected_text:
                    failures.append(failure_name)
            if "raw HTML snapshot" not in product_context.get("not_claiming", []):
                failures.append("team_rocket_gift_pack_component_product_context_snapshot_boundary_missing")
            if "fixed per-deck card list" not in product_context.get("not_claiming", []):
                failures.append("team_rocket_gift_pack_component_product_context_fixed_deck_boundary_missing")
        except FileNotFoundError:
            failures.append("team_rocket_gift_pack_component_product_source_snapshot_missing")
        if primary_source.get("fixed_deck_product_documented") is not True or primary_source.get("fixed_deck_lists_row_modeled") is not False:
            failures.append("team_rocket_gift_pack_component_fixed_deck_model_boundary_missing")
        if len(component_images) != 130:
            failures.append(f"team_rocket_gift_pack_component_image_count actual={len(component_images)}")
        if fixed_overclaims:
            failures.append(f"team_rocket_gift_pack_component_fixed_overclaim_count actual={len(fixed_overclaims)}")
        if len(source_rocket_rows) != len(cards):
            failures.append(f"team_rocket_gift_pack_component_source_rocket_row_count actual={len(source_rocket_rows)}")
        if any(card.get("image_provenance", {}).get("status") == "exact_source_image" for card in cards):
            failures.append("team_rocket_gift_pack_component_direct_exact_image_overclaim")
        if not all(card.get("team_rocket_gift_pack_scope", {}).get("possible_content_pool") is True for card in cards):
            failures.append("team_rocket_gift_pack_component_pool_flags_incomplete")
    if release_type == "promo_family_child_rollup_rows":
        family_id = release_meta.get("release_family_id", "")
        family_spec = PROMO_FAMILY_CHILD_SPECS.get(family_id, {})
        expected_gap_count = len(family_spec.get("unmodeled_expected_cards", []))
        family_scopes = [card.get("promo_family_scope", {}) for card in cards]
        modeled_sorts = [
            int(scope.get("source_provider_sort", 0))
            for scope in family_scopes
            if scope.get("source_provider_sort")
        ]
        if not family_spec:
            failures.append("promo_family_child_missing_release_spec")
        if release_meta.get("expected_source_card_count") != family_spec.get("expected_source_card_count"):
            failures.append("promo_family_child_release_expected_source_count_mismatch")
        if release_meta.get("source_gap_count") != expected_gap_count:
            failures.append("promo_family_child_release_gap_count_mismatch")
        if release_meta.get("expected_source_card_count", 0) != len(cards) + release_meta.get("source_gap_count", 0):
            failures.append("promo_family_child_release_count_closure_mismatch")
        if release_meta.get("unmodeled_expected_cards") != family_spec.get("unmodeled_expected_cards"):
            failures.append("promo_family_child_release_unmodeled_cards_mismatch")
        if release_meta.get("catalog_treatment") != "Promo target source-slice":
            failures.append("promo_family_child_catalog_treatment_mismatch")
        if release_meta.get("strict_release_member") is not False:
            failures.append("promo_family_child_release_strict_member_overclaim")
        if "not a complete family checklist" not in release_meta.get("product_count_basis", "").lower():
            failures.append("promo_family_child_product_count_basis_missing_boundary")
        if release.get("symbol_status", {}).get("prints_without_rarity_symbol") != "yes":
            failures.append("promo_family_child_release_symbol_status_should_be_yes")
        if primary_source.get("source_page_url") != promo_family_child_source_id():
            failures.append("promo_family_child_source_page_url_mismatch")
        if primary_source.get("catalog_hash") != (sha256_hex(promo_family_source_release) if promo_family_source_release else ""):
            failures.append("promo_family_child_source_hash_mismatch")
        if primary_source.get("source_release_family_id") != "jp_promo_unnumbered_pre_english_source_slice_19961015_19990131":
            failures.append("promo_family_child_source_release_mismatch")
        if primary_source.get("cards_found") != len(cards) or primary_source.get("modeled_source_rows") != len(cards):
            failures.append("promo_family_child_source_rows_found_mismatch")
        if primary_source.get("expected_source_card_count") != family_spec.get("expected_source_card_count"):
            failures.append("promo_family_child_source_expected_count_mismatch")
        if primary_source.get("source_gap_count") != expected_gap_count:
            failures.append("promo_family_child_source_gap_count_mismatch")
        if primary_source.get("expected_source_card_count", 0) != primary_source.get("modeled_source_rows", 0) + primary_source.get("source_gap_count", 0):
            failures.append("promo_family_child_source_count_closure_mismatch")
        if primary_source.get("unmodeled_expected_cards") != family_spec.get("unmodeled_expected_cards"):
            failures.append("promo_family_child_source_unmodeled_cards_mismatch")
        if primary_source.get("modeled_source_sorts") != family_spec.get("modeled_source_sorts"):
            failures.append("promo_family_child_source_modeled_sorts_mismatch")
        if sorted(modeled_sorts) != sorted(family_spec.get("modeled_source_sorts", [])):
            failures.append(f"promo_family_child_modeled_sort_count actual={modeled_sorts}")
        if not all(scope.get("complete_family_modeled") is False for scope in family_scopes):
            failures.append("promo_family_child_complete_family_overclaim")
        if not all(scope.get("strict_family_member_for_modeled_row") is True for scope in family_scopes):
            failures.append("promo_family_child_modeled_membership_missing")
        if any(card.get("product_scope", {}).get("strict_release_member") is not False for card in cards):
            failures.append("promo_family_child_row_strict_member_overclaim_count")
        if len(provider_path_reference_image_rows) != len(cards):
            failures.append(f"promo_family_child_provider_path_image_count actual={len(provider_path_reference_image_rows)}")
        if exact_source_image_rows:
            failures.append("promo_family_child_direct_exact_image_overclaim")
        if not all("complete promo family checklist" in card.get("not_claiming", []) for card in cards):
            failures.append("promo_family_child_missing_complete_family_boundary")
        try:
            source_docs = source_document_contacts()
            for key, value in source_docs.items():
                if primary_source.get(key) != value:
                    failures.append(f"promo_family_child_source_doc_pin_mismatch {key}")
        except FileNotFoundError:
            failures.append("promo_family_child_source_doc_pin_missing")
        family_context = primary_source.get("family_context_source", {})
        try:
            promo_snapshot = promo_family_context_snapshot(str(family_spec.get("source_snapshot", "")))
            if family_context.get("snapshot_hash") != promo_snapshot["snapshot_hash"]:
                failures.append("promo_family_child_context_snapshot_hash_mismatch")
            if family_context.get("snapshot_path") != promo_snapshot["snapshot_path"]:
                failures.append("promo_family_child_context_snapshot_path_mismatch")
            if family_context.get("source_page_url") != promo_snapshot["source_page_url"]:
                failures.append("promo_family_child_context_source_url_mismatch")
            selected_text = family_context.get("selected_text", "")
            if selected_text != promo_snapshot["selected_text"]:
                failures.append("promo_family_child_context_selected_text_mismatch")
            for expected_text in family_spec.get("expected_snapshot_texts", []):
                if expected_text not in selected_text:
                    failures.append(f"promo_family_child_snapshot_text_missing {expected_text}")
            if "raw HTML snapshot" not in family_context.get("not_claiming", []):
                failures.append("promo_family_child_context_raw_snapshot_boundary_missing")
            if "complete UPC source" not in family_context.get("not_claiming", []) and "complete event source" not in family_context.get("not_claiming", []):
                failures.append("promo_family_child_context_complete_source_boundary_missing")
        except FileNotFoundError:
            failures.append("promo_family_child_source_snapshot_missing")
    if release_type == "deck_kit_parent_rollup_rows":
        lanes = [card.get("parent_rollup", {}).get("lane") for card in cards]
        if lanes.count("red") != 32 or lanes.count("green") != 32:
            failures.append(f"quick_starter_parent_lane_counts red={lanes.count('red')} green={lanes.count('green')}")
        source_children = primary_source.get("child_catalogs", [])
        source_children_by_id = {
            child.get("release_family_id"): child
            for child in source_children
        }
        if primary_source.get("source_page_url") != quick_starter_rollup_source_id():
            failures.append("quick_starter_parent_source_page_url_not_rollup_id")
        if primary_source.get("cards_found") != len(cards):
            failures.append("quick_starter_parent_source_cards_found_mismatch")
        if set(source_children_by_id) != {
            "jp_tcg_quick_starter_gift_set_red_deck_19981204",
            "jp_tcg_quick_starter_gift_set_green_deck_19981204",
        }:
            failures.append("quick_starter_parent_missing_child_catalog_sources")
        actual_child_hashes = {
            child_id: sha256_hex(child)
            for child_id, child in quick_starter_children.items()
        }
        for child_id, child in quick_starter_children.items():
            source_child = source_children_by_id.get(child_id)
            if not source_child:
                continue
            expected_path = str((RELEASE_DIR / f"{child_id}.json").relative_to(ROOT))
            expected_source_url = child.get("sources", [{}])[0].get("source_page_url", "")
            if source_child.get("catalog_hash") != actual_child_hashes.get(child_id):
                failures.append(f"quick_starter_parent_child_source_hash_mismatch {child_id}")
            if source_child.get("row_count") != len(child.get("cards", [])):
                failures.append(f"quick_starter_parent_child_source_row_count_mismatch {child_id}")
            if source_child.get("path") != expected_path:
                failures.append(f"quick_starter_parent_child_source_path_mismatch {child_id}")
            if source_child.get("canonicalization") != "json_sorted_keys_no_whitespace_v0.1":
                failures.append(f"quick_starter_parent_child_source_canonicalization_mismatch {child_id}")
            if source_child.get("source_page_url") != expected_source_url:
                failures.append(f"quick_starter_parent_child_source_url_mismatch {child_id}")
        for card in cards:
            parent_rollup = card.get("parent_rollup", {})
            child_id = parent_rollup.get("child_release_family_id")
            if child_id and parent_rollup.get("child_catalog_hash") != actual_child_hashes.get(child_id):
                failures.append(f"{card.get('row_id')}: quick_starter_parent_child_hash_mismatch")
                break
        if release.get("symbol_status", {}).get("prints_without_rarity_symbol") != "yes":
            failures.append("quick_starter_parent_symbol_status_should_be_yes")
    return {
        "release_family_id": release_meta.get("release_family_id"),
        "row_count": len(cards),
        "expected_row_count": expected,
        "release_type": release_type,
        "product_card_count": release_meta.get("product_card_count", 0),
        "product_count_basis": release_meta.get("product_count_basis", ""),
        "strict_release_member": release_meta.get("strict_release_member"),
        "catalog_treatment": release_meta.get("catalog_treatment", ""),
        "component_lanes": release_meta.get("component_lanes", []),
        "unmodeled_special_card_slots": release_meta.get("unmodeled_special_card_slots", 0),
        "unresolved_fixed_deck_lists": release_meta.get("unresolved_fixed_deck_lists", False),
        "unique_underlying_rocket_gang_rows": release_meta.get("unique_underlying_rocket_gang_rows", 0),
        "expected_source_card_count": release_meta.get("expected_source_card_count", 0),
        "source_gap_count": release_meta.get("source_gap_count", 0),
        "unmodeled_expected_cards": release_meta.get("unmodeled_expected_cards", []),
        "modeled_candidate_rows": (
            len(cards)
            if release_type in {
                "gift_pack_starter_component_possible_rows",
                "team_rocket_gift_pack_deck_component_possible_rows",
                "promo_family_child_rollup_rows",
            }
            else 0
        ),
        "physical_product_card_count": release_meta.get("product_card_count", 0),
        "product_context_snapshot_path": product_context_source.get("snapshot_path", ""),
        "product_context_snapshot_hash": product_context_source.get("snapshot_hash", ""),
        "product_context_oldid_url": product_context_source.get("oldid_url", ""),
        "product_context_source_url": product_context_source.get("source_page_url", ""),
        "family_context_snapshot_path": family_context_source.get("snapshot_path", ""),
        "family_context_snapshot_hash": family_context_source.get("snapshot_hash", ""),
        "family_context_source_url": family_context_source.get("source_page_url", ""),
        "release_not_claiming": release.get("not_claiming", []),
        "active_no_rarity_rows": sum(1 for card in cards if card.get("no_rarity_scope", {}).get("active_target") is True),
        "basic_energy_caveat_rows": sum(1 for card in cards if card.get("no_rarity_scope", {}).get("basic_energy_caveat") is True),
        "strict_booster_rows": sum(1 for card in cards if card.get("product_scope", {}).get("strict_booster_member") is True),
        "reference_image_witness_rows": len(image_rows),
        "exact_source_image_rows": len(exact_source_image_rows),
        "provider_path_reference_image_rows": len(provider_path_reference_image_rows),
        "inherited_source_reference_image_rows": len(inherited_source_reference_image_rows),
        "component_inherited_reference_image_rows": len(component_inherited_reference_image_rows),
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
        product_context_source = (release.get("sources", [{}]) or [{}])[0].get("product_context_source", {})
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
                "release_type": config.release_type,
                "product_card_count": release.get("release", {}).get("product_card_count", 0),
                "product_count_basis": release.get("release", {}).get("product_count_basis", ""),
                "strict_release_member": release.get("release", {}).get("strict_release_member"),
                "catalog_treatment": release.get("release", {}).get("catalog_treatment", ""),
                "component_lanes": release.get("release", {}).get("component_lanes", []),
                "unmodeled_special_card_slots": release.get("release", {}).get("unmodeled_special_card_slots", 0),
                "unresolved_fixed_deck_lists": release.get("release", {}).get("unresolved_fixed_deck_lists", False),
                "unique_underlying_rocket_gang_rows": release.get("release", {}).get("unique_underlying_rocket_gang_rows", 0),
                "expected_source_card_count": release.get("release", {}).get("expected_source_card_count", 0),
                "source_gap_count": release.get("release", {}).get("source_gap_count", 0),
                "unmodeled_expected_cards": release.get("release", {}).get("unmodeled_expected_cards", []),
                "modeled_candidate_rows": (
                    len(release["cards"])
                    if config.release_type in {
                        "gift_pack_starter_component_possible_rows",
                        "team_rocket_gift_pack_deck_component_possible_rows",
                        "promo_family_child_rollup_rows",
                    }
                    else 0
                ),
                "physical_product_card_count": release.get("release", {}).get("product_card_count", 0),
                "product_context_snapshot_path": product_context_source.get("snapshot_path", ""),
                "product_context_snapshot_hash": product_context_source.get("snapshot_hash", ""),
                "product_context_oldid_url": product_context_source.get("oldid_url", ""),
                "product_context_source_url": product_context_source.get("source_page_url", ""),
                "family_context_snapshot_path": (release.get("sources", [{}]) or [{}])[0].get("family_context_source", {}).get("snapshot_path", ""),
                "family_context_snapshot_hash": (release.get("sources", [{}]) or [{}])[0].get("family_context_source", {}).get("snapshot_hash", ""),
                "family_context_source_url": (release.get("sources", [{}]) or [{}])[0].get("family_context_source", {}).get("source_page_url", ""),
                "release_not_claiming": release.get("not_claiming", []),
                "active_no_rarity_rows": audit["active_no_rarity_rows"],
                "basic_energy_caveat_rows": audit["basic_energy_caveat_rows"],
                "strict_booster_rows": audit["strict_booster_rows"],
                "reference_image_witness_rows": audit["reference_image_witness_rows"],
                "exact_source_image_rows": audit["exact_source_image_rows"],
                "provider_path_reference_image_rows": audit["provider_path_reference_image_rows"],
                "inherited_source_reference_image_rows": audit["inherited_source_reference_image_rows"],
                "component_inherited_reference_image_rows": audit["component_inherited_reference_image_rows"],
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
        "active_no_rarity_rows": sum(item["active_no_rarity_rows"] for item in manifests),
        "basic_energy_caveat_rows": sum(item["basic_energy_caveat_rows"] for item in manifests),
        "strict_booster_rows": sum(item["strict_booster_rows"] for item in manifests),
        "source_gap_count": sum(item.get("source_gap_count", 0) for item in manifests),
        "reference_image_witness_rows": sum(item["reference_image_witness_rows"] for item in manifests),
        "exact_source_image_rows": sum(item["exact_source_image_rows"] for item in manifests),
        "provider_path_reference_image_rows": sum(item["provider_path_reference_image_rows"] for item in manifests),
        "inherited_source_reference_image_rows": sum(item["inherited_source_reference_image_rows"] for item in manifests),
        "component_inherited_reference_image_rows": sum(item["component_inherited_reference_image_rows"] for item in manifests),
        "hash_algorithm": "sha256",
        "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
        "source_contact_policy": "Images are bounded external reference witnesses and are not approved display/training/seller evidence by default; provenance status distinguishes exact source images, provider-path-derived reference images, inherited possible-content reference images, and product-component inherited reference images.",
        "releases": manifests,
        "not_claiming": [
            "complete pre-English catalog",
            "complete promo family checklist",
            "unmodeled expected card row",
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
        "active_no_rarity_rows": sum(row["active_no_rarity_rows"] for row in audit_rows),
        "basic_energy_caveat_rows": sum(row["basic_energy_caveat_rows"] for row in audit_rows),
        "strict_booster_rows": sum(row["strict_booster_rows"] for row in audit_rows),
        "source_gap_count": sum(row.get("source_gap_count", 0) for row in audit_rows),
        "reference_image_witness_rows": sum(row["reference_image_witness_rows"] for row in audit_rows),
        "exact_source_image_rows": sum(row["exact_source_image_rows"] for row in audit_rows),
        "provider_path_reference_image_rows": sum(row["provider_path_reference_image_rows"] for row in audit_rows),
        "inherited_source_reference_image_rows": sum(row["inherited_source_reference_image_rows"] for row in audit_rows),
        "component_inherited_reference_image_rows": sum(row["component_inherited_reference_image_rows"] for row in audit_rows),
        "tcgdex_enriched_rows": sum(row["tcgdex_enriched_rows"] for row in audit_rows),
        "release_audits": audit_rows,
        "not_claiming": [
            "multi-agent audit complete",
            "complete pre-English release coverage",
            "complete promo family checklist",
            "unmodeled expected card row",
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
            f"reference_images={row['reference_image_witness_rows']} tcgdex={row['tcgdex_enriched_rows']} passed={row['passed']}"
        )
    return 0 if audit["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
