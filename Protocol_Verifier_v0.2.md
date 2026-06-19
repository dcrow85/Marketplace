# Protocol — Verifier v0.2  (alpha — revised after adversarial review)

> **Status:** alpha. Revises v0.1 after **Kepler's adversarial review** (SYNC handshake,
> 2026-06-19), which found §9.A **fatal to v0.1's central thesis** and caught v0.1
> committing its own `legible→enforced` sin (§1). v0.2 corrects both. Still **design
> only — nothing built.** On-chain binds = **Codex's lane**. Changelog at the end (§11).
> **Spine:** enforced / legible / judged. **No-overclaim is law.**
> **Reviewed artifact:** `Protocol_Verifier_v0.1.md` @ 6c2adad (frozen; diff against it).

## 0. What a verifier is (unchanged from v0.1)

The only role that crosses the physical gap: a human — or, narrowly, an agent — who
inspects a thing and turns the look into a **scoped, signed claim**, never a verdict:
`{scope, not_claiming[], confidence, evidence_examined, verifier_id, bond_ref}`.

## 1. The corrected thesis — calibration is REGIME-GATED, not universal

v0.1 said "calibration, not certification." The review killed that as a *universal* claim:
**a statistic you cannot power is not a signal — it is certification laundered through a
score.** Resolved truth is sparse, and the `(verifier × scope × value)` cells that matter
most — high-value, low-frequency — are exactly the ones that never reach significance.

So v0.2 runs **two regimes**, gated by **effective-N** (the count of *trustworthy* resolved
outcomes for that verifier-scope-value cell, after the censoring discount of §6):

- **Powered cell** (effective-N above threshold): calibration drives selection. The score
  carries a **confidence interval**; the buyer's cost field reads the **lower bound**, never
  the point estimate.
- **Underpowered cell** (sparse effective-N): calibration carries **NO positive weight.**
  Assurance comes from **liability + underwriting + audit + escalation**, not a pretended
  score. Value is **capped** to what the cell's power supports.

The honest name for the high-value end is therefore **"curated / underwritten alpha,"
not an open calibration market.** A verifier earns their way from *underwritten* into
*calibrated* as effective-N accrues — cold-start and the high-value end are the **same**
regime, and we stop pretending otherwise.

## 2. Trichotomy placement — corrected (the §1 fix)

The review caught v0.1 putting **independence** in `enforced` — but the contract can bind
only the *mechanical* half. The buckets, restated precisely:

**ENFORCED** (the contract can bind these, and *only* these):
active role registry · verifier signature · **verifier ≠ buyer/seller** (address identity) ·
buyer-approved canonical **scope hash** match · subject (item) hash anchored · method hash ·
bond amount + **tail** locked · per-attestation **exposure** recorded · authorized
arbiter/floor **liability ruling** · replay protection · payout math.

**LEGIBLE** (recorded, measured — NOT enforced):
the attestation content + evidence · the calibration vector + its **effective-N / CI** ·
**conflict / common-control / undisclosed-stake** (independence's *semantic* half) ·
the bond's "harm-proportional" sizing (a deterministic schedule, or a signed score-root
oracle — labeled legible, never an on-chain truth claim).

**JUDGED:**
whether the card is as attested · whether evidence is enough for *this* buyer · whether an
arbiter's "wrong" ruling actually corresponds to reality.

**The contract CANNOT enforce** (none of these may appear as `enforced`): semantic
independence, diverse methods, no-undisclosed-stake, calibration truth, proper scoring,
audit execution, remote physical truth, `not_claiming[]` semantics, or that a "wrong"
ruling matches reality.

## 3. The signal architecture (revised)

Truth is scarce, expensive, late — **and not neutral** (§6). The funnel:

- **Tier 0 — cheap filters, NO ground truth:** inter-rater agreement, anomaly stats,
  evidence quality. **Agreement carries ZERO truth weight** until anchored to *both*
  (a) registry + control-distance (raters provably independent) and (b) audited ground
  truth — otherwise Sybil consensus eats it (was C).
- **Tier 1 — expensive anchors:** risk-weighted audits + organic outcomes — but organic
  outcomes are **poisonable** (§6); they enter calibration only with provenance + censoring
  weights + audit-origin labels.
- **Scoring:** proper scoring rule, time-decayed, **effective-N-gated** (§1) — and it must
  also score the **opportunity set, scope coverage, abstentions, censoring, and
  time-to-resolution**, or it is gamed by selection / abstention-farming / easy-card
  specialization / delayed resolution (was F).

## 4. Economics — portfolio, not per-attestation (was B + the bond fix)

- A single-attestation slash does **not** unwind patient collusion. Bonds are **portfolio**:
  rolling **exposure caps** (total open attested value per verifier), **campaign-level
  clawback / portfolio slash**, **seller-verifier correlation limits**, and a bond **tail
  sized by open exposure**, not by the single trade.
- "Bond proportional to harm" and "staked on the score" are **not on-chain truth** — they're
  a **deterministic schedule** + a **signed score-root oracle** (legible), or they're
  off-chain. Removed from the enforced bucket.
- Cold-start = the underpowered regime (§1): graduated value caps, **underwriter / mutual
  co-bonding**, capital substituting for the calibration that does not yet exist.

## 5. Audit math — the deterrence inequality (was E, was fatal)

An audit regime is real only if, per fraud opportunity:

> **p_detect × slash  +  reputation/legal loss  >  fraud profit.**

The spec must therefore carry (it does not yet — open, §9): the **physical** audit rate
(remote audits miss card-swaps — they bound only the *digitally-detectable* fraction); the
**detectable-fraud fraction**; the **funding source** and **who bears the cost**. Until
these numbers exist, **E is unmet and high-value verification is not deterrence-safe.**

## 6. Outcome integrity — the 9th attack (NEW: poisoned / censored truth)

Tier-1 "organic harvesting" is **not neutral truth**: clean settlements are mostly
**unobserved**; bad outcomes get **settled off-protocol**; friendly arbiters/regraders can
**manufacture "resolved" labels**; colluders **farm cheap clean outcomes** to build a record,
then spend it on one grail. So a resolved outcome is *itself a claim with provenance.*
Before it feeds calibration it needs an **origin label** (audit / organic / dispute),
**adversarial-censoring weights** (down-weight selection-prone observations), and exclusion
of **self-resolved / related-party** labels. Calibration on un-vetted outcomes is
calibration-on-poison.

## 7. The agent boundary — split the types (was H, product-fatal if leaked)

Two distinct attestor types, **never one downstream label**:
- **`LegibilityAgentAttestor`** — image↔catalog match, symbol coherence, cert-lookup
  consistency, evidence completeness. **Digital only**, free/fast, NEVER physical truth.
- **`PhysicalVerifier`** — handled the card; scoped physical attestation; bonded.

**No scalar "trust score" display anywhere**; `not_claiming[]` preserved in **every** human
surface. Collapsing these two behind one label is the product-fatal leak.

## 8. Residual-risk pricing (was G)

Honest-but-fooled and malicious are short-run indistinguishable, so the spec **prices** the
residual rather than pretending to remove it: **method floors** per value tier, explicit
**counterfeit-state-of-the-art caveats**, **liability caps**, and mandatory **escalation**
(multi-verifier / grader) for the worst cell — **high-value RAW** cards (high stakes, no slab).

## 9. Maturity / open (the still-unmet pieces — be honest)

v0.2 converts the fatal findings into **named constraints**, but several are constraints
whose *numbers do not exist yet*:
- the **effective-N threshold + CI math** (§1) — unspecced; the regime gate is qualitative.
- the **audit-economics numbers** (§5) — unspecced; **E remains unmet** until they exist.
- the **outcome-provenance + censoring-weight model** (§6) — unspecced.
- the **underwriting / mutual mechanics** for the high-value regime (§1, §4).
- on-chain mechanics (Codex): the mechanical-bind list in §2.

## 10. Structural caveat (was D — not contract-fixable)

Capital-heavy cold-start + portfolio bonds + reputation-collateral **will centralize** the
high-value end toward the well-capitalized. This is **structural, not a bug to patch**: the
honest framing is explicit **low-value calibration lanes** (open) plus a **curated/
underwritten high-value lane** (not open). v0.2 names this rather than hiding it.

## 11. Changelog

- **v0.2 (post-Kepler):** central thesis corrected — calibration is **regime-gated**
  (powered vs underpowered), not universal; high value moves to **underwriting / liability /
  audit** and is honestly labeled curated, not an open market (§1, §10). Fixed v0.1's
  `legible→enforced` sin — **independence split** into mechanical-enforced vs semantic-legible
  (§2). Bonds made **portfolio** (§4). Added the **9th attack** (outcome poisoning, §6), the
  **audit-deterrence inequality** (§5), the **agent-type split** (§7), **residual-risk
  pricing** (§8), and the explicit **enforced-vs-cannot-enforce** contract boundary (§2).
  Remaining quantitative gaps named honestly in §9 — v0.2 makes the design *survivable*, not
  *done*.
