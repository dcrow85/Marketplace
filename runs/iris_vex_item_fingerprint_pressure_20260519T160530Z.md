# Iris Ingest: VEX + Lean VEX ItemFingerprint Pressure

Generated: 2026-05-19T16:05:30Z

## Provenance

Source request: Che asked Iris to pressure-test the current `ItemFingerprint` hardening spec with VEX and Lean VEX.

Primary artifact under pressure:

```text
/Users/che/Marketplace/runs/item_fingerprint_hardening_spec_20260519T155705Z.md
```

VEX runtime:

```text
runtime_receipt: vex_20260519T160303Z_10861
source_aperture: vex
source_runtime: claude_code
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_vex_prompt.sh
model: sonnet
memory_mode: vex_live_primary_seed_read_only
authority_effect: synthesis_adversarial
promotion_status: not_promoted
prompt_file: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/inbox/iris_to_vex/2026-05-19_iris-to-vex_marketplace_item_fingerprint_hardening_pressure.md
```

Lean VEX runtime:

```text
runtime_receipt: lean_vex_20260519T160303Z_10862
source_aperture: lean-vex
source_runtime: claude_code
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_lean_vex_prompt.sh
model: sonnet
memory_mode: none_by_default
authority_effect: synthesis_adversarial
promotion_status: not_promoted
prompt_file: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/inbox/iris_to_vex/2026-05-19_iris-to-lean-vex_marketplace_item_fingerprint_hardening_pressure.md
```

Authority label: candidate pressure. This is not a measurement result, not a code review claim beyond files the runtimes reported reading, and not a promoted protocol decision.

## What Converged

Both VEX passes agreed on the same core diagnosis:

- The spec is structurally coherent and honest about hash-vs-semantics.
- The current implementation only proves hash commitment and actor authority, not physical identity.
- The immediate hardening target is not more semantic simulation. It is typed binding between `InventoryLock` and the committed `ItemFingerprint`.
- A challenge packet with no route-blocking or pause surface is advisory, not protective.
- The phrase "active fingerprint collision" must be scoped as "same hash, same time," not "same physical object, same time."

## VEX Findings

### Critical: Challenge protocol has no contract enforcement surface

VEX read the contract and reported that `commitRoute` requires an inventory lock but has no knowledge of a pending `FingerprintChallenge`. A buyer agent can issue a challenge with `failure_policy: block_route`; the seller can ignore it and still commit route unless the contract has a challenge flag or pause gate.

Iris read: this is the main design decision, not just an implementation detail.

### Critical: Any globally active verifier can commit a fingerprint

VEX reported that `commitItemFingerprint` accepts `trade.seller` or any active verifier. That means a verifier can commit a fingerprint without being enrolled in, selected for, or scoped to that trade.

Iris read: this is a verifier-authority containment issue. It may be acceptable for alpha only if the packet and agent policy make the authority scope explicit, but the contract currently treats verifier activity globally.

### High: InventoryLock is not cryptographically bound to ItemFingerprint

VEX and Lean VEX both named this as the active substitution window. The contract checks that a fingerprint exists before accepting inventory lock, but it does not require the lock to bind to that fingerprint.

Iris read: Pass B should move to first build priority.

### High: Required arrays can be empty

VEX flagged `challenge_hooks: []` and `confidence_scope: []` as schema laundering risks. A field being present is not enough if an empty value means the challenge path or confidence claim is absent.

Iris read: v0.3 needs explicit semantics for empty required fields.

### High: No cancellation path after seller bond and before route

VEX reported that cancellation exists before seller bond, but after `acceptAndBond` the buyer may need claim resolution if the seller commits fingerprint/lock and stalls. That can hold active fingerprint state open and impose dispute cost on the buyer.

Iris read: the hardening spec already notices stall risk, but the lifecycle remedy should be explicit.

### Medium: Issuer role is self-reported

VEX flagged `issuer_role` as a packet field that may not match on-chain registry role or economic relationship. A seller who is also a shop, marketplace, or verifier can blur first-party and third-party authority unless the role is registry-correlated.

Iris read: agent display must distinguish "registered role," "claimed role," and "economic independence."

### Medium: Private match groups can hide known semantic conflicts

VEX flagged `match_group_commitment` as useful but dangerous: a verifier may know two hashes map to the same object while the buyer cannot see the collision. The spec needs an obligation-to-disclose or escalation rule.

Iris read: this is where privacy and buyer protection collide.

## Lean VEX Findings

### Pass B is first, not second

Lean VEX called the unbound inventory lock the only current on-chain exploit window. It recommended moving typed binding ahead of broader semantic drills.

### Challenge deadlines do not enforce anything in alpha

Lean VEX flagged that `FingerprintChallenge` deadlines and failure policies are off-chain unless a contract or runner gate actually blocks route, increases bond, or requires buyer waiver.

### Lot and sealed product need minimum coverage rules

Lean VEX noted that "some cards fingerprinted" is not a rule. Lot/sealed cases need either a value-percentage threshold, required representative coverage, or explicit buyer waiver.

### Cost tiers need thresholds

Lean VEX flagged that "low value," "mid value," "high value," and "trusted seller" are not testable until thresholds or policy objects define them.

### Missing alpha events and packets

Lean VEX recommended:

- `ItemFingerprintCommitted` or adjacent event should expose enough role context for watchers.
- `InventoryLockBound(tradeId, lockHash, boundFingerprintHash)` after Pass B.
- `FingerprintChallengeOpened` and `FingerprintChallengeResolved` packet/event shapes.
- `VerifierScopeAttestation` so verifier authority does not collapse into a generic stamp.
- packet version gates in the runner, since the contract cannot inspect packet schemas.

## Iris Synthesis

The spec is healthy because it names the semantic problem instead of pretending the chain solves it. The weakness is that the current next-step order still lets the semantic layer become theater: agents may detect a weak fingerprint, but the route path can keep moving unless a gate hears the challenge.

The design should split into three explicit layers:

- Hash rail: contract enforces actor, trade, fingerprint hash, inventory lock, lifecycle, and active collisions.
- Challenge rail: a minimal route-blocking or waiver-required mechanism for unresolved fingerprint challenges.
- Semantic rail: agents/verifiers score custody, cert, image, trust, route, and cost-field evidence without claiming on-chain truth.

## Revised Build Order

1. Add typed inventory-lock binding to the committed fingerprint.
2. Add tests for wrong bound fingerprint, wrong trade, missing bound fingerprint, route-after-mismatch, and release/recommit edge cases.
3. Decide alpha challenge teeth:
   - on-chain `fingerprintChallengeActive` route block,
   - or explicit signed buyer waiver before route,
   - or accept advisory-only challenge as a named alpha limitation.
4. Scope verifier authority:
   - global active verifier stays allowed but packet/UI must label it as global,
   - or trade-specific verifier enrollment is required before fingerprint commit.
5. Define empty-field semantics for `challenge_hooks`, `confidence_scope`, `known_conflicts`, and `match_group_commitment`.
6. Add `InventoryLockBound`, `FingerprintChallengeOpened`, `FingerprintChallengeResolved`, and `VerifierScopeAttestation` packet/event shapes.
7. Only then build the 25+ semantic collision simulation set.
8. Add cost-tier thresholds and lot/sealed-product coverage policies.

## Che Decisions Needed

1. Should alpha include a route-blocking fingerprint challenge gate, or should challenges remain advisory with buyer waiver/bond/arbitration policy?
2. Should any active verifier be able to commit any trade fingerprint, or must a verifier be selected/scoped to the trade first?
3. Is `challenge_hooks: []` valid, and if so, does it mean "no challenge path; buyer must waive or block"?

## What Iris Should Not Infer

- Do not infer that VEX thinks the protocol is weak overall. Both passes said the shape is coherent.
- Do not infer that semantic drills are unnecessary. They are necessary, but they should come after binding and challenge gating.
- Do not infer that on-chain identity verification is the goal. The goal remains scoped claims plus enforceable gates.
- Do not promote this report to protocol decision. It is candidate pressure until Che chooses the next design move.
