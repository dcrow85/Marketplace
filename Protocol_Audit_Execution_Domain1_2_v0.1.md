# Protocol Audit Execution Domain 1-2 v0.1

Generated 2026-06-11.

This is the first execution slice against `Protocol_Audit_v0.1.md`. It covers:

- Domain 1: Contract State Machine Integrity, focused on route/delivery gates.
- Domain 2: Witness and Spendability Layer, focused on replay and substitution.

This is not a full audit. It is a runnable first bite.

## Commands

```text
cd /Users/che/Marketplace/chain
forge test
```

Result:

```text
78 passed; 0 failed; 0 skipped
```

New audit tests added to `chain/test/MarketplaceEscrow.t.sol`:

- `testOldDeliverySpendabilityAbiRequiresWitness`
- `testAuditRouteRejectsCrossTradeAssemblyWitness`
- `testAuditSameTradeSpendabilityCannotMoveAcrossGates`
- `testAuditCrossTradeSpendabilityDependsOnTradeBoundDigest`

## Findings Register

### AUD-D1D2-001

Domain: 1 and 2

Severity: medium

Type: suspected_weakness

Claim under test:

```text
A spendability hash cannot double-spend across two trades or two gates.
```

Attack:

Reuse the same opaque `sharedSpendabilityHash` as route spendability in two
different trades, each with its own route hash, wall bundle hash, assembly
history hash, and contract-derived route assembly witness.

Observed behavior:

The same `sharedSpendabilityHash` can be consumed once in each trade. This is
because `consumedSpendabilityHashes` is scoped by `tradeId`:

```text
mapping(uint256 tradeId => mapping(bytes32 spendabilityHash => bool consumed))
```

The route assembly witness includes the spendability hash, trade id, contract,
chain id, route hash, wall bundle, assembly history, item fingerprint, inventory
lock, and gate. That correctly blocks witness substitution. But the contract
does not parse or derive the spendability hash from a typed preimage. It treats
the spendability hash as an opaque capability supplied by the caller.

Runnable case:

```text
testAuditCrossTradeSpendabilityDependsOnTradeBoundDigest
```

Interpretation:

This is not a proven money-moving bypass if the off-chain spendability digest is
canonical and trade-bound. It is a boundary dependency: cross-trade replay
resistance is enforced by the typed spendability packet preimage and off-chain
validator, not by the contract's consumed-hash storage alone.

Expected behavior or remediation:

Choose one and make it explicit:

1. Document the current boundary:

```text
The contract prevents same-trade spendability reuse. Cross-trade replay
resistance comes from typed spendability digest construction, which must include
trade id, contract, chain id, gate, leg, wall bundle, assembly history, subject,
issuer, schema version, and expiry.
```

2. Harden contract-side:

```text
Add a contract-side typed spendability digest helper or a global nullifier for
consumed capability hashes. If a global nullifier is used, still keep typed
digest fields because a fraudster can always mint a different opaque hash unless
the preimage is constrained.
```

Audit note:

If any protocol doc says "the contract prevents cross-trade spendability
double-spend" without the typed-digest caveat, that doc overclaims.

### AUD-D1D2-002

Domain: 1

Severity: informational

Type: suspected_weakness resolved by runnable check

Claim under test:

```text
Deprecated delivery ABIs cannot open inspection.
```

Attack:

Call the old delivery overload that supplies a delivery hash and spendability
hash but no delivery witness.

Observed behavior:

The pure stub reverts with `DeliveryWitnessRequired`.

Runnable case:

```text
testOldDeliverySpendabilityAbiRequiresWitness
```

Current label:

```text
enforced: deprecated delivery ABI fails closed
```

### AUD-D1D2-003

Domain: 2

Severity: informational

Type: suspected_weakness resolved by runnable check

Claim under test:

```text
Route assembly witnesses cannot be substituted across trades.
```

Attack:

Build a valid-looking route assembly witness for trade 1, then present it in
trade 2 with trade 2's route spendability, wall bundle, and assembly history.

Observed behavior:

The contract derives the expected witness from trade 2's actual stored
fingerprint and inventory lock, then reverts with
`RouteAssemblyWitnessMismatch`.

Runnable case:

```text
testAuditRouteRejectsCrossTradeAssemblyWitness
```

Current label:

```text
enforced: arbitrary cross-trade route witness substitution fails closed
```

### AUD-D1D2-004

Domain: 1 and 2

Severity: informational

Type: suspected_weakness resolved by runnable check

Claim under test:

```text
A route spendability hash cannot be replayed as delivery spendability inside
the same trade.
```

Attack:

Use the consumed route spendability hash as the delivery spendability hash and
provide a delivery witness derived from that same hash.

Observed behavior:

The delivery witness shape can be derived, but `_consumeSpendability` rejects
the hash because it was already consumed for the same trade.

Runnable case:

```text
testAuditSameTradeSpendabilityCannotMoveAcrossGates
```

Current label:

```text
enforced: same-trade cross-gate replay fails closed
```

## Revised Labels From This Slice

| Surface | Current label | Why |
|---|---|---|
| Deprecated route ABIs | enforced fail-closed | Existing tests cover no-spendability, no-wall-bundle, and no-assembly-history overloads. |
| Deprecated delivery ABIs | enforced fail-closed | New test covers the spendability-but-no-witness overload. |
| Route assembly witness substitution | enforced | Contract derives witness from actual trade state, including contract, chain id, trade id, fingerprint, inventory lock, and route gate. |
| Same-trade spendability replay | enforced | `consumedSpendabilityHashes[tradeId][hash]` rejects reuse within a trade, including cross-gate reuse. |
| Cross-trade spendability replay | off-chain typed-digest dependency | Storage is per-trade. The same opaque hash can be consumed in two trades unless the digest preimage itself makes that impossible or meaningless. |

## Dispositions

Assigned against the canonical disposition vocabulary in `Protocol_Audit_v0.1.md`.
A finding with no disposition is still open.

| Finding | Type | Disposition | Note |
|---|---|---|---|
| AUD-D1D2-001 | suspected_weakness | documented_residual_risk + deferred_with_owner_and_trigger | The cross-trade overclaim was removed from the docs, but the underlying contract limitation is real, not mere doc drift. Deferred follow-up: add a typed spendability digest (the route/delivery witness pattern, applied to the spendability hash) so the preimage is trade-bound on-chain. Trigger: before any non-concierge cohort, or before a doc claims contract-level cross-trade replay resistance. A global nullifier alone does not close this — an attacker mints a fresh opaque hash per trade unless the preimage is constrained. |
| AUD-D1D2-002 | suspected_weakness | converted_to_test | Deprecated delivery ABI fails closed; `testOldDeliverySpendabilityAbiRequiresWitness` is now a permanent regression guard. |
| AUD-D1D2-003 | suspected_weakness | converted_to_test | Cross-trade route witness substitution reverts; `testAuditRouteRejectsCrossTradeAssemblyWitness` guards it. |
| AUD-D1D2-004 | suspected_weakness | converted_to_test | Same-trade cross-gate spendability replay reverts; `testAuditSameTradeSpendabilityCannotMoveAcrossGates` guards it. |

Note: AUD-D1D2-001 is deliberately *not* dispositioned `fixed_in_docs_for_doc_drift`.
That label would read as "done" and let the contract-hardening follow-up fall off
the books. It is a documented residual risk with a live deferred fix.

## Next Audit Targets

1. Patch the docs so they do not overclaim contract-level cross-trade
   spendability replay resistance.
2. Add a second execution slice for Domain 7 and 8: catalog poisoning plus the
   new `prints_without_rarity_symbol` overlap matrix.
3. Add a drill-falsifiability table for the drills that already have known
   negative cases.
