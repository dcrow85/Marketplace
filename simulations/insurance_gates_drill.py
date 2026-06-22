#!/usr/bin/env python3
"""Falsification drill for the §12 enforceable gates (I1–I14) of Protocol_Insurance_v0.2.md.
Deterministic, model-free.

Each gate is a rule that MUST block a specific attack context, paired with a MUTATION
CONTROL (drop the one guard → the attack must flip to admit, proving teeth). This is not
live enforcement; it mirrors the admission rules the Solidity insurance surface must bind.
On-chain binding is Codex's lane.

Run: python3 simulations/insurance_gates_drill.py
"""

from __future__ import annotations


# I1 — payout trigger is arbiter-ruled or a mechanical predicate, never insurer-discretion
_VALID_TRIGGERS = {"arbiter_ruling", "floor_ruling", "mechanical_predicate"}


def i1_admit_trigger(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    if not disabled and c["trigger_type"] not in _VALID_TRIGGERS:
        reasons.append(f"payout trigger is not arbiter-ruled/mechanical ({c['trigger_type']})")
    return (not reasons, reasons)


# I2 — insurer is never a party to the trade it covers
def i2_admit_insurer(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    if not disabled and c["insurer"] in c["trade_parties"]:
        reasons.append("insurer is a party to the trade (buyer/seller/verifier/arbiter/floor)")
    return (not reasons, reasons)


# I3 — reserve >= max payout AND aggregate exposure within cap, before coverage is active
def i3_admit_reserve(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    if not disabled:
        if c["reserve"] < c["max_payout"]:
            reasons.append(f"reserve {c['reserve']} < max payout {c['max_payout']}")
        if c["prior_exposure"] + c["max_payout"] > c["exposure_cap"]:
            reasons.append("aggregate exposure cap exceeded")
    return (not reasons, reasons)


# I4 — ANY post-delivery buyer-favoring payout where the buyer holds the card requires
# return-custody (broadened in v0.2; only non-arrival/transit-loss is exempt — no card to return)
def i4_admit_payout(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    buyer_holds_card = c["delivered"] and c["payout_direction"] == "buyer" and c.get("buyer_holds_card", True)
    if not disabled and buyer_holds_card and not c["return_custody_proof"]:
        reasons.append("post-delivery buyer-favoring payout (buyer holds the card) without return-custody")
    return (not reasons, reasons)


# I5 — the premium is never rendered as an authenticity score / verdict
_VERDICT_RENDERS = {"authenticity_score", "verdict", "probability_of_truth", "trust_score"}


def i5_admit_render(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    if not disabled and c["rendered_as"] in _VERDICT_RENDERS:
        reasons.append(f"premium rendered as a verdict ({c['rendered_as']})")
    return (not reasons, reasons)


# I6 — bond relief is non-additive across the FULL import+bootstrap+coverage lattice,
# capped, solvency-gated (broadened in v0.2)
def i6_admit_relief(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    best = max(c["import_relief"], c["bootstrap_relief"], c["coverage_relief"])
    allowed = min(c["cap"], best) if c["reserve_locked"] else 0.0
    if not disabled and c["applied_relief"] > allowed + 1e-9:
        reasons.append(f"bond relief {c['applied_relief']} exceeds non-additive/solvency-gated allowed "
                       f"{allowed} across import+bootstrap+coverage (reserve_locked={c['reserve_locked']})")
    return (not reasons, reasons)


# I7 — subrogation recovery is bounded by the payout amount (no over-pursuit of the seller bond)
def i7_admit_subrogation(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    if not disabled and c["subrogation_claim"] > c["payout"] + 1e-9:
        reasons.append(f"subrogation claim {c['subrogation_claim']} exceeds payout {c['payout']}")
    return (not reasons, reasons)


# I8 — per-cohort exposure concentration cap not exceeded (one source cannot be the whole book)
def i8_admit_cohort(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    if not disabled and c["cohort_exposure"] + c["new_payout"] > c["cohort_cap"]:
        reasons.append(f"per-cohort exposure {c['cohort_exposure'] + c['new_payout']} exceeds cap {c['cohort_cap']}")
    return (not reasons, reasons)


# I9 — buyer retains a deductible >= floor (no 100% cover; moral-hazard / fake-claim brake)
def i9_admit_deductible(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    if not disabled and c["deductible"] < c["deductible_floor"] - 1e-9:
        reasons.append(f"deductible {c['deductible']} below floor {c['deductible_floor']} (full-cover moral hazard)")
    return (not reasons, reasons)


# I10 — reserve integrity: unique non-rehypothecated ref + reinsurance stack conservation + declared asset
def i10_admit_reserve_integrity(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    if not disabled:
        if not c["reserve_ref_unique"]:
            reasons.append("reserve_ref not unique")
        if c["rehypothecated"]:
            reasons.append("reserve rehypothecated (one reserve backs >1 policy)")
        if c["stack_total_locked"] < c["max_payout"] - 1e-9:
            reasons.append(f"reinsurance stack_total_locked {c['stack_total_locked']} < max_payout {c['max_payout']}")
        if not c["reserve_asset_declared"]:
            reasons.append("reserve asset/custodian not declared")
        if not c["haircut_policy"]:
            reasons.append("no haircut/peg policy")
    return (not reasons, reasons)


# I11 — coverage-floor: predicate breadth / exclusions cap / min window / return-custody required
def i11_admit_coverage_floor(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    if not disabled:
        if c["predicate_breadth"] < c["min_breadth"]:
            reasons.append("predicate below floor (cover in name only)")
        if c["exclusions"] > c["max_exclusions"]:
            reasons.append("exclusions over cap")
        if c["window"] < c["min_window"]:
            reasons.append("window below floor")
        if not c["return_custody_required"]:
            reasons.append("return-custody not required by policy")
    return (not reasons, reasons)


# I12 — common-control: insurer in seller's control set (or low control-distance) barred from relief
def i12_admit_common_control(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    if not disabled:
        if c["insurer"] in c["seller_control_set"]:
            reasons.append("insurer in seller's common-control set (wash-insurance)")
        elif c["control_distance"] < c["min_distance"] and c["buying_relief"]:
            reasons.append("low control-distance insurer buying relief")
    return (not reasons, reasons)


# I13 — high-value insurance requires an independent, non-sole floor/appeal path (else value-cap)
def i13_admit_floor_independence(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    high_value = c["value_tier"] >= 3
    captured_or_sole = (not c["floor_independent"]) or c["floor_is_sole_oracle"]
    if not disabled and high_value and captured_or_sole and not c["value_capped"]:
        reasons.append("high-value insurance on a captured/sole floor without a value-cap")
    return (not reasons, reasons)


# I14 — permissionless-payout finality/replay: active, unpaid, authorized, final, unstayed, in-window, scope-match
def i14_admit_payout_finality(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    if not disabled:
        if not c["policy_active"]:
            reasons.append("policy not active")
        if c["already_paid"]:
            reasons.append("policy already paid (replay)")
        if not c["trigger_authorized"]:
            reasons.append("trigger not authorized")
        if not c["trigger_final"]:
            reasons.append("trigger not final")
        if c["appeal_stay"]:
            reasons.append("appeal stay in effect")
        if not c["within_window"]:
            reasons.append("outside window")
        if not c["predicate_match"]:
            reasons.append("predicate/scope mismatch")
    return (not reasons, reasons)


def run() -> int:
    cases = [
        ("I1 trigger is arbiter-ruled/mechanical, not insurer-discretion", i1_admit_trigger,
         {"trigger_type": "arbiter_ruling"},
         {"trigger_type": "insurer_discretion"}),

        ("I2 insurer is never a trade party", i2_admit_insurer,
         {"insurer": "capX", "trade_parties": {"buyer", "seller", "verifier", "arbiter", "floor"}},
         {"insurer": "seller", "trade_parties": {"buyer", "seller", "verifier", "arbiter", "floor"}}),

        ("I3 reserve >= max payout and within exposure cap", i3_admit_reserve,
         {"reserve": 100.0, "max_payout": 100.0, "prior_exposure": 0.0, "exposure_cap": 1000.0},
         {"reserve": 50.0, "max_payout": 100.0, "prior_exposure": 0.0, "exposure_cap": 1000.0}),

        ("I4 any post-delivery buyer payout (buyer holds card) needs return-custody", i4_admit_payout,
         {"delivered": True, "payout_direction": "buyer", "buyer_holds_card": True, "return_custody_proof": True},
         {"delivered": True, "payout_direction": "buyer", "buyer_holds_card": True, "return_custody_proof": False}),

        ("I5 premium never rendered as an authenticity verdict", i5_admit_render,
         {"rendered_as": "premium_price"},
         {"rendered_as": "authenticity_score"}),

        ("I6 bond relief non-additive across import+bootstrap+coverage lattice", i6_admit_relief,
         {"import_relief": 0.30, "bootstrap_relief": 0.20, "coverage_relief": 0.30, "applied_relief": 0.30, "cap": 0.50, "reserve_locked": True},
         {"import_relief": 0.30, "bootstrap_relief": 0.20, "coverage_relief": 0.30, "applied_relief": 0.80, "cap": 0.50, "reserve_locked": True}),

        ("I7 subrogation recovery bounded by actual payout", i7_admit_subrogation,
         {"subrogation_claim": 100.0, "payout": 100.0},
         {"subrogation_claim": 150.0, "payout": 100.0}),

        ("I8 per-cohort exposure concentration cap", i8_admit_cohort,
         {"cohort_exposure": 600.0, "new_payout": 200.0, "cohort_cap": 1000.0},
         {"cohort_exposure": 900.0, "new_payout": 200.0, "cohort_cap": 1000.0}),

        ("I9 buyer retains a deductible >= floor", i9_admit_deductible,
         {"deductible": 0.10, "deductible_floor": 0.05},
         {"deductible": 0.00, "deductible_floor": 0.05}),

        ("I10 reserve integrity: unique/non-rehyp ref + stack conservation + declared asset", i10_admit_reserve_integrity,
         {"reserve_ref_unique": True, "rehypothecated": False, "stack_total_locked": 100.0,
          "max_payout": 100.0, "reserve_asset_declared": True, "haircut_policy": True},
         {"reserve_ref_unique": True, "rehypothecated": True, "stack_total_locked": 100.0,
          "max_payout": 100.0, "reserve_asset_declared": True, "haircut_policy": True}),

        ("I11 coverage-floor: no cover-in-name-only", i11_admit_coverage_floor,
         {"predicate_breadth": 5, "min_breadth": 3, "exclusions": 1, "max_exclusions": 3,
          "window": 90, "min_window": 30, "return_custody_required": True},
         {"predicate_breadth": 1, "min_breadth": 3, "exclusions": 1, "max_exclusions": 3,
          "window": 90, "min_window": 30, "return_custody_required": True}),

        ("I12 common-control wash-insurance barred from relief", i12_admit_common_control,
         {"insurer": "capX", "seller_control_set": {"seller", "affilA"}, "control_distance": 3, "min_distance": 2, "buying_relief": True},
         {"insurer": "affilA", "seller_control_set": {"seller", "affilA"}, "control_distance": 0, "min_distance": 2, "buying_relief": True}),

        ("I13 high-value insurance needs an independent, non-sole floor", i13_admit_floor_independence,
         {"value_tier": 3, "floor_independent": True, "floor_is_sole_oracle": False, "value_capped": False},
         {"value_tier": 3, "floor_independent": False, "floor_is_sole_oracle": True, "value_capped": False}),

        ("I14 permissionless payout needs finality/replay fields", i14_admit_payout_finality,
         {"policy_active": True, "already_paid": False, "trigger_authorized": True, "trigger_final": True,
          "appeal_stay": False, "within_window": True, "predicate_match": True},
         {"policy_active": True, "already_paid": False, "trigger_authorized": True, "trigger_final": True,
          "appeal_stay": True, "within_window": True, "predicate_match": True}),
    ]

    print("§12 insurance gates — falsification drill\n" + "-" * 60)
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
