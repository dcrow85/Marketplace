#!/usr/bin/env python3
"""Integration drill: the inventory (owned-collection) layer against the real
No Rarity Base Set catalog.

Exercises `agent_tools/inventory_tools.py`:
  - mint owned instances bound to real catalog rows (self / shop / vault custody)
  - reject a card that is not in the set (strict binding, no fuzzy match)
  - validate citation currency (catalog_hash + row_hash), condition-as-judgment,
    custody well-formedness, and content-hash integrity
  - the enforced / legible / judged partition differs by custody
  - set-completeness vs the 96 active No Rarity rows
  - MUTATION PROOF: the catalog-currency guard is load-bearing (disable it and a
    stale citation sails through)

Writes a JSON artifact under runs/ and exits non-zero if any check fails.
"""

from __future__ import annotations

import copy
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "agent_tools"))
import inventory_tools as it  # noqa: E402
import no_rarity_catalog_tools as cat  # noqa: E402

CHECKS: list[dict[str, object]] = []


def check(name: str, passed: bool, detail: str = "") -> None:
    CHECKS.append({"name": name, "passed": bool(passed), "detail": detail})
    print(f"  [{'PASS' if passed else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))


def _rehash(item: dict) -> dict:
    item["item_hash"] = cat._canonical_hash({k: v for k, v in item.items() if k != "item_hash"})
    return item


def main() -> int:
    active = [c for c in cat.cards() if c.get("no_rarity_target")]
    ids = [cat._card_id(c) for c in active]
    holo = next((cat._card_id(c) for c in active if c.get("holo_source")), None)
    a, b, d = ids[0], ids[1], ids[2]
    grail = holo or ids[3]

    owner = "wallet:0xcollector"
    specs = [
        {
            "card_ref": a,
            "condition": {"claimed": "LP", "agent_read": "edges clean from the photos"},
            "custody": {"mode": "self"},
            "evidence": ["front.jpg", "back.jpg"],
            "provenance": {"acquired_via": "trade at a local show"},
            "acquisition_nonce": "n1",
        },
        {
            "card_ref": b,
            "condition": {"graded": True, "grader": "PSA", "grade": "8"},
            "custody": {"mode": "shop", "node_ref": "shop:kanto-cards", "attested": True, "attestation_ref": "att:0xabc"},
            "acquisition_nonce": "n2",
        },
        {
            "card_ref": grail,
            "condition": {"claimed": "NM", "agent_read": "holo clean; surface unconfirmed"},
            "custody": {"mode": "vault", "node_ref": "vault:shop-network-osaka", "attested": True, "attestation_ref": "att:0xdef"},
            "acquisition_nonce": "n3",
        },
        {
            "card_ref": d,
            "condition": {"claimed": "MP"},
            "custody": {"mode": "self"},
            "acquisition_nonce": "n4",
        },
        # not in the No Rarity Base Set -> must be rejected, never fuzzy-bound
        {"card_ref": "Team Rocket Mewtwo", "acquisition_nonce": "x1"},
    ]

    print("== build inventory from the live catalog ==")
    inv = it.build_inventory(owner, specs)
    check("4 in-set instances minted", len(inv["items"]) == 4, f"{len(inv['items'])} items")
    check("off-set card rejected (strict binding)", len(inv["rejected"]) == 1 and inv["rejected"][0]["card_ref"] == "Team Rocket Mewtwo",
          inv["rejected"][0]["reason"] if inv["rejected"] else "no rejection")

    cited_hash = inv["items"][0]["catalog_citation"]["catalog_hash"]
    check("items cite the live catalog_hash", cited_hash == cat.catalog_release()["catalog_hash"], cited_hash[:16] + "…")
    check("condition is judged, never a fact", all(i["condition"]["basis"] == "judgment" for i in inv["items"]))

    print("== validate the clean inventory ==")
    v = it.validate_inventory(inv)
    check("all clean items validate", v["all_ok"], f"{len(v['failed'])} failed")

    print("== set completeness ==")
    sc = inv["summary"]["set_completeness"]
    check("completeness counted vs 96 active rows",
          sc["active_no_rarity_rows"] == 96 and sc["owned_active_no_rarity_rows"] == 4,
          sc["fraction"])

    print("== enforced / legible / judged partition by custody ==")
    self_part = it.item_partition(inv["items"][3])      # self-held
    shop_part = it.item_partition(inv["items"][1])      # shop-attested
    self_possession_judged = any("possession" in j for j in self_part["judgment_needed"])
    # an off-chain attestation flag is a RECORDED CLAIM (legible), never enforced —
    # only an on-chain MarketplaceInventory.attestCustody makes it enforceable, which
    # this model does not check. So: legible, and its truth stays judged.
    shop_custody_not_enforced = not any("custody" in e.lower() or "attest" in e.lower() for e in shop_part["enforced"])
    shop_custody_legible = any("custody attestation" in l.lower() for l in shop_part["legible"])
    shop_custody_judged = any("attestation truth" in j.lower() for j in shop_part["judgment_needed"])
    check("self-held: possession is JUDGED", self_possession_judged)
    check("shop-attested: custody is LEGIBLE, not enforced", shop_custody_not_enforced)
    check("shop-attested: attestation recorded in legible", shop_custody_legible)
    check("shop-attested: attestation truth is JUDGED (pending on-chain verify)", shop_custody_judged)
    check("neither claims physical authenticity",
          all("authenticity" in " ".join(p["judgment_needed"]) for p in (self_part, shop_part)))

    print("== adversarial cases ==")
    # stale catalog_hash (rehashed so ONLY the currency issue fires)
    stale = _rehash({**copy.deepcopy(inv["items"][0]),
                     "catalog_citation": {**inv["items"][0]["catalog_citation"], "catalog_hash": "0" * 64}})
    r = it.validate_item(stale)
    check("stale catalog_hash flagged", any("stale catalog_hash" in s for s in r["issues"]), str(r["issues"]))

    # row_hash drift
    drift = _rehash({**copy.deepcopy(inv["items"][0]),
                     "catalog_citation": {**inv["items"][0]["catalog_citation"], "row_hash": "0" * 64}})
    r = it.validate_item(drift)
    check("row_hash drift flagged", any("row_hash mismatch" in s for s in r["issues"]), str(r["issues"]))

    # condition asserted as a fact
    asfact = _rehash({**copy.deepcopy(inv["items"][0]),
                      "condition": {**inv["items"][0]["condition"], "basis": "fact"}})
    r = it.validate_item(asfact)
    check("condition-as-fact blocked", any("condition.basis must be 'judgment'" in s for s in r["issues"]), str(r["issues"]))

    # self-custody cannot be attested — make_item must normalize it away
    norm = it.make_item(owner, a, custody={"mode": "self", "attested": True, "attestation_ref": "att:fake"}, acquisition_nonce="n5")
    check("self-custody attestation normalized away", norm["custody"]["attested"] is False and norm["custody"]["attestation_ref"] is None)

    # regression (Codex P1): shop custody attested:true with NO attestation_ref is an
    # empty claim — must NOT count as attested and must never reach enforced.
    empty = it.make_item(owner, a, custody={"mode": "shop", "node_ref": "shop:x", "attested": True, "attestation_ref": None}, acquisition_nonce="n6")
    check("empty-ref attestation normalized to not-attested", empty["custody"]["attested"] is False)
    check("empty-ref custody never reaches enforced",
          not any("custody" in e.lower() or "attest" in e.lower() for e in it.item_partition(empty)["enforced"]))
    bad = {**copy.deepcopy(empty), "custody": {"mode": "shop", "node_ref": "shop:x", "attested": True, "attestation_ref": None}}
    bad = _rehash(bad)
    check("hand-built attested-no-ref item is flagged by validate_item",
          any("attestation_ref" in s for s in it.validate_item(bad)["issues"]), str(it.validate_item(bad)["issues"]))

    # tampered bytes without rehash
    tampered = copy.deepcopy(inv["items"][0])
    tampered["status"] = "tampered"  # no rehash
    r = it.validate_item(tampered)
    check("post-hash tampering flagged", any("item_hash mismatch" in s for s in r["issues"]), str(r["issues"]))

    print("== mutation proof: the catalog-currency guard is load-bearing ==")
    leaks = it.validate_item(stale, check_catalog_currency=False)
    check("guard OFF -> stale citation leaks (guard matters)",
          not any("stale catalog_hash" in s for s in leaks["issues"]),
          "no stale-hash issue when the check is disabled")

    passed = all(c["passed"] for c in CHECKS)
    print("\n" + ("ALL CHECKS PASSED" if passed else "SOME CHECKS FAILED"))

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir = ROOT / "runs" / f"inventory_no_rarity_drill_{ts}"
    out_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "drill": "inventory_no_rarity_drill",
        "generated_at": ts,
        "catalog_release": cat.catalog_release(),
        "inventory_hash": inv["inventory_hash"],
        "summary": inv["summary"],
        "rejected": inv["rejected"],
        "partitions": {"self_held": self_part, "shop_attested": shop_part},
        "checks": CHECKS,
        "all_passed": passed,
    }
    (out_dir / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"report: {out_dir / 'report.json'}")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
