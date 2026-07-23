# Cairn supervised execution — Phase 1 schema bundle

This package is the first machine-readable translation of
`Protocol_Agent_Execution_Change_Spec_v0.1.md`. It is a separate overlay on the
byte-stable proposal foundation. It does not widen the proposal registry or
reference service.

## Included

- strict JSON Schema 2020-12 objects for connection, execution control,
  compartment, confirmation, mandate v0.3, binding, lineage, and the closed
  execution-chain versions required by the prose design;
- exact frozen resource bounds, typed enumerable transition manifests, a
  bounded-path content-addressed connection-action and receiver-stream maps,
  terminal receiver release plan/completion objects, and both ordinary and
  cancellation one-shot authorization schemas;
- a separately namespaced, read-only Phase 1 operation registry;
- 34 closed operation-specific compatibility envelopes binding protocol,
  execution profile, frozen proposal bundle, execution bundle, operation
  registry, exact operation, and exact request-body family before dispatch;
- location-bound JCS commitments for every request envelope, request body, and
  response schema, plus closed registry metadata for authentication, DataGrant,
  disclosure, authority, idempotency, receipt, and caller-class prerequisites;
- parent-bound private/audit access for transition manifests and enumerable map
  nodes rather than a public object-reference oracle;
- exact audit/control access for sensitive authority and state heads,
  audit-detail access for detailed receipts, and authority-parent ACL inheritance
  for confirmation receipts;
- closed, endpoint-specific generic-read envelopes: the base getter resolves
  only the 12 pinned proposal objects, while policy and receipt getters resolve
  only their exact Phase 1 families; every returned ref and declared sibling
  ref/hash pair is checked against the bound object;
- exact dependency pins to the proposal bundle and registry, shared core
  validator and strict-JSON preflight bytes, a package-local byte-identical core
  whose parity to the frozen shared core is enforced, and an integrity-closed
  package-local runtime dependency tree;
- deterministic JCS bundle generation;
- exact SHA-256 commitments for every authored package source, validator, test,
  mutation control, and build/check script included in the audit candidate;
- structural and cross-object validators for controller derivation, historical
  signature validity, recovery restriction, connection lifecycle, transition
  manifests, capability-specific mandate/binding closure, declared top-level
  and nested sibling ref/hash equality, provider-enforced compartment caps,
  closed control-receipt and lineage-state unions, authorization, reservation,
  gate, redemption, aggregate inline-entry bounds, monotonic lineage fencing,
  complete mandate business-tuple projection, dependency-availability and causal
  chronology, complete gate-request semantics, gate lifetime, exact redemption
  action identity, and redemption head/checkout-dependency projection,
  exact seller-inventory preservation, and prefix-preserving early-terminal
  action state;
- exact connection-event resolution of the signed aggregate-control and
  outstanding-action-index heads, control authorization, joint control receipt,
  scoped leaf, index transition receipt, transaction identity, and service-time
  chronology; each index resolves its exact signed map root and matches its
  derived domain key, count, and entries commitment; exact index, entry,
  transition-receipt, map-root, and bounded ancestor-path node reads invoke the
  same semantic validators without recursively scanning an unbounded trie;
- authoritative GateRequest dependency projection rejects both omitted and
  request-invented reservation, control, grant, business, provider, policy,
  inventory, and checkout dependencies; current heads resolve independently and
  GateResult carries the exact closed 19-check code set;
- connection authorization/state exact reads resolve runtime and authorization
  graphs, enforce current-head authority and validity intervals, and mandate
  validity is contained by both runtime and connection authorization;
- DataGrant state is a first-class signed current-head chain: genesis binds the
  issued grant/count, reads decrement exactly once, pause/resume/revoke/expiry
  advance the revocation nonce, the `expired` state begins at the exact expiry
  boundary, and bindings resolve the exact signed current grant and principal/
  runtime recipient graph rather than trusting a caller-supplied tuple;
- receiver-stream entry keys are derived; slot/trust/future/stream/connection
  dependencies are exact; receiver map transitions carry before/after proofs
  and immutable-frontier checks; authenticated events advance both assignment
  successors and consume exactly one slot, authenticated closure consumes its
  final event before release, and all three terminal causes require exact
  evidence, release plans, identity/trust/stream/connection children, and a
  deterministic completion receipt;
- compartment state now resolves exact typed reservation, economic-atom, and
  confirmed-event map trees; balances, exposure ceilings, and subset roots are
  recomputed from their leaves, while transition receipts bind the exact map
  diff, cause core, manifest projections, semantic atom deltas, confirmed-event
  insertions, money-class projection, closure emptiness, predecessor, asset,
  transaction, and signature chronology;
- request-bound composite action reads that close the exact action, current
  state, binding, commitment, authority branch, lineage, private activity
  detail, authority reservations, and gate chain rather than merely checking
  each embedded object's shape; prepared supervised/cancellation actions remain
  readable before one-shot authority exists, preauthorized reads bind the exact
  mandate business tuple and its issuance confirmation in every preauthorized
  state, and every live/terminal action state admits only its exact lineage-state
  family, activation receipt, and provisional fence; confirmation receipts
  close principal, authority, branch-specific binding, assurance policy,
  verifier, authoritative current-active lifecycle, relying party, challenge,
  presence/verification, freshness, and authority-issuance chronology;
  denied gates remain readable as signed attempts while the current action
  stays `reserved`, never mislabeled `gate_allowed`;
- a frozen domain-separated lineage-activation commitment preimage and golden
  hash vector, activation within every authority/reservation/binding/commitment
  validity window, exact cancellation occurrence binding, economic predecessor
  preservation, action-receipt action-ID/binding/lineage-identity closure, and
  intrinsic semantic validation of every exact object read and resolved receipt
  dependency;
- direct mutation controls for namespace, dependency, authority, target-union,
  limit, connection, chain, compatibility-envelope, registry-metadata,
  package-isolation, and read-only-surface failures. The current suite kills all
  349 declared direct mutants.

## Excluded

There is no authority writer, executor, outbox, provider call, network review,
payment, escrow release, waiver, dispute, UI, server, database, or deployment.
Every registry operation has `mutating:false`, `external_effect:false`, and
`implementation_status:"schema_only"`. Passing the package controls establishes
only deterministic internal consistency for this frozen Phase 1 artifact.

## Commands

```bash
cd protocol/execution
npm test
npm run check
```

`npm run build` writes `dist/cairn-supervised-execution-phase1-v0.1.json` and
`dist/operation-registry-phase1-v0.1.json`. Generated files must not be edited by
hand.
