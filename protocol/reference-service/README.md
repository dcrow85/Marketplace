# Cairn proposal-foundation reference service

This directory is a deliberately small executable composition of the exact ten
operations in `protocol/operations/registry.json`. It demonstrates the audited
envelope, object, grant, replay, and preparation boundaries. It is not a
production server, authority service, payment rail, shared disclosure ledger, or
conformance implementation.

## Closed operation surface

The service exposes only:

```text
capabilities.get  runtime_binding.get  intent.put  intent.get
data_grant.get    projection.get       object.resolve
action.prepare    action.get           receipt.get
```

`action.prepare` atomically stores the validated ActionProposal, a draft
ActionRecord, and an ActionPreparationReceipt that records
`action_state_transition:false` and `external_effect:false`. It is a
preparation/storage receipt, not a draft-to-prepared action transition. There is
no route or dispatcher for authorize, execute, dispatch, pay, settle, release,
waive, or private continuation delivery.

## Injected trust boundaries

The HTTP adapter has no built-in identity system. `authenticateRequest` must
return an already-authenticated principal, actor, and—on mutations—a stable
server-controlled authority namespace. The namespace must come from the
receiver's authoritative account/tenant mapping; it must never echo an envelope,
header, query parameter, or other caller-selected value. The service compares the
principal and actor with the signed envelope. A runtime-signed request must use a
DataGrant addressed to the exact runtime key, not merely its shared provider.

Private objects carry store-owned access metadata derived from their signed
principal fields. A caller cannot self-sign a grant to another principal's
object. Every successful new grant-covered operation decrements all supplied,
validated grant counters in the same transaction. Idempotent replay authenticates
fresh transport, returns the original operation-bound result, and neither runs
the result factory nor consumes the grant again.

`projection.get` additionally binds the signed request's declared purpose and
intended use to the stored projection, requires its audience to contain the exact
runtime key (or direct principal), and requires one covering DataGrant to carry
all required uses. `object.resolve` cannot return a ScopedProjection.

`createReferenceSeeder` is a trusted import/bootstrap helper, not a network
operation. It accepts only runtime bindings, DataGrants, effect descriptors, and
scoped projections; derives public/private access from the signed object; requires
typed active state for grants; and is insert-only. It cannot overwrite a consumed
grant, fork an object identity, or rebind a runtime key. Production import paths
need their own authenticated administration and audit policy.

## State and lifecycle limits

`MemoryReferenceStores` uses synchronous copy/commit transactions for deterministic
tests and local examples. It is caller-owned and therefore intentionally
inspectable in tests, but it is not safe for multi-process durability. A real
implementation must use authoritative ACL, nonce, idempotency, object-identity,
and grant-state stores with atomic compare-and-swap. The raw stores and seeder are
not returned from the service surface.

ActiveIntent object identity includes `(intent_id, revision)`, so independently
signed revisions can coexist while a byte-different fork at the same revision is
rejected. Intent control-head ordering, activation, supersession CAS, pause,
revocation, and satisfaction events are outside this proposal-foundation service.

Historical receipt/action proofs validate a signature against the key state at
its signing time, allowing later key rotation without erasing the audit trail.
Key status is the closed vocabulary `active | revoked`; unknown values fail in
both live and historical modes. Historical proof does not revive an object's own
expiry: expired intents, projections, grants, and runtime bindings remain expired
on normal reads.

## HTTP boundary

The adapter provides public `GET /cairn/0.1/capabilities` and signed
`POST /cairn/0.1/messages`. It requires the exact protocol version, exact JSON
media type (parameters allowed), matching `Idempotency-Key` for mutations, fatal
UTF-8 decoding, duplicate-member rejection, and a bounded request body. All
responses are `no-store` and carry the protocol profile link. Authentication and
service failures are not mislabeled as malformed JSON. A missing or malformed
resolved signing-key record is reported as service unavailable; a well-formed
key that lacks current authority is denied. Neither falls through to the generic
semantic-error status.

The tests exercise all ten operations plus independent negative controls. The
security-mutant runner makes each material guard fail in isolation and requires
the named regression test to kill it.
