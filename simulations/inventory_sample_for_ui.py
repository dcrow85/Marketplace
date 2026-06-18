#!/usr/bin/env python3
"""Generate a realistic owned-collection sample from the inventory model + the
live No Rarity catalog, and write UI data the binder mockup loads.

The visual is driven by the real `inventory_tools` output (not hand-faked), so
the binder reflects the actual ownership layer: condition-as-judgment, custody
mode, set completeness, and the one card with an open gap.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "agent_tools"))
import inventory_tools as it  # noqa: E402
import no_rarity_catalog_tools as cat  # noqa: E402

OWNER = "wallet:0xcollector"
IMAGES = {"PMCG1-021": "assets/charizard-jp-base-obv.jpg"}  # only this real scan on hand

# a believable binder: a few holo grails, some commons; varied custody + condition
SPECS = [
    {"card_ref": "PMCG1-021", "condition": {"claimed": "LP+", "agent_read": "holo clean; surface unconfirmed"},
     "custody": {"mode": "vault", "node_ref": "vault:shop-network-osaka", "attested": True, "attestation_ref": "att:0x21"},
     "acquisition_nonce": "c21", "_gap": "surface unconfirmed"},
    {"card_ref": "PMCG1-032", "condition": {"graded": True, "grader": "PSA", "grade": "9"},
     "custody": {"mode": "shop", "node_ref": "shop:kanto-cards", "attested": True, "attestation_ref": "att:0x32"}, "acquisition_nonce": "c32"},
    {"card_ref": "PMCG1-011", "condition": {"claimed": "NM", "agent_read": "sharp corners"},
     "custody": {"mode": "self"}, "acquisition_nonce": "c11"},
    {"card_ref": "PMCG1-042", "condition": {"graded": True, "grader": "CGC", "grade": "8"},
     "custody": {"mode": "shop", "node_ref": "shop:tokyo-vintage", "attested": True, "attestation_ref": "att:0x42"}, "acquisition_nonce": "c42"},
    {"card_ref": "PMCG1-050", "condition": {"claimed": "LP", "agent_read": "edge wear, holo strong"},
     "custody": {"mode": "vault", "node_ref": "vault:shop-network-osaka", "attested": True, "attestation_ref": "att:0x50"}, "acquisition_nonce": "c50"},
    {"card_ref": "PMCG1-001", "condition": {"claimed": "NM"}, "custody": {"mode": "self"}, "acquisition_nonce": "c01"},
    {"card_ref": "PMCG1-008", "condition": {"claimed": "LP+"}, "custody": {"mode": "self"}, "acquisition_nonce": "c08"},
    {"card_ref": "PMCG1-002", "condition": {"claimed": "MP"}, "custody": {"mode": "self"}, "acquisition_nonce": "c02"},
    {"card_ref": "PMCG1-003", "condition": {"claimed": "LP"}, "custody": {"mode": "self"}, "acquisition_nonce": "c03"},
    {"card_ref": "PMCG1-006", "condition": {"claimed": "NM"}, "custody": {"mode": "self"}, "acquisition_nonce": "c06"},
    {"card_ref": "PMCG1-007", "condition": {"claimed": "LP"}, "custody": {"mode": "self"}, "acquisition_nonce": "c07"},
    {"card_ref": "PMCG1-004", "condition": {"claimed": "MP"}, "custody": {"mode": "self"}, "acquisition_nonce": "c04"},
]


def cond_display(item: dict) -> str:
    c = item["condition"]
    if c.get("graded"):
        return f"{c['grader']} {c['grade']}"
    return f"raw · {c.get('claimed') or '?'}"


def main() -> int:
    gaps = {s["card_ref"]: s.get("_gap") for s in SPECS}
    inv = it.build_inventory(OWNER, SPECS)
    owned_ids = {i["card_ref"] for i in inv["items"]}

    # set map over the active No Rarity rows, in booster order
    active = [c for c in cat.cards() if c.get("no_rarity_target")]
    set_map = [{"num": cat.card_brief(c)["local_id"], "owned": cat._card_id(c) in owned_ids} for c in active]

    items = []
    for i in inv["items"]:
        b_id = i["card_ref"]
        items.append({
            "num": cat.card_brief(cat.find_card(b_id))["local_id"],
            "card_ref": b_id,
            "ja": i["display"]["ja"],
            "romaji": i["display"]["romaji"],
            "en": i["display"]["en"],
            "holo": bool(cat.find_card(b_id).get("holo_source")),
            "band": i["display"]["value_band"],
            "cond": cond_display(i),
            "graded": bool(i["condition"]["graded"]),
            "custody": i["custody"]["mode"],
            "node": i["custody"]["node_ref"],
            "status": i["status"],
            "gap": gaps.get(b_id),
            "image": IMAGES.get(b_id),
            "instance_id": i["instance_id"],
        })

    holo_count = sum(1 for x in items if x["holo"])
    gap_count = sum(1 for x in items if x["gap"])
    ui = {
        "set": {"name": "No Rarity Base Set", "region": "Japanese · 1996", "active_rows": len(active)},
        "owner": OWNER,
        "summary": {
            "owned": len(items),
            "active": len(active),
            "by_custody": inv["summary"]["by_custody_mode"],
            "holo_grails": holo_count,
            "gaps": gap_count,
        },
        "catalog_hash": inv["catalog_release"]["catalog_hash"],
        "inventory_hash": inv["inventory_hash"],
        "agent_note": (
            f"{holo_count} holo grails and {len(items) - holo_count} others, bound to the catalog. "
            f"Condition is my read, not a grade. {gap_count} card wants a fresh look before you'd trade it."
        ),
        "set_map": set_map,
        "items": items,
    }
    out = ROOT / "mockups" / "inventory-sample.json"
    out.write_text(json.dumps(ui, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out} — {len(items)} owned of {len(active)} ({holo_count} holo, {gap_count} gap)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
