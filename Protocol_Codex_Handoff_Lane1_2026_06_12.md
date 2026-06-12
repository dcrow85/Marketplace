# Codex Handoff — Lane 1: Judgment-Supply Contract Binds

Generated 2026-06-12. For a Codex session; read standalone. This is the
launch-gating Solidity work from the audit's Domain 6 findings. Author != verifier:
you implement; a reviewer re-runs the key cases before any disposition flips.

Read first: `Protocol_Architecture_Boundary_v0.1.md` (the on-chain/off-chain
rule) and `Protocol_Arbitration_v0.1.md` (which specifies 1A and 1C below). Do
NOT touch `mockups/` or `/Users/che/.claude/launch.json`.

Baseline: `forge test` = 88 passing. The existing Domain 6 audit tests in
`chain/test/MarketplaceEscrow.t.sol` currently **assert the OPEN (vulnerable)
behavior** — they will need their assertions flipped to assert the fix. Call that
out explicitly when you do it.

The decision rule for all three: bind on-chain only what protects funds/liveness
AND is mechanical (a hash match, a timeout, a balance bound). Anchor a hash for
semantic content; never make the contract parse SLA/fee/conflict text.

---

## 1A. AUD-D6-002 — liveness: no claim may deadlock

Problem: a claim open with a revoked arbiter and no replacement proposal
deadlocks at `ClaimOrDisputePending`; `emergencyReplaceArbiter` reverts
`ReplacementProposalMissing`. Buyer escrow is locked with no path to a ruling.
Asserted today by `testAuditD6RevokedArbiterMidClaimHasNoEmergencyPathWithout-
Proposal` and `testAuditD6RevokedArbiterMidRouteClaimHasNoAutomaticFallback`.

Design (per `Protocol_Arbitration_v0.1.md`): the resolution is **escalate to the
agreed floor arbiter, which produces a ruling** — not a unilateral refund. Add a
staged-timeout fallback:

```text
stage 1: the human-arbiter window (existing).
stage 2: if it lapses with no ruling, open a FLOOR-RESOLUTION path — a ruling
         bound to the trade's JSC floor commitment (1C) may resolve the claim,
         with the same 0..10,000 bps payout bounds as resolveClaim.
stage 3: if even the floor path is not exercised within a further window, apply
         default_remedy_if_unresolvable.
```

Contract shape (adapt names): a `resolveClaimViaFloor(tradeId, rulingHash,
floorSignature)` callable only after the stage-1 window, where `floorSignature`
is by the floor-executor address named in the bound JSC, and payout bounds are
enforced exactly as `resolveClaim`. The floor ruling is computed off-chain and
verified off-chain by re-run; on-chain it is anchored, not recomputed.

```text
DESIGN CHOICES (flag for human sign-off; implement the recommended default but
mark it):
- floor-executor authorization: recommended = a `floor_executor` address named
  in the JSC whose signature the contract checks. (Alt: a challenge-windowed
  open submission. The named-address form is the mechanical one — prefer it.)
- default_remedy_if_unresolvable (stage 3): recommended = refund-to-buyer (funds
  are held; the seller failed to supply any reachable judge). Alt: split.
- window lengths for stage 1 / stage 2.
```

Acceptance: the two deadlock tests are updated to assert the claim now REACHES a
ruling via the floor path (and a new test that stage-3 default fires only when
the floor path is not exercised). No claim state can remain terminally stuck.

---

## 1B. AUD-D6-003 — verifier scope must match the challenge

Problem: `clearFingerprintChallengeWithAttestation` checks only that the
attestation subject equals the active challenge; it does not check the
attestation SCOPE is adequate. A verifier approved for
`scope:checked-symbol-field-only-not-authenticity` can clear an authenticity
challenge and the trade routes. Asserted by
`testAuditD6NarrowVerifierScopeCanClearChallengeBySubjectOnly`.

Design: a mechanical scope-hash match. The challenge declares the resolution
scope it requires; clearance requires the attestation's approved `scopeSetHash`
to equal (or be a member of) that allowed scope.

```text
DESIGN CHOICE (flag): where the allowed scope is bound — recommended = on the
challenge at openFingerprintChallenge (the buyer opening an authenticity
challenge declares the resolution scope required). Implement an
`allowedResolutionScopeHash` on the challenge; require attestation.scopeSetHash
== challenge.allowedResolutionScopeHash at clearance.
```

Acceptance: the narrow-scope test is updated to assert clearance now REVERTS when
the attestation scope does not match; add a positive test that a matching-scope
attestation still clears.

---

## 1C. AUD-D6-001 — anchor the JudgmentSupplyCommitment

Problem: a trade can route, settle, and resolve a claim with only a registry-
active arbiter and no committed case path. Asserted by
`testAuditD6SettlementCanCompleteWithRegistryOnlyArbiter` and
`testAuditD6ClaimCanResolveWithRegistryOnlyArbiterAndRulingHash`.

Design (per `Protocol_Arbitration_v0.1.md`): the JSC is the agreed arbitration
ladder (floor model+config, tiers, escalation, who-pays, the floor_executor).
Bind its **hash** into the trade and require it present before funds commit to
motion. The contract anchors the hash only; SLA/fee/conflict content stays
off-chain (AUD-D6-004 stays a documented off-chain obligation — do NOT bind it).

```text
do: add a nonzero `jscHash` to the trade, required before route lock
    (commitRoute reverts without it). The floor-resolution path (1A) reads the
    floor_executor commitment from the JSC binding.
DESIGN CHOICES (flag):
- where jscHash is set: recommended = at createTrade (formation), or a
  `bindJsc(tradeId, jscHash, buyerSig, sellerSig)` step required before
  commitRoute. Prefer whichever is least invasive to the existing createTrade
  signature.
- granularity: per-trade jscHash that may reference a reusable provider
  commitment (the JSC schema allows provider_refs). Per-trade binding is the
  on-chain unit.
```

Acceptance: the two registry-only tests are updated to assert route lock / claim
resolution now REQUIRE a bound jscHash; add a positive test that a trade with a
bound JSC routes and resolves.

---

## Cross-cutting acceptance

```text
- forge test stays green; report before/after counts (88 baseline + new).
- The Domain 6 audit tests assert the OPEN behavior today. Flip their assertions
  to assert the fix, and say in the commit which assertions you flipped and why
  (gap-demo -> fix-demo). Add the positive tests named above.
- Repair any Python EVM drill (protocol_e2e.py and dependents) that breaks
  because a trade now requires a jscHash or a challenge now requires an allowed
  scope — same lesson as the typed-digest drill repair. Drills must stay green.
- On landing, update Protocol_Audit_Findings_Ledger.md: flip AUD-D6-001, -002,
  -003 from deferred_with_owner_and_trigger to fixed_in_code with the guarding
  test names. Leave AUD-D6-004 as documented off-chain (do not bind it).
- Do NOT implement Lane 2 or Lane 3 here.
```

## Standing rules / hand-back

```text
- Independence: author tests against source. Do not weaken a test to make a path
  pass. The flipped audit tests must still be adversarial (they now prove the
  fix, not the gap).
- Honesty: the floor ruling is anchored, not recomputed on-chain; the contract
  does not judge — it gates on a hash, a timeout, and a balance bound. No doc may
  imply the contract enforces the JSC content.
- Surface, don't decide: implement the recommended default for each flagged
  DESIGN CHOICE but mark it clearly so the human can confirm or change it before
  value-bearing alpha.
- Push focused commits (one per item is fine). Report per-item test names, the
  before/after forge count, the drills you repaired, and the ledger rows moved.
- The reviewer will independently re-run the flipped deadlock, scope, and
  registry-only cases before endorsing the disposition flips.
```
