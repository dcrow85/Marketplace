#!/usr/bin/env python3
"""Falsification drill for the §5 gates (G5.1–G5.10) of Protocol_Judgment_Independence_v0.3.md.
Deterministic, model-free.

PER-SUBGUARD TEETH: each compound gate is mutated ONE SUBCLAUSE at a time. For every
subguard, an attack violating only it must (a) BLOCK under the full gate, and (b) flip to
ADMIT when only that subguard is disabled. Each gate fn takes `off` = subguard ids to
disable; attacks are {**clean, **override}. Also asserts the G5.3<->G5.8 reconciliation.
Not live enforcement; mirrors the admission rules the Solidity surface must bind. On-chain
binding is Codex's lane.

Run: python3 simulations/judgment_independence_drill.py
"""

from __future__ import annotations


def g51(c, off=frozenset()):  # Non-party
    r = []
    if "non_party" not in off and c["authority"] in c["trade_parties"]:
        r.append("authority is a trade party")
    return (not r, r)


def g52(c, off=frozenset()):  # Role-exclusivity
    r = []
    if "role_exclusive" not in off and len(c["roles_held"]) > 1:
        r.append("address holds >1 judgment role on the subject")
    return (not r, r)


def g53(c, off=frozenset()):  # Registered control-distance (reconciled with G5.8)
    r = []
    if "control_set" not in off and c["authority"] in c["registered_control_set"]:
        r.append("authority in a party's registered control-set")
    dist = c["control_distance"]  # None = undisclosed
    if "distance_or_undisclosed" not in off and c["is_authority"]:
        undisclosed = dist is None
        low_undowngraded = (dist is not None and dist < c["min_distance"] and not c["value_capped"])
        if undisclosed or low_undowngraded:
            r.append("low/undisclosed control-distance (not a disclosed value-capped downgrade)")
    return (not r, r)


def g54(c, off=frozenset()):  # Non-sole-oracle + bound panel composition
    r = []
    if "needs_panel_or_cap" not in off and c["resolver_count"] < c["M"] and not c["value_capped"]:
        r.append("value-moving resolution below panel size and not value-capped")
    if "high_value_needs_panel" not in off and c["value_tier"] >= 3 and c["resolver_count"] < c["M"]:
        r.append("high-value resolution on a single/sub-panel oracle")
    if "member_distinct" not in off and len(set(c["members"])) < c["M"]:
        r.append("panel members not M distinct (sock-puppets)")
    if "per_member_g5" not in off and not all(c["member_g5_ok"]):
        r.append("a panel member fails its own G5")
    if "mofn_sigs" not in off and c["valid_sigs"] < c["M"]:
        r.append("fewer than M valid member signatures")
    if "registered_pairwise_conflict" not in off and c["members_registered_conflict"]:
        r.append("panel members have a registered common-control conflict (registry ref)")
    return (not r, r)


def g55(c, off=frozenset()):  # Appeal finality state machine (not just a stay)
    r = []
    if "appeal_window" not in off and c["value_moving"] and not c["appeal_window_present"]:
        r.append("value-moving ruling with no appeal window")
    if "appeal_independent" not in off and c["value_moving"] and not c["appeal_authority_independent"]:
        r.append("appeal authority is not independent")
    if "execution_stay" not in off and c["value_moving"] and c["value_moved_before_window_close"]:
        r.append("value moved before the appeal window closed (no execution stay)")
    if "appeal_state_final" not in off and c["value_moving"] and c["finalizing"] and c["appeal_state"] != "final":
        r.append("value finalized while appeal not in state 'final'")
    if "appeal_bond" not in off and c["appeal_filed"] and not c["appeal_bond_posted"]:
        r.append("appeal filed without an appeal bond (griefing)")
    if "stay_bounded" not in off and c["value_moving"] and c["stay_elapsed"] > c["max_stay"]:
        r.append("stay exceeds the bounded maximum (infinite-appeal griefing)")
    return (not r, r)


def g56(c, off=frozenset()):  # Pairing/rotation cap
    r = []
    if "pairing_cap" not in off and c["pair_count"] >= c["pair_cap"]:
        r.append("authority-party pairing over correlation cap")
    return (not r, r)


def g57(c, off=frozenset()):  # Disclosure binding + structured ex-ante disclosure
    r = []
    if "disclosure_anchored" not in off and not c["disclosure_anchored"]:
        r.append("disclosure not hash-anchored at assignment")
    if "no_undisclosed_discovered" not in off and c["undisclosed_relationship_found"]:
        r.append("undisclosed relationship discovered (slashable + re-open)")
    if "structured_disclosure" not in off and not c["disclosure_structured"]:
        r.append("disclosure opaque (not structured for ex-ante routing)")
    return (not r, r)


def g58(c, off=frozenset()):  # Independence downgrade ladder
    r = []
    if "must_downgrade" not in off and not c["required_tier_available"] and c["chosen_mode"] not in c["downgrade_ladder"]:
        r.append("required-tier authority unavailable and route did not downgrade")
    if "captured_needs_cap" not in off and c["authority_party_adjacent"] and not c["value_capped"]:
        r.append("party-adjacent authority without a value-cap")
    return (not r, r)


def g59(c, off=frozenset()):  # Sparse-truth anchor — structured (exposure/capital/tail/audit/slash/control)
    r = []
    high = c["value_tier"] >= 3
    if "anchor_capital" not in off and high and c["capital"] < c["exposure"]:
        r.append("anchor capital < exposure")
    if "anchor_tail" not in off and high and not c["tail"]:
        r.append("anchor has no tail (does not outlive settlement)")
    if "anchor_audit" not in off and high and not c["audit_regime"]:
        r.append("anchor has no audit regime")
    if "anchor_slash" not in off and high and not c["slash_condition"]:
        r.append("anchor has no slash condition")
    if "anchor_control" not in off and high and not c["anchor_provider_independent"]:
        r.append("anchor provider not independent")
    if "no_calibration_weight_underpowered" not in off and c["cell_underpowered"] and c["relies_on_calibration"]:
        r.append("underpowered cell leaning on calibration weight")
    return (not r, r)


def g510(c, off=frozenset()):  # JudgmentEligibleSet integrity
    r = []
    if "committed_root" not in off and not c["member_in_committed_root"]:
        r.append("panel member not in the committed eligible-set root")
    if "non_party_selection" not in off and c["selection_shaped_by_party"]:
        r.append("panel selection seed/path shaped by a trade party")
    if "member_g5_ref" not in off and not c["all_members_have_g5_ref"]:
        r.append("an eligible-set member lacks a G5/registry ref")
    if "governance_party_independent" not in off and not c["governance_party_independent"]:
        r.append("eligible-set governance is a trade party")
    if "set_versioned" not in off and not c["set_version_registered"]:
        r.append("eligible-set version not registered")
    return (not r, r)


GATES = [
    ("G5.1", g51, {"authority": "judgeX", "trade_parties": {"buyer", "seller", "custodian", "insurer"}},
     [("non_party", {"authority": "seller"})]),

    ("G5.2", g52, {"roles_held": {"floor"}},
     [("role_exclusive", {"roles_held": {"arbiter", "floor"}})]),

    ("G5.3", g53, {"authority": "judgeX", "registered_control_set": {"seller", "affilA"},
                   "control_distance": 3, "min_distance": 2, "is_authority": True, "value_capped": False},
     [("control_set", {"authority": "affilA"}),
      ("distance_or_undisclosed", {"control_distance": None})]),

    ("G5.4", g54, {"resolver_count": 3, "M": 3, "value_tier": 3, "value_capped": False,
                   "members": ["a", "b", "c"], "member_g5_ok": [True, True, True], "valid_sigs": 3,
                   "members_registered_conflict": False},
     [("needs_panel_or_cap", {"value_tier": 1, "resolver_count": 1}),
      ("high_value_needs_panel", {"resolver_count": 1, "value_capped": True}),
      ("member_distinct", {"members": ["a", "a", "b"]}),
      ("per_member_g5", {"member_g5_ok": [True, False, True]}),
      ("mofn_sigs", {"valid_sigs": 2}),
      ("registered_pairwise_conflict", {"members_registered_conflict": True})]),

    ("G5.5", g55, {"value_moving": True, "appeal_window_present": True,
                   "appeal_authority_independent": True, "value_moved_before_window_close": False,
                   "finalizing": True, "appeal_state": "final", "appeal_filed": False,
                   "appeal_bond_posted": True, "stay_elapsed": 10, "max_stay": 100},
     [("appeal_window", {"appeal_window_present": False}),
      ("appeal_independent", {"appeal_authority_independent": False}),
      ("execution_stay", {"value_moved_before_window_close": True}),
      ("appeal_state_final", {"appeal_state": "pending"}),
      ("appeal_bond", {"appeal_filed": True, "appeal_bond_posted": False}),
      ("stay_bounded", {"stay_elapsed": 999})]),

    ("G5.6", g56, {"pair_count": 1, "pair_cap": 3},
     [("pairing_cap", {"pair_count": 3})]),

    ("G5.7", g57, {"disclosure_anchored": True, "undisclosed_relationship_found": False, "disclosure_structured": True},
     [("disclosure_anchored", {"disclosure_anchored": False}),
      ("no_undisclosed_discovered", {"undisclosed_relationship_found": True}),
      ("structured_disclosure", {"disclosure_structured": False})]),

    ("G5.8", g58, {"required_tier_available": True, "chosen_mode": "independent_panel",
                   "downgrade_ladder": ["independent_panel", "independent_single", "advisor_only", "manual_escrow"],
                   "authority_party_adjacent": False, "value_capped": False},
     [("must_downgrade", {"required_tier_available": False, "chosen_mode": "independent_panel",
                          "downgrade_ladder": ["advisor_only", "manual_escrow"]}),
      ("captured_needs_cap", {"authority_party_adjacent": True})]),

    ("G5.9", g59, {"value_tier": 3, "exposure": 100.0, "capital": 100.0, "tail": True,
                   "audit_regime": True, "slash_condition": True, "anchor_provider_independent": True,
                   "cell_underpowered": True, "relies_on_calibration": False},
     [("anchor_capital", {"capital": 50.0}),
      ("anchor_tail", {"tail": False}),
      ("anchor_audit", {"audit_regime": False}),
      ("anchor_slash", {"slash_condition": False}),
      ("anchor_control", {"anchor_provider_independent": False}),
      ("no_calibration_weight_underpowered", {"relies_on_calibration": True})]),

    ("G5.10", g510, {"member_in_committed_root": True, "selection_shaped_by_party": False,
                     "all_members_have_g5_ref": True, "governance_party_independent": True,
                     "set_version_registered": True},
     [("committed_root", {"member_in_committed_root": False}),
      ("non_party_selection", {"selection_shaped_by_party": True}),
      ("member_g5_ref", {"all_members_have_g5_ref": False}),
      ("governance_party_independent", {"governance_party_independent": False}),
      ("set_versioned", {"set_version_registered": False})]),
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
            detail.append(f"{sg}{'✓' if teeth else '✗(blk=%s,adm=%s)' % (blocked, admitted)}")
        if gate_pass:
            gates_ok += 1
        print(f"[{'PASS' if gate_pass else 'FAIL'}] {gid:6} clean={ok_clean}  "
              f"{len(subs)} subguard(s): " + ", ".join(detail))

    # G5.3<->G5.8 reconciliation: a DISCLOSED-low + value-capped authorized downgrade must ADMIT.
    recon_ctx = {"authority": "judgeX", "registered_control_set": {"seller"}, "control_distance": 1,
                 "min_distance": 2, "is_authority": True, "value_capped": True}
    recon_ok = g53(recon_ctx)[0]
    print("-" * 66)
    print(f"G5.3<->G5.8 reconciliation: disclosed-low(+value-capped) downgrade admits = {recon_ok}")
    print(f"{gates_ok}/{len(GATES)} gates pass · {passed_subs}/{total_subs} subguards have independent teeth")
    return 0 if gates_ok == len(GATES) and passed_subs == total_subs and recon_ok else 1


if __name__ == "__main__":
    raise SystemExit(run())
