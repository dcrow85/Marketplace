# Protocol Audit Brief: Typed Spendability Digest v0.1

Generated 2026-06-11.

Execution brief for the hybrid remediation chosen for findings AUD-D1D2-001
(cross-trade spendability replay depends on off-chain digest) and the
spendability half of AUD-D2-SW-001 / AUD-D2-SW-002 (route and delivery
spendability are caller-chosen opaque hashes). Written for an agent session with
no prior context; read it standalone.

## Decision Being Implemented

The project chose the **hybrid** path:

```text
- Make the spendability hash a contract-derived typed digest bound to trade,
  gate, leg, and the artifacts it authorizes. This closes the spendability
  half of the stitched-witness bypass and the cross-trade replay gap in one
  change.
- Leave wall-bundle and assembly-history graph coherence as an explicitly
  documented off-chain dependency (do NOT push the full assembly graph
  on-chain).
- The docs have already been de-overclaimed to match current behavior. This
  brief is the contract change that makes the spendability artifact enforced.
```

## What "typed spendability digest" means

Today the contract accepts an opaque caller-supplied `bytes32 spendabilityHash`
and only checks it is nonzero and not already consumed for this trade. Replace
that with a digest the contract can recompute, so a seller cannot supply an
arbitrary or cross-context capability.

Design target (adapt names to the codebase):

```text
spendabilityDigest = keccak256(abi.encode(
  SPENDABILITY_TYPEHASH,
  address(this),
  block.chainid,
  tradeId,
  gateHash,              // ROUTE_COMMITMENT_GATE or DELIVERY_CONFIRMATION_GATE
  leg,                   // distinguishes route vs delivery vs future legs
  boundArtifactsHash,    // e.g. keccak of (wallBundleHash, assemblyHistoryHash)
                         //   for the route gate; route/delivery hash for delivery
  issuer,                // the actor authorized to mint this capability
  expiry                 // optional; if added, enforce block.timestamp <= expiry
))
```

The contract should derive the expected digest and require the supplied
spendability hash to equal it, the same pattern already used by
`routeAssemblyWitnessHash` and `deliveryWitnessHash`. After this change, an
attacker cannot reuse one opaque hash across trades or stitch an unrelated
capability, because a capability for trade A / gate X / artifacts Y simply does
not hash to a valid digest for trade B / gate Z / artifacts W.

## Scope Boundaries (do not exceed)

```text
- Do NOT derive or validate the wall-bundle or assembly-history graph contents.
  Their coherence remains an off-chain dependency by design. The digest BINDS
  their hashes; it does not verify what they contain.
- Do NOT change inspection, claim, settlement, or bond logic.
- Keep the existing consumed-hash replay storage; the typed digest is in
  addition to replay protection, not a replacement. (A global nullifier alone
  does not help: an attacker mints a fresh opaque hash per trade unless the
  preimage is constrained. The typed digest constrains the preimage.)
```

## Required Tests (standing guards, in chain/test/, not an isolated run dir)

The Domain 2 audit tests currently live in a run-dir foundry project and do not
run in the main suite. Put these in `chain/test/MarketplaceEscrow.t.sol` so they
are permanent regression guards:

```text
1. Positive: a correctly typed spendability digest for this trade/gate/leg/
   artifacts locks the route and opens delivery as before.
2. Negative (closes AUD-D2-SW-001 spendability half): a caller-chosen opaque
   spendability hash that is NOT the typed digest now REVERTS at commitRoute.
3. Negative (closes AUD-D1D2-001): a digest valid for trade A reverts when
   presented in trade B, by construction, without relying on consumed-hash
   storage.
4. Negative (delivery, closes AUD-D2-SW-002 spendability half): an arbitrary
   delivery spendability hash now reverts at markDelivered.
5. Re-run the stitched-witness route case from
   runs/domain2_stitched_witness_20260611T142852Z with the opaque spendability
   hash: it must now FAIL to lock the route (the bypass is closed for the
   spendability artifact).
```

Acceptance: the stitched-witness route bypass no longer reaches `RouteLocked`
through an arbitrary spendability hash. The wall-bundle/assembly-history
artifacts may still be caller-supplied (that is the documented off-chain
dependency); only the spendability capability becomes contract-enforced.

## Rules

```text
- Frozen-contract discipline does not apply here: this IS the contract change.
  But make it a single, clearly labeled commit; do not fold unrelated edits in.
- Do not weaken any existing test to make the new path pass. If an existing
  test encoded the old opaque behavior, update it and say so explicitly.
- Run the full suite. Report the pass count before and after.
- forge fmt --check only the files you touch; do not mass-reformat the suite.
```

## Findings This Closes (update dispositions on landing)

```text
- AUD-D1D2-001: deferred_with_owner_and_trigger -> fixed_in_code
- AUD-D2-SW-001 (spendability half): documented_residual_risk -> fixed_in_code
- AUD-D2-SW-002 (spendability half): documented_residual_risk -> fixed_in_code
- AUD-D2-SW-001/002 (wall-bundle + assembly-history coherence): remains
  documented_residual_risk (off-chain dependency by design).
- AUD-D2-SW-003 (dead RouteWallBundleMismatch error): unchanged here; either
  wire a real check later or delete the dead error. Still deferred_with_owner.
```

## Handback

Report: the new test names, before/after suite pass counts, the one-line
confirmation that the stitched-witness spendability bypass is closed, and the
updated disposition lines. A reviewer (the chair that designed this brief) will
re-run the stitched-witness case independently to confirm the bypass is closed
before flipping any disposition to `fixed_in_code`.
