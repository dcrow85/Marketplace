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

export const IMPLEMENTED_PHASE1_INVARIANTS = new Set([
  "connection_event_union", "control_target_union", "recovery_signature_union", "scoped_control_target_union",
  "enumerable_map_node_union", "enumerable_map_root_closure", "connection_outstanding_action_entry_union",
  "execution_control_receipt_union",
  "compartment_sublimit_union", "compartment_limit_order", "compartment_asset_equality",
  "mandate_constraint_union", "mandate_scope_relational", "mandate_connection_not_authority",
  "lineage_authority_union", "lineage_prior_state_union", "lineage_activation_fence_increment", "lineage_state_union", "binding_actor_union", "binding_exact_release",
  "binding_checkout_union", "binding_cancellation_union", "authorization_binding_exact", "authorization_checkout_union",
  "cancellation_authorization_mode_union", "cancellation_credential_continuity_union",
  "reservation_lineage_fence_increment", "reservation_inventory_union", "gate_request_exact_dependencies", "gate_allow_all_checks",
  "redemption_exact_gate_and_fences",
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
    if (!operation || !["#/$defs/objectRefRequest", "#/$defs/enumerableMapReadRequest"]
      .some((suffix) => operation.request_body_schema.endsWith(suffix))) return ["object_read_operation_invalid"];
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
      ? verifyObjectBindings(returnedObject, schema)
      : validatePhase1Object(returnedObject, context);
    failures.push(...intrinsicObjectFailures(returnedObject, context)
      .map((code) => `object_read_${code}`));
    if (operationName === "execution.enumerable_map.get") {
      failures.push(...validateEnumerableMapReadRequest(request, returnedObject, context)
        .map((code) => `object_read_${code}`));
    }
    failures.push(...resourceBoundFailures(returnedObject, { objectRoot: true }).map((code) => `object_read_${code}`));
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
    case "cairn.enumerable_map_node.v0.1": return validateEnumerableMapNode(object, context);
    case "cairn.enumerable_map_root.v0.1": return validateEnumerableMapRoot(object, context);
    case "cairn.connection_outstanding_action_entry.v0.1":
      return validateConnectionOutstandingActionEntry(object, context);
    case "cairn.connection_outstanding_action_index_state_head.v0.1":
      return validateConnectionOutstandingIndexHead(object, context);
    case "cairn.connection_outstanding_action_index_transition_receipt.v0.1":
      return validateConnectionOutstandingIndexTransitionReceipt(object, context);
    case "cairn.execution_control_authorization.v0.1": return validateControlAuthorization(object, context);
    case "cairn.connection_state_event_receipt.v0.1": return validateConnectionEvent(
      object,
      context.connectionBefore ?? resolveObject(context.objectResolver, object.connection_before_head_ref),
      context.connectionAfter ?? resolveObject(context.objectResolver, object.connection_after_head_ref),
      context
    );
    case "cairn.scoped_execution_control_leaf_state_head.v0.1": return validateScopedControlLeaf(object, context);
    case "cairn.agent_execution_compartment.v0.1": return validateCompartmentDefinition(object, context);
    case "cairn.agent_mandate.v0.3": return validateMandate(object, context);
    case "cairn.lineage_commitment.v0.1": return validateLineageCommitment(object, context);
    case "cairn.execution_binding_set.v0.1": return validateBindingSet(object, context);
    case "cairn.gate_result.v0.2": return validateGateResult(object, context);
    case "cairn.execution_redemption_receipt.v0.2": return validateExecutionRedemptionReceipt(
      object,
      context.gateResult ?? resolveObject(context.objectResolver, object.gate_result_ref),
      context.binding ?? context.executionBindingSet ?? resolveObject(context.objectResolver, object.execution_binding_set_ref),
      context
    );
    case "cairn.action_record.v0.2": return validateActionRecord(object, context);
    default: return [];
  }
}

const ACTION_LINEAGE_STATE_COMPATIBILITY = new Map([
  ["prepared", new Set(["provisional"])],
  ["authorized", new Set(["provisional"])],
  ["reserved", new Set(["active"])],
  ["gate_allowed", new Set(["active"])],
  ["redemption_committed", new Set(["active"])],
  ["pending_handoff", new Set(["active"])],
  ["submitted", new Set(["active"])],
  ["acknowledged", new Set(["active"])],
  ["unknown", new Set(["active"])],
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

function mandateBindingFailures(mandate, commitment, binding) {
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
    const failures = [];
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
    ]) failures.push(...validatePhase1Object(object, context).map((code) => `action_get_${name}_${code}`));
    if (failures.length) return unique(failures);
    if (!sameObjectRef(request.ref, response.ref) || !exactRef(response.ref, response.view, context) ||
        !exactRef(response.view.action_record_ref, response.action_record, context) ||
        !exactRef(response.view.current_action_state_head_ref, response.current_action_state_head, context) ||
        !exactRef(response.view.current_lineage_state_head_ref, response.current_lineage_state_head, context) ||
        !exactRef(response.view.current_activity_detail_ref, response.current_activity_detail, context) ||
        !exactRef(response.current_action_state_head.action_ref, response.action_record, context)) {
      failures.push("action_get_embedded_ref_mismatch");
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
    failures.push(...validateBindingSet(response.execution_binding_set, context).map((code) => `action_get_binding_${code}`));
    failures.push(...validateLineageCommitment(response.lineage_commitment, context).map((code) => `action_get_commitment_${code}`));
    const authorityExpected = response.current_action_state_head.authority_ref;
    if (preauthorizedPrepared) {
      if (authorityExpected !== null || response.authority_basis?.schema !== "cairn.agent_mandate.v0.3" ||
          !exactRef(response.lineage_commitment.mandate_ref, response.authority_basis, context)) {
        failures.push("action_get_authority_mismatch");
      } else {
        failures.push(...validateMandate(response.authority_basis, context)
          .map((code) => `action_get_authority_${code}`));
      }
    } else if ((authorityExpected === null) !== (response.authority_basis === null) ||
        (authorityExpected !== null && !exactRef(authorityExpected, response.authority_basis, context))) {
      failures.push("action_get_authority_mismatch");
    } else if (response.authority_basis?.schema === "cairn.agent_mandate.v0.3") {
      failures.push(...validateMandate(response.authority_basis, context).map((code) => `action_get_authority_${code}`));
    } else if (response.authority_basis?.schema === "cairn.action_authorization.v0.2") {
      failures.push(...validateActionAuthorization(response.authority_basis, response.execution_binding_set, context)
        .map((code) => `action_get_authority_${code}`));
    } else if (response.authority_basis?.schema === "cairn.cancellation_authorization.v0.1") {
      failures.push(...validateCancellationAuthorization(response.authority_basis, response.execution_binding_set, context)
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
          response.authority_basis, response.lineage_commitment, response.execution_binding_set
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
        { ...context, lineageCommitment: response.lineage_commitment, authority: response.authority_basis }
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
        response.confirmation_receipt, { ...context, lineageCommitment: response.lineage_commitment }
      ).map((code) => `action_get_gate_request_${code}`));
      failures.push(...validateGateResult(response.gate_result, {
        ...context, gateRequest: response.gate_request, binding: response.execution_binding_set,
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
      if (expectedGate === null) {
        if (response.current_action_state_head.state !== "reserved" || response.gate_result.decision !== "deny") {
          failures.push("action_get_gate_decision_state_mismatch");
        }
      } else if (!exactRef(expectedGate, response.gate_result, context) || response.gate_result.decision !== "allow") {
        failures.push("action_get_gate_decision_state_mismatch");
      }
    } else if (issuanceConfirmationPresent) {
      failures.push(...validateExecutionConfirmation(
        response.confirmation_receipt, response.authority_basis, response.execution_binding_set, null,
        { ...context, confirmationEvaluationTime: response.retrieved_at }
      ).map((code) => `action_get_confirmation_${code}`));
    } else if (expectedGate !== null) {
      failures.push("action_get_gate_pair_mismatch");
    }
    return unique(failures);
  } catch {
    return ["action_get_response_malformed"];
  }
}

function resolveKey(resolver, keyId) {
  if (resolver instanceof Map) return resolver.get(keyId);
  if (typeof resolver === "function") return resolver(keyId);
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

export function validatePhase1SignedObject(object, context = {}) {
  try {
    const failures = validatePhase1Object(object, context);
    if (failures.length) return failures;
    const schema = schemaFor(object, context);
    for (const pointer of schema["x-cairn-signature-pointers"]) {
      const proof = valueAtPointer(object, pointer);
      const key = resolveKey(context.keyResolver, proof.key_id);
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
          (key.status !== "active" || now === null || now < keyNotBefore || now >= keyExpiresAt ||
           (keyRevokedAt !== null && now >= keyRevokedAt))) failures.push("signature_key_not_currently_eligible");
      const expectedController = expectedControllerFor(object, pointer, proof, context);
      if (expectedController === null || expectedController === undefined) failures.push("signature_expected_controller_required");
      else if (key.controller !== expectedController) failures.push("signature_controller_mismatch");
      if (!verifyEd25519({ schemaId: object.schema, objectHash: proof.signed_hash, publicKey: key.public_key, signature: proof.value })) {
        failures.push("signature_invalid");
      }
    }
    return unique(failures);
  } catch {
    return ["phase1_signed_object_malformed"];
  }
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

const DISCLOSURE_REF_HASH_PAIRS = [
  ["disclosure_authorization_ref", "disclosure_authorization_hash"],
  ["source_read_receipt_ref", "source_read_receipt_hash"],
  ["source_read_next_state_head_ref", "source_read_next_state_head_hash"]
];

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
    if (recovery.every((item) => item !== null)) {
      const grant = resolveObject(context.objectResolver, value.recovery_grant_ref);
      const head = resolveObject(context.objectResolver, value.recovery_grant_state_head_ref);
      if (!grant || grant.schema !== "cairn.recovery_grant.v0.1" || grant.principal_id !== value.principal_id ||
          !grant.allowed_control_actions?.includes(value.control_action) || !grant.allowed_scopes?.includes(value.scope) ||
          grant.control_namespace_generation !== context.controlNamespaceGeneration) failures.push("control_recovery_grant_mismatch");
      if (!head || head.schema !== "cairn.recovery_grant_state_head.v0.1" || head.state !== "active" ||
          head.state_hash !== value.recovery_grant_state_head_hash || head.recovery_grant_ref?.object_hash !== value.recovery_grant_ref.object_hash) {
        failures.push("control_recovery_head_mismatch");
      }
    }
    if (Date.parse(value.requested_at) >= Date.parse(value.expires_at)) failures.push("control_authorization_not_current_interval");
    return unique(failures);
  } catch {
    return ["control_authorization_malformed"];
  }
}

export function validateScopedControlLeaf(value, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    failures.push(...targetUnionFailures(value, true));
    if (value.state === "revoked" && value.revocation_nonce === 0) failures.push("revoked_control_without_nonce");
    return unique(failures);
  } catch {
    return ["scoped_control_leaf_malformed"];
  }
}

export function connectionOutstandingMapKey(outstandingActionIndexKey) {
  return canonicalHash({
    schema: "cairn.enumerable_map_key_preimage.v0.1",
    owner_stable_key: outstandingActionIndexKey,
    map_domain: "connection_outstanding_action"
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

function inspectEnumerableMapNode(node, context, mapDomain) {
  const failures = validatePhase1Object(node, context).map((code) => `map_node_${code}`);
  if (failures.length) return failures;
  if (node.map_domain !== mapDomain) failures.push("map_node_domain_mismatch");
  if (node.node_kind === "empty") {
    if (node.path_prefix_nibbles !== "" || node.leaf_entry !== null || node.branch_children.length !== 0 ||
        node.subtree_entry_count !== 0) failures.push("map_node_empty_union_mismatch");
  } else if (node.node_kind === "leaf") {
    const leaf = node.leaf_entry;
    const keyHex = leaf?.entry_key?.startsWith("sha-256:") ? leaf.entry_key.slice(8) : "";
    if (!isObject(leaf) || node.branch_children.length !== 0 || node.subtree_entry_count !== 1 ||
        !keyHex.startsWith(node.path_prefix_nibbles) || leaf.entry_object_hash !== leaf.entry_object_ref?.object_hash ||
        leaf.entry_kind !== "connection_outstanding_action" ||
        leaf.entry_object_ref?.schema !== "cairn.connection_outstanding_action_entry.v0.1") {
      failures.push("map_node_leaf_union_mismatch");
    }
  } else if (node.node_kind === "branch") {
    const nibbles = node.branch_children.map(({ nibble }) => nibble);
    if (node.leaf_entry !== null || node.branch_children.length < 2 ||
        canonicalHash(nibbles) !== canonicalHash([...nibbles].sort()) ||
        new Set(nibbles).size !== nibbles.length || node.subtree_entry_count < node.branch_children.length ||
        node.branch_children.some(({ child_node_ref, child_node_hash }) =>
          child_node_ref?.schema !== "cairn.enumerable_map_node.v0.1" || child_node_hash !== child_node_ref?.object_hash)) {
      failures.push("map_node_branch_union_mismatch");
    }
  } else failures.push("map_node_kind_invalid");
  return unique(failures);
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
    if ((receiverBound && value.finality_transition_profile_ref === null) ||
        (value.state === "reserved" && receiverBound) ||
        (value.state !== "reserved" && !receiverBound) ||
        (value.sequence === 0) !== (value.previous_entry_hash === null)) {
      failures.push("outstanding_action_entry_state_union_mismatch");
    }
    const action = resolveObject(context.objectResolver, value.action_ref);
    const actionState = resolveObject(context.objectResolver, value.current_action_state_head_ref);
    if (!action || action.schema !== "cairn.action_record.v0.2" || !exactRef(value.action_ref, action, context) ||
        action.effect_id !== value.effect_id || !actionState || actionState.schema !== "cairn.action_state_head.v0.1" ||
        !exactRef(value.current_action_state_head_ref, actionState, context) ||
        actionState.action_id !== action.action_id || !sameObjectRef(actionState.action_ref, value.action_ref)) {
      failures.push("outstanding_action_entry_action_chain_mismatch");
    } else {
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
    if (value.entry_count !== rootNode.subtree_entry_count ||
        (value.entry_count === 0 && (rootNode.node_kind !== "empty" || value.entries_root !== canonicalHash([]))) ||
        (value.entry_count > 0 && rootNode.node_kind === "empty")) {
      failures.push("enumerable_map_entries_commitment_mismatch");
    }
    return unique(failures);
  } catch {
    return ["enumerable_map_root_malformed"];
  }
}

export function validateEnumerableMapReadRequest(request, target, context = {}) {
  try {
    const validate = context.ajv?.getSchema(
      "https://cairn.cards/protocol/execution/schemas/v0.1/operation-bodies.schema.json#/$defs/enumerableMapReadRequest"
    );
    if (!validate || !validate(request)) return ["enumerable_map_read_request_schema_invalid"];
    if (context.parentAccessAuthorized !== true) return ["enumerable_map_read_parent_acl_denied"];
    const owner = resolveObject(context.objectResolver, request.owner_head_ref);
    const root = resolveObject(context.objectResolver, request.map_root_ref);
    if (!owner || owner.schema !== "cairn.connection_outstanding_action_index_state_head.v0.1" ||
        !exactRef(request.owner_head_ref, owner, context) ||
        !root || root.schema !== "cairn.enumerable_map_root.v0.1" || !exactRef(request.map_root_ref, root, context) ||
        !sameObjectRef(owner.outstanding_action_map_ref, request.map_root_ref) || owner.outstanding_action_map_hash !== root.map_hash ||
        validateConnectionOutstandingIndexHead(owner, { ...context, outstandingActionMap: root }).length) {
      return ["enumerable_map_read_owner_mismatch"];
    }
    if (!exactRef(request.ref, target, context)) return ["enumerable_map_read_target_mismatch"];
    if (target.schema === "cairn.enumerable_map_root.v0.1") {
      return sameObjectRef(request.ref, request.map_root_ref) && request.ancestor_node_refs.length === 0
        ? [] : ["enumerable_map_read_path_mismatch"];
    }
    if (target.schema !== "cairn.enumerable_map_node.v0.1") return ["enumerable_map_read_target_schema_mismatch"];
    let expectedRef = root.root_node_ref;
    for (let index = 0; index < request.ancestor_node_refs.length; index += 1) {
      const ancestorRef = request.ancestor_node_refs[index];
      if (!sameObjectRef(ancestorRef, expectedRef)) return ["enumerable_map_read_path_mismatch"];
      const ancestor = resolveObject(context.objectResolver, ancestorRef);
      if (!ancestor || ancestor.schema !== "cairn.enumerable_map_node.v0.1" ||
          !exactRef(ancestorRef, ancestor, context) || validateEnumerableMapNode(ancestor, {
            ...context, expectedMapDomain: root.map_domain
          }).length || ancestor.node_kind !== "branch") {
        return ["enumerable_map_read_ancestor_mismatch"];
      }
      const nextRef = request.ancestor_node_refs[index + 1] ?? request.ref;
      const child = ancestor.branch_children.find(({ child_node_ref }) => sameObjectRef(child_node_ref, nextRef));
      if (!child || child.child_node_hash !== nextRef.object_hash) return ["enumerable_map_read_path_mismatch"];
      expectedRef = nextRef;
    }
    if (request.ancestor_node_refs.length === 0 && !sameObjectRef(request.ref, expectedRef)) {
      return ["enumerable_map_read_path_mismatch"];
    }
    return validateEnumerableMapNode(target, { ...context, expectedMapDomain: root.map_domain });
  } catch {
    return ["enumerable_map_read_malformed"];
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
      "changed_entry_after_ref", "changed_entry_after_hash", "terminal_evidence_ref", "terminal_evidence_hash"
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
          value.terminal_evidence_ref !== null || value.terminal_evidence_hash !== null) {
        failures.push("outstanding_index_transition_reservation_union_mismatch");
      }
    } else if (value.cause === "action_head_updated") {
      const immutable = ["outstanding_action_key", "connection_state_id", "action_ref", "effect_id", "lineage_id"];
      if (before === null || !mapsChanged || before.state !== after.state ||
          after.outstanding_action_count !== before.outstanding_action_count ||
          afterMap?.revision !== beforeMap?.revision + 1 || value.changed_action_key === null ||
          !exactChangedEntry(value.changed_entry_before_ref, changedBefore) ||
          !exactChangedEntry(value.changed_entry_after_ref, changedAfter) ||
          immutable.some((field) => canonicalHash(changedBefore?.[field]) !== canonicalHash(changedAfter?.[field])) ||
          changedAfter?.sequence !== changedBefore?.sequence + 1 ||
          changedAfter?.previous_entry_hash !== changedBefore?.entry_hash ||
          value.terminal_evidence_ref !== null || value.terminal_evidence_hash !== null) {
        failures.push("outstanding_index_transition_update_union_mismatch");
      }
    } else if (["fenced_non_submission_removed", "authenticated_stream_closed_removed",
      "authenticated_irreversible_horizon_removed"].includes(value.cause)) {
      if (before === null || !mapsChanged || before.state !== after.state ||
          before.outstanding_action_count === 0 || after.outstanding_action_count !== before.outstanding_action_count - 1 ||
          afterMap?.revision !== beforeMap?.revision + 1 || value.changed_action_key === null ||
          !exactChangedEntry(value.changed_entry_before_ref, changedBefore) ||
          value.changed_entry_after_ref !== null || value.changed_entry_after_hash !== null ||
          value.terminal_evidence_ref === null || value.terminal_evidence_hash === null) {
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
    if (![committedAt, signedAt, Date.parse(after.updated_at),
      Date.parse(after.authority_service_signature?.signed_at)].every(Number.isFinite) ||
        Date.parse(after.updated_at) !== committedAt || signedAt < committedAt ||
        Date.parse(after.authority_service_signature?.signed_at) < committedAt ||
        Date.parse(after.authority_service_signature?.signed_at) > signedAt ||
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
    if (Date.parse(value.not_before) >= Date.parse(value.expires_at)) failures.push("compartment_interval_invalid");
    return unique(failures);
  } catch {
    return ["compartment_definition_malformed"];
  }
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
      failures.push(...mandateBindingFailures(authority, commitment, binding)
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
    const runtimeFields = [value.agent_runtime_binding_ref, value.connection_authorization_ref, value.connection_state_head_ref];
    if (value.actor_branch === "agent_runtime") {
      if (runtimeFields.some(isNull)) failures.push("binding_agent_branch_incomplete");
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
    for (const disclosure of value.disclosures) {
      failures.push(...refHashPairFailures(disclosure, DISCLOSURE_REF_HASH_PAIRS, "binding_disclosure_ref_hash_mismatch"));
    }
    if (value.cancellation_context !== null) {
      failures.push(...refHashPairFailures(value.cancellation_context, CANCELLATION_CONTEXT_REF_HASH_PAIRS,
        "binding_cancellation_ref_hash_mismatch"));
    }
    const grantRefSet = value.data_grant_refs.map((ref) => canonicalHash(ref)).sort();
    const grantHeadSet = value.data_grant_state_heads.map(({ data_grant_ref }) => canonicalHash(data_grant_ref)).sort();
    if (canonicalHash(grantRefSet) !== canonicalHash(grantHeadSet)) failures.push("binding_data_grant_head_set_mismatch");
    for (const head of value.data_grant_state_heads) {
      const current = resolveObject(context.objectResolver, head.current_state_head_ref);
      if (!current || current.schema !== "cairn.data_grant_state_head.v0.1" ||
          head.current_state_head_ref.schema !== current.schema || head.current_state_head_ref.object_hash !== current.state_hash ||
          !sameObjectRef(current.data_grant_ref, head.data_grant_ref) || current.revocation_nonce !== head.revocation_nonce) {
        failures.push("binding_data_grant_current_head_mismatch");
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

const TRANSITION_MANIFEST_PARENT_FIELDS = new Map([
  ["cairn.compartment_state_transition_receipt.v0.1", [{
    refField: "economic_atom_delta_manifest_ref", hashField: "economic_atom_delta_manifest_hash",
    manifestKind: "compartment_economic_atom_deltas", subjectRefField: "economic_mutation_cause_core_ref",
    subjectHashField: "economic_mutation_cause_core_hash"
  }]]
]);

export function validateTransitionManifestReadRequest(request, parent, manifest, context = {}) {
  try {
    const requestSchema = context.ajv?.getSchema("https://cairn.cards/protocol/execution/schemas/v0.1/operation-bodies.schema.json#/$defs/transitionManifestRequest");
    if (!requestSchema || !requestSchema(request)) return ["transition_manifest_request_schema_invalid"];
    const failures = validatePhase1Object(parent, context).map((code) => `parent_${code}`);
    failures.push(...validateTransitionManifest(manifest, context).map((code) => `manifest_${code}`));
    if (failures.length) return unique(failures);
    if (!exactRef(request.parent_ref, parent, context) || !exactRef(request.manifest_ref, manifest, context)) failures.push("transition_manifest_request_ref_mismatch");
    const fields = TRANSITION_MANIFEST_PARENT_FIELDS.get(parent.schema) ?? [];
    if (parent.schema === "cairn.compartment_state_transition_receipt.v0.1" &&
        parent.economic_mutation_cause_core_ref.schema !== "cairn.economic_mutation_cause_core.v0.1") {
      failures.push("transition_manifest_parent_subject_schema_mismatch");
    }
    const namesManifest = fields.some(({ refField, hashField, manifestKind, subjectRefField, subjectHashField }) =>
      sameObjectRef(parent[refField], request.manifest_ref) && parent[hashField] === manifest.manifest_hash &&
      manifest.manifest_kind === manifestKind && sameObjectRef(manifest.subject_ref, parent[subjectRefField]) &&
      manifest.subject_hash === parent[subjectHashField] && manifest.authority_transaction_id === parent.authority_transaction_id);
    if (!namesManifest) failures.push("transition_manifest_parent_membership_missing");
    const parentAuthorityKeyId = parent.authority_service_signature?.key_id ?? null;
    const manifestAuthorityKeyId = manifest.issuing_authority_signature?.key_id ?? null;
    if (parentAuthorityKeyId === null || manifestAuthorityKeyId !== parentAuthorityKeyId) {
      failures.push("transition_manifest_issuing_authority_mismatch");
    }
    const manifestAuthorityKey = resolveKey(context.keyResolver, manifestAuthorityKeyId);
    if (!manifestAuthorityKey || manifestAuthorityKey.controller !== manifest.issuing_authority_id) {
      failures.push("transition_manifest_issuing_authority_mismatch");
    }
    if (context.parentAccessAuthorized !== true) failures.push("transition_manifest_parent_acl_denied");
    return unique(failures);
  } catch {
    return ["transition_manifest_read_malformed"];
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
  const resolver = context.currentPolicyLifecycleResolver;
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
        validatePhase1Object(policy, context).length || !exactRef(confirmation.assurance_policy_ref, policy, context) ||
        !sameObjectRef(confirmation.assurance_policy_ref, binding.confirmation_assurance_policy_ref) ||
        confirmation.assurance_policy_hash !== binding.confirmation_assurance_policy_hash ||
        !sameObjectRef(confirmation.assurance_policy_ref, authority?.required_confirmation_assurance_policy_ref)) {
      failures.push("confirmation_assurance_policy_mismatch");
    }
    if (!verifierProfile || verifierProfile.schema !== "cairn.confirmation_verifier_profile.v0.1" ||
        validatePhase1Object(verifierProfile, context).length ||
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

export function validateGateRequest(value, binding, authority, confirmation, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    failures.push(...refHashPairFailures(value, [
      ["execution_binding_set_ref", "execution_binding_set_hash"],
      ["confirmation_assurance_policy_lifecycle_head_ref", "confirmation_assurance_policy_lifecycle_head_hash"],
      ["confirmation_verifier_profile_lifecycle_head_ref", "confirmation_verifier_profile_lifecycle_head_hash"]
    ], "gate_request_ref_hash_mismatch"));
    if (!binding || !exactRef(value.execution_binding_set_ref, binding, context) || value.execution_binding_set_hash !== binding.binding_set_hash ||
        value.principal_id !== binding.principal_id || value.action_control_key !== binding.action_control_key) failures.push("gate_request_binding_mismatch");
    if (!authority || !sameObjectRef(value.authority_basis_ref, objectRef(authority, context))) {
      failures.push("gate_request_authority_mismatch");
    } else if (binding?.capability === "cancel_receiver_action") {
      if (authority.schema !== "cairn.cancellation_authorization.v0.1" ||
          validateCancellationAuthorization(authority, binding, context).length ||
          !sameObjectRef(value.receiver_finality_profile_ref, binding.receiver_finality_profile_ref) ||
          !sameObjectRef(value.receiver_finality_profile_ref, binding.cancellation_context?.cancellation_finality_profile_ref)) {
        failures.push("gate_request_cancellation_authority_mismatch");
      }
    } else if (authority.schema === "cairn.action_authorization.v0.2") {
      if (validateActionAuthorization(authority, binding, context).length ||
          !sameObjectRef(authority.execution_binding_set_ref, value.execution_binding_set_ref)) {
        failures.push("gate_request_authority_binding_mismatch");
      }
    } else if (authority.schema === "cairn.agent_mandate.v0.3") {
      if (validateMandate(authority, context).length) failures.push("gate_request_authority_semantics_invalid");
    } else {
      failures.push("gate_request_authority_schema_invalid");
    }
    if (!confirmation || !sameObjectRef(value.confirmation_receipt_ref, objectRef(confirmation, context))) {
      failures.push("gate_request_confirmation_mismatch");
    } else {
      failures.push(...validateExecutionConfirmation(confirmation, authority, binding, value, context)
        .map((code) => `gate_request_${code}`));
    }
    if (authority?.schema === "cairn.agent_mandate.v0.3") {
      const commitment = context.lineageCommitment ?? resolveObject(context.objectResolver, binding?.lineage_commitment_ref);
      if (!commitment || !exactRef(binding?.lineage_commitment_ref, commitment, context)) {
        failures.push("gate_request_mandate_commitment_unresolved");
      } else {
        failures.push(...mandateBindingFailures(authority, commitment, binding)
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
    if (!gateRequest || gateRequest.schema !== "cairn.gate_request.v0.2" ||
        validatePhase1Object(gateRequest, context).length || !exactRef(value.gate_request_ref, gateRequest, context) ||
        value.gate_request_hash !== gateRequest.request_hash) {
      failures.push("gate_result_request_mismatch");
    }
    if (!binding || binding.schema !== "cairn.execution_binding_set.v0.1" ||
        validateBindingSet(binding, context).length || !exactRef(value.execution_binding_set_ref, binding, context) ||
        value.execution_binding_set_hash !== binding.binding_set_hash) {
      failures.push("gate_result_binding_mismatch");
    }
    if (gateRequest && binding) {
      failures.push(...validateGateRequest(gateRequest, binding, authority, confirmation, {
        ...context, lineageCommitment
      }).map((code) => `gate_result_${code}`));
    }
    if (gateRequest && binding &&
        (!exactRef(gateRequest.execution_binding_set_ref, binding, context) ||
         gateRequest.execution_binding_set_hash !== binding.binding_set_hash ||
         gateRequest.principal_id !== binding.principal_id ||
         gateRequest.action_control_key !== binding.action_control_key)) {
      failures.push("gate_result_request_binding_mismatch");
    }
    const requestedAt = Date.parse(gateRequest?.requested_at);
    const evaluatedAt = Date.parse(value.evaluated_at);
    const expiresAt = Date.parse(value.expires_at);
    const requestSignedAt = Date.parse(gateRequest?.gate_service_signature?.signed_at);
    const resultSignedAt = Date.parse(value.gate_service_signature?.signed_at);
    const bindingCreatedAt = Date.parse(binding?.created_at);
    const bindingSignedAt = Date.parse(binding?.binding_service_signature?.signed_at);
    const bindingExpiresAt = Date.parse(binding?.expires_at);
    if (![requestedAt, evaluatedAt, expiresAt, requestSignedAt, resultSignedAt,
      bindingCreatedAt, bindingSignedAt, bindingExpiresAt].every(Number.isFinite) ||
        requestedAt > evaluatedAt || requestSignedAt > evaluatedAt ||
        bindingCreatedAt > evaluatedAt || bindingSignedAt > evaluatedAt ||
        evaluatedAt >= expiresAt || resultSignedAt < evaluatedAt || resultSignedAt >= expiresAt ||
        expiresAt > bindingExpiresAt) {
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

export function validateExecutionRedemptionReceipt(value, gateResult, binding, context = {}) {
  try {
    const failures = validatePhase1Object(value, context);
    if (failures.length) return failures;
    const gateRequest = context.gateRequest ?? resolveObject(context.objectResolver, gateResult?.gate_request_ref);
    if (!gateResult || gateResult.decision !== "allow" ||
        validateGateResult(gateResult, { ...context, gateRequest, binding }).length ||
        !exactRef(value.gate_result_ref, gateResult, context) || value.gate_result_hash !== gateResult.result_hash) {
      failures.push("redemption_gate_result_invalid");
    }
    if (!binding || !exactRef(value.execution_binding_set_ref, binding, context) || value.execution_binding_set_hash !== binding.binding_set_hash) {
      failures.push("redemption_binding_mismatch");
    }
    const action = context.action ?? resolveObject(context.objectResolver, value.action_ref);
    if (!action || action.schema !== "cairn.action_record.v0.2" || validateActionRecord(action, context).length ||
        !exactRef(value.action_ref, action, context)) {
      failures.push("redemption_action_mismatch");
    } else if (!binding || !exactRef(action.execution_binding_set_ref, binding, context) ||
        action.execution_binding_set_hash !== binding.binding_set_hash ||
        action.principal_id !== binding.principal_id || action.capability !== binding.capability ||
        action.action_proposal_hash !== binding.action_proposal_hash || action.effect_id !== binding.effect_id ||
        !sameObjectRef(action.lineage_commitment_ref, binding.lineage_commitment_ref) ||
        action.lineage_commitment_hash !== binding.lineage_commitment_hash) {
      failures.push("redemption_action_binding_mismatch");
    }
    const evaluatedAt = Date.parse(gateResult?.evaluated_at);
    const gateExpiresAt = Date.parse(gateResult?.expires_at);
    const gateSignedAt = Date.parse(gateResult?.gate_service_signature?.signed_at);
    const redeemedAt = Date.parse(value.redeemed_at);
    const receiptSignedAt = Date.parse(value.authority_service_signature?.signed_at);
    const bindingCreatedAt = Date.parse(binding?.created_at);
    const bindingSignedAt = Date.parse(binding?.binding_service_signature?.signed_at);
    const bindingExpiresAt = Date.parse(binding?.expires_at);
    const actionCreatedAt = Date.parse(action?.created_at);
    const actionSignedAt = Date.parse(action?.action_service_signature?.signed_at);
    if (![evaluatedAt, gateExpiresAt, gateSignedAt, redeemedAt, receiptSignedAt,
      bindingCreatedAt, bindingSignedAt, bindingExpiresAt, actionCreatedAt, actionSignedAt].every(Number.isFinite) ||
        redeemedAt < evaluatedAt || redeemedAt >= gateExpiresAt || gateSignedAt > redeemedAt ||
        bindingCreatedAt > redeemedAt || bindingSignedAt > redeemedAt || redeemedAt >= bindingExpiresAt ||
        actionCreatedAt > redeemedAt || actionSignedAt > redeemedAt || receiptSignedAt < redeemedAt) {
      failures.push("redemption_interval_invalid");
    }
    if (gateResult && canonicalHash(value.evaluated_current_head_refs) !== canonicalHash(gateResult.evaluated_head_refs)) {
      failures.push("redemption_evaluated_heads_mismatch");
    }
    if (!gateRequest || canonicalHash(value.checkout_dependency_refs) !== canonicalHash(gateRequest.checkout_dependency_refs)) {
      failures.push("redemption_checkout_dependencies_mismatch");
    }
    const terms = [value.terms_fence_pending_head_ref, value.redeemed_state_commitment_hash];
    if (!(terms.every(isNull) || terms.every((item) => item !== null))) failures.push("redemption_terms_fence_union_invalid");
    return unique(failures);
  } catch {
    return ["redemption_receipt_malformed"];
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
  ["reserved", new Set(["gate_allowed", "cancelled", "definitive_failure"])],
  ["gate_allowed", new Set(["redemption_committed", "cancelled"])],
  ["redemption_committed", new Set(["pending_handoff", "definitive_failure", "unknown"])],
  ["pending_handoff", new Set(["submitted", "unknown", "definitive_failure"])],
  ["submitted", new Set(["acknowledged", "unknown", "cancelled", "definitive_failure"])],
  ["acknowledged", new Set(["finalized", "unknown", "cancelled", "definitive_failure", "quarantined"])],
  ["unknown", new Set(["submitted", "acknowledged", "finalized", "cancelled", "definitive_failure", "quarantined"])],
  ["finalized", new Set(["quarantined"])],
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
        if (["submitted", "acknowledged", "unknown", "finalized"].includes(before.state) && after.receiver_receipt_ref === null) {
          failures.push("action_state_terminal_receiver_evidence_missing");
        }
      }
      if (before.receiver_receipt_ref !== null && after.receiver_receipt_ref === null) failures.push("action_state_receiver_evidence_erased");
    }
    if (["submitted", "acknowledged", "finalized"].includes(after.state) && after.receiver_receipt_ref === null) {
      failures.push("action_receiver_state_without_receipt");
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
