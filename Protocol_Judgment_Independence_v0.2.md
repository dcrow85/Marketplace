# Protocol — Judgment Independence (G5) v0.2  (alpha — post-Kepler: composition bound, claim corrected)

> **Status:** alpha. Revises v0.1 after **Kepler's pass** (SYNC, 2026-06-22, `68ef1cd`).
> **Verdict held:** survives, right keystone, drill real — **but v0.1's "high-value becomes
> value-alpha once G5 binds" was premature.** v0.2 lands the **six promotions** and **corrects the
> headline:** G5 is **necessary, not sufficient** for high value; high value inherits the
> sparse-truth limit and **stays curated/underwritten** (the Verifier §1 regime), even with G5.
> **The point of this doc is still §7 (Attack Surface) + the gates §5.**
> On-chain binds + the registries are **Codex's lane.** **Spine:** enforced / legible / judged.
> **No-overclaim is law.** **Reviewed artifact:** `Protocol_Judgment_Independence_v0.1.md` @
> `f8f0b24` (frozen; diff target). **Freeze:** v0.2 = v0.3 diff target. **Reviewer:** Codex/Kepler.
> **Drill:** `simulations/judgment_independence_drill.py` — gates **G5.1–G5.10**, per-subguard teeth.

## What changed (the six promotions → dispositions)

| # | Kepler finding | v0.2 disposition | anchor |
|---|---|---|---|
| 1 | panel composition underbound (counts, not identity) | **G5.4 expanded** — member distinctness · per-member G5 refs · M-of-N signatures · pairwise control/pair-distance | §3 / G5.4 |
| 2 | G5.3 ⊥ G5.8 (distance bar vs disclosed-downgrade) | **reconciled** — G5.3 permits a *disclosed-low + value-capped* authorized downgrade; **undisclosed never** | §4 / G5.3 |
| 3 | appeal window ≠ stay if value already moved | **G5.5 + execution stay** — value does not move until the window closes / appeal resolves | G5.5 |
| 4 | disclosure hash isn't ex-ante routing info | **G5.7 + structured disclosure** — relationship type/distance legible *at assignment*, the hash only anchors it | G5.7 |
| 5 | appeal regress inherits sparse-truth limits | **new G5.9** — high-value resolution needs liability/underwriting/audit anchors; calibration carries weight **only in powered cells** (Verifier §1 regime) | §6 / G5.9 / §9 |
| 6 | missing attack: registry / eligible-set capture | **new G5.10 + Attack J** — panel drawn from a **committed eligible-set root** via **non-party** selection (Verifier Attack-10 shape, applied to judges) | §7.J / G5.10 |

## 0–2. The problem · what an authority is · trichotomy  (unchanged from v0.1, compressed)

The judged layer rests on a verifier/arbiter/floorExecutor/appeal authority making a call the
contract cannot. A captured authority rubber-stamps the whole machine. **ENFORCED** = the mechanical
half (distinctness, exclusivity, registered distance, **panel composition**, **execution stay**,
disclosure anchor, the ladder, **committed eligible-set**); **LEGIBLE** = semantic common control,
the overturn/calibration record, structured disclosure; **JUDGED** = whether a flagged tie is a
capture, whether a ruling is correct. **Bright line:** "passed G5" ≠ "fair judge."

## 3. Non-sole-oracle — now with bound panel composition  (finding 1)

v0.1's G5.4 only counted `resolver_count ≥ M` — **M sock-puppets pass that.** v0.2 binds the panel:
a value-moving high-value resolution needs an **M-of-N panel** where (a) members are **M distinct
addresses**, (b) **each member independently satisfies G5.1–G5.3** (its own G5 ref), (c) the
resolution carries **≥ M valid member signatures**, and (d) members are **pairwise independent** —
not common-controlled with each other *or* with a party. A panel that fails any of these is not a panel.

## 4. The downgrade ladder — reconciled with G5.3  (finding 2)

v0.1's G5.3 blocked low/unknown distance *unconditionally*, which **contradicted** G5.8's
"disclosed party-adjacent + value-cap" low-value downgrade. v0.2 reconciles them: **G5.3 permits a
low control-distance authority iff it is a *disclosed* (distance known, not `None`) **and**
*value-capped* authorized G5.8 downgrade.** **Undisclosed (`distance = None`) is never permitted** —
a downgrade requires disclosure. So the ladder is the *explicit, gated* exception, not a contradiction.

## 5. The gates (falsifiable, per-subguard — §8)

- **G5.1 — Non-party.** authority ≠ buyer/seller/custodian/insurer-on-trade.
- **G5.2 — Role-exclusivity.** one address, at most one judgment role per subject.
- **G5.3 — Registered control-distance.** ≥ min distance; **undisclosed never; disclosed-low only as
  a value-capped G5.8 downgrade.** *(2 subguards)*
- **G5.4 — Non-sole-oracle + bound panel.** N-of-M at value **·** members M-distinct **·** each member
  passes its own G5 **·** ≥ M valid signatures **·** members pairwise-independent. *(6 subguards)*
- **G5.5 — Appeal before finality + execution stay.** non-stayed appeal window **·** independent appeal
  authority **·** **value does not move until the window closes / appeal resolves.** *(3 subguards)*
- **G5.6 — Pairing/rotation cap.**
- **G5.7 — Disclosure binding.** hash-anchored at assignment **·** no undisclosed-discovered relationship
  **·** **structured (type/distance) for ex-ante routing**, not opaque. *(3 subguards)*
- **G5.8 — Downgrade ladder.** unavailable required tier ⇒ downgrade **·** party-adjacent ⇒ value-cap. *(2 subguards)*
- **G5.9 — Sparse-truth regime gate (NEW).** a **high-value** resolution requires a **liability /
  underwriting / audit anchor** (not calibration alone); calibration carries positive weight **only in
  powered cells** — an underpowered cell may not lean on it (Verifier §1). *(2 subguards)*
- **G5.10 — Registry / eligible-set integrity (NEW).** panel members are drawn from a **committed
  eligible-set root** **·** the selection seed/path is **not shaped by a trade party** (Verifier
  Attack-10 counter-shape, applied to judges). *(2 subguards)*

## 6. What this unblocks — corrected (G5 is necessary, NOT sufficient, for high value)

- **Consolidated G1** — the floorExecutor must pass **G5.1 + G5.4 (now bound) + G5.5 (now with stay)**.
  This makes G1 **value-safe up to the powered/curated tier**; the receipt's full-refund remedy is
  fine at low value, and at high value only behind a real panel + stay + the G5.9 anchor.
- **Verifier / Insurance §6/I13** — the route arbiter/appeal pass G5.1–G5.6; Insurance I13 = G5.4+G5.5.
- **The corrected headline:** binding G5 on-chain **does not, by itself, make high-value an open
  value-alpha market.** High value additionally needs **G5.4 composition + G5.9 underwriting +
  G5.10 registry integrity**, **and** it inherits the **sparse-truth limit** (§9): there are never
  enough resolved high-value appeals to calibrate, so high-value judgment **stays curated /
  underwritten**, not open. G5 raises the floor; it does not repeal the Verifier §1 regime.

## 7. Attack surface — REVIEW HERE (+ J)

A buyer-aligned floor → G5.1 + return-custody + G5.4 + G5.5(stay). · B seller-aligned arbiter →
G5.1 + G5.5 + overturn signal. · C affiliate split → G5.3 (registered) + value-cap (undisclosed). ·
D sole-oracle → G5.4 **bound panel**. · **E appeal regress → G5.9** (liability/underwriting anchor,
**not** mainly reputation — the sparse-truth fix) + rotation; *honest: bounded by economics, not
closed.* · F cozy-pair → G5.6. · G role-stacking → G5.2. · H disclosure evasion → G5.7 + slash. ·
I liveness starvation → G5.8 ladder. · **J. Registry / eligible-set capture (NEW).** capturing the
control/disclosure/eligible-set registry **manufactures "independent" N-of-M** from a captured pool.
→ **G5.10** (committed eligible-set root + non-party selection) + the registries go in the
`trusted_base_manifest` with **governance distinct from parties.** *Push here and on E.*

## 8. Falsification — per-subguard

`simulations/judgment_independence_drill.py` — gates **G5.1–G5.10**, each compound guard mutated
**one subclause at a time**. v0.2 adds the **panel-composition** subguards (G5.4), the **execution
stay** (G5.5), **structured disclosure** (G5.7), and the new gates **G5.9 / G5.10**; it also asserts
the **G5.3↔G5.8 reconciliation** (a disclosed-low + value-capped downgrade now *admits*). **Result:
10/10 gates · 23/23 subguards with independent teeth**, plus the reconciliation assertion.

## 9. Maturity / open — the corrected limits

- **Design only — nothing built.** On-chain binds + the **control-distance / disclosure / eligible-set
  registries** are **Codex's lane** (their governance must be party-independent — §7.J).
- **The sparse-truth limit is now explicit (finding 5):** high-value appeal/resolution quality
  **cannot rest mainly on reputation/calibration** — there are too few resolved high-value cases. It
  rests on **liability + underwriting + audit** (G5.9), exactly as Verifier §1 concluded for verifiers.
  So **high value stays curated/underwritten even under a fully-bound G5.**
- **Structural / value-capped, not closeable:** undisclosed common control; the **appeal regress**
  (no meta-authority — bounded by economic stake + the regime gate + rotation, *anchored not proven*);
  liveness↔independence (G5.8). 
- **Numbers/registries unspecced (named, not set):** min control-distance, M-of-N sizes per tier,
  appeal-window + stay length, pairing cap, the powered-cell effective-N threshold (shared with
  Verifier §1), value-cap levels, the eligible-set root mechanics.

## 10. Changelog
- **v0.2 (post-Kepler `68ef1cd`):** bound **panel composition** (G5.4: distinct members + per-member
  G5 + M-of-N sigs + pairwise distance); **reconciled G5.3↔G5.8** (disclosed-low + capped downgrade
  permitted, undisclosed never); added the **execution stay** (G5.5) and **structured ex-ante
  disclosure** (G5.7); added the **sparse-truth regime gate** (G5.9) and **registry/eligible-set
  integrity** (G5.10, + Attack J). **Corrected the headline:** G5 is necessary-not-sufficient for high
  value, which **stays curated/underwritten** under the inherited sparse-truth limit. Drill → 10/10
  gates · 23/23 subguards.
- **v0.1** (`f8f0b24`, frozen): the full G5 — generalized self-arbitration bar + non-sole-oracle +
  appeal-before-finality + downgrade ladder (G5.1–G5.8). Diff target.
