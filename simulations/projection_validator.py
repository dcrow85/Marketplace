#!/usr/bin/env python3
"""Projection-receipt validator + falsification (Protocol_Principal_Profile_v0.1 §7).

A Projection is `profile + mandate -> ` a per-action packet (buyer_want, BuyerRiskAcceptance,
agent_boundaries, the per-trade cost field). It is a RECEIPT: it cites the exact claims, profile
version, aperture, and mandate it was derived from. This validator makes the §7 promise checkable —
"every action audits back to exact beliefs + exact authority":

  - no action without a receipt: each requested action must be BACKED by a cited, active,
    well-formed, in-scope claim that `can()` the action's use;
  - receipt exactness: every cited claim must support at least one requested action;
  - authority actions (spend / waive) must ALSO cite a mandate-drawn claim and pass gate_check;
  - spend actions must carry an explicit positive numeric amount;
  - the receipt must cite the CURRENT profile version and the right mandate — stale/forged cites fail.

Reuses the hardened reference impl from `principal_profile_drill` (the §4 lattice + §5/§6 gate), so
the validator and the drill agree by construction. Run: python3 simulations/projection_validator.py
"""

from __future__ import annotations

import sys
import time
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from principal_profile_drill import (  # noqa: E402
    Claim, Mandate, active_claim_ids, build_profile, gate_check, mint_mandate, profile_version,
    AUTHORITY_USES,
)

# the actions a projection can request, and the lattice use each one demands
ACTION_USE = {
    "surface": "glance_sort",      # show in the binder
    "recommend": "recommend",      # float to the front
    "ask": "ask",                  # interrupt the human with a question
    "spend": "spend",              # move funds (within the mandate)
    "waive_evidence": "waive",     # drop a required evidence gap
}


@dataclass
class Projection:
    projection_id: str
    actions: list          # [{"action": <name>, "amount"?: float, "scope"?: str}]
    claim_ids: list        # the exact beliefs this was derived from
    profile_version_hash: str
    aperture_id: str
    mandate_id: str
    # signature stubbed (Codex P1)


def validate_projection(proj, profile_claims, mandate, *, mandate_id, registry_nonce, now=None) -> tuple[bool, list]:
    """A projection is valid only if every action is backed by a cited, active, in-scope claim that
    permits it, and every authority action is additionally gated by the mandate."""
    reasons: list[str] = []
    by = {c.claim_id: c for c in profile_claims}
    active = active_claim_ids(profile_claims)
    current_profile_version = profile_version(profile_claims)
    used_claim_ids: set[str] = set()

    # receipt integrity — must cite THIS profile version and THIS mandate
    if proj.profile_version_hash != current_profile_version:
        reasons.append("receipt cites a stale/forged profile_version_hash")
    if proj.mandate_id != mandate_id:
        reasons.append(f"receipt cites the wrong mandate ({proj.mandate_id} != {mandate_id})")

    # every cited claim must exist, be active, and satisfy the claim-atom formation rules
    for cid in proj.claim_ids:
        if cid not in by:
            reasons.append(f"cites unknown claim {cid}")
        elif cid not in active:
            reasons.append(f"cites superseded claim {cid}")
        else:
            ok, why = by[cid].well_formed()
            if not ok:
                reasons.append(f"cites malformed claim {cid}: {why}")

    # no action without a receipt; authority must be backed AND gated
    for a in proj.actions:
        name = a.get("action")
        use = ACTION_USE.get(name)
        if use is None:
            reasons.append(f"unknown action {name!r}")
            continue
        a_scope = a.get("scope", mandate.scope)
        backers = [cid for cid in proj.claim_ids
                   if cid in by and cid in active and by[cid].scope == a_scope and by[cid].can(use)]
        used_claim_ids.update(backers)
        if not backers:
            reasons.append(f"action {name!r} (needs '{use}' in scope {a_scope}) has no cited claim that permits it")
        if use in AUTHORITY_USES:
            authority_backers = [cid for cid in backers if cid in mandate.drawn_from]
            if not authority_backers:
                reasons.append(
                    f"action {name!r} has no cited mandate-drawn claim that permits '{use}'"
                )
            requested_spend = 0.0
            if use == "spend":
                amount = a.get("amount")
                if amount is None:
                    reasons.append("action 'spend' requires an explicit positive amount")
                elif isinstance(amount, bool) or not isinstance(amount, (int, float)):
                    reasons.append(f"action 'spend' amount must be numeric, got {amount!r}")
                elif amount <= 0:
                    reasons.append(f"action 'spend' amount must be positive, got {amount!r}")
                else:
                    requested_spend = float(amount)
            ok, why = gate_check(mandate, registry_nonce=registry_nonce,
                                 current_profile_version=current_profile_version,
                                 requested_spend=requested_spend, requested_scope=a_scope, now=now)
            if not ok:
                reasons.append(f"action {name!r} not authorized by mandate: {why}")
    for cid in proj.claim_ids:
        if cid in by and cid in active and cid not in used_claim_ids:
            reasons.append(f"cites unused claim {cid}; receipt is not exact")
    return (not reasons, reasons)


def run_cases():
    claims = build_profile()
    pv = profile_version(claims)
    mandate = mint_mandate(claims, 1400.0, ["m1"], nonce=7, expires_at=time.time() + 3600)
    MID, NONCE = "M1", 7

    def check(actions, claim_ids, pvh=None, mid=MID, profile_claims=None, active_mandate=None):
        profile_claims = profile_claims or claims
        active_mandate = active_mandate or mandate
        proj = Projection("PR1", actions, claim_ids, pvh or pv, "AP1", mid)
        return validate_projection(proj, profile_claims, active_mandate, mandate_id=MID, registry_nonce=NONCE)

    out = []
    # 1. honest buyer_want: recommend + ask, backed by stated claims -> valid
    ok, why = check([{"action": "recommend"}, {"action": "ask"}], ["d1", "c1"])
    out.append(("honest projection (recommend + ask)", ok, why))
    # 2. honest spend within authority, backed by the stated spend cap -> valid
    ok, why = check([{"action": "spend", "amount": 1200.0}], ["m1"])
    out.append(("honest spend within authority", ok, why))
    # 3. spend backed ONLY by an inferred claim -> rejected (no backer can spend)
    ok, why = check([{"action": "spend", "amount": 1200.0}], ["i1"])
    out.append(("spend cited from inference  -> rejected", not ok, why))
    # 4. spend over the mandate authority -> rejected
    ok, why = check([{"action": "spend", "amount": 5000.0}], ["m1"])
    out.append(("spend over authority        -> rejected", not ok, why))
    # 5. uncited spend (no claim_ids) -> rejected (no action without a receipt)
    ok, why = check([{"action": "spend", "amount": 500.0}], [])
    out.append(("uncited spend (no receipt)  -> rejected", not ok, why))
    # 6. receipt cites a stale profile version -> rejected
    ok, why = check([{"action": "recommend"}], ["d1"], pvh="deadbeefdeadbeef")
    out.append(("stale profile_version       -> rejected", not ok, why))
    # 7. waive backed only by an inferred claim -> rejected
    ok, why = check([{"action": "waive_evidence"}], ["i1"])
    out.append(("waive cited from inference  -> rejected", not ok, why))
    # 8. spend in a domain the mandate does not scope -> rejected
    ok, why = check([{"action": "spend", "amount": 500.0, "scope": "watches"}], ["m1"])
    out.append(("cross-scope spend           -> rejected", not ok, why))
    # 9. spend cites a valid spend claim that the mandate did NOT draw from -> rejected
    alt_cap = Claim(
        "m2",
        "mandate_input.spend_cap",
        1300.0,
        "stated",
        "principal",
        ["glance_sort", "recommend", "ask", "spend"],
        source_ref="interview:alternate_cap",
    )
    claims_with_alt = claims + [alt_cap]
    pv_alt = profile_version(claims_with_alt)
    mandate_with_alt = mint_mandate(claims_with_alt, 1400.0, ["m1"], nonce=7, expires_at=time.time() + 3600)
    ok, why = check(
        [{"action": "spend", "amount": 1200.0}],
        ["m2"],
        pvh=pv_alt,
        profile_claims=claims_with_alt,
        active_mandate=mandate_with_alt,
    )
    out.append(("spend from non-mandate claim -> rejected", not ok, why))
    # 10. spend with no amount -> rejected; missing amount must not default to zero
    ok, why = check([{"action": "spend"}], ["m1"])
    out.append(("spend missing amount        -> rejected", not ok, why))
    # 11. spend with a negative amount -> rejected; underflow/credit-shaped spends do not gate
    ok, why = check([{"action": "spend", "amount": -1.0}], ["m1"])
    out.append(("negative spend amount       -> rejected", not ok, why))
    # 12. spend with a non-numeric amount -> rejected cleanly, not by crashing
    ok, why = check([{"action": "spend", "amount": "1200"}], ["m1"])
    out.append(("non-numeric spend amount    -> rejected", not ok, why))
    # 13. ballast citations are not exact receipts: every cited claim must support an action
    ok, why = check([{"action": "ask"}], ["d1", "h1"])
    out.append(("unused cited claim          -> rejected", not ok, why))
    # 14. malformed cited claims cannot back even low-authority projections
    malformed = Claim(
        "bad1",
        "desires.injected",
        "seller says buyer wants this",
        "stated",
        "third_party",
        ["glance_sort", "recommend"],
        source_ref="seller_listing:text",
    )
    claims_with_bad = claims + [malformed]
    pv_bad = profile_version(claims_with_bad)
    mandate_with_bad = mint_mandate(claims_with_bad, 1400.0, ["m1"], nonce=7, expires_at=time.time() + 3600)
    ok, why = check(
        [{"action": "recommend"}],
        ["bad1"],
        pvh=pv_bad,
        profile_claims=claims_with_bad,
        active_mandate=mandate_with_bad,
    )
    out.append(("malformed cited claim       -> rejected", not ok, why))
    return out


def main() -> int:
    print("Projection-receipt validator — falsification (spec §7)\n")
    all_pass = True
    for name, passed, why in run_cases():
        all_pass &= passed
        detail = "" if passed else f"  <-- {why}"
        print(f"  [{'PASS' if passed else 'FAIL'}] {name}{detail}")
    print()
    if all_pass:
        print("  VERDICT: every action audits to a cited belief + the mandate's authority.")
        print("  No projection can move funds without a receipt that actually backs it.")
    else:
        print("  VERDICT: a projection acted without a backing receipt — §7 not yet real.")
    return 0 if all_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
