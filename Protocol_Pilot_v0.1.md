# Protocol Pilot v0.1 — First Live Transaction (High-Trust Azuki)

> Status: **active spec** · 2026-06-29 · Claude (surface lane).
> Goal: the smallest *real* end-to-end trade that proves the core loop with a
> high-trust Azuki community member. Howard is the **buyer** for transaction #1.
> Companion to [Protocol_Rundown_v0.2.md](Protocol_Rundown_v0.2.md). **The thin escrow
> contract is Codex's lane** — interface spec'd below is the lane seam.
> **Decisions locked 2026-06-29:** entry at **Stage 1 (testnet escrow)**; **thin pilot
> escrow** (not the full contract); **Arbitrum One / Sepolia + USDC**.

## Thesis
High trust collapses the hard problem. We are **not** testing fraud-resistance; we
are testing whether an honest trade is *better* through Cairn — surfaced, escrowed,
evidenced, accountable — than DMs + PayPal G&S. The judged layer
(verifier/insurance/arbitration machinery) stays **designed and dormant**; trust +
a neutral human arbiter stub it. This is the GPTPRO "low-value, curated = conditionally
viable" lane, with the Azuki circle as the curation. Bonus: every settled trade is a
ground-truth `settled_trade` anchor the judged layer needs to escape cold-start.

## Roles
- **Buyer:** Howard.
- **Seller:** a trusted Azuki community member (TBD).
- **Arbiter:** a **neutral trusted third party — NOT Howard** (he's a party → G5.1
  non-party). Judgment independence shows up for real on trade #1. (TBD; for testnet a
  placeholder address is fine.)
- **Agent (Ledger / Qwen):** assists — surfaces the card, reads photos, renders the
  Glance + the one risk. Not autonomous; humans decide.

## Chain & rail — **Arbitrum One + native USDC** (Sepolia for testnet)
- Azuki/Anime ecosystem's mature home (ANIME token lives on Arbitrum One; community
  holds wallets + funds there); **native Circle USDC** = a stable escrow unit (escrow
  must hold the card's value steady while it ships; a volatile gas token is the wrong
  thing to lock); best tooling (Foundry, Privy, Arbiscan); cheap gas.
- **AnimeChain (L3)** is the most Azuki-native (ANIME gas, gasless UX) but early
  (testnet chain 6900, no confirmed mainnet stablecoin rail) → **graduation target.**
- Buyers may *source* from ANIME (swap → USDC); escrow holds USDC.
- Testnet: **Arbitrum Sepolia + test USDC**. Wallets: Privy embedded, Arbitrum-configured.

## The trade loop (states · who acts)
1. **Intent** — Howard names the card, or the agent surfaces it from seller inventory.
2. **Listing / Offer** — seller lists card + condition claim + price + ships-from. **Terms lock.**
3. **Evidence** — seller photographs via the import flow → vision read + high-res
   inspection capture + condition claim recorded. Buyer sees the **Glance**.
4. **Decide + Fund** — Howard reviews the Glance → **Decide** screen → authorizes **USDC
   into escrow** (Privy). → **Funded**.
5. **Ship** — seller ships, enters tracking → continuity packet. → **Shipped**.
6. **Receive** — buyer confirms receipt (**not a seller click** — C-02), or a
   shipped-timeout opens it. → **InspectionOpen**.
7. **Accept** — Howard inspects (optionally photographs for the record) and **explicitly
   accepts** → escrow releases USDC to seller → **Settled**. (Inspection-window timeout
   ⇒ deemed-accept release to seller — post-handoff timeout favors settlement, never a
   silent refund — C-03.)
8. **Dispute** (condition disagreement is the realistic case) — Howard disputes within
   the window → the evidence record goes to the **neutral arbiter** → ruling → escrow
   follows (seller / buyer-with-return-custody / split).

## Thin Pilot Escrow — contract interface (the lane seam Codex builds to)
USDC-denominated · value-capped · neutral-arbiter · no single-witness release · no
buyer-favoring auto-remedy post-handoff. Carries the four GPTPRO repairs natively
(A1 cap, C-02 no single-witness delivery, C-03 settlement-favoring timeout, plus
G5.1 non-party arbiter).

**States:** `None → Funded → Shipped → InspectionOpen → Settled` · branch
`InspectionOpen → Disputed → Resolved{Settled | Refunded | Split}` · `Cancelled`.

**Deploy config:** `constructor(usdc, valueCap, shippedTimeout)` sets the USDC token,
hard value cap, and shipped-timeout fallback. Stage-1 Arbitrum Sepolia target:
Circle test USDC `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`, conservative pilot
cap, and a shipping timeout long enough for a real card handoff.

**Functions**
- `createTrade(seller, arbiter, usdcAmount, cardRefHash, termsHash, inspectionWindow)`
  — buyer calls; pulls USDC via `transferFrom`. Requires `usdcAmount <= VALUE_CAP`,
  `arbiter != buyer && arbiter != seller` (G5.1). → **Funded**. Returns `tradeId`.
- `markShipped(tradeId, trackingHash)` — seller only. → **Shipped**.
- `confirmReceived(tradeId)` — **buyer** only (not seller — C-02). → **InspectionOpen**,
  starts the inspection clock. Fallback: `openInspection(tradeId)` callable by anyone
  after a `shippedTimeout` so a non-responsive buyer can't stall forever.
- `accept(tradeId)` — buyer, in InspectionOpen → transfer USDC to seller → **Settled**.
  Fallback: `settleByTimeout(tradeId)` callable by anyone after `inspectionWindow`
  elapses → release to seller (deemed-accept; C-03 — never a silent refund post-handoff).
- `dispute(tradeId, reasonHash)` — buyer, in InspectionOpen → **Disputed**.
- `resolve(tradeId, outcome, splitBps)` — **arbiter only**. `outcome ∈
  {SELLER, BUYER, SPLIT}`. SELLER → seller; BUYER → buyer **iff** return custody
  confirmed; SPLIT → split by bps where `splitBps` is the buyer-refund bps (buyer's
  card-return portion gated on return custody). → **Resolved**.
- `confirmReturnCustody(tradeId)` — seller (or arbiter attest) — enables the
  BUYER/SPLIT refund leg.
- `cancelBeforeShip(tradeId)` — buyer before `Shipped` (or mutual) → refund buyer →
  **Cancelled**.

**Invariants**
- USDC leaves to **seller** only via `accept` / `settleByTimeout` / arbiter-`SELLER`.
- USDC returns to **buyer** only via `cancelBeforeShip` / arbiter-`BUYER|SPLIT` **with
  return custody confirmed**.
- No single party both triggers handoff *and* releases (seller ships, buyer accepts,
  non-party arbiter rules).
- `VALUE_CAP` enforced on create; checks-effects-interactions / reentrancy-safe; every
  transition emits an event (`TradeCreated, Shipped, InspectionOpened, Accepted,
  Disputed, Resolved, Refunded, Cancelled`) for the UI.

The full `MarketplaceEscrow` (4-contract spine, adversarial gates) is the **Stage 3+
graduation target**, not the pilot vehicle.

## Built vs to-build
**Have:** catalog + binder + browse (Ledger); photo import + vision read + high-res
capture; Privy auth/wallets; the no-overclaim discipline + the Glance.

**To build — surface (Claude):**
- Transaction surface: offer/terms → Decide/Fund → status tracker
  (Funded→Shipped→InspectionOpen→Settled) → dispute.
- Wallet/USDC wiring: Privy → approve USDC → `createTrade` on Arbitrum Sepolia.
- Evidence-into-trade: seller photos + buyer inspection photos bound to the trade
  (reuses the import flow + R2).
- Dispute → arbiter view: the evidence packet to the neutral arbiter.

**To build — backbone (Codex):**
- The thin pilot escrow contract (above interface) + forge tests (incl. the four
  repairs + G5.1) + deploy to **Arbitrum Sepolia**, then **Arbitrum One**. Publish the
  deployed address + ABI back via SYNC.

## Staging
- ~~Stage 0 — witnessed, no escrow~~ **(skipped — going straight to testnet).**
- **Stage 1 — Testnet escrow (now):** thin escrow on Arbitrum Sepolia, test USDC, real
  card shipped, neutral arbiter. De-risks the money mechanics + the contract.
- **Stage 2 — First REAL transaction (milestone):** Arbitrum One, real USDC, hard-capped
  low value, Howard buyer, trusted seller, neutral arbiter, return-custody-on-dispute.
- **Stage 3 — Widen** the circle + raise caps; settled trades seed the
  calibration / Catalog-Evidence anchors; the dormant judged layer starts to wake.

## Success criteria (trade #1)
- Loop completes (intent → escrow → ship → accept → settle) with **no funds lost to a
  bug** (the cardinal safety bar).
- The Glance gave Howard enough to decide; interruptions only at Decide + Accept.
- The evidence record is rich enough to arbitrate a hypothetical condition dispute.
- Produces the first `settled_trade` anchor + first calibration datapoint.

## Boundaries (disclose, even to friends)
- Cairn **witnesses + escrows + makes the trade accountable**; it does **not** verify
  authenticity or condition (permanent gaps).
- **Shipping loss/damage is uninsured in v1** (G3) — disclose.
- The realistic dispute is **condition disagreement**, not fraud — that's what the
  evidence + arbiter are tested on.
- Alpha; the neutral human arbiter + return-custody are the backstop.

## Open items (people-choices, not blockers)
- Neutral **arbiter** for trade #1 (not Howard — G5.1). Testnet: placeholder ok.
- First **card + seller** (low value, easily identified by both).
