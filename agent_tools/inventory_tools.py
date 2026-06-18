#!/usr/bin/env python3
"""Owned-collection ("inventory") layer over the No Rarity catalog.

The catalog says what cards EXIST (the fact layer). This module records what a
wallet OWNS: instances of catalog cards, each bound to its catalog row by the
content-addressed citation (catalog_hash + row_id + row_hash), carrying
condition-as-judgment, custody, evidence, and provenance. It is the off-chain
"record outlives the trade" / inventory pillar of
`Protocol_Payment_and_Custody_v0.1.md`.

Discipline mirrored from `no_rarity_catalog_tools`: deterministic, content-
addressed, no-overclaim. An inventory item records an OWNERSHIP CLAIM and its
CUSTODY. It does not prove the physical card is authentic, in a stated condition,
or in hand. The `enforced` column of a partition is the protocol's intended
record/transfer/custody spine; everything physical stays legible or judged.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

_AGENT_TOOLS = Path(__file__).resolve().parent
if str(_AGENT_TOOLS) not in sys.path:
    sys.path.insert(0, str(_AGENT_TOOLS))
import no_rarity_catalog_tools as cat  # noqa: E402

ITEM_SCHEMA = "marketplace.inventory_item.v0.1"
INVENTORY_SCHEMA = "marketplace.inventory.v0.1"

CONDITION_NOT_CLAIMING = ["condition_truth", "authenticity"]
ITEM_NOT_CLAIMING = ["authenticity", "condition_truth", "no_rarity_truth", "price_truth"]
CUSTODY_MODES = {"self", "shop", "vault"}


class InventoryError(ValueError):
    """An instance could not be bound to a catalog row, or is malformed."""


# --------------------------------------------------------------------------- #
# binding to the catalog (strict — no fuzzy search; you own a specific row)
# --------------------------------------------------------------------------- #
def _resolve_row(card_ref: str) -> dict[str, Any]:
    needle = str(card_ref).strip().lower()
    if not needle:
        raise InventoryError("empty card_ref")
    for card in cat.cards():
        ids = {
            cat._card_id(card).lower(),
            str(card.get("local_id", "")).lower(),
            str(card.get("name_en", "")).lower(),
            cat._ja(card).lower(),
            cat._romaji(card).lower(),
        }
        ids.discard("")
        if needle in ids:
            return card
    raise InventoryError(
        f"not in the No Rarity Base Set catalog: {card_ref!r} — an inventory item "
        f"must bind to a specific catalog row (catalog_hash + row_id)."
    )


def _norm_condition(condition: dict[str, Any] | None) -> dict[str, Any]:
    condition = dict(condition or {})
    return {
        "claimed": condition.get("claimed"),
        "graded": bool(condition.get("graded", False)),
        "grader": condition.get("grader"),
        "grade": condition.get("grade"),
        "agent_read": condition.get("agent_read"),
        # condition is always a judgment, by you and on arrival — never an enforced fact
        "basis": "judgment",
        "not_claiming": CONDITION_NOT_CLAIMING,
    }


def _norm_custody(custody: dict[str, Any] | None) -> dict[str, Any]:
    custody = dict(custody or {})
    mode = custody.get("mode", "self")
    if mode not in CUSTODY_MODES:
        raise InventoryError(f"unknown custody mode: {mode!r} ({'|'.join(sorted(CUSTODY_MODES))})")
    # self-custody can never be "attested" — no node holds it to vouch. And an
    # attestation with no reference is an empty claim that cannot be checked, so it
    # must NOT count as attested: attested REQUIRES a non-empty attestation_ref.
    ref = custody.get("attestation_ref")
    attested = bool(custody.get("attested", False)) and mode in {"shop", "vault"} and bool(ref)
    return {
        "mode": mode,
        "node_ref": custody.get("node_ref", "owner" if mode == "self" else None),
        "attested": attested,
        "attestation_ref": ref if attested else None,
    }


def _instance_id(owner: str, card_ref: str, nonce: str, catalog_hash: str) -> str:
    return cat._canonical_hash([owner, card_ref, nonce, catalog_hash])[:24]


def make_item(
    owner: str,
    card_ref: str,
    *,
    condition: dict[str, Any] | None = None,
    custody: dict[str, Any] | None = None,
    evidence: list[str] | None = None,
    provenance: dict[str, Any] | None = None,
    status: str = "held",
    acquisition_nonce: str | None = None,
) -> dict[str, Any]:
    """Mint an owned instance bound to a catalog row. Raises InventoryError off-set."""
    card = _resolve_row(card_ref)
    citation = cat.row_citation(card)
    brief = cat.card_brief(card)
    nonce = acquisition_nonce or ""
    item: dict[str, Any] = {
        "schema": ITEM_SCHEMA,
        "instance_id": _instance_id(owner, citation["row_id"], nonce, citation["catalog_hash"]),
        "owner": owner,
        "card_ref": citation["row_id"],
        "catalog_citation": citation,
        "display": {
            "ja": brief["name"]["ja"],
            "romaji": brief["name"]["romaji"],
            "en": brief["name"]["en"],
            "no_rarity_target": brief["no_rarity"]["active_target"],
            "value_band": brief["agent_profile"]["value_band"],
        },
        "condition": _norm_condition(condition),
        "custody": _norm_custody(custody),
        "evidence": list(evidence or []),
        "provenance": dict(provenance or {}),
        "status": status,
        "acquisition_nonce": nonce,
        "not_claiming": ITEM_NOT_CLAIMING,
    }
    item["item_hash"] = cat._canonical_hash({k: v for k, v in item.items() if k != "item_hash"})
    return item


# --------------------------------------------------------------------------- #
# the enforced / legible / judged partition for an owned item
# --------------------------------------------------------------------------- #
def item_partition(item: dict[str, Any]) -> dict[str, Any]:
    custody = item.get("custody", {})
    enforced = [
        "ownership-record binding (instance_id -> owner)",
        "transfer validity (signed, non-replayable)",
    ]
    legible = [
        "catalog citation (catalog_hash + row_id + row_hash)",
        "claimed condition",
        "evidence on file",
        "provenance",
    ]
    judgment_needed = [
        "physical-card authenticity",
        "true condition",
        "physical No Rarity truth",
    ]
    if custody.get("mode") in {"shop", "vault"} and custody.get("attested"):
        # An off-chain attestation flag is a RECORDED CLAIM, not enforcement. Only an
        # on-chain MarketplaceInventory.attestCustody by the assigned custodian (read
        # via isCustodyAttested) makes custody enforceable — which this off-chain
        # model does NOT verify. So it stays legible, and its truth stays judged,
        # until that on-chain check is wired in.
        legible.append(
            f"custody attestation by {custody.get('node_ref')} "
            f"(ref {custody.get('attestation_ref')}; node's recorded claim)"
        )
        judgment_needed.append("custody attestation truth (pending on-chain verification)")
    else:
        judgment_needed.append("possession (self-held; claimed, not custodied)")
    return {
        "instance_id": item.get("instance_id"),
        "card_ref": item.get("card_ref"),
        "enforced": cat._unique(enforced),
        "legible": cat._unique(legible),
        "judgment_needed": cat._unique(judgment_needed),
        "protocol_boundary": (
            "This records an ownership claim and its custody. It does not prove the "
            "physical card is authentic, in the stated condition, or in hand."
        ),
    }


# --------------------------------------------------------------------------- #
# validation: citation currency, condition discipline, custody, hash integrity
# --------------------------------------------------------------------------- #
def validate_item(item: dict[str, Any], *, check_catalog_currency: bool = True) -> dict[str, Any]:
    issues: list[str] = []
    row_id = item.get("card_ref")
    cited = item.get("catalog_citation", {})

    card = None
    current = None
    try:
        card = _resolve_row(str(row_id))
        current = cat.row_citation(card)
    except InventoryError:
        issues.append(f"row_id not in current catalog: {row_id!r}")

    if current is not None and check_catalog_currency:
        if cited.get("catalog_hash") != current["catalog_hash"]:
            issues.append("stale catalog_hash — citation pins a different catalog release; re-pin needed")
        if cited.get("row_hash") != current["row_hash"]:
            issues.append("row_hash mismatch — cited row bytes differ from the current catalog row")

    cond = item.get("condition", {})
    if cond.get("basis") != "judgment":
        issues.append("condition.basis must be 'judgment' (condition is never an enforced fact)")

    cust = item.get("custody", {})
    if cust.get("mode") not in CUSTODY_MODES:
        issues.append(f"bad custody mode: {cust.get('mode')!r}")
    if cust.get("attested") and cust.get("mode") == "self":
        issues.append("self-custody cannot be 'attested' (no node holds it)")
    if cust.get("attested") and not cust.get("attestation_ref"):
        issues.append("attested custody has no attestation_ref (an attestation must reference a signed record)")

    recomputed = cat._canonical_hash({k: v for k, v in item.items() if k != "item_hash"})
    if item.get("item_hash") != recomputed:
        issues.append("item_hash mismatch — item bytes were altered after hashing")

    return {
        "instance_id": item.get("instance_id"),
        "card_ref": row_id,
        "ok": not issues,
        "issues": issues,
        "partition": item_partition(item) if card is not None else None,
    }


# --------------------------------------------------------------------------- #
# the collection
# --------------------------------------------------------------------------- #
def build_inventory(owner: str, specs: list[dict[str, Any]]) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    for spec in specs:
        ref = spec.get("card_ref")
        try:
            items.append(
                make_item(
                    owner,
                    str(ref),
                    condition=spec.get("condition"),
                    custody=spec.get("custody"),
                    evidence=spec.get("evidence"),
                    provenance=spec.get("provenance"),
                    status=spec.get("status", "held"),
                    acquisition_nonce=spec.get("acquisition_nonce"),
                )
            )
        except InventoryError as exc:
            rejected.append({"card_ref": ref, "reason": str(exc)})
    inv: dict[str, Any] = {
        "schema": INVENTORY_SCHEMA,
        "owner": owner,
        "catalog_release": cat.catalog_release(),
        "items": items,
        "rejected": rejected,
    }
    inv["summary"] = inventory_summary(inv)
    inv["inventory_hash"] = cat._canonical_hash({k: v for k, v in inv.items() if k != "inventory_hash"})
    return inv


def inventory_summary(inv: dict[str, Any]) -> dict[str, Any]:
    items = inv.get("items", [])
    active_ids = {cat._card_id(c) for c in cat.cards() if c.get("no_rarity_target")}
    owned_ids = {it["card_ref"] for it in items}
    owned_active = owned_ids & active_ids
    by_band: dict[str, int] = {}
    by_custody: dict[str, int] = {}
    for it in items:
        band = it["display"].get("value_band") or "unspecified"
        by_band[band] = by_band.get(band, 0) + 1
        m = it["custody"]["mode"]
        by_custody[m] = by_custody.get(m, 0) + 1
    return {
        "item_count": len(items),
        "distinct_rows": len(owned_ids),
        "set_completeness": {
            "owned_active_no_rarity_rows": len(owned_active),
            "active_no_rarity_rows": len(active_ids),
            "fraction": f"{len(owned_active)}/{len(active_ids)}",
        },
        "by_value_band": by_band,
        "by_custody_mode": by_custody,
        "rejected_count": len(inv.get("rejected", [])),
        "boundary": (
            "Counts owned instances bound to catalog rows. 'enforced' in a partition is "
            "the protocol's record/transfer/custody spine; authenticity, condition, and "
            "No Rarity truth stay judged — by you and on arrival."
        ),
    }


def validate_inventory(inv: dict[str, Any], *, check_catalog_currency: bool = True) -> dict[str, Any]:
    results = [validate_item(it, check_catalog_currency=check_catalog_currency) for it in inv.get("items", [])]
    return {
        "owner": inv.get("owner"),
        "catalog_hash": inv.get("catalog_release", {}).get("catalog_hash"),
        "item_results": results,
        "all_ok": all(r["ok"] for r in results),
        "failed": [r for r in results if not r["ok"]],
    }


if __name__ == "__main__":  # pragma: no cover - tiny demo
    import json

    active = [cat._card_id(c) for c in cat.cards() if c.get("no_rarity_target")][:3]
    demo = build_inventory(
        "wallet:0xdemo",
        [{"card_ref": r, "condition": {"claimed": "LP+", "agent_read": "looks clean"}} for r in active],
    )
    print(json.dumps(demo["summary"], indent=2, ensure_ascii=False))
