# EvidenceSpendability Drill: evidence_spendability_drill_20260519T175854Z

- Generated: `2026-05-19T17:58:54.732818+00:00`
- Spec: `marketplace.evidence_spendability.v0.1`
- Cases: `9`
- Passed: `True`

## Result

The spendability gate rejects valid durable evidence when it lacks local permission, accepts it at the correct gate, rejects skipped-state shortcuts, distinguishes forward and return legs, blocks wrong-authority spends, honors revocation, prevents single-use double spend, and allows append-only claim weight to be reused.

## Falsifier Matrix

| Case | Expected | Outcome | Passed | Error |
| --- | --- | --- | --- | --- |
| Manifest tier cannot buy route | standard manifest exists but route gate rejects without spendability | `not_spendable` | `True` | `TIER_NOT_PERMISSION` |
| Route spendability accepts | route gate accepts valid spendability packet | `spendable` | `True` | `none` |
| Settlement after skipped challenge | settlement rejects when challenge-clearance event is skipped and waiver path is not named | `not_spendable` | `True` | `GATE_WINDOW` |
| Old photo cannot spend forward | route gate rejects contradiction-only old listing evidence | `not_spendable` | `True` | `CLAIM_SCOPE` |
| Old photo spends on return leg | same manifest can support contradiction in a claim packet | `spendable` | `True` | `none` |
| Wrong actor cannot move bond | buyer agent cannot authorize arbiter-only bond action | `not_spendable` | `True` | `GATE_AUTHORITY` |
| Revoked spendability cannot spend | manifest remains valid but tombstoned spendability rejects at gate | `not_spendable` | `True` | `SPENDABILITY_REVOKED` |
| Single-use spendability cannot double spend | first route spend succeeds; second route spend rejects | `first_spendable_second_not_spendable` | `True` | `SPENDABILITY_CONSUMED` |
| Append-only claim weight can be reused | claim-support spendability can assemble multiple packets without funds-moving double spend | `both_spendable` | `True` | `none` |

## Case Notes

### Manifest tier cannot buy route

- Slug: `tier_without_spendability`
- Outcome: `not_spendable`
- Passed expectation: `True`
- Error code: `TIER_NOT_PERMISSION`
- Error message: `manifest tier is not spendability`

### Route spendability accepts

- Slug: `route_spendability_accepts`
- Outcome: `spendable`
- Passed expectation: `True`
- Error code: `none`
- Error message: `none`

### Settlement after skipped challenge

- Slug: `settlement_after_skipped_challenge`
- Outcome: `not_spendable`
- Passed expectation: `True`
- Error code: `GATE_WINDOW`
- Error message: `after_event_hash not present in gate context`
- Observations:
  - human waiver exists, but spendability did not name a waiver path and required challenge event is absent

### Old photo cannot spend forward

- Slug: `old_photo_route_rejects`
- Outcome: `not_spendable`
- Passed expectation: `True`
- Error code: `CLAIM_SCOPE`
- Error message: `contradiction_support cannot spend at route_commitment`

### Old photo spends on return leg

- Slug: `old_photo_claim_spends`
- Outcome: `spendable`
- Passed expectation: `True`
- Error code: `none`
- Error message: `none`
- Observations:
  - same durable memory rejected at forward route gate and accepted at return claim gate

### Wrong actor cannot move bond

- Slug: `wrong_actor_gate`
- Outcome: `not_spendable`
- Passed expectation: `True`
- Error code: `GATE_AUTHORITY`
- Error message: `buyer_agent cannot decide bond_action`

### Revoked spendability cannot spend

- Slug: `revoked_spendability`
- Outcome: `not_spendable`
- Passed expectation: `True`
- Error code: `SPENDABILITY_REVOKED`
- Error message: `spendability has active revocation`

### Single-use spendability cannot double spend

- Slug: `single_use_consumed`
- Outcome: `first_spendable_second_not_spendable`
- Passed expectation: `True`
- Error code: `SPENDABILITY_CONSUMED`
- Error message: `single-use spendability already consumed`
- Observations:
  - first invocation ok: True
  - second invocation code: SPENDABILITY_CONSUMED

### Append-only claim weight can be reused

- Slug: `append_only_weight_reusable`
- Outcome: `both_spendable`
- Passed expectation: `True`
- Error code: `none`
- Error message: `none`
- Observations:
  - first invocation ok: True
  - second invocation ok: True

## What This Proves

- Valid manifest memory is not permission.
- `evidence_tier` does not buy route commitment by itself.
- Spendability is local to a gate, leg, window, claim scope, and authority source.
- The same manifest can be unspendable on the forward leg and spendable on the return leg.
- Revocation tombstones permission without deleting the evidence manifest.
- Single-use spendability cannot be reused as a funds-moving double spend.
- Append-only claim support can be reused as weight without becoming a double spend.

## Still Not Proven

- This is an off-chain deterministic drill, not an EVM gate.
- The manifest builder still uses v0.2 fixture evidence.
- Local signatures are deterministic drill stubs, not production actor signatures.
- Gate state and event hashes are simulated.
- No insurer, carrier, marketplace, shop, or human UI is integrated.

## Next Hardening Target

Integrate spendability packets into the E2E harness around route commitment, challenge clearance, and claim support, then decide which spendability hashes eventually need on-chain anchoring.
