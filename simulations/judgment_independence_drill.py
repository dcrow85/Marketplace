#!/usr/bin/env python3
"""Falsification drill for the §5 gates (G5.1–G5.8) of Protocol_Judgment_Independence_v0.1.md.
Deterministic, model-free.

PER-SUBGUARD TEETH: each compound gate is mutated ONE SUBCLAUSE at a time. For every
subguard, an attack violating only it must (a) BLOCK under the full gate, and (b) flip to
ADMIT when only that subguard is disabled — proving each subcondition is independently
load-bearing. Each gate fn takes `off` = a set of subguard ids to disable; attacks are
{**clean, **override}. Not live enforcement; mirrors the admission rules the Solidity
judgment-independence surface must bind. On-chain binding is Codex's lane.

Run: python3 simulations/judgment_independence_drill.py
"""

from __future__ import annotations


def g51(c, off=frozenset()):  # Non-party
    r = []
    if "non_party" not in off and c["authority"] in c["trade_parties"]:
        r.append("authority is a trade party (buyer/seller/custodian/insurer)")
    return (not r, r)


def g52(c, off=frozenset()):  # Role-exclusivity
    r = []
    if "role_exclusive" not in off and len(c["roles_held"]) > 1:
        r.append(f"address holds >1 judgment role on the subject ({sorted(c['roles_held'])})")
    return (not r, r)


def g53(c, off=frozenset()):  # Registered control-distance
    r = []
    if "control_set" not in off and c["authority"] in c["registered_control_set"]:
        r.append("authority in a party's registered control-set")
    dist = c["control_distance"]  # None = undisclosed → suspect
    if "distance_or_undisclosed" not in off and c["is_authority"] and (dist is None or dist < c["min_distance"]):
        r.append("low/undisclosed control-distance authority")
    return (not r, r)


def g54(c, off=frozenset()):  # Non-sole-oracle (N-of-M) at value
    r = []
    if "needs_panel_or_cap" not in off and c["resolver_count"] < c["M"] and not c["value_capped"]:
        r.append("value-moving resolution below panel size and not value-capped")
    if "high_value_needs_panel" not in off and c["value_tier"] >= 3 and c["resolver_count"] < c["M"]:
        r.append("high-value resolution relies on a single/sub-panel oracle (cap insufficient)")
    return (not r, r)


def g55(c, off=frozenset()):  # Appeal before finality
    r = []
    if "appeal_window" not in off and c["value_moving"] and not c["appeal_window_present"]:
        r.append("value-moving ruling finalized with no appeal window")
    if "appeal_independent" not in off and c["value_moving"] and not c["appeal_authority_independent"]:
        r.append("appeal authority is not independent")
    return (not r, r)


def g56(c, off=frozenset()):  # Pairing/rotation cap
    r = []
    if "pairing_cap" not in off and c["pair_count"] >= c["pair_cap"]:
        r.append("authority-party pairing over correlation cap")
    return (not r, r)


def g57(c, off=frozenset()):  # Disclosure binding + discovery slash
    r = []
    if "disclosure_anchored" not in off and not c["disclosure_anchored"]:
        r.append("authority disclosure not hash-anchored at assignment")
    if "no_undisclosed_discovered" not in off and c["undisclosed_relationship_found"]:
        r.append("undisclosed relationship discovered (slashable + re-open)")
    return (not r, r)


def g58(c, off=frozenset()):  # Independence downgrade ladder
    r = []
    if "must_downgrade" not in off and not c["required_tier_available"] and c["chosen_mode"] not in c["downgrade_ladder"]:
        r.append("required-tier authority unavailable and route did not downgrade")
    if "captured_needs_cap" not in off and c["authority_party_adjacent"] and not c["value_capped"]:
        r.append("proceeded with a party-adjacent authority without a value-cap")
    return (not r, r)


GATES = [
    ("G5.1", g51, {"authority": "judgeX", "trade_parties": {"buyer", "seller", "custodian", "insurer"}},
     [("non_party", {"authority": "seller"})]),

    ("G5.2", g52, {"roles_held": {"floor"}},
     [("role_exclusive", {"roles_held": {"arbiter", "floor"}})]),

    ("G5.3", g53, {"authority": "judgeX", "registered_control_set": {"seller", "affilA"},
                   "control_distance": 3, "min_distance": 2, "is_authority": True},
     [("control_set", {"authority": "affilA"}),
      ("distance_or_undisclosed", {"control_distance": None})]),

    ("G5.4", g54, {"resolver_count": 3, "M": 3, "value_tier": 3, "value_capped": False},
     [("needs_panel_or_cap", {"value_tier": 1, "resolver_count": 1}),   # low value, single floor, no cap
      ("high_value_needs_panel", {"resolver_count": 1, "value_capped": True})]),  # high value, capped but no panel

    ("G5.5", g55, {"value_moving": True, "appeal_window_present": True, "appeal_authority_independent": True},
     [("appeal_window", {"appeal_window_present": False}),
      ("appeal_independent", {"appeal_authority_independent": False})]),

    ("G5.6", g56, {"pair_count": 1, "pair_cap": 3},
     [("pairing_cap", {"pair_count": 3})]),

    ("G5.7", g57, {"disclosure_anchored": True, "undisclosed_relationship_found": False},
     [("disclosure_anchored", {"disclosure_anchored": False}),
      ("no_undisclosed_discovered", {"undisclosed_relationship_found": True})]),

    ("G5.8", g58, {"required_tier_available": True, "chosen_mode": "independent_panel",
                   "downgrade_ladder": ["independent_panel", "independent_single", "advisor_only", "manual_escrow"],
                   "authority_party_adjacent": False, "value_capped": False},
     [("must_downgrade", {"required_tier_available": False, "chosen_mode": "independent_panel",
                          "downgrade_ladder": ["advisor_only", "manual_escrow"]}),
      ("captured_needs_cap", {"authority_party_adjacent": True})]),
]


def run() -> int:
    print("§5 judgment-independence (G5) — per-subguard falsification drill\n" + "-" * 66)
    gates_ok = 0
    total_subs = passed_subs = 0
    for gid, fn, clean, subs in GATES:
        ok_clean, _ = fn(clean)
        gate_pass = ok_clean
        detail = []
        for sg, override in subs:
            attack = {**clean, **override}
            blocked = not fn(attack)[0]
            admitted = fn(attack, off=frozenset({sg}))[0]
            teeth = blocked and admitted
            total_subs += 1
            passed_subs += 1 if teeth else 0
            gate_pass = gate_pass and teeth
            detail.append(f"{sg}{'✓' if teeth else '✗(blk=%s,adm_off=%s)' % (blocked, admitted)}")
        if gate_pass:
            gates_ok += 1
        print(f"[{'PASS' if gate_pass else 'FAIL'}] {gid:5} clean_admits={ok_clean}  "
              f"{len(subs)} subguard(s): " + ", ".join(detail))
    print("-" * 66)
    print(f"{gates_ok}/{len(GATES)} gates pass · {passed_subs}/{total_subs} subguards have independent teeth")
    return 0 if gates_ok == len(GATES) and passed_subs == total_subs else 1


if __name__ == "__main__":
    raise SystemExit(run())
