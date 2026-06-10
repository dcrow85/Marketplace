# Item Fingerprint Hardening Spec

Generated: 2026-05-19T15:57:05Z

Status: hardening target for the current `ItemFingerprint` implementation.

## Goal

Make `ItemFingerprint` strong enough to identify a physical item across messy real-world evidence without collapsing every domain into one global scalar.

The fingerprint is not "the truth." It is a signed, scoped claim about the physical object at stake, with enough evidence references and challenge hooks for buyer agents, seller agents, verifiers, arbiters, and future domain-specific tools to decide what the claim is worth.

## Current Implementation

Already implemented:

- `commitItemFingerprint(tradeId, itemFingerprintHash, signature)`
- seller or active verifier can commit the fingerprint
- nonzero hash and actor signature gate
- active fingerprint collision check across open trades
- inventory lock requires an existing item fingerprint
- route commitment requires an inventory lock
- cancellation, settlement, and claim resolution release active fingerprint and inventory locks

Current evidence boundary:

- the contract sees only a hash and a valid authority signature
- the local runners generate `marketplace.item_fingerprint.v0.2` packets
- `InventoryLock` packets include `item_fingerprint_hash` in their off-chain payload
- the contract does not yet cryptographically bind the inventory lock hash to the committed item fingerprint hash beyond packet convention

## Threat Model

The hardening pass should assume a motivated seller may try to:

- reserve no real card and stall
- reuse one physical card across two active escrows
- reuse one PSA, SGC, BGS, or CGC cert across multiple escrows
- create semantically different fingerprints for the same physical card
- use photos from a prior listing, another marketplace, or another seller
- mix front and back images from different cards
- crop, relight, compress, or AI-alter images to avoid visual matching
- substitute a worse card after fingerprinting
- present a cert screenshot without proving custody of the slab
- exploit local pickup or show handoff paths where there is no carrier tracking
- exploit privacy redactions to hide contradictions
- use a compromised or low-quality verifier
- race cancellation, settlement, or claim resolution to free an active fingerprint too early

The hardening pass should also assume legitimate edge cases:

- the same physical card may be relisted after a failed or settled trade
- a raw card may have only sparse photos for low value
- a high-value card may require cert, custody nonce, and verifier review
- sealed product, lots, slabs, raw singles, and non-TCG goods need different evidence shapes
- a buyer may accept weaker evidence if price, bond, route, or seller trust compensates

## Core Invariants

### On-chain invariants

- No fingerprint with a zero hash.
- No fingerprint without a valid seller or active verifier signature.
- No inventory lock before fingerprint commitment.
- No route commitment before inventory lock.
- No same active fingerprint across two open trades.
- No same active inventory lock across two open trades.
- No replacement of an already committed fingerprint with a different hash.
- No fingerprint or inventory lock remains active after cancellation, clean settlement, or claim resolution.
- No revoked verifier can commit a new fingerprint.
- No stranger can commit a fingerprint.

### Packet invariants

- `ItemFingerprint` must include `schema`, `trade_id`, `identity_claim`, `evidence_refs`, `correlation_method`, `confidence_scope`, `privacy_policy`, and `challenge_hooks`.
- Every `evidence_ref` must be content-addressed, signed, challenge-bound, or explicitly marked as weak.
- Mutable URLs may be included only as supplemental refs unless paired with a hash, archive, or signer attestation.
- `InventoryLock` must bind to the committed `item_fingerprint_hash`.
- Route, delivery, receipt, claim, and ruling packets should reference the same fingerprint when object identity matters.
- A verifier note must say what it verified: identity, custody, condition, authenticity, route, packet completeness, or only threshold predicate.

### Agent and verifier invariants

- Agents must not treat "signed" as "true."
- Agents must carry evidence scope forward: raw identity, graded identity, condition confidence, authenticity confidence, custody confidence, and route confidence are different things.
- Agents must preserve contradictory evidence instead of averaging it away.
- Buyer agents should choose evidence requirements from value, trust, route, bond, and user risk tolerance.
- Seller agents should know when extra evidence is worth the seller attention cost.
- Verifiers must disclose issuer, method, scope, freshness, and conflicts.
- Arbiters must be able to reconstruct which evidence was available at lock, route, delivery, and claim time.

## Proposed Packet Shape: `marketplace.item_fingerprint.v0.3`

Required fields:

```json
{
  "schema": "marketplace.item_fingerprint.v0.3",
  "trade_id": "uint256-or-protocol-id",
  "issuer": "did-or-actor-id",
  "issuer_role": "seller|verifier|shop|marketplace|cert_authority",
  "identity_claim": {
    "domain": "tcg",
    "game": "pokemon",
    "object_type": "raw_single|graded_single|sealed|lot|other",
    "card": "human-readable card claim",
    "set": "optional",
    "language": "optional",
    "variant": "optional",
    "grade_or_condition_claim": "optional"
  },
  "evidence_refs": [],
  "correlation_method": [],
  "confidence_scope": [],
  "privacy_policy": "public|buyer_only|buyer_arbiter|commitment_only",
  "challenge_hooks": []
}
```

Recommended fields:

```json
{
  "capture_window": {
    "captured_at": "ISO-8601-or-null",
    "freshness_seconds": 86400
  },
  "custody_challenge": {
    "nonce": "buyer-or-protocol-nonce",
    "requested_pose": "front/back with handwritten nonce",
    "expires_at": "ISO-8601"
  },
  "cert_refs": [
    {
      "issuer": "PSA|SGC|BGS|CGC|other",
      "cert_id_hash": "hash-or-public-id",
      "lookup_ref": "url-or-api-ref",
      "custody_evidence_ref": "hash"
    }
  ],
  "visual_markers": [
    {
      "scope": "front|back|corner|edge|surface|slab",
      "marker_hash": "hash",
      "visibility": "public|private|arbiter_only"
    }
  ],
  "prior_market_refs": [
    {
      "source": "eBay|TCGplayer|shop_site|show_memo|other",
      "claim": "same object|same seller|same cert|same listing",
      "proof_ref": "hash-or-signed-url",
      "weight_hint": "weak|medium|strong"
    }
  ],
  "match_group_commitment": "optional verifier-private commitment",
  "known_conflicts": [],
  "expiry": "ISO-8601-or-null"
}
```

## Hardening Pass A: Contract Tests

Add or confirm these Foundry tests:

- seller can commit fingerprint before inventory lock
- active verifier can commit fingerprint before inventory lock
- stranger cannot commit fingerprint
- revoked verifier cannot commit fingerprint
- wrong actor signature cannot commit fingerprint
- zero fingerprint hash is rejected
- inventory lock before fingerprint is rejected
- route before inventory lock is rejected
- duplicate active fingerprint across two trades is rejected
- duplicate active inventory lock across two trades is rejected
- different fingerprint overwrite on same trade is rejected
- same fingerprint recommit on same trade has defined behavior: either idempotent or explicit duplicate rejection
- fingerprint releases after cancellation
- fingerprint releases after buyer acceptance settlement
- fingerprint releases after claim resolution
- released fingerprint can be reused in a new trade only after the first trade is closed
- fingerprint cannot be committed after route commitment, delivery, claim, settlement, or cancellation
- verifier revocation after fingerprint commitment does not corrupt the existing trade, but prevents new verifier commits
- seller revocation after fingerprint commitment does not silently release the active fingerprint

## Hardening Pass B: Hash Binding

Current gap: the local packet convention includes `item_fingerprint_hash` inside `InventoryLock`, but the contract cannot inspect packet contents.

Recommended next contract change:

- replace or overload `commitInventoryLock(tradeId, inventoryLockHash, signature)` with a typed binding form:
  - `commitInventoryLock(tradeId, inventoryLockHash, boundItemFingerprintHash, signature)`
- require `boundItemFingerprintHash == trade.itemFingerprintHash`
- sign a typed digest such as:

```solidity
keccak256(abi.encode(
    INVENTORY_LOCK_TYPEHASH,
    tradeId,
    inventoryLockHash,
    boundItemFingerprintHash
))
```

This does not put the full packet on-chain. It just prevents an inventory lock from being cryptographically ambiguous about which fingerprint it reserves.

Acceptance tests:

- inventory lock with wrong bound fingerprint is rejected
- inventory lock with missing bound fingerprint is rejected
- inventory lock signed for another trade is rejected
- route cannot commit after a mismatched lock attempt
- EVM runner reports both the fingerprint hash and bound fingerprint hash for every lock

## Hardening Pass C: Semantic Collision Drills

Build an adversarial simulation set where fingerprints differ at the hash layer but may match semantically.

Drill cases:

- same PSA cert, two active trades, different seller photos
- same raw card, cropped differently, two active trades
- same front photo, different back photo
- front and back from different cards
- stock photo plus seller custody claim
- prior marketplace image reused by a new seller
- valid cert lookup but no current custody proof
- slab cert matches but slab photo is stale
- raw card with only low-resolution photos
- raw card with timestamped nonce and edge closeups
- local meetup with no shipping evidence
- insured shipment with item photo, label, tracking, and final receipt
- uninsurable route where buyer knowingly accepts route risk
- lot listing where only some cards are fingerprinted
- sealed product where inner contents cannot be individually fingerprinted

Expected behavior:

- low-value, low-risk cases may proceed with seller-signed sparse fingerprints
- mid-value cases should request timestamped custody evidence or stronger seller trust
- high-value or new-seller cases should require verifier commitment, cert correlation, bond, or human approval
- active semantic conflicts should open a verifier challenge instead of silently settling into a scalar score

## Hardening Pass D: Verifier Challenge Protocol

When a buyer agent suspects a weak or conflicting fingerprint, it can request a `FingerprintChallenge`.

Challenge packet fields:

```json
{
  "schema": "marketplace.fingerprint_challenge.v0.1",
  "trade_id": "id",
  "challenger": "buyer-agent-or-verifier",
  "target_fingerprint_hash": "hash",
  "grounds": [
    "stale_photo",
    "same_cert_active_elsewhere",
    "stock_image_suspected",
    "front_back_mismatch",
    "custody_not_proven"
  ],
  "requested_evidence": [
    "fresh_nonce_photo",
    "front_back_video",
    "cert_lookup_with_custody",
    "shop_or_verifier_attestation"
  ],
  "deadline": "ISO-8601",
  "failure_policy": "block_route|increase_bond|escalate_arbiter|buyer_waiver_required"
}
```

Contract posture:

- the alpha can keep this off-chain as signed evidence
- a later version can add an on-chain pause gate for high-value fingerprint challenges
- low-value challenges should remain cheap and mostly agent-mediated

## Hardening Pass E: Cost-Field Policy

Fingerprint requirements should be driven by the buyer aperture, not a universal rule.

Suggested defaults:

- Low value, trusted seller: seller-signed fingerprint, sparse photos accepted, no verifier by default.
- Low value, new seller: seller-signed fingerprint plus timestamped nonce or small bond.
- Mid value, trusted seller: front/back/corners, route proof, optional verifier.
- Mid value, new seller: timestamped nonce, richer photos, bond, verifier if evidence is ambiguous.
- High value, any seller: verifier or cert authority evidence, custody nonce, route/insurance packet, explicit arbitration path.
- Local meetup: route memo and handoff receipt can replace carrier tracking, but object fingerprint still anchors the thing being handed over.

Do not over-ask for evidence when the value, trust, route, and buyer risk tolerance do not warrant it. The cost field should preserve seller attention as a real cost.

## Metrics

Track these in simulations:

- active hash collisions blocked
- semantic collision suspicions raised
- challenges requested
- challenges satisfied
- challenges waived by buyer
- trades blocked before route
- disputes caused by weak fingerprints
- seller attention minutes added by fingerprint requests
- buyer attention minutes saved by verifier commitments
- false-positive challenge rate
- false-negative duplicate-object rate

## Acceptance Criteria

The hardening pass is successful when:

- contract tests cover the on-chain invariants above
- the EVM runner includes at least one mismatched inventory-lock binding rejection
- the adversarial simulation includes at least 25 fingerprint-specific bad-seller or ambiguous-evidence cases
- the report distinguishes hash-level enforcement from semantic verifier judgment
- agents can explain to the human why a fingerprint is acceptable, weak, challenged, or blocked
- low-value trades are not burdened with high-value evidence requirements
- high-value or new-seller trades cannot slide through on a naked seller-signed hash

## Non-goals

- Do not create one universal global fingerprint for every physical item.
- Do not require every card to expose all photos publicly.
- Do not permanently ban a fingerprint after a trade settles.
- Do not treat grading-company data, marketplace reputation, or shop attestation as equally authoritative for every buyer.
- Do not force TCG-specific fields into other physical-goods markets.

## Next Build Order

1. Add the missing Foundry negative tests around actor authority, lifecycle timing, release, and recommit behavior.
2. Add typed inventory-lock binding to the committed item fingerprint.
3. Extend the replay runner with one deliberate binding mismatch that must revert.
4. Build the semantic collision simulation set.
5. Add `FingerprintChallenge` packets to the off-chain runner.
6. Update the protocol page once the tests and runner prove the hardening pass.
