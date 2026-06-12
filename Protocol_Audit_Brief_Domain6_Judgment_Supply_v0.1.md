# Protocol Audit Brief: Domain 6 — Judgment Supply v0.1

Generated 2026-06-12. Blind audit round against `Protocol_Audit_v0.1.md`,
Domain 6. Read standalone (no prior context). This is a BLIND round: a reviewer
has pre-registered sealed expectations and will not reveal them. Do not seek
them. The value is your independent conclusion, reached from the source.

Scope: Domain 6 only. Do not touch the design mockups (`mockups/`) or
`/Users/che/.claude/launch.json` — reviewer's work.

## Claim under test

```text
Verifiers and arbiters are committed service paths — fee source, response
window (SLA), remedy cap, conflict disclosure, and a fallback that reaches a
ruling — not merely registry entries. Registry membership is not judgment
supply.
```

## Attacker goal

You want a trade to reach settlement, or a claim to resolve (or fail to
resolve), while *relying on judgment that was only hoped for, not committed*.
Concretely: settle leaning on a registry-active arbiter with no committed case
path; deadlock a trade by revoking the arbiter mid-dispute; have a narrowly
scoped verifier treated as a broader guarantee; or rely on a judge with an
undisclosed conflict. If any of these succeeds — or if the contract/docs imply a
commitment that is not actually bound — that is the finding.

## Source surface (investigate; answer each with a runnable case or a precise citation — do not assume)

Read `chain/src/MarketplaceEscrow.sol`, `chain/src/MarketplaceActorRegistry.sol`,
`Protocol_Walls_v0.1.md` (the JudgmentSupplyCommitment wall),
`chain/script/protocol_e2e.py`, and the arbiter/verifier agent instructions.

```text
1. What does the contract actually require about the arbiter and verifier before
   a trade can route, settle, or a claim can resolve? Registry membership only,
   or a bound commitment (SLA / fee source / remedy cap / conflict disclosure /
   fallback)? Where, exactly, in the code?
2. Is any judgment-supply commitment bound to the trade on-chain before
   settlement or claim resolution, or is it an off-chain/agent artifact? If
   off-chain, can a trade reach settlement with no committed case path at all?
3. Revoke the primary arbiter mid-trade AND mid-claim. Does the replacement /
   emergency-timeout path actually reach a ruling in every case, or is there a
   state that deadlocks (e.g., a claim open with no active arbiter and no
   replacement proposed within the window)?
4. Can a verifier whose attestation is narrowly scoped (e.g., "checked the
   photos / symbol field only", with `not_claiming` fields) be consumed anywhere
   — contract, tool, or agent guidance — as a broader authenticity or condition
   backstop than it claims?
5. Conflict: can an arbiter or verifier with a stake in the outcome be relied on
   without disclosing it? Is disclosure required before reliance, or a legible-
   but-optional field?
6. Availability/SLA: is the committed response window enforced or surfaced before
   the buyer accepts, or only discoverable after a claim stalls?
7. Overclaim check: does any doc (spec, walls, agent API, SKILL) state or imply
   that the contract enforces committed judgment supply, when the contract
   enforces only registry membership plus replacement mechanics and payout
   bounds?
```

## Produce

```text
- Runnable cases: forge tests for the contract behaviors (revoke/replacement/
  settlement-without-commitment/payout bounds); a Python harness case if the
  revoke/deadlock path needs the EVM end-to-end.
- A findings register Protocol_Audit_Execution_Domain6_v0.1.md: one packet per
  finding (id, domain, severity, type, claim, attack, observed, expected,
  runnable case or citation, exactly one disposition from the canonical
  vocabulary).
- Your one-line verdict: at the contract layer, is judgment supply committed or
  merely registry-listed, and where is the boundary?
```

If you find nothing material: record `weak_audit_suspected` AND show your cases
could have caught a real defect (mutation-test: weaken one check in a scratch
edit, confirm a case fails, revert).

## Standing rules

```text
- Independence: author cases against source, not copied from existing fixtures.
- Expectation independence: state what the attacker wants, then check what
  happens — not what you hope happens.
- Honesty typing: proven_bypass ships the runnable case; suspected_weakness is
  reasoned-only; do not inflate one to the other.
- Severity by buyer impact, not cleverness.
- Exactly one disposition per finding. A finding with no disposition is open.
- Do not close a finding by editing only docs unless it is doc drift, overclaim,
  stale guidance, or a deliberately documented residual risk.
- Do not weaken a test to make a case pass.
```

## Hand-back

```text
- forge test stays green (report the count; 81 baseline + any new cases).
- Push focused commits; leave mockups/ and .claude/ untouched; update the
  AUD-D6 rows in Protocol_Audit_Findings_Ledger.md on landing.
- Report: per-finding register, new test names, pass counts, and your one-line
  Domain 6 verdict.
- The reviewer will independently re-run the key case and compare your findings
  against the sealed pre-registration before endorsing any disposition.
```
