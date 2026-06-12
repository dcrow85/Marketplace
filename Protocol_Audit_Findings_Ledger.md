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
| AUD-D7-002 | `Protocol_Audit_Execution_Domain7_v0.1.md` | `fixed_in_code` | Policy-shaped row revisions (agent_decision_profile / evidence-profile fields) block from fact-catalog hardening via `policy_field_paths`, and row-level `agent_decision_profile` is now structurally moved out of `data/no-rarity-base-set.json` into `data/no-rarity-catalog-policy.json`. Guarded by `policy_profile_change_blocked_as_policy_fact`, `catalog_evolution_drill_20260612T172852Z` (`fact_policy_field_paths: []`), and the catalog probe's merged-policy output. |
| AUD-D7-003 | `Protocol_Audit_Execution_Domain7_v0.1.md` | `fixed_in_code` (residual) | Decisive challenges now require a measured `independence_vector_ref`; monoculture/unmeasured challengers no longer carry a decision (poison held at flag, not blocked-by-swarm). Guarded by `monoculture_challengers_do_not_carry_block`. Residual: independence is self-declared, so verifying that an independence claim is genuine remains the open frontier. |
| AUD-D7-004 | `Protocol_Audit_Execution_Domain7_v0.1.md` | `closed_as_false_positive_with_case` | Generated card citations bind `catalog_hash` to current bytes and `row_id` to the returned `card_ref`; no downstream path accepts an arbitrary external citation as validated input. Probe case. |
| AUD-D7-005 | `Protocol_Audit_Execution_Domain7_v0.1.md` | `fixed_in_code` | Cross-set named want ("Team Rocket Pikachu") bound to the Base Pikachu row; now returns `no_in_set_match`. Guarded in the catalog probe. Reviewer-verified. |
| AUD-D7-006 | `Protocol_Audit_Execution_Domain7_v0.1.md` | `fixed_in_code` | Blank `variant_traps` no longer implies clean. The probe now surfaces `uncleared_symbol_overlap` for blank rows with unresolved matrix overlaps, and `cataloged_traps_present` for explicit trap rows. |
| AUD-D7-007 | `Protocol_Audit_Execution_Domain7_v0.1.md` | `closed_as_false_positive_with_case` | Off-set named want ("Japanese Umbreon") already returns `no_in_set_match`; no row binding. Probe case. |
| AUD-D5-001 | `Protocol_Audit_Execution_Domain5_v0.1.md` | `fixed_in_code` | Exit-scam EV now includes conservative `cost_to_fake` floors from the legibility vector band: `value - cost_to_fake_floor - remaining_bond - acquisition_cost`. Guarded by `external_trust_import_drill_20260612T172849Z`: cheap-to-fake high-value case remains positive EV (`940`, flagged) while expensive-to-fake high-value case is negative EV (`-210`, not flagged). |
| AUD-D6-001 | `Protocol_Audit_Execution_Domain6_v0.1.md` | `fixed_in_code` | `createTrade` now requires a nonzero per-trade `jscHash` plus a registered `floorExecutor`, and `commitRoute` fails closed if judgment supply is absent. The flipped gap demo is now guarded by `testAuditD6TradeCreationRequiresJudgmentSupplyCommitment`; positive JSC-bound settlement/claim resolution is guarded by `testAuditD6TradeWithJudgmentSupplyCanRouteSettleAndResolve`. JSC content remains off-chain by design. |
| AUD-D6-002 | `Protocol_Audit_Execution_Domain6_v0.1.md` | `fixed_in_code` | Revoked-primary/no-proposal claim deadlocks now have a staged timeout path: after the human window, a JSC-bound floor executor can resolve with the same payout bounds; after the floor window, the default unresolvable remedy refunds escrow plus dispute bond to the buyer. Guarded by `testAuditD6RevokedArbiterMidClaimCanReachFloorRulingWithoutProposal`, `testAuditD6RevokedArbiterMidRouteClaimCanReachFloorRuling`, and `testAuditD6DefaultRemedyFiresOnlyAfterFloorWindowExpires`. |
| AUD-D6-003 | `Protocol_Audit_Execution_Domain6_v0.1.md` | `fixed_in_code` | Fingerprint challenges now bind an `allowedResolutionScopeHash`; verifier-attestation clearance reverts unless the attestation `scopeSetHash` matches that challenge scope. Guarded by `testAuditD6NarrowVerifierScopeCannotClearBroaderChallenge` and positive `testAuditD6MatchingVerifierScopeCanClearChallenge`. |
| AUD-D6-004 | `Protocol_Audit_Execution_Domain6_v0.1.md` | `deferred_with_owner_and_trigger` | Registry authority metadata is opaque to escrow; conflict disclosure, fee source, SLA, remedy cap, and fallback are not parsed before arbiter reliance. Guarded by `testAuditD6ConflictedArbiterMetadataIsNotParsedBeforeRuling`; trigger before value-bearing arbitration. |
| AUD-D6-005 | `Protocol_Audit_Execution_Domain6_v0.1.md` | `fixed_in_docs_for_doc_drift` | Full-spec/API wording now names the contract boundary: scope exclusions, conflict disclosure, claim matrix, remedy cap, and bond scope are agent/API-layer obligations unless future escrow code binds them. |
| AUD-D4-001 | `Protocol_Audit_Execution_Domain4_v0.1.md` | `fixed_in_docs_for_doc_drift` | Wall 13's `tool_output_boundary` packet is never emitted; the catalog tools satisfy the boundary via a per-claim enforced/legible/judgment_needed/missing partition + boundary string. Wall 13 now records the per-claim form as equivalent and states the actual invariant. |
| AUD-D4-002 | `Protocol_Audit_Execution_Domain4_v0.1.md` | `deferred_with_owner_and_trigger` | Legibility-cannot-become-spendability holds at contract (no legible field in the ABI), tool (empty `enforced` + boundary), and vector (laundering blocked) layers — but partly by absence: no live path wires a catalog decision / legibility vector into an intent→spendability gate. Re-run Domain 4 when that integration (the "next hardening target") is built. |
| AUD-D3-001 | `Protocol_Audit_Execution_Domain3_8_10_v0.1.md` | `fixed_in_code` | The gap negative drill now covers all seven taxonomy gaps. Guarded by `protocol_gap_negative_drill_20260612T172939Z`, which adds G4 (`key_is_not_person`) and G7 (`snapshot_not_process`) hidden-oracle cases while the compliant EVM flows still settle and no packet overclaims authenticity. |
| AUD-D8-001 | `Protocol_Audit_Execution_Domain3_8_10_v0.1.md` | `fixed_in_code` | The `prints_without_rarity_symbol` matrix is now machine-readable at `data/pre-english-symbol-status.json`, pinned in the catalog manifest, and read by `no_rarity_catalog_tools.py` to derive `variant_trap_status`. A blank trap list means cleared only when every overlapping yes/mixed/unverified family is ruled out; otherwise rows surface `uncleared_symbol_overlap`. Guarded by the catalog probe and `catalog_evolution_drill_20260612T172852Z` (`symbol_status_hash` pinned). |
| AUD-D10-001 | `Protocol_Audit_Execution_Domain3_8_10_v0.1.md` | `fixed_in_code` | The trader tournament and seller bootstrap drill now carry explicit mutation proofs. Guarded by `no_rarity_trader_tournament_20260612T172905Z` (`weaken_request_evidence_to_low_friction` fails Charizard evidence-wall cases) and `seller_bootstrap_drill_20260612T172909Z` (`remove_zero_history_low_bond_guard` fails the underpriced-bond adversarial case). Seller bootstrap also adds adversarial expected-fail cases for underpriced zero-history bonds and bond-as-honesty overclaim. |

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
