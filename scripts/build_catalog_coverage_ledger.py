#!/usr/bin/env python3
"""Build a consolidated catalog coverage ledger.

The corpus is now split across several source-specific builders. This ledger is
not a substitute for the row files; it is an agent-facing coverage map that
keeps modeled rows, resolved source gaps, partial gaps, and remaining gaps
legible in one place.
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
OUT_PATH = OUT_DIR / "coverage-ledger.json"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"


CORPUS_MANIFESTS: tuple[dict[str, str], ...] = (
    {
        "corpus_id": "japanese_pre_english",
        "path": "data/japanese-pre-english/manifest.json",
        "audit_path": "data/japanese-pre-english/audit.json",
        "language_scope": "ja",
        "boundary": "Japanese TCG launch through pre-English Base / early January 1999 boundary, including curated promo slices.",
    },
    {
        "corpus_id": "english_wotc",
        "path": "data/english-wotc/manifest.json",
        "audit_path": "data/english-wotc/audit.json",
        "language_scope": "en",
        "boundary": "English WoC-era main/promo sets through Skyridge / 2003-05-12 from Pokemon TCG API v2.",
    },
    {
        "corpus_id": "japanese_classic",
        "path": "data/japanese-classic/manifest.json",
        "audit_path": "data/japanese-classic/audit.json",
        "language_scope": "ja",
        "boundary": "Japanese classic/WoC-corresponding main sets from Challenge from the Darkness through Mysterious Mountains.",
    },
    {
        "corpus_id": "japanese_adv_pre_wotc",
        "path": "data/japanese-adv-pre-wotc/manifest.json",
        "audit_path": "data/japanese-adv-pre-wotc/audit.json",
        "language_scope": "ja",
        "boundary": "Japanese ADV1/ADV2 releases before the English Skyridge / US WoC-era endpoint.",
    },
    {
        "corpus_id": "japanese_promo_wotc",
        "path": "data/japanese-promo-wotc/manifest.json",
        "audit_path": "data/japanese-promo-wotc/audit.json",
        "language_scope": "ja",
        "boundary": "Japanese numbered P Promotional rows and bounded ADV-P rows through the May 2003 edge.",
    },
    {
        "corpus_id": "japanese_unnumbered_promo_wotc",
        "path": "data/japanese-unnumbered-promo-wotc/manifest.json",
        "audit_path": "data/japanese-unnumbered-promo-wotc/audit.json",
        "language_scope": "ja",
        "boundary": "Japanese unnumbered promo source rows 061-257 split into source-derived campaign families, ending at Battle Road Spring 2003.",
    },
    {
        "corpus_id": "english_supplemental_wotc",
        "path": "data/english-supplemental-wotc/manifest.json",
        "audit_path": "data/english-supplemental-wotc/audit.json",
        "language_scope": "en",
        "boundary": "Bounded English supplemental WoC-era promo rows: W Promotional, Sample Set, and early Jumbo subset.",
    },
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: str | Path) -> Any:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def canonical_hash(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def file_hash(path: str | Path) -> str:
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def manifest_row_total(manifest: dict[str, Any]) -> int:
    if isinstance(manifest.get("total_rows"), int):
        return int(manifest["total_rows"])
    return sum(int(item.get("row_count") or 0) for item in manifest.get("releases", []))


def manifest_release_count(manifest: dict[str, Any]) -> int:
    if isinstance(manifest.get("release_count"), int):
        return int(manifest["release_count"])
    return len(manifest.get("releases", []))


def build_corpus_entry(config: dict[str, str]) -> dict[str, Any]:
    manifest = read_json(config["path"])
    audit = read_json(config["audit_path"])
    return {
        "schema": "marketplace.catalog_coverage_corpus.v0.1",
        "corpus_id": config["corpus_id"],
        "language_scope": config["language_scope"],
        "boundary": config["boundary"],
        "manifest_path": config["path"],
        "manifest_hash": file_hash(config["path"]),
        "audit_path": config["audit_path"],
        "audit_hash": file_hash(config["audit_path"]),
        "audit_passed": bool(audit.get("passed")),
        "release_count": manifest_release_count(manifest),
        "row_count": manifest_row_total(manifest),
        "special_identification_instruction_rows": int(manifest.get("special_identification_instruction_rows") or audit.get("special_identification_instruction_rows") or 0),
        "source_gap_count": int(manifest.get("source_gap_count") or audit.get("source_gap_count") or 0),
        "not_claiming": [
            "complete through-2003 universe by itself",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "approved image rights",
        ],
    }


def row_invariant_summary() -> dict[str, Any]:
    roots = [
        ROOT / "data/japanese-pre-english/releases",
        ROOT / "data/english-wotc/releases",
        ROOT / "data/japanese-classic/releases",
        ROOT / "data/japanese-adv-pre-wotc/releases",
        ROOT / "data/japanese-promo-wotc/releases",
        ROOT / "data/japanese-unnumbered-promo-wotc/releases",
        ROOT / "data/english-supplemental-wotc/releases",
    ]
    total = 0
    missing_special = []
    malformed_special = []
    nonempty_special = 0
    missing_source_contacts = []
    for root in roots:
        for path in sorted(root.glob("*.json")):
            release = json.loads(path.read_text(encoding="utf-8"))
            for index, card in enumerate(release.get("cards", [])):
                total += 1
                row_id = card.get("row_id") or card.get("id") or f"{path.name}:index:{index}"
                if "special_identification_instructions" not in card:
                    missing_special.append(row_id)
                elif not isinstance(card.get("special_identification_instructions"), list):
                    malformed_special.append(row_id)
                elif card.get("special_identification_instructions"):
                    nonempty_special += 1
                if not card.get("source_contacts"):
                    missing_source_contacts.append(row_id)
    return {
        "schema": "marketplace.catalog_row_invariant_summary.v0.1",
        "row_count": total,
        "special_identification_instruction_rows": nonempty_special,
        "missing_special_identification_instructions": len(missing_special),
        "malformed_special_identification_instructions": len(malformed_special),
        "missing_source_contacts": len(missing_source_contacts),
        "passed": not missing_special and not malformed_special and not missing_source_contacts,
        "sample_failures": {
            "missing_special_identification_instructions": missing_special[:20],
            "malformed_special_identification_instructions": malformed_special[:20],
            "missing_source_contacts": missing_source_contacts[:20],
        },
    }


def build() -> dict[str, Any]:
    corpora = [build_corpus_entry(config) for config in CORPUS_MANIFESTS]
    gap_register_path = "data/catalog-expansion/source-gaps.json"
    boundary_proof_path = "data/catalog-expansion/boundary-proof.json"
    schema_profile_path = "data/catalog-expansion/schema-profile.json"
    jumbo_boundary_proof_path = "data/catalog-expansion/english-jumbo-boundary-proof.json"
    gap_register = read_json(gap_register_path)
    boundary_proof = read_json(boundary_proof_path)
    schema_profile = read_json(schema_profile_path)
    jumbo_boundary_proof = read_json(jumbo_boundary_proof_path)
    invariant_summary = row_invariant_summary()
    modeled_rows = sum(corpus["row_count"] for corpus in corpora)
    modeled_releases = sum(corpus["release_count"] for corpus in corpora)
    active_gaps = gap_register.get("gaps", [])
    resolved_gaps = gap_register.get("resolved_gaps", [])
    partial_gaps = [gap for gap in active_gaps if gap.get("partial_resolution")]
    ledger = {
        "schema": "marketplace.catalog_coverage_ledger.v0.1",
        "generated_at": utc_now(),
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "modeled_release_count": modeled_releases,
        "modeled_row_count": modeled_rows,
        "modeled_corpora": corpora,
        "row_invariant_summary": invariant_summary,
        "boundary_proof": {
            "path": boundary_proof_path,
            "hash": file_hash(boundary_proof_path),
            "proof_hash": boundary_proof.get("proof_hash", ""),
            "passed": bool(boundary_proof.get("passed")),
            "sections": {
                key: {
                    "passed": bool(value.get("passed")),
                    "not_claiming": value.get("not_claiming", []),
                }
                for key, value in boundary_proof.get("sections", {}).items()
            },
        },
        "schema_profile": {
            "path": schema_profile_path,
            "hash": file_hash(schema_profile_path),
            "profile_hash": schema_profile.get("profile_hash", ""),
            "passed": bool(schema_profile.get("passed")),
            "row_count": int(schema_profile.get("row_count") or 0),
            "schema_counts": schema_profile.get("schema_counts", {}),
            "canonical_fields_passed": bool(schema_profile.get("canonical_fields_passed")),
            "known_schema_asymmetries": schema_profile.get("known_schema_asymmetries", []),
            "normalized_projection_schema": schema_profile.get("normalized_agent_projection", {}).get("schema", ""),
        },
        "english_jumbo_boundary_proof": {
            "path": jumbo_boundary_proof_path,
            "hash": file_hash(jumbo_boundary_proof_path),
            "proof_hash": jumbo_boundary_proof.get("proof_hash", ""),
            "passed": bool(jumbo_boundary_proof.get("passed")),
            "status": jumbo_boundary_proof.get("status", ""),
            "source_row_count": int(jumbo_boundary_proof.get("source_row_count") or 0),
            "modeled_row_count": int(jumbo_boundary_proof.get("modeled_prefix", {}).get("modeled_row_count") or 0),
            "unclassified_excluded_count": int(jumbo_boundary_proof.get("unclassified_excluded_count") or 0),
            "not_claiming": jumbo_boundary_proof.get("not_claiming", []),
        },
        "source_gap_register": {
            "path": gap_register_path,
            "hash": file_hash(gap_register_path),
            "active_gap_count": int(gap_register.get("gap_count") or len(active_gaps)),
            "active_source_gap_rows": int(gap_register.get("total_source_gap_rows") or 0),
            "resolved_gap_count": int(gap_register.get("resolved_gap_count") or len(resolved_gaps)),
            "resolved_source_gap_rows": int(gap_register.get("resolved_source_gap_rows") or 0),
            "partial_resolution_count": int(gap_register.get("partial_resolution_count") or len(partial_gaps)),
            "partially_modeled_source_gap_rows": int(gap_register.get("partially_modeled_source_gap_rows") or 0),
            "active_gaps": [
                {
                    "language": gap.get("language", ""),
                    "set_id": gap.get("set_id", ""),
                    "name": gap.get("name", ""),
                    "source_gap_count": gap.get("source_gap_count", 0),
                    "partial_resolution": gap.get("partial_resolution", {}),
                }
                for gap in active_gaps
            ],
            "resolved_gaps": [
                {
                    "language": gap.get("language", ""),
                    "set_id": gap.get("set_id", ""),
                    "name": gap.get("name", ""),
                    "former_source_gap_count": gap.get("former_source_gap_count", 0),
                    "resolved_by": gap.get("resolved_by", ""),
                    "resolved_catalog_hash": gap.get("resolved_catalog_hash", ""),
                }
                for gap in resolved_gaps
            ],
        },
        "completion_status": {
            "status": "in_progress",
            "reason": (
                "The modeled corpora cover the current source-backed slices, but the broad objective is not yet proven complete. "
                "The boundary proof accounts for API-visible main-set/promo sources and selected promo source pages, while English Jumbo remains active/partially resolved."
            ),
            "known_remaining_work": [
                "Resolve the English Jumbo TCGdex/Bulbapedia count mismatch if a stronger row-level source appears; current proof only establishes a bounded WoC-era prefix.",
                "Run a final external-source completion audit before claiming the full English/Japanese through-US-WoC-era objective is complete.",
            ],
        },
        "not_claiming": [
            "goal complete",
            "complete English/Japanese through-2003 universe",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "approved image rights",
        ],
    }
    ledger["ledger_hash"] = canonical_hash({k: v for k, v in ledger.items() if k != "ledger_hash"})
    return ledger


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the consolidated catalog coverage ledger.")
    parser.add_argument("--check", action="store_true", help="build without writing")
    args = parser.parse_args()
    ledger = build()
    if not args.check:
        write_json(OUT_PATH, ledger)
    print(
        json.dumps(
            {
                "modeled_release_count": ledger["modeled_release_count"],
                "modeled_row_count": ledger["modeled_row_count"],
                "row_invariants_passed": ledger["row_invariant_summary"]["passed"],
                "active_gap_count": ledger["source_gap_register"]["active_gap_count"],
                "active_source_gap_rows": ledger["source_gap_register"]["active_source_gap_rows"],
                "status": ledger["completion_status"]["status"],
                "wrote": [] if args.check else [OUT_PATH.relative_to(ROOT).as_posix()],
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    if not ledger["row_invariant_summary"]["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
