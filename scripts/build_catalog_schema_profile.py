#!/usr/bin/env python3
"""Build a cross-corpus catalog schema profile.

The catalog intentionally has source-specific row schemas. This profile records
which fields are universal, which fields are optional rails, and how agents
should project every row into a common read surface without pretending the
underlying source schemas are identical.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "catalog-expansion"
OUT_PATH = OUT_DIR / "schema-profile.json"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"

RELEASE_ROOTS = [
    "data/japanese-pre-english/releases",
    "data/english-wotc/releases",
    "data/japanese-classic/releases",
    "data/japanese-classic-decks/releases",
    "data/japanese-vintage-supplemental/releases",
    "data/japanese-adv-pre-wotc/releases",
    "data/japanese-promo-wotc/releases",
    "data/japanese-unnumbered-promo-wotc/releases",
    "data/english-supplemental-wotc/releases",
]

CANONICAL_ROW_FIELDS = [
    "schema",
    "row_id",
    "release_family_id",
    "local_id",
    "name_en",
    "name_ja",
    "name_ja_status",
    "name_source_note",
    "category",
    "rarity_source",
    "holo_source",
    "pokemon_profile",
    "illustrator",
    "product_scope",
    "symbol_status",
    "image_provenance",
    "special_identification_instructions",
    "collector_texture",
    "information_audit",
    "source_contacts",
    "provider_row",
    "not_claiming",
    "tags",
]

OPTIONAL_RAILS = [
    "card_number",
    "romaji",
    "tcgdex",
    "pokemon_tcg_api",
    "subtypes",
    "source_index",
    "variant_traps",
    "promo_context",
    "promo_family_scope",
    "no_rarity_scope",
    "starter_pack_scope",
    "gift_pack_scope",
    "team_rocket_gift_pack_scope",
    "print_context",
    "parent_rollup",
    "promo_child_source_row_mode",
]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical_hash(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def file_hash(path: str | Path) -> str:
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def iter_rows() -> list[tuple[str, dict[str, Any]]]:
    rows: list[tuple[str, dict[str, Any]]] = []
    for root in RELEASE_ROOTS:
        for path in sorted((ROOT / root).glob("*.json")):
            release = json.loads(path.read_text(encoding="utf-8"))
            for card in release.get("cards", []):
                rows.append((path.relative_to(ROOT).as_posix(), card))
    return rows


def build() -> dict[str, Any]:
    rows = iter_rows()
    row_count = len(rows)
    schema_counts: dict[str, int] = {}
    field_counts: dict[str, int] = {}
    field_by_schema: dict[str, dict[str, int]] = {}
    sample_missing: dict[str, list[str]] = {}
    for _, row in rows:
        schema = row.get("schema", "")
        schema_counts[schema] = schema_counts.get(schema, 0) + 1
        field_by_schema.setdefault(schema, {"__total__": 0})
        field_by_schema[schema]["__total__"] += 1
        for field in row:
            field_counts[field] = field_counts.get(field, 0) + 1
            field_by_schema[schema][field] = field_by_schema[schema].get(field, 0) + 1
    for field in [*CANONICAL_ROW_FIELDS, *OPTIONAL_RAILS]:
        missing = []
        for _, row in rows:
            if field not in row:
                missing.append(row.get("row_id") or row.get("id") or "<unknown>")
            if len(missing) >= 20:
                break
        sample_missing[field] = missing

    canonical_missing = {
        field: row_count - field_counts.get(field, 0)
        for field in CANONICAL_ROW_FIELDS
        if field_counts.get(field, 0) != row_count
    }
    optional_field_profiles = {
        field: {
            "present_rows": field_counts.get(field, 0),
            "missing_rows": row_count - field_counts.get(field, 0),
            "sample_missing": sample_missing[field],
        }
        for field in OPTIONAL_RAILS
    }
    per_schema = {}
    for schema, counts in sorted(field_by_schema.items()):
        total = counts["__total__"]
        per_schema[schema] = {
            "row_count": total,
            "missing_canonical_fields": [
                field for field in CANONICAL_ROW_FIELDS if counts.get(field, 0) != total
            ],
            "optional_fields_present": [
                field for field in OPTIONAL_RAILS if counts.get(field, 0)
            ],
        }

    profile = {
        "schema": "marketplace.catalog_schema_profile.v0.1",
        "generated_at": utc_now(),
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "release_roots": [
            {
                "path": root,
                "release_file_count": len(list((ROOT / root).glob("*.json"))),
            }
            for root in RELEASE_ROOTS
        ],
        "row_count": row_count,
        "schema_counts": schema_counts,
        "canonical_row_fields": CANONICAL_ROW_FIELDS,
        "canonical_field_coverage": {
            field: {
                "present_rows": field_counts.get(field, 0),
                "missing_rows": row_count - field_counts.get(field, 0),
                "sample_missing": sample_missing[field],
            }
            for field in CANONICAL_ROW_FIELDS
        },
        "canonical_fields_passed": not canonical_missing,
        "canonical_missing": canonical_missing,
        "optional_field_profiles": optional_field_profiles,
        "per_schema": per_schema,
        "normalized_agent_projection": {
            "schema": "marketplace.catalog_agent_projection.v0.1",
            "purpose": "Stable read surface for agents across source-specific row schemas.",
            "fields": {
                "catalog_row_id": "row.row_id",
                "release_family_id": "row.release_family_id",
                "source_schema": "row.schema",
                "display_number": "row.card_number if present else row.local_id",
                "local_id": "row.local_id",
                "name_en": "row.name_en",
                "name_ja": "row.name_ja",
                "name_ja_status": "row.name_ja_status",
                "category": "row.category",
                "rarity_source": "row.rarity_source",
                "holo_source": "row.holo_source",
                "types": "row.pokemon_profile.types",
                "illustrator_display": "row.illustrator.display",
                "illustrator_credit_status": "row.illustrator.credit_status",
                "release_date": "row.product_scope.release_date",
                "release_type": "row.product_scope.release_type",
                "catalog_treatment": "row.product_scope.catalog_treatment",
                "symbol_status": "row.symbol_status.prints_without_rarity_symbol",
                "image_display_allowed": "row.image_provenance.display_allowed",
                "special_identification_instructions": "row.special_identification_instructions",
                "source_contacts": "row.source_contacts",
                "not_claiming": "row.not_claiming",
            },
            "projection_notes": [
                "display_number intentionally falls back to local_id because the older japanese-pre-english corpus predates the universal card_number field.",
                "source-specific rails remain available on the raw row and must not be erased by the projection.",
                "Projection creates a stable reading surface only; it does not make any physical-card truth spendable.",
            ],
        },
        "known_schema_asymmetries": [
            {
                "field": "card_number",
                "affected_schema": "marketplace.japanese_pre_english_card_row.v0.1",
                "missing_rows": optional_field_profiles["card_number"]["missing_rows"],
                "handling": "Use normalized_agent_projection.display_number = local_id for these rows unless/until the historical corpus is regenerated with card_number.",
                "not_claiming": ["underlying source schema equality", "physical-card printed-number verification"],
            }
        ],
        "passed": not canonical_missing,
        "not_claiming": [
            "single physical source schema",
            "source-specific optional rails are universal",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "spendability",
        ],
    }
    profile["profile_hash"] = canonical_hash({key: value for key, value in profile.items() if key != "profile_hash"})
    return profile


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the cross-corpus catalog schema profile.")
    parser.add_argument("--check", action="store_true", help="build without writing")
    args = parser.parse_args()
    profile = build()
    if not args.check:
        write_json(OUT_PATH, profile)
    print(
        json.dumps(
            {
                "row_count": profile["row_count"],
                "schema_count": len(profile["schema_counts"]),
                "canonical_fields_passed": profile["canonical_fields_passed"],
                "passed": profile["passed"],
                "wrote": [] if args.check else [OUT_PATH.relative_to(ROOT).as_posix()],
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    if not profile["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
