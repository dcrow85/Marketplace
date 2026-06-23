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
import json
import sys
import urllib.request
from datetime import date
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data" / "azuki-tcg"
SNAPSHOT_DIR = BASE / "source-snapshots"
RELEASE_DIR = BASE / "releases"
API_URL = "https://tcg.azuki.com/api/cards"
GALLERY_URL = "https://tcg.azuki.com/gallery"
RELEASE_ID = "azuki_tcg_official_gallery"
ALPHA_SHEET_ID = "10HREsBCaSkEvbPdM505PZSbXxiWGEP-Itv96Xa5Ene0"
ALPHA_SHEET_URL = f"https://docs.google.com/spreadsheets/d/{ALPHA_SHEET_ID}/edit?gid=0#gid=0"
ALPHA_CSV_URL = f"https://docs.google.com/spreadsheets/d/{ALPHA_SHEET_ID}/gviz/tq?tqx=out:csv&gid=0"
ALPHA_IMAGE_CSV_URL = f"https://docs.google.com/spreadsheets/d/{ALPHA_SHEET_ID}/gviz/tq?tqx=out:csv&gid=1096719524"
ALPHA_RELEASE_ID = "azuki_tcg_alpha_master_sheet"

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
    today = date.today().isoformat()

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
            "retrieved": today,
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

    release_sha = sha256_text(canonical_json(release))
    alpha_release_sha = sha256_text(canonical_json(alpha_release))
    index_sha = sha256_text(canonical_json(index))
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
        },
        "counts": {
            "official_gallery": release["counts"],
            "alpha_master_sheet": alpha_release["counts"],
        },
        "not_claiming": sorted(set(AUTHORITY_NOT_CLAIMING + ALPHA_NOT_CLAIMING)),
    }

    audit = {
        "schema": "azuki_tcg_catalog_audit_v0.2",
        "passed": gallery_audit["passed"] and alpha_audit["passed"],
        "status": "azuki_sources_imported_with_disclosed_residuals"
        if gallery_audit["passed"] and alpha_audit["passed"]
        else "azuki_source_import_failed",
        "checks": {
            "official_gallery": gallery_audit["checks"],
            "alpha_master_sheet": alpha_audit["checks"],
        },
        "counts": manifest["counts"],
        "not_claiming": manifest["not_claiming"],
    }

    targets = {
        RELEASE_DIR / f"{RELEASE_ID}.json": release,
        RELEASE_DIR / f"{ALPHA_RELEASE_ID}.json": alpha_release,
        BASE / "index.json": index,
        BASE / "manifest.json": manifest,
        BASE / "audit.json": audit,
    }

    if args.check:
        mismatches = []
        for path, data in targets.items():
            if not path.exists():
                mismatches.append(f"missing {path.relative_to(ROOT)}")
                continue
            current = path.read_text(encoding="utf-8")
            expected = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
            if current != expected:
                mismatches.append(f"stale {path.relative_to(ROOT)}")
        print(json.dumps({"passed": not mismatches and audit["passed"], "snapshots": {"official_gallery": str(snapshot_path.relative_to(ROOT)), "alpha_master_sheet": str(alpha_snapshot_path.relative_to(ROOT))}, "counts": manifest["counts"], "mismatches": mismatches, "audit_status": audit["status"]}, indent=2, sort_keys=True))
        if mismatches or not audit["passed"]:
            sys.exit(1)
        return

    for path, data in targets.items():
        write_json(path, data)
    print(json.dumps({"wrote": [str(path.relative_to(ROOT)) for path in targets], "snapshots": {"official_gallery": str(snapshot_path.relative_to(ROOT)), "alpha_master_sheet": str(alpha_snapshot_path.relative_to(ROOT))}, "counts": manifest["counts"], "audit_status": audit["status"]}, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
