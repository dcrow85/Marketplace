# Protocol — Consolidated Spec v0.1  (Cairn / Marketplace Protocol)

> **Status:** alpha. **Built for adversarial review.** This is the single front-door that
> ties the modular specs into one coherent picture — the corpus had no consolidated head, and
> `Marketplace_Protocol_Full_Spec.md` (2026-05-19) now *trails* the 2026-06 modular refinements.
> **The point of this document is §8 (unreconciled cross-module seams) and §9 (the
> protocol-wide attack surface).** Those are the parts no single module's local review covers.
> Hit them hard.
> **Spine:** enforced / legible / judged. **No-overclaim is law** — nothing (doc, UI, model,
> contract) may imply the contract/image/model proves an off-chain physical fact.
> **Authored by:** Claude (surface lane), 2026-06-19. **Reviewer:** Codex/Kepler.
> **Freeze:** this is the v0.1 diff target; reviews diff against it.
> **This doc consolidates, it does not supersede.** On any conflict, the cited *module* wins
> for its lane; flag the conflict here so it gets reconciled (§8).

---

## 0. What this document is (and is not)

- **Is:** a consolidation + index + cross-module seam/attack map. One enforced/legible/judged
  view of the whole protocol, an honest maturity ledger (§7), and the contested surface (§8–§10).
- **Is not:** new design, and not authoritative over any module. Where a module and this doc
  disagree, the module is canonical for its lane and the disagreement is a §8 finding.
- **Freshness caveat:** `Marketplace_Protocol_Full_Spec.md` (05-19) is the aggregate handoff but
  predates `Architecture_Boundary` (06-12), `Legibility`/`Bootstrap` (06-10), `Payment_and_Custody`
  /`Human_Surface_v0.2` (06-15/16), `Interrupt_Bar`/`Arbitration` (06-17/06-16), and the
  `Verifier` line through **v0.4** (06-19). **Cite the modules, not the Full Spec, for current state.**

## 1. Thesis & the spine

**Thesis — "accountable, not impossible."** The protocol does **not** put the marketplace
on-chain. It puts the **costly commitments** on-chain (money, bonds, identity, packet hashes,
timeouts, liveness) and keeps the **rich marketplace facts** off-chain as **signed,
hash-addressed packets**. It cannot know a card is authentic; it can make a lie **attributable
and consequential**. (`Architecture_Boundary`, `Full_Spec` Core Thesis.)

**The spine — every claim is bucketed:**

| Bucket | Meaning | Lives |
|---|---|---|
| **ENFORCED** | mechanical check — hash match, balance bound, timeout, signature, registry status | on-chain |
| **LEGIBLE** | signed/typed/hash-anchored evidence — measured, never aggregated into a verdict | off-chain, hash anchored |
| **JUDGED** | authenticity, condition, trust, fairness — intelligent judgment | human / agent / verifier / arbiter |

**The on-chain decision rule** (`Architecture_Boundary`): bind on-chain **only if both** —
(1) it protects *funds or liveness*, **and** (2) it is a *mechanical* check. Otherwise: anchor
the commitment hash, validate off-chain, **disclose** the boundary, **measure** the quality
through the legibility vector + settlement-calibration loop. On-chain binding is the *exception,
earned*, never the default.

**The honesty requirement** (the law, restated for review): every off-chain obligation must be
(1) **disclosed** — no doc implies the contract enforces it; (2) **labeled** — tagged
enforced/legible/judged at the point of surfacing; (3) **measured** — the residual risk is
visible, not hidden. *An off-chain obligation that is disclosed, labeled, and measured is a
legitimate architecture. One implied to be on-chain is the failure.*

## 2. The enforced contract surface (what is actually real today)

Four Solidity contracts (`^0.8.24`), **102 forge test functions** (90 `MarketplaceEscrow.t.sol`
+ 12 `MarketplaceInventory.t.sol`) plus off-chain drills and a 250-trade adversarial stress
harness. *(The documented state is green per `chain/README.md` + prior run reports; **not
re-run this session** — forge was not on PATH. A reviewer should re-run before trusting "pass".)*

**Contracts:**
- **MarketplaceActorRegistry** — roles (buyer/seller/verifier/arbiter), registration/revocation
  with timestamps, EIP-191 signature recovery (`requireActorSignature`).
- **MarketplaceEscrow** — the spine: an 8-state machine; escrow + seller bond + optional buyer
  dispute bond; **payout math** (refund + payout = escrow; bond penalty bounded); **30+ typed
  packet-hash anchors** with per-trade replay protection; item-fingerprint → inventory-lock
  binding (byte-exact); active fingerprint/lock **collision checks** (one physical item cannot
  back two open trades); **buyer-approved verifier scope**; the **fingerprint-challenge gate**
  (blocks route until cleared by buyer sig, or buyer sig + matching verifier attestation);
  **route/delivery spendability digests** (self-minted, bound to escrow+chain+trade+gate+artifact
  hashes, non-replayable by construction); the **liveness fallback** (arbiter → registered floor
  executor after timeout → default buyer-refund remedy after a second timeout); two-party arbiter
  replacement + emergency handoff.
- **MarketplaceInventory** — off-trade custody record (self-held / shop / vault), per-item
  transfer nonce (replay protection). **Records** custody; does **not** verify authenticity or condition.
- **MarketplacePredicateVerifierStub** — ⚠️ **STUB**: a `predicateHash → bool` map. **No real ZK
  verification.** Accepts any nonzero-length proof for an accepted predicate. Placeholder for
  production circuits.

**The enforced list (deduplicated):** role membership + revocation · EIP-191 per-actor/per-trade
replay · escrow + seller bond + dispute bond amounts · payout/penalty math · packet-hash
uniqueness (30+ types) · item-fingerprint pre-commit · inventory-lock bound to fingerprint ·
active collision checks · buyer-approved verifier scope (`scopeSetHash`) · attestation binds
(verifier addr · `subjectHash` · `scopeSetHash` · `methodIdHash`) · subject-already-anchored ·
fingerprint-challenge blocks route until scope-matched clearance · route commit requires
inventory-lock + fingerprint + no-active-challenge + consumed spendability + anchored
wall-bundle/assembly-history hashes + matching route witness · delivery witness + inspection
window timing · claim liveness fallback (staged timeouts) · valid state transitions only.

**Explicitly NOT enforced** (by design — do not mistake for built): card authenticity /
condition / seller-trust / verifier-diligence / claim-fairness (**judged**) · JSC *content*
(only the hash is anchored; conflict/SLA/fee/remedy stay off-chain) · wall-bundle & assembly-graph
*coherence* (hashes anchored, graph validated **off-chain**) · challenger independence
(self-declared frontier) · insurance adequacy · the real ZK predicate (stub) · **and the entire
Verifier v0.3/v0.4 routing/fee/conflict bind set — specified, not built (§4.1, Codex's lane).**

## 3. The legible layer — "a vector, never a verdict"

**Packet types** (signed, typed, hash-anchored; each carries an explicit `not_claiming[]`):
`card_reference_packet` (catalog_hash + row_id + source; *not claiming* possession / authenticity /
condition / language-truth / price-truth) · `item_fingerprint_hash` · `inventory_lock_hash` ·
`proof_vector_scope_packet` (seller trajectory; *not* trade-specific spendability) ·
`bond_scope_packet` (covered/excluded failures, caps; amount enforced, adequacy judged) ·
`route_insurance_risk_owner_packet` (gap owner assigned before route lock) ·
`evidence_request_fee_terms` (seller labor priced; credit policy) · `arbiter_policy_hash`
(→ ClaimClosureEvidenceMatrix).

**The legibility vector** (`Protocol_Legibility_v0.1`, "output a vector, never a verdict") —
six dimensions of evidence **shape**, not truth: **coverage · independence · continuity ·
scope_fit · cost_to_fake · source_calibration.** Independence marks seller-controlled surfaces
**correlated_but_not_independent**; cost_to_fake is a band + named unpriced attack paths;
source_calibration is "this evidence-shape had claims in N% of settled trades" — **not** a
prediction about *this* card. **Forbidden fields:** `score · trust_score · rating · grade ·
probability_of_truth · authenticity_probability · verdict`. The agent's **projection** of the
vector into a decision (`agent_policy_projection`) is a *separate, judged* object. **The vector
informs; the projection decides.**

**The walls** (`Protocol_Walls_v0.1`) — the hard acceptance profile for a raw $500–$2000 card
requires the full packet set above + an `evidence_profile_id`. **Spendability** is a typed
digest proving **gate placement at a specific action**, *not* physical truth; route lock must
read the **whole wall set** (any active block / unaccepted waiver / escalate stops it), not a
packet subset. *Evidence is memory; spendability is permission.*

## 4. The judged layer (where the design work concentrates)

Each sub-spec carries its own enforced/legible/judged split; here is the consolidated shape.

### 4.1 Verifier (v0.4 — the most-developed module)
A verifier is a **scoped, signed claim, never a verdict**: `{scope, not_claiming[], confidence,
evidence_examined, verifier_id, bond_ref}`. **Calibration is regime-gated** by cell-atomic
effective-N: powered cells use the **lower-CI bound**; underpowered/high-value cells carry **no
positive calibration weight** and fail closed into **underwriting / liability / audit / escalation**
("curated/underwritten alpha, not an open market"). **Routes (v0.4):**
- **neutral-routed** (default) — cross-verification by the shop network; *forbidden primitive:* a
  shop with same-`subjectHash` economic exposure (own/sell/consign/source/custody) verifying that
  subject; blind routing, committed eligible-set root, signed receipt, flat outcome-independent
  **buyer/escrow-paid** fee. **Attack 10:** router/assignment capture.
- **buyer-designated** ("my shop") — first-class, three authority levels: *private advisor*
  (buyer-side only, no seller liability) → *settlement verifier* (gates only inside a
  seller-accepted `{scope, fee, evidence-floor, appeal-path}`) → *dispute witness* (not final
  without an arbitration grant). **Attack 11:** buyer-designated capture (hostile over-rejection).
- **bilateral reputation vector** — the *seller* reads the verifier's pattern with denominators
  (flag-rate by scope/value/type, upheld-vs-overturned, **false-reject** not just false-pass,
  harshness-vs-peers, **buyer-verifier pairing concentration**) → "trusted-by-data vs
  trusted-by-buyer." Two-sided scoring is an invariant.
- **Enforced** = "seller accepted X for scope Y with appeal Z" + route class + authority ceilings
  + bonds; **cannot enforce** "X is fair." *Design-only; on-chain binds unbuilt.*
  Falsified by two drills (`shop_verifier_conflict_drill` 8/8, `buyer_designated_route_drill` 7/7,
  each with teeth).

### 4.2 Arbitration (`Protocol_Arbitration_v0.1` — SHARED SEAM, see §8)
A **JudgmentSupplyCommitment** is anchored at trade *formation* (not imposed). A **4-tier cost
ladder**: LLM floor → panel → human arbiter → specialist, escalation staged + bounded
(loser-pays / escalator-deposit-forfeit). The **floor** rules **coherence / completeness /
consistency / comparison — never authentication**, and is **reproducible** (pinned model, temp 0,
fixed seed, hashed prompt). **Liveness:** a stuck claim escalates to a floor ruling, not an
automatic refund. **Evidence symmetry:** the buyer enters the dispute on signed terms and posts a
bond. A **two-sided judgment market:** verifiers buy down risk pre-trade, arbiters buy down stuck
claims post-dispute. The arbiter rules the **legible record**, never physical fact.

### 4.3 Interrupt bar (`Protocol_Interrupt_Bar_v0.1`)
Escalate when **Stake × (1 − Confidence) × Irreversibility > θ**. Six lanes (silent_continue,
silent_request_evidence, decision_interrupt, authorization_interrupt, anomaly_interrupt,
pre_authorize). Three probe-tested laws: **default-to-JUDGE** (authorization is the narrow
exception), **Confidence ≠ Resolution** (proximity raises regret, never resolves), **override
prominence**. Probe: 0 overclaim across cases.

### 4.4 Trust import (`Protocol_Trust_Import_v0.1`)
External reputation is **observable, not bindable.** Control-proof nonces on surfaces the seller
controls buy *friction / attention / value-cap / scoped-bond* relief **capped by the bundle's
acquisition cost** — and can **never** buy authenticity, possession, condition, or a high-value
bond waiver. Three seller-controlled surfaces = correlation, not independence. Decay required.

### 4.5 Collector aperture (`Protocol_Collector_Aperture_v0.1`)
Compiles a human's desire into legible **policy** (want / condition / purpose / risk / price /
time / attention_contract / seller_trust) across three altitudes (glance / decide / audit).
**Judged and portable.** Desire is never promoted into a protocol fact; infeasible apertures are
surfaced, not silently relaxed; reserved judgments never auto-accept; spend authority never exceeded.

### 4.6 Payment & custody (`Protocol_Payment_and_Custody_v0.1`)
Rails by trichotomy: **stablecoin escrow (enforced, the default)** / fiat on-ramp (enforced
underneath, KYC edge) / off-chain fiat (legible) / barter (judged). **Custody is distributed
across bonded local shops**, not one warehouse — trust imported, accountability added (bond,
attestation, calibration, on-chain record). **Atomic swap is first-class** (vault-to-vault /
physical-through-verification / in-person witnessed). No-overclaim: "swap" means *nobody runs off
with both*, **not** *both cards are authentic*.

## 5. The trade lifecycle (the gate at each stage)

**Intent → Discovery → Proposal → Escrow Terms (+ settlement rail) → Item Fingerprint →
Inventory Lock → Evidence (+ paid evidence requests) → Verifier Scope → Spendability Gate →
Route → Delivery & Inspection → Claim → Arbitration → Settlement & Final Receipt.**

The load-bearing gate is the **Spendability/Route** boundary: a route locks only when the **whole
wall set** clears (fingerprint committed, inventory locked, no active challenge, spendability
consumed, wall-bundle + assembly-history anchored, route witness matches). Settlement moves funds
only inside the pre-agreed rail finality model; the **receipt becomes portable seller history**.

## 6. The human surface (`Protocol_Human_Surface_v0.2`)

Three altitudes: **Glance** (card + price + posture + agent read; the 5-second "do I want this?")
· **Decide** (only actions that spend money / attention / trust / time / rights) · **Audit** (the
record, expandable, without false certainty). Hard discipline: **only two things carry color** —
the card image and one risk hue (oxblood); everything else is ink/bone. **Evidence states map to
the spine:** missing/provided → legible, anchored → enforced, reviewed → judged, waived → judged.
A forbidden-phrase list ("verified authentic", "guaranteed safe", "trust score", "fully
protected") enforces no-overclaim at the surface; the allowed register is "reviewed for scope",
"record coherent enough to continue", "I would…".

## 7. Maturity ledger (built vs design-only — honest)

**Built + tested:**
- the chain spine — 102 forge test functions + off-chain drills (evidence-manifest v0.3,
  spendability, fingerprint-collision, gate-bypass) + a 250-trade adversarial stress + 10-trade
  Anvil replay (documented green; not re-run this session).
- the catalog/binder UI (40 sets / 1258 cards), the Qwen3.6 browse loop, the interrupt-bar probe
  (Qwen 15/15, 0 overclaim), the two verifier falsification drills.

**Specified, not built (design-only):**
- Verifier v0.3/v0.4 on-chain binds (route class, same-subject conflict, fee shape, verifier
  bond/exposure, seller-acceptance gate, buyer dispute bond) + the router (committed-set root,
  receipt, seed).
- the reputation-vector estimators (false-reject math, peer-relative harshness, pairing-concentration
  thresholds) — denominators named, math not.
- the interrupt-bar harness; the cost-field interview; the distributed-custody network; atomic swap;
  the real ZK predicate (stub today).
- the calibration/scoring/audit machinery below the conceptual level (effective-N threshold + CI
  math, audit-deterrence numbers, outcome-provenance/censoring model).

## 8. Unreconciled cross-module seams  ⟵ REVIEW HERE (1 of 2)

These are interfaces between modules that no single module's review covers. Each is a place the
design could be silently inconsistent.

1. **Verifier ↔ Arbitration (live seam).** Verifier v0.4 §10.2 invents a *seller-acceptance gate*
   `{scope, fee, evidence-floor, appeal-path}` and §10.3 a *dispute-witness authority grant* — both
   are **interfaces into the arbitration ladder** that `Protocol_Arbitration_v0.1` does not yet
   define. Until reconciled, "appeal path" and "dispute witness" are names without a schema.
2. **`Protocol_Arbitration_v0.1` shared-edit seam.** SYNC seam 4: **both Claude and Codex have
   edits**; the file is dirty and unreconciled. Any consolidation that cites it is citing an
   in-flux doc.
3. **Trust-import ↔ bond/calibration (Bootstrap).** Trust import grants "scoped bond relief capped
   by acquisition cost"; Bootstrap grants "lower bond from history as a calibrated policy." These
   are two relief paths onto the *same bond* — is the relief additive, max'd, or mutually exclusive?
   Unspecified; a double-dip risk.
4. **Custody ↔ Verifier (the same-subject conflict).** Payment_and_Custody says the *shop holds the
   card*; Verifier v0.4 forbids a shop with same-`subjectHash` custody from verifying it. So the
   **custodian shop and the verifier shop must be different shops** — but the custody network is
   "curated seed, few markets to start." At seed scale, can the network even *supply* a
   non-custodian verifier for every trade? Possible deadlock the modules don't acknowledge.
5. **Aperture ↔ Interrupt bar.** The aperture sets `attention_contract` (reserved/delegated
   judgments, spend authority); the interrupt bar computes `θ` and routes lanes. Where exactly does
   the aperture's "reserved judgment" become the interrupt bar's "authorization_interrupt"? Two
   mechanisms over the same escalation surface, not yet unified.
6. **The trusted-base/agent boundary (the Architecture-Boundary open question).** The off-chain
   validator stack (wall checks, legibility vector, manifest validation) is itself **trusted code**.
   Does it ship *as the protocol* or *as the reference agent*? If "the protocol" = "the reference
   agent," then most guarantees rest on one implementation — a centralization the spine's thinness
   was supposed to avoid.
7. **Catalog as anchor vs ground truth.** `card_reference_packet` anchors a `catalog_hash` + row_id.
   The catalog is *legible* (a content-addressed reference), but downstream surfaces could read a
   catalog match as *authentication*. Where is the line enforced that "matches catalog row" ≠ "is
   that card"?

## 9. Protocol-wide attack surface  ⟵ REVIEW HERE (2 of 2)

Attacks that span layers — each module's local review misses these because they live *between* modules.

- **A. Cross-layer overclaim leak (the F2 generalization).** The fatal failure mode is a
  legible/judged thing surfaced as enforced. It already happened once (custody `attested:true`
  promoted to enforced). Where else can it recur — the human surface, the agent commentary, a
  reputation display, a "verified" badge? This is the *thesis-level* attack.
- **B. The trusted base.** The predicate verifier is a **stub** (no real ZK). The off-chain validator
  stack is trusted (seam §8.6). The stablecoin issuer + fiat on-ramp KYC node are trusted
  (Payment §4.6). The catalog source is trusted (§8.7). **Enumerate the full trusted base** — the
  spine is only as thin as its trusted dependencies are honest.
- **C. Cross-role collusion under common control.** Seller + verifier + arbiter + custodian shop are
  separate *roles* but could be one *party* (or a cartel) behind distinct addresses. Verifier v0.4
  caps pairs and forbids same-subject custody, but **common control across roles** is legible, not
  enforceable. What is the worst single-party-wears-N-hats trade?
- **D. Calibration cold-start centralization (structural).** Capital-heavy cold-start + portfolio
  bonds + reputation-collateral push the high-value end toward the well-capitalized — protocol-wide,
  not just in the verifier. Does "calibration not certification" collapse into a cartel of the rich?
- **E. Physical custody gaps (permanent, `Protocol_Gaps_v0.1`).** Token↔atoms binding (G1),
  identity-is-not-key, snapshot-is-not-process (continuity), shop-to-shop handoff. These are
  **accountable, not closeable** — but is the residual *priced and disclosed* at every surface, or
  does a "vaulted" badge read as "safe"?
- **F. Settlement-rail trust.** Stablecoin = a centralized issuer; the on-ramp = a trusted KYC node;
  "atomic swap" still assumes both items are *as attested*. Each rail's residual must be labeled at
  formation — is it?
- **G. Liveness-fallback abuse.** The default remedy on arbiter timeout is buyer-refund. Can a buyer
  *induce* arbiter inaction (or a stuck claim) to force the default and extract the card-plus-refund?
  Who bears the floor-executor cost?
- **H. Spendability-as-authorization gap.** The route spendability digest is **self-minted** by the
  issuer — the contract enforces *binding + non-replay*, not *a third party approved this spend*.
  Anywhere a reader treats "spendable" as "independently authorized" is a hole.

## 10. Open questions (consolidated, the unspecced numbers)

- the effective-N threshold + CI math; the audit-deterrence numbers (`p_detect×slash + rep/legal >
  fraud profit` is unmet until quantified); the outcome-provenance/censoring model (Verifier §11/§5/§6).
- the reputation-vector estimators (false-reject, peer-relative harshness, pairing thresholds).
- the seller-acceptance + appeal-path schema and the dispute-witness grant (Verifier ↔ Arbitration, §8.1).
- the trust-import vs bootstrap bond-relief interaction (§8.3).
- where the trusted-base/agent boundary sits (§8.6).
- whether the seed custody network can supply non-custodian verifiers at scale (§8.4).

## 11. Module index (the map)

| Module | Owns | Freshness | Status |
|---|---|---|---|
| `Architecture_Boundary_v0.1` | the enforced/off-chain decision rule | 06-12 | current, authoritative on the boundary |
| `Marketplace_Protocol_Full_Spec` | the aggregate handoff | 05-19 | **trails**; cross-check modules |
| `Walls_v0.1` | the hard acceptance profile + spendability | 05/06 | current |
| `Legibility_v0.1` | the legibility vector (vector not verdict) | 06-10 | current |
| `Agent_API_v0.1` | the action/API contract | 05-20 | current |
| `Bootstrap_v0.1` | cold-start (seller-first, bonds-as-reputation) | 06-10 | current |
| `Pokemon_Card_Reference_Layer_v0.1` | the catalog reference packet | 05-20 | current |
| `Trust_Import_v0.1` | external reputation as legible-not-bindable | 06-10 | current |
| `Collector_Aperture_v0.1` | desire → legible policy | 06-12 | current |
| `Interrupt_Bar_v0.1` | the escalation bar + six lanes | 06-17 | current |
| `Arbitration_v0.1` | the dispute ladder + JSC | 06-12/16 | **shared seam, dirty (§8.2)** |
| `Payment_and_Custody_v0.1` | rails + distributed custody + swap | 06-16 | current |
| `Human_Surface_v0.2` | glance/decide/audit + no-overclaim UI | 06-15 | current (v0.1 superseded) |
| `Verifier_v0.4` | the verifier role + trust signal + routing | 06-19 | current (line v0.1→v0.4) |
| `chain/` (4 contracts) | the enforced spine | ongoing | 102 tests; predicate = stub |
| `SYNC.md` / `AGENTS.md` | parallel-work coordination head | live | current |

## 12. How to review this document

1. **§8 first** — are the seams real, and is any of them *fatal* (a contradiction, not just a gap)?
2. **§9 next** — which protocol-wide attack is most dangerous, and does any module *already* close
   it (so it's a doc error, not a hole)?
3. **§2 vs §7** — is anything I labeled *enforced* actually *design-only*, or vice-versa? The
   F2-class error (legible/judged shown as enforced) is the one that matters most.
4. **§10** — which open number, if it stays unspecced, *blocks value-bearing alpha*?
5. Disposition each finding once (the ledger discipline); the fatal ones drive a v0.2.

## 13. Changelog
- **v0.1:** first consolidation of the modular corpus into one front-door + cross-module seam map
  (§8) + protocol-wide attack surface (§9). Built for adversarial review; freeze = the v0.2 diff target.
