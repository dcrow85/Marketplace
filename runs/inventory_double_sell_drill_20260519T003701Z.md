# Inventory Double-Sell Drill: 20260519T003701Z

## Goal

Try to break the protocol by having one seller use the same unique TCG card as
inventory for two active escrow trades.

## Result

The EVM core now requires a seller-signed `InventoryLock` before route
commitment. The same active inventory lock cannot be committed to a second
trade, so the direct double-sell attempt is blocked before shipping or handoff
can begin.

## Attack Matrix

| Seller attack | Current result | Notes |
| --- | --- | --- |
| Commit route without locking inventory | Blocked | `InventoryLockMissing` reverts. |
| Use the same inventory lock in two active trades | Blocked | `InventoryAlreadyLocked(lock, firstTradeId)` reverts. |
| Reuse the same lock hash inside one trade | Blocked | Per-trade packet replay protection rejects it. |
| Settle a claim and leave the lock stuck forever | Blocked | Settlement releases the active inventory lock. |
| Create two different lock packets for the same physical card | Not fully solved | This is a semantic fraud problem for verifier notes, image evidence, seller reputation, and future item-fingerprint attestations. |
| Sell after a clean settlement using a different lock | Not solved on-chain | The chain cannot know possession after delivery; buyer receipt and seller history need to make that visible. |

## EVM Checks Run

- `forge test -vv`: 45 passed, 0 failed.
- `python3 script/protocol_e2e.py --port 18545`: 3 local scenarios settled with inventory locks.
- `python3 script/replay_agent_sim_trades.py --source-run /Users/che/Marketplace/runs/agent_market_20260518T194505Z --port 18546`: 10 varied simulation trades settled with inventory locks.

## New Hardening

- `commitInventoryLock(tradeId, inventoryLockHash, signature)` is seller-only and requires a valid seller signature.
- `commitRoute` now rejects any trade that has not committed inventory first.
- `activeInventoryLocks[lockHash]` maps each active inventory lock to one trade id.
- Buyer acceptance, auto-settlement, and claim resolution release the active lock.

## Next Fraud Target

The next hard break is semantic duplication: the seller signs two different
inventory-lock packets for the same physical card. A likely next primitive is a
verifier-backed `ItemFingerprint` packet that can bind images, serial/slab
certs, condition markers, timestamps, and seller custody evidence into a
harder-to-duplicate fingerprint without forcing all private inventory data
on-chain.
