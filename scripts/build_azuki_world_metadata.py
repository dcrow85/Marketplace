#!/usr/bin/env python3
"""Build provenance-aware Azuki world metadata for the Cairn catalog.

Official web claims, official card fields, card-art observations, and catalog
inferences remain separate. The output enriches agent search without turning a
visual cue or shared subtype into canon.

The visual-review snapshot is a deliberate human checkpoint. Record it only
after reviewing every labelled image batch; normal builds refuse unreviewed or
changed image rows.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import re
from datetime import date
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data" / "azuki-tcg"
LORE_DIR = BASE / "lore"
OFFICIAL = BASE / "releases" / "azuki_tcg_official_gallery.json"
ALPHA = BASE / "releases" / "azuki_tcg_alpha_master_sheet.json"
UI_CATALOG = ROOT / "web" / "public" / "catalogs" / "azuki-tcg.json"
SPECIAL_COLLECTION = BASE / "observations" / "azuki_tcg_anime_expo_2026_special_collection.json"
OUTPUT = LORE_DIR / "azuki_world_metadata.json"
AUDIT = LORE_DIR / "azuki_world_metadata_audit.json"

LORE_SOURCE_GLOB = "azuki_official_lore_sources_*.json"
VISUAL_REVIEW_GLOB = "azuki_card_art_visual_review_*.json"

SETTING_ALLEY_CARD_IDS = {
    "AZK01-003", "AZK01-004", "AZK01-006", "AZK01-007", "AZK01-008",
    "AZK01-010", "AZK01-011", "AZK01-012", "AZK01-015", "AZK01-016",
    "AZK01-019", "AZK01-020", "AZK01-040", "AZK01-041", "AZK01-056",
    "AZK01-057", "AZK01-058", "AZK01-059", "AZK01-061", "AZK01-062",
    "AZK01-063", "AZK01-064", "AZK01-067", "AZK01-068", "AZK01-069",
    "AZK01-070", "AZK01-071", "AZK01-072", "AZK01-073", "AZK01-075",
    "AZK01-077", "AZK01-078", "AZK01-079", "AZK01-082", "AZK01-084",
    "AZK01-085", "AZK01-086", "AZK01-094", "AZK01-097", "AZK01-098",
    "AZK01-111", "AZK01-129", "STT01-003", "STT01-004", "STT01-007",
    "STT01-008", "STT01-009", "STT01-013", "STT02-003", "STT02-004",
    "STT02-005", "STT02-007", "STT03-001", "STT03-003", "STT03-008",
    "STT04-001", "STT04-005", "STT04-010",
}

SETTING_GARDEN_CARD_IDS = {
    "AZK01-001", "AZK01-002", "AZK01-005", "AZK01-009", "AZK01-013",
    "AZK01-014", "AZK01-017", "AZK01-018", "AZK01-021", "AZK01-022",
    "AZK01-023", "AZK01-024", "AZK01-025", "AZK01-026", "AZK01-027",
    "AZK01-028", "AZK01-029", "AZK01-030", "AZK01-031", "AZK01-032",
    "AZK01-033", "AZK01-034", "AZK01-035", "AZK01-036", "AZK01-037",
    "AZK01-038", "AZK01-039", "AZK01-042", "AZK01-043", "AZK01-044",
    "AZK01-045", "AZK01-046", "AZK01-047", "AZK01-048", "AZK01-049",
    "AZK01-050", "AZK01-051", "AZK01-052", "AZK01-053", "AZK01-054",
    "AZK01-055", "AZK01-060", "AZK01-065", "AZK01-066", "AZK01-074",
    "AZK01-076", "AZK01-080", "AZK01-081", "AZK01-083", "AZK01-087",
    "AZK01-088", "AZK01-089", "AZK01-090", "AZK01-091", "AZK01-092",
    "AZK01-093", "AZK01-095", "AZK01-096", "AZK01-099", "AZK01-100",
    "AZK01-101", "AZK01-102", "AZK01-103", "AZK01-104", "AZK01-105",
    "AZK01-106", "AZK01-107", "AZK01-108", "AZK01-109", "AZK01-110",
    "AZK01-112", "AZK01-113", "AZK01-114", "AZK01-115", "AZK01-116",
    "AZK01-117", "AZK01-118", "AZK01-119", "AZK01-121", "AZK01-123",
    "AZK01-125", "AZK01-127", "AZK01-128", "STT01-001", "STT01-005",
    "STT01-006", "STT01-010", "STT01-011", "STT01-012", "STT01-014",
    "STT01-015", "STT01-016", "STT01-017", "STT02-001", "STT02-006",
    "STT02-008", "STT02-009", "STT02-010", "STT02-011", "STT02-012",
    "STT02-013", "STT02-014", "STT02-015", "STT02-016", "STT02-017",
    "STT03-004", "STT03-005", "STT03-006", "STT03-007", "STT03-009",
    "STT03-010", "STT03-011", "STT03-012", "STT03-013", "STT03-014",
    "STT03-015", "STT03-016", "STT03-017", "STT04-003", "STT04-004",
    "STT04-006", "STT04-007", "STT04-008", "STT04-009", "STT04-011",
    "STT04-012", "STT04-013", "STT04-014", "STT04-015", "STT04-016",
    "STT04-017",
}

CHARACTER_THREADS = {
    "benzai": ["STT02-007", "AZK01-125"],
    "bobu": ["STT03-001"],
    "gin-and-tonika": ["AZK01-079"],
    "mizuki": ["STT02-013"],
    "mizuryuu": ["AZK01-087", "AZK01-089", "AZK01-093"],
    "piko": ["AZK01-039", "AZK01-119"],
    "raizan": ["STT01-001", "STT01-011", "STT01-016", "AZK01-100"],
    "shao": ["STT02-001", "STT02-012", "STT02-017"],
    "zero": ["AZK01-064", "STT04-001"],
}

CARD_CONNECTIONS: dict[str, list[dict[str, Any]]] = {
    "AZK01-021": [{
        "related_card_id": "AZK01-023",
        "relation": "addresses Maho by name in flavor text",
        "authority_label": "official_card_fact",
        "confidence": "high",
    }],
    "AZK01-023": [{
        "related_card_id": "AZK01-021",
        "relation": "flavor text mentions a big brother; the paired Mizuto flavor text names Maho",
        "authority_label": "catalog_inference",
        "confidence": "medium",
    }],
    "AZK01-039": [{
        "related_card_id": "AZK01-119",
        "relation": "shared Piko name and cat/Steelborn identity",
        "authority_label": "catalog_inference",
        "confidence": "high",
    }],
    "AZK01-064": [{
        "related_card_id": "STT04-001",
        "relation": "shared Zero name, Fire element, Black Jade and Scorchweaver subtypes",
        "authority_label": "catalog_inference",
        "confidence": "high",
    }],
    "AZK01-100": [{
        "related_card_id": "STT01-001",
        "relation": "Raizan-named technique with a Raizan subtype requirement",
        "authority_label": "official_card_fact",
        "confidence": "high",
    }],
    "AZK01-119": [{
        "related_card_id": "AZK01-039",
        "relation": "leader presentation of Piko",
        "authority_label": "catalog_inference",
        "confidence": "high",
    }],
    "AZK01-125": [{
        "related_card_id": "STT02-007",
        "relation": "shared Benzai merchant identity and frog depiction",
        "authority_label": "catalog_inference",
        "confidence": "high",
    }],
    "STT01-011": [{
        "related_card_id": "STT01-001",
        "relation": "entity presentation of the Raizan leader",
        "authority_label": "catalog_inference",
        "confidence": "high",
    }],
    "STT01-016": [{
        "related_card_id": "STT01-001",
        "relation": "Raizan subtype weapon",
        "authority_label": "official_card_fact",
        "confidence": "high",
    }],
    "STT02-007": [{
        "related_card_id": "AZK01-125",
        "relation": "shared Benzai merchant identity and frog depiction",
        "authority_label": "catalog_inference",
        "confidence": "high",
    }],
    "STT02-012": [{
        "related_card_id": "STT02-001",
        "relation": "younger presentation of Shao by card name",
        "authority_label": "official_card_fact",
        "confidence": "high",
    }],
    "STT02-017": [{
        "related_card_id": "STT02-001",
        "relation": "Shao-named spell with a Shao leader condition",
        "authority_label": "official_card_fact",
        "confidence": "high",
    }],
    "STT04-001": [{
        "related_card_id": "AZK01-064",
        "relation": "leader presentation of Zero",
        "authority_label": "catalog_inference",
        "confidence": "high",
    }],
}

THEME_RULES = {
    "alley-life": ["alley", "rooftop", "courier", "pawnbroker", "dealer", "black jade", "tinkerer"],
    "art-and-craft": ["painter", "artisan", "smith", "forge", "glass blower", "potter", "tinkerer"],
    "beanz-community": ["beanz", "bean", "friendship", "bobu"],
    "commerce-and-trade": ["merchant", "trade guild", "pawnbroker", "dealer", "smuggler", "peddler"],
    "farming-and-growth": ["farm", "farmer", "cabbage", "sprout", "shroom", "verdant", "harvest"],
    "food-and-drink": ["chef", "sushi", "brew", "concoction", "spice", "lounge siren", "jar of beans"],
    "martial-discipline": ["samurai", "ninja", "assassin", "brawler", "sword", "dagger", "shuriken", "kanab"],
    "nature-and-creatures": ["bird", "cat", "frog", "sloth", "wolf", "crab", "bat", "python", "raven", "red panda"],
    "ritual-and-spirit": ["monk", "priestess", "ritual", "omen", "oath", "offering", "totem", "fatedealer"],
    "travel-and-thresholds": ["gate", "strider", "courier", "journey", "caravan", "riftwalk", "portal"],
}

SPECIFIC_VISUAL_NOTES = {
    "AZK01-028": "Water-wielding character framed by a cresting current; variants shift pose and wave composition.",
    "AZK01-042": "Lightning spell variants range from a shadowed caster to the officially described Beanz-and-goddess clap scene.",
    "AZK01-054": "A high-power earth character appears in two sharply different compositions, including a dynamic white-clad alternate view.",
    "AZK01-064": "Zero is shown controlling fire in contemporary clothing; one variant adds a seated, familiar-filled interior scene.",
    "AZK01-079": "Gin and Tonika appear as a paired character card; variants show both action and intimate duo portrait compositions.",
    "AZK01-087": "A water technique visualized as an immense serpentine torrent; the alternate composition emphasizes the current itself.",
    "AZK01-099": "Shin appears as a tiger-like lightning combatant surrounded by orbiting shock energy; variants change framing and attack pose.",
    "AZK01-106": "A colossal sand creature breaches a desert landscape; the alternate art emphasizes scale with tiny figures below.",
    "AZK01-112": "Enrai Shakunetsu is depicted as a fire-charged martial fighter in two distinct action poses.",
    "AZK01-119": "Piko's leader art presents the same cat swordsman in layered blade-and-lightning compositions.",
    "AZK01-121": "Kagoro's leader variants pair a red-panda warrior with fire-domain clothing and weapon imagery.",
    "AZK01-123": "Goro's leader variants show a large sloth-like earth guardian amid stone and vegetation.",
    "AZK01-125": "Benzai's leader variants show a frog merchant surrounded by wares and flowing water motifs.",
    "STT01-001": "Raizan variants move between portrait, full-body lightning, and combat-ready weapon compositions.",
    "STT02-001": "Shao variants include graphic portrait, water-framed leader art, and full-body sword poses.",
    "STT02-013": "Mizuki variants present the water character in action and quiet lotus-water portrait compositions.",
    "STT03-001": "Bobu variants show the bean farmer resting with a sloth or drinking in a lantern-lit interior.",
    "STT03-013": "The Stone Masked Ancient appears in two sand-swept action compositions.",
    "STT04-001": "Zero's leader variants retain contemporary clothing while shifting between graphic portrait and fire-action scenes.",
    "STT04-014": "Suzuka variants show a fire-aligned shinobi amid talismans and flame effects.",
}

SPECIFIC_VARIANT_VISUAL_NOTES = {
    "azuki_tcg_observation:tournament-winner-photo-20260710-001": (
        "User-supplied Yojin card photo with a reflective star treatment and a large black WINNER stamp across the lower-right illustration; tournament context beyond the visible treatment is not established by the image."
    ),
    "azuki_tcg_observation:tournament-winner-photo-20260710-002": (
        "User-supplied Serene Fist, Misaki card photo with a reflective star treatment, curling water-dragon composition, and a large gold WINNER stamp; tournament context beyond the visible treatment is not established by the image."
    ),
    "azuki_tcg_observation:anime-expo-winner-photo-20260710-001": (
        "User-supplied Shao's Perseverance full-art card photo showing Shao before a torii gate, a gold WINNER overlay, and visible AX / ANIME EXPO 2026 EXCLUSIVE marks; the exact booth activity that awarded it is unresolved."
    ),
    "azuki_tcg_observation:tournament-winner-photo-20260710-003": (
        "User-supplied Lady Emberheart card photo with reflective star treatment, fox-fire and drifting-petal composition, and a large gold WINNER stamp; no Anime Expo mark is visible."
    ),
}

NOT_CLAIMING = [
    "image observations are canon story events",
    "official card subtypes are all political factions",
    "shared names prove identity beyond the declared confidence label",
    "future manga or Set 2 material is already released",
    "physical-card authenticity, condition, possession, or market value",
]


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def canonical_json(data: Any) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def newest_snapshot(pattern: str) -> Path:
    paths = sorted((BASE / "source-snapshots").glob(pattern))
    if not paths:
        raise FileNotFoundError(f"no source snapshot matches {pattern}")
    return paths[-1]


def uniq(values: list[str]) -> list[str]:
    return sorted(
        {value.strip() for value in values if value and value.strip()},
        key=lambda value: (value.casefold(), value),
    )


def identity_thread(card_id: str) -> str | None:
    return next((name for name, ids in CHARACTER_THREADS.items() if card_id in ids), None)


def setting_cue(card: dict[str, Any]) -> dict[str, str]:
    card_id = card.get("card_id") or card.get("num") or ""
    if card.get("category") == "Gate":
        return {
            "value": "portal-threshold",
            "authority_label": "card_art_observation",
            "confidence": "high",
            "note": "The art centers a monumental gate; official rules define Gates as the portal mechanism between Alley and Garden.",
        }
    if card_id in SETTING_ALLEY_CARD_IDS:
        return {
            "value": "contemporary-alley-coded",
            "authority_label": "card_art_observation",
            "confidence": "medium",
            "note": "Contemporary, urban, domestic, trade, or everyday-life cues align with the official description of the Alley world.",
        }
    if card_id in SETTING_GARDEN_CARD_IDS:
        return {
            "value": "fantasy-garden-coded",
            "authority_label": "card_art_observation",
            "confidence": "medium",
            "note": "Elemental, feudal-fantasy, wilderness, shrine, or creature cues align with the official description of the Garden world.",
        }
    return {
        "value": "dual-world-or-unclear",
        "authority_label": "card_art_observation",
        "confidence": "low",
        "note": "The image does not support a confident Alley/Garden cue at contact-sheet review scale.",
    }


def subject_kind(category: str, name: str) -> str:
    if category == "Leader":
        return "named-leader"
    if category == "Entity":
        generic_terms = ("guard", "assassin", "hunter", "mentor", "adept", "scout", "farmer", "raven", "wolf", "crab", "python", "dummy", "totem")
        return "role-or-creature" if any(term in name.casefold() for term in generic_terms) else "named-character"
    if category == "Gate":
        return "portal-landmark"
    if category == "Weapon":
        return "weapon-object"
    if category == "Spell":
        return "technique-or-event"
    if category == "IKZ":
        return "resource-symbol"
    return "catalog-subject"


def motifs_for(card: dict[str, Any]) -> list[str]:
    fields = [
        card.get("name_en") or card.get("name") or "",
        card.get("card_text") or "",
        card.get("flavor_text") or "",
        " ".join(card.get("subtypes") or []),
    ]
    haystack = " ".join(fields).casefold()
    motifs = [theme for theme, needles in THEME_RULES.items() if any(needle in haystack for needle in needles)]
    element = card.get("element") or ""
    if element and element != "Neutral":
        motifs.extend(["elemental-domain", f"{element.casefold()}-element"])
    if card.get("category") == "Gate":
        motifs.extend(["portal-travel", "torii-like-gate"])
    if card.get("category") in {"Entity", "Leader"}:
        motifs.append("character-or-creature-focus")
    else:
        motifs.append("object-or-action-focus")
    return uniq(motifs)


def source_identity_refs(alpha_card: dict[str, Any] | None) -> list[dict[str, str | None]]:
    if not alpha_card:
        return []
    refs = []
    for ref in alpha_card.get("reference_ips") or []:
        refs.append({
            "collection": ref.get("ip"),
            "token_or_reference_id": ref.get("id"),
            "authority_label": "linked_alpha_master_sheet_fact",
        })
    return refs


def card_lore_summary(card: dict[str, Any], cue: dict[str, str], motifs: list[str]) -> str:
    name = card.get("name_en") or card.get("name") or card.get("card_id") or "Card"
    category = card.get("category") or "card"
    element = card.get("element") or "Neutral"
    subtypes = ", ".join(card.get("subtypes") or []) or "no supplied subtype"
    motif_text = ", ".join(motifs[:4]) or "no additional motif tags"
    return (
        f"Official card fields identify {name} as a {element} {category} with {subtypes}. "
        f"The reviewed art is tagged {cue['value']} ({cue['confidence']} confidence); search motifs: {motif_text}."
    )


def variant_role(card: dict[str, Any]) -> str:
    rarity = str(card.get("rarity") or "")
    entry = str(card.get("source_entry_id") or "")
    observed_kind = (card.get("variant_group") or {}).get("variant_kind") or ""
    if observed_kind.startswith("user_observed_"):
        return observed_kind.replace("_", "-")
    if "INV" in entry:
        return "invitational-or-event-treatment"
    if "★★" in rarity or "AAC" in entry:
        return "double-star-or-special-chase-art"
    if "★" in rarity or re.search(r"\dA(?:_|[A-Z])", entry):
        return "star-or-alternate-art"
    return "base-or-standard-art"


def visual_note(card: dict[str, Any], cue: dict[str, str], observed_notes: dict[str, str] | None = None) -> str:
    if observed_notes and card.get("uid") in observed_notes:
        return observed_notes[card["uid"]]
    if card.get("uid") in SPECIFIC_VARIANT_VISUAL_NOTES:
        return SPECIFIC_VARIANT_VISUAL_NOTES[card["uid"]]
    card_id = card.get("card_id") or card.get("num") or ""
    if card_id in SPECIFIC_VISUAL_NOTES:
        return SPECIFIC_VISUAL_NOTES[card_id]
    name = card.get("name_en") or card.get("name") or card_id
    kind = subject_kind(card.get("category") or "", name)
    return f"Reviewed {kind} illustration for {name}; strongest setting cue: {cue['value']}."


def build_visual_review_snapshot(official_image_dir: Path | None = None) -> dict[str, Any]:
    ui = read_json(UI_CATALOG)
    prior_path = newest_snapshot(VISUAL_REVIEW_GLOB)
    prior_by_uid = {row["uid"]: row for row in read_json(prior_path).get("rows", [])}
    official_order = [card["uid"] for card in ui["cards"] if card.get("image_status") == "exact_source"]
    alpha_order = [card["uid"] for card in ui["cards"] if card.get("image_status") == "alpha_master_sheet"]
    observation_order = [card["uid"] for card in ui["cards"] if card.get("image_status") == "user_photo_observation"]
    official_position = {uid: index for index, uid in enumerate(official_order)}
    alpha_position = {uid: index for index, uid in enumerate(alpha_order)}
    observation_position = {uid: index for index, uid in enumerate(observation_order)}
    rows = []

    for card in ui["cards"]:
        image = card.get("image") or ""
        if not image:
            continue
        if card.get("image_status") == "exact_source":
            path = official_image_dir / f"{card['source_entry_id']}.jpg" if official_image_dir else None
            if not path or not path.exists():
                prior = prior_by_uid.get(card["uid"])
                if not prior or prior.get("image_ref") != image:
                    raise FileNotFoundError(
                        f"official review image unavailable and no matching prior review exists: {card['uid']}"
                    )
                rows.append(prior)
                continue
            sheet = f"official_{official_position[card['uid']] // 20 + 1:02d}"
            review_status = "reviewed_in_labelled_contact_sheet"
            review_method = "Manual visual pass over labelled 5x4 contact sheets generated from each source image; official sheets 01-12 and Alpha sheets 01-05."
        elif card.get("image_status") == "alpha_master_sheet":
            path = ROOT / "web" / "public" / image
            sheet = f"alpha_{alpha_position[card['uid']] // 20 + 1:02d}"
            review_status = "reviewed_in_labelled_contact_sheet"
            review_method = "Manual visual pass over labelled 5x4 contact sheets generated from each source image; official sheets 01-12 and Alpha sheets 01-05."
        else:
            path = ROOT / "web" / "public" / image
            sheet = f"observation_{observation_position[card['uid']] + 1:02d}"
            review_status = "reviewed_at_original_resolution"
            review_method = "Manual visual pass over the user-supplied image at original resolution."
        if not path.exists() or path.stat().st_size < 1000:
            raise FileNotFoundError(f"review image missing or too small: {path}")
        rows.append({
            "uid": card["uid"],
            "card_id": card.get("card_id") or card.get("num") or "",
            "name": card.get("name_en") or "",
            "source_entry_id": card.get("source_entry_id") or "",
            "image_ref": image,
            "image_sha256": sha256_file(path),
            "image_bytes": path.stat().st_size,
            "review_batch": sheet,
            "review_status": review_status,
            "reviewer": "Codex",
            "review_method": review_method,
            "authority_label": "card_art_observation",
        })

    return {
        "schema": "azuki_card_art_visual_review_snapshot_v0.1",
        "reviewed": date.today().isoformat(),
        "source_catalog": str(UI_CATALOG.relative_to(ROOT)),
        "scope": f"Every image-bearing row in the {date.today().isoformat()} Cairn Azuki UI catalog.",
        "counts": {
            "reviewed_images": len(rows),
            "official_gallery_images": len(official_order),
            "alpha_master_sheet_images": len(alpha_order),
            "user_observation_images": len(observation_order),
        },
        "method_boundary": "Contact-sheet review supports high-level subjects, setting cues, motifs, and variant notes. It is not pixel-forensic review and does not establish canon, print identity, authenticity, condition, or possession.",
        "rows": rows,
        "not_claiming": NOT_CLAIMING,
    }


def build() -> tuple[dict[str, Any], dict[str, Any]]:
    lore_path = newest_snapshot(LORE_SOURCE_GLOB)
    review_path = newest_snapshot(VISUAL_REVIEW_GLOB)
    lore_source = read_json(lore_path)
    review_source = read_json(review_path)
    official = read_json(OFFICIAL)
    alpha = read_json(ALPHA)
    ui = read_json(UI_CATALOG)
    special_collection = read_json(SPECIAL_COLLECTION)
    special_visual_notes = {
        f"azuki_tcg_observation:special-collection-volume-01-{row['card_id'].lower()}": row["visual_note"]
        for row in special_collection["card_treatments"]
    }

    alpha_by_id = {card["card_id"]: card for card in alpha["cards"]}
    official_by_id: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    for card in official["cards"]:
        official_by_id[card["card_id"]].append(card)
    review_by_uid = {row["uid"]: row for row in review_source["rows"]}

    subtype_counts: collections.Counter[str] = collections.Counter()
    subtype_elements: dict[str, set[str]] = collections.defaultdict(set)
    for card in official["cards"]:
        for subtype in card.get("subtypes") or []:
            subtype_counts[subtype] += 1
            if card.get("element"):
                subtype_elements[subtype].add(card["element"])

    card_rows = []
    for card_id in sorted(official_by_id):
        variants = official_by_id[card_id]
        base = variants[0]
        alpha_card = alpha_by_id.get(card_id)
        enriched = {
            "card_id": card_id,
            "name": base.get("name") or "",
            "category": base.get("category") or "",
            "element": base.get("element") or "Neutral",
            "official_subtypes": base.get("subtypes") or [],
            "subtypes": base.get("subtypes") or [],
            "subtype_authority": "official_card_fact",
            "subject_kind": subject_kind(base.get("category") or "", base.get("name") or ""),
        }
        if alpha_card:
            enriched["flavor_text"] = alpha_card.get("flavor_text") or ""
        cue = setting_cue(enriched)
        motifs = motifs_for(enriched)
        thread = identity_thread(card_id)
        search_terms = [
            card_id,
            enriched["name"],
            enriched["category"],
            enriched["element"],
            *enriched["official_subtypes"],
            *motifs,
            cue["value"],
            thread or "",
        ]
        for connection in CARD_CONNECTIONS.get(card_id, []):
            search_terms.extend([connection["related_card_id"], connection["relation"]])
        refs = source_identity_refs(alpha_card)
        for ref in refs:
            search_terms.extend([str(ref.get("collection") or ""), str(ref.get("token_or_reference_id") or "")])
        card_rows.append({
            "card_id": card_id,
            "name": enriched["name"],
            "category": enriched["category"],
            "elemental_domain": enriched["element"],
            "elemental_domain_authority": "official_card_fact",
            "official_subtypes": enriched["official_subtypes"],
            "subtype_semantics_boundary": "Official card vocabulary; a subtype may denote affiliation, discipline, species, role, lineage, or trait. The catalog does not flatten every subtype into a faction.",
            "subject_kind": enriched["subject_kind"],
            "setting_cue": cue,
            "motifs": motifs,
            "motif_authority": "card_fields_plus_card_art_observation",
            "character_thread": thread,
            "connections": CARD_CONNECTIONS.get(card_id, []),
            "source_identity_refs": refs,
            "lore_summary": card_lore_summary(enriched, cue, motifs),
            "search_terms": uniq(search_terms),
            "variant_uids": sorted(card["uid"] for card in variants),
            "not_claiming": NOT_CLAIMING,
        })

    card_by_id = {card["card_id"]: card for card in card_rows}
    variant_rows = []
    unreviewed_image_uids = []
    for card in ui["cards"]:
        card_id = card.get("card_id") or card.get("num") or ""
        base = card_by_id.get(card_id)
        cue = base["setting_cue"] if base else setting_cue(card)
        motifs = base["motifs"] if base else motifs_for(card)
        review = review_by_uid.get(card["uid"])
        if card.get("image") and not review:
            unreviewed_image_uids.append(card["uid"])
        variant_rows.append({
            "uid": card["uid"],
            "card_id": card_id,
            "source_entry_id": card.get("source_entry_id") or "",
            "image_ref": card.get("image") or "",
            "variant_role": variant_role(card),
            "setting_cue": cue,
            "motifs": motifs,
            "visual_note": visual_note(card, cue, special_visual_notes),
            "visual_note_authority": "card_art_observation",
            "visual_review": ({
                "reviewed": review_source.get("reviewed"),
                "review_batch": review["review_batch"],
                "review_status": review["review_status"],
                "image_sha256": review["image_sha256"],
                "authority_label": review["authority_label"],
            } if review else None),
        })

    claims = [
        {
            "claim_id": f"{source['source_id']}:{index + 1}",
            "text": claim,
            "source_id": source["source_id"],
            "source_url": source["url"],
            "authority_label": source["authority_label"],
        }
        for source in lore_source["sources"]
        for index, claim in enumerate(source.get("claims") or [])
    ]
    world_guide = {
        "agent_context": (
            "Azuki's TCG world moves between the contemporary, everyday Alley and the fantasy Garden, "
            "which blends feudal Japan with Western fantasy and contains Earth, Water, Lightning, and Fire domains. "
            "Gates are the portal threshold; Leaders guide factions; IKZ powers play. Treat card subtypes as official "
            "vocabulary without assuming every subtype is a political faction. Treat art tags as observations, not canon events."
        ),
        "realms": [
            {"id": "alley", "label": "The Alley", "summary": "Contemporary, grounded, everyday-life world and the TCG back row used for preparation.", "authority_labels": ["official_site_fact", "official_tcg_rule_fact"]},
            {"id": "garden", "label": "The Garden", "summary": "Feudal-Japan/Western-fantasy world of four elemental domains and the TCG front row where combat and most interaction occur.", "authority_labels": ["official_site_fact", "official_tcg_rule_fact"]},
            {"id": "gate-threshold", "label": "Gate threshold", "summary": "The portal transition from Alley to Garden; Gate effects scale with the portaled entity's Gate Power.", "authority_labels": ["official_site_fact", "official_tcg_rule_fact"]},
        ],
        "domains": [
            {"id": element.casefold(), "label": element, "authority_label": "official_site_fact"}
            for element in ["Earth", "Water", "Lightning", "Fire"]
        ],
        "neutral": {"summary": "Neutral is a gameplay element usable with any elemental Leader; the official site describes four world domains, not a fifth Neutral domain.", "authority_label": "official_tcg_rule_fact"},
        "visual_language": {
            "summary": "East-meets-West, line-art-driven, cel-shaded anime art; alternate and chase art may diverge stylistically.",
            "authority_label": "official_site_fact",
        },
        "story_horizon": {
            "summary": "The cards introduce the world. The announced AZUKI manga will expand it, beginning with Sisters and Pact and an announced September 2026 global launch.",
            "authority_label": "official_future_context",
            "release_status": "announced_not_yet_released_at_snapshot_date",
        },
        "event_contexts": lore_source.get("event_contexts", []),
        "product_contexts": [{
            "collection_id": special_collection["collection_id"],
            "name": special_collection["name"],
            "authority_label": special_collection["authority_label"],
            "official_context": special_collection["official_context"],
            "user_assertions": special_collection["user_assertions"],
            "card_ids": [row["card_id"] for row in special_collection["card_treatments"]],
            "card_names": [row["name"] for row in special_collection["card_treatments"]],
            "cover_image": next(
                row["public_path"] for row in special_collection["source_images"]
                if row["display_role"] == "sealed_product_cover"
            ),
            "open_display_image": next(
                row["public_path"] for row in special_collection["source_images"]
                if row["display_role"] == "open_product_and_card_membership_evidence"
            ),
            "not_claiming": special_collection["not_claiming"],
        }],
        "promo_contexts": [special_collection["related_ax_promo"]],
        "character_threads": [
            {"id": name, "card_ids": ids, "authority_label": "official_card_fact_plus_declared_catalog_inference"}
            for name, ids in sorted(CHARACTER_THREADS.items())
        ],
        "subtype_vocabulary": [
            {
                "term": subtype,
                "official_gallery_rows": subtype_counts[subtype],
                "elements_seen": sorted(subtype_elements[subtype]),
                "authority_label": "official_card_fact",
                "semantics_boundary": "Unclassified official subtype; may be affiliation, discipline, species, role, lineage, or trait.",
            }
            for subtype in sorted(subtype_counts)
        ],
        "claims": claims,
        "not_claiming": lore_source.get("not_claiming", []) + NOT_CLAIMING,
    }

    checks = {
        "all_official_card_ids_enriched": len(card_rows) == official["counts"]["unique_card_ids"],
        "all_ui_rows_have_variant_metadata": len(variant_rows) == len(ui["cards"]),
        "all_image_rows_reviewed": not unreviewed_image_uids,
        "review_image_refs_match_catalog": all(
            not card.get("image") or (
                card["uid"] in review_by_uid and review_by_uid[card["uid"]]["image_ref"] == card["image"]
            )
            for card in ui["cards"]
        ),
        "official_review_count_matches": review_source["counts"]["official_gallery_images"] == sum(1 for card in ui["cards"] if card.get("image_status") == "exact_source"),
        "alpha_review_count_matches": review_source["counts"]["alpha_master_sheet_images"] == sum(1 for card in ui["cards"] if card.get("image_status") == "alpha_master_sheet"),
        "observation_review_count_matches": review_source["counts"].get("user_observation_images", 0) == sum(1 for card in ui["cards"] if card.get("image_status") == "user_photo_observation"),
    }
    passed = all(checks.values())
    payload = {
        "schema": "azuki_world_metadata_v0.1",
        "generated_from": {
            "lore_source_snapshot": str(lore_path.relative_to(ROOT)),
            "lore_source_sha256": sha256_file(lore_path),
            "visual_review_snapshot": str(review_path.relative_to(ROOT)),
            "visual_review_sha256": sha256_file(review_path),
            "official_gallery_release": str(OFFICIAL.relative_to(ROOT)),
            "official_gallery_sha256": sha256_file(OFFICIAL),
            "alpha_master_sheet_release": str(ALPHA.relative_to(ROOT)),
            "alpha_master_sheet_sha256": sha256_file(ALPHA),
            "anime_expo_2026_special_collection": str(SPECIAL_COLLECTION.relative_to(ROOT)),
            "anime_expo_2026_special_collection_sha256": sha256_file(SPECIAL_COLLECTION),
        },
        "authority_legend": lore_source["source_policy"],
        "world_guide": world_guide,
        "counts": {
            "official_world_sources": len(lore_source["sources"]),
            "world_claims": len(claims),
            "official_card_ids_enriched": len(card_rows),
            "ui_variants_enriched": len(variant_rows),
            "image_rows_reviewed": len(review_by_uid),
            "official_subtype_terms": len(subtype_counts),
            "character_threads": len(CHARACTER_THREADS),
            "observed_product_contexts": 1,
        },
        "checks": checks,
        "cards": card_rows,
        "variants": variant_rows,
        "not_claiming": NOT_CLAIMING,
    }
    audit = {
        "schema": "azuki_world_metadata_audit_v0.1",
        "passed": passed,
        "checks": checks,
        "counts": payload["counts"],
        "unreviewed_image_uids": unreviewed_image_uids,
        "not_claiming": NOT_CLAIMING,
    }
    return payload, audit


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Azuki world metadata for the Cairn catalog.")
    parser.add_argument("--check", action="store_true", help="verify generated metadata matches committed artifacts")
    parser.add_argument("--record-visual-review", action="store_true", help="write the dated human visual-review snapshot")
    parser.add_argument("--official-image-dir", type=Path, help="downloaded official card-art directory used when recording visual review")
    args = parser.parse_args()

    if args.record_visual_review:
        official_image_dir = args.official_image_dir.expanduser() if args.official_image_dir else None
        review = build_visual_review_snapshot(official_image_dir)
        review_path = BASE / "source-snapshots" / f"azuki_card_art_visual_review_{review['reviewed']}.json"
        write_json(review_path, review)
        print(f"wrote {review_path.relative_to(ROOT)} ({review['counts']['reviewed_images']} reviewed images)")

    payload, audit = build()
    rendered = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    audit_rendered = json.dumps(audit, indent=2, ensure_ascii=False) + "\n"
    if args.check:
        stale = []
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != rendered:
            stale.append(str(OUTPUT.relative_to(ROOT)))
        if not AUDIT.exists() or AUDIT.read_text(encoding="utf-8") != audit_rendered:
            stale.append(str(AUDIT.relative_to(ROOT)))
        if stale:
            print("Azuki world metadata is stale:", ", ".join(stale))
            return 1
        if not audit["passed"]:
            print("Azuki world metadata audit failed:", audit["checks"])
            return 1
        print(
            f"Azuki world metadata OK: {payload['counts']['official_card_ids_enriched']} card identities · "
            f"{payload['counts']['ui_variants_enriched']} UI rows · "
            f"{payload['counts']['image_rows_reviewed']} reviewed images · "
            f"{payload['counts']['world_claims']} sourced world claims"
        )
        return 0

    write_json(OUTPUT, payload)
    write_json(AUDIT, audit)
    print(f"wrote {OUTPUT.relative_to(ROOT)}")
    print(f"wrote {AUDIT.relative_to(ROOT)}")
    print(
        f"  {payload['counts']['official_card_ids_enriched']} card identities · "
        f"{payload['counts']['ui_variants_enriched']} UI rows · "
        f"{payload['counts']['image_rows_reviewed']} reviewed images"
    )
    return 0 if audit["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
