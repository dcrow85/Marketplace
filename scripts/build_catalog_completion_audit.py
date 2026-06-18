#!/usr/bin/env python3
"""Build the final bounded-source catalog completion audit.

This artifact is deliberately narrower than "the whole truth about Pokemon
cards." It asks whether the current modeled catalog covers the source-visible
English/Japanese TCG sets, promos, and bounded supplemental rows through the
US WoC-era endpoint, using the source surfaces already pinned by the project.
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
OUT_PATH = OUT_DIR / "completion-audit.json"
CANONICALIZATION = "json_sorted_keys_no_whitespace_v0.1"
HASH_ALGORITHM = "sha256"


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


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def section_status(boundary: dict[str, Any], key: str) -> dict[str, Any]:
    section = boundary.get("sections", {}).get(key, {})
    return {
        "section": key,
        "passed": bool(section.get("passed")),
        "not_claiming": section.get("not_claiming", []),
    }


def build() -> dict[str, Any]:
    ledger_path = "data/catalog-expansion/coverage-ledger.json"
    boundary_path = "data/catalog-expansion/boundary-proof.json"
    schema_path = "data/catalog-expansion/schema-profile.json"
    gap_path = "data/catalog-expansion/source-gaps.json"
    jumbo_path = "data/catalog-expansion/english-jumbo-boundary-proof.json"

    ledger = read_json(ledger_path)
    boundary = read_json(boundary_path)
    schema = read_json(schema_path)
    gaps = read_json(gap_path)
    jumbo = read_json(jumbo_path)

    row_invariants = ledger.get("row_invariant_summary", {})
    section_checks = [
        section_status(boundary, "english_pokemontcg_api"),
        section_status(boundary, "english_supplemental_sources"),
        section_status(boundary, "japanese_tcgdex_api"),
        section_status(boundary, "japanese_promo_sources"),
    ]
    active_gaps = gaps.get("gaps", [])
    active_gap_ids = [f"{gap.get('language', '')}/{gap.get('set_id', '')}" for gap in active_gaps]
    jumbo_nonblocking = (
        bool(jumbo.get("passed"))
        and int(jumbo.get("modeled_prefix", {}).get("modeled_row_count") or 0) == 10
        and int(jumbo.get("unclassified_excluded_count") or 0) == 0
    )
    blocking_gap_ids = [
        gap_id
        for gap_id in active_gap_ids
        if not (gap_id == "en/jumbo" and jumbo_nonblocking)
    ]
    evidence = {
        "schema": "marketplace.catalog_completion_audit_evidence.v0.1",
        "coverage_ledger": {
            "path": ledger_path,
            "modeled_release_count": int(ledger.get("modeled_release_count") or 0),
            "modeled_row_count": int(ledger.get("modeled_row_count") or 0),
            "row_invariants_passed": bool(row_invariants.get("passed")),
            "note": "Consumes ledger values without hashing the ledger file so the ledger may cite this audit without a circular hash dependency.",
        },
        "boundary_proof": {
            "path": boundary_path,
            "hash": file_hash(boundary_path),
            "proof_hash": boundary.get("proof_hash", ""),
            "passed": bool(boundary.get("passed")),
            "section_checks": section_checks,
        },
        "schema_profile": {
            "path": schema_path,
            "hash": file_hash(schema_path),
            "profile_hash": schema.get("profile_hash", ""),
            "passed": bool(schema.get("passed")),
            "row_count": int(schema.get("row_count") or 0),
            "canonical_fields_passed": bool(schema.get("canonical_fields_passed")),
        },
        "source_gap_register": {
            "path": gap_path,
            "hash": file_hash(gap_path),
            "active_gap_ids": active_gap_ids,
            "blocking_gap_ids_after_audit": blocking_gap_ids,
            "active_source_gap_rows": int(gaps.get("total_source_gap_rows") or 0),
            "resolved_gap_count": int(gaps.get("resolved_gap_count") or 0),
            "not_claiming": gaps.get("not_claiming", []),
        },
        "english_jumbo_boundary_proof": {
            "path": jumbo_path,
            "hash": file_hash(jumbo_path),
            "proof_hash": jumbo.get("proof_hash", ""),
            "passed": bool(jumbo.get("passed")),
            "status": jumbo.get("status", ""),
            "source_row_count": int(jumbo.get("source_row_count") or 0),
            "modeled_wotc_prefix_rows": int(jumbo.get("modeled_prefix", {}).get("modeled_row_count") or 0),
            "unclassified_excluded_count": int(jumbo.get("unclassified_excluded_count") or 0),
            "classification_counts": jumbo.get("classification_counts", {}),
            "not_claiming": jumbo.get("not_claiming", []),
        },
    }
    passed = (
        bool(ledger.get("row_invariant_summary", {}).get("passed"))
        and bool(boundary.get("passed"))
        and all(item["passed"] for item in section_checks)
        and bool(schema.get("passed"))
        and int(ledger.get("modeled_row_count") or 0) == int(schema.get("row_count") or 0)
        and not blocking_gap_ids
    )
    audit = {
        "schema": "marketplace.catalog_completion_audit.v0.1",
        "generated_at": utc_now(),
        "canonicalization": CANONICALIZATION,
        "hash_algorithm": HASH_ALGORITHM,
        "completion_status": {
            "status": "bounded_source_complete_with_disclosed_residuals" if passed else "in_progress",
            "reason": (
                "The modeled catalog covers the source-visible English and Japanese TCG set/promo surfaces through the US WoC-era endpoint that this project has pinned, "
                "with all row invariants passing. The remaining English Jumbo TCGdex count mismatch is non-blocking for the bounded in-scope claim because the row-level "
                "Bulbapedia proof models the WoC-era prefix and classifies every post-prefix row as later-era."
                if passed
                else "One or more source-surface checks, row invariants, schema checks, or blocking source gaps still fail."
            ),
        },
        "claim_supported": [
            "No known source-visible in-scope English/Japanese TCG set, promo, or bounded supplemental row is missing from the current modeled corpus.",
            "Every modeled card row has the current canonical row fields, including special_identification_instructions and source_contacts.",
            "English Jumbo is bounded by row-level source proof rather than accepted from TCGdex's zero-ref aggregate count.",
        ],
        "residuals": [
            {
                "id": "english_jumbo_tcgdex_count_mismatch",
                "severity": "disclosed_nonblocking_for_bounded_source_claim",
                "summary": "TCGdex exposes English Jumbo as a 160-card zero-ref set while Bulbapedia exposes 390 raw rows. The audit does not claim these counts are equivalent.",
                "current_handling": "Modeled the 10-row WoC-era/Best-of-Game prefix; classified all remaining Bulbapedia rows as post-boundary later-era buckets.",
            },
            {
                "id": "source_surface_dependency",
                "severity": "standing_disclosure",
                "summary": "The audit is only as broad as the pinned source surfaces and snapshots; it is not a guarantee that no obscure uncited product exists.",
                "current_handling": "Completion is stated as bounded-source completion, not omniscient historical completion.",
            },
        ],
        "evidence": evidence,
        "passed": passed,
        "not_claiming": [
            "physical-card truth",
            "seller possession",
            "authenticity",
            "condition truth",
            "price truth",
            "approved image rights",
            "that TCGdex and Bulbapedia Jumbo counts are equivalent",
            "that no source outside the pinned source surfaces could add future rows",
            "official status for non-official sources",
        ],
    }
    audit["audit_hash"] = canonical_hash({key: value for key, value in audit.items() if key != "audit_hash"})
    return audit


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the bounded-source catalog completion audit.")
    parser.add_argument("--check", action="store_true", help="build without writing")
    args = parser.parse_args()
    audit = build()
    if not args.check:
        write_json(OUT_PATH, audit)
    print(
        json.dumps(
            {
                "passed": audit["passed"],
                "status": audit["completion_status"]["status"],
                "modeled_release_count": audit["evidence"]["coverage_ledger"]["modeled_release_count"],
                "modeled_row_count": audit["evidence"]["coverage_ledger"]["modeled_row_count"],
                "blocking_gap_ids": audit["evidence"]["source_gap_register"]["blocking_gap_ids_after_audit"],
                "wrote": [] if args.check else [OUT_PATH.relative_to(ROOT).as_posix()],
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    if not audit["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
