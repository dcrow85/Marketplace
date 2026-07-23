import {
  BASE_BUNDLE_HASH,
  BASE_REGISTRY_HASH,
  PHASE1_OPERATIONS,
  PROFILE_ID,
  RELEASE_PHASE,
  SCHEMA_COMMITMENT_PROFILE,
  SPEC_SHA256,
  requestEnvelopeDefinitionName
} from "./profile.mjs";
import { PHASE1_OBJECTS } from "./objects.mjs";

export const EXECUTION_SCHEMA_ROOT = "https://cairn.cards/protocol/execution/schemas/v0.1/";
const COMMON = `${EXECUTION_SCHEMA_ROOT}common.schema.json`;

const nullable = (schema) => ({ anyOf: [schema, { type: "null" }] });
const array = (items, extras = {}) => ({ type: "array", items, maxItems: 128, ...extras });
const closed = (properties, required = Object.keys(properties), extras = {}) => ({
  type: "object",
  additionalProperties: false,
  maxProperties: 512,
  properties,
  required,
  ...extras
});
const ref = () => ({ $ref: `${COMMON}#/$defs/objectRef` });
const hash = () => ({ $ref: `${COMMON}#/$defs/hash` });
const money = () => ({ $ref: `${COMMON}#/$defs/money` });
const stringArray = (items = { type: "string", minLength: 1, maxLength: 65536, "x-cairn-max-utf8-bytes": 65536 }, minItems = 0, maxItems = 128) =>
  array(items, { minItems, maxItems, uniqueItems: true, "x-cairn-utf8-sorted": true });
const refArray = (minItems = 0, maxItems = 128) =>
  array(ref(), { minItems, maxItems, uniqueItems: true, "x-cairn-unique-by": "object_hash" });

const CAPABILITIES = [
  "send_typed_nonbinding_notice",
  "request_evidence",
  "obtain_provider_review",
  "submit_bindable_offer",
  "submit_counteroffer",
  "accept_terms",
  "authorize_payment",
  "fund_escrow",
  "cancel_receiver_action"
];

const ACTION_STATES = [
  "prepared",
  "authorized",
  "reserved",
  "gate_allowed",
  "redemption_committed",
  "pending_handoff",
  "submitted",
  "acknowledged",
  "unknown",
  "cancelled",
  "definitive_failure",
  "finalized",
  "quarantined"
];
const PHASE1_ACTIVITY_STATES = [
  "prepared",
  "authorized",
  "reserved",
  "cancelled",
  "definitive_failure",
  "quarantined"
];
const FINANCIAL_CAPABILITIES = ["submit_bindable_offer", "submit_counteroffer", "accept_terms", "authorize_payment", "fund_escrow"];

const POLICY_RESPONSE_SCHEMA_IDS = new Set([
  "cairn.confirmation_assurance_policy.v0.1",
  "cairn.confirmation_verifier_profile.v0.1"
]);

const RECEIPT_RESPONSE_SCHEMA_IDS = new Set([
  "cairn.connection_state_event_receipt.v0.1",
  "cairn.connection_outstanding_action_index_transition_receipt.v0.1",
  "cairn.receiver_outstanding_stream_transition_receipt.v0.1",
  "cairn.receiver_terminal_release_completion_receipt.v0.1",
  "cairn.execution_control_receipt.v0.1",
  "cairn.confirmation_receipt.v0.1",
  "cairn.lineage_activation_receipt.v0.1",
  "cairn.action_receipt.v0.2"
]);

const nullableFields = (properties) => closed(properties);

function commonSchema() {
  const objectRef = closed({
    schema: { type: "string", pattern: "^cairn\\.[a-z0-9_.-]+\\.v[0-9]+\\.[0-9]+$" },
    object_id: { type: "string", minLength: 1, maxLength: 512 },
    object_hash: hash()
  }, undefined, { "x-cairn-max-canonical-bytes": 4096, "x-cairn-max-json-depth": 32 });
  const signature = closed({
    profile: { const: "cairn-ed25519-v0.1" },
    key_id: { type: "string", minLength: 1, maxLength: 1024 },
    signed_hash: hash(),
    signed_at: { $ref: "#/$defs/timestamp" },
    value: { type: "string", format: "cairn-ed25519-signature" }
  });
  const moneyDef = closed({
    amount_minor: { type: "integer", minimum: 0, maximum: 9007199254740991 },
    asset: { type: "string", pattern: "^[A-Z0-9][A-Z0-9._:-]{0,31}$" }
  });
  const queryBound = closed({
    kind: { enum: ["temporal", "non_temporal"] },
    maximum_range_seconds: nullable({ $ref: "#/$defs/positive" }),
    maximum_keys_or_partitions: nullable({ $ref: "#/$defs/positive" })
  }, undefined, { oneOf: [
    { properties: { kind: { const: "temporal" }, maximum_range_seconds: { not: { type: "null" } },
      maximum_keys_or_partitions: { type: "null" } } },
    { properties: { kind: { const: "non_temporal" }, maximum_range_seconds: { type: "null" },
      maximum_keys_or_partitions: { not: { type: "null" } } } }
  ] });
  const lineagePolicy = closed({
    issuance: { const: "authority_service_derived" },
    principal_occurrence_nonce: { type: "string", minLength: 16, maxLength: 256 },
    principal_occurrence_id: hash(),
    derivation_fields: {
      type: "array",
      prefixItems: [
        { const: "principal_id" }, { const: "mandate_id" }, { const: "scope_binding_index" },
        { const: "capability" }, { const: "deal_or_cart_or_listing_copy_tuple" },
        { const: "authority_service_attempt_sequence" }
      ],
      items: false,
      minItems: 6,
      maxItems: 6
    },
    maximum_active_lineages: { const: 1 },
    maximum_completed_occurrences: { const: 1 },
    next_sequence_after: { enum: ["receiver_confirmed_cancelled", "definitive_failure", "fenced_non_submission"] },
    finalization_tombstone: { const: "permanent_for_signed_occurrence" },
    parallel_purchase_rule: { const: "none" }
  });
  const scopeBinding = closed({
    intent_refs: refArray(0, 64), deal_ref: nullable(ref()), counterparties: stringArray(), seller_id: nullable({ type: "string", minLength: 1 }),
    copy_ids: stringArray(undefined, 0, 64), listing_refs: refArray(0, 64), proposal_ref: nullable(ref()), cart_hash: nullable(hash()),
    ultimate_receiver_or_payee: { type: "string", minLength: 1 },
    receiver_account_or_contract_scope: nullable({ type: "string", minLength: 1 }),
    receiver_operation_namespace: nullable({ type: "string", minLength: 1 }),
    explicit_scope_selection_proof_ref: nullable(ref()), explicit_scope_selection_proof_hash: nullable(hash()),
    payee_account_commitment: nullable(hash()), rail: nullable({ type: "string", minLength: 1 }),
    asset: nullable({ type: "string", minLength: 1 }), data_grant_refs: refArray(0, 32), compartment_ref: nullable(ref()),
    economic_resource_key: nullable(hash()), provider_account_identity_head_ref: nullable(ref()),
    account_generation: nullable({ $ref: "#/$defs/uint" }), provider_account_identity_trust_overlay_head_ref: nullable(ref()),
    provider_account_identity_trust_overlay_head_hash: nullable(hash()), provider_sublimit_identity_head_ref: nullable(ref()),
    provider_sublimit_identity_head_hash: nullable(hash()), provider_sublimit_id: nullable({ type: "string", minLength: 1 }),
    sublimit_generation: nullable({ $ref: "#/$defs/uint" }), provider_sublimit_identity_trust_overlay_head_ref: nullable(ref()),
    provider_sublimit_identity_trust_overlay_head_hash: nullable(hash()), executor_target: { type: "string", minLength: 1 },
    accounting_policy_ref: nullable(ref()), receiver_finality_profile_ref: ref(), receiver_sequence_epoch_selector_key: hash(),
    review_policy_hash: hash(), taint_policy_hash: hash(), lineage_policy: lineagePolicy
  });
  const priceCorridor = closed({
    minimum: money(), maximum: money(), comparison_basis: { enum: ["listed_price", "recorded_settlement", "exact_terms"] }
  });
  const deviation = {
    anyOf: [
      { type: "null" },
      closed({ kind: { const: "amount" }, amount: money() }),
      closed({ kind: { const: "percentage_bps" }, basis_points: { type: "integer", minimum: 0, maximum: 10000 } })
    ]
  };
  const financialConstraints = closed({
    accounting_asset: { type: "string", minLength: 1 }, per_action_limit: money(), aggregate_limit: money(),
    outstanding_exposure_limit: money(), fee_limit: money(), tax_limit: money(), shipping_limit: money(),
    price_corridor: priceCorridor, maximum_ask_deviation: deviation,
    window_limits: array(closed({ amount: money(), window_kind: { const: "rolling" }, window_seconds: { $ref: "#/$defs/positive" } }), { minItems: 1, maxItems: 32 }),
    exact_terms_hash: nullable(hash()), exact_cart_hash: nullable(hash())
  });
  const nonfinancialConstraints = closed({
    maximum_payload_bytes: { $ref: "#/$defs/positive" }, allowed_audiences: stringArray(undefined, 1)
  });
  const mandateConstraints = closed({
    kind: { enum: ["financial", "nonfinancial"] }, financial: nullable(financialConstraints),
    nonfinancial: nullable(nonfinancialConstraints), max_actions: { $ref: "#/$defs/positive" },
    rate_limit: closed({ max_actions: { $ref: "#/$defs/positive" }, window_seconds: { $ref: "#/$defs/positive" } }),
    evidence_requirements: stringArray(), substitution_policy: { const: "none" }, warning_policy: { const: "deny_all" },
    accepted_transaction_semantics: stringArray(),
    safe_default: { enum: ["wait", "hold", "expire", "decline", "cancel_if_not_submitted", "release_never_submitted_local_hold"] },
    review_max_age_seconds: { $ref: "#/$defs/positive" }, not_before: { $ref: "#/$defs/timestamp" }, expires_at: { $ref: "#/$defs/timestamp" }
  });
  const disclosure = closed({
    disclosure_authorization_ref: ref(), disclosure_authorization_hash: hash(), source_read_receipt_ref: ref(),
    source_read_receipt_hash: hash(), source_read_next_state_head_ref: ref(), source_read_next_state_head_hash: hash(),
    source_read_fence: { $ref: "#/$defs/uint" }, projection_ref: ref(), disclosed_payload_hash: hash(),
    field_paths: stringArray(undefined, 1), audience: { type: "string", minLength: 1 }, purpose: { type: "string", minLength: 1 },
    delivery_envelope_hash: hash(), disclosure_reservation_ref: ref(), disclosure_fencing_token: { $ref: "#/$defs/uint" },
    disclosure_state_head_ref: ref(), disclosure_revocation_nonce: { $ref: "#/$defs/uint" }
  });
  const cancellationContext = closed({
    original_action_ref: ref(), original_action_hash: hash(), original_action_state_head_ref: ref(), original_action_state_head_hash: hash(),
    receiver_event_stream_state_head_ref: ref(), receiver_event_stream_state_head_hash: hash(), original_effect_id: hash(),
    original_operation_locator: closed({ kind: { enum: ["provider_operation_id", "precommitted_client_reference"] }, value: { type: "string", minLength: 1, maxLength: 4096 } }),
    expected_original_state: { enum: ["submitted", "acknowledged", "accepted", "unknown"] }, cancellation_operation_kind: { type: "string", minLength: 1 },
    receiver_account_commitment: hash(), receiver_account_or_contract_scope: { type: "string", minLength: 1 },
    cancellation_operation_namespace: { type: "string", minLength: 1 }, original_executor_credential_binding_core_ref: ref(),
    original_executor_credential_binding_core_hash: hash(), original_executor_credential_binding_head_ref: ref(),
    original_executor_credential_binding_head_hash: hash(), original_credential_instance_key: hash(), original_credential_instance_core_ref: ref(),
    original_credential_instance_core_hash: hash(), original_executor_credential_binding_current_head_ref: ref(),
    original_executor_credential_binding_current_head_hash: hash(), cancellation_executor_credential_binding_head_ref: ref(),
    cancellation_executor_credential_binding_head_hash: hash(), cancellation_credential_instance_key: hash(),
    cancellation_credential_instance_state_head_ref: ref(), cancellation_credential_instance_state_head_hash: hash(),
    cancellation_credential_continuity_receipt_ref: nullable(ref()), cancellation_credential_continuity_receipt_hash: nullable(hash()),
    cancellation_finality_profile_ref: ref(), cancellation_cost_attestation_ref: ref(), cancellation_cost_attestation_hash: hash(),
    cancellation_fee_source_state_head_ref: ref(), cancellation_fee_source_state_head_hash: hash(),
    cancellation_fee_source_generation: { $ref: "#/$defs/uint" }, safety_preparation_intent_ref: nullable(ref()),
    safety_preparation_intent_hash: nullable(hash())
  });
  const originalOperationLocator = closed({
    kind: { enum: ["provider_operation_id", "precommitted_client_reference"] },
    value: { type: "string", minLength: 1, maxLength: 4096 }
  });
  const transitionManifestEntry = closed({
    entry_key: hash(),
    entry_kind: { enum: [
      "lifecycle_transition_receipt", "compartment_transition_receipt", "limit_ledger_transition_receipt",
      "economic_atom_delta", "bounded_index_slot_assignment", "bounded_index_epoch_transition_receipt",
      "closure_snapshot_entry", "closure_work_item", "closure_partition_receipt"
    ] },
    entry_object_ref: ref(),
    entry_object_hash: hash()
  });
  const enumerableMapLeafEntry = closed({
    entry_key: hash(),
    entry_kind: { enum: [
      "connection_outstanding_action", "receiver_outstanding_stream", "compartment_active_reservation",
      "compartment_economic_atom", "compartment_confirmed_event", "scoped_execution_control"
    ] },
    entry_object_ref: ref(),
    entry_object_hash: hash()
  });
  const enumerableMapBranchChild = closed({
    nibble: { type: "string", pattern: "^[0-9a-f]$" },
    child_path_prefix_nibbles: { type: "string", pattern: "^[0-9a-f]{1,64}$", maxLength: 64 },
    child_node_ref: ref(),
    child_node_hash: hash(),
    child_subtree_entry_count: { $ref: "#/$defs/positive" },
    child_entries_root: hash()
  });
  const enumerableMapPathProof = closed({
    claim: { enum: ["membership", "nonmembership"] },
    map_root_ref: ref(), map_root_hash: hash(), entry_key: hash(),
    ancestor_node_refs: refArray(0, 64), terminal_node_ref: ref(), terminal_node_hash: hash(),
    absence_kind: nullable({ enum: ["empty_root", "leaf_key_mismatch", "compressed_prefix_mismatch", "missing_child"] })
  }, undefined, { allOf: [
    {
      if: { properties: { claim: { const: "membership" } } },
      then: { properties: { absence_kind: { type: "null" } } },
      else: { properties: { absence_kind: { not: { type: "null" } } } }
    }
  ] });
  const identityTransitionReceipt = closed({
    assignment_ref: ref(), assignment_hash: hash(),
    transition_receipt_ref: ref(), transition_receipt_hash: hash()
  });
  const sellerInventoryContext = closed({
    kind: { enum: ["ordinary_held", "checkout_prepared", "checkout_held", "adopted_consumed"] },
    context_ref: ref(), state_head_ref: ref(), copy_lease_heads_root: hash(), transition_receipt_ref: ref()
  });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: COMMON,
    title: "Cairn supervised execution Phase 1 common types",
    $defs: {
      hash: { type: "string", pattern: "^sha-256:[0-9a-f]{64}$" },
      uuid: { type: "string", pattern: "^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$" },
      timestamp: { type: "string", format: "cairn-timestamp", pattern: "^[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$" },
      uint: { type: "integer", minimum: 0, maximum: 9007199254740991 },
      positive: { type: "integer", minimum: 1, maximum: 9007199254740991 },
      objectRef, signature, money: moneyDef, lineagePolicy, scopeBinding,
      mandateAgent: closed({ provider_id: { type: "string", minLength: 1 }, product_id: { type: "string", minLength: 1 }, runtime_binding_ref: ref(), connection_authorization_ref: ref() }),
      mandateConstraints, disclosure, cancellationContext, originalOperationLocator, transitionManifestEntry,
      queryBound,
      enumerableMapLeafEntry, enumerableMapBranchChild, enumerableMapPathProof, identityTransitionReceipt,
      sellerInventoryContext,
      grantHead: closed({
        data_grant_ref: ref(), current_state_head_ref: ref(), revocation_nonce: { $ref: "#/$defs/uint" },
        required_purpose: { type: "string", minLength: 1, maxLength: 96 },
        required_uses: array({ enum: ["read_local", "derive", "disclose_to_audience", "retain_until_expiry", "write_object"] },
          { minItems: 1, maxItems: 5, uniqueItems: true }),
        required_resource_scopes_root: hash(),
        required_audience: stringArray(undefined, 1)
      }),
      checkResult: closed({ code: { type: "string", pattern: "^[A-Z0-9_]+$" }, decision: { enum: ["pass", "deny"] }, evidence_refs: refArray() })
    }
  };
}

function schemaForType(type) {
  if (type === "str") return { type: "string", minLength: 1, maxLength: 4096, "x-cairn-max-utf8-bytes": 65536 };
  if (type === "nstr") return nullable({ type: "string", minLength: 1, maxLength: 4096, "x-cairn-max-utf8-bytes": 65536 });
  if (type === "hash") return hash();
  if (type === "nhash") return nullable(hash());
  if (type === "ref") return ref();
  if (type === "nref") return nullable(ref());
  if (type === "refs") return refArray();
  if (type === "refs32") return refArray(0, 32);
  if (type === "refs64") return refArray(0, 64);
  if (type === "grantRefs") return refArray(0, 32);
  if (type === "copyIds") return stringArray(undefined, 0, 64);
  if (type === "uint") return { $ref: `${COMMON}#/$defs/uint` };
  if (type === "nuint") return nullable({ $ref: `${COMMON}#/$defs/uint` });
  if (type === "positive") return { $ref: `${COMMON}#/$defs/positive` };
  if (type === "bounded128") return { type: "integer", minimum: 0, maximum: 128 };
  if (type === "time") return { $ref: `${COMMON}#/$defs/timestamp` };
  if (type === "signature") return { $ref: `${COMMON}#/$defs/signature` };
  if (type === "money") return money();
  if (type === "nmoney") return nullable(money());
  if (type === "moneyArray") return array(money(), { uniqueItems: true });
  if (type === "bool") return { type: "boolean" };
  if (type === "tristate") return { enum: [true, false, "not_applicable"] };
  if (type === "strs") return stringArray();
  if (type === "hashes") return stringArray(hash(), 0, 64);
  if (type === "uris") return stringArray({ type: "string", format: "uri", "x-cairn-max-utf8-bytes": 4096 }, 1, 64);
  if (type === "uri") return { type: "string", format: "uri", "x-cairn-max-utf8-bytes": 4096 };
  if (type === "uuid") return { $ref: `${COMMON}#/$defs/uuid` };
  if (type === "oauthProfile") return closed({
    required: { const: true }, permitted_issuers: stringArray({ type: "string", format: "uri" }, 1),
    permitted_client_ids: stringArray(undefined, 1), exact_resources: stringArray({ type: "string", format: "uri" }, 1),
    dpop_required: { type: "boolean" }
  });
  if (type === "windowLimits") return array(closed({
    amount_minor: { $ref: `${COMMON}#/$defs/uint` }, asset: { type: "string", minLength: 1 },
    window_kind: { const: "rolling" }, window_seconds: { $ref: `${COMMON}#/$defs/positive` }
  }), { minItems: 1 });
  if (type === "mandateAgent") return { $ref: `${COMMON}#/$defs/mandateAgent` };
  if (type === "scopeBindings") return array({ $ref: `${COMMON}#/$defs/scopeBinding` }, { minItems: 1, maxItems: 64 });
  if (type === "mandateConstraints") return { $ref: `${COMMON}#/$defs/mandateConstraints` };
  if (type === "grantHeads") return array({ $ref: `${COMMON}#/$defs/grantHead` }, { maxItems: 32, uniqueItems: true });
  if (type === "queryBound") return { $ref: `${COMMON}#/$defs/queryBound` };
  if (type === "disclosures") return array({ $ref: `${COMMON}#/$defs/disclosure` }, { maxItems: 0, uniqueItems: true });
  if (type === "ncancellationContext") return nullable({ $ref: `${COMMON}#/$defs/cancellationContext` });
  if (type === "nsellerInventoryContext") return nullable({ $ref: `${COMMON}#/$defs/sellerInventoryContext` });
  if (type === "checkResults") return array({ $ref: `${COMMON}#/$defs/checkResult` }, { minItems: 1, uniqueItems: true });
  if (type === "originalOperationLocator") return { $ref: `${COMMON}#/$defs/originalOperationLocator` };
  if (type === "transitionManifestEntries") return array({ $ref: `${COMMON}#/$defs/transitionManifestEntry` }, {
    uniqueItems: true, "x-cairn-unique-by": "entry_key"
  });
  if (type === "hexNibbles") return {
    type: "string", pattern: "^[0-9a-f]{0,64}$", maxLength: 64,
    "x-cairn-max-utf8-bytes": 64
  };
  if (type === "nenumerableMapLeafEntry") return nullable({ $ref: `${COMMON}#/$defs/enumerableMapLeafEntry` });
  if (type === "nenumerableMapPathProof") return nullable({ $ref: `${COMMON}#/$defs/enumerableMapPathProof` });
  if (type === "enumerableMapBranchChildren") return array({ $ref: `${COMMON}#/$defs/enumerableMapBranchChild` }, {
    maxItems: 16, uniqueItems: true, "x-cairn-unique-by": "nibble"
  });
  if (type === "identityTransitionReceipts") return array({
    $ref: `${COMMON}#/$defs/identityTransitionReceipt`
  }, { minItems: 2, maxItems: 2, uniqueItems: true, "x-cairn-unique-by": "assignment_hash" });
  if (type === "actionState") return { enum: ACTION_STATES };
  if (type === "constnull") return { type: "null" };
  if (type === "constemptyarray") return { type: "array", maxItems: 0 };
  if (type === "json") return {};
  if (type.startsWith("enum:")) return { enum: type.slice(5).split("|") };
  if (type.startsWith("nenum:")) return nullable({ enum: type.slice(6).split("|") });
  if (type.startsWith("enumset:")) return stringArray({ enum: type.slice(8).split("|") }, 1);
  if (type.startsWith("exactset:")) {
    const values = type.slice(9).split("|");
    return { type: "array", prefixItems: values.map((value) => ({ const: value })), items: false, minItems: values.length, maxItems: values.length };
  }
  if (type.startsWith("const:")) return { const: type.slice(6) };
  if (type.startsWith("constint:")) return { const: Number(type.slice(9)) };
  if (type === "capability") return { enum: CAPABILITIES };
  if (type === "phase1ActivityState") return { enum: PHASE1_ACTIVITY_STATES };
  if (type === "mandateCapability") return { enum: CAPABILITIES.filter((value) => value !== "cancel_receiver_action") };
  if (type === "actionAuthorizationCapability") return { enum: CAPABILITIES.filter((value) => value !== "cancel_receiver_action") };
  if (type === "nonEmptyRefs") return refArray(1);
  throw new Error(`unknown Phase 1 field type: ${type}`);
}

const nullProperties = (names) => Object.fromEntries(names.map((name) => [name, { type: "null" }]));
const nonNullProperties = (names) => Object.fromEntries(names.map((name) => [name, { not: { type: "null" } }]));

function actionStateBranch(state, { nonnull = [], nulls = [], reservations = null, prior = "nonnull" } = {}) {
  const properties = { state: { const: state }, ...nonNullProperties(nonnull), ...nullProperties(nulls) };
  if (reservations === "empty") properties.reservation_refs = { type: "array", maxItems: 0 };
  if (reservations === "nonempty") properties.reservation_refs = { type: "array", minItems: 1, maxItems: 32 };
  properties.prior_transition_receipt_ref = prior === "null"
    ? { type: "null" }
    : {
        allOf: [
          ref(),
          { type: "object", properties: { schema: { const: "cairn.action_receipt.v0.2" } } }
        ]
      };
  return { properties };
}

function localSemantics(schemaId) {
  if (schemaId === "cairn.data_grant_state_head.v0.1") {
    return [{ oneOf: [
      { properties: { state: { const: "exhausted" }, remaining_reads: { const: 0 } } },
      { properties: { state: { enum: ["active", "paused"] },
        remaining_reads: { $ref: `${COMMON}#/$defs/positive` } } },
      { properties: { state: { enum: ["revoked", "expired"] },
        remaining_reads: { $ref: `${COMMON}#/$defs/uint` } } }
    ] }];
  }
  if (schemaId === "cairn.execution_control_authorization.v0.1") {
    const recovery = ["recovery_grant_ref", "recovery_grant_state_head_ref", "recovery_grant_state_head_hash", "recovery_use_idempotency_nonce"];
    return [{ properties: {
      ...nullProperties(recovery),
      reason_code: { enum: ["user_requested", "suspected_compromise", "policy_violation", "administrative_hold"] }
    } }];
  }
  if (schemaId === "cairn.execution_control_namespace.v0.1") {
    return [{
      if: { properties: { generation: { const: 0 } } },
      then: { properties: nullProperties(["prior_namespace_ref", "prior_revoked_head_ref"]) },
      else: { properties: nonNullProperties(["prior_namespace_ref", "prior_revoked_head_ref"]) }
    }];
  }
  if (schemaId === "cairn.execution_control_receipt.v0.1") {
    const authorization = ["control_authorization_ref", "control_authorization_hash"];
    const namespace = ["control_namespace_ref", "control_namespace_hash"];
    const priorNamespace = ["prior_control_namespace_ref", "prior_control_namespace_hash",
      "prior_revoked_control_head_ref", "prior_revoked_control_head_hash"];
    const before = ["before_control_head_ref", "before_control_head_hash",
      "before_scoped_control_map_ref", "before_scoped_control_map_hash"];
    const after = ["after_control_head_ref", "after_control_head_hash",
      "after_scoped_control_map_ref", "after_scoped_control_map_hash"];
    const leafBefore = ["scoped_leaf_before_ref", "scoped_leaf_before_hash"];
    const leafAfter = ["scoped_leaf_after_ref", "scoped_leaf_after_hash"];
    const connection = ["connection_state_event_receipt_ref", "connection_state_event_receipt_hash"];
    const outstanding = ["outstanding_action_index_head_ref", "outstanding_action_index_head_hash"];
    const recovery = ["recovery_grant_transition_receipt_ref", "recovery_grant_transition_receipt_hash"];
    return [
      { oneOf: [
        { properties: {
          cause: { const: "global_control" }, authorization_basis_kind: { const: "control_authorization" },
          ...nonNullProperties([...authorization, ...before, ...after]),
          ...nullProperties([...namespace, ...priorNamespace, ...leafBefore, ...leafAfter, ...connection, ...outstanding])
        } },
        { properties: {
          cause: { const: "scoped_control" }, authorization_basis_kind: { const: "control_authorization" },
          ...nonNullProperties([...authorization, ...before, ...after, ...leafAfter]),
          ...nullProperties([...namespace, ...priorNamespace, ...connection, ...outstanding])
        } },
        { properties: {
          cause: { const: "connection_joint_control" }, authorization_basis_kind: { const: "control_authorization" },
          ...nonNullProperties([...authorization, ...before, ...after, ...leafBefore, ...leafAfter, ...connection, ...outstanding]),
          ...nullProperties([...namespace, ...priorNamespace])
        } },
        { properties: {
          cause: { const: "namespace_genesis" }, authorization_basis_kind: { const: "control_namespace" },
          ...nonNullProperties([...namespace, ...after]),
          ...nullProperties([...authorization, ...priorNamespace, ...before, ...leafBefore, ...leafAfter, ...connection, ...outstanding, ...recovery])
        } },
        { properties: {
          cause: { const: "namespace_rotation" }, authorization_basis_kind: { const: "control_namespace" },
          ...nonNullProperties([...namespace, ...priorNamespace, ...before, ...after]),
          ...nullProperties([...authorization, ...leafBefore, ...leafAfter, ...connection, ...outstanding, ...recovery])
        } }
      ] },
      { properties: nullProperties(recovery) }
    ];
  }
  if (schemaId === "cairn.action_authorization.v0.2") {
    const scope = ["receiver_account_or_contract_scope", "receiver_operation_namespace", "explicit_scope_selection_proof_ref", "explicit_scope_selection_proof_hash"];
    const checkout = ["checkout_group_core_ref", "checkout_group_core_hash", "checkout_role"];
    const batch = ["checkout_reservation_batch_core_ref", "checkout_reservation_batch_core_hash"];
    const obligation = ["obligation_exposure_core_ref", "obligation_exposure_core_hash", "obligation_exposure_id", "obligation_role"];
    const attempt = ["fulfillment_attempt_core_ref", "fulfillment_attempt_core_hash"];
    return [
      { properties: nonNullProperties(scope) },
      { oneOf: [{ properties: nullProperties(checkout) }, { properties: nonNullProperties(checkout) }] },
      { oneOf: [{ properties: nullProperties(batch) }, { properties: nonNullProperties(batch) }] },
      { oneOf: [{ properties: nullProperties(obligation) }, { properties: nonNullProperties(obligation) }] },
      { oneOf: [{ properties: nullProperties(attempt) }, { properties: nonNullProperties(attempt) }] },
      {
        if: { properties: { capability: { enum: FINANCIAL_CAPABILITIES } } },
        then: { properties: {
          ...nonNullProperties(obligation),
          exposure_vector: { type: "array", minItems: 1, maxItems: 128 }
        } },
        else: { properties: {
          ...nullProperties(obligation),
          exposure_vector: { type: "array", maxItems: 0 }
        } }
      },
      {
        if: { properties: { capability: { enum: ["authorize_payment", "fund_escrow"] } } },
        then: { properties: {
          ...nonNullProperties(["payee_account_commitment", "rail", ...obligation, ...attempt]),
          exposure_vector: { type: "array", minItems: 1, maxItems: 128 }
        } },
        else: { properties: { ...nullProperties([...attempt, "payee_account_commitment", "rail"]) } }
      },
      {
        if: { properties: { checkout_reservation_batch_core_ref: { not: { type: "null" } } } },
        then: { properties: {
          checkout_role: { enum: ["terms_acceptance", "payment"] },
          acknowledged_transaction_semantics: {
            type: "array", prefixItems: [{ const: "TERMS_MAY_BIND_BEFORE_PAYMENT" }], items: false, minItems: 1, maxItems: 1
          }
        } }
      },
      {
        if: { properties: { capability: { enum: ["submit_bindable_offer", "submit_counteroffer"] } } },
        then: { properties: {
          obligation_role: { const: "create_or_update" },
          ...nullProperties([...checkout, ...batch])
        } }
      },
      {
        if: { properties: { capability: { const: "accept_terms" } } },
        then: { properties: { obligation_role: { const: "create_or_update" }, checkout_role: { enum: [null, "terms_acceptance"] } } }
      },
      {
        if: { properties: { capability: { enum: ["authorize_payment", "fund_escrow"] } } },
        then: { properties: { obligation_role: { const: "fulfill" }, checkout_role: { enum: [null, "payment"] } } }
      },
      {
        if: { properties: { capability: { enum: CAPABILITIES.filter((value) => !FINANCIAL_CAPABILITIES.includes(value)) } } },
        then: { properties: nullProperties([...checkout, ...batch]) }
      }
    ];
  }
  if (schemaId === "cairn.execution_binding_set.v0.1") {
    const obligation = ["obligation_exposure_core_ref", "obligation_exposure_core_hash", "obligation_exposure_id", "obligation_role"];
    const attempt = ["fulfillment_attempt_core_ref", "fulfillment_attempt_core_hash"];
    const checkout = ["checkout_group_core_ref", "checkout_group_core_hash", "checkout_role"];
    const batch = ["checkout_reservation_batch_core_ref", "checkout_reservation_batch_core_hash"];
    const template = ["checkout_transition_template_ref", "checkout_transition_template_hash"];
    const financialContext = [
      "compartment_ref", "pre_reservation_compartment_state_head_ref",
      "pre_reservation_resource_exposure_state_head_ref", "pre_reservation_resource_exposure_state_head_hash",
      "economic_resource_cap_state_head_ref", "economic_resource_cap_state_head_hash",
      "economic_resource_key", "compartment_control_key", "protection_attestation_ref", "protection_attestation_hash",
      "protection_attestation_lifecycle_head_ref", "protection_attestation_lifecycle_head_hash",
      "provider_account_identity_head_ref", "account_generation", "provider_account_identity_trust_overlay_head_ref",
      "provider_account_identity_trust_overlay_head_hash", "quote_snapshot_ref", "quote_hash",
      "provider_quote_import_receipt_ref", "provider_quote_import_receipt_hash",
      "quote_source_credential_lifecycle_head_ref", "quote_source_credential_lifecycle_head_hash",
      "quote_source_credential_generation", "quote_importer_adapter_lifecycle_head_ref",
      "quote_importer_adapter_lifecycle_head_hash", "accounting_policy_ref"
    ];
    const sublimit = ["provider_sublimit_identity_head_ref", "provider_sublimit_identity_head_hash", "provider_sublimit_id",
      "sublimit_generation", "provider_sublimit_identity_trust_overlay_head_ref", "provider_sublimit_identity_trust_overlay_head_hash"];
    const inventory = [
      "seller_inventory_context_kind", "seller_inventory_context_ref", "seller_inventory_context_hash",
      "seller_inventory_stage", "seller_inventory_state_head_ref", "seller_inventory_state_head_hash",
      "seller_copy_lease_heads_root", "seller_inventory_transition_receipt_ref", "seller_inventory_transition_receipt_hash",
      "seller_inventory_authority_state_head_ref", "seller_inventory_authority_state_head_hash",
      "seller_inventory_authority_signing_key_generation", "copy_ownership_registry_authority_state_head_ref",
      "copy_ownership_registry_authority_state_head_hash", "copy_ownership_registry_authority_signing_key_generation"
    ];
    const readiness = ["checkout_readiness_receipt_ref", "checkout_readiness_receipt_hash"];
    return [
      {
        if: { properties: { capability: { enum: FINANCIAL_CAPABILITIES } } },
        then: { properties: {
          ...nonNullProperties([...obligation, ...financialContext]),
          exposure_vector: { type: "array", minItems: 1, maxItems: 128 },
          principal_limit_policy_state_head_refs: { type: "array", minItems: 1, maxItems: 32 }
        } },
        else: { properties: {
          ...nullProperties([...obligation, ...financialContext, ...sublimit]),
          exposure_vector: { type: "array", maxItems: 0 },
          principal_limit_policy_state_head_refs: { type: "array", maxItems: 0 }
        } }
      },
      {
        if: { properties: { capability: { enum: ["authorize_payment", "fund_escrow"] } } },
        then: { properties: { ...nonNullProperties([...attempt, "payee_account_commitment", "rail"]) } },
        else: { properties: { ...nullProperties([...attempt, "payee_account_commitment", "rail"]) } }
      },
      { oneOf: [{ properties: nullProperties(sublimit) }, { properties: nonNullProperties(sublimit) }] },
      {
        if: { properties: { capability: { enum: ["submit_bindable_offer", "submit_counteroffer"] } } },
        then: { properties: {
          obligation_role: { const: "create_or_update" },
          ...nullProperties([...checkout, ...batch, ...template])
        } }
      },
      {
        if: { properties: { capability: { const: "accept_terms" } } },
        then: { properties: { obligation_role: { const: "create_or_update" }, checkout_role: { enum: [null, "terms_acceptance"] } } }
      },
      {
        if: { properties: { capability: { enum: ["authorize_payment", "fund_escrow"] } } },
        then: { properties: { obligation_role: { const: "fulfill" }, checkout_role: { enum: [null, "payment"] } } }
      },
      {
        if: { properties: { capability: { enum: CAPABILITIES.filter((value) => !FINANCIAL_CAPABILITIES.includes(value)) } } },
        then: { properties: nullProperties([...checkout, ...batch, ...template]) }
      },
      { oneOf: [
        { properties: { ...nullProperties([...inventory, ...readiness]) } },
        { properties: {
          capability: { enum: ["submit_bindable_offer", "submit_counteroffer", "accept_terms"] },
          copy_ids: { type: "array", minItems: 1, maxItems: 64 }, checkout_role: { type: "null" },
          ...nonNullProperties(inventory), seller_inventory_context_kind: { const: "ordinary_deal" },
          seller_inventory_stage: { const: "ordinary_held" }, ...nullProperties(readiness)
        } },
        { properties: {
          capability: { enum: ["accept_terms", "authorize_payment", "fund_escrow"] },
          copy_ids: { type: "array", minItems: 1, maxItems: 64 }, checkout_role: { enum: ["terms_acceptance", "payment"] },
          ...nonNullProperties(inventory), seller_inventory_context_kind: { const: "checkout" },
          seller_inventory_stage: { const: "checkout_prepared" }, ...nullProperties(readiness)
        } },
        { properties: {
          capability: { enum: ["accept_terms", "authorize_payment", "fund_escrow"] },
          copy_ids: { type: "array", minItems: 1, maxItems: 64 }, checkout_role: { enum: ["terms_acceptance", "payment"] },
          ...nonNullProperties([...inventory, ...readiness]), seller_inventory_context_kind: { const: "checkout" },
          seller_inventory_stage: { const: "checkout_held" }
        } },
        { properties: {
          capability: { enum: ["authorize_payment", "fund_escrow"] }, obligation_role: { const: "fulfill" },
          copy_ids: { type: "array", minItems: 1, maxItems: 64 }, checkout_role: { type: "null" },
          ...nonNullProperties(inventory), seller_inventory_context_kind: { const: "adopted_obligation" },
          seller_inventory_stage: { const: "adopted_consumed" }, ...nullProperties(readiness)
        } }
      ] }
    ];
  }
  if (schemaId === "cairn.agent_mandate.v0.3") {
    return [{
      if: { properties: { capability: { enum: FINANCIAL_CAPABILITIES } } },
      then: { properties: { constraints: { type: "object", properties: { kind: { const: "financial" } } } } },
      else: { properties: { constraints: { type: "object", properties: { kind: { const: "nonfinancial" } } } } }
    }];
  }
  if (schemaId === "cairn.lineage_state_head.v0.1") {
    const activation = ["activation_receipt_ref", "activation_transaction_id", "next_state_commitment_hash", "activated_action_ref"];
    return [{ oneOf: [
      { properties: {
        state: { enum: ["provisional", "provisional_expired", "provisional_superseded", "provisional_cancelled"] },
        ...nullProperties([...activation, "outbox_state_head_ref", "terminal_receiver_receipt_ref"]),
        finalization_tombstone: { const: false }
      } },
      { properties: {
        state: { enum: ["active", "fenced_non_submission"] },
        ...nonNullProperties(activation), terminal_receiver_receipt_ref: { type: "null" },
        finalization_tombstone: { const: false }
      } },
      { properties: {
        state: { enum: ["definitive_failure", "receiver_confirmed_cancelled"] },
        ...nonNullProperties([...activation, "terminal_receiver_receipt_ref"]),
        finalization_tombstone: { const: false }
      } },
      { properties: {
        state: { const: "finalized" }, ...nonNullProperties([...activation, "outbox_state_head_ref", "terminal_receiver_receipt_ref"]),
        finalization_tombstone: { const: true }
      } }
    ] }];
  }
  if (schemaId === "cairn.cancellation_authorization.v0.1") {
    const safety = ["restrictive_control_head_ref", "restrictive_control_head_hash", "restrictive_control_scope",
      "restrictive_control_target_commitment", "original_outbox_handoff_receipt_ref", "safety_preparation_intent_ref",
      "safety_preparation_intent_hash"];
    const continuity = ["cancellation_credential_continuity_receipt_ref", "cancellation_credential_continuity_receipt_hash"];
    return [
      {
        if: { properties: { authorization_mode: { const: "ordinary" } } },
        then: { properties: nullProperties(safety) },
        else: { properties: nonNullProperties(safety) }
      },
      { oneOf: [{ properties: nullProperties(continuity) }, { properties: nonNullProperties(continuity) }] },
      {
        if: { properties: { original_operation_locator: { type: "object", properties: { kind: { const: "precommitted_client_reference" } } } } },
        then: { properties: { original_outbox_handoff_receipt_ref: { not: { type: "null" } } } }
      }
    ];
  }
  if (schemaId === "cairn.gate_result.v0.2") {
    return [{ properties: {
      check_results: {
        type: "array",
        minItems: 1,
        maxItems: 128,
        contains: { type: "object", properties: { decision: { const: "deny" } }, required: ["decision"] }
      }
    } }];
  }
  if (schemaId === "cairn.action_state_head.v0.1") {
    const later = ["authority_ref", "lineage_activation_receipt_ref", "gate_result_ref", "redemption_receipt_ref", "outbox_state_head_ref", "receiver_receipt_ref"];
    const terminalBranches = (state) => [
      actionStateBranch(state, { nulls: later, reservations: "empty" }),
      actionStateBranch(state, { nonnull: ["authority_ref"], nulls: ["lineage_activation_receipt_ref", "gate_result_ref", "redemption_receipt_ref", "outbox_state_head_ref", "receiver_receipt_ref"], reservations: "empty" }),
      actionStateBranch(state, { nonnull: ["authority_ref", "lineage_activation_receipt_ref"], nulls: ["gate_result_ref", "redemption_receipt_ref", "outbox_state_head_ref", "receiver_receipt_ref"], reservations: "nonempty" })
    ];
    return [
      { properties: { action_ref: { allOf: [ref(), { type: "object", properties: { schema: { const: "cairn.action_record.v0.2" } } }] } } },
      { properties: { redemption_receipt_ref: { type: "null" } } },
      { oneOf: [
      actionStateBranch("prepared", { nulls: later, reservations: "empty", prior: "null" }),
      actionStateBranch("authorized", { nonnull: ["authority_ref"], nulls: ["lineage_activation_receipt_ref", "gate_result_ref", "redemption_receipt_ref", "outbox_state_head_ref", "receiver_receipt_ref"], reservations: "empty" }),
      actionStateBranch("reserved", { nonnull: ["authority_ref", "lineage_activation_receipt_ref"], nulls: ["gate_result_ref", "redemption_receipt_ref", "outbox_state_head_ref", "receiver_receipt_ref"], reservations: "nonempty" }),
      ...["cancelled", "definitive_failure", "quarantined"].flatMap(terminalBranches)
      ] }
    ];
  }
  if (schemaId === "cairn.action_receipt.v0.2") {
    const edges = new Map([
      ["prepared", ["authorized", "reserved", "cancelled"]], ["authorized", ["reserved", "cancelled"]],
      ["reserved", ["cancelled", "definitive_failure"]],
      ["cancelled", ["quarantined"]], ["definitive_failure", ["quarantined"]]
    ]);
    const pairs = [...edges].flatMap(([before, afters]) => afters.map((after) => ({
      properties: { state_before: { const: before }, state_after: { const: after } }
    })));
    return [
      { oneOf: pairs },
      { properties: { action_ref: { allOf: [ref(), { type: "object", properties: { schema: { const: "cairn.action_record.v0.2" } } }] } } },
      { oneOf: [
        { properties: { prior_action_receipt_ref: { type: "null" } } },
        { properties: { prior_action_receipt_ref: { allOf: [ref(), { type: "object", properties: { schema: { const: "cairn.action_receipt.v0.2" } } }] } } }
      ] },
      { oneOf: [
        { properties: { receiver_import_receipt_ref: { type: "null" }, receiver_assertion_trust_state_head_ref: { type: "null" } } },
        { properties: { receiver_import_receipt_ref: { not: { type: "null" } }, receiver_assertion_trust_state_head_ref: { not: { type: "null" } } } }
      ] }
    ];
  }
  return [];
}

function objectSchema(profile) {
  const properties = { schema: { const: profile.schema } };
  for (const [name, type] of Object.entries(profile.fields)) properties[name] = schemaForType(type);
  const signaturePointers = profile.signatures.map((name) => `/${name}`);
  const semantics = localSemantics(profile.schema);
  const refHashPairs = Object.keys(profile.fields)
    .filter((property) => property.endsWith("_ref") && Object.hasOwn(profile.fields, `${property.slice(0, -4)}_hash`))
    .map((property) => [property, `${property.slice(0, -4)}_hash`]);
  const document = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${EXECUTION_SCHEMA_ROOT}${profile.file}`,
    title: profile.schema,
    type: "object",
    additionalProperties: false,
    required: ["schema", ...Object.keys(profile.fields)],
    properties,
    "x-cairn-kind": profile.kind,
    "x-cairn-object-schema": profile.schema,
    "x-cairn-object-id-pointer": `/${profile.id}`,
    "x-cairn-self-hash-pointer": `/${profile.hash}`,
    "x-cairn-signature-pointers": signaturePointers,
    "x-cairn-hash-exclusion-pointers": signaturePointers.flatMap((pointer) => [`${pointer}/signed_hash`, `${pointer}/value`]),
    "x-cairn-ref-hash-pairs": refHashPairs,
    "x-cairn-max-canonical-bytes": 1048576,
    "x-cairn-max-json-depth": 32,
    "x-cairn-source-spec-sha256": SPEC_SHA256,
    "x-cairn-invariants": profile.invariants
  };
  if (semantics.length) document.allOf = semantics;
  return document;
}

function operationBodiesSchema(baseObjectSchemaUris) {
  const names = PHASE1_OPERATIONS.map(({ name }) => name);
  const responseEnvelope = (schemaUris) => closed({
    ref: ref(),
    object: { oneOf: schemaUris.map((uri) => ({ $ref: uri })) },
    retrieved_at: { $ref: `${COMMON}#/$defs/timestamp` }
  });
  const executionSchemaUris = (schemaIds) => PHASE1_OBJECTS
    .filter(({ schema }) => schemaIds.has(schema))
    .map(({ file }) => `${EXECUTION_SCHEMA_ROOT}${file}`);
  const executionObject = (schemaId) => {
    const profile = PHASE1_OBJECTS.find(({ schema }) => schema === schemaId);
    if (!profile) throw new Error(`unknown Phase 1 operation-body object: ${schemaId}`);
    return { $ref: `${EXECUTION_SCHEMA_ROOT}${profile.file}` };
  };
  const requestBodies = {
    emptyRequest: closed({}),
    objectRefRequest: closed({ ref: ref() }),
    activityListRequest: closed({
      cursor: nullable({ type: "string", minLength: 1, maxLength: 1024 }),
      page_size: { type: "integer", minimum: 1, maximum: 100 },
      state_filter: array({ enum: PHASE1_ACTIVITY_STATES }, { uniqueItems: true })
    })
  };
  const requestEnvelopes = Object.fromEntries(PHASE1_OPERATIONS.map((operation) => [
    requestEnvelopeDefinitionName(operation.name),
    closed({
      protocol_version: { const: "0.1" },
      profile_id: { const: PROFILE_ID },
      base_bundle_hash: { const: BASE_BUNDLE_HASH },
      execution_bundle_hash: hash(),
      operation_registry_hash: hash(),
      operation: { const: operation.name },
      body: { $ref: operation.request_body_schema }
    })
  ]));
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${EXECUTION_SCHEMA_ROOT}operation-bodies.schema.json`,
    title: "Phase 1 read-only operation bodies",
    $defs: {
      ...requestBodies,
      ...requestEnvelopes,
      baseObjectResponse: responseEnvelope(baseObjectSchemaUris),
      policyObjectResponse: responseEnvelope(executionSchemaUris(POLICY_RESPONSE_SCHEMA_IDS)),
      receiptObjectResponse: responseEnvelope(executionSchemaUris(RECEIPT_RESPONSE_SCHEMA_IDS)),
      authorizationObjectResponse: responseEnvelope(executionSchemaUris(new Set([
        "cairn.action_authorization.v0.2",
        "cairn.cancellation_authorization.v0.1",
        "cairn.execution_control_authorization.v0.1"
      ]))),
      controlObjectResponse: responseEnvelope(executionSchemaUris(new Set([
        "cairn.execution_control_state_head.v0.1",
        "cairn.scoped_execution_control_leaf_state_head.v0.1"
      ]))),
      actionGetResponse: closed({
        ref: ref(),
        view: executionObject("cairn.execution_action_view.v0.1"),
        action_record: executionObject("cairn.action_record.v0.2"),
        execution_binding_set: executionObject("cairn.execution_binding_set.v0.1"),
        lineage_commitment: executionObject("cairn.lineage_commitment.v0.1"),
        current_action_state_head: executionObject("cairn.action_state_head.v0.1"),
        current_lineage_state_head: executionObject("cairn.lineage_state_head.v0.1"),
        current_activity_detail: executionObject("cairn.execution_activity_detail.v0.1"),
        authority_basis: nullable({ oneOf: [
          executionObject("cairn.agent_mandate.v0.3"),
          executionObject("cairn.action_authorization.v0.2"),
          executionObject("cairn.cancellation_authorization.v0.1")
        ] }),
        authority_reservations: array(executionObject("cairn.authority_reservation.v0.2"), { maxItems: 32 }),
        confirmation_receipt: nullable(executionObject("cairn.confirmation_receipt.v0.1")),
        gate_request: nullable(executionObject("cairn.gate_request.v0.2")),
        gate_result: nullable(executionObject("cairn.gate_result.v0.2")),
        retrieved_at: { $ref: `${COMMON}#/$defs/timestamp` }
      }),
      capabilitiesResponse: closed({
        profile: { const: PROFILE_ID }, release_phase: { const: RELEASE_PHASE }, bundle_hash: hash(),
        operation_registry_hash: hash(), base_bundle_hash: { const: BASE_BUNDLE_HASH },
        base_operation_registry_hash: { const: BASE_REGISTRY_HASH },
        operations: { type: "array", prefixItems: names.map((name) => ({ const: name })), items: false, minItems: names.length, maxItems: names.length },
        external_effects_available: { const: false }
      }),
      activityListResponse: closed({
        items: array({ $ref: `${EXECUTION_SCHEMA_ROOT}execution-activity-summary.schema.json` }, { maxItems: 100 }),
        next_cursor: nullable({ type: "string", minLength: 1, maxLength: 1024 }),
        total_disclosed: { $ref: `${COMMON}#/$defs/uint` },
        retrieved_at: { $ref: `${COMMON}#/$defs/timestamp` },
        omitted_fields: { type: "array", prefixItems: [
          { const: "payee_accounts" }, { const: "private_budgets" }, { const: "evidence" },
          { const: "contact_shipping" }, { const: "full_warning_text" }, { const: "other_agent_authority" }
        ], items: false, minItems: 6, maxItems: 6 }
      })
    }
  };
}

function manifestSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${EXECUTION_SCHEMA_ROOT}machine-bundle-manifest.schema.json`,
    type: "object",
    additionalProperties: false,
    required: ["schema", "bundle_id", "protocol_version", "profile", "release_phase", "schema_dialect", "hash_profile", "signature_profile", "audited_prose_spec", "audited_prose_spec_sha256", "base_profile", "base_bundle_hash", "base_operation_registry_hash", "conformance_claims", "not_claiming"],
    properties: {
      schema: { const: "cairn.execution_machine_bundle_manifest.v0.1" }, bundle_id: { $ref: `${COMMON}#/$defs/uuid` },
      protocol_version: { const: "0.1" }, profile: { const: PROFILE_ID }, release_phase: { const: RELEASE_PHASE },
      schema_dialect: { const: "https://json-schema.org/draft/2020-12/schema" }, hash_profile: { const: "rfc8785-jcs-sha256" },
      signature_profile: { const: "cairn-ed25519-v0.1" }, audited_prose_spec: { const: "../../Protocol_Agent_Execution_Change_Spec_v0.1.md" },
      audited_prose_spec_sha256: { const: SPEC_SHA256 }, base_profile: { const: "cairn-proposal-foundation-v0.1" },
      base_bundle_hash: hash(), base_operation_registry_hash: hash(), conformance_claims: { type: "array", maxItems: 0 },
      not_claiming: stringArray(undefined, 1)
    }
  };
}

function registrySchema() {
  const operation = closed({
    name: { type: "string", pattern: "^execution\\.[a-z0-9_.]+$" }, mutating: { const: false }, external_effect: { const: false },
    consequence: { enum: ["public_read", "private_read"] }, request_schema: { type: "string", format: "uri-reference" },
    request_schema_hash: hash(), request_body_schema: { type: "string", format: "uri-reference" }, request_body_schema_hash: hash(),
    response_schema: { type: "string", format: "uri-reference" },
    response_schema_hash: hash(),
    access_requirement: { enum: ["public", "owner_or_exact_runtime_data_grant", "owner_or_exact_runtime_audit_control_grant", "owner_or_exact_runtime_activity_grant", "owner_plus_audit_detail_or_exact_runtime_audit_grant", "inherited_parent_private_or_audit_acl"] },
    authentication_branch: { enum: ["public", "principal_owner_or_exact_runtime_resource", "principal_owner_audit_detail_or_exact_runtime_resource", "inherited_parent_private_or_audit_acl"] },
    data_grant_prerequisite: { enum: ["none", "owner_bypass_or_exact_runtime_object_read_grant", "owner_bypass_or_exact_runtime_audit_control_grant", "owner_bypass_or_exact_runtime_activity_grant", "owner_audit_bypass_or_exact_runtime_audit_grant", "inherited_parent_private_or_audit_acl"] },
    disclosure_prerequisite: { const: "none" }, authority_prerequisite: { const: "none" },
    idempotency_rule: { const: "not_applicable_schema_only" }, receipt_family: { const: "none" },
    caller_class: { enum: ["public", "principal_owner_or_exact_runtime", "principal_owner_or_exact_runtime_audit_control", "principal_owner_audit_detail_or_exact_runtime", "parent_acl_authorized_reader"] },
    authority_effect: { const: "none" }, implementation_status: { const: "schema_only" }
  });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${EXECUTION_SCHEMA_ROOT}operation-registry.schema.json`,
    type: "object", additionalProperties: false,
    required: ["schema", "protocol_version", "profile", "release_phase", "schema_commitment_profile", "operations", "not_claiming"],
    properties: {
      schema: { const: "cairn.execution_operation_registry.v0.1" }, protocol_version: { const: "0.1" },
      profile: { const: PROFILE_ID }, release_phase: { const: RELEASE_PHASE },
      schema_commitment_profile: { const: SCHEMA_COMMITMENT_PROFILE },
      operations: array(operation, { minItems: PHASE1_OPERATIONS.length, maxItems: PHASE1_OPERATIONS.length, "x-cairn-unique-by": "name" }),
      not_claiming: { type: "array", prefixItems: [
        { const: "service_implementation" }, { const: "mutation_surface" }, { const: "external_effect" }, { const: "conformance" }
      ], items: false, minItems: 4, maxItems: 4 }
    }
  };
}

export function buildPhase1Schemas(baseObjectSchemaUris = []) {
  return [
    { name: "common.schema.json", document: commonSchema() },
    ...PHASE1_OBJECTS.map((profile) => ({ name: profile.file, document: objectSchema(profile) })),
    { name: "machine-bundle-manifest.schema.json", document: manifestSchema() },
    { name: "operation-bodies.schema.json", document: operationBodiesSchema(baseObjectSchemaUris) },
    { name: "operation-registry.schema.json", document: registrySchema() }
  ].sort((left, right) => Buffer.compare(Buffer.from(left.name), Buffer.from(right.name)));
}
