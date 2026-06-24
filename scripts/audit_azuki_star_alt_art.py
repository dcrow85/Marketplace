#!/usr/bin/env python3
"""Audit Azuki TCG star / alternate-art signal alignment.

This is an audit, not a correction pass. It compares row-specific gallery
rarity, the Alpha-field completion CSV rarity, image/source filename variant
signals, and sibling image reuse so agents can see where star treatment may
have been flattened or paired with the wrong image.
"""

from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import io
import json
import os
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data" / "azuki-tcg"
AUDIT_DIR = BASE / "audits"
RELEASE_PATH = BASE / "releases" / "azuki_tcg_official_gallery.json"
COMPLETION_PATH = BASE / "spreadsheets" / "azuki_tcg_alpha_fields_completion.csv"
AUDIT_ID = "azuki_tcg_star_alt_art_audit_2026_06_24"

AUDIT_COLUMNS = [
    "AUDIT_ROW_ID",
    "AUDIT_STATUS",
    "SEVERITY",
    "ISSUE_CODES",
    "RECOMMENDED_ACTION",
    "UID",
    "CARD_ID",
    "NORMALIZED_CARD_ID",
    "NAME",
    "SETS",
    "SOURCE_ENTRY_ID",
    "IMAGE_BASENAME",
    "GALLERY_RARITY",
    "COMPLETION_RARITY",
    "GALLERY_HAS_STAR",
    "COMPLETION_HAS_STAR",
    "SOURCE_PREFIX_CARD_ID",
    "SOURCE_PREFIX_SUFFIX",
    "SOURCE_CARD_ID_MATCHES_GALLERY",
    "SOURCE_HAS_VARIANT_MARKER",
    "IMAGE_HAS_ALT_ART_MARKER",
    "SHARES_IMAGE_WITH_NONSTAR_SIBLING",
    "NONSTAR_SIBLING_UIDS",
    "NOTES",
]


def canonical_json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def csv_text(rows: list[dict[str, Any]], columns: list[str]) -> str:
    handle = io.StringIO()
    writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({column: "" if row.get(column) is None else row.get(column) for column in columns})
    return handle.getvalue()


def has_star(value: Any) -> bool:
    return "★" in str(value or "")


def normalize_card_id(card_id: str) -> str:
    match = re.match(r"^(AZK\d{2}|STT\d{2}|IKZ|AZP)-(\d{1,3})$", card_id)
    if not match:
        return card_id
    return f"{match.group(1)}-{int(match.group(2)):03d}"


def source_prefix(source_entry_id: str) -> tuple[str, str] | tuple[None, None]:
    text = source_entry_id.removeprefix("S1-")
    match = re.match(r"^(AZK\d{2}|STT\d{2}|IKZ|AZP)-(\d{1,3})([A-Z0-9]*)_", text)
    if not match:
        return None, None
    family, number, suffix = match.groups()
    return f"{family}-{int(number):03d}", suffix


def source_has_variant_marker(source_entry_id: str, suffix: str | None) -> bool:
    text = source_entry_id.upper()
    if suffix and ("A" in suffix or "X" in suffix):
        return True
    return any(marker in text for marker in ["_AA_", "_INV", "-TOP", "-WINNER", "-SECOND"])


def image_has_alt_art_marker(source_entry_id: str, image_basename: str) -> bool:
    text = f"{source_entry_id} {image_basename}".upper()
    return any(marker in text for marker in ["_AA_", "_INV", "ASN", "AX", "A_"])


def severity(issue_codes: list[str]) -> str:
    if any(code in issue_codes for code in ["star_row_reuses_nonstar_image_url", "source_entry_card_id_disagrees_with_gallery_card_id"]):
        return "high"
    if issue_codes:
        return "medium"
    return "none"


def recommended_action(issue_codes: list[str]) -> str:
    if "star_row_reuses_nonstar_image_url" in issue_codes:
        return "Review source image assignment; star row appears to reuse a non-star sibling image URL."
    if "source_entry_card_id_disagrees_with_gallery_card_id" in issue_codes:
        return "Review gallery source row; image/source filename appears to identify a different card ID than the gallery card_id."
    if "completion_row_missing_gallery_star" in issue_codes:
        return "Completion CSV should preserve row-specific gallery rarity for this variant instead of flattening to the Alpha sheet card-level rarity."
    if "completion_row_has_star_but_gallery_rarity_not_star" in issue_codes:
        return "Review completion CSV rarity; it marks a star absent from the official gallery row rarity."
    if "gallery_rarity_missing_star_for_variant_marker" in issue_codes:
        return "Review gallery rarity; source filename looks variant/alt-like but gallery rarity has no star."
    return "No action from this audit."


def build_audit() -> tuple[str, dict[str, Any]]:
    release = read_json(RELEASE_PATH)
    gallery_rows = release["cards"]
    completion_rows = read_csv_rows(COMPLETION_PATH)
    completion_by_uid = {row["ROW_KEY"]: row for row in completion_rows}

    by_card_id: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    for row in gallery_rows:
        by_card_id[row["card_id"]].append(row)

    audit_rows: list[dict[str, Any]] = []
    for row in sorted(gallery_rows, key=lambda item: (item["card_id"], item["source_entry_id"])):
        completion = completion_by_uid.get(row["uid"], {})
        source_card_id, source_suffix = source_prefix(row["source_entry_id"])
        normalized = normalize_card_id(row["card_id"])
        image_basename = os.path.basename(row["image_url"])
        gallery_star = has_star(row.get("rarity"))
        completion_star = has_star(completion.get("RARITY"))
        variant_marker = source_has_variant_marker(row["source_entry_id"], source_suffix)
        image_marker = image_has_alt_art_marker(row["source_entry_id"], image_basename)
        nonstar_sibling_uids = sorted(
            sibling["uid"]
            for sibling in by_card_id[row["card_id"]]
            if sibling["uid"] != row["uid"]
            and sibling["image_url"] == row["image_url"]
            and not has_star(sibling.get("rarity"))
        )

        in_scope = gallery_star or completion_star or variant_marker or image_marker
        if not in_scope:
            continue

        issue_codes: list[str] = []
        if gallery_star and nonstar_sibling_uids:
            issue_codes.append("star_row_reuses_nonstar_image_url")
        if source_card_id and source_card_id != normalized:
            issue_codes.append("source_entry_card_id_disagrees_with_gallery_card_id")
        if gallery_star and not completion_star:
            issue_codes.append("completion_row_missing_gallery_star")
        if completion_star and not gallery_star:
            issue_codes.append("completion_row_has_star_but_gallery_rarity_not_star")
        if variant_marker and not gallery_star and source_card_id and source_card_id != normalized:
            issue_codes.append("gallery_rarity_missing_star_for_variant_marker")

        notes = []
        if nonstar_sibling_uids:
            notes.append("Star row shares the exact image URL with a non-star sibling.")
        if source_card_id and source_card_id != normalized:
            notes.append("Parsed source/image card ID does not match gallery card_id after zero-padding normalization.")
        if gallery_star and not completion_star:
            notes.append("Official gallery row has star rarity, but Alpha-field completion row does not.")
        if completion_star and not gallery_star:
            notes.append("Alpha-field completion row has star rarity, but official gallery row does not.")

        audit_rows.append(
            {
                "AUDIT_ROW_ID": f"star-alt-audit-{len(audit_rows) + 1:03d}",
                "AUDIT_STATUS": "needs_review" if issue_codes else "aligned_by_current_heuristics",
                "SEVERITY": severity(issue_codes),
                "ISSUE_CODES": "; ".join(issue_codes),
                "RECOMMENDED_ACTION": recommended_action(issue_codes),
                "UID": row["uid"],
                "CARD_ID": row["card_id"],
                "NORMALIZED_CARD_ID": normalized,
                "NAME": row["name"],
                "SETS": "; ".join(row.get("sets") or []),
                "SOURCE_ENTRY_ID": row["source_entry_id"],
                "IMAGE_BASENAME": image_basename,
                "GALLERY_RARITY": row.get("rarity") or "",
                "COMPLETION_RARITY": completion.get("RARITY") or "",
                "GALLERY_HAS_STAR": str(gallery_star).lower(),
                "COMPLETION_HAS_STAR": str(completion_star).lower(),
                "SOURCE_PREFIX_CARD_ID": source_card_id or "",
                "SOURCE_PREFIX_SUFFIX": source_suffix or "",
                "SOURCE_CARD_ID_MATCHES_GALLERY": "" if not source_card_id else str(source_card_id == normalized).lower(),
                "SOURCE_HAS_VARIANT_MARKER": str(variant_marker).lower(),
                "IMAGE_HAS_ALT_ART_MARKER": str(image_marker).lower(),
                "SHARES_IMAGE_WITH_NONSTAR_SIBLING": str(bool(nonstar_sibling_uids)).lower(),
                "NONSTAR_SIBLING_UIDS": "; ".join(nonstar_sibling_uids),
                "NOTES": " ".join(notes),
            }
        )

    csv_payload = csv_text(audit_rows, AUDIT_COLUMNS)
    issue_counter = collections.Counter()
    severity_counter = collections.Counter()
    for row in audit_rows:
        severity_counter[row["SEVERITY"]] += 1
        for code in row["ISSUE_CODES"].split("; "):
            if code:
                issue_counter[code] += 1

    provenance = {
        "schema": "azuki_tcg_star_alt_art_audit_provenance_v0.1",
        "name": "Azuki TCG Star / Alternate-Art Signal Audit",
        "audit_csv_path": f"data/azuki-tcg/audits/{AUDIT_ID}.csv",
        "source_inputs": {
            "official_gallery_release": {
                "path": str(RELEASE_PATH.relative_to(ROOT)),
                "sha256": sha256_bytes(RELEASE_PATH.read_bytes()),
            },
            "alpha_fields_completion_csv": {
                "path": str(COMPLETION_PATH.relative_to(ROOT)),
                "sha256": sha256_bytes(COMPLETION_PATH.read_bytes()),
            },
        },
        "audit_policy": {
            "in_scope": [
                "rows where official gallery rarity contains ★",
                "rows where Alpha-field completion rarity contains ★",
                "rows where source/image filename has an alternate/promo-style variant marker",
            ],
            "checks": [
                "gallery star rarity vs completion CSV star rarity",
                "source/image filename card ID vs gallery card_id",
                "star row exact image URL reuse with a non-star sibling",
                "variant marker with missing gallery star when also paired to a different gallery card_id",
            ],
            "not_claiming": [
                "visual confirmation that every variant image is correct",
                "official correction of the source API",
                "physical-card authenticity, possession, condition, or market value",
                "that every source filename A/AX marker is necessarily an alt-art rarity marker",
            ],
        },
        "counts": {
            "official_gallery_rows": len(gallery_rows),
            "alpha_completion_rows": len(completion_rows),
            "audit_rows": len(audit_rows),
            "rows_needing_review": sum(1 for row in audit_rows if row["AUDIT_STATUS"] == "needs_review"),
            "gallery_star_rows_in_scope": sum(1 for row in audit_rows if row["GALLERY_HAS_STAR"] == "true"),
            "completion_star_rows_in_scope": sum(1 for row in audit_rows if row["COMPLETION_HAS_STAR"] == "true"),
            "severity": dict(sorted(severity_counter.items())),
            "issues": dict(sorted(issue_counter.items())),
        },
        "csv_sha256": sha256_text(csv_payload),
    }
    return csv_payload, provenance


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Verify generated audit files are current without writing.")
    args = parser.parse_args()

    csv_payload, provenance = build_audit()
    csv_path = AUDIT_DIR / f"{AUDIT_ID}.csv"
    provenance_path = AUDIT_DIR / f"{AUDIT_ID}_provenance.json"
    expected_provenance = json.dumps(provenance, ensure_ascii=False, indent=2, sort_keys=True) + "\n"

    if args.check:
        mismatches = []
        if not csv_path.exists() or csv_path.read_text(encoding="utf-8") != csv_payload:
            mismatches.append(str(csv_path.relative_to(ROOT)))
        if not provenance_path.exists() or provenance_path.read_text(encoding="utf-8") != expected_provenance:
            mismatches.append(str(provenance_path.relative_to(ROOT)))
        print(json.dumps({"passed": not mismatches, "mismatches": mismatches, "counts": provenance["counts"]}, indent=2, sort_keys=True))
        if mismatches:
            sys.exit(1)
        return

    AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    csv_path.write_text(csv_payload, encoding="utf-8")
    provenance_path.write_text(expected_provenance, encoding="utf-8")
    print(json.dumps({"wrote": [str(csv_path.relative_to(ROOT)), str(provenance_path.relative_to(ROOT))], "counts": provenance["counts"]}, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
