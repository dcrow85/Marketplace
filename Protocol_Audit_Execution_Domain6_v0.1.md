# Protocol Audit Execution: Domain 6 v0.1

Generated 2026-06-12.

Scope: blind Domain 6 audit of Judgment Supply. Sources read: `chain/src/MarketplaceEscrow.sol`, `chain/src/MarketplaceActorRegistry.sol`, `Protocol_Walls_v0.1.md`, `chain/script/protocol_e2e.py`, arbiter/verifier agent instructions, Agent API, SKILL/boundary guidance, and targeted full-spec overclaim passages.

Claim under test: verifiers and arbiters are committed service paths with fee source, SLA, remedy cap, conflict disclosure, and fallback that reaches a ruling; registry membership is not judgment supply.

## AUD-D6-001

id: AUD-D6-001
domain: Domain 6
severity: high
type: proven_bypass
claim: A trade should not settle or resolve a claim while relying only on registry-listed judgment supply.
attack: Route, deliver, settle, and resolve a claim using an active arbiter entry plus hashes, but no `marketplace.judgment_supply_commitment.v0.1` packet or equivalent on-chain binding.
observed: `createTrade()` checks active buyer, seller, and arbiter registry status, nonzero amounts/hashes, and buyer signatures only (`chain/src/MarketplaceEscrow.sol:375`, `:389`, `:395`). `resolveClaim()` checks active arbiter through `onlyArbiter`, a ruling hash/signature, and 0..10,000 bps payout bounds (`chain/src/MarketplaceEscrow.sol:1019`, `:1026`, `:1029`). No on-chain field names fee source, response SLA, availability, conflict disclosure, remedy cap, or fallback before settlement or claim resolution.
expected: If Domain 6 is a contract-layer guarantee, route lock, settlement, and claim resolution should bind a judgment-supply commitment hash/fields, or require an explicit buyer waiver before funds move.
runnable case or citation: `testAuditD6SettlementCanCompleteWithRegistryOnlyArbiter` and `testAuditD6ClaimCanResolveWithRegistryOnlyArbiterAndRulingHash` in `chain/test/MarketplaceEscrow.t.sol:1733` and `:1749`; `forge test` passes with both cases.
disposition: deferred_with_owner_and_trigger. Trigger before any value-bearing network alpha: either bind `JudgmentSupplyCommitment` into trade/route/claim gates, or make callers enforce and display that this escrow layer supplies registry status plus payout bounds only.

## AUD-D6-002

id: AUD-D6-002
domain: Domain 6
severity: high
type: proven_bypass
claim: Arbiter replacement/fallback should reach a ruling after the primary arbiter is revoked mid-trade or mid-claim.
attack: Revoke the active arbiter after a claim is open, and separately after route lock before a route-timeout claim, then provide no replacement proposal.
observed: The revoked arbiter cannot resolve because `onlyArbiter` requires active registry status. Emergency replacement only starts from an existing `ArbiterReplacement` proposal; with none, `emergencyReplaceArbiter()` reverts `ReplacementProposalMissing` and the trade remains `ClaimOrDisputePending` (`chain/src/MarketplaceEscrow.sol:1104`, `:1110`, `:1111`). Existing positive mechanics work when someone proposes a replacement, but there is no automatic fallback from zero proposal to ruling.
expected: A committed judgment-supply fallback should either pre-bind an accepted backup path, let a defined emergency authority act, or otherwise reach a ruling/remedy when the primary arbiter disappears.
runnable case or citation: `testAuditD6RevokedArbiterMidClaimHasNoEmergencyPathWithoutProposal` and `testAuditD6RevokedArbiterMidRouteClaimHasNoAutomaticFallback` in `chain/test/MarketplaceEscrow.t.sol:1789` and `:1815`; both leave state at `ClaimOrDisputePending`.
disposition: deferred_with_owner_and_trigger. Trigger before value-bearing claims: require pre-bound fallback/replacement authority or define an emergency default remedy after timeout.

## AUD-D6-003

id: AUD-D6-003
domain: Domain 6
severity: medium
type: proven_bypass
claim: A narrowly scoped verifier attestation must not be consumed as a broader authenticity or condition backstop.
attack: Approve a verifier for a narrow scope (`checked-symbol-field-only-not-authenticity`), commit an attestation to an active fingerprint challenge, and clear the challenge with that attestation.
observed: `commitVerifierAttestation()` requires an active verifier, an approved `scopeSetHash`, nonzero hashes, and an anchored subject (`chain/src/MarketplaceEscrow.sol:609`, `:619`, `:620`, `:629`). `clearFingerprintChallengeWithAttestation()` only checks that the attestation exists and its `subjectHash` equals the active challenge (`chain/src/MarketplaceEscrow.sol:753`, `:764`, `:768`); it does not parse the scope, method, or `not_claiming` semantics. The wall correctly says a photo-only verifier must not be surfaced as an authenticity backstop (`Protocol_Walls_v0.1.md:630`, `:633`), so the contract boundary is semantic/off-chain.
expected: Challenge clearance should require a policy-recognized challenge-resolution scope/method, or the caller must explicitly display a waiver that the narrow attestation is not an authenticity/condition guarantee.
runnable case or citation: `testAuditD6NarrowVerifierScopeCanClearChallengeBySubjectOnly` in `chain/test/MarketplaceEscrow.t.sol:1851`.
disposition: deferred_with_owner_and_trigger. Trigger before verifier attestations can clear buyer challenges in production: enforce allowed challenge-resolution scope/method hashes or require an explicit waiver packet.

## AUD-D6-004

id: AUD-D6-004
domain: Domain 6
severity: medium
type: proven_bypass
claim: An arbiter or verifier with a stake in the outcome should not be relied on without conflict disclosure, SLA, fee source, remedy cap, and availability surfaced before reliance.
attack: Register an arbiter with opaque metadata that would encode an undisclosed seller stake, create a trade with that arbiter, open a claim, and let that arbiter resolve it.
observed: Registry authority records store only `metadataHash`, `bond`, `active`, and timestamps (`chain/src/MarketplaceActorRegistry.sol:25`). `registerArbiter()` only requires an active arbiter actor and nonzero metadata hash (`chain/src/MarketplaceActorRegistry.sol:120`, `:124`, `:125`), and `isArbiterActive()` returns only active role/authority status (`chain/src/MarketplaceActorRegistry.sol:185`). The E2E authority packets include `scope`, `conflict_policy`, and `bond_eth`, but not fee source, response SLA, remedy cap, or fallback as a committed case path (`chain/script/protocol_e2e.py:1397`, `:1404`, `:1405`, `:1465`). The escrow does not parse conflict disclosure before relying on the arbiter.
expected: Reliance on an arbiter/verifier should require a legible commitment with conflict disclosure, fee/SLA/remedy/fallback fields before acceptance, route lock, or claim resolution.
runnable case or citation: `testAuditD6ConflictedArbiterMetadataIsNotParsedBeforeRuling` in `chain/test/MarketplaceEscrow.t.sol:1892`.
disposition: deferred_with_owner_and_trigger. Trigger before value-bearing arbitration: bind conflict/SLA/remedy/fallback commitment refs into trade terms and claim resolution, or keep this as a documented off-chain caller responsibility.

## AUD-D6-005

id: AUD-D6-005
domain: Domain 6
severity: low
type: proven_bypass (doc-overclaim)
claim: Docs must not imply the escrow contract enforces committed judgment supply when it enforces registry membership plus replacement mechanics and payout bounds.
attack: Read the spec/API as implementation guidance and infer that scope exclusions, conflict disclosure, policy hash, remedy cap, and bond scope are enforced at the escrow layer.
observed: The full spec invariant language previously stated "No scope laundering" and "No undefined arbiter" without naming the layer; the Agent API `resolveClaim` section required policy/remedy/bond placement but did not state those fields are caller/API checks rather than escrow parsing. The wall and SKILL were already honest: registry entry is not judgment supply (`Protocol_Walls_v0.1.md:630`; `agent_skills/marketplace-protocol/references/protocol-boundaries.md:25`, `:159`).
expected: Docs distinguish contract-enforced facts from agent/API/wall obligations.
runnable case or citation: Updated `Marketplace_Protocol_Full_Spec.md:1731` and `:1737` now mark scope/conflict as agent/API-layer invariants; updated `Protocol_Agent_API_v0.1.md:790` states the exact `resolveClaim()` contract boundary.
disposition: fixed_in_docs_for_doc_drift.

## Checks That Held

- Active registry status is enforced for selected arbiters at trade creation (`MarketplaceEscrow.sol:395`) and for ruling arbiters through `onlyArbiter` (`MarketplaceEscrow.sol:365`).
- Verifier attestations cannot be committed by inactive/unapproved verifiers; the weak point is scope semantics, not raw verifier registry bypass.
- Ruling payout arithmetic is mechanically capped at 0..10,000 bps for buyer refund and seller bond penalty (`MarketplaceEscrow.sol:1029`), guarded by `testAuditD6RulingPayoutBoundsRejectOverCap`.
- Replacement mechanics do work when a replacement proposal exists and times out; the deadlock finding is specifically the no-proposal/no-prebound-fallback case.
- Arbiter and verifier agent instructions warn against overclaiming remedy caps and verifier scope (`agent_instructions/arbiter_agent.md:27`; `agent_instructions/verifier_agent.md:9`, `:26`).

## Commands Run

```text
forge test
```

Result: 88 passed; 0 failed; 0 skipped. Baseline was 81; added 7 Domain 6 forge cases.

## Verdict

At the contract layer, judgment supply is registry-listed, not committed: escrow enforces active actor/arbiter/verifier registry checks, typed hashes, replacement mechanics, and payout bounds; fee/SLA/conflict/remedy/fallback commitments remain off-chain agent/API/wall obligations unless future code binds them.
