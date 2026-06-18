# Protocol Payment and Custody v0.1

Generated 2026-06-16.

The settlement layer: how value moves, how the physical asset is held, and how a
trade clears. The thesis in one line: **keep the money programmable and the
custody distributed**, so the protocol can enforce a trade without becoming a
bank or a warehouse — the two centralized middlemen the project exists to delete.

This concretizes the payment rail the on-chain spine assumes, names the custody
model (a network of well-regarded card shops, not one vault), and makes atomic
swap a first-class settlement because this is a *trading* card game.

## Principles

```text
1. Programmable money, flexible payment. Settlement is on-chain — a stablecoin
   the contract escrows, releases, and slashes. The rail the user touches can be
   anything (card, bank, wallet, cash, another card). Pay how you like; enforce
   on-chain.
2. The contract holds, not a company. Escrow is non-custodial: funds sit in the
   contract, not a Cairn account. This is WHY stablecoin is the default — it is
   the only rail that gives bank-grade escrow with no bank — not crypto ideology.
3. Custody is distributed, not central. The vault is a network of well-regarded
   local card shops, not one warehouse. Trust is imported (the shop's standing);
   accountability is added (bond, attestation, calibration, on-chain record).
4. Rail and custody are decided at formation. Both are agreed by the parties,
   hashed into the trade, and the protection each choice buys is labeled
   enforced / legible / judged. The choice is legible; so is its consequence.
5. Trading is native. Atomic swap (card-for-card, plus a cash delta) is a
   first-class settlement, not a special case. It is in the name of the hobby.
6. Accountable, not impossible. Distributing custody and abstracting the rail
   does not remove the physical gaps; it prices, bonds, and makes them legible.
```

## Payment: the rail trichotomy

The enforced / legible / judged distinction, applied to money:

| rail | mode | what it buys | cost / caveat |
|---|---|---|---|
| stablecoin (on-chain) | **enforced** | contract escrows, releases, slashes; full protection; non-custodial | the strong default |
| card / bank, on-ramped to stablecoin | **enforced** (underneath) | fiat feel, programmable money in escrow | conversion edge + a trusted on-ramp + KYC |
| off-chain fiat / cash / Zelle | **legible** | recorded, not held; no escrow | for a counterparty you already trust, or low value (the prior-trust move) |
| barter / handshake | **judged** | value and done-ness are human calls | see Swap, below |

```text
Decided at formation, protection labeled. NEVER imply off-chain money is escrowed
— "Cairn holds it" is true only for the on-chain rail.
```

### The invisible-money stack (integrate, do not invent)

Making the programmable money invisible is solved infrastructure, proven in
production by hybrid tokenization marketplaces (e.g. Courtyard). The class of
component, not a vendor lock:

```text
- embedded self-custodial wallet, provisioned from an email/Google login, no seed
  phrase (Privy-class)
- fiat -> on-chain checkout as merchant of record, absorbing fraud / AML / 100%
  chargeback (thirdweb-class)
- gasless relaying: the network fee is sponsored, so a card buyer never holds a
  native token (Gelato-class)
- shared-liquidity order routing across venues (Reservoir-class)
```

Crypto-grade enforcement, fiat-grade feel. The collector pays "$6,400"; the
contract receives programmable money.

### Honesty residuals (disclose, do not hide)

```text
- The stablecoin is itself a trust import. A dollar in escrow is only as good as
  its issuer, a centralized party that can freeze or de-peg. We decentralized the
  escrow, not the unit of account.
- The on-ramp is a trusted node and a KYC surface — a little of the centralization
  we removed from the middle, reintroduced at the edge.
- Cards carry chargeback risk (a buyer can reverse after delivery). A merchant-of-
  record absorbs it on the fiat rail; on the seller side this is another reason
  the strong default is the stablecoin, where reversal is impossible.
```

## Custody: the distributed vault (a network of well-regarded shops)

The vault is **not one warehouse.** It is a network of well-regarded local card
shops, each node doing three jobs at once:

```text
custody       it holds the card
verification  it inspects the card in hand (the verifier role)
locality      it is already where collectors are, with its own customer base
```

One recruit, three functions — so **recruiting the shops is not a step toward
launch; it is the launch** (the bootstrap wedge the project has circled since the
beginning).

### Trust imported, accountability added

A well-regarded shop already holds the things a faceless warehouse must earn from
zero: community standing, a safe, insurance, years of receipts. Cairn does not
rebuild that — it **borrows the reputation and bolts on the accountability:** the
bond, the custody attestation, the calibration record, the on-chain trail.

```text
Not "trust this warehouse because Brink's." Instead:
"trust this shop, which the community already trusts — now bonded and on the record."
Reputation you import; accountability you add.
```

### The custody attestation is the binding

```text
- A shop signing "I hold card X, bound to token X" is what makes the token<->atoms
  link LEGIBLE (the G1 binding gap) instead of a black box; the bond makes a false
  attestation cost something.
- A handoff between two shops is an attested, signed leg — which TIGHTENS the G3
  continuity gap: a witnessed handoff beats an anonymous carrier.
- The guarantee is distributed: bond + the shop's insurance + reputation +
  calibration score = the backing, with NO single guarantor.
```

### Curated seed, calibrated expansion

```text
- "Well-regarded" means the first nodes are hand-picked, vetted, and bonded — a
  few markets to start (US metros + Japan for vintage Pokémon).
- The network opens up through the calibration loop: a new shop earns standing on
  the record before it is trusted with grails. Curated -> calibrated, never
  permissionless-from-day-one for high value.
```

### Where the card lives is part of the cost field

The custody mode is chosen per trade, the same way price and verification are:

```text
- a vault node (a shop)   opt in for maximum liquidity (tokenized, vault-to-vault)
- your local shop holds it distributed custody, in-hand verification nearby
- you keep it             route / verify on demand; or trade it in person
- the show floor          custody never leaves your hands at all
```

### Divergence from the central-vault model

Same tokenized liquidity as a central-vault marketplace (a custodied card trades
as a token, instantly); opposite custody philosophy.

```text
central vault (Courtyard/Brink's, PWCC)  one warehouse; trust concentrated; one
                                         tower to fail, capture, or rent-seek
shop network (Cairn)                     known, bonded, calibrated nodes; trust
                                         distributed; one shop failing != failure
```

This is not *trustless* custody. It is **distributed, bonded, reputation-backed,
legible** custody — trusting known, accountable, plural shops instead of one
warehouse you cannot see into.

## Swap: trading is native

Atomic swap is first-class. The protocol holds **both** assets and releases both
in the same instant, or returns both — so there is no *"you go first."* It is
symmetric escrow: each side is buyer and seller at once.

```text
- multi-asset atomic settlement: card + card + a stablecoin delta, one bundle.
- the swap solves COUNTERPARTY DEFAULT (who ships first), the thing that killed
  online trading and flattened it into sell-for-cash. It does NOT authenticate
  either card — a swap leans on the verifier market TWICE.
```

Three modes:

```text
vault-to-vault   both cards tokenized/custodied at shops -> instant on-chain
                 transfer; nothing physically ships. The magic demo.
physical         route both through verification (the shop loop, doubled), hold
                 both, atomic release.
in person (show) the sensor and continuity gaps collapse (both parties holding the
                 cards, instant witnessed handoff); the protocol handles the only
                 thing left — the atomic exchange and the record. A five-figure
                 trade at a folding table, on the record, nobody mailing anything.
```

Matching is the agentic unlock: money-markets express only "buy" and "sell." The
agent matches **haves / have-extras** against everyone's **wants** and finds the
swap — including multi-party cycles (A->B->C->A) no single sale could close. The
Collector Aperture's want / have / have-extra / want-more stances were built for
exactly this; we had been pointing them only at buying.

## No-overclaim

```text
- "the contract holds the escrow" — only for the on-chain/stablecoin rail; an
  off-chain payment is recorded, not held.
- "the shop holds your card, bonded and attested" — not "the protocol guarantees
  your card is safe." Custody trust is distributed and bonded, not eliminated.
- "atomic swap means nobody runs off with both" — not "both cards are authentic."
- the stablecoin unit of account is a centralized issuer; say so.
```

## Relationship to the rest

```text
- Custody nodes ARE the verifier nodes of the two-sided judgment market
  (Protocol_Arbitration): the same shops verify and hold.
- Rail and custody are decided at formation and labeled enforced/legible/judged —
  the Human Surface trichotomy and the cost field, applied to money and to where
  the card lives.
- The custody attestation addresses the G1 (binding) and G3 (continuity) gaps by
  distributing and making them legible, not collapsing them under one custodian.
- This is the bootstrap wedge: a curated set of well-regarded shops delivers
  custody + verification + distribution + the supply side in one move.
- A custodied card is a tokenized, portable, owned record tied to the wallet — the
  inventory/"open record" pillar.
```

## Open questions

```text
- The shop onboarding bar: what makes a shop "well-regarded" enough to hold grails
  — years in business, receipts, insurance minimums, initial bond size, references
  — and the exact curated -> calibrated path.
- Vault-to-vault settlement choreography between two shops: custody handoff +
  token transfer, and who bears in-transit risk if a physical move is later needed.
- Insurance layering: per-shop policy vs a network policy vs the bond, and the cap
  relative to a grail's value.
- Chargeback exposure and window on the fiat rail: merchant-of-record vs other.
- The unit-of-account residual: a path to more neutral units later, or accept
  "decentralized escrow, centralized dollar" as a disclosed footnote.
- Open liquidity vs protocol accountability: a record open to read, but the
  escrow/verification/arbitration protections only inside the accountable flow.
  Open data, gated guarantees.
- Tax treatment of barter swaps is jurisdiction-dependent; surface, never advise.
```
