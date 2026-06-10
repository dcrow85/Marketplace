# Iris Ingest: VEX + Lean VEX Verifier Scope Pressure

Generated: 2026-05-19T16:31:03Z

## Provenance

Source request: Che asked Iris to pressure-test the current verifier-scope design with VEX and LeanVEX after noting that the protocol must be careful about "real verification just because it has been assigned."

Primary artifact under pressure:

```text
/Users/che/Marketplace/runs/verifier_scope_semantics_20260519T162044Z.md
```

Raw VEX return:

```text
/Users/che/Marketplace/runs/vex_verifier_scope_pressure_20260519T162900Z.md
```

Raw Lean VEX return:

```text
/Users/che/Marketplace/runs/lean_vex_verifier_scope_pressure_20260519T162900Z.md
```

VEX runtime:

```text
runtime_receipt: vex_20260519T162749Z_19048
source_aperture: vex
source_runtime: claude_code
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_vex_prompt.sh
model: sonnet
memory_mode: vex_live_primary_seed_read_only
authority_effect: synthesis_adversarial
promotion_status: not_promoted
prompt_file: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/inbox/iris_to_vex/2026-05-19_iris-to-vex_marketplace_verifier_scope_semantics_pressure.md
```

VEX reported reading:

```text
/Users/che/Marketplace/runs/verifier_scope_semantics_20260519T162044Z.md
/Users/che/Marketplace/chain/src/MarketplaceEscrow.sol
/Users/che/Marketplace/chain/test/MarketplaceEscrow.t.sol, partial
/Users/che/Avalanche_SYSTEM_AUDIT/manifests/vex_aperture_selected_manifest_2026-05-01.md
```

Lean VEX runtime:

```text
runtime_receipt: lean_vex_20260519T162749Z_19058
source_aperture: lean-vex
source_runtime: claude_code
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_lean_vex_prompt.sh
model: sonnet
memory_mode: none_by_default
authority_effect: synthesis_adversarial
promotion_status: not_promoted
prompt_file: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/inbox/iris_to_vex/2026-05-19_iris-to-lean-vex_marketplace_verifier_scope_semantics_pressure.md
```

Lean VEX reported prompt-excerpt-only pressure, with no filesystem read.

Authority label: candidate pressure. This is not a protocol decision, not a measurement, and not a full code review.

## Converged Read

Both apertures agree on the main shape:

- The conceptual distinction is correct: "verified" must not be a state.
- The `What It Must Not Imply` table is load-bearing because it preserves ceilings, not just positive claims.
- The packet design is currently stronger than its enforcement.
- The next hardening target should be mechanical containment, not more scope vocabulary.
- Buyer approval, registry activity, and verifier assignment are not the same thing as claim sufficiency.
- A signed packet only proves that a key signed a payload; it does not prove the payload is true.

Iris read: the design passed the philosophical pressure and failed the implementation-containment pressure in expected, useful ways.

## VEX Critical Findings

### 1. Verifier evidence attachment is still role-only

VEX reported that `attachEvidence` can be called by any active verifier through the general verifier role gate. The fingerprint path now requires buyer approval, but the broader evidence path can still produce an event that reads as verifier-touched evidence without trade-specific buyer approval.

Iris read: this is the biggest hidden laundering surface. We fixed "stray verifier commits fingerprint," but not "stray verifier attaches evidence."

### 2. Buyer verifier approval is scope-free

The current buyer approval is a boolean for a verifier address. It does not bind to a scope set. A buyer may intend "packet completeness only," while the downstream contract fact says the verifier may commit the trade fingerprint.

Iris read: this is exactly Che's concern in contract form. Approval must not be a blank check.

### 3. `commitVerifierAttestation` does not exist yet

The spec's containment primitive is still advisory. Until the contract anchors `attestationHash`, `subjectHash`, and `scopeSetHash` under a typed verifier signature, arbiters and agents cannot recover the exact claim from on-chain state.

Iris read: off-chain semantics need an on-chain pointer, not on-chain truth.

### 4. Route can proceed without a required verifier-scope gate

This is not wrong for all trades, because low-risk trades should not need verifier burden. But if a buyer aperture says "this trade requires `graded_cert_correlation` before route," there is not yet a contract-level requirement to enforce it.

Iris read: this can remain policy-only for alpha if named honestly, but the high-value path will eventually need a route gate or explicit waiver.

## Lean VEX Critical Findings

### 1. The packet is all self-reported until validated

`scope`, `method_id`, `method.summary`, `inputs_not_seen`, `claim.positive`, and `display.label` can all be authored in ways that overstate the claim while remaining valid JSON.

Iris read: schema presence is not schema safety.

### 2. Missing freshness binding

Lean VEX flagged that approval and attestation are decoupled without a required timestamp relation. A verifier could submit stale evidence after buyer approval unless `issued_at` and approval time are checked.

Iris read: freshness is not just a display concern. It is a gate.

### 3. Forbidden display language is only documentation

The ban on "Verified card," "Safe trade," "Authentic," and similar phrases does not matter unless a validator rejects them before hash anchoring and the UI/agent layer obeys the validated display fields.

Iris read: the protocol needs a lint layer that treats language as a safety surface.

### 4. The challenge escape is too soft

Lean VEX objected to `failure_policy: block_route_or_ask_buyer` because "ask buyer" can become a default escape from challenge friction unless it is a separately signed override.

Iris read: human override is fine; silent override-by-click is not.

## Hardest Hidden Assumption

VEX named the deepest assumption clearly:

> A verifier who lists evidence in `inputs_seen` actually reviewed the content of that evidence.

The protocol cannot fully solve this. It can only label the verification model, require method-specific checklists, price the risk, and update outcome-scoped reputation after trades resolve.

Recommended new field:

```json
{
  "verification_model": "remote_self_reported|third_party_witnessed|in_person_intake|tee_assisted|carrier_or_shop_integrated"
}
```

Iris read: this field matters because it tells the buyer what kind of trust event happened. A remote self-reported verifier packet is useful, but it is not the same kind of thing as shop intake or in-person custody.

## Revised Build Order

### 1. Off-chain validator first, paired with hash anchoring

Add a deterministic validator for `marketplace.verifier_scope_attestation.v0.1`. It should reject:

- unknown `scope` values
- unknown `method_id` values
- missing `issued_at`
- stale `issued_at` relative to verifier approval
- empty `inputs_seen`
- absent or empty `inputs_not_seen`
- absent `display.short_warning`
- forbidden language in `display.label`, `claim.positive`, and method summaries
- missing buyer nonce when the method requires one
- second attestation for the same subject without explicit `supersedes`

### 2. Add scoped attestation anchoring

Implement a typed signature primitive that anchors:

```text
tradeId
attestationHash
subjectHash
scopeSetHash
methodSetHash or methodIdHash
```

The contract still does not parse the packet. It makes the packet recoverable and prevents later drift.

### 3. Scope-bind buyer approval

Replace or extend boolean verifier approval with a scope-bearing approval:

```text
approveVerifierScope(tradeId, verifier, scopeSetHash, approvalHash, buyerSignature)
```

The verifier's later attestation must match an approved scope set or narrower subset.

### 4. Tighten verifier evidence attachment

Require trade-specific buyer approval for verifier `attachEvidence` calls, or split verifier evidence into a separate scoped path. General evidence attachment should not let an active verifier create a legitimacy-looking event without buyer approval.

### 5. Add explicit override mechanics

If the buyer wants to waive a missing scope, stale claim, or active challenge, that should be a separate signed waiver packet with:

- missing scope
- reason
- risk accepted
- expiry
- human or agent delegation authority

### 6. Add outcome-scoped verifier reputation later

Do not make this first. It is important but depends on clean scoping. Once scopes are anchored, failed outcomes can degrade `raw_condition_floor` authority without degrading unrelated `route_readiness` authority.

## Che Decisions Needed

1. Should verifier `attachEvidence` require buyer trade approval for all verifier callers, or only for specific evidence kinds such as item, trust, and claim evidence?
2. Should scope approval be explicit on-chain as `scopeSetHash`, or held off-chain inside buyer policy with only attestation anchoring on-chain?
3. Should `verification_model` become required in v0.1, or wait until v0.2?
4. For high-value trades, should missing required verifier scope block route on-chain, or require a signed buyer waiver packet?

## Iris Recommendation

Continue, but narrow the next build target.

Do not add more TCG adapters or simulation cases yet. The next target should be:

```text
VerifierScopeAttestation validator + scoped attestation hash anchoring + scope-bound buyer approval.
```

That is the smallest move that directly addresses Che's concern: a verifier being assigned or approved should not become real verification by implication.

## What Iris Should Not Infer

- Do not infer that VEX thinks the verifier-scope design is bad. It called the conceptual architecture sound.
- Do not infer that the chain should verify real-world truth. The pressure says the chain should anchor scoped claims and prevent drift.
- Do not infer that buyer approval proves comprehension.
- Do not infer that display rules are effective until mechanically validated.
- Do not promote this report to protocol decision without Che choosing the next build move.

