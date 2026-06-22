# Protocol — Insurance v0.2  (alpha — post-Kepler: claims promoted to gates)

> **Status:** alpha. Revises v0.1 after **Kepler's adversarial pass** (SYNC, 2026-06-22, `170a7b3`).
> **Verdict held:** no thesis-fatal contradiction — insurance survives as the adversarial front door
> for *priced residual risk* — **but it is not yet a value-alpha gate.** v0.1 overstated several
> claims; v0.2 **promotes them from prose to hard gates / value caps**, fixes two F2-class /
> schema bugs, and **closes the drill-incompleteness caveats** Kepler named (I3/I4/I6).
> **The point of this doc is still §16 (Attack Surface) + the gates §12.** Hit them hard.
> On-chain binds are **Codex's lane.** **Spine:** enforced / legible / judged. **No-overclaim is law.**
> **Reviewed artifact:** `Protocol_Insurance_v0.1.md` @ `7a69eee` (frozen; diff target).
> **Freeze:** v0.2 = the v0.3 diff target. **Reviewer:** Codex/Kepler.
> **Drill:** `simulations/insurance_gates_drill.py` — gates **I1–I14**.

## What changed (the six findings → dispositions)

| # | Kepler finding | v0.2 disposition | anchor |
|---|---|---|---|
| 1 | "fully-reserved ⇒ insolvency impossible" is only *nominal* | **hard gate I10** (reserve integrity) + manifest entry; capital-efficiency/adverse-selection stays structural → value caps | §9 |
| 2 | premium is *not* un-gameable (narrow predicate / wash-insurance) | **hard gates I11** (coverage-floor) **+ I12** (common-control); premium re-phrased as a *capital-backed quote for an explicit predicate* | §2/§8 |
| 3 | captured floor stays load-bearing; insurance ≠ floor independence | **gate I13** (high-value needs an independent, non-sole floor) + value-cap; §6 mitigation made *conditional* | §6 |
| 4 | F2 leak: `transit_loss_attestation` is not mechanical truth | **fixed** — trigger kinds split into *on-chain mechanical state* vs *authorized attested trigger*; payout language stays "trigger fired" | §3/§4 |
| 5 | subrogation bound inconsistent (`max_payout` vs actual) | **fixed** — §14 binds `actual_payout`; adds direction/formula + return-custody ref + finality/appeal | §7/§14 |
| 6 | permissionless payout lacks finality/replay fields | **hard gate I14** (active/unpaid/final/unstayed/in-window/scope-match) | §5/§14 |

## 0–1. What insurance is · the open role  (unchanged from v0.1, compressed)

Insurance is **the priced home for the honest residual** the protocol refuses to enforce away —
the *no-overclaim form of protection*: not "this is real" but "if a covered event is **ruled** under
the agreed trigger, you are made whole." It is an **open role** (anyone can insure): post capital,
write a scoped policy, collect premium, pay on a triggered claim. A bond is self-insurance; a policy
is third-party capital. It generalizes Verifier §4 underwriting, Bootstrap capital-as-trust, and the
transit-only `route_insurance`. **It is NOT** authentication, a guarantee, a waiver of the evidence
floor, or a pot the insurer can deny at will.

## 2. The premium — a capital-backed quote for an explicit predicate  (finding 2: qualified)

v0.1 called the premium "the one honest scalar." **Kepler is right that this overstates it.** A
premium is honest **only for the exact `covered_predicate` it prices** — and only if that predicate
**meets the coverage floor (I11)** and the insurer is **not common-controlled with a trade party
(I12).** A cheap premium can otherwise be *manufactured*: a **narrow predicate / heavy exclusions**
("cover in name only") never pays, so it quotes cheap; or **wash-insurance** under common control
behind distinct addresses quotes cheap because the "loss" is internal.

So v0.2: the premium is **"a capital-backed quote for *this explicit, floor-meeting* predicate,"**
surfaced with the predicate and the common-control distance attached — **never** a bare scalar and
**never** an authenticity probability (I5). The premium curve (quote distribution) is still a
legible signal, but only **across floor-meeting, independence-clean policies.** Sub-floor or
common-controlled cover is **excluded from the signal and barred from buying relief.**

## 3. The trigger schema — split mechanical vs attested  (finding 4: F2 fix)

A policy binds a `covered_predicate` + scope at formation; payout fires **iff** a matching trigger
is anchored. v0.1 lumped `transit_loss_attestation` with mechanical predicates — **that was the F2
leak.** v0.2 splits trigger kinds into **three**, none of them insurer-discretion:

- **(a) Authorized claim ruling** (arbiter/floor) whose outcome matches the predicate — `ruled_counterfeit`,
  `ruled_condition_below_attested`, `ruled_nondelivery`. Enforced: the ruling event + scope match.
- **(b) On-chain mechanical state** the contract *actually evaluates* — `nondelivery_timeout`, a
  missed-window state, a custody-nonce failure recorded on-chain. **Genuinely mechanical.**
- **(c) Authorized attested trigger** — a **signed** `transit_loss` / `custody_failure` attestation.
  **The contract enforces the signer / scope / hash of the attestation — NOT the loss itself.** The
  loss is **legible/judged**, never "mechanically true." Payout language stays **"trigger fired,"
  never "loss happened."**

Windowed: the trigger must occur within the policy's resolution window; the reserve is held to window close.

## 4. Trichotomy placement + the bright line  (updated for the attested trigger)

**ENFORCED:** policy registered + insurer signature · premium paid before coverage active · **reserve
locked ≥ max payout + reserve-integrity (I10)** · aggregate **+ per-cohort** caps · **insurer ≠ trade
party** · payout only on a §3 trigger matching the bound predicate/scope · **the signer/scope/hash of
an attested trigger (§3c) — NOT its truth** · **post-delivery buyer-favoring payout ⇒ return-custody
(I4)** · **deductible ≥ floor (I9)** · payout math + **subrogation ≤ actual payout (I7)** ·
**payout finality/replay fields (I14)** · window/reserve-release timing · replay protection.

**LEGIBLE:** scope + exclusions · **the truth of an attested trigger (§3c)** · loss-ratio / payout
history / time-to-pay · premium schedule + curve · **common-control distance (I12)** · exposure
concentration · reinsurance relationships.

**JUDGED:** whether the insured event truly happened · loss reality / claim validity · pricing
quality · coverage adequacy for *this* buyer.

**THE BRIGHT LINE:** the contract pays **when the trigger fires; it NEVER decides authenticity, and
NEVER asserts the attested loss is true.** Payout is ruling-/state-/attestation-triggered — **never
insurer-discretion.** **Cannot enforce:** fair premium, trigger↔reality, book diversification,
subrogation recovery, that common control is absent.

## 5. The no-discretion payout path + finality/replay  (finding 6: gated)

The reserve is **escrow-held by the contract.** `executeInsurancePayout(policyId, triggerRef)` is
**permissionless** — but v0.2 makes its preconditions a **hard gate (I14)**: before moving reserve it
must check **active policy · unpaid (replay) · trigger authorized · trigger final & not appeal-stayed
· within window · predicate/scope match.** Then a captured insurer **cannot deny** and a colluding
buyer **cannot extract** — *and* a griefer cannot force a premature/wrong payout. Discretion lives
nowhere; finality lives in the trigger validator.

## 6. The arbitration tie-in — now conditional  (finding 3)

The ruling is the payout oracle, and **subrogation makes the insurer a funded adversary** who chases
the seller bond / verifier slash (§7). **But Kepler is right that this does NOT replace floor
independence.** The funded-adversary mitigation of the G1 floor-receipt residual holds **only when:**
(i) **floorExecutor + appeal independence are gated** (the consolidated-spec G5, extended to the
floor — the same dependency my G1 author≠verifier pass flagged); (ii) the **insurer has standing to
appeal**; (iii) **return-custody (G1 (a))** is gated. If the floor is a **sole / capturable oracle**,
the insurer is a *funded victim*, not a working oracle — so **high-value insurance value-caps unless
the floor/appeal path is independent and non-sole (I13).**

## 7. Subrogation → bond-slash  (finding 5: bound to ACTUAL payout)

On payout the contract assigns the buyer's recovery rights to the insurer, **bounded by the *actual
paid amount*** (not `max_payout` — the v0.1 §14 bug), net of the deductible. The insurer inherits the
buyer's standing and pursues recovery **through the arbiter ladder** — the slash flows from a ruling,
never insurer fiat. Recovered funds repay the insurer up to the payout; residual to the buyer.
**SHARED SEAM** with `Protocol_Arbitration` (Codex's chain lane) — `[BLOCKING]` before any edit.

## 8. Scoped policies + the coverage-floor schema  (finding 2: gated)

Scopes: **authenticity · condition · transit/custody · verifier-error reinsurance.** Each policy
class carries a **canonical coverage floor (I11)** — a policy below it is *sub-floor*, barred from the
premium signal and from buying relief:
```
coverage_floor[class] = {
  min_predicate_breadth,        # the covered event must be broad enough to be real cover
  max_exclusions,               # exclusions capped so "cover in name only" is inadmissible
  min_window,                   # long enough for late-surfacing fraud
  return_custody_required: bool # for post-delivery buyer-favoring payout (I4)
  min_payout_formula            # payout must track the harm, not a token sum
}
```

## 9. Economics — reserve solvency is NOMINAL, gated by integrity  (finding 1)

v0.1 said full reservation makes payment-insolvency "impossible by construction." **Kepler is right
that this is only *nominal*** — true **only in the settlement asset**, and **only if** the reserve is
real. v0.2 makes that an explicit **hard gate (I10):**
- **reserve_asset declared + custodian declared** (→ `trusted_base_manifest`), with a **haircut / peg
  policy** so a depeg or volatile asset cannot silently under-collateralize;
- **reserve_ref unique + non-rehypothecated** — one reserve backs exactly one policy's `max_payout`;
- **reinsurance: `stack_total_locked ≥ max_payout`** — sub-reserves **sum**, never double-counted.

With I10, full reservation kills payment-insolvency *in the declared asset*. What **remains
structural** (named, value-capped, not patched): **capital efficiency** (fully-reserved cover is
capital-intensive → premiums price real locked capital — the honest cost) and **adverse selection**
(cover forms where it's cheapest → grails may stay uninsurable → **value-cap where cover exists only
for easy cells**).

## 10–11. Deductible · insurer cold-start  (unchanged from v0.1, compressed)

Buyer retains a **deductible ≥ floor (I9)** — keeps skin, raises fake-claim cost, never waives the
walls. Insurers **bootstrap like verifiers** — graduated exposure, heavier early audit, capacity
earned on a legible loss-ratio/time-to-pay record; capital substitutes for record until it exists.

## 12. The enforced gates (falsifiable — §18)

- **I1** trigger is a ruling / on-chain state / authorized attestation — **never insurer-discretion** (§3).
- **I2** **insurer ≠ any trade party** (address distinctness).
- **I3** **reserve ≥ max payout** + aggregate exposure cap, before coverage is active.
- **I4** **any post-delivery buyer-favoring payout where the buyer holds the card ⇒ return-custody** (broadened; only non-arrival/transit-loss is exempt).
- **I5** premium **never** rendered as an authenticity score/verdict — only as a quote for the explicit predicate.
- **I6** bond relief is **non-additive across the full import + bootstrap + coverage lattice**, capped, solvency-gated (broadened).
- **I7** **subrogation ≤ actual payout** (not max_payout).
- **I8** **per-cohort** exposure concentration cap.
- **I9** buyer **deductible ≥ floor**.
- **I10** **reserve integrity** — unique non-rehypothecated reserve_ref · reinsurance `stack_total_locked ≥ max_payout` · declared asset + haircut/peg.
- **I11** **coverage-floor** — predicate breadth / exclusions cap / min window / return-custody; sub-floor cover is barred from relief + the signal.
- **I12** **common-control** — an insurer in the seller's control set is barred from backing that trade's relief; the premium signal is discounted/capped under low control-distance.
- **I13** **high-value insurance requires an independent, non-sole floor/appeal path** — else value-cap.
- **I14** **permissionless-payout finality/replay** — active · unpaid · trigger authorized & final & unstayed · in-window · predicate/scope match.

## 13–14. Lifecycle · the JSC insurance-block  (updated)

Lifecycle: aperture names a certainty instrument → floor-meeting, independence-clean insurers quote →
buyer binds one; premium paid, **reserve locked + integrity-checked (I10)**, policy anchored in the
JSC → coverage active → on a §3 trigger within the window, **`executeInsurancePayout` (I14-gated)**
pays (post-delivery buyer payout gated on return-custody) → **bounded subrogation** via the arbiter
ladder → reserve releases at window close → outcomes feed the loss-ratio + premium curve.

**JSC insurance-block (v0.2 — field-level, with the fixes):**
```
JSC.insurance = {
  insurer, control_distance_to_parties,                 # I2 + I12
  scope, covered_predicate, exclusions, coverage_floor_ref,  # I11
  trigger_kinds: [ ruling | onchain_state | attested ],      # §3 (attested = form-enforced only)
  premium: { amount, payer: buyer, paid },
  max_payout, deductible (≥ floor),                     # I9
  payout_formula, payout_direction,                     # finding 5
  reserve: { asset, custodian, reserve_ref(unique,non_rehyp), haircut_policy,
             stack_total_locked (≥ max_payout) },        # I10
  cohort_key,                                           # I8
  window: { opens, closes },
  return_custody_ref,                                   # I4
  trigger_finality: { authorized, final, appeal_status },    # I14
  subrogation: { assignee: insurer, bounded_by: actual_payout },  # I7 (fixed: was max_payout)
  reinsurance_stack: [ { reinsurer, sub_reserve_ref } ]
}
```
**Enforced:** field presence + hashes · insurer ≠ party · reserve ≥ max_payout + integrity · cohort cap ·
payer ∈ {buyer} · window/trigger-kind validity · subrogation ≤ actual_payout · I14 finality. **Cannot
enforce:** fair premium, trigger↔reality, book diversification, absence of common control.

## 15. Invariants (must hold)

1. A payout NEVER asserts an `enforced` truth about the card — only that a **trigger fired**; an
   attested trigger (§3c) is **form-enforced, truth-legible.**
2. Insurer ≠ trade party (enforced); common control is legible + **discounted/barred from relief (I12).**
3. **Reserve ≥ max_payout, with integrity (I10);** aggregate + per-cohort capped.
4. A validly-triggered claim cannot be denied; an invalidly-triggered one cannot be paid; **finality
   gates the path (I14).**
5. Post-delivery buyer-favoring payout (buyer holds the card) **requires return-custody (I4).**
6. **Subrogation ≤ actual payout**; the slash flows through the arbiter ruling.
7. Buyer retains a **deductible ≥ floor.**
8. A **sub-floor or common-controlled** policy buys **no relief** and is **off the premium signal.**

## 16. Attack surface — REVIEW HERE (which became gates)

A insurer/seller collusion → I2 + **I12** + ruling-trigger; residual common-control legible. ·
B fake-claim → I4 (broadened) + I9. · C adverse selection → structural, **value-capped** (§9). ·
D moral hazard → I9. · E insolvency/correlated loss → **I10** (integrity) + I8 + reinsurance
conservation; *attack the stack accounting.* · **F captured floor → I13 + value-cap; STILL the
sharpest open dependency (needs G5-floor independence).** · G premium-as-verdict → I5 + the §2
predicate qualifier. · H capital centralization → structural (full reservation *raises* the bar). ·
I subrogation abuse → I7 (actual). · J window/timing/griefing → **I14** finality/replay.

## 17. Maturity / open

- **Design only — nothing built.** On-chain binds are **Codex's lane.**
- **Now gated (were overstated prose):** reserve integrity (I10), coverage-floor (I11), common-control
  (I12), high-value-floor (I13), payout finality (I14), subrogation-to-actual (I7/§14), trigger split (§3).
- **Structural / value-capped, not closeable:** capital efficiency + adverse selection (§9); common
  control *semantics* (legible, not enforceable); floor capture where the floor is a sole oracle (§6/I13).
- **Hard external dependency:** **floorExecutor + appeal independence (G5-floor)** — §6's mitigation
  and I13 both lean on it; it must land as a real gate in the consolidated spec / chain.
- **Numbers still unspecced:** capital-cost rate, cohort caps, window length, deductible floor,
  coverage-floor parameters, haircut levels, control-distance thresholds — *parameters named, not set.*

## 18. Falsification

`simulations/insurance_gates_drill.py` — deterministic, model-free; gates **I1–I14**, each with a
mutation control. v0.2 also **closes Kepler's drill-incompleteness caveats:** **I4** now fires for
*any* post-delivery buyer-favoring payout where the buyer holds the card (not just authenticity/
condition); **I6** now spans the full **import+bootstrap+coverage** relief lattice; **I10** adds the
reserve-stack/asset-integrity coverage I3 lacked. **Result: 14/14 with teeth.**

## 19. Changelog
- **v0.2 (post-Kepler `170a7b3`):** promoted the six findings to gates/value-caps — reserve integrity
  (I10), coverage-floor (I11), common-control (I12), high-value-independent-floor (I13), payout
  finality/replay (I14); fixed the F2 trigger leak (§3 split) and the subrogation bound (§7/§14 →
  actual_payout); qualified the premium claim (§2); made §6's floor mitigation conditional; named
  capital-efficiency/adverse-selection/common-control/floor-capture as **structural, value-capped.**
  Broadened the drill (I4/I6) + added I10–I14 → **14/14 with teeth.** Verdict held: survives, now
  closer to a value-alpha gate but **gated, not done** (G5-floor independence is the load-bearing
  external dependency).
- **v0.1** (`7a69eee`, frozen): the role, premium-as-signal, trigger schema, no-discretion payout,
  fully-reserved economics, subrogation, scoped policies, I1–I9. Diff target.
