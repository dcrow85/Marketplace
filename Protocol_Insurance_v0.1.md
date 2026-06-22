# Protocol — Insurance v0.1  (alpha — built for adversarial review)

> **Status:** alpha design spec. Authored by Claude (surface/design lane), 2026-06-19;
> **expanded to a complete review surface 2026-06-22** (premium formation §2, trigger schema §3,
> the no-discretion payout path §5, subrogation interface §7, reserve/solvency/reinsurance
> economics §9, deductible §10, insurer cold-start §11, gates I7–I9, the JSC insurance-block §14).
> **The point of this doc is §16 (Attack Surface).** Hit it hard.
> On-chain binds (policy instrument, reserve lock, trigger, payout, subrogation) are **Codex's
> lane** — this specs the ROLE, the SIGNAL, the trichotomy, and the mechanism, not the Solidity.
> **Spine:** enforced / legible / judged. **No-overclaim is law.**
> **Freeze:** v0.1 = the v0.2 diff target. **Reviewer:** Codex/Kepler. (Skeleton @ `c8d5ac6`.)
> **Related:** `Protocol_Verifier_v0.4` (residual-risk pricing §8; underwriting/portfolio §1/§4),
> `Protocol_Arbitration_v0.1` (the ruling = the payout oracle — SHARED SEAM),
> `Protocol_Payment_and_Custody_v0.1`, `Protocol_Bootstrap_v0.1` (capital-as-trust),
> `Protocol_Consolidated_Spec_v0.2` (§13 gates G1/G4/G5; §14 JSC — now bound on-chain at 109/109).

## 0. What insurance IS here (and is not)

The protocol is **"accountable, not impossible."** It refuses to enforce authenticity, so a
**residual** always remains — the honest-but-fooled verifier, the state-of-the-art fake, the
physical-custody gaps, the floor that signs a bad receipt. Every spec so far **names and bounds**
that residual (Verifier §8; Consolidated §13 value-caps). **Insurance lets a third party *bear*
the residual for a price** instead of the buyer eating it raw or a value-cap locking it out of trade.

It is the **only no-overclaim-compatible form of "protection."** The contract can never say "this
card is authentic." An insurer *can* say: **"if it is ruled counterfeit under the agreed trigger,
you are made whole."** That is enforceable — because payout fires on a *ruling or a mechanical
predicate*, never on a judgment the contract pretends to make.

**Insurance is NOT:** authentication, a guarantee the card is real, a substitute for the evidence
floor (coverage never waives the walls), or a discretionary pot the insurer can deny at will.

## 1. The role — open underwriting ("anyone can insure")

Insurance is an **open role**, like verifier and arbiter: post capital, write a scoped policy,
collect premium, pay out on a triggered claim. It generalizes machinery that already exists:

- **A bond is self-insurance; a policy is third-party capital** betting the insured party will
  *not* fail. The seller/verifier bonds are the principal's own skin; an insurer stakes capital on
  someone else's reliability.
- **It is the open-market form of** Verifier §4 "underwriter / mutual co-bonding" and Bootstrap's
  "capital substitutes for track record." The existing `route_insurance_risk_owner_packet` (Walls)
  is the **transit-only special case**; this generalizes coverage to the whole risk surface.

## 2. The premium — the one honest scalar (and how it forms)

The design forbids scalar trust scores (`score`, `trust_score`, `probability_of_truth` are banned
legibility-vector fields). But one honest scalar exists: **a market premium.** Because it is a
*price backed by capital at risk*, it **cannot be Sybil'd or talked up** — someone must post money
and pay out when wrong. "The market insures this trade at 4%" is a trust signal that **survives the
no-overclaim law**; a trade no one will cheaply insure is the market saying it is risky.

**Premium formation (the quote market):**
- A buyer's agent **requests cover** for `{subject, scope, max_payout, window}` (named in the
  aperture as a certainty instrument).
- Open insurers **return signed quotes** `{premium, deductible, exclusions, reserve_committed}`.
  A quote is a legible, time-boxed offer; binding it locks the insurer's reserve (§9).
- The buyer's agent **binds one quote**; the **distribution of quotes** is itself the legible
  signal — the **premium curve** (min / median / spread across insurers) is what the human surface
  shows, **as a price, never as a probability of truth** (I5).
- **Premium decomposition** (legible, so it can be audited, not gamed):
  `premium ≈ expected_loss (P(trigger)·payout) + cost_of_locked_capital (over the window) + risk_load`.
  Because the reserve is **fully locked** (§9), the capital-cost term is real and large — which is
  *why* on-chain insurance is honest: the premium prices genuinely immobilized capital, not a
  fractional promise.

## 3. The trigger schema (the heart of the no-overclaim safety)

A policy binds a **`covered_event_predicate`** at formation. Payout fires **iff** a matching
**trigger** is anchored. A trigger is one of exactly two kinds — both *outcome-bearing and outside
the insurer's control*:

- **(a) An authorized claim ruling** (arbiter or floor) whose outcome matches the predicate —
  e.g. `ruled_counterfeit`, `ruled_condition_below_attested(grade_delta ≥ k)`, `ruled_nondelivery`.
  This reuses the contract's existing claim→ruling event (no new oracle).
- **(b) A mechanical predicate** the contract already evaluates — `nondelivery_timeout`,
  a `transit_loss_attestation` hash, a custody-failure event.

Rules (enforced): the predicate + scope are **hash-bound at formation**; payout admits only a
trigger of kind (a)/(b) **matching** the predicate and scope; **never** an insurer-set flag.
**Exclusions** (legible) are checked against the predicate (an authenticity policy does not pay on
a condition dispute). **Window:** coverage carries a **resolution window** (fraud surfaces late —
mirrors the bond tail); the trigger must occur within it, and the **reserve is held until window
close.** A late or out-of-scope event does not pay.

## 4. Trichotomy placement + the bright line

**ENFORCED** (insurance is a financial instrument; the contract binds the *mechanical* half):
policy registered + insurer signature · premium paid before coverage active · **reserve locked ≥
max payout** · per-insurer **aggregate + per-cohort exposure caps** not exceeded · **insurer ≠ any
trade party** (buyer/seller/verifier/arbiter/floorExecutor for that subject) · payout fires **only
on a §3 trigger** matching the bound predicate/scope · **post-delivery buyer-favoring payout
requires return-custody** (G1 (a)) · **deductible ≥ floor** retained by buyer · payout math ·
**subrogation assignment bounded by the payout** · resolution-window/reserve-release timing ·
replay protection.

**LEGIBLE:** policy scope + exclusions · the insurer's **loss ratio / payout history / time-to-pay**
· the **premium schedule + market premium curve** · the insurer's **exposure concentration** (by
seller/verifier/card cohort) · reinsurance / co-bonding relationships.

**JUDGED:** whether the insured event actually happened (the arbiter rules) · whether the loss is
real / the claim valid · whether the insurer priced well · whether coverage is adequate for *this*
buyer's certainty budget.

**THE BRIGHT LINE (the no-overclaim law, applied):** the contract pays **when the trigger fires;
it NEVER decides authenticity.** Payout is **arbiter-ruled or mechanical — never insurer-
discretion.** **The contract CANNOT enforce:** that the premium is fair, that the trigger maps to
physical reality, that the book is well-diversified, or that subrogation actually recovers.

## 5. The no-discretion payout path (the mechanism that makes §4's bright line real)

The reserve is **escrow-held by the contract, not the insurer.** On a matching §3 trigger anchored,
**`executeInsurancePayout(policyId, triggerRef)` is permissionless** — anyone (the buyer's agent, a
keeper) can call it, and the contract pays from the **locked reserve** per the policy's payout math.
Consequences:
- a **captured insurer cannot deny** a validly-triggered claim — it has no veto; the money is
  pre-locked and the trigger is a ruling/predicate, not its flag;
- a **colluding buyer cannot extract** an unearned payout — there is no trigger without a ruling/
  predicate, and post-delivery buyer-favoring payout additionally requires return-custody (I4).
Discretion lives **nowhere** in the payout path. (This is the insurance analog of G1's move:
convert a would-be discretionary decision into a mechanical consequence of an accountable event.)

## 6. The arbitration tie-in (the rich part)

1. **The arbiter/floor ruling IS the payout oracle** — §3(a). No new oracle, no overclaim.
2. **Subrogation makes the insurer a *funded adversary* — the accountability engine.** On paying
   the buyer, the insurer inherits the claim against the seller bond / verifier slash (§7), and is
   professionally motivated to **chase bad actors to recover** — far stronger than a lone wronged buyer.
3. **It mitigates the live G1 floor-independence residual.** The post-delivery floor receipt still
   pays full buyer-refund (`resolvePostDeliveryUnresolvableClaimByFloorReceipt` → `(10_000,0,true)`),
   so floor independence is load-bearing and a buyer-aligned floor signing a bad receipt is the
   capture shape. **An insurer on the trade is a counterparty that *loses money* on a bad receipt**
   — a funded party with standing to **contest a captured floor / appeal the ladder**, and whose
   refusal to pay a fraudster who keeps the card is the economic force that **demands G1 branch (a)
   return-custody.** Insurance supplies the adversary the floor-independence gap was missing.

## 7. Subrogation → bond-slash interface (the shared seam, specified)

On payout the contract **assigns the buyer's recovery rights to the insurer, bounded by the payout
amount** (I7). The insurer does **not** get a special slash power; it **inherits the buyer's
standing** and pursues recovery **through the same arbiter ladder** — the seller-bond / verifier-bond
slash still flows from an **arbiter ruling**, never insurer fiat. Recovered funds first repay the
insurer up to the payout, with any residual to the buyer (deductible) per the policy. **SHARED SEAM
with `Protocol_Arbitration` (Codex's chain lane):** the assignment record + the bounded-recovery
check are mechanical; the slash itself is the existing bond/ruling path. Append `[BLOCKING]` before
any arbitration-doc edit (seam 4 is still dirty).

## 8. Scoped policies (mirror verifier scopes)

- **Authenticity** — pays if later ruled counterfeit within the window (the honest substitute for
  "verified authentic"). The headline coverage.
- **Condition** — pays if ruled materially worse than attested.
- **Transit / custody** — loss / damage / non-delivery (generalizes `route_insurance`).
- **Verifier-error reinsurance** — an insurer backs a thin-track verifier's bond so it can operate
  at a higher value cap (the open-market form of Verifier §4 reputation-as-collateral co-bonding).

## 9. Reserve, solvency & reinsurance economics

**Fully-reserved, not fractional — the core design choice.** Every open policy locks a **reserve ≥
max_payout** in escrow *before coverage is active* (enforced). On-chain insurance is **fully
collateralized**: the payout is always covered because it is pre-locked. This **kills payment-
insolvency by construction** — the classic "insurer can't cover the claim" failure cannot occur at
the policy level. The risk is *relocated*, honestly, to **capital efficiency**: fully-reserved
cover is capital-intensive, so the premium must cover the cost of locked capital (§2) — which is
exactly what makes the premium an honest signal rather than a cheap promise.

- **Exposure accounting:** an insurer's **aggregate exposure** = Σ open `max_payout`; its locked
  capital must cover it (trivially true under per-policy reservation). Enforced caps: aggregate
  (total) and **per-cohort** (per seller / verifier / card-class), so one fake source cannot *be*
  the book (I8).
- **Reinsurance / co-bonding = capital efficiency, not fractional reserve.** A primary insurer may
  lay off part of a reserve to a reinsurer who locks the **sub-reserve**; the **total locked across
  the stack still ≥ max_payout** (the §4 invariant holds, split across parties). This lets an
  insurer write more cover per unit of its own capital **without** breaking full reservation.
- **Concentration is a legible book-quality signal.** Even fully reserved, an insurer over-exposed
  to one cohort faces *correlated* triggers that exhaust its *willingness* to keep writing (not its
  ability to pay any single reserved policy). So concentration is **measured** (the bilateral-vector
  analog) and, where the registry tracks cohorts, **capped** (I8) — but it is a book signal, not a
  payment-solvency risk.

**Honest gaps (numbers do not exist yet):** the capital-cost rate, the cohort-cap levels, the
window length, and the reinsurance-stack accounting are **policy parameters named here, not set.**
The *design surface* is complete; the *calibration* is future (§17).

## 10. Deductible & moral hazard

Coverage caps at `max_payout` and the buyer **retains a deductible / co-pay ≥ a floor** (I9), so:
(a) the buyer keeps skin — still inspects, still uses the evidence floor (coverage **never waives
the walls**); (b) a fake-claim colluder must **eat the deductible**, raising the cost of fraud.
The deductible floor is a policy parameter (named, not numerically set — §17).

## 11. Insurer cold-start & capacity accrual

Insurers bootstrap like verifiers (Bootstrap; Verifier §4): a new insurer starts with **graduated
exposure caps** and **heavier audit** of its quotes/payouts, and **earns capacity** as its legible
**loss-ratio / time-to-pay** record accrues. **Capital substitutes for record** until the record
exists; the premium an insurer can command, and the relief its cover buys (§14/G4), are functions
of that legible track record — not a self-declared rating.

## 12. The enforced gates (falsifiable — see §18)

- **I1** — payout trigger is **arbiter-ruled or a mechanical predicate, never insurer-discretion** (§3).
- **I2** — **insurer ≠ any trade party** (buyer/seller/verifier/arbiter/floorExecutor on that subject).
- **I3** — **reserve locked ≥ max payout** and **aggregate exposure cap** not exceeded before coverage is active.
- **I4** — **post-delivery buyer-favoring payout requires return-custody** (anti-fake-claim; G1 (a)).
- **I5** — **the premium is never rendered as an authenticity score / verdict** (surface rule; cf. G6).
- **I6** — **bond relief from coverage is non-additive and solvency-gated** (extends G4).
- **I7** — **subrogation recovery is bounded by the payout amount** (no over-pursuit of the seller bond).
- **I8** — **per-cohort exposure concentration cap** not exceeded (one source cannot be the book).
- **I9** — **buyer retains a deductible ≥ floor** (no 100% cover; moral-hazard / fake-claim brake).

## 13. Lifecycle

aperture names a certainty instrument → open insurers (≠ trade party) **quote** premiums for a
scoped policy with a **§3 trigger predicate** → buyer's agent **binds one quote**; premium paid,
**reserve locked ≥ max payout**, policy anchored in the **JSC (§14)** → coverage active → trade
proceeds → on a matching **ruling / mechanical trigger** within the window, **`executeInsurancePayout`
is permissionless** (post-delivery buyer payout gated on return-custody) → the insurer takes
**bounded subrogation** and pursues the seller bond / verifier slash **through the arbiter ladder**
→ at window close, unspent reserve releases → outcomes feed the insurer's legible **loss-ratio** and
the **premium curve.**

## 14. Composition with the built surface

- **JSC insurance-block** (anchored at formation like the now-landed verifier route, Consolidated
  §14 / Codex G3 `JudgmentSupplyVerifierRoute`):
  ```
  JSC.insurance = {
    insurer:            <addr, ≠ trade parties>
    scope:              authenticity | condition | transit | verifier_error
    covered_predicate:  <typed event the trigger must match>          # §3
    trigger_kinds:      [ arbiter_ruling | floor_ruling | mechanical ]
    premium:            { amount, payer: buyer, paid: bool }
    max_payout:         <uint>
    deductible:         <uint ≥ floor>                                # I9
    reserve_ref:        <locked-escrow handle, ≥ max_payout>          # I3, §9
    cohort_key:         <seller|verifier|card-class for the cap>      # I8
    window:             { opens, closes }                             # §3
    subrogation:        { assignee: insurer, bounded_by: max_payout } # I7, §7
    reinsurance_stack:  [ { reinsurer, sub_reserve_ref } ]            # §9 (optional)
  }
  ```
  **Enforced:** presence + hash-binding of these fields; insurer ≠ party; reserve ≥ max_payout;
  cohort cap; payer ∈ {buyer}; window/trigger-kind validity. **Cannot enforce:** fair premium,
  trigger↔reality, book diversification.
- **G4 (non-additive relief)** extends: coverage can reduce the required seller bond, composed
  **non-additively** and **gated by the locked reserve** (I6); insurer solvency = the locked reserve.
- **`trusted_base_manifest` (§15)** gains the **reserve custodian** (the escrow holding the capital —
  can it be rugged?) and the insurer registry/admin.
- **Aperture** — insurance is the named certainty instrument; `certainty_budget` becomes purchasable.

## 15. Invariants (must hold)

1. An insurance payout NEVER asserts an `enforced` truth about the card — only that a **trigger fired**.
2. The insurer is **never a party** to the trade it covers (enforced); semantic common-control stays legible.
3. **Reserve ≥ max payout**, locked before coverage is active; aggregate + per-cohort exposure capped.
4. A **validly-triggered** claim **cannot be denied**; an **invalidly-triggered** one cannot be paid.
5. Post-delivery buyer-favoring payout **requires return-custody** (collect-and-keep is impossible).
6. **Subrogation ≤ payout**, and the bond-slash flows through the arbiter ruling, never insurer fiat.
7. The buyer **retains a deductible ≥ floor** (no full cover).

## 16. Attack surface — REVIEW HERE

- **A. Insurer–seller/verifier collusion** (self-insurance as third-party cover; "insurer" never
  pays). Defense: insurer ≠ party (enforced), **arbiter-ruled trigger + permissionless payout so the
  insurer can't deny** (§5), independence legible. Residual: common control across addresses
  (legible, not enforceable) — same frontier as the verifier.
- **B. Fake-claim fraud** (buyer fabricates a loss to collect *and* keep the card). Defense: ruling
  trigger **+ return-custody (I4)** + **deductible (I9)**. Insurance is the economic force that
  *makes return-custody necessary*.
- **C. Adverse selection** (insurers cherry-pick easy trades; grails go uninsurable). Mirrors the
  underpowered-cell problem; honest answer = curated/underwritten lane + value caps — and the
  **premium curve makes uninsurability visible**, not hidden.
- **D. Moral hazard** (insured buyer stops inspecting). Defense: **deductible (I9)**; coverage never
  waives the evidence floor.
- **E. Insurer insolvency / correlated loss.** **Largely closed by full reservation (§9):**
  payment-insolvency cannot occur per policy. Residual is *book willingness* under correlation →
  **per-cohort caps (I8)** + concentration as a legible signal + reinsurance (total reserve still ≥
  payout). Attack the reinsurance-stack accounting: does the sub-reserve actually lock?
- **F. Trigger manipulation / captured floor** (insurer overpays on a wrong ruling, or is dodged by
  a floor that won't rule). The deep tie to **G1/G5**: the insurer is a funded adversary motivated
  to **contest** a captured floor — but if the floor is the *only* oracle and is captured, the
  insurer is both victim and defender. Defense: **floorExecutor independence (G5 extended), the
  appeal ladder, the insurer's standing to appeal.** *This is the sharpest open question — push here.*
- **G. Premium-as-verdict leak** (premium rendered as "authenticity 96%"). Defense: I5 — a price is
  not a probability-of-truth.
- **H. Capital centralization** ("anyone can insure" → capital-heavy insurers dominate; full
  reservation *raises* the capital bar). Structural; named, not patched.
- **I. Subrogation abuse** (insurer over-pursues beyond the loss, or colludes with an arbiter to
  slash). Defense: **subrogation ≤ payout (I7)**; the slash still flows through the arbiter ruling.
- **J. Window / timing games** (trigger lands just after the window; or the insurer stalls payout to
  hold the reserve's yield). Defense: window bound at formation; **permissionless payout (§5)** means
  the insurer cannot stall; reserve releases only at window close.

## 17. Maturity / open (be honest)

- **Design only — nothing built.** On-chain binds (policy instrument, premium-in, reserve lock,
  typed trigger, permissionless payout, bounded subrogation) are **Codex's lane**.
- **Numbers unspecced (named, not set):** the capital-cost rate in the premium, the per-cohort cap
  levels, the resolution-window length, the deductible floor, the reinsurance-stack accounting.
- the **premium-curve signal needs a market to exist** — insurers cold-start like verifiers (§11).
- the **subrogation → bond-slash interface** is a **shared seam** with `Protocol_Arbitration` (§7).
- **floorExecutor independence** (the §6 / G5 dependency) must be a real gate for §6's funded-adversary
  mitigation to hold — the single most load-bearing external dependency (§16.F).

## 18. Falsification

`simulations/insurance_gates_drill.py` — deterministic, model-free; each enforceable gate (I1–I9)
paired with a **mutation control** (drop the one guard → the attack must flip to admit, proving
teeth). **Result: 9/9 with teeth.** The §4 legible/judged claims (loss-ratio, premium fairness,
claim validity) are measured/judged, not gated.

## 19. Changelog
- **v0.1 (2026-06-19; expanded 2026-06-22 to a complete review surface):** the role (open
  underwriting), the premium-as-honest-scalar + **premium formation/curve** (§2), the **trigger
  schema** (§3), the trichotomy + bright line (§4), the **no-discretion permissionless payout path**
  (§5), the arbitration tie-in (§6), the **subrogation→bond-slash interface** (§7), scoped policies
  (§8), **fully-reserved solvency + reinsurance economics** (§9), **deductible/moral-hazard** (§10),
  **insurer cold-start** (§11), gates **I1–I9** (§12), the **JSC insurance-block schema** (§14), the
  invariants (§15), and the §16 attack surface (now A–J). Backed by `insurance_gates_drill.py` 9/9.
  Built for adversarial review; freeze = the v0.2 diff target. Skeleton preserved @ `c8d5ac6`.
