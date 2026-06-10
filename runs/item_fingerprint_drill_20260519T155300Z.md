# Item Fingerprint Drill

Generated: 2026-05-19T15:53:00Z

## Question

Can the protocol identify a physical item without forcing every market into the same evidence shape?

## Implemented Shape

`ItemFingerprint` is now a first-class signed packet before `InventoryLock`.

- The fingerprint says what physical object the trade means.
- The inventory lock says that identified object is reserved for this escrow.
- The route cannot be committed until both are anchored.
- The same active item fingerprint cannot back two open trades.
- A registered seller or verifier can commit the fingerprint, which leaves room for raw seller photos, PSA/SGC/BGS/CGC-style cert correlation, local-shop verification, marketplace proof chains, or future domain-specific verifiers.

## EVM Gates

- `commitItemFingerprint(tradeId, itemFingerprintHash, signature)` accepts seller or active verifier signatures.
- `commitInventoryLock` now rejects trades with no committed item fingerprint.
- `activeItemFingerprints` blocks duplicate active fingerprints across open trades.
- Settlement, cancellation, and claim resolution release the active fingerprint and inventory lock together.

## TCG Evidence Aperture

For TCGs, the fingerprint can carry any mix of:

- card identity claim: game, set, language, variant, grade or condition floor
- scan/photo refs: front, back, corners, edges, surface, timestamped custody nonce
- slab/cert refs: PSA, SGC, BGS, CGC, or marketplace certification data
- provenance refs: shop listing, prior receipt, marketplace profile, show pickup memo
- confidence scope: raw identity, graded identity, condition confidence, authenticity confidence
- challenge hooks: fresh photo request, verifier review, cert lookup, image match, human arbiter

That keeps the protocol evidence-plural: the contract only sees a hash and a valid authority signature, while buyer agents and verifiers decide how much the evidence means.

## Tests Run

- Foundry: 48 tests passed.
- Local EVM protocol probe: `/Users/che/Marketplace/runs/local_evm_protocol_20260519T155412Z/REPORT.md`
- Ten-trade agent replay: `/Users/che/Marketplace/runs/agent_market_evm_replay_20260519T155253Z/REPORT.md`

## What Broke Less

- A fraudulent seller cannot reserve inventory before anchoring an object identity.
- A seller cannot reuse the same active fingerprint across two open trades.
- A verifier can carry the object-identity role when the seller is new, low-trust, or handling a high-value card.

## Still Open

- A bad actor could create semantically different fingerprints for the same physical card. That needs verifier scrutiny, richer image matching, cert/issuer attestations, custody nonce checks, or domain-specific reputation pressure.
- No real PSA, SGC, BGS, CGC, shipping, insurance, or marketplace reputation API is connected yet.
- Privacy-preserving proofs can later prove selected fingerprint predicates without exposing the full evidence bundle.
