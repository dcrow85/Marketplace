# Protocol Human Surface v0.1

> Superseded by `Protocol_Human_Surface_v0.2.md` (2026-06-15), which folds in the
> first design review: ambient cross-trade glance, altitude->visual-register
> mapping, the agent-audit surface, the honest bad-news surface, and aperture
> contradiction/calibration. Kept as historical; read v0.2 for current state.

Generated 2026-06-15.

Lane 3: the product surface that makes the audited protocol usable by a person.
Lane 1 bound the hard spine. Lane 2 measured and falsified the off-chain layer.
The Human Surface decides what a collector actually sees, when they are asked to
decide, and how far they can open the record when they want proof.

This is not another protocol wall. It is the translation layer between:

```text
Collector Aperture  -> what this human wants, will spend, and reserves
Agent Judgment      -> what the agent believes is worth doing next
Protocol Spine      -> what is enforced, anchored, and settled
Custody Ledger      -> what happened and where the gaps remain
Arbitration Floor   -> what happens if the record becomes disputed
```

The governing line:

```text
The human should mostly see the card and the decision.
The protocol should be one gesture away.
```

## Purpose

The product is agent-first, but the human remains the source of desire,
authority, and reserved judgment. The interface must not ask the human to manage
packet schemas, spendability hashes, witness tuples, verifier scopes, or
arbitration ladders. It should show those only when they matter to a decision or
when the human asks to audit the record.

The Human Surface has three jobs:

```text
1. Glance: show the card, price, posture, and agent read without friction.
2. Decide: surface only decisions that spend money, attention, trust, time, or
   rights.
3. Audit: make the underlying record expandable without promoting it into false
   certainty.
```

## Altitudes

Every human-facing element belongs to one of three altitudes. A view may move up
or down, but it must say why.

| altitude | human question | surface shape | examples |
|---|---|---|---|
| Glance | "Do I want this?" / "Where am I?" | card image, short agent read, price/fee/stance, one primary action | mark want, mark have, accept offer, continue hunt |
| Decide | "This has a real cost. Do I authorize it?" | focused choice with named tradeoff | fund want, pay seller attention fee, request more evidence, accept risk, open claim, escalate arbitration |
| Audit | "Show me why." | expandable record, custody ledger, packets, hashes, boundaries | evidence manifest, trust proof chain, spendability/custody ledger, arbitration ruling packet |

Hard rule:

```text
No audit material is allowed to crowd the Glance surface.
No costly decision is allowed to hide inside Glance.
```

## The resting buyer surface

The resting buyer surface is a card-first object, not a dashboard. It shows:

```text
- the best available card image, never covered
- Japanese name first, then romaji and English name when useful
- collector row / set context
- current human stance: want, have, have extra, want more, sell, check
- agent read: one or two lines in human language
- price band or "pricing needs comps"
- fee line, only if meaningful
- current gate: hunting, offer, evidence, funded, route, inspection, claim, settled
- one primary action
```

Everything else is behind "show why" or appears only at a decision point.

Bad resting copy:

```text
The catalog row, scans, nonce, bond, and shop proof are coherent enough to
continue.
```

Good resting copy:

```text
This looks like the right row. I would ask for one fresh photo before money moves.
```

The first sentence is protocol-internal. The second tells a collector what the
agent recommends and what costs attention.

## The stance system

A card can be in more than one human posture. The surface should make the first
mark almost effortless and let the user go deeper only if they choose.

Primary stances:

```text
want        I do not have it and would like one.
have        I have a copy.
have_extra  I have at least one copy I may move.
want_more   I have it but want another or an upgrade.
sell        I am willing to sell this copy.
check       I want help identifying or verifying what I have.
none        not relevant to me.
```

Sequence rule:

```text
The interface replaces choices in one bounded space instead of expanding a form.
Back is always visible. Stopping early is valid.
```

Example sequence:

```text
Want -> condition target -> budget -> risk posture -> fund now or save hunt
Have -> condition guess -> photos now or later -> private or public
Have extra -> sell posture -> public info yes/no -> attention fee preference
Check -> upload/photo -> agent candidate -> evidence needed -> save or discard
```

Each step has a weight. Light steps feel light; costly steps feel heavier.

```text
light:      mark want, save have, browse
medium:     add condition, add photos, publish limited info, ask seller attention
heavy:      fund want, request paid evidence, accept risk, open claim, escalate
```

The surface can use motion, color, pressure, and copy to signal weight, but it
must not become a meter that scores trust. Progress means "you have done enough
for this action," not "this card is safe."

## The agent voice

The agent is not a mascot that explains protocol machinery. It is the translator
between the person's collecting language and the protocol's cost field.

Voice rules:

```text
- Speak like a knowledgeable collector, not a database.
- Prefer "I would..." over abstract verdicts.
- Name costs directly: money, seller attention, buyer attention, time, privacy,
  risk, verifier cost.
- Preserve uncertainty without sounding evasive.
- Use "verified by the protocol" only for contract-enforced facts.
- Use "I think" / "this looks" / "I would ask" for judgment.
```

Agent read template:

```text
What I see:
  <collector-native observation>

What I would do:
  <one recommended next step>

Why:
  <one cost or risk, expandable>
```

Examples:

```text
This is a Quick Starter-sensitive trainer. I would not treat the blank corner as
enough; I want a readable text-layout close-up.

This is probably a light ask. If the seller is known, front/back plus the blank
corner may be enough before you decide.

The seller is new, but the offer can still work. I would ask for a bond or a
fresh possession photo before funding.
```

## Cost legibility

The fee line should explain what the fee buys, not merely what the platform
charges.

Display costs in categories first:

```text
seller attention     extra photos, handling, time, privacy exposure
buyer attention      decisions, review, arrival inspection
agent work           search, comparison, comp gathering, packet assembly
verification         human or model review, cert lookup, specialist opinion
route risk           shipping, insurance, signature, local handoff
capital at risk      escrow, seller bond, buyer dispute bond
arbitration          floor ruling, panel, human arbiter, specialist escalation
```

Only collapse to dollars when a decision requires it.

```text
Glance:  "Low ceremony. No paid evidence yet."
Decide:  "Ask for corner close-ups: seller asks $4, credited if you buy."
Audit:   show the cost packet, policy basis, and who keeps/credits the fee.
```

Rule:

```text
Human attention is the highest-cost resource. Do not spend it to show machinery.
Spend it when a decision can change the trade.
```

## Decision moments

The surface must interrupt for reserved judgments from the Collector Aperture.
Default reserved buyer judgments:

```text
- confirm aperture / hunt mandate
- fund a want or accept an offer
- exceed spend authority
- accept a known residual risk
- waive an evidence floor
- arrival inspection / final accept
- open a claim
- escalate arbitration above the agreed floor
- publicly share private collection or seller info
```

Default delegated actions, if inside aperture:

```text
- search catalog and marketplace sources
- shortlist offers
- ask one low-cost clarification
- reject out-of-scope offers
- assemble evidence packets
- choose default route template
- run floor-arbiter intake
- summarize claim packet
```

The surface should render "why now" for every interruption:

```text
I need you because this spends money.
I need you because this waives an evidence floor.
I need you because arrival acceptance closes the trade.
I need you because escalation costs more than your aperture allowed.
```

## Buyer flow

The minimal buyer path:

```text
1. Express want in natural language or mark a binder row.
2. Agent reflects the aperture: target, budget, risk, interruption rules.
3. Human confirms.
4. Agent hunts and returns candidates.
5. Human sees card-first offer view.
6. Decide: fund / ask evidence / pass / save.
7. Route and delivery run mostly silent.
8. Arrival inspection surfaces as reserved judgment.
9. Human accepts, opens claim, or asks for audit view.
10. Final receipt becomes reusable memory.
```

The funded want should feel simple:

```text
Find me this card in this condition or better for this total or less.
Ask me only if something spends money, waives risk, or needs my eyes.
```

## Seller flow

The minimal seller path:

```text
1. Mark have / have extra / sell on a row or send photos to the agent.
2. Agent identifies candidate row and asks only for missing low-cost facts.
3. Seller chooses private memory or public listing posture.
4. If public: seller chooses what can be shared.
5. Agent prices attention for extra asks if desired.
6. Funded buyer arrives.
7. Seller sees payout, evidence ask, bond, route, and time cost.
8. Seller accepts, counters, asks attention fee, or declines.
9. If accepted, the agent assembles proof and route packets.
10. Final receipt improves future trust.
```

Seller surface copy should respect seller time:

```text
Buyer is funded. This ask needs one fresh photo and insured shipping.
Expected payout after fees: $X. Your bond returns on clean settlement.
```

Never:

```text
Please complete an EvidenceSpendability schema.
```

## Evidence surface

Evidence should be card-native before it is protocol-native.

For TCG alpha:

```text
primary image: full card front
nearby reference: exact-row reference image only, never fallback
secondary views: back, four front corners, four back corners, holo/angle, label/cert
lower-right blank-corner crop for No Rarity
text-layout close-up for Quick Starter-sensitive trainers
```

Display rule:

```text
The card image is never covered. Evidence marks live beside or below it.
```

Evidence states:

```text
missing       needed before this action
provided      seller/buyer supplied it
anchored      packet/hash exists
reviewed      agent/verifier/human judged it
waived        human accepted the gap
```

Do not label evidence as "verified" unless the verifier scope and authority are
shown. Prefer "reviewed by <who> for <scope>."

## Trust surface

Trust is a vector, not a score. The Human Surface can summarize it, but cannot
flatten it into a single authority number.

Human summary:

```text
Strong shop proof, thin protocol history, route looks normal.
```

Expandable vector:

```text
coverage             what proof exists
independence          whether sources share control
continuity            whether the same actor/history appears continuous
scope_fit             whether prior trust matches this trade
cost_to_fake          how expensive the fake path looks
source_calibration    how past outcomes have matched this source
```

Trust source options:

```text
signed shop domain
marketplace account control proof
Google/business listing correlation
prior protocol receipt
human-known dealer note
bond / underwriter
verifier review
arbiter calibration
```

Copy rule:

```text
Trust source says what it supports and what it does not support.
```

Example:

```text
The shop domain matches the seller. That supports current control of the shop
site; it does not prove this card is in hand.
```

## Route and location surface

Location is a cost field, not a fixed requirement.

Offer route options:

```text
ship uninsured
ship insured
signature required
local handoff
show pickup at card show / shop
buyer-arranged carrier
```

Surface the route by tradeoff:

```text
Insured shipping costs more but gives cleaner claim evidence.
Local handoff avoids shipping risk but costs human time and travel.
Uninsured shipping is cheaper but leaves loss mostly as residual risk.
```

Route evidence should be available in audit:

```text
tracking number
carrier
insurance amount
signature requirement
shipping label or receipt
handoff photo / local receipt
non-standard memo or link
```

## Claim surface

Claims are not generic "problem" buttons. They are typed, because each claim
needs different evidence and remedy logic.

Initial claim choices:

```text
wrong item
condition materially worse
not No Rarity / variant concern
damaged in transit
lost / not delivered
empty package
underinsured route
local handoff dispute
buyer changed mind (not covered)
```

The claim surface must immediately show:

```text
- what evidence is needed from the buyer
- whether the claim points at seller, carrier, buyer, or unresolved physical gap
- dispute bond or escalation cost
- inspection deadline
- likely arbitration tier
```

Buyer dispute rule:

```text
Accept is free. Dispute enters the chain.
```

This should be copy, not hidden policy:

```text
To dispute, I need fresh photos of the received card and the package. This gives
the arbiter something to compare; it does not by itself prove who caused the
problem.
```

## Arbitration surface

Arbitration should appear only when there is a claim, an escalation choice, or
the user asks to audit the trade's judgment supply.

Glance:

```text
If this gets stuck, the agreed floor arbiter can rule on the record.
```

Decide:

```text
Escalate to human arbiter? Cost: $X. Use when the floor cannot judge the issue,
or when the value justifies a person.
```

Audit:

```text
JSC hash
floor model / prompt template / input packet hashes
human arbiter policy hash
SLA / remedy cap / conflict disclosure
ruling packet
not_claiming: physical authenticity, condition truth beyond submitted evidence
```

The floor must be described as package judgment:

```text
The floor can rule on completeness, consistency, and comparison. It cannot
authenticate the physical card.
```

## Custody ledger surface

The custody ledger is the audit altitude for process. It should be one gesture
away from every active trade.

It renders:

```text
created
funded
bonded
evidence attached
fingerprint committed
inventory locked
route committed
delivery witnessed
inspection opened
accepted / claim opened
ruling
settled
receipt
```

Every row carries:

```text
enforced | legible | judged
actor
timestamp
hash / packet ref
state transition
not_claiming / boundary when needed
```

The ledger must preserve seams:

```text
ingress: bytes name a claim, not atoms
continuity: route handoff is attested, not proven
egress: final accept is human judgment, not physical truth
identity: key is not person
time: evidence is a snapshot, object is a process
```

## Final receipt

The final receipt is both closure and future trust material.

Human receipt:

```text
You bought <card> from <seller>.
Paid: $X. Fees: $Y. Route: insured/signature.
Accepted: <time>.
Receipt can support future trust, but does not prove authenticity forever.
```

Agent receipt:

```text
trade_id
catalog citation
intent hash
terms hash
jsc hash
evidence manifest refs
route/delivery witnesses
claim/ruling refs if any
settlement tx
not_claiming
calibration hooks
```

The receipt should improve future legibility, never become universal trust.

## No-overclaim rules

Forbidden Human Surface claims:

```text
verified authentic
guaranteed safe
fully protected
trust score
the protocol proved the card
the route proves delivery truth
the shop proof proves possession
the floor arbiter proved authenticity
```

Allowed replacements:

```text
reviewed for this scope
the record is coherent enough to continue
the contract enforced the funding/bond/state transition
the seller provided current-control proof
the route evidence supports an insurance claim
the floor can rule on the packet, not the card's physical truth
```

## MVP scope

Build first:

```text
1. Binder/card row stance marking with one bounded sequence.
2. Buyer funded-want card-first offer view.
3. Seller response view with payout, evidence ask, bond, attention cost.
4. Arrival inspection decide surface.
5. Claim intake with typed claim choices.
6. Custody ledger audit drawer.
7. Final receipt view.
```

Defer:

```text
market-wide reputation score
general physical-goods UI
full governance surface
high-value specialist arbitration marketplace
production ZK privacy view
```

## Product success criteria

The Human Surface works when:

```text
- a collector can mark want/have/sell in seconds
- a buyer can understand an offer without learning protocol terms
- a seller can see why the ask is worth their time
- a funded trade can move with only meaningful interruptions
- every costly action has a clear reason
- every protocol claim can be expanded into the audit record
- no screen implies the contract proved more than it did
```

The desired feeling:

```text
Look at the card.
Know what your agent thinks.
Decide only when it matters.
Open the record when you want proof.
```
