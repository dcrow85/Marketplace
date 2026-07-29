#!/usr/bin/env python3
"""Build Japanese vintage special-set, promo, and fixed-product gaps.

These families are visible in the Japanese release index but are not all
enumerated by TCGdex. PokéCardex supplies row checklists/reference images;
Bulbapedia supplies dated product and promotional-set boundaries. The PLAY
slice stops before Battle Road Summer 2003 to preserve the US WoC-era cutoff.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import importlib.util
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "japanese-vintage-supplemental"
RELEASE_DIR = OUT_DIR / "releases"
MANIFEST_PATH = OUT_DIR / "manifest.json"
AUDIT_PATH = OUT_DIR / "audit.json"


@dataclass(frozen=True)
class Product:
    release_family_id: str
    name_en: str
    name_ja: str
    date: str
    code: str
    rows: int
    product_count: int
    release_type: str
    source_url: str
    parent: str = ""
    take: int = 0


PRODUCTS = (
    Product("jp_tcg_southern_islands_19990717", "Southern Islands", "サザンアイランド", "1999-07-17", "SOIS", 18, 18, "special_collection", "https://bulbapedia.bulbagarden.net/wiki/Southern_Islands_%28TCG%29"),
    Product("jp_tcg_intro_pack_bulbasaur_deck_19990730", "Intro Pack Bulbasaur Deck", "イントロパック フシギバナデッキ", "1999-07-30", "IPB", 41, 41, "intro_pack_deck_rows", "https://bulbapedia.bulbagarden.net/wiki/Video_Introduction_Set_%28TCG%29", "jp_tcg_intro_pack_19990730"),
    Product("jp_tcg_intro_pack_squirtle_deck_19990730", "Intro Pack Squirtle Deck", "イントロパック カメックスデッキ", "1999-07-30", "IPS", 41, 41, "intro_pack_deck_rows", "https://bulbapedia.bulbagarden.net/wiki/Video_Introduction_Set_%28TCG%29", "jp_tcg_intro_pack_19990730"),
    Product("jp_tcg_intro_pack_neo_chikorita_half_deck_20010406", "Intro Pack Neo Chikorita Half Deck", "イントロパック★neo チコリータハーフデッキ", "2001-04-06", "IPNCH", 30, 30, "intro_pack_half_deck_rows", "https://bulbapedia.bulbagarden.net/wiki/Neo_Introduction_Set_%28TCG%29", "jp_tcg_intro_pack_neo_20010406"),
    Product("jp_tcg_intro_pack_neo_chikorita_side_deck_20010406", "Intro Pack Neo Chikorita Side Deck", "イントロパック★neo チコリータサイドデッキ", "2001-04-06", "IPNCS", 10, 10, "intro_pack_side_deck_rows", "https://bulbapedia.bulbagarden.net/wiki/Neo_Introduction_Set_%28TCG%29", "jp_tcg_intro_pack_neo_20010406"),
    Product("jp_tcg_intro_pack_neo_totodile_half_deck_20010406", "Intro Pack Neo Totodile Half Deck", "イントロパック★neo ワニノコハーフデッキ", "2001-04-06", "IPNTH", 30, 30, "intro_pack_half_deck_rows", "https://bulbapedia.bulbagarden.net/wiki/Neo_Introduction_Set_%28TCG%29", "jp_tcg_intro_pack_neo_20010406"),
    Product("jp_tcg_intro_pack_neo_totodile_side_deck_20010406", "Intro Pack Neo Totodile Side Deck", "イントロパック★neo ワニノコサイドデッキ", "2001-04-06", "IPNTS", 10, 10, "intro_pack_side_deck_rows", "https://bulbapedia.bulbagarden.net/wiki/Neo_Introduction_Set_%28TCG%29", "jp_tcg_intro_pack_neo_20010406"),
    Product("jp_tcg_pokemon_e_starter_deck_20011201", "Pokémon-e Starter Deck", "ポケモンカードe スターターパック", "2001-12-01", "PESD", 29, 29, "starter_deck_unique_rows", "https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon-e_Starter_Deck_%28TCG%29"),
    Product("jp_promo_t_promotional_200201_200303", "T Promotional cards", "Tプロモカード", "2002-01-01", "PRT", 24, 24, "numbered_t_promo", "https://bulbapedia.bulbagarden.net/wiki/T_Promotional_cards_%28TCG%29"),
    Product("jp_promo_mcdonalds_e_minimum_pack_20020126", "McDonald's Pokémon-e Minimum Pack", "マクドナルドオリジナル ミニマム★パック", "2002-01-26", "MCMP", 18, 30, "special_promo_pack", "https://bulbapedia.bulbagarden.net/wiki/McDonald%27s_Pokemon-e_Minimum_Pack"),
    Product("jp_promo_play_first_season_200301", "PLAY Promotional cards · first season", "PLAYプロモカード", "2003-01-01", "PLAY", 32, 7, "numbered_play_promo_bounded_slice", "https://bulbapedia.bulbagarden.net/wiki/PLAY_Promotional_cards_%28TCG%29", take=7),
)

J_PROMOS = (
    ("001/J", "Timeless Celebi", "Grass", "September 2001 CoroCoro Comic (August 2001)"),
    ("002/J", "Latias and Latios", "Colorless", "Guardian Gods of the City of Water theatrical release"),
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def digest(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def load_base():
    path = ROOT / "scripts" / "build_japanese_pre_english_catalogs.py"
    spec = importlib.util.spec_from_file_location("cairn_japanese_catalog_base_supplemental", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load shared Japanese catalogue adapter: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def product_contact(product: Product) -> dict[str, Any]:
    return {
        "source": "Bulbapedia release page",
        "source_page_url": product.source_url,
        "authority": "Release/product boundary and checklist context.",
        "not_claiming": ["official source", "seller possession", "authenticity", "condition truth", "approved image rights"],
    }


def normalize_release(release: dict[str, Any], product: Product) -> dict[str, Any]:
    if product.take:
        release["cards"] = release["cards"][:product.take]
    release["schema"] = "marketplace.japanese_vintage_supplemental_release_catalog.v0.1"
    release["release"].update({
        "expected_row_count": product.product_count,
        "unique_catalog_row_count": product.product_count,
        "product_card_count": product.product_count,
        "product_count_basis": "Pinned source checklist rows inside the bounded vintage release window.",
    })
    release["sources"].append(product_contact(product))
    release["not_claiming"] = ["all Japanese product variants", "seller possession", "authenticity", "condition truth", "price truth", "approved image display rights"]
    for card in release["cards"]:
        card["schema"] = "marketplace.japanese_vintage_supplemental_card_row.v0.1"
        card["card_number"] = card.get("card_number") or card.get("local_id") or "Unnumbered"
        card["product_scope"].update({
            "authority": "Japanese vintage supplemental row from PokéCardex, with Bulbapedia release-boundary context.",
            "product_card_count": product.product_count,
            "unique_catalog_row_count": product.product_count,
            "product_count_basis": "Pinned source checklist rows inside the bounded vintage release window.",
        })
        card["source_contacts"].append(product_contact(product))
        card["collector_texture"]["basis"] = ["PokéCardex Japanese row", "Bulbapedia release page"]
        card["tags"] = list(dict.fromkeys([*card.get("tags", []), "Japanese", "Vintage supplemental"]))
    return release


def build_product(base: Any, product: Product) -> dict[str, Any]:
    config = base.ReleaseConfig(
        release_family_id=product.release_family_id,
        name_en=product.name_en,
        name_ja=product.name_ja,
        release_date=product.date,
        expected_row_count=product.rows,
        release_type=product.release_type,
        prints_without_rarity_symbol="context_dependent",
        symbol_status_confidence="medium",
        pokellector_path="",
        source_adapter="pokecardex",
        pokecardex_code=product.code,
        parent_release_family_id=product.parent,
        product_card_count=product.product_count,
        product_count_basis="Pinned source checklist rows.",
        note="Supplemental Japanese vintage release family omitted by the API-only set census.",
    )
    return normalize_release(base.build_release(config), product)


def manual_row(release_id: str, local_id: str, name: str, category: str, element: str, source_url: str, note: str) -> dict[str, Any]:
    row_id = f"{release_id}:{local_id.lower().replace('/', '-')}"
    contact = {
        "source": "Bulbapedia raw setlist",
        "source_page_url": source_url,
        "authority": "Numbered checklist row and distribution note.",
        "not_claiming": ["official source", "seller possession", "authenticity", "condition truth", "image availability"],
    }
    return {
        "schema": "marketplace.japanese_vintage_supplemental_card_row.v0.1",
        "row_id": row_id, "release_family_id": release_id, "local_id": local_id, "card_number": local_id,
        "name_en": name, "name_ja": "", "name_ja_status": "not_provided_by_selected_row_source",
        "name_source_note": "Bulbapedia English-language raw setlist label.", "category": category,
        "rarity_source": "", "holo_source": False, "pokemon_profile": {"abilities": [], "attacks": [], "dex_id": [], "hp": None, "types": [element] if element else []},
        "illustrator": {"authority": "Not supplied by selected source.", "caption": "", "credit_status": "not_provided_by_primary_source", "display": "", "name": "", "not_claiming": ["seller possession", "authenticity", "condition"], "requested_page_title": "", "resolved_page_title": "", "source": "Bulbapedia raw setlist", "source_page_sha256": "", "source_page_url": source_url},
        "product_scope": {"authority": "Japanese numbered promotional row from Bulbapedia raw setlist.", "catalog_treatment": "Catalog target", "counting_note": note, "date_precision": "bounded_period", "english_context_name": "", "japanese_set_name": "", "parent_release_family_id": "", "product_card_count": 2, "product_count_basis": "Complete selected raw setlist page.", "release_date": "2001-08-01", "release_type": "numbered_j_promo", "strict_release_member": True, "unique_catalog_row_count": 2},
        "symbol_status": {"prints_without_rarity_symbol": "not_applicable_numbered_promo", "confidence": "high", "scope": "release_context_not_row_fact", "source_mode": "raw_setlist", "source_release_family_id": release_id, "not_claiming": ["row-level physical truth", "seller possession"]},
        "image_provenance": {"allowed_use": [], "display_allowed": False, "exactness_basis": ["No row-specific image URL supplied."], "image_large": "", "image_small": "", "image_role": "No external image promoted.", "not_allowed_by_default": ["training", "seller evidence", "authentication proof"], "not_claiming": ["seller possession", "seller card match", "condition", "authenticity", "image availability", "image rights approval"], "provider_id": f"bulbapedia:{local_id}", "provider_title": f"{name} {local_id}", "release_family_id": release_id, "rights_status": "no_image_source_supplied", "row_id": row_id, "source": "Bulbapedia raw setlist", "source_page_url": source_url, "status": "source_payload_without_image", "verification_status": "raw_setlist_catalog_row_without_image_witness"},
        "special_identification_instructions": [], "collector_texture": {"authority": "Collector texture only; not transaction evidence.", "basis": ["Bulbapedia raw setlist"], "note": note, "signals": [name, local_id]},
        "information_audit": {"audit_scope": "Catalogue identity only; no physical fact is proved.", "earns_keep": [{"field": "printed promo number", "surface": "primary", "why": "Separates this numbered jumbo printing."}], "agent_only": []},
        "source_contacts": [contact], "provider_row": {"name": name, "local_id": local_id, "distribution_note": note},
        "not_claiming": ["seller possession", "authenticity", "condition truth", "price truth", "spendability"],
        "tags": [release_id, name, local_id, "Japanese", "J Promotional"],
    }


def add_mcdonald_energy_rows(release: dict[str, Any]) -> None:
    source_url = "https://bulbapedia.bulbagarden.net/wiki/McDonald%27s_Pokemon-e_Minimum_Pack"
    template = release["cards"][0]
    for index, element in enumerate(("Grass", "Fire", "Water", "Lightning", "Psychic", "Fighting"), start=19):
        for variant in ("nonholo", "holo"):
            card = copy.deepcopy(template)
            local_id = f"energy-{element.lower()}-{variant}"
            row_id = f"{release['release']['release_family_id']}:{local_id}"
            card.update({"row_id": row_id, "local_id": local_id, "card_number": "Unnumbered", "name_en": f"{element} Energy", "name_ja": "", "category": "Energy", "rarity_source": "Holo" if variant == "holo" else "", "holo_source": variant == "holo"})
            card["pokemon_profile"] = {"abilities": [], "attacks": [], "dex_id": [], "hp": None, "types": [element]}
            card["image_provenance"].update({"allowed_use": [], "display_allowed": False, "image_large": "", "image_small": "", "image_role": "Bulbapedia checklist row without a row-specific image URL.", "rights_status": "no_image_source_supplied", "row_id": row_id, "source": "Bulbapedia release page", "source_page_url": source_url, "status": "source_payload_without_image", "verification_status": "checklist_row_without_image_witness"})
            card["source_contacts"] = [product_contact(next(p for p in PRODUCTS if p.code == "MCMP"))]
            card["provider_row"] = {"name": f"{element} Energy", "variant": variant, "source": "Bulbapedia set list"}
            card["collector_texture"]["note"] = f"Unnumbered {variant} {element} Energy variant in the McDonald's Minimum Pack."
            release["cards"].append(card)


def build() -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, Any]]:
    base = load_base()
    releases = [build_product(base, product) for product in PRODUCTS]
    mcd = next(release for release in releases if release["release"]["release_family_id"] == "jp_promo_mcdonalds_e_minimum_pack_20020126")
    add_mcdonald_energy_rows(mcd)
    j_source = "https://bulbapedia.bulbagarden.net/w/index.php?title=J_Promotional_cards_%28TCG%29&action=raw"
    j_release_id = "jp_promo_j_promotional_200108_200207"
    j_cards = [manual_row(j_release_id, number, name, "Pokemon", element, j_source, note) for number, name, element, note in J_PROMOS]
    releases.append({
        "schema": "marketplace.japanese_vintage_supplemental_release_catalog.v0.1",
        "release": {"release_family_id": j_release_id, "name_en": "J Promotional cards", "name_ja": "Jプロモカード", "release_date": "2001-08-01", "date_precision": "month_range_start", "release_type": "numbered_j_promo", "expected_row_count": 2, "count_confidence": "bulbapedia_raw_setlist", "parent_release_family_id": "", "product_card_count": 2, "product_count_basis": "Complete Bulbapedia raw setlist page.", "strict_release_member": True, "unique_catalog_row_count": 2, "catalog_treatment": "Catalog target", "note": "Two Japanese numbered jumbo promotional cards."},
        "symbol_status": {"prints_without_rarity_symbol": "not_applicable_numbered_promo", "confidence": "high", "scope": "release_context_not_row_fact"},
        "sources": j_cards[0]["source_contacts"], "cards": j_cards,
        "not_claiming": ["seller possession", "authenticity", "condition truth", "price truth", "approved image display rights"],
    })
    generated = utc_now()
    manifest_releases = []
    failures = []
    for release in releases:
        meta, cards = release["release"], release["cards"]
        expected = int(meta["expected_row_count"])
        if len(cards) != expected:
            failures.append(f"{meta['release_family_id']}: expected {expected}, got {len(cards)}")
        if len({card["row_id"] for card in cards}) != len(cards):
            failures.append(f"{meta['release_family_id']}: duplicate row ids")
        path = f"data/japanese-vintage-supplemental/releases/{meta['release_family_id']}.json"
        manifest_releases.append({"release_family_id": meta["release_family_id"], "name_en": meta["name_en"], "name_ja": meta["name_ja"], "release_date": meta["release_date"], "release_type": meta["release_type"], "row_count": len(cards), "reference_image_rows": sum(bool(card["image_provenance"].get("image_large")) for card in cards), "path": path, "catalog_hash": digest(release)})
    total = sum(item["row_count"] for item in manifest_releases)
    manifest = {"schema": "marketplace.japanese_vintage_supplemental_manifest.v0.1", "generated_at": generated, "release_count": len(releases), "total_rows": total, "releases": manifest_releases, "boundary": "Japanese special sets, numbered promotional sets, and fixed products inside the US WoC-era endpoint; PLAY is bounded to 001-007 before Summer 2003.", "not_claiming": ["all product variants", "post-cutoff PLAY cards", "seller possession", "authenticity", "condition truth", "price truth", "approved image rights"]}
    audit = {"schema": "marketplace.japanese_vintage_supplemental_audit.v0.1", "generated_at": generated, "passed": not failures and total == 272, "release_count": len(releases), "row_count": total, "reference_image_rows": sum(item["reference_image_rows"] for item in manifest_releases), "failures": failures, "not_claiming": manifest["not_claiming"]}
    return releases, manifest, audit


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    releases, manifest, audit = build()
    if not args.check:
        for release in releases:
            write_json(RELEASE_DIR / f"{release['release']['release_family_id']}.json", release)
        write_json(MANIFEST_PATH, manifest)
        write_json(AUDIT_PATH, audit)
    print(json.dumps({"passed": audit["passed"], "release_count": audit["release_count"], "row_count": audit["row_count"], "reference_image_rows": audit["reference_image_rows"], "failures": audit["failures"]}, indent=2))
    if not audit["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
