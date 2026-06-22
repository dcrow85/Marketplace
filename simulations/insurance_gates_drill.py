#!/usr/bin/env python3
"""Falsification drill for the §12 enforceable gates (I1–I15) of Protocol_Insurance_v0.3.md.
Deterministic, model-free.

PER-SUBGUARD TEETH (Kepler v0.3 finding 4): each compound gate is mutated ONE SUBCLAUSE
at a time. For every subguard: an attack that violates only that subguard must (a) BLOCK
under the full gate, and (b) flip to ADMIT when *only that subguard* is disabled — proving
each subcondition is independently load-bearing, not just the gate as a whole.

Each gate fn takes `off` = a set of subguard ids to disable. Attacks are built as
{**clean, **override} so every field stays present. Not live enforcement; mirrors the
admission rules the Solidity insurance surface must bind. On-chain binding is Codex's lane.

Run: python3 simulations/insurance_gates_drill.py
"""

from __future__ import annotations


def _pop(x: int) -> int:
    return bin(x).count("1")


# ---- gates (each subclause guarded by `if <sg> not in off`) ----------------------------------

_VALID_TRIGGERS = {"arbiter_ruling", "floor_ruling", "onchain_state", "attested"}


def i1(c, off=frozenset()):
    r = []
    if "trigger_kind" not in off and c["trigger_type"] not in _VALID_TRIGGERS:
        r.append(f"trigger not ruling/state/attested ({c['trigger_type']})")
    return (not r, r)


def i2(c, off=frozenset()):
    r = []
    if "insurer_distinct" not in off and c["insurer"] in c["trade_parties"]:
        r.append("insurer is a trade party")
    return (not r, r)


def i3(c, off=frozenset()):
    r = []
    if "reserve_ge_payout" not in off and c["reserve"] < c["max_payout"]:
        r.append("reserve < max_payout")
    if "aggregate_cap" not in off and c["prior_exposure"] + c["max_payout"] > c["exposure_cap"]:
        r.append("aggregate exposure cap exceeded")
    return (not r, r)


def i4(c, off=frozenset()):
    r = []
    holds = c["delivered"] and c["payout_direction"] == "buyer" and c["buyer_holds_card"]
    if "return_custody" not in off and holds and not c["return_custody_proof"]:
        r.append("post-delivery buyer payout (holds card) without return-custody")
    return (not r, r)


_VERDICTS = {"authenticity_score", "verdict", "probability_of_truth", "trust_score"}


def i5(c, off=frozenset()):
    r = []
    if "not_verdict" not in off and c["rendered_as"] in _VERDICTS:
        r.append("premium rendered as a verdict")
    return (not r, r)


def i6(c, off=frozenset()):
    r = []
    best = max(c["import_relief"], c["bootstrap_relief"], c["coverage_relief"])
    if "solvency_gated" not in off and not c["reserve_locked"] and c["applied_relief"] > 1e-9:
        r.append("relief applied with no locked reserve")
    if "nonadditive" not in off and c["reserve_locked"] and c["applied_relief"] > min(c["cap"], best) + 1e-9:
        r.append("relief exceeds non-additive ceiling (import+bootstrap+coverage)")
    return (not r, r)


def i7(c, off=frozenset()):
    r = []
    if "subrog_le_payout" not in off and c["subrogation_claim"] > c["payout"] + 1e-9:
        r.append("subrogation exceeds actual payout")
    return (not r, r)


def i8(c, off=frozenset()):
    r = []
    if "cohort_cap" not in off and c["cohort_exposure"] + c["new_payout"] > c["cohort_cap"]:
        r.append("per-cohort exposure cap exceeded")
    return (not r, r)


def i9(c, off=frozenset()):
    r = []
    if "deductible_floor" not in off and c["deductible"] < c["deductible_floor"] - 1e-9:
        r.append("deductible below floor")
    return (not r, r)


def i10(c, off=frozenset()):
    r = []
    if "ref_unique" not in off and not c["reserve_ref_unique"]:
        r.append("reserve_ref not unique")
    if "not_rehyp" not in off and c["rehypothecated"]:
        r.append("reserve rehypothecated")
    if "stack_conservation" not in off and c["stack_total_locked"] < c["max_payout"] - 1e-9:
        r.append("reinsurance stack_total_locked < max_payout")
    if "asset_declared" not in off and not c["reserve_asset_declared"]:
        r.append("reserve asset/custodian not declared")
    if "haircut" not in off and not c["haircut_policy"]:
        r.append("no haircut/peg policy")
    return (not r, r)


def i11(c, off=frozenset()):
    r = []
    if "predicate_bits" not in off and (c["predicate_bits"] & c["required_predicate_bits"]) != c["required_predicate_bits"]:
        r.append("predicate_bits missing required (cover in name only)")
    if "exclusion_bits" not in off and ((c["exclusion_bits"] & ~c["allowed_exclusion_bits"]) != 0
                                        or _pop(c["exclusion_bits"]) > c["max_exclusions"]):
        r.append("exclusions outside allowed / over cap")
    if "window" not in off and not (c["window_min"] <= c["window"] <= c["window_max"]):
        r.append("window out of bounds")
    if "formula" not in off and c["payout_formula"] not in c["allowed_formulas"]:
        r.append("payout_formula not allowed")
    if "floor_ref" not in off and c["floor_ref"] not in c["registered_versions"]:
        r.append("coverage_floor_ref not registered")
    return (not r, r)


def i12(c, off=frozenset()):
    r = []
    if "control_set" not in off and c["insurer"] in c["registered_control_set"]:
        r.append("insurer in registered control-set (wash-insurance)")
    dist = c["control_distance"]  # None = undisclosed → suspect
    if "distance_or_undisclosed" not in off and c["buying_relief"] and (dist is None or dist < c["min_distance"]):
        r.append("low/undisclosed control-distance buying relief")
    return (not r, r)


def i13(c, off=frozenset()):
    r = []
    high = c["value_tier"] >= 3
    captured_or_sole = (not c["floor_independent"]) or c["floor_is_sole_oracle"]
    if "floor_independent_or_capped" not in off and high and captured_or_sole and not c["value_capped"]:
        r.append("high-value insurance on a captured/sole floor without value-cap")
    return (not r, r)


def i14(c, off=frozenset()):
    r = []
    checks = [("active", not c["policy_active"], "policy not active"),
              ("unpaid", c["already_paid"], "already paid (replay)"),
              ("authorized", not c["trigger_authorized"], "trigger not authorized"),
              ("final", not c["trigger_final"], "trigger not final"),
              ("unstayed", c["appeal_stay"], "appeal stay in effect"),
              ("in_window", not c["within_window"], "outside window"),
              ("scope_match", not c["predicate_match"], "predicate/scope mismatch")]
    for sg, bad, msg in checks:
        if sg not in off and bad:
            r.append(msg)
    return (not r, r)


def i15(c, off=frozenset()):
    r = []
    if "signer_authorized" not in off and c["signer"] not in c["authority_set"]:
        r.append("attestation signer not in authority set")
    if "scope_match" not in off and c["scope_hash"] != c["policy_scope"]:
        r.append("attested scope mismatch")
    if "outcome_enum" not in off and c["outcome"] not in c["outcome_enum"]:
        r.append("attested outcome not in enum")
    if "anchored" not in off and not c["attestation_anchored"]:
        r.append("attestation not anchored (replay)")
    return (not r, r)


# ---- gate specs: (id, fn, clean, [(subguard, override), ...]) --------------------------------

GATES = [
    ("I1", i1, {"trigger_type": "attested"},
     [("trigger_kind", {"trigger_type": "insurer_discretion"})]),

    ("I2", i2, {"insurer": "capX", "trade_parties": {"buyer", "seller", "verifier", "arbiter", "floor"}},
     [("insurer_distinct", {"insurer": "seller"})]),

    ("I3", i3, {"reserve": 100.0, "max_payout": 100.0, "prior_exposure": 0.0, "exposure_cap": 1000.0},
     [("reserve_ge_payout", {"reserve": 50.0}),
      ("aggregate_cap", {"prior_exposure": 950.0})]),

    ("I4", i4, {"delivered": True, "payout_direction": "buyer", "buyer_holds_card": True, "return_custody_proof": True},
     [("return_custody", {"return_custody_proof": False})]),

    ("I5", i5, {"rendered_as": "premium_price"},
     [("not_verdict", {"rendered_as": "authenticity_score"})]),

    ("I6", i6, {"import_relief": 0.30, "bootstrap_relief": 0.20, "coverage_relief": 0.30,
                "applied_relief": 0.30, "cap": 0.50, "reserve_locked": True},
     [("nonadditive", {"applied_relief": 0.80}),
      ("solvency_gated", {"reserve_locked": False, "applied_relief": 0.30})]),

    ("I7", i7, {"subrogation_claim": 100.0, "payout": 100.0},
     [("subrog_le_payout", {"subrogation_claim": 150.0})]),

    ("I8", i8, {"cohort_exposure": 600.0, "new_payout": 200.0, "cohort_cap": 1000.0},
     [("cohort_cap", {"cohort_exposure": 900.0})]),

    ("I9", i9, {"deductible": 0.10, "deductible_floor": 0.05},
     [("deductible_floor", {"deductible": 0.00})]),

    ("I10", i10, {"reserve_ref_unique": True, "rehypothecated": False, "stack_total_locked": 100.0,
                  "max_payout": 100.0, "reserve_asset_declared": True, "haircut_policy": True},
     [("ref_unique", {"reserve_ref_unique": False}),
      ("not_rehyp", {"rehypothecated": True}),
      ("stack_conservation", {"stack_total_locked": 60.0}),
      ("asset_declared", {"reserve_asset_declared": False}),
      ("haircut", {"haircut_policy": False})]),

    ("I11", i11, {"predicate_bits": 0b1111, "required_predicate_bits": 0b0111,
                  "exclusion_bits": 0b0001, "allowed_exclusion_bits": 0b0011, "max_exclusions": 2,
                  "window": 90, "window_min": 30, "window_max": 365,
                  "payout_formula": "harm_minus_deductible",
                  "allowed_formulas": {"full_harm", "harm_minus_deductible", "fixed_schedule"},
                  "floor_ref": "auth.v2", "registered_versions": {"auth.v1", "auth.v2"}},
     [("predicate_bits", {"predicate_bits": 0b0011}),          # missing a required bit
      ("exclusion_bits", {"exclusion_bits": 0b1000}),          # an exclusion outside allowed
      ("window", {"window": 10}),                              # below min
      ("formula", {"payout_formula": "token_sum"}),            # not in allowed set
      ("floor_ref", {"floor_ref": "auth.v9"})]),               # not registered

    ("I12", i12, {"insurer": "capX", "registered_control_set": {"seller", "affilA"},
                  "control_distance": 3, "min_distance": 2, "buying_relief": True},
     [("control_set", {"insurer": "affilA"}),
      ("distance_or_undisclosed", {"control_distance": None})]),  # undisclosed = suspect

    ("I13", i13, {"value_tier": 3, "floor_independent": True, "floor_is_sole_oracle": False, "value_capped": False},
     [("floor_independent_or_capped", {"floor_independent": False, "floor_is_sole_oracle": True})]),

    ("I14", i14, {"policy_active": True, "already_paid": False, "trigger_authorized": True,
                  "trigger_final": True, "appeal_stay": False, "within_window": True, "predicate_match": True},
     [("active", {"policy_active": False}),
      ("unpaid", {"already_paid": True}),
      ("authorized", {"trigger_authorized": False}),
      ("final", {"trigger_final": False}),
      ("unstayed", {"appeal_stay": True}),
      ("in_window", {"within_window": False}),
      ("scope_match", {"predicate_match": False})]),

    ("I15", i15, {"signer": "authA", "authority_set": {"authA", "authB"}, "scope_hash": "S",
                  "policy_scope": "S", "outcome": "ruled_loss", "outcome_enum": {"ruled_loss", "no_loss"},
                  "attestation_anchored": True},
     [("signer_authorized", {"signer": "rogue"}),
      ("scope_match", {"scope_hash": "X"}),
      ("outcome_enum", {"outcome": "made_up"}),
      ("anchored", {"attestation_anchored": False})]),
]


def run() -> int:
    print("§12 insurance gates — per-subguard falsification drill\n" + "-" * 64)
    gates_ok = 0
    total_subs = passed_subs = 0
    for gid, fn, clean, subs in GATES:
        ok_clean, _ = fn(clean)
        gate_pass = ok_clean
        detail = []
        for sg, override in subs:
            attack = {**clean, **override}
            blocked = not fn(attack)[0]                      # full gate must block
            admitted = fn(attack, off=frozenset({sg}))[0]    # disabling only this subguard must admit
            teeth = blocked and admitted
            total_subs += 1
            passed_subs += 1 if teeth else 0
            gate_pass = gate_pass and teeth
            detail.append(f"{sg}{'✓' if teeth else '✗(blocked=%s,admit_off=%s)' % (blocked, admitted)}")
        if gate_pass:
            gates_ok += 1
        print(f"[{'PASS' if gate_pass else 'FAIL'}] {gid:4} clean_admits={ok_clean}  "
              f"subguards {sum(1 for s,o in subs if fn({**clean, **o}, off=frozenset({s}))[0] and not fn({**clean, **o})[0])}/{len(subs)}: "
              + ", ".join(detail))
    print("-" * 64)
    print(f"{gates_ok}/{len(GATES)} gates pass · {passed_subs}/{total_subs} subguards have independent teeth")
    return 0 if gates_ok == len(GATES) and passed_subs == total_subs else 1


if __name__ == "__main__":
    raise SystemExit(run())
