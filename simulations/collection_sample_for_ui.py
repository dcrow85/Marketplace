#!/usr/bin/env python3
"""Generate full-set collection data for the Hearthstone-style browser.

Every active No Rarity row, with the attributes you'd sort/filter on (number,
name, type, value band, holo), the owned overlay (condition + custody from the
inventory model), and seeded stances (have / want / wish / extra). The page
sorts, filters, and tags client-side; this just hands it the truth.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "agent_tools"))
sys.path.insert(0, str(ROOT / "simulations"))
import inventory_tools as it  # noqa: E402
import no_rarity_catalog_tools as cat  # noqa: E402
import inventory_sample_for_ui as samp  # noqa: E402  (reuse the owned SPECS / images)

BAND_RANK = {"high-scrutiny holo": 3, "desirable non-holo or trainer": 2, "low-value active target": 1}

# seeded stances (unowned). A "want" is one stance with depth: a bare want is a
# wishlist flag; filling in the bigger fields (condition / budget) makes it an
# active hunt. So active wants carry seeded terms; wishes are wants with none.
WANTS_ACTIVE = {                                   # deep wants — the agent hunts these
    "PMCG1-034": {"want_cond": "lp", "want_max": 900},   # Gyarados
    "PMCG1-038": {"want_cond": "nm", "want_max": 240},   # Raichu
    "PMCG1-022": {"want_cond": "any", "want_max": 110},  # Ninetales
}
WISHES = {"PMCG1-049", "PMCG1-058"}                # Alakazam, Hitmonchan — flagged only
EXTRAS = {"PMCG1-002"}                              # owned dupe to trade


CARDS_DIR = ROOT / "mockups" / "assets" / "cards"


def resolve_image(ref: str, c: dict) -> str | None:
    """Prefer a real local scan, then the downloaded local No Rarity reference,
    then the external URL as a last resort (all source-labeled PriceCharting —
    never the English API art)."""
    if ref in samp.IMAGES:
        return samp.IMAGES[ref]
    if (CARDS_DIR / f"{ref}.jpg").exists():
        return f"assets/cards/{ref}.jpg"
    nr = c.get("no_rarity_reference", {})
    return nr.get("image_small") or nr.get("image_large")


def main() -> int:
    gaps = {s["card_ref"]: s.get("_gap") for s in samp.SPECS}
    inv = it.build_inventory(samp.OWNER, samp.SPECS)
    owned = {i["card_ref"]: i for i in inv["items"]}

    cards = []
    for c in cat.cards():
        if not c.get("no_rarity_target"):
            continue
        ref = cat._card_id(c)
        b = cat.card_brief(c)
        o = owned.get(ref)
        want_cond = want_max = None
        if o is not None:
            stance = "extra" if ref in EXTRAS else "have"
        elif ref in WANTS_ACTIVE:
            stance = "want"
            want_cond = WANTS_ACTIVE[ref]["want_cond"]
            want_max = WANTS_ACTIVE[ref]["want_max"]
        elif ref in WISHES:
            stance = "want"   # a bare want == wishlist
        else:
            stance = None
        cards.append({
            "num": b["local_id"],
            "card_ref": ref,
            "ja": b["name"]["ja"],
            "romaji": b["name"]["romaji"],
            "en": b["name"]["en"],
            "category": b["row"]["category"],          # Pokemon | Trainer | Energy
            "types": b["row"]["types"],                # ["Fire"], ...
            "stage": b["row"]["stage"],
            "holo": bool(c.get("holo_source")),
            "band": b["agent_profile"]["value_band"] or "unspecified",
            "band_rank": BAND_RANK.get(b["agent_profile"]["value_band"], 0),
            "owned": o is not None,
            "cond": samp.cond_display(o) if o else None,
            "custody": o["custody"]["mode"] if o else None,
            "gap": gaps.get(ref) if o else None,
            # local scan / local downloaded No Rarity reference / external fallback
            "image": resolve_image(ref, c),
            "stance": stance,
            "want_cond": want_cond,
            "want_max": want_max,
        })

    counts = {"have": 0, "want": 0, "wish": 0, "extra": 0}
    for x in cards:
        if x["owned"]:
            counts["have"] += 1
            if x["stance"] == "extra":
                counts["extra"] += 1
        elif x["stance"] == "want":
            active = bool(x["want_max"]) or (x["want_cond"] and x["want_cond"] != "any")
            counts["want" if active else "wish"] += 1

    ui = {
        "set": {"name": "No Rarity Base Set", "region": "Japanese · 1996"},
        "summary": {"active": len(cards), **counts},
        "catalog_hash": inv["catalog_release"]["catalog_hash"],
        "inventory_hash": inv["inventory_hash"],
        "cards": cards,
    }
    out = ROOT / "mockups" / "collection-sample.json"
    out.write_text(json.dumps(ui, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out} — {len(cards)} rows · {counts}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
