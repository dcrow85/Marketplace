# Marketplace Protocol External Review Synthesis

Generated from the ChatGPT Pro review pasted on 2026-05-19.

## Bottom Line

The protocol is conceptually strong but operationally fragile. Its strongest primitive is the separation between evidence as durable memory and spendability as permission to use evidence at a specific gate. Its weakest current boundary is that Solidity mostly proves a hash was cited and consumed, while full schema meaning, verifier honesty, arbiter quality, and seller usability remain off-chain.

The review's main strategic warning is blunt and useful: the project is trying to solve agentic negotiation, physical-good fraud, and decentralized arbitration at the same time. The alpha should constrain two of those with templates, caps, and defaults while proving one narrow path end to end.

## Strongest Ideas

- On-chain/off-chain split is correct for physical goods.
- Spendability is a real protocol primitive, not just UX language.
- Fingerprint-before-inventory-lock is a meaningful anti-vagueness gate.
- Buyer-scoped verifier approval prevents scope laundering.
- Arbiter replacement is necessary for liveness.
- TCG is a good aperture if narrowed to mid-to-high-value cards where evidence costs are already painful.

## Central Product Risk

The protocol may create beautifully typed evidence trails that sellers do not want to create and buyers do not want to inspect.

Seller alpha UX must feel like:

> I can respond to funded buyer demand in two minutes, reuse my proof, upload photos once, ship normally, and get paid faster or cheaper than eBay or TCGplayer.

It must not feel like:

> I need to understand packet schemas, spendability, verifier scopes, challenge windows, arbiter policies, bond semantics, and route commitments.

## P0 Hardening Before Real Alpha

1. Add typed spendability digest validation.
2. Add route claim taxonomy.
3. Add seller cure workflow.
4. Add buyer-side fraud evidence requirements.
5. Bind trades to arbiter policy hash, not just arbiter identity.
6. Define bond scope and default bond schedule.

## P1 For Credible Pilots

1. Seller proof reuse system.
2. Shop, domain, and marketplace account-control proof templates.
3. Encrypted evidence access controls.
4. Verifier conflict disclosures.
5. Human-readable "not claiming" summaries for verifier attestations.
6. Stablecoin or ERC-20 escrow.
7. Agent API that hides packet complexity.

## P2 Defer

1. Production ZK.
2. Governance token.
3. Broad marketplace reputation score.
4. Fully decentralized arbiter discovery.
5. General physical-goods expansion.
6. Automated high-value arbitration.

## Typed Spendability Digest

The current nonzero spendability hash requirement is the first hard boundary, but the next version should derive the consumed digest from typed minimum fields.

Minimum digest fields:

```text
schemaVersion
chainId
escrowContract
tradeId
manifestHash
manifestSubjectHash
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

This prevents:

- Cross-gate replay.
- Cross-trade replay.
- Cross-leg confusion.
- Schema downgrade.
- Authority confusion.
- Subject mismatch.
- Overclaiming.

For alpha, arbitrary spendability should be rejected. Start with a small template set:

1. `ROUTE_COMMITMENT_FORWARD`
2. `CLAIM_SUPPORT_FORWARD`
3. `BOND_ACTION_ARBITER`

## Route Claim Taxonomy

"Route problem" is too vague. Split into typed claim paths:

- Seller nonship.
- Shipped late.
- Lost package.
- Damaged package.
- Empty package.
- Tracking delivered but buyer denies receipt.
- Underinsured shipment.
- Local handoff dispute.
- Wrong signature or no signature.
- Route changed without buyer acceptance.

Each route claim type should define:

- Required evidence.
- Default remedy.
- Bond relevance.
- Insurance relevance.
- Human escalation threshold.

## Buyer-Side Fraud Evidence

Seller fraud is not the only threat. Buyer-side fraud paths include correct-card receipt followed by false condition claim, swapped return card, or staged package evidence.

High-value disputes should require templates such as:

- Delivery timestamp.
- Package exterior photos.
- Opening video.
- Immediate item photos.
- Return-leg fingerprint.
- Return tracking.
- Return packaging proof.

## Seller Cure Workflow

Fingerprint challenge must not become a griefing tool.

Minimal cure path:

1. Challenge opened.
2. Seller submits cure evidence.
3. Verifier or arbiter reviews cure.
4. Buyer accepts, waives, or escalates.
5. Route unlocks, trade unwinds, or dispute opens.

## Arbiter Policy Binding

Trades should bind to policy, not only identity.

Recommended fields:

```text
arbiter_id
policy_hash
fee_schedule_hash
remedy_cap
automation_allowed
human_escalation_rules
availability_window
```

Arbitration is the real backstop in contested physical-good trades. Typed evidence makes arbitration cheaper and clearer, but does not replace judgment.

## Bond Economics

Bond must be scoped and risk-adjusted.

Inputs:

- Item value.
- Seller reputation strength.
- Proof freshness.
- Route risk.
- Condition ambiguity.
- Inventory uniqueness.
- Dispute history.
- Insurance coverage.
- Seller type: shop, dealer, unknown individual.
- Claim types covered.

Bond should explicitly cover or exclude:

- Nonshipment.
- Wrong item.
- Material condition mismatch.
- Underinsurance.
- Route negligence.
- Failure to provide required evidence.
- Bad-faith dispute conduct.

## Product Boundary

Core protocol can stay general:

- Actors.
- Escrow.
- Bonds.
- Packets.
- Evidence manifests.
- Spendability.
- Route.
- Claim.
- Ruling.
- Receipt.

Alpha product should be TCG-specific:

- `TCGCardIdentityClaim`
- `TCGConditionClaim`
- `TCGPhotoEvidenceManifest`
- `TCGSlabCertCorrelation`
- `TCGRouteTemplate`
- `TCGConditionClaimPacket`
- `TCGArbiterPolicy`

Core generic fields:

```text
object_identity_claim
condition_or_quality_claim
domain_taxonomy_ref
evidence_requirement_profile
route_requirement_profile
claim_policy_ref
```

## Minimal Viable Alpha

The narrowest credible alpha:

> Buyer-funded wants for $100-$2,000 Pokemon cards from curated semi-professional sellers, shops, and known collectors.

Avoid:

- Ultra-low-value cards where evidence overhead is not worth it.
- Very high-value cards where legal/custody/arbitration expectations become heavy.
- Fully open P2P before the protocol has good early receipts.

Alpha flow:

1. Buyer creates funded want.
2. Seller responds with card, price, condition, photos, and route.
3. Seller reuses shop, domain, or marketplace proof.
4. Seller posts risk-adjusted bond.
5. Buyer agent recommends accept, reject, or request more evidence.
6. Route locks only after typed spendability.
7. Delivery opens inspection window.
8. Buyer accepts or opens one of a small set of claim types.
9. Human arbiter resolves disputed cases.
10. Final receipt becomes reusable proof.

## Minimal Agent API

User-facing trade actions:

```text
createIntent()
listMatchingSellerResponses()
requestEvidence()
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

Buyer-agent evaluation:

```text
evaluateOffer(intent, offer, evidence, sellerTrust, route)
recommendEvidenceRequest(valueMap, trustGap)
recommendBond(value, trustGap, routeRisk)
summarizeRiskForHuman()
```

Seller-agent support:

```text
reuseSellerProof()
prepareCardEvidence()
estimateRequiredBond()
explainBuyerEvidenceRequest()
submitOffer()
manageInventoryLock()
```

Arbiter-agent support:

```text
assembleCaseFile()
classifyClaimType()
checkRequiredEvidence()
suggestPolicyRemedy()
flagHumanEscalation()
```

Underneath, these actions generate packets, signatures, manifests, spendability packets, and on-chain calls.

## Seller Pitch

Use this:

> Respond to funded demand, reuse your proof, pay lower fees, and get a clean receipt that improves future trust.

Do not use this:

> Join a decentralized evidence and arbitration protocol.

## Final Judgment

The protocol is worth pursuing, but the next version should be less expansive and more ruthless.

The strongest path is:

> A typed escrow and evidence protocol for agent-mediated TCG trades, starting with curated sellers, strict evidence templates, typed spendability, scoped bonds, and human arbitration.

Do not try to prove a general marketplace protocol yet. Prove that one funded buyer can safely and conveniently buy one specific card from one semi-trusted seller with less platform overhead, clearer evidence, and better dispute handling than existing channels. If that works repeatedly, the general protocol story becomes much more believable.

