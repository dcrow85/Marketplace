# Protocol — Agent-Neutral Intent, Delegation & Interoperability v0.1

> **Status:** normative design specification; additive; not yet a claim of runtime,
> contract, payment-provider, or production conformance.
> **Date:** 2026-07-19.
> **Scope:** any agent acting for a principal through Cairn, including Anko and
> bring-your-own-agent runtimes.
> **Thesis:** the protocol holds durable user intent and the accountable action
> record; the agent remains replaceable.
> **Law:** a belief about the principal is not authority from the principal.
> **Spine:** enforced / legible / judged. No-overclaim remains law.

> **Machine adjunct (2026-07-20):** [`protocol/`](protocol/) now implements the
> first dependency-contained, proposal-only foundation: JSON Schema 2020-12
> objects, an operation registry, RFC 8785/JCS SHA-256 and Ed25519 vectors, a
> deterministic content-addressed bundle, and executable negative controls. It
> is not a network service and claims no Advisor, Supervised, Delegated,
> Settlement, Release, OpenAPI, MCP, or A2A conformance. Its author/independent-
> verifier gate remains open.

This specification closes the agent boundary left open by
[`Protocol_Architecture_Boundary_v0.1.md`](Protocol_Architecture_Boundary_v0.1.md)
and the continuity boundary only partly covered by
[`Protocol_Principal_Profile_v0.1.md`](Protocol_Principal_Profile_v0.1.md),
[`Protocol_Agent_API_v0.1.md`](Protocol_Agent_API_v0.1.md), and
[`Protocol_Interrupt_Bar_v0.1.md`](Protocol_Interrupt_Bar_v0.1.md).

It defines how a principal can express intent, let any conforming agent interpret
that intent, grant bounded authority, replace the agent mid-deal, and audit every
consequential action without handing the agent an unrestricted account, wallet,
or identity.

---

## 0. Epistemic posture

**Observation.** Cairn already has a thin enforced spine, typed legible packets,
judged policy, an interrupt policy, and a principal-profile claim lattice. Its
current reference surface can advise, prepare changes, request evidence, build a
pile, and guide checkout. Those parts exist at different maturity levels.

**Inference.** The missing primitive is not a more persistent chatbot. It is a
principal-custodied, transportable chain of intent, evidence, authority, action,
and receipt that a replacement agent can resume.

**Specification.** Cairn agent operation is the following chain:

```text
PrincipalProfile → ActiveIntent → ScopedProjection
                                      ↓
CardCopy → EvidenceSnapshot → DealDossier → AgentJudgment
                                      ↓
Proposal → ClosedTerms → ActionProposal
                        ↓
           AgentMandate | ActionAuthorization
                        ↓
     AuthorityReservation + InventoryReservation + EffectLease
                                      ↓
DeterministicGate → ActionRecord → ScopedExecutor → Receiver-backed ActionReceipt
                                      ↓
Fulfillment → Inspection → Release | Adjustment | Dispute
```

The chain is append-only at consequential boundaries. No arrow silently promotes
legible evidence or judged advice into authority.

**Open question.** Whether a principal should ever delegate release of escrow for
an uncertain physical item remains unresolved. v0.1 reserves it to the human by
default and makes a future release grant a distinct, optional capability.

## 1. Normative language, precedence, and nonclaims

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and
**MAY** are normative.

This document is additive. It does not change deployed contract behavior or
silently revise existing judged modules.

Precedence is narrow:

1. The deployed contract and its tested state machine remain authoritative about
   what is mechanically enforced on-chain.
2. The current module spec remains authoritative for its domain: profile claims,
   walls, evidence, arbitration, payment/custody, and human interruption.
3. This document is authoritative for agent identity, intent custody, delegation,
   action separation, portability, and transport interoperability.
4. Where an older agent-facing operation bundles powers that this document
   separates, the stricter separation here governs new agent implementations.
   The old operation may remain as a compatibility facade only if it internally
   executes the separate gates and returns their separate receipts.

In particular, `acceptOfferAndFundEscrow()` in the v0.1 Agent API MUST NOT be
interpreted as one permission. A conforming implementation separates:

```text
accept_terms ≠ authorize_payment ≠ fund_escrow ≠ release_escrow
prepare       ≠ communicate       ≠ commit_terms
```

No object in this specification claims that:

- a key is a person;
- a catalog match identifies a physical card;
- an image proves possession, authenticity, condition, or continuity;
- an agent judgment is objective truth;
- a signed mandate makes an unsafe action wise;
- a submitted payment is settled;
- an off-chain payment is escrowed;
- a delivery event proves the item arrived as represented.

## 2. Design laws

Every conforming implementation MUST preserve these laws.

### L1 — Principal custody

Durable intent and durable profile data belong to the principal. A provider MAY
host encrypted storage, but it MUST support principal-authorized export and MUST
NOT make continuity depend on one model's private conversation history.

### L2 — Runtime replaceability

An agent runtime is disposable. Replacing Anko, a model, a tool stack, or an agent
provider MUST NOT widen authority, erase open obligations, or require reconstructing
the deal from chat logs.

### L3 — Belief is not authority

Profile claims and agent inferences may shape search, sorting, advice, and questions.
Only an active, valid, scoped mandate or exact one-shot human action authorization
may authorize a public or consequential act.

### L4 — The model proposes; deterministic code disposes

A model MAY emit a typed `ActionProposal`. It MUST NOT validate its own authority,
reserve its own budget, hold an unrestricted signing key, or report its own attempted
action as externally confirmed completion.

### L5 — Independent powers

Read, recommend, prepare, communicate, negotiate, commit terms, move value, release
value, waive rights, and rule disputes are independent capabilities. Numeric
"autonomy levels" MAY summarize a grant for display but MUST NOT imply inherited
capabilities; the capability list controls.

### L6 — Intent is private by default

A buyer's maximum price, urgency, budget, private holdings, strategy, and risk
posture MUST NOT be disclosed merely because they informed an agent. A counterparty
receives the minimum `ScopedProjection` and proposal terms required for the action.

### L7 — Exact-copy continuity

For physical collectibles, a catalog entry and a physical copy are different
objects. Evidence, reservations, proposals, fulfillment, and inspection MUST bind
to an exact `CardCopy` when the transaction purports to concern one.

### L8 — Evidence is memory; authority is permission

An `EvidenceSnapshot` may inform advice or satisfy a documented evidence floor. It
does not grant authority. A mandate or gate pinned to an older snapshot becomes
stale when relevant evidence, terms, or copy identity changes.

### L9 — Receiver-confirmed effects

Prepared, authorized, submitted, acknowledged, and finalized are distinct states.
An action is not shown as completed until a receiver, payment provider, contract,
carrier, counterparty, or other named external authority confirms the relevant
effect.

### L10 — No ambiguous retry

An unknown outcome is a first-class state. The executor MUST reconcile by stable
action ID or provider reference before retrying a consequential action.

### L11 — Revocation is fresh

Every public, binding, value-moving, release, waiver, or dispute action MUST check
expiry and revocation at execution time. Cached approval is insufficient.

### L12 — No self-judging

An agent that proposed or executed a transaction MAY assemble a dispute record but
MUST NOT arbitrate that dispute or convert its own action log into independent proof.

## 3. Actors and trust boundaries

Agent identity is layered. The display name "Anko" is not a security principal.

| Actor | Responsibility | Must not be confused with |
|---|---|---|
| `Principal` | owns intent; grants/revokes authority | account key alone |
| `ConsentSurface` | shows exact grant; obtains principal signature | model output |
| `ProfileStore` | stores encrypted profile/intent and revisions | public market record |
| `AgentProvider` | operates an agent service | the model vendor |
| `AgentProduct` | named policy/product, e.g. Anko | one runtime session |
| `AgentRuntime` | short-lived execution identity | the principal |
| `Model` | produces judged outputs | deterministic authority gate |
| `CairnGateway` | validates envelopes and dispatches operations | truth oracle |
| `PolicyValidator` | evaluates mechanical policy and wall rules | verifier/arbiter |
| `AuthorityService` | verifies grants; reserves exposure atomically | model memory |
| `ScopedExecutor` | invokes one allowed external operation | general wallet/account |
| `Counterparty` | receives messages/terms or supplies goods | its agent |
| `EvidenceIssuer` | supplies a scoped claim or contact receipt | proof of reality |
| `PaymentProvider` | authorizes/captures/refunds payment | card-condition judge |
| `EscrowContract` | enforces programmed fund states | physical custodian |
| `Verifier` | issues scoped judged/legible attestations | arbiter |
| `Arbiter` | applies accepted dispute policy | either party's agent |

An agent request MUST identify at least:

```text
agent_provider_id
agent_product_id
runtime_instance_key_id
model_id_and_version
policy_hash
toolset_hash
session_id
```

A valid agent signature proves only which runtime key made the request. User
authorization requires a separate valid `AgentMandate` or a human-present action
signature.

Unless independently attested, `model_id`, `policy_hash`, and `toolset_hash` are
provider self-claims: legible audit metadata, not proof that the named model or
policy actually ran.

## 4. Common encoding and signed envelope

### 4.1 Scalar rules

- IDs MUST be globally unique and stable. v0.1 uses `urn:uuid:<uuid>`; the
  object's `schema` identifies its type. `urn:cairn` is forbidden unless a future
  registered URN namespace defines it.
- Timestamps MUST be RFC 3339 UTC timestamps with seconds.
- Durations MUST use integer seconds.
- Money MUST use an integer in the asset's smallest supported unit plus an asset
  identifier; binary floating point is forbidden.
- JSON parsers MUST reject duplicate member names, invalid Unicode scalar values,
  non-I-JSON numbers, integers outside schema-declared ranges, and any value that
  cannot be represented identically by the required RFC 8785/JCS implementation.
- Hashes MUST name the algorithm. v0.1 requires `sha-256` for off-chain objects.
- JSON objects MUST be canonicalized with RFC 8785 before hashing.
- An EVM-bound object MUST additionally name its EIP-712 typed-data digest or
  EIP-191 signed-data digest, according to a separately named profile, and its
  Keccak hash. A SHA-256/JCS object hash and an EVM digest are distinct identifiers
  and MUST NOT be compared as if they were the same hash.
- Unknown fields MUST be preserved by relays but MUST NOT influence a gate unless
  declared in `critical_extensions` and understood by the evaluator.
- Secrets, raw payment credentials, private keys, and bearer tokens MUST NOT appear
  in protocol objects or model context.

### 4.2 Common object hash, reference, and signature

Every schema MUST name exactly one self-hash field, one object-ID field, and all
signature/proof fields.
For every signed Cairn object:

1. `hash_material` is the object with only its schema-declared self-hash JSON
   Pointer and the `signed_hash` plus proof-value members at each exact
   schema-declared signature pointer removed. Signature profile, key ID, signing
   time, and every other member remain authenticated. No field is excluded merely
   because an implementation considers it transport metadata.
2. Referenced-object hashes remain in `hash_material`.
3. `object_hash = SHA-256(RFC8785-JCS(hash_material))`.
4. A signature signs the ASCII domain-separated value
   `cairn-object-v0.1\n<schema>\n<object_hash>`.
5. Adding or replacing only proof bytes and their cyclic `signed_hash` does not
   change `object_hash`; changing signature metadata does. A nested proof member is
   included unless its exact pointer is named.
6. EVM profiles derive a separate EIP-712 typed-data digest from named fields in
   `hash_material`; EIP-191 is not a typed-data substitute.

v0.1's mandatory off-chain proof profile is `cairn-ed25519-v0.1`: Ed25519 with
64-byte signatures and 32-byte public keys, both base64url encoded without padding.
Optional EIP-712/WebAuthn profiles require separately published schema-specific
test vectors before a conformance claim.

```yaml
ObjectRef:
  schema: <schema id>
  object_id: urn:uuid:<uuid>
  object_hash: sha-256:<hex>

Signature:
  profile: cairn-ed25519-v0.1
  key_id: <HTTPS/JWK or registered protocol key reference>
  signed_hash: sha-256:<hex>
  signed_at: <time>
  value: <base64url Ed25519 signature>
```

Key resolution MUST return key type, owner/controller claim, status, `not_before`,
expiry, and revocation time. Failure to resolve current status fails closed for a
consequential action. A valid key still proves key control, not personhood.

### 4.3 `CairnEnvelope`

Every Cairn mutation, signed private read, and imported external event after adapter
normalization uses this transport-neutral envelope. Public discovery/capability
GETs and transport-native authenticated read-only GETs are the explicit exceptions
defined in §20.1; their responses are enveloped. Original PSP, chain, carrier, or
external-protocol bytes/reference remain attached through a provider/contact import
receipt.

```yaml
schema: cairn.envelope.v0.1
protocol_version: "0.1"
message_id: urn:uuid:<uuid>
message_type: <one operation from §20.1>
created_at: 2026-07-19T18:00:00Z
expires_at: 2026-07-19T18:05:00Z
sender:
  actor_id: <stable actor or agent-provider id>
  runtime_key_id: <optional for a human actor>
principal_id: <principal whose authority is relevant, if any>
audience: [<intended actor/service ids>]
subject_refs: [<intent, deal, copy, proposal, or action ids>]
authorization_refs: [<exact DataGrant or other authorization ObjectRefs>]
nonce: <single-use random value>
idempotency_key: <required for mutations>
operation_fingerprint: sha-256:<canonical authoritative operation fields>
critical_extensions: []
body_schema: cairn.action_proposal.v0.1
body: <typed object>
body_hash: sha-256:<hex>
trace:
  parent_message_id: <optional>
  correlation_id: <stable workflow id>
envelope_hash: sha-256:<hex>
signature:
  key_id: <resolvable key id>
  profile: cairn-ed25519-v0.1
  signed_at: 2026-07-19T18:00:00Z
  signed_hash: sha-256:<envelope object hash>
  value: <base64url signature>
```

For `CairnEnvelope`, `body_hash = SHA-256(JCS(body))`. Its `hash_material` contains
every envelope member except `envelope_hash`, `signature.signed_hash`, and
`signature.value`. In particular, signature profile/key/time, sender, principal,
audience, subjects, authorization references, timestamps, nonce, idempotency key,
operation fingerprint, critical extensions, body schema/hash, and trace are all
signed.

The recipient MUST reject an expired envelope, exact replayed nonce, body-hash mismatch,
unknown critical extension, invalid audience, or unresolved/revoked signing key.
Key validity does not establish legal identity; the result remains labeled
`key_control_confirmed`, not `person_verified`.

Nonce replay and operation retry are distinct. A transport retry uses a new
`message_id`, nonce, timestamps, and signature but the same authority namespace,
idempotency key, and `operation_fingerprint`. The receiver stores:

```text
(authority_namespace, idempotency_key) → operation_fingerprint + result reference
```

The tuple is a structural key. When a byte/string store requires serialization,
v0.1 encodes it as RFC 8785/JCS of the two-element array
`[authority_namespace, idempotency_key]`; delimiter-joined text is forbidden
because delimiters may occur in either member and collapse distinct authority
namespaces onto one record.

Same key plus same fingerprint returns the original result. Same key plus a
different fingerprint returns `idempotency_conflict`. `operation_fingerprint`
excludes volatile envelope fields and hashes the exact capability, principal,
receiver/payee, deal head, terms/cart, copies, rail, amounts, evidence, and expected
effect.

## 5. Principal-owned persistence

### 5.1 `PrincipalProfile`

The canonical claim atom, source ceilings, version hash, correction receipts, and
allowed-use lattice are defined by
[`Protocol_Principal_Profile_v0.1.md`](Protocol_Principal_Profile_v0.1.md). This
specification adds no shortcut around them.

An agent MAY propose a profile patch. It MUST be stored as an
`inferred_candidate` unless the principal explicitly confirms it. An agent MUST
NOT silently rewrite a claim, the profile version, or a mandate.

For authority in this specification, imported claims are proposal inputs only
until the principal creates a `stated` or properly receipted `corrected` claim.
This is intentionally stricter than any reading that lets `imported` reach
`spend` or `waive`. The profile `allowed_uses` lattice limits the source of a
grant; the independent capability list in §8 defines the exact power granted.

### 5.2 `ActiveIntent`

An intent says what outcome the principal wants. It is not permission to act.

```yaml
schema: cairn.active_intent.v0.1
intent_id: urn:uuid:<uuid>
principal_id: <principal>
revision: 3
supersedes_revision: 2
intent_type: acquire | sell | trade | list | watch | inspect | complete_set | build_deck
domain: azuki_tcg
targets:
  - catalog_ref: <content-addressed catalog row>
    exact_copy_required: false
    quantity: 1
    substitution_policy: exact_print | listed_variants | ask_principal
stance: want | have | have_extra | sell | trade
constraints:
  condition_floor: <judged term or null>
  total_budget: {amount_minor: 4000, asset: USD}
  per_item_budget: {amount_minor: 2500, asset: USD}
  fees_included_in_budget: true
  evidence_policy_ref: <policy id>
  allowed_sellers: []
  blocked_sellers: []
  geography: []
  shipping_requirements: []
  allowed_rails: [cairn_escrow, paypal]
  deadline: <timestamp or null>
  substitutions_require_confirmation: true
attention_contract:
  interrupt_budget: 3
  reserved_judgments: [condition, authenticity_risk, rail_change, final_terms]
  default_if_unavailable: wait
privacy:
  disclosure_policy: minimum_necessary
  never_disclose: [total_budget, urgency, private_holdings, negotiation_strategy]
agent_posture: proposal_only | supervised_actions | mandate_allowed
source_claim_ids: []
initial_status: draft | active
created_at: <timestamp>
expires_at: <timestamp or null>
profile_version_hash: sha-256:<hex>
intent_hash: sha-256:<hex>
principal_signature: <signature>
consent_receipt_ref: <receipt describing the surface/ceremony; not authority alone>
not_claiming:
  - market_availability
  - authority_to_spend
  - authority_to_disclose_private_constraints
```

Only the principal may sign an `ActiveIntent` revision. An editor or agent may
create an unsigned proposed revision but cannot activate, broaden, satisfy,
revoke, or supersede the signed intent. Pause/revoke/status changes do not mutate
signed intent bytes; they are append-only control events.

Changing target, budget, rail, evidence floor, privacy policy, deadline, or
reserved judgments creates a new revision and a new hash. If the change is
authority-relevant, a mandate pinned to the older intent is stale and MUST fail;
carry-forward requires an explicit new signature. An unrelated profile edit still
follows the existing full-profile-version pin until a separately audited authority-
claims root exists.

### 5.3 `IntentControlEvent`

```yaml
schema: cairn.intent_control_event.v0.1
event_id: urn:uuid:<uuid>
intent_ref: <ObjectRef>
action: activate | pause | resume | satisfy | expire | revoke | supersede
prior_control_head_hash: sha-256:<hex or all-zero genesis>
authority_ref: <principal signature or exact principal-control authorization>
effective_at: <time>
event_hash: sha-256:<hex>
signature: <Signature>
not_claiming: []
```

Valid control transitions are:

```text
draft → active | revoked
active → paused | satisfied | expired | revoked | superseded
paused → active | expired | revoked | superseded
satisfied | expired | revoked | superseded are terminal
```

`expire` is emitted deterministically by the intent-control service only when the
signed intent's `expires_at` has passed; it does not require new principal discretion.
An agent may request a safety pause, but a Cairn control service records it under
an explicit principal policy or emergency-control rule. A mandate can never grant
an execution mode broader than the intent's current `agent_posture`.

### 5.4 `ScopedProjection`

A projection is the minimum purpose-bound view an agent or counterparty may use.

```yaml
schema: cairn.scoped_projection.v0.1
projection_id: urn:uuid:<uuid>
principal_id: <principal>
source_refs:
  profile_version_hash: sha-256:<hex>
  intent_id: <id>
  intent_revision: 3
  claim_ids: []
purpose: search | recommend | negotiate | checkout | fulfillment | dispute
audience: [<specific services or counterparties>]
data_uses: [read_local, derive]
disclosed_fields: <allowlisted data>
redacted_fields: [total_budget, private_holdings]
disclosure_authority_ref: <ObjectRef or null; required for external disclosure>
derived_at: <timestamp>
expires_at: <timestamp>
projection_hash: sha-256:<hex>
issuer_signature: <principal signature, or store signature backed by a separate
                   principal disclosure grant>
not_claiming: [authority_to_act]
```

The Cairn-controlled recipient MUST enforce purpose, audience, expiry, and data
uses. External recipient compliance is a legible contractual boundary, not a
technical guarantee. A projection MUST NOT be treated as an `AgentMandate`.

### 5.5 `DataGrant` and `DisclosureAuthorization`

```yaml
schema: cairn.data_grant.v0.1
grant_id: urn:uuid:<uuid>
principal_id: <principal>
recipient: <exact agent/runtime/service/counterparty>
resource_scopes:
  - resource_kind: object | runtime_binding | schema_bundle | service_manifest |
                   control_head | grant_head | service_endpoint
    ref: <ObjectRef; required except for a URI-only public schema artifact>
    retrieval_uri: <authorized HTTPS URI or immutable public URI>
    field_paths: [<one or more JSON Pointer scopes; "" means the whole resource>]
uses: [read_local, derive, disclose_to_audience, retain_until_expiry, write_object]
purpose: <purpose>
audience: [<one or more exact recipients>]
maximum_disclosures: <integer>
retention: {expires_at: <time>, deletion_terms: <terms>}
revocation_nonce: <integer>
disclosure_ledger_namespace: <authoritative principal/grant namespace>
issued_at: <time>
expires_at: <time>
grant_hash: sha-256:<hex>
principal_signature: <Signature>
not_claiming: [external_deletion_enforced]
```

`resource_scopes` is intentionally open to every typed Cairn resource rather than
an allowlist of today's application objects. A private reference is usable only
when the same scope entry pins its exact `ObjectRef`, retrieval URI, recipient,
purpose, and field paths. URI-only scope is allowed only for a public immutable
artifact whose digest is pinned by the referring object. A service endpoint grant
authorizes retrieval, not mutation; mutation still requires its own capability and
action authority.

`write_object` is the foundation profile's narrow storage permission. It applies
only to `intent.put` with an exact principal-signed `cairn.active_intent.v0.1`
body. It records that already-signed object and grants no proposal, acceptance,
payment, release, waiver, or other action authority.

A one-shot disclosure uses a separate, non-reusable object:

```yaml
schema: cairn.disclosure_authorization.v0.1
authorization_id: urn:uuid:<uuid>
principal_id: <principal>
data_grant_ref: <ObjectRef>
projection_ref: <ObjectRef>
field_paths: [<one or more JSON Pointer scopes>]
recipient: <exact audience>
recipient_encryption_key_ref: <key or null>
purpose: <purpose>
delivery_envelope_hash: sha-256:<hex>
action_proposal_ref: <ObjectRef>
principal_revocation_nonce: <integer>
issued_at: <time>
expires_at: <time>
authorization_hash: sha-256:<hex>
principal_signature: <Signature>
not_claiming: [receiver_read_payload, external_deletion_enforced]
```

A continuation handoff uses a typed specialization so its complete immutable
bundle and recipient runtime can be authorized without overloading a projection:

```yaml
schema: cairn.continuation_disclosure_authorization.v0.1
authorization_id: urn:uuid:<uuid>
principal_id: <principal>
recipient_actor_id: <exact receiving runtime actor/key id>
recipient_runtime_binding_ref: <ObjectRef>
recipient_runtime_binding_hash: sha-256:<hex>
bundle_ref: <ObjectRef>
bundle_hash: sha-256:<hex>
delivery_envelope_hash: sha-256:<hex>
disclosure_reservation:
  ledger_namespace: <authoritative namespace>
  reservation_id: urn:uuid:<uuid>
  fencing_token: <integer>
  principal_revocation_nonce: <integer>
  single_use_nonce: <unguessable value>
data_grant_refs: [<one or more exact ObjectRefs covering the complete graph>]
purpose: agent_continuation
one_shot: true
issued_at: <time>
expires_at: <time>
authorization_hash: sha-256:<hex>
principal_signature: <Signature>
not_claiming: [authority_transfer, mandate_transfer]
```

For the proposal-foundation machine profile, the signed
`disclosure_reservation` member is a handle into this closed authoritative state
record. It is validation state, not a signed receipt and not evidence that a
shared ledger service has been built:

```yaml
schema: cairn.continuation_disclosure_reservation_state.v0.1
ledger_namespace: <authoritative namespace>
reservation_id: urn:uuid:<uuid>
ledger_sequence: <monotonic integer>
principal_id: <principal>
state: active | consumed | released | expired
fencing_token: <integer>
single_use_nonce: <same value as the authorization handle>
authorization_ref: <exact continuation authorization ObjectRef>
authorization_hash: sha-256:<same authorization hash>
bundle_ref: <exact ContinuationBundle ObjectRef>
bundle_hash: sha-256:<same bundle hash>
recipient_actor_id: <exact receiving runtime actor/key id>
runtime_binding_ref: <exact runtime-binding ObjectRef>
runtime_binding_hash: sha-256:<same runtime-binding hash>
delivery_envelope_hash: sha-256:<hex>
principal_revocation_nonce: <same current principal nonce>
data_grant_refs: [<the exact authorization grant set>]
reserved_count: 1
created_at: <time>
expires_at: <time>
consumed_at: <time only when consumed; otherwise null>
```

Issuing either disclosure-authorization schema MUST atomically reserve one
disclosure in each grant's authoritative namespace. Grant count reservation,
remaining-count update, and fence issuance are one
serializable transaction shared by all agents. Delivery atomically consumes the
current fence and emits a `ReservationEventReceipt`; unknown delivery holds the
count until reconciliation. Empty field/audience sets deny disclosure. The
authorization is consumed on one
matching delivery-envelope hash and cannot be replayed with new payload bytes. A
profile store may issue a projection or continuation bundle only while a current
data grant explicitly authorizes that projection, recipient, purpose, and disclosure.
For a continuation, the reservation and delivery validator MUST match the exact
authorization ref/hash, bundle ref/hash, recipient actor, runtime-binding
ref/hash, delivery hash, grant-ref set, principal revocation nonce, fence, nonce,
and expiry. A generic projection authorization cannot authorize a continuation
bundle.

## 6. Exact-copy and evidence objects

### 6.1 `CardCopy`

```yaml
schema: cairn.card_copy.v0.1
copy_id: urn:uuid:<uuid>
catalog_ref: {catalog_hash: sha-256:<hex>, row_id: <row>}
controller_claim: {actor_id: <actor>, source_ref: <receipt>, observed_at: <time>}
physical_fingerprint_ref: <optional committed fingerprint>
condition_claims: []
variant_claims: []
evidence_refs: []
availability: unlisted | listed | reserved | committed | in_fulfillment | transferred | withdrawn
reservation_ref: <optional>
revision: 1
previous_copy_hash: sha-256:<hex or null>
state_writer_authority_ref: <principal/listing/reservation/receipt authority>
copy_hash: sha-256:<hex>
state_writer_signature: <Signature>
not_claiming:
  - authenticity
  - current_possession
  - condition_truth
  - catalog_match_is_physical_identity
```

A fungible low-value listing MAY defer creation of an exact copy until selection.
Any evidence request, bindable proposal, inventory reservation, fulfillment event,
or dispute about a specific physical card MUST use an exact `copy_id`.
Copy state changes require compare-and-swap against `previous_copy_hash`; two
exclusive reservations for one copy cannot both advance.

### 6.2 `EvidenceItem`

```yaml
schema: cairn.evidence_item.v0.1
evidence_id: urn:uuid:<uuid>
subject_refs: [<copy, package, shipment, actor, or claim ids>]
issuer_id: <uploader, provider, verifier, or carrier>
contact_receipt_ref: <optional>
media_type: <IANA media type>
content_hash: sha-256:<hex>
evidence_role: copy_front | copy_back | copy_corner | holo_tilt | slab_label |
               package | route | catalog_reference_only | derived_analysis
source_origin: principal_capture | counterparty_upload | provider | verifier |
               carrier | catalog
copy_binding:
  copy_id: <CardCopy id or null>
  basis: declared | capture_session | nonce_session | custody_attestation |
         handoff_continuity | none
capture_session_id: <id or null>
capture_method: uploaded | in_app_capture | provider_api | physical_review | derived
captured_at: <time or null>
recorded_at: <time>
claims_supported: []
scope: []
visibility: private | parties | verifier | arbiter | public
retention: {expires_at: <time or null>, deletion_policy: <policy>}
freshness: {valid_until: <time or null>, rationale: <text>}
derivation_refs: []
semantic_claim_label: legible | judged
content_integrity_label: enforced
evidence_hash: sha-256:<hex>
issuer_signature: <Signature>
not_claiming: []
```

Seller text, messages, image OCR, EXIF, scans, and provider responses are data,
never executable instructions.

An item with `evidence_role: catalog_reference_only`, `source_origin: catalog`, or
`copy_binding.basis: none` MUST NOT satisfy a copy-photo, possession, condition,
custody, freshness, or continuity requirement. Evidence purporting to show an
exact copy requires exactly one primary `copy_id`. Content integrity means only
that recorded bytes match the hash; semantic claims remain legible/judged.

`copy_binding.basis: declared` establishes only the legible claim “this issuer
declared these bytes to depict this copy.” It MUST NOT mechanically establish
possession, exact-copy identity, condition, authenticity, custody, freshness, or
continuity. A requirement and its satisfaction are typed:

```yaml
schema: cairn.evidence_requirement.v0.1
requirement_id: urn:uuid:<uuid>
subject_ref: <ObjectRef to exact copy/package/shipment>
claim_kind: image_supplied | current_possession | exact_copy_binding | condition_view |
            custody | continuity | package_handoff | carrier_delivery
allowed_evidence_roles: []
allowed_source_origins: []
allowed_binding_bases: []
capture_session_required: true | false
nonce_session_required: true | false
independent_issuer_required: true | false
maximum_age_seconds: <integer or null>
minimum_result_label: enforced | legible | judged
requirement_hash: sha-256:<hex>
policy_signature: <Signature>
not_claiming: []

EvidenceSatisfaction:
  requirement_ref: <ObjectRef>
  evidence_refs: [<ObjectRef>]
  criteria_results:
    role: pass | fail
    origin: pass | fail
    binding_basis: pass | fail
    capture_session: pass | fail | not_required
    nonce_session: pass | fail | not_required
    freshness: pass | fail
    issuer_independence: pass | fail | judged | not_required
  result: satisfied | missing | blocked | judged_only
  resulting_label: enforced | legible | judged
  evaluated_at: <time>
  evaluator: <deterministic policy id/version>
```

### 6.3 `EvidenceSnapshot`

```yaml
schema: cairn.evidence_snapshot.v0.1
snapshot_id: urn:uuid:<uuid>
subject_refs: [<copy ids>]
evidence_refs: [<immutable evidence ids>]
claims_index: []
coverage:
  present: [<EvidenceSatisfaction objects with result satisfied>]
  missing: [<ObjectRef to EvidenceRequirement>]
  blocked: [<EvidenceSatisfaction objects with result blocked>]
  waived:
    - requirement: <requirement>
      waiver_receipt_ref: <exact human/mandate-backed waiver receipt>
freshness_cutoff: <time>
created_at: <time>
supersedes: <snapshot id or null>
snapshot_hash: sha-256:<hex>
created_by: <deterministic assembler>
assembler_signature: <Signature>
not_claiming:
  - authenticity
  - professional_grade
  - continuity_after_capture
```

Snapshots are immutable and cannot create waivers. New evidence creates a new
snapshot. Any advice, proposal, or mandate pinned to a superseded snapshot MUST
be re-evaluated if the new evidence is relevant to its gate. New evidence may
satisfy a predetermined rule but MUST NOT silently widen release authority; a
changed release basis requires the exact existing rule or a new signature.

## 7. Deal continuity

### 7.1 `DealDossier`

A dossier is the shared, materialized continuity view, not a transcript and not
the compare-and-swap authority. Private principal state is a separate object.

```yaml
schema: cairn.deal_dossier.v0.1
deal_id: urn:uuid:<uuid>
shared_record:
  party_ids: []
  copy_refs: []
  proposal_chain: []
  current_terms_ref: <proposal or closed-terms id>
  evidence_snapshot_refs: []
  gate_result_refs: []
  action_receipt_refs: []
  fulfillment_refs: []
  dispute_refs: []
private_view_commitments:
  - principal_id: <pairwise owner id>
    encrypted_view_hash: sha-256:<hex>
head:
  sequence: 8
  event_ref: <ObjectRef>
  deal_head_hash: sha-256:<hex>
materialized_from_head_hash: sha-256:<hex>
state: exploring | negotiating | terms_pending | terms_closed | payment_pending |
       payment_satisfied | fulfillment | inspection | provisional_completion | disputed |
       adjusted | final | cancelled
updated_at: <time>
shared_record_hash: sha-256:<hex>
dossier_hash: sha-256:<hex>
materializer_signature: <Signature>
```

The shared record MUST NOT contain a party's reserve price, maximum budget,
private holdings, internal ranking, or hidden strategy unless that party explicitly
projects it for the named purpose and audience.

```yaml
schema: cairn.principal_deal_view.v0.1
view_id: urn:uuid:<uuid>
deal_id: <deal>
principal_id: <owner>
intent_projection_refs: [<ObjectRef>]
agent_judgment_refs: [<ObjectRef>]
private_unknowns: []
private_strategy_refs: []
audience: [<principal and specifically data-granted agents>]
encryption_ref: <envelope/key reference>
view_hash: sha-256:<hex>
issuer_signature: <Signature>
not_claiming: []
```

`GET deal` returns only the shared dossier plus purpose-authorized projections; it
never returns a principal view by default.

The authoritative `deal_head_hash` is the latest `DealEvent.event_hash`. Genesis
is a `deal_created` event whose previous head is the all-zero SHA-256 value. An
append succeeds only when the submitted previous head equals the authoritative
head. `shared_record_hash` is a materialized-view integrity hash, not CAS authority.

Valid shared-state transitions are:

```text
exploring → negotiating | terms_pending | cancelled
negotiating → terms_pending | cancelled
terms_pending → negotiating | terms_closed | cancelled
terms_closed → payment_pending | cancelled
payment_pending → payment_satisfied | adjusted | cancelled
payment_satisfied → fulfillment | disputed | adjusted
fulfillment → inspection | disputed | adjusted
inspection → provisional_completion | disputed | adjusted
disputed → adjusted | provisional_completion | cancelled
adjusted → payment_pending | fulfillment | inspection | provisional_completion | cancelled
provisional_completion → final | disputed
final | cancelled → audit events only
```

For a payment/funding action, `action_dispatch_claimed` advances `terms_closed` to
`payment_pending`; `payment_submitted` leaves it pending; and only a receiver-backed
`payment_confirmed` advances to `payment_satisfied`. The event records the exact
rail label (`captured`, `escrow_funded`, `settled`, or other provider state), so the
generic deal state never erases rail truth. Other action-dispatch events may leave
the dossier state unchanged while still advancing its head.

### 7.2 `AgentJudgment`

An agent's read is a versioned, judged artifact:

```yaml
schema: cairn.agent_judgment.v0.1
judgment_id: urn:uuid:<uuid>
agent_identity: <provider/product/runtime/model/policy/toolset tuple>
principal_id: <principal>
purpose: <decision being supported>
input_refs: [<intent revision, terms, evidence snapshot, market observations>]
observations: []
inferences: []
recommendation: <bounded next step or abstain>
alternatives: []
unknowns: []
stale_if:
  - field: evidence_snapshot_hash
    expected: sha-256:<hex>
  - field: terms_hash
    expected: sha-256:<hex>
authority_label: judged
created_at: <time>
expires_at: <time or null>
judgment_hash: sha-256:<hex>
issuer_signature: <agent runtime/provider signature>
not_claiming: []
```

`stale_if` MUST contain typed hash predicates, not prose. If terms, evidence, copy
identity, market reference, policy, or mandate named there changes, the surface
MUST mark the judgment stale before presenting an action based on it.

## 8. Authority model

### 8.1 Capability registry

v0.1 defines the following independent capabilities:

| Capability | Consequence | v0.1 default |
|---|---|---|
| `read_projection` | reads named private projection | explicit data grant |
| `disclose_projection` | releases named fields to a named audience | exact disclosure grant |
| `recommend` | creates private judged advice | allowed inside projection |
| `prepare` | stages a reversible private draft | allowed inside projection |
| `send_message` | sends non-binding text | human approval per send |
| `request_evidence` | sends a scoped evidence request | human approval per send |
| `publish_listing` | makes inventory/terms public | human approval per listing |
| `send_nonbinding_offer` | sends terms that cannot be accepted into a commitment | human approval per send |
| `send_bindable_offer` | creates terms the recipient may accept | separate grant + reservation |
| `send_counteroffer` | supersedes terms; may create exposure | separate grant + reservation if bindable |
| `reserve_inventory` | prevents another commitment | deterministic scope + expiry |
| `accept_terms` | closes a terms packet | human-present by default |
| `prepare_payment_instruction` | creates a non-charging provider order/token/call commitment | typed executor + disclosure grant |
| `authorize_payment` | authorizes one PSP/rail operation | single-use, human-present by default |
| `fund_escrow` | moves value into escrow | single-use, human-present by default |
| `mark_shipped` | asserts handoff/shipment | human or provider-attested |
| `confirm_receipt` | asserts receipt, not condition acceptance | human by default |
| `accept_inspection` | accepts the inspected item/condition for agreed terms | human-only by default |
| `release_escrow` | makes escrow payable/released | human-only by default |
| `request_adjustment` | proposes refund/partial refund/replacement | human approval per request |
| `authorize_refund` | moves value back under seller/provider policy | separate seller/provider authority |
| `open_dispute` | starts a rights-affecting process | human-only by default |
| `waive_right` | waives evidence, return, appeal, or protection | human-only |
| `rule_dispute` | issues a remedy decision | accepted independent arbiter only |

Implementations MAY add capabilities under a namespaced extension. An unknown
capability MUST fail closed. `send_bindable_offer` and `accept_terms` reserve
maximum exposure even before money moves because a counterparty can create the
commitment.

For human display only, the capabilities may be grouped as:

```text
A0 observe        A1 recommend       A2 prepare
A3 communicate    A4 negotiate       A5 commit terms
A6 move value     A7 release/settle  A8 waive/dispute/rule
```

This ladder is not inheritance. A grant for A6 does not imply A3–A5 or A7.

### 8.2 Source-use to capability eligibility

The Principal Profile lattice is a ceiling on which claims may support a grant;
it does not grant the capability. v0.1 uses this crosswalk:

| Claim ceiling reached | Capabilities that may draw on the claim, still requiring an exact grant |
|---|---|
| `glance_sort` | `read_projection` |
| `recommend` | `recommend`, `prepare` |
| `ask` | `send_message`, `request_evidence`, `publish_listing`, `send_nonbinding_offer` |
| `spend` | `send_bindable_offer`, `send_counteroffer`, `reserve_inventory`, `accept_terms`, `prepare_payment_instruction`, `authorize_payment`, `fund_escrow`, `request_adjustment`, `authorize_refund` |
| `waive` | `accept_inspection`, `release_escrow`, `waive_right` |

`disclose_projection` additionally requires a `DataGrant`. `open_dispute` requires
an exact principal rights authorization. `rule_dispute` derives only from an
accepted `ArbiterGrant`/JSC, never from profile claims. Capabilities remain
independent: reaching `spend` does not imply any other listed power.

### 8.3 `AgentRuntimeBinding`

```yaml
schema: cairn.agent_runtime_binding.v0.1
binding_id: urn:uuid:<uuid>
provider_id: <provider>
product_id: <product>
runtime_key_id: <Ed25519 key>
runtime_public_key: <base64url>
oauth_client_id: <client or null>
dpop_key_thumbprint: <JWK thumbprint or null>
model_id: <self-asserted audit metadata>
policy_hash: sha-256:<hex>
toolset_hash: sha-256:<hex>
not_before: <time>
expires_at: <time>
status_endpoint: <HTTPS key/binding status endpoint>
provider_signature: <Signature>
binding_hash: sha-256:<hex>
not_claiming: [model_execution_independently_attested, principal_authority]
```

The binding is provider identity metadata, not principal delegation. Rotation
creates a new binding. A mandate bound to the old runtime key does not migrate.

### 8.4 `AgentMandate`

This is a new complete schema, not a silent extension of
`marketplace.agent_mandate.v0.1`.

```yaml
schema: cairn.agent_mandate.v0.2
mandate_id: urn:uuid:<uuid>
principal_id: <principal>
agent:
  provider_id: <provider>
  product_id: <product>
  runtime_binding_ref: <ObjectRef>
execution_mode: supervised | preauthorized
capability: <exactly one enumerated capability>
scope_bindings:
  - intent_refs: []
    deal_ref: <ObjectRef or null>
    seller_id: <seller or null>
    copy_ids: []
    proposal_ref: <ObjectRef or null>
    cart_hash: sha-256:<hex or null>
    executor_target: <exact executor/service>
    ultimate_receiver_or_payee: <provider-canonical identity or null>
    payee_account_commitment: sha-256:<hex or null>
    rail: <rail or null>
    asset: <asset or null>
    data_grant_refs: [<ObjectRef>]
constraints:
  accounting_asset: <one asset id>
  assets: []
  rails: []
  chains: []
  per_action_limit: {amount_minor: <integer>, asset: <same accounting asset>}
  aggregate_limit: {amount_minor: <integer>, asset: <same accounting asset>}
  outstanding_exposure_limit: {amount_minor: <integer>, asset: <same accounting asset>}
  fee_limit: {amount_minor: <integer>, asset: <same accounting asset>}
  shipping_limit: {amount_minor: <integer>, asset: <same accounting asset>}
  price_corridor:
    minimum: {amount_minor: <integer>, asset: <same accounting asset>}
    maximum: {amount_minor: <integer>, asset: <same accounting asset>}
    comparison_basis: listed_price | recorded_settlement | exact_terms
  max_actions: 1
  rate_limit: {max_actions: <integer>, window_seconds: <integer>}
  evidence_requirements: []
  exact_terms_hash: null
  exact_cart_hash: null
  substitution_policy: none
  safe_default: wait | hold | expire | decline | cancel_if_not_submitted |
                release_never_submitted_local_hold
  not_before: <time>
  expires_at: <time>
reserved_judgments: []
source_authority_claim_ids: []
profile_version_hash: sha-256:<hex>
intent_hashes: []
policy_hash: sha-256:<hex>
revocation_nonce: <monotonic integer>
max_delegation_depth: 0
idempotency_namespace: <principal/mandate-scoped namespace>
confirmation_method: passkey | wallet_signature | account_reauth | provider_sca
confirmation_assurance: <named policy level adequate for this capability/value>
issued_at: <time>
mandate_hash: sha-256:<hex>
principal_signature: <signature>
not_claiming:
  - action_is_wise
  - evidence_is_true
  - payment_is_final
```

Empty authority sets mean deny, never wildcard. Wildcards require an explicit
typed selector and are forbidden for financial, release, waiver, dispute, private
disclosure, payee, and exact-copy fields. A missing/null numeric limit makes the
value-affecting capability unavailable; it never means unlimited. v0.1 mandates
use one accounting asset. Cross-asset aggregation fails closed unless a future
signed conversion profile defines source, timestamp, TTL, and conservative rounding.

All fees, tax, shipping, attention charges, and worst-case rail costs count toward
outstanding and aggregate exposure.

The gate MUST match one complete `scope_bindings` tuple. It MUST NOT select a copy
from one tuple, recipient/payee from another, and rail/data grant from a third.
Provider aliases are normalized to the provider-canonical receiver/account identity
before tuple comparison.

The effective reserved judgments are the union of profile/aperture, intent,
domain, and mandate reservations. A downstream object may add but never remove a
reservation. Only entries in an exact
`ActionAuthorization.reserved_judgments_decided` clear the named reservations for
that action hash; every applicable reservation requires its own typed decision.

Mandate validation MUST establish all of the following:

1. principal signature and confirmation method are valid for the requested power;
2. agent runtime proves possession of the pinned key;
3. profile/intent versions and authority claims are active and in scope;
4. capability, resource, recipient, data, rail, asset, amount, action count, time,
   evidence, and reserved-judgment constraints all match;
5. the current principal revocation nonce equals the mandate nonce;
6. the mandate and runtime key are not revoked or expired;
7. aggregate and outstanding exposure remain within limits after atomic reservation;
8. no critical extension is unknown;
9. the proposed action is not a forbidden onward delegation;
10. a separate domain gate does not block the action.

A principal may sign a human-present `ActionAuthorization` instead of a reusable
mandate. It uses the same constraint checks and binds exactly one proposal hash.

A legacy `marketplace.agent_mandate.v0.1` is proposal-only under this spec until
the principal signs a v0.2 replacement. Migration maps `spend_authority` to typed
limits, `seller_attention_fee_cap` to `fee_limit`, `waivable_gaps` only to a
separate `waive_right` mandate, `pre_authorizations` to capability-specific
mandates, and `default_if_unavailable` only to the safe-default allowlist. No
field absent from the legacy object is inferred as wildcard authority.

### 8.5 `ActionAuthorization`

This is the normal path when the human presses **Send**, **Buy**, **Accept**,
**Pay**, **Release**, or **Dispute** without granting durable authority.

```yaml
schema: cairn.action_authorization.v0.1
authorization_id: urn:uuid:<uuid>
principal_id: <principal>
action_proposal_hash: sha-256:<hex>
capability: <exactly one capability>
deal_id: <deal or null>
expected_deal_head_hash: sha-256:<hex or null>
authority_context:
  kind: direct_transaction | intent_bound
  profile_version_hash: sha-256:<hex or null>
  intent_hashes: []
terms_or_cart_hash: sha-256:<hex or null>
copy_ids: []
evidence_snapshot_hash: sha-256:<hex or null>
counterparties: []
target: <receiver/executor>
amounts: []
rail: <rail or null>
reserved_judgments_decided:
  - judgment: <exact reserved judgment>
    decision: <principal decision>
    basis_ref: <ObjectRef or null>
idempotency_key: <key>
expires_at: <short expiry>
principal_revocation_nonce: <integer>
confirmation_method: passkey | wallet_signature | account_reauth | provider_sca
confirmation_assurance: <named policy level adequate for this capability/value>
authorization_hash: sha-256:<hex>
principal_signature: <signature>
not_claiming: [execution_complete]
```

Changing any named field invalidates the authorization. A consent-surface receipt
MAY describe what the human saw but MUST NOT substitute for the principal signature.
The capability policy MUST name its minimum confirmation assurance. Account reauth
alone MUST NOT satisfy release, waiver, dispute ruling, high-value payment, or any
other capability whose policy requires phishing-resistant or transaction-bound
confirmation. Production assurance profiles and value thresholds remain gated
until schema-specific test vectors and consent-surface drills exist.

```yaml
schema: cairn.principal_control_authorization.v0.1
control_id: urn:uuid:<uuid>
principal_id: <principal>
control_action: pause_agent | resume_agent | revoke_mandate | revoke_data_grant |
                revoke_runtime | cancel_action | cancel_proposal
target_ref: <ObjectRef>
expected_target_state: <state>
expected_deal_head_hash: sha-256:<hex or null>
principal_revocation_nonce: <integer>
expires_at: <short expiry>
control_hash: sha-256:<hex>
principal_signature: <Signature>
not_claiming: [external_cancellation_confirmed]
```

A mandate cannot authorize its own revocation. Emergency revocation uses the
principal authority/recovery path. Cancelling an externally visible proposal or
action remains `submitted` until the receiver confirms cancellation; the control
authorization alone does not release exposure.

### 8.6 Permission language

Consent MUST name actor, action, scope, consequence, duration, and what remains
forbidden. Examples:

```text
Prepared by Anko — nothing has been sent.

Let Anko send up to 3 offers to Crowley between 80 and 90 USDC for these exact
cards until Sunday. No money can move, no card may be substituted, and Anko
cannot accept a counteroffer.

Allow one escrow payment up to 94 USDC to Crowley for this exact cart. This
permission expires in 20 minutes. It funds escrow; it does not release escrow,
waive missing evidence, or approve a changed cart.
```

The following are nonconforming because scope or consequence is ambiguous:

```text
Enable Anko
Full access
Handle this
Auto settle
Continue
```

## 9. Terms and negotiation

### 9.0 `PostedAskTerms` and `PostedAsk`

A public ask exists before a buyer or buyer-specific deal. It is not a partially
filled `Proposal`. Publication is deliberately two-stage so the seller-signed
economic terms can be reserved without a hash cycle, then exposed with the exact
inventory fence that backs them.

```yaml
schema: cairn.posted_ask_terms.v0.1
posted_ask_terms_id: urn:uuid:<uuid>
seller_id: <seller principal>
copy_ids: []
terms_template:
  seller_transfer_legs: []
  price_legs: [{amount_minor: <integer>, asset: <asset>}]
  payee_account_commitments:
    - rail: <rail/profile>
      provider_id: <provider>
      merchant_or_account_commitment: sha-256:<canonical provider account identity>
  shipping_policy_ref: <ObjectRef>
  inspection_policy_ref: <ObjectRef>
  dispute_policy_ref: <ObjectRef>
  allowed_instantiation_fields: [buyer_id, deal_id, destination_commitment,
                                 exact_shipping_quote]
  shipping_quote_bounds: []
acceptance_semantics: accept_by_exact_instantiation | fresh_seller_signature_required
evidence_snapshot_ref: <ObjectRef>
audience: public | [<specific principals>]
issued_at: <time>
expires_at: <time>
posted_ask_terms_hash: sha-256:<hex>
seller_signature: <Signature>
not_claiming: [copy_possession_beyond_evidence, authenticity, payment]
```

The inventory service next creates an `InventoryReservation` whose
`proposal_terms_or_listing_hash` is the exact `posted_ask_terms_hash`. Only then
may it publish:

```yaml
schema: cairn.posted_ask.v0.1
posted_ask_id: urn:uuid:<uuid>
posted_ask_terms_ref: <ObjectRef>
inventory_reservation_ref: <ObjectRef>
inventory_fencing_token: <integer>
published_at: <time>
posted_ask_hash: sha-256:<hex>
publisher_signature: <seller or authorized inventory-service Signature>
not_claiming: [buyer_acceptance, payment, physical_truth_beyond_evidence]
```

The publication validator resolves both references, verifies the seller signature
over the terms, and requires the reservation's listing hash, copy set, owner,
audience, expiry, active state, and fencing token to match. The `PostedAsk` expiry
is the earlier of its signed terms expiry and reservation expiry; it cannot extend
either. Withdrawing or expiring a publication never mutates its signed terms or
reservation history.

For `accept_by_exact_instantiation`, a deterministic derivation fills only the
declared slots and computes:

```text
derivation_hash = SHA-256(JCS({posted_ask_terms_hash, posted_ask_hash, filled_slots,
                              resulting_closed_terms_core_hash}))
```

No price, copy, rail, payee commitment, evidence epoch, inspection, dispute, or
shipping bound may change. A field not named in `allowed_instantiation_fields`
cannot be inferred. If the buyer-specific shipping quote exceeds the signed bound
or changes seller economics, a fresh seller signature is REQUIRED.

### 9.1 `Proposal`

```yaml
schema: cairn.proposal.v0.1
proposal_id: urn:uuid:<uuid>
deal_id: <deal>
revision: 4
supersedes: <proposal id or null>
author:
  principal_id: <party represented>
  agent_identity: <optional full tuple>
commitment_effect: inquiry | nonbinding | bindable
transfer_legs:
  - from: <party>
    to: <party>
    copy_ids: []
    money: [{amount_minor: 1200, asset: USD, rail: paypal}]
    payee_account_commitments: []
conditions:
  evidence_required: []
  shipping_terms: []
  inspection_terms: []
  return_terms: []
  dispute_policy_ref: <policy or null>
expires_at: <time>
evidence_snapshot_hash: sha-256:<hex>
intent_projection_refs: []
proposal_terms_hash: sha-256:<canonical terms excluding reservations/signatures>
reservation_refs: [<authority and/or inventory reservations bound to terms hash>]
proposal_hash: sha-256:<hex>
issuer_signature: <principal, mandate-backed executor, or both>
not_claiming: []
```

The terms are expressed as transfer legs rather than ambiguous "your side" and
"their side" labels. A surface translates them relative to the viewer as
**You receive** and **You give**.

A bindable proposal MUST have active reservations covering the maximum value and
inventory exposure it can create. Each reservation binds `proposal_terms_hash`,
breaking any circular dependency. `proposal.expires_at` MUST be no later than every
reservation expiry, and the receiver MUST enforce that expiry. An agent with only
`send_nonbinding_offer` MUST NOT set `commitment_effect: bindable`.

Proposal history is append-only. A counterproposal creates a new revision and
names the proposal it supersedes. Editing an existing signed proposal in place is
forbidden.

A proposal is live until the first authoritative event among receiver-enforced
expiry, accepted `ClosedTerms`, counterparty-confirmed withdrawal/cancellation, or
supersession that the original recipient acknowledges. Local supersession alone
does not release exposure. A proposal whose reservation is no longer active is not
bindable even if a stale external surface displays it.

### 9.2 `ClosedTerms`

Every acceptance is its own immutable object. Direct acceptance signs the exact
core. A seller's `PostedAskTerms`, carried by a valid `PostedAsk` publication, may
supply authority only through the exact derivation proof defined in §9.0.

```yaml
schema: cairn.terms_acceptance.v0.1
acceptance_id: urn:uuid:<uuid>
principal_id: <party>
party_role: <role>
closed_terms_core_hash: sha-256:<hex>
authority_basis_ref: <ObjectRef>
proof:
  kind: direct_core_signature | posted_ask_derivation
  direct_signature: <Signature or null over domain-separated core hash>
  posted_ask_ref: <ObjectRef or null>
  derivation_hash: sha-256:<hex or null>
accepted_at: <time>
expires_at: <time or null>
acceptance_hash: sha-256:<hex>
issuer_signature: <Signature>
not_claiming: [payment_complete]
```

For a direct proof, the principal signs
`cairn-closed-terms-acceptance-v0.1\n<principal_id>\n<closed_terms_core_hash>`.
For a derivation proof, the validator verifies the seller's `PostedAskTerms`
signature, the `PostedAsk` publisher signature, audience, both expiries, inventory
fence, allowed slots, bounds, and derivation hash; the terms-service
`issuer_signature` receipts that deterministic derivation but does not replace
seller authority.

The `TermsAcceptance` schema excludes `/acceptance_hash`,
`/proof/direct_signature`, and `/issuer_signature` from its acceptance-hash
material. All other proof fields, including posted-ask ref and derivation hash, are
included. Its ObjectRef uses `acceptance_hash` as `object_hash`.

```yaml
schema: cairn.closed_terms.v0.1
closed_terms_id: urn:uuid:<uuid>
closed_terms_core:
  deal_id: <deal>
  accepted_proposal_hash: sha-256:<hex>
  copy_ids: []
  money_legs: []
  rail_terms_refs: []
  evidence_snapshot_hash: sha-256:<hex>
  shipping_terms_hash: sha-256:<hex>
  inspection_terms_hash: sha-256:<hex>
  dispute_policy_hash: sha-256:<hex>
  payee_account_commitments: []
  required_signers: [<every principal whose funds, inventory, or rights change>]
  expires_if_unfunded_at: <time or null>
closed_terms_core_hash: sha-256:<hex>
acceptance_refs: [<ObjectRef to TermsAcceptance, sorted canonically>]
closed_at: <time>
closed_terms_hash: sha-256:<hex>
not_claiming: [payment_complete, fulfillment_complete]
```

`required_signers` is inside the signed core and is mechanically derived from all
transfer legs plus the accepted dispute policy; a caller cannot supply an empty or
reduced set. `acceptance_refs` are sorted by UTF-8 byte order of
`principal_id || 0x00 || party_role || 0x00 || acceptance_id`. Every ref must
resolve to an acceptance for the same core hash and a distinct required signer.
`closed_terms_hash` then follows §4.2 over the unsigned `ClosedTerms` object; no
nested signature or unspecified ordering enters that calculation.

Acceptance closes terms only. It MUST NOT move money unless a separate payment or
funding action is independently authorized and executed.

Every required signer must have a current authority chain for its affected leg.
Multi-party trades require all leg principals unless the proposal itself contains
a previously accepted explicit threshold policy. A posted seller ask contributes
a seller acceptance only through a valid §9.0 derivation; otherwise a fresh seller
core signature is required. The buyer closes terms only after the current seller
inventory reservation succeeds.

### 9.3 Evidence requests are deal terms

An evidence request sent during negotiation MUST state whether it is:

- informational and non-binding;
- a condition of the current proposal;
- a requested amendment to an existing proposal; or
- paid seller work represented as a proposal money leg and separately authorized
  `PaymentInstruction`.

The interface MUST show whether pressing the button only sends the request, adds
it to the offer, or does both through two separately previewed actions. Silence or
decorative chat text MUST NOT change the proposal.

## 10. Proposals, authorization, and reservations

### 10.1 `ActionProposal`

```yaml
schema: cairn.action_proposal.v0.1
action_proposal_id: urn:uuid:<uuid>
principal_id: <principal>
agent_identity: <full tuple or null when principal prepares directly>
capability: <one capability>
deal_id: <deal or null>
expected_deal_head_hash: sha-256:<hex or null>
target: <recipient, service, contract, or provider>
ultimate_effect_recipient: <counterparty/payee/account/copy owner or null>
ultimate_effect_account_commitment: sha-256:<hex or null>
effect_operation_kind: <receiver operation>
effect_provider_id: <provider/service/contract>
copy_ids: []
resource_refs: []
inputs_hash: sha-256:<hex>
terms_or_cart_hash: sha-256:<hex or null>
evidence_snapshot_hash: sha-256:<hex or null>
amounts: []
rail: <rail or null>
requested_execution_mode: supervised | preauthorized
authority_candidate_ref: <mandate id or null>
effect_descriptor_ref: <ObjectRef>
effect_id: sha-256:<EffectDescriptor semantic projection hash>
unknowns:
  - code: <typed unknown>
    blocking_capabilities: []
not_claiming: []
created_at: <time>
expires_at: <time>
action_proposal_hash: sha-256:<hex>
agent_signature: <signature>
```

An `ActionProposal` is non-authoritative. The agent MUST NOT mark it authorized
because the agent believes it matches the user's preference.

For commitment, payment, release, waiver, and dispute, any unknown affecting
target, ultimate recipient/payee, effect, amount, fees, rail, copy, terms,
authority, finality, or reserved judgment MUST block.

### 10.2 `AuthorityReservation`

```yaml
schema: cairn.authority_reservation.v0.1
reservation_id: urn:uuid:<uuid>
principal_id: <principal>
authority_basis:
  kind: mandate | action_authorization
  ref: <ObjectRef>
capability: <exact capability>
action_proposal_ref: <ObjectRef>
proposal_terms_or_cart_hash: sha-256:<hex>
effect_id: sha-256:<hex>
authority_ledger_namespace: <authoritative principal/asset namespace>
ledger_sequence: <monotonic integer>
authority_fencing_token: <monotonic token>
reserved_amounts: []
reserved_action_count: 1
principal_revocation_nonce: <integer>
created_at: <time>
expires_at: <time>
state: active | consumed | released | expired
reservation_hash: sha-256:<hex>
authority_service_signature: <signature>
not_claiming: [payment, receiver_acceptance]
```

Authority reservation creation, aggregate-budget accounting, outstanding-exposure
update, and action-count reservation MUST be one serializable transaction in the
principal's authority namespace. Concurrent agents MUST use that same namespace;
a local per-agent counter is insufficient.

### 10.3 `InventoryReservation`

```yaml
schema: cairn.inventory_reservation.v0.1
reservation_id: urn:uuid:<uuid>
inventory_owner_id: <seller/custodian principal>
copy_ids: []
proposal_terms_or_listing_hash: sha-256:<hex>
beneficiary_or_audience: <buyer/public listing/offer recipient>
exclusivity: exclusive | public_until_acceptance
inventory_ledger_namespace: <owner inventory namespace>
ledger_sequence: <integer>
inventory_fencing_token: <integer>
owner_authority_ref: <ObjectRef>
created_at: <time>
expires_at: <time>
state: active | committed_pending_deal | committed | consumed | released | expired
reservation_hash: sha-256:<hex>
issuer_signature: <Signature>
not_claiming: [physical_possession, authenticity]
```

An inventory owner or authorized inventory service serializes copy reservations.
A bindable transfer requiring both principal exposure and seller inventory uses
both reservations. They form a saga; Cairn MUST NOT call them globally atomic
unless one legitimately authorized transaction manager controls both resources.

For independently owned inventory during terms closure, the seller service first
consumes the current fence into `committed_pending_deal` and issues its receipt.
The deal service then CAS-appends `terms_closed` referencing that receipt. Only
after the append succeeds does inventory move to `committed`. If the append
conflicts, the copy remains fenced to the named buyer/deal until a typed
compensation/retry resolves it; it is never silently released or resold. The UI
does not surface `terms_closed` until both authoritative steps complete.

### 10.4 `EffectDescriptor` and `EffectLease`

Duplicate-effect identity is a typed object, not string concatenation:

```yaml
schema: cairn.effect_descriptor.v0.1
effect_descriptor_id: urn:uuid:<uuid>
executor_target: <scoped executor; operational binding, not economic identity>
effect_semantics:
  principal_id: <principal>
  capability: <exact capability>
  operation_kind: <receiver operation>
  provider_id: <provider/service/contract>
  ultimate_receiver:
    canonical_identity: <provider-normalized counterparty/payee/account/copy owner>
    account_commitment: sha-256:<hex or null>
  deal_id: <deal or null>
  closed_terms_or_cart_hash: sha-256:<hex or null>
  copy_ids: []
  rail: <rail or null>
  amounts_by_role:
    <registered role>: {amount_minor: <integer>, asset: <canonical asset id>}
effect_id: sha-256:<hex>
descriptor_hash: sha-256:<hex>
descriptor_issuer_signature: <Signature>
```

`effect_id = SHA-256(JCS(effect_semantics))`. The semantic projection excludes
`effect_descriptor_id`, `executor_target`, `effect_id`, `descriptor_hash`,
signature, timestamps, and all presentation or transport metadata.
`executor_target` remains bound by the descriptor hash, ActionProposal,
authorization, gate, and executor allowlist, but switching execution
infrastructure cannot fork an economic effect. `descriptor_hash` is the ordinary §4.2
hash of the complete unsigned descriptor and is the hash used by its `ObjectRef`.
Consequently a new descriptor UUID or signature for the same economic operation
cannot create a second effect identity. Bindings MUST use provider-canonical
account/receiver identifiers and schema-normalized money/rail fields. `copy_ids`
MUST contain unique canonical IDs in ascending UTF-8 byte order; duplicates or any
other order are rejected before hashing. Money is a JSON object, never an order-
sensitive list: every key is a registered semantic role such as `charged_total`,
`funded_total`, or `refunded_total`, and each role occurs at most once. RFC 8785
then canonically orders the keys. Aliases, presentation strings, executor choice,
duplicate copies, or array reordering are forbidden ways to alter identity.

```yaml
schema: cairn.effect_lease.v0.1
lease_id: urn:uuid:<uuid>
effect_id: sha-256:<hex>
effect_descriptor_ref: <ObjectRef>
principal_id: <principal>
action_ref: <ObjectRef>
authority_ref: <ObjectRef>
ultimate_receiver: <counterparty/payee/account>
provider_idempotency_key: <key or null>
single_use_provider_token_digest: sha-256:<hex or null>
state: claimed | dispatching | submitted | finalized | failed | unknown |
       released_after_reconciliation
revision: <integer>
previous_lease_hash: sha-256:<hex or null>
lease_sequence: <integer>
claimed_at: <time>
expires_at: <time>
dispatch_deadline: <time; min of authorization, instruction, and receiver-token expiry>
receiver_handoff_started_at: <time or null>
lease_hash: sha-256:<hex>
issuer_signature: <Signature>
```

The authority service claims one active lease per effect before redemption. A new
action ID or idempotency key cannot create the same effect while its lease is
claimed, dispatching, submitted, finalized, or unknown. Financial and rights effects require
provider-native idempotency or a receiver-enforced single-use order/token in
addition to the Cairn lease; Cairn does not claim global exactly-once behavior.

`expires_at` applies only while a pre-redemption lease is `claimed`. Redemption
atomically changes it to `dispatching`, but does not create an indefinite right to
make a first receiver call. `dispatch_deadline` is fixed at claim time to the
earliest authority, instruction, receiver-token, or action expiry. Immediately
before outbound handoff, a fenced executor rechecks that deadline and revocation,
then durably records `receiver_handoff_started_at` before its outbox/network worker
can access the request bytes. If no handoff marker exists when the deadline or a
later revocation arrives, the first call is forbidden; the executor proves from
the fenced outbox that submission was impossible and reconciles the lease without
an effect. If the marker exists, a receiver attempt may already have occurred, so
the lease remains non-expiring and blocking until authoritative reconciliation.
The same rule covers a crash after marking but before the network call: query the
receiver with the original idempotency key/token and never initiate a late first
call after the deadline. `submitted` and `unknown` likewise never auto-release. A
claimed lease may expire only when the action and deal logs prove redemption never
committed and dispatch never became possible.
A financial/rights `finalized` lease remains as a replay-protective tombstone.
Every transition emits a chained `EffectLeaseEventReceipt` naming prior/next lease
hash, sequence, state, action, receiver reference, and reconciliation basis.

Releasing a `dispatching` lease on a claim of confirmed non-submission additionally
requires this typed proof:

```yaml
schema: cairn.fenced_outbox_non_submission_proof.v0.1
proof_id: urn:uuid:<uuid>
action_ref: <ObjectRef to redemption_committed ActionRecord>
effect_id: sha-256:<hex>
effect_lease_ref: <ObjectRef to dispatching lease>
request_digest: sha-256:<exact receiver request bytes>
outbox_namespace: <authoritative executor namespace>
outbox_sequence: <monotonic integer>
worker_fencing_token_before: <integer>
worker_fencing_token_after: <strictly greater integer>
handoff_marker_state: absent
dispatch_deadline: <time>
principal_revocation_nonce_checked: <integer>
release_reason: dispatch_deadline_elapsed | revoked_before_handoff
sealed_without_submission_at: <time>
proof_hash: sha-256:<hex>
outbox_service_signature: <Signature>
not_claiming: [receiver_nonreceipt_outside_fenced_executor]
```

The authoritative outbox MUST make four changes in one serializable transaction:
verify the handoff marker is absent, seal the request bytes as unavailable to every
worker, advance the worker fencing token, and issue the proof. Every worker MUST
compare the current token immediately before obtaining request bytes or opening a
network call; a stale token cannot dispatch. Proof creation, lease transition to
`released_after_reconciliation`, ActionRecord transition to `failed`, and their
receipt references MUST share the same Cairn-controlled transaction boundary. If
those ledgers cannot participate in that boundary, the lease remains blocking and
the implementation cannot claim confirmed non-submission. The proof establishes
only that this fenced executor could not submit; it does not erase evidence of an
attempt by any separately authorized external actor.

Reservations are required for:

- a bindable offer another party can accept;
- acceptance of bindable terms;
- payment authorization or funding;
- inventory commitment;
- any other action that creates future value or inventory exposure.

A reservation is released only after an authoritative decline, external
cancellation, expiry that the receiver cannot accept, or definitive failure is
reconciled. A local cancellation or timeout is insufficient when a bindable offer
may still be live externally. Unknown outcomes keep exposure held. Release is an
append-only state transition; an executor MUST NOT simply delete the reservation.

Every reservation state change emits a signed `ReservationEventReceipt` with
previous state, next state, prior event hash, ledger sequence/fence, reason, and
receiver/cancellation reference. Acceptance consumes the current fence atomically;
an acceptance after reservation expiry or against an old fence fails.

## 11. Deterministic gate

### 11.1 `GateRequest`

```yaml
schema: cairn.gate_request.v0.1
gate_request_id: urn:uuid:<uuid>
action_proposal_ref: <ObjectRef>
action_proposal_hash: sha-256:<hex>
authority_ref: <ObjectRef>
reservation_refs: [<ObjectRef>]
current_refs:
  expected_deal_head_hash: sha-256:<hex or null>
  authority_context_kind: direct_transaction | intent_bound
  profile_version_hash: sha-256:<hex or null>
  intent_hashes: []
  terms_or_cart_hash: sha-256:<hex or null>
  evidence_snapshot_hash: sha-256:<hex or null>
  policy_hash: sha-256:<hex>
  principal_revocation_nonce: <integer>
requested_capability: <exact capability from §8.1>
domain_gate: <wall/escrow/provider gate or null>
requested_at: <time>
gate_request_hash: sha-256:<hex>
requester_signature: <Signature>
```

### 11.2 `GateResult`

```yaml
schema: cairn.gate_result.v0.1
gate_result_id: urn:uuid:<uuid>
gate_request_id: <request>
principal_id: <principal>
requested_capability: <exact capability>
action_proposal_hash: sha-256:<hex>
authority_hash: sha-256:<hex>
reservation_hashes: []
reservation_fencing_tokens: []
expected_deal_head_hash: sha-256:<hex or null>
authority_context_kind: direct_transaction | intent_bound
profile_version_hash: sha-256:<hex or null>
intent_hashes: []
terms_or_cart_hash: sha-256:<hex or null>
evidence_snapshot_hash: sha-256:<hex or null>
policy_hash: sha-256:<hex>
principal_revocation_nonce: <integer>
executor_id: <exact scoped executor>
authority_decision: allow | block
policy_decision: continue | request_evidence | interrupt | anomaly | pre_authorize
interrupt_lane: silent_continue | silent_request_evidence | decision_interrupt |
                authorization_interrupt | anomaly_interrupt | pre_authorize
authority_status: valid | missing | stale | exhausted | revoked | out_of_scope
claims:
  enforced: []
  legible: []
  judged: []
requirements:
  satisfied: []
  missing: []
unknowns: []
stale_refs: []
not_claiming: []
validator:
  name: <deterministic validator>
  version: <version>
  policy_hash: sha-256:<hex>
evaluated_at: <time>
expires_at: <short time>
gate_result_hash: sha-256:<hex>
validator_signature: <signature>
```

`authority_decision: allow` means the named mechanical policy and authority checks passed for the
exact referenced inputs. It does not mean the evidence is true or the action is
wise. A gate result MUST be short-lived and MUST be re-evaluated if any pinned
input changes.

`policy_decision: request_evidence` never sends a request. Sending is a separate
`request_evidence` ActionRecord with its own authority and receipt.

### 11.3 Evaluation order

The gate MUST evaluate, in order:

1. schema, canonical hash, signature, key status, audience, expiry, and replay;
2. current principal revocation nonce and runtime proof of possession;
3. profile/intent freshness when `intent_bound`, plus terms/evidence/policy freshness
   for every applicable action; a `direct_transaction` still requires an exact
   transaction-bound principal signature but no invented persistent intent;
4. capability, resource, recipient, data, rail, asset, amount, time, count, and
   reserved-judgment scope;
5. active reservation/fence and remaining aggregate exposure when §10 requires a
   reservation; no-exposure actions record that the check was not applicable;
6. domain walls and required mechanical preconditions;
7. anomaly and interrupt routing from the Interrupt Bar;
8. exact executor capability, effect-id availability, and receiver availability.

The first blocking result stops evaluation. Missing or judged physical facts do
not become `enforced` merely because a policy chooses to continue.

A gate result is not an execution lease. Immediately before external submission,
the scoped executor MUST atomically redeem:

```text
authority hash + live nonce + reservation IDs/fences + effect ID + action ID +
action-proposal hash + expected deal head + executor ID
```

Redemption checks the authoritative nonce again, compare-and-swaps the Cairn deal
head, moves the already claimed effect lease to non-expiring `dispatching`, consumes the one-shot/action-count capacity, and
moves the ActionRecord/reservations into `redemption_committed` under one Cairn-controlled
serializable redemption boundary. A deployment may satisfy this by co-locating
those ledgers or by a transaction coordinator with durable prepare/commit records
and fencing; it MUST NOT submit externally until every Cairn-controlled claim is
committed. A deployment unable to provide that boundary cannot claim supervised,
delegated, or settlement conformance. Seller inventory remains a separately owned
fenced resource and is coordinated as the §10 saga, never misdescribed as globally
atomic. Revocation between evaluation and committed redemption therefore blocks.
Revocation after committed redemption cannot erase that local authorized attempt
or its ActionReceipt. If receiver handoff has not begun, however, the pre-handoff
recheck in §10.4 blocks a first external call and reconciliation records a
confirmed non-submission. A prior `allow` alone is never sufficient.

For a deal-bound action, the same boundary appends a typed
`DealEvent(action_dispatch_claimed)` and the resulting event hash becomes the new
deal head; the redemption receipt references that event. For a non-deal action,
both expected/resulting deal heads are null and no deal CAS occurs. The external
call happens only after this local commit, and only that attempted call advances
the ActionRecord to `submitted` or `unknown` and appends the corresponding deal
event. A crash after redemption is reconciled from `redemption_committed` plus the
`dispatching` lease; neither may auto-expire and the action is never mislabeled
submitted. Before `dispatch_deadline`, re-entry may use the same action ID, effect
ID, and receiver-native idempotency key or single-use token. After the deadline,
an existing handoff marker permits query/reconciliation only, while absence of a
marker forbids the first receiver call and permits release only after the fenced
outbox proves non-submission. Re-entry never creates a replacement effect lease.

## 12. Execution and receipts

### 12.1 `ActionRecord` and state machine

```yaml
schema: cairn.action_record.v0.1
action_id: urn:uuid:<uuid>
action_proposal_ref: <ObjectRef>
principal_id: <principal>
capability: <one capability>
authorization_ref: <ObjectRef>
reservation_refs: [<ObjectRef>]
gate_result_ref: <ObjectRef>
expected_deal_head_hash: sha-256:<hex or null>
effect_id: sha-256:<hex>
idempotency_key: <key>
current_state: draft | prepared | authorization_pending | authorized | reserved |
               redemption_committed | submitted | acknowledged | finalized | failed | unknown |
               cancelled | expired
state_version: <integer>
last_transition_receipt_ref: <ObjectRef or null>
previous_action_ref: <ObjectRef or null>
materialized_from_receipt_hash: sha-256:<hex or null>
created_at: <time>
updated_at: <time>
action_hash: sha-256:<hex>
action_service_signature: <Signature>
not_claiming: [receiver_effect_before_confirmation]
```

```text
draft → prepared
prepared → authorization_pending | authorized
authorization_pending → authorized
authorized → reserved | redemption_committed
reserved → redemption_committed
redemption_committed → submitted | failed | unknown
submitted → acknowledged | failed | unknown
acknowledged → finalized | failed | unknown
unknown → acknowledged | finalized | failed     # reconciliation receipt only
draft | prepared | authorization_pending | authorized | reserved
  → cancelled | expired
```

`finalized`, `failed`, `cancelled`, and `expired` are terminal. No state moves
backward. Compensation, refund, reversal, or replacement is a new ActionRecord;
it never rewrites a terminal action.

Rules:

- `prepared` means nothing was sent.
- `authorized` means permission exists; it does not mean execution happened.
- `reserved` is REQUIRED only for capabilities listed in §10.4; an authorized
  no-exposure action may proceed directly to `redemption_committed`.
- `redemption_committed` means local authority/fences were consumed and the effect
  lease entered non-expiring `dispatching`;
- `redemption_committed → failed` is allowed only after a signed fenced-outbox
  reconciliation proves receiver handoff never began and the dispatch deadline or
  later revocation forbids a first call;
  it does not claim the receiver operation was attempted.
- `submitted` means the scoped executor attempted the operation.
- `acknowledged` means the receiver accepted the request, not necessarily its
  final economic or physical effect.
- `finalized` requires the receiver-specific finality rule.
- `unknown` blocks a new action with the same economic effect until reconciliation.
- cancellation cannot reverse an already irreversible receiver effect.
- every transition emits an immutable, chained `ActionReceipt`.

The receipt chain is authoritative and noncircular. An `ActionReceipt.action_ref`
references the pre-transition ActionRecord hash. After the receipt is signed, the
next materialized ActionRecord sets `previous_action_ref` to that prior snapshot and
`last_transition_receipt_ref` to the completed receipt. A receipt never references
the resulting ActionRecord. Preparation/authorization receipts are typed
`ActionReceipt` specializations or supplementary consent receipts referencing the
authoritative transition; they do not create a second state chain.

### 12.2 `ScopedExecutor`

A scoped executor is deterministic infrastructure, not an agent personality. Its
configuration is inspectable and capability-specific:

```yaml
schema: cairn.scoped_executor.v0.1
executor_id: <stable service/contract id>
executor_version: <version>
supported_capability: <exactly one capability>
allowed_targets: []
accepted_input_schema: <content-addressed schema>
credential_source: provider_vault | smart_account_permission | contract_call | none
credential_audience: <receiver>
maximum_effects: []
idempotency_support: native | cairn_wrapped | none
reconciliation_method: <provider query, chain query, counterparty receipt, or none>
policy_hash: sha-256:<hex>
key_id: <executor key>
executor_config_hash: sha-256:<hex>
operator_signature: <Signature>
not_claiming: [receiver_finality, physical_truth]
```

The executor MUST accept only an unexpired `allow` result for the exact action
proposal hash, recompute the target/amount/rail/copy/terms/evidence fields from
typed authoritative objects, and refuse any mismatch. It MUST NOT accept natural-
language instructions as execution parameters.

An executor with `idempotency_support: none` MUST NOT perform financial, binding,
release, waiver, or rights effects. v0.1 prohibits cross-capability composites.
Provider-internal substeps may be hidden only when they remain inside one capability
and the provider receipt exposes the final state relevant to that capability.

### 12.3 `ActionReceipt`

```yaml
schema: cairn.action_receipt.v0.1
receipt_id: urn:uuid:<uuid>
action_id: <action>
action_ref: <ObjectRef>
action_proposal_ref: <ObjectRef>
idempotency_key: <stable key>
effect_id: sha-256:<hex>
principal_id: <principal>
agent_identity: <full tuple or null for direct principal action>
capability_redeemed: <one capability>
authority_ref: <ObjectRef>
reservation_refs: [<ObjectRef>]
action_proposal_hash: sha-256:<hex>
gate_result_hash: sha-256:<hex>
closed_terms_or_cart_hash: sha-256:<hex or null>
evidence_snapshot_hash: sha-256:<hex or null>
target: <receiver>
audience: []
amounts: []
precondition_results: []
budget:
  before: []
  reserved: []
  spent: []
  remaining: []
receiver:
  operation_id: <provider/order/transaction/message id or null>
  result: not_attempted | submitted | acknowledged | finalized | rejected | unknown
  attestation_ref: <verified webhook, receiver signature, or chain receipt>
state_before: <state>
state_after: <state>
receipt_sequence: <integer>
previous_receipt_hash: sha-256:<hex or null>
transition: {from: <state>, to: <state>}
deal_head_before: sha-256:<hex or null>
deal_head_after: sha-256:<hex or null>
attempted_at: <time or null>
acknowledged_at: <time or null>
finalized_at: <time or null>
revocation_nonce_checked: <integer>
unknowns: []
not_claiming: []
executor_signature: <signature>
receipt_hash: sha-256:<hex>
```

Grant issuance and action execution require separate receipts. The executor's log
proves only what the executor attempted. Receiver confirmation is REQUIRED before
an external effect is labeled acknowledged or finalized and MUST be named on the
surface. If the receiver exposes no confirmation mechanism, state remains
`submitted` or `unknown` and that limitation is shown.

### 12.4 Required receipt families

The following receipts are REQUIRED where their event occurs. They MAY share the
common signed-object envelope, but their fields cannot be collapsed into prose.

Every receipt in this section MUST contain:

```yaml
schema: <receipt schema id below>
receipt_id: urn:uuid:<uuid>
issued_at: <time>
issuer: <stable actor/service id>
prior_receipt_or_event_hash: sha-256:<hex or null>
receipt_hash: sha-256:<hex>
issuer_signature: <Signature>
not_claiming: []
```

The common object-hash rule applies. A receipt that changes authoritative state
MUST name the previous and next state and MUST chain to the prior authoritative
receipt or event. At minimum, implementations use these complete schema families:

```yaml
cairn.authority_grant_receipt.v0.1:
  mandate_ref: <ObjectRef>
  principal_id: <principal>
  agent_identity: <bound agent>
  capability: <one capability>
  scope_bindings: []
  constraints: {}
  confirmation_method: <method>
  confirmation_assurance: <level>
  consent_surface_id: <surface/version>
  expires_at: <time>
  revocation_nonce: <integer>

cairn.action_authorization_receipt.v0.1:
  action_authorization_ref: <ObjectRef>
  action_proposal_ref: <ObjectRef>
  principal_id: <principal>
  capability: <one capability>
  confirmation_method: <method>
  confirmation_assurance: <level>
  consent_surface_id: <surface/version>
  expires_at: <time>
  principal_revocation_nonce: <integer>

cairn.action_preparation_receipt.v0.1:
  action_ref: <ObjectRef>
  action_proposal_ref: <ObjectRef>
  state_before: draft
  state_after: prepared
  prepared_for_principal: <principal>
  prepared_by_agent: <full agent identity, or null for principal-direct preparation>
  external_effect: false

cairn.disclosure_receipt.v0.1:
  projection_ref: <ObjectRef>
  data_grant_ref: <ObjectRef>
  disclosure_authorization_ref: <ObjectRef>
  principal_id: <principal>
  recipient: <audience>
  recipient_encryption_key_ref: <key or null>
  purpose: <purpose>
  field_paths_disclosed: []
  field_paths_redacted: []
  disclosed_payload_hash: sha-256:<hex>
  delivery_envelope_hash: sha-256:<hex>
  retention_terms: <terms>
  disclosed_at: <time>
  receiver_acknowledgement_ref: <ObjectRef or null>
  not_claiming: [recipient_deletion_enforced, receiver_read_payload]

cairn.reservation_event_receipt.v0.1:
  reservation_ref: <ObjectRef>
  reservation_kind: authority | inventory | disclosure
  state_before: <state>
  state_after: <state>
  ledger_sequence: <integer>
  fencing_token: <integer>
  reason: <stable code>
  receiver_or_cancellation_ref: <ObjectRef or null>

cairn.effect_lease_event_receipt.v0.1:
  effect_lease_ref: <ObjectRef>
  prior_lease_hash: sha-256:<hex>
  next_lease_hash: sha-256:<hex>
  lease_sequence: <integer>
  state_before: <state>
  state_after: <state>
  action_ref: <ObjectRef>
  dispatch_deadline: <time>
  receiver_handoff_started_at: <time or null>
  non_submission_proof_ref: <ObjectRef or null>
  receiver_or_reconciliation_ref: <ObjectRef or null>

cairn.execution_redemption_receipt.v0.1:
  action_ref: <ObjectRef>
  gate_result_ref: <ObjectRef>
  authority_ref: <ObjectRef>
  reservation_refs: []
  reservation_fencing_tokens: []
  effect_lease_ref: <ObjectRef>
  effect_lease_state_after: dispatching
  expected_principal_revocation_nonce: <integer>
  expected_deal_head_hash: sha-256:<hex or null>
  executor_id: <executor>
  redemption_state: committed | aborted
  resulting_deal_head_hash: sha-256:<hex or null>
  dispatch_claimed_deal_event_ref: <ObjectRef or null>
  committed_at: <time or null>
  abort_code: <stable code or null>

cairn.reconciliation_receipt.v0.1:
  action_ref: <ObjectRef>
  prior_action_receipt_ref: <ObjectRef>
  prior_state: redemption_committed | submitted | unknown
  prior_effect_lease_state: dispatching | submitted | unknown
  reconciliation_basis: receiver_query | fenced_outbox_non_submission
  receiver_query: <provider/chain/counterparty reference or null>
  receiver_result: <receiver state | confirmed_not_handed_off>
  non_submission_proof_ref: <ObjectRef or null>
  resulting_state: <state>
  reservation_disposition: <state>
  reconciled_at: <time>
  receiver_attestation_ref: <reference or null>

cairn.revocation_receipt.v0.1:
  principal_id: <principal>
  revoked_object_ref: <ObjectRef>
  prior_nonce: <integer>
  new_nonce: <integer>
  effective_at: <time>
  outstanding_actions: []
  blocked_future_capabilities: []
  not_claiming: [irreversible_actions_undone]

cairn.fulfillment_receipt.v0.1:
  deal_id: <deal>
  action_ref: <ObjectRef>
  copy_and_package_refs: []
  fulfillment_state_before: <state>
  fulfillment_state_after: <state>
  carrier_or_counterparty_import_ref: <ObjectRef>
  not_claiming: [physical_contents, condition, authenticity]

cairn.receipt_confirmation_receipt.v0.1:
  deal_id: <deal>
  action_ref: <ObjectRef>
  confirming_principal: <principal>
  copy_and_package_refs: []
  received_at: <time>
  condition_accepted: false
  not_claiming: [condition_acceptance, authenticity]

cairn.inspection_decision_receipt.v0.1:
  deal_id: <deal>
  action_ref: <ObjectRef>
  inspection_evidence_snapshot_ref: <ObjectRef>
  decision: accept | request_adjustment | open_dispute
  reserved_judgments_decided: []
  principal_authorization_ref: <ObjectRef>
  not_claiming: [objective_condition, authenticity]

cairn.dispute_open_receipt.v0.1:
  deal_id: <deal>
  action_ref: <ObjectRef>
  claim_refs: []
  evidence_snapshot_refs: []
  accepted_jsc_or_policy_ref: <ObjectRef>
  rights_deadline_state: <state>

cairn.dispute_ruling_receipt.v0.1:
  deal_id: <deal>
  arbiter_grant_ref: <ObjectRef>
  ruling_action_ref: <ObjectRef>
  record_head_hash: sha-256:<hex>
  remedy: <typed allowed remedy>
  appeal_or_stay_state: <state>
  not_claiming: [physical_truth, independence_beyond_disclosed_graph]

cairn.adjustment_receipt.v0.1:
  deal_id: <deal>
  adjustment_action_ref: <ObjectRef>
  prior_terms_or_ruling_ref: <ObjectRef>
  changed_transfer_legs: []
  provider_receipt_refs: []
  resulting_deal_state: <state>

cairn.final_deal_receipt.v0.1:
  deal_id: <deal>
  final_deal_head_hash: sha-256:<hex>
  closed_terms_ref: <ObjectRef>
  final_action_receipt_refs: []
  fulfillment_receipt_refs: []
  inspection_or_dispute_receipt_refs: []
  transfer_legs: []
  required_party_acknowledgements: []
  unresolved_claims: []
  final_state: final | cancelled
  finalized_at: <time>
  not_claiming: [physical_authenticity, legal_finality_beyond_named_policy]
```

For principal-direct preparation, `ActionProposal.agent_identity` and
`ActionPreparationReceipt.prepared_by_agent` are both null, and the proposal key
controller is the principal. For agent preparation, the proposal signing key is
the claimed runtime key and its controller is the claimed agent provider. In both
branches the action and proposal MUST match on principal, capability, effect ID,
and expected deal-head hash.

The signed reservation object proves only the reservation snapshot; each change
uses `cairn.reservation_event_receipt.v0.1`. A separate receiver receipt is
REQUIRED before a self-authored executor receipt may be surfaced as receiver-
confirmed finality. Audit fields store paths and hashes rather than unnecessary
private values.

For `ReconciliationReceipt`, `reconciliation_basis` is a discriminant. With
`receiver_query`, `receiver_query` and `receiver_attestation_ref` are REQUIRED,
`receiver_result` is the exact receiver state, and `non_submission_proof_ref` is
null. With `fenced_outbox_non_submission`, both receiver-reference fields are
null, `receiver_result` is exactly `confirmed_not_handed_off`, and a valid
`non_submission_proof_ref` is REQUIRED. Inventing a provider response for a
no-handoff path, or using an outbox proof after receiver handoff, is a schema and
gate failure.

### 12.5 Reconciliation

Executors MUST use stable action IDs and idempotency keys.

| Failure | Required response |
|---|---|
| offer sent, no response received | mark `unknown`; query by action ID; do not create a new offer |
| PSP approved, Cairn timed out | query provider and wait for verified webhook |
| chain transaction submitted, UI timed out | query transaction hash before resubmission |
| payment captured, inventory unavailable | enter adjustment/refund path; do not retry purchase |
| revocation during flight | cancel if still reversible; otherwise receipt the irreversible effect |
| provider state conflicts with local state | quarantine workflow and surface anomaly |

### 12.6 Golden trace: human-present purchase at a posted ask

This trace is normative for object ordering. It deliberately separates terms,
inventory, human authorization, value reservation, execution, and confirmation.

| # | Actor | Object/operation | Required state or invariant |
|---:|---|---|---|
| 1 | seller | `CardCopy` + typed `EvidenceSnapshot` | exact copy/evidence epoch exist; catalog art and declared-only bindings cannot satisfy exact-copy facts |
| 2 | seller | `PostedAskTerms` | copy, price, payee commitments, rails, evidence, policies, bounds, audience, expiry, and derivation semantics are seller-signed |
| 3 | seller inventory service | `InventoryReservation` | public-until-acceptance/exclusive policy and current seller fence bind the posted-ask-terms hash |
| 4 | seller inventory service | `PostedAsk` publication | final publication binds the signed terms to the exact active reservation and fence; no hash cycle |
| 5 | deal service | `deal.create` | buyer-specific deal/head exists; direct checkout need not invent a durable ActiveIntent |
| 6 | terms service | draft `closed_terms_core` | deterministic §9.0 instantiation fills only seller-authorized slots |
| 7 | terms service | seller `TermsAcceptance(posted_ask_derivation)` | terms/publication signatures, audience, expiries, fence, payee, evidence, bounds, and derivation hash verify |
| 8 | buyer/agent | `ActionProposal(accept_terms)` | private preparation pins draft core, seller acceptance, copy, evidence, exposure, and deal head |
| 9 | buyer | buyer `TermsAcceptance` + `ActionAuthorization(accept_terms)` | one ceremony creates two distinct signed objects over the same core/action; direct-transaction context, short expiry |
| 10 | authority service | `AuthorityReservation` + receipt | maximum bindable exposure held against the one-shot authorization |
| 11 | action service | `ActionRecord` + preparation/authorization receipts | action reaches `reserved`; no acceptance published yet |
| 12 | policy validator | `GateRequest` → `GateResult` | exact action/acceptances/authority/fences/nonces/head/evidence/policy checked |
| 13 | redemption coordinator | local redemption | action reaches `redemption_committed`; effect lease enters non-expiring `dispatching`; authority fence consumed; `action_dispatch_claimed` advances deal head |
| 14 | seller inventory service | commit inventory saga | seller fence becomes `committed_pending_deal`; signed inventory receipt returned |
| 15 | terms/deal services | `ClosedTerms` + `DealEvent(terms_closed)` | sorted acceptance refs close terms; CAS append references inventory receipt; inventory then becomes committed |
| 16 | action service | receiver-backed acceptance `ActionReceipt` | action finalized by deal-service receipt; conflict retains/compensates seller fence and never surfaces closed terms |
| 17 | buyer/agent | `ActionProposal(prepare_payment_instruction)` | exact rail/provider/payee/cart disclosure prepared; still cannot charge |
| 18 | buyer | disclosure authorization + one-shot action authorization | permits exact non-charging provider order/token/call preparation only |
| 19 | scoped preparation executor/provider adapter | prepare order/token/call + import receipt | exact immutable receiver commitment created before payment authorization |
| 20 | payment service | `PaymentInstruction` + `EffectDescriptor` | exact payee, provider operation, item/tax/shipping/fees/total, rail, commitment digest, and semantic effect ID pinned |
| 21 | buyer/agent | `ActionProposal(authorize_payment or fund_escrow)` | exact instruction/terms/effect/deal head pinned |
| 22 | buyer | `ActionAuthorization` | transaction-bound confirmation; one action; no release/waiver power |
| 23 | authority/action services | `AuthorityReservation` + ActionRecord | worst-case total exposure held; state reaches reserved; nothing charged/funded |
| 24 | policy validator | `GateRequest` → `GateResult` | exact action/authority/fences/nonces/payee/head/policy checked; allow is not a lease |
| 25 | redemption coordinator | local redemption | reaches `redemption_committed`; effect lease enters `dispatching`; appends `action_dispatch_claimed`, moving deal to `payment_pending` |
| 26 | scoped executor | provider submission | receiver call attempted; ActionRecord → submitted/unknown; `payment_submitted` event and chained receipt emitted |
| 27 | provider/adapter | `ProviderEventCore` → import envelope → `ProviderImportReceipt` → `ProviderPaymentReceipt` | authenticated source and exact payee/amount/rail state imported without a receipt-hash cycle |
| 28 | action/deal services | receiver-backed receipt + `payment_confirmed` | only rail-specific finality advances action and deal to `payment_satisfied`; unknown remains blocked |
| 29 | parties/providers | fulfillment/inspection/dispute/final receipts | rights, release, refund, ruling, and final deal remain separately authorized and receipted |

At any numbered step, changed terms, copy, payee, total, rail, evidence snapshot,
authority nonce, reservation fence, effect lease, or deal head invalidates the next
consequential transition. A PayPal popup, biometric prompt, wallet return, or local
success screen cannot skip steps 26–28 or substitute for provider confirmation.

## 13. Payment, escrow, and release

### 13.1 Required separations

The following are distinct capabilities or receiver-specific ActionRecord states;
they are not permission aliases:

```text
ClosedTerms
PaymentAuthorization
PaymentSubmission
PaymentAcknowledgement
EscrowFunding
Fulfillment
ReceiptConfirmation
InspectionDecision
EscrowRelease
Refund or Adjustment
```

An escrow-funding grant MUST NOT authorize release. A payment grant MUST NOT
authorize a changed seller, cart, amount, asset, rail, evidence snapshot, or
shipping term.

The names map normatively as follows:

```text
PaymentAuthorization   capability authorize_payment + exact PaymentInstruction
PaymentPreparation     capability prepare_payment_instruction; no charge/fund effect
PaymentSubmission      ActionRecord → submitted
PaymentAcknowledgement ActionReceipt → acknowledged
EscrowFunding          capability fund_escrow; finalized by chain/provider receipt
Fulfillment            typed DealEvent + provider/counterparty receipt
ReceiptConfirmation    capability confirm_receipt
InspectionDecision     capability accept_inspection or open_dispute
EscrowRelease          capability release_escrow
Refund/Adjustment      capability authorize_refund / request_adjustment
```

### 13.2 `PaymentInstruction` and provider receipt

```yaml
schema: cairn.payment_instruction.v0.1
payment_instruction_id: urn:uuid:<uuid>
principal_id: <payer principal>
seller_id: <seller principal>
payee:
  provider_id: <PayPal/PSP/contract/rail>
  merchant_or_account_id: <exact receiver account identifier or commitment>
operation: authorize | capture | fund_escrow | refund
provider_operation_id: <exact precommitted provider order/operation id or null>
closed_terms_ref: <ObjectRef>
cart_hash: sha-256:<hex>
amounts:
  item: {amount_minor: <integer>, asset: <asset>}
  tax: {amount_minor: <integer>, asset: <same asset>}
  shipping: {amount_minor: <integer>, asset: <same asset>}
  fees: {amount_minor: <integer>, asset: <same asset>}
  total: {amount_minor: <integer>, asset: <same asset>}
rail: <exact rail/profile>
receiver_order_token_or_call_digest: sha-256:<hex>
effect_id: sha-256:<hex>
idempotency_key: <provider/Cairn key>
single_use: true
expires_at: <time>
confirmation_method: <method>
instruction_hash: sha-256:<hex>
not_claiming: [provider_acceptance, settlement, physical_truth]
```

`target` at the executor is not enough: the instruction binds both the provider
and the ultimate merchant/payee account. Any substitution invalidates authority.

Before human authorization, a `prepare_payment_instruction` executor MAY create a
non-charging, single-use provider order/token or deterministic contract-call
commitment. That preparation is an external disclosure/effect with its own
authorization, ActionRecord, provider/contact receipt, and idempotency key; it may
not charge, capture, fund, or reserve principal money. The resulting immutable
digest is included in `PaymentInstruction`, displayed to the human, and signed by
the later `ActionAuthorization`. The instruction MUST NOT be mutated after that
signature. A provider that cannot precommit the exact payee/amount/cart/currency/
operation uses a later separately authorized instruction rather than an unbound
token.

Imported provider state is first normalized as an immutable core that contains no
Cairn receipt or envelope reference:

```yaml
schema: cairn.provider_event_core.v0.1
provider_event_id: urn:uuid:<uuid>
provider_id: <provider/contract/carrier/counterparty>
provider_operation_id: <stable provider id or null>
event_kind: payment | order | shipment | counterparty_acknowledgement
operation: authorize | capture | fund_escrow | refund | other
rail_profile: <exact rail/profile; REQUIRED for payment, otherwise null>
provider_state: created | approved | authorized | captured | funded | settled |
                declined | reversed | chargeback | refunded | unknown | other
payee_account_commitment: sha-256:<canonical payee identity or null>
receiver_order_token_or_call_digest: sha-256:<exact digest from PaymentInstruction;
                                           REQUIRED for payment>
effect_id: sha-256:<exact Cairn effect id; REQUIRED for payment>
monetary_role: authorized_total | charged_total | funded_total | refunded_total |
               null  # REQUIRED non-null for payment
amount: {amount_minor: <integer>, asset: <asset>} | null  # REQUIRED for payment
source_event_id: <provider id or null>
occurred_at: <provider time or null>
observed_at: <adapter observation time>
core_hash: sha-256:<hex>
not_claiming: [source_authenticity, provider_finality, physical_truth]
```

The adapter computes `core_hash`, then places that exact core (or its ObjectRef) in
a signed Cairn import envelope. Only after the envelope exists may it issue:

```yaml
schema: cairn.provider_import_receipt.v0.1
import_receipt_id: urn:uuid:<uuid>
adapter_id: <adapter implementation and version>
provider_event_core_ref: <ObjectRef>
original_payload_digest: sha-256:<hex>
original_payload_reference: <immutable/provider reference>
verification_method: webhook_signature | provider_api | chain_query |
                     counterparty_signature | carrier_api
verification_result: valid | invalid | unavailable
import_envelope_ref: <ObjectRef>
imported_at: <time>
import_hash: sha-256:<hex>
adapter_signature: <Signature>
not_claiming: [provider_truth_beyond_named_state, physical_truth]
```

```yaml
schema: cairn.provider_payment_receipt.v0.1
receipt_id: urn:uuid:<uuid>
payment_instruction_ref: <ObjectRef>
provider_event_core_ref: <same ObjectRef verified by import receipt>
provider_import_receipt_ref: <ObjectRef>
operation: <exact operation copied from ProviderEventCore>
rail_profile: <exact rail/profile copied from ProviderEventCore>
provider_state: <exact state copied from ProviderEventCore>
receiver_order_token_or_call_digest: <exact digest copied from ProviderEventCore>
effect_id: <exact effect id copied from ProviderEventCore>
monetary_role: <exact role copied from ProviderEventCore>
amount: <exact amount copied from ProviderEventCore>
payee_account_commitment: <exact commitment copied from ProviderEventCore>
observed_at: <time>
provider_attestation_ref: <verified webhook/signature/chain receipt carried by import>
reversal_or_chargeback_surface: <terms>
receipt_hash: sha-256:<hex>
adapter_signature: <Signature>
not_claiming: [card_truth, escrow_when_off_chain]
```

Validation order is `ProviderEventCore` hash → import-envelope hash → import-receipt
hash → payment-receipt hash. No earlier object references a later receipt. The
payment receipt is valid only when the import verification is `valid`. When
`PaymentInstruction.provider_operation_id` is non-null, the core's operation ID
MUST equal it byte-for-byte. When it is null because a deterministic call has no
receiver ID before submission, the rail adapter MUST prove that the returned core
operation ID was created by the exact authenticated order/call commitment digest;
there is no unconstrained local-ID fallback. The core's operation, exact rail
profile, payee commitment, receiver-order/call digest, effect ID, monetary role,
amount, asset, and state MUST match the
signed `PaymentInstruction` and rail-specific finality rule. For v0.1, each
instruction authorizes one full-total provider operation: `authorize` maps to
`authorized_total`, `capture` to `charged_total`, `fund_escrow` to `funded_total`,
and `refund` to `refunded_total`; the event amount MUST equal
`PaymentInstruction.amounts.total`. A partial capture, installment, split tender,
or partial refund requires a separate PaymentInstruction with its own exact total,
effect ID, order/call digest, and authorization. An adapter MUST derive the order/
call digest and effect binding from authenticated provider order metadata or the
deterministic contract call; a local database assertion cannot create receiver
confirmation. Thus one valid provider event cannot be rebound to another cart,
instruction, effect, or rail merely because its payee and amount happen to match.

A provider secret/token is not a protocol object; only its digest, scoped
instruction, and outcome receipt enter Cairn.

A release grant, if a future profile permits one, MUST be separately signed,
short-lived, low-value, pinned to inspection and the named wall bundle. It is
blocked by any active `block`, `escalate`, unaccepted `waiver_required`, anomaly,
adjustment, or dispute under the agreed release policy. An accepted human waiver
is an explicit input; epistemic uncertainty is not falsely described as closed.

### 13.3 Payment credentials

The model and protocol objects MUST NOT receive raw card numbers, bank credentials,
wallet private keys, PSP bearer tokens, or unrestricted smart-account permissions.
A payment provider or deterministic wallet executor receives a single-use,
merchant/cart/amount/currency/expiry-bound token outside model context.

### 13.4 Rail truth

- Contract-confirmed stablecoin escrow may be labeled `escrow_funded` after the
  required confirmations. It does not prove the card.
- A provider-verified PayPal order may be labeled with the exact provider state.
- Opening PayPal, approving Face ID, or returning from a popup is not payment.
- A manual PayPal.Me payment plus "I paid" is a principal claim, not provider-
  verified settlement, and is ineligible for delegated execution in v0.1.
- Cash, Zelle, or other off-chain payments may be recorded as legible claims but
  MUST NOT be described as held or protected by Cairn escrow.

### 13.5 Human-present posted-ask checkout

When a buyer accepts a seller's posted ask without changing terms, the surface
SHOULD provide a familiar checkout path:

```text
Review exact copies and seller → choose rail → authorize exact total → receiver
confirms payment/funding → fulfillment state
```

No negotiation step or "send offer" label is required. The absence of negotiation
does not collapse terms acceptance and payment authorization into one hidden act.

## 14. Fulfillment, inspection, and dispute

`mark_shipped`, `confirm_receipt`, `accept_inspection`, and `release_escrow` MUST
remain distinct. A carrier delivery event may open inspection but MUST NOT act as
the buyer's condition acceptance unless the pre-agreed contract mechanically uses
a disclosed timeout and the applicable alpha gates allow it.

An agent MAY:

- summarize shipping status;
- remind the principal of an inspection deadline;
- assemble arrival evidence;
- compare arrival evidence with the pinned pre-route snapshot;
- prepare an adjustment or dispute packet.

An agent MUST NOT, by default:

- attest that the physical card arrived;
- accept condition or authenticity risk;
- release escrow;
- waive a return, evidence, appeal, or dispute right;
- rule a dispute created by its own recommendation or action.

Dispute records are append-only and MUST preserve the accepted terms, pre-route
evidence snapshot, fulfillment events, arrival evidence, each party's claims,
the applicable JSC/policy, and all agent action receipts. A final ruling remains a
scoped judgment over that record, not proof of physical truth.

`rule_dispute` requires a typed grant independent of the transaction-agent grant:

```yaml
schema: cairn.arbiter_grant.v0.1
arbiter_grant_id: urn:uuid:<uuid>
deal_id: <deal>
arbiter:
  actor_id: <arbiter>
  provider_id: <provider>
  controller_ids: []
  common_control_disclosures: []
runtime_binding_ref: <ObjectRef or null>
accepted_jsc_or_policy_ref: <ObjectRef>
closed_terms_ref: <ObjectRef>
scope:
  claim_types: []
  evidence_snapshot_refs: []
  permitted_remedies: []
  remedy_limits: []
conflict_graph_hash: sha-256:<hex>
proposal_or_execution_ancestry: []
derived_required_party_acceptances: []
party_acceptance_refs: [<ObjectRef>]
fallback_or_appeal_policy_ref: <ObjectRef>
not_before: <time>
expires_at: <time>
grant_hash: sha-256:<hex>
grant_issuer_signature: <Signature>
not_claiming: [arbiter_independence_beyond_disclosed_graph, physical_truth]
```

Mechanical party/controller disjointness, disclosed common control, and absence
of proposal/execution ancestry are REQUIRED gate inputs. If economic or control
independence cannot be established mechanically, the surface labels independence
`judged`, never `enforced`, and applies the agreed fallback or human escalation.
Different product names, addresses, or runtime keys alone do not establish
independence.

The required arbiter-acceptance quorum is derived mechanically from every party
affected by `ClosedTerms` and the already accepted JSC/dispute policy. A caller-
supplied empty or reduced quorum fails. Every affected party signs unless the
closed terms already name an exact, deterministic selection mechanism and quorum;
the grant then proves that mechanism's output rather than inventing new consent.

## 15. Privacy, hostile data, and runtime containment

### 15.1 Data-scope ladder

Data access MUST be granted by purpose and audience. The default agent scope is
the lowest sufficient tier:

```text
D0 public catalog and public tables
D1 user prompt and active screen context
D2 locally computed collection summary
D3 exact selected holdings / named intent projection
D4 evidence metadata
D5 raw evidence media
D6 contact, shipping, and identity data
D7 payment authorization metadata
D8 raw payment credentials or signing secrets — forbidden to the model
```

Access to one tier does not imply higher tiers. A tool call may receive a narrower
scope than the model session. Shipping/contact data MUST be revealed only after
terms close and only to the exact fulfillment recipient, unless a separate pre-
terms logistics disclosure authorization exists. Evidence visibility MUST be
enforced independently from catalog visibility.

### 15.2 Selective disclosure

Before any external message, proposal, or standard adapter call, the gateway MUST
compute the disclosed field set from the applicable `ScopedProjection`. The audit
record MUST preserve:

```text
fields_considered
fields_disclosed
fields_redacted
audience
purpose
retention policy
projection hash
```

An agent MUST NOT reveal a buyer's maximum, seller's reserve, urgency, acquisition
cost, private holdings, or negotiation strategy unless the principal explicitly
authorizes that exact disclosure to that audience.

Projection purpose/retention terms remain enforceable inside Cairn-controlled
systems. Once data is disclosed to an external recipient, continued purpose and
deletion compliance are contractual/legible obligations, not a technical guarantee.
A `DisclosureReceipt` MUST name the exact fields actually released.

### 15.3 Indirect prompt injection

All third-party content is untrusted data, including:

- listing descriptions and seller messages;
- OCR or embedded text from card, package, and scan images;
- catalog/community notes;
- URLs, files, provider responses, and agent-to-agent messages;
- hidden metadata and retrieved web content.

Conforming runtimes MUST:

1. keep system policy, protocol objects, and untrusted content in distinct channels;
2. mark the provenance and taint of every retrieved field;
3. prevent untrusted content from selecting tools, recipients, data scope, mandate,
   rail, amount, or confirmation policy;
4. validate model output against an allowlisted schema and deterministic policy;
5. require the authority gate to recompute all consequential values from trusted
   objects rather than copy them from natural-language output;
6. preserve original evidence bytes immutably and render/parse them only in a
   non-executable sandbox; any sanitized preview gets its own hash and derivation
   reference, and taint propagates to every derived field;
7. log the source when untrusted content influenced a recommendation;
8. fail closed when the content/policy boundary cannot be established.

Unknown envelope fields are preserved for compatible relays but quarantined from
models, gates, and executors unless an understood schema explicitly admits them.
No prompt, message, image, or tool result can mint a principal-origin claim or
upgrade `allowed_uses`.

Authenticated structured provider fields may establish only their named provider
state. Provider free text remains tainted. A runtime MUST NOT rewrite evidence to
"remove" semantic instructions, because doing so damages the audit object and
still cannot guarantee detection of obfuscated injection.

### 15.4 Runtime isolation

For delegated/settlement conformance, the model MUST run without direct access to signing keys, bearer credentials,
payment instruments, unrestricted browsing sessions, or arbitrary network tools.
Executors MUST be capability-specific and accept typed inputs only after a current
`allow` gate result.

Isolation and destination-specific egress allowlisting are REQUIRED for every
financial/rights executor and every worker receiving D3+ private projections, raw
evidence, shipping/contact data, or payment metadata. A lower-risk advisor may use
a shared worker only when its DataGrant and network policy mechanically prevent
access beyond its declared tier.

## 16. Revocation, pause, delegation, and key rotation

### 16.1 Pause versus revoke

The principal MUST have two distinct controls:

- **Pause agent:** block new executions while retaining grants and workflow state.
- **Revoke permission:** increment the applicable revocation nonce or revoke the
  named mandate so future redemptions fail.

Pause is reversible. Revocation requires a new signature or new mandate to restore
authority. Neither control can undo an externally irreversible action already
accepted by a receiver.

### 16.2 Freshness rules

For communication, negotiation, commitment, value, release, waiver, and dispute:

- the gate MUST check the authoritative nonce online at execution;
- the result MUST NOT be cached past its short expiry;
- a network failure in the revocation check MUST fail closed;
- expiry MUST be bounded even when online revocation exists;
- a revoked runtime key invalidates mandates pinned to that key;
- key rotation MUST issue a new key binding and MUST NOT silently migrate grants.

Safe defaults when the human is unavailable are `wait`, `hold`, `expire`, `decline`,
`cancel_if_not_submitted`, or `release_never_submitted_local_hold`. The latter is
valid only when no external submission, receiver-visible proposal, or active EffectLease
ever existed; otherwise receiver-confirmed cancellation/expiry and reconciliation
are required. Safe defaults MUST NOT be `pay`,
`release_escrow`, `waive_right`, `disclose`, or `commit_terms` unless the exact act
was already separately preauthorized.

### 16.3 Onward delegation

`max_delegation_depth` is `0` in v0.1. An agent may call deterministic tools or
transport a packet, but it MUST NOT grant a child agent authority to act for the
principal. A sub-agent requiring consequential authority needs its own principal-
signed mandate.

Future delegation MUST attenuate capabilities, scope, budget, expiry, recipients,
and data access; preserve the parent chain; count child reservations against the
same aggregate; and cascade revocation. It is not part of v0.1 conformance.

## 17. Multi-agent continuity and replacement

### 17.1 Multiple agents

A principal MAY use several agents concurrently. Each has a separate identity,
data grant, mandate, and audit trail. Agents MUST NOT infer permission from another
agent's access or copy another agent's mandate. All consequential agents for one
principal MUST share the authoritative reservation/exposure namespace.

Deal events use compare-and-swap continuity:

```yaml
schema: cairn.deal_event.v0.1
event_id: urn:uuid:<uuid>
deal_id: <deal>
sequence: 9
previous_head_hash: sha-256:<hex>
event_type: deal_created | intent_projection_attached | copy_selected |
            evidence_snapshot_attached | proposal_presented | proposal_superseded |
            terms_closed | reservation_held | reservation_released |
            action_prepared | action_dispatch_claimed | action_submitted |
            action_finalized | payment_submitted | payment_confirmed |
            fulfillment_recorded | inspection_opened | dispute_opened |
            adjustment_recorded | provisional_completion | deal_finalized |
            deal_cancelled
object_ref: <ObjectRef>
actor_id: <actor>
authority_label: enforced | legible | judged
occurred_at: <time>
event_hash: sha-256:<hex>
signature: <signature>
not_claiming: []
```

Exactly one append against the current head may succeed. A stale page or concurrent
agent receives `deal_head_conflict` and MUST reload before preparing a replacement
action. `event_hash` uses the common object hash rule. Genesis is `deal_created`
with sequence `0` and the all-zero SHA-256 previous head.

### 17.2 `ContinuationBundle`

```yaml
schema: cairn.continuation_bundle.v0.1
bundle_id: urn:uuid:<uuid>
principal_id: <principal>
recipient_runtime_binding:
  ref: <ObjectRef>
  retrieval_uri: <authorized HTTPS URI>
  data_grant_ref: <ObjectRef>
schema_bundle:
  ref: <content-addressed ObjectRef>
  retrieval_uri: <authorized HTTPS URI or immutable public URI>
  data_grant_ref: <ObjectRef or null only when public>
object_service_manifest:
  ref: <ObjectRef to signed service manifest>
  retrieval_uri: <authorized HTTPS URI or immutable public URI>
  data_grant_ref: <ObjectRef or null only when public>
items:
  - ref: <ObjectRef>
    retrieval_uri: <authorized HTTPS URI>
    data_grant_ref: <ObjectRef>
    required_for: state | source | unknown | legal_next_action
current_intent_control_heads:
  - {ref: <ObjectRef>, retrieval_uri: <authorized HTTPS URI>, data_grant_ref: <ObjectRef>}
current_deal_heads:
  - {ref: <ObjectRef>, retrieval_uri: <authorized HTTPS URI>, data_grant_ref: <ObjectRef>}
current_action_reservation_service_refs:
  - {ref: <ObjectRef>, retrieval_uri: <authorized HTTPS URI>, data_grant_ref: <ObjectRef>}
current_grant_status_and_revocation_refs:
  - {ref: <ObjectRef>, retrieval_uri: <authorized HTTPS URI>, data_grant_ref: <ObjectRef>}
unresolved_unknown_refs:
  - {ref: <ObjectRef>, retrieval_uri: <authorized HTTPS URI>, data_grant_ref: <ObjectRef>}
issued_at: <time>
expires_at: <time>
bundle_hash: sha-256:<hex>
issuer_signature: <principal signature, or store signature backed by a separate
                   principal continuity/disclosure grant>
not_claiming: [authority_transfer]
```

The bundle transfers context, not authority. Its one-shot
`ContinuationDisclosureAuthorization` is an adjacent object that binds the
complete `bundle_ref` and `bundle_hash`, `recipient_actor_id`, and exact recipient
runtime-binding ref/hash; it is not included
inside the bundle and therefore creates no hash cycle. Every non-public top-level
reference, head, service reference, and item carries its own retrieval URI and
exact DataGrant reference. The continuation authorization's `data_grant_refs`
set MUST cover each
of those resource triples for this recipient and purpose. Agent B retrieves from
the named service, verifies each `ObjectRef.object_hash`, and rejects any object,
URI, field, head, or service omitted from the grant. The schema bundle must resolve
every referenced schema. Unknown details are never inline escape hatches: each is
a typed, content-addressed object in `unresolved_unknown_refs` with grant-scoped
field paths. Even a private budget, holding, strategy, or dispute fact carried only
to explain uncertainty therefore remains inside the same authorized graph. A
replacement agent needs a new mandate bound to its own runtime identity.

### 17.3 BYO-agent replacement test

This is a release-blocking conformance test:

1. Anko and Agent B publish independent identities, manifests, and keys.
2. Build a profile, active intent, exact-copy evidence snapshot, and deal dossier
   using only documented Cairn objects.
3. Issue a mandate bound to Anko.
4. Anko reads the allowed projection, prepares advice and a draft, and receives a
   valid preparation receipt.
5. Disable Anko and revoke its resource grant.
6. Give Agent B only discovery documents and a `ContinuationBundle`: no private
   Anko prompt, chat transcript, database access, or privileged endpoint. Issue the
   exact DataGrant/ContinuationDisclosureAuthorization bound to Agent B's
   `recipient_actor_id`, runtime-binding ref/hash, and complete bundle ref/hash.
7. Agent B resolves every item through the signed service manifest and
   `object.resolve`, verifies schema/content hashes and current control/grant heads,
   and reproduces the current deal state, sources, unknowns, and legal next
   actions.
8. Agent B attempts to use Anko's mandate. The gate MUST reject `wrong_agent`.
9. The principal issues a new mandate to Agent B against the same pinned intent and
   profile versions.
10. Agent B executes an in-scope supervised action and receives the same receipt
    semantics as Anko.
11. Agent B attempts an out-of-scope amount, stale nonce, reserved judgment, and
    wrong copy. Each MUST fail before an external effect.
12. Send a byte-different envelope with the same authority namespace,
    idempotency key, and operation fingerprint. The original result returns and no
    second effect occurs.
13. Reuse that namespace/key with a different operation fingerprint. The result is
    `idempotency_conflict`.
14. Revoke Agent B. Future redemptions fail while prior receipts remain verifiable.

Pass requires no Anko-only route, no transferred authority, exact uncertainty and
source preservation, deterministic idempotency, and independently verifiable
receipts.

## 18. Discovery and capability negotiation

### 18.1 `AgentCapabilityManifest`

The canonical manifest URI MUST be directly configured, registry-resolved, or
derived from an A2A Agent Card. Until Cairn registers a well-known suffix and
media type, implementations use ordinary `application/json` with a profile
link and an in-document schema URI. As a non-normative convenience, an HTTPS agent
MAY publish:

```text
GET /.well-known/cairn-agent.json
Content-Type: application/json
Link: <https://cairn.cards/protocol/manifest/0.1>; rel="profile"
```

Neither the suffix nor a Cairn-specific media type is represented here as IANA-
registered. Convenience discovery cannot be the sole production trust anchor.

```yaml
schema: cairn.agent_capability_manifest.v0.1
$schema: <immutable JSON Schema URI>
manifest_version: "0.1"
agent_id: <stable URI identifying the agent product/service>
manifest_uri: <canonical HTTPS retrieval URI>
agent_version: <implementation version>
name: <display name>
provider: {name: <name>, uri: <uri>}
issued_at: <time>
expires_at: <time>
protocol:
  preferred_version: "0.1"
  supported_versions: ["0.1"]
interfaces:
  - binding: cairn-http | mcp | a2a
    endpoint: <uri>
    protocol_version: <binding version>
    media_type: <media type>
capabilities:
  - id: <capability>
    version: "0.1"
    input_schema: <immutable or content-addressed schema uri>
    output_schema: <immutable or content-addressed schema uri>
    effect: read | draft | external_state | financial | rights
    authority: none | projection | human_confirmation | mandate | arbiter_grant
    idempotent: true | false
    confirmation: none | before_external_effect | per_mandate
security:
  oauth_resource_identifier: <URI or null>
  protected_resource_metadata_uri: <URI or null>
  dpop_required: true | false
  signed_effect_envelopes_required: true
  trusted_manifest_jwks_uri: <preconfigured/registry-authorized URI or null>
not_claiming:
  - declared_capability_is_competence
  - agent_identity_is_principal_authority
manifest_hash: sha-256:<hex>
signature: <Signature>
```

Manifest claims are descriptive. Cairn MUST independently enforce authority.
Effectful capabilities MUST declare idempotency and authority. `financial` and
`rights` effects require a mandate or human action authorization. Manifests SHOULD
be short-lived, fetched over HTTPS, validated against canonical `agent_id`, and
cached with ETag/Cache-Control.

Key trust is actor-specific. Runtime keys resolve only through a current signed
`AgentRuntimeBinding`; service/manifest keys resolve through a preconfigured or
registry-authorized JWKS; principal keys resolve through the principal registry
and recovery profile. A signer-chosen arbitrary HTTPS key URL is never a trust
anchor. When discovery begins from A2A, its extension params contain
`cairn_manifest_uri`, `cairn_schema_bundle_uri`, and immutable schema hashes. Both
the A2A Agent Card JWS (when present/required) and Cairn manifest signature are
verified under their respective profiles; one does not substitute for the other.

### 18.2 Version and downgrade

- Versions are `major.minor`. v0.1 negotiates exact `0.1` only.
- Every object pins its schema version. The retained signed envelope pins protocol
  version `0.1`; object stores MUST retain the originating envelope or an import/
  issuance receipt that pins the protocol version.
- Any version other than exact `0.1` MUST fail for a v0.1 mutation.
- An unknown required/critical extension MUST fail.
- A signed mandate MUST NOT be translated or downgraded; it must be reissued and
  re-signed.
- Missing effectful capability MUST fail closed, not silently become a weaker or
  differently consequential operation.
- v0.1 defines no downgrade algorithm. A future read-only compatibility profile
  requires its own versioned rules and MUST NOT be inferred from this document.

The serious alternative is A2A-only discovery with Cairn objects as one required
extension. v0.1 keeps a small Cairn manifest because A2A skill descriptions do not
express the authority lattice or durable receipt requirements. Implementations
SHOULD generate their A2A Agent Card from the same source to prevent drift.

## 19. Authentication and authorization profile

For external HTTP-based agent services, a conforming delegated-actor
implementation MUST use:

- OAuth 2.0 Protected Resource Metadata;
- Resource Indicators (RFC 8707);
- Rich Authorization Requests (RFC 9396);
- sender-constrained tokens with DPoP (RFC 9449);
- the signed Cairn envelope and `AgentMandate` in addition to OAuth.

OAuth identifies and limits the calling client. It does not itself prove that the
principal authorized the requested Cairn action.

Example RAR detail:

```json
{
  "type": "https://cairn.cards/authz/agent-action/v0.1",
  "actions": ["send_bindable_offer"],
  "locations": ["https://api.cairn.cards/agent"],
  "principal_id": "<principal>",
  "agent_runtime_key_id": "<agent key>",
  "mandate_id": "<mandate>",
  "deal_id": "<deal>",
  "copy_ids": ["<copy>"],
  "max_amount": {"asset": "USD", "amount_minor": 4000},
  "evidence_snapshot_hash": "sha-256:<hex>",
  "expires_at": "2026-07-19T20:00:00Z"
}
```

The authorization request also carries the RFC 8707 parameter outside
`authorization_details`:

```text
resource=https://api.cairn.cards/
```

The versioned RAR type has a published immutable JSON Schema and appears in the
protected-resource/authorization-server metadata
`authorization_details_types_supported`. Unknown authorization-detail types,
unknown critical fields, wrong JSON types, or missing required fields MUST be
rejected. The protected-resource metadata's resource identifier MUST exactly match
the requested RFC 8707 resource.

Broad OAuth scopes are insufficient for consequential actions. Access-token
identity, proof of possession, signed envelope, mandate, reservation, and domain
gate all remain independently required. DPoP constrains token replay but does not
sign the Cairn body or authenticate the human. RFC 8707's `resource` parameter
names the protected resource; it is not a substitute for the RAR `type` URI.
The DPoP key MUST either be the runtime key or be explicitly bound to it through
`AgentRuntimeBinding.dpop_key_thumbprint`. Client-credentials tokens identify an
agent service and MUST NOT be treated as principal authorization.

A closed deployment that does not use OAuth must declare a separately audited
non-external binding profile; it cannot claim the external delegated HTTP profile
by substituting a broad API key.

## 20. Transport bindings and commerce adapters

Cairn owns intent, exact-copy evidence, mandate, deal, action, and receipt semantics.
Other protocols are bindings or adapters and MUST NOT widen them.

### 20.1 Cairn HTTP binding

Until a Cairn media type is registered, the required representation is:

```text
Content-Type: application/json
Link: <https://cairn.cards/protocol/envelope/0.1>; rel="profile"
```

The authoritative operation registry is:

```text
capabilities.get
runtime_binding.get
intent.put | intent.get | intent.control
data_grant.issue | data_grant.get | data_grant.revoke
projection.issue | projection.get
disclosure.authorize | disclosure.authorize_continuation | disclosure.deliver
copy.put | copy.get
evidence.put | evidence.get | evidence.snapshot | evidence_snapshot.get
object.resolve
deal.create | deal.get | deal.append
posted_ask_terms.put | posted_ask_terms.get
posted_ask.put | posted_ask.get | posted_ask.withdraw
proposal.put | proposal.accept | proposal.withdraw
terms_acceptance.put | terms_acceptance.get | terms.close | terms.get
authorization.issue | authorization.get
mandate.issue | mandate.get | mandate.revoke
arbiter_grant.issue | arbiter_grant.get
reservation.hold | reservation.get | reservation.release
gate.evaluate
action.prepare | action.execute | action.get | action.cancel | action.reconcile
payment_instruction.put | payment_instruction.get
provider_receipt.import
deal.finalize
receipt.get
continuation.issue | continuation.get
```

A conforming implementation MUST publish one request and response body schema per
operation in its machine-readable schema bundle. The operation name is
`CairnEnvelope.message_type`; request bodies MUST match its registered
`body_schema` exactly. This draft does not yet ship that bundle. The HTTP mapping is:

```text
GET  /cairn/0.1/capabilities
POST /cairn/0.1/messages                  any registered enveloped mutation/query
GET  /cairn/0.1/actions/{action_id}
GET  /cairn/0.1/deals/{deal_id}
GET  /cairn/0.1/reservations/{reservation_id}
GET  /cairn/0.1/receipts/{receipt_id}
```

Only `capabilities` and deliberately public objects may be fetched without principal
authorization. A private read-only GET uses transport-native path parameters plus
OAuth/DPoP and a current named DataGrant; the server returns an enveloped response.
Any read whose caller/audience/body must itself be signed uses
`POST /cairn/0.1/messages`. `object.resolve` verifies that the requested ObjectRef,
authorized retrieval URI, returned schema, and content hash all match.

Effectful requests require `Idempotency-Key` and
`Cairn-Protocol-Version: 0.1`. The header key and envelope key MUST match. OAuth
authorization and DPoP requirements follow the capability profile, and a request
that cannot authenticate the principal/agent relationship fails before mutation.

Normative status behavior:

| HTTP | Meaning |
|---|---|
| `200` | query or idempotent replay returned an existing result |
| `201` | object/action/receipt created |
| `202` | external effect submitted; final receiver state pending |
| `400` | parse/schema/version failure; no authenticated mutation accepted |
| `401/403` | authentication or authority failure |
| `404` | authorized caller cannot resolve the named object |
| `409` | deal head, reservation fence, replay, or idempotency conflict |
| `412` | stale pinned hash, nonce, or terms/evidence precondition |
| `415` | unsupported content type/representation profile |
| `422` | authenticated request understood but deterministic gate blocked it |
| `429` | rate limit; retry policy and `Retry-After` are explicit |
| `503` | required nonce/key/provider status unavailable; consequential action fails closed |

Mutations use envelope idempotency plus the relevant deal-head/reservation-fence
compare-and-swap. `action.cancel`, `proposal.withdraw`, `reservation.release`, and
`mandate.revoke` are explicit registry operations, not overloaded DELETE calls.
An accepted mutation returns the applicable signed object or receipt. A native
transport error before authenticated ingress is not a Cairn receipt.

### 20.2 MCP binding

MCP is a tool/data binding, not the source of durable Cairn action state. The v0.1
profile targets MCP `2025-11-25` Streamable HTTP and exposes at least:

```text
cairn_capabilities_get
cairn_projection_get
cairn_action_prepare
cairn_action_execute
cairn_action_get
cairn_action_cancel
```

Effectful tools accept typed Cairn-envelope arguments through
`tools/call.params.arguments`; results return the typed envelope in
`structuredContent` and SHOULD duplicate its serialized JSON in a TextContent block
for compatibility. v0.1 does not depend on MCP Tasks; `action_id` remains canonical. The MCP client and
server MUST complete MCP initialization and version negotiation before Cairn tool
use and MUST preserve the negotiated `MCP-Protocol-Version` header where the MCP
transport requires it. Each Cairn tool is invoked through `tools/call`; its typed
request is carried in `params.arguments`, and its typed result is returned in
`structuredContent` with a matching output schema. MCP protocol/tool errors are
transport failures until an authenticated Cairn mutation enters processing;
after that point the tool returns the signed Cairn receipt or failure object.
Authentication, idempotency, envelope signatures, CAS, and reconciliation are
identical to the HTTP profile.

A signed `FailureReceipt` caused by valid tool execution returns as the typed result
with `isError: true`; malformed JSON-RPC, unknown MCP methods, or pre-ingress MCP
protocol failures remain JSON-RPC protocol errors without Cairn receipt semantics.

A binding that claims the full MCP profile MUST expose every §20.1 operation as a
tool named by replacing dots with underscores and MUST publish the same canonical
input/output schema hashes. The six names above are the minimum advisor/execution
subset, not sufficient by themselves for full binding conformance.

### 20.3 A2A binding

A2A is the preferred general agent-to-agent bridge. A conforming bridge:

- publishes the standard Agent Card at `/.well-known/agent-card.json`;
- maps Cairn capabilities to A2A skills;
- declares a versioned Cairn extension;
- carries the Cairn envelope in a structured data part;
- preserves server-generated A2A task/context identifiers and stores explicit
  cross-references from them to Cairn `deal_id` and `action_id`; a Cairn client
  MUST NOT choose or overwrite an A2A server's Task ID;
- persists critical Cairn receipts independently of transient messages/task history.

The bridge targets the A2A `1.0.0` specification. Its Agent Card declares the
Cairn wire protocol version `1.0`, at least one standard binding in
`supportedInterfaces`, and
`AgentCard.capabilities.extensions[] = {uri, required, params}`. The params contain
the Cairn manifest/schema URIs and hashes. Requests send `A2A-Version: 1.0` and,
for effectful Cairn-only skills, carry the extension URI in the `A2A-Extensions`
activation header. The exact structured Part is:

```json
{"data":{"cairn_envelope":"<typed CairnEnvelope object>"},
 "mediaType":"application/json"}
```

The containing Message or Artifact declares the Cairn extension URI in its
extension field. A signed receipt appears only as such a Data Part in
`TaskStatus.message` or as an Artifact; it is never an untyped A2A status payload.
A bridge that loses A2A task history MUST still reconcile by
Cairn action ID and receipt chain. A2A authentication and error objects do not
replace Cairn authority or signed failure semantics.

Suggested extension URI:

```text
https://cairn.cards/protocol/a2a/agent-intent/v0.1
```

### 20.4 UCP and ACP

UCP and ACP are directional checkout adapters:

| Cairn | Adapter target | Boundary |
|---|---|---|
| public cash listing | catalog/product | exact-copy evidence remains Cairn |
| single-seller cash pile | cart/checkout | barter and multi-party piles remain Cairn |
| closed cash terms | checkout/order | mandate remains Cairn |
| confirmed provider state | order/payment update | receipt preserves provider source |

Counteroffers, scan requests, exact-copy evidence, barter, multi-party cycles,
bonds, inspection, and arbitration require Cairn objects or an explicit human
handoff. Platform/merchant authentication in either protocol does not replace
principal delegation.

### 20.5 AP2/FIDO, credentials, and payment-agent identity

The AP2 v0.2 snapshot distinguishes Checkout Mandates and Payment Mandates. Cairn
maps directionally as follows:

```text
human-present ClosedTerms + exact PaymentInstruction
  → user-signed closed Checkout and closed Payment Mandates
preauthorized Cairn constraints
  → separately user-signed open Checkout/Payment Mandates where mapped; the agent
    later signs AP2-native closed mandates and presents both chains
ProviderPaymentReceipt
  → provider/payment outcome attached to the Cairn receipt chain
```

ActiveIntent has no direct AP2 equivalent and remains in Cairn. Cairn's Ed25519
object signature is not automatically an AP2 proof. An adapter constructs and
verifies AP2-native mandates, checkout JWTs, receipts, securing formats, and exact
open/closed chains under the pinned AP2 profile. This is not a v0.1 claim of AP2
or future FIDO conformance.

W3C Verifiable Credentials Data Model 2.0 MAY carry grader, custody-node, control,
scan, or inspection claims only when paired with a separately pinned securing
mechanism and verification profile. Successful proof verification establishes
only integrity/authenticity properties defined by that mechanism; it does not mean
Cairn trusts the issuer or that the physical claim is true.

Visa/Mastercard or other payment-agent enrollment MAY be recorded as a rail-
specific trust import. It MUST NOT become general agent competence, seller trust,
or card authenticity.

## 21. Failure taxonomy

A mutation that has crossed Cairn's authenticated processing boundary MUST durably
record and make available a signed outcome. Before an `ActionRecord` exists, a deterministic processing
failure uses `FailureReceipt`. Once an `ActionRecord` exists, every transition—
including `failed` or `unknown`—uses `ActionReceipt`; reconciliation uses
`ReconciliationReceipt`. Parse failure, unsupported media/profile, TLS loss, MCP/
A2A initialization error, or an unavailable signing service before authenticated
ingress uses the native transport error and MUST NOT be interpreted as proof that
no external effect occurred. Cairn MUST check receipt-signing availability before
accepting a mutation. If delivery or signing nonetheless fails after durable
acceptance, the client receives/observes a transport failure and reconciles by
message/action ID; the eventual receipt chain remains authoritative.

`FailureReceipt` includes:

```yaml
schema: cairn.failure_receipt.v0.1
receipt_id: urn:uuid:<uuid>
request_message_ref: <ObjectRef>
action_ref: <ObjectRef or null>
action_receipt_ref: <ObjectRef or null>
deal_head_hash: sha-256:<hex or null>
code: <stable code>
class: protocol | identity | authority | intent | data | reservation | execution |
       recovery | judgment
retryability: never | after_user_action | after_reconciliation | transient
safe_state: <current authoritative state>
effect_known: true | false
reservation_status: <state or null>
receiver_ref: <provider/chain/counterparty ref or null>
human_action_if_any: <bounded action or null>
created_at: <time>
receipt_hash: sha-256:<hex>
issuer: <gateway/service>
issuer_signature: <Signature>
not_claiming: []
```

Minimum stable codes:

```text
protocol
  protocol_version_unsupported
  schema_invalid
  media_profile_unsupported
  signature_invalid
  audience_mismatch
  message_nonce_replayed
  operation_fingerprint_mismatch

identity
  agent_unrecognized
  agent_key_mismatch
  principal_binding_invalid
  key_status_unavailable

authority
  authority_missing
  authority_scope_exceeded
  authority_expired
  authority_revoked
  authority_version_stale
  wrong_agent
  delegation_depth_exceeded
  unknown_capability
  unknown_constraint
  unsupported_critical_extension

intent / evidence / data
  intent_version_stale
  intent_source_untrusted
  deal_head_conflict
  evidence_snapshot_stale
  reserved_judgment_required
  disclosure_scope_exceeded
  hostile_content_quarantined

reservation
  reservation_conflict
  budget_exceeded
  exposure_exceeded
  inventory_reserved
  reservation_expired

execution
  idempotency_conflict
  action_already_final
  target_mismatch
  terms_hash_mismatch
  rail_mismatch
  payment_requires_confirmation
  release_authority_missing
  expired
  provider_declined

recovery
  external_result_unknown
  reconciliation_required
  provider_receipt_invalid
  chain_pending
  chain_reverted
  counterparty_ack_missing

judgment
  waiver_not_delegable
  dispute_requires_human
  arbiter_conflict
```

A generic "failed; try again" response is forbidden after external submission.
If `effect_known: false`, retryability MUST be `after_reconciliation`.

Binding mappings are exact: HTTP uses §20.1 status codes while returning the
signed receipt body after authenticated ingress; MCP returns the receipt in
`structuredContent`; A2A returns it as the declared Cairn-extension Artifact or
as a Data Part in `TaskStatus.message`. Native HTTP/MCP/A2A errors are used only before that boundary or
when the protocol cannot authenticate, parse, or sign a Cairn outcome.

## 22. Conformance profiles

These are target profiles, not current product claims. Conformance is claimed per
version and binding only after the implementation ships the required JSON Schemas,
OpenAPI operation schemas, MCP input/output schemas, A2A extension schema,
canonical hash/signature vectors, idempotency/replay fixtures, mutation-controlled
test corpus, and a reproducible conformance report. Supporting a transport does
not imply authority or settlement conformance. This prose draft alone cannot make
any implementation conformant.

Profiles inherit as follows; every row additionally requires §4 schemas/vectors,
the full negative/mutation tests named for its functions, and all receipt families
produced by those operations.

| Profile | Requires | Minimum operations | Required receipts/tests | Forbidden effects |
|---|---|---|---|---|
| Discovery | none | `capabilities.get`, manifest/schema retrieval | signature, expiry, version, downgrade, key-resolution vectors | every private read or mutation |
| Advisor | Discovery | `object.resolve`, `projection.get`, `copy.get`, `evidence.get`, `evidence_snapshot.get`, `deal.get`, `action.prepare`, `receipt.get` | preparation receipts; T-I/T-E and no-overclaim corpus | message, public state, commitment, value, rights |
| Supervised Actor | Advisor | `data_grant.*`, `disclosure.*`, `deal.*`, `proposal.*`, `terms.*`, `authorization.*`, `reservation.*`, `gate.evaluate`, `action.*`, `continuation.*` | authorization, reservation, redemption, action, disclosure, reconciliation, revocation; T-D/T-A/T-X | any effect without one-shot human authorization |
| Delegated Actor | Supervised Actor | `runtime_binding.get`, `mandate.*`, all supervised operations | grant/runtime receipts, BYO replacement, two-agent concurrency, OAuth profile | capability/tuple outside mandate; onward delegation |
| Settlement | Supervised Actor; plus Delegated Actor only for preauthorized payment | `payment_instruction.*`, `provider_receipt.import`, `action.reconcile`, `deal.finalize` | provider import/payment, effect lease, adjustment/refund, cross-binding golden trace | unconfirmed finality; implicit release/waiver |
| Release | Settlement | reserved future release operation set | fulfillment/receipt/inspection/dispute/ruling/final receipts and future release corpus | all general delegated release in v0.1 |

A binding claim exposes every operation required by the functional profile it is
paired with, plus `capabilities.get`, `object.resolve`, and `receipt.get`, using the
same canonical schema hashes and error mapping. A bare transport demonstration is
not a binding conformance claim.

```yaml
schema: cairn.conformance_manifest.v0.1
implementation_id: <stable implementation URI>
implementation_version: <version/build>
claimed_functional_profiles: []
claimed_binding_profiles: []
protocol_version: "0.1"
artifact_hashes:
  json_schema_bundle: sha-256:<hex>
  openapi: sha-256:<hex or null>
  mcp_schemas: sha-256:<hex or null>
  a2a_extension_schema: sha-256:<hex or null>
  signature_vectors: sha-256:<hex>
  replay_fixtures: sha-256:<hex>
  mutation_corpus: sha-256:<hex>
test_report_refs: []
tested_standard_versions_and_source_digests: []
issued_at: <time>
expires_at: <time>
manifest_hash: sha-256:<hex>
issuer_signature: <Signature>
not_claiming: [physical_truth, unlisted_profile_conformance]
```

### 22.1 `CAIRN-DISCOVERY-0.1`

MUST implement manifest retrieval, version negotiation, schema resolution,
capability intersection, expiry, signatures, and standard errors. It has no
effectful operations.

### 22.2 `CAIRN-ADVISOR-0.1`

Adds purpose-bound projection reads, evidence reads, source/no-overclaim
preservation, `AgentJudgment`, intent/proposal drafts, and zero external effects.

### 22.3 `CAIRN-SUPERVISED-ACTOR-0.1`

Adds `ActionAuthorization`, signed envelopes, deterministic gate evaluation,
idempotent human-authorized message/offer/evidence-request submission, disclosure
receipts, receiver receipts, revocation checks, and reconciliation.

### 22.4 `CAIRN-DELEGATED-ACTOR-0.1`

Adds `AgentMandate`, atomic aggregate reservations, preauthorized bounded
communication/negotiation, multi-agent races, proof-of-possession runtime binding,
OAuth RAR/resource/DPoP profile, and replacement tests.

It MUST NOT claim delegated-actor conformance until the authoritative reservation
service and mutation-controlled concurrency drills exist.

### 22.5 `CAIRN-SETTLEMENT-0.1`

Adds exact rail/amount/payee/terms binding, single-use payment authority, verified
provider/chain receipts, duplicate-payment resistance, unknown-result recovery,
refund/adjustment records, and truthful finality labels. Release authority is not
implied.

### 22.6 `CAIRN-RELEASE-0.1`

This profile is reserved. v0.1 defines the separation but does not recommend a
general delegated-release implementation for uncertain physical goods. A future
claim requires a separately audited release mandate, objective mechanical gates,
explicit timeout/remedy policy, low-value caps, and no active blocking state in the
named wall/release-policy bundle. Residual epistemic uncertainty remains visible.

Bindings are claimed independently:

```text
CAIRN-BINDING-HTTP-0.1
CAIRN-BINDING-MCP-0.1
CAIRN-BINDING-A2A-0.1
```

### 22.7 Anko's status

Anko is the reference/default agent, not a privileged protocol actor. It MUST use
the same schemas, gates, data grants, receipts, revocation, and replacement rules
as any external agent. Anko-only endpoints, hidden authority, or private protocol
semantics fail the BYO-agent test.

The current product behavior is conceptually advisory/supervised. Because the
machine-readable artifacts and executable profile reports do not yet exist, it
MUST NOT be labeled conforming even to `CAIRN-ADVISOR-0.1`; it is an implementation
candidate for that profile. It MUST NOT be labeled delegated or settlement
conforming until the relevant services and executable tests exist.

## 23. Threat model and required defenses

### 23.1 Protected assets

- principal funds and outstanding economic exposure;
- exact-copy inventory and reservations;
- private holdings, maximum budget, urgency, address, payment, and dispute data;
- authority, revocation, and identity bindings;
- proposal, terms, evidence, fulfillment, and deal continuity;
- rights, deadlines, reputation, receipts, and user attention.

### 23.2 Attack matrix

| ID | Attack | Required defense | Expected code/result |
|---|---|---|---|
| AI-01 | foreign agent imports "user allows $500" | imported intent cannot mint authority | `intent_source_untrusted` |
| AI-02 | old grant survives narrowed intent | exact version + nonce check | `authority_version_stale` |
| AI-03 | seller/OCR changes payee or amount | hostile-data isolation + executor recompute | `hostile_content_quarantined` |
| AI-04 | fake Anko runtime acts | provider/product/runtime key binding | `agent_unrecognized` |
| AI-05 | rotated key replays request | current key status + proof of possession | `agent_key_mismatch` |
| AI-06 | agent leaks reserve/max/private holdings | projection/disclosure grant | `disclosure_scope_exceeded` |
| AI-07 | message/payment targets wrong party | audience/recipient/terms binding | `target_mismatch` |
| AI-08 | two agents race offers under one cap | serializable aggregate reservation | `reservation_conflict` |
| AI-09 | two sellers/listings use one copy | exact-copy fencing | `inventory_reserved` |
| AI-10 | same authority namespace/key, changed operation fingerprint | fingerprint equality | `idempotency_conflict` |
| AI-11 | PSP succeeds; client times out; retries | unknown state + reconciliation | `external_result_unknown` |
| AI-12 | seller swaps copy/evidence after consent | exact hashes + freshness | `evidence_snapshot_stale` |
| AI-13 | payment grant attempts release | independent capability | `release_authority_missing` |
| AI-14 | PayPal screenshot presented as payment | provider receipt verification | `provider_receipt_invalid` |
| AI-15 | transaction agent arbitrates own deal | role conflict | `arbiter_conflict` |
| AI-16 | unknown mandate verb ignored | allowlist + critical extension | `unknown_capability` |
| AI-17 | forged human-unavailable signal widens power | availability never grants authority | `authority_missing` |
| AI-18 | offer accepted after reservation expiry | expiry/fencing check | `reservation_expired` |
| AI-19 | disclosure recipient ignores deletion term | label external enforcement boundary | legible residual risk |
| AI-20 | valid mandate paired with changed cart/rail | exact terms/cart/rail hash | `terms_hash_mismatch` |

### 23.3 Residual risks

Even a conforming implementation cannot eliminate:

- key control differing from legal identity and informed consent;
- a compromised consent surface misleading the human into a valid signature;
- lack of global exactly-once execution across PSPs, chains, email, and messages;
- physical authenticity, condition, possession, and continuity judgment;
- coherent-looking evidence made by colluding parties;
- chargebacks, freezes, issuer action, and legal process;
- gateway, contract, authority-service, or provider bugs;
- privacy correlation after minimized disclosure;
- confirmation fatigue;
- legal ambiguity around automated bindable offers in some jurisdictions;
- inability of revocation to undo an already accepted external commitment.

## 24. Falsification and conformance test matrix

Every security-critical test group MUST include a mutation control: remove or
weaken the named guard and prove at least one attack changes from reject to admit.
A green happy path without a red mutation is not evidence that the guard has teeth.

### 24.1 Intent and disclosure

| ID | Test | Required result |
|---|---|---|
| T-I01 | agent changes active budget | reject; only proposed revision created |
| T-I02 | agent activates unsigned intent | `principal_binding_invalid` |
| T-I03 | action cites stale intent revision | `intent_version_stale` |
| T-I04 | revoked intent reused | `authority_revoked` |
| T-I05 | projection includes unpermitted holdings | `disclosure_scope_exceeded` |
| T-I06 | behavior inference expands authority | `intent_source_untrusted` |
| T-I07 | external recipient receives full private intent | reject before disclosure |
| T-I08 | store signs projection without disclosure grant | `authority_missing` |
| T-I09 | unrelated audience reuses projection | `target_mismatch` |
| T-I10 | disclosed bytes contain an unlisted private field | payload/envelope hash mismatch; reject + anomaly |
| T-I11 | continuation bundle exceeds its DataGrant graph | `disclosure_scope_exceeded` |
| T-I12 | two agents race one remaining disclosure count | exactly one reservation fence succeeds |
| T-I13 | continuation authorization names the right agent but a different runtime or bundle hash | `target_mismatch`; no delivery |
| T-I14 | private continuation head lacks retrieval URI or exact DataGrant ref | schema reject |
| T-I15 | inline continuation unknown contains private budget/holding/dispute detail | schema reject; details require a granted unknown ObjectRef triple |

### 24.2 Copy and evidence

| ID | Test | Required result |
|---|---|---|
| T-E01 | catalog image submitted as seller front photo | evidence-floor reject |
| T-E02 | evidence item cites wrong copy | `evidence_snapshot_stale` or mismatch |
| T-E03 | bytes change under same content hash | hash validation reject |
| T-E04 | evidence lacks issuer or observation time | schema reject |
| T-E05 | copy A evidence used for copy B | reject before action |
| T-E06 | new evidence overwrites old snapshot | append-only validation reject |
| T-E07 | stale photo rendered as current possession | no-overclaim failure |
| T-E08 | seller evidence rendered as independent verifier | role/scope reject |
| T-E09 | same-subject custodian rendered independent | role-conflict reject |
| T-E10 | catalog/visual match rendered authentic | surface conformance reject |
| T-E11 | snapshot contains waiver without receipt | schema/gate reject |
| T-E12 | new evidence silently expands release | `release_authority_missing` |
| T-E13 | sanitizer mutates original evidence bytes | immutable-content/hash reject; derived preview required |
| T-E14 | declared/stock photo satisfies possession/copy/condition requirement | typed satisfaction blocks; seller declaration remains legible only |

### 24.3 Deal and proposal continuity

| ID | Test | Required result |
|---|---|---|
| T-D01 | two writers append against one deal head | exactly one succeeds |
| T-D02 | action prepared at head N submits after N+1 | `deal_head_conflict` |
| T-D03 | proposal from deal A attached to deal B | reject |
| T-D04 | counter edits parent bytes | signature/hash reject |
| T-D05 | expired/superseded proposal accepted | reject |
| T-D06 | accepted proposal directly funds | missing separate payment authority |
| T-D07 | terms change after funding | new authorization required |
| T-D08 | operative copy changes after agreement | new proposal + authorization required |
| T-D09 | evidence request button silently edits offer | conformance failure |
| T-D10 | proposal expiry exceeds reservation expiry | schema/gate reject |
| T-D11 | local supersession releases externally live offer | release blocked until receiver cancellation/expiry |
| T-D12 | deal head changes after gate but before redemption | `deal_head_conflict`; no effect |
| T-D13 | posted ask changes payee/copy/price/evidence during instantiation | derivation reject; fresh seller signature required |
| T-D14 | ClosedTerms acceptance refs reorder or omit signer | canonical sort/signer-set reject |
| T-D15 | accept_terms closes without authorization/reservation/gate/redemption | lifecycle reject; no terms_closed event |
| T-D16 | inventory pending commit then deal CAS conflicts | copy remains fenced; compensate/retry; no closed UI state |
| T-D17 | inventory reservation tries to bind final PostedAsk hash | schema/lifecycle reject; reservation binds prior PostedAskTerms hash |

### 24.4 Mandate and reservations

| ID | Test | Required result |
|---|---|---|
| T-A01 | wrong agent/profile/intent/deal/copy/rail/recipient | each independently rejects |
| T-A02 | unknown capability ignored | `unknown_capability` |
| T-A03 | ordinary mandate executes reserved judgment | `reserved_judgment_required` |
| T-A04 | direct authorization differs by one field | signature/hash reject |
| T-A05 | authorization replayed after use | replay reject |
| T-A06 | Agent 1 reserves 70; Agent 2 reserves 40 under cap 100 | second rejects |
| T-A07 | spent 60 + held 50 under cap 100 | new hold rejects |
| T-A08 | two exclusive holds for one copy | second rejects |
| T-A09 | expired reservation consumed | `reservation_expired` |
| T-A10 | revoke blocks new actions | reject with revocation receipt |
| T-A11 | revoke after submission erases action | forbidden; receipt remains |
| T-A12 | reservation displayed as payment/possession | no-overclaim failure |
| T-A13 | revocation service unavailable | consequential action fails closed |
| T-A14 | child agent redelegates | `delegation_depth_exceeded` |
| T-A15 | one-shot ActionAuthorization cannot be tied to reservation | schema/conformance failure; execution blocked |
| T-A16 | gate allows, principal revokes, executor redeems | live nonce reject; no external effect |
| T-A17 | empty/null authority interpreted as wildcard | reject; deny semantics are invariant |
| T-A18 | explicit wildcard used for payee/private disclosure/release | schema reject |
| T-A19 | two assets or excluded fees bypass one aggregate cap | reject; one accounting asset and worst-case total required |
| T-A20 | one mandate tries capability/recipient/data cross-product | impossible: one capability per mandate; tuple mismatch rejects |
| T-A21 | same provider, different runtime key arbitrates own action | `arbiter_conflict` or judged-independence escalation |
| T-A22 | low-assurance reauth used for high-risk capability | `authority_scope_exceeded`/assurance reject |
| T-A23 | blocking unknown remains on consequential proposal | gate blocks named capability |
| T-A24 | caller supplies empty arbiter quorum | derived signer-set reject |

### 24.5 Execution, payment, and recovery

| ID | Test | Required result |
|---|---|---|
| T-X01 | mutation lacks idempotency key | schema reject |
| T-X02 | byte-different retry, same namespace/key/fingerprint | original receipt; no second effect |
| T-X03 | same namespace/key, different operation fingerprint | `idempotency_conflict` |
| T-X04 | duplicate payment under different key | effect uniqueness/reservation reject |
| T-X05 | unknown payment retried before query | `reconciliation_required` |
| T-X06 | PSP capture then network timeout | query provider; no replay |
| T-X07 | chain submitted then UI timeout | query transaction hash |
| T-X08 | provider success lacks provider reference | `provider_receipt_invalid` |
| T-X09 | PayPal approval rendered captured | surface/receipt reject |
| T-X10 | manual PayPal declaration rendered verified | `provider_receipt_invalid` |
| T-X11 | off-chain fiat rendered escrowed | no-overclaim failure |
| T-X12 | escrow funding rendered authentic card | no-overclaim failure |
| T-X13 | payment grant attempts release | `release_authority_missing` |
| T-X14 | changed cart/amount/payee/rail after authorization | exact-hash reject |
| T-X15 | refund mutates original receipt | append-only reject |
| T-X16 | transaction agent rules dispute | `arbiter_conflict` |
| T-X17 | final deal still has live claim/appeal | finalization reject |
| T-X18 | receiver/local state conflict | anomaly + quarantine |
| T-X19 | exact seller preserved but payee account substituted | `target_mismatch`; no submission |
| T-X20 | same economic effect uses new action ID and idempotency key | active effect lease rejects |
| T-X21 | provider lacks idempotency/single-use for financial action | executor profile blocks action |
| T-X22 | malformed request never enters authenticated boundary | native transport error; no signed-receipt overclaim |
| T-X23 | redemption commits but executor crashes before call | `redemption_committed`; reconcile without submitted overclaim |
| T-X24 | dispatching/submitted/unknown EffectLease reaches wall-clock expiry | lease remains blocking until authoritative reconciliation |
| T-X25 | PaymentInstruction digest created or changed after human signature | exact-hash reject; new authorization required |
| T-X26 | same effect uses new descriptor UUID/signature/executor or reordered copy list | UUID/signature/executor preserve `effect_id`; reordered/duplicate list rejects; second lease rejects |
| T-X27 | provider handoff marker commits, process crashes before submitted state | `dispatching` lease remains blocking; query/reconcile with same receiver key/token |
| T-X28 | provider import receipt or envelope is inserted into ProviderEventCore | schema/hash reject; acyclic core-first order required |
| T-X29 | authorization is redeemed but no handoff occurs before deadline or later revocation | first call forbidden; fenced-outbox proof required before reconciled release |
| T-X30 | valid provider event is attached to another cart/instruction with same payee and amount | order/call digest, effect ID, operation, and rail mismatch reject |
| T-X31 | stale outbox worker sends after claimed non-submission release | worker fence rejects; atomic proof/release invariant mutation exposes duplicate risk |
| T-X32 | provider event carries a different operation ID, or an unbound ID when instruction ID is null | exact ID reject or authenticated order/call-digest linkage required |
| T-X33 | no-handoff release invents a receiver query/result or omits its outbox proof | discriminated reconciliation schema rejects |

### 24.6 Hostile-content corpus

The same payee/amount/tool/disclosure injection MUST be tested in:

```text
seller description
seller chat
OCR in the card image
OCR in package image
filename
EXIF/metadata
catalog/community note
retrieved URL
external agent response
provider error message
```

Every case must remain data, leave the typed authoritative fields unchanged, and
either produce safe advice or `hostile_content_quarantined`.

### 24.7 Portability and standards

Required checks:

1. complete the BYO-agent replacement test in §17.3;
2. generate Cairn manifest and A2A Agent Card from one source and diff capabilities;
3. reject unsupported critical extension and major version;
4. reject signed-mandate downgrade;
5. preserve unknown optional JSON values semantically through parse/serialize and
   preserve opaque attachment bytes byte-for-byte, while keeping both quarantined
   from models/gates/executors; canonical retransmission may change JSON whitespace
   or member ordering without changing its RFC 8785 canonical form;
6. prove MCP task/state loss does not lose Cairn action/receipt continuity;
7. prove UCP/ACP adapter omission of Cairn evidence/mandate fields cannot authorize
   a Cairn effect;
8. prove a valid VC or payment-agent credential does not become physical truth or
   general trust;
9. validate every common object hash and Ed25519 signature against golden vectors;
10. run the posted-ask golden trace through HTTP, MCP, and A2A and compare the Cairn
    object/receipt hashes across bindings.

## 25. Human surface requirements

The protocol is interface-agnostic, not comprehension-agnostic. Every surface that
lets a human grant or review agent action MUST answer:

```text
Who is acting?
What exactly will happen?
What can it affect?
Who receives it?
What can it cost or commit?
How long does permission last?
What is still not allowed?
Can it be undone?
What actually happened afterward?
```

### 25.1 Status vocabulary

Use explicit text; color is supplementary and MUST NOT be the only signal.

| State | Required plain-language meaning |
|---|---|
| agent advice | "Anko's read" / judged, no action |
| prepared | "Nothing sent" |
| needs authorization | "Review and allow this exact action" |
| authorized | "Allowed, not yet sent" |
| submitted | "Sent; waiting for confirmation" |
| unknown | "We do not know whether it completed; checking" |
| finalized | name the confirming provider/contract/counterparty |
| stale | name what changed |
| revoked | name which future powers stopped |

The current visual grammar MAY use blue for agent advice/preparation, gold for
money, oxblood for human attention/permission/waiver/dispute, and green only for
externally confirmed completion. Implementations MUST also use icon/text/state,
meet contrast requirements, and never turn green into a trust/authenticity claim.

### 25.2 Ambient agent states

The resting interface SHOULD collapse agent continuity into at most:

```text
Needs you
Prepared
Watching
Waiting
Completed
```

It SHOULD interrupt only for a material decision, authorization, anomaly, or
deadline under the Interrupt Bar. A higher learned `θ` may change which advice is
surfaced; it MUST NOT widen capability, budget, disclosure, waiver, or release.

### 25.3 Audit surface

The principal MUST be able to inspect:

- what the agent read and what was withheld from it;
- what it inferred and with what sources;
- what it prepared, sent, committed, or spent;
- the exact authority and reservation used;
- what it suppressed from attention and why;
- every disclosure and receiver receipt;
- current grants, remaining budget/exposure, expiry, pause, and revoke controls;
- stale or unknown actions requiring reconciliation.

The audit surface MUST distinguish model/provider self-attestation from independent
or receiver attestation.

## 26. Compatibility and existing-spec dispositions

This document records, rather than hides, the following overlaps.

| Existing surface | Conflict/gap | v0.1 disposition |
|---|---|---|
| Principal Profile `allowed_uses` | ordered `ask < spend < waive` can imply inheritance; imported ceiling is ambiguous | retain lattice as source eligibility only; exact independent capability list controls; imported authority requires principal correction |
| Principal Profile mandate v0.1 | lacks recipient/rail/data/aggregate exposure/idempotency/runtime constraints | no silent wrap; legacy mandate is proposal-only until principal signs `cairn.agent_mandate.v0.2` using the field mapping in §8.4 |
| Collector Aperture | confirmation described as the mandate | aperture/intent is policy; separate signature grants capability |
| Interrupt Bar `silent_request_evidence` | a public or paid request is still an effect | "silent" means no human interrupt; message/fee/disclosure still require authority and receipt |
| Interrupt Bar learned `θ` | could be read as learned autonomy | may tune attention only; cannot widen authority |
| Agent API `acceptOfferAndFundEscrow()` | bundles terms, waiver, and funding | compatibility facade only; separate authorizations/gates/receipts required |
| Agent API `settle()` | ambiguous capture/release/refund/ruling | replace with typed rail-specific actions |
| Agent API human availability | agent can report availability | availability is legible input and never widens authority or chooses an unsafe default |
| Human Surface default human decisions | appears to conflict with optional mandates | these remain human-reserved defaults; delegation is an explicit, narrower exception |
| Payment/Custody "pay anything; enforce on-chain" | off-chain rail cannot be enforced as escrow | name exact rail; off-chain/provider state stays rail-specific and legible |
| Payment/Custody "full protection" | overclaims physical/issuer/chargeback residuals | prohibited; show protection matrix and nonclaims |
| Payment/Custody atomic physical swap | contract cannot hold atoms without custody actors | describe atomic digital/value release against custody attestations, not atomic physical truth |
| Walls generic mandate refs | do not prove exact waiver/release capability | resolve to typed current grant and reserved judgment |
| Walls custody/verifier language | same actor can be misread as independent evidence | a custodian may issue custody evidence but MUST NOT be labeled independent verifier for that same subject without the Arbiter/JSC conflict rules |
| Catalog/card art | visual reference can be mistaken for evidence of a listed copy | `catalog_reference_only` can identify a work/printing but never satisfies copy possession, condition, freshness, custody, or continuity |
| Full Spec `Intent` | begins the trade but lacks private principal custody/revision | `ActiveIntent` is the portable private object; `ScopedProjection` is disclosed |
| Full Spec `trade_id` | begins after pre-trade browsing/negotiation | `deal_id` begins continuity earlier; chain/PSP trade/order IDs attach as external refs |
| Final/Projection "receipt" terminology | derivation and execution receipts can blur | projection receipt, action receipt, receiver receipt, and final deal receipt remain distinct |

This table does not silently edit those modules. Implementations claiming this
spec use the stricter disposition at the agent boundary and MUST surface any
unmigrated legacy path as nonconforming.

## 27. Delivery posture, weakest point, and serious alternative

### 27.1 Honest maturity

| Component | Status at publication |
|---|---|
| profile claim lattice and profile drills | existing design + drill |
| existing human advisory/action UI | partially live |
| exact objects/schemas in this document | design only |
| manifest and HTTP/MCP/A2A bindings | design only |
| authoritative multi-agent reservation service | not built |
| provider/contract receiver reconciliation profile | not built as one conformance suite |
| BYO-agent replacement test | specified, not run |
| delegated financial execution | not conforming |
| delegated release | reserved; not recommended |

The document is not evidence that cairn.cards, Anko, PayPal, or the escrow contracts
currently implement these interfaces.

### 27.2 Staged implementation

```text
P0  portable profile/intent/projection + exact-copy/evidence/dossier objects
P1  advisory agent + preparation receipts + deterministic staleness
P2  human-present ActionAuthorization for messages/offers/evidence requests
P3  receiver receipts + idempotency + unknown-state reconciliation
P4  bounded communication/negotiation mandates + atomic reservations
P5  human-present exact-cart payment and escrow funding
P6  low-value delegated funding pilot after concurrency/recovery red team
P7  autonomous hunts under cumulative caps after field evidence
P8  reconsider delegated release; not an alpha promise
```

At every phase, a simpler human path remains available. Escrow is a protection
choice, not a gate to all commerce. PayPal or another mutually accepted rail may
proceed with its own truthfully disclosed protection/finality boundary.

### 27.3 Weakest point

The weakest point is not the model. It is serializable authority plus honest
reconciliation across multiple agents and external systems that do not offer one
global transaction.

A signed aggregate cap is unsafe if agents keep separate counters. A local
"cancelled" state is unsafe if an external bindable offer remains live. A timeout
is unsafe if a PSP already captured. Cairn can make its authority ledger serializable
and its saga legible; it cannot claim distributed exactly-once execution.

Broader delegation remains blocked until:

- the authoritative reservation service exists;
- two-agent budget and inventory race drills pass with mutation controls;
- revocation fails closed while offline;
- PSP/chain timeout recovery produces receiver-backed receipts;
- user testing shows people distinguish advice, send, commitment, funding, and release;
- legal review covers when automated offers/messages become binding.

### 27.4 Serious alternative

Keep every BYO agent permanently at `read_projection`, `recommend`, and `prepare`.
Cairn operates the deterministic transaction workstation, and the principal signs
every message that can bind terms, every payment, every release, every disclosure,
and every waiver.

This smaller model retains portable intent, competing agents, evidence coaching,
deal continuity, and excellent preparation while sharply reducing trusted surface.
It is a valid end state for uncertain physical goods, not merely a temporary
failure to automate.

The recommended launch order follows this alternative first, then promotes
supervised communication, bounded counters, human-present term commitment, and
low-value single-use payment grants only after the applicable drills pass.

## 28. Open questions

These are unresolved and MUST NOT be papered over with permissive defaults:

1. Should an authority-claims Merkle root replace full-profile version pinning so
   unrelated private edits do not invalidate a grant?
2. Which component operates the reservation ledger, and what failure/consistency
   model is acceptable across regions and offline clients?
3. Which production key registry, principal recovery path, consent-surface
   attestation, and capability/value-specific confirmation assurance profiles
   sit above the mandatory v0.1 Ed25519 object-signature profile?
4. When does a bindable automated offer create legal obligations in each launch
   jurisdiction?
5. What exact values/action counts/expiries are eligible for delegated negotiation
   or funding in a pilot?
6. Can privacy-preserving pairwise principal/agent identifiers prevent cross-service
   correlation without breaking receipts and dispute resolution?
7. What provider receipts are strong enough to mark PayPal authorization, capture,
   settlement, reversal, and refund distinctly?
8. How should offline/in-person card-show receipts bind both parties without making
   key control equal identity?
9. Can an automated release ever be appropriate for a physical-card transaction,
   or should release remain permanently human-reserved?
10. Should Cairn keep its own manifest or become an A2A extension with only Cairn
    payload schemas?

## 29. Standards references and adoption status

These references inform interoperability; they do not replace Cairn semantics.

| Reference | Status used here | Cairn posture |
|---|---|---|
| [MCP lifecycle 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle) | dated MCP target; Tasks experimental in that release | adopted binding; Cairn state does not depend on MCP Tasks |
| [A2A 1.0.0 specification](https://a2a-protocol.org/v1.0.0/specification/) | pinned agent/task/artifact/extension bridge | adopted bridge; A2A IDs remain server-owned and Cairn receipts persist separately |
| [UCP 2026-04-08](https://ucp.dev/2026-04-08/specification/overview/) | discovery/commerce capability model | directional checkout adapter |
| [ACP 2026-04-17 snapshot](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/tree/main/spec/2026-04-17) | dated beta-era schema snapshot; not `unreleased` | directional cash-checkout adapter |
| [AP2 v0.2 specification](https://ap2-protocol.org/ap2/specification/) | Checkout/Payment Mandates and receipts | directional mapping only; no FIDO conformance claim |
| [FIDO agent standards work](https://fidoalliance.org/fido-alliance-to-develop-standards-for-trusted-ai-agent-interactions/) | standards development in progress | track; do not overclaim |
| [RFC 8707](https://www.rfc-editor.org/rfc/rfc8707.html) | OAuth resource indicators | adopted external-agent profile |
| [RFC 9396](https://www.rfc-editor.org/rfc/rfc9396.html) | Rich Authorization Requests | adopted external-agent profile |
| [RFC 9449](https://www.rfc-editor.org/rfc/rfc9449.html) | DPoP sender constraint | adopted with body signature/mandate |
| [RFC 9728](https://www.rfc-editor.org/rfc/rfc9728.html) | protected resource metadata | adopted external-agent profile |
| [W3C VC 2.0](https://www.w3.org/TR/vc-data-model/) | W3C Recommendation | optional credential carrier |
| [Visa Trusted Agent Protocol](https://developer.visa.com/capabilities/trusted-agent-protocol/trusted-agent-protocol-specifications/) | rail-specific agent identity | optional trust import only |

Where a dated/versioned URL exists it is pinned above. ACP's dated directory is
content-selected but remains on a mutable repository branch; an implementation
artifact MUST additionally record the exact commit digest it tested. The FIDO and
Visa references describe evolving or rail-specific work rather than frozen Cairn
dependencies. A conformance report MUST record exact fetched artifact digests and
MUST NOT rely on a provider's drifting `latest` documentation.

## 30. Audit record and changelog

### 30.1 Independent round-one findings incorporated

- Architecture/object pass: added exact intent projection, copy/evidence epochs,
  append-only deal continuity, independent action boundaries, reservations, and
  receiver-backed receipts.
- Authority/security pass: added identity layers, hostile-data containment,
  disclosure receipts, fail-closed revocation, atomic aggregate exposure,
  reconciliation, payment/release separation, failure taxonomy, attack matrix,
  and proposal-first launch posture.
- Interoperability pass: added manifest/version negotiation, OAuth RAR/resource/
  DPoP profile, HTTP/MCP/A2A bindings, adapter boundaries, BYO replacement, and
  version-pinned standards references.

### 30.2 Independent round-two findings dispositioned

The frozen round-two draft was 2,223 lines with SHA-256
`f9e8bfd4c13aaaf48dde3cc2a17dc03743103a522688748d1114ab182e278226`.
Three independent auditors reviewed that exact artifact: architecture/object
closure, authority/security abuse, and standards/interoperability.

Blocking and high findings were closed in this draft by:

- defining nonrecursive object hashing, Ed25519 signatures, stable references,
  `ActionRecord`, canonical deal heads, and noncircular terms/reservation hashes;
- separating buyer authority, seller inventory, and duplicate-effect leases;
- binding human-present authorizations to the same reservation/redemption path;
- requiring execution-time nonce/fence/effect/deal-head redemption;
- defining exact-copy evidence roles, private deal views, data/disclosure grants,
  runtime bindings, confirmation assurance, and arbiter conflicts;
- defining payment/payee/provider objects, complete receipt families, receiver
  finality, unknown-state reconciliation, and a posted-ask golden trace;
- correcting MCP, A2A, UCP/ACP, AP2, OAuth, VC, discovery, version, and media-type
  boundaries while making machine-readable conformance an explicit future gate;
- adding each reported abuse path to the mutation-controlled test matrix.

No finding was closed by claiming the current site or contracts implement the new
object model. Settlement, delegated action, and release remain gated in §22/§27.

### 30.3 Independent round-three findings dispositioned

The frozen round-three draft was 3,131 lines with SHA-256
`2ce9fcb70f8f36831c73e520b237b9b642cfb0797c52675cf3d784b55ef530ce`.
Architecture, authority/security, and standards/BYO auditors cold-read that exact
artifact. Their blocker/high findings produced:

- typed `PostedAsk`, `TermsAcceptance`, `ClosedTerms`, and complete posted-ask
  checkout ordering rather than implicit seller or buyer acceptance;
- generalized data grants, atomic disclosure counts, typed evidence requirements,
  explicit direct-transaction authority, and resolvable continuation artifacts;
- semantic effect leases, execution-time redemption, noncircular receipt chains,
  provider-import normalization, safe inventory sagas, and derived arbiter quorum;
- exact MCP/A2A/OAuth/AP2 boundaries, a complete operation registry, profile
  inheritance, signed conformance manifests, and explicit machine-artifact gates.

### 30.4 Targeted closure rounds four through eight

Every targeted round froze the actual candidate before independent review. No
auditor edited the artifact it judged.

| Round | Frozen artifact | Focus and disposition |
|---:|---|---|
| 4 | 3,665 lines; `e8ca7996f5d4dde7c11d9c59bc0e28f80d0c3bc923e853c23ac7db5da6837c2d` | Found the posted-ask/reservation hash cycle, UUID-derived effect bypass, crash-expiring dispatch claim, provider-import cycle, and incomplete BYO grant graph; all redesigned. |
| 5 | 3,793 lines; `f6e0dd974f3882c0cf18b92acdb085daee7c73adbbd869dc59f1af49ba4f1793` | Found array-order and executor effect forks, late first-call authority, underbound provider events, and inline continuation unknowns; all closed with semantic projections, deadlines, exact event bindings, and granted unknown refs. |
| 6 | 3,852 lines; `8ddda10eae98ad9d063d5bc08158017570e848df8853841e7f118b3dc898e495` | Found missing stale-worker non-submission proof and an undefined provider-operation comparison; both received typed, mutation-tested bindings. |
| 7 | 3,898 lines; `1d2959c037d3db2b847ea74242493786e522b4df7ecf7cfee286f4590233241f` | Found one incompatible reconciliation receipt branch after confirmed no-handoff; replaced it with a discriminated schema. |
| 8 | 3,909 lines; `108dfbe1699f52a21690de6d2d1d12ea06429d9a15269f6b641c49fc463ba2f3` | Two independent auditors attacked the final reconciliation seam; both passed it with no blocker/high residual. |

The final pass did not prove the implementation. It means the frozen prose design
had no undispositioned blocker/high finding from those reviews. The 2026-07-20
machine adjunct now closes only the dependency-contained proposal-foundation
portion of that gap; authoritative services, full profile artifacts, and an
independent implementation verification remain release gates.

The proposal-foundation adjunct advertises an exact ten-operation subset of the
full §20.1 target surface. It deliberately omits `continuation.get`: the bundle,
authorization, and one-shot mutation controls are testable locally, but private
delivery MUST NOT be advertised until a shared authoritative disclosure ledger
can reserve and consume the exact bundle/runtime/delivery binding atomically.

### 30.5 Hardening bar

The prose-design bar is complete:

```text
one independent design round plus seven frozen artifact review rounds dispositioned
all reported blocker/high findings closed in the design
final closure seam independently rechecked
Markdown structure, internal document links, and normative vocabulary linted
SYNC marker closed with an honest design-only maturity statement
```

Implementation readiness still requires the unbuilt schemas outside the
proposal-foundation slice, OpenAPI/MCP/A2A bindings, authoritative ledgers and
services, provider adapters, receiver-backed golden traces, the executable BYO
replacement run, independent verification, and the signed conformance report
required by §22. The foundation bundle's local vectors and mutation controls do
not promote any functional profile; every profile remains an unclaimed target.

### 30.6 Changelog

- **v0.1 draft, 2026-07-19:** first integrated agent-neutral intent, delegation,
  continuity, execution, receipt, and interoperability specification.
- **v0.1 machine adjunct, 2026-07-20:** added the proposal-only `protocol/`
  schemas, registry, deterministic bundle, cryptographic vectors, and local
  mutation controls without changing the normative runtime/conformance status.
- **v0.1 machine-adjunct hardening, 2026-07-20:** added full signed-envelope,
  runtime, DataGrant, continuation, effect, receipt, and resolved-object binding
  validators; authenticated signature metadata; pinned the exact ten-operation
  foundation surface; and kept private continuation delivery outside the registry
  until an authoritative one-shot ledger exists.
- **v0.1 machine-adjunct re-audit hardening, 2026-07-20:** made resolved key
  records and authoritative grant counters total, covered the independently
  resolved effect descriptor, enforced object expiry and preparation deal-head /
  signer identity, returned stored results for identical idempotent retries,
  supported the principal-direct preparation branch, and closed annotation,
  unknown-schema, and array-property failure modes found by frozen re-audit.
- **v0.1 machine-adjunct cold-audit hardening, 2026-07-20:** made every exported
  validation boundary total and fail-closed; authenticated a fresh transport
  before typed idempotent result reuse; pinned capabilities to the exact registry
  and bundle; required non-empty grant scopes; recursively froze annotation
  expectations; aligned continuation authorization with a closed authoritative
  state schema; required exact UTC key timestamps; and defined `write_object` as
  non-authorizing principal-signed intent storage. These are local validation and
  mutation controls, not a shared service or conformance claim.
- **v0.1 machine-adjunct tuple-key hardening, 2026-07-20:** replaced ambiguous
  delimiter-joined idempotency state keys with canonical structural tuple keys
  and tightened every signed-object timestamp to the exact RFC 3339 UTC grammar;
  direct regression and implementation-mutation controls cover both findings.
