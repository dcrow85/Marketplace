---
runtime_receipt: lean_vex_20260519T162749Z_19058
source_aperture: lean-vex
source_runtime: claude_code
runtime: /Users/che/.local/bin/claude
model: sonnet
runner: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/run_lean_vex_prompt.sh
memory_mode: none_by_default
prompt_file: /Users/che/Avalanche_SYSTEM_AUDIT/aperture_bridge/inbox/iris_to_vex/2026-05-19_iris-to-lean-vex_marketplace_verifier_scope_semantics_pressure.md
authority_effect: synthesis_adversarial
promotion_status: not_promoted
---

```
RUNTIME RECEIPT
runner: claude-sonnet-4-6 (Claude Code)
invocation: lean_vex.pressure_only
source_read: prompt-excerpt only — no filesystem read performed
authority: candidate_pressure | no canon | no graph edits | no memory writes
date: 2026-05-19
```

---

## Lean Verdict

The packet design is structurally sound in intent and broken in enforcement. Every critical failure is a place where a prose field, a missing timestamp, or a soft policy gate converts a scoped claim back into a blob labeled "verified." The buyer-clears-challenge escape is the single largest hole.

---

## Claim Under Pressure

> "Verified" is not a state. A verifier stamp must carry the exact claim it supports.

The packet tries to enforce this. The packet cannot enforce this without a validator that rejects non-conforming packets before hash anchoring — and that validator does not yet exist.

---

## Strongest Objection

The packet is self-reported throughout. `inputs_not_seen` is filled in by the verifier. `method.summary` is prose. `scope` is a free string array. `display.label` is unchecked free text. A verifier who wants to overstate their claim does not need to break the schema — they just write `scope: ["full_authenticity_check"]` and `display.label: "Verified card"` and the packet is valid JSON that passes signature verification. The forbidden display list is a convention, not a constraint.

---

## Missing Control

**Buyer approval does not bind to packet scope.**

The buyer approved a verifier for a trade. That approval has a timestamp. The packet has no `issued_at` field and no reference to the approval timestamp. There is no mechanism to detect:

- verifier approved early, attestation submitted weeks later with stale inputs
- verifier's scope at approval time differs from scope in the packet
- buyer who approved "custody check" receives a packet that also claims cert correlation

Approval and attestation are decoupled with no binding check between them.

---

## Cheapest Falsifier

Add `issued_at` (unix timestamp, mandatory) and a validator rule: `issued_at` must be within N hours of the trade's `verifier_approved_at`. Deploy. Resubmit a week-old attestation. It should fail. If it doesn't, the binding is not real.

Secondary falsifier: set `display.label: "Verified card"` in a packet, sign it, submit it. If hash anchoring succeeds and the display ban fires nowhere downstream, the forbidden list is decoration.

---

## Packet Fields Still Too Loose

| Field | Problem | Severity |
|---|---|---|
| `scope[]` | free string array, no registry or enum | Critical |
| `method_id` | free string, no registered method list | High |
| `method.summary` | prose, machine-unreadable, can assert anything | High |
| `inputs_not_seen[]` | self-reported, no method-specific completeness checklist | High |
| `claim.positive[]` | prose array, can assert "card is authentic" in violation of display ban | High |
| `display.label` | free text, no banned-phrase gate before anchoring | Critical |
| `challenge.failure_policy` | "or ask buyer" escape softens every hard gate | Critical |
| missing: `issued_at` | freshness window unenforceable without it | Critical |
| missing: `buyer_nonce` as first-class field | referenced only in `method.summary` prose | High |
| missing: `supersedes` / invalidation | re-attestation semantics undefined | Medium |

---

## Validator Rules Mandatory Before Alpha

1. **Scope registry check**: reject any `scope` value not in a registered enum. Free strings make scope semantically empty.
2. **Method registry check**: reject any `method_id` not in a registered method list.
3. **Banned-phrase gate on `display.label` and `claim.positive[]`**: run against a machine-enforced list before hash anchoring. The forbidden list must be a validator rule, not documentation.
4. **`issued_at` freshness check**: mandatory field; reject packets where `issued_at` is outside configurable window relative to `verifier_approved_at`.
5. **`buyer_nonce` as first-class field**: if method requires nonce, nonce must be a top-level packet field that the validator can check against trade state — not embedded in prose.
6. **No second attestation without explicit supersession**: reject a second packet for the same `trade_id` + `subject_hash` unless first packet carries a `superseded_by` pointer or is explicitly invalidated.

---

## Wording To Avoid

Ban these in `display.label`, `claim.positive[]`, `method.summary`, and any derived UI string:

- `Verified` (standalone, as noun or adjective)
- `Authentic` / `Authenticity confirmed`
- `Safe` / `Safe trade`
- `Guaranteed` / `No risk`
- `Confirmed genuine`
- Any label that does not surface at least one item from `inputs_not_seen`

---

## What Iris Should Not Infer

- A signed packet means the claim is true. It means a key signed a JSON blob. Signature validity and claim validity are orthogonal.
- Buyer approval means buyer understood scope. Approval is a click. Scope comprehension is not verified.
- "Active in registry" means the verifier is credentialed or trustworthy. It means they have not been removed. Outcome-scoped reputation is not implemented.
- Challenge hooks being present in the packet means they will fire. The `or ask buyer` escape in `failure_policy` means any buyer can clear a challenge unilaterally. A colluding buyer + verifier bypasses all challenge hooks with one click.
- The packet format prevents display collapse. Without a validator that checks `display.label` before anchoring and a display layer that is forbidden from overriding it, the packet format is a suggestion.

---

## Minimal Patch List (Ordered by Risk Reduction)

1. **(Critical)** Add mandatory `issued_at` field; validator binds to `verifier_approved_at` within a freshness window.
2. **(Critical)** Enumerate `scope` values in a registry; validator rejects unknown values at submission.
3. **(Critical)** Machine-check `display.label` and `claim.positive[]` against banned-phrase list before hash anchoring.
4. **(Critical)** Remove "or ask buyer" from `failure_policy` or gate it behind an explicit, separately signed buyer override — not a default escape.
5. **(High)** Promote `buyer_nonce` to a first-class top-level field.
6. **(High)** Register `method_id` values; validator rejects unknown methods.
7. **(High)** Replace self-reported `inputs_not_seen[]` with a method-specific completeness checklist that the verifier must attest against, not author.
8. **(Medium)** Add `supersedes` field and define re-attestation invalidation flow.
9. **(Medium)** Define per-`subject_type` lock-binding rules explicitly; do not assume item_fingerprint semantics generalize to evidence_packet or claim_packet subjects.
