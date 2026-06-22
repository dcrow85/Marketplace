# Protocol — Insurance v0.3  (alpha — post-Kepler re-review: schemas bound, teeth sharpened)

> **Status:** alpha. Revises v0.2 after **Kepler's re-review** (SYNC, 2026-06-22, `bb4855b`).
> **Verdict held:** survives, no thesis-fatal contradiction; v0.2 fixed the v0.1 overstatements.
> v0.3 lands the **four v0.3 follow-ups** Kepler logged: (1) the **coverage-floor becomes a
> canonical registry/DSL** (no free-text semantics); (2) the **attested-trigger branch is now
> bound** (authority set, signer, ref, outcome enum, scope) — new gate **I15**; (3) **common-control
> wording tightened** to *registered/disclosed/low-distance* (undisclosed = value-capped, not
> "barred"); (4) the drill now proves **per-subguard** mutation teeth, not just gate-level.
> On-chain binds are **Codex's lane.** **Spine:** enforced / legible / judged. **No-overclaim is law.**
> **Reviewed artifact:** `Protocol_Insurance_v0.2.md` @ `127c74d` (frozen; diff target).
> **Freeze:** v0.3 = the v0.4 diff target. **Reviewer:** Codex/Kepler.
> **Drill:** `simulations/insurance_gates_drill.py` — gates **I1–I15**, **per-subguard** teeth.

## What changed (the four follow-ups → dispositions)

| # | Kepler v0.3 follow-up | disposition | anchor |
|---|---|---|---|
| 1 | coverage-floor is semantic until registry/DSL-bound | **I11 made registry-bound** (predicate/exclusion bitsets, window bounds, payout-formula DSL, `coverage_floor_ref` version); non-registry floors **value-capped** | §8 / §12.I11 / §14 |
| 2 | attested-trigger branch underbound | **new gate I15** (signer ∈ authority set · scope-hash match · outcome ∈ enum · attestation anchored) + JSC fields + drill case | §3 / §12.I1/I15 / §14 |
| 3 | common-control over-claimed as "barred" | **wording tightened** — only *registered/disclosed/low-distance* is barred; **undisclosed wash = value-cap + signal-weight discount** (legible) | §2 / §12.I12 / §15 |
| 4 | drill teeth are gate-level, not per-subguard | **drill refactored** — every compound guard (I3,I6,I10,I11,I12,I14,I15) mutates **each subclause** independently | §18 |

## 0–1. What insurance is · the open role  (unchanged from v0.2)

The priced home for the honest residual — the no-overclaim form of protection ("if a covered event
is **ruled/attested** under the agreed trigger, you are made whole"). An open role; a bond is
self-insurance, a policy is third-party capital. Not authentication, not a guarantee, not a waiver
of the evidence floor.

## 2. The premium — honest only for a registered, floor-meeting, disclosed-independent policy  (finding 3)

A premium is a **capital-backed quote for an explicit, registry-floor-meeting `covered_predicate`** —
never a bare scalar, never an authenticity probability (I5). v0.2 over-claimed that common-controlled
cover is "excluded"; **the contract cannot enforce the absence of common control.** v0.3 tightens:
- **registered / disclosed / low control-distance** common control between insurer and a trade party
  is **barred from backing relief** (I12 — mechanical where the registry/disclosure exists);
- **undisclosed** common control stays **legible/judged** — it cannot be cleanly barred, so it is
  **value-capped and its premium-signal weight is discounted** (treating unknown distance as suspect).
So the premium curve is honest **across registered-independent, floor-meeting policies**, and is
*weight-discounted* elsewhere — not falsely advertised as wash-free.

## 3. The trigger schema — the attested branch, now bound  (finding 2)

Three trigger kinds, none insurer-discretion: **(a) authorized ruling**, **(b) on-chain mechanical
state**, **(c) authorized attested trigger.** v0.2 left (c) underbound. v0.3 binds it (gate **I15**):
an attested trigger admits **only if** —
- **signer ∈ the registered `attestation_authority_set`** for that trigger kind/scope,
- **`scope_hash` == the policy scope**,
- **`outcome` ∈ the fixed `outcome_enum`** (not free text),
- the **`attestation_ref`/hash is anchored** (replay-safe).

The contract enforces **signer / scope / hash / outcome-enum — NOT the loss.** The attested loss
stays **legible/judged**; payout language stays **"trigger fired."** This keeps "authorized" from
silently becoming a discretionary oracle. Windowed as before.

## 4. Trichotomy + bright line  (unchanged shape; attested binding added to ENFORCED)

**ENFORCED** adds, over v0.2: the **attested-trigger authority/scope/outcome/anchor (I15)** and the
**registry-bound coverage-floor membership (I11)**. **LEGIBLE** keeps the *truth* of an attested
trigger, the loss-ratio, the premium curve, and **common-control distance (disclosed or unknown)**.
The bright line is unchanged: **pay when the trigger fires; never decide authenticity; never assert
the attested loss is true.**

## 5–7. Payout path · arb tie-in · subrogation  (unchanged from v0.2)

Permissionless `executeInsurancePayout` gated by **I14** (active · unpaid · authorized · final ·
unstayed · in-window · scope-match). The funded-adversary mitigation of the floor residual stays
**conditional on G5-floor independence (I13 + §6)**. Subrogation **≤ actual payout (I7)**, via the
arbiter ladder (shared seam with `Protocol_Arbitration`).

## 8. Scoped policies + the coverage-floor REGISTRY  (finding 1)

v0.2's coverage-floor was the right idea but **semantic** — a contract cannot judge "broad enough" or
"tracks harm" from free text. v0.3 makes it a **canonical, versioned registry template per policy
class** (a legible artifact; the chain checks *membership*, not wisdom):
```
coverage_floor_registry[class][version] = {
  required_predicate_bits,   # bitset: the covered events a floor-meeting policy MUST include
  allowed_exclusion_bits,    # bitset: the only exclusions permitted (max_exclusions = popcount cap)
  window_bounds: { min, max },
  allowed_payout_formulas,   # enum/DSL set: {full_harm, harm_minus_deductible, fixed_schedule, ...}
  return_custody_required: bool
}
```
**I11 (enforced):** policy `predicate_bits ⊇ required_predicate_bits` · `exclusion_bits ⊆
allowed_exclusion_bits` and popcount ≤ cap · `window ∈ bounds` · `payout_formula ∈
allowed_payout_formulas` · `coverage_floor_ref` resolves to a **registered version**. **Judged:**
whether the registry's floor for a class is *wise* (the registry is legible, governed off-chain).
**Until a policy's floor is registry-bound, value-cap it** (a free-text floor cannot be trusted as floor-meeting).

## 9–11. Economics · deductible · cold-start  (unchanged from v0.2)

Fully-reserved is *nominal*, gated by **reserve integrity (I10)**; capital efficiency + adverse
selection stay **structural, value-capped.** Deductible ≥ floor (I9). Insurers bootstrap like verifiers.

## 12. The enforced gates (falsifiable, per-subguard — §18)

- **I1** trigger ∈ {ruling, on-chain state, **authorized attestation**} — never insurer-discretion (the attested branch is now exercised).
- **I2** insurer ≠ any trade party.
- **I3** reserve ≥ max payout **·** aggregate exposure cap. *(2 subguards)*
- **I4** any post-delivery buyer-favoring payout where the buyer holds the card ⇒ return-custody.
- **I5** premium never rendered as an authenticity verdict.
- **I6** relief is **non-additive** across import+bootstrap+coverage **·** solvency-gated. *(2 subguards)*
- **I7** subrogation ≤ actual payout.
- **I8** per-cohort exposure cap.
- **I9** buyer deductible ≥ floor.
- **I10** reserve integrity: ref-unique **·** non-rehypothecated **·** stack-conservation **·** asset-declared **·** haircut-policy. *(5 subguards)*
- **I11** coverage-floor **registry membership**: predicate-bits ⊇ required **·** exclusion-bits ⊆ allowed **·** window ∈ bounds **·** formula ∈ allowed **·** floor_ref registered. *(5 subguards)*
- **I12** common-control: insurer ∉ registered control-set **·** not (low/undisclosed distance buying relief). *(2 subguards)*
- **I13** high-value insurance requires an independent, non-sole floor (else value-cap).
- **I14** permissionless-payout finality/replay: active **·** unpaid **·** authorized **·** final **·** unstayed **·** in-window **·** scope-match. *(7 subguards)*
- **I15** attested-trigger authority/scope: signer ∈ authority-set **·** scope-hash match **·** outcome ∈ enum **·** attestation anchored. *(4 subguards)*

## 13–14. Lifecycle · the JSC insurance-block  (v0.3 fields added)

**JSC insurance-block (v0.3 additions in *bold*):**
```
JSC.insurance = {
  insurer, control_distance_to_parties, control_disclosed,     # I2 + I12 (disclosed vs unknown)
  scope, covered_predicate_bits, exclusion_bits,               # I11 (bitsets)
  coverage_floor_ref: { class, version },                      # I11 (registered)
  payout_formula (∈ allowed),                                  # I11
  trigger_kinds: [ ruling | onchain_state | attested ],
  attested: { authority_set, signer, attestation_ref, outcome_enum, scope_hash },  # I15
  premium: { amount, payer: buyer, paid },
  max_payout, deductible (≥ floor),
  reserve: { asset, custodian, reserve_ref(unique,non_rehyp), haircut_policy, stack_total_locked ≥ max_payout },  # I10
  cohort_key, window: { opens, closes }, return_custody_ref,
  trigger_finality: { authorized, final, appeal_status },      # I14
  subrogation: { assignee: insurer, bounded_by: actual_payout },  # I7
  reinsurance_stack: [ { reinsurer, sub_reserve_ref } ]
}
```

## 15. Invariants (updated)

1–7 as v0.2 (payout never asserts card-truth; insurer ≠ party; reserve integrity; finality gates the
path; return-custody; subrogation ≤ actual payout; deductible ≥ floor). **8 (tightened):** a
**registered/disclosed/low-distance** common-controlled, or **non-registry-floor**, or **sub-floor**
policy buys **no relief** and is **off the premium signal**; **undisclosed** common control is
**value-capped + signal-weight-discounted**, not claimed barred. **9 (new):** an attested trigger is
**form-enforced** (signer/scope/outcome/anchor, I15) and **truth-legible** — never mechanically true.

## 16. Attack surface  (which became gates — updated)

A collusion → I2 + I12 + ruling/attested trigger. · B fake-claim → I4 + I9. · C adverse selection →
structural/value-cap. · D moral hazard → I9. · E insolvency → I10 + I8 + stack conservation. ·
**F captured floor → I13 + value-cap; STILL the sharpest dep (G5-floor).** · G premium-as-verdict →
I5 + §2 qualifier. · H centralization → structural. · I subrogation abuse → I7. · J window/griefing →
I14. · **K cover-in-name-only → I11 registry membership.** · **L attested-oracle capture → I15
authority/scope.** · **M undisclosed wash-insurance → legible, value-capped (§2/§12).**

## 17. Maturity / open

- **Design only — nothing built.** On-chain binds + the **coverage-floor registry** and **attestation-
  authority registry** are **Codex's lane** (new shared surfaces).
- **Now gated:** registry-bound coverage-floor (I11), attested-trigger authority/scope (I15); plus
  v0.2's I10–I14.
- **Structural / value-capped:** capital efficiency, adverse selection, **undisclosed** common
  control, floor-capture-where-sole-oracle.
- **Load-bearing external dependency (unchanged): G5-floor independence** — §6/I13 lean on it.
  **Insurance is not value-alpha for high-value cells until I11/I15 schemas are enforceable on-chain
  and G5-floor lands**, with common-control semantics explicitly value-capped (Kepler's net).
- **Numbers/registries still unspecced:** the predicate/exclusion bitsets per class, the payout-formula
  DSL, the attestation-authority sets, and all caps/thresholds — *named, not set.*

## 18. Falsification — now per-subguard

`simulations/insurance_gates_drill.py` — deterministic, model-free; gates **I1–I15**. Refactored per
Kepler's finding 4: every **compound** guard (I3, I6, I10, I11, I12, I14, I15) is mutated **one
subclause at a time** — for each subguard, an attack violating *only* it must block under the full
gate **and** flip to admit when *only that subguard* is disabled. This proves each subcondition is
**independently load-bearing**, not just the gate as a whole. **Result: 15/15 gates · 35/35
subguards with independent teeth** (each compound subclause blocks its targeted attack and flips
to admit when only that subclause is disabled).

## 19. Changelog
- **v0.3 (post-Kepler re-review `bb4855b`):** coverage-floor made a **registry/DSL** (I11 registry
  membership; non-registry floors value-capped); **attested-trigger branch bound** (new gate I15 +
  JSC `attested{authority_set,signer,attestation_ref,outcome_enum,scope_hash}` + drill case);
  **common-control wording tightened** to registered/disclosed/low-distance, undisclosed = value-cap +
  signal discount; **drill refactored to per-subguard mutation teeth.** Attack surface +K/+L/+M.
  Verdict held: survives; **gated, not value-alpha** until I11/I15 + G5-floor are enforceable.
- **v0.2** (`127c74d`, frozen): promoted the six v0.1-review findings to gates I10–I14, fixed the F2
  trigger leak + subrogation bound, qualified the premium. Diff target.
- **v0.1** (`7a69eee`, frozen): the role + I1–I9.
