# Protocol Audit Brief: Domain 2 Stitched Witness v0.1

Generated 2026-06-11.

This is an execution brief for a blind audit round against
`Protocol_Audit_v0.1.md`, Domain 2 (The Witness and Spendability Layer). It is
written for an agent session with no prior context. Read it standalone.

## What This Round Is

The canonical audit spec lists a Domain 2 attack that has not yet been executed
as a runnable case:

```text
present a witness whose preimage fields are individually valid but whose
combination never occurred (stitched witness)
```

Your job is to make that attack runnable against the committed contract, then
report honestly what the contract does and does not enforce. This is a blind
round: a reviewer has independently pre-registered their own findings and will
not reveal them until your round is complete. Do not seek them out. The value
of this round is your independent conclusion, not agreement with anyone.

## Claim Under Test

```text
Route and delivery commitment requires a coherent assembly of provenance
artifacts. Spendability is inherited through assembly, not inferred from
appearance: a route cannot lock unless the artifacts that authorize it form a
genuine, mutually-consistent chain.
```

The project's load-bearing slogan is "spendability is inherited through
assembly, not inferred from appearance." This round tests how much of that is
enforced by the contract versus assumed off-chain.

## Attacker Goal

You are a seller who wants to lock a route (and, if reachable, open delivery)
without having assembled a genuine, coherent provenance chain. You want the
contract to accept a commitment built from artifacts that are each individually
well-formed but that never coherently belonged together:

```text
- a wall bundle hash taken from one context
- an assembly history hash taken from an unrelated context
- a spendability hash that was never minted from a packet bound to this trade,
  gate, and the other artifacts
- a freshly minted route hash
```

If the contract locks the route anyway, you have shown that the on-chain layer
enforces the shape of the commitment but not the coherence of the assembly. If
the contract rejects it, you have shown the assembly coherence is genuinely
contract-enforced. Either result is a finding. Report what actually happens.

## Source Surface To Investigate

Author against the committed contract source, not against any drill fixture.
Investigate these questions and answer each with a runnable case or a precise
source citation. Do not assume the answer; read the code.

```text
1. In commitRoute, what does the contract validate about wallBundleHash and
   assemblyHistoryHash beyond nonzero presence? Does it derive an expected value
   for either and compare, or accept them as caller-supplied opaque bytes32?
2. Does the route assembly witness derivation bind these artifacts in a way that
   prevents a seller from CHOOSING all of them freely at commit time? Separate
   "cannot substitute after commit" from "cannot freely choose at commit."
3. Is the spendability hash derived from any typed, trade-bound preimage on-chain,
   or is it an opaque capability the caller supplies? (Note: a prior slice,
   AUD-D1D2-001, touched the spendability layer. Do not copy its fixtures; reach
   your own conclusion about whether the same opacity extends to assembly.)
4. Are there any declared errors related to wall-bundle or assembly mismatch?
   For each, determine whether it is reachable from any caller path. A declared
   error that is never thrown is itself a finding.
5. Does any artifact (wall bundle, assembly history, spendability) have to
   reference, cite, or match the trade's prior committed state (evidence,
   attestation, fingerprint, inventory) on-chain, or only the item fingerprint
   and inventory lock via the witness?
6. Repeat the relevant subset for the delivery gate (markDelivered / delivery
   witness): can a delivery be stitched the same way?
```

## What To Produce

```text
1. New runnable cases in chain/test/MarketplaceEscrow.t.sol that express the
   stitched-witness attack(s). Each case states the attacker goal, then asserts
   what the contract actually does. A case that documents an accepted-but-
   incoherent commitment is as valuable as one that documents a rejection.
2. A findings register: Protocol_Audit_Execution_Domain2_StitchedWitness_v0.1.md
   with one packet per finding: id, domain, severity, type, claim under test,
   attack, observed behavior, expected behavior, runnable case name, and exactly
   one disposition.
3. A revised label row for each surface touched (enforced / off-chain dependency
   / etc.), corrected against the code.
```

## Rules (from the canonical spec, do not relax)

```text
- Independence: author cases against contract source, not existing fixtures.
- Expectation independence: state what the attacker wants, then check what
  happens. Do not write the case to confirm a hope.
- No tailoring: do not modify the contract to make a case pass or fail. The
  contract is frozen for this round. If you believe a contract change is the
  remediation, record it as a disposition (deferred_with_owner_and_trigger or
  fixed_in_code on a clearly separate, labeled commit), never as a quiet edit
  that makes your own attack pass.
- Honesty typing: proven_bypass ships with the case that proves it;
  suspected_weakness is a reasoned argument with no runnable case; do not
  inflate one to the other.
- Severity is by buyer impact, not cleverness. A finding's severity rises if any
  agent-facing doc tells agents to treat the stitched artifact as verified.
- If you find nothing material, record weak_audit_suspected and say why your
  cases were capable of catching a real defect (otherwise the round proved
  nothing).
- Do not close any finding by editing only documentation unless the finding is
  doc drift, overclaim, or a deliberately documented residual risk.
```

## Disposition Vocabulary

Use exactly one per finding, from the canonical spec:

```text
fixed_in_code
fixed_in_docs_for_doc_drift
documented_residual_risk
accepted_alpha_limit_with_cap
converted_to_test
split_to_external_security_review
deferred_with_owner_and_trigger
closed_as_false_positive_with_case
```

## Verification

```text
cd /Users/che/Marketplace/chain
forge test
forge fmt --check test/MarketplaceEscrow.t.sol
```

Report the pass count. Do not commit over a dirty unrelated tree; the only
unrelated pending change is the Japanese release map, which is not yours to
touch.

## Handback

When done, hand back: the findings register, the new test names, the forge pass
count, and your one-line answer to the load-bearing question:

```text
At the contract layer, is spendability inherited through assembly, inferred from
appearance, or some precise split between the two?
```

The reviewer will then compare your independent findings against the sealed
pre-registered set. Disagreement is informative; do not tailor to avoid it.
