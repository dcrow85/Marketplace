#!/usr/bin/env python3
"""Build the standalone Azuki TCG catalog from the official gallery API.

The default build is offline and reproducible: it reads the newest pinned
snapshot under data/azuki-tcg/source-snapshots. Use --refresh to fetch the
current official endpoint and write a new dated snapshot before building.
"""

from __future__ import annotations

import argparse
import collections
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


def newest_snapshot() -> Path:
    snapshots = sorted(SNAPSHOT_DIR.glob("cards_api_*.json"))
    if not snapshots:
        raise FileNotFoundError(
            f"No Azuki TCG snapshot found in {SNAPSHOT_DIR}. Run with --refresh first."
        )
    return snapshots[-1]


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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true", help="Fetch the official API into a dated snapshot before building.")
    parser.add_argument("--check", action="store_true", help="Verify generated files are current without writing.")
    args = parser.parse_args()

    snapshot_path = fetch_snapshot() if args.refresh else newest_snapshot()
    release, index, manifest, audit = build(snapshot_path)

    targets = {
        RELEASE_DIR / f"{RELEASE_ID}.json": release,
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
        print(json.dumps({"passed": not mismatches and audit["passed"], "snapshot": str(snapshot_path.relative_to(ROOT)), "counts": release["counts"], "mismatches": mismatches, "audit_status": audit["status"]}, indent=2, sort_keys=True))
        if mismatches or not audit["passed"]:
            sys.exit(1)
        return

    for path, data in targets.items():
        write_json(path, data)
    print(json.dumps({"wrote": [str(path.relative_to(ROOT)) for path in targets], "snapshot": str(snapshot_path.relative_to(ROOT)), "counts": release["counts"], "audit_status": audit["status"]}, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
