# Verifier Scope Semantics

Generated: 2026-05-19T16:20:44Z

Status: next hardening target after buyer-scoped verifier approval and fingerprint challenge gates.

## Goal

Prevent verifier authority from laundering itself into a vague "verified item" claim.

The protocol should let a verifier say exactly what they checked, what they did not check, which evidence they saw, which method they used, how fresh the claim is, and which future agent or arbiter can challenge it. A verifier stamp is not truth. It is a signed, scoped, method-bound claim inside the value map.

## Core Problem

The current EVM rail has a good first boundary:

- a globally active verifier cannot commit a trade fingerprint unless the buyer approves that verifier for the trade
- the verifier still has to be active in the registry
- the fingerprint remains a hash, not a full evidence packet

That stops "any verifier can stamp any trade." It does not yet stop a softer failure:

> A packet says a verifier was involved, and agents or UI accidentally display the item as verified.

This is the dangerous collapse. A verifier may have checked packet completeness, but not authenticity. They may have checked PSA cert correlation, but not raw condition. They may have checked seller custody at 11:00, but not packing at 14:00. They may have checked that a private predicate passed, but not the underlying photos.

The next target is therefore semantic containment:

> No verifier claim can travel without its scope, method, inputs, limits, freshness, and challenge path.

## Design Principle

"Verified" is not a state.

The protocol should speak in scoped sentences:

- "Verifier confirmed this packet is complete enough for the buyer's requested evidence tier."
- "Verifier correlated the visible PSA cert number to the seller's slab photos."
- "Verifier saw fresh custody evidence but did not evaluate authenticity."
- "Verifier confirms only that a private threshold predicate passed."
- "Verifier checked packaging and insurance readiness, not item condition."

Agents may summarize, but the summary must preserve the boundary.

## Authority Boundary

A verifier can be authoritative over one scope and useless over another. The registry should describe broad capabilities, while each attestation describes the actual claim made in that trade.

| Scope | What It Can Mean | What It Must Not Imply |
| --- | --- | --- |
| `packet_completeness` | Required fields and evidence refs are present. | Evidence content is true. |
| `schema_validity` | Packet matches a known schema and canonical hash. | Human claims are accurate. |
| `signature_provenance` | Signatures resolve to active actor keys. | The signer told the truth. |
| `seller_custody` | Seller likely controlled the item at capture time. | Seller still controls it later. |
| `raw_card_identity` | Photos plausibly identify the raw card described. | Card is authentic or grade is exact. |
| `graded_cert_correlation` | Slab/cert evidence correlates with a grading-company record. | The slab was not swapped or forged. |
| `slab_custody` | Seller likely controls the specific slab shown. | The grade is morally or physically correct. |
| `raw_condition_floor` | Visible condition appears at or above a stated floor. | Final received condition is guaranteed. |
| `authenticity_screen` | Evidence passed a defined authenticity screen. | Full authentication has happened. |
| `route_readiness` | Shipping, local handoff, verifier-forwarding, or insurance duties are ready. | The item itself is as described. |
| `insurance_claim_readiness` | Evidence packet is sufficient to begin a carrier or insurer claim. | Claim will be approved. |
| `marketplace_reputation_linkage` | Seller links to reputation from another marketplace. | That marketplace would endorse this trade. |
| `shop_identity_linkage` | Physical shop identity links to website, reviews, wallet, or agent key. | Shop inventory claim is true. |
| `private_predicate_threshold` | A private fact passed a registered predicate. | The hidden evidence should be treated as public proof. |

## Packet Shape: `marketplace.verifier_scope_attestation.v0.1`

The packet should be signed by the verifier controller and anchored as evidence. It can stay off-chain in alpha; the contract only needs the packet hash and signer gates.

```json
{
  "schema": "marketplace.verifier_scope_attestation.v0.1",
  "trade_id": "uint256-or-protocol-id",
  "attestation_id": "uuid-or-content-id",
  "issued_at": "2026-05-19T16:20:44Z",
  "expires_at": "2026-05-20T16:20:44Z",
  "verifier": {
    "actor_id": "did:market:verifier:cardshop-7",
    "registry_address": "0x...",
    "capability_record_hash": "0x..."
  },
  "subject": {
    "subject_type": "item_fingerprint|evidence_packet|inventory_lock|route_packet|trust_link|claim_packet|private_predicate",
    "subject_hash": "0x...",
    "related_hashes": [
      "0x..."
    ]
  },
  "scope": [
    "seller_custody",
    "graded_cert_correlation"
  ],
  "method": {
    "method_id": "tcg.slab.cert_custody_photo.v0.1",
    "human_summary": "Compared cert lookup to fresh front/back slab photos with buyer nonce.",
    "tooling": [
      "manual_review",
      "cert_lookup",
      "image_metadata_check"
    ],
    "version": "0.1"
  },
  "inputs_seen": [
    {
      "kind": "photo",
      "hash": "0x...",
      "visibility": "buyer_arbiter",
      "seen_at": "2026-05-19T16:17:00Z"
    },
    {
      "kind": "cert_lookup",
      "hash": "0x...",
      "visibility": "public",
      "seen_at": "2026-05-19T16:18:10Z"
    }
  ],
  "inputs_not_seen": [
    "in-person card inspection",
    "sealed package handoff",
    "post-verification custody"
  ],
  "claim": {
    "positive": [
      "The seller likely controlled the slab shown at verification time.",
      "The visible cert evidence correlates with the stated grading-company record."
    ],
    "negative": [
      "This does not authenticate the underlying card beyond the cert correlation.",
      "This does not verify packaging, shipping, or final delivery condition."
    ],
    "known_conflicts": []
  },
  "confidence_scope": {
    "mode": "bounded_claim",
    "rating": "sufficient_for_requested_aperture",
    "aperture_ref": "buyer_policy_hash",
    "do_not_convert_to_global_score": true
  },
  "challenge": {
    "challenge_window_seconds": 86400,
    "challenge_hooks": [
      "fresh_nonce_photo",
      "alternate_angle_video",
      "shop_intake_scan",
      "arbiter_review"
    ],
    "failure_policy": "block_route|ask_buyer|increase_bond|escalate_arbiter"
  },
  "privacy": {
    "public_summary_allowed": true,
    "private_inputs": "buyer_arbiter",
    "redaction_policy_hash": "0x..."
  },
  "display": {
    "label": "Cert and custody checked",
    "short_warning": "Not an authenticity guarantee.",
    "agent_sentence": "A verifier matched the slab cert and fresh custody photos, but did not inspect the card in person or verify shipping."
  },
  "signature": "0x..."
}
```

## Controlled Scope Vocabulary

The protocol should start with a conservative vocabulary and let domains add adapters later.

Object and evidence scopes:

- `packet_completeness`
- `schema_validity`
- `signature_provenance`
- `seller_custody`
- `raw_card_identity`
- `graded_cert_correlation`
- `slab_custody`
- `raw_condition_floor`
- `authenticity_screen`
- `sealed_product_exterior`
- `lot_coverage_sample`
- `inventory_lock_binding`

Route and claim scopes:

- `route_readiness`
- `carrier_tracking_linkage`
- `insurance_purchase`
- `declared_value_alignment`
- `packaging_attestation`
- `local_handoff_identity`
- `verifier_forwarding_intake`
- `insurance_claim_readiness`

Trust and reputation scopes:

- `marketplace_reputation_linkage`
- `shop_identity_linkage`
- `domain_control`
- `storefront_control`
- `review_profile_linkage`
- `bond_coverage_validation`
- `prior_receipt_correlation`

Privacy and predicate scopes:

- `private_predicate_threshold`
- `private_inventory_membership`
- `private_value_floor`
- `private_location_radius`
- `selective_disclosure_validity`

Each scope should have a short normative definition, required inputs, allowed issuers, stale-after defaults, and display language.

## Display Rules

Agents and UI should not show a generic "verified" badge.

Allowed examples:

- `Packet complete`
- `Seller custody checked`
- `Cert correlated`
- `Route evidence checked`
- `Claim-ready packet`
- `Private threshold passed`

Forbidden examples:

- `Verified item`
- `Verified seller`
- `Authentic`
- `Safe trade`
- `No risk`

If a compact badge is needed, it should carry scope chips. Example:

```text
Verifier: Cardshop-7
Scopes: seller custody, cert correlation
Not checked: in-person authenticity, packaging, delivery condition
Action: OK for this buyer's mid-value graded-card aperture
```

The human-facing sentence should read like an honest agent:

> "This seller is new here, but a verifier matched the slab cert and fresh custody photos. They did not inspect the card in person. Given your cap and escrow terms, I would proceed if the seller accepts insured shipping or a local handoff."

## Cost-Field Integration

Verifier scope is another non-scalar cost field, not a single quality number.

The buyer agent should choose required scopes from:

- item value
- condition sensitivity
- seller trust gap
- route risk
- bond coverage
- inspection window
- buyer attention preference
- privacy tolerance
- time pressure

Examples:

| Trade Aperture | Minimum Scope Set | Likely Human Prompt |
| --- | --- | --- |
| Low value, trusted seller, raw card | `seller_custody` or seller-signed sparse fingerprint | None unless evidence conflicts. |
| Low value, new seller | `seller_custody` plus bond or delayed payout | Ask only if photos are stale or route risk is high. |
| Mid value, condition-sensitive raw | `raw_card_identity`, `raw_condition_floor`, `seller_custody` | Ask if verifier scope excludes surfaces or backs. |
| Mid value, graded card | `graded_cert_correlation`, `slab_custody`, route evidence | Ask if cert is visible but custody is stale. |
| High value, any seller | verifier or shop attestation, route and insurance readiness, explicit arbitration path | Ask before waiving any scope. |
| Local meetup | `local_handoff_identity`, `seller_custody`, receipt packet | Ask whether buyer wants in-person handoff over shipping. |
| Verifier forwarding | `verifier_forwarding_intake`, condition note, split-route readiness | Ask if extra cost is worth the trust reduction. |

This keeps the protocol humane. Low-value trades are not crushed by museum-grade proof, and high-value trades do not slide through on vibes.

## TCG-Forward Adapter

For Pokemon and other TCGs, the first verifier adapters can be practical:

### Raw single

Required method fields:

- front photo hash
- back photo hash
- condition claim
- timestamp or nonce if seller is new
- visible defect notes when condition matters
- optional corner/edge/surface closeups

Possible scopes:

- `raw_card_identity`
- `raw_condition_floor`
- `seller_custody`

Non-claims:

- no guarantee of authenticity unless `authenticity_screen` is present
- no guarantee of exact grade

### Graded single

Required method fields:

- grading company
- cert id or cert id commitment
- slab front and back
- fresh custody nonce if seller is new or value is high
- cert lookup evidence

Possible scopes:

- `graded_cert_correlation`
- `slab_custody`
- `seller_custody`

Non-claims:

- no guarantee that grading company data is correct
- no guarantee of post-verification custody

### Sealed product

Required method fields:

- exterior photos
- seal and wrap photos where relevant
- lot or case identifiers where available
- route and insurance evidence for higher value

Possible scopes:

- `sealed_product_exterior`
- `seller_custody`
- `route_readiness`

Non-claims:

- no claim about hidden contents unless a domain-specific verifier can support it

### Lot

Required method fields:

- coverage map of which cards are individually fingerprinted
- sample method
- exclusions
- replacement policy

Possible scopes:

- `lot_coverage_sample`
- `raw_card_identity` for individually fingerprinted cards
- `packet_completeness`

Non-claims:

- do not imply every card in the lot was inspected if only a sample was checked

## Trust Source Interaction

Verifier scope should compose with trust evidence without merging into it.

Example:

```json
{
  "seller": "did:market:seller:new-44",
  "trust_sources": [
    {
      "source": "eBay",
      "claim": "account control and historical seller reputation",
      "scope": "marketplace_reputation_linkage",
      "freshness": "14d"
    },
    {
      "source": "physical_shop",
      "claim": "shop website controls a signed nonce",
      "scope": "shop_identity_linkage",
      "freshness": "2d"
    }
  ],
  "verifier_attestations": [
    {
      "source": "Cardshop-7",
      "claim": "fresh slab custody and cert correlation",
      "scope": ["slab_custody", "graded_cert_correlation"],
      "freshness": "2h"
    }
  ]
}
```

The buyer agent can say:

> "The seller's outside reputation helps with fulfillment trust. The verifier helps with this specific slab. Those are different comforts, and neither replaces insured shipping."

## On-Chain Integration

Alpha should keep semantics off-chain and enforce only hashes, signatures, actor authority, and lifecycle gates.

Recommended next contract primitive:

```solidity
function approveVerifierScope(
    uint256 tradeId,
    address verifier,
    bytes32 scopeApprovalHash,
    bytes calldata buyerSignature
) external;

function commitVerifierAttestation(
    uint256 tradeId,
    bytes32 attestationHash,
    bytes32 subjectHash,
    bytes32 scopeSetHash,
    bytes calldata verifierSignature
) external;
```

Minimum checks:

- trade is in `EvidencePending`
- verifier is active in registry
- buyer has approved that verifier for the trade
- verifier signs a typed attestation binding `tradeId`, `attestationHash`, `subjectHash`, and `scopeSetHash`
- packet hash cannot be replayed inside the trade
- subject hash must already exist on the trade if the attestation is about a known gate

The contract should not parse `scope` strings in v0.1. It should bind the attestation to a scope-set hash so off-chain agents and arbiters can prove what was claimed at the time.

Possible later gate:

```solidity
function requireScopeForRoute(
    uint256 tradeId,
    bytes32 requiredScopeSetHash
) external;
```

This can wait. The first win is signed containment and replayable display.

## Agent Policy

A buyer agent should evaluate verifier attestations in five passes:

1. Authority: Is this verifier active, buyer-approved for the trade, and capable for the scope?
2. Subject: Which exact hash did the verifier inspect or attest to?
3. Scope: What was checked and what was excluded?
4. Aperture: Is that enough for this buyer, value, route, seller trust, and bond?
5. Friction: Is the cheapest next request a photo, a bond, insured route, local meetup, verifier forwarding, or a human question?

A seller agent should use the same semantics to avoid wasting time:

- offer cheap scope first for low-risk trades
- offer stronger scope when it buys down a trust gap
- expose limits honestly before a buyer agent turns them into a challenge
- price verifier attention into negotiation
- refuse overbroad claims that create future dispute exposure

## Failure Modes To Test

### Scope laundering

A verifier attests only `packet_completeness`, but UI says "verified card."

Expected result: blocked by display rule. Agent must phrase it as packet completeness only.

### Subject drift

A verifier attests to an evidence packet hash, but a later route or claim treats it as attesting to the item fingerprint.

Expected result: agent flags subject mismatch. Contract-level future primitive can require subject hash equality.

### Method mismatch

Verifier claims `raw_condition_floor` but method lacks back photo, corner photos, or visibility limits.

Expected result: confidence is insufficient for condition-sensitive apertures.

### Stale custody

Verifier confirms seller custody at noon. Seller routes two days later with no fresh custody evidence.

Expected result: buyer agent can ask for fresh nonce photo, increased bond, or verifier-forward route.

### Overbroad cert claim

Verifier confirms cert correlation. Agent interprets as authenticity guarantee.

Expected result: forbidden. Cert correlation is not full authenticity unless the scope says so and method supports it.

### Collusive verifier

New verifier repeatedly issues broad claims that later fail.

Expected result: outcome stream reduces verifier weight for affected scopes without reducing unrelated scopes automatically.

### Privacy fog

Verifier confirms a private predicate passed, but buyer agent treats hidden evidence as if all details are known.

Expected result: display must say private threshold passed, with hidden inputs not inspected by the buyer.

### Lot overreach

Verifier samples ten cards in a lot of one hundred. UI says "lot verified."

Expected result: display shows sample coverage and individually fingerprinted cards only.

### Claim packet gap

Verifier checks item evidence but not packaging or declared value. Insurance claim later needs packaging proof.

Expected result: claim-readiness is absent. Agent should have requested `packaging_attestation` and `declared_value_alignment` before route.

## Simulation Metrics

Add these to the Monte Carlo and EVM replay layer:

- generic verified labels blocked
- verifier attestations by scope
- attestation subject mismatches
- stale attestations at route time
- low-value trades that avoided unnecessary verifier attention
- high-value trades blocked for missing scope
- disputes where missing scope predicted failure
- disputes where scope containment made arbitration faster
- verifier outcome accuracy by scope
- seller attention minutes saved by selecting the cheapest sufficient scope

## Acceptance Criteria

This hardening target is complete when:

- every verifier packet has `scope`, `method`, `inputs_seen`, `inputs_not_seen`, `claim`, `confidence_scope`, `challenge`, and `display`
- agents never render a generic "verified" state without scope chips
- the EVM runner includes at least two verifier attestations with different scopes over the same trade
- at least one low-value trade proceeds with packet completeness or seller custody only
- at least one high-value trade blocks route until a stronger verifier scope is attached or the buyer explicitly waives it
- the report distinguishes "verifier is authorized for this trade" from "verifier made a sufficient claim for this buyer"
- failed outcomes update verifier reputation by scope, not as a single global score

## Next Build Order

1. Add `VerifierScopeAttestation` packet generation to the local runners.
2. Add an off-chain validator that rejects missing scope, empty method, empty inputs, or absent display limits.
3. Add contract support for scoped attestation hash anchoring and typed verifier signatures.
4. Add agent simulation cases for packet-only, custody-only, cert-correlation, route-readiness, claim-readiness, and private-predicate attestations.
5. Update the protocol page to ban generic verified display and list the scope vocabulary.
6. Run a 250-trade simulation with verifier attention cost turned up and confirm low-value trades do not over-request evidence.

## Non-Goals

- Do not put full evidence packets on-chain.
- Do not make the registry a universal truth oracle.
- Do not require every trade to use a verifier.
- Do not convert verifier output into a single confidence score.
- Do not force TCG scopes onto every physical-good domain.

