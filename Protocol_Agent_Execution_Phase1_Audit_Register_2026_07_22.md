# Agent Execution Phase 1 Machine Bundle — Audit Register

Artifact: `protocol/execution/dist/cairn-supervised-execution-phase1-v0.1.json`
Source package: `protocol/execution/`
Status: rejected and superseded by scope removal; no execution/read release candidate is active
Final rejected freeze: `c5646a0104664f7edf2a453450a2ec5d5d2eb82c`
Supersession amendment: 2026-07-23
Rejected-freeze prose dependency SHA-256: `246f1a38c0cad54cf606659e5ec0979b042fbb92a2be3327b80fe7c4b0ad8c9b`
Final rejected execution prose dependency SHA-256: `b140ddf830af1060e522cf5795dc6d66d86ac9371f785a7efc91c7f1c46d48e8`
Final rejected execution internal bundle hash: `sha-256:609f940251e0b02cf938ba900b6dfd68d44037d5c1e7259c12a95a0877411aec`
Final rejected execution operation-registry hash: `sha-256:7e96e469bd07fd70b963c4903356218f20be20a6da1644fa13c655f5901caf1e`

## Rejected execution artifact claim boundary

The rejected artifact was a schema-only, read-only Phase 1 candidate. It
contained no authority
writer, executor, network review, provider adapter, outbox, payment, escrow
release, waiver, dispute, server, database, UI, or deployment. Its empty
`conformance_claims` array and every registry row state that boundary directly.

The rejected package pinned and did not widen its then-current proposal
foundation:

- base profile: `cairn-proposal-foundation-v0.1`;
- base bundle: `sha-256:d84dd5c2a925575c4889ab51f784cca58bd7c7ec14fcf0ae66dd7d8a6eeff29c`;
- base registry: `sha-256:218e990a8cf2e768e9cda8886001488fb0c37496b3cfa64c21d2d922e4e9075b`.

Every use below of “current candidate,” “replacement,” or “pending” is
time-local to its dated audit round unless the terminal authoritative
supersession says otherwise.

## Replacement containment target

- 50 JSON Schema documents: 45 closed signed-object schemas, one
  content-addressed enumerable-map node schema, and four support documents;
- all nine closed execution-chain versions required by §7.2 of the prose spec,
  including `CancellationAuthorization`;
- connection, execution-control, compartment, confirmation, mandate v0.3,
  binding-set, lineage, activity-summary, activity-detail, and action-view
  objects;
- 46 structural object schemas and 29 separately namespaced schema-only read
  operations;
- no standalone map, transition-manifest, compartment, compartment-state, or
  compartment-transition getter;
- structurally deny-only GateResult, no RedemptionReceipt schema, and
  structurally forbidden recovery-bearing control branches;
- maps and transition manifests retained as internal dependency vocabulary;
  provisional-terminal and compartment-transition receipts are excluded from
  `receipt.get`;
- nonempty disclosures, external accounting leaves, protection attestations,
  and financial external truth are unavailable;
- ten unsupported gate predicates, including `EXECUTION_CONTROLS`, always deny;
- zero mutating operations, zero external-effect operations, and zero authority
  effects;
- strict I-JSON source checking for the hand-authored manifest, RFC 8785/JCS
  bundle hashing, strict signed-object annotations, and Ed25519 signature math;
  and
- conditional intrinsic checks for namespace and aggregate-control chains,
  action-state predecessors, the shared joint connection/control pair,
  true-as-of key/head evaluation, and causal control chronology.

Caller resolvers, key maps, current-head callbacks, role callbacks, Boolean ACL
flags, and external verifier callbacks are conditional inputs and never
establish authenticated authority. High-level authenticated reads, gates,
composite action validation, live cancellation, and joint-control currentness
return `phase1_authenticated_resolution_unsupported` until a separately frozen
rooted-proof profile exists. Low-level helpers are structural or conditional
consistency checks, not authorizers.

## Rejected-freeze local authored controls

The rejected `26b7016` freeze reported 31/31 authored controls. Those totals are
not evidence for the narrowed replacement. Round-39 tests are changing and the
replacement unit total is pending a complete rerun. This list records the
rejected freeze's intended coverage for audit history:

1. fixed prose and proposal dependency pins;
2. deterministic bundle and registry bytes;
3. exact read-only/non-effectful registry surface;
4. typed, endpoint-family-closed, request-bound generic and composite action
   read responses with all 47 Phase 1 object families reachable;
5. byte-based request/object/string/ref, depth, property, per-array, and
   aggregate-array resource ceilings;
6. valid bound specimen plus extension rejection for every object schema;
7. exact prose field/array retention;
8. internally derived exact-controller Ed25519 proof with separate historical
   and current-eligibility checks;
9. impossible-calendar timestamp rejection;
10. capabilities-to-overlay/base-bundle/base-registry/surface binding;
11. control target and recovery unions;
12. closed control-receipt and lineage-state unions, exact activation graph,
    and frozen active-state commitment vector;
13. scoped-control target separation;
14. connection head/sequence/epoch/nonce/control binding;
15. exact outstanding-action map roots, derived keys, entry/action/lineage
    projection, six-branch transition matrix, and parent-authorized bounded-path
    reads without an unbounded trie scan;
16. single-asset ordered compartment limits;
17. disjoint financial/nonfinancial mandate branches;
18. lineage authority-branch separation;
19. exact release and actor branch in `ExecutionBindingSet`;
20. append-only action state;
21. executable gate, authority, reservation, cancellation, redemption, and
    receipt branch constraints;
22. cancellation authority as an exact one-binding/one-gate projection;
23. typed, complete, sorted transition manifests;
24. parent-bound transition-manifest authorization and membership;
25. privacy-minimized activity-to-action/current-state binding;
26. generated-file byte identity; and
27. complete mandate business-tuple projection, activation chronology, exact
    gate-request semantics, and exact redemption action/read closure;
28. cryptographically authenticated exact reads with mutable-head currentness
    and historical/current-policy separation;
29. exact compartment definition/map/predecessor/asset state and cause/delta/
    economic/closure/chronology transition semantics; and
30. exact runtime/connection/DataGrant binding graphs, current revocation nonce
    and reserved-judgment policy, ordered gates, and receiver assignment
    consumption/completion closure.

31. deny-only Phase-1 authority, gate-evaluation chronology, current
    cancellation state, exact execution-control/namespace transitions,
    reservation provenance, and confirmed-event correlation.

## Rejected-freeze direct mutation controls

The rejected freeze killed 390/390 declared direct mutants. The replacement
adds and retires controls; its exact total is pending a full exact-once catalogue
check and rerun. The following coverage narrative is retained as rejected-freeze
history, not a green claim for the replacement:

- prose, base-bundle, and base-registry drift;
- accidentally mutating or effectful operation advertisement;
- open top-level schemas and signature/hash exclusion cycles;
- impossible timestamps;
- missing cryptographic signature, controller equality, or required controller
  context;
- false capabilities claims or cross-bundle capability replay;
- target-class aliasing and partial recovery authority;
- stale connection sequence or missing principal-control basis;
- cross-asset or inverted compartment/mandate limits;
- mixed mandate authority branches;
- cross-branch lineage reuse;
- stale release or principal/runtime branch collapse;
- backward action transitions; and
- activity narration inconsistent with authoritative state.

The expanded set also kills base-bundle body tampering behind a retained
embedded hash, frozen-schema field deletion/renaming, unbounded arrays, public
or cross-parent transition-manifest reads, recovery resume, connection terminal
reactivation and identity drift, historical-key rejection after later
revocation, paired-checkout acknowledgement loss, gate-allow/deny contradiction,
missing gate bindings, and redemption under a denied gate.

The round-2 set additionally kills absent protocol evaluation time, future
signatures, resolver/key-ID mismatch, unsupported key type, unknown key status,
mandate scope arrays above 64, empty financial authority/exposure branches in
mandates, action authorizations and binding sets, reserved action state without
lineage activation, unledgered reservations, and financial reservations without
obligation/economic exposure state.

The rounds 3–6 set additionally kills current-key eligibility that ignores the
current protocol time, capability/financial-slot leakage, more than 32 grants or
64 copy IDs, grant/head set and resolved-head drift, premature lineage
activation, manifest subject/ref/hash/schema drift, invented lifecycle receipt
schemas, provider-enforced-cap overflow, missing external receiver scope,
nonfinancial authority leakage, generic sibling ref/hash drift, absent quote or
account-overlay provenance, partial sublimit tuples, confirmation-policy and
transaction-semantics drift, impossible early-terminal action branches,
fabricated late dependencies on terminal transitions, invented manifest entry
keys, manifest issuer/key/controller drift, exact 32/64 collection-bound
widening, and GateResult/ActionRecord ref/hash drift.

The round-7 set additionally kills cancellation authority laundered through a
reusable mandate, more than 32 financial mandate windows, nonfinancial checkout
roles, financial obligation-role confusion, nested disclosure and cancellation
context ref/hash drift, CancellationAuthorization ref/hash drift, post-handoff
terminal receiver-evidence erasure, and reservation/gate lifecycle ref/hash
drift.

The round-8 set additionally kills an open/untyped generic read object, omission
of the pinned proposal-object dependency union, returned ref/object mismatch,
cross-branch control-receipt authority basis, finalized lineage state without a
permanent tombstone, illegal lineage successors, and both schema-level and
runtime drift of the advertised base-bundle dependency.

The rounds 9–10 set additionally kills generic-response bypass of declared
sibling ref/hash pairs, base/policy/receipt family bleed, recovery evidence on
either namespace-control branch, lineage fencing-token rollback, aggregate
nested-array overflow, missing or drifted reservation inventory context, omission
of shared core-validator bytes or the dependency lock from source commitments,
and runtime dependency-version drift.

The round-11 set additionally kills unchanged or jumped activation fences in
both lineage heads and activation receipts, plus inventory authority inferred
from a nonfinancial request that merely names a copy.

The rounds 12–13 set additionally kills omitted strict-JSON preflight bytes,
unresolved or cross-wired lineage genesis/activation dependencies, arbitrary
active-state commitments, untyped/skipped action receipt chains, missing
base-registry capability disclosure, incomplete read-family reachability,
request/response identity drift, UTF-8/canonical-byte/depth resource overrun,
cancellation occurrence/receiver/finality drift, economic predecessor drift,
and coherently cross-wired action/activity/lineage/reservation/gate graphs. A
literal golden vector controls the active-lineage commitment domain, field
order, and receipt-reference exclusion.

The rounds 14–16 set additionally kills package-local dependency substitution,
request-envelope identity drift, mandate business-tuple rebinding across seller,
intent, counterparty, listing, asset, review, and taint policy fields, activation
before all signed dependencies are available, gate evaluation outside its exact
request/binding interval, redemption through an inverted or cross-wired gate,
redemption of an alien action, current-head or checkout-dependency drift, and an
invalid redemption receipt returned through the exact-read endpoint.

The rounds 17–20 set additionally kills internally misordered activation
dependencies, structurally valid but semantically alien GateRequests, weak ACL
metadata for sensitive heads and detailed receipts, fabricated connection
aggregate/index/control dependencies, index-to-map count or entries-root drift,
caller-selected outstanding map/entry keys, omitted exact index/entry/transition/
map getters, unowned map-node reads, and invalid reservation, update, removal,
restriction-snapshot, or nonempty terminal-seal transitions.

The round-38 remediation set additionally kills any Phase-1 `allow` or
redemption path, missing gate roles, unsupported-check promotion, stale
cancellation state, post-evaluation attestations/wrappers/signatures, wall-clock
current-head resolution, exhausted-grant final-read shortcuts, recovery-control
promotion, scoped-key aliasing, epoch reuse, scoped/global tuple mixing,
namespace-generation skips, ordinary scoped use of a connection index,
reservation provenance rewrite or unexplained change, and confirmed-event
component/correlation drift.

## Independent audit round 1

Two non-author reviewers reproduced the original candidate at bundle hash
`sha-256:35447a6e9476c38ff87fd8bbb20b5d331556492ffad21726efa67d6ba9a6ca36`
and registry hash
`sha-256:47ca36de5d6abb9a27db5e94276abf07830237f50792def4baa4fc60d6ac5205`.
They independently reproduced 17/17 controls, 27/27 killed mutants, the 83/83
proposal baseline, and its 75/75 killed mutants, then rejected closure.

| ID | Sev. | Independent finding | Disposition | Remediation in the new candidate |
|---|---:|---|---|---|
| P1R1-001 | P1 | Base dependency verification trusted the embedded base `bundle_hash` without recomputing the unsigned body | accepted_and_fixed | Build now requires embedded hash = recomputed canonical unsigned hash = frozen dependency hash; a body-tamper mutant retains the old embedded hash and is killed |
| P1R1-002 | P1 | Resource bounds and transition manifest were mistranscribed; ActionAuthorization omitted/renamed normative fields; CancellationAuthorization was absent | accepted_and_fixed | Exact 49-field bounds profile, exact typed manifest, exact 52-field ActionAuthorization, full 59-field CancellationAuthorization, two private getters, frozen array caps, and parity controls |
| P1R1-003 | P1 | Named invariants were annotations; invalid gate allow, prepared action refs, and illegal receipt transitions validated | accepted_and_fixed | Local unions are JSON Schema conditions, cross-object rules have versioned bundled validators, and build rejects every named invariant without a registered validator |
| P1R1-004 | P1 | Transition manifests were public generic-ObjectRef reads | accepted_and_fixed | Getter is private, request binds exact parent and manifest refs, resolver validator requires frozen parent-field membership and inherited parent ACL |
| P1R1-005 | P1 | Connection validation allowed terminal reactivation and immutable identity drift | accepted_and_fixed | Exact cause/state matrix, terminal closure, immutable identity, sequence/hash, epoch/nonce, leaf, and receipt bindings plus direct mutants |
| P1R1-006 | P1 | Recovery authority could resume/widen scope and controller selection was caller supplied | accepted_and_fixed | Closed principal/recovery schema branch, restrictive actions/scopes, current grant/head resolution, internal controller derivation, and one-shot recovery-key vectors |
| P2R1-007 | P2 | Requiring current key status for every immutable receipt destroyed historical verifiability | accepted_and_fixed | Historical cryptographic validity is evaluated at signing time; current lifecycle eligibility is a separate explicit consumer check |

No round-1 reviewer modified candidate files.

## Independent audit round 2

A fresh context-blind reviewer independently reproduced the superseded
round-1-remediated candidate at bundle hash
`sha-256:dd5a0edd5ab62c1bf63a54dca72eb3b433ddf1ae9d30d29494e5ef899e3b9374`
and registry hash
`sha-256:b87c436af1a58d2eea756d0ae29e81ef99bdece599e9619eae45047bea236f54`.
The reviewer reproduced 20/20 controls, 46/46 killed mutants, the unchanged
83/83 proposal baseline and 75/75 proposal mutants, made no edits, and rejected
closure on four P1 families:

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R2-001 | P1 | Signed-object validation admitted a future signature and malformed resolver records with a mismatched key ID, unsupported key type, or unknown status | accepted_and_fixed | Validation now requires explicit protocol evaluation time, rejects future signatures, accepts only exact Ed25519 key identity and a closed active/revoked status vocabulary, and preserves historical/current eligibility separation |
| P1R2-002 | P1 | Financial action authorization, binding, mandate, and reservation branches admitted empty or nonfinancial obligation/exposure state | accepted_and_fixed | Closed capability-dependent schemas require obligation/exposure context for every economic capability, payment fields for payment/funding only, and exact reservation context against the prepared action and binding |
| P1R2-003 | P1 | `AgentMandate.scope_bindings` admitted 65 entries despite the normative maximum of 64 | accepted_and_fixed | The exact container is capped at 64 and directly mutation-controlled |
| P1R2-004 | P1 | `authorized → reserved` admitted a null lineage-activation receipt | accepted_and_fixed | Reserved and every later action state require a non-null lineage-activation receipt; the missing-receipt mutant is killed |

## Independent audit rounds 3–6

Successive read-only reviewers rejected four more superseded candidates. Every
finding below was accepted; no reviewer modified candidate files.

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R3-001 | P1 | Current key eligibility checked status but not the current protocol-time interval | accepted_and_fixed | Current eligibility now requires an active key and `now` inside the authenticated key interval, separate from historical signature validity |
| P1R3-002 | P1 | Capability branches admitted financial context in nonfinancial scopes or omitted required economic/receiver bindings | accepted_and_fixed | Mandate and BindingSet capability matrices now require all external receiver coordinates, require the complete financial context for economic actions, and forbid it for nonfinancial actions |
| P1R3-003 | P1 | Grant and copy collections exceeded the normative 32/64 maxima or failed grant/head correspondence | accepted_and_fixed | Exact `grantRefs`, `grantHeads`, and `copyIds` bounds plus canonical grant/head bijection and resolved current-head checks |
| P1R3-004 | P1 | Lineage activation could appear before reservation | accepted_and_fixed | Authorized state forbids activation; reserved and later prefixes require and preserve it |
| P1R3-005 | P1 | Transition-manifest subject ref/hash/domain were not fully parent-bound | accepted_and_fixed | Exact subject ref/hash/schema, transaction, manifest-kind, and parent membership checks |
| P1R4-001 | P1 | DataGrant current-head membership was only one-way | accepted_and_fixed | Canonical set equality requires one exact current head for every selected grant and no extra/duplicate grant heads |
| P1R4-002 | P1 | Some copy/entry-domain bounds remained generic | accepted_and_fixed | Copy IDs are capped at 64; typed manifest entry schemas are exact closed vocabularies |
| P1R5-001 | P1 | A resolved DataGrant head could disagree with `current_state_head_ref.object_hash` | accepted_and_fixed | Resolver result schema, state hash, grant ref, and revocation nonce must all match the selected head tuple |
| P2R5-002 | P2 | Economic mutation cause and lifecycle-transition receipt schemas were too permissive | accepted_and_fixed | Exact economic-cause schema and closed lifecycle-transition receipt vocabulary |
| P1R6-001 | P1 | Capability-specific quote, provider account overlay, and sublimit bindings were incomplete | accepted_and_fixed | Financial bindings require current quote/import/lifecycle and account-overlay evidence; sublimits are an all-null/all-present tuple; nonfinancial bindings forbid all such state |
| P1R6-002 | P1 | Sibling refs and hashes could drift in BindingSet, ActionAuthorization, GateResult, and ActionRecord | accepted_and_fixed | Generic ref/hash equality plus exact authorization confirmation-policy/acknowledgement mappings and object-specific validators |
| P1R6-003 | P1 | The action-state schema made early cancellation/failure impossible, while loosening it could fabricate later dependencies | accepted_and_fixed | Terminal states admit only a valid observed prefix; transition validation preserves every already-bound prefix field and forbids newly fabricated future dependencies |
| P1R6-004 | P1 | Manifest entry keys and issuer authority were asserted rather than derived | accepted_and_fixed | Domain-separated entry-key derivation, parent/manifest signing-key equality, and issuer-controller resolution |
| P1R6-005 | P1 | Several normative 32/64 collection bounds still inherited a generic 128 maximum | accepted_and_fixed | Dedicated `refs32`/`refs64` types are applied to grants, reservations, controls, policies, checkout dependencies, inventory fences, and transition collections |
| P1R6-006 | P1 | A configured compartment ceiling could exceed the provider/contract protection attestation cap | accepted_and_fixed | Compartment validation resolves the exact attestation, binds asset/hash, and requires configured ceiling ≤ enforced cap |
| P2R6-007 | P2 | The audit register lagged the moving candidate | accepted_and_fixed | This register now records every superseded candidate class and the exact final-candidate evidence |

## Independent audit round 7

An informed non-author reviewer independently reproduced candidate
`sha-256:e82a4cb6915de2d1bcf33f86124510b4606af65b440ecfee7356126b57176b0f`,
the 20/20 authored controls, 90/90 killed mutants, and the unchanged 83/83 plus
75/75 proposal baseline. The reviewer made no edits and rejected closure on four
P1 families and one derivative material-P2 ledger mismatch:

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R7-001 | P1 | A nonfinancial capability could carry a checkout role/core, and capability-specific obligation roles were not closed | accepted_and_fixed | ActionAuthorization and BindingSet now encode exact capability→obligation-role and capability→checkout-role matrices; cancellation and all noncheckout capabilities forbid every checkout slot |
| P1R7-002 | P1 | CancellationAuthorization and nested BindingSet disclosure/cancellation-context ref/hash pairs could drift | accepted_and_fixed | Closed pair registries now run at the relevant validation boundaries; reservation and gate lifecycle pairs receive the same treatment |
| P1R7-003 | P1 | A post-handoff terminal transition could erase receiver evidence | accepted_and_fixed | Receiver evidence is monotonic once present, and terminal edges from submitted, acknowledged, unknown, or finalized require non-null receiver-backed terminal evidence |
| P1R7-004 | P1 | Financial mandate `window_limits` admitted 33 entries despite the normative maximum of 32 | accepted_and_fixed | The nested financial window array is capped at 32 and directly mutation-controlled |
| P1R7-005 | P1 | `cancel_receiver_action` could be expressed as an AgentMandate capability despite the separate one-shot-only authority rule | accepted_and_fixed | The mandate capability vocabulary excludes cancellation; only the dedicated CancellationAuthorization branch can carry it |
| P2R7-006 | P2 | The audit register overstated nested-pair, terminal-prefix, and bound closure while the four gaps remained | accepted_and_fixed | Claims above are narrowed to the now-tested controls and tied to the new exact candidate hash |

The final replacement hash above remains open until the blind and informed
reviewers repeat read-only closure against those exact bytes.

## Independent audit round 8

A fresh context-blind read-only reviewer independently reproduced candidate
`sha-256:b0e924acb4bf5620895fe0bb22b9b6c2c2b4589fe210366406e73eb0cd00782a`,
the 20/20 authored controls, 101/101 killed mutants, and registry
`sha-256:b87c436af1a58d2eea756d0ae29e81ef99bdece599e9619eae45047bea236f54`.
The reviewer made no edits and rejected closure:

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R8-001 | P1 | The generic base/policy/receipt response admitted an untyped open object and did not bind the returned ref to it | accepted_and_fixed | Each getter now has its own closed object family; the shared validator verifies exact schema, self-binding, declared sibling pairs, and returned ObjectRef |
| P1R8-002 | P1 | `ExecutionControlReceipt` admitted cause/authority-basis cross-branch combinations | accepted_and_fixed | A closed five-cause union now fixes authorization basis and exact required/forbidden namespace, head, map, leaf, connection, outstanding-action, and recovery pairs |
| P1R8-003 | P1 | `LineageStateHead` admitted impossible isolated states such as generation-zero finalized without activation or tombstone | accepted_and_fixed | State-discriminated fields, permanent finalized tombstone, genesis rules, a closed successor matrix, generation continuity, and dependency preservation are executable constraints |
| P1R8-004 | P1 | Explicit signed objects without specialized validators admitted sibling ref/hash drift, concretely `ConfirmationReceipt.authority_object_ref/hash` | accepted_and_fixed | Every generated object schema declares all direct sibling `*_ref`/`*_hash` pairs; bundle audit verifies that declaration and the common object validator enforces all pairs before specialized rules |
| P2R8-005 | P2 | `validateCapabilitiesResponse` ignored `base_bundle_hash` | accepted_and_fixed | The response schema fixes the exact frozen base hash and runtime validation cross-checks both the frozen constant and supplied dependency context |

The replacement candidate adds two authored controls and eight direct mutants;
the resulting suite is 22/22 and 103/103. It remains open pending a fresh blind
review against the new exact hash.

## Independent audit round 9

An informed non-author reviewer independently reproduced the superseded
candidate `sha-256:fb4d96f5777aad0d41df39c54765c3c59d99c8e6425682262df2adc06e121e27`,
registry `sha-256:b87c436af1a58d2eea756d0ae29e81ef99bdece599e9619eae45047bea236f54`,
22/22 authored controls, and 103/103 killed mutants. The reviewer made no edits
and rejected closure on three composed P1 paths:

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R9-001 | P1 | The generic response validator rechecked self-hash but skipped the returned execution object's declared sibling ref/hash pairs | accepted_and_fixed | The common typed-response validator now applies the selected schema's complete `x-cairn-ref-hash-pairs` declaration before accepting the envelope |
| P1R9-002 | P1 | Namespace genesis and rotation receipts could carry recovery-transition evidence | accepted_and_fixed | Both namespace branches require the complete recovery pair null; separate direct controls exercise genesis and rotation |
| P1R9-003 | P1 | One shared response union let base, policy, and receipt getters return objects from the wrong family | accepted_and_fixed | The registry now names three distinct response definitions with exact 12/2/8 object-family unions |

## Independent audit round 10

A separate fresh context-blind reviewer independently reproduced the same
superseded candidate, 22/22 controls, and 103/103 killed mutants. It found no
additional P0/P1 but identified four material hardening defects. The reviewer
made no edits:

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P2R10-001 | P2 | The internal digest omitted shared `core.mjs` bytes and integrity-locked AJV/canonicalization dependencies, allowing validator semantics to drift without changing the candidate | accepted_and_fixed | Source commitments include `../lib/core.mjs` and `package-lock.json`; package declarations and lock closure are audited at build, and release replay uses a disposable clean install without claiming arbitrary installed-tree byte attestation |
| P2R10-002 | P2 | `LineageStateHead` transitions admitted fencing-token rollback | accepted_and_fixed | Every successor requires `after.fencing_token >= before.fencing_token`, with a direct rollback counterexample and mutant |
| P2R10-003 | P2 | Per-array caps did not enforce the frozen 4,096 total inline-array-entry ceiling | accepted_and_fixed | The common Phase 1 validator recursively counts every nested array member and rejects totals above 4,096; a schema-valid 4,000-plus-entry mandate is the direct counterexample |
| P2R10-004 | P2 | `AuthorityReservation` advertised an inventory union but did not preserve the binding's exact seller-inventory stage/context | accepted_and_fixed | Binding validation closes inventory applicability, stage/kind, checkout, and readiness branches; reservation validation requires an exact compact projection of that binding context |

The superseded replacement candidate passed 22/22 authored controls and 114/114
direct mutants but failed its informed replay.

## Independent audit round 11

An informed non-author reviewer independently reproduced superseded candidate
`sha-256:5e8effb27cae893029605bc3456e9cf60841cd55f7395764f9dc47f6d2a79b86`,
registry `sha-256:40a70af9e9cf17198ecebed22a587073f94646f704208b7ee1b5b964e69fdb71`,
22/22 controls, and 114/114 mutants. The three round-9 P1 counterexamples and all
four round-10 hardening cases rejected, but two composed P1s remained:

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R11-001 | P1 | Provisional→active lineage accepted an unchanged or arbitrarily jumped fence rather than consuming exactly the next activation fence | accepted_and_fixed | The head transition requires `after.fencing_token = before.fencing_token + 1`; a dedicated activation-receipt validator independently requires `next = expected + 1` and exact before/after head, action, commitment, transaction, and state-commitment bindings |
| P1R11-002 | P1 | Inventory applicability was inferred from any nonempty `copy_ids`, so a nonfinancial evidence request mentioning a copy was incorrectly forced to carry seller-inventory authority | accepted_and_fixed | Inventory applicability now requires both a financial capability and nonempty exact-copy set; nonfinancial copy-referencing requests must keep inventory fields null, while financial exact-copy reservations still preserve the complete binding context |

That superseded replacement candidate passed 22/22 authored controls and 117/117
direct mutants. Closure remains open pending fresh blind and informed replay
against its exact hash.

## Independent audit rounds 12–13

Successive independent read-only reviews rejected the superseded replacement
family culminating at bundle
`sha-256:53cc95faa1fed9bf596c2f87ad89bf103f0dbc0960ad0e49479bffac8293e780`
and registry
`sha-256:0662b8307bd147d0813ace016c274c60c7182e9a86dbeff243a3c273eec75cff`.
That exact candidate reproduced 25/25 authored controls and 141/141 killed
mutants without changing generated bytes, but the reviewers still rejected
closure. No reviewer edited candidate files.

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R12-001 | P1 | The active lineage state accepted an arbitrary claimed commitment instead of recomputing one exact typed preimage | accepted_and_fixed | Domain-separated ordered preimage, runtime recomputation, literal golden vector, and direct domain/order/self-reference mutants |
| P1R12-002 | P1 | Lineage genesis and activation could leave commitment, reservation, authority, binding, action, or branch identity unresolved/cross-wired | accepted_and_fixed | Genesis resolves the exact commitment; activation composes the exact transition and independently binds every dependency, identity, fence, and authority branch |
| P1R12-003 | P1 | Action-receipt and action-state transition receipts admitted untyped, skipped, or cross-wired action/binding/lineage chains | accepted_and_fixed | Typed predecessor refs, exact prior/successor chain, exact action/binding/effect/lineage binding, and direct mutants |
| P1R12-004 | P1 | Read operations did not close every object family or bind every request to the exact returned identity; `action.get` could return a coherent graph assembled from different actions | accepted_and_fixed | Closed authorization/control unions, request-bound object reads, composite action response, and exact action/state/lineage/activity/reservation/gate semantic chain checks |
| P1R12-005 | P1 | Cancellation authority did not bind the complete BindingSet context, including the fresh principal occurrence, receiver, warnings, expiry, and finality chain | accepted_and_fixed | Exact shared-field projection plus top-level occurrence/receiver/policy/warning/expiry/finality checks and direct controls |
| P1R12-006 | P1 | A financial AuthorityReservation could name a coherent but alien pre-reservation economic exposure head | accepted_and_fixed | Reservation now preserves the BindingSet's exact `pre_reservation_resource_exposure_state_head_ref` |
| P1R12-007 | P1 | Inventory capability/stage combinations, reservation/action-control linkage, and action composite reservation membership were not fully closed | accepted_and_fixed | Capability/kind/stage matrix, exact reservation action/control/commitment projection, and composite set plus semantic-chain validation |
| P2R13-008 | P2 | Byte/depth resource rules, strict-JSON preflight source closure, base-registry capability pin, and direct lineage conformance coverage were incomplete | accepted_and_fixed | Frozen raw/canonical/UTF-8/depth/property/array limits, preflight script commitment, base-registry disclosure, and expanded direct mutation catalogue |

That replacement candidate reported 25/25 authored controls and 156/156 direct
mutants, but was superseded by the following audit/remediation round.

## Independent audit rounds 14–16

Further independent read-only review first closed package-local dependency and
request-envelope ambiguity, then rejected superseded candidate
`sha-256:cb7bbfc06b45fdc3a44e40031f49bae30360d096093b5ac4cf8f86132d2fc820`
with registry
`sha-256:6ad4d22423f7578ef635be143b24136603307d93b744a57baeef2b26bd4a68b9`.
The release-boundary reviewer accepted its packaging and read-only boundary, but
the semantic reviewers found three remaining P1 families. No reviewer edited
candidate files.

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R14-001 | P1 | A lineage activation could predate the commitment signature or the predecessor head's authenticated update | accepted_and_fixed | Activation now follows mandate issuance/signature, commitment signature, binding/action/reservation creation and signatures, and predecessor update/signature; the receipt and successor signatures must follow activation and every expiry still bounds it |
| P1R15-001 | P1 | Binding validation did not carry or compare the mandate's complete business scope, allowing coherent rebinding of seller, intent, counterparty, listing, asset, review policy, or taint policy | accepted_and_fixed | `ExecutionBindingSet` now repeats the complete business tuple plus its canonical hash, and validation requires exact equality with both the selected mandate and commitment |
| P1R16-001 | P1 | Gate and redemption validation did not prove the exact request/action chronology and dependency graph, and the generic receipt read could return a semantically invalid redemption | accepted_and_fixed | Gate validation resolves the exact request and binding with bounded evaluation/signature times; redemption resolves and validates the exact gate and ActionRecord, current heads and checkout dependencies, and exact receipt reads invoke the same semantic validator |

That replacement candidate passed 26/26 authored controls, killed 230/230 direct
mutants, and reproduced those results in a clean-room install with no parent
`node_modules`; its release-boundary reviewer accepted it. The informed and blind
semantic reviews nevertheless rejected it, so it is not the current candidate.

## Independent audit rounds 17–19

The final informed replay and a fresh context-blind consistency review rejected
candidate
`sha-256:142f5749630dbea22ba6abb7308985aec8225f2b8fa505c659cb3cefddab6064`
with registry
`sha-256:569cc33e2fb0ffeb91d7d2aa78d8285a488034d17e55d8d3776d042fe2de3e88`.
No reviewer edited repository files; temporary counterexamples lived under
`/tmp` only.

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R17-001 | P1 | Activation checked that every dependency existed before activation but not the required internal order, so binding, one-shot authority, action, and reservation could predate the service-signed commitment | accepted_and_fixed | Branch-aware causal ordering now enforces predecessor → commitment → binding → one-shot authority when applicable → action → reservation → activation, while the mandate branch keeps authority before commitment; six direct counterexamples and a mutation control cover the edges |
| P1R18-001 | P1 | A GateResult and redemption could carry an internally rehashed GateRequest whose authority or confirmation ref was unrelated because GateResult performed only structural request validation | accepted_and_fixed | GateResult now resolves authority, confirmation, binding, and lineage commitment and invokes full GateRequest semantics; authority schema-specific validation and redemption inheritance are direct-tested and mutation-controlled |
| P1R19-001 | P1 | Sensitive authority/head and detailed-receipt getters advertised an ordinary object-read DataGrant, and confirmation-receipt reads did not inherit the authority object's ACL | accepted_and_fixed | Sensitive heads use a distinct owner-bypass/runtime-audit-control class, detailed receipts use audit-detail authorization, and confirmation receipts inherit the parent authority ACL; exact per-operation tuples are tested and mutated |
| P1R19-002 | P1 | Connection-event validation accepted fabricated aggregate-control and outstanding-index heads, an unbacked control authorization, and a commit time before the linked heads; exact reads skipped these semantics | accepted_and_fixed | Added the two signed outstanding-index schemas and fail-closed resolution of exact control/index heads, control authorization, joint control receipt, scoped leaf, index transition receipt, shared transaction, and service-time chronology; exact receipt reads dispatch the same validator |

That replacement passed 26/26 authored controls and killed 244/244 direct
mutants, but it was superseded by round 20.

## Independent audit round 20

An informed read-only replay rejected candidate
`sha-256:ee30fb0decfeb50e2318ed27d6c4be4311843f74419a33d665c406427e9af552`
with registry
`sha-256:0f35ab4105174c7fdf96c9d10f8beb96d6691c0d40f297ca2d8bcaf40dba9294`.
Its release/package reviewer independently reproduced the hashes, clean install,
byte-identical rebuild, 26/26 controls, exact base pins, and proposal baseline;
the semantic gate still rejected the candidate. No reviewer edited repository
files.

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R20-001 | P1 | A connection event resolved the outstanding-index head but not its named enumerable map, so a coherently rehashed false `outstanding_action_root` or count still validated | accepted_and_fixed | Added exact signed map-root and local content-addressed node schemas; index validation now derives the domain key, resolves the exact root, and matches map hash, count, and entries commitment before a connection event or exact read succeeds |
| P1R20-002 | P1 | The index head, outstanding entry, index-transition receipt, and map dependencies required by semantic validation were unreachable through the 25-operation read surface | accepted_and_fixed | Added four prose-named schema-only reads with exact response schemas; sensitive heads use audit-control access, detailed entries/receipts use audit-detail access, and map reads inherit the owning index ACL through a bounded parent/ancestor path |
| P2R20-003 | P2 | The initial remediation draft recursively traversed an unbounded trie, overconstrained nonempty terminal seal, and left non-connection transition causes underclosed | accepted_and_fixed | Root reads are O(1), node reads validate only a bounded path of at most 64 ancestors, nonempty active→sealed is valid for later drain, and the six transition families have distinct count/revision/entry/evidence/state matrices |

That round-20 replacement was superseded by the rounds below.

## Independent audit rounds 21–28

Successive informed and context-blind semantic reviews rejected the
pre-freeze candidate family through commit `91d92a3`. Reviewers made no
candidate edits. Their P1 findings were accepted and remediated:

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R21-001 | P1 | Exact object reads authenticated shape and self-hash but not always the returned signature, intrinsic semantics, dependency signatures, or mutable current head | accepted_and_fixed | Every exact getter authenticates the returned signed bytes, dispatches intrinsic validation with signed dependencies, and applies currentness only to the closed mutable-head operation set; historical authority reads deliberately do not re-evaluate later nonce/judgment policy |
| P1R22-001 | P1 | Agent-runtime bindings could name coherent but unsigned, stale, cross-wired, pre-creation, or shorter-lived runtime/connection objects | accepted_and_fixed | BindingSet resolves exact signed runtime, connection authorization, and current active connection head, binds principal and refs, and contains its complete interval inside both signed dependencies |
| P1R23-001 | P1 | Live one-shot authority could be replayed after principal revocation or a reserved-judgment policy change; a resolver failure could degrade to a permissive default | accepted_and_fixed | Current authorization and cancellation checks require a resolved exact revocation nonce; action authorization additionally requires the exact current reserved-judgment vector. Historical reads preserve signed history without restoring eligibility |
| P1R24-001 | P1 | Composite `action.get` could contain unsigned or stale embedded heads and an invalid lineage/activity graph | accepted_and_fixed | The composite read authenticates every embedded signed object, resolves all three current heads, validates lineage/action/activity/authority/reservation/gate closure, and rejects substituted lineage predecessors |
| P1R25-001 | P1 | Control receipts did not independently prove signed aggregate/scoped successors, exact sequence/predecessor, or chronology | accepted_and_fixed | Receipt validation resolves and authenticates both aggregate heads and scoped leaves, requires exact successors and stable identity, and orders commit/signature time; isolated mutants cover signature and sequence checks |
| P1R26-001 | P1 | Compartment heads named reservation/economic/event manifests whose domains were not machine-representable, and transition receipts did not close economic deltas | accepted_and_fixed | Added three closed map domains and exact external leaf profiles; state heads bind definition, manifests, asset, predecessor, and fence. Transitions bind exact cause, typed delta manifest/entries/root, money projection, cause/class rules, empty close, and chronology |
| P1R27-001 | P1 | Receiver event and terminal completion paths could confuse assignment epochs, partial consumption, receipt families, scope successors, or the planned assignment set | accepted_and_fixed | Receiver event transitions bind exact identity scope and consume one reserved slot; completion groups exact assignment refs by exact transition, proves complete identity/trust sets, and shares the terminal authority transaction across child receipts |
| P1R28-001 | P1 | The prose left current-vs-historical read behavior, action-authority policy inputs, and terminal completion identity insufficiently explicit | accepted_and_fixed | The fixed prose now names the current getter set, authenticated dependency behavior, current policy inputs, and exact composite terminal identity fields without adding a service or mutation surface |

## Independent audit rounds 29–35 and local mutation replay

The final pre-freeze cold reviews found one additional machine-closure defect
and five stale/ambiguous mutation anchors. All were accepted. No reviewer
modified generated artifacts or deployed state.

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R29-001 | P1 | `ExecutionBindingSet` required a current DataGrant state object that the machine bundle did not define, making nonempty runtime grant graphs impossible | accepted_and_fixed | Added signed `DataGrantStateHead`, its exact current getter, closed query/count union, exact base-grant/signature/current-head binding, and a closed successor graph |
| P1R30-001 | P1 | DataGrant successor semantics allowed skipped read decrements, control transitions without a nonce advance, and ambiguous zero-read terminal states | accepted_and_fixed | Genesis equals the issued positive count; active reads decrement exactly one; final read is exactly `1→0 exhausted`; pause/resume/revoke/expiry preserve count and advance nonce; exhausted may revoke/expire while preserving zero |
| P1R31-001 | P1 | Some receiver/control/DataGrant counterexamples were rejected upstream for a different defect, leaving the intended predicate unproved | accepted_and_fixed | Fixtures now isolate each invariant: signed skipped control heads, unauthenticated control heads/leaves, a DataGrant cross-wire at the state validator, receiver immutable drift that remains intrinsically valid, and a completion-only wrong assignment transition |
| P2R32-001 | P2 | Eight mutation anchors no longer matched exactly after remediation, and the first replay exposed seven surviving controls | accepted_and_fixed | Every anchor now matches exactly once; the seven survivors were dispositioned as masked-fixture gaps, corrected, and the complete suite now kills 330/330 direct mutants |

The first frozen replacement, commit `0b98fffb8e9dd59b465e178a9fad9c30c9ca3a4a`,
was then rejected by two context-blind reviewers and one informed release
reviewer. The rejected bytes are not the current candidate. Every finding was
accepted and remediated before preparing this replacement freeze:

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R33-001 | P1 | An exact GateResult read authenticated the result but did not authenticate its exact GateRequest dependency | accepted_and_fixed | GateResult now verifies the resolved GateRequest signature whenever dependency signatures are required; GateRequest independently authenticates its binding, authority, confirmation, and mandate-lineage dependency graph |
| P1R33-002 | P1 | A BindingSet could carry a valid foreign-principal DataGrant graph or a grant addressed to another runtime | accepted_and_fixed | Binding validation resolves the signed base grant and current head, closes principal identity across the graph, and requires the exact runtime-instance recipient and audience for agent-runtime bindings |
| P1R33-003 | P1 | Cancellation authority did not bind the current reserved-judgment vector | accepted_and_fixed | CancellationAuthorization now carries and validates the exact current `reserved_judgments_decided` vector alongside the principal revocation nonce |
| P1R33-004 | P1 | ExecutionControlReceipt did not independently resolve its authority basis or prove the exact control-map transition | accepted_and_fixed | Receipt validation now authenticates and semantically validates the exact control authorization, expected prior head, time window, authorized successor state, namespace basis, and before/after scoped-map projection |
| P2R33-005 | P2 | A historical ActionGet could become unreadable after later nonce or judgment-policy drift | accepted_and_fixed | Composite historical evidence is validated with authenticated dependencies but without reapplying present-day eligibility policy; live redemption eligibility remains current-state checked |
| P1R34-001 | P1 | Authenticated receiver events and closure did not require the entry to advance to exact successor assignments or consume the closing event | accepted_and_fixed | Nonterminal events bind before and after assignment refs, consume exactly one while capacity remains, and update the entry to both exact successors; authenticated closure consumes exactly one and then releases, while horizon/fence release preserves consumption |
| P1R34-002 | P1 | Compartment balances, roots, exposure limits, and delta manifests were not recomputed from complete committed map trees | accepted_and_fixed | Recursive map resolution derives all economic-atom and confirmed-event subsets, balances, roots, and exposure; transitions require the exact changed-atom keyset, exact semantic values, append-only event diff, and cause-specific event kinds |
| P2R34-003 | P2 | DataGrant expiry-state timing rejected the exact expiry boundary | accepted_and_fixed | Nonexpired states require `updated_at < expires_at`; `expired` requires `updated_at >= expires_at`, including equality |
| P2R35-001 | P2 | Release documentation retained obsolete hashes, object/receipt family counts, mutation totals, and pre-freeze wording | accepted_and_fixed | The then-current `393b87f` candidate documentation was corrected to its exact 44-object/34-operation/349-control evidence and distinguished from the earlier rejected freeze |

The second replacement freeze, commit
`393b87f1ef77275a631c2196a376e52b30a78861`, was rejected by the fresh
exact-commit gate. The rejected bytes and their hashes are retained in git
history; they are not the current candidate. Round-36 remediation and two
read-only round-37 pre-freeze audits produced the following accepted findings:

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R36-001 | P1 | Cancellation accepted an unauthenticated original action/state or a caller-shaped current judgment vector | accepted_and_fixed | Original signed objects are mandatory, and a structured resolver binds the exact current binding/review/policy/decision graph |
| P1R36-002 | P1 | Gate dependency outcomes could be caller-projected, globally collapsed, unsigned, or evaluated at a backdatable request time | accepted_and_fixed | Added a signed exact dependency manifest, mandatory GateRequest/GateResult signatures, one trusted evaluation time/causal interval, and 19 independently derived predicates/evidence sets |
| P1R36-003 | P1 | DataGrant bindings did not close purpose/use/scope/audience, full lifetime, or current nonzero eligibility | accepted_and_fixed | Grant-head commitments now bind the exact signed contract, exact runtime recipient/audience, contained interval, and current active positive state; historical final-read evidence remains separate |
| P1R36-004 | P1 | Execution-control receipts named scoped map successors without proving the exact authenticated change | accepted_and_fixed | Added the scoped-control map domain, before/after proofs, derived map key, frontier equality, target/epoch/nonce matrix, and joint connection/outstanding dependencies |
| P1R36-005 | P1 | Active reservations and reserved economic atoms were not closed bidirectionally | accepted_and_fixed | Compartment validation recomputes the exact reservation-to-held-atom closure and committed held-root |
| P1R36-006 | P1 | Terminal receiver completion could split identity release across multiple transactions | accepted_and_fixed | Both identity assignments must share one transition receipt equal to the receiver transition under one authority transaction |
| P1R36-007 | P1 | Valid late events assigned to an older draining epoch were rejected, while migration boundaries were not explicit | accepted_and_fixed | The accepting/draining epoch matrix now accepts only the exact unchanged assigned draining epoch and rejects epoch migration |
| P1R36-008 | P1 | A caller-visible historical flag risked relaxing live validation | accepted_and_fixed | Historical evidence mode is private and unforgeable; caller `historicalRead:true` has no effect on live gate/current-head checks |
| P1R37-001 | P1 | A generic gate wrapper could collapse independent trust domains under one opaque signer | accepted_and_fixed | Added role-authorized signed source attestations, derived principal/role/subject keys, exact current heads, and fail-closed unsupported roles |
| P1R37-002 | P1 | Gate checks could inherit one global active bit rather than evaluate their named condition | accepted_and_fixed | Each closed check code has an independent predicate and minimal exact evidence; reservation checks run the full action/binding/authority/lineage/fence graph |
| P1R37-003 | P1 | Dependency state history admitted a revoked genesis and could not honestly rotate to a newly signed revoked source | accepted_and_fixed | Genesis is active-only; every successor uses a newly signed attestation over the same immutable subject and a closed monotonic transition graph |
| P2R37-004 | P2 | New predicates lacked isolated counterexamples, 15 inherited mutation anchors were stale, and four first-replay controls were masked | accepted_and_fixed | Repaired every anchor, added direct variations for each new boundary, isolated gate order/signature checks, and retired two redundant receiver controls subsumed by stronger atomicity/set controls |

## Independent audit round 38

The third replacement freeze, commit
`902abec8ed10a937ce2fc52a4ed708d1873ad092`, was rejected independently by a
context-blind authority reviewer, a context-blind state/transition reviewer, and
an informed release reviewer. They reproduced its exact bundle
`sha-256:0788cbbcd7100f7c0d90bc9d1414781bf36cd29a38d96fac5ba29b2bbc0670e9`,
registry
`sha-256:2fcc19bcf9ce9435520e1ecd4323bf01dfdb764c1f15a9674ef9a506309ce7d8`,
30/30 authored controls, and 369/369 killed mutants. Those bytes are rejected
history, not the current candidate. No reviewer edited candidate files.

| ID | Sev. | Independent finding | Disposition | Remediation in the current candidate |
|---|---:|---|---|---|
| P1R38-001 | P1 | Several of the 19 gate predicates remained shallow projections of missing or caller-shaped roles, yet the partial machine could still represent an `allow` result and redemption | accepted_and_fixed | The Round-38 replacement made nine predicates deny and rejected allow/redemption at specialized validators; Round 39 further makes GateResult structurally deny-only, removes RedemptionReceipt, and adds `EXECUTION_CONTROLS` as the tenth unsupported predicate |
| P1R38-002 | P1 | Cancellation did not unconditionally authenticate the original action/state or prove that the original state remained current; gate attestations, wrappers, signatures, and current-head resolution could be evaluated after the claimed gate instant | accepted_and_fixed | Original action and state signatures are always required, live cancellation requires the exact current state, source/wrapper/signature chronology is bounded by `evaluated_at`, and the current-head resolver receives the recorded evaluation time |
| P1R38-003 | P1 | An inline disclosure could make an exhausted DataGrant head eligible as a forged final-read shortcut | accepted_and_fixed | BindingSet requires a current `active` head with positive reads; exhausted heads remain historical only, including when named by an inline disclosure |
| P1R38-004 | P1 | Global/scoped control transitions, recovery use, namespace rotation, scoped target identity, and connection/outstanding-index authority were not one closed machine | accepted_and_fixed | Added derived scoped keys, one exact transition matrix, virtual scoped genesis, global/scoped separation, exact generation rotation, connection-only outstanding-index binding, and fail-closed unsupported recovery |
| P1R38-005 | P1 | Compartment transitions could rewrite reservation provenance or insert confirmed events without exact obligation/component/amount correlation to the atom deltas | accepted_and_fixed | Reservation identity is immutable, every reservation change requires its matching reserved-class delta, and each confirmed group requires one exact domain-separated event with checked amount and no extras |
| P2R38-006 | P2 | The release claim treated a lockfile/package-local install as byte verification of the installed transitive dependency tree | accepted_and_fixed | Claims are narrowed to exact lockfile/source commitments plus a disposable clean `npm ci --ignore-scripts` replay; no arbitrary installed-tree byte attestation is claimed |
| P2R38-007 | P2 | Prose and release docs lagged the machine on grant-head commitments, final-read behavior, recovery availability, control unions, and candidate/count evidence | accepted_and_fixed | Round-38 documents recorded the then-current 31/31 and 390/390 evidence; Round 39 marks those as rejected-freeze history and records replacement-local 31/31 and 419/419 evidence pending frozen replay |

The fourth exact freeze, commit
`26b701609583ec7e518526b0ae78aed46c10fc19`, was rejected by the Round-39
informed regression, context-blind authority, and context-blind
state/transition audits. The informed reviewer independently reproduced its
bundle `sha-256:2e20299693d593fbf66f5e0b0512fbd0e8a080159cc1f99c3990d00eedb49a8e`,
registry `sha-256:14b3c86c4cc1b419ae6055d97e7696659c0697a96ac608ff5af3d1450e069726`,
31/31 authored controls, 390/390 killed direct mutants, clean install,
byte-identical build, unchanged proposal 83/83 controls and 75/75 mutants, and
clean exact-commit worktree. Those results establish reproducibility, not
semantic acceptance.

## Independent audit round 39 — rejected freeze and remediation ledger

All three reviewers were read-only. Every finding below is accepted. The
remediation disposition is `accepted_and_fixed`; the working replacement passes
31/31 authored controls and kills 419/419 exact-once direct mutants. Closure
remains pending until the containing commit is frozen and those results are
reproduced by fresh reviewers. “Fixed” therefore records implementation
disposition, not closure.

| ID | Report | Sev. | Independent finding | Disposition | Replacement remediation | Verification |
|---|---|---:|---|---|---|---|
| P1R39-I-001 | informed regression | P1 | Joint control validated the connection receipt's presence/signature/correlation but did not invoke the complete connection action/leaf/state relation | accepted_and_fixed | One shared non-recursive joint-pair validator is invoked from both receipt directions and binds authorization target, transaction, commit, aggregate, scoped leaf, connection transition, and index head | pending |
| P2R39-I-002 | informed regression | P2 | Historical signature eligibility used the latest key status and rejected evidence evaluated before a later revocation | accepted_and_fixed | Key resolution takes the semantic evaluation instant; signing-time validity and as-of eligibility are distinct, and missing authenticated history fails closed | pending |
| P2R39-I-003 | informed regression | P2 | A historical joint receipt compared its index head with retrieval-time currentness, so later legitimate advancement invalidated old evidence | accepted_and_fixed | Current-head resolution takes `committed_at` for historical receipts and live time for live reads; no latest-head fallback is permitted | pending |
| P2R39-I-004 | informed regression | P2 | Control tests/mutants did not exhaust the global/scoped/joint transition matrix, and only one of the unsupported gate predicates had an isolated mutant | accepted_and_fixed | Replacement controls cover every control edge and each of 19 gate predicates plus each of ten unsupported guards with exact-once mutation anchors | pending |
| P2R39-I-005 | informed regression | P2 | Release register and coordination state described the exact frozen commit as still awaiting freeze | accepted_and_fixed | Documents distinguish rejected `26b7016`, locally verified replacement evidence, and a future containing-commit freeze without a self-referential hash | pending |
| P2R39-A-001 | blind authority | P2 | External protection was accepted from a shallow stub, while bundled confirmation policy/profile signatures were not cryptographically consumed | accepted_and_fixed | Compartment/protection and financial external truth are unavailable; compartment getters are removed; bundled policy/profile dependencies require signed validation | pending |
| P2R39-A-002 | blind authority | P2 | Exact-read dispatch omitted aggregate-control, namespace, and current action-state chain semantics | accepted_and_fixed | Intrinsic namespace/aggregate validators and the exact action predecessor chain are required by retained composite reads | pending |
| P2R39-A-003 | blind authority | P2 | Standalone transition-manifest reads authenticated structure/key IDs and a Boolean ACL rather than a signed access decision | accepted_and_fixed | Standalone manifest getter and request family are removed; manifests remain internal typed commitments and their signatures are checked when reached | pending |
| P2R39-A-004 | blind authority | P2 | Generic structural validation admitted an `allow` GateResult and RedemptionReceipt although specialized paths denied them | accepted_and_fixed | GateResult is structurally deny-only; RedemptionReceipt is removed; action-state redemption refs and recovery branches are structurally null | pending |
| P2R39-A-005 | blind authority | P2 | The generic map getter advertised multiple owner domains but authenticated only one hard-coded parent shape | accepted_and_fixed | Standalone map getter and request/response family are removed; maps remain internal content-addressed dependency structures | pending |
| P2R39-A-006 | targeted blind authority follow-up | P2 | Deny-only GateResult coexisted with a structurally valid `gate_allowed` ActionState and ActionReceipt edges into removed post-redemption states; the receipt also retained effect-bearing fields | accepted_and_fixed | Removed `gate_allowed` and every post-redemption action branch; ActionReceipt is limited to preparatory/reservation/cancellation/failure/quarantine edges and structurally empty/null effect, receiver, and exposure fields | pending |
| P1R39-S-001 | blind state/transition | P1 | Caller-authored key/controller/current-head/role data and always-true verifiers could establish apparent authenticated success | accepted_and_fixed | Raw resolvers and callbacks are conditional only; high-level authenticated paths return `phase1_authenticated_resolution_unsupported` until a frozen rooted-proof profile exists | pending |
| P1R39-S-002 | blind state/transition | P1 | Gate control evaluation saw the aggregate head but could omit an applicable revoked or frozen scoped leaf | accepted_and_fixed | `EXECUTION_CONTROLS` becomes the tenth unsupported check and always denies; aggregate evidence is not presented as proof of scoped state | pending |
| P1R39-S-003 | blind state/transition | P1 | Disclosure entries were projected but their authorization, source-read consumption, reservation, and successor graph were not validated | accepted_and_fixed | Phase-1 binding disclosures are structurally empty-only; nonempty values fail schema validation before semantic dispatch | pending |
| P1R39-S-004 | blind state/transition | P1 | Reservation, economic-atom, and confirmed-event map leaves could be blessed by a Boolean external callback | accepted_and_fixed | Nonempty leaves in all three external accounting domains return stable unsupported before any external callback | pending |
| P1R39-S-005 | blind state/transition | P1 | Control authorization, namespace, predecessor, successor, commit, and receipt signatures lacked one complete causal chronology | accepted_and_fixed | One ordered-time relation covers all retained control branches, including legal same-second equality | pending |
| P1R39-S-006 | blind state/transition | P1 | `LineageProvisionalTerminalReceipt` was reachable through `receipt.get` without intrinsic cause/state, predecessor, absence-proof, commitment, and chronology validation | accepted_and_fixed | The family is excluded from `receipt.get` and retained only as future structural vocabulary | pending |

The agreed replacement target contains 50 schema documents: 45 signed object
families, one content-addressed map-node family, and four support documents. It
contains 46 object schemas and exposes 29 schema-only read operations. Five
standalone getters are removed; `receipt.get` also excludes provisional-terminal
and compartment-transition receipts. GateResult is structurally deny-only,
RedemptionReceipt is absent, and recovery is structurally forbidden.
ActionState and ActionReceipt expose no gate-allowed or post-redemption branch;
ActionReceipt effect, receiver, and exposure fields are empty/null-only.

The current replacement passes 32/32 authored controls and kills all 485
unique exact-once direct mutants locally and after a disposable clean install.
Its focused Round-43 tranche kills all four new or changed controls; the clean
replay also reproduces the unchanged 83/83 plus 75/75 proposal baseline,
byte-identical artifacts, and zero production dependency vulnerabilities.
Reference-service work is blocked pending those replays and the frozen review
gate.

## Independent audit round 40 — rejected freeze and remediation ledger

Exact freeze `ebd10f4302e73846e73a3a38860581d9fba21c69` is rejected.
Its informed regression, blind authority, and blind semantic/state reviewers
reported no P0 or P1 defect, but found the five material P2 classes below. All
reviewers were read-only. Every finding is `accepted_and_fixed`; that
disposition records implementation, not closure.

| ID | Report | Sev. | Independent finding | Disposition | Replacement remediation | Verification |
|---|---|---:|---|---|---|---|
| P2R40-A-001 | blind authority/privacy | P2 | Activity surfaces could expose authority-adjacent gate, receiver-finality, or spend/effect state, and exact detail reads lacked their own intrinsic semantic dispatch | accepted_and_fixed | Activity is restricted to six non-effectful states; summary/detail/list carry null receiver and exposure truth and forbid gate/effect states; exact detail invokes the intrinsic validator | pending frozen replay |
| P2R40-H-001 | blind historical semantics | P2 | Historical action and gate reads did not carry one authenticated semantic instant through every key, policy, and current-head lookup, and a missing historical resolver could fall back to live state | accepted_and_fixed | Action now uses signed `ExecutionActionView.assembled_at` with envelope-time equality, gate uses `evaluated_at`, and joint receipts use `committed_at`; dedicated history resolvers are mandatory in historical mode and live fallback is forbidden | pending frozen replay |
| P2R40-C-001 | informed chronology | P2 | ActionState and ActionReceipt chronology left independent predecessor/successor update and signature comparisons underconstrained | accepted_and_fixed | Added the complete predecessor-update/signature, successor-update/signature, issue/commit, and receipt-signature partial order with same-second equality | pending frozen replay |
| P2R40-R-001 | blind receiver closure | P2 | Validly signed receiver closure objects could cross-wire the closure evidence, authority transaction, commit instant, release plan, or receiver transition | accepted_and_fixed | Pure relational validators bind the exact closure evidence, transaction, commit, plan, and receiver transition; each correlation edge has an isolated counterexample | pending frozen replay |
| P2R40-J-001 | informed joint-control parity | P2 | The connection direction of the shared joint relation did not authenticate and validate the same complete dependency graph as the control direction, and parity lacked direct mutation controls | accepted_and_fixed | Both directions authenticate aggregate/scoped heads and maps, index transition, authorization, control receipt/leaves, and commit-time outstanding head; both fail closed with the same unsupported result until rooted resolution exists | pending frozen replay |

The replacement retains 50 schema documents, 46 object schemas, and 29
schema-only read operations. It passes 32/32 authored controls and kills
445/445 exact-once direct mutants both in place and after a disposable
`npm ci --ignore-scripts`. The clean replay reproduced byte-identical files:
bundle file SHA-256
`12068b56c30e31ef7d53c433e60e61ff1e5abac8f7aac06d19d533262d3e3e54`
and registry file SHA-256
`5ffc71aa45f6294c6b83e819079dd2a892f1607c1cd8b449b8cc1bfa5fe79e45`.
The replacement containing-commit hash and fresh reviews remain pending.
Reference-service construction remains blocked.

## Independent audit round 41 — rejected freeze and remediation ledger

Exact freeze `dd12269c5a5dd8b2d6e69a6e579d9bc48a16f373` is rejected.
Its blind authority and blind semantic reviewers found the P1 and material P2
classes below. Follow-up read-only review of the working remediation found the
private recursion, signed map-entry, evidence-snapshot, deterministic activity
page, and bounded transitive-dependency gaps included here. Every finding is
`accepted_and_fixed`; that disposition records implementation, not closure.

| ID | Report | Sev. | Independent finding | Disposition | Replacement remediation | Verification |
|---|---|---:|---|---|---|---|
| P1R41-P-001 | blind authority | P1 | Caller-controlled object properties or a Proxy could forge the historical-evidence sentinel and downgrade live currentness | accepted_and_fixed | Historical provenance is a module-private WeakSet capability propagated only from privately registered contexts; direct Proxy and derived-context controls cover the boundary | pending frozen replay |
| P2R41-A-001 | blind authority | P2 | `ActionGet` used an unsigned envelope retrieval time as its semantic anchor | accepted_and_fixed | Signed `ExecutionActionView.assembled_at` is the sole snapshot; envelope `retrieved_at` must equal it and cannot be shadowed by caller context | pending frozen replay |
| P2R41-D-001 | blind semantics | P2 | Exact reads could trust unsigned map entries or stop dependency authentication before the action's binding and lineage commitments | accepted_and_fixed | Signed map root and leaf entries plus signed action/state/BindingSet/LineageCommitment graph are authenticated on outstanding and activity paths | pending frozen replay |
| P2R41-T-001 | blind semantics | P2 | Proof-signing time, semantic currentness time, and evidence availability were conflated, rejecting legitimate delayed signatures and admitting unavailable future proof | accepted_and_fixed | Signing keys resolve at `proof.signed_at`, eligibility at semantic time, and historical signatures are bounded by a separate authenticated evidence snapshot | pending frozen replay |
| P2R41-B-001 | blind semantics | P2 | Historical BindingSet validation did not prove captured connection and DataGrant heads current at signed creation time | accepted_and_fixed | Both captured heads require historical currentness at `created_at`; missing or stale history fails closed | pending frozen replay |
| P2R41-J-001 | follow-up authority | P2 | Joint peer validation was asymmetric and its public recursion-skip field could suppress the complete peer relation | accepted_and_fixed | Both directions invoke full peer semantics and use private WeakSet recursion provenance; caller fields and Proxies cannot bypass it | pending frozen replay |
| P2R41-L-001 | follow-up semantics | P2 | `activity.list` lacked a signed retrieval snapshot, deterministic cursor, and complete page-level semantic validator | accepted_and_fixed | Added required `retrieved_at`, deterministic cursor derivation, page/total/duplicate/filter/principal checks, historical/current-head validation, and signed bounded item graphs | pending frozen replay |
| P2R41-F-001 | follow-up semantics | P2 | A historical composite could include a signature produced after the authenticated snapshot | accepted_and_fixed | Historical evidence rejects `proof.signed_at` later than its evidence snapshot while preserving delayed event-to-retrieval signatures | pending frozen replay |

The replacement retains 50 schema documents, 46 object schemas, and 29
schema-only read operations. It passes 32/32 authored controls and kills
480/480 unique exact-once direct mutants both in place and after a disposable
`npm ci --ignore-scripts`. The clean replay reproduced byte-identical files:
bundle file SHA-256
`b98c1e30f370ccfd858458deb1ddd3bc0e152712fb863dbf010f0909c6c514b7`
and registry file SHA-256
`44c76f3c8e3f51726b6cbf97d97d8f710cc101737e58afbb114d18ce376a1642`.
The unchanged proposal baseline reproduced 83/83 controls, 75/75 mutants, and
base bundle file SHA-256
`d97af006b86c1d3c7ae4597c01976a8c1185e366e9cc58d5646f0a2680fae70e`.
Both clean dependency audits found zero known production vulnerabilities. The
replacement containing-commit hash and three fresh exact-commit reviews remain
pending.
Reference-service construction remains blocked.

## Independent audit round 42 — rejected freeze and remediation ledger

Exact freeze `4d62c0fd2d46b5eb182706ea07ce94d3af97798f` is rejected. Its
informed and blind exact-commit reviewers reproduced 32/32 authored controls,
480/480 mutants, the unchanged 83/83 plus 75/75 proposal baseline, exact hashes
and containment counts, and zero dependency vulnerabilities before finding the
three material P2 gaps below. Automated classifiers stopped two other attempted
blind lanes without a technical verdict; those null results are not counted as
reviews. All findings are `accepted_and_fixed`; that disposition records
implementation, not closure.

| ID | Report | Sev. | Independent finding | Disposition | Replacement remediation | Verification |
|---|---|---:|---|---|---|---|
| P2R42-D-001 | informed release | P2 | A historical BindingSet reconstructed a nested DataGrant-state context with object spread, losing private historical provenance and allowing a predecessor proof signed after the evidence snapshot | accepted_and_fixed | All nested validator overrides now use the private provenance-preserving derivation helper; a direct historical predecessor counterexample and mutant cover the exact regression | authored control passed; direct mutant killed in 483/483 local replay |
| P2R42-P-001 | informed release | P2 | `activity.list` treated authenticated principal scope as optional despite the specification claiming page-level principal enforcement | accepted_and_fixed | Missing/empty/non-string principal scope now fails as unresolved; cross-principal items still fail mismatch; separate direct mutants cover absence and mismatch | authored controls passed; direct mutants killed in 483/483 local replay |
| P2R42-C-001 | blind boundary | P2 | A current exact read could return a valid proof created after its signed retrieval snapshot because future-proof rejection applied only to privately historical contexts | accepted_and_fixed | Current exact reads now set an evidence snapshot from `retrieved_at`, and proof availability is bounded whenever that snapshot exists; a direct current-control counterexample and mutant cover the path | authored control passed; direct mutant killed in 483/483 local replay |

The replacement retains 50 schema documents, 46 object schemas, and 29
schema-only read operations. It passes 32/32 authored controls and kills all
483 unique exact-once direct mutants both locally and after a disposable
`npm ci --ignore-scripts`. The clean replay reproduced byte-identical execution
bundle and registry files with SHA-256
`807a7f61e138ba9f61efb8ea47c9cbf8230c07fc1648931143d14e84c677d02e` and
`00f8ac8ed32fa8383bcb20e81af4fd07d1460e068ff663c96fa18d92b7ce812d`.
Their internal canonical hashes are respectively
`dd363875cfaf22f0e1c488787b681362c212a5086060eb1fdca7aca0731bac5b` and
`cd49a2c6ae75caa91ee1e6daac0a9aa333bd72142a17fe75566bddbda490edea`.
The unchanged proposal baseline reproduced 83/83 authored controls, 75/75
mutants, and base bundle file SHA-256
`d97af006b86c1d3c7ae4597c01976a8c1185e366e9cc58d5646f0a2680fae70e`.
Both clean dependency audits found zero known production vulnerabilities. A
replacement containing-commit hash and three fresh exact-commit reviews remain
pending. Reference-service construction remains blocked.

## Independent audit round 43 — rejected freeze and remediation ledger

Exact freeze `420fa52ecdcab696f3de3b04bda89326992e5ed4` is rejected. Its
informed exact-commit reviewer reproduced 32/32 authored controls, 483/483
mutants, the unchanged 83/83 plus 75/75 proposal baseline, exact hashes and
containment counts, byte-identical clean-install artifacts, and zero dependency
vulnerabilities before finding the three material P2 gaps below. Three attempted
blind lanes were stopped by an automated classifier without a technical verdict;
those null results are not counted as reviews. All findings are
`accepted_and_fixed`; that disposition records implementation, not closure.

| ID | Report | Sev. | Independent finding | Disposition | Replacement remediation | Verification |
|---|---|---:|---|---|---|---|
| P2R43-P-001 | informed release | P2 | Mandatory `activity.list` principal scope was checked only inside the item loop, so an empty page bypassed it | accepted_and_fixed | Principal presence is validated once at the page boundary before iteration; per-item equality remains separate | empty-page authored counterexample passed; mandatory-principal mutant killed |
| P2R43-T-001 | informed release | P2 | A current exact read could return a head whose `updated_at` followed `retrieved_at` when its proof had been pre-signed | accepted_and_fixed | Exact reads bind the object's protocol semantic instant independently of proof time and reject it after the evidence snapshot | future-effective current-head counterexample passed; direct mutant killed |
| P2R43-C-001 | informed release | P2 | The claimed source-wide provenance invariant counted only literal `...context` and missed three `{...receiptContext}` nested reconstructions | accepted_and_fixed | The source invariant covers every context-bearing object-spread alias; receipt map and outstanding-index paths use the private derivation helper | source invariant passed with only two private constructors; aliased-context mutant killed |

The replacement retains 50 schema documents, 46 object schemas, and 29
schema-only read operations. It passes 32/32 authored controls and kills all
485 unique exact-once direct mutants locally and after a disposable
`npm ci --ignore-scripts`; all four new or changed focused controls are killed.
The clean replay reproduced byte-identical execution bundle and registry files
with SHA-256
`d6b005c86eaaddc38f168164b62bdbd4374800940363a67aa21b180510dc554e` and
`ef926b5d69a6f3c79b6f0c6efd13c832533ca782da04fb13c3c7ae8154732689`.
Their internal canonical hashes are respectively
`609f940251e0b02cf938ba900b6dfd68d44037d5c1e7259c12a95a0877411aec` and
`7e96e469bd07fd70b963c4903356218f20be20a6da1644fa13c655f5901caf1e`.
The unchanged proposal baseline reproduced 83/83 authored controls, 75/75
mutants, and base bundle file SHA-256
`d97af006b86c1d3c7ae4597c01976a8c1185e366e9cc58d5646f0a2680fae70e`.
Both clean dependency audits found zero known production vulnerabilities. A
replacement containing-commit hash and three fresh exact-commit reviews remain
pending. Reference-service construction remains blocked.

## Local remediation ledger

| ID | Sev. | Finding | Disposition | Remediation |
|---|---:|---|---|---|
| P1M-001 | P1 | A Phase 1 profile could accidentally expose a mutation or external-effect operation | accepted_and_fixed | Registry schema fixes both booleans false, exact tuples are pinned, mutation verbs are rejected, and direct mutants kill both changes |
| P1M-002 | P1 | Connection or control target fields could be recombined across scope classes | accepted_and_fixed | Added exact target-union validators and independent target/recovery mutants |
| P1M-003 | P1 | Financial and nonfinancial mandate branches or assets could be combined | accepted_and_fixed | Added branch-disjoint validation, single-asset equality, limit ordering, and direct mutants |
| P1M-004 | P1 | A syntactically valid signature could be accepted without cryptographic proof or an exact expected controller | accepted_and_fixed | Added Ed25519 verification, key-time/status checks, mandatory controller context, and three direct mutants |
| P1M-005 | P1 | Schema timestamp syntax admitted impossible calendar instants | accepted_and_fixed | Added exact calendar validation plus a direct mutant |
| P1M-006 | P1 | The execution artifact could silently drift from its audited prose or frozen proposal dependency | accepted_and_fixed | Build reads and verifies the exact prose, bundle, registry, and canonical base-bundle bytes; three build mutants exercise the pins |
| P1M-007 | P2 | Hand-authored JSON could contain duplicate members before JavaScript parsing | accepted_and_fixed | Phase 1 build now runs the existing strict duplicate-member/I-JSON source checker over its manifest |
| P1M-008 | P2 | Duplicate declarative object fields or schema URIs could be overwritten during generation | accepted_and_fixed | Catalog construction rejects duplicate field names and bundle audit rejects duplicate schema URIs/object IDs |

## Historical independent closure gate — superseded

Before scope removal, this register would have remained open until a reviewer
who did not author the candidate:

1. verifies the replacement containing-commit hash, bundle hash, registry hash,
   and repinned prose hash before and after a read-only review;
2. reproduces 32/32 authored controls and 485/485 direct mutants, with every
   mutation anchor matching exactly once;
3. replays the 83/83 proposal controls and 75/75 proposal mutants with the same
   base bundle hash;
4. audits the exact 29-operation, 46-object, 50-document containment surface,
   its removed generic-response families, and its structural deny boundaries;
5. reports zero open P0/P1 and no material unowned P2; and
6. confirms explicitly that machine-bundle closure would still not authorize an
   execution service, mutation endpoint, payment, deployment, or conformance
   claim.

The candidate bundle additionally commits by SHA-256 to every semantic package
source: shared core validation, strict-JSON preflight, README, manifest,
package metadata and lock, every library module, all three local scripts, the
test suite, and the direct-mutant catalogue. Editing semantic validator code
without changing the internal candidate hash was therefore a tested build
failure, not an accepted review condition. This gate is now superseded by scope
removal and cannot accept the execution candidate.

## Supersession — minimum trust kernel

Exact freeze `c5646a0104664f7edf2a453450a2ec5d5d2eb82c` is rejected. Its
technical controls were reproducible, but fresh review found material
architecture-level gaps:

| ID | Sev. | Finding | Disposition |
|---|---:|---|---|
| P2R44-O-001 | P2 | Twenty-one exact getters had no in-band authenticated retrieval time and fell back to caller context | accepted_by_scope_removal |
| P2R44-G-001 | P2 | Activity summary/detail did not completely bind action, state, lineage, predecessor, and receipt dependencies | accepted_by_scope_removal |
| P2R44-T-001 | P2 | Activity pages could admit future-effective current heads | accepted_by_scope_removal |
| P2R44-B-001 | P2 | The generic base-object getter did not dispatch foundation semantic validators | accepted_by_scope_removal |
| P2R44-C-001 | P2 | Incoming cursors and cross-page snapshots were not service-authenticated | accepted_by_scope_removal |
| P2R44-P-001 | P2 | Context-provenance enforcement depended on a naming convention rather than a structural invariant | accepted_by_scope_removal |

`accepted_by_scope_removal` does not mean fixed or accepted. It means the entire
29-operation execution/read profile has been removed from the active release
gate and retained only as rejected research evidence. Its historical tests,
mutants, and hashes remain useful audit records but are not conformance evidence.

The active candidate is now the proposal-only
[`Protocol_Agent_Minimum_Trust_Kernel_v0.1.md`](Protocol_Agent_Minimum_Trust_Kernel_v0.1.md),
machine-pinned by `protocol/minimum-trust-kernel.json`. Reopening an
execution/read profile requires an independently audited signed service
observation primitive. Building an execution reference service remains blocked.

## Round 45 — minimum trust kernel freeze and cold review

First narrowed freeze
`46421a44c60aa351cd0894cf9e8b46691073141a` is rejected. Three independent
reviewers audited that exact commit without receiving the implementation
history. The freeze retained the correct proposal-only direction but did not
yet make its smallest claims mechanically exact.

| ID | Sev. | Cold-review finding | Disposition | Replacement control |
|---|---:|---|---|---|
| P1R45-S-001 | P1 | `mutating:false` hid nonce consumption and DataGrant disclosure-budget changes | accepted_and_fixed | Registry and manifest separately close object-store writes and access-state effects for every operation |
| P1R45-P-001 | P1 | `projection.get` did not enforce the signed projection's exact audience, declared purpose, local-read use, intended use, and one grant covering both uses | accepted_and_fixed | Dedicated closed request body and semantic validation enforce all five bindings; generic `object.resolve` rejects ScopedProjection |
| P2R45-A-001 | P2 | Preparation terminology could imply the draft action had transitioned | accepted_and_fixed | Receipt now states `preparation_status:recorded`, `action_state:draft`, `action_state_transition:false`, and `external_effect:false`; the referenced action must remain draft at version zero |
| P2R45-B-001 | P2 | BYO-agent usability depended on unspecified provisioning and ObjectRef handoff | accepted_and_fixed | Four conditional prerequisites and four matching non-claims are machine-pinned; prose no longer presents host bootstrap as protocol onboarding |
| P2R45-M-001 | P2 | Kernel and execution-rejection manifests were not strict closed machine boundaries | accepted_and_fixed | Both have closed strict schemas, duplicate-member preflight, exact constants, and direct release mutants |
| P2R45-R-001 | P2 | The release artifact did not commit the full active source/review surface and stale generated bytes could mask source drift | accepted_and_fixed | Deterministic release artifact commits active sources and canonical prose; `npm run check` compares exact generated bytes before unit tests |
| P2R45-X-001 | P2 | Rejected execution code remained too easy to package, import, or mistake for an active build target | accepted_and_fixed | Root package allowlist excludes it, runtime imports are scanned, a closed rejection marker forbids advertisement/deployment/reference-service use, and reproduction instructions point only to the rejected archive |
| P2R45-T-001 | P2 | Direct mutation coverage was incomplete for the new release and semantic controls | accepted_and_fixed | Focused mutants now exercise projection binding, state effects, draft-only preparation, closed manifests, BYO prerequisites, package/runtime exclusion, source commitment, and stale release bytes |

The then-local Round-45 replacement passed 90/90 authored controls and killed 101/101 direct
security mutants. Its foundation bundle and registry remain respectively
`sha-256:4eb3862fd13659131731f1202aecc62617044682bc7c0ce9e5cd2420061b3a85`
and
`sha-256:71775e969dbfea218dffa45aa396282c7bd039a8e51863a8920a45976234b91d`.
A replacement containing commit, disposable clean-archive replay, exact package
inspection, and three fresh cold exact-commit reviews were still pending at
that round. The later rounds below supersede those values. No execution
reference service was or is authorized.

### Round 45 clean-replay rejection

Replacement freeze `1276c3eb495317893136678377360422a534242f` is rejected
before independent review. Its generated release source commitment included a
local `scripts/__pycache__/` bytecode artifact that is not present in a clean
Git archive, so the archive correctly failed the byte-for-byte release check.
The source collector now excludes Python compiler caches, and a direct mutant
creates such a cache and requires it to remain outside the release commitment.
A new containing commit and clean replay are pending.

## Round 46 — portable-kernel and private-projection hardening

Second replacement freeze
`ef2078f474c75ae17c00b98b70f9a3595f960aaa` passed disposable clean-archive
`npm ci`, 90/90 authored controls, 101/101 direct mutants, byte-identical
generation, zero production dependency vulnerabilities, and a 49-file package
containing no rejected execution file. Three new cold reviewers nevertheless
rejected that exact commit.

| ID | Sev. | Cold-review finding | Disposition | Replacement control |
|---|---:|---|---|---|
| P1R46-R-001 | P1 | `npm pack` omitted `package-lock.json`, so the distributed artifact could not reproduce its advertised install/test path by itself | accepted_and_fixed | The release packages `npm-shrinkwrap.json`; its package gate installs and runs the packed artifact's advertised tests before rebuilding |
| P1R46-R-002 | P1 | Normal `npm pack` wrote an archive into a source root that the release generator could recursively commit | accepted_and_fixed | Source commitments are the exact package allowlist minus generated `dist`; packing always targets a fresh temporary directory; a direct mutant tries to re-add the archive |
| P2R46-R-003 | P2 | The generated release had no closed envelope schema and the kernel manifest schema admitted semantically broad values | accepted_and_fixed | Closed release-envelope and manifest schemas require exact profile, hashes, operations, effects, BYO prerequisites, exclusions, and non-claims |
| P2R46-B-001 | P2 | The BYO claim named identity, grants, refs, and keys but omitted an available authenticated service endpoint and transport binding | accepted_and_fixed | A fifth prerequisite plus explicit service-availability and transport-conformance non-claims are exact machine constants with dedicated mutants |
| P2R46-B-002 | P2 | The prose ActionProposal example showed `not_claiming: []` despite the machine no-authority boundary | accepted_and_fixed | Root prose and a packaged, directly mutated authority-boundary document require `authority_to_act` and `external_effect` |
| P2R46-B-003 | P2 | ScopedProjection authenticated disclosure pointer names without carrying the disclosed values | accepted_and_fixed | A signed, bounded I-JSON payload binds each output path to an exact source ObjectRef/path and exact-copy value; disclosed/redacted path overlap is rejected |
| P2R46-S-001 | P2 | A validly signed projection with future `derived_at` was accepted | accepted_and_fixed | Signed-object currentness includes `derived_at`; the regression proves rejection without nonce or grant-budget consumption |
| P2R46-S-002 | P2 | Full semantic validation before ownership preflight let cross-principal callers distinguish existing private objects from absent refs | accepted_and_fixed | Access preflight occurs after fresh transport/idempotent replay but before object semantics; foreign correct, wrong-purpose, wrong-use, and absent reads collapse to the same private 404 |

The then-working Round-46 replacement passed 97/97 authored controls and killed 116/116 direct
security mutants. `release:verify` additionally installs and tests the extracted
package from its own shrinkwrap, rebuilds both generated artifacts byte-for-byte,
requires pack/build/repack convergence, and confirms zero rejected execution
files.

Containing freeze `b0ab625` is rejected by clean package comparison. Its working
tree pack contained
`scripts/__pycache__/check-json-sources.cpython-314.pyc` and had 56 files, while
the clean Git archive had 55. Each pack separately converged, but the
cross-environment archive bytes did not match. This is a package-inventory
reproducibility failure, not a semantic test failure. The working replacement
adds self-contained `files` exclusions for recursive `__pycache__`, `.pyc`, and
`.pyo` paths; the package checker now rejects those paths; and a focused authored
test plus direct mutant create transient compiler files and require them to stay
out of the pack.

The then-current Round-46 foundation bundle and registry were respectively
`sha-256:00e379db20f5557adc5ab1a31f3d60acdc7c038e5fe375ed8571bd1048c05a24`
and
`sha-256:71775e969dbfea218dffa45aa396282c7bd039a8e51863a8920a45976234b91d`.
A containing commit, clean-archive replay, and three new exact-commit cold
reviews were required at that round. Those values and pending markers are
historical, not the active release head; no execution reference service is
authorized.

## Current authoritative supersession — 2026-07-23

Every round above is historical. The only active candidate is the proposal-only
`cairn-proposal-foundation-v0.1` minimum trust kernel: nine exact operations,
two bounded object-store writes, seven disclosure-budget consumers, no action
authority, no external effect, and no conformance claim. Its unchanged
foundation bundle is
`sha-256:9f5caa6b0819836e1d70c4f79a8869d10936a2a55acabc2a358aec569efe36cb`;
its registry is
`sha-256:403be425bd3708903e489147f133d0ca5a55c4aa279839101ad1550bd2e2d7fe`.

Minimum-kernel freezes
`fc5ff28469f8b30182b251e5df8eecbfe6a4a2eb`,
`915ea25c5fbdb686d5028093aa4adc073ac5695b`,
`705d627a16c6eb7ce612dc9990153afa983d17ea`, and
`7f1cdf6e966cf4441ad38c5379cdd994dca185d8` are rejected history. The last two
independently reproduced the previous 101/101 controls, 134/134 mutants, and
55-file package
`sha-256:bef5888e5b4f090fc5e66075a0095f0baf33e795d47b99c5dbe634547d33effd`,
but active-document drift and an incompletely pinned executable verification
toolchain prevented closure.

The post-`7f1cdf6` replacement pins and runtime-enforces Node `24.15.0`, npm
`11.12.1`, and Python `3.14.4`. Locally it passes 102/102 authored controls,
kills 139/139 direct mutants, and packs exactly 55 files at
`sha-256:d726c2d58882f8a0f606123c9e50ef19bb3957a1a530200e2eb3f959b1d0b6fb`.
Its generated release is
`sha-256:577979ec046ecff0561452dcd678ea308b6e89c5979946b3948b48e496869414`.
Freeze `0d7d60e7c7050845599a521de801d9a25e41ff9c` passed independent
release and behavioral review but is rejected because two current documents
incorrectly described its already committed bytes as still awaiting a
containing commit. These facts therefore do not by themselves make an accepted
release. Corrected freeze
`eb61037bb66c181973b8c9363a612014634ad2e4` has a byte-identical
`protocol/` tree and external release-pin blob. A fresh context-blind
orientation reviewer and a separate exact-delta reviewer returned PASS with
zero P0/P1/material P2. The minimum-trust-kernel release gate is therefore
closed at `eb61037`; the exact release, package, toolchain, counts, and
nonclaims above are the accepted proposal-only artifact boundary. No
execution/read profile, production service, payment, settlement, deployment,
or runtime conformance is authorized.
