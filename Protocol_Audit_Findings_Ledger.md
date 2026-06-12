# Protocol Audit Findings Ledger v0.1

Last updated: 2026-06-12.

This ledger records current dispositions for audit findings. Per-run registers
remain historical artifacts and should not be silently rewritten after review;
this file is the current-state pointer.

## Current Dispositions

| Finding | Source register | Current disposition | Current status |
|---|---|---|---|
| AUD-D1D2-001 | `Protocol_Audit_Execution_Domain1_2_v0.1.md` | `fixed_in_code` | Route and delivery spendability are now contract-derived typed digests bound to contract, chain, trade, gate, leg, artifact hashes, and issuer. Cross-trade replay no longer depends on off-chain digest discipline. |
| AUD-D1D2-002 | `Protocol_Audit_Execution_Domain1_2_v0.1.md` | `converted_to_test` | Deprecated delivery ABI fails closed; guarded by `testOldDeliverySpendabilityAbiRequiresWitness`. |
| AUD-D1D2-003 | `Protocol_Audit_Execution_Domain1_2_v0.1.md` | `converted_to_test` | Cross-trade route assembly witness substitution reverts; guarded by `testAuditRouteRejectsCrossTradeAssemblyWitness`. |
| AUD-D1D2-004 | `Protocol_Audit_Execution_Domain1_2_v0.1.md` | `converted_to_test` | Same-trade cross-gate spendability movement reverts via typed digest mismatch; guarded by `testAuditSameTradeSpendabilityCannotMoveAcrossGates`. |
| AUD-D2-SW-001 | `runs/domain2_stitched_witness_20260611T142852Z/Protocol_Audit_Execution_Domain2_StitchedWitness_v0.1.md` | split: spendability half `fixed_in_code`; wall-bundle / assembly-history graph coherence `documented_residual_risk` | Opaque caller-chosen route spendability now reverts through `SpendabilityDigestMismatch`; guarded by `testAuditStitchedWitnessOpaqueRouteSpendabilityNowReverts`. The contract still binds but does not inspect wall-bundle or assembly-history graph contents. |
| AUD-D2-SW-002 | `runs/domain2_stitched_witness_20260611T142852Z/Protocol_Audit_Execution_Domain2_StitchedWitness_v0.1.md` | split: spendability half `fixed_in_code`; delivery evidence / route graph coherence `documented_residual_risk` | Opaque caller-chosen delivery spendability now reverts through `SpendabilityDigestMismatch`; guarded by `testAuditDeliveryRejectsOpaqueSpendabilityDigest`. The contract still does not judge physical delivery truth or evidence coherence. |
| AUD-D2-SW-003 | `runs/domain2_stitched_witness_20260611T142852Z/Protocol_Audit_Execution_Domain2_StitchedWitness_v0.1.md` | `fixed_in_code` | Declared-but-unused `RouteWallBundleMismatch` error removed from the ABI. Wall-bundle coherence remains off-chain by design; the contract binds the submitted wall-bundle hash but does not derive or judge graph coherence. |
| AUD-D9-001 | `Protocol_Audit_Execution_Domain9_v0.1.md` | `fixed_in_docs_for_doc_drift` | Six prose passages (full spec ×4, walls, boundaries) still described cross-trade spendability replay as an off-chain dependency after the typed digest landed on-chain, contradicting the ledger and Agent API. Corrected to the landed state. |
| AUD-D7-001 | `Protocol_Audit_Execution_Domain7_v0.1.md` | `fixed_in_code` | Energy-caveat poison via a scalar `no_rarity_target` (vs the previously-covered `{from,to}` dict) now flags and holds at flag. Guarded by `scalar_energy_poison_held_at_flag`. Reviewer-verified: drill passes, fix is general (scalar + dict both flagged). |
| AUD-D7-002 | `Protocol_Audit_Execution_Domain7_v0.1.md` | `fixed_in_code` (residual) | Policy-shaped row revisions (agent_decision_profile / evidence-profile fields) now block from fact-catalog hardening via `policy_field_paths`. Guarded by `policy_profile_change_blocked_as_policy_fact`. Residual: the attack path is closed, but row-level policy data still lives structurally inside the hashed fact catalog; full unbundling (moving `agent_decision_profile` into the policy artifact) remains open. |
| AUD-D7-003 | `Protocol_Audit_Execution_Domain7_v0.1.md` | `fixed_in_code` (residual) | Decisive challenges now require a measured `independence_vector_ref`; monoculture/unmeasured challengers no longer carry a decision (poison held at flag, not blocked-by-swarm). Guarded by `monoculture_challengers_do_not_carry_block`. Residual: independence is self-declared, so verifying that an independence claim is genuine remains the open frontier. |
| AUD-D7-004 | `Protocol_Audit_Execution_Domain7_v0.1.md` | `closed_as_false_positive_with_case` | Generated card citations bind `catalog_hash` to current bytes and `row_id` to the returned `card_ref`; no downstream path accepts an arbitrary external citation as validated input. Probe case. |
| AUD-D7-005 | `Protocol_Audit_Execution_Domain7_v0.1.md` | `fixed_in_code` | Cross-set named want ("Team Rocket Pikachu") bound to the Base Pikachu row; now returns `no_in_set_match`. Guarded in the catalog probe. Reviewer-verified. |
| AUD-D7-006 | `Protocol_Audit_Execution_Domain7_v0.1.md` | `fixed_in_code` | Blank `variant_traps` now emits `variant_trap_status: unexamined_or_no_cataloged_trap` rather than an ambiguous empty list. Guarded in the probe. |
| AUD-D7-007 | `Protocol_Audit_Execution_Domain7_v0.1.md` | `closed_as_false_positive_with_case` | Off-set named want ("Japanese Umbreon") already returns `no_in_set_match`; no row binding. Probe case. |
| AUD-D5-001 | `Protocol_Audit_Execution_Domain5_v0.1.md` | `deferred_with_owner_and_trigger` | The exit-scam EV model (`value − bond − acquisition_cost`) omits `cost_to_fake`, the dominant deterrent. It fires `positive_exit_scam_ev` on nearly every value trade and cannot discriminate cheap-to-fake from expensive-to-fake; it misattributes deterrence to the bond. Wire `cost_to_fake` (from the legibility vector) into the EV before the model sets per-tier defaults or is shown to the network. Import-relief cap and positive-EV surfacing verified working. |
| AUD-D6-001 | `Protocol_Audit_Execution_Domain6_v0.1.md` | `fixed_in_code` | `createTrade` now requires a nonzero per-trade `jscHash` plus a registered `floorExecutor`, and `commitRoute` fails closed if judgment supply is absent. The flipped gap demo is now guarded by `testAuditD6TradeCreationRequiresJudgmentSupplyCommitment`; positive JSC-bound settlement/claim resolution is guarded by `testAuditD6TradeWithJudgmentSupplyCanRouteSettleAndResolve`. JSC content remains off-chain by design. |
| AUD-D6-002 | `Protocol_Audit_Execution_Domain6_v0.1.md` | `fixed_in_code` | Revoked-primary/no-proposal claim deadlocks now have a staged timeout path: after the human window, a JSC-bound floor executor can resolve with the same payout bounds; after the floor window, the default unresolvable remedy refunds escrow plus dispute bond to the buyer. Guarded by `testAuditD6RevokedArbiterMidClaimCanReachFloorRulingWithoutProposal`, `testAuditD6RevokedArbiterMidRouteClaimCanReachFloorRuling`, and `testAuditD6DefaultRemedyFiresOnlyAfterFloorWindowExpires`. |
| AUD-D6-003 | `Protocol_Audit_Execution_Domain6_v0.1.md` | `fixed_in_code` | Fingerprint challenges now bind an `allowedResolutionScopeHash`; verifier-attestation clearance reverts unless the attestation `scopeSetHash` matches that challenge scope. Guarded by `testAuditD6NarrowVerifierScopeCannotClearBroaderChallenge` and positive `testAuditD6MatchingVerifierScopeCanClearChallenge`. |
| AUD-D6-004 | `Protocol_Audit_Execution_Domain6_v0.1.md` | `deferred_with_owner_and_trigger` | Registry authority metadata is opaque to escrow; conflict disclosure, fee source, SLA, remedy cap, and fallback are not parsed before arbiter reliance. Guarded by `testAuditD6ConflictedArbiterMetadataIsNotParsedBeforeRuling`; trigger before value-bearing arbitration. |
| AUD-D6-005 | `Protocol_Audit_Execution_Domain6_v0.1.md` | `fixed_in_docs_for_doc_drift` | Full-spec/API wording now names the contract boundary: scope exclusions, conflict disclosure, claim matrix, remedy cap, and bond scope are agent/API-layer obligations unless future escrow code binds them. |
| AUD-D4-001 | `Protocol_Audit_Execution_Domain4_v0.1.md` | `fixed_in_docs_for_doc_drift` | Wall 13's `tool_output_boundary` packet is never emitted; the catalog tools satisfy the boundary via a per-claim enforced/legible/judgment_needed/missing partition + boundary string. Wall 13 now records the per-claim form as equivalent and states the actual invariant. |
| AUD-D4-002 | `Protocol_Audit_Execution_Domain4_v0.1.md` | `deferred_with_owner_and_trigger` | Legibility-cannot-become-spendability holds at contract (no legible field in the ABI), tool (empty `enforced` + boundary), and vector (laundering blocked) layers — but partly by absence: no live path wires a catalog decision / legibility vector into an intent→spendability gate. Re-run Domain 4 when that integration (the "next hardening target") is built. |
| AUD-D3-001 | `Protocol_Audit_Execution_Domain3_8_10_v0.1.md` | `deferred_with_owner_and_trigger` | The gap negative drill exercises 5 of 7 taxonomy gaps; G4 (Identity) and G7 (Time) have no runnable negative case. Add G4/G7 scenarios before the gap taxonomy is presented as complete. Gap-drill honesty and no-oracle-bridge verified PASS. |
| AUD-D8-001 | `Protocol_Audit_Execution_Domain3_8_10_v0.1.md` | `deferred_with_owner_and_trigger` | The `prints_without_rarity_symbol` overlap matrix is doc-only, not wired into the catalog tool's gate; missing-symbol claims rely on 5 hand-flagged Quick Starter rows + the unexamined status, not systematic clearance. Derive `variant_traps` from the matrix before catalog expansion. Off-set/cross-set/non-TCG confusion (carddass/topsun/meiji) verified PASS. |
| AUD-D10-001 | `Protocol_Audit_Execution_Domain3_8_10_v0.1.md` | `deferred_with_owner_and_trigger` | All 11 drills carry adversarial/negative cases (none pass-only); falsifiability table recorded. Two carry self-grading risk — the trader tournament (co-authored expected labels) and seller_bootstrap_drill (thin adversarial coverage). Run an explicit mutation pass on both before citing as network-facing evidence. |

## Standing Guards Added With Typed Spendability

- `testRouteCommitAcceptsTypedSpendabilityDigest`
- `testAuditStitchedWitnessOpaqueRouteSpendabilityNowReverts`
- `testAuditCrossTradeSpendabilityDependsOnTradeBoundDigest`
- `testAuditDeliveryRejectsOpaqueSpendabilityDigest`
- `testAuditSameTradeSpendabilityCannotMoveAcrossGates`

## Residual Boundary

The typed digest makes spendability a real on-chain capability. It does not make
the wall-bundle or assembly-history graph itself a contract-verified object.
Agents may describe those graph contents as legible/off-chain-validated, not as
enforced by the escrow contract.

The spendability digest's issuer is the committing party (`msg.sender`), so the
digest is binding and non-replayable but self-minted: it is not proof that an
independent party authorized the spend. The typehash already carries `issuer`,
leaving room to later require an issuer signature for an independently granted
capability.
