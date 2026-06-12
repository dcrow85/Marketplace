# Marketplace Protocol Full Spec

Generated for external review on 2026-05-19.

This document is a self-contained handoff for ChatGPT Pro or another reviewer. It describes the current protocol idea, the implemented local EVM harness, what has been tested, and what remains unresolved.

## Short Version

Marketplace Protocol is an agent-native protocol for Pokemon card trades where intent, evidence, trust, shipping, claims, and settlement remain typed instead of being collapsed into one scalar score. The alpha aperture is Pokemon single-card trades because the goods are high-context, evidence-rich, trust-sensitive, and frequently traded by people who already understand condition, provenance, reputation, and negotiation. The current prototype uses local Ethereum tooling to lock money and bonds, anchor signed packet hashes, enforce identity and route gates, and keep the rich human/evidence layer off-chain.

## Core Thesis

The protocol lets a buyer express a funded want, lets sellers answer with inventory and evidence, lets agents negotiate and probe trust, and lets escrow release or dispute funds based on typed gates.

The central move is not "put the marketplace on-chain." The central move is to put the costly commitments on-chain and keep the rich marketplace facts off-chain as signed, hash-addressed packets.

Evidence is memory. Spendability is permission. A packet can be valid, durable, and useful without being allowed to move money or advance a trade state.

The protocol must be explicit about its own boundary. It can enforce signatures, hashes, deposits, timeouts, role membership, packet uniqueness, typed state transitions, and whether a required commitment has been cited. It cannot directly know whether a physical card is authentic, whether a photo honestly depicts the shipped object, whether a seller is trustworthy, whether a verifier did careful work, or whether a condition dispute is fair. Those questions belong to intelligent judgment by agents, humans, verifiers, and arbiters, with the protocol making the evidence legible and the consequences enforceable.

The boundary, bootstrap, and catalog-lineage model are now documented in six active artifacts:

- `Protocol_Walls_v0.1.md` names what the protocol can block, gate, validate, or make spendable.
- `Protocol_Gaps_v0.1.md` names what remains permanently open at the physical/digital crossings.
- `Protocol_Legibility_v0.1.md` names how evidence shape can be measured without aggregating it into truth.
- `Protocol_Bootstrap_v0.1.md` names why seller-first, pre-funded escrow, and bonds are the alpha wedge.
- `Protocol_Trust_Import_v0.1.md` names how outside seller reputation can be observed without becoming bindable trust.
- `Protocol_Catalog_Lineage_v0.1.md` names how catalogs are content-addressed, cited, revised, challenged, and calibrated.

The goal is falsification symmetry. Every wall should have a drill that proves it holds. Every permanent gap should have a negative drill that proves it remains open while leaving signed, attributable residue.

## External Review Synthesis

An external ChatGPT Pro review agreed that the design is conceptually strong but operationally fragile. The review identified spendability as the strongest primitive: a gate-scoped capability system for evidence. It also warned that the current local harness is not yet a fraud-resistant production protocol because it still relies on off-chain schema validation, verifier honesty, arbiter judgment, and seller usability.

The review's strategic recommendation is to narrow the alpha sharply:

> A typed escrow and evidence protocol for agent-mediated Pokemon card trades, starting with curated sellers, strict evidence templates, typed spendability, scoped bonds, and human arbitration.

The immediate shift is to stop trying to prove a general marketplace. First prove that one funded buyer can safely and conveniently buy one specific Pokemon card from one semi-trusted seller with less platform overhead, clearer evidence, and better dispute handling than existing channels.

P0 before real alpha:

1. Typed spendability digest validation.
2. Route claim taxonomy.
3. Seller cure workflow.
4. Buyer-side fraud evidence requirements.
5. Arbiter policy hash binding.
6. Scoped bond schedule.
7. Bounded external trust import with acquisition-cost, value-tier, continuity, and decay limits.

The full review synthesis is tracked in `Marketplace_Protocol_External_Review_Synthesis.md`.

## Why This Exists

Current Pokemon card market pain points:

- Buyers cannot easily express funded intent for a specific card and let sellers compete to satisfy it.
- Sellers pay high platform fees and repeat trust-building work across isolated marketplaces.
- Reputation is trapped inside platforms and is flattened into a small number of visible signals.
- Card condition, provenance, shipping evidence, insurance, and claims are messy, but current flows often compress them into listing text plus photos.
- Agents need a neutral rail where they can discover, negotiate, verify, and settle without pretending all costs are money costs.
- Disputes are expensive because evidence is scattered across chat, photos, tracking pages, marketplace records, and payment records.

The protocol is designed so a buyer can say something like:

> Buy me this vintage Pokemon card in LP or better condition for $X or less, shipped or available for local handoff, with enough evidence for my risk tolerance.

The buyer's agent can then search, negotiate, ask for extra proof when worth it, avoid wasting seller attention when not worth it, and present the buyer with a legible path to settlement.

The seller-facing counterpart is just as important for bootstrap:

> Answer funded buyers only, price your scarce attention, bind claims to evidence, and get final settlement instead of a reversible platform promise.

Seller-first does not mean buyer-hostile. It means accountability becomes bilateral. The buyer posts real funds before the seller spends scarce attention; the seller posts scoped bond before the buyer trusts a new or thin-history source; claims and returns become signed packets against the pre-committed item fingerprint rather than loose narrative.

## Bootstrap Thesis

The alpha should begin where collectors already use irreversible money: Discord, Facebook groups, local shows, direct dealer relationships, and high-trust private sales. The pitch is not "give up chargebacks for crypto." The pitch is:

```text
You already use irreversible money in serious direct trades.
Use irreversible money with escrow, bonds, inspection, evidence, and receipts.
```

Digital escrow and bonds are the strongest bootstrap walls because money is the only object in the trade that lives entirely on the digital side. The card has physical gaps. Escrowed digital currency does not: the contract can prove funds exist, are locked, and move only by rule.

Early protocol is capital-heavy and data-light. A new seller can substitute scoped bond for missing history. Mature protocol should become data-heavy and capital-lighter as clean receipts, claims, rulings, and bond outcomes calibrate how much stake different sellers need.

## Alpha Market Aperture

The alpha is Pokemon cards only. It should not try to support Magic, sports cards, sneakers, watches, art, or general collectibles until the Pokemon path is repeatably working.

- Pokemon card identity and condition are evidence-rich.
- Buyers already understand condition floors, trusted sellers, grading companies, insurance, and show-floor negotiation.
- Trust differs by buyer aperture: a shop reputation, eBay history, TCGplayer sales, PSA/SGC cert correlation, or fresh timestamped photos can all matter differently.
- Individual cards are unique enough that inventory locking and duplicate-use prevention are meaningful.
- Low, mid, and high value trades exercise different friction budgets.

The core primitives should stay domain-adaptable, but alpha schemas, agent prompts, evidence profiles, arbiters, and simulations should assume Pokemon single-card trades unless explicitly marked as future work.

## Design Principles

1. Keep rich facts off-chain, anchor costly commitments on-chain.
2. Make every authority claim scoped, signed, and revocable.
3. Do not treat "verified" as a universal state.
4. Preserve trust vectors instead of flattening them too early.
5. Let agents carry complexity, but keep human interrupt points explicit.
6. Require spendability before evidence can advance a gate.
7. Separate object identity from inventory reservation.
8. Make arbitration and replacement paths part of the deal from the start.
9. Let evidence scale by value, risk, route, trust gap, and buyer preference.
10. Prefer small, testable protocol primitives over broad marketplace promises.

## Core Vocabulary

### Cost Field

A cost field is the multidimensional cost surface around a trade. It includes:

- Money price.
- Platform fees.
- Shipping cost.
- Insurance cost.
- Seller attention cost.
- Buyer attention cost.
- Trust gap.
- Condition uncertainty.
- Route risk.
- Time sensitivity.
- Privacy exposure.
- Dispute probability.
- Verification burden.
- Arbitration burden.

The protocol can show a simplified price to humans, but agents should preserve the broader field.

### Cost Dimensional Integrity

Costs should remain in their native dimensions for as long as possible. Dollars are a useful display layer, not the ground truth of the cost field.

Native cost dimensions include:

- seller time measured in minutes, fee terms, credit-back terms, and opportunity cost,
- buyer attention measured in interrupts, decisions, risk acceptances, and response deadlines,
- agent attention measured in tokens, tool calls, API calls, latency, and dollars,
- verifier attention measured in fee, scope, SLA, and authority,
- arbiter attention measured in reserved fee, response window, remedy authority, and escalation path,
- route cost measured in dollars, days, insurance amount, signature requirement, and liability gap,
- trust gap measured in missing proof vectors, bond requirement, payout delay, and claim weakness,
- condition risk measured in ambiguity class, evidence gap, likely downgrade range, and claim consequence,
- privacy cost measured in fields disclosed, audience, retention, and redaction.

Hard rule:

```text
Preserve native costs internally.
Summarize only at the action boundary.
Never let the summary erase what kind of cost was actually paid.
```

If an agent collapses a cost field into a scalar, the scalar must be reversible. The packet or agent response must preserve the native dimensions, the conversion rationale, who pays, who receives value, what risk is reduced, and what risk remains.

Example:

```text
human_visible_summary: "$5 seller time, credited if you buy"
native_dimensions:
  seller_time_minutes: 10
  seller_fee_usd: 5
  credit_if_purchase_usd: 5
  risk_reduced: "holo surface condition uncertainty"
  not_reduced:
    - authenticity
    - seller possession after photo time
    - professional grade
```

Attention is a priced resource. Buyer curiosity can stay free, but buyer requests that create seller work should become explicit terms instead of dissolving into chat. A seller agent can know the value of its human's time and quote that cost without making the interaction hostile.

Seller attention can be:

- free for already-available facts,
- metered for quick answers or small extra photos,
- paid and fully credited if the buyer purchases,
- paid and partially credited if the buyer purchases,
- paid with no credit for heavy or low-margin work,
- deposit-backed when the seller must hold inventory, prepare an item, or turn down other buyers.

### Value Map

"Value map" is the buyer-facing form of the cost field. It says which costs matter to this buyer and how strongly.

Example:

- A high-value slab buyer may care about cert correlation, insurance, and signature delivery.
- A low-value raw-card buyer may accept sparse photos and no insurance.
- A local collector may prefer in-person handoff over shipping.
- A privacy-sensitive buyer may accept a ZK predicate instead of revealing a full financial or identity fact.

### Human Availability Window

An agent should know whether its human is available within the relevant response time before raising a human question. A human interrupt is not free, and an unavailable human is not a valid liveness path.

`HumanAvailabilityWindow` fields:

```text
human_id:
agent_id:
timezone:
available_from:
available_until:
expected_response_window:
channels:
interrupt_budget_remaining:
may_interrupt_for:
must_not_interrupt_for:
default_action_if_unavailable:
expires_at:
signature:
```

Rules:

- If the human is available before the gate deadline, the agent may ask.
- If the human is unavailable but the agent has mandate authority, the agent may act inside mandate.
- If the human is unavailable and the action exceeds mandate, the agent must choose the configured safe default.
- If availability is unknown, the agent must treat human response as uncertain and avoid deadlines that depend on it.

Human availability is a cost-field dimension. It should be preserved as response time, interrupt budget, and decision authority before it is summarized to the user.

### Packet

A packet is a typed protocol object, canonicalized, hashed, signed, and optionally anchored.

Examples:

- `Intent`
- `HumanAvailabilityWindow`
- `CostDimensionalTrace`
- `ContactReceipt`
- `EscrowTerms`
- `TrustOffer`
- `ItemFingerprint`
- `InventoryLock`
- `EvidenceManifest`
- `EvidenceRequestFeeTerms`
- `VerifierScopeApproval`
- `VerifierScopeAttestation`
- `EvidenceSpendability`
- `TradeRoute`
- `DeliveryEvidence`
- `Claim`
- `ArbiterRuling`
- `FinalReceipt`

### ContactReceipt

The protocol's jurisdiction is not physical truth. Its jurisdiction is accountable contact.

`ContactReceipt` is the shared packet shape for recording that an actor, agent, verifier, API, carrier, shop, buyer, seller, or arbiter touched a source, object, gate, route, claim, or ruling in a scoped way.

Contact receipts provide contact legibility:

- who or what touched the trade,
- what source or subject was touched,
- how the contact happened,
- which role issued the observation,
- which gate or agent decision may use it,
- what underlying bytes or response were hashed,
- when it expires or becomes stale,
- what it claims,
- what it does not claim.

Contact receipts do not prove reality. They make contact with reality legible and accountable.

Contact receipt families:

- `ExternalContactReceipt`: API calls, cert lookups, carrier lookups, marketplace profile lookups, shop/domain lookups.
- `PhysicalContactReceipt`: seller photo session, fresh nonce photo, packaging proof, local handoff, buyer inspection.
- `AgentContactReceipt`: buyer-agent review, seller-agent quote, arbiter-agent case triage.
- `VerifierContactReceipt`: scoped verifier review over a subject hash.
- `RouteContactReceipt`: tracking, insurance, delivery, handoff, non-standard route memo.
- `InspectionContactReceipt`: buyer opening evidence, acceptance, condition challenge.
- `ArbiterContactReceipt`: case-file assembly, ruling, remedy policy application.

Shared fields:

```text
schema: marketplace.contact_receipt.v0.1
receipt_id:
trade_id:
subject:
  type:
  id:
  hash:
contact:
  kind:
  source:
  method:
  endpoint_hash:
  request_hash:
  response_hash:
  asset_hashes:
  observed_at:
issuer:
  actor:
  role:
  signature:
use:
  allowed_gates:
  spendability_required:
  expires_at:
claiming:
not_claiming:
visibility:
retention:
```

Example:

```json
{
  "schema": "marketplace.contact_receipt.v0.1",
  "receipt_id": "contact:alpha-espeon-001:pokemon_tcg_api:neo2_1",
  "trade_id": "alpha-espeon-001",
  "subject": {
    "type": "catalog_card",
    "id": "pokemon:neo2/1"
  },
  "contact": {
    "kind": "external_api",
    "source": "pokemon_tcg_api",
    "method": "GET",
    "endpoint_hash": "0x...",
    "request_hash": "0x...",
    "response_hash": "0x...",
    "observed_at": "2026-05-21T01:10:00Z"
  },
  "issuer": {
    "actor": "did:market:agent:buyer",
    "role": "buyer_agent",
    "signature": "0x..."
  },
  "use": {
    "allowed_gates": ["item_reference", "route_wall_context"],
    "spendability_required": true,
    "expires_at": "2026-05-28T01:10:00Z"
  },
  "claiming": [
    "a catalog response was observed",
    "this catalog image was used as reference"
  ],
  "not_claiming": [
    "seller possesses the card",
    "the offered card is authentic",
    "the offered card meets condition"
  ]
}
```

API calls are therefore not truth. They are signed contact with named external systems. Their value improves over time when agents correlate receipt types with later outcomes, dispute rates, delay, and cost.

### AssemblyProvenance

`AssemblyProvenance` is the packet that prevents the protocol from inferring
access from resemblance. It records how contact receipts, packet refs, subject
anchors, wall results, policies, and route terms were assembled into admissible
placement for one named gate.

In plain terms:

```text
Access is not granted by resemblance. It is granted by provenance.
Spendability is inherited through assembly, not inferred from appearance.
```

Enforcement scope (audit AUD-D2-SW-001/002, 2026-06-11): this principle is a
protocol property, split across two layers. The contract enforces the
item-identity spine and typed spendability digest: route and delivery witnesses
bind to the committed item fingerprint / inventory lock or route state, the
spendability digest is recomputed from the trade, gate, leg, artifact hashes,
and issuer, and tuple substitution after the witness is generated fails closed.
The contract does **not** verify that the wall bundle or assembly history graph
contents were minted from a coherent provenance chain; it accepts their hashes
as caller-supplied values, binds them into the spendability digest and witness,
and stores the resulting commitments. Assembly-graph coherence is validated
off-chain and is `legible`, not `enforced`. An on-chain route lock proves typed
digest and witnessed shape, not full assembly coherence.

Important fields:

- `schema`: `marketplace.assembly_provenance.v0.1`
- `trade_id`
- `gate`
  - `gate_type`
  - `gate_id`
  - `leg`
- `foundation`
  - `subject_hash`
  - `item_fingerprint_hash`
  - `inventory_lock_hash`
  - `route_hash` or `route_terms_hash`
  - `wall_bundle_hash`
- `predecessor_packet_refs`
- `contact_receipt_refs`
- `parent_assembly_hash`
- `assembly_graph_hash`
- `causal_edges`
- `allowed_gates`
- `issued_by`
- `issued_role`
- `decision_authority`
- `validator_receipt_hash`
- `status`
- `issued_at`
- `expires_at`
- `signature`
- `not_claiming`

Assembly provenance does not prove the physical card is authentic or correctly
graded. It proves that the current gate is using the named packet chain instead
of a lookalike source, adjacent API contact, stale route, generic seller trust,
or scalar confidence pointed at the wrong place.

### Evidence

Evidence is a signed and hash-addressed statement or manifest that can inform a trade.

Evidence can be:

- Photos, scans, videos.
- Tracking pages.
- Insurance details.
- Local handoff memos.
- Marketplace reputation proofs.
- Shop website signatures.
- Google review references.
- PSA/SGC/BGS cert correlations.
- Verifier attestations.
- Claim packets.

Evidence by itself does not automatically advance a gate.

### Spendability

Spendability is a separate packet that says a specific evidence bundle is allowed to support a specific action at a specific gate.

Examples:

- This item evidence can support route commitment.
- This challenge clearance can reopen route commitment.
- This return-leg evidence can support a claim packet.
- This arbiter packet can support bond action.

Spendability is the permission model: latent structure becomes admissible action.

## Actors

### Buyer

The person or entity funding an intent.

Responsibilities:

- Defines desired item and condition floor.
- Defines budget and route preferences.
- Defines trust and evidence appetite.
- Funds escrow.
- Approves high-friction exceptions.
- Accepts receipt or opens claim.

### Buyer Agent

The agent acting within buyer mandate.

Responsibilities:

- Converts plain-language want into structured intent.
- Searches listings, seller agents, shops, and inventory sources.
- Evaluates trust evidence through the buyer's aperture.
- Probes sellers for evidence only when worth the cost.
- Recommends route, insurance, bond, and arbiter choices.
- Presents human questions at defined friction points.

### Seller

The person, shop, dealer, or marketplace-facing account offering goods.

Responsibilities:

- Responds to funded intent.
- Provides inventory and trust evidence.
- Posts bond if required.
- Commits item fingerprint.
- Commits inventory lock.
- Commits route.
- Provides delivery evidence.
- Responds to claims.

### Seller Agent

The agent or tool acting for a seller.

Responsibilities:

- Answers buyer-agent probes.
- Packages seller proof once and reuses it.
- Quotes price, condition, route, and evidence availability.
- Negotiates attention cost and credit-back terms.
- Helps avoid oversharing where buyer risk does not justify it.

### Verifier

An entity or agent that can attest to a scoped claim.

Verifier scope is narrow by design. A verifier may be authorized to say:

- The packet is complete.
- The photos plausibly match the raw card identity claim.
- A slab cert correlates with a public grading record.
- A fresh nonce photo was supplied.
- Packaging evidence is sufficient for an insurance claim packet.

A verifier must not silently imply authenticity, grade, route success, or full custody unless those exact scopes are approved.

### Arbiter

The decision authority for disputes.

Responsibilities:

- Has a signed profile and availability record.
- Is selected or accepted before trade lock.
- Reviews claims, evidence, route failures, and bond consequences.
- Issues signed rulings.
- Can be replaced if inactive or revoked under defined rules.

### Arbiter Agent

An agent that assists or partially automates arbitration.

Allowed only under signed delegation:

- Scope.
- Value limit.
- Remedy limit.
- Escalation triggers.
- Expiry.
- Audit trail.

Low-value cases can use more automation. High-value, fraud, authenticity, contradictory evidence, or large bond penalties escalate.

### Automated Arbiter

A purely agentic arbiter mode for low-cost, low-risk situations.

It should be allowed when:

- The buyer accepted the policy in advance.
- The value is under a defined cap.
- Remedy and bond action are capped.
- The evidence type is simple.
- There is a mandatory human escalation threshold.

## Registries

The protocol relies on registries for discoverability and revocation.

### ActorRegistry

Maps actors to active controller addresses and roles.

Roles:

- Buyer.
- Seller.
- Verifier.
- Arbiter.
- Replacement arbiter.

### VerifierRegistry

Records verifier authority:

- Controller address.
- Scope metadata hash.
- Fee model.
- Conflicts.
- Revocation state.

### ArbiterRegistry

Records arbiter authority:

- Profile hash.
- Accepted categories.
- Fees.
- Maximum value.
- Availability.
- Replacement rules.
- Conflicts.
- Revocation state.

### PredicateVerifierRegistry

Records verifier contracts for private predicate or ZK-style proof hooks.

## Transaction Lifecycle

### 1. Intent

The buyer or buyer agent creates an `Intent` packet.

Typical fields:

- Domain: `tcg`.
- Game: `pokemon`.
- Card identity or search description.
- Condition floor.
- Max total price.
- Route preferences.
- Local handoff preference.
- Insurance preference.
- Evidence floor.
- Trust preferences.
- Human interrupt policy.

The buyer signs the intent and funds escrow when terms are accepted.

### 2. Discovery

Discovery can happen through:

- Seller agents.
- Dealer inventory.
- Card shops.
- Marketplace accounts.
- Card shows.
- Brokered proposals.
- Public registries.
- Direct seller listings.

The protocol should be neutral to databases, but Pokemon alpha needs a card-reference layer. A reference source can identify a known print, set, number, rarity, language, variant, and catalog image. It cannot certify possession, condition, authenticity, price truth, seller inventory, shipment, or the seller's language/edition claim.

Alpha accepts either:

- a `CardReferenceCandidate` packet from a known source such as the pinned No Rarity catalog, Pokemon TCG API, or TCGdex, or
- a `ManualCardReferenceGap` packet when a claimed Japanese vintage, promo, or unusual print is not well covered by the source.

The database packet is assembly placement only as a catalog candidate. It gives the lock a name for the object class; it does not make the physical card real.

For the No Rarity alpha catalog, card references cite exact bytes:

```text
catalog_hash
row_id
optional row_hash
policy_hash when evidence defaults are used
```

The current release manifest lives at `data/no-rarity-catalog-manifest.json`.
The fact catalog lives at `data/no-rarity-base-set.json`. Evidence defaults now
live separately at `data/no-rarity-catalog-policy.json`, so a policy change does
not silently rewrite the fact catalog.

For Japanese Base Set No Rarity, alpha should not wait for a perfect database. The correct path is a layered reference:

- Pokemon TCG API can supply an English reference image and known Base Set row when useful.
- TCGdex can supply a Japanese Expansion Pack row such as `PMCG1` when available.
- A local `NoRarityBaseSetVariantClaim` carries the historically specific missing-rarity-symbol claim.
- Seller evidence and, when needed, verifier or arbiter judgment decide whether the physical card supports that variant claim.

The protocol can enforce that the variant overlay is present, scoped, and evidence-bound. It cannot enforce the visual truth of the missing symbol without an evidence judge.

### 3. Proposal

A seller responds with:

- Price.
- Condition claim.
- Trust evidence.
- Available evidence.
- Route options.
- Insurance availability.
- Bond willingness.
- Arbiter preferences.

The seller can list inventory too. The protocol supports both buyer-led intent and seller-led offers. Buyer-led intent is the bootstrap magic, but seller listings do not dilute the protocol if they are typed and agent-readable.

### 4. Escrow Terms

`EscrowTerms` bind:

- Price.
- Seller bond.
- Buyer dispute bond, if any.
- Inspection window.
- Route duties.
- Insurance duties.
- Release gates.
- Claim paths.
- Arbiter.
- Replacement rules.
- Exclusions.

Escrow is funded by the buyer. Seller posts bond before evidence and route can proceed.

### 4a. Settlement Rail Terms

`SettlementRailTerms` name the money rail and its finality boundaries.

```text
schema: marketplace.settlement_rail_terms.v0.1
trade_id
rail_type: native_eth | erc20_stablecoin | offchain_fiat_reference
asset
chain_id
escrow_contract
escrow_funded
bond_asset
buyer_display_currency
seller_payout_currency
finality_model
chargeback_surface
issuer_or_admin_controls
freeze_or_blacklist_surface
custody_or_money_transmission_notes
conversion_provider
conversion_failure_path
not_claiming
human_summary
```

Hard rules:

```text
fiat payment != settlement
stablecoin escrow != no third-party risk
escrowed digital money != physical truth
```

An off-chain fiat payment can be referenced as a cost or settlement-adjacent fact, but it is not mechanically final in the same way as contract-held escrow. A stablecoin escrow can provide contract settlement and remove card-network chargeback risk, but it must preserve issuer, blacklist, wallet, bridge, off-ramp, custody, and regulatory caveats.

### 5. Item Fingerprint

`ItemFingerprint` defines the physical thing at stake before inventory is reserved.

Possible sources:

- Raw-card front/back scans.
- Corner/flaw photos.
- Fresh timestamp or nonce photos.
- Slab cert correlation.
- Marketplace proof chain.
- Shop-verifier note.
- Later: private predicate or ZK proof.

The local contract currently requires item fingerprint before inventory lock.

### 6. Inventory Lock

`InventoryLock` reserves the specific item for this trade.

It is signed by the seller and bound to the committed `ItemFingerprint`.

Purpose:

- Prevent one item from backing multiple active trades.
- Prevent inventory reservation without object identity.
- Prevent detaching route/inventory from the item claim.

The local contract blocks active reuse of the same inventory lock.

### 7. Evidence

The seller provides evidence scaled to the trade.

Low-value examples:

- Basic front/back photos.
- Seller trust proof.
- Simple shipping memo.

Mid-value examples:

- Front/back photos.
- Flaw callouts.
- Fresh timestamp photo.
- Tracking and insurance.
- Seller bond.

High-value examples:

- Full scans.
- Video.
- Slab cert correlation.
- Fresh custody nonce.
- Packaging proof.
- Signature delivery.
- Insurance packet.
- Verifier review.

Evidence enters as `EvidenceManifest` packets when the evidence includes content-addressed assets.

### 7a. Paid Evidence Requests

When a buyer or buyer agent asks for evidence that creates seller work, the request can carry explicit fee terms.

The protocol does not decide whether the request is socially fair. Agents negotiate that. The protocol records:

- what work was requested,
- who pays,
- who receives payment,
- whether the fee is credited if the trade closes,
- how much is credited,
- what delivery event triggers payment,
- when the request expires,
- what evidence hash or response packet satisfies the request,
- what happens if the buyer walks, the seller fails to respond, or the response is disputed.

`EvidenceRequestFeeTerms` fields:

```text
schema: marketplace.evidence_request_fee_terms.v0.1
trade_id:
request_id:
requested_by:
requested_from:
work_required:
reason:
amount:
currency:
payer:
recipient:
escrowed:
trigger_for_payment:
credit_policy:
  credited_if_purchase:
  credit_amount:
  seller_keeps_amount:
refund_policy:
quality_floor:
expires_at:
dispute_path:
not_claiming:
signature:
```

Allowed credit policies:

- full credit if purchase closes,
- partial credit if purchase closes,
- no purchase credit,
- seller waives fee,
- seller requires deposit before inventory hold or preparation.

Examples:

```text
$5 extra surface photo, $5 credited if buyer purchases.
$5 extra surface photo, $2.50 credited if buyer purchases.
$20 prep or inventory-hold request, nonrefundable if buyer disappears.
```

Enforcement boundary:

- The protocol can enforce funded fee terms, deadlines, submitted response hashes, credits, refunds, and payout triggers.
- The protocol cannot know whether a photo was "good enough" unless the quality floor is mechanical or an agent, verifier, or arbiter signs that judgment.

### 8. Verifier Scope

If a verifier is used, the buyer first signs `VerifierScopeApproval`.

The verifier then commits `VerifierScopeAttestation` bound to:

- Trade ID.
- Subject hash.
- Scope-set hash.
- Method ID hash.
- Verifier signature.

This prevents scope laundering. A verifier cannot attach loose evidence to a trade.

### 9. Spendability Gate

Before route commitment, claim support, or bond action, valid evidence must become spendable for that gate.

`EvidenceSpendability` defines:

- Manifest hash.
- Manifest subject hash.
- Gate type.
- Gate ID.
- Leg: forward or return.
- Consumption: single-use or append-only weight.
- Spendable claims.
- Spend limit.
- Not-claiming list.
- Decision authority.
- Required events or waivers.
- Status.

The key frame:

- Evidence is memory.
- Spendability is permission.
- The same memory may be silent on the forward leg and spendable on the return leg.

The current local EVM contract consumes a route spendability hash, stores the route wall-bundle reference, requires an `assemblyHistoryHash`, and validates a contract-derived `RouteAssemblyWitness` before route can lock. The witness is bound to escrow contract, chain ID, trade ID, route hash, spendability hash, wall-bundle hash, assembly-history hash, committed item fingerprint, committed inventory lock, and the route gate. The off-chain harness still validates the richer `EvidenceSpendability`, wall-bundle, and assembly graph semantics, so the EVM enforces alignment at the money-moving boundary without pretending it can judge physical-world truth.

Audit clarification (AUD-D1D2-001, AUD-D2-SW-001): route and delivery spendability are now contract-derived typed digests. The contract recomputes each digest from escrow contract, chain ID, trade ID, gate, leg, bound artifact hashes, and issuer, and requires the supplied spendability hash to equal it before the gate advances. Cross-trade and cross-gate replay are therefore blocked on-chain by construction: a digest valid for one trade or gate cannot validate for another. The digest is self-minted by the committing party (issuer = `msg.sender`) — binding and non-replayable, not proof that an independent party authorized the spend. What remains off-chain is the wall-bundle and assembly-history graph coherence: the contract binds those hashes into the digest and witness but does not inspect their internal graph.

### 10. Route

`TradeRoute` defines how the item moves.

Routes can include:

- Standard shipping.
- Insured shipping.
- Signature delivery.
- Local in-person handoff.
- Shop pickup.
- Verifier-forwarded route.
- Non-standard memo or link.

The protocol is route-agnostic. Shipping is not privileged over local handoff.

Route fields can include:

- Carrier.
- Tracking number.
- Insurance amount.
- Declared insurance.
- Signature required.
- Handoff memo.
- Packaging proof refs.
- Route risk owner.

Current EVM rule:

- Route commitment requires item fingerprint.
- Route commitment requires inventory lock.
- Route commitment is blocked by active fingerprint challenge.
- Route commitment requires and consumes spendability hash.
- Route commitment requires and stores route wall-bundle and assembly-history hashes.
- Route commitment validates and stores the route assembly witness.
- Route mutation after lock is rejected.

### 11. Delivery and Inspection

Seller or arbiter submits signed `DeliveryEvidence`.

Delivery opens inspection window.

Buyer can:

- Accept.
- Let inspection window auto-settle.
- Open claim.

### 12. Claim

Claims can cover:

- Wrong condition.
- Wrong item.
- Authenticity concern.
- Missing package.
- Damaged package.
- Underinsurance.
- Route exception.
- Local handoff dispute.
- Seller nonship.

Claim packets should assemble notable evidence:

- Promised.
- Happened.
- Accepted or contested.
- Evidence refs.
- Route refs.
- Insurance refs.
- Verifier notes.
- Buyer statement.
- Seller response.

### 13. Arbitration

Arbiter reviews claim and issues `ArbiterRuling`.

Ruling fields:

- Finding.
- Buyer refund bps.
- Seller escrow payout.
- Seller bond penalty bps.
- Dispute bond disposition.
- Reputation event.
- Evidence refs.
- Reasoning summary.

Arbiters can be replaced:

- Buyer and seller co-sign replacement.
- Emergency replacement after timeout if current arbiter is inactive or revoked.
- Replacement arbiter must accept same proposal hash.

### 14. Settlement and Final Receipt

Settlement closes with:

- Funds released to seller, buyer, or both.
- Bond returned or penalized.
- Dispute bond returned or forfeited.
- Final receipt hash.
- Reputation event.
- Evidence trail preserved.

The final receipt is not just accounting. It is the clean closure packet agents can reference later.

## EvidenceManifest v0.3

Purpose: content-address evidence assets and bind them to a subject.

Important fields:

- `schema`: `marketplace.evidence_manifest.v0.3`
- `trade_id`
- `manifest_id`
- `issuer`
- `issuer_role`
- `evidence_tier`
- `tier_basis`
- `subject`
  - `subject_type`
  - `trade_id`
  - `anchor_hash`
  - `subject_hash`
- `asset_descriptors`
  - asset ID
  - role
  - media type
  - content hash
  - source origin
  - visibility
  - capture mode
  - weak supplemental flag
- `asset_root_hash`
- `known_limits`
- `known_conflicts`
- `verifier_attestation_refs`
- `retention_policy`
- `canonicalization`
- `hash_algorithm`

What the current validator catches:

- Byte switch.
- Mutable URL switch.
- Asset root mismatch.
- Subject hash mismatch.
- Issuer role mismatch.
- Tier inflation.
- Claim retention failure.
- Mutable primary evidence failure.

## EvidenceSpendability v0.1

Purpose: define when evidence can be used as action.

Important fields:

- `schema`: `marketplace.evidence_spendability.v0.1`
- `trade_id`
- `spendability_id`
- `manifest_hash`
- `manifest_subject_hash`
- `manifest_kind`
- `wall_bundle_hash`
- `assembly_history_hash`
- `packet_refs_root`
- `issued_by`
- `issued_role`
- `gate`
  - `gate_type`
  - `gate_id`
  - `leg`
  - `consumption`
- `spendable_claims`
  - `claim_type`
  - `support_level`
  - `spend_limit`
  - `not_claiming`
  - `basis`
- `window`
  - `after_state`
  - `after_event_hash`
  - `waiver_policy`
- `requires`
- `decision_authority`
- `status`
- `issued_at`
- `canonicalization`
- `hash_algorithm`

Gate types currently modeled:

- `route_commitment`
- `challenge_clearance`
- `claim_support`
- `bond_action`

The current on-chain implementation derives route and delivery spendability as typed digests — bound to escrow contract, chain ID, trade ID, gate, leg, bound artifact hashes, and issuer — and requires the supplied hash to equal the contract-derived value before route lock or before inspection opens, alongside the per-trade consumption event and the contract-derived route assembly witness. Cross-trade and cross-gate spendability replay are blocked on-chain by construction. The wall-bundle and assembly-history graph semantics remain off-chain: the contract binds those hashes but does not inspect their internal graph or prove they form a coherent chain. The Python harness still constructs the richer EvidenceSpendability and assembly graph, so a spendability packet without inherited assembly provenance blocks before route lock.

## Trust System

Trust is not a universal score. It is a bundle of weighted proof vectors interpreted through the buyer's aperture.

Legibility is also not a universal score. Evidence shape can be measured as a vector, but aggregation into a decision is judgment. The protocol may enforce vector shape and provenance; the buyer agent owns any policy projection from that vector; the human or mandate owns risk acceptance.

Forbidden protocol move:

```text
coverage + independence + continuity + source history -> 87/100 trust
```

Allowed protocol move:

```text
legibility_vector:
  coverage: high
  independence: medium
  continuity: gap_after_nonce
  scope_fit: route_ready_not_authenticity
  cost_to_fake: moderate
  source_calibration: 7 percent prior claim rate in this cohort
agent_policy_projection:
  projected_claim_rate_bps: 900
  authority_label: judged
```

Calibration is the feedback loop. Receipts and claims let agents measure whether vector-shaped evidence with a named buyer policy actually produced outcomes close to the risk shown to the human. The target is not certainty; it is calibrated uncertainty.

Possible seller proof vectors:

- Marketplace reputation proof.
- eBay account control proof.
- TCGplayer account control proof.
- Card shop website proof.
- Domain-signed nonce.
- Google review correlation.
- Prior protocol receipts.
- Buyer references.
- Shop address proof.
- Bond amount.
- Insurance willingness.
- Fresh custody evidence.

The seller can add any proof. More signed proof is better, but unsigned or weak proof can still inform a buyer agent if presented with its limits.

### External Trust Import

External reputation is observable, not bindable.

The protocol can ask a seller to place a nonce on an outside surface and can
record what was visible there at a specific time. That proves current contact
with the surface, not ownership of its history or the truth of a card.

Imported seller trust should use:

- control proofs: nonce on shop domain, marketplace profile, forum account, or
  public seller surface,
- observation receipts: feedback count, feedback percentage, account age,
  review profile, visible sale-tier distribution, source URL, timestamp, and
  content hash,
- legibility vector: coverage, independence, continuity, scope fit,
  cost-to-fake, and source calibration,
- judged policy projection: friction relief, value-cap relief, or scoped bond
  relief under a buyer policy.

Hard rule:

```text
imported_trust_bond_relief <= estimated_acquisition_cost_of_import_bundle
```

The cap is paired with value-tier scope. Thousands of low-value sales may help a
buyer agent trust that a seller can ship low-value goods, but it should not
waive meaningful bond on a high-value raw vintage card. Seller-controlled
surfaces must be marked as correlated, not independent. Imported trust decays
as native protocol receipts accumulate.

Example: physical card shop proof

- Seller controls a wallet.
- Seller controls a website or domain listed by the shop.
- The website signs or displays a nonce.
- Google reviews or public business listing match the website and location.
- Optional human/shop verification signs a shop record.

Buyer agents decide how much each proof matters.

## ZK and Private Predicates

ZK is not required for alpha, but the protocol reserves space for it.

Useful ZK or private predicate areas:

- Buyer has funds above threshold without revealing full balance.
- Seller has reputation above threshold without exposing full account history.
- Seller controls an account with at least N sales.
- Buyer is in allowed jurisdiction or age category.
- Private reserve price or willingness range.
- Privacy-preserving trust proofs.

Current local harness:

- Uses `PrivatePredicateProof` as signed attestations.
- Accepts predicate evidence only through registered predicate verifier contracts.
- Uses `MarketplacePredicateVerifierStub` as a placeholder.

Future:

- Production circuits can use `circuit_id`, `verifying_key_hash`, `public_inputs`, and `proof_bytes`.

## On-Chain vs Off-Chain Split

The split is not only technical. It is epistemic. The protocol enforces what can be mechanically checked. The judgment layer interprets what remains meaning-heavy, adversarial, or physical-world dependent.

### On-Chain Now

Implemented in `/Users/che/Marketplace/chain`.

- Actor registry with buyer, seller, verifier, arbiter roles.
- Verifier, arbiter, and predicate-verifier authority records.
- EIP-191 packet-signature verification for registered controller addresses.
- Signed packet gates for state-moving hashes.
- Per-trade packet hash replay protection.
- Per-trade spendability consumption plus a contract-derived typed digest (escrow, chain, trade, gate, leg, bound artifact hashes, issuer); same-trade, cross-gate, and cross-trade replay are blocked on-chain. The digest is self-minted (issuer = `msg.sender`): binding, not an independent authorization.
- Native ETH escrow.
- Seller bond.
- Optional buyer dispute bond.
- Two-party arbiter replacement.
- Timeout-gated emergency handoff when current arbiter is inactive.
- Signed delivery evidence before inspection window opens.
- Buyer route-timeout claims when seller commits route then stalls.
- Seller- or verifier-signed item fingerprints before inventory reservation.
- Buyer-scoped verifier approval before verifier-committed fingerprints.
- Buyer-scoped verifier scope approvals before verifier attestations.
- Verifier attestations bound to subject hash, scope-set hash, and method ID hash.
- Seller-signed inventory locks bound to committed item fingerprint.
- Buyer-opened fingerprint challenges blocking route commitment.
- Attestation-bound fingerprint challenge clearance.
- Route commitment requiring and consuming a spendability packet hash and validating a typed route assembly witness.
- Active item-fingerprint collision checks.
- Active inventory-lock collision checks.
- Delivery, inspection, acceptance, claim, resolution, and settlement events.
- Protocol gap negative drill proving a compliant EVM settlement can still coexist with a hidden physical-world counterfeit oracle without overclaiming authenticity.
- Legibility calibration drill proving vector-shaped evidence stays unaggregated and projected risk is checked against settled outcomes.

### Off-Chain By Design

- Human-readable cost fields.
- Agent mandates.
- Full evidence bytes.
- Photos, scans, video, tracking pages, insurance docs.
- Marketplace proof chains.
- Google/business reputation evidence.
- Verifier narratives.
- Arbiter candidate sets.
- Arbitration narratives.
- Agent decision traces.
- Full EvidenceManifest schema validation.
- Full EvidenceSpendability schema validation.
- ZK proof generation and verification, for now.

## Enforcement vs Judgment Boundary

This section is a guardrail against overclaim. "Typed" does not mean "true." "Signed" does not mean "honest." "Anchored" does not mean "sufficient." The protocol should always expose whether a fact was mechanically enforced, merely made legible, or left to intelligent judgment.

Three additional boundaries are load-bearing for the alpha:

1. Deterministic does not mean enforced. A local catalog tool, exact search result, image matcher, pricing crawler, or agent validator can be consistent and still remain legible logic rather than spendable truth.
2. Accountability is economic. A bond, fee, identity proof, verifier note, or arbiter policy only deters fraud if the expected loss for cheating is greater than the expected gain and the remedy can actually be applied.
3. Judgment requires supply. A registry-listed verifier or arbiter is not enough; the trade needs a scoped provider, response window, fee source, remedy cap, conflict disclosure, and fallback path.

### Protocol Can Enforce

These are suitable for smart contracts, deterministic validators, or strict agent policy checks:

- Actor address is registered for a role.
- Actor signature matches a packet hash.
- Packet hash is nonzero.
- Packet hash has not already been used in the same trade.
- Escrow is funded.
- Seller bond is posted at the required amount.
- Buyer dispute bond is posted when required.
- Trade is in the required state before a transition.
- Item fingerprint hash exists before inventory lock.
- Inventory lock is signed and bound to the committed item fingerprint.
- Same active item fingerprint hash cannot back two open trades.
- Same active inventory lock hash cannot back two open trades.
- Active fingerprint challenge blocks route commitment.
- Route commitment cites and consumes a spendability hash.
- Route commitment validates and stores a typed route assembly witness.
- Typed spendability digest fields match trade, gate, leg, contract, issuer, and expiry once implemented.
- Delivery evidence hash is signed before inspection opens.
- Inspection timeout has elapsed.
- Claim or route-timeout windows are open or closed.
- Arbiter is currently registry-active.
- Replacement arbiter proposal satisfies signature, timeout, inactive-arbiter, and acceptance rules.
- Ruling payout math does not exceed escrow, bond, or dispute-bond balances.
- Final receipt or ruling hash is anchored.

### Protocol Can Make Legible But Not Decide Alone

These can be represented as typed packets, manifests, claims, and attestations. They become easier to inspect, compare, dispute, and arbitrate, but the protocol should not pretend the typed object settles the truth by itself.

- Deterministic catalog, image, pricing, and evidence-plan outputs.
- Seller reputation from eBay, TCGplayer, Google, shop domain, prior receipts, or social proof.
- Whether a shop proof chain is persuasive for this buyer.
- Whether a marketplace account-control proof really belongs to the same seller identity over time.
- Whether photos plausibly show the claimed card.
- Whether a fresh nonce photo proves current possession strongly enough.
- Whether slab cert correlation means anything beyond public-record correlation.
- Whether raw-card condition photos are sufficient for the stated condition floor.
- Whether packaging evidence is enough for the route value.
- Whether tracking data, signature, or handoff memo is enough to establish delivery.
- Whether underinsurance was seller negligence or buyer-accepted risk.
- Whether missing evidence should be treated as harmless, suspicious, or dispositive.
- Whether a verifier stayed inside the "not claiming" boundary.
- Whether an automated arbiter recommendation is appropriate or must escalate.
- Whether a bond amount adequately prices trust, route, and condition risk.
- Whether posted bond, seller identity cost, and remedy cap make fraud uneconomic.
- Whether verifier or arbiter availability is operationally sufficient for this trade.
- Whether a legibility vector is calibrated against settled outcomes for this buyer policy and value tier.

### Judgment Layer Must Decide

These remain human/agent/arbiter/verifier judgments. The protocol should require explicit claims, evidence, scope, and accountability around them; it should not hide them behind deterministic language.

- Authenticity of a physical card.
- Whether the shipped object is the same object shown in pre-route evidence.
- Whether condition is NM, LP, MP, damaged, altered, or misdescribed.
- Whether a buyer's claim is opportunistic or good-faith.
- Whether a seller cure actually resolves a challenge.
- Whether a verifier was competent, conflicted, careless, or collusive.
- Whether an arbiter's policy is fair for the trade category and value.
- Whether the economics deter a rational bad actor.
- Whether a verifier, arbiter, or automated arbiter is worth trusting for the specific scope.
- Whether seller curation should be trusted.
- Whether a buyer should accept weak evidence in exchange for lower price.
- Whether a claim deserves partial refund, full refund, bond penalty, or denial.
- Whether a dispute requires human escalation despite satisfying automation thresholds.

### Required Display Rule

Every buyer- or seller-facing agent summary should label important claims with one of three statuses:

```text
enforced: mechanically checked by contract or deterministic validator
legible: represented as signed/typed evidence but still judgment-dependent
judged: decided by buyer, seller, verifier, arbiter, or agent policy
```

Example:

```text
The seller's bond is enforced.
The seller's shop proof is legible.
The claim that the card is LP or better is still judged.
```

This display rule is especially important for verifier attestations and spendability. A spendability packet can enforce that a gate had permission to advance. It does not, by itself, prove that the evidence was true, sufficient, or fair.

The same rule applies to deterministic tools. A `low_friction_pass`, exact catalog match, price band, or image similarity result is legible tool output unless another packet makes it spendable at a gate. Agents must not promote repeatability into authority.

The same rule applies to legibility vectors. A vector can measure coverage, independence, continuity, scope fit, cost-to-fake, and source calibration. It cannot contain a score, verdict, grade, or probability of truth. Any decision derived from it must be labeled `judged`.

## Protocol Walls Agent Testbed

The next build target is a wall-first simulation harness for agents. The point is to let buyer agents, seller agents, verifier agents, arbiter agents, and adversarial seller agents press intention against the protocol and report exactly where the wall held.

Primary artifact:

- `Protocol_Walls_Agent_Testbed.md`
- `Protocol_Walls_v0.1.md`
- `runs/protocol_wall_pressure_20260520T022928Z/REPORT.md`

Role cards:

- `agent_instructions/wall_runner.md`
- `agent_instructions/buyer_agent.md`
- `agent_instructions/seller_agent.md`
- `agent_instructions/adversarial_seller_agent.md`
- `agent_instructions/verifier_agent.md`
- `agent_instructions/arbiter_agent.md`
- `agent_instructions/protocol_observer_agent.md`

Every simulation turn should return:

```text
intended_action:
protocol_state:
enforced_facts:
legible_evidence:
judgment_needed:
risk_or_attack_surface:
next_valid_actions:
human_question_if_any:
```

The wall discovery log should capture:

```text
wall_id:
trade_id:
agent:
attempted_action:
wall_label: enforced | legible | judged
result: blocked | allowed | escalated | accepted | disputed
missing_packet_or_judgment:
protocol_delta_needed:
notes:
```

This makes the protocol falsifiable by agent behavior. If agents repeatedly treat a legible claim as enforced, that is a UI/instruction failure. If adversarial agents can advance state while preserving semantic ambiguity, that is a missing wall. If honest agents keep needing human judgment in the same place, that is either a needed protocol wall or a domain judgment that should be named and priced.

## Protocol Gaps Negative Testbed

The walls testbed asks whether a digital attack can cross a gate. The gaps testbed asks whether the project is honest about what no digital gate can close.

Primary artifacts:

- `Protocol_Gaps_v0.1.md`
- `chain/script/protocol_gap_negative_drill.py`

The first gap drill runs protocol-compliant EVM settlement paths while a hidden physical-world oracle marks the card as counterfeit or materially false. A passing drill means:

- packets validate,
- route gates and settlement complete,
- no packet claims the protocol proved authenticity,
- the report names the permanent gap,
- the signed residue is sufficient for later judgment, deterrence, insurance, arbitration, or reputation.

This drill should remain passing. If a future change makes it fail by claiming the protocol closed bytes-to-atoms truth, that is an overclaim alarm.

## Protocol Legibility Calibration Testbed

The legibility testbed asks whether evidence instruments are calibrated rather than merely confident.

Primary artifacts:

- `Protocol_Legibility_v0.1.md`
- `simulations/legibility_calibration_drill.py`

The first calibration drill uses simulated settled cohorts to verify:

- legibility vectors contain dimensions, not scores,
- each dimension preserves `not_claiming`,
- buyer policy projection is a separate judged packet,
- observed claim rates stay near projected claim rates,
- score-laundering attempts are blocked.

This drill does not prove truth. It tests whether uncertainty is being shown honestly.

## Protocol Bootstrap Testbed

The bootstrap testbed asks whether the alpha wedge is operationally coherent for sellers.

Primary artifacts:

- `Protocol_Bootstrap_v0.1.md`
- `simulations/seller_bootstrap_drill.py`

The first bootstrap drill verifies:

- fiat payment is not treated as final settlement,
- stablecoin escrow preserves issuer, blacklist, custody, off-ramp, and regulatory caveats,
- buyer seriousness is represented by funded escrow,
- seller attention is priced before extra work,
- new sellers can substitute scoped bond for missing history,
- clean receipts, imported proof, or underwriters can reduce but not erase bond,
- "bonded seller is safe" is blocked as an overclaim.

This is the seller-facing complement to buyer intent. The product claim is not "more crypto." It is "irreversible money with escrow, bonds, evidence, inspection, and receipts."

## Protocol External Trust Import Testbed

The trust-import testbed asks whether a seller can reuse outside reputation
without laundering it into protocol-native trust.

Primary artifacts:

- `Protocol_Trust_Import_v0.1.md`
- `simulations/external_trust_import_drill.py`

The first import drill verifies:

- current account/domain control is not ownership of account history,
- seller-controlled channels are correlation, not independence,
- low-value feedback cannot justify high-value bond relief,
- imported bond relief is capped by estimated acquisition cost,
- positive exit-scam expected value becomes a visible need for more bond or a lower value cap,
- source and platform terms fragility remains visible.

This is the seller onboarding bridge. It should make good sellers easier to
start with, while making bought accounts and scope laundering economically
legible.

## Protocol Catalog Lineage Testbed

The catalog-lineage testbed asks whether agents can grow a catalog without
quietly corrupting it.

Primary artifacts:

- `Protocol_Catalog_Lineage_v0.1.md`
- `scripts/pin_no_rarity_catalog.py`
- `simulations/catalog_evolution_drill.py`

The first catalog evolution drill verifies:

- the No Rarity fact catalog is cited by content hash, not file location,
- evidence requirements are split into a separate policy hash,
- card references can cite `(catalog_hash, row_id)`,
- a good revision survives unevidenced sybil noise,
- a poisoned basic-Energy premium proposal is blocked,
- a Quick Starter scope-laundering proposal is flagged,
- a URL-only source without content hash is blocked.

This makes the No Rarity catalog an agent-readable substrate that can outgrow
its author without becoming a wiki-style trust blob.

## Current Solidity Contracts

### MarketplaceActorRegistry

Purpose:

- Register active actors and roles.
- Register arbiter authority.
- Register verifier authority.
- Register predicate verifier contracts.
- Verify EIP-191 signatures from registered actor controllers.

### MarketplaceEscrow

Purpose:

- Create trade.
- Accept seller bond.
- Attach proof and evidence.
- Attach predicate evidence.
- Commit item fingerprint.
- Approve verifier scope.
- Commit verifier attestation.
- Commit inventory lock.
- Open and clear fingerprint challenge.
- Commit route with spendability hash, route wall-bundle hash, assembly-history hash, and route assembly witness.
- Mark route in progress.
- Mark delivered.
- Open route-timeout claim.
- Buyer accept.
- Open claim.
- Resolve claim.
- Replace arbiter.
- Settle.

Recent hardening:

- `commitRoute(uint256,bytes32,bool,bool,uint256,bytes)` now reverts with `SpendabilityRequired`.
- `commitRoute(uint256,bytes32,bytes32,bool,bool,uint256,bytes)` now reverts with `WallBundleRequired`.
- `commitRoute(uint256,bytes32,bytes32,bytes32,bool,bool,uint256,bytes)` now reverts with `AssemblyHistoryRequired`.
- New `commitRoute(uint256,bytes32,bytes32,bytes32,bytes32,bytes32,bool,bool,uint256,bytes)` requires nonzero spendability hash, wall-bundle hash, assembly-history hash, and the contract-derived typed route assembly witness.
- Contract records `consumedSpendabilityHashes`.
- Contract anchors the spendability hash as a packet hash.
- Contract stores `routeWallBundleHash`, `routeAssemblyHistoryHash`, and `routeAssemblyWitnessHash`; it emits `RouteWallBundleCommitted` and `RouteAssemblyCommitted`.
- Contract emits `SpendabilityConsumed`.
- Off-chain route spendability now cites both `wall_bundle_hash` and `assembly_history_hash`; route lock is blocked when spendability has no inherited assembly provenance.

### MarketplacePredicateVerifierStub

Purpose:

- Stub verifier contract for private predicate hooks in local testing.

## Current Test Coverage

Most recent local checks:

- `forge test --match-contract MarketplaceEscrow`: 74 passing tests.
- `python3 script/protocol_e2e.py`: 3 E2E scenarios settled. Latest report: `runs/local_evm_protocol_20260609T155326Z/REPORT.md`.
- `python3 script/spendability_gate_bypass_drill.py`: old no-spendability route call blocked.
- `python3 script/fingerprint_collision_drill.py`: semantic collision drill passes. Latest report: `runs/fingerprint_collision_drill_20260609T155311Z/REPORT.md`.
- `python3 script/wall_bundle_route_spendability_drill.py`: route lock succeeds only after valid wall-bundle, assembly history, spendability, and route assembly witness. Latest report: `runs/wall_bundle_route_spendability_drill_20260609T155310Z/REPORT.md`.
- `python3 script/replay_agent_sim_trades.py`: 10 selected simulated trades settled through the assembly-aware route lock. Latest report: `runs/agent_market_evm_replay_20260609T155316Z/REPORT.md`.
- `python3 simulations/protocol_wall_pressure_sim.py --out-dir runs/protocol_wall_pressure_pokemon_alpha_check`: Pokemon alpha walls pass.
- `python3 simulations/protocol_agent_api_probe.py --out-dir runs/protocol_agent_api_probe_route_assembly_witness_20260609T1555`: agent-facing API probe passes with route assembly witness required for route lock.
- `python3 simulations/access_assembly_audit.py --out-dir runs/access_assembly_audit_route_assembly_witness_20260609T1555`: assembly-layer audit passes with the spendability-without-assembly falsifier blocked.
- `python3 simulations/unified_stress_runner.py --samples 250 --evm-sample 3 --outdir runs/unified_stress_route_assembly_witness_evm_20260609T1601`: unified stress pass; EVM sub-sample was skipped by runner because no route-ready trades were selected in that random sample.
- `python3 -m py_compile ...`: Python runners compile.

Most recent reports:

- `/Users/che/Marketplace/runs/local_evm_protocol_20260520T030915Z/REPORT.md`
- `/Users/che/Marketplace/runs/wall_bundle_route_spendability_drill_20260520T030358Z/REPORT.md`
- `/Users/che/Marketplace/runs/fingerprint_collision_drill_20260520T030956Z/REPORT.md`
- `/Users/che/Marketplace/runs/agent_market_evm_replay_20260520T031055Z/REPORT.md`
- `/Users/che/Marketplace/runs/protocol_wall_pressure_pokemon_alpha_check/REPORT.md`
- `/Users/che/Marketplace/runs/protocol_agent_api_pokemon_alpha_check/REPORT.md`
- `/Users/che/Marketplace/runs/spendability_gate_bypass_drill_20260519T181706Z/REPORT.md`
- `/Users/che/Marketplace/runs/fingerprint_collision_drill_20260519T181718Z/REPORT.md`
- `/Users/che/Marketplace/runs/evidence_manifest_v0_3_drill_20260519T180645Z/REPORT.md`

## Tested E2E Scenarios

### Happy Path, Insured Card

Flow:

- Buyer creates funded intent.
- Seller posts bond.
- Seller attaches trust proof.
- Private predicates are accepted.
- Seller attaches item evidence manifest.
- Buyer approves verifier scope.
- Verifier commits scoped review.
- Seller commits item fingerprint.
- Seller commits inventory lock.
- Seller commits route with spendability hash, route wall-bundle hash, assembly-history hash, and route assembly witness.
- Seller marks route in progress.
- Seller marks delivered.
- Buyer accepts.
- Trade settles.

What it proves:

- Low-friction trade can close without over-asking for seller attention.
- Signed packets can become deterministic hashes enforced by money rail.
- Route spendability is consumed, the wall-bundle and assembly-history references are stored, and the route assembly witness is validated before route lock.

### New Seller Material Claim

Flow:

- New seller offers weak trust proof.
- Seller posts larger bond.
- Evidence manifest is validated.
- Buyer opens fingerprint challenge.
- Buyer clears challenge with waiver packet.
- Seller commits uninsured route with route spendability.
- Buyer receives item and opens condition claim.
- Verifier note enters as scoped attestation.
- Arbiter resolves partial refund and bond penalty.
- Trade settles.

What it proves:

- Weak trust does not become a scalar score. It becomes a typed gap.
- Bond can compensate for trust deficit.
- Claim packet and ruling preserve a clean evidence trail.

### Revoked Arbiter Emergency Replacement

Flow:

- Trade starts with arbiter.
- Claim opens.
- Arbiter is revoked.
- Buyer proposes replacement.
- Seller does not co-sign.
- Timeout passes.
- Replacement arbiter accepts same proposal hash.
- Replacement arbiter resolves.
- Trade settles.

What it proves:

- Revoked authority cannot resolve stale claims.
- Liveness path exists after timeout.
- Replacement arbiter must sign acceptance.

## Fraud and Collision Drills

### Spendability Bypass Drill

The drill attempted to call old `commitRoute` without spendability.

Current result:

- Reverted as expected.
- Trade remained in `EvidencePending`.

Meaning:

- The first hard spendability boundary exists on-chain.

### Fingerprint Collision Drill

Cases:

- Exact hash collision: blocked on-chain.
- Same cert reuse: verifier cure accepted, route allowed.
- Stale prior-market photo: verifier rejects, route stays blocked.
- Mixed front/back: verifier escalates, route stays blocked.
- Same front/different back: buyer challenge blocks route.
- Same-card crop alias: buyer challenge blocks route.
- Fresh nonce control: route allowed.

Meaning:

- Hash equality is enforced on-chain.
- Semantic similarity remains an agent/verifier job.
- Suspicious patterns become challenge packets before route.

## Invariants

Rules that should not break:

- No unverifiable signature: every signed object must resolve to active actor authority.
- No scalar trust collapse: trust retains source, scope, freshness, issuer, and claim.
- No release without gate: escrow cannot release unless the release gate is satisfied or explicitly waived.
- No route without assembly: route commitment must cite and consume a spendability packet hash, store route wall-bundle and assembly-history hashes, and validate a route assembly witness.
- No untyped object: inventory cannot be reserved until item fingerprint exists.
- No challenged route: active fingerprint challenge blocks route commitment.
- No silent semantic collision: suspicious item identity collisions become challenge, waiver, or verifier cure.
- No stray verifier: verifier cannot attach loose evidence or review without buyer-scoped approval.
- No scope laundering: verifier attestation travels with checked scopes and exclusions.
- No unbound proof: proof cannot satisfy gate unless bound to trade ID, subject hash, or challenge nonce.
- No hidden underinsurance: owner of value gap must be typed before route commitment.
- No hidden bond gap: bond coverage must disclose amount and fraction of value.
- No route mutation: seller route changes after lock require buyer acceptance.
- No vague bond: bond scope defines promises, exclusions, adjudicator, and payout path.
- No undefined arbiter: arbiter must be registry-listed, conflict-disclosed, and accepted in terms.
- No unbounded arbiter agent: arbiter agent needs signed delegation and escalation rules.
- No frictionless ambiguity: automation runs until friction threshold, then escalates.
- No invisible AI ruling: automated decisions cite policy, evidence, confidence, and appeal path.
- No random replacement: arbiter replacement follows accepted set, timeout, inactive-arbiter, and acceptance gates.
- No free dispute griefing: dispute bond or equivalent friction controls frivolous claims.
- No all-or-nothing failure: protocol supports partial refunds, bond penalties, route claims, and replacement arbiters.
- No missing packet: final receipt or ruling must point to the relevant packet trail.
- No boundary confusion: every important claim must be displayed as enforced, legible, or judged.

## Known Gaps

Not yet proven or implemented:

- DID key rotation.
- Delegated agent signatures.
- Production ZK circuits.
- ERC-20 or stablecoin escrow.
- Multi-agent negotiation connected directly to EVM runner.
- Full EvidenceSpendability schema validation on-chain.
- Solidity `evidenceManifestHash` helper.
- Production image matching.
- PSA/SGC/BGS API integration.
- Real shipping carrier integration.
- Real insurance claim integration.
- Real marketplace reputation proof integrations.
- Verifier conflict adjudication.
- Verifier- or arbiter-opened fingerprint challenge rails.
- Long-lived reputation feedback from protocol receipts.
- Governance token design.
- Agent-delegated governance.
- Wallet-transfer-resistant trust semantics.
- Production UX for buyer and seller agents.
- Typed spendability replay resistance across gate, trade, leg, schema, authority, and subject context.
- Route claim taxonomy for nonship, lost, damaged, empty-box, underinsurance, local handoff, and signature mismatch paths.
- Buyer-side claim evidence templates to resist false condition, swapped return, and package-evidence fraud.
- Seller cure workflow after fingerprint challenge.
- Arbiter policy binding by policy hash, fee schedule hash, remedy cap, and escalation rules.
- Scoped bond schedule that defines covered promises and exclusions.
- Encrypted evidence bundles and access grants for private shipping, identity, shop, and collection data.

## Next Hardening Targets

P0 before real alpha:

1. Finish typed `EvidenceSpendability` digest validation beyond the current route assembly witness.
2. Add Solidity/off-chain paired tests proving spendability cannot replay across trade, gate, leg, subject, authority, schema, expiry context, wall bundle, or assembly history.
3. Add route claim taxonomy: seller nonship, shipped late, lost package, damaged package, empty package, tracking delivered but buyer denies receipt, underinsured shipment, local handoff dispute, wrong signature, and route changed without buyer acceptance.
4. Add buyer-side claim evidence templates: delivery timestamp, package exterior photos, opening video for high value, immediate item photos, return-leg fingerprint, return tracking, and return packaging proof.
5. Add seller cure workflow after fingerprint challenge.
6. Bind trades to arbiter policy hash, fee schedule hash, remedy cap, automation allowance, human escalation rules, and availability window.
7. Define scoped seller bond schedule and default remedy schedule for TCG claims.
8. Add `DeterministicToolBoundary` packets so No Rarity catalog, image, pricing, and evidence-plan outputs cannot leak into intent, route, claim, bond, reputation, or settlement authority.
9. Add an `EconomicDeterrenceProfile` and adversarial seller simulation that compares expected fraud profit against bond loss, identity cost, verifier/remedy liability, detection assumptions, and dispute friction across price tiers.
10. Add `JudgmentSupplyCommitment` packets for verifier and arbiter availability, scope, fee source, conflict disclosure, remedy cap, escalation trigger, and fallback/replacement path.
11. Add `LegibilityVectorIntegrity` packets and calibration drills so evidence coverage, independence, continuity, scope fit, cost-to-fake, and source calibration stay vector-shaped instead of becoming a composite trust score.
12. Add `SettlementRailTerms` and stablecoin/ERC-20 escrow for real alpha, including issuer, blacklist, custody, off-ramp, and regulatory caveats.
13. Add `BondHistoryExchange` and seller bootstrap drills so bond requirements fall only through clean receipts, imported proof, or accountable underwriting.
14. Add `ExternalTrustImport` packets and drills so marketplace/shop/social reputation is bounded by current control, value-tier scope, acquisition-cost cap, source fragility, decay, and later native receipts.
15. Add catalog lineage anchors and drills so card references cite `(catalog_hash, row_id)`, evidence policy remains separate, and agent-authored revisions survive evidence-weighted challenge rather than agent-count voting.

P1 for credible pilots:

1. Seller proof reuse system.
2. Shop, domain, and marketplace account-control proof templates.
3. Encrypted evidence access controls.
4. Verifier conflict disclosure packets.
5. Human-readable "not claiming" summaries for verifier attestations.
6. Agent API that hides packet complexity.
7. Bond underwriting actor templates.

P2 defer:

1. Production ZK.
2. Governance token.
3. Broad marketplace reputation score.
4. Fully decentralized arbiter discovery.
5. General physical-goods expansion.
6. Automated high-value arbitration.

Minimum typed spendability digest fields:

```text
schemaVersion
chainId
escrowContract
tradeId
manifestHash
manifestSubjectHash
wallBundleHash
assemblyHistoryHash
packetRefsRoot
gateType
gateId
leg
consumptionMode
issuedBy
issuedRole
decisionAuthority
expiry
status
```

## Product Shape

The likely alpha product should be an agent skill/API, not a standalone consumer marketplace at first. The aperture is now narrower: start with buyer-funded wants for $100-$2,000 Pokemon single-card trades from curated semi-professional sellers, shops, and known collectors.

Why:

- Few buyers currently use agents to buy goods, but that group is the future wedge.
- The protocol is agentic by nature: intent, negotiation, evidence probing, and arbitration all benefit from agents.
- A bootstrap foundation can provide a default buyer/seller agent while remaining protocol-neutral.
- Card shops and dealers can bootstrap trust and inventory before a broad consumer network exists.
- Curated sellers create trustworthy early receipts faster than fully open P2P.

Pokemon Alpha version:

- Start with collectors who already hunt for specific $100-$2,000 cards.
- Let them post funded wants.
- Let curated sellers and shops answer.
- Let seller reputation come from reusable evidence chains.
- Hide protocol machinery behind seller templates.
- Let route, evidence, bond, and arbitration requirements scale by value and trust gap.
- Reject or defer non-Pokemon domains during alpha instead of pretending the evidence profile is already portable.

The card show metaphor remains useful, but it should not dominate the protocol pitch.

Better pitch:

> A Pokemon card market where funded intent appears before inventory, agents negotiate the messy trust layer, and escrow only moves when the right signed evidence becomes spendable.

Seller-facing pitch:

> Respond to funded demand, reuse your proof, pay lower fees, and get a clean receipt that improves future trust.

Avoid pitching sellers on "a decentralized evidence and arbitration protocol." They should see funded demand, reusable proof, lower fees, clearer rules, and faster or safer payout.

## Minimal Agent API

The user-facing API should expose trade actions, not packet schemas.

API invariant:

```text
trajectory_capacity cannot move funds, route, bond, claim, or reputation by itself.
assembly_placement can become spendable only at the named gate.
```

Every action response should expose:

```text
action:
trade_id:
decision:
cost_dimensional_integrity:
  native_dimensions:
  scalar_summary:
  reversible:
human_availability:
  available_before_deadline:
  response_window:
  default_action_if_unavailable:
currency_integrity:
memory:
  trajectory_capacity:
  assembly_placement:
spendability:
  gate:
  required:
  present:
  missing:
packet_commitments:
  wall_bundle_hash:
  assembly_history_hash:
  packet_refs:
  route_spendability_hash:
  placement_integrity:
walls:
enforced_facts:
legible_evidence:
judgment_needed:
packets_required:
packets_to_generate:
human_question_if_any:
```

Primary API artifact:

- `Protocol_Agent_API_v0.1.md`
- `simulations/protocol_agent_api.py`
- `simulations/protocol_wall_packets.py`
- `runs/protocol_agent_api_pokemon_alpha_check/REPORT.md`
- `chain/script/wall_bundle_route_spendability_drill.py`
- `chain/script/protocol_gap_negative_drill.py`
- `simulations/legibility_calibration_drill.py`
- `simulations/seller_bootstrap_drill.py`
- `runs/wall_bundle_route_spendability_drill_20260520T030358Z/REPORT.md`

Trade actions:

```text
createIntent()
listMatchingSellerResponses()
requestEvidence()
quoteEvidenceRequestFee()
acceptEvidenceRequestFee()
attachCostDimensionalTrace()
updateHumanAvailability()
acceptOfferAndFundEscrow()
sellerSubmitOffer()
sellerCommitItem()
sellerLockInventory()
sellerCommitRoute()
markDelivered()
buyerAccept()
openClaim()
submitClaimEvidence()
resolveClaim()
settle()
getReceipt()
```

Buyer-agent methods:

```text
evaluateOffer(intent, offer, evidence, sellerTrust, route)
recommendEvidenceRequest(valueMap, trustGap)
recommendAttentionFee(request, sellerPolicy, buyerSeriousness)
recommendBond(value, trustGap, routeRisk)
summarizeRiskForHuman()
```

Seller-agent methods:

```text
reuseSellerProof()
prepareCardEvidence()
quoteEvidenceRequestFee()
estimateRequiredBond()
explainBuyerEvidenceRequest()
submitOffer()
manageInventoryLock()
```

Arbiter-agent methods:

```text
assembleCaseFile()
classifyClaimType()
checkRequiredEvidence()
suggestPolicyRemedy()
flagHumanEscalation()
```

Underneath, these actions generate packets, signatures, manifests, spendability packets, and on-chain calls.

## Questions For ChatGPT Pro

Ask the reviewer to pressure test:

1. Is the spendability model coherent, or does it duplicate existing capability systems?
2. Resolved (2026-06-11, AUD-D1D2-001): route and delivery spendability are now validated on-chain as typed digests; cross-trade and cross-gate replay are blocked by construction. Wall-bundle and assembly-history graph coherence remain off-chain.
3. What is the minimal viable agent API for buyer intent and seller response?
4. What trust proofs should be prioritized for TCG sellers: marketplace account control, shop domain proof, prior receipts, bonds, or verifier attestations?
5. How should arbiter discovery and availability work without centralizing the protocol?
6. How much arbitration can be automated for low-value trades before users stop trusting it?
7. What is the narrowest alpha aperture that still produces real market action?
8. Which schema fields are intentionally Pokemon-only for alpha and should be marked as future generalization?
9. What are the major fraud paths still open after item fingerprint, inventory lock, verifier scope, and spendability gates?
10. What would a seller actually need in order to use this without hating it?

## One-Page Pitch

Marketplace Protocol lets buyers express funded intent for Pokemon cards, lets sellers answer with typed inventory and evidence, and lets agents negotiate the trust layer without forcing every cost into a platform score.

The protocol keeps photos, scans, reputation, shipping, insurance, and arbitration narratives off-chain as signed packets, while Ethereum anchors the money, bonds, actor authority, object locks, route gates, claims, and settlement events.

The key primitive is spendability: evidence can exist as memory, but it cannot move the trade until a signed permission packet makes that evidence admissible at a specific gate.

Pokemon TCG is the alpha aperture because card identity, condition, seller trust, route risk, insurance, and dispute evidence are already legible to collectors. General physical goods remain the long-range thesis, not the alpha promise.
