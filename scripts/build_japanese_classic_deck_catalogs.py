#!/usr/bin/env python3
"""Build the two late Original-era Japanese Gym deck catalogues.

The main Japanese set census is sourced from TCGdex, which does not enumerate
these fixed decks as sets. PokéCardex supplies the unique card rows and
row-specific reference images; Bulbapedia supplies the product boundary,
release date, 64-card deck count, and deck list context.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "japanese-classic-decks"
RELEASE_DIR = OUT_DIR / "releases"
MANIFEST_PATH = OUT_DIR / "manifest.json"
AUDIT_PATH = OUT_DIR / "audit.json"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"


@dataclass(frozen=True)
class Deck:
    release_family_id: str
    name_en: str
    name_ja: str
    pokecardex_code: str
    unique_rows: int
    bulbapedia_url: str


DECKS = (
    Deck(
        release_family_id="jp_tcg_yamabuki_city_gym_sabrina_19990226",
        name_en="Yamabuki City Gym / Sabrina",
        name_ja="ヤマブキシティジム ナツメ",
        pokecardex_code="YCGYM",
        unique_rows=26,
        bulbapedia_url="https://bulbapedia.bulbagarden.net/wiki/Yamabuki_City_Gym_%28TCG%29",
    ),
    Deck(
        release_family_id="jp_tcg_guren_town_gym_blaine_19990226",
        name_en="Guren Town Gym / Blaine",
        name_ja="グレンタウンジム カツラ",
        pokecardex_code="GTGYM",
        unique_rows=25,
        bulbapedia_url="https://bulbapedia.bulbagarden.net/wiki/Guren_Town_Gym_%28TCG%29",
    ),
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical_hash(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def load_pre_english_builder():
    path = ROOT / "scripts" / "build_japanese_pre_english_catalogs.py"
    spec = importlib.util.spec_from_file_location("cairn_japanese_catalog_base", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load shared Japanese catalogue adapter: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def build_release(base: Any, deck: Deck) -> dict[str, Any]:
    config = base.ReleaseConfig(
        release_family_id=deck.release_family_id,
        name_en=deck.name_en,
        name_ja=deck.name_ja,
        release_date="1999-02-26",
        expected_row_count=deck.unique_rows,
        release_type="gym_standard_deck_unique_rows",
        prints_without_rarity_symbol="yes",
        symbol_status_confidence="high",
        pokellector_path="",
        source_adapter="pokecardex",
        pokecardex_code=deck.pokecardex_code,
        product_card_count=64,
        product_count_basis=(
            "Bulbapedia records a 64-card fixed deck; PokéCardex exposes the unique "
            "catalogue rows rather than repeated deck quantities."
        ),
        note=(
            "Japanese-exclusive Standard Deck complementing Challenge from the Darkness. "
            "The unique rows remain distinct from both the booster printings and later English printings."
        ),
    )
    release = base.build_release(config)
    release["schema"] = "marketplace.japanese_classic_deck_release_catalog.v0.1"
    release["not_claiming"] = [
        "all Japanese constructed decks",
        "seller possession",
        "authenticity",
        "condition truth",
        "price truth",
        "approved image display rights",
    ]
    release["sources"].append(
        {
            "source": "Bulbapedia product and deck-list page",
            "source_page_url": deck.bulbapedia_url,
            "authority": "Product boundary, release date, fixed-deck count, and checklist context.",
            "not_claiming": [
                "official source",
                "seller possession",
                "authenticity",
                "condition truth",
                "approved image rights",
            ],
        }
    )
    for card in release["cards"]:
        card["schema"] = "marketplace.japanese_classic_deck_card_row.v0.1"
        card["card_number"] = "Unnumbered"
        card["name_ja_status"] = card.get("name_ja_status") or "not_provided_by_selected_row_source"
        card["collector_texture"]["basis"] = [
            "PokéCardex decrypted Japanese deck row",
            "Bulbapedia product and deck-list page",
        ]
        card["collector_texture"]["note"] = (
            f"{card['name_en']} is a distinct unnumbered printing in {deck.name_en}. "
            "Use the row-specific catalogue image as a reference and seller photos for the physical copy."
        )
        card["product_scope"]["authority"] = (
            "Japanese fixed-deck row derived from PokéCardex, with Bulbapedia "
            "supplying the deck boundary and release context."
        )
        card["source_contacts"].append(
            {
                "source": "Bulbapedia product and deck-list page",
                "source_page_url": deck.bulbapedia_url,
                "authority": "Product boundary and checklist context.",
                "not_claiming": [
                    "official source",
                    "seller possession",
                    "authenticity",
                    "condition truth",
                    "approved image rights",
                ],
            }
        )
        card["tags"] = list(dict.fromkeys([*card.get("tags", []), "Japanese", "Gym deck", "Unnumbered"]))
    return release


def build() -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, Any]]:
    base = load_pre_english_builder()
    releases = [build_release(base, deck) for deck in DECKS]
    generated_at = utc_now()
    manifest_releases = []
    failures: list[str] = []
    image_rows = 0
    for deck, release in zip(DECKS, releases, strict=True):
        cards = release.get("cards", [])
        if len(cards) != deck.unique_rows:
            failures.append(f"{deck.release_family_id}: expected {deck.unique_rows}, got {len(cards)}")
        if len({card.get("row_id") for card in cards}) != len(cards):
            failures.append(f"{deck.release_family_id}: duplicate row ids")
        image_count = sum(bool(card.get("image_provenance", {}).get("image_large")) for card in cards)
        image_rows += image_count
        if image_count != len(cards):
            failures.append(f"{deck.release_family_id}: {len(cards) - image_count} rows lack reference images")
        path = f"data/japanese-classic-decks/releases/{deck.release_family_id}.json"
        manifest_releases.append(
            {
                "schema": "marketplace.japanese_classic_deck_manifest_release.v0.1",
                "release_family_id": deck.release_family_id,
                "name_en": deck.name_en,
                "name_ja": deck.name_ja,
                "release_date": "1999-02-26",
                "release_type": "gym_standard_deck_unique_rows",
                "product_card_count": 64,
                "row_count": len(cards),
                "reference_image_rows": image_count,
                "path": path,
                "source_urls": [
                    f"https://www.pokecardex.com/series/jp/{deck.pokecardex_code}",
                    deck.bulbapedia_url,
                ],
                "catalog_hash": canonical_hash(release),
            }
        )
    row_count = sum(item["row_count"] for item in manifest_releases)
    manifest = {
        "schema": "marketplace.japanese_classic_deck_manifest.v0.1",
        "generated_at": generated_at,
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "boundary": (
            "Late Original-era Japanese fixed Gym decks released on 1999-02-26: "
            "Yamabuki City Gym and Guren Town Gym."
        ),
        "release_count": len(manifest_releases),
        "total_rows": row_count,
        "reference_image_rows": image_rows,
        "releases": manifest_releases,
        "not_claiming": [
            "all Japanese constructed decks",
            "official source status for PokéCardex or Bulbapedia",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "approved image rights",
        ],
    }
    audit = {
        "schema": "marketplace.japanese_classic_deck_audit.v0.1",
        "generated_at": generated_at,
        "passed": not failures and row_count == 51 and image_rows == 51,
        "release_count": len(manifest_releases),
        "row_count": row_count,
        "reference_image_rows": image_rows,
        "expected_release_family_ids": [deck.release_family_id for deck in DECKS],
        "failures": failures,
        "not_claiming": manifest["not_claiming"],
    }
    return releases, manifest, audit


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Japanese late Original-era Gym deck catalogues.")
    parser.add_argument("--check", action="store_true", help="Build and audit without writing.")
    args = parser.parse_args()
    releases, manifest, audit = build()
    if not args.check:
        for release in releases:
            release_id = release["release"]["release_family_id"]
            write_json(RELEASE_DIR / f"{release_id}.json", release)
        write_json(MANIFEST_PATH, manifest)
        write_json(AUDIT_PATH, audit)
    print(json.dumps({
        "passed": audit["passed"],
        "release_count": audit["release_count"],
        "row_count": audit["row_count"],
        "reference_image_rows": audit["reference_image_rows"],
        "failures": audit["failures"],
        "wrote": [] if args.check else [
            str(MANIFEST_PATH.relative_to(ROOT)),
            str(AUDIT_PATH.relative_to(ROOT)),
            "data/japanese-classic-decks/releases/*.json",
        ],
    }, indent=2))
    if not audit["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
