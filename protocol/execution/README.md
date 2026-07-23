# Cairn supervised execution — Phase 1 schema bundle

This package is the first machine-readable translation of
`Protocol_Agent_Execution_Change_Spec_v0.1.md`. It is a separate overlay on the
byte-stable proposal foundation. It does not widen the proposal registry or
reference service.

## Included

- 50 strict JSON Schema 2020-12 documents: 45 closed signed-object schemas, one
  content-addressed enumerable-map node schema, and four common/bundle/registry
  support documents;
- a separately namespaced registry of 29 schema-only read operations with zero
  mutation, external-effect, or authority-effect rows;
- closed compatibility envelopes binding protocol version, execution profile,
  frozen proposal bundle, execution bundle, registry, exact operation, and
  request-body family before dispatch;
- exact dependency pins, deterministic JCS generation, strict I-JSON source
  checking, authored-source commitments, an exact lockfile, and a disposable
  `npm ci --ignore-scripts` replay boundary. This does not attest an arbitrary
  pre-existing installed dependency tree;
- structurally deny-only `GateResult`; no `RedemptionReceipt` schema; no
  `gate_allowed` or post-redemption ActionState/ActionReceipt branch; empty-only
  ActionReceipt disclosure/obligation/checkout effects; null-only receiver and
  economic-exposure fields; and structurally forbidden recovery-bearing
  control branches;
- conditional structural and cross-object checks for signed connection,
  execution-control, DataGrant, mandate, binding, lineage, receiver, activity,
  confirmation, and action evidence;
- intrinsic namespace, aggregate-control, and action-state predecessor checks;
  a shared joint connection/control pair check; and one causal chronology for
  authorization, namespace, predecessor, successor, commit, and receipt times;
- historical signature and current-head evaluation parameterized by separate
  proof, semantic, and evidence-snapshot instants. A signature key is resolved
  at `proof.signed_at`; current eligibility is resolved at the object's semantic
  instant; and a historical read rejects proof created after its authenticated
  retrieval snapshot. A later revocation or head advance does not rewrite
  earlier evidence. Action reads use signed `ExecutionActionView.assembled_at`
  (which must equal the response `retrieved_at`), gate evidence uses
  `evaluated_at`, BindingSet captured-head currentness uses `created_at`, and
  joint receipts use `committed_at`. Missing historical key, policy, or head
  resolution fails closed without a live-state fallback. Historical mode and
  peer-recursion provenance are private object-identity capabilities that a
  caller field, symbol, or Proxy cannot forge;
- activity list, summary, and detail are privacy-minimized projections over
  only prepared, authorized, reserved, cancelled, definitive-failure, and
  quarantined states. Activity pages carry an authenticated retrieval snapshot,
  deterministic cursor, principal and filter checks, current-head checks, and
  signed bounded action/binding/lineage dependencies. They cannot disclose gate
  eligibility, receiver confirmation/finality, spend state, or an effect result;
- action-state and action-receipt chronology independently orders predecessor
  update/signature, successor update/signature, commit, and receipt signature,
  while permitting same-second equality at the profile precision;
- authenticated receiver closure binds the exact closure evidence reference,
  authority transaction, commit instant, terminal release plan, and receiver
  transition; and
- 19 closed gate check codes. Ten, including `EXECUTION_CONTROLS`, are
  unsupported and always deny until their complete authenticated evaluators
  exist;
- empty-only outbound disclosure bindings and empty-only external accounting
  map semantics. Nonempty disclosures, reservation/economic/confirmed-event
  leaves, external protection attestations, and financial external truth are
  explicitly unavailable in this phase;
- typed enumerable maps and transition manifests retained as bounded internal
  dependency vocabulary. Phase 1 exposes no standalone map or manifest getter;
- `LineageProvisionalTerminalReceipt` and
  `CompartmentStateTransitionReceipt` retained as future structural vocabulary
  but excluded from the generic `receipt.get` response family; and
- the frozen proposal baseline remains a separate artifact and is not widened.

The removed Phase-1 getters are:

- `execution.transition_manifest.get`;
- `execution.enumerable_map.get`;
- `execution.compartment.get`;
- `execution.compartment_state.get`; and
- `execution.compartment_state_transition_receipt.get`.

Caller-supplied object resolvers, key maps, current-head callbacks, role
callbacks, Boolean ACL flags, and external-verifier callbacks are conditional
inputs only. They never establish authenticated authority. High-level
authenticated reads, gates, composite action validation, live cancellation,
and joint-control currentness return
`phase1_authenticated_resolution_unsupported` until a separately frozen,
locally verified rooted-proof profile exists. Low-level helpers prove only
structure, cryptographic math against supplied material, and conditional graph
consistency; they are not authorizers.

Exact freeze `dd12269c5a5dd8b2d6e69a6e579d9bc48a16f373` is rejected. The
post-Round-41 replacement passes 32/32 authored controls and kills 480/480
exact-once direct mutants locally. These results describe the current candidate
bytes; they are not closure until the clean-install replay passes, the
replacement is frozen in a containing commit, and fresh blind and informed
reviewers reproduce the result.

## Excluded

There is no authority writer, executor, outbox, provider call, network review,
payment, escrow release, waiver, dispute, UI, server, database, or deployment.
Every registry operation has `mutating:false`, `external_effect:false`, and
`implementation_status:"schema_only"`. Passing the package controls establishes
only deterministic structural and conditional consistency for this Phase 1
artifact. It does not authenticate caller-supplied resolver state. There is no
valid Phase-1 `allow`, gate-allowed/post-redemption action transition,
redemption, recovery-control, nonempty disclosure, external-accounting,
external-protection, or financial-execution path. A
reference service remains blocked until the narrowed artifact is frozen in its
containing commit and passes fresh blind and informed verification.

## Commands

```bash
cd protocol/execution
npm test
npm run check
npm run test:mutations
```

`npm run build` writes `dist/cairn-supervised-execution-phase1-v0.1.json` and
`dist/operation-registry-phase1-v0.1.json`. Generated files must not be edited by
hand.
