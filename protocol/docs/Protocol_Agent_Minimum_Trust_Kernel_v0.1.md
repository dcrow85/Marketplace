# Cairn Agent Minimum Trust Kernel v0.1

Status: narrowed machine candidate

Machine profile: `cairn-proposal-foundation-v0.1`

Machine boundary: [`minimum-trust-kernel.json`](../minimum-trust-kernel.json)

## 1. Decision

Cairn's first agentic release surface is proposal-only.

The protocol may preserve a principal-signed intent, disclose bounded local
objects under a DataGrant, and let an agent prepare a proposal. It does not let
that agent—or the reference composition—authorize, execute, dispatch, pay,
settle, release, or waive anything.

This is the smallest useful protocol promise:

> Cairn can make a person's signed intent portable and legible to a replaceable
> agent without turning that intent, an inference, or a DataGrant into authority
> to act.

## 2. Exact machine surface

The active kernel is the deterministic `cairn-proposal-foundation-v0.1` bundle:

- bundle hash:
  `sha-256:9f5caa6b0819836e1d70c4f79a8869d10936a2a55acabc2a358aec569efe36cb`;
- operation-registry hash:
  `sha-256:403be425bd3708903e489147f133d0ca5a55c4aa279839101ad1550bd2e2d7fe`;
- nine exact operations;
- two object-store writes with every access-state effect separately declared;
  and
- no conformance claim.

The exact operations are:

1. `capabilities.get`
2. `runtime_binding.get`
3. `intent.put`
4. `intent.get`
5. `data_grant.get`
6. `projection.get`
7. `object.resolve`
8. `action.prepare`
9. `receipt.get`

Only these operations create protocol objects/results:

- `intent.put` records the exact principal-signed ActiveIntent. Its authority
  effect is `records_principal_signed_intent_only`.
- `action.prepare` stores the proposal, a draft ActionRecord, and a preparation
  receipt. Its authority effect is `none`; the receipt records
  `action_state_transition:false` and fixes `external_effect` to `false`.

Neither operation is permission to perform the proposed action.

`object_store_mutating:false` does not mean side-effect-free. Every accepted
signed envelope consumes replay-nonce state. Every successful DataGrant-covered
operation—including the five private reads—atomically consumes disclosure budget.
The two object-store writes also write idempotency records. These effects are
closed per operation in the machine manifest.

## 3. What the kernel proves—and does not

The machine checks establish internal consistency of the exact source bundle,
its signed-object rules, its operation boundary, and its named negative
controls. The in-memory reference composition shows that the nine operations can
be composed without adding an execution surface.

They do not establish:

- a production or conforming service;
- authoritative service observations;
- durable or serializable shared state;
- an authorization or executor;
- payment, escrow, settlement, release, or waiver behavior;
- an authenticated activity feed or paginated service view;
- generic semantic correctness for arbitrary returned object families; or
- safety of a future execution profile.

## 4. Bring-your-own-agent contract

Anko is one possible reader and proposer, not a privileged protocol actor.
Given all six host-supplied preconditions below—and only where an available
service implements the exact pinned bundle; this is not a deployment, discovery,
or conformance claim—another agent can use the proposal-foundation surface:

- a pre-provisioned authenticated runtime binding;
- principal-bound DataGrants and active grant state for that exact runtime;
- an authenticated handoff of exact ObjectRefs and HTTPS retrieval URIs;
- an available signing-key resolution profile;
- an authenticated runtime signing capability bound to the pre-provisioned
  runtime key, without requiring transfer of its raw private key; and
- an available authenticated proposal-foundation service endpoint whose
  transport profile and capability response bind the exact kernel profile and
  bundle hash.

The agent can then:

1. discover the exact kernel capabilities;
2. read a principal's signed intent and permitted projections;
3. resolve the exact objects needed for a proposal;
4. prepare a signed proposal; and
5. return the proposal and no-effect preparation receipt to the principal.

The agent cannot convert familiarity, confidence, urgency, a recommendation, or
a DataGrant into authority. A future consequential action requires a separate,
explicitly designed authority profile.

The envelope and object formats are interface-agnostic; agent onboarding is not.
This kernel does not standardize runtime provisioning, grant issuance, object-ref
discovery, or continuation delivery. `createReferenceSeeder` is a trusted local
bootstrap helper, not an interoperability operation. Host-specific authenticated
provisioning is still required to replace an agent.

`projection.get` is purpose-bound: its signed request states the projection
purpose and intended use; the projection must admit the exact runtime (or direct
principal), that purpose, local reading, and the intended use; and one covering
DataGrant must carry every required use. Generic `object.resolve` cannot return a
ScopedProjection or ActionRecord: projections require the purpose-bound read
operation, and ActionRecords are not readable in this kernel. A declared purpose
is attributable intent, not proof of the recipient's later behavior. A projection carries its
bounded disclosed values inside the signed payload, binds every output path to an
exact source ObjectRef and source path, and forbids overlap between disclosed and
redacted paths. That provenance does not independently verify the source value.

## 5. Rejected execution candidate

The 29-operation `cairn-supervised-execution-v0.1` read candidate is rejected as
a release target. Its freezes passed substantial local controls but independent
review continued to find material gaps in:

- authenticated retrieval time;
- action/state/lineage and predecessor/receipt closure;
- future-effective activity heads;
- generic object semantic dispatch;
- cursor and cross-page snapshot authentication; and
- structural context-provenance enforcement.

Those findings are not papered over by removing operations one at a time. The
candidate remains in [`execution/`](../execution/) as
falsification evidence and vocabulary research. It is not an active profile,
dependency, service target, or conformance claim.

## 6. Gate for any next profile

No execution/read profile may enter the release gate until Cairn defines and
independently audits a signed service observation primitive. At minimum, that
primitive must authenticate:

- the observing service and key profile;
- `retrieved_at` and the effective snapshot;
- the exact query, principal scope, filters, ordering, and page boundary;
- the returned object refs/hashes and relevant current heads;
- predecessor, receipt, and lineage dependencies where claimed; and
- cross-page continuity without trusting an opaque caller cursor.

The machine manifest names this prerequisite
`signed_service_read_snapshot`. It is a prerequisite, not an implemented
feature.

## 7. Release rule

The active release boundary is
[`minimum-trust-kernel.json`](../minimum-trust-kernel.json).
`npm run check`, the unit suite, and the mutation suite fail if the foundation
hashes drift, the nine-operation surface changes, either local mutation gains
authority, the rejected execution profile is re-admitted, or the non-claims
weaken. `npm run build` remains a deterministic generator; generation alone is
not a release check.

The generated
`protocol/dist/cairn-minimum-trust-kernel-v0.1.json` content-addresses the closed
manifest, foundation hashes, foundation bundle bytes, active source tree,
reference composition, tests, mutants, release schemas, canonical kernel prose,
and execution rejection markers. The package allowlist and runtime source check
exclude the rejected execution tree.

Any expansion requires a new profile name, new machine artifact, frozen commit,
and independent review. It must not silently widen this kernel.
