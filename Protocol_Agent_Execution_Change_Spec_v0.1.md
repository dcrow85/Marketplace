# Cairn Agent Execution Change Specification v0.1

Status: prose design with a locally verified narrowed Phase-1 containment profile pending an exact containing-commit freeze and fresh three-reviewer verification; not implementation-authorizing
Date: 2026-07-21
Containment amendment: 2026-07-23
Change class: additive; no existing machine operation is widened
Baseline: `Protocol_Agent_Intent_Interop_v0.1.md`, frozen proposal foundation
`e653556`, and frozen proposal-only service `1711a56`

## 0. Decision

Cairn SHOULD adopt the simplicity of a separately bounded agent execution
compartment while preserving a stronger protocol boundary: connecting an agent
does not grant authority; durable intent, disclosed data, economic authority,
review, execution, receiver confirmation, and release remain separately typed,
enforced, and receipted.

This document specifies a change. It does not authorize implementation,
deployment, payment, settlement, release, waiver, or live agent execution.

## 1. Epistemic record

### 1.1 Observations

Robinhood's public Agentic Trading materials and public MCP/OAuth metadata,
inspected on 2026-07-21, show:

1. A third-party agent connects through MCP and OAuth.
2. Trading is restricted to a dedicated, user-funded Agentic Account.
3. The agent may read broader account data than the account in which it trades.
4. Public tools separate order review, placement, cancellation, and receiver
   state reads for equities and options.
5. The user may instruct the agent to act without per-transaction review.
6. Trades appear in ordinary activity, P&L, and notifications; the connection
   can be disabled.
7. Robinhood's public agreement treats an authenticated instruction as binding
   when Robinhood receives it and does not promise that later revocation unwinds
   an already received instruction.
8. Public OAuth metadata uses protected-resource discovery, PKCE, dynamic client
   registration, and one coarse `internal` scope.

Primary sources:

- <https://robinhood.com/us/en/agentic-trading/>
- <https://robinhood.com/us/en/support/articles/agentic-trading-overview/>
- <https://robinhood.com/us/en/support/articles/trading-with-your-agent/>
- <https://robinhood.com/us/en/newsroom/robinhood-is-now-open-to-agents/>
- <https://cdn.robinhood.com/assets/robinhood/legal/Robinhood-Customer-Agreement.pdf>
- <https://agent.robinhood.com/.well-known/oauth-protected-resource/mcp/trading>
- <https://agent.robinhood.com/.well-known/oauth-authorization-server>

### 1.2 Inferences adopted

- A separately bounded economic compartment is a comprehensible blast-radius
  control.
- Review and place must be distinct and cryptographically bound events.
- MCP and OAuth are connection/transport, not durable intent or mandate.
- Receiver receipt time, not model narration, determines external acceptance.
- The ordinary activity surface is part of the safety architecture.
- The safe path is proposal-first, one-shot human authorization next, then
  bounded delegation under deterministic limits.

### 1.3 Open questions

Robinhood may enforce internal limits, review/place linkage, runtime identity,
signed traces, or taint controls that are not documented publicly. This spec does
not claim those controls are absent.

Cairn has not yet established production confirmation assurance, jurisdictional
rules for automated bindable offers, provider finality profiles, delegated-value
thresholds, retention periods, or whether a logical ledger is an adequate
compartment for a rail without genuinely segregated funds.

## 2. Scope and compatibility

### 2.1 In scope

- agent connection distinct from authority;
- execution compartment and exposure ledger;
- four human execution modes compiled to exact grants;
- review receipt bound to execution;
- deterministic mandate, exposure, staleness, taint, and revocation gates;
- execution, cancellation, reconciliation, and activity semantics;
- MCP/HTTP operation additions;
- staged implementation and conformance plan; and
- consent, monitoring, and emergency surfaces.

### 2.2 Out of scope

This change does not modify the frozen ten-operation proposal foundation, make
Anko required or authoritative, make OAuth sufficient authority, let a model
validate its own mandate, authorize release/waiver/arbitration, prove physical
facts, promise distributed exactly-once execution, require escrow, add a provider
adapter, or claim conformance from prose.

### 2.3 Compatibility law

The existing `cairn-proposal-foundation-v0.1` profile remains byte-stable at base
bundle `sha-256:d84dd5c2a925575c4889ab51f784cca58bd7c7ec14fcf0ae66dd7d8a6eeff29c`.
The execution profile identifier is exactly
`cairn-supervised-execution-v0.1`. It uses a distinct protected-resource audience,
HTTP route, MCP server identity, registry, and schema bundle. Existing operation
meanings and schemas MUST NOT be widened in place.

The future execution envelope MUST bind all of:

```yaml
protocol_version: "0.1"
profile_id: cairn-supervised-execution-v0.1
base_bundle_hash: sha-256:d84dd5c2a925575c4889ab51f784cca58bd7c7ec14fcf0ae66dd7d8a6eeff29c
execution_bundle_hash: sha-256:<frozen execution bundle hash>
operation_registry_hash: sha-256:<frozen execution registry hash>
```

The execution profile cannot be published until the two new hashes exist. Both
profiles MUST reject a request bearing the other profile, resource audience,
bundle hash, or operation registry hash before any mutation. The proposal-only
service never routes an execution operation, even if the operation name is known.

## 3. Design laws

1. **Connection is not authority.** OAuth, MCP initialization, runtime-key
   possession, discovery, or data access MUST NOT create economic capability.
2. **Intent is not authority.** Intent, preference, chat, inference, or previous
   approval cannot substitute for `AgentMandate` or `ActionAuthorization`.
3. **Advice is not execution.** Models propose; deterministic services validate,
   reserve, redeem, execute, and reconcile.
4. **Review is not authorization.** A review reports checks and warnings but
   grants no capability.
5. **Authorization is not submission.** Prepared, authorized, reserved,
   redemption committed, submitted, acknowledged, finalized, failed, unknown,
   cancelled, and expired remain distinct.
6. **Receiver truth outranks local narration.** Acknowledged/finalized requires
   a verified receiver receipt under a rail-specific rule.
7. **Revocation stops the future, not history.** It blocks new redemption but
   does not undo receiver-accepted actions.
8. **Data and power are independent.** Private reads need `DataGrant`; effects
   need separate authority.
9. **Economic isolation is explicit.** Delegated value needs a named execution
   compartment and honest protection class.
10. **Untrusted content cannot become execution parameters.** Seller text, web
    content, OCR, messages, and model prose never directly supply target, payee,
    amount, rail, copy, terms, credentials, or authority.
11. **Permission is non-transitive.** Prepare does not imply send; accept does
    not imply pay; fund does not imply release; one copy does not imply another.
12. **Simple surfaces may collapse ceremonies, not objects.** One checkout
    confirmation may produce several exact signed objects; none may be omitted.

## 4. Human execution modes

Modes are consent presets, not an authority hierarchy.

| Label | Outcome | Authority |
|---|---|---|
| **Advise me** | read granted projections; private judgments | capability-specific DataGrant |
| **Prepare for me** | drafts, piles, comparisons, proposals; nothing sent | DataGrant plus signed proposal/preparation prerequisites |
| **Ask before acting** | one human ceremony compiles every object required for one exact effect | one-shot authorization plus any disclosure and reservations required by the capability |
| **Act within my limits** | exact capabilities inside a current mandate and compartment | DataGrant, disclosure authority where data leaves Cairn, mandate, gate, and applicable reservations |

Changing mode MUST issue or revoke typed objects. A toggle alone cannot change
authority. Every consent surface names agent/runtime, actions, readable and
disclosable data, cards/sellers/recipients/rails, per-action/window/aggregate/
outstanding limits, evidence, expiry, remaining human decisions, forbidden
powers, freeze controls, and what freezing cannot undo.

`Act within my limits` requires finite numeric limits and expiry. Null, missing,
negative, non-integral, overflowed, cross-asset, or unrecognized limits deny.

The mode compiler uses this closed prerequisite matrix; a mode label is never
submitted to a gate as authority:

| Capability family | DataGrant | DisclosureAuthorization | ActionAuthorization or Mandate | Authority reservation | Inventory reservation | Receiver receipt |
|---|---:|---:|---:|---:|---:|---:|
| private read/advice | required | no | no | no | no | no |
| private preparation | required | no | preparation signature only | no | no | preparation receipt only |
| disclose/send evidence | required | required | required | disclosure reservation when consumable | no | delivery/disclosure receipt |
| nonbinding message/request | as used | as used | required | count/rate reservation | no | receiver/message receipt |
| bindable offer/counter | as used | as used | required | maximum exposure | seller inventory when exact copy is fenced | receiver/deal receipt |
| accept terms | as used | as used | required | maximum exposure | exact inventory | deal-service receipt |
| move value | as used | required for provider fields | required | worst-case money exposure | as terms require | provider/contract receipt |
| cancel receiver action | as used | as used | separate one-shot CancellationAuthorization | preserve original exposure | preserve original fence until confirmed | receiver cancellation receipt |

The v0.1 execution capability registry is exhaustive:

| Exact capability | Constraint class | Required exposure rule |
|---|---|---|
| `send_typed_nonbinding_notice` | nonfinancial_external | count/rate/payload/audience; closed notice codes only |
| `request_evidence` | nonfinancial_external | count/rate/audience plus closed evidence-code/ref/upload bounds only |
| `obtain_provider_review` | nonfinancial_external | count/rate/payload/audience; no paid variant in v0.1 |
| `submit_bindable_offer` | financial_obligation | full worst-case legal/economic exposure |
| `submit_counteroffer` | financial_obligation | full worst-case legal/economic exposure |
| `accept_terms` | financial_obligation | full canonical obligation exposure |
| `authorize_payment` | financial_value | same exact obligation exposure plus rail costs under the universal transfer rule |
| `fund_escrow` | financial_value | same exact obligation exposure plus funds/fees/reversal costs under the universal transfer rule |
| `cancel_receiver_action` | cancellation | preserve original exposure; count/rate only; fee MUST be zero/absent |

No other effectful capability conforms. “Financial” includes any bindable or
value-bearing obligation, not only movement of money. A future paid message,
review, cancellation, release, waiver, or dispute capability needs a new frozen
registry entry and exact exposure profile; it cannot reuse a nonfinancial row.
Every v0.1 financial-obligation or financial-value action binds one immutable
`ObligationExposureCore`. Payment or escrow funding either fulfills that exact
existing obligation with an atomic exposure-role transfer or, for a direct
posted ask, uses a checkout core that creates the obligation before terms are
accepted. A null/unmatched core, heuristic deal matching, or an item-price debit
in both obligation and fulfillment reservations is nonconforming.

`send_typed_nonbinding_notice` has no free-text body. Its closed wire schema
permits only registry codes such as `request_information`, `request_scan`, or
`share_status`, typed ObjectRefs, and non-economic routing metadata. It forbids
price, quantity, terms, offer/counter/acceptance verbs, payment fields, and custom
extensions. The exact receiver-channel policy is authenticated and guarantees
that this operation cannot form or accept a binding obligation. Arbitrary text—
including “I accept”—is not available through this capability and must use an
appropriate bindable capability plus exposure reservation or remain human-only.
`request_evidence` is equally closed: its payload is exactly one or more registry
codes (`front_photo`, `back_photo`, `corners`, `surface_closeup`, `holo_tilt`,
`timestamp_with_card`, or `condition_declaration`), exact card/copy ObjectRefs,
upload-slot descriptors, maximum file counts/bytes, and non-economic routing
metadata. It has no free text, price, quantity, offer/counter/acceptance verb,
payment/terms field, or extension point. Its authenticated receiver-channel
policy must guarantee that the message class cannot form or accept an obligation;
otherwise the operation denies and any human message remains outside agent
execution or uses a bindable capability with full exposure.
v0.1 cancellation similarly rejects any nonzero/unknown fee at quote, review,
gate, and outbox; a paid cancellation is future financial capability work.
It also requires the closed receiver-cancellation credential branch derived from
the original handoff's exact credential, account/contract scope, receiver, and
operation namespace. Replacement credentials require signed same-scope
continuity; audience equality alone never authorizes cancellation.

Communication mandates use finite audience, action-count, and rate limits; money
limits do not substitute for them. One consent ceremony MAY preview and sign
several independent objects, but each retains its own schema, signature, expiry,
reservation, and receipt.

## 5. New typed objects

These are design requirements, not shipped schemas.

### 5.1 Connection authorization and authoritative state

Connection configuration, mutable service state, DataGrants, and mandates are
four separate graphs. Only mandate/DataGrant objects point toward a connection
authorization when needed; the connection never embeds reverse ObjectRefs to
them, preventing a content-hash cycle.

```yaml
schema: cairn.agent_connection_authorization.v0.1
connection_authorization_id: urn:uuid:<uuid>
principal_id: <principal>
agent_runtime_binding_ref: <ObjectRef>
execution_resource_audiences: [<exact canonical URI>]
allowed_transport_bindings: [cairn_http | mcp]
oauth_profile:
  required: true
  permitted_issuers: []
  permitted_client_ids: []
  exact_resources: []
  dpop_required: true | false
not_before: <time>
expires_at: <time>
authorization_hash: sha-256:<hex>
principal_signature: <Signature>
not_claiming: [economic_authority, data_access, agent_competence,
               provider_supervision]
```

Every external agent runtime uses this OAuth proof-of-possession profile. A
principal acting directly is a separate authentication branch and does not create
an `AgentConnection`. A mandate binds the runtime and exact economic resource
audience, not the transient MCP/HTTP transport. A principal MAY deliberately
issue a narrower transport-specific mandate, but transport neutrality is the
default. Any future closed-network binding is a different profile with its own
typed authorization, registry, resource, threat model, and conformance vectors;
v0.1 contains no unauthenticated or prose-defined escape branch.

A2A is not an execution binding in v0.1. It may transport advisory/proposal
objects under the baseline, but an effectful A2A profile requires its own exact
resource, authentication, envelope mapping, registry mapping, and vectors.

```yaml
schema: cairn.agent_connection_state_head.v0.1
connection_state_id: sha-256:<JCS(profile_id, connection_authorization_ref,
                                  connection_authorization_hash)>
principal_id: <principal>
connection_authorization_ref: <ObjectRef>
connection_authorization_hash: sha-256:<hex>
agent_runtime_binding_ref: <ObjectRef>
authority_namespace: <server-owned namespace>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: active | paused | revoked | expired
pause_epoch: <monotonic integer; reversible control generation>
revocation_nonce: <monotonic integer; irreversible authority generation>
connection_scoped_control_key: sha-256:<stable connection-scope leaf key>
connection_scoped_control_leaf_hash: sha-256:<exact scoped leaf commitment>
outstanding_action_index_key: sha-256:<stable connection-state id>
accepted_at: <authority-service time>
updated_at: <authority-service time>
state_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.connection_state_event_receipt.v0.1
connection_state_id: sha-256:<same stable id>
cause: authorization_genesis | principal_control | authority_time_expiry
connection_authorization_ref: <ObjectRef>
connection_authorization_hash: sha-256:<hex>
connection_before_head_ref: <ObjectRef or null only for genesis>
connection_before_head_hash: sha-256:<hex or null>
connection_after_head_ref: <ObjectRef>
connection_after_head_hash: sha-256:<hex>
aggregate_control_before_head_ref: <ObjectRef>
aggregate_control_before_head_hash: sha-256:<hex>
aggregate_control_after_head_ref: <ObjectRef>
aggregate_control_after_head_hash: sha-256:<hex>
connection_leaf_before_hash: sha-256:<hex or canonical absent leaf for genesis>
connection_leaf_after_hash: sha-256:<hex>
pause_epoch_before: <integer or null for genesis>
pause_epoch_after: <integer>
revocation_nonce_before: <integer or null for genesis>
revocation_nonce_after: <integer>
expected_connection_sequence_before: <integer or null only for genesis>
principal_control_authorization_ref: <ObjectRef required iff principal_control>
principal_control_authorization_hash: sha-256:<hex or null on other causes>
outstanding_action_index_before_head_ref: <current ObjectRef or null only at genesis>
outstanding_action_index_before_head_hash: sha-256:<hex or null>
outstanding_action_index_after_head_ref: <canonical empty genesis or same/exact successor ObjectRef>
outstanding_action_index_after_head_hash: sha-256:<hex>
authority_transaction_id: <one connection/control CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.connection_outstanding_action_index_state_head.v0.1
outstanding_action_index_key: sha-256:<stable connection-state id>
connection_state_id: sha-256:<same stable connection>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
outstanding_action_map_ref: <enumerable_map_root ObjectRef>
outstanding_action_map_hash: sha-256:<hex>
outstanding_action_count: <checked uint64>
outstanding_action_root: sha-256:<must equal map entries_root>
state: active | sealed
updated_at: <authority-service time>
head_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.connection_outstanding_action_entry.v0.1
outstanding_action_key: sha-256:<connection/action/effect/lineage>
connection_state_id: sha-256:<same connection>
action_ref: <ObjectRef>
effect_id: sha-256:<hex>
lineage_id: sha-256:<hex>
current_action_state_head_ref: <ObjectRef>
current_action_state_head_hash: sha-256:<hex>
receiver_event_stream_key: sha-256:<hex or null before redemption/local effect>
finality_transition_profile_ref: <ObjectRef or null for receiverless local effect>
finality_transition_profile_hash: sha-256:<hex or null>
sequence: <monotonic integer>
previous_entry_hash: sha-256:<hex or null at reservation>
state: reserved | handed_off | receiver_state_current
entry_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.connection_outstanding_action_index_transition_receipt.v0.1
outstanding_action_index_key: sha-256:<same key>
cause: connection_genesis | action_reserved | action_head_updated |
       fenced_non_submission_removed | authenticated_stream_closed_removed |
       authenticated_irreversible_horizon_removed |
       connection_restriction_snapshot | connection_terminal_seal
before_head_ref: <ObjectRef or null only at genesis>
before_head_hash: sha-256:<hex or null>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
before_action_map_ref: <ObjectRef or null only at genesis>
before_action_map_hash: sha-256:<hex or null>
after_action_map_ref: <ObjectRef>
after_action_map_hash: sha-256:<hex>
changed_action_key: sha-256:<hex or null for restriction snapshot>
changed_entry_before_ref: <ObjectRef or null for genesis/new reservation/snapshot>
changed_entry_before_hash: sha-256:<hex or null>
changed_entry_after_ref: <ObjectRef or null for terminal removal/snapshot>
changed_entry_after_hash: sha-256:<hex or null>
before_change_proof: <closed enumerable-map membership/nonmembership proof or null
                      exactly for genesis/restriction snapshot/terminal seal>
after_change_proof: <matching proof under the successor root or null under the same union>
action_transition_receipt_ref: <exact cairn.action_receipt.v0.2 ObjectRef iff action_head_updated>
action_transition_receipt_hash: sha-256:<hex or null under the same union>
terminal_evidence_ref: <ObjectRef or null unless terminal removal>
terminal_evidence_hash: sha-256:<hex or null>
authority_transaction_id: <same reservation/event/control transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Every finite private read uses one serializable read transaction shared by HTTP,
MCP, the app, and internal services. It verifies the exact grant, owner, runtime,
connection/control heads, purpose, field paths, audience, current grant head,
nonce, positive count, page bounds, and response caps; decrements
`remaining_reads`; and commits a `cairn.data_grant_read_receipt.v0.1` plus response-
handoff marker before private bytes become available. Concurrent reads CAS the
same head, so only one can consume the final count. An ambiguous response handoff
consumes the read. It is never rewound; another attempt consumes another count or
requires a new grant. Each page consumes one read.

Every surface routes that transaction through the authority-internal
`execution.data_grant_read.commit`; surface-specific `*.get` operations never
write DataGrantStateHead themselves. The commit operation supplies the one typed
read cause to `execution.data_grant_state.transition` and both receipts share one
transaction ID.

Every transition emits `cairn.connection_state_event_receipt.v0.1` binding prior
and next heads, expected sequence, control authorization, service time, and
outstanding actions. Discovery indices from a connection to grants/mandates are
server-owned query results, not signed authority and not disclosed without an
applicable DataGrant. OAuth refresh cannot extend or revive Cairn state.

The receipt union is closed. `principal_control` requires the exact signed
control authorization and expected predecessor sequence. Genesis and
authority-time expiry forbid those two fields. Every branch carries the exact
before/after signed outstanding-action index heads (whose canonical empty map is
valid), so disconnect, pause, expiry, and recovery can be audited after restart
without consulting an auxiliary action table.

Connection authorization genesis creates a separate current outstanding-action
index head over the canonical empty `connection_outstanding_action` map. Every
external-effect reservation under the connection atomically inserts its action/
lineage commitment; first handoff and later receiver events update the referenced
current action head, and only fenced non-submission, authenticated stream
closure, or the finality profile's authenticated irreversible horizon removes
it. Those ordinary updates advance the index head, not the
connection lifecycle head, so unrelated work is not staled. A connection control
transition CASes the exact index head and carries its unchanged or restrictive
successor in the joint receipt. The generic enumerable-map getter/scan is its
restart-safe membership API; there is no auxiliary table or lifetime action cap.

The index matrix is closed: `active → active | sealed`; `sealed → sealed` only
for head updates or terminal removals of entries already present when the
connection was sealed. `sealed` forbids new reservation entries and never returns
to active. A terminal connection transition may seal a nonempty index so later
authenticated receiver evidence can reconcile and remove existing work; once
empty it remains an empty sealed tombstone. Every terminal-removal cause carries
its exact fenced, closure, or irreversible-horizon proof and commits in the same
action/stream/assignment transaction.

Every named map change carries before/after path proofs under the exact signed
roots. The unchanged frontier commitments must be byte-equal, so only
`changed_action_key` can differ. Reservation proves nonmembership→membership;
head update proves membership→membership; terminal removal proves
membership→nonmembership. An `action_head_updated` receipt resolves the exact
ActionRecord, before/after ActionStateHeads, BindingSet, and ActionReceipt and
runs the complete ActionReceipt validator, including its prior-receipt, lineage,
policy, exposure, checkout, and receiver rules. Selected field comparisons are
not a substitute. A terminal removal resolves and validates the exact receiver
outstanding transition and requires the same connection entry, cause,
transaction, and commit time.

There is one connection-head writer:
the authority-internal `execution.connection_state.transition`. A principal
`execution.control.issue(scope:connection)` request supplies its signed
pause/resume/freeze_new_redemptions/revoke cause; authenticated authority-service time supplies the
expiry cause. The writer CASes the connection state and its connection-scoped
leaf inside the aggregate ExecutionControlStateHead in one authority transaction
and returns one joint receipt containing connection before/after refs, aggregate-
control before/after refs, leaf before/after hashes, and nonces. The connection
head stores only the stable leaf key and leaf commitment, not the refreshable
aggregate-head ref. No other operation writes either half of that connection-
scoped pair. An unrelated runtime/mandate/compartment/action leaf update may
advance the aggregate head while retaining this leaf hash and does not stale the
connection. A runtime-bound execution DataGrant names that exact connection
authorization. Every private read, gate, and outbox handoff verifies the current
connection head, the current aggregate control head, and a membership proof that
the same connection leaf is present with matching hash/nonces;
either restrictive plane denies.
The joint matrix includes `(connection:active, control:active) →
(connection:active, control:frozen_new_redemptions)` and its fresh-authority
resume back to the active pair. The connection head advances sequence while
retaining state `active` and binds the new leaf hash. Pause/resume changes the
paired states together; revoke/expiry remain terminal. No control-only update is
valid for connection scope.

`execution.connection_authorization.issue` is also the sole connection-state
genesis constructor. In the authorization-issue transaction it derives the
state ID above, insert-only binds one current state chain to that exact
authorization ref/hash, creates the active generation-0 connection head and
connection-scoped control leaf, and emits their joint genesis receipt. Exact
same-authorization replay returns the same bytes; a second head, altered hash,
or concurrent fork for that state ID conflicts. No UUID, reconnect, OAuth
refresh, or transition operation can construct another genesis.

Data access and outbound disclosure each have their own online state:

```yaml
schema: cairn.data_grant_state_head.v0.1
data_grant_state_id: urn:uuid:<uuid>
principal_id: <principal>
data_grant_ref: <ObjectRef>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: active | paused | exhausted | revoked | expired
revocation_nonce: <monotonic integer>
remaining_reads: <nonnegative bounded integer>
maximum_response_bytes: <positive bounded integer>
maximum_response_items: <positive bounded integer>
query_bound:
  kind: temporal | non_temporal
  maximum_range_seconds: <positive integer; required only for temporal>
  maximum_keys_or_partitions: <positive integer; required only for non_temporal>
expires_at: <finite time>
updated_at: <authority-service time>
state_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Runtime/external grant issuance requires a positive count. The final read atomically
CASes `active,1 → exhausted,0`; zero is valid only with `state:exhausted`, and an
exhausted head cannot read or return to active. Null/unbounded count, expiry,
bytes, item caps, or branch-required query bound are
invalid for any runtime or external audience. The unused query-bound field is
forbidden. Principal-direct owner reads use the separate principal branch
and do not manufacture an unlimited runtime DataGrant.

`exhausted` denies every further read but does not erase the payload produced by
the final authorized read. After the `active,1 → exhausted,0` receipt, the
principal may issue a DisclosureAuthorization and the service may reserve/deliver
it only when payload hash, projection, fields, purpose, and source-read receipt
exactly match that final read; the grant's revocation nonce and expiry are
unchanged/current; and the state remains exhausted rather than paused, revoked,
or expired. The disclosure reservation therefore follows the final read. Outbox
rechecks this exception and records the source-read receipt; it never authorizes
another read or a different payload. Paused, revoked, and expired always deny.

This final-read disclosure ordering is a target for a later mutating profile,
not an exception in the Phase-1 schema-only bundle. Phase 1 has no read writer,
disclosure-reservation writer, or atomic read/disclosure transaction. Its
BindingSet validator therefore accepts only a current `active` grant head with
`remaining_reads > 0`; an `exhausted,0` head is historical evidence only and
cannot make a BindingSet eligible, even when an inline disclosure names that
head. Implementing the target ordering requires a separately frozen atomic
writer and new mutation/audit evidence.

The closed lifecycle is `active → active(read decrement) | paused | exhausted |
revoked | expired`; `paused → active | revoked | expired`; and `exhausted →
revoked | expired`. Exhausted preserves zero reads but is not immune to principal
revocation or authority-time expiry; either successor advances sequence/nonce and
immediately blocks a not-yet-handed-off disclosure. Revoked and expired are
terminal. An `expired` successor is valid only when `updated_at >= expires_at`;
every other state is valid only when `updated_at < expires_at`. Authority-time
expiry before that boundary and any non-expired successor at or after it are
invalid.

Every private read emits the unique signed provenance object below. The service
allocates `read_fence` serializably under the grant; no two receipts may name the
same prior head or fence. A final-read receipt MUST prove the exact
`active,remaining_reads:1 → exhausted,remaining_reads:0` CAS. Ordinary receipts
prove `active,n → active,n-1`. A receipt never authorizes disclosure by itself.

```yaml
schema: cairn.data_grant_read_receipt.v0.1
data_grant_ref: <ObjectRef>
prior_state_head_ref: <ObjectRef>
prior_state_head_hash: sha-256:<hex>
next_state_head_ref: <ObjectRef>
next_state_head_hash: sha-256:<hex>
read_fence: <monotonic integer>
projection_ref: <ObjectRef>
field_paths: []
purpose: <closed purpose>
query_commitment_hash: sha-256:<hex>
payload_hash: sha-256:<hex>
response_bytes: <bounded integer>
response_items: <bounded integer>
authority_transaction_id: <one grant-CAS/receipt/response-marker transaction>
data_grant_transition_commitment_hash: sha-256:<before/after/cause/fence transaction tuple>
response_handoff_marker_commitment_hash: sha-256:<payload/recipient/fence transaction tuple>
read_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.data_grant_state_transition_receipt.v0.1
data_grant_ref: <ObjectRef>
cause: read_decrement | pause | resume | revoke | authority_time_expiry
before_state_head_ref: <ObjectRef>
before_state_head_hash: sha-256:<hex>
after_state_head_ref: <ObjectRef>
after_state_head_hash: sha-256:<hex>
read_receipt_ref: <ObjectRef or null unless read_decrement>
read_receipt_hash: sha-256:<hex or null>
transition_commitment_hash: sha-256:<must equal read receipt iff read_decrement>
authority_transaction_id: <same joint transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.data_grant_response_handoff_marker.v0.1
data_grant_ref: <ObjectRef>
read_receipt_ref: <ObjectRef>
read_receipt_hash: sha-256:<hex>
payload_hash: sha-256:<exact returned bytes>
response_recipient: <principal or exact runtime>
read_fence: <same integer>
authority_transaction_id: <same joint transaction>
marker_commitment_hash: sha-256:<must equal read receipt commitment>
marked_at: <authority-service time before bytes are available>
marker_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The read receipt is constructed first from the precomputed transition and marker
commitments. The state-transition receipt and response marker then point one-way
to it; neither is referenced by a head that it references. Grant successor,
both receipts, and marker commit together before private bytes become available.
After restart, a committed marker means the read was handed off or ambiguously
handed off and remains consumed; absence means the whole transaction did not
commit. A transaction log alone is not this proof.

```yaml
schema: cairn.disclosure_authorization.v0.1
disclosure_authorization_id: urn:uuid:<uuid>
principal_id: <principal>
source_data_grant_ref: <ObjectRef>
source_read_receipt_ref: <ObjectRef>
source_read_receipt_hash: sha-256:<hex>
source_read_next_state_head_ref: <ObjectRef>
source_read_next_state_head_hash: sha-256:<hex>
source_read_fence: <integer>
projection_ref: <ObjectRef>
field_paths: []
disclosed_payload_hash: sha-256:<hex>
audience: <exact receiver/runtime/provider>
purpose: <closed purpose>
delivery_envelope_hash: sha-256:<hex>
maximum_deliveries: 1
not_before: <time>
expires_at: <short expiry>
principal_revocation_nonce: <integer>
authorization_hash: sha-256:<hex>
principal_signature: <Signature>
```

```yaml
schema: cairn.disclosure_authorization_state_head.v0.1
principal_id: <principal>
disclosure_authorization_ref: <ObjectRef>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: active | consumed | revoked | expired
revocation_nonce: <monotonic integer>
active_reservation_ref: <ObjectRef or null>
active_reservation_hash: sha-256:<hex or null>
active_reservation_fence: <integer or null>
consumed_reservation_ref: <ObjectRef or null; required only when consumed>
delivered_fence: <integer or null; required only when consumed>
updated_at: <authority-service time>
state_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The authorization state matrix is `active → active | consumed | revoked |
expired`. Active→active is only an exact single-reservation install/clear under the
hold/release/expiry operations below; all other destinations are terminal.
`consumed` requires exactly one consumed reservation ref and delivered fence;
every other state forbids them. `active` permits either all three active-
reservation fields null or all three present; `consumed`, `revoked`, and
`expired` require them all null. Because `maximum_deliveries` is exactly one and
concurrent holds are forbidden, the signed head itself retains the exact
reservation object and fence needed for crash-recoverable release, expiry,
revocation, or delivery.

`cairn.disclosure_reservation.v0.1` serializably reserves that single delivery
and binds the current DataGrant and disclosure-state heads, both revocation
nonces, the exact source-read receipt/head/fence, authorization/payload/envelope
hashes, an authority-service fence, expiry, and service signature. Holding
requires authorization state `active`, zero other active reservations, and no
permanent delivered fence for that authorization ID. The hold atomically CASes
that authorization head `active → active`, installing the exact reservation
ref/hash/fence; release or authority-time expiry atomically CASes it `active →
active` while clearing those exact fields. A principal revocation or authority-
time authorization expiry resolves and invalidates that exact signed reservation
when present, clears the three fields, and advances to `revoked` or `expired` in
one transaction.
The reservation cannot become usable before the
matching authorization-head successor commits. Its state head is
`held | handed_off | released | expired`. Only the fenced outbox can commit
`held → handed_off`; in the same transaction it MUST CAS the authorization
`active → consumed`, clear its active-reservation fields, and install an immutable
delivered fence keyed by authorization ID. The transition emits
`cairn.disclosure_receipt.v0.1` with both before/after authorization heads, the
source-read receipt/head/fence, reservation fence, encrypted delivery digest,
exact audience, handoff time, and authenticated receiver acknowledgement if one
exists. `consumed` is terminal and denies every later hold even when receiver
state is unknown. Revoking the DataGrant advances its state head and blocks a
not-yet-handed-off disclosure; it cannot retract bytes already delivered.
Revoking a DisclosureAuthorization advances its own state and nonce and
atomically invalidates the exact held reservation. Releasing one hold does not revive
or consume its authorization, but a subsequent hold still requires the unchanged
active head and no competing hold/delivered fence.

### 5.2 Execution compartment definition, backing, and state

```yaml
schema: cairn.provider_account_identity_head.v0.1
provider_trust_domain_id: <registry-canonical stable identity>
stable_root_account_id: <opaque immutable registry ID>
provider_account_identity_key: sha-256:<domain-separated trust domain/root tuple>
provider_account_identity_core_ref: <immutable signed identity ObjectRef>
provider_account_identity_core_hash: sha-256:<hex; invariant across generations>
sequence: <lifecycle revision; 0 at genesis and exactly prior sequence + 1 thereafter>
account_generation: <identity generation; increments only on generation_advanced and
                     remains unchanged on terminal restriction>
previous_state_hash: sha-256:<hex or null>
status: active | revoked | expired | quarantined
authenticated_alias_commitments: []
merge_evidence_refs: []
registry_release_ref: <ObjectRef>
updated_at: <registry authority time>
state_hash: sha-256:<hex>
registry_authority_signature: <Signature>
```

Alias additions are append-only. v0.1 performs no active root merge or ledger
redirect. Any evidence that two stable roots are the same account atomically
quarantines every affected root, compartment, and ledger before another
reservation; outstanding reservations/exposure remain held. A future merge
profile must name one canonical survivor and atomically roll up balances,
reservations, windows, spend, reversal exposure, fences, and redirects before
reactivation. Gate, reservation, redemption, and outbox require the current
`active` head/generation; revoked, expired, or quarantined all deny. Historical receipts retain the exact head used
at submission.

Verified child limits have their own authoritative current generation; an
immutable attestation alone is not a lifecycle head:

```yaml
schema: cairn.provider_sublimit_identity_head.v0.1
provider_trust_domain_id: <registry-canonical stable identity>
stable_root_account_id: <opaque immutable registry ID>
provider_sublimit_id: <canonical child id>
provider_sublimit_identity_key: sha-256:<domain-separated trust domain/root/sublimit tuple>
provider_sublimit_identity_core_ref: <immutable signed child identity ObjectRef>
provider_sublimit_identity_core_hash: sha-256:<hex; invariant across generations>
sequence: <lifecycle revision; 0 at genesis and exactly prior sequence + 1 thereafter>
sublimit_generation: <identity generation; increments only on generation_advanced and
                      remains unchanged on terminal restriction>
previous_state_hash: sha-256:<hex or null>
root_economic_resource_key: sha-256:<hex>
economic_resource_key: sha-256:<derived child key>
enforcement_locus: <provider feature/contract/permission id>
disjoint_sublimit_proof_ref: <current provider-signed ObjectRef>
disjoint_sublimit_proof_hash: sha-256:<hex>
enforced_cap: <Money>
status: active | revoked | expired | quarantined
updated_at: <registry authority time>
state_hash: sha-256:<hex>
registry_authority_signature: <Signature>
```

The external registry head's closed matrix is `active(g) → active(g+1) | revoked
| expired | quarantined`, plus registry-authenticated `revoked | expired →
quarantined`. Every edge advances lifecycle `sequence` by exactly one. Only
`generation_advanced` advances account/sublimit generation; every restriction
retains the predecessor generation. No state reactivates. The trust coordinator
never signs or rewrites this external truth. Any provider change to cap, locus,
disjointness proof, or child identity creates an authenticated active successor
generation or terminal quarantine, never an in-place
attestation refresh. Root resources require this head to be absent.

```yaml
schema: cairn.provider_identity_registry_transition_receipt.v0.1
identity_kind: provider_account_identity | provider_sublimit_identity
identity_stable_key: sha-256:<account or sublimit key>
identity_core_ref: <immutable ObjectRef>
identity_core_hash: sha-256:<hex>
cause: import_genesis | generation_advanced | registry_revoked |
       registry_expired | registry_quarantined
before_external_head_ref: <ObjectRef or null only at insert-only genesis>
before_external_head_hash: sha-256:<hex or null>
after_external_head_ref: <ObjectRef>
after_external_head_hash: sha-256:<hex>
before_generation: <integer or null at genesis>
after_generation: <0 at genesis, before + 1 on advance, same on restriction>
registry_transaction_id: <stable transaction>
committed_at: <registry authority time>
receipt_hash: sha-256:<hex>
registry_authority_signature: <Signature>
```

```yaml
schema: cairn.provider_identity_trust_overlay_state_head.v0.1
identity_kind: provider_account_identity | provider_sublimit_identity
identity_stable_key: sha-256:<same stable key>
identity_core_ref: <same immutable ObjectRef>
identity_core_hash: sha-256:<hex>
sequence: <monotonic overlay sequence>
previous_state_hash: sha-256:<hex or null at genesis>
state: eligible | quarantined
last_observed_external_head_ref: <exact registry-signed ObjectRef>
last_observed_external_head_hash: sha-256:<hex>
last_observed_external_generation: <integer>
quarantine_evidence_ref: <authenticated ObjectRef or null while eligible>
quarantine_evidence_hash: sha-256:<hex or null>
updated_at: <authority-service time>
state_hash: sha-256:<hex>
signer_kind: authority_service | trust_coordinator
authority_service_signature: <Signature or null unless genesis/ordinary observation>
trust_coordinator_signature: <Signature or null unless compromise quarantine>
```

```yaml
schema: cairn.provider_identity_trust_overlay_transition_receipt.v0.1
identity_kind: provider_account_identity | provider_sublimit_identity
identity_stable_key: sha-256:<same stable key>
cause: import_genesis | external_generation_observed | compromise_quarantine
before_overlay_head_ref: <ObjectRef or null only at genesis>
before_overlay_head_hash: sha-256:<hex or null>
after_overlay_head_ref: <ObjectRef>
after_overlay_head_hash: sha-256:<hex>
external_registry_transition_receipt_ref: <ProviderIdentityRegistryTransitionReceipt ObjectRef
                                           required for genesis/observation; null for compromise>
external_registry_transition_receipt_hash: sha-256:<hex or null>
trust_compromise_plan_core_ref: <ObjectRef required exactly for compromise>
trust_compromise_plan_core_hash: sha-256:<hex or null>
transition_history_before_head_ref: <ObjectRef required for every non-genesis cause>
transition_history_before_head_hash: sha-256:<hex or null>
genesis_transition_history_head_ref: <empty ObjectRef required exactly at genesis>
genesis_transition_history_head_hash: sha-256:<hex or null>
transition_history_next_state_commitment_hash: sha-256:<map-add tuple or null at genesis>
authority_transaction_id: <authority or trust-coordinator transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
signer_kind: authority_service | trust_coordinator
authority_service_signature: <Signature or null unless genesis/observation>
trust_coordinator_signature: <Signature or null unless compromise quarantine>
```

The overlay is Cairn's eligibility judgment about independently registry-owned
identity truth. Account/sublimit import creates it as `eligible` from the exact
registry genesis receipt and empty lifecycle history. The overlay head
intentionally contains no reference to that history head: its history is resolved
through the domain-separated stable `history_key` for
`provider_identity_trust_overlay / identity_stable_key`. The signed history head
points one way to the current overlay and its latest receipt; the transition
receipt carries the prior-history ref/hash and self-excluding next-history
commitment. This is the only valid construction at genesis and on every successor
and prevents overlay↔history or receipt↔successor content-address cycles.
Ordinary provider
generation observation is authority-service signed only after verifying the
registry receipt. Compromise quarantine is trust-coordinator signed, preserves
the last observed external head byte-for-byte, and is terminal. It atomically
freezes Cairn-owned actions, assertions, and exposure but never claims to mutate
the registry head. Review, BindingSet, reservation, gate, redemption, handoff,
and current-trust presentation require both the exact current active external
head and the exact current `eligible` overlay; either restrictive, unknown, or
stale side denies.

For trust indexing, each account or sublimit dependency uses its immutable
`*_identity_key` plus core ref/hash, never a generation head ObjectRef as the
dependency identity. One TrustDependencyStateHead and reverse index spans every
generation. Each assertion/commitment still carries the exact generation and
current identity-head ref/hash used. An ordinary `g → g+1` transition reuses the
stable index and does not create empty manifests. Evidence that historical
generation `g` was compromised quarantines the Cairn-owned trust overlay and
enumerates the stable index, filtering entries by their exact
registered generation; implementations may conservatively quarantine more
generations but can never omit `g`. The external head may remain active as
last-observed registry truth, but no dependent assertion can remain green and no
new action can pass the quarantined overlay.

```yaml
schema: cairn.receiver_channel_policy.v0.1
policy_id: <stable URI>
receiver_or_channel_id: <canonical identity>
receiver_account_or_contract_scope: <canonical tenant/account/contract scope>
receiver_operation_namespace: <canonical receiver namespace>
oauth_resource: <exact resource>
credential_audience: <exact audience>
channel_protocol: <closed registered protocol/version>
applicability:
  capabilities: []
  receiver_operation_kinds: []
  payload_schema_refs: []
message_semantics: binding_obligation | nonbinding
nonbinding_guarantee_basis: <authenticated receiver/channel rule ref or null unless nonbinding>
binding_obligation_rule_ref: <authenticated receiver/deal rule ref or null unless binding>
explicit_scope_selection_rule_ref: <authenticated provider-side selection rule>
explicit_scope_selection_rule_hash: sha-256:<hex>
allowed_registry_codes: []
forbidden_field_classes: []
issued_at: <time>
expires_at: <time>
policy_hash: sha-256:<hex>
receiver_or_channel_authority_signature: <Signature>
not_claiming: [jurisdictional_enforceability, counterparty_identity_truth,
               message_delivery, receiver_acceptance]
```

```yaml
schema: cairn.receiver_scope_selection_proof.v0.1
scope_selection_proof_key: sha-256:<JCS of immutable fields below>
issuer_authority_key: sha-256:<stable registered selector authority>
issuer_policy_ref: <immutable receiver-scope-selection-issuer ObjectRef>
issuer_policy_hash: sha-256:<hex>
issuer_policy_lifecycle_head_ref: <current active ObjectRef>
issuer_policy_lifecycle_head_hash: sha-256:<hex>
principal_id: <exact acting principal>
credential_instance_key: sha-256:<canonical credential instance>
credential_binding_core_ref: <exact immutable ObjectRef>
credential_binding_core_hash: sha-256:<hex>
effect_class: financial_value | receiver_channel | receiver_cancellation
receiver_or_provider_id: <canonical external receiver/provider>
account_or_contract_scope: <canonical tenant/account/contract/root account>
operation_namespace: <canonical receiver/provider namespace>
oauth_resource: <exact resource>
credential_audience: <exact audience>
request_route_template_hash: sha-256:<closed route/template without user values>
selection_method: provider_authenticated_picker | broker_bound_account |
                  contract_registry_resolution
issued_at: <issuer-authoritative time>
expires_at: <time>
proof_hash: sha-256:<hex>
issuer_authority_signature: <Signature>
```

Every external financial-value, receiver-channel, and receiver-cancellation
effect requires this typed proof. Null is permitted only for a genuinely local,
receiverless effect. The issuer is a first-class `receiver_scope_selection_issuer`
policy dependency with signed lifecycle; review, BindingSet, authorization,
reservation, gate, redemption, outbox, handoff, receiver import, and finality all
repeat the same proof ref/hash and tuple. A policy or broker assertion that a
default account would probably be selected is not a proof. Issuer compromise
uses the ordinary dependency closure and invalidates every in-flight/assertion
that depended on its proof.

The schema is a closed discriminated union. `nonbinding` requires an
authenticated channel rule that the exact registered payload class cannot form,
counter, or accept an obligation and forbids every price/quantity/terms/payment
field. `binding_obligation` requires the exact deal/channel rule and only the
financial-obligation capabilities whose full exposure is independently held.
Unknown, mixed, free-text, or jurisdiction-dependent semantics deny rather than
falling back to nonfinancial. Policy applicability must equal receiver/channel,
account/contract scope, operation namespace, resource, audience, operation,
capability, and payload schema at review, gate,
handoff, and receiver import.

Outbound credentials have an independent current binding; a matching OAuth
audience is never proof of which provider account will be debited:

```yaml
schema: cairn.credential_broker_authority_core.v0.1
credential_broker_authority_key: sha-256:<registry namespace and stable broker authority ID>
credential_broker_authority_id: <allowlisted stable broker authority>
broker_signing_key_family_ref: <immutable registry identity/policy ObjectRef>
broker_signing_key_family_hash: sha-256:<hex>
core_hash: sha-256:<hex>
credential_broker_registry_signature: <Signature>
```

```yaml
schema: cairn.credential_broker_authority_transition_receipt.v0.1
credential_broker_authority_key: sha-256:<same stable authority>
cause: import_genesis | instance_membership_added | ordinary_signing_key_rotation |
       instance_head_updated | prospective_revocation |
       suspected_or_confirmed_compromise
before_lifecycle_head_ref: <ObjectRef or null only at genesis>
before_lifecycle_head_hash: sha-256:<hex or null>
after_lifecycle_head_ref: <ObjectRef; same current active head for membership-only>
after_lifecycle_head_hash: sha-256:<hex>
before_manifest_state_head_ref: <ObjectRef or null only at genesis>
before_manifest_state_head_hash: sha-256:<hex or null>
after_manifest_state_head_ref: <ObjectRef>
after_manifest_state_head_hash: sha-256:<hex>
affected_credential_instances_root: sha-256:<empty unless compromise>
trust_quarantine_receipt_ref: <ObjectRef or null unless compromise>
trust_quarantine_receipt_hash: sha-256:<hex or null>
authority_transaction_id: <one registry/broker/coordinator CAS>
committed_at: <registry-authoritative time>
receipt_hash: sha-256:<hex>
signer_kind: credential_broker | credential_broker_registry | trust_coordinator
credential_broker_signature: <Signature or null unless broker-signed membership/head update>
credential_broker_registry_signature: <Signature or null unless lifecycle/genesis>
trust_coordinator_signature: <Signature or null unless compromise>
```

```yaml
schema: cairn.credential_broker_instance_manifest.v0.1
credential_broker_authority_key: sha-256:<same stable authority>
manifest_epoch: <monotonic integer>
epoch_state: accepting | draining | sealed
revision: <monotonic integer>
instance_count: <nonnegative integer no greater than 16>
sorted_instances:
  - credential_instance_key: sha-256:<hex>
    credential_instance_core_ref: <ObjectRef>
    credential_instance_core_hash: sha-256:<hex>
    current_instance_state_head_ref: <ObjectRef>
    current_instance_state_head_hash: sha-256:<hex>
instances_root: sha-256:<canonical complete set>
manifest_hash: sha-256:<hex>
signer_kind: credential_broker | trust_coordinator
credential_broker_signature: <Signature or null unless ordinary manifest>
trust_coordinator_signature: <Signature or null unless compromise successor>
```

```yaml
schema: cairn.credential_broker_authority_state_head.v0.1
credential_broker_authority_key: sha-256:<same stable authority>
credential_broker_authority_core_ref: <immutable ObjectRef>
credential_broker_authority_core_hash: sha-256:<hex>
sequence: <monotonic integer; lifecycle changes only>
previous_state_hash: sha-256:<hex or null>
state: active | revoked | quarantined
broker_signing_key_state_head_ref: <current authenticated key-family ObjectRef>
broker_signing_key_state_head_hash: sha-256:<hex>
updated_at: <branch-authoritative time>
state_hash: sha-256:<hex>
signer_kind: credential_broker_registry | trust_coordinator
credential_broker_registry_signature: <Signature or null unless active/revoked>
trust_coordinator_signature: <Signature or null unless quarantined>
```

```yaml
schema: cairn.credential_broker_instance_manifest_state_head.v0.1
credential_broker_authority_key: sha-256:<same stable authority>
sequence: <monotonic membership revision>
previous_state_hash: sha-256:<hex or null>
state: accepting_imports | sealed_for_compromise
accepting_manifest_epoch: <monotonic integer>
instance_epoch_directory_head_ref: <bounded_index_epoch_directory_head ObjectRef>
instance_epoch_directory_head_hash: sha-256:<hex>
instance_manifest_ref: <current complete signed ObjectRef>
instance_manifest_hash: sha-256:<hex>
instance_count: <nonnegative integer no greater than 16>
instances_root: sha-256:<must equal manifest>
updated_at: <credential-broker-registry time>
state_hash: sha-256:<hex>
state_signer_kind: credential_broker | trust_coordinator
credential_broker_signature: <Signature or null unless accepting_imports>
trust_coordinator_signature: <Signature or null unless sealed_for_compromise>
```

Broker import creates the immutable core, active lifecycle head, empty instance
manifest plus its independent `accepting_imports` state head, one broker-authority
TrustDependencyStateHead, and integrity entry. Instance import CASes only the
independently revisioned manifest state without changing the active lifecycle
head; gate/handoff therefore do not stale when another instance is added. Every
credential instance/binding carries and rechecks the
exact current active broker-authority head, while every in-flight action and
receiver assertion registers the broker authority as a separate dependency.
An authenticated signing-key rotation advances the same stable authority head
and requires fresh credential bindings/reviews before handoff; it never creates
a new broker dependency identity. Revocation is prospective. Suspected or
confirmed broker compromise is
coordinator-only: the first coordinator transaction CASes the lifecycle and
manifest heads, seals imports, and either completes a bounded closure or installs
the fail-stopped partition barrier before quarantining the broker,
every manifest-listed instance and alias, all reverse-index entries, and all
affected exposure within the frozen bounds. Missing/forked manifest content
fail-stops integrity. A config allowlist removal or per-instance repair cannot
substitute for this signed closure.

The broker-authority head signer is also cause-closed: registry signatures are
valid only for active/revoked ordinary lifecycle successors, while the
coordinator signature is valid only for `quarantined` and must match the same
TrustQuarantineReceipt/closure transaction. No joint signature or cooperation
from the compromised broker/registry is assumed.

Manifest membership and current-instance-head maintenance are broker-authority
writes; broker-registry authority owns only broker lifecycle. An instance import
uses `instance_membership_added`. Every alias or instance-state successor replaces
exactly one manifest entry under `instance_head_updated`; it may not add, remove,
or rewrite a sibling. Both causes require a broker signature and leave the
lifecycle head byte-identical. Genesis/lifecycle changes require the registry
signature. Compromise requires the trust-coordinator signature and seals the
manifest. Mixed signer branches, a registry-signed ordinary instance update, or
an accepting head whose instance entry is stale are invalid.

The same signer discriminator applies recursively. Ordinary binding, alias,
instance, and broker-manifest successors require the credential-broker signature.
`suspected_or_confirmed_compromise` requires the trust-coordinator signature on
every quarantined binding/instance head, alias/instance manifest, and transition
receipt, plus the same TrustQuarantineReceipt and closure transaction/plan ID.
The compromised broker is never asked to sign its own quarantine, and a
coordinator signature is invalid on an ordinary update.

The 16-instance and 8-alias maxima are per manifest epoch, not lifetime caps.
Before a new entry would exceed either limit, the broker atomically makes the
accepting epoch draining and creates one empty accepting epoch in the signed
bounded-index directory. Existing active instance/alias heads continue to update
their assigned draining epoch; only terminal, zero-reservation epochs seal.
Broker/instance compromise enumerates every live and sealed epoch under the
fail-stopped partition rule when necessary. No rollover forgets an older handle,
instance, dependency, or exposure.

```yaml
schema: cairn.executor_credential_instance_core.v0.1
credential_instance_key: sha-256:<JCS of broker authority, issuer, subject/session,
                                    credential-native immutable instance commitment,
                                    OAuth resource,
                                    key-confirmation thumbprint>
credential_broker_authority_id: <allowlisted stable broker authority>
credential_broker_authority_key: sha-256:<canonical broker authority>
credential_broker_authority_core_ref: <immutable ObjectRef>
credential_broker_authority_core_hash: sha-256:<hex>
credential_native_instance_commitment: sha-256:<issuer/broker authenticated immutable
                                                   instance, session, or registry
                                                   equivalence-class identity>
credential_handle_commitment: sha-256:<opaque broker handle>
issuer: <canonical issuer>
subject_or_session_commitment: sha-256:<hex>
oauth_resource: <exact resource>
key_confirmation_thumbprint: sha-256:<hex>
core_hash: sha-256:<hex>
credential_broker_signature: <Signature>
```

`credential_native_instance_commitment` is the canonical credential/session
identity authenticated by the issuer or broker registry. Handle commitments are
aliases only and never participate in `credential_instance_key`. Two broker
handles for the same native instance therefore converge on one instance key,
alias manifest, state head, and trust index; an issuer/broker unable to prove
that equivalence may not import the second handle as the same instance.

```yaml
schema: cairn.executor_credential_binding_core.v0.1
credential_binding_id: <stable broker identity>
credential_binding_stable_key: sha-256:<broker authority and binding id>
credential_instance_key: sha-256:<canonical underlying credential instance>
credential_instance_core_ref: <immutable ObjectRef>
credential_instance_core_hash: sha-256:<hex>
principal_id: <exact owning/acting principal>
credential_handle_commitment: sha-256:<opaque broker handle>
issuer: <canonical issuer>
subject_or_session_commitment: sha-256:<hex>
oauth_resource: <exact resource>
credential_audience: <exact audience>
key_confirmation_thumbprint: sha-256:<hex>
binding_semantics_hash: sha-256:<all immutable financial, channel, or cancellation branch fields>
core_hash: sha-256:<hex>
credential_broker_signature: <Signature>
```

```yaml
schema: cairn.executor_credential_binding_head.v0.1
credential_binding_id: <stable broker identity>
credential_binding_stable_key: sha-256:<broker authority and binding id>
credential_binding_core_ref: <immutable broker-signed principal/credential ObjectRef>
credential_binding_core_hash: sha-256:<hex; invariant for this binding>
credential_broker_authority_state_head_ref: <current active ObjectRef>
credential_broker_authority_state_head_hash: sha-256:<hex>
credential_instance_key: sha-256:<same canonical underlying instance>
credential_instance_core_ref: <same immutable ObjectRef>
credential_instance_core_hash: sha-256:<hex>
principal_id: <exact owning/acting principal>
binding_kind: financial_value_provider_account | receiver_channel |
              receiver_cancellation
receiver_channel_semantics: binding_obligation | nonbinding | null
credential_handle_commitment: sha-256:<opaque broker handle; never model-visible>
issuer: <canonical issuer>
subject_or_session_commitment: sha-256:<hex>
oauth_resource: <exact resource>
credential_audience: <exact audience>
runtime_binding_ref: <ObjectRef or null for principal-direct>
connection_authorization_ref: <ObjectRef or null for principal-direct>
key_confirmation_thumbprint: sha-256:<DPoP/mTLS/runtime-bound key>
provider_trust_domain_id: <canonical domain; required for financial-value or cancellation branch>
stable_root_account_id: <canonical root; required for financial-value branch>
provider_account_identity_head_ref: <current ObjectRef; financial-value branch>
provider_account_identity_head_hash: sha-256:<hex; financial-value branch>
account_generation: <monotonic integer; financial-value branch>
provider_account_identity_trust_overlay_head_ref: <current eligible ObjectRef; financial-value branch>
provider_account_identity_trust_overlay_head_hash: sha-256:<hex; financial-value branch>
provider_sublimit_identity_head_ref: <current ObjectRef or null for root>
provider_sublimit_identity_head_hash: sha-256:<hex or null for root>
provider_sublimit_identity_trust_overlay_head_ref: <current eligible ObjectRef or null for root>
provider_sublimit_identity_trust_overlay_head_hash: sha-256:<hex or null for root>
financial_resource_kind: canonical_root | verified_child | null
root_economic_resource_key: sha-256:<hex; financial-value branch>
economic_resource_key: sha-256:<hex; financial-value branch>
protection_attestation_ref: <ObjectRef; financial-value branch>
protection_attestation_hash: sha-256:<hex; financial-value branch>
enforcement_locus: <exact provider feature/contract/permission; financial-value branch>
provider_sublimit_id: <canonical id or null for root>
disjoint_sublimit_proof_ref: <ObjectRef or null for root>
sublimit_generation: <integer or null for root>
credential_and_bypass_profile_hash: sha-256:<hex; financial-value branch>
receiver_or_channel_id: <canonical identity; receiver-channel or cancellation branch>
receiver_channel_policy_ref: <ObjectRef; receiver-channel branch>
receiver_channel_policy_hash: sha-256:<hex; receiver-channel branch>
receiver_channel_policy_lifecycle_head_ref: <current active ObjectRef; receiver-channel branch>
receiver_channel_policy_lifecycle_head_hash: sha-256:<hex; receiver-channel branch>
original_executor_credential_binding_core_ref: <ObjectRef; cancellation branch>
original_executor_credential_binding_core_hash: sha-256:<hex; cancellation branch>
original_executor_credential_binding_head_ref: <head captured at original handoff; cancellation branch>
original_executor_credential_binding_head_hash: sha-256:<hex; cancellation branch>
original_outbox_handoff_receipt_ref: <ObjectRef; cancellation branch>
original_outbox_handoff_receipt_hash: sha-256:<hex; cancellation branch>
receiver_account_or_contract_scope: <exact scope; receiver-channel or cancellation branch>
receiver_operation_namespace: <exact namespace; receiver-channel or cancellation branch>
explicit_scope_selection_proof_ref: <typed ObjectRef required for every external branch>
explicit_scope_selection_proof_hash: sha-256:<hex; required for every external branch>
cancellation_credential_reuse_kind: exact_original_credential |
                                    same_scope_replacement | null
cancellation_credential_continuity_receipt_ref: <ObjectRef or null unless replacement>
cancellation_credential_continuity_receipt_hash: sha-256:<hex or null>
selection_kind: explicit_canonical_root | explicit_verified_sublimit |
                explicit_receiver_channel | explicit_receiver_cancellation
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: active | revoked | expired | quarantined
not_before: <time>
expires_at: <time>
state_hash: sha-256:<hex>
signer_kind: credential_broker | trust_coordinator
credential_broker_signature: <Signature or null unless ordinary transition>
trust_coordinator_signature: <Signature or null unless quarantined>
```

```yaml
schema: cairn.executor_credential_binding_transition_receipt.v0.1
credential_binding_stable_key: sha-256:<same key>
credential_instance_key: sha-256:<same canonical instance>
before_head_ref: <ObjectRef or null only for import genesis>
before_head_hash: sha-256:<hex or null>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
cause: import_genesis | principal_or_broker_revocation | authority_time_expiry |
       suspected_or_confirmed_historical_compromise
trust_quarantine_receipt_ref: <ObjectRef or null unless compromise>
trust_quarantine_receipt_hash: sha-256:<hex or null>
authority_transaction_id: <one broker or trust-coordinator CAS>
committed_at: <branch-authoritative time>
receipt_hash: sha-256:<hex>
signer_kind: credential_broker | trust_coordinator
credential_broker_signature: <Signature or null unless ordinary cause>
trust_coordinator_signature: <Signature or null unless compromise cause>
```

```yaml
schema: cairn.executor_credential_instance_alias_manifest.v0.1
credential_instance_key: sha-256:<same canonical instance>
manifest_epoch: <monotonic integer>
epoch_state: accepting | draining | sealed
revision: <monotonic integer>
alias_count: <positive integer no greater than 8>
sorted_aliases:
  - credential_binding_stable_key: sha-256:<hex>
    credential_binding_core_ref: <ObjectRef>
    credential_binding_core_hash: sha-256:<hex>
    current_binding_head_ref: <ObjectRef>
    current_binding_head_hash: sha-256:<hex>
aliases_root: sha-256:<canonical complete set>
manifest_hash: sha-256:<hex>
signer_kind: credential_broker | trust_coordinator
credential_broker_signature: <Signature or null unless ordinary manifest>
trust_coordinator_signature: <Signature or null unless compromise successor>
```

```yaml
schema: cairn.executor_credential_instance_state_head.v0.1
credential_instance_key: sha-256:<same canonical instance>
credential_instance_core_ref: <immutable ObjectRef>
credential_instance_core_hash: sha-256:<hex>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: active | quarantined
accepting_alias_epoch: <monotonic integer>
alias_epoch_directory_head_ref: <bounded_index_epoch_directory_head ObjectRef>
alias_epoch_directory_head_hash: sha-256:<hex>
alias_manifest_ref: <content-addressed ObjectRef>
alias_manifest_hash: sha-256:<hex>
alias_count: <positive integer no greater than 8>
aliases_root: sha-256:<must equal manifest>
updated_at: <broker-authoritative time>
state_hash: sha-256:<hex>
signer_kind: credential_broker | trust_coordinator
credential_broker_signature: <Signature or null unless active>
trust_coordinator_signature: <Signature or null unless quarantined>
```

```yaml
schema: cairn.executor_credential_instance_transition_receipt.v0.1
credential_instance_key: sha-256:<same canonical instance>
cause: import_genesis | alias_added | alias_head_updated |
       suspected_or_confirmed_compromise
before_instance_state_head_ref: <ObjectRef or null only at genesis>
before_instance_state_head_hash: sha-256:<hex or null>
after_instance_state_head_ref: <ObjectRef>
after_instance_state_head_hash: sha-256:<hex>
before_alias_manifest_ref: <ObjectRef or null only at genesis>
before_alias_manifest_hash: sha-256:<hex or null>
after_alias_manifest_ref: <complete signed ObjectRef>
after_alias_manifest_hash: sha-256:<hex>
affected_binding_head_transitions_root: sha-256:<exact set; one ordinary or all compromise aliases>
broker_instance_manifest_before_head_ref: <ObjectRef>
broker_instance_manifest_before_head_hash: sha-256:<hex>
broker_instance_manifest_after_head_ref: <ObjectRef>
broker_instance_manifest_after_head_hash: sha-256:<hex>
trust_quarantine_receipt_ref: <ObjectRef or null unless compromise>
trust_quarantine_receipt_hash: sha-256:<hex or null>
authority_transaction_id: <one broker/coordinator CAS>
committed_at: <branch-authoritative time>
receipt_hash: sha-256:<hex>
signer_kind: credential_broker | trust_coordinator
credential_broker_signature: <Signature or null unless ordinary cause>
trust_coordinator_signature: <Signature or null unless compromise cause>
```

```yaml
schema: cairn.cancellation_credential_continuity_receipt.v0.1
principal_id: <exact principal>
original_credential_instance_key: sha-256:<canonical original instance>
original_credential_instance_core_ref: <immutable ObjectRef>
original_credential_instance_core_hash: sha-256:<hex>
original_executor_credential_binding_core_ref: <ObjectRef>
original_executor_credential_binding_core_hash: sha-256:<hex>
original_executor_credential_binding_head_ref: <active head at original handoff>
original_executor_credential_binding_head_hash: sha-256:<hex>
original_outbox_handoff_receipt_ref: <ObjectRef>
original_outbox_handoff_receipt_hash: sha-256:<hex>
replacement_credential_instance_key: sha-256:<different canonical instance>
replacement_credential_instance_core_ref: <immutable ObjectRef>
replacement_credential_instance_core_hash: sha-256:<hex>
replacement_credential_instance_state_head_ref: <current active ObjectRef>
replacement_credential_instance_state_head_hash: sha-256:<hex>
replacement_cancellation_binding_core_ref: <ObjectRef>
replacement_cancellation_binding_core_hash: sha-256:<hex>
provider_trust_domain_id: <exact original domain>
receiver_account_or_contract_scope: <exact original scope>
receiver_or_channel_id: <exact original receiver/channel>
oauth_resource: <same receiver resource>
credential_audience: <same receiver audience>
cancellation_operation_namespace: <exact receiver namespace>
continuity_evidence_ref: <provider/broker-signed same-scope mapping ObjectRef>
continuity_evidence_hash: sha-256:<hex>
issued_at: <broker-authoritative time>
receipt_hash: sha-256:<hex>
credential_broker_signature: <Signature>
```

Every scoped executor resolves the opaque credential handle only after this head
and the canonical credential-instance head both pass. The binding's `principal_id` MUST equal the connection, runtime binding,
review, BindingSet, authority, gate, and handoff principal even when both runtime
and connection refs are null for principal-direct action; a credential is never
ambient account/channel authority. `authorize_payment` and `fund_escrow` require the
`financial_value_provider_account` branch. Its provider domain, stable root, identity head/
generation, root/economic resource keys, protection attestation, enforcement
locus, child sublimit/proof/generation when present, bypass profile, key
confirmation, audience, subject/session, and explicit root-or-child selection
MUST equal the compartment, protection attestation, BindingSet, and handoff
snapshot. The child branch additionally requires the same current
ProviderSublimitIdentityHead ref/hash; the root branch forbids it. A root
credential cannot satisfy a child resource and a sibling child
cannot substitute. `submit_bindable_offer`, `submit_counteroffer`, and
`accept_terms` require `receiver_channel_semantics:binding_obligation`;
nonfinancial external capabilities require `nonbinding`. For both receiver-
channel branches, the canonical receiver/channel and
authenticated account/contract scope, operation namespace, explicit provider-
side selection rule, and channel policy plus its exact current lifecycle head
MUST equal ultimate receiver, BindingSet, request envelope, finality profile, and
handoff snapshot; financial fields are
forbidden. A binding-obligation credential cannot satisfy a nonbinding notice,
and a nonbinding credential cannot carry an offer, counter, or acceptance.
`cancel_receiver_action` requires only the `receiver_cancellation` branch. Its
original binding core/head and outbox receipt MUST prove the credential, receiver,
account/contract scope, and operation namespace that actually carried the
original handoff. `exact_original_credential` additionally requires equality of
issuer, subject/session, opaque handle commitment, resource, audience, and key
thumbprint to that original head **and** requires that original alias's exact
current successor remain the same active handoff head at gate and handoff.
`same_scope_replacement` requires a different current handle/key, the signed
continuity receipt above and exact equality of principal, provider domain,
receiver/channel, account/contract scope, resource, audience, and cancellation
namespace; a shared audience or provider-local operation ID is insufficient.
Financial, receiver-channel, and cancellation-only fields are mutually exclusive
except for the explicitly repeated original-scope evidence. Cross-account,
cross-contract, implicit-default, or unproved replacement credentials deny.
Policy retirement, emergency revocation, or quarantine terminates
eligibility and requires a fresh credential binding and authority chain even if
the channel identity is unchanged. Provider-default, implicit
account, or implicit tenant/channel selection is forbidden.
Any current successor other than active, any mismatch, or a credential lacking
its explicit selection proof denies before request bytes or the credential are
exposed.

The credential-binding transition matrix is ordinarily `active → revoked |
expired`; a suspected/confirmed historical compromise permits
`active | revoked | expired → quarantined` only inside
`execution.trust_compromise.commit`. All destinations are terminal for that
binding ID, handle, subject/session, and key. Only the credential broker may CAS
the expected current head, and the quarantine cause additionally requires the
coordinator's complete in-flight/assertion/exposure closure.
Rotation creates a new binding ID/handle/key and requires a new review, BindingSet,
authority chain, reservation, and gate; an old BindingSet cannot substitute the
new head even when audience/account semantics match.
Ordinary revoke/expiry blocks every not-yet-handed-off action but does not by
itself relabel an immutable prior handoff as untrusted. A later event may promote
that handed-off leaf only when the OutboxHandoffReceipt proves the binding was
active/current at handoff and no compromise successor exists. `quarantined`
means historical trust is unsafe and invokes the full reverse-closure rule.

`execution.executor_credential_binding.import` derives the instance key itself;
the broker cannot choose it. The first binding atomically creates the immutable
instance core, one-entry signed alias manifest, active instance head, and the one
TrustDependencyStateHead/integrity entry keyed by `credential_instance_key`.
Later bindings for the same credential atomically add their core/current head to
that manifest and advance the instance head; they never create another trust
index. Every ordinary binding transition replaces its one alias entry and
advances the instance head while leaving the instance active. Assertion and in-
flight registrations use the instance core/key as their executor-credential
stable dependency and retain the exact selected binding head as bound evidence.

Suspected or confirmed compromise of any alias computes the complete manifest
closure, CASes the instance `active → quarantined`, moves every nonquarantined
alias head to `quarantined`, and invokes the one shared reverse-index quarantine/
exposure transaction. No alias may remain eligible. Missing/forked alias state
fail-stops integrity; broker-selected duplicate IDs, a second instance key for
the same canonical tuple, partial alias quarantine, or a new post-quarantine
alias all deny. Ordinary revocation of one alias is not instance compromise and
does not revoke siblings, but its updated manifest prevents use of that alias.

```yaml
schema: cairn.agent_execution_compartment.v0.1
compartment_id: urn:uuid:<uuid>
principal_id: <principal>
authority_ledger_namespace: <server-owned namespace>
provider_trust_domain_id: <registry-canonical stable identity>
provider_identity_registry_ref: <signed immutable ObjectRef>
provider_account_identity_head_ref: <current signed ObjectRef>
account_generation: <must equal current identity-head generation>
provider_account_identity_trust_overlay_head_ref: <current eligible ObjectRef>
provider_account_identity_trust_overlay_head_hash: sha-256:<hex>
provider_sublimit_identity_head_ref: <current signed ObjectRef or null for root>
provider_sublimit_identity_head_hash: sha-256:<hex or null for root>
provider_sublimit_identity_trust_overlay_head_ref: <current eligible ObjectRef or null for root>
provider_sublimit_identity_trust_overlay_head_hash: sha-256:<hex or null for root>
stable_root_account_id: <opaque immutable registry ID>
root_economic_resource_key: sha-256:<JCS of provider_trust_domain_id,
                                    stable_root_account_id,
                                    asset>
economic_resource_key: sha-256:<root key, or JCS(root key + verified sublimit id)>
provider_sublimit_id: <canonical id or null for root>
disjoint_sublimit_proof_ref: <provider-signed ObjectRef or null for root>
sublimit_generation: <current integer or null for root>
compartment_control_key: sha-256:<JCS of profile, principal, economic resource key>
compartment_kind: segregated_provider_account | escrow_wallet |
                  smart_account_permission | prefunded_provider_balance |
                  logical_authority_ledger
protection_class: hard_asset_segregation | provider_enforced_limit |
                  contract_enforced_limit | cairn_ledger_only
accounting_asset: <canonical asset>
provider_id: <provider/service/contract>
provider_canonical_root_account_commitment: sha-256:<authenticated alias commitment>
protection_attestation_ref: <ObjectRef>
accounting_policy_ref: <ObjectRef>
receiver_finality_profile_ref: <ObjectRef>
configured_ceiling: {amount_minor: <integer>, asset: <same asset>}
per_action_ceiling: {amount_minor: <integer>, asset: <same asset>}
window_limits:
  - amount_minor: <integer>
    asset: <same asset>
    window_kind: rolling
    window_seconds: <integer>
lifetime_limit: {amount_minor: <integer>, asset: <same asset>}
outstanding_exposure_limit: {amount_minor: <integer>, asset: <same asset>}
allowed_rails: []
allowed_executor_targets: []
not_before: <time>
expires_at: <time>
compartment_hash: sha-256:<hex>
authority_service_signature: <Signature>
principal_acceptance_signature: <Signature>
not_claiming: [segregation_beyond_protection_class, insolvency_protection,
               payment_finality]
```

The definition is immutable. Balances, reservations, state, sequence, and fence
never appear in it.
Issuance requires one asset and checked nonnegative integers satisfying
`per_action_ceiling ≤ outstanding_exposure_limit ≤ configured_ceiling ≤
current protection-attestation.enforced_cap`. A window or lifetime limit may be
smaller because it measures a different accumulation dimension, but it may not
use another asset or an unbounded/null value. A candidate reservation requires
its full worst-case incremental exposure to be at most `per_action_ceiling` and
the resulting current outstanding exposure to be at most both
`outstanding_exposure_limit` and `configured_ceiling`. The gate and handoff
recheck the current attested enforced cap and receiver-backed availability; a cap
reduction invalidates old unhanded work and freezes over-cap existing exposure.

```yaml
schema: cairn.compartment_state_head.v0.1
compartment_state_id: urn:uuid:<uuid>
compartment_ref: <ObjectRef>
economic_resource_key: sha-256:<hex>
compartment_control_key: sha-256:<exact definition-derived key>
authority_ledger_namespace: <server-owned namespace>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
fencing_token: <monotonic integer>
state: pending | active | frozen | exhausted | closed
pre_freeze_state: pending | active | exhausted | closed | null
exhausted_limit_ledger_keys_root: sha-256:<exact exhausted limiting set or empty root>
active_reservations_root: sha-256:<canonical reservation-set Merkle root>
active_reservation_manifest_ref: <enumerable_map_root ObjectRef>
active_reservation_manifest_hash: sha-256:<hex>
active_reservation_count: <checked uint64>
active_hold_atoms_root: sha-256:<canonical unique economic-hold atom set>
compartment_limit_ledger_heads_root: sha-256:<canonical compartment window/lifetime head set>
receiver_backed_available: <Money or null>
cairn_reserved: <Money>
confirmed_spent: <Money>
confirmed_refunded: <Money>
confirmed_spend_events_root: sha-256:<canonical receiver-confirmed debit set>
confirmed_refund_events_root: sha-256:<canonical authenticated refund set>
confirmed_reversal_loss: <Money>
confirmed_reversal_events_root: sha-256:<canonical conclusively confirmed reversal set>
outstanding_reversal_exposure: <Money>
active_reversal_atoms_root: sha-256:<canonical unique reversal-risk atom set>
quarantine_exposure: <Money>
quarantine_hold_atoms_root: sha-256:<canonical unique compromise/remediation atom set>
current_economic_atom_manifest_ref: <enumerable_map_root all-class atom ObjectRef>
current_economic_atom_manifest_hash: sha-256:<hex>
current_economic_atom_count: <checked uint64>
confirmed_event_manifest_ref: <enumerable_map_root debit/refund/reversal ObjectRef>
confirmed_event_manifest_hash: sha-256:<hex>
confirmed_event_count: <checked uint64>
remediation_state: none | complete_frozen | incomplete_frozen
remediation_transaction_id: <stable id or null>
remediation_commitment_hash: sha-256:<self-excluding exact remediation tuple or null>
unresolved_exposure_commitment_root: sha-256:<empty unless incomplete_frozen>
provider_status_ref: <authenticated ObjectRef or null>
observed_at: <authority-service time>
state_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

All money fields use the compartment asset and checked integer arithmetic. An
economic hold atom is uniquely keyed by `(economic_resource_key,
obligation_exposure_id or non-obligation reservation id, component role,
component id or item-transfer fence, reservation fence)` and has exactly one
current ledger class: `reserved`, `confirmed_debit`, `active_reversal`,
`quarantine_hold`, `confirmed_refund`, `confirmed_reversal`, or `released`. It cannot appear in two
classes at once. The only transitions into `quarantine_hold` are exact
reclassification of a released/reserved/active-reversal/confirmed-reversal atom under a typed trust-
remediation or unexpected-reversal receipt; resolution moves that same atom to
one other named class and never duplicates it.
The authority service recomputes these equations at every head:

```text
cairn_reserved = sum(amount(atom) for atom in active_hold_atoms_root)
confirmed_spent = sum(amount(event) for event in confirmed_spend_events_root)
confirmed_refunded = sum(amount(event) for event in confirmed_refund_events_root)
confirmed_reversal_loss =
  sum(amount(event) for event in confirmed_reversal_events_root)
outstanding_reversal_exposure =
  sum(amount(atom) for atom in active_reversal_atoms_root)
quarantine_exposure =
  sum(amount(atom) for atom in quarantine_hold_atoms_root)
current_outstanding_exposure =
  cairn_reserved + outstanding_reversal_exposure + quarantine_exposure
current_outstanding_exposure <= outstanding_exposure_limit
  # required for every non-frozen head; frozen remediation may exceed the limit,
  # has zero new-hold capacity, and cannot resume until within the limit
current_outstanding_exposure <= configured_ceiling <= current_enforced_cap
  # same non-frozen rule; both values come from the immutable compartment and
  # current active protection-attestation lifecycle
new_hold_capacity = receiver_backed_available - cairn_reserved
  # when receiver_backed_available is non-null; negative denies
obligation.current_exposure_amount =
  sum(reserved hold atoms keyed to that obligation) +
  sum(active reversal atoms keyed to that obligation) +
  sum(quarantine hold atoms keyed to that obligation)
```

Each accounting subset root above is the RFC 8785/SHA-256 hash of
`{schema: cairn.compartment_accounting_subset_root_preimage.v0.1,
subset_kind, entry_refs}`, where `entry_refs` is the complete exact ObjectRef set
for that ledger class or confirmed-event kind, sorted by canonical ObjectRef
bytes. The domain-separated `subset_kind` is `economic_atom:<ledger class>` or
`confirmed_event:<event kind>`. The authority walks the complete committed
enumerable-map tree, rejects unresolved descendants, cycles, duplicate keys, or
child-summary drift, and recomputes every subset root, money total, and
outstanding limit from those exact entries. Every compartment transition also
requires the economic-atom delta manifest to equal the exact before/after atom
map diff one-for-one; an added, removed, changed, omitted, or extra atom is
invalid even when aggregate money happens to match. Confirmed-event entries are
append-only and their event kind must match the transition cause.

`active_reservations_root` commits the reservation records whose economic atoms
are exactly `active_hold_atoms_root`; a missing, extra, duplicated, or differently
valued atom invalidates the head. `receiver_backed_available` is the authenticated
total backing allocatable to this compartment before subtracting Cairn's logical
holds; an adapter whose native balance is already hold-net must normalize it under
the bound accounting policy or deny. Confirmed spend is gross historical debit, not
free capacity. Window/lifetime ledgers count the signed reservation-commit events
and replenish only under the bound AccountingPolicy; current outstanding capacity
uses the equation above. On role transfer from obligation-reserved to
fulfillment-locked, the same hold atoms change role metadata and the monetary
delta is zero. On receiver-confirmed fulfillment, one transaction removes the
item, mandatory, and charged-incremental atoms from `reserved`, adds the exact
debit event to `confirmed_spent`, and, when the finality profile still permits
reversal, adds the exact at-risk amount to `active_reversal`; outstanding exposure
therefore cannot fall merely because submission was called complete. Irreversible
finality releases its reversal atoms. Refund/reversal transitions add exact
authenticated events, apply only the bound replenishment policy, and never create
capacity between their component CASes. Obligation state, compartment state,
the unique economic-resource exposure head, every five ledger field/root pairs,
window/lifetime ledgers, and the receiver event commit in one serializable
transaction.

A conclusively confirmed reversal is realized history, not unresolved exposure:
the same transaction reclassifies the exact active-reversal or quarantine atom
to `confirmed_reversal`, records it in
`confirmed_reversal_events_root`/`confirmed_reversal_loss`, and leaves neither an
active-reversal nor quarantine atom for that obligation. AccountingPolicy still
determines whether any refund-like capacity is replenished; the historical loss
counter itself never grants capacity.

Principal-authorized `execution.compartment.close` and authority-time
`execution.compartment.expire` are the only ordinary close causes. Either may
move `pending | active | exhausted | frozen → closed` only when every reservation,
active/reversal/quarantine atom, unresolved remediation commitment, and live or
unknown obligation is absent and all applicable compartment limit ledgers can
close in the same transaction. Expiry uses the immutable definition's
`expires_at`; callers cannot supply time. The transaction installs the closed
compartment head, closes its ledgers, removes the exact member from the signed
resource membership manifest, and advances the resource exposure head together.
A failed pending onboarding is therefore closeable, while a live/frozen economic
risk is not. Closed never returns to active except the already-defined
coordinator-only historical exposure restoration edge.

All count, rate, aggregate, window, lifetime, outstanding, and one-shot
consumption limits use one explicit authoritative family rather than implicit
counters:

```yaml
schema: cairn.principal_execution_limit_policy_core.v0.1
principal_limit_policy_id: sha-256:<domain-separated JCS of principal_id,
                                   limit_domain, and canonical asset-or-null>
principal_id: <principal>
limit_domain: global_actions | asset
asset: <canonical asset or null for global_actions>
revision: <monotonic integer>
action_count_limit: <positive integer or null for asset domain>
rate_limits: [{max_actions: <positive integer>, window_seconds: <positive integer>}]
monetary_aggregate_limit: <Money or null for global_actions>
monetary_window_limits: [{amount: <Money>, window_seconds: <positive integer>}]
monetary_outstanding_limit: <Money or null for global_actions>
not_before: <time>
expires_at: <time>
core_hash: sha-256:<hex>
principal_signature: <Signature>
```

```yaml
schema: cairn.principal_execution_limit_policy_state_head.v0.1
principal_limit_policy_id: <same stable id>
principal_id: <same principal>
limit_domain: <same domain>
asset: <same canonical asset or explicit null>
current_policy_core_ref: <ObjectRef>
current_policy_core_hash: sha-256:<hex>
revision: <same current integer>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: active | frozen | quarantined
updated_at: <authority-service time>
state_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

There is exactly one current policy head per stable
`(principal_id, limit_domain, asset)` identity. Principal-high-assurance issue or
revision CASes that shared head; a revision cannot create another policy ID,
erase committed ledger events, or lower current counters. Revoked/expired head
states do not exist in this family: an expired core simply denies new
work until a higher signed revision is installed under the same stable ID.
`active → active` revision, `active → frozen | quarantined`,
`frozen → active | quarantined`, and `quarantined → active` are the only edges.
The last edge requires principal high assurance, complete ledger reconciliation,
zero policy-ledger quarantine value, and a higher signed revision; it does not
erase any committed atom. No `quarantined → frozen` shortcut exists. The stable
ID preimage includes the canonical asset (or an explicit null for
`global_actions`), so two asset domains cannot alias.
Every mandate, one-shot authority, BindingSet, reservation, gate, and handoff that
uses a principal limit binds and rechecks the exact current policy head.

```yaml
schema: cairn.authority_limit_ledger_head.v0.1
ledger_key: sha-256:<domain-separated canonical discriminant/source tuple>
ledger_kind: principal_action_count | principal_rate | mandate_action_count |
             mandate_rate | mandate_monetary_aggregate |
             mandate_monetary_window | mandate_outstanding |
             principal_monetary_aggregate |
             principal_monetary_window | principal_outstanding |
             compartment_window | compartment_lifetime |
             action_authorization_consumption |
             cancellation_authorization_consumption
ledger_namespace: <authority-service canonical namespace>
principal_id: <principal>
mandate_or_authority_ref: <ObjectRef or null as kind requires>
principal_limit_policy_id: <stable id or null unless principal kind>
principal_limit_policy_state_head_ref: <current ObjectRef or null unless principal kind>
principal_limit_policy_state_head_hash: sha-256:<hex or null>
constraint_source_ref: <signed immutable mandate/policy/compartment/authorization ObjectRef>
constraint_source_hash: sha-256:<hex>
compartment_control_key: sha-256:<hex or null as kind requires>
asset: <canonical asset or null for count/rate kinds>
window_seconds: <positive integer or null unless window/rate kind>
limit_value: <checked positive integer amount/count; exactly 1 for one-shot>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
fencing_token: <monotonic integer>
committed_event_atoms_root: sha-256:<canonical unique event-atom set>
quarantine_event_atoms_root: sha-256:<canonical unique remediation-atom set>
current_event_manifest_ref: <enumerable_map_root committed/quarantine ObjectRef>
current_event_manifest_hash: sha-256:<hex>
current_event_count: <checked uint64>
current_window_value: <checked integer amount/count or null>
lifetime_value: <checked integer amount/count or null>
current_outstanding_value: <checked integer amount/count or null>
quarantine_value: <checked nonnegative integer for replenishable monetary kinds;
                   null for all other kinds>
remediation_transaction_id: <stable id or null outside remediation>
remediation_commitment_hash: sha-256:<typed preimage hash or null>
one_shot_consumed: true | false | null
state: active | frozen | exhausted | closed
pre_freeze_state: active | exhausted | closed | null
updated_at: <authority-service time>
head_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.compartment_state_transition_receipt.v0.1
compartment_control_key: sha-256:<stable compartment key>
economic_mutation_cause_core_ref: <ObjectRef>
economic_mutation_cause_core_hash: sha-256:<hex>
cause: onboard | reservation_hold | reservation_release | role_transfer |
       receiver_debit | refund | reversal | unexpected_reversal |
       unexpected_cancellation_charge | trust_quarantine |
       historical_incident_overlay_add | remediation | close | expire
before_head_ref: <ObjectRef or null only at genesis>
before_head_hash: sha-256:<hex or null>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
reservation_manifest_before_ref: <ObjectRef or null only at genesis>
reservation_manifest_before_hash: sha-256:<hex or null>
reservation_manifest_after_ref: <ObjectRef>
reservation_manifest_after_hash: sha-256:<hex>
economic_atom_manifest_before_ref: <ObjectRef or null only at genesis>
economic_atom_manifest_before_hash: sha-256:<hex or null>
economic_atom_manifest_after_ref: <ObjectRef>
economic_atom_manifest_after_hash: sha-256:<hex>
confirmed_event_manifest_before_ref: <ObjectRef or null only at genesis>
confirmed_event_manifest_before_hash: sha-256:<hex or null>
confirmed_event_manifest_after_ref: <ObjectRef>
confirmed_event_manifest_after_hash: sha-256:<hex>
economic_atom_delta_manifest_ref: <enumerable_transition_manifest ObjectRef>
economic_atom_delta_manifest_hash: sha-256:<hex>
authority_transaction_id: <same serializable economic transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.authority_limit_ledger_transition_receipt.v0.1
ledger_key: sha-256:<stable ledger key>
economic_mutation_cause_core_ref: <ObjectRef>
economic_mutation_cause_core_hash: sha-256:<hex>
cause: genesis | reservation_hold | reservation_release | time_eviction |
       one_shot_consumption | refund | reversal | unexpected_reversal |
       unexpected_cancellation_charge | trust_quarantine | remediation |
       policy_revision | close
before_head_ref: <ObjectRef or null only at genesis>
before_head_hash: sha-256:<hex or null>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
event_manifest_before_ref: <ObjectRef or null only at genesis>
event_manifest_before_hash: sha-256:<hex or null>
event_manifest_after_ref: <ObjectRef>
event_manifest_after_hash: sha-256:<hex>
event_delta_manifest_ref: <enumerable_transition_manifest ObjectRef>
event_delta_manifest_hash: sha-256:<hex>
authority_transaction_id: <same serializable ledger/economic transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The two transition receipts are the only legal entries in checkout compartment
and limit-ledger transition manifests. Each current root is mechanically
recomputed from its signed current manifest; each resource atom manifest is the
deduplicated union of the current member-compartment atom manifests. Every
economic/ledger transition binds before, after, and exact delta manifests.
Current-manifest and receipt getters are mandatory recovery APIs. Opaque roots,
database enumeration, or a manifest that omits a zero-value member are not
conforming.

The capability-prerequisite registry specifies an exact complete set of ledger
kinds and field discriminants. Genesis is created only by the corresponding
compartment, mandate, or one-shot authority issuance. The authority-internal
`execution.authority_limit_ledger.transition` is the sole non-genesis writer.
Only `execution.reservation.hold|release|expire` receipts can add/reclassify
reservation event atoms; AccountingPolicy-authorized refund receipts may apply
the exact replenishment delta. One-shot consumption is false→true exactly once
and never replenishes. Every candidate reservation CASes the complete ledger set,
compartment state, obligation state, and lineage fence in one transaction; two
last-unit contenders share the same heads and at most one wins. CompartmentStateHead
`compartment_limit_ledger_heads_root` commits only the exact resource-scoped
`compartment_window` and `compartment_lifetime` heads for that compartment. Every
reservation receipt separately commits its complete action-specific principal,
mandate, one-shot, and compartment before/after ledger vector. Omitted,
duplicate, sibling-namespace, or independently updated ledgers deny; one
mandate's exhaustion never changes the compartment state or blocks an otherwise
authorized sibling mandate unless a shared resource-scoped compartment limit is
also exhausted.

Every financial mandate has its own three monetary ledger classes keyed by that
exact mandate ref: `mandate_monetary_aggregate`, one
`mandate_monetary_window` instance per signed rolling-window constraint, and
`mandate_outstanding`. Their immutable maxima come only from the same signed
mandate; they never inherit the broader principal or compartment ceiling. The
per-action mandate limit is checked directly against each candidate reservation.
A financial preauthorized reservation must CAS these mandate money heads in
addition to mandate count/rate, principal money, and compartment ledgers.
For mandate, compartment, and one-shot kinds, `ledger_key` is recomputed over
schema/domain version, ledger kind/namespace, principal, mandate-or-authority ref,
constraint source ref/hash, compartment key, asset and window. These local
compartment window/lifetime heads enforce that immutable compartment's stricter
limits; they do not substitute for the separate shared economic-resource exposure
head. For a principal kind it instead includes the stable
`principal_limit_policy_id`, domain, asset,
kind and window and deliberately excludes the revisable source ref/hash; all
mandates and one-shot paths for that principal/domain therefore share the same
heads. The signed `limit_value` is copied exactly from the current source. A
principal-policy revision updates source ref/hash and limit in the same stable
ledger successor without erasing atoms; a newly lower limit may make it
exhausted immediately. The exact sorted set of ledger discriminants established
at initial policy issue—presence of count, aggregate, and outstanding kinds plus
every rate/window `window_seconds`—is immutable in v0.1. A revision may change
only the limit values for those existing keys and policy validity metadata. It
cannot add, remove, or change a window or kind; such a request denies until a
future profile defines an atomic history-preserving migration. Other
source/limit values cannot change in a successor. A missing source, mismatched
limit, alternate key for the same discriminant, or reuse of one key across
different sources denies.

The kind-specific state matrix is closed. Ordinary count, aggregate, window,
rate, and lifetime ledgers advance `active → active | exhausted` as committed
event atoms consume capacity. A one-shot ledger advances exactly
`active,false → exhausted,true` and can never return to active. A rolling-window
or rate ledger may advance `exhausted → active` only when authenticated
authority-service time evicts enough already committed atoms under the immutable
window rule; an outstanding ledger may do so only from a typed release, expiry,
or policy-authorized refund receipt. Lifetime ledgers never replenish except
when the bound AccountingPolicy explicitly defines a refund delta. A restrictive
freeze records the exact prior nonterminal state in `pre_freeze_state`; resume
may restore only that state and clears the field. `closed` is terminal, and every
non-frozen head requires `pre_freeze_state:null`. No caller supplies a next state
or recomputed counter.

The sole exception to ordinary `closed` terminality is coordinator-only trust or
unexpected-reversal remediation on every monetary ledger whose capacity was
increased by a later-compromised release/refund or whose released exposure was
later reversed: principal/mandate outstanding, monetary aggregate,
monetary window, and lifetime ledgers. The affected
`active | exhausted | closed` head moves to `frozen`, records the exact prior
state, and adds a uniquely keyed quarantine event atom equal to the invalid
capacity delta. For an outstanding head, effective outstanding is
`current_outstanding_value + quarantine_value`; for aggregate/lifetime it is the
stored consumed value plus `quarantine_value`; for a live rolling window it is
`current_window_value + quarantine_value` for the still-applicable event slice.
Resolution removes or reclassifies those exact atoms through `frozen → frozen`;
an evidence-only resolution may reach `complete_frozen` but cannot return any
ledger to a nonfrozen state. Only the receipt-wide
`execution.exposure_remediation.resume` transaction, with the complete fresh
RemediationResumeAuthorization set, restores the recorded `active`, `exhausted`,
or `closed` state; it restores `closed` when that was the prior state and can
never reactivate an expired mandate. A window atom that ages out is removed only
by authenticated authority time under its original window rule, never merely by
the remediation request. Reservation through any other compartment or mandate
sees the shared frozen/quarantine value. Count, rate, and one-shot ledgers cannot
use this exception because a refund cannot replenish them.

Compartment exhaustion follows the same typed heads. `active → exhausted`
requires a nonempty `exhausted_limit_ledger_keys_root` equal to every currently
exhausted compartment-window/lifetime ledger for that resource; principal or
mandate exhaustion denies only that authority path. `exhausted → active` is
permitted only when a typed
time-eviction, release, expiry, or policy-authorized refund receipt has returned
every key in that root to active and the next root is empty. A restrictive freeze
records the exact prior compartment state in `pre_freeze_state` without changing
the exhausted set. One coordinator-only historical-remediation exception permits
`closed → frozen` after a later authenticated compromise or reversal; it records
`pre_freeze_state:closed`, restores exact conservative atoms, and can return only
to closed after reconciliation and explicit principal-authorized remediation
resume. An ordinary non-remediation restrictive freeze may recover with its
family-specific fresh principal control. A head with a non-null
`remediation_transaction_id`, however, can move only `frozen → frozen` under
evidence resolution until `execution.exposure_remediation.resume` verifies the
complete fresh RemediationResumeAuthorization set and restores exactly the
recorded state. If that state is exhausted, the separate exhaustion-recovery
rule must then advance it to active. Resume also requires zero compartment and
authority-ledger quarantine amounts. Pending attestation cannot be resumed, and an ordinary closed
state has no successor; only the historical-remediation edge above can reopen it
to frozen without granting new capacity.
Every non-frozen compartment head requires `pre_freeze_state:null`.

The authority service resolves every provider, adapter, API, contract, and MCP
alias through the signed provider and account-identity registries before key
derivation. It globally indexes
`(provider_trust_domain_id, stable_root_account_id, asset)` in
the same serializable uniqueness transaction used for reservation. Unknown,
conflicting, cyclic, or stale alias mappings deny. Its root key excludes every
Cairn namespace and enforcement-
locus label. Every parent-null compartment for that root receives the identical
root key and shared aggregate exposure head; its stricter local window/lifetime
ledgers may remain compartment-specific. A child receives a derived key only with a non-null root key,
canonical provider sublimit ID, and mechanically verified proof of disjointness
from the root remainder and every sibling. A second parent-null alias or an
overlapping/unproven locus maps to the root ledger or denies; it can never mint a
new namespace. Resource-key uniqueness and reservation across all ledgers are one
serializable transaction.

Every economic resource also has one authoritative cap-selection head and one
aggregate exposure head, independent of compartment definition, constraint
source, principal-selected label, and Cairn namespace:

```yaml
schema: cairn.economic_resource_protection_cap_state_head.v0.1
resource_cap_key: sha-256:<JCS("cairn-resource-cap-v0.1", economic_resource_key, asset)>
economic_resource_key: sha-256:<canonical root or verified-disjoint child key>
asset: <canonical asset>
generation: <monotonic integer>
protection_attestation_ref: <immutable ObjectRef selected as current>
protection_attestation_hash: sha-256:<hex>
protection_attestation_lifecycle_head_ref: <current ObjectRef>
protection_attestation_lifecycle_head_hash: sha-256:<hex>
enforced_cap: <checked Money in asset>
enforcement_locus: <exact provider feature/contract/permission>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: active | frozen | quarantined | closed
updated_at: <authority-service time>
head_hash: sha-256:<hex>
protection_registry_signature: <Signature>
```

```yaml
schema: cairn.economic_resource_compartment_membership_manifest.v0.1
resource_exposure_key: sha-256:<economic resource and asset key>
sequence: <same resource-exposure head sequence>
member_count: <nonnegative ordinary-capacity member count no greater than 64>
sorted_members:
  - compartment_control_key: sha-256:<hex>
    compartment_ref: <immutable ObjectRef>
    compartment_hash: sha-256:<hex>
    compartment_state_head_ref: <current nonclosed ObjectRef>
    compartment_state_head_hash: sha-256:<hex>
    configured_ceiling: <checked Money in the resource asset>
members_root: sha-256:<canonical sorted complete nonclosed member set>
manifest_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.economic_resource_protection_cap_transition_receipt.v0.1
resource_cap_key: sha-256:<same key>
before_head_ref: <ObjectRef or null for insert-only genesis>
before_head_hash: sha-256:<hex or null>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
prior_attestation_lifecycle_transition_ref: <retirement/quarantine receipt or null>
new_attestation_import_receipt_ref: <ObjectRef or null unless genesis/replacement>
resource_exposure_before_head_ref: <ObjectRef or null only for cap genesis>
resource_exposure_before_head_hash: sha-256:<hex or null>
resource_exposure_after_head_ref: <joint state-compatible successor, or null only before exposure genesis>
resource_exposure_after_head_hash: sha-256:<hex or null>
member_manifest_before_ref: <complete signed ObjectRef or null only at resource genesis>
member_manifest_before_hash: sha-256:<hex or null>
member_manifest_after_ref: <complete signed ObjectRef or null only at cap genesis
                              before resource-exposure genesis>
member_manifest_after_hash: sha-256:<hex or null under same exception>
member_manifest_before_count: <nonnegative integer or null at cap genesis>
member_manifest_after_count: <nonnegative integer or null under same exception>
member_compartment_transitions_root: sha-256:<exact before/after set; empty only
                                                when no member changes>
cause: onboard | authenticated_replacement | cap_reduction |
       scheduled_retirement | compromise_quarantine | close
registry_transaction_id: <one cap-selector/lifecycle/resource-exposure CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
protection_registry_signature: <Signature>
```

The cap key has exactly one current head. `execution.economic_resource_cap.import`
creates generation 0 insert-only from an allowlisted attestation registry.
Cap genesis precedes resource-exposure genesis and therefore carries null before/
after membership fields; `execution.economic_resource_exposure.import` then
creates the empty signed membership manifest, exposure head, and integrity-
inventory entry in one transaction. Every non-genesis cap transition requires
both complete membership manifests and counts.
`execution.economic_resource_cap_state.transition` is its sole successor writer. An
authenticated replacement CASes the expected cap head, retires the prior
attestation lifecycle, installs the new active attestation/lifecycle and cap, and
rechecks every alias plus the resource exposure head in one registry transaction.
A lower cap installs the sole active-cap/active-exposure pair only when it remains
at or above current exposure **and** every nonclosed member compartment's
immutable `configured_ceiling`; all member compartment and exposure equations
must remain valid. The complete member set comes only from the signed current
membership manifest, including compartments with zero current atoms. The cap
transaction CASes that manifest ref/hash/count and proves that its canonical
member set was inspected; an atom-contributor index is not a membership index.
If it falls below either current exposure or any such ceiling,
the transaction installs one frozen cap successor, freezes the resource exposure,
and freezes every now-incompatible member compartment before publication.
`(active cap, frozen exposure)`, `(frozen cap, active exposure)`, or an active
compartment whose configured ceiling exceeds the current cap is forbidden for
this cause. Compromise uses the trust
coordinator and selects `quarantined`; no alias may choose an immutable
attestation directly. Any cap transition away from active atomically installs a
non-active resource-exposure successor before the cap successor is visible; the
receipt may never point to an unchanged active exposure head. The closed cap
matrix is `active → active | frozen |
quarantined | closed`, `frozen → active | quarantined | closed`. `quarantined` is
terminal; `closed` is ordinarily terminal, with one coordinator-only historical-
compromise edge `closed → quarantined`. Recovery from frozen requires a current active
attestation, resource exposure within its cap, and no nonclosed member compartment
whose immutable configured ceiling exceeds that cap; incompatible compartments
must remain frozen and be closed/replaced through fresh principal acceptance.

```yaml
schema: cairn.economic_resource_exposure_state_head.v0.1
resource_exposure_key: sha-256:<JCS("cairn-resource-exposure-v0.1",
                                   economic_resource_key, asset)>
economic_resource_key: sha-256:<canonical root or verified-disjoint child key>
root_economic_resource_key: sha-256:<canonical root key>
asset: <canonical asset>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
fencing_token: <monotonic integer>
state: active | frozen | closed
pre_freeze_state: active | closed | null
member_compartment_manifest_ref: <content-addressed complete nonclosed-member manifest>
member_compartment_manifest_hash: sha-256:<hex>
member_compartment_count: <nonnegative integer>
member_compartment_state_heads_root: sha-256:<must equal manifest members_root>
historical_incident_compartment_map_ref: <enumerable_map_root ObjectRef>
historical_incident_compartment_map_hash: sha-256:<hex>
historical_incident_compartment_count: <checked uint64>
active_hold_atoms_root: sha-256:<canonical deduplicated union across aliases>
active_reversal_atoms_root: sha-256:<canonical deduplicated union across aliases>
quarantine_hold_atoms_root: sha-256:<canonical deduplicated union across aliases>
current_resource_atom_manifest_ref: <enumerable_map_root complete union ObjectRef>
current_resource_atom_manifest_hash: sha-256:<hex>
current_resource_atom_count: <checked uint64>
current_outstanding_exposure: <checked Money in asset>
current_resource_cap_state_head_ref: <exact current cap-selector ObjectRef>
current_resource_cap_state_head_hash: sha-256:<hex>
current_enforced_cap: <checked Money in asset>
unresolved_exposure_commitment_root: sha-256:<empty unless frozen remediation>
remediation_transaction_id: <stable id or null outside remediation>
remediation_commitment_hash: sha-256:<typed preimage hash or null>
updated_at: <authority-service time>
head_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.economic_resource_exposure_transition_receipt.v0.1
resource_exposure_key: sha-256:<same key>
economic_mutation_cause_core_ref: <ObjectRef>
economic_mutation_cause_core_hash: sha-256:<hex>
before_head_ref: <ObjectRef or null for insert-only genesis>
before_head_hash: sha-256:<hex or null>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
member_manifest_before_ref: <ObjectRef or null only at resource genesis>
member_manifest_before_hash: sha-256:<hex or null>
member_manifest_after_ref: <ObjectRef>
member_manifest_after_hash: sha-256:<hex>
member_manifest_before_count: <nonnegative integer or null only at resource genesis>
member_manifest_after_count: <nonnegative integer>
historical_incident_map_before_ref: <ObjectRef or null only at resource genesis>
historical_incident_map_before_hash: sha-256:<hex or null>
historical_incident_map_after_ref: <ObjectRef>
historical_incident_map_after_hash: sha-256:<hex>
cause: resource_onboarded | compartment_membership_changed |
       reservation_delta | role_transfer | release | refund | reversal |
       cap_reduction | trust_quarantine | unexpected_reversal |
       unexpected_cancellation_charge |
       historical_incident_overlay_add | remediation | close
contributing_compartment_transitions_root: sha-256:<exact before/after pairs>
contributing_obligation_transitions_root: sha-256:<exact before/after pairs>
contributing_limit_ledger_transitions_root: sha-256:<exact before/after pairs>
atom_delta_root: sha-256:<canonical added/removed/reclassified atom set>
resource_atom_manifest_before_ref: <signed complete ObjectRef or null only at genesis>
resource_atom_manifest_before_hash: sha-256:<hex or null>
resource_atom_manifest_after_ref: <signed complete ObjectRef>
resource_atom_manifest_after_hash: sha-256:<hex>
economic_atom_delta_manifest_ref: <signed enumerable ObjectRef>
economic_atom_delta_manifest_hash: sha-256:<hex>
authority_transaction_id: <same serializable economic mutation>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The registry creates this head insert-only at resource onboarding and enforces
one current head per `resource_exposure_key`, only after the exact active cap
selector exists. Its atom roots are the exact union
of the named ordinary compartment heads in the signed membership manifest plus
every frozen historical-incident compartment in the enumerable overlay map; its
numeric value is the sum of those
roots and MUST satisfy `current_outstanding_exposure <= current_enforced_cap` in
every active head. Its cap ref/hash and numeric cap MUST equal the one current
EconomicResourceProtectionCapStateHead; every compartment alias binds that same
selector. Every compartment issue, reservation, role transfer, release,
refund, reversal, quarantine, remediation, close, gate, redemption, and handoff
CASes or rechecks this same head as applicable. Two aliases may retain distinct
stricter local ceilings, but their aggregate atoms share this head and cannot
each spend the provider cap. A protection-cap reduction freezes this head before
any alias can reserve. A verified-disjoint child has its own key/head; an
overlapping or unproved child maps to the root head or denies.
Compartment issue and final close are the ordinary membership add/remove causes
and atomically create the next signed manifest plus exposure head. The sole
exception is coordinator-only `historical_incident_overlay_add`: a proven
late compromise or reversal CASes the exact closed compartment tombstone,
adds its frozen zero-capacity successor to the historical overlay map, restores
conservative atoms and the exposure/ledger heads, and grants zero capacity. It
does not consume one of the 64 ordinary membership positions. Its later
resolved frozen→closed return removes that exact overlay entry under `close`. Every
other compartment transition replaces exactly its own current-head entry without
changing membership or count. A zero-atom compartment remains enumerable until
its signed closed successor and manifest removal commit together. Missing,
duplicate, stale, or unresolvable members fail-stop integrity before a cap change.
The closed matrix is `active → active | frozen | closed`,
`frozen → frozen | active | closed`, plus one coordinator-only
`closed → frozen` edge when a later authenticated compromise or reversal restores
historical exposure. Active→active is an
exact balanced economic/alias/cap update. Active→frozen requires a restrictive
cap, identity, trust, or unexpected-reversal cause. Frozen→frozen is typed
reconciliation only. For an ordinary cap/control freeze with null
`remediation_transaction_id`, frozen→active requires an empty unresolved root,
empty quarantine root, exposure within the current cap, complete equality to
every member compartment, and fresh principal control. For a remediation-frozen
head, those conditions are necessary but insufficient: only the receipt-wide
`execution.exposure_remediation.resume` transaction and complete current
RemediationResumeAuthorization set may produce the nonfrozen successor. Close requires zero atoms and
no live/unknown obligation on the resource. A historical closed→frozen head
records `pre_freeze_state:closed`; after complete reconciliation it may return
only to closed, never active. No caller chooses a state.

Cap and exposure states obey one closed joint matrix. An active exposure head is
valid only with the exact current active cap head. A frozen exposure head may
bind an active, frozen, or quarantined cap head, but grants zero new reservation,
redemption, or handoff capacity until both heads return to active in one checked
transaction. A closed exposure head binds the exact current closed or terminal
quarantined cap head.
Late compromise/reversal uses the exceptional pair `(cap:closed,
exposure:closed) → (cap:quarantined, exposure:frozen)`; the frozen exposure records
`pre_freeze_state:closed` and can return only to closed after reconciliation;
the quarantined cap remains terminal and that economic resource cannot be reused.
Gate,
reservation, redemption, and handoff require both current heads to be active,
not merely hash-equal or under-cap. Every other cross-product is invalid.

```yaml
schema: cairn.compartment_protection_attestation.v0.1
attestation_id: urn:uuid:<uuid>
provider_id: <provider/service/contract>
provider_trust_domain_id: <same registry-canonical stable identity>
provider_identity_registry_ref: <same signed immutable ObjectRef>
provider_account_identity_head_ref: <same current signed ObjectRef>
account_generation: <same current generation>
provider_account_identity_trust_overlay_head_ref: <same current eligible ObjectRef>
provider_account_identity_trust_overlay_head_hash: sha-256:<hex>
provider_sublimit_identity_head_ref: <same current ObjectRef or null for root>
provider_sublimit_identity_head_hash: sha-256:<same hash or null for root>
provider_sublimit_identity_trust_overlay_head_ref: <same current eligible ObjectRef or null for root>
provider_sublimit_identity_trust_overlay_head_hash: sha-256:<hex or null for root>
stable_root_account_id: <same opaque immutable registry ID>
provider_canonical_root_account_commitment: sha-256:<hex>
root_economic_resource_key: sha-256:<hex>
economic_resource_key: sha-256:<hex>
asset: <canonical asset>
protection_class: <closed class>
enforced_cap: <Money>
enforcement_locus: <provider feature/contract/permission id>
parent_resource_key: sha-256:<root key; null only when economic_resource_key == root key>
provider_sublimit_id: <canonical id or null for root>
disjoint_sublimit_proof_ref: <provider-signed ObjectRef or null>
sublimit_generation: <current integer or null for root>
credential_and_bypass_profile_hash: sha-256:<hex>
status_endpoint: <authenticated endpoint>
issued_at: <time>
expires_at: <time>
attestation_hash: sha-256:<hex>
provider_or_contract_signature: <Signature>
not_claiming: [insolvency_protection, unlisted_bypass_absence, payment_finality]
```

Without a current verifiable attestation, the class is
`cairn_ledger_only`. Preauthorized value MUST deny whenever
`protection_class == cairn_ledger_only`, even if a current attestation truthfully
declares that class. Only a separately frozen future profile may change this
rule. The compartment ceiling is never permission; every effect still needs
exact authority.

Every immutable protection attestation has a current `PolicyLifecycleHead` whose
`policy_ref/hash` are that exact attestation and whose policy authority is the
allowlisted protection-registry authority. Every immutable adapter-identity
record uses the same lifecycle family under its adapter-registry authority.
These are normative mappings, not optional generic “identity” interpretations:
their canonical trust-dependency refs are the attestation ObjectRef and adapter-
identity ObjectRef respectively, and `execution.policy_lifecycle.transition` is
their sole non-genesis writer. Financial review, BindingSet, reservation, gate,
redemption, and handoff carry the exact active attestation lifecycle head through
the complete `policy_lifecycle_head_refs` set. Attestation expiry, retirement, or
compromise blocks new value; compromise uses the atomic coordinator path in
§5.3 and never relies only on the status endpoint.

Account and sublimit generations are authority dimensions, not descriptive
metadata. `account_generation` equals the explicit `account_generation` field of
the current signed ProviderAccountIdentityHead, not its lifecycle sequence. A child resource additionally carries the
current provider-authenticated `sublimit_generation`; a root resource requires
that field and the sublimit identity head to be null. The generation MUST equal
the current ProviderSublimitIdentityHead's explicit `sublimit_generation` field,
not its lifecycle sequence, and its current proof, cap,
locus, root key, and child key MUST match. The compartment, protection attestation, mandate scope,
ExecutionReviewReceipt, ExecutionBindingSet, executor-credential binding,
AuthorityReservation, GateResult, redemption receipt, and outbox handoff all
carry and compare the same exact generations. Advancing either generation
quarantines every old-generation compartment and invalidates its reviews,
mandates, binding sets, reservations, and unredeemed gates. Reactivation requires
a new compartment definition with fresh principal acceptance and, for delegated
execution, a fresh principal-signed mandate; binding a newer credential to an
older authority chain is forbidden. Existing submitted/unknown exposure stays
held and reconcilable under the historical generation.

### 5.3 Quote, exposure, accounting, and finality

```yaml
schema: cairn.quote_snapshot.v0.1
quote_snapshot_id: urn:uuid:<uuid>
source_kind: local_terms | receiver_quote
provider_id: <provider/service/contract>
provider_quote_id: <id or null for local terms>
provider_quote_artifact_ref: <authenticated ObjectRef or null>
quote_source_credential_core_ref: <SourceCredentialAuthorityCore ObjectRef>
quote_source_credential_core_hash: sha-256:<hex>
quote_source_credential_lifecycle_head_ref: <current active ObjectRef>
quote_source_credential_lifecycle_head_hash: sha-256:<hex>
quote_source_credential_generation: <integer>
importer_adapter_identity_ref: <immutable adapter identity ObjectRef>
importer_adapter_identity_hash: sha-256:<hex>
importer_adapter_lifecycle_head_ref: <current active PolicyLifecycleHead ObjectRef>
importer_adapter_lifecycle_head_hash: sha-256:<hex>
ultimate_receiver: <provider-canonical identity>
payee_account_commitment: sha-256:<hex or null>
closed_terms_or_cart_hash: sha-256:<hex>
copy_ids: []
rail: <rail>
accounting_asset: <one canonical asset>
exposure_components:
  - role: item_price | fee | tax | shipping | attention_fee | rail_cost | other_named
    amount_minor: <nonnegative integer>
    asset: <same accounting asset>
maximum_total: {amount_minor: <sum of every unique component>, asset: <same asset>}
provider_state_sequence: <monotonic sequence or null>
issued_at: <time>
expires_at: <time>
quote_hash: sha-256:<hex>
source_signature: <provider/terms-service Signature>
not_claiming: [charge_authorized, receiver_acceptance, physical_truth]
```

Component roles are unique unless a future schema defines an indexed role. The
validator recomputes `maximum_total` with checked integer arithmetic. Unknown
roles, duplicate roles, negative values, mixed assets, overflow, missing costs,
or a provider artifact that does not authenticate exact fields deny. Local
terms still require an allowlisted terms-service source credential; `source_kind`
never permits an unsigned or lifecycle-free quote.

```yaml
schema: cairn.provider_quote_import_receipt.v0.1
quote_snapshot_ref: <QuoteSnapshot ObjectRef>
quote_snapshot_hash: sha-256:<hex>
raw_provider_artifact_ref: <authenticated ObjectRef or null exactly for local terms>
raw_provider_artifact_digest: sha-256:<exact imported bytes>
quote_source_credential_core_ref: <same ObjectRef>
quote_source_credential_core_hash: sha-256:<hex>
quote_source_credential_lifecycle_head_ref: <same active ObjectRef>
quote_source_credential_lifecycle_head_hash: sha-256:<hex>
quote_source_credential_generation: <same integer>
importer_adapter_identity_ref: <same immutable ObjectRef>
importer_adapter_identity_hash: sha-256:<hex>
importer_adapter_lifecycle_head_ref: <same active ObjectRef>
importer_adapter_lifecycle_head_hash: sha-256:<hex>
provider_artifact_to_snapshot_field_equality_proof_hash: sha-256:<canonical complete mapping>
import_idempotency_key: sha-256:<provider/source/artifact digest>
imported_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

`execution.provider_quote.import` emits this typed receipt after verifying the
source signature, source-credential lifecycle, importer adapter identity and
adapter lifecycle. Same key/same artifact is byte-identical; a different digest
conflicts. The source credential and importer adapter stable keys are complete-
set trust dependencies of every review, reservation, assertion, and exposure
derived from the quote. Pre-handoff retirement/revocation denies; later
compromise invokes reverse closure and never treats quote expiry as a substitute
for signer revocation.

```yaml
schema: cairn.accounting_policy.v0.1
policy_id: <stable URI>
asset: <canonical asset>
debit_event: authority_reservation
window_semantics_ref: <ObjectRef>
refund_replenishment:
  eligible_receiver_states: []
  replenishes: none | outstanding_only | window_and_outstanding | named_limits
  named_limits: []
reversal_exposure_release_states: []
event_ordering: finality_profile_single_stream_sequence_only
issued_at: <time>
expires_at: <time>
policy_hash: sha-256:<hex>
policy_authority_signature: <Signature>
```

```yaml
schema: cairn.receiver_finality_profile.v0.1
profile_id: <stable URI>
provider_id: <provider/service/contract>
provider_trust_domain_id: <registry-canonical stable identity>
rail: <rail>
applicability:
  capability: <exact capability>
  receiver_operation_kind: <exact operation>
  event_schema_uri: <immutable URI>
  event_schema_hash: sha-256:<hex>
  provider_api_version: <version>
  adapter_id: <adapter>
  adapter_version: <version>
  receiver_account_or_contract_scope: <canonical scope>
  receiver_operation_namespace: <canonical namespace>
  declared_event_id_scope: <provider-authenticated canonical scope>
  declared_sequence_stream_scope: <provider-authenticated canonical scope>
stream_topology: single_authenticated_total_order_stream
sequence_value_type: uint64
sequence_wire_encoding: canonical_unsigned_decimal_no_leading_zero
sequence_comparator: unsigned_integer_ascending
sequence_epoch_kind: immutable_stream_instance
sequence_epoch_field: <exact authenticated provider field>
sequence_reset_rule: forbidden_within_epoch
equal_sequence_rule: identical_event_replay_or_equivocation
authenticated_event_sources: []
ordered_state_machine: []
acknowledged_states: []
final_states: []
cancel_available_states: []
cancel_confirmed_states: []
reversal_states: []
maximum_events_per_action: <positive integer no greater than 8>
reversal_tail_event_slots: <positive integer included in maximum>
authenticated_stream_closure_states: []
irreversible_reversal_horizon_rule: <authenticated provider rule or null>
stale_event_rule: reject_state_regression
receiver_time_field: <exact authenticated field>
issued_at: <time>
expires_at: <time>
profile_hash: sha-256:<hex>
profile_authority_signature: <Signature>
```

```yaml
schema: cairn.authenticated_irreversible_horizon_receipt.v0.1
action_ref: <ObjectRef>
effect_id: sha-256:<hex>
lineage_id: sha-256:<hex>
receiver_finality_profile_ref: <same exact ObjectRef>
receiver_finality_profile_hash: sha-256:<hex>
receiver_account_or_contract_scope: <same exact scope>
declared_sequence_stream_scope: <same exact scope>
sequence_epoch_value_commitment: sha-256:<same assigned provider epoch>
last_authenticated_event_import_ref: <ObjectRef>
last_authenticated_event_import_hash: sha-256:<hex>
last_authenticated_provider_sequence: <canonical uint64>
horizon_evidence_ref: <provider-authenticated ObjectRef>
horizon_evidence_hash: sha-256:<hex>
evaluated_horizon_rule_hash: sha-256:<exact profile rule>
irreversibility_effective_at: <provider-authenticated time/height>
verified_at: <adapter authority time>
receipt_hash: sha-256:<hex>
adapter_authority_signature: <Signature>
```

Only the allowlisted adapter may import this receipt, and only when the exact
current finality profile defines a finite irreversible-horizon rule and the
provider-authenticated evidence satisfies it for this action, effect, scope, and
sequence epoch. The same receipt is the sole horizon-release evidence for the
receiver outstanding-stream entry, connection entry, paired identity/tail slot
assignments, trust assignments, and any transferred future-dependency slot. A
local clock, ordinary final event, settlement label, or adapter assertion without
the provider evidence cannot substitute.

At least one of `authenticated_stream_closure_states` or a finite,
provider-authenticated `irreversible_reversal_horizon_rule` is mandatory. Both
empty/null is nonconforming because it would retain tail reservations forever.
The receiver-scope outstanding-stream map enforces the frozen concurrent limit
before handoff; hitting that visible limit denies only new work and never an
event for an already admitted stream.

Both policy hashes are bound from mandate/authorization through receiver receipt.
`authorized`, `approved`, popup completion, and executor success are never final
unless the exact finality profile says a verified receiver event is final.
Gate and importer require exact applicability equality; a payment-authorization
profile cannot classify capture, a cancellation-request profile cannot classify
cancellation confirmation, and an event from another schema/adapter/account scope
cannot advance state.
v0.1 accepts only one authenticated total-order stream per declared stream scope.
Every order, acknowledgement, cancellation, failure, fulfillment, and reversal
event for the action/effect must carry the same immutable epoch and an unsigned
64-bit sequence encoded without sign, whitespace, exponent, decimal point, or
leading zero (except `0`). Ordering is numeric ascending; receiver time never
breaks a tie. Equal sequence is valid only for the identical event core and is
otherwise equivocation. Providers with resetting counters, incomparable
substreams, vector clocks, or independently ordered order/cancel/reversal feeds
are nonconforming in v0.1 and require a future frozen join profile.

All “complete” execution sets are finite, enumerable protocol objects under one
release-bound resource profile:

```yaml
schema: cairn.execution_resource_bounds_profile.v0.1
profile_id: cairn-supervised-execution-v0.1-bounds
max_request_bytes: 2097152
max_canonical_object_bytes: 1048576
max_canonical_string_bytes: 65536
max_canonical_uri_or_object_ref_bytes: 4096
max_json_nesting_depth: 32
max_properties_per_object: 512
max_entries_per_inline_array: 128
max_total_inline_array_entries_per_object: 4096
max_dependency_entries_per_index: 32
max_compartments_per_economic_resource: 64
max_credential_aliases_per_instance: 8
max_credential_instances_per_broker_authority: 16
max_receiver_identity_entries_per_scope: 32
max_direct_receiver_identity_collision_seeds: 2
max_receiver_events_per_action: 8
max_transition_manifest_entries: 128
max_dependencies_per_action: 32
max_economic_roots_per_action: 8
max_compartments_per_action: 64
max_obligations_per_action: 64
max_ledgers_per_action: 128
max_rate_windows_per_principal: 32
max_money_windows_per_principal: 32
max_rate_windows_per_mandate: 32
max_money_windows_per_mandate: 32
max_scoped_control_heads_per_action: 64
max_scope_bindings_per_mandate: 64
max_binding_set_grants: 32
max_binding_set_disclosures: 32
max_inventory_copies_per_action: 64
max_checkout_lines: 64
max_mandatory_obligation_components: 64
max_incremental_cost_components_per_attempt: 64
max_field_paths_per_disclosure: 128
max_intent_refs_per_mandate: 64
max_capability_scopes_per_mandate: 64
max_intent_hashes_per_mandate: 64
max_remediation_roots: 64
max_integrity_resolution_receipts_per_incident: 5
max_future_dependency_slots_per_pool: 128
max_concurrent_outstanding_streams_per_receiver_scope: 1024
max_closure_partition_entries: 128
max_enumerable_map_node_fanout: 16
max_enumerable_map_scan_page_entries: 128
max_new_index_entries_per_transaction: 128
max_state_head_writes_per_atomic_transaction: 32768
profile_hash: sha-256:<hex>
execution_release_authority_signature: <Signature>
```

```yaml
schema: cairn.enumerable_transition_manifest.v0.1
manifest_kind: lifecycle_transition_chain | source_credential_continuity_chain |
               checkout_compartment_transitions | checkout_limit_ledger_transitions |
               checkout_economic_atom_deltas | compartment_economic_atom_deltas |
               resource_economic_atom_deltas | authority_limit_ledger_event_deltas |
               receiver_trust_slot_assignments | receiver_trust_epoch_transitions |
               closure_snapshot_entries | closure_partition_entries
subject_ref: <ObjectRef>
subject_hash: sha-256:<hex>
authority_transaction_id: <transaction/chain identity>
entry_count: <nonnegative integer no greater than the bounds profile>
sorted_entries:
  - entry_key: sha-256:<canonical domain-specific key>
    entry_kind: lifecycle_transition_receipt | compartment_transition_receipt |
                limit_ledger_transition_receipt | economic_atom_delta |
                bounded_index_slot_assignment | bounded_index_epoch_transition_receipt |
                closure_snapshot_entry | closure_work_item | closure_partition_receipt
    entry_object_ref: <kind-matching typed ObjectRef>
    entry_object_hash: sha-256:<hex>
entries_root: sha-256:<canonical sorted complete set>
manifest_hash: sha-256:<hex>
issuing_authority_id: <branch-exact lifecycle or execution authority>
issuing_authority_signature: <Signature>
```

The manifest-kind/entry-kind cross-product is closed. In particular,
`receiver_trust_slot_assignments` admits only
`bounded_index_slot_assignment`, while `receiver_trust_epoch_transitions`
admits only `bounded_index_epoch_transition_receipt`; both use the same sorted
dependency/epoch/slot keys, so terminal completion can prove exact keyset
equality. A generic ObjectRef or either trust entry kind under a checkout,
lifecycle, or closure manifest is invalid.

```yaml
schema: cairn.economic_mutation_cause_core.v0.1
economic_mutation_id: sha-256:<domain-separated transaction/idempotency/cause semantics>
cause_kind: resource_onboarded | compartment_onboarded | ledger_genesis |
            reservation_hold | reservation_release | role_transfer |
            receiver_debit | refund | reversal | unexpected_reversal |
            unexpected_cancellation_charge | trust_quarantine |
            historical_incident_overlay_add | remediation | close | expire |
            policy_revision | one_shot_consumption
principal_id: <principal>
economic_resource_key: sha-256:<hex>
asset: <canonical asset>
before_compartment_heads: # bounded exact predecessors or empty at genesis
  - compartment_control_key: sha-256:<hex>
    head_ref: <ObjectRef>
    head_hash: sha-256:<hex>
before_compartment_heads_root: sha-256:<same canonical vector>
before_resource_head_ref: <ObjectRef or null only at resource genesis>
before_resource_head_hash: sha-256:<hex or null>
before_obligation_heads: # bounded exact predecessors or empty
  - obligation_exposure_id: sha-256:<hex>
    head_ref: <ObjectRef>
    head_hash: sha-256:<hex>
before_obligation_heads_root: sha-256:<same canonical vector>
before_limit_ledger_heads: # bounded exact predecessors
  - ledger_key: sha-256:<hex>
    head_ref: <ObjectRef>
    head_hash: sha-256:<hex>
before_limit_ledger_heads_root: sha-256:<same canonical vector>
source_evidence_refs_and_hashes: # bounded authenticated causes/terms/events
  - evidence_ref: <typed ObjectRef>
    evidence_hash: sha-256:<hex>
source_evidence_refs_and_hashes_root: sha-256:<same canonical vector>
proposed_semantic_atom_deltas: # bounded value descriptors, never entry ObjectRefs
  - atom_id: sha-256:<canonical identity>
    before_class: <closed economic class>
    after_class: <closed economic class>
    amount: <checked Money>
proposed_semantic_atom_deltas_root: sha-256:<same canonical vector>
authority_transaction_id: <stable intended serializable transaction>
idempotency_key: <stable mutation key>
issued_at: <authority-service time before successor construction>
core_hash: sha-256:<hex>
authority_service_signature: <Signature>
not_claiming: [mutation_committed, successor_heads, receiver_finality]
```

This immutable core is constructed before any economic successor, map entry,
transition receipt, or parent operation receipt. It contains no after-head,
after-map, manifest-entry, transition-receipt, or parent-receipt ref/hash. Every
current atom, delta entry, and ledger event created by one economic transaction
points only to this core for provenance. Family transition receipts bind the same
core and the resulting manifests; higher-level receipts point to those transition
receipts. The resulting graph is strictly `cause core → none`, `entry → cause
core`, `manifest → entry`, `transition receipt → cause core + manifests`, and
`parent receipt → transition receipts`; the reverse directions are forbidden.

```yaml
schema: cairn.economic_atom_delta_entry.v0.1
economic_resource_key: sha-256:<hex>
compartment_control_key: sha-256:<hex>
obligation_or_reservation_id: sha-256:<hex>
atom_id: sha-256:<canonical immutable atom identity>
before_class: reserved | confirmed_debit | active_reversal | quarantine_hold |
              confirmed_refund | confirmed_reversal | released | absent
after_class: reserved | confirmed_debit | active_reversal | quarantine_hold |
             confirmed_refund | confirmed_reversal | released | absent
amount: <checked Money>
economic_mutation_cause_core_ref: <cairn.economic_mutation_cause_core.v0.1 ObjectRef>
economic_mutation_cause_core_hash: sha-256:<hex>
authority_transaction_id: <same parent transaction>
entry_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.current_reservation_index_entry.v0.1
reservation_index_key: sha-256:<compartment/reservation id/fence>
compartment_control_key: sha-256:<same compartment>
authority_reservation_ref: <cairn.authority_reservation.v0.2 ObjectRef>
authority_reservation_hash: sha-256:<hex>
action_ref: <ObjectRef>
effect_id: sha-256:<hex>
lineage_id: sha-256:<hex>
reservation_fence: <monotonic integer>
held_atom_ids_root: sha-256:<canonical sorted current (atom_id, atom_hash) set>
entry_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Every `ledger_class: reserved` atom and every current reservation-index entry
form one closed bipartite set. A reserved atom matches exactly one reservation
whose `authority_reservation_ref.object_id`, `reservation_fence`, and
`compartment_control_key` equal the atom's reservation identifier, fence, and
compartment. Every reservation matches at least one reserved atom. Its
`held_atom_ids_root` is exactly `H({schema:
"cairn.current_reservation_held_atoms_root_preimage.v0.1",
reservation_index_key, held_atoms})`, where `held_atoms` is the UTF-8/JCS-sorted
array of the matching current `{atom_id, atom_hash}` pairs. Bare atom IDs,
orphaned reservations, orphaned reserved atoms, duplicate matches, fence drift,
and a stale root after any atom successor deny.

Across a compartment transition, an existing reservation entry may update its
held-atom root but may not rewrite its reservation key, compartment key,
authority reservation ref/hash, action ref, effect ID, lineage ID, or reservation
fence. Every reservation insertion, removal, or content change must be explained
by at least one exact economic-atom delta entering or leaving `reserved` for
that same authority-reservation object ID and fence. A coherent replacement map
without that economic cause is invalid.

```yaml
schema: cairn.current_economic_atom.v0.1
atom_id: sha-256:<canonical immutable atom identity>
economic_resource_key: sha-256:<hex>
compartment_control_key: sha-256:<hex>
obligation_or_reservation_id: sha-256:<hex>
component_role: item | mandatory_component | incremental_component |
                reversal | quarantine
component_id: sha-256:<hex>
reservation_fence: <monotonic integer>
ledger_class: reserved | confirmed_debit | active_reversal | quarantine_hold |
              confirmed_refund | confirmed_reversal | released
amount: <checked Money>
economic_mutation_cause_core_ref: <cairn.economic_mutation_cause_core.v0.1 ObjectRef>
economic_mutation_cause_core_hash: sha-256:<hex>
atom_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.confirmed_economic_event_entry.v0.1
confirmed_event_key: sha-256:<resource/compartment/event kind/provider event/component>
economic_resource_key: sha-256:<hex>
compartment_control_key: sha-256:<hex>
event_kind: confirmed_debit | confirmed_refund | confirmed_reversal
receiver_event_import_ref: <ReceiverEventImportCore ObjectRef>
receiver_event_import_hash: sha-256:<hex>
obligation_exposure_id: sha-256:<hex>
component_ids_root: sha-256:<exact set>
amount: <checked Money>
accounting_policy_ref: <ObjectRef>
accounting_policy_hash: sha-256:<hex>
event_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

`component_ids_root` is not a caller-supplied summary. It is the RFC 8785/JCS
SHA-256 hash of this exact domain-separated preimage, with duplicate component
IDs removed and the remaining strings sorted lexicographically:

```yaml
schema: cairn.confirmed_economic_event_component_set_preimage.v0.1
component_ids: [<sorted unique exact component IDs>]
```

For a confirmed debit, refund, or reversal transition, the authority groups the
exact economic-atom deltas entering that confirmed class by
`obligation_or_reservation_id`. Each group requires exactly one newly inserted
event with the same obligation, this exact component root, the state accounting
asset, and the checked overflow-safe sum of the group amounts. Extra events,
missing events, reused events, or mismatched obligations, components, assets, or
amounts deny the transition.

```yaml
schema: cairn.authority_limit_ledger_event_entry.v0.1
ledger_event_key: sha-256:<ledger/cause/atom-or-action/fence>
ledger_key: sha-256:<same ledger>
event_kind: reservation_added | reservation_released | authority_consumed |
            confirmed_debit | confirmed_refund | active_reversal |
            confirmed_reversal | quarantine_hold | remediation
action_ref: <ObjectRef or null for non-action remediation>
effect_id: sha-256:<hex or null>
economic_atom_ref: <cairn.current_economic_atom.v0.1 ObjectRef or null for count-only event>
economic_atom_hash: sha-256:<hex or null>
count_delta: <checked integer>
money_delta: <checked Money or null for count-only event>
economic_mutation_cause_core_ref: <cairn.economic_mutation_cause_core.v0.1 ObjectRef>
economic_mutation_cause_core_hash: sha-256:<hex>
event_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Long-lived current and historical sets use a content-addressed enumerable map,
not the transaction-sized transition manifest:

```yaml
schema: cairn.enumerable_map_node.v0.1
map_domain: <closed consumer/domain string>
node_kind: empty | leaf | branch
path_prefix_nibbles: <canonical lowercase 0..64-nibble prefix>
leaf_entry: <null unless leaf>
  entry_key: sha-256:<full 256-bit key>
  entry_kind: trust_index | receiver_identity | reservation_assignment |
              index_epoch_state |
              current_reservation | economic_atom | confirmed_event | ledger_event |
              integrity_inventory | integrity_incident | integrity_incident_resolution |
              connection_outstanding_action |
              receiver_outstanding_stream | scoped_control_leaf | lifecycle_transition | broker_instance |
              receiver_sequence_epoch_scope |
              credential_alias | historical_incident_compartment |
              integrity_verification_result |
              closure_snapshot_entry | closure_work_item | closure_result |
              closure_snapshot_partition_receipt | closure_partition_receipt |
              future_dependency_assignment
  entry_object_ref: <kind-matching immutable/current-head ObjectRef>
  entry_object_hash: sha-256:<hex>
branch_children: # null unless branch; sorted unique nibble, at most 16
  - nibble: <0..f>
    child_path_prefix_nibbles: <canonical child prefix beginning with parent prefix+nibble>
    child_node_ref: <content-addressed ObjectRef>
    child_node_hash: sha-256:<hex>
    child_subtree_entry_count: <positive checked uint64>
    child_entries_root: sha-256:<hex>
subtree_entry_count: <checked uint64>
entries_root: sha-256:<canonical subtree commitment>
node_hash: sha-256:<hex>
```

```yaml
schema: cairn.enumerable_map_root.v0.1
map_key: sha-256:<owner stable key and map domain>
map_domain: <same closed consumer/domain>
revision: <monotonic integer; advances iff entries change>
root_node_ref: <enumerable_map_node ObjectRef>
root_node_hash: sha-256:<hex>
entry_count: <checked uint64 equal to root subtree count>
entries_root: sha-256:<canonical key/ref/hash set commitment>
map_hash: sha-256:<hex>
issuing_authority_id: <branch-exact authority>
issuing_authority_signature: <Signature>
```

The map is a canonical 16-way radix Merkle trie over the 64 nibbles of the full
entry key. Empty, leaf, and branch nullability; path compression; child ordering;
subtree counts; and hash preimages are frozen by the execution bundle. Every
branch has at most 16 children and every update rewrites only one bounded path.
`execution.enumerable_map.get` returns the exact root or node named by ref/hash.
`execution.enumerable_map.scan` performs deterministic depth-first enumeration
in pages of at most 128 entries; its continuation binds root hash, next trie
cursor, ACL, and expiry. A complete scan ends only at the canonical end cursor.
Thus the root is enumerable after restart without imposing a lifetime entry cap.
The owning state transition signs the new root; there is no generic map mutation
operation and an auxiliary database index has no authority.

The execution overlay admits exactly two enumerable-map domains:
`connection_outstanding_action` and `receiver_outstanding_stream`. A leaf must
resolve its exact content-addressed entry object, bind `entry_key` to the
entry's independently derived key, match the domain's one admitted schema/kind,
and pass that entry's full semantic validator. Missing objects deny. The empty
root is `SHA-256(JCS({schema:cairn.enumerable_map_empty_entries_preimage.v0.1,
map_domain}))`. A leaf root commits domain, key, kind, and exact object ref/hash.
A branch root commits domain, its compressed prefix, summed count, and the
sorted unique child tuple `(nibble, child prefix, child node hash, child count,
child entries root)`. An opened child must exactly equal its committed summary.

A path proof is a closed tuple of claim, exact map-root ref/hash, entry key,
ordered ancestor refs, terminal-node ref/hash, and a cause-specific absence kind.
Membership ends at the exact matching leaf. Nonmembership ends only at the
canonical empty root, a different leaf key, a compressed-prefix mismatch, or a
missing child. Update receipts compare the before/after proof frontiers and
require every sibling commitment outside the named path to remain identical.

The `entry_kind` registry is closed. Each row fixes the entry-key preimage,
admitted object schema, owning map domain, and only signing authority; a generic
ObjectRef with no matching row is invalid:

| Entry kind | Entry key preimage | Exact admitted schema/family | Map domain / owner |
|---|---|---|---|
| `trust_index` | dependency, epoch, index kind | `TrustDependencyIndexManifest` | epoch manifest-set / authority service |
| `receiver_identity` | identity scope, epoch, index kind | `ReceiverEventIdentityIndexManifest` | epoch manifest-set / authority service |
| `reservation_assignment` | directory, epoch, action, slot kind | `BoundedIndexSlotAssignment` | epoch assignment / authority service |
| `index_epoch_state` | directory, epoch | `BoundedIndexEpochStateHead` | live-epoch directory / authority service |
| `current_reservation` | compartment, reservation, fence | `CurrentReservationIndexEntry` | compartment current reservations / authority service |
| `economic_atom` | resource, compartment, atom ID | `CurrentEconomicAtom` | compartment/resource current atoms / authority service |
| `confirmed_event` | resource, compartment, event kind, receiver event | `ConfirmedEconomicEventEntry` | compartment confirmed events / authority service |
| `ledger_event` | ledger, cause, atom-or-action, fence | `AuthorityLimitLedgerEventEntry` | authority-ledger events / authority service |
| `integrity_inventory` | inventory kind, stable key | `ExecutionIntegrityInventoryEntry` | integrity inventory / authority service |
| `integrity_incident` | typed incident ID | `ExecutionIntegrityIncident` | pending incidents / authority service |
| `integrity_incident_resolution` | incident ID | `IntegrityIncidentResolutionEntry` | stopped recovery resolution / authority service |
| `integrity_verification_result` | inventory key or incident locus | `IntegrityVerificationResult` | stopped recovery verification / authority service |
| `connection_outstanding_action` | connection, action, effect, lineage | `ConnectionOutstandingActionEntry` | connection current actions / authority service |
| `receiver_outstanding_stream` | stable epoch selector, action, effect, lineage, client ref | `ReceiverOutstandingStreamEntry` | cross-provider-epoch receiver-scope current streams / authority service |
| `receiver_sequence_epoch_scope` | selector, provider epoch generation | `ReceiverEventIdentityIndexStateHead` | receiver sequence-epoch selector / authority service |
| `scoped_control_leaf` | namespace generation, scope, target | `ScopedExecutionControlLeafStateHead` | principal control / authority service |
| `lifecycle_transition` | lifecycle family/key, sequence | branch-exact lifecycle transition receipt | lifecycle history / branch lifecycle authority |
| `broker_instance` | broker authority, instance key | `ExecutorCredentialInstanceStateHead` | broker instance epoch / broker or coordinator branch |
| `credential_alias` | instance key, binding key | `ExecutorCredentialBindingHead` | credential alias epoch / broker or coordinator branch |
| `commerce_nonterminal_inventory` | commerce authority, entry kind, reservation-or-copy stable key | `CommerceNonterminalInventoryEntry` | authoritative commerce drain snapshot / commerce authority plus registry |
| `historical_incident_compartment` | resource, compartment, incident | frozen `CompartmentStateHead` | resource incident overlay / trust coordinator |
| `closure_snapshot_entry` | closure, source family, stable key | `TrustClosureSnapshotEntry` | frozen closure snapshot / trust coordinator |
| `closure_snapshot_partition_receipt` | closure, snapshot partition sequence | `TrustClosureSnapshotPartitionReceipt` | stopped snapshot construction / trust coordinator |
| `closure_work_item` | closure, work-item key | `TrustClosureWorkItem` | closure frontier / trust coordinator |
| `closure_result` | closure, work-item key | `TrustClosureResultEntry` | closure accumulated results / trust coordinator |
| `closure_partition_receipt` | closure, partition sequence | `TrustClosurePartitionReceipt` | closure receipt history / trust coordinator |
| `future_dependency_assignment` | pool, action, effect, lineage | `FutureDependencyAssignment` | future-dependency pool / authority service |

The machine bundle MUST translate every capitalized family above to its exact
`cairn.*.v0.1` schema ID and freeze the key grammar as domain-separated JCS. The
map domain rejects all other entry kinds even if their schemas are individually
valid. Getters return the typed object under its family ACL; map scan never
weakens that ACL or reveals a private entry to an unauthorized caller.

The execution release pins this exact bounds profile. Every constructor or
registration rejects before it would exceed any leaf, vector, or nested fan-out
bound; an implementation may choose lower limits only by freezing a new profile
and release. Every inline array inherits
`max_entries_per_inline_array` and every object inherits the total-array-entry,
property, depth, canonical-string/ref, canonical-object, and request-byte limits
unless a smaller named branch cap appears. Nested arrays count both their own
members and every descendant member against the total. Strict parsing enforces
byte/depth/string/container limits before allocation or canonicalization; binary
evidence larger than the object limit must be content-addressed by ref/hash and
is never embedded. The dependency and receiver-identity entry limits are **per epoch**,
not lifetime caps. Rollover is required before accepting new work that cannot fit
while every in-flight reservation remains assigned to its draining epoch.
Conformance computes and publishes the composed worst-case write count from all
applicable nested maxima at admission. A closure that exceeds one transaction
uses the fail-stopped partition protocol below; it never rejects an already
authenticated reserved event merely because historical indexes grew. No manifest
hash is treated as enumerable by magic: every complete vector uses the signed
manifest above and `execution.transition_manifest.get` after restart.

Execution releases and policies have signed lifecycle, separate from immutable
content hashes:

```yaml
schema: cairn.execution_release_state_head.v0.1
profile_id: cairn-supervised-execution-v0.1
execution_bundle_hash: sha-256:<hex>
operation_registry_hash: sha-256:<hex>
execution_resource_bounds_profile_ref: <immutable ObjectRef>
execution_resource_bounds_profile_hash: sha-256:<hex>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: active | retired | emergency_revoked | quarantined
effective_at: <authority-service time>
transition_reason: import_genesis | scheduled_retirement | suspected_compromise |
                   confirmed_compromise | release_invalidated | administrative_hold
state_hash: sha-256:<hex>
signer_kind: release_authority | trust_coordinator
release_authority_signature: <Signature or null unless genesis/ordinary lifecycle>
trust_coordinator_signature: <Signature or null unless compromise quarantine>
```

```yaml
schema: cairn.policy_lifecycle_head.v0.1
policy_kind: accounting | finality | review | taint | receiver_channel |
             confirmation_assurance | confirmation_verifier |
             adapter_identity | protection_attestation |
             receiver_scope_selection_issuer
policy_ref: <matching immutable ObjectRef>
policy_hash: sha-256:<hex>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: active | retired | emergency_revoked | quarantined
valid_from: <time>
valid_until: <time or null>
transition_reason: issued | scheduled_retirement | suspected_compromise |
                   confirmed_compromise | policy_invalidated | administrative_hold
state_hash: sha-256:<hex>
signer_kind: policy_authority | trust_coordinator
policy_authority_signature: <Signature or null unless genesis/ordinary lifecycle>
trust_coordinator_signature: <Signature or null unless compromise quarantine>
```

```yaml
schema: cairn.policy_import_receipt.v0.1
policy_kind: accounting | finality | review | taint | receiver_channel |
             confirmation_assurance | confirmation_verifier |
             adapter_identity | protection_attestation |
             receiver_scope_selection_issuer
policy_ref: <immutable ObjectRef>
policy_hash: sha-256:<hex>
lifecycle_genesis_head_ref: <active ObjectRef>
lifecycle_genesis_head_hash: sha-256:<hex>
genesis_transition_history_head_ref: <empty lifecycle_transition_history_state_head ObjectRef>
genesis_transition_history_head_hash: sha-256:<hex>
policy_authority_id: <allowlisted authority>
registry_transaction_id: <one immutable-policy/lifecycle-genesis transaction>
imported_at: <authority-service time>
receipt_hash: sha-256:<hex>
policy_authority_signature: <Signature>
```

```yaml
schema: cairn.release_or_policy_lifecycle_transition_receipt.v0.1
lifecycle_family: execution_release | policy
stable_lifecycle_key: sha-256:<release profile/bundle/registry or policy identity>
policy_kind: <closed policy kind or null for execution release>
immutable_object_ref: <execution release or policy ObjectRef>
immutable_object_hash: sha-256:<hex>
before_head_ref: <ObjectRef>
before_head_hash: sha-256:<hex>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
before_sequence: <integer>
after_sequence: <before + 1>
before_state: active | retired
after_state: retired | emergency_revoked | quarantined
cause: scheduled_retirement | suspected_compromise | confirmed_compromise |
       object_invalidated | administrative_hold
cause_evidence_ref: <authenticated ObjectRef>
cause_evidence_hash: sha-256:<hex>
trust_quarantine_receipt_ref: <ObjectRef or null unless compromise>
trust_quarantine_receipt_hash: sha-256:<hex or null>
transition_history_before_head_ref: <exact current lifecycle_transition_history_state_head ObjectRef>
transition_history_before_head_hash: sha-256:<hex>
transition_history_next_state_commitment_hash: sha-256:<self-excluding successor/map-add tuple>
effective_at: <authority-service time>
authority_transaction_id: <one lifecycle/trust CAS>
receipt_hash: sha-256:<hex>
signer_kind: policy_or_release_authority | trust_coordinator
policy_or_release_authority_signature: <Signature or null unless ordinary lifecycle>
trust_coordinator_signature: <Signature or null unless compromise quarantine>
```

Every non-genesis execution-release or policy-lifecycle successor emits this
receipt. Scheduled retirement and administrative ordinary changes are lifecycle-
authority-only. Suspected/confirmed compromise and resulting quarantine are
trust-coordinator-only and commit inside `execution.trust_compromise.commit`;
the potentially compromised authority is neither required nor permitted to sign
that branch. The head, transition receipt, and history successor use the same
cause-closed signer kind. Historical acceptance chains use
these receipts for releases/policies and the source-specific receipt for source
credentials. A head without its branch-exact receipt or a receipt whose cause,
state, sequence, effective time, or immutable object differs is nonconforming.

```yaml
schema: cairn.execution_integrity_inventory_entry.v0.1
entry_kind: trust_dependency | receiver_event_identity_scope |
            receiver_sequence_epoch_selector |
            economic_resource_compartment_membership
dependency_kind: <closed kind or null unless trust dependency>
inventory_stable_key: sha-256:<dependency, identity-scope, or resource-exposure key>
inventory_core_ref: <canonical dependency core, identity scope, or resource ObjectRef>
inventory_core_hash: sha-256:<hex>
entry_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.execution_integrity_inventory_manifest.v0.1
profile_id: cairn-supervised-execution-v0.1
execution_bundle_hash: sha-256:<hex>
sequence: <same integrity-head sequence>
inventory_map_ref: <enumerable_map_root ObjectRef with integrity_inventory entries>
inventory_map_hash: sha-256:<hex>
entry_count: <checked uint64 equal to map>
entries_root: sha-256:<must equal map entries_root>
manifest_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.execution_integrity_incident.v0.1
incident_id: sha-256:<domain-separated typed incident preimage>
incident_kind: trust_dependency_compromise | receiver_identity_equivocation |
               storage_integrity_failure | unreserved_authenticated_receiver_event
detected_under_integrity_head_ref: <current healthy or fail_stopped ObjectRef>
detected_under_integrity_head_hash: sha-256:<hex>
trust_dependency_stable_key: sha-256:<hex or null unless compromise>
restrictive_dependency_evidence_ref: <ObjectRef or null unless compromise>
restrictive_dependency_evidence_hash: sha-256:<hex or null>
incoming_receiver_event_identity_binding_core_ref: <ObjectRef or null unless equivocation>
incoming_receiver_event_identity_binding_core_hash: sha-256:<hex or null>
direct_receiver_identity_collision_seeds: # empty unless equivocation; at most two
  - identity_scope_index_key: sha-256:<direct incoming event-ID or sequence scope>
    collided_identity_key: sha-256:<event-ID or provider-sequence key>
    existing_binding_core_ref: <directly collided ObjectRef>
    existing_binding_core_hash: sha-256:<hex>
direct_collision_seed_count: <0 or 1..2; nonzero iff equivocation>
direct_collision_seeds_root: sha-256:<canonical exact direct set or empty>
unreserved_receiver_event_import_ref: <ObjectRef or null unless unreserved event>
unreserved_receiver_event_import_hash: sha-256:<hex or null>
unreserved_identity_scope_index_key: sha-256:<hex or null>
required_emergency_event_slots: <positive integer or null>
unresolved_storage_loci_root: sha-256:<missing/corrupt refs needed for closure, or empty>
required_resolution_receipt_kinds: [<closed nonempty set drawn from
  trust_quarantine_receipt, receiver_event_equivocation_receipt,
  trust_closure_completion_receipt, integrity_repair_audit_receipt,
  unreserved_receiver_event_recovery_receipt>]
failure_evidence_commitment: sha-256:<hex>
incident_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.execution_integrity_incident_manifest.v0.1
profile_id: cairn-supervised-execution-v0.1
sequence: <same integrity-head sequence>
incident_map_ref: <enumerable_map_root ObjectRef with integrity_incident entries>
incident_map_hash: sha-256:<hex>
incident_count: <checked uint64 equal to map>
incidents_root: sha-256:<must equal map entries_root>
manifest_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.execution_integrity_state_head.v0.1
profile_id: cairn-supervised-execution-v0.1
execution_bundle_hash: sha-256:<hex>
operation_registry_hash: sha-256:<hex>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: healthy | fail_stopped
dependency_inventory_manifest_ref: <content-addressed ObjectRef>
dependency_inventory_manifest_hash: sha-256:<hex>
dependency_inventory_root: sha-256:<hex>
dependency_inventory_count: <nonnegative integer>
failure_reason: none | trust_closure_unavailable | manifest_mismatch |
                receiver_identity_closure_unavailable |
                referenced_content_unavailable | integrity_audit_failed |
                unreserved_authenticated_receiver_event
failure_evidence_commitment: sha-256:<hex or null when healthy>
pending_incident_manifest_ref: <content-addressed ObjectRef>
pending_incident_manifest_hash: sha-256:<hex>
pending_incident_root: sha-256:<hex>
pending_incident_count: <checked uint64>
updated_at: <authority-service time>
head_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The integrity head is itself a closed union. `healthy` requires
`failure_reason:none`, a null failure commitment, and an empty signed incident
manifest. `fail_stopped` requires a nonempty manifest. Trust and receiver-
equivocation incidents require their branch-specific fields. A receiver incident
records the exact incoming authenticated binding core ref/hash plus only the one
or two identity keys directly collided by that incoming event and their already-
bound cores as durable **seeds**, not a recursive or falsely complete closure
vector. Counterpart keys, additional scopes, and every recursively reachable core
are discovered only by the stopped fixed-point closure; its
unresolved-storage root names every then-known missing/corrupt locus. A pure
storage incident requires the direct seed set empty and commits the exact
missing/corrupt inventory, head, manifest, or referenced-object locus. Every
unused branch field is null/empty. An unreserved-event incident requires the raw
import ref/hash, scope key, positive emergency slot count, and the
`unreserved_receiver_event_recovery_receipt` member in its required-resolution
kind set (plus repair audit when storage is also broken). The receipt itself is
created only by the later recovery transaction; it is never falsely present at
incident creation.
Resolution requirements are a set, not a
single discriminator: a bounded-direct incident requires its semantic trust or
equivocation receipt, while a partitioned incident requires the one
TrustClosureCompletionReceipt whose result map resolves all partition-scoped
semantic receipts. Those branches are mutually exclusive. Any incident with a
nonempty unresolved-storage root additionally requires
the IntegrityRepairAuditReceipt. “Pure storage” requires only that audit receipt.

```yaml
schema: cairn.integrity_repair_audit_receipt.v0.1
fail_stopped_integrity_head_ref: <current ObjectRef>
fail_stopped_integrity_head_hash: sha-256:<hex>
resolved_storage_loci_incident_map_ref: <enumerable_map_root ObjectRef>
resolved_storage_loci_incident_map_hash: sha-256:<every incident with nonempty unresolved-storage root>
verification_result_map_ref: <enumerable_map_root ObjectRef>
verification_result_map_hash: sha-256:<exact inventory-key-complete result set>
verification_result_count: <must equal current inventory entry count plus
                             explicitly restored non-inventory loci>
dependency_inventory_manifest_ref: <current signed ObjectRef>
dependency_inventory_manifest_hash: sha-256:<hex>
inventory_to_verification_keyset_equality_proof_hash: sha-256:<complete exact equality>
verification_scan_completion_proof_hash: sha-256:<canonical end cursors over both maps>
audit_completed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.integrity_verification_result.v0.1
verification_key: sha-256:<inventory key or explicit missing/corrupt locus>
inventory_entry_ref: <ObjectRef or null only for explicit non-inventory locus>
inventory_entry_hash: sha-256:<hex or null>
verification_kind: verified_present | restored_exact_bytes
verified_object_refs_and_hashes_root: sha-256:<complete reachable signed object set>
resolved_incident_ids_root: sha-256:<all incidents naming this locus or empty>
verified_under_fail_stopped_head_ref: <same current fail-stopped ObjectRef>
verified_under_fail_stopped_head_hash: sha-256:<hex>
result_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Verification may be computed in deterministic pages while execution remains
globally stopped. The final audit receipt is valid only when the inventory and
verification map keysets are exactly equal apart from explicitly incident-named
non-inventory loci, both scans prove their canonical end cursors, every restored
object is byte-identical to its authenticated hash, and every storage incident
is covered. A root without the maps, a partial scan, or a caller-supplied list is
not recovery evidence.

```yaml
schema: cairn.unreserved_receiver_event_recovery_receipt.v0.1
incident_id: sha-256:<matching unreserved-event incident>
receiver_event_import_ref: <retained authenticated ObjectRef>
receiver_event_import_hash: sha-256:<hex>
fail_stopped_integrity_head_ref: <current ObjectRef>
fail_stopped_integrity_head_hash: sha-256:<hex>
emergency_identity_epoch_transition_receipt_ref: <ObjectRef>
emergency_identity_epoch_transition_receipt_hash: sha-256:<hex>
emergency_trust_epoch_transition_receipts_root: sha-256:<complete dependency set>
receiver_identity_binding_receipt_ref: <ObjectRef>
receiver_identity_binding_receipt_hash: sha-256:<hex>
trust_registration_receipt_ref: <ObjectRef>
trust_registration_receipt_hash: sha-256:<hex>
receiver_stream_transition_receipt_ref: <ObjectRef>
receiver_stream_transition_receipt_hash: sha-256:<hex>
economic_transition_receipts_root: sha-256:<complete set or canonical empty>
resulting_receiver_state: <profile-classified state>
resulting_trust_state: accepted | quarantined
resulting_exposure_disposition: no_delta | conservative_delta_committed
authority_transaction_id: <bounded recovery transaction or closure plan id>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
trust_coordinator_signature: <Signature>
```

An unreserved authenticated event is never treated as an ordinary capacity
error. Its raw import is durably stored first, then the same transaction installs
the fail-stop incident and fences the affected stream/economic roots. Recovery
creates emergency accepting epochs while globally stopped, registers the exact
identity and complete trust set, applies all receiver/economic consequences, and
emits the receipt above. Health can return only after that receipt is in the
incident's resolution set. If the event exceeds the finality profile's legal
state machine it remains authenticated evidence but produces quarantined trust,
never silent omission or optimistic release.

```yaml
schema: cairn.integrity_incident_resolution_entry.v0.1
incident_id: sha-256:<same pending incident key>
incident_ref: <ExecutionIntegrityIncident ObjectRef>
incident_hash: sha-256:<hex>
required_resolution_receipt_kinds_root: sha-256:<exact incident set>
resolution_receipts: # exact set, at most max_integrity_resolution_receipts_per_incident
  - receipt_kind: trust_quarantine_receipt | receiver_event_equivocation_receipt |
                  integrity_repair_audit_receipt |
                  unreserved_receiver_event_recovery_receipt |
                  trust_closure_completion_receipt
    receipt_ref: <kind-matching ObjectRef>
    receipt_hash: sha-256:<hex>
disposition: resolved_restrictive | resolved_and_health_eligible
entry_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.execution_integrity_transition_receipt.v0.1
before_head_ref: <ObjectRef or null for insert-only genesis>
before_head_hash: sha-256:<hex or null>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
cause: profile_genesis | dependency_identity_or_resource_scope_added |
       integrity_incident_recorded | exact_storage_repair_verified_and_incidents_resolved
dependency_inventory_before_manifest_ref: <ObjectRef or null for genesis>
dependency_inventory_before_manifest_hash: sha-256:<hex or null>
dependency_inventory_after_manifest_ref: <ObjectRef>
dependency_inventory_after_manifest_hash: sha-256:<hex>
integrity_audit_receipt_ref: <ObjectRef or null unless resume>
pending_incident_before_manifest_ref: <ObjectRef or null for genesis>
pending_incident_before_manifest_hash: sha-256:<hex or null>
pending_incident_after_manifest_ref: <ObjectRef>
pending_incident_after_manifest_hash: sha-256:<hex>
completed_incident_resolution_map_ref: <enumerable_map_root ObjectRef or null unless resume>
completed_incident_resolution_map_hash: sha-256:<hex or null>
completed_incident_resolution_count: <must equal before incident count; null unless resume>
before_incident_to_resolution_keyset_equality_proof_hash: sha-256:<exact equality or null>
incident_and_resolution_scan_completion_proof_hash: sha-256:<canonical end cursors or null>
authority_transaction_id: <one integrity/dependency/coordinator CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

`execution.integrity_state.import` creates one healthy generation-0 head and
empty dependency-inventory and pending-incident manifests before any dependency
is admitted. Trust-dependency, receiver-sequence-epoch-selector, receiver-event-
identity-scope, or economic-
resource exposure/membership genesis atomically adds its stable key to a new immutable
inventory manifest and advances the healthy integrity head; ordinary dependency
registrations, credential rotations, and event bindings do not change the
inventory because keys are stable across generations/events. The authority-internal
`execution.integrity_state.transition` is the sole successor writer.

The resume branch's resolution map uses one
`IntegrityIncidentResolutionEntry` per incident ID. Its keys equal the complete
before-incident map exactly, each entry's typed receipt kinds cover the incident's
required set exactly, and both maps are scanned to canonical end cursors. The
after-incident map may become empty only in the same transaction. A root without
the map/ref/count, an entry under another incident key, an untyped receipt, or a
partial scan cannot restore health.

Every execution-overlay private read, review, confirmation, mutation, provider-
event classification, reservation, gate, redemption, handoff, and current-trust
presentation binds and CAS-rechecks the one current **healthy** integrity head.
Public capabilities may remain available only to report `fail_stopped`. When a
compromise coordinator cannot resolve any required head/manifest/ref/count/root,
it atomically wins either before an effect CAS or after that already committed
effect and transitions the integrity head to `fail_stopped`, recording the
typed incident object in the new signed enumerable incident manifest; the
competing operation's healthy-head CAS then fails. A trust incident records its
stable dependency key and restrictive evidence. A receiver-identity incident
records the authenticated incoming core, the at-most-two direct collision seeds,
and unresolved storage loci. Recursive counterpart/scope discovery belongs only
to the stopped closure walk.
An opaque evidence hash or external queue never substitutes for that object.
No process-local flag or unsigned database state has authority.
While already `fail_stopped`, an audit or repair attempt may discover another
typed incident. The sole writer permits `fail_stopped → fail_stopped` only to add
that immutable incident to the signed manifest; it may never remove an incident,
change evidence, or expose execution. Incident discovery is monotonic until the
one all-incidents recovery transaction.

Resume occurs only after exact-byte storage repair: an authority
audit enumerates every stable dependency key from the signed inventory, resolves
each current TrustDependencyStateHead and all three signed manifests/commitments,
and every current ReceiverEventIdentityIndexStateHead with both signed manifests,
and every current EconomicResourceExposureStateHead with its complete signed
compartment-membership and resource-atom manifests, every member compartment's
reservation/atom/confirmed-event manifests, and every referenced limit-ledger
current-event manifest,
then proves exact counts/roots. Each pending typed incident is completed either
in one bounded transaction or through its signed closure partitions. Only the
final transaction verifies every completed incident before `fail_stopped → healthy`:
each compromise produces its
complete TrustQuarantineReceipt and each identity incident its complete
ReceiverEventEquivocationReceipt; every incident with unresolved storage loci,
including a combined semantic incident, is also named by the exact
IntegrityRepairAuditReceipt proving byte-identical restoration. The transition
recomputes receiver-identity fixed-point closure from the durable seed after
storage repair; completeness is required on the equivocation receipt, not at
detection. The transition
receipt binds the before/after
incident manifests and canonical complete resolution-receipt set; the healthy
successor requires an empty pending manifest. A missing dependency, partial
audit, unresolved or uncommitted incident, wrong receipt kind, stale inventory
head, or independent resume denies.

New preparation/gate/redemption requires an active release and active policies.
Late receiver events are classified with the exact immutable profile that was
valid at submission. `retired` permits historical verification only when the
exact authenticated event digest, source credential, account/stream scope, and
sequence were independently transparency-anchored by Cairn before retirement,
or when a new currently active independent profile revalidates the assertion.
Receiver timestamps and newly presented signatures are not retrospective proof;
unanchored late evidence under a retired profile denies. The typed historical-
acceptance evidence and TrustDependencyRegistrationReceipt bind the anchor or
revalidation branch, complete lifecycle transition chain, and credential-status
head used.

`emergency_revoked` or `quarantined` forbids a new finality assertion and makes
every dependent assertion effectively quarantined through the current lifecycle
head, including assertions previously classified as final. The lifecycle service
resolves every authoritative current TrustDependencyStateHead. The
authority-internal `execution.trust_compromise.commit` is one serializable
transaction: it CASes the restrictive lifecycle/identity successor, freezes every
affected economic root against **all** new reservation, redemption, and handoff
branches (delegated or principal-direct), advances dependent trust heads, moves
each released/reversal atom into the exact conservative quarantine hold without
duplication, updates obligation, compartment, and economic-resource exposure
heads plus every exact principal, originating-mandate, and compartment monetary
ledger whose capacity changed through the now-compromised release/refund, and emits
the remediation receipt before any part becomes externally visible. A frozen
quarantine head may exceed the ordinary outstanding limit when previously
released capacity has already been reused; its new-hold capacity is zero. This is
an explicit conservative state, not a valid active budget. Cancellation and
reconciliation remain available but cannot optimistically release exposure;
strictly newer authenticated outcomes may reclassify or release exact quarantine
atoms through a typed `frozen → frozen` remediation receipt. If a dependency or
amount cannot yet be proved, the same transaction installs
`remediation_state:incomplete_frozen` and records the unresolved commitment; it
never exposes interim capacity or treats the old assertion as final. Later
authenticated evidence may resolve commitments and update quarantine atoms under
the same sole writer. Resume requires an empty unresolved root, zero quarantine
exposure in the compartment, economic-resource head, and every affected
aggregate/window/lifetime/outstanding ledger, complete dependency closure,
exposure back within the immutable limit,
and fresh principal
control, never reactivation of the compromised policy. Already transmitted
external effects are not claimed undone.

```yaml
schema: cairn.receiver_assertion_trust_state_head.v0.1
action_ref: <ObjectRef>
effect_id: sha-256:<hex>
lineage_id: sha-256:<hex>
receiver_event_import_ref: <ObjectRef>
receiver_event_import_hash: sha-256:<hex>
finality_profile_ref: <ObjectRef>
finality_profile_hash: sha-256:<hex>
policy_lifecycle_head_ref: <current signed ObjectRef>
historical_acceptance_evidence_ref: <ObjectRef or null when current-policy accepted>
historical_acceptance_evidence_hash: sha-256:<hex or null>
source_credential_authority_key: sha-256:<stable event-source authority>
source_credential_status_head_ref: <exact generation ObjectRef>
source_credential_status_head_hash: sha-256:<hex>
source_credential_generation: <integer>
trust_dependencies:
  - kind: finality_policy | accounting_policy | review_policy | taint_policy |
          receiver_scope_selection_issuer | source_credential |
          receiver_sequence_epoch_selector |
          credential_broker_authority | executor_credential_binding |
          receiver_channel_policy | confirmation_assurance_policy |
          confirmation_verifier | adapter_identity | provider_account_identity | provider_sublimit_identity |
          compartment_protection_attestation | cancellation_fee_source |
          seller_inventory_authority | copy_ownership_registry_authority |
          execution_release
    dependency_ref: <canonical ObjectRef>
    dependency_hash: sha-256:<hex>
    dependency_stable_key: sha-256:<immutable dependency identity>
    lifecycle_head_ref: <current signed ObjectRef>
    eligibility_overlay_head_ref: <ProviderIdentityTrustOverlayStateHead ObjectRef
                                   for provider identity kinds; null otherwise>
    eligibility_overlay_head_hash: sha-256:<hex or null>
    dependency_state_head_ref: <current signed ObjectRef>
    registration_fence: <integer>
assertion_registration_key: sha-256:<precomputable independent assertion key>
trust_dependency_registration_receipt_ref: <ObjectRef>
trust_dependency_registration_receipt_hash: sha-256:<hex>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: accepted | quarantined
reason: accepted_current_policy | accepted_pre_retirement_anchor |
        accepted_independent_policy_revalidation |
        accepted_independent_source_reauthentication |
        policy_emergency_revoked | policy_quarantined |
        accounting_policy_compromised | source_credential_compromised |
        review_policy_compromised | taint_policy_compromised |
        receiver_scope_selection_issuer_compromised |
        receiver_sequence_epoch_selector_compromised |
        credential_broker_authority_compromised |
        executor_credential_binding_compromised |
        cancellation_fee_source_compromised |
        seller_inventory_authority_compromised |
        copy_ownership_registry_authority_compromised |
        receiver_channel_policy_compromised |
        confirmation_assurance_compromised | confirmation_verifier_compromised |
        adapter_identity_compromised | provider_account_quarantined |
        provider_sublimit_invalidated |
        protection_attestation_compromised |
        execution_release_compromised |
        dependency_incomplete
quarantine_receipt_ref: <ObjectRef or null when accepted; required when quarantined>
quarantine_receipt_hash: sha-256:<hex or null when accepted>
economic_exposure_disposition: none_economic_dependency | remediation_committed | null when accepted
exposure_remediation_receipt_ref: <ObjectRef or null; required only for remediation_committed>
remediation_transaction_id: <same quarantine transaction id or null when accepted>
next_trust_state_commitment_hash: sha-256:<same self-excluding receipt commitment
                                          or null when accepted>
updated_at: <authority-service time>
state_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The `trust_dependencies` array is complete-set equal to the dependency commits in
the registration receipt and in-flight commitment after canonical deduplication.
The three sets may not disagree by kind, stable key, bound lifecycle head, or
generation. This equality is checked before an assertion head can be accepted or
quarantined.
Each compromise reason is exclusive to a matching
`trust_dependencies.kind`, stable dependency key, restrictive lifecycle
transition, and TrustQuarantineReceipt trigger. In particular, the two commerce-
signer reasons require respectively `seller_inventory_authority` or
`copy_ownership_registry_authority`; `dependency_incomplete` cannot stand in for
a known signer compromise.

```yaml
schema: cairn.trust_quarantine_receipt.v0.1
receipt_mode: direct_bounded | closure_partition
closure_id: sha-256:<hex or null for direct_bounded>
closure_plan_core_ref: <ObjectRef or null for direct_bounded>
closure_plan_core_hash: sha-256:<hex or null>
closure_partition_sequence: <integer or null for direct_bounded>
processed_work_item_keys_root: sha-256:<exact partition subset or canonical empty>
source_snapshot_ref: <ObjectRef or null for direct_bounded>
source_snapshot_hash: sha-256:<hex or null>
trigger_dependency_kind: <closed dependency kind>
trigger_before_head_ref: <ObjectRef>
trigger_before_head_hash: sha-256:<hex>
trigger_restrictive_successor_head_ref: <ObjectRef>
trigger_restrictive_successor_head_hash: sha-256:<hex>
assertion_dispositions: # complete set in direct mode; exact processed subset in partition mode
  - assertion_registration_key: sha-256:<hex>
    disposition: transitioned_to_quarantined | already_quarantined
    current_trust_head_ref: <accepted or quarantined ObjectRef matching disposition>
    current_trust_head_hash: sha-256:<hex>
    next_trust_state_commitment_hash: sha-256:<required only when transitioned>
    existing_quarantine_receipt_ref: <ObjectRef or null unless already quarantined>
    existing_economic_remediation_disposition: <bound prior disposition or null unless already>
    released_exposure_present: true | false  # true whenever new economic remediation is required
inflight_dispositions: # complete set in direct mode; exact processed subset in partition mode
  - inflight_execution_key: sha-256:<hex>
    commitment_ref: <ObjectRef>
    commitment_hash: sha-256:<hex>
    disposition: financial_unredeemed_cancelled_and_root_frozen |
                 financial_handed_off_exposure_held_and_root_frozen |
                 no_economic_unredeemed_cancelled |
                 no_economic_handed_off_preserved_and_blocked |
                 already_restricted
    economic_root_transition_commitment_root: sha-256:<exact roots/actions/holds;
                                                        empty for no-economic>
exposure_remediation_receipt_ref: <ObjectRef or null only when no assertion or in-flight entry needs economic transition>
exposure_remediation_receipt_hash: sha-256:<hex or null>
authority_transaction_id: <one restrictive-lifecycle/trust/optional-exposure CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Every accepted→quarantined trust transition points to this receipt. In
`direct_bounded`, every key in the compromised dependency's assertion and
in-flight manifests appears exactly once and the total fits the frozen inline
bound of `max_closure_partition_entries` across both arrays. In
`closure_partition`, the receipt is upstream of the generic partition
receipt and binds the closure plan, snapshot, sequence, and exact processed-work
subset without referencing that later receipt; each key in that subset appears
exactly once. `TrustClosureCompletionReceipt` proves that the union of typed
partition result entries is exactly the fixed-point set. No unbounded aggregate
TrustQuarantineReceipt is created. An
accepted current head uses `transitioned_to_quarantined`; an already quarantined
head uses `already_quarantined`, binds its existing receipt/disposition, performs
no second trust transition, and duplicates no quarantine atom. The latter is how
sequential or concurrent overlapping dependency compromises remain complete.
Every in-flight manifest key likewise appears exactly once. A financial entry
either cancels an unredeemed action and freezes its root or freezes the already-
held handed-off exposure/root. A no-new-economic-exposure entry either cancels
before handoff or preserves the handed-off action as blocked/unknown; it creates
no monetary root and never pretends an external effect was undone. A later
authenticated event for a restricted handed-off entry must promote it to a
`quarantined` ReceiverAssertionTrustStateHead, not an accepted assertion, while
removing the exact in-flight leaf in the same complete-set transaction.
`released_exposure_present` is a legacy wire name with a broader exact meaning:
it is true whenever the assertion released/replenished capacity **or** changed an
obligation/resource/compartment/ledger atom classification that would require
conservative economic remediation if trust failed. Thus a fulfillment that
reclassifies a reserved atom to an equal `active_reversal` atom is true even when
the numeric outstanding amount did not fall. It is false only when no economic
head, atom, obligation state, or capacity depends on the assertion. If every
registered assertion proves `released_exposure_present:false` and there is no
financial in-flight disposition, the transaction
requires no economic root and the exposure receipt is null; it still atomically
installs the restrictive dependency successor and every trust successor. If any
entry released/replenished capacity, reclassified a remediable economic atom, or
an in-flight entry requires a root freeze,
the exact ExposureRemediationReceipt is
mandatory and commits in the same transaction. Mixing false exposure metadata
with a nonempty released-exposure index, omitting an indexed exposure, or using
the trust-only branch for a financial capacity change denies.

```yaml
schema: cairn.exposure_remediation_state_commitment_preimage.v0.1
head_family: compartment | economic_resource | obligation | authority_limit_ledger
stable_head_key: <compartment-state id, resource key, obligation id, or ledger key>
sequence: <exact successor sequence>
previous_state_hash: sha-256:<exact predecessor>
successor_state: <closed family state>
recorded_pre_restriction_state: <closed family value or null>
economic_atom_roots:
  active_hold_atoms_root: sha-256:<hex or null when family lacks it>
  active_reversal_atoms_root: sha-256:<hex or null>
  quarantine_hold_or_event_atoms_root: sha-256:<hex>
numeric_tuple:
  reserved_or_base_counter: <checked value or null>
  reversal_or_quarantine_before: <checked value or null>
  quarantine_after: <checked value>
  effective_after: <checked value>
unresolved_exposure_commitment_root: sha-256:<hex or canonical empty root>
remediation_transaction_id: <stable same transaction id>
remediation_phase: initial | successor | principal_resume
trigger_or_prior_receipt_hash: sha-256:<trigger cause hash for initial;
                                      prior remediation receipt hash otherwise>
resume_authorizations_root: sha-256:<canonical empty except principal-resume>
updated_at: <authority-service time>
```

This is the only preimage for every stored `remediation_commitment_hash`. It is
JCS-hashed before the successor head or remediation receipt exists and expressly
excludes `remediation_commitment_hash` itself, every current/future remediation-
receipt ref/hash, every successor-head ref/hash, `state_hash`/`head_hash`, and all
signatures. The successor head stores this hash. The receipt may then contain the
actual successor ref/hash and must recompute the same preimage from its typed
fields. There is no indirect fixed point and no alternate family-specific
“exact tuple” interpretation.

```yaml
schema: cairn.remediation_resume_authorization.v0.1
principal_id: <principal whose authority could be reopened>
incident_dependency_or_reversal_ref: <ObjectRef>
prior_complete_frozen_remediation_receipt_ref: <direct ExposureRemediationReceipt
                                                  or TrustClosureCompletionReceipt ObjectRef>
prior_complete_frozen_remediation_receipt_hash: sha-256:<hex>
economic_resource_keys: []
owned_compartment_control_keys: []
owned_authority_limit_ledger_keys: []
approved_obligation_resolutions:
  - obligation_exposure_id: sha-256:<hex>
    disposition: revalidated_recorded_state | reversal_confirmed
control_namespace_ref: <current ObjectRef>
control_namespace_generation: <integer>
execution_control_state_head_ref: <current ObjectRef>
execution_control_state_head_hash: sha-256:<hex>
expected_pause_epochs_and_revocation_nonces_root: sha-256:<complete affected scopes>
principal_nonce: <fresh monotonic nonce>
expires_at: <short expiry>
authorization_hash: sha-256:<hex>
principal_high_assurance_signature: <Signature>
not_claiming: [evidence_truth, external_effect_undone, payment_finality]
```

The complete authorization set contains exactly one current high-assurance
authorization from every principal whose compartment or principal/mandate ledger
could regain executable capacity. A resource spanning principals cannot resume
from one principal's signature. Each authorization binds the incident, exact
complete-frozen receipt, roots, owned compartments/ledgers, per-obligation
resolution disposition, current control namespace/head/epochs/nonces, fresh
nonce, and expiry. Missing, stale, duplicate, sibling-resource, or partial-owner
sets deny.

```yaml
schema: cairn.exposure_remediation_receipt.v0.1
receipt_mode: direct_bounded | closure_partition
closure_id: sha-256:<hex or null for direct_bounded>
closure_plan_core_ref: <ObjectRef or null for direct_bounded>
closure_plan_core_hash: sha-256:<hex or null>
closure_partition_sequence: <integer or null for direct_bounded>
processed_work_item_keys_root: sha-256:<exact partition subset or canonical empty>
source_snapshot_ref: <ObjectRef or null for direct_bounded>
source_snapshot_hash: sha-256:<hex or null>
economic_mutation_cause_cores_root: sha-256:<exact one per affected resource/asset>
compartment_transition_receipts_root: sha-256:<exact typed set>
resource_transition_receipts_root: sha-256:<exact typed set>
limit_ledger_transition_receipts_root: sha-256:<exact typed set>
remediation_phase: initial | successor | principal_resume
trigger_kind: trust_dependency_compromise | authenticated_unexpected_reversal |
              successor_resolution | principal_authorized_resume
trigger_dependency_kind: <closed dependency kind or null unless trust branch>
trigger_before_head_ref: <ObjectRef or null unless trust branch>
trigger_before_head_hash: sha-256:<hex or null>
trigger_restrictive_successor_head_ref: <ObjectRef or null unless trust branch>
trigger_restrictive_successor_head_hash: sha-256:<hex or null>
unexpected_reversal_cause_receipt_ref: <ObjectRef or null unless reversal branch>
unexpected_reversal_cause_receipt_hash: sha-256:<hex or null>
prior_remediation_receipt_ref: <ObjectRef required for successor/principal-resume; null initial>
prior_remediation_receipt_hash: sha-256:<hex or null>
resolution_evidence_refs: <nonempty sorted refs only for successor>
resume_authorization_refs: <complete sorted refs only for principal-resume>
resume_authorizations_root: sha-256:<hex or canonical empty>
assertion_transitions:
  - assertion_registration_key: sha-256:<hex>
    prior_trust_head_ref: <ObjectRef>
    prior_trust_head_hash: sha-256:<hex>
    next_trust_state_commitment_hash: sha-256:<precomputable quarantined fields;
                                         excludes this receipt ref/hash>
inflight_dispositions:
  - inflight_execution_key: sha-256:<hex>
    commitment_ref: <ObjectRef>
    commitment_hash: sha-256:<hex>
    disposition: financial_unredeemed_cancelled_and_root_frozen |
                 financial_handed_off_exposure_held_and_root_frozen |
                 already_restricted
    transitioned_action_control_heads_root: sha-256:<exact before/after set>
inflight_dispositions_root: sha-256:<complete sorted vector>
economic_root_transitions:
  - economic_resource_key: sha-256:<hex>
    resource_cap_before_head_ref: <ObjectRef>
    resource_cap_before_head_hash: sha-256:<hex>
    resource_cap_after_head_ref: <same or restrictive successor ObjectRef>
    resource_cap_after_head_hash: sha-256:<hex>
    resource_exposure_before_head_ref: <ObjectRef>
    resource_exposure_before_head_hash: sha-256:<hex>
    resource_exposure_after_head_ref: <frozen for initial/successor;
                                       nonfrozen ObjectRef only for principal-resume>
    resource_exposure_after_head_hash: sha-256:<hex>
    compartment_transitions:
      - compartment_control_key: sha-256:<hex>
        before_head_ref: <ObjectRef>
        before_head_hash: sha-256:<hex>
        after_head_ref: <frozen except principal-resume nonfrozen successor>
        after_head_hash: sha-256:<hex>
    compartment_transitions_root: sha-256:<exact sorted complete vector>
    obligation_transitions:
      - obligation_exposure_id: sha-256:<hex>
        before_head_ref: <ObjectRef>
        before_head_hash: sha-256:<hex>
        after_head_ref: <quarantined except principal-resume resolved ObjectRef>
        after_head_hash: sha-256:<hex>
        resolution_disposition: null_while_frozen | revalidated_recorded_state |
                                reversal_confirmed
        restored_or_reclassified_atoms_root: sha-256:<exact unique atom set>
        restored_amount: <Money>
    reserved_before: <Money>
    reserved_after: <Money>
    reversal_before: <Money>
    reversal_after: <Money>
    quarantine_before: <Money>
    quarantine_after: <Money>
    unresolved_exposure_commitment_root: sha-256:<empty only when complete>
    resolution_progress: unresolved_frozen | evidence_complete_frozen |
                         resolved_nonfrozen
authority_limit_ledger_transitions:
  - ledger_key: sha-256:<affected monetary ledger key>
    ledger_kind: principal_monetary_aggregate | principal_monetary_window |
                 principal_outstanding | mandate_monetary_aggregate |
                 mandate_monetary_window | mandate_outstanding |
                 compartment_window | compartment_lifetime
    before_head_ref: <ObjectRef>
    before_head_hash: sha-256:<hex>
    after_head_ref: <frozen except principal-resume nonfrozen successor>
    after_head_hash: sha-256:<hex>
    quarantine_event_atoms_root: sha-256:<exact matching invalid-capacity atoms>
    base_counter_before: <typed stored consumed/window/outstanding amount>
    base_counter_after: <same value unless independently authenticated typed cause is included>
    quarantine_value_before: <typed nonnegative amount>
    quarantine_delta: <typed signed amount>
    quarantine_value_after: <must equal before + delta and be nonnegative>
    effective_value_before: <base before + quarantine before>
    effective_value_after: <base after + quarantine after>
remediation_result: incomplete_frozen | complete_frozen | resolved_nonfrozen
authority_transaction_id: <one lifecycle/trust/obligation/compartment/resource/ledger CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The trigger is a schema-level oneOf. A direct receipt's inline assertion,
in-flight, economic-root, compartment, obligation, and ledger vectors are the
complete set and their total work-item count is no greater than
`max_closure_partition_entries`. A closure-partition receipt contains only the exact
processed-work subset and is upstream of its `TrustClosurePartitionReceipt`;
fixed-point completion is the typed union proof, not a second unbounded receipt.
The closure completion receipt is the canonical aggregate target for later
principal resume, while its result map resolves every per-root remediation
receipt. An initial trust branch requires all five
dependency fields and forbids reversal/prior-resolution fields. An initial
reversal branch requires the exact cause receipt and forbids every dependency and
prior-resolution/resume fields. A successor branch requires the exact prior remediation
receipt plus nonempty authenticated resolution evidence, uses
`trigger_kind:successor_resolution`, and forbids both initial-trigger families
and resume authority. A principal-resume branch requires the exact prior
`complete_frozen` receipt and complete RemediationResumeAuthorization set, uses
`trigger_kind:principal_authorized_resume`, and forbids initial triggers and new
resolution evidence.
The reversal branch's
`assertion_transitions` is empty unless the imported reversal also changes a
separately registered assertion under its normal complete dependency transaction.
All branches require at least one economic-root transition and the complete set
of affected ledger transitions. `remediation_result` is receipt-wide, not a per-
root label, because different roots may share principal/mandate ledgers.
`incomplete_frozen` requires every after-head and shared ledger frozen, allows
per-root `unresolved_frozen` or `evidence_complete_frozen`, and requires at least
one nonempty unresolved root. `complete_frozen` requires every root
`evidence_complete_frozen`, every after-head/ledger still frozen, every unresolved
root empty, and all quarantine atoms/values either reclassified into their exact
conservative recorded class or zero; it restores no execution capacity and waits
for principal authorization. `resolved_nonfrozen` is principal-resume-only,
requires every root `resolved_nonfrozen`, empty unresolved/quarantine roots and
values, and every shared ledger transitioned once under the complete authorization
set. Partial root resume is forbidden.

During either frozen result, every obligation disposition is
`null_while_frozen`. In `resolved_nonfrozen`, each obligation independently uses
`revalidated_recorded_state` with that exact after-state or `reversal_confirmed`
with after-state `reversed`; the latter reclassifies the exact quarantine atom to
the immutable `confirmed_reversal` event class, making active-reversal and
quarantine roots empty while preserving realized-loss history. Mixed dispositions are allowed inside one fully
resolved receipt and their atom sums determine the nonfrozen resource,
compartment, and ledger successors. No reversed obligation is mislabeled as its
recorded pre-quarantine state.
`execution.exposure_remediation.commit` is the authority-internal initial
economic coordinator: `execution.trust_compromise.commit` invokes it for a trust
branch, and an allowlisted unexpected-reversal provider import invokes it for the
reversal branch. It accepts no public caller or raw next state.

The receipt references actual compartment/resource/obligation/ledger after-heads;
those heads do not reference the receipt and carry only their ordinary predecessor
plus the same typed transaction/remediation commitment. The quarantined trust
head points one way to its TrustQuarantineReceipt and, when economic remediation
exists, the exposure receipt. It recomputes `next_trust_state_commitment_hash`
while excluding that commitment field, both quarantine/exposure receipt refs and
hashes, `state_hash`, and signature; every other quarantined-head field,
including the remediation transaction ID, is in the typed preimage. An atom
already counted in active reversal exposure is reclassified
to a conservative hold; it is never added twice. The before/after ledger equations
in §5.2 must balance exactly. `base_counter_after` is unchanged during initial
quarantine; the restored conservative amount appears only in
`quarantine_value_after`, so effective value is never double-counted. A successor
may move an exact amount from quarantine into the base consumed counter or remove
it only under the separately authenticated typed resolution cause, with both
before/after equations still exact. Known restored exposure always becomes explicit
quarantine atoms even when that makes the frozen head over-limit; only genuinely
unproved exposure remains in the unresolved commitment root. A later
`frozen → frozen` remediation transition references the prior remediation receipt,
advances obligation, compartment, resource-exposure, and every affected ledger
root atomically, and emits a successor receipt;
no unregistered batch repair or direct ledger edit is allowed.
`execution.exposure_remediation.resolve` is the sole successor coordinator. It
accepts the expected frozen resource/compartment/obligation/ledger heads, prior
receipt, and typed newer evidence; it invokes each family sole writer under one
transaction and returns only `incomplete_frozen` or `complete_frozen`; it can
never restore an active/exhausted/closed execution state. Only
`execution.exposure_remediation.resume`, called with the complete current
principal authorization set, may produce `resolved_nonfrozen` and reopen any
capacity. No initial compromise or evidence-only resolver can masquerade as
principal resume.

```yaml
schema: cairn.unexpected_reversal_cause_receipt.v0.1
receiver_event_import_ref: <authenticated immutable reversal-event ObjectRef>
receiver_event_import_hash: sha-256:<hex>
action_ref: <ObjectRef>
effect_id: sha-256:<hex>
obligation_exposure_id: sha-256:<hex>
prior_completion_or_finality_receipt_ref: <ObjectRef>
prior_completion_or_finality_receipt_hash: sha-256:<hex>
receiver_account_or_contract_scope: <canonical scope>
reversed_components_root: sha-256:<exact component/amount/asset set>
authenticated_receiver_sequence: <strictly newer sequence>
classified_outcome: reversal_confirmed | reversal_disputed_unknown
imported_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Only allowlisted `execution.provider_event.import` can produce this cause. It
verifies the bound source credential, receiver scope, effect, obligation,
strictly newer sequence, component conservation, and finality profile. The cause
cannot itself edit exposure. It invokes the same remediation coordinator, whose
one transaction installs the obligation quarantine successor, freezes the
compartment and economic-resource heads, reclassifies exact atoms in every
affected monetary ledger, and emits the receipt above. Missing, duplicate,
cross-effect, stale, or unauthenticated reversal causes deny.

```yaml
schema: cairn.source_credential_authority_core.v0.1
source_credential_authority_key: sha-256:<fields below>
provider_trust_domain_id: <canonical domain>
receiver_account_or_contract_scope: <canonical scope>
declared_event_source_scope: <provider-authenticated canonical scope>
credential_authority_id: <allowlisted stable authority>
core_hash: sha-256:<hex>
credential_authority_signature: <Signature>
```

```yaml
schema: cairn.source_credential_lifecycle_head.v0.1
source_credential_authority_key: sha-256:<provider trust domain, receiver account/
                                         contract scope, declared event-source scope,
                                         credential-authority identity>
source_credential_authority_core_ref: <immutable signed authority/scope ObjectRef>
source_credential_authority_core_hash: sha-256:<hex; invariant across generations>
credential_id: <current credential/key/session identity>
credential_generation: <monotonic; increments only when a new credential is installed>
issuer: <canonical issuer>
subject_or_session_commitment: sha-256:<hex>
provider_trust_domain_id: <canonical domain>
receiver_account_or_contract_scope: <canonical scope>
declared_event_source_scope: <provider-authenticated canonical scope>
key_confirmation_thumbprint: sha-256:<hex>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: active | retired | emergency_revoked | quarantined | expired
valid_from: <time>
valid_until: <time>
reason: issued | ordinary_rotation | scheduled_retirement | expiry |
        successor_after_retirement_or_expiry | suspected_compromise |
        confirmed_compromise | administrative_hold
state_hash: sha-256:<hex>
signer_kind: credential_authority | trust_coordinator
credential_authority_signature: <Signature or null unless genesis/ordinary lifecycle>
trust_coordinator_signature: <Signature or null unless compromise quarantine>
```

```yaml
schema: cairn.lifecycle_genesis_receipt.v0.1
lifecycle_family: execution_release | source_credential
stable_identity_key: sha-256:<family-specific canonical identity>
genesis_head_ref: <active generation-0 ObjectRef>
genesis_head_hash: sha-256:<hex>
genesis_transition_history_head_ref: <empty lifecycle_transition_history_state_head ObjectRef>
genesis_transition_history_head_hash: sha-256:<hex>
imported_source_ref: <authenticated release manifest/credential ObjectRef>
imported_source_hash: sha-256:<hex>
authority_id: <allowlisted release or credential authority>
registry_transaction_id: <insert-only lifecycle genesis transaction>
imported_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_signature: <Signature>
```

```yaml
schema: cairn.source_credential_lifecycle_transition_receipt.v0.1
source_credential_authority_key: sha-256:<same stable key>
source_credential_authority_core_ref: <same immutable ObjectRef>
source_credential_authority_core_hash: sha-256:<same hex>
before_head_ref: <ObjectRef>
before_head_hash: sha-256:<hex>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
before_sequence: <integer>
after_sequence: <before + 1>
before_credential_generation: <integer>
after_credential_generation: <same, or before + 1 iff new credential installed>
cause: ordinary_rotation | successor_after_retirement_or_expiry |
       scheduled_retirement | expiry | suspected_compromise |
       confirmed_compromise | administrative_hold
continuity_evidence_ref: <authenticated ObjectRef; required only for generation successor>
continuity_evidence_hash: sha-256:<hex or null>
trust_compromise_receipt_ref: <ObjectRef or null unless compromise>
transition_history_before_head_ref: <exact current lifecycle_transition_history_state_head ObjectRef>
transition_history_before_head_hash: sha-256:<hex>
transition_history_next_state_commitment_hash: sha-256:<self-excluding successor/map-add tuple>
authority_transaction_id: <one lifecycle/trust CAS>
committed_at: <branch-authoritative time>
receipt_hash: sha-256:<hex>
signer_kind: credential_authority | trust_coordinator
credential_authority_signature: <Signature or null unless ordinary lifecycle>
trust_coordinator_signature: <Signature or null unless compromise quarantine>
```

```yaml
schema: cairn.lifecycle_transition_history_state_head.v0.1
history_key: sha-256:<lifecycle family/stable identity>
lifecycle_family: execution_release | policy | source_credential |
                  commerce_signer_authority | provider_identity_trust_overlay
sequence: <same latest lifecycle sequence>
previous_state_hash: sha-256:<hex or null>
current_lifecycle_head_ref: <exact current ObjectRef>
current_lifecycle_head_hash: sha-256:<hex>
transition_receipt_map_ref: <enumerable_map_root ObjectRef of lifecycle_transition entries>
transition_receipt_map_hash: sha-256:<hex>
transition_receipt_count: <checked uint64>
latest_transition_receipt_ref: <ObjectRef or null at lifecycle genesis>
latest_transition_receipt_hash: sha-256:<hex or null>
updated_at: <branch-authoritative time>
head_hash: sha-256:<hex>
signer_kind: lifecycle_authority | authority_service | trust_coordinator
lifecycle_authority_signature: <Signature or null unless branch-owned genesis/ordinary lifecycle>
authority_service_signature: <Signature or null unless provider-identity overlay genesis/observation>
trust_coordinator_signature: <Signature or null unless compromise quarantine>
```

Lifecycle genesis creates an empty history head. Every non-genesis transition
receipt, including the first, binds
the prior history head plus the precomputed self-excluding commitment of the
history successor, avoiding a content cycle; the same transaction writes the
lifecycle successor and history successor whose enumerable map adds that receipt,
whose current-lifecycle fields name the successor, and whose hash recomputes the
commitment. Historical
acceptance carries the current history head/map and proves every consecutive
sequence in the requested range by map membership. Arbitrarily many rotations
therefore require bounded paged reads, not one 128-entry manifest or an
unclassifiable late event.
Normal release, policy, and source-credential history successors are signed by
their branch lifecycle authority. A compromise/quarantine successor is signed
only by the trust coordinator under the same closure transaction and exact
restrictive cause receipt. Mixed signatures, coordinator-signed ordinary
rotation/retirement, or authority-signed compromise quarantine deny.
Provider-identity overlay genesis/observation history is authority-service
signed; its compromise successor is trust-coordinator signed. The external
registry authority never signs this local overlay history.

`execution.release.import` and `execution.source_credential_lifecycle.import`
are the only constructors for their respective lifecycle families. Each derives
the stable identity key, creates one active generation-0 head insert-only, and
emits the receipt above. Same-source/same-hash retry is byte-identical;
same-key/different-hash import conflicts. Their transition operations reject a
null predecessor and can never perform genesis.

For source credentials, the lifecycle family is the stable authenticated event-
source authority/scope, not an individual key or session. A credential rotation
CASes that same head to generation `g+1`, records the new exact credential/key/
session, and emits a signed transition receipt binding the immutable authority
core and both generations. `active(g) → active(g+1)` is ordinary rotation;
`retired(g) | expired(g) → active(g+1)` is allowed only with authenticated
continuity from the same credential authority/core/scope. This never reactivates
generation `g`. `sequence` increments on every lifecycle successor, including a
same-generation active→retired/expired transition; `credential_generation`
changes only on a successor that installs a new credential. A transition receipt
therefore proves both the next lifecycle sequence and either an unchanged or
exactly-next credential generation. Emergency-revoked or quarantined authority
state is terminal.
The stable TrustDependencyStateHead/index survives every ordinary generation
change; in-flight and assertion records retain their exact credential generation.

```yaml
schema: cairn.trust_dependency_state_import_receipt.v0.1
dependency_kind: <closed complete-set kind>
dependency_ref: <canonical ObjectRef>
dependency_hash: sha-256:<hex>
dependency_stable_key: sha-256:<immutable dependency identity>
empty_finality_manifest_ref: <content-addressed empty manifest ObjectRef>
empty_finality_manifest_hash: sha-256:<hex>
empty_exposure_manifest_ref: <content-addressed empty manifest ObjectRef>
empty_exposure_manifest_hash: sha-256:<hex>
empty_inflight_manifest_ref: <content-addressed empty manifest ObjectRef>
empty_inflight_manifest_hash: sha-256:<hex>
empty_assignment_map_ref: <canonical empty enumerable_map_root ObjectRef>
empty_assignment_map_hash: sha-256:<hex>
genesis_epoch_state_head_ref: <accepting epoch-0 ObjectRef>
genesis_epoch_state_head_hash: sha-256:<hex>
genesis_epoch_directory_head_ref: <one-entry live-epoch directory ObjectRef>
genesis_epoch_directory_head_hash: sha-256:<hex>
initial_reserved_future_assertion_slots: 0
initial_reserved_reauthentication_dependency_slots: 0
assertion_slot_limit: 32
genesis_dependency_head_ref: <generation-0 aggregate cursor ObjectRef over directory/epoch 0>
genesis_dependency_head_hash: sha-256:<hex>
integrity_before_head_ref: <current healthy ObjectRef>
integrity_before_head_hash: sha-256:<hex>
integrity_after_head_ref: <healthy successor with stable key added>
integrity_after_head_hash: sha-256:<hex>
authority_transaction_id: <insert-only dependency-index genesis transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

After any allowlisted dependency import/issue and before it is eligible for a
review, confirmation, event classification, gate, or handoff,
`execution.trust_dependency_state.import` creates the three canonical empty
manifests, epoch-0 state, one-entry epoch directory, and unique generation-0
aggregate dependency head in one transaction. It is the only constructor. Same
dependency/hash replay is idempotent; a different hash or second genesis
conflicts. First provider-event registration therefore always has a non-null
aggregate predecessor, directory and assigned-epoch predecessor, all empty
manifest refs/hashes, zero roots, and fence zero; registration can never
improvise genesis.

```yaml
schema: cairn.trust_dependency_state_head.v0.1
dependency_kind: finality_policy | accounting_policy | review_policy | taint_policy |
                 receiver_scope_selection_issuer | source_credential |
                 receiver_sequence_epoch_selector |
                 credential_broker_authority | executor_credential_binding |
                 receiver_channel_policy | confirmation_assurance_policy |
                 confirmation_verifier | adapter_identity | provider_account_identity |
                 provider_sublimit_identity |
                 compartment_protection_attestation | cancellation_fee_source |
                 seller_inventory_authority | copy_ownership_registry_authority |
                 execution_release
dependency_ref: <canonical ObjectRef>
dependency_hash: sha-256:<hex>
dependency_stable_key: sha-256:<immutable key; account/sublimit/source credential/
                                  executor binding use stable core key>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
accepting_index_epoch: <monotonic integer>
index_epoch_directory_head_ref: <signed append-only directory ObjectRef>
index_epoch_directory_head_hash: sha-256:<hex>
accepting_index_epoch_state_head_ref: <bounded_index_epoch_state_head ObjectRef>
accepting_index_epoch_state_head_hash: sha-256:<hex>
total_dependent_finality_assertion_count: <checked uint64 across epochs>
total_dependent_released_exposure_count: <checked uint64 across epochs>
total_dependent_inflight_action_count: <checked uint64 across epochs>
total_reserved_future_assertion_slots: <checked uint64 across live epochs>
total_reserved_reauthentication_dependency_slots: <checked uint64 across live epochs>
registration_fence: <monotonic integer>
updated_at: <authority-service time>
state_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The dependency head is the stable aggregate cursor. It never duplicates one
epoch's manifest roots as if they were the lifetime set. Its counts equal the
sum proved by the directory's live epoch map and sealed chain; the accepting
epoch ref/hash equals the directory. Every assertion, exposure, in-flight leaf,
and reservation assignment lives in exactly one epoch's enumerable manifest-set
or assignment map.

For `receiver_sequence_epoch_selector`, the immutable dependency identity is the
stable selector key while each assertion/in-flight binding retains the exact
selector head and epoch proof used at handoff. For `provider_account_identity`, `provider_sublimit_identity`, and
`source_credential`,
`dependency_ref/hash` are the immutable identity-core ref/hash and
`dependency_stable_key` is the matching identity key; the exact mutable
generation head and its current ProviderIdentityTrustOverlay head appear only in
each assertion/in-flight dependency binding.
For `executor_credential_binding`, they are the immutable credential-instance
core and canonical instance key shared by every binding alias; each commitment/
assertion additionally retains the exact alias binding head it used. Every other
kind likewise defines one immutable stable key. `credential_broker_authority`
uses its registry core/key and exact lifecycle head; `cancellation_fee_source`
uses its immutable fee-source core/key and exact generation head. Both are
registered independently from the executor instance dependency, so compromise
cannot be hidden by a still-active child object. Every kind defines identity
independently of its current lifecycle head. A generation/state-head ObjectRef
can never key a new reverse index.
The two commerce-signer kinds use their matching CommerceSignerAuthorityCore
ref/hash and stable key. Every applicable inventory object and execution
dependency binding retains the exact active authority head and signing-key
generation it trusted; ordinary key rotation does not create a new reverse
index, and later compromise reaches every historical dependent through the
stable key.

```yaml
schema: cairn.inflight_execution_dependency_commitment.v0.1
inflight_execution_key: sha-256:<JCS of action/effect/lineage/reservation fence>
action_ref: <prepared execution ActionRecord ObjectRef>
effect_id: sha-256:<hex>
lineage_id: sha-256:<hex>
exposure_class: financial_exposure | no_new_economic_exposure
reserved_receiver_assertion_slots: <positive integer no greater than 8>
reserved_reversal_tail_slots: <positive integer from finality profile>
reserved_reauthentication_dependency_slots: <0 or 1 per permitted historical branch>
trust_index_epoch_assignments_root: sha-256:<dependency/epoch/slot reservation set>
trust_index_epoch_assignments:
  - dependency_stable_key: sha-256:<hex>
    directory_head_ref: <current ObjectRef at reservation>
    directory_head_hash: sha-256:<hex>
    epoch_state_head_ref: <assigned accepting ObjectRef>
    epoch_state_head_hash: sha-256:<hex>
    slot_assignment_ref: <bounded_index_slot_assignment ObjectRef>
    slot_assignment_hash: sha-256:<hex>
future_dependency_pool_state_head_ref: <current ObjectRef or null unless reauthentication permitted>
future_dependency_pool_state_head_hash: sha-256:<hex or null>
future_dependency_assignment_ref: <ObjectRef or null>
future_dependency_assignment_hash: sha-256:<hex or null>
authority_reservation_ref: <ObjectRef>
authority_reservation_hash: sha-256:<hex>
action_control_key: sha-256:<hex>
economic_roots:  # nonempty iff financial_exposure; exact empty vector otherwise
  - economic_resource_key: sha-256:<hex>
    obligation_exposure_id: sha-256:<hex>
    compartment_control_keys: []
    authority_limit_ledger_keys: []
    held_atoms_root: sha-256:<exact already-held atom set>
    maximum_exposure: <Money>
dependency_bindings:
  - dependency_kind: <closed complete-set kind>
    dependency_stable_key: sha-256:<hex>
    exact_lifecycle_or_identity_head_ref: <current ObjectRef at reservation>
    exact_lifecycle_or_identity_head_hash: sha-256:<hex>
    generation: <integer or null>
    eligibility_overlay_head_ref: <ProviderIdentityTrustOverlayStateHead ObjectRef for
                                   provider account/sublimit; null otherwise>
    eligibility_overlay_head_hash: sha-256:<hex or null>
registered_at: <authority-service time>
commitment_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.trust_inflight_registration_receipt.v0.1
inflight_execution_key: sha-256:<same key>
commitment_ref: <ObjectRef>
commitment_hash: sha-256:<hex>
cause: authority_reservation_registered | provider_assertion_promoted |
       fenced_non_submission_removed
dependency_commits:
  - dependency_stable_key: sha-256:<hex>
    before_state_head_ref: <ObjectRef>
    before_state_head_hash: sha-256:<hex>
    before_directory_head_ref: <ObjectRef>
    before_directory_head_hash: sha-256:<hex>
    before_assigned_epoch_state_head_ref: <ObjectRef>
    before_assigned_epoch_state_head_hash: sha-256:<hex>
    before_inflight_root: sha-256:<hex>
    before_inflight_manifest_ref: <ObjectRef>
    before_inflight_manifest_hash: sha-256:<hex>
    before_reserved_future_assertion_slots: <integer>
    before_reserved_reauthentication_dependency_slots: <integer>
    slot_assignment_before_ref: <ObjectRef>
    slot_assignment_before_hash: sha-256:<hex>
    after_state_head_ref: <ObjectRef>
    after_state_head_hash: sha-256:<hex>
    after_directory_head_ref: <ObjectRef>
    after_directory_head_hash: sha-256:<hex>
    after_assigned_epoch_state_head_ref: <ObjectRef>
    after_assigned_epoch_state_head_hash: sha-256:<hex>
    after_inflight_root: sha-256:<before plus or minus exactly one leaf>
    after_inflight_manifest_ref: <ObjectRef>
    after_inflight_manifest_hash: sha-256:<hex>
    after_reserved_future_assertion_slots: <exact add, event consumption, or terminal release>
    after_reserved_reauthentication_dependency_slots: <exact reserve, atomic transfer,
                                                            or stream-closure release>
    before_fence: <integer>
    after_fence: <before + 1>
promotion_registration_receipt_ref: <TrustDependencyRegistrationReceipt ObjectRef or null unless promoted>
promotion_registration_receipt_hash: sha-256:<hex or null>
removal_proof_ref: <fenced non-submission ObjectRef or null unless removed>
removal_proof_hash: sha-256:<hex or null>
authority_transaction_id: <one complete dependency-vector CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Reservation admission computes the finality profile's maximum ordinary events
plus its reversal/charge tail, capped at eight, and reserves those assertion
slots in every dependency epoch before the in-flight action is usable. The
per-epoch invariant is `current_assertion_count + reserved_future_assertion_slots
<= 32`. Each imported event consumes one reserved slot while adding its
assertion. An authenticated business-final state does **not** release the tail;
unused tail slots release only after the profile's authenticated stream-closure
event or irreversible reversal horizon. Fenced pre-handoff non-submission may
release all slots because no external stream exists. A profile with more than
eight possible events, a registration without reserved capacity, or a later
event that would exceed its reservation denies before the original action is
admitted, so a bound cannot strand an already handed-off action.

If the historical acceptance profile permits independent source
reauthentication, admission also reserves one dependency-capacity slot from the
scope's signed future-dependency pool. Event import atomically transfers that
slot to the newly authenticated source-credential dependency epoch before adding
its assertion. It may not discover an unreserved dependency and then reject an
authenticated late event for lack of index capacity.

Every external execution reservation registers one immutable in-flight
commitment under the complete set of release, confirmation, channel, executor-
credential, source-credential, policy, identity, attestation, adapter, quote-
source/importer, and applicable seller-inventory/copy-registry signer
dependencies before the reservation becomes usable. This includes nonbinding
notices, evidence requests, provider review, cancellation, bindable terms, and
value movement. Financial actions use `financial_exposure` and a nonempty exact
economic-root vector; nonfinancial and zero-cost cancellation actions use
`no_new_economic_exposure` and the canonical empty vector.
`execution.trust_inflight.register` performs that complete-set CAS. Handoff does
not remove the leaf. The **first** authenticated receiver event—including
rejection, cancellation, failure, and no-capacity-delta finality—atomically
removes it while adding that event's assertion and any required economic-
remediation leaf, so no gap is visible. Every later authenticated event in the
same receiver stream instead chains from the exact current prior stream event,
assertion, and trust head while leaving all in-flight roots/manifests unchanged
and adding its own assertion/remediation leaves. Only a before-handoff fenced
non-submission proof may remove the original leaf through
`execution.trust_inflight.complete` without assertion promotion; local timeout,
process belief, or an authenticated terminal outcome cannot. Crash recovery derives every reserved or handed-
off pre-assertion root from these signed manifests and commitments, never an
auxiliary action table.

The assertion key is independently precomputable as
`H(profile_id, provider-event identity tuple, raw event digest,
receiver-event import-record hash, action/effect/lineage, finality-profile hash,
accounting-policy hash, receiver-channel-policy ref/hash-or-null,
receiver-scope-selection-proof ref/hash and issuer lifecycle,
confirmation-assurance-policy and verifier-profile refs/hashes,
protection-attestation ref/hash-or-null, and execution-release ref/hash)`. It excludes every trust head, dependency head/root,
registration receipt, action receipt, and signature. The two reverse indexes use
different frozen leaf grammars. The finality-assertion leaf is exactly
`JCS(["cairn-trust-assertion-leaf-v0.1", assertion_registration_key])`. The
released-exposure leaf is exactly
`JCS(["cairn-trust-released-exposure-leaf-v0.1",
assertion_registration_key, released_exposure_commitment_hash])` and is omitted
only when the authenticated event created no economic remediation dependency
under the exact rule above. The in-flight leaf is exactly
`JCS(["cairn-trust-inflight-action-leaf-v0.1", inflight_execution_key,
inflight_execution_commitment_hash])`. None of the three leaves references a
later trust head or receipt.

```yaml
schema: cairn.released_exposure_commitment.v0.1
assertion_registration_key: sha-256:<hex>
released_exposure_present: true  # object exists only when economic remediation is required
economic_roots:  # nonempty
  - economic_resource_key: sha-256:<hex>
    obligation_exposure_ids: []
    compartment_control_keys: []
    affected_ledgers:
      - ledger_key: sha-256:<hex>
        ledger_kind: <closed monetary kind>
        capacity_delta: <checked Money in same asset>
    released_replenished_or_reclassified_atoms_root: sha-256:<exact atom set>
    amount: <checked Money>
accounting_policy_ref: <ObjectRef>
accounting_policy_hash: sha-256:<hex>
commitment_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.trust_dependency_index_manifest.v0.1
dependency_kind: <closed kind>
dependency_ref: <ObjectRef>
index_epoch: <monotonic integer>
epoch_state: accepting | draining | sealed
index_kind: finality_assertions | released_exposures | inflight_actions
index_revision: <monotonic integer for this index only; advances iff entries change>
entry_count: <nonnegative integer no greater than 32>
sorted_entries:
  - leaf_hash: sha-256:<exact frozen leaf>
    assertion_registration_key: sha-256:<hex or null unless assertion/exposure index>
    inflight_execution_key: sha-256:<hex or null unless inflight index>
    released_exposure_commitment_ref: <ObjectRef or null for assertion index>
    released_exposure_commitment_hash: sha-256:<hex or null>
    inflight_execution_commitment_ref: <ObjectRef or null unless inflight index>
    inflight_execution_commitment_hash: sha-256:<hex or null>
entries_root: sha-256:<must equal corresponding dependency-head root>
manifest_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The signed manifest is the normative enumerable reverse index, not an auxiliary
database cache. Entries are canonically sorted by leaf hash and contain enough
typed refs to resolve every assertion, economic root, obligation, compartment,
ledger, amount, asset, and accounting policy. Registration creates new immutable
manifests and CASes their refs/hashes, roots, count, and fence into the dependency
head. `execution.trust_dependency_index.get` is authority-internal and returns the
exact manifest; pagination or an implementation cache may accelerate it but may
not replace it. After restart, compromise closure derives its complete transition
vector only from these signed manifests and referenced immutable commitments. A
missing/corrupt manifest or root/count mismatch atomically transitions the
authoritative ExecutionIntegrityStateHead to **fail_stopped**, not a partial
dependency transition. Every execution-overlay private read, review,
confirmation, reservation, gate, redemption, handoff, provider-event
classification, and current-trust presentation must CAS the same healthy head and
therefore returns the stable `execution_integrity_unavailable` failure after the
transition for every principal and dependency.
No lifecycle successor, remediation receipt, green activity state, or economic
capacity claim is published from incomplete closure. An operator may restore the
exact missing content-addressed bytes from authenticated replicated backup, but
that is storage repair, creates no protocol object/head/receipt, and cannot
substitute different bytes. The service may resume ordinary execution only after
every signed head, manifest, entry count, root, and referenced commitment verifies
and the pending compromise commits
through the ordinary complete coordinator transaction. This deliberately trades
global availability for a realizable fail-closed rule and never relies on an
untyped auxiliary index.
The assertion-registration key is the sole stable lookup key. A manifest MUST
NOT contain a ReceiverAssertionTrustStateHead ref/hash or registration-receipt
ref/hash. Those objects are constructed later, so including either would create
a dependency-head → manifest → trust-head/receipt → dependency-head content-
address cycle. Compromise CAS-resolves and transitions the key's exact current
ReceiverAssertionTrustStateHead, so a prior quarantine cannot be overwritten.
Each of the three manifests has an independent `index_revision`; the dependency
head sequence/fence advances for any complete-vector registration, while an
unchanged index retains the same manifest ref/hash/revision. Thus a later receiver
event can add an assertion while leaving the already-empty in-flight manifest
byte-identical. Reusing an old manifest after its entries change or requiring its
revision to equal the dependency-head sequence is nonconforming.

Bounded manifests roll over without losing history or stranding late events:

```yaml
schema: cairn.bounded_index_epoch_directory_head.v0.1
directory_key: sha-256:<index family and stable subject key>
index_family: trust_dependency | receiver_event_identity |
              credential_broker_instances | credential_instance_aliases
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
accepting_epoch: <exactly one epoch accepting new reservations>
accepting_epoch_state_head_ref: <bounded_index_epoch_state_head ObjectRef>
accepting_epoch_state_head_hash: sha-256:<hex>
live_epoch_map_ref: <enumerable_map_root ObjectRef of epoch-state heads>
live_epoch_map_hash: sha-256:<hex>
live_epoch_count: <checked uint64 equal to map>
sealed_epoch_chain_head_ref: <append-only signed chain ObjectRef or canonical empty>
sealed_epoch_chain_head_hash: sha-256:<hex>
sealed_epoch_count: <nonnegative integer>
state: active | fail_stopped | quarantined
closure_barrier_ref: <ObjectRef or null iff active>
closure_barrier_hash: sha-256:<hex or null>
updated_at: <authority-service time>
head_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.bounded_index_epoch_state_head.v0.1
directory_key: sha-256:<same directory>
epoch: <monotonic integer>
sequence: <monotonic integer within epoch>
previous_state_hash: sha-256:<hex or null>
state: accepting | draining | sealed
manifest_set_map_ref: <enumerable_map_root ObjectRef of branch-exact manifests>
manifest_set_map_hash: sha-256:<hex>
manifest_set_count: <checked uint64>
reservation_assignment_map_ref: <enumerable_map_root ObjectRef>
reservation_assignment_map_hash: sha-256:<hex>
reservation_assignment_count: <checked uint64>
outstanding_reserved_slots: <nonnegative checked uint64>
updated_at: <authority-service time>
head_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.bounded_index_slot_assignment.v0.1
slot_assignment_id: sha-256:<directory/epoch/action/slot kind>
directory_key: sha-256:<same directory>
epoch: <assigned epoch>
action_ref: <ObjectRef>
effect_id: sha-256:<hex>
lineage_id: sha-256:<hex>
slot_kind: trust_assertion | receiver_event_id | receiver_sequence |
           broker_instance | credential_alias
reserved_slots: <positive integer within per-action bound>
consumed_slots: <nonnegative integer no greater than reserved>
stream_closure_or_horizon_rule_hash: sha-256:<exact finality terminal-release rule or canonical inapplicable>
state: reserved | fully_consumed | released_on_authenticated_closure |
       released_on_authenticated_horizon | released_on_fenced_non_submission
assignment_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.sealed_index_epoch_chain_node.v0.1
directory_key: sha-256:<same directory>
epoch: <sealed epoch>
sealed_epoch_state_head_ref: <ObjectRef>
sealed_epoch_state_head_hash: sha-256:<hex>
manifest_set_map_ref: <same complete map ObjectRef>
manifest_set_map_hash: sha-256:<hex>
reservation_assignment_map_ref: <empty completed assignment map ObjectRef>
reservation_assignment_map_hash: sha-256:<hex>
previous_sealed_node_ref: <ObjectRef or null for first>
previous_sealed_node_hash: sha-256:<hex or null>
node_count: <monotonic checked uint64>
node_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.bounded_index_epoch_transition_receipt.v0.1
directory_key: sha-256:<same key>
cause: import_genesis | accepting_to_draining_and_rollover | reserved_entry_added |
       reserved_entry_consumed | authenticated_stream_closure_release |
       authenticated_irreversible_horizon_release | fenced_non_submission_release |
       draining_epoch_sealed |
       unreserved_authenticated_event_fail_stop | emergency_epoch_created |
       compromise_barrier_installed | closure_partition_committed | closure_completed
before_directory_head_ref: <ObjectRef or null only at genesis>
before_directory_head_hash: sha-256:<hex or null>
after_directory_head_ref: <ObjectRef>
after_directory_head_hash: sha-256:<hex>
live_epoch_map_before_ref: <ObjectRef or null only at genesis>
live_epoch_map_before_hash: sha-256:<hex or null>
live_epoch_map_after_ref: <ObjectRef>
live_epoch_map_after_hash: sha-256:<hex>
affected_epoch_before_head_ref: <ObjectRef or null only at genesis>
affected_epoch_before_head_hash: sha-256:<hex or null>
affected_epoch_after_head_ref: <ObjectRef>
affected_epoch_after_head_hash: sha-256:<hex>
reservation_assignment_transitions: # canonical bounded vector; empty unless add/consume/release
  - assignment_before_ref: <ObjectRef or null only for new reservation>
    assignment_before_hash: sha-256:<hex or null>
    assignment_after_ref: <ObjectRef>
    assignment_after_hash: sha-256:<hex>
    after_map_membership: true | false
reservation_assignment_transitions_root: sha-256:<canonical set or empty>
terminal_release_evidence_ref: <stream-closure, horizon, or fenced-non-submission
                                ObjectRef; null on other causes>
terminal_release_evidence_hash: sha-256:<hex or null>
closure_receipt_ref: <ObjectRef or null unless barrier/partition/completion>
closure_receipt_hash: sha-256:<hex or null>
authority_transaction_id: <one serializable index transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

For `receiver_event_identity`, each authenticated receiver event spends exactly
one previously reserved `receiver_event_id` slot and exactly one previously
reserved `receiver_sequence` slot for the same action/effect/lineage. The two
assignment successors are committed atomically in one
`BoundedIndexEpochTransitionReceipt`: each before assignment is the exact
current map member, each successor preserves immutable identity and
`reserved_slots`, and each `consumed_slots` value is exactly its predecessor
plus one. One-sided consumption, a jump larger than one, assignment migration to
the accepting epoch, or reuse of either consumed position is invalid.

For an intermediate nonterminal event, both successor assignments remain map
members with `state: reserved` and `consumed_slots < reserved_slots`; the stream
retains the exact successor refs for the next event. Exhausting either
assignment while the stream remains nonterminal is an unreserved-event
fail-stop, not implicit capacity or a partially consumed event. A terminal
authenticated event still consumes the same one-plus-one pair; its single
atomic receipt may also release remaining reserved capacity under the exact
authenticated closure cause. An independently authenticated irreversible
horizon consumes no receiver event or sequence position and may release the
remaining reservations under its horizon cause. Only a terminal cause may
remove those assignment map memberships or move them to a terminal release
state.

```yaml
schema: cairn.future_dependency_capacity_pool_core.v0.1
pool_key: sha-256:<provider domain/account/source scope>
provider_trust_domain_id: <canonical domain>
receiver_account_or_contract_scope: <canonical scope>
source_scope: <canonical event-source scope>
slot_limit: <positive integer no greater than frozen maximum>
core_hash: sha-256:<hex>
source_registry_signature: <Signature>
```

```yaml
schema: cairn.future_dependency_assignment.v0.1
assignment_id: sha-256:<pool/action/effect/lineage>
pool_key: sha-256:<same pool>
action_ref: <ObjectRef>
effect_id: sha-256:<hex>
lineage_id: sha-256:<hex>
reserved_slots: 1
state: reserved | transferred | released_on_authenticated_closure |
       released_on_authenticated_horizon | released_on_fenced_non_submission
transferred_dependency_stable_key: sha-256:<hex or null unless transferred>
assignment_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.future_dependency_capacity_pool_state_head.v0.1
pool_key: sha-256:<same core>
pool_core_ref: <immutable ObjectRef>
pool_core_hash: sha-256:<hex>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
slot_limit: <same core value>
available_dependency_slots: <nonnegative integer>
reserved_assignment_map_ref: <enumerable_map_root ObjectRef>
reserved_assignment_map_hash: sha-256:<hex>
reserved_assignment_count: <checked uint64>
state: active | fail_stopped | quarantined
updated_at: <authority-service time>
head_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.future_dependency_capacity_transition_receipt.v0.1
pool_key: sha-256:<same pool>
cause: import_genesis | slot_reserved | slot_transferred |
       authenticated_stream_closure_release |
       authenticated_irreversible_horizon_release |
       fenced_non_submission_release | integrity_fail_stop |
       integrity_repair_verified | trust_quarantine
before_head_ref: <ObjectRef or null only at genesis>
before_head_hash: sha-256:<hex or null>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
before_available_dependency_slots: <integer or null only at genesis>
after_available_dependency_slots: <integer>
before_reserved_assignment_count: <integer or null only at genesis>
after_reserved_assignment_count: <integer>
before_assignment_map_ref: <ObjectRef or null only at genesis>
before_assignment_map_hash: sha-256:<hex or null>
after_assignment_map_ref: <ObjectRef>
after_assignment_map_hash: sha-256:<hex>
assignment_before_ref: <ObjectRef or null for genesis/new reserve>
assignment_before_hash: sha-256:<hex or null>
assignment_after_ref: <ObjectRef or null only at genesis>
assignment_after_hash: sha-256:<hex or null>
transferred_dependency_epoch_receipt_ref: <ObjectRef or null unless transfer>
transferred_dependency_epoch_receipt_hash: sha-256:<hex or null>
release_or_repair_evidence_ref: <horizon/closure/non-submission/repair ObjectRef or null>
release_or_repair_evidence_hash: sha-256:<hex or null>
authority_transaction_id: <same admission/event/closure transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

For every active pool head,
`available_dependency_slots + reserved_assignment_count = slot_limit`; every map
member is one unique assignment in `reserved | transferred`, and no released
assignment remains in the current map. The closed assignment matrix is
`absent → reserved → transferred → released_on_authenticated_closure |
released_on_authenticated_horizon` or
`reserved → released_on_fenced_non_submission`; only terminal release removes
membership and increments availability. Transfer keeps count and availability
unchanged while binding the exact new dependency epoch. `fail_stopped` and
`quarantined` freeze the same map/count and grant no capacity. A typed integrity-
repair audit may move `fail_stopped → active` only with the assignment map,
count, availability, and pool core byte-identical; `quarantined` has no recovery
edge. Every receipt
proves before/after availability, count, map membership, and assignment successor.
Concurrent reservations of the last slot share one head; exactly one CAS can
produce zero availability.

Rollover is an exact CAS: the full accepting epoch becomes `draining`, a fresh
canonical empty epoch becomes the only accepting epoch, and existing action-slot
assignments remain pinned to the draining epoch by their exact assignment refs.
Every live directory entry is an enumerable-map entry pointing to the full epoch
head, manifest-set map, and assignment map. Draining epochs accept only events
consuming pre-reserved assignments. They seal only when all tail and future-
dependency reservations are zero. The sealed chain node retains the resolvable
maps and prior-node ref/hash; no lifecycle rollover or release upgrade discards
them. Generic map scans plus the directory/epoch getters enumerate accepting,
draining, and sealed epochs after restart. There is no fixed live-epoch count;
admission is instead bounded by the principal/provider outstanding-stream limit.

`execution.future_dependency_capacity_pool.import` is the sole insert-only
constructor. It creates the immutable core, active generation-zero head, and
empty assignment map, and emits the transition receipt with `import_genesis`.
Every eligible in-flight commitment carries the exact pool head and assignment
ref/hash. Only provider-event import may atomically transfer the slot to a newly
authenticated source dependency epoch; terminal stream closure, the exact
authenticated irreversible-horizon receipt, or fenced non-submission releases
it. Pool counts without the typed assignment map have no
authority.

Unbounded historical growth is handled by a restrictive barrier, not by an
impossible unbounded atomic transaction:

```yaml
schema: cairn.trust_closure_snapshot_partition_receipt.v0.1
closure_id: sha-256:<same closure>
partition_sequence: <monotonic integer starting at 0>
before_barrier_head_ref: <fail_stopped_snapshotting ObjectRef>
before_barrier_head_hash: sha-256:<hex>
frozen_integrity_inventory_manifest_ref: <barrier-genesis ObjectRef>
frozen_integrity_inventory_manifest_hash: sha-256:<hex>
source_scan_cursor_before: <canonical inventory/reachable-root cursor>
source_scan_cursor_after: <strict successor cursor or canonical end>
snapshot_entries_manifest_ref: <bounded transition manifest ObjectRef>
snapshot_entries_manifest_hash: sha-256:<at most max_closure_partition_entries>
snapshot_entry_map_before_ref: <enumerable_map_root ObjectRef>
snapshot_entry_map_before_hash: sha-256:<hex>
snapshot_entry_map_after_ref: <enumerable_map_root ObjectRef>
snapshot_entry_map_after_hash: sha-256:<hex>
authority_transaction_id: <one stopped snapshot partition transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
trust_coordinator_signature: <Signature>
```

```yaml
schema: cairn.trust_closure_snapshot_completion_receipt.v0.1
closure_id: sha-256:<same closure>
before_barrier_head_ref: <final fail_stopped_snapshotting ObjectRef>
before_barrier_head_hash: sha-256:<hex>
snapshot_partition_receipt_map_ref: <complete enumerable_map_root ObjectRef>
snapshot_partition_receipt_map_hash: sha-256:<hex>
snapshot_entry_map_ref: <complete enumerable_map_root ObjectRef>
snapshot_entry_map_hash: sha-256:<hex>
inventory_and_reachable_sources_to_snapshot_keyset_equality_proof_hash: sha-256:<exact equality>
source_and_partition_scan_completion_proof_hash: sha-256:<canonical end cursors>
completed_source_snapshot_ref: <trust_closure_source_snapshot ObjectRef>
completed_source_snapshot_hash: sha-256:<hex>
completed_plan_core_ref: <trust_closure_plan_core ObjectRef>
completed_plan_core_hash: sha-256:<hex>
after_barrier_state_commitment_hash: sha-256:<fail_stopped_applying successor preimage
                                                excluding this receipt ref/hash>
authority_transaction_id: <one snapshot-completion/plan-install CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
trust_coordinator_signature: <Signature>
```

```yaml
schema: cairn.trust_closure_source_snapshot.v0.1
closure_id: sha-256:<same closure>
trigger_evidence_ref: <authenticated compromise/equivocation ObjectRef>
trigger_evidence_hash: sha-256:<hex>
integrity_inventory_manifest_ref: <current signed ObjectRef>
integrity_inventory_manifest_hash: sha-256:<hex>
integrity_inventory_map_ref: <enumerable_map_root ObjectRef>
integrity_inventory_map_hash: sha-256:<hex>
subject_lifecycle_or_identity_before_heads_map_ref: <enumerable_map_root ObjectRef>
subject_lifecycle_or_identity_before_heads_map_hash: sha-256:<hex>
reverse_index_directory_before_heads_map_ref: <enumerable_map_root ObjectRef>
reverse_index_directory_before_heads_map_hash: sha-256:<hex>
economic_and_action_before_heads_map_ref: <enumerable_map_root ObjectRef>
economic_and_action_before_heads_map_hash: sha-256:<hex>
snapshot_integrity_head_ref: <healthy predecessor ObjectRef>
snapshot_integrity_head_hash: sha-256:<hex>
snapshot_hash: sha-256:<hex>
trust_coordinator_signature: <Signature>
```

```yaml
schema: cairn.trust_closure_snapshot_entry.v0.1
closure_id: sha-256:<same closure>
snapshot_entry_key: sha-256:<source family/stable key>
source_family: integrity_inventory | lifecycle_or_identity_head |
               reverse_index_directory | economic_or_action_head
stable_subject_key: sha-256:<hex>
source_head_ref: <frozen current ObjectRef>
source_head_hash: sha-256:<hex>
reachable_map_or_chain_roots: # canonical bounded vector of immediate authorities
  - role: <closed role for source family>
    object_ref: <ObjectRef>
    object_hash: sha-256:<hex>
entry_hash: sha-256:<hex>
trust_coordinator_signature: <Signature>
```

```yaml
schema: cairn.trust_closure_plan_core.v0.1
closure_id: sha-256:<same closure>
source_snapshot_ref: <trust_closure_source_snapshot ObjectRef>
source_snapshot_hash: sha-256:<hex>
traversal_profile_id: cairn-trust-fixed-point-v0.1
trigger_derived_seed_map_ref: <enumerable_map_root ObjectRef>
trigger_derived_seed_map_hash: sha-256:<hex>
seed_work_item_map_ref: <enumerable_map_root ObjectRef>
seed_work_item_map_hash: sha-256:<hex>
trigger_to_seed_keyset_equality_proof_hash: sha-256:<exact trigger/profile-derived equality>
snapshot_and_seed_scan_completion_proof_hash: sha-256:<canonical end cursors>
result_set_domain: <closed quarantine/remediation result domain>
partition_entry_limit: <positive integer no greater than frozen maximum>
plan_hash: sha-256:<hex>
trust_coordinator_signature: <Signature>
```

```yaml
schema: cairn.trust_closure_result_entry.v0.1
closure_id: sha-256:<same closure>
work_item_key: sha-256:<exact processed item>
work_item_ref: <TrustClosureWorkItem ObjectRef>
work_item_hash: sha-256:<hex>
result_kind: restrictive_transition_committed | already_restricted |
             edge_only_no_state_transition
before_head_ref: <ObjectRef>
before_head_hash: sha-256:<hex>
after_head_ref: <ObjectRef or same before for edge-only/already-restricted>
after_head_hash: sha-256:<hex>
typed_transition_receipt_ref: <ObjectRef or null only for edge-only>
typed_transition_receipt_hash: sha-256:<hex or null>
discovered_work_item_keys_root: sha-256:<complete deterministic outgoing edge set>
source_membership_proof_ref: <same proof ObjectRef>
source_membership_proof_hash: sha-256:<hex>
result_hash: sha-256:<hex>
trust_coordinator_signature: <Signature>
```

```yaml
schema: cairn.trust_closure_work_item.v0.1
closure_id: sha-256:<same closure>
work_item_key: sha-256:<kind/stable target/before head>
kind: dependency_epoch | receiver_identity_epoch | assertion | inflight_action |
      credential_instance | credential_alias | economic_resource | compartment |
      obligation | authority_ledger | action | receiver_stream
target_stable_key: sha-256:<hex>
before_head_ref: <snapshot/current restrictive ObjectRef>
before_head_hash: sha-256:<hex>
discovered_from_work_item_key: sha-256:<hex or canonical seed>
source_membership_proof_ref: <content-addressed proof ObjectRef>
source_membership_proof_hash: sha-256:<proof against snapshot/index map>
item_hash: sha-256:<hex>
trust_coordinator_signature: <Signature>
```

```yaml
schema: cairn.trust_closure_partition_receipt.v0.1
closure_id: sha-256:<same closure>
partition_sequence: <monotonic integer>
before_barrier_head_ref: <current ObjectRef>
before_barrier_head_hash: sha-256:<hex>
before_frontier_map_ref: <enumerable_map_root ObjectRef>
before_frontier_map_hash: sha-256:<hex>
processed_work_items_manifest_ref: <bounded enumerable_transition_manifest ObjectRef>
processed_work_items_manifest_hash: sha-256:<hex>
discovered_work_items_manifest_ref: <bounded enumerable_transition_manifest ObjectRef>
discovered_work_items_manifest_hash: sha-256:<hex>
after_frontier_map_ref: <enumerable_map_root ObjectRef>
after_frontier_map_hash: sha-256:<hex>
typed_state_transition_receipts_root: sha-256:<complete results for processed set>
accumulated_result_map_before_ref: <ObjectRef>
accumulated_result_map_before_hash: sha-256:<hex>
accumulated_result_map_after_ref: <ObjectRef>
accumulated_result_map_after_hash: sha-256:<hex>
authority_transaction_id: <one bounded partition transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
trust_coordinator_signature: <Signature>
```

```yaml
schema: cairn.trust_closure_barrier_state_head.v0.1
closure_id: sha-256:<dependency/event-identity incident and evidence>
subject_family_key: sha-256:<stable compromised subject>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: fail_stopped_snapshotting | fail_stopped_applying | completed_quarantined
trigger_evidence_ref: <authenticated ObjectRef>
trigger_evidence_hash: sha-256:<hex>
frozen_integrity_predecessor_head_ref: <healthy ObjectRef>
frozen_integrity_predecessor_head_hash: sha-256:<hex>
frozen_integrity_inventory_manifest_ref: <predecessor's ObjectRef>
frozen_integrity_inventory_manifest_hash: sha-256:<hex>
snapshot_scan_cursor: <canonical cursor or end; null after snapshotting>
snapshot_entry_map_ref: <enumerable_map_root ObjectRef; empty at genesis>
snapshot_entry_map_hash: sha-256:<hex>
snapshot_partition_receipt_map_ref: <enumerable_map_root ObjectRef; empty at genesis>
snapshot_partition_receipt_map_hash: sha-256:<hex>
snapshot_completion_receipt_ref: <ObjectRef or null while snapshotting>
snapshot_completion_receipt_hash: sha-256:<hex or null>
closure_plan_core_ref: <trust_closure_plan_core ObjectRef or null while snapshotting>
closure_plan_core_hash: sha-256:<hex or null>
source_snapshot_ref: <same snapshot ObjectRef or null while snapshotting>
source_snapshot_hash: sha-256:<hex or null>
current_frontier_map_ref: <enumerable_map_root ObjectRef>
current_frontier_map_hash: sha-256:<hex>
current_frontier_count: <checked uint64>
accumulated_result_map_ref: <enumerable_map_root ObjectRef>
accumulated_result_map_hash: sha-256:<hex>
next_partition: <monotonic integer>
committed_partition_receipt_map_ref: <enumerable_map_root ObjectRef>
committed_partition_receipt_map_hash: sha-256:<hex>
restrictive_integrity_head_ref: <global fail_stopped ObjectRef>
restrictive_integrity_head_hash: sha-256:<hex>
updated_at: <authority-service time>
head_hash: sha-256:<hex>
trust_coordinator_signature: <Signature>
```

```yaml
schema: cairn.trust_closure_completion_receipt.v0.1
closure_id: sha-256:<same closure>
before_barrier_head_ref: <fail_stopped_applying ObjectRef>
before_barrier_head_hash: sha-256:<hex>
after_barrier_head_ref: <completed_quarantined ObjectRef>
after_barrier_head_hash: sha-256:<hex>
source_snapshot_ref: <same frozen ObjectRef>
source_snapshot_hash: sha-256:<hex>
empty_frontier_map_ref: <canonical empty enumerable_map_root ObjectRef>
empty_frontier_map_hash: sha-256:<hex>
accumulated_result_map_ref: <complete enumerable_map_root ObjectRef>
accumulated_result_map_hash: sha-256:<hex>
committed_partition_receipt_map_ref: <complete enumerable_map_root ObjectRef>
committed_partition_receipt_map_hash: sha-256:<hex>
fixed_point_recomputation_hash: sha-256:<snapshot/traversal/frontier/results/receipts>
seed_to_processed_work_item_keyset_equality_proof_hash: sha-256:<all seeds reached>
processed_work_item_to_result_keyset_equality_proof_hash: sha-256:<exact equality>
partition_sequence_to_receipt_keyset_equality_proof_hash: sha-256:<no gap/duplicate>
all_closure_map_scan_completion_proof_hash: sha-256:<canonical end cursors>
integrity_before_head_ref: <current fail_stopped ObjectRef>
integrity_before_head_hash: sha-256:<hex>
integrity_after_head_ref: <healthy successor iff health_restored; otherwise exact before ObjectRef>
integrity_after_head_hash: sha-256:<hex>
remaining_incident_map_ref: <enumerable_map_root ObjectRef>
remaining_incident_map_hash: sha-256:<empty iff restored; exact unchanged before map otherwise>
health_restored: true | false
authority_transaction_id: <one completion/integrity CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
trust_coordinator_signature: <Signature>
```

The first compromise transaction installs a
`fail_stopped_snapshotting` barrier and the global `fail_stopped` integrity
successor before any snapshot or closure work is visible. That genesis contains
only the authenticated trigger, healthy predecessor and frozen inventory
manifest, canonical empty snapshot/progress maps, and cursor zero; it does not
pretend the complete snapshot or plan already exists. Because all execution and
current-trust mutation is now stopped, the coordinator may enumerate the frozen
inventory and every reachable current head in bounded snapshot partitions
without racing a handoff or economic successor. Each partition advances one
canonical cursor and adds at most `max_closure_partition_entries`. The typed
snapshot-completion receipt requires exact source↔snapshot keyset equality and
end cursors, constructs the immutable snapshot and deterministic seed/plan, and
commits a self-excluding next-state commitment. The resulting
`fail_stopped_applying` barrier points one-way to that receipt and recomputes the
commitment, atomically installing the snapshot and plan without a receipt/head
cycle. Prebuilding the
snapshot while healthy, installing a plan before the complete stopped scan, or
starting semantic closure from `fail_stopped_snapshotting` is invalid.
While the barrier exists, every read that could present current trust, every
review, reservation, gate, redemption, handoff, provider-event classification,
or capacity claim denies. The coordinator then commits deterministic partitions
of at most `max_closure_partition_entries`, each removing its exact processed
prefix from the frontier, adding every newly discovered edge under the frozen
traversal profile, and binding source membership proofs and typed transitions.
The final transaction requires the canonical empty frontier, recomputes the
fixed-point result root from the frozen snapshot plus every partition receipt,
publishes terminal quarantine, and emits the typed completion receipt. It may
restore global health only when the remaining incident map is canonical empty;
otherwise the same receipt proves the barrier completed while integrity remains
fail-stopped for other incidents. This is a closed union. With
`health_restored:false`, the integrity after ref/hash and pending-incident map are
byte-identical to the before values and this completion performs no integrity
mutation; its resolved closure remains admissible evidence for the later
all-incidents repair. With `health_restored:true`, the ordinary all-incidents
repair transition produces the healthy successor and canonical empty incident
map. A partial-resolution integrity successor is not a v0.1 edge. Intermediate restrictive writes are
never presented as complete or green. This protocol replaces every earlier
phrase requiring an arbitrarily large compromise closure in one transaction;
small closures MAY still use one transaction as a one-partition instance.

Seed derivation is not coordinator discretion. The traversal profile computes
the exact initial seed keys from the typed trigger and frozen snapshot; the two
seed maps must prove keyset equality and completed scans. Each processed work
item has exactly one typed result with the same key, every discovered edge is
inserted into the frontier or already has a result, and every consecutive
partition sequence has exactly one stored receipt. Completion verifies all
three keyset-equality proofs plus canonical end cursors. Missing seed/result/
partition schemas, opaque roots, coordinator-supplied omissions, or unmatched
work/results keep the barrier and global fail-stop in place.

```yaml
schema: cairn.historical_dependency_acceptance_evidence.v0.1
evidence_kind: retired_pre_retirement_anchor | independent_policy_revalidation |
               independent_source_reauthentication
dependency_kind: <source_credential or policy kind>
dependency_stable_key: sha-256:<hex>
reserved_lifecycle_head_ref: <active ObjectRef bound at handoff>
reserved_lifecycle_head_hash: sha-256:<hex>
historical_generation_terminal_head_ref: <retired ObjectRef for bound generation>
historical_generation_terminal_head_hash: sha-256:<hex>
current_family_lifecycle_head_ref: <current retired head or active successor ObjectRef>
current_family_lifecycle_head_hash: sha-256:<hex>
lifecycle_transition_history_head_ref: <current lifecycle_transition_history_state_head ObjectRef>
lifecycle_transition_history_head_hash: sha-256:<hex>
lifecycle_transition_map_ref: <enumerable_map_root ObjectRef>
lifecycle_transition_map_hash: sha-256:<complete authoritative history>
lifecycle_transition_start_sequence: <reserved sequence>
lifecycle_transition_end_sequence: <current sequence>
lifecycle_transition_count: <checked end minus start>
receiver_event_import_ref: <exact authenticated ObjectRef>
receiver_event_import_hash: sha-256:<hex>
authenticated_event_digest: sha-256:<hex>
receiver_account_or_contract_scope: <exact scope>
pre_retirement_anchor_ref: <independent transparency ObjectRef or null>
pre_retirement_anchor_hash: sha-256:<hex or null>
pre_retirement_anchor_time: <authenticated time or null>
revalidation_profile_ref: <new active independent profile ObjectRef or null>
revalidation_profile_hash: sha-256:<hex or null>
revalidation_profile_lifecycle_head_ref: <current active ObjectRef or null>
revalidation_profile_lifecycle_head_hash: sha-256:<hex or null>
revalidation_receipt_ref: <independent authority ObjectRef or null>
revalidation_receipt_hash: sha-256:<hex or null>
reauthentication_source_credential_authority_key: sha-256:<distinct active key or null>
reauthentication_source_credential_core_ref: <ObjectRef or null>
reauthentication_source_credential_core_hash: sha-256:<hex or null>
reauthentication_source_credential_head_ref: <current active ObjectRef or null>
reauthentication_source_credential_head_hash: sha-256:<hex or null>
reauthentication_source_credential_generation: <integer or null>
authenticated_reauthentication_receipt_ref: <ObjectRef or null>
authenticated_reauthentication_receipt_hash: sha-256:<hex or null>
evidence_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The schema is a closed union. `retired_pre_retirement_anchor` requires an
independent anchor whose authenticated time is strictly before the retirement
transition effective time and whose digest commits the exact event bytes,
credential identity, account/stream scope, and sequence; it forbids every
revalidation and reauthentication field. The current family head may already be
a same-authority active successor, but the evidence still identifies the exact
retired historical generation that authenticated the anchored event.
`independent_policy_revalidation` is valid only for a policy dependency and
requires a currently
active, separately authorized profile applicable to the exact same event/schema/
scope and its signed revalidation receipt; it forbids every anchor field. The
profile cannot be the retired dependency under another identifier. Receiver
timestamps, newly presented signatures, and adapter assertions are not anchors.
`independent_source_reauthentication` is valid only for a source-credential
dependency and requires an authenticated event-verification receipt under a
distinct current active source-credential authority/core/head/generation with
the same provider domain, account/contract, and declared source scope. It forbids
anchor and policy-revalidation fields. Assertion registration includes both the
historical source dependency and the active reauthentication dependency; a
policy receipt can never authenticate an event source.
Only allowlisted `execution.provider_event.import` constructs this evidence while
classifying the exact event; it grants no future event authority.

```yaml
schema: cairn.trust_dependency_registration_receipt.v0.1
assertion_registration_key: sha-256:<same independent key>
receiver_event_import_ref: <pre-existing raw import ObjectRef>
receiver_event_import_hash: sha-256:<hex>
resulting_trust_state: accepted | quarantined_due_to_preexisting_restriction
preexisting_restriction_receipts_root: sha-256:<canonical empty iff accepted;
                                                   nonempty iff quarantined>
released_exposure_present: true | false  # same exact remediation-required semantics
released_exposure_commitment_ref: <ObjectRef or null iff false>
released_exposure_commitment_hash: sha-256:<hex or null iff false>
registration_predecessor_kind: inflight_promotion | prior_assertion_chain
promoted_inflight_execution_key: sha-256:<required iff inflight_promotion>
promoted_inflight_commitment_ref: <ObjectRef or null iff prior assertion>
promoted_inflight_commitment_hash: sha-256:<hex or null iff prior assertion>
prior_receiver_event_import_ref: <ObjectRef or null iff first event>
prior_receiver_event_import_hash: sha-256:<hex or null iff first event>
prior_assertion_registration_key: sha-256:<hex or null iff first event>
prior_receiver_assertion_trust_state_head_ref: <current ObjectRef or null iff first>
prior_receiver_assertion_trust_state_head_hash: sha-256:<hex or null iff first>
dependency_commits:
  - dependency_kind: <closed complete-set kind>
    dependency_ref: <ObjectRef>
    dependency_hash: sha-256:<hex>
    predecessor_bound_lifecycle_or_identity_head_ref: <ObjectRef>
    predecessor_bound_lifecycle_or_identity_head_hash: sha-256:<hex>
    assertion_lifecycle_or_identity_head_ref: <ObjectRef>
    assertion_lifecycle_or_identity_head_hash: sha-256:<hex>
    generation_transition_kind: unchanged | source_credential_continuity |
                                retired_pre_retirement_anchor |
                                independent_policy_revalidation |
                                independent_source_reauthentication
    generation_continuity_history_head_ref: <ObjectRef or null unless source continuity>
    generation_continuity_history_head_hash: sha-256:<hex or null>
    generation_continuity_map_ref: <enumerable_map_root ObjectRef or null>
    generation_continuity_map_hash: sha-256:<hex or null>
    generation_continuity_transition_range: <start/end sequence or null>
    historical_transition_history_head_ref: <ObjectRef or null unless historical branch>
    historical_transition_history_head_hash: sha-256:<hex or null>
    historical_transition_map_ref: <enumerable_map_root ObjectRef or null>
    historical_transition_map_hash: sha-256:<hex or null>
    historical_transition_range: <start/end sequence or null>
    historical_acceptance_evidence_ref: <ObjectRef or null unless retired branch>
    historical_acceptance_evidence_hash: sha-256:<hex or null>
    before_state_head_ref: <ObjectRef>
    before_state_head_hash: sha-256:<hex>
    before_directory_head_ref: <ObjectRef>
    before_directory_head_hash: sha-256:<hex>
    before_assigned_epoch_state_head_ref: <ObjectRef>
    before_assigned_epoch_state_head_hash: sha-256:<hex>
    before_finality_assertions_root: sha-256:<hex>
    before_released_exposure_root: sha-256:<hex>
    before_finality_manifest_ref: <ObjectRef>
    before_finality_manifest_hash: sha-256:<hex>
    before_exposure_manifest_ref: <ObjectRef>
    before_exposure_manifest_hash: sha-256:<hex>
    before_inflight_root: sha-256:<contains promoted leaf iff first event;
                                   otherwise exact unchanged current root>
    before_inflight_manifest_ref: <ObjectRef>
    before_inflight_manifest_hash: sha-256:<hex>
    before_reserved_future_assertion_slots: <integer>
    before_reserved_reauthentication_dependency_slots: <integer>
    slot_assignment_before_ref: <ObjectRef>
    slot_assignment_before_hash: sha-256:<hex>
    before_fence: <integer>
    after_state_head_ref: <ObjectRef>
    after_state_head_hash: sha-256:<hex>
    after_directory_head_ref: <ObjectRef>
    after_directory_head_hash: sha-256:<hex>
    after_assigned_epoch_state_head_ref: <ObjectRef>
    after_assigned_epoch_state_head_hash: sha-256:<hex>
    after_finality_assertions_root: sha-256:<before assertion root plus exact assertion leaf>
    after_released_exposure_root: sha-256:<before exposure root plus exact exposure leaf,
                                            or unchanged only when no economic remediation dependency exists>
    after_finality_manifest_ref: <ObjectRef>
    after_finality_manifest_hash: sha-256:<hex>
    after_exposure_manifest_ref: <ObjectRef>
    after_exposure_manifest_hash: sha-256:<hex>
    after_inflight_root: sha-256:<before minus promoted leaf iff first event;
                                  otherwise exactly before>
    after_inflight_manifest_ref: <ObjectRef>
    after_inflight_manifest_hash: sha-256:<hex>
    after_reserved_future_assertion_slots: <before minus one; unused tail releases only
                                               on authenticated stream closure>
    after_reserved_reauthentication_dependency_slots: <before, before minus one on
                                                           atomic transfer, or stream-closure release>
    slot_assignment_after_ref: <ObjectRef>
    slot_assignment_after_hash: sha-256:<hex>
    after_fence: <before + 1>
authority_transaction_id: <stable transaction ID>
registered_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The raw receiver-event import record is created first and contains no dependency
or trust-head refs. The service then CASes each dependency's aggregate cursor,
epoch directory, assigned epoch head, and assertion/exposure/in-flight manifests.
The first-event branch removes the exact prior in-flight leaf from that assigned
epoch's third root/manifest. The later-event branch proves the current stream's
prior event/import, assertion-registration key, and trust head and leaves the
assigned epoch's in-flight root and manifest byte-identical. Both branches prove
the reservation's immutable slot assignment, update the same assigned epoch,
advance the one fence on every aggregate dependency head, and emit
the registration receipt; only afterward does the trust head reference that
receipt. Provider-event import promotes the in-flight action only for the first
event, or chains a later event from the exact prior assertion, while adding the
new assertion and any released exposure in this complete-set dependency vector
in the same transaction as trust/finality;
it cannot release exposure first. When every dependency is currently eligible,
the new trust head is `accepted`. If any dependency was already restrictively
transitioned after handoff, the exact prior restriction receipt set is mandatory,
the new trust head is immediately `quarantined`, its quarantine receipt ref is
the same acyclic registration receipt, and no capacity is released. This is the
only post-compromise first-event promotion branch. Every dependency normally
requires identical predecessor and new-assertion lifecycle/identity heads.
`predecessor_bound_lifecycle_or_identity_head_*` means the exact in-flight head
for `inflight_promotion` and the exact prior assertion's registered head for
`prior_assertion_chain`; it is never inferred from the current family head. The
closed exceptions are: `source_credential_continuity`, where the
stable authority key/core and scope remain identical and the assertion uses the
current active later generation; `retired_pre_retirement_anchor`; and
`independent_policy_revalidation` for policy dependencies; and
`independent_source_reauthentication` for source-credential dependencies. Each
exception binds the complete lifecycle
transition chain and its branch-exact historical evidence object. No exception
changes a provider account, sublimit, executor binding, authority core, receiver
scope, or event bytes. A missing/ambiguous transition, mixed historical branch,
post-retirement anchor, self-revalidation, or any other generation substitution
denies. The heads are separate from lifecycle so
routine registrations do not invalidate unrelated active work. Finality,
accounting, review, taint, receiver-scope-selection-issuer, receiver-channel,
confirmation-assurance, or confirmation-verifier
policy, source-credential authority, executor-credential binding, adapter identity, provider account/sublimit,
protection attestation, or execution-release compromise first installs its
restrictive lifecycle/identity head only as part of
`execution.trust_compromise.commit`; the same transaction CAS-verifies the exact
current aggregate dependency head/fence, epoch directory, every affected live or
sealed epoch, and each affected epoch's three manifests, freezes all value paths
on affected roots, and applies the
quarantine/exposure-restoration changes and receipt. No half-committed lifecycle,
trust, obligation, or compartment view is observable. Every registration receipt
recomputes both leaf grammars and proves both before/after root pairs; one pair, a
singular ambiguous root, or a released-capacity event with an unchanged exposure
root is invalid. Every
current view resolves the current successor of every dependency head, not only
the profile. Missing, stale, omitted, duplicate, extra, or racing dependencies
leave delegated value frozen. `retired` credentials accept only assertions
through one of those two encoded historical-evidence branches;
emergency-revoked/quarantined/expired credentials always deny new assertions.

The immutable action/lineage finalization receipt remains historical evidence and
its completion tombstone continues to block replay. Current activity color,
settlement confidence, release eligibility, limits, and agent advice additionally
resolve the current assertion-trust head plus every current policy (including
receiver-channel, confirmation-assurance, and confirmation-verifier policy), credential,
adapter, provider-account/sublimit, protection-attestation, and execution-release
dependency head; they
cannot present a quarantined
historical receipt as currently trusted. Expiry after submission
does not silently swap profiles or strand history. Every lifecycle/trust
transition is append-only and auditable.

The v0.1 transition matrix is closed: `active → retired | emergency_revoked |
quarantined`, and `retired → emergency_revoked | quarantined` when later evidence
invalidates historical trust. `emergency_revoked` and `quarantined` are terminal;
no state can return to active. Recovery publishes a new immutable
release/policy and separately migrates only newly authorized work. Transition
operations are authority-only CAS mutations over expected current head/sequence,
reason, evidence refs, and effective time; principals, runtimes, models, and
provider adapters cannot call them.

An `emergency_revoked` or `quarantined` cause for an execution release, policy,
source credential, executor-credential binding, receiver-channel/confirmation policy or verifier profile,
adapter identity, provider account, provider sublimit, quote-source credential,
seller-inventory authority, copy-ownership-registry authority, or protection
attestation is
not permitted as a standalone visible transition. Its family-specific transition
operation remains the sole head writer but accepts that cause only with the exact
`execution.trust_compromise.commit` transaction ID, prepared complete dependency/
economic-root closure, and same-transaction commit fence. Ordinary scheduled
retirement/expiry or non-compromise active-generation updates may use their normal
operation directly. A compromise writer call without the coordinator, or a
coordinator that exposes one successor before root freeze/restoration, fails its
CAS and emits no head.

Source-credential lifecycle is likewise closed over one stable event-source
authority: `active(g) → active(g+1) | retired(g) | expired(g) |
emergency_revoked | quarantined`; `retired(g) | expired(g) → active(g+1)` only
with authenticated same-authority continuity, or to `emergency_revoked |
quarantined` for coordinator-backed later compromise. Emergency-revoked and
quarantined authority state is terminal. Its transition operation is credential-
authority-only and CASes the expected current head, stable authority core,
dependency fence, reason/evidence, and effective time, emitting the exact
SourceCredentialLifecycleTransitionReceipt. A successor generation never
reactivates the old credential. Compromise causes are accepted only inside the
coordinator transaction above.

### 5.4 `ContextTaintDecision`

```yaml
schema: cairn.context_taint_decision.v0.2
decision_id: urn:uuid:<uuid>
principal_id: <principal>
action_proposal_ref: <ObjectRef>
action_proposal_hash: sha-256:<hex>
effect_id: sha-256:<hex>
capability: <exact capability>
consequential_field_registry_ref: <immutable ObjectRef>
field_bindings:
  - field_id: <closed capability-specific field id>
    canonical_value_hash: sha-256:<JCS of exact value>
    authoritative_source_ref: <ObjectRef>
    source_path: <JSON Pointer>
    source_signer_role: principal | cairn_authority | authenticated_receiver |
                        authenticated_counterparty | policy_authority
input_provenance_refs: []
blocked_flows: []
policy_hash: sha-256:<hex>
result: allow | block
issued_at: <time>
expires_at: <time>
decision_hash: sha-256:<hex>
policy_service_signature: <Signature>
```

The capability-specific registry is closed and requires complete-set equality.
At minimum it covers target, operation kind, provider, receiver, receiver account/
contract scope and operation namespace, payee/account,
amount components/total, rail, executor, credential audience, compartment and
economic resource, provider-account head/generation, child-sublimit head/
generation/proof, quote, copies, terms, evidence, shipping/contact destination,
confirmation policy, idempotency/lineage, disclosure audience, and disclosed
field set. Unknown, omitted, duplicated, or extra consequential fields deny.

Model, open-web, OCR, image metadata, tool prose, and free text may propose an
authoritative ObjectRef for later resolution; they cannot originate an execution
value. A runtime-signed proposal is not an authoritative source for a value that
requires principal, counterparty, receiver, or policy authority. This object
records provenance routing, not factual truth.

### 5.5 `ExecutionReviewReceipt`

```yaml
schema: cairn.execution_review_receipt.v0.2
review_id: urn:uuid:<uuid>
principal_id: <principal>
execution_integrity_state_head_ref: <current healthy ObjectRef>
execution_integrity_state_head_hash: sha-256:<hex>
action_proposal_ref: <ObjectRef>
action_proposal_hash: sha-256:<hex>
effect_descriptor_ref: <ObjectRef>
effect_id: sha-256:<hex>
agent_runtime_binding_ref: <ObjectRef or null for principal-direct>
compartment_ref: <ObjectRef or null for non-value action>
economic_resource_exposure_state_head_ref: <current ObjectRef or null for non-value>
economic_resource_exposure_state_head_hash: sha-256:<hex or null>
economic_resource_cap_state_head_ref: <current ObjectRef or null for non-value>
economic_resource_cap_state_head_hash: sha-256:<hex or null>
principal_limit_policy_state_head_refs: <exact current complete set>
protection_attestation_ref: <ObjectRef or null for non-value action>
protection_attestation_hash: sha-256:<hex or null>
protection_attestation_lifecycle_head_ref: <active ObjectRef or null>
protection_attestation_lifecycle_head_hash: sha-256:<hex or null>
provider_account_identity_head_ref: <ObjectRef or null for non-value action>
account_generation: <integer or null for non-value action>
provider_account_identity_trust_overlay_head_ref: <current eligible ObjectRef or null for non-value>
provider_account_identity_trust_overlay_head_hash: sha-256:<hex or null>
provider_sublimit_identity_head_ref: <ObjectRef or null>
provider_sublimit_identity_head_hash: sha-256:<hex or null>
provider_sublimit_id: <canonical id or null>
sublimit_generation: <integer or null>
provider_sublimit_identity_trust_overlay_head_ref: <current eligible ObjectRef or null when no sublimit>
provider_sublimit_identity_trust_overlay_head_hash: sha-256:<hex or null>
quote_snapshot_ref: <ObjectRef or null for nonfinancial action>
quote_hash: sha-256:<hex or null>
provider_quote_import_receipt_ref: <ObjectRef or null for nonfinancial action>
provider_quote_import_receipt_hash: sha-256:<hex or null>
quote_source_credential_lifecycle_head_ref: <current active ObjectRef or null>
quote_source_credential_lifecycle_head_hash: sha-256:<hex or null>
quote_source_credential_generation: <integer or null>
quote_importer_adapter_lifecycle_head_ref: <current active ObjectRef or null>
quote_importer_adapter_lifecycle_head_hash: sha-256:<hex or null>
context_taint_decision_ref: <ObjectRef>
taint_decision_hash: sha-256:<hex>
accounting_policy_ref: <ObjectRef or null for nonfinancial action>
receiver_finality_profile_ref: <ObjectRef for every registered execution capability>
receiver_sequence_epoch_selector_state_head_ref: <current active ObjectRef for every external effect>
receiver_sequence_epoch_selector_state_head_hash: sha-256:<hex or null only for receiverless local effect>
receiver_sequence_epoch_selector_key: sha-256:<stable key or null only for receiverless local effect>
receiver_sequence_epoch_proof_ref: <current authenticated ObjectRef or null only for receiverless local effect>
receiver_sequence_epoch_proof_hash: sha-256:<hex or null>
receiver_sequence_epoch_generation: <current monotonic generation or null>
receiver_account_or_contract_scope: <canonical finality-matching scope>
receiver_operation_namespace: <canonical finality-matching namespace>
explicit_scope_selection_proof_ref: <typed ObjectRef for every external effect;
                                      null only for receiverless local effect>
explicit_scope_selection_proof_hash: sha-256:<hex or null under same exception>
receiver_channel_policy_ref: <ObjectRef or null unless receiver-channel effect>
receiver_channel_policy_hash: sha-256:<hex or null>
receiver_channel_policy_lifecycle_head_ref: <current active ObjectRef or null>
receiver_channel_policy_lifecycle_head_hash: sha-256:<hex or null>
executor_target: <exact target>
credential_audience: <exact audience>
executor_credential_binding_head_ref: <current ObjectRef>
executor_credential_binding_head_hash: sha-256:<hex>
executor_credential_instance_state_head_ref: <current active ObjectRef>
executor_credential_instance_state_head_hash: sha-256:<hex>
credential_broker_authority_state_head_ref: <current active ObjectRef>
credential_broker_authority_state_head_hash: sha-256:<hex>
cancellation_cost_attestation_ref: <ObjectRef or null unless cancellation>
cancellation_cost_attestation_hash: sha-256:<hex or null>
cancellation_fee_source_state_head_ref: <ObjectRef or null unless cancellation>
cancellation_fee_source_state_head_hash: sha-256:<hex or null>
cancellation_fee_source_generation: <integer or null unless cancellation>
closed_terms_or_cart_hash: sha-256:<hex or null>
copy_ids: []
seller_inventory_context_kind: checkout | ordinary_deal | adopted_obligation |
                               null when inventory is inapplicable
seller_inventory_context_ref: <ObjectRef or null>
seller_inventory_context_hash: sha-256:<hex or null>
seller_inventory_stage: ordinary_held | checkout_prepared | checkout_held |
                        adopted_consumed | null
seller_inventory_state_head_ref: <current stage-matching ObjectRef or null>
seller_inventory_state_head_hash: sha-256:<hex or null>
seller_copy_lease_heads_root: sha-256:<exact current global-copy set or null>
seller_inventory_transition_receipt_ref: <stage-matching prepare/commit/consume ObjectRef or null only when inapplicable>
seller_inventory_transition_receipt_hash: sha-256:<hex or null>
seller_inventory_authority_state_head_ref: <current active ObjectRef or null when inventory inapplicable>
seller_inventory_authority_state_head_hash: sha-256:<hex or null>
seller_inventory_authority_signing_key_generation: <integer or null>
copy_ownership_registry_authority_state_head_ref: <current active ObjectRef or null when inventory inapplicable>
copy_ownership_registry_authority_state_head_hash: sha-256:<hex or null>
copy_ownership_registry_authority_signing_key_generation: <integer or null>
checkout_readiness_receipt_ref: <ObjectRef required iff stage == checkout_held>
checkout_readiness_receipt_hash: sha-256:<hex or null>
evidence_snapshot_hash: sha-256:<hex or null>
review_kind: cairn_deterministic | provider_native | combined
provider_review_artifact_ref: <authenticated ObjectRef or null>
reviewer_service_id: <service>
reviewer_version: <version>
precondition_results:
  - code: <stable code>
    authority_label: enforced | legible | judged
    result: pass | warn | block | unknown
    source_refs: []
warning_codes: []
required_acknowledgement_codes: []
unknown_codes: []
required_confirmation_assurance_policy_ref: <current applicable ObjectRef>
required_confirmation_assurance_policy_hash: sha-256:<hex>
required_confirmation_assurance_policy_lifecycle_head_ref: <current active ObjectRef>
required_confirmation_assurance_policy_lifecycle_head_hash: sha-256:<hex>
allowed_confirmation_verifier_profile_refs_root: sha-256:<exact policy-selected set>
review_policy_hash: sha-256:<hex>
reviewed_at: <time>
expires_at: <time>
review_hash: sha-256:<hex>
review_service_signature: <Signature>
not_claiming: [principal_authorization, execution, receiver_acceptance, wisdom]
```

Inventory fields form a closed stage union. Ordinary bindable work requires
`ordinary_deal + ordinary_held` and the exact held head/receipt. Direct paired
checkout review, both BindingSets, and its batch authority reservation require
`checkout + checkout_prepared`; their transition template binds the prepared
head and permits only the later readiness-proved `prepared → held` successor.
`checkout_held` is valid only for a refreshed review and BindingSet that carry
that exact signed CheckoutReadinessReceipt ref/hash; a seller commit-held receipt
alone is insufficient. Every other stage requires both readiness fields null.
Existing receiver-bound adoption requires
`adopted_obligation + adopted_consumed`, with the context ref/hash identifying
the exact prior accepted obligation and seller-consumption chain. Every other
context/stage cross-product, including a generic “held whenever applicable” rule,
is schema-invalid. Downstream objects preserve the predecessor stage and carry
the exact signed successor receipt rather than mutating the earlier review.
Every non-null inventory stage also requires both commerce-signer authority
heads/generations above to be current and active. Their exact stable dependency
keys enter the review's complete trust set; a stale, retired, revoked,
quarantined, or substituted signer denies even when the inventory signature
cryptographically verifies.

Credential and channel-policy fields form a separate closed union. Every
bindable offer, counteroffer, or terms acceptance is a receiver-channel effect
with `binding_obligation` semantics and requires the exact current receiver-
channel policy lifecycle in Review, BindingSet, gate, redemption, and handoff.
Every nonfinancial external effect uses the same chain with `nonbinding`
semantics. Financial-value provider-account effects instead use the complete
provider-account/resource credential branch and forbid receiver-channel fields
unless a future frozen capability explicitly requires a second independent
outbound channel. No capability may select a credential branch by implementation
convenience.
Cancellation uses none of those ordinary branches: it requires the exact
receiver-cancellation derivation and continuity tuple repeated through the
complete authorization-to-handoff chain.

Delegated execution denies every warning. Human-each-time execution requires an
`ActionAuthorization` that binds `review_hash` and explicitly lists every
acknowledged non-blocking warning code. Blocks and unknown severities cannot be
overridden. Required acknowledgements are a separate closed set: they describe
true transaction semantics rather than a waivable risk signal, survive an empty
warning set, and must be reproduced exactly through review, BindingSet, authority,
gate, and receipt. The v0.1 set contains only
`TERMS_MAY_BIND_BEFORE_PAYMENT`. It is mandatory for both roles in a direct
paired checkout because authenticated terms may bind while payment is later
blocked. A one-shot authority carries the code in
`acknowledged_transaction_semantics`; a mandate must have accepted the same code
at its principal-present issuance. If policy requires provider-native review, a
Cairn-only review denies.

### 5.6 Authoritative pause, revoke, resume, and freeze

The principal signs a command; the authority service commits state and signs the
result. The command never claims effectiveness.

```yaml
schema: cairn.recovery_grant.v0.1
recovery_grant_id: urn:uuid:<uuid>
principal_id: <principal>
recovery_key_id: <key>
control_namespace_ref: <exact current ObjectRef>
control_namespace_generation: <exact current integer>
allowed_control_actions: [pause | freeze_new_redemptions | revoke]
allowed_scopes: [all_agents | connection | runtime | mandate | compartment]
readable_status_fields: [state | sequence | pause_epoch | revocation_nonce |
                         outstanding_action_count]
not_before: <time>
expires_at: <time>
revocation_nonce: <integer>
use_limit: 1
grant_hash: sha-256:<hex>
principal_signature: <Signature>
not_claiming: [resume_authority, new_economic_authority, detailed_audit_access]
```

```yaml
schema: cairn.recovery_status_projection.v0.1
recovery_grant_ref: <immutable RecoveryGrant ObjectRef>
recovery_grant_state_head_ref: <current active or consumed ObjectRef>
recovery_grant_state_head_hash: sha-256:<hex>
recovery_grant_state: active | consumed
recovery_use_request_digest: sha-256:<hex or null unless consumed replay>
recovery_transition_receipt_ref: <ObjectRef or null unless consumed replay>
control_namespace_ref: <same current ObjectRef>
control_namespace_generation: <same current integer>
scope: <one grant-allowed scope>
target_commitment: sha-256:<opaque authorized target commitment>
state: active | paused | frozen_new_redemptions | revoked | expired
sequence: <integer>
pause_epoch: <integer>
revocation_nonce: <integer>
outstanding_action_count: <integer>
observed_at: <authority-service time>
projection_hash: sha-256:<hex>
authority_service_signature: <Signature>
not_claiming: [mandate_detail, payee, amount, evidence, audit_detail]
```

```yaml
schema: cairn.recovery_grant_state_head.v0.1
recovery_grant_ref: <ObjectRef>
recovery_grant_hash: sha-256:<hex>
control_namespace_ref: <same ObjectRef>
control_namespace_generation: <same integer>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: active | consumed | revoked | expired
revocation_nonce: <monotonic integer>
transition_receipt_ref: <ObjectRef or null at active genesis>
updated_at: <authority-service time>
state_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.recovery_grant_transition_receipt.v0.1
recovery_grant_ref: <same ObjectRef>
before_head_ref: <active ObjectRef>
before_head_hash: sha-256:<hex>
transition: consume | revoke | expire
recovery_use_request_digest: sha-256:<exact signed restrictive-use digest or null unless consume>
control_authorization_ref: <ObjectRef or null unless consume>
control_successor_commitment_hash: sha-256:<self-excluding control/map/leaf successor
                                           tuple or null unless consume>
next_state_commitment_hash: sha-256:<self-excluding successor commitment>
authority_transaction_id: <same control transaction for consume>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Recovery is restrictive by default. A recovery grant cannot resume agents,
issue authority, widen data access, inspect mandate/payee/evidence detail, or
cancel a receiver action. After recovery, the newly authenticated principal must
issue fresh authority and a fresh principal-signed resume control.
Its only read operation is `execution.recovery_status.get`, which returns the
closed RecoveryStatusProjection above. `expired` is emitted only for a
connection-scoped control entry paired with an expired connection head; it is
forbidden for every other scope. Recovery authentication is never accepted
by mandate, authorization, compartment, control-head, activity-detail, receipt,
or other private `get` operations.
It is one-shot: the restrictive control CAS must also advance the exact current
grant head `active → consumed` and emit its transition receipt. The principal may
advance `active → revoked`; authenticated authority time may advance
`active → expired`; all terminal states have no successor. Every use checks the
same namespace ref/generation and current nonce. Namespace rotation makes every
prior-generation grant ineligible before the new active control head is visible;
no old recovery key can act on the new generation, even if its wall-clock expiry
has not passed.
The initial signed recovery use carries a fresh semantic idempotency nonce; the
service hashes the complete signed request into `recovery_use_request_digest`.
After `active → consumed`, the same recovery key may call
`execution.recovery_status.get` only with that byte-identical signed request and
digest. It returns the already committed transition receipt plus its minimal
post-control projection and performs no mutation. A different digest, target,
control action, nonce, namespace generation, or a consumed grant lacking the
receipt denies. Thus a lost response is recoverable without turning a consumed
key into continuing read or mutation authority. Revoked/expired grants have no
such replay path. The recovery transition receipt is upstream: it contains only
the prior grant/control heads and self-excluding successor commitments. The
ExecutionControlReceipt references it and both successor heads recompute their
respective commitments; no recovery receipt points back to the later control
receipt. The successor grant head points one way to the transition receipt, so
there is no receipt↔receipt or receipt↔head content cycle.

The Phase-1 schema-only bundle does not implement this recovery transaction or
the `execution.recovery_status.get` operation. Until a separately frozen
recovery writer and replay validator exist, any control authorization carrying
the recovery tuple and any execution-control receipt carrying recovery evidence
is rejected as `phase1_recovery_control_unsupported`. Phase-1 direct-principal
controls do not infer recovery authority from these future-profile shapes.

```yaml
schema: cairn.execution_control_authorization.v0.1
control_authorization_id: urn:uuid:<uuid>
principal_id: <principal>
scope: all_agents | connection | runtime | mandate | compartment | action
target_kind: global | object_ref | compartment_resource | action_occurrence
target_ref: <ObjectRef; required only for connection/runtime/mandate>
compartment_control_key: sha-256:<hex; required only for compartment>
action_control_key: sha-256:<hex; required only for action>
control_action: pause | resume | revoke | freeze_new_redemptions
reason_code: user_requested | suspected_compromise | policy_violation |
             recovery | administrative_hold
expected_control_head_hash: sha-256:<hex>
expected_pause_epoch: <integer>
expected_revocation_nonce: <integer>
recovery_grant_ref: <ObjectRef or null for direct principal>
recovery_grant_state_head_ref: <active ObjectRef or null for direct principal>
recovery_grant_state_head_hash: sha-256:<hex or null>
recovery_use_idempotency_nonce: <fresh nonce or null for direct principal>
requested_at: <principal time>
expires_at: <short expiry>
control_authorization_hash: sha-256:<hex>
principal_or_recovery_signature: <Signature matching principal or exact grant>
not_claiming: [effective, receiver_cancellation, irreversible_effect_undone]
```

The target union is exact: `all_agents` requires `global` and all target fields
absent; connection/runtime/mandate require `object_ref` plus one canonical ref
and forbid semantic keys; compartment requires
`compartment_resource` plus one compartment-control key and forbids refs/action
keys; action requires `action_occurrence` plus one action-control key and forbids
the ref and compartment key.

```yaml
schema: cairn.execution_control_namespace.v0.1
principal_id: <principal>
authority_namespace: <generation-specific server namespace>
generation: <monotonic integer>
prior_namespace_ref: <ObjectRef or null for generation 0>
prior_revoked_head_ref: <ObjectRef or null for generation 0>
created_at: <authority-service time>
namespace_hash: sha-256:<hex>
authority_service_signature: <Signature>
principal_high_assurance_signature: <Signature for every generation>
```

```yaml
schema: cairn.execution_control_state_head.v0.1
principal_id: <principal>
authority_namespace: <server-owned namespace>
control_namespace_ref: <cairn.execution_control_namespace.v0.1 ObjectRef>
control_namespace_generation: <integer>
sequence: <monotonic integer>
previous_head_hash: sha-256:<hex or null>
global_state: active | paused | frozen_new_redemptions | revoked
global_pause_epoch: <monotonic integer>
global_revocation_nonce: <monotonic integer>
scoped_control_map_ref: <enumerable_map_root ObjectRef>
scoped_control_map_hash: sha-256:<hex>
scoped_control_head_count: <checked uint64>
scoped_control_heads_root: sha-256:<must equal map entries_root>
updated_at: <authority-service time>
head_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The leaf key is derived, never selected by the caller:

```text
JCS-SHA256({
  schema: "cairn.scoped_execution_control_leaf_key_preimage.v0.1",
  principal_id,
  control_namespace_generation,
  scope,
  target_kind,
  target_ref,
  compartment_control_key,
  action_control_key
})
```

```yaml
schema: cairn.scoped_execution_control_leaf_state_head.v0.1
scoped_control_leaf_key: sha-256:<namespace generation/scope/canonical target>
principal_id: <principal>
control_namespace_generation: <integer>
scope: connection | runtime | mandate | compartment | action
target_kind: object_ref | compartment_resource | action_occurrence
target_ref: <canonical ObjectRef; only connection/runtime/mandate>
compartment_control_key: sha-256:<hex; required only for compartment>
action_control_key: sha-256:<hex; required only for action>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: active | paused | frozen_new_redemptions | revoked | expired
pause_epoch: <monotonic integer>
revocation_nonce: <monotonic integer>
updated_at: <authority-service time>
head_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.execution_control_receipt.v0.1
principal_id: <same principal>
cause: global_control | scoped_control | connection_joint_control |
       namespace_genesis | namespace_rotation
authorization_basis_kind: control_authorization | control_namespace
control_authorization_ref: <ExecutionControlAuthorization ObjectRef for first three causes; null otherwise>
control_authorization_hash: sha-256:<hex or null>
control_namespace_ref: <signed ExecutionControlNamespace ObjectRef for namespace causes; null otherwise>
control_namespace_hash: sha-256:<hex or null>
prior_control_namespace_ref: <exact prior namespace ObjectRef iff rotation; null otherwise>
prior_control_namespace_hash: sha-256:<hex or null>
prior_revoked_control_head_ref: <exact prior revoked ObjectRef iff rotation; null otherwise>
prior_revoked_control_head_hash: sha-256:<hex or null>
before_control_head_ref: <ObjectRef or null only for namespace genesis>
before_control_head_hash: sha-256:<hex or null>
after_control_head_ref: <ObjectRef>
after_control_head_hash: sha-256:<hex>
before_scoped_control_map_ref: <ObjectRef or null only for namespace genesis>
before_scoped_control_map_hash: sha-256:<hex or null>
after_scoped_control_map_ref: <ObjectRef>
after_scoped_control_map_hash: sha-256:<hex>
before_change_proof: <closed membership/nonmembership path proof, or null for global/namespace causes>
after_change_proof: <closed membership path proof, or null for global/namespace causes>
scoped_leaf_before_ref: <ObjectRef or null for global/genesis or absent new leaf>
scoped_leaf_before_hash: sha-256:<hex or null>
scoped_leaf_after_ref: <ObjectRef or null for global control>
scoped_leaf_after_hash: sha-256:<hex or null>
connection_state_event_receipt_ref: <ObjectRef or null unless connection joint>
connection_state_event_receipt_hash: sha-256:<hex or null>
recovery_grant_transition_receipt_ref: <ObjectRef or null unless recovery-signed>
recovery_grant_transition_receipt_hash: sha-256:<hex or null>
outstanding_action_index_head_ref: <current ObjectRef only for connection_joint_control; null otherwise>
outstanding_action_index_head_hash: sha-256:<hex only for connection_joint_control; null otherwise>
authority_transaction_id: <one control/map/optional connection-or-recovery CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The control map stores one current `scoped_control_leaf` entry per stable leaf
key. `execution.control.issue` CASes the aggregate head, exact old leaf, and one
map path. Connection scope remains the joint connection writer. Gates receive an
authenticated membership/non-membership proof against the exact current map
root and then resolve the leaf head; a missing leaf means the canonical active
generation-zero state only when the capability profile permits implicit genesis.
Terminal leaves remain tombstoned in the map, so namespace history is never
forgotten; trie depth and per-update writes remain bounded without a per-principal
lifetime scope cap.

`cairn.execution_control_receipt.v0.1` is a closed authorization-basis union.
Global, scoped, and connection-joint causes require the exact
ExecutionControlAuthorization and forbid all namespace-basis fields. Namespace
genesis/rotation require the exact new principal-high-assurance-signed
ExecutionControlNamespace and forbid control-authorization fields; rotation also
requires the prior namespace and its exact revoked control head, while genesis
requires both null. The receipt binds its basis, prior/next aggregate heads and
maps, the exact changed leaf, sequence CAS, effective service time, and
the current outstanding-action index head. The listed actions are informational;
omission never grants
permission. Pause/freeze increments a reversible epoch; resume requires a new
command and state transition. Revoke increments an irreversible nonce and only a
new namespace generation can restore ordinary power. Revocation is terminal
inside that generation. On the recovery-signed branch, the referenced upstream
RecoveryGrantTransitionReceipt's `control_successor_commitment_hash` must
recompute from this receipt's exact after-head/map/leaf tuple and shared
transaction ID; any reciprocal control-receipt ref is forbidden.
For a scoped or connection-joint cause, both committed map roots are resolved
under the `scoped_execution_control` domain and the key
`H(cairn.enumerable_map_key_preimage.v0.1, "scoped_execution_control",
principal_id, authority_namespace, control_namespace_generation)`. The receipt's
before/after proofs must authenticate the exact leaf key/ref/hash and have an
identical untouched frontier; revision advances by one and count changes only
for a genuine insertion. The signed authorization's target union, expected
aggregate head, pause epoch, and revocation nonce must equal the authenticated
predecessor leaf. Pause, resume, freeze, and revoke then follow their exact
state/epoch/nonce matrix:

- `pause`: `active → paused`, `pause_epoch + 1`, nonce unchanged;
- `freeze_new_redemptions`: `active → frozen_new_redemptions`,
  `pause_epoch + 1`, nonce unchanged;
- `resume`: `paused | frozen_new_redemptions → active`, epoch and nonce
  unchanged;
- `revoke`: `active | paused | frozen_new_redemptions → revoked`, epoch
  unchanged and `revocation_nonce + 1`.

No terminal state has a successor inside the generation. First insertion of a
scoped leaf is evaluated from a virtual `active, pause_epoch:0,
revocation_nonce:0` predecessor and must create sequence zero with a null
predecessor hash; `resume` cannot be the first insertion. A scoped transition
must preserve the aggregate global state/epoch/nonce tuple, while a global
transition must leave the entire scoped-map commitment unchanged. Ordinary
scoped receipts have no outstanding-action-index pair; only the joint
connection writer authenticates and binds that current index. Genesis and
rotation require an authenticated revision-zero empty map. An arbitrary map
ref, a membership proof without frontier equality, or an otherwise valid leaf
under the wrong target cannot authorize the transition.
`execution.control_namespace.issue` creates generation 0
plus its initial active control head exactly once for a principal/profile under a
fresh high-assurance signature; both prior fields are null and a second genesis
conflicts. `execution.control_namespace.rotate` requires a fresh
principal-present high-assurance ceremony over the prior revoked head and creates
a new namespace plus initial active head in one CAS. Rotation resolves and
authenticates the exact prior namespace and exact prior aggregate head, requires
that head to be terminal `revoked`, increments namespace generation by exactly
one, and creates an `active` successor with zero epoch, zero nonce, and an empty
scoped map. No connection, mandate,
authorization, reservation, alias, or pending action migrates; all new authority
must bind the new namespace/generation, every old-generation recovery grant is
ineligible by exact generation even before its own terminalization receipt, and
the old generation remains revoked.

`expired` is valid only for the connection-scoped control entry and only as the
paired successor of an expired AgentConnectionStateHead. The one connection
writer changes both heads atomically, preserves the pause epoch, increments the
connection-scoped revocation nonce, and emits their joint receipt. Expired is
terminal; global/runtime/mandate/compartment/action control entries forbid it.

The gate and fenced outbox resolve online current heads. The capability registry
defines a closed handoff-prerequisite set; immediately before request bytes or
credentials become available, one transaction revalidates it and commits the
receiver-handoff marker:

- every action: current release/policies, authority and confirmation, lineage/
  action state, reservation/lease, executor capability plus current signing-key/
  credential-broker authority, credential-instance and alias lifecycle plus
  audience/account/key-confirmation bindings,
  deadlines, global/scoped control, exact current receiver-sequence epoch
  selector/generation for every not-yet-handed-off external effect, and runtime connection plus DataGrant/
  disclosure state;
- financial/obligation: current compartment and unique economic-resource exposure
  heads, exact active-reservation/atom-union membership, every aggregate/window/outstanding limit, protection attestation,
  unique current resource-cap selector/equality, provider status,
  provider/account identity heads plus each current eligible provider-identity
  trust overlay, and exact current universal
  obligation state/role/amount/attempt/item-transfer fence;
- bindable offer/counter/acceptance and any fulfillment of that obligation:
  exact current deal/proposal/listing/copy-availability/global-copy-lease/
  inventory-reservation/cart/terms/ask heads,
  named-market state, receiver eligibility, and unexpired quote/review/taint
  heads under the immutable binding set, including the quote-source credential
  and importer-adapter lifecycle heads/generations, with the exact receiver
  scope/namespace and provider-authenticated scope-selection proof unchanged;
- checkout terms: current readiness fence, group/core, obligation exposure, and
  current payment attempt; checkout payment: current eligible group/attempt,
  terms-confirmation receipt, obligation exposure, and no terms reversal;
- cancellation: current original action/import heads, exact cancel availability,
  and current zero-cost attestation/fee-source head;
- every authority branch: the exact confirmation-assurance policy and verifier-
  profile lifecycle heads bound by the ConfirmationReceipt, both still current
  and active;
- inventory-affecting action: branch-exact checkout/ordinary context, current
  seller inventory reservation/fence, and complete globally current copy-lease
  head set plus exact current active seller-inventory and copy-ownership-registry
  authority heads/signing-key generations; and
- typed notice/evidence/review: current receiver-channel policy and every exact
  disclosure prerequisite.

Missing, stale, changed-to-ineligible, unknown, or extra prerequisite denies
before handoff. `OutboxHandoffReceipt` binds all evaluated heads, membership
proofs, limits, and policy hashes. This CAS closes every gate/redemption-to-
handoff race; a later receipt cannot cure an invalid handoff. All-agent control
shares the reservation namespace and cannot depend on agent polling.

`scope:action` never keys a restriction by a refreshable `ActionRecord` ref. Its
canonical target is
`H(profile_id, principal_id, principal_occurrence_id)`. The same
`action_control_key` is required in the lineage commitment, every refreshed
binding set/prepared record, authority reservation, gate, redemption, action
state head, and outbox snapshot. All candidate records for that occurrence share
the restriction; preparing or selecting a refreshed quote/review cannot escape
it. Only a newly authorized occurrence has a different key. Object-ref targets
for `scope:action`, missing aliases, or mismatched keys deny.

`scope:compartment` likewise targets
`H(profile_id, principal_id, economic_resource_key)`, not a compartment ObjectRef.
Every existing or future compartment alias for the same root or verified child
resource carries that identical key and resolves the same aggregate control head;
an alias cannot escape pause/freeze/revoke. Reservation, gate, redemption, and
handoff prove both the exact compartment definition and the current resource-key
control head. Creating a new alias while that head is restrictive inherits the
restriction and cannot create an active child override.

Applicable scopes form a closed restriction lattice:
`all_agents → connection → runtime → mandate → compartment → action` (omitting
nodes that do not apply to a branch). Gate and outbox require authenticated
membership/non-membership proofs under the current root for every applicable
target. Any ancestor or target state that is paused, frozen, or revoked denies;
a more specific active state never overrides a restrictive ancestor. Resume
advances only its exact reversible pause epoch and cannot cross an ancestor pause
or any revocation nonce. Duplicate, missing, conflicting, unknown, or regressive
heads deny.

`all_agents` mutates the signed `global_state` plus its epoch/nonce. Pause and
freeze are reversible only by an exact fresh principal resume; revoke is
irreversible for existing authority. Private reads, binding-set issuance,
reservation, gate, redemption, and outbox all reject any restrictive global
state regardless of whether the caller presents current epochs, except for the
closed principal safety branch below.

Freeze/revoke must not make an already external action impossible to cancel. The
only exception is `principal_safety_cancellation`: principal-direct authentication,
a fresh one-shot CancellationAuthorization and transaction-bound confirmation,
the exact restrictive control head, and an original action whose handoff preceded
that head. The triggering head may be the global head or any applicable
connection/runtime/mandate/compartment/action scope in the closed lattice; the
safety gate still checks the complete current lattice and binds which restrictive
head triggered the exception. It permits only zero-fee `cancel_receiver_action` against the same
receiver/account/operation, preserves all exposure and inventory, introduces no
new payee/amount/rail/copy/disclosure, uses a separately rate-limited safety
executor, and still requires current cancellation availability, credential/key/
account bindings, review, outbox, and receiver finality. Agents, runtimes, recovery
grants, ordinary financial actions, and cancellation of a never-handed-off action
cannot use this branch. A restricted authenticated adapter may still reconcile
receiver state; it cannot create authority or release exposure. Thus “Freeze new
agent actions” and “Try to cancel in-flight actions” compose without briefly
reenabling pending work.

### 5.7 Transaction-bound confirmation proof

An authority object's declared method is a request, not evidence. A separate
receipt proves the ceremony without creating a hash cycle:

```yaml
schema: cairn.confirmation_assurance_policy.v0.1
policy_id: <stable URI>
applicable_capabilities: []
value_thresholds: []
allowed_methods: [passkey | wallet_signature | account_reauth | provider_sca]
relying_party_or_audience: <exact RP/resource/provider>
require_user_presence: true | false
require_user_verification: true | false
allowed_authenticator_classes: []
maximum_evidence_age_seconds: <positive integer>
allowed_verifier_profile_refs: []
issued_at: <time>
expires_at: <time>
policy_hash: sha-256:<hex>
policy_authority_signature: <Signature>
```

```yaml
schema: cairn.confirmation_verifier_profile.v0.1
verifier_profile_id: <stable URI>
verifier_id: <canonical verifier identity>
verification_key_refs: []
supported_methods: []
relying_party_or_audience_set: []
evidence_schema_refs: []
issued_at: <time>
expires_at: <time>
profile_hash: sha-256:<hex>
verifier_registry_signature: <Signature>
```

Both objects are imported through `execution.policy.import` under
`confirmation_assurance` or `confirmation_verifier` and receive independent
current PolicyLifecycleHeads. An allowlist entry, key file, or deployment
configuration is not authority. Retirement or compromise advances the signed
lifecycle and invalidates every unredeemed confirmation that binds it.

```yaml
schema: cairn.confirmation_receipt.v0.1
confirmation_receipt_id: urn:uuid:<uuid>
principal_id: <principal>
authority_object_ref: <Mandate, ActionAuthorization, or CancellationAuthorization ObjectRef>
authority_object_hash: sha-256:<hex>
execution_binding_set_ref: <ObjectRef or null for broad mandate issuance>
challenge_hash: sha-256:<transaction-bound challenge>
method: passkey | wallet_signature | account_reauth | provider_sca
authenticator_evidence_ref: <authenticated ObjectRef>
relying_party_or_audience: <exact RP/resource/provider>
user_presence: true | false | not_applicable
user_verification: true | false | not_applicable
assurance_policy_ref: <ObjectRef>
assurance_policy_hash: sha-256:<hex>
assurance_policy_lifecycle_head_ref: <current active ObjectRef>
assurance_policy_lifecycle_head_hash: sha-256:<hex>
verifier_profile_ref: <ObjectRef>
verifier_profile_hash: sha-256:<hex>
verifier_profile_lifecycle_head_ref: <current active ObjectRef>
verifier_profile_lifecycle_head_hash: sha-256:<hex>
verifier_id: <must equal the verifier profile>
verified_at: <time>
expires_at: <time>
receipt_hash: sha-256:<hex>
verifier_signature: <Signature>
```

The confirmation policy defines required RP/audience,
user-presence/verification, authenticator type, verifier trust, freshness, and
value/capability threshold. Challenge construction is acyclic and exact: first
finalize and sign the authority object; then compute
`SHA-256(JCS(["cairn-confirmation-v0.1", authority_object_hash,
execution_binding_set_hash_or_null, assurance_policy_hash,
relying_party_or_audience, confirmation_nonce, receipt_expires_at]))`.
`confirmation_nonce` is a fresh principal-selected value already inside the
signed authority. For one-shot and cancellation authority, the binding-set hash
is exact. For mandate issuance it is null; the receipt proves deliberate creation
of bounded standing authority, not a new human ceremony per permitted action.
The gate, redemption, and handoff recompute the challenge and verify evidence,
freshness, verifier, policy, authority, and exact current active successors of
both lifecycle heads. A generic signature or caller-asserted `method:passkey`
cannot satisfy passkey/SCA assurance.
`execution.confirmation.verify` is the sole receipt producer. Only an allowlisted
verifier named by a current active imported verifier profile may call its
internal receipt writer after it verifies the
already signed authority object, exact challenge, authenticator evidence,
RP/audience, assurance policy, freshness, and principal. The operation accepts no
caller-selected method/result, is semantically idempotent on the complete
challenge plus evidence digest, and returns the same immutable receipt on replay.
`execution.confirmation_receipt.get` follows the authority object's private-read
ACL. The two lifecycle refs are also complete-set trust dependencies of every
later receiver assertion produced by the action; post-handoff compromise enters
the ordinary trust-quarantine/remediation coordinator, while pre-handoff
retirement or compromise simply denies. No authorization issue/import operation
fabricates confirmation.

## 6. Mandate compilation and accounting

Delegated execution requires one fresh principal-signed, closed v0.3 object. It
does not inherit fields by prose and contains no duplicate limit or selector
families:

```yaml
schema: cairn.agent_mandate.v0.3
mandate_id: urn:uuid:<uuid>
principal_id: <principal>
agent:
  provider_id: <provider>
  product_id: <product>
  runtime_binding_ref: <ObjectRef>
  connection_authorization_ref: <ObjectRef>
execution_mode: preauthorized
control_namespace_ref: <current cairn.execution_control_namespace.v0.1 ObjectRef>
control_namespace_generation: <integer>
principal_limit_policy_state_head_refs: <exact global-action and asset-domain heads>
capability: <exactly one registered capability>
resource_audiences: [<exact canonical execution resource URI>]
scope_bindings:
  - intent_refs: []
    deal_ref: <ObjectRef or null>
    counterparties: []
    seller_id: <seller or null>
    copy_ids: []
    listing_refs: []
    proposal_ref: <ObjectRef or null>
    cart_hash: sha-256:<hex or null>
    ultimate_receiver_or_payee: <provider-canonical identity>
    receiver_account_or_contract_scope: <canonical scope for every external effect;
                                          null only for receiverless local effect>
    receiver_operation_namespace: <canonical namespace for every external effect;
                                   null only for receiverless local effect>
    explicit_scope_selection_proof_ref: <typed ObjectRef for every external effect;
                                          null only for receiverless local effect>
    explicit_scope_selection_proof_hash: sha-256:<hex or null under same exception>
    payee_account_commitment: sha-256:<hex or null>
    rail: <rail or null>
    asset: <asset or null>
    data_grant_refs: []
    compartment_ref: <ObjectRef or null for non-value capability>
    economic_resource_key: sha-256:<hex or null>
    provider_account_identity_head_ref: <ObjectRef or null for non-value capability>
    account_generation: <integer or null for non-value capability>
    provider_account_identity_trust_overlay_head_ref: <current eligible ObjectRef or null>
    provider_account_identity_trust_overlay_head_hash: sha-256:<hex or null>
    provider_sublimit_identity_head_ref: <ObjectRef or null>
    provider_sublimit_identity_head_hash: sha-256:<hex or null>
    provider_sublimit_id: <canonical id or null>
    sublimit_generation: <integer or null>
    provider_sublimit_identity_trust_overlay_head_ref: <current eligible ObjectRef or null>
    provider_sublimit_identity_trust_overlay_head_hash: sha-256:<hex or null>
    executor_target: <exact service/contract>
    accounting_policy_ref: <ObjectRef or null for nonfinancial capability>
    receiver_finality_profile_ref: <ObjectRef for every registered execution capability>
    receiver_sequence_epoch_selector_key: sha-256:<stable key for every external effect>
    review_policy_hash: sha-256:<hex>
    taint_policy_hash: sha-256:<hex>
    lineage_policy:
      issuance: authority_service_derived
      principal_occurrence_nonce: <principal-chosen random nonce>
      principal_occurrence_id: sha-256:<JCS of principal_id, mandate_id,
                               scope_binding_index, principal_occurrence_nonce>
      derivation_fields: [principal_id, mandate_id, scope_binding_index,
                          capability, deal_or_cart_or_listing_copy_tuple,
                          authority_service_attempt_sequence]
      maximum_active_lineages: 1
      maximum_completed_occurrences: 1
      next_sequence_after: receiver_confirmed_cancelled | definitive_failure |
                           fenced_non_submission
      finalization_tombstone: permanent_for_signed_occurrence
      parallel_purchase_rule: none
constraints:
  kind: financial | nonfinancial
  financial:
    accounting_asset: <one asset>
    per_action_limit: <Money>
    aggregate_limit: <Money>
    outstanding_exposure_limit: <Money>
    fee_limit: <Money>
    tax_limit: <Money>
    shipping_limit: <Money>
    price_corridor:
      minimum: <Money>
      maximum: <Money>
      comparison_basis: listed_price | recorded_settlement | exact_terms
    maximum_ask_deviation: <typed amount or percentage or null>
    window_limits:
      - amount: <Money>
        window_kind: rolling
        window_seconds: <positive integer>
    exact_terms_hash: sha-256:<hex or null>
    exact_cart_hash: sha-256:<hex or null>
  nonfinancial:
    maximum_payload_bytes: <positive integer>
    allowed_audiences: []
    # financial and nonfinancial are a oneOf; the unused branch is null
  max_actions: <positive integer>
  rate_limit: {max_actions: <positive integer>, window_seconds: <positive integer>}
  evidence_requirements: []
  substitution_policy: none
  warning_policy: deny_all
  accepted_transaction_semantics: []
  safe_default: wait | hold | expire | decline | cancel_if_not_submitted |
                release_never_submitted_local_hold
  review_max_age_seconds: <positive integer>
  not_before: <time>
  expires_at: <time>
reserved_judgments: []
source_authority_claim_ids: []
profile_version_hash: sha-256:<hex>
intent_hashes: []
domain_policy_hash: sha-256:<hex>
revocation_nonce: <monotonic integer>
max_delegation_depth: 0
idempotency_namespace: <principal/mandate namespace>
required_confirmation_assurance_policy_ref: <ObjectRef>
confirmation_nonce: <fresh principal-selected nonce>
issued_at: <time>
mandate_hash: sha-256:<hex>
principal_signature: <Signature>
not_claiming: [action_is_wise, evidence_is_true, payment_is_final]
```

Each `scope_bindings` entry is an atomic relational tuple. A value-affecting
proposal must match one entire tuple. Global constraints intersect the tuple and
can only narrow it; they cannot introduce a counterparty, copy, listing, payee,
rail, DataGrant, compartment, policy, or executor missing from that tuple.

A closed capability-prerequisite registry selects exactly one constraints branch.
Financial capability requires the complete financial branch, quote, accounting
policy, compartment, exposure vector, and applicable receiver finality profile;
the nonfinancial branch and null placeholders are forbidden. Nonfinancial
capability requires count/rate/payload/audience limits and forbids invented money,
asset, quote, accounting, compartment, or exposure fields. An external
nonfinancial receiver effect still requires its applicable finality profile; a
all registered v0.1 execution capabilities have an external receiver and require
that profile. Pure local storage/preparation remains in the proposal foundation,
not this execution profile.

The mandate's connection authorization is immutable authority context, not a
source of authority. Gate and outbox require the binding set's connection ref to
equal it exactly and require that connection's current active state. Revoking or
expiring that connection kills use of the mandate. A later connection—even for
the same runtime—cannot revive it; the principal must sign a new mandate naming
the new connection authorization.

Mandate validation resolves the exact signed `AgentRuntimeBinding` and exact
`AgentConnectionAuthorization`; schema-only or caller-supplied lookalikes deny.
The runtime provider/product must equal the mandate agent tuple, the connection
authorization must bind that same runtime and principal, and the entire mandate
`constraints.not_before .. constraints.expires_at` interval must be contained in
both the runtime and connection-authorization intervals. Gate evaluation time
must fall inside all three intervals. The exact current AgentConnectionStateHead
must resolve through the current-head authority, be active, and bind the same
principal, runtime, and authorization. A stale but signed active head is not
current authority.

v0.2 remains proposal/supervised-only under this execution profile. No adapter
can derive v0.3 connection/resource, compartment, review, taint, or finality
bindings from absent v0.2 fields. Delegated execution therefore always requires a
fresh v0.3 signature. Any future migration table maps only unambiguous fields and
still produces a newly reviewed and signed v0.3 object.

`supervised` is not a v0.3 mandate mode. The supervised branch always requires a
one-shot `ActionAuthorization`; only `execution_mode:preauthorized` may redeem a
v0.3 mandate. The gate schema uses a discriminated union and rejects a mandate in
the supervised authority branch.

The runtime never supplies a lineage ID. Before the binding set, the authority
service creates an immutable provisional commitment; reservation later activates
it. This ordering avoids a content-address cycle among binding set, one-shot
authority, and lineage receipt:

```yaml
schema: cairn.lineage_commitment.v0.1
principal_id: <principal>
authority_kind: preauthorized_mandate | supervised_pending | cancellation_pending
mandate_ref: <ObjectRef or null; required only for preauthorized_mandate>
scope_binding_index: <integer or null>
principal_occurrence_id: sha-256:<signed mandate occurrence or fresh value the
                         principal must sign in ActionAuthorization>
canonical_business_tuple_hash: sha-256:<hex>
action_proposal_hash: sha-256:<hex>
effect_id: sha-256:<hex>
attempt_sequence: <authority-service allocated integer within occurrence>
commitment_generation: <monotonic integer within attempt sequence>
principal_authorized_lineage_id: sha-256:<JCS of occurrence, attempt sequence>
action_control_key: sha-256:<JCS of profile, principal, occurrence>
prior_lineage_state: none | receiver_confirmed_cancelled | definitive_failure |
                     fenced_non_submission
prior_lineage_receipt_ref: <ObjectRef or null>
lineage_ledger_head_expected: <ObjectRef>
expected_activation_fence: <integer>
expires_at: <short expiry>
commitment_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

For a mandate, the commitment exactly matches its signed tuple and occurrence.
For supervised or cancellation work, the service supplies a fresh occurrence ID
and business-tuple commitment before the ceremony; the principal signs those
exact values in `ActionAuthorization` or `CancellationAuthorization`,
respectively. The binding set carries this immutable commitment and repeats its
complete business tuple as closed fields plus `canonical_business_tuple_hash`;
it never carries a future receipt or mutable state. The repetition is
deliberate: validators compare every signed mandate tuple member to independently
named binding/action semantics and compare the full tuple hash to the commitment,
so an omitted seller, listing, counterparty, intent, asset, review policy, or
taint policy cannot be rebound behind an unchanged proposal/effect.

The authority service indexes one current provisional commitment per
`(principal_id, principal_occurrence_id, attempt_sequence)`. Repeated creation
returns that exact commitment; a different proposal/effect conflicts. After an
unused commitment expires, a new service-signed commitment may reuse the attempt
sequence only against the unchanged ledger head and with an expiry tombstone for
the old commitment and incremented `commitment_generation`. Only activation
advances the attempt sequence.

In the same serializable transaction that reserves exposure, the authority
service verifies the mandate or signed one-shot authorization, CASes the expected
lineage ledger head/fence, and first materializes an AuthorityReservation that
binds the commitment and expected/next lineage fence but no future receipt. It
then emits `cairn.lineage_activation_receipt.v0.1`, which binds that completed
reservation, commitment, actual authority ref/hash, binding set, head/fence before
activation, expected/next fence, chosen prepared action, one authority-transaction
ID, an independently precomputable next-state commitment, activation time, and
service signature. It MUST NOT reference the future active LineageStateHead. The
active head references the receipt and repeats its transaction ID and next-state
commitment. Both objects commit or neither does. Gate, redemption,
ActionStateHead, and receipt carry the pair and verify the one-way edge and shared
transaction ID; no reciprocal ObjectRefs exist. An expired or abandoned
commitment is never active and remains represented by its signed
expiry/supersession state and receipt.

```yaml
schema: cairn.lineage_activation_receipt.v0.1
authority_reservation_ref: <completed ObjectRef>
authority_reservation_hash: sha-256:<hex>
lineage_commitment_ref: <ObjectRef>
lineage_commitment_hash: sha-256:<hex>
actual_authority_ref: <mandate or one-shot ObjectRef>
actual_authority_hash: sha-256:<hex>
execution_binding_set_ref: <ObjectRef>
execution_binding_set_hash: sha-256:<hex>
prior_lineage_state_head_ref: <expected ObjectRef>
prior_lineage_state_head_hash: sha-256:<hex>
expected_activation_fence: <integer>
next_activation_fence: <expected + 1>
activated_action_ref: <one exact prepared execution ActionRecord>
authority_transaction_id: <one serializable transaction id>
next_state_commitment_hash: sha-256:<canonical active-state fields excluding
                                    the commitment field itself and activation
                                    receipt/head hash/signature>
activated_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.lineage_provisional_terminal_receipt.v0.1
lineage_commitment_ref: <ObjectRef>
lineage_commitment_hash: sha-256:<hex>
before_lineage_state_head_ref: <current provisional ObjectRef>
before_lineage_state_head_hash: sha-256:<hex>
cause: authority_time_expiry | binding_superseded | authority_revoked_or_noncurrent
terminal_state: provisional_expired | provisional_superseded | provisional_cancelled
no_activation_gate_or_outbox_proof_ref: <signed complete absence-proof ObjectRef>
no_activation_gate_or_outbox_proof_hash: sha-256:<hex>
next_state_commitment_hash: sha-256:<canonical terminal-state preimage excluding
                                    this receipt ref/hash>
authority_transaction_id: <one lineage/subreservation/release CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.lineage_state_head.v0.1
principal_occurrence_id: sha-256:<hex>
principal_authorized_lineage_id: sha-256:<hex>
action_control_key: sha-256:<exact commitment-derived key>
attempt_sequence: <integer>
commitment_generation: <integer>
sequence: <monotonic lineage-state integer>
previous_state_hash: sha-256:<hex or null>
state: provisional | provisional_expired | provisional_superseded | provisional_cancelled | active |
       fenced_non_submission | definitive_failure |
       receiver_confirmed_cancelled | finalized
commitment_ref: <ObjectRef>
activation_receipt_ref: <ObjectRef or null until active>
activation_transaction_id: <same receipt transaction id or null before active>
next_state_commitment_hash: sha-256:<same receipt commitment or null before active>
activated_action_ref: <ObjectRef or null until activation selects one prepared record>
outbox_state_head_ref: <ObjectRef or null>
terminal_receiver_receipt_ref: <ObjectRef or null>
finalization_tombstone: true | false
fencing_token: <monotonic integer>
updated_at: <authority-service time>
state_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

`execution.lineage_commitment.issue` creates `provisional`; expiry emits a typed
`provisional_expired` receipt; replacement against the unchanged ledger CASes
that head through `provisional_superseded` to a new `provisional` head with the
next generation. Prepared ActionRecords reference the commitment but do not mutate
LineageStateHead. Only the authority-reservation transaction activates a
commitment and atomically writes exactly one `activated_action_ref`; competing
prepared records remain inert and expire.

`provisional_cancelled` is the terminal no-submission edge for a checkout
conditional payment whose authority is revoked or otherwise becomes noncurrent
before activation. Its receipt proves no lineage activation, GateResult,
outbox claim, or handoff exists and releases only conditional payment roles.
It cannot be used from `active` and cannot be resumed.

For activation, the service first commits all next active-state values other than
the receipt ref and commitment field itself to `next_state_commitment_hash`,
signs the receipt, and then writes
the active head with that receipt ref plus the identical transaction ID and
commitment. The head recomputes the commitment while omitting only
`activation_receipt_ref`, `next_state_commitment_hash`, `state_hash`, and its
signature. The receipt never
contains an after-head ref/hash, so the content-address graph is acyclic.

The typed `cairn.lineage_active_state_commitment_preimage.v0.1` is exactly the
ordered tuple `(principal_occurrence_id, principal_authorized_lineage_id,
action_control_key, attempt_sequence, commitment_generation, sequence,
previous_state_hash, state:"active", commitment_ref,
activation_transaction_id, activated_action_ref, outbox_state_head_ref:null,
terminal_receiver_receipt_ref:null, finalization_tombstone:false, fencing_token,
updated_at)`. No extension or omitted value is permitted. Conformance freezes one
golden preimage/hash vector and direct self-field/receipt-ref mutants.

Before redemption, an unredeemed reservation expiry/conflict can atomically
release the reservation and CAS `active → fenced_non_submission` only after
proving no GateResult was redeemed and no outbox claim/handoff exists. It emits
`cairn.unredeemed_release_receipt.v0.1` binding reservation, lineage heads,
absence-proof root, shared transaction ID, and fence. After redemption, only the
fenced outbox can prove non-submission. Only authenticated provider import can
record receiver cancellation, definitive failure, or finalization. Every
transition CASes the current head and has a closed receipt. Stale quote/review
after activation cannot reuse the attempt until one of these exact non-handoff
paths completes. Finalized is permanently tombstoned.

That tombstone means only that the signed occurrence cannot execute again. It
does not freeze the truth status of its receiver evidence: current views and
exposure always compose it with the current ReceiverAssertionTrustStateHead and
policy lifecycle. A later quarantine leaves the tombstone in place, removes
trusted-final presentation, and restores a conservative exposure hold.

Quote/review refreshes may create new binding sets and prepared ActionRecords but
reuse the same unexpired commitment. Only one can win commitment activation. The
next sequence cannot be committed until every prior lineage for the occurrence
is receiver-confirmed cancelled, definitively failed, or proved never handed off.
Finalization permanently tombstones that signed occurrence. No retry, new quote,
new effect ID, alternate runtime, or idempotency key can remove it. A repeat
purchase requires a fresh principal-signed occurrence; parallel work requires
separate explicit principal authority.

The authority service reserves worst-case price, fees, tax, shipping, attention
fees, and rail costs. In one serializable transaction it checks per-action,
window, lifetime aggregate, outstanding, compartment, action-count, and rate
limits. All runtimes and interfaces share the server-owned namespace and fencing
sequence. Refunds do not replenish lifetime spend unless a signed accounting
policy says confirmed refunds do. Reversal risk remains outstanding until
rail-specific finality permits release.

The gate evaluates one complete scope tuple. It cannot combine seller, copy,
payee, and rail across tuples. `substitution_policy:none` is mandatory for the
first delegated-value profile. Evidence requirements specify presence, freshness,
and binding—not physical truth.

v0.3 uses only rolling windows. The authority service's authenticated UTC clock
is authoritative. A candidate reservation at time `t` is checked against events
whose reservation-commit instants lie in the half-open interval
`[t-window_seconds, t)`, then the candidate is added. Durations are positive
bounded integers; overflow or unavailable clock denies. Submission/provider time
does not reattribute a debit. Civil windows, timezones, DST, and clock-skew
tolerance require a future signed policy and are nonconforming in v0.3.

## 7. Review-to-execution binding

```text
preauthorized branch:
  AgentMandate + mandate ConfirmationReceipt
  → ActionProposal → taint/quote/disclosure
  → [ordinary inventory only: InventoryCommitment → seller prepared → held]
  → review
  → LineageCommitment(authority_kind:preauthorized_mandate; exact mandate ref)
  → ExecutionBindingSet → execution.action.prepare
  → AuthorityReservation recording the current inventory hold when applicable

supervised branch:
  ActionProposal → taint/quote/disclosure
  → [ordinary inventory only: InventoryCommitment → seller prepared → held]
  → review
  → LineageCommitment(authority_kind:supervised_pending)
  → ExecutionBindingSet → execution.action.prepare
  → ActionAuthorization + one-shot ConfirmationReceipt
  → AuthorityReservation recording the current inventory hold when applicable

cancellation branch:
  CancellationCostAttestation
  → SafetyCancellationPreparationIntent (principal-safety mode only)
  → ActionProposal → taint/review/disclosure
  → LineageCommitment(authority_kind:cancellation_pending)
  → ExecutionBindingSet → execution.action.prepare
  → CancellationAuthorization + one-shot ConfirmationReceipt
  → AuthorityReservation

every branch then:
  GateResult → atomic redemption + EffectLease(dispatching)
  → ScopedExecutor submission → receiver/provider receipt import
  → ActionReceipt transition
```

The three branches are a schema-level oneOf, not reorderable prose. A
preauthorized lineage commitment cannot exist before its already confirmed
mandate; supervised/cancellation commitments deliberately precede the final
one-shot authority so that the principal can sign their exact binding set. No
branch may borrow another branch's ordering or authority object.
For ordinary inventory, the bracketed seller hold is mandatory before review so
review and every downstream object can bind one actual global-copy successor;
for noninventory it is absent. Direct paired checkout follows its separate
template/pending/readiness order in §10 and cannot borrow this ordinary branch.

### 7.1 Immutable execution binding set

Every object created at or after `ExecutionBindingSet` carries its one exact
content-addressed ref/hash; validators MUST NOT independently select equivalent-
looking reviews or policies. Its predecessor quote, taint, review, disclosure,
proposal, and lineage-commitment objects cannot reference a future set; the set
binds them one-way.

```yaml
schema: cairn.execution_binding_set.v0.1
binding_set_id: urn:uuid:<uuid>
profile_id: cairn-supervised-execution-v0.1
execution_bundle_hash: sha-256:<frozen hash>
operation_registry_hash: sha-256:<frozen hash>
execution_release_state_head_ref: <active signed ObjectRef>
principal_id: <principal>
execution_integrity_state_head_ref: <same current healthy ObjectRef>
execution_integrity_state_head_hash: sha-256:<hex>
actor_branch: agent_runtime | principal_direct
agent_runtime_binding_ref: <ObjectRef or null>
connection_authorization_ref: <ObjectRef or null>
connection_state_head_ref: <ObjectRef or null>
data_grant_refs: []
data_grant_state_heads:
  - data_grant_ref: <ObjectRef>
    current_state_head_ref: <ObjectRef>
    revocation_nonce: <integer>
    required_purpose: <exact DataGrant purpose>
    required_uses: <exact sorted DataGrant uses>
    required_resource_scopes_root: sha-256:<canonical exact DataGrant resource_scopes>
    required_audience: <exact DataGrant audience>
disclosures:
  - disclosure_authorization_ref: <ObjectRef>
    disclosure_authorization_hash: sha-256:<hex>
    source_read_receipt_ref: <ObjectRef>
    source_read_receipt_hash: sha-256:<hex>
    source_read_next_state_head_ref: <ObjectRef>
    source_read_next_state_head_hash: sha-256:<hex>
    source_read_fence: <integer>
    projection_ref: <ObjectRef>
    disclosed_payload_hash: sha-256:<hex>
    field_paths: []
    audience: <exact recipient/runtime/provider>
    purpose: <closed purpose>
    delivery_envelope_hash: sha-256:<hex>
    disclosure_reservation_ref: <ObjectRef>
    disclosure_fencing_token: <integer>
    disclosure_state_head_ref: <ObjectRef>
    disclosure_revocation_nonce: <integer>
action_proposal_ref: <ObjectRef>
action_proposal_hash: sha-256:<hex>
capability: <exact registered capability>
obligation_exposure_core_ref: <ObjectRef or null for nonfinancial/cancellation>
obligation_exposure_core_hash: sha-256:<hex or null>
obligation_exposure_id: sha-256:<hex or null>
obligation_role: create_or_update | fulfill | null
principal_authorized_lineage_id: sha-256:<authority-service derived lineage>
lineage_commitment_ref: <ObjectRef>
lineage_commitment_hash: sha-256:<hex>
canonical_business_tuple_hash: sha-256:<same exact commitment as LineageCommitment>
intent_refs: []
counterparties: []
seller_id: <seller or null>
listing_refs: []
asset: <asset or null>
review_policy_hash: sha-256:<exact reviewed policy>
taint_policy_hash: sha-256:<exact taint policy>
expected_lineage_activation_fence: <integer>
principal_occurrence_id: sha-256:<fresh occurrence bound by authority>
action_control_key: sha-256:<exact lineage-commitment action control key>
effect_descriptor_ref: <ObjectRef>
effect_id: sha-256:<hex>
checkout_group_core_ref: <ObjectRef or null>
checkout_group_core_hash: sha-256:<hex or null>
checkout_role: terms_acceptance | payment | null
checkout_reservation_batch_core_ref: <ObjectRef or null unless paired checkout>
checkout_reservation_batch_core_hash: sha-256:<hex or null>
fulfillment_attempt_core_ref: <ObjectRef or null unless financial value action>
fulfillment_attempt_core_hash: sha-256:<hex or null>
checkout_transition_template_ref: <ObjectRef or null unless direct checkout>
checkout_transition_template_hash: sha-256:<hex or null>
cancellation_context:
  original_action_ref: <ObjectRef>
  original_action_hash: sha-256:<hex>
  original_action_state_head_ref: <current ObjectRef at binding>
  original_action_state_head_hash: sha-256:<hex>
  receiver_event_stream_state_head_ref: <current ObjectRef>
  receiver_event_stream_state_head_hash: sha-256:<hex>
  original_effect_id: sha-256:<hex>
  original_operation_locator: <closed provider/client-reference union>
  expected_original_state: submitted | acknowledged | accepted | unknown
  cancellation_operation_kind: <exact receiver operation>
  receiver_account_commitment: sha-256:<hex>
  receiver_account_or_contract_scope: <exact original scope>
  cancellation_operation_namespace: <exact original receiver namespace>
  original_executor_credential_binding_core_ref: <ObjectRef>
  original_executor_credential_binding_core_hash: sha-256:<hex>
  original_executor_credential_binding_head_ref: <head captured at original handoff>
  original_executor_credential_binding_head_hash: sha-256:<hex>
  original_credential_instance_key: sha-256:<canonical original instance>
  original_credential_instance_core_ref: <ObjectRef>
  original_credential_instance_core_hash: sha-256:<hex>
  original_executor_credential_binding_current_head_ref: <current ObjectRef at binding>
  original_executor_credential_binding_current_head_hash: sha-256:<hex>
  cancellation_executor_credential_binding_head_ref: <current cancellation ObjectRef>
  cancellation_executor_credential_binding_head_hash: sha-256:<hex>
  cancellation_credential_instance_key: sha-256:<canonical current instance>
  cancellation_credential_instance_state_head_ref: <current active ObjectRef>
  cancellation_credential_instance_state_head_hash: sha-256:<hex>
  cancellation_credential_continuity_receipt_ref: <ObjectRef or null iff exact original>
  cancellation_credential_continuity_receipt_hash: sha-256:<hex or null>
  cancellation_finality_profile_ref: <exactly applicable ObjectRef>
  cancellation_cost_attestation_ref: <zero-cost ObjectRef>
  cancellation_cost_attestation_hash: sha-256:<hex>
  cancellation_fee_source_state_head_ref: <current ObjectRef>
  cancellation_fee_source_state_head_hash: sha-256:<hex>
  cancellation_fee_source_generation: <integer>
  safety_preparation_intent_ref: <ObjectRef or null; required only for safety mode>
  safety_preparation_intent_hash: sha-256:<hex or null>
  # entire object is null unless capability == cancel_receiver_action
deal_ref: <ObjectRef or null>
expected_deal_head_hash: sha-256:<hex or null>
closed_terms_or_cart_hash: sha-256:<hex or null>
copy_ids: []
seller_inventory_context_kind: checkout | ordinary_deal | adopted_obligation |
                               null when inventory is inapplicable
seller_inventory_context_ref: <ObjectRef or null>
seller_inventory_context_hash: sha-256:<hex or null>
seller_inventory_stage: ordinary_held | checkout_prepared | checkout_held |
                        adopted_consumed | null
seller_inventory_state_head_ref: <current stage-matching ObjectRef or null>
seller_inventory_state_head_hash: sha-256:<hex or null>
seller_copy_lease_heads_root: sha-256:<exact current global-copy set or null>
seller_inventory_transition_receipt_ref: <stage-matching prepare/commit/consume ObjectRef or null only when inapplicable>
seller_inventory_transition_receipt_hash: sha-256:<hex or null>
seller_inventory_authority_state_head_ref: <same current active ObjectRef as review or null>
seller_inventory_authority_state_head_hash: sha-256:<hex or null>
seller_inventory_authority_signing_key_generation: <same integer or null>
copy_ownership_registry_authority_state_head_ref: <same current active ObjectRef as review or null>
copy_ownership_registry_authority_state_head_hash: sha-256:<hex or null>
copy_ownership_registry_authority_signing_key_generation: <same integer or null>
checkout_readiness_receipt_ref: <ObjectRef required iff stage == checkout_held>
checkout_readiness_receipt_hash: sha-256:<hex or null>
evidence_snapshot_hash: sha-256:<hex or null>
quote_snapshot_ref: <ObjectRef or null for nonfinancial action>
quote_hash: sha-256:<hex or null>
provider_quote_import_receipt_ref: <same ObjectRef as review or null>
provider_quote_import_receipt_hash: sha-256:<hex or null>
quote_source_credential_lifecycle_head_ref: <same current active ObjectRef or null>
quote_source_credential_lifecycle_head_hash: sha-256:<hex or null>
quote_source_credential_generation: <same integer or null>
quote_importer_adapter_lifecycle_head_ref: <same current active ObjectRef or null>
quote_importer_adapter_lifecycle_head_hash: sha-256:<hex or null>
context_taint_decision_ref: <ObjectRef>
taint_decision_hash: sha-256:<hex>
execution_review_receipt_ref: <ObjectRef>
review_hash: sha-256:<hex>
compartment_ref: <ObjectRef or null>
pre_reservation_compartment_state_head_ref: <ObjectRef or null>
pre_reservation_resource_exposure_state_head_ref: <ObjectRef or null>
pre_reservation_resource_exposure_state_head_hash: sha-256:<hex or null>
economic_resource_cap_state_head_ref: <current ObjectRef or null>
economic_resource_cap_state_head_hash: sha-256:<hex or null>
principal_limit_policy_state_head_refs: <exact current complete set>
economic_resource_key: sha-256:<hex or null>
compartment_control_key: sha-256:<hex or null>
protection_attestation_ref: <ObjectRef or null for nonfinancial action>
protection_attestation_hash: sha-256:<hex or null>
protection_attestation_lifecycle_head_ref: <active ObjectRef or null>
protection_attestation_lifecycle_head_hash: sha-256:<hex or null>
provider_account_identity_head_ref: <ObjectRef or null for nonfinancial action>
account_generation: <integer or null for nonfinancial action>
provider_account_identity_trust_overlay_head_ref: <same current eligible ObjectRef or null>
provider_account_identity_trust_overlay_head_hash: sha-256:<hex or null>
provider_sublimit_identity_head_ref: <ObjectRef or null>
provider_sublimit_identity_head_hash: sha-256:<hex or null>
provider_sublimit_id: <canonical id or null>
sublimit_generation: <integer or null>
provider_sublimit_identity_trust_overlay_head_ref: <same current eligible ObjectRef or null>
provider_sublimit_identity_trust_overlay_head_hash: sha-256:<hex or null>
accounting_policy_ref: <ObjectRef or null for nonfinancial action>
receiver_finality_profile_ref: <ObjectRef for every registered execution capability>
receiver_sequence_epoch_selector_state_head_ref: <same current active ObjectRef for every external effect>
receiver_sequence_epoch_selector_state_head_hash: sha-256:<hex or null only for receiverless local effect>
receiver_sequence_epoch_selector_key: sha-256:<same stable key or null only for receiverless local effect>
receiver_sequence_epoch_proof_ref: <same current authenticated ObjectRef or null>
receiver_sequence_epoch_proof_hash: sha-256:<hex or null>
receiver_sequence_epoch_generation: <same current generation or null>
receiver_channel_policy_ref: <ObjectRef or null unless receiver-channel effect>
receiver_channel_policy_hash: sha-256:<hex or null>
receiver_channel_policy_lifecycle_head_ref: <current active ObjectRef or null>
receiver_channel_policy_lifecycle_head_hash: sha-256:<hex or null>
confirmation_assurance_policy_ref: <current applicable ObjectRef>
confirmation_assurance_policy_hash: sha-256:<hex>
confirmation_assurance_policy_lifecycle_head_ref: <current active ObjectRef>
confirmation_assurance_policy_lifecycle_head_hash: sha-256:<hex>
allowed_confirmation_verifier_profile_refs_root: sha-256:<same exact review set>
policy_lifecycle_head_refs: []
execution_control_state_head_ref: <ObjectRef>
control_namespace_ref: <same current ObjectRef>
control_namespace_generation: <integer>
ultimate_receiver: <canonical identity>
receiver_account_or_contract_scope: <canonical scope for every external effect;
                                      null only for receiverless local effect>
receiver_operation_namespace: <canonical namespace for every external effect;
                               null only for receiverless local effect>
explicit_scope_selection_proof_ref: <typed ObjectRef for every external effect;
                                      null only for receiverless local effect>
explicit_scope_selection_proof_hash: sha-256:<hex or null under same exception>
payee_account_commitment: sha-256:<hex or null>
rail: <rail or null>
exposure_vector: []
executor_target: <exact target>
credential_audience: <exact audience>
executor_credential_binding_head_ref: <current ObjectRef>
executor_credential_binding_head_hash: sha-256:<hex>
executor_credential_instance_state_head_ref: <current active ObjectRef>
executor_credential_instance_state_head_hash: sha-256:<hex>
credential_broker_authority_state_head_ref: <current active ObjectRef>
credential_broker_authority_state_head_hash: sha-256:<hex>
warning_codes: []
required_acknowledgement_codes: []
created_at: <time>
expires_at: <time>
binding_set_hash: sha-256:<hex>
binding_service_signature: <Signature>
```

The actor branch is closed. `principal_direct` requires all runtime,
connection-authorization, and connection-state refs to be null. `agent_runtime`
requires all three, resolves the exact signed runtime and authorization objects,
and resolves `connection_state_head_ref` as the exact current active head—not
merely a schema-valid historical head. That head must bind the same principal,
runtime, and authorization, and the binding interval must be contained in their
validity intervals. The DataGrant head set is likewise an exact projection of
the grant set: every grant has one current head, no duplicate or extra head is
accepted, and every current ref is independently resolved.
Each signed BindingSet grant-head entry also commits the required `purpose`,
the exact sorted `uses`, the canonical `resource_scopes` root, and the exact
audience. Live validation authenticates both the DataGrant and its current state
head, requires those commitments to equal the grant, contains the full
BindingSet interval inside both grant and retention expiry, and requires an
`active` current head with `remaining_reads > 0`. For `agent_runtime`, both the
recipient and the complete audience set equal the one runtime-instance key;
membership in a wider provider or agent audience is insufficient. An exhausted
successor is historical read-chain evidence only in Phase 1. It cannot appear as
an eligible BindingSet grant head, and no inline disclosure can turn it into
current execution eligibility.

The schema uses a closed effect-context union. `cancel_receiver_action` requires
the complete cancellation context and forbids checkout fields. Ordinary actions
require `cancellation_context:null`. Checkout roles require a non-null matching
core; all other actions require all checkout fields null. Capability prerequisites
also determine which financial refs are required versus forbidden.
Every external-effect branch also requires the exact current stable receiver-
sequence epoch selector head; receiverless local effects require both selector
fields null. Reservation binds the selector's current authenticated provider
epoch and atomically advances the selector by adding the action's outstanding
entry. Gate/handoff may observe later selector heads only when the bound epoch
proof/generation/value are unchanged and a current-map membership proof retains
this exact entry/assigned scope; a provider-epoch rotation always denies an
unhanded action and requires refreshed review/reservation. Provider-event import
after handoff may use the entry's older assigned draining scope but must still
CAS the current stable selector for the cross-epoch outstanding map. Thus one
unrelated action does not stale all work, but no stale provider epoch is usable.

The authority service derives `principal_authorized_lineage_id` in the immutable
commitment. For supervised work it becomes usable only when the principal signs
an authorization containing the exact commitment and binding set, and the
reservation transaction activates it; otherwise it expires unused. An unchanged
proposal/effect reuses it across quote/review refreshes. A changed proposal or
effect requires a new commitment and MUST NOT activate while an earlier
effect in the lineage is dispatching, submitted, acknowledged, finalized, or
unknown unless a receiver-backed cancellation/failure receipt permits replacement.
The commitment and later activation receipt together prove tuple, sequence,
prior state, and atomic active-lineage fence; runtime-selected IDs deny.

Reading and disclosing remain separate. When private fields leave Cairn, the
binding set contains the exact baseline `DisclosureAuthorization`, projection,
canonical payload hash, field paths, audience, purpose, encrypted delivery-
envelope hash, unique source-read receipt/head/fence, and an active consumable
disclosure reservation. A DataGrant is insufficient. Gate evaluation validates
but never consumes the disclosure fence.
The fenced outbox atomically rechecks the current DataGrant state/nonces and
disclosure state, consumes the disclosure fence, and records the delivery hash
immediately before receiver handoff. The resulting `DisclosureReceipt` is
created after redemption and therefore appears only in the subsequent action-
receipt transition; the immutable redemption receipt carries the held disclosure
reservation and outbox claim, never a forward or mutable receipt reference.
Changed audience, payload, fields, purpose, or envelope requires new principal
authority; a consumed authorization cannot replay. After an ambiguous handoff,
Cairn treats disclosure as delivered for authority accounting. Even authenticated
non-delivery evidence cannot rewind or reuse its fence; every retry requires a
fresh principal-signed DisclosureAuthorization and reservation.

### 7.2 Closed execution-chain versions

The execution bundle MUST contain complete standalone JSON Schemas—not prose
inheritance—for these versions:

| Object | Required execution-profile additions |
|---|---|
| `cairn.action_authorization.v0.2` | exact `execution_binding_set_ref/hash`, warning acknowledgements, exact reserved-judgment decisions, lineage commitment, effect, confirmation policy/nonce, short expiry, principal nonce |
| `cairn.cancellation_authorization.v0.1` | exact cancellation binding set, original action/effect/locator/account/state, new cancellation effect, finality profile, confirmation policy/nonce, warnings, exact cancellation-specific reserved-judgment decisions, short expiry, principal nonce |
| `cairn.authority_reservation.v0.2` | chosen prepared action, action-control key, binding set, authority basis, lineage commitment and expected/next fence, discriminated ledger commits, universal obligation core/state for financial branches, economic-resource exposure before/after head, exact branch-stage seller-inventory context (ordinary held, paired-checkout prepared, readiness-refreshed checkout held, or adopted consumed) plus matching global copy-lease root/receipt, every before/after head and fence, full exposure vector, exact source-read receipts, active disclosure fences and current DataGrant heads/nonces |
| `cairn.gate_dependency_attestation.v0.1` | role-authorized immutable subject, principal, role, state, validity interval, issuing authority, exact issuer signature |
| `cairn.gate_dependency_state_head.v0.1` | authority-normalized current head over one exact role attestation, derived dependency key, predecessor continuity, state and bounded validity |
| `cairn.gate_dependency_manifest.v0.1` | authority-signed complete dependency projection bound to the exact principal, BindingSet, authority, confirmation, release head, all scalar/set dependencies, and gate interval |
| `cairn.gate_request.v0.2` | binding set, current healthy execution-integrity head, authority, confirmation receipt plus current assurance/verifier lifecycle heads, reservation receipts, action-control key, current control/connection/compartment/economic-resource/grant/obligation/deal/listing/market heads, current external provider-identity heads plus eligible trust overlays, current global seller-copy lease set for every inventory action, executor/finality/accounting/channel policies, exact current receiver-sequence epoch selector for every not-yet-handed-off external effect, checkout readiness for terms, and checkout head/terms receipt for payment |
| `cairn.gate_result.v0.2` | exact request/binding hashes, evaluated heads/nonces/fences/business-state/checkout dependency, checks, short expiry, single-use result ID |
| `cairn.action_record.v0.2` | immutable prepared record with binding set, lineage commitment, proposal/effect, and no future authority/reservation refs |
| `cairn.action_state_head.v0.1` | append-only current-state projection carrying later authority, activation, reservations, gate, redemption, outbox, receiver, and prior-state refs as its state permits |
| `cairn.execution_redemption_receipt.v0.2` | binding set, gate result, consumed authority/inventory fences, obligation exposure transfer, source-read-bound disclosure delivery reservations, current heads and checkout dependency, terms-fence pending head plus self-excluding redeemed-state commitment when applicable, effect lease, outbox claim |
| `cairn.action_receipt.v0.2` | binding set, lineage, effect, policies, disclosure receipts, obligation/checkout head transitions, receiver import and current assertion-trust head, exposure before/reserved/spent/remaining, transition chain |

The initial `ActionRecord` is content-addressed and permanently `prepared`; its
closed schema forbids authority, activation, reservation, gate, and receiver refs.
Each later transition emits an immutable receipt and a signed `ActionStateHead`
with monotonic sequence/previous hash and a state-discriminated required/forbidden
ref set. `execution.action.get` returns the initial record plus the current head;
nothing mutates or backfills the prepared object.

The one-shot authorization is specifically:

```yaml
schema: cairn.action_authorization.v0.2
authorization_id: urn:uuid:<uuid>
principal_id: <principal>
execution_binding_set_ref: <ObjectRef>
execution_binding_set_hash: sha-256:<hex>
action_proposal_hash: sha-256:<hex>
principal_authorized_lineage_id: sha-256:<principal-authorized lineage>
lineage_commitment_ref: <ObjectRef>
lineage_commitment_hash: sha-256:<hex>
principal_occurrence_id: sha-256:<fresh occurrence bound by this authorization>
effect_id: sha-256:<hex>
capability: <one capability>
execution_mode: supervised
obligation_exposure_core_ref: <ObjectRef or null for nonfinancial/cancellation>
obligation_exposure_core_hash: sha-256:<hex or null>
obligation_exposure_id: sha-256:<hex or null>
obligation_role: create_or_update | fulfill | null
checkout_group_core_ref: <ObjectRef or null>
checkout_group_core_hash: sha-256:<hex or null>
checkout_role: terms_acceptance | payment | null
checkout_reservation_batch_core_ref: <ObjectRef or null unless paired checkout>
checkout_reservation_batch_core_hash: sha-256:<hex or null>
fulfillment_attempt_core_ref: <ObjectRef or null unless financial value action>
fulfillment_attempt_core_hash: sha-256:<hex or null>
authority_context: direct_transaction | intent_bound
deal_id: <deal or null>
expected_deal_head_hash: sha-256:<hex or null>
terms_or_cart_hash: sha-256:<hex or null>
copy_ids: []
evidence_snapshot_hash: sha-256:<hex or null>
counterparties: []
target: <executor/receiver>
ultimate_receiver_or_payee: <canonical identity>
receiver_account_or_contract_scope: <canonical scope for every external effect;
                                      null only for receiverless local effect>
receiver_operation_namespace: <canonical namespace for every external effect;
                               null only for receiverless local effect>
explicit_scope_selection_proof_ref: <typed ObjectRef for every external effect;
                                      null only for receiverless local effect>
explicit_scope_selection_proof_hash: sha-256:<hex or null under same exception>
payee_account_commitment: sha-256:<hex or null>
exposure_vector: []
rail: <rail or null>
disclosure_authorization_refs: []
disclosure_reservation_refs: []
acknowledged_warning_codes: []
acknowledged_transaction_semantics: []
reserved_judgments_decided: []
idempotency_key: <stable key>
expires_at: <short expiry>
principal_revocation_nonce: <integer>
required_confirmation_assurance_policy_ref: <ObjectRef>
confirmation_nonce: <fresh principal-selected nonce>
authorization_hash: sha-256:<hex>
principal_signature: <Signature>
not_claiming: [execution_complete, receiver_acceptance]
```

For either one-shot authorization branch, the signed
`principal_revocation_nonce` is an eligibility fence, not historical metadata.
At authorization admission, reservation, gate, redemption, and handoff, the
authority service resolves the principal's authoritative current nonce and
requires integer equality with the signed value. The caller, a cached
authorization projection, or the nonce captured by an earlier gate result is
not an authoritative resolver. A missing resolver, missing/forked current
nonce, non-integer value, or lower or higher mismatch denies. A later nonce
increment therefore invalidates every not-yet-used authorization before any
bytes or credentials can leave Cairn.

At each of those boundaries, the authority service derives the complete required
reserved-judgment decision set from the exact BindingSet, review, capability,
and applicable authoritative current policy heads. For both ActionAuthorization
and CancellationAuthorization, the signed `reserved_judgments_decided` array
MUST be sorted by ascending UTF-8 byte order of each item's RFC 8785 JCS
encoding, duplicate-free under that byte equality, and set-equal to the
authority-derived set. Cancellation derives its vector only from the exact
cancellation BindingSet → review graph and applicable cancellation policies; it
MUST NOT inherit or copy the original action's vector. Authorization admission,
reservation, gate, redemption, and handoff independently rederive the current
required set and require exact equality with the signed vector. A missing graph
or policy resolver, missing or unknown judgment, omission, addition, duplicate,
substitution, or policy drift denies and cannot be treated as an empty set.
These nonce and judgment checks
determine current usability only. An immutable historical getter may still
return an old authorization after
revocation when its ObjectRef, canonical bytes, hash, and principal signature
verify using authenticated key/lifecycle history at the signed time; it MUST be
returned only under response semantics that are explicitly historical and MUST
NOT be represented as currently authorized or eligible for execution.

Every other v0.2 object repeats and cross-checks the binding-set ref/hash; a
different hash anywhere denies. `ActionAuthorization` warning codes must equal
the review's complete non-blocking warning set. Delegated mandates require an
empty warning set. For direct paired checkout, the terms and payment BindingSets
and both ActionAuthorizations must each carry exactly
`[TERMS_MAY_BIND_BEFORE_PAYMENT]`; either confirmation receipt proves the
principal saw that exact statement in the combined ceremony. A preauthorized
checkout mandate may replace those per-action acknowledgements only when its
principal-present issuance signed the identical singleton in
`accepted_transaction_semantics`. The code cannot be inferred from a generic
“agent may buy” grant, hidden in terms, dropped because warnings are empty, or
used to authorize a payment retry after the bound attempt is discharged.

The common obligation object prevents a bindable negotiation and its later
payment from becoming two unrelated debits—or no debit at all. It is issued
before the binding set and claims neither authority nor receiver acceptance:

```yaml
schema: cairn.obligation_exposure_core.v0.1
obligation_exposure_id: sha-256:<domain-separated canonical semantic preimage>
principal_id: <principal>
origin: direct_posted_ask | bindable_offer | counteroffer | accepted_terms
deal_id: <deal>
deal_or_listing_head_ref: <ObjectRef>
deal_or_listing_head_hash: sha-256:<hex>
listing_refs: []
copy_ids: []
terms_hash: sha-256:<hex>
named_market_state_ref: <ObjectRef>
named_market_state_hash: sha-256:<hex>
buyer_id: <canonical buyer>
seller_or_payee_id: <canonical seller/payee>
payee_account_commitment: sha-256:<exact canonical payment destination>
item_amount: <typed amount>
asset: <one asset>
mandatory_obligation_components: # at most max_mandatory_obligation_components
  - component_id: sha-256:<domain-separated canonical fields below>
    role: tax | shipping | obligation_fee
    source_kind: terms_line | tax_quote | shipping_quote | fee_schedule
    source_ref: <authenticated immutable ObjectRef>
    source_hash: sha-256:<hex>
    source_line_id: <canonical line identifier>
    amount: <typed nonnegative amount in obligation asset>
mandatory_component_ids_root: sha-256:<canonical sorted component-ID set>
maximum_incremental_fulfillment_cost: <typed amount>
offer_window_start: <authenticated time>
acceptance_deadline: <authenticated time after offer_window_start>
core_hash: sha-256:<hex>
authority_service_signature: <Signature>
not_claiming: [principal_authority, receiver_acceptance, payment]
```

The semantic preimage is exactly the schema/domain version plus origin,
principal, deal ID, deal/listing head ref+hash, canonically sorted listing refs
and copy IDs, terms hash, market state ref+hash, buyer, seller/payee, payee account
commitment, item amount, and asset.
Each mandatory component ID is computed before the obligation ID over
`["cairn-obligation-mandatory-component-v0.1", role, source_kind, source_ref,
source_hash, source_line_id, amount, asset]`. The semantic preimage includes the
canonical full component objects and recomputed component-ID root, maximum
incremental-fulfillment cost, offer-window start, and acceptance deadline. It
excludes only `obligation_exposure_id`, `core_hash`, signatures, and
`not_claiming`; no economic or routing field is implicit. The authority service
atomically enforces one `obligation_exposure_id → core_hash` mapping. Reuse with a
different core conflicts; a new consequential value creates a new ID/core while
the prior exposure remains held until its own release proof.

The authoritative quote/terms component set is partitioned exactly once: item
price; mandatory obligation components already determined and unavoidable if the
terms bind; and a bounded maximum for genuinely not-yet-incurred fulfillment
costs. Every authenticated source line appears in exactly one partition and the
checked sum equals the reservation's full canonical/worst-case exposure. An
unknown compulsory tax, shipping charge, or fee blocks bindable submission rather
than being hidden in the incremental ceiling; the same source line can never move
partitions on retry.

```yaml
schema: cairn.fulfillment_attempt_core.v0.1
obligation_exposure_core_ref: <ObjectRef>
obligation_exposure_core_hash: sha-256:<hex>
obligation_exposure_id: sha-256:<same exact obligation>
attempt_generation: <monotonic integer starting at 0>
origin: direct_fulfillment | paired_checkout_before_terms
payment_proposal_hash: sha-256:<hex>
payment_semantics_hash: sha-256:<exact payee/account/amount/asset/rail/obligation>
payment_effect_id: sha-256:<hex>
checkout_group_core_ref: <ObjectRef or null; required for paired checkout>
mandatory_component_ids_root: sha-256:<must equal obligation core>
incremental_cost_components: # at most max_incremental_cost_components_per_attempt
  - component_id: sha-256:<domain-separated canonical fields below>
    role: rail_fee | tax | shipping | reversal_reserve
    source_kind: quote_line | provider_fee_schedule | tax_quote |
                 shipping_quote | accounting_policy
    source_ref: <authenticated immutable ObjectRef>
    source_hash: sha-256:<hex>
    source_line_id: <canonical line identifier>
    amount: <typed amount in obligation asset>
prior_attempt_state_head_ref: <ObjectRef or null for generation 0>
prior_non_submission_or_failure_receipt_ref: <ObjectRef or null for generation 0>
expires_at: <time>
attempt_core_hash: sha-256:<hex>
authority_service_signature: <Signature>
not_claiming: [principal_authority, terms_accepted, payment_submitted]
```

The service recomputes each component ID over profile/schema version, obligation
ID, role, source kind/ref/hash/line ID, amount, and asset. The canonical set is
sorted by ID and rejects duplicate IDs, duplicate semantic source lines, unknown
roles/sources, or the same ID with different fields. A retry referencing the same
authenticated cost line must reuse the same ID and cannot charge it again; a new
source/line requires fresh authority within the core's maximum incremental cost.
Mandatory obligation components are not incremental components and may not be
repeated here. Every attempt carries the core's exact mandatory-component root;
fulfillment transfers the item plus every mandatory component atomically under
the one item-transfer fence.

```yaml
schema: cairn.obligation_exposure_state_head.v0.1
obligation_exposure_core_ref: <ObjectRef>
obligation_exposure_core_hash: sha-256:<hex>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: potential_reserved | sent_unresolved | terms_pending_conditional |
       acceptance_window_closed_unresolved |
       terms_unknown_conditional | terms_unknown_payment_unavailable |
       receiver_bound_inventory_pending | receiver_bound_ready |
       receiver_reversal_inventory_release_pending |
       fulfillment_locked | fulfillment_unknown | fulfillment_retryable |
       fulfilled_reversal_outstanding | fulfilled |
       receiver_rejected | expired | cancelled | reversed |
       quarantined
pre_quarantine_state: <one exact prior state above, or null unless quarantined>
remediation_transaction_id: <stable coordinator transaction id or null>
remediation_commitment_hash: sha-256:<exact self-excluding atom/cause tuple or null>
current_fulfillment_attempt_core_ref: <ObjectRef or null>
current_fulfillment_attempt_core_hash: sha-256:<hex or null>
current_fulfillment_attempt_generation: <integer or null>
attempt_discharge_or_failure_receipt_ref: <ObjectRef or null>
item_transfer_fence: <integer or null until first lock>
mandatory_component_ids_root: sha-256:<must equal obligation core in every state>
conditional_component_holds_root: sha-256:<canonical set or empty root>
locked_component_ids_root: sha-256:<canonical cumulative set or empty root>
active_reversal_atoms_root: sha-256:<obligation-keyed set or empty root>
quarantine_hold_atoms_root: sha-256:<obligation-keyed conservative set or empty root>
current_exposure_role: obligation_reserved | conditional_fulfillment_held |
                       fulfillment_locked |
                       reversal_outstanding | conservatively_held | released
current_exposure_amount: <typed amount>
origin_action_or_receiver_receipt_ref: <ObjectRef>
updated_at: <authority-service time>
state_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Every bindable offer/counter/acceptance authority reservation holds the full
item plus mandatory-component obligation against this ID. Submission or receiver
acceptance never releases it. Receiver acceptance is valid only when its
authenticated receiver time is inside the half-open interval
`[offer_window_start, acceptance_deadline)` (or when an authenticated import
proves the receiver accepted inside that interval). Once that timely acceptance
commits `receiver_bound_ready`, the acceptance deadline no longer blocks
fulfillment; each fulfillment attempt has its own short expiry. A late acceptance
cannot create a valid receiver-bound obligation: it quarantines the deal and
preserves existing exposure because an external receiver may nevertheless claim
acceptance. A local timer never proves that a submitted offer was not timely
accepted: after the deadline, `sent_unresolved` becomes
`acceptance_window_closed_unresolved` and retains the entire hold until an
authenticated receiver event proves timely acceptance, rejection/cancellation,
or authoritative expiry/nonacceptance under the exact finality profile. `expired`
releases only before handoff with fenced non-submission proof or from that exact
receiver-confirmed nonacceptance proof; it is never a local post-handoff timeout.
Direct
fulfillment MUST bind the same core and current
`receiver_bound_ready` state. The first direct attempt atomically installs one
item-transfer fence, changes
`obligation_reserved → fulfillment_locked`, and locks the exact attempt. Each
incremental rail/fee/reversal component is keyed by immutable component ID and
charged at most once; item value and mandatory components are never incremental
components and are transferred exactly once together.

Paired checkout is the only pre-terms exception. Before terms are confirmed it
enters `terms_pending_conditional` with paired generation 0 under the exact
checkout readiness receipt. It does not transfer/debit item value or spend a fee;
it may place each declared component in a conditional outstanding hold once so
the paired authority is actually fundable. It cannot reach the payment outbox.
An authenticated terms-confirmation CAS always enters
`receiver_bound_inventory_pending` and drives the group to its matching inventory-
pending state while preserving the conditional holds; it does not yet transfer
the item or decide payment eligibility. Only the later seller-signed consume plus
CheckoutTermsSuccessorReceipt evaluates the still-current payment authority. Its
payment-ready branch promotes those same component IDs without a second hold,
installs the sole item-transfer fence, performs the one item role transfer, and
enters `fulfillment_locked`. Its payment-unavailable branch discharges the
conditional attempt, retains the item obligation, enters `receiver_bound_ready`,
and drives checkout to `payment_blocked_after_terms`; it never rejects the now-
authenticated terms.
Terms failure/cancellation before confirmation releases only under its exact
receiver/fenced proof.

The schema is a discriminated union, not a free cross-product. The machine bundle
must enforce this complete tuple table:

| State family | Attempt fields | Item fence | Component roots | Exposure role / amount |
|---|---|---|---|---|
| `potential_reserved`, `sent_unresolved` | all null | null | mandatory exact; conditional/locked empty | `obligation_reserved`; item + mandatory components |
| `acceptance_window_closed_unresolved` | all null | null | mandatory exact; conditional/locked empty | `conservatively_held`; item + mandatory components |
| `terms_pending_conditional`, `terms_unknown_conditional` | paired generation 0 required; no discharge | null | mandatory exact; conditional exact; locked empty | `conditional_fulfillment_held`; item + mandatory + conditional components |
| `receiver_bound_inventory_pending` | paired generation 0 active, or exact discharged-payment-unavailable proof | null | mandatory exact; conditional exact iff active, otherwise empty; locked empty | active: `conditional_fulfillment_held`, item + mandatory + conditional; discharged: `obligation_reserved`, item + mandatory |
| `receiver_reversal_inventory_release_pending` | paired generation 0 discharged by CheckoutPreconsumeTermsReversalReceipt | null | mandatory exact; conditional/locked empty | `conservatively_held`; item + mandatory until seller release is authenticated |
| `terms_unknown_payment_unavailable` | discharged paired attempt + expiry/revocation proof required | null | mandatory exact; conditional/locked empty | `obligation_reserved`; item + mandatory components |
| `receiver_bound_ready` | either all null, or one discharged conditional attempt + proof | null | mandatory exact; conditional/locked empty | `obligation_reserved`; item + mandatory components |
| `fulfillment_locked` | one current direct/activated-paired attempt required; no discharge | required | mandatory exact; conditional empty; locked cumulative | `fulfillment_locked`; item + mandatory + at-risk incremental components |
| `fulfillment_unknown` | same attempt required | required | mandatory exact; conditional empty; locked cumulative | `conservatively_held`; no less than prior locked amount |
| `fulfillment_retryable` | prior attempt + exact failure/non-submission proof required | required | mandatory exact; conditional empty; locked cumulative | `fulfillment_locked`; same held item, mandatory, and at-risk incremental components |
| `fulfilled_reversal_outstanding` | successful attempt + reversible-finality profile required | required | mandatory exact; conditional empty; locked cumulative; exact active-reversal root | `reversal_outstanding`; exact obligation-keyed reversal amount, while debit remains in confirmed-spend ledger |
| `fulfilled` | successful attempt + irreversible-finality proof required | required | mandatory exact; conditional empty; locked cumulative; reversal root empty | `released`, zero outstanding; item + mandatory + charged incremental amount remains recorded exactly once in confirmed-spend ledger |
| `receiver_rejected`, `expired`, `cancelled` | null or discharged conditional attempt only | null | mandatory exact; conditional/locked empty | `released`, zero, only from exact proof |
| `reversed` | retain every prior attempt/fence/history root | retain prior value | active-reversal and quarantine roots empty; exact confirmed-reversal event recorded | `released`; zero unresolved exposure; realized reversal remains in historical accounting |
| `quarantined` | retain every prior attempt/fence/root | retain prior value | retain prior roots plus exact quarantine root | `conservatively_held`; exact quarantine-atom sum no less than greatest prior/reversal exposure |

Any other required/forbidden-field combination is schema-invalid. Every row
except `fulfilled_reversal_outstanding` requires
`active_reversal_atoms_root` to be the canonical empty root. Every row except
`quarantined` requires `quarantine_hold_atoms_root` to be the empty
root. `pre_quarantine_state` and remediation fields are required only for
`quarantined`; the recorded prior state can never itself be `quarantined`. State and
compartment-ledger delta commit in one serializable transaction. The closed state
edges are: `potential_reserved → sent_unresolved | terms_pending_conditional |
cancelled | expired`; `sent_unresolved → receiver_bound_ready |
receiver_rejected | cancelled | acceptance_window_closed_unresolved |
quarantined`; `acceptance_window_closed_unresolved → receiver_bound_ready |
receiver_rejected | cancelled | expired | quarantined` only from an authenticated
receiver event under the bound finality profile;
`terms_pending_conditional → terms_unknown_conditional |
receiver_bound_inventory_pending | terms_unknown_payment_unavailable |
receiver_rejected | cancelled | expired | quarantined`;
`terms_unknown_conditional → receiver_bound_inventory_pending |
terms_unknown_payment_unavailable | receiver_rejected | cancelled | quarantined`;
`terms_unknown_payment_unavailable → receiver_bound_inventory_pending | receiver_rejected |
cancelled | quarantined`; `receiver_bound_inventory_pending →
fulfillment_locked | receiver_bound_ready` only through the exact seller-consume/
CheckoutTermsSuccessorReceipt transaction, or to
`receiver_reversal_inventory_release_pending` through the authenticated
pre-consume reversal receipt; `receiver_reversal_inventory_release_pending →
reversed` only after the exact seller-signed `terms_fenced → available` release
receipt and checkout completion receipt; either pending state may enter
`quarantined` through the ordinary coordinator path;
`receiver_bound_ready →
fulfillment_locked | reversed | quarantined`; `fulfillment_locked →
fulfillment_unknown | fulfillment_retryable | fulfilled_reversal_outstanding |
fulfilled | reversed |
quarantined`; `fulfillment_unknown → fulfillment_retryable | fulfilled |
fulfilled_reversal_outstanding | reversed | quarantined` only from a strictly newer authenticated event;
`fulfillment_retryable → fulfillment_locked | reversed | quarantined`; and
`fulfilled_reversal_outstanding → fulfilled | reversed | quarantined` only from
strictly newer authenticated irreversible-finality/reversal/dependency evidence;
and `fulfilled → quarantined`. `reversed → quarantined` is permitted only when
the reversal evidence itself becomes a compromised trust dependency. A
`receiver_rejected`, `expired`, or `cancelled`
head whose release depended on a later-compromised receiver assertion has one
exceptional coordinator-only edge to `quarantined`: it is valid only inside the
same `execution.trust_compromise.commit` transaction that restores the exact
conservative exposure and preserves the prior terminal outcome as immutable
history. No ordinary writer or new receiver event can reopen those states.
Coordinator remediation permits `quarantined → quarantined` while exact atoms or
unresolved commitments change. Evidence resolution can end only at receipt-wide
`complete_frozen`; it never writes a non-quarantined obligation. Only a later
`execution.exposure_remediation.resume` with the complete fresh
RemediationResumeAuthorization set permits `quarantined → recorded
pre_quarantine_state` for an independently revalidated outcome, or
`quarantined → reversed` for a conclusively confirmed typed reversal. That same
receipt-wide transaction must
empty or reclassify the quarantine root, update compartment/resource/limit-ledger
roots, and preserve attempt/fence/component history. No other outgoing quarantine
edge exists; every state not explicitly listed remains terminal.

There is exactly one current attempt. Retry requires
`fulfillment_retryable`, exact authenticated failure/fenced-non-submission proof,
generation + 1, and new authority/reservation. It preserves the item-transfer
fence and never transfers/debits item value again; existing component IDs cannot
be re-held/charged. A new authenticated bounded component requires a fresh exact
payment proposal, review, BindingSet, authority and attempt; checkout additionally
requires terminal supersession of the old exact-payment group and a new accepted-
obligation adoption group as specified in §10. No old authorization or group core
can absorb a changed amount or payment-semantics hash.
Unknown blocks retry and release. These rules govern checkout and non-checkout.
Payment without an exact core/current tuple/attempt is denied. Changed terms,
copies, seller/payee, amount, asset, market, mandatory components, offer-window
start, or acceptance deadline create a new core and do
not release the old one.

The authority reservation uses a closed discriminated union. Every branch commits
the lineage ledger plus principal action-count/rate ledgers. `preauthorized` also
commits the mandate count/rate ledgers and, for a financial capability, the exact
mandate monetary aggregate/window/outstanding ledger set; `supervised_ordinary` instead commits the
ActionAuthorization consumption ledger; `cancellation` commits the
CancellationAuthorization consumption ledger. Neither one-shot branch contains a
mandate ledger. A financial
capability additionally commits principal monetary aggregate/window/outstanding
ledgers and the compartment/economic-resource ledger. A nonfinancial capability
forbids those monetary/compartment entries and reserves only typed count, rate,
payload, audience, inventory, or attention resources applicable to its registry
profile. Each entry binds its typed role, namespace, resource key, head before and
after, sequence, fence before and after, and reserved exposure or count. All
Cairn-controlled commits occur in one serializable transaction. Independent
seller inventory remains the explicit saga from the baseline.

For a value action, the binding set authorizes pre-reservation compartment head
`H0`. The reservation receipt must prove the exact serializable `H0 → H1`
transition whose only permitted delta is the named exposure/sequence/fence update.
The sole exception is a direct paired checkout: both BindingSets bind the same
CheckoutAuthorityReservationBatchCore and H0, and the one batch receipt proves
the exact disjoint union delta, two named subreservations, and common H1 described
in §10. Neither individual subreservation claims a separate H0→H1 transition.
At gate/redemption time the current head may be later `Hn` because unrelated valid
reservations can advance the ledger. The request binds Hn plus a membership proof
that this exact reservation ID/fence/exposure remains active under Hn's
`active_reservations_root`, and rechecks current aggregate/outstanding/control
state. The original H0→H1 receipt must still link authorization to the reservation.
An altered/removed reservation, invalid membership proof, regressed sequence, or
current limit/control failure denies; unrelated active reservations do not.

The machine-artifact phase MUST expand the table into closed schemas and direct
mutants for deletion or substitution of every binding. Until then, the document
authorizes no execution service.

The gate result is short-lived and single-action, not an executor lease. Atomic
redemption rechecks nonces, freezes, deal head, reservations, review, quote, and
effect identity. Capability policy names whether provider review, Cairn review,
or both are required. Financial and bindable effects require review. Provider
warnings remain typed and cannot be suppressed; model summaries are judged only.

Any changed quote, ask, cart, terms, total, fees, tax, shipping, seller, payee,
receiver, account, rail, executor, copy, evidence, review/taint/accounting/finality
policy, runtime, or compartment definition invalidates review. Any changed
connection/control head, mandate, grant, deal head, nonce, freeze, or named market
state invalidates the `ExecutionBindingSet` and gate. The only deal/obligation-
head exception is a direct-checkout payment BindingSet that binds the acyclic
CheckoutTransitionTemplate and its exact readiness/terms delta profiles rather
than a guessed future predecessor. It later presents the one-way
template→CheckoutReadinessReceipt→current ready-group head→
CheckoutTermsSuccessorReceipt chain and every still-current after-head. The
readiness step permits only the template's exact inventory-reservation delta and
named authority/conditional-obligation/group changes; the terms step permits only
the complete receiver-confirmed successor vector. Every other delta still
invalidates it. A compartment head may
advance through unrelated valid reservations after this action's exact H0→H1
transition; the action remains valid only while its immutable reservation has a
current membership proof and every current limit/control check passes.
Staleness creates a new object; it never edits an existing receipt.

## 8. Deterministic execution gate

Before evaluating checks, the authority service derives and signs a
`cairn.gate_dependency_manifest.v0.1` from the exact BindingSet, authority,
confirmation, action, reservations, post-reservation transitions, provider
identity/lifecycle graph, inventory graph, and capability-policy registry. The
GateRequest binds that manifest by exact ObjectRef/hash. The manifest, rather
than a caller callback or a copy of GateRequest, is the authoritative complete
projection: reservation receipts; control, DataGrant, business,
provider-identity, trust-overlay, policy, and checkout sets; release, integrity,
and confirmation-lifecycle heads; connection, compartment, and
economic-resource heads; seller-copy root; executor, finality, accounting,
channel, and selector policies/heads; and checkout readiness/group/terms refs.
Arrays compare as sorted unique exact ObjectRef sets, rejecting omissions and
extras; scalars compare as exact refs or exact nulls. The manifest binds the
exact principal, BindingSet, authority, confirmation, and an interval containing
`requested_at`. Missing, unsigned, expired, or cross-wired manifests deny.

Every projected role that is not represented by a locally validated native
Phase-1 object resolves a `cairn.gate_dependency_state_head.v0.1`. That head is
not an opaque generic assertion: it names a non-null, exact
`cairn.gate_dependency_attestation.v0.1`, whose signature controller must equal
the configured trusted authority for that role. The attestation binds an
immutable subject ref/hash, principal, role, state, and validity interval. The
normalized head's `dependency_key` is derived from
`(principal_id, dependency_role, subject_ref)`, its role/principal/state must
equal the source attestation, its interval must be contained by the source, and
genesis is exactly sequence zero in `active` state with no predecessor. Every
non-genesis head authenticates the exact signed predecessor and a newly signed
role attestation over the same immutable subject. The closed successor graph is
`active → paused | restricted | revoked | expired`,
`paused → active | restricted | revoked | expired`, and
`restricted → active | paused | revoked | expired`; `revoked` and `expired` are
terminal. Sequence advances exactly one, update and attestation issuance time
are monotonic, and neither a new subject nor a non-active genesis can manufacture
history. One generic
signer cannot relabel a source across release, integrity, lifecycle, provider,
finality, accounting, or checkout trust domains. A role with no locally
validated native object and no trusted source attestation is unsupported and
denies `allow`. Every mutable projected ref also resolves as the authoritative
current head at the GateResult evaluation time.

```yaml
schema: cairn.gate_dependency_attestation.v0.1
attestation_id: urn:uuid:<uuid>
principal_id: <principal>
dependency_role: <closed gate role>
subject_ref: <immutable role-specific subject ObjectRef>
subject_hash: sha-256:<same hash>
state: active | paused | restricted | revoked | expired
valid_from: <time>
valid_until: <time>
issued_at: <time within interval>
issuing_authority_id: <configured authority for this exact role>
attestation_hash: sha-256:<hex>
issuing_authority_signature: <Signature>
```

```yaml
schema: cairn.gate_dependency_state_head.v0.1
dependency_key: sha-256:<principal/role/subject preimage>
principal_id: <same principal>
dependency_role: <same role>
source_ref: <GateDependencyAttestation ObjectRef>
source_hash: sha-256:<exact attestation hash>
sequence: <zero at active genesis; exact predecessor + 1 thereafter>
previous_head_hash: sha-256:<null exactly at active genesis; exact predecessor otherwise>
state: active | paused | restricted | revoked | expired
valid_from: <contained interval>
valid_until: <contained interval>
updated_at: <monotonic authority time>
head_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

`cairn.gate_dependency_manifest.v0.1` carries the complete projection fields
listed above plus `manifest_id`, `principal_id`, exact BindingSet ref/hash,
authority ref, confirmation ref, execution-release ref, `created_at`,
`expires_at`, `manifest_hash`, and `authority_service_signature`. GateRequest
adds `dependency_manifest_ref/hash`; neither object accepts extensions.

GateResult contains exactly these 19 check codes, in this order, with no missing,
duplicate, or extra code:
`SCHEMA_SIGNATURE`, `EXECUTION_RELEASE`, `AUTHENTICATION_BRANCH`,
`DATA_GRANTS_DISCLOSURES`, `EXECUTION_CONTROLS`, `LIFECYCLES_KEYS`,
`NONCES_FENCES`, `AUTHORITY_CONFIRMATION`, `BINDING_EQUALITY`,
`BUSINESS_DEPENDENCIES`, `REVIEWS_POLICIES`, `RESERVED_JUDGMENTS`, `LIMITS`,
`ECONOMIC_EXPOSURE`, `RESERVATION_FENCES`, `DUPLICATE_EFFECT_LINEAGE`,
`EXECUTOR_TARGET`, `DOMAIN_POLICY`, and `ATOMIC_PRECONDITIONS`. `allow` requires
all 19 to pass; `deny` requires at least one deny. Each code has its own
predicate and the smallest exact evidence-ref set actually evaluated for that
predicate. A single global “all dependencies active” bit, identical evidence on
all checks, caller-selected labels, and empty evidence are nonconforming.
Reservation-related checks resolve the signed reservation, prepared action,
BindingSet, authority, and lineage commitment and run the full reservation/fence
semantics. Unimplemented predicates deny rather than inherit another check's
pass. The evaluated-head, business-state, and checkout roots are recomputed from
the same signed manifest and authenticated graph rather than from an
independently supplied set.

The Phase-1 schema-only bundle deliberately has no valid `allow` path. The
checks `BUSINESS_DEPENDENCIES`, `REVIEWS_POLICIES`, `RESERVED_JUDGMENTS`,
`LIMITS`, `ECONOMIC_EXPOSURE`, `DUPLICATE_EFFECT_LINEAGE`, `EXECUTOR_TARGET`,
`DOMAIN_POLICY`, and `ATOMIC_PRECONDITIONS` do not yet have complete
authoritative evaluators and therefore always deny. Missing role evidence also
denies; caller-provided maps, booleans, callbacks, or wrapper labels cannot
supply a pass. GateResult validation rejects every `decision:allow` as
`phase1_gate_allow_unsupported`, even if its submitted check list says all pass.
Phase-1 GateResults are authenticated deny diagnostics only.

GateRequest and GateResult signatures are mandatory on every live gate,
redemption, and handoff path. GateResult establishes one trusted
`evaluationTime = evaluated_at`, passes it to authority, confirmation, current
head, lifecycle, and dependency eligibility checks, and enforces
`requested_at ≤ request signature time ≤ evaluated_at ≤ result signature time`.
Its expiry cannot exceed the BindingSet, one-shot authority, confirmation,
manifest, reservation, or any evaluated dependency deadline. Backdating a
request into an earlier active interval cannot revive an expired dependency.

Gate evaluation authenticates every dependency at `evaluated_at`: source
attestations must have `issued_at <= evaluated_at`, state wrappers must have
`updated_at <= evaluated_at`, signatures must already be valid at that instant,
and a current-head resolver receives that same evaluation time. Cancellation
also authenticates the exact original action and its state head unconditionally,
and a live cancellation gate requires that original state head to remain the
current head at evaluation.

The gate evaluates in this exact fail-closed order:

1. parse, I-JSON, schema, canonicalization, hash, and signature;
2. exact protocol/profile/resource/bundle/registry/operation version and current
   active execution-release head;
3. exactly one authentication branch:
   - `agent_runtime`: runtime binding, current connection head, and applicable
     OAuth resource/issuer/client/DPoP requirements;
   - `principal_direct`: principal authentication plus transaction-bound
     signature; runtime/connection refs MUST be null;
4. current DataGrant state/nonces for each private resource read; and for every
   private field leaving Cairn, exact disclosure authorization/payload/fields/
   audience/purpose/envelope, unique source-read receipt/head/fence, plus an
   active disclosure reservation. Gate only validates these objects; the outbox
   performs atomic one-use consumption at handoff. Public posted-ask data alone
   requires neither;
5. global and scoped execution-control head and freeze state;
6. lifecycle of runtime when present, connection when present, DataGrants,
   authority, compartment, policies, and keys;
7. all pause epochs and revocation nonces, including fresh authoritative
   resolution and exact equality of the current principal nonce for either
   one-shot authorization branch; unavailable, forked, stale, lower, or higher
   nonce state denies;
8. exact capability and one closed authority branch: supervised ordinary action
   requires one exact v0.2 ActionAuthorization; preauthorized action requires one
   current v0.3 AgentMandate; `cancel_receiver_action` requires one exact
   CancellationAuthorization and can never reuse authority over the original
   effect. Verify a fresh transaction-bound ConfirmationReceipt for either
   one-shot branch, or the mandate-issuance ConfirmationReceipt for that exact
   current mandate, against the required assurance policy; then verify the exact
   business tuple or cancellation context;
9. exact `ExecutionBindingSet` and equality across authorization, reservations,
   gate request, action, and every named object;
10. deal head, proposal, lineage, effect, terms/cart, copy, exact globally current
    seller-copy lease/inventory context and fence when inventory applies, evidence, receiver,
   payee, rail,
   executor, provider-account binding, and—when checkout terms—the exact group
   core and consumable readiness receipt; when checkout payment, the exact core,
   current eligible state head, obligation exposure, and authenticated terms-
   confirmation receipt plus the role-appropriate terms-successor or existing-
   obligation adoption receipt;
11. review, quote, taint, accounting, and finality signatures, policy hashes,
    warnings, unknowns, source paths, event order, and expiry;
12. the authority-derived complete reserved-judgment set and required human/
    warning decisions; both one-shot authorization branches carry a signed,
    JCS-byte-sorted, duplicate-free `reserved_judgments_decided` array set-equal
    to the exact branch-specific BindingSet → review → applicable-policy
    derivation. Cancellation derives this vector from the cancellation graph and
    never inherits it from the original action. Any missing resolver, unknown
    judgment, omission, addition, duplicate, substitution, or current-policy
    mismatch denies;
13. all action/window/aggregate/outstanding/cost/rate limits;
14. compartment definition, protection attestation, unique current resource-cap
    selector, current compartment and economic-resource exposure heads, exact
    cap/ref/atom-union equality across every alias, and alias uniqueness;
15. authority/inventory reservation fences and all ledger commits;
16. exact effect and no live/unknown duplicate in either effect or lineage;
17. executor capability, target, credential audience, idempotency, reconciliation;
18. domain policy and no-overclaim requirements; and
19. serializable reservation plus atomic redemption preconditions.

Unknown schemas, capabilities, extensions, limits, provider/key/warning states,
receiver identities, or reconciliation states deny. Stable codes include
`CONNECTION_NOT_AUTHORITY`, `DATA_SCOPE_DENIED`, `MANDATE_SCOPE_MISMATCH`,
`COMPARTMENT_FROZEN`, `LIMIT_EXCEEDED`, `REVIEW_STALE`, `REVIEW_BLOCKED`,
`TAINT_POLICY_BLOCKED`, `REVOCATION_STALE`, `RESERVATION_CONFLICT`,
`DUPLICATE_EFFECT_BLOCKED`, `RECEIVER_STATE_UNKNOWN`, and
`RECONCILIATION_REQUIRED`.

## 9. Execution, cancellation, and reconciliation

The existing `ActionRecord` state machine remains normative. No backward
transition or generic `success` is added. `redemption_committed` means the fenced
outbox owns the first receiver call and reconciliation may be required.

```yaml
schema: cairn.outbox_state_head.v0.1
action_ref: <ObjectRef>
effect_id: sha-256:<hex>
lineage_id: sha-256:<hex>
effect_lease_ref: <ObjectRef>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: pending_handoff | handoff_committed | non_submission_proved
receiver: <exact receiver>
receiver_account_or_contract_scope: <exact scope for every external effect;
                                      null only for receiverless local effect>
receiver_operation_namespace: <exact namespace for every external effect;
                               null only for receiverless local effect>
explicit_scope_selection_proof_ref: <typed ObjectRef for every external effect;
                                      null only for receiverless local effect>
explicit_scope_selection_proof_hash: sha-256:<hex or null under same exception>
credential_audience: <exact audience>
precommitted_client_reference: <stable id>
request_bytes_hash: sha-256:<hex>
handoff_prerequisite_profile_hash: sha-256:<closed capability profile>
handoff_snapshot_ref: <cairn.handoff_prerequisite_snapshot.v0.1 ObjectRef or null until handoff>
handoff_snapshot_root: sha-256:<evaluated heads/proofs/limits or null until handoff>
fencing_token: <integer>
updated_at: <outbox service time>
state_hash: sha-256:<hex>
outbox_service_signature: <Signature>
```

The content-addressed handoff snapshot contains the action/capability/profile,
evaluation time, and a canonical complete-set array of every required prerequisite
role with exact object/head ref/hash, sequence/nonce/fence, current eligibility,
expiry, membership or non-membership proof hash, and limit/policy value. The
capability profile defines required and forbidden roles; omission, duplication,
unknown roles, or extras deny. The snapshot root commits the full array, including
deal/listing/ask/market heads and source-read provenance where applicable.
The current healthy ExecutionIntegrityStateHead is a mandatory role for every
capability and is CASed in the same final handoff transaction; a concurrent
fail-stop wins before handoff or makes the handoff CAS fail.

Immediately before network bytes or credentials become available, the worker
CASes `pending_handoff → handoff_committed` and emits
`cairn.outbox_handoff_receipt.v0.1`, binding both heads, action/effect/lineage,
lease, receiver, credential audience, request digest, client reference, fence,
receiver account/contract scope, operation namespace, explicit provider-side
selection proof, capability prerequisite profile plus snapshot ref/root, and
service time. The registered outbound request envelope repeats that exact scope/
namespace and its bytes hash; an implicit receiver default is forbidden. A missing
provider response after that commit is receiver state
`unknown`, never non-submission.

Only while the current state is `pending_handoff` can the outbox CAS to
`non_submission_proved` and emit `cairn.fenced_non_submission_receipt.v0.1` over
the same bindings plus expiry/cancel reason. The two receipts are mutually
exclusive under one head/fence. A local process assertion, timeout, missing
provider ID, or model claim is not proof.

`execution.reservation.release` may be requested by a principal/runtime but the
authority service releases only from an exact unredeemed-release receipt for an
expiry/conflict, a valid fenced-non-submission receipt, or an authenticated
receiver/finality/refund event
allowed by the bound accounting policy. Unknown remains held. The registry uses
`execution.action.cancel_before_submission` only for this local fenced path;
`execution.action.execute_cancellation` executes the separately prepared,
authorized cancellation action after handoff. Neither operation rewinds the
original ActionRecord.

Post-submission cancellation is a separate consequential action, not a backward
transition of the original action:

```yaml
schema: cairn.receiver_event_stream_state_head.v0.1
receiver_event_stream_key: sha-256:<domain-separated receiver/account/operation/
                                      action/effect/client-reference tuple>
receiver_id: <canonical receiver>
receiver_account_or_contract_scope: <canonical scope>
operation_kind: <exact capability/provider operation>
action_ref: <ObjectRef>
effect_id: sha-256:<hex>
precommitted_client_reference: <stable id>
finality_transition_profile_ref: <ObjectRef>
finality_transition_profile_hash: sha-256:<hex>
sequence: <monotonic Cairn integer>
previous_state_hash: sha-256:<hex or null>
receiver_evidence_kind: none | authenticated_event
receiver_sequence: <authenticated monotonic receiver value or null iff none>
last_event_import_ref: <ObjectRef or null iff none>
last_event_import_hash: sha-256:<hex or null iff none>
state: no_authenticated_event | submitted | acknowledged | accepted | rejected |
       cancelled | failed | fulfilled | reversed | unknown | quarantined
updated_at: <authority-service time>
head_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The head is a closed evidence union. Redemption genesis and fenced outbox
handoff use `receiver_evidence_kind:none` with all three receiver-evidence fields
null; handoff may therefore create `state:unknown` without fabricating receiver
truth. Every provider-event successor—including an authenticated event whose
classified state remains `unknown`—uses `authenticated_event` with all three
fields non-null. No other combination is valid.

Every authenticated provider event is also bound through two independent,
authoritative uniqueness keys before it can affect a receiver stream:

```yaml
schema: cairn.receiver_event_import_core.v0.1
receiver_event_import_key: sha-256:<JCS of provider domain/source scope/event ID/
                                   sequence epoch/sequence/raw digest>
provider_trust_domain_id: <canonical domain>
adapter_identity_ref: <immutable ObjectRef>
adapter_identity_hash: sha-256:<hex>
adapter_identity_lifecycle_head_ref: <current active ObjectRef>
adapter_identity_lifecycle_head_hash: sha-256:<hex>
source_credential_authority_key: sha-256:<stable authority>
source_credential_core_ref: <immutable ObjectRef>
source_credential_core_hash: sha-256:<hex>
source_credential_lifecycle_head_ref: <exact authenticated generation ObjectRef>
source_credential_lifecycle_head_hash: sha-256:<hex>
source_credential_generation: <integer>
authenticated_source_proof_ref: <provider/adapter verification ObjectRef>
authenticated_source_proof_hash: sha-256:<hex>
raw_event_bytes_hash: sha-256:<exact authenticated bytes>
event_schema_uri: <immutable URI>
event_schema_hash: sha-256:<hex>
provider_event_id: <authenticated opaque id>
provider_sequence: <canonical uint64>
sequence_epoch_value_commitment: sha-256:<hex>
receiver_sequence_epoch_selector_state_head_ref: <current stable selector ObjectRef>
receiver_sequence_epoch_selector_state_head_hash: sha-256:<hex>
assigned_identity_scope_index_key: sha-256:<scope selected at admission>
assigned_identity_scope_index_head_ref: <current assigned scope ObjectRef>
assigned_identity_scope_index_head_hash: sha-256:<hex>
receiver_time: <authenticated audit-only time>
declared_event_id_scope: <canonical provider scope>
declared_sequence_stream_scope: <canonical provider scope>
receiver_or_channel_id: <canonical receiver>
receiver_account_or_contract_scope: <exact scope>
receiver_operation_namespace: <exact namespace>
receiver_operation_id: <authenticated operation id>
receiver_operation_kind: <exact operation>
scope_selection_proof_ref: <typed ObjectRef>
scope_selection_proof_hash: sha-256:<hex>
action_ref: <ObjectRef>
effect_id: sha-256:<hex>
lineage_id: sha-256:<hex>
precommitted_client_reference: <stable id>
rail: <canonical rail or null if inapplicable>
asset: <canonical asset or null if inapplicable>
amount_components_root: sha-256:<authenticated exact set or canonical empty>
finality_profile_ref: <exact ObjectRef>
finality_profile_hash: sha-256:<hex>
finality_profile_lifecycle_head_ref: <current ObjectRef>
finality_profile_lifecycle_head_hash: sha-256:<hex>
prior_receiver_stream_head_ref: <current ObjectRef>
prior_receiver_stream_head_hash: sha-256:<hex>
imported_at: <authority-service time>
core_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.provider_event_import_receipt.v0.1
import_request_digest: sha-256:<canonical authenticated request>
semantic_idempotency_key: sha-256:<provider domain/import key>
receiver_event_import_ref: <ObjectRef>
receiver_event_import_hash: sha-256:<hex>
result: new_event_committed | exact_replay | equivocation_fail_stopped |
        unreserved_event_fail_stopped
identity_binding_or_incident_receipt_ref: <branch-exact ObjectRef>
identity_binding_or_incident_receipt_hash: sha-256:<hex>
trust_registration_receipt_ref: <ObjectRef or null unless classified>
trust_registration_receipt_hash: sha-256:<hex or null>
receiver_stream_transition_receipt_ref: <ObjectRef or null unless classified>
receiver_stream_transition_receipt_hash: sha-256:<hex or null>
economic_transition_receipts_root: sha-256:<complete set or canonical empty>
authority_transaction_id: <one provider-import or fail-stop transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The import key and request digest are the semantic idempotency boundary. Exact
replay returns the original core and receipt without a second identity, trust,
stream, or economic mutation. Same key with changed bytes is equivocation.
Unknown fields, changed canonical tuple values, or an import whose authenticated
proof does not cover the exact raw bytes and scope deny before classification.

```yaml
schema: cairn.receiver_sequence_epoch_proof.v0.1
receiver_sequence_epoch_selector_key: sha-256:<provider/account/event and sequence scopes>
provider_trust_domain_id: <canonical domain>
receiver_account_or_contract_scope: <canonical scope>
declared_event_id_scope: <provider-authenticated scope>
declared_sequence_stream_scope: <provider-authenticated scope>
sequence_epoch_value_commitment: sha-256:<current immutable provider stream epoch>
provider_epoch_generation: <monotonic provider-authenticated generation>
valid_from: <provider-authenticated time>
valid_until: <provider-authenticated time or null>
source_credential_lifecycle_head_ref: <current active ObjectRef>
source_credential_lifecycle_head_hash: sha-256:<hex>
proof_hash: sha-256:<hex>
provider_or_registry_authority_signature: <Signature>
```

```yaml
schema: cairn.receiver_sequence_epoch_selector_state_head.v0.1
receiver_sequence_epoch_selector_key: sha-256:<stable key excluding epoch value>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: active | fail_stopped | quarantined
current_epoch_proof_ref: <receiver_sequence_epoch_proof ObjectRef>
current_epoch_proof_hash: sha-256:<hex>
current_provider_epoch_generation: <same proof generation>
current_sequence_epoch_value_commitment: sha-256:<same proof value>
current_identity_scope_index_key: sha-256:<epoch-specific scope key>
current_identity_scope_index_head_ref: <active ObjectRef>
current_identity_scope_index_head_hash: sha-256:<hex>
identity_scope_epoch_map_ref: <enumerable_map_root ObjectRef of all live/draining epoch scopes>
identity_scope_epoch_map_hash: sha-256:<hex>
identity_scope_epoch_count: <checked uint64>
outstanding_stream_map_ref: <enumerable_map_root ObjectRef>
outstanding_stream_map_hash: sha-256:<hex>
outstanding_stream_count: <nonnegative integer no greater than frozen concurrent limit>
updated_at: <authority-service time>
head_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.receiver_sequence_epoch_selector_transition_receipt.v0.1
receiver_sequence_epoch_selector_key: sha-256:<same stable key>
cause: import_genesis | provider_epoch_rotated | identity_scope_head_updated |
       outstanding_stream_updated | integrity_fail_stop |
       integrity_repair_verified | trust_quarantine
before_head_ref: <ObjectRef or null only at genesis>
before_head_hash: sha-256:<hex or null>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
before_epoch_proof_ref: <ObjectRef or null only at genesis>
before_epoch_proof_hash: sha-256:<hex or null>
after_epoch_proof_ref: <ObjectRef>
after_epoch_proof_hash: sha-256:<hex>
identity_scope_epoch_map_before_ref: <ObjectRef or null only at genesis>
identity_scope_epoch_map_before_hash: sha-256:<hex or null>
identity_scope_epoch_map_after_ref: <ObjectRef>
identity_scope_epoch_map_after_hash: sha-256:<hex>
outstanding_stream_map_before_ref: <ObjectRef or null only at genesis>
outstanding_stream_map_before_hash: sha-256:<hex or null>
outstanding_stream_map_after_ref: <ObjectRef>
outstanding_stream_map_after_hash: sha-256:<hex>
assigned_scope_transition_receipt_ref: <ObjectRef or null when unchanged>
assigned_scope_transition_receipt_hash: sha-256:<hex or null>
integrity_incident_ref: <ExecutionIntegrityIncident ObjectRef or null>
integrity_incident_hash: sha-256:<hex or null>
integrity_repair_audit_receipt_ref: <IntegrityRepairAuditReceipt ObjectRef or null>
integrity_repair_audit_receipt_hash: sha-256:<hex or null>
authority_transaction_id: <same reservation/handoff/event/rotation transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The selector is the sole pre-handoff authority for the provider's current
sequence epoch. Its stable key excludes the epoch value, so an old epoch cannot
remain an equally selectable active root. Provider/registry-authenticated epoch
rotation CASes the selector, installs the new epoch-specific scope, and leaves
older scopes in the enumerable draining map for actions already assigned there.
New reservation binds the current proof/selector head; gate and handoff require
that same generation and epoch still be current. A later event for a handed-off
action resolves its entry's assigned old scope and may drain it even after
rotation. The selector's one outstanding-stream map/count spans every provider
epoch, preventing per-epoch multiplication of the receiver-scope limit.
Repairable integrity failure freezes the selector with its proof, scope map, and
outstanding map unchanged. Only the exact integrity repair audit may restore
`fail_stopped → active` with those fields byte-identical; quarantine is terminal.
The receipt is a closed cause union: `integrity_fail_stop` requires the exact
incident ref/hash and forbids the repair pair; `integrity_repair_verified`
requires the exact signed repair-audit ref/hash and forbids the incident pair;
all other causes require both pairs null. A label or repaired-looking after-head
is not recovery evidence.

```yaml
schema: cairn.receiver_event_identity_scope_core.v0.1
identity_scope_index_key: sha-256:<fields below>
provider_trust_domain_id: <canonical domain>
receiver_account_or_contract_scope: <canonical scope>
declared_event_id_scope: <provider-authenticated scope>
declared_sequence_stream_scope: <provider-authenticated scope>
sequence_epoch_value_commitment: sha-256:<authenticated immutable epoch>
source_authority_ref: <allowlisted provider/adapter authority ObjectRef>
source_authority_hash: sha-256:<hex>
core_hash: sha-256:<hex>
registry_authority_signature: <Signature>
```

```yaml
schema: cairn.receiver_event_identity_index_manifest.v0.1
identity_scope_index_key: sha-256:<stable scope key>
index_epoch: <monotonic integer>
epoch_state: accepting | draining | sealed
index_kind: provider_event_ids | provider_sequences
sequence: <same scope-index sequence>
entry_count: <nonnegative integer no greater than 32>
sorted_entries:
  - receiver_event_identity_key: sha-256:<hex>
    binding_core_ref: <ObjectRef>
    binding_core_hash: sha-256:<hex>
    identity_state_head_ref: <current ObjectRef>
    identity_state_head_hash: sha-256:<hex>
entries_root: sha-256:<canonical sorted set>
manifest_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.receiver_event_identity_index_state_head.v0.1
identity_scope_index_key: sha-256:<provider domain/account/event-ID scope/
                                        sequence scope/epoch tuple>
receiver_sequence_epoch_selector_key: sha-256:<stable parent excluding epoch>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: active | quarantined
accepting_index_epoch: <monotonic integer>
index_epoch_directory_head_ref: <bounded_index_epoch_directory_head ObjectRef>
index_epoch_directory_head_hash: sha-256:<hex>
accepting_index_epoch_state_head_ref: <bounded_index_epoch_state_head ObjectRef>
accepting_index_epoch_state_head_hash: sha-256:<hex>
total_event_id_count: <checked uint64 across live and sealed epochs>
total_provider_sequence_count: <checked uint64 across live and sealed epochs>
total_reserved_event_id_slots: <checked uint64 across live epochs>
total_reserved_provider_sequence_slots: <checked uint64 across live epochs>
updated_at: <authority-service time>
head_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The epoch-specific scope head is only the aggregate cursor for one authenticated
provider sequence epoch. Its accepting index epoch must
equal the directory's accepting-epoch ref/hash, and all four totals equal the
directory's live maps plus sealed chain. Event-ID/sequence manifests and their
reservation counters exist only in the assigned epoch. A late event CASes its
draining assigned epoch and aggregate totals; it never mutates the accepting
epoch merely because that epoch is current. Cross-provider-epoch selection and
the one aggregate outstanding-stream limit live only in the stable parent
ReceiverSequenceEpochSelectorStateHead.

```yaml
schema: cairn.receiver_outstanding_stream_entry.v0.1
outstanding_stream_key: sha-256:<selector/action/effect/lineage/client reference>
receiver_sequence_epoch_selector_key: sha-256:<stable parent selector>
identity_scope_index_key: sha-256:<same scope index>
action_ref: <ObjectRef>
effect_id: sha-256:<hex>
lineage_id: sha-256:<hex>
precommitted_client_reference: <stable id>
assigned_identity_epoch: <monotonic integer>
event_id_slot_assignment_ref: <bounded_index_slot_assignment ObjectRef>
event_id_slot_assignment_hash: sha-256:<hex>
sequence_slot_assignment_ref: <bounded_index_slot_assignment ObjectRef>
sequence_slot_assignment_hash: sha-256:<hex>
trust_epoch_assignment_manifest_ref: <enumerable_transition_manifest ObjectRef>
trust_epoch_assignment_manifest_hash: sha-256:<hex>
trust_epoch_assignment_count: <positive integer no greater than 32>
trust_epoch_assignments_root: sha-256:<same manifest's complete sorted assignment set>
future_dependency_pool_state_head_ref: <ObjectRef or null iff no future slot reserved>
future_dependency_pool_state_head_hash: sha-256:<hex or null>
future_dependency_assignment_ref: <FutureDependencyAssignment ObjectRef or null under same exception>
future_dependency_assignment_hash: sha-256:<hex or null>
connection_outstanding_action_key: sha-256:<matching connection entry key or null for principal-direct>
connection_outstanding_action_entry_ref: <ObjectRef or null for principal-direct>
connection_outstanding_action_entry_hash: sha-256:<hex or null>
finality_transition_profile_ref: <ObjectRef>
finality_transition_profile_hash: sha-256:<hex>
authenticated_closure_or_horizon_rule_hash: sha-256:<finite release rule>
sequence: <monotonic integer>
previous_entry_hash: sha-256:<hex or null at reservation>
state: reserved | handed_off | authenticated_stream_closed |
       authenticated_irreversible_horizon | fenced_non_submission
current_receiver_stream_head_ref: <ObjectRef or null before redemption>
current_receiver_stream_head_hash: sha-256:<hex or null>
entry_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.receiver_outstanding_stream_transition_receipt.v0.1
outstanding_stream_key: sha-256:<same key>
cause: reservation_registered | handoff_bound | authenticated_event_observed |
       authenticated_stream_closed | authenticated_irreversible_horizon |
       fenced_non_submission
epoch_selector_before_head_ref: <current ObjectRef>
epoch_selector_before_head_hash: sha-256:<hex>
epoch_selector_after_head_ref: <successor ObjectRef>
epoch_selector_after_head_hash: sha-256:<hex>
assigned_identity_scope_before_head_ref: <current ObjectRef>
assigned_identity_scope_before_head_hash: sha-256:<hex>
assigned_identity_scope_after_head_ref: <same/successor ObjectRef>
assigned_identity_scope_after_head_hash: sha-256:<hex>
outstanding_stream_map_before_ref: <enumerable_map_root ObjectRef>
outstanding_stream_map_before_hash: sha-256:<hex>
outstanding_stream_map_after_ref: <enumerable_map_root ObjectRef>
outstanding_stream_map_after_hash: sha-256:<hex>
before_change_proof: <closed membership/nonmembership proof under before map>
after_change_proof: <closed membership/nonmembership proof under after map>
entry_before_ref: <ObjectRef or null only for reservation>
entry_before_hash: sha-256:<hex or null>
entry_after_ref: <terminal/current ObjectRef>
entry_after_hash: sha-256:<hex>
after_current_map_membership: true | false
identity_epoch_transition_receipt_ref: <ObjectRef or null exactly for handoff_bound>
identity_epoch_transition_receipt_hash: sha-256:<hex or null under same exception>
unchanged_assigned_identity_epoch_head_ref: <ObjectRef required iff handoff_bound>
unchanged_assigned_identity_epoch_head_hash: sha-256:<hex or null>
terminal_release_evidence_ref: <closure/horizon/non-submission ObjectRef or null>
terminal_release_evidence_hash: sha-256:<hex or null>
terminal_release_plan_core_ref: <ReceiverTerminalReleasePlanCore ObjectRef or null>
terminal_release_plan_core_hash: sha-256:<hex or null>
receiver_stream_transition_receipt_ref: <ObjectRef required for authenticated stream closure;
                                         null for horizon or pre-handoff non-submission>
receiver_stream_transition_receipt_hash: sha-256:<hex or null under same union>
unchanged_receiver_stream_head_ref: <current ObjectRef required exactly for horizon; null otherwise>
unchanged_receiver_stream_head_hash: sha-256:<hex or null>
authority_transaction_id: <same admission/handoff/event/closure transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Receiver-entry identity is derived, not caller-selected:
`outstanding_stream_key = SHA-256(JCS(selector key, action ref, effect id,
lineage id, precommitted client reference))`. Validation resolves the exact
event-ID and sequence slot assignments, exact trust assignment manifest/count/
root, optional future-dependency pair, current receiver stream, and—when the
agent-runtime branch created the action—the exact connection outstanding entry.
The three connection fields are all null only for principal-direct execution;
otherwise all are non-null. Their lifecycle matrix is closed: receiver
`reserved` pairs with connection `reserved`; `handed_off` pairs with
`handed_off|receiver_state_current`; authenticated closure/horizon pair only
with `receiver_state_current`; fenced pre-submission pairs only with `reserved`.

Every receiver transition resolves exact before/after entries, selector heads,
assigned-scope heads, receiver-domain map roots, and both path proofs. Immutable
identity, assignments, finality, optional future dependency, and optional
connection stable key/action/effect/lineage cannot drift; sequence and previous
hash advance exactly. The connection entry ref/hash may change only to its exact
sequence/previous-hash successor, and `handoff_bound` requires the reserved→
handed-off connection successor. The
selector is one exact successor and its before/after map refs equal the named
roots. Proof frontiers outside this key are identical. The cause matrix is:

- `reservation_registered`: null before, reserved sequence-0 after,
  nonmembership→membership, map count +1;
- `handoff_bound`: reserved→handed_off, membership retained, exact unchanged
  assigned-identity head, and no identity transition receipt;
- `authenticated_event_observed`: handed_off→handed_off, membership retained,
  exact receiver-stream successor, and one atomic identity-epoch transition
  receipt whose two transitions consume exactly one event-ID slot and one
  sequence slot; both intermediate assignments remain reserved map members;
- each terminal cause: matching terminal after entry, membership→nonmembership,
  map count -1, exact cause evidence and release plan, and one atomic identity
  transition receipt containing both event-ID and sequence assignment
  transitions;
- closure requires the exact receiver-stream transition; irreversible horizon
  requires the exact unchanged receiver-stream head; fenced non-submission
  forbids both.

Cause evidence is an exact, independently verified external object: schema,
object identity, hash, signature/release validation, and required fields all
match. Fenced evidence binds action/effect/lineage; closure evidence binds the
exact current receiver stream key; horizon evidence binds action/effect/lineage
and finality profile. The implementation receives these external families only
through a fail-closed pinned-release verifier; an absent verifier or unresolved
object denies.

```yaml
schema: cairn.receiver_terminal_release_plan_core.v0.1
terminal_release_plan_key: sha-256:<selector/outstanding stream/evidence/cause>
release_cause: authenticated_stream_closed | authenticated_irreversible_horizon |
               fenced_non_submission
terminal_release_evidence_ref: <cause-matching authenticated ObjectRef>
terminal_release_evidence_hash: sha-256:<hex>
receiver_outstanding_stream_entry_ref: <current nonterminal ObjectRef>
receiver_outstanding_stream_entry_hash: sha-256:<hex>
event_id_slot_assignment_ref: <exact assignment ObjectRef>
event_id_slot_assignment_hash: sha-256:<hex>
sequence_slot_assignment_ref: <exact assignment ObjectRef>
sequence_slot_assignment_hash: sha-256:<hex>
trust_epoch_assignment_manifest_ref: <same enumerable manifest ObjectRef as entry>
trust_epoch_assignment_manifest_hash: sha-256:<hex>
trust_epoch_assignment_count: <same checked count>
future_dependency_pool_state_head_ref: <same ObjectRef or null>
future_dependency_pool_state_head_hash: sha-256:<hex or null>
future_dependency_assignment_ref: <same ObjectRef or null>
future_dependency_assignment_hash: sha-256:<hex or null>
receiver_stream_before_head_ref: <ObjectRef or null exactly for fenced pre-handoff non-submission>
receiver_stream_before_head_hash: sha-256:<hex or null>
connection_outstanding_action_entry_ref: <same ObjectRef or null for principal-direct>
connection_outstanding_action_entry_hash: sha-256:<hex or null>
expected_transition_kind_set_root: sha-256:<exact identity/trust/future/stream/connection kinds>
authority_transaction_id: <reserved terminal transaction id>
issued_at: <authority-service time>
plan_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.receiver_terminal_release_completion_receipt.v0.1
completion_key: sha-256:<domain-separated terminal_release_plan_key>
terminal_release_plan_core_ref: <ObjectRef>
terminal_release_plan_core_hash: sha-256:<hex>
terminal_release_evidence_ref: <same ObjectRef>
terminal_release_evidence_hash: sha-256:<hex>
identity_epoch_transition_receipts:
  - assignment_ref: <pre-transition event-ID or sequence assignment ObjectRef>
    assignment_hash: sha-256:<same pre-transition assignment hash>
    transition_receipt_ref: <BoundedIndexEpochTransitionReceipt ObjectRef>
    transition_receipt_hash: sha-256:<hex>
identity_transition_count: 2 # assignment-item count; receipt refs may be equal
identity_transition_root: sha-256:<canonical exact set keyed by
                                  (transition_receipt_ref, assignment_ref)>
trust_epoch_transition_manifest_ref: <enumerable_transition_manifest ObjectRef>
trust_epoch_transition_manifest_hash: sha-256:<hex>
trust_epoch_transition_count: <exactly plan trust assignment count>
trust_epoch_transition_root: sha-256:<assignment-key-equal complete receipt set>
future_dependency_transition_receipt_ref: <ObjectRef or null iff plan future assignment null>
future_dependency_transition_receipt_hash: sha-256:<hex or null>
receiver_stream_transition_receipt_ref: <ObjectRef required exactly for authenticated stream closure>
receiver_stream_transition_receipt_hash: sha-256:<hex or null>
unchanged_receiver_stream_head_ref: <current ObjectRef required exactly for irreversible horizon>
unchanged_receiver_stream_head_hash: sha-256:<hex or null>
receiver_outstanding_stream_transition_receipt_ref: <ObjectRef>
receiver_outstanding_stream_transition_receipt_hash: sha-256:<hex>
connection_outstanding_action_transition_receipt_ref: <ObjectRef or null iff plan connection entry null>
connection_outstanding_action_transition_receipt_hash: sha-256:<hex or null>
completed_transition_kind_set_root: sha-256:<cause-derived set equal to plan expected set root>
plan_to_receipt_keyset_equality_proof_hash: sha-256:<every planned assignment has
                                                    exactly one keyed item>
authority_transaction_id: <same plan/transition transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Admission atomically adds one `reserved` entry to the stable selector's cross-
epoch outstanding-stream map and reserves its paired slots in the selector's
current epoch-specific scope. Redemption/handoff advances the same
entry with the current receiver-stream head and carries the unchanged assigned-
epoch head rather than fabricating an epoch transition. Authenticated closure or an
irreversible receiver-authenticated horizon first freezes the exact enumerable
release plan, then terminalizes the entry and removes it from the current map
while releasing only that entry's unused assignments. Every terminal child
receipt binds the same plan and transaction. The completion receipt is created
after those one-way child receipts and contains exactly two identity items, one
for the plan's event-ID assignment and one for its sequence assignment. Item
uniqueness and plan equality are keyed by
`(transition_receipt_ref, assignment_ref)`, not by receipt ref alone; each
`assignment_ref/hash` is explicitly the pre-transition assignment identity from
the plan. Both items MUST name the single atomic
BoundedIndexEpochTransitionReceipt also named by the terminal receiver-stream
transition. That shared receipt MUST contain exactly the two matching before assignments and
their exact successors in its canonical `reservation_assignment_transitions`,
under the same `authority_transaction_id`; two wrappers around one assignment, a
third assignment, a different shared receipt, or two one-assignment transitions deny. Thus the value `2` in
`identity_transition_count` counts assignment items, not distinct receipts. The
completion also proves exact assignment-key equality plus
the complete cause-derived identity, trust, future-pool, receiver-stream-or-
unchanged-stream, outstanding-stream, and connection set. It is stored under its deterministic
`completion_key`; restart resolves that key from the plan and cannot rely on a
reverse ObjectRef. Validation and terminal presentation require the completion
receipt, not merely removed map entries. This one-way plan → children →
completion construction avoids a content-address cycle. Fenced
pre-handoff non-submission does the same without creating a receiver stream. No
business-final event, local timer, or database row can remove it. The current-map
count is the authoritative concurrent-stream admission limit; terminal entries
remain auditable through the signed epoch assignments and event history rather
than occupying current capacity forever.

Receiver-stream evidence is cause-discriminated. Authenticated stream closure
has one same-transaction ReceiverEventStreamTransitionReceipt. Irreversible
horizon does not invent a receiver-stream state edge; it carries the exact
unchanged current stream head while the horizon receipt releases only the
outstanding/capacity layers. Pre-handoff non-submission carries neither. The
plan's expected kind set is derived from that cause, so a horizon completion
that demands or fabricates a stream transition is invalid.

Plan validation derives its deterministic key and exact transition-kind root,
then requires every assignment, trust manifest, future dependency, receiver
stream, connection entry, evidence, cause, and transaction to equal the
nonterminal entry. Completion validation resolves the exact plan, receiver-map
transition, both unique identity transitions, trust transition manifest,
optional future transition, cause-selected stream dependency, and optional
connection-map transition. Counts and canonical roots, deterministic completion
key, transaction ID, and completed kind-set root must all agree. Each referenced
child runs its full semantic validator. A completion with a plausible hash but
an unresolved child is invalid.
The completion also recomputes `plan_to_receipt_keyset_equality_proof_hash` from
the plan key, the exact event/sequence assignment pair, trust assignment and
transition manifests, optional future pair, cause-selected stream pair, and
optional connection pair. Each identity/trust/future transition names the exact
assignment it releases; foreign but otherwise valid transitions deny.

```yaml
schema: cairn.receiver_event_identity_scope_import_receipt.v0.1
epoch_selector_key: sha-256:<stable parent key>
epoch_proof_ref: <receiver_sequence_epoch_proof ObjectRef>
epoch_proof_hash: sha-256:<hex>
scope_core_ref: <ObjectRef>
scope_core_hash: sha-256:<hex>
empty_event_id_manifest_ref: <ObjectRef>
empty_event_id_manifest_hash: sha-256:<hex>
empty_provider_sequence_manifest_ref: <ObjectRef>
empty_provider_sequence_manifest_hash: sha-256:<hex>
genesis_epoch_state_head_ref: <epoch-0 ObjectRef over both empty manifests>
genesis_epoch_state_head_hash: sha-256:<hex>
genesis_epoch_directory_head_ref: <one-entry live directory ObjectRef>
genesis_epoch_directory_head_hash: sha-256:<hex>
genesis_index_head_ref: <active ObjectRef>
genesis_index_head_hash: sha-256:<hex>
selector_before_head_ref: <ObjectRef or null only for first provider epoch>
selector_before_head_hash: sha-256:<hex or null>
selector_after_head_ref: <active successor ObjectRef>
selector_after_head_hash: sha-256:<hex>
integrity_before_head_ref: <healthy ObjectRef>
integrity_before_head_hash: sha-256:<hex>
integrity_after_head_ref: <healthy successor ObjectRef>
integrity_after_head_hash: sha-256:<hex>
authority_transaction_id: <one scope/integrity genesis transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.receiver_event_identity_binding_core.v0.1
provider_trust_domain_id: <canonical domain>
receiver_account_or_contract_scope: <canonical scope>
declared_event_id_scope: <exact finality-profile value>
declared_sequence_stream_scope: <exact finality-profile value>
sequence_epoch_value_commitment: sha-256:<exact authenticated stream epoch>
provider_event_id: <authenticated opaque id>
provider_sequence: <authenticated canonical uint64 value>
raw_event_digest: sha-256:<hex>
receiver_event_import_ref: <ObjectRef>
receiver_event_import_hash: sha-256:<hex>
action_ref: <ObjectRef>
effect_id: sha-256:<hex>
lineage_id: sha-256:<hex>
receiver_operation_id: <authenticated id>
event_schema_hash: sha-256:<hex>
assertion_registration_key: sha-256:<precomputable key for this event>
trust_registration_predecessor_kind: inflight_promotion | prior_assertion_chain
reserved_identity_epoch: <exact accepting or draining epoch assigned before handoff>
reserved_event_id_slot_assignment_ref: <ObjectRef>
reserved_event_id_slot_assignment_hash: sha-256:<hex>
reserved_sequence_slot_assignment_ref: <ObjectRef>
reserved_sequence_slot_assignment_hash: sha-256:<hex>
promoted_inflight_execution_key: sha-256:<exact key or null iff later event>
prior_receiver_event_import_ref: <ObjectRef or null iff first event>
prior_receiver_event_import_hash: sha-256:<hex or null iff first event>
prior_assertion_registration_key: sha-256:<hex or null iff first event>
prior_receiver_assertion_trust_state_head_ref: <current ObjectRef or null iff first>
prior_receiver_assertion_trust_state_head_hash: sha-256:<hex or null iff first>
core_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.receiver_event_identity_state_head.v0.1
receiver_event_identity_key: sha-256:<either event-id or sequence key below>
identity_scope_index_key: sha-256:<same stable scope index>
identity_kind: provider_event_id | provider_sequence
identity_value_commitment: sha-256:<canonical authenticated value>
identity_scope_key: sha-256:<domain/account plus branch-exact declared scope>
binding_core_ref: <ObjectRef>
binding_core_hash: sha-256:<hex>
counterpart_identity_key: sha-256:<the other branch key for the same core>
sequence: 0 | 1
previous_state_hash: sha-256:<null at bound genesis; exact prior on quarantine>
state: bound | quarantined
equivocation_evidence_commitment_hash: sha-256:<null when bound; precomputed
                                                conflicting-core commitment when quarantined>
authority_transaction_id: <binding or quarantine transaction>
updated_at: <authority-service time>
head_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.receiver_event_identity_binding_receipt.v0.1
binding_core_ref: <ObjectRef>
binding_core_hash: sha-256:<hex>
identity_scope_index_before_head_ref: <active ObjectRef>
identity_scope_index_before_head_hash: sha-256:<hex>
identity_scope_index_after_head_ref: <active ObjectRef>
identity_scope_index_after_head_hash: sha-256:<hex>
identity_epoch_directory_before_head_ref: <ObjectRef>
identity_epoch_directory_before_head_hash: sha-256:<hex>
identity_epoch_directory_after_head_ref: <ObjectRef>
identity_epoch_directory_after_head_hash: sha-256:<hex>
assigned_identity_epoch_before_head_ref: <accepting or draining ObjectRef>
assigned_identity_epoch_before_head_hash: sha-256:<hex>
assigned_identity_epoch_after_head_ref: <successor ObjectRef>
assigned_identity_epoch_after_head_hash: sha-256:<hex>
event_id_slot_assignment_before_ref: <reserved ObjectRef>
event_id_slot_assignment_before_hash: sha-256:<hex>
event_id_slot_assignment_after_ref: <consumed successor ObjectRef>
event_id_slot_assignment_after_hash: sha-256:<hex>
sequence_slot_assignment_before_ref: <reserved ObjectRef>
sequence_slot_assignment_before_hash: sha-256:<hex>
sequence_slot_assignment_after_ref: <consumed successor ObjectRef>
sequence_slot_assignment_after_hash: sha-256:<hex>
event_id_identity_head_ref: <new bound ObjectRef>
event_id_identity_head_hash: sha-256:<hex>
provider_sequence_identity_head_ref: <new bound ObjectRef>
provider_sequence_identity_head_hash: sha-256:<hex>
identity_manifests_before_root: sha-256:<exact two-manifest set>
identity_manifests_after_root: sha-256:<exact two-manifest set>
authority_transaction_id: <same provider-import transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The event-ID key is `H(profile, provider_trust_domain_id, receiver account/
contract scope, declared_event_id_scope, provider_event_id)`. The sequence key is
the same domain-separated grammar with `declared_sequence_stream_scope`, exact
epoch commitment, and canonical uint64 `provider_sequence`. Before the scope is
usable, `execution.receiver_sequence_epoch_selector.import` atomically creates
the stable selector from an authenticated current-epoch proof, its first active
epoch-specific scope-index head, index epoch-0 state/directory with two signed
empty manifests, a one-entry selector epoch map, and the canonical empty cross-
epoch outstanding map. It adds both stable keys to global integrity inventory
and emits the exact scope-import and selector-transition receipts. On later
provider epoch rotation, `execution.receiver_event_identity_scope.import` is an
internal consequence of the selector CAS and creates the new epoch-specific
scope before the selector points to it. Exact replay is byte-identical; a second selector genesis or same
provider-epoch scope genesis conflicts. Every event import CASes the action's
assigned accepting-or-draining epoch-specific index head plus the stable selector,
its directory and assigned epoch's two manifests/assignments, and the two keyed
identity heads; missing/forked scope head, epoch, manifest, entry, or
count fail-stops through the global integrity state.

The receiver-event identity receipt resolves and authenticates both assigned
epoch heads. Their directory and epoch equal the entry's assigned scope; the
after head preserves directory, epoch, and state and is the exact
sequence/predecessor successor. If the assignment is in the scope's current
accepting epoch, both refs equal the accepting heads and state is `accepting`.
Otherwise the assigned epoch is lower, both heads are `draining`, neither ref is
the accepting head, and the accepting epoch/ref remains unchanged across the
late-event transaction. Migrating a late event into the new epoch, changing the
accepting ref, or treating a draining predecessor as inactive denies.

`execution.receiver_event_identity.bind` is an authority-
internal insert-only two-key transaction inside provider-event import: both keys
are absent and become bound to one core, or both already bind the identical core
and the import is an exact idempotent replay. One present/one absent, mismatched
counterparts, or missing bytes fail-stops integrity; a key already bound to a
different core is authenticated equivocation, never a newer valid event.
For a new valid event, both identity heads, the receiver-stream successor, trust-
dependency registration under its exact predecessor branch, assertion head, and
every obligation/exposure/ledger delta
plus the scope-index/manifests commit under the same provider-import transaction
ID; none may become visible
alone. The binding core and heads contain no ref to that later transaction
receipt, preserving an acyclic graph.

Before handoff, each possible authenticated event—including the reversal and
unexpected-charge tail—reserves one event-ID slot and one provider-sequence slot
in the assigned receiver-identity epoch. A normal final event does not release
the tail. Slots release only on authenticated stream closure or the profile's
irreversible reversal horizon. When the accepting epoch cannot fit a new action,
it becomes draining and a new accepting epoch is created; late events consume
their reservations in the draining epoch. An authenticated event with a valid
reservation can therefore never be rejected because unrelated history filled a
manifest. If an authenticated event arrives without the required reservation,
the raw import is retained and the scope atomically enters `fail_stopped` under
an integrity incident before classification; it is never silently dropped.

```yaml
schema: cairn.receiver_event_equivocation_receipt.v0.1
receipt_mode: direct_bounded | closure_partition
closure_id: sha-256:<hex or null for direct_bounded>
closure_plan_core_ref: <ObjectRef or null for direct_bounded>
closure_plan_core_hash: sha-256:<hex or null>
closure_partition_sequence: <integer or null for direct_bounded>
processed_work_item_keys_root: sha-256:<exact partition subset or canonical empty>
source_snapshot_ref: <ObjectRef or null for direct_bounded>
source_snapshot_hash: sha-256:<hex or null>
conflicting_incoming_binding_core_ref: <authenticated ObjectRef>
conflicting_incoming_binding_core_hash: sha-256:<hex>
affected_scope_index_transitions: # complete direct set or exact partition subset
  - identity_scope_index_key: sha-256:<hex>
    before_head_ref: <active ObjectRef>
    before_head_hash: sha-256:<hex>
    after_head_ref: <quarantined ObjectRef>
    after_head_hash: sha-256:<hex>
    identity_manifests_before_root: sha-256:<exact two-manifest set>
    identity_manifests_after_root: sha-256:<exact two-manifest set>
affected_scope_index_transitions_root: sha-256:<complete canonical nonempty vector>
conflicted_identity_transitions: # complete direct set or exact partition subset
  - identity_key: sha-256:<event-id or sequence key>
    before_bound_head_ref: <ObjectRef>
    before_bound_head_hash: sha-256:<hex>
    after_quarantined_head_ref: <ObjectRef>
    after_quarantined_head_hash: sha-256:<hex>
affected_existing_binding_cores:
  - binding_core_ref: <ObjectRef>
    binding_core_hash: sha-256:<hex>
affected_existing_binding_cores_root: sha-256:<same complete unique bounded set>
affected_receiver_stream_transition_receipts:
  - receipt_ref: <ReceiverEventStreamTransitionReceipt ObjectRef>
    receipt_hash: sha-256:<hex>
affected_receiver_stream_transitions_root: sha-256:<same complete before/after set>
affected_trust_quarantine_receipts:
  - receipt_ref: <TrustQuarantineReceipt ObjectRef>
    receipt_hash: sha-256:<hex>
affected_assertion_and_inflight_dispositions_root: sha-256:<same complete set>
exposure_remediation_receipt_ref: <ObjectRef or null iff no economic dependency>
authority_transaction_id: <one identity/stream/trust/exposure CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

`execution.receiver_event_identity.quarantine` is the sole conflict coordinator;
it invokes the two authority-internal state writers above under either one bounded
transaction or the fail-stopped partition protocol. It
computes the fixed-point closure reached from both incoming keys, every existing
binding head, its counterpart key, and every referenced combined scope index.
It canonically CASes **all** active indexes in that complete vector to
quarantined, or first installs the global closure barrier when the vector exceeds
one partition, then walks every conflicting core and counterpart key from each signed
manifest, transitions each existing
bound identity head once, quarantines all affected current receiver streams and
accepted assertions, freezes every affected handed-off in-flight or released-
exposure root, and emits the receipt above either once for the complete direct
set of at most `max_closure_partition_entries` total work items or once per exact
closure partition. A partition-scoped receipt is
upstream of the generic partition receipt and never points back to it; the
completion receipt's result/partition equality proves the complete union, so no
unbounded final equivocation receipt is required. The incoming
conflicting core is retained as evidence but never classified as receiver truth.
An event-ID collision at a different sequence and a sequence collision at a
different event ID are therefore equally authoritative conflicts. No action-
local latest-sequence cache or raw-import table may substitute for these mappings.
An incoming core that splices an event-ID already bound under one combined scope
with a sequence already bound under another must transition both indexes (and
any recursively reached counterpart indexes) in one closure plan; a singular index
transition, partial vector, duplicate entry, or omitted zero-exposure stream
denies or fail-stops without publishing partial quarantine.

```yaml
schema: cairn.receiver_event_stream_transition_receipt.v0.1
receiver_event_stream_key: sha-256:<same key>
before_head_ref: <ObjectRef or null for redemption genesis>
before_head_hash: sha-256:<hex or null>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
cause: redemption_genesis | fenced_outbox_handoff | authenticated_provider_event |
       receiver_identity_equivocation
outbox_handoff_receipt_ref: <ObjectRef or null unless fenced-outbox cause>
outbox_handoff_receipt_hash: sha-256:<hex or null>
receiver_event_import_ref: <authenticated ObjectRef or null unless provider-event cause>
receiver_event_import_hash: sha-256:<hex or null>
applied_transition_profile_ref: <same exact ObjectRef>
authority_transaction_id: <redemption, outbox-handoff, or provider-import transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Successful redemption creates the unique `no_authenticated_event` head for the
precommitted effect/receiver/account/operation/client reference. The authority-
internal `execution.receiver_event_stream_state.transition` is its sole
successor writer. The fenced outbox supplies only
`no_authenticated_event → unknown` under its exclusive handoff receipt: making
bytes available to a worker is not proof that the receiver accepted a request.
That transition receipt must bind the exact OutboxHandoffReceipt ref/hash; the
cause discriminator forbids it on every other branch. A writer assertion or
transaction-log association without this signed object is insufficient. The
outbox `pending_handoff → handoff_committed` successor/receipt and receiver stream
`no_authenticated_event → unknown` successor/receipt commit in one
`outbox_handoff` authority transaction **before** bytes or credentials become
available. A crash cannot expose one successor without the other.
Only allowlisted `execution.provider_event.import` may later supply an
authenticated `submitted`, acknowledged, or other receiver-state cause. The
exact finality profile closes permitted edges,
and equal receiver sequence with a different digest moves to `quarantined`.
Every event races on the same expected head, so acceptance and cancellation
cannot both claim one predecessor. The current stream head—not an adapter cache
or raw import object—is what cancellation review, authority, gate, and handoff
bind and recheck.

```yaml
schema: cairn.cancellation_fee_source_state_head.v0.1
cancellation_fee_source_key: sha-256:<receiver/scope/operation stable tuple>
fee_source_core_ref: <immutable registry ObjectRef>
fee_source_core_hash: sha-256:<hex>
receiver_id: <receiver/provider>
receiver_account_or_contract_scope: <canonical scope>
cancellation_operation_kind: <exact operation>
fee_source_kind: provider_quote | provider_fee_schedule | contract_rule
sequence: <lifecycle revision; 0 at genesis and exactly prior sequence + 1 thereafter>
fee_source_generation: <authenticated source generation; increments only for
                        authenticated_source_generation and remains unchanged on restriction>
previous_state_hash: sha-256:<hex or null>
current_source_ref: <authenticated immutable ObjectRef>
current_source_hash: sha-256:<hex>
incident_sink_binding_ref: <immutable cancellation-incident-sink ObjectRef>
incident_sink_binding_hash: sha-256:<hex>
fee_semantics: fixed_zero | fixed_nonzero | variable | unknown
fee_amount: <typed Money or null unless fixed>
state: active | revoked | expired | quarantined
effective_at: <provider-authenticated time>
updated_at: <registry-authority time>
state_hash: sha-256:<hex>
signer_kind: registry_authority | trust_coordinator
registry_authority_signature: <Signature or null unless ordinary registry branch>
trust_coordinator_signature: <Signature or null unless quarantine branch>
```

```yaml
schema: cairn.cancellation_fee_source_transition_receipt.v0.1
cancellation_fee_source_key: sha-256:<same stable key>
cause: import_genesis | authenticated_source_generation | prospective_revocation |
       authority_time_expiry | suspected_or_confirmed_compromise |
       unexpected_cancellation_charge
before_head_ref: <ObjectRef or null only at genesis>
before_head_hash: sha-256:<hex or null>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
before_fee_source_generation: <integer or null only at genesis>
after_fee_source_generation: <0 at genesis; before + 1 only for authenticated source
                              generation; otherwise unchanged>
unexpected_charge_receipt_ref: <ObjectRef or null unless unexpected charge>
unexpected_charge_receipt_hash: sha-256:<hex or null>
trust_quarantine_receipt_ref: <ObjectRef or null unless compromise/charge>
trust_quarantine_receipt_hash: sha-256:<hex or null>
authority_transaction_id: <same registry or coordinator transaction>
committed_at: <branch-authoritative time>
receipt_hash: sha-256:<hex>
signer_kind: registry_authority | trust_coordinator
registry_authority_signature: <Signature or null for coordinator causes>
trust_coordinator_signature: <Signature or null for ordinary causes>
```

The closed matrix is `active(g) → active(g+1) | revoked | expired |
quarantined`; only an active current `fixed_zero` head can support v0.1
cancellation. Every successor advances lifecycle sequence exactly once. A
provider schedule/contract/quote change advances source generation; revocation,
expiry, quarantine, and unexpected-charge restriction retain the predecessor
generation. A replacement fixed-zero source therefore advances generation even
when its amount remains zero; terminal states cannot reactivate. Ordinary
active/retired transitions are registry-signed. Authenticated compromise or an
unexpected charge uses the coordinator receipt and permits `active | revoked |
expired → quarantined` under the trust-coordinator signature; the prior registry
signature is preserved rather than forged on the coordinator successor.

```yaml
schema: cairn.cancellation_incident_sink_binding.v0.1
incident_sink_key: sha-256:<principal/provider/scope/operation/asset>
principal_id: <principal whose credential may be charged>
provider_trust_domain_id: <canonical provider domain>
receiver_account_or_contract_scope: <exact external scope>
cancellation_operation_kind: <exact operation>
asset: <canonical asset>
economic_resource_key: sha-256:<pre-authorized resource for unexpected liability>
incident_compartment_ref: <immutable zero-capacity incident compartment ObjectRef>
incident_compartment_hash: sha-256:<hex>
incident_compartment_control_key: sha-256:<hex>
principal_monetary_ledger_keys_root: sha-256:<complete affected ledgers>
scope_selection_proof_ref: <receiver_scope_selection_proof ObjectRef>
scope_selection_proof_hash: sha-256:<hex>
issued_at: <registry-authoritative time>
binding_hash: sha-256:<hex>
registry_authority_signature: <Signature>
```

The incident compartment is created and attached to the resource membership
manifest before a cancellation can be reviewed. It has zero available capacity
and exists only to preserve authenticated provider-created liability. A
cancellation with no current, exact-scope sink binding denies even if the quoted
fee is zero. Thus the provider cannot force the importer to invent an account,
asset, resource, compartment, or principal after the charge occurs.

```yaml
schema: cairn.cancellation_cost_attestation.v0.1
receiver_id: <receiver/provider>
receiver_account_commitment: sha-256:<hex>
original_operation_locator_hash: sha-256:<hex>
cancellation_operation_kind: <exact operation>
current_receiver_state_head_ref: <authenticated ObjectRef>
fee_source_kind: provider_quote | provider_fee_schedule | contract_rule
fee_source_ref: <authenticated immutable ObjectRef>
fee_source_hash: sha-256:<hex>
fee_source_state_head_ref: <current ObjectRef>
fee_source_state_head_hash: sha-256:<hex>
fee_source_generation: <current integer>
fee_amount: {amount_minor: 0, asset: <canonical asset>}
variable_or_contingent_fee: false
issued_at: <provider/adapter authenticated time>
expires_at: <short expiry>
attestation_hash: sha-256:<hex>
provider_or_adapter_signature: <Signature>
not_claiming: [cancellation_effective, provider_cannot_misbehave]
```

```yaml
schema: cairn.unexpected_receiver_charge_exposure_core.v0.1
unexpected_charge_exposure_id: sha-256:<canonical fields below>
principal_id: <principal whose scoped credential was charged>
original_action_ref: <ObjectRef>
original_effect_id: sha-256:<hex>
cancellation_action_ref: <ObjectRef>
cancellation_effect_id: sha-256:<hex>
receiver_account_or_contract_scope: <exact scope>
economic_resource_key: sha-256:<charged resource>
compartment_control_key: sha-256:<original or designated incident compartment>
receiver_event_import_ref: <authenticated charged event ObjectRef>
charged_amount: <positive Money>
core_hash: sha-256:<hex>
authority_service_signature: <Signature>
not_claiming: [principal_authority, expected_fee, charge_recoverable]
```

```yaml
schema: cairn.unexpected_cancellation_charge_receipt.v0.1
economic_mutation_cause_core_ref: <ObjectRef>
economic_mutation_cause_core_hash: sha-256:<hex>
receiver_event_import_ref: <authenticated charged-cancellation event ObjectRef>
receiver_event_import_hash: sha-256:<hex>
cancellation_action_ref: <ObjectRef>
cancellation_effect_id: sha-256:<hex>
original_action_ref: <ObjectRef>
original_effect_id: sha-256:<hex>
unexpected_charge_exposure_core_ref: <ObjectRef created from the event>
unexpected_charge_exposure_core_hash: sha-256:<hex>
unexpected_charge_exposure_id: sha-256:<hex>
cancellation_fee_source_key: sha-256:<exact handoff dependency>
incident_sink_binding_ref: <exact prebound ObjectRef>
incident_sink_binding_hash: sha-256:<hex>
cancellation_fee_source_before_head_ref: <head bound at handoff>
cancellation_fee_source_before_head_hash: sha-256:<hex>
cancellation_fee_source_after_head_ref: <quarantined ObjectRef>
cancellation_fee_source_after_head_hash: sha-256:<hex>
cancellation_action_before_head_ref: <current ObjectRef>
cancellation_action_before_head_hash: sha-256:<hex>
cancellation_action_after_head_ref: <quarantined ObjectRef>
cancellation_action_after_head_hash: sha-256:<hex>
trust_quarantine_receipt_ref: <ObjectRef>
trust_quarantine_receipt_hash: sha-256:<hex>
charged_amount: <positive Money>
unexpected_charge_atom_id: sha-256:<canonical action/event/amount/asset key>
compartment_transition_manifest_ref: <enumerable_transition_manifest ObjectRef>
compartment_transition_manifest_hash: sha-256:<hex>
compartment_transition_count: <positive integer>
resource_exposure_transition_receipt_ref: <ObjectRef>
resource_exposure_transition_receipt_hash: sha-256:<hex>
affected_limit_ledger_transition_manifest_ref: <enumerable_transition_manifest ObjectRef>
affected_limit_ledger_transition_manifest_hash: sha-256:<hex>
affected_limit_ledger_transition_count: <positive integer>
economic_atom_delta_manifest_ref: <enumerable_transition_manifest ObjectRef>
economic_atom_delta_manifest_hash: sha-256:<exact one added incident atom>
economic_atom_delta_count: 1
authority_transaction_id: <one event/quarantine/economic CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Unknown, variable, contingent, nonzero, stale, or unauthenticated cost denies all
v0.1 cancellation, including the safety path. Cost attestation, review, binding
set, authorization, gate, handoff snapshot, and receipt carry the exact same ref/
hash plus fee-source head ref/hash/generation. Gate and outbox resolve the
canonical current successor directly and require exact equality, `state:active`,
and `fee_semantics:fixed_zero`; attestation expiry alone is insufficient. The
fee-source stable core is a complete-set trust dependency for every cancellation
in-flight action and resulting assertion. Compromise freezes all dependent paths.
If authenticated receiver evidence nevertheless reports a nonzero charge,
`execution.provider_event.import` must atomically issue the typed receipt above,
quarantine the cancellation/fee source, add one conservative unexpected-charge
atom under the event-derived exposure core to the original or designated
incident compartment/resource and every affected principal monetary ledger, and
keep new capacity frozen. Rejecting the event, recording only an
activity warning, or publishing current exposure without that atom is forbidden;
the attestation does not prove the provider cannot violate it.

This is the closed `unexpected_cancellation_charge` coordinator cause for
compartment, resource-exposure, principal-ledger, authority-ledger, action,
fee-source, and trust writers. The incident atom is inserted exactly once under
its canonical ID. If the bound incident compartment had previously closed, the
same transaction uses `historical_incident_overlay_add` to restore it as a
frozen zero-capacity overlay before adding the atom. No other constructor or generic quarantine write
may account for the charge.

```yaml
schema: cairn.safety_cancellation_preparation_intent.v0.1
principal_id: <principal>
restrictive_control_head_ref: <current paused/frozen/revoked ObjectRef>
restrictive_control_head_hash: sha-256:<hex>
restrictive_control_scope: all_agents | connection | runtime | mandate |
                           compartment | action
restrictive_control_target_commitment: sha-256:<canonical target for scope>
original_action_ref: <already handed-off ObjectRef>
original_outbox_handoff_receipt_ref: <ObjectRef>
receiver_id: <same original receiver>
receiver_account_commitment: sha-256:<same original account>
receiver_account_or_contract_scope: <same exact original scope>
cancellation_operation_namespace: <same exact original receiver namespace>
original_executor_credential_binding_core_ref: <same original ObjectRef>
original_executor_credential_binding_core_hash: sha-256:<hex>
original_executor_credential_binding_head_ref: <head captured at original handoff>
original_executor_credential_binding_head_hash: sha-256:<hex>
original_credential_instance_key: sha-256:<canonical original instance>
original_credential_instance_core_ref: <ObjectRef>
original_credential_instance_core_hash: sha-256:<hex>
original_operation_locator_hash: sha-256:<hex>
cancellation_cost_attestation_ref: <zero-cost ObjectRef>
cancellation_cost_attestation_hash: sha-256:<hex>
cancellation_fee_source_state_head_ref: <same current ObjectRef>
cancellation_fee_source_state_head_hash: sha-256:<hex>
cancellation_fee_source_generation: <same current integer>
requested_operation: prepare_zero_fee_cancellation_only
nonce: <fresh principal nonce>
expires_at: <short expiry>
intent_hash: sha-256:<hex>
principal_signature: <Signature>
not_claiming: [execution_authority, binding_set_issued, cancellation_sent]
```

Under a restrictive applicable control head at any scope in the closed lattice,
this intent permits only non-authorizing safety
preparation: the authority service may create the provisional lineage commitment,
pure review, and cancellation BindingSet from its exact fields. It cannot reserve,
gate, redeem, or send. The principal then sees that binding set and separately
signs CancellationAuthorization. The graph is one-way:
cost attestation → preparation intent → commitment/review/binding set →
CancellationAuthorization/ConfirmationReceipt → reservation/gate/outbox.
Before signing, the principal is shown the cancellation-specific
reserved-judgment vector derived from that exact BindingSet and review graph.
The signed CancellationAuthorization commits that exact vector; it does not
inherit the original action's decisions.

```yaml
schema: cairn.cancellation_authorization.v0.1
cancellation_authorization_id: urn:uuid:<uuid>
principal_id: <principal>
authorization_mode: ordinary | principal_safety_cancellation
restrictive_control_head_ref: <ObjectRef; required only for safety mode>
restrictive_control_head_hash: sha-256:<hex; required only for safety mode>
restrictive_control_scope: <same exact scope; required only for safety mode>
restrictive_control_target_commitment: sha-256:<same target; safety mode only>
original_outbox_handoff_receipt_ref: <ObjectRef; required only for safety mode>
safety_preparation_intent_ref: <ObjectRef; required only for safety mode>
safety_preparation_intent_hash: sha-256:<hex; required only for safety mode>
cancellation_cost_attestation_ref: <ObjectRef>
cancellation_cost_attestation_hash: sha-256:<hex>
cancellation_fee_source_state_head_ref: <same current ObjectRef>
cancellation_fee_source_state_head_hash: sha-256:<hex>
cancellation_fee_source_generation: <same current integer>
execution_binding_set_ref: <ObjectRef>
execution_binding_set_hash: sha-256:<hex>
lineage_commitment_ref: <ObjectRef>
principal_occurrence_id: sha-256:<fresh occurrence bound by this authorization>
cancellation_effect_id: sha-256:<typed cancellation semantics>
original_action_ref: <ObjectRef>
original_action_hash: sha-256:<hex>
original_action_state_head_ref: <current ObjectRef at authorization>
original_action_state_head_hash: sha-256:<hex>
receiver_event_stream_state_head_ref: <current ObjectRef>
receiver_event_stream_state_head_hash: sha-256:<hex>
original_effect_id: sha-256:<hex>
receiver_id: <receiver>
receiver_account_commitment: sha-256:<hex>
receiver_account_or_contract_scope: <exact original scope>
cancellation_operation_namespace: <exact original receiver namespace>
original_executor_credential_binding_core_ref: <ObjectRef>
original_executor_credential_binding_core_hash: sha-256:<hex>
original_executor_credential_binding_head_ref: <head captured at original handoff>
original_executor_credential_binding_head_hash: sha-256:<hex>
original_credential_instance_key: sha-256:<canonical original instance>
original_credential_instance_core_ref: <ObjectRef>
original_credential_instance_core_hash: sha-256:<hex>
original_executor_credential_binding_current_head_ref: <current ObjectRef at authorization>
original_executor_credential_binding_current_head_hash: sha-256:<hex>
cancellation_executor_credential_binding_head_ref: <current cancellation ObjectRef>
cancellation_executor_credential_binding_head_hash: sha-256:<hex>
cancellation_credential_instance_key: sha-256:<canonical current instance>
cancellation_credential_instance_state_head_ref: <current active ObjectRef>
cancellation_credential_instance_state_head_hash: sha-256:<hex>
cancellation_credential_continuity_receipt_ref: <ObjectRef or null iff exact original>
cancellation_credential_continuity_receipt_hash: sha-256:<hex or null>
original_operation_locator:
  kind: provider_operation_id | precommitted_client_reference
  value: <authenticated provider ID, or original idempotency/client-request ID>
expected_original_state: submitted | acknowledged | accepted | unknown
authorized_cancel_state_set: [submitted, acknowledged, accepted, unknown]
cancellation_operation_kind: <exact receiver operation>
acknowledged_warning_codes: []
reserved_judgments_decided: []
required_confirmation_assurance_policy_ref: <ObjectRef>
confirmation_nonce: <fresh principal-selected nonce>
principal_revocation_nonce: <integer>
expires_at: <short expiry>
authorization_hash: sha-256:<hex>
principal_signature: <Signature>
not_claiming: [cancellation_available, cancellation_effective,
               original_effect_undone]
```

The `precommitted_client_reference` branch exists only when the original
authenticated outbox receipt proves that exact reference was sent but the
provider response containing its operation ID was lost. The adapter must support
cancellation lookup by that reference; otherwise the state remains unknown and
the cancellation cannot be submitted.

Cancellation uses the ordinary review-to-execution chain with capability
`cancel_receiver_action`, the cancellation context in its exact binding set, a
fresh `CancellationAuthorization`, transaction-bound `ConfirmationReceipt`,
count/rate reservation and lineage activation, deterministic cancellation gate,
and scoped executor. The binding set fixes adapter target/version, credential
audience, current control heads, taint/review results, idempotency semantics,
original locator/state/account, and an applicability-matched cancellation-
finality profile. Request acknowledgement is never cancellation confirmation.
The fresh current-principal-nonce rule above applies unchanged to
CancellationAuthorization at authorization admission, reservation, gate,
redemption, and cancellation-request handoff. Its signed
`reserved_judgments_decided` vector MUST equal the complete set independently
derived at each boundary from the exact cancellation GateRequest → BindingSet →
review graph and applicable authoritative current policy heads. It cannot
inherit decisions from the original action. Later nonce or policy drift
invalidates current use but does not erase authenticated historical evidence.
A historical valid signature on either authorization does not make the
cancellation currently eligible.
The authorization, BindingSet cancellation context, reservation, deterministic
gate result, redemption receipt, cancellation action binding, and outbox handoff
each repeat—or content-addressedly bind—the exact original binding core/head,
original outbox receipt, receiver account/contract scope, cancellation namespace,
current cancellation credential head, and continuity receipt. Immediately before
bytes or credential release, the outbox resolves the original handoff and current
credential heads and recomputes this tuple. A provider operation ID without its
account/contract scope, a same-audience credential, or an authorization that
binds only the BindingSet hash cannot satisfy the cancellation branch.
Every cancellation in-flight commitment and every resulting assertion registers
the complete canonical set containing both the original credential-instance
dependency and the cancellation credential-instance dependency; if exact reuse
makes them the same key it appears once with both branch roles proved. Historical
compromise of either instance therefore quarantines the cancellation chain. The
gate and handoff resolve the original alias's current successor: exact reuse
denies after any revoke/expiry/quarantine, while a replacement may proceed after
ordinary original revoke/expiry only with a still-active replacement instance
and the signed same-scope continuity receipt. Original-instance quarantine
always denies and triggers reverse closure.

Cancellation binding, authorization, reservation, gate, redemption, and action
state all carry the starting original ActionStateHead and ReceiverEventStreamStateHead.
Immediately before cancellation request handoff, the outbox atomically resolves
their current successors. They must be equal or strictly newer authenticated
heads, remain inside the signed `authorized_cancel_state_set`, and be listed as
cancellation-available by the exact finality profile. `accepted` is eligible only
when that exact profile explicitly permits post-acceptance cancellation; an
irreversible final state cannot be cancellation-available. Failed, reversed,
cancellation-unavailable, equivocated, missing, or unknown-schema state denies.
The outbox records the current heads in its handoff receipt, closing the gate-to-
handoff race.

```yaml
schema: cairn.cancellation_action_binding.v0.1
cancellation_action_id: <new ActionRecord id>
original_action_ref: <ObjectRef>
original_action_hash: sha-256:<hex>
original_action_state_head_ref: <same authorized starting head>
receiver_event_stream_state_head_ref: <same authorized starting stream head>
original_effect_id: sha-256:<hex>
receiver_id: <receiver>
receiver_account_commitment: sha-256:<hex>
receiver_account_or_contract_scope: <exact original scope>
cancellation_operation_namespace: <exact original receiver namespace>
original_executor_credential_binding_core_ref: <ObjectRef>
original_executor_credential_binding_core_hash: sha-256:<hex>
original_executor_credential_binding_head_ref: <head captured at original handoff>
original_executor_credential_binding_head_hash: sha-256:<hex>
original_credential_instance_key: sha-256:<canonical original instance>
original_credential_instance_core_ref: <ObjectRef>
original_credential_instance_core_hash: sha-256:<hex>
original_executor_credential_binding_current_head_ref: <same authorized current ObjectRef>
original_executor_credential_binding_current_head_hash: sha-256:<hex>
cancellation_executor_credential_binding_head_ref: <current cancellation ObjectRef>
cancellation_executor_credential_binding_head_hash: sha-256:<hex>
cancellation_credential_instance_key: sha-256:<canonical current instance>
cancellation_credential_instance_state_head_ref: <current active ObjectRef>
cancellation_credential_instance_state_head_hash: sha-256:<hex>
cancellation_credential_continuity_receipt_ref: <ObjectRef or null iff exact original>
cancellation_credential_continuity_receipt_hash: sha-256:<hex or null>
original_operation_locator: <same closed locator union as authorization>
cancellation_operation_kind: <exact receiver operation>
expected_original_state: submitted | acknowledged | accepted | unknown
cancellation_cost_attestation_ref: <same zero-cost ObjectRef>
cancellation_cost_attestation_hash: sha-256:<hex>
cancellation_fee_source_state_head_ref: <same current ObjectRef>
cancellation_fee_source_state_head_hash: sha-256:<hex>
cancellation_fee_source_generation: <same current integer>
cancellation_effect_id: sha-256:<typed cancellation semantics>
cancellation_authorization_ref: <cairn.cancellation_authorization.v0.1 ObjectRef>
execution_binding_set_ref: <same exact cancellation binding set>
idempotency_key: <stable key>
```

The original action remains immutable. A receiver-confirmed cancellation moves a
submitted/acknowledged/unknown original action only through an allowed baseline
transition to `failed` with reason `receiver_cancelled`; `cancelled` remains the
pre-submission terminal state. Exposure and inventory remain held until a verified
receiver cancellation/failure/finality receipt or fenced non-submission proof.
Cancellation authority cannot be inferred from authority over the original act.

Every adapter defines receiver receipt time, authoritative ID, cancellation race,
acknowledged/final states, authenticated query/webhook, idempotency, reversals,
and unknown behavior. Local/model/popup time cannot replace receiver time.

Agent-callable reconciliation only requests an authenticated adapter query. It
cannot supply a receiver state. `execution.provider_event.import` is an adapter-only
operation and binds raw event digest, adapter identity/version, authenticated
source, provider sequence/time, original action/effect/lineage/idempotency IDs,
receiver operation/account, rail, amount, exact finality profile, and prior import
head. It writes the Cairn transparency anchor and current
ReceiverAssertionTrustStateHead and registers the assertion/exposure under every
exact policy, stable source-credential authority, executor-credential binding,
adapter-identity, provider-account/sublimit, protection-attestation, and
execution-release dependency
head before finality classification or exposure release can commit. State
regression, stale sequence, wrong source, incomplete dependency vector, or
unmatched fields deny.
The immutable event-binding core contains the full authenticated tuple, while
event ID and provider sequence are **independent uniqueness dimensions** under
their exact finality-profile scopes. All scope values are authenticated and
match the finality-profile applicability tuple. Re-import whose two identity
heads already bind the same core is idempotent; reuse of either event ID or
sequence for any different core/digest/state is equivocation and invokes the
atomic identity/stream/trust/exposure quarantine above. An advancing event with
two fresh identity keys must still be strictly newer under the profile's
closed total-order comparator and valid from the current state. Receiver time is
authenticated audit metadata only: it never determines, repairs, or breaks order
in v0.1 and never repairs an equal-sequence conflict.

The human receives three controls: **Freeze new agent actions**, **Disconnect
this agent**, and **Try to cancel in-flight actions**. Results say exactly:

```text
Stopped before submission
Cancellation requested
Cancellation confirmed by <receiver>
Accepted by <receiver>; cancellation <available | requested | unavailable>
State unknown; Cairn is checking
```

| Failure | Required behavior |
|---|---|
| redemption CAS lost | no execution; conflict receipt |
| committed, no handoff | prove non-submission before failing/releasing |
| provider timeout | unknown; query by stable IDs |
| cancellation races acceptance | receiver receipt decides |
| revocation before redemption | block |
| revocation after redemption, before handoff | cancel only with fenced non-submission proof |
| revocation after acceptance | receipt; separate cancellation if supported |
| provider/local conflict | quarantine, preserve exposure, reconcile |
| refund confirmed | separate action/receipt; apply signed accounting policy |

## 10. Human surface

Connection flow:

```text
Choose agent
→ inspect runtime and requested data
→ choose Advise / Prepare / Ask / Act within limits
→ configure exact scope and limits
→ inspect compartment protection class
→ transaction-bound confirmation
→ connection receipt and Agent active summary
```

No screen uses “connected” as “can spend.” The editor uses familiar language:

```text
Anko may: Send offers
For: These 4 exact cards
To: Crowley only
Price: 8–10 USDC each
Maximum today: 30 USDC
Maximum currently committed: 30 USDC
Evidence: Front, back, and current condition declaration required
Until: Sunday, 8:00 PM
Still asks before: Paying, changing cards, accepting a counteroffer,
                   releasing escrow, or waiving evidence
```

The activity trace reads: `You asked → Anko proposed → Cairn reviewed → You
allowed / Your limits allowed → Cairn reserved → Sent → Receiver acknowledged →
Receiver finalized / Cancellation confirmed / State unknown`. Rows expand to
exact original-action and cancellation-action receipts.

Interrupt for widened recipient/payee/rail/copy/amount, new judgment, warning,
unknown, evidence failure, stale quote, cancellation race, or deadline. Blue is
advice/preparation, gold money, oxblood human authority/attention, and green only
receiver-confirmed completion whose current assertion-trust and lifecycle heads
remain accepted; quarantine removes green without rewriting the historical
receipt. Text and icon remain required.

Direct posted-ask payment SHOULD feel like checkout. One ceremony MAY sign exact
`ActionAuthorization(accept_terms)` and
`ActionAuthorization(authorize_payment|fund_escrow)` objects together. The terms
authorization is the typed terms-acceptance authority; there is no third,
unbound `TermsAcceptance` object. Each binds its own proposal/effect and the same
exact cart/terms. Immediately above the single gold confirmation control, the
surface states in plain language: **“Your acceptance can bind the deal even if
payment cannot finish. If payment is blocked, Cairn will show what happened and
ask before any new payment attempt.”** The review, both BindingSets, and both
authorities bind `TERMS_MAY_BIND_BEFORE_PAYMENT`; checking a generic terms box,
confirming only the payment role, or acknowledging it after the terms effect is
sent is invalid. The ceremony cannot release escrow,
waive evidence, accept inspection, or authorize substitution. Changed economics
becomes negotiation.

Before the ceremony, Cairn signs a non-authorizing coordinator core over stable
terms and payment semantics. For a direct ask, both binding sets and both human
authorizations bind that core and their role. For an already receiver-bound
negotiated obligation, only the payment chain is new; the prior authenticated
terms receipt is adopted, never replayed. Every payment chain also binds one
universal fulfillment-attempt core:

Seller inventory remains an independently owned saga. Cairn never writes a seller
availability/hold head:

```yaml
schema: cairn.commerce_nonterminal_inventory_entry.v0.1
authority_stable_key: sha-256:<commerce authority being drained>
entry_kind: inventory_reservation | copy_lease
entry_stable_key: sha-256:<reservation id or globally canonical copy-lease key>
current_state_head_ref: <nonterminal InventoryReservationStateHead or
                         SellerCopyLeaseStateHead ObjectRef>
current_state_head_hash: sha-256:<hex>
current_state: hold_prepared | prepared | held | terms_fenced
seller_id: <seller>
inventory_reservation_id: <reservation id>
copy_id: <exact copy id or null for reservation entry>
entry_hash: sha-256:<hex>
commerce_authority_signature: <Signature>
```

`inventory_reservation` admits only `hold_prepared | held | terms_fenced` and
requires `copy_id:null`; `copy_lease` admits only `prepared | held |
terms_fenced` and requires its exact copy ID. The authoritative snapshot root is
the complete set for the named authority and epoch, not a caller-selected query.

```yaml
schema: cairn.commerce_signer_drain_proof.v0.1
authority_stable_key: sha-256:<seller-inventory or copy-registry authority>
authority_state_head_ref: <current draining_rotation or draining_retirement
                           CommerceSignerAuthorityStateHead ObjectRef>
authority_state_head_hash: sha-256:<hex>
drain_begin_transition_receipt_ref: <ObjectRef for exact active→draining edge>
drain_begin_transition_receipt_hash: sha-256:<hex>
inventory_scope_kind: seller_reservations_and_copy_leases | global_copy_leases
authoritative_snapshot_ref: <registry-authenticated snapshot ObjectRef>
authoritative_snapshot_hash: sha-256:<hex>
complete_nonterminal_entry_manifest_ref: <EnumerableMapRoot ObjectRef with
                                            commerce_nonterminal_inventory entries>
complete_nonterminal_entry_manifest_hash: sha-256:<canonical empty-map hash>
complete_nonterminal_entry_count: 0
scan_start_cursor: <canonical beginning>
scan_end_cursor: <authenticated end cursor>
snapshot_epoch: <monotonic authority epoch>
issued_at: <registry-authoritative time>
expires_at: <short expiry>
proof_hash: sha-256:<hex>
commerce_authority_signature: <Signature>
registry_authority_signature: <Signature>
```

```yaml
schema: cairn.commerce_signer_authority_core.v0.1
authority_kind: seller_inventory_service | copy_ownership_registry
authority_stable_id: <registry-canonical organization/service identity>
provider_trust_domain_id: <canonical trust domain>
registry_authority_ref: <allowlisted registry ObjectRef>
registry_authority_hash: sha-256:<hex>
authority_owner_identity_ref: <owner root identity ObjectRef>
authority_owner_identity_hash: sha-256:<hex>
signing_key_family_commitment: sha-256:<stable key family>
restrictive_recovery_semantic_hash: sha-256:<canonical
  CAIRN_COMMERCE_RESTRICTIVE_RECOVERY_V0_1 semantics below>
authority_stable_key: sha-256:<domain-separated kind/identity/domain>
core_hash: sha-256:<hex>
authority_owner_recovery_consent_signature: <Signature over core and recovery semantic>
registry_authority_signature: <Signature>
```

```yaml
schema: cairn.commerce_signer_authority_state_head.v0.1
authority_stable_key: sha-256:<same stable key>
authority_core_ref: <CommerceSignerAuthorityCore ObjectRef>
authority_core_hash: sha-256:<hex>
authority_kind: seller_inventory_service | copy_ownership_registry
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null at insert-only genesis>
signing_key_generation: <monotonic integer>
current_signing_key_ref: <registry-authenticated key ObjectRef>
current_signing_key_hash: sha-256:<hex>
continuity_evidence_ref: <ObjectRef or null at genesis/same-generation restriction>
continuity_evidence_hash: sha-256:<hex or null>
state: active | draining_rotation | draining_retirement | retired |
       emergency_revoked | quarantined
effective_at: <registry-authoritative time>
state_hash: sha-256:<hex>
signer_kind: registry_authority | trust_coordinator
registry_authority_signature: <Signature or null unless genesis/drain/rotation/retirement>
trust_coordinator_signature: <Signature or null unless emergency revocation/quarantine>
```

```yaml
schema: cairn.commerce_signer_authority_transition_receipt.v0.1
authority_stable_key: sha-256:<same key>
cause: import_genesis | begin_rotation_drain | begin_retirement_drain |
       signing_key_rotated | scheduled_retirement | drain_abandoned |
       emergency_revocation | compromise_quarantine
before_head_ref: <ObjectRef or null only at insert-only genesis>
before_head_hash: sha-256:<hex or null>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
before_signing_key_generation: <integer or null at genesis>
after_signing_key_generation: <0 at genesis; same unless rotation; before + 1 on rotation>
continuity_evidence_ref: <ObjectRef required exactly for rotation>
continuity_evidence_hash: sha-256:<hex or null>
drain_proof_ref: <CommerceSignerDrainProof ObjectRef required exactly for
                  signing_key_rotated, scheduled_retirement, or drain_abandoned>
drain_proof_hash: sha-256:<hex or null>
trust_compromise_plan_core_ref: <upstream ObjectRef required exactly for compromise>
trust_compromise_plan_core_hash: sha-256:<hex or null>
genesis_transition_history_head_ref: <empty LifecycleTransitionHistoryStateHead ObjectRef iff genesis>
genesis_transition_history_head_hash: sha-256:<hex or null>
transition_history_before_head_ref: <current ObjectRef required for every non-genesis cause>
transition_history_before_head_hash: sha-256:<hex or null>
transition_history_next_state_commitment_hash: sha-256:<self-excluding map-add tuple or null at genesis>
authority_transaction_id: <registry transition or trust-coordinator transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
signer_kind: registry_authority | trust_coordinator
registry_authority_signature: <Signature or null unless genesis/drain/rotation/retirement>
trust_coordinator_signature: <Signature or null unless emergency revocation/quarantine>
```

Each authority family has one stable identity across signing-key rotation. Its
closed lifecycle is `active(g) → draining_rotation(g) |
draining_retirement(g) | emergency_revoked | quarantined`;
`draining_rotation(g) → active(g+1) | active(g) | emergency_revoked |
quarantined`; `draining_retirement(g) → retired | active(g) |
emergency_revoked | quarantined`; `retired → emergency_revoked |
quarantined`; and both restrictive terminal states have no successor. The two
drain-begin causes retain the signing generation, carry no drain proof, and are
registry signed. New inventory prepare/admission requires both commerce heads to
be `active` and participates in the same serializable expected-head guard as
either drain-begin CAS: exactly one may commit first. While either head is
draining, no new reservation, hold, or terms fence may begin. Existing leases may
only complete an already receiver-accepted consume, perform a proved release, or
quarantine; every other progress edge denies.

Rotation requires registry-authenticated continuity and never reactivates
generation `g`. Rotation completion, retirement completion, and drain abandonment
require the exact current, unexpired, jointly signed CommerceSignerDrainProof
created under that unchanged draining head with canonical empty enumerable
nonterminal inventory. Rotation alone advances the signing generation;
abandonment returns to active at the same generation. A configuration claim,
sampled count, pre-drain snapshot, opaque root, stale head, or owner-only
assertion is not a drain proof. Emergency revocation or
compromise is visible only through `execution.trust_compromise.commit`, which
freezes Cairn's eligibility for every dependent inventory head plus its actions,
assertions, and exposure before publishing the restrictive commerce-authority
head. Seller reservation/copy heads remain independently owned and unchanged by
that local transaction; configuration allowlists and TLS identity are not
substitutes for these protocol objects. Cairn and the trust coordinator never
become seller writers. A separately signed recovery authorization is admissible
only because the seller/copy authority owner precommitted the exact restrictive
semantic in its immutable authority core and its registry is acting within that
preauthorization.
The genesis receipt creates and binds the signed empty lifecycle-history head.
Every later commerce-signer transition, including the first rotation or
restriction, requires that exact current nonnull history predecessor and
atomically appends itself under the ordinary lifecycle-history construction.

`draining_cleanup` is a distinct non-recovery transition authority. At least one
role must bind its exact current `draining_rotation | draining_retirement` head,
unchanged key generation, and drain-begin receipt; the other role must be current
active or likewise draining. The reservation and every copy predecessor must
predate all bound drain-begin receipts. It permits only: an authenticated
acceptance for a terms handoff committed before drain-begin to finish
`terms_fenced → consumed`; authenticated nonacceptance/reversal or fenced
non-submission to release the reservation and return copies to `available`; or
conservative quarantine. The seller service signs every result and each draining
copy-registry role co-signs. Prepare, commit-held, terms fencing, a new terms
handoff, changed terms/copy set, relisting before active rotation completion, and
ownership transfer are forbidden. If any role becomes emergency-revoked or
quarantined, draining cleanup denies and only the owner-preauthorized restrictive
recovery matrix below can proceed.

```yaml
schema: cairn.commerce_inventory_restrictive_recovery_authorization.v0.1
recovery_id: urn:uuid:<uuid>
inventory_reservation_before_head_ref: <nonterminal InventoryReservationStateHead ObjectRef>
inventory_reservation_before_head_hash: sha-256:<hex>
copy_lease_before_heads_root: sha-256:<exact sorted nonterminal copy-head set>
seller_inventory_authority_basis:
  kind: current_active | current_draining_cleanup | restrictive_recovery_registry
  authority_core_ref: <CommerceSignerAuthorityCore ObjectRef>
  authority_core_hash: sha-256:<hex>
  authority_state_head_ref: <current active, current draining, or exact restrictive ObjectRef>
  authority_state_head_hash: sha-256:<hex>
  authority_signing_key_generation: <integer>
  restriction_transition_receipt_ref: <ObjectRef iff restrictive basis>
  restriction_transition_receipt_hash: sha-256:<hex or null>
  drain_begin_transition_receipt_ref: <ObjectRef iff current_draining_cleanup>
  drain_begin_transition_receipt_hash: sha-256:<hex or null>
copy_ownership_registry_authority_basis: <same closed basis shape for copy registry>
disposition: finalize_consumed | release_and_quarantine_copies | quarantine_unresolved
disposition_evidence_kind: authenticated_terms_acceptance |
                           authenticated_nonacceptance_or_reversal |
                           fenced_pre_handoff_non_submission |
                           unresolved_compromise
disposition_evidence_ref: <branch-exact authenticated ObjectRef>
disposition_evidence_hash: sha-256:<hex>
inventory_reservation_next_state_commitment_hash: sha-256:<self-excluding exact successor>
copy_lease_next_state_commitments_root: sha-256:<exact sorted self-excluding successors>
recovery_nonce: <fresh registry nonce>
issued_at: <registry-authoritative time>
expires_at: <short expiry>
authorization_hash: sha-256:<hex>
seller_inventory_service_signature: <Signature iff seller basis current_active or current_draining_cleanup>
seller_recovery_registry_signature: <Signature iff seller basis restrictive>
copy_ownership_registry_signature: <Signature iff copy basis current_active or current_draining_cleanup>
copy_recovery_registry_signature: <Signature iff copy basis restrictive>
not_authorizing: [prepare, commit_held, fence_terms, relist, ownership_transfer,
                  new_reservation, changed_terms, changed_copy_set]
```

The two authority bases are complete and role-specific; at least one MUST be
`restrictive_recovery_registry`. A current-active basis uses that authority's
ordinary current key. A current-draining basis uses the unchanged generation,
exact drain-begin receipt, and permits only the same cleanup disposition. A restrictive basis requires the exact terminal
commerce-authority head and transition receipt, the immutable owner recovery
consent in its core, and the same pinned registry authority's signature. The
authorization has no after-head refs, only successor commitments, so it is
upstream and acyclic.

The closed recovery matrix is:

- `finalize_consumed`: only `terms_fenced → consumed` for the reservation and
  every copy, with exact authenticated acceptance for the already-bound terms;
- `release_and_quarantine_copies`: `prepared | held | terms_fenced → released`
  for the reservation, but every copy becomes terminal `quarantined`, only from
  authenticated nonacceptance/reversal or fenced pre-handoff non-submission; and
- `quarantine_unresolved`: any nonterminal reservation/copy set becomes
  `quarantined`, preserves unresolved Cairn exposure, and cannot claim release.

No recovery branch produces `available`, changes seller/copy/terms/price, creates
or widens a hold, fences terms, transfers ownership, or makes the affected
authority eligible. `finalize_consumed` and the proved release branch may drive
the already-defined Cairn obligation/checkout cleanup with the exact resulting
external receipt; unresolved quarantine stays economically frozen. A second
authorization for the same predecessor conflicts on its CAS. If a required
registry is unavailable or untrusted, local trust restriction remains safe and
cleanup stays visibly pending; no actor may substitute a stale seller key.

```yaml
schema: cairn.ordinary_deal_inventory_commitment.v0.1
seller_id: <seller>
deal_ref: <ObjectRef>
deal_head_ref: <current ObjectRef>
deal_head_hash: sha-256:<hex>
proposal_ref: <offer/counter/acceptance proposal ObjectRef>
proposal_hash: sha-256:<hex>
closed_terms_hash: sha-256:<hex>
listing_refs: []
copy_ids: []
obligation_exposure_core_ref: <ObjectRef>
obligation_exposure_core_hash: sha-256:<hex>
obligation_exposure_id: sha-256:<hex>
seller_copy_available_heads_root: sha-256:<exact sorted global-copy heads>
seller_inventory_authority_state_head_ref: <current active ObjectRef>
seller_inventory_authority_state_head_hash: sha-256:<hex>
seller_inventory_authority_signing_key_generation: <integer>
copy_ownership_registry_authority_state_head_ref: <current active ObjectRef>
copy_ownership_registry_authority_state_head_hash: sha-256:<hex>
copy_ownership_registry_authority_signing_key_generation: <integer>
issued_at: <coordinator-service time>
expires_at: <time>
commitment_hash: sha-256:<hex>
coordinator_service_signature: <Signature>
not_claiming: [seller_hold, principal_authority, terms_submitted]
```

This pre-BindingSet core is the ordinary-deal analogue of the checkout transition
template. It fixes the consequential deal, proposal, terms, copies, obligation,
and exact globally current copy heads without authorizing submission or predicting
a successor head. Unknown or caller-selected copy identity denies.

```yaml
schema: cairn.seller_copy_lease_state_head.v0.1
seller_id: <seller>
copy_id: <globally canonical exact-copy id>
copy_lease_key: sha-256:<domain-separated globally canonical copy_id only>
ownership_generation: <monotonic seller-registry generation>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: available | prepared | held | terms_fenced | consumed | quarantined
inventory_reservation_id: <seller reservation id or null when available>
reservation_context_kind: checkout | ordinary_deal | null when available
inventory_context_ref: <CheckoutTransitionTemplate or OrdinaryDealInventoryCommitment
                        ObjectRef; null when available>
inventory_context_hash: sha-256:<hex or null when available>
obligation_exposure_id: sha-256:<hex or null when available>
checkout_group_core_ref: <ObjectRef or null unless held checkout>
ordinary_deal_ref: <ObjectRef or null unless ordinary_deal>
terms_action_ref: <ObjectRef or null before terms_fenced>
terms_effect_id: sha-256:<hex or null before terms_fenced>
terms_outbox_fence_commitment: sha-256:<hex or null before terms_fenced>
terms_fence_claim_state_head_ref: <pending checkout-or-ordinary claim ObjectRef,
                                   or null before terms_fenced>
lease_generation: <monotonic integer; increments on every available→prepared>
updated_at: <branch-authoritative time>
state_hash: sha-256:<hex>
transition_authority_kind: ordinary_seller | ownership_registry | draining_cleanup |
                           restrictive_recovery
seller_inventory_authority_state_head_ref: <exact authority basis used at this
  transition; current active at ordinary commit, current draining at cleanup
  commit, or exact restrictive/active recovery basis>
seller_inventory_authority_state_head_hash: sha-256:<hex>
seller_inventory_authority_signing_key_generation: <integer>
copy_ownership_registry_authority_state_head_ref: <exact authority basis used at
  this transition under the same active/draining/recovery discriminator>
copy_ownership_registry_authority_state_head_hash: sha-256:<hex>
copy_ownership_registry_authority_signing_key_generation: <integer>
restrictive_recovery_authorization_ref: <ObjectRef iff restrictive recovery>
restrictive_recovery_authorization_hash: sha-256:<hex or null>
seller_inventory_drain_begin_receipt_ref: <ObjectRef iff seller basis draining_cleanup>
seller_inventory_drain_begin_receipt_hash: sha-256:<hex or null>
copy_registry_drain_begin_receipt_ref: <ObjectRef iff copy basis draining_cleanup>
copy_registry_drain_begin_receipt_hash: sha-256:<hex or null>
seller_inventory_service_signature: <Signature for ordinary/draining edge or active seller recovery basis; else null>
copy_ownership_registry_signature: <Signature for genesis/ownership transfer,
                                    draining copy basis, or active copy recovery basis; else null>
seller_recovery_registry_signature: <Signature or null unless seller restrictive basis>
copy_recovery_registry_signature: <Signature or null unless copy restrictive basis>
```

```yaml
schema: cairn.seller_copy_lease_transition_receipt.v0.1
copy_lease_key: sha-256:<same global key>
cause: import_genesis | prepare | commit_held | fence_terms | consume | release | expire |
       quarantine | ownership_transfer | drain_cleanup_consume |
       drain_cleanup_release | drain_cleanup_quarantine | restrictive_recovery_consume |
       restrictive_recovery_release | restrictive_recovery_quarantine
before_head_ref: <ObjectRef or null only for insert-only genesis>
before_head_hash: sha-256:<hex or null>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
inventory_reservation_transition_commitment_hash: sha-256:<self-excluding parent
  commitment required for ordinary seller, draining-cleanup, and restrictive-recovery child causes;
  null only for genesis/ownership transfer>
ownership_transfer_evidence_ref: <authenticated ObjectRef or null unless transfer>
ownership_transfer_evidence_hash: sha-256:<hex or null>
before_ownership_generation: <integer or null only for genesis>
after_ownership_generation: <generation 0 at genesis, same on ordinary/draining/recovery edge,
                             or before + 1 on transfer>
seller_inventory_authority_state_head_ref: <exact current active ObjectRef for ordinary,
  current draining ObjectRef for cleanup, or exact authorization basis for recovery>
seller_inventory_authority_state_head_hash: sha-256:<hex>
seller_inventory_authority_signing_key_generation: <integer>
copy_ownership_registry_authority_state_head_ref: <exact current active ObjectRef for ordinary,
  current draining ObjectRef for cleanup, or exact authorization basis for recovery>
copy_ownership_registry_authority_state_head_hash: sha-256:<hex>
copy_ownership_registry_authority_signing_key_generation: <integer>
restrictive_recovery_authorization_ref: <ObjectRef iff restrictive recovery>
restrictive_recovery_authorization_hash: sha-256:<hex or null>
seller_inventory_drain_begin_receipt_ref: <ObjectRef iff seller basis draining_cleanup>
seller_inventory_drain_begin_receipt_hash: sha-256:<hex or null>
copy_registry_drain_begin_receipt_ref: <ObjectRef iff copy basis draining_cleanup>
copy_registry_drain_begin_receipt_hash: sha-256:<hex or null>
authority_transaction_id: <same seller, ownership-registry, or restrictive-recovery transaction>
committed_at: <branch-authoritative time>
receipt_hash: sha-256:<hex>
transition_authority_kind: ordinary_seller | ownership_registry | draining_cleanup |
                           restrictive_recovery
seller_inventory_service_signature: <Signature for ordinary/draining cause or active seller recovery basis; else null>
copy_ownership_registry_signature: <Signature for genesis/ownership transfer,
                                    draining copy basis, or active copy recovery basis; else null>
seller_recovery_registry_signature: <Signature or null unless seller restrictive basis>
copy_recovery_registry_signature: <Signature or null unless copy restrictive basis>
```

The Cairn copy/ownership registry maintains exactly one globally current head per
`copy_lease_key`, independent of seller and ownership generation. Genesis import
is insert-only for a never-seen copy ID. An ownership transfer or generation
advance CASes that same current head, changes seller/generation only from
`available` or `consumed` with authenticated transfer evidence, and produces an
`available` successor; it is forbidden from `prepared`, `held`, `terms_fenced`,
or `quarantined`. A `consumed` predecessor additionally requires the exact deal/
obligation to be fulfilled with ownership transfer confirmed, or conclusively
cancelled/reversed under its dispute policy; a live/unknown payment or accepted
unfulfilled obligation blocks transfer. The closed lease edges are `available → prepared`; `prepared → held |
available | quarantined`; `held → terms_fenced | available | quarantined`;
`terms_fenced → consumed | available | quarantined`; and `consumed`/`quarantined`
are terminal for ordinary lease operations in that ownership generation. Release or expiry returns to
`available` with every reservation/group/action field cleared and a higher
sequence; a later prepare increments `lease_generation`. Preparing a multi-copy
set CASes the exact sorted current availability-head set in one seller transaction
and either advances all to `prepared` under one reservation ID or advances none.
Overlapping reservations therefore contend on at least one identical current
copy head and at most one wins; a new seller or generation cannot create a second
key or genesis.

Every copy-head successor emits the typed receipt above. Ordinary lease causes
are seller-inventory signed and bind the self-excluding commitment of the parent
InventoryReservationTransitionReceipt; that parent carries the complete child
receipt root. `ownership_transfer` is copy-ownership-registry signed, requires
the exact authenticated transfer evidence, increments ownership generation by
one, clears all reservation fields, and cannot use a seller signature.
Restrictive-recovery copy successors use only the exact upstream authorization,
matching role signatures, before-head set and permitted disposition. They cannot
use an ordinary cause or produce `available`/ownership transfer. Their child
receipts bind the same self-excluding parent reservation-transition commitment,
so recovery remains one exact-copy-set CAS rather than independent per-card
cleanup. That commitment hashes the parent operation, exact before roots,
inventory context, authority basis/recovery authorization, disposition evidence,
transaction identity and successor semantic commitments, while excluding the
parent's after-head refs, child-receipt root, receipt hash and signatures. The
parent later carries the complete child-receipt root; adding any reciprocal ref
or omitting the commitment from one ordinary/draining/recovery child fails before hashing.

A state head records the authority basis that signed that historical transition;
it is not rewritten merely because a clean rotation later completes. Preparing
an `available` copy after `draining_rotation(g) → active(g+1)` therefore requires
the exact consecutive commerce-authority lifecycle/history receipts connecting
the recorded signer head to the current active head for each role. The prepare
successor records those current active heads/generations. This continuity bridge
is valid only for an unchanged seller, copy ID, ownership generation and
available predecessor; it cannot revive consumed/quarantined state or cross a
retirement/emergency restriction.

```yaml
schema: cairn.inventory_reservation_state_head.v0.1
inventory_reservation_id: <seller-inventory-service canonical id>
seller_id: <seller>
listing_refs: []
copy_ids: []
copy_lease_before_heads_root: sha-256:<exact sorted available-head set at prepare>
copy_lease_current_heads_root: sha-256:<exact sorted current lease-head set>
reservation_context_kind: checkout | ordinary_deal
inventory_context_ref: <CheckoutTransitionTemplate or OrdinaryDealInventoryCommitment>
inventory_context_hash: sha-256:<hex>
checkout_transition_template_ref: <ObjectRef or null unless checkout>
checkout_transition_template_hash: sha-256:<hex or null unless checkout>
ordinary_deal_inventory_commitment_ref: <ObjectRef or null unless ordinary_deal>
ordinary_deal_inventory_commitment_hash: sha-256:<hex or null unless ordinary_deal>
obligation_exposure_id: sha-256:<same context obligation>
checkout_group_core_ref: <ObjectRef or null unless held checkout>
checkout_inventory_pending_receipt_ref: <ObjectRef or null unless held checkout>
ordinary_deal_ref: <ObjectRef or null unless ordinary_deal>
terms_action_ref: <ObjectRef or null until terms_fenced>
terms_effect_id: sha-256:<hex or null until terms_fenced>
terms_outbox_fence_commitment: sha-256:<hex or null until terms_fenced>
terms_fence_claim_state_head_ref: <pending branch-exact claim ObjectRef or null until terms_fenced>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: hold_prepared | held | terms_fenced | consumed | released | expired | quarantined
fencing_token: <monotonic integer>
hold_expires_at: <seller-service authenticated time>
updated_at: <seller-inventory-service time>
state_hash: sha-256:<hex>
transition_authority_kind: ordinary_seller | draining_cleanup | restrictive_recovery
seller_inventory_authority_state_head_ref: <exact authority basis used at this
  transition under the active/draining/recovery discriminator>
seller_inventory_authority_state_head_hash: sha-256:<hex>
seller_inventory_authority_signing_key_generation: <integer>
restrictive_recovery_authorization_ref: <ObjectRef iff restrictive recovery>
restrictive_recovery_authorization_hash: sha-256:<hex or null>
seller_inventory_drain_begin_receipt_ref: <ObjectRef iff seller basis draining_cleanup>
seller_inventory_drain_begin_receipt_hash: sha-256:<hex or null>
copy_registry_drain_begin_receipt_ref: <ObjectRef iff copy basis draining_cleanup>
copy_registry_drain_begin_receipt_hash: sha-256:<hex or null>
seller_inventory_service_signature: <Signature for ordinary/draining transition or active seller recovery basis; else null>
copy_ownership_registry_signature: <Signature iff copy basis draining_cleanup>
seller_recovery_registry_signature: <Signature or null unless seller restrictive basis>
```

```yaml
schema: cairn.inventory_reservation_transition_receipt.v0.1
inventory_reservation_id: <same id>
transition: prepare | commit_held | fence_terms | consume | release | expire | quarantine |
            drain_cleanup_consume | drain_cleanup_release | drain_cleanup_quarantine |
            restrictive_recovery_consume | restrictive_recovery_release |
            restrictive_recovery_quarantine
before_head_ref: <ObjectRef or null for prepare>
before_head_hash: sha-256:<hex or null>
after_head_ref: <ObjectRef>
after_head_hash: sha-256:<hex>
copy_lease_before_heads_root: sha-256:<exact sorted current set before transition>
copy_lease_after_heads_root: sha-256:<exact sorted successor set>
copy_lease_transition_receipts_root: sha-256:<exact one typed receipt per changed copy>
reservation_context_kind: checkout | ordinary_deal
inventory_context_ref: <exact context ObjectRef>
inventory_context_hash: sha-256:<hex>
obligation_exposure_id: sha-256:<same context obligation>
checkout_group_core_ref: <ObjectRef or null unless checkout commit_held>
checkout_inventory_pending_receipt_ref: <ObjectRef or null unless checkout commit_held>
ordinary_deal_ref: <ObjectRef or null unless ordinary_deal>
terms_action_ref: <ObjectRef or null unless fence_terms/later>
terms_effect_id: sha-256:<hex or null unless fence_terms/later>
terms_outbox_fence_commitment: sha-256:<hex or null unless fence_terms/later>
terms_fence_claim_state_head_ref: <pending/redeemed/abandoned branch-exact ObjectRef or null>
receiver_disposition_non_submission_or_abandonment_proof_ref: <ObjectRef or null unless post-fence release>
seller_inventory_authority_state_head_ref: <exact authority basis used at this
  transition under the active/draining/recovery discriminator>
seller_inventory_authority_state_head_hash: sha-256:<hex>
seller_inventory_authority_signing_key_generation: <integer>
restrictive_recovery_authorization_ref: <ObjectRef iff restrictive recovery>
restrictive_recovery_authorization_hash: sha-256:<hex or null>
seller_inventory_drain_begin_receipt_ref: <ObjectRef iff seller basis draining_cleanup>
seller_inventory_drain_begin_receipt_hash: sha-256:<hex or null>
copy_registry_drain_begin_receipt_ref: <ObjectRef iff copy basis draining_cleanup>
copy_registry_drain_begin_receipt_hash: sha-256:<hex or null>
seller_transaction_id: <stable seller or restrictive-recovery transaction id>
committed_at: <seller-service or recovery-registry authoritative time>
receipt_hash: sha-256:<hex>
transition_authority_kind: ordinary_seller | draining_cleanup | restrictive_recovery
seller_inventory_service_signature: <Signature for ordinary/draining transition or active seller recovery basis; else null>
copy_ownership_registry_signature: <Signature iff copy basis draining_cleanup>
seller_recovery_registry_signature: <Signature or null unless seller restrictive basis>
copy_recovery_registry_signature: <Signature or null unless copy restrictive basis>
```

The pre-redemption terms fence has its own authority-service claim, so proof of
abandonment never depends on a not-yet-created outbox:

```yaml
schema: cairn.checkout_terms_fence_claim_state_head.v0.1
checkout_group_core_ref: <ObjectRef>
terms_action_ref: <ObjectRef>
terms_effect_id: sha-256:<hex>
terms_outbox_fence_commitment: sha-256:<hex>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: pending | redeemed | abandoned
transition_receipt_ref: <ObjectRef or null for pending genesis>
updated_at: <authority-service time>
state_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.checkout_terms_fence_abandonment_receipt.v0.1
checkout_group_core_ref: <same ObjectRef>
terms_action_ref: <same ObjectRef>
terms_effect_id: sha-256:<same hex>
terms_outbox_fence_commitment: sha-256:<same hex>
prior_claim_head_ref: <pending ObjectRef>
prior_claim_head_hash: sha-256:<hex>
next_claim_state_commitment_hash: sha-256:<self-excluding abandoned-head commitment>
current_group_state_head_ref: <terms_fence_pending ObjectRef>
current_group_state_head_hash: sha-256:<hex>
cause: authority_expired | authority_revoked | principal_cancelled |
       local_pre_redemption_failure
cause_receipt_ref: <authenticated ObjectRef>
authority_transaction_id: <claim pending→abandoned CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
not_claiming: [receiver_nonacceptance, outbox_non_submission, terms_redeemed]
```

The claim has exactly `pending → redeemed | abandoned`; both successors are
terminal and at most one wins. Gate creation of `terms_fence_pending` atomically
creates the pending claim. Successful redemption CASes it to `redeemed` in the
same transaction that creates the EffectLease and OutboxStateHead. Before that
CAS, `execution.checkout_terms_fence.abandon` may instead consume it and emit the
receipt above; its abandoned head points one way to the receipt, which carries
only the self-excluding next-state commitment. The seller service accepts this
receipt and current abandoned head as the exact proof for
`terms_fenced → released`. A later redemption cannot cross the terminal claim
fence.

The ordinary-deal branch uses the same crash fence without pretending to have a
checkout group:

```yaml
schema: cairn.ordinary_terms_fence_claim_state_head.v0.1
ordinary_deal_inventory_commitment_ref: <ObjectRef>
deal_ref: <ObjectRef>
obligation_exposure_id: sha-256:<hex>
terms_action_ref: <ObjectRef>
terms_effect_id: sha-256:<hex>
terms_outbox_fence_commitment: sha-256:<hex>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: pending | redeemed | abandoned
transition_receipt_ref: <ObjectRef or null for pending genesis>
updated_at: <authority-service time>
state_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.ordinary_terms_fence_abandonment_receipt.v0.1
ordinary_deal_inventory_commitment_ref: <same ObjectRef>
deal_ref: <same ObjectRef>
obligation_exposure_id: sha-256:<same hex>
terms_action_ref: <same ObjectRef>
terms_effect_id: sha-256:<same hex>
terms_outbox_fence_commitment: sha-256:<same hex>
prior_claim_head_ref: <pending ObjectRef>
prior_claim_head_hash: sha-256:<hex>
next_claim_state_commitment_hash: sha-256:<self-excluding abandoned commitment>
cause: authority_expired | authority_revoked | principal_cancelled |
       local_pre_redemption_failure
cause_receipt_ref: <authenticated ObjectRef>
authority_transaction_id: <claim pending→abandoned CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
not_claiming: [receiver_nonacceptance, outbox_non_submission, terms_redeemed]
```

Its matrix and race are also exactly `pending → redeemed | abandoned`. The local
gate-pending transaction creates it before the seller fences the ordinary copy;
redemption consumes it, while pre-redemption failure may abandon it and authorize
only the matching seller release. Thus neither checkout nor ordinary negotiation
can strand a copy in the fence-to-outbox crash window.

Only the authenticated seller inventory service may invoke the sole writer
`execution.inventory_reservation_state.transition`. The closed edges are
`hold_prepared → held | released | expired | quarantined`; `held → terms_fenced |
released | expired | quarantined`; `terms_fenced → consumed | released |
quarantined`; and terminal destinations have no successor. `terms_fenced` has no
timer-expiry edge. It binds the exact group, terms action/effect, and outbox-fence
commitment; in the ordinary branch it binds the exact deal, obligation, action,
effect, BindingSet, and outbox-fence commitment. Release after that point requires authenticated receiver
nonacceptance/cancellation, a post-redemption Cairn fenced-non-submission proof,
or the terminal pre-redemption TermsFenceAbandonmentReceipt, never local timeout.
Consumption requires authenticated timely terms acceptance for that
same action/effect and exact copy. Preparation is an exclusive, short-lived
seller hold bound to exactly one context object but
does not bind the buyer to terms.
Every reservation transition atomically CASes its reservation head and every
member `SellerCopyLeaseStateHead` through the corresponding state edge, then
commits both exact roots in one signed receipt. A reservation head whose copy set,
lease generation, state, or root differs from any member head is invalid. The
reservation ID is derived by the seller service after it wins the shared copy CAS;
a caller-selected ID or null-predecessor shortcut cannot create exclusivity.

For an ordinary bindable offer, counter, or acceptance, seller `prepare → held`
must complete before review. The review and BindingSet bind the current held
reservation head, its transition receipt, the exact global copy-lease head root,
and the OrdinaryDealInventoryCommitment. Authority reservation rechecks and
records the same set. After a local pending gate fixes the ordinary
action/effect/outbox fence, the seller service advances `held → terms_fenced`
with every member global lease head and returns its signed receipt. Cairn may
then redeem only while that receipt and exact current fenced set revalidate. A
failure before redemption consumes the OrdinaryTermsFenceAbandonmentReceipt; a
failure after redemption but before handoff uses the outbox fenced-non-submission
receipt. Neither path claims cross-service atomicity. Handoff rechecks the same fenced set.
Receiver-confirmed acceptance
consumes it; authenticated rejection/cancellation or fenced non-submission
releases it. The checkout-only pending/readiness receipts are forbidden in this
branch. Baseline seller-namespaced inventory or copy-availability objects may
remain product evidence, but can never satisfy execution exclusivity without
this global-head chain.

```yaml
schema: cairn.checkout_inventory_pending_receipt.v0.1
checkout_group_core_ref: <ObjectRef>
checkout_group_core_hash: sha-256:<hex>
checkout_transition_template_ref: <ObjectRef>
inventory_prepared_head_ref: <hold_prepared ObjectRef>
inventory_prepared_head_hash: sha-256:<hex>
inventory_prepare_receipt_ref: <ObjectRef>
checkout_reservation_batch_core_ref: <ObjectRef>
checkout_reservation_batch_receipt_ref: <ObjectRef>
prior_group_state_head_ref: <nothing_submitted ObjectRef>
prior_group_state_head_hash: sha-256:<hex>
conditional_obligation_state_head_ref: <actual post-reservation ObjectRef>
conditional_obligation_state_head_hash: sha-256:<hex>
inventory_pending_group_commitment_hash: sha-256:<self-excluding pending-state preimage>
authority_transaction_id: <local authority/reservation transaction>
expires_at: <no later than seller prepared hold or paired authorities>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
not_claiming: [seller_hold_committed, terms_ready, terms_accepted]
```

```yaml
schema: cairn.checkout_transition_template.v0.1
principal_id: <principal>
obligation_exposure_core_ref: <ObjectRef>
obligation_exposure_core_hash: sha-256:<hex>
initial_product_state:
  deal_head: {ref: <ObjectRef>, hash: sha-256:<hex>}
  listing_heads: [{ref: <ObjectRef>, hash: sha-256:<hex>}]
  copy_availability_heads: [{ref: <ObjectRef>, hash: sha-256:<hex>}]
  seller_copy_lease_heads: [{ref: <current available ObjectRef>, hash: sha-256:<hex>}]
  inventory_reservation_predecessor_heads: [{ref: <ObjectRef>, hash: sha-256:<hex>}]
  seller_inventory_authority_head: {ref: <current active ObjectRef>, hash: sha-256:<hex>,
                                    signing_key_generation: <integer>}
  copy_ownership_registry_authority_head: {ref: <current active ObjectRef>, hash: sha-256:<hex>,
                                           signing_key_generation: <integer>}
  ask_heads: [{ref: <ObjectRef>, hash: sha-256:<hex>}]
  market_state_head: {ref: <ObjectRef>, hash: sha-256:<hex>}
  cart_state_head: {ref: <ObjectRef>, hash: sha-256:<hex>}
  terms_state_head: {ref: <ObjectRef>, hash: sha-256:<hex>}
readiness_delta_profile_hash: sha-256:<authority/reservation and conditional-
                                      obligation changes only>
required_inventory_reservation_transition:
  reservation_semantics_hash: sha-256:<seller/copies/checkout/expiry/hold semantics>
  copy_lease_before_heads_root: sha-256:<exact template available-head set>
  permitted_delta_profile_hash: sha-256:<exact predecessor→held transition;
                                        contains no guessed successor ref/hash>
terms_acceptance_delta_profile_hash: sha-256:<exact receiver-confirmed product-
                                             state and obligation transition>
issued_at: <coordinator-service time>
expires_at: <time before either ceremony authority expires>
template_hash: sha-256:<hex>
coordinator_service_signature: <Signature>
not_claiming: [principal_authority, terms_accepted, payment_ready]
```

This template is issued before either BindingSet and is acyclic: it contains only
the universal obligation core, then-current authenticated product heads, and
closed transition profiles. It contains no checkout-group state, future
obligation state, BindingSet, authorization, reservation, readiness receipt, or
terms-successor ref/hash. Readiness requires complete equality with its initial
product vector except for the one typed inventory-reservation delta committed by
`required_inventory_reservation_transition`. The readiness transaction must
verify the seller-writer prepare/commit receipt chain starts from every named
inventory predecessor and per-copy lease head and proves its exact seller/copy/
checkout/expiry-bound held
successor; Cairn cannot write that delta, select a different item, or
invent a precomputed successor hash. Any other listed-head change invalidates
both checkout authorizations rather than being normalized away.

```yaml
schema: cairn.checkout_group_core.v0.1
checkout_group_id: urn:uuid:<uuid>
principal_id: <principal>
checkout_origin: direct_terms_pending | existing_receiver_bound_obligation
cart_hash: sha-256:<hex>
terms_hash: sha-256:<hex>
seller_id: <seller>
obligation_exposure_core_ref: <cairn.obligation_exposure_core.v0.1 ObjectRef>
obligation_exposure_core_hash: sha-256:<hex>
obligation_exposure_id: sha-256:<must equal the obligation core>
terms_acceptance_proposal_hash: sha-256:<hex; direct branch only>
terms_acceptance_effect_id: sha-256:<hex; direct branch only>
existing_terms_receipt_ref: <authenticated ObjectRef; existing branch only>
existing_terms_receipt_hash: sha-256:<hex; existing branch only>
existing_receiver_bound_obligation_head_ref: <receiver_bound_ready or fulfillment_retryable ObjectRef; existing branch only>
existing_receiver_bound_obligation_head_hash: sha-256:<hex; existing branch only>
checkout_transition_template_ref: <ObjectRef; direct branch only>
checkout_transition_template_hash: sha-256:<hex; direct branch only>
inventory_prepared_head_ref: <hold_prepared ObjectRef; direct branch only>
inventory_prepared_head_hash: sha-256:<hex; direct branch only>
inventory_prepare_receipt_ref: <ObjectRef; direct branch only>
inventory_prepare_receipt_hash: sha-256:<hex; direct branch only>
payment_semantics_hash: sha-256:<exact payee/account/amount/asset/rail/obligation>
payment_effect_id: sha-256:<hex>
dependency: receiver_confirmed_terms_acceptance_before_payment_redemption |
            existing_authenticated_terms_already_receiver_bound
atomic_provider_operation_ref: null
expires_at: <time>
core_hash: sha-256:<hex>
coordinator_service_signature: <Signature>
not_claiming: [principal_authority, either_effect_submitted, provider_atomicity]
```

Paired checkout uses one pre-authority batch core so its two signed actions can
share one later economic CAS without either silently authorizing the other:

```yaml
schema: cairn.checkout_role_authority_basis_receipt.v0.1
checkout_group_core_ref: <ObjectRef>
checkout_authority_reservation_batch_core_ref: <ObjectRef>
role: terms_acceptance | conditional_payment
authority_basis_kind: supervised_one_shot | preauthorized_mandate
execution_binding_set_ref: <role's exact ObjectRef>
execution_binding_set_hash: sha-256:<hex>
lineage_commitment_ref: <role's exact ObjectRef>
lineage_commitment_hash: sha-256:<hex>
authority_ref: <ActionAuthorization iff supervised; AgentMandate iff preauthorized>
authority_hash: sha-256:<hex>
principal_confirmation_receipt_ref: <transaction ConfirmationReceipt iff supervised;
                                     mandate-issuance ConfirmationReceipt iff preauthorized>
principal_confirmation_receipt_hash: sha-256:<hex>
mandate_scope_binding_index: <integer iff preauthorized; null otherwise>
mandate_control_state_head_ref: <current active ObjectRef iff preauthorized; null otherwise>
mandate_control_state_head_hash: sha-256:<hex or null>
authority_limit_ledger_before_manifest_ref: <enumerable_transition_manifest ObjectRef>
authority_limit_ledger_before_manifest_hash: sha-256:<hex>
authority_limit_ledger_before_count: <positive integer>
accepted_transaction_semantics: [TERMS_MAY_BIND_BEFORE_PAYMENT]
authority_transaction_id: <same paired reservation transaction>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

This receipt is a closed union. The supervised branch requires the exact
one-shot ActionAuthorization and transaction confirmation and forbids every
mandate field. The preauthorized branch requires an already confirmed v0.3
mandate whose one capability and one atomic scope-binding tuple exactly match
the role, group, cart, seller, copies, payee, rail, amount, compartment, and
lineage; it uses the mandate-issuance confirmation and complete mandate count,
rate, value, fee, tax, shipping, and outstanding ledgers, and forbids a one-shot
object. Terms and payment require two independently valid role receipts even
when one mandate happens to cover an identical tuple. A generic authorization
ref cannot be interpreted as either branch.

```yaml
schema: cairn.checkout_authority_reservation_batch_core.v0.1
checkout_group_core_ref: <ObjectRef>
checkout_group_core_hash: sha-256:<hex>
checkout_transition_template_ref: <ObjectRef>
pre_reservation_compartment_state_head_ref: <ObjectRef>
pre_reservation_compartment_state_head_hash: sha-256:<hex>
subreservation_specs:
  - role: terms_acceptance | conditional_payment
    authority_basis_kind: supervised_one_shot | preauthorized_mandate
    lineage_commitment_ref: <ObjectRef>
    lineage_commitment_hash: sha-256:<hex>
    capability: <exact capability>
    obligation_exposure_id: sha-256:<same obligation>
    owned_atom_semantics_root: sha-256:<exact disjoint economic/count/one-shot roles>
required_ledger_keys_root: sha-256:<complete union needed by both roles>
issued_at: <authority-service time>
expires_at: <before either authority/quote/review expires>
core_hash: sha-256:<hex>
authority_service_signature: <Signature>
not_claiming: [principal_authority, reservation_committed, terms_submitted]
```

```yaml
schema: cairn.checkout_payment_subreservation_state_head.v0.1
payment_subreservation_key: sha-256:<batch core and conditional_payment role>
batch_core_ref: <ObjectRef>
batch_core_hash: sha-256:<hex>
payment_binding_set_ref: <ObjectRef>
payment_authority_basis_receipt_ref: <CheckoutRoleAuthorityBasisReceipt ObjectRef>
payment_authority_basis_receipt_hash: sha-256:<hex>
payment_authorization_ref: <ActionAuthorization or AgentMandate consumed into this conditional hold>
payment_lineage_commitment_ref: <still-provisional ObjectRef while conditional_held>
payment_lineage_commitment_hash: sha-256:<hex>
owned_atom_ids_root: sha-256:<conditional payment-only atoms>
reservation_fence: <monotonic integer>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null only at batch genesis>
state: conditional_held | activated | discharged | consumed |
       activated_expired | activated_revoked | activated_superseded |
       activated_fenced_non_submission
lineage_state_head_ref: <provisional; active; fenced_non_submission; or branch-exact
                         provisional_expired/provisional_superseded/provisional_cancelled ObjectRef>
lineage_state_head_hash: sha-256:<hex>
activation_or_discharge_receipt_ref: <ObjectRef or null at conditional genesis>
activation_or_discharge_receipt_hash: sha-256:<hex or null>
expires_at: <no later than payment authority>
state_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The batch is the only constructor and creates `conditional_held` while the
payment lineage remains provisional. The sole writer is
`execution.checkout_payment_subreservation_state.transition`. Its closed matrix
is `conditional_held → activated | discharged` and `activated → consumed |
activated_expired | activated_revoked | activated_superseded |
activated_fenced_non_submission`; every destination other than `activated` is
terminal. The four `activated_*` successors require
`CheckoutActivatedPaymentReleaseReceipt`; they are legal only while both payment
gate redemption and outbox handoff are provably absent, and they atomically
release the exact attempt-only holds without releasing accepted terms or the
item/mandatory obligation. Terms-successor activation
uses the typed conditional-attempt receipt and performs the one payment-lineage
activation. Expiry, revocation, or noncurrent authority uses the same receipt's
discharge branch and transitions the provisional lineage to branch-exact
`provisional_expired`, `provisional_superseded`, or `provisional_cancelled`.
Payment
redemption alone may consume an activated subreservation. No other operation can
activate, discharge, revive, or consume it.

```yaml
schema: cairn.checkout_authority_reservation_batch_receipt.v0.1
batch_core_ref: <ObjectRef>
batch_core_hash: sha-256:<hex>
terms_binding_set_ref: <ObjectRef>
payment_binding_set_ref: <ObjectRef>
terms_authority_basis_receipt_ref: <CheckoutRoleAuthorityBasisReceipt ObjectRef>
terms_authority_basis_receipt_hash: sha-256:<hex>
payment_authority_basis_receipt_ref: <CheckoutRoleAuthorityBasisReceipt ObjectRef>
payment_authority_basis_receipt_hash: sha-256:<hex>
subreservations:
  - role: terms_acceptance | conditional_payment
    reservation_ref: <ObjectRef>
    lineage_activation_receipt_ref: <ObjectRef for terms; null for conditional payment>
    payment_subreservation_state_head_ref: <conditional_held ObjectRef for payment; null for terms>
    payment_subreservation_state_head_hash: sha-256:<hex or null>
    owned_atom_ids_root: sha-256:<actual unique atoms matching its spec>
    ledger_membership_proofs_root: sha-256:<membership in complete after-head set>
compartment_before_head_ref: <same H0 as core>
compartment_before_head_hash: sha-256:<hex>
compartment_after_head_ref: <single union-delta H1 ObjectRef>
compartment_after_head_hash: sha-256:<hex>
ledger_before_heads_root: sha-256:<complete exact union>
ledger_after_heads_root: sha-256:<complete exact successors>
all_owned_atom_ids_root: sha-256:<disjoint union of the two subreservation roots>
conditional_obligation_after_head_ref: <ObjectRef>
authority_transaction_id: <one paired-authority/terms-lineage/conditional-payment/ledger/obligation CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
not_claiming: [seller_inventory_held, terms_submitted, payment_submitted]
```

Both checkout BindingSets carry the same batch-core ref/hash and the same H0.
After both branch-exact role authority-basis receipts exist, one authority
transaction consumes both one-shot or mandate authorities and their complete
role-specific ledgers into the named reservations, activates
only the terms lineage, creates the terms reservation plus the typed
`conditional_held` payment subreservation with its lineage still provisional,
CASes the exact complete union of principal/one-shot/compartment
ledgers and the obligation/group predecessors, and writes one H1. Atom ownership
is disjoint: the terms role owns the legal-obligation/count atoms; the conditional
payment role owns only its payment-attempt/count/incremental atoms and cannot
duplicate item or mandatory-component exposure. Either entire union commits or
nothing does. Each later role redeems only its named subreservation using the
receipt membership proof. There is no serial H0 fiction and no sibling delta
hidden in an individual H0→H1 receipt.

Checkout payment uses the universal `cairn.fulfillment_attempt_core.v0.1`. The
paired branch requires `origin:paired_checkout_before_terms`, the exact checkout
group core, and generation 0; an existing receiver-bound branch uses
`origin:direct_fulfillment` and the same retry rules as every other payment.

```yaml
schema: cairn.checkout_readiness_receipt.v0.1
checkout_group_core_ref: <ObjectRef>
checkout_group_core_hash: sha-256:<hex>
checkout_transition_template_ref: <ObjectRef>
checkout_transition_template_hash: sha-256:<hex>
checkout_inventory_pending_receipt_ref: <ObjectRef>
checkout_inventory_pending_receipt_hash: sha-256:<hex>
seller_inventory_held_head_ref: <current held ObjectRef>
seller_inventory_held_head_hash: sha-256:<hex>
seller_inventory_transition_receipt_ref: <commit_held ObjectRef>
seller_inventory_transition_receipt_hash: sha-256:<hex>
seller_inventory_authority_state_head_ref: <same current active ObjectRef>
seller_inventory_authority_state_head_hash: sha-256:<hex>
seller_inventory_authority_signing_key_generation: <same integer>
copy_ownership_registry_authority_state_head_ref: <same current active ObjectRef>
copy_ownership_registry_authority_state_head_hash: sha-256:<hex>
copy_ownership_registry_authority_signing_key_generation: <same integer>
fulfillment_attempt_core_ref: <ObjectRef>
fulfillment_attempt_core_hash: sha-256:<hex>
terms_authorization_ref: <ObjectRef>
payment_authorization_ref: <ObjectRef>
terms_authority_basis_receipt_ref: <same CheckoutRoleAuthorityBasisReceipt ObjectRef>
terms_authority_basis_receipt_hash: sha-256:<hex>
payment_authority_basis_receipt_ref: <same CheckoutRoleAuthorityBasisReceipt ObjectRef>
payment_authority_basis_receipt_hash: sha-256:<hex>
checkout_reservation_batch_core_ref: <ObjectRef>
checkout_reservation_batch_receipt_ref: <ObjectRef>
terms_subreservation_ref: <ObjectRef>
payment_subreservation_ref: <ObjectRef>
obligation_exposure_id: sha-256:<same exact obligation>
conditional_obligation_state_head_ref: <actual post-reservation ObjectRef>
conditional_obligation_state_head_hash: sha-256:<hex>
prior_group_state_head_ref: <exact inventory_commit_pending or inventory_hold_unknown ObjectRef>
prior_group_state_head_hash: sha-256:<hex>
ready_group_state_commitment_hash: sha-256:<precomputable ready-state fields,
                                           excluding this hash and receipt ref>
before_product_state: <exact complete template initial_product_state>
current_product_state: <all unchanged template heads plus actual held inventory-
                        reservation successor heads>
payment_attempt_generation: <integer>
state: ready_for_terms
conditional_attempt_fence: <monotonic fence installed in obligation state>
group_fencing_token: <monotonic group fence>
readiness_fencing_token: <single-consumption fence>
authority_transaction_id: <one authority/reservation/group/obligation CAS>
expires_at: <time no later than either authority/reservation>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.checkout_conditional_attempt_transition_receipt.v0.1
economic_mutation_cause_core_ref: <ObjectRef>
economic_mutation_cause_core_hash: sha-256:<hex>
checkout_group_core_ref: <ObjectRef>
checkout_group_core_hash: sha-256:<hex>
fulfillment_attempt_core_ref: <same readiness attempt ObjectRef>
fulfillment_attempt_core_hash: sha-256:<hex>
outcome: activated_for_payment | discharged_payment_unavailable
payment_subreservation_ref: <exact paired subreservation ObjectRef>
payment_subreservation_hash: sha-256:<hex>
payment_authority_ref: <ObjectRef>
payment_authority_hash: sha-256:<hex>
before_payment_subreservation_state_head_ref: <current conditional_held ObjectRef>
before_payment_subreservation_state_head_hash: sha-256:<hex>
payment_subreservation_next_state_commitment_hash: sha-256:<activated or discharged
                                                             state preimage excluding
                                                             this receipt ref/hash>
before_lineage_state_head_ref: <current ObjectRef>
before_lineage_state_head_hash: sha-256:<hex>
payment_lineage_transition_kind: activation | expiry | supersession | cancellation
payment_lineage_transition_receipt_ref: <LineageActivationReceipt or typed
                                          provisional terminal receipt ObjectRef>
payment_lineage_transition_receipt_hash: sha-256:<hex>
payment_lineage_next_state_commitment_hash: sha-256:<branch-exact successor preimage>
compartment_transition_manifest_ref: <enumerable_transition_manifest ObjectRef>
compartment_transition_manifest_hash: sha-256:<hex>
compartment_transition_count: <nonnegative integer; zero only for canonical empty delta>
resource_exposure_transition_receipt_ref: <ObjectRef or null iff empty economic delta>
resource_exposure_transition_receipt_hash: sha-256:<hex or null>
affected_limit_ledger_transition_manifest_ref: <enumerable_transition_manifest ObjectRef>
affected_limit_ledger_transition_manifest_hash: sha-256:<hex>
affected_limit_ledger_transition_count: <nonnegative integer; zero only for empty delta>
economic_atom_delta_manifest_ref: <enumerable_transition_manifest ObjectRef>
economic_atom_delta_manifest_hash: sha-256:<promote conditional/item roles or release exact holds>
economic_atom_delta_count: <nonnegative integer; zero only for empty conditional atom set>
authority_transaction_id: <same terms-successor serializable transaction>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The schema is a closed union. `activated_for_payment` consumes the exact still-
current conditional payment subreservation, activates its still-provisional
lineage exactly once, promotes the
already-held conditional component atoms, transfers the item/mandatory atoms
once, and binds every balanced compartment/resource/limit-ledger transition.
`discharged_payment_unavailable` requires the exact expiry/revocation/noncurrent
proof, terminally discharges the subreservation/lineage, releases only its
conditional component atoms, and preserves the item/mandatory obligation atoms.
No untyped reference, missing hash, partial ledger vector, or second transition
for the same attempt fence is valid.

The receipt is upstream of both successors and never contains either successor
head ref/hash. It binds precomputed next-state commitments plus the dedicated
payment `LineageActivationReceipt` or provisional-terminal receipt. The lineage
head and payment-subreservation head then point one-way to those receipts and
recompute the commitments, exactly as ordinary lineage activation does. A
reciprocal receipt↔head content-address cycle is invalid. When the conditional
atom set is canonically empty, the discharge branch carries signed empty
compartment, ledger, and atom manifests and a null resource-transition pair; it
still atomically transitions the obligation, group, subreservation, and lineage.
Nonempty economic deltas require every typed transition receipt.

```yaml
schema: cairn.checkout_payment_authority_supersession_receipt.v0.1
checkout_group_core_ref: <ObjectRef>
fulfillment_attempt_core_ref: <superseded ObjectRef>
payment_authority_basis_receipt_ref: <superseded role-basis ObjectRef>
payment_semantics_hash: sha-256:<exact superseded semantics>
supersession_reason: principal_changed_payment_semantics | policy_invalidated_attempt
principal_control_receipt_ref: <principal-signed ObjectRef iff principal cause; null otherwise>
principal_control_receipt_hash: sha-256:<hex or null>
restrictive_policy_transition_receipt_ref: <ObjectRef iff policy cause; null otherwise>
restrictive_policy_transition_receipt_hash: sha-256:<hex or null>
no_replacement_payment_authority_claimed: true
issued_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Supersession is restrictive only: it proves the old attempt may no longer be
redeemed and grants no authority for a replacement amount, rail, payee, or
attempt. A fresh checkout adoption/authorization path remains mandatory.

```yaml
schema: cairn.checkout_activated_payment_non_submission_proof.v0.1
checkout_group_core_ref: <ObjectRef>
fulfillment_attempt_core_ref: <ObjectRef>
payment_subreservation_state_head_ref: <current activated ObjectRef>
payment_subreservation_state_head_hash: sha-256:<hex>
cause: authority_time_expiry | authority_revoked | semantics_superseded |
       fenced_non_submission
payment_authority_basis_receipt_ref: <exact role-basis ObjectRef>
payment_authority_basis_receipt_hash: sha-256:<hex>
immutable_payment_authority_ref: <ActionAuthorization or AgentMandate ObjectRef>
immutable_payment_authority_hash: sha-256:<hex>
authority_expires_at: <signed authority expiry iff time-expiry; null otherwise>
authority_service_time: <authenticated time iff time-expiry; null otherwise>
restrictive_control_leaf_state_head_ref: <current action/global/mandate control ObjectRef iff revoked>
restrictive_control_leaf_state_head_hash: sha-256:<hex or null>
restrictive_control_transition_receipt_ref: <ObjectRef iff revoked; null otherwise>
restrictive_control_transition_receipt_hash: sha-256:<hex or null>
payment_authority_supersession_receipt_ref: <CheckoutPaymentAuthoritySupersessionReceipt ObjectRef iff superseded>
payment_authority_supersession_receipt_hash: sha-256:<hex or null>
fenced_non_submission_receipt_ref: <UnredeemedReleaseReceipt ObjectRef iff fenced cause>
fenced_non_submission_receipt_hash: sha-256:<hex or null>
lineage_state_head_ref: <current active ObjectRef with null outbox ref>
lineage_state_head_hash: sha-256:<hex>
action_state_head_ref: <current pre-redemption ObjectRef>
action_state_head_hash: sha-256:<hex>
authority_reservation_ref: <current unredeemed ObjectRef>
authority_reservation_hash: sha-256:<hex>
authority_limit_ledger_current_manifest_ref: <enumerable_transition_manifest ObjectRef>
authority_limit_ledger_current_manifest_hash: sha-256:<hex>
authority_limit_ledger_current_count: <exact role-basis count>
reservation_membership_map_ref: <current enumerable reservation map ObjectRef>
reservation_membership_map_hash: sha-256:<hex>
reservation_membership_proof_hash: sha-256:<exact active fence/atom membership>
redemption_fence_ledger_head_ref: <current unconsumed ObjectRef>
redemption_fence_ledger_head_hash: sha-256:<hex>
unconsumed_redemption_fence_proof_hash: sha-256:<exact fence nonconsumption>
effect_lease_nonmembership_proof_hash: sha-256:<authority-signed uniqueness proof>
outbox_nonmembership_proof_hash: sha-256:<authority-signed uniqueness proof>
expected_release_transaction_id: <same later release CAS>
proved_at: <authority-service time>
proof_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

This proof is a transaction-bound negative assertion, not a cached database
query. Its issuer is the sole reservation/redemption coordinator and it is valid
only when the same serializable release transaction CASes every named current
head, consumes the unredeemed reservation fence into its terminal release, and
finds the lineage's outbox ref still null. Any successful redemption atomically
changes those predicates, so the proof loses the race. An absent ObjectRef or a
standalone “not found” response is not evidence. Its cause fields are an exact
oneOf: expiry uses the immutable authority's signed deadline plus authenticated
service time; revocation uses the current restrictive control leaf and receipt;
supersession uses the typed restrictive supersession receipt; and fenced
non-submission uses the ordinary unredeemed release receipt. All nonmatching
cause fields are null. There is no mutable ActionAuthorization state family.

```yaml
schema: cairn.checkout_activated_payment_release_receipt.v0.1
economic_mutation_cause_core_ref: <ObjectRef>
economic_mutation_cause_core_hash: sha-256:<hex>
checkout_group_core_ref: <ObjectRef>
fulfillment_attempt_core_ref: <ObjectRef>
payment_subreservation_before_head_ref: <current activated ObjectRef>
payment_subreservation_before_head_hash: sha-256:<hex>
cause: authority_time_expiry | authority_revoked | semantics_superseded |
       fenced_non_submission
no_payment_gate_or_handoff_proof_ref: <CheckoutActivatedPaymentNonSubmissionProof ObjectRef>
no_payment_gate_or_handoff_proof_hash: sha-256:<hex>
lineage_release_receipt_ref: <UnredeemedReleaseReceipt ObjectRef producing active→fenced_non_submission>
lineage_release_receipt_hash: sha-256:<hex>
payment_subreservation_next_state_commitment_hash: sha-256:<branch-exact terminal preimage>
group_before_head_ref: <current payment-eligible ObjectRef>
group_before_head_hash: sha-256:<hex>
group_next_state_commitment_hash: sha-256:<payment-blocked or superseded preimage>
obligation_before_head_ref: <current ObjectRef>
obligation_before_head_hash: sha-256:<hex>
obligation_next_state_commitment_hash: sha-256:<same accepted obligation with
                                                only attempt holds released>
compartment_transition_manifest_ref: <typed enumerable manifest or canonical empty>
compartment_transition_manifest_hash: sha-256:<hex>
resource_exposure_transition_receipt_ref: <ObjectRef or null iff empty delta>
resource_exposure_transition_receipt_hash: sha-256:<hex or null>
limit_ledger_transition_manifest_ref: <typed enumerable manifest or canonical empty>
limit_ledger_transition_manifest_hash: sha-256:<hex>
economic_atom_delta_manifest_ref: <typed enumerable manifest or canonical empty>
economic_atom_delta_manifest_hash: sha-256:<hex>
authority_transaction_id: <one release/group/obligation/lineage/economic CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

This receipt is valid only before payment GateResult redemption and outbox claim.
It releases the activated attempt's exact payment-only holds while preserving
accepted terms, consumed seller inventory, item/mandatory exposure, and every
receiver obligation. Authority expiry/revocation enters the payment-blocked path;
changed payment semantics enters superseded; proved non-submission follows its
ordinary retry rule. If handoff is ambiguous or receiver state is unknown, no
release edge is legal and exposure remains held for reconciliation.
Every `activated_*` payment-subreservation successor carries the exact
`fenced_non_submission` lineage head and UnredeemedReleaseReceipt. The
subreservation branch name records why its payment holds were released; it does
not imply a second or nonexistent lineage terminal family.

```yaml
schema: cairn.checkout_preconsume_terms_reversal_receipt.v0.1
checkout_group_core_ref: <ObjectRef>
authenticated_terms_reversal_event_ref: <strictly newer receiver ObjectRef>
authenticated_terms_reversal_event_hash: sha-256:<hex>
before_group_state_head_ref: <current terms_confirmed_inventory_pending ObjectRef>
before_group_state_head_hash: sha-256:<hex>
before_obligation_head_ref: <current receiver_bound_inventory_pending ObjectRef>
before_obligation_head_hash: sha-256:<hex>
current_seller_terms_fenced_head_ref: <current ObjectRef>
current_seller_terms_fenced_head_hash: sha-256:<hex>
seller_nonconsumption_proof_ref: <seller-signed current-head proof ObjectRef>
seller_nonconsumption_proof_hash: sha-256:<hex>
conditional_attempt_discharge_receipt_ref: <branch-exact ObjectRef>
conditional_attempt_discharge_receipt_hash: sha-256:<hex>
group_next_state_commitment_hash: sha-256:<terms_reversal_inventory_release_pending preimage>
obligation_next_state_commitment_hash: sha-256:<receiver_reversal_inventory_release_pending preimage>
economic_transition_manifest_ref: <exact release of conditional payment-only holds>
economic_transition_manifest_hash: sha-256:<hex>
seller_release_request_digest: sha-256:<group/reversal/current fenced head>
authority_transaction_id: <one local group/obligation/attempt/economic CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

```yaml
schema: cairn.checkout_preconsume_inventory_release_completion_receipt.v0.1
checkout_group_core_ref: <ObjectRef>
preconsume_terms_reversal_receipt_ref: <ObjectRef>
preconsume_terms_reversal_receipt_hash: sha-256:<hex>
seller_terms_fenced_before_head_ref: <same fenced ObjectRef>
seller_terms_fenced_before_head_hash: sha-256:<hex>
seller_released_after_head_ref: <current released InventoryReservationStateHead ObjectRef>
seller_released_after_head_hash: sha-256:<hex>
seller_copy_after_heads_root: sha-256:<all available for ordinary or draining
                                      release, or all quarantined for restrictive recovery>
release_authority_kind: ordinary_seller | draining_cleanup | restrictive_recovery
seller_inventory_drain_begin_receipt_ref: <ObjectRef iff draining cleanup>
seller_inventory_drain_begin_receipt_hash: sha-256:<hex or null>
copy_registry_drain_begin_receipt_ref: <ObjectRef iff copy basis draining cleanup>
copy_registry_drain_begin_receipt_hash: sha-256:<hex or null>
restrictive_recovery_authorization_ref: <ObjectRef iff restrictive recovery>
restrictive_recovery_authorization_hash: sha-256:<hex or null>
seller_inventory_release_receipt_ref: <release | drain_cleanup_release |
                                       restrictive_recovery_release ObjectRef>
seller_inventory_release_receipt_hash: sha-256:<hex>
seller_transaction_id: <independent seller or recovery transaction>
seller_inventory_authority_basis_head_ref: <exact head used by release receipt>
seller_inventory_authority_basis_head_hash: sha-256:<hex>
seller_inventory_authority_basis_generation: <integer>
copy_registry_authority_basis_head_ref: <exact head used by copy receipts>
copy_registry_authority_basis_head_hash: sha-256:<hex>
copy_registry_authority_basis_generation: <integer>
seller_inventory_authority_current_head_ref: <current lifecycle ObjectRef at local completion>
seller_inventory_authority_current_head_hash: sha-256:<hex>
copy_registry_authority_current_head_ref: <current lifecycle ObjectRef at local completion>
copy_registry_authority_current_head_hash: sha-256:<hex>
seller_authority_transition_history_head_ref: <complete current history ObjectRef>
seller_authority_transition_history_head_hash: sha-256:<hex>
copy_authority_transition_history_head_ref: <complete current history ObjectRef>
copy_authority_transition_history_head_hash: sha-256:<hex>
before_group_state_head_ref: <terms_reversal_inventory_release_pending ObjectRef>
before_group_state_head_hash: sha-256:<hex>
before_obligation_head_ref: <receiver_reversal_inventory_release_pending ObjectRef>
before_obligation_head_hash: sha-256:<hex>
group_next_state_commitment_hash: sha-256:<terms_reversed pre-consume branch>
obligation_next_state_commitment_hash: sha-256:<reversed/released pre-consume branch>
compartment_transition_manifest_ref: <complete release manifest>
compartment_transition_manifest_hash: sha-256:<hex>
resource_exposure_transition_receipt_ref: <ObjectRef>
resource_exposure_transition_receipt_hash: sha-256:<hex>
limit_ledger_transition_manifest_ref: <complete manifest>
limit_ledger_transition_manifest_hash: sha-256:<hex>
economic_atom_delta_manifest_ref: <exact remaining item/mandatory release>
economic_atom_delta_manifest_hash: sha-256:<hex>
authority_transaction_id: <one local group/obligation/economic completion CAS>
committed_at: <authority-service time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

Authenticated reversal before seller consumption is deliberately a two-owner
saga. Cairn first discharges only payment-attempt holds and enters the two
release-pending states while preserving item/mandatory exposure and the seller's
`terms_fenced` truth. An ordinary active seller service may then use the first
receipt as its receiver-disposition proof for signed reservation release and copy
`terms_fenced → available`. The same release-to-available result is valid under
draining cleanup only when the terms handoff predates the exact drain-begin
receipt and every draining role co-signs. If a bound commerce authority became restrictive,
the exact preauthorized recovery branch may instead release the reservation while
moving every copy `terms_fenced → quarantined`; it cannot relist them. Cairn
consumes that independent ordinary/draining/recovery receipt in the completion CAS and
only then enters released `terms_reversed`/`reversed`. A missing valid response
remains visibly pending and conservatively held; neither side invents
cross-owner rollback.

```yaml
schema: cairn.checkout_terms_successor_receipt.v0.1
checkout_group_core_ref: <ObjectRef>
checkout_group_core_hash: sha-256:<hex>
checkout_transition_template_ref: <same ObjectRef as readiness>
checkout_transition_template_hash: sha-256:<hex>
checkout_readiness_receipt_ref: <ObjectRef>
checkout_readiness_receipt_hash: sha-256:<hex>
terms_confirmation_receipt_ref: <authenticated ObjectRef>
terms_confirmation_receipt_hash: sha-256:<hex>
seller_inventory_terms_fenced_head_ref: <exact pre-consume terms_fenced ObjectRef>
seller_inventory_terms_fenced_head_hash: sha-256:<hex>
seller_inventory_terms_fence_receipt_ref: <fence_terms ObjectRef>
seller_inventory_terms_fence_receipt_hash: sha-256:<hex>
seller_inventory_consumed_head_ref: <current consumed ObjectRef>
seller_inventory_consumed_head_hash: sha-256:<hex>
seller_inventory_consume_receipt_ref: <consume | drain_cleanup_consume |
                                       restrictive_recovery_consume ObjectRef>
seller_inventory_consume_receipt_hash: sha-256:<hex>
seller_inventory_consume_transaction_id: <exact independent seller_transaction_id>
inventory_transition_authority_kind: ordinary_seller | draining_cleanup | restrictive_recovery
seller_inventory_drain_begin_receipt_ref: <ObjectRef iff seller basis draining cleanup>
seller_inventory_drain_begin_receipt_hash: sha-256:<hex or null>
copy_registry_drain_begin_receipt_ref: <ObjectRef iff copy basis draining cleanup>
copy_registry_drain_begin_receipt_hash: sha-256:<hex or null>
restrictive_recovery_authorization_ref: <ObjectRef iff restrictive recovery>
restrictive_recovery_authorization_hash: sha-256:<hex or null>
seller_inventory_authority_basis_head_ref: <exact active/draining/recovery ObjectRef
                                              valid when seller consume committed>
seller_inventory_authority_basis_head_hash: sha-256:<hex>
seller_inventory_authority_basis_generation: <integer>
copy_ownership_registry_authority_basis_head_ref: <exact active/draining/recovery
                                                   ObjectRef valid at copy commit>
copy_ownership_registry_authority_basis_head_hash: sha-256:<hex>
copy_ownership_registry_authority_basis_generation: <integer>
seller_inventory_authority_current_head_ref: <current lifecycle ObjectRef at Cairn settlement>
seller_inventory_authority_current_head_hash: sha-256:<hex>
copy_ownership_registry_authority_current_head_ref: <current lifecycle ObjectRef at Cairn settlement>
copy_ownership_registry_authority_current_head_hash: sha-256:<hex>
seller_authority_transition_history_head_ref: <complete current history ObjectRef>
seller_authority_transition_history_head_hash: sha-256:<hex>
copy_authority_transition_history_head_ref: <complete current history ObjectRef>
copy_authority_transition_history_head_hash: sha-256:<hex>
readiness_product_state: <exact readiness current_product_state>
before_product_state: <complete receiver-confirmed accepted vector with current terms_fenced inventory>
after_product_state: <same accepted vector with only exact consumed inventory successor>
before_group_state_head_ref: <current terms_confirmed_inventory_pending ObjectRef>
before_group_state_head_hash: sha-256:<hex>
after_group_state_head_ref: <authenticated exact successor ObjectRef>
after_group_state_head_hash: sha-256:<hex>
before_obligation_head_ref: <current receiver_bound_inventory_pending head created from exact terms receipt>
before_obligation_head_hash: sha-256:<hex>
after_obligation_head_ref: <ObjectRef>
after_obligation_head_hash: sha-256:<hex>
fulfillment_attempt_core_ref: <same exact readiness attempt>
fulfillment_attempt_core_hash: sha-256:<hex>
terms_acceptance_delta_profile_hash: sha-256:<must equal template/payment BindingSet>
outcome: payment_ready | payment_blocked
payment_authority_and_reservation_current: true | false
attempt_disposition: activated_for_payment | discharged_payment_unavailable
conditional_attempt_transition_receipt_ref: <exact ObjectRef matching disposition>
conditional_attempt_transition_receipt_hash: sha-256:<hex>
successor_idempotency_key: sha-256:<group/terms receipt/seller consume receipt/attempt fence>
authority_transaction_id: <one deal/obligation/group/attempt CAS>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
```

The successor profile permits only the exact receiver-confirmed acceptance delta
for the pre-bound deal, listings, copy availability, inventory reservations, ask,
market, cart, and terms plus the obligation/attempt transition specified here.
The payment BindingSet signs the template and profile, not a guessed future head.
The readiness receipt binds the actual conditional post-reservation predecessors;
the successor receipt must prove the intervening seller-only `held → terms_fenced`
receipt, the exact readiness→accepted product delta, and the later seller-only
`terms_fenced → consumed` receipt. Its before-product vector is the accepted,
pre-consume state already represented by the current pending group; its after
vector differs only by that consumed seller successor. The authenticated
acceptance first moves the conditional obligation to
`receiver_bound_inventory_pending` and
the group to `terms_confirmed_inventory_pending` without making payment eligible.
The successor receipt is emitted only
after the group records authenticated acceptance in
`terms_confirmed_inventory_pending`; Cairn never writes the seller heads.
Payment gate/redemption/handoff require the successor receipt and every one of its
still-current product/obligation/inventory after-heads. The inventory authority
bases need not still be current: each MUST have been valid for its exact branch
when the external CAS committed, and the receipt must bind the complete
consecutive lifecycle history from that basis to the current authority head at
local settlement. A missing/skipped/forked history edge, basis that was already
non-admissible at inventory commit, or canonical inventory head no longer equal
to the consumed successor fails. This is the sole allowed role-specific successor; an
unlisted or independently changed product/obligation head invalidates payment.
The seller consume receipt is a pre-existing, independently committed saga input
with its own `seller_transaction_id`; Cairn never claims cross-owner atomicity.
When that input uses draining cleanup, the terms handoff must predate the exact
drain-begin receipt; when it uses restrictive recovery, it must be
`finalize_consumed`. Both bind the same later authenticated acceptance and exact
fenced predecessor set. The checkout successor MUST choose `payment_blocked` and
discharge the old conditional payment attempt for either non-active basis or any
basis that is no longer the exact current active head: a
cleanup receipt settles the already-bound inventory obligation but never creates
new payment eligibility under a draining or compromised dependency. A later
payment requires fresh human authority and a fresh trust-valid active chain.
After that receipt is visible, the stable successor idempotency key admits one
restart-safe Cairn CAS. The conditional-attempt transition receipt, Cairn group/
obligation successors, resource-exposure receipt, compartment and complete
limit-ledger vectors share the Cairn `authority_transaction_id` and become
visible together. A crash after seller consumption but before this CAS leaves the
group truthfully inventory-pending; replay with the same seller receipt/key
commits or returns the original Cairn result. Restart derives the exact promoted/
released atom set only from these signed objects; no auxiliary attempt table is
authoritative.

The same historical-basis rule applies whenever Cairn imports an independently
committed terminal inventory receipt for checkout or an ordinary deal, including
pre-consume reversal completion. Historical validation records external truth and
may discharge/quarantine already-held exposure; it cannot authorize a new gate,
payment, listing, prepare, terms handoff, or ownership transfer. Clean rotation
uses consecutive signed history. Retirement, emergency revocation or quarantine
may still permit truthful local terminal recording, but the affected trust stays
restrictive and every new-value path denies.

```yaml
schema: cairn.checkout_existing_obligation_adoption_receipt.v0.1
checkout_group_core_ref: <ObjectRef>
obligation_exposure_core_ref: <same ObjectRef as group>
receiver_bound_obligation_state_head_ref: <current receiver_bound_ready or fulfillment_retryable ObjectRef>
receiver_bound_obligation_state_head_hash: sha-256:<hex>
prior_failure_or_non_submission_receipt_ref: <ObjectRef or null; required for fulfillment_retryable>
authenticated_terms_receipt_ref: <same exact receipt as group>
authenticated_terms_receipt_hash: sha-256:<hex>
current_accepted_product_state: <complete authenticated deal/listing/copy-
                                 availability/inventory/ask/market/cart/terms vector>
state: terms_confirmed_payment_not_started
fencing_token: <monotonic integer>
expires_at: <time>
receipt_hash: sha-256:<hex>
authority_service_signature: <Signature>
not_claiming: [new_terms_acceptance, payment_submitted]
```

```yaml
schema: cairn.checkout_group_state_head.v0.1
checkout_group_core_ref: <ObjectRef>
checkout_group_core_hash: sha-256:<hex>
current_fulfillment_attempt_core_ref: <ObjectRef or null>
current_fulfillment_attempt_generation: <integer or null>
sequence: <monotonic integer>
previous_state_hash: sha-256:<hex or null>
state: nothing_submitted | inventory_commit_pending | inventory_hold_unknown |
       inventory_failed_before_terms | ready_for_terms | terms_fence_pending |
       terms_dispatching | terms_unknown | terms_confirmed_inventory_pending |
       terms_reversal_inventory_release_pending |
       terms_unknown_payment_unavailable |
       terms_failed | terms_cancelled | terms_reversed |
       terms_confirmed_payment_not_started | payment_dispatching |
       payment_unknown | payment_failed_after_terms |
       paired_authority_expired | payment_blocked_after_terms |
       payment_reauthorization_pending | payment_semantics_superseded | complete
checkout_readiness_receipt_ref: <ObjectRef or null>
readiness_transaction_id: <same readiness receipt transaction or null>
ready_group_state_commitment_hash: sha-256:<same receipt commitment or null>
checkout_inventory_pending_receipt_ref: <ObjectRef or null>
inventory_pending_transaction_id: <same pending receipt transaction or null>
inventory_pending_group_commitment_hash: sha-256:<same pending commitment or null>
last_observed_seller_inventory_state_head_ref: <ObjectRef or null>
last_observed_seller_inventory_transition_receipt_ref: <ObjectRef or null>
seller_inventory_terms_fence_receipt_ref: <ObjectRef or null>
seller_inventory_consumption_receipt_ref: <ObjectRef or null>
preconsume_terms_reversal_receipt_ref: <ObjectRef or null unless reversal release pending/later>
preconsume_inventory_release_completion_receipt_ref: <ObjectRef or null unless completed preconsume reversal>
terms_fence_claim_state_head_ref: <ObjectRef or null before terms_fence_pending>
terms_fence_abandonment_receipt_ref: <ObjectRef or null>
existing_obligation_adoption_receipt_ref: <ObjectRef or null>
terms_authorization_ref: <ObjectRef or null until ready_for_terms>
payment_authorization_ref: <ObjectRef or null until ready_for_terms>
terms_confirmation_receipt_ref: <authenticated ObjectRef or null>
payment_receipt_ref: <authenticated ObjectRef or null>
updated_at: <authority-service time>
state_hash: sha-256:<hex>
coordinator_service_signature: <Signature>
```

For a direct origin, `inventory_commit_pending` and later states retain the exact
inventory-pending receipt/transaction/commitment. `inventory_hold_unknown` keeps
all local and seller-prepared holds; `inventory_failed_before_terms` requires an
exact seller failure/expiry/release receipt plus local conditional discharge.
`ready_for_terms` and every later direct-branch state additionally require
the exact readiness receipt ref, transaction ID, ready-state commitment, and
the complete seller transition chain. `ready_for_terms` has current seller
`held`; `terms_fence_pending` may still have `held`; `terms_dispatching`,
`terms_unknown`, `terms_confirmed_inventory_pending`, and
`terms_reversal_inventory_release_pending` require current
`terms_fenced`; every payment-eligible or payment-later state requires current
`consumed`. A pre-acceptance `terms_failed`, `terms_cancelled`, or
`paired_authority_expired` state requires the seller's exact released/expired
head plus receiver nonacceptance/cancellation, post-redemption fenced-non-
submission, or pre-redemption claim-abandonment proof;
`terms_reversed` retains consumed inventory for a post-consume reversal because
history is not rolled back, or retains the exact seller-released head/receipt for
a completed pre-consume reversal. The two branches cannot be conflated.
The named last-observed seller head matches the latest retained transition
receipt; every gate/group transition separately resolves and verifies the actual
current seller head, so a cross-service advance can never be hidden by the local
projection. The genesis `nothing_submitted` head requires all saga/
readiness fields null. The independently precomputable
`cairn.checkout_ready_group_state_commitment_preimage.v0.1` is canonical JCS of
every field in the complete would-be `CheckoutGroupStateHead` with
`state:"ready_for_terms"`, excluding only `checkout_readiness_receipt_ref`,
`ready_group_state_commitment_hash`, `state_hash`, and signature. Thus the pending
receipt/transaction/commitment and held seller head/receipt are necessarily in
the commitment. An existing-obligation origin instead requires the adoption receipt
and forbids all readiness fields for its entire branch.

The pending group commitment is computed with the same one-way construction over
the `inventory_commit_pending` head, excluding
`checkout_inventory_pending_receipt_ref`, its own commitment field, state hash,
and signature. That head points to CheckoutInventoryPendingReceipt; the receipt
contains only the prior `nothing_submitted` head and pending-state commitment,
never the pending after-head ref/hash.

v0.1 has no atomic-provider exception: `atomic_provider_operation_ref` MUST be
null. Readiness is a closed staged saga, not a fictitious cross-owner transaction:

1. the seller inventory service creates `hold_prepared` from the template's exact
   availability predecessors and returns its signed prepare receipt;
2. after the supervised ceremony or already-confirmed mandate compilation, the
   Cairn authority transaction verifies that current prepared head, consumes the
   two exact role authority-basis receipts through the single
   CheckoutAuthorityReservationBatchReceipt, creates its disjoint terms/payment
   subreservations and common H0→H1 ledger transition, CASes
   `nothing_submitted → inventory_commit_pending`, and emits
   CheckoutInventoryPendingReceipt; it cannot redeem terms;
3. the seller service alone CASes `hold_prepared → held`, binding the exact group
   and pending receipt, and returns InventoryReservationTransitionReceipt;
4. Cairn verifies the still-current held head/receipt plus every local authority,
   computes the ready-group state commitment, signs CheckoutReadinessReceipt over
   the current `inventory_commit_pending` or reconciled
   `inventory_hold_unknown` group and actual obligation/product/seller
   successors, and writes
   `ready_for_terms` in one local transaction.

A missing/ambiguous seller commit enters `inventory_hold_unknown` and preserves
both local conditional and seller-prepared holds while adapter reconciliation
continues. Authenticated seller failure/release/expiry drives
`inventory_failed_before_terms`, atomically discharges local conditional holds,
and forbids terms. If seller `held` commits but the final Cairn readiness CAS
fails, the group stays/enters unknown; the seller hold releases only through its
own signed transition after proof that no terms handoff occurred, or expires under
its seller deadline. Thus neither side invents rollback or leaves a permanent
orphan.

The readiness
receipt MUST NOT contain the ready-group head ref/hash; the conditional obligation
head MUST NOT reference the readiness receipt. The ready head recomputes its
commitment while excluding `checkout_readiness_receipt_ref`,
`ready_group_state_commitment_hash`, `state_hash`, and signature. Terms
GateRequest/Result first CAS `ready_for_terms → terms_fence_pending`; this has no
outbox and cannot bind the buyer. The seller service then exclusively CASes
`held → terms_fenced` against the exact group, terms action/effect and single-use
outbox-fence commitment plus pending claim. Only after Cairn verifies that current signed head and
receipt may redemption atomically consume its local fence, create the outbox/
lease, advance the claim to `redeemed`, and CAS `terms_fence_pending →
terms_dispatching`. If local redemption cannot commit, the authority service may
instead terminalize the still-pending claim and issue TermsFenceAbandonmentReceipt;
the seller fence releases from that exact proof. After redemption, only the
ordinary outbox fenced-non-submission or receiver disposition applies; while
receiver outcome is unknown the fence has no timer release.
Expiry or revocation before the redemption CAS blocks terms, so checkout cannot
bind the buyer and only later discover that payment authority or the exact copy
disappeared.

That path is only `direct_terms_pending`. For
`existing_receiver_bound_obligation`, issuance verifies the exact current
accepted, unfulfilled obligation head (`receiver_bound_ready` or
`fulfillment_retryable`) and authenticated terms receipt, emits the adoption
receipt, and creates the group directly in
`terms_confirmed_payment_not_started`. Terms proposal/effect/authorization/
reservation/readiness fields are forbidden, the existing receipt is installed as
`terms_confirmation_receipt_ref`, and only a fresh payment authorization plus a
direct universal fulfillment attempt may proceed. Replaying or synthesizing a
second terms acceptance denies. The direct branch qualifies by proving the group
terms effect through CheckoutTermsSuccessorReceipt. The adoption branch qualifies
instead by exact equality among the prior authenticated terms receipt, universal
obligation core/current accepted-unfulfilled head, any required prior definitive
failure/non-submission receipt, and the complete current accepted product-state
vector; it MUST NOT claim or require a new group terms
effect.

The checkout core does not invent a second exposure identity: its exact
`ObligationExposureCore` and `obligation_exposure_id` are the universal objects
used by negotiation and fulfillment. Terms reserve the full legal/economic
obligation once. The paired pre-terms payment reservation is a conditional,
non-item-transfer fulfillment fence, not a second item-price debit; exact
incremental components may be held against outstanding limits but are not spent.
Receiver-confirmed terms atomically changes the conditional obligation to
`receiver_bound_inventory_pending` and the group to
`terms_confirmed_inventory_pending`; it preserves the conditional holds and does
not debit the item or unlock payment. Only the later seller-signed
`terms_fenced → consumed` transition plus CheckoutTermsSuccessorReceipt may
promote those same component IDs to `fulfillment_locked`, install the item fence,
and debit item price plus mandatory components once. If payment authority is no
longer current, that successor instead discharges the conditional payment attempt
and enters the typed payment-blocked state while preserving accepted terms.
Unknown, failure, cancellation, reversal, and
paired-authority expiry follow a closed transition table driven by authenticated
finality events and never release the obligation early.

Terms redeem first. Payment/funding redemption is ineligible until the
current signed group head is `terms_confirmed_payment_not_started` and its exact
authenticated qualification is current. For a direct origin, the successor
receipt confirms the group terms effect and its complete product-state vector.
For an adopted origin, the adoption receipt proves the unchanged earlier terms
receipt, receiver-bound obligation, and complete accepted product-state vector;
no group terms effect exists. The payment binding set and ActionAuthorization carry the
core ref/hash, current fulfillment-attempt ref/hash, and `checkout_role:payment`;
GateRequest, GateResult, redemption, and action receipt additionally carry and
recheck the current group head and terms receipt. Direct execution without them
denies. The terms branch carries the same group core with
`checkout_role:terms_acceptance` and the readiness receipt names conditional
fulfillment attempt 0; that branch is forbidden for an existing receiver-bound
origin.

Unknown or failed payment preserves the accepted-terms receipt, exposure, and
reconciliation duties; Cairn never rolls history back or labels the group
complete. A changed cart, seller, terms, receiver, payee, rail, or amount
invalidates both authorizations and the stable core. Within one checkout group,
every retry keeps the identical authenticated incremental-component set, exact
amount, payment-semantics hash, and effect. A newly required authenticated rail/
tax/shipping/reversal component—even within the obligation core's maximum—cannot
be inserted into that group. Definitive non-submission first moves the old group
to payment-terminal `payment_semantics_superseded`, releases only its obsolete payment-
attempt reservation, and preserves the accepted obligation and consumed seller
inventory. The user or a still-valid bounded mandate then authorizes the exact
new amount in a fresh `existing_receiver_bound_obligation` checkout group and
adoption receipt; terms are not accepted twice. If the new component exceeds the
obligation core's maximum, new economic terms and receiver acceptance are
required. An ambiguous prior payment can never use this path. A refreshed payment
proposal with identical payment semantics/effect uses a new attempt core only
under the retry rule below. A future atomic provider profile
would require one serializable group-level redemption of both authority chains
before one outbox call and one receiver receipt bound to both effects; it is out
of scope here.

The group genesis is discriminated: a direct origin starts `nothing_submitted`;
an existing receiver-bound origin starts
`terms_confirmed_payment_not_started` only with the adoption receipt and matching
universal obligation head. The later transition table is closed:
`nothing_submitted → inventory_commit_pending | paired_authority_expired`;
`inventory_commit_pending → ready_for_terms | inventory_hold_unknown |
inventory_failed_before_terms | paired_authority_expired`;
`inventory_hold_unknown → ready_for_terms | inventory_failed_before_terms |
paired_authority_expired` only from a strictly newer authenticated seller state;
`inventory_failed_before_terms` is terminal; `ready_for_terms → terms_fence_pending |
paired_authority_expired`; `terms_fence_pending → terms_dispatching |
inventory_failed_before_terms | paired_authority_expired` only from the current
seller fence or a proved pre-handoff failure; `terms_dispatching → terms_unknown |
terms_unknown_payment_unavailable | terms_failed | terms_cancelled |
terms_confirmed_inventory_pending`; `terms_confirmed_inventory_pending →
terms_confirmed_payment_not_started | payment_blocked_after_terms` only after the
current seller `consumed` head/receipt and CheckoutTermsSuccessorReceipt are
installed. From `terms_confirmed_inventory_pending`, a later authenticated
terms reversal instead enters `terms_reversal_inventory_release_pending` with
CheckoutPreconsumeTermsReversalReceipt; only the later seller release plus
CheckoutPreconsumeInventoryReleaseCompletionReceipt reaches `terms_reversed`.
From a post-consume confirmation/payment state, a later authenticated terms
reversal moves the group to `terms_reversed` in one transaction with its exact
obligation/compartment successor. An unfulfilled or reversal-outstanding
obligation moves to `reversed` with every conservative atom preserved/
reclassified. If the
obligation had already reached irreversible `fulfilled`, the unexpected reversal
moves it only to `quarantined`, installs explicit quarantine atoms (over-limit is
allowed only on the frozen head), and freezes the compartment for reconciliation;
`fulfilled → reversed` is forbidden. Seller inventory remains consumed and any
future relisting uses a new ownership/listing generation. No group-only reversal
can commit. `terms_reversal_inventory_release_pending → terms_reversed` has only
the seller-release completion edge above and otherwise remains pending or enters
coordinator quarantine. `terms_confirmed_payment_not_started → payment_dispatching |
payment_blocked_after_terms | payment_semantics_superseded`; either latter edge
from an already `activated` payment subreservation requires the matching
CheckoutActivatedPaymentReleaseReceipt and its group/obligation/economic CAS;
`payment_dispatching → payment_unknown |
payment_failed_after_terms | complete`; `terms_unknown → terms_failed |
terms_cancelled | terms_confirmed_inventory_pending`; `terms_unknown →
terms_unknown_payment_unavailable`
when payment authority/reservation expires and the conditional attempt is
atomically discharged; `terms_unknown_payment_unavailable → terms_failed |
terms_cancelled | terms_confirmed_inventory_pending`; `payment_unknown → payment_failed_after_terms |
complete`; `payment_blocked_after_terms | payment_failed_after_terms →
payment_reauthorization_pending | payment_semantics_superseded`; and
`payment_reauthorization_pending →
terms_confirmed_payment_not_started`. Unknown advances only from a strictly newer
authenticated event under the bound finality profile. `terms_unknown` can enter
`terms_confirmed_inventory_pending` only when the same CAS installs the exact
authenticated matching `terms_confirmation_receipt_ref`, advances the obligation
to `receiver_bound_inventory_pending`, and preserves the seller `terms_fenced`
head. The same
rule applies from `terms_unknown_payment_unavailable`; without receiver-confirmed
terms it may only reach a receiver-confirmed failure/cancellation or remain
unknown. No payment state is reachable until the seller consume chain and
successor receipt commit.

`payment_blocked_after_terms` or provider-confirmed/fenced-non-submission
`payment_failed_after_terms` may move to `payment_reauthorization_pending`. A
fresh payment proposal, binding set, ActionAuthorization, confirmation, and
fulfillment reservation create the next signed universal FulfillmentAttemptCore
generation and must
bind the same group core, payment semantics/effect, obligation exposure ID, item-
transfer fence, and component root plus the prior confirmed failure/non-submission
receipt. Their atomic readiness CAS installs that attempt ref/generation in both
group and obligation heads and returns to
`terms_confirmed_payment_not_started` without reaccepting terms or releasing/
double-counting the original obligation. An ambiguous prior payment never enters
this retry path. If any payment semantic or component changes, this same-group
edge is forbidden and the terminal supersession/new-adoption path above is the
only route. No backward edge exists.

## 11. Transport and operations

The execution registry is a content-addressed **overlay**, not a replacement or
copy of the frozen proposal registry. Its manifest pins the exact proposal bundle
and registry hashes as dependencies and contains only execution-resource
operations. Every name is execution-namespaced; slash shorthand is forbidden:

```text
execution.capabilities.get
execution.base_object.get
execution.execution_resource_bounds_profile.get
execution.transition_manifest.get
execution.economic_mutation_cause_core.get
execution.economic_atom_delta_entry.get
execution.current_reservation_index_entry.get
execution.current_economic_atom.get
execution.confirmed_economic_event_entry.get
execution.authority_limit_ledger_event_entry.get
execution.enumerable_map.get
execution.enumerable_map.scan
execution.receiver_scope_selection_proof.import
execution.receiver_scope_selection_proof.get
execution.data_grant.issue
execution.data_grant.get
execution.data_grant.pause
execution.data_grant.resume
execution.data_grant.revoke
execution.data_grant.expire
execution.data_grant_state.get
execution.data_grant_state.transition
execution.data_grant_state_transition_receipt.get
execution.data_grant_read.commit
execution.data_grant_read_receipt.get
execution.data_grant_response_handoff_marker.get
execution.disclosure_authorization.issue
execution.disclosure_authorization.get
execution.disclosure_authorization.revoke
execution.disclosure_authorization.expire
execution.disclosure_authorization_state.get
execution.disclosure_authorization_state.transition
execution.disclosure_reservation.hold
execution.disclosure_reservation.get
execution.disclosure_reservation.release
execution.disclosure_reservation.expire
execution.disclosure_reservation_state.transition
execution.disclosure.deliver
execution.disclosure_receipt.get
execution.connection_authorization.issue
execution.connection_authorization.get
execution.connection_state.get
execution.connection_state.transition
execution.connection_state_event_receipt.get
execution.connection_outstanding_action_index.get
execution.connection_outstanding_action_entry.get
execution.connection_outstanding_action_index.transition
execution.connection_outstanding_action_index_transition_receipt.get
execution.control_namespace.get
execution.control_namespace.issue
execution.control_namespace.rotate
execution.control.get
execution.control.issue
execution.control_receipt.get
execution.scoped_control_leaf_state.get
execution.recovery_grant.issue
execution.recovery_grant.get
execution.recovery_grant.revoke
execution.recovery_grant.expire
execution.recovery_grant_state.get
execution.recovery_grant_state.transition
execution.recovery_grant_transition_receipt.get
execution.recovery_status.get
execution.compartment.issue
execution.compartment.get
execution.compartment.close
execution.compartment.expire
execution.compartment_state.get
execution.compartment_state.transition
execution.compartment_state_transition_receipt.get
execution.compartment_current_manifest.get
execution.economic_resource_cap.import
execution.economic_resource_cap_state.get
execution.economic_resource_cap_state.transition
execution.economic_resource_cap_transition_receipt.get
execution.economic_resource_exposure.import
execution.economic_resource_exposure_state.get
execution.economic_resource_exposure_state.transition
execution.economic_resource_exposure_transition_receipt.get
execution.economic_resource_compartment_membership_manifest.get
execution.economic_resource_atom_manifest.get
execution.principal_limit_policy.issue
execution.principal_limit_policy.get
execution.principal_limit_policy_state.get
execution.principal_limit_policy_state.transition
execution.authority_limit_ledger.get
execution.authority_limit_ledger.transition
execution.authority_limit_ledger_transition_receipt.get
execution.authority_limit_ledger_event_manifest.get
execution.protection_attestation.import
execution.protection_attestation.get
execution.adapter_identity.import
execution.adapter_identity.get
execution.policy.get
execution.policy.import
execution.policy_import_receipt.get
execution.policy_lifecycle.get
execution.policy_lifecycle.transition
execution.policy_lifecycle_transition_receipt.get
execution.integrity_state.import
execution.integrity_state.get
execution.integrity_state.transition
execution.integrity_transition_receipt.get
execution.integrity_inventory.get
execution.integrity_incident.get
execution.integrity_incident_manifest.get
execution.integrity_incident_resolution_entry.get
execution.integrity_repair_audit_receipt.get
execution.integrity_verification_result.get
execution.unreserved_receiver_event_recovery_receipt.get
execution.source_credential_lifecycle.import
execution.source_credential_lifecycle_import_receipt.get
execution.source_credential_lifecycle.get
execution.source_credential_lifecycle.transition
execution.source_credential_lifecycle_transition_receipt.get
execution.lifecycle_transition_history_state.get
execution.trust_dependency_state.import
execution.trust_dependency_state_import_receipt.get
execution.trust_dependency_state.get
execution.trust_dependency_index.get
execution.bounded_index_epoch_directory.get
execution.bounded_index_epoch_directory.transition
execution.bounded_index_epoch_transition_receipt.get
execution.bounded_index_epoch_state.get
execution.bounded_index_slot_assignment.get
execution.sealed_index_epoch_chain_node.get
execution.future_dependency_capacity_pool.import
execution.future_dependency_capacity_pool.get
execution.future_dependency_assignment.get
execution.future_dependency_capacity_pool.transition
execution.future_dependency_capacity_transition_receipt.get
execution.trust_closure_barrier.get
execution.trust_closure_barrier.transition
execution.trust_closure_snapshot.partition
execution.trust_closure_snapshot.complete
execution.trust_closure_source_snapshot.get
execution.trust_closure_snapshot_entry.get
execution.trust_closure_snapshot_partition_receipt.get
execution.trust_closure_snapshot_completion_receipt.get
execution.trust_closure_plan_core.get
execution.trust_closure_work_item.get
execution.trust_closure_result_entry.get
execution.trust_closure_partition_receipt.get
execution.trust_closure_completion_receipt.get
execution.released_exposure_commitment.get
execution.historical_dependency_acceptance_evidence.get
execution.trust_dependency_registration_receipt.get
execution.trust_inflight.register
execution.trust_inflight.complete
execution.trust_inflight_registration_receipt.get
execution.receiver_assertion_trust_state.get
execution.receiver_sequence_epoch_proof.import
execution.receiver_sequence_epoch_proof.get
execution.receiver_sequence_epoch_selector.import
execution.receiver_sequence_epoch_selector.get
execution.receiver_sequence_epoch_selector.transition
execution.receiver_sequence_epoch_selector_transition_receipt.get
execution.receiver_event_identity_scope.import
execution.receiver_event_identity_scope.get
execution.receiver_event_identity_scope_import_receipt.get
execution.receiver_outstanding_stream_entry.get
execution.receiver_outstanding_stream.transition
execution.receiver_outstanding_stream_transition_receipt.get
execution.receiver_terminal_release_plan_core.get
execution.receiver_terminal_release_completion_receipt.get
execution.receiver_event_identity.get
execution.receiver_event_identity.bind
execution.receiver_event_identity_binding_receipt.get
execution.receiver_event_identity.quarantine
execution.receiver_event_identity_index_state.transition
execution.receiver_event_identity_state.transition
execution.receiver_event_equivocation_receipt.get
execution.trust_dependency_state.transition
execution.receiver_assertion_trust_state.transition
execution.trust_compromise.commit
execution.trust_quarantine_receipt.get
execution.exposure_remediation.commit
execution.exposure_remediation.resolve
execution.remediation_resume_authorization.issue
execution.remediation_resume_authorization.get
execution.exposure_remediation.resume
execution.exposure_remediation_receipt.get
execution.unexpected_reversal_cause_receipt.get
execution.release.import
execution.release_import_receipt.get
execution.release_state.get
execution.release_state.transition
execution.release_transition_receipt.get
execution.provider_account_identity.import
execution.provider_account_identity.transition
execution.provider_account_identity_state.get
execution.provider_account_identity_receipt.get
execution.provider_sublimit_identity.import
execution.provider_sublimit_identity.transition
execution.provider_sublimit_identity_state.get
execution.provider_sublimit_identity_receipt.get
execution.provider_identity_trust_overlay_state.get
execution.provider_identity_trust_overlay_state.transition
execution.provider_identity_trust_overlay_transition_receipt.get
execution.credential_broker_authority.import
execution.credential_broker_authority.get
execution.credential_broker_authority_state.get
execution.credential_broker_authority_state.transition
execution.credential_broker_authority_transition_receipt.get
execution.credential_broker_instance_manifest.get
execution.credential_broker_instance_manifest_state.get
execution.credential_broker_instance_manifest_state.transition
execution.executor_credential_instance.get
execution.executor_credential_instance_alias_manifest.get
execution.executor_credential_instance_state.transition
execution.executor_credential_instance_transition_receipt.get
execution.executor_credential_binding.import
execution.executor_credential_binding.get
execution.executor_credential_binding.transition
execution.executor_credential_binding_transition_receipt.get
execution.commerce_signer_authority.import
execution.commerce_signer_authority.get
execution.commerce_signer_authority_state.get
execution.commerce_signer_authority_state.transition
execution.commerce_signer_authority_transition_receipt.get
execution.commerce_signer_drain_proof.import
execution.commerce_signer_drain_proof.get
execution.commerce_inventory_restrictive_recovery_authorization.import
execution.commerce_inventory_restrictive_recovery_authorization.get
execution.cancellation_credential_continuity_receipt.get
execution.quote.get
execution.provider_quote.import
execution.provider_quote_import_receipt.get
execution.review.evaluate
execution.review.get
execution.taint.evaluate
execution.taint.get
execution.lineage_commitment.issue
execution.lineage_commitment.get
execution.lineage_state.get
execution.lineage_state.transition
execution.lineage_state.expire
execution.lineage_provisional_terminal_receipt.get
execution.binding_set.issue
execution.binding_set.get
execution.mandate.issue
execution.mandate.get
execution.authorization.issue
execution.authorization.get
execution.confirmation.verify
execution.confirmation_receipt.get
execution.cancellation_authorization.issue
execution.cancellation_authorization.get
execution.cancellation_cost_attestation.import
execution.cancellation_cost_attestation.get
execution.cancellation_fee_source.import
execution.cancellation_fee_source.transition
execution.cancellation_fee_source_state.get
execution.cancellation_fee_source_transition_receipt.get
execution.cancellation_incident_sink.import
execution.cancellation_incident_sink.get
execution.unexpected_receiver_charge_exposure_core.get
execution.unexpected_cancellation_charge_receipt.get
execution.safety_cancellation_preparation_intent.issue
execution.safety_cancellation_preparation_intent.get
execution.obligation_exposure_core.issue
execution.obligation_exposure_core.get
execution.obligation_exposure_state.get
execution.obligation_exposure_state.transition
execution.reservation.hold
execution.reservation.get
execution.reservation.release
execution.reservation.expire
execution.obligation_exposure.expire
execution.obligation_acceptance_window.close
execution.effect_lease.get
execution.effect_lease.transition
execution.gate.evaluate
execution.action.prepare
execution.action.execute
execution.action.cancel_before_submission
execution.action.execute_cancellation
execution.action.reconcile.request
execution.irreversible_horizon.import
execution.irreversible_horizon_receipt.get
execution.provider_event.import
execution.receiver_event_import.get
execution.provider_event_import_receipt.get
execution.receiver_event_stream_state.get
execution.receiver_event_stream_state.transition
execution.receiver_event_stream_transition_receipt.get
execution.provider_review_artifact.import
execution.action.get
execution.action_state.transition
execution.outbox_state.transition
execution.receipt.get
execution.checkout_group_core.issue
execution.checkout_group_core.get
execution.checkout_transition_template.issue
execution.checkout_transition_template.get
execution.ordinary_deal_inventory_commitment.issue
execution.ordinary_deal_inventory_commitment.get
execution.checkout_reservation_batch_core.issue
execution.checkout_reservation_batch_core.get
execution.checkout_reservation_batch.hold
execution.checkout_reservation_batch_receipt.get
execution.checkout_role_authority_basis_receipt.get
execution.checkout_terms_fence_claim_state.get
execution.checkout_terms_fence_claim_state.transition
execution.checkout_terms_fence.abandon
execution.checkout_terms_fence_abandonment_receipt.get
execution.ordinary_terms_fence_claim_state.get
execution.ordinary_terms_fence_claim_state.transition
execution.ordinary_terms_fence.abandon
execution.ordinary_terms_fence_abandonment_receipt.get
execution.seller_copy_lease.import
execution.seller_copy_lease.transfer
execution.seller_copy_lease_state.get
execution.seller_copy_lease_state.transition
execution.seller_copy_lease_transition_receipt.get
execution.inventory_reservation.prepare
execution.inventory_reservation.commit
execution.inventory_reservation.fence_terms
execution.inventory_reservation.consume
execution.inventory_reservation.release
execution.inventory_reservation.drain_cleanup
execution.inventory_reservation.restrictive_recover
execution.inventory_reservation.reconcile.request
execution.inventory_reservation_state.get
execution.inventory_reservation_state.transition
execution.inventory_reservation_receipt.get
execution.fulfillment_attempt_core.issue
execution.fulfillment_attempt_core.get
execution.checkout_group_state.get
execution.checkout_group_state.transition
execution.checkout_payment_subreservation_state.get
execution.checkout_payment_subreservation_state.transition
execution.checkout_readiness_receipt.get
execution.checkout_conditional_attempt_transition_receipt.get
execution.checkout_payment_authority.supersede
execution.checkout_payment_authority_supersession_receipt.get
execution.checkout_activated_payment_non_submission_proof.get
execution.checkout_activated_payment_release_receipt.get
execution.checkout_preconsume_terms_reversal_receipt.get
execution.checkout_preconsume_inventory_release_completion_receipt.get
execution.checkout_terms_successor_receipt.get
execution.checkout_existing_obligation_adoption_receipt.get
execution.checkout_group.expire
execution.activity.list
execution.activity.detail.get
```

Composition is deterministic. The ten frozen proposal operations remain only at
their original resource and retain byte-identical request/response schemas and
semantics. `execution.capabilities.get` returns only the execution overlay plus
the pinned dependency hashes; it does not masquerade as the frozen
`capabilities.get`. An execution service may resolve a pinned base ObjectRef
through a trusted service-to-service verifier. External callers use
`execution.base_object.get`, whose response is an execution schema and whose ACL
requires the same principal/DataGrant authority as the referenced base object;
it never redefines `object.resolve`.

No operation name appears in both registries. The overlay manifest records exact
request/response schema hashes, consequence, authentication branch, DataGrant/
disclosure/authority prerequisites, idempotency rule, receipt family, caller
class, and implementation status. Every request envelope carries both overlay
hash and pinned base dependency hash, so a mismatched pair fails before dispatch.
`execution.transition_manifest.get` resolves only the exact content-addressed
manifest named by its parent receipt/evidence and applies that parent's private-
read/audit ACL. It is never a search or enumeration oracle. Lifecycle authorities
produce lifecycle/continuity manifests; the authority service produces checkout
manifests in the same transaction as their entries and parent receipt.

`execution.receiver_sequence_epoch_proof.import` and
`execution.irreversible_horizon.import` accept only the allowlisted provider/
registry adapter whose current source credential authenticates the exact scope,
epoch, evidence bytes, and finality rule; their getters use the same private
activity ACL. Selector import/transition and all economic-cause-core construction
are authority-internal. Trust snapshot partition/completion operations are trust-
coordinator-only and require the current global fail-stop/barrier head. Integrity
resolution entries are readable only through stopped-recovery/audit authority;
their map never becomes a public incident oracle.

Every exact read first binds the request ref to the returned schema, object
identity, canonical hash, signature, resource bounds, registry response family,
and ACL. It then dispatches the returned schema's specialized semantic validator
with the exact dependency graph. Every returned-object binding and every
resolved graph edge MUST use an exact ObjectRef tuple
`(schema, object_id, object_hash)`; the resolved object MUST match all three
components, its canonical bytes MUST
recompute the named hash, and every signed object MUST have a valid signature by
the schema-appropriate signer. A bare hash, schema-only object, unresolved edge,
or internally coherent alien object cannot satisfy a dependency.

An operation whose contract promises current state also performs an
authoritative current-head comparison; dependency validity alone is
insufficient. At minimum, `execution.connection_state.get`,
`execution.connection_outstanding_action_index.get`,
`execution.compartment_state.get`, and `execution.lineage_state.get` require the
returned head ObjectRef to equal the resolver's current head exactly.
`execution.action.get` additionally requires the exact ObjectRefs binding its
returned `current_action_state_head`, `current_lineage_state_head`, and
`current_activity_detail` objects to equal their respective authoritative current
heads. Any other operation declared current by the registry applies the same
rule. A missing/forked current-head result or unavailable resolver denies.
Immutable historical-object and receipt getters need not equal a later current
head unless their registry contract promises current state; they still verify
the complete exact graph and signatures at the authenticated signing time and
must not promote historical validity into current eligibility.

`execution.action.get` is deliberately a mixed current/historical composite.
Its returned `current_action_state_head`, `current_lineage_state_head`, and
`current_activity_detail` equal their authoritative retrieval-time current
heads. Objects reachable only as immutable evidence—BindingSet, mandate or
one-shot authority, captured connection and DataGrant heads, reservations,
confirmation, GateRequest, GateResult, signed dependency manifest, dependency
attestations, and their referenced heads—use historical-evidence semantics.
Historical validation still verifies exact ObjectRefs, canonical hashes,
signatures and signer lifecycle at signing time, predecessor chains,
principal/runtime/recipient identity, mandate scope and business tuple, captured
eligibility state, signed dependency projection, evaluated roots, the exact
per-code check vector and evidence, decision, and chronology. Authenticated
as-of history is used for the relevant event time; retrieval-time successors do
not invalidate an earlier captured head.

Historical-evidence mode is an internal, unforgeable validator capability, not
a request flag. Supplying `historicalRead:true` or any equivalent caller field
to a live reservation, gate, redemption, outbox, or handoff validator does
nothing. Those paths always require retrieval/evaluation-time current heads,
nonces, policies, lifecycles, states, and expiries. Historical validity can
explain what happened; it can never become current execution eligibility.

These rules apply equally to connection authorization/state, enumerable roots/
nodes, connection outstanding entries and transitions, receiver outstanding
entries/transitions, terminal release plans and completions, and all other
execution families. A missing object resolver, external-release verifier, or
required dependency is a denial. No getter may degrade to schema-only acceptance
because its dependency graph was omitted.

### 11.1 Closed state-writer map

Every non-genesis mutable-head successor has exactly one registry-declared writer
operation or one explicitly named internal consequence of such an operation.
Each writer declares its caller class, expected-current-head CAS, semantic
idempotency key, next-head schema, and signed transition-receipt schema in the
overlay manifest. A timer is not ambient authority: expiry requires the named
authority-internal operation with authenticated authority-service time. A hidden
administrator/database write, unspecified worker, caller-selected next state, or
second operation for the same edge is nonconforming.

| Mutable head | Genesis constructor | Sole non-genesis head writer | Closed typed causes accepted from named request/import operations |
|---|---|---|---|
| AgentConnectionStateHead + its connection-scoped aggregate-control leaf | connection-authorization issue derives one insert-only state key/head per exact authorization | authority-internal `execution.connection_state.transition` | principal control receipt: active↔paused, joint connection/leaf active↔frozen-new-redemptions, or active/paused→revoked; authority-time expiry: active/paused→expired; unrelated aggregate-leaf changes retain the connection leaf commitment without rewriting the connection |
| DataGrantStateHead | `execution.data_grant.issue` | authority-internal `execution.data_grant_state.transition` | signed pause/resume/revoke/expiry or unique read decrement; every edge emits DataGrantStateTransitionReceipt; read decrement atomically commits the ReadReceipt and response-handoff marker before bytes |
| ConnectionOutstandingActionIndexStateHead | connection-authorization issue creates empty enumerable map | authority-internal `execution.connection_outstanding_action_index.transition` | reservation insert, action-head update, fenced-non-submission/authenticated-stream-closure/authenticated-irreversible-horizon removal, connection restriction snapshot, or terminal seal/drain; every change emits its transition receipt and never rewrites connection lifecycle for unrelated work |
| DisclosureAuthorizationStateHead | authorization issue | authority-internal `execution.disclosure_authorization_state.transition` | reservation hold/release/expiry active→active exact reservation ref/hash/fence install/clear; principal revoke active→revoked with exact held-reservation invalidation/field clear; timer active→expired with the same closure; fenced delivery active→consumed |
| DisclosureReservation state | reservation hold | authority-internal `execution.disclosure_reservation_state.transition` | release held→released; timer held→expired; fenced delivery held→handed_off |
| ProviderAccountIdentityHead | provider-account import | registry-authority `execution.provider_account_identity.transition` | registry-signed active→active append-only alias/generation successor, active→revoked/expired/quarantined, or revoked/expired→quarantined under the shared receipt matrix; restriction retains account generation while advancing lifecycle sequence; trust coordinator never writes this external head |
| ProviderSublimitIdentityHead | provider-sublimit import | registry-authority `execution.provider_sublimit_identity.transition` | registry-signed active(g)→active(g+1) for changed cap/locus/proof, active→revoked/expired/quarantined, or revoked/expired→quarantined; no state reactivates and trust coordinator never writes this external head |
| ProviderIdentityTrustOverlayStateHead + LifecycleTransitionHistoryStateHead | provider account/sublimit import creates eligible overlay and empty history from exact registry genesis receipt | authority-internal `execution.provider_identity_trust_overlay_state.transition` | authority service observes a verified registry generation/current-head transition while eligible; trust coordinator alone commits eligible→quarantined under compromise closure while preserving external truth; quarantine terminal and every edge emits ProviderIdentityTrustOverlayTransitionReceipt |
| CredentialBrokerAuthorityStateHead | `execution.credential_broker_authority.import` creates active lifecycle plus trust-dependency/integrity genesis | registry-authority `execution.credential_broker_authority_state.transition` | authenticated active→active signing-key-family rotation under the same stable authority; prospective active→revoked; coordinator-only active/revoked→quarantined with exact sealed manifest and complete instance/alias/reverse closure; every edge emits CredentialBrokerAuthorityTransitionReceipt |
| CredentialBrokerInstanceManifestStateHead | broker-authority import creates accepting empty signed manifest | broker-internal `execution.credential_broker_instance_manifest_state.transition` | bounded instance import accepting→accepting exact manifest add; every instance/alias successor uses `instance_head_updated` to replace exactly one entry under broker signature; coordinator-only compromise accepting→sealed_for_compromise under coordinator signature; no sealed successor |
| ExecutorCredentialInstanceStateHead + alias manifest | first binding import creates canonical instance/one-alias state plus trust-dependency/integrity genesis | broker-internal `execution.executor_credential_instance_state.transition` | later alias import or ordinary alias-head successor replaces/adds complete signed alias entries while active; coordinator-only compromise active→quarantined transitions every alias and the one instance-keyed reverse index; every edge emits ExecutorCredentialInstanceTransitionReceipt; no post-quarantine alias |
| ExecutorCredentialBindingHead | credential import plus canonical instance-manifest membership | broker `execution.executor_credential_binding.transition` | ordinary active→revoked/expired jointly updates its instance alias entry; coordinator-only active/revoked/expired→quarantined for every alias under instance-wide historical compromise with complete reverse closure |
| CancellationFeeSourceStateHead | provider/registry import plus trust-dependency genesis and exact incident-sink binding | registry-authority `execution.cancellation_fee_source.transition` | active(g)→active(g+1) for any fee-source change, or active→revoked/expired; coordinator-only active/revoked/expired→quarantined for compromise or authenticated unexpected charge, with exact sink/economic/action/trust transitions; no state reactivates |
| CompartmentStateHead | compartment issue creates pending | authority-internal `execution.compartment_state.transition` | every edge emits CompartmentStateTransitionReceipt with before/after reservation, atom, and confirmed-event maps; includes attestation, reservation, exhaustion/recovery, close/expiry, trust/unexpected-reversal, and the closed unexpected-cancellation-charge incident-sink branch; coordinator-only historical closed→frozen adds a zero-capacity incident-overlay entry before exact conservative atoms; control operations write only the separate control head |
| EconomicResourceProtectionCapStateHead | `execution.economic_resource_cap.import` creates the unique resource/asset selector | protection-registry `execution.economic_resource_cap_state.transition` | cap reduction inspects the signed complete nonclosed-compartment membership manifest, including zero-atom members; at/above exposure and every configured ceiling has the sole active/active pair; below either has the sole frozen/frozen pair plus every incompatible compartment freeze; scheduled retirement active/frozen→frozen/closed; trust-coordinator compromise active/frozen/closed→quarantined; reconciled replacement frozen→active; every departure from active jointly makes resource exposure non-active; no alias-selected attestation |
| EconomicResourceExposureStateHead + compartment/atom maps | `execution.economic_resource_exposure.import` creates the unique economic-resource/asset head plus empty active-membership, historical-incident-overlay, and atom maps | authority-internal `execution.economic_resource_exposure_state.transition` | compartment issue/close atomically add/remove the exact ordinary member; coordinator-only historical restoration adds/removes the frozen compartment only in the zero-capacity incident overlay before trust, reversal, or unexpected-cancellation-charge atoms; every mutation binds before/after complete resource-atom maps plus exact delta and contributing typed compartment/obligation/ledger receipts |
| PrincipalExecutionLimitPolicyStateHead | `execution.principal_limit_policy.issue` creates the unique principal/domain head | authority-internal `execution.principal_limit_policy_state.transition` | principal-high-assurance active revision, restrictive freeze/quarantine, or fully reconciled higher-revision recovery under the closed §5.2 matrix; no second stable ID |
| AuthorityLimitLedgerHead | corresponding principal-limit policy, economic-resource compartment policy, mandate, or one-shot authority issue | authority-internal `execution.authority_limit_ledger.transition` | every edge emits AuthorityLimitLedgerTransitionReceipt with before/after signed current-event manifests and exact delta; causes include reservation, eviction, one-shot, refund/reversal, trust/unexpected-reversal, unexpected-cancellation-charge, remediation, policy revision, and close; one-shot consumption only false→true |
| ExecutionIntegrityStateHead | `execution.integrity_state.import` creates healthy plus empty enumerable inventory/incident maps | authority-internal `execution.integrity_state.transition` | inventory add; compromise/equivocation/storage/unreserved-event incident fail-stop; monotonic incident-map add while stopped; exact repair and every branch receipt—including unreserved-event classification—required before empty-map healthy successor |
| ExecutionReleaseStateHead + LifecycleTransitionHistoryStateHead | `execution.release.import` creates generation 0 and an empty transition map | `execution.release_state.transition` | exact matrix in §5.3; transition rejects null predecessor and atomically adds the typed receipt to lifecycle history; release authority signs ordinary edges, trust coordinator alone signs compromise quarantine |
| PolicyLifecycleHead + LifecycleTransitionHistoryStateHead, including review, taint, receiver-scope-selection issuer, receiver-channel, confirmation-assurance, confirmation-verifier, adapter-identity and protection-attestation lifecycle | `execution.policy.import`, `execution.adapter_identity.import`, or `execution.protection_attestation.import` creates generation 0 and an empty transition map | `execution.policy_lifecycle.transition` | every edge appends its typed receipt; policy authority signs ordinary edges, while trust coordinator alone signs compromise quarantine and invokes reverse closure |
| SourceCredentialLifecycleHead + LifecycleTransitionHistoryStateHead | import creates one stable authority/core generation 0 and empty transition map | `execution.source_credential_lifecycle.transition` | credential authority signs ordinary successor/retirement/expiry; trust coordinator alone signs compromise quarantine; every edge atomically appends its receipt and historical acceptance proves consecutive sequence membership |
| CommerceSignerAuthorityStateHead + LifecycleTransitionHistoryStateHead | `execution.commerce_signer_authority.import` creates one seller-inventory or copy-registry stable authority at generation 0 with owner-signed restrictive-recovery consent | registry-authority or trust-coordinator branch of `execution.commerce_signer_authority_state.transition` | rotation/retirement is registry-signed active→draining then draining→active(next generation)/retired only with the matching complete empty drain proof; drain may be abandoned to same-generation active only after the same empty proof; emergency revocation or compromise quarantine only inside `execution.trust_compromise.commit`, immediately closing Cairn-owned trust/exposure while external cleanup remains a separately authorized restrictive saga; every edge emits CommerceSignerAuthorityTransitionReceipt |
| TrustDependencyStateHead + bounded epoch directory | `execution.trust_dependency_state.import` creates epoch 0, zero roots/manifests, directory, and integrity entry | authority-internal `execution.trust_dependency_state.transition` plus `execution.bounded_index_epoch_directory.transition` | reservations bind accepting-epoch slots; rollover makes old epoch draining and creates one accepting epoch; late events consume only assigned slots; stream closure seals zero-reservation draining epochs; compromise uses one bounded transaction or first installs fail-stopped closure barrier and completes signed partitions |
| FutureDependencyCapacityPoolStateHead | source-scope import creates bounded active pool | authority-internal `execution.future_dependency_capacity_pool.transition` | reserve before handoff; transfer one slot at authenticated reauthentication; release on authenticated stream closure/horizon or fenced non-submission; repair-audit-only fail_stopped→active with identical map/count; compromise→quarantined terminal |
| TrustClosureBarrierStateHead | compromise/equivocation transaction insert-only creates `fail_stopped_snapshotting` with empty progress maps while atomically stopping integrity | coordinator `execution.trust_closure_barrier.transition` | bounded stopped snapshot partitions; exact snapshot-completion/plan install→fail_stopped_applying; monotonic semantic partition prefix; applying→completed_quarantined only after fixed-point proof; no execution/capacity presentation while live |
| ReceiverAssertionTrustStateHead | provider-event registration creates accepted or immediately quarantined from exact preexisting restriction | authority-internal `execution.receiver_assertion_trust_state.transition` | trust-coordinator accepted→quarantined with mandatory TrustQuarantineReceipt and optional same-transaction ExposureRemediationReceipt; later overlapping compromises record `already_quarantined` without writing this head or duplicating economics; no reverse edge |
| ExecutionControlStateHead / namespace + scoped-control map | `execution.control_namespace.issue` creates generation 0 and empty map; rotate creates later generation | `execution.control.issue`, except the connection-scoped leaf is written only by `execution.connection_state.transition` | closed target-lattice pause/resume/freeze/revoke; one map-path/leaf CAS per target; terminal leaves remain enumerable tombstones; namespace rotation only after revoked-generation CAS |
| RecoveryGrantStateHead | `execution.recovery_grant.issue` creates active under current namespace generation | authority-internal `execution.recovery_grant_state.transition` | atomic restrictive-control use active→consumed; principal revoke active→revoked; authority-time expiry active→expired; terminal successors and no cross-generation use |
| LineageStateHead | commitment issue creates provisional | authority-internal `execution.lineage_state.transition` | exact §6 edge plus commitment supersession, timer expiry, provisional cancellation on revoked/noncurrent conditional authority, reservation activation/release, fenced non-submission, or provider-event receipt; typed provisional terminal receipt proves no activation/gate/outbox |
| ObligationExposureStateHead | reservation hold creates potential_reserved | authority-internal `execution.obligation_exposure_state.transition` | exact §7.1 edge plus one of reservation, fenced handoff/non-submission, checkout, receiver-event, dependency-remediation, or authenticated unexpected-reversal receipt; evidence coordinator allows quarantined→quarantined only; `execution.exposure_remediation.resume` alone permits principal-authorized quarantined→revalidated-recorded or reversed; local expiry is pre-handoff only, while a post-handoff deadline cause can only enter acceptance_window_closed_unresolved with the hold intact |
| OutboxStateHead | successful redemption constructor only | authority-internal `execution.outbox_state.transition` | pending_handoff→handoff_committed from one fenced execute receipt only in the same outbox-handoff transaction as receiver-stream no-event→unknown; pending_handoff→non_submission_proved from one fenced cancellation proof |
| EffectLease | successful redemption constructor | authority-internal `execution.effect_lease.transition` | dispatching→submitted/unknown/non_submission_proved under one fenced outbox or reconciliation receipt |
| ReceiverSequenceEpochSelectorStateHead + epoch-scope/outstanding maps | authenticated current-epoch proof import creates the stable selector, first scope, and empty cross-epoch outstanding map | authority-internal `execution.receiver_sequence_epoch_selector.transition` | authenticated provider epoch rotation installs one new current scope while old scopes drain; reservation/handoff/event/terminal updates CAS the cross-epoch map; integrity fail-stop requires the exact incident; repair-audit-only fail_stopped→active requires the exact audit and preserves proof/maps/count; quarantine is terminal |
| ReceiverEventIdentityIndexStateHead + bounded epoch directory | selector-authorized `execution.receiver_event_identity_scope.import` creates active index epoch 0 with two empty manifests, directory, and integrity entry for one provider sequence epoch | authority-internal `execution.receiver_event_identity_index_state.transition` plus `execution.bounded_index_epoch_directory.transition` | reservation uses only selector-current scope; bind consumes assigned pair even after provider epoch rotation; closure/horizon/non-submission releases typed assignments; equivocation uses bounded or partition closure |
| ReceiverOutstandingStreamEntry + selector-wide outstanding-stream map | action admission creates one reserved entry under the current stable selector | authority-internal `execution.receiver_outstanding_stream.transition` jointly invokes selector and assigned scope/epoch writers | reservation registration; handoff updates selector map while binding unchanged assigned epoch; terminal removal requires ReceiverTerminalReleasePlanCore plus deterministic ReceiverTerminalReleaseCompletionReceipt with enumerable identity/trust/future/stream/connection receipt equality; fenced pre-handoff non-submission uses the same plan/completion rule; no timer/business-final removal |
| ReceiverEventIdentityStateHead | provider-event identity bind insert-only creates the paired event-ID and sequence heads | authority-internal `execution.receiver_event_identity_state.transition` | identity quarantine causes bound→quarantined for every complete conflicting/counterpart key set; no other successor |
| ReceiverEventStreamStateHead | successful redemption creates the unique no-event effect stream | authority-internal `execution.receiver_event_stream_state.transition` | fenced outbox no-event→unknown commits atomically with exact OutboxHandoffReceipt/state under outbox-handoff transaction; authenticated provider-event import first binds both uniqueness keys and may then advance under the exact finality profile; identity equivocation→quarantined; no raw caller-selected state |
| ActionStateHead | action preparation constructor | authority-internal `execution.action_state.transition` | exact reservation/redemption, outbox, cancellation, and authenticated receiver-event receipt families on disjoint state edges |
| CheckoutGroupStateHead | checkout-group issue | authority-internal `execution.checkout_group_state.transition` | exact §10 edge plus one inventory-pending/seller-transition/readiness, reservation expiry/release, fenced action, authenticated receiver-event, or group-expiry receipt; pre-consume reversal uses CheckoutPreconsumeTermsReversalReceipt then the seller-release completion receipt; terms-confirmed inventory successor requires the typed conditional-attempt activation/discharge receipt and complete joint reservation/lineage/compartment/resource/ledger transitions; no caller-selected state |
| CheckoutPaymentSubreservationStateHead | paired batch transaction creates conditional_held with provisional payment lineage and exact role authority-basis receipt | authority-internal `execution.checkout_payment_subreservation_state.transition` | terms successor conditional_held→activated or discharged; payment redemption activated→consumed; before redemption, typed activated release uses a cause-closed negative proof and the legal active→fenced_non_submission lineage edge with balanced group/obligation/economic successors; ambiguous handoff has no release edge |
| CheckoutTermsFenceClaimStateHead | terms gate creates pending with group `terms_fence_pending` | authority-internal `execution.checkout_terms_fence_claim_state.transition` | pending→redeemed in successful redemption/outbox transaction, or pending→abandoned from the exact expiry/revocation/cancel/pre-redemption-failure cause; terminal successors |
| OrdinaryTermsFenceClaimStateHead | ordinary gate-pending transaction creates pending for one inventory commitment/deal/obligation/action/effect/fence | authority-internal `execution.ordinary_terms_fence_claim_state.transition` | pending→redeemed in successful redemption/outbox transaction, or pending→abandoned from the exact expiry/revocation/cancel/pre-redemption-failure cause; terminal successors |
| SellerCopyLeaseStateHead | copy/ownership-registry `execution.seller_copy_lease.import` creates the only global copy-ID head and registry-signed genesis receipt | authority-internal `execution.seller_copy_lease_state.transition`, invoked atomically by seller-inventory reservation operations, ownership-registry transfer, `execution.inventory_reservation.drain_cleanup`, or `execution.inventory_reservation.restrictive_recover` | ordinary edges bind exact active commerce authorities; draining cleanup binds exact drain-begin receipts and preexisting set and permits only already-handed-off accepted consume, proved release-to-available, or quarantine; owner-preauthorized restrictive recovery permits only fenced→consumed, nonterminal→quarantined, or reservation-release copy quarantine and never creates available; neither cleanup branch prepares/fences/transfers; every changed copy emits SellerCopyLeaseTransitionReceipt |
| InventoryReservationStateHead | seller-inventory `prepare` creates hold_prepared against its exact active commerce-signer authority head | authority-internal `execution.inventory_reservation_state.transition` | ordinary edges require exact active signer context; draining cleanup uses current draining/active role bases plus exact drain receipts for only preexisting consume/release/quarantine; restrictive recovery accepts at least one exact restrictive authority basis plus every remaining exact current active or current-draining-cleanup basis and permits only finalize-consumed, proved release with all copies quarantined, or unresolved quarantine; no post-fence timer expiry and Cairn/trust coordinator are never external writers |

The manifest MUST mechanically prove writer closure: every permitted edge appears
once as `(head family, from state/tuple, transition cause, to state/tuple)` under
the sole head writer above, every cause has one signer/caller class and receipt, no operation
claims an unlisted edge, and every non-genesis stored head is reachable through
one such receipt chain. Orphan heads, duplicate edge writers, unsigned migration
writers, and genesis-by-update all fail conformance.

`execution.data_grant.pause|resume|revoke` require an exact principal-signed
command, expected head hash/sequence/revocation nonce, and fresh command expiry.
Resume is only `paused → active` for the same unexpired immutable grant and
remaining count; it cannot replenish reads or reverse exhausted/revoked/expired.
The authority-timer `expire` accepts no caller-selected time or next state.
Disclosure and reservation expiry operations follow the same rule.

Recovery-grant issue/revoke requires principal high assurance, exact current
control namespace/generation, expected grant head/nonce where applicable, and a
short expiry. Recovery-key use cannot call the transition writer directly: it
supplies the signed restrictive control authorization, and the control service
atomically writes both the effective control receipt and `active → consumed`
grant transition. Rotation and every gate/control path reject a grant whose
generation or current state differs.

Principal-limit policy issue/revision requires principal high assurance and the
unique stable principal/domain/asset-or-null ID. It CASes the current policy head and every
affected stable principal ledger's source/limit fields without changing ledger
keys, discriminant set, or committed atoms. A revision that adds, removes, or
changes a rate/window duration or the presence of a ledger kind is schema-invalid
in v0.1. The operation fails atomically if any required ledger
head is missing, forked, stale, or cannot represent the new restriction.

`execution.economic_resource_exposure.import` is authority-registry-only and
insert-only for the canonical resource/asset key after account/sublimit identity
resolution. A second genesis conflicts. Every later transition accepts the exact
current head, pre-mutation EconomicMutationCauseCore, and branch evidence; it
emits the transition receipt, and for an
economic delta commits with all contributing compartment/obligation/ledger heads
under one authority transaction. An agent, principal, adapter, or compartment-
local writer cannot create or edit this aggregate head directly.

`execution.obligation_exposure.expire` may release only a pre-handoff
`potential_reserved` or `terms_pending_conditional` state with the exact fenced
non-submission proof. Once a receiver-capable handoff exists,
`execution.obligation_acceptance_window.close` can only advance
`sent_unresolved → acceptance_window_closed_unresolved` without changing the hold
atoms or amount. Only authenticated `execution.provider_event.import` may then
record timely acceptance or receiver-confirmed nonacceptance/expiry.

The public/request/import operation named in a cause row never writes the head.
It produces the typed cause receipt and atomically invokes the one
authority-internal writer, which accepts no raw `to_state`, amount, or head from
that caller. Multiple private `*.get` operations therefore do not race as writers:
they all use the one `execution.data_grant_read.commit` admission and the one
DataGrant state writer. Cross-head transactions order and CAS each sole writer
under one transaction ID; “internal consequence” never means an unregistered
database mutation.

`execution.provider_account_identity.import` accepts only the allowlisted signed
registry adapter and creates one stable root at lifecycle sequence 0 and identity
generation 0. Transition accepts only the registry authority, exact expected
head, append-only alias evidence or a typed registry quarantine cause, advances
lifecycle sequence exactly once, advances identity generation only for a
generation change, and emits ProviderIdentityRegistryTransitionReceipt.
A generation advance updates the eligible Cairn trust overlay from that receipt
before new work may proceed. Historical compromise never writes the registry
head: `execution.trust_compromise.commit` quarantines the overlay and closes
local dependents.
`execution.commerce_signer_authority.import` is registry-only and insert-only for
the stable authority key. Its transition operation accepts ordinary rotation or
retirement only as active→draining begin followed by a registry completion from
the exact unchanged draining head, with exact continuity for rotation and the
current jointly signed zero-nonterminal CommerceSignerDrainProof; emergency revocation or
quarantine is coordinator-only and atomically makes every dependent external
inventory head ineligible to Cairn, freezes in-flight actions/assertions/exposure,
before the restrictive authority head is presented. It preserves all seller-
owned reservation/copy heads as last-observed external truth in that transaction.
`execution.commerce_signer_drain_proof.import` accepts only the exact current
draining authority plus registry co-signatures, the matching drain-begin receipt,
complete authoritative snapshot/cursors,
canonical empty enumerable manifest, and short expiry. The transition CAS
rechecks all of it. Inventory prepare serializably guards both authority heads as
active, so it either commits before drain-begin and appears in the draining
snapshot, or loses that race and denies; it cannot appear after the proof.

`execution.commerce_inventory_restrictive_recovery_authorization.import` accepts
only the immutable owner-consented semantic, exact current active/draining/restrictive
role bases, exact predecessor reservation/copy set, branch evidence and successor
commitments. `execution.inventory_reservation.drain_cleanup` accepts no recovery
authorization: it requires the exact current draining/active role tuple, every
drain-begin receipt, a predecessor set predating those receipts, the branch-exact
acceptance/release/quarantine evidence and every required role signature. It is
the sole invoker of the external writers for drain cleanup and denies every new-
work edge. `execution.inventory_reservation.restrictive_recover` is the sole
invoker of the existing external state writers for these causes. It atomically
commits one reservation successor and every copy successor or none. Stale or
compromised commerce signatures are never accepted; active and current-draining
roles co-sign with unchanged generation and exact drain-begin receipt, and
each restrictive role is represented only by its preauthorized registry
signature. Seller inventory/copy ordinary writers continue to reject any
signature whose key generation or current authority head is not exact.
`execution.credential_broker_authority.import` is restricted to the broker
registry, creates the immutable authority core, active lifecycle head, accepting
empty instance-manifest head, trust dependency and integrity entry, and emits the
genesis CredentialBrokerAuthorityTransitionReceipt. Membership updates are
broker-only bounded CASes over the manifest head and emit the same receipt's
membership branch. Lifecycle transition is registry-only; compromise can commit
only inside `execution.trust_compromise.commit` with the exact sealed manifest,
all instance/alias transition receipts, reverse closure, and exposure remediation.

`execution.executor_credential_binding.import` creates the immutable binding core
and active alias head, then atomically creates or updates the one canonical
credential-instance state and complete alias manifest. On first instance import
only, it also creates the instance-keyed three empty trust manifests,
TrustDependencyStateHead, and integrity-inventory entry before any alias is
eligible. It also adds a first-seen instance to the broker's bounded manifest.
A later alias reuses both indexes and cannot create another genesis. Every
instance/alias-manifest successor emits ExecutorCredentialInstanceTransitionReceipt.
Its binding transition is broker-only;
ordinary revoke/expiry is prospective, while any historical-compromise quarantine
is coordinator-only and closes every indexed in-flight/assertion/exposure entry.
Rotation is a fresh imported binding ID followed by fresh Cairn authority and
cannot orphan the old binding's dependency index.

`execution.provider_sublimit_identity.import` accepts only the allowlisted
provider/registry adapter and creates the canonical child at generation 0.
`execution.provider_sublimit_identity.transition` requires the current child
head, provider-signed next proof/cap/locus/status, strict sequence increment,
identity-generation increment only for `generation_advanced` (unchanged for
revocation, expiry, or quarantine), and registry signature; it emits a
before/after receipt and atomically invokes the
same overlay observation/ordinary invalidation path as an account-generation
change. Historical compromise uses only the coordinator-signed overlay plus
local closure; it does not require a registry successor. Gate and handoff resolve
both this head and the eligible overlay directly, not merely an attestation
status URL.

Cancellation fee-source import/transition operations are likewise restricted to
the authenticated provider/registry adapter, require exact receiver/account/
operation scope and monotonic generation, and return before/after receipts. A
new nonzero/variable/unknown head becomes current immediately and invalidates all
unhanded-off zero-cost attestations; it cannot be bypassed by their later expiry.

Inventory prepare/commit/fence/consume/release operations are seller-inventory-
service calls only. Each accepts the exact expected current reservation head,
the complete global copy-head set, one checkout-or-ordinary context, and a typed
cause, invokes the one inventory state writer, and returns its signed transition
receipt. `fence_terms` requires either the checkout group or ordinary deal plus
the exact obligation/action/effect/outbox-fence tuple;
`consume` requires the matching authenticated terms-acceptance receipt; and a
post-fence `release` requires authenticated nonacceptance/cancellation or Cairn
fenced non-submission after redemption, or the exact terminal pre-redemption
abandonment claim/receipt. No Cairn authority-service identity or agent runtime may
call them or choose a successor state.
`execution.seller_copy_lease.import` is restricted to the authenticated Cairn
copy/ownership registry and creates the single available genesis head for a
never-seen canonical copy ID. Re-import is idempotent only at the same hash; a
duplicate copy ID, different seller/generation genesis, or fork conflicts.
`execution.seller_copy_lease.transfer` requires the exact current global head,
authenticated ownership evidence, and an `available` or `consumed` predecessor;
it invokes the sole lease writer and cannot overlap a prepared/held/terms-fenced
reservation or a live/unknown obligation bound to a consumed copy.

Protection-attestation and adapter-identity import operations accept only their
allowlisted registry authorities. They atomically create the immutable record and
the active genesis `PolicyLifecycleHead` plus empty lifecycle-history head; `get`
follows the financial private-read
ACL, and each emits the same `cairn.policy_import_receipt.v0.1` with its exact
`protection_attestation` or `adapter_identity` discriminator. The cap selector's
`new_attestation_import_receipt_ref` accepts only that protection-attestation
receipt. Re-import with the same canonical identity and hash is idempotent, while a
fork conflicts. Later retirement or compromise uses only
`execution.policy_lifecycle.transition`, with compromise restricted to the trust-
coordinator transaction.

`execution.policy.import` is the named genesis constructor for immutable
accounting, finality, review, taint, receiver-channel, confirmation-assurance,
and confirmation-verifier policies/profiles. Only the
allowlisted authority for the declared `policy_kind` may call it; one transaction
stores the immutable policy, creates its active generation-0 PolicyLifecycleHead,
empty lifecycle-history head, and emits `cairn.policy_import_receipt.v0.1` over
all three hashes and the authority
identity. Same-hash replay is idempotent and a conflicting canonical policy ID
denies. Receiver-channel or confirmation policy/verifier retirement/compromise
follows the same lifecycle and immediately invalidates every credential,
ConfirmationReceipt, BindingSet, gate, redemption, or handoff that bound the old
current head. There is no hidden “policy issue” writer.

`execution.release.import` and
`execution.source_credential_lifecycle.import` are authority-only insert-only
constructors, create the family-empty lifecycle-history head, and emit
`cairn.lifecycle_genesis_receipt.v0.1`. Release import additionally
stores and verifies the immutable signed ExecutionResourceBoundsProfile named by
the release, and `execution.execution_resource_bounds_profile.get` returns only
that exact object. Their receipt-read
operations return that exact object. After each dependency-family constructor,
the authority-internal `execution.trust_dependency_state.import` creates the
three empty assertion, released-exposure, and in-flight manifests, epoch-0 state,
one-entry directory, and generation-0 aggregate TrustDependencyStateHead;
atomically adds the stable dependency key to the healthy
ExecutionIntegrityStateHead inventory; and emits
`cairn.trust_dependency_state_import_receipt.v0.1`. All policy, credential,
identity, attestation, and release imports must complete this dependency-index
genesis before the object is eligible for execution. Transition operations reject
genesis, first event registration rejects null prior heads, and hidden bootstrap
writes are nonconforming.

`execution.integrity_state.import` is the sole insert-only integrity genesis and
is valid only before any execution dependency. `execution.integrity_state.get`
and `execution.integrity_inventory.get` return the current signed head and its
exact referenced manifest under the minimum status ACL. The internal
incident/incident-manifest, repair-audit, economic-resource membership-manifest,
historical-acceptance-evidence, and cancellation-credential-continuity receipt
gets are authority-internal unless an exact audit-detail DataGrant names their
minimized fields; none exposes credential handles or opaque account identifiers.
The internal
`execution.integrity_state.transition` accepts only the four causes and complete
before/after proof in `cairn.execution_integrity_transition_receipt.v0.1`; no
administrator flag, cache, or caller-selected state can substitute.

`execution.trust_inflight.register` is an authority-internal consequence of every
external-effect reservation commit, not an optional follow-up. It atomically inserts
the one exact in-flight leaf into every current dependency manifest before the
reservation becomes usable. `execution.trust_inflight.complete` may only promote
that same leaf through the **first** provider-assertion registration transaction
or remove it under exact pre-handoff fenced-non-submission proof. Later
authenticated stream events use the prior-assertion-chain registration branch
and never attempt a second in-flight removal. Its signed
receipt covers the complete dependency vector. Neither operation accepts an
agent/principal-selected dependency set.

`execution.remediation_resume_authorization.issue` verifies one fresh,
high-assurance principal signature against the current control namespace and
complete-frozen receipt and returns only the immutable authorization; it does not
write an exposure head. `execution.exposure_remediation.resume` is authority-
internal and consumes the canonical complete authorization set in the sole
receipt-wide CAS that may return remediation-frozen obligation, compartment,
resource, and affected ledger heads to nonfrozen states. Replay, partial-owner
sets, evidence-only calls, stale control heads, or per-root invocation deny.

The protected HTTP resource is exactly
`https://api.cairn.cards/cairn-execution/0.1/`; its messages route is
`/cairn-execution/0.1/messages`. The MCP protected resource/server identity is
exactly `https://api.cairn.cards/mcp/cairn-execution/0.1`. These are distinct from
the proposal-only resource. Cross-resource tokens/envelopes fail before dispatch.

`execution.provider_quote.import`, `execution.provider_event.import`, and
`execution.provider_review_artifact.import` accept only authenticated allowlisted
provider adapters through separately audited service bindings; agents and
principals cannot call them. The quote importer cannot create an order or session.
The review-artifact importer only records the authenticated result of a separate
ordinary effect with capability `obtain_provider_review`; that effect requires its
own disclosure authority, one-shot or mandate authority, gate, outbox, and
receiver receipt. Pure `execution.review.evaluate` then consumes the imported
artifact and never performs network I/O. `execution.action.reconcile.request`
can only enqueue/query an adapter and returns `unknown` until an authenticated
event import exists.

`execution.release_state.transition` and
`execution.policy_lifecycle.transition` accept only the separately authenticated
release/policy authority named by the current head. They implement the closed CAS
matrix in §5.3 and are denied to every ordinary principal/runtime/adapter. A
compromise successor additionally requires the live
`execution.trust_compromise.commit` transaction and cannot commit standalone;
retirement remains an ordinary authority-only transition.

`execution.binding_set.issue` is the sole binding-set constructor. It accepts
only the complete predecessor refs, verifies their exact hashes and current
state, and returns the signed immutable set. `execution.binding_set.get` follows
the private ACL matrix. Predecessor objects do not and cannot reference the set;
only objects from binding-set creation onward carry its ref/hash.

`execution.lineage_commitment.issue` is the sole public way to obtain the
required predecessor commitment; its authority-service allocation and semantic
idempotency follow §6. Runtime callers can request but never choose lineage IDs,
sequence, head, or fence. Lineage-state transitions are internal consequences of
commitment issue/expiry/supersession, reservation/activation/unredeemed release,
outbox, or authenticated provider import. Action preparation does not mutate the
lineage head; activation selects one exact prepared action. The registry exposes
only read access to signed heads after the issue operation.

`execution.disclosure.deliver` is callable only by the fenced outbox service
identity after gate/redemption; no principal, runtime, model, or adapter may call
it directly. It consumes the reservation and records handoff in one transaction.
`execution.disclosure_authorization.revoke` accepts an exact principal-signed
revocation command and advances the online disclosure state/nonce while
invalidating its exact held reservation atomically; it cannot retract a completed
handoff. Every private read operation internally commits the finite-read CAS and
receipt described in §5.1; callers cannot bypass it with another transport.

The frozen `action.prepare` remains proposal-only and returns its existing v0.1
action/receipt. After the binding set exists, `execution.action.prepare` creates
the first v0.2 execution ActionRecord bound to that exact binding-set hash. If a
base preparation already exists, the service discovers its canonical ref from
the pinned foundation index, verifies identical principal, proposal, effect,
deal head, and preparation receipt, then records it as an immutable source ref.
The caller cannot choose presence or absence. It never upgrades or reuses the
base action ID.

Bridge uniqueness is semantic, not caller-key-selected. The authority service
indexes `(profile_id, principal_id, execution_binding_set_hash)` and permits
exactly one v0.2 ActionRecord for that immutable review snapshot. Its action ID
derives from that tuple; the canonical source preparation is metadata, not an
identity choice. A quote/review refresh creates a new binding set and therefore a
new prepared record, but every record shares the same lineage commitment and only
one can win activation/reservation. A caller idempotency key is recorded only for
replay: a different key for the same tuple returns the original result or a typed
conflict.

Mandate revocation has one authoritative path only:
`execution.control.issue(scope:mandate, control_action:revoke)`. It advances the
same control head/nonce checked by gate and outbox and returns the standard
execution-control receipt. There is no separate mandate-revoke operation.

Private-access matrix:

| Operation family | Principal-direct | Exact runtime | Public/other |
|---|---|---|---|
| public capabilities/runtime policy | authenticated or public as registry declares | same | public fields only |
| intent/projection/private object | owner authentication | exact runtime-bound DataGrant, purpose, fields, count, expiry | deny |
| connection/mandate/authorization/compartment/control heads | owner authentication only | exact audit/control DataGrant scoped to named object/fields | deny |
| receiver-event stream heads / trust or receiver-identity manifests | owner authentication only, with manifests restricted to authority-internal integrity/compromise processing unless separately audit-authorized | exact audit DataGrant only for the named minimized fields; no manifest enumeration | deny |
| integrity incidents / economic-resource membership / historical acceptance / credential-continuity evidence | owner only through exact audit-detail authorization over named minimized fields; raw manifests and credential/account fields remain internal | exact audit-detail DataGrant only; no complete-set enumeration or credential handle | deny |
| execution.recovery_status.get | active exact-generation RecoveryGrant, or exact consumed-grant byte-identical use replay; only its closed projection and replay-bound transition receipt | deny | deny |
| activity.list | owner; privacy-minimized closed summary | exact activity-summary DataGrant with field paths | deny |
| activity.detail.get / detailed receipts | owner plus audit-detail authorization | exact runtime-bound audit-detail DataGrant | deny |
| mutations | exact principal signature or exact mandate branch | authenticated runtime plus all capability prerequisites | deny |
| execution.provider_quote.import / execution.provider_event.import | deny | deny | allowlisted authenticated adapter only |
| executor-credential / cancellation-cost imports | deny | deny | allowlisted authenticated credential broker/provider adapter only |
| release/source-credential/commerce-signer/policy/dependency-index/cap/receiver-identity-scope imports and transitions | deny | deny | exact allowlisted release, credential, commerce registry, policy, verifier, registry, adapter, or authority-service identity only |

Pagination totals, filters, cursors, existence errors, and timing MUST NOT reveal
hidden actions or principals. Activity summaries omit payee accounts, private
budgets, evidence, contact/shipping data, full warning text, and other agents'
authority unless explicitly field-granted.

MCP mirrors exact registry names with underscores. Tool descriptions/annotations
are hints, not enforcement. Financial tools accept typed refs/hashes, never
natural-language execution parameters. OAuth discovery, resource indicators,
PKCE, DPoP where required, and Cairn signatures remain necessary. Broad scopes do
not widen Cairn. `execution.authorization.issue` records an already signed authorization;
it never mints human consent.

A different agent cannot inherit or continue a pending runtime-bound execution
chain. With its own DataGrant it may read the privacy-minimized activity state or
request reconciliation; with fresh principal authority it may start a new chain
that references the prior terminal/unknown lineage as context. Changing runtime
inside a live chain requires a future principal-authorized handoff profile and is
nonconforming in v0.1.

## 12. Security and privacy

Required controls: transaction-bound consent; credentials inaccessible to the
model; executor egress allowlists; exact runtime/session/audience binding;
server-owned serializable ledgers/fences; strict schemas/JCS/signatures/I-JSON;
taint checks for each execution field; one economic `effect_id`; fenced outbox
and reconciliation; short-lived reviews/gates/quotes/authorizations; append-only
receipts; privacy-minimized activity plus separately authorized audit detail.

The audit record retains required hashes, refs, authority, review, reservation,
receiver IDs, and transitions under a named retention policy. Raw projections,
transcripts, and hostile content are not retained indefinitely by default. Hash
retention cannot prove recipient deletion.

## 13. Conformance and falsification

Every applicable property needs a positive case, negative case, and direct mutant.

Resource-bound vectors fill each dependency index, integrity inventory/incident
set, resource membership, credential alias/broker-instance manifest, receiver
identity scope, and transition manifest to its exact frozen maximum. The final
permitted admission succeeds and the next denies before changing any head.
Conformance proves the worst valid closure fits the implementation's strongest
serializable transaction; a deployment that cannot commit 32,768 head writes must
freeze a lower-bounded release. Null/unbounded counts, runtime widening, a second
overflow manifest, silent history deletion, or accepting new work under a full
epoch without an exact rollover fails. Restart resolves every complete transition
chain and checkout vector through its signed manifest/getter; an opaque root,
missing entry, wrong transaction ID, duplicate key, or count/root mismatch fails.
Reserve the maximum finality-event slots for an action before handoff, import all
eight events, and prove each consumes one slot; a final event releases unused
slots only when that event is the authenticated stream-closure event or carries
the irreversible-horizon proof. An ordinary business-final event retains the
tail. Admission that checks only current assertion count, over-eight profiles,
slot reuse, terminal leakage, or a handed-off event denied solely because the
global index later filled fails.

Profile/connection/data controls cover: cross-profile/resource/bundle/registry
downgrade; proposal-only byte drift; connection without mandate; wrong runtime
key or audience; OAuth refresh after revocation; key rotation; reconnection;
replay of prior active connection/control heads; exact field paths; sibling-
runtime replay; cross-principal reads; pagination/existence side channels; and
deletion nonclaims. A new connection for the same runtime cannot revive a mandate
bound to an old connection. Concurrent HTTP/MCP reads race the last finite grant
count; exactly one response handoff receipt commits. Runtime grants with null/
unbounded count, expiry, response bytes/items, missing/wrong query-bound branch,
or absent per-page charging deny. Disconnect races prove the joint connection/
control CAS blocks reads. Every read must commit one DataGrant state-transition
receipt and one response-handoff marker under the same transaction ID and the
two commitments carried by the read receipt. Crash before the joint commit
returns no private bytes; crash after it consumes the read even if delivery is
ambiguous. Missing, mismatched, or independently committed markers/transitions
fail. The final `1 → 0` read must atomically enter exhausted;
exhausted can never return to active. Disclosure after that read accepts only the
exact final-read payload under unchanged nonce/expiry and rejects every other
payload plus paused/revoked/expired state. Omit or substitute the unique
DataGrantReadReceipt, its prior/next heads, final-read fence, projection, fields,
purpose, or payload; replay a sibling receipt; and present a receipt that does not
prove the exact `active,1 → exhausted,0` CAS. Every case denies.

After the final read, race an exhausted-state disclosure reservation/handoff
against principal DataGrant revoke and authority expiry. Exhausted→revoked or
expired must win as an ordinary successor and block delivery; omitting those
edges, preserving the exhausted exception after their CAS, or requiring the user
to revoke only the separate DisclosureAuthorization fails.

Connection conformance races principal pause/revoke against authority-time expiry
and requires one `execution.connection_state.transition` winner to CAS both the
connection and connection-scoped control heads. A timer that changes only one
head, maps the control successor to anything but terminal `expired` with the
specified nonce/epoch rule, permits expired on another scope, installs a second
direct writer, or lets a private read operation bypass the one
DataGrant read-commit/state-writer path fails.
It also exercises connection-scoped `freeze_new_redemptions` and resume: the
connection head must advance active→active while binding the jointly changed
leaf commitment. Advance the aggregate control head for an unrelated scope while
retaining this exact leaf and valid membership proof: the connection remains
current. Mutate/remove the leaf, replay an old aggregate root, or store the
refreshable aggregate-head ref in the connection: the check fails. A control-only
write, missing connection successor, or unsupported connection state also fails.
Control namespace conformance issues generation 0 exactly
once through `execution.control_namespace.issue`; rotate without a prior revoked
generation, second genesis, hidden bootstrap, or missing initial active head fails.
Connection genesis separately races two issue/replay requests for one exact
ConnectionAuthorization: both derive the same state key and only one byte-
identical active head/control leaf exists. A random UUID, two current chains,
same authorization with changed hash, reconnect substitution, or revoke of only
one fork fails before a mandate/read can resolve the connection.
Connection-index vectors begin genesis with a null predecessor and require the
canonical empty after-map/head, then seal a nonempty index and continue importing
authenticated receiver events for its existing entries. Authenticated stream
closure or the profile's authenticated irreversible horizon removes exactly one
entry and its paired epoch assignments; business finality, local timers, UI
completion, and disconnect alone do not. A sealed index that refuses a legal
drain, accepts new reservation membership, returns to active, or strands an entry
after its authenticated horizon fails.

Authority/disclosure controls reject a supervised mandate without a one-shot
authorization; reject a preauthorized branch using a one-shot object as mandate;
omit/swap disclosure authorization, audience, field set, purpose, payload, or
delivery envelope; reuse a consumed disclosure fence; substitute DataGrant for
DisclosureAuthorization; revoke a DataGrant between gate and outbox; retry an
ambiguous delivery under the same authorization even with non-delivery proof;
revoke one DisclosureAuthorization while leaving its DataGrant active; and verify mode
downgrade can revoke data and economic authority through their separate
authoritative paths. Race two holds, attempt a second hold/delivery after
`consumed`, delete the delivered fence, or rewind `consumed → active`; exactly one
handoff can commit and every replay denies.
Each hold must also win an authorization-head `active → active` CAS that installs
its exact reservation ref/hash/fence; release/expiry clears that exact tuple, and
revoke/authorization-expiry invalidates it while clearing the fields. Restart
from only the signed authorization head and require revoke to recover and
invalidate the held reservation. A reservation created without the matching
head successor, two holds from one null tuple, an opaque root without an
enumerable ref, a hidden writer, or a terminal authorization retaining a usable
held reservation fails.

The release gate additionally mutates each signed gate-manifest field, source
attestation role/subject/controller, normalized dependency predecessor,
evaluation timestamp, per-code evidence set, and decision independently. An
unsigned GateRequest or GateResult, a request-reflecting projection, an active
wrapper over a revoked source, one generic signer relabeling another trust
domain, a backdated request, an expired dependency, a signed reservation for the
wrong action/binding/fence, or a forged all-pass vector fails. DataGrant controls
independently vary purpose, uses, scope root, audience, recipient, issue/retention
interval, active-zero, paused, exhausted, revoked, expired, and stale signed
predecessor. Historical ActionGet must remain readable after authenticated
connection, grant, policy, or gate-head successors while every corresponding
live gate rejects the captured head; altered old bytes, refs, signatures, or
chronology still fail. Receiver controls include a valid late event in an older
draining epoch and reject accepting-head substitution, epoch migration, skipped
successor, directory drift, and state drift. Compartment controls isolate orphan
reserved atoms, orphan reservations, duplicate matches, wrong fences, stale
held-atom roots, atom/event subset-root drift, balance drift, non-append-only
events, and recursively invalid map descendants. Terminal release tests both
split one-assignment identity receipts and one shared receipt different from the
receiver transition's atomic receipt.

Review controls independently mutate target, receiver, payee account, copy,
terms/cart, evidence, price, fees, shipping, tax, total, rail, executor, quote,
policy, expiry, runtime, mandate, compartment, control head, finality profile,
accounting policy, taint decision, warning set, required-acknowledgement set,
binding set, and deal head. Delete
or swap each binding independently in authorization, reservation, gate request,
gate result, action, redemption receipt, and receiver receipt. Provider blocks
cannot become warnings; unknown severity blocks; judged advice cannot satisfy an
enforced review; new UUID/signature cannot fork `effect_id`; refreshed quote
cannot evade a live/unknown lineage block.
They separately verify that financial capabilities require every financial
object, nonfinancial capabilities reject fabricated zero-money objects, external
nonfinancial effects retain finality, and pure review cannot perform network I/O.
Every registered capability is checked against the exhaustive class table;
bindable offers/counters/terms can never select the nonfinancial branch, and
every execution capability requires its exact receiver/finality fields.
Credential vectors give offers, counters, and terms acceptance only the
`receiver_channel/binding_obligation` branch; notices/evidence use
`receiver_channel/nonbinding`; payment and escrow use
`financial_value_provider_account`. Cross-branch substitution, missing current
channel-policy lifecycle, or a binding message on a nonbinding channel denies.
Typed nonbinding notices reject free text, economic/acceptance fields, unknown
codes/extensions, and any receiver channel that does not authenticate nonbinding
semantics. Cancellation rejects every nonzero, missing, or unknown fee.
Direct paired-checkout vectors require
`TERMS_MAY_BIND_BEFORE_PAYMENT` in review and both BindingSets, then in each
role's exact CheckoutRoleAuthorityBasisReceipt: the supervised branch binds its
one-shot authorization/transaction confirmation; the preauthorized branch binds
its principal-confirmed mandate issuance, scope index, and complete mandate
ledger set. Omit it from either role, mix authority-basis branches, acknowledge it only after
terms handoff, replace it with generic terms consent, or let payment failure
silently imply terms failure; every mutant denies or remains truthfully
`payment_blocked_after_terms` without a retry.
Evidence requests receive the same smuggling tests: free text, price/quantity,
offer/counter/acceptance/payment/terms fields, unknown codes, custom extensions,
or a channel that can form obligations all deny; only closed evidence codes,
copy refs, upload limits, and non-economic routing survive.
Confirmation vectors call only `execution.confirmation.verify` after the exact
authority is signed. Missing verifier operation, caller-selected pass result,
challenge/evidence mismatch, confirmation created by authorization issue, or a
receipt preceding its authority hash fails. Exact replay returns one receipt.
Retire or compromise the confirmation-assurance policy or verifier profile before
verification, gate, redemption, and handoff; every path denies against its exact
current lifecycle. Compromise either after a receiver assertion registers and
require the ordinary complete trust quarantine/remediation path. An unsigned
allowlist/config edit, stale verifier key, omitted lifecycle dependency, or
same-ID/different-profile fork fails.

Concurrency controls race two agents and app/MCP against the same remaining
budget; alias one provider account through two compartment IDs; remove proof of
disjoint provider sublimits; alias one provider trust domain through API/MCP/
adapter IDs; alias one physical account through two authenticated account IDs;
replay or quarantine the account-identity head; present merge evidence and prove
all affected roots quarantine before any ledger can reserve; replay stale compartment state;
include item value plus every mandatory obligation and incremental fulfillment
cost with exact compartment-ledger equality;
attack rolling-window boundaries/clock failure/overflow/rounding; reject civil
windows in v0.3; prevent refund replenishment without policy; swap finality/
accounting policy; reject stale or regressive provider events; and share freeze/
reservation namespace. Freeze one compartment alias by its resource-derived key,
then create/use an existing or future alias for the same key; every alias inherits
the same restrictive head. A verified disjoint child uses its own explicit key.
Create two compartment definitions over one economic-resource key with separate
local ledgers and race cap-sized reservations through each: both must CAS the one
EconomicResourceExposureStateHead and at most one wins. Key that head by
compartment/source/namespace, omit one alias atom from its union, substitute a
stale cap head, or update a compartment without the resource head; each mutant
fails. A verified-disjoint child succeeds only against its distinct derived head.
Cap-selector vectors import one generation-0 EconomicResourceProtectionCap head,
replace it under expected-head CAS while retiring the prior attestation lifecycle,
and require every alias/resource head to observe the same ref/hash/value. Reuse an
old higher cap, maintain two active selectors, replace without lifecycle
retirement, lower below exposure without freezing, or let an alias pick its own
attestation; each fails.
The cap-genesis golden vector has null exposure and membership-manifest fields;
only the later exposure import creates the empty signed membership manifest and
adds the resource key to integrity inventory. Supplying a fabricated empty
manifest at cap genesis, omitting it at exposure genesis, or making either
constructor update an existing resource fails. Close and authority-time expiry
vectors cover pending, active, exhausted, and frozen compartments with zero
atoms and no live or unknown obligations; they atomically close affected ledgers,
remove exactly one membership entry, and advance resource exposure. Any nonzero
atom, unresolved obligation, timer-selected successor, partial ledger close, or
membership removal without the same transaction denies.

Limit-ledger controls race two reservations for the last unit of every action,
rate, aggregate, window, lifetime, outstanding, compartment, and one-shot
consumption budget. Exactly one complete-set CAS wins. Delete/fork a ledger head,
change namespace/window/asset, omit it from the compartment root, consume a
one-shot twice, replenish without the exact AccountingPolicy refund receipt, or
let a public reservation operation write the ledger directly; all deny.
The principal-policy schema enum is tested directly against the exact closed
matrix: credential-style `revoked`/`expired` values fail, `frozen` succeeds only
on its named edges, and `quarantined → active` succeeds only with high-assurance
higher revision plus complete zero-quarantine reconciliation. Swap the credential
and policy enums, omit canonical asset from the stable policy ID, or alias two
assets; all fail golden vectors. Policy revision may change a value on an existing
ledger key but cannot add/remove/change a ledger kind or window discriminant.
Adding a seven-day window to a policy issued without one, deleting a window, or
creating an empty new ledger instead of history-preserving migration must fail.

Resource/lineage controls vary a Cairn ledger ID without changing provider root
identity and require the same economic-resource key; forge a root account or
sublimit locus; relabel the same root with a different enforcement locus; select
a runtime-chosen lineage; vary price by one unit after an unknown effect; create
parallel lineages; attempt a second effect after a finalized occurrence; swap a
supervised mandate ledger into a one-shot reservation; advance the compartment
with unrelated reservations while proving exact active membership; and mutate
the exact H0→H1 compartment reservation transition, exposure, sequence, or fence.
They also mutate the provisional lineage commitment, try activation without the
signed ordinary/cancellation one-shot authority, race two binding sets for one
commitment, delete the public commitment constructor, and require exactly one
activation winner without any content-address cycle. Reservation contains the
commitment/fence but never the later activation receipt.
They expire and replace provisional generations, race multiple prepared records
while activation selects exactly one, release an unredeemed reservation with the
exact joint receipt, and prevent an activated-but-unredeemed lineage from becoming
stranded.

Construction-order vectors reject a preauthorized LineageCommitment before its
exact confirmed mandate, while supervised/cancellation vectors reject a final
one-shot authorization before their BindingSet. Each valid branch follows the
separate §7 oneOf trace. The lineage active-state golden vector omits the
commitment field itself and receipt ref from its preimage; inserting either field,
or any reciprocal head/receipt ref, fails before hashing.

Hostile-context controls inject payee/executor/price/authority changes through
seller text, web, OCR, image metadata, model output, and tool results. Every
closed-registry field—including shipping/contact, provider operation, credential
audience, evidence, confirmation, idempotency, disclosure audience, and field
set—is deleted/mutated once. Only correctly authorized typed sources may provide
execution values; a runtime-signed proposal cannot launder them.
Credential mutants keep audience constant while swapping issuer, subject/session,
opaque handle, key confirmation, provider trust domain, stable root account,
account generation, root/child resource key, protection attestation, enforcement
locus, sublimit/proof/generation, bypass profile, receiver/channel identity, or
channel policy. Root-for-child, sibling-child, and same-audience/different-tenant
credentials deny. They revoke/quarantine the signing key or executor-credential
head between gate and handoff, attempt a terminal state → active, or substitute a
rotated binding into an old BindingSet. Every case denies before bytes or
credentials become available.
After handoff/finality, mark the exact executor binding forged, mis-scoped, or
mapped to the wrong principal/account. Only coordinator-backed quarantine may
advance its head; the stable binding dependency index must enumerate and
quarantine every affected in-flight/assertion and restore or freeze every
affected exposure. A broker-only quarantine, prospective-only treatment, missing
binding dependency, or still-green activity state fails.
The ExecutorCredentialBindingHead enum and matrix receive direct schema vectors:
`revoked`, `expired`, and `quarantined` are valid terminal successors of active;
`frozen` is schema-invalid. Swapping this enum with the principal-policy enum or
omitting either terminal revocation state fails before lifecycle tests run.
Import two different binding IDs that resolve to one underlying issuer/session/
handle/resource/key-confirmation tuple. They must resolve to one canonical
credential-instance key, one signed alias manifest, one instance state head, and
one instance-keyed TrustDependencyStateHead. Compromise either alias and require
the fixed-point transaction to quarantine the instance, every alias, and every
dependent in-flight/assertion/exposure entry. A second instance key, alias-local
empty index, omitted alias, post-quarantine alias import, or still-active sibling
binding fails.
Import multiple instances under one broker authority and require one bounded,
signed broker-instance manifest while its lifecycle head remains stable and
active. Compromise the broker: the same coordinator transaction seals imports,
quarantines its lifecycle, every instance/alias, every broker- and instance-keyed
reverse entry, and affected exposure. Revoke only configuration, quarantine one
child, omit the broker dependency, add an instance after sealing, use a missing
instance manifest, or leave a forged sibling principal/account binding active;
all fail. Every instance/alias-manifest mutation must have its exact before/after
ExecutorCredentialInstanceTransitionReceipt; a hidden manifest write fails.

Recovery controls cover freeze before/after redemption, receiver acceptance
before revocation, cancel/accept races, offline nonce failure, unknown state,
duplicate blocking, and invalid non-submission proof after handoff. Cancellation
mutants swap original action/effect/provider operation, accept request acknowledgement
as cancellation, release exposure before confirmation, and let a runtime cancel
without a separate principal control authorization. Reconciliation mutants let an
agent submit finality or import an unauthenticated/stale receiver event. They also
deny recovery-key resume, detailed audit reads, authority widening, and receiver
cancellation; swap cancellation authority, receiver account, original locator,
or expected state; substitute the cancellation confirmation receipt, assurance,
binding set, taint/review, executor, credential audience, or finality profile; and
exercise both authenticated locator variants after a lost provider response.
Recovery-grant vectors compute the upstream
`RecoveryGrantTransitionReceipt.control_successor_commitment_hash` over the
exact later control after-head/map/leaf tuple and shared transaction, then let
the `ExecutionControlReceipt` point back to that receipt. Adding a reciprocal
control-receipt ref to the recovery receipt, changing the successor tuple after
commitment, consuming the grant outside the joint CAS, or reusing it fails the
content-cycle and authority checks.
They exercise `accepted` as a schema-valid expected state: it succeeds only when
the exact current finality profile explicitly marks post-acceptance cancellation
available, and otherwise denies. Removing `accepted` from any binding,
authorization, or action discriminant, or treating irreversible finality as
cancellable, fails.
They advance original action/import heads between gate and handoff through every
cancellable and non-cancellable state; the atomic current-head/profile check is
required to send.
Cancellation-credential vectors use two accounts/contracts under one issuer,
audience, receiver, and provider-local operation ID. Only the binding derived
from the original handoff's exact account/contract scope may cancel. Reuse the
exact original credential, then rotate it and require the signed same-scope
continuity receipt. Swap account, contract, original binding core/head, original
outbox receipt, receiver namespace, subject/session, key thumbprint, or provide
only same-audience proof at authorization, BindingSet, reservation, gate,
redemption, action binding, or handoff; every variant denies before bytes or the
credential are exposed.
Every cancellation registers both canonical credential-instance dependencies:
the original handoff instance and the instance used to send cancellation,
deduplicated only when they are identical. Exact reuse still requires the
original alias's current head to be the same active handoff head. Replacement
requires a different current handle/key plus a receipt binding both instance
cores/state and the same receiver scope. Revoke or quarantine either dependency
between review, gate, and handoff; sending must deny. Omitting the original
dependency, aliasing a replacement to escape quarantine, or allowing continuity
evidence alone to revive the original fails.
Every cancellation also registers the stable current fee-source dependency.
After a valid zero-fee handoff, import an authenticated nonzero charge event. The
same transaction must create the event-derived UnexpectedReceiverChargeExposureCore,
issue UnexpectedCancellationChargeReceipt, quarantine the fee source/action, and
add the exact positive atom to the designated compartment/resource and every
affected principal monetary ledger. Reject-only behavior, warning-only activity,
an empty economic root, duplicate atom, missing manifest entry, or continued
capacity fails. Compromise or rotate the fee source before handoff and the
cancellation denies under ordinary complete-set rules. Fee-source transitions
advance lifecycle sequence on every edge but advance `fee_source_generation`
only for an authenticated source replacement. Revocation, expiry, compromise,
and unexpected-charge quarantine retain the source generation; equating it with
sequence or omitting the receipt's before/after generation pair fails.
Receiver-stream vectors race authenticated acceptance and cancellation events on
one effect: exactly one current-head CAS wins, and a same-sequence/different-
digest event quarantines. Omit the redemption genesis, vary the stream key,
replace the stream head with a raw import/cache object, remove its writer/receipt,
let cancellation bind a noncurrent stream head, or let outbox handoff alone claim
`submitted`; each fails. Handoff produces `unknown`; only an authenticated
provider-event import may advance to submitted/acknowledged/final state.
The no-event→unknown receiver-stream transition must bind the exact signed
OutboxHandoffReceipt ref/hash from the fenced handoff. A writer log, raw executor
claim, same transaction ID without that receipt, or receipt for another
action/effect/stream fails.
Crash before and after the outbox-handoff CAS: outbox handoff state/receipt and
receiver-stream unknown state/receipt must appear together under the explicit
outbox-handoff transaction class before bytes. Redemption or provider-import
transaction labels, or either half without the other, fail.
Receiver-stream genesis uses `receiver_evidence_kind:none`; handoff-created
unknown also uses `none` because receipt-of-bytes is still unproved. An
authenticated provider event whose classified state is itself `unknown` uses
`authenticated_event` and requires all event refs/digest. Any other nullability
combination fails. Import `submitted → accepted → fulfilled` and require each
later assertion to retain the exact in-flight manifest ref/hash/revision while
the dependency-head sequence and assertion manifest revision advance. Tying a
manifest revision to the head sequence, rewriting an unchanged manifest, or
re-promoting the first-event leaf fails.
Ordering vectors compare canonical uint64 values numerically (`10` follows `2`),
not lexicographically. Every event uses one immutable authenticated stream epoch;
equal sequence is only byte-identical replay, while reset, leading zero, signed/
fractional/exponent encoding, parallel cancel/reversal substreams, or a second
epoch within the action quarantines or denies under the finality profile.

Receiver-event identity vectors create both event-ID and sequence heads in one
insert-only transaction, replay the same core exactly, then independently reuse
the event ID at a new sequence and the sequence under a new event ID. Each
conflict must quarantine the complete existing key/counterpart set, receiver
streams, trust assertions, handed-off in-flight actions, and economic roots in
one receipt. Treat the combined event-ID+sequence tuple as the only unique key,
accept a strictly newer conflicting core, create only one of the two mappings,
use an action-local cache, or point identity heads back to the later receipt and
recreate a content-address cycle; each fails.
Delete/fork the scope-index head or either signed identity manifest after restart:
the stable scope entry in the global integrity inventory forces profile-wide
fail-stop rather than treating the missing key as new.
Bind event ID X under combined scope A and sequence Q under combined scope B,
then present an authenticated incoming core that splices X and Q. The one
equivocation receipt must carry the canonical complete fixed-point vector of both
scope-index/manifests and every reached counterpart. Quarantining only the
incoming combined scope, only A, only B, or a singular arbitrary index fails.
Under global pause/freeze/revoke, ordinary actions and runtime cancellations deny,
while an exact principal-present zero-fee safety cancellation for a pre-restriction
handoff may proceed without releasing exposure. Delete or widen any safety-field
restriction and it denies. Safety construction requires cost attestation, then
principal preparation intent, then commitment/review/binding set, then separate
authorization/confirmation; any forward-ref/cycle or use of preparation as send
authority denies. Swap/stale the zero-cost fee source, present variable/unknown/
nonzero cost, or charge unexpectedly; handoff denies or the provider is
quarantined with exposure held. Advance the canonical fee-source head after an
otherwise unexpired zero-cost attestation; every old review/BindingSet/
authorization/gate/handoff denies against the new generation. Remove its import,
writer, receipt, or current-head recheck and the registry fails. Rotate a revoked control namespace only through the
fresh high-assurance principal CAS; every old connection/mandate/pending action
remains unusable in the new generation.
Control-receipt golden vectors create generation-zero namespace with the exact
new namespace object and null prior fields, then rotate only from the prior
revoked head while binding both prior namespace and new signed namespace.
Supplying ExecutionControlAuthorization on either namespace branch, supplying a
namespace object on global/scoped/connection control, omitting the prior revoked
head on rotation, or inventing an issuance/rotation `control_action` fails.

Recovery-grant mutants reuse one grant, omit its state head, race consume/revoke/
expiry, change scope/action, or present an unexpired old-generation grant after
namespace rotation. Exactly one restrictive control use may atomically consume
the active grant; every replay, direct writer call, terminal successor, resume,
or cross-generation use denies.
Authenticate only as the recovery key and call every private `get`: only
`execution.recovery_status.get` may return, and its response is exactly the
allowlisted fields plus opaque target/time/signature metadata. `expired` appears
only for the paired connection scope. Drop a successful one-shot response after
`active → consumed`, replay the byte-identical signed request/digest, and require
the same transition receipt and minimal post-control projection without mutation.
A different digest/action/target/nonce, ordinary status read under a consumed
key, or replay after revoke/expiry denies. Mandate, payee,
amount, evidence, unrelated receipts, activity detail, and object-existence differences
remain unavailable.

Safety cancellation is exercised separately under restrictive global,
connection, runtime, mandate, compartment, and action heads. The preparation
intent/authorization must bind the exact triggering scope and target while the
gate proves the complete current lattice; changing “applicable” to global-only or
letting a less-specific active head override the restriction fails.

Control-lattice mutants pause or revoke each ancestor scope, present a more-
specific active child, omit membership proofs, replay a scoped head, or attempt
child resume through an ancestor restriction. Connection disconnect must CAS both
connection/control heads; every read/gate/outbox checks both. Every path denies.
Global pause/freeze/revoke state is explicit and restrictive even with current
epochs; resume changes state only under fresh principal authority. Pause/freeze/
revoke one `action_control_key`, prepare any number of refreshed ActionRecords
for the same occurrence, and try to activate each alias; all inherit the same
restriction. Object-ref action targets and generation/key substitution deny.
Freeze/revoke a compartment resource key, present another compartment alias or
create one later, and attempt a child-active override; reservation, gate,
redemption, and handoff all deny.

Registry/transport controls remove each disclosure/control/import/bridge
operation; route `mandate.revoke` outside the unified control head; reuse a base
action ID as an execution action; fork two execution actions from one binding set;
fork one binding set by varying only an idempotency key; omit or select an
optional base source; refresh quote/review into a new binding set while racing
one lineage activation; remove binding-set issue/get or provider-review import;
collide the frozen `capabilities.get`
with `execution.capabilities.get`; mismatch either pinned dependency hash; and
attempt effectful A2A use. Every case denies or fails registry conformance.

For every mutable state family, conformance enumerates genesis and every closed
successor edge, requires exactly one registry writer/caller/CAS/receipt tuple,
and rejects an orphan head, a duplicate edge writer, a timer without its named
operation, a migration/admin bypass, or a writer that accepts caller-chosen next
state. DataGrant pause/resume/expire and provider-account generation transition
receive direct positive, negative, and race tests.

Outbox/release mutants crash before and after the handoff CAS, attempt both
mutually exclusive receipts, release on timeout/unknown/local assertion, reuse a
client reference, and call pre-submission cancellation after handoff. Only a
fenced non-submission or authenticated policy-allowed receiver event releases.
For every capability, race each mutable prerequisite from eligible at gate/
redemption to ineligible before handoff—including compartment/protection,
reservation membership/limits, signing-key/executor-credential lifecycle and
credential-to-root binding, universal obligation state/role/amount/attempt/fence,
deal/proposal/listing/copy/cart/terms/ask/named-
market state, quote/review/taint expiry, receiver eligibility, checkout reversal/
attempt/readiness, inventory, original cancellation state, receiver-channel
policy, cancellation zero-cost/fee-source state, checkout successor/adoption
receipt, and disclosure state/source-read provenance. The handoff snapshot must
deny and bind the exact current proof set.

Confirmation/finality controls substitute a claimed method for authenticated
confirmation evidence; swap challenge, RP, user-verification flag, verifier,
verifier profile/lifecycle, assurance policy/lifecycle, authority, or binding
set; reuse one-shot confirmation; apply a finality profile
to a different capability, operation, event schema/version, adapter/version, or
receiver account scope; and reject every false-final transition.
The golden challenge vector proves the one acyclic derivation for mandate,
ordinary one-shot, and cancellation authority.
Provider events with equal ID/sequence and different digests quarantine; exact
duplicates are idempotent; only a strictly newer valid transition can finalize.
Identity includes receiver account/contract and declared sequence-stream scope.
Both fields must equal the signed finality applicability tuple.

Checkout controls attempt payment before receiver-confirmed exact terms, swap
either action/effect/cart/terms/seller/core/role/state head, omit the terms
receipt from payment gate, call payment directly, set the v0.1 atomic-provider
field non-null, redeem terms without both authority/reservation chains and a
readiness fence, double-debit or prematurely release the one obligation exposure,
and exercise terms/payment failure, cancellation, reversal, expiry, and unknown
outcomes without rollback.
Strictly newer events reconcile both unknown states. Fresh payment after confirmed
non-submission/failure binds the same core/obligation and never retries an
ambiguous payment or repeats terms acceptance. Every attempt generation binds its
own proposal/binding/authority/reservation while preserving stable payment
semantics and effect.
Advance an authenticated incremental fee after definitive non-submission: the old
group must become `payment_semantics_superseded`, and only a fresh adopted-
obligation group with exact new payment semantics may continue. Mutants that
change amount/components inside the old group, reuse its authority, supersede an
unknown payment, or exceed the obligation cost ceiling deny.
They race a paired conditional fence against terms confirmation and authority/
reservation expiry; before the winning terms CAS there is no item transfer or
component spend, only uniquely keyed conditional component holds. The payment
BindingSet accepts exactly one acyclic transition template→readiness→successor
chain and rejects a forward reference or mutation of deal, listing, copy
availability, inventory reservation, ask, market, cart, terms, group, attempt, or
obligation head. A review or BindingSet whose inventory stage is `checkout_held`
must carry the exact CheckoutReadinessReceipt ref/hash that produced those held
heads; a seller transition receipt alone, an inferred current held state, a
sibling readiness receipt, or a readiness ref on any other stage denies.
Authenticated terms confirmation always moves the obligation first to
`receiver_bound_inventory_pending` and the group to
`terms_confirmed_inventory_pending`. A direct terms-pending→fulfillment-locked
edge, payment gate before the seller consume/successor receipt, or a
payment-unavailable branch that rejects the accepted terms fails. Terms confirmation after payment
expiry discharges the conditional attempt, retains item exposure, and enters the
typed payment-blocked path. Repeat the same confirmation from `terms_unknown` and
`terms_unknown_payment_unavailable`: both must enter inventory-pending first;
neither may write `receiver_bound_ready` until the seller consume and exact
CheckoutTermsSuccessorReceipt choose the payment-blocked outcome.
Both outcomes require the typed CheckoutConditionalAttemptTransitionReceipt in
the same serializable successor transaction. Its complete vector binds the exact
conditional payment subreservation and authority, provisional/active-or-
discharged lineage before-and-after heads,
compartment transitions, resource-exposure transition receipt, limit-ledger
transitions, and atom delta. Remove, substitute, duplicate, or partially commit
any element; point to an untyped activation/discharge object; or recover after a
crash with a different transaction ID, and the group successor/payment gate must
deny. Exactly one activated-or-discharged receipt may consume an attempt fence.
They adopt an existing accepted, unfulfilled
obligation (`receiver_bound_ready` or definitively `fulfillment_retryable`)
directly into payment-ready state only by equality with its exact prior terms
receipt, current obligation/failure proof, and complete accepted product heads, while
forbidding a new group terms effect or second acceptance. Direct and checkout retries race two next generations; exactly one
wins the current-attempt fence and neither repeats item transfer or a component ID.

Apply authenticated terms reversal before seller consumption, after consumption
but before payment, during reversal exposure, and after irreversible fulfilled
completion. The pre-consume case must first enter the paired inventory-release-
pending states while preserving item/mandatory exposure, then consume the
independent seller-signed release receipt before reaching released reversal. The
post-consume unfulfilled cases use `reversed` with conservative atoms, while
post-fulfilled reversal uses `quarantined` plus frozen quarantine exposure. Any
direct pending→reversed edge, group-only `terms_reversed`, fabricated seller
rollback, `fulfilled → reversed`, inventory unconsume, or missing restoration
atom fails.

Paired-reservation mutants serialize two receipts from the same signed H0, let
one role include the sibling delta, omit either role authority-basis receipt/
lineage/subreservation, substitute a mandate for a supervised basis (or vice
versa), omit one mandate ledger, overlap atom ownership, or vary the complete
union ledger set.
Only the one CheckoutAuthorityReservationBatchReceipt may commit the two
disjoint roles and common H0→H1; either the full batch wins once or no authority,
ledger, obligation, or group head changes.
The batch activates only the terms lineage and creates one `conditional_held`
payment subreservation whose lineage remains provisional. Race terms confirmation
against payment-authority expiry: exactly one conditional-head CAS either
activates the payment lineage once or discharges/fences it once. A payment
activation receipt in the batch, a second activation at terms successor, an
undefined generic authority-reservation head, or redemption from
`conditional_held | discharged` fails.
After a terms successor activates payment, race payment redemption against
authority expiry, principal revocation, semantic supersession, and fenced
non-submission. Redemption may win only with the current authority and consumes
the subreservation once. Each non-redemption winner requires one
CheckoutActivatedPaymentReleaseReceipt, a terminal matching `activated_*`
subreservation, the exact `active → fenced_non_submission` lineage receipt,
`payment_blocked_after_terms` or
`payment_semantics_superseded` as appropriate, the unchanged accepted obligation
apart from exact attempt-only hold release, and balanced compartment/resource/
ledger/atom transitions in one transaction. Omitting the receipt, releasing the
item or mandatory obligation, freeing holds after ambiguous handoff, leaving an
activated lineage behind, or reauthorizing from a nonterminal attempt fails.
For each release cause, omit or substitute its one required proof branch: signed
deadline plus service time, restrictive control leaf/receipt, typed semantic-
supersession receipt, or fenced-non-submission receipt. Each mutant fails, as
does any invented mutable ActionAuthorization state head, missing current
authority-limit ledger, consumed redemption fence, or cause field from a
different branch.

Readiness vectors start from the template's exact inventory predecessor heads and
permit only the seller-writer saga's prepared→held delta. Freezing the predecessors as
unchanged, selecting different copies/seller/expiry, or guessing a successor hash
denies. The readiness receipt contains the prior group head and independently
precomputable ready-state commitment but never the ready-group head ref/hash; the
ready head points one way to the receipt. Adding the reciprocal ref or including
the commitment field in its own preimage fails the golden DAG vector.

Inventory saga mutants crash before/after each of prepared, local pending, seller
held, final readiness, terms-fence, receiver-acceptance, seller-consume, and
payment-readiness commits. They require the typed pending/unknown/failed states,
preserve both sides' holds while unknown, and release each side only by its own
writer/proof. A buyer-authority write to seller inventory, a purported cross-
owner atomic CAS, a missing seller receipt, terms redemption before the exact
terms fence, payment readiness before seller consumption, or permanent orphan
after a proved pre-handoff expiry fails. Race the held deadline against terms
handoff: handoff wins only after `terms_fenced`, whose state cannot expire while
acceptance is unknown; a delayed timely acceptance consumes the same exact copy.
Recovery from `inventory_hold_unknown` must construct the readiness receipt from
that exact predecessor, and every saga field must be present in the ready-state
commitment.
Race two overlapping prepare requests under different reservation IDs; the
shared seller-owned per-copy lease heads allow at most one atomic set-CAS winner.
Attempt to import or transfer the same canonical copy under a different seller or
ownership generation while any prior lease is prepared/held/terms-fenced; the
single global copy-key head must reject the second genesis/transfer, and every
readiness/gate/handoff rechecks that exact current head.
Rotate, retire, revoke, and compromise both the seller-inventory signer and the
copy-ownership-registry signer between review, reservation, fence, consume,
gate, and handoff. Routine rotation/retirement with any nonterminal reservation
or copy must fail the complete empty-drain proof; after an authoritative empty
snapshot it succeeds only with exact registry continuity and fresh downstream
binding. Race prepare against active→draining: prepare either serializably commits
first and must appear in the subsequent snapshot, or drain-begin commits first
and prepare denies. A pre-drain snapshot, prepare admitted while draining,
direct active→rotated/retired edge, drain completion with one remaining entry, or
drain abandonment without the same empty proof fails. Under the current draining
head, clear every preexisting lease through each admissible branch: a terms
handoff predating drain may later accept and consume; proved nonacceptance/
reversal/non-submission may release to available; unresolved state may
quarantine. Each transition binds the exact drain-begin receipt and unchanged
generation, and a draining copy-registry role co-signs. Substituting an active or
terminal head, accepting a terms handoff created after drain, omitting a role
receipt/signature, adding a copy, preparing/holding/fencing, or changing economics
fails. After clean rotation, prepare an available head recorded under the prior
draining generation only through the complete continuity history to current
active; crossing retirement/restriction or reviving consumed/quarantined fails.
Emergency
revocation/compromise invokes the
stable-key reverse closure that makes last-observed inventory locally ineligible
and freezes Cairn-owned in-flight actions, assertions, and exposure without
writing a seller head. Require the compromised/offline seller to sign its own
quarantine, let the coordinator sign a seller copy/reservation head, or block the
local restrictive authority head pending seller cooperation—each fails. A
cryptographically valid signature under a stale generation, configuration-only
allowlist removal, standalone restrictive head without local closure, or omitted
signer dependency also fails. Then exercise all three cleanup-only recovery
dispositions with one restrictive role and with both roles restrictive. Every
authorization must bind owner-consented semantics, exact current authority bases,
the same predecessor reservation/copy set, branch evidence, successor
commitments, fresh nonce/expiry and all role signatures. Accepted terms may only
produce consumed successors and payment-blocked local cleanup; proved
nonacceptance/reversal/non-submission may release the reservation but must
quarantine every copy; unresolved compromise may only quarantine while retaining
exposure. Any available successor, new hold/fence, changed copy/terms, transfer,
missing active-role co-signature, wrong recovery registry, replay, or independent
per-copy partial commit fails.
For ordinary, draining-cleanup, and restrictive-recovery multi-copy transitions, recompute the same
self-excluding parent commitment in every child receipt before constructing the
parent's complete child-receipt root. Make any cleanup child commitment null,
bind a different parent semantic, omit one child, or include the child root/
after-head/receipt ref in the commitment preimage; each fails, with the last case
rejected as a content-address cycle.
After handoff, each signer compromise must create the matching exclusive
ReceiverAssertionTrustStateHead reason and trigger dependency. Omitting either
new reason, swapping seller-inventory for copy-registry, or using
`dependency_incomplete` for a known signer compromise fails.
Ordinary inventory vectors reserve an offer/counter/acceptance through the
OrdinaryDealInventoryCommitment and exact global copy head from review through
BindingSet, authority reservation, seller fence, redemption, and handoff. Replace
it with the frozen baseline seller-namespaced inventory object, transfer the copy
to a new seller/generation mid-chain, omit the global lease root from any stage,
or use checkout-only fields in the ordinary union; each fails. Checkout golden
vectors continue to use their own template/readiness branch.
Generate every inventory context/stage cross-product. Ordinary review through
handoff accepts only `ordinary_held`; paired checkout review/BindingSet/batch
reservation accepts `checkout_prepared` and later readiness proves the held
successor; refreshed checkout may bind `checkout_held`; existing accepted-
obligation adoption requires `adopted_obligation + adopted_consumed`. A generic held requirement,
prepared ordinary action, consumed direct terms action, or checkout readiness
that mutates the earlier review fails.
Crash after `terms_fenced` but before redemption: pending-claim abandonment must
win against redemption in both checkout and ordinary-deal families, unblock only
the matching seller fence, and permanently deny later outbox creation.
Post-redemption abandonment and an abandonment proof for another
group/deal/obligation/action/effect/fence deny.

Obligation controls omit or substitute the universal exposure core/ID/state,
attach fulfillment to a sibling deal/listing/copy/payee/asset/market, pay before
receiver-bound state, debit item value in both obligation and fulfillment
reservations, release on unknown/submission alone, or create a non-checkout
payment without an exact core. They also carry one negotiated obligation into a
checkout group and prove the exposure-role transfer preserves one item debit
while adding each incremental rail risk once. Swap attempt generation, prior
failure/non-submission proof, item-transfer fence, or component root; retry from
unknown; or let non-checkout obligation state change before handoff. Every unsafe
variant denies. Recompute obligation ID after mutating origin, head refs/hashes,
payee account, mandatory component/source/root, cost ceiling, market,
offer-window start, or acceptance deadline and enforce the one-ID→one-core index.
Test receiver acceptance at deadline minus one tick, exactly at the deadline, and
one tick after it; only the first is timely. After a timely receiver-bound
transition, advance beyond the acceptance deadline and prove a separately current
payment attempt remains eligible. Late acceptance quarantines and preserves
exposure. A receiver accepts at deadline minus one tick but its event arrives
after local close: the timer may only move the submitted offer into
`acceptance_window_closed_unresolved` with every atom held, and the later event
must still reach `receiver_bound_ready`. Any local `sent_unresolved → expired`,
release, or terminalization mutant fails. Exhaustively generate every forbidden state/attempt/fence/component-root/
exposure-role/amount tuple. Omit/swap component source kind/ref/hash/line ID,
change ID for the same semantic source, collide IDs across sources, or recharge a
retry component; all deny. Item and every mandatory component transfer atomically
once, mandatory source lines cannot reappear as incremental components, and the
state amount always equals the exact compartment-ledger hold/spend.

Ledger conservation mutants delete/add/duplicate one hold, spend, refund, or
reversal atom; diverge a root from its numeric sum; reduce current outstanding on
reversible fulfillment; count one atom in reserved and reversal simultaneously;
or expose an intermediate role-transfer/refund state. Each fails the exact §5.2
equations and one-transaction CAS. A provider balance already net of native holds
must normalize under policy or deny rather than double-subtract.

Authority-limit mutants race the last unit of every principal and mandate count,
rate, aggregate, rolling-window, outstanding, compartment window/lifetime, and
one-shot ledger. In particular, two actions individually below a mandate's
per-action limit but jointly above its narrower aggregate/window/outstanding cap
share that mandate's exact money heads and at most one wins. Window eviction,
outstanding release/refund, restrictive freeze/resume, and compartment
exhaustion/recovery each require their one typed writer cause and exact complete
before/after set; a recovered ledger cannot leave its compartment permanently
exhausted, and a frozen compartment cannot resume without dependency closure plus
fresh principal control.
Issue two mandates and two one-shot authorities for the same principal/domain:
every path must resolve one stable PrincipalExecutionLimitPolicy head and the
same principal ledger keys, independent of mandate/authorization revision.
Changing policy revision preserves all committed atoms and may only restrict
capacity. Delete or fork the policy head, key a principal ledger by a mandate, or
use another asset/domain and the reservation denies.

Compartment vectors reject issuance unless `per_action ≤ outstanding ≤ configured
≤ enforced_cap` in one asset. Mutate any one of those values or attempt an action
above per-action/configured/outstanding/provider cap while backing remains high;
reservation and handoff must still deny. Cap reduction freezes old over-cap
exposure rather than silently treating configured ceiling as a label. Reducing a
cap to a value still at or above current exposure **and every nonclosed member
compartment configured ceiling** permits only the joint
`(cap:active, exposure:active)` successor; reducing below either threshold
permits only `(cap:frozen, exposure:frozen)` plus the complete incompatible-
compartment freeze set. Active/frozen, frozen/active, an active incompatible
compartment, or a frozen/frozen pair for the fully at-or-above case all fail.
Freeze or quarantine a cap while exposure is below it: the same transaction must
still make the exposure head non-active, and reservation/redemption/handoff must
deny. Exercise `(closed,closed) → (quarantined,frozen) →
(quarantined,closed)` for late historical remediation; every other cap/exposure
state cross-product fails.
Create a zero-atom compartment whose configured ceiling exceeds a proposed lower
cap alongside another compartment that carries all current atoms. The signed
membership manifest must still enumerate and freeze the zero-atom compartment.
Omit it from the manifest, derive membership only from atom contributors, mutate
the manifest without the exposure head, or omit any member from the cap receipt's
complete transition vector; each fails, including after restart from signed state.

Generation mutants advance account or child-sublimit generation while retaining
an old compartment, mandate, review, BindingSet, reservation, gate, credential,
or handoff. Every old chain denies before new submission and exposure already
submitted/unknown stays held. Only a fresh principal-accepted compartment and
fresh mandate can target the new generation.

Child-sublimit mutants additionally revoke, expire, quarantine, or advance the
current ProviderSublimitIdentityHead while replaying its old proof/cap/locus/head
through compartment, mandate, review, BindingSet, credential, reservation, gate,
or handoff. Missing transition/import/receipt operations or status-URL-only
freshness fails registry conformance.

Lineage activation mutants add an after-head ref to the activation receipt,
remove or alter the transaction ID/next-state commitment, or create reciprocal
receipt/head refs. They fail schema or hash-graph conformance. The valid vector
computes the next-state commitment first, signs the receipt over the prior head
and chosen action, then writes the active head that references the receipt.

Lifecycle controls retire, emergency-revoke, and quarantine the execution
release and each policy. New gates accept only active heads; late events use the
historically bound policy when retired and quarantine rather than finalize when
trust was emergency-revoked. Prepared ActionRecords reject every future ref;
append-only ActionStateHeads require refs exactly as state advances.
Lifecycle terminal states cannot reactivate the same hash, and stale or ordinary-
caller transition attempts deny. A post-retirement compromise must advance to
emergency-revoked/quarantined and immediately stop historical classification.
Every accounting/finality/review/taint/receiver-channel/confirmation-assurance/
confirmation-verifier lifecycle begins only
through `execution.policy.import` and its immutable import receipt; hidden policy
issue, lifecycle genesis by transition, wrong authority kind, or missing
receiver-channel lifecycle fails registry conformance.
Every later execution-release or policy transition must have the exact signed
ReleaseOrPolicyLifecycleTransitionReceipt obtainable through its registered
private getter. Delete the receipt, swap immutable object or authority, skip a
sequence, alter effective time/cause, or present only a current head in a
historical acceptance chain; verification fails. Scheduled retirement never
uses a compromise receipt, and compromise never commits outside the complete
trust-coordinator transaction.
For the first non-genesis release, policy, source-credential, commerce-signer,
or provider-identity-overlay
transition, the receipt must bind and CAS the exact signed empty history head
created by genesis. A null predecessor, a different empty head, or a history
successor not adding that exact receipt fails; only the genesis receipt itself
has no history predecessor. Provider-identity-overlay vectors must additionally
construct both genesis and first successor as an acyclic graph: the overlay head
has no history ref, the history is resolved by its stable history key, and the
history successor points one way to the overlay successor and receipt. Add an
overlay→history back-reference at genesis, or a receipt→overlay→history→receipt
loop at first transition; both fail before hashing.
Execution-release and source-credential heads begin only through their dedicated
import operations and LifecycleGenesisReceipt. Every dependency kind begins with
the named three-empty-manifest TrustDependencyStateHead import before first
in-flight reservation or assertion registration, and that same transaction adds
the stable key to the healthy signed integrity inventory. Null-predecessor
transition genesis, first-event genesis, first-reservation genesis, a missing
assertion/exposure/in-flight manifest, an inventory/head mismatch, or duplicate
stable-key genesis fails.
Source-credential vectors reserve and hand off under generation `g`, then rotate,
retire, or expire that credential and install authenticated same-authority
generation `g+1` before the receiver event arrives. The in-flight leaf remains in
one stable dependency index and promotion under `g+1` succeeds only with the
complete continuity receipt chain and identical trust-domain/account/event-source
scope. A new empty index, reuse of the old key/session, unrelated authority,
generation rollback, or permanent stranding fails. Later proof that generation
`g` itself was compromised filters the stable index and quarantines every entry
whose trust depended on it without treating `g+1` as the same credential.
Quote-source vectors import one provider quote through adapter A under source
credential generation K, then rotate, retire, or compromise K and A
independently before gate and after handoff. Import requires the typed
ProviderQuoteImportReceipt and exact raw-artifact mapping; pre-handoff stale
heads deny, while post-handoff compromise reaches every derived assertion and
exposure through both stable dependencies. A bare provider ID/signature, missing
importer lifecycle, quote expiry substituted for revocation, or key rotation
without continuity fails.
Retire generation `g` without installing a new credential: lifecycle `sequence`
must increment while `credential_generation` remains `g`. Then deliver one event
whose exact bytes/scope/sequence were independently anchored before retirement,
one independently reauthenticated by a distinct current active source credential,
and one supported only by a receiver timestamp/new signature. The first two
register only through their closed source-credential evidence variants, bind the
historical generation's terminal head plus the current family head, and include
the old and active reauthentication dependencies; the third denies. Separately,
retire a policy and require its independent active policy-profile revalidation.
A policy profile may not authenticate a source. Equating lifecycle sequence with
credential generation, using a transition reason outside the source-head enum,
mixing anchor/policy/reauthentication fields, self-reauthentication, or omitting
either dependency from the registration vector fails.
Rotate a provider account or sublimit through several valid generations, register
in-flight actions and assertions under each, then compromise one historical
generation. All generations must resolve through one stable dependency key/core
and one reverse-index head; filtering must include every entry bound to the
compromised generation. Keying a new empty index by generation ObjectRef,
omitting a historical entry, leaving the provider trust overlay eligible, or
leaving a dependent historical assertion green fails. The external registry
head may remain active as last-observed truth and is never coordinator-signed.
Repeat with the registry authority offline: the coordinator-signed overlay,
history successor, action/assertion quarantine, and economic freeze must still
commit. Requiring a registry signature, placing a coordinator signature on the
external account/sublimit head, omitting the overlay from review/BindingSet/gate/
handoff, or observing generation `g+1` without its registry transition receipt
fails.
Separately restrict an active account and sublimit at lifecycle sequence `s` and
identity generation `g`. Each valid revoked/expired/quarantined successor has
sequence `s+1` and generation `g`; only `generation_advanced` produces generation
`g+1`. Equating generation with sequence, incrementing generation on restriction,
or retaining sequence on any successor fails. The same rule applies to account
revocation/expiry/quarantine and every sublimit terminal edge. Every value gate,
reservation, redemption and handoff requires external status `active`; presenting
a valid revoked/expired root with an otherwise eligible overlay denies rather
than mapping it back to active or inventing coordinator quarantine.
Receiver-channel policy vectors exercise both exact closed branches. A
nonbinding payload containing price, quantity, terms, acceptance, or payment
data; an unknown/free-text/mixed semantic; or a channel whose receiver, resource,
audience, operation, capability, or payload schema differs denies. A binding
obligation without its authenticated rule or complete held exposure also denies.
For both delegated and principal-direct execution, substitute a credential whose
`principal_id` differs while every audience/account/channel field matches; review,
gate, and handoff must fail before credential exposure.
The policy's authenticated receiver account/contract scope and operation
namespace must be byte-equal through credential binding, mandate or one-shot
authorization, review, BindingSet, finality applicability, action request,
outbox, and handoff receipt. Hold issuer, audience, receiver, and payload constant
while changing tenant, contract, namespace, or the explicit scope-selection
proof; every path denies. An implicit provider default, omitted scope, or request
envelope narrower only in prose is never authority.
Retired-policy finality accepts only an independently anchored pre-retirement
event or new active-policy revalidation; backdated/unanchored evidence denies.
Compromise the execution release, every finality/accounting/receiver-channel/
confirmation-assurance/confirmation-verifier policy, source credential,
executor-credential binding, adapter
identity, provider account/sublimit, quote-source credential,
seller-inventory authority, copy-ownership-registry authority, and protection attestation
both before and after an assertion was
accepted: current trust becomes quarantined, green/current-final state disappears,
new delegated value freezes, and released exposure is conservatively reinstated
or the affected economic root remains frozen. Historical receipts and completion
tombstones remain immutable and cannot be replayed as current trust. Repeat
while the release/policy/credential authority refuses or is offline: the trust
coordinator alone must sign the applicable Cairn-owned quarantined lifecycle or
provider-identity overlay head, transition receipt, and history successor. For
commerce-signer compromise it leaves seller copy/reservation heads unchanged
and locally ineligible until an independently authorized restrictive recovery
receipt is imported; for provider identity it leaves the external registry head
unchanged but quarantines the overlay. Requiring either external owner to sign
local restriction, letting the coordinator sign an external provider/seller
head or an ordinary rotation/retirement/expiry, letting the lifecycle authority
sign compromise quarantine, or mixing signer kinds across the three local
objects fails. After commerce-authority restriction, attempt seller release,
quarantine, consume, transfer, or new hold under the stale generation; each
fails, even if its signature verifies cryptographically. Attempt to re-import the
same canonical copy under a fresh authority or owner without a future versioned
ownership protocol; that also fails. Only the owner-preauthorized registry
recovery path may finalize or quarantine the exact existing set, and it never
makes the authority or copy eligible for new work. Local trust closure must
remain complete before and without external recovery. Race a provider-event
registration against each dependency compromise: it must either
commit into every exact dependency root before the freeze/CAS and be quarantined,
or deny; it can never release exposure outside any dependency root. Delete,
duplicate, substitute, or stale any complete-set dependency binding and finality
denies. The assertion and released-exposure roots use their two exact distinct
leaf grammars and the registration receipt carries both before/after pairs. A
leaf containing trust/receipt/dependency-head hashes, one ambiguous root pair,
an unchanged exposure root after capacity release/refund, or any reverse
reference into the later trust head fails conformance. In particular, a manifest
entry that points to the later trust head or registration receipt recreates the
forbidden content-address cycle and fails before hashing.
Register a nonfinancial external assertion with
`released_exposure_present:false`, then compromise each dependency: a
TrustQuarantineReceipt must remove green/current trust without inventing an
economic root or ExposureRemediationReceipt. Transition a fulfilled obligation
from reserved exposure into equal active-reversal exposure, then compromise its
finality dependency: `released_exposure_present` must be true and complete
economic remediation is required even though the numeric capacity delta was
zero. Mark a real release/replenishment/reclassification false or omit its
exposure receipt and the transaction fails. Restart with only signed heads,
manifests, and referenced commitments; the coordinator must enumerate the same
complete assertion/economic vector without an auxiliary database index. Missing,
unsorted, root-mismatched, or incomplete manifests put the entire execution
overlay into `execution_integrity_unavailable`; any partial freeze, live gate,
green current view, or invented index fails. Exact-byte storage restoration must
precede the complete coordinator transaction.

Integrity fail-stop vectors delete or corrupt, in turn, one inventory entry, one
TrustDependencyStateHead, and each assertion/exposure/in-flight manifest or
referenced commitment while racing a principal-direct mutation, delegated
mutation, private read, review, confirmation, reservation, gate, redemption,
handoff, provider-event import, and current-trust presentation. Exactly one
authoritative healthy-head CAS may win: otherwise the integrity head becomes
`fail_stopped`, all execution paths deny, and capabilities may report only that
state. A process-local flag, unsigned database inventory, partial-service stop,
or healthy result without a complete signed inventory is a failing mutant.
Recovery must enumerate the signed inventory; resolve every dependency's epoch
directory, all live and sealed epoch-state maps, reservation assignments, and
branch-exact manifests; resolve every receiver-identity epoch directory and both
resource active-membership and historical-incident-overlay maps; commit every
typed incident resolution; and install one signed
`fail_stopped → healthy` receipt in the same transaction. Missing one key,
repairing bytes without the audit, resuming before a compromise commit, or
independently flipping healthy fails.
Independently trigger a receiver-identity conflict whose quarantine walk finds a
missing manifest. The fail-stopped head must retain a signed typed incident with
the authenticated incoming core, exactly the one or two directly collided
identity/core seeds, and the
unresolved storage loci—without claiming the still-unknowable complete closure.
After byte restoration, recovery recomputes the fixed point and commits its exact
complete ReceiverEventEquivocationReceipt before the incident is removed. While
already fail-stopped, discover another trust or storage incident and require a
monotonic `fail_stopped → fail_stopped` manifest add; no ordinary execution may
resume. Repeat for a trust compromise and pure storage corruption. A falsely
complete detection vector, compromise-only root, opaque queue, incident deletion
before the one recovery transaction, wrong resolution-receipt kind, nonempty
healthy incident manifest, or resume that drops an incident fails.
For the combined equivocation-plus-missing-storage vector, the same incident's
required-resolution set contains both receiver-event-equivocation and integrity-
repair receipts. Recovery names that incident in the repair audit, restores every
recorded locus byte-for-byte, recomputes closure from the explicit incoming core,
and only then satisfies the semantic receipt. A single-kind discriminator,
missing incoming-core ref/hash, “pure storage” relabel, or either receipt omitted
must keep the overlay fail-stopped.
Accumulate multiple incidents, resolve each with a different required typed
receipt set, and restart before the health transition. The resolution map must
be enumerable, have one exact entry per before-incident key, prove complete
receipt-kind coverage and both end cursors, and become visible with the empty
after-incident map. A hash-only receipt root, missing entry, extra incident,
wrong receipt kind, or partial scan cannot restore health.

Before any external-effect reservation is usable, its exact complete dependency
set must contain one in-flight leaf. Race dependency compromise at reservation, gate,
handoff, and pre-assertion provider-event boundaries: the coordinator must find
the leaf and cancel the unredeemed action, freeze already-held handed-off
financial exposure, or preserve a no-economic handed-off action as blocked and
unknown. Provider assertion registration—including rejection, cancellation, or
failure—must atomically remove that leaf and add the assertion/optional-exposure
leaves; only fenced pre-handoff non-submission may remove without promotion.
Timeout, worker belief, an authenticated terminal shortcut, or a separate action
table may not. Omit one dependency, leave both in-flight and promoted leaves,
create a visibility gap, or remove a leaf without the exact receipt and the
vector fails.
Golden vectors cover one bindable financial action, one nonbinding notice, one
evidence request, and one zero-cost cancellation. Every reservation gets an
in-flight leaf; the latter three use empty economic roots. Authenticated reject,
cancel, and failure events promote their leaves to assertions, and any event that
releases financial capacity also installs the released-exposure leaf before the
release is visible. A financial terminal-removal branch or an unregistrable
nonfinancial assertion fails schema closure.
For one handed-off action, import authenticated `submitted → accepted →
fulfilled` events. Only `submitted` may use `inflight_promotion`; `accepted` and
`fulfilled` must each bind the exact current prior event/assertion/trust head,
leave every in-flight root and manifest unchanged, and add their own assertion/
remediation leaves. Re-promoting the missing leaf, skipping a later assertion,
changing an in-flight manifest, or chaining from a stale prior head fails.

Compromise two dependencies sequentially and concurrently for an assertion or
in-flight action shared by both. The second complete manifest walk records
`already_quarantined` or `already_restricted` with the existing receipt/disposition,
creates no second trust successor, duplicates no economic atom, and still covers
every key. Treating an already-restricted entry as absent, rejecting the complete
walk, or applying the economic delta twice fails.

Expire a source credential or provider sublimit after it authenticated a
release, then prove historical compromise; only the coordinator-only
expired→quarantined path may repair it, and no path reactivates it.

Reuse released capacity, then compromise the earlier assertion: the root must
atomically enter frozen remediation with explicit quarantine atoms even when
total conservative exposure exceeds its ordinary limit. New-hold capacity stays
zero. Race authenticated outcomes that resolve the newer exposure or an
unresolved commitment; only typed `frozen → frozen` remediation receipts may
change those roots, and resume denies until the unresolved root is empty and
exposure is within limit.
The same remediation transaction must install matching quarantine atoms/amounts
in every affected principal, originating-mandate, and compartment monetary
aggregate/window/lifetime/outstanding ledger, even when that ledger was closed.
Compromise an AccountingPolicy after its refund restored capacity, reuse that
capacity through another root, and require the invalid refund delta to reappear
in every still-applicable ledger before any resume. Omit aggregate, live-window,
lifetime, resource-exposure, or prior-closed heads; each fails. Attempts through
another compartment or mandate must see the shared principal ledger frozen.
Resume denies until every matching quarantine value is zero and prior closed
mandate ledgers return only to closed.
Create released history, close its zero-current compartment/resource heads, then
import a late compromise or reversal. Both heads must take the exceptional
closed→frozen edge, restore exposure, and return only to closed after resolution.
A coordinator-only `historical_incident_overlay_add` must add the exact frozen
compartment successor to the resource's enumerable historical-incident overlay
before any restored atom is visible; it never consumes one of the 64 ordinary
active-member slots. The resolved frozen→closed transaction removes that overlay
entry again. Replacing a nonexistent overlay entry, restoring atoms while the
compartment is absent from both active membership and the incident overlay,
retaining a resolved overlay entry, changing ordinary active-member count, or
granting capacity from an incident-overlay compartment fails.
A terminal-no-op or direct closed→active mutant fails. With two compartment
aliases under one resource, the remediation receipt must carry both compartment
before/after entries under one exact vector/root and one resource transition.
Ledger vectors require `effective = base + quarantine` before and after; counting
the quarantine delta in both base and quarantine fails conservation.

Unexpected-reversal vectors import one authenticated strictly newer reversal
event after `fulfilled`, verify the typed cause receipt, and require one
coordinator transaction to quarantine obligation/compartment/resource/ledger
heads. Missing cause schema, a raw provider claim, cross-effect receipt, stale
sequence, duplicate atom, or standalone obligation edit fails. Remediation tests
exercise evidence-only `quarantined → quarantined` through both
`incomplete_frozen` and `complete_frozen`. Neither result may restore any
obligation, compartment, resource, or ledger to a nonfrozen state. A distinct
principal-resume receipt must then carry the canonical complete fresh
RemediationResumeAuthorization set for every affected principal and atomically
produce receipt-wide `resolved_nonfrozen`: each obligation independently returns
to its exact recorded prior state after revalidation or enters `reversed` after
confirmation by reclassifying its quarantine atom to the non-outstanding
`confirmed_reversal` event class, including a valid mixed-disposition vector.
Any reversed successor retaining a quarantine/active-reversal root or unresolved
exposure fails. Missing one owner,
stale control head/epoch/nonce, replayed authorization, evidence-only resume,
per-root resume, or direct `complete_frozen → active` fails.
Mutate every `remediation_result`/after-head cross-product: only an incomplete
all-frozen vector, a complete-but-still-all-frozen vector, or a principal-resume-
only all-nonfrozen `resolved_nonfrozen` vector is accepted. Because economic roots
may share principal or mandate ledgers, `remediation_result` is receipt-wide and
each shared ledger appears once; a per-root result, partial root completion, or
duplicate/conflicting shared-ledger transition fails.
Drop a remediation response and invoke only `execution.exposure_remediation.resolve`
with the exact prior receipt/evidence: it must return one idempotent successor
chain that remains frozen. Invoke `execution.exposure_remediation.resume` with
the exact complete-frozen receipt and authorization set to obtain the sole
nonfrozen successor. Missing prior receipt, invented resolution operation, reuse
of an initial trigger union, or use of the resume trigger in `resolve` fails. For
every remediated head, compute the frozen or principal-resume
ExposureRemediationStateCommitmentPreimage before its successor/receipt; inserting
any successor ref, receipt ref, commitment field, head hash, or signature into
the preimage fails the golden vector and cycle check.

Delete the execution-release dependency leaf/hash from assertion registration or
current view, then emergency-revoke that release; conformance requires the same
complete-set freeze/quarantine/restoration path as any other dependency. A release
transition that commits a compromise successor outside
`execution.trust_compromise.commit` is rejected, as are standalone compromise
calls to policy, credential, account, sublimit, adapter, or protection-attestation
writers. Remove the normative adapter/protection-to-PolicyLifecycle mapping or
let an attestation's status endpoint substitute for its current lifecycle head;
registration, gate, and handoff must fail complete-set checks.

Compromise races begin with released exposure and concurrently attempt both a
delegated and principal-direct reservation/handoff on the same economic root.
`execution.trust_compromise.commit` must either win first and atomically expose
the restrictive dependency, all-value root freeze, trust quarantine, balanced
obligation/compartment restoration and remediation receipt, or lose to the
already committed action and conservatively include it in the frozen result. A
delegated-only freeze, visible lifecycle head before restoration/root freeze,
missing ExposureRemediationReceipt, duplicate reversal/restored atom, reverse
receipt ref, or hidden lifecycle writer fails.

Epoch/capacity mutants fill one trust or receiver-identity epoch while an action
retains a reversal tail, then admit unrelated work, roll over, and deliver the
late event. Each authenticated event must atomically increment exactly one
draining-epoch event-ID assignment slot and one draining-epoch sequence
assignment slot; an intermediate successor remains reserved and present in its
assigned epoch. Releasing tail slots at business finality, sealing an epoch with
live reservations,
assigning two actions one slot, rejecting the late event for capacity, or moving
the assignment to the new epoch fails. Historical source reauthentication must
atomically transfer its pre-reserved future-dependency slot; discovering a new
dependency without that pool reservation fails. Race two admissions for the
last future-dependency slot: exactly one `absent → reserved` assignment and one
pool-head CAS succeeds, while transfer preserves
`available_dependency_slots + reserved_assignment_count = slot_limit` and
terminal release alone removes the assignment and increments availability. A
fail-stopped or quarantined pool that grants capacity, a transferred assignment
missing from the current map, or a released assignment still counted fails.
Fail-stop a future-dependency pool through repairable storage corruption, restore
the exact bytes, and require the signed repair audit plus byte-identical map/count/
availability to move it back to active. Any changed capacity, missing assignment,
untyped recovery, or quarantined→active edge fails.
Rotate one source credential
through more than 128 consecutive lifecycle transitions, restart, and import a
late event bound to the original generation. The current lifecycle-history head
and paged map must prove the complete sequence range and exact branch evidence;
truncating at 128, skipping/forking a sequence, or relying on a process-local
chain fails. Fill the receiver scope's
concurrent outstanding-stream map to its frozen limit: the next admission must
deny before creating authority or handoff, while an authenticated stream closure
or fenced pre-handoff non-submission releases exactly its own assignments and one
map entry. A business-final event, timer, or unrelated stream may not release it.
For a horizon-only profile, import one typed AuthenticatedIrreversibleHorizonReceipt
and freeze one ReceiverTerminalReleasePlanCore enumerating the paired identity,
complete trust, optional future-pool, current receiver-stream head, and connection
assignments. Require the deterministic
ReceiverTerminalReleaseCompletionReceipt to prove one typed item per releasable
planned key under the same transaction while proving the receiver-stream head
byte-identical. The two identity items share one atomic
BoundedIndexEpochTransitionReceipt, while uniqueness is over
`(transition_receipt_ref, assignment_ref)` and each assignment ref is the
pre-transition identity; that receipt must contain both exact assignment
transitions. Requiring two distinct receipt refs,
accepting duplicate assignment keys, a fabricated horizon stream transition,
or an omitted unchanged-stream proof fails. Omit one trust assignment,
future slot, child receipt, or completion receipt; mismatch its count/root/kind
set; use local time/business finality; or release different assignments—the drain
and terminal presentation fail after restart. For normal handoff,
the outstanding-stream receipt must carry a null epoch-transition receipt plus
the exact unchanged assigned-epoch head; fabricating a no-op epoch transition or
omitting the unchanged head fails.
Construct both terminal trust manifests successfully, then substitute a checkout
manifest kind, a generic ObjectRef, a slot assignment in the transition manifest,
or a transition receipt in the assignment manifest. Every wrong-kind mutant
fails before terminal state is presented.
Rotate a provider from sequence epoch E0 to E1 after reserving one E0 action.
The stable selector must make E1 the only scope eligible for new reservation,
retain E0 as draining for the handed-off action, and preserve one cross-epoch
outstanding count. Selecting E0 for new work, accepting E1 without an
authenticated monotonic epoch proof, failing the E0 late event as unreserved,
or obtaining a fresh outstanding limit per provider epoch fails.
Inject a valid, authenticated, profile-legal event with no reserved identity or
trust slot. Import must retain the raw ReceiverEventImportCore, atomically record
the typed unreserved-event incident, install the directory fail-stop cause, and
deny every green read. Recovery must create branch-exact emergency epochs while
globally stopped, classify the retained event, commit identity/trust/stream and
economic consequences, and remove the incident only with the
UnreservedReceiverEventRecoveryReceipt. Dropping the event, treating it as an
ordinary capacity error, restoring health before classification, or allocating
emergency capacity while healthy fails.
Fill enough sealed epochs that
closure exceeds one transaction: the global restrictive barrier must commit
first in `fail_stopped_snapshotting` with empty progress maps and no plan, every
execution/current-trust/capacity read must deny, and snapshot partitions must
enumerate the frozen inventory/reachable heads to exact end cursors before the
snapshot-completion receipt installs the plan and enters applying. Race a
handoff/economic mutation against barrier genesis: either it commits before the
healthy-head CAS and appears in the stopped snapshot, or loses and denies.
Prebuild the snapshot while healthy, start semantic work before snapshot
completion, omit one source key, or require the initial transaction to materialize
an over-limit snapshot; each fails. Thereafter semantic partition order/root/
prefix must verify, and health may return only after the
typed completion receipt. Delete one source-snapshot entry, suppress one edge
discovered by a processed work item, forge an early empty frontier, alter one
source-membership proof, or omit one partition from the committed-receipt map:
fixed-point recomputation must fail and integrity must remain stopped. Partial
green publication, skipped/duplicate partitions, an untyped completion, or
clearing the barrier early fails.
Create two simultaneous integrity incidents A and B, complete A's trust closure,
and leave B unresolved. A's completion with `health_restored:false` must repeat
the exact same fail-stopped integrity head and pending-incident map with no
integrity transition; fabricating a partial successor or deleting A alone fails.
Only the later exact all-incidents resolution may produce the healthy successor
and empty map. Separately, fail-stop a receiver epoch selector and attempt repair:
omitting/substituting the incident on the fail-stop edge or the signed repair
audit on `integrity_repair_verified` fails even when every selector field is
byte-identical.
The trigger-derived seed map and seed-work map must have identical exact keysets;
the processed-work and `TrustClosureResultEntry` maps must have identical exact
keysets; and the consecutive partition sequence must equal the map of typed
`TrustClosurePartitionReceipt` entries under the registered
`closure_partition_receipt` map kind. Substitute a generic entry schema, leave a
result for only the state-changing subset, skip any end cursor, or allow the
coordinator to add/remove a seed outside deterministic derivation; completion
fails closed.
Drive a closure beyond every inline bound. Each quarantine, equivocation, and
exposure receipt must use `closure_partition`, bind one plan/snapshot/sequence/
processed-work subset, and remain upstream of the generic partition receipt.
The completion result map must equal the union of those typed subsets exactly.
Requiring a final unbounded semantic receipt, using a direct receipt with more
than 128 entries, omitting a partition receipt from the union, or adding a
semantic-receipt→partition-receipt back-reference fails.

Economic-enumeration mutants delete or alter one compartment reservation/atom/
confirmed-event map entry, one ledger-event map entry, or one resource-union atom
entry. Restart must fail-stop before presenting balances. Every transaction-sized
checkout compartment and ledger transition-manifest entry must resolve to the
typed transition receipt with matching stable key, cause, transaction,
before/after map heads, and exact delta. An opaque root, an untyped entry, a
resource union not exactly derivable from active-member plus historical-incident
overlay maps, or a zero-value ordinary member omission fails.
For every economic branch, construct the EconomicMutationCauseCore first and
then its entries, manifests, transition receipts, and parent receipt in that
order. Insert any after-head/manifest/receipt ref into the core; replace an
entry's core ref with the transition or parent receipt; or make a current atom
point to the receipt that points to its containing after-map. Each mutant must be
rejected as a forbidden content-address cycle before hashing. Restart resolves
the exact core from every atom/delta/ledger entry and proves all receipts bind it.

Checkout DAG mutants add a successor-head ref to the conditional-attempt receipt,
omit the payment lineage activation/terminal receipt, use
`fenced_non_submission` from provisional, or attempt two successor heads from
one next-state commitment. All fail. A canonical empty incremental-component
case must succeed with three signed empty manifests and null resource transition
while still advancing group, obligation, subreservation, and lineage atomically;
inventing a positive delta or refusing valid accepted terms fails.
Crash immediately after the independently signed seller consume transaction but
before Cairn's terms-successor CAS. Restart must use the same seller receipt and
successor idempotency key to commit or return the one Cairn result; pretending
the two authorities shared a transaction, replay-consuming inventory, or making
payment eligible before the Cairn successor fails. The authority may complete
clean rotation after that terminal seller CAS but before
Cairn imports it. The successor must preserve each active/draining/recovery basis
valid at inventory commit, resolve the current authority heads, and verify every
consecutive lifecycle-history receipt between them. Mixed active/draining roles
are checked independently and at least one exact drain-begin receipt is mandatory
for draining cleanup. Requiring the historical basis still be current, accepting
a basis that was invalid at commit, omitting/skipping history, changing the
canonical terminal inventory head, accepting a bare `<consume>` union for a
drain/recovery cause, or enabling payment from any noncurrent basis fails. Global-copy vectors permit an
ownership-registry-signed transfer only from `available` or `consumed`, require
the typed `SellerCopyLeaseTransitionReceipt`, and advance the same canonical
copy key/generation. A seller-service-signed transfer, registry-signed ordinary
lease edge, transfer from a live lease, missing parent receipt-root membership,
or changed seller without the transition receipt fails.

Scope/credential mutants present two broker handles for one credential-native
instance; both must converge on one instance key. Including the handle in the
key, leaving the broker instance manifest entry stale after alias rotation, or
using the registry signature for an ordinary instance-head update fails. For
every external financial, channel, and cancellation effect, remove or alter the
typed scope-selection proof, issuer lifecycle, account/contract, namespace,
resource, route template, or credential instance at each review-to-handoff and
receiver-import stage; every mutation denies. Retire/compromise the selection
issuer, review policy, or taint policy after reservation and before handoff; the
reverse dependency closure must fence the action.

Unexpected-cancellation-charge mutants start from a valid fixed-zero cancellation
and deliver one authenticated positive debit. The prebound incident sink must
select the exact principal, asset, resource, and zero-capacity incident
compartment; the transaction/closure must quarantine fee source and action,
add a closed compartment to the historical-incident overlay if necessary, add
exactly one atom and every principal ledger event, and expose all typed receipts.
Missing sink admission, post-event
sink invention, wrong asset/principal, reject-only behavior, duplicate atom, or
green capacity fails. Connection mutants omit expected predecessor sequence,
principal control authorization, or either signed outstanding-action index head;
reserve an action without adding its map entry; or remove an entry before fenced
non-submission/authenticated stream closure. Every nonconforming branch fails.

Human tests require correct answers to whether anything was sent, whether the
agent can spend, maximum exposure, exact seller/copy/rail, disconnect semantics,
green-state source, escrow release, and disclosed data. Before direct paired
checkout, the person must also correctly answer that terms may bind even if the
payment step is blocked, and that a new payment attempt needs its own still-valid
authority. Material comprehension failure blocks delegated value.

Binding equivalence runs one golden action through HTTP and MCP for the same
runtime. Exact object hashes match. A separate comparison creates two fresh,
independently authorized actions with equivalent semantics under different
runtimes; their published semantic projection excluding runtime/transport/key/
signature metadata must match for intent, proposal semantics, effect, terms,
exposure, receiver import, and final state. Runtime-specific authority and receipt
hashes differ and neither runtime may continue the other's live chain.

## 14. Implementation sequence

- **Phase 0:** preserve proposal-only bytes; separate execution package/profile.
- **Phase 1:** closed machine schemas/registry for connection, compartment,
  mandate v0.3, control, binding set, chain objects, consent receipts, and
  read-only activity; no executor or network review. The narrowed profile has
  29 schema-only reads, 46 object schemas in 50 schema documents, and no
  standalone map, transition-manifest, or compartment getter. `GateResult` is
  structurally deny-only, `RedemptionReceipt` is absent, recovery-bearing
  controls are structurally forbidden, and exhausted DataGrant heads cannot
  make a BindingSet eligible.
- **Phase 2:** pure review, taint, staleness, and UI over local terms, fixtures,
  sandbox fixtures, or previously authorized/imported quote snapshots; every
  receipt fixes `external_effect:false`. A live provider quote/review that
  discloses data or creates a provider session/order is excluded.
- **Phase 3:** human-authorized nonfinancial effect with reservations, effect
  lease, fenced outbox, cancel/reconcile, and receiver import. Any live provider
  review first appears here as its own disclosure-authorized, receipted effect.
- **Phase 4:** one human-present provider sandbox payment adapter with immutable
  quote, transaction confirmation, receipts, refunds, conventional checkout;
  release/waiver/dispute separate.
- **Phase 5:** low-value, single-asset, no-substitution, allowlisted delegated
  pilot with genuine external exposure limit and finite short-lived caps.
- **Phase 6:** broader commerce only after empirical evidence; release/waiver/
  dispute remains a separate decision.

### 14.1 Phase-1 containment amendment after rejected freeze 26b7016

Exact freeze
`26b701609583ec7e518526b0ae78aed46c10fc19` is rejected history. The
Round-39 informed regression, blind authority, and blind state/transition audits
showed that shape, hash, signature math, and caller-provided lookup results had
been combined into authority claims that the schema-only artifact could not
independently authenticate. The replacement profile therefore narrows before a
reference service is built:

1. These five operations are absent:
   `execution.transition_manifest.get`, `execution.enumerable_map.get`,
   `execution.compartment.get`, `execution.compartment_state.get`, and
   `execution.compartment_state_transition_receipt.get`. Maps and transition
   manifests remain bounded internal dependency vocabulary.
2. `GateResult.decision` is structurally `deny`; `RedemptionReceipt` is absent;
   recovery fields are structurally null. `ActionState` has no `gate_allowed`
   or post-redemption branch, and `ActionReceipt` admits only preparatory,
   reservation, cancellation, failure, and quarantine transitions with empty
   disclosure/obligation/checkout effects, null receiver evidence, and null
   economic exposure. `LineageProvisionalTerminalReceipt` and
   `CompartmentStateTransitionReceipt` are not members of `receipt.get`.
3. Nonempty outbound disclosures, nonempty external accounting maps, external
   protection claims, and financial external truth are unavailable.
4. `EXECUTION_CONTROLS` joins the unsupported gate set. Ten of the 19 checks
   therefore deny without representing an authenticated pass.
5. Caller-supplied object resolvers, key maps, current-head callbacks, role
   callbacks, Boolean ACL values, and external-verifier callbacks are
   conditional inputs. They cannot establish authenticated authority.
   High-level authenticated reads, gate evaluation, composite action
   validation, live cancellation, and joint-control currentness return
   `phase1_authenticated_resolution_unsupported` until a separately frozen
   rooted-proof profile can be verified locally. A caller-created flag, brand,
   key, or root does not cross that boundary.
6. Low-level helpers are structural or conditional consistency checks. An empty
   failure list from one is not an authorization, currentness proof, access
   decision, or conformance result.

Historical and live evaluation are distinct. Key resolution and current-head
resolution take the semantic evaluation instant. A historical gate uses
`evaluated_at`; a historical control or connection receipt uses `committed_at`;
a live current read uses its live evaluation time. A key revoked after the
historical instant remains eligible at that instant, and a head advanced later
does not invalidate a receipt that proved the prior head current at commit.
Missing authenticated history fails closed; it never falls back to the latest
record.

Joint connection/control validation uses one shared pair relation invoked from
both receipt directions. It binds the same authorization target, transaction,
commit time, aggregate transition, scoped leaf action/state, connection
transition, and outstanding-index head as of commit. Namespace and aggregate
control exact reads run intrinsic generation, predecessor, map-root,
epoch/nonce, and identity checks. Composite action reads run the intrinsic
current action-state predecessor chain.

One causal chronology applies across the retained control paths:
authorization and namespace signatures do not follow commit; predecessor
updates/signatures do not follow commit; successor updates equal commit;
successor signatures fall between commit and the receipt signature. Timestamp
equality is legal at the profile's one-second precision.

This document authorizes no execution service beyond Phase 0. The Phase-1
schema-only bundle requires a separately frozen machine bundle and mutation
audit before any service implementation. The post-Round-42 replacement passes
32/32 authored controls and registers 483 exact-once direct mutants locally;
those results do not become closure until the full mutation and clean-install
replays pass and are reproduced from the frozen containing commit by the fresh
review gate. Phase 2 requires that Phase-1 closure plus proof that
review is pure and makes no network disclosure/effect. Each later phase requires
its own frozen artifact, independent audit, mutations, and exit evidence. This
document does not authorize an execution service or Phase 5. A schema-valid
Phase-1 object is never evidence that an authority service accepted it, and no
caller or agent can promote the read-only profile into a writer or authenticated
reader by supplying a callback, resolver, Boolean, key map, or self-selected
root.

### 14.2 Phase-1 evidence amendment after rejected freeze ebd10f4

Exact freeze
`ebd10f4302e73846e73a3a38860581d9fba21c69` is rejected history. Three
Round-40 read-only reviews found no P0 or P1 defect, but found five material P2
classes. All five are accepted and remediated in the replacement candidate:

1. Activity is a privacy-minimized projection, not an alternate authority
   surface. Summary, detail, and list expose only `prepared`, `authorized`,
   `reserved`, `cancelled`, `definitive_failure`, and `quarantined`. They cannot
   disclose or imply `gate_allowed`, receiver confirmation/finality, spent
   exposure, redemption, or an external effect. Exact activity-detail reads
   invoke the same intrinsic relation rather than relying on schema shape.
2. Historical reads carry an authenticated semantic instant through every key,
   policy, and current-head dependency. `ActionGet` uses signed
   `ExecutionActionView.assembled_at`, which must equal the response
   `retrieved_at`; GateResult uses `evaluated_at`, and historical joint receipts use
   `committed_at`. A historical resolver is mandatory in historical mode; the
   validator never falls back to a live-only resolver. A later key revocation,
   policy transition, or head advance therefore cannot rewrite authenticated
   earlier evidence, while missing history fails closed.
3. Action chronology is a closed relation. A predecessor's update and
   signature cannot follow its successor's update; the successor signature
   cannot precede the successor update. For a receipt, predecessor update and
   signature cannot follow issuance, the successor update equals issuance, the
   receipt signature cannot precede issuance, and the successor signature
   cannot precede the receipt signature. Equality remains legal at one-second
   precision.
4. Authenticated receiver closure is transaction-correlated. The outstanding
   stream transition must name the exact closure evidence reference, authority
   transaction, and commit instant. Terminal completion must name the same
   closure evidence in both its release plan and receiver transition. A validly
   signed but cross-wired closure is invalid.
5. The shared connection/control relation is symmetric and complete from both
   receipt directions. It authenticates every dependency, binds aggregate and
   scoped before/after heads and maps, validates the index transition and
   control authorization, and proves the exact outstanding-index head current
   at commit. Until a rooted authenticated-resolution profile exists, both
   directions return `phase1_authenticated_resolution_unsupported`; neither
   direction can appear stronger than the other.

Each independent comparison and correlation edge above has an exact-once direct
mutation control. These local results are candidate evidence only. The rejected
freeze remains rejected even though its package was reproducible; the
replacement still requires a new containing-commit freeze and fresh blind and
informed review before Phase-1 closure. Reference-service construction remains
blocked.

### 14.3 Phase-1 provenance and bounded-read amendment after rejected freeze dd12269

Exact freeze
`dd12269c5a5dd8b2d6e69a6e579d9bc48a16f373` is rejected history. The
Round-41 blind authority and semantic reviews found one P1 and seven material
P2 classes in the historical-evidence and composite-read boundary. All are
accepted and remediated in the replacement candidate:

1. Historical-evidence mode is held only in module-private object-identity
   provenance. It cannot be created by a caller field, exported symbol,
   inherited property, or Proxy. Derived validator contexts retain provenance
   only when their source context was privately registered.
2. Proof validity, semantic eligibility, and evidence availability are separate
   instants. The signing key is resolved at `proof.signed_at`; current
   eligibility is resolved at the object's semantic event time; and an
   authenticated historical read rejects a proof whose signature follows its
   evidence snapshot. A delayed receipt signature is valid when it follows the
   event but does not follow the authenticated retrieval snapshot.
3. `execution.action.get` takes its snapshot only from the signed
   `ExecutionActionView.assembled_at`. The unsigned response envelope
   `retrieved_at` must equal that instant. Embedded signatures, histories, and
   current-head comparisons are all evaluated at the same signed snapshot, and
   a caller-supplied evaluation time cannot override it.
4. A historical BindingSet proves that both its captured connection head and
   captured DataGrant head were current at signed `created_at`. A missing
   historical resolver, stale head, or signature produced after the evidence
   snapshot fails closed.
5. Exact high-level reads authenticate every bounded dependency they rely on.
   An outstanding-index read authenticates its signed map root and each
   enumerable signed entry. Outstanding and activity entries authenticate the
   action, action state, ExecutionBindingSet, and LineageCommitment edges rather
   than accepting an internally coherent unsigned or alien subgraph.
6. The joint connection/control relation performs the same complete peer
   semantic validation in both directions. Its recursion guard is private
   object-identity provenance; caller fields and Proxies cannot suppress the
   peer validator.
7. `execution.activity.list` is a deterministic authenticated snapshot page.
   The response requires `retrieved_at`; its cursor is derived from the prior
   cursor, requested page/filter, retrieval instant, and final activity identity.
   It rejects duplicate identities, principal or state-filter drift, page/total
   inconsistencies, missing historical/current-head evidence, late signatures,
   and invalid signed action/binding/lineage dependencies.
8. The structural Phase-1 boundary is unchanged. All 29 operations remain
   schema-only and read-only; the high-level authenticated paths still return
   `phase1_authenticated_resolution_unsupported`. No passing helper, resolver,
   map, cursor, or signed dependency authorizes mutation, execution, payment,
   disclosure, or conformance.

Every distinct weakening above has an exact-once direct mutation control. The
candidate registers 480 unique mutants and passes 32 authored controls locally;
those numbers are not a release claim until the complete mutation suite,
disposable clean install, proposal-baseline replay, replacement containing
commit, and three fresh exact-commit reviews all pass. Reference-service
construction remains blocked.

### 14.4 Phase-1 derived-context and principal-scope amendment after rejected freeze 4d62c0f

Exact freeze
`4d62c0fd2d46b5eb182706ea07ce94d3af97798f` is rejected history. Its
Round-42 informed and blind exact-commit reviews reproduced every advertised
package and baseline control, then found three material P2 correctness gaps.
All are accepted and remediated in the replacement candidate:

1. Private provenance survives every derived validator context. A validator
   MUST derive overrides through the private provenance-preserving constructor;
   object spread or any other caller-visible reconstruction MUST NOT be used to
   enter a nested semantic validator. This applies to DataGrant predecessor
   chains, connection authorization, maps and path proofs, lineage transitions,
   receiver streams, and all future nested historical validation. A historical
   BindingSet therefore rejects a captured DataGrant predecessor whose proof was
   created after the authenticated evidence snapshot.
2. `execution.activity.list` requires an authenticated principal scope in its
   validation context. Missing, empty, or non-string scope fails as
   `activity_list_principal_scope_unresolved`; a signed item for another
   principal fails as `activity_list_principal_scope_mismatch`. The unconditional
   Phase-1 authenticated-resolution sentinel remains present, so neither result
   implies that a caller-supplied principal value authenticates access.
3. Every exact read binds proof availability to its authenticated retrieval
   snapshot, including operations that promise a current head. A current read
   uses `retrieved_at` for live currentness and as `evidenceSnapshotAt`; a valid
   object whose proof was created later fails `object_read_signature_from_future`.
   This snapshot rule does not convert a current read into historical mode and
   does not permit a historical resolver to replace live currentness.

The three new weakenings have isolated direct mutation controls, bringing the
candidate catalogue to 483 unique exact-once mutants. The structural boundary
is unchanged: 29 schema-only read operations, no mutation or external effect,
and no service or conformance authorization. This replacement again requires a
complete local replay, disposable clean install, containing-commit freeze, and
three fresh exact-commit reviews. Reference-service construction remains
blocked.

## 15. Audit protocol

The author cannot be the only verifier. Every finding receives one disposition:

```text
accepted_and_fixed
accepted_deferred_with_owner_and_trigger
rejected_with_case
duplicate
out_of_scope
```

Required rounds: informed architecture review; informed security/recovery/privacy
review; context-blind review given only the artifact; remediation; a new blind
closure review; and author replay.

P0 permits unauthorized/unbounded effect or corrupts authoritative history. P1
permits wrong recipient/amount/scope, budget/duplicate/revocation bypass, false
receiver finality, or material disclosure. P2 creates likely interoperability,
recovery, UX, or audit forks. P3 is editorial/hardening. No closure claim is
made while the Round-39 remediation is pending a fresh containing-commit freeze
and three-reviewer gate. A deferred P2 names owner, trigger,
safe interim behavior, and fail-closed basis.

## 16. Weakest point and serious alternative

The weakest point is serializable authority and honest reconciliation across
interfaces and external systems. A mandate is unsafe with separate counters;
cancellation is unsafe after receiver acceptance; review is unsafe if one bound
field can change. Only executable mutation controls establish these properties.

The serious alternative keeps BYO agents permanently in **Advise me** or
**Prepare for me**. Cairn remains the transaction workstation and the principal
authorizes every send, commitment, payment, disclosure, release, waiver, and
dispute. This retains portable intent, agents, evidence coaching, search,
preparation, and continuity with a smaller trusted surface. It is a valid end state.

## 17. Product promise

> Bring the agent you trust. Cairn holds the intent, limits, evidence boundaries,
> and accountable action record. Your agent may propose or act only through the
> exact permission you gave, and the receiver—not the agent—confirms what happened.
