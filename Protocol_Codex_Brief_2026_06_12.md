# Codex Brief — Project State & Live Work (2026-06-12)

One read to get current. This supersedes `Claude_Fable5_Protocol_Rundown.md` for
present state; that file remains historical. Read this, then the canonical docs
listed below before touching a lane.

## Where we are

The protocol is an agentic physical-goods trade protocol, alpha-scoped to vintage
Pokemon single-card trades (No Rarity Japanese Base as the lab). It is being
branded **Cairn** (decided 2026-06-11; not yet propagated into code/docs — they
still say "Marketplace Protocol"). Thesis unchanged: every claim is `enforced`
(contract/validator), `legible` (signed/typed but judgment-dependent), or
`judged` (human/agent/verifier/arbiter); the protocol makes fraud accountable,
not impossible; spendability is inherited through assembly, not inferred from
appearance.

The defining architectural fact, now decided: **the contract is a thin, hard
spine** — identity, replay, typed witnesses, registry status, payout bounds,
liveness — and **everything semantic is enforced off-chain, honestly labeled and
measured.** See `Protocol_Architecture_Boundary_v0.1.md`. This is the lens for
all current work.

## What landed this arc (so you are current)

```text
- Typed spendability digest: route/delivery spendability is now a contract-
  derived typed digest (escrow, chain, trade, gate, leg, artifact hashes,
  issuer). Cross-trade/cross-gate replay blocked on-chain. The EVM Python drills
  were repaired to call the contract views. forge = 88 passing.
- Full ten-domain adversarial audit COMPLETE, across four chairs (Claude/Fable,
  Codex, Hypatia, Aristotle) with blind rounds + sealed parent verification.
  No critical findings. All dispositions in Protocol_Audit_Findings_Ledger.md.
- Catalog lineage hardened (Domain 7): content-addressed, fact/policy split,
  poison blocked/held, monoculture challenge discounted, off-set/cross-set/non-
  TCG confusion returns no_in_set_match.
- Cairn brand + the "forensic record" design language: the page is the record,
  not an ad for it. Two proven components (specimen plate, custody ledger) in
  mockups/. See memory/cairn_brand and Protocol_Collector_Aperture for the
  product thinking.
- Product-layer specs: legibility is for agents, understanding is for humans, the
  agent is the transducer; the Collector Aperture configures which understanding
  at what altitude (glance/decide/audit) for what risk budget.
```

## Canonical docs (read before working a lane)

```text
Protocol_Architecture_Boundary_v0.1.md   - the on-chain/off-chain decision (read first)
Protocol_Audit_Findings_Ledger.md        - current disposition of every finding
Marketplace_Protocol_Full_Spec.md        - main prose spec
Protocol_Walls_v0.1.md                   - the 16 walls (enforced/legible/judged)
Protocol_Gaps_v0.1.md                    - the 7 permanent physical/digital gaps
Protocol_Legibility_v0.1.md              - vector-not-verdict measurement
Protocol_Collector_Aperture_v0.1.md      - the human attention contract + agent interpretation
chain/src/MarketplaceEscrow.sol          - the contract spine
```

Do not touch `mockups/` or `/Users/che/.claude/launch.json` — reviewer design
work. One untracked catalog-evolution run dir is also expected.

## Live work — three lanes

### Lane 1 (launch-gating): three contract changes

These are the only deferred items that gate value-bearing alpha, and the only
ones that touch Solidity. From the architecture decision: two true binds and one
anchor. Each carries an embedded design choice flagged for human confirmation —
do NOT pick unilaterally; surface as a finding if unsure.

Update: the D6-001 and D6-002 design is now specified in
`Protocol_Arbitration_v0.1.md`. The JSC (1C) is the agreed arbitration ladder,
anchored on-chain. The D6-002 default (1A) is **escalate to the agreed floor
arbiter, which produces a ruling** — a unilateral refund is only the last resort
if even the floor cannot rule. Implement 1A/1C per that spec; 1B is unchanged.

**1A. AUD-D6-002 — bind a liveness fallback for a stuck claim.**
```text
problem: a claim open with a revoked arbiter and no replacement proposal
  deadlocks at ClaimOrDisputePending; emergencyReplaceArbiter reverts
  ReplacementProposalMissing. Buyer escrow is locked with no path to a ruling.
  (Guarded today by testAuditD6RevokedArbiterMidClaimHasNoEmergencyPathWithout-
  Proposal and ...MidRouteClaimHasNoAutomaticFallback, which assert the deadlock.)
do: add an on-chain timeout path that resolves a stuck claim when no arbiter can
  act for a defined window and no replacement is proposed.
DESIGN CHOICE (flag for human): the default remedy. Recommended conservative
  default = refund-to-buyer (buyer funds are held; the seller failed to supply a
  reachable judge), but split / pre-bound-fallback-arbiter are alternatives with
  fairness trade-offs. Do not ship a default without confirmation.
```

**1B. AUD-D6-003 — bind a verifier-scope match at challenge clearance.**
```text
problem: clearFingerprintChallengeWithAttestation checks only that the
  attestation subject equals the active challenge; it does not check the
  attestation SCOPE is adequate. A verifier approved for "symbol-field-only-not-
  authenticity" can clear an authenticity challenge. (Guarded by
  testAuditD6NarrowVerifierScopeCanClearChallengeBySubjectOnly.)
do: require the attestation's scopeSetHash to equal (or be a member of) an
  allowed challenge-resolution scope bound to the challenge. Mechanical hash
  match — no semantic parsing.
DESIGN CHOICE (flag): where the allowed-scope set is bound — on the challenge at
  openFingerprintChallenge, or a policy-set the buyer references.
```

**1C. AUD-D6-001 — anchor a JudgmentSupplyCommitment hash.**
```text
problem: a trade can route, settle, and resolve a claim with only a registry-
  active arbiter and no committed case path (SLA/fee/remedy/conflict/fallback).
  (Guarded by testAuditD6SettlementCanCompleteWithRegistryOnlyArbiter and
  ...ClaimCanResolveWithRegistryOnlyArbiterAndRulingHash.)
do: bind a nonzero judgment_supply_commitment hash into the trade and require it
  present before route lock and/or claim resolution. Anchor the hash only — the
  contract does NOT parse SLA/fee/remedy/conflict (those stay off-chain,
  validated by callers, measured by the legibility layer).
DESIGN CHOICE (flag): anchor granularity — per-trade JSC, or a reusable provider
  commitment the trade references; and which gate requires it (route lock vs
  claim open vs both).
```

Acceptance criteria for Lane 1:
```text
- forge stays green; report before/after counts.
- The existing D6 audit tests currently ASSERT THE OPEN BEHAVIOR. After the
  binds they must be UPDATED to assert the closed behavior (deadlock now reaches
  the default remedy; narrow scope now reverts; registry-only arbiter now
  requires a JSC hash), plus add positive tests for the new paths. Say explicitly
  which assertions you flipped and why.
- Repair any Python EVM drill that constructs trades/claims if a new required
  field breaks it (same lesson as the typed-digest drill repair).
- On landing, flip AUD-D6-001/002/003 in the ledger from deferred to fixed_in_code
  with the guarding test names; leave AUD-D6-004 as documented off-chain.
- Do not bind D6-004 (conflict/SLA metadata) on-chain — it stays off-chain by
  decision.
```

### Lane 2 (off-chain hardening — not launch-gating, but pre-network)

```text
- AUD-D5-001: wire cost_to_fake (from the legibility vector) into the exit-scam
  EV in external_trust_import_drill.py so the deterrence signal discriminates.
- AUD-D8-001: derive variant_traps from prints_without_rarity_symbol so a blank
  trap list means "checked and ruled out," before catalog expansion.
- AUD-D7-002: finish fact/policy unbundling (move agent_decision_profile out of
  the hashed fact catalog).
- AUD-D3-001: add G4 (Identity) and G7 (Time) negative cases to the gap drill.
- AUD-D10-001: mutation-test the trader tournament and seller_bootstrap drill.
```

### Lane 3 (product/design — reviewer-led, not Codex)

```text
- Collector Aperture pipeline: wire parse -> reflect-back -> sign into
  buyer_want_agent.py (per Protocol_Collector_Aperture_v0.1.md).
- Human Surface spec: the glance/decide/audit rendering the aperture drives.
- These are design-led; coordinate before implementing.
```

## Working discipline

```text
- Multi-chair: contract/execution work is implemented by one chair and verified
  by another (author != verifier). Blind audit rounds: the executing chair is
  given claim + attack surface as questions, never the reviewer's hypotheses;
  the reviewer holds sealed pre-registration for the post-round compare.
- Every finding gets exactly one disposition from the canonical vocabulary; the
  ledger is the current-state pointer; per-run registers are frozen history.
- No-overclaim is the law: no doc may imply the contract enforces an off-chain
  obligation. Disclose, label (enforced/legible/judged), and measure.
- Commit in focused units; push; report before/after test counts and which
  ledger rows you moved. The parent re-runs the key case before endorsing a
  disposition flip.
```
