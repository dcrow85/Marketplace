# Protocol Audit v0.1

Generated 2026-06-10.

This is an adversarial audit specification for the Marketplace Protocol as it is
currently written. It is not a celebration of the walls. Its purpose is to find
the places where the protocol overclaims, where a wall can be walked around,
where a gap is wider than the docs admit, where two subsystems disagree, and
where the implementation has drifted from the spec.

The governing rule of this audit:

```text
An audit that finds nothing has failed. The default assumption is that the
protocol overclaims somewhere. The auditor's job is to locate it, not to
confirm the protocol is sound.
```

A drill that asserts `Passed: True` is not evidence the protocol is correct. It
is evidence that one author's expectations matched one author's fixtures. This
audit exists to attack that circularity.

## Why This Audit Exists Now

The protocol just acquired a fast-growing surface: legibility vectors, gap
taxonomy, catalog lineage, trust import, bootstrap economics, and a multi-set
expansion map. Each was added with its own drill, and each drill passes. That
is exactly the condition under which a system is most dangerous: many green
checkmarks, authored by the same two hands that wrote the code, never
cross-examined against each other.

Before this protocol is shown to a skeptical, provenance-obsessed, digitally
astute collector network, it must survive an audit designed by an adversary who
wants it to fail.

## Auditor Independence

This audit must not be graded by the subsystem authors using the subsystem
fixtures. Three independence rules:

```text
1. Fixture independence: audit cases are authored against the spec and the
   contract source, not copied from existing drill fixtures.
2. Expectation independence: each audit case states what an attacker wants to
   happen, then checks what actually happens. It does not state what the
   author hopes happens.
3. Falsification symmetry: every "the protocol enforces X" claim gets a case
   that tries to violate X; every "the protocol cannot enforce Y" claim gets a
   case that confirms Y is genuinely open and is not being silently bridged.
```

If a class of attack cannot be expressed as a runnable case, the audit records
it as `unfalsifiable_claim` and treats that as a finding, not a pass.

## Canonical Audit Spec

This file is the canonical audit specification. Any harder audit operating
rules should be merged here rather than living as a parallel spec. Parallel
audit specs are themselves a Domain 9 drift risk: two documents can produce two
different ideas of what counts as a finding, a pass, or a closure.

## Hard-Mode Controls

The audit succeeds by producing failures. If an execution round produces no
material findings, the audit operator must record a `weak_audit_suspected`
finding or escalate the method. A clean bill is not an achievement unless the
audit can also show its own canaries, mutations, and blind rounds were capable
of being caught.

Three structural defenses against a soft audit:

1. Canary seeding.
   Before a formal execution round, the audit operator may plant a small set of
   known defects, such as doc contradictions, weakened validator clauses, or a
   mis-fixtured drill. The canary manifest hash should be committed before the
   audit starts and revealed after. If the audit misses a canary, the audit run
   fails regardless of other findings.
2. Mutation testing for drills.
   Every drill claiming to enforce a rule should eventually be run against a
   deliberately broken target: a validator clause deleted, a contract check
   removed in a scratch branch, or a poisoned fixture. A drill that still passes
   against its broken target is a finding: a guard that cannot fail guards
   nothing.
3. Blind cross-agent rounds.
   Attack fixtures can be authored by one agent and sealed before another
   agent's validators see them. Neither side may tailor. Self-graded fixtures
   are a known weakness of the current project history; blind rounds are the
   escape.

Additional operating rules:

- Findings are packets, not loose prose.
- Every finding gets exactly one disposition.
- "We should look at that" is not a disposition.
- No finding may be closed by editing only documentation unless the finding is
  doc drift, overclaim, stale guidance, or a deliberately documented residual
  risk.
- Severity is assigned by what the attacker gains, not by how clever the attack
  is.

## Severity Model

```text
critical: a wall described as enforced can be bypassed, or money/route/settlement
          moves without its required authority.
high:     an overclaim a skeptical buyer could catch, or a gap wider than the
          docs admit, or a cross-subsystem contradiction.
medium:   spec/implementation drift, a missing not_claiming, a drill that cannot
          fail on its own axis, or a doc that asserts a guarantee the code does
          not provide.
low:      cosmetic, naming, or stale-metadata issues.
informational: defensible design choice worth recording for the network.
```

A finding's severity is assigned by impact on a real buyer, not by how hard it
was to find.

## Audit Domains

The audit is organized into ten domains. Each domain names the claim under
test, the attacks, and the pass/fail definition. A domain "passes" only when
every attack either fails as designed or is recorded as a known, documented,
correctly-scoped gap.

### Domain 1: Contract State Machine Integrity

Claim under test: the escrow state machine only advances through legal
transitions, and every money-moving transition consumes its required
authority.

Attacks:

```text
- call every state-changing function from every wrong State and confirm revert
- call every function from every wrong role (buyer calls seller fn, etc.)
- skip a gate: reach RouteLocked without a consumed spendability hash
- reach inspection-open without a signed delivery hash
- double-spend a spendability hash across two trades or two legs
- replay a packet hash within a trade and across trades
- settle with a payout that exceeds escrow + bond + dispute bond
- reach settlement on a trade with an open, unresolved fingerprint challenge
- exploit the overloaded commitRoute / markDelivered signatures: confirm the
  deprecated pure-function stubs cannot be used to bypass the witnessed path
```

The overloaded `commitRoute` and `markDelivered` functions (multiple ABIs, some
`pure` stubs) are a specific audit target: confirm no caller path reaches a
legal route lock or delivery through a stub that skips the typed witness.

Pass/fail:

```text
fail: any wrong-state or wrong-role call succeeds, any gate is skippable, any
      hash double-spends, any payout exceeds balances, or a pure stub reaches a
      real state transition.
pass: every illegal transition reverts and every money-moving step consumes its
      named authority.
```

### Domain 2: The Witness and Spendability Layer

Claim under test: route and delivery witnesses bind the commitment shape so
arbitrary substitution fails closed.

Attacks:

```text
- substitute a route assembly witness from a different trade
- substitute a witness with one field changed (chain id, gate, item fingerprint)
- present a valid wall bundle hash with a mismatched assembly history hash
- present a spendability hash valid for one gate at a different gate
- present a witness whose preimage fields are individually valid but whose
  combination never occurred (stitched witness)
- expire: present a spendability hash past its expiry once expiry is implemented
```

The stitched-witness attack is the deepest case: confirm the contract derives
the witness from the actual committed values, not from caller-supplied fields
that merely look consistent.

Pass/fail:

```text
fail: any substituted, cross-trade, cross-gate, or stitched witness locks a route
      or opens a gate.
pass: every witness mismatch reverts before the state transition.
```

### Domain 3: The Physical Gap Boundary (Negative Space Audit)

Claim under test: the gap taxonomy in `Protocol_Gaps_v0.1.md` names every place
physical truth can cross, and the protocol does not silently bridge any of them.

This domain is inverted: it tries to prove a gap is *closed* that the docs say is
open, which would mean the protocol is overclaiming in the opposite direction —
pretending to verify physical truth.

Attacks:

```text
- find any code path where a catalog match, image hash, cert lookup, or tool
  output sets a field consumed as authenticity, possession, or condition truth
- find any place an oracle, API, or trusted third party is consulted in a way
  that the docs do not disclose as a gap
- find a gap the negative drill does not cover: enumerate every physical
  crossing (ingress sensor, custody continuity, identity-to-key, egress remedy,
  time/snapshot, binding bytes-to-atoms) and confirm each has a case
- confirm the gap negative drill's `Passed: True` genuinely means "compliant
  fraud completed," not "fraud was blocked" (a silent inversion would be a
  catastrophic false-negative)
```

Pass/fail:

```text
fail: a documented-open gap is silently closed by code, an undisclosed trusted
      party exists, or a physical crossing has no negative case.
pass: every physical crossing is open, disclosed, and has a case proving it open.
```

### Domain 4: Legibility Cannot Become Spendability

Claim under test: deterministic tool outputs and legibility vectors are legible,
never enforced, and cannot move funds, route, bond, claim, reputation, or
settlement by themselves.

Attacks:

```text
- emit a legibility vector, then try to use it as a gate authority with no
  separate spendability packet
- launder a verdict: field-level (renamed key), nested (inside a dimension),
  prose (free-text summary), and structural (a band string treated downstream
  as a score)
- promote a low_friction_pass or exact catalog match into an intent packet that
  a route or funding step consumes
- aggregate six dimensions into a composite outside the vector, then feed the
  composite back as if it were a measured dimension
```

The structural-laundering case is the one most likely to slip: confirm that no
downstream consumer treats the `coverage|independence|...` signature as an
ordered or scorable quantity.

Pass/fail:

```text
fail: any tool output or vector reaches a money-moving gate without a separate
      named spendability authority, or any aggregate score survives into a
      consumed field.
pass: every legible artifact requires a separate enforced authority to act, and
      every aggregation attempt is blocked or flagged.
```

### Domain 5: Economic Deterrence Is Real, Not Ceremonial

Claim under test: bonds, fees, and remedies deter fraud because expected loss
for cheating exceeds expected gain, and the protocol surfaces residual risk
when it does not.

Attacks:

```text
- construct an economically rational exit scam at every value tier: maximize
  fraud profit against bond loss + import-acquisition cost + identity cost
- find a value tier where a positive-expected-value fraud path exists inside
  the alpha defaults without being surfaced as residual risk
- attack the trust-import cap: assemble an import bundle whose real acquisition
  cost exceeds the cap the tool grants (under-priced reputation)
- attack bond scope: file a claim for a failure the bond explicitly excludes and
  confirm the exclusion is legible before funding, not discovered after
- confirm a reduced bond is never described as seller honesty
```

This domain requires an explicit attacker-EV table per value tier. A blank or
hand-waved EV table is itself a finding.

Pass/fail:

```text
fail: a positive-EV fraud path exists inside alpha defaults and is not surfaced;
      an import bundle is under-priced; a bond exclusion is discoverable only
      after funding.
pass: every fraud path is either negative-EV or surfaced as named residual risk
      before acceptance.
```

### Domain 6: Judgment Supply Is Committed, Not Hoped

Claim under test: verifiers and arbiters are committed service paths with fee
source, response window, remedy cap, conflict disclosure, and fallback — not
registry entries.

Attacks:

```text
- route a trade to settlement relying on an arbiter who is registry-active but
  has no committed case path; confirm the protocol blocks or surfaces this
- present a verifier who only reviewed photos as an authenticity backstop
- exhaust the fallback: revoke the primary arbiter mid-trade and confirm the
  replacement/timeout path actually reaches a ruling, not a deadlock
- conflict: route to a verifier or arbiter with an undisclosed stake in the
  outcome and confirm disclosure is required before reliance
- availability: open a claim in a window where the committed judge cannot
  respond within SLA and confirm the timeout path is real
```

Pass/fail:

```text
fail: settlement or claim resolution depends on uncommitted judgment supply, a
      revoked arbiter deadlocks a trade, or a conflict is undisclosed.
pass: every judgment dependency names a committed provider with SLA, fee,
      remedy cap, conflict disclosure, and a fallback that reaches a ruling.
```

### Domain 7: Catalog Lineage Cannot Be Poisoned

Claim under test: catalog facts are content-addressed, separated from policy,
and grow only through evidence-weighted challenge; poison is blocked or held,
never hardened silently.

Attacks:

```text
- poison with zero challengers and reworded claim text (confirm held-at-flag,
  not hardened)
- poison via structured diff disguised as a benign field (flip a derived flag
  through a field the detector does not inspect)
- sybil: 10,000 agreeing agents vs one evidence-backed dissent; confirm head
  count never outweighs evidence
- monoculture: identical-model challengers sharing a blind spot; confirm
  challenger independence is measured, not assumed
- citation drift: cite a catalog_hash that does not match the bytes; cite a row
  that does not exist in the cited release
- policy-as-fact: smuggle an evidence-profile change into the fact catalog hash
- confirm a blank variant_traps list cannot be read as "checked" when it means
  "unexamined" (ties to the prints_without_rarity_symbol overlap matrix)
```

The monoculture case is the open frontier: the drill weights evidence and
discounts head count, but does not yet measure whether challengers are
genuinely independent. Record the coverage honestly.

Pass/fail:

```text
fail: poison hardens, a wrong-bytes citation validates, policy enters the fact
      hash, or sybil/monoculture agreement carries a decision.
pass: poison is blocked or held, citations bind to bytes, fact/policy stay
      separated, and challenge weight is evidence-driven.
```

### Domain 8: Catalog Identity and Confusion Boundaries

Claim under test: the catalog identifies known prints correctly and refuses to
bind a buyer's intent to the wrong row, including across the new multi-set
surface.

Attacks:

```text
- off-set named want (Umbreon, Espeon) must return no_in_set_match, never a
  browse row presented as the named card
- confusion sources: a 1996 Carddass / Topsun / Meiji object offered as "1996
  Japanese Pokemon card" must be distinguished from Expansion Pack before intent
- the Starter Pack / Quick Starter / vending-sheet missing-symbol traps: confirm
  a missing rarity symbol is never treated as clean No Rarity without the
  overlap matrix ruling out every yes/mixed family
- cross-set collision: a name that exists in multiple pre-cutoff families must
  disambiguate by release, not silently pick one
- the map's URL-only sources must not pass as row-level evidence
```

Pass/fail:

```text
fail: an off-set want binds to a row, a non-TCG object enters the TCG catalog,
      a missing-symbol claim passes without overlap-matrix clearance, or a
      cross-set name resolves silently.
pass: every confusion source is distinguished and every ambiguous name escalates
      to disambiguation.
```

### Domain 9: Cross-Subsystem Contradiction

Claim under test: the subsystems agree with each other. This is the domain most
likely to find real bugs, because each subsystem was authored and drilled in
isolation.

Attacks:

```text
- enforced/legible/judged consistency: every field labeled enforced in one doc
  must be enforced by code; every field a doc calls legible must not be consumed
  as enforced anywhere
- terminology drift: confirm "spendability," "witness," "assembly," "bundle"
  mean the same thing in the spec, the contract, the agent skill, and the drills
- the four authority labels (enforced/legible/judged/missing) plus the audit's
  fifth (waived) must be used identically across legibility, gaps, walls, and
  catalog docs
- doc currency: CLAUDE.md, the Fable rundown, the full spec, and the walls doc
  must not contradict each other on what is currently enforced
- number drift: the 96-vs-102 count, the catalog hashes, the cutoff date, and
  the wall count must agree everywhere they appear
```

Pass/fail:

```text
fail: any field's authority label differs between doc and code, any key term
      means two things, or any load-bearing number disagrees across docs.
pass: one vocabulary, one set of labels, one set of numbers, everywhere.
```

### Domain 10: The Drills Themselves

Claim under test: every drill can actually fail on its own axis, and a green
suite means what it claims.

Attacks:

```text
- for each drill, construct the input that should make it fail and confirm it
  does (a drill that cannot fail proves nothing)
- confirm no drill grades itself by co-authoring expected outcomes and observed
  outcomes from the same fixture without an adversarial case
- confirm Passed: True means the stated thing (especially the gap negative
  drill, where pass means fraud-completed, not fraud-blocked)
- confirm drill reports do not overclaim in their "What This Proves" sections
- run every drill from a clean checkout and confirm reproducibility (hashes,
  counts, pass states)
```

Pass/fail:

```text
fail: any drill cannot fail on its axis, grades itself circularly, or overclaims
      in its report.
pass: every drill has a demonstrated failure mode and an honest proof statement.
```

## Audit Deliverables

```text
1. One findings register: id, domain, severity, claim-under-test, attack,
   observed behavior, expected behavior, and a reproducible case or a recorded
   unfalsifiable_claim.
2. A revised enforced/legible/judged/missing/waived label table, corrected
   against code where docs drifted.
3. An attacker-EV table per value tier (Domain 5 output).
4. A physical-crossing coverage table (Domain 3 output): every crossing, its
   negative case, and its disclosure location.
5. A drill falsifiability table (Domain 10 output): every drill, its
   demonstrated failure mode.
6. A severity-ranked remediation list separating must-fix-before-network from
   known-and-documented-gap.
7. A hard-mode controls report when used: canary manifest hash, mutation cases,
   blind-round setup, and which controls were not used in the slice.
```

## Audit Honesty Clause

The audit report must itself obey the no-overclaim rule. It must distinguish:

```text
proven_bypass: a runnable case that breaks a wall.
suspected_weakness: a reasoned argument with no runnable case yet.
unfalsifiable_claim: a protocol claim that cannot currently be tested.
out_of_scope: real but outside this audit's domains.
weak_audit_suspected: no material findings plus insufficient canary, mutation,
                      or blind-round evidence.
```

A finding stated as `proven_bypass` must ship with the case that proves it. A
finding stated as `suspected_weakness` must not be inflated to `proven_bypass`
to look more rigorous. The audit that overclaims its own findings fails the
same standard it is auditing.

Permitted dispositions:

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

If a finding has no disposition, it is still open.

## What This Audit Is Not

```text
- It is not a security review of the Solidity for generic EVM exploits
  (reentrancy, overflow, gas griefing). That is a separate, necessary review.
- It is not a guarantee. A clean audit means these attacks failed, not that no
  attack exists.
- It is not a substitute for the skeptical network. Real collectors will find
  things this audit did not. The audit's job is to ensure they do not find the
  obvious things first.
```
