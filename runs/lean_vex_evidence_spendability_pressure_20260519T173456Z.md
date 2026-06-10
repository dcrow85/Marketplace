---
runtime_receipt: lean_vex_20260519T173513Z_32257
source_aperture: lean-vex
source_runtime: claude_code
runtime: /Users/che/.local/bin/claude
model: sonnet
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_lean_vex_prompt.sh
memory_mode: none_by_default
prompt_file: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/inbox/iris_to_vex/2026-05-19_iris-to-lean-vex_marketplace_evidence_spendability_boundary_pressure.md
authority_effect: synthesis_adversarial
promotion_status: not_promoted
---

```
LEAN VEX RUNTIME RECEIPT
agent: claude-sonnet-4-6
task: marketplace evidence spendability boundary pressure
artifacts read: evidence_category_change_spec_v0.2_20260519T172537Z.md, REPORT.md
authority: pressure only — no canon, no graph edits, no memory writes
```

---

## Lean Verdict

The proposed `EvidenceSpendability` patch is directionally sound but structurally premature. The core metaphor — evidence as latent memory that becomes payable at a gate — is coherent. The patch's weakness is not the idea; it is that the packet schema conflates three different things: gate selection, temporal bounds, and decision authority. These need to be separable before any of them can be mechanically enforced. Do not embed this into `EvidenceManifest` yet. Ship it as a satellite packet. Patch the spec before deeper implementation, but only after the holes below are closed.

---

## Claim Under Pressure

> A valid manifest is real as memory. It becomes payable only inside a local gate.

The claim is that `EvidenceSpendability` is a decision layer that sits above `EvidenceManifest` integrity. The manifest proves the memory exists and is uncorrupted. The spendability packet says where and when that memory can act.

---

## Strongest Objection

**The gate list is not orthogonal.**

`route_commitment`, `challenge_clearance`, `settlement_release`, `claim_support`, `bond_action`, `reputation_update`, `insurance_claim` — these are not parallel concepts. Some are states in a single trade lifecycle. Some are permissions that recur. Some are one-shot. Treating them as a flat enum in a single packet means the same `EvidenceSpendability` blob is expected to be valid for gates that have incompatible preconditions, timing semantics, and decision actors.

Concretely: `route_commitment` happens early, is forward-facing, and the decision actor is often both agents plus the protocol. `insurance_claim` happens late, may be off-protocol, and the decision actor is an insurer whose authority is not inside the trade state machine. Bundling these into one packet with one `spendable_after` field forces either (a) one packet per gate, defeating the bundling, or (b) one packet claiming authority across gates where the timing windows are structurally contradictory.

---

## Missing Control

**No gate sequencing rule.**

The proposal allows `spendable_after: state-or-time` and `spendable_until: state-or-time`. But there is no rule about what happens when a gate is skipped or rolled back. If `challenge_clearance` fails and the trade reroutes, does a spendability packet issued for `settlement_release` remain valid? The packet has no awareness of trade state transitions. Without a monotonic state anchor — not just a time — the `spendable_after`/`spendable_until` window can be satisfied in a trade state that the issuer never intended.

**No revocation path.**

The manifest has supersession. The spendability packet has no equivalent. If an arbiter rules that a piece of evidence is inadmissible for a specific gate, the packet that declared it spendable there has no tombstone mechanism. The evidence remains spendable-looking even after a ruling that it is not.

---

## Cheapest Falsifier

1. Issue a spendability packet for `settlement_release` with `spendable_after: challenge_clearance_passed`. Simulate a trade where the challenge is skipped by mutual waiver. Check: does the gate enforcement logic treat the packet as spendable or blocked? If it treats it as spendable, the `spendable_after` state anchor is not actually read from canonical trade state — it is treated as a timestamp hint.

2. Issue one `EvidenceSpendability` packet listing `gate: claim_support` and `gate: route_commitment` for the same manifest. Attempt to spend that manifest at `route_commitment` on the forward leg. Then attempt to spend it again at `claim_support` on the return leg. Check: does the protocol treat each gate spend as independent, or does the first spend mark the packet consumed? If gates share a packet and gate consumption is not tracked, double-spend is possible across legs.

3. Issue a spendability packet with `decision_actor: buyer_agent` for a gate that the protocol reserves for `arbiter`. Check: does the validator reject it at issue time, or only at gate invocation time? If the packet is issued cleanly and only fails at invocation, the packet can be generated for gates the issuer cannot actually authorize.

---

## Wording To Avoid

- **"evidence_tier as ontological rank"** — already identified as wrong in the proposal, but the spec still has `evidence_tier` as a required top-level field on the manifest without any derivation rule. Calling it a "compatibility display layer" is not a mechanical change; it is a comment. If you do not change what the validator does with it, the wording change is cosmetic.

- **"spendable as / not spendable as"** — `spendable_as: ["identity_support", "custody_support", "route_support"]` implies a controlled vocabulary. That vocabulary is not defined. What is `identity_support`? Is it a gate? A claim type? A risk category? Without a schema, agents will invent their own reading.

- **"the lip is thin, local, and timed"** — evocative but not implementable. The spec will need to translate this to: what state record does the gate read, what clock does it use, and who can dispute the reading.

---

## What Iris Should Not Infer

- **That a passing drill proves spendability logic is ready.** The drill (REPORT.md) tests manifest integrity: byte switches, hash mismatches, role inflation, tier inflation. None of the drill cases touch gate logic, temporal bounds, or multi-leg spend tracking. The drill proves the memory is durable. It does not prove the spending rules are correct.

- **That `evidence_tier` can be safely demoted without a validator change.** The tier field currently drives `TIER_REQUIREMENT` error codes and freshness windows. Demoting it to display-only or derived-only requires changing what the validator branches on. The spec does not specify what it derives from. Without that, tier demotion is a documentation change, not a behavioral change.

- **That "payable on return leg" is already modeled.** The current manifest has no leg-direction field. `subject_type` comes closest — `route` vs `claim` vs `delivery` — but a single manifest can have assets from multiple subject types. There is no protocol-level assertion that an asset is forward-only or return-eligible. The return-leg spendability claim is conceptually correct but has no current enforcement surface.

- **That `EvidenceSpendability` embedded in `EvidenceManifest` is a simpler path.** It is the opposite. Embedding binds the spendability claim to the manifest hash, meaning any gate policy change — a new actor, a revised timing window, an arbiter ruling — requires reissuing the manifest, which requires supersession, which requires the original issuer. Satellite packet keeps policy mutable without touching the immutable memory record. Keep them separate.

- **That `decision_actor` in the packet replaces gate authority rules in the protocol.** The packet can declare `decision_actor: arbiter` but it cannot grant the arbiter authority. Authority lives in the actor registry and the protocol state machine. The packet is a claim about who should decide, not a grant of the power to decide. If the protocol does not read and enforce `decision_actor` at gate invocation, it is an advisory field with no teeth.

---

**Patch direction: yes, before deeper implementation. Minimum preconditions: define gate as a typed structure (not a flat enum), add a monotonic trade-state anchor to `spendable_after`/`spendable_until`, add a revocation/tombstone path to the spendability packet, and define `spendable_as` against a closed vocabulary tied to gate types.**
