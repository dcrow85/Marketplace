#!/usr/bin/env python3
"""Falsification drill for the §13 alpha admission gates of
Protocol_Consolidated_Spec_v0.2.md — Kepler's "convert open items into gates, not prose."
Deterministic, model-free.

Each in-lane gate is a rule that MUST block a specific attack context, paired with a
MUTATION CONTROL (drop the one guard → the attack must flip to admit, proving teeth).
This is not live enforcement; it mirrors the admission rules the Solidity surface must bind.

Run: python3 simulations/consolidated_alpha_gates_drill.py
"""

from __future__ import annotations


# G1 — post-delivery buyer-favoring default needs return-custody OR a signed unresolvable receipt
def g1_admit_default(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    buyer_favoring = c["default_remedy"] == "buyer_refund"
    if not disabled and c["delivered"] and buyer_favoring and c["claim_type"] != "non_delivery":
        if not (c["return_custody_proof"] or c["unresolvable_receipt_signed"]):
            reasons.append("post-delivery buyer-favoring default without return-custody or a signed "
                           "unresolvable-claim receipt (card-plus-refund hole)")
    return (not reasons, reasons)


# G2 — capacity downgrade ladder; a custodian may never be the physical verifier of its own subject
def g2_admit_route(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    custodian_is_physical_verifier = c["mode"] == "custodian_physical" and c["verifier_is_custodian"]
    if not disabled:
        if custodian_is_physical_verifier:
            reasons.append("custodian verifying its own same-subject (role-distinctness violated)")
        if c["mode"] == "custodian_physical" and not c["non_custodian_verifier_available"] \
                and c["mode"] not in c["downgrade_ladder"]:
            reasons.append("no non-custodian verifier available and route did not downgrade")
    return (not reasons, reasons)


# G3 — verifier settlement power requires a seller-accepted JSC route schema, not prose
def g3_admit_verifier_settlement(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    settlement_power = c["authority_level"] == "settlement_verifier" or (
        c["authority_level"] == "dispute_witness" and c["witness_can_settle"]
    )
    if not disabled:
        if c["authority_level"] == "private_advisor" and c["creates_seller_liability"]:
            reasons.append("private advisor route attempted to create seller liability")
        if c["creates_seller_liability"] and not settlement_power:
            reasons.append("route lacks settlement authority")
        if settlement_power:
            required = {
                "seller_accepted_route",
                "accepted_verifier_active",
                "scope_matches",
                "fee_outcome_independent",
                "buyer_dispute_bond_locked",
                "verifier_bond_locked",
                "appeal_path_named",
                "verifier_signed_ruling",
            }
            missing = sorted(field for field in required if not c[field])
            if c["fee_payer"] not in {"buyer", "escrow"}:
                missing.append("fee_payer_buyer_or_escrow")
            if missing:
                reasons.append("JSC settlement route missing: " + ", ".join(missing))
    return (not reasons, reasons)


# G4 — bond relief is non-additive (combined <= max of the two paths, capped)
def g4_admit_relief(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    allowed = min(c["cap"], max(c["import_relief"], c["bootstrap_relief"]))
    if not disabled and c["applied_relief"] > allowed + 1e-9:
        reasons.append(f"bond relief {c['applied_relief']} exceeds non-additive allowed {allowed} "
                       f"(double-dip: import {c['import_relief']} + bootstrap {c['bootstrap_relief']})")
    return (not reasons, reasons)


# G5 — self-arbitration bar: same address may not be verifier and arbiter/floor on one trade
def g5_admit_roles(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    if not disabled and c["verifier_addr"] in (c["arbiter_addr"], c["floor_addr"]):
        reasons.append("verifier address is also the arbiter/floor for this trade (self-arbitration)")
    return (not reasons, reasons)


# G6 — a catalog-row match may never render as authentication
_AUTH_LABELS = {"authentic", "genuine", "is that card", "verified authentic", "real"}


def g6_admit_render(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    if not disabled and c["derived_from"] == "catalog_match" and c["rendered_label"].lower() in _AUTH_LABELS:
        reasons.append(f"catalog match rendered as authentication ({c['rendered_label']!r})")
    return (not reasons, reasons)


def run() -> int:
    # (name, gate_fn, clean_ctx, attack_ctx)
    cases = [
        ("G1 post-delivery default needs return-custody/receipt", g1_admit_default,
         {"delivered": True, "claim_type": "condition_dispute", "default_remedy": "buyer_refund",
          "return_custody_proof": True, "unresolvable_receipt_signed": False},
         {"delivered": True, "claim_type": "condition_dispute", "default_remedy": "buyer_refund",
          "return_custody_proof": False, "unresolvable_receipt_signed": False}),

        ("G2 custodian may not verify its own same-subject", g2_admit_route,
         {"mode": "non_custodian_remote", "verifier_is_custodian": False,
          "non_custodian_verifier_available": True, "downgrade_ladder": ["non_custodian_remote", "advisor_only"]},
         {"mode": "custodian_physical", "verifier_is_custodian": True,
          "non_custodian_verifier_available": False, "downgrade_ladder": ["advisor_only"]}),

        ("G3 verifier settlement requires seller-accepted JSC schema", g3_admit_verifier_settlement,
         {"authority_level": "settlement_verifier", "witness_can_settle": False,
          "creates_seller_liability": True, "seller_accepted_route": True,
          "accepted_verifier_active": True, "scope_matches": True, "fee_payer": "buyer",
          "fee_outcome_independent": True, "buyer_dispute_bond_locked": True,
          "verifier_bond_locked": True, "appeal_path_named": True, "verifier_signed_ruling": True},
         {"authority_level": "settlement_verifier", "witness_can_settle": False,
          "creates_seller_liability": True, "seller_accepted_route": False,
          "accepted_verifier_active": True, "scope_matches": False, "fee_payer": "seller",
          "fee_outcome_independent": False, "buyer_dispute_bond_locked": True,
          "verifier_bond_locked": False, "appeal_path_named": False, "verifier_signed_ruling": True}),

        ("G4 bond relief is non-additive", g4_admit_relief,
         {"import_relief": 0.30, "bootstrap_relief": 0.30, "applied_relief": 0.30, "cap": 0.50},
         {"import_relief": 0.30, "bootstrap_relief": 0.30, "applied_relief": 0.60, "cap": 0.50}),

        ("G5 self-arbitration barred", g5_admit_roles,
         {"verifier_addr": "shopA", "arbiter_addr": "shopB", "floor_addr": "floorX"},
         {"verifier_addr": "shopA", "arbiter_addr": "shopA", "floor_addr": "floorX"}),

        ("G6 catalog match never renders as authentication", g6_admit_render,
         {"derived_from": "catalog_match", "rendered_label": "matches catalog row"},
         {"derived_from": "catalog_match", "rendered_label": "authentic"}),
    ]

    print("§13 alpha admission gates — falsification drill\n" + "-" * 60)
    passed = 0
    for name, fn, clean, attack in cases:
        ok_clean, _ = fn(clean)
        ok_attack, why = fn(attack)
        blocked = not ok_attack
        admitted_without_guard, _ = fn(attack, disabled=True)
        teeth = ok_clean and blocked and admitted_without_guard
        if teeth:
            passed += 1
        print(f"[{'PASS' if teeth else 'FAIL'}] {name}")
        print(f"        clean admits={ok_clean}  attack blocked={blocked}  (reasons: {', '.join(why) or '—'})")
        print(f"        teeth: with guard disabled -> admits={admitted_without_guard}")

    print("-" * 60)
    print(f"{passed}/{len(cases)} gates pass WITH TEETH "
          f"(clean admits, attack blocked, and admits once the guard is removed)")
    return 0 if passed == len(cases) else 1


if __name__ == "__main__":
    raise SystemExit(run())
