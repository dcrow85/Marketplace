# Protocol — Judgment Independence (G5) v0.1  (alpha — built for adversarial review)

> **Status:** alpha design spec. Authored by Claude (surface/design lane), 2026-06-22.
> **This is the full "G5"** — the recurring dependency three specs converge on. It generalizes the
> Consolidated-Spec **self-arbitration bar** (one address ≠ verifier+arbiter) to the *entire
> judgment-authority set* — **verifier · arbiter · floorExecutor · appeal panel** — and adds the
> **non-sole-oracle** and **appeal-before-finality** problems those specs lean on but do not secure.
> **The point of this doc is §7 (Attack Surface) + the gates §5.** Hit them hard.
> On-chain binds (the independence checks in `MarketplaceEscrow` + the control/disclosure registries)
> are **Codex's lane.** **Spine:** enforced / legible / judged. **No-overclaim is law.**
> **Freeze:** v0.1 = the v0.2 diff target. **Reviewer:** Codex/Kepler.
> **Drill:** `simulations/judgment_independence_drill.py` — gates **G5.1–G5.8**, per-subguard teeth.
> **Unblocks:** Consolidated `G1` (the floor receipt), Verifier `v0.4 §10/Consolidated G5`,
> Insurance `§6/I13`. **Related:** `Protocol_Arbitration_v0.1` (SHARED SEAM — the ladder), `Protocol_Verifier_v0.4`.

## 0. The problem (why this is the keystone)

The protocol's whole **judged** layer rests on *someone* making a call the contract cannot: a
**verifier** (inspects the card), an **arbiter** (rules a claim), a **floorExecutor** (resolves a
stuck claim / signs the unresolvable-claim receipt), an **appeal panel** (contests a ruling). Each
is only as trustworthy as it is **independent of the parties** and **not the sole oracle.** The same
failure recurs across every spec:

- **Consolidated G1** — the post-delivery floor receipt pays a full buyer refund; if the
  **floorExecutor is buyer-aligned**, it signs a refund while the buyer keeps the card (the
  Attack-10/11 capture shape). The chain checks `isArbiterActive(floorExecutor)` — **not** independence.
- **Insurance §6/I13** — the funded-adversary mitigation and the payout oracle collapse if the
  **floor/appeal is captured or is the sole oracle.**
- **Verifier v0.4** — a settlement-verifier or arbiter common-controlled with a party turns the
  route into theater.

A captured judgment authority turns the entire accountability machine into a rubber stamp. **G5 is
the gate that keeps the judges honest — mechanically where it can, legibly + value-capped where it cannot.**

## 1. What a judgment authority is

Any role whose signature **moves value or finalizes a claim**: `verifier` (scoped attestation),
`arbiter` (claim ruling), `floorExecutor` (liveness/unresolvable resolution), `appeal_member`
(contests a ruling). G5 governs the **independence** of all four — distinct from each role's *own*
competence rules (the verifier's shop-network rules, the arbiter's reproducibility, etc.), which
live in their own specs. **Independence is necessary, not sufficient** (the BBCE lesson) — G5 buys
an *unconflicted* judge, never a *correct* one.

## 2. Trichotomy placement

**ENFORCED** (the contract binds the *mechanical* half): **address distinctness** (authority ≠
buyer/seller/subject-custodian/insurer-on-trade) · **role-exclusivity per subject** (one address,
at most one judgment role) · **registered control-distance** (≥ min, where a registry exists) ·
**N-of-M panel membership** for value-moving resolutions at high cells · **appeal-window existence +
the appeal authority's own distinctness** · **pairing/rotation caps** (where pair history is tracked)
· **disclosure hash anchored at assignment** + **slash on proven undisclosed relationship** · **the
downgrade-ladder admission.**

**LEGIBLE** (measured, not enforced): **semantic common control** (undisclosed shared ownership,
friendship, off-protocol ties) · the authority's **overturn-on-appeal rate / calibration /
independence track record** (the bilateral-reputation analog, Verifier v0.4 §11) · the **control-
distance estimate** where no registry exists.

**JUDGED:** whether a flagged relationship is *actually* a capture · whether a ruling corresponds to
reality · whether a panel was *genuinely* diverse.

**THE BRIGHT LINE:** passing G5 means **"no registered mechanical conflict, disclosure anchored,
non-sole at value, appeal available"** — it does **NOT** mean the authority is *unbiased* or its
ruling *correct*. Surfacing "passed G5" as "fair judge" is the §9.8-class leak, one level up. **The
contract CANNOT enforce** semantic independence, undisclosed common control, or ruling correctness.

## 3. The non-sole-oracle problem (the one the others skipped)

Address distinctness defeats the *party-is-the-judge* attack but not the *single-judge-is-captured*
attack: if one floorExecutor is the **only** thing that can resolve a stuck high-value claim,
capturing that one address captures the outcome. So value-moving resolutions at high-value cells
require an **M-of-N independent panel** (G5.4), and a value-moving ruling is never **instantly final**
— it carries an **appeal window** to an *independent* appeal authority (G5.5). Low-value cells may use
a single floor (a panel is unaffordable for a \$50 trade) — but are **value-capped** so a single
capture can never decide a grail.

## 4. The independence downgrade ladder (the liveness↔independence tension — mirrors Consolidated G2)

The more independence you require, the scarcer/slower the resolver — the seed-network capacity
problem again. So if an independent authority of the required tier is unavailable, the trade
**downgrades, never silently proceeds with a captured judge** (G5.8), in order:

1. **independent M-of-N panel** (high value) →
2. **independent single authority** (mid value) →
3. **disclosed party-adjacent authority + value-cap + signal discount** (low value, full disclosure) →
4. **manual escrow / no value-bearing resolution** (the floor).

## 5. The gates (falsifiable — §8)

- **G5.1 — Non-party.** every authority address ≠ buyer · seller · subject-custodian · insurer-on-trade.
- **G5.2 — Role-exclusivity.** one address holds **at most one** judgment role per subject (the
  Consolidated self-arbitration bar, generalized to floor + appeal).
- **G5.3 — Registered control-distance.** authority ≥ min control-distance from every party where a
  registry/disclosure exists; **undisclosed/unknown = suspect → value-cap + signal-weight discount.** *(2 subguards)*
- **G5.4 — Non-sole-oracle (N-of-M) at value.** a value-moving resolution at a high-value cell needs
  **M independent authorities**, not a single floor; low value may use a single floor but is value-capped. *(2 subguards)*
- **G5.5 — Appeal before finality.** a value-moving ruling carries a **non-stayed appeal window** with
  an **independent** appeal authority before finality. *(2 subguards)*
- **G5.6 — Pairing/rotation cap.** an authority can't resolve the same party's trades beyond a
  correlation cap (where pair history is tracked).
- **G5.7 — Disclosure binding.** declared relationships are **hash-anchored at assignment**; a
  later-proven **undisclosed** relationship is a **slashable event + re-open trigger.** *(2 subguards)*
- **G5.8 — Downgrade ladder.** if the required-tier independent authority is unavailable, the route
  **downgrades** (§4); it may not proceed with a captured/party-adjacent authority **without** a value-cap. *(2 subguards)*

## 6. What this unblocks (the three dependents)

- **Consolidated G1** — `resolvePostDeliveryUnresolvableClaimByFloorReceipt`'s floorExecutor must pass
  **G5.1 (non-party) + G5.4 (non-sole at value) + G5.5 (appeal)**. My G1 author≠verifier finding — the
  receipt pays full refund and rests entirely on floor independence — **becomes these gates.**
- **Verifier (Consolidated G5 / v0.4 route)** — the route's arbiter/appeal authorities pass **G5.1–G5.3,
  G5.6**; the original self-arbitration bar **is G5.2.**
- **Insurance §6/I13** — §6's funded-adversary mitigation holds **only** when the floor/appeal pass
  G5; **I13 (high-value needs an independent, non-sole floor) is G5.4+G5.5 applied to insurance.** Until
  G5 is enforceable on-chain, high-value insurance stays **value-capped** (Insurance §17, unchanged).

## 7. Attack surface — REVIEW HERE

- **A. Buyer-aligned floor (the G1 shape).** floor signs a buyer-favoring receipt while the buyer
  keeps the card. → G5.1 + return-custody (Consolidated G1(a)) + G5.4 + G5.5.
- **B. Seller-aligned arbiter.** rules against valid buyer claims. → G5.1 + G5.5 + the overturn-rate signal.
- **C. Common-control behind distinct addresses (affiliate split).** distinct addresses, shared owner.
  → G5.3 bars **registered/disclosed**; **undisclosed stays legible → value-cap + discount** (cannot be barred).
- **D. Sole-oracle capture.** the one floor is the only resolver. → **G5.4 N-of-M at value**; value-cap low.
- **E. Appeal-ladder capture (the regress — "who judges the judges").** the appeal panel is *also*
  captured. → independent appeal (G5.5) + rotation (G5.6) + the **economic + reputation** loop; **honest:
  the regress is bounded by economics + the overturn record, not closed by logic** (§9). *Push here.*
- **F. Cozy-pair / patient collusion.** same authority repeatedly resolves one party. → G5.6 pairing caps.
- **G. Role-stacking self-dealing.** one address is verifier + arbiter + floor. → G5.2 role-exclusivity.
- **H. Disclosure evasion.** authority hides a relationship, revealed later. → G5.7 hash-anchor + **slash
  on proof** + re-open trigger; the *proof* of the hidden tie is judged.
- **I. Liveness starvation.** require so much independence no resolver is available in time → the trade
  stalls or is forced to a captured judge. → **G5.8 downgrade ladder** (price it, don't pretend it away).

## 8. Falsification

`simulations/judgment_independence_drill.py` — deterministic, model-free; gates **G5.1–G5.8**, each
compound guard mutated **per-subguard** (the Insurance-v0.3 standard): for every subguard, an attack
violating only it must block under the full gate **and** flip to admit when only that subguard is
disabled. **Result: 8/8 gates · 13/13 subguards with independent teeth.**

## 9. Maturity / open (be honest)

- **Design only — nothing built.** On-chain binds + the **control-distance registry** + the
  **disclosure/relationship registry** are **Codex's lane** (new shared surfaces, like the insurance registries).
- **Structural / value-capped, not closeable:** **undisclosed** common control (legible, discounted);
  the **appeal regress** (bounded by economic stake + the overturn-on-appeal reputation loop + rotation —
  there is **no meta-authority**; independence is *anchored*, not *proven*); the **liveness↔independence**
  tension (priced by the G5.8 ladder + value-caps).
- **Numbers/registries unspecced (named, not set):** the min control-distance, M-of-N panel sizes per
  value tier, the appeal-window length, the pairing-correlation cap, the value-cap levels.
- **The dependents stay value-capped until G5 binds on-chain** — that is the gate that turns Consolidated
  G1, Verifier high-value routes, and Insurance high-value cells from "value-capped" into "value-alpha."

## 10. Changelog
- **v0.1:** the full G5 — generalizes the self-arbitration bar to verifier/arbiter/floorExecutor/appeal
  (G5.1–G5.2), adds registered control-distance (G5.3), the **non-sole-oracle N-of-M** + **appeal-before-
  finality** gates the other specs leaned on (G5.4–G5.5), pairing caps (G5.6), disclosure-binding +
  discovery-slash (G5.7), and the independence **downgrade ladder** (G5.8). Names what unblocks
  (Consolidated G1, Verifier, Insurance §6/I13) and what stays structural (undisclosed control, the
  appeal regress, liveness↔independence). Built for adversarial review; freeze = the v0.2 diff target.
