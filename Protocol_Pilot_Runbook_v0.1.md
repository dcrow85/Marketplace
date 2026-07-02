# Pilot Runbook v0.1 — Trade #1 (Arbitrum Sepolia)

One page: who does what, in what order, with which clicks, and what we check. Everything
here was verified against the LIVE contract and app on 2026-07-02. Spec context:
`Protocol_Pilot_v0.1.md`. This runbook is the carve-out permitted by the judged-layer
spec freeze.

## Hard facts (verified live)
| Thing | Value |
|---|---|
| Escrow | `ThinPilotEscrow` `0x830EEa347efEAf8a929B932057ee88ad0a85343a` (byte-verified vs local build) |
| Chain | Arbitrum Sepolia, id `421614`, RPC `https://sepolia-rollup.arbitrum.io/rpc` |
| USDC | Circle test USDC `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` (6 decimals) |
| Value cap | **200 USDC** (on-chain `VALUE_CAP`) |
| Shipped timeout | **14 days** (`SHIPPED_TIMEOUT` — after this, anyone may open inspection) |
| Inspection window | buyer-chosen at create (UI default 7 days; **use 3 for the pilot**) |
| Surface | https://cairn.cards/app → **Trades** tab (Privy sign-in; Development mode ≤150 users) |
| Record store | `/api/record` (Cloudflare KV): plaintext of terms/tracking/dispute, keccak-verified in the UI |
| `nextTradeId` | `1` at time of writing — this really is trade #1 |

## Cast (Crowley fills the two blanks — the only open blockers)
- **Buyer:** Crowley.
- **Seller:** `________` — a high-trust Azuki holder with a card to sell ≤200 USDC.
- **Arbiter:** `________` — **not buyer, not seller** (G5.1; the contract reverts otherwise).
  Must commit to responding within **48h** if pinged — `Disputed` has **no timeout**; a
  dark arbiter strands the funds permanently. Pick someone reachable.

## Funding (before day 1)
Each of the three signs into cairn.cards/app once (Privy) and shares their wallet
address (shown top-right of the Trades tab).
- **All three:** a little Arbitrum Sepolia ETH for gas (~0.005 is plenty; any Sepolia
  faucet + bridge, or an Arbitrum Sepolia faucet directly).
- **Buyer only:** test USDC from **faucet.circle.com** (select Arbitrum Sepolia) — get
  ≥ the trade amount + 5 for the dispute drill.

## Pre-flight (buyer, 2 min)
1. https://cairn.cards/app loads; sign in.
2. `https://api.cairn.cards/api/health` → `{"qwen": true}`.
3. Trades tab shows "your USDC" balance ≥ trade amount.

## Trade #1 — happy path (suggested amount: **25 USDC**, window **3 days**)
1. **Buyer** · Trades → New trade. Fill: card (e.g. `Penny · AZK01-001`), condition
   claim, amount `25`, seller wallet, arbiter wallet, window `3`. → **Fund escrow**
   (two wallet approvals: USDC approve, then create). Note the trade #.
   *Check:* status pill **Funded**; "the record" panel shows terms **✓ verified**. If it
   says "not on record," the plaintext didn't save — stop and retry before shipping.
2. **Seller** · loads the trade # → enters real tracking # → **Mark shipped**.
   *Check:* pill **Shipped**; record shows tracking ✓. Ship the actual card.
3. **Buyer** · card arrives → **Confirm received** (opens inspection) → inspect against
   the terms in the record → **Looks right — accept**.
   *Check:* pill **Settled**; seller's USDC balance +25. **Done — first settled trade.**

Escape hatches (all enforced on-chain): before ship, buyer *or* seller can **Cancel
(refund)**. If the buyer goes quiet after delivery: anyone can **Open inspection** 14
days after ship, and anyone can **Settle (timeout → seller)** once the window lapses —
silence favors the seller (C-03), so buyers: inspect promptly.

## Dispute drill — trade #2 (5 USDC; do this even though #1 went well)
The pilot's success criterion is "an evidence record rich enough to arbitrate" — prove it
on purpose, cheaply, with no real grievance.
1. Buyer funds a 5-USDC trade (same cast). Seller marks shipped (real or nominal).
2. Buyer: Confirm received → type a real reason ("drill: corner wear not in terms") →
   **Dispute** (must be within the window).
3. **Arbiter** · loads the trade # → reads terms + the dispute reason in "the record"
   (both must show **✓ verified** — this is the point of the drill).
   - To refund the buyer: **seller (or arbiter) first clicks Confirm return custody**
     (the contract refuses buyer-refunds until the card's return is acknowledged), then
     arbiter → **Refund buyer**.
   - Or rule **Release to seller** (no custody step needed).
4. *Check:* pill **Resolved**; funds moved per the ruling.

## What we capture (the pilot's actual deliverable)
- Trade #s, tx hashes (each action links to the explorer), screenshots of "the record"
  showing ✓ verified at each step, and both parties' + arbiter's notes on friction.
- Honest framing throughout: the escrow enforced custody of *funds*; the card's
  condition and authenticity were **judged** by people. A witness, not proof.

## Known limits going in (accepted for trade #1)
- `Disputed` has no timeout → mitigated by arbiter availability commitment + small amounts.
- Inspection window is buyer-set and unbounded → runbook fixes it at 3 days.
- Token-gating & PFP identity are specced, not yet enforced in-app → cast is hand-picked.
- Record store trusts Cloudflare KV for *availability* (integrity is keccak-verified;
  worst case a record reads "not on record," never a forged one).
- Railway still holds a full-scope Cloudflare token (`CAIRN_KV_TOKEN`) — hardening owed
  before any wider cohort.
