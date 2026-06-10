# Protocol Gaps v0.1

Generated 2026-06-10.

This document is the sibling to `Protocol_Walls_v0.1.md`.
It is also paired with `Protocol_Legibility_v0.1.md`, which measures the shape
of evidence peering across these gaps without claiming the gaps are closed.

The walls name what the protocol can block, gate, validate, or make spendable.
The gaps name what the protocol cannot close without pretending bytes are atoms.
These gaps are not embarrassments or TODOs. They are permanent design objects
that must stay visible to agents, humans, verifiers, arbiters, and tests.

Compact rule:

```text
Access is not granted by resemblance. It is granted by provenance.
Provenance can bind claims, packets, money, and responsibility.
It cannot bind a physical object into the chain.
```

## Gap Semantics

Each gap should be labeled with one or more of:

```text
permanent_gap: digitally unclosable by design
repriced: protocol can change the cost of attack or defense
attributable: protocol can bind responsibility to signed residue
judgment_needed: intelligent review still decides meaning or remedy
```

Each gap report should answer:

- why the gap is digitally unclosable,
- what attack lives inside it,
- what the protocol does instead,
- which walls border it,
- what residue remains after the attack.

## Two Crossings

Every physical-card trade crosses the digital/physical divide twice.

### Ingress: World Becomes Evidence

Cameras, scanners, cert lookups, seller notes, shop receipts, API calls, and
carrier pages turn physical events into packets. Every sensor at ingress is
operated by someone with incentives, blind spots, or limited scope.

The protocol can demand signed, hashed, nonce-bound, scoped artifacts. It cannot
make the artifact identical to the physical object.

Legibility vectors can measure how much coverage, independence, continuity,
scope fit, cost-to-fake, and source calibration the artifact has. They still do
not turn the artifact into the object.

### Egress: Ruling Becomes World

When a trade ends, the protocol can release escrow, slash a bond, refund a buyer,
record a ruling, preserve receipts, and damage future trust. It cannot recover a
card, undo a swap, force a carrier event to have happened, or make a fake card
genuine.

The protocol can execute digital remedies. Physical restitution remains outside
the ledger.

## G1. Binding Gap

Claim:

```text
bytes != atoms
```

Why unclosable:

A fingerprint, catalog row, manifest, nonce photo, cert lookup, or scan binds a
claim about an object. It does not bind the object itself. A physical card can be
borrowed, swapped, counterfeited, damaged, or relabeled after a packet is made.

Attack living here:

- Seller photographs a real or convincing card, then ships a different card.
- Seller submits a fingerprint for one copy and ships another similar copy.
- Buyer receives the correct card and later returns a different one.

What the protocol does instead:

- Requires item fingerprint before inventory lock.
- Requires manifests, subject hashes, and packet signatures.
- Requires route spendability, wall bundle, and assembly history before route lock.
- Keeps `not_claiming` boundaries visible.
- Lets inspection, claim, cure, and arbitration assign cost after the gap is hit.

Borders:

- `CardReferenceCandidate`
- `POKEMON_ACCEPTANCE_PROFILE_RAW_500_2000`
- `ProofVectorScope`
- `DeterministicToolBoundary`
- route assembly witness
- delivery witness

Residue:

Signed item fingerprint, evidence manifest hash, inventory lock, route packet,
delivery packet, verifier scopes, buyer waiver or claim, and final receipt or
ruling.

## G2. Sensor Gap

Claim:

```text
the camera is not neutral
```

Why unclosable:

Photos, scans, videos, and local observations are produced through devices,
angles, lighting, compression, cropping, and human choice. Even an honest seller
can omit a flaw. A dishonest seller can stage a view.

Attack living here:

- Holo scratch hidden by angle.
- Corner wear cropped out.
- Fake or altered card shown only in flattering light.
- Video begins after the crucial package-opening moment.

What the protocol does instead:

- Makes evidence requirements explicit.
- Prices extra seller attention when more evidence is requested.
- Requires quality floors where they can be mechanical.
- Preserves when quality remains judgment.
- Allows verifier review without letting the verifier overclaim.

Borders:

- `EvidenceRequestFeeTerms`
- `CostDimensionalIntegrity`
- `BuyerRiskAcceptance`
- `ProofVectorScope`
- `JudgmentSupplyCommitment`

Residue:

Evidence request terms, paid attention receipts, asset hashes, capture metadata
when available, verifier notes, and the list of views that were missing or waived.

## G3. Continuity Gap

Claim:

```text
evidence is a snapshot; custody is a process
```

Why unclosable:

The object moves through time: table, sleeve, mailer, carrier, mailbox, buyer,
possible return route. Digital commitments can mark checkpoints, but cannot
guarantee nothing changed between checkpoints.

Attack living here:

- Card is swapped after fresh nonce photo.
- Package is packed correctly but opened or damaged later.
- Buyer returns a worse copy.
- Carrier marks delivered but package is stolen, empty, or damaged.

What the protocol does instead:

- Separates forward leg and return leg.
- Requires route risk owner and insurance gap assignment.
- Uses delivery witness placement without calling delivery truth.
- Requires buyer-side claim evidence and return fingerprints for stronger claims.
- Lets arbiters reason over timing and custody breaks.

Borders:

- `RouteInsuranceRiskOwner`
- `ClaimClosureEvidenceMatrix`
- `BuyerRiskAcceptance`
- delivery witness
- claim support spendability
- bond action spendability

Residue:

Route packet, insurance terms, delivery packet, inspection timestamp, opening or
arrival evidence, return fingerprint, carrier records, and ruling.

## G4. Identity Gap

Claim:

```text
a key is not a person
```

Why unclosable:

Wallets, accounts, domains, marketplace profiles, shop sites, and agent
delegations identify control paths. They do not prove the same human, shop
operator, employee, or future controller will behave honestly.

Attack living here:

- Purchased or borrowed marketplace account.
- Wallet transfer or delegated signer abuse.
- Shop proof that belongs to a real shop but not to the current card.
- Agent authority used outside the human's intended mandate.

What the protocol does instead:

- Separates actor authority from proof vectors.
- Requires positive claims and `not_claiming` fields.
- Uses scoped agent mandates and human interrupt rules.
- Makes account-control proofs legible without upgrading them into possession or
authenticity.

Borders:

- `ProofVectorScope`
- `HumanAvailabilityWindow`
- `JudgmentSupplyCommitment`
- actor registry
- verifier/arbiter registry

Residue:

Actor records, proof vector packets, delegation refs, signed account-control
artifacts, agent decision traces, and revocation or replacement records.

## G5. Judgment Gap

Claim:

```text
meaning is not a hash
```

Why unclosable:

Condition, authenticity, bad faith, adequacy of packaging, materiality of a flaw,
and fairness of a remedy are semantic questions. Hash equality can prove two byte
strings match. It cannot decide whether edge whitening crosses from LP to MP.

Attack living here:

- Seller says a crease is lighting.
- Buyer exaggerates condition downgrade.
- Verifier stays inside scope but human reads it too broadly.
- Arbiter applies a policy poorly.

What the protocol does instead:

- Requires scoped verifier approvals.
- Requires arbiter policy hash and claim matrix row.
- Separates automated arbiter caps from human escalation.
- Makes `not_claiming` fields human-readable.
- Records final rulings as accountable judgments, not mechanical truth.

Borders:

- `ClaimClosureEvidenceMatrix`
- `BondScope`
- `JudgmentSupplyCommitment`
- verifier scope attestation
- arbiter policy binding

Residue:

Scope approvals, verifier notes, conflict disclosures, policy hash, claim packet,
case file, ruling hash, remedy math, and appeal or escalation record where used.

## G6. Egress Remedy Gap

Claim:

```text
the ledger can move money; it cannot retrieve the card
```

Why unclosable:

When physical fraud succeeds, the protocol can only execute digital consequences.
It can refund, release, slash, delay, preserve proof, and damage future trust. It
cannot seize a card, undo a handoff, repair damage, or force a carrier to change
history.

Attack living here:

- Buyer accepts before later discovering a counterfeit.
- Seller disappears after bond loss.
- Carrier loss exceeds insurance.
- Legal recovery costs more than the object.

What the protocol does instead:

- Makes loss allocation explicit before route lock.
- Sizes and scopes bonds.
- Records final receipts and adverse rulings.
- Lets future agents price prior behavior.
- Preserves claim packets for insurance, civil action, platform reports, or
future trust decisions.

Borders:

- `BondScope`
- `RouteInsuranceRiskOwner`
- `ClaimClosureEvidenceMatrix`
- `EconomicDeterrenceProfile`
- settlement and receipt events

Residue:

Escrow movement, bond disposition, dispute-bond disposition, receipt, ruling,
insurance packet, and durable reputation evidence.

## G7. Time Gap

Claim:

```text
truth decays between gates
```

Why unclosable:

Freshness is always local. A valid photo, listing, API receipt, or inventory note
can become stale the moment after it is produced. Expiry narrows the gap but does
not abolish it.

Attack living here:

- Seller sells elsewhere after evidence but before route.
- API price snapshot becomes stale during negotiation.
- Human availability changes after an agent mandate is issued.
- Verifier or arbiter becomes unavailable after selection.

What the protocol does instead:

- Adds expiry, challenge windows, route deadlines, and timeout paths.
- Requires active status checks at gates.
- Supports arbiter replacement and emergency handoff.
- Makes stale evidence block, waive, or escalate instead of silently passing.

Borders:

- `ExternalAvailabilityCovenant`
- `HumanAvailabilityWindow`
- `JudgmentSupplyCommitment`
- spendability expiry
- arbiter replacement

Residue:

Timestamps, expiries, stale packet refs, timeout events, replacement acceptance,
and agent decision logs.

## Negative Drill Requirement

Every wall should have a positive drill that proves it holds. Every permanent
gap should have a negative drill that proves it remains open.

The first negative drill is:

```text
chain/script/protocol_gap_negative_drill.py
```

Pass means:

- the protocol-compliant trade can still settle,
- the hidden physical-world test oracle says the card was fake or swapped,
- the report shows which gap allowed the fraud,
- the report shows the signed residue left behind,
- no packet or agent summary claims the protocol proved authenticity.

This is falsification symmetry. If a future change accidentally makes this drill
"fail" by claiming to close bytes-to-atoms truth, that is not success. It is an
overclaim alarm.
