#!/usr/bin/env python3
"""Falsification drill for the §9 shop-network conflict & routing model
(Protocol_Verifier_v0.3.md). Deterministic, model-free.

The claim under test: "shops supply verifier capacity, cleanly, IF the mechanical
routing/conflict binds hold." Each bind is one falsification case below: a context
that MUST be rejected by the admission gate (or, for scoring, flagged). To prove a
guard is not decorative, every case is paired with a MUTATION CONTROL — the same
context run against a gate with that one guard removed, which MUST then admit. A
guard that blocks the attack but whose removal changes nothing has no teeth.

No network, no model, no chain — these are the mechanical binds the contract would
enforce (§2 / §9), exercised as pure logic so the SPEC is falsifiable before a line
of Solidity exists. Nothing here is live enforcement.

Run: python3 simulations/shop_verifier_conflict_drill.py
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace


# --- the world the gate reads (all LEGIBLE inputs; the gate enforces the MECHANICAL subset) ---

@dataclass(frozen=True)
class Fee:
    kind: str            # "flat" | "percent" | "success"
    payer: str           # "buyer" | "escrow" | "seller"
    outcome_independent: bool


@dataclass(frozen=True)
class Assignment:
    subject: str
    verifier: str
    eligible_root: frozenset       # the COMMITTED eligible set (root) for this subject
    selection_mode: str            # "seeded_random" | "buyer_policy" | "seller_picked"
    receipt: bool                  # a signed, reproducible assignment receipt exists
    buyer_waiver: bool = False     # only a buyer-signed waiver may open a seller override


@dataclass(frozen=True)
class Attestation:
    subject: str
    verifier: str
    fee: Fee
    assignment: Assignment
    value_tier: int                # 0..3 ; 3 = high-value grail cell
    raw: bool                      # True = no slab (the worst cell when high value)
    bond_locked: bool = True
    method_physical_contact: bool = True
    group_size: int = 1            # how many independent verifier addresses on this subject


@dataclass(frozen=True)
class World:
    # registry of same-subject economic exposure: subject -> {addresses with a stake}
    same_subject_exposure: dict = field(default_factory=dict)
    # pair history: (verifier, counterparty) -> count of prior verifications
    pair_counts: dict = field(default_factory=dict)
    pair_cap: int = 3
    n_of_m_for_high_value_raw: int = 2

    def exposed(self, addr: str, subject: str) -> bool:
        return addr in self.same_subject_exposure.get(subject, set())

    def pair_over_cap(self, a: str, b: str) -> bool:
        return self.pair_counts.get((a, b), 0) >= self.pair_cap


# --- the admission gate: the §2/§9 ENFORCED binds, each toggleable so a control can drop one ---

GUARDS = (
    "same_subject",   # 9.1 forbidden primitive: verifier has same-subject exposure
    "routing",        # 9.5 assignment must come from committed set, blind, receipted
    "override",       # 9.5 seller override needs a buyer-signed waiver
    "fee",            # 9.3 flat, outcome-independent, buyer/escrow-paid
    "pair_cap",       # 9.7 reciprocal-pair correlation cap
    "n_of_m",         # 8/9.2 high-value RAW needs N independent verifier addresses
    "committed_set",  # 9.5 router cannot assign outside the committed eligible root
)


def admit(att: Attestation, w: World, *, disabled: str | None = None) -> tuple[bool, list[str]]:
    """Return (admitted, rejection_reasons). `disabled` drops exactly one guard (the
    mutation control); with no guard disabled this is the full v0.3 §2/§9 gate."""
    reasons: list[str] = []
    on = lambda g: g != disabled  # noqa: E731

    a = att.assignment

    if on("same_subject") and w.exposed(att.verifier, att.subject):
        reasons.append("verifier has same-subject economic exposure (own/sell/consign/custody)")

    if on("committed_set") and att.verifier not in a.eligible_root:
        reasons.append("verifier not in the committed eligible set")

    if on("routing"):
        if not a.receipt:
            reasons.append("no signed assignment receipt")
        # blind modes + the seller_picked OVERRIDE path are the only known modes;
        # whether the override path is permitted is the `override` guard's job, below.
        if a.selection_mode not in ("seeded_random", "buyer_policy", "seller_picked"):
            reasons.append(f"unknown selection mode ({a.selection_mode})")

    # the seller-picked override path is admissible ONLY behind a buyer-signed waiver
    if on("override") and a.selection_mode == "seller_picked" and not a.buyer_waiver:
        reasons.append("seller-picked verifier without a buyer-signed waiver")

    if on("fee"):
        if att.fee.kind != "flat" or not att.fee.outcome_independent:
            reasons.append(f"fee not flat/outcome-independent ({att.fee.kind})")
        if att.fee.payer not in ("buyer", "escrow"):
            reasons.append(f"fee paid by {att.fee.payer}, not buyer/escrow")

    # reciprocal-pair correlation, keyed (verifier, subject's seller-side counterparty);
    # the subject id proxies the counterparty in this model.
    if on("pair_cap") and w.pair_over_cap(att.verifier, att.subject):
        reasons.append("reciprocal-pair correlation over cap")

    if on("n_of_m") and att.value_tier >= 3 and att.raw and att.group_size < w.n_of_m_for_high_value_raw:
        reasons.append("high-value RAW requires N-of-M independent verifiers")

    return (not reasons, reasons)


# --- §9.7 two-sided scoring: a one-sided scorer misses chronic harshness ---

def divergence_flag(calls: list[float], *, two_sided: bool) -> bool:
    """calls = signed divergence from a diverse independent consensus per attestation
    (+ = more generous than consensus, - = harsher). A two-sided scorer flags chronic
    divergence in EITHER direction; a one-sided scorer only flags generosity, so a
    competitive-suppressor (chronically harsh) skates."""
    mean = sum(calls) / len(calls)
    if two_sided:
        return abs(mean) > 0.25
    return mean > 0.25  # one-sided: only over-attestation is penalized


# --- the eight cases + their mutation controls -------------------------------------------------

ROOT = frozenset({"shopA", "shopB", "shopC"})


def clean_attestation() -> tuple[Attestation, World]:
    """A fully admissible baseline: cross-verify, blind-routed, flat buyer-paid fee."""
    att = Attestation(
        subject="card-001",
        verifier="shopB",
        fee=Fee("flat", "buyer", True),
        assignment=Assignment("card-001", "shopB", ROOT, "seeded_random", receipt=True),
        value_tier=1,
        raw=True,
    )
    w = World(same_subject_exposure={"card-001": {"shopA"}})  # shopA sells it; shopB does not
    return att, w


def run() -> int:
    base_att, base_w = clean_attestation()
    ok, why = admit(base_att, base_w)
    assert ok, f"baseline must admit, got {why}"

    # each case: (name, attestation, world, guard-that-should-catch-it, pair_counterparty?)
    cases = []

    # 1. self-verification: shopA both sells and verifies the subject
    a1 = replace(base_att, verifier="shopA", assignment=replace(base_att.assignment, verifier="shopA"))
    cases.append(("self-verification blocked", a1, base_w, "same_subject"))

    # 2. custody/consignment co-location: shopB consigns this subject (exposure registered)
    w2 = World(same_subject_exposure={"card-001": {"shopA", "shopB"}})
    cases.append(("custody/consignment co-location blocked", base_att, w2, "same_subject"))

    # 3. seller-picked verifier (no buyer waiver)
    a3 = replace(base_att, assignment=replace(base_att.assignment, selection_mode="seller_picked"))
    cases.append(("seller-picked verifier blocked", a3, base_w, "override"))

    # 4. percent/success fee (and seller-paid)
    a4 = replace(base_att, fee=Fee("percent", "seller", False))
    cases.append(("percent/success fee blocked", a4, base_w, "fee"))

    # 5. reciprocal-pair cap trips: shopB has verified this counterparty at/over the cap
    w5 = World(same_subject_exposure=base_w.same_subject_exposure,
               pair_counts={("shopB", "card-001"): 3}, pair_cap=3)
    a5 = base_att  # admit() reads pair via subject as the counterparty key in this drill
    cases.append(("reciprocal-pair cap trips", a5, w5, "pair_cap"))

    # 6. high-value RAW with a single verifier
    a6 = replace(base_att, value_tier=3, raw=True, group_size=1)
    cases.append(("high-value RAW requires N-of-M", a6, base_w, "n_of_m"))

    # 8. router assigns outside the committed eligible set
    a8 = replace(base_att, verifier="shopZ", assignment=replace(base_att.assignment, verifier="shopZ"))
    # shopZ is not in ROOT; note shopZ also has no same-subject exposure, so committed_set must be the catcher
    cases.append(("router cannot assign outside committed set", a8, base_w, "committed_set"))

    print("§9 shop-verifier conflict/routing — falsification drill\n" + "-" * 60)
    passed = 0
    for name, att, w, guard in cases:
        blocked, why = admit(att, w)
        blocked = not blocked
        # mutation control: drop the guard that should be catching this -> must now admit
        admitted_without_guard, _ = admit(att, w, disabled=guard)
        teeth = blocked and admitted_without_guard
        status = "PASS" if teeth else "FAIL"
        if teeth:
            passed += 1
        print(f"[{status}] {name}")
        print(f"        blocked={blocked}  (reasons: {', '.join(why) or '—'})")
        print(f"        teeth: removing `{guard}` guard -> admits={admitted_without_guard}")

    # 7. harshness-as-well-as-generosity is scored (a scoring invariant, not an admission)
    harsh = [-0.4, -0.5, -0.45, -0.6]   # a chronic under-caller (competitive suppression)
    two_sided = divergence_flag(harsh, two_sided=True)
    one_sided = divergence_flag(harsh, two_sided=False)
    teeth7 = two_sided and not one_sided   # two-sided catches it; one-sided is the mutation that misses
    status = "PASS" if teeth7 else "FAIL"
    if teeth7:
        passed += 1
    print(f"[{status}] harshness as well as generosity is scored")
    print(f"        two-sided flags chronic harshness={two_sided}; one-sided misses it={not one_sided}")

    total = len(cases) + 1
    print("-" * 60)
    print(f"{passed}/{total} cases pass WITH TEETH "
          f"(blocked under the full gate AND admitted once the guard is removed)")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(run())
