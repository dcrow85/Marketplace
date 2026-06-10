# Protocol Boundaries

Use this reference when an agent must explain what the Marketplace Protocol can
and cannot enforce.

For the complete numbered taxonomy of permanent gaps, read
`../../../Protocol_Gaps_v0.1.md`.

## The Clean Boundary

The protocol enforces contact legibility and gate alignment. It does not enforce
physical truth.

```text
appearance != authority
reputation != possession
catalog match != identity
waiver != verification
spendability != truth
assembly witness != authenticity
tool pass != enforcement
catalog location != catalog authority
catalog hash + row id != physical card proof
evidence policy != catalog fact
registry entry != judgment supply
bond amount != deterrence
legibility score != probability of truth
fiat payment != settlement
stablecoin escrow != no third-party risk
bonded seller != safe seller
external reputation != transferable trust
account control now != ownership of history
seller-controlled channels != independence
feedback tier != high-value scope
```

The divide is crossed twice:

- `ingress`: world becomes evidence. The protocol can demand signed, hashed,
  nonce-bound artifacts, but the camera, scanner, lookup, or witness is still a
  sensor operated in the world.
- `egress`: ruling becomes world. The protocol can release funds, slash bonds,
  and record rulings, but it cannot recover a card or make a fake card genuine.

## Route Lock Wall

Current route lock requires:

- item fingerprint exists
- inventory lock exists and is bound to the item fingerprint
- no active fingerprint challenge
- route spendability hash is nonzero and single-use
- wall-bundle hash is present
- assembly-history hash is present
- route assembly witness matches the contract's typed digest

The route assembly witness binds:

- escrow contract
- chain ID
- trade ID
- route hash
- route spendability hash
- wall-bundle hash
- assembly-history hash
- committed item fingerprint hash
- committed inventory lock hash
- route gate

This proves the route gate received the right commitment shape. It does not
prove shipping success, authenticity, condition, or fairness.

## Deterministic Tool Boundary

Catalog tools, image tools, pricing tools, and evidence-plan validators make
claims easier to inspect. They do not become protocol authority just because
they are repeatable.

Treat these as `legible` unless a separate gate packet grants authority:

- exact catalog matches
- content-addressed catalog citations
- `low_friction_pass` outputs
- image similarity results
- price bands or marketplace snapshots
- generated evidence plans
- deterministic risk summaries

Before using a tool result near a gate, name what makes it spendable:

- actor signature
- spendability packet
- wall bundle
- assembly history
- verifier scope
- arbiter policy
- human waiver

## Catalog Lineage Boundary

Catalogs are content-addressed substrates, not locations. A No Rarity row should
be cited as:

```text
catalog_hash
row_id
optional row_hash
policy_hash if evidence defaults are used
```

The local No Rarity release manifest is:

```text
data/no-rarity-catalog-manifest.json
```

Storage can be git, a skill bundle, a web mirror, IPFS, or a local cache. The
protocol reference is the hash. This keeps historical packets readable after
servers move or catalogs fork.

Do not overclaim the citation:

- `catalog_hash + row_id` anchors bytes, not a physical card,
- `row_hash` anchors a row snapshot, not authenticity,
- `policy_hash` anchors evidence defaults, not fact,
- clean settlements citing a row mean no surfaced row error in those trades,
  not proof the row is permanently true.

Catalog evolution uses evidence-weighted challenge. A thousand agents repeating
the same unevidenced objection are weaker than one challenge with a content
hash and a decisive contradiction.

## Economics And Judgment Supply

The protocol can hold money and bonds, but it cannot know by itself whether the
deterrence is strong enough. Agents should surface:

- what the seller has at stake
- what failures the bond covers
- what failures it excludes
- whether fraud could still be profitable
- who is paid to verify or arbitrate
- what remedy cap applies
- what happens if the verifier or arbiter is unavailable

Registry membership is only legible authority. Judgment supply means a scoped
provider has committed to the case path with fee source, response window,
conflict disclosure, remedy cap, and fallback.

## Settlement Rail Boundary

Money is the only object in the trade that can live fully on the digital side.
Escrow can mechanically prove funds exist, are locked, and move by rule. That is
why escrow and bonds are the strongest seller-facing walls.

Do not overclaim the rail:

- off-chain fiat authorization is not final settlement,
- stablecoin escrow removes card-network chargeback risk but may retain issuer,
  blacklist, wallet, bridge, off-ramp, custody, and legal process surfaces,
- escrowed money proves money state, not card truth.

Seller-facing summary should say:

```text
The buyer is funded. Your attention is priced. Your bond is scoped. Claims must
be signed against the item fingerprint and claim matrix.
```

Do not say:

```text
Crypto means no third party can ever intervene.
```

## Bond As Cold-Start Reputation

A bond is reputation a seller can post before they have any. It is still not a
claim that the seller is safe.

Bond requirements may fall only through legible mechanisms:

- clean protocol receipts,
- low claim and bond-hit history,
- signed imported reputation,
- stronger evidence profile,
- scoped third-party underwriting.

Any bond reduction remains a judged policy decision and must keep `not_claiming`
fields for honesty, authenticity, and fraud impossibility.

## External Trust Import Boundary

Outside seller reputation can be useful, but it is imported legibility rather
than bindable protocol trust.

Clean import path:

- seller places a protocol nonce on a marketplace profile, shop domain, forum
  account, or other controlled surface,
- a tool records control proofs and observation receipts,
- a legibility vector names coverage, independence, continuity, scope fit,
  cost-to-fake, and source calibration,
- a buyer policy projection decides friction relief, value-cap relief, or scoped
  bond relief.

Hard boundaries:

- current control proves contact with the surface now, not ownership of its
  history,
- eBay/shop/Discord/Google surfaces controlled by one seller are correlated, not
  independent,
- low-value sales history does not support high-value raw-card bond relief
  without extra judgment and capital,
- imported bond relief cannot exceed estimated acquisition cost of the imported
  reputation bundle,
- imports expire and lose weight as native protocol receipts accumulate,
- scraper or snapshot evidence must preserve source terms and platform
  availability fragility.

Seller-facing summary should say:

```text
Your outside profile can reduce some friction, but it is still an import. It
does not prove this card, and bond relief is capped by what that imported bundle
would cost to fake or acquire.
```

Do not say:

```text
Your eBay reputation is now portable protocol trust.
```

## Legibility Vectors

Agents may measure evidence shape, but they must not show a composite trust
meter.

Allowed vector dimensions:

- coverage
- independence
- continuity
- scope fit
- cost to fake
- source calibration

Each dimension must carry `not_claiming`. A vector cannot contain `score`,
`trust_score`, `rating`, `grade`, `verdict`, `probability_of_truth`, or
`authenticity_probability`.

The vector schema is allowlisted. Unknown top-level or dimension fields such as
`confidence`, `safety_index`, or `overall` should be blocked because synonyms
can launder certainty too.

Vector signatures such as `complete|high|high|...` are cohort keys for
calibration, not scores.

If an agent makes a recommendation from the vector, that recommendation is a
separate `judged` policy projection. The vector itself is legible evidence
structure, not spendability and not truth.

Calibration is measured after settlement: vector shapes and source histories
are compared against receipts, claims, and rulings. The goal is not certainty;
the goal is honest uncertainty. Calibration tolerance should account for sample
size so small cohorts do not false-alarm and large cohorts do not hide drift.

## Negative Gap Drill

The protocol has a deliberate negative drill:

```bash
python3 chain/script/protocol_gap_negative_drill.py
```

The drill passes when a protocol-compliant EVM trade settles while a hidden
physical oracle says the card was fake or swapped, and no packet claims the
protocol proved authenticity. That is the honest boundary: fraud becomes signed
residue and later judgment, not impossible physics.

The related calibration drill is:

```bash
python3 simulations/legibility_calibration_drill.py
```

The seller bootstrap drill is:

```bash
python3 simulations/seller_bootstrap_drill.py
```

The external trust import drill is:

```bash
python3 simulations/external_trust_import_drill.py
```

The catalog evolution drill is:

```bash
python3 simulations/catalog_evolution_drill.py
```

## Evidence Labels

Use these labels in human summaries:

- `enforced`: the protocol or validator checked this mechanically.
- `legible`: the evidence is signed, hashed, cited, or recorded.
- `judgment_needed`: meaning still depends on agent, verifier, arbiter, or human interpretation.
- `missing`: required for the next gate but absent.
- `waived`: the human or policy accepted a named risk without converting it into truth.

## No-Overclaim Examples

Bad:

```text
The seller is verified.
```

Better:

```text
The seller controls the shop domain and has prior marketplace receipts. That is
legible reputation, not proof this specific card is in hand.
```

Bad:

```text
The route is safe.
```

Better:

```text
The route can lock: spendability, wall bundle, assembly history, item
fingerprint, and inventory lock line up. Delivery risk still remains physical.
```
