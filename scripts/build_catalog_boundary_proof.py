#!/usr/bin/env python3
"""Build a machine-readable catalog boundary proof.

This artifact does not add card rows. It records which source-visible release
families have been accounted for, which are explicitly excluded by the current
US WoC-era boundary, and which remain partial. The goal is to make coverage
claims auditable without pretending the catalog is complete merely because a
builder has no more rows to emit.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "catalog-expansion"
OUT_PATH = OUT_DIR / "boundary-proof.json"
CACHE_DIR = ROOT / ".cache" / "catalog_boundary_proof"
POKEMON_TCG_API_BASE = "https://api.pokemontcg.io/v2"
TCGDEX_API_BASE = "https://api.tcgdex.net/v2"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"
SOURCE_VERSION = "catalog-boundary-proof-v0.1"
USER_AGENT = "MarketplaceCatalogBoundaryProof/0.1 (+local catalog builder)"
ENGLISH_WOTC_CUTOFF = "2003-05-12"
JAPANESE_PRE_EDGE_CUTOFF = "2003-05-12"


ENGLISH_POKEMONTCG_IN_SCOPE_IDS = [
    "base1",
    "base2",
    "basep",
    "base3",
    "base4",
    "base5",
    "gym1",
    "gym2",
    "neo1",
    "neo2",
    "si1",
    "neo3",
    "neo4",
    "base6",
    "ecard1",
    "bp",
    "ecard2",
    "ecard3",
]

JAPANESE_TCGDEX_IN_SCOPE_IDS = [
    "PMCG1",
    "PMCG2",
    "PMCG3",
    "PMCG4",
    "PMCG5",
    "PMCG6",
    "neo1",
    "neo2",
    "neo3",
    "neo4",
    "VS1",
    "web1",
    "E1",
    "E2",
    "E3",
    "E4",
    "E5",
    "ADV1",
    "ADV2",
]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical_hash(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def file_hash(path: str | Path) -> str:
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def read_json(path: str | Path) -> Any:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def cache_path(url: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{hashlib.sha256(f'{SOURCE_VERSION}|{url}'.encode('utf-8')).hexdigest()}.json"


def fetch_json(url: str) -> Any:
    cache_file = cache_path(url)
    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))
    request = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=30) as response:
            payload = {
                "url": url,
                "status": response.status,
                "fetched_at": utc_now(),
                "body": json.loads(response.read().decode("utf-8")),
            }
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as error:
        raise RuntimeError(f"failed to fetch {url}: {error}") from error
    cache_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    time.sleep(0.02)
    return payload


def normalize_date(value: str) -> str:
    return value.replace("/", "-")


def manifest_release_ids(path: str) -> set[str]:
    manifest = read_json(path)
    return {item.get("release_family_id", "") for item in manifest.get("releases", [])}


def english_pokemontcg_api_proof() -> dict[str, Any]:
    payload = fetch_json(f"{POKEMON_TCG_API_BASE}/sets")
    sets = payload["body"]["data"]
    modeled_manifest = read_json("data/english-wotc/manifest.json")
    modeled_api_ids = {item["api_set_id"] for item in modeled_manifest.get("releases", [])}
    in_scope_source_ids = {
        item["id"]
        for item in sets
        if normalize_date(str(item.get("releaseDate", ""))) <= ENGLISH_WOTC_CUTOFF
    }
    post_boundary = sorted(
        (
            {
                "api_set_id": item.get("id", ""),
                "name": item.get("name", ""),
                "release_date": normalize_date(str(item.get("releaseDate", ""))),
                "printed_total": item.get("printedTotal"),
                "total": item.get("total"),
            }
            for item in sets
            if normalize_date(str(item.get("releaseDate", ""))) > ENGLISH_WOTC_CUTOFF
        ),
        key=lambda item: item["release_date"],
    )
    missing = sorted(in_scope_source_ids - modeled_api_ids)
    extra = sorted(modeled_api_ids - set(ENGLISH_POKEMONTCG_IN_SCOPE_IDS))
    return {
        "schema": "marketplace.boundary_proof.english_pokemontcg_api.v0.1",
        "source": "Pokemon TCG API v2 /sets",
        "source_url": f"{POKEMON_TCG_API_BASE}/sets",
        "source_payload_hash": canonical_hash(payload["body"]),
        "cutoff": ENGLISH_WOTC_CUTOFF,
        "source_set_count": len(sets),
        "in_scope_source_set_ids": sorted(in_scope_source_ids),
        "modeled_api_set_ids": sorted(modeled_api_ids),
        "expected_in_scope_set_ids": ENGLISH_POKEMONTCG_IN_SCOPE_IDS,
        "missing_in_scope_source_set_ids": missing,
        "unexpected_modeled_api_set_ids": extra,
        "first_post_boundary_sets": post_boundary[:5],
        "passed": not missing and sorted(modeled_api_ids) == sorted(ENGLISH_POKEMONTCG_IN_SCOPE_IDS),
        "not_claiming": [
            "non-PokemonTCG-API supplemental coverage",
            "post-WoC Nintendo/EX-era coverage",
            "approved image rights",
            "physical-card truth",
        ],
    }


def english_supplemental_proof() -> dict[str, Any]:
    source_gaps = read_json("data/catalog-expansion/source-gaps.json")
    supplemental_manifest = read_json("data/english-supplemental-wotc/manifest.json")
    jumbo_boundary_proof_path = "data/catalog-expansion/english-jumbo-boundary-proof.json"
    jumbo_boundary_proof = read_json(jumbo_boundary_proof_path)
    releases = supplemental_manifest.get("releases", [])
    resolved_ids = {item.get("set_id", "") for item in source_gaps.get("resolved_gaps", [])}
    active_ids = {item.get("set_id", "") for item in source_gaps.get("gaps", [])}
    expected_resolved = {"wp", "sp"}
    expected_active = {"jumbo"}
    return {
        "schema": "marketplace.boundary_proof.english_supplemental_sources.v0.1",
        "source": "TCGdex zero-ref source gap register plus Bulbapedia row sources",
        "source_gap_register_path": "data/catalog-expansion/source-gaps.json",
        "source_gap_register_hash": file_hash("data/catalog-expansion/source-gaps.json"),
        "supplemental_manifest_path": "data/english-supplemental-wotc/manifest.json",
        "supplemental_manifest_hash": file_hash("data/english-supplemental-wotc/manifest.json"),
        "jumbo_boundary_proof": {
            "path": jumbo_boundary_proof_path,
            "hash": file_hash(jumbo_boundary_proof_path),
            "proof_hash": jumbo_boundary_proof.get("proof_hash", ""),
            "passed": bool(jumbo_boundary_proof.get("passed")),
            "status": jumbo_boundary_proof.get("status", ""),
            "source_row_count": jumbo_boundary_proof.get("source_row_count", 0),
            "modeled_prefix": jumbo_boundary_proof.get("modeled_prefix", {}),
            "unclassified_excluded_count": jumbo_boundary_proof.get("unclassified_excluded_count", 0),
        },
        "resolved_tcgdex_zero_ref_set_ids": sorted(resolved_ids),
        "active_tcgdex_zero_ref_set_ids": sorted(active_ids),
        "modeled_release_family_ids": [item.get("release_family_id", "") for item in releases],
        "modeled_rows": sum(int(item.get("row_count") or 0) for item in releases),
        "active_partial_gaps": [
            {
                "set_id": item.get("set_id", ""),
                "name": item.get("name", ""),
                "source_gap_count": item.get("source_gap_count", 0),
                "partial_resolution": item.get("partial_resolution", {}),
            }
            for item in source_gaps.get("gaps", [])
        ],
        "passed": expected_resolved.issubset(resolved_ids) and active_ids == expected_active and bool(jumbo_boundary_proof.get("passed")),
        "not_claiming": [
            "complete Jumbo coverage",
            "all English miscellaneous products outside the named source register",
            "approved image rights",
            "physical-card truth",
        ],
    }


def japanese_tcgdex_api_proof() -> dict[str, Any]:
    index_payload = fetch_json(f"{TCGDEX_API_BASE}/ja/sets")
    index_sets = index_payload["body"]
    detail_rows = []
    for item in index_sets:
        set_id = item.get("id", "")
        if not set_id:
            continue
        try:
            detail = fetch_json(f"{TCGDEX_API_BASE}/ja/sets/{urllib.parse.quote(set_id, safe='')}")["body"]
        except RuntimeError:
            continue
        release_date = str(detail.get("releaseDate", ""))
        detail_rows.append(
            {
                "set_id": set_id,
                "name": detail.get("name", ""),
                "release_date": release_date,
                "official_count": (detail.get("cardCount") or {}).get("official"),
                "cards_returned": len(detail.get("cards") or []),
            }
        )
    in_scope_ids = {item["set_id"] for item in detail_rows if item["release_date"] and item["release_date"] <= JAPANESE_PRE_EDGE_CUTOFF}
    post_boundary = sorted(
        (item for item in detail_rows if item["release_date"] and item["release_date"] > JAPANESE_PRE_EDGE_CUTOFF),
        key=lambda item: item["release_date"],
    )
    missing = sorted(in_scope_ids - set(JAPANESE_TCGDEX_IN_SCOPE_IDS))
    return {
        "schema": "marketplace.boundary_proof.japanese_tcgdex_api.v0.1",
        "source": "TCGdex Japanese set index plus per-set detail payloads",
        "source_url": f"{TCGDEX_API_BASE}/ja/sets",
        "source_index_payload_hash": canonical_hash(index_payload["body"]),
        "cutoff": JAPANESE_PRE_EDGE_CUTOFF,
        "source_set_count": len(index_sets),
        "in_scope_source_set_ids": sorted(in_scope_ids),
        "expected_in_scope_set_ids": JAPANESE_TCGDEX_IN_SCOPE_IDS,
        "missing_in_scope_source_set_ids": missing,
        "first_post_boundary_sets": post_boundary[:5],
        "passed": not missing and sorted(in_scope_ids) == sorted(JAPANESE_TCGDEX_IN_SCOPE_IDS),
        "not_claiming": [
            "Japanese promo coverage from TCGdex",
            "official source",
            "post-cutoff ADV/PCG coverage",
            "physical-card truth",
        ],
    }


def japanese_promo_source_proof() -> dict[str, Any]:
    manifests = {
        "pre_english": read_json("data/japanese-pre-english/manifest.json"),
        "numbered": read_json("data/japanese-promo-wotc/manifest.json"),
        "unnumbered_continuation": read_json("data/japanese-unnumbered-promo-wotc/manifest.json"),
    }
    pre_source = next(
        item for item in manifests["pre_english"].get("releases", [])
        if item.get("release_family_id") == "jp_promo_unnumbered_pre_english_source_slice_19961015_19990131"
    )
    numbered_rows = manifests["numbered"].get("total_rows", 0)
    unnumbered_rows = manifests["unnumbered_continuation"].get("total_rows", 0)
    return {
        "schema": "marketplace.boundary_proof.japanese_promo_sources.v0.1",
        "source": "Bulbapedia raw promo setlist pages plus existing Japanese pre-English source slice",
        "modeled_sources": [
            {
                "name": "Unnumbered Promotional cards pre-English source slice",
                "path": pre_source.get("path", ""),
                "row_count": pre_source.get("row_count", 0),
                "coverage_note": "Selected source rows 001-060 already represented by the pre-English aggregate slice and child releases.",
            },
            {
                "name": "Unnumbered Promotional cards WoC-era continuation source slice",
                "path": "data/japanese-unnumbered-promo-wotc/manifest.json",
                "row_count": unnumbered_rows,
                "coverage_note": "Models source rows 061-257; row 258 begins Summer 2003 and later rows stay excluded.",
            },
            {
                "name": "P Promotional cards",
                "path": "data/japanese-promo-wotc/manifest.json",
                "row_count": 47,
                "coverage_note": "Models complete numbered P Promotional page, 001/P through 047/P.",
            },
            {
                "name": "ADV-P Promotional cards pre-edge subset",
                "path": "data/japanese-promo-wotc/manifest.json",
                "row_count": 14,
                "coverage_note": "Models 001/ADV-P through 014/ADV-P; 015/ADV-P begins June 25, 2003 and later rows stay excluded.",
            },
        ],
        "modeled_rows": int(pre_source.get("row_count", 0)) + int(numbered_rows) + int(unnumbered_rows),
        "passed": int(pre_source.get("row_count", 0)) == 55 and int(numbered_rows) == 61 and int(unnumbered_rows) == 197,
        "not_claiming": [
            "official campaign boundary proof beyond source promotion notes",
            "official source",
            "post-boundary promo coverage",
            "physical-card truth",
        ],
    }


def japanese_fixed_deck_source_proof() -> dict[str, Any]:
    manifest = read_json("data/japanese-classic-decks/manifest.json")
    audit = read_json("data/japanese-classic-decks/audit.json")
    expected = {
        "jp_tcg_yamabuki_city_gym_sabrina_19990226": 26,
        "jp_tcg_guren_town_gym_blaine_19990226": 25,
    }
    modeled = {
        item.get("release_family_id", ""): int(item.get("row_count") or 0)
        for item in manifest.get("releases", [])
    }
    missing = sorted(set(expected) - set(modeled))
    unexpected = sorted(set(modeled) - set(expected))
    return {
        "schema": "marketplace.boundary_proof.japanese_fixed_deck_sources.v0.1",
        "source": "PokéCardex Japanese deck checklists cross-checked against Bulbapedia product pages",
        "expected_release_family_rows": expected,
        "modeled_release_family_rows": modeled,
        "missing_release_family_ids": missing,
        "unexpected_release_family_ids": unexpected,
        "modeled_rows": sum(modeled.values()),
        "passed": (
            bool(audit.get("passed"))
            and modeled == expected
            and int(manifest.get("total_rows") or 0) == 51
        ),
        "not_claiming": [
            "all Japanese constructed decks outside the bounded Original-era Gym release line",
            "official source status for PokéCardex or Bulbapedia",
            "approved image rights",
            "physical-card truth",
        ],
    }


def japanese_supplemental_source_proof() -> dict[str, Any]:
    manifest = read_json("data/japanese-vintage-supplemental/manifest.json")
    audit = read_json("data/japanese-vintage-supplemental/audit.json")
    expected = {
        "jp_tcg_southern_islands_19990717": 18,
        "jp_tcg_intro_pack_bulbasaur_deck_19990730": 41,
        "jp_tcg_intro_pack_squirtle_deck_19990730": 41,
        "jp_tcg_intro_pack_neo_chikorita_half_deck_20010406": 30,
        "jp_tcg_intro_pack_neo_chikorita_side_deck_20010406": 10,
        "jp_tcg_intro_pack_neo_totodile_half_deck_20010406": 30,
        "jp_tcg_intro_pack_neo_totodile_side_deck_20010406": 10,
        "jp_tcg_pokemon_e_starter_deck_20011201": 29,
        "jp_promo_j_promotional_200108_200207": 2,
        "jp_promo_t_promotional_200201_200303": 24,
        "jp_promo_mcdonalds_e_minimum_pack_20020126": 30,
        "jp_promo_play_first_season_200301": 7,
    }
    modeled = {
        item.get("release_family_id", ""): int(item.get("row_count") or 0)
        for item in manifest.get("releases", [])
    }
    return {
        "schema": "marketplace.boundary_proof.japanese_supplemental_sources.v0.1",
        "source": "Bulbapedia Japanese expansion/product index plus PokéCardex Japanese row checklists",
        "expected_release_family_rows": expected,
        "modeled_release_family_rows": modeled,
        "modeled_rows": sum(modeled.values()),
        "passed": bool(audit.get("passed")) and modeled == expected and sum(modeled.values()) == 272,
        "boundary_note": "PLAY is limited to 001-007; 008/PLAY begins at Battle Road Summer 2003 after the selected cutoff.",
        "not_claiming": [
            "every Japanese sealed product or reprint deck",
            "post-cutoff PLAY promotional coverage",
            "official source status for PokéCardex or Bulbapedia",
            "approved image rights",
            "physical-card truth",
        ],
    }


def build() -> dict[str, Any]:
    sections = {
        "english_pokemontcg_api": english_pokemontcg_api_proof(),
        "english_supplemental_sources": english_supplemental_proof(),
        "japanese_tcgdex_api": japanese_tcgdex_api_proof(),
        "japanese_fixed_deck_sources": japanese_fixed_deck_source_proof(),
        "japanese_supplemental_sources": japanese_supplemental_source_proof(),
        "japanese_promo_sources": japanese_promo_source_proof(),
    }
    proof = {
        "schema": "marketplace.catalog_boundary_proof.v0.1",
        "generated_at": utc_now(),
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "sections": sections,
        "passed": all(section.get("passed") for section in sections.values()),
        "completion_status": {
            "status": "in_progress",
            "reason": "API-visible main-set/promo boundaries are accounted for, but English Jumbo remains partial and final external-source completion still needs a dedicated audit.",
        },
        "not_claiming": [
            "goal complete",
            "complete physical-good truth",
            "complete Jumbo coverage",
            "official status for non-official sources",
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
    parser = argparse.ArgumentParser(description="Build the catalog boundary proof.")
    parser.add_argument("--check", action="store_true", help="build without writing")
    args = parser.parse_args()
    proof = build()
    if not args.check:
        write_json(OUT_PATH, proof)
    print(
        json.dumps(
            {
                "passed": proof["passed"],
                "sections": {key: value.get("passed") for key, value in proof["sections"].items()},
                "status": proof["completion_status"]["status"],
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
