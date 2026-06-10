# Fraudulent Seller Drill: 20260519T003004Z

## Goal

Try to break the protocol from the seller side: fake evidence, weak bonds,
route stalling, false delivery, and claim games.

## Result

The first real break was route timing. A seller could commit a route and then
stall before delivery, leaving the buyer unable to open a normal claim because
the inspection window had not started. That is now hardened in the local EVM
core with a native route-timeout claim gate.

## Attack Matrix

| Seller attack | Current result | Notes |
| --- | --- | --- |
| Post less than the required seller bond | Blocked | `WrongBondAmount` reverts. |
| Use the wrong signature for a packet | Blocked | Registry signature recovery rejects the packet. |
| Reuse the same packet hash inside one trade | Blocked | Per-trade packet replay protection rejects it. |
| Mutate the route after route lock | Blocked | Route can be committed only from `EvidencePending`. |
| Commit route, then never ship | Hardened | Buyer can now open `openRouteClaimAfterTimeout` before inspection exists. |
| Claim delivery with no delivery packet | Hardened | `markDelivered` now requires a signed delivery evidence hash. |
| Claim delivery with seller-signed false evidence | Not fully solved | The seller is accountable, but buyer agent monitoring and arbitration still carry the truth judgment. |
| Put fake content inside a signed evidence packet | Not solvable on-chain | This belongs to verifier, arbiter, trust source, and agent scrutiny. |
| Double-sell the same unique card across trades | Still open | Needs inventory-lock semantics across trades, likely seller-signed item lock plus uniqueness registry or verifier-backed inventory attestation. |

## EVM Checks Run

- `forge test -vv`: 42 passed, 0 failed.
- `python3 script/protocol_e2e.py --port 18545`: 3 local scenarios settled.
- `python3 script/replay_agent_sim_trades.py --source-run /Users/che/Marketplace/runs/agent_market_20260518T194505Z --port 18546`: 10 varied simulation trades settled.

## New Hardening

- `markDelivered` now anchors a signed delivery evidence packet before opening inspection.
- `openRouteClaimAfterTimeout` lets the buyer move stalled route claims into arbiter resolution.
- Route-timeout claims can refund escrow, penalize seller bond, and return the buyer dispute bond through the existing `resolveClaim` path.

## Next Fraud Target

Inventory uniqueness is the next clean break attempt. For TCG, this probably
means an `InventoryLock` packet that identifies a specific card or lot, plus a
global or verifier-scoped rule that prevents the same unique lock from backing
two active escrow trades at once.
