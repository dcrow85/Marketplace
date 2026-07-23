# Cairn — Protocol Rundown (v0.2)

> **The front page.** A navigable map of the whole protocol: what it is, the four
> layers, every canonical spec (linked), and the honest status of each.
> Generated 2026-06-29 · status: **orientation doc** (not canonical for any lane —
> each module is canonical for its own lane; this just indexes them).
> Updated 2026-07-02 after chain reconciliation restored the A1–A4
> `MarketplaceEscrow` hardening and added trunk CI.
> Updated 2026-07-19 with the additive, agent-neutral intent/delegation/
> interoperability design; it is audited design, not runtime conformance.
> Supersedes [`Claude_Fable5_Protocol_Rundown.md`](Claude_Fable5_Protocol_Rundown.md).
> The adversarially-reviewed single front-door is [`Protocol_Consolidated_Spec_v0.2.md`](Protocol_Consolidated_Spec_v0.2.md);
> read it next for the gate machinery.

**What it is:** an agentic protocol for trading physical things that have to be real
— narrowed to Pokémon/Azuki cards. It does **not** claim a card is genuine. It makes a
lie **attributable and consequential**. The motto across every doc: *"a witness, not
proof — accountable, not impossible."*

---

## The spine: enforced / legible / judged

Every claim is bucketed, and that bucketing is the whole design:

- **Enforced** — mechanically checked on-chain (hashes, balances, timeouts, signatures,
  registry status). Small and hard.
- **Legible** — signed, typed, hash-anchored evidence. *Measured, never aggregated into
  a verdict.* Off-chain.
- **Judged** — authenticity, condition, trust, fairness. Decided by humans / agents /
  verifiers / arbiters.

**On-chain decision rule** ([Architecture Boundary v0.1](Protocol_Architecture_Boundary_v0.1.md)):
bind something only if it protects *funds or liveness* **and** is a *mechanical* check —
otherwise anchor the hash, validate off-chain, disclose, measure.

**Trade lifecycle (14 stages):** Intent → Discovery → Proposal → Escrow terms → Item
fingerprint → Inventory lock → Evidence → Verifier scope → **Spendability gate** → Route
→ Delivery & inspection → Claim → Arbitration → Settlement. Money, terms, evidence, and
seller accountability all lock *before the card moves*; the human is interrupted only on a
real decision.

**Keystone primitive:** *"Evidence is memory; spendability is permission."* A valid
evidence manifest buys nothing by itself — spendability is a gate-scoped, single-use
permission to act at one specific boundary.

---

## The four layers

### 1 — Enforced spine ✅ BUILT & PASSING
Contracts in [`chain/`](chain/) (`^0.8.24`):
- **`MarketplaceEscrow`** — money, bonds, the state machine, spendability gates.
- **`MarketplaceActorRegistry`** — roles + EIP-191 signatures (the provenance root).
- **`MarketplaceInventory`** — owned collections, custody attestation.
- **`MarketplacePredicateVerifierStub`** — *stub, no real ZK yet.*

State machine: Funded → EvidencePending → RouteLocked → InProgress → InspectionOpen →
ClaimPending → Settled. Enforces packet replay protection, item-fingerprint collision
checks, buyer-scoped verifier approvals, inventory-lock-bound-to-fingerprint, **route
commitment consuming a typed spendability hash**, arbiter replacement + emergency timeout.

**Proven:** 140 forge tests green after the 2026-07-02 chain reconciliation
(`MarketplaceEscrow` 119 + `MarketplaceInventory` 12 + `ThinPilotEscrow` 9);
CI now runs `forge build` plus a committed test-count assertion. `unified_stress_runner.py` runs 250 trades × 14 attacks
+ Anvil replay → *every* attack invariant `== 0` (no silent accepts, trust laundering,
out-of-scope routing, stale-bundle routing); `protocol_e2e.py` settles + resolves claims +
runs arbiter handoff. Named falsification drills with teeth (fingerprint collision,
spendability bypass, wall-bundle, evidence manifest).

### 2 — Legible layer 📐 DESIGNED
- **[Legibility v0.1](Protocol_Legibility_v0.1.md)** — evidence is a **6-dim vector**
  (coverage · independence · continuity · scope_fit · cost_to_fake · source_calibration).
  *"Output a vector, never a verdict."* Schema blocks forbidden fields
  (score/trust/grade/probability/verdict). Aggregation is a separate *judged* projection.
- **[Walls v0.1](Protocol_Walls_v0.1.md)** — 19 walls; each returns
  pass/block/waiver_required/escalate. The hard $500–2000 raw-card profile requires the
  packets `item_fingerprint`, `card_reference`, `inventory_lock`, `proof_vector_scope`,
  `bond_scope`, `route_insurance_risk_owner`, `arbiter_policy_hash`, `evidence_profile`.
  Agents **may not narrate around a missing hard packet**
  ([testbed](Protocol_Walls_Agent_Testbed.md)).
- **[Agent API v0.1](Protocol_Agent_API_v0.1.md)** — trade actions, not packet internals.
  Two memory currencies: `trajectory_capacity` (can't move funds) vs `assembly_placement`
  (spendable only at a named gate).
- **[Agent-Neutral Intent, Delegation & Interoperability v0.1](Protocol_Agent_Intent_Interop_v0.1.md)**
  — principal-custodied intent, replaceable/BYO agents, capability-specific grants,
  exact-copy evidence, deal continuity, serializable reservations, receiver-backed
  action receipts, and HTTP/MCP/A2A bindings. It keeps Anko as a reference agent,
  never a privileged protocol actor. Its first [machine-readable proposal
  foundation](protocol/) is now the active [minimum trust
  kernel](Protocol_Agent_Minimum_Trust_Kernel_v0.1.md): nine exact operations,
  two bounded local writes, canonical hash/signature vectors, and no authority
  to act. The larger supervised-execution candidate is rejected research.
  Production services, authenticated service observations, consequential
  profiles, and runtime conformance remain unbuilt.
- **Catalog / card-reference** — [Card Reference Layer v0.1](Pokemon_Card_Reference_Layer_v0.1.md):
  the `CardReferenceCandidate` packet (identity + comparison image + `not_claiming`).
  **"Catalog match ≠ authentication"** (the G6 wall).
  [Catalog Lineage v0.1](Protocol_Catalog_Lineage_v0.1.md): catalogs are content-addressed
  `(catalog_hash, row_id)`; revisions are evidence-weighted, not vote-weighted.

### 3 — Judged layer 📐 DESIGNED (the deepest, most-reviewed specs)
- **[Verifier v0.4](Protocol_Verifier_v0.4.md)** — the only role that crosses the physical
  gap; a look becomes a scoped signed claim, never a verdict. *Calibration, not
  certification*, regime-gated by effective-N. Shop-network routing, blind assignment,
  buyer-designated routes, bilateral reputation vector. Attacks A–H + 9/10/11.
- **[Judgment Independence / G5 v0.3](Protocol_Judgment_Independence_v0.3.md)** — the
  keystone (a captured judge rubber-stamps everything). 10 gates / 33 subguards;
  floor-path core (non-party + ≥2 panel + appeal stay) **bound on-chain**.
- **[Insurance v0.3](Protocol_Insurance_v0.3.md)** — the priced home for the honest
  residual; pays if a covered event is *ruled/attested*, never "this is real." Premium = a
  capital-backed trust signal; arbiter ruling = payout oracle; fully reserved. 15 gates /
  35 subguards (I1–I15).
- **[Arbitration v0.1](Protocol_Arbitration_v0.1.md)** — the judgment-supply layer; a
  tiered cost field (LLM floor → LLM panel → human → specialist), loser-pays, judges *the
  evidence package, not the card* (the swap test). The ruling **is** the insurance oracle
  and drives bond-slash. *(Shared seam — still dirty.)*
- **[Catalog Evidence v0.2](Protocol_Catalog_Evidence_v0.2.md)** — the catalog as a
  community-specimen distribution; *"variance is the feature."* Weight = f(provenance
  anchor), **not** f(submission). 10 gates / 26 subguards (CE1–CE10), incl. CE9 (no
  full-res public corpus → forger training data) and CE2 (= G6).
- **[Trust Import v0.1](Protocol_Trust_Import_v0.1.md)** — outside reputation enters as a
  legibility vector, never a score; bond relief capped at acquisition cost; mandatory decay.

### 4 — Human surface 📐 DESIGNED (+ partly live in the product)
- **[Human Surface v0.2](Protocol_Human_Surface_v0.2.md)** — three altitudes: **Glance**
  ("do I want this?", ~5s) → **Decide** ("real cost — authorize?") → **Audit** ("show me
  why"). Brand **Cairn / c(ai)rn**. Hard color discipline: only the card image + one risk
  hue (oxblood) carry color; risk flags go **amber→red, never green**.
- **[Interrupt Bar v0.1](Protocol_Interrupt_Bar_v0.1.md)** — *interrupt when
  **Stake × (1 − Confidence) × Irreversibility > θ*** (θ = delegation tolerance, which
  learns). 6 router lanes, 3 laws.
- **[Collector Aperture v0.1](Protocol_Collector_Aperture_v0.1.md)** — your attention
  contract; one sentence sets both *search* and *interruption* policy; judged, never
  enforced.
- **[Payment & Custody v0.1](Protocol_Payment_and_Custody_v0.1.md)** — money programmable,
  custody distributed. Escrow is non-custodial (funds in the contract; stablecoin default;
  off-chain fiat is *legible*, never "held"). Custody = a network of local card shops.
  Atomic swap is first-class.

---

## Where it actually stands (the honest status)

- **Front door — [Consolidated Spec v0.2](Protocol_Consolidated_Spec_v0.2.md)** indexes
  everything and freezes **6 admission gates (G1–G6)** that must hold before any
  value-bearing alpha (value-safe liveness defaults; custodian ≠ verifier; real
  verifier↔arbitration schema; non-additive bond relief; self-arbitration bar;
  catalog-match ≠ authentication).
- **External review verdict ([GPTPRO Response](Cairn_Protocol_GPTPRO_Review_Response_v0.1.md),
  2026-06-22) — accepted:** **Open/public alpha = NO-GO. High-value = NO-GO. Low-value
  *curated* = conditionally viable.** Four blocking repairs: mechanical alpha caps (A1),
  no single-witness irreversible delivery (C-02), disable buyer-favoring post-handoff
  auto-remedy (C-03), typed/snapshot-bound spendability (A4/A5). Review packet:
  [GPTPRO Draft](Cairn_Protocol_GPTPRO_Review_Draft_v0.1.md). Earlier ChatGPT-Pro review:
  *"conceptually strong, operationally fragile — constrain two problems, prove one path."*
- **Maturity gap:** the **spine is real and passing**; the **judged layer is
  reviewed-but-mostly-design-only** (only the G5 floor-path is bound on-chain). Insurance,
  registries, and attested triggers are not built yet. Judged-layer spec heads are frozen
  until one settled pilot trade exists, except for correcting false status/anchor claims or
  writing the trade-#1 runbook.
- **First judged-layer transducer is running:** local Qwen3.6 (35B) scored 15/15 on the
  interrupt-bar probe, 0 overclaim; browses the real catalog and self-labels. *(Overclaim
  check is a keyword heuristic, not semantic — caveat.)*
- **7 permanent gaps ([Gaps v0.1](Protocol_Gaps_v0.1.md))** — digitally unclosable by
  design: bytes≠atoms, sensor isn't neutral, snapshot≠custody, key≠person, meaning≠hash,
  ledger moves money but can't retrieve the card, truth decays between gates. Priced and
  disclosed, never "solved." The thesis-level attack is rendering legible/judged as
  enforced.
- **Audit ([Audit v0.1](Protocol_Audit_v0.1.md), 10 domains):** 2 findings still open —
  **AUD-D6-004** (registry-authority metadata opaque to escrow) and **AUD-D4-002**
  (legibility≠spendability holds partly by absence).

---

## The live product (the human surface, made real)

**cairn.cards** — the binder (Azuki TCG default + JP pre-English), agent browse
("Ask Ledger"), dark mode, mobile-tuned, and the **photo-import flow**: live vision read
(Qwen3-VL) + high-res inspection capture. **Image storage (R2) is the in-progress piece.**
Surface code: `mockups/`, `web/` (Vite/React/Privy app at `/app/`), `simulations/cairn_*`.

---

## Canonical doc map (current heads)

| Layer | Spec | Status |
|---|---|---|
| Front door | [Consolidated Spec v0.2](Protocol_Consolidated_Spec_v0.2.md) | alpha, Kepler-reviewed |
| Boundary | [Architecture Boundary v0.1](Protocol_Architecture_Boundary_v0.1.md) · [Bootstrap v0.1](Protocol_Bootstrap_v0.1.md) | current |
| Spine | [`chain/`](chain/) — 4 contracts + drills | **built, 140 tests green + CI count guard** |
| Legible | [Legibility v0.1](Protocol_Legibility_v0.1.md) · [Walls v0.1](Protocol_Walls_v0.1.md) · [Agent API v0.1](Protocol_Agent_API_v0.1.md) | designed |
| Agent boundary | [Agent-Neutral Intent, Delegation & Interoperability v0.1](Protocol_Agent_Intent_Interop_v0.1.md) · [Minimum Trust Kernel v0.1](Protocol_Agent_Minimum_Trust_Kernel_v0.1.md) · [`protocol/`](protocol/) | narrowed proposal-only machine candidate; execution bundle rejected; no runtime conformance claim |
| Catalog | [Card Reference v0.1](Pokemon_Card_Reference_Layer_v0.1.md) · [Lineage v0.1](Protocol_Catalog_Lineage_v0.1.md) | designed + drills |
| Judged | [Verifier v0.4](Protocol_Verifier_v0.4.md) | designed |
| Judged | [Judgment Independence v0.3](Protocol_Judgment_Independence_v0.3.md) | floor-path on-chain |
| Judged | [Insurance v0.3](Protocol_Insurance_v0.3.md) | designed |
| Judged | [Arbitration v0.1](Protocol_Arbitration_v0.1.md) | designed *(dirty seam)* |
| Judged | [Catalog Evidence v0.2](Protocol_Catalog_Evidence_v0.2.md) | designed |
| Judged | [Trust Import v0.1](Protocol_Trust_Import_v0.1.md) | designed |
| Human | [Human Surface v0.2](Protocol_Human_Surface_v0.2.md) | designed + live |
| Human | [Interrupt Bar v0.1](Protocol_Interrupt_Bar_v0.1.md) · [Collector Aperture v0.1](Protocol_Collector_Aperture_v0.1.md) · [Payment & Custody v0.1](Protocol_Payment_and_Custody_v0.1.md) | designed |
| Posture | [Audit v0.1](Protocol_Audit_v0.1.md) · [Gaps v0.1](Protocol_Gaps_v0.1.md) · [GPTPRO Review](Cairn_Protocol_GPTPRO_Review_Response_v0.1.md) | 2 findings open |

---

## Lanes & coordination

- **Claude** — product + human surface + judged-layer agent (`mockups/`, `web/`, the
  UI/browse sims, `agent_tools/inventory_tools.py`, the Human-Surface / Interrupt /
  Payment docs).
- **Codex** — enforced/legible backbone (`chain/` Solidity spine, `simulations/protocol_*`
  + drills, catalog DATA pipeline `data/japanese-pre-english/`,
  `agent_tools/no_rarity_catalog_tools.py`).
- Live coordination head: [`SYNC.md`](SYNC.md) (read first, every session). Lane state
  archive: [`Protocol_Codex_Brief_2026_06_17.md`](Protocol_Codex_Brief_2026_06_17.md).
