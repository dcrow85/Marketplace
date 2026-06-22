# Protocol — Insurance v0.1  (alpha — built for adversarial review)

> **Status:** alpha design spec. Authored by Claude (surface/design lane), 2026-06-19.
> **The point of this doc is §11 (Attack Surface).** Hit it hard.
> On-chain binds (policy instrument, reserve lock, trigger, subrogation) are **Codex's lane** —
> this specs the ROLE, the trust SIGNAL, and the trichotomy, not the Solidity.
> **Spine:** enforced / legible / judged. **No-overclaim is law.**
> **Freeze:** v0.1 = the v0.2 diff target. **Reviewer:** Codex/Kepler.
> **Related:** `Protocol_Verifier_v0.4` (residual-risk pricing §8; underwriting §1/§4),
> `Protocol_Arbitration_v0.1` (the ruling = the payout oracle — SHARED SEAM),
> `Protocol_Payment_and_Custody_v0.1` (rails + custody), `Protocol_Bootstrap_v0.1`
> (capital-as-trust), `Protocol_Consolidated_Spec_v0.2` (§13 gates G1/G4/G5; §14 JSC; §15 manifest).

## 0. What insurance IS here (and is not)

The protocol is **"accountable, not impossible."** It refuses to enforce authenticity, so a
**residual** always remains — the honest-but-fooled verifier, the state-of-the-art fake, the
physical-custody gaps (`Protocol_Gaps`), the floor that signs a bad receipt. Every spec so far
**names and bounds** that residual (Verifier §8; Consolidated §13 value-caps). **Insurance is the
mechanism that lets a third party *bear* the residual for a price**, instead of the buyer eating
it raw or the value-cap locking it out of trade.

It is the **only no-overclaim-compatible form of "protection."** The contract can never say "this
card is authentic." An insurer *can* say: **"if it is ruled counterfeit under the agreed trigger,
you are made whole."** That is a promise the contract can actually enforce — because its payout
fires on a *ruling or a mechanical predicate*, never on a judgment the contract pretends to make.

**Insurance is NOT:** authentication, a guarantee the card is real, a substitute for the evidence
floor (coverage never waives the walls), or a discretionary slush the insurer can deny at will.

## 1. The role — open underwriting ("anyone can insure")

Insurance is an **open role**, like verifier and arbiter: post capital, write a scoped policy,
collect premium, pay out on a triggered claim. It generalizes machinery that already exists:

- **A bond is self-insurance; a policy is third-party capital** betting the insured party will
  *not* fail. The seller bond and verifier bond are the principal's own skin; an insurer is an
  independent party who stakes capital on someone else's reliability.
- **It is the open-market form of** Verifier §4 "underwriter / mutual co-bonding" and Bootstrap's
  "capital substitutes for track record." The existing `route_insurance_risk_owner_packet` (Walls)
  is the **transit-only special case**; this generalizes coverage to the whole risk surface.
- **Cold-start unlock:** a new seller can't post a huge bond, but a third party who has read them
  can *insure* them up to a higher value cap — capital-as-trust, priced by the insurer.

## 2. The premium is the one honest scalar (the trust signal)

The design forbids scalar trust scores — `score`, `trust_score`, `probability_of_truth` are
banned legibility-vector fields. But there is exactly one honest scalar: **a market premium.**
Because it is a *price backed by capital at risk*, not a self-reported judgment, it **cannot be
Sybil'd or talked up** — someone must actually post money and pay out when wrong. "The market will
insure this trade at a 4% premium" is a trust signal that **survives the no-overclaim law**; a
trade no one will cheaply insure is the market saying it is risky. The premium is a **price, not a
verdict** (it stays inside the "vector, not verdict" discipline), and it slots into the Collector
Aperture as a **purchasable certainty instrument** (`certainty_budget` + `instruments_allowed`).

## 3. Trichotomy placement

**ENFORCED** (insurance is a financial instrument; the contract binds the *mechanical* half):
policy registered + insurer signature · **premium paid before coverage is active** · **reserve /
capital locked ≥ the policy's max payout** · **per-insurer aggregate exposure cap not exceeded** ·
**insurer ≠ any trade party** (buyer / seller / verifier / arbiter / floorExecutor for that
subject — address distinctness) · **payout fires ONLY on a typed trigger** (an authorized
arbiter/floor ruling hash, or a mechanical predicate — non-delivery timeout, transit-loss
attestation) · **post-delivery buyer-favoring payout requires return-custody proof**
(anti-fake-claim; shared with Consolidated G1 branch (a)) · payout math + **subrogation
assignment** (the insurer inherits the buyer's claim/recovery rights, bounded by the payout) ·
replay protection.

**LEGIBLE** (recorded, measured — not enforced): policy scope + exclusions · the insurer's **loss
ratio / payout history / time-to-pay** · the **premium schedule + the market premium curve** (the
signal) · the insurer's **exposure concentration** (by seller / verifier / card cohort) ·
reinsurance / co-bonding relationships.

**JUDGED:** whether the insured event actually happened (the arbiter rules this) · whether the
loss is real / the claim valid · whether the insurer priced the risk well · whether coverage is
adequate for *this* buyer's certainty budget.

**THE BRIGHT LINE (the no-overclaim law, applied):** the contract pays **when the trigger fires;
it NEVER decides authenticity.** Payout is **arbiter-ruled or mechanical — never insurer-
discretion.** A captured insurer must not be able to *deny* a validly-triggered claim, nor *pay*
an invalid one. **The contract CANNOT enforce:** that the insurer is solvent against correlated
loss, that the premium is fair, that the trigger maps to physical reality, or that subrogation
actually recovers.

## 4. The arbitration tie-in (the rich part)

1. **The arbiter/floor ruling IS the payout oracle.** The contract already records the
   claim→ruling→settlement event. That ruling is exactly the typed trigger an on-chain policy
   needs — *no new oracle, no overclaim.* Insurance plugs into the flow that already exists.
2. **Subrogation makes the insurer a *funded adversary* — the accountability engine.** On paying
   the buyer, the insurer inherits the claim against the seller's bond and the verifier's slash.
   Insurers become professionally-motivated parties who **chase bad actors to recover their money**
   — far stronger than relying on individual wronged buyers.
3. **It mitigates the live G1 floor-independence residual.** The post-delivery floor receipt still
   pays full buyer-refund (`resolvePostDeliveryUnresolvableClaimByFloorReceipt` → `(10_000,0,true)`),
   so floor independence is load-bearing and a buyer-aligned floor signing a bad receipt is the
   capture shape. **An insurer on the trade is a counterparty that *loses money* on a bad receipt**
   — a funded party with standing to **contest a captured floor / appeal the ladder**, and one
   whose refusal to pay a fraudster who keeps the card is the economic force that **demands G1
   branch (a) return-custody.** Insurance supplies the adversary the floor-independence gap was
   missing.

## 5. Scoped policies (mirror verifier scopes)

- **Authenticity** — pays if the card is later ruled counterfeit within a window (the honest
  substitute for "verified authentic"). The headline coverage.
- **Condition** — pays if condition is ruled materially worse than attested.
- **Transit / custody** — pays on loss / damage / non-delivery (generalizes `route_insurance`).
- **Verifier-error reinsurance** — an insurer backs a thin-track verifier's bond so it can operate
  at a higher value cap (the open-market form of Verifier §4 reputation-as-collateral co-bonding).

## 6. Economics

- **Reserve ≥ max payout, enforced** before coverage is active; **per-insurer aggregate exposure
  caps**; **correlation limits** (concentration by seller / verifier / card cohort is legible) so
  one fake source cannot silently sink a book; **reinsurance / co-bonding** for tail risk. This is
  the **portfolio machinery from Verifier §4**, applied to insurers.
- **Deductible / co-pay:** the buyer keeps skin so coverage does not breed carelessness (§11.D).
- **Cold-start:** insurers bootstrap like verifiers — graduated exposure, audited early, earning
  capacity as their loss-ratio record accrues.
- **Structural caveat:** "anyone can insure" in principle; capital-heavy insurers dominate in
  practice. Named, not hidden (same as the Verifier structural caveat).

## 7. The enforced gates (falsifiable — see §13)

- **I1** — payout trigger is **arbiter-ruled or a mechanical predicate, never insurer-discretion.**
- **I2** — **insurer ≠ any trade party** (buyer/seller/verifier/arbiter/floorExecutor on that subject).
- **I3** — **reserve locked ≥ max payout** and **aggregate exposure cap** not exceeded before coverage is active.
- **I4** — **post-delivery buyer-favoring payout requires return-custody proof** (anti-fake-claim; G1 (a)).
- **I5** — **the premium is never rendered as an authenticity score / verdict** (surface rule; cf. G6).
- **I6** — **bond relief from coverage is non-additive and solvency-gated** (extends G4; the insurer's locked reserve is the dependency).

## 8. Lifecycle

formation → buyer's aperture names a **certainty instrument** (coverage up to X% premium) → an
open insurer (≠ trade party) **quotes a premium** for a **scoped policy** with a **typed trigger**
→ premium paid, **reserve locked ≥ max payout**, policy anchored in the **JSC** (§9) → coverage
active → trade proceeds → on a **claim ruling** (or mechanical predicate) the policy **pays out**
(post-delivery buyer-favoring payout gated on **return-custody**) → the insurer takes
**subrogation** of the buyer's claim and pursues the seller bond / verifier slash through the
**arbiter ladder** → outcomes feed the insurer's legible **loss-ratio** record and the **premium
curve**.

## 9. Composition with the built surface

- **JSC / Consolidated §14** gains an **insurance block:** `{insurer, scope, trigger_type, premium,
  max_payout, reserve_ref, deductible, subrogation_terms}` — anchored at formation like the verifier
  block. (Shared seam: the JSC binding is Codex's lane / `Protocol_Arbitration` — append
  `[BLOCKING]` before editing.)
- **G4 (non-additive relief)** extends: coverage can reduce the required seller bond, composed
  **non-additively** (min/capped) and **gated by insurer solvency** (reserve locked); insurer
  solvency becomes the new dependency.
- **`trusted_base_manifest` (§15)** gains the **reserve custodian** (who holds the capital — can it
  be rugged?) and the insurer registry/admin.
- **Aperture** — insurance is the named certainty instrument; `certainty_budget` becomes purchasable.

## 10. Invariants (must hold)

1. An insurance payout NEVER asserts an `enforced` truth about the card — only that a **trigger
   fired** (a ruling or a mechanical predicate).
2. The insurer is **never a party** to the trade it covers (enforced address distinctness); semantic
   common-control stays legible.
3. **Reserve ≥ exposure** before coverage is active; aggregate exposure is capped.
4. A **validly-triggered** claim cannot be denied by the insurer; an **invalidly-triggered** one
   cannot be paid. (Discretion lives nowhere in the payout path.)
5. Post-delivery buyer-favoring payout **requires return-custody** — you cannot collect *and* keep the card.

## 11. Attack surface — REVIEW HERE

- **A. Insurer–seller/verifier collusion** (self-insurance masquerading as third-party cover; the
  "insurer" never really pays). Defense: insurer ≠ party (enforced), **arbiter-ruled trigger so the
  insurer can't deny**, independence legible. Residual: common control across addresses (legible,
  not enforceable) — same frontier as the verifier.
- **B. Fake-claim fraud** (buyer fabricates a loss to collect *and* keep the card). Defense: the
  ruling trigger **+ return-custody (I4 / G1 (a))**. Insurance is the economic force that *makes
  return-custody necessary*.
- **C. Adverse selection** (insurers cherry-pick easy trades; the grails that most need cover go
  uninsurable). Mirrors the underpowered-cell problem; honest answer is the curated/underwritten
  lane + value caps — and the **premium curve makes uninsurability *visible* rather than hidden.**
- **D. Moral hazard** (the insured buyer stops inspecting). Defense: **deductibles / buyer keeps
  skin**; coverage never waives the evidence floor.
- **E. Insurer insolvency / correlated loss** (one fake source sinks the book). Defense: reserve ≥
  exposure (enforced), per-insurer caps, **correlation limits**, reinsurance/co-bonding.
- **F. Trigger manipulation / captured floor** (insurer overpays on a wrong ruling, or is dodged
  because a captured floor refuses to rule). The deep tie to **G1/G5**: the insurer is a funded
  adversary motivated to **contest** a captured floor — but if the floor is the *only* oracle and is
  captured, the insurer is both victim and defender. Defense: **floorExecutor independence (G5
  extended), the appeal ladder, the insurer's standing to appeal.**
- **G. Premium-as-verdict leak** (the premium rendered as "authenticity 96%"). Defense: the surface
  rule (I5) — a price is not a probability-of-truth.
- **H. Capital centralization** ("anyone can insure" → capital-heavy insurers dominate). Structural;
  named, not patched.
- **I. Subrogation abuse** (the insurer, having paid, over-pursues the seller's bond beyond the loss,
  or colludes with an arbiter to slash). Defense: **subrogation bounded by the payout amount**; the
  bond-slash still flows through the arbiter ruling, not insurer fiat.

## 12. Maturity / open (be honest)

- **Design only — nothing built.** On-chain binds (policy instrument, premium-in, reserve lock,
  typed trigger, subrogation) are **Codex's lane**.
- the **premium-curve signal needs a market to exist** — insurers cold-start like verifiers (§6).
- the **reserve / solvency model** (correlated-loss reserving, reinsurance mechanics) is **unspecced**;
  the numbers do not exist yet.
- the **subrogation → bond-slash interface** is a **shared seam** with `Protocol_Arbitration` (the
  §14 JSC + the arbiter ruling).
- the **deductible / moral-hazard numbers** and the **trigger schema** (which rulings / predicates
  qualify) are unspecced — the trigger schema rides the JSC.
- **floorExecutor independence** (the §4.3 / G5 dependency) must be a real gate for §4.3's
  funded-adversary mitigation to hold.

## 13. Falsification

`simulations/insurance_gates_drill.py` — deterministic, model-free; each enforceable gate (I1–I6)
paired with a **mutation control** (drop the one guard → the attack must flip to admit, proving
teeth). **Result: 6/6 with teeth** (each clean context admits, each attack blocks, each flips to
admit once its guard is removed). These are the falsifiable subset; the §3 legible/judged claims
(loss-ratio, premium fairness, claim validity) are measured/judged, not gated.

## 14. Changelog
- **v0.1:** the role (open underwriting), the premium-as-honest-scalar trust signal, the trichotomy
  + the bright line (arbiter-ruled/mechanical trigger, never insurer-discretion), the arbitration
  tie-in (ruling-as-oracle, subrogation/funded-adversary, the G1 floor-independence mitigation),
  scoped policies, economics, the I1–I6 gates, composition with the JSC/G4/manifest, and the §11
  attack surface. Built for adversarial review; freeze = the v0.2 diff target.
