# Protocol Audit Findings Ledger v0.1

Last updated: 2026-06-11.

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
