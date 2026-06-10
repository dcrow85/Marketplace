# Marketplace Protocol Audit - 2026-05-22

Three apertures were used:

- Maxwell: mechanism and EVM soundness.
- Peirce: adversarial falsification.
- Dewey: pragmatic protocol elegance.

No agent edited files. The parent process reran the local harnesses and confirmed:

```text
access_assembly_audit: pass true, 14 cases
protocol_agent_api_probe: pass true
forge test: 68 passed, 0 failed
```

The audit goal is soundness: elegant where a single clear boundary is enough, redundant where contact legibility protects money, evidence, route, claim, or bond action.

## Current Shape

The protocol is strongest when it admits its jurisdiction.

It can enforce custody of funds, seller bond posting, actor registry checks, state transitions, packet anchoring, item/inventory locks, challenge blocks, per-trade spendability consumption, and a typed route witness.

It cannot directly enforce physical truth: card authenticity, condition, possession, real delivery, seller reputation meaning, external marketplace availability, waiver wisdom, or arbiter fairness. Those remain evidence, judgment, or policy surfaces.

The core primitive remains correct:

```text
trajectory_capacity = remembered actor/pathway capacity
assembly_placement  = situated admissibility at a named trade gate
spendability        = permission to use an assembly at that gate
```

Trajectory capacity must never move funds, route, bond, claim, or reputation by itself.

## P0 Findings

### 1. Route API Can Lock While Other Walls Are Blocking

The current `seller_commit_route()` path checks route minimum packets and the `RouteInsuranceRiskOwner` block, but it does not block on every active wall outcome. A local falsifier confirmed this:

```text
decision: route_locked
active wall: ProofVectorScope:block ['authenticity']
```

Reference:

- `simulations/protocol_agent_api.py:225`

Why it matters:

The offer/funding layer keeps trajectory and assembly separate, but route commitment can become a bypass if it only asks "are route packets present?" instead of "is the whole route gate admissible?"

Hardening:

- Make `terminal_floor` canonical for every action: `pass | block | waiver_required | escalate`.
- `seller_commit_route()` must reject route lock if any non-waived `block` or `waiver_required` remains in the wall set.
- Add regression cases where route packets are present but `ProofVectorScope`, `CardReferenceCandidate`, `BondScope`, acceptance profile, or external availability still blocks.

### 2. Delivery Opens Inspection From Seller Or Arbiter Signature Alone

`markDelivered()` allows seller or arbiter to sign a `deliveryHash` and move the trade into `InspectionOpen`. If the buyer misses the inspection window, `settleAfterInspection()` releases escrow and seller bond.

Reference:

- `chain/src/MarketplaceEscrow.sol:810`
- `chain/src/MarketplaceEscrow.sol:850`

Why it matters:

Route lock is now strongly gated, but delivery is still a soft memo. A bad seller can create a false delivery event and shift the burden to buyer attention.

Hardening:

- Add `delivery_spendability_hash` or `delivery_event_witness`.
- Require route-bound delivery evidence before inspection opens: carrier event, local handoff memo, buyer acknowledgement, approved verifier/arbiter witness, or timeout-specific route claim path.
- Make "seller says delivered" legible evidence, not sufficient delivery placement.

### 3. EVM Route Spendability Is A Hash Gate, Not A Semantic Gate

The contract consumes any nonzero, unused `spendabilityHash` for that trade and emits the gate. It does not parse issuer, expiry, status, wall bundle citation, gate fields, or `not_claiming`.

Reference:

- `chain/src/MarketplaceEscrow.sol:759`
- `chain/src/MarketplaceEscrow.sol:1175`

Why it matters:

This is acceptable only if the canonical off-chain validator is explicitly part of the protocol boundary. A direct contract caller can compute the typed route witness around an arbitrary spendability hash.

Hardening:

- For alpha, formally define the canonical validator as required infrastructure, not optional tooling.
- Add typed spendability schema validation receipts, including validator version/hash.
- Longer term: consider registered spendability issuers or on-chain typed digest helpers for the minimal fields.

### 4. Simulation Route Witness Is Not The Contract Route Witness

Solidity expects:

```text
routeWallBundleHash(tradeId, routeHash, spendabilityHash)
```

with escrow address, chain id, trade id, route hash, spendability hash, and route gate. The Python packet path currently builds `route_wall_bundle_evm_hash` as a SHA-256 wrapper around the wall bundle hash.

Reference:

- `chain/src/MarketplaceEscrow.sol:1053`
- `simulations/protocol_wall_packets.py:302`
- `simulations/protocol_wall_packets.py:333`

Why it matters:

The audit can go green while asserting a witness shape that would not satisfy the EVM. This is a false-confidence risk.

Hardening:

- Use one canonical route witness helper in the EVM runner, packet builder, API probe, and access assembly audit.
- Rename the Python value if it is only a pre-EVM wall-bundle ref.

### 5. Buyer Waiver Validity Is Shape-Checked, Not Authority-Checked

`BuyerRiskAcceptance` checks required fields and non-waivable evidence, but does not validate expiry, trade binding, signer authority, revoked mandate, or schema version.

Reference:

- `simulations/protocol_wall_pressure_sim.py:360`

Why it matters:

Waiver is a powerful permission surface. A stale or unbound waiver should not become route or funding permission.

Hardening:

- Add expiry validation.
- Require trade id, buyer/delegate authority, human mandate ref, schema version, and signed digest.
- Add tests for expired, wrong-trade, wrong-signer, revoked, and non-waivable waiver attempts.

## P1 Findings

### Claim And Bond Closure Are Arbiter Judgment, Not Yet Protocol Enforcement

`resolveClaim()` enforces active arbiter, state, signature, and payout bounds. It does not enforce claim matrix row, remedy cap, arbiter policy hash, or bond scope.

Reference:

- `chain/src/MarketplaceEscrow.sol:911`
- `Protocol_Walls_v0.1.md:184`
- `Protocol_Walls_v0.1.md:237`

Hardening:

- Bind rulings to `claim_type`, `claim_matrix_row_hash`, `arbiter_policy_hash`, `bond_scope_hash`, `remedy_cap`, and `case_file_hash`.
- The arbiter can still judge, but the judgment must name its jurisdiction.

### Unknown Claim Types Fail Open As Software Errors

The claim matrix assumes known keys and can throw `KeyError` for unsupported claim types.

Reference:

- `simulations/protocol_wall_pressure_sim.py:526`

Hardening:

- Unknown claim type should become `block` or `escalate_unsupported_claim_type`, never a crash.

### Private Predicate Evidence Has A Generic Attachment Path

`attachPredicateEvidence()` verifies through a registered predicate verifier, but generic `attachEvidence()` can still accept `EvidenceKind.PrivatePredicate` with only participant signature.

Reference:

- `chain/src/MarketplaceEscrow.sol:462`
- `chain/src/MarketplaceEscrow.sol:481`

Hardening:

- Forbid `PrivatePredicate` in generic `attachEvidence()`, or require consumers to ignore private predicate claims unless emitted through `PredicateEvidenceAttached`.

### API Spec And Implementation Are Drifting

The spec talks about `cost_dimensional_integrity` and `human_availability`; the current `ApiResponse` does not carry them. Dewey's recommendation is to expose one canonical floor and keep rich agent prose as recommendation.

Reference:

- `Protocol_Agent_API_v0.1.md:271`
- `simulations/protocol_agent_api.py:52`

Hardening:

- API response should include:

```text
terminal_floor
checked_by_protocol
legible_evidence
judgment_needed
human_availability
cost_dimensional_integrity
agent_recommendation
```

## P2 Findings

- Version labels need a canonical alpha index. `protocol.html`, wall docs, and API docs mix v0.1/v0.2 language.
- Human-facing terminology should hide internal packet names behind three rows: `Checked`, `Evidence`, `Decision`.
- `RouteReadyBundle` should be the alpha-facing concept; item fingerprint, inventory lock, route risk owner, wall bundle, route spendability, and typed witness can remain internal.
- Pokemon/No Rarity variant placement should become a specific acceptance wall before funding for this alpha.

## Redundancy To Keep

- Item fingerprint plus inventory lock plus active global lock maps.
- Buyer-approved verifier scopes plus typed attestation bindings.
- Route spendability plus wall bundle plus typed route witness.
- `not_claiming` fields on catalog, proof, spendability, and verifier packets.
- Bond scope and claim matrix as separate artifacts. Do not collapse bond into trust.
- Arbiter policy hash as a closure boundary.

## Redundancy To Add

- Delivery spendability or delivery event witness before inspection opens.
- Typed ruling bindings before bond or payout action.
- Canonical validator receipt hash for off-chain spendability and wall-bundle validation.
- Waiver authority checks.
- Route API terminal-floor regression tests.
- EvidenceManifest v0.3 integration into the route wall bundle, not just separate drills.

## Elegant Simplification

The protocol should expose one floor at every gate:

```text
pass
block
waiver_required
escalate
```

Everything else is explanatory:

- Protocol says what can move.
- Agent says what it thinks and why.
- Human says what risk they accept.
- Arbiter says what policy-authorized remedy applies.

This keeps the wall simple without making it weak.

## Immediate Hardening Queue

1. Patch `seller_commit_route()` so any active `block` or unaccepted `waiver_required` prevents `route_locked`.
2. Add route API falsifier tests for non-route wall failures.
3. Align Python route witness calculation with Solidity `routeWallBundleHash`.
4. Add waiver expiry, trade binding, signer authority, and schema checks.
5. Add a delivery spendability gate before `InspectionOpen`.
6. Bind claim rulings to policy, matrix row, bond scope, and remedy cap.

The protocol is soundest when it remains humble: it does not claim to know the card is real. It claims that the right evidence, authority, cost, route, and policy surfaces made contact at the right gate.
