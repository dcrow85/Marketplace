#!/usr/bin/env python3
"""Build the standalone Azuki TCG catalog from the official gallery API.

The default build is offline and reproducible: it reads the newest pinned
snapshot under data/azuki-tcg/source-snapshots. Use --refresh to fetch the
current official endpoint and write a new dated snapshot before building.
"""

from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import io
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data" / "azuki-tcg"
SNAPSHOT_DIR = BASE / "source-snapshots"
RELEASE_DIR = BASE / "releases"
SPREADSHEET_DIR = BASE / "spreadsheets"
OBSERVATION_DIR = BASE / "observations"
API_URL = "https://tcg.azuki.com/api/cards"
GALLERY_URL = "https://tcg.azuki.com/gallery"
RELEASE_ID = "azuki_tcg_official_gallery"
ALPHA_SHEET_ID = "10HREsBCaSkEvbPdM505PZSbXxiWGEP-Itv96Xa5Ene0"
ALPHA_SHEET_URL = f"https://docs.google.com/spreadsheets/d/{ALPHA_SHEET_ID}/edit?gid=0#gid=0"
ALPHA_CSV_URL = f"https://docs.google.com/spreadsheets/d/{ALPHA_SHEET_ID}/gviz/tq?tqx=out:csv&gid=0"
ALPHA_IMAGE_CSV_URL = f"https://docs.google.com/spreadsheets/d/{ALPHA_SHEET_ID}/gviz/tq?tqx=out:csv&gid=1096719524"
ALPHA_RELEASE_ID = "azuki_tcg_alpha_master_sheet"
ALPHA_FIELDS_COMPLETION_ID = "azuki_tcg_alpha_fields_completion"
PROMO_OBSERVATION_ID = "azuki_tcg_user_photo_promo_observations_2026_06_24"

EXPECTED_CARD_KEYS = {
    "abilities",
    "attack",
    "cardId",
    "cardText",
    "category",
    "element",
    "errata",
    "gatePower",
    "health",
    "id",
    "ikzCost",
    "image",
    "name",
    "rarity",
    "set",
    "subtypes",
}

EXPECTED_CATEGORIES = {"Leader", "Gate", "Entity", "Weapon", "Spell", "IKZ"}
EXPECTED_ELEMENTS = {"Water", "Lightning", "Earth", "Fire", "Neutral"}

AUTHORITY_NOT_CLAIMING = [
    "complete physical-product checklist beyond the official gallery endpoint",
    "seller possession",
    "physical-card authenticity",
    "condition truth",
    "market value",
    "image rights approval",
    "errata adjudication beyond source text",
]

ALPHA_NOT_CLAIMING = [
    "complete physical-product checklist beyond the linked Alpha Master Sheet",
    "seller possession",
    "physical-card authenticity",
    "condition truth",
    "market value",
    "image rights approval",
    "rules adjudication beyond source text",
    "gallery-image equivalence unless crosswalked by card ID",
]

ALPHA_COLUMNS = [
    "ID",
    "IKZ COST",
    "NAME",
    "ELEMENT",
    "TYPE",
    "SUBTYPE_1",
    "SUBTYPE_2",
    "SUBTYPE_3",
    "GATE_PWR",
    "ATK",
    "HP",
    "PLUS_ATK",
    "REF_IP",
    "REF_ID",
    "REF_IP2",
    "REF_ID2",
    "RARITY",
    "ILLUSTRATOR",
    "E_1",
    "E_1_TEXT",
    "E_2",
    "E_2_TEXT",
    "F_TEXT",
    "DEFINITION_TEXT",
    "RULING_TEXT",
    "STAMP",
    "IMG",
    "ALT_IMG",
]

COMPLETION_EXTRA_COLUMNS = [
    "ROW_KEY",
    "SOURCE_RELEASE",
    "SOURCE_ENTRY_ID",
    "SETS",
    "IMAGE_URL",
    "FIELD_SOURCE",
    "MISSING_ALPHA_FIELDS",
    "REVIEW_STATUS",
]

PROMO_OBSERVATION_EXTRA_COLUMNS = [
    "OBSERVATION_ID",
    "PRINTED_ID",
    "NORMALIZED_CARD_ID",
    "SOURCE_IMAGE_SHA256",
    "SOURCE_IMAGE_STORED",
    "PHYSICAL_LOCATION_IN_IMAGE",
    "OBSERVED_AZUKI_NUMBER",
    "OBSERVED_STAMP",
    "MATCHED_GALLERY_UIDS",
    "OBSERVATION_CONFIDENCE",
    "OBSERVATION_NOTE",
    "AUTHORITY_LABEL",
]

# Image-view pass, 2026-06-23. These are deliberately not treated as official
# gallery API facts: they are manual reads from the lower-left print line of
# the source card images, used only to reduce blank spreadsheet fields.
IMAGE_READ_ILLUSTRATORS = {
    "S1-AZK01-068_Pip_E_C_die": "Nohgo",
    "S1-AZK01-069_Link_E_C_die": "Nohgo",
    "S1-AZK01-070_Mocking-Dummy_E_C_die": "Twisted Hand Studio",
    "S1-AZK01-071_Alley-Fetchduck_E_UC_die": "Twisted Hand Studio",
    "S1-AZK01-072_Beanz-Mentor_E_R_die": "Twisted Hand Studio",
    "S1-AZK01-074_Gurugumi-Vanguard_E_UC_die": "Zhongqiu",
    "S1-AZK01-075_Drunken-Brewmaster_E_C_die": "Avo",
    "S1-AZK01-076_Horen-of-Two-Paths_E_C_die": "Aaron",
    "S1-AZK01-077_Stalking-Assassin_E_C_die": "Twisted Hand Studio",
    "S1-AZK01-078_Fermented-Beanz_E_C_die": "Avo",
    "S1-AZK01-079_Gin-and-Tonika_E_SR_die": "Tomugi",
    "S1-AZK01-079A_Gin-and-Tonika_E_SR_die": "Tomugi",
    "S1-AZK01-080_Bladebound-Ally_E_R_die": "Pandart Studio",
    "S1-AZK01-081_Gurugumi-Mentor_E_C_die": "Skycrow",
    "S1-AZK01-082_Black-Jade-Brawler_E_UC_die": "Twisted Hand Studio",
    "S1-AZK01-083_Gurugumi-Imitator_E_R_die": "Skycrow",
    "S1-AZK01-084_Good-Enough-Replica_S_C_die": "Twisted Hand Studio",
    "S1-AZK01-085_Invigorating-Concoction_S_C_die": "Nick Oji",
    "S1-AZK01-086_Forging-Tricks_S_UC_die": "Twisted Hand Studio",
    "S1-AZK01-087_Mizuryuus-Torrent_S_SR_die": "Pandart Studio",
    "S1-AZK01-087A_Mizuryuus-Torrent_S_SR_die": "Twisted Hand Studio",
    "S1-AZK01-088_Pulled-Under_S_R_die": "Twisted Hand Studio",
    "S1-AZK01-089_Mizuryuu-Fist-Master_E_UC_die": "Pandart Studio",
    "S1-AZK01-090_Priestess-of-the-Mists_E_C_die": "Twisted Hand Studio",
    "S1-AZK01-091_Bubble-Adept_E_UC_die": "Twisted Hand Studio",
    "S1-AZK01-092_Lotus-of-Reflection_S_C_die": "Twisted Hand Studio",
    "S1-AZK01-093_Naiyara-the-Tideweaver_E_R_die": "Pandart Studio",
    "S1-AZK01-094_Hidden-Dagger_W_C_die": "Twisted Hand Studio",
    "S1-AZK01-095_Stormglass-Katana_W_C_die": "Twisted Hand Studio",
    "S1-AZK01-096_Ninpo-Thunderstep_S_UC_die": "Twisted Hand Studio",
    "S1-AZK01-097_Black-Jade-Pawnbroker_E_C_die": "Twisted Hand Studio",
    "S1-AZK01-098_Arms-Dealer-Kin_E_C_die": "Twisted Hand Studio",
    "S1-AZK01-099_Raikos-Wrath-Shin_E_SR_die": "DKANG!",
    "S1-AZK01-099A_Raikos-Wrath-Shin_E_SR_die": "Malcolm Wope",
    "S1-AZK01-100_Raizans-Riposte_S_C_die": "Twisted Hand Studio",
    "S1-AZK01-101_Sand-Stands-Still_S_SR_die": "Pandart Studio",
    "S1-AZK01-102_Oathstone_S_C_die": "Twisted Hand Studio",
    "S1-AZK01-103_Dropline-Station_E_UC_die": "Twisted Hand Studio",
    "S1-AZK01-104_Sanzus-Envoy_E_UC_die": "Twisted Hand Studio",
    "S1-AZK01-105_Prickly-Tumbleweed_E_C_die": "Twisted Hand Studio",
    "S1-AZK01-106_Lord-of-Sands-Osunanami_E_SR_die": "Pandart Studio",
    "S1-AZK01-107_Offering-to-Stillstone_S_C_die": "Twisted Hand Studio",
    "S1-AZK01-108_Crushing-Weight_S_R_die": "Pandart Studio",
    "S1-AZK01-109_Rock-Sloth_E_C_die": "Twisted Hand Studio",
    "S1-AZK01-110_Gluttonous-Devourer-Kasha_E_UC_die": "Twisted Hand Studio",
    "S1-AZK01-111_Black-Jade-Decoy_E_R_die": "Twisted Hand Studio",
    "S1-AZK01-112_Enrai-Shakunetsu_E_SR_die": "Twisted Hand Studio",
    "S1-AZK01-112A_Enrai-Shakunetsu_E_SR_die": "Qin Fang",
    "S1-AZK01-113_Cinderwake-Pursuer_E_C_die": "Twisted Hand Studio",
    "S1-AZK01-114_Omen-Peddler_E_R_die": "Samuel Gildas",
    "S1-AZK01-115_Crazed-Arsonist_E_C_die": "Twisted Hand Studio",
    "S1-AZK01-116_Tenmoku-Daiki_E_R_die": "Pandart Studio",
    "S1-AZK01-117_Ignition-Pact_S_UC_die": "Twisted Hand Studio",
    "S1-AZK01-118_Bandit-Ringleader_E_C_die": "Twisted Hand Studio",
    "S1-AZK01-119_Piko-of-Thousand-Blades_L_L_die": "Twisted Hand Studio",
    "S1-AZK01-119A_Piko-of-Thousand-Blades_L_L_die": "Twisted Hand Studio",
    "S1-AZK01-120_Stormchain-Gate_G_G_die": "Twisted Hand Studio",
    "S1-AZK01-121_Kagoro-of-the-Burnt-Path_L_L_die": "Twisted Hand Studio",
    "S1-AZK01-121A_Kagoro-of-the-Burnt-Path_L_L_die": "steamboy",
    "S1-AZK01-122_Rushfire-Gate_G_G_die": "Twisted Hand Studio",
    "S1-AZK01-123_Goro-Graveloth_L_L_die": "Twisted Hand Studio",
    "S1-AZK01-123A_Goro-Graveloth_L_L_die": "Twisted Hand Studio",
    "S1-AZK01-124_Gate-of-Devotion-Gate_G_G_die": "Twisted Hand Studio",
    "S1-AZK01-125_Benzai-the-Sly_L_L_die": "Twisted Hand Studio",
    "S1-AZK01-125A_Benzai-the-Sly_L_L_die": "Twisted Hand Studio",
    "S1-AZK01-126_Gate-of-Echoed-Waves-Gate_G_G_die": "Twisted Hand Studio",
    "S1-AZK01-127_Sundering-Strike_S_UC_die": "Twisted Hand Studio",
    "S1-AZK01-128_Wrong-Step_S_UC_die": "Twisted Hand Studio",
    "S1-AZK01-129_Silk-Tongue-Velya_E_UC_die": "Twisted Hand Studio",
    "AZP-003_IKZ_INV26-Participation_die": "Crowex",
    "S1-STT03-001_Bobu_L_L_die": "Pandart Studio",
    "S1-STT03-001A_Bobu_L_L_die": "steamboy",
    "S1-STT03-002_Stonehaven-Gate_G_G_die": "Angélo Sung",
    "S1-STT03-002A_Stonehaven-Gate_G_G_die": "Angélo Sung",
    "S1-STT03-003_Koyama-Farm-Potter_E_C_die": "Twisted Hand Studio",
    "S1-STT03-004_Sloth-Scarecrow_E_C_die": "Twisted Hand Studio",
    "S1-STT03-005_Wobbly-Cabbage-Cart_E_C_die": "Twisted Hand Studio",
    "S1-STT03-006_Cactus-Farmer_E_UC_die": "Twisted Hand Studio",
    "S1-STT03-007_Koyama-Farm-Caretaker_E_R_die": "Twisted Hand Studio",
    "S1-STT03-008_Midnight-Courier_E_C_die": "Kilo",
    "S1-STT03-009_Warding-Totem_E_UC_die": "Twisted Hand Studio",
    "S1-STT03-010_Shroommancer_E_C_die": "Twisted Hand Studio",
    "S1-STT03-011_Koyama-Farm-Plowman_E_C_die": "Twisted Hand Studio",
    "S1-STT03-012_Miharu-of-the-White-Bloom_E_SR_die": "Twisted Hand Studio",
    "S1-STT03-013_Stone-Masked-Ancient_E_SR_die": "Twisted Hand Studio",
    "S1-STT03-013A_Stone-Masked-Ancient_E_SR_die": "Twisted Hand Studio",
    "S1-STT03-014_Sandcoil-Python_E_UC_die": "Twisted Hand Studio",
    "S1-STT03-015_Jar-of-Beans_S_UC_die": "Twisted Hand Studio",
    "S1-STT03-016_Quicksand_S_R_die": "Twisted Hand Studio",
    "S1-STT03-017_Sprout-of-Fortune_S_C_die": "Twisted Hand Studio",
    "S1-STT04-001_Zero_L_L_die": "Pandart Studio",
    "S1-STT04-001_Zero_L_L_die__2": "Pandart Studio",
    "S1-STT04-002_Ragefire-Gate_G_G_die": "Rylor",
    "S1-STT04-002A_Ragefire-Gate_G_G_die": "Rylor",
    "S1-STT04-003_Cinderwake-Seer_E_UC_die": "Twisted Hand Studio",
    "S1-STT04-004_Fanatic-Kindler_E_C_die": "Twisted Hand Studio",
    "S1-STT04-005_Ruby_E_C_die": "Zhongqiu",
    "S1-STT04-006_Wolf-Cub_E_C_die": "Twisted Hand Studio",
    "S1-STT04-007_Enraged-Howler_E_C_die": "Twisted Hand Studio",
    "S1-STT04-008_Lady-Emberheart_E_UC_die": "Aaron",
    "S1-STT04-009_Cinderwake-Ritualist_E_R_die": "Soysauce",
    "S1-STT04-010_Reckless-Tinkerer_E_C_die": "Twisted Hand Studio",
    "S1-STT04-011_Scorchland-Raven_E_C_die": "Twisted Hand Studio",
    "S1-STT04-012_Spiteful-Raider_E_UC_die": "Twisted Hand Studio",
    "S1-STT04-013_Kurai-the-Volcano_E_SR_die": "Avo",
    "S1-STT04-014_Scorchveil-Shinobi-Suzuka_E_SR_die": "Twisted Hand Studio",
    "S1-STT04-014A_Scorchveil-Shinobi-Suzuka_E_SR_die": "Twisted Hand Studio",
    "S1-STT04-015_Detonation-Pact_S_C_die": "Twisted Hand Studio",
    "S1-STT04-016_Collateral-Burst_S_UC_die": "Twisted Hand Studio",
    "S1-STT04-017_Wrath-of-Sinder_S_R_die": "Twisted Hand Studio",
}

IMAGE_REVIEW_QUEUE = {
    "S1-AZK01-067_Frida_E_C_die": "Image credit line is visible but too stylized/compressed for confident transcription.",
    "S1-AZK01-073_Top-Beanz_E_C_die": "Image credit line appears to match Frida, but remains too stylized/compressed for confident transcription.",
}

USER_PROMO_PHOTO_SOURCE = {
    "kind": "user_provided_photo",
    "date": "2026-06-24",
    "sha256": "59ff048dde6796c4720da70572f615b27ce95bf3f845020f5b42d26c05f7bf44",
    "stored_in_repo": False,
    "note": "The source photo was provided in-session and is not committed to the public repository. The hash anchors the observation without publishing the user's physical-card image.",
}

USER_PROMO_PHOTO_OBSERVATIONS = [
    {
        "OBSERVATION_ID": "promo-photo-20260624-001",
        "ID": "STT03-001",
        "PRINTED_ID": "STT03-001",
        "NORMALIZED_CARD_ID": "STT03-01",
        "IKZ COST": "",
        "NAME": "Bobu",
        "ELEMENT": "Earth",
        "TYPE": "Leader",
        "SUBTYPE_1": "Bobu",
        "SUBTYPE_2": "Brewmaster",
        "SUBTYPE_3": "Stonemend",
        "GATE_PWR": "",
        "ATK": "",
        "HP": "20",
        "PLUS_ATK": "",
        "REF_IP": "",
        "REF_ID": "",
        "REF_IP2": "",
        "REF_ID2": "",
        "RARITY": "L ★",
        "ILLUSTRATOR": "nJoo",
        "E_1": "Once/Turn; Main",
        "E_1_TEXT": "1 IKZ: Until the start of your next turn, the first time an Earth entity in your Garden or Alley is destroyed or sacrificed, you may heal 1 to your leader.",
        "E_2": "",
        "E_2_TEXT": "",
        "F_TEXT": "Another round! Regret washes off... like dirt in the rain.",
        "DEFINITION_TEXT": "",
        "RULING_TEXT": "",
        "STAMP": "Invader visual stamp",
        "IMG": "",
        "ALT_IMG": "",
        "PHYSICAL_LOCATION_IN_IMAGE": "top_left",
        "OBSERVED_AZUKI_NUMBER": "Azuki #40",
        "OBSERVED_STAMP": "Invader visual stamp",
        "MATCHED_GALLERY_UIDS": [
            "azuki_tcg_official_gallery:S1-STT03-001A_Bobu_L_L_die",
            "azuki_tcg_official_gallery:S1-STT03-001_Bobu_L_L_die",
        ],
        "OBSERVATION_CONFIDENCE": "high",
        "OBSERVATION_NOTE": "Physical card appears to share Bobu mechanics with gallery STT03-01, but the printed ID is STT03-001 and the visible illustrator credit is nJoo, unlike the current gallery rows.",
    },
    {
        "OBSERVATION_ID": "promo-photo-20260624-002",
        "ID": "AZP-005",
        "PRINTED_ID": "AZP-005",
        "NORMALIZED_CARD_ID": "AZP-005",
        "IKZ COST": "",
        "NAME": "IKZ Token",
        "ELEMENT": "Neutral",
        "TYPE": "IKZ",
        "SUBTYPE_1": "IKZ",
        "SUBTYPE_2": "Token",
        "SUBTYPE_3": "",
        "GATE_PWR": "",
        "ATK": "",
        "HP": "",
        "PLUS_ATK": "",
        "REF_IP": "",
        "REF_ID": "",
        "REF_IP2": "",
        "REF_ID2": "",
        "RARITY": "IKZ ★",
        "ILLUSTRATOR": "Skycrow",
        "E_1": "",
        "E_1_TEXT": "",
        "E_2": "",
        "E_2_TEXT": "",
        "F_TEXT": "Some doors only open if you're willing to chase the rabbit.",
        "DEFINITION_TEXT": "",
        "RULING_TEXT": "",
        "STAMP": "Promo physical observation",
        "IMG": "",
        "ALT_IMG": "",
        "PHYSICAL_LOCATION_IN_IMAGE": "top_right",
        "OBSERVED_AZUKI_NUMBER": "Azuki #147",
        "OBSERVED_STAMP": "none visible beyond IKZ/promo treatment",
        "MATCHED_GALLERY_UIDS": [],
        "OBSERVATION_CONFIDENCE": "high",
        "OBSERVATION_NOTE": "Printed AZP-005 is not present in the current official gallery snapshot.",
    },
    {
        "OBSERVATION_ID": "promo-photo-20260624-003",
        "ID": "AZK01-028",
        "PRINTED_ID": "AZK01-028",
        "NORMALIZED_CARD_ID": "AZK01-028",
        "IKZ COST": "8",
        "NAME": "Sōryū no Rin",
        "ELEMENT": "Water",
        "TYPE": "Entity",
        "SUBTYPE_1": "Watercrafting",
        "SUBTYPE_2": "Wavecaller",
        "SUBTYPE_3": "",
        "GATE_PWR": "2",
        "ATK": "7",
        "HP": "7",
        "PLUS_ATK": "",
        "REF_IP": "",
        "REF_ID": "",
        "REF_IP2": "",
        "REF_ID2": "",
        "RARITY": "SR ★",
        "ILLUSTRATOR": "Tomugi",
        "E_1": "On Play",
        "E_1_TEXT": "You must discard your hand: Return all other entities in each player's Garden to their owner's hands.",
        "E_2": "",
        "E_2_TEXT": "",
        "F_TEXT": "Struggle if you like. The tide always pulls you back.",
        "DEFINITION_TEXT": "",
        "RULING_TEXT": "",
        "STAMP": "Physical observation",
        "IMG": "",
        "ALT_IMG": "",
        "PHYSICAL_LOCATION_IN_IMAGE": "bottom_left",
        "OBSERVED_AZUKI_NUMBER": "Azuki #60",
        "OBSERVED_STAMP": "none visible beyond star rarity treatment",
        "MATCHED_GALLERY_UIDS": [
            "azuki_tcg_official_gallery:AZK01-028A_Soryu-no-Rin_E_SR_Die",
            "azuki_tcg_official_gallery:S1-AZK01-028_Soryu-no-Rin_E_SR_die",
        ],
        "OBSERVATION_CONFIDENCE": "high",
        "OBSERVATION_NOTE": "Image credit reads Tomugi; linked Alpha sheet currently supplies Comiccho for AZK01-028. Preserve as source conflict, not silent correction.",
    },
    {
        "OBSERVATION_ID": "promo-photo-20260624-004",
        "ID": "AZP-004",
        "PRINTED_ID": "AZP-004",
        "NORMALIZED_CARD_ID": "AZP-004",
        "IKZ COST": "",
        "NAME": "IKZ",
        "ELEMENT": "Neutral",
        "TYPE": "IKZ",
        "SUBTYPE_1": "IKZ",
        "SUBTYPE_2": "",
        "SUBTYPE_3": "",
        "GATE_PWR": "",
        "ATK": "",
        "HP": "",
        "PLUS_ATK": "",
        "REF_IP": "",
        "REF_ID": "",
        "REF_IP2": "",
        "REF_ID2": "",
        "RARITY": "IKZ ★",
        "ILLUSTRATOR": "Arnold Tsang",
        "E_1": "",
        "E_1_TEXT": "",
        "E_2": "",
        "E_2_TEXT": "",
        "F_TEXT": "",
        "DEFINITION_TEXT": "",
        "RULING_TEXT": "",
        "STAMP": "Promo physical observation",
        "IMG": "",
        "ALT_IMG": "",
        "PHYSICAL_LOCATION_IN_IMAGE": "bottom_right",
        "OBSERVED_AZUKI_NUMBER": "",
        "OBSERVED_STAMP": "none visible beyond IKZ/promo treatment",
        "MATCHED_GALLERY_UIDS": [],
        "OBSERVATION_CONFIDENCE": "high",
        "OBSERVATION_NOTE": "Printed AZP-004 is not present in the current official gallery snapshot.",
    },
]


def canonical_json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def csv_text(rows: list[dict[str, Any]], columns: list[str]) -> str:
    handle = io.StringIO()
    writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({column: "" if row.get(column) is None else row.get(column) for column in columns})
    return handle.getvalue()


def fetch_snapshot() -> Path:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(API_URL, headers={"User-Agent": "MarketplaceCatalogBuilder/0.1"})
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = response.read()
    stamp = date.today().isoformat()
    path = SNAPSHOT_DIR / f"cards_api_{stamp}.json"
    path.write_bytes(payload)
    return path


def fetch_url_to_snapshot(url: str, filename: str) -> Path:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "MarketplaceCatalogBuilder/0.1"})
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = response.read()
    path = SNAPSHOT_DIR / filename
    path.write_bytes(payload)
    return path


def fetch_alpha_snapshots() -> tuple[Path, Path]:
    stamp = date.today().isoformat()
    master = fetch_url_to_snapshot(ALPHA_CSV_URL, f"alpha_master_sheet_gid0_{stamp}.csv")
    images = fetch_url_to_snapshot(ALPHA_IMAGE_CSV_URL, f"alpha_image_sheet_gid1096719524_{stamp}.csv")
    return master, images


def newest_snapshot() -> Path:
    snapshots = sorted(SNAPSHOT_DIR.glob("cards_api_*.json"))
    if not snapshots:
        raise FileNotFoundError(
            f"No Azuki TCG snapshot found in {SNAPSHOT_DIR}. Run with --refresh first."
        )
    return snapshots[-1]


def newest_alpha_snapshot() -> Path:
    snapshots = sorted(SNAPSHOT_DIR.glob("alpha_master_sheet_gid0_*.csv"))
    if not snapshots:
        raise FileNotFoundError(
            f"No Azuki TCG alpha master-sheet snapshot found in {SNAPSHOT_DIR}. Run with --refresh first."
        )
    return snapshots[-1]


def newest_alpha_image_snapshot() -> Path | None:
    snapshots = sorted(SNAPSHOT_DIR.glob("alpha_image_sheet_gid1096719524_*.csv"))
    return snapshots[-1] if snapshots else None


def count_values(cards: list[dict[str, Any]], key: str) -> dict[str, int]:
    counter: collections.Counter[str] = collections.Counter()
    for card in cards:
        value = card.get(key)
        if isinstance(value, list):
            for item in value:
                counter[str(item)] += 1
        else:
            counter[str(value)] += 1
    return dict(sorted(counter.items()))


def normalize_card(raw: dict[str, Any], siblings: dict[str, list[str]]) -> dict[str, Any]:
    card_id = raw["cardId"]
    source_id = raw["id"]
    return {
        "uid": f"{RELEASE_ID}:{source_id}",
        "authority_label": "official_gallery_api_fact",
        "source_entry_id": source_id,
        "card_id": card_id,
        "name": raw["name"],
        "image_url": raw["image"],
        "ikz_cost": raw.get("ikzCost"),
        "attack": raw.get("attack"),
        "health": raw.get("health"),
        "gate_power": raw.get("gatePower"),
        "element": raw.get("element"),
        "category": raw.get("category"),
        "abilities": raw.get("abilities") or [],
        "rarity": raw.get("rarity"),
        "subtypes": raw.get("subtypes") or [],
        "card_text": raw.get("cardText") or "",
        "errata": raw.get("errata") or "",
        "sets": raw.get("set") or [],
        "variant_group": {
            "canonical_card_id": card_id,
            "sibling_entry_ids": siblings[card_id],
            "sibling_count": len(siblings[card_id]),
            "is_multi_entry_card_id": len(siblings[card_id]) > 1,
        },
        "not_claiming": AUTHORITY_NOT_CLAIMING,
    }


def clean_sheet_value(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if text in {"", "-", "N/A"}:
        return None
    return text


def sheet_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return "; ".join(str(item) for item in value if item is not None)
    return str(value)


def sheet_int(value: Any) -> int | None:
    text = clean_sheet_value(value)
    if text is None:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    return [row for row in rows if clean_sheet_value(row.get("ID"))]


def split_effects(card_text: str, abilities: list[str]) -> tuple[str, str, str, str]:
    text = (card_text or "").strip()
    if not text:
        return "", "", "", ""

    segments = [segment.strip() for segment in re.split(r"\n\s*\n", text) if segment.strip()]
    effects: list[tuple[str, str]] = []
    for segment in segments:
        match = re.match(r"^((?:\[[^\]]+\])+)\s*(.*)$", segment, flags=re.S)
        if match:
            labels = "; ".join(re.findall(r"\[([^\]]+)\]", match.group(1)))
            effects.append((labels, match.group(2).strip()))
        else:
            effects.append(("", segment))

    if len(effects) == 1 and not effects[0][0] and abilities:
        effects[0] = ("; ".join(abilities), effects[0][1])

    padded = effects[:2] + [("", ""), ("", "")]
    return padded[0][0], padded[0][1], padded[1][0], padded[1][1]


def row_ref(row: dict[str, str], prefix: str = "") -> dict[str, str | None] | None:
    ip = clean_sheet_value(row.get(f"{prefix}REF_IP" if prefix else "REF_IP"))
    ref_id = clean_sheet_value(row.get(f"{prefix}REF_ID" if prefix else "REF_ID"))
    if not ip and not ref_id:
        return None
    return {"ip": ip, "id": ref_id}


def normalize_alpha_card(
    row: dict[str, str],
    gallery_by_card_id: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    card_id = clean_sheet_value(row["ID"])
    assert card_id
    refs = []
    primary = row_ref(row)
    if primary:
        refs.append(primary)
    ip2 = clean_sheet_value(row.get("REF_IP2"))
    id2 = clean_sheet_value(row.get("REF_ID2"))
    if ip2 or id2:
        refs.append({"ip": ip2, "id": id2})

    effects = []
    for label_col, text_col in [("E_1", "E_1_TEXT"), ("E_2", "E_2_TEXT")]:
        label = clean_sheet_value(row.get(label_col))
        text = clean_sheet_value(row.get(text_col))
        if label or text:
            effects.append({"label": label, "text": text})

    subtypes = [
        subtype
        for subtype in [
            clean_sheet_value(row.get("SUBTYPE_1")),
            clean_sheet_value(row.get("SUBTYPE_2")),
            clean_sheet_value(row.get("SUBTYPE_3")),
        ]
        if subtype
    ]
    gallery_entries = gallery_by_card_id.get(card_id, [])

    return {
        "uid": f"{ALPHA_RELEASE_ID}:{card_id}",
        "authority_label": "linked_alpha_master_sheet_fact",
        "card_id": card_id,
        "name": clean_sheet_value(row.get("NAME")),
        "element": clean_sheet_value(row.get("ELEMENT")),
        "category": clean_sheet_value(row.get("TYPE")),
        "subtypes": subtypes,
        "ikz_cost": sheet_int(row.get("IKZ COST")),
        "gate_power": sheet_int(row.get("GATE_PWR")),
        "attack": sheet_int(row.get("ATK")),
        "health": sheet_int(row.get("HP")),
        "plus_attack": sheet_int(row.get("PLUS_ATK")),
        "reference_ips": refs,
        "rarity": clean_sheet_value(row.get("RARITY")),
        "illustrator": clean_sheet_value(row.get("ILLUSTRATOR")),
        "effects": effects,
        "flavor_text": clean_sheet_value(row.get("F_TEXT")),
        "definition_text": clean_sheet_value(row.get("DEFINITION_TEXT")),
        "ruling_text": clean_sheet_value(row.get("RULING_TEXT")),
        "stamp": clean_sheet_value(row.get("STAMP")),
        "source_image_cell": clean_sheet_value(row.get("IMG")),
        "source_alt_image_cell": clean_sheet_value(row.get("ALT_IMG")),
        "gallery_crosswalk": {
            "matched_gallery_entries": [
                {
                    "uid": entry["uid"],
                    "source_entry_id": entry["source_entry_id"],
                    "image_url": entry["image_url"],
                    "rarity": entry["rarity"],
                    "sets": entry["sets"],
                }
                for entry in gallery_entries
            ],
            "matched_count": len(gallery_entries),
        },
        "not_claiming": ALPHA_NOT_CLAIMING,
    }


def build(snapshot_path: Path) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any]]:
    raw_payload = read_json(snapshot_path)
    cards = raw_payload.get("cards")
    if not isinstance(cards, list):
        raise ValueError(f"{snapshot_path}: expected cards list")

    for i, card in enumerate(cards):
        if not isinstance(card, dict):
            raise ValueError(f"card[{i}] is not an object")
        missing = sorted(EXPECTED_CARD_KEYS - set(card))
        if missing:
            raise ValueError(f"{card.get('id', i)} missing expected keys: {missing}")

    sibling_map: dict[str, list[str]] = collections.defaultdict(list)
    for card in cards:
        sibling_map[card["cardId"]].append(card["id"])
    sibling_map = {key: sorted(value) for key, value in sorted(sibling_map.items())}

    normalized_cards = [normalize_card(card, sibling_map) for card in sorted(cards, key=lambda c: (c["cardId"], c["id"]))]

    unknown_categories = sorted({card.get("category") for card in cards} - EXPECTED_CATEGORIES)
    unknown_elements = sorted({card.get("element") for card in cards} - EXPECTED_ELEMENTS)
    multi_entry_card_ids = {
        card_id: ids for card_id, ids in sibling_map.items() if len(ids) > 1
    }

    snapshot_bytes = snapshot_path.read_bytes()
    snapshot_sha = sha256_bytes(snapshot_bytes)
    snapshot_date = snapshot_path.stem.replace("cards_api_", "")

    release = {
        "schema": "azuki_tcg_official_gallery_catalog_v0.1",
        "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
        "hash_algorithm": "sha256",
        "release_family_id": RELEASE_ID,
        "name": "Azuki TCG Official Card Gallery",
        "source": {
            "api_url": API_URL,
            "gallery_url": GALLERY_URL,
            "snapshot_path": str(snapshot_path.relative_to(ROOT)),
            "snapshot_sha256": snapshot_sha,
            "retrieved": snapshot_date,
            "authority_label": "official_gallery_api_fact",
            "not_claiming": AUTHORITY_NOT_CLAIMING,
        },
        "counts": {
            "official_api_count": raw_payload.get("count"),
            "gallery_entries": len(cards),
            "unique_card_ids": len(sibling_map),
            "multi_entry_card_ids": len(multi_entry_card_ids),
        },
        "distributions": {
            "category": count_values(cards, "category"),
            "element": count_values(cards, "element"),
            "rarity": count_values(cards, "rarity"),
            "set": count_values(cards, "set"),
        },
        "known_source_anomalies": [
            {
                "kind": "unexpected_category_value",
                "values": unknown_categories,
                "affected_entry_ids": sorted(
                    card["id"] for card in cards if card.get("category") in unknown_categories
                ),
                "authority_label": "source_preserved_not_corrected",
                "note": "The official endpoint currently has category values outside the gallery filter categories. The importer preserves them instead of normalizing silently.",
            }
        ]
        if unknown_categories
        else [],
        "cards": normalized_cards,
        "not_claiming": AUTHORITY_NOT_CLAIMING,
    }

    index = {
        "schema": "azuki_tcg_catalog_index_v0.1",
        "release_family_id": RELEASE_ID,
        "release_path": f"data/azuki-tcg/releases/{RELEASE_ID}.json",
        "counts": release["counts"],
        "by_card_id": {
            card_id: [f"{RELEASE_ID}:{entry_id}" for entry_id in ids]
            for card_id, ids in sibling_map.items()
        },
        "by_name": {},
        "by_set": {},
        "by_rarity": {},
        "by_element": {},
        "by_category": {},
    }
    for card in normalized_cards:
        for field, key in [
            ("by_name", "name"),
            ("by_rarity", "rarity"),
            ("by_element", "element"),
            ("by_category", "category"),
        ]:
            index[field].setdefault(str(card[key]), []).append(card["uid"])
        for set_name in card["sets"]:
            index["by_set"].setdefault(str(set_name), []).append(card["uid"])
    for field in ["by_name", "by_set", "by_rarity", "by_element", "by_category"]:
        index[field] = {key: sorted(value) for key, value in sorted(index[field].items())}

    release_sha = sha256_text(canonical_json(release))
    index_sha = sha256_text(canonical_json(index))
    snapshot_date = snapshot_path.stem.replace("cards_api_", "")
    manifest = {
        "schema": "azuki_tcg_catalog_manifest_v0.1",
        "generated_at": f"{snapshot_date}T00:00:00+00:00",
        "source_snapshot": {
            "path": str(snapshot_path.relative_to(ROOT)),
            "sha256": snapshot_sha,
            "api_url": API_URL,
        },
        "artifacts": {
            "release": {
                "path": f"data/azuki-tcg/releases/{RELEASE_ID}.json",
                "sha256": release_sha,
            },
            "index": {
                "path": "data/azuki-tcg/index.json",
                "sha256": index_sha,
            },
        },
        "counts": release["counts"],
        "not_claiming": AUTHORITY_NOT_CLAIMING,
    }

    audit = {
        "schema": "azuki_tcg_catalog_audit_v0.1",
        "passed": True,
        "status": "official_gallery_snapshot_imported_with_disclosed_residuals",
        "checks": {
            "api_count_matches_entries": raw_payload.get("count") == len(cards),
            "all_expected_keys_present": True,
            "uid_count_matches_entries": len({card["uid"] for card in normalized_cards}) == len(cards),
            "image_urls_present": all(card["image_url"] for card in normalized_cards),
            "unknown_categories_preserved": unknown_categories,
            "unknown_elements": unknown_elements,
        },
        "counts": release["counts"],
        "multi_entry_card_ids": multi_entry_card_ids,
        "not_claiming": AUTHORITY_NOT_CLAIMING,
    }

    if not audit["checks"]["api_count_matches_entries"]:
        audit["passed"] = False
        audit["status"] = "api_count_mismatch"
    if unknown_elements:
        audit["passed"] = False
        audit["status"] = "unknown_element_values"

    return release, index, manifest, audit


def build_alpha(
    master_snapshot_path: Path,
    image_snapshot_path: Path | None,
    gallery_release: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    rows = read_csv_rows(master_snapshot_path)
    gallery_by_card_id: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    for card in gallery_release["cards"]:
        gallery_by_card_id[card["card_id"]].append(card)
    gallery_by_card_id = {key: sorted(value, key=lambda c: c["uid"]) for key, value in sorted(gallery_by_card_id.items())}

    cards = [normalize_alpha_card(row, gallery_by_card_id) for row in rows]
    cards.sort(key=lambda card: card["card_id"])
    card_ids = [card["card_id"] for card in cards]
    duplicate_ids = sorted(card_id for card_id, count in collections.Counter(card_ids).items() if count > 1)
    missing_from_gallery = sorted(card["card_id"] for card in cards if card["gallery_crosswalk"]["matched_count"] == 0)
    non_alpha_stamps = sorted(
        (
            {"card_id": card["card_id"], "stamp": card["stamp"]}
            for card in cards
            if card.get("stamp") != "Alpha"
        ),
        key=lambda item: item["card_id"],
    )

    snapshot_sha = sha256_bytes(master_snapshot_path.read_bytes())
    image_snapshot = None
    if image_snapshot_path:
        image_snapshot = {
            "path": str(image_snapshot_path.relative_to(ROOT)),
            "sha256": sha256_bytes(image_snapshot_path.read_bytes()),
            "gid": "1096719524",
            "note": "Companion image tab from the linked Google Sheet; the current normalized alpha cards use the master sheet fields and preserve image cells separately.",
        }

    release = {
        "schema": "azuki_tcg_alpha_master_sheet_catalog_v0.1",
        "canonicalization": "json_sorted_keys_no_whitespace_v0.1",
        "hash_algorithm": "sha256",
        "release_family_id": ALPHA_RELEASE_ID,
        "name": "Azuki TCG Alpha Master Sheet",
        "source": {
            "bitly_url": "http://bit.ly/3JwO6gP",
            "sheet_url": ALPHA_SHEET_URL,
            "csv_url": ALPHA_CSV_URL,
            "snapshot_path": str(master_snapshot_path.relative_to(ROOT)),
            "snapshot_sha256": snapshot_sha,
            "companion_image_snapshot": image_snapshot,
            "authority_label": "linked_alpha_master_sheet_fact",
            "not_claiming": ALPHA_NOT_CLAIMING,
        },
        "counts": {
            "sheet_rows": len(rows),
            "catalog_cards": len(cards),
            "unique_card_ids": len(set(card_ids)),
            "gallery_crosswalk_matched_cards": sum(1 for card in cards if card["gallery_crosswalk"]["matched_count"] > 0),
            "gallery_crosswalk_unmatched_cards": len(missing_from_gallery),
        },
        "distributions": {
            "category": count_values(cards, "category"),
            "element": count_values(cards, "element"),
            "rarity": count_values(cards, "rarity"),
            "stamp": count_values(cards, "stamp"),
            "illustrator": count_values(cards, "illustrator"),
        },
        "known_source_boundaries": [
            {
                "kind": "non_alpha_stamp_present",
                "rows": non_alpha_stamps,
                "authority_label": "source_preserved_not_corrected",
                "note": "The sheet is treated as the Alpha Master Sheet source even when a row stamp is not exactly Alpha; row-level stamp text is preserved.",
            }
        ]
        if non_alpha_stamps
        else [],
        "gallery_crosswalk": {
            "matched_card_ids": sorted(card["card_id"] for card in cards if card["gallery_crosswalk"]["matched_count"] > 0),
            "unmatched_card_ids": missing_from_gallery,
            "not_claiming": [
                "gallery entry equivalence beyond shared card ID",
                "same image treatment",
                "same rarity treatment",
            ],
        },
        "cards": cards,
        "not_claiming": ALPHA_NOT_CLAIMING,
    }

    audit = {
        "schema": "azuki_tcg_alpha_master_sheet_audit_v0.1",
        "passed": True,
        "status": "alpha_master_sheet_imported_with_disclosed_residuals",
        "checks": {
            "row_count_matches_cards": len(rows) == len(cards),
            "no_duplicate_card_ids": not duplicate_ids,
            "all_rows_have_names": all(card["name"] for card in cards),
            "all_rows_have_illustrator_or_token_boundary": all(
                card["illustrator"] for card in cards
            ),
            "gallery_crosswalk_unmatched_card_ids": missing_from_gallery,
        },
        "counts": release["counts"],
        "not_claiming": ALPHA_NOT_CLAIMING,
    }
    if duplicate_ids:
        audit["passed"] = False
        audit["status"] = "duplicate_alpha_card_ids"
    if not audit["checks"]["all_rows_have_names"]:
        audit["passed"] = False
        audit["status"] = "alpha_rows_missing_names"
    return release, audit


def build_combined_index(gallery_release: dict[str, Any], alpha_release: dict[str, Any]) -> dict[str, Any]:
    by_card_id: dict[str, dict[str, list[str]]] = {}
    for card in gallery_release["cards"]:
        by_card_id.setdefault(card["card_id"], {"official_gallery": [], "alpha_master_sheet": []})
        by_card_id[card["card_id"]]["official_gallery"].append(card["uid"])
    for card in alpha_release["cards"]:
        by_card_id.setdefault(card["card_id"], {"official_gallery": [], "alpha_master_sheet": []})
        by_card_id[card["card_id"]]["alpha_master_sheet"].append(card["uid"])
    by_card_id = {
        card_id: {source: sorted(uids) for source, uids in sources.items()}
        for card_id, sources in sorted(by_card_id.items())
    }

    def bucket(cards: list[dict[str, Any]], key: str) -> dict[str, list[str]]:
        result: dict[str, list[str]] = {}
        for card in cards:
            value = card.get(key)
            if isinstance(value, list):
                values = value
            else:
                values = [value]
            for item in values:
                result.setdefault(str(item), []).append(card["uid"])
        return {key: sorted(value) for key, value in sorted(result.items())}

    return {
        "schema": "azuki_tcg_catalog_index_v0.2",
        "catalogs": {
            "official_gallery": {
                "release_family_id": RELEASE_ID,
                "release_path": f"data/azuki-tcg/releases/{RELEASE_ID}.json",
                "counts": gallery_release["counts"],
                "authority_label": "official_gallery_api_fact",
            },
            "alpha_master_sheet": {
                "release_family_id": ALPHA_RELEASE_ID,
                "release_path": f"data/azuki-tcg/releases/{ALPHA_RELEASE_ID}.json",
                "counts": alpha_release["counts"],
                "authority_label": "linked_alpha_master_sheet_fact",
            },
        },
        "by_card_id": by_card_id,
        "official_gallery": {
            "by_name": bucket(gallery_release["cards"], "name"),
            "by_set": bucket(gallery_release["cards"], "sets"),
            "by_rarity": bucket(gallery_release["cards"], "rarity"),
            "by_element": bucket(gallery_release["cards"], "element"),
            "by_category": bucket(gallery_release["cards"], "category"),
        },
        "alpha_master_sheet": {
            "by_name": bucket(alpha_release["cards"], "name"),
            "by_stamp": bucket(alpha_release["cards"], "stamp"),
            "by_rarity": bucket(alpha_release["cards"], "rarity"),
            "by_element": bucket(alpha_release["cards"], "element"),
            "by_category": bucket(alpha_release["cards"], "category"),
            "by_illustrator": bucket(alpha_release["cards"], "illustrator"),
        },
    }


def alpha_completion_row_from_alpha(card: dict[str, Any], gallery_card: dict[str, Any]) -> dict[str, Any]:
    effects = card.get("effects") or []
    first = effects[0] if len(effects) > 0 else {}
    second = effects[1] if len(effects) > 1 else {}
    refs = card.get("reference_ips") or []
    primary = refs[0] if len(refs) > 0 else {}
    secondary = refs[1] if len(refs) > 1 else {}
    row = {
        "ID": card["card_id"],
        "IKZ COST": sheet_value(card.get("ikz_cost")),
        "NAME": sheet_value(card.get("name")),
        "ELEMENT": sheet_value(card.get("element")),
        "TYPE": sheet_value(card.get("category")),
        "SUBTYPE_1": sheet_value((card.get("subtypes") or [""])[0] if len(card.get("subtypes") or []) > 0 else ""),
        "SUBTYPE_2": sheet_value((card.get("subtypes") or ["", ""])[1] if len(card.get("subtypes") or []) > 1 else ""),
        "SUBTYPE_3": sheet_value((card.get("subtypes") or ["", "", ""])[2] if len(card.get("subtypes") or []) > 2 else ""),
        "GATE_PWR": sheet_value(card.get("gate_power")),
        "ATK": sheet_value(card.get("attack")),
        "HP": sheet_value(card.get("health")),
        "PLUS_ATK": sheet_value(card.get("plus_attack")),
        "REF_IP": sheet_value(primary.get("ip")),
        "REF_ID": sheet_value(primary.get("id")),
        "REF_IP2": sheet_value(secondary.get("ip")),
        "REF_ID2": sheet_value(secondary.get("id")),
        "RARITY": sheet_value(card.get("rarity")),
        "ILLUSTRATOR": sheet_value(card.get("illustrator")),
        "E_1": sheet_value(first.get("label")),
        "E_1_TEXT": sheet_value(first.get("text")),
        "E_2": sheet_value(second.get("label")),
        "E_2_TEXT": sheet_value(second.get("text")),
        "F_TEXT": sheet_value(card.get("flavor_text")),
        "DEFINITION_TEXT": sheet_value(card.get("definition_text")),
        "RULING_TEXT": sheet_value(card.get("ruling_text")),
        "STAMP": sheet_value(card.get("stamp")),
        "IMG": sheet_value(gallery_card.get("image_url") or card.get("source_image_cell")),
        "ALT_IMG": sheet_value(card.get("source_alt_image_cell")),
        "ROW_KEY": gallery_card["uid"],
        "SOURCE_RELEASE": "alpha_master_sheet_crosswalk",
        "SOURCE_ENTRY_ID": sheet_value(gallery_card.get("source_entry_id")),
        "SETS": sheet_value(gallery_card.get("sets")),
        "IMAGE_URL": sheet_value(gallery_card.get("image_url")),
        "FIELD_SOURCE": "linked_alpha_master_sheet; official_gallery_image_url",
        "REVIEW_STATUS": "sheet_sourced",
    }
    return row


def alpha_completion_row_from_gallery(card: dict[str, Any]) -> dict[str, Any]:
    e1, e1_text, e2, e2_text = split_effects(card.get("card_text") or "", card.get("abilities") or [])
    subtypes = card.get("subtypes") or []
    source_entry_id = card["source_entry_id"]
    illustrator = IMAGE_READ_ILLUSTRATORS.get(source_entry_id, "")
    category = card.get("category")
    attack = card.get("attack")
    plus_attack = attack if category == "Weapon" else None
    row = {
        "ID": card["card_id"],
        "IKZ COST": sheet_value(card.get("ikz_cost")),
        "NAME": sheet_value(card.get("name")),
        "ELEMENT": sheet_value(card.get("element")),
        "TYPE": sheet_value(category),
        "SUBTYPE_1": sheet_value(subtypes[0] if len(subtypes) > 0 else ""),
        "SUBTYPE_2": sheet_value(subtypes[1] if len(subtypes) > 1 else ""),
        "SUBTYPE_3": sheet_value(subtypes[2] if len(subtypes) > 2 else ""),
        "GATE_PWR": sheet_value(card.get("gate_power")),
        "ATK": "" if category == "Weapon" else sheet_value(attack),
        "HP": sheet_value(card.get("health")),
        "PLUS_ATK": sheet_value(plus_attack),
        "REF_IP": "",
        "REF_ID": "",
        "REF_IP2": "",
        "REF_ID2": "",
        "RARITY": sheet_value(card.get("rarity")),
        "ILLUSTRATOR": illustrator,
        "E_1": e1,
        "E_1_TEXT": e1_text,
        "E_2": e2,
        "E_2_TEXT": e2_text,
        "F_TEXT": "",
        "DEFINITION_TEXT": "; ".join(card.get("abilities") or []),
        "RULING_TEXT": category if category in {"Spell", "Weapon", "Gate", "IKZ"} else "",
        "STAMP": sheet_value(card.get("sets")),
        "IMG": sheet_value(card.get("image_url")),
        "ALT_IMG": "",
        "ROW_KEY": card["uid"],
        "SOURCE_RELEASE": "official_gallery_completion",
        "SOURCE_ENTRY_ID": source_entry_id,
        "SETS": sheet_value(card.get("sets")),
        "IMAGE_URL": sheet_value(card.get("image_url")),
        "FIELD_SOURCE": "official_gallery_api; image_view_illustrator" if illustrator else "official_gallery_api",
        "REVIEW_STATUS": "image_credit_read" if illustrator else "needs_image_credit_review",
    }
    if source_entry_id in IMAGE_REVIEW_QUEUE:
        row["REVIEW_STATUS"] = "needs_image_credit_review"
    return row


def build_alpha_fields_completion(
    gallery_release: dict[str, Any],
    alpha_release: dict[str, Any],
) -> tuple[str, dict[str, Any]]:
    alpha_by_card_id = {card["card_id"]: card for card in alpha_release["cards"]}
    rows: list[dict[str, Any]] = []
    for gallery_card in gallery_release["cards"]:
        alpha_card = alpha_by_card_id.get(gallery_card["card_id"])
        if alpha_card:
            row = alpha_completion_row_from_alpha(alpha_card, gallery_card)
        else:
            row = alpha_completion_row_from_gallery(gallery_card)
        missing = [column for column in ALPHA_COLUMNS if not sheet_value(row.get(column))]
        row["MISSING_ALPHA_FIELDS"] = "; ".join(missing)
        rows.append(row)

    rows.sort(key=lambda row: (row["ID"], row["SOURCE_ENTRY_ID"]))
    columns = ALPHA_COLUMNS + COMPLETION_EXTRA_COLUMNS
    text = csv_text(rows, columns)
    missing_counts: collections.Counter[str] = collections.Counter()
    for row in rows:
        for column in row["MISSING_ALPHA_FIELDS"].split("; "):
            if column:
                missing_counts[column] += 1
    illustrator_sources = collections.Counter(
        "alpha_sheet"
        if row["SOURCE_RELEASE"] == "alpha_master_sheet_crosswalk" and row["ILLUSTRATOR"]
        else "image_view"
        if row["ILLUSTRATOR"]
        else "blank"
        for row in rows
    )
    provenance = {
        "schema": "azuki_tcg_alpha_fields_completion_provenance_v0.1",
        "name": "Azuki TCG Alpha-Field Completion Spreadsheet",
        "spreadsheet_path": f"data/azuki-tcg/spreadsheets/{ALPHA_FIELDS_COMPLETION_ID}.csv",
        "row_count": len(rows),
        "columns": columns,
        "source_policy": {
            "alpha_master_sheet_crosswalk": "If a gallery entry shares a card ID with the linked Alpha Master Sheet, Alpha sheet fields are used for Alpha-style columns and the gallery supplies the image URL/unique source row.",
            "official_gallery_completion": "If no Alpha row exists, mechanical fields are derived from the official gallery API. Illustrator is filled only when the card image credit line was manually readable.",
            "not_claiming": [
                "that an image-view illustrator read has the same authority as the Alpha Master Sheet",
                "reference IP/ID when the official gallery API does not provide it",
                "flavor text when it appears only in card art and has not been transcribed",
                "physical-card authenticity, possession, condition, or market value",
            ],
        },
        "counts": {
            "rows": len(rows),
            "unique_row_keys": len({row["ROW_KEY"] for row in rows}),
            "alpha_crosswalk_rows": sum(1 for row in rows if row["SOURCE_RELEASE"] == "alpha_master_sheet_crosswalk"),
            "official_gallery_completion_rows": sum(1 for row in rows if row["SOURCE_RELEASE"] == "official_gallery_completion"),
            "image_view_illustrator_rows": illustrator_sources["image_view"],
            "blank_illustrator_rows": illustrator_sources["blank"],
            "review_queue_rows": sum(1 for row in rows if row["REVIEW_STATUS"] == "needs_image_credit_review"),
        },
        "missing_alpha_field_counts": dict(sorted(missing_counts.items())),
        "image_review_queue": {
            source_entry_id: {
                "note": note,
                "gallery_image_url": next(
                    card["image_url"]
                    for card in gallery_release["cards"]
                    if card["source_entry_id"] == source_entry_id
                ),
            }
            for source_entry_id, note in sorted(IMAGE_REVIEW_QUEUE.items())
        },
    }
    return text, provenance


def build_promo_observations(gallery_release: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    gallery_uids = {card["uid"] for card in gallery_release["cards"]}
    rows: list[dict[str, Any]] = []
    for observation in USER_PROMO_PHOTO_OBSERVATIONS:
        row = dict(observation)
        row["MATCHED_GALLERY_UIDS"] = "; ".join(row.get("MATCHED_GALLERY_UIDS") or [])
        row["SOURCE_IMAGE_SHA256"] = USER_PROMO_PHOTO_SOURCE["sha256"]
        row["SOURCE_IMAGE_STORED"] = str(USER_PROMO_PHOTO_SOURCE["stored_in_repo"]).lower()
        row["AUTHORITY_LABEL"] = "user_photo_observation_not_official_gallery_fact"
        rows.append(row)

    columns = ALPHA_COLUMNS + PROMO_OBSERVATION_EXTRA_COLUMNS
    text = csv_text(rows, columns)
    missing_gallery_matches = [
        {
            "observation_id": observation["OBSERVATION_ID"],
            "unmatched_gallery_uids": sorted(
                uid for uid in observation.get("MATCHED_GALLERY_UIDS", []) if uid not in gallery_uids
            ),
        }
        for observation in USER_PROMO_PHOTO_OBSERVATIONS
    ]
    missing_gallery_matches = [item for item in missing_gallery_matches if item["unmatched_gallery_uids"]]
    not_in_gallery = [
        observation["PRINTED_ID"]
        for observation in USER_PROMO_PHOTO_OBSERVATIONS
        if not observation.get("MATCHED_GALLERY_UIDS")
    ]
    source_conflicts = [
        {
            "observation_id": "promo-photo-20260624-003",
            "printed_id": "AZK01-028",
            "field": "ILLUSTRATOR",
            "observed_value": "Tomugi",
            "linked_alpha_sheet_value": "Comiccho",
            "disposition": "preserve_as_source_conflict_not_silent_correction",
        }
    ]
    provenance = {
        "schema": "azuki_tcg_promo_observation_provenance_v0.1",
        "name": "Azuki TCG User Photo Promo Observations",
        "csv_path": f"data/azuki-tcg/observations/{PROMO_OBSERVATION_ID}.csv",
        "source": USER_PROMO_PHOTO_SOURCE,
        "row_count": len(rows),
        "counts": {
            "rows": len(rows),
            "unique_observation_ids": len({row["OBSERVATION_ID"] for row in rows}),
            "observed_cards_not_in_gallery_snapshot": len(not_in_gallery),
            "source_conflicts": len(source_conflicts),
        },
        "observed_cards_not_in_gallery_snapshot": not_in_gallery,
        "source_conflicts": source_conflicts,
        "checks": {
            "all_observations_have_printed_id": all(row["PRINTED_ID"] for row in rows),
            "all_observations_have_authority_label": all(row["AUTHORITY_LABEL"] for row in rows),
            "matched_gallery_uids_exist": not missing_gallery_matches,
            "source_image_not_committed": USER_PROMO_PHOTO_SOURCE["stored_in_repo"] is False,
        },
        "not_claiming": [
            "official checklist inclusion for observed printed IDs absent from the gallery snapshot",
            "market value",
            "seller possession beyond the single user-provided photo",
            "physical authenticity or condition",
            "that the user photo should overwrite linked sheet or gallery fields",
        ],
    }
    return text, provenance


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true", help="Fetch the official API and linked alpha sheet into dated snapshots before building.")
    parser.add_argument("--check", action="store_true", help="Verify generated files are current without writing.")
    args = parser.parse_args()

    if args.refresh:
        snapshot_path = fetch_snapshot()
        alpha_snapshot_path, alpha_image_snapshot_path = fetch_alpha_snapshots()
    else:
        snapshot_path = newest_snapshot()
        alpha_snapshot_path = newest_alpha_snapshot()
        alpha_image_snapshot_path = newest_alpha_image_snapshot()

    release, _legacy_index, _legacy_manifest, gallery_audit = build(snapshot_path)
    alpha_release, alpha_audit = build_alpha(alpha_snapshot_path, alpha_image_snapshot_path, release)
    index = build_combined_index(release, alpha_release)
    completion_csv, completion_provenance = build_alpha_fields_completion(release, alpha_release)
    promo_observations_csv, promo_observations_provenance = build_promo_observations(release)

    release_sha = sha256_text(canonical_json(release))
    alpha_release_sha = sha256_text(canonical_json(alpha_release))
    index_sha = sha256_text(canonical_json(index))
    completion_csv_sha = sha256_text(completion_csv)
    completion_provenance_sha = sha256_text(canonical_json(completion_provenance))
    promo_observations_csv_sha = sha256_text(promo_observations_csv)
    promo_observations_provenance_sha = sha256_text(canonical_json(promo_observations_provenance))
    snapshot_date = snapshot_path.stem.replace("cards_api_", "")
    alpha_source = {
        "path": str(alpha_snapshot_path.relative_to(ROOT)),
        "sha256": sha256_bytes(alpha_snapshot_path.read_bytes()),
        "csv_url": ALPHA_CSV_URL,
        "sheet_url": ALPHA_SHEET_URL,
    }
    if alpha_image_snapshot_path:
        alpha_source["companion_image_snapshot"] = {
            "path": str(alpha_image_snapshot_path.relative_to(ROOT)),
            "sha256": sha256_bytes(alpha_image_snapshot_path.read_bytes()),
            "csv_url": ALPHA_IMAGE_CSV_URL,
        }

    manifest = {
        "schema": "azuki_tcg_catalog_manifest_v0.2",
        "generated_at": f"{snapshot_date}T00:00:00+00:00",
        "source_snapshots": {
            "official_gallery": {
                "path": str(snapshot_path.relative_to(ROOT)),
                "sha256": sha256_bytes(snapshot_path.read_bytes()),
                "api_url": API_URL,
            },
            "alpha_master_sheet": alpha_source,
        },
        "artifacts": {
            "official_gallery_release": {
                "path": f"data/azuki-tcg/releases/{RELEASE_ID}.json",
                "sha256": release_sha,
            },
            "alpha_master_sheet_release": {
                "path": f"data/azuki-tcg/releases/{ALPHA_RELEASE_ID}.json",
                "sha256": alpha_release_sha,
            },
            "index": {
                "path": "data/azuki-tcg/index.json",
                "sha256": index_sha,
            },
            "alpha_fields_completion_csv": {
                "path": f"data/azuki-tcg/spreadsheets/{ALPHA_FIELDS_COMPLETION_ID}.csv",
                "sha256": completion_csv_sha,
            },
            "alpha_fields_completion_provenance": {
                "path": f"data/azuki-tcg/spreadsheets/{ALPHA_FIELDS_COMPLETION_ID}_provenance.json",
                "sha256": completion_provenance_sha,
            },
            "promo_observations_csv": {
                "path": f"data/azuki-tcg/observations/{PROMO_OBSERVATION_ID}.csv",
                "sha256": promo_observations_csv_sha,
            },
            "promo_observations_provenance": {
                "path": f"data/azuki-tcg/observations/{PROMO_OBSERVATION_ID}_provenance.json",
                "sha256": promo_observations_provenance_sha,
            },
        },
        "counts": {
            "official_gallery": release["counts"],
            "alpha_master_sheet": alpha_release["counts"],
            "alpha_fields_completion": completion_provenance["counts"],
            "promo_observations": promo_observations_provenance["counts"],
        },
        "not_claiming": sorted(set(AUTHORITY_NOT_CLAIMING + ALPHA_NOT_CLAIMING)),
    }

    completion_checks = {
        "row_count_matches_official_gallery_entries": completion_provenance["row_count"] == release["counts"]["gallery_entries"],
        "has_unique_row_keys": completion_provenance["counts"]["unique_row_keys"] == completion_provenance["counts"]["rows"],
        "image_review_queue_disclosed": completion_provenance["counts"]["review_queue_rows"] == len(IMAGE_REVIEW_QUEUE),
        "blank_illustrator_rows_disclosed": completion_provenance["counts"]["blank_illustrator_rows"] == len(IMAGE_REVIEW_QUEUE),
    }
    completion_passed = all(completion_checks.values())
    promo_observation_checks = promo_observations_provenance["checks"]
    promo_observations_passed = all(promo_observation_checks.values())
    sources_passed = gallery_audit["passed"] and alpha_audit["passed"]
    audit = {
        "schema": "azuki_tcg_catalog_audit_v0.2",
        "passed": sources_passed and completion_passed and promo_observations_passed,
        "status": "azuki_sources_imported_with_disclosed_residuals"
        if sources_passed and completion_passed and promo_observations_passed
        else "azuki_source_import_failed",
        "checks": {
            "official_gallery": gallery_audit["checks"],
            "alpha_master_sheet": alpha_audit["checks"],
            "alpha_fields_completion": completion_checks,
            "promo_observations": promo_observation_checks,
        },
        "counts": manifest["counts"],
        "not_claiming": manifest["not_claiming"],
    }

    json_targets = {
        RELEASE_DIR / f"{RELEASE_ID}.json": release,
        RELEASE_DIR / f"{ALPHA_RELEASE_ID}.json": alpha_release,
        BASE / "index.json": index,
        BASE / "manifest.json": manifest,
        BASE / "audit.json": audit,
        SPREADSHEET_DIR / f"{ALPHA_FIELDS_COMPLETION_ID}_provenance.json": completion_provenance,
        OBSERVATION_DIR / f"{PROMO_OBSERVATION_ID}_provenance.json": promo_observations_provenance,
    }
    text_targets = {
        SPREADSHEET_DIR / f"{ALPHA_FIELDS_COMPLETION_ID}.csv": completion_csv,
        OBSERVATION_DIR / f"{PROMO_OBSERVATION_ID}.csv": promo_observations_csv,
    }

    if args.check:
        mismatches = []
        for path, data in json_targets.items():
            if not path.exists():
                mismatches.append(f"missing {path.relative_to(ROOT)}")
                continue
            current = path.read_text(encoding="utf-8")
            expected = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
            if current != expected:
                mismatches.append(f"stale {path.relative_to(ROOT)}")
        for path, expected in text_targets.items():
            if not path.exists():
                mismatches.append(f"missing {path.relative_to(ROOT)}")
                continue
            current = path.read_text(encoding="utf-8")
            if current != expected:
                mismatches.append(f"stale {path.relative_to(ROOT)}")
        print(json.dumps({"passed": not mismatches and audit["passed"], "snapshots": {"official_gallery": str(snapshot_path.relative_to(ROOT)), "alpha_master_sheet": str(alpha_snapshot_path.relative_to(ROOT))}, "counts": manifest["counts"], "mismatches": mismatches, "audit_status": audit["status"]}, indent=2, sort_keys=True))
        if mismatches or not audit["passed"]:
            sys.exit(1)
        return

    for path, data in json_targets.items():
        write_json(path, data)
    for path, text in text_targets.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    wrote = list(json_targets) + list(text_targets)
    print(json.dumps({"wrote": [str(path.relative_to(ROOT)) for path in wrote], "snapshots": {"official_gallery": str(snapshot_path.relative_to(ROOT)), "alpha_master_sheet": str(alpha_snapshot_path.relative_to(ROOT))}, "counts": manifest["counts"], "audit_status": audit["status"]}, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
