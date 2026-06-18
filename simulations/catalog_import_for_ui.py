#!/usr/bin/env python3
"""Build the unified, set-aware catalog the binder loads: No Rarity Base Set
(PMCG1, displayable reference images) + the 14 japanese-pre-english releases
(603 rows, external-reference-witness images, badged by provenance).

Honesty rules carried into the UI payload:
  - name: name_ja when source-labeled, else name_en flagged as an English
    provider label (name_is_en) — never claimed as the Japanese print name.
  - image_status: no_rarity_reference | exact_source | provider_path, plus the
    original display_allowed flag and a short rights note, so each shown image
    is framed as a reference witness, not seller evidence.
  - citation: each row carries its release catalog_hash + row_id.

Owned/stance overlay only exists for No Rarity (the seeded sample); every
pre-English row starts untracked.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "agent_tools"))
sys.path.insert(0, str(ROOT / "simulations"))
import inventory_tools as it  # noqa: E402
import no_rarity_catalog_tools as cat  # noqa: E402
import inventory_sample_for_ui as samp  # noqa: E402
import collection_sample_for_ui as csu  # noqa: E402 (reuse resolve_image + seed sets)

JPE = ROOT / "data" / "japanese-pre-english"
IMG_INDEX = ROOT / "mockups" / "assets" / "cards" / "_catalog_index.json"

SET_LABELS = {
    "jp_tcg_jungle": "Jungle",
    "jp_tcg_mystery_of_the_fossils": "Mystery of the Fossils",
    "jp_tcg_rocket_gang": "Rocket Gang",
    "jp_tcg_expansion_sheet_1_blue": "Vending Sheet 1 · Blue",
    "jp_tcg_expansion_sheet_2_red": "Vending Sheet 2 · Red",
    "jp_tcg_expansion_sheet_3_green": "Vending Sheet 3 · Green",
    "jp_tcg_leaders_stadium": "Leaders Stadium",
    "jp_tcg_nivi_city_gym_brock": "Nivi City Gym · Brock",
    "jp_tcg_hanada_city_gym_misty": "Hanada City Gym · Misty",
    "jp_tcg_kuchiba_city_gym_lt_surge": "Kuchiba City Gym · Lt. Surge",
    "jp_tcg_tamamushi_city_gym_erika": "Tamamushi City Gym · Erika",
    "jp_tcg_quick_starter_gift_set_red_deck": "Quick Starter Gift · Red",
    "jp_tcg_quick_starter_gift_set_green_deck": "Quick Starter Gift · Green",
    "jp_tcg_pokemon_song_best_collection": "Song Best Collection",
    "jp_tcg_gameboy_card_gb": "Game Boy Card",
    "jp_promo_unnumbered_pre_english_source_slice": "Unnumbered Promos",
}
STATUS_MAP = {"exact_source_image": "exact_source", "provider_path_reference_image": "provider_path"}


def _strip_date(family: str) -> str:
    return re.sub(r"_\d{8}(_\d{8})?$", "", family)


def _label_for(family: str) -> str:
    """Known sets get a curated label; new/auto-added ones get a readable
    fallback (drop the jp_tcg_/jp_promo_ prefix, title-case the rest)."""
    base = _strip_date(family)
    if base in SET_LABELS:
        return SET_LABELS[base]
    return re.sub(r"^(jp_tcg_|jp_promo_)", "", base).replace("_", " ").title()


def _first_date(family: str) -> str:
    m = re.search(r"(\d{4})(\d{2})(\d{2})", family)
    return f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else "9999-99-99"


def build_no_rarity():
    """No Rarity cards in the unified schema (reuses the seeded inventory sample)."""
    gaps = {s["card_ref"]: s.get("_gap") for s in samp.SPECS}
    inv = it.build_inventory(samp.OWNER, samp.SPECS)
    owned = {i["card_ref"]: i for i in inv["items"]}
    cat_hash = inv["catalog_release"]["catalog_hash"]
    cards = []
    for c in cat.cards():
        if not c.get("no_rarity_target"):
            continue
        ref = cat._card_id(c)
        b = cat.card_brief(c)
        o = owned.get(ref)
        want_cond = want_max = None
        if o is not None:
            stance = "extra" if ref in csu.EXTRAS else "have"
        elif ref in csu.WANTS_ACTIVE:
            stance = "want"
            want_cond = csu.WANTS_ACTIVE[ref]["want_cond"]
            want_max = csu.WANTS_ACTIVE[ref]["want_max"]
        elif ref in csu.WISHES:
            stance = "want"
        else:
            stance = None
        cards.append({
            "uid": ref, "set_id": "no_rarity_base_set", "num": b["local_id"],
            "name_ja": b["name"]["ja"], "romaji": b["name"]["romaji"], "name_en": b["name"]["en"],
            "name_is_en": False, "name_ja_status": "source_labeled",
            "category": b["row"]["category"], "types": b["row"]["types"], "holo": bool(c.get("holo_source")),
            "rarity": b["agent_profile"]["value_band"] or "", "band_rank": csu.BAND_RANK.get(b["agent_profile"]["value_band"], 0),
            "image": csu.resolve_image(ref, c), "image_status": "no_rarity_reference",
            "display_allowed": True, "provenance": "No Rarity reference image (source-labeled)",
            "promo": None,
            "owned": o is not None, "cond": samp.cond_display(o) if o else None,
            "custody": o["custody"]["mode"] if o else None, "gap": gaps.get(ref) if o else None,
            "stance": stance, "want_cond": want_cond, "want_max": want_max,
            "catalog_hash": cat_hash, "row_id": ref,
        })
    nr_set = {
        "id": "no_rarity_base_set", "label": "No Rarity Base Set", "code": "PMCG1",
        "date": "1996-10-20", "year": 1996, "source": "pricecharting/no-rarity",
        "source_url": "", "count": len(cards), "catalog_hash": cat_hash,
        "policy": "display", "exact_rows": len(cards), "ref_rows": 0, "order": 0,
    }
    return nr_set, cards


def build_pre_english():
    man = json.loads((JPE / "manifest.json").read_text(encoding="utf-8"))
    img_index = {}
    if IMG_INDEX.exists():
        try:
            img_index = json.loads(IMG_INDEX.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            img_index = {}
    sets, cards = [], []
    for rel in man["releases"]:
        fam = rel["release_family_id"]
        label = _label_for(fam)
        date = _first_date(fam)
        rel_cards = json.loads((ROOT / rel["path"]).read_text(encoding="utf-8")).get("cards", [])
        for c in rel_cards:
            ip = c.get("image_provenance") or {}
            rid = c["row_id"]
            name_ja, name_en = c.get("name_ja") or "", c.get("name_en") or ""
            promo = None
            pc = c.get("promo_context")
            if pc:
                promo = {"date": pc.get("date_label"), "comment": (pc.get("distribution_comment") or "")[:240]}
            cards.append({
                "uid": rid, "set_id": fam, "num": c.get("local_id") or "",
                "name_ja": name_ja, "romaji": c.get("romaji") or "", "name_en": name_en,
                "name_is_en": (not name_ja and bool(name_en)), "name_ja_status": c.get("name_ja_status") or "",
                "category": c.get("category") or "Pokemon", "types": [], "holo": bool(c.get("holo_source")),
                "rarity": (c.get("rarity_source") or "") if isinstance(c.get("rarity_source"), str) else "",
                "band_rank": 0,
                "image": img_index.get(rid), "image_status": STATUS_MAP.get(ip.get("status"), "provider_path"),
                "display_allowed": bool(ip.get("display_allowed", False)),
                "provenance": ip.get("image_role") or ip.get("rights_status") or "external reference witness",
                "promo": promo,
                "owned": False, "cond": None, "custody": None, "gap": None,
                "stance": None, "want_cond": None, "want_max": None,
                "catalog_hash": rel["catalog_hash"], "row_id": rid,
            })
        sets.append({
            "id": fam, "label": label, "code": rel.get("tcgdex_set_id") or "",
            "date": date, "year": int(date[:4]) if date[:4].isdigit() else 9999,
            "source": rel.get("source_adapter") or "", "source_url": rel.get("source_url") or "",
            "count": rel["row_count"], "catalog_hash": rel["catalog_hash"], "policy": "reference",
            "exact_rows": rel.get("exact_source_image_rows", 0),
            "ref_rows": rel.get("provider_path_reference_image_rows", 0),
            "order": 1,
        })
    return sets, cards, man


def main() -> int:
    nr_set, nr_cards = build_no_rarity()
    pe_sets, pe_cards, man = build_pre_english()

    sets = [nr_set] + pe_sets
    # chronological, but the era-spanning promo slice sinks to the end
    sets.sort(key=lambda s: (1 if s["id"].startswith("jp_promo") else 0, s["date"], s["label"]))
    for i, s in enumerate(sets):
        s["order"] = i
    order_of = {s["id"]: s["order"] for s in sets}

    cards = nr_cards + pe_cards
    cards.sort(key=lambda c: (order_of.get(c["set_id"], 99), c["num"]))

    with_img = sum(1 for c in cards if c["image"])
    ui = {
        "title": "Japanese pre-English catalog",
        "sets": sets,
        "summary": {
            "sets": len(sets), "cards": len(cards), "with_image": with_img,
            "exact_source": sum(1 for c in cards if c["image_status"] == "exact_source"),
            "provider_path": sum(1 for c in cards if c["image_status"] == "provider_path"),
            "no_rarity_reference": sum(1 for c in cards if c["image_status"] == "no_rarity_reference"),
            "missing_name_ja": sum(1 for c in cards if c["name_is_en"]),
        },
        "manifest_total_rows": man.get("total_rows"),
        "cards": cards,
    }
    out = ROOT / "mockups" / "catalog-sample.json"
    out.write_text(json.dumps(ui, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out}")
    print(f"  {len(sets)} sets · {len(cards)} cards · {with_img} with local image")
    print(f"  exact_source {ui['summary']['exact_source']} · provider_path {ui['summary']['provider_path']} · no_rarity {ui['summary']['no_rarity_reference']}")
    print(f"  english-only names: {ui['summary']['missing_name_ja']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
