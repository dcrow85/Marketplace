# Cairn protocol foundation v0.1

This package is the first machine-readable slice of
[`Protocol_Agent_Intent_Interop_v0.1.md`](../Protocol_Agent_Intent_Interop_v0.1.md).
It makes the proposal-only object boundary executable without implying that a
live Cairn service, authority ledger, payment adapter, or conformance profile
already exists.

## What is included

- JSON Schema 2020-12 definitions for the common signed-object primitives,
  envelope, runtime binding, intent, projection, data grant, judgment, effect
  descriptor, action preparation, and agent-continuation objects;
- an operation registry for the proposal-only read/prepare surface;
- deterministic RFC 8785/JCS SHA-256 object hashing;
- Ed25519 verification vectors for the Cairn domain-separated signature input;
- a deterministic content-addressed bundle builder;
- executable admission/consumption validators and mutation-controlled tests for
  authority laundering, effect-ID forks, continuation leakage, schema drift,
  object resolution, replay, and hash/signature behavior.

The registry currently names exactly ten operations. Only `intent.put` and
`action.prepare` are mutations; the latter ends at a signed preparation receipt
whose schema fixes `external_effect` to `false`. There is deliberately no
authorize, execute, dispatch, payment, release, waiver, disclosure-issuance, or
private continuation-delivery operation.

## What is not included

There is no network service, database, reservation ledger, executor, payment
integration, or contract change in this package. `conformance_claims` is
intentionally empty. Passing these tests establishes only that this source bundle
is internally consistent and that the named negative fixtures are rejected.
The in-memory acceptance and one-shot consumption primitives are reference
validation controls, not an authoritative concurrent service. They require
complete current key/controller records and typed authoritative replay,
idempotency, DataGrant-state, and disclosure-reservation stores from the caller.

## Commands

```bash
cd protocol
npm install
npm test
npm run check
```

`npm run build` writes `dist/cairn-protocol-bundle-v0.1.json` deterministically.
The Python source check rejects duplicate JSON member names before Node parses any
schema or registry file.

## Source-of-truth rule

The files under `schemas/`, `operations/`, and `vectors/` are authoritative for
this foundation slice. Generated files under `dist/` must never be hand-edited.
An implementation must validate an instance against its exact `$id`, recompute
its object hash using the schema's `x-cairn-*` annotations, resolve and verify its
current signer, and preserve the protocol's `not_claiming` boundary. Signature
profile, key ID, and signing time are authenticated hash material; only
`signed_hash` and proof bytes are excluded to break the signing cycle.

`operations/registry.json` also names the exact authorization prerequisite for
each operation, including its DataGrant purpose and use. A DataGrant does not
become action authority. Continuation objects and their one-shot validation are
defined, but `continuation.get` is intentionally not advertised until an
authoritative reservation/consumption ledger can make disclosure atomic.
