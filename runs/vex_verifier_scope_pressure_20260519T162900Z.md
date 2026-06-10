---
runtime_receipt: vex_20260519T162749Z_19048
source_aperture: vex
source_runtime: claude_code
runtime: /Users/che/.local/bin/claude
model: sonnet
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_vex_prompt.sh
memory_mode: vex_live_primary_seed_read_only
live_home: /Users/che/Avalanche_SYSTEM_AUDIT/apertures/vex_live
frozen_capsule: /Users/che/Avalanche_LOCKS/vex_aperture_lock_2026-04-29_1408/payload_snapshot/Vex
prompt_file: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/inbox/iris_to_vex/2026-05-19_iris-to-vex_marketplace_verifier_scope_semantics_pressure.md
authority_effect: synthesis_adversarial
promotion_status: not_promoted
---

I have what I need. Seed memory directory listing is not accessible via file read; no seed memory files were loaded. Analysis proceeds from primary artifact (`verifier_scope_semantics_20260519T162044Z.md`, fully read) and contract source (`MarketplaceEscrow.sol`, fully read). Test file read was partial (100 lines). No seed memory consulted.

---

```
RUNTIME RECEIPT
───────────────
Session date : 2026-05-19
Files read   : verifier_scope_semantics_20260519T162044Z.md (563 lines, full)
               MarketplaceEscrow.sol (909 lines, full)
               MarketplaceEscrow.t.sol (100 lines, partial — setUp + one test only)
               vex_aperture_selected_manifest_2026-05-01.md (full)
Seed memory  : directory not accessible via file read — zero seed memory files loaded
Unverified   : test/MarketplaceEscrow.t.sol beyond line 100,
               chain/script/protocol_e2e.py,
               chain/script/replay_agent_sim_trades.py,
               protocol.html#verifier-scope
Authority    : synthesis from read artifacts only
```

---

## Verdict

The design's conceptual architecture is sound and unusually rigorous about naming ceilings. The laundering risk is real and survives the current implementation boundary at four distinct surfaces. Three of those surfaces are pre-alpha critical; one is structural and cannot be fully closed by design.

---

## Human-Stakes Translation

A buyer pays escrow and accepts an assigned, buyer-approved verifier. A later dispute turns on whether the item was authentic. The arbiter asks: "What did the verifier actually check?" If the verifier only confirmed a photo hash existed in the packet, and the agent displayed "Cert and custody checked," the buyer's dispute position rests on a display label, not an evidence claim. The arbiter has no on-chain anchor to recover the scope. The buyer loses not because of fraud but because the verification boundary was never formally closed.

---

## VEX Memory Consulted

None. Seed memory directory read failed (EISDIR). Selected mirror not cited per authority rules. Analysis is grounded entirely in the runtime reads listed above.

---

## Pressure Points

### 1. Strongest part — named without flattery

The `What It Must Not Imply` column in the authority boundary table. Most verification designs document what was checked. This design forces each scope to carry a named ceiling — a thing it definitionally cannot mean. The `inputs_not_seen` field extends this: the absence of evidence is reported, not left as silence for agents to fill with optimistic priors. These two features together are structurally harder to write and easier to skip. They're the only parts of the spec that actively resist summary compression.

---

### 2. Where "assigned verifier" still launders into "real verification"

**Surface A — `attachEvidence` is open to any active registry verifier without buyer trade approval [CRITICAL]**

`_onlyParticipantOrVerifier` at `MarketplaceEscrow.sol:852` checks only `actorRegistry.isVerifierActive(msg.sender)`. A verifier who has never been buyer-approved for the trade can call `attachEvidence` with any `EvidenceKind`, including `EvidenceKind.Item`. The evidence hash lands in `evidenceHashes[tradeId]` with the verifier's address in the event log. No approval gate was crossed. An agent reading `EvidenceAttached` events sees: verifier address + Item kind + hash. From the contract's perspective this is indistinguishable from a buyer-approved verifier's evidence submission. The buyer approved nothing; the contract records a verifier touched the trade's evidence stream.

The fingerprint path has the buyer-approval gate (`approveFingerprintVerifiers`). The general evidence path does not. This is a wider surface than the spec's failure modes describe.

**Surface B — Buyer fingerprint-verifier approval has no scope binding [CRITICAL]**

`approvedFingerprintVerifiers[tradeId][verifier]` is a boolean (`MarketplaceEscrow.sol:134`). The `approvalHash` is anchored but it's a freeform hash with no on-chain structure. A buyer who intended to approve a verifier for `packet_completeness` only has created a contract fact that says "this verifier may commit this trade's item fingerprint." Nothing in the contract records which scopes were approved. A verifier who commits a fingerprint after the buyer's narrow intent approval has on-chain legitimacy indistinguishable from one the buyer approved for `graded_cert_correlation` + `slab_custody`. The approval migrates upward from the buyer's intent to whatever the verifier later claims.

**Surface C — `commitVerifierAttestation` does not exist [CRITICAL]**

The proposed function is described at spec line 407 and is the primary containment mechanism. It is not in the contract. Until it exists, there is no on-chain binding between: verifier identity / scope claimed / subject hash / method used. The current contract event for verifier action is `ItemFingerprintCommitted`. That event carries: `tradeId`, `issuer`, `itemFingerprintHash`. An agent reading the event log cannot recover what was checked. The off-chain packet may exist but has no anchor. Agents and arbiters operating from on-chain state alone will default to "verifier committed fingerprint" → "item was verified."

**Surface D — Route proceeds without any verifier scope requirement [MEDIUM]**

`commitRoute` at `sol:553` checks: `inventoryLockHash != 0` and `fingerprintChallengeHash == 0`. No verifier attestation is required. A high-value trade can route with zero verifier scope attached. This is correct by design (not all trades need verifiers), but there is no on-chain gate that enforces "this trade's aperture requires scope X before route." The `requireScopeForRoute` primitive is listed as "can wait." For alpha this is a known gap, but it means the buyer's pre-trade policy has no enforcement path against a seller who routes before scope is satisfied.

---

### 3. Missing distinctions before alpha

**A. Verifier capability vs method execution [HIGH]**

The registry stores a `capabilityRecordHash` per verifier (referenced in the attestation packet at `verifier.capability_record_hash`). But `commitItemFingerprint` checks only `isVerifierActive` and buyer approval of the address. It does not check whether the method used in the attestation falls within the registered capability. A verifier registered for `packet_completeness` could produce a self-signed `raw_condition_floor` attestation. The contract accepts it because the verifier is active and buyer-approved. The capability record hash in the packet is an attestation by the verifier about their own credentials — not a checked constraint. Capability record and method execution are one field apart in the packet but entirely disconnected in enforcement.

**B. Buyer approval vs claim sufficiency [HIGH]**

`approveFingerprintVerifiers` records a binary: this verifier may act. It encodes nothing about the buyer's required scope set for this trade. The buyer may have a policy requiring `graded_cert_correlation` + `slab_custody` + `route_readiness`. The contract settles for: buyer approved verifier, verifier committed fingerprint. The gap between "verifier is authorized for this trade" (the approval) and "verifier made a sufficient claim for this buyer" (the acceptance criteria) is invisible to the contract and to any agent working from on-chain state. This distinction is the one Che's concern directly names and it is the one the current implementation does not close.

**C. Registered role vs independence [MEDIUM]**

The registry role system distinguishes Buyer / Seller / Arbiter / Verifier. But a verifier can be a physical shop that is also the seller's counterparty or affiliate. The registry has no independence attribute and no conflict-of-interest check. A colluding seller-controlled verifier passes every contract gate: active in registry, buyer-approved for the trade, signs a typed attestation. Independence is a policy property the spec assumes but does not define or enforce. For alpha this gap is acceptable only if the buyer agent explicitly surfaces the verifier's identity origin before approval, not after.

**D. Evidence seen vs evidence evaluated [HIGH]**

`inputs_seen` records what the verifier was shown — hash, kind, visibility, timestamp. The field name and structure conflate receipt with inspection. A verifier who receives a photo hash has "seen" it in the packet's sense. There is no `evaluated` field, no `evaluation_method`, and no binding between the listed inputs and the resulting positive claims. An agent or arbiter cannot recover whether "Verifier matched cert lookup" means the verifier ran a lookup tool against a live database or read a screenshot the seller provided. The method field carries `tooling` but it is self-reported by the verifier with no external check. The gap between "saw" and "evaluated" is epistemic and cannot be closed purely by schema design, but it needs to be named explicitly in the packet rather than inherited from the method summary.

**E. Display rule vs enforceable agent behavior [HIGH]**

The display section at spec line 215 states forbidden labels. The enforcement mechanism is a normative list in a spec document. There is no validator that rejects packets where `display.label` contains forbidden strings. More importantly, there is no validator that rejects agent synthesis outputs that derive "verified" from a set of scoped chips. An agent reading `seller_custody` + `graded_cert_correlation` + buyer-approved verifier may output "Verified seller and cert" without violating any structured check. The display rules need a mechanical validator, not a style guide, before alpha ships to real buyers.

---

### 4. Hardest hidden assumption

**A verifier who lists evidence in `inputs_seen` actually reviewed the content of that evidence.**

The entire packet model rests on this. The verifier self-reports what they saw, when they saw it, and what they concluded. There is no external witness, no TEE, no streamed attestation. The protocol anchors the hash of what the verifier *said* they looked at. It does not and cannot verify that the verifier opened the photo, ran the cert query, or compared the result to the slab. The `collusive_verifier` failure mode is named in the spec and the correction is outcome-based reputation updates — which only activate after real trades fail. A verifier who issues plausible-sounding attestations on their first ten trades is undetectable until a dispute resolves. This is not a fixable design gap. It is a fundamental epistemic limit of remote verification. It should be named explicitly in the packet — not only in `inputs_not_seen` but as a first-class `verification_model` field: `remote_self_reported`, `third_party_witnessed`, `tee_assisted`. Absence of that field means buyers cannot price the epistemic risk of the verification model they're accepting.

---

## Leakage / Authority Risks

1. **`attachEvidence` without buyer approval** is the highest leakage surface. A colluding or mistaken verifier can insert evidence into any open trade's evidence stream. Downstream agents and arbiters will see verifier + evidence kind + hash and may treat it as legitimated evidence even without scope containment.

2. **Scope-free approval** means the approval event (`FingerprintVerifierApproved`) carries no semantics that agents can use to bound what the verifier is authorized to claim. The approval hash is anchored but unreadable by contract logic.

3. **No `commitVerifierAttestation`** means the entire attestation packet is an off-chain artifact with no on-chain enforcement path. It can be fabricated, withheld, or presented selectively by any party with access to it. An arbiter in a dispute has no canonical on-chain reference point for what the verifier attested to.

4. **Self-reported capability record** means the verifier's stated credential (`capability_record_hash`) is not externally checked at attestation time. Scope overreach is undetectable until an arbiter reads the full packet.

---

## Non-Negotiable Controls

These must exist before alpha accepts real money:

1. **Buyer trade approval required for `attachEvidence` from a verifier** — not just for fingerprint commits. The `_onlyParticipantOrVerifier` gate must be tightened to require `approvedFingerprintVerifiers[tradeId][msg.sender]` for any verifier calling `attachEvidence`, or a separate `approvedTradeVerifiers` mapping must be added.

2. **`commitVerifierAttestation` on-chain primitive with typed signature** — the `scopeSetHash` and `subjectHash` must be bound on-chain before any trade is settled under verifier evidence. The anchor is meaningless without the packet, but the packet is unenforceable without the anchor.

3. **Off-chain packet validator** — must run before any attestation hash is submitted to the contract. Must reject: absent `scope`, empty `method`, empty `inputs_seen`, absent `display.short_warning`, and forbidden display labels. The hash that lands on-chain must be a hash of a packet that passed the validator.

4. **Scope-bearing approval hash** — the buyer's fingerprint-verifier approval must bind to a `scopeSetHash` that limits what the verifier can later claim in `commitVerifierAttestation`. Without this, the approval is a blank check.

---

## What Would Make This Uninterpretable

1. An arbiter receiving a dispute where the verifier attached evidence via `attachEvidence` (no buyer approval required) and the only on-chain record is `EvidenceAttached` + verifier address. The arbiter cannot determine whether the buyer ever consented to this verifier's involvement, what scope was claimed, or what the subject was.

2. An agent that reads `FingerprintVerifierApproved` + `ItemFingerprintCommitted` and displays "Cert and custody checked" when the buyer approved for packet completeness only. The contract has no record of the intended scope. The agent's display claim has no anchor to refute it.

3. A dispute after route where the verifier's `VerifierScopeAttestation` packet is off-chain only, the verifier has disappeared, and the only recoverable on-chain fact is that the verifier committed a fingerprint hash. Scope, method, inputs, and claims are all unrecoverable.

---

## Status Recommendation

**Do not extend the verifier path before closing the three critical surfaces.**

Specifically: do not add more scope vocabulary, do not add TCG adapters, and do not run simulation metrics against the verifier path until:

1. `attachEvidence` requires buyer trade approval for any verifier caller
2. `approveVerifierScope` binds a `scopeSetHash` to the buyer approval
3. `commitVerifierAttestation` exists with typed verifier signature, `scopeSetHash` check, and subject hash anchor
4. An off-chain validator rejects structurally malformed packets before their hash is submitted

These four together close the gap between "assigned verifier" and "real verification" at the mechanical level. The epistemic gap (self-reported inputs) is irreducible but can be labeled explicitly.

Build order: validator + contract primitive as a paired step first, then scope-bearing approval, then `attachEvidence` tightening. The validator and contract primitive must land together — anchoring a malformed packet is worse than anchoring nothing, because it creates a false appearance of containment.

---

## Che Decision Needed

1. **Should `attachEvidence` require buyer trade approval for all verifier callers, or only for verifier calls in `EvidencePending` state?** The current gate is role-only. Tightening it will break any test or simulation that has verifiers attaching evidence without prior buyer approval.

2. **Should the buyer's scope approval be explicit (`scopeSetHash` in `approveVerifierScope`) or implicit (scoped attestation packet must match buyer's policy hash off-chain)?** Explicit is stronger and auditable. Implicit is more flexible and harder to fake, but requires the buyer agent to hold and assert the policy hash consistently.

3. **Is the `verification_model` field (remote self-reported vs third-party witnessed) worth adding to the packet now, or is it a v0.2 concern?** It names the hardest hidden assumption explicitly and gives buyers a pricing signal for epistemic risk. It also complicates the schema immediately.

4. **Can route proceed without a committed `VerifierScopeAttestation` for trades that are designated as requiring one?** If yes, what is the enforcement mechanism — buyer agent refusal only, or a contract gate? The `requireScopeForRoute` primitive is listed as "can wait," but without it, high-value trade policy is advisory.

---

## What Iris Should Not Infer

1. That the current buyer-approval gate on fingerprint commitment closes the verifier authority laundering problem. It closes one surface and leaves at least three others open.

2. That "verifier is active and buyer-approved" is equivalent to "verifier made a sufficient claim for this buyer." These are the two distinct states Che's concern names. The current implementation collapses them.

3. That the off-chain packet's `display` rules are enforced. They are normative. No mechanism enforces them against agent synthesis outputs.

4. That this pressure-test confirms the spec is ready for alpha. The spec's conceptual design is strong. The implementation boundary does not yet instantiate the containment the spec promises.
