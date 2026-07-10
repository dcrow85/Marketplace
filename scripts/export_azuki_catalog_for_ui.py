#!/usr/bin/env python3
"""Export the Azuki TCG catalog into the binder site's UI payload.

This is a view artifact, not a new authority layer. It preserves official
gallery rows and Alpha Master Sheet rows as distinct release objects, overlays
completion fields only with source scars, and refuses to display a reference
photo unless the row can honestly cite that exact row image.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
AZUKI = ROOT / "data" / "azuki-tcg"
UI_DIR = AZUKI / "ui"
WEB_CATALOG_DIR = ROOT / "web" / "public" / "catalogs"
WEB_PUBLIC_DIR = ROOT / "web" / "public"

OFFICIAL = AZUKI / "releases" / "azuki_tcg_official_gallery.json"
ALPHA = AZUKI / "releases" / "azuki_tcg_alpha_master_sheet.json"
COMPLETION = AZUKI / "spreadsheets" / "azuki_tcg_alpha_fields_completion.csv"
STAR_AUDIT = AZUKI / "audits" / "azuki_tcg_star_alt_art_audit_2026_06_24.csv"
REFERENCE_AUDIT = AZUKI / "audits" / "azuki_tcg_reference_image_audit_2026_06_25.csv"
PROMO_OBS = AZUKI / "observations" / "azuki_tcg_user_photo_promo_observations_2026_06_24.csv"
PORTRAIT_OBS = AZUKI / "observations" / "azuki_tcg_user_image_portrait_alt_observations_2026_06_24.csv"
MANIFEST = AZUKI / "manifest.json"
WORLD_METADATA = AZUKI / "lore" / "azuki_world_metadata.json"
ALPHA_IMAGE_MANIFEST = AZUKI / "source-snapshots" / "alpha_master_sheet_image_manifest_2026-06-26.json"
ALPHA_ASSET_DIR = WEB_PUBLIC_DIR / "assets" / "alpha"
ALPHA_ASSET_WEB_PREFIX = "assets/alpha"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
XLSX_MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
XLSX_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
XLSX_DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
XLSX_BLIP_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
XLSX_NS = {
    "main": XLSX_MAIN_NS,
    "r": XLSX_REL_NS,
    "xdr": XLSX_DRAWING_NS,
    "a": XLSX_BLIP_NS,
}

RELEASE_FAMILY_LABEL = {
    "alpha": "Alpha",
    "gates_awakened": "Gates Awakened",
    "observed": "Observed",
}
RELEASE_FAMILY_ORDER = {
    "alpha": 0,
    "gates_awakened": 1,
    "observed": 2,
}
PRODUCT_CHANNEL_LABEL = {
    "booster": "Booster",
    "starter_deck_1": "Starter Deck 1",
    "starter_deck_2": "Starter Deck 2",
    "starter_deck_3": "Starter Deck 3",
    "starter_deck_4": "Starter Deck 4",
    "promo": "Promo",
    "token": "IKZ / Token",
    "observed": "Observed cards",
}
PRODUCT_CHANNEL_ORDER = {
    "booster": 0,
    "starter_deck_1": 10,
    "starter_deck_2": 11,
    "starter_deck_3": 12,
    "starter_deck_4": 13,
    "promo": 20,
    "token": 30,
    "observed": 40,
}

CATEGORY_ORDER = ["Leader", "Gate", "Entity", "Weapon", "Spell", "IKZ"]
ELEMENT_ORDER = ["Neutral", "Water", "Lightning", "Earth", "Fire"]

OBSERVED_NAME_READ_ALIASES = {
    "S1-AZK01-129_Silk-Tongue-Velya_E_UC_die": [
        {
            "name": "Silk Tongue Veyle",
            "source": "2026-07-06 scanner observed read; official gallery name is Silk Tongue Velya.",
        },
    ],
    "S1-AZK01-124_Gate-of-Devotion-Gate_G_G_die": [
        {
            "name": "Gates of Devotion",
            "source": "2026-07-06 scanner observed read; official gallery name is Gate of Devotion.",
        },
    ],
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def world_metadata_view(
    card: dict[str, Any],
    identity_by_card_id: dict[str, dict[str, Any]],
    variant_by_uid: dict[str, dict[str, Any]],
    metadata_hash: str,
) -> dict[str, Any]:
    identity = identity_by_card_id.get(card.get("card_id") or card.get("num") or "", {})
    variant = variant_by_uid.get(card["uid"], {})
    return {
        "lore_summary": identity.get("lore_summary") or variant.get("visual_note") or "",
        "elemental_domain": identity.get("elemental_domain") or card.get("element") or "",
        "official_subtypes": identity.get("official_subtypes") or card.get("subtypes") or [],
        "subtype_semantics_boundary": identity.get("subtype_semantics_boundary") or "",
        "subject_kind": identity.get("subject_kind") or "catalog-subject",
        "setting_cue": variant.get("setting_cue") or identity.get("setting_cue") or {},
        "motifs": variant.get("motifs") or identity.get("motifs") or [],
        "character_thread": identity.get("character_thread"),
        "connections": identity.get("connections") or [],
        "source_identity_refs": identity.get("source_identity_refs") or [],
        "variant_role": variant.get("variant_role") or "",
        "visual_note": variant.get("visual_note") or "",
        "visual_note_authority": variant.get("visual_note_authority") or "",
        "visual_review": variant.get("visual_review"),
        "search_terms": identity.get("search_terms") or [],
        "authority_boundary": "Official site/card facts, declared catalog inference, and card-art observations remain separately labeled.",
        "metadata_hash": metadata_hash,
    }


def column_number(ref: str) -> int:
    letters = "".join(ch for ch in ref if ch.isalpha())
    number = 0
    for ch in letters:
        number = number * 26 + (ord(ch.upper()) - 64)
    return number - 1


def extract_alpha_master_sheet_images(workbook: Path, out_dir: Path = ALPHA_ASSET_DIR) -> int:
    """Extract embedded IMG-column workbook media into web/public assets."""
    out_dir.mkdir(parents=True, exist_ok=True)
    total = 0
    with zipfile.ZipFile(workbook) as zf:
        names = set(zf.namelist())
        shared_strings = []
        if "xl/sharedStrings.xml" in names:
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            shared_strings = [
                "".join((text.text or "") for text in si.iter(f"{{{XLSX_MAIN_NS}}}t"))
                for si in root.findall("main:si", XLSX_NS)
            ]

        def cell_value(cell: ET.Element) -> str:
            value = cell.find("main:v", XLSX_NS)
            if value is None:
                return ""
            if cell.get("t") == "s" and value.text:
                return shared_strings[int(value.text)]
            return value.text or ""

        sheet_paths = sorted(
            p for p in names
            if p.startswith("xl/worksheets/sheet") and p.endswith(".xml")
        )
        for sheet_path in sheet_paths:
            worksheet = ET.fromstring(zf.read(sheet_path))
            sheet_name = Path(sheet_path).name
            row_id_by_index: dict[int, str] = {}
            image_column = None
            for row in worksheet.findall("main:sheetData/main:row", XLSX_NS):
                row_index = int(row.get("r", "0")) - 1
                for cell in row.findall("main:c", XLSX_NS):
                    ref = cell.get("r")
                    if not ref:
                        continue
                    col_index = column_number(ref)
                    value = cell_value(cell)
                    if col_index == 0:
                        row_id_by_index[row_index] = value
                    if row_index == 0 and value.strip().upper() == "IMG":
                        image_column = col_index

            drawing_ref = worksheet.find("main:drawing", XLSX_NS)
            rel_path = f"xl/worksheets/_rels/{sheet_name}.rels"
            if drawing_ref is None or image_column is None or rel_path not in names:
                continue
            drawing_rel_id = drawing_ref.get(f"{{{XLSX_REL_NS}}}id")
            drawing_target = None
            for rel in ET.fromstring(zf.read(rel_path)):
                if rel.get("Id") == drawing_rel_id:
                    drawing_target = rel.get("Target")
                    break
            if not drawing_target:
                continue

            drawing_name = Path(drawing_target).name
            drawing_path = f"xl/drawings/{drawing_name}"
            drawing_rels_path = f"xl/drawings/_rels/{drawing_name}.rels"
            if drawing_path not in names or drawing_rels_path not in names:
                continue
            drawing = ET.fromstring(zf.read(drawing_path))
            embedded = {
                rel.get("Id"): rel.get("Target")
                for rel in ET.fromstring(zf.read(drawing_rels_path))
            }

            for anchor in list(drawing):
                from_el = anchor.find("xdr:from", XLSX_NS)
                blip = anchor.find(".//a:blip", XLSX_NS)
                if from_el is None or blip is None:
                    continue
                col_el = from_el.find("xdr:col", XLSX_NS)
                row_el = from_el.find("xdr:row", XLSX_NS)
                if col_el is None or row_el is None or int(col_el.text or "-1") != image_column:
                    continue
                card_id = (row_id_by_index.get(int(row_el.text or "-1")) or "").strip()
                if not card_id or card_id.upper() == "ID":
                    continue
                embed_id = blip.get(f"{{{XLSX_REL_NS}}}embed")
                media_target = embedded.get(embed_id or "")
                if not media_target:
                    continue
                media_path = f"xl/media/{Path(media_target).name}"
                if media_path not in names:
                    continue
                ext = Path(media_path).suffix or ".jpg"
                (out_dir / f"{card_id}{ext}").write_bytes(zf.read(media_path))
                total += 1
    return total


def alpha_manifest_index(path: Path = ALPHA_IMAGE_MANIFEST) -> dict[str, str]:
    if not path.exists():
        return {}
    payload = read_json(path)
    return {
        row["card_id"]: row["image"]
        for row in payload.get("images", [])
        if row.get("card_id") and row.get("image")
    }


def alpha_asset_index(asset_dir: Path = ALPHA_ASSET_DIR) -> dict[str, str]:
    if not asset_dir.exists():
        return {}
    images: dict[str, str] = {}
    for path in sorted(asset_dir.iterdir()):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            images[path.stem] = f"{ALPHA_ASSET_WEB_PREFIX}/{path.name}"
    return images


def alpha_master_sheet_image_index() -> dict[str, str]:
    images = alpha_manifest_index()
    images.update(alpha_asset_index())
    return images


def write_alpha_image_manifest(images: dict[str, str], path: Path = ALPHA_IMAGE_MANIFEST) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema": "azuki_tcg_alpha_master_sheet_image_manifest_v0.1",
        "authority_label": "linked_alpha_master_sheet_reference_image",
        "asset_policy": "raw image files are gitignored build artifacts; regenerate from the embedded-image workbook export",
        "not_claiming": [
            "seller possession",
            "physical-card authenticity",
            "condition truth",
            "per-physical-card evidence",
        ],
        "images": [
            {"card_id": card_id, "image": image}
            for card_id, image in sorted(images.items())
        ],
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


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


def official_release_family(card: dict[str, Any]) -> str:
    source_entry_id = card.get("source_entry_id") or ""
    return "gates_awakened" if source_entry_id.startswith("S1-") else "alpha"


def product_channel_from_sets(sets: list[str], card_id: str | None = None) -> str:
    card_id = card_id or ""
    if card_id.startswith("IKZ") or (len(sets) > 1 and "Booster" in sets):
        return "token"
    if "Promo" in sets or card_id.startswith("AZP"):
        return "promo"
    for set_name in sets:
        if set_name.startswith("Starter Deck "):
            number = set_name.rsplit(" ", 1)[-1]
            return f"starter_deck_{number}"
    return "booster"


def product_channel_from_alpha_card_id(card_id: str) -> str:
    if card_id.startswith("AZK01-"):
        return "booster"
    if card_id.startswith("STT01-"):
        return "starter_deck_1"
    if card_id.startswith("STT02-"):
        return "starter_deck_2"
    if card_id.startswith("AZP-"):
        return "promo"
    if card_id.startswith("IKZ-"):
        return "token"
    return "booster"


def family_channel_set_id(release_family: str, product_channel: str) -> str:
    if release_family == "observed":
        return "azuki_observed"
    return f"azuki_{release_family}_{product_channel}"


def set_label(release_family: str, product_channel: str) -> str:
    if release_family == "observed":
        return "Observed cards"
    return f"{RELEASE_FAMILY_LABEL[release_family]} — {PRODUCT_CHANNEL_LABEL[product_channel]}"


def source_set_label(release_family: str, product_channel: str) -> str:
    return set_label(release_family, product_channel)


def sort_key_for_set_id(set_id: str) -> tuple[int, int, str]:
    if set_id == "azuki_observed":
        return (RELEASE_FAMILY_ORDER["observed"], PRODUCT_CHANNEL_ORDER["observed"], set_id)
    for family in ("alpha", "gates_awakened"):
        prefix = f"azuki_{family}_"
        if set_id.startswith(prefix):
            channel = set_id.removeprefix(prefix)
            return (RELEASE_FAMILY_ORDER[family], PRODUCT_CHANNEL_ORDER.get(channel, 99), set_id)
    return (99, 99, set_id)


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
    standalone: list[dict[str, str]] = []
    for path in paths:
        if not path.exists():
            continue
        for row in read_csv(path):
            matches = split_semis(row.get("MATCHED_GALLERY_UIDS"))
            if matches:
                for uid in matches:
                    by_uid[uid].append(row)
            display_as_distinct = (row.get("DISPLAY_AS_DISTINCT_ROW") or "").strip().lower() in {"1", "true", "yes"}
            if not matches or display_as_distinct:
                standalone.append(row)
    return by_uid, standalone


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
        "source_image_public_path": row.get("SOURCE_IMAGE_PUBLIC_PATH") or "",
        "display_as_distinct_row": (row.get("DISPLAY_AS_DISTINCT_ROW") or "").strip().lower() in {"1", "true", "yes"},
        "observed_variant_kind": row.get("OBSERVED_VARIANT_KIND") or "",
        "observed_foil_treatment": (row.get("OBSERVED_FOIL_TREATMENT") or "").strip().lower() in {"1", "true", "yes"},
        "user_asserted_authenticity": row.get("USER_ASSERTED_AUTHENTICITY") or "",
        "authenticity_authority": row.get("AUTHENTICITY_AUTHORITY") or "",
        "observed_event": row.get("OBSERVED_EVENT") or "",
        "event_distribution": row.get("EVENT_DISTRIBUTION") or "",
        "event_authority": row.get("EVENT_AUTHORITY") or "",
        "official_event_source_url": row.get("OFFICIAL_EVENT_SOURCE_URL") or "",
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
    release_family = official_release_family(card)
    product_channel = product_channel_from_sets(sets, card.get("card_id") or comp.get("ID") or "")
    set_name = source_set_label(release_family, product_channel)
    row_id = uid
    name = card.get("name") or comp.get("NAME") or row_id
    entry_id = card.get("source_entry_id") or comp.get("SOURCE_ENTRY_ID") or ""
    name_alias_notes = OBSERVED_NAME_READ_ALIASES.get(entry_id, [])
    name_aliases = [alias["name"] for alias in name_alias_notes]
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
        "set_id": family_channel_set_id(release_family, product_channel),
        "release_family": release_family,
        "release_family_label": RELEASE_FAMILY_LABEL[release_family],
        "product_channel": product_channel,
        "product_channel_label": PRODUCT_CHANNEL_LABEL[product_channel],
        "source_set_label": set_name,
        "num": card.get("card_id") or comp.get("ID") or "",
        "name_ja": "",
        "romaji": "",
        "name_en": name,
        "name_aliases": name_aliases,
        "name_alias_notes": name_alias_notes,
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
        "alpha_crosswalk_scope": (
            "card_id_only_not_release_specific"
            if release_family == "gates_awakened" and "linked_alpha_master_sheet" in (comp.get("FIELD_SOURCE") or "")
            else ""
        ),
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


def alpha_ref_ip(row: dict[str, Any]) -> list[str]:
    out = []
    for ref in row.get("reference_ips") or []:
        ip = ref.get("ip") or ""
        rid = ref.get("id") or ""
        if ip and rid:
            out.append(f"{ip} #{rid}")
        elif ip:
            out.append(ip)
        elif rid:
            out.append(f"#{rid}")
    return out


def card_from_alpha_master(row: dict[str, Any], manifest_hash: str, alpha_images: dict[str, str]) -> dict[str, Any]:
    card_id = row.get("card_id") or ""
    rarity = row.get("rarity") or ""
    element = row.get("element") or ""
    subtypes = [s for s in row.get("subtypes", []) if s]
    effects = [
        {"label": fx.get("label") or "", "text": fx.get("text") or ""}
        for fx in row.get("effects", [])
    ]
    product_channel = product_channel_from_alpha_card_id(card_id)
    sets = [PRODUCT_CHANNEL_LABEL[product_channel]]
    if product_channel == "token":
        sets = ["Alpha IKZ / Token"]
    release_family = "alpha"
    not_claiming = list(row.get("not_claiming") or [])
    not_claiming.extend([
        "Gates Awakened row identity",
        "official gallery reference image",
        "image equivalence through shared card ID",
    ])
    alpha_image = alpha_images.get(card_id, "")
    if alpha_image:
        image = alpha_image
        image_status = "alpha_master_sheet"
        display_allowed = True
        provenance = (
            "Alpha Master Sheet embedded reference photo, extracted from the source workbook; "
            "reference-grade project image, not seller evidence or physical-card proof."
        )
        reference_image_policy = "display_alpha_master_sheet_reference_image"
        suppressed_fields: list[str] = []
        review_status = "alpha_master_sheet_row_with_reference_photo"
    else:
        image = ""
        image_status = "no_reference_photo"
        display_allowed = False
        provenance = (
            "Alpha Master Sheet row. The source sheet carries card fields but no exact row image; "
            "shared card ID crosswalks to official gallery rows are not reference-photo equivalence."
        )
        reference_image_policy = "no_source_image_in_alpha_master_sheet"
        suppressed_fields = ["image"]
        review_status = "alpha_master_sheet_row_no_reference_photo"
    return {
        "uid": row["uid"],
        "catalog_profile": "azuki-tcg",
        "set_id": family_channel_set_id(release_family, product_channel),
        "release_family": release_family,
        "release_family_label": RELEASE_FAMILY_LABEL[release_family],
        "product_channel": product_channel,
        "product_channel_label": PRODUCT_CHANNEL_LABEL[product_channel],
        "source_set_label": source_set_label(release_family, product_channel),
        "num": card_id,
        "name_ja": "",
        "romaji": "",
        "name_en": row.get("name") or card_id,
        "name_is_en": False,
        "name_ja_status": "english_print_name",
        "category": row.get("category") or "",
        "element": element,
        "types": [v for v in [element, *subtypes] if v],
        "subtypes": subtypes,
        "holo": has_star(rarity),
        "star_alt": has_star(rarity),
        "rarity": rarity,
        "band_rank": band_rank({"rarity": rarity}, None),
        "image": image,
        "image_status": image_status,
        "display_allowed": display_allowed,
        "provenance": provenance,
        "reference_image_policy": reference_image_policy,
        "stamp_field_policy": "display_alpha_master_sheet_stamp_if_present",
        "suppressed_fields": suppressed_fields,
        "source_authority": row.get("authority_label") or "linked_alpha_master_sheet_fact",
        "field_source": "linked_alpha_master_sheet_fact",
        "alpha_crosswalk_scope": "card_id_only_not_release_specific",
        "missing_alpha_fields": [],
        "review_status": review_status,
        "promo": {"sets": sets} if product_channel in ("promo", "token") else None,
        "owned": False,
        "cond": None,
        "custody": None,
        "gap": None,
        "stance": None,
        "want_cond": None,
        "want_max": None,
        "catalog_hash": manifest_hash,
        "row_id": row["uid"],
        "card_id": card_id,
        "source_entry_id": row["uid"],
        "ikz_cost": row.get("ikz_cost"),
        "gate_power": row.get("gate_power"),
        "attack": row.get("attack"),
        "health": row.get("health"),
        "plus_attack": row.get("plus_attack") or "",
        "ref_ip": alpha_ref_ip(row),
        "illustrator": row.get("illustrator") or "",
        "effects": effects,
        "card_text": "",
        "flavor_text": row.get("flavor_text") or "",
        "definition_text": row.get("definition_text") or "",
        "ruling_text": row.get("ruling_text") or "",
        "stamp": row.get("stamp") or "",
        "variant_group": row.get("gallery_crosswalk") or {},
        "issues": [],
        "observations": [],
        "not_claiming": sorted(set(not_claiming)),
    }


def card_from_unmatched_observation(row: dict[str, str], manifest_hash: str) -> dict[str, Any]:
    rarity = row.get("RARITY") or ""
    element = row.get("ELEMENT") or ""
    subtypes = [row.get("SUBTYPE_1"), row.get("SUBTYPE_2"), row.get("SUBTYPE_3")]
    subtypes = [s for s in subtypes if s]
    uid = f"azuki_tcg_observation:{row.get('OBSERVATION_ID')}"
    image = row.get("SOURCE_IMAGE_PUBLIC_PATH") or ""
    has_public_image = bool(image) and (row.get("SOURCE_IMAGE_STORED") or "").strip().lower() == "true"
    matched_gallery_uids = split_semis(row.get("MATCHED_GALLERY_UIDS"))
    user_asserted_authenticity = row.get("USER_ASSERTED_AUTHENTICITY") or ""
    authenticity_authority = row.get("AUTHENTICITY_AUTHORITY") or ""
    observed_foil = (row.get("OBSERVED_FOIL_TREATMENT") or "").strip().lower() in {"1", "true", "yes"}
    event_name = row.get("OBSERVED_EVENT") or ""
    observed_variant_kind = row.get("OBSERVED_VARIANT_KIND") or ""
    issue_code = (
        "observed_variant_not_in_current_official_gallery_snapshot"
        if matched_gallery_uids
        else "not_in_current_official_gallery_snapshot"
    )
    return {
        "uid": uid,
        "catalog_profile": "azuki-tcg",
        "set_id": "azuki_observed",
        "release_family": "observed",
        "release_family_label": RELEASE_FAMILY_LABEL["observed"],
        "product_channel": "observed",
        "product_channel_label": PRODUCT_CHANNEL_LABEL["observed"],
        "source_set_label": "Observed cards",
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
        "holo": has_star(rarity) or observed_foil,
        "star_alt": has_star(rarity) or observed_foil,
        "rarity": rarity,
        "band_rank": 3 if has_star(rarity) or observed_foil else 0,
        "image": image if has_public_image else "",
        "image_status": "user_photo_observation" if has_public_image else "user_observation_no_public_image",
        "display_allowed": has_public_image,
        "provenance": (
            "User-supplied photo retained as catalogue reference evidence; not official gallery art or proof of physical authenticity, condition, event provenance, recipient, or current possession."
            if has_public_image
            else "User photo observation; source image hash recorded, image not committed."
        ),
        "reference_image_policy": "display_user_observation_reference_image" if has_public_image else "no_public_observation_image",
        "stamp_field_policy": "display_observed_stamp",
        "suppressed_fields": [] if has_public_image else ["image"],
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
        "variant_group": {
            "variant_kind": observed_variant_kind or ("user_observed_tournament_winner_treatment" if "winner" in (row.get("OBSERVED_STAMP") or "").lower() else "user_observed_variant"),
            "matched_gallery_uids": matched_gallery_uids,
            "official_gallery_enumeration": False,
        },
        "issues": [{
            "source": "user_observation_layer",
            "severity": "medium",
            "status": "observation_only",
            "codes": [issue_code],
            "recommended_action": "Review against future official gallery snapshots before promoting.",
            "notes": row.get("OBSERVATION_NOTE") or "",
        }],
        "observations": [observation_note(row)],
        "authenticity_assertion": ({
            "status": user_asserted_authenticity,
            "authority_label": authenticity_authority or "user_assertion",
            "catalog_disposition": "recorded_not_independently_verified",
        } if user_asserted_authenticity else None),
        "event_assertion": ({
            "event": event_name,
            "distribution": row.get("EVENT_DISTRIBUTION") or "",
            "authority_label": row.get("EVENT_AUTHORITY") or "user_assertion",
            "official_context_url": row.get("OFFICIAL_EVENT_SOURCE_URL") or "",
            "catalog_disposition": "event_association_recorded_exact_award_activity_unresolved",
        } if event_name else None),
        "not_claiming": [
            "official gallery inclusion",
            "official enumeration of this treatment as a distinct variant",
            "seller possession",
            "independent verification of physical-card authenticity beyond any recorded user assertion",
            "condition truth",
            "market value",
            "tournament recipient or award path beyond any recorded event assertion",
            "exact event activity or award path beyond the recorded event assertion and official context",
        ],
    }


def official_alpha_exact_alpha_sheet_card_ids(official_cards: list[dict[str, Any]]) -> set[str]:
    card_ids: set[str] = set()
    for card in official_cards:
        if official_release_family(card) != "alpha":
            continue
        rarity = card.get("rarity") or ""
        # Star/variant official rows are separate objects. They do not satisfy the
        # base Alpha Master Sheet row even when the card ID stem is shared.
        if has_star(rarity):
            continue
        card_ids.add(card.get("card_id") or "")
    return card_ids


def build_payload() -> dict[str, Any]:
    official_release = read_json(OFFICIAL)
    official_cards = official_release["cards"]
    alpha_release = read_json(ALPHA)
    alpha_cards = alpha_release["cards"]
    completion_rows = read_csv(COMPLETION)
    star_rows = read_csv(STAR_AUDIT)
    reference_rows = read_csv(REFERENCE_AUDIT)
    manifest = read_json(MANIFEST)
    manifest_hash = sha256(MANIFEST)
    world_metadata = read_json(WORLD_METADATA)
    world_metadata_hash = sha256(WORLD_METADATA)
    world_identity_by_card_id = {card["card_id"]: card for card in world_metadata["cards"]}
    world_variant_by_uid = {card["uid"]: card for card in world_metadata["variants"]}

    completion_by_uid = {r["ROW_KEY"]: r for r in completion_rows if r.get("ROW_KEY")}
    audit_by_uid = {r["UID"]: r for r in star_rows if r.get("UID")}
    reference_audit_by_uid = {r["UID"]: r for r in reference_rows if r.get("UID")}
    observations_by_uid, unmatched_observations = observation_indexes([PROMO_OBS, PORTRAIT_OBS])
    alpha_images = alpha_master_sheet_image_index()

    cards = [
        card_from_official(card, completion_by_uid, audit_by_uid, reference_audit_by_uid, observations_by_uid, manifest_hash)
        for card in official_cards
    ]
    exact_alpha_card_ids = official_alpha_exact_alpha_sheet_card_ids(official_cards)
    cards.extend(
        card_from_alpha_master(row, manifest_hash, alpha_images)
        for row in alpha_cards
        if (row.get("card_id") or "") not in exact_alpha_card_ids
    )
    cards.extend(card_from_unmatched_observation(row, manifest_hash) for row in unmatched_observations)

    for card in cards:
        card["azuki_world"] = world_metadata_view(
            card,
            world_identity_by_card_id,
            world_variant_by_uid,
            world_metadata_hash,
        )

    set_counts = Counter(c["set_id"] for c in cards)
    sets = []
    for sid, count in sorted(set_counts.items(), key=lambda kv: sort_key_for_set_id(kv[0])):
        sample = next((c for c in cards if c["set_id"] == sid), None) or {}
        label = sample.get("source_set_label") or sid.replace("azuki_", "").replace("_", " ").title()
        release_family = sample.get("release_family") or "observed"
        product_channel = sample.get("product_channel") or "observed"
        sets.append({
            "id": sid,
            "label": label,
            "code": "AZUKI",
            "date": "2026-06-23",
            "year": 2026,
            "release_family": release_family,
            "release_family_label": sample.get("release_family_label") or RELEASE_FAMILY_LABEL.get(release_family, release_family),
            "product_channel": product_channel,
            "product_channel_label": sample.get("product_channel_label") or PRODUCT_CHANNEL_LABEL.get(product_channel, product_channel),
            "source": "azuki_tcg_catalog",
            "source_url": "https://tcg.azuki.com/gallery",
            "count": count,
            "catalog_hash": manifest_hash,
            "policy": "display",
            "exact_rows": sum(1 for c in cards if c["set_id"] == sid and c.get("image_status") == "exact_source"),
            "ref_rows": 0,
            "order": 0,
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
            "subtitle": "Alpha rows, Gates Awakened rows, observations, and visible source scars.",
            "domain": "azuki_tcg",
            "azuki_world_context": world_metadata["world_guide"]["agent_context"],
            "not_claiming": manifest.get("not_claiming", []),
        },
        "azuki_world": {
            "schema": world_metadata["schema"],
            "metadata_hash": world_metadata_hash,
            "authority_legend": world_metadata["authority_legend"],
            "world_guide": world_metadata["world_guide"],
            "counts": world_metadata["counts"],
            "not_claiming": world_metadata["not_claiming"],
        },
        "ui": {
            "holo_label": "★ Alt art",
            "family_chips": [
                {"label": "Alpha", "value": "alpha"},
                {"label": "Gates Awakened", "value": "gates_awakened"},
                {"label": "Observed", "value": "observed"},
            ],
            "product_channel_chips": [
                {"label": "Booster", "value": "booster"},
                {"label": "Starter", "value": "starter"},
                {"label": "Promo", "value": "promo"},
                {"label": "Token", "value": "token"},
            ],
            "category_chips": cats,
            "element_chips": elements,
            "agent_placeholder": "show me Watercrafting cards from the Garden…",
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
            "alpha_master_sheet_images": sum(1 for c in cards if c.get("image_status") == "alpha_master_sheet"),
            "provider_path": 0,
            "no_rarity_reference": 0,
            "image_statuses": dict(sorted(Counter(c.get("image_status") or "unknown" for c in cards).items())),
            "missing_name_ja": 0,
            "star_alt": sum(1 for c in cards if c.get("star_alt")),
            "issue_cards": len(issue_cards),
            "high_issue_cards": len(high_issue_cards),
            "observation_only": sum(1 for c in cards if c.get("set_id") == "azuki_observed"),
            "release_families": dict(sorted(Counter(c.get("release_family") or "unknown" for c in cards).items())),
            "product_channels": dict(sorted(Counter(c.get("product_channel") or "unknown" for c in cards).items())),
            "alpha_master_sheet_rows_added": sum(1 for c in cards if str(c.get("uid", "")).startswith("azuki_tcg_alpha_master_sheet:")),
            "gates_awakened_rows": sum(1 for c in cards if c.get("release_family") == "gates_awakened"),
            "world_enriched_rows": sum(1 for c in cards if c.get("azuki_world")),
            "world_image_reviewed_rows": sum(1 for c in cards if c.get("azuki_world", {}).get("visual_review")),
            "world_character_threads": world_metadata["counts"]["character_threads"],
            "world_claims": world_metadata["counts"]["world_claims"],
        },
        "manifest_total_rows": manifest.get("counts", {}).get("official_gallery", {}).get("gallery_entries"),
        "catalog_hash": manifest_hash,
        "source_artifacts": {
            "official_gallery": {"path": str(OFFICIAL.relative_to(ROOT)), "sha256": sha256(OFFICIAL)},
            "alpha_master_sheet": {"path": str(ALPHA.relative_to(ROOT)), "sha256": sha256(ALPHA)},
            "completion_csv": {"path": str(COMPLETION.relative_to(ROOT)), "sha256": sha256(COMPLETION)},
            "star_audit": {"path": str(STAR_AUDIT.relative_to(ROOT)), "sha256": sha256(STAR_AUDIT)},
            "reference_image_audit": {"path": str(REFERENCE_AUDIT.relative_to(ROOT)), "sha256": sha256(REFERENCE_AUDIT)},
            "world_metadata": {
                "path": str(WORLD_METADATA.relative_to(ROOT)),
                "sha256": world_metadata_hash,
                "card_identities": world_metadata["counts"]["official_card_ids_enriched"],
                "ui_variants": world_metadata["counts"]["ui_variants_enriched"],
                "reviewed_images": world_metadata["counts"]["image_rows_reviewed"],
            },
            "alpha_master_sheet_image_manifest": (
                {
                    "path": str(ALPHA_IMAGE_MANIFEST.relative_to(ROOT)),
                    "sha256": sha256(ALPHA_IMAGE_MANIFEST),
                    "count": len(alpha_images),
                }
                if ALPHA_IMAGE_MANIFEST.exists()
                else {"path": str(ALPHA_IMAGE_MANIFEST.relative_to(ROOT)), "sha256": "", "count": len(alpha_images)}
            ),
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
    parser.add_argument(
        "--alpha-master-sheet-xlsx",
        type=Path,
        help="extract embedded Alpha Master Sheet images from this workbook before exporting",
    )
    parser.add_argument(
        "--write-alpha-image-manifest",
        action="store_true",
        help="write the lightweight Alpha image manifest from web/public/assets/alpha",
    )
    args = parser.parse_args()

    if args.alpha_master_sheet_xlsx:
        workbook = args.alpha_master_sheet_xlsx.expanduser()
        if not workbook.exists():
            parser.error(f"Alpha Master Sheet workbook not found: {workbook}")
        total = extract_alpha_master_sheet_images(workbook)
        print(f"extracted {total} Alpha Master Sheet images to {ALPHA_ASSET_DIR.relative_to(ROOT)}")

    if args.write_alpha_image_manifest:
        manifest_path = write_alpha_image_manifest(alpha_asset_index())
        print(f"wrote {manifest_path.relative_to(ROOT)}")

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
            f"{payload['summary']['star_alt']} ★ · {payload['summary']['issue_cards']} issue-marked · "
            f"{payload['summary']['alpha_master_sheet_images']} Alpha sheet images"
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
        f"{payload['summary']['high_issue_cards']} high · "
        f"{payload['summary']['alpha_master_sheet_images']} Alpha sheet images"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
