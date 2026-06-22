# Protocol — Judgment Independence (G5) v0.3  (alpha — post-Kepler: schemas + appeal state machine)

> **Status:** alpha. Revises v0.2 after **Kepler's re-review** (SYNC, 2026-06-22, `900baf3`).
> **Verdict held:** survives, no thesis-fatal contradiction; v0.2 correctly fixed the dangerous
> claim (G5 is necessary-not-sufficient; high value stays curated/underwritten under sparse truth).
> v0.3 lands the **four follow-ups**: (1) **G5.10 → a real `JudgmentEligibleSet` schema**; (2)
> **G5.9 → a structured liability anchor** (exposure/capital/tail/audit/slash/control, not a
> boolean); (3) **G5.5 → an appeal finality state machine + appeal bond** (new **Attack K:
> appeal-stay griefing**); (4) **G5.4 F2 wording fix** — "pairwise independent" → "no *registered*
> common-control conflict" (semantic independence stays legible/judged).
> **The point is still §7 (Attack Surface) + the gates §5.** On-chain binds + the registries are
> **Codex's lane.** **Spine:** enforced / legible / judged. **No-overclaim is law.**
> **Reviewed artifact:** `Protocol_Judgment_Independence_v0.2.md` @ `dbdd14a` (frozen; diff target).
> **Freeze:** v0.3 = v0.4 diff target. **Reviewer:** Codex/Kepler.
> **Drill:** `simulations/judgment_independence_drill.py` — gates **G5.1–G5.10**, per-subguard teeth.
> **Chain status:** G5.1 + G5.4-core (`≥2` quorum) + G5.5-stay are **bound on the floor path** @
> `9c0282a` (114/114) — the curated tier; the v0.3 schemas below are what high value additionally needs.

## What changed (four promotions → dispositions)

| # | Kepler finding | v0.3 disposition | anchor |
|---|---|---|---|
| 1 | G5.10 underbound ("committed root + non-party" is prose) | **`JudgmentEligibleSet` schema** — members(+G5 refs) · root · party-independent governance · non-party seeded selection · version | §3 / G5.10 |
| 2 | G5.9 anchor too boolean | **structured anchor** — exposure · capital ≥ exposure · tail · audit · slash · control(provider independence) | §4 / G5.9 |
| 3 | G5.5 stay ≠ finality; griefing unnamed | **appeal finality state machine + appeal bond + bounded stay + appeal liveness**; **Attack K** | §5.G5.5 / §7.K |
| 4 | "pairwise independent" overclaims | **F2 fix** — "no *registered* pairwise/common-control conflict under registry refs"; semantic stays legible | G5.4 |

## 0–2. Problem · authority · trichotomy  (unchanged from v0.2, compressed)

The judged layer rests on a verifier/arbiter/floorExecutor/appeal authority making a call the
contract cannot; a captured authority rubber-stamps the machine. **Bright line:** "passed G5" ≠
"fair judge" — the contract binds the *mechanical/registered* half; **semantic** independence,
ruling correctness, and **undisclosed** common control stay **legible/judged** (and value-capped).

## 3. `JudgmentEligibleSet` — the schema behind G5.10  (finding 1)

v0.2's "committed root + non-party selection" was prose. v0.3 gives it a structured, versioned,
party-independent artifact the chain checks by **membership + governance**, not vibes:
```
JudgmentEligibleSet[domain][version] = {
  members: [ { addr, g5_ref } ],     # each member carries its own G5/registry ref (G5.1–G5.3 resolvable)
  root,                              # Merkle/hash commitment over members (panel must prove membership)
  governance,                        # the set's admin/curator — address-distinct from ALL trade parties
  selection: { mode, seed_source },  # seeded-random | buyer-policy-deterministic — NOT party-shaped
  version                            # registered; the panel binds an eligible_set_ref{domain,version}
}
```
**G5.10 (enforced):** every panel member is in the **committed root** · the **selection is
non-party-seeded** · **every member carries a G5 ref** · the set **governance is party-independent**
· the **version is registered.** **Cannot enforce:** that the curator chose *wisely* (the set is a
legible, governed artifact). This is the **Attack-10 counter-shape, made a schema** — and it is what
keeps a **buyer-committed panel** (the chain's current `onlyBuyer` floor route) from being
*party-shaped*: the buyer may *propose* from the set, but cannot shape the set or the seed.

## 4. The G5.9 anchor — structured, not boolean  (finding 2)

v0.2's "high value needs a liability anchor" was a boolean. v0.3 structures it (the Verifier §4 /
Insurance §9 economics, applied to the judgment anchor):
```
G5.9_anchor = {
  exposure,            # value at risk the anchor must cover for this resolution
  capital (≥ exposure),# locked reserve/bond backing it
  tail,                # the bond OUTLIVES settlement (fraud surfaces late)
  audit,               # the audit regime/rate the anchor is subject to
  slash,               # the slashing condition on a proven-wrong high-value ruling
  control              # the anchor provider's own independence/conflict treatment (like a verifier/insurer)
}
```
**G5.9 (enforced where the anchor exists):** a **high-value** resolution requires an anchor with
**capital ≥ exposure · a tail · an audit regime · a slash condition · an independent provider** —
and calibration carries positive weight **only in powered cells.** A bare boolean "has anchor" no
longer passes.

## 5. The gates (falsifiable, per-subguard — §8)

- **G5.1** Non-party. · **G5.2** Role-exclusivity. · **G5.3** Registered control-distance (undisclosed
  never; disclosed-low only as a value-capped G5.8 downgrade). *(2)*
- **G5.4 — Non-sole-oracle + bound panel.** N-of-M at value · members M-distinct · each member passes
  its own G5 · ≥ M valid signatures · **no *registered* pairwise/common-control conflict (registry refs;
  semantic stays legible).** *(6)*
- **G5.5 — Appeal finality (not just a stay).** non-stayed appeal window · independent appeal authority
  · execution stayed until window close · **value finalizes only in appeal-state `final`** · **an
  appeal requires an appeal bond (anti-griefing)** · **the stay is bounded (no infinite appeals).** *(6)*
- **G5.6** Pairing/rotation cap. · **G5.7** Disclosure (anchored · no undisclosed-discovered · structured). *(3)*
- **G5.8** Downgrade ladder. *(2)*
- **G5.9 — Sparse-truth anchor (structured).** capital ≥ exposure · tail · audit · slash · independent
  provider · no calibration weight in underpowered cells. *(6)*
- **G5.10 — `JudgmentEligibleSet` integrity.** member ∈ committed root · non-party seeded selection ·
  every member has a G5 ref · party-independent governance · registered version. *(5)*

## 6. What this unblocks  (corrected claim carried from v0.2)

Consolidated **G1** floorExecutor passes G5.1 + G5.4 + G5.5 (**bound @ `9c0282a` at the `≥2`
curated tier**); Verifier/Insurance **§6/I13** = G5.4+G5.5. **G5 is necessary, not sufficient, for
high value** — which additionally needs the **G5.4 tier-scaled M**, the **G5.9 structured anchor**,
and the **G5.10 eligible-set**, **and** inherits the **sparse-truth limit** → **high value stays
curated/underwritten.** Binding the v0.3 schemas on-chain is what would move a high-value cell from
*value-capped* toward *value-alpha* — and even then it is *underwritten*, not open.

## 7. Attack surface — REVIEW HERE (+ K)

A buyer-aligned floor → G5.1 + return-custody + G5.4 + G5.5. · B seller-aligned arbiter → G5.1 +
G5.5. · C affiliate split → G5.3/G5.4 *registered* conflict; **undisclosed → legible + value-cap.** ·
D sole-oracle → G5.4 panel. · E appeal regress → **G5.9 structured anchor** (not reputation). · F
cozy-pair → G5.6. · G role-stacking → G5.2. · H disclosure evasion → G5.7 + slash. · I liveness
starvation → G5.8. · J registry/eligible-set capture → **G5.10 `JudgmentEligibleSet`** (root +
party-independent governance + non-party seed). · **K. Appeal-stay griefing (NEW).** an attacker
files frivolous appeals (or an appeal authority stalls) to **indefinitely stay value** / hold the
reserve. → **G5.5 appeal bond** (frivolous appeals cost the filer), **bounded stay** (no infinite
appeals), and **appeal liveness** (a default-finality if the appeal authority does not act — the
floor-liveness pattern, one level up). *Push here and on §7.E/J.*

## 8. Falsification — per-subguard

`simulations/judgment_independence_drill.py` — gates **G5.1–G5.10**, each compound guard mutated
**one subclause at a time**. v0.3 adds the **G5.5 finality/bond/bounded-stay** subguards, the
**G5.9 structured-anchor** subguards (capital/tail/audit/slash/control), the **G5.10
eligible-set-schema** subguards (member-g5-ref/governance/version), and rewords **G5.4 pairwise** to
*registered conflict*. **Result: 10/10 gates · 33/33 subguards with independent teeth**, plus the
G5.3↔G5.8 reconciliation assertion.

## 9. Maturity / open

- **Design only.** On-chain (beyond the floor core @ `9c0282a`) + the **`JudgmentEligibleSet`,
  control-distance, disclosure, and anchor registries** are **Codex's lane** (governance
  party-independent — §3/§7.J).
- **The F2 fix (finding 4) is load-bearing:** G5.4/G5.10 bind **registered** conflict; **semantic /
  undisclosed** common control stays **legible + value-capped** — the gate buys "no *known* conflict,"
  never "*is* independent."
- **Sparse-truth limit (unchanged):** high-value quality rests on the **G5.9 structured anchor**
  (liability/underwriting/audit), not calibration — so high value stays **curated/underwritten.**
- **Numbers/registries unspecced (named, not set):** min control-distance, tier-scaled M, the
  appeal-window + bounded-stay lengths, the appeal-bond size, exposure/capital/tail/audit/slash
  parameters, the eligible-set governance + seed mechanics, the powered-cell effective-N threshold.

## 10. Changelog
- **v0.3 (post-Kepler `900baf3`):** gave G5.10 a real **`JudgmentEligibleSet` schema** (members+G5
  refs / root / party-independent governance / non-party seed / version); structured the **G5.9
  anchor** (exposure/capital/tail/audit/slash/control); added the **G5.5 appeal finality state
  machine + appeal bond + bounded stay + liveness** and **Attack K (appeal-stay griefing)**; applied
  the **F2 fix** to G5.4 ("registered" pairwise conflict, semantic stays legible). Drill → **10/10
  gates · 33/33 subguards.** Verdict held; high value stays curated/underwritten.
- **v0.2** (`dbdd14a`, frozen): bound panel composition (G5.4), reconciled G5.3↔G5.8, execution stay
  (G5.5), structured disclosure (G5.7), sparse-truth gate (G5.9), registry-capture (G5.10); corrected
  the value-alpha claim. Diff target.
- **v0.1** (`f8f0b24`, frozen): the full G5 (G5.1–G5.8).
