# Cairn authoritative store and signed service-observation change spec v0.1

**Status:** first cold audit rejected the frozen `b86ceae` candidate with three
P1 and material P2 findings; all findings below are accepted for remediation.
This revised local design is not independently re-audited, implemented, or
conforming.

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
isolation. The transaction:

1. reads the service clock once;
2. resolves the exact current runtime, object, ACL, grant, nonce, and idempotency
   state required by the operation;
3. validates the envelope and operation against that single snapshot;
4. reserves the nonce;
5. creates or resolves the exact idempotent result where applicable;
6. applies object and grant-counter changes;
7. allocates the next global internal commit sequence and the next owner-scoped
   sequence;
8. materializes versioned operational rows and computes the exact non-recursive
   owner-scoped state commitment;
9. constructs and signs the service observation from those staged facts;
10. persists the result, observation, version rows, and append-only commit
    record; and
11. commits all changes together or rolls all of them back.

Any unsuccessful operation result rolls back, even if the frozen memory
callback labels that outcome `commit:true`. Validation failure, corrupt replay
state, response-schema failure, grant-consumption failure, signer failure,
observation failure, persistence failure, and commit-call failure commit no
nonce, sequence, grant, object, idempotency, observation, or history change.
Database lock/serialization failures follow the bounded retry contract in §4.5.
This v0.1 stores observations only for successful committed 2xx results; it has
no failure-observation profile.

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
- corrupt, missing, wrong-operation, wrong-owner, or wrong-result replay state:
  fail closed as service unavailable and do not perform new work.

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
`grant_state`, `used_nonces`, and the frozen two-field idempotency-record
projection. Membership is every row the kernel validation/result path materially
read or wrote for this accepted transaction, including public runtime bindings;
unrelated rows are excluded. Instrumented store access records this closed
dependency set, and the drill fails on an untracked read.

The committed row bytes use these closed owner-visible column projections:

| table | committed columns |
|---|---|
| `objects` | ref, schema identity, canonical object hash, URI, visibility, principal, owner scope sequence |
| `runtime_bindings` | runtime key ID, ref |
| `data_grants` | grant ref |
| `effect_descriptors` | descriptor ref |
| `grant_state` | grant ref, status, revocation nonce, remaining disclosures, state version, owner scope sequence |
| `used_nonces` | nonce, envelope hash, operation, owner, owner scope sequence |
| `idempotency_records` | structural-key hash, frozen fingerprint, result ref, owner scope sequence |

Global sequences, global roots, observation/commit refs, signatures, raw
authentication evidence, and rich idempotency metadata never enter these row
bytes.

The commitment is a transaction-scope root, not a commitment to all tenant or
global state. It explicitly excludes observation bytes/signatures/refs, service
commit rows, scope-commit rows, key-profile bytes, authentication evidence, and
the richer idempotency metadata columns. Therefore it has no self-reference.
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

### 5.1 `service_meta`

One row per store:

```text
store_id                     stable random identifier
profile                      cairn-proposal-foundation-v0.1
bundle_hash                  exact active bundle hash
commit_sequence              nonnegative integer
genesis_manifest_hash        exact sealed bootstrap manifest
genesis_state_root           exact sequence-zero operational root
created_at                   service time
```

The profile and bundle hash are immutable for that store. Opening a store under a
different profile or bundle fails closed.

### 5.2 Sealed genesis import

The trusted local bootstrap is one atomic sequence-zero import, not an ordinary
service operation. A closed `GenesisManifest` commits the runtime bindings,
DataGrants and initial counters, effect descriptors, scoped projections, service
key profile, store/profile/bundle, and canonical object/ACL bindings needed by
the drill.

The store cannot serve requests until genesis is sealed. Exact duplicate import
returns the existing genesis result. A different manifest, partial import,
concurrent fork, or later seeder write fails and changes nothing. Genesis creates
version rows at global and owner scope sequence zero but no service observation.
Runtime onboarding, grant issuance, and production administration remain
nonclaims.

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

### 5.5 `grant_state`

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

### 5.6 `used_nonces`

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

### 5.7 `idempotency_records`

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
response_hash
origin_global_commit_sequence
origin_scope_sequence
created_global_commit_sequence
created_scope_sequence
```

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
cannot erase or rewrite the richer columns.

### 5.8 Version and commit history

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
not exceeding the internal global sequence named by `scope_commits`. Omission,
duplicate version keys, or row-hash mismatch fails verification.

`service_commits` is operator-private and append-only:

```text
global_commit_sequence        PK
previous_global_sequence
transaction_kind              genesis | service_operation | replay
committed_at
observation_ref_key           null only for genesis
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

The observation is constructed after sequence allocation and operational
versioning, then its ref is inserted into both commit rows in the same
transaction. Commit rows and observation refs are outside the operational state
root, avoiding a hash cycle while retaining an atomic audit link.

### 5.9 `service_observations`

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

## 6. Signed service observation v0.1

The first observation is a sidecar artifact produced by the external reference
composition. It is not a tenth operation and is not inserted into the frozen
kernel bundle.

### 6.1 Local service-key profile

Phase B pins a closed, host-installed `LocalServiceKeyProfile` containing:

```text
profile_id/hash
service_id
store_id
kernel_profile
bundle_hash
allowed observation schema
key_id, public key, controller
not_before, expires_at, status, revocation_time
prior key-profile hash
```

It is not fetched from caller input and is never resolvable through the nine
operations. The verifier receives its expected hash through the local test
harness/out-of-band configuration. It requires
`key.controller === service_id`, exact store/profile/bundle scope, and
`service_signature.signed_at === observed_at`. Historical validation uses the
append-only configured key-profile chain at that instant.

This proves locally configured service-key control, not authenticated service
discovery, production identity, DNS control, or transport identity.

### 6.2 Host authentication context and composition seam

The external wrapper creates one immutable `HostAuthenticationContext`:

```text
principal_id
actor_id
runtime_key_id
authority_namespace_commitment
trust_profile_id/hash
authentication_evidence_commitment
assertion_level = host_asserted
```

The raw authority namespace remains receiver-private. It cannot originate in the
envelope, headers, query, or caller-selected callback. The observation binds the
context hash and states only that the service relied on the host assertion unless
that host authentication boundary is separately trusted.

The wrapper owns the raw frozen service and exposes one method:

```text
handleObservedEnvelope(envelope, hostAuthenticationContext)
```

It installs a private synchronous transaction context containing the exact
canonical envelope bytes/hash, the same authentication values passed to the raw
service, the local key profile, signer, and response framing. The store rejects
missing, nested, reused, or mismatched contexts. The raw service and raw store
are not returned to callers. Separate worker processes use separate connections
and contexts; no process-global mutable context crosses requests.

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
  operation: projection.get
  principal_id: <principal or null>
  actor_id: <authenticated actor>
  runtime_key_id: <exact runtime or null>
  body_schema: <exact request schema>
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
  status: 200
  replayed: false
  response_schema: <exact registered response schema>
  response_hash: sha-256:<JCS response body>
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
    structural_key_hash: sha-256:<hash or null>
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
  - grant_issuance
  - authenticated_service_discovery
  - production_service_identity
  - host_authentication_truth
  - authorization
  - execution
  - payment
  - settlement
  - escrow
  - release
  - waiver
  - external_exactly_once
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
  - deletion_enforced
```

The schema fixes that ordered `not_claiming` set exactly; additions, omissions,
reordering, or generic substitutions fail.

### 6.3 Exact query commitment

`query_commitment` hashes a closed object containing:

```text
operation
principal_id
actor_id
runtime_key_id
body_schema
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
- bind the request envelope hash, body hash, authenticated actor/principal, and
  host-authentication-context hash and exact registered response schema;
- recompute the response hash and returned refs;
- verify scope-sequence and grant-effect arithmetic;
- use the internal scope-commit mapping to reconstruct every recorded dependency
  row at the mapped global sequence and recompute the transaction-scope root; and
- require matching append-only scope/global commit rows and observation ref.

Historical verification may preserve a key that was valid at `observed_at`.
Historical proof does not make an expired returned object or grant current.

The observation self-hash uses the same foundation convention: hash the JCS
object with `observation_hash`, signature signed-hash, and signature value set to
their schema-defined placeholders; the signature domain binds the schema ID and
resulting observation hash. The state-root preimage never includes those fields.

## 7. Response and delivery boundary

The Phase-B local function returns this closed external wrapper:

```yaml
schema: cairn.local_observed_result.v0.1
kernel:
  status: 200
  replayed: false
  response_schema: <exact registered schema>
  body: <byte-identical frozen-kernel response body>
service_observation: <signed observation>
```

This wrapper is not a protocol object, operation body, or HTTP media profile. The
inner kernel body remains byte/schema-identical. Observations are stored only in
the external observation repository, never in `objects`; none of the nine
operations or two existing HTTP routes can resolve them.

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

## 8. Failure and privacy rules

- Foreign private objects remain indistinguishable from absent objects.
- Detailed store, constraint, or signature failures are not returned to an
  unauthorized caller.
- Raw database errors, row values, canonical private bytes, state roots, and
  signer errors are not exposed in public error bodies.
- Observations for private operations are private to the same principal.
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
| AS-02 | same idempotency tuple + same fingerprint + fresh nonces | two nonces, observations, and sequences; one result construction/charge; replay observation binds original result/observation |
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
| AS-15 | idempotency row points to wrong operation/result/owner | replay fails closed with zero state/sequence delta |
| AS-16 | process dies before database commit | no partial nonce/grant/object/observation state |
| AS-17 | process dies after commit but before response | committed state remains; delivery remains unknown |
| AS-18 | opaque cursor or pagination claim appears | schema/verifier rejects for this profile |
| AS-19 | internal audit repository receives foreign owner context | same private-not-found result; no network route exists |
| AS-20 | any consequential operation name is submitted | `operation_unknown`; no state change |
| AS-21 | observation ACL/owner column differs from signed access block | repository/verifier rejects |
| AS-22 | enveloped public-read observation is inspected without owner context | private-not-found; no actor/runtime/global metadata leaks |
| AS-23 | caller/header substitutes authority namespace or host-auth context | wrapper rejects; no idempotency/state change |
| AS-24 | nested/reused/mismatched process context | adapter rejects before transaction |
| AS-25 | durable idempotency metadata enters frozen two-field validator view | closed validator projection test rejects extra fields |
| AS-26 | validator replay/write attempts to erase rich idempotency metadata | immutable durable row remains exact |
| AS-27 | duplicate, partial, forked, restarted, or concurrent genesis import | one sealed exact genesis or complete rollback |
| AS-28 | state-root row omitted/reordered/duplicated/history-altered | recomputed historical root rejects |
| AS-29 | observation/signature/commit back-reference enters state-root domain | domain guard rejects cyclic field/table |
| AS-30 | corrupt replay object, response schema, grant consumption, observation persistence, or commit call | unsuccessful result and zero authoritative delta |
| AS-31 | wrong/revoked historical service key or altered key-profile chain | observation trust verification rejects |
| AS-32 | signed `not_claiming` set is changed/reordered | schema/verifier rejects |

Every accepted audit finding receives either a code/schema/test remediation or a
documented rejection/deferral. No finding may be closed only by prose if a direct
machine control is feasible.

### 9.1 Deterministic fixture and report

The executable drill pins:

- one deterministic database/store/genesis ID and file manifest;
- deterministic fixture keys derived from named public test seeds;
- injected clock values and UUID/observation/snapshot ID factories;
- exact kernel/profile/bundle/key-profile hashes;
- child-process `ready` barriers and one parent `release` event for each race;
- a ten-second per-child timeout and forced cleanup;
- stable fault hooks:
  `after_begin`, `after_sequence_allocation`, `after_kernel_callback`,
  `after_operational_versioning`, `after_observation_signing`,
  `before_commit`, and `after_commit_before_return`;
- signer-throw, persistence-throw, and process-termination modes available only
  to the drill; and
- clean restart/reopen verification after every crash case.

AS-11 through AS-14 and AS-21/28/31/32 use independently re-hashed and
fixture-service-key-signed mutants so generic signature failure cannot satisfy
the intended semantic control. Each asserts its named stable failure code.

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
8. implement AS-01 through AS-32.

The adapter MAY subclass the current memory store only to satisfy the frozen
composition boundary. Its transaction semantics MUST come from the database,
not inherited process-local Maps. It MUST roll back every unsuccessful kernel
result regardless of the memory callback's `commit` flag.

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
- `grant_issuance`;
- `authenticated_service_discovery`;
- `production_service_identity`;
- `host_authentication_truth`;
- `authorization`;
- `execution`;
- `payment`;
- `settlement`;
- `escrow`;
- `release`;
- `waiver`;
- `external_exactly_once`;
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
- `operator_blindness`; or
- `deletion_enforced`.
