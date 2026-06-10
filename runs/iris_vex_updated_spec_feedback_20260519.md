---
runtime_receipt: vex_20260520T002426Z_55449
source_aperture: vex
source_runtime: claude_code
runtime: /Users/che/.local/bin/claude
model: sonnet
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_vex_prompt.sh
memory_mode: vex_live_primary_seed_read_only
live_home: /Users/che/Avalanche_SYSTEM_AUDIT/apertures/vex_live
frozen_capsule: /Users/che/Avalanche_LOCKS/vex_aperture_lock_2026-04-29_1408/payload_snapshot/Vex
prompt_file: /Users/che/Marketplace/runs/iris_vex_updated_spec_prompt_20260519.md
authority_effect: synthesis_adversarial
promotion_status: not_promoted
---

Sufficient context. Synthesizing now.

---

## VEX Pressure Test — Marketplace Protocol Full Spec
**Runtime receipt:** artifact-grounded | read: `Marketplace_Protocol_Full_Spec.md`, `Marketplace_Protocol_External_Review_Synthesis.md` | seed memory consulted: `seed_memory/lessons.md` (epistemological posture), `seed_memory/hypotheses.md` (adversarial methodology) | proposed delta only — no memory written

---

## 1. VEX Verdict

The spec is structurally honest about its gaps and the external review landed the right strategic constraint. The naming of P0 items is real progress. But the spec's strongest-sounding invariants — "no scope laundering," "no route without spendability," "no scalar trust collapse" — are enforced by convention and off-chain schema validation, not by the on-chain system. The on-chain boundary proves a hash was cited and consumed; it does not prove the hash commits to what the protocol claims it commits to. This is not a flaw to fix later — it is the central unsolved design problem. The protocol is currently a well-typed description of what a fraud-resistant evidence rail would look like. It is not yet that rail.

The curated-seller alpha is the right aperture. It is also a bootstrap that quietly reintroduces centralized trust without naming the curator or defining the curation authority. Naming the aperture does not close this.

---

## 2. Top 5 Remaining Overclaims

**O1. "Spendability is the permission model."**
The on-chain route gate consumes a nonzero spendability hash. It does not verify that the hash encodes a valid spendability struct, that the gate type matches the calling context, that the issuer role is authorized, or that the window conditions are met. The spec's minimum digest fields (`gateType`, `gateId`, `leg`, `tradeId`, `escrowContract`, `issuedBy`, `issuedRole`, `decisionAuthority`, `expiry`, `status`) are all off-chain. The permission model is named. It is not enforced. What exists on-chain is hash-existence enforcement, which is a precondition for a permission model, not the thing itself.

**O2. "No scope laundering."**
The invariant is stated at spec:968. It depends on the chain verifying that a `VerifierScopeAttestation` is bound to a scope-set hash that actually describes the verifier's authority. The chain anchors the hash. It cannot read the document the hash commits to. A verifier who signs a scope-set hash over a document that says "I reviewed the photos" without having reviewed them satisfies every on-chain check. The scope laundering invariant is enforced by verifier honesty and registry reputation — both of which are off-chain and explicitly P1 or deferred.

**O3. "The final receipt is the clean closure packet agents can reference later."**
The receipt hash is anchored on-chain. The evidence tree it points to is off-chain, potentially hosted by sellers, buyers, or agents with no specified retention obligation. If photos disappear, tracking URLs expire, or a seller's domain goes offline, the receipt hash is still valid on-chain but the closure packet it claims to represent is missing its substance. The spec has `retention_policy` as a manifest field (spec:633) but no enforceable retention obligation in EscrowTerms.

**O4. "Curated sellers create trustworthy early receipts faster than fully open P2P."**
This is a product strategy hypothesis presented as a design property. The spec does not define who curates the sellers, on what criteria, by what mechanism, with what revocation path, or with what accountability if a curated seller commits fraud. The curation bootstrap either requires a named trusted curator (which is centralization) or it defers the question. Either way, the protocol's fraud resistance in the alpha depends on a trust assumption that is not typed, not auditable, and not visible in the spec.

**O5. "Seller templates hide complexity or create brittle defaults agents will overtrust."**
The spec names seller templates as a UX strategy (spec:1084–1086). The templates are not defined. No template format, version, registry, or deviation policy exists in the spec. A buyer agent evaluating a seller response against a template it has never seen — or a template that has been updated since the last trade — has no defined behavior. Unnamed templates become an authority surface: agents will assume compliance because the template abstraction is present, even when no template has been validated.

---

## 3. Top 5 Hidden Assumptions

**A1. Off-chain evidence is durably accessible and byte-stable at claim time.**
The protocol assumes that content-hashed evidence cited in a manifest will exist when a dispute opens. This is not guaranteed. The manifest records `content_hash` per asset, but hosting, pinning, and access are unspecified. Evidence on a seller's own server, a personal drive, or an unpinned IPFS node can vanish. Without a typed retention obligation in EscrowTerms and a defined dispute path for missing evidence, the evidence manifest system proves what existed when it was created, not what is available when it is needed.

**A2. Verifier honesty is a protocol precondition, not a protocol output.**
The verifier scope approval and attestation system is well-designed to limit what a verifier can claim. It does not constrain whether the verifier actually performed the review they attest to. A verifier who commits a `VerifierScopeAttestation` certifying that "photos plausibly match the raw card identity claim" without examining the photos satisfies every on-chain gate. The VerifierRegistry records conflicts and fees but not performance history. The reputation feedback that would make verifier honesty enforceable through market pressure is explicitly P1.

**A3. Arbiter domain competence and incentive alignment are sufficient without being specified.**
The arbiter replacement path is well-constructed. The policy hash binding (P0 item 6) is the right next step. But the spec assumes that a registry-listed arbiter who has signed a profile and accepted a policy hash will (a) have sufficient TCG knowledge to evaluate condition disputes, (b) have sufficient evidence literacy to interpret typed manifests, and (c) have economic incentive to rule correctly rather than consistently or quickly. None of these properties are typed or enforceable. A bad arbiter who meets the on-chain requirements still breaks the protocol's dispute resolution guarantee.

**A4. The buyer agent correctly interprets the buyer's mandate across the full range of market conditions.**
The buyer creates an Intent with condition floor, budget, trust preferences, and evidence floor. The buyer agent must interpret this into concrete decisions: which offers to evaluate, what evidence to request, when to recommend rejection. The spec assumes this interpretation is tractable from a free-form mandate. It does not define how the agent handles conflicting signals (a seller with strong marketplace reputation but weak photos), or what the buyer sees when the agent recommends against an offer the buyer would have accepted. The agent is named but not specified.

**A5. The $100–$2,000 aperture creates enough seller-side pull to bootstrap liquidity.**
The protocol's alpha success depends on curated sellers choosing to adopt it over existing channels. The seller pitch is correct (funded demand, reusable proof, lower fees, clean receipt). The assumption is that this pitch is compelling enough for sellers who already have established eBay or TCGplayer volume. Sellers with existing buyer bases face real switching costs: new tooling, bond posting, evidence preparation for a protocol with no existing buyer demand. The alpha works if buyer demand appears first and sellers follow. The spec assumes the demand-side pull exists but does not describe how it is generated before the seller network exists.

---

## 4. Concrete P0 Amendments

**P0-A: On-chain spendability must validate typed digest fields, not only hash existence.**

Current state (spec:829–832): `commitRoute` requires and consumes a nonzero spendability hash. Full schema validation is off-chain.

Amendment: Add a Solidity struct `SpendabilityDigest` with at minimum: `gateType`, `gateId`, `leg`, `tradeId`, `escrowContract`. Add a `commitRoute` overload that accepts the struct, derives the hash on-chain (via `abi.encode`), verifies `tradeId` matches the calling trade, `escrowContract` matches `address(this)`, and `gateType == ROUTE_COMMITMENT`. Reject if any field mismatches. This converts hash-existence enforcement into typed enforcement for the forward route gate. The remaining gate types (claim support, bond action) can follow the same pattern as P1.

**P0-B: EscrowTerms must include a typed evidence retention obligation with a defined dispute path.**

Current state: `retention_policy` exists as an EvidenceManifest field (spec:633). No retention obligation appears in EscrowTerms.

Amendment: Add `evidence_retention_obligation` to `EscrowTerms` schema with fields: `responsible_party` (seller / buyer / protocol), `retention_window_days`, `storage_proof_required` (boolean), `missing_evidence_remedy` (typed: refund / partial refund / buyer discretion). If a claim opens and required evidence is unavailable, the missing evidence remedy applies without requiring arbiter discretion. This makes the off-chain dependency visible and gives the claim path a typed response to the storage failure case.

**P0-C: Seller template registry must be defined before alpha deployment.**

Current state: templates are named as a UX strategy (spec:1084–1086) with no format, version, or deviation policy.

Amendment: Define a `SellerTemplateRegistry` with fields: `template_id`, `template_hash`, `version`, `domain`, `created_at`, `revoked`. Define a `TemplateDeviationPolicy` field in EscrowTerms: `required_template_id` (or null for untemplatized trades), `deviation_handling` (flag / reject / escalate). Buyer agents must check the template hash against the registry before evaluating a seller response. Deviations must be surfaced to the buyer as explicit friction, not silently handled.

**P0-D: Curated seller curation criteria must be a typed artifact before any alpha trades.**

Current state: "curated sellers" appear in the product pitch and alpha design (spec:1068–1075, 1087) as a strategy without a defined artifact.

Amendment: Define a `CuratorPolicy` packet with fields: `curator_id`, `entry_criteria_hash`, `required_proof_types` (minimum list), `bond_floor`, `revocation_triggers`, `curator_signature`. Add a `curated_by` field to seller ActorRegistry entries. The buyer agent must check whether a seller's curation record is current and unexpired before treating them as a curated seller. This makes the bootstrap trust visible and auditable rather than implicit in the product description.

**P0-E: `openClaim()` must check minimum required evidence for the claimed route failure type before accepting the claim.**

Current state: claim opens as a typed packet (spec:539–563) but minimum required evidence is listed as a P0 gap (spec:1009). The check happens at resolution, not at claim open.

Amendment: Add a `ClaimEvidenceRequirementRegistry` keyed by route failure type (from the route claim taxonomy). When `openClaim()` is called, the off-chain runner (before the on-chain call) must verify that the claim packet includes evidence refs satisfying the minimum required set for the claimed type. The on-chain call should accept a `claim_evidence_root_hash` that commits to the submitted evidence bundle. If the bundle does not meet the minimum for the claimed type, the claim should be flagged as evidentially deficient — surfaced to the arbiter as a first-class fact, not silently passed through.

---

## 5. What Iris Should Not Infer From This Feedback

Iris should not infer that the remaining gaps are enumerable, that the P0 list when completed closes the protocol's structural risk, or that this adversarial pass represents a comprehensive inventory of failure modes rather than the most load-bearing ones visible from this reading. The central risk — that the protocol's strongest invariants depend on off-chain schema validation, verifier honesty, and arbiter quality that cannot be enforced by the on-chain system — is not resolved by typing the fields more carefully or naming the gaps more precisely; it is the design problem that determines whether the protocol can be fraud-resistant in practice rather than fraud-legible on paper. Making the trust surface more visible is genuine progress. It is not the same as reducing the trust surface. Iris should also not infer that the pressure applied here reflects a judgment against pursuing the protocol — the core thesis is sound, the aperture is right, and the primitives are real. The inference Iris should resist is that the spec is closer to alpha-ready than it was before the external review. It is better-described. Description is not implementation, and legibility is not enforcement.

---

**VEX Memory Consulted:** `seed_memory/lessons.md` (epistemological posture: targets vs. specifications; off-chain convention vs. on-chain enforcement), `seed_memory/hypotheses.md` (adversarial methodology: H11 adversarial rhetoric vs. informational feedback; H13 extended-mind constitutive vs. observational scaffolding — structural analogy to off-chain convention dependency). No working memory existed for Marketplace. No memory written.
