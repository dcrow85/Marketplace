# Protocol — Verifier v0.3  (alpha — adds the shop-network conflict & routing model)

> **Status:** alpha. Extends v0.2 after **Kepler's shop-verifier verdict** (SYNC handshake,
> 2026-06-19, commit `d6bacd9`). v0.2's design is unchanged; v0.3 **adds §9** (the shop
> network as verifier capacity — a conflict/routing model, NOT "shops solve verification")
> and folds the corresponding mechanical binds into §2. Still **design only — nothing built.**
> On-chain binds = **Codex's lane.** Changelog at the end (§13).
> **Spine:** enforced / legible / judged. **No-overclaim is law.**
> **Reviewed artifact:** `Protocol_Verifier_v0.2.md` @ `a5bf230` (frozen; diff against it).
> **Drill:** `simulations/shop_verifier_conflict_drill.py` — falsifies the §9 routing package
> (each guard shown to have teeth via a mutation control).

## 0. What a verifier is (unchanged from v0.1)

The only role that crosses the physical gap: a human — or, narrowly, an agent — who
inspects a thing and turns the look into a **scoped, signed claim**, never a verdict:
`{scope, not_claiming[], confidence, evidence_examined, verifier_id, bond_ref}`.

## 1. The corrected thesis — calibration is REGIME-GATED, not universal

(unchanged from v0.2.) Two regimes gated by **effective-N** (the count of *trustworthy*
resolved outcomes for that verifier-scope-value cell, after the §6 censoring discount):

- **Powered cell:** calibration drives selection; the buyer's cost field reads the **lower
  CI bound**, never the point estimate.
- **Underpowered cell:** calibration carries **NO positive weight**; assurance comes from
  **liability + underwriting + audit + escalation**, value **capped** to what power supports.

The honest name for the high-value end is **"curated / underwritten alpha," not an open
calibration market.** A verifier earns from *underwritten* into *calibrated* as effective-N
accrues. **Cell key is atomic and fail-closed** (Kepler's re-review gate): never pool
easy/cheap/high-volume scopes into hard/high-value cells — the key spans at least verifier,
attestor type, physical-contact method, scope family, raw/slab, value tier, card/cohort risk
class, and outcome-origin class.

## 2. Trichotomy placement — corrected (the §1 fix + the §9 shop binds)

The contract binds only the *mechanical* half. The buckets, restated:

**ENFORCED** (the contract can bind these, and *only* these):
active role registry · verifier signature · **verifier ≠ buyer/seller** (address identity) ·
buyer-approved canonical **scope hash** match · subject (item) hash anchored · **method hash
with physical-contact flag** · bond amount + **tail** locked · per-attestation **exposure**
recorded + **exposure cap** · authorized arbiter/floor **liability ruling** · replay
protection · payout math.
**Added in v0.3 (the §9 shop-network binds — mechanical only):**
· **no active same-`subjectHash` custody / consignment / inventory / ownership claim by the
  verifier address**, where such a registry exists (the forbidden primitive, §9.1)
· **router assignment hash / receipt** — the verifier was assigned, not seller-picked (§9.5)
· **flat, outcome-independent fee-schedule hash, paid by buyer/escrow — not seller** (§9.4)
· **N-of-M independent verifier addresses for high-value RAW** (§8, §9.2)
· **rotation / pair-correlation caps**, where the registry tracks pair history (§9.7).

**LEGIBLE** (recorded, measured — NOT enforced):
the attestation content + evidence · the calibration vector + its **effective-N / CI** ·
**conflict / common-control / undisclosed-stake / hidden ownership / friendship / prior
sourcing / relationship pressure** (independence's *semantic* half) · **shop competence** ·
the bond's "harm-proportional" sizing (a deterministic schedule, or a signed score-root
oracle — labeled legible, never an on-chain truth claim).

**JUDGED:**
whether the card is as attested · whether evidence is enough for *this* buyer · **true
physical accuracy** · whether an arbiter's "wrong" ruling actually corresponds to reality.

**The contract CANNOT enforce** (none of these may appear as `enforced`): semantic
independence, diverse methods, no-undisclosed-stake, hidden common control, calibration
truth, proper scoring, audit execution, remote physical truth, shop competence,
`not_claiming[]` semantics, or that a "wrong" ruling matches reality.

**Chain reality (do not overclaim the binds):** the current contract surface has
`subjectHash`, `scopeSetHash`, buyer approval, and verifier signature. It does **not** yet
enforce routing, fee shape, verifier bond locking / exposure, or inventory-custody conflict
by verifier subject-hash. The §2 additions above are **specified, not implemented** (§11).

## 3. The signal architecture (unchanged from v0.2)

Tier 0 (cheap filters, **zero truth weight until anchored** to registry + control-distance
*and* audited truth) → Tier 1 (risk-weighted audits + **poisonable** organic outcomes, §6) →
proper scoring, effective-N-gated, scoring the **opportunity set, scope coverage,
abstentions, censoring, time-to-resolution** — **and divergence in both directions** (chronic
*harshness* as well as generosity, §9.7).

## 4. Economics — portfolio, not per-attestation (unchanged from v0.2)

Portfolio bonds: rolling **exposure caps**, **campaign-level clawback / portfolio slash**,
**seller-verifier correlation limits**, bond **tail sized by open exposure**. Cold-start =
the underpowered regime: graduated value caps, **underwriter / mutual co-bonding** (and
underwriters carry the **same** conflict / common-control / correlation treatment as
verifiers — Kepler's gate (3) — or "underwritten" is certification renamed).

## 5. Audit math — the deterrence inequality (unchanged from v0.2)

> **p_detect × slash  +  reputation/legal loss  >  fraud profit.**

Still requires the **physical** audit rate, the **detectable-fraud fraction**, the **funding
source**. **E remains unmet** until these numbers exist (§11).

## 6. Outcome integrity — the 9th attack (unchanged from v0.2)

A resolved outcome is *itself a claim with provenance*: it needs an **origin label**
(audit / organic / dispute), **adversarial-censoring weights**, and exclusion of
**self-resolved / related-party** labels before it feeds calibration.

## 7. The agent boundary — split the types (unchanged from v0.2)

`LegibilityAgentAttestor` (digital only, never physical truth) vs `PhysicalVerifier` (handled
the card; bonded). **No scalar "trust score" display anywhere**; `not_claiming[]` preserved
in every human surface.

## 8. Residual-risk pricing (unchanged from v0.2)

Honest-but-fooled and malicious are short-run indistinguishable, so the spec **prices** the
residual: **method floors** per value tier, **counterfeit-state-of-the-art caveats**,
**liability caps**, mandatory **escalation** (multi-verifier / grader) for the worst cell —
**high-value RAW** cards. The §9 routing model is how the *network* supplies that escalation
without re-importing conflict.

---

## 9. The shop-network conflict & routing model  (NEW in v0.3)

**Framing first, because the framing is the finding.** Card shops are the *realistic* source
of physical-verifier capacity — they have the loupe, the reps, the volume, the inventory
fluency. v0.3 therefore says **"the shop network supplies verifier capacity."** It does
**not** say "shops solve verification." Independence buys you an *honest* verifier, never a
*competent* one (§9.7), and the conflict a shop carries is real and points one way (over-
attest → higher price → shop captures it). §9 is a **conflict / routing model**, not closure.

### 9.1 The forbidden primitive and the clean primitive (subject-hash scoped)

- **Forbidden:** *the same shop that touches the economic upside of a subject verifies that
  same subject.* If a shop **owns, sells, consigns, sources, custodies, or is inventory-locked
  to `subjectHash`**, it is a **custodian / seller-side actor for that subject** — not its
  physical verifier. Enforced as the §2 bind: *no active same-`subjectHash` custody /
  consignment / inventory / ownership claim by the verifier address* (where the registry
  exists). This is the same `legible→enforced` line the F2 custody bug crossed — here it is
  the load-bearing rule.
- **Clean:** **cross-verification by the network.** A shop earns verifier income by verifying
  cards it has **no same-subject exposure to** — Shop B verifies Shop A's stock; Shop A
  verifies Shop B's. This turns the conflict into a *business model*: verification is a
  second revenue line, clean by construction, decoupled from the shop's own retail spread.
  (LegitApp / Player One in the field research are the existence proof — pure-verification
  businesses with zero inventory. The shop-network version is "be that for the card across
  the aisle.")

### 9.2 What is enforced for a shop verifier (mechanical only)

For a shop attestation to be *admissible* the contract checks, and **only** checks:
verifier address active in registry · verifier ≠ buyer / seller addresses · buyer/escrow-
approved canonical scope hash · anchored subject hash · method hash with physical-contact
flag · **no active same-`subjectHash` custody / consignment / inventory claim by that
verifier address** · **router assignment hash / receipt** · **flat outcome-independent
fee-schedule hash, payer ∈ {buyer, escrow}** · locked bond / tail + exposure cap · **N-of-M
independent verifier addresses for high-value RAW** · **rotation / pair-correlation caps**
(where pair history is tracked). Everything else about the shop — common control, hidden
ownership, friendship, prior sourcing, relationship pressure, competence, the truth of the
read — is **legible or judged** (§2), never enforced.

### 9.3 Fee shape (the bribe surface)

Even cross-verifying, if a **pass pays more than a fail** you have built a bribe. So the fee
schedule is enforced to be: **flat / fixed per scope, identical whether the card
authenticates or is rejected (outcome-independent), never a % of sale price, and paid by the
buyer or escrow — never the seller.** The skeptic commissions the look; the verifier's
customer is the doubter, not the seller. (Proper scoring applied at the *fee* level.)

### 9.4 Blind routing

The seller does **not pick** the verifier. The router assigns the subject to an eligible shop
(scope-match × independence-clean × calibration) by **seeded-random or buyer-policy-
deterministic** selection, emitting a signed **assignment receipt**. This kills verifier-
shopping for a friendly glass — the core of patient collusion (§4). But blind routing is
worthless if the router itself can be captured — see §9.5.

### 9.5 Attack 10 — router / assignment capture  (the keystone of this section)

**Blind routing is theater if the seller, the platform, or a shop cartel can shape the
eligible set, the assignment seed, or the override path.** A captured router hands the seller
their friendly verifier while *looking* blind. Required counter-shape:

- **Committed eligible-set root** — the eligible verifier set is committed (Merkle / hash
  root) *before* assignment; the router **cannot assign outside the committed set**, and the
  set cannot be reshaped after commitment. *(enforced)*
- **Assignment receipt** — signed, replay-protected, binding `{subjectHash, eligible_root,
  seed, selected_verifier, selection_mode}`; the selection is **reproducible** from the
  receipt. *(enforced)*
- **Selection mode ∈ {seeded-random, buyer-policy-deterministic}** — not seller-chosen.
  *(enforced)*
- **No seller-picked override without a buyer-signed waiver** — an override path may exist,
  but only the **buyer** can open it, explicitly, on the record. *(enforced — the waiver
  signature; the wisdom of waiving is judged)*
- **Audit logs + correlation limits on router output** — the router's assignments are logged
  and the seller-verifier and verifier-verifier **pair correlations are capped** (§9.7).
  *(pairing data legible; the cap mechanical where history is tracked.)*

Trichotomy: the committed root, the receipt, the selection mode, override-requires-waiver,
and replay protection are **enforced**; the pairing-correlation statistics are **legible**;
whether a flagged correlation pattern is *actually* a cartel is **judged**.

### 9.6 Secondary residuals (named, not solved)

Severing the obvious conflict opens subtler ones. v0.3 **names and prices** them (§8); it does
not claim to remove them:

- **Affiliate custody relay** — a shop splits into two addresses so the "verifier" address has
  no registered same-subject claim while a **common-controlled** address holds the economic
  stake. The §2 bind catches *registered* same-subject conflict; common control is **legible**
  (control-distance scoring), never fully enforceable. Surface accordingly (§9.8).
- **Reciprocal shop pairs** — cross-verification creates a fresh 2-party surface: "I pass your
  grails, you pass mine." Defenses: **pair-correlation caps** (no repeated A↔B pairing),
  **blind routing** so the pair can't self-select, **harder audit on reciprocal pairs**, and
  **N-of-M** for the worst cell so no cozy pair clears a grail alone.
- **Competitive suppression** — a shop nitpicks a *rival's* competing card to suppress a comp.
  The bond catches over-attestation; it does **not** catch chronic *harshness*. The scoring
  rule must penalize divergence in **both** directions (§3, §9.7), or under-calling is free.
- **Flat-fee low-effort / volume farming** — an outcome-independent fee rewards *throughput*;
  a shop can rubber-stamp fast. Counter: **method floors** per value tier (§8), evidence-
  completeness checks (Tier 0), and audit weighting toward fast / shallow attestations.
- **The BBCE lesson (load-bearing caveat):** BBCE was a pure authenticator with **no sale
  stake** and still missed the Logan Paul fake while the community caught it. **Independence
  is necessary; it is not competence.** "No conflict" must never read downstream as "correct"
  — the calibration + diverse-methods + bond stack still has to carry the truth question.

### 9.7 Scoring must be two-sided

The proper scoring rule (§3) scores chronic **harshness** as well as chronic **generosity** —
persistent divergence from a diverse, independent consensus in *either* direction is a flag.
A one-sided scorer (penalize only over-attestation) gives a competitive-suppressor a clean
record. (This is the §9.6 competitive-suppression defense, made a scoring invariant.)

### 9.8 The surfacing rule (no-overclaim, applied to the result)

A passed admission is **never** surfaced as **"conflict-free."** It is surfaced as:
**"no registered same-subject mechanical conflict; semantic conflict disclosed and scored."**
Collapsing the mechanical clear into a clean-bill is the exact §7 boundary leak, one level up.

### 9.9 Falsification (the drill must trip before any "it works")

Per Kepler's recommendation, the routing package carries a **falsification drill** —
`simulations/shop_verifier_conflict_drill.py`, deterministic, model-free, each guard paired
with a **mutation control** (remove the guard → the case must flip to admit, proving teeth).
The eight cases that must hold:

1. **self-verification blocked** — verifier owns/sells the subject.
2. **custody / consignment co-location blocked** — verifier custodies/consigns the subject.
3. **seller-picked verifier blocked** — assignment not from the committed set, or seller
   override without buyer waiver.
4. **percent / success fee blocked** — fee not flat / outcome-independent / buyer-or-escrow-paid.
5. **reciprocal-pair cap trips** — A↔B pairing over the correlation cap.
6. **high-value RAW requires N-of-M** — a single verifier cannot clear the worst cell.
7. **harshness as well as generosity is scored** — a one-sided scorer is shown to miss a
   chronic under-caller; the two-sided scorer flags it.
8. **router cannot assign outside the committed eligible set.**

Until that drill is green *with teeth*, the routing package is **specified, not proven**.

---

## 10. Lifecycle (unchanged in spirit; routing added)

intent → agent derives required **scope + floor** from the cost field → **router** assigns an
independence-clean, scope-matched, calibrated verifier from the **committed eligible set**
(receipt emitted) → physical inspection → scoped attestation + evidence signed, **bond
locked, exposure registered** → validator admits (form / scope / currency / **§2 mechanical
independence incl. same-subject + routing + fee shape**) → buyer/agent **gate** weighs the
legible vector → settle → **bond tail holds** → organic + audited outcomes retroactively
score the verifier (two-sided, §9.7).

## 11. Maturity / open (the still-unmet pieces — be honest)

- the **effective-N threshold + CI math** (§1) — unspecced; gate is qualitative.
- the **audit-economics numbers** (§5) — unspecced; **E remains unmet**.
- the **outcome-provenance + censoring-weight model** (§6) — unspecced.
- the **underwriting / mutual mechanics**, with verifier-grade conflict treatment (§4).
- **the §2 / §9 shop binds are specified, not implemented** — the chain has `subjectHash`,
  `scopeSetHash`, buyer approval, verifier signature; it does **not** yet enforce routing,
  fee shape, verifier bond locking / exposure, or inventory-custody conflict by verifier
  subject-hash. The **same-subject custody/inventory registry** the §2 bind reads from does
  not exist yet. (Codex's lane.)
- the **router** itself (committed-set root, receipt format, seed source) — unbuilt.
- **affiliate custody relay** (§9.6) is only **partially** addressable on-chain (registered
  conflict) — common control stays legible.

## 12. Structural caveat (was D — not contract-fixable)

Capital-heavy cold-start + portfolio bonds + reputation-collateral **will centralize** the
high-value end. Honest framing: explicit **low-value calibration lanes** (open) + a
**curated / underwritten high-value lane** (not open). The shop network widens the *supply*
of capacity (§9) but does **not** repeal this — a well-capitalized shop chain could dominate
the cross-verification market; the pair-correlation caps and N-of-M bound, not erase, that.

## 13. Changelog

- **v0.3 (post-Kepler shop verdict, `d6bacd9`):** added **§9 — the shop-network conflict &
  routing model** (the forbidden vs clean primitive, subject-hash scoped; cross-verification
  as the clean structure; flat outcome-independent buyer/escrow-paid fee; blind routing) and
  **Attack 10 — router/assignment capture** (committed eligible-set root, assignment receipt,
  seeded/buyer-deterministic selection, no seller-override without buyer waiver, correlation
  audit). Folded the corresponding **mechanical-only binds into §2** and named the chain's
  current gaps. Named the **secondary residuals** (affiliate custody relay, reciprocal pairs,
  competitive suppression, flat-fee farming) and the **BBCE "independence ≠ competence"**
  caveat. Made **two-sided scoring** (§9.7) an invariant. Added the **surfacing rule** (never
  "conflict-free"). Carried Kepler's re-review gates into §1/§4. Backed by the
  `shop_verifier_conflict_drill.py` falsification drill (§9.9). **Framing held:** shops supply
  capacity; shops do not "solve verification."
- **v0.2 (post-Kepler):** calibration made **regime-gated** (powered vs underpowered); high
  value moved to underwriting / liability / audit; fixed v0.1's `legible→enforced` sin
  (independence split); portfolio bonds; the 9th attack (outcome poisoning); the audit-
  deterrence inequality; agent-type split; residual-risk pricing; the enforced-vs-cannot-
  enforce boundary. (Frozen @ `a5bf230` — the v0.3 diff target.)
- **v0.1:** the role + the trust signal + the attack surface (A–H). (Frozen @ `6c2adad`.)
