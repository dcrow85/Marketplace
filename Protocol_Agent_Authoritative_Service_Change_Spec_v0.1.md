# Cairn authoritative store and signed service-observation change spec v0.1

**Status:** four cold-audit rounds rejected frozen candidates `b86ceae`,
`8c06892`, `3394747`, and `d945532`; every P1/material-P2 finding is accepted
for remediation. This revised local design is not independently re-audited,
implemented, or conforming.

**Depends on:** the independently audited proposal-only BYO checkpoint at
`5216424` and the unchanged nine-operation kernel tree
`85dd8250adb20e6e954b914e11bfd13b9d9d9896`

**Change boundary:** external reference composition only. This document does not
add a protocol operation or change `protocol/`.

## 1. The plain-English result

Cairn's current reference service uses one in-memory copy of its state. That is
useful for proving rules, but it cannot prove what happens when two agents or two
server processes act at the same time.

The next reference must make four facts mechanically true:

1. one signed request nonce can be accepted only once;
2. one idempotency key cannot mean two different operations;
3. one remaining DataGrant disclosure cannot be consumed twice; and
4. a signed read receipt identifies the exact service, request, result, and
   committed snapshot that produced it.

This still gives no agent authority to buy, sell, pay, settle, release, or waive.
It makes the existing proposal-only service's memory durable, shared, and
inspectable.

## 2. Frozen constraints

The implementation MUST preserve all of these boundaries:

- the operation registry remains exactly the existing nine operations;
- `intent.put` still records only a principal-signed intent;
- `action.prepare` still creates only a draft, no-transition, no-effect result;
- no authorize, execute, dispatch, pay, settle, release, waive, issue, or private
  continuation-delivery route is introduced;
- the active `protocol/` source and generated release tree remain byte-identical;
- the durable store and observation primitive live outside `protocol/` until a
  separately audited future profile explicitly admits them;
- the existing request, object, signature, DataGrant, and response schemas remain
  the validation authority for the nine operations; and
- no store row, service signature, hash, or observation proves a card's
  authenticity, condition, custody, delivery, legal identity, or external effect.

## 3. Reference and production targets

The first executable target SHOULD use SQLite through the runtime's built-in
driver. It is a deterministic, file-backed reference for local multi-process
tests, not the production database recommendation.

The production mapping SHOULD use PostgreSQL or another database with equivalent
serializable transactions, uniqueness constraints, durable commits, row-level
compare-and-swap, authenticated backups, and an operator-owned key service.

Both mappings MUST implement the same abstract transaction contract below. A
result passing in SQLite does not by itself claim the PostgreSQL mapping passes.

## 4. Abstract transaction contract

### 4.1 One envelope, one serializable transaction

Every signed operation runs in one database transaction at serializable
isolation. The outer wrapper owns the store adapter. That adapter begins the
transaction and validates any existing rich idempotency row before it invokes
the frozen transaction callback. The transaction:

1. reads the service clock once;
2. validates the receiver-private idempotency row, its version/history, and its
   owner-scope-to-global mapping when the raw lookup finds one;
3. resolves the exact current runtime, object, ACL, grant, nonce, and idempotency
   state required by the operation;
4. validates the envelope and operation against that single snapshot;
5. reserves the nonce;
6. creates or resolves the exact idempotent result where applicable;
7. applies object and grant-counter changes;
8. allocates the next global internal commit sequence and the next owner-scoped
   sequence;
9. materializes versioned operational rows and computes the exact non-recursive
   owner-scoped state commitment;
10. constructs and signs the service observation from those staged facts;
11. persists the result, observation, version rows, and append-only commit
    record; and
12. commits all changes together or rolls all of them back.

The adapter preserves the frozen callback's accepted-envelope semantics:

- rich-row self/history/owner mismatch discovered by the adapter preflight:
  do not invoke the frozen callback, roll back completely, and return a
  wrapper-origin failure with `kernel:null`;
- pre-admission rejection or callback `commit:false`: complete rollback and a
  non-observed failure carrying the exact callback result;
- callback `commit:true` with a 2xx result: commit the full success state and a
  success observation;
- callback `commit:true` with a non-2xx result: commit an `accepted_failure`
  only when the wrapper can independently reconstruct a complete, exact
  dependency/version history and sign an honest observation; that branch
  commits exactly the newly accepted nonce, owner/global sequence,
  dependency/version records, commit rows, and one private signed observation,
  with no new object, idempotency row, grant decrement, runtime binding,
  DataGrant, effect descriptor, or validation key;
- callback `commit:true` whose referenced result object, canonical bytes,
  schema-derived identity, URI, or ACL cannot be reconstructed exactly:
  preserve the callback's raw result in `kernel`, report
  `authoritative_integrity_invalid` separately as an observation-stage wrapper
  failure, and roll the whole composite transaction back; and
- signer, observation, persistence, or database commit-call failure: complete
  rollback because no verifiable commit artifact can be completed; if the
  callback already returned, preserve that exact result in `kernel` and report
  the infrastructure problem separately in `wrapper_failure`.

The wrapper never rewrites, relabels, or replaces a frozen callback result.
A rich-row mismatch is distinguished from a legitimate new request whose
fingerprint differs: a coherent stored row plus a changed request reaches the
frozen callback and remains its exact `idempotency_conflict`.

Grant-consumption failure remains callback `commit:false` and rolls back.
Corrupt replay-result and post-admission read-result failures can mutate the
frozen transaction draft, including staging a nonce, but the outer composite
transaction commits none of that draft because it cannot produce a truthful
root and observation. Database lock/serialization failures follow §4.5 and
commit nothing if retries exhaust.

### 4.2 Accepted reads are state changes

A private read is not transactionally read-only. On a newly accepted private
read, nonce reservation, DataGrant disclosure decrement, signed observation,
and commit sequence advance MUST be one atomic commit.

Enveloped `capabilities.get` and `runtime_binding.get` still reserve the signed
envelope nonce. They do not consume a DataGrant. Their response bodies may be
public, but their observations remain private because the request metadata names
an actor/runtime and exposes activity timing.

The existing transport-native unsigned `GET /cairn/0.1/capabilities` is outside
this observation contract and creates no nonce, observation, or commit.

### 4.3 Idempotent mutation replay

For `intent.put` and `action.prepare`, the structural key is exactly:

```text
JCS([authority_namespace, idempotency_key])
```

The authoritative namespace comes only from the receiver's authenticated
account/tenant mapping.

A retry uses a fresh message ID, nonce, timestamps, and signature while retaining
the same structural key and operation fingerprint.

- same key + same fingerprint: reserve the fresh nonce, return the originally
  stored operation-bound result, do not rebuild objects, do not decrement a
  grant again, and create a new replay observation for this envelope and commit;
- same key + different fingerprint: return `idempotency_conflict` and commit
  nothing; and
- internally corrupt, missing-history, wrong-operation, or wrong-owner rich row:
  wrapper preflight fails before the frozen callback, commits nothing, and
  returns `idempotency_integrity_invalid`; and
- a coherent row whose referenced result object, canonical identity binding,
  URI, or ACL is missing/corrupt: the frozen callback stages the fresh nonce and
  returns `commit:true`/`idempotency_result_unavailable`, but the wrapper cannot
  derive an honest dependency root; it therefore returns the raw kernel failure
  plus `authoritative_integrity_invalid` and rolls the composite transaction
  back with no nonce, sequence, dependency, observation, or repository delta.

The wrapper compares a stored fingerprint with the original observation/history
to establish row integrity. It does not compare that fingerprint with the new
request during rich-row preflight; the unchanged frozen callback owns that
request-conflict decision.

### 4.4 Commit ordering

The database allocates a global `commit_sequence` inside the transaction with no
gaps from rolled-back work. It is operator-private because exposing a global
counter/root would leak cross-principal activity.

Each observation instead records an owner-scoped sequence and root:

- `scope_sequence_before`: the latest committed sequence for the signed
  observation owner;
- `scope_sequence_after`: the next sequence for that owner; and
- `scope_state_commitment_after`: the deterministic commitment to the exact
  operational read/write dependency set observed for that owner in this
  transaction after the staged change.

The commitment preimage is the domain-separated JCS array:

```text
[
  "cairn-reference-owner-state-v0.1",
  service_id,
  store_id,
  owner_kind,
  owner_id,
  scope_sequence_after,
  [
    [table_name, structural_key, canonical_row_hash],
    ...
  ]
]
```

Rows sort by UTF-8 table name and then UTF-8 structural key. The exact included
tables are `objects`, `runtime_bindings`, `data_grants`, `effect_descriptors`,
`validation_keys`, `grant_state`, `used_nonces`, and the wrapper-integrity
idempotency-record projection. Membership is every row the kernel or wrapper
validation/result path materially read or wrote for this accepted transaction,
including public runtime bindings and every resolved signature key; unrelated
rows are excluded. Instrumented store/resolver access records this closed
dependency set, and the drill fails on an untracked read.

The committed row bytes use these closed owner-visible column projections:

| table | committed columns |
|---|---|
| `objects` | ref, schema identity, exact derived identity key, canonical object hash, URI, visibility, principal, owner scope sequence |
| `runtime_bindings` | runtime key ID, ref |
| `data_grants` | grant ref |
| `effect_descriptors` | descriptor ref |
| `validation_keys` | key ID, controller, type, public key, status, validity, revocation time, profile revision |
| `grant_state` | grant ref, status, revocation nonce, remaining disclosures, state version, owner scope sequence |
| `used_nonces` | nonce, envelope hash, operation, owner, owner scope sequence |
| `idempotency_records` | opaque structural-key commitment, operation/fingerprint, principal, actor, runtime key, result ref/hash, origin and creation owner-scope sequences |

Global sequences, global roots, observation/commit refs, signatures, raw
authentication evidence, raw authority namespace, and raw idempotency key never
enter these row bytes. Idempotency origin/creation global sequences remain only
in the operator-private durable row and are cross-checked through
`scope_commits(owner, scope_sequence) -> global_commit_sequence`; they are
excluded from every owner-visible projection and root. Consequently, inserting
any number of unrelated tenants' commits cannot change an otherwise identical
owner projection/root input.

The machine schema at
`simulations/authoritative-service/authoritative-service.schema.json#/$defs/operationalRowProjection`
fixes every projection exactly. For a present row,
`canonical_row_bytes = UTF8(JCS(operationalRowProjection))` and
`canonical_row_hash = SHA-256(canonical_row_bytes)`. A present alias dependency
uses that base-row hash; an absent alias uses the domain-separated sentinel in
§5.9. No implementation-defined column, null omission, timestamp, sequence, or
key spelling is allowed.

The commitment is a transaction-scope root, not a commitment to all tenant or
global state. It explicitly excludes observation bytes/signatures/refs, service
commit rows, scope-commit rows, key-profile bytes, authentication evidence, and
raw idempotency namespace/key columns. Therefore it has no self-reference.
Every included row has an append-only version sufficient for the operator-side
verifier to reconstruct the root at the internal global sequence mapped from the
signed opaque snapshot ID and owner scope sequence.

### 4.5 Database durability and bounded retry

The SQLite reference pins:

```text
PRAGMA journal_mode = WAL
PRAGMA synchronous = FULL
PRAGMA foreign_keys = ON
PRAGMA trusted_schema = OFF
PRAGMA busy_timeout = 5000
PRAGMA locking_mode = NORMAL
BEGIN IMMEDIATE
```

It retries `SQLITE_BUSY`/`SQLITE_LOCKED` from the transaction start for at most
three attempts and only while the signed envelope remains current. After a
competing transaction commits, the retry reloads all rows and must reach the
semantic result (`nonce_replay`, `idempotency_conflict`, or exhausted grant)
rather than use stale process memory. Exhaustion returns service unavailable
with no state change.

A future PostgreSQL mapping must restart SQLSTATE `40001`/`40P01` transactions
from validation, at most five times and only while the envelope remains current.
The controlled race fixtures MUST provide enough lock time for the loser to
reach the required semantic result. Production overload may still exhaust the
bounded retry and return service unavailable without state change.

## 5. Authoritative store model

All textual structural keys use JCS arrays. Delimiter-joined compound keys are
forbidden.

The base-row key functions are closed:

| table | exact structural key |
|---|---|
| `objects` | `JCS([schema, object_id, object_hash])` |
| `runtime_bindings` | `JCS([runtime_key_id])` |
| `data_grants` | `JCS([grant_ref_key])` |
| `effect_descriptors` | `JCS([effect_ref_key])` |
| `validation_keys` | `JCS([key_id])` |
| `grant_state` | `JCS([grant_ref_key])` |
| `used_nonces` | `JCS([nonce])` |
| `idempotency_records` database lookup | `JCS([authority_namespace, idempotency_key])` |
| `idempotency_records` committed/versioned projection | `JCS([structural_key_commitment])` |

The raw authority namespace therefore participates in the receiver-private
database key. Its owner-visible opaque key is exactly:

```text
structural_key_commitment =
  HMAC-SHA-256(
    store_projection_secret,
    UTF8(JCS([
      "cairn-idempotency-row-key-v0.1",
      store_id,
      database_lookup_key
    ]))
  )
```

The sealed store owns a random 256-bit `store_projection_secret`; only its
commitment is in genesis. Neither the projection's top-level
`structural_key` nor its columns, dependency entry, canonical bytes, or history
contains the raw namespace/idempotency key, and a caller cannot test guessed
raw tuples without that secret. No commitment is accepted as a substitute input
to the frozen validator.

### 5.1 `service_meta`

One row per store:

```text
store_id                     stable random identifier
profile                      cairn-proposal-foundation-v0.1
bundle_hash                  exact active bundle hash
commit_sequence              nonnegative integer
genesis_manifest_hash        exact sealed bootstrap manifest
genesis_state_root           exact sequence-zero operational root
private_projection_key_commitment
created_at                   service time
```

The profile and bundle hash are immutable for that store. Opening a store under a
different profile or bundle fails closed.

### 5.2 Sealed genesis import

The trusted local bootstrap is one atomic sequence-zero import, not an ordinary
service operation. A closed `GenesisManifest` commits the runtime bindings,
DataGrants and initial counters, effect descriptors, scoped projections, service
key profile, complete validation-key resolver manifest/history,
store/profile/bundle, the private projection-key commitment, and canonical
object/ACL bindings needed by the drill.

The store cannot serve requests until genesis is sealed. Exact duplicate import
returns the existing genesis result. A different manifest, partial import,
concurrent fork, or later seeder write fails and changes nothing.

Genesis is global-only:

- one `service_commits` row exists at global sequence zero with a null
  observation ref;
- operational versions begin at global sequence zero;
- no owner `scope_commits` row exists at sequence zero;
- every owner's first observed operation uses
  `scope_sequence_before:0`, `scope_sequence_after:1`; and
- later owner ancestry begins at that first scope row.

The genesis root preimage is:

```text
[
  "cairn-reference-genesis-v0.1",
  store_id,
  profile,
  bundle_hash,
  service_key_profile_hash,
  validation_key_manifest_hash,
  private_projection_key_commitment,
  sorted([table_name, structural_key, canonical_row_hash])
]
```

The sealed genesis adapter holds one database transaction open around all
existing seeder callback calls and commits only after the full manifest/root
matches. Runtime onboarding, grant issuance, and production administration
remain nonclaims.

### 5.3 `objects`

```text
ref_key                      PK = JCS([schema, object_id, object_hash])
schema
object_id
object_hash
identity_key                 mandatory unique JCS identity tuple
canonical_object_bytes       exact UTF-8 JCS bytes
retrieval_uri                unique
visibility                   public | private
principal_id                 null iff public
created_global_commit_sequence
created_scope_sequence
```

`identity_key` is derived from `canonical_object_bytes`, never trusted as an
independent projected string. The verifier resolves the frozen schema's
`x-cairn-object-id-pointer` against the canonical value. For
`cairn.active_intent.v0.1` the exact tuple is
`JCS([schema, value_at_id_pointer, revision])`; for every admitted family the
schema-defined immutable identity tuple is re-derived. The primary ref, object
hash, identity alias, URI alias, and ACL alias must all resolve to the same
canonical bytes and row version.

Required constraints:

- `(schema, object_id, object_hash)` is unique;
- every stored object identity is
  `JCS([schema, valueAtPointer(object, schema["x-cairn-object-id-pointer"])])`;
- ActiveIntent alone appends its revision as the third tuple member;
- no stored object family may use a null/empty identity;
- an occupied `identity_key` cannot point to byte-different content;
- a `ref_key` cannot be rebound to another URI, ACL, or object;
- canonical bytes re-hash to `object_hash`; and
- access metadata is receiver-derived, never caller supplied.

### 5.4 Typed object indexes

The following indexes point only to existing `objects.ref_key` rows:

```text
runtime_bindings(runtime_key_id PK, ref_key UNIQUE)
data_grants(grant_ref_key PK)
effect_descriptors(effect_ref_key PK)
```

A runtime key cannot be rebound. Typed indexes cannot change an object's ACL or
canonical bytes.

### 5.5 `validation_keys`

Every key the frozen `keyResolver` may return is authoritative/versioned:

```text
key_id                       PK
controller
key_type                     Ed25519
public_key
status                       active | revoked
not_before
expires_at                    required finite protocol timestamp
revocation_time              null iff never revoked
profile_revision
```

The genesis `ValidationKeyManifest` names every principal, provider, runtime,
object issuer, and service key used by the fixture. A
`TransactionalKeyResolver` is captured by the frozen service constructor, but
its `get(key_id)` works only inside the private transaction context: it loads the
version visible in that transaction, records the dependency, and fails outside
context. Every process loads the same manifest hash from the database.

Key rotation/revocation inserts a new version in later profiles; Phase B itself
uses sealed deterministic fixture history. Caller-supplied key records are never
accepted. Every key array has unique IDs and is strictly UTF-8 sorted by key ID;
public keys/signatures use the frozen canonical base64url formats and key IDs
use URI-reference syntax. Validation manifest keys have required finite expiry
and the frozen lifecycle fields.

### 5.6 `grant_state`

```text
grant_ref_key                PK/FK to data_grants
status                       active | revoked
revocation_nonce             integer
remaining_disclosures        integer >= 0
state_version                integer >= 0
updated_global_commit_sequence
updated_scope_sequence
```

Consumption is a compare-and-swap:

```text
status = active
AND revocation_nonce = signed_grant.revocation_nonce
AND remaining_disclosures > 0
AND state_version = observed_state_version
```

Success decrements exactly once and increments `state_version`. Every grant
covering an operation is checked and changed in the same transaction. If any
grant fails, none are changed.

### 5.7 `used_nonces`

```text
nonce                        PK
envelope_hash                exact accepted envelope
operation_name
global_commit_sequence
scope_sequence
owner_kind
owner_id
```

The current kernel treats a nonce as service-global. The durable reference MUST
preserve that exact rule rather than quietly weakening it to a per-runtime nonce.

### 5.8 `idempotency_records`

```text
structural_key               PK = JCS([authority_namespace, idempotency_key])
authority_namespace
idempotency_key
operation_name
operation_fingerprint
principal_id
actor_id
runtime_key_id               nullable
result_ref_key
kernel_result_hash
origin_global_commit_sequence
origin_scope_sequence
created_global_commit_sequence
created_scope_sequence
```

`operation_name` is exactly `intent.put | action.prepare`; no read or
consequential name is admitted to this table.
`structural_key_commitment` is exactly the store-keyed HMAC defined at the start
of §5; the committed projection's top-level structural key is
`JCS([structural_key_commitment])`, not the receiver-private lookup key.
`kernel_result_hash` is exactly the canonical frozen local result hash defined
in §7. The full
operation, owner/runtime, result, hash, and origin/creation owner-scope sequence
projection is versioned and dependency-bound whenever the wrapper decides
whether a replay is safe. The global sequences, `authority_namespace`, and
`idempotency_key` remain receiver/operator-private raw columns. The wrapper
validates the two global columns against the private `scope_commits` mapping
before invoking the frozen callback, but none enters an owner root.

The row is insert-only. A replay may read it but never rewrite its fingerprint,
operation, owner, result, response, or origin sequence.

The frozen validator never sees this richer row. At transaction load, the adapter
projects exactly:

```json
{"fingerprint":"sha-256:<hex>","result_ref":{ "...": "ObjectRef" }}
```

into `draft.idempotencyRecords`. On a new validator write, the adapter accepts
only those two closed fields, combines them atomically with receiver-owned
request/auth/result metadata, and inserts the durable row. A validator replay
cannot erase or rewrite the richer columns. The wrapper separately validates
the full integrity projection before it invokes the frozen callback. A rich-row
mismatch therefore has zero delta and `kernel:null`. If a coherent row reaches
the unchanged frozen replay path but its result object, identity, URI, or ACL
cannot be reconstructed, the raw callback failure is preserved while the outer
composite transaction rolls back; no signed observation is invented from
unreconstructible state.

### 5.9 Version and commit history

`operational_state_versions` is operator-private and append-only:

```text
table_name
structural_key
visibility
owner_kind                   public | principal | actor | service
owner_id                     "*" only when public, otherwise nonempty
valid_from_global_sequence
canonical_row_bytes
canonical_row_hash
PK(table_name, structural_key, valid_from_global_sequence)
```

An update inserts the next version and never edits the prior version.
Reconstruction selects the row with the greatest `valid_from_global_sequence`
not exceeding the internal global sequence named by `scope_commits`. The
verifier compares the exact closed inventory: an omitted, duplicate, or extra
operational version, dependency row/commit, service commit, scope commit,
observation row, or envelope index fails even if every expected row is also
present. Canonical object bytes independently re-derive every object ref and
identity alias; a self-consistent but false projected identity fails.

`service_commits` is operator-private and append-only:

```text
global_commit_sequence        PK
previous_global_sequence
transaction_kind              genesis | service_operation | replay
committed_at
observation_ref_key           null only for global genesis row
```

`scope_commits` is append-only:

```text
owner_kind
owner_id
scope_sequence                PK within owner
previous_scope_sequence
global_commit_sequence        UNIQUE
scope_state_commitment_after
dependency_set_commitment
snapshot_id                   unique opaque identifier
observation_ref_key
```

`transaction_dependencies(global_commit_sequence, table_name, structural_key,
access_kind)` is append-only and is populated only by instrumented store reads
and writes. Its closed sorted manifest hashes to `dependency_set_commitment`.

The frozen in-memory names map to authoritative rows exactly:

| frozen access | authoritative source | exact `index_name` |
|---|---|---|
| `objectsByRef` | `objects` primary ref index | `primary_ref` |
| `refsByIdentity` | `objects.identity_key` unique index | `identity_key` |
| `urisByRef` | `objects.retrieval_uri` projection | `uri_by_ref` |
| `accessByRef` | `objects` visibility/principal projection | `access_by_ref` |
| `runtimeBindingsByKey` | `runtime_bindings` | `runtime_key_id` |
| `dataGrantsByRef` | `data_grants` joined to `objects` | `grant_ref` |
| `grantStatesByRef` | `grant_state` | `grant_state_ref` |
| `effectDescriptorsByRef` | `effect_descriptors` joined to `objects` | `effect_ref` |
| `idempotencyRecords` | the exact two-field projection in §5.8 | `authority_idempotency` |
| `usedNonces` | `used_nonces` | `nonce` |
| `keyResolver.get` | `validation_keys` | `key_id` |

The alias-to-table relation and attempted-key shape are also closed:

| table | admitted alias | exact attempted-key tuple |
|---|---|---|
| `objects` | `primary_ref`, `uri_by_ref`, `access_by_ref` | `[schema, object_id, object_hash]` |
| `objects` | `identity_key` | `[schema, object_id]`; ActiveIntent alone uses `[schema, object_id, revision]` |
| `runtime_bindings` | `runtime_key_id` | `[runtime_key_id]` |
| `data_grants` | `grant_ref` | `[schema, object_id, object_hash]` |
| `effect_descriptors` | `effect_ref` | `[schema, object_id, object_hash]` |
| `validation_keys` | `key_id` | `[key_id]` |
| `grant_state` | `grant_state_ref` | `[schema, object_id, object_hash]` |
| `used_nonces` | `nonce` | `[nonce]` |
| `idempotency_records` | `authority_idempotency` | `[structural_key_commitment]` |

No other map, index, cache, resolver, or direct SQL read may influence
validation, result construction, or verification. Every access passes one
instrumentation method before it returns data. The closed `access_kind` enum is:

```text
read_present
read_absent
write_insert
write_update
read_absent_write_insert
read_present_write_update
```

Reads through aliases normalize to the table's one canonical structural key.
Repeated access to that same `(table_name, structural_key)` coalesces in this
precedence order: `read_absent_write_insert`, `read_present_write_update`,
`write_insert`, `write_update`, `read_present`, `read_absent`. An absent lookup
is committed to the dependency manifest with its canonical attempted key and
this row hash:

```text
SHA-256(JCS([
  "cairn-authoritative-absent-row-v0.1",
  table_name,
  index_name,
  canonical_attempted_key
]))
```

For an alias lookup, `index_name` and the attempted alias key are included in a
second dependency entry whose structural key is
`JCS(["index", index_name, canonical_attempted_key])`; a present alias also
records the resolved non-alias base row. An authoritative alias-resolution
record maps the alias `entry_key` to that base `entry_key`; both entries must
appear in the same manifest, have the same table and base-row hash, and the
base structural key must be independently derived from its closed row
projection. The attempted alias key must also equal the exact alias key
independently derived from that same typed base-row projection; a merely
well-shaped key is not enough. Only an exact three-member
`["index", index_name, canonical_attempted_key]` tuple is an alias marker, so a
legitimate base structural key such as `["index"]` remains a base key. Alias
entries are read-only. An absent alias is valid only if no typed base row in the
transaction snapshot derives that attempted key; a matching present base plus
an absent alias is a contradiction and fails even when both hashes are
self-consistent. A `write_insert` may follow a proven pre-write absence in the
same transaction. Base writes use only the base key.
This prevents a missing identity, URI, runtime,
grant, idempotency tuple, nonce, or key from being silently borrowed from
another snapshot. Any uninstrumented read/write, unknown alias, unknown
`access_kind`, or dependency-table omission is a hard transaction failure.
For `authority_idempotency` only, `canonical_attempted_key` is
`JCS([structural_key_commitment])`; the raw lookup tuple never enters the
dependency manifest.
Each entry also carries
`entry_key = JCS([table_name, structural_key])`. One transaction may contain
only one coalesced entry per `entry_key`; duplicates are schema-invalid. The
manifest sorts entries by UTF-8 `entry_key` and hashes the closed
`DependencyEntry[]` schema. The semantic manifest verifier independently
recomputes every `entry_key`, coalescing result, alias key, absent sentinel,
present row hash, strict ordering, and dependency self-hash before accepting a
root.

The observation is constructed after sequence allocation and operational
versioning, then its ref is inserted into both commit rows in the same
transaction. Commit rows and observation refs are outside the operational state
root, avoiding a hash cycle while retaining an atomic audit link.

### 5.10 `service_observations`

```text
observation_ref_key          PK
request_envelope_hash        UNIQUE
canonical_observation_bytes
principal_id                 nullable
owner_kind                   principal | actor
owner_id                     nonempty
visibility                   private
global_commit_sequence       UNIQUE, operator-only return
scope_sequence               UNIQUE within owner
```

Every observation is private, including one for an enveloped public read. The
signed `access` block MUST equal these row columns. Database triggers reject
updates and reject any canonical bytes/column mismatch. This is not a public
transparency log.

### 5.11 Closed external schema bundle

Phase A freezes one machine-readable external contract:

```text
path:
  simulations/authoritative-service/authoritative-service.schema.json
canonical JCS hash:
  sha-256:3e91dd55310f35703a94d88b7bd75d226c72dded81bdb16dfd7a072a25470980
```

Its nine independently addressable entry points are:

```text
#/$defs/localServiceKeyProfile
#/$defs/validationKeyManifest
#/$defs/receiverAuthenticationRecord
#/$defs/hostAuthenticationContext
#/$defs/genesisManifest
#/$defs/dependencyManifest
#/$defs/operationalRowProjection
#/$defs/serviceObservation
#/$defs/localObservedResult
```

Every object and nested record is closed with `additionalProperties:false`;
every nullable field, ordered nonclaim, outcome branch, table name, access kind,
and committed column is explicit. The top-level `oneOf` also permits validating
an artifact without selecting a definition programmatically. The companion
`simulations/authoritative-service/check-design.mjs` compiles the bundle in
strict Draft 2020-12 mode and pins its definition inventory, entry points,
nonclaim order, hashing annotations, and canonical hash. It imports the frozen
registry/profile tuples and validates all nine exact
operation/request/response/consequence contracts while rejecting
`action.execute`. It deterministically constructs and validates every one of the
nine external entrypoint families, all three local-result branches, the actual
capabilities response, self-hashes, service Ed25519 domain/signature bytes,
profile/current-key lifecycle, host-auth, dependency and genesis manifests, and
kernel/observation cross-field equality. It pins the fixture public key and the
profile, key-manifest, host-context, dependency, genesis-manifest/genesis-state,
success-observation, and accepted-failure observation hashes/signatures.
Independent negatives cover
unknown fields, noncanonical/duplicate/missing-current and arbitrary-fraction
key lifecycles, nonzero owner genesis, cross-table/malformed/duplicated/
reordered/wrong-absent/wrong-present dependencies, exact attempted-key/base-row
binding, typed projections for every admitted alias, singleton `["index"]` base
keys, consequential operations, every rich idempotency integrity field against
authenticated request/result/history truth, raw-key/global-sequence privacy,
wrapper/frozen-result separation, actual frozen replay paths, outcome swaps,
and kernel-result mismatch. The prose examples below are explanatory only; if
they differ, the frozen machine schema wins.

The executable integration harness in
`simulations/authoritative-service/frozen-composite-probe.mjs` loads the
unchanged frozen `intent.put` service and store helpers in memory, interposes one
outer transaction around the real frozen callback, and captures that callback's
exact pre/post-draft snapshots and `{commit,value}` before a final composite
commit decision. The callback receives only the frozen store shape; rich
idempotency metadata, exact object-byte/identity truth, owner projections,
global and owner histories, observation material, and persistence counters stay
wrapper-owned. The interposer records every callback access to the frozen Maps,
Sets, and validation-key resolver with ordered presence and value hashes. That
one trace is the sole source for the transaction's dependency rows and aliases:
an unsupported access, unconsumed access, missing required store/index surface,
or noncontiguous trace fails the transaction rather than allowing the wrapper
to hand-author an incomplete dependency set.

The same wrapper transaction constructs, signs, and persists the actual origin
and replay observations, dependency and scope commits, operational versions,
repository ACL rows, validator binding, envelope index, and rich idempotency
origin link. The checker consumes those exact durable artifacts; it does not
fabricate a second signed history from a reduced probe result. Every unrelated
commit used to test global interleaving is itself a schema-valid, self-hashed,
service-key-signed observation with a complete repository row, dependency
commit, scope mapping, and envelope index.

The probe executes twelve independent real `intent.put` transactions after an
actual committed origin: one successful fresh-envelope replay, one
changed-fingerprint conflict, five separately injected result-object/ACL replay
faults, four post-callback response-schema/observation/persistence/commit fault
boundaries, and one grant-consumption failure injected after new idempotency
staging. The successful replay commits a second nonce, owner/global sequence,
scope root, replay observation, and repository row while retaining the original
result and charge. Each replay corruption captures the unchanged frozen
`commit:true`/`idempotency_result_unavailable` outcome, but the outer transaction
then rejects the unreconstructible observation and restores both kernel and
sidecar to their exact faulted baselines. The changed-fingerprint case captures
the actual `commit:false`/`idempotency_conflict` path with no nonce. Each wrapper
fault likewise preserves the actual callback result while rolling back exactly.
The grant case captures the actual post-staging
`commit:false`/`grant_consumption_failed` result and rolls back. For the
response-schema fault, the actual frozen callback first returns its valid
result; the post-callback fault hook deletes the required `ref` from the exact
boundary value, the real registry validator rejects that value, and the outer
transaction preserves that malformed raw kernel result while rolling back.
That validator is bound to the exact frozen bundle hash, registered operation
contract, canonical source-schema bytes, and source-schema hash. Direct boundary
controls accept the registered body and reject a missing `ref`, missing
`receipt_ref`, extra property, and malformed nested object ref, preventing a
weaker substitute validator from satisfying the control. The checker validates
every local-result branch and proves the twelve callback traces are distinct.
The deterministic composite
report is pinned at
`sha-256:edcfafa01017260a9a29c2b3b48d71f2dcccf0fd4b64539f734fc8cd0d35022f`;
fresh process executions must reproduce it exactly.

Origin verification begins from the actual signed envelope, authenticated
principal/actor/runtime and receiver namespace, actual callback result, actual
canonical object bytes, actual schema-derived identity/URI/ACL, and actual
global/scope mapping. It requires exact unique inventories for versions,
dependency rows/commits, service commits, owner commits, observation repository
rows, and envelope indexes. Negative controls add both duplicate and extra rows,
claim an absent alias while its typed base is present, change every repository
ownership field, alter object bytes/revision, break all replay-origin links, and
map owner sequence one across six complete unrelated global commits. That
interleaved case is accepted by the same exact-history verifier as the ordinary
origin; deleting any intermediate global commit or changing the owner-to-global
mapping is rejected. A second exact verifier starts from the actual committed
replay observation and checks its fresh envelope/nonce, scope sequence/root,
service/scope commit ancestry, repository ACL, dependency inventory, returned
result, and immutable origin result/observation links. The first owner row is
sequence one with previous zero; only the global service chain has a sequence
zero genesis row.

Exact RFC 8785/JCS text and SHA-256 results for a committed row, absent lookup,
receiver authority-namespace HMAC preimage, query commitment with real registry URIs, first
owner-scoped root, and accepted-failure kernel result are
frozen in
`simulations/authoritative-service/canonical-vectors.json` at canonical hash
`sha-256:1b708027482289eabc06ed2247b6f112cd61ac6b92112b83152d5e6f730d9120`.
The checker recomputes every vector and validates all entrypoint fixtures
through both their named definitions and the bundle's top-level union.

## 6. Signed service observation v0.1

The first observation is a sidecar artifact produced by the external reference
composition. It is not a tenth operation and is not inserted into the frozen
kernel bundle.

### 6.1 Local service-key profile

Phase B pins a closed, host-installed `LocalServiceKeyProfile` containing:

```text
schema = cairn.local_service_key_profile.v0.1
profile_id
profile_hash
service_id
store_id
kernel_profile
bundle_hash
allowed_observation_schema
current_key_id
keys[]:
  key_id, public_key, controller, key_type
  not_before, expires_at, status, revocation_time, profile_revision
prior_profile_hash
created_at
```

It is not fetched from caller input and is never resolvable through the nine
operations. The verifier receives its expected hash through the local test
harness/out-of-band configuration. It requires
`key.controller === service_id`, exact store/profile/bundle scope, and
`service_signature.signed_at === observed_at`. Historical validation uses the
append-only configured key-profile chain at that instant.

The profile key array has unique IDs and strict UTF-8 key-ID order.
`current_key_id` resolves exactly one key; that key is active, unrevoked,
controlled by the exact service ID, and current within its required finite
`not_before`/`expires_at` interval. Schema validation rejects null expiry and
noncanonical Ed25519 encodings before lifecycle verification.
Lifecycle comparison preserves arbitrary fractional precision: compare the
fixed UTC whole-second prefixes, remove trailing zeroes from the fractional
parts, right-pad the remaining fractions to equal width, then compare. Thus
`...00Z`, `...00.0Z`, and `...00.000Z` are the same instant. Every key requires
`not_before < expires_at`; currentness is exactly
`not_before <= observed_at < expires_at`.

This proves locally configured service-key control, not authenticated service
discovery, production identity, DNS control, or transport identity.

### 6.2 Receiver authentication record and composition seam

The wrapper is constructed with a trusted receiver-owned
`authenticateRequest(transportRequestContext)` callback. The callback returns one
private branded `ReceiverAuthenticationRecord`:

```text
authentication_handle
account_tenant_commitment
principal_id
actor_id
runtime_key_id
authority_namespace_raw
authority_namespace_commitment
trust_profile_id
trust_profile_hash
authentication_evidence_commitment
assertion_level = host_asserted
```

The namespace commitment is exactly:

```text
HMAC-SHA-256(
  receiver_binding_secret,
  UTF8(JCS([
    "cairn-authority-namespace-v0.1",
    account_tenant_commitment,
    authority_namespace_raw
  ]))
)
```

The callback MUST return one stable, operation-independent raw namespace for an
authenticated account/tenant. The receiver owns a random 256-bit binding secret;
the adapter recomputes the commitment and looks up the receiver-private
account/namespace binding before every mutation. The secret and raw value never
enter a caller artifact, so the commitment is not a public offline dictionary
oracle for guessable tenant names. The raw value is routed only to the frozen
`authentication.authorityNamespace` field and the database idempotency-key
derivation; it is never serialized into the observation or local result.

The record is created by the receiver, not accepted from an envelope, header,
query, or caller-selected authentication object. The observation binds the
public `HostAuthenticationContext` projection (all fields above except the raw
namespace and opaque handle) and states only that the service relied on that host
assertion unless the host authentication boundary is separately trusted.

The wrapper owns the raw frozen service and exposes one method:

```text
handleObservedEnvelope(envelope, transportRequestContext)
```

It authenticates first, derives the exact owner below, then installs a private
synchronous transaction context containing the canonical envelope bytes/hash,
branded receiver record, frozen camelCase authentication projection, local key
profile, signer, and response framing. The store rejects missing, nested, reused,
expired, or mismatched contexts. The raw service and raw store are not returned.
Separate worker processes use separate connections and contexts; no
process-global mutable context crosses requests.

Owner derivation is closed:

```text
if request.principal_id != null:
  owner_kind = principal
  owner_id = request.principal_id
  owner_id must equal receiver_record.principal_id and every private result ACL
else:
  operation must be capabilities.get or runtime_binding.get
  owner_kind = actor
  owner_id = request.actor_id = receiver_record.actor_id
```

The verifier recomputes this rule independently. A signed access block and
repository row that agree with each other but violate this derivation still fail
`observation_owner_mismatch`.

```yaml
schema: cairn.service_observation.v0.1
observation_id: urn:uuid:<uuid>
service:
  service_id: cairn:reference-service
  profile: cairn-proposal-foundation-v0.1
  bundle_hash: sha-256:<exact bundle>
  store_id: <stable store id>
  key_profile_ref: <local external profile ref>
  key_profile_hash: sha-256:<exact configured profile>
access:
  consequence: public_read | private_read | private_state_write | preparation_only
  visibility: private
  owner_kind: principal | actor
  owner_id: <exact owner>
request:
  envelope_hash: sha-256:<exact signed envelope>
  message_id: urn:uuid:<uuid>
  operation_contract:
    operation: projection.get
    request_schema: https://cairn.cards/protocol/schemas/v0.1/operation-bodies.schema.json#/$defs/projectionGetRequest
    response_schema: https://cairn.cards/protocol/schemas/v0.1/scoped-projection.schema.json
    consequence: private_read
  principal_id: <principal or null>
  actor_id: <authenticated actor>
  runtime_key_id: <exact runtime or null>
  body_hash: sha-256:<exact body>
  subject_refs: []
  authorization_refs: []
  query_commitment: sha-256:<canonical exact query and scope>
  host_authentication_context_hash: sha-256:<exact host assertion>
observed_at: <service time read once inside transaction>
transaction:
  isolation: serializable
  snapshot_id: <opaque unique snapshot id>
  scope_sequence_before: 41
  scope_sequence_after: 42
  dependency_set_commitment: sha-256:<exact instrumented read/write set>
  scope_state_commitment_after: sha-256:<exact dependency-row post-state commitment>
  committed: true
result:
  outcome: success | accepted_failure
  status: 200
  code: null
  failures: []
  replayed: false
  response_schema: <exact registered response schema or null for failure>
  kernel_result_hash: sha-256:<JCS exact frozen kernel result>
  returned_refs: []
  relevant_heads: []
  nonce_disposition: newly_reserved | replay_fresh_nonce
  grant_effects:
    - grant_ref: <ObjectRef>
      state_version_before: 6
      state_version_after: 7
      remaining_before: 2
      remaining_after: 1
  idempotency:
    structural_key_commitment: sha-256:<opaque HMAC or null>
    disposition: not_applicable | created | replayed
    original_result_hash: sha-256:<hash or null>
    original_observation_ref: <external observation ref or null>
    original_scope_sequence: <owner-scoped sequence or null>
page:
  kind: single_result
  ordering: not_applicable
  boundary: null
  cursor: null
observation_hash: sha-256:<self hash>
service_signature: <Cairn Ed25519 signature>
not_claiming:
  - production_service
  - deployed_service
  - authenticated_transport
  - delivery_to_caller
  - continuation_delivery
  - cross_page_continuity
  - runtime_onboarding
  - agent_onboarding
  - grant_issuance
  - authenticated_service_discovery
  - production_service_identity
  - host_authentication_truth
  - authority_to_act
  - authorization
  - execution
  - payment
  - settlement
  - escrow
  - release
  - waiver
  - external_exactly_once
  - external_system_idempotency
  - card_authenticity
  - card_condition
  - custody
  - shipment
  - delivery
  - legal_identity
  - postgresql_equivalence
  - protocol_conformance
  - external_effect
  - confidential_computing
  - operator_blindness
  - unlinkability
  - deletion_enforced
  - service_availability
  - runtime_conformance
  - object_reference_discovery
  - transport_binding_conformance
  - raw_runtime_private_key_transfer
  - release_authenticity_without_external_pin
```

The schema fixes that ordered `not_claiming` set exactly; additions, omissions,
reordering, or generic substitutions fail.

The machine schema also closes the replay tuple, not merely its individual
field types. `accepted_failure` requires `replayed:false`; `replayed:true`
requires `outcome:success`,
`nonce_disposition:replay_fresh_nonce`, zero grant effects,
`idempotency.disposition:replayed`, a non-null structural-key commitment,
original result hash, original observation ref, and original owner scope
sequence. `replayed:false` requires `nonce_disposition:newly_reserved`, forbids
`disposition:replayed`, and requires all three origin-link fields to be null.
`not_applicable` requires a null structural-key commitment; `created` and
`replayed` require a non-null one. Semantic verification then resolves the
replay's original result/ref/sequence through the exact origin repository and
commit history rather than trusting those signed fields alone.

### 6.3 Exact query commitment

`query_commitment` hashes a closed object containing:

```text
operation_contract:
  operation
  request_schema
  response_schema
  consequence
principal_id
actor_id
runtime_key_id
body_hash
subject_refs
authorization_refs
host_authentication_context_hash
declared_purpose                 null unless projection.get
intended_use                    null unless projection.get
filters                         []
ordering                        null
page_boundary                   null
```

Current operations return one exact object and do not paginate. Therefore the
page fields MUST use the explicit single-result/null values above. They MUST NOT
pretend to establish cross-page continuity.

### 6.4 Returned references

`returned_refs` is the closed, sorted set of ObjectRefs directly returned or
materially created by the response:

- `intent.put`: stored intent ref;
- exact object reads: the requested/ref-returned object ref;
- `object.resolve`: the resolved ref;
- `action.prepare`: proposal, draft action, and receipt refs; and
- `capabilities.get`: empty.

`relevant_heads` is empty for the current profile because intent control heads,
deal heads, action transition heads, and activity heads are not implemented.
An empty list means “not present in this profile,” not “checked and unchanged.”

### 6.5 Signer, lifecycle, and verification

The observation is signed with the pinned local service-key profile. The verifier
MUST:

- validate the closed schema, exact nonclaim set, self-hash/signature preimage,
  signature, exact controller equality, key-profile hash/lifecycle chain,
  `signed_at === observed_at`, and exact service/store/profile/bundle scope;
- require signed access fields to equal the immutable repository ACL columns;
- require `operation_contract` to equal one exact
  `(name, request_schema, response_schema, consequence)` tuple from the frozen
  nine-operation registry, require `access.consequence` to match it, and reject
  every other operation name including `action.execute`;
- bind the request envelope hash/body hash, authenticated actor/principal, and
  host-authentication-context hash; require a success result's response schema
  to equal the operation contract and an accepted failure's to be null;
- recompute the exact frozen kernel-result hash and returned refs;
- verify scope-sequence and grant-effect arithmetic;
- parse every structural key as I-JSON, require an array whose re-encoded JCS is
  byte-identical, and recompute the exact table/index key function in §5/§5.9;
- use the internal scope-commit mapping to reconstruct every recorded dependency
  row at the mapped global sequence and recompute the transaction-scope root; and
- require matching append-only scope/global commit rows and observation ref.

Historical verification may preserve a key that was valid at `observed_at`.
Historical proof does not make an expired returned object or grant current.

The observation self-hash uses the exact existing foundation algorithm in
`protocol/lib/core.mjs`, without a placeholder convention. Its external schema
declares:

```text
x-cairn-object-schema = cairn.service_observation.v0.1
x-cairn-self-hash-pointer = /observation_hash
x-cairn-signature-pointers = [/service_signature]
x-cairn-hash-exclusion-pointers =
  [/service_signature/signed_hash, /service_signature/value]
```

`objectHash` removes the self-hash field and both declared signature fields from
a cloned object, then hashes its RFC 8785/JCS bytes. `bindObjectHash` writes that
hash to `/observation_hash` and `/service_signature/signed_hash`. The signature
is Ed25519 over the existing
`signatureInput("cairn.service_observation.v0.1", observation_hash)` domain.
Unknown fields fail the closed schema before hashing. The state-root preimage
never includes any observation/hash/signature field.

## 7. Response and delivery boundary

The Phase-B local function returns one branch of this closed external union:

```yaml
success:
  schema: cairn.local_observed_result.v0.1
  disposition: committed_success
  kernel:
    ok: true
    status: 200
    body: <byte-identical frozen-kernel response body>
    replayed: false
  wrapper_failure: null
  service_observation: <signed success observation>

accepted_failure:
  schema: cairn.local_observed_result.v0.1
  disposition: committed_accepted_failure
  kernel:
    ok: false
    status: <non-2xx>
    code: <stable frozen failure code>
    failures: []
  wrapper_failure: null
  service_observation: <signed accepted_failure observation>

rolled_back_failure:
  schema: cairn.local_observed_result.v0.1
  disposition: rolled_back_failure
  kernel: <exact frozen result if callback ran, otherwise null>
  wrapper_failure: <following closed object or null>
  # when non-null:
    status: <non-2xx>
    code: <stable wrapper/infrastructure failure code>
    failures: []
    stage: preflight | observation | persistence | commit | retry
  service_observation: null
```

`rolled_back_failure` is a strict three-way union, not a loose pair of nullable
fields:

1. callback `commit:false`: `kernel` is an exact frozen `kernelFailure` and
   `wrapper_failure` is null;
2. wrapper `preflight` or exhausted `retry`: `kernel` is null and
   `wrapper_failure` is non-null; or
3. `observation`, `persistence`, or `commit` failure after the callback:
   `kernel` is the exact frozen success or failure and `wrapper_failure` is
   non-null.

A successful kernel with no wrapper failure is never a rolled-back result, and
a preflight/retry failure can never claim that the callback ran.

For either committed branch:

```text
kernel_result_hash = SHA-256(UTF8(JCS(kernel)))
```

Whenever non-null, `kernel` is the exact local frozen result object:
`{ok:true,status,body,replayed}` or
`{ok:false,status,code,failures}`. It is not the HTTP adapter's separate
`{error,failures}` transport body and never hashes headers, framing, or an
invented wrapper body. `wrapper_failure` is never substituted for it. A
rolled-back result has no observation/hash.

This wrapper is not a protocol object, operation body, or HTTP media profile. The
inner kernel body remains byte/schema-identical. Observations are stored only in
the external observation repository, never in `objects`; none of the nine
operations or two existing HTTP routes can resolve them.

The external wrapper verifier requires `kernel.ok`, status, code/failures,
replay flag, and canonical kernel-result hash to agree exactly with the observation
outcome/result branch. A success body is validated through the frozen registry
schema named only in `service_observation.result.response_schema`; the kernel
object itself remains the byte/field-identical frozen result and gains no
wrapper metadata.

The existing HTTP adapter remains exactly:

```text
GET  /cairn/0.1/capabilities
POST /cairn/0.1/messages
```

It is unchanged and does not return an observation in Phase B. Defining an
authenticated network carriage for the wrapper is deferred.

The signed observation proves what the service committed and intended to return.
It does not prove that the caller received the bytes. Network loss after commit
is therefore labeled `delivery_to_caller` unknown.

Mutation retries recover the original result while reserving a fresh nonce and
creating a fresh replay observation. The replay observation binds the retry
envelope, new scope sequence/root, `replayed:true`, no grant effects, the
original result hash, and the original observation ref/sequence. The original
observation is located through the idempotency row's immutable origin global/
scope sequences and the commit tables.

This change spec does not add idempotent private-read delivery or an observation
retrieval operation. A failed private-read response delivery may consume its
disclosure; that usability cost remains visible.

AS-19 uses an operator/test-only repository method
`loadObservationForAudit(ref, authenticatedOwnerContext)`. It is not exposed by
the raw/wrapped service, HTTP, or protocol operation surface.

Pre-transaction authentication/operation rejection, rich-row preflight veto,
bounded retry exhaustion, and transaction/signer/persistence rollback use
`rolled_back_failure`. A post-admission callback result with `commit:true` uses
`committed_accepted_failure` only if an exact dependency/version history and
truthful signed observation can be completed. If post-callback integrity,
response validation, observation construction, persistence, or commit fails,
the raw callback result remains in `kernel`, the infrastructure failure is
separate in `wrapper_failure`, and the composite transaction rolls back. The
external schema fixes which fields exist in each branch and rejects a
missing/unexpected observation.

## 8. Failure and privacy rules

### 8.1 Closed outcome/commit matrix

There is no generic “error means rollback” rule. The wrapper applies this exact
matrix, and the local-result schema admits only the named branch:

| stage/result | authoritative delta | local disposition | observation |
|---|---|---|---|
| receiver authentication, owner derivation, operation lookup, or context rejection before transaction | none | `rolled_back_failure` | null |
| receiver-private rich-idempotency preflight fails before frozen callback | none; callback not invoked | `rolled_back_failure` with `kernel:null` and wrapper failure | null |
| callback `commit:false`, including admission, access preflight, prepared-result binding, or grant consumption rejection | none | `rolled_back_failure` | null |
| callback `commit:true`, 2xx | exact callback success effects plus nonce/history/commit | `committed_success` | signed `success` |
| callback `commit:true`, non-2xx, and exact dependencies/history remain reconstructible | exactly the nonce/history/commit effects enumerated in §4.1 | `committed_accepted_failure` | signed `accepted_failure` |
| callback `commit:true`, but result object/identity/URI/ACL or other required observation truth is missing or corrupt | none; the staged callback draft, nonce, and sidecar all roll back | `rolled_back_failure` with raw callback result in `kernel` and `authoritative_integrity_invalid` in `wrapper_failure` | null |
| signer, observation construction, persistence, or database commit-call failure | none, including no nonce or sequence | `rolled_back_failure` | null |
| bounded retry exhaustion | none | `rolled_back_failure` | null |
| process loss after durable commit but before local return | committed row remains; delivery unknown | recovery exposes the already committed branch to the owner-only audit seam | already stored |

`operation_unknown` and authentication mismatch occur before the database
transaction. Internally corrupt rich replay rows fail adapter preflight before
the frozen callback. A coherent rich row whose referenced result object,
identity, URI, or ACL is unavailable still reaches the callback after admission
and returns `commit:true`/`idempotency_result_unavailable`; the outer
transaction preserves that raw result but rolls the staged nonce and all
sidecar work back because no truthful observation can be signed. A valid rich
row plus a different new-request fingerprint also reaches the callback and
remains its exact `commit:false`/`idempotency_conflict`. The adapter never
rewrites the callback's result or `commit` flag; it makes a separate final
composite-commit decision.

- Foreign private objects remain indistinguishable from absent objects.
- Detailed store, constraint, or signature failures are not returned to an
  unauthorized caller.
- Raw database errors, row values, canonical private bytes, state roots, and
  signer errors are not exposed in public error bodies.
- Observations for private operations are private to the exact derived owner:
  the principal when non-null, otherwise the authenticated actor for the two
  admitted principal-less reads.
- Observations for enveloped public reads are also private to the authenticated
  principal or actor because their request metadata is not public.
- The signed `access` block and immutable repository columns must match; an ACL
  or owner flip invalidates repository verification.
- The caller sees only its owner-scoped sequence/root, never the global
  cross-tenant commit sequence/root.
- `query_commitment` is not a privacy substitute. The observation also contains
  the explicit minimum request fields needed for verification and no private
  source object beyond what the caller was permitted to receive.
- Service operators may observe request metadata. This design does not claim
  confidential computing, operator blindness, unlinkability, or deletion.

## 9. Required race and mutation controls

The first executable drill MUST include at least these independent controls:

| ID | Concurrent or mutated case | Required result |
|---|---|---|
| AS-01 | two processes submit the same fresh nonce | exactly one commit; one `nonce_replay` |
| AS-02 | same idempotency tuple + same fingerprint + fresh nonces | an actual second `intent.put` callback commits a second nonce, observation, global/owner sequence, dependency history, and repository ACL with no second result construction/charge; the closed schema and exact replay-history verifier bind the fresh envelope and every original result/ref/scope link |
| AS-03 | same idempotency tuple + different fingerprint | original remains; second `idempotency_conflict`; no second work |
| AS-04 | two reads race for one remaining disclosure | exactly one response/observation; counter ends at zero |
| AS-05 | multi-grant read where one counter is exhausted | no grant changes; no nonce reservation; no observation |
| AS-06 | byte-different fork for each stored object family | exactly one schema-derived identity survives; loser rolls back |
| AS-07 | same runtime key bound to different object | second binding rejected |
| AS-08 | signer fails after result staging | entire transaction rolls back |
| AS-09 | observation construction fails | entire transaction rolls back |
| AS-10 | stored observation signature byte changes | verifier rejects |
| AS-11 | independently re-signed request/body/response mutation | exact request/result verifier rejects |
| AS-12 | re-signed service/profile/bundle/store/key/controller/time mutation | trust-profile verifier rejects |
| AS-13 | re-signed scope sequence/root lacks exact history/commit rows | historical-root verifier rejects |
| AS-14 | re-signed grant before/after arithmetic mutation | grant/history verifier rejects |
| AS-15 | a coherent rich idempotency row passes preflight but its referenced result object is missing or hash/identity-incoherent, or its ACL is missing, public, or owned by another principal after valid admission | five independent actual `intent.put` callbacks each return the unchanged `commit:true`/`idempotency_result_unavailable`; each outer composite transaction preserves that raw kernel result, reports `authoritative_integrity_invalid`, and restores kernel and sidecar exactly to its separately faulted baseline with no nonce, sequence, dependency, observation, or repository delta |
| AS-16 | process dies before database commit | no partial nonce/grant/object/observation state |
| AS-17 | process dies after commit but before response | committed state remains; delivery remains unknown |
| AS-18 | opaque cursor or pagination claim appears | schema/verifier rejects for this profile |
| AS-19 | internal audit repository receives foreign owner context | same private-not-found result; no network route exists |
| AS-20 | any unregistered/consequential operation name, including `action.execute`, is submitted or substituted into an observation contract | schema/wrapper returns `operation_unknown`; no state change or observation |
| AS-21 | observation ACL/owner column differs from signed access block | repository/verifier rejects |
| AS-22 | enveloped public-read observation is inspected without owner context | private-not-found; no actor/runtime/global metadata leaks |
| AS-23 | caller/header substitutes authority namespace or host-auth context | wrapper rejects; no idempotency/state change |
| AS-24 | nested/reused/mismatched process context | adapter rejects before transaction |
| AS-25 | durable idempotency metadata enters frozen two-field validator view | closed validator projection test rejects extra fields |
| AS-26 | validator replay/write uses set, delete, or clear against the two-field callback idempotency view, or any full wrapper-integrity idempotency field is mutated | the adapter discards the callback view and reconstructs it from the immutable durable row; the rich row, projection, hash, version, root, and origin history remain exact; every owner-visible field is independently compared with authenticated request, exact callback result, signed origin observation, and append-only history truth |
| AS-27 | duplicate, partial, forked, restarted, or concurrent genesis import | one sealed exact genesis or complete rollback |
| AS-28 | state-root row omitted/reordered/duplicated/history-altered | recomputed historical root rejects |
| AS-29 | observation/signature/commit back-reference enters state-root domain | domain guard rejects cyclic field/table |
| AS-30 | corrupt replay object/ACL, malformed response, substitute/weakened response validator, grant consumption after idempotency staging, observation construction, persistence, or commit call | the actual frozen `intent.put` callback runs independently in every case; the malformed boundary value itself fails the validator bound to the frozen bundle, registered operation, and canonical source schema, with valid/missing-field/extra-field/malformed-ref controls proving its boundary; that value becomes the exact preserved local kernel result; corrupt/unreconstructible and wrapper failures retain zero kernel/sidecar delta, while actual `grant_consumption_failed` remains callback `commit:false` with zero delta |
| AS-31 | wrong/revoked/expired/noncanonical/duplicate/missing-current service key, equal/inverted validity interval, arbitrary fractional boundary error, or altered/unsorted key-profile chain | independently re-bound schema/profile/observation trust probes reject while exact lower-bound and pre-expiry fractional positives pass |
| AS-32 | signed `not_claiming` set is changed/reordered | schema/verifier rejects |
| AS-33 | `keyResolver` row/version/manifest is missing, duplicated, unsorted, null-expiry, raced, revoked, or changed between validation and commit | one finite transaction-visible key version is dependency-bound; malformed/history mutation and cross-process borrowing reject |
| AS-34 | signed access and repository columns agree but owner was derived from actor instead of non-null principal, or principal instead of actor for a permitted principal-less read | independent owner derivation rejects with `observation_owner_mismatch` |
| AS-35 | header/caller/raw namespace/tenant changes across two operations or raw namespace appears in an observation/result | stable receiver binding is enforced; changed commitment rejects; raw value never serializes |
| AS-36 | two previously unseen owners perform their first operations concurrently after genesis | both use before `0`/after `1` in separate owner chains; no owner sequence-zero row or cross-owner ancestry appears |
| AS-37 | every row of the closed outcome/commit matrix is fault-injected, including local-kernel versus HTTP-failure hashing | disposition, exact canonical kernel-result hash, observation presence, nonce, sequence, object, idempotency, and grant deltas match §7/§8.1 exactly |
| AS-38 | unknown field, nullable substitution, registry URI/tuple mutation, wrong union branch, `accepted_failure` claiming replay, replay claiming a non-success outcome, changed row column, wrong self-hash/signature exclusion, outcome swap, kernel/observation mismatch, or alternate JCS preimage is supplied to any entry point | strict schema/semantic/hash/signature verifier rejects; all nine deterministic entrypoint fixtures, three result branches, real registry tuples, and canonical vectors remain exact |
| AS-39 | dependency alias is omitted, mapped to the wrong table/index/base key, binds a well-shaped attempted key for a different typed row, is declared absent while a typed base row deterministically resolves to it, becomes present during a race, lacks its exact base row when present, is duplicated/reordered/uncoalesced, has the wrong attempted-key shape/absent sentinel/present hash, misclassifies singleton `["index"]`, or any required frozen callback Map/Set/resolver access is omitted, unsupported, or left unconsumed | the ordered callback trace is the sole dependency producer; exact origin/replay store-and-index surfaces, nonce absence/insertion, grant read/update, idempotency absence/insertion or replay-read, validation keys, runtime binding, and joined object/ACL/URI accesses are pinned; schema/semantic manifest/root verification changes or the transaction fails |
| AS-40 | any exact observation nonclaim, including `agent_onboarding`, is omitted, added, reordered, or replaced with a generic term | closed schema, checker, and verifier reject |
| AS-41 | each rich-only idempotency field/self-hash/history mapping is mutated, a valid row receives a different new-request fingerprint, or the frozen result object/identity/ACL is corrupted | rich mismatch vetoes before callback with zero delta; request conflict remains the frozen `commit:false` outcome; each result/identity/ACL corruption captures its own actual frozen `commit:true` outcome but the outer integrity decision rolls back the staged nonce and sidecar; no raw result is rewritten |
| AS-42 | raw namespace/idempotency guesses, changed operator-global origin/creation sequences, or unrelated foreign commits are varied while owner facts and injected randomness stay fixed | HMAC commitments resist public dictionary reproduction; dependency artifacts contain neither raw secret; the same exact-history verifier accepts a complete six-foreign-commit interleaving made only of independently valid signed observations and complete commits without changing owner projection/root bytes, but rejects any invalid foreign signature/artifact, missing intermediate global commit, or false owner-to-global mapping |

Every accepted audit finding receives either a code/schema/test remediation or a
documented rejection/deferral. No finding may be closed only by prose if a direct
machine control is feasible.

### 9.1 Deterministic fixture and report

The executable drill pins:

- one deterministic database/store/genesis ID and file manifest;
- deterministic fixture keys derived from named public test seeds;
- injected clock values and UUID/observation/snapshot ID factories;
- exact kernel/profile/bundle/key-profile hashes;
- the in-memory `frozen-composite-probe.mjs` interposer around the unchanged
  frozen `intent.put` service for actual callback-level `commit:false`
  fingerprint conflict/post-staging grant failure and five independent
  `commit:true` corrupt-result/ACL paths;
- child-process `ready` barriers and one parent `release` event for each race;
- a ten-second per-child timeout and forced cleanup;
- stable fault hooks:
  `after_begin`, `after_sequence_allocation`, `after_kernel_callback`,
  `after_operational_versioning`, `after_observation_signing`,
  `before_commit`, and `after_commit_before_return`;
- signer-throw, persistence-throw, and process-termination modes available only
  to the drill; and
- clean restart/reopen verification after every crash case.

AS-11 through AS-14 and AS-21/28/31/32/34/38/40 use independently re-hashed and
fixture-service-key-signed mutants so generic signature failure cannot satisfy
the intended semantic control. AS-31/41/42 independently re-bind every mutated
profile/row/manifest and use the actual frozen replay paths where applicable.
Each asserts its named stable failure code.

The machine report is
`cairn.authoritative_service_drill_report.v0.1`, uses only deterministic values,
lists every unique case and intended boundary, records the unchanged kernel tree,
and carries a canonical report hash. Tests pin the exact case count, IDs, pass
count, failure codes, kernel tree, and report hash. Clean archives at two
different filesystem paths must produce byte-identical reports.

## 10. Implementation order

### Phase A — freeze this design

1. Run independent architecture, privacy, database-race, and claim audits.
2. Resolve every P0/P1/material-P2 finding.
3. Freeze a reviewed design commit.

### Phase B — durable local reference

Outside `protocol/`:

1. implement a `MemoryReferenceStores`-compatible SQLite subclass or adapter;
2. seal one deterministic sequence-zero genesis manifest before serving;
3. pin §4.5 PRAGMAs, `BEGIN IMMEDIATE`, retries, and database constraints;
4. reload authoritative rows and project rich idempotency rows to the frozen
   two-field validator view inside every transaction;
5. version operational rows and persist exact canonical bytes/structural keys;
6. implement the private context wrapper, local service-key profile, signed
   observation construction, repository ACL, and historical verifier;
7. run separately invoked workers against one database file with deterministic
   race barriers and crash hooks; and
8. implement AS-01 through AS-42.

The adapter MAY subclass the current memory store only to satisfy the frozen
composition boundary. Its transaction semantics MUST come from the database,
not inherited process-local Maps. It MUST preserve the frozen callback's
`commit` flag and apply the exact closed outcome/commit matrix in §8.1; HTTP
status alone never decides rollback.

### Phase C — independent executable audit

Audit a frozen commit in clean archives for:

- race determinism and rollback;
- no dependency borrowing;
- exact report reproducibility;
- observation signer/controller and snapshot binding;
- privacy and error equivalence;
- unchanged `protocol/` tree; and
- absence of any new consequential operation or authority claim.

### Phase D — production mapping, later

Only after the local reference passes may Cairn specify a PostgreSQL mapping,
key-management profile, migration/backup/recovery procedure, authenticated
service discovery, and operational conformance suite.

## 11. Explicit nonclaims

This design does not claim:

- `production_service`;
- `deployed_service`;
- `authenticated_transport`;
- `delivery_to_caller`;
- `continuation_delivery`;
- `cross_page_continuity`;
- `runtime_onboarding`;
- `agent_onboarding`;
- `grant_issuance`;
- `authenticated_service_discovery`;
- `production_service_identity`;
- `host_authentication_truth`;
- `authority_to_act`;
- `authorization`;
- `execution`;
- `payment`;
- `settlement`;
- `escrow`;
- `release`;
- `waiver`;
- `external_exactly_once`;
- `external_system_idempotency`;
- `card_authenticity`;
- `card_condition`;
- `custody`;
- `shipment`;
- `delivery`;
- `legal_identity`;
- `postgresql_equivalence`;
- `protocol_conformance`;
- `external_effect`;
- `confidential_computing`;
- `operator_blindness`;
- `unlinkability`;
- `deletion_enforced`;
- `service_availability`;
- `runtime_conformance`;
- `object_reference_discovery`;
- `transport_binding_conformance`;
- `raw_runtime_private_key_transfer`; or
- `release_authenticity_without_external_pin`.
