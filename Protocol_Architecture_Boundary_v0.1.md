# Protocol Architecture Boundary v0.1

Generated 2026-06-12.

The pre-launch decision the audit converged on. Across ten domains the findings
shared one shape: the contract enforces a thin mechanical spine, and every richer
guarantee lives off-chain. This document draws that line on purpose — stating, for
each deferred finding, whether it should be **bound on-chain** or kept as a
**documented off-chain obligation** — so the launch architecture is chosen, not
defaulted into.

## The principle

```text
The contract is a thin, hard spine: identity, replay, typed witnesses, registry
status, payout bounds, and liveness. Everything semantic — is the card real, is
the assembly coherent, is the judge committed, is the verifier scope adequate —
is judgment, and judgment lives off-chain, honestly labeled and measured.
```

This is not a compromise; it is the project's thesis ("accountable, not
impossible") expressed as an architecture. Forcing semantic truth on-chain would
be the overclaim the protocol exists to refuse. A minimal trusted base is also
cheaper, safer, and a smaller audit surface.

## The decision rule

For any deferred guarantee, bind it on-chain **only if both** hold:

```text
1. It protects FUNDS or LIVENESS directly (not merely "nice to guarantee"), and
2. It can be a MECHANICAL check — a hash match, a balance bound, a timeout —
   not a semantic judgment.

Otherwise: keep it off-chain, anchor a commitment hash so the off-chain judgment
is attributable and gateable, disclose the boundary, and measure quality through
the legibility vector and the settlement-calibration loop.
```

The second clause is the resolution pattern the protocol already uses: the route
and delivery witnesses anchor hashes on-chain while the assembly graph is
validated off-chain. Generalize it. "Anchor the hash, validate off-chain,
disclose the boundary" is the default; on-chain binding is the exception, earned
only by funds/liveness + mechanizability.

## The deferred cluster, dispositioned

| finding | what is deferred | recommendation | why |
|---|---|---|---|
| AUD-D6-002 | revoked arbiter + no proposal deadlocked a claim | **fixed in code** | liveness now has a staged timeout path: after the human-arbiter window, a JSC-bound floor executor can resolve; after the floor window, a default unresolvable remedy can close the claim. |
| AUD-D6-003 | challenge clearance checked subject, not scope | **fixed in code** | challenges now bind an `allowedResolutionScopeHash`; attestation clearance requires a mechanical scope hash match. |
| AUD-D6-001 | JudgmentSupplyCommitment was not bound | **fixed in code** | `createTrade` now requires a nonzero per-trade `jscHash` and registered floor executor; the contract anchors the hash while SLA/fee/remedy/conflict content remains off-chain. |
| AUD-D6-004 | conflict / SLA / fee / remedy metadata not parsed | **documented off-chain** | inherently legible judgment; disclose, and measure conflict/SLA quality via the legibility vector + calibration. |
| AUD-D2-SW-001/002 | wall-bundle / assembly-history graph coherence | **documented off-chain (keep)** | already anchors the hashes; coherence is graph validation, not a mechanical check. On-chain would overclaim. Disclosure already corrected (AUD-D9-001). |
| AUD-D5-001 | exit-scam EV omits `cost_to_fake` | **fixed in off-chain model** | the EV now subtracts conservative `cost_to_fake` floors from the legibility vector band, so cheap-to-fake and expensive-to-fake trades separate instead of firing one blanket warning. |
| AUD-D8-001 | missing-symbol overlap matrix not wired | **fixed in catalog tool** | `prints_without_rarity_symbol` is now a machine-readable, manifest-pinned matrix; `variant_trap_status` is derived from overlap clearance, so blank traps no longer mean unexamined clean. |
| AUD-D7-002 | row policy still inside the fact-catalog hash | **fixed in catalog split** | row `agent_decision_profile` and support policy now live in the policy artifact; fact catalog bytes contain no policy-shaped paths. |
| AUD-D7-003 | challenger independence is self-declared | **documented off-chain frontier** | genuine independence cannot be mechanically proven; measure it through the calibration loop, never claim it. |
| AUD-D4-002 | no intent->spendability promotion path yet | **gate + re-audit** | build the path WITH the legible/spendable boundary (a tool decision must require a separate named spendability authority), then re-run Domain 4. |
| AUD-D3-001 | gaps G4 (Identity), G7 (Time) lack a negative case | **fixed in audit hygiene** | the gap negative drill now covers G1-G7, including key-is-not-person and snapshot-not-process cases. |
| AUD-D10-001 | two drills carry self-grading risk | **fixed in audit hygiene** | trader tournament and seller-bootstrap now emit mutation proofs that detect deliberately weakened guards. |

Net: the launch-gating Domain 6 spine has landed: **two true on-chain binds**
(D6-002 liveness, D6-003 scope-match), **one on-chain anchor** (D6-001 JSC
hash), and everything else stays off-chain — fixed, disclosed, and measured.
The contract grew by a timeout/floor-resolution path, a scope-hash match, a
per-trade JSC hash, and a floor-executor address; it still does not learn to
judge.

## The honesty requirement

Whatever stays off-chain must obey three rules, all of which the audit already
began enforcing:

```text
1. Disclosed: no doc may imply the contract enforces an off-chain obligation
   (the AUD-D9-001 / D6-005 / D4-001 de-overclaim work; keep it current).
2. Labeled: every off-chain guarantee is tagged enforced / legible / judged at
   the point it is surfaced.
3. Measured: the legibility vector measures the off-chain quality, and the
   settlement-calibration loop scores whether the off-chain judgment held —
   so the residual risk is visible, not hidden.
```

An off-chain obligation that is disclosed, labeled, and measured is a legitimate
architecture. One that is implied to be on-chain is the failure.

## The launch gate

Before value-bearing alpha:

```text
- BIND: D6-002 liveness fallback and D6-003 scope-match are in the contract and
  guarded by tests. (Landed.)
- ANCHOR: D6-001 JSC commitment hash is bound into trade formation and route
  gates. (Landed.)
- DISCLOSE: every off-chain obligation in the table is named in the spec/API/
  agent layer as a caller/validator responsibility, not an escrow guarantee.
- MEASURE: cost_to_fake is wired into the EV (D5-001) and the legibility +
  calibration loop covers the off-chain judgments. (Landed.)
- FALSIFY: the audit hygiene items (D3-001 gap cases, D10-001 drill mutations)
  are closed, so the falsification is complete. (Landed.)
```

The BIND, ANCHOR, MEASURE, and FALSIFY launch-gate items have landed. Value-
bearing trades must still surface the remaining off-chain JSC content boundary
(conflict, SLA, fee, remedy policy, calibration) as caller/validator
responsibility rather than escrow enforcement.

## Open questions

```text
- How much of the off-chain validator stack ships as the protocol vs as the
  reference agent — i.e., where the trusted-base/agent boundary itself sits.
```
