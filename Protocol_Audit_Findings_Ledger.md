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
