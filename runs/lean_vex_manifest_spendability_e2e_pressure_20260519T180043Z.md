---
runtime_receipt: lean_vex_20260519T180043Z_37057
source_aperture: lean-vex
source_runtime: claude_code
runtime: /Users/che/.local/bin/claude
model: sonnet
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_lean_vex_prompt.sh
memory_mode: none_by_default
prompt_file: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/inbox/iris_to_vex/2026-05-19_iris-to-lean-vex_marketplace_manifest_spendability_e2e_pressure.md
authority_effect: synthesis_adversarial
promotion_status: not_promoted
---

I have all the artifacts. Applying pressure now.

---

```
RUNTIME RECEIPT
runner: protocol_e2e.py local EVM
run_id: local_evm_protocol_20260519T175831Z
chain: anvil:31337
scenarios_passed: 3/3 (Settled)
forge_tests: 63/63
manifest_drill: 7/7 (spec: marketplace.evidence_manifest.v0.2)
spendability_drill: 9/9 (spec: marketplace.evidence_spendability.v0.1)
```

---

## Lean Verdict

The architecture is conceptually sound and the harness-level invariants are genuine. The separation of manifest from permission (TIER_NOT_PERMISSION enforced, separate packet types, append-only vs single-use consumption) is real hardening. But two structural gaps undercut the E2E claim as stated: the spendability gate exists entirely in Python harness memory and is invisible to the contract, and the 7/7 drill suite covers v0.2 while the E2E runs v0.3 — the drills do not prove the code path they appear to prove. Neither gap is fatal to the design, but both are currently laundered by how the results are reported.

---

## Claim Under Pressure

> Signed spendability packets are checked off-chain before route commitment, challenge clearance, claim support, and bond action. Spendability now references EvidenceManifest packet hashes and manifest subject hashes, not legacy loose evidence packet hashes. Valid manifests and tier claims do not automatically become spendable; gate permission is a separate packet.

---

## Strongest Objection

**The spendability gate is enforced by the Python harness, not the Solidity contract.**

`validate_spendability_gate` is called inside the Python runner before it constructs and sends the transaction. The contract's `commitRoute`, `openClaim`, `supportClaim`, and `bondAction` functions accept a packet hash and a signature. They do not accept a spendability packet hash as a parameter. They do not verify that a spendability packet was issued before the state-moving call was made.

Any party with the ABI and an Anvil key can call `commitRoute` directly, skip the Python harness entirely, and the contract will process the transaction if state preconditions and signature checks pass. The "gate" is a harness-local check that disappears the moment someone uses `cast send` instead of the runner.

The E2E report says: *"The local EVM contract still sees only packet hashes and signatures. The manifest/spendability validators are off-chain harness logic."* That admission is present but easy to miss against 63 passing Forge tests. The REPORT.md observation *"signed spendability packets are checked off-chain before route commitment"* uses the word "gate" in a way that implies enforcement at the contract level. It does not.

---

## What Got Genuinely Hardened

**Manifest ≠ permission is now structural, not just a comment.** Two different packet schemas. Two different build paths. TIER_NOT_PERMISSION is enforced in falsifier code, not just described in a spec.

**Subject hash recomputation is validated in the E2E.** `validate_evidence_manifest_payload` recomputes `evidence_subject_hash(subject_type, trade_id, anchor_hash)` and rejects if the declared value doesn't match. This was previously only checked in the manifest drill.

**Gate authority is a policy table, not ad hoc.** `SPENDABILITY_GATE_POLICIES` maps gate types to allowed authority roles, leg, and consumption mode. The check at line ~763 tests actor role against the policy, not just against a role string.

**Single-use vs append-only consumption semantics tested end-to-end.** The spendability drill's `single_use_consumed` and `append_only_weight_reusable` cases both pass and both map to scenarios in the E2E (`claim_support` at `append_only_weight`, route and bond at `single_use`). The double-spend distinction is real.

**Old photo / return leg distinction holds.** `CLAIM_SCOPE: contradiction_support cannot spend at route_commitment` is enforced by the gate policy table. Same manifest, different gates, different admissibility. That is genuine.

**Revocation tombstone works.** The drill proves `SPENDABILITY_REVOKED` independently. Manifest integrity is preserved; spendability is killed. The separation holds.

---

## What Is Still Laundered Or Overclaimed

**1. The drill covers v0.2; the E2E runs v0.3.**

The manifest drill REPORT.md header says `Spec: marketplace.evidence_manifest.v0.2`. The E2E uses `MANIFEST_SCHEMA = "marketplace.evidence_manifest.v0.3"`, `ASSET_DESCRIPTOR_SCHEMA = "marketplace.asset_descriptor.v0.3"`, `SUBJECT_HASH_SCHEMA = "marketplace.subject_hash.v0.3"`, and canonicalization string `canonical-json-payload-v1` (not `marketplace-json-c14n-v0.2`). These are not cosmetic differences — the asset descriptor hash function includes the schema version in the input, so v0.2 and v0.3 produce different hashes for the same descriptor body.

The 7/7 drill result is being cited alongside E2E evidence as though they share a code path. They do not. There is no standalone falsifier drill for `marketplace.evidence_manifest.v0.3`. The byte-switch, role-inflation, and tier-inflation coverage belongs to v0.2. The v0.3 validator in the E2E is exercised only through integration, not isolation.

The drill's own "Next Hardening Target" says *"Promote this validator into the E2E… so photo and claim evidence packets become v0.2 EvidenceManifest packets before their hashes are anchored."* The E2E already uses v0.3 packets. That recommendation is stale, and the staleness wasn't flagged.

**2. The authority_hash in decision_authority is self-referential.**

`write_spendability_packet` sets `authority_hash` to `keccak_text(f"authority:{actor_id}:{role}")` — a hash of the actor's own identity string. The spec says `authority_hash` should be *"the hash of the registry/delegation/assignment/policy record."* No registry lookup occurs. An arbiter can issue a spendability packet, declare `authority_source: actor_registry_or_delegation`, and the authority_hash check in the gate validator does not verify that any registry record backs the claim. The check only verifies that the declared role is in `SPENDABILITY_ACTOR_ROLES[actor_id]` — a hardcoded harness dict, not the on-chain registry.

**3. "Settled" proves the happy path closed, not that spendability was the gate.**

All three scenarios settle. The E2E observations confirm spendability checks were passed. But the Solidity contract does not confirm that spendability checks are mandatory. The settlement proof is: *if you go through the harness, spendability is checked.* It is not: *if you try to commit a route without a valid spendability packet, the contract rejects.* Those are different claims.

**4. The drill's consumed-set is not persistent.**

The `consumed: set[str]` used in `validate_spendability_gate` is a Python in-memory set scoped to the runner process. It does not survive restarts, does not exist on-chain, and is not shared across independent runner instances. The single-use protection it provides exists only within one run of one process. Claiming it prevents double-spend at the protocol level is premature.

---

## Cheapest Falsifier

**Test 1 (on-chain bypass):** Deploy the contract with the same registry setup. Call `commitRoute(tradeId, routeHash, ...)` directly using `cast send` with the seller's private key, skipping the Python harness. Confirm the transaction lands and the trade advances to `RouteLocked`. No spendability packet will be checked. If this succeeds — which the architecture says it will — then the spendability gate is harness-only, not protocol-enforced.

**Test 2 (v0.3 drill gap):** Run the byte-switch falsifier case against the v0.3 validator by calling `validate_evidence_manifest_payload` directly with a v0.3 schema manifest and a mutated asset. Confirm it either rejects with `ASSET_HASH_MISMATCH` (showing the v0.3 code path is covered) or that no such standalone test exists. The current drill does not exercise this path.

**Test 3 (authority_hash circular):** Write a spendability packet where `decision_authority.authority_hash` is `keccak("garbage:garbage")` and submit it through the harness. If `validate_spendability_gate` accepts it, the authority_hash field does no work. The current gate check does not verify the hash against any registry state.

---

## Wording To Avoid

- **"Gate"** — implies contract-level enforcement. Use "harness check" or "off-chain admission control" until a contract parameter or event confirms the spendability packet.
- **"Proved by drill"** when the drill spec version differs from the E2E spec version.
- **"Spendability prevents double-spend"** — the consumed-set is in-process memory only.
- **"Authority hash backs the registry record"** — the hash is computed from the actor string, not looked up from the registry.
- **"7/7 manifest drill"** as evidence that v0.3 falsifiers pass.

---

## Missing Control

**On-chain spendability anchor.** There is no mechanism by which the Solidity contract can reject a state-moving call that lacks a corresponding valid spendability packet. The harness checks spendability before constructing the transaction, but the contract does not receive the spendability packet hash as a parameter, does not emit a spendability event, and does not validate consumption. To make the gate real at the protocol level, the contract would need to either: (a) require the spendability packet hash as a parameter and verify it against a submitted hash, (b) emit an event when a spendability packet is consumed so replays can be detected chain-side, or (c) require an on-chain commitment to the spendability hash before the state-moving transaction.

**Independent v0.3 manifest falsifier drill.** No standalone drill exercises `validate_evidence_manifest_payload` with v0.3 schema, v0.3 canonicalization, v0.3 asset descriptor schema. The seven v0.2 cases are credited to coverage they do not provide.

---

## What Iris Should Not Infer

- That the three `Settled` scenarios prove the spendability gate is contract-enforced.
- That 7/7 manifest drill passes cover the v0.3 manifest validator used in the E2E.
- That `decision_authority.authority_hash` is verified against any registry record.
- That the consumed-set prevents replay across independent processes or restarts.
- That `BANNED_VERIFIER_DISPLAY_PHRASES` is enforced in any live agent display surface — it is a constant in the runner, not a runtime enforcement hook.
- That EvidenceManifest subject hashes uniquely identify a physical subject — they bind to the anchor hash of a prior packet, but multiple manifests with the same anchor hash (e.g., same fingerprint hash) produce the same subject hash; the hash does not prevent a seller from issuing two manifests with different evidence but the same claimed subject.
- That the `revoked_arbiter_emergency_replacement` scenario tests EvidenceManifest or spendability behavior — it does not; no manifest or spendability packet is anchored in that scenario.

---

## Next Hardening Target

**Priority order:**

1. **Solidity gate anchor (highest impact, highest gap).** The most dangerous current state is that the word "gate" appears in packet schemas that have no on-chain enforcement. The cheapest contract-side anchor is requiring a spendability packet hash as a parameter in `commitRoute` and emitting a `SpendabilityConsumed(tradeId, spendabilityHash)` event. This does not require full on-chain spendability validation — it only requires that the contract record which spendability packet was cited, making harness bypass visible on-chain and enabling post-hoc verification.

2. **Standalone v0.3 manifest drill (urgent for coverage integrity).** Before the E2E claim about manifest hardening can be trusted, the falsifier cases need to run against the actual v0.3 validator with v0.3 schemas and `canonical-json-payload-v1` canonicalization. The v0.2 drill is valid for what it proves. It does not prove what the E2E runs.

3. **Fingerprint-runner manifest promotion (lower urgency than above two).** Valuable but does not close either of the two structural gaps identified. Do this after the drill split-brain is resolved.

4. **`evidenceManifestHash` Solidity helper (lowest urgency of the four).** Only meaningful after the contract gate anchor exists. Without gate anchoring, a Solidity hash helper proves the hash algorithm matches — not that the hash is used.
