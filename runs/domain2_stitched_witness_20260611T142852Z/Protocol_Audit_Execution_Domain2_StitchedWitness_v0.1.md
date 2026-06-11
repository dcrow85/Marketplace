# Domain 2 Stitched-Witness Audit Register v0.1

Run: `domain2_stitched_witness_20260611T142852Z`
Source commit: `e5760faf4da44e99b8662cc7ef77ed45c6aac504`
Brief: `/Users/che/Marketplace/Protocol_Audit_Brief_Domain2_Stitched_Witness_v0.1.md`

## Verification

- Isolated drill: `forge test -vv` from this run directory: 3 passed, 0 failed.
- Repository suite: `cd /Users/che/Marketplace/chain && forge test`: 78 passed, 0 failed.
- Formatting: `forge fmt --check StitchedWitnessAudit.t.sol`: pass. The repository test suite was not mechanically reformatted in this audit run; under the current local `forge fmt`, `chain/test/MarketplaceEscrow.t.sol` would require a broad pre-existing formatting rewrite outside this audit's scope.

## Runnable Cases

- `testAuditRouteAcceptsCallerChosenStitchedAssemblyArtifacts`:
  `/Users/che/Marketplace/runs/domain2_stitched_witness_20260611T142852Z/StitchedWitnessAudit.t.sol:46`
- `testAuditRouteRejectsOnlyIfCallerChosenTupleDoesNotMatchWitness`:
  `/Users/che/Marketplace/runs/domain2_stitched_witness_20260611T142852Z/StitchedWitnessAudit.t.sol:83`
- `testAuditDeliveryAcceptsCallerChosenStitchedSpendability`:
  `/Users/che/Marketplace/runs/domain2_stitched_witness_20260611T142852Z/StitchedWitnessAudit.t.sol:115`

## Findings

### AUD-D2-SW-001

- Domain: Domain 2, route commitment / assembly witness.
- Severity: High.
- Type: `proven_bypass`.
- Claim under test: A route cannot lock unless authorizing artifacts form a genuine, mutually-consistent chain.
- Attack: Seller chooses a fresh route hash, a wall-bundle hash from an unrelated context, an assembly-history hash from a different context, and an opaque spendability hash never minted from this packet; seller then supplies the contract-derived witness over that chosen tuple.
- Observed behavior: `commitRoute` accepts the tuple, consumes the spendability hash, anchors the chosen wall/history hashes, stores the route assembly, and moves the trade to `RouteLocked`.
- Expected behavior: Reject when wall bundle, assembly history, and spendability were not derived from a coherent provenance chain for this trade.
- Evidence: `commitRoute` only requires nonzero wall/history/witness and compares the supplied witness to `routeAssemblyWitnessHash(...)`; see `/Users/che/Marketplace/chain/src/MarketplaceEscrow.sol:806`, `/Users/che/Marketplace/chain/src/MarketplaceEscrow.sol:831`, `/Users/che/Marketplace/chain/src/MarketplaceEscrow.sol:840`, and witness derivation at `/Users/che/Marketplace/chain/src/MarketplaceEscrow.sol:1158`. Proof case at `/Users/che/Marketplace/runs/domain2_stitched_witness_20260611T142852Z/StitchedWitnessAudit.t.sol:46`.
- Runnable case name: `testAuditRouteAcceptsCallerChosenStitchedAssemblyArtifacts`.
- Disposition: `converted_to_test`.
- Verdict: The contract enforces tuple self-consistency, not provenance coherence or spendability minting.

### AUD-D2-SW-002

- Domain: Domain 2, delivery witness / inspection opening.
- Severity: High.
- Type: `proven_bypass`.
- Claim under test: Delivery spendability is inherited through coherent assembly rather than inferred from appearance.
- Attack: After a route is locked, seller chooses an arbitrary delivery hash and an opaque delivery spendability hash from an unrelated context, then supplies the contract-derived delivery witness over that tuple.
- Observed behavior: `markDelivered` accepts the chosen spendability hash, consumes it, anchors the delivery hash, and opens inspection.
- Expected behavior: Reject unless delivery spendability is proven to be minted for the route/delivery/gate from a coherent delivery artifact.
- Evidence: `markDelivered` compares only against `deliveryWitnessHash(...)` and then consumes the supplied spendability hash; see `/Users/che/Marketplace/chain/src/MarketplaceEscrow.sol:885`, `/Users/che/Marketplace/chain/src/MarketplaceEscrow.sol:899`, `/Users/che/Marketplace/chain/src/MarketplaceEscrow.sol:905`, and delivery witness derivation at `/Users/che/Marketplace/chain/src/MarketplaceEscrow.sol:1200`. Proof case at `/Users/che/Marketplace/runs/domain2_stitched_witness_20260611T142852Z/StitchedWitnessAudit.t.sol:115`.
- Runnable case name: `testAuditDeliveryAcceptsCallerChosenStitchedSpendability`.
- Disposition: `converted_to_test`.
- Verdict: Delivery witnessing blocks tuple mutation but does not prove spendability provenance.

### AUD-D2-SW-003

- Domain: Domain 2, wall-bundle mismatch checks.
- Severity: Low.
- Type: `suspected_weakness`.
- Claim under test: Wall-bundle mismatch is contract-detectable.
- Attack: Inspect declared mismatch errors and caller paths for a wall-bundle derivation comparison.
- Observed behavior: `RouteWallBundleMismatch` is declared but no reachable branch throws it; wall bundle is accepted as a caller-supplied hash so long as the route assembly witness is recomputed over that same value.
- Expected behavior: Either remove the dead error or throw it from a reachable check that derives and compares an expected wall-bundle hash.
- Evidence: Error declaration at `/Users/che/Marketplace/chain/src/MarketplaceEscrow.sol:143`; route path checks wall bundle only for nonzero at `/Users/che/Marketplace/chain/src/MarketplaceEscrow.sol:819` and witness equality at `/Users/che/Marketplace/chain/src/MarketplaceEscrow.sol:831`. Repository search found no throw site for `RouteWallBundleMismatch`.
- Runnable case name: Source-citation only.
- Disposition: `deferred_with_owner_and_trigger`.
- Verdict: The declared error overstates a wall-bundle check that is not implemented.

## Label Rows

| Surface | Label | Contract behavior |
| --- | --- | --- |
| Item fingerprint presence and inventory binding | enforced | Route lock requires an inventory lock, and inventory lock is signed over trade/fingerprint binding. |
| Route tuple substitution after witness generation | enforced | Wrong witness for the supplied route/spendability/wall/history tuple reverts. |
| Wall-bundle graph semantics | off-chain dependency | Contract stores a caller-supplied `bytes32`; it does not derive or verify graph contents. |
| Assembly-history graph semantics | off-chain dependency | Contract stores a caller-supplied `bytes32`; it does not derive or verify relation to wall bundle. |
| Route spendability minting / typed preimage | off-chain dependency | Contract consumes an opaque caller-supplied `bytes32` scoped only by trade-local replay storage. |
| Delivery spendability minting / typed preimage | off-chain dependency | Contract consumes an opaque caller-supplied `bytes32` if it is included in the delivery witness tuple. |
| Delivery tuple substitution after witness generation | enforced | Wrong delivery witness for the supplied route/delivery/spendability tuple reverts. |

## Load-Bearing Answer

At the contract layer, spendability is a precise split: item fingerprint and inventory locks are inherited through enforced assembly, witness tuple mutation fails closed, but wall-bundle, assembly-history, route-spendability, and delivery-spendability provenance are inferred from appearance and remain off-chain dependencies.
