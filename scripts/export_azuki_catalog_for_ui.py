#!/usr/bin/env python3
"""Export the Azuki TCG catalog into the binder site's UI payload.

This is a view artifact, not a new authority layer. It preserves the official
gallery rows as the primary display substrate, overlays Alpha-sheet completion
fields where available, and carries audit / observation scars forward so the
site does not silently smooth over source disagreements.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
AZUKI = ROOT / "data" / "azuki-tcg"
UI_DIR = AZUKI / "ui"
WEB_CATALOG_DIR = ROOT / "web" / "public" / "catalogs"

OFFICIAL = AZUKI / "releases" / "azuki_tcg_official_gallery.json"
COMPLETION = AZUKI / "spreadsheets" / "azuki_tcg_alpha_fields_completion.csv"
STAR_AUDIT = AZUKI / "audits" / "azuki_tcg_star_alt_art_audit_2026_06_24.csv"
REFERENCE_AUDIT = AZUKI / "audits" / "azuki_tcg_reference_image_audit_2026_06_25.csv"
PROMO_OBS = AZUKI / "observations" / "azuki_tcg_user_photo_promo_observations_2026_06_24.csv"
PORTRAIT_OBS = AZUKI / "observations" / "azuki_tcg_user_image_portrait_alt_observations_2026_06_24.csv"
MANIFEST = AZUKI / "manifest.json"

SET_ORDER = {
    "Booster": 0,
    "Starter Deck 1": 10,
    "Starter Deck 2": 11,
    "Starter Deck 3": 12,
    "Starter Deck 4": 13,
    "Promo": 20,
    "Observed": 30,
}

CATEGORY_ORDER = ["Leader", "Gate", "Entity", "Weapon", "Spell", "IKZ"]
ELEMENT_ORDER = ["Neutral", "Water", "Lightning", "Earth", "Fire"]


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "unknown"


def split_semis(text: str | None) -> list[str]:
    if not text:
        return []
    return [p.strip() for p in re.split(r"\s*;\s*", text) if p.strip()]


def split_sets(text: str | None) -> list[str]:
    if not text:
        return []
    return [p.strip() for p in re.split(r"\s*[,;]\s*", text) if p.strip()]


def has_star(rarity: str | None) -> bool:
    return "★" in (rarity or "")


def band_rank(card: dict[str, Any], audit: dict[str, str] | None) -> int:
    rarity = card.get("rarity") or ""
    if audit and audit.get("SEVERITY") == "high":
        return 3
    if has_star(rarity) or rarity.startswith("L"):
        return 3
    if rarity.startswith("SR"):
        return 2
    if rarity.startswith("R"):
        return 1
    return 0


def primary_set(card: dict[str, Any]) -> str:
    sets = card.get("sets") or []
    if not sets:
        return "Observed"
    return sets[0]


def issue_from_audit(row: dict[str, str] | None) -> dict[str, Any] | None:
    if not row or row.get("SEVERITY") in ("", "none"):
        return None
    return {
        "source": "star_alt_audit_2026_06_24",
        "severity": row.get("SEVERITY") or "needs_review",
        "status": row.get("AUDIT_STATUS") or "needs_review",
        "codes": split_semis(row.get("ISSUE_CODES")),
        "recommended_action": row.get("RECOMMENDED_ACTION") or "",
        "notes": row.get("NOTES") or "",
    }


def issue_from_reference_audit(row: dict[str, str] | None) -> dict[str, Any] | None:
    if not row or row.get("SEVERITY") in ("", "none"):
        return None
    return {
        "source": "reference_image_audit_2026_06_25",
        "severity": row.get("SEVERITY") or "needs_review",
        "status": row.get("AUDIT_STATUS") or "needs_review",
        "codes": split_semis(row.get("ISSUE_CODES")),
        "recommended_action": row.get("RECOMMENDED_ACTION") or "",
        "notes": row.get("NOTES") or "",
    }


def completion_for(uid: str, by_uid: dict[str, dict[str, str]]) -> dict[str, str]:
    return by_uid.get(uid, {})


def observation_indexes(paths: list[Path]) -> tuple[dict[str, list[dict[str, str]]], list[dict[str, str]]]:
    by_uid: dict[str, list[dict[str, str]]] = defaultdict(list)
    unmatched: list[dict[str, str]] = []
    for path in paths:
        if not path.exists():
            continue
        for row in read_csv(path):
            matches = split_semis(row.get("MATCHED_GALLERY_UIDS"))
            if matches:
                for uid in matches:
                    by_uid[uid].append(row)
            else:
                unmatched.append(row)
    return by_uid, unmatched


def observation_note(row: dict[str, str]) -> dict[str, Any]:
    return {
        "observation_id": row.get("OBSERVATION_ID") or "",
        "authority_label": row.get("AUTHORITY_LABEL") or "user_observation",
        "printed_id": row.get("PRINTED_ID") or row.get("ID") or "",
        "normalized_card_id": row.get("NORMALIZED_CARD_ID") or "",
        "confidence": row.get("OBSERVATION_CONFIDENCE") or "",
        "location": row.get("PHYSICAL_LOCATION_IN_IMAGE") or "",
        "observed_azuki_number": row.get("OBSERVED_AZUKI_NUMBER") or "",
        "observed_stamp": row.get("OBSERVED_STAMP") or "",
        "note": row.get("OBSERVATION_NOTE") or "",
    }


def card_from_official(
    card: dict[str, Any],
    completion_by_uid: dict[str, dict[str, str]],
    audit_by_uid: dict[str, dict[str, str]],
    reference_audit_by_uid: dict[str, dict[str, str]],
    observations_by_uid: dict[str, list[dict[str, str]]],
    manifest_hash: str,
) -> dict[str, Any]:
    uid = card["uid"]
    comp = completion_for(uid, completion_by_uid)
    audit = audit_by_uid.get(uid)
    ref_audit = reference_audit_by_uid.get(uid)
    obs = [observation_note(row) for row in observations_by_uid.get(uid, [])]

    rarity = card.get("rarity") or comp.get("RARITY") or ""
    element = card.get("element") or comp.get("ELEMENT") or ""
    subtypes = card.get("subtypes") or [comp.get("SUBTYPE_1"), comp.get("SUBTYPE_2"), comp.get("SUBTYPE_3")]
    subtypes = [s for s in subtypes if s]
    types = [v for v in [element, *subtypes] if v]
    star_issue = issue_from_audit(audit)
    reference_issue = issue_from_reference_audit(ref_audit)
    if star_issue and reference_issue:
        reference_codes = set(reference_issue.get("codes", []))
        star_issue["codes"] = [code for code in star_issue.get("codes", []) if code not in reference_codes]
        if not star_issue["codes"]:
            star_issue = None
    issues = [issue for issue in [star_issue, reference_issue] if issue]
    if obs:
        issues.append({
            "source": "user_observation_layer",
            "severity": "info",
            "status": "legible_observation",
            "codes": ["user_observation_attached"],
            "recommended_action": "Treat as evidence context, not an official gallery fact.",
            "notes": f"{len(obs)} observation note(s) attached.",
        })

    sets = card.get("sets") or split_sets(comp.get("SETS")) or ["Booster"]
    set_name = primary_set({"sets": sets})
    row_id = uid
    name = card.get("name") or comp.get("NAME") or row_id
    entry_id = card.get("source_entry_id") or comp.get("SOURCE_ENTRY_ID") or ""
    suppress_reference = ref_audit and ref_audit.get("REFERENCE_IMAGE_POLICY") == "suppress_reference_image"
    suppress_stamp = ref_audit and ref_audit.get("STAMP_FIELD_POLICY") == "suppress_inherited_alpha_stamp"
    original_image = card.get("image_url") or comp.get("IMAGE_URL") or ""
    image = "" if suppress_reference else original_image
    image_status = "no_reference_photo" if suppress_reference else "exact_source"
    provenance = (
        "Reference image suppressed by reference-image audit; source row does not currently provide an exact photo for this catalog row."
        if suppress_reference
        else "Official Azuki gallery image URL; not seller evidence or physical-card proof."
    )
    stamp = "" if suppress_stamp else (comp.get("STAMP") or "")
    suppressed_fields = []
    if suppress_reference:
        suppressed_fields.append("image")
    if suppress_stamp:
        suppressed_fields.append("stamp")
    return {
        "uid": uid,
        "catalog_profile": "azuki-tcg",
        "set_id": f"azuki_{slug(set_name)}",
        "num": card.get("card_id") or comp.get("ID") or "",
        "name_ja": "",
        "romaji": "",
        "name_en": name,
        "name_is_en": False,
        "name_ja_status": "english_print_name",
        "category": card.get("category") or comp.get("TYPE") or "",
        "element": element,
        "types": types,
        "subtypes": subtypes,
        "holo": has_star(rarity),
        "star_alt": has_star(rarity),
        "rarity": rarity,
        "band_rank": band_rank({"rarity": rarity}, audit),
        "image": image,
        "image_status": image_status,
        "display_allowed": not suppress_reference,
        "provenance": provenance,
        "reference_image_policy": ref_audit.get("REFERENCE_IMAGE_POLICY") if ref_audit else "display_reference_image",
        "stamp_field_policy": ref_audit.get("STAMP_FIELD_POLICY") if ref_audit else "display_stamp_if_present",
        "suppressed_fields": suppressed_fields,
        "source_authority": card.get("authority_label") or "official_gallery_api_fact",
        "field_source": comp.get("FIELD_SOURCE") or "official_gallery_api_fact",
        "missing_alpha_fields": split_semis(comp.get("MISSING_ALPHA_FIELDS")),
        "review_status": comp.get("REVIEW_STATUS") or "",
        "promo": {"sets": sets} if "Promo" in sets else None,
        "owned": False,
        "cond": None,
        "custody": None,
        "gap": None,
        "stance": None,
        "want_cond": None,
        "want_max": None,
        "catalog_hash": manifest_hash,
        "row_id": row_id,
        "card_id": card.get("card_id") or comp.get("ID") or "",
        "source_entry_id": entry_id,
        "ikz_cost": comp.get("IKZ COST") or card.get("ikz_cost"),
        "gate_power": comp.get("GATE_PWR") or card.get("gate_power"),
        "attack": comp.get("ATK") or card.get("attack"),
        "health": comp.get("HP") or card.get("health"),
        "plus_attack": comp.get("PLUS_ATK") or "",
        "ref_ip": [v for v in [comp.get("REF_IP"), comp.get("REF_ID"), comp.get("REF_IP2"), comp.get("REF_ID2")] if v],
        "illustrator": comp.get("ILLUSTRATOR") or "",
        "effects": [
            {"label": comp.get("E_1") or "", "text": comp.get("E_1_TEXT") or ""},
            {"label": comp.get("E_2") or "", "text": comp.get("E_2_TEXT") or ""},
        ],
        "card_text": card.get("card_text") or "",
        "flavor_text": comp.get("F_TEXT") or "",
        "definition_text": comp.get("DEFINITION_TEXT") or "",
        "ruling_text": comp.get("RULING_TEXT") or "",
        "stamp": stamp,
        "variant_group": card.get("variant_group") or {},
        "issues": issues,
        "observations": obs,
        "not_claiming": card.get("not_claiming") or [],
    }


def card_from_unmatched_observation(row: dict[str, str], manifest_hash: str) -> dict[str, Any]:
    rarity = row.get("RARITY") or ""
    element = row.get("ELEMENT") or ""
    subtypes = [row.get("SUBTYPE_1"), row.get("SUBTYPE_2"), row.get("SUBTYPE_3")]
    subtypes = [s for s in subtypes if s]
    uid = f"azuki_tcg_observation:{row.get('OBSERVATION_ID')}"
    return {
        "uid": uid,
        "catalog_profile": "azuki-tcg",
        "set_id": "azuki_observed",
        "num": row.get("PRINTED_ID") or row.get("ID") or "",
        "name_ja": "",
        "romaji": "",
        "name_en": row.get("NAME") or uid,
        "name_is_en": False,
        "name_ja_status": "english_print_name_from_user_observation",
        "category": row.get("TYPE") or "",
        "element": element,
        "types": [v for v in [element, *subtypes] if v],
        "subtypes": subtypes,
        "holo": has_star(rarity),
        "star_alt": has_star(rarity),
        "rarity": rarity,
        "band_rank": 3 if has_star(rarity) else 0,
        "image": "",
        "image_status": "user_observation_no_public_image",
        "display_allowed": False,
        "provenance": "User photo observation; source image hash recorded, image not committed.",
        "source_authority": row.get("AUTHORITY_LABEL") or "user_observation",
        "field_source": "user_observation_not_official_gallery_fact",
        "missing_alpha_fields": [],
        "review_status": "observation_only",
        "promo": {"sets": ["Observed"]},
        "owned": False,
        "cond": None,
        "custody": None,
        "gap": None,
        "stance": None,
        "want_cond": None,
        "want_max": None,
        "catalog_hash": manifest_hash,
        "row_id": uid,
        "card_id": row.get("NORMALIZED_CARD_ID") or row.get("ID") or "",
        "source_entry_id": row.get("OBSERVATION_ID") or "",
        "ikz_cost": row.get("IKZ COST") or "",
        "gate_power": row.get("GATE_PWR") or "",
        "attack": row.get("ATK") or "",
        "health": row.get("HP") or "",
        "plus_attack": row.get("PLUS_ATK") or "",
        "ref_ip": [v for v in [row.get("REF_IP"), row.get("REF_ID"), row.get("REF_IP2"), row.get("REF_ID2")] if v],
        "illustrator": row.get("ILLUSTRATOR") or "",
        "effects": [
            {"label": row.get("E_1") or "", "text": row.get("E_1_TEXT") or ""},
            {"label": row.get("E_2") or "", "text": row.get("E_2_TEXT") or ""},
        ],
        "card_text": "",
        "flavor_text": row.get("F_TEXT") or "",
        "definition_text": row.get("DEFINITION_TEXT") or "",
        "ruling_text": row.get("RULING_TEXT") or "",
        "stamp": row.get("STAMP") or row.get("OBSERVED_STAMP") or "",
        "variant_group": {},
        "issues": [{
            "source": "user_observation_layer",
            "severity": "medium",
            "status": "observation_only",
            "codes": ["not_in_current_official_gallery_snapshot"],
            "recommended_action": "Review against future official gallery snapshots before promoting.",
            "notes": row.get("OBSERVATION_NOTE") or "",
        }],
        "observations": [observation_note(row)],
        "not_claiming": [
            "official gallery inclusion",
            "seller possession",
            "physical-card authenticity",
            "condition truth",
            "market value",
        ],
    }


def build_payload() -> dict[str, Any]:
    official_release = read_json(OFFICIAL)
    official_cards = official_release["cards"]
    completion_rows = read_csv(COMPLETION)
    star_rows = read_csv(STAR_AUDIT)
    reference_rows = read_csv(REFERENCE_AUDIT)
    manifest = read_json(MANIFEST)
    manifest_hash = sha256(MANIFEST)

    completion_by_uid = {r["ROW_KEY"]: r for r in completion_rows if r.get("ROW_KEY")}
    audit_by_uid = {r["UID"]: r for r in star_rows if r.get("UID")}
    reference_audit_by_uid = {r["UID"]: r for r in reference_rows if r.get("UID")}
    observations_by_uid, unmatched_observations = observation_indexes([PROMO_OBS, PORTRAIT_OBS])

    cards = [
        card_from_official(card, completion_by_uid, audit_by_uid, reference_audit_by_uid, observations_by_uid, manifest_hash)
        for card in official_cards
    ]
    cards.extend(card_from_unmatched_observation(row, manifest_hash) for row in unmatched_observations)

    set_counts = Counter(c["set_id"] for c in cards)
    set_labels = {
        f"azuki_{slug(label)}": label for label in SET_ORDER
    }
    sets = []
    for sid, count in sorted(set_counts.items(), key=lambda kv: (SET_ORDER.get(set_labels.get(kv[0], ""), 99), set_labels.get(kv[0], kv[0]))):
        label = set_labels.get(sid, sid.replace("azuki_", "").replace("-", " ").title())
        sets.append({
            "id": sid,
            "label": label if label != "Observed" else "Observed cards",
            "code": "AZUKI",
            "date": "2026-06-23",
            "year": 2026,
            "source": "azuki_tcg_catalog",
            "source_url": "https://tcg.azuki.com/gallery",
            "count": count,
            "catalog_hash": manifest_hash,
            "policy": "display",
            "exact_rows": count if sid != "azuki_observed" else 0,
            "ref_rows": 0,
            "order": SET_ORDER.get(label, 99),
        })
    order_by_set = {s["id"]: i for i, s in enumerate(sets)}
    for i, s in enumerate(sets):
        s["order"] = i
    cards.sort(key=lambda c: (order_by_set.get(c["set_id"], 99), str(c["num"]), str(c["source_entry_id"])))

    cats = [c for c in CATEGORY_ORDER if any(card["category"] == c for card in cards)]
    elements = [e for e in ELEMENT_ORDER if any(card.get("element") == e for card in cards)]
    issue_cards = [c for c in cards if c.get("issues")]
    high_issue_cards = [c for c in issue_cards if any(i.get("severity") == "high" for i in c.get("issues", []))]

    return {
        "title": "Azuki TCG catalog",
        "profile": {
            "id": "azuki-tcg",
            "label": "Azuki TCG",
            "subtitle": "Official gallery rows, Alpha-sheet fields, and visible source scars.",
            "domain": "azuki_tcg",
            "not_claiming": manifest.get("not_claiming", []),
        },
        "ui": {
            "holo_label": "★ Alt art",
            "category_chips": cats,
            "element_chips": elements,
            "agent_placeholder": "show me star leaders with source issues…",
            "condition_options": [
                ["any", "Any condition"],
                ["nm", "Near Mint or better"],
                ["lp", "Light Play or better"],
                ["played", "Played is fine"],
            ],
        },
        "sets": sets,
        "summary": {
            "sets": len(sets),
            "cards": len(cards),
            "with_image": sum(1 for c in cards if c.get("image")),
            "exact_source": sum(1 for c in cards if c.get("image_status") == "exact_source"),
            "no_reference_photo": sum(1 for c in cards if c.get("image_status") == "no_reference_photo"),
            "provider_path": 0,
            "no_rarity_reference": 0,
            "missing_name_ja": 0,
            "star_alt": sum(1 for c in cards if c.get("star_alt")),
            "issue_cards": len(issue_cards),
            "high_issue_cards": len(high_issue_cards),
            "observation_only": sum(1 for c in cards if c.get("set_id") == "azuki_observed"),
        },
        "manifest_total_rows": manifest.get("counts", {}).get("official_gallery", {}).get("gallery_entries"),
        "catalog_hash": manifest_hash,
        "source_artifacts": {
            "official_gallery": {"path": str(OFFICIAL.relative_to(ROOT)), "sha256": sha256(OFFICIAL)},
            "completion_csv": {"path": str(COMPLETION.relative_to(ROOT)), "sha256": sha256(COMPLETION)},
            "star_audit": {"path": str(STAR_AUDIT.relative_to(ROOT)), "sha256": sha256(STAR_AUDIT)},
            "reference_image_audit": {"path": str(REFERENCE_AUDIT.relative_to(ROOT)), "sha256": sha256(REFERENCE_AUDIT)},
            "manifest": {"path": str(MANIFEST.relative_to(ROOT)), "sha256": manifest_hash},
        },
        "cards": cards,
    }


def write_payload(payload: dict[str, Any], *, publish_web: bool) -> Path:
    UI_DIR.mkdir(parents=True, exist_ok=True)
    out = UI_DIR / "azuki-catalog-sample.json"
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    if publish_web:
        WEB_CATALOG_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy2(out, WEB_CATALOG_DIR / "azuki-tcg.json")
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Export Azuki TCG catalog for the Cairn binder UI.")
    parser.add_argument("--check", action="store_true", help="verify generated payload matches committed outputs")
    parser.add_argument("--no-web", action="store_true", help="only write data/azuki-tcg/ui output")
    args = parser.parse_args()

    payload = build_payload()
    rendered = json.dumps(payload, indent=2, ensure_ascii=False)
    expected = UI_DIR / "azuki-catalog-sample.json"
    web_expected = WEB_CATALOG_DIR / "azuki-tcg.json"

    if args.check:
        mismatches = []
        if not expected.exists() or expected.read_text(encoding="utf-8") != rendered:
            mismatches.append(str(expected.relative_to(ROOT)))
        if not args.no_web and (not web_expected.exists() or web_expected.read_text(encoding="utf-8") != rendered):
            mismatches.append(str(web_expected.relative_to(ROOT)))
        if mismatches:
            print("Azuki UI export is stale:", ", ".join(mismatches))
            return 1
        print(
            f"Azuki UI export OK: {payload['summary']['cards']} cards · "
            f"{payload['summary']['star_alt']} ★ · {payload['summary']['issue_cards']} issue-marked"
        )
        return 0

    out = write_payload(payload, publish_web=not args.no_web)
    print(f"wrote {out.relative_to(ROOT)}")
    if not args.no_web:
        print(f"wrote {(WEB_CATALOG_DIR / 'azuki-tcg.json').relative_to(ROOT)}")
    print(
        f"  {payload['summary']['sets']} sets · {payload['summary']['cards']} cards · "
        f"{payload['summary']['with_image']} with image"
    )
    print(
        f"  {payload['summary']['star_alt']} ★/alt · "
        f"{payload['summary']['issue_cards']} issue-marked · "
        f"{payload['summary']['high_issue_cards']} high"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
