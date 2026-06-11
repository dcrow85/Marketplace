# Fix Brief: EVM Drills Broken By Typed Spendability v0.1

Generated 2026-06-11. For an agent session with no prior context — read standalone.

## What broke and why

Commit `8c9fe31` made route/delivery spendability a contract-derived typed
digest. `commitRoute` and `markDelivered` now revert with
`SpendabilityDigestMismatch` unless the supplied spendability hash equals the
digest the contract computes. The Solidity tests were updated and pass (81/81),
but the Python EVM drills still build spendability the old way and were NOT
updated. They now revert at `commitRoute`.

Verified broken (reverts at `SpendabilityDigestMismatch`):

```text
python3 chain/script/wall_bundle_route_spendability_drill.py
# RuntimeError ... commitRoute ... execution reverted:
# SpendabilityDigestMismatch(0x42db..., 0xc6f1...)
# (originates in the shared harness chain/script/protocol_e2e.py)
```

This is a mechanical regression, not a security defect. The audit findings stay
correctly dispositioned; this brief restores the off-chain integration layer.

## The fix: ask the contract, don't re-derive

Do NOT re-implement the digest encoding in Python. The contract exposes the
exact derivation as public views — call them via `cast call` and use the
returned value. This is encoding-proof: the contract computes the digest, so it
cannot mismatch itself.

Route (call after item fingerprint AND inventory lock are committed, because the
view reads `trade.itemFingerprintHash` and `trade.inventoryLockHash` from
storage):

```text
cast call <escrow> \
  "routeSpendabilityHash(uint256,bytes32,bytes32,bytes32,address)(bytes32)" \
  <tradeId> <routeHash> <wallBundleHash> <assemblyHistoryHash> <issuer> \
  --rpc-url <rpc>
```

Delivery (call after the route is locked, because the view reads
`trade.routeHash` and `trade.routeAssemblyWitnessHash`):

```text
cast call <escrow> \
  "deliverySpendabilityHash(uint256,bytes32,address)(bytes32)" \
  <tradeId> <deliveryHash> <issuer> --rpc-url <rpc>
```

`issuer` MUST be the address that sends the transaction. `commitRoute` is
`onlySeller` and derives the expected digest with `issuer = msg.sender`, so
`issuer` = the seller key's address used for the `cast send`. Likewise for the
delivery sender. Passing the wrong issuer is the most likely way to re-break it.

Dependency order per trade (the witness binds the spendability, so derive
spendability first):

```text
1. derive routeSpendabilityHash  (view call, issuer = seller)
2. derive routeAssemblyWitnessHash(tradeId, routeHash, <that spendability>, wallBundle, assemblyHistory)
3. commitRoute(..., spendability = step 1, witness = step 2, ...)
```

## Reference formula (only if a view call is impossible)

```text
SPENDABILITY_DIGEST_TYPEHASH = keccak256(
  "SpendabilityDigest(address escrow,uint256 chainId,uint256 tradeId,bytes32 gateHash,bytes32 legHash,bytes32 boundArtifactsHash,address issuer)")

digest = keccak256(abi.encode(
  SPENDABILITY_DIGEST_TYPEHASH, escrow, chainId, tradeId, gateHash, legHash, boundArtifactsHash, issuer))

route boundArtifactsHash   = keccak256(abi.encode(routeHash, wallBundleHash, assemblyHistoryHash, itemFingerprintHash, inventoryLockHash))
delivery boundArtifactsHash= keccak256(abi.encode(routeHash, deliveryHash, routeAssemblyWitnessHash))
```

Gate/leg constants are defined at `chain/src/MarketplaceEscrow.sol:155-162`.
`abi.encode` pads every field to 32 bytes — use `cast abi-encode` + `cast keccak`,
never Python string concatenation or `hashlib`. But prefer the view-call approach
above and avoid this entirely.

## Files to fix

Grep every Python caller of `commitRoute` and `markDelivered` and fix each:

```text
- chain/script/protocol_e2e.py            (shared harness — fix first)
- chain/script/wall_bundle_route_spendability_drill.py
- chain/script/replay_agent_sim_trades.py
- chain/script/alpha_route_commit.py       (and the alpha_active_server path that feeds it — the live demo reverts at route lock until fixed)
- simulations/unified_stress_runner.py     (its --evm-sample replays through the above)
- check: chain/script/spendability_gate_bypass_drill.py, evidence_spendability_drill.py
```

Note on the wall-bundle drill's narrative: its negative cases ("missing/stale
wall bundle blocked before the EVM call") are off-chain validator checks and
should still pass untouched. Only the positive path that actually calls
`commitRoute` needs the derived digest. Reframe any prose that calls spendability
an "off-chain packet citing the wall bundle" — it is now a contract-derived
digest over those artifacts.

## Second task: close the self-minted overclaim gap

`issuer = msg.sender`, so the digest is self-minted by the committing party — it
is binding and non-replayable, but NOT an independent authorization. Add one
clarifying sentence to the "Residual Boundary" section of
`Protocol_Audit_Findings_Ledger.md`:

```text
The spendability digest's issuer is the committing party (msg.sender), so the
digest is binding and non-replayable but self-minted — not proof that an
independent party authorized the spend. The typehash already carries `issuer`,
leaving room to later require an issuer signature for an independently-granted
capability.
```

Do not change any disposition; the dispositions are correct.

## Acceptance criteria

```text
- forge test stays 81 passed, 0 failed (do not weaken any Solidity test).
- Every Python EVM drill that was green before 8c9fe31 is green again. Report
  per-drill pass/fail, explicitly including:
    python3 chain/script/protocol_e2e.py
    python3 chain/script/wall_bundle_route_spendability_drill.py
    python3 chain/script/replay_agent_sim_trades.py --source-run <a recent agent_market run>
    python3 simulations/unified_stress_runner.py --trades 50 --seed 20260611 --evm-sample 5
- Do NOT make a drill pass by deleting its commitRoute/markDelivered path or by
  skipping the EVM step. The route must actually lock.
- One focused commit; do not fold in unrelated formatting churn.
```

## Handback

Report: the per-drill before/after results, the one-line confirmation that the
positive route lock and delivery now succeed with the derived digest, and the
ledger sentence added. The reviewer will independently re-run
`wall_bundle_route_spendability_drill.py` and confirm it reaches route lock
again before this is considered landed.
