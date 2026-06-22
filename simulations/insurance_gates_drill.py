#!/usr/bin/env python3
"""Falsification drill for the §12 enforceable gates (I1–I9) of Protocol_Insurance_v0.1.md.
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


# I4 — post-delivery buyer-favoring payout requires return-custody (anti-fake-claim; G1 (a))
def i4_admit_payout(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    post_delivery_buyer_payout = c["delivered"] and c["payout_direction"] == "buyer" \
        and c["scope"] in ("authenticity", "condition")
    if not disabled and post_delivery_buyer_payout and not c["return_custody_proof"]:
        reasons.append("post-delivery buyer payout without return-custody (collect-and-keep-card)")
    return (not reasons, reasons)


# I5 — the premium is never rendered as an authenticity score / verdict
_VERDICT_RENDERS = {"authenticity_score", "verdict", "probability_of_truth", "trust_score"}


def i5_admit_render(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    if not disabled and c["rendered_as"] in _VERDICT_RENDERS:
        reasons.append(f"premium rendered as a verdict ({c['rendered_as']})")
    return (not reasons, reasons)


# I6 — bond relief from coverage is non-additive and solvency-gated (extends G4)
def i6_admit_relief(c: dict, *, disabled=False) -> tuple[bool, list[str]]:
    reasons = []
    allowed = min(c["cap"], max(c["import_relief"], c["coverage_relief"])) if c["reserve_locked"] else 0.0
    if not disabled and c["applied_relief"] > allowed + 1e-9:
        reasons.append(f"coverage bond relief {c['applied_relief']} exceeds non-additive/solvency-gated "
                       f"allowed {allowed} (reserve_locked={c['reserve_locked']})")
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

        ("I4 post-delivery buyer payout needs return-custody", i4_admit_payout,
         {"delivered": True, "payout_direction": "buyer", "scope": "authenticity", "return_custody_proof": True},
         {"delivered": True, "payout_direction": "buyer", "scope": "authenticity", "return_custody_proof": False}),

        ("I5 premium never rendered as an authenticity verdict", i5_admit_render,
         {"rendered_as": "premium_price"},
         {"rendered_as": "authenticity_score"}),

        ("I6 coverage bond relief is non-additive + solvency-gated", i6_admit_relief,
         {"import_relief": 0.30, "coverage_relief": 0.30, "applied_relief": 0.30, "cap": 0.50, "reserve_locked": True},
         {"import_relief": 0.30, "coverage_relief": 0.30, "applied_relief": 0.60, "cap": 0.50, "reserve_locked": True}),

        ("I7 subrogation recovery bounded by payout", i7_admit_subrogation,
         {"subrogation_claim": 100.0, "payout": 100.0},
         {"subrogation_claim": 150.0, "payout": 100.0}),

        ("I8 per-cohort exposure concentration cap", i8_admit_cohort,
         {"cohort_exposure": 600.0, "new_payout": 200.0, "cohort_cap": 1000.0},
         {"cohort_exposure": 900.0, "new_payout": 200.0, "cohort_cap": 1000.0}),

        ("I9 buyer retains a deductible >= floor", i9_admit_deductible,
         {"deductible": 0.10, "deductible_floor": 0.05},
         {"deductible": 0.00, "deductible_floor": 0.05}),
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
