# Protocol — Consolidated Spec v0.2  (Cairn / Marketplace Protocol)

> **Status:** alpha. Revises v0.1 after **Kepler's adversarial pass** (SYNC, 2026-06-19,
> `b3eb3a2`). Verdict: the front-door is valuable and mostly honest — **no global thesis-fatal
> contradiction** — but several seams are **alpha blockers until promoted from "open" to gates.**
> v0.2 does that promotion: **§13 alpha admission gates**, **§14 the JSC / Verifier↔Arbitration
> schema**, **§15 the trusted-base manifest**, and a new **§9.I attack** (censored-denominator
> outcome laundering). Backed by `simulations/consolidated_alpha_gates_drill.py`.
> **Reviewed artifact:** `Protocol_Consolidated_Spec_v0.1.md` @ `ea015ff` (frozen; diff target).
> **Spine:** enforced / legible / judged. **No-overclaim is law.**
> **Authored by:** Claude (surface lane). **Reviewer:** Codex/Kepler. **Freeze:** v0.2 = v0.3 diff target.
> **Factual correction (Kepler):** `forge` *is* available at `/Users/che/.foundry/bin/forge`;
> chain re-run **102/102 pass** (90 Escrow + 12 Inventory) on 2026-06-19; cited drills re-run green
> (`shop_verifier_conflict` 8/8, `buyer_designated_route` 7/7, `projection_validator` 14/14,
> `principal_profile` 8/8). v0.1's "not re-run / forge not on PATH" caveat is retired.

---

## 0–7  (consolidation — unchanged from v0.1 except the test caveat)

The v0.1 body stands: **§1** thesis ("accountable, not impossible") + the enforced/legible/judged
spine + the on-chain decision rule (bind only if funds/liveness **and** mechanical) + the honesty
requirement (disclosed/labeled/measured). **§2** the enforced surface — 4 contracts, the enforced
list, the explicit not-enforced list — **with the test caveat now: re-run by Codex 2026-06-19,
102/102 pass.** **§3** the legible layer (the legibility vector; vector-not-verdict; forbidden
fields). **§4** the judged layer (verifier v0.4, arbitration, interrupt bar, trust import, aperture,
payment/custody). **§5** the 14-stage lifecycle. **§6** the human surface (glance/decide/audit;
two color carriers; no-overclaim UI). **§7** the maturity ledger — with the items below **moved
from "design-only open" to "gated"** (§13). Read v0.1 for the full text; v0.2 changes only what
follows.

## 8. Cross-module seams — now dispositioned (Kepler)

Each v0.1 seam now carries a disposition and the gate that resolves it:

| # | seam | Kepler disposition | resolved by |
|---|---|---|---|
| 8.1 | Verifier ↔ Arbitration | **schema-fatal** for buyer-designated settlement power | **§14 JSC schema** (G3) |
| 8.2 | `Arbitration_v0.1` dirty shared seam | still dirty; reconcile before any edit | seam 4 `[BLOCKING]` |
| 8.3 | trust-import vs bootstrap bond relief | double-dip risk | **G4** (non-additive) |
| 8.4 | custody ↔ verifier | **seed-network capacity test**, not just a seam | **G2** (capacity gate + downgrade ladder) |
| 8.5 | aperture ↔ interrupt-bar | fixable; unify escalation surface | open (§10) |
| 8.6 | trusted-base / agent boundary | needs a manifest, not a paragraph | **§15 manifest** |
| 8.7 | catalog-match vs authentication | needs a surface invariant | **G6** |

## 9. Protocol-wide attack surface — + the 9th (Kepler)

v0.1's A–H stand. **Added:**

- **I. Censored-denominator / counterfactual outcome laundering.** The v0.4 bilateral reputation
  vector reads false-reject / upheld-vs-overturned from *observed* outcomes — but the denominator
  is **censored**: sellers decline buyer-designated routes, buyers withdraw, disputes settle
  off-protocol, **non-appeals are silent**. A hostile over-rejecting verifier looks *safe* if the
  denominator is only appealed cases. This is **Verifier v0.2's outcome-poisoning lesson applied
  to the bilateral vector**: resolved outcomes are *claims with provenance + censoring weights.*
  **Until a cell is powered with provenance-weighted outcomes, buyer-designated settlement defaults
  to advisor-only or requires a neutral co-verifier** (ties to G2's ladder and the §11 vector).

---

## 13. Alpha admission gates  (the v0.2 promotion: open → gate)  ⟵ THE CORE OF v0.2

Kepler's demand: v0.2 must not *list* these as open questions but *convert* them into
**admission gates / schemas / value caps** that hold before any value-bearing alpha. Each gate:
the rule, the enforced/legible/judged split, the lane, and the **interim posture** until built.

### G1 — Liveness default must be value-safe  (value-fatal)
**The hole:** `openClaim()` accepts any buyer-signed nonzero claim hash + dispute bond; if the
arbiter and floor windows expire, `resolveUnresolvableClaimByDefault()` sends a **100% buyer
refund and returns the dispute bond — with no return/custody condition and no proof the floor was
*unable* to rule.** Post-delivery, this can become **card-plus-refund** if a buyer can induce or
wait out judgment failure.
**The gate:** after delivery, **no buyer-favoring default may execute on timeout unless one holds:**
(a) a **return/custody/route evidence gate** (the card is provably back or in protocol custody), **or**
(b) an **unresolvable-claim receipt signed by the floor / neutral executor** (attesting the floor
was *unable* to rule, not merely absent), **or**
(c) **claim-type-specific default remedies** (non-delivery → refund OK; post-delivery condition
dispute → *not* a free refund).
**Split:** *enforced* — the remedy branch + receipt/evidence-gate check (chain). *Judged* — whether
the floor was genuinely unable.
**Lane:** **Codex** (chain `resolveUnresolvableClaimByDefault`). **Interim posture:** high-value
post-delivery settlement **cannot rely on the current fallback** — value-cap, or require
return-custody before any default.

### G2 — Custody/verifier capacity gate  (seed-scale blocker)
**The hole:** Payment/Custody says shop nodes do custody **and** verification; Verifier v0.4 forbids
the same-`subjectHash` custodian from verifying. At seed scale the network may not be able to supply
a non-custodian verifier per trade — a **deadlock exactly where bootstrap wants to start.**
**The gate:** a per-subject role rule (**custodian of `subjectHash` is never its physical verifier**)
**plus a network-capacity downgrade ladder** — a trade may only route to a mode the network can
actually supply, in order:
1. **non-custodian neutral remote evidence review** (digital legibility attest, no physical-contact claim) →
2. **buyer-designated advisor-only** (no settlement power) →
3. **custodian-only with explicit conflict-discount + value-cap** →
4. **value-capped manual escrow.**
**Split:** *enforced* — role-distinctness by address + the downgrade-ladder admission check.
*legible* — the conflict-discount. *judged* — which downgrade fits.
**Lane:** Payment/Custody (Claude doc) + routing admission (shared with Verifier).

### G3 — Verifier↔Arbitration settlement power needs a real JSC schema  (schema-fatal) → **§14**
Buyer-designated settlement power (Verifier v0.4 §10.2/§10.3) **cannot remain prose** if it gates
seller liability. The `{scope, fee, evidence-floor, appeal-path}` tuple and the dispute-witness
authority must be **named fields in the JSC**. Full schema in **§14**. **Interim:** buyer-designated
**settlement** routes are blocked (advisor-only allowed) until the JSC carries the schema.

### G4 — Bond relief is non-additive  (double-dip bar)
**The gate:** the two relief paths onto the **same bond** — acquisition-cost-capped *import* relief
(Trust_Import) and history-calibrated *bootstrap* relief (Bootstrap) — combine by an **explicit
policy: `min` or a single capped composition, never additive.** No double-dip.
**Split:** *enforced* — the relief-composition function (deterministic schedule). *judged* — the policy choice.

### G5 — Self-arbitration bar  (cross-role collusion)
**The gate:** the same address may not be **verifier and arbiter/floor on the same subject/trade**;
common control across verifier/arbiter/custodian roles is **barred where registered, conflict-
discounted where only legible.**
**Split:** *enforced* — address-distinctness across roles per trade. *legible* — common control.

### G6 — "Catalog match" is never authentication  (surface invariant)
**The gate:** a surface-level invariant — a `card_reference_packet` catalog-row match may **never**
render as "is authentic" / "is that card." Every surface showing a catalog match carries the
`not_claiming`. (Extends the Human-Surface forbidden-phrase list.)
**Split:** *enforced* (UI-side) — the surfacing rule. *judged* — identity.

### Value caps (cross-cutting)
Until **G1–G3** are built, value-bearing alpha is **capped to the cell the current machinery
supports** — low-value, non-grail, with return-custody on dispute. This is the "curated /
underwritten alpha, not an open market" framing (Verifier §1) applied **protocol-wide**.

## 14. The JSC / Verifier↔Arbitration schema  (resolves G3 / seam 8.1)

The **JudgmentSupplyCommitment**, anchored at trade formation, must **name** (not prose) — these
are the fields that gate seller liability for a buyer-designated settlement route:

```
JSC.verifier_route = {
  route_class:        neutral | buyer_designated
  authority_level:    private_advisor | settlement_verifier | dispute_witness   # buyer_designated
  accepted_verifier:  <verifier id/addr the SELLER accepted>                     # settlement power
  scope_hash:         <canonical scope the verifier is accepted FOR>
  evidence_floor:     <NR-tier floor required>
  fee:                { schedule_hash, payer ∈ {buyer, escrow}, outcome_independent: true }
  buyer_dispute_bond: { amount|ref }                                             # seller protection
  verifier_bond:      { amount, exposure_cap, tail }
  appeal:             { tier, panel|floor_ref, escalation_payer }
  witness_authority:  { can_settle: [...], cannot_settle: [...] }                # NOT final w/o grant
}
```

**Enforced:** presence + hash-binding of these fields · address/role compatibility · scope-hash
equality · fee.payer ∈ {buyer, escrow} · bond/exposure locked. **Cannot enforce:** that the accepted
verifier is *fair*, the appeal panel competent, or a witness packet *true*. **Lane:** shared seam —
Verifier design is Claude's, the JSC/chain binding is Codex's; **append `[BLOCKING: Protocol_Arbitration]`
before editing the arbitration doc** (seam 4 is still dirty).

## 15. `trusted_base_manifest`  (resolves §9.B / seam 8.6 — a manifest, not a paragraph)

A **required artifact** enumerating every trusted dependency and what it can corrupt. v0.2 ships
the template + known statuses; owners/keys fill in as they exist.

| component | owner / key | current status | can corrupt |
|---|---|---|---|
| the 4 contracts | deployer/admin key (multisig? timelock?) — **TBD** | 102 tests green | **all** enforced guarantees |
| predicate verifier / ZK circuit | — | **STUB** (no real verification) | any ZK-gated claim (nothing real rides it yet) |
| stablecoin issuer | external | trusted | settlement value; can freeze funds |
| fiat on-ramp / KYC node | external | trusted | on-ramp value; identity surface |
| catalog source + build pipeline | Codex lane (`build_*`) | content-addressed | the reference anchor (`catalog_hash`) |
| off-chain validator stack | reference agent | versioned | every legible-layer admission |
| router randomness + eligible-set builder | **unbuilt** | design-only | blind routing (Attack 10) |
| LLM floor config + prompt hash | Arbitration | pinned/reproducible | floor rulings |
| score-root / oracle signers | **unbuilt** | design-only | calibration-driven relief |

**The spine is only as thin as its trusted base is honest.** The manifest makes the base
*enumerable and disclosed* (the honesty requirement, §1) instead of a §9 hand-wave.

## 16. Falsification — the gates are rules, not prose

`simulations/consolidated_alpha_gates_drill.py` — deterministic, model-free; each in-lane gate
paired with a **mutation control** (drop the guard → the case must flip, proving teeth). Covers:
G1 (post-delivery default needs return-custody **or** a signed unresolvable receipt — modeled at
the **spec-rule** level; the chain fix is Codex's lane), G2 (the capacity downgrade ladder; a
custodian may not verify same-subject), G4 (relief is non-additive), G5 (self-arbitration barred),
G6 (catalog-match never renders as authentication). **Result: 5/5 with teeth** (each clean
context admits, each attack blocks, and each flips to admit once its guard is removed). G3 is a
schema (§14), not a boolean gate; its falsification is the buyer-designated route drill (7/7).

## 17. Changelog
- **v0.2 (post-Kepler `b3eb3a2`):** promoted the five review findings from "open" to **gates**
  (§13 G1–G6 + value caps), named the **JSC / Verifier↔Arbitration schema** (§14), shipped the
  **`trusted_base_manifest`** (§15), added the **censored-denominator attack** (§9.I), corrected
  the test caveat (Kepler re-ran 102/102), and dispositioned every v0.1 seam (§8). Backed by
  `consolidated_alpha_gates_drill.py`. **Verdict held:** no thesis-fatal contradiction; v0.2 is the
  gate layer that v0.1's adversarial front-door earned.
- **v0.1** (`ea015ff`, frozen): first consolidation + §8 seams + §9 attack surface. Diff target.
