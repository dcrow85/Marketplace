# Protocol — Verifier v0.1  (ALPHA — built for adversarial review)

> **Status:** alpha design spec. Authored by Claude (surface/design lane), 2026-06-18.
> **The point of this doc is §9 (Attack Surface).** Hit it hard.
> On-chain binds (bond, slash, registry, scope-match) are **Codex's lane** — this
> specs the ROLE and the trust SIGNAL, not the Solidity.
> **Spine:** enforced / legible / judged. **No-overclaim is law.**
> **Related:** `Protocol_Arbitration_v0.1` (the judgment market + bond/floor arbiter),
> `Protocol_Interrupt_Bar_v0.1` (the gate + evidence floors NR-A…NR-D),
> `Protocol_Legibility_v0.1` (vector, not verdict).

## 0. What a verifier is (and is not)

The **only role that crosses the physical gap**: a human — or, narrowly, an agent —
who inspects a thing and turns the look into a **scoped, signed claim.**

- Output is a **scoped attestation, never a verdict**:
  `{scope, not_claiming[], confidence, evidence_examined, verifier_id, bond_ref}`.
  e.g. *"for surface + centering, raw: reads LP+; did NOT examine authenticity;
  confidence 0.8; evidence E1–E3."*
- A verifier is **never "trusted."** It carries a *measured calibration*, weighed by
  the buyer's cost field. Approval is not trust; calibration is.

## 1. Trichotomy placement (the hard line)

| Bucket | What | Where |
|---|---|---|
| **enforced** (validator-checked) | attestation is well-formed, signed by a registered verifier, **in-scope** (scopeSetHash match), **current** (catalog hash), bond posted + **time-locked**, verifier **independent** (≠ seller/buyer, no undisclosed sale stake) | on-chain — Codex |
| **legible** (measured, not enforced) | the attestation content, the evidence artifacts, the verifier's **calibration vector** | off-chain — measured |
| **judged** | whether the card is *actually* as attested; whether the evidence is *enough for this buyer* | human / arbiter / agent-policy |

**The protocol enforces the FORM of a claim and records the CLAIM. It never enforces
the TRUTH.** (The custody F2 bug — an off-chain `attested:true` promoted to `enforced`
— was exactly this line crossed. Same failure mode here is fatal.)

## 2. Calibration, not certification (the thesis)

A verifier is a **measured calibration vector**, not an approved entity: over resolved
outcomes, does stated confidence *X* track reality ~*X*? The market sorts verifiers on
**calibration × cost × turnaround × scope-coverage**. The buyer's cost field sets the
bar; the agent selects a verifier that clears it.

## 3. The signal architecture — rationing scarce truth

**Truth (did the card turn out as attested) is scarce, expensive, and LATE.** The whole
design is a funnel that spends as little of it as possible while making honest
calibration the profitable play.

- **Tier 0 — cheap, always-on, NO ground truth (filters):**
  - *inter-rater agreement* — N independent verifiers with **diverse methods**
    (surface / print-lines / slab-integrity); chronic divergence from a diverse
    consensus is suspect (agreement ≠ truth, but it filters for free).
  - *anomaly stats* (agent-computed) — never-finds-a-flaw, always-max-confidence,
    suspiciously fast, concentrated with one seller.
  - *evidence-quality* — did they capture what the scope requires?
  - the *bond* as a standing deterrent.
- **Tier 1 — expensive, ground-truth-GENERATING (anchors):**
  - *random + RISK-WEIGHTED audits* — manufacture truth where uncertainty is highest
    (new verifiers, high stakes, boundary cases, anomaly-flagged). A Bayesian budget,
    not a lottery. Low rate × high slash = deterrent (the tax-audit model).
  - *organic harvesting* — every later regrade / resale / dispute retroactively scores
    past verifiers via the persistent record. Truth gets *less* sparse over time.
- **Scoring:** a **proper scoring rule** (Brier / log) over confidence vs resolved
  outcomes, time-decayed, Bayesian. Honest calibrated confidence is profit-maximizing —
  you cannot game it by lying about how sure you are. **The bond is staked on the score.**
- **Filters trigger anchors:** cheap signals decide where to spend scarce truth.

## 4. Economics — bond, fee, slash, cold-start

- **Fee** per attestation; competitive.
- **Bond**: scoped + proportional to the harm it backs; **TIME-LOCKED with a tail** —
  fraud surfaces late, so the skin must outlive settlement (a bond that releases at
  close is useless). Slashed on **arbiter-proven-wrong** (partial buyer comp + signal).
- **Bonds catch malice; audits/calibration catch incompetence** — a bonded verifier can
  still be *honestly fooled*. Need both halves.
- **Cold-start:** graduated stakes (start small + heavily audited, earn up);
  reputation-as-collateral (an established verifier co-bonds a newcomer); capital
  *substitutes* for track record until the record accrues.

## 5. The agent as a (legible-only) verifier

A qualified agent verifies **legible consistency ONLY**: image↔catalog-reference match,
symbol-field coherence, cert-lookup consistency, evidence completeness vs scope —
fast, free, scoped. It **NEVER** attests physical truth (it never holds the card). The
**agent-verifier boundary is the no-overclaim line inside the role.** The evidence floor
decides the tier: **NR-A** agent-checkable → **NR-D** human/grader physical. Graders
(PSA/CGC) are the established top-tier physical verifiers; their cert is an attestation,
the cert-lookup is the *validator*.

## 6. Lifecycle (sketch)

intent → agent derives required **scope + floor** from the cost field → verifier(s)
selected (scope · calibration · bond · cost · turnaround clear the bar) → physical
inspection → scoped attestation + evidence signed, **bond locked** → validator admits
(form / scope / currency / independence) → buyer/agent **gate** weighs the legible
vector → settle → **bond tail holds** → organic + audited outcomes retroactively score
the verifier.

## 7. Invariants (must hold)

1. A verifier can NEVER produce an `enforced` truth claim. Only form / scope / currency
   / independence are enforced.
2. No attestation clears a scope it was not issued for (scopeSetHash).
3. A verifier with no resolved outcomes carries **no** calibration weight — collateral
   substitutes until it does.
4. The bond **outlives** the trade.
5. Honest calibrated confidence ≥ any dishonest strategy in expected payoff
   (proper scoring + slash).

## 8. Maturity

Design only. Nothing here is built. The on-chain binds (bond/slash/scope/registry) are
Codex's lane and unimplemented; the calibration/scoring/audit machinery is unspecced
below the conceptual level (§10). Do not read any of this as live enforcement.

## 9. Attack surface — REVIEW HERE

Stated for the reviewer to break. Each is a claimed defense + the way it might fail.

- **A. Statistical significance vs sparse truth (the keystone).** A proper scoring rule
  needs *enough resolved outcomes per verifier* to mean anything — but truth is sparse,
  and high-value verifiers attest *rarely*. How many resolved outcomes before a score is
  trustworthy? Is that volume ever reachable for the low-frequency / high-stakes
  verifiers who matter most? How do you carry them (bond-heavy / audit-heavy) until
  then, without that subsidy *being* the centralization in §D?
- **B. Patient collusion.** Seller + verifier collude: verifier over-attests, they split
  the markup. Bond + independence + audits + agreement are the defense. Do they hold
  when collusion is patient and the take over many trades exceeds a single bond? Does
  slashing one attestation unwind a campaign?
- **C. Sybil / manufactured consensus.** A seller spins up fake verifiers, fake
  agreement, fake history. Tier-0 agreement is cheap *because* it needs no ground truth
  — which is exactly what a Sybil exploits. Anchoring to audited truth defeats it, but at
  what audit rate, and who pays?
- **D. Capital centralization.** Proportional bonds + cold-start + reputation-collateral
  push verification to the well-capitalized and entrench incumbents. Does the market stay
  open, or does "calibration not certification" collapse back into a cartel of the rich?
- **E. Audit economics.** Audits manufacture truth but cost a real verifier + shipping a
  physical card. Is the audit rate that deters fraud affordable at scale? Remote audits
  (re-examine captured evidence) are cheap but **cannot catch a swapped physical card** —
  so what fraction of fraud is even audit-detectable?
- **F. Scoring-rule gaming.** Can a verifier game the proper scoring rule by *selection*
  (only attest easy cards), confidence-shading, or timing of resolution?
- **G. The honest-but-fooled verifier.** A competent verifier defeated by a
  state-of-the-art fake is, in the short run, statistically indistinguishable from an
  unlucky honest one. Is that priced as risk (acceptable) or is it a hole that a
  sophisticated forger drives through?
- **H. Boundary leak.** Does an agent's *legible* attestation ever get read downstream as
  *physical* assurance? That is the exact no-overclaim failure — where in the lifecycle
  could it happen?

## 10. Open / not specced

- The exact scoring rule, decay, and the **resolved-volume threshold** (§A).
- On-chain bond / slash / scope / registry mechanics (Codex).
- The **audit-funding model** — who pays for manufactured truth (protocol fee? a verifier
  pool? the buyer who wants the assurance?).
- Independence rules for **custody co-location** (the shop that holds the card is the
  natural verifier but has a sale interest).
