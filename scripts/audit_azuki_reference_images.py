#!/usr/bin/env python3
"""Audit Azuki TCG row/image/Alpha-field alignment.

This is stricter than the star-alt signal audit. The rule is simple:
if the row cannot honestly point to the image as *that row's* reference photo,
the UI must not display it as a reference image.
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
AUDIT_ID = "azuki_tcg_reference_image_audit_2026_06_25"

AUDIT_COLUMNS = [
    "AUDIT_ROW_ID",
    "AUDIT_STATUS",
    "SEVERITY",
    "REFERENCE_IMAGE_POLICY",
    "STAMP_FIELD_POLICY",
    "ISSUE_CODES",
    "RECOMMENDED_ACTION",
    "UID",
    "CARD_ID",
    "NORMALIZED_CARD_ID",
    "NAME",
    "SETS",
    "SOURCE_ENTRY_ID",
    "IMAGE_BASENAME",
    "IMAGE_URL_PRESENT",
    "GALLERY_RARITY",
    "COMPLETION_RARITY",
    "COMPLETION_STAMP",
    "FIELD_SOURCE",
    "SOURCE_PREFIX_CARD_ID",
    "SOURCE_PREFIX_SUFFIX",
    "SOURCE_CARD_ID_MATCHES_GALLERY",
    "IMAGE_REUSED_WITH_UIDS",
    "IMAGE_REUSED_WITH_DIFFERENT_ROW_STATE",
    "NOTES",
]


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def canonical_json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


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
    match = re.match(r"^(AZK\d{2}|STT\d{2}|IKZ|AZP)-(\d{1,3})$", card_id or "")
    if not match:
        return card_id or ""
    return f"{match.group(1)}-{int(match.group(2)):03d}"


def source_prefix(source_entry_id: str) -> tuple[str | None, str | None]:
    text = (source_entry_id or "").removeprefix("S1-")
    match = re.match(r"^(AZK\d{2}|STT\d{2}|IKZ|AZP)-(\d{1,3})([A-Z0-9]*)_", text)
    if not match:
        return None, None
    family, number, suffix = match.groups()
    return f"{family}-{int(number):03d}", suffix


def row_state(row: dict[str, Any]) -> tuple[Any, ...]:
    return (
        row.get("card_id"),
        row.get("rarity"),
        tuple(row.get("sets") or []),
        row.get("source_entry_id"),
    )


def severity(codes: list[str]) -> str:
    high = {
        "source_entry_card_id_disagrees_with_gallery_card_id",
        "star_row_reuses_nonstar_image_url",
        "image_url_reused_across_different_row_state",
    }
    if any(code in high for code in codes):
        return "high"
    if codes:
        return "medium"
    return "none"


def recommended_action(codes: list[str]) -> str:
    if "source_entry_card_id_disagrees_with_gallery_card_id" in codes:
        return "Suppress the reference image until the row identity and image/source identity are reconciled."
    if "star_row_reuses_nonstar_image_url" in codes:
        return "Suppress the reference image for the star row; the current source gives the same image to a non-star sibling."
    if "image_url_reused_across_different_row_state" in codes:
        return "Suppress the ambiguous reference image for rows whose source image is reused across differing row states."
    if "inherited_alpha_stamp_on_non_alpha_gallery_row" in codes:
        return "Do not display the Alpha-sheet stamp as a row-specific stamp for this official gallery row."
    if "completion_row_missing_gallery_star" in codes:
        return "Use row-specific gallery rarity; do not let card-level Alpha completion flatten this variant."
    if "completion_row_has_star_but_gallery_rarity_not_star" in codes:
        return "Use row-specific gallery rarity; review why completion carries a star absent from the gallery row."
    return "No action from this audit."


def build_audit() -> tuple[str, dict[str, Any]]:
    release = read_json(RELEASE_PATH)
    gallery_rows = release["cards"]
    completion_rows = read_csv_rows(COMPLETION_PATH)
    completion_by_uid = {row["ROW_KEY"]: row for row in completion_rows}

    by_image: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    by_card_id: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    for row in gallery_rows:
        by_image[row.get("image_url") or ""].append(row)
        by_card_id[row.get("card_id") or ""].append(row)

    audit_rows: list[dict[str, Any]] = []
    for row in sorted(gallery_rows, key=lambda item: (item["card_id"], item["source_entry_id"])):
        completion = completion_by_uid.get(row["uid"], {})
        normalized = normalize_card_id(row.get("card_id") or "")
        source_card_id, source_suffix = source_prefix(row.get("source_entry_id") or "")
        source_matches = None if not source_card_id else source_card_id == normalized
        image_url = row.get("image_url") or ""
        image_peers = [peer for peer in by_image[image_url] if peer["uid"] != row["uid"]] if image_url else []
        reused_with_different_state = any(row_state(peer) != row_state(row) for peer in image_peers)
        star_reuses_nonstar = has_star(row.get("rarity")) and any(not has_star(peer.get("rarity")) for peer in image_peers)

        sets = row.get("sets") or []
        inherited_alpha_stamp_on_non_alpha = (
            completion.get("STAMP") == "Alpha"
            and "linked_alpha_master_sheet" in (completion.get("FIELD_SOURCE") or "")
            and sets != ["Booster"]
        )

        issue_codes: list[str] = []
        if source_matches is False:
            issue_codes.append("source_entry_card_id_disagrees_with_gallery_card_id")
        if star_reuses_nonstar:
            issue_codes.append("star_row_reuses_nonstar_image_url")
        if reused_with_different_state and (source_matches is False or star_reuses_nonstar):
            issue_codes.append("image_url_reused_across_different_row_state")
        if inherited_alpha_stamp_on_non_alpha:
            issue_codes.append("inherited_alpha_stamp_on_non_alpha_gallery_row")
        if has_star(row.get("rarity")) and not has_star(completion.get("RARITY")):
            issue_codes.append("completion_row_missing_gallery_star")
        if has_star(completion.get("RARITY")) and not has_star(row.get("rarity")):
            issue_codes.append("completion_row_has_star_but_gallery_rarity_not_star")

        sev = severity(issue_codes)
        reference_policy = "suppress_reference_image" if sev == "high" else "display_reference_image"
        stamp_policy = "suppress_inherited_alpha_stamp" if inherited_alpha_stamp_on_non_alpha else "display_stamp_if_present"

        notes: list[str] = []
        if source_matches is False:
            notes.append("Parsed source/image card ID does not match gallery card_id after normalization.")
        if star_reuses_nonstar:
            notes.append("A star row shares the exact image URL with a non-star sibling.")
        if reused_with_different_state:
            notes.append("Image URL is reused across rows with different card_id/rarity/set/source state.")
        if inherited_alpha_stamp_on_non_alpha:
            notes.append("Alpha-sheet stamp is inherited by card-id crosswalk into a non-Booster official gallery row.")
        if has_star(row.get("rarity")) and not has_star(completion.get("RARITY")):
            notes.append("Gallery row is star/alt but completion rarity is flattened.")
        if has_star(completion.get("RARITY")) and not has_star(row.get("rarity")):
            notes.append("Completion rarity is star/alt but gallery row is not.")

        if issue_codes:
            audit_rows.append(
                {
                    "AUDIT_ROW_ID": f"reference-image-audit-{len(audit_rows) + 1:03d}",
                    "AUDIT_STATUS": "needs_review",
                    "SEVERITY": sev,
                    "REFERENCE_IMAGE_POLICY": reference_policy,
                    "STAMP_FIELD_POLICY": stamp_policy,
                    "ISSUE_CODES": "; ".join(issue_codes),
                    "RECOMMENDED_ACTION": recommended_action(issue_codes),
                    "UID": row["uid"],
                    "CARD_ID": row.get("card_id") or "",
                    "NORMALIZED_CARD_ID": normalized,
                    "NAME": row.get("name") or "",
                    "SETS": "; ".join(sets),
                    "SOURCE_ENTRY_ID": row.get("source_entry_id") or "",
                    "IMAGE_BASENAME": os.path.basename(image_url),
                    "IMAGE_URL_PRESENT": str(bool(image_url)).lower(),
                    "GALLERY_RARITY": row.get("rarity") or "",
                    "COMPLETION_RARITY": completion.get("RARITY") or "",
                    "COMPLETION_STAMP": completion.get("STAMP") or "",
                    "FIELD_SOURCE": completion.get("FIELD_SOURCE") or "",
                    "SOURCE_PREFIX_CARD_ID": source_card_id or "",
                    "SOURCE_PREFIX_SUFFIX": source_suffix or "",
                    "SOURCE_CARD_ID_MATCHES_GALLERY": "" if source_matches is None else str(source_matches).lower(),
                    "IMAGE_REUSED_WITH_UIDS": "; ".join(peer["uid"] for peer in image_peers),
                    "IMAGE_REUSED_WITH_DIFFERENT_ROW_STATE": str(reused_with_different_state).lower(),
                    "NOTES": " ".join(notes),
                }
            )

    csv_payload = csv_text(audit_rows, AUDIT_COLUMNS)
    issue_counter = collections.Counter()
    severity_counter = collections.Counter()
    reference_policy_counter = collections.Counter()
    stamp_policy_counter = collections.Counter()
    for row in audit_rows:
        severity_counter[row["SEVERITY"]] += 1
        reference_policy_counter[row["REFERENCE_IMAGE_POLICY"]] += 1
        stamp_policy_counter[row["STAMP_FIELD_POLICY"]] += 1
        for code in row["ISSUE_CODES"].split("; "):
            if code:
                issue_counter[code] += 1

    provenance = {
        "schema": "azuki_tcg_reference_image_audit_provenance_v0.1",
        "name": "Azuki TCG Reference Image and Alpha Field Audit",
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
            "display_rule": "Only display a reference image when the row can honestly cite that image as this row's reference photo.",
            "suppressed_reference_image_conditions": [
                "source/image filename card ID disagrees with gallery row card_id",
                "star/alternate-art row reuses the exact image URL of a non-star sibling",
                "image URL is reused across different row states and one of the identity/star conditions above applies",
            ],
            "suppressed_field_conditions": [
                "Alpha-sheet STAMP=Alpha inherited by card-id crosswalk into a non-Booster official gallery row",
            ],
            "not_claiming": [
                "visual authentication of any physical card",
                "seller possession",
                "that source URLs are permanent or image-rights cleared",
                "that every unflagged image has been manually inspected pixel-by-pixel",
                "that Alpha-sheet card-level fields are variant-specific unless explicitly marked",
            ],
        },
        "counts": {
            "official_gallery_rows": len(gallery_rows),
            "alpha_completion_rows": len(completion_rows),
            "audit_rows": len(audit_rows),
            "severity": dict(sorted(severity_counter.items())),
            "issues": dict(sorted(issue_counter.items())),
            "reference_policy": dict(sorted(reference_policy_counter.items())),
            "stamp_policy": dict(sorted(stamp_policy_counter.items())),
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
