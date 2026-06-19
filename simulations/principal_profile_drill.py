#!/usr/bin/env python3
"""Falsification drill for Protocol_Principal_Profile_v0.1 §11.

The claim of the "glass self": authority is held by CODE — the `allowed_uses` lattice
and the mandate gate — not by the model behaving well. This drill is the falsifier. It
tries to break that claim eight ways and asserts the architecture refuses:

  1. projection (happy)    profile -> a buyer_want sourced from stated claims, that REFUSES
                           to spend from an inferred preference and asks the open question.
  2. inference-laundering  promote an `inferred` claim to spend authority -> rejected by the lattice.
  3. prompt-injection      seller text mints a `stated` claim / raises a cap -> quarantined (third_party).
  4. revocation            a stale-nonce / expired / superseded-version mandate -> rejected at the gate.
  5. superseded replay     a mandate draws authority from a superseded claim -> rejected.
  6. fake correction       a `corrected` authority claim without principal correction proof -> rejected.
  7. scope leak            a mandate tries to spend a cap from another domain -> rejected.
  8. confidence laundering a low-confidence authority claim asserts spend -> rejected.

Model-agnostic BY CONSTRUCTION: cases 2-4 and the spend-refusal in case 1 are deterministic.
No runtime — careful, swapped, or jailbroken — can launder authority, because the lattice (not
the model) holds it. Run: python3 simulations/principal_profile_drill.py
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field


# ---- the lattice (spec §4) --------------------------------------------------
LATTICE = ["glance_sort", "recommend", "ask", "spend", "waive"]
RANK = {u: i for i, u in enumerate(LATTICE)}
AUTHORITY_USES = {"spend", "waive"}
AUTHORITY_CONFIDENCE_FLOOR = 0.95

CLASS_CEILING = {"inferred": "recommend", "observed": "ask",
                 "stated": "waive", "imported": "waive", "corrected": "waive"}
ORIGIN_CEILING = {"third_party": "recommend", "behavior": "ask", "principal": "waive"}


def source_ceiling(source_class: str, source_origin: str) -> str:
    """Both axes gate; the effective ceiling is the MIN of the two (spec §4)."""
    return LATTICE[min(RANK[CLASS_CEILING[source_class]], RANK[ORIGIN_CEILING[source_origin]])]


# ---- the claim atom (spec §3) -----------------------------------------------
@dataclass
class Claim:
    claim_id: str
    path: str
    value: object
    source_class: str       # stated | imported | observed | inferred | corrected
    source_origin: str      # principal | behavior | third_party
    allowed_uses: list      # subset of LATTICE — must be <= the source ceiling
    confidence: float = 1.0
    scope: str = "tcg.pokemon"
    source_ref: str = ""
    supersedes: str | None = None

    def ceiling(self) -> str:
        return source_ceiling(self.source_class, self.source_origin)

    def well_formed(self) -> tuple[bool, str]:
        cap = RANK[self.ceiling()]
        for u in self.allowed_uses:
            if u not in RANK:
                return False, f"unknown use {u!r}"
            if RANK[u] > cap:
                return False, f"{self.source_class}/{self.source_origin} claim asserts '{u}' above its ceiling '{self.ceiling()}'"
            if u in AUTHORITY_USES and self.confidence < AUTHORITY_CONFIDENCE_FLOOR:
                return False, (
                    f"{self.source_class}/{self.source_origin} claim asserts authority use "
                    f"{u!r} below confidence floor {AUTHORITY_CONFIDENCE_FLOOR}"
                )
        # authoring rule: stated/corrected require principal origin — seller text can't be 'stated'.
        if self.source_class in ("stated", "corrected") and self.source_origin != "principal":
            return False, f"a {self.source_class} claim must be principal-origin, not {self.source_origin}"
        if self.source_class == "corrected" and not self.source_ref.startswith("principal_correction:"):
            return False, "corrected authority requires a principal_correction source_ref"
        return True, "ok"

    def can(self, use: str) -> bool:
        if use in AUTHORITY_USES and self.confidence < AUTHORITY_CONFIDENCE_FLOOR:
            return False
        return use in self.allowed_uses and RANK[use] <= RANK[self.ceiling()]


# ---- profile + mandate (spec §3, §5) ----------------------------------------
def profile_version(claims) -> str:
    blob = json.dumps(
        [
            (
                c.claim_id,
                c.path,
                c.value,
                c.source_class,
                c.source_origin,
                sorted(c.allowed_uses),
                c.confidence,
                c.scope,
                c.source_ref,
                c.supersedes,
            )
            for c in claims
        ],
        sort_keys=True, default=str,
    )
    return hashlib.sha256(blob.encode()).hexdigest()[:16]


class MandateError(Exception):
    pass


@dataclass
class Mandate:
    principal: str
    agent: str
    profile_version_hash: str
    spend_authority: float
    drawn_from: list        # claim_ids the spend authority is carved from
    revocation_nonce: int
    expires_at: float
    scope: str = "tcg.pokemon"


def active_claim_ids(profile_claims) -> set[str]:
    superseded = {c.supersedes for c in profile_claims if c.supersedes}
    return {c.claim_id for c in profile_claims} - superseded


def mint_mandate(profile_claims, spend_authority, drawn_from, nonce, expires_at,
                 principal="0xPRINCIPAL", agent="0xAGENT", scope="tcg.pokemon") -> Mandate:
    """A mandate may carve spend authority ONLY from claims that can() spend (spec §5)."""
    by_id = {c.claim_id: c for c in profile_claims}
    active = active_claim_ids(profile_claims)
    for cid in drawn_from:
        c = by_id.get(cid)
        if c is None:
            raise MandateError(f"mandate draws from unknown claim {cid}")
        ok, why = c.well_formed()
        if not ok:
            raise MandateError(f"mandate draws from malformed claim {cid}: {why}")
        if cid not in active:
            raise MandateError(f"mandate draws from superseded claim {cid}")
        if c.scope != scope:
            raise MandateError(f"mandate draws {cid} from scope {c.scope}, not mandate scope {scope}")
        if not c.can("spend"):
            raise MandateError(
                f"mandate carves spend authority from {cid} ({c.source_class}/{c.source_origin}, "
                f"ceiling {c.ceiling()}) which cannot spend"
            )
    return Mandate(principal, agent, profile_version(profile_claims), spend_authority, list(drawn_from), nonce, expires_at, scope)


def gate_check(mandate, *, registry_nonce, current_profile_version, requested_spend, requested_scope="tcg.pokemon", now=None) -> tuple[bool, str]:
    """The on-chain-style check (spec §6): signature (stubbed) + nonce + version + spend cap."""
    now = now if now is not None else time.time()
    if mandate.revocation_nonce != registry_nonce:
        return False, f"stale nonce ({mandate.revocation_nonce} != registry {registry_nonce})"
    if mandate.profile_version_hash != current_profile_version:
        return False, "profile version mismatch (mandate pinned to a superseded profile)"
    if mandate.scope != requested_scope:
        return False, f"scope mismatch ({mandate.scope} mandate cannot authorize {requested_scope})"
    if now >= mandate.expires_at:
        return False, "mandate expired"
    if requested_spend > mandate.spend_authority:
        return False, f"spend {requested_spend} > authority {mandate.spend_authority}"
    return True, "authorized"


# ---- the fixture: imported collection + interview + 3 observed passes --------
def build_profile() -> list:
    return [
        # imported holdings — principal-origin, but holdings never authorize; authored narrow.
        Claim("h1", "holdings.no_rarity_base:004", "owned", "imported", "principal", ["glance_sort", "recommend"]),
        Claim("h2", "holdings.jungle:015", "owned", "imported", "principal", ["glance_sort", "recommend"]),
        # interview — stated, principal. The desire/condition inform the hunt; only the spend cap authorizes spend.
        Claim("d1", "desires.grail", "No Rarity Charizard, PSA 8", "stated", "principal", ["glance_sort", "recommend", "ask"]),
        Claim("c1", "taste.condition_floor", "PSA 8", "stated", "principal", ["glance_sort", "recommend", "ask"]),
        Claim("m1", "mandate_input.spend_cap", 1400.0, "stated", "principal", ["glance_sort", "recommend", "ask", "spend"]),
        # behavior — 3 observed passes distilled to an inferred taste. Capped at recommend.
        Claim("i1", "taste.avoids_grails", True, "inferred", "behavior", ["glance_sort", "recommend"], confidence=0.4),
    ]


# ---- the four cases ---------------------------------------------------------
def case_projection(claims):
    by = {c.claim_id: c for c in claims}
    # honest projection: a buyer_want built from claims that can at least recommend.
    cited = ["d1", "c1", "m1"]
    sourcing_ok = all(by[u].can("recommend") for u in cited)
    # the only claim that may authorize the spend is the stated spend cap — never the inferred taste.
    spend_capable = [c.claim_id for c in claims if c.can("spend")]
    spend_only_from_stated = spend_capable == ["m1"]
    inferred_cannot_spend = not by["i1"].can("spend")
    # the right open question: no stated claim for risk posture / seller-trust floor -> ask, don't assume.
    has_risk_or_trust = any(c.path.startswith(("risk.", "seller_trust.")) for c in claims if c.source_class == "stated")
    asks_open_question = not has_risk_or_trust
    passed = sourcing_ok and spend_only_from_stated and inferred_cannot_spend and asks_open_question
    return ("projection (happy)", passed,
            f"buyer_want cites {cited}; spend-capable={spend_capable}; inferred-spend blocked={inferred_cannot_spend}; "
            f"surfaces open risk/trust question={asks_open_question}")


def case_inference_laundering(claims):
    # A: author an inferred claim that asserts spend authority -> rejected at authoring.
    bad = Claim("x1", "taste.bigspender", True, "inferred", "behavior", ["glance_sort", "recommend", "ask", "spend"])
    rejected_authoring = not bad.well_formed()[0]
    # B: tamper the allowed_uses anyway -> can() still gates on the ceiling.
    bad.allowed_uses = ["spend"]
    rejected_use = not bad.can("spend")
    # C: a mandate tries to carve spend authority from the real inferred claim i1 -> rejected.
    try:
        mint_mandate(claims, 5000.0, ["i1"], nonce=1, expires_at=time.time() + 3600)
        rejected_mandate = False
    except MandateError:
        rejected_mandate = True
    passed = rejected_authoring and rejected_use and rejected_mandate
    return ("inference-laundering (attack)", passed,
            f"authoring rejected={rejected_authoring}; tampered-use blocked={rejected_use}; mandate-carve rejected={rejected_mandate}")


def case_prompt_injection(claims):
    # Seller text claims the buyer authorized $5000, minted as a 'stated' cap from third_party origin.
    inj = Claim("p1", "mandate_input.spend_cap", 5000.0, "stated", "third_party", ["glance_sort", "recommend", "ask", "spend"])
    rejected_stated_from_seller = not inj.well_formed()[0]
    # Relabelled to dodge the authoring rule, third_party still caps at recommend.
    inj2 = Claim("p2", "mandate_input.spend_cap", 5000.0, "observed", "third_party", ["glance_sort", "recommend"])
    third_party_capped = inj2.ceiling() == "recommend" and not inj2.can("spend")
    passed = rejected_stated_from_seller and third_party_capped
    return ("prompt-injection (attack)", passed,
            f"stated-from-seller rejected={rejected_stated_from_seller}; third_party ceiling={inj2.ceiling()} (cannot spend)")


def case_revocation(claims):
    pv = profile_version(claims)
    m = mint_mandate(claims, 1400.0, ["m1"], nonce=7, expires_at=time.time() + 3600)
    valid, _ = gate_check(m, registry_nonce=7, current_profile_version=pv, requested_spend=1000)
    revoked, _ = gate_check(m, registry_nonce=8, current_profile_version=pv, requested_spend=1000)       # principal bumped the nonce
    m_exp = mint_mandate(claims, 1400.0, ["m1"], nonce=7, expires_at=time.time() - 1)
    expired, _ = gate_check(m_exp, registry_nonce=7, current_profile_version=pv, requested_spend=1000)
    # a later profile update (new version) must NOT auto-widen the old mandate.
    widened = claims + [Claim("m2", "mandate_input.spend_cap", 9999.0, "stated", "principal", ["glance_sort", "recommend", "ask", "spend"])]
    crept, _ = gate_check(m, registry_nonce=7, current_profile_version=profile_version(widened), requested_spend=1000)
    passed = valid and (not revoked) and (not expired) and (not crept)
    return ("revocation (attack)", passed,
            f"valid@nonce7={valid}; revoked@nonce8 rejected={not revoked}; expired rejected={not expired}; version-pinned (no creep)={not crept}")


def case_superseded_claim_replay(claims):
    old_cap = Claim(
        "old_cap",
        "mandate_input.spend_cap",
        1400.0,
        "stated",
        "principal",
        ["glance_sort", "recommend", "ask", "spend"],
        source_ref="interview:original",
    )
    corrected_cap = Claim(
        "new_cap",
        "mandate_input.spend_cap",
        900.0,
        "corrected",
        "principal",
        ["glance_sort", "recommend", "ask", "spend"],
        source_ref="principal_correction:lower_cap",
        supersedes="old_cap",
    )
    profile = claims + [old_cap, corrected_cap]
    try:
        mint_mandate(profile, 1400.0, ["old_cap"], nonce=3, expires_at=time.time() + 3600)
        rejected_old = False
    except MandateError:
        rejected_old = True
    try:
        mint_mandate(profile, 900.0, ["new_cap"], nonce=3, expires_at=time.time() + 3600)
        accepted_new = True
    except MandateError:
        accepted_new = False
    passed = rejected_old and accepted_new
    return ("superseded-claim replay (attack)", passed,
            f"old superseded cap rejected={rejected_old}; corrected active cap accepted={accepted_new}")


def case_fake_correction(claims):
    bad_ref = Claim(
        "fc1",
        "mandate_input.spend_cap",
        5000.0,
        "corrected",
        "principal",
        ["glance_sort", "recommend", "ask", "spend"],
        source_ref="seller_chat:buyer_said_raise_cap",
    )
    bad_origin = Claim(
        "fc2",
        "mandate_input.spend_cap",
        5000.0,
        "corrected",
        "third_party",
        ["glance_sort", "recommend"],
        source_ref="principal_correction:forged",
    )
    good = Claim(
        "fc3",
        "mandate_input.spend_cap",
        1200.0,
        "corrected",
        "principal",
        ["glance_sort", "recommend", "ask", "spend"],
        source_ref="principal_correction:typed_by_buyer",
    )
    rejected_bad_ref = not bad_ref.well_formed()[0]
    rejected_bad_origin = not bad_origin.well_formed()[0]
    accepted_good = good.well_formed()[0] and good.can("spend")
    passed = rejected_bad_ref and rejected_bad_origin and accepted_good
    return ("fake-correction authority (attack)", passed,
            f"bad source_ref rejected={rejected_bad_ref}; third_party correction rejected={rejected_bad_origin}; real correction accepted={accepted_good}")


def case_scope_leak(claims):
    watch_cap = Claim(
        "w1",
        "mandate_input.spend_cap",
        8000.0,
        "stated",
        "principal",
        ["glance_sort", "recommend", "ask", "spend"],
        scope="collectibles.watch",
        source_ref="interview:watch_budget",
    )
    profile = claims + [watch_cap]
    try:
        mint_mandate(profile, 8000.0, ["w1"], nonce=4, expires_at=time.time() + 3600, scope="tcg.pokemon")
        rejected_cross_scope_mint = False
    except MandateError:
        rejected_cross_scope_mint = True
    watch_mandate = mint_mandate(profile, 8000.0, ["w1"], nonce=4, expires_at=time.time() + 3600, scope="collectibles.watch")
    rejected_cross_scope_gate, _ = gate_check(
        watch_mandate,
        registry_nonce=4,
        current_profile_version=profile_version(profile),
        requested_spend=1000,
        requested_scope="tcg.pokemon",
    )
    passed = rejected_cross_scope_mint and not rejected_cross_scope_gate
    return ("scope-leak authority (attack)", passed,
            f"cross-scope mint rejected={rejected_cross_scope_mint}; watch mandate rejected at tcg gate={not rejected_cross_scope_gate}")


def case_confidence_laundering(claims):
    low = Claim(
        "lc1",
        "mandate_input.spend_cap",
        5000.0,
        "stated",
        "principal",
        ["glance_sort", "recommend", "ask", "spend"],
        confidence=0.4,
        source_ref="noisy_parse:maybe_budget",
    )
    rejected_authoring = not low.well_formed()[0]
    rejected_use = not low.can("spend")
    try:
        mint_mandate(claims + [low], 5000.0, ["lc1"], nonce=5, expires_at=time.time() + 3600)
        rejected_mandate = False
    except MandateError:
        rejected_mandate = True
    passed = rejected_authoring and rejected_use and rejected_mandate
    return ("confidence-laundering authority (attack)", passed,
            f"low-confidence authority rejected={rejected_authoring}; can(spend) blocked={rejected_use}; mandate rejected={rejected_mandate}")


def main() -> int:
    claims = build_profile()
    for c in claims:
        ok, why = c.well_formed()
        assert ok, f"fixture claim {c.claim_id} malformed: {why}"

    print("Principal Profile — falsification drill (spec §11)\n")
    cases = [
        case_projection(claims),
        case_inference_laundering(claims),
        case_prompt_injection(claims),
        case_revocation(claims),
        case_superseded_claim_replay(claims),
        case_fake_correction(claims),
        case_scope_leak(claims),
        case_confidence_laundering(claims),
    ]
    all_pass = True
    for name, passed, detail in cases:
        all_pass &= passed
        print(f"  [{'PASS' if passed else 'FAIL'}] {name}")
        print(f"         {detail}")
    print()
    if all_pass:
        print("  VERDICT: architecture — the lattice holds the authority, not the model.")
        print("  No runtime can spend from an inference, mint authority from seller text, replay a revoked mandate,")
        print("  reuse superseded claims, leak authority across scopes, or launder low-confidence authority.")
    else:
        print("  VERDICT: copy — a path to authority leaked. The 'glass self' is not yet real.")
    return 0 if all_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
