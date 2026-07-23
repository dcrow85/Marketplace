# Cairn Agent Minimum Trust Kernel v0.1

Status: narrowed machine candidate

Machine profile: `cairn-proposal-foundation-v0.1`

Machine boundary: [`protocol/minimum-trust-kernel.json`](protocol/minimum-trust-kernel.json)

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
  `sha-256:d84dd5c2a925575c4889ab51f784cca58bd7c7ec14fcf0ae66dd7d8a6eeff29c`;
- operation-registry hash:
  `sha-256:218e990a8cf2e768e9cda8886001488fb0c37496b3cfa64c21d2d922e4e9075b`;
- ten exact operations;
- two local-state mutations; and
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
9. `action.get`
10. `receipt.get`

Only these local writes exist:

- `intent.put` records the exact principal-signed ActiveIntent. Its authority
  effect is `records_principal_signed_intent_only`.
- `action.prepare` records proposal/preparation state. Its authority effect is
  `none`, and its receipt fixes `external_effect` to `false`.

Neither operation is permission to perform the proposed action.

## 3. What the kernel proves—and does not

The machine checks establish internal consistency of the exact source bundle,
its signed-object rules, its operation boundary, and its named negative
controls. The in-memory reference composition shows that the ten operations can
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
Another agent can:

1. discover the exact kernel capabilities;
2. read a principal's signed intent and permitted projections;
3. resolve the exact objects needed for a proposal;
4. prepare a signed proposal; and
5. return the proposal and no-effect preparation receipt to the principal.

The agent cannot convert familiarity, confidence, urgency, a recommendation, or
a DataGrant into authority. A future consequential action requires a separate,
explicitly designed authority profile.

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
candidate remains in [`protocol/execution/`](protocol/execution/) as
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
[`protocol/minimum-trust-kernel.json`](protocol/minimum-trust-kernel.json).
`npm run check`, the unit suite, and the mutation suite fail if the foundation
hashes drift, the ten-operation surface changes, either local mutation gains
authority, the rejected execution profile is re-admitted, or the non-claims
weaken. `npm run build` remains a deterministic generator; generation alone is
not a release check.

Any expansion requires a new profile name, new machine artifact, frozen commit,
and independent review. It must not silently widen this kernel.
