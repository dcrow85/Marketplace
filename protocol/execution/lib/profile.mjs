function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const member of Object.values(value)) deepFreeze(member);
  return Object.freeze(value);
}

export const PROFILE_ID = "cairn-supervised-execution-v0.1";
export const RELEASE_PHASE = "phase_1_schema_only";
export const SPEC_SHA256 = "33f08aa78f569ffeff7854c4aaeb2486621b611f8431d68b39d5ca255aff3375";
export const BASE_BUNDLE_HASH = "sha-256:d84dd5c2a925575c4889ab51f784cca58bd7c7ec14fcf0ae66dd7d8a6eeff29c";
export const BASE_REGISTRY_HASH = "sha-256:218e990a8cf2e768e9cda8886001488fb0c37496b3cfa64c21d2d922e4e9075b";

const OBJECT_ROOT = "https://cairn.cards/protocol/execution/schemas/v0.1/";
const BODY_ROOT = `${OBJECT_ROOT}operation-bodies.schema.json#/$defs/`;

export const SCHEMA_COMMITMENT_PROFILE = "cairn-json-schema-location-jcs-sha256-v0.1";

function body(name) {
  return `${BODY_ROOT}${name}`;
}

function object(name) {
  return `${OBJECT_ROOT}${name}`;
}

export function requestEnvelopeDefinitionName(operationName) {
  return `requestEnvelope.${operationName}`;
}

function envelope(operationName) {
  return body(requestEnvelopeDefinitionName(operationName));
}

const ACCESS_METADATA = Object.freeze({
  public: Object.freeze({
    authentication_branch: "public",
    data_grant_prerequisite: "none",
    caller_class: "public"
  }),
  owner_or_exact_runtime_data_grant: Object.freeze({
    authentication_branch: "principal_owner_or_exact_runtime_resource",
    data_grant_prerequisite: "owner_bypass_or_exact_runtime_object_read_grant",
    caller_class: "principal_owner_or_exact_runtime"
  }),
  owner_or_exact_runtime_audit_control_grant: Object.freeze({
    authentication_branch: "principal_owner_or_exact_runtime_resource",
    data_grant_prerequisite: "owner_bypass_or_exact_runtime_audit_control_grant",
    caller_class: "principal_owner_or_exact_runtime_audit_control"
  }),
  owner_or_exact_runtime_activity_grant: Object.freeze({
    authentication_branch: "principal_owner_or_exact_runtime_resource",
    data_grant_prerequisite: "owner_bypass_or_exact_runtime_activity_grant",
    caller_class: "principal_owner_or_exact_runtime"
  }),
  owner_plus_audit_detail_or_exact_runtime_audit_grant: Object.freeze({
    authentication_branch: "principal_owner_audit_detail_or_exact_runtime_resource",
    data_grant_prerequisite: "owner_audit_bypass_or_exact_runtime_audit_grant",
    caller_class: "principal_owner_audit_detail_or_exact_runtime"
  }),
  inherited_parent_private_or_audit_acl: Object.freeze({
    authentication_branch: "inherited_parent_private_or_audit_acl",
    data_grant_prerequisite: "inherited_parent_private_or_audit_acl",
    caller_class: "parent_acl_authorized_reader"
  })
});

const read = (name, response, access = "owner_or_exact_runtime_data_grant", request = "objectRefRequest") => {
  const metadata = ACCESS_METADATA[access];
  if (!metadata) throw new TypeError(`unknown Phase 1 access class: ${access}`);
  return {
    name,
    mutating: false,
    external_effect: false,
    consequence: access === "public" ? "public_read" : "private_read",
    request_schema: envelope(name),
    request_body_schema: body(request),
    response_schema: response.endsWith("Response") ? body(response) : object(response),
    access_requirement: access,
    ...metadata,
    disclosure_prerequisite: "none",
    authority_prerequisite: "none",
    idempotency_rule: "not_applicable_schema_only",
    receipt_family: "none",
    authority_effect: "none",
    implementation_status: "schema_only"
  };
};

export const PHASE1_OPERATIONS = deepFreeze([
  read("execution.capabilities.get", "capabilitiesResponse", "public", "emptyRequest"),
  read("execution.base_object.get", "baseObjectResponse"),
  read("execution.execution_resource_bounds_profile.get", "execution-resource-bounds-profile.schema.json", "public"),
  read("execution.connection_authorization.get", "agent-connection-authorization.schema.json", "owner_or_exact_runtime_audit_control_grant"),
  read("execution.connection_state.get", "agent-connection-state-head.schema.json", "owner_or_exact_runtime_audit_control_grant"),
  read("execution.data_grant_state.get", "data-grant-state-head.schema.json", "owner_or_exact_runtime_data_grant"),
  read("execution.connection_outstanding_action_index.get", "connection-outstanding-action-index-state-head.schema.json", "owner_or_exact_runtime_audit_control_grant"),
  read("execution.connection_outstanding_action_entry.get", "connection-outstanding-action-entry.schema.json", "owner_plus_audit_detail_or_exact_runtime_audit_grant"),
  read("execution.connection_outstanding_action_index_transition_receipt.get", "connection-outstanding-action-index-transition-receipt.schema.json", "owner_plus_audit_detail_or_exact_runtime_audit_grant"),
  read("execution.receiver_outstanding_stream_entry.get", "receiver-outstanding-stream-entry.schema.json", "owner_plus_audit_detail_or_exact_runtime_audit_grant"),
  read("execution.receiver_outstanding_stream_transition_receipt.get", "receiver-outstanding-stream-transition-receipt.schema.json", "owner_plus_audit_detail_or_exact_runtime_audit_grant"),
  read("execution.receiver_terminal_release_plan_core.get", "receiver-terminal-release-plan-core.schema.json", "owner_plus_audit_detail_or_exact_runtime_audit_grant"),
  read("execution.receiver_terminal_release_completion_receipt.get", "receiver-terminal-release-completion-receipt.schema.json", "owner_plus_audit_detail_or_exact_runtime_audit_grant"),
  read("execution.connection_state_event_receipt.get", "connection-state-event-receipt.schema.json", "owner_plus_audit_detail_or_exact_runtime_audit_grant"),
  read("execution.control_namespace.get", "execution-control-namespace.schema.json", "owner_or_exact_runtime_audit_control_grant"),
  read("execution.control.get", "controlObjectResponse", "owner_or_exact_runtime_audit_control_grant"),
  read("execution.control_receipt.get", "execution-control-receipt.schema.json", "owner_plus_audit_detail_or_exact_runtime_audit_grant"),
  read("execution.policy.get", "policyObjectResponse"),
  read("execution.confirmation_receipt.get", "confirmation-receipt.schema.json", "inherited_parent_private_or_audit_acl"),
  read("execution.mandate.get", "agent-mandate-v0.3.schema.json", "owner_or_exact_runtime_audit_control_grant"),
  read("execution.binding_set.get", "execution-binding-set.schema.json"),
  read("execution.authorization.get", "authorizationObjectResponse", "owner_or_exact_runtime_audit_control_grant"),
  read("execution.cancellation_authorization.get", "cancellation-authorization-v0.1.schema.json", "owner_or_exact_runtime_audit_control_grant"),
  read("execution.lineage_commitment.get", "lineage-commitment.schema.json"),
  read("execution.lineage_state.get", "lineage-state-head.schema.json"),
  read("execution.action.get", "actionGetResponse"),
  read("execution.receipt.get", "receiptObjectResponse", "owner_plus_audit_detail_or_exact_runtime_audit_grant"),
  read("execution.activity.list", "activityListResponse", "owner_or_exact_runtime_activity_grant", "activityListRequest"),
  read("execution.activity.detail.get", "execution-activity-detail.schema.json", "owner_plus_audit_detail_or_exact_runtime_audit_grant")
]);

export const EXACT_PHASE1_OPERATION_TUPLES = deepFreeze(PHASE1_OPERATIONS.map((operation) => [
  operation.name,
  operation.mutating,
  operation.external_effect,
  operation.consequence,
  operation.request_schema,
  operation.request_body_schema,
  operation.response_schema,
  operation.access_requirement,
  operation.authentication_branch,
  operation.data_grant_prerequisite,
  operation.disclosure_prerequisite,
  operation.authority_prerequisite,
  operation.idempotency_rule,
  operation.receipt_family,
  operation.caller_class,
  operation.authority_effect,
  operation.implementation_status
]));

export function operationTuple(operation) {
  return [
    operation.name,
    operation.mutating,
    operation.external_effect,
    operation.consequence,
    operation.request_schema,
    operation.request_body_schema,
    operation.response_schema,
    operation.access_requirement,
    operation.authentication_branch,
    operation.data_grant_prerequisite,
    operation.disclosure_prerequisite,
    operation.authority_prerequisite,
    operation.idempotency_rule,
    operation.receipt_family,
    operation.caller_class,
    operation.authority_effect,
    operation.implementation_status
  ];
}
