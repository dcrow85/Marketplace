#!/usr/bin/env python3
"""Falsification drill for §10 (route authority) + §11 (bilateral reputation)
of Protocol_Verifier_v0.4.md. Deterministic, model-free.

The claim under test: "buyer-designated verification ('route it through MY shop') is a
first-class route, BUT it carries relationship labels and gains settlement power only by
mutual pre-commitment — and the seller can read the verifier's pattern so the buyer's
preference can't trap them." Each rule is one falsification case: a context that must be
BLOCKED from gating settlement (or, for the bilateral read, a seller verdict that must flip
when the reputation vector is two-sided). Every case carries a MUTATION CONTROL — drop the
one guard that should catch it and the case must flip to admit, proving the guard has teeth.

No chain — these are the mechanical/legible binds the contract/agent would apply (§2/§10/§11),
exercised as pure logic so the SPEC is falsifiable. Nothing here is live enforcement.

Run: python3 simulations/buyer_designated_route_drill.py
"""

from __future__ import annotations

from dataclasses import dataclass, replace


@dataclass(frozen=True)
class RouteAttestation:
    subject: str
    verifier: str
    route_class: str            # "neutral" | "buyer_designated"
    authority: str | None       # "private_advisor" | "settlement_verifier" | "dispute_witness"
    gates_settlement: bool      # does this attestation try to gate settlement / create seller liability?
    seller_accepted: bool       # seller pre-accepted {scope,fee,floor,appeal} for this verifier
    buyer_dispute_bond: bool    # buyer posted a dispute bond (seller protection)
    surfaced_label: str         # what the UI claims this route IS
    value_tier: int             # 0..3 ; 3 = grail cell
    raw: bool                   # True = no slab
    group: tuple                # route_classes present on this subject (for N-of-M neutral)
    arbitration_granted: bool = False  # did the arbitration ladder grant a witness authority?


GUARDS = (
    "advisor_ceiling",    # 10.1 private advisor may NOT gate settlement / create seller liability
    "witness_ceiling",    # 10.3 dispute witness is not settlement-final without an arbitration grant
    "seller_acceptance",  # 10.2 buyer-designated settlement verifier needs recorded seller acceptance
    "dispute_bond",       # 10.4 buyer-designated settlement route needs a buyer dispute bond
    "label_honesty",      # 10.6/9.8 buyer-designated must not be surfaced as neutral/independent
    "neutral_coverifier", # 10.6 high-value RAW needs >=1 neutral co-verifier
)


def admit_settlement(att: RouteAttestation, *, disabled: str | None = None) -> tuple[bool, list[str]]:
    """May this attestation gate settlement? Returns (ok, reasons). `disabled` drops one guard."""
    reasons: list[str] = []
    on = lambda g: g != disabled  # noqa: E731

    if att.route_class == "buyer_designated":
        if att.authority == "private_advisor" and att.gates_settlement:
            if on("advisor_ceiling"):
                reasons.append("private advisor cannot gate settlement / create seller liability")
        if att.authority == "dispute_witness" and att.gates_settlement and not att.arbitration_granted:
            if on("witness_ceiling"):
                reasons.append("dispute-witness is not settlement-final without an arbitration grant")
        if att.authority == "settlement_verifier" and att.gates_settlement:
            if on("seller_acceptance") and not att.seller_accepted:
                reasons.append("buyer-designated settlement verifier without recorded seller acceptance")
            if on("dispute_bond") and not att.buyer_dispute_bond:
                reasons.append("buyer-designated settlement route without a buyer dispute bond")
        if on("label_honesty") and att.surfaced_label in ("neutral", "independent"):
            reasons.append("buyer-designated route surfaced as neutral/independent")

    if on("neutral_coverifier") and att.value_tier >= 3 and att.raw and "neutral" not in att.group:
        reasons.append("high-value RAW requires a neutral co-verifier")

    return (not reasons, reasons)


# --- §11 bilateral read: the seller's verdict must flip when the vector is two-sided ----------

def seller_verdict(rec: dict, *, two_sided: bool) -> str:
    """A one-sided reputation (only false-PASS matters) calls an over-harsh shop 'safe' because
    it never lets a fake through. A two-sided vector also reads overturn-on-appeal and
    false-REJECT, exposing the abusive/over-harsh shop."""
    if not two_sided:
        return "accept" if rec["false_pass_rate"] < 0.05 else "reject"
    if rec["overturn_rate"] > 0.30 or rec["false_reject_rate"] > 0.30:
        return "reject/counter"
    if rec.get("underpowered"):
        return "accept-with-neutral-co-verifier"
    return "accept"


def clean() -> RouteAttestation:
    """A fully admissible buyer-designated settlement route: seller pre-accepted, bond posted,
    honestly labeled, modest value."""
    return RouteAttestation(
        subject="card-001", verifier="my-shop", route_class="buyer_designated",
        authority="settlement_verifier", gates_settlement=True, seller_accepted=True,
        buyer_dispute_bond=True, surfaced_label="buyer-designated", value_tier=1, raw=True,
        group=("buyer_designated",),
    )


def run() -> int:
    base = clean()
    ok, why = admit_settlement(base)
    assert ok, f"baseline buyer-designated route must admit, got {why}"

    cases = [
        ("private advisor cannot gate settlement",
         replace(base, authority="private_advisor"), "advisor_ceiling"),
        ("dispute witness not settlement-final without grant",
         replace(base, authority="dispute_witness", arbitration_granted=False), "witness_ceiling"),
        ("buyer-designated settlement verifier needs seller acceptance",
         replace(base, seller_accepted=False), "seller_acceptance"),
        ("buyer-designated settlement route needs a buyer dispute bond",
         replace(base, buyer_dispute_bond=False), "dispute_bond"),
        ("buyer-designated must not be surfaced as neutral/independent",
         replace(base, surfaced_label="neutral"), "label_honesty"),
        ("high-value RAW needs a neutral co-verifier",
         replace(base, value_tier=3, raw=True, group=("buyer_designated",)), "neutral_coverifier"),
    ]

    print("§10/§11 buyer-designated route — falsification drill\n" + "-" * 60)
    passed = 0
    for name, att, guard in cases:
        ok_full, why = admit_settlement(att)
        blocked = not ok_full
        admitted_without_guard, _ = admit_settlement(att, disabled=guard)
        teeth = blocked and admitted_without_guard
        if teeth:
            passed += 1
        print(f"[{'PASS' if teeth else 'FAIL'}] {name}")
        print(f"        blocked={blocked}  (reasons: {', '.join(why) or '—'})")
        print(f"        teeth: removing `{guard}` -> admits={admitted_without_guard}")

    # §11 bilateral read: an over-harsh shop (never false-passes, but broadly overturned)
    over_harsh = {"false_pass_rate": 0.01, "overturn_rate": 0.50, "false_reject_rate": 0.40}
    two = seller_verdict(over_harsh, two_sided=True)
    one = seller_verdict(over_harsh, two_sided=False)
    teeth7 = two.startswith("reject") and one == "accept"
    if teeth7:
        passed += 1
    print(f"[{'PASS' if teeth7 else 'FAIL'}] seller reads trusted-by-data vs trusted-by-buyer")
    print(f"        two-sided verdict={two!r}; one-sided (false-pass only) verdict={one!r}")

    total = len(cases) + 1
    print("-" * 60)
    print(f"{passed}/{total} cases pass WITH TEETH "
          f"(blocked/flipped under the full rule AND admitted/missed once the guard is removed)")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(run())
