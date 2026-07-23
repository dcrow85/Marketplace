import { canonicalHash, canonicalText, objectRefFor, sameObjectRef, valueAtPointer, verifyEd25519, verifyObjectBindings } from "./core.mjs";
import { BASE_BUNDLE_HASH, BASE_REGISTRY_HASH, PHASE1_OPERATIONS, PROFILE_ID } from "./profile.mjs";

const unique = (values) => [...new Set(values)];
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isNull = (value) => value === null;
const FINANCIAL_CAPABILITIES = new Set(["submit_bindable_offer", "submit_counteroffer", "accept_terms", "authorize_payment", "fund_escrow"]);
const MAX_TOTAL_INLINE_ARRAY_ENTRIES_PER_OBJECT = 4096;
const MAX_REQUEST_BYTES = 2_097_152;
const MAX_CANONICAL_OBJECT_BYTES = 1_048_576;
const MAX_CANONICAL_STRING_BYTES = 65_536;
const MAX_URI_OR_OBJECT_REF_BYTES = 4_096;
const MAX_JSON_NESTING_DEPTH = 32;
const MAX_PROPERTIES_PER_OBJECT = 512;
const CURRENT_EXACT_READ_OPERATIONS = new Set([
  "execution.control.get",
  "execution.connection_state.get",
  "execution.data_grant_state.get",
  "execution.connection_outstanding_action_index.get",
  "execution.lineage_state.get"
]);
const AUTHENTICATED_RESOLUTION_UNSUPPORTED = "phase1_authenticated_resolution_unsupported";
// Historical-evidence mode is deliberately unforgeable by library callers. Only
// immutable read assemblers in this module receive the symbol-bearing context;
// live authority paths cannot be relaxed with a caller-supplied boolean flag.
const HISTORICAL_EVIDENCE = Symbol("cairnHistoricalEvidence");
const isHistoricalEvidence = (context) => context?.[HISTORICAL_EVIDENCE] === true;
const historicalEvidenceContext = (context, at = null) => ({
  ...context,
  [HISTORICAL_EVIDENCE]: true,
  requireDependencySignatures: true,
  historicalEvidenceAt: at
});

export const IMPLEMENTED_PHASE1_INVARIANTS = new Set([
  "connection_event_union", "control_target_union", "recovery_signature_union", "scoped_control_target_union",
  "enumerable_map_node_union", "enumerable_map_root_closure", "connection_outstanding_action_entry_union",
  "receiver_outstanding_stream_entry_union", "receiver_outstanding_stream_transition_union",
  "receiver_terminal_release_plan_exact_binding", "receiver_terminal_release_completion_exact_binding",
  "execution_control_receipt_union",
  "compartment_sublimit_union", "compartment_limit_order", "compartment_asset_equality",
  "mandate_constraint_union", "mandate_scope_relational", "mandate_connection_not_authority",
  "lineage_authority_union", "lineage_prior_state_union", "lineage_activation_fence_increment", "lineage_state_union", "binding_actor_union", "binding_exact_release",
  "binding_checkout_union", "binding_cancellation_union", "authorization_binding_exact", "authorization_checkout_union",
  "cancellation_authorization_mode_union", "cancellation_credential_continuity_union",
  "reservation_lineage_fence_increment", "reservation_inventory_union", "gate_request_exact_dependencies", "gate_deny_only",
  "action_record_exact_bindings", "action_state_ref_union", "action_receipt_transition"
]);

function schemaFor(object, context) {
  return context.schemasByObjectId?.get(object?.schema) ?? null;
}

function totalInlineArrayEntries(value) {
  if (Array.isArray(value)) return value.length + value.reduce((total, item) => total + totalInlineArrayEntries(item), 0);
  if (!isObject(value)) return 0;
  return Object.values(value).reduce((total, item) => total + totalInlineArrayEntries(item), 0);
}

function resourceBoundFailures(value, { objectRoot = false } = {}) {
  const failures = [];
  if (objectRoot && Buffer.byteLength(canonicalText(value), "utf8") > MAX_CANONICAL_OBJECT_BYTES) {
    failures.push("canonical_object_bytes_exceeded");
  }
  const stack = [{ value, depth: 1 }];
  while (stack.length) {
    const current = stack.pop();
    if (current.depth > MAX_JSON_NESTING_DEPTH) failures.push("json_nesting_depth_exceeded");
    if (typeof current.value === "string") {
      const bytes = Buffer.byteLength(current.value, "utf8");
      if (bytes > MAX_CANONICAL_STRING_BYTES) failures.push("canonical_string_bytes_exceeded");
      if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(current.value) && bytes > MAX_URI_OR_OBJECT_REF_BYTES) {
        failures.push("uri_bytes_exceeded");
      }
      continue;
    }
    if (Array.isArray(current.value)) {
      for (const child of current.value) stack.push({ value: child, depth: current.depth + 1 });
      continue;
    }
    if (!isObject(current.value)) continue;
    if (Object.keys(current.value).length > MAX_PROPERTIES_PER_OBJECT) failures.push("object_properties_exceeded");
    if (typeof current.value.schema === "string" && typeof current.value.object_id === "string" &&
        typeof current.value.object_hash === "string" &&
        Buffer.byteLength(canonicalText(current.value), "utf8") > MAX_URI_OR_OBJECT_REF_BYTES) {
      failures.push("object_ref_bytes_exceeded");
    }
    for (const child of Object.values(current.value)) stack.push({ value: child, depth: current.depth + 1 });
  }
  return unique(failures);
}

export function validatePhase1RequestBytes(rawBytes) {
  try {
    const bytes = typeof rawBytes === "string" ? Buffer.byteLength(rawBytes, "utf8")
      : Buffer.isBuffer(rawBytes) || rawBytes instanceof Uint8Array ? rawBytes.byteLength
        : Number.POSITIVE_INFINITY;
    return bytes <= MAX_REQUEST_BYTES ? [] : ["phase1_request_bytes_exceeded"];
  } catch {
    return ["phase1_request_bytes_exceeded"];
  }
}

export function validatePhase1Object(object, context = {}) {
  try {
    if (!isObject(object)) return ["phase1_object_malformed"];
    const schema = schemaFor(object, context);
    if (!schema) return ["phase1_object_schema_unknown"];
    const resourceFailures = resourceBoundFailures(object, { objectRoot: true }).map((code) => `phase1_${code}`);
    const validate = context.ajv?.getSchema(schema.$id);
    if (!validate || !validate(object)) return unique(["phase1_object_schema_invalid", ...resourceFailures]);
    const failures = verifyObjectBindings(object, schema);
    failures.push(...refHashPairFailures(object, schema["x-cairn-ref-hash-pairs"] ?? [], "phase1_ref_hash_mismatch"));
    failures.push(...resourceFailures);
    if (totalInlineArrayEntries(object) > MAX_TOTAL_INLINE_ARRAY_ENTRIES_PER_OBJECT) {
      failures.push("phase1_total_inline_array_entries_exceeded");
    }
    return unique(failures);
  } catch {
    return ["phase1_object_malformed"];
  }
}

function schemaForResolvedObject(object, context) {
  return schemaFor(object, context) ?? context.baseSchemasByObjectId?.get(object?.schema) ?? null;
}

function resolvedObjectShapeFailures(object, context, code = "resolved_object") {
  const schema = schemaForResolvedObject(object, context);
  if (!schema) return [`${code}_schema_unknown`];
  const validate = context.ajv?.getSchema(schema.$id);
  if (!validate || !validate(object)) return [`${code}_schema_invalid`];
  return verifyObjectBindings(object, schema).map((failure) => `${code}_${failure}`);
}

function validateTypedObjectResponse(response, definition, code, context) {
  try {
    const validate = context.ajv?.getSchema(
      `https://cairn.cards/protocol/execution/schemas/v0.1/operation-bodies.schema.json#/$defs/${definition}`
    );
    if (!validate || !validate(response)) return [`${code}_schema_invalid`];
    const objectSchema = schemaForResolvedObject(response.object, context);
    if (!objectSchema) return [`${code}_object_schema_unknown`];
    const objectValidate = context.ajv?.getSchema(objectSchema.$id);
    if (!objectValidate || !objectValidate(response.object)) return [`${code}_object_invalid`];
    const bindingFailures = verifyObjectBindings(response.object, objectSchema);
    bindingFailures.push(...refHashPairFailures(
      response.object,
      objectSchema["x-cairn-ref-hash-pairs"] ?? [],
      "ref_hash_mismatch"
    ));
    if (objectSchema["x-cairn-source-spec-sha256"] !== undefined &&
        totalInlineArrayEntries(response.object) > MAX_TOTAL_INLINE_ARRAY_ENTRIES_PER_OBJECT) {
      bindingFailures.push("total_inline_array_entries_exceeded");
    }
    bindingFailures.push(...resourceBoundFailures(response.object, { objectRoot: true }));
    if (bindingFailures.length) return unique(bindingFailures.map((failure) => `${code}_${failure}`));
    const resolvedRef = objectRefFor(response.object, objectSchema);
    if (!sameObjectRef(response.ref, resolvedRef)) return [`${code}_ref_mismatch`];
    return [];
  } catch {
    return [`${code}_malformed`];
  }
}

export function validateBaseObjectResponse(response, context = {}) {
  return validateTypedObjectResponse(response, "baseObjectResponse", "base_object_response", context);
}

export function validatePolicyObjectResponse(response, context = {}) {
  return validateTypedObjectResponse(response, "policyObjectResponse", "policy_object_response", context);
}

export function validateReceiptObjectResponse(response, context = {}) {
  return validateTypedObjectResponse(response, "receiptObjectResponse", "receipt_object_response", context);
}

export function validateAuthorizationObjectResponse(response, context = {}) {
  return validateTypedObjectResponse(response, "authorizationObjectResponse", "authorization_object_response", context);
}

export function validateControlObjectResponse(response, context = {}) {
  return validateTypedObjectResponse(response, "controlObjectResponse", "control_object_response", context);
}

export function validateExactObjectRead(operationName, request, responseObject, context = {}) {
  try {
    const operation = PHASE1_OPERATIONS.find(({ name }) => name === operationName);
    if (!operation || !operation.request_body_schema.endsWith("#/$defs/objectRefRequest")) {
      return ["object_read_operation_invalid"];
    }
    const requestValidate = context.ajv?.getSchema(operation.request_body_schema);
    const responseValidate = context.ajv?.getSchema(operation.response_schema);
    if (!requestValidate || !requestValidate(request)) return ["object_read_request_schema_invalid"];
    if (!responseValidate || !responseValidate(responseObject)) return ["object_read_response_schema_invalid"];
    const returnedObject = responseObject.object ?? responseObject;
    const schema = schemaForResolvedObject(returnedObject, context);
    if (!schema) return ["object_read_response_schema_unknown"];
    const returnedRef = responseObject.object === undefined ? objectRefFor(returnedObject, schema) : responseObject.ref;
    if (!schema || !sameObjectRef(request.ref, returnedRef) || !sameObjectRef(returnedRef, objectRefFor(returnedObject, schema))) {
      return ["object_read_request_ref_mismatch"];
    }
    const failures = schema["x-cairn-source-spec-sha256"] === undefined
      ? resolvedObjectShapeFailures(returnedObject, context, "object_read_response")
      : validatePhase1Object(returnedObject, context);
    if ((schema["x-cairn-signature-pointers"] ?? []).length > 0) {
      failures.push(...validateResolvedSignedObject(returnedObject, context)
        .map((code) => `object_read_${code}`));
    }
    if (CURRENT_EXACT_READ_OPERATIONS.has(operationName) &&
        !sameObjectRef(resolveCurrentHead(context, returnedRef), returnedRef)) {
      failures.push("object_read_current_head_mismatch");
    }
    failures.push(...intrinsicObjectFailures(returnedObject, historicalEvidenceContext(context))
      .map((code) => `object_read_${code}`));
    failures.push(...resourceBoundFailures(returnedObject, { objectRoot: true }).map((code) => `object_read_${code}`));
    // Phase 1 has no frozen key/current-head/access-control proof root. These
    // checks establish conditional byte and graph consistency only; they never
    // produce an authenticated read decision from caller-supplied resolvers.
    failures.push(AUTHENTICATED_RESOLUTION_UNSUPPORTED);
    return unique(failures);
  } catch {
    return ["object_read_malformed"];
  }
}

export function validateOperationRequestEnvelope(operationName, envelope, context = {}) {
  try {
    const operation = PHASE1_OPERATIONS.find(({ name }) => name === operationName);
    if (!operation) return ["request_envelope_operation_unregistered"];
    const validate = context.ajv?.getSchema(operation.request_schema);
    if (!validate || !validate(envelope)) return ["request_envelope_schema_invalid"];
    const failures = [];
    if (envelope.protocol_version !== "0.1") failures.push("request_envelope_protocol_mismatch");
    if (envelope.profile_id !== PROFILE_ID) failures.push("request_envelope_profile_mismatch");
    if (envelope.base_bundle_hash !== BASE_BUNDLE_HASH ||
        (context.baseBundleHash !== undefined && envelope.base_bundle_hash !== context.baseBundleHash)) {
      failures.push("request_envelope_base_bundle_mismatch");
    }
    if (typeof context.bundleHash !== "string" || envelope.execution_bundle_hash !== context.bundleHash) {
      failures.push("request_envelope_execution_bundle_mismatch");
    }
    if (typeof context.registryHash !== "string" || envelope.operation_registry_hash !== context.registryHash) {
      failures.push("request_envelope_registry_mismatch");
    }
    if (envelope.operation !== operationName) failures.push("request_envelope_operation_mismatch");
    return [...new Set(failures)];
  } catch {
    return ["request_envelope_validation_error"];
  }
}

function intrinsicObjectFailures(object, context) {
  switch (object?.schema) {
    case "cairn.agent_connection_authorization.v0.1":
      return validateConnectionAuthorization(object, context);
    case "cairn.agent_connection_state_head.v0.1":
      return validateConnectionStateHead(object, context);
    case "cairn.data_grant_state_head.v0.1":
      return validateDataGrantStateHead(object, context);
    case "cairn.enumerable_map_node.v0.1": return validateEnumerableMapNode(object, context);
    case "cairn.enumerable_map_root.v0.1": return validateEnumerableMapRoot(object, context);
    case "cairn.connection_outstanding_action_entry.v0.1":
      return validateConnectionOutstandingActionEntry(object, context);
    case "cairn.receiver_outstanding_stream_entry.v0.1":
      return validateReceiverOutstandingStreamEntry(object, context);
    case "cairn.receiver_outstanding_stream_transition_receipt.v0.1":
      return validateReceiverOutstandingStreamTransitionReceipt(object, context);
    case "cairn.receiver_terminal_release_plan_core.v0.1":
      return validateReceiverTerminalReleasePlan(object, context);
    case "cairn.receiver_terminal_release_completion_receipt.v0.1":
      return validateReceiverTerminalReleaseCompletion(object, context);
    case "cairn.connection_outstanding_action_index_state_head.v0.1":
      return validateConnectionOutstandingIndexHead(object, context);
    case "cairn.connection_outstanding_action_index_transition_receipt.v0.1":
      return validateConnectionOutstandingIndexTransitionReceipt(object, context);
    case "cairn.execution_control_authorization.v0.1": return validateControlAuthorization(object, context);
    case "cairn.execution_control_namespace.v0.1": return validateExecutionControlNamespace(object, context);
    case "cairn.execution_control_state_head.v0.1": return validateExecutionControlStateHead(object, context);
    case "cairn.execution_control_receipt.v0.1": return validateExecutionControlReceipt(object, context);
    case "cairn.connection_state_event_receipt.v0.1": return validateConnectionEvent(
      object,
      context.connectionBefore ?? resolveObject(context.objectResolver, object.connection_before_head_ref),
      context.connectionAfter ?? resolveObject(context.objectResolver, object.connection_after_head_ref),
      context
    );
    case "cairn.scoped_execution_control_leaf_state_head.v0.1": return validateScopedControlLeaf(object, context);
    case "cairn.agent_execution_compartment.v0.1": return validateCompartmentDefinition(object, context);
    case "cairn.compartment_state_head.v0.1": return validateCompartmentStateHead(object, context);
    case "cairn.compartment_state_transition_receipt.v0.1":
      return validateCompartmentStateTransitionReceipt(object, context);
    case "cairn.agent_mandate.v0.3": return validateMandate(object, context);
    case "cairn.lineage_commitment.v0.1": return validateLineageCommitment(object, context);
    case "cairn.lineage_state_head.v0.1": return validateLineageStateHead(object, context);
    case "cairn.lineage_activation_receipt.v0.1": {
      const graph = context.lineageActivationGraph ??
        context.lineageActivationGraphResolver?.get?.(object.receipt_hash);
      return graph ? validateLineageActivationReceipt(object, graph, context) : ["lineage_activation_graph_unresolved"];
    }
    case "cairn.execution_binding_set.v0.1": return validateBindingSet(object, context);
    case "cairn.action_authorization.v0.2": return validateActionAuthorization(
      object,
      context.binding ?? context.executionBindingSet ?? resolveObject(context.objectResolver, object.execution_binding_set_ref),
      context
    );
    case "cairn.cancellation_authorization.v0.1": return validateCancellationAuthorization(
      object,
      context.binding ?? context.executionBindingSet ?? resolveObject(context.objectResolver, object.execution_binding_set_ref),
      context
    );
    case "cairn.gate_dependency_state_head.v0.1":
      return validateGateDependencyStateHead(object, context);
    case "cairn.gate_dependency_attestation.v0.1":
      return validateGateDependencyAttestation(object, context);
    case "cairn.gate_dependency_manifest.v0.1":
      return validateGateDependencyManifest(object, context);
    case "cairn.confirmation_receipt.v0.1": {
      const authority = context.authority ?? resolveObject(context.objectResolver, object.authority_object_ref);
      const binding = context.binding ?? context.executionBindingSet ??
        (object.execution_binding_set_ref === null ? null : resolveObject(context.objectResolver, object.execution_binding_set_ref));
      const gateRequest = context.gateRequest ?? null;
      return validateExecutionConfirmation(object, authority, binding, gateRequest, context);
    }
    case "cairn.gate_result.v0.2": return validateGateResult(object, context);
    case "cairn.action_record.v0.2": return validateActionRecord(object, context);
    case "cairn.action_receipt.v0.2": {
      const graph = context.actionReceiptGraph ?? context.actionReceiptGraphResolver?.get?.(object.receipt_hash);
      return graph ? validateActionReceipt(object, graph.before, graph.after, graph.binding, context)
        : ["action_receipt_graph_unresolved"];
    }
    default: return [];
  }
}

const ACTION_LINEAGE_STATE_COMPATIBILITY = new Map([
  ["prepared", new Set(["provisional"])],
  ["authorized", new Set(["provisional"])],
  ["reserved", new Set(["active"])],
  ["cancelled", new Set(["provisional_cancelled", "fenced_non_submission", "receiver_confirmed_cancelled"])],
  ["definitive_failure", new Set(["definitive_failure"])],
  ["finalized", new Set(["finalized"])],
  ["quarantined", new Set(["definitive_failure", "receiver_confirmed_cancelled", "finalized"])]
]);

function actionLineageStateFailures(actionState, lineageState) {
  if (!ACTION_LINEAGE_STATE_COMPATIBILITY.get(actionState?.state)?.has(lineageState?.state)) {
    return ["action_lineage_state_mismatch"];
  }
  return [];
}

const MANDATE_SCOPE_TO_BINDING_FIELDS = [
  ["intent_refs", "intent_refs"],
  ["deal_ref", "deal_ref"],
  ["counterparties", "counterparties"],
  ["seller_id", "seller_id"],
  ["listing_refs", "listing_refs"],
  ["proposal_ref", "action_proposal_ref"],
  ["cart_hash", "closed_terms_or_cart_hash"],
  ["copy_ids", "copy_ids"],
  ["ultimate_receiver_or_payee", "ultimate_receiver"],
  ["receiver_account_or_contract_scope", "receiver_account_or_contract_scope"],
  ["receiver_operation_namespace", "receiver_operation_namespace"],
  ["explicit_scope_selection_proof_ref", "explicit_scope_selection_proof_ref"],
  ["explicit_scope_selection_proof_hash", "explicit_scope_selection_proof_hash"],
  ["payee_account_commitment", "payee_account_commitment"],
  ["rail", "rail"],
  ["asset", "asset"],
  ["data_grant_refs", "data_grant_refs"],
  ["compartment_ref", "compartment_ref"],
  ["economic_resource_key", "economic_resource_key"],
  ["provider_account_identity_head_ref", "provider_account_identity_head_ref"],
  ["account_generation", "account_generation"],
  ["provider_account_identity_trust_overlay_head_ref", "provider_account_identity_trust_overlay_head_ref"],
  ["provider_account_identity_trust_overlay_head_hash", "provider_account_identity_trust_overlay_head_hash"],
  ["provider_sublimit_identity_head_ref", "provider_sublimit_identity_head_ref"],
  ["provider_sublimit_identity_head_hash", "provider_sublimit_identity_head_hash"],
  ["provider_sublimit_id", "provider_sublimit_id"],
  ["sublimit_generation", "sublimit_generation"],
  ["provider_sublimit_identity_trust_overlay_head_ref", "provider_sublimit_identity_trust_overlay_head_ref"],
  ["provider_sublimit_identity_trust_overlay_head_hash", "provider_sublimit_identity_trust_overlay_head_hash"],
  ["executor_target", "executor_target"],
  ["accounting_policy_ref", "accounting_policy_ref"],
  ["receiver_finality_profile_ref", "receiver_finality_profile_ref"],
  ["receiver_sequence_epoch_selector_key", "receiver_sequence_epoch_selector_key"],
  ["review_policy_hash", "review_policy_hash"],
  ["taint_policy_hash", "taint_policy_hash"]
];

function mandateBindingFailures(mandate, commitment, binding, context = {}) {
  const failures = [];
  const scope = mandate?.scope_bindings?.[commitment?.scope_binding_index];
  if (!mandate || !commitment || !binding || mandate.principal_id !== commitment.principal_id ||
      mandate.principal_id !== binding.principal_id || mandate.capability !== binding.capability || !scope) {
    return ["mandate_binding_identity_mismatch"];
  }
  if (scope.lineage_policy?.principal_occurrence_id !== commitment.principal_occurrence_id) {
    failures.push("mandate_binding_occurrence_mismatch");
  }
  const expectedBusinessTupleHash = mandateBusinessTupleHash(scope);
  if (commitment.canonical_business_tuple_hash !== expectedBusinessTupleHash ||
      binding.canonical_business_tuple_hash !== expectedBusinessTupleHash ||
      binding.canonical_business_tuple_hash !== commitment.canonical_business_tuple_hash) {
    failures.push("mandate_business_tuple_mismatch");
  }
  if (!sameObjectRef(
    mandate.required_confirmation_assurance_policy_ref,
    binding.confirmation_assurance_policy_ref
  )) {
    failures.push("mandate_confirmation_policy_mismatch");
  }
  if (binding.actor_branch !== "agent_runtime" ||
      !sameObjectRef(mandate.agent.runtime_binding_ref, binding.agent_runtime_binding_ref) ||
      !sameObjectRef(mandate.agent.connection_authorization_ref, binding.connection_authorization_ref)) {
    failures.push("mandate_runtime_connection_binding_mismatch");
  }
  const connection = resolveObject(context.objectResolver, binding.connection_state_head_ref);
  if (!connection || connection.schema !== "cairn.agent_connection_state_head.v0.1" ||
      !exactRef(binding.connection_state_head_ref, connection, context) ||
      validateConnectionStateHead(connection, {
        ...context, requireCurrentConnection: !isHistoricalEvidence(context)
      }).length ||
      connection.state !== "active" ||
      connection.principal_id !== mandate.principal_id ||
      !sameObjectRef(connection.connection_authorization_ref, mandate.agent.connection_authorization_ref) ||
      !sameObjectRef(connection.agent_runtime_binding_ref, mandate.agent.runtime_binding_ref)) {
    failures.push("mandate_connection_state_mismatch");
  }
  for (const [scopeField, bindingField] of MANDATE_SCOPE_TO_BINDING_FIELDS) {
    if (canonicalHash(scope[scopeField]) !== canonicalHash(binding[bindingField])) {
      failures.push(`mandate_scope_binding_mismatch:${scopeField}`);
    }
  }
  return failures;
}

export function mandateBusinessTupleHash(scope) {
  if (!isObject(scope)) return null;
  const { lineage_policy: _lineagePolicy, ...businessTuple } = scope;
  return canonicalHash(businessTuple);
}

export function validateActionGetResponse(request, response, context = {}) {
  try {
    const requestValidate = context.ajv?.getSchema(
      "https://cairn.cards/protocol/execution/schemas/v0.1/operation-bodies.schema.json#/$defs/objectRefRequest"
    );
    const validate = context.ajv?.getSchema(
      "https://cairn.cards/protocol/execution/schemas/v0.1/operation-bodies.schema.json#/$defs/actionGetResponse"
    );
    if (!requestValidate || !requestValidate(request)) return ["action_get_request_schema_invalid"];
    if (!validate || !validate(response)) return ["action_get_response_schema_invalid"];
    const failures = [AUTHENTICATED_RESOLUTION_UNSUPPORTED];
    const evidenceContext = historicalEvidenceContext(context, response.retrieved_at);
    for (const [name, object] of [
      ["view", response.view], ["action_record", response.action_record],
      ["execution_binding_set", response.execution_binding_set],
      ["lineage_commitment", response.lineage_commitment],
      ["current_action_state_head", response.current_action_state_head],
      ["current_lineage_state_head", response.current_lineage_state_head],
      ["current_activity_detail", response.current_activity_detail],
      ...(response.authority_basis === null ? [] : [["authority_basis", response.authority_basis]]),
      ...response.authority_reservations.map((object) => ["authority_reservation", object]),
      ...(response.confirmation_receipt === null ? [] : [["confirmation_receipt", response.confirmation_receipt]]),
      ...(response.gate_request === null ? [] : [["gate_request", response.gate_request]]),
      ...(response.gate_result === null ? [] : [["gate_result", response.gate_result]])
    ]) failures.push(...validateResolvedSignedObject(object, context).map((code) => `action_get_${name}_${code}`));
    if (!sameObjectRef(request.ref, response.ref) || !exactRef(response.ref, response.view, context) ||
        !exactRef(response.view.action_record_ref, response.action_record, context) ||
        !exactRef(response.view.current_action_state_head_ref, response.current_action_state_head, context) ||
        !exactRef(response.view.current_lineage_state_head_ref, response.current_lineage_state_head, context) ||
        !exactRef(response.view.current_activity_detail_ref, response.current_activity_detail, context) ||
        !exactRef(response.current_action_state_head.action_ref, response.action_record, context)) {
      failures.push("action_get_embedded_ref_mismatch");
    }
    const actionStateBefore = response.current_action_state_head.sequence === 0 ? null :
      (context.actionStatePredecessor ?? resolveObject(context.objectResolver, {
        schema: response.current_action_state_head.schema,
        object_id: response.current_action_state_head.previous_state_hash,
        object_hash: response.current_action_state_head.previous_state_hash
      }));
    failures.push(...validateActionStateTransition(
      actionStateBefore, response.current_action_state_head, evidenceContext
    ).map((code) => `action_get_action_state_${code}`));
    if (response.current_action_state_head.sequence > 0) {
      const transitionReceipt = resolveObject(
        context.objectResolver, response.current_action_state_head.prior_transition_receipt_ref
      );
      const transitionGraph = transitionReceipt
        ? context.actionReceiptGraph ?? context.actionReceiptGraphResolver?.get?.(transitionReceipt.receipt_hash)
        : null;
      if (!actionStateBefore || !transitionReceipt || !transitionGraph ||
          !exactRef(response.current_action_state_head.prior_transition_receipt_ref, transitionReceipt, context) ||
          validateResolvedSignedObject(actionStateBefore, evidenceContext).length ||
          validateResolvedSignedObject(transitionReceipt, evidenceContext).length ||
          !exactRef(objectRef(actionStateBefore, context), transitionGraph.before, context) ||
          !exactRef(objectRef(response.current_action_state_head, context), transitionGraph.after, context) ||
          validateActionReceipt(
            transitionReceipt, actionStateBefore, response.current_action_state_head,
            response.execution_binding_set,
            { ...evidenceContext, action: response.action_record,
              lineageCommitment: response.lineage_commitment,
              lineageStateHead: response.current_lineage_state_head }
          ).length) {
        failures.push("action_get_action_state_chain_unresolved");
      }
    }
    for (const [name, reference] of [
      ["action_state", response.view.current_action_state_head_ref],
      ["lineage_state", response.view.current_lineage_state_head_ref],
      ["activity_detail", response.view.current_activity_detail_ref]
    ]) {
      if (!sameObjectRef(resolveCurrentHead(context, reference), reference)) {
        failures.push(`action_get_current_${name}_mismatch`);
      }
    }
    if (validateLineageStateHead(response.current_lineage_state_head, {
      ...context, requireDependencySignatures: true,
      lineageCommitment: response.lineage_commitment
    }).length) {
      failures.push("action_get_current_lineage_state_invalid");
    }
    if (response.current_action_state_head.action_id !== response.action_record.action_id) {
      failures.push("action_get_action_id_mismatch");
    }
    if (!exactRef(response.action_record.execution_binding_set_ref, response.execution_binding_set, context) ||
        response.action_record.execution_binding_set_hash !== response.execution_binding_set.binding_set_hash ||
        !exactRef(response.action_record.lineage_commitment_ref, response.lineage_commitment, context) ||
        response.action_record.lineage_commitment_hash !== response.lineage_commitment.commitment_hash ||
        response.action_record.principal_id !== response.execution_binding_set.principal_id ||
        response.action_record.principal_id !== response.lineage_commitment.principal_id ||
        !sameObjectRef(response.action_record.action_proposal_ref, response.execution_binding_set.action_proposal_ref) ||
        response.action_record.action_proposal_hash !== response.execution_binding_set.action_proposal_hash ||
        !sameObjectRef(response.action_record.effect_descriptor_ref, response.execution_binding_set.effect_descriptor_ref) ||
        response.action_record.effect_id !== response.execution_binding_set.effect_id ||
        response.action_record.effect_id !== response.lineage_commitment.effect_id ||
        response.action_record.capability !== response.execution_binding_set.capability) {
      failures.push("action_get_action_binding_mismatch");
    }
    if (!exactRef(response.current_lineage_state_head.commitment_ref, response.lineage_commitment, context) ||
        (response.current_lineage_state_head.activated_action_ref !== null &&
          !exactRef(response.current_lineage_state_head.activated_action_ref, response.action_record, context))) {
      failures.push("action_get_lineage_action_mismatch");
    }
    const preauthorizedAction = response.lineage_commitment.authority_kind === "preauthorized_mandate";
    const preauthorizedPrepared = response.current_action_state_head.state === "prepared" && preauthorizedAction;
    const activityAuthorityExpected = preauthorizedAction
      ? response.lineage_commitment.mandate_ref
      : response.current_action_state_head.authority_ref;
    if (!exactRef(response.current_activity_detail.action_ref, response.action_record, context) ||
        !exactRef(response.current_activity_detail.action_state_head_ref, response.current_action_state_head, context) ||
        !sameObjectRef(response.current_activity_detail.binding_set_ref, response.action_record.execution_binding_set_ref) ||
        !exactRef(response.current_activity_detail.lineage_state_head_ref, response.current_lineage_state_head, context) ||
        canonicalHash(response.current_activity_detail.authority_basis_ref) !==
          canonicalHash(activityAuthorityExpected) ||
        response.current_activity_detail.principal_id !== response.action_record.principal_id ||
        response.current_activity_detail.state !== response.current_action_state_head.state) {
      failures.push("action_get_activity_chain_mismatch");
    }
    for (const field of ["principal_occurrence_id", "principal_authorized_lineage_id", "action_control_key"]) {
      if (response.current_lineage_state_head[field] !== response.lineage_commitment[field] ||
          response.execution_binding_set[field] !== response.lineage_commitment[field]) {
        failures.push(`action_get_lineage_identity_mismatch:${field}`);
      }
    }
    for (const field of ["attempt_sequence", "commitment_generation"]) {
      if (response.current_lineage_state_head[field] !== response.lineage_commitment[field]) {
        failures.push(`action_get_lineage_identity_mismatch:${field}`);
      }
    }
    if (canonicalHash(response.current_action_state_head.lineage_activation_receipt_ref) !==
          canonicalHash(response.current_lineage_state_head.activation_receipt_ref)) {
      failures.push("action_get_lineage_activation_receipt_mismatch");
    }
    if (response.current_lineage_state_head.state === "provisional" &&
        response.current_lineage_state_head.fencing_token !== response.lineage_commitment.expected_activation_fence) {
      failures.push("action_get_provisional_lineage_fence_mismatch");
    }
    if (response.execution_binding_set.lineage_commitment_hash !== response.lineage_commitment.commitment_hash ||
        !sameObjectRef(response.execution_binding_set.lineage_commitment_ref, response.action_record.lineage_commitment_ref) ||
        response.execution_binding_set.action_proposal_hash !== response.lineage_commitment.action_proposal_hash ||
        response.execution_binding_set.effect_id !== response.lineage_commitment.effect_id) {
      failures.push("action_get_binding_lineage_mismatch");
    }
    failures.push(...validateBindingSet(response.execution_binding_set, evidenceContext)
      .map((code) => `action_get_binding_${code}`));
    failures.push(...validateLineageCommitment(response.lineage_commitment, context).map((code) => `action_get_commitment_${code}`));
    const authorityExpected = response.current_action_state_head.authority_ref;
    if (preauthorizedPrepared) {
      if (authorityExpected !== null || response.authority_basis?.schema !== "cairn.agent_mandate.v0.3" ||
          !exactRef(response.lineage_commitment.mandate_ref, response.authority_basis, context)) {
        failures.push("action_get_authority_mismatch");
      } else {
        failures.push(...validateMandate(response.authority_basis, evidenceContext)
          .map((code) => `action_get_authority_${code}`));
      }
    } else if ((authorityExpected === null) !== (response.authority_basis === null) ||
        (authorityExpected !== null && !exactRef(authorityExpected, response.authority_basis, context))) {
      failures.push("action_get_authority_mismatch");
    } else if (response.authority_basis?.schema === "cairn.agent_mandate.v0.3") {
      failures.push(...validateMandate(response.authority_basis, evidenceContext)
        .map((code) => `action_get_authority_${code}`));
    } else if (response.authority_basis?.schema === "cairn.action_authorization.v0.2") {
      failures.push(...validateActionAuthorization(
        response.authority_basis, response.execution_binding_set, evidenceContext
      )
        .map((code) => `action_get_authority_${code}`));
    } else if (response.authority_basis?.schema === "cairn.cancellation_authorization.v0.1") {
      failures.push(...validateCancellationAuthorization(
        response.authority_basis, response.execution_binding_set, evidenceContext
      )
        .map((code) => `action_get_authority_${code}`));
    }
    if (response.authority_basis !== null) {
      if ((response.lineage_commitment.authority_kind === "preauthorized_mandate" &&
            (response.authority_basis.schema !== "cairn.agent_mandate.v0.3" ||
              !exactRef(response.lineage_commitment.mandate_ref, response.authority_basis, context))) ||
          (response.lineage_commitment.authority_kind === "supervised_pending" &&
            response.authority_basis.schema !== "cairn.action_authorization.v0.2") ||
          (response.lineage_commitment.authority_kind === "cancellation_pending" &&
            response.authority_basis.schema !== "cairn.cancellation_authorization.v0.1")) {
        failures.push("action_get_authority_branch_mismatch");
      }
      if (response.authority_basis.schema === "cairn.agent_mandate.v0.3") {
        failures.push(...mandateBindingFailures(
          response.authority_basis, response.lineage_commitment, response.execution_binding_set, evidenceContext
        ).map((code) => `action_get_${code}`));
      }
    }
    const activated = response.current_action_state_head.lineage_activation_receipt_ref !== null;
    const unactivatedLineageStates = new Set([
      "provisional", "provisional_expired", "provisional_superseded", "provisional_cancelled"
    ]);
    if (activated === unactivatedLineageStates.has(response.current_lineage_state_head.state) ||
        activated !== (response.current_lineage_state_head.activated_action_ref !== null)) {
      failures.push("action_get_lineage_stage_mismatch");
    }
    failures.push(...actionLineageStateFailures(
      response.current_action_state_head, response.current_lineage_state_head
    ).map((code) => `action_get_${code}`));
    const reservationRefs = response.authority_reservations.map((reservation) => objectRef(reservation, context));
    if (canonicalHash(reservationRefs) !== canonicalHash(response.current_action_state_head.reservation_refs)) {
      failures.push("action_get_reservation_set_mismatch");
    }
    for (const reservation of response.authority_reservations) {
      if (!exactRef(reservation.prepared_action_ref, response.action_record, context) ||
          !sameObjectRef(reservation.execution_binding_set_ref, response.action_record.execution_binding_set_ref) ||
          !sameObjectRef(reservation.lineage_commitment_ref, response.action_record.lineage_commitment_ref) ||
          reservation.principal_id !== response.action_record.principal_id ||
          reservation.action_control_key !== response.current_lineage_state_head.action_control_key ||
          canonicalHash(reservation.authority_basis_ref) !== canonicalHash(response.current_action_state_head.authority_ref) ||
          reservation.next_lineage_fence !== response.current_lineage_state_head.fencing_token) {
        failures.push("action_get_reservation_chain_mismatch");
      }
      failures.push(...validateAuthorityReservation(
        reservation, response.action_record, response.execution_binding_set,
        { ...evidenceContext, lineageCommitment: response.lineage_commitment,
          authority: response.authority_basis }
      ).map((code) => `action_get_reservation_${code}`));
    }
    const currentReceiptProjection = [
      response.current_action_state_head.prior_transition_receipt_ref,
      response.current_action_state_head.lineage_activation_receipt_ref,
      ...response.current_action_state_head.reservation_refs,
      response.current_action_state_head.gate_result_ref,
      response.current_action_state_head.redemption_receipt_ref,
      response.current_action_state_head.receiver_receipt_ref
    ].filter((reference) => reference !== null);
    if (canonicalHash(response.current_activity_detail.current_receipt_refs) !== canonicalHash(currentReceiptProjection)) {
      failures.push("action_get_activity_receipt_projection_mismatch");
    }
    const expectedGate = response.current_action_state_head.gate_result_ref;
    const gatePairPresent = response.gate_request !== null && response.gate_result !== null;
    const issuanceConfirmationPresent = preauthorizedAction && response.confirmation_receipt !== null;
    if ((response.gate_request === null) !== (response.gate_result === null) ||
        (gatePairPresent && response.confirmation_receipt === null) ||
        (!gatePairPresent && response.confirmation_receipt !== null && !issuanceConfirmationPresent) ||
        (preauthorizedAction && !issuanceConfirmationPresent)) {
      failures.push("action_get_gate_pair_mismatch");
    } else if (gatePairPresent) {
      failures.push(...validateGateRequest(
        response.gate_request, response.execution_binding_set, response.authority_basis,
        response.confirmation_receipt,
        {
          ...evidenceContext,
          lineageCommitment: response.lineage_commitment,
          gateEvaluationTime: response.gate_result.evaluated_at,
          confirmationEvaluationTime: response.gate_result.evaluated_at,
          authorityServiceTime: Date.parse(response.gate_result.evaluated_at)
        }
      ).map((code) => `action_get_gate_request_${code}`));
      failures.push(...validateGateResult(response.gate_result, {
        ...evidenceContext, gateRequest: response.gate_request,
        binding: response.execution_binding_set,
        authority: response.authority_basis, confirmation: response.confirmation_receipt,
        lineageCommitment: response.lineage_commitment
      }).map((code) => `action_get_gate_result_${code}`));
      if (!exactRef(response.gate_result.gate_request_ref, response.gate_request, context) ||
          !sameObjectRef(response.gate_result.execution_binding_set_ref, response.action_record.execution_binding_set_ref) ||
          !sameObjectRef(response.gate_request.execution_binding_set_ref, response.action_record.execution_binding_set_ref) ||
          !sameObjectRef(response.gate_request.authority_basis_ref, response.current_action_state_head.authority_ref) ||
          response.gate_request.principal_id !== response.action_record.principal_id ||
          response.gate_request.action_control_key !== response.current_lineage_state_head.action_control_key ||
          canonicalHash(response.gate_request.reservation_receipt_refs) !== canonicalHash(reservationRefs)) {
        failures.push("action_get_gate_pair_mismatch");
      }
      if (expectedGate !== null || response.current_action_state_head.state !== "reserved" ||
          response.gate_result.decision !== "deny") {
        failures.push("action_get_gate_decision_state_mismatch");
      }
    } else if (issuanceConfirmationPresent) {
      failures.push(...validateExecutionConfirmation(
        response.confirmation_receipt, response.authority_basis, response.execution_binding_set, null,
        { ...evidenceContext, confirmationEvaluationTime: response.retrieved_at }
      ).map((code) => `action_get_confirmation_${code}`));
    } else if (expectedGate !== null) {
      failures.push("action_get_gate_pair_mismatch");
    }
    return unique(failures);
  } catch {
    return ["action_get_response_malformed"];
  }
}

function resolveKey(resolver, keyId, evaluationTime = null) {
  if (resolver instanceof Map) return resolver.get(keyId);
  if (typeof resolver === "function") return resolver(keyId, evaluationTime);
  return null;
}

function resolveObject(resolver, reference) {
  if (resolver instanceof Map) return resolver.get(reference?.object_hash) ?? resolver.get(reference?.object_id);
  if (typeof resolver === "function") return resolver(reference);
  return null;
}

const KEY_STATUSES = new Set(["active", "revoked"]);
const PROTOCOL_TIME = /^[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$/;
function protocolTime(value) {
  if (typeof value !== "string" || !PROTOCOL_TIME.test(value)) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) && new Date(instant).toISOString().replace(".000Z", "Z") === value ? instant : null;
}

function expectedControllerFor(object, pointer, proof, context) {
  if (["/principal_signature", "/principal_acceptance_signature", "/principal_high_assurance_signature"].includes(pointer)) {
    return object.principal_id;
  }
  if (pointer === "/principal_or_recovery_signature") {
    if (object.recovery_grant_ref === null) return object.principal_id;
    const grant = resolveObject(context.objectResolver, object.recovery_grant_ref);
    if (!grant || grant.schema !== "cairn.recovery_grant.v0.1" || grant.principal_id !== object.principal_id ||
        proof.key_id !== grant.recovery_key_id) return null;
    return grant.principal_id;
  }
  if (pointer === "/issuing_authority_signature") return object.issuing_authority_id;
  if (pointer === "/execution_release_authority_signature") return context.executionReleaseAuthorityController ?? null;
  return context.expectedControllersByPointer?.[pointer] ?? null;
}

function validateResolvedSignedObject(object, context = {}) {
  try {
    const schema = schemaForResolvedObject(object, context);
    const failures = schema?.["x-cairn-source-spec-sha256"] === undefined
      ? resolvedObjectShapeFailures(object, context, "signed_object")
      : validatePhase1Object(object, context);
    if (failures.length) return failures;
    if (!schema || !Array.isArray(schema["x-cairn-signature-pointers"]) ||
        schema["x-cairn-signature-pointers"].length === 0) return ["signed_object_signature_profile_missing"];
    for (const pointer of schema["x-cairn-signature-pointers"]) {
      const proof = valueAtPointer(object, pointer);
      const key = resolveKey(context.keyResolver, proof.key_id, context.now ?? null);
      if (!key) {
        failures.push("signature_key_unresolved");
        continue;
      }
      const requiredKeyFields = ["key_id", "key_type", "public_key", "controller", "status", "not_before", "expires_at", "revocation_time"];
      if (!isObject(key) || requiredKeyFields.some((field) => !Object.hasOwn(key, field))) failures.push("signature_key_record_incomplete");
      if (key.key_id !== proof.key_id) failures.push("signature_key_id_mismatch");
      if (key.key_type !== "Ed25519") failures.push("signature_key_type_mismatch");
      if (!KEY_STATUSES.has(key.status)) failures.push("signature_key_status_invalid");
      if (typeof key.public_key !== "string" || typeof key.controller !== "string" || key.controller.length === 0) failures.push("signature_key_material_invalid");
      const signedAt = protocolTime(proof.signed_at);
      const keyNotBefore = protocolTime(key.not_before);
      const keyExpiresAt = protocolTime(key.expires_at);
      const keyRevokedAt = key.revocation_time === null ? null : protocolTime(key.revocation_time);
      const now = protocolTime(context.now);
      if (now === null) failures.push("signature_evaluation_time_required");
      else if (signedAt !== null && signedAt > now) failures.push("signature_from_future");
      if (key.status === "revoked" && key.revocation_time === null) failures.push("signature_key_history_incomplete");
      if (!Number.isFinite(signedAt) || !Number.isFinite(keyNotBefore) || !Number.isFinite(keyExpiresAt) ||
          keyNotBefore >= keyExpiresAt || (keyRevokedAt !== null && !Number.isFinite(keyRevokedAt)) ||
          signedAt < keyNotBefore || signedAt >= keyExpiresAt ||
          (keyRevokedAt !== null && signedAt >= keyRevokedAt)) failures.push("signature_key_not_valid_at_signing");
      if (context.requireCurrentKeyEligibility === true &&
          (now === null || now < keyNotBefore || now >= keyExpiresAt ||
           (key.status === "revoked" && keyRevokedAt === null) ||
           (keyRevokedAt !== null && now >= keyRevokedAt))) {
        failures.push("signature_key_not_currently_eligible");
      }
      const expectedController = expectedControllerFor(object, pointer, proof, context);
      if (expectedController === null || expectedController === undefined) failures.push("signature_expected_controller_required");
      else if (key.controller !== expectedController) failures.push("signature_controller_mismatch");
      if (!verifyEd25519({ schemaId: object.schema, objectHash: proof.signed_hash, publicKey: key.public_key, signature: proof.value })) {
        failures.push("signature_invalid");
      }
    }
    return unique(failures);
  } catch {
    return ["signed_object_malformed"];
  }
}

export function validatePhase1SignedObject(object, context = {}) {
  if (!schemaFor(object, context)) return ["phase1_signed_object_schema_unknown"];
  return unique([...validateResolvedSignedObject(object, context).map((code) =>
    code === "signed_object_malformed" ? "phase1_signed_object_malformed" : code
  ), AUTHENTICATED_RESOLUTION_UNSUPPORTED]);
}

function objectRef(object, context) {
  return objectRefFor(object, schemaFor(object, context));
}

function exactRef(ref, object, context) {
  try {
    return sameObjectRef(ref, objectRef(object, context));
  } catch {
    return false;
  }
}

function refHashPairFailures(value, pairs, code) {
  const failures = [];
  for (const [refField, hashField] of pairs) {
    const reference = value[refField];
    const digest = value[hashField];
    if ((reference === null) !== (digest === null) ||
        (reference !== null && (!isObject(reference) || reference.object_hash !== digest))) {
      failures.push(code, `${code}:${refField}`);
    }
  }
  return failures;
}

const CANCELLATION_CONTEXT_REF_HASH_PAIRS = [
  ["original_action_ref", "original_action_hash"],
  ["original_action_state_head_ref", "original_action_state_head_hash"],
  ["receiver_event_stream_state_head_ref", "receiver_event_stream_state_head_hash"],
  ["original_executor_credential_binding_core_ref", "original_executor_credential_binding_core_hash"],
  ["original_executor_credential_binding_head_ref", "original_executor_credential_binding_head_hash"],
  ["original_credential_instance_core_ref", "original_credential_instance_core_hash"],
  ["original_executor_credential_binding_current_head_ref", "original_executor_credential_binding_current_head_hash"],
  ["cancellation_executor_credential_binding_head_ref", "cancellation_executor_credential_binding_head_hash"],
  ["cancellation_credential_instance_state_head_ref", "cancellation_credential_instance_state_head_hash"],
  ["cancellation_credential_continuity_receipt_ref", "cancellation_credential_continuity_receipt_hash"],
  ["cancellation_cost_attestation_ref", "cancellation_cost_attestation_hash"],
  ["cancellation_fee_source_state_head_ref", "cancellation_fee_source_state_head_hash"],
  ["safety_preparation_intent_ref", "safety_preparation_intent_hash"]
];

const CANCELLATION_AUTHORIZATION_REF_HASH_PAIRS = [
  ["restrictive_control_head_ref", "restrictive_control_head_hash"],
  ["safety_preparation_intent_ref", "safety_preparation_intent_hash"],
  ["cancellation_cost_attestation_ref", "cancellation_cost_attestation_hash"],
  ["cancellation_fee_source_state_head_ref", "cancellation_fee_source_state_head_hash"],
  ["execution_binding_set_ref", "execution_binding_set_hash"],
  ["original_action_ref", "original_action_hash"],
  ["original_action_state_head_ref", "original_action_state_head_hash"],
  ["receiver_event_stream_state_head_ref", "receiver_event_stream_state_head_hash"],
  ["original_executor_credential_binding_core_ref", "original_executor_credential_binding_core_hash"],
  ["original_executor_credential_binding_head_ref", "original_executor_credential_binding_head_hash"],
  ["original_credential_instance_core_ref", "original_credential_instance_core_hash"],
  ["original_executor_credential_binding_current_head_ref", "original_executor_credential_binding_current_head_hash"],
  ["cancellation_executor_credential_binding_head_ref", "cancellation_executor_credential_binding_head_hash"],
  ["cancellation_credential_instance_state_head_ref", "cancellation_credential_instance_state_head_hash"],
  ["cancellation_credential_continuity_receipt_ref", "cancellation_credential_continuity_receipt_hash"]
];

function targetUnionFailures(value, scoped = false) {
  const failures = [];
  const { scope, target_kind: kind, target_ref: target, compartment_control_key: compartment, action_control_key: action } = value;
  const expected = scoped
    ? { connection: "object_ref", runtime: "object_ref", mandate: "object_ref", compartment: "compartment_resource", action: "action_occurrence" }
    : { all_agents: "global", connection: "object_ref", runtime: "object_ref", mandate: "object_ref", compartment: "compartment_resource", action: "action_occurrence" };
  if (expected[scope] !== kind) failures.push("control_target_kind_mismatch");
  if (["connection", "runtime", "mandate"].includes(scope)) {
    if (target === null || compartment !== null || action !== null) failures.push("control_object_target_union_mismatch");
  } else if (scope === "compartment") {
    if (target !== null || compartment === null || action !== null) failures.push("control_compartment_target_union_mismatch");
  } else if (scope === "action") {
    if (target !== null || compartment !== null || action === null) failures.push("control_action_target_union_mismatch");
  } else if (scope === "all_agents") {
    if (target !== null || compartment !== null || action !== null) failures.push("control_global_target_union_mismatch");
  }
  return failures;
}

export function validateControlAuthorization(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    failures.push(...targetUnionFailures(value));
    const recovery = [value.recovery_grant_ref, value.recovery_grant_state_head_ref, value.recovery_grant_state_head_hash, value.recovery_use_idempotency_nonce];
    if (!(recovery.every(isNull) || recovery.every((item) => item !== null))) failures.push("control_recovery_union_mismatch");
    if (Date.parse(value.requested_at) >= Date.parse(value.expires_at)) failures.push("control_authorization_not_current_interval");
    return unique(failures);
  } catch {
    return ["control_authorization_malformed"];
  }
}

export function scopedControlLeafKey(value) {
  return canonicalHash({
    schema: "cairn.scoped_execution_control_leaf_key_preimage.v0.1",
    principal_id: value.principal_id,
    control_namespace_generation: value.control_namespace_generation,
    scope: value.scope,
    target_kind: value.target_kind,
    target_ref: value.target_ref,
    compartment_control_key: value.compartment_control_key,
    action_control_key: value.action_control_key
  });
}

function controlTransitionFailures(action, beforeState, beforePauseEpoch, beforeNonce,
  afterState, afterPauseEpoch, afterNonce) {
  const valid = new Map([
    ["pause", beforeState === "active" && afterState === "paused" &&
      afterPauseEpoch === beforePauseEpoch + 1 && afterNonce === beforeNonce],
    ["freeze_new_redemptions", beforeState === "active" && afterState === "frozen_new_redemptions" &&
      afterPauseEpoch === beforePauseEpoch + 1 && afterNonce === beforeNonce],
    ["resume", ["paused", "frozen_new_redemptions"].includes(beforeState) && afterState === "active" &&
      afterPauseEpoch === beforePauseEpoch && afterNonce === beforeNonce],
    ["revoke", ["active", "paused", "frozen_new_redemptions"].includes(beforeState) &&
      afterState === "revoked" && afterPauseEpoch === beforePauseEpoch && afterNonce === beforeNonce + 1]
  ]).get(action);
  return valid === true ? [] : ["control_transition_invalid"];
}

export function validateScopedControlLeaf(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    failures.push(...targetUnionFailures(value, true));
    if (value.scoped_control_leaf_key !== scopedControlLeafKey(value)) {
      failures.push("scoped_control_leaf_key_mismatch");
    }
    if (value.state === "revoked" && value.revocation_nonce === 0) failures.push("revoked_control_without_nonce");
    return unique(failures);
  } catch {
    return ["scoped_control_leaf_malformed"];
  }
}

export function validateExecutionControlNamespace(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    const genesis = value.generation === 0;
    if (genesis !== (value.prior_namespace_ref === null && value.prior_revoked_head_ref === null)) {
      failures.push("control_namespace_generation_union_mismatch");
    }
    if (!genesis) {
      const priorNamespace = resolveObject(context.objectResolver, value.prior_namespace_ref);
      const priorHead = resolveObject(context.objectResolver, value.prior_revoked_head_ref);
      if (!priorNamespace || priorNamespace.schema !== value.schema ||
          !exactRef(value.prior_namespace_ref, priorNamespace, context) ||
          !priorHead || priorHead.schema !== "cairn.execution_control_state_head.v0.1" ||
          !exactRef(value.prior_revoked_head_ref, priorHead, context) ||
          (context.requireDependencySignatures === true &&
            (validateResolvedSignedObject(priorNamespace, context).length ||
             validateResolvedSignedObject(priorHead, context).length)) ||
          priorNamespace.principal_id !== value.principal_id ||
          priorNamespace.authority_namespace !== value.authority_namespace ||
          value.generation !== priorNamespace.generation + 1 ||
          priorHead.principal_id !== value.principal_id ||
          priorHead.authority_namespace !== value.authority_namespace ||
          priorHead.control_namespace_generation !== priorNamespace.generation ||
          !sameObjectRef(priorHead.control_namespace_ref, value.prior_namespace_ref) ||
          priorHead.global_state !== "revoked" ||
          Date.parse(priorNamespace.created_at) > Date.parse(value.created_at) ||
          Date.parse(priorHead.updated_at) > Date.parse(value.created_at)) {
        failures.push("control_namespace_predecessor_mismatch");
      }
    }
    return unique(failures);
  } catch {
    return ["control_namespace_malformed"];
  }
}

export function validateExecutionControlStateHead(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    const namespace = resolveObject(context.objectResolver, value.control_namespace_ref);
    const map = resolveObject(context.objectResolver, value.scoped_control_map_ref);
    if (!namespace || namespace.schema !== "cairn.execution_control_namespace.v0.1" ||
        !exactRef(value.control_namespace_ref, namespace, context) ||
        validateExecutionControlNamespace(namespace, context).length ||
        (context.requireDependencySignatures === true &&
          validateResolvedSignedObject(namespace, context).length) ||
        namespace.principal_id !== value.principal_id ||
        namespace.authority_namespace !== value.authority_namespace ||
        namespace.generation !== value.control_namespace_generation) {
      failures.push("execution_control_head_namespace_mismatch");
    }
    if (!map || map.schema !== "cairn.enumerable_map_root.v0.1" ||
        !exactRef(value.scoped_control_map_ref, map, context) ||
        validateEnumerableMapRoot(map, {
          ...context,
          expectedMapDomain: "scoped_execution_control",
          expectedMapKey: executionControlMapKey(
            value.principal_id, value.authority_namespace, value.control_namespace_generation
          )
        }).length ||
        (context.requireDependencySignatures === true && validateResolvedSignedObject(map, context).length) ||
        value.scoped_control_map_hash !== map.map_hash ||
        value.scoped_control_head_count !== map.entry_count ||
        value.scoped_control_heads_root !== map.entries_root) {
      failures.push("execution_control_head_map_mismatch");
    }
    if (value.sequence === 0) {
      if (value.previous_head_hash !== null || value.global_state !== "active" ||
          value.global_pause_epoch !== 0 || value.global_revocation_nonce !== 0 ||
          value.control_namespace_generation !== 0) {
        failures.push("execution_control_head_genesis_mismatch");
      }
    } else {
      const predecessorRef = {
        schema: value.schema, object_id: value.previous_head_hash, object_hash: value.previous_head_hash
      };
      const predecessor = typeof context.statePredecessorResolver === "function"
        ? context.statePredecessorResolver(predecessorRef, value.updated_at)
        : resolveObject(context.objectResolver, predecessorRef);
      if (!predecessor || predecessor.schema !== value.schema ||
          !exactRef(predecessorRef, predecessor, context) ||
          validatePhase1Object(predecessor, context).length ||
          (context.requireDependencySignatures === true &&
            validateResolvedSignedObject(predecessor, context).length) ||
          predecessor.principal_id !== value.principal_id ||
          predecessor.authority_namespace !== value.authority_namespace ||
          !sameObjectRef(predecessor.control_namespace_ref, value.control_namespace_ref) ||
          predecessor.control_namespace_generation !== value.control_namespace_generation ||
          value.sequence !== predecessor.sequence + 1 ||
          Date.parse(predecessor.updated_at) > Date.parse(value.updated_at) ||
          ["revoked"].includes(predecessor.global_state) ||
          value.global_pause_epoch < predecessor.global_pause_epoch ||
          value.global_revocation_nonce < predecessor.global_revocation_nonce) {
        failures.push("execution_control_head_predecessor_mismatch");
      }
    }
    return unique(failures);
  } catch {
    return ["execution_control_head_malformed"];
  }
}

function jointConnectionControlPairFailures(controlReceipt, connectionReceipt, authorization,
  connectionBefore, connectionAfter, leafBefore, leafAfter, outstandingHead, context = {}) {
  const failures = [];
  const actionMatches = authorization && connectionBefore && connectionAfter && leafAfter && (
    (authorization.control_action === "pause" && leafAfter.state === "paused" && connectionAfter.state === "paused") ||
    (authorization.control_action === "resume" && leafAfter.state === "active" && connectionAfter.state === "active") ||
    (authorization.control_action === "revoke" && leafAfter.state === "revoked" && connectionAfter.state === "revoked") ||
    (authorization.control_action === "freeze_new_redemptions" &&
      leafAfter.state === "frozen_new_redemptions" && connectionAfter.state === connectionBefore.state)
  );
  if (!controlReceipt || !connectionReceipt || !authorization || !connectionBefore || !connectionAfter ||
      !leafBefore || !leafAfter || !outstandingHead ||
      controlReceipt.cause !== "connection_joint_control" ||
      connectionReceipt.cause !== "principal_control" ||
      !exactRef(controlReceipt.connection_state_event_receipt_ref, connectionReceipt, context) ||
      !exactRef(connectionReceipt.principal_control_authorization_ref, authorization, context) ||
      !exactRef(connectionReceipt.connection_before_head_ref, connectionBefore, context) ||
      !exactRef(connectionReceipt.connection_after_head_ref, connectionAfter, context) ||
      !exactRef(controlReceipt.scoped_leaf_before_ref, leafBefore, context) ||
      !exactRef(controlReceipt.scoped_leaf_after_ref, leafAfter, context) ||
      !exactRef(controlReceipt.outstanding_action_index_head_ref, outstandingHead, context) ||
      controlReceipt.authority_transaction_id !== connectionReceipt.authority_transaction_id ||
      controlReceipt.committed_at !== connectionReceipt.committed_at ||
      authorization.scope !== "connection" || authorization.target_kind !== "object_ref" ||
      !sameObjectRef(authorization.target_ref, connectionAfter.connection_authorization_ref) ||
      leafBefore.scope !== "connection" || leafAfter.scope !== "connection" ||
      !sameObjectRef(leafBefore.target_ref, connectionAfter.connection_authorization_ref) ||
      !sameObjectRef(leafAfter.target_ref, connectionAfter.connection_authorization_ref) ||
      leafBefore.scoped_control_leaf_key !== connectionBefore.connection_scoped_control_key ||
      leafAfter.scoped_control_leaf_key !== connectionAfter.connection_scoped_control_key ||
      leafBefore.head_hash !== connectionReceipt.connection_leaf_before_hash ||
      leafAfter.head_hash !== connectionReceipt.connection_leaf_after_hash ||
      leafAfter.sequence !== leafBefore.sequence + 1 || leafAfter.previous_state_hash !== leafBefore.head_hash ||
      leafAfter.pause_epoch !== connectionAfter.pause_epoch ||
      leafAfter.revocation_nonce !== connectionAfter.revocation_nonce ||
      connectionAfter.connection_state_id !== outstandingHead.connection_state_id ||
      !sameObjectRef(connectionReceipt.outstanding_action_index_after_head_ref,
        controlReceipt.outstanding_action_index_head_ref) || !actionMatches) {
    failures.push("joint_connection_control_pair_mismatch");
  }
  return failures;
}

export function validateExecutionControlReceipt(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    failures.push(...refHashPairFailures(value, [
      ["control_authorization_ref", "control_authorization_hash"],
      ["control_namespace_ref", "control_namespace_hash"],
      ["prior_control_namespace_ref", "prior_control_namespace_hash"],
      ["prior_revoked_control_head_ref", "prior_revoked_control_head_hash"],
      ["before_control_head_ref", "before_control_head_hash"],
      ["after_control_head_ref", "after_control_head_hash"],
      ["before_scoped_control_map_ref", "before_scoped_control_map_hash"],
      ["after_scoped_control_map_ref", "after_scoped_control_map_hash"],
      ["scoped_leaf_before_ref", "scoped_leaf_before_hash"],
      ["scoped_leaf_after_ref", "scoped_leaf_after_hash"],
      ["connection_state_event_receipt_ref", "connection_state_event_receipt_hash"],
      ["recovery_grant_transition_receipt_ref", "recovery_grant_transition_receipt_hash"],
      ["outstanding_action_index_head_ref", "outstanding_action_index_head_hash"]
    ], "execution_control_receipt_ref_hash_mismatch"));
    const authorizationBasis = value.authorization_basis_kind === "control_authorization";
    if (authorizationBasis !== (value.control_authorization_ref !== null) ||
        authorizationBasis === (value.control_namespace_ref !== null)) {
      failures.push("execution_control_receipt_authority_union_mismatch");
    }
    const scoped = value.cause === "scoped_control";
    const jointConnection = value.cause === "connection_joint_control";
    const scopedLeafCause = scoped || jointConnection;
    const authorization = authorizationBasis
      ? context.controlAuthorization ?? resolveObject(context.objectResolver, value.control_authorization_ref)
      : null;
    const recoveryAuthorization = authorization !== null && authorization?.recovery_grant_ref !== null;
    const recoveryReceiptPresent = value.recovery_grant_transition_receipt_ref !== null;
    if (recoveryReceiptPresent !== recoveryAuthorization) failures.push("execution_control_receipt_recovery_union_mismatch");
    if (authorizationBasis && authorization &&
        ((authorization.scope === "connection") !== jointConnection ||
         (authorization.scope !== "connection" && !["global_control", "scoped_control"].includes(value.cause)))) {
      failures.push("execution_control_receipt_cause_scope_mismatch");
    }
    if (scopedLeafCause !== (value.scoped_leaf_after_ref !== null) ||
        (jointConnection && value.scoped_leaf_before_ref === null) ||
        (!scopedLeafCause && (value.scoped_leaf_before_ref !== null || value.scoped_leaf_after_ref !== null)) ||
        jointConnection !== (value.connection_state_event_receipt_ref !== null)) {
      failures.push("execution_control_receipt_cause_union_mismatch");
    }
    const before = value.before_control_head_ref === null ? null :
      resolveObject(context.objectResolver, value.before_control_head_ref);
    const after = resolveObject(context.objectResolver, value.after_control_head_ref);
    if ((before !== null && (!exactRef(value.before_control_head_ref, before, context) ||
        validatePhase1Object(before, context).length ||
        (context.requireDependencySignatures === true && validateResolvedSignedObject(before, context).length))) || !after ||
        !exactRef(value.after_control_head_ref, after, context) || validatePhase1Object(after, context).length ||
        (context.requireDependencySignatures === true && validateResolvedSignedObject(after, context).length) ||
        (before === null && value.cause !== "namespace_genesis") ||
        (before !== null && (after.sequence !== before.sequence + 1 ||
          after.previous_head_hash !== before.head_hash || after.principal_id !== before.principal_id ||
          after.principal_id !== value.principal_id))) {
      failures.push("execution_control_receipt_head_transition_mismatch");
    }
    if (after?.updated_at !== value.committed_at) {
      failures.push("execution_control_receipt_head_time_mismatch");
    }
    if (authorizationBasis && before && after &&
        (after.authority_namespace !== before.authority_namespace ||
         !sameObjectRef(after.control_namespace_ref, before.control_namespace_ref) ||
         after.control_namespace_generation !== before.control_namespace_generation)) {
      failures.push("execution_control_receipt_namespace_identity_mismatch");
    }
    if ((before === null
      ? value.before_scoped_control_map_ref !== null || value.before_scoped_control_map_hash !== null
      : !sameObjectRef(value.before_scoped_control_map_ref, before.scoped_control_map_ref) ||
        value.before_scoped_control_map_hash !== before.scoped_control_map_hash) ||
        !sameObjectRef(value.after_scoped_control_map_ref, after?.scoped_control_map_ref) ||
        value.after_scoped_control_map_hash !== after?.scoped_control_map_hash) {
      failures.push("execution_control_receipt_map_binding_mismatch");
    }
    const beforeMap = before === null ? null :
      resolveObject(context.objectResolver, value.before_scoped_control_map_ref);
    const afterMap = resolveObject(context.objectResolver, value.after_scoped_control_map_ref);
    const validControlMap = (map, head) => Boolean(head) && map?.schema === "cairn.enumerable_map_root.v0.1" &&
      exactRef(head.scoped_control_map_ref, map, context) &&
      validateEnumerableMapRoot(map, {
        ...context,
        expectedMapDomain: "scoped_execution_control",
        expectedMapKey: executionControlMapKey(
          head.principal_id, head.authority_namespace, head.control_namespace_generation
        )
      }).length === 0 &&
      (context.requireDependencySignatures !== true || validateResolvedSignedObject(map, context).length === 0) &&
      head.scoped_control_map_hash === map.map_hash &&
      head.scoped_control_head_count === map.entry_count &&
      head.scoped_control_heads_root === map.entries_root;
    if ((before !== null && !validControlMap(beforeMap, before)) || !validControlMap(afterMap, after)) {
      failures.push("execution_control_receipt_map_commitment_mismatch");
    }
    if (authorizationBasis) {
      if (!authorization || authorization.schema !== "cairn.execution_control_authorization.v0.1" ||
          !exactRef(value.control_authorization_ref, authorization, context)) {
        failures.push("execution_control_receipt_authorization_unresolved");
      } else {
        if (context.requireDependencySignatures === true && validateResolvedSignedObject(authorization, context).length) {
          failures.push("execution_control_receipt_authorization_signature_invalid");
        }
        if (validateControlAuthorization(authorization, context).length ||
            authorization.principal_id !== value.principal_id ||
            authorization.expected_control_head_hash !== before?.head_hash ||
            Date.parse(authorization.requested_at) > Date.parse(value.committed_at) ||
            Date.parse(value.committed_at) >= Date.parse(authorization.expires_at)) {
          failures.push("execution_control_receipt_authorization_mismatch");
        }
        const expectedState = new Map([
          ["pause", "paused"], ["resume", "active"], ["revoke", "revoked"],
          ["freeze_new_redemptions", "frozen_new_redemptions"]
        ]).get(authorization.control_action);
        const transitionedState = authorization.scope === "all_agents"
          ? after?.global_state
          : resolveObject(context.objectResolver, value.scoped_leaf_after_ref)?.state;
        if (expectedState === undefined || transitionedState !== expectedState) {
          failures.push("execution_control_receipt_authorized_transition_mismatch");
        }
        const beforeTarget = authorization.scope === "all_agents" ? before :
          value.scoped_leaf_before_ref === null
            ? resolveObject(context.objectResolver, value.scoped_leaf_after_ref)
            : resolveObject(context.objectResolver, value.scoped_leaf_before_ref);
        const targetFields = ["scope", "target_kind", "target_ref", "compartment_control_key", "action_control_key"];
        if (authorization.scope !== "all_agents" && (!beforeTarget ||
            targetFields.some((field) => canonicalHash(authorization[field]) !== canonicalHash(beforeTarget[field])))) {
          failures.push("execution_control_receipt_target_mismatch");
        }
        const insertingLeaf = authorization.scope !== "all_agents" && value.scoped_leaf_before_ref === null;
        const beforePauseEpoch = authorization.scope === "all_agents"
          ? before?.global_pause_epoch : insertingLeaf ? 0 : beforeTarget?.pause_epoch;
        const beforeRevocationNonce = authorization.scope === "all_agents"
          ? before?.global_revocation_nonce : insertingLeaf ? 0 : beforeTarget?.revocation_nonce;
        if (authorization.expected_pause_epoch !== beforePauseEpoch ||
            authorization.expected_revocation_nonce !== beforeRevocationNonce) {
          failures.push("execution_control_receipt_epoch_nonce_mismatch");
        }
      }
    } else {
      const namespace = resolveObject(context.objectResolver, value.control_namespace_ref);
      if (!namespace || namespace.schema !== "cairn.execution_control_namespace.v0.1" ||
          !exactRef(value.control_namespace_ref, namespace, context) ||
          (context.requireDependencySignatures === true && validateResolvedSignedObject(namespace, context).length) ||
          namespace.principal_id !== value.principal_id ||
          namespace.generation !== after?.control_namespace_generation ||
          !sameObjectRef(after?.control_namespace_ref, value.control_namespace_ref) ||
          (value.cause === "namespace_genesis" &&
            (namespace.generation !== 0 || namespace.prior_namespace_ref !== null || before !== null)) ||
          (value.cause === "namespace_rotation" &&
            (!sameObjectRef(namespace.prior_namespace_ref, value.prior_control_namespace_ref) || before === null))) {
        failures.push("execution_control_receipt_namespace_basis_mismatch");
      }
      if (value.cause === "namespace_genesis" && after &&
          (after.global_state !== "active" || after.global_pause_epoch !== 0 ||
           after.global_revocation_nonce !== 0 || after.sequence !== 0 || after.previous_head_hash !== null)) {
        failures.push("execution_control_receipt_namespace_genesis_invalid");
      }
      if (value.cause === "namespace_rotation" && before && after && namespace) {
        const priorNamespace = resolveObject(context.objectResolver, value.prior_control_namespace_ref);
        const priorHead = resolveObject(context.objectResolver, value.prior_revoked_control_head_ref);
        if (!priorNamespace || priorNamespace.schema !== "cairn.execution_control_namespace.v0.1" ||
            !exactRef(value.prior_control_namespace_ref, priorNamespace, context) ||
            (context.requireDependencySignatures === true && validateResolvedSignedObject(priorNamespace, context).length) ||
            !priorHead || !exactRef(value.prior_revoked_control_head_ref, priorHead, context) ||
            !sameObjectRef(value.prior_revoked_control_head_ref, value.before_control_head_ref) ||
            (context.requireDependencySignatures === true && validateResolvedSignedObject(priorHead, context).length) ||
            priorHead.global_state !== "revoked" ||
            !sameObjectRef(priorHead.control_namespace_ref, value.prior_control_namespace_ref) ||
            priorHead.control_namespace_generation !== priorNamespace.generation ||
            priorNamespace.principal_id !== value.principal_id ||
            priorNamespace.authority_namespace !== priorHead.authority_namespace ||
            namespace.generation !== priorNamespace.generation + 1 ||
            !sameObjectRef(namespace.prior_revoked_head_ref, value.prior_revoked_control_head_ref) ||
            after.global_state !== "active" || after.global_pause_epoch !== 0 ||
            after.global_revocation_nonce !== 0 ||
            after.authority_namespace !== namespace.authority_namespace) {
          failures.push("execution_control_receipt_namespace_rotation_invalid");
        }
      }
    }
    if (scopedLeafCause) {
      const leafBefore = value.scoped_leaf_before_ref === null ? null :
        resolveObject(context.objectResolver, value.scoped_leaf_before_ref);
      const leafAfter = resolveObject(context.objectResolver, value.scoped_leaf_after_ref);
      if ((leafBefore !== null && (!exactRef(value.scoped_leaf_before_ref, leafBefore, context) ||
          validateScopedControlLeaf(leafBefore, context).length ||
          (context.requireDependencySignatures === true && validateResolvedSignedObject(leafBefore, context).length))) ||
          !leafAfter || !exactRef(value.scoped_leaf_after_ref, leafAfter, context) ||
          validateScopedControlLeaf(leafAfter, context).length ||
          (context.requireDependencySignatures === true && validateResolvedSignedObject(leafAfter, context).length) ||
          (leafBefore !== null && (leafAfter.sequence !== leafBefore.sequence + 1 ||
            leafAfter.previous_state_hash !== leafBefore.head_hash ||
            leafAfter.scoped_control_leaf_key !== leafBefore.scoped_control_leaf_key ||
            leafAfter.principal_id !== leafBefore.principal_id))) {
        failures.push("execution_control_receipt_scoped_leaf_transition_mismatch");
      }
      const leafIdentityFields = ["principal_id", "control_namespace_generation", "scope", "target_kind",
        "target_ref", "compartment_control_key", "action_control_key", "scoped_control_leaf_key"];
      if (leafAfter?.updated_at !== value.committed_at ||
          leafAfter?.control_namespace_generation !== after?.control_namespace_generation ||
          (leafBefore !== null && leafIdentityFields.some((field) =>
            canonicalHash(leafAfter?.[field]) !== canonicalHash(leafBefore?.[field])))) {
        failures.push("execution_control_receipt_scoped_leaf_identity_mismatch");
      }
      const beforeProof = beforeMap === null ? null : validateEnumerableMapPathProof(
        value.before_change_proof, beforeMap,
        leafBefore === null ? "nonmembership" : "membership",
        leafBefore === null ? null : {
          entry_object_ref: value.scoped_leaf_before_ref,
          entry_object_hash: value.scoped_leaf_before_hash
        }, { ...context, expectedEntryKey: leafAfter?.scoped_control_leaf_key }
      );
      const afterProof = afterMap === null ? null : validateEnumerableMapPathProof(
        value.after_change_proof, afterMap, "membership", {
          entry_object_ref: value.scoped_leaf_after_ref,
          entry_object_hash: value.scoped_leaf_after_hash
        }, { ...context, expectedEntryKey: leafAfter?.scoped_control_leaf_key }
      );
      const proofValid = beforeProof !== null && afterProof !== null &&
        beforeProof.failures.length === 0 && afterProof.failures.length === 0 &&
        canonicalHash(beforeProof.frontier) === canonicalHash(afterProof.frontier) &&
        afterMap?.revision === beforeMap?.revision + 1 &&
        afterMap?.entry_count === beforeMap?.entry_count + (leafBefore === null ? 1 : 0);
      if (!proofValid) failures.push("execution_control_receipt_map_proof_mismatch");
      const transitionBefore = leafBefore ?? {
        state: "active", pause_epoch: 0, revocation_nonce: 0, sequence: -1, head_hash: null
      };
      if (leafBefore === null && leafAfter &&
          (leafAfter.sequence !== 0 || leafAfter.previous_state_hash !== null ||
           authorization?.control_action === "resume")) {
        failures.push("execution_control_receipt_scoped_genesis_invalid");
      }
      if (authorizationBasis && (!leafAfter || controlTransitionFailures(
        authorization?.control_action,
        transitionBefore.state, transitionBefore.pause_epoch, transitionBefore.revocation_nonce,
        leafAfter.state, leafAfter.pause_epoch, leafAfter.revocation_nonce
      ).length)) {
        failures.push("execution_control_receipt_transition_mismatch");
      }
      if (before && after &&
          (after.global_state !== before.global_state ||
           after.global_pause_epoch !== before.global_pause_epoch ||
           after.global_revocation_nonce !== before.global_revocation_nonce)) {
        failures.push("execution_control_receipt_scoped_global_tuple_mismatch");
      }
    } else if (value.before_change_proof !== null || value.after_change_proof !== null) {
      failures.push("execution_control_receipt_map_proof_mismatch");
    } else if (value.cause === "global_control" && before !== null &&
        (!sameObjectRef(before.scoped_control_map_ref, after?.scoped_control_map_ref) ||
         before.scoped_control_map_hash !== after?.scoped_control_map_hash ||
         before.scoped_control_head_count !== after?.scoped_control_head_count ||
         before.scoped_control_heads_root !== after?.scoped_control_heads_root)) {
      failures.push("execution_control_receipt_map_commitment_mismatch");
    } else if (["namespace_genesis", "namespace_rotation"].includes(value.cause) &&
        (afterMap?.entry_count !== 0 || afterMap?.revision !== 0 ||
         afterMap?.entries_root !== enumerableMapEmptyEntriesRoot("scoped_execution_control"))) {
      failures.push("execution_control_receipt_map_commitment_mismatch");
    }
    if (value.cause === "global_control" && authorizationBasis && before && after &&
        controlTransitionFailures(
          authorization?.control_action,
          before.global_state, before.global_pause_epoch, before.global_revocation_nonce,
          after.global_state, after.global_pause_epoch, after.global_revocation_nonce
        ).length) {
      failures.push("execution_control_receipt_transition_mismatch");
    }
    if (jointConnection) {
      const connectionReceipt = resolveObject(context.objectResolver, value.connection_state_event_receipt_ref);
      const outstandingHead = resolveObject(context.objectResolver, value.outstanding_action_index_head_ref);
      const connectionBefore = connectionReceipt
        ? resolveObject(context.objectResolver, connectionReceipt.connection_before_head_ref)
        : null;
      const connectionAfter = connectionReceipt
        ? resolveObject(context.objectResolver, connectionReceipt.connection_after_head_ref)
        : null;
      const jointLeafBefore = resolveObject(context.objectResolver, value.scoped_leaf_before_ref);
      const jointLeafAfter = resolveObject(context.objectResolver, value.scoped_leaf_after_ref);
      if (!connectionReceipt || connectionReceipt.schema !== "cairn.connection_state_event_receipt.v0.1" ||
          !exactRef(value.connection_state_event_receipt_ref, connectionReceipt, context) ||
          (context.requireDependencySignatures === true &&
            validateResolvedSignedObject(connectionReceipt, context).length) ||
          connectionReceipt.authority_transaction_id !== value.authority_transaction_id ||
          connectionReceipt.committed_at !== value.committed_at) {
        failures.push("execution_control_receipt_connection_dependency_invalid");
      }
      if (!outstandingHead ||
          outstandingHead.schema !== "cairn.connection_outstanding_action_index_state_head.v0.1" ||
          !exactRef(value.outstanding_action_index_head_ref, outstandingHead, context) ||
          validateConnectionOutstandingIndexHead(outstandingHead, {
            ...context, expectedConnectionStateId: connectionAfter?.connection_state_id
          }).length ||
          (context.requireDependencySignatures === true &&
            validateResolvedSignedObject(outstandingHead, context).length) ||
          !sameObjectRef(resolveCurrentHead(context, value.outstanding_action_index_head_ref, value.committed_at),
            value.outstanding_action_index_head_ref) ||
          !connectionAfter || !exactRef(connectionReceipt?.connection_after_head_ref, connectionAfter, context) ||
          connectionAfter.connection_state_id !== outstandingHead?.connection_state_id ||
          !sameObjectRef(connectionReceipt?.outstanding_action_index_after_head_ref,
            value.outstanding_action_index_head_ref) ||
          !sameObjectRef(authorization?.target_ref, connectionReceipt?.connection_authorization_ref)) {
        failures.push("execution_control_receipt_outstanding_dependency_invalid");
      }
      failures.push(...jointConnectionControlPairFailures(
        value, connectionReceipt, authorization, connectionBefore, connectionAfter,
        jointLeafBefore, jointLeafAfter, outstandingHead, context
      ));
      failures.push(AUTHENTICATED_RESOLUTION_UNSUPPORTED);
    }
    const committedAt = Date.parse(value.committed_at);
    const signedAt = Date.parse(value.authority_service_signature?.signed_at);
    const namespace = value.control_namespace_ref === null ? null :
      resolveObject(context.objectResolver, value.control_namespace_ref);
    const chronologyLeafBefore = value.scoped_leaf_before_ref === null ? null :
      resolveObject(context.objectResolver, value.scoped_leaf_before_ref);
    const chronologyLeafAfter = value.scoped_leaf_after_ref === null ? null :
      resolveObject(context.objectResolver, value.scoped_leaf_after_ref);
    const authorizationTimes = authorization === null ? [] : [
      Date.parse(authorization.principal_or_recovery_signature?.signed_at)
    ];
    const namespaceTimes = namespace === null ? [] : [
      Date.parse(namespace.created_at), Date.parse(namespace.authority_service_signature?.signed_at),
      Date.parse(namespace.principal_high_assurance_signature?.signed_at)
    ];
    const beforeTimes = [
      ...(before === null ? [] : [Date.parse(before.updated_at), Date.parse(before.authority_service_signature?.signed_at)]),
      ...(beforeMap === null ? [] : [Date.parse(beforeMap.issuing_authority_signature?.signed_at)]),
      ...(chronologyLeafBefore === null ? [] : [
        Date.parse(chronologyLeafBefore.updated_at),
        Date.parse(chronologyLeafBefore.authority_service_signature?.signed_at)
      ])
    ];
    const changedMap = beforeMap === null || !sameObjectRef(value.before_scoped_control_map_ref, value.after_scoped_control_map_ref);
    const afterEffectiveTimes = [Date.parse(after?.updated_at)];
    const afterSignatureTimes = [Date.parse(after?.authority_service_signature?.signed_at)];
    if (changedMap) afterSignatureTimes.push(Date.parse(afterMap?.issuing_authority_signature?.signed_at));
    if (chronologyLeafAfter !== null) {
      afterEffectiveTimes.push(Date.parse(chronologyLeafAfter.updated_at));
      afterSignatureTimes.push(Date.parse(chronologyLeafAfter.authority_service_signature?.signed_at));
    }
    if (![committedAt, signedAt, ...authorizationTimes, ...namespaceTimes, ...beforeTimes,
      ...afterEffectiveTimes, ...afterSignatureTimes].every(Number.isFinite) ||
        [...authorizationTimes, ...namespaceTimes, ...beforeTimes].some((instant) => instant > committedAt) ||
        afterEffectiveTimes.some((instant) => instant !== committedAt) ||
        afterSignatureTimes.some((instant) => instant < committedAt || instant > signedAt) ||
        signedAt < committedAt) {
      failures.push("execution_control_receipt_chronology_invalid");
    }
    return unique(failures);
  } catch {
    return ["execution_control_receipt_malformed"];
  }
}

export function connectionOutstandingMapKey(outstandingActionIndexKey) {
  return canonicalHash({
    schema: "cairn.enumerable_map_key_preimage.v0.1",
    owner_stable_key: outstandingActionIndexKey,
    map_domain: "connection_outstanding_action"
  });
}

export function executionControlMapKey(principalId, authorityNamespace, generation) {
  return canonicalHash({
    schema: "cairn.enumerable_map_key_preimage.v0.1",
    owner_stable_key: canonicalHash({
      schema: "cairn.execution_control_map_owner_preimage.v0.1",
      principal_id: principalId,
      authority_namespace: authorityNamespace,
      control_namespace_generation: generation
    }),
    map_domain: "scoped_execution_control"
  });
}

export function connectionOutstandingActionKey(value) {
  return canonicalHash({
    schema: "cairn.connection_outstanding_action_key_preimage.v0.1",
    connection_state_id: value.connection_state_id,
    action_ref: value.action_ref,
    effect_id: value.effect_id,
    lineage_id: value.lineage_id
  });
}

export function validateConnectionAuthorization(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    const runtime = context.runtimeBinding ?? resolveObject(context.objectResolver, value.agent_runtime_binding_ref);
    if (!runtime || runtime.schema !== "cairn.agent_runtime_binding.v0.1") {
      failures.push("connection_authorization_runtime_unresolved");
    } else {
      failures.push(...resolvedObjectShapeFailures(runtime, context, "connection_authorization_runtime"));
      if (context.requireDependencySignatures === true && validateResolvedSignedObject(runtime, context).length) {
        failures.push("connection_authorization_runtime_signature_invalid");
      }
      const runtimeSchema = context.baseSchemasByObjectId?.get(runtime.schema);
      if (!runtimeSchema || !sameObjectRef(value.agent_runtime_binding_ref, objectRefFor(runtime, runtimeSchema))) {
        failures.push("connection_authorization_runtime_ref_mismatch");
      }
      const startsAt = Date.parse(value.not_before);
      const expiresAt = Date.parse(value.expires_at);
      const runtimeStartsAt = Date.parse(runtime.not_before);
      const runtimeExpiresAt = Date.parse(runtime.expires_at);
      if (![startsAt, expiresAt, runtimeStartsAt, runtimeExpiresAt].every(Number.isFinite) ||
          startsAt >= expiresAt || runtimeStartsAt > startsAt || runtimeExpiresAt < expiresAt) {
        failures.push("connection_authorization_runtime_interval_mismatch");
      }
    }
    const eligibilityTime = context.connectionEligibilityTime === undefined
      ? null : Date.parse(context.connectionEligibilityTime);
    if (eligibilityTime !== null && (!Number.isFinite(eligibilityTime) ||
        eligibilityTime < Date.parse(value.not_before) || eligibilityTime >= Date.parse(value.expires_at))) {
      failures.push("connection_authorization_not_currently_eligible");
    }
    return unique(failures);
  } catch {
    return ["connection_authorization_malformed"];
  }
}

export function validateConnectionStateHead(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    const authorization = context.connectionAuthorization ??
      resolveObject(context.objectResolver, value.connection_authorization_ref);
    if (!authorization || authorization.schema !== "cairn.agent_connection_authorization.v0.1" ||
        !exactRef(value.connection_authorization_ref, authorization, context) ||
        (context.requireDependencySignatures === true && validateResolvedSignedObject(authorization, context).length) ||
        validateConnectionAuthorization(authorization, context).length ||
        value.connection_authorization_hash !== authorization.authorization_hash ||
        value.principal_id !== authorization.principal_id ||
        !sameObjectRef(value.agent_runtime_binding_ref, authorization.agent_runtime_binding_ref)) {
      failures.push("connection_state_authorization_binding_mismatch");
    }
    if ((value.sequence === 0) !== (value.previous_state_hash === null) ||
        Date.parse(value.accepted_at) > Date.parse(value.updated_at)) {
      failures.push("connection_state_sequence_time_mismatch");
    }
    if (context.requireCurrentConnection === true &&
        !sameObjectRef(resolveCurrentHead(context, objectRef(value, context)), objectRef(value, context))) {
      failures.push("connection_state_not_current");
    }
    return unique(failures);
  } catch {
    return ["connection_state_head_malformed"];
  }
}

const DATA_GRANT_STATE_EDGES = new Map([
  ["active", new Set(["active", "paused", "exhausted", "revoked", "expired"])],
  ["paused", new Set(["active", "revoked", "expired"])],
  ["exhausted", new Set(["revoked", "expired"])],
  ["revoked", new Set()],
  ["expired", new Set()]
]);

export function validateDataGrantStateHead(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    const grant = resolveObject(context.objectResolver, value.data_grant_ref);
    const grantSchema = schemaForResolvedObject(grant, context);
    if (!grant || grant.schema !== "cairn.data_grant.v0.1" || !grantSchema ||
        !sameObjectRef(value.data_grant_ref, objectRefFor(grant, grantSchema)) ||
        resolvedObjectShapeFailures(grant, context, "data_grant_state_grant").length ||
        (context.requireDependencySignatures === true && validateResolvedSignedObject(grant, context).length) ||
        grant.principal_id !== value.principal_id || value.expires_at !== grant.expires_at ||
        value.revocation_nonce < grant.revocation_nonce) {
      failures.push("data_grant_state_grant_mismatch");
    }
    if (value.sequence === 0) {
      if (value.previous_state_hash !== null || value.state !== "active" ||
          value.revocation_nonce !== grant?.revocation_nonce ||
          value.remaining_reads !== grant?.maximum_disclosures || value.remaining_reads < 1) {
        failures.push("data_grant_state_genesis_mismatch");
      }
    } else {
      const predecessorRef = {
        schema: value.schema, object_id: value.data_grant_state_id, object_hash: value.previous_state_hash
      };
      const predecessor = typeof context.statePredecessorResolver === "function"
        ? context.statePredecessorResolver(predecessorRef) : resolveObject(context.objectResolver, predecessorRef);
      if (!predecessor || !exactRef(predecessorRef, predecessor, context) ||
          (context.requireDependencySignatures === true && validateResolvedSignedObject(predecessor, context).length) ||
          predecessor.data_grant_state_id !== value.data_grant_state_id ||
          predecessor.principal_id !== value.principal_id ||
          !sameObjectRef(predecessor.data_grant_ref, value.data_grant_ref) ||
          value.sequence !== predecessor.sequence + 1 || value.revocation_nonce < predecessor.revocation_nonce ||
          value.remaining_reads > predecessor.remaining_reads ||
          !DATA_GRANT_STATE_EDGES.get(predecessor.state)?.has(value.state) ||
          value.maximum_response_bytes !== predecessor.maximum_response_bytes ||
          value.maximum_response_items !== predecessor.maximum_response_items ||
          canonicalHash(value.query_bound) !== canonicalHash(predecessor.query_bound) ||
          value.expires_at !== predecessor.expires_at ||
          Date.parse(value.updated_at) < Date.parse(predecessor.updated_at)) {
        failures.push("data_grant_state_predecessor_mismatch");
      }
      const isReadDecrement = predecessor?.state === "active" && value.state === "active";
      const isFinalRead = predecessor?.state === "active" && value.state === "exhausted";
      const isControlTransition = predecessor && value.state !== predecessor.state && !isFinalRead;
      if ((isReadDecrement && (value.remaining_reads !== predecessor.remaining_reads - 1 ||
          value.revocation_nonce !== predecessor.revocation_nonce)) ||
          (isFinalRead && (predecessor.remaining_reads !== 1 || value.remaining_reads !== 0 ||
            value.revocation_nonce !== predecessor.revocation_nonce)) ||
          (isControlTransition && (value.remaining_reads !== predecessor.remaining_reads ||
            value.revocation_nonce !== predecessor.revocation_nonce + 1))) {
        failures.push("data_grant_state_transition_mismatch");
      }
    }
    const updatedAt = Date.parse(value.updated_at);
    const expiresAt = Date.parse(value.expires_at);
    if (value.state === "expired" ? updatedAt < expiresAt : updatedAt >= expiresAt) {
      failures.push("data_grant_state_interval_mismatch");
    }
    return unique(failures);
  } catch {
    return ["data_grant_state_head_malformed"];
  }
}

export function enumerableMapEmptyEntriesRoot(mapDomain) {
  return canonicalHash({
    schema: "cairn.enumerable_map_empty_entries_preimage.v0.1",
    map_domain: mapDomain
  });
}

export function enumerableMapLeafEntriesRoot(mapDomain, leafEntry) {
  return canonicalHash({
    schema: "cairn.enumerable_map_leaf_entries_preimage.v0.1",
    map_domain: mapDomain,
    entry_key: leafEntry.entry_key,
    entry_kind: leafEntry.entry_kind,
    entry_object_ref: leafEntry.entry_object_ref,
    entry_object_hash: leafEntry.entry_object_hash
  });
}

export function enumerableMapBranchEntriesRoot(mapDomain, pathPrefixNibbles, subtreeEntryCount, children) {
  return canonicalHash({
    schema: "cairn.enumerable_map_branch_entries_preimage.v0.1",
    map_domain: mapDomain,
    path_prefix_nibbles: pathPrefixNibbles,
    subtree_entry_count: subtreeEntryCount,
    branch_children: children.map((child) => ({
      nibble: child.nibble,
      child_path_prefix_nibbles: child.child_path_prefix_nibbles,
      child_node_hash: child.child_node_hash,
      child_subtree_entry_count: child.child_subtree_entry_count,
      child_entries_root: child.child_entries_root
    }))
  });
}

function longestCommonNibblePrefix(values) {
  if (!values.length) return "";
  let length = 0;
  while (length < values[0].length && values.every((value) => value[length] === values[0][length])) length += 1;
  return values[0].slice(0, length);
}

function inspectEnumerableMapNode(node, context, mapDomain) {
  const failures = validatePhase1Object(node, context).map((code) => `map_node_${code}`);
  if (failures.length) return failures;
  if (node.map_domain !== mapDomain) failures.push("map_node_domain_mismatch");
  if (node.node_kind === "empty") {
    if (node.path_prefix_nibbles !== "" || node.leaf_entry !== null || node.branch_children.length !== 0 ||
        node.subtree_entry_count !== 0 || node.entries_root !== enumerableMapEmptyEntriesRoot(mapDomain)) {
      failures.push("map_node_empty_union_mismatch");
    }
  } else if (node.node_kind === "leaf") {
    const leaf = node.leaf_entry;
    const keyHex = leaf?.entry_key?.startsWith("sha-256:") ? leaf.entry_key.slice(8) : "";
    const domainProfile = new Map([
      ["connection_outstanding_action", {
        entryKind: "connection_outstanding_action",
        schema: "cairn.connection_outstanding_action_entry.v0.1",
        keyField: "outstanding_action_key",
        validate: validateConnectionOutstandingActionEntry
      }],
      ["receiver_outstanding_stream", {
        entryKind: "receiver_outstanding_stream",
        schema: "cairn.receiver_outstanding_stream_entry.v0.1",
        keyField: "outstanding_stream_key",
        validate: validateReceiverOutstandingStreamEntry
      }],
      ["compartment_active_reservation", {
        entryKind: "compartment_active_reservation",
        schema: "cairn.current_reservation_index_entry.v0.1",
        keyField: "reservation_index_key",
        hashField: "entry_hash",
        external: true
      }],
      ["compartment_economic_atom", {
        entryKind: "compartment_economic_atom",
        schema: "cairn.current_economic_atom.v0.1",
        keyField: "atom_id",
        hashField: "atom_hash",
        external: true
      }],
      ["compartment_confirmed_event", {
        entryKind: "compartment_confirmed_event",
        schema: "cairn.confirmed_economic_event_entry.v0.1",
        keyField: "confirmed_event_key",
        hashField: "event_hash",
        external: true
      }],
      ["scoped_execution_control", {
        entryKind: "scoped_execution_control",
        schema: "cairn.scoped_execution_control_leaf_state_head.v0.1",
        keyField: "scoped_control_leaf_key",
        validate: validateScopedControlLeaf
      }]
    ]).get(mapDomain);
    if (domainProfile?.external === true && [
      "compartment_active_reservation", "compartment_economic_atom", "compartment_confirmed_event"
    ].includes(mapDomain)) {
      failures.push("phase1_external_accounting_leaf_unsupported");
    }
    const entryObject = resolveObject(context.objectResolver, leaf?.entry_object_ref);
    const exactEntry = domainProfile?.external === true
      ? exactExternalObject(
        leaf?.entry_object_ref, entryObject, domainProfile.schema, context,
        domainProfile.hashField, [domainProfile.keyField]
      )
      : exactRef(leaf?.entry_object_ref, entryObject, context);
    const validEntry = domainProfile?.external === true
      ? exactEntry
      : domainProfile?.validate(entryObject, context).length === 0;
    if (!isObject(leaf) || node.branch_children.length !== 0 || node.subtree_entry_count !== 1 ||
        node.path_prefix_nibbles !== keyHex || leaf.entry_object_hash !== leaf.entry_object_ref?.object_hash ||
        !domainProfile || leaf.entry_kind !== domainProfile.entryKind ||
        leaf.entry_object_ref?.schema !== domainProfile.schema ||
        !entryObject || entryObject.schema !== domainProfile.schema || !exactEntry ||
        entryObject[domainProfile.keyField] !== leaf.entry_key ||
        !validEntry ||
        node.entries_root !== enumerableMapLeafEntriesRoot(mapDomain, leaf)) {
      failures.push("map_node_leaf_union_mismatch");
    }
  } else if (node.node_kind === "branch") {
    const nibbles = node.branch_children.map(({ nibble }) => nibble);
    const childPrefixes = node.branch_children.map(({ child_path_prefix_nibbles }) => child_path_prefix_nibbles);
    const childCount = node.branch_children.reduce((sum, child) => sum + child.child_subtree_entry_count, 0);
    if (node.leaf_entry !== null || node.branch_children.length < 2 ||
        canonicalHash(nibbles) !== canonicalHash([...nibbles].sort()) ||
        new Set(nibbles).size !== nibbles.length || node.path_prefix_nibbles.length >= 64 ||
        !Number.isSafeInteger(childCount) || node.subtree_entry_count !== childCount ||
        longestCommonNibblePrefix(childPrefixes) !== node.path_prefix_nibbles ||
        node.branch_children.some(({ child_node_ref, child_node_hash }) =>
          child_node_ref?.schema !== "cairn.enumerable_map_node.v0.1" ||
          child_node_ref?.object_id !== child_node_hash || child_node_hash !== child_node_ref?.object_hash) ||
        node.branch_children.some(({ nibble, child_path_prefix_nibbles, child_subtree_entry_count }) =>
          child_subtree_entry_count < 1 || child_path_prefix_nibbles.length <= node.path_prefix_nibbles.length ||
          !child_path_prefix_nibbles.startsWith(`${node.path_prefix_nibbles}${nibble}`)) ||
        node.entries_root !== enumerableMapBranchEntriesRoot(
          mapDomain, node.path_prefix_nibbles, node.subtree_entry_count, node.branch_children
        )) {
      failures.push("map_node_branch_union_mismatch");
    }
  } else failures.push("map_node_kind_invalid");
  return unique(failures);
}

function resolveEnumerableMapEntries(mapRoot, mapDomain, context = {}) {
  const failures = [];
  const entries = [];
  const seenNodes = new Set();
  const seenKeys = new Set();
  const visit = (reference, expected = null) => {
    const node = resolveObject(context.objectResolver, reference);
    const nodeKey = canonicalText(reference);
    if (seenNodes.has(nodeKey)) {
      failures.push("enumerable_map_cycle_detected");
      return;
    }
    seenNodes.add(nodeKey);
    if (!node || node.schema !== "cairn.enumerable_map_node.v0.1" ||
        !exactRef(reference, node, context) || inspectEnumerableMapNode(node, context, mapDomain).length) {
      failures.push("enumerable_map_descendant_invalid");
      return;
    }
    if (expected && (node.path_prefix_nibbles !== expected.child_path_prefix_nibbles ||
        node.subtree_entry_count !== expected.child_subtree_entry_count ||
        node.entries_root !== expected.child_entries_root || node.node_hash !== expected.child_node_hash)) {
      failures.push("enumerable_map_child_commitment_mismatch");
    }
    if (node.node_kind === "leaf") {
      if (seenKeys.has(node.leaf_entry.entry_key)) failures.push("enumerable_map_duplicate_entry_key");
      seenKeys.add(node.leaf_entry.entry_key);
      entries.push({
        leaf: node.leaf_entry,
        object: resolveObject(context.objectResolver, node.leaf_entry.entry_object_ref)
      });
    } else if (node.node_kind === "branch") {
      for (const child of node.branch_children) visit(child.child_node_ref, child);
    }
  };
  visit(mapRoot.root_node_ref);
  if (entries.length !== mapRoot.entry_count) failures.push("enumerable_map_resolved_count_mismatch");
  return { entries, failures: unique(failures) };
}

function compartmentSubsetRoot(subsetKind, entries) {
  return canonicalHash({
    schema: "cairn.compartment_accounting_subset_root_preimage.v0.1",
    subset_kind: subsetKind,
    entry_refs: entries.map(({ leaf }) => leaf.entry_object_ref)
      .sort((left, right) => canonicalText(left).localeCompare(canonicalText(right)))
  });
}

export function compartmentEconomicAtomSubsetRoot(ledgerClass, entries) {
  return compartmentSubsetRoot(`economic_atom:${ledgerClass}`,
    entries.filter(({ object }) => object?.ledger_class === ledgerClass));
}

export function compartmentConfirmedEventSubsetRoot(eventKind, entries) {
  return compartmentSubsetRoot(`confirmed_event:${eventKind}`,
    entries.filter(({ object }) => object?.event_kind === eventKind));
}

export function compartmentConfirmedEventComponentRoot(componentIds) {
  return canonicalHash({
    schema: "cairn.confirmed_economic_event_component_set_preimage.v0.1",
    component_ids: [...new Set(componentIds)].sort()
  });
}

export function currentReservationHeldAtomsRoot(reservation, entries) {
  const heldAtoms = entries
    .filter(({ object }) => object?.ledger_class === "reserved" &&
      object?.obligation_or_reservation_id === reservation?.authority_reservation_ref?.object_id &&
      object?.reservation_fence === reservation?.reservation_fence)
    .map(({ leaf, object }) => ({ atom_id: object.atom_id, atom_hash: leaf.entry_object_hash }))
    .sort((left, right) => left.atom_id.localeCompare(right.atom_id) ||
      left.atom_hash.localeCompare(right.atom_hash));
  return canonicalHash({
    schema: "cairn.current_reservation_held_atoms_root_preimage.v0.1",
    reservation_index_key: reservation?.reservation_index_key ?? null,
    held_atoms: heldAtoms
  });
}

function checkedAmountSum(entries) {
  let total = 0;
  for (const entry of entries) {
    const value = entry.object?.amount?.amount_minor;
    if (!Number.isSafeInteger(value) || value < 0 || !Number.isSafeInteger(total + value)) return null;
    total += value;
  }
  return total;
}

export function validateEnumerableMapNode(node, context = {}) {
  try {
    return inspectEnumerableMapNode(node, context, context.expectedMapDomain ?? node?.map_domain);
  } catch {
    return ["enumerable_map_node_malformed"];
  }
}

export function validateConnectionOutstandingActionEntry(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    if (context.expectedConnectionStateId !== undefined &&
        value.connection_state_id !== context.expectedConnectionStateId) {
      failures.push("outstanding_action_entry_connection_mismatch");
    }
    const receiverBound = value.receiver_event_stream_key !== null;
    if (value.outstanding_action_key !== connectionOutstandingActionKey(value)) {
      failures.push("outstanding_action_entry_key_mismatch");
    }
    if (value.finality_transition_profile_ref === null || value.finality_transition_profile_hash === null ||
        (value.state !== "reserved" && !receiverBound) ||
        (value.sequence === 0) !== (value.previous_entry_hash === null)) {
      failures.push("outstanding_action_entry_state_union_mismatch");
    }
    const action = resolveObject(context.objectResolver, value.action_ref);
    const actionState = resolveObject(context.objectResolver, value.current_action_state_head_ref);
    if (!action || action.schema !== "cairn.action_record.v0.2" || !exactRef(value.action_ref, action, context) ||
        action.effect_id !== value.effect_id || !actionState || actionState.schema !== "cairn.action_state_head.v0.1" ||
        !exactRef(value.current_action_state_head_ref, actionState, context) ||
        validatePhase1Object(actionState, context).length ||
        actionState.action_id !== action.action_id || !sameObjectRef(actionState.action_ref, value.action_ref)) {
      failures.push("outstanding_action_entry_action_chain_mismatch");
    } else {
      const allowedActionStates = new Map([
        ["reserved", new Set(["reserved", "cancelled", "definitive_failure", "quarantined"])],
        ["handed_off", new Set(["submitted"])],
        ["receiver_state_current", new Set(["acknowledged", "unknown", "cancelled", "definitive_failure", "finalized", "quarantined"])]
      ]);
      if (!allowedActionStates.get(value.state)?.has(actionState.state)) {
        failures.push("outstanding_action_entry_action_state_mismatch");
      }
      const lineage = resolveObject(context.objectResolver, action.lineage_commitment_ref);
      if (!lineage || lineage.schema !== "cairn.lineage_commitment.v0.1" ||
          !exactRef(action.lineage_commitment_ref, lineage, context) ||
          lineage.principal_authorized_lineage_id !== value.lineage_id) {
        failures.push("outstanding_action_entry_lineage_mismatch");
      }
    }
    return unique(failures);
  } catch {
    return ["connection_outstanding_action_entry_malformed"];
  }
}

function exactOpaqueObject(reference, object, expectedSchema, hashField = "receipt_hash", idField = null) {
  return Boolean(reference && object && reference.schema === expectedSchema && object.schema === expectedSchema &&
    reference.object_hash === object[hashField] && (idField === null || reference.object_id === object[idField]));
}

function exactExternalObject(reference, object, expectedSchema, context, hashField = "object_hash", idFields = []) {
  if (!reference || !object || reference.schema !== expectedSchema || object.schema !== expectedSchema ||
      reference.object_hash !== object[hashField]) return false;
  const identityValues = idFields.map((field) => object[field]).filter((value) => typeof value === "string");
  if (identityValues.length === 0 || !identityValues.includes(reference.object_id)) return false;
  return typeof context.externalObjectVerifier === "function" &&
    context.externalObjectVerifier({ reference, object, expectedSchema }) === true;
}

export function receiverOutstandingStreamKey(value) {
  return canonicalHash({
    schema: "cairn.receiver_outstanding_stream_key_preimage.v0.1",
    receiver_sequence_epoch_selector_key: value.receiver_sequence_epoch_selector_key,
    action_ref: value.action_ref,
    effect_id: value.effect_id,
    lineage_id: value.lineage_id,
    precommitted_client_reference: value.precommitted_client_reference
  });
}

export function receiverOutstandingMapKey(selectorKey) {
  return canonicalHash({
    schema: "cairn.receiver_outstanding_stream_map_key_preimage.v0.1",
    receiver_sequence_epoch_selector_key: selectorKey,
    map_domain: "receiver_outstanding_stream"
  });
}

export function validateReceiverOutstandingStreamEntry(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    const nullablePairs = [
      ["future_dependency_pool_state_head_ref", "future_dependency_pool_state_head_hash"],
      ["future_dependency_assignment_ref", "future_dependency_assignment_hash"],
      ["connection_outstanding_action_entry_ref", "connection_outstanding_action_entry_hash"],
      ["current_receiver_stream_head_ref", "current_receiver_stream_head_hash"]
    ];
    failures.push(...refHashPairFailures(value, nullablePairs, "receiver_outstanding_entry_ref_hash_mismatch"));
    if ((value.sequence === 0) !== (value.previous_entry_hash === null)) {
      failures.push("receiver_outstanding_entry_sequence_mismatch");
    }
    if (value.outstanding_stream_key !== receiverOutstandingStreamKey(value)) {
      failures.push("receiver_outstanding_entry_key_mismatch");
    }
    const terminal = ["authenticated_stream_closed", "authenticated_irreversible_horizon", "fenced_non_submission"]
      .includes(value.state);
    const streamRequired = value.state !== "reserved" && value.state !== "fenced_non_submission";
    if (streamRequired !== (value.current_receiver_stream_head_ref !== null) ||
        (terminal && value.sequence === 0)) {
      failures.push("receiver_outstanding_entry_state_union_mismatch");
    }
    const connectionFields = [value.connection_outstanding_action_key,
      value.connection_outstanding_action_entry_ref, value.connection_outstanding_action_entry_hash];
    const connectionBound = connectionFields.every((item) => item !== null);
    if (!(connectionBound || connectionFields.every((item) => item === null))) {
      failures.push("receiver_outstanding_entry_connection_union_mismatch");
    }
    const connectionEntry = connectionBound
      ? resolveObject(context.objectResolver, value.connection_outstanding_action_entry_ref) : null;
    if (connectionBound && (!connectionEntry ||
        connectionEntry.schema !== "cairn.connection_outstanding_action_entry.v0.1" ||
        !exactRef(value.connection_outstanding_action_entry_ref, connectionEntry, context) ||
        validateConnectionOutstandingActionEntry(connectionEntry, context).length ||
        value.connection_outstanding_action_key !== connectionEntry.outstanding_action_key ||
        !sameObjectRef(value.action_ref, connectionEntry.action_ref) || value.effect_id !== connectionEntry.effect_id ||
        value.lineage_id !== connectionEntry.lineage_id ||
        !sameObjectRef(value.finality_transition_profile_ref, connectionEntry.finality_transition_profile_ref) ||
        value.finality_transition_profile_hash !== connectionEntry.finality_transition_profile_hash)) {
      failures.push("receiver_outstanding_entry_connection_binding_mismatch");
    }
    if (connectionBound) {
      const permittedConnectionStates = new Map([
        ["reserved", new Set(["reserved"])],
        ["handed_off", new Set(["handed_off", "receiver_state_current"])],
        ["authenticated_stream_closed", new Set(["receiver_state_current"])],
        ["authenticated_irreversible_horizon", new Set(["receiver_state_current"])],
        ["fenced_non_submission", new Set(["reserved"])]
      ]);
      if (!permittedConnectionStates.get(value.state)?.has(connectionEntry?.state)) {
        failures.push("receiver_outstanding_entry_connection_state_mismatch");
      }
    }
    const eventAssignment = resolveObject(context.objectResolver, value.event_id_slot_assignment_ref);
    const sequenceAssignment = resolveObject(context.objectResolver, value.sequence_slot_assignment_ref);
    const expectedAssignmentState = new Map([
      ["authenticated_stream_closed", "released_on_authenticated_closure"],
      ["authenticated_irreversible_horizon", "released_on_authenticated_horizon"],
      ["fenced_non_submission", "released_on_fenced_non_submission"]
    ]).get(value.state) ?? "reserved";
    if (!exactExternalObject(value.event_id_slot_assignment_ref, eventAssignment,
      "cairn.bounded_index_slot_assignment.v0.1", context, "assignment_hash", ["slot_assignment_id"]) ||
        !exactExternalObject(value.sequence_slot_assignment_ref, sequenceAssignment,
          "cairn.bounded_index_slot_assignment.v0.1", context, "assignment_hash", ["slot_assignment_id"]) ||
        eventAssignment.epoch !== value.assigned_identity_epoch ||
        sequenceAssignment.epoch !== value.assigned_identity_epoch ||
        eventAssignment.slot_kind !== "receiver_event_id" || sequenceAssignment.slot_kind !== "receiver_sequence" ||
        eventAssignment.state !== expectedAssignmentState || sequenceAssignment.state !== expectedAssignmentState ||
        !sameObjectRef(eventAssignment.action_ref, value.action_ref) ||
        !sameObjectRef(sequenceAssignment.action_ref, value.action_ref) ||
        eventAssignment.effect_id !== value.effect_id || sequenceAssignment.effect_id !== value.effect_id ||
        eventAssignment.lineage_id !== value.lineage_id || sequenceAssignment.lineage_id !== value.lineage_id ||
        eventAssignment.stream_closure_or_horizon_rule_hash !== value.authenticated_closure_or_horizon_rule_hash ||
        sequenceAssignment.stream_closure_or_horizon_rule_hash !== value.authenticated_closure_or_horizon_rule_hash) {
      failures.push("receiver_outstanding_entry_slot_assignment_mismatch");
    }
    const trustManifest = resolveObject(context.objectResolver, value.trust_epoch_assignment_manifest_ref);
    if (!trustManifest || trustManifest.schema !== "cairn.enumerable_transition_manifest.v0.1" ||
        !exactRef(value.trust_epoch_assignment_manifest_ref, trustManifest, context) ||
        validateTransitionManifest(trustManifest, context).length ||
        trustManifest.manifest_kind !== "receiver_trust_slot_assignments" ||
        trustManifest.entry_count !== value.trust_epoch_assignment_count ||
        trustManifest.entries_root !== value.trust_epoch_assignments_root) {
      failures.push("receiver_outstanding_entry_trust_manifest_mismatch");
    }
    if (value.current_receiver_stream_head_ref !== null) {
      const stream = resolveObject(context.objectResolver, value.current_receiver_stream_head_ref);
      if (!exactExternalObject(value.current_receiver_stream_head_ref, stream,
        "cairn.receiver_event_stream_state_head.v0.1", context, "head_hash", ["receiver_event_stream_key"]) ||
          stream.receiver_event_stream_key !== value.current_receiver_stream_head_ref.object_id ||
          !sameObjectRef(stream.action_ref, value.action_ref) || stream.effect_id !== value.effect_id ||
          stream.precommitted_client_reference !== value.precommitted_client_reference ||
          !sameObjectRef(stream.finality_transition_profile_ref, value.finality_transition_profile_ref) ||
          stream.finality_transition_profile_hash !== value.finality_transition_profile_hash) {
        failures.push("receiver_outstanding_entry_stream_binding_mismatch");
      }
      if (connectionBound && connectionEntry?.receiver_event_stream_key !== stream.receiver_event_stream_key) {
        failures.push("receiver_outstanding_entry_connection_stream_mismatch");
      }
    }
    return unique(failures);
  } catch {
    return ["receiver_outstanding_stream_entry_malformed"];
  }
}

function validateTerminalSourceEvidence(reference, entry, cause, context) {
  const source = resolveObject(context.objectResolver, reference);
  const profile = new Map([
    ["fenced_non_submission", {
      schema: "cairn.fenced_non_submission_receipt.v0.1", hash: "receipt_hash",
      ids: ["receipt_id", "receipt_hash"], required: ["action_ref", "effect_id", "lineage_id"]
    }],
    ["authenticated_stream_closed", {
      schema: "cairn.receiver_event_stream_transition_receipt.v0.1", hash: "receipt_hash",
      ids: ["receiver_event_stream_key", "receipt_hash"], required: ["receiver_event_stream_key"]
    }],
    ["authenticated_irreversible_horizon", {
      schema: "cairn.authenticated_irreversible_horizon_receipt.v0.1", hash: "receipt_hash",
      ids: ["receipt_hash"], required: ["action_ref", "effect_id", "lineage_id",
        "receiver_finality_profile_ref", "receiver_finality_profile_hash"]
    }]
  ]).get(cause);
  if (!profile || !profile.required.every((field) => source?.[field] !== undefined) ||
      !exactExternalObject(reference, source, profile.schema, context, profile.hash, profile.ids)) {
    return ["receiver_outstanding_terminal_evidence_mismatch"];
  }
  const failures = [];
  if (source.action_ref !== undefined && !sameObjectRef(source.action_ref, entry.action_ref)) {
    failures.push("receiver_outstanding_terminal_evidence_action_mismatch");
  }
  if (source.effect_id !== undefined && source.effect_id !== entry.effect_id) {
    failures.push("receiver_outstanding_terminal_evidence_effect_mismatch");
  }
  if (source.lineage_id !== undefined && source.lineage_id !== entry.lineage_id) {
    failures.push("receiver_outstanding_terminal_evidence_lineage_mismatch");
  }
  if (source.receiver_finality_profile_ref !== undefined &&
      !sameObjectRef(source.receiver_finality_profile_ref, entry.finality_transition_profile_ref)) {
    failures.push("receiver_outstanding_terminal_evidence_finality_mismatch");
  }
  if (source.receiver_finality_profile_hash !== undefined &&
      source.receiver_finality_profile_hash !== entry.finality_transition_profile_hash) {
    failures.push("receiver_outstanding_terminal_evidence_finality_mismatch");
  }
  if (cause === "authenticated_stream_closed") {
    const stream = resolveObject(context.objectResolver, entry.current_receiver_stream_head_ref);
    if (!stream || source.receiver_event_stream_key !== stream.receiver_event_stream_key) {
      failures.push("receiver_outstanding_terminal_evidence_stream_mismatch");
    }
  }
  return failures;
}

export function receiverTerminalReleasePlanKey(plan, entry) {
  return canonicalHash({
    schema: "cairn.receiver_terminal_release_plan_key_preimage.v0.1",
    receiver_sequence_epoch_selector_key: entry.receiver_sequence_epoch_selector_key,
    outstanding_stream_key: entry.outstanding_stream_key,
    terminal_release_evidence_ref: plan.terminal_release_evidence_ref,
    release_cause: plan.release_cause
  });
}

export function receiverTerminalTransitionKindSetRoot(plan, entry) {
  const kinds = ["event_id_slot", "sequence_slot", "trust_epoch"];
  if (entry.future_dependency_assignment_ref !== null) kinds.push("future_dependency");
  if (plan.release_cause !== "fenced_non_submission") kinds.push("receiver_stream");
  if (entry.connection_outstanding_action_entry_ref !== null) kinds.push("connection_outstanding_action");
  return canonicalHash({
    schema: "cairn.receiver_terminal_transition_kind_set_preimage.v0.1",
    transition_kinds: kinds.sort()
  });
}

export function receiverTerminalCompletionKey(plan) {
  return canonicalHash({
    schema: "cairn.receiver_terminal_release_completion_key_preimage.v0.1",
    terminal_release_plan_key: plan.terminal_release_plan_key
  });
}

const RECEIVER_IDENTITY_TRANSITION_CAUSES = new Map([
  ["reservation_registered", { receiptCause: "reserved_entry_added", assignmentState: "reserved", before: false,
    membership: true, consumption: "reserve" }],
  ["authenticated_event_observed", { receiptCause: "reserved_entry_consumed",
    before: true, consumption: "consume_one" }],
  ["authenticated_stream_closed", { receiptCause: "authenticated_stream_closure_release",
    assignmentState: "released_on_authenticated_closure", before: true, membership: false,
    consumption: "consume_one_and_release" }],
  ["authenticated_irreversible_horizon", { receiptCause: "authenticated_irreversible_horizon_release",
    assignmentState: "released_on_authenticated_horizon", before: true, membership: false,
    consumption: "release" }],
  ["fenced_non_submission", { receiptCause: "fenced_non_submission_release",
    assignmentState: "released_on_fenced_non_submission", before: true, membership: false,
    consumption: "release" }]
]);

function boundedAssignmentTransitionFailures(transition, expectedAssignmentRefs, receiverCause,
  authorityTransactionId, evidenceRef, context) {
  const profile = RECEIVER_IDENTITY_TRANSITION_CAUSES.get(receiverCause);
  const failures = [];
  if (!profile || transition.cause !== profile.receiptCause ||
      transition.authority_transaction_id !== authorityTransactionId ||
      !Array.isArray(transition.reservation_assignment_transitions) ||
      transition.reservation_assignment_transitions_root !==
        canonicalHash(transition.reservation_assignment_transitions) ||
      canonicalHash(transition.terminal_release_evidence_ref) !==
        canonicalHash(["authenticated_stream_closed", "authenticated_irreversible_horizon", "fenced_non_submission"]
          .includes(receiverCause) ? evidenceRef : null) ||
      transition.terminal_release_evidence_hash !==
        (["authenticated_stream_closed", "authenticated_irreversible_horizon", "fenced_non_submission"]
          .includes(receiverCause) ? evidenceRef?.object_hash ?? null : null)) {
    failures.push("bounded_assignment_transition_header_mismatch");
    return failures;
  }
  const matchedRefs = [];
  for (const item of transition.reservation_assignment_transitions) {
    const beforeRef = item.assignment_before_ref;
    const afterRef = item.assignment_after_ref;
    if ((beforeRef === null) !== !profile.before ||
        item.assignment_before_hash !== (beforeRef?.object_hash ?? null) ||
        item.assignment_after_hash !== afterRef?.object_hash) {
      failures.push("bounded_assignment_transition_shape_mismatch");
      continue;
    }
    const assignmentRef = profile.before ? beforeRef : afterRef;
    const assignmentBefore = profile.before ? resolveObject(context.objectResolver, beforeRef) : null;
    const assignmentAfter = resolveObject(context.objectResolver, afterRef);
    const beforeExact = !profile.before || exactExternalObject(beforeRef, assignmentBefore,
      "cairn.bounded_index_slot_assignment.v0.1", context, "assignment_hash", ["slot_assignment_id"]);
    const afterExact = exactExternalObject(afterRef, assignmentAfter,
      "cairn.bounded_index_slot_assignment.v0.1", context, "assignment_hash", ["slot_assignment_id"]);
    if (!beforeExact) {
      failures.push("bounded_assignment_transition_before_assignment_mismatch");
    }
    if (!afterExact) {
      failures.push("bounded_assignment_transition_after_assignment_mismatch");
    }
    if (beforeExact && afterExact && profile.before && ["slot_assignment_id", "directory_key", "epoch", "action_ref", "effect_id", "lineage_id",
      "slot_kind", "reserved_slots", "stream_closure_or_horizon_rule_hash"].some((field) =>
      canonicalHash(assignmentBefore?.[field]) !== canonicalHash(assignmentAfter?.[field]))) {
      failures.push("bounded_assignment_transition_assignment_mismatch");
    }
    if (afterExact && profile.consumption === "reserve" &&
        (assignmentAfter?.state !== "reserved" || assignmentAfter?.consumed_slots !== 0 ||
         item.after_map_membership !== true)) {
      failures.push("bounded_assignment_transition_consumption_mismatch");
    } else if (beforeExact && afterExact && profile.consumption === "consume_one") {
      const expectedConsumed = assignmentBefore?.consumed_slots + 1;
      if (!Number.isInteger(expectedConsumed) || expectedConsumed >= assignmentBefore?.reserved_slots ||
          assignmentAfter?.consumed_slots !== expectedConsumed ||
          assignmentAfter?.state !== "reserved" || item.after_map_membership !== true) {
        failures.push("bounded_assignment_transition_consumption_mismatch");
      }
    } else if (beforeExact && afterExact && profile.consumption === "consume_one_and_release") {
      const expectedConsumed = assignmentBefore?.consumed_slots + 1;
      if (!Number.isInteger(expectedConsumed) || expectedConsumed > assignmentBefore?.reserved_slots ||
          assignmentAfter?.consumed_slots !== expectedConsumed ||
          assignmentAfter?.state !== profile.assignmentState || item.after_map_membership !== false) {
        failures.push("bounded_assignment_transition_consumption_mismatch");
      }
    } else if (beforeExact && afterExact && profile.consumption === "release" &&
        (assignmentAfter?.state !== profile.assignmentState ||
         assignmentAfter?.consumed_slots !== assignmentBefore?.consumed_slots ||
         item.after_map_membership !== false)) {
      failures.push("bounded_assignment_transition_consumption_mismatch");
    }
    matchedRefs.push(assignmentRef);
  }
  if (canonicalHash(sortedUniqueRefs(matchedRefs)) !== canonicalHash(sortedUniqueRefs(expectedAssignmentRefs)) ||
      matchedRefs.length !== expectedAssignmentRefs.length) {
    failures.push("bounded_assignment_transition_set_mismatch");
  }
  return unique(failures);
}

function exactBoundedIdentityTransition(reference, expectedAssignmentRefs, receiverCause,
  authorityTransactionId, evidenceRef, context) {
  const transition = resolveObject(context.objectResolver, reference);
  if (!exactExternalObject(reference, transition, "cairn.bounded_index_epoch_transition_receipt.v0.1",
    context, "receipt_hash", ["receipt_hash"])) {
    return { transition, failures: ["bounded_identity_transition_unresolved"] };
  }
  return {
    transition,
    failures: boundedAssignmentTransitionFailures(transition, expectedAssignmentRefs, receiverCause,
      authorityTransactionId, evidenceRef, context)
  };
}

function receiverEventIdentityTransitionFailures(reference, beforeEntry, afterEntry, scopeBefore, scopeAfter,
  authorityTransactionId, context) {
  const receipt = resolveObject(context.objectResolver, reference);
  const failures = [];
  if (!exactExternalObject(reference, receipt, "cairn.receiver_event_identity_binding_receipt.v0.1",
    context, "receipt_hash", ["receipt_hash"])) {
    return ["receiver_event_identity_binding_receipt_unresolved"];
  }
  const pairs = [
    ["binding_core_ref", "binding_core_hash"],
    ["identity_scope_index_before_head_ref", "identity_scope_index_before_head_hash"],
    ["identity_scope_index_after_head_ref", "identity_scope_index_after_head_hash"],
    ["identity_epoch_directory_before_head_ref", "identity_epoch_directory_before_head_hash"],
    ["identity_epoch_directory_after_head_ref", "identity_epoch_directory_after_head_hash"],
    ["assigned_identity_epoch_before_head_ref", "assigned_identity_epoch_before_head_hash"],
    ["assigned_identity_epoch_after_head_ref", "assigned_identity_epoch_after_head_hash"],
    ["event_id_slot_assignment_before_ref", "event_id_slot_assignment_before_hash"],
    ["event_id_slot_assignment_after_ref", "event_id_slot_assignment_after_hash"],
    ["sequence_slot_assignment_before_ref", "sequence_slot_assignment_before_hash"],
    ["sequence_slot_assignment_after_ref", "sequence_slot_assignment_after_hash"],
    ["event_id_identity_head_ref", "event_id_identity_head_hash"],
    ["provider_sequence_identity_head_ref", "provider_sequence_identity_head_hash"]
  ];
  if (refHashPairFailures(receipt, pairs, "receiver_event_identity_ref_hash_mismatch").length ||
      receipt.authority_transaction_id !== authorityTransactionId ||
      !sameObjectRef(receipt.identity_scope_index_before_head_ref,
        { schema: scopeBefore?.schema, object_id: scopeBefore?.identity_scope_index_key,
          object_hash: scopeBefore?.head_hash }) ||
      !sameObjectRef(receipt.identity_scope_index_after_head_ref,
        { schema: scopeAfter?.schema, object_id: scopeAfter?.identity_scope_index_key,
          object_hash: scopeAfter?.head_hash }) ||
      !sameObjectRef(receipt.identity_epoch_directory_before_head_ref, scopeBefore?.index_epoch_directory_head_ref) ||
      receipt.identity_epoch_directory_before_head_hash !== scopeBefore?.index_epoch_directory_head_hash ||
      !sameObjectRef(receipt.identity_epoch_directory_after_head_ref, scopeAfter?.index_epoch_directory_head_ref) ||
      receipt.identity_epoch_directory_after_head_hash !== scopeAfter?.index_epoch_directory_head_hash ||
      !sameObjectRef(receipt.event_id_slot_assignment_before_ref, beforeEntry?.event_id_slot_assignment_ref) ||
      receipt.event_id_slot_assignment_before_hash !== beforeEntry?.event_id_slot_assignment_hash ||
      !sameObjectRef(receipt.event_id_slot_assignment_after_ref, afterEntry?.event_id_slot_assignment_ref) ||
      receipt.event_id_slot_assignment_after_hash !== afterEntry?.event_id_slot_assignment_hash ||
      !sameObjectRef(receipt.sequence_slot_assignment_before_ref, beforeEntry?.sequence_slot_assignment_ref) ||
      receipt.sequence_slot_assignment_before_hash !== beforeEntry?.sequence_slot_assignment_hash ||
      !sameObjectRef(receipt.sequence_slot_assignment_after_ref, afterEntry?.sequence_slot_assignment_ref) ||
      receipt.sequence_slot_assignment_after_hash !== afterEntry?.sequence_slot_assignment_hash) {
    failures.push("receiver_event_identity_binding_receipt_mismatch");
  }
  const assignedEpochBefore = resolveObject(context.objectResolver,
    receipt.assigned_identity_epoch_before_head_ref);
  const assignedEpochAfter = resolveObject(context.objectResolver,
    receipt.assigned_identity_epoch_after_head_ref);
  const assignedEpoch = beforeEntry?.assigned_identity_epoch;
  const directoryKey = beforeEntry?.identity_scope_index_key;
  const exactEpochHead = (epochRef, epochHead) => Boolean(
    epochRef && epochHead && epochRef.schema === "cairn.bounded_index_epoch_state_head.v0.1" &&
    epochHead.schema === epochRef.schema && epochRef.object_hash === epochHead.head_hash &&
    epochRef.object_id === `${epochHead.directory_key}:${epochHead.epoch}` &&
    typeof context.externalObjectVerifier === "function" &&
    context.externalObjectVerifier({
      reference: epochRef, object: epochHead,
      expectedSchema: "cairn.bounded_index_epoch_state_head.v0.1"
    }) === true
  );
  const exactBefore = exactEpochHead(receipt.assigned_identity_epoch_before_head_ref, assignedEpochBefore);
  const exactAfter = exactEpochHead(receipt.assigned_identity_epoch_after_head_ref, assignedEpochAfter);
  const assignedIsAccepting = assignedEpoch === scopeBefore?.accepting_index_epoch &&
    assignedEpoch === scopeAfter?.accepting_index_epoch;
  const epochBindingValid = exactBefore && exactAfter &&
    receipt.assigned_identity_epoch_before_head_hash === assignedEpochBefore.head_hash &&
    receipt.assigned_identity_epoch_after_head_hash === assignedEpochAfter.head_hash &&
    assignedEpochBefore.directory_key === directoryKey && assignedEpochAfter.directory_key === directoryKey &&
    assignedEpochBefore.epoch === assignedEpoch && assignedEpochAfter.epoch === assignedEpoch &&
    assignedEpochAfter.sequence === assignedEpochBefore.sequence + 1 &&
    assignedEpochAfter.previous_state_hash === assignedEpochBefore.head_hash &&
    assignedEpochAfter.state === assignedEpochBefore.state &&
    (assignedIsAccepting
      ? assignedEpochBefore.state === "accepting" &&
        sameObjectRef(receipt.assigned_identity_epoch_before_head_ref,
          scopeBefore.accepting_index_epoch_state_head_ref) &&
        sameObjectRef(receipt.assigned_identity_epoch_after_head_ref,
          scopeAfter.accepting_index_epoch_state_head_ref)
      : assignedEpoch < scopeBefore?.accepting_index_epoch &&
        scopeBefore?.accepting_index_epoch === scopeAfter?.accepting_index_epoch &&
        assignedEpochBefore.state === "draining" &&
        !sameObjectRef(receipt.assigned_identity_epoch_before_head_ref,
          scopeBefore?.accepting_index_epoch_state_head_ref) &&
        !sameObjectRef(receipt.assigned_identity_epoch_after_head_ref,
          scopeAfter?.accepting_index_epoch_state_head_ref) &&
        sameObjectRef(scopeBefore?.accepting_index_epoch_state_head_ref,
          scopeAfter?.accepting_index_epoch_state_head_ref));
  if (!epochBindingValid) failures.push("receiver_event_identity_assigned_epoch_mismatch");
  const transitions = [
    {
      assignment_before_ref: receipt.event_id_slot_assignment_before_ref,
      assignment_before_hash: receipt.event_id_slot_assignment_before_hash,
      assignment_after_ref: receipt.event_id_slot_assignment_after_ref,
      assignment_after_hash: receipt.event_id_slot_assignment_after_hash,
      after_map_membership: resolveObject(context.objectResolver,
        receipt.event_id_slot_assignment_after_ref)?.state === "reserved"
    },
    {
      assignment_before_ref: receipt.sequence_slot_assignment_before_ref,
      assignment_before_hash: receipt.sequence_slot_assignment_before_hash,
      assignment_after_ref: receipt.sequence_slot_assignment_after_ref,
      assignment_after_hash: receipt.sequence_slot_assignment_after_hash,
      after_map_membership: resolveObject(context.objectResolver,
        receipt.sequence_slot_assignment_after_ref)?.state === "reserved"
    }
  ];
  failures.push(...boundedAssignmentTransitionFailures({
    cause: "reserved_entry_consumed",
    authority_transaction_id: authorityTransactionId,
    reservation_assignment_transitions: transitions,
    reservation_assignment_transitions_root: canonicalHash(transitions),
    terminal_release_evidence_ref: null,
    terminal_release_evidence_hash: null
  }, [beforeEntry.event_id_slot_assignment_ref, beforeEntry.sequence_slot_assignment_ref],
  "authenticated_event_observed", authorityTransactionId, null, context));
  return unique(failures);
}

export function receiverTerminalPlanToReceiptKeysetEqualityHash(plan, completion) {
  return canonicalHash({
    schema: "cairn.receiver_terminal_plan_to_receipt_keyset_equality_preimage.v0.1",
    terminal_release_plan_key: plan.terminal_release_plan_key,
    identity_assignment_refs: sortedUniqueRefs(
      completion.identity_epoch_transition_receipts.map(({ assignment_ref }) => assignment_ref)
    ),
    trust_epoch_assignment_manifest_ref: plan.trust_epoch_assignment_manifest_ref,
    trust_epoch_transition_manifest_ref: completion.trust_epoch_transition_manifest_ref,
    future_dependency_assignment_ref: plan.future_dependency_assignment_ref,
    future_dependency_transition_receipt_ref: completion.future_dependency_transition_receipt_ref,
    receiver_stream_before_head_ref: plan.receiver_stream_before_head_ref,
    receiver_stream_transition_receipt_ref: completion.receiver_stream_transition_receipt_ref,
    unchanged_receiver_stream_head_ref: completion.unchanged_receiver_stream_head_ref,
    connection_outstanding_action_entry_ref: plan.connection_outstanding_action_entry_ref,
    connection_outstanding_action_transition_receipt_ref:
      completion.connection_outstanding_action_transition_receipt_ref
  });
}

export function validateReceiverTerminalReleasePlan(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    failures.push(...refHashPairFailures(value, [
      ["terminal_release_evidence_ref", "terminal_release_evidence_hash"],
      ["receiver_outstanding_stream_entry_ref", "receiver_outstanding_stream_entry_hash"],
      ["event_id_slot_assignment_ref", "event_id_slot_assignment_hash"],
      ["sequence_slot_assignment_ref", "sequence_slot_assignment_hash"],
      ["trust_epoch_assignment_manifest_ref", "trust_epoch_assignment_manifest_hash"],
      ["future_dependency_pool_state_head_ref", "future_dependency_pool_state_head_hash"],
      ["future_dependency_assignment_ref", "future_dependency_assignment_hash"],
      ["receiver_stream_before_head_ref", "receiver_stream_before_head_hash"],
      ["connection_outstanding_action_entry_ref", "connection_outstanding_action_entry_hash"]
    ], "receiver_terminal_plan_ref_hash_mismatch"));
    const entry = resolveObject(context.objectResolver, value.receiver_outstanding_stream_entry_ref);
    if (!entry || entry.schema !== "cairn.receiver_outstanding_stream_entry.v0.1" ||
        !exactRef(value.receiver_outstanding_stream_entry_ref, entry, context) ||
        validateReceiverOutstandingStreamEntry(entry, context).length ||
        value.terminal_release_plan_key !== receiverTerminalReleasePlanKey(value, entry)) {
      failures.push("receiver_terminal_plan_entry_binding_mismatch");
      return unique(failures);
    }
    if (value.expected_transition_kind_set_root !== receiverTerminalTransitionKindSetRoot(value, entry)) {
      failures.push("receiver_terminal_plan_transition_kind_set_mismatch");
    }
    failures.push(...validateTerminalSourceEvidence(value.terminal_release_evidence_ref, entry,
      value.release_cause, context));
    for (const [planField, entryField] of [
      ["event_id_slot_assignment_ref", "event_id_slot_assignment_ref"],
      ["event_id_slot_assignment_hash", "event_id_slot_assignment_hash"],
      ["sequence_slot_assignment_ref", "sequence_slot_assignment_ref"],
      ["sequence_slot_assignment_hash", "sequence_slot_assignment_hash"],
      ["trust_epoch_assignment_manifest_ref", "trust_epoch_assignment_manifest_ref"],
      ["trust_epoch_assignment_manifest_hash", "trust_epoch_assignment_manifest_hash"],
      ["trust_epoch_assignment_count", "trust_epoch_assignment_count"],
      ["future_dependency_pool_state_head_ref", "future_dependency_pool_state_head_ref"],
      ["future_dependency_pool_state_head_hash", "future_dependency_pool_state_head_hash"],
      ["future_dependency_assignment_ref", "future_dependency_assignment_ref"],
      ["future_dependency_assignment_hash", "future_dependency_assignment_hash"],
      ["connection_outstanding_action_entry_ref", "connection_outstanding_action_entry_ref"],
      ["connection_outstanding_action_entry_hash", "connection_outstanding_action_entry_hash"]
    ]) {
      if (canonicalHash(value[planField]) !== canonicalHash(entry[entryField])) {
        failures.push(`receiver_terminal_plan_entry_field_mismatch:${planField}`);
      }
    }
    const fenced = value.release_cause === "fenced_non_submission";
    if (fenced !== (value.receiver_stream_before_head_ref === null) ||
        (!fenced && !sameObjectRef(value.receiver_stream_before_head_ref, entry.current_receiver_stream_head_ref))) {
      failures.push("receiver_terminal_plan_stream_union_mismatch");
    }
    return unique(failures);
  } catch {
    return ["receiver_terminal_release_plan_malformed"];
  }
}

export function validateReceiverTerminalReleaseCompletion(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    failures.push(...refHashPairFailures(value, [
      ["terminal_release_plan_core_ref", "terminal_release_plan_core_hash"],
      ["terminal_release_evidence_ref", "terminal_release_evidence_hash"],
      ["trust_epoch_transition_manifest_ref", "trust_epoch_transition_manifest_hash"],
      ["future_dependency_transition_receipt_ref", "future_dependency_transition_receipt_hash"],
      ["receiver_stream_transition_receipt_ref", "receiver_stream_transition_receipt_hash"],
      ["unchanged_receiver_stream_head_ref", "unchanged_receiver_stream_head_hash"],
      ["receiver_outstanding_stream_transition_receipt_ref", "receiver_outstanding_stream_transition_receipt_hash"],
      ["connection_outstanding_action_transition_receipt_ref", "connection_outstanding_action_transition_receipt_hash"]
    ], "receiver_terminal_completion_ref_hash_mismatch"));
    const plan = resolveObject(context.objectResolver, value.terminal_release_plan_core_ref);
    const receiverTransition = resolveObject(context.objectResolver,
      value.receiver_outstanding_stream_transition_receipt_ref);
    const connectionTransition = value.connection_outstanding_action_transition_receipt_ref === null ? null :
      resolveObject(context.objectResolver, value.connection_outstanding_action_transition_receipt_ref);
    if (!plan || plan.schema !== "cairn.receiver_terminal_release_plan_core.v0.1" ||
        !exactRef(value.terminal_release_plan_core_ref, plan, context) ||
        validateReceiverTerminalReleasePlan(plan, context).length ||
        !receiverTransition || receiverTransition.schema !== "cairn.receiver_outstanding_stream_transition_receipt.v0.1" ||
        !exactRef(value.receiver_outstanding_stream_transition_receipt_ref, receiverTransition, context) ||
        validateReceiverOutstandingStreamTransitionReceipt(receiverTransition, context).length) {
      failures.push("receiver_terminal_completion_dependency_mismatch");
      return unique(failures);
    }
    if (!sameObjectRef(value.terminal_release_evidence_ref, plan.terminal_release_evidence_ref) ||
        value.completion_key !== receiverTerminalCompletionKey(plan) ||
        value.identity_transition_count !== 2 ||
        value.identity_transition_root !== canonicalHash(value.identity_epoch_transition_receipts) ||
        canonicalHash(sortedUniqueRefs(value.identity_epoch_transition_receipts.map(({ assignment_ref }) => assignment_ref))) !==
          canonicalHash(sortedUniqueRefs([plan.event_id_slot_assignment_ref, plan.sequence_slot_assignment_ref])) ||
        value.trust_epoch_transition_count !== plan.trust_epoch_assignment_count ||
        value.completed_transition_kind_set_root !== plan.expected_transition_kind_set_root ||
        value.plan_to_receipt_keyset_equality_proof_hash !==
          receiverTerminalPlanToReceiptKeysetEqualityHash(plan, value) ||
        value.authority_transaction_id !== plan.authority_transaction_id ||
        value.authority_transaction_id !== receiverTransition.authority_transaction_id) {
      failures.push("receiver_terminal_completion_plan_mismatch");
    }
    const identityTransitionRefs = sortedUniqueRefs(
      value.identity_epoch_transition_receipts.map(({ transition_receipt_ref }) => transition_receipt_ref)
    );
    if (identityTransitionRefs.length !== 1 ||
        !sameObjectRef(identityTransitionRefs[0], receiverTransition.identity_epoch_transition_receipt_ref)) {
      failures.push("receiver_terminal_completion_identity_transition_atomicity_mismatch");
    }
    const identityAssignments = [];
    for (const item of value.identity_epoch_transition_receipts) {
      const assignment = resolveObject(context.objectResolver, item.assignment_ref);
      if (!exactExternalObject(item.assignment_ref, assignment,
        "cairn.bounded_index_slot_assignment.v0.1", context, "assignment_hash", ["slot_assignment_id"]) ||
          item.assignment_hash !== item.assignment_ref.object_hash ||
          item.transition_receipt_hash !== item.transition_receipt_ref.object_hash) {
        failures.push("receiver_terminal_completion_identity_transition_mismatch");
      }
      identityAssignments.push(item.assignment_ref);
    }
    if (identityTransitionRefs.length === 1) {
      if (exactBoundedIdentityTransition(identityTransitionRefs[0], identityAssignments, plan.release_cause,
        value.authority_transaction_id, plan.terminal_release_evidence_ref, context).failures.length) {
        failures.push("receiver_terminal_completion_identity_transition_mismatch");
      }
    }
    const trustAssignmentManifest = resolveObject(context.objectResolver, plan.trust_epoch_assignment_manifest_ref);
    const trustTransitionManifest = resolveObject(context.objectResolver, value.trust_epoch_transition_manifest_ref);
    if (!trustAssignmentManifest || trustAssignmentManifest.schema !== "cairn.enumerable_transition_manifest.v0.1" ||
        !exactRef(plan.trust_epoch_assignment_manifest_ref, trustAssignmentManifest, context) ||
        validateTransitionManifest(trustAssignmentManifest, context).length ||
        trustAssignmentManifest.manifest_kind !== "receiver_trust_slot_assignments" ||
        !trustTransitionManifest || trustTransitionManifest.schema !== "cairn.enumerable_transition_manifest.v0.1" ||
        !exactRef(value.trust_epoch_transition_manifest_ref, trustTransitionManifest, context) ||
        validateTransitionManifest(trustTransitionManifest, context).length ||
        trustTransitionManifest.manifest_kind !== "receiver_trust_epoch_transitions" ||
        trustTransitionManifest.entry_count !== value.trust_epoch_transition_count ||
        trustTransitionManifest.entries_root !== value.trust_epoch_transition_root) {
      failures.push("receiver_terminal_completion_trust_transition_mismatch");
    } else {
      const transitionAssignments = [];
      for (const entry of trustTransitionManifest.sorted_entries) {
        const transition = resolveObject(context.objectResolver, entry.entry_object_ref);
        if (!exactExternalObject(entry.entry_object_ref, transition,
          "cairn.bounded_index_epoch_transition_receipt.v0.1", context, "receipt_hash",
          ["receipt_hash"]) || !Array.isArray(transition.reservation_assignment_transitions)) {
          failures.push("receiver_terminal_completion_trust_transition_mismatch");
        } else {
          const refs = transition.reservation_assignment_transitions.map(({ assignment_before_ref }) => assignment_before_ref);
          if (refs.some((reference) => reference === null) ||
              boundedAssignmentTransitionFailures(transition, refs, plan.release_cause,
                value.authority_transaction_id, plan.terminal_release_evidence_ref, context).length) {
            failures.push("receiver_terminal_completion_trust_transition_mismatch");
          }
          transitionAssignments.push(...refs);
        }
      }
      const trustAssignmentRefs = trustAssignmentManifest.sorted_entries.map(({ entry_object_ref }) => entry_object_ref);
      for (const reference of trustAssignmentRefs) {
        const assignment = resolveObject(context.objectResolver, reference);
        if (!exactExternalObject(reference, assignment, "cairn.bounded_index_slot_assignment.v0.1",
          context, "assignment_hash", ["slot_assignment_id"]) || assignment.slot_kind !== "trust_assertion") {
          failures.push("receiver_terminal_completion_trust_transition_mismatch");
        }
      }
      if (transitionAssignments.length !== trustAssignmentRefs.length ||
          canonicalHash(sortedUniqueRefs(transitionAssignments)) !== canonicalHash(sortedUniqueRefs(trustAssignmentRefs))) {
        failures.push("receiver_terminal_completion_trust_transition_mismatch");
      }
    }
    const futureRequired = plan.future_dependency_assignment_ref !== null;
    if (futureRequired !== (value.future_dependency_transition_receipt_ref !== null)) {
      failures.push("receiver_terminal_completion_future_union_mismatch");
    } else if (futureRequired) {
      const futureTransition = resolveObject(context.objectResolver, value.future_dependency_transition_receipt_ref);
      if (!exactExternalObject(value.future_dependency_transition_receipt_ref, futureTransition,
        "cairn.future_dependency_capacity_transition_receipt.v0.1", context, "receipt_hash",
        ["receipt_hash"]) ||
          futureTransition.cause !== RECEIVER_IDENTITY_TRANSITION_CAUSES.get(plan.release_cause)?.receiptCause ||
          !sameObjectRef(futureTransition.before_head_ref, plan.future_dependency_pool_state_head_ref) ||
          futureTransition.before_head_hash !== plan.future_dependency_pool_state_head_hash ||
          !sameObjectRef(futureTransition.assignment_before_ref, plan.future_dependency_assignment_ref) ||
          futureTransition.assignment_before_hash !== plan.future_dependency_assignment_hash ||
          !sameObjectRef(futureTransition.release_or_repair_evidence_ref, plan.terminal_release_evidence_ref) ||
          futureTransition.release_or_repair_evidence_hash !== plan.terminal_release_evidence_hash ||
          futureTransition.authority_transaction_id !== value.authority_transaction_id) {
        failures.push("receiver_terminal_completion_future_union_mismatch");
      } else {
        const beforeAssignment = resolveObject(context.objectResolver, futureTransition.assignment_before_ref);
        const afterAssignment = resolveObject(context.objectResolver, futureTransition.assignment_after_ref);
        const expectedState = new Map([
          ["authenticated_stream_closed", "released_on_authenticated_closure"],
          ["authenticated_irreversible_horizon", "released_on_authenticated_horizon"],
          ["fenced_non_submission", "released_on_fenced_non_submission"]
        ]).get(plan.release_cause);
        if (!exactExternalObject(futureTransition.assignment_before_ref, beforeAssignment,
          "cairn.future_dependency_assignment.v0.1", context, "assignment_hash", ["assignment_id"]) ||
            !exactExternalObject(futureTransition.assignment_after_ref, afterAssignment,
              "cairn.future_dependency_assignment.v0.1", context, "assignment_hash", ["assignment_id"]) ||
            afterAssignment.state !== expectedState ||
            ["assignment_id", "pool_key", "action_ref", "effect_id", "lineage_id", "reserved_slots"].some((field) =>
              canonicalHash(beforeAssignment?.[field]) !== canonicalHash(afterAssignment?.[field]))) {
          failures.push("receiver_terminal_completion_future_union_mismatch");
        }
      }
    }
    const closure = plan.release_cause === "authenticated_stream_closed";
    const horizon = plan.release_cause === "authenticated_irreversible_horizon";
    if (closure !== (value.receiver_stream_transition_receipt_ref !== null) ||
        horizon !== (value.unchanged_receiver_stream_head_ref !== null) ||
        (!closure && !horizon && (value.receiver_stream_transition_receipt_ref !== null ||
          value.unchanged_receiver_stream_head_ref !== null))) {
      failures.push("receiver_terminal_completion_stream_union_mismatch");
    } else if (closure) {
      const streamTransition = resolveObject(context.objectResolver, value.receiver_stream_transition_receipt_ref);
      if (!exactExternalObject(value.receiver_stream_transition_receipt_ref, streamTransition,
        "cairn.receiver_event_stream_transition_receipt.v0.1", context, "receipt_hash",
        ["receiver_event_stream_key", "receipt_hash"]) ||
          !sameObjectRef(value.receiver_stream_transition_receipt_ref,
            receiverTransition.receiver_stream_transition_receipt_ref)) {
        failures.push("receiver_terminal_completion_stream_union_mismatch");
      }
    } else if (horizon) {
      const unchangedStream = resolveObject(context.objectResolver, value.unchanged_receiver_stream_head_ref);
      if (!exactExternalObject(value.unchanged_receiver_stream_head_ref, unchangedStream,
        "cairn.receiver_event_stream_state_head.v0.1", context, "head_hash", ["receiver_event_stream_key"]) ||
          !sameObjectRef(value.unchanged_receiver_stream_head_ref, plan.receiver_stream_before_head_ref) ||
          !sameObjectRef(value.unchanged_receiver_stream_head_ref,
            receiverTransition.unchanged_receiver_stream_head_ref)) {
        failures.push("receiver_terminal_completion_stream_union_mismatch");
      }
    }
    const connectionRequired = plan.connection_outstanding_action_entry_ref !== null;
    if (connectionRequired !== (connectionTransition !== null) ||
        (connectionTransition !== null &&
          (!exactRef(value.connection_outstanding_action_transition_receipt_ref, connectionTransition, context) ||
           validateConnectionOutstandingIndexTransitionReceipt(connectionTransition, context).length ||
           connectionTransition.authority_transaction_id !== value.authority_transaction_id))) {
      failures.push("receiver_terminal_completion_connection_union_mismatch");
    }
    const committedAt = Date.parse(value.committed_at);
    const signedAt = Date.parse(value.authority_service_signature?.signed_at);
    const childTransitionRefs = [
      ...value.identity_epoch_transition_receipts.map(({ transition_receipt_ref }) => transition_receipt_ref),
      ...(trustTransitionManifest?.sorted_entries ?? []).map(({ entry_object_ref }) => entry_object_ref),
      value.future_dependency_transition_receipt_ref,
      value.receiver_stream_transition_receipt_ref
    ].filter((reference) => reference !== null);
    const childTransitionTimes = [...new Map(childTransitionRefs.map((reference) => [
      canonicalText(reference), resolveObject(context.objectResolver, reference)
    ])).values()].map((object) => Date.parse(object?.committed_at));
    const dependencyTimes = [Date.parse(plan.issued_at), Date.parse(receiverTransition.committed_at),
      ...(connectionTransition === null ? [] : [Date.parse(connectionTransition.committed_at)]),
      ...childTransitionTimes];
    if (![committedAt, signedAt, ...dependencyTimes].every(Number.isFinite) ||
        dependencyTimes.some((time) => time > committedAt) || signedAt < committedAt) {
      failures.push("receiver_terminal_completion_chronology_invalid");
    }
    return unique(failures);
  } catch {
    return ["receiver_terminal_release_completion_malformed"];
  }
}

export function validateReceiverOutstandingStreamTransitionReceipt(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    const before = value.entry_before_ref === null ? null : resolveObject(context.objectResolver, value.entry_before_ref);
    const after = resolveObject(context.objectResolver, value.entry_after_ref);
    if ((before !== null && (!exactRef(value.entry_before_ref, before, context) ||
        validateReceiverOutstandingStreamEntry(before, context).length)) ||
        !after || !exactRef(value.entry_after_ref, after, context) ||
        validateReceiverOutstandingStreamEntry(after, context).length) {
      return unique([...failures, "receiver_outstanding_transition_entry_mismatch"]);
    }
    const immutableFields = [
      "outstanding_stream_key", "receiver_sequence_epoch_selector_key", "identity_scope_index_key",
      "action_ref", "effect_id", "lineage_id", "precommitted_client_reference", "assigned_identity_epoch",
      "trust_epoch_assignment_manifest_ref", "trust_epoch_assignment_manifest_hash",
      "trust_epoch_assignment_count", "trust_epoch_assignments_root", "future_dependency_pool_state_head_ref",
      "future_dependency_pool_state_head_hash", "future_dependency_assignment_ref", "future_dependency_assignment_hash",
      "connection_outstanding_action_key", "finality_transition_profile_ref",
      "finality_transition_profile_hash", "authenticated_closure_or_horizon_rule_hash"
    ];
    if (value.outstanding_stream_key !== after.outstanding_stream_key ||
        after.outstanding_stream_key !== receiverOutstandingStreamKey(after) ||
        (before !== null && (immutableFields.some((field) =>
          canonicalHash(before[field]) !== canonicalHash(after[field])) ||
          after.sequence !== before.sequence + 1 || after.previous_entry_hash !== before.entry_hash))) {
      failures.push("receiver_outstanding_transition_sequence_mismatch");
    }
    if (["reservation_registered", "handoff_bound"].includes(value.cause) && before !== null &&
        ["event_id_slot_assignment_ref", "event_id_slot_assignment_hash", "sequence_slot_assignment_ref",
          "sequence_slot_assignment_hash"].some((field) =>
          canonicalHash(before[field]) !== canonicalHash(after[field]))) {
      failures.push("receiver_outstanding_transition_assignment_successor_mismatch");
    }
    if (before !== null) {
      const beforeConnection = before.connection_outstanding_action_entry_ref === null ? null :
        resolveObject(context.objectResolver, before.connection_outstanding_action_entry_ref);
      const afterConnection = after.connection_outstanding_action_entry_ref === null ? null :
        resolveObject(context.objectResolver, after.connection_outstanding_action_entry_ref);
      if ((beforeConnection === null) !== (afterConnection === null) ||
          (beforeConnection !== null && (before.connection_outstanding_action_key !== after.connection_outstanding_action_key ||
            !sameObjectRef(beforeConnection.action_ref, afterConnection.action_ref) ||
            beforeConnection.effect_id !== afterConnection.effect_id ||
            beforeConnection.lineage_id !== afterConnection.lineage_id ||
            (!sameObjectRef(before.connection_outstanding_action_entry_ref,
              after.connection_outstanding_action_entry_ref) &&
              (afterConnection.sequence !== beforeConnection.sequence + 1 ||
               afterConnection.previous_entry_hash !== beforeConnection.entry_hash)) ||
            (value.cause === "handoff_bound" &&
              (beforeConnection.state !== "reserved" || afterConnection.state !== "handed_off" ||
               sameObjectRef(before.connection_outstanding_action_entry_ref,
                 after.connection_outstanding_action_entry_ref)))))) {
        failures.push("receiver_outstanding_transition_connection_successor_mismatch");
      }
    }
    failures.push(...refHashPairFailures(value, [
      ["epoch_selector_before_head_ref", "epoch_selector_before_head_hash"],
      ["epoch_selector_after_head_ref", "epoch_selector_after_head_hash"],
      ["assigned_identity_scope_before_head_ref", "assigned_identity_scope_before_head_hash"],
      ["assigned_identity_scope_after_head_ref", "assigned_identity_scope_after_head_hash"],
      ["outstanding_stream_map_before_ref", "outstanding_stream_map_before_hash"],
      ["outstanding_stream_map_after_ref", "outstanding_stream_map_after_hash"],
      ["entry_before_ref", "entry_before_hash"], ["entry_after_ref", "entry_after_hash"],
      ["identity_epoch_transition_receipt_ref", "identity_epoch_transition_receipt_hash"],
      ["unchanged_assigned_identity_epoch_head_ref", "unchanged_assigned_identity_epoch_head_hash"],
      ["terminal_release_evidence_ref", "terminal_release_evidence_hash"],
      ["terminal_release_plan_core_ref", "terminal_release_plan_core_hash"],
      ["receiver_stream_transition_receipt_ref", "receiver_stream_transition_receipt_hash"],
      ["unchanged_receiver_stream_head_ref", "unchanged_receiver_stream_head_hash"]
    ], "receiver_outstanding_transition_ref_hash_mismatch"));
    const selectorBefore = resolveObject(context.objectResolver, value.epoch_selector_before_head_ref);
    const selectorAfter = resolveObject(context.objectResolver, value.epoch_selector_after_head_ref);
    const scopeBefore = resolveObject(context.objectResolver, value.assigned_identity_scope_before_head_ref);
    const scopeAfter = resolveObject(context.objectResolver, value.assigned_identity_scope_after_head_ref);
    if (!exactExternalObject(value.epoch_selector_before_head_ref, selectorBefore,
      "cairn.receiver_sequence_epoch_selector_state_head.v0.1", context, "head_hash",
      ["receiver_sequence_epoch_selector_key"]) ||
        !exactExternalObject(value.epoch_selector_after_head_ref, selectorAfter,
          "cairn.receiver_sequence_epoch_selector_state_head.v0.1", context, "head_hash",
          ["receiver_sequence_epoch_selector_key"]) ||
        selectorBefore.receiver_sequence_epoch_selector_key !== after.receiver_sequence_epoch_selector_key ||
        selectorAfter.receiver_sequence_epoch_selector_key !== after.receiver_sequence_epoch_selector_key ||
        selectorAfter.sequence !== selectorBefore.sequence + 1 || selectorAfter.previous_state_hash !== selectorBefore.head_hash ||
        !exactExternalObject(value.assigned_identity_scope_before_head_ref, scopeBefore,
          "cairn.receiver_event_identity_index_state_head.v0.1", context, "head_hash", ["identity_scope_index_key"]) ||
        !exactExternalObject(value.assigned_identity_scope_after_head_ref, scopeAfter,
          "cairn.receiver_event_identity_index_state_head.v0.1", context, "head_hash", ["identity_scope_index_key"]) ||
        scopeBefore.identity_scope_index_key !== after.identity_scope_index_key ||
        scopeAfter.identity_scope_index_key !== after.identity_scope_index_key ||
        scopeBefore.receiver_sequence_epoch_selector_key !== after.receiver_sequence_epoch_selector_key ||
        scopeAfter.receiver_sequence_epoch_selector_key !== after.receiver_sequence_epoch_selector_key ||
        scopeBefore.state !== "active" || scopeAfter.state !== "active" ||
        (value.cause === "handoff_bound"
          ? !sameObjectRef(value.assigned_identity_scope_before_head_ref, value.assigned_identity_scope_after_head_ref)
          : (scopeAfter.sequence !== scopeBefore.sequence + 1 ||
            scopeAfter.previous_state_hash !== scopeBefore.head_hash))) {
      failures.push("receiver_outstanding_transition_selector_scope_mismatch");
    }
    const beforeMap = resolveObject(context.objectResolver, value.outstanding_stream_map_before_ref);
    const afterMap = resolveObject(context.objectResolver, value.outstanding_stream_map_after_ref);
    const expectedMapKey = receiverOutstandingMapKey(after.receiver_sequence_epoch_selector_key);
    if (!beforeMap || beforeMap.schema !== "cairn.enumerable_map_root.v0.1" ||
        !exactRef(value.outstanding_stream_map_before_ref, beforeMap, context) ||
        validateEnumerableMapRoot(beforeMap, { ...context, expectedMapDomain: "receiver_outstanding_stream",
          expectedMapKey }).length ||
        !afterMap || afterMap.schema !== "cairn.enumerable_map_root.v0.1" ||
        !exactRef(value.outstanding_stream_map_after_ref, afterMap, context) ||
        validateEnumerableMapRoot(afterMap, { ...context, expectedMapDomain: "receiver_outstanding_stream",
          expectedMapKey }).length ||
        !sameObjectRef(selectorBefore?.outstanding_stream_map_ref, value.outstanding_stream_map_before_ref) ||
        selectorBefore?.outstanding_stream_map_hash !== beforeMap?.map_hash ||
        !sameObjectRef(selectorAfter?.outstanding_stream_map_ref, value.outstanding_stream_map_after_ref) ||
        selectorAfter?.outstanding_stream_map_hash !== afterMap?.map_hash) {
      failures.push("receiver_outstanding_transition_map_binding_mismatch");
    }
    const beforeProof = validateEnumerableMapPathProof(value.before_change_proof, beforeMap,
      before === null ? "nonmembership" : "membership",
      before === null ? null : { entry_object_ref: value.entry_before_ref, entry_object_hash: value.entry_before_hash },
      { ...context, expectedEntryKey: value.outstanding_stream_key });
    const afterProof = validateEnumerableMapPathProof(value.after_change_proof, afterMap,
      value.after_current_map_membership ? "membership" : "nonmembership",
      value.after_current_map_membership
        ? { entry_object_ref: value.entry_after_ref, entry_object_hash: value.entry_after_hash } : null,
      { ...context, expectedEntryKey: value.outstanding_stream_key });
    if (beforeProof.failures.length || afterProof.failures.length ||
        canonicalHash(beforeProof.frontier) !== canonicalHash(afterProof.frontier)) {
      failures.push("receiver_outstanding_transition_map_proof_mismatch");
    }
    const terminalStates = new Map([
      ["fenced_non_submission", "fenced_non_submission"],
      ["authenticated_stream_closed", "authenticated_stream_closed"],
      ["authenticated_irreversible_horizon", "authenticated_irreversible_horizon"]
    ]);
    const terminalState = terminalStates.get(value.cause);
    const terminal = terminalState !== undefined;
    const changedCount = (afterMap?.entry_count ?? 0) - (beforeMap?.entry_count ?? 0);
    if (value.cause === "reservation_registered") {
      if (before !== null || after.sequence !== 0 || after.previous_entry_hash !== null || after.state !== "reserved" ||
          !value.after_current_map_membership || changedCount !== 1 || afterMap?.revision !== beforeMap?.revision + 1) {
        failures.push("receiver_outstanding_transition_reservation_union_mismatch");
      }
    } else if (value.cause === "handoff_bound") {
      if (before?.state !== "reserved" || after.state !== "handed_off" || !value.after_current_map_membership ||
          changedCount !== 0 || afterMap?.revision !== beforeMap?.revision + 1 ||
          value.identity_epoch_transition_receipt_ref !== null ||
          value.unchanged_assigned_identity_epoch_head_ref === null) {
        failures.push("receiver_outstanding_transition_handoff_union_mismatch");
      }
    } else if (value.cause === "authenticated_event_observed") {
      if (before === null || !["handed_off"].includes(before.state) || after.state !== "handed_off" ||
          !value.after_current_map_membership || changedCount !== 0 ||
          afterMap?.revision !== beforeMap?.revision + 1 || value.identity_epoch_transition_receipt_ref === null) {
        failures.push("receiver_outstanding_transition_event_union_mismatch");
      }
      const streamBefore = resolveObject(context.objectResolver, before?.current_receiver_stream_head_ref);
      const streamAfter = resolveObject(context.objectResolver, after.current_receiver_stream_head_ref);
      if (!exactExternalObject(before?.current_receiver_stream_head_ref, streamBefore,
        "cairn.receiver_event_stream_state_head.v0.1", context, "head_hash", ["receiver_event_stream_key"]) ||
          !exactExternalObject(after.current_receiver_stream_head_ref, streamAfter,
            "cairn.receiver_event_stream_state_head.v0.1", context, "head_hash", ["receiver_event_stream_key"]) ||
          ["receiver_event_stream_key", "receiver_id", "receiver_account_or_contract_scope", "operation_kind",
            "action_ref", "effect_id", "precommitted_client_reference", "finality_transition_profile_ref",
            "finality_transition_profile_hash"].some((field) =>
            canonicalHash(streamAfter?.[field]) !== canonicalHash(streamBefore?.[field])) ||
          streamAfter.sequence !== streamBefore.sequence + 1 ||
          streamAfter.previous_state_hash !== streamBefore.head_hash) {
        failures.push("receiver_outstanding_transition_event_stream_successor_mismatch");
      }
    } else if (terminal) {
      const plan = resolveObject(context.objectResolver, value.terminal_release_plan_core_ref);
      if (before === null || after.state !== terminalState || value.after_current_map_membership !== false ||
          changedCount !== -1 || afterMap?.revision !== beforeMap?.revision + 1 ||
          value.identity_epoch_transition_receipt_ref === null || value.terminal_release_evidence_ref === null ||
          !plan || plan.schema !== "cairn.receiver_terminal_release_plan_core.v0.1" ||
          !exactRef(value.terminal_release_plan_core_ref, plan, context) ||
          validateReceiverTerminalReleasePlan(plan, context).length ||
          !sameObjectRef(plan.receiver_outstanding_stream_entry_ref, value.entry_before_ref) ||
          !sameObjectRef(plan.terminal_release_evidence_ref, value.terminal_release_evidence_ref) ||
          plan.authority_transaction_id !== value.authority_transaction_id || plan.release_cause !== value.cause) {
        failures.push("receiver_outstanding_transition_terminal_union_mismatch");
      }
      failures.push(...validateTerminalSourceEvidence(value.terminal_release_evidence_ref, after, value.cause, context));
    }
    const nonTerminalFields = ["terminal_release_evidence_ref", "terminal_release_plan_core_ref"];
    if (!terminal && nonTerminalFields.some((field) => value[field] !== null)) {
      failures.push("receiver_outstanding_transition_nonterminal_evidence_mismatch");
    }
    if (value.cause !== "handoff_bound" && value.unchanged_assigned_identity_epoch_head_ref !== null) {
      failures.push("receiver_outstanding_transition_assigned_epoch_union_mismatch");
    }
    if (value.cause === "handoff_bound") {
      const unchangedScope = resolveObject(context.objectResolver, value.unchanged_assigned_identity_epoch_head_ref);
      if (!exactExternalObject(value.unchanged_assigned_identity_epoch_head_ref, unchangedScope,
        "cairn.receiver_event_identity_index_state_head.v0.1", context, "head_hash", ["identity_scope_index_key"]) ||
          !sameObjectRef(value.unchanged_assigned_identity_epoch_head_ref,
            value.assigned_identity_scope_before_head_ref) ||
          !sameObjectRef(value.unchanged_assigned_identity_epoch_head_ref,
            value.assigned_identity_scope_after_head_ref)) {
        failures.push("receiver_outstanding_transition_assigned_epoch_union_mismatch");
      }
    } else if (value.cause === "authenticated_event_observed") {
      if (receiverEventIdentityTransitionFailures(value.identity_epoch_transition_receipt_ref,
        before, after, scopeBefore, scopeAfter, value.authority_transaction_id, context).length) {
        failures.push("receiver_outstanding_transition_identity_transition_mismatch");
      }
    } else {
      const expectedIdentityAssignmentRefs = before === null
        ? [after.event_id_slot_assignment_ref, after.sequence_slot_assignment_ref]
        : [before.event_id_slot_assignment_ref, before.sequence_slot_assignment_ref];
      const identityResult = exactBoundedIdentityTransition(value.identity_epoch_transition_receipt_ref,
        expectedIdentityAssignmentRefs, value.cause,
        value.authority_transaction_id, terminal ? value.terminal_release_evidence_ref : null, context);
      const identityTransition = identityResult.transition;
      const transitionBeforeRefs = identityTransition?.reservation_assignment_transitions?.map(
        ({ assignment_before_ref }) => assignment_before_ref
      ) ?? [];
      const transitionAfterRefs = identityTransition?.reservation_assignment_transitions?.map(
        ({ assignment_after_ref }) => assignment_after_ref
      ) ?? [];
      if (identityResult.failures.length ||
          (before !== null && canonicalHash(sortedUniqueRefs(transitionBeforeRefs)) !==
            canonicalHash(sortedUniqueRefs(expectedIdentityAssignmentRefs))) ||
          canonicalHash(sortedUniqueRefs(transitionAfterRefs)) !== canonicalHash(sortedUniqueRefs([
            after.event_id_slot_assignment_ref, after.sequence_slot_assignment_ref
          ])) ||
          !sameObjectRef(identityTransition?.before_directory_head_ref, scopeBefore?.index_epoch_directory_head_ref) ||
          identityTransition?.before_directory_head_hash !== scopeBefore?.index_epoch_directory_head_hash ||
          identityTransition?.before_directory_head_hash !== identityTransition?.before_directory_head_ref?.object_hash ||
          !sameObjectRef(identityTransition?.after_directory_head_ref, scopeAfter?.index_epoch_directory_head_ref) ||
          identityTransition?.after_directory_head_hash !== scopeAfter?.index_epoch_directory_head_hash ||
          identityTransition?.after_directory_head_hash !== identityTransition?.after_directory_head_ref?.object_hash) {
        failures.push("receiver_outstanding_transition_identity_transition_mismatch");
        failures.push(...identityResult.failures.map((code) =>
          `receiver_outstanding_transition_identity_transition_${code}`));
      }
    }
    if (value.cause === "authenticated_stream_closed") {
      const streamTransition = resolveObject(context.objectResolver, value.receiver_stream_transition_receipt_ref);
      if (!exactExternalObject(value.receiver_stream_transition_receipt_ref, streamTransition,
        "cairn.receiver_event_stream_transition_receipt.v0.1", context, "receipt_hash",
        ["receiver_event_stream_key", "receipt_hash"]) || value.unchanged_receiver_stream_head_ref !== null ||
          streamTransition.receiver_event_stream_key !== before?.current_receiver_stream_head_ref?.object_id) {
        failures.push("receiver_outstanding_transition_closure_union_mismatch");
      }
    } else if (value.cause === "authenticated_irreversible_horizon") {
      const unchangedStream = resolveObject(context.objectResolver, value.unchanged_receiver_stream_head_ref);
      if (value.receiver_stream_transition_receipt_ref !== null ||
          !sameObjectRef(value.unchanged_receiver_stream_head_ref, before?.current_receiver_stream_head_ref) ||
          !exactExternalObject(value.unchanged_receiver_stream_head_ref, unchangedStream,
            "cairn.receiver_event_stream_state_head.v0.1", context, "head_hash", ["receiver_event_stream_key"])) {
        failures.push("receiver_outstanding_transition_horizon_union_mismatch");
      }
    } else if (value.receiver_stream_transition_receipt_ref !== null ||
        value.unchanged_receiver_stream_head_ref !== null) {
      failures.push("receiver_outstanding_transition_stream_union_mismatch");
    }
    const committedAt = Date.parse(value.committed_at);
    const signedAt = Date.parse(value.authority_service_signature?.signed_at);
    if (![committedAt, signedAt].every(Number.isFinite) || signedAt < committedAt) {
      failures.push("receiver_outstanding_transition_chronology_invalid");
    }
    return unique(failures);
  } catch {
    return ["receiver_outstanding_stream_transition_receipt_malformed"];
  }
}

export function validateEnumerableMapRoot(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    const expectedDomain = context.expectedMapDomain ?? value.map_domain;
    if (value.map_domain !== expectedDomain) failures.push("enumerable_map_domain_mismatch");
    if (context.expectedMapKey !== undefined && value.map_key !== context.expectedMapKey) {
      failures.push("enumerable_map_key_mismatch");
    }
    const rootNode = context.rootMapNode ?? resolveObject(context.objectResolver, value.root_node_ref);
    if (!rootNode || rootNode.schema !== "cairn.enumerable_map_node.v0.1" ||
        !exactRef(value.root_node_ref, rootNode, context)) {
      failures.push("enumerable_map_root_node_mismatch");
      return unique(failures);
    }
    failures.push(...inspectEnumerableMapNode(rootNode, context, expectedDomain));
    failures.push(...resolveEnumerableMapEntries(value, expectedDomain, context).failures);
    if (value.entry_count !== rootNode.subtree_entry_count || value.entries_root !== rootNode.entries_root ||
        (value.entry_count === 0 && rootNode.node_kind !== "empty") ||
        (value.entry_count > 0 && rootNode.node_kind === "empty")) {
      failures.push("enumerable_map_entries_commitment_mismatch");
    }
    return unique(failures);
  } catch {
    return ["enumerable_map_root_malformed"];
  }
}

function enumerableMapProofFrontierSummary(child) {
  return {
    path_prefix_nibbles: child.child_path_prefix_nibbles,
    node_hash: child.child_node_hash,
    subtree_entry_count: child.child_subtree_entry_count,
    entries_root: child.child_entries_root
  };
}

function normalizedEnumerableMapProofFrontier(frontier) {
  return [...frontier].sort((left, right) =>
    left.path_prefix_nibbles.localeCompare(right.path_prefix_nibbles) || left.node_hash.localeCompare(right.node_hash));
}

export function validateEnumerableMapPathProof(proof, root, expectedClaim, expectedEntry, context = {}) {
  try {
    const failures = [];
    const frontier = [];
    if (!proof || proof.claim !== expectedClaim || proof.entry_key !== context.expectedEntryKey ||
        !sameObjectRef(proof.map_root_ref, objectRef(root, context)) || proof.map_root_hash !== root.map_hash) {
      return { failures: ["enumerable_map_proof_binding_mismatch"], frontier };
    }
    if (expectedClaim === "membership" && proof.absence_kind !== null) {
      failures.push("enumerable_map_membership_claim_mismatch");
    }
    if (expectedClaim === "nonmembership" && proof.absence_kind === null) {
      failures.push("enumerable_map_nonmembership_claim_mismatch");
    }
    const pathRefs = [...proof.ancestor_node_refs, proof.terminal_node_ref];
    if (pathRefs.length < 1 || pathRefs.length > 65 ||
        !sameObjectRef(pathRefs[0], root.root_node_ref) ||
        proof.terminal_node_hash !== proof.terminal_node_ref.object_hash) {
      return { failures: unique([...failures, "enumerable_map_proof_path_mismatch"]), frontier };
    }
    const keyHex = proof.entry_key.slice(8);
    for (let index = 0; index < pathRefs.length; index += 1) {
      const reference = pathRefs[index];
      const node = resolveObject(context.objectResolver, reference);
      if (!node || node.schema !== "cairn.enumerable_map_node.v0.1" || !exactRef(reference, node, context) ||
          validateEnumerableMapNode(node, { ...context, expectedMapDomain: root.map_domain }).length) {
        return { failures: unique([...failures, "enumerable_map_proof_node_mismatch"]), frontier };
      }
      const terminal = index === pathRefs.length - 1;
      const prefixMatches = keyHex.startsWith(node.path_prefix_nibbles);
      if (node.node_kind === "empty") {
        if (!terminal || index !== 0 || expectedClaim !== "nonmembership" || proof.absence_kind !== "empty_root") {
          failures.push("enumerable_map_proof_empty_terminal_mismatch");
        }
        break;
      }
      if (node.node_kind === "leaf") {
        const exactKey = node.leaf_entry.entry_key === proof.entry_key;
        if (!terminal || (expectedClaim === "membership" && (!exactKey ||
            !sameObjectRef(node.leaf_entry.entry_object_ref, expectedEntry?.entry_object_ref) ||
            node.leaf_entry.entry_object_hash !== expectedEntry?.entry_object_hash)) ||
            (expectedClaim === "nonmembership" && (exactKey || proof.absence_kind !== "leaf_key_mismatch"))) {
          failures.push("enumerable_map_proof_leaf_terminal_mismatch");
        }
        if (expectedClaim === "nonmembership") frontier.push({
          path_prefix_nibbles: node.path_prefix_nibbles,
          node_hash: node.node_hash,
          subtree_entry_count: node.subtree_entry_count,
          entries_root: node.entries_root
        });
        break;
      }
      if (!prefixMatches) {
        if (!terminal || expectedClaim !== "nonmembership" || proof.absence_kind !== "compressed_prefix_mismatch") {
          failures.push("enumerable_map_proof_prefix_terminal_mismatch");
        }
        frontier.push({
          path_prefix_nibbles: node.path_prefix_nibbles,
          node_hash: node.node_hash,
          subtree_entry_count: node.subtree_entry_count,
          entries_root: node.entries_root
        });
        break;
      }
      const nibble = keyHex[node.path_prefix_nibbles.length];
      const selected = node.branch_children.find((child) => child.nibble === nibble);
      if (!selected) {
        if (!terminal || expectedClaim !== "nonmembership" || proof.absence_kind !== "missing_child") {
          failures.push("enumerable_map_proof_missing_child_terminal_mismatch");
        }
        frontier.push(...node.branch_children.map(enumerableMapProofFrontierSummary));
        break;
      }
      frontier.push(...node.branch_children.filter((child) => child !== selected)
        .map(enumerableMapProofFrontierSummary));
      if (terminal || !sameObjectRef(pathRefs[index + 1], selected.child_node_ref)) {
        failures.push("enumerable_map_proof_child_path_mismatch");
        break;
      }
      const nextNode = resolveObject(context.objectResolver, pathRefs[index + 1]);
      if (!nextNode || selected.child_node_hash !== nextNode.node_hash ||
          selected.child_path_prefix_nibbles !== nextNode.path_prefix_nibbles ||
          selected.child_subtree_entry_count !== nextNode.subtree_entry_count ||
          selected.child_entries_root !== nextNode.entries_root ||
          !selected.child_path_prefix_nibbles.startsWith(`${node.path_prefix_nibbles}${selected.nibble}`)) {
        failures.push("enumerable_map_proof_child_summary_mismatch");
        break;
      }
    }
    return { failures: unique(failures), frontier: normalizedEnumerableMapProofFrontier(frontier) };
  } catch {
    return { failures: ["enumerable_map_proof_malformed"], frontier: [] };
  }
}

export function validateConnectionOutstandingIndexHead(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    if (context.expectedConnectionStateId !== undefined &&
        value.connection_state_id !== context.expectedConnectionStateId) {
      failures.push("connection_outstanding_index_identity_mismatch");
    }
    const mapRoot = context.outstandingActionMap ?? resolveObject(context.objectResolver, value.outstanding_action_map_ref);
    if (!mapRoot || mapRoot.schema !== "cairn.enumerable_map_root.v0.1" ||
        !exactRef(value.outstanding_action_map_ref, mapRoot, context)) {
      failures.push("connection_outstanding_map_ref_mismatch");
    } else {
      failures.push(...validateEnumerableMapRoot(mapRoot, {
        ...context,
        expectedMapDomain: "connection_outstanding_action",
        expectedMapKey: connectionOutstandingMapKey(value.outstanding_action_index_key),
        expectedConnectionStateId: value.connection_state_id
      }).map((code) => `connection_outstanding_map_${code}`));
      if (value.outstanding_action_map_hash !== mapRoot.map_hash ||
          value.outstanding_action_count !== mapRoot.entry_count ||
          value.outstanding_action_root !== mapRoot.entries_root) {
        failures.push("connection_outstanding_map_commitment_mismatch");
      }
    }
    return unique(failures);
  } catch {
    return ["connection_outstanding_index_malformed"];
  }
}

export function validateConnectionOutstandingIndexTransitionReceipt(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    const before = value.before_head_ref === null ? null : resolveObject(context.objectResolver, value.before_head_ref);
    const after = resolveObject(context.objectResolver, value.after_head_ref);
    const beforeValid = value.before_head_ref === null
      ? before === null
      : before?.schema === "cairn.connection_outstanding_action_index_state_head.v0.1" &&
        exactRef(value.before_head_ref, before, context);
    const afterValid = after?.schema === "cairn.connection_outstanding_action_index_state_head.v0.1" &&
      exactRef(value.after_head_ref, after, context);
    if (!beforeValid || !afterValid) return unique([...failures, "outstanding_index_transition_head_mismatch"]);
    if (before !== null) failures.push(...validateConnectionOutstandingIndexHead(before, context)
      .map((code) => `outstanding_index_transition_before_${code}`));
    failures.push(...validateConnectionOutstandingIndexHead(after, context)
      .map((code) => `outstanding_index_transition_after_${code}`));
    if (value.outstanding_action_index_key !== after.outstanding_action_index_key ||
        (before !== null && value.outstanding_action_index_key !== before.outstanding_action_index_key) ||
        canonicalHash(value.before_action_map_ref) !== canonicalHash(before?.outstanding_action_map_ref ?? null) ||
        canonicalHash(value.before_action_map_hash) !== canonicalHash(before?.outstanding_action_map_hash ?? null) ||
        !sameObjectRef(value.after_action_map_ref, after.outstanding_action_map_ref) ||
        value.after_action_map_hash !== after.outstanding_action_map_hash) {
      failures.push("outstanding_index_transition_map_binding_mismatch");
    }
    const beforeMap = before === null ? null : resolveObject(context.objectResolver, before.outstanding_action_map_ref);
    const afterMap = resolveObject(context.objectResolver, after.outstanding_action_map_ref);
    const mapsChanged = beforeMap !== null &&
      (!sameObjectRef(before.outstanding_action_map_ref, after.outstanding_action_map_ref) ||
       before.outstanding_action_map_hash !== after.outstanding_action_map_hash);
    const changedBefore = value.changed_entry_before_ref === null ? null :
      resolveObject(context.objectResolver, value.changed_entry_before_ref);
    const changedAfter = value.changed_entry_after_ref === null ? null :
      resolveObject(context.objectResolver, value.changed_entry_after_ref);
    const exactChangedEntry = (reference, entry) => entry?.schema === "cairn.connection_outstanding_action_entry.v0.1" &&
      exactRef(reference, entry, context) && entry.outstanding_action_key === value.changed_action_key &&
      validateConnectionOutstandingActionEntry(entry, {
        ...context, expectedConnectionStateId: after.connection_state_id
      }).length === 0;
    const beforeProof = value.before_change_proof === null || beforeMap === null ? null :
      validateEnumerableMapPathProof(value.before_change_proof, beforeMap,
        value.changed_entry_before_ref === null ? "nonmembership" : "membership",
        value.changed_entry_before_ref === null ? null : {
          entry_object_ref: value.changed_entry_before_ref,
          entry_object_hash: value.changed_entry_before_hash
        }, { ...context, expectedEntryKey: value.changed_action_key });
    const afterProof = value.after_change_proof === null ? null :
      validateEnumerableMapPathProof(value.after_change_proof, afterMap,
        value.changed_entry_after_ref === null ? "nonmembership" : "membership",
        value.changed_entry_after_ref === null ? null : {
          entry_object_ref: value.changed_entry_after_ref,
          entry_object_hash: value.changed_entry_after_hash
        }, { ...context, expectedEntryKey: value.changed_action_key });
    const proofsValid = beforeProof !== null && afterProof !== null &&
      beforeProof.failures.length === 0 && afterProof.failures.length === 0 &&
      canonicalHash(beforeProof.frontier) === canonicalHash(afterProof.frontier);
    const genesis = value.cause === "connection_genesis";
    if (genesis) {
      if (before !== null || after.sequence !== 0 || after.previous_state_hash !== null ||
          after.outstanding_action_count !== 0 || after.state !== "active" || afterMap?.revision !== 0) {
        failures.push("outstanding_index_transition_genesis_mismatch");
      }
    } else if (before === null || after.sequence !== before.sequence + 1 ||
        after.previous_state_hash !== before.head_hash) {
      failures.push("outstanding_index_transition_sequence_mismatch");
    }
    const noEntryChange = ["connection_genesis", "connection_restriction_snapshot", "connection_terminal_seal"].includes(value.cause);
    const entryFields = [
      "changed_action_key", "changed_entry_before_ref", "changed_entry_before_hash",
      "changed_entry_after_ref", "changed_entry_after_hash", "before_change_proof", "after_change_proof",
      "action_transition_receipt_ref", "action_transition_receipt_hash", "terminal_evidence_ref", "terminal_evidence_hash"
    ];
    if (noEntryChange && entryFields.some((field) => value[field] !== null)) {
      failures.push("outstanding_index_transition_change_union_mismatch");
    }
    if (value.cause === "action_reserved") {
      if (before === null || !mapsChanged || before.state !== "active" || after.state !== "active" ||
          after.outstanding_action_count !== before.outstanding_action_count + 1 ||
          afterMap?.revision !== beforeMap?.revision + 1 || value.changed_action_key === null ||
          value.changed_entry_before_ref !== null || value.changed_entry_before_hash !== null ||
          !exactChangedEntry(value.changed_entry_after_ref, changedAfter) || changedAfter.state !== "reserved" ||
          !proofsValid || value.before_change_proof?.claim !== "nonmembership" ||
          value.after_change_proof?.claim !== "membership" ||
          value.action_transition_receipt_ref !== null || value.action_transition_receipt_hash !== null ||
          value.terminal_evidence_ref !== null || value.terminal_evidence_hash !== null) {
        failures.push("outstanding_index_transition_reservation_union_mismatch");
      }
    } else if (value.cause === "action_head_updated") {
      const immutable = ["outstanding_action_key", "connection_state_id", "action_ref", "effect_id", "lineage_id"];
      const actionTransition = resolveObject(context.objectResolver, value.action_transition_receipt_ref);
      const beforeActionState = resolveObject(context.objectResolver, changedBefore?.current_action_state_head_ref);
      const afterActionState = resolveObject(context.objectResolver, changedAfter?.current_action_state_head_ref);
      const action = resolveObject(context.objectResolver, changedAfter?.action_ref);
      const actionBinding = resolveObject(context.objectResolver, actionTransition?.execution_binding_set_ref);
      const actionTransitionValid = actionTransition?.schema === "cairn.action_receipt.v0.2" &&
        exactRef(value.action_transition_receipt_ref, actionTransition, context) &&
        sameObjectRef(afterActionState?.prior_transition_receipt_ref, value.action_transition_receipt_ref) &&
        validatePhase1Object(actionTransition, context).length === 0 &&
        validateActionStateTransition(beforeActionState, afterActionState, context).length === 0 &&
        sameObjectRef(actionTransition.action_ref, changedAfter?.action_ref) &&
        actionTransition.effect_id === changedAfter?.effect_id &&
        actionTransition.state_before === beforeActionState?.state &&
        actionTransition.state_after === afterActionState?.state &&
        sameObjectRef(actionTransition.execution_binding_set_ref, action?.execution_binding_set_ref) &&
        actionTransition.execution_binding_set_hash === action?.execution_binding_set_hash &&
        actionBinding?.schema === "cairn.execution_binding_set.v0.1" &&
        exactRef(actionTransition.execution_binding_set_ref, actionBinding, context) &&
        validateActionReceipt(actionTransition, beforeActionState, afterActionState, actionBinding, {
          ...context, action
        }).length === 0;
      if (before === null || !mapsChanged || before.state !== after.state ||
          after.outstanding_action_count !== before.outstanding_action_count ||
          afterMap?.revision !== beforeMap?.revision + 1 || value.changed_action_key === null ||
          !exactChangedEntry(value.changed_entry_before_ref, changedBefore) ||
          !exactChangedEntry(value.changed_entry_after_ref, changedAfter) ||
          immutable.some((field) => canonicalHash(changedBefore?.[field]) !== canonicalHash(changedAfter?.[field])) ||
          changedAfter?.sequence !== changedBefore?.sequence + 1 ||
          changedAfter?.previous_entry_hash !== changedBefore?.entry_hash ||
          !proofsValid || value.before_change_proof?.claim !== "membership" ||
          value.after_change_proof?.claim !== "membership" || !actionTransitionValid ||
          value.terminal_evidence_ref !== null || value.terminal_evidence_hash !== null) {
        failures.push("outstanding_index_transition_update_union_mismatch");
      }
    } else if (["fenced_non_submission_removed", "authenticated_stream_closed_removed",
      "authenticated_irreversible_horizon_removed"].includes(value.cause)) {
      const terminalEvidence = resolveObject(context.objectResolver, value.terminal_evidence_ref);
      const expectedTerminalCause = new Map([
        ["fenced_non_submission_removed", "fenced_non_submission"],
        ["authenticated_stream_closed_removed", "authenticated_stream_closed"],
        ["authenticated_irreversible_horizon_removed", "authenticated_irreversible_horizon"]
      ]).get(value.cause);
      const receiverBefore = resolveObject(context.objectResolver, terminalEvidence?.entry_before_ref);
      const terminalEvidenceValid = terminalEvidence?.schema === "cairn.receiver_outstanding_stream_transition_receipt.v0.1" &&
        exactRef(value.terminal_evidence_ref, terminalEvidence, context) &&
        validateReceiverOutstandingStreamTransitionReceipt(terminalEvidence, context).length === 0 &&
        terminalEvidence.cause === expectedTerminalCause && terminalEvidence.after_current_map_membership === false &&
        terminalEvidence.authority_transaction_id === value.authority_transaction_id &&
        terminalEvidence.committed_at === value.committed_at &&
        sameObjectRef(receiverBefore?.connection_outstanding_action_entry_ref, value.changed_entry_before_ref) &&
        receiverBefore?.connection_outstanding_action_entry_hash === value.changed_entry_before_hash;
      if (before === null || !mapsChanged || before.state !== after.state ||
          before.outstanding_action_count === 0 || after.outstanding_action_count !== before.outstanding_action_count - 1 ||
          afterMap?.revision !== beforeMap?.revision + 1 || value.changed_action_key === null ||
          !exactChangedEntry(value.changed_entry_before_ref, changedBefore) ||
          value.changed_entry_after_ref !== null || value.changed_entry_after_hash !== null ||
          !proofsValid || value.before_change_proof?.claim !== "membership" ||
          value.after_change_proof?.claim !== "nonmembership" ||
          value.action_transition_receipt_ref !== null || value.action_transition_receipt_hash !== null ||
          value.terminal_evidence_ref === null || value.terminal_evidence_hash === null || !terminalEvidenceValid) {
        failures.push("outstanding_index_transition_removal_union_mismatch");
      }
    } else if (value.cause === "connection_restriction_snapshot") {
      if (before === null || mapsChanged || before.state !== "active" || after.state !== "active" ||
          after.outstanding_action_count !== before.outstanding_action_count ||
          after.outstanding_action_root !== before.outstanding_action_root || afterMap?.revision !== beforeMap?.revision) {
        failures.push("outstanding_index_transition_snapshot_changed_map");
      }
    } else if (value.cause === "connection_terminal_seal") {
      if (before === null || mapsChanged || before.state !== "active" || after.state !== "sealed" ||
          after.outstanding_action_count !== before.outstanding_action_count ||
          after.outstanding_action_root !== before.outstanding_action_root || afterMap?.revision !== beforeMap?.revision) {
        failures.push("outstanding_index_transition_terminal_seal_mismatch");
      }
    }
    const committedAt = Date.parse(value.committed_at);
    const signedAt = Date.parse(value.authority_service_signature?.signed_at);
    const terminalEvidence = value.terminal_evidence_ref === null ? null :
      resolveObject(context.objectResolver, value.terminal_evidence_ref);
    const terminalSignedAt = terminalEvidence === null ? null :
      Date.parse(terminalEvidence.authority_service_signature?.signed_at);
    if (![committedAt, signedAt, Date.parse(after.updated_at),
      Date.parse(after.authority_service_signature?.signed_at)].every(Number.isFinite) ||
        Date.parse(after.updated_at) !== committedAt || signedAt < committedAt ||
        Date.parse(after.authority_service_signature?.signed_at) < committedAt ||
        Date.parse(after.authority_service_signature?.signed_at) > signedAt ||
        (terminalEvidence !== null && (!Number.isFinite(terminalSignedAt) ||
          terminalSignedAt < committedAt || terminalSignedAt > signedAt)) ||
        (before !== null && [Date.parse(before.updated_at), Date.parse(before.authority_service_signature?.signed_at)]
          .some((instant) => !Number.isFinite(instant) || instant > committedAt))) {
      failures.push("outstanding_index_transition_chronology_invalid");
    }
    return unique(failures);
  } catch {
    return ["connection_outstanding_index_transition_receipt_malformed"];
  }
}

export function validateConnectionEvent(receipt, before, after, context = {}) {
  try {
    const failures = validatePhase1Object(receipt, context);
    failures.push(...validatePhase1Object(after, context).map((code) => `after_${code}`));
    if (before !== null) failures.push(...validatePhase1Object(before, context).map((code) => `before_${code}`));
    if (failures.length) return unique(failures);
    const exactResolved = (reference, object, schema) => object?.schema === schema &&
      exactRef(reference, object, context) && validatePhase1Object(object, context).length === 0;
    const aggregateBefore = context.aggregateControlBefore ??
      resolveObject(context.objectResolver, receipt.aggregate_control_before_head_ref);
    const aggregateAfter = context.aggregateControlAfter ??
      resolveObject(context.objectResolver, receipt.aggregate_control_after_head_ref);
    const indexBefore = receipt.outstanding_action_index_before_head_ref === null ? null :
      (context.outstandingIndexBefore ?? resolveObject(context.objectResolver, receipt.outstanding_action_index_before_head_ref));
    const indexAfter = context.outstandingIndexAfter ??
      resolveObject(context.objectResolver, receipt.outstanding_action_index_after_head_ref);
    const indexBeforeMap = indexBefore === null ? null :
      (context.outstandingActionMapBefore ?? resolveObject(context.objectResolver, indexBefore?.outstanding_action_map_ref));
    const indexAfterMap = context.outstandingActionMapAfter ??
      resolveObject(context.objectResolver, indexAfter?.outstanding_action_map_ref);
    const aggregateBeforeValid = exactResolved(
      receipt.aggregate_control_before_head_ref, aggregateBefore, "cairn.execution_control_state_head.v0.1"
    );
    const aggregateAfterValid = exactResolved(
      receipt.aggregate_control_after_head_ref, aggregateAfter, "cairn.execution_control_state_head.v0.1"
    );
    const indexBeforeValid = receipt.outstanding_action_index_before_head_ref === null
      ? indexBefore === null
      : exactResolved(
        receipt.outstanding_action_index_before_head_ref, indexBefore,
        "cairn.connection_outstanding_action_index_state_head.v0.1"
      );
    const indexAfterValid = exactResolved(
      receipt.outstanding_action_index_after_head_ref, indexAfter,
      "cairn.connection_outstanding_action_index_state_head.v0.1"
    );
    if (!aggregateBeforeValid || !aggregateAfterValid) failures.push("connection_aggregate_control_head_mismatch");
    if (!indexBeforeValid || !indexAfterValid) failures.push("connection_outstanding_index_head_mismatch");
    if (indexBeforeValid && indexBefore !== null) {
      failures.push(...validateConnectionOutstandingIndexHead(indexBefore, {
        ...context,
        outstandingActionMap: indexBeforeMap,
        expectedConnectionStateId: before?.connection_state_id ?? after.connection_state_id
      }).map((code) => `connection_before_${code}`));
    }
    if (indexAfterValid) {
      failures.push(...validateConnectionOutstandingIndexHead(indexAfter, {
        ...context,
        outstandingActionMap: indexAfterMap,
        expectedConnectionStateId: after.connection_state_id
      }).map((code) => `connection_after_${code}`));
    }
    if (aggregateBeforeValid && aggregateAfterValid) {
      const immutable = ["principal_id", "authority_namespace", "control_namespace_generation"];
      if (aggregateBefore.principal_id !== after.principal_id || aggregateAfter.principal_id !== after.principal_id ||
          aggregateBefore.authority_namespace !== after.authority_namespace ||
          aggregateAfter.authority_namespace !== after.authority_namespace ||
          immutable.some((field) => aggregateAfter[field] !== aggregateBefore[field]) ||
          aggregateAfter.sequence !== aggregateBefore.sequence + 1 ||
          aggregateAfter.previous_head_hash !== aggregateBefore.head_hash ||
          aggregateAfter.global_state !== aggregateBefore.global_state ||
          aggregateAfter.global_pause_epoch !== aggregateBefore.global_pause_epoch ||
          aggregateAfter.global_revocation_nonce !== aggregateBefore.global_revocation_nonce ||
          aggregateAfter.scoped_control_head_count !== aggregateBefore.scoped_control_head_count) {
        failures.push("connection_aggregate_control_transition_mismatch");
      }
    }
    if (indexAfterValid) {
      if (indexAfter.connection_state_id !== after.connection_state_id ||
          indexAfter.outstanding_action_index_key !== after.outstanding_action_index_key) {
        failures.push("connection_outstanding_index_identity_mismatch");
      }
      const genesis = receipt.cause === "authorization_genesis";
      if (genesis) {
        if (indexBefore !== null || receipt.outstanding_action_index_before_head_ref !== null ||
            receipt.outstanding_action_index_before_head_hash !== null || indexAfter.sequence !== 0 ||
            indexAfter.previous_state_hash !== null || indexAfter.state !== "active" ||
            indexAfter.outstanding_action_count !== 0 || indexAfterMap?.entry_count !== 0) {
          failures.push("connection_outstanding_index_genesis_mismatch");
        }
      } else if (!indexBeforeValid || indexBefore.connection_state_id !== after.connection_state_id ||
          indexBefore.outstanding_action_index_key !== after.outstanding_action_index_key) {
        failures.push("connection_outstanding_index_identity_mismatch");
      } else if (!sameObjectRef(receipt.outstanding_action_index_before_head_ref,
        receipt.outstanding_action_index_after_head_ref)) {
        if (indexAfter.sequence !== indexBefore.sequence + 1 ||
            indexAfter.previous_state_hash !== indexBefore.head_hash ||
            !((indexBefore.state === "active" && ["active", "sealed"].includes(indexAfter.state)) ||
              (indexBefore.state === "sealed" && indexAfter.state === "sealed"))) {
          failures.push("connection_outstanding_index_transition_mismatch");
        }
      } else if (indexAfter.head_hash !== indexBefore.head_hash) {
        failures.push("connection_outstanding_index_transition_mismatch");
      }
      if (receipt.cause === "principal_control" &&
          (!sameObjectRef(indexBefore?.outstanding_action_map_ref, indexAfter.outstanding_action_map_ref) ||
           indexBefore?.outstanding_action_map_hash !== indexAfter.outstanding_action_map_hash ||
           indexBefore?.outstanding_action_count !== indexAfter.outstanding_action_count ||
           indexBefore?.outstanding_action_root !== indexAfter.outstanding_action_root)) {
        failures.push("connection_outstanding_index_snapshot_changed_entries");
      }
      if (["revoked", "expired"].includes(after.state) && indexAfter.state !== "sealed") {
        failures.push("connection_outstanding_index_terminal_not_sealed");
      }
    }
    const committedAt = Date.parse(receipt.committed_at);
    const receiptSignedAt = Date.parse(receipt.authority_service_signature?.signed_at);
    const beforeTimes = before === null ? [] : [
      Date.parse(before.updated_at), Date.parse(before.authority_service_signature?.signed_at)
    ];
    const aggregateBeforeTimes = aggregateBeforeValid ? [
      Date.parse(aggregateBefore.updated_at), Date.parse(aggregateBefore.authority_service_signature?.signed_at)
    ] : [];
    const indexBeforeTimes = indexBeforeValid && indexBefore !== null ? [
      Date.parse(indexBefore.updated_at), Date.parse(indexBefore.authority_service_signature?.signed_at)
    ] : [];
    const afterEffectiveTimes = [Date.parse(after.updated_at), Date.parse(aggregateAfter?.updated_at)];
    const afterSignatureTimes = [
      Date.parse(after.authority_service_signature?.signed_at),
      Date.parse(aggregateAfter?.authority_service_signature?.signed_at),
      Date.parse(indexAfter?.authority_service_signature?.signed_at)
    ];
    const indexChanged = receipt.outstanding_action_index_before_head_ref === null ||
      !sameObjectRef(receipt.outstanding_action_index_before_head_ref, receipt.outstanding_action_index_after_head_ref);
    if (![committedAt, receiptSignedAt, ...beforeTimes, ...aggregateBeforeTimes, ...indexBeforeTimes,
      ...afterEffectiveTimes, ...afterSignatureTimes, Date.parse(indexAfter?.updated_at)].every(Number.isFinite) ||
        [...beforeTimes, ...aggregateBeforeTimes, ...indexBeforeTimes].some((instant) => instant > committedAt) ||
        afterEffectiveTimes.some((instant) => instant !== committedAt) ||
        (indexChanged ? Date.parse(indexAfter?.updated_at) !== committedAt : Date.parse(indexAfter?.updated_at) > committedAt) ||
        afterSignatureTimes.some((instant) => instant < committedAt || instant > receiptSignedAt) ||
        receiptSignedAt < committedAt) {
      failures.push("connection_event_chronology_invalid");
    }
    if (!exactRef(receipt.connection_after_head_ref, after, context) || receipt.connection_after_head_hash !== after.state_hash) {
      failures.push("connection_after_head_mismatch");
    }
    if (receipt.connection_state_id !== after.connection_state_id || receipt.connection_authorization_hash !== after.connection_authorization_hash) {
      failures.push("connection_identity_mismatch");
    }
    if (!sameObjectRef(receipt.connection_authorization_ref, after.connection_authorization_ref) ||
        receipt.connection_leaf_after_hash !== after.connection_scoped_control_leaf_hash) failures.push("connection_receipt_binding_mismatch");
    if (receipt.cause === "authorization_genesis") {
      if (before !== null || receipt.connection_before_head_ref !== null || receipt.connection_before_head_hash !== null ||
          receipt.expected_connection_sequence_before !== null || receipt.pause_epoch_before !== null || receipt.revocation_nonce_before !== null ||
          receipt.principal_control_authorization_ref !== null || receipt.principal_control_authorization_hash !== null || after.sequence !== 0 ||
          after.previous_state_hash !== null || after.state !== "active" || after.pause_epoch !== 0 || after.revocation_nonce !== 0 ||
          receipt.pause_epoch_after !== 0 || receipt.revocation_nonce_after !== 0) {
        failures.push("connection_genesis_union_mismatch");
      }
    } else {
      if (before === null || !exactRef(receipt.connection_before_head_ref, before, context) || receipt.connection_before_head_hash !== before?.state_hash) {
        failures.push("connection_before_head_mismatch");
      } else {
        const immutable = ["connection_state_id", "principal_id", "connection_authorization_hash", "authority_namespace",
          "connection_scoped_control_key", "outstanding_action_index_key", "accepted_at"];
        if (immutable.some((field) => after[field] !== before[field]) ||
            !sameObjectRef(after.connection_authorization_ref, before.connection_authorization_ref) ||
            !sameObjectRef(after.agent_runtime_binding_ref, before.agent_runtime_binding_ref)) failures.push("connection_immutable_identity_mismatch");
        if (after.sequence !== before.sequence + 1 || receipt.expected_connection_sequence_before !== before.sequence) failures.push("connection_sequence_mismatch");
        if (receipt.pause_epoch_before !== before.pause_epoch || receipt.pause_epoch_after !== after.pause_epoch || after.pause_epoch < before.pause_epoch) failures.push("connection_pause_epoch_mismatch");
        if (receipt.revocation_nonce_before !== before.revocation_nonce || receipt.revocation_nonce_after !== after.revocation_nonce || after.revocation_nonce < before.revocation_nonce) failures.push("connection_revocation_nonce_mismatch");
        if (after.previous_state_hash !== before.state_hash) failures.push("connection_previous_hash_mismatch");
        if (receipt.connection_leaf_before_hash !== before.connection_scoped_control_leaf_hash) failures.push("connection_receipt_binding_mismatch");
      }
      const controlPresent = receipt.principal_control_authorization_ref !== null && receipt.principal_control_authorization_hash !== null;
      if ((receipt.cause === "principal_control") !== controlPresent) failures.push("connection_control_basis_mismatch");
      if (receipt.cause === "principal_control") {
        const controlAuthorization = context.controlAuthorization ??
          resolveObject(context.objectResolver, receipt.principal_control_authorization_ref);
        if (!exactResolved(
          receipt.principal_control_authorization_ref, controlAuthorization,
          "cairn.execution_control_authorization.v0.1"
        ) || validateControlAuthorization(controlAuthorization, context).length ||
            controlAuthorization.principal_id !== after.principal_id || controlAuthorization.scope !== "connection" ||
            controlAuthorization.target_kind !== "object_ref" ||
            !sameObjectRef(controlAuthorization.target_ref, after.connection_authorization_ref) ||
            controlAuthorization.expected_control_head_hash !== aggregateBefore?.head_hash ||
            controlAuthorization.expected_pause_epoch !== before?.pause_epoch ||
            controlAuthorization.expected_revocation_nonce !== before?.revocation_nonce ||
            Date.parse(controlAuthorization.requested_at) > committedAt ||
            committedAt >= Date.parse(controlAuthorization.expires_at)) {
          failures.push("connection_control_authorization_mismatch");
        }
        const controlReceipt = context.controlReceipt ??
          resolveObject(context.connectionControlReceiptResolver, objectRef(receipt, context));
        if (!controlReceipt || controlReceipt.schema !== "cairn.execution_control_receipt.v0.1" ||
            validatePhase1Object(controlReceipt, context).length || controlReceipt.cause !== "connection_joint_control" ||
            !exactRef(controlReceipt.connection_state_event_receipt_ref, receipt, context) ||
            !exactRef(controlReceipt.control_authorization_ref, controlAuthorization, context) ||
            !exactRef(controlReceipt.before_control_head_ref, aggregateBefore, context) ||
            !exactRef(controlReceipt.after_control_head_ref, aggregateAfter, context) ||
            !sameObjectRef(controlReceipt.before_scoped_control_map_ref, aggregateBefore?.scoped_control_map_ref) ||
            controlReceipt.before_scoped_control_map_hash !== aggregateBefore?.scoped_control_map_hash ||
            !sameObjectRef(controlReceipt.after_scoped_control_map_ref, aggregateAfter?.scoped_control_map_ref) ||
            controlReceipt.after_scoped_control_map_hash !== aggregateAfter?.scoped_control_map_hash ||
            !sameObjectRef(controlReceipt.outstanding_action_index_head_ref,
              receipt.outstanding_action_index_after_head_ref) ||
            controlReceipt.authority_transaction_id !== receipt.authority_transaction_id ||
            controlReceipt.committed_at !== receipt.committed_at) {
          failures.push("connection_joint_control_receipt_mismatch");
        } else {
          const leafBefore = resolveObject(context.objectResolver, controlReceipt.scoped_leaf_before_ref);
          const leafAfter = resolveObject(context.objectResolver, controlReceipt.scoped_leaf_after_ref);
          failures.push(...jointConnectionControlPairFailures(
            controlReceipt, receipt, controlAuthorization, before, after,
            leafBefore, leafAfter, indexAfter, context
          ).map((code) => `connection_${code}`));
          if (!exactResolved(
            controlReceipt.scoped_leaf_before_ref, leafBefore,
            "cairn.scoped_execution_control_leaf_state_head.v0.1"
          ) || !exactResolved(
            controlReceipt.scoped_leaf_after_ref, leafAfter,
            "cairn.scoped_execution_control_leaf_state_head.v0.1"
          ) || leafBefore.scoped_control_leaf_key !== before.connection_scoped_control_key ||
              leafAfter.scoped_control_leaf_key !== after.connection_scoped_control_key ||
              leafBefore.principal_id !== after.principal_id || leafAfter.principal_id !== after.principal_id ||
              leafBefore.scope !== "connection" || leafAfter.scope !== "connection" ||
              !sameObjectRef(leafBefore.target_ref, after.connection_authorization_ref) ||
              !sameObjectRef(leafAfter.target_ref, after.connection_authorization_ref) ||
              leafBefore.head_hash !== receipt.connection_leaf_before_hash ||
              leafAfter.head_hash !== receipt.connection_leaf_after_hash ||
              leafAfter.sequence !== leafBefore.sequence + 1 || leafAfter.previous_state_hash !== leafBefore.head_hash ||
              leafAfter.pause_epoch !== after.pause_epoch || leafAfter.revocation_nonce !== after.revocation_nonce) {
            failures.push("connection_scoped_control_leaf_mismatch");
          } else {
            const actionMatches = (controlAuthorization.control_action === "pause" && leafAfter.state === "paused" && after.state === "paused") ||
              (controlAuthorization.control_action === "resume" && leafAfter.state === "active" && after.state === "active") ||
              (controlAuthorization.control_action === "revoke" && leafAfter.state === "revoked" && after.state === "revoked") ||
              (controlAuthorization.control_action === "freeze_new_redemptions" &&
                leafAfter.state === "frozen_new_redemptions" && after.state === before.state);
            if (!actionMatches) failures.push("connection_control_action_edge_mismatch");
          }
        }
      }
      if (["revoked", "expired"].includes(before?.state)) failures.push("connection_terminal_reactivation");
      if (receipt.cause === "authority_time_expiry") {
        if (!["active", "paused"].includes(before?.state) || after.state !== "expired" ||
            after.pause_epoch !== before.pause_epoch || after.revocation_nonce !== before.revocation_nonce) failures.push("connection_expiry_edge_invalid");
      } else if (receipt.cause === "principal_control") {
        const edge = `${before?.state}->${after.state}`;
        if (!["active->paused", "paused->active", "active->revoked", "paused->revoked", "active->active", "paused->paused"].includes(edge)) {
          failures.push("connection_control_edge_invalid");
        } else if (edge === "active->paused" || edge === "paused->active") {
          if (after.pause_epoch !== before.pause_epoch + 1 || after.revocation_nonce !== before.revocation_nonce) failures.push("connection_control_epoch_invalid");
        } else if (after.state === "revoked") {
          if (after.revocation_nonce !== before.revocation_nonce + 1 || after.pause_epoch !== before.pause_epoch) failures.push("connection_control_epoch_invalid");
        } else if (after.pause_epoch !== before.pause_epoch || after.revocation_nonce !== before.revocation_nonce ||
                   after.connection_scoped_control_leaf_hash === before.connection_scoped_control_leaf_hash) {
          failures.push("connection_control_epoch_invalid");
        }
      }
    }
    const indexChangedForReceipt = receipt.outstanding_action_index_before_head_ref === null ||
      !sameObjectRef(receipt.outstanding_action_index_before_head_ref, receipt.outstanding_action_index_after_head_ref);
    if (indexChangedForReceipt) {
      const indexTransition = context.outstandingIndexTransitionReceipt ??
        resolveObject(context.outstandingIndexTransitionResolver, receipt.outstanding_action_index_after_head_ref);
      const expectedCause = receipt.cause === "authorization_genesis"
        ? "connection_genesis"
        : (["revoked", "expired"].includes(after.state)
          ? "connection_terminal_seal" : "connection_restriction_snapshot");
      const nullChangeFields = [
        "changed_action_key", "changed_entry_before_ref", "changed_entry_before_hash",
        "changed_entry_after_ref", "changed_entry_after_hash", "terminal_evidence_ref", "terminal_evidence_hash"
      ];
      if (!indexTransition ||
          indexTransition.schema !== "cairn.connection_outstanding_action_index_transition_receipt.v0.1" ||
          validatePhase1Object(indexTransition, context).length ||
          validateConnectionOutstandingIndexTransitionReceipt(indexTransition, context).length ||
          indexTransition.outstanding_action_index_key !== after.outstanding_action_index_key ||
          indexTransition.cause !== expectedCause ||
          canonicalHash(indexTransition.before_head_ref) !== canonicalHash(receipt.outstanding_action_index_before_head_ref) ||
          canonicalHash(indexTransition.before_head_hash) !== canonicalHash(receipt.outstanding_action_index_before_head_hash) ||
          !exactRef(indexTransition.after_head_ref, indexAfter, context) ||
          canonicalHash(indexTransition.before_action_map_ref) !== canonicalHash(indexBefore?.outstanding_action_map_ref ?? null) ||
          canonicalHash(indexTransition.before_action_map_hash) !== canonicalHash(indexBefore?.outstanding_action_map_hash ?? null) ||
          !sameObjectRef(indexTransition.after_action_map_ref, indexAfter?.outstanding_action_map_ref) ||
          indexTransition.after_action_map_hash !== indexAfter?.outstanding_action_map_hash ||
          nullChangeFields.some((field) => indexTransition[field] !== null) ||
          indexTransition.authority_transaction_id !== receipt.authority_transaction_id ||
          indexTransition.committed_at !== receipt.committed_at ||
          Date.parse(indexTransition.authority_service_signature?.signed_at) < committedAt ||
          Date.parse(indexTransition.authority_service_signature?.signed_at) > receiptSignedAt) {
        failures.push("connection_outstanding_index_transition_receipt_mismatch");
      }
    }
    return unique(failures);
  } catch {
    return ["connection_event_malformed"];
  }
}

const amount = (money) => money?.amount_minor;
const asset = (money) => money?.asset;

export function validateCompartmentDefinition(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    const root = [value.provider_sublimit_identity_head_ref, value.provider_sublimit_identity_head_hash,
      value.provider_sublimit_identity_trust_overlay_head_ref, value.provider_sublimit_identity_trust_overlay_head_hash,
      value.provider_sublimit_id, value.disjoint_sublimit_proof_ref, value.sublimit_generation];
    if (!(root.every(isNull) || root.every((item) => item !== null))) failures.push("compartment_sublimit_union_mismatch");
    const monies = [value.configured_ceiling, value.per_action_ceiling, value.lifetime_limit, value.outstanding_exposure_limit,
      ...value.window_limits.map(({ amount_minor, asset: itemAsset }) => ({ amount_minor, asset: itemAsset }))];
    if (monies.some((item) => asset(item) !== value.accounting_asset)) failures.push("compartment_asset_mismatch");
    if (amount(value.per_action_ceiling) > amount(value.outstanding_exposure_limit) ||
        amount(value.outstanding_exposure_limit) > amount(value.configured_ceiling)) failures.push("compartment_limit_order_invalid");
    const attestation = resolveObject(context.objectResolver, value.protection_attestation_ref);
    if (!attestation || attestation.schema !== "cairn.compartment_protection_attestation.v0.1" ||
        value.protection_attestation_ref.object_hash !== attestation.attestation_hash ||
        attestation.asset !== value.accounting_asset) {
      failures.push("compartment_protection_attestation_mismatch");
    } else if (!attestation.enforced_cap || attestation.enforced_cap.asset !== value.accounting_asset ||
               amount(value.configured_ceiling) > amount(attestation.enforced_cap)) {
      failures.push("compartment_ceiling_exceeds_enforced_cap");
    }
    failures.push("phase1_external_protection_attestation_unsupported");
    if (Date.parse(value.not_before) >= Date.parse(value.expires_at)) failures.push("compartment_interval_invalid");
    return unique(failures);
  } catch {
    return ["compartment_definition_malformed"];
  }
}

export function validateCompartmentStateHead(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    if ((value.sequence === 0) !== (value.previous_state_hash === null) ||
        (value.state === "frozen") !== (value.pre_freeze_state !== null)) {
      failures.push("compartment_state_union_mismatch");
    }
    const compartment = resolveObject(context.objectResolver, value.compartment_ref);
    const compartmentDefinitionFailures = compartment
      ? validateCompartmentDefinition(compartment, context) : [];
    if (compartmentDefinitionFailures.includes("phase1_external_protection_attestation_unsupported")) {
      failures.push("phase1_external_protection_attestation_unsupported");
    }
    if (!compartment || !exactRef(value.compartment_ref, compartment, context) ||
        compartmentDefinitionFailures.some((code) => code !== "phase1_external_protection_attestation_unsupported") ||
        (context.requireDependencySignatures === true && validateResolvedSignedObject(compartment, context).length) ||
        value.economic_resource_key !== compartment.economic_resource_key ||
        value.compartment_control_key !== compartment.compartment_control_key ||
        value.authority_ledger_namespace !== compartment.authority_ledger_namespace) {
      failures.push("compartment_state_definition_mismatch");
    }
    const manifestChecks = [
      [value.active_reservation_manifest_ref, value.active_reservation_manifest_hash,
        value.active_reservation_count, value.active_reservations_root, "compartment_active_reservation"],
      [value.current_economic_atom_manifest_ref, value.current_economic_atom_manifest_hash,
        value.current_economic_atom_count, null, "compartment_economic_atom"],
      [value.confirmed_event_manifest_ref, value.confirmed_event_manifest_hash,
        value.confirmed_event_count, null, "compartment_confirmed_event"]
    ];
    const resolvedMaps = new Map();
    for (const [reference, hash, count, entriesRoot, mapDomain] of manifestChecks) {
      const manifest = resolveObject(context.objectResolver, reference);
      const mapFailures = manifest ? validateEnumerableMapRoot(
        manifest, { ...context, expectedMapDomain: mapDomain }
      ) : [];
      if (mapFailures.includes("phase1_external_accounting_leaf_unsupported")) {
        failures.push("phase1_external_accounting_leaf_unsupported");
      }
      if (!manifest || manifest.schema !== "cairn.enumerable_map_root.v0.1" ||
          !exactRef(reference, manifest, context) || hash !== manifest.map_hash ||
          mapFailures.some((code) => code !== "phase1_external_accounting_leaf_unsupported") ||
          manifest.entry_count !== count ||
          (entriesRoot !== null && manifest.entries_root !== entriesRoot) ||
          (context.requireDependencySignatures === true && validateResolvedSignedObject(manifest, context).length)) {
        failures.push("compartment_state_manifest_mismatch");
      } else {
        resolvedMaps.set(mapDomain, manifest);
      }
    }
    const accountingAsset = compartment?.accounting_asset;
    for (const money of [value.receiver_backed_available, value.cairn_reserved, value.confirmed_spent,
      value.confirmed_refunded, value.confirmed_reversal_loss, value.outstanding_reversal_exposure,
      value.quarantine_exposure].filter((item) => item !== null)) {
      if (money.asset !== accountingAsset) failures.push("compartment_state_asset_mismatch");
    }
    const reservationMap = resolvedMaps.get("compartment_active_reservation");
    const atomMap = resolvedMaps.get("compartment_economic_atom");
    const eventMap = resolvedMaps.get("compartment_confirmed_event");
    const reservationResolution = reservationMap
      ? resolveEnumerableMapEntries(reservationMap, "compartment_active_reservation", context)
      : { entries: [], failures: ["compartment_state_reservation_map_unresolved"] };
    const atomResolution = atomMap
      ? resolveEnumerableMapEntries(atomMap, "compartment_economic_atom", context)
      : { entries: [], failures: ["compartment_state_atom_map_unresolved"] };
    const eventResolution = eventMap
      ? resolveEnumerableMapEntries(eventMap, "compartment_confirmed_event", context)
      : { entries: [], failures: ["compartment_state_event_map_unresolved"] };
    if (reservationResolution.failures.length || atomResolution.failures.length || eventResolution.failures.length) {
      failures.push("compartment_state_accounting_map_unresolved");
    } else {
      const reservationEntries = reservationResolution.entries;
      const atomEntries = atomResolution.entries;
      const eventEntries = eventResolution.entries;
      if (reservationEntries.some(({ object }) => object?.compartment_control_key !== value.compartment_control_key) ||
          atomEntries.some(({ object }) => object?.economic_resource_key !== value.economic_resource_key ||
          object?.compartment_control_key !== value.compartment_control_key ||
          object?.amount?.asset !== accountingAsset) ||
          eventEntries.some(({ object }) => object?.economic_resource_key !== value.economic_resource_key ||
          object?.compartment_control_key !== value.compartment_control_key ||
          object?.amount?.asset !== accountingAsset)) {
        failures.push("compartment_state_accounting_entry_mismatch");
      }
      const reservedAtoms = atomEntries.filter(({ object }) => object?.ledger_class === "reserved");
      let reservationClosureMismatch = false;
      for (const atomEntry of reservedAtoms) {
        const matches = reservationEntries.filter(({ object }) =>
          object?.authority_reservation_ref?.object_id === atomEntry.object?.obligation_or_reservation_id &&
          object?.reservation_fence === atomEntry.object?.reservation_fence &&
          object?.compartment_control_key === value.compartment_control_key);
        if (matches.length !== 1) reservationClosureMismatch = true;
      }
      for (const { object: reservation } of reservationEntries) {
        const held = reservedAtoms.filter(({ object }) =>
          object?.obligation_or_reservation_id === reservation?.authority_reservation_ref?.object_id &&
          object?.reservation_fence === reservation?.reservation_fence);
        if (held.length === 0 ||
            reservation?.held_atom_ids_root !== currentReservationHeldAtomsRoot(reservation, atomEntries)) {
          reservationClosureMismatch = true;
        }
      }
      if (reservationClosureMismatch) {
        failures.push("compartment_state_reservation_atom_closure_mismatch");
      }
      const atomClasses = new Map([
        ["reserved", ["cairn_reserved", "active_hold_atoms_root"]],
        ["active_reversal", ["outstanding_reversal_exposure", "active_reversal_atoms_root"]],
        ["quarantine_hold", ["quarantine_exposure", "quarantine_hold_atoms_root"]]
      ]);
      for (const [ledgerClass, [amountField, rootField]] of atomClasses) {
        const subset = atomEntries.filter(({ object }) => object?.ledger_class === ledgerClass);
        const total = checkedAmountSum(subset);
        if (total === null || amount(value[amountField]) !== total) {
          failures.push("compartment_state_atom_accounting_mismatch", `compartment_state_atom_accounting_mismatch:${ledgerClass}`);
        }
        if (value[rootField] !== compartmentEconomicAtomSubsetRoot(ledgerClass, atomEntries)) {
          failures.push("compartment_state_atom_accounting_mismatch", `compartment_state_atom_subset_root_mismatch:${ledgerClass}`);
        }
      }
      const eventKinds = new Map([
        ["confirmed_debit", ["confirmed_spent", "confirmed_spend_events_root"]],
        ["confirmed_refund", ["confirmed_refunded", "confirmed_refund_events_root"]],
        ["confirmed_reversal", ["confirmed_reversal_loss", "confirmed_reversal_events_root"]]
      ]);
      for (const [eventKind, [amountField, rootField]] of eventKinds) {
        const subset = eventEntries.filter(({ object }) => object?.event_kind === eventKind);
        const total = checkedAmountSum(subset);
        if (total === null || amount(value[amountField]) !== total) {
          failures.push("compartment_state_event_accounting_mismatch", `compartment_state_event_accounting_mismatch:${eventKind}`);
        }
        if (value[rootField] !== compartmentConfirmedEventSubsetRoot(eventKind, eventEntries)) {
          failures.push("compartment_state_event_accounting_mismatch", `compartment_state_event_subset_root_mismatch:${eventKind}`);
        }
      }
      const outstanding = amount(value.cairn_reserved) + amount(value.outstanding_reversal_exposure) +
        amount(value.quarantine_exposure);
      if (!Number.isSafeInteger(outstanding) || outstanding < 0 ||
          (value.state !== "frozen" && (outstanding > amount(compartment?.outstanding_exposure_limit) ||
            outstanding > amount(compartment?.configured_ceiling)))) {
        failures.push("compartment_state_outstanding_limit_exceeded");
      }
    }
    if (value.sequence === 0) {
      if (value.fencing_token !== 0) failures.push("compartment_state_genesis_mismatch");
    } else {
      const predecessorRef = {
        schema: value.schema, object_id: value.compartment_state_id,
        object_hash: value.previous_state_hash
      };
      const predecessor = typeof context.statePredecessorResolver === "function"
        ? context.statePredecessorResolver(predecessorRef) : resolveObject(context.objectResolver, predecessorRef);
      if (!predecessor || !exactRef(predecessorRef, predecessor, context) ||
          (context.requireDependencySignatures === true && validateResolvedSignedObject(predecessor, context).length) ||
          predecessor.compartment_state_id !== value.compartment_state_id ||
          !sameObjectRef(predecessor.compartment_ref, value.compartment_ref) ||
          predecessor.economic_resource_key !== value.economic_resource_key ||
          predecessor.compartment_control_key !== value.compartment_control_key ||
          predecessor.authority_ledger_namespace !== value.authority_ledger_namespace ||
          value.sequence !== predecessor.sequence + 1 || value.fencing_token < predecessor.fencing_token ||
          Date.parse(value.observed_at) < Date.parse(predecessor.observed_at)) {
        failures.push("compartment_state_predecessor_mismatch");
      }
    }
    return unique(failures);
  } catch {
    return ["compartment_state_head_malformed"];
  }
}

export function validateCompartmentStateTransitionReceipt(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    failures.push(...refHashPairFailures(value, [
      ["economic_mutation_cause_core_ref", "economic_mutation_cause_core_hash"],
      ["before_head_ref", "before_head_hash"], ["after_head_ref", "after_head_hash"],
      ["reservation_manifest_before_ref", "reservation_manifest_before_hash"],
      ["reservation_manifest_after_ref", "reservation_manifest_after_hash"],
      ["economic_atom_manifest_before_ref", "economic_atom_manifest_before_hash"],
      ["economic_atom_manifest_after_ref", "economic_atom_manifest_after_hash"],
      ["confirmed_event_manifest_before_ref", "confirmed_event_manifest_before_hash"],
      ["confirmed_event_manifest_after_ref", "confirmed_event_manifest_after_hash"],
      ["economic_atom_delta_manifest_ref", "economic_atom_delta_manifest_hash"]
    ], "compartment_transition_ref_hash_mismatch"));
    const before = value.before_head_ref === null ? null : resolveObject(context.objectResolver, value.before_head_ref);
    const after = resolveObject(context.objectResolver, value.after_head_ref);
    const beforeHeadFailures = before === null ? [] : validateCompartmentStateHead(before, context);
    const afterHeadFailures = after === null ? [] : validateCompartmentStateHead(after, context);
    for (const code of ["phase1_external_protection_attestation_unsupported",
      "phase1_external_accounting_leaf_unsupported"]) {
      if (beforeHeadFailures.includes(code) || afterHeadFailures.includes(code)) failures.push(code);
    }
    const unavailableHeadCodes = new Set([
      "phase1_external_protection_attestation_unsupported", "phase1_external_accounting_leaf_unsupported"
    ]);
    if ((before === null) !== (value.cause === "onboard") ||
        (before !== null && (!exactRef(value.before_head_ref, before, context) ||
          beforeHeadFailures.some((code) => !unavailableHeadCodes.has(code)))) ||
        !after || !exactRef(value.after_head_ref, after, context) ||
        afterHeadFailures.some((code) => !unavailableHeadCodes.has(code)) || after.compartment_control_key !== value.compartment_control_key ||
        (before === null ? (after.sequence !== 0 || after.previous_state_hash !== null) :
          (after.sequence !== before.sequence + 1 || after.previous_state_hash !== before.state_hash ||
           after.compartment_control_key !== before.compartment_control_key ||
           after.compartment_state_id !== before.compartment_state_id ||
           !sameObjectRef(after.compartment_ref, before.compartment_ref) ||
           after.economic_resource_key !== before.economic_resource_key ||
           after.authority_ledger_namespace !== before.authority_ledger_namespace))) {
      failures.push("compartment_transition_head_mismatch");
    }
    const causeCore = resolveObject(context.objectResolver, value.economic_mutation_cause_core_ref);
    const expectedCoreCause = value.cause === "onboard" ? "compartment_onboarded" : value.cause;
    if (!exactExternalObject(value.economic_mutation_cause_core_ref, causeCore,
      "cairn.economic_mutation_cause_core.v0.1", context, "core_hash", ["economic_mutation_id"]) ||
        causeCore.cause_kind !== expectedCoreCause ||
        causeCore.economic_resource_key !== after?.economic_resource_key ||
        causeCore.authority_transaction_id !== value.authority_transaction_id ||
        canonicalHash(causeCore.before_compartment_heads ?? []) !== canonicalHash(before === null ? [] : [{
          compartment_control_key: before.compartment_control_key,
          head_ref: value.before_head_ref,
          head_hash: value.before_head_hash
        }])) {
      failures.push("compartment_transition_cause_core_mismatch");
    }
    const deltaManifest = resolveObject(context.objectResolver, value.economic_atom_delta_manifest_ref);
    if (!deltaManifest || deltaManifest.schema !== "cairn.enumerable_transition_manifest.v0.1" ||
        !exactRef(value.economic_atom_delta_manifest_ref, deltaManifest, context) ||
        validateTransitionManifest(deltaManifest, context).length ||
        (context.requireDependencySignatures === true && validateResolvedSignedObject(deltaManifest, context).length) ||
        deltaManifest.manifest_kind !== "compartment_economic_atom_deltas" ||
        !sameObjectRef(deltaManifest.subject_ref, value.economic_mutation_cause_core_ref) ||
        deltaManifest.subject_hash !== value.economic_mutation_cause_core_hash ||
        deltaManifest.authority_transaction_id !== value.authority_transaction_id) {
      failures.push("compartment_transition_delta_manifest_mismatch");
    }
    const deltaEntries = [];
    if (deltaManifest?.manifest_kind === "compartment_economic_atom_deltas") {
      for (const manifestEntry of deltaManifest.sorted_entries) {
        const delta = resolveObject(context.objectResolver, manifestEntry.entry_object_ref);
        if (manifestEntry.entry_kind !== "economic_atom_delta" ||
            !exactExternalObject(
              manifestEntry.entry_object_ref, delta, "cairn.economic_atom_delta_entry.v0.1",
              context, "entry_hash", ["atom_id"]
            ) || manifestEntry.entry_object_hash !== delta?.entry_hash ||
            delta.economic_resource_key !== after?.economic_resource_key ||
            delta.compartment_control_key !== value.compartment_control_key ||
            !sameObjectRef(delta.economic_mutation_cause_core_ref, value.economic_mutation_cause_core_ref) ||
            delta.economic_mutation_cause_core_hash !== value.economic_mutation_cause_core_hash ||
            delta.authority_transaction_id !== value.authority_transaction_id ||
            delta.amount?.asset !== compartmentAssetForState(after, context)) {
          failures.push("compartment_transition_delta_entry_mismatch");
        } else deltaEntries.push(delta);
      }
      const semanticDeltas = deltaEntries.map(({ atom_id, before_class, after_class, amount: deltaAmount }) => ({
        atom_id, before_class, after_class, amount: deltaAmount
      }));
      if (causeCore?.proposed_semantic_atom_deltas_root !== canonicalHash(semanticDeltas)) {
        failures.push("compartment_transition_cause_delta_root_mismatch");
      }
    }
    const resolveSnapshot = (reference, domain) => {
      if (reference === null) return { entries: new Map(), failures: [] };
      const root = resolveObject(context.objectResolver, reference);
      if (!root || root.schema !== "cairn.enumerable_map_root.v0.1" || !exactRef(reference, root, context)) {
        return { entries: new Map(), failures: ["root_unresolved"] };
      }
      const resolved = resolveEnumerableMapEntries(root, domain, context);
      return {
        entries: new Map(resolved.entries.map((entry) => [entry.leaf.entry_key, entry])),
        failures: resolved.failures
      };
    };
    const atomBeforeSnapshot = resolveSnapshot(value.economic_atom_manifest_before_ref, "compartment_economic_atom");
    const atomAfterSnapshot = resolveSnapshot(value.economic_atom_manifest_after_ref, "compartment_economic_atom");
    if (atomBeforeSnapshot.failures.length || atomAfterSnapshot.failures.length) {
      failures.push("compartment_transition_atom_map_unresolved");
    } else {
      const changedAtomKeys = [...new Set([
        ...atomBeforeSnapshot.entries.keys(), ...atomAfterSnapshot.entries.keys()
      ])].filter((key) => atomBeforeSnapshot.entries.get(key)?.leaf.entry_object_hash !==
        atomAfterSnapshot.entries.get(key)?.leaf.entry_object_hash).sort();
      const deltaByAtom = new Map();
      for (const delta of deltaEntries) {
        if (deltaByAtom.has(delta.atom_id)) failures.push("compartment_transition_duplicate_atom_delta");
        deltaByAtom.set(delta.atom_id, delta);
      }
      if (canonicalHash(changedAtomKeys) !== canonicalHash([...deltaByAtom.keys()].sort())) {
        failures.push("compartment_transition_atom_delta_keyset_mismatch");
      }
      for (const atomId of changedAtomKeys) {
        const beforeAtom = atomBeforeSnapshot.entries.get(atomId)?.object ?? null;
        const afterAtom = atomAfterSnapshot.entries.get(atomId)?.object ?? null;
        const delta = deltaByAtom.get(atomId);
        const amountObject = beforeAtom?.amount ?? afterAtom?.amount;
        if (!delta || delta.before_class !== (beforeAtom?.ledger_class ?? "absent") ||
            delta.after_class !== (afterAtom?.ledger_class ?? "absent") ||
            canonicalHash(delta.amount) !== canonicalHash(amountObject) ||
            (beforeAtom && afterAtom && (["atom_id", "economic_resource_key", "compartment_control_key",
              "obligation_or_reservation_id", "component_id", "reservation_fence"].some((field) =>
              canonicalHash(beforeAtom[field]) !== canonicalHash(afterAtom[field])) ||
              canonicalHash(beforeAtom.amount) !== canonicalHash(afterAtom.amount)))) {
          failures.push("compartment_transition_atom_delta_mismatch");
        }
      }
    }
    const reservationBeforeSnapshot = resolveSnapshot(
      value.reservation_manifest_before_ref, "compartment_active_reservation"
    );
    const reservationAfterSnapshot = resolveSnapshot(
      value.reservation_manifest_after_ref, "compartment_active_reservation"
    );
    if (reservationBeforeSnapshot.failures.length || reservationAfterSnapshot.failures.length) {
      failures.push("compartment_transition_reservation_map_unresolved");
    } else {
      const reservationKeys = [...new Set([
        ...reservationBeforeSnapshot.entries.keys(), ...reservationAfterSnapshot.entries.keys()
      ])];
      const immutableReservationFields = [
        "reservation_index_key", "compartment_control_key", "authority_reservation_ref",
        "authority_reservation_hash", "action_ref", "effect_id", "lineage_id", "reservation_fence"
      ];
      for (const key of reservationKeys) {
        const beforeEntry = reservationBeforeSnapshot.entries.get(key);
        const afterEntry = reservationAfterSnapshot.entries.get(key);
        const beforeReservation = beforeEntry?.object ?? null;
        const afterReservation = afterEntry?.object ?? null;
        if (beforeReservation && afterReservation && immutableReservationFields.some((field) =>
          canonicalHash(beforeReservation[field]) !== canonicalHash(afterReservation[field]))) {
          failures.push("compartment_transition_reservation_provenance_mismatch");
          continue;
        }
        if (beforeEntry?.leaf.entry_object_hash === afterEntry?.leaf.entry_object_hash) continue;
        const relevantDeltas = deltaEntries.filter((delta) => {
          const reservation = afterReservation ?? beforeReservation;
          return reservation && delta.obligation_or_reservation_id === reservation.authority_reservation_ref?.object_id &&
            [
              atomBeforeSnapshot.entries.get(delta.atom_id)?.object?.reservation_fence,
              atomAfterSnapshot.entries.get(delta.atom_id)?.object?.reservation_fence
            ].includes(reservation.reservation_fence) &&
            (delta.before_class === "reserved" || delta.after_class === "reserved");
        });
        if (relevantDeltas.length === 0 ||
            (!beforeReservation && !relevantDeltas.some((delta) => delta.after_class === "reserved")) ||
            (!afterReservation && !relevantDeltas.some((delta) => delta.before_class === "reserved"))) {
          failures.push("compartment_transition_reservation_change_unexplained");
        }
      }
    }
    const eventBeforeSnapshot = resolveSnapshot(value.confirmed_event_manifest_before_ref, "compartment_confirmed_event");
    const eventAfterSnapshot = resolveSnapshot(value.confirmed_event_manifest_after_ref, "compartment_confirmed_event");
    if (eventBeforeSnapshot.failures.length || eventAfterSnapshot.failures.length) {
      failures.push("compartment_transition_event_map_unresolved");
    } else {
      const insertedEvents = [];
      let invalidEventChange = false;
      for (const [key, beforeEntry] of eventBeforeSnapshot.entries) {
        const afterEntry = eventAfterSnapshot.entries.get(key);
        if (!afterEntry || afterEntry.leaf.entry_object_hash !== beforeEntry.leaf.entry_object_hash) invalidEventChange = true;
      }
      for (const [key, afterEntry] of eventAfterSnapshot.entries) {
        if (!eventBeforeSnapshot.entries.has(key)) insertedEvents.push(afterEntry);
      }
      const expectedEventKind = new Map([
        ["receiver_debit", "confirmed_debit"], ["refund", "confirmed_refund"],
        ["reversal", "confirmed_reversal"]
      ]).get(value.cause);
      if (invalidEventChange ||
          (expectedEventKind === undefined && insertedEvents.length !== 0) ||
          (expectedEventKind !== undefined &&
            (insertedEvents.length === 0 || insertedEvents.some(({ object }) => object?.event_kind !== expectedEventKind)))) {
        failures.push("compartment_transition_confirmed_event_diff_mismatch");
      }
      if (expectedEventKind !== undefined) {
        const relevantDeltas = deltaEntries.filter((delta) => delta.after_class === expectedEventKind);
        const grouped = new Map();
        for (const delta of relevantDeltas) {
          const afterAtom = atomAfterSnapshot.entries.get(delta.atom_id)?.object;
          const group = grouped.get(delta.obligation_or_reservation_id) ?? [];
          group.push({ delta, afterAtom });
          grouped.set(delta.obligation_or_reservation_id, group);
        }
        const unmatchedEvents = new Set(insertedEvents);
        let correlationInvalid = grouped.size !== insertedEvents.length;
        for (const [obligationId, group] of grouped) {
          const expectedAmount = checkedAmountSum(group.map(({ delta }) => ({
            object: { amount: delta.amount }
          })));
          const expectedComponentRoot = compartmentConfirmedEventComponentRoot(
            group.map(({ afterAtom }) => afterAtom?.component_id).filter(Boolean)
          );
          const matches = insertedEvents.filter(({ object }) =>
            object?.event_kind === expectedEventKind &&
            object?.obligation_exposure_id === obligationId &&
            object?.component_ids_root === expectedComponentRoot &&
            object?.amount?.asset === compartmentAssetForState(after, context) &&
            amount(object?.amount) === expectedAmount);
          if (expectedAmount === null || matches.length !== 1 || group.some(({ afterAtom }) => !afterAtom)) {
            correlationInvalid = true;
          } else unmatchedEvents.delete(matches[0]);
        }
        if (correlationInvalid || unmatchedEvents.size !== 0) {
          failures.push("compartment_transition_confirmed_event_correlation_mismatch");
        }
      }
    }
    const headManifestPairs = [
      ["reservation_manifest", "active_reservation_manifest_ref", "active_reservation_manifest_hash"],
      ["economic_atom_manifest", "current_economic_atom_manifest_ref", "current_economic_atom_manifest_hash"],
      ["confirmed_event_manifest", "confirmed_event_manifest_ref", "confirmed_event_manifest_hash"]
    ];
    for (const [prefix, refField, hashField] of headManifestPairs) {
      const beforeRef = value[`${prefix}_before_ref`];
      const beforeHash = value[`${prefix}_before_hash`];
      const afterRef = value[`${prefix}_after_ref`];
      const afterHash = value[`${prefix}_after_hash`];
      if ((before === null
        ? beforeRef !== null || beforeHash !== null
        : !sameObjectRef(beforeRef, before[refField]) || beforeHash !== before[hashField]) ||
          !sameObjectRef(afterRef, after?.[refField]) || afterHash !== after?.[hashField]) {
        failures.push("compartment_transition_manifest_projection_mismatch");
      }
    }
    const ordinary = new Set(["reservation_hold", "reservation_release", "role_transfer",
      "receiver_debit", "refund", "reversal"]);
    const restrictive = new Set(["unexpected_reversal", "unexpected_cancellation_charge",
      "trust_quarantine", "historical_incident_overlay_add"]);
    if ((value.cause === "onboard" && (before !== null || !["pending", "active"].includes(after?.state))) ||
        (ordinary.has(value.cause) &&
          (!before || !["active", "exhausted"].includes(before.state) ||
           !["active", "exhausted"].includes(after?.state))) ||
        (restrictive.has(value.cause) &&
          (!before || after?.state !== "frozen" ||
           (value.cause === "historical_incident_overlay_add" && before.state !== "closed"))) ||
        (value.cause === "remediation" &&
          (before?.state !== "frozen" || !["frozen", "active", "closed"].includes(after?.state))) ||
        (["close", "expire"].includes(value.cause) && (!before || after?.state !== "closed"))) {
      failures.push("compartment_transition_cause_state_mismatch");
    }
    if (before !== null) {
      const beforeReserved = amount(before.cairn_reserved);
      const afterReserved = amount(after?.cairn_reserved);
      const monotonicChecks = new Map([
        ["reservation_hold", afterReserved >= beforeReserved],
        ["reservation_release", afterReserved <= beforeReserved],
        ["receiver_debit", afterReserved <= beforeReserved &&
          amount(after?.confirmed_spent) >= amount(before.confirmed_spent)],
        ["refund", amount(after?.confirmed_refunded) >= amount(before.confirmed_refunded)],
        ["reversal", amount(after?.outstanding_reversal_exposure) >= amount(before.outstanding_reversal_exposure)],
        ["unexpected_reversal", amount(after?.quarantine_exposure) >= amount(before.quarantine_exposure)],
        ["unexpected_cancellation_charge", amount(after?.quarantine_exposure) >= amount(before.quarantine_exposure)],
        ["trust_quarantine", amount(after?.quarantine_exposure) >= amount(before.quarantine_exposure)]
      ]);
      if (monotonicChecks.has(value.cause) && monotonicChecks.get(value.cause) !== true) {
        failures.push("compartment_transition_economic_direction_mismatch");
      }
      const classField = new Map([
        ["reserved", "cairn_reserved"], ["confirmed_debit", "confirmed_spent"],
        ["confirmed_refund", "confirmed_refunded"], ["confirmed_reversal", "confirmed_reversal_loss"],
        ["active_reversal", "outstanding_reversal_exposure"], ["quarantine_hold", "quarantine_exposure"]
      ]);
      const projectedDeltas = new Map([...new Set(classField.values())].map((field) => [field, 0]));
      for (const delta of deltaEntries) {
        const beforeField = classField.get(delta.before_class);
        const afterField = classField.get(delta.after_class);
        if (beforeField) projectedDeltas.set(beforeField, projectedDeltas.get(beforeField) - amount(delta.amount));
        if (afterField) projectedDeltas.set(afterField, projectedDeltas.get(afterField) + amount(delta.amount));
      }
      if ([...projectedDeltas].some(([field, expectedDelta]) =>
        amount(after?.[field]) - amount(before[field]) !== expectedDelta)) {
        failures.push("compartment_transition_economic_projection_mismatch");
      }
      const causeDeltaAllowed = new Map([
        ["reservation_hold", (delta) => delta.after_class === "reserved" &&
          ["absent", "released"].includes(delta.before_class)],
        ["reservation_release", (delta) => delta.before_class === "reserved" && delta.after_class === "released"],
        ["receiver_debit", (delta) => delta.before_class === "reserved" && delta.after_class === "confirmed_debit"],
        ["refund", (delta) => delta.after_class === "confirmed_refund"],
        ["reversal", (delta) => ["active_reversal", "confirmed_reversal"].includes(delta.after_class)],
        ["unexpected_reversal", (delta) => delta.after_class === "quarantine_hold"],
        ["unexpected_cancellation_charge", (delta) => delta.after_class === "quarantine_hold"],
        ["trust_quarantine", (delta) => delta.after_class === "quarantine_hold"]
      ]).get(value.cause);
      if ((causeDeltaAllowed && (deltaEntries.length === 0 || deltaEntries.some((delta) => !causeDeltaAllowed(delta)))) ||
          (["onboard", "close", "expire"].includes(value.cause) && deltaEntries.length !== 0)) {
        failures.push("compartment_transition_cause_delta_mismatch");
      }
      if (value.cause === "reservation_hold" && after?.receiver_backed_available !== null &&
          amount(after.receiver_backed_available) < afterReserved) {
        failures.push("compartment_transition_receiver_backing_exceeded");
      }
      if (["close", "expire"].includes(value.cause) &&
          (after?.active_reservation_count !== 0 || after?.current_economic_atom_count !== 0 ||
           afterReserved !== 0 || amount(after?.outstanding_reversal_exposure) !== 0 ||
           amount(after?.quarantine_exposure) !== 0)) {
        failures.push("compartment_transition_close_not_empty");
      }
    }
    const committedAt = Date.parse(value.committed_at);
    const signedAt = Date.parse(value.authority_service_signature?.signed_at);
    if (![committedAt, signedAt].every(Number.isFinite) || signedAt < committedAt) {
      failures.push("compartment_transition_chronology_invalid");
    }
    return unique(failures);
  } catch {
    return ["compartment_state_transition_receipt_malformed"];
  }
}

function compartmentAssetForState(state, context) {
  const compartment = state ? resolveObject(context.objectResolver, state.compartment_ref) : null;
  return compartment?.accounting_asset ?? null;
}

function financialMoneyValues(financial) {
  return [financial.per_action_limit, financial.aggregate_limit, financial.outstanding_exposure_limit,
    financial.fee_limit, financial.tax_limit, financial.shipping_limit, financial.price_corridor.minimum,
    financial.price_corridor.maximum, ...financial.window_limits.map(({ amount }) => amount)];
}

export function validateMandate(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    if (value.execution_mode !== "preauthorized" || value.max_delegation_depth !== 0) failures.push("mandate_execution_mode_invalid");
    const runtime = context.runtimeBinding ?? resolveObject(context.objectResolver, value.agent.runtime_binding_ref);
    const connectionAuthorization = context.connectionAuthorization ??
      resolveObject(context.objectResolver, value.agent.connection_authorization_ref);
    if (!runtime || runtime.schema !== "cairn.agent_runtime_binding.v0.1") {
      failures.push("mandate_runtime_unresolved");
    } else {
      failures.push(...resolvedObjectShapeFailures(runtime, context, "mandate_runtime"));
      if (context.requireDependencySignatures === true && validateResolvedSignedObject(runtime, context).length) {
        failures.push("mandate_runtime_signature_invalid");
      }
      if (!sameObjectRef(value.agent.runtime_binding_ref, objectRefFor(runtime,
        context.baseSchemasByObjectId?.get(runtime.schema)))) failures.push("mandate_runtime_ref_mismatch");
      if (runtime.agent_identity?.agent_provider_id !== value.agent.provider_id ||
          runtime.agent_identity?.agent_product_id !== value.agent.product_id) {
        failures.push("mandate_runtime_identity_mismatch");
      }
    }
    if (!connectionAuthorization || connectionAuthorization.schema !== "cairn.agent_connection_authorization.v0.1" ||
        (context.requireDependencySignatures === true &&
          validateResolvedSignedObject(connectionAuthorization, context).length) ||
        validateConnectionAuthorization(connectionAuthorization, context).length ||
        !exactRef(value.agent.connection_authorization_ref, connectionAuthorization, context) ||
        connectionAuthorization.principal_id !== value.principal_id ||
        !sameObjectRef(connectionAuthorization.agent_runtime_binding_ref, value.agent.runtime_binding_ref)) {
      failures.push("mandate_connection_authorization_mismatch");
    }
    const { constraints } = value;
    const externalScopeFields = ["receiver_account_or_contract_scope", "receiver_operation_namespace",
      "explicit_scope_selection_proof_ref", "explicit_scope_selection_proof_hash"];
    const financialScopeFields = ["asset", "compartment_ref", "economic_resource_key", "provider_account_identity_head_ref",
      "account_generation", "provider_account_identity_trust_overlay_head_ref",
      "provider_account_identity_trust_overlay_head_hash", "accounting_policy_ref"];
    const sublimitFields = ["provider_sublimit_identity_head_ref", "provider_sublimit_identity_head_hash", "provider_sublimit_id",
      "sublimit_generation", "provider_sublimit_identity_trust_overlay_head_ref",
      "provider_sublimit_identity_trust_overlay_head_hash"];
    for (const binding of value.scope_bindings) {
      if (externalScopeFields.some((field) => binding[field] === null)) failures.push("mandate_external_receiver_scope_incomplete");
      failures.push(...refHashPairFailures(binding, [
        ["explicit_scope_selection_proof_ref", "explicit_scope_selection_proof_hash"],
        ["provider_account_identity_trust_overlay_head_ref", "provider_account_identity_trust_overlay_head_hash"],
        ["provider_sublimit_identity_head_ref", "provider_sublimit_identity_head_hash"],
        ["provider_sublimit_identity_trust_overlay_head_ref", "provider_sublimit_identity_trust_overlay_head_hash"]
      ], "mandate_scope_ref_hash_mismatch"));
      const sublimitPresent = sublimitFields.map((field) => binding[field] !== null);
      if (!(sublimitPresent.every(Boolean) || sublimitPresent.every((present) => !present))) failures.push("mandate_sublimit_union_mismatch");
    }
    if (constraints.kind === "financial") {
      if (constraints.financial === null || constraints.nonfinancial !== null) failures.push("mandate_financial_union_mismatch");
      else {
        const monies = financialMoneyValues(constraints.financial);
        if (monies.some((item) => item.asset !== constraints.financial.accounting_asset)) failures.push("mandate_financial_asset_mismatch");
        if (amount(constraints.financial.per_action_limit) > amount(constraints.financial.outstanding_exposure_limit) ||
            amount(constraints.financial.per_action_limit) > amount(constraints.financial.aggregate_limit)) failures.push("mandate_financial_limit_order_invalid");
        for (const binding of value.scope_bindings) {
          if (financialScopeFields.some((field) => binding[field] === null) ||
              binding.asset !== constraints.financial.accounting_asset) failures.push("mandate_financial_scope_incomplete");
          if (["authorize_payment", "fund_escrow"].includes(value.capability) &&
              (binding.payee_account_commitment === null || binding.rail === null)) failures.push("mandate_payment_scope_incomplete");
        }
      }
    } else if (constraints.kind === "nonfinancial") {
      if (constraints.nonfinancial === null || constraints.financial !== null) failures.push("mandate_nonfinancial_union_mismatch");
      for (const binding of value.scope_bindings) {
        if ([...financialScopeFields, ...sublimitFields, "payee_account_commitment", "rail"].some((field) => binding[field] !== null)) {
          failures.push("mandate_nonfinancial_scope_leaks_financial_authority");
        }
      }
    }
    if (FINANCIAL_CAPABILITIES.has(value.capability) !== (constraints.kind === "financial")) failures.push("mandate_capability_constraint_mismatch");
    if (Date.parse(constraints.not_before) >= Date.parse(constraints.expires_at) || Date.parse(value.issued_at) > Date.parse(constraints.not_before)) {
      failures.push("mandate_interval_invalid");
    }
    const mandateStartsAt = Date.parse(constraints.not_before);
    const mandateExpiresAt = Date.parse(constraints.expires_at);
    const runtimeStartsAt = Date.parse(runtime?.not_before);
    const runtimeExpiresAt = Date.parse(runtime?.expires_at);
    const connectionStartsAt = Date.parse(connectionAuthorization?.not_before);
    const connectionExpiresAt = Date.parse(connectionAuthorization?.expires_at);
    if (![mandateStartsAt, mandateExpiresAt, runtimeStartsAt, runtimeExpiresAt,
      connectionStartsAt, connectionExpiresAt].every(Number.isFinite) ||
        runtimeStartsAt > mandateStartsAt || runtimeExpiresAt < mandateExpiresAt ||
        connectionStartsAt > mandateStartsAt || connectionExpiresAt < mandateExpiresAt) {
      failures.push("mandate_runtime_connection_interval_mismatch");
    }
    return unique(failures);
  } catch {
    return ["mandate_malformed"];
  }
}

export function validateLineageCommitment(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    const mandateBranch = value.authority_kind === "preauthorized_mandate";
    if (mandateBranch !== (value.mandate_ref !== null && value.scope_binding_index !== null)) failures.push("lineage_authority_union_mismatch");
    if (!mandateBranch && (value.mandate_ref !== null || value.scope_binding_index !== null)) failures.push("lineage_nonmandate_authority_mismatch");
    if ((value.prior_lineage_state === "none") !== (value.prior_lineage_receipt_ref === null)) failures.push("lineage_prior_state_union_mismatch");
    return unique(failures);
  } catch {
    return ["lineage_commitment_malformed"];
  }
}

export const LINEAGE_ACTIVE_PREIMAGE_TYPE = "cairn.lineage_active_state_commitment_preimage.v0.1";

export function lineageActiveStateCommitmentPreimage(after) {
  return [
    LINEAGE_ACTIVE_PREIMAGE_TYPE,
    after.principal_occurrence_id,
    after.principal_authorized_lineage_id,
    after.action_control_key,
    after.attempt_sequence,
    after.commitment_generation,
    after.sequence,
    after.previous_state_hash,
    "active",
    after.commitment_ref,
    after.activation_transaction_id,
    after.activated_action_ref,
    null,
    null,
    false,
    after.fencing_token,
    after.updated_at
  ];
}

export function lineageActiveStateCommitmentHash(after) {
  return canonicalHash(lineageActiveStateCommitmentPreimage(after));
}

const LINEAGE_EDGES = new Map([
  ["provisional", new Set(["provisional_expired", "provisional_superseded", "provisional_cancelled", "active"])],
  ["provisional_superseded", new Set(["provisional"])],
  ["active", new Set(["active", "fenced_non_submission", "definitive_failure", "receiver_confirmed_cancelled", "finalized"])],
  ["provisional_expired", new Set()],
  ["provisional_cancelled", new Set()],
  ["fenced_non_submission", new Set()],
  ["definitive_failure", new Set()],
  ["receiver_confirmed_cancelled", new Set()],
  ["finalized", new Set()]
]);

export function validateLineageStateTransition(before, after, context = {}) {
  try {
    const failures = validatePhase1Object(after, context);
    if (before !== null) failures.push(...validatePhase1Object(before, context).map((code) => `before_${code}`));
    if (failures.length) return unique(failures);
    if (before === null) {
      if (after.sequence !== 0 || after.previous_state_hash !== null || after.state !== "provisional" ||
          after.commitment_generation !== 0) failures.push("lineage_state_genesis_invalid");
      const commitment = context.lineageCommitment ?? resolveObject(context.objectResolver, after.commitment_ref);
      if (!commitment || commitment.schema !== "cairn.lineage_commitment.v0.1" ||
          !exactRef(after.commitment_ref, commitment, context) || validateLineageCommitment(commitment, context).length) {
        failures.push("lineage_state_genesis_commitment_unresolved");
      } else {
        if (context.requireDependencySignatures === true &&
            validateResolvedSignedObject(commitment, context).length) {
          failures.push("lineage_state_genesis_commitment_signature_invalid");
        }
        for (const field of ["principal_occurrence_id", "principal_authorized_lineage_id", "action_control_key", "attempt_sequence", "commitment_generation"]) {
          if (after[field] !== commitment[field]) failures.push("lineage_state_genesis_commitment_mismatch");
        }
        if (after.fencing_token !== commitment.expected_activation_fence) failures.push("lineage_state_genesis_fence_mismatch");
      }
      return unique(failures);
    }
    for (const field of ["principal_occurrence_id", "principal_authorized_lineage_id", "action_control_key", "attempt_sequence"]) {
      if (after[field] !== before[field]) failures.push("lineage_state_identity_mismatch");
    }
    if (after.sequence !== before.sequence + 1 || after.previous_state_hash !== before.state_hash) {
      failures.push("lineage_state_sequence_mismatch");
    }
    if (!LINEAGE_EDGES.get(before.state)?.has(after.state)) failures.push("lineage_state_edge_invalid");
    if (before.state === "provisional" && after.state === "active") {
      if (after.fencing_token !== before.fencing_token + 1) failures.push("lineage_state_activation_fence_invalid");
      if (after.outbox_state_head_ref !== null || after.terminal_receiver_receipt_ref !== null ||
          after.finalization_tombstone !== false) {
        failures.push("lineage_state_activation_shape_invalid");
      } else if (after.next_state_commitment_hash !== lineageActiveStateCommitmentHash(after)) {
        failures.push("lineage_state_activation_commitment_mismatch");
      }
    }
    if (after.fencing_token < before.fencing_token) failures.push("lineage_state_fencing_token_rollback");
    const supersession = before.state === "provisional_superseded" && after.state === "provisional";
    if (after.commitment_generation !== before.commitment_generation + (supersession ? 1 : 0)) {
      failures.push("lineage_state_commitment_generation_mismatch");
    }
    if (!supersession && !sameObjectRef(after.commitment_ref, before.commitment_ref)) {
      failures.push("lineage_state_commitment_drift");
    }
    for (const field of ["activation_receipt_ref", "activated_action_ref", "outbox_state_head_ref", "terminal_receiver_receipt_ref"]) {
      if (before[field] !== null && (after[field] === null || !sameObjectRef(before[field], after[field]))) {
        failures.push("lineage_state_dependency_erased");
      }
    }
    for (const field of ["activation_transaction_id", "next_state_commitment_hash"]) {
      if (before[field] !== null && after[field] !== before[field]) failures.push("lineage_state_dependency_erased");
    }
    if (before.finalization_tombstone && !after.finalization_tombstone) failures.push("lineage_state_tombstone_erased");
    return unique(failures);
  } catch {
    return ["lineage_state_transition_malformed"];
  }
}

export function validateLineageStateHead(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    if (value.sequence === 0) {
      return validateLineageStateTransition(null, value, context);
    }
    if (value.previous_state_hash === null) return ["lineage_state_predecessor_unresolved"];
    const beforeRef = {
      schema: value.schema,
      object_id: value.principal_authorized_lineage_id,
      object_hash: value.previous_state_hash
    };
    const before = typeof context.statePredecessorResolver === "function"
      ? context.statePredecessorResolver(beforeRef) : resolveObject(context.objectResolver, beforeRef);
    if (!before || !exactRef(beforeRef, before, context) ||
        (context.requireDependencySignatures === true && validateResolvedSignedObject(before, context).length)) {
      return ["lineage_state_predecessor_unresolved"];
    }
    return validateLineageStateTransition(before, value, context);
  } catch {
    return ["lineage_state_head_malformed"];
  }
}

export function validateLineageActivationReceipt(value, graph, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    const { before, after, reservation, commitment, authority, binding, preparedAction } = graph ?? {};
    if (!before || !after || before.state !== "provisional" || after.state !== "active") {
      return ["lineage_activation_context_invalid"];
    }
    failures.push(...validateLineageStateTransition(before, after, { ...context, lineageCommitment: commitment })
      .map((code) => `lineage_activation_transition_${code}`));
    if (value.next_activation_fence !== value.expected_activation_fence + 1) {
      failures.push("lineage_activation_receipt_fence_invalid");
    }
    if (value.expected_activation_fence !== before.fencing_token ||
        value.next_activation_fence !== after.fencing_token) {
      failures.push("lineage_activation_head_fence_mismatch");
    }
    if (!reservation || !commitment || !authority || !binding || !preparedAction) {
      failures.push("lineage_activation_dependency_context_missing");
      return unique(failures);
    }
    failures.push(...validateLineageCommitment(commitment, context).map((code) => `lineage_activation_commitment_${code}`));
    failures.push(...validateBindingSet(binding, context).map((code) => `lineage_activation_binding_${code}`));
    failures.push(...validateActionRecord(preparedAction, context).map((code) => `lineage_activation_action_${code}`));
    failures.push(...validateAuthorityReservation(reservation, preparedAction, binding, {
      ...context, lineageCommitment: commitment, authority
    }).map((code) => `lineage_activation_reservation_${code}`));
    if (authority.schema === "cairn.agent_mandate.v0.3") {
      failures.push(...validateMandate(authority, context).map((code) => `lineage_activation_authority_${code}`));
      failures.push(...mandateBindingFailures(authority, commitment, binding, context)
        .map((code) => `lineage_activation_${code}`));
    } else if (authority.schema === "cairn.action_authorization.v0.2") {
      failures.push(...validateActionAuthorization(authority, binding, context).map((code) => `lineage_activation_authority_${code}`));
    } else if (authority.schema === "cairn.cancellation_authorization.v0.1") {
      failures.push(...validateCancellationAuthorization(authority, binding, context).map((code) => `lineage_activation_authority_${code}`));
    } else {
      failures.push("lineage_activation_authority_schema_invalid");
    }
    const activatedAt = Date.parse(value.activated_at);
    const authoritySignedAt = Date.parse(authority.principal_signature?.signed_at);
    const commitmentSignedAt = Date.parse(commitment.authority_service_signature?.signed_at);
    const bindingCreatedAt = Date.parse(binding.created_at);
    const bindingSignedAt = Date.parse(binding.binding_service_signature?.signed_at);
    const actionCreatedAt = Date.parse(preparedAction.created_at);
    const actionSignedAt = Date.parse(preparedAction.action_service_signature?.signed_at);
    const reservationReservedAt = Date.parse(reservation.reserved_at);
    const reservationSignedAt = Date.parse(reservation.authority_service_signature?.signed_at);
    const predecessorUpdatedAt = Date.parse(before.updated_at);
    const predecessorSignedAt = Date.parse(before.authority_service_signature?.signed_at);
    const authorityExpiresAt = Date.parse(authority.schema === "cairn.agent_mandate.v0.3"
      ? authority.constraints.expires_at : authority.expires_at);
    const dependencyStarts = [
      ...(authority.schema === "cairn.agent_mandate.v0.3"
        ? [Date.parse(authority.constraints.not_before), Date.parse(authority.issued_at)]
        : []),
      authoritySignedAt, commitmentSignedAt, bindingCreatedAt, bindingSignedAt,
      actionCreatedAt, actionSignedAt, reservationReservedAt, reservationSignedAt,
      predecessorUpdatedAt, predecessorSignedAt
    ];
    const dependencyExpiries = [
      authorityExpiresAt, Date.parse(reservation.expires_at), Date.parse(binding.expires_at),
      Date.parse(commitment.expires_at)
    ];
    if (!Number.isFinite(activatedAt) || dependencyStarts.some((instant) => !Number.isFinite(instant) || activatedAt < instant) ||
        dependencyExpiries.some((instant) => !Number.isFinite(instant) || activatedAt >= instant)) {
      failures.push("lineage_activation_dependency_time_invalid");
    }
    const commonCausalOrderInvalid = predecessorUpdatedAt > predecessorSignedAt ||
      predecessorSignedAt > commitmentSignedAt || commitmentSignedAt > bindingCreatedAt ||
      bindingCreatedAt > bindingSignedAt || actionCreatedAt > actionSignedAt ||
      authoritySignedAt > actionCreatedAt || bindingSignedAt > actionCreatedAt ||
      actionSignedAt > reservationReservedAt || authoritySignedAt > reservationReservedAt ||
      reservationReservedAt > reservationSignedAt || reservationSignedAt > activatedAt;
    const authorityBranchOrderInvalid = authority.schema === "cairn.agent_mandate.v0.3"
      ? authoritySignedAt > commitmentSignedAt
      : bindingSignedAt > authoritySignedAt;
    if (commonCausalOrderInvalid || authorityBranchOrderInvalid) {
      failures.push("lineage_activation_causal_order_invalid");
    }
    const activationReceiptSignedAt = Date.parse(value.authority_service_signature?.signed_at);
    const afterSignedAt = Date.parse(after.authority_service_signature?.signed_at);
    if (!Number.isFinite(activationReceiptSignedAt) || !Number.isFinite(afterSignedAt) ||
        activationReceiptSignedAt < activatedAt || afterSignedAt < activatedAt) {
      failures.push("lineage_activation_receipt_time_invalid");
    }
    if (!exactRef(value.actual_authority_ref, authority, context)) {
      failures.push("lineage_activation_exact_authority_mismatch");
    }
    if (!exactRef(value.execution_binding_set_ref, binding, context)) {
      failures.push("lineage_activation_exact_binding_mismatch");
    }
    if (!exactRef(value.activated_action_ref, preparedAction, context)) {
      failures.push("lineage_activation_exact_action_mismatch");
    }
    if (!exactRef(value.authority_reservation_ref, reservation, context) ||
        !exactRef(value.lineage_commitment_ref, commitment, context) ||
        !exactRef(value.actual_authority_ref, authority, context) ||
        !exactRef(value.execution_binding_set_ref, binding, context) ||
        !exactRef(value.prior_lineage_state_head_ref, before, context) ||
        !sameObjectRef(after.activation_receipt_ref, objectRef(value, context)) ||
        !exactRef(value.activated_action_ref, preparedAction, context) ||
        !sameObjectRef(before.commitment_ref, value.lineage_commitment_ref) ||
        !sameObjectRef(after.commitment_ref, value.lineage_commitment_ref) ||
        !sameObjectRef(reservation.prepared_action_ref, value.activated_action_ref) ||
        !sameObjectRef(reservation.execution_binding_set_ref, value.execution_binding_set_ref) ||
        !sameObjectRef(reservation.authority_basis_ref, value.actual_authority_ref) ||
        !sameObjectRef(reservation.lineage_commitment_ref, value.lineage_commitment_ref) ||
        !sameObjectRef(binding.lineage_commitment_ref, value.lineage_commitment_ref) ||
        !sameObjectRef(preparedAction.execution_binding_set_ref, value.execution_binding_set_ref) ||
        !sameObjectRef(preparedAction.lineage_commitment_ref, value.lineage_commitment_ref) ||
        after.previous_state_hash !== before.state_hash ||
        after.activation_transaction_id !== value.authority_transaction_id ||
        value.activated_at !== after.updated_at ||
        after.next_state_commitment_hash !== value.next_state_commitment_hash ||
        value.next_state_commitment_hash !== lineageActiveStateCommitmentHash(after)) {
      failures.push("lineage_activation_receipt_head_mismatch");
    }
    const principal = commitment.principal_id;
    if ([reservation, binding, preparedAction, authority].some((object) => object.principal_id !== principal)) {
      failures.push("lineage_activation_principal_mismatch");
    }
    for (const field of ["principal_occurrence_id", "principal_authorized_lineage_id", "action_control_key"]) {
      if (before[field] !== commitment[field] || after[field] !== commitment[field] || binding[field] !== commitment[field] ||
          (Object.hasOwn(authority, field) && authority[field] !== commitment[field])) {
        failures.push(`lineage_activation_identity_mismatch:${field}`);
      }
    }
    if (before.attempt_sequence !== commitment.attempt_sequence || after.attempt_sequence !== commitment.attempt_sequence ||
        before.commitment_generation !== commitment.commitment_generation || after.commitment_generation !== commitment.commitment_generation ||
        binding.action_proposal_hash !== commitment.action_proposal_hash || preparedAction.action_proposal_hash !== commitment.action_proposal_hash ||
        binding.effect_id !== commitment.effect_id || preparedAction.effect_id !== commitment.effect_id ||
        preparedAction.capability !== binding.capability) failures.push("lineage_activation_semantic_chain_mismatch");
    if (commitment.expected_activation_fence !== binding.expected_lineage_activation_fence ||
        reservation.expected_lineage_fence !== commitment.expected_activation_fence ||
        value.expected_activation_fence !== commitment.expected_activation_fence || before.fencing_token !== commitment.expected_activation_fence ||
        reservation.next_lineage_fence !== value.next_activation_fence || after.fencing_token !== value.next_activation_fence) {
      failures.push("lineage_activation_fence_chain_mismatch");
    }
    if (commitment.authority_kind === "preauthorized_mandate") {
      if (authority.schema !== "cairn.agent_mandate.v0.3" || !sameObjectRef(commitment.mandate_ref, objectRef(authority, context))) {
        failures.push("lineage_activation_authority_branch_mismatch");
      }
    } else if (commitment.authority_kind === "supervised_pending") {
      if (authority.schema !== "cairn.action_authorization.v0.2") failures.push("lineage_activation_authority_branch_mismatch");
    } else if (commitment.authority_kind === "cancellation_pending") {
      if (authority.schema !== "cairn.cancellation_authorization.v0.1" || authority.cancellation_effect_id !== commitment.effect_id) {
        failures.push("lineage_activation_authority_branch_mismatch");
      }
    }
    return unique(failures);
  } catch {
    return ["lineage_activation_receipt_malformed"];
  }
}

function cancellationOriginalActionFailures(cancellation, binding, context = {}) {
  if (!cancellation) return ["cancellation_original_action_context_missing"];
  const originalAction = context.originalAction ?? resolveObject(context.objectResolver, cancellation.original_action_ref);
  const originalState = context.originalActionStateHead ??
    resolveObject(context.objectResolver, cancellation.original_action_state_head_ref);
  if (!originalAction || !originalState) return ["cancellation_original_action_unresolved"];
  const failures = [
    ...validateActionRecord(originalAction, context).map((code) => `original_action_${code}`),
    ...validatePhase1Object(originalState, context).map((code) => `original_action_state_${code}`)
  ];
  if (validateResolvedSignedObject(originalAction, context).length) {
    failures.push("cancellation_original_action_signature_invalid");
  }
  if (validateResolvedSignedObject(originalState, context).length) {
    failures.push("cancellation_original_action_state_signature_invalid");
  }
  if (!isHistoricalEvidence(context) &&
      !sameObjectRef(resolveCurrentHead(
        context, cancellation.original_action_state_head_ref, context.gateEvaluationTime ?? context.now
      ), cancellation.original_action_state_head_ref)) {
    failures.push("cancellation_original_action_state_not_current");
  }
  if (!exactRef(cancellation.original_action_ref, originalAction, context) ||
      !exactRef(cancellation.original_action_state_head_ref, originalState, context) ||
      originalAction.effect_id !== cancellation.original_effect_id ||
      originalAction.principal_id !== binding.principal_id ||
      !sameObjectRef(originalState.action_ref, cancellation.original_action_ref) ||
      originalState.action_id !== originalAction.action_id ||
      originalState.state !== cancellation.expected_original_state) {
    failures.push("cancellation_original_action_mismatch");
  }
  return failures;
}

export function validateBindingSet(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    if (value.profile_id !== PROFILE_ID || value.execution_bundle_hash !== context.bundleHash || value.operation_registry_hash !== context.registryHash) {
      failures.push("binding_release_mismatch");
    }
    if (FINANCIAL_CAPABILITIES.has(value.capability)) {
      failures.push("phase1_financial_external_truth_unsupported");
    }
    const runtimeFields = [value.agent_runtime_binding_ref, value.connection_authorization_ref, value.connection_state_head_ref];
    if (value.actor_branch === "agent_runtime") {
      if (runtimeFields.some(isNull)) {
        failures.push("binding_agent_branch_incomplete");
      } else {
        const runtime = context.runtimeBinding ?? resolveObject(context.objectResolver, value.agent_runtime_binding_ref);
        const authorization = context.connectionAuthorization ??
          resolveObject(context.objectResolver, value.connection_authorization_ref);
        const connection = context.connectionStateHead ??
          resolveObject(context.objectResolver, value.connection_state_head_ref);
        const runtimeSchema = schemaForResolvedObject(runtime, context);
        if (!runtime || runtime.schema !== "cairn.agent_runtime_binding.v0.1" || !runtimeSchema ||
            !sameObjectRef(value.agent_runtime_binding_ref, objectRefFor(runtime, runtimeSchema)) ||
            validateResolvedSignedObject(runtime, context).length || runtime.key_status !== "active") {
          failures.push("binding_runtime_graph_mismatch");
        }
        if (!authorization || authorization.schema !== "cairn.agent_connection_authorization.v0.1" ||
            !exactRef(value.connection_authorization_ref, authorization, context) ||
            validateResolvedSignedObject(authorization, context).length ||
            validateConnectionAuthorization(authorization, { ...context, runtimeBinding: runtime }).length ||
            authorization.principal_id !== value.principal_id ||
            !sameObjectRef(authorization.agent_runtime_binding_ref, value.agent_runtime_binding_ref)) {
          failures.push("binding_connection_authorization_graph_mismatch");
        }
        if (!connection || connection.schema !== "cairn.agent_connection_state_head.v0.1" ||
            !exactRef(value.connection_state_head_ref, connection, context) ||
            validateResolvedSignedObject(connection, context).length ||
            validateConnectionStateHead(connection, {
              ...context, runtimeBinding: runtime, connectionAuthorization: authorization,
              requireCurrentConnection: !isHistoricalEvidence(context)
            }).length || connection.state !== "active" || connection.principal_id !== value.principal_id ||
            !sameObjectRef(connection.agent_runtime_binding_ref, value.agent_runtime_binding_ref) ||
            !sameObjectRef(connection.connection_authorization_ref, value.connection_authorization_ref)) {
          failures.push("binding_connection_state_graph_mismatch");
        }
        const createdAt = Date.parse(value.created_at);
        const expiresAt = Date.parse(value.expires_at);
        const runtimeStartsAt = Date.parse(runtime?.not_before);
        const runtimeExpiresAt = Date.parse(runtime?.expires_at);
        const authorizationStartsAt = Date.parse(authorization?.not_before);
        const authorizationExpiresAt = Date.parse(authorization?.expires_at);
        const connectionUpdatedAt = Date.parse(connection?.updated_at);
        if (![createdAt, expiresAt, runtimeStartsAt, runtimeExpiresAt,
          authorizationStartsAt, authorizationExpiresAt, connectionUpdatedAt].every(Number.isFinite) ||
            createdAt >= expiresAt || connectionUpdatedAt > createdAt ||
            runtimeStartsAt > createdAt || runtimeExpiresAt < expiresAt ||
            authorizationStartsAt > createdAt || authorizationExpiresAt < expiresAt) {
          failures.push("binding_runtime_graph_interval_mismatch");
        }
      }
    } else if (runtimeFields.some((item) => item !== null)) failures.push("binding_principal_branch_leaks_runtime");
    const cancellation = value.capability === "cancel_receiver_action";
    if (cancellation !== (value.cancellation_context !== null)) failures.push("binding_cancellation_union_mismatch");
    if (cancellation && value.cancellation_context !== null) {
      const cancellationContext = value.cancellation_context;
      if (value.receiver_account_or_contract_scope !== cancellationContext.receiver_account_or_contract_scope ||
          value.receiver_operation_namespace !== cancellationContext.cancellation_operation_namespace ||
          !sameObjectRef(value.receiver_finality_profile_ref, cancellationContext.cancellation_finality_profile_ref) ||
          !sameObjectRef(value.executor_credential_binding_head_ref, cancellationContext.cancellation_executor_credential_binding_head_ref)) {
        failures.push("binding_cancellation_top_level_mismatch");
      }
      failures.push(...cancellationOriginalActionFailures(cancellationContext, value, context)
        .map((code) => `binding_${code}`));
    }
    const checkout = value.checkout_role !== null;
    if (checkout !== (value.checkout_group_core_ref !== null && value.checkout_group_core_hash !== null)) failures.push("binding_checkout_union_mismatch");
    if (value.checkout_role === null && [value.checkout_reservation_batch_core_ref, value.checkout_reservation_batch_core_hash,
      value.checkout_transition_template_ref, value.checkout_transition_template_hash].some((item) => item !== null)) failures.push("binding_checkout_fields_without_role");
    const inventoryContextFields = [
      value.seller_inventory_context_kind, value.seller_inventory_context_ref, value.seller_inventory_context_hash,
      value.seller_inventory_stage, value.seller_inventory_state_head_ref, value.seller_inventory_state_head_hash,
      value.seller_copy_lease_heads_root, value.seller_inventory_transition_receipt_ref,
      value.seller_inventory_transition_receipt_hash, value.seller_inventory_authority_state_head_ref,
      value.seller_inventory_authority_state_head_hash, value.seller_inventory_authority_signing_key_generation,
      value.copy_ownership_registry_authority_state_head_ref, value.copy_ownership_registry_authority_state_head_hash,
      value.copy_ownership_registry_authority_signing_key_generation
    ];
    const inventoryApplicable = FINANCIAL_CAPABILITIES.has(value.capability) && value.copy_ids.length > 0;
    if (!inventoryApplicable && inventoryContextFields.some((item) => item !== null)) {
      failures.push("binding_inventory_context_without_copies");
    } else if (inventoryApplicable && inventoryContextFields.some(isNull)) {
      failures.push("binding_inventory_context_missing");
    } else if (inventoryApplicable) {
      const exactKindForStage = new Map([
        ["ordinary_held", "ordinary_deal"],
        ["checkout_prepared", "checkout"],
        ["checkout_held", "checkout"],
        ["adopted_consumed", "adopted_obligation"]
      ]);
      if (exactKindForStage.get(value.seller_inventory_stage) !== value.seller_inventory_context_kind) {
        failures.push("binding_inventory_stage_kind_mismatch");
      }
      const checkoutInventory = value.seller_inventory_stage === "checkout_prepared" || value.seller_inventory_stage === "checkout_held";
      if (checkoutInventory !== (value.checkout_role !== null)) failures.push("binding_inventory_checkout_context_mismatch");
      const offerLike = ["submit_bindable_offer", "submit_counteroffer"].includes(value.capability) ||
        (value.capability === "accept_terms" && value.checkout_role === null);
      const checkoutLike = value.checkout_role !== null;
      const adoptionLike = ["authorize_payment", "fund_escrow"].includes(value.capability) && value.checkout_role === null;
      if (offerLike && !(value.seller_inventory_context_kind === "ordinary_deal" && value.seller_inventory_stage === "ordinary_held")) {
        failures.push("binding_inventory_capability_matrix_mismatch");
      }
      if (checkoutLike && !(value.seller_inventory_context_kind === "checkout" &&
          ["checkout_prepared", "checkout_held"].includes(value.seller_inventory_stage))) {
        failures.push("binding_inventory_capability_matrix_mismatch");
      }
      if (adoptionLike && !(value.obligation_role === "fulfill" &&
          value.seller_inventory_context_kind === "adopted_obligation" && value.seller_inventory_stage === "adopted_consumed")) {
        failures.push("binding_inventory_capability_matrix_mismatch");
      }
      if (!offerLike && !checkoutLike && !adoptionLike) failures.push("binding_inventory_capability_matrix_mismatch");
    }
    const readiness = [value.checkout_readiness_receipt_ref, value.checkout_readiness_receipt_hash];
    if ((value.seller_inventory_stage === "checkout_held") !== readiness.every((item) => item !== null)) {
      failures.push("binding_inventory_readiness_mismatch");
    }
    failures.push(...refHashPairFailures(value, [
      ["execution_integrity_state_head_ref", "execution_integrity_state_head_hash"],
      ["action_proposal_ref", "action_proposal_hash"],
      ["obligation_exposure_core_ref", "obligation_exposure_core_hash"],
      ["lineage_commitment_ref", "lineage_commitment_hash"],
      ["checkout_group_core_ref", "checkout_group_core_hash"],
      ["checkout_reservation_batch_core_ref", "checkout_reservation_batch_core_hash"],
      ["fulfillment_attempt_core_ref", "fulfillment_attempt_core_hash"],
      ["checkout_transition_template_ref", "checkout_transition_template_hash"],
      ["seller_inventory_context_ref", "seller_inventory_context_hash"],
      ["seller_inventory_state_head_ref", "seller_inventory_state_head_hash"],
      ["seller_inventory_transition_receipt_ref", "seller_inventory_transition_receipt_hash"],
      ["seller_inventory_authority_state_head_ref", "seller_inventory_authority_state_head_hash"],
      ["copy_ownership_registry_authority_state_head_ref", "copy_ownership_registry_authority_state_head_hash"],
      ["checkout_readiness_receipt_ref", "checkout_readiness_receipt_hash"],
      ["quote_snapshot_ref", "quote_hash"],
      ["provider_quote_import_receipt_ref", "provider_quote_import_receipt_hash"],
      ["quote_source_credential_lifecycle_head_ref", "quote_source_credential_lifecycle_head_hash"],
      ["quote_importer_adapter_lifecycle_head_ref", "quote_importer_adapter_lifecycle_head_hash"],
      ["context_taint_decision_ref", "taint_decision_hash"],
      ["execution_review_receipt_ref", "review_hash"],
      ["pre_reservation_resource_exposure_state_head_ref", "pre_reservation_resource_exposure_state_head_hash"],
      ["economic_resource_cap_state_head_ref", "economic_resource_cap_state_head_hash"],
      ["protection_attestation_ref", "protection_attestation_hash"],
      ["protection_attestation_lifecycle_head_ref", "protection_attestation_lifecycle_head_hash"],
      ["provider_account_identity_trust_overlay_head_ref", "provider_account_identity_trust_overlay_head_hash"],
      ["provider_sublimit_identity_head_ref", "provider_sublimit_identity_head_hash"],
      ["provider_sublimit_identity_trust_overlay_head_ref", "provider_sublimit_identity_trust_overlay_head_hash"],
      ["receiver_sequence_epoch_selector_state_head_ref", "receiver_sequence_epoch_selector_state_head_hash"],
      ["receiver_sequence_epoch_proof_ref", "receiver_sequence_epoch_proof_hash"],
      ["receiver_channel_policy_ref", "receiver_channel_policy_hash"],
      ["receiver_channel_policy_lifecycle_head_ref", "receiver_channel_policy_lifecycle_head_hash"],
      ["confirmation_assurance_policy_ref", "confirmation_assurance_policy_hash"],
      ["confirmation_assurance_policy_lifecycle_head_ref", "confirmation_assurance_policy_lifecycle_head_hash"],
      ["explicit_scope_selection_proof_ref", "explicit_scope_selection_proof_hash"],
      ["executor_credential_binding_head_ref", "executor_credential_binding_head_hash"],
      ["executor_credential_instance_state_head_ref", "executor_credential_instance_state_head_hash"],
      ["credential_broker_authority_state_head_ref", "credential_broker_authority_state_head_hash"]
    ], "binding_ref_hash_mismatch"));
    if (value.cancellation_context !== null) {
      failures.push(...refHashPairFailures(value.cancellation_context, CANCELLATION_CONTEXT_REF_HASH_PAIRS,
        "binding_cancellation_ref_hash_mismatch"));
    }
    const grantRefSet = value.data_grant_refs.map((ref) => canonicalHash(ref)).sort();
    const grantHeadSet = value.data_grant_state_heads.map(({ data_grant_ref }) => canonicalHash(data_grant_ref)).sort();
    if (canonicalHash(grantRefSet) !== canonicalHash(grantHeadSet)) failures.push("binding_data_grant_head_set_mismatch");
    for (const head of value.data_grant_state_heads) {
      const grant = resolveObject(context.objectResolver, head.data_grant_ref);
      const grantSchema = schemaForResolvedObject(grant, context);
      const current = resolveObject(context.objectResolver, head.current_state_head_ref);
      if (!grant || grant.schema !== "cairn.data_grant.v0.1" || !grantSchema ||
          !sameObjectRef(head.data_grant_ref, objectRefFor(grant, grantSchema)) ||
          validateResolvedSignedObject(grant, context).length ||
          grant.principal_id !== value.principal_id || current?.principal_id !== value.principal_id) {
        failures.push("binding_data_grant_principal_mismatch");
      }
      const runtimeKey = (context.runtimeBinding ??
        resolveObject(context.objectResolver, value.agent_runtime_binding_ref))?.agent_identity?.runtime_instance_key_id;
      if (value.actor_branch === "agent_runtime" && grant &&
          (grant.recipient !== runtimeKey ||
           canonicalHash(grant.audience) !== canonicalHash([runtimeKey]))) {
        failures.push("binding_data_grant_runtime_recipient_mismatch");
      }
      if (!grant || grant.purpose !== head.required_purpose ||
          canonicalHash([...grant.uses].sort()) !== canonicalHash([...head.required_uses].sort()) ||
          canonicalHash(grant.resource_scopes) !== head.required_resource_scopes_root ||
          canonicalHash(grant.audience) !== canonicalHash(head.required_audience)) {
        failures.push("binding_data_grant_scope_mismatch");
      }
      if (!grant || Date.parse(grant.issued_at) > Date.parse(value.created_at) ||
          Date.parse(grant.expires_at) < Date.parse(value.expires_at) ||
          Date.parse(grant.retention?.expires_at) < Date.parse(value.expires_at)) {
        failures.push("binding_data_grant_interval_mismatch");
      }
      if (!current || current.schema !== "cairn.data_grant_state_head.v0.1" ||
          !exactRef(head.current_state_head_ref, current, context) ||
          validateResolvedSignedObject(current, context).length ||
          validateDataGrantStateHead(current, { ...context, requireDependencySignatures: true }).length ||
          (!isHistoricalEvidence(context) &&
            !sameObjectRef(resolveCurrentHead(context, head.current_state_head_ref), head.current_state_head_ref)) ||
          !sameObjectRef(current.data_grant_ref, head.data_grant_ref) || current.revocation_nonce !== head.revocation_nonce) {
        failures.push("binding_data_grant_current_head_mismatch");
      }
      if (!current || current.state !== "active" || current.remaining_reads <= 0) {
        failures.push("binding_data_grant_state_ineligible");
      }
    }
    if (Date.parse(value.created_at) >= Date.parse(value.expires_at)) failures.push("binding_interval_invalid");
    return unique(failures);
  } catch {
    return ["binding_set_malformed"];
  }
}

const MANIFEST_ENTRY_KIND_BY_MANIFEST = new Map([
  ["lifecycle_transition_chain", new Set(["lifecycle_transition_receipt"])],
  ["source_credential_continuity_chain", new Set(["lifecycle_transition_receipt"])],
  ["checkout_compartment_transitions", new Set(["compartment_transition_receipt"])],
  ["checkout_limit_ledger_transitions", new Set(["limit_ledger_transition_receipt"])],
  ["checkout_economic_atom_deltas", new Set(["economic_atom_delta"])],
  ["compartment_economic_atom_deltas", new Set(["economic_atom_delta"])],
  ["resource_economic_atom_deltas", new Set(["economic_atom_delta"])],
  ["authority_limit_ledger_event_deltas", new Set(["limit_ledger_transition_receipt"])],
  ["receiver_trust_slot_assignments", new Set(["bounded_index_slot_assignment"])],
  ["receiver_trust_epoch_transitions", new Set(["bounded_index_epoch_transition_receipt"])],
  ["closure_snapshot_entries", new Set(["closure_snapshot_entry"])],
  ["closure_partition_entries", new Set(["closure_work_item", "closure_partition_receipt"])]
]);

const ENTRY_SCHEMA_BY_KIND = new Map([
  ["compartment_transition_receipt", "cairn.compartment_state_transition_receipt.v0.1"],
  ["limit_ledger_transition_receipt", "cairn.authority_limit_ledger_transition_receipt.v0.1"],
  ["economic_atom_delta", "cairn.economic_atom_delta_entry.v0.1"],
  ["bounded_index_slot_assignment", "cairn.bounded_index_slot_assignment.v0.1"],
  ["bounded_index_epoch_transition_receipt", "cairn.bounded_index_epoch_transition_receipt.v0.1"],
  ["closure_snapshot_entry", "cairn.trust_closure_snapshot_entry.v0.1"],
  ["closure_work_item", "cairn.trust_closure_work_item.v0.1"],
  ["closure_partition_receipt", "cairn.trust_closure_partition_receipt.v0.1"]
]);

const LIFECYCLE_TRANSITION_RECEIPT_SCHEMAS = new Set([
  "cairn.authority_limit_ledger_transition_receipt.v0.1", "cairn.bounded_index_epoch_transition_receipt.v0.1",
  "cairn.cancellation_fee_source_transition_receipt.v0.1", "cairn.checkout_conditional_attempt_transition_receipt.v0.1",
  "cairn.commerce_signer_authority_transition_receipt.v0.1", "cairn.compartment_state_transition_receipt.v0.1",
  "cairn.connection_outstanding_action_index_transition_receipt.v0.1", "cairn.credential_broker_authority_transition_receipt.v0.1",
  "cairn.data_grant_state_transition_receipt.v0.1", "cairn.economic_resource_exposure_transition_receipt.v0.1",
  "cairn.economic_resource_protection_cap_transition_receipt.v0.1", "cairn.execution_integrity_transition_receipt.v0.1",
  "cairn.executor_credential_binding_transition_receipt.v0.1", "cairn.executor_credential_instance_transition_receipt.v0.1",
  "cairn.future_dependency_capacity_transition_receipt.v0.1", "cairn.inventory_reservation_transition_receipt.v0.1",
  "cairn.provider_identity_registry_transition_receipt.v0.1", "cairn.provider_identity_trust_overlay_transition_receipt.v0.1",
  "cairn.receiver_event_stream_transition_receipt.v0.1", "cairn.receiver_outstanding_stream_transition_receipt.v0.1",
  "cairn.receiver_sequence_epoch_selector_transition_receipt.v0.1", "cairn.recovery_grant_transition_receipt.v0.1",
  "cairn.release_or_policy_lifecycle_transition_receipt.v0.1", "cairn.seller_copy_lease_transition_receipt.v0.1",
  "cairn.source_credential_lifecycle_transition_receipt.v0.1"
]);

export function transitionManifestEntryKey(entry) {
  return canonicalHash([
    "cairn-transition-manifest-entry-key-v0.1",
    entry.entry_kind,
    entry.entry_object_ref,
    entry.entry_object_hash
  ]);
}

export function validateTransitionManifest(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    if (context.requireDependencySignatures === true && validateResolvedSignedObject(value, context).length) {
      failures.push("transition_manifest_signature_invalid");
    }
    if (value.entry_count !== value.sorted_entries.length) failures.push("transition_manifest_count_mismatch");
    if (value.subject_hash !== value.subject_ref.object_hash) failures.push("transition_manifest_subject_hash_mismatch");
    const keys = value.sorted_entries.map(({ entry_key }) => entry_key);
    const sortedKeys = [...keys].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
    if (new Set(keys).size !== keys.length || keys.some((key, index) => key !== sortedKeys[index])) failures.push("transition_manifest_sort_or_uniqueness_invalid");
    const permitted = MANIFEST_ENTRY_KIND_BY_MANIFEST.get(value.manifest_kind);
    for (const entry of value.sorted_entries) {
      if (!permitted?.has(entry.entry_kind)) failures.push("transition_manifest_kind_matrix_invalid");
      if (entry.entry_object_hash !== entry.entry_object_ref.object_hash) failures.push("transition_manifest_entry_hash_mismatch");
      if (entry.entry_key !== transitionManifestEntryKey(entry)) failures.push("transition_manifest_entry_key_mismatch");
      const exactSchema = ENTRY_SCHEMA_BY_KIND.get(entry.entry_kind);
      if (exactSchema && entry.entry_object_ref.schema !== exactSchema) failures.push("transition_manifest_entry_schema_mismatch");
      if (entry.entry_kind === "lifecycle_transition_receipt" &&
          !LIFECYCLE_TRANSITION_RECEIPT_SCHEMAS.has(entry.entry_object_ref.schema)) {
        failures.push("transition_manifest_entry_schema_mismatch");
      }
    }
    if (value.entries_root !== canonicalHash(value.sorted_entries)) failures.push("transition_manifest_root_mismatch");
    return unique(failures);
  } catch {
    return ["transition_manifest_malformed"];
  }
}

export function validateActionAuthorization(value, binding, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    failures.push(...refHashPairFailures(value, [
      ["execution_binding_set_ref", "execution_binding_set_hash"],
      ["lineage_commitment_ref", "lineage_commitment_hash"],
      ["obligation_exposure_core_ref", "obligation_exposure_core_hash"],
      ["checkout_group_core_ref", "checkout_group_core_hash"],
      ["checkout_reservation_batch_core_ref", "checkout_reservation_batch_core_hash"],
      ["fulfillment_attempt_core_ref", "fulfillment_attempt_core_hash"],
      ["explicit_scope_selection_proof_ref", "explicit_scope_selection_proof_hash"]
    ], "authorization_ref_hash_mismatch"));
    if (!isHistoricalEvidence(context)) {
      const currentPrincipalRevocationNonce = typeof context.principalRevocationNonceResolver === "function"
        ? context.principalRevocationNonceResolver(value.principal_id) : context.principalRevocationNonce;
      if (!Number.isInteger(currentPrincipalRevocationNonce) || currentPrincipalRevocationNonce < 0 ||
          value.principal_revocation_nonce !== currentPrincipalRevocationNonce) {
        failures.push("authorization_principal_revocation_nonce_mismatch");
      }
      const requiredReservedJudgments = typeof context.reservedJudgmentsResolver === "function"
        ? context.reservedJudgmentsResolver(value.principal_id, binding) : context.requiredReservedJudgments;
      if (!Array.isArray(requiredReservedJudgments) ||
          canonicalHash(value.reserved_judgments_decided) !== canonicalHash(requiredReservedJudgments)) {
        failures.push("authorization_reserved_judgments_mismatch");
      }
    }
    if (!binding || !exactRef(value.execution_binding_set_ref, binding, context) || value.execution_binding_set_hash !== binding.binding_set_hash) {
      failures.push("authorization_binding_mismatch");
    } else {
      const equalFields = ["principal_id", "action_proposal_hash", "principal_authorized_lineage_id", "lineage_commitment_ref",
        "lineage_commitment_hash", "principal_occurrence_id", "effect_id", "capability", "obligation_exposure_core_ref",
        "obligation_exposure_core_hash", "obligation_exposure_id", "obligation_role", "checkout_group_core_ref",
        "checkout_group_core_hash", "checkout_role", "checkout_reservation_batch_core_ref", "checkout_reservation_batch_core_hash",
        "fulfillment_attempt_core_ref", "fulfillment_attempt_core_hash", "expected_deal_head_hash", "copy_ids",
        "evidence_snapshot_hash", "receiver_account_or_contract_scope", "receiver_operation_namespace",
        "explicit_scope_selection_proof_ref", "explicit_scope_selection_proof_hash", "payee_account_commitment",
        "exposure_vector", "rail"];
      for (const field of equalFields) {
        if (binding[field] === undefined) continue;
        const equal = isObject(value[field]) || Array.isArray(value[field])
          ? canonicalHash(value[field]) === canonicalHash(binding[field])
          : value[field] === binding[field];
        if (!equal) failures.push("authorization_binding_semantics_mismatch", `authorization_binding_field_mismatch:${field}`);
      }
      const mappedFields = [
        ["terms_or_cart_hash", "closed_terms_or_cart_hash"], ["target", "executor_target"],
        ["ultimate_receiver_or_payee", "ultimate_receiver"],
        ["required_confirmation_assurance_policy_ref", "confirmation_assurance_policy_ref"]
      ];
      for (const [authorizationField, bindingField] of mappedFields) {
        const authorizationValue = value[authorizationField];
        const bindingValue = binding[bindingField];
        const equal = isObject(authorizationValue) || Array.isArray(authorizationValue)
          ? canonicalHash(authorizationValue) === canonicalHash(bindingValue)
          : authorizationValue === bindingValue;
        if (!equal) failures.push("authorization_binding_semantics_mismatch", `authorization_binding_field_mismatch:${authorizationField}`);
      }
      const disclosureAuthorizationRefs = binding.disclosures.map(({ disclosure_authorization_ref }) => disclosure_authorization_ref);
      const disclosureReservationRefs = binding.disclosures.map(({ disclosure_reservation_ref }) => disclosure_reservation_ref);
      if (canonicalHash(value.disclosure_authorization_refs) !== canonicalHash(disclosureAuthorizationRefs) ||
          canonicalHash(value.disclosure_reservation_refs) !== canonicalHash(disclosureReservationRefs)) {
        failures.push("authorization_disclosure_binding_mismatch");
      }
      if (canonicalHash(value.acknowledged_warning_codes) !== canonicalHash(binding.warning_codes)) failures.push("authorization_warning_binding_mismatch");
      if (Date.parse(value.expires_at) > Date.parse(binding.expires_at)) failures.push("authorization_binding_expiry_mismatch");
      if (canonicalHash(value.acknowledged_transaction_semantics) !== canonicalHash(binding.required_acknowledgement_codes)) {
        failures.push("authorization_transaction_semantics_mismatch");
      }
      const bindingDealId = binding.deal_ref?.object_id ?? null;
      if (value.deal_id !== bindingDealId) failures.push("authorization_binding_semantics_mismatch", "authorization_binding_field_mismatch:deal_id");
    }
    if (Date.parse(value.expires_at) <= (context.authorityServiceTime ?? 0)) failures.push("authorization_expired");
    return unique(failures);
  } catch {
    return ["action_authorization_malformed"];
  }
}

export function validateCancellationAuthorization(value, binding, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    failures.push(...refHashPairFailures(value, CANCELLATION_AUTHORIZATION_REF_HASH_PAIRS,
      "cancellation_authorization_ref_hash_mismatch"));
    if (!isHistoricalEvidence(context)) {
      failures.push(AUTHENTICATED_RESOLUTION_UNSUPPORTED);
      const currentPrincipalRevocationNonce = typeof context.principalRevocationNonceResolver === "function"
        ? context.principalRevocationNonceResolver(value.principal_id) : context.principalRevocationNonce;
      if (!Number.isInteger(currentPrincipalRevocationNonce) || currentPrincipalRevocationNonce < 0 ||
          value.principal_revocation_nonce !== currentPrincipalRevocationNonce) {
        failures.push("cancellation_principal_revocation_nonce_mismatch");
      }
      const derivation = binding && typeof context.cancellationReservedJudgmentsResolver === "function"
        ? context.cancellationReservedJudgmentsResolver(value.principal_id, binding) : null;
      const requiredReservedJudgments = derivation?.decisions;
      if (!isObject(derivation) || !binding ||
          !sameObjectRef(derivation.binding_ref, objectRef(binding, context)) ||
          canonicalHash(derivation.review_ref) !== canonicalHash(binding.execution_review_receipt_ref) ||
          derivation.review_hash !== binding.review_hash ||
          derivation.current_policy_hash !== binding.review_policy_hash ||
          !Array.isArray(requiredReservedJudgments)) {
        failures.push("cancellation_reserved_judgment_graph_unresolved");
      } else if (new Set(requiredReservedJudgments.map(canonicalText)).size !== requiredReservedJudgments.length ||
          canonicalHash([...requiredReservedJudgments].sort((left, right) =>
            Buffer.compare(Buffer.from(canonicalText(left)), Buffer.from(canonicalText(right))))) !==
            canonicalHash(requiredReservedJudgments) ||
          canonicalHash(value.reserved_judgments_decided) !== canonicalHash(requiredReservedJudgments)) {
        failures.push("cancellation_reserved_judgments_mismatch");
      }
    }
    const continuity = value.cancellation_credential_continuity_receipt_ref !== null;
    const exactCredential = value.original_credential_instance_key === value.cancellation_credential_instance_key &&
      value.original_executor_credential_binding_current_head_hash === value.cancellation_executor_credential_binding_head_hash;
    if (continuity === exactCredential) failures.push("cancellation_credential_continuity_invalid");
    if (!binding || binding.capability !== "cancel_receiver_action" ||
        !exactRef(value.execution_binding_set_ref, binding, context) || value.execution_binding_set_hash !== binding.binding_set_hash ||
        binding.cancellation_context === null) {
      failures.push("cancellation_binding_mismatch");
    } else {
      const cancellation = binding.cancellation_context;
      failures.push(...cancellationOriginalActionFailures(cancellation, binding, context));
      const shared = [
        "original_action_ref", "original_action_hash", "original_action_state_head_ref", "original_action_state_head_hash",
        "receiver_event_stream_state_head_ref", "receiver_event_stream_state_head_hash", "original_effect_id",
        "original_operation_locator", "expected_original_state", "cancellation_operation_kind",
        "receiver_account_commitment", "receiver_account_or_contract_scope", "cancellation_operation_namespace",
        "original_executor_credential_binding_core_ref", "original_executor_credential_binding_core_hash",
        "original_executor_credential_binding_head_ref", "original_executor_credential_binding_head_hash",
        "original_credential_instance_key", "original_credential_instance_core_ref", "original_credential_instance_core_hash",
        "original_executor_credential_binding_current_head_ref", "original_executor_credential_binding_current_head_hash",
        "cancellation_executor_credential_binding_head_ref", "cancellation_executor_credential_binding_head_hash",
        "cancellation_credential_instance_key", "cancellation_credential_instance_state_head_ref",
        "cancellation_credential_instance_state_head_hash", "cancellation_credential_continuity_receipt_ref",
        "cancellation_credential_continuity_receipt_hash", "cancellation_cost_attestation_ref",
        "cancellation_cost_attestation_hash", "cancellation_fee_source_state_head_ref",
        "cancellation_fee_source_state_head_hash", "cancellation_fee_source_generation",
        "safety_preparation_intent_ref", "safety_preparation_intent_hash"
      ];
      for (const field of shared) {
        if (canonicalHash(value[field]) !== canonicalHash(cancellation[field])) {
          failures.push("cancellation_binding_semantics_mismatch", `cancellation_binding_field_mismatch:${field}`);
        }
      }
      if (value.principal_id !== binding.principal_id || value.principal_occurrence_id !== binding.principal_occurrence_id ||
          value.cancellation_effect_id !== binding.effect_id ||
          value.receiver_id !== binding.ultimate_receiver || !sameObjectRef(value.lineage_commitment_ref, binding.lineage_commitment_ref) ||
          !sameObjectRef(value.required_confirmation_assurance_policy_ref, binding.confirmation_assurance_policy_ref) ||
          canonicalHash(value.acknowledged_warning_codes) !== canonicalHash(binding.warning_codes) ||
          Date.parse(value.expires_at) > Date.parse(binding.expires_at)) {
        failures.push("cancellation_binding_semantics_mismatch");
      }
    }
    return unique(failures);
  } catch {
    return ["cancellation_authorization_malformed"];
  }
}

export function validateAuthorityReservation(value, preparedAction, binding, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    failures.push(...refHashPairFailures(value, [
      ["execution_binding_set_ref", "execution_binding_set_hash"],
      ["authority_basis_ref", "authority_basis_hash"],
      ["lineage_commitment_ref", "lineage_commitment_hash"]
    ], "reservation_ref_hash_mismatch"));
    if (!preparedAction || !binding || validateActionRecord(preparedAction, context).length ||
        !exactRef(value.prepared_action_ref, preparedAction, context) ||
        !exactRef(value.execution_binding_set_ref, binding, context) || value.execution_binding_set_hash !== binding.binding_set_hash ||
        preparedAction.capability !== binding.capability) failures.push("reservation_context_mismatch");
    const commitment = context.lineageCommitment ?? resolveObject(context.objectResolver, value.lineage_commitment_ref);
    if (!commitment || commitment.schema !== "cairn.lineage_commitment.v0.1" ||
        !exactRef(value.lineage_commitment_ref, commitment, context) || validateLineageCommitment(commitment, context).length) {
      failures.push("reservation_lineage_commitment_unresolved");
    } else {
      const reservationBindingPairs = [
        ["principal_id", "principal_id"], ["action_control_key", "action_control_key"],
        ["lineage_commitment_hash", "lineage_commitment_hash"],
        ["expected_lineage_fence", "expected_lineage_activation_fence"],
        ["obligation_exposure_core_ref", "obligation_exposure_core_ref"],
        ["economic_resource_exposure_before_ref", "pre_reservation_resource_exposure_state_head_ref"],
        ["exposure_vector", "exposure_vector"]
      ];
      for (const [reservationField, bindingField] of reservationBindingPairs) {
        if (canonicalHash(value[reservationField]) !== canonicalHash(binding[bindingField])) {
          failures.push(`reservation_binding_field_mismatch:${reservationField}`);
        }
      }
      if (!sameObjectRef(value.lineage_commitment_ref, binding.lineage_commitment_ref) ||
          preparedAction.principal_id !== binding.principal_id ||
          !sameObjectRef(preparedAction.execution_binding_set_ref, value.execution_binding_set_ref) ||
          preparedAction.execution_binding_set_hash !== value.execution_binding_set_hash ||
          !sameObjectRef(preparedAction.lineage_commitment_ref, value.lineage_commitment_ref) ||
          preparedAction.lineage_commitment_hash !== value.lineage_commitment_hash ||
          !sameObjectRef(preparedAction.action_proposal_ref, binding.action_proposal_ref) ||
          preparedAction.action_proposal_hash !== binding.action_proposal_hash ||
          !sameObjectRef(preparedAction.effect_descriptor_ref, binding.effect_descriptor_ref) ||
          preparedAction.effect_id !== binding.effect_id) failures.push("reservation_prepared_action_mismatch");
      for (const field of ["principal_id", "principal_occurrence_id", "principal_authorized_lineage_id", "action_control_key",
        "action_proposal_hash", "effect_id"]) {
        if (commitment[field] !== binding[field]) failures.push(`reservation_commitment_field_mismatch:${field}`);
      }
      if (commitment.expected_activation_fence !== binding.expected_lineage_activation_fence ||
          value.expected_lineage_fence !== commitment.expected_activation_fence) failures.push("reservation_lineage_fence_binding_mismatch");
      if (!(Date.parse(value.reserved_at) < Date.parse(value.expires_at) &&
          Date.parse(value.expires_at) <= Date.parse(binding.expires_at) &&
          Date.parse(value.expires_at) <= Date.parse(commitment.expires_at))) failures.push("reservation_interval_invalid");
      const expectedReads = binding.disclosures.map(({ source_read_receipt_ref }) => source_read_receipt_ref);
      const expectedDisclosureReservations = binding.disclosures.map(({ disclosure_reservation_ref }) => disclosure_reservation_ref);
      const expectedGrantHeads = binding.data_grant_state_heads.map(({ current_state_head_ref }) => current_state_head_ref);
      if (canonicalHash(value.source_read_receipt_refs) !== canonicalHash(expectedReads) ||
          canonicalHash(value.disclosure_reservation_refs) !== canonicalHash(expectedDisclosureReservations) ||
          canonicalHash(value.data_grant_state_head_refs) !== canonicalHash(expectedGrantHeads)) {
        failures.push("reservation_binding_projection_mismatch");
      }
      if (context.authority && !exactRef(value.authority_basis_ref, context.authority, context)) failures.push("reservation_authority_basis_mismatch");
    }
    if (value.next_lineage_fence !== value.expected_lineage_fence + 1) failures.push("reservation_lineage_fence_invalid");
    const obligation = [value.obligation_exposure_core_ref, value.obligation_exposure_state_before_ref, value.obligation_exposure_state_after_ref];
    if (!(obligation.every(isNull) || obligation.every((item) => item !== null))) failures.push("reservation_obligation_union_invalid");
    const economic = [value.economic_resource_exposure_before_ref, value.economic_resource_exposure_after_ref];
    if (!(economic.every(isNull) || economic.every((item) => item !== null))) failures.push("reservation_economic_union_invalid");
    if (FINANCIAL_CAPABILITIES.has(preparedAction?.capability)) {
      if (obligation.some(isNull) || economic.some(isNull) || value.exposure_vector.length === 0) failures.push("reservation_financial_context_missing");
    } else if (obligation.some((item) => item !== null) || economic.some((item) => item !== null) || value.exposure_vector.length !== 0) {
      failures.push("reservation_nonfinancial_context_present");
    }
    if (binding) {
      const inventoryApplicable = FINANCIAL_CAPABILITIES.has(binding.capability) && binding.copy_ids.length > 0;
      const bindingInventory = !inventoryApplicable || binding.seller_inventory_stage === null ? null : {
        kind: binding.seller_inventory_stage,
        context_ref: binding.seller_inventory_context_ref,
        state_head_ref: binding.seller_inventory_state_head_ref,
        copy_lease_heads_root: binding.seller_copy_lease_heads_root,
        transition_receipt_ref: binding.seller_inventory_transition_receipt_ref
      };
      if ((inventoryApplicable && bindingInventory === null) ||
          canonicalHash(value.seller_inventory_context) !== canonicalHash(bindingInventory)) {
        failures.push("reservation_inventory_context_mismatch");
      }
    }
    return unique(failures);
  } catch {
    return ["authority_reservation_malformed"];
  }
}

export function confirmationChallengeHash(authority, binding, confirmation) {
  const bindingHash = authority?.schema === "cairn.agent_mandate.v0.3"
    ? null
    : binding?.binding_set_hash ?? null;
  return canonicalHash([
    "cairn-confirmation-v0.1",
    confirmation.authority_object_hash,
    bindingHash,
    confirmation.assurance_policy_hash,
    confirmation.relying_party_or_audience,
    authority?.confirmation_nonce,
    confirmation.expires_at
  ]);
}

function currentPolicyLifecycleFailures(reference, immutablePolicyRef, policyKind, evaluationTime, context) {
  const resolver = isHistoricalEvidence(context)
    ? context.policyLifecycleHistoryResolver ?? context.currentPolicyLifecycleResolver
    : context.currentPolicyLifecycleResolver;
  let current = null;
  if (typeof resolver === "function") current = resolver(immutablePolicyRef, policyKind);
  else if (resolver instanceof Map) {
    current = resolver.get(`${policyKind}:${canonicalText(immutablePolicyRef)}`) ?? null;
  }
  if (!isObject(current) || current.policy_kind !== policyKind || current.state !== "active" ||
      !sameObjectRef(current.policy_ref, immutablePolicyRef) || !sameObjectRef(current.current_head_ref, reference)) {
    return ["confirmation_lifecycle_current_active_mismatch"];
  }
  const evaluatedAt = Date.parse(evaluationTime);
  const validFrom = Date.parse(current.valid_from);
  const validUntil = current.valid_until === null ? Number.POSITIVE_INFINITY : Date.parse(current.valid_until);
  if (!Number.isFinite(evaluatedAt) || !Number.isFinite(validFrom) ||
      !(Number.isFinite(validUntil) || validUntil === Number.POSITIVE_INFINITY) ||
      evaluatedAt < validFrom || evaluatedAt >= validUntil) {
    return ["confirmation_lifecycle_current_active_mismatch"];
  }
  return [];
}

export function validateExecutionConfirmation(confirmation, authority, binding, gateRequest = null, context = {}) {
  try {
    const failures = validatePhase1Object(confirmation, context);
    if (failures.length) return failures;
    const policy = context.confirmationPolicy ?? resolveObject(context.objectResolver, confirmation.assurance_policy_ref);
    const verifierProfile = context.confirmationVerifierProfile ??
      resolveObject(context.objectResolver, confirmation.verifier_profile_ref);
    if (!authority || !binding || confirmation.principal_id !== binding.principal_id ||
        confirmation.principal_id !== authority.principal_id ||
        !exactRef(confirmation.authority_object_ref, authority, context)) {
      failures.push("confirmation_principal_or_authority_mismatch");
    }
    const mandateIssuance = authority?.schema === "cairn.agent_mandate.v0.3";
    if ((mandateIssuance && confirmation.execution_binding_set_ref !== null) ||
        (!mandateIssuance && !exactRef(confirmation.execution_binding_set_ref, binding, context))) {
      failures.push("confirmation_binding_branch_mismatch");
    }
    if (!policy || policy.schema !== "cairn.confirmation_assurance_policy.v0.1" ||
        validateResolvedSignedObject(policy, context).length || !exactRef(confirmation.assurance_policy_ref, policy, context) ||
        !sameObjectRef(confirmation.assurance_policy_ref, binding.confirmation_assurance_policy_ref) ||
        confirmation.assurance_policy_hash !== binding.confirmation_assurance_policy_hash ||
        !sameObjectRef(confirmation.assurance_policy_ref, authority?.required_confirmation_assurance_policy_ref)) {
      failures.push("confirmation_assurance_policy_mismatch");
    }
    if (!verifierProfile || verifierProfile.schema !== "cairn.confirmation_verifier_profile.v0.1" ||
        validateResolvedSignedObject(verifierProfile, context).length ||
        !exactRef(confirmation.verifier_profile_ref, verifierProfile, context) ||
        confirmation.verifier_id !== verifierProfile.verifier_id) {
      failures.push("confirmation_verifier_profile_mismatch");
    }
    if (!sameObjectRef(confirmation.assurance_policy_lifecycle_head_ref,
          binding.confirmation_assurance_policy_lifecycle_head_ref) ||
        confirmation.assurance_policy_lifecycle_head_hash !==
          binding.confirmation_assurance_policy_lifecycle_head_hash ||
        (gateRequest !== null &&
          (!sameObjectRef(confirmation.assurance_policy_lifecycle_head_ref,
            gateRequest.confirmation_assurance_policy_lifecycle_head_ref) ||
           confirmation.assurance_policy_lifecycle_head_hash !==
            gateRequest.confirmation_assurance_policy_lifecycle_head_hash ||
           !sameObjectRef(confirmation.verifier_profile_lifecycle_head_ref,
            gateRequest.confirmation_verifier_profile_lifecycle_head_ref) ||
           confirmation.verifier_profile_lifecycle_head_hash !==
            gateRequest.confirmation_verifier_profile_lifecycle_head_hash))) {
      failures.push("confirmation_lifecycle_mismatch");
    }
    if (policy) {
      if (!policy.applicable_capabilities.includes(binding.capability) ||
          !policy.allowed_methods.includes(confirmation.method) ||
          policy.relying_party_or_audience !== confirmation.relying_party_or_audience ||
          !policy.allowed_verifier_profile_refs.some((reference) =>
            sameObjectRef(reference, confirmation.verifier_profile_ref)) ||
          binding.allowed_confirmation_verifier_profile_refs_root !==
            canonicalHash(policy.allowed_verifier_profile_refs) ||
          (policy.require_user_presence && confirmation.user_presence !== true) ||
          (policy.require_user_verification && confirmation.user_verification !== true)) {
        failures.push("confirmation_policy_requirements_mismatch");
      }
    }
    if (verifierProfile &&
        (!verifierProfile.supported_methods.includes(confirmation.method) ||
         !verifierProfile.relying_party_or_audience_set.includes(confirmation.relying_party_or_audience))) {
      failures.push("confirmation_verifier_requirements_mismatch");
    }
    const evaluationTime = Date.parse(gateRequest?.requested_at ?? context.confirmationEvaluationTime ?? "");
    const evaluationTimestamp = gateRequest?.requested_at ?? context.confirmationEvaluationTime ?? "";
    const verifiedAt = Date.parse(confirmation.verified_at);
    const expiresAt = Date.parse(confirmation.expires_at);
    const authorityIssuedAt = Date.parse(authority?.issued_at ?? authority?.principal_signature?.signed_at);
    const authorityExpiresAt = Date.parse(
      mandateIssuance ? authority?.constraints?.expires_at : authority?.expires_at
    );
    if (!Number.isFinite(evaluationTime) || !Number.isFinite(authorityIssuedAt) || verifiedAt < authorityIssuedAt ||
        verifiedAt > evaluationTime || evaluationTime >= expiresAt ||
        !Number.isFinite(authorityExpiresAt) || expiresAt > authorityExpiresAt ||
        (policy && (verifiedAt < Date.parse(policy.issued_at) || evaluationTime >= Date.parse(policy.expires_at) ||
          (evaluationTime - verifiedAt) / 1000 > policy.maximum_evidence_age_seconds)) ||
        (verifierProfile && (verifiedAt < Date.parse(verifierProfile.issued_at) ||
          evaluationTime >= Date.parse(verifierProfile.expires_at)))) {
      failures.push("confirmation_freshness_mismatch");
    }
    failures.push(...currentPolicyLifecycleFailures(
      confirmation.assurance_policy_lifecycle_head_ref, confirmation.assurance_policy_ref,
      "confirmation_assurance", evaluationTimestamp, context
    ));
    failures.push(...currentPolicyLifecycleFailures(
      confirmation.verifier_profile_lifecycle_head_ref, confirmation.verifier_profile_ref,
      "confirmation_verifier", evaluationTimestamp, context
    ));
    if (confirmation.challenge_hash !== confirmationChallengeHash(authority, binding, confirmation)) {
      failures.push("confirmation_challenge_mismatch");
    }
    if (gateRequest !== null) {
      const requiredPolicies = [
        confirmation.assurance_policy_ref,
        confirmation.assurance_policy_lifecycle_head_ref,
        confirmation.verifier_profile_ref,
        confirmation.verifier_profile_lifecycle_head_ref
      ];
      if (requiredPolicies.some((reference) =>
        !gateRequest.policy_refs.some((candidate) => sameObjectRef(candidate, reference)))) {
        failures.push("confirmation_gate_policy_set_mismatch");
      }
    }
    return unique(failures);
  } catch {
    return ["confirmation_semantics_malformed"];
  }
}

export const PHASE1_GATE_CHECK_CODES = Object.freeze([
  "SCHEMA_SIGNATURE", "EXECUTION_RELEASE", "AUTHENTICATION_BRANCH", "DATA_GRANTS_DISCLOSURES",
  "EXECUTION_CONTROLS", "LIFECYCLES_KEYS", "NONCES_FENCES", "AUTHORITY_CONFIRMATION",
  "BINDING_EQUALITY", "BUSINESS_DEPENDENCIES", "REVIEWS_POLICIES", "RESERVED_JUDGMENTS",
  "LIMITS", "ECONOMIC_EXPOSURE", "RESERVATION_FENCES", "DUPLICATE_EFFECT_LINEAGE",
  "EXECUTOR_TARGET", "DOMAIN_POLICY", "ATOMIC_PRECONDITIONS"
]);

const GATE_WRAPPER_ROLES = new Set([
  "execution_release", "execution_integrity", "policy_lifecycle", "execution_control",
  "economic_resource", "business_state", "provider_identity", "provider_identity_trust_overlay",
  "policy", "executor_policy", "receiver_finality", "accounting_policy",
  "receiver_channel_policy", "receiver_sequence_selector", "checkout_dependency",
  "checkout_readiness", "checkout_group_state", "checkout_terms"
]);

const GATE_DEPENDENCY_STATE_EDGES = new Map([
  ["active", new Set(["paused", "restricted", "revoked", "expired"])],
  ["paused", new Set(["active", "restricted", "revoked", "expired"])],
  ["restricted", new Set(["active", "paused", "revoked", "expired"])],
  ["revoked", new Set()],
  ["expired", new Set()]
]);

export function gateDependencyKey(principalId, dependencyRole, subjectRef) {
  return canonicalHash({
    schema: "cairn.gate_dependency_key_preimage.v0.1",
    principal_id: principalId,
    dependency_role: dependencyRole,
    subject_ref: subjectRef
  });
}

function expectedGateDependencyAuthority(context, role) {
  if (context.gateDependencyAuthorityResolver instanceof Map) {
    return context.gateDependencyAuthorityResolver.get(role) ?? null;
  }
  if (typeof context.gateDependencyAuthorityResolver === "function") {
    return context.gateDependencyAuthorityResolver(role);
  }
  return null;
}

export function validateGateDependencyAttestation(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    if (validateResolvedSignedObject(value, context).length) {
      failures.push("gate_dependency_attestation_signature_invalid");
    }
    failures.push(...refHashPairFailures(value, [
      ["subject_ref", "subject_hash"]
    ], "gate_dependency_attestation_ref_hash_mismatch"));
    const evaluationAt = Date.parse(context.gateEvaluationTime ?? context.now);
    if (!GATE_WRAPPER_ROLES.has(value.dependency_role) ||
        expectedGateDependencyAuthority(context, value.dependency_role) !== value.issuing_authority_id ||
        Date.parse(value.valid_from) >= Date.parse(value.valid_until) ||
        Date.parse(value.issued_at) < Date.parse(value.valid_from) ||
        Date.parse(value.issued_at) >= Date.parse(value.valid_until) ||
        (Number.isFinite(evaluationAt) && Date.parse(value.issued_at) > evaluationAt)) {
      failures.push("gate_dependency_attestation_semantics_invalid");
    }
    return unique(failures);
  } catch {
    return ["gate_dependency_attestation_malformed"];
  }
}

export function validateGateDependencyStateHead(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    const source = resolveObject(context.objectResolver, value.source_ref);
    const evaluationAt = Date.parse(context.gateEvaluationTime ?? context.now);
    if (!GATE_WRAPPER_ROLES.has(value.dependency_role) ||
        (value.sequence === 0) !== (value.previous_head_hash === null) ||
        (value.sequence === 0 && value.state !== "active") ||
        value.source_hash !== value.source_ref.object_hash ||
        Date.parse(value.valid_from) >= Date.parse(value.valid_until) ||
        Date.parse(value.updated_at) < Date.parse(value.valid_from) ||
        Date.parse(value.updated_at) >= Date.parse(value.valid_until) ||
        (Number.isFinite(evaluationAt) && Date.parse(value.updated_at) > evaluationAt)) {
      failures.push("gate_dependency_state_semantics_invalid");
    }
    if (!source || !exactRef(value.source_ref, source, context) ||
        source.schema !== "cairn.gate_dependency_attestation.v0.1" ||
        validateGateDependencyAttestation(source, context).length ||
        source.principal_id !== value.principal_id ||
        source.dependency_role !== value.dependency_role || source.state !== value.state ||
        value.dependency_key !== gateDependencyKey(
          value.principal_id, value.dependency_role, source.subject_ref
        ) || Date.parse(value.valid_from) < Date.parse(source.valid_from) ||
        Date.parse(value.valid_until) > Date.parse(source.valid_until)) {
      failures.push("gate_dependency_state_source_mismatch");
    }
    if (value.sequence > 0) {
      const predecessorRef = {
        schema: value.schema, object_id: value.dependency_key, object_hash: value.previous_head_hash
      };
      const predecessor = typeof context.statePredecessorResolver === "function"
        ? context.statePredecessorResolver(predecessorRef) : resolveObject(context.objectResolver, predecessorRef);
      const predecessorSource = predecessor
        ? resolveObject(context.objectResolver, predecessor.source_ref) : null;
      if (!predecessor || !exactRef(predecessorRef, predecessor, context) ||
          validateResolvedSignedObject(predecessor, context).length ||
          predecessor.dependency_key !== value.dependency_key ||
          predecessor.principal_id !== value.principal_id ||
          predecessor.dependency_role !== value.dependency_role ||
          !predecessorSource || !exactRef(predecessor.source_ref, predecessorSource, context) ||
          validateGateDependencyAttestation(predecessorSource, context).length ||
          !source || !sameObjectRef(predecessorSource.subject_ref, source.subject_ref) ||
          !GATE_DEPENDENCY_STATE_EDGES.get(predecessor.state)?.has(value.state) ||
          value.sequence !== predecessor.sequence + 1 ||
          Date.parse(value.updated_at) < Date.parse(predecessor.updated_at) ||
          Date.parse(source.issued_at) < Date.parse(predecessorSource.issued_at)) {
        failures.push("gate_dependency_state_predecessor_mismatch");
      }
    }
    return unique(failures);
  } catch {
    return ["gate_dependency_state_malformed"];
  }
}

export function validateGateDependencyManifest(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    failures.push(...refHashPairFailures(value, [
      ["execution_binding_set_ref", "execution_binding_set_hash"]
    ], "gate_dependency_manifest_ref_hash_mismatch"));
    if (Date.parse(value.created_at) >= Date.parse(value.expires_at)) {
      failures.push("gate_dependency_manifest_interval_invalid");
    }
    return unique(failures);
  } catch {
    return ["gate_dependency_manifest_malformed"];
  }
}

function sortedUniqueRefs(refs) {
  return [...new Map(refs.filter((reference) => reference !== null)
    .map((reference) => [canonicalText(reference), reference])).values()]
    .sort((left, right) => canonicalText(left).localeCompare(canonicalText(right)));
}

export function gateRequiredHeadRefs(request, binding) {
  if (!request || !binding) return [];
  return sortedUniqueRefs([
    binding.execution_release_state_head_ref,
    binding.cancellation_context?.original_action_state_head_ref ?? null,
    request.execution_integrity_state_head_ref,
    request.confirmation_assurance_policy_lifecycle_head_ref,
    request.confirmation_verifier_profile_lifecycle_head_ref,
    ...request.reservation_receipt_refs,
    ...request.current_control_head_refs,
    request.current_connection_head_ref,
    request.current_compartment_head_ref,
    request.current_economic_resource_head_ref,
    ...request.current_data_grant_head_refs,
    ...request.current_business_state_head_refs,
    ...request.current_provider_identity_head_refs,
    ...request.current_provider_identity_trust_overlay_head_refs,
    ...request.policy_refs,
    request.executor_policy_ref,
    request.receiver_finality_profile_ref,
    request.accounting_policy_ref,
    request.receiver_channel_policy_ref,
    request.receiver_sequence_epoch_selector_ref,
    ...request.checkout_dependency_refs,
    request.checkout_readiness_receipt_ref,
    request.checkout_group_state_head_ref,
    request.checkout_terms_receipt_ref
  ]);
}

function gateDependencyRoleEntries(request, binding) {
  if (!request || !binding) return [];
  const scalars = [
    ["execution_release", binding.execution_release_state_head_ref],
    ["execution_integrity", request.execution_integrity_state_head_ref],
    ["policy_lifecycle", request.confirmation_assurance_policy_lifecycle_head_ref],
    ["policy_lifecycle", request.confirmation_verifier_profile_lifecycle_head_ref],
    ["execution_control", request.current_control_head_refs],
    ["connection", request.current_connection_head_ref],
    ["compartment", request.current_compartment_head_ref],
    ["economic_resource", request.current_economic_resource_head_ref],
    ["data_grant", request.current_data_grant_head_refs],
    ["business_state", request.current_business_state_head_refs],
    ["provider_identity", request.current_provider_identity_head_refs],
    ["provider_identity_trust_overlay", request.current_provider_identity_trust_overlay_head_refs],
    ["authority_reservation", request.reservation_receipt_refs],
    ["policy", request.policy_refs],
    ["executor_policy", request.executor_policy_ref],
    ["receiver_finality", request.receiver_finality_profile_ref],
    ["accounting_policy", request.accounting_policy_ref],
    ["receiver_channel_policy", request.receiver_channel_policy_ref],
    ["receiver_sequence_selector", request.receiver_sequence_epoch_selector_ref],
    ["checkout_dependency", request.checkout_dependency_refs],
    ["checkout_readiness", request.checkout_readiness_receipt_ref],
    ["checkout_group_state", request.checkout_group_state_head_ref],
    ["checkout_terms", request.checkout_terms_receipt_ref]
  ];
  return scalars.flatMap(([role, refs]) => (Array.isArray(refs) ? refs : [refs])
    .filter((reference) => reference !== null).map((reference) => ({ role, reference })));
}

function gateDependencyGraph(request, binding, context = {}) {
  const authenticationFailures = [];
  const eligibilityFailures = [];
  const evidenceRefs = [];
  const roleStates = new Map();
  const evaluationAt = Date.parse(context.gateEvaluationTime ?? request?.requested_at);
  const dependencyContext = {
    ...context,
    now: Number.isFinite(evaluationAt) ? new Date(evaluationAt).toISOString().replace(".000Z", "Z") : context.now,
    requireDependencySignatures: true,
    requireCurrentKeyEligibility: true
  };
  for (const { role, reference } of gateDependencyRoleEntries(request, binding)) {
    const roleState = roleStates.get(role) ?? { authenticationFailures: [], eligible: true, evidenceRefs: [] };
    roleState.evidenceRefs.push(reference);
    roleStates.set(role, roleState);
    const object = resolveObject(context.objectResolver, reference);
    evidenceRefs.push(reference);
    if (!object || !exactRef(reference, object, context)) {
      authenticationFailures.push(`gate_request_dependency_unresolved:${role}`);
      roleState.authenticationFailures.push("unresolved");
      continue;
    }
    if (validateResolvedSignedObject(object, dependencyContext).length) {
      authenticationFailures.push(`gate_request_dependency_signature_invalid:${role}`);
      roleState.authenticationFailures.push("signature_invalid");
      continue;
    }
    if (object.schema === "cairn.gate_dependency_state_head.v0.1") {
      const roleMatches = object.dependency_role === role ||
        (role === "policy" && object.dependency_role === "policy_lifecycle");
      const source = resolveObject(context.objectResolver, object.source_ref);
      if (!roleMatches || object.principal_id !== binding?.principal_id ||
          validateGateDependencyStateHead(object, dependencyContext).length ||
          !source || source.schema !== "cairn.gate_dependency_attestation.v0.1" ||
          !exactRef(object.source_ref, source, context) || object.source_hash !== source.attestation_hash ||
          validateGateDependencyAttestation(source, dependencyContext).length ||
          source.principal_id !== object.principal_id || source.dependency_role !== object.dependency_role ||
          object.dependency_key !== gateDependencyKey(
            object.principal_id, object.dependency_role, source.subject_ref
          ) || object.state !== source.state ||
          Date.parse(object.valid_from) < Date.parse(source.valid_from) ||
          Date.parse(object.valid_until) > Date.parse(source.valid_until)) {
        authenticationFailures.push(`gate_request_dependency_semantics_invalid:${role}`);
        roleState.authenticationFailures.push("semantics_invalid");
        continue;
      }
      evidenceRefs.push(object.source_ref);
      roleState.evidenceRefs.push(object.source_ref);
      if (object.state !== "active" || !Number.isFinite(evaluationAt) ||
          evaluationAt < Date.parse(object.valid_from) || evaluationAt >= Date.parse(object.valid_until)) {
        eligibilityFailures.push(role);
        roleState.eligible = false;
      }
      continue;
    }
    const allowedSchemas = new Map([
      ["authority_reservation", new Set(["cairn.authority_reservation.v0.2"])],
      ["execution_control", new Set(["cairn.execution_control_state_head.v0.1"])],
      ["connection", new Set(["cairn.agent_connection_state_head.v0.1"])],
      ["compartment", new Set(["cairn.compartment_state_head.v0.1"])],
      ["data_grant", new Set(["cairn.data_grant_state_head.v0.1"])],
      ["policy", new Set([
        "cairn.confirmation_assurance_policy.v0.1", "cairn.confirmation_verifier_profile.v0.1"
      ])]
    ]).get(role);
    if (!allowedSchemas?.has(object.schema) || intrinsicObjectFailures(object, dependencyContext).length) {
      authenticationFailures.push(`gate_request_dependency_semantics_invalid:${role}`);
      roleState.authenticationFailures.push("semantics_invalid");
      continue;
    }
    if (["cairn.execution_control_state_head.v0.1", "cairn.agent_connection_state_head.v0.1",
      "cairn.compartment_state_head.v0.1", "cairn.data_grant_state_head.v0.1"].includes(object.schema) &&
      ![object.global_state, object.state].includes("active")) {
      eligibilityFailures.push(role);
      roleState.eligible = false;
    }
  }
  return {
    authenticationFailures: unique(authenticationFailures),
    eligibilityFailures: unique(eligibilityFailures),
    evidenceRefs: sortedUniqueRefs(evidenceRefs),
    roleStates
  };
}

export function evaluateGateChecks(request, binding, authority, confirmation, context = {}) {
  const graph = gateDependencyGraph(request, binding, context);
  const coreEvidence = sortedUniqueRefs([
    request?.dependency_manifest_ref ?? null,
    binding ? objectRef(binding, context) : null,
    authority ? objectRef(authority, context) : null,
    confirmation ? objectRef(confirmation, context) : null
  ]);
  const rolePass = (...roles) => roles.every((role) => {
    const state = graph.roleStates.get(role);
    return Boolean(state) && state.authenticationFailures.length === 0 && state.eligible;
  });
  const roleEvidence = (...roles) => sortedUniqueRefs([
    ...coreEvidence,
    ...roles.flatMap((role) => graph.roleStates.get(role)?.evidenceRefs ?? [])
  ]);
  const bindingFailures = binding ? validateBindingSet(binding, context) : ["binding_missing"];
  let authorityFailures = ["authority_missing"];
  if (authority?.schema === "cairn.action_authorization.v0.2") {
    authorityFailures = validateActionAuthorization(authority, binding, context);
  } else if (authority?.schema === "cairn.cancellation_authorization.v0.1") {
    authorityFailures = validateCancellationAuthorization(authority, binding, context);
  } else if (authority?.schema === "cairn.agent_mandate.v0.3") {
    authorityFailures = validateMandate(authority, context);
  }
  const confirmationFailures = confirmation
    ? validateExecutionConfirmation(confirmation, authority, binding, request, context)
    : ["confirmation_missing"];
  const reservationFailures = [];
  for (const reservationRef of request?.reservation_receipt_refs ?? []) {
    const reservation = resolveObject(context.objectResolver, reservationRef);
    const preparedAction = resolveObject(context.objectResolver, reservation?.prepared_action_ref);
    if (!reservation || !preparedAction ||
        validateResolvedSignedObject(reservation, context).length ||
        validateResolvedSignedObject(preparedAction, context).length ||
        validateAuthorityReservation(reservation, preparedAction, binding, {
          ...context, authority, lineageCommitment: context.lineageCommitment ??
            resolveObject(context.objectResolver, binding?.lineage_commitment_ref)
        }).length) {
      reservationFailures.push("reservation_invalid");
    }
  }
  const noBindingFailures = (...prefixes) => !bindingFailures.some((failure) =>
    prefixes.some((prefix) => failure.includes(prefix)));
  const authorityOkay = authorityFailures.length === 0;
  const confirmationOkay = confirmationFailures.length === 0;
  const reservationsOkay = reservationFailures.length === 0;
  const allAuthenticated = graph.authenticationFailures.length === 0 &&
    [request, binding, authority, confirmation].every((object) =>
      object && validateResolvedSignedObject(object, context).length === 0);
  const checks = new Map([
    ["SCHEMA_SIGNATURE", [allAuthenticated, roleEvidence(...graph.roleStates.keys())]],
    ["EXECUTION_RELEASE", [rolePass("execution_release"), roleEvidence("execution_release")]],
    ["AUTHENTICATION_BRANCH", [noBindingFailures("actor", "runtime", "connection", "principal"),
      roleEvidence("connection")]],
    ["DATA_GRANTS_DISCLOSURES", [noBindingFailures("data_grant", "disclosure") && rolePass("data_grant"),
      roleEvidence("data_grant")]],
    ["EXECUTION_CONTROLS", [rolePass("execution_control"), roleEvidence("execution_control")]],
    ["LIFECYCLES_KEYS", [rolePass("policy_lifecycle", "provider_identity", "provider_identity_trust_overlay"),
      roleEvidence("policy_lifecycle", "provider_identity", "provider_identity_trust_overlay")]],
    ["NONCES_FENCES", [authorityOkay && reservationsOkay, roleEvidence("authority_reservation")]],
    ["AUTHORITY_CONFIRMATION", [authorityOkay && confirmationOkay, coreEvidence]],
    ["BINDING_EQUALITY", [bindingFailures.length === 0, coreEvidence]],
    ["BUSINESS_DEPENDENCIES", [rolePass("business_state", "provider_identity", "provider_identity_trust_overlay") &&
      request?.current_seller_copy_lease_heads_root === null,
      roleEvidence("business_state", "provider_identity", "provider_identity_trust_overlay")]],
    ["REVIEWS_POLICIES", [rolePass("policy", "executor_policy"), roleEvidence("policy", "executor_policy")]],
    ["RESERVED_JUDGMENTS", [authorityOkay, coreEvidence]],
    ["LIMITS", [rolePass("compartment", "economic_resource", "accounting_policy"),
      roleEvidence("compartment", "economic_resource", "accounting_policy")]],
    ["ECONOMIC_EXPOSURE", [rolePass("compartment", "economic_resource") && reservationsOkay,
      roleEvidence("compartment", "economic_resource", "authority_reservation")]],
    ["RESERVATION_FENCES", [reservationsOkay, roleEvidence("authority_reservation")]],
    ["DUPLICATE_EFFECT_LINEAGE", [rolePass("execution_integrity"), roleEvidence("execution_integrity")]],
    ["EXECUTOR_TARGET", [rolePass("executor_policy") && typeof binding?.executor_target === "string",
      roleEvidence("executor_policy")]],
    ["DOMAIN_POLICY", [rolePass("policy", "accounting_policy", "receiver_channel_policy", "receiver_finality"),
      roleEvidence("policy", "accounting_policy", "receiver_channel_policy", "receiver_finality")]],
    ["ATOMIC_PRECONDITIONS", [rolePass("checkout_dependency", "checkout_readiness", "checkout_group_state", "checkout_terms") &&
      reservationsOkay,
      roleEvidence("checkout_dependency", "checkout_readiness", "checkout_group_state", "checkout_terms", "authority_reservation")]]
  ]);
  const phase1UnsupportedChecks = new Set([
    "EXECUTION_CONTROLS", "BUSINESS_DEPENDENCIES", "REVIEWS_POLICIES", "RESERVED_JUDGMENTS", "LIMITS",
    "ECONOMIC_EXPOSURE", "DUPLICATE_EFFECT_LINEAGE", "EXECUTOR_TARGET",
    "DOMAIN_POLICY", "ATOMIC_PRECONDITIONS"
  ]);
  return PHASE1_GATE_CHECK_CODES.map((code) => {
    const [pass, evidenceRefs] = checks.get(code);
    return {
      code,
      decision: pass && !phase1UnsupportedChecks.has(code) ? "pass" : "deny",
      evidence_refs: evidenceRefs
    };
  });
}

const GATE_DEPENDENCY_ARRAY_FIELDS = Object.freeze([
  "reservation_receipt_refs", "current_control_head_refs", "current_data_grant_head_refs",
  "current_business_state_head_refs", "current_provider_identity_head_refs",
  "current_provider_identity_trust_overlay_head_refs", "policy_refs", "checkout_dependency_refs"
]);

const GATE_DEPENDENCY_SCALAR_FIELDS = Object.freeze([
  "execution_integrity_state_head_ref", "confirmation_assurance_policy_lifecycle_head_ref",
  "confirmation_verifier_profile_lifecycle_head_ref", "current_connection_head_ref",
  "current_compartment_head_ref", "current_economic_resource_head_ref",
  "current_seller_copy_lease_heads_root", "executor_policy_ref", "receiver_finality_profile_ref",
  "accounting_policy_ref", "receiver_channel_policy_ref", "receiver_sequence_epoch_selector_ref",
  "checkout_readiness_receipt_ref", "checkout_group_state_head_ref", "checkout_terms_receipt_ref"
]);

function gateDependencyProjectionFailures(request, binding, authority, confirmation, context) {
  const manifest = resolveObject(context.objectResolver, request.dependency_manifest_ref);
  if (!manifest || manifest.schema !== "cairn.gate_dependency_manifest.v0.1" ||
      !exactRef(request.dependency_manifest_ref, manifest, context) ||
      request.dependency_manifest_hash !== manifest.manifest_hash ||
      validateResolvedSignedObject(manifest, context).length ||
      validateGateDependencyManifest(manifest, context).length) {
    return ["gate_request_dependency_manifest_unresolved"];
  }
  const failures = [];
  if (manifest.principal_id !== binding?.principal_id ||
      !sameObjectRef(manifest.execution_binding_set_ref, request.execution_binding_set_ref) ||
      manifest.execution_binding_set_hash !== request.execution_binding_set_hash ||
      !sameObjectRef(manifest.authority_basis_ref, request.authority_basis_ref) ||
      !sameObjectRef(manifest.confirmation_receipt_ref, request.confirmation_receipt_ref) ||
      !sameObjectRef(manifest.execution_release_state_head_ref, binding?.execution_release_state_head_ref) ||
      (authority && !sameObjectRef(manifest.authority_basis_ref, objectRef(authority, context))) ||
      (confirmation && !sameObjectRef(manifest.confirmation_receipt_ref, objectRef(confirmation, context)))) {
    failures.push("gate_request_dependency_manifest_binding_mismatch");
  }
  if (Date.parse(manifest.created_at) > Date.parse(request.requested_at) ||
      Date.parse(manifest.expires_at) <= Date.parse(request.requested_at)) {
    failures.push("gate_request_dependency_manifest_interval_mismatch");
  }
  for (const field of GATE_DEPENDENCY_ARRAY_FIELDS) {
    if (!Array.isArray(manifest[field]) ||
        canonicalHash(sortedUniqueRefs(request[field])) !== canonicalHash(sortedUniqueRefs(manifest[field]))) {
      failures.push(`gate_request_dependency_projection_mismatch:${field}`);
    }
  }
  for (const field of GATE_DEPENDENCY_SCALAR_FIELDS) {
    if (!Object.hasOwn(manifest, field) ||
        canonicalHash(request[field]) !== canonicalHash(manifest[field])) {
      failures.push(`gate_request_dependency_projection_mismatch:${field}`);
    }
  }
  return failures;
}

export function gateEvaluatedHeadRoot(refs) {
  return canonicalHash({
    schema: "cairn.gate_evaluated_head_set_preimage.v0.1",
    evaluated_head_refs: sortedUniqueRefs(refs)
  });
}

export function gateBusinessStateRoot(refs) {
  return canonicalHash({
    schema: "cairn.gate_business_state_set_preimage.v0.1",
    current_business_state_head_refs: sortedUniqueRefs(refs)
  });
}

export function gateCheckoutDependencyRoot(request) {
  return canonicalHash({
    schema: "cairn.gate_checkout_dependency_set_preimage.v0.1",
    checkout_dependency_refs: sortedUniqueRefs([
      ...request.checkout_dependency_refs,
      request.checkout_readiness_receipt_ref,
      request.checkout_group_state_head_ref,
      request.checkout_terms_receipt_ref
    ])
  });
}

function resolveCurrentHead(context, reference, evaluationTime = context.gateEvaluationTime ?? context.now) {
  if (typeof context.currentHeadResolver === "function") return context.currentHeadResolver(reference, evaluationTime);
  if (context.currentHeadResolver instanceof Map) {
    return context.currentHeadResolver.get(canonicalText({ schema: reference.schema, object_id: reference.object_id })) ?? null;
  }
  return null;
}

export function validateGateRequest(value, binding, authority, confirmation, context = {}) {
  try {
    const liveContext = isHistoricalEvidence(context)
      ? context
      : { ...context, requireDependencySignatures: true, requireCurrentKeyEligibility: true };
    const failures = validatePhase1Object(value, liveContext);
    if (failures.length) return failures;
    failures.push(AUTHENTICATED_RESOLUTION_UNSUPPORTED);
    if (validateResolvedSignedObject(value, liveContext).length) {
      failures.push("gate_request_signature_invalid");
    }
    failures.push(...refHashPairFailures(value, [
      ["execution_binding_set_ref", "execution_binding_set_hash"],
      ["dependency_manifest_ref", "dependency_manifest_hash"],
      ["confirmation_assurance_policy_lifecycle_head_ref", "confirmation_assurance_policy_lifecycle_head_hash"],
      ["confirmation_verifier_profile_lifecycle_head_ref", "confirmation_verifier_profile_lifecycle_head_hash"]
    ], "gate_request_ref_hash_mismatch"));
    if (!binding || !exactRef(value.execution_binding_set_ref, binding, liveContext) || value.execution_binding_set_hash !== binding.binding_set_hash ||
        value.principal_id !== binding.principal_id || value.action_control_key !== binding.action_control_key) failures.push("gate_request_binding_mismatch");
    if (binding && validateResolvedSignedObject(binding, liveContext).length) {
      failures.push("gate_request_binding_signature_invalid");
    }
    if (authority && validateResolvedSignedObject(authority, liveContext).length) {
      failures.push("gate_request_authority_signature_invalid");
    }
    if (confirmation && validateResolvedSignedObject(confirmation, liveContext).length) {
      failures.push("gate_request_confirmation_signature_invalid");
    }
    failures.push(...gateDependencyProjectionFailures(value, binding, authority, confirmation, liveContext));
    const requiredHeadRefs = gateRequiredHeadRefs(value, binding);
    if (!isHistoricalEvidence(context) && (requiredHeadRefs.length > 128 || requiredHeadRefs.some((reference) =>
      !sameObjectRef(resolveCurrentHead(liveContext, reference), reference)))) {
      failures.push("gate_request_current_head_set_mismatch");
    }
    const dependencyGraph = gateDependencyGraph(value, binding, liveContext);
    failures.push(...dependencyGraph.authenticationFailures);
    const expectedGrantHeads = sortedUniqueRefs(binding?.data_grant_state_heads?.map(
      ({ current_state_head_ref }) => current_state_head_ref
    ) ?? []);
    if (canonicalHash(sortedUniqueRefs(value.current_data_grant_head_refs)) !== canonicalHash(expectedGrantHeads) ||
        !sameObjectRef(value.execution_integrity_state_head_ref, binding?.execution_integrity_state_head_ref) ||
        canonicalHash(value.current_connection_head_ref) !== canonicalHash(binding?.connection_state_head_ref) ||
        !value.current_control_head_refs.some((reference) => sameObjectRef(reference, binding?.execution_control_state_head_ref)) ||
        !sameObjectRef(value.receiver_finality_profile_ref, binding?.receiver_finality_profile_ref) ||
        canonicalHash(value.accounting_policy_ref) !== canonicalHash(binding?.accounting_policy_ref) ||
        canonicalHash(value.receiver_channel_policy_ref) !== canonicalHash(binding?.receiver_channel_policy_ref) ||
        !sameObjectRef(value.receiver_sequence_epoch_selector_ref, binding?.receiver_sequence_epoch_selector_state_head_ref) ||
        canonicalHash(value.current_seller_copy_lease_heads_root) !== canonicalHash(binding?.seller_copy_lease_heads_root)) {
      failures.push("gate_request_complete_dependency_set_mismatch");
    }
    if (!authority || !sameObjectRef(value.authority_basis_ref, objectRef(authority, liveContext))) {
      failures.push("gate_request_authority_mismatch");
    } else if (binding?.capability === "cancel_receiver_action") {
      if (authority.schema !== "cairn.cancellation_authorization.v0.1" ||
          validateCancellationAuthorization(authority, binding, liveContext).length ||
          !sameObjectRef(value.receiver_finality_profile_ref, binding.receiver_finality_profile_ref) ||
          !sameObjectRef(value.receiver_finality_profile_ref, binding.cancellation_context?.cancellation_finality_profile_ref)) {
        failures.push("gate_request_cancellation_authority_mismatch");
      }
    } else if (authority.schema === "cairn.action_authorization.v0.2") {
      if (validateActionAuthorization(authority, binding, liveContext).length ||
          !sameObjectRef(authority.execution_binding_set_ref, value.execution_binding_set_ref)) {
        failures.push("gate_request_authority_binding_mismatch");
      }
    } else if (authority.schema === "cairn.agent_mandate.v0.3") {
      if (validateMandate(authority, liveContext).length) failures.push("gate_request_authority_semantics_invalid");
    } else {
      failures.push("gate_request_authority_schema_invalid");
    }
    if (!confirmation || !sameObjectRef(value.confirmation_receipt_ref, objectRef(confirmation, liveContext))) {
      failures.push("gate_request_confirmation_mismatch");
    } else {
      failures.push(...validateExecutionConfirmation(confirmation, authority, binding, value, liveContext)
        .map((code) => `gate_request_${code}`));
    }
    if (authority?.schema === "cairn.agent_mandate.v0.3") {
      const commitment = liveContext.lineageCommitment ?? resolveObject(liveContext.objectResolver, binding?.lineage_commitment_ref);
      if (!commitment || !exactRef(binding?.lineage_commitment_ref, commitment, liveContext)) {
        failures.push("gate_request_mandate_commitment_unresolved");
      } else {
        if (validateResolvedSignedObject(commitment, liveContext).length) {
          failures.push("gate_request_lineage_commitment_signature_invalid");
        }
        failures.push(...mandateBindingFailures(authority, commitment, binding, liveContext)
          .map((code) => `gate_request_${code}`));
      }
    }
    const checkout = [value.checkout_readiness_receipt_ref, value.checkout_group_state_head_ref, value.checkout_terms_receipt_ref];
    if (binding?.checkout_role === null && checkout.some((item) => item !== null)) failures.push("gate_request_checkout_dependency_invalid");
    if (binding?.checkout_role === "terms_acceptance" && value.checkout_readiness_receipt_ref === null) failures.push("gate_request_checkout_readiness_missing");
    if (binding?.checkout_role === "payment" && (value.checkout_group_state_head_ref === null || value.checkout_terms_receipt_ref === null)) {
      failures.push("gate_request_checkout_payment_dependency_missing");
    }
    return unique(failures);
  } catch {
    return ["gate_request_malformed"];
  }
}

export function validateGateResult(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    failures.push(AUTHENTICATED_RESOLUTION_UNSUPPORTED);
    if (validateResolvedSignedObject(value, context).length) {
      failures.push("gate_result_signature_invalid");
    }
    failures.push(...refHashPairFailures(value, [
      ["gate_request_ref", "gate_request_hash"],
      ["execution_binding_set_ref", "execution_binding_set_hash"]
    ], "gate_result_ref_hash_mismatch"));
    const gateRequest = context.gateRequest ?? resolveObject(context.objectResolver, value.gate_request_ref);
    const binding = context.binding ?? context.executionBindingSet ??
      resolveObject(context.objectResolver, value.execution_binding_set_ref);
    const authority = context.authority ??
      resolveObject(context.objectResolver, gateRequest?.authority_basis_ref);
    const confirmation = context.confirmation ?? context.confirmationReceipt ??
      resolveObject(context.objectResolver, gateRequest?.confirmation_receipt_ref);
    const lineageCommitment = context.lineageCommitment ??
      resolveObject(context.objectResolver, binding?.lineage_commitment_ref);
    const evaluationContext = {
      ...context,
      now: value.evaluated_at,
      gateEvaluationTime: value.evaluated_at,
      confirmationEvaluationTime: value.evaluated_at,
      authorityServiceTime: Date.parse(value.evaluated_at),
      requireDependencySignatures: true,
      requireCurrentKeyEligibility: true
    };
    if (!gateRequest || gateRequest.schema !== "cairn.gate_request.v0.2" ||
        validatePhase1Object(gateRequest, context).length || !exactRef(value.gate_request_ref, gateRequest, context) ||
        value.gate_request_hash !== gateRequest.request_hash) {
      failures.push("gate_result_request_mismatch");
    }
    if (gateRequest && validateResolvedSignedObject(gateRequest, context).length) {
      failures.push("gate_result_request_signature_invalid");
    }
    if (!binding || binding.schema !== "cairn.execution_binding_set.v0.1" ||
        validateBindingSet(binding, context).length || !exactRef(value.execution_binding_set_ref, binding, context) ||
        value.execution_binding_set_hash !== binding.binding_set_hash) {
      failures.push("gate_result_binding_mismatch");
    }
    if (gateRequest && binding) {
      failures.push(...validateGateRequest(gateRequest, binding, authority, confirmation, {
        ...evaluationContext, lineageCommitment
      }).map((code) => `gate_result_${code}`));
    }
    if (gateRequest && binding &&
        (!exactRef(gateRequest.execution_binding_set_ref, binding, context) ||
         gateRequest.execution_binding_set_hash !== binding.binding_set_hash ||
         gateRequest.principal_id !== binding.principal_id ||
         gateRequest.action_control_key !== binding.action_control_key)) {
      failures.push("gate_result_request_binding_mismatch");
    }
    const expectedHeads = gateRequiredHeadRefs(gateRequest, binding);
    const actualCodes = value.check_results.map(({ code }) => code);
    const expectedCodes = [...PHASE1_GATE_CHECK_CODES];
    if (canonicalHash(value.evaluated_head_refs) !== canonicalHash(expectedHeads) ||
        value.evaluated_nonce_and_fence_root !== gateEvaluatedHeadRoot(expectedHeads) ||
        value.business_state_root !== gateBusinessStateRoot(gateRequest?.current_business_state_head_refs ?? []) ||
        value.checkout_dependency_root !== gateCheckoutDependencyRoot(gateRequest ?? {
          checkout_dependency_refs: [], checkout_readiness_receipt_ref: null,
          checkout_group_state_head_ref: null, checkout_terms_receipt_ref: null
        })) {
      failures.push("gate_result_complete_head_commitment_mismatch");
    }
    const expectedCheckResults = evaluateGateChecks(
      gateRequest, binding, authority, confirmation, { ...evaluationContext, lineageCommitment }
    );
    const expectedDecision = expectedCheckResults.every(({ decision }) => decision === "pass") ? "allow" : "deny";
    if (canonicalHash(actualCodes) !== canonicalHash(expectedCodes) ||
        canonicalHash(value.check_results) !== canonicalHash(expectedCheckResults) ||
        value.decision !== expectedDecision) {
      failures.push("gate_result_check_set_mismatch");
    }
    const requestedAt = Date.parse(gateRequest?.requested_at);
    const evaluatedAt = Date.parse(value.evaluated_at);
    const expiresAt = Date.parse(value.expires_at);
    const requestSignedAt = Date.parse(gateRequest?.gate_service_signature?.signed_at);
    const resultSignedAt = Date.parse(value.gate_service_signature?.signed_at);
    const bindingCreatedAt = Date.parse(binding?.created_at);
    const bindingSignedAt = Date.parse(binding?.binding_service_signature?.signed_at);
    const bindingExpiresAt = Date.parse(binding?.expires_at);
    const manifest = resolveObject(context.objectResolver, gateRequest?.dependency_manifest_ref);
    const authorityDeadlines = [
      bindingExpiresAt,
      Date.parse(authority?.expires_at),
      Date.parse(confirmation?.expires_at),
      Date.parse(manifest?.expires_at),
      ...gateRequiredHeadRefs(gateRequest, binding).map((reference) => {
        const dependency = resolveObject(context.objectResolver, reference);
        return Date.parse(dependency?.valid_until ?? dependency?.expires_at);
      })
    ].filter(Number.isFinite);
    const authorityDeadline = authorityDeadlines.length ? Math.min(...authorityDeadlines) : Number.NaN;
    if (![requestedAt, evaluatedAt, expiresAt, requestSignedAt, resultSignedAt,
      bindingCreatedAt, bindingSignedAt, bindingExpiresAt, authorityDeadline].every(Number.isFinite) ||
        requestedAt > requestSignedAt || requestSignedAt > evaluatedAt ||
        bindingCreatedAt > evaluatedAt || bindingSignedAt > evaluatedAt ||
        evaluatedAt >= expiresAt || resultSignedAt < evaluatedAt || resultSignedAt >= expiresAt ||
        expiresAt > authorityDeadline) {
      failures.push("gate_result_interval_invalid");
    }
    return unique(failures);
  } catch {
    return ["gate_result_malformed"];
  }
}

export function validateActionRecord(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    failures.push(...refHashPairFailures(value, [
      ["execution_binding_set_ref", "execution_binding_set_hash"],
      ["lineage_commitment_ref", "lineage_commitment_hash"],
      ["action_proposal_ref", "action_proposal_hash"]
    ], "action_record_ref_hash_mismatch"));
    return unique(failures);
  } catch {
    return ["action_record_malformed"];
  }
}

export function validateActionReceipt(value, before, after, binding, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    for (const [name, object] of [["before", before], ["after", after], ["binding", binding]]) {
      failures.push(...validatePhase1Object(object, context).map((code) => `action_receipt_${name}_${code}`));
    }
    if (value.state_before !== before?.state || value.state_after !== after?.state ||
        !ACTION_EDGES.get(before?.state)?.has(after?.state)) failures.push("action_receipt_transition_invalid");
    if (!binding || !exactRef(value.execution_binding_set_ref, binding, context) || value.execution_binding_set_hash !== binding.binding_set_hash) {
      failures.push("action_receipt_binding_mismatch");
    }
    const action = context.action;
    failures.push(...validateActionRecord(action, context).map((code) => `action_receipt_action_${code}`));
    failures.push(...validateBindingSet(binding, context).map((code) => `action_receipt_binding_${code}`));
    if (!action || !exactRef(value.action_ref, action, context) ||
        !sameObjectRef(before?.action_ref, value.action_ref) || !sameObjectRef(after?.action_ref, value.action_ref)) {
      failures.push("action_receipt_action_mismatch");
    }
    if (!action || before?.action_id !== action.action_id || after?.action_id !== action.action_id) {
      failures.push("action_receipt_action_id_mismatch");
    }
    if (!action || !binding || !exactRef(action.execution_binding_set_ref, binding, context) ||
        action.execution_binding_set_hash !== binding.binding_set_hash ||
        value.effect_id !== action.effect_id || value.effect_id !== binding.effect_id) {
      failures.push("action_receipt_action_binding_mismatch");
    }
    const lineageStateHead = context.lineageStateHead ?? resolveObject(context.objectResolver, value.lineage_state_head_ref);
    const lineageCommitment = context.lineageCommitment ??
      resolveObject(context.objectResolver, action?.lineage_commitment_ref);
    failures.push(...validatePhase1Object(lineageStateHead, context)
      .map((code) => `action_receipt_lineage_state_${code}`));
    if (!lineageStateHead || lineageStateHead.schema !== "cairn.lineage_state_head.v0.1" ||
        !exactRef(value.lineage_state_head_ref, lineageStateHead, context) ||
        !action || !lineageCommitment || lineageCommitment.schema !== "cairn.lineage_commitment.v0.1" ||
        !exactRef(action.lineage_commitment_ref, lineageCommitment, context) ||
        action.lineage_commitment_hash !== lineageCommitment.commitment_hash ||
        !exactRef(binding?.lineage_commitment_ref, lineageCommitment, context) ||
        binding?.lineage_commitment_hash !== lineageCommitment.commitment_hash ||
        binding?.action_proposal_hash !== lineageCommitment.action_proposal_hash ||
        binding?.effect_id !== lineageCommitment.effect_id ||
        !exactRef(lineageStateHead.commitment_ref, lineageCommitment, context) ||
        (lineageStateHead.activated_action_ref !== null &&
          !exactRef(lineageStateHead.activated_action_ref, action, context))) {
      failures.push("action_receipt_lineage_mismatch");
    } else {
      failures.push(...validateLineageCommitment(lineageCommitment, context)
        .map((code) => `action_receipt_commitment_${code}`));
      for (const field of ["principal_occurrence_id", "principal_authorized_lineage_id", "action_control_key"]) {
        if (lineageStateHead[field] !== lineageCommitment[field] || binding?.[field] !== lineageCommitment[field]) {
          failures.push(`action_receipt_lineage_identity_mismatch:${field}`);
        }
      }
      for (const field of ["attempt_sequence", "commitment_generation"]) {
        if (lineageStateHead[field] !== lineageCommitment[field]) {
          failures.push(`action_receipt_lineage_identity_mismatch:${field}`);
        }
      }
      if (lineageStateHead.state === "provisional" &&
          lineageStateHead.fencing_token !== lineageCommitment.expected_activation_fence) {
        failures.push("action_receipt_lineage_fence_mismatch");
      }
      failures.push(...actionLineageStateFailures(after, lineageStateHead)
        .map((code) => `action_receipt_${code}`));
    }
    if (!after || !sameObjectRef(after.prior_transition_receipt_ref, objectRef(value, context))) {
      failures.push("action_receipt_successor_head_mismatch");
    }
    const expectedPrior = before?.prior_transition_receipt_ref ?? null;
    if ((expectedPrior === null) !== (value.prior_action_receipt_ref === null) ||
        (expectedPrior !== null && !sameObjectRef(expectedPrior, value.prior_action_receipt_ref))) {
      failures.push("action_receipt_prior_chain_mismatch");
    }
    if (binding && value.effect_id !== binding.effect_id) failures.push("action_receipt_effect_mismatch");
    failures.push(...validateActionStateTransition(before, after, context).map((code) => `action_receipt_${code}`));
    return unique(failures);
  } catch {
    return ["action_receipt_malformed"];
  }
}

const ACTION_EDGES = new Map([
  ["prepared", new Set(["authorized", "reserved", "cancelled"])],
  ["authorized", new Set(["reserved", "cancelled"])],
  ["reserved", new Set(["cancelled", "definitive_failure"])],
  ["cancelled", new Set(["quarantined"])],
  ["definitive_failure", new Set(["quarantined"])],
  ["quarantined", new Set()]
]);

export function validateActionStateTransition(before, after, context = {}) {
  try {
    const failures = validatePhase1Object(after, context);
    if (before !== null) failures.push(...validatePhase1Object(before, context).map((code) => `before_${code}`));
    if (failures.length) return unique(failures);
    if (before === null) {
      if (after.sequence !== 0 || after.previous_state_hash !== null || after.state !== "prepared") failures.push("action_state_genesis_invalid");
    } else {
      if (after.action_id !== before.action_id || !sameObjectRef(after.action_ref, before.action_ref)) failures.push("action_state_identity_mismatch");
      if (after.sequence !== before.sequence + 1 || after.previous_state_hash !== before.state_hash) failures.push("action_state_sequence_mismatch");
      if (!ACTION_EDGES.get(before.state)?.has(after.state)) failures.push("action_state_edge_invalid");
      if (after.prior_transition_receipt_ref?.schema !== "cairn.action_receipt.v0.2") failures.push("action_state_transition_receipt_schema_invalid");
      for (const field of ["authority_ref", "lineage_activation_receipt_ref", "gate_result_ref", "redemption_receipt_ref", "outbox_state_head_ref"]) {
        if (before[field] !== null && !sameObjectRef(before[field], after[field])) failures.push("action_state_dependency_drift");
      }
      if (before.reservation_refs.length > 0 && canonicalHash(before.reservation_refs) !== canonicalHash(after.reservation_refs)) {
        failures.push("action_state_dependency_drift");
      }
      if (["cancelled", "definitive_failure", "quarantined"].includes(after.state)) {
        for (const field of ["authority_ref", "lineage_activation_receipt_ref", "gate_result_ref", "redemption_receipt_ref", "outbox_state_head_ref"]) {
          const equal = before[field] === null ? after[field] === null : sameObjectRef(before[field], after[field]);
          if (!equal) failures.push("action_state_terminal_prefix_drift");
        }
        if (canonicalHash(before.reservation_refs) !== canonicalHash(after.reservation_refs)) failures.push("action_state_terminal_prefix_drift");
      }
    }
    return unique(failures);
  } catch {
    return ["action_state_transition_malformed"];
  }
}

export function validateActivitySummary(summary, action, state, context = {}) {
  try {
    const failures = validatePhase1Object(summary, context);
    failures.push(...validatePhase1Object(action, context).map((code) => `action_${code}`));
    failures.push(...validatePhase1Object(state, context).map((code) => `state_${code}`));
    if (failures.length) return unique(failures);
    if (!exactRef(summary.action_ref, action, context) || !exactRef(summary.action_state_head_ref, state, context)) failures.push("activity_action_binding_mismatch");
    if (summary.principal_id !== action.principal_id || summary.capability !== action.capability || summary.state !== state.state) failures.push("activity_semantics_mismatch");
    return unique(failures);
  } catch {
    return ["activity_summary_malformed"];
  }
}

export function validateCapabilitiesResponse(response, context = {}) {
  try {
    const validate = context.ajv?.getSchema("https://cairn.cards/protocol/execution/schemas/v0.1/operation-bodies.schema.json#/$defs/capabilitiesResponse");
    if (!validate || !validate(response)) return ["capabilities_schema_invalid"];
    if (response.bundle_hash !== context.bundleHash) return ["capabilities_bundle_hash_mismatch"];
    if (response.operation_registry_hash !== context.registryHash) return ["capabilities_registry_hash_mismatch"];
    if (response.base_bundle_hash !== BASE_BUNDLE_HASH ||
        (context.baseBundleHash !== undefined && response.base_bundle_hash !== context.baseBundleHash)) {
      return ["capabilities_base_bundle_hash_mismatch"];
    }
    if (response.base_operation_registry_hash !== BASE_REGISTRY_HASH ||
        (context.baseRegistryHash !== undefined && response.base_operation_registry_hash !== context.baseRegistryHash)) {
      return ["capabilities_base_registry_hash_mismatch"];
    }
    if (canonicalHash(response.operations) !== canonicalHash(context.operationNames)) return ["capabilities_operation_surface_mismatch"];
    return [];
  } catch {
    return ["capabilities_response_malformed"];
  }
}
