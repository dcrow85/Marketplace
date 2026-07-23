# Cairn protocol foundation v0.1

This package is the first machine-readable slice of
[`Protocol_Agent_Intent_Interop_v0.1.md`](../Protocol_Agent_Intent_Interop_v0.1.md).
It makes the proposal-only object boundary executable without implying that a
live Cairn service, authority ledger, payment adapter, or conformance profile
already exists.

It is also the active
[minimum trust kernel](docs/Protocol_Agent_Minimum_Trust_Kernel_v0.1.md). The
machine-enforced release boundary is
[`minimum-trust-kernel.json`](minimum-trust-kernel.json): nine exact operations,
two object-store writes, seven explicit disclosure-budget consumers, and no
authority to act.

## What is included

- 17 JSON Schema 2020-12 definitions for the common signed-object primitives,
  envelope, runtime binding, intent, projection, data grant, judgment, effect
  descriptor, action preparation, and agent-continuation objects;
- an operation registry for the proposal-only read/prepare surface;
- deterministic RFC 8785/JCS SHA-256 object hashing;
- Ed25519 verification vectors for the Cairn domain-separated signature input;
- a deterministic content-addressed bundle builder;
- executable admission/consumption validators and mutation-controlled tests for
  authority laundering, effect-ID forks, continuation leakage, schema drift,
  object resolution, replay, and hash/signature behavior; and
- a separately bounded in-memory reference service and HTTP handler for composing
  the exact nine proposal-foundation operations without adding an authority or
  consequential action surface.

The capability response is closed over the exact nine registered operation names
and current bundle hash. `write_object` is likewise closed to `intent.put` of an
exact principal-signed ActiveIntent; it is storage permission, never action
authority.

The registry currently names exactly nine operations. Only `intent.put` and
`action.prepare` create protocol objects/results; the latter stores a draft
ActionRecord and ends at a signed preparation receipt whose schema fixes both
`action_state_transition` and `external_effect` to `false`. Every signed envelope
also consumes replay-nonce state, and every DataGrant-covered operation consumes
disclosure budget as declared in `access_state_effects`. There is deliberately no
authorize, execute, dispatch, payment, release, waiver, disclosure-issuance, or
private continuation-delivery operation.

## What is not included

There is no production server, durable/shared database, reservation ledger,
executor, payment integration, or contract change in this package. The reference
HTTP handler has injected authentication and deterministic in-memory state only;
it is not deployed and does not establish service conformance.
`conformance_claims` is intentionally empty. Passing these tests establishes only
that this source bundle and bounded reference composition are internally
consistent and that the named negative fixtures are rejected.
The typed continuation-reservation state schema plus in-memory acceptance and
one-shot consumption primitives are reference validation controls, not an
authoritative concurrent service. They require
complete current key/controller records and typed authoritative replay,
idempotency, DataGrant-state, and disclosure-reservation stores from the caller.
Idempotency stores must key the canonical two-member namespace/key tuple; joined
delimiter strings are not protocol-compatible.

## Commands

```bash
cd protocol
npm ci
npm run release:verify
```

`npm run build` writes `dist/cairn-protocol-bundle-v0.1.json` and
`dist/cairn-minimum-trust-kernel-v0.1.json` deterministically.
The Python source check rejects duplicate JSON member names before Node parses any
schema or registry file. The minimum-kernel check additionally pins the exact
bundle and registry hashes, operation list, object-store and access-state
effects, conditional BYO prerequisites, rejected execution profile,
prerequisites for expansion, source commitments, package closure, and
non-claims. The release schema closes structure and the exact 53 source names;
the verifier separately recomputes all commitment values and the release
self-hash, and requires a caller-supplied trusted release-hash pin for portable
publisher authenticity.
`release:verify` also packs into a temporary directory, installs from the
included `npm-shrinkwrap.json`, runs the packed package's advertised tests,
rebuilds both artifacts byte-identically, confirms the rejected execution tree
is absent at every path depth, requires the package to contain exactly the 53
committed sources plus two generated artifacts, and requires a second pack to
converge to the same archive hash.

See [`reference-service/README.md`](reference-service/README.md) for the injected
identity/store contract and the explicit non-production boundary.

The separately namespaced Phase 1 supervised-execution research artifact lives
in [`execution/`](execution/). It is
[rejected](execution/REJECTED.md), is not advertised by this package, and is
retained only as falsification evidence. No execution/read profile may re-enter
the release gate before a separately specified signed service observation
primitive survives independent review.

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
become action authority. Continuation objects, the closed authoritative-state
input contract, and their one-shot local validation are defined, but
`continuation.get` is intentionally not advertised until an authoritative
reservation/consumption ledger can make disclosure atomic.
