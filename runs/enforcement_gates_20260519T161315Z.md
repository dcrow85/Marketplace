# Enforcement Gates Drill

Generated: 2026-05-19T16:13:15Z

## Goal

Move the `ItemFingerprint` hardening pass from advisory packet language into enforceable route gates.

## Implemented Gates

### 1. InventoryLock binds to ItemFingerprint

`commitInventoryLock` now takes:

```text
tradeId, inventoryLockHash, boundItemFingerprintHash, inventoryLockSignature
```

The contract requires:

- a committed item fingerprint already exists
- `boundItemFingerprintHash == trade.itemFingerprintHash`
- the seller signature is over `inventoryLockBindingHash(tradeId, inventoryLockHash, boundItemFingerprintHash)`

This means the seller cannot reserve inventory with a lock that is cryptographically detached from the object identity already committed for the trade.

### 2. FingerprintChallenge blocks route

The buyer can now open:

```text
openFingerprintChallenge(tradeId, challengeHash, challengeSignature)
```

While the challenge is active, `commitRoute` reverts. The buyer can clear the gate with:

```text
clearFingerprintChallenge(tradeId, resolutionHash, resolutionSignature)
```

This keeps the rich challenge packet off-chain, but gives the route path an on-chain fact it must respect.

### 3. Verifier fingerprint commits are trade-scoped

An active verifier can no longer commit a fingerprint for any trade merely by
being globally registered. The buyer must approve the verifier for the trade
with:

```text
approveFingerprintVerifier(tradeId, verifier, approvalHash, approvalSignature)
```

The verifier still has to be active in the registry when committing.

## Tests Added

- wrong bound fingerprint is rejected
- old unbound inventory-lock signature is rejected
- buyer fingerprint challenge blocks route
- buyer-signed challenge clearance allows route
- challenge before fingerprint is rejected
- seller cannot open a fingerprint challenge
- globally active verifier cannot commit an unapproved trade fingerprint
- buyer-approved verifier can commit a trade fingerprint

## Runs

- Foundry: 54 tests passed
- Local protocol probe: `/Users/che/Marketplace/runs/local_evm_protocol_20260519T161811Z/REPORT.md`
- Ten-trade replay: `/Users/che/Marketplace/runs/agent_market_evm_replay_20260519T161702Z/REPORT.md`

## What Is Still Not Solved

- Active fingerprint collision still means same hash, same time. It does not prove same physical object.
- The first challenge gate is buyer-controlled. Verifier- or arbiter-opened challenge rails still need scope rules.
- The contract still cannot inspect packet schemas, empty fields, image quality, cert custody, or semantic collisions.
- Verifier scope is now enforced for fingerprint commits, but verifier scope attestations still need richer packet semantics.

## Next Gate Candidates

- verifier scope attestation packets, scoped in `/Users/che/Marketplace/runs/verifier_scope_semantics_20260519T162044Z.md`
- minimum semantics for empty `challenge_hooks` and `confidence_scope`
- lot/sealed-product fingerprint coverage rules
- semantic collision simulation set
