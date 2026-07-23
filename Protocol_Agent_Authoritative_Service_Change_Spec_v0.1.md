# Cairn authoritative store and signed service-observation change spec v0.1

**Status:** local design candidate; not independently audited, implemented, or
conforming

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
7. constructs and signs the service observation from the staged facts;
8. persists the result and observation;
9. advances one monotonically increasing service commit sequence; and
10. commits all changes together or rolls all of them back.

Validation failure commits nothing. Signer failure commits nothing. Observation
construction failure commits nothing. Database serialization failure returns a
retryable service error and commits nothing.

### 4.2 Accepted reads are state changes

A private read is not transactionally read-only. On a newly accepted private
read, nonce reservation, DataGrant disclosure decrement, signed observation,
and commit sequence advance MUST be one atomic commit.

Public `capabilities.get` and `runtime_binding.get` still reserve the signed
envelope nonce. They do not consume a DataGrant. Their observations label the
access class `public_read`.

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
  stored operation-bound result, do not rebuild objects, and do not decrement a
  grant again;
- same key + different fingerprint: return `idempotency_conflict` and commit
  nothing; and
- corrupt, missing, wrong-operation, wrong-owner, or wrong-result replay state:
  fail closed as service unavailable and do not perform new work.

### 4.4 Commit ordering

`commit_sequence` is allocated inside the same transaction and has no gaps from
rolled-back work. It orders committed Cairn reference-service state only. It is
not wall-clock truth and does not order external systems.

Each observation records:

- `snapshot_sequence_before`: the latest committed sequence visible when the
  transaction began;
- `commit_sequence`: the sequence allocated to this transaction; and
- `state_commitment_after`: a deterministic commitment to the authoritative rows
  after the staged change.

The reference implementation MAY compute the state commitment by hashing a JCS
array of every authoritative row in closed table/key order. A production mapping
MAY use an audited database-native snapshot/LSN plus a signed state-root scheme,
but it MUST NOT silently substitute an opaque cursor for a state commitment.

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
created_at                   service time
```

The profile and bundle hash are immutable for that store. Opening a store under a
different profile or bundle fails closed.

### 5.2 `objects`

```text
ref_key                      PK = JCS([schema, object_id, object_hash])
schema
object_id
object_hash
identity_key                 nullable unique JCS identity tuple
canonical_object_bytes       exact UTF-8 JCS bytes
retrieval_uri                unique
visibility                   public | private
principal_id                 null iff public
created_commit_sequence
```

Required constraints:

- `(schema, object_id, object_hash)` is unique;
- an occupied `identity_key` cannot point to byte-different content;
- a `ref_key` cannot be rebound to another URI, ACL, or object;
- canonical bytes re-hash to `object_hash`; and
- access metadata is receiver-derived, never caller supplied.

The ActiveIntent identity key remains
`JCS([schema, intent_id, revision])`. A byte-different fork at one revision fails.

### 5.3 Typed object indexes

The following indexes point only to existing `objects.ref_key` rows:

```text
runtime_bindings(runtime_key_id PK, ref_key UNIQUE)
data_grants(grant_ref_key PK)
effect_descriptors(effect_ref_key PK)
```

A runtime key cannot be rebound. Typed indexes cannot change an object's ACL or
canonical bytes.

### 5.4 `grant_state`

```text
grant_ref_key                PK/FK to data_grants
status                       active | revoked
revocation_nonce             integer
remaining_disclosures        integer >= 0
state_version                integer >= 0
updated_commit_sequence
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

### 5.5 `used_nonces`

```text
nonce                        PK
envelope_hash                exact accepted envelope
operation_name
committed_sequence
```

The current kernel treats a nonce as service-global. The durable reference MUST
preserve that exact rule rather than quietly weakening it to a per-runtime nonce.

### 5.6 `idempotency_records`

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
observation_ref_key
created_commit_sequence
```

The row is insert-only. A replay may read it but never rewrite its fingerprint,
operation, owner, result, response, or observation.

### 5.7 `service_observations`

```text
observation_ref_key          PK
request_envelope_hash        UNIQUE
canonical_observation_bytes
principal_id                 nullable
visibility                   public | private
created_commit_sequence      UNIQUE
```

The observation inherits the response's privacy class. A private observation is
not a public transparency log entry.

## 6. Signed service observation v0.1

The first observation is a sidecar artifact produced by the external reference
composition. It is not a tenth operation and is not inserted into the frozen
kernel bundle.

```yaml
schema: cairn.service_observation.v0.1
observation_id: urn:uuid:<uuid>
service:
  service_id: cairn:reference-service
  profile: cairn-proposal-foundation-v0.1
  bundle_hash: sha-256:<exact bundle>
  store_id: <stable store id>
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
observed_at: <service time read once inside transaction>
transaction:
  isolation: serializable
  snapshot_sequence_before: 41
  commit_sequence: 42
  state_commitment_after: sha-256:<authoritative post-state commitment>
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
page:
  kind: single_result
  ordering: not_applicable
  boundary: null
  cursor: null
observation_hash: sha-256:<self hash>
service_signature: <Cairn Ed25519 signature>
not_claiming:
  - external_truth
  - delivery_to_caller
  - cross_page_continuity
  - authority_to_act
  - external_effect
```

### 6.1 Exact query commitment

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
declared_purpose                 null unless projection.get
intended_use                    null unless projection.get
filters                         []
ordering                        null
page_boundary                   null
```

Current operations return one exact object and do not paginate. Therefore the
page fields MUST use the explicit single-result/null values above. They MUST NOT
pretend to establish cross-page continuity.

### 6.2 Returned references

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

### 6.3 Signer and lifecycle

The observation is signed by the service key profile already required for
service-generated preparation objects. The verifier MUST:

- validate the schema, self-hash, signature, key controller, validity interval,
  exact service ID, profile, bundle hash, and store ID;
- bind the request envelope hash, body hash, authenticated actor/principal, and
  exact registered response schema;
- recompute the response hash and returned refs;
- verify commit-sequence and grant-effect arithmetic; and
- reject an observation whose claimed commit is absent from the authoritative
  store.

Historical verification may preserve a key that was valid at `observed_at`.
Historical proof does not make an expired returned object or grant current.

## 7. Response and delivery boundary

The service signs and stores the observation before committing. It sends the
existing kernel response body plus the sidecar only after commit.

The signed observation proves what the service committed and intended to return.
It does not prove that the caller received the bytes. Network loss after commit
is therefore labeled `delivery_to_caller` unknown.

Mutation retries recover the original result and original observation through the
idempotency row while reserving a fresh nonce. This change spec does not add
idempotent private-read delivery or an observation retrieval operation. A failed
private-read response delivery may consume its disclosure; that usability cost
must remain visible until a separately audited read-delivery design exists.

## 8. Failure and privacy rules

- Foreign private objects remain indistinguishable from absent objects.
- Detailed store, constraint, or signature failures are not returned to an
  unauthorized caller.
- Raw database errors, row values, canonical private bytes, state roots, and
  signer errors are not exposed in public error bodies.
- Observations for private operations are private objects under the same
  principal ACL.
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
| AS-02 | same idempotency tuple + same fingerprint + fresh nonces | one result; replay returns original; one grant charge |
| AS-03 | same idempotency tuple + different fingerprint | original remains; second `idempotency_conflict`; no second work |
| AS-04 | two reads race for one remaining disclosure | exactly one response/observation; counter ends at zero |
| AS-05 | multi-grant read where one counter is exhausted | no grant changes; no nonce reservation; no observation |
| AS-06 | byte-different object fork at one identity | exactly one identity survives; loser rolls back |
| AS-07 | same runtime key bound to different object | second binding rejected |
| AS-08 | signer fails after result staging | entire transaction rolls back |
| AS-09 | observation construction fails | entire transaction rolls back |
| AS-10 | stored observation signature byte changes | verifier rejects |
| AS-11 | observation request/body/response hash changes | verifier rejects |
| AS-12 | observation service/profile/bundle/store changes | verifier rejects |
| AS-13 | observation commit sequence has no committed row | verifier rejects |
| AS-14 | grant before/after arithmetic changes | verifier rejects |
| AS-15 | idempotency row points to wrong operation/result/owner | replay fails closed; no new work |
| AS-16 | process dies before database commit | no partial nonce/grant/object/observation state |
| AS-17 | process dies after commit but before response | committed state remains; delivery remains unknown |
| AS-18 | opaque cursor or pagination claim appears | schema/verifier rejects for this profile |
| AS-19 | private observation requested by foreign principal | same private-not-found result |
| AS-20 | any consequential operation name is submitted | `operation_unknown`; no state change |

Every accepted audit finding receives either a code/schema/test remediation or a
documented rejection/deferral. No finding may be closed only by prose if a direct
machine control is feasible.

## 10. Implementation order

### Phase A — freeze this design

1. Run independent architecture, privacy, database-race, and claim audits.
2. Resolve every P0/P1/material-P2 finding.
3. Freeze a reviewed design commit.

### Phase B — durable local reference

Outside `protocol/`:

1. implement a `MemoryReferenceStores`-compatible SQLite subclass or adapter;
2. use `BEGIN IMMEDIATE` plus database constraints for deterministic
   serializable local writes;
3. reload authoritative rows inside every transaction rather than trusting
   process memory;
4. persist exact canonical bytes and structural keys;
5. implement signed observation construction and verification;
6. run two separately invoked worker processes against one database file; and
7. implement AS-01 through AS-20.

The adapter MAY subclass the current memory store only to satisfy the frozen
composition boundary. Its transaction semantics MUST come from the database,
not inherited process-local Maps.

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

- a production or deployed service;
- authenticated transport or caller delivery;
- full BYO continuation delivery;
- pagination or cross-page continuity;
- runtime onboarding or grant issuance;
- authorization, execution, payment, settlement, escrow, release, or waiver;
- external-system idempotency or exactly-once effects;
- card authenticity, condition, custody, shipment, delivery, or legal identity;
- PostgreSQL equivalence from a SQLite test; or
- Cairn protocol conformance from an external reference composition.
