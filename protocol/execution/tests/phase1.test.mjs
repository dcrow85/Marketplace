import assert from "node:assert/strict";
import { generateKeyPairSync, sign as signBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { bindObjectHash, canonicalHash, canonicalText, objectRefFor, sameObjectRef, sha256, signatureInput, valueAtPointer } from "../lib/core.mjs";
import {
  auditPhase1Sources,
  buildPhase1Bundle,
  loadPhase1Sources,
  PHASE1_SOURCE_COMMITMENT_FILES,
  SHARED_CORE_SHA256,
  schemaLocationCommitment
} from "../lib/bundle.mjs";
import { PHASE1_OBJECTS } from "../lib/objects.mjs";
import { BASE_BUNDLE_HASH, BASE_REGISTRY_HASH, PHASE1_OPERATIONS, PROFILE_ID, SPEC_SHA256 } from "../lib/profile.mjs";
import {
  connectionOutstandingActionKey,
  connectionOutstandingMapKey,
  enumerableMapBranchEntriesRoot,
  enumerableMapEmptyEntriesRoot,
  enumerableMapLeafEntriesRoot,
  executionControlMapKey,
  scopedControlLeafKey,
  evaluateGateChecks,
  gateBusinessStateRoot,
  gateCheckoutDependencyRoot,
  gateEvaluatedHeadRoot,
  gateRequiredHeadRefs,
  PHASE1_GATE_CHECK_CODES,
  gateDependencyKey,
  receiverOutstandingMapKey,
  receiverOutstandingStreamKey,
  receiverTerminalCompletionKey,
  receiverOutstandingClosureCorrelationFailures,
  receiverTerminalCompletionClosureCorrelationFailures,
  receiverTerminalPlanToReceiptKeysetEqualityHash,
  receiverTerminalReleasePlanKey,
  receiverTerminalTransitionKindSetRoot,
  validateActionStateTransition,
  validateActionAuthorization,
  validateActionRecord,
  validateActionReceipt,
  activityListNextCursor,
  validateActivityDetail,
  validateActivityListResponse,
  validateActivitySummary,
  validateAuthorityReservation,
  validateBaseObjectResponse,
  validateBindingSet,
  validateCancellationAuthorization,
  validateCapabilitiesResponse,
  validateCompartmentDefinition,
  validateCompartmentStateHead,
  validateCompartmentStateTransitionReceipt,
  compartmentEconomicAtomSubsetRoot,
  compartmentConfirmedEventSubsetRoot,
  compartmentConfirmedEventComponentRoot,
  currentReservationHeldAtomsRoot,
  confirmationChallengeHash,
  validateConnectionEvent,
  validateConnectionAuthorization,
  validateConnectionStateHead,
  validateDataGrantStateHead,
  validateConnectionOutstandingActionEntry,
  validateConnectionOutstandingIndexHead,
  validateConnectionOutstandingIndexTransitionReceipt,
  validateReceiverOutstandingStreamEntry,
  validateReceiverOutstandingStreamTransitionReceipt,
  validateReceiverTerminalReleasePlan,
  validateReceiverTerminalReleaseCompletion,
  validateControlAuthorization,
  validateEnumerableMapNode,
  validateEnumerableMapPathProof,
  validateEnumerableMapRoot,
  validateExecutionControlNamespace,
  validateExecutionControlReceipt,
  validateExecutionControlStateHead,
  validateExecutionConfirmation,
  validateGateDependencyAttestation,
  validateGateDependencyStateHead,
  validateGateRequest,
  validateGateResult,
  validateLineageCommitment,
  validateLineageActivationReceipt,
  validateLineageStateTransition,
  lineageActiveStateCommitmentPreimage,
  lineageActiveStateCommitmentHash,
  mandateBusinessTupleHash,
  validateMandate,
  validatePhase1Object,
  validatePhase1SignedObject,
  validatePolicyObjectResponse,
  validateReceiptObjectResponse,
  validateAuthorizationObjectResponse,
  validateControlObjectResponse,
  validateExactObjectRead,
  validateOperationRequestEnvelope,
  validateActionGetResponse,
  validatePhase1RequestBytes,
  validateScopedControlLeaf,
  validateTransitionManifest,
  transitionManifestEntryKey
} from "../lib/validation.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sources = await loadPhase1Sources(root);
const audit = auditPhase1Sources(sources);
const built = await buildPhase1Bundle(root);
const schemasById = new Map([...sources.baseSchemas, ...sources.schemas].map(({ document }) => [document.$id, document]));
const schemasByObjectId = new Map(
  sources.schemas.filter(({ document }) => document["x-cairn-object-schema"])
    .map(({ document }) => [document["x-cairn-object-schema"], document])
);
const baseSchemasByObjectId = new Map(
  sources.baseSchemas.filter(({ document }) => document["x-cairn-object-schema"])
    .map(({ document }) => [document["x-cairn-object-schema"], document])
);
const context = {
  ajv: audit.ajv,
  schemasByObjectId,
  baseSchemasByObjectId,
  bundleHash: built.bundle.bundle_hash,
  registryHash: audit.operationRegistryHash,
  baseBundleHash: BASE_BUNDLE_HASH,
  objectResolver: new Map(),
  principalRevocationNonce: 0,
  requiredReservedJudgments: [],
  cancellationReservedJudgmentsResolver: (_principalId, binding) => ({
    binding_ref: refFor(binding),
    review_ref: binding.execution_review_receipt_ref,
    review_hash: binding.review_hash,
    current_policy_hash: binding.review_policy_hash,
    decisions: []
  }),
  currentHeadResolver: (reference) => reference
};

const readSigningKeyPair = generateKeyPairSync("ed25519");

function signedReadContext(objects, baseContext = context, controller = null) {
  const values = Array.isArray(objects) ? objects : [objects];
  const derivedController = controller ?? values.find((object) => typeof object?.principal_id === "string")?.principal_id ??
    "cairn:test:read-authority";
  const keyIds = new Set();
  const controllersByKeyId = new Map();
  const expectedControllersByPointer = { ...(baseContext.expectedControllersByPointer ?? {}) };
  for (const object of values) {
    const schema = schemasByObjectId.get(object?.schema) ?? baseSchemasByObjectId.get(object?.schema);
    for (const pointer of schema?.["x-cairn-signature-pointers"] ?? []) {
      const proof = valueAtPointer(object, pointer);
      keyIds.add(proof.key_id);
      const proofController = pointer === "/issuing_authority_signature"
        ? object.issuing_authority_id
        : ["/principal_signature", "/principal_acceptance_signature",
          "/principal_high_assurance_signature", "/principal_or_recovery_signature"].includes(pointer)
          ? object.principal_id
          : derivedController;
      controllersByKeyId.set(proof.key_id, proofController);
      expectedControllersByPointer[pointer] = proofController;
      proof.value = signBytes(null, signatureInput(object.schema, proof.signed_hash),
        readSigningKeyPair.privateKey).toString("base64url");
    }
  }
  const keyResolver = new Map([
    ...(baseContext.keyResolver instanceof Map ? baseContext.keyResolver : []),
    ...[...keyIds].map((keyId) => [keyId, {
    key_id: keyId,
    key_type: "Ed25519",
    public_key: readSigningKeyPair.publicKey.export({ format: "jwk" }).x,
    controller: controllersByKeyId.get(keyId),
    status: "active",
    not_before: "2026-01-01T00:00:00Z",
    expires_at: "2027-01-01T00:00:00Z",
    revocation_time: null
    }])
  ]);
  return {
    ...baseContext,
    now: "2026-07-22T12:00:00Z",
    keyResolver,
    expectedControllersByPointer,
    executionReleaseAuthorityController: derivedController
  };
}

function signedActionGetContext(response, baseContext = context) {
  const currentRefs = [
    response.view.current_action_state_head_ref,
    response.view.current_lineage_state_head_ref,
    response.view.current_activity_detail_ref
  ];
  const fallbackCurrentHeadResolver = baseContext.currentHeadResolver;
  const currentHeadResolver = (reference) => {
    const current = currentRefs.find((candidate) =>
      candidate.schema === reference.schema && candidate.object_id === reference.object_id
    );
    if (current) return current;
    if (typeof fallbackCurrentHeadResolver === "function") return fallbackCurrentHeadResolver(reference);
    if (fallbackCurrentHeadResolver instanceof Map) {
      return fallbackCurrentHeadResolver.get(canonicalText({
        schema: reference.schema, object_id: reference.object_id
      })) ?? null;
    }
    return null;
  };
  const currentHeadHistoryResolver = baseContext.currentHeadHistoryResolver ?? currentHeadResolver;
  return signedReadContext([
    response.view,
    response.action_record,
    response.execution_binding_set,
    response.lineage_commitment,
    response.current_action_state_head,
    response.current_lineage_state_head,
    response.current_activity_detail,
    ...(response.authority_basis === null ? [] : [response.authority_basis]),
    ...response.authority_reservations,
    ...(response.confirmation_receipt === null ? [] : [response.confirmation_receipt]),
    ...(response.gate_request === null ? [] : [response.gate_request]),
    ...(response.gate_result === null ? [] : [response.gate_result])
  ], { ...baseContext, currentHeadResolver, currentHeadHistoryResolver }, response.action_record.principal_id);
}

function decodePointerToken(token) {
  return token.replaceAll("~1", "/").replaceAll("~0", "~");
}

function resolveRef(reference, currentDocument) {
  const [uri, fragment = ""] = reference.split("#", 2);
  const resolvedUri = uri ? new URL(uri, currentDocument.$id).href : null;
  const document = resolvedUri ? schemasById.get(resolvedUri) : currentDocument;
  assert.ok(document, `unresolved test schema ${reference}`);
  if (!fragment) return { schema: document, document };
  const schema = fragment.slice(1).split("/").filter(Boolean).map(decodePointerToken)
    .reduce((value, key) => value[key], document);
  return { schema, document };
}

function sampleFor(schema, currentDocument = schema) {
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, currentDocument);
    return sampleFor(resolved.schema, resolved.document);
  }
  if (schema.const !== undefined) return structuredClone(schema.const);
  if (schema.enum) return structuredClone(schema.enum[0]);
  if (schema.anyOf) return sampleFor(schema.anyOf[0], currentDocument);
  if (schema.type === "object" || schema.properties) {
    const value = {};
    for (const key of schema.required ?? []) value[key] = sampleFor(schema.properties[key], currentDocument);
    return value;
  }
  if (schema.type === "array") {
    if (schema.prefixItems) return schema.prefixItems.map((item) => sampleFor(item, currentDocument));
    return Array.from({ length: schema.minItems ?? 0 }, () => sampleFor(schema.items, currentDocument));
  }
  if (schema.type === "integer") return schema.minimum ?? 0;
  if (schema.type === "boolean") return false;
  if (schema.type === "null") return null;
  if (schema.type === "string" || schema.format || schema.pattern) {
    if (schema.format === "uri" || schema.format === "uri-reference") return "https://example.invalid/resource";
    if (schema.format === "cairn-ed25519-signature") return "A".repeat(86);
    if (schema.pattern?.includes("sha-256")) return `sha-256:${"0".repeat(64)}`;
    if (schema.pattern?.includes("urn:uuid")) return "urn:uuid:00000000-0000-4000-8000-000000000001";
    if (schema.pattern?.includes("[0-9]{4}")) return "2026-07-22T10:00:00Z";
    if (schema.pattern?.includes("cairn\\.")) return "cairn.example.v0.1";
    if (schema.pattern?.includes("[A-Z0-9]")) return "USD";
    if (schema.pattern?.includes("[A-Z0-9_]+")) return "CHECK_OK";
    return "x".repeat(Math.max(schema.minLength ?? 1, 1));
  }
  return {};
}

function make(schemaId, overrides = {}) {
  const schema = schemasByObjectId.get(schemaId);
  assert.ok(schema, `missing ${schemaId}`);
  const object = sampleFor(schema);
  if (schemaId === "cairn.execution_control_authorization.v0.1") Object.assign(object, {
    recovery_grant_ref: null, recovery_grant_state_head_ref: null, recovery_grant_state_head_hash: null,
    recovery_use_idempotency_nonce: null
  });
  if (schemaId === "cairn.data_grant_state_head.v0.1") Object.assign(object, {
    state: "active", remaining_reads: 1,
    query_bound: { kind: "temporal", maximum_range_seconds: 1, maximum_keys_or_partitions: null }
  });
  if (schemaId === "cairn.enumerable_map_node.v0.1") Object.assign(object, {
    node_kind: "empty", path_prefix_nibbles: "", leaf_entry: null,
    branch_children: [], subtree_entry_count: 0,
    entries_root: enumerableMapEmptyEntriesRoot("connection_outstanding_action")
  });
  if (schemaId === "cairn.connection_outstanding_action_entry.v0.1") Object.assign(object, {
    receiver_event_stream_key: null, finality_transition_profile_ref: null,
    finality_transition_profile_hash: null, sequence: 0, previous_entry_hash: null, state: "reserved"
  });
  if (schemaId === "cairn.connection_outstanding_action_index_transition_receipt.v0.1") Object.assign(object, {
    before_change_proof: null, after_change_proof: null,
    action_transition_receipt_ref: null, action_transition_receipt_hash: null
  });
  if (schemaId === "cairn.receiver_outstanding_stream_entry.v0.1") Object.assign(object, {
    sequence: 0, previous_entry_hash: null, state: "reserved",
    current_receiver_stream_head_ref: null, current_receiver_stream_head_hash: null
  });
  if (schemaId === "cairn.receiver_outstanding_stream_transition_receipt.v0.1") Object.assign(object, {
    before_change_proof: null, after_change_proof: null
  });
  if (schemaId === "cairn.receiver_terminal_release_completion_receipt.v0.1") {
    const [firstAssignment, secondAssignment, firstTransition, secondTransition] =
      distinctRefs(4, "terminal-completion-identity");
    object.identity_epoch_transition_receipts = [
      { assignment_ref: firstAssignment, assignment_hash: firstAssignment.object_hash,
        transition_receipt_ref: firstTransition, transition_receipt_hash: firstTransition.object_hash },
      { assignment_ref: secondAssignment, assignment_hash: secondAssignment.object_hash,
        transition_receipt_ref: secondTransition, transition_receipt_hash: secondTransition.object_hash }
    ];
  }
  if (schemaId === "cairn.execution_control_receipt.v0.1") Object.assign(object, {
    cause: "global_control", authorization_basis_kind: "control_authorization",
    control_namespace_ref: null, control_namespace_hash: null, prior_control_namespace_ref: null,
    prior_control_namespace_hash: null, prior_revoked_control_head_ref: null, prior_revoked_control_head_hash: null,
    before_change_proof: null, after_change_proof: null,
    scoped_leaf_before_ref: null, scoped_leaf_before_hash: null, scoped_leaf_after_ref: null, scoped_leaf_after_hash: null,
    connection_state_event_receipt_ref: null, connection_state_event_receipt_hash: null,
    recovery_grant_transition_receipt_ref: null, recovery_grant_transition_receipt_hash: null,
    outstanding_action_index_head_ref: null, outstanding_action_index_head_hash: null
  });
  if (schemaId === "cairn.action_authorization.v0.2") Object.assign(object, {
    obligation_exposure_core_ref: null, obligation_exposure_core_hash: null, obligation_exposure_id: null, obligation_role: null,
    checkout_group_core_ref: null, checkout_group_core_hash: null, checkout_role: null,
    checkout_reservation_batch_core_ref: null, checkout_reservation_batch_core_hash: null,
    fulfillment_attempt_core_ref: null, fulfillment_attempt_core_hash: null,
    payee_account_commitment: null, rail: null, exposure_vector: [], acknowledged_transaction_semantics: []
  });
  if (schemaId === "cairn.agent_mandate.v0.3") object.capability = "submit_bindable_offer";
  if (schemaId === "cairn.lineage_state_head.v0.1") Object.assign(object, {
    sequence: 0, previous_state_hash: null, state: "provisional", commitment_generation: 0,
    activation_receipt_ref: null, activation_transaction_id: null, next_state_commitment_hash: null,
    activated_action_ref: null, outbox_state_head_ref: null, terminal_receiver_receipt_ref: null,
    finalization_tombstone: false
  });
  if (schemaId === "cairn.execution_binding_set.v0.1") Object.assign(object, {
    obligation_exposure_core_ref: null, obligation_exposure_core_hash: null, obligation_exposure_id: null, obligation_role: null,
    fulfillment_attempt_core_ref: null, fulfillment_attempt_core_hash: null,
    payee_account_commitment: null, rail: null, asset: null, exposure_vector: [], compartment_ref: null,
    pre_reservation_compartment_state_head_ref: null, pre_reservation_resource_exposure_state_head_ref: null,
    pre_reservation_resource_exposure_state_head_hash: null, economic_resource_cap_state_head_ref: null,
    economic_resource_cap_state_head_hash: null, economic_resource_key: null, compartment_control_key: null,
    protection_attestation_ref: null, protection_attestation_hash: null,
    protection_attestation_lifecycle_head_ref: null, protection_attestation_lifecycle_head_hash: null,
    provider_account_identity_head_ref: null, account_generation: null,
    provider_account_identity_trust_overlay_head_ref: null, provider_account_identity_trust_overlay_head_hash: null,
    provider_sublimit_identity_head_ref: null, provider_sublimit_identity_head_hash: null, provider_sublimit_id: null,
    sublimit_generation: null, provider_sublimit_identity_trust_overlay_head_ref: null,
    provider_sublimit_identity_trust_overlay_head_hash: null, quote_snapshot_ref: null, quote_hash: null,
    provider_quote_import_receipt_ref: null, provider_quote_import_receipt_hash: null,
    quote_source_credential_lifecycle_head_ref: null, quote_source_credential_lifecycle_head_hash: null,
    quote_source_credential_generation: null, quote_importer_adapter_lifecycle_head_ref: null,
    quote_importer_adapter_lifecycle_head_hash: null, accounting_policy_ref: null,
    cancellation_context: null, checkout_group_core_ref: null, checkout_group_core_hash: null, checkout_role: null,
    checkout_reservation_batch_core_ref: null, checkout_reservation_batch_core_hash: null,
    checkout_transition_template_ref: null, checkout_transition_template_hash: null,
    seller_inventory_context_kind: null, seller_inventory_context_ref: null, seller_inventory_context_hash: null,
    seller_inventory_stage: null, seller_inventory_state_head_ref: null, seller_inventory_state_head_hash: null,
    seller_copy_lease_heads_root: null, seller_inventory_transition_receipt_ref: null,
    seller_inventory_transition_receipt_hash: null, seller_inventory_authority_state_head_ref: null,
    seller_inventory_authority_state_head_hash: null, seller_inventory_authority_signing_key_generation: null,
    copy_ownership_registry_authority_state_head_ref: null, copy_ownership_registry_authority_state_head_hash: null,
    copy_ownership_registry_authority_signing_key_generation: null, checkout_readiness_receipt_ref: null,
    checkout_readiness_receipt_hash: null
  });
  if (schemaId === "cairn.cancellation_authorization.v0.1") Object.assign(object, {
    authorization_mode: "ordinary", restrictive_control_head_ref: null, restrictive_control_head_hash: null,
    restrictive_control_scope: null, restrictive_control_target_commitment: null, original_outbox_handoff_receipt_ref: null,
    safety_preparation_intent_ref: null, safety_preparation_intent_hash: null,
    cancellation_credential_continuity_receipt_ref: null, cancellation_credential_continuity_receipt_hash: null,
    original_operation_locator: { kind: "provider_operation_id", value: "provider-operation-1" }
  });
  if (schemaId === "cairn.action_receipt.v0.2") Object.assign(object, {
    state_before: "prepared", state_after: "authorized", receiver_import_receipt_ref: null,
    receiver_assertion_trust_state_head_ref: null,
    action_ref: { ...object.action_ref, schema: "cairn.action_record.v0.2" }, prior_action_receipt_ref: null
  });
  if (schemaId === "cairn.gate_result.v0.2") Object.assign(object, {
    decision: "deny",
    check_results: object.check_results.map((result) => ({ ...result, decision: "deny" })),
    evaluated_at: "2026-07-22T10:02:00Z", expires_at: "2026-07-22T10:04:00Z",
    gate_service_signature: { ...object.gate_service_signature, signed_at: "2026-07-22T10:02:00Z" }
  });
  Object.assign(object, overrides);
  if (schemaId === "cairn.scoped_execution_control_leaf_state_head.v0.1") {
    object.scoped_control_leaf_key = scopedControlLeafKey(object);
  }
  if (schemaId === "cairn.execution_control_namespace.v0.1" && object.generation === 0) {
    object.prior_namespace_ref = null;
    object.prior_revoked_head_ref = null;
  }
  if (schemaId === "cairn.action_state_head.v0.1") {
    const genericRef = sampleFor(resolveRef("https://cairn.cards/protocol/execution/schemas/v0.1/common.schema.json#/$defs/objectRef", schema).schema);
    const transitionReceiptRef = { ...genericRef, schema: "cairn.action_receipt.v0.2" };
    Object.assign(object, {
      action_ref: { ...genericRef, schema: "cairn.action_record.v0.2" },
      authority_ref: null, lineage_activation_receipt_ref: null, reservation_refs: [], gate_result_ref: null,
      redemption_receipt_ref: null, outbox_state_head_ref: null, receiver_receipt_ref: null,
      prior_transition_receipt_ref: object.state === "prepared" ? null : transitionReceiptRef
    });
    if (object.state !== "prepared") object.authority_ref = genericRef;
    if (["reserved", "gate_allowed", "redemption_committed", "pending_handoff", "submitted", "acknowledged", "unknown", "cancelled", "definitive_failure", "finalized", "quarantined"].includes(object.state)) {
      object.reservation_refs = [genericRef];
      object.lineage_activation_receipt_ref = genericRef;
    }
    if (["gate_allowed", "redemption_committed", "pending_handoff", "submitted", "acknowledged", "unknown", "cancelled", "definitive_failure", "finalized", "quarantined"].includes(object.state)) object.gate_result_ref = genericRef;
    if (["redemption_committed", "pending_handoff", "submitted", "acknowledged", "unknown", "cancelled", "definitive_failure", "finalized", "quarantined"].includes(object.state)) {
      object.redemption_receipt_ref = genericRef;
      object.outbox_state_head_ref = genericRef;
    }
    if (["submitted", "acknowledged", "cancelled", "definitive_failure", "finalized", "quarantined"].includes(object.state)) object.receiver_receipt_ref = genericRef;
    Object.assign(object, overrides);
  }
  return bindObjectHash(object, schema);
}

function refFor(object) {
  return objectRefFor(object, schemasByObjectId.get(object.schema));
}

function mapPathProof(map, terminalNode, entryKey, claim, absenceKind = null, ancestorNodes = []) {
  return {
    claim,
    map_root_ref: refFor(map),
    map_root_hash: map.map_hash,
    entry_key: entryKey,
    ancestor_node_refs: ancestorNodes.map(refFor),
    terminal_node_ref: refFor(terminalNode),
    terminal_node_hash: terminalNode.node_hash,
    absence_kind: absenceKind
  };
}

function currentHeadResolverFor(refs) {
  return new Map(refs.map((reference) => [
    canonicalText({ schema: reference.schema, object_id: reference.object_id }), reference
  ]));
}

function gateDependencyManifestFor(request, binding, authority, confirmation) {
  const fields = [
    "execution_integrity_state_head_ref", "confirmation_assurance_policy_lifecycle_head_ref",
    "confirmation_verifier_profile_lifecycle_head_ref", "reservation_receipt_refs",
    "current_control_head_refs", "current_connection_head_ref", "current_compartment_head_ref",
    "current_economic_resource_head_ref", "current_data_grant_head_refs",
    "current_business_state_head_refs", "current_provider_identity_head_refs",
    "current_provider_identity_trust_overlay_head_refs", "current_seller_copy_lease_heads_root",
    "policy_refs", "executor_policy_ref", "receiver_finality_profile_ref", "accounting_policy_ref",
    "receiver_channel_policy_ref", "receiver_sequence_epoch_selector_ref", "checkout_dependency_refs",
    "checkout_readiness_receipt_ref", "checkout_group_state_head_ref", "checkout_terms_receipt_ref"
  ];
  return make("cairn.gate_dependency_manifest.v0.1", {
    principal_id: binding.principal_id,
    execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    authority_basis_ref: refFor(authority), confirmation_receipt_ref: refFor(confirmation),
    execution_release_state_head_ref: binding.execution_release_state_head_ref,
    ...Object.fromEntries(fields.map((field) => [field, structuredClone(request[field])])),
    created_at: "2026-07-22T10:00:30Z", expires_at: "2026-07-22T10:05:00Z"
  });
}

function dataGrantHead(dataGrantRef, currentStateHeadRef, revocationNonce, grant = null) {
  return {
    data_grant_ref: dataGrantRef,
    current_state_head_ref: currentStateHeadRef,
    revocation_nonce: revocationNonce,
    required_purpose: grant?.purpose ?? "read",
    required_uses: grant?.uses ?? ["read_local"],
    required_resource_scopes_root: canonicalHash(grant?.resource_scopes ?? []),
    required_audience: grant?.audience ?? ["cairn:test:runtime"]
  };
}

function confirmationPolicyFixture(capability, lifecycleRef) {
  const verifierProfile = make("cairn.confirmation_verifier_profile.v0.1", {
    verifier_id: "cairn-test-verifier",
    supported_methods: ["passkey"],
    relying_party_or_audience_set: ["cairn:test:rp"],
    issued_at: "2026-07-22T09:00:00Z",
    expires_at: "2026-07-22T11:00:00Z"
  });
  const policy = make("cairn.confirmation_assurance_policy.v0.1", {
    applicable_capabilities: [capability],
    allowed_methods: ["passkey"],
    relying_party_or_audience: "cairn:test:rp",
    require_user_presence: true,
    require_user_verification: true,
    allowed_verifier_profile_refs: [refFor(verifierProfile)],
    maximum_evidence_age_seconds: 600,
    issued_at: "2026-07-22T09:00:00Z",
    expires_at: "2026-07-22T11:00:00Z"
  });
  const verifierLifecycleRef = distinctRefs(2, "confirmation-verifier-lifecycle")[1];
  const currentPolicyLifecycleResolver = new Map([
    [`confirmation_assurance:${canonicalText(refFor(policy))}`, {
      policy_kind: "confirmation_assurance", policy_ref: refFor(policy), current_head_ref: lifecycleRef,
      state: "active", valid_from: "2026-07-22T09:00:00Z", valid_until: "2026-07-22T11:00:00Z"
    }],
    [`confirmation_verifier:${canonicalText(refFor(verifierProfile))}`, {
      policy_kind: "confirmation_verifier", policy_ref: refFor(verifierProfile), current_head_ref: verifierLifecycleRef,
      state: "active", valid_from: "2026-07-22T09:00:00Z", valid_until: "2026-07-22T11:00:00Z"
    }]
  ]);
  return {
    policy,
    verifierProfile,
    policyLifecycleRef: lifecycleRef,
    verifierLifecycleRef,
    currentPolicyLifecycleResolver
  };
}

function confirmationReceiptFixture(authority, binding, fixture, overrides = {}) {
  const mandateIssuance = authority.schema === "cairn.agent_mandate.v0.3";
  const seed = make("cairn.confirmation_receipt.v0.1", {
    principal_id: binding.principal_id,
    authority_object_ref: refFor(authority),
    authority_object_hash: refFor(authority).object_hash,
    execution_binding_set_ref: mandateIssuance ? null : refFor(binding),
    method: "passkey",
    relying_party_or_audience: fixture.policy.relying_party_or_audience,
    user_presence: true,
    user_verification: true,
    assurance_policy_ref: refFor(fixture.policy),
    assurance_policy_hash: fixture.policy.policy_hash,
    assurance_policy_lifecycle_head_ref: fixture.policyLifecycleRef,
    assurance_policy_lifecycle_head_hash: fixture.policyLifecycleRef.object_hash,
    verifier_profile_ref: refFor(fixture.verifierProfile),
    verifier_profile_hash: fixture.verifierProfile.profile_hash,
    verifier_profile_lifecycle_head_ref: fixture.verifierLifecycleRef,
    verifier_profile_lifecycle_head_hash: fixture.verifierLifecycleRef.object_hash,
    verifier_id: fixture.verifierProfile.verifier_id,
    verified_at: "2026-07-22T10:00:00Z",
    expires_at: "2026-07-22T10:04:00Z",
    ...overrides
  });
  return make("cairn.confirmation_receipt.v0.1", {
    ...seed,
    challenge_hash: confirmationChallengeHash(authority, binding, seed)
  });
}

function distinctRefs(count, prefix = "ref") {
  return Array.from({ length: count }, (_, index) => ({
    schema: "cairn.example.v0.1",
    object_id: `${prefix}-${index}`,
    object_hash: `sha-256:${index.toString(16).padStart(64, "0")}`
  }));
}

function validControlAuthorization(overrides = {}) {
  return make("cairn.execution_control_authorization.v0.1", {
    scope: "all_agents", target_kind: "global", target_ref: null, compartment_control_key: null,
    action_control_key: null, recovery_grant_ref: null, recovery_grant_state_head_ref: null,
    recovery_grant_state_head_hash: null, recovery_use_idempotency_nonce: null,
    requested_at: "2026-07-22T10:00:00Z", expires_at: "2026-07-22T10:05:00Z",
    ...overrides
  });
}

function validCompartment(overrides = {}) {
  const money = (amount_minor) => ({ amount_minor, asset: "USD" });
  return make("cairn.agent_execution_compartment.v0.1", {
    accounting_asset: "USD", configured_ceiling: money(10000), per_action_ceiling: money(1000),
    outstanding_exposure_limit: money(5000), lifetime_limit: money(10000),
    window_limits: [{ amount_minor: 5000, asset: "USD", window_kind: "rolling", window_seconds: 86400 }],
    not_before: "2026-07-22T10:00:00Z", expires_at: "2026-08-22T10:00:00Z", ...overrides
  });
}

function validMandate(overrides = {}) {
  const mandate = sampleFor(schemasByObjectId.get("cairn.agent_mandate.v0.3"));
  const money = (amount_minor) => ({ amount_minor, asset: "USD" });
  mandate.constraints.kind = "financial";
  mandate.capability = "submit_bindable_offer";
  mandate.constraints.nonfinancial = null;
  mandate.constraints.financial.accounting_asset = "USD";
  mandate.constraints.financial.per_action_limit = money(1000);
  mandate.constraints.financial.aggregate_limit = money(5000);
  mandate.constraints.financial.outstanding_exposure_limit = money(3000);
  mandate.constraints.financial.fee_limit = money(100);
  mandate.constraints.financial.tax_limit = money(100);
  mandate.constraints.financial.shipping_limit = money(100);
  mandate.constraints.financial.price_corridor.minimum = money(100);
  mandate.constraints.financial.price_corridor.maximum = money(1000);
  mandate.constraints.financial.window_limits = [{ amount: money(2000), window_kind: "rolling", window_seconds: 86400 }];
  mandate.constraints.not_before = "2026-07-22T10:01:00Z";
  mandate.constraints.expires_at = "2026-07-23T10:00:00Z";
  mandate.issued_at = "2026-07-22T10:00:00Z";
  mandate.scope_bindings[0].asset = "USD";
  const runtimeSchema = baseSchemasByObjectId.get("cairn.agent_runtime_binding.v0.1");
  const runtime = sampleFor(runtimeSchema);
  runtime.agent_identity.agent_provider_id = mandate.agent.provider_id;
  runtime.agent_identity.agent_product_id = mandate.agent.product_id;
  runtime.runtime_public_key.public_key = "A".repeat(43);
  runtime.not_before = "2026-07-22T09:00:00Z";
  runtime.expires_at = "2026-07-24T10:00:00Z";
  const boundRuntime = bindObjectHash(runtime, runtimeSchema);
  const runtimeRef = objectRefFor(boundRuntime, runtimeSchema);
  const connection = make("cairn.agent_connection_authorization.v0.1", {
    principal_id: mandate.principal_id, agent_runtime_binding_ref: runtimeRef,
    not_before: "2026-07-22T09:00:00Z", expires_at: "2026-07-24T10:00:00Z"
  });
  mandate.agent.runtime_binding_ref = runtimeRef;
  mandate.agent.connection_authorization_ref = refFor(connection);
  context.objectResolver.set(runtimeRef.object_hash, boundRuntime);
  context.objectResolver.set(refFor(connection).object_hash, connection);
  Object.assign(mandate, overrides);
  return bindObjectHash(mandate, schemasByObjectId.get(mandate.schema));
}

function financialBindingContext(ref) {
  return {
    compartment_ref: ref, pre_reservation_compartment_state_head_ref: ref,
    pre_reservation_resource_exposure_state_head_ref: ref,
    pre_reservation_resource_exposure_state_head_hash: ref.object_hash,
    economic_resource_cap_state_head_ref: ref, economic_resource_cap_state_head_hash: ref.object_hash,
    principal_limit_policy_state_head_refs: [ref], economic_resource_key: ref.object_hash,
    compartment_control_key: ref.object_hash, protection_attestation_ref: ref,
    protection_attestation_hash: ref.object_hash, protection_attestation_lifecycle_head_ref: ref,
    protection_attestation_lifecycle_head_hash: ref.object_hash, provider_account_identity_head_ref: ref,
    account_generation: 0, provider_account_identity_trust_overlay_head_ref: ref,
    provider_account_identity_trust_overlay_head_hash: ref.object_hash, quote_snapshot_ref: ref,
    quote_hash: ref.object_hash, provider_quote_import_receipt_ref: ref,
    provider_quote_import_receipt_hash: ref.object_hash, quote_source_credential_lifecycle_head_ref: ref,
    quote_source_credential_lifecycle_head_hash: ref.object_hash, quote_source_credential_generation: 0,
    quote_importer_adapter_lifecycle_head_ref: ref, quote_importer_adapter_lifecycle_head_hash: ref.object_hash,
    provider_sublimit_identity_head_ref: null, provider_sublimit_identity_head_hash: null, provider_sublimit_id: null,
    sublimit_generation: null, provider_sublimit_identity_trust_overlay_head_ref: null,
    provider_sublimit_identity_trust_overlay_head_hash: null, accounting_policy_ref: ref
  };
}

function emptyEnumerableMap(domain, name) {
  const node = make("cairn.enumerable_map_node.v0.1", {
    map_domain: domain, node_kind: "empty", path_prefix_nibbles: "", leaf_entry: null,
    branch_children: [], subtree_entry_count: 0, entries_root: enumerableMapEmptyEntriesRoot(domain)
  });
  const map = make("cairn.enumerable_map_root.v0.1", {
    map_key: canonicalHash({ schema: "cairn.test_map_key.v0.1", name }),
    map_domain: domain, revision: 0, root_node_ref: refFor(node), root_node_hash: node.node_hash,
    entry_count: 0, entries_root: node.entries_root
  });
  return { node, map };
}

function stubExternalSignature(signedHash) {
  return {
    profile: "cairn-ed25519-v0.1", key_id: "cairn:test:external-authority",
    signed_hash: signedHash, value: "A".repeat(86), signed_at: "2026-07-22T10:01:00Z"
  };
}

function enumerableMapForExternalEntries(domain, name, entryKind, values) {
  const leaves = values.map(({ entryKey, entryObject, entryRef }) => {
    const leafEntry = {
      entry_key: entryKey, entry_kind: entryKind,
      entry_object_ref: entryRef, entry_object_hash: entryRef.object_hash
    };
    const node = make("cairn.enumerable_map_node.v0.1", {
      map_domain: domain, node_kind: "leaf", path_prefix_nibbles: entryKey.slice(8),
      leaf_entry: leafEntry, branch_children: [], subtree_entry_count: 1,
      entries_root: enumerableMapLeafEntriesRoot(domain, leafEntry)
    });
    return { leaf: leafEntry, object: entryObject, node };
  }).sort((left, right) => left.leaf.entry_key.localeCompare(right.leaf.entry_key));
  const rootNode = leaves.length === 1 ? leaves[0].node : make("cairn.enumerable_map_node.v0.1", {
    map_domain: domain, node_kind: "branch", path_prefix_nibbles: "", leaf_entry: null,
    branch_children: leaves.map(({ node }) => ({
      nibble: node.path_prefix_nibbles[0], child_path_prefix_nibbles: node.path_prefix_nibbles,
      child_node_ref: refFor(node), child_node_hash: node.node_hash,
      child_subtree_entry_count: node.subtree_entry_count, child_entries_root: node.entries_root
    })),
    subtree_entry_count: leaves.length,
    entries_root: enumerableMapBranchEntriesRoot(domain, "", leaves.length, leaves.map(({ node }) => ({
      nibble: node.path_prefix_nibbles[0], child_path_prefix_nibbles: node.path_prefix_nibbles,
      child_node_ref: refFor(node), child_node_hash: node.node_hash,
      child_subtree_entry_count: node.subtree_entry_count, child_entries_root: node.entries_root
    })))
  });
  const map = make("cairn.enumerable_map_root.v0.1", {
    map_key: canonicalHash({ schema: "cairn.test_map_key.v0.1", name }), map_domain: domain,
    revision: 1, root_node_ref: refFor(rootNode), root_node_hash: rootNode.node_hash,
    entry_count: leaves.length, entries_root: rootNode.entries_root
  });
  return { leaves, nodes: [...leaves.map(({ node }) => node), rootNode], map };
}

function compartmentStateFixture() {
  const money = (amount_minor) => ({ amount_minor, asset: "USD" });
  const compartment = validCompartment();
  const attestation = {
    schema: "cairn.compartment_protection_attestation.v0.1",
    attestation_id: compartment.protection_attestation_ref.object_id,
    attestation_hash: compartment.protection_attestation_ref.object_hash,
    asset: "USD", enforced_cap: money(10000)
  };
  const reservations = emptyEnumerableMap("compartment_active_reservation", "reservations");
  const atoms = emptyEnumerableMap("compartment_economic_atom", "atoms");
  const events = emptyEnumerableMap("compartment_confirmed_event", "events");
  const state = make("cairn.compartment_state_head.v0.1", {
    compartment_ref: refFor(compartment), economic_resource_key: compartment.economic_resource_key,
    compartment_control_key: compartment.compartment_control_key,
    authority_ledger_namespace: compartment.authority_ledger_namespace,
    sequence: 0, previous_state_hash: null, fencing_token: 0, state: "active", pre_freeze_state: null,
    active_reservations_root: reservations.map.entries_root,
    active_reservation_manifest_ref: refFor(reservations.map),
    active_reservation_manifest_hash: reservations.map.map_hash, active_reservation_count: 0,
    current_economic_atom_manifest_ref: refFor(atoms.map),
    current_economic_atom_manifest_hash: atoms.map.map_hash, current_economic_atom_count: 0,
    confirmed_event_manifest_ref: refFor(events.map),
    confirmed_event_manifest_hash: events.map.map_hash, confirmed_event_count: 0,
    receiver_backed_available: money(10000), cairn_reserved: money(0), confirmed_spent: money(0),
    confirmed_refunded: money(0), confirmed_reversal_loss: money(0),
    outstanding_reversal_exposure: money(0), quarantine_exposure: money(0),
    active_hold_atoms_root: compartmentEconomicAtomSubsetRoot("reserved", []),
    active_reversal_atoms_root: compartmentEconomicAtomSubsetRoot("active_reversal", []),
    quarantine_hold_atoms_root: compartmentEconomicAtomSubsetRoot("quarantine_hold", []),
    confirmed_spend_events_root: compartmentConfirmedEventSubsetRoot("confirmed_debit", []),
    confirmed_refund_events_root: compartmentConfirmedEventSubsetRoot("confirmed_refund", []),
    confirmed_reversal_events_root: compartmentConfirmedEventSubsetRoot("confirmed_reversal", []),
    observed_at: "2026-07-22T10:00:00Z"
  });
  const objects = [compartment, reservations.node, reservations.map, atoms.node, atoms.map, events.node, events.map, state];
  const fixtureContext = {
    ...context, externalObjectVerifier: () => true,
    objectResolver: new Map([
      ...objects.map((object) => [refFor(object).object_hash, object]),
      [attestation.attestation_hash, attestation]
    ])
  };
  return { compartment, attestation, reservations, atoms, events, state, objects, context: fixtureContext };
}

test("Phase 1 pins the fixed prose and byte-stable proposal dependencies", async () => {
  const validationSource = await readFile(new URL("../lib/validation.mjs", import.meta.url), "utf8");
  assert.equal([
    ...validationSource.matchAll(/\{\s*\.\.\.(?:[A-Za-z_$][A-Za-z0-9_$]*)?[Cc]ontext\b/g)
  ].length, 2,
  "only the two private context constructors may spread a context-bearing object");
  assert.equal(sources.manifest.audited_prose_spec_sha256, SPEC_SHA256);
  assert.equal(sources.manifest.base_bundle_hash, BASE_BUNDLE_HASH);
  assert.equal(sources.manifest.base_operation_registry_hash, BASE_REGISTRY_HASH);
  assert.equal(sources.pins.baseBundleHash, BASE_BUNDLE_HASH);
  assert.equal(sources.pins.baseRegistryHash, BASE_REGISTRY_HASH);
  const baseBundle = JSON.parse(await readFile(path.resolve(root, "../dist/cairn-protocol-bundle-v0.1.json"), "utf8"));
  const { bundle_hash: claimed, ...unsigned } = baseBundle;
  assert.equal(claimed, canonicalHash(unsigned));
  assert.ok(PHASE1_SOURCE_COMMITMENT_FILES.includes("../lib/core.mjs"));
  assert.ok(PHASE1_SOURCE_COMMITMENT_FILES.includes("lib/core.mjs"));
  assert.ok(PHASE1_SOURCE_COMMITMENT_FILES.includes("package-lock.json"));
  const sharedCore = await readFile(path.join(root, "../lib/core.mjs"));
  const localCore = await readFile(path.join(root, "lib/core.mjs"));
  assert.equal(sha256(sharedCore), SHARED_CORE_SHA256);
  assert.deepEqual(localCore, sharedCore);
  assert.equal(built.bundle.dependency_pins.shared_core_sha256, SHARED_CORE_SHA256);
  const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
  assert.deepEqual(lock.packages[""].dependencies, {
    ajv: "8.20.0", "ajv-formats": "3.0.1", canonicalize: "3.0.0"
  });
  for (const dependency of ["ajv", "ajv-formats", "canonicalize"]) {
    assert.match(lock.packages[`node_modules/${dependency}`].integrity, /^sha512-/);
    assert.ok(fileURLToPath(import.meta.resolve(dependency)).startsWith(path.join(root, "node_modules", dependency)));
  }
  for (const [location, entry] of Object.entries(lock.packages)) {
    if (location === "") continue;
    assert.ok(location.startsWith("node_modules/"));
    assert.match(entry.integrity, /^sha512-/);
    const installed = JSON.parse(await readFile(path.join(root, location, "package.json"), "utf8"));
    assert.equal(installed.version, entry.version);
  }
  for (const file of [
    "lib/bundle.mjs", "lib/validation.mjs", "lib/schemas.mjs",
    "scripts/check-bundle.mjs", "scripts/run-mutants.mjs", "tests/phase1.test.mjs"
  ]) {
    assert.doesNotMatch(await readFile(path.join(root, file), "utf8"), /\.\.\/\.\.\/lib\/core\.mjs/);
  }
  const mutantRunner = await readFile(path.join(root, "scripts/run-mutants.mjs"), "utf8");
  assert.match(mutantRunner, /path\.join\(executionRoot, "node_modules"\)/);
  assert.doesNotMatch(mutantRunner, /path\.join\(protocolRoot, "node_modules"\)/);
  const packageDocument = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  assert.equal(packageDocument.bin, undefined);
  for (const script of ["start", "serve", "deploy"]) assert.equal(packageDocument.scripts[script], undefined);
  for (const file of ["lib/bundle.mjs", "lib/validation.mjs", "lib/schemas.mjs", "lib/core.mjs"]) {
    assert.doesNotMatch(await readFile(path.join(root, file), "utf8"), /from ["'](?:node:https?|undici|express|paypal|stripe|pg|mysql)/);
  }
  const prose = await readFile(path.resolve(root, "../../Protocol_Agent_Execution_Change_Spec_v0.1.md"), "utf8");
  assert.match(prose, /^execution\.receiver_terminal_release_plan_core\.get$/m);
  assert.doesNotMatch(prose, /^execution\.receiver_terminal_release_plan\.get$/m);
  assert.ok(PHASE1_OPERATIONS.some(({ name }) => name === "execution.receiver_terminal_release_plan_core.get"));
  assert.ok(!PHASE1_OPERATIONS.some(({ name }) => name === "execution.receiver_terminal_release_plan.get"));
});

test("Phase 1 bundle and registry are deterministic", async () => {
  const again = await buildPhase1Bundle(root);
  assert.equal(again.bytes, built.bytes);
  assert.equal(again.registryBytes, built.registryBytes);
  const { bundle_hash, ...unsigned } = built.bundle;
  assert.equal(bundle_hash, canonicalHash(unsigned));
  assert.equal(built.bundle.operation_registry_hash, canonicalHash(sources.registry));
  assert.deepEqual(Object.keys(built.bundle.source_commitments), [...PHASE1_SOURCE_COMMITMENT_FILES]);
  for (const file of PHASE1_SOURCE_COMMITMENT_FILES) {
    assert.equal(built.bundle.source_commitments[file], sha256(await readFile(path.join(root, file))));
  }
});

test("Phase 1 exposes only the exact read-only non-effectful registry", () => {
  assert.equal(audit.objectSchemaCount, 46);
  assert.equal(audit.operationCount, 29);
  assert.deepEqual(sources.registry.operations.map(({ name }) => name), PHASE1_OPERATIONS.map(({ name }) => name));
  assert.ok(sources.registry.operations.every((operation) =>
    operation.name.startsWith("execution.") && !operation.mutating && !operation.external_effect &&
    operation.authority_effect === "none" && operation.implementation_status === "schema_only"));
});

test("operation envelopes and registry metadata close compatibility before dispatch", () => {
  const operationBodies = schemasById.get(
    "https://cairn.cards/protocol/execution/schemas/v0.1/operation-bodies.schema.json"
  );
  const expectedAccess = {
    public: ["public", "none", "public"],
    owner_or_exact_runtime_data_grant: [
      "principal_owner_or_exact_runtime_resource",
      "owner_bypass_or_exact_runtime_object_read_grant",
      "principal_owner_or_exact_runtime"
    ],
    owner_or_exact_runtime_audit_control_grant: [
      "principal_owner_or_exact_runtime_resource",
      "owner_bypass_or_exact_runtime_audit_control_grant",
      "principal_owner_or_exact_runtime_audit_control"
    ],
    owner_or_exact_runtime_activity_grant: [
      "principal_owner_or_exact_runtime_resource",
      "owner_bypass_or_exact_runtime_activity_grant",
      "principal_owner_or_exact_runtime"
    ],
    owner_plus_audit_detail_or_exact_runtime_audit_grant: [
      "principal_owner_audit_detail_or_exact_runtime_resource",
      "owner_audit_bypass_or_exact_runtime_audit_grant",
      "principal_owner_audit_detail_or_exact_runtime"
    ],
    inherited_parent_private_or_audit_acl: [
      "inherited_parent_private_or_audit_acl",
      "inherited_parent_private_or_audit_acl",
      "parent_acl_authorized_reader"
    ]
  };
  const expectedAccessByOperation = new Map([
    ...[
      "execution.connection_authorization.get", "execution.connection_state.get",
      "execution.connection_outstanding_action_index.get",
      "execution.control_namespace.get", "execution.control.get",
      "execution.mandate.get", "execution.authorization.get",
      "execution.cancellation_authorization.get"
    ].map((name) => [name, "owner_or_exact_runtime_audit_control_grant"]),
    ...[
      "execution.connection_state_event_receipt.get", "execution.control_receipt.get",
      "execution.connection_outstanding_action_entry.get",
      "execution.connection_outstanding_action_index_transition_receipt.get",
      "execution.receipt.get", "execution.activity.detail.get"
    ].map((name) => [name, "owner_plus_audit_detail_or_exact_runtime_audit_grant"]),
    ["execution.confirmation_receipt.get", "inherited_parent_private_or_audit_acl"]
  ]);
  for (const removed of [
    "execution.compartment.get",
    "execution.compartment_state.get",
    "execution.compartment_state_transition_receipt.get",
    "execution.enumerable_map.get",
    "execution.transition_manifest.get"
  ]) {
    assert.ok(!PHASE1_OPERATIONS.some(({ name }) => name === removed), removed);
    assert.ok(!sources.registry.operations.some(({ name }) => name === removed), removed);
    assert.deepEqual(validateOperationRequestEnvelope(removed, {}, context),
      ["request_envelope_operation_unregistered"]);
    assert.deepEqual(validateExactObjectRead(
      removed, { ref: distinctRefs(1, `removed-${removed}`)[0] }, {}, context
    ), ["object_read_operation_invalid"]);
  }
  const requestCommitments = new Set();
  for (const operation of sources.registry.operations) {
    const definition = operation.request_schema.split("#/$defs/")[1];
    const envelopeSchema = operationBodies.$defs[definition];
    assert.ok(envelopeSchema, operation.name);
    assert.equal(envelopeSchema.additionalProperties, false);
    assert.equal(envelopeSchema.properties.operation.const, operation.name);
    assert.equal(envelopeSchema.properties.body.$ref, operation.request_body_schema);
    assert.equal(envelopeSchema.properties.execution_bundle_hash.const, undefined);
    assert.equal(envelopeSchema.properties.operation_registry_hash.const, undefined);
    assert.equal(operation.request_schema_hash, schemaLocationCommitment(operation.request_schema, sources.schemas));
    assert.equal(operation.request_body_schema_hash, schemaLocationCommitment(operation.request_body_schema, sources.schemas));
    assert.equal(operation.response_schema_hash, schemaLocationCommitment(operation.response_schema, sources.schemas));
    assert.equal(operation.request_schema_hash, canonicalHash({
      schema_uri: operation.request_schema,
      schema_node: resolveRef(operation.request_schema, operationBodies).schema
    }));
    assert.equal(operation.request_body_schema_hash, canonicalHash({
      schema_uri: operation.request_body_schema,
      schema_node: resolveRef(operation.request_body_schema, operationBodies).schema
    }));
    assert.equal(operation.response_schema_hash, canonicalHash({
      schema_uri: operation.response_schema,
      schema_node: resolveRef(operation.response_schema, operationBodies).schema
    }));
    requestCommitments.add(operation.request_schema_hash);

    const envelope = sampleFor(envelopeSchema, operationBodies);
    envelope.execution_bundle_hash = context.bundleHash;
    envelope.operation_registry_hash = context.registryHash;
    assert.equal(audit.ajv.getSchema(operation.request_schema)(envelope), true, operation.name);
    assert.deepEqual(validateOperationRequestEnvelope(operation.name, envelope, context), [], operation.name);
    assert.ok(validateOperationRequestEnvelope(operation.name, {
      ...envelope, execution_bundle_hash: `sha-256:${"f".repeat(64)}`
    }, context).includes("request_envelope_execution_bundle_mismatch"));
    assert.ok(validateOperationRequestEnvelope(operation.name, {
      ...envelope, operation_registry_hash: `sha-256:${"f".repeat(64)}`
    }, context).includes("request_envelope_registry_mismatch"));
    assert.deepEqual(validateOperationRequestEnvelope(operation.name, envelope, {
      ...context, bundleHash: undefined
    }), ["request_envelope_execution_bundle_mismatch"]);
    assert.deepEqual(validateOperationRequestEnvelope(operation.name, envelope, {
      ...context, registryHash: undefined
    }), ["request_envelope_registry_mismatch"]);
    assert.deepEqual([
      operation.authentication_branch,
      operation.data_grant_prerequisite,
      operation.caller_class
    ], expectedAccess[operation.access_requirement]);
    if (expectedAccessByOperation.has(operation.name)) {
      assert.equal(operation.access_requirement, expectedAccessByOperation.get(operation.name), operation.name);
    }
    assert.equal(operation.disclosure_prerequisite, "none");
    assert.equal(operation.authority_prerequisite, "none");
    assert.equal(operation.idempotency_rule, "not_applicable_schema_only");
    assert.equal(operation.receipt_family, "none");
  }
  assert.equal(requestCommitments.size, PHASE1_OPERATIONS.length);
  assert.equal(expectedAccessByOperation.size, 15);

  const mandateOperation = sources.registry.operations.find(({ name }) => name === "execution.mandate.get");
  const mandateDefinition = operationBodies.$defs[mandateOperation.request_schema.split("#/$defs/")[1]];
  const mandateEnvelope = sampleFor(mandateDefinition, operationBodies);
  Object.assign(mandateEnvelope, {
    execution_bundle_hash: context.bundleHash,
    operation_registry_hash: context.registryHash
  });
  assert.deepEqual(validateOperationRequestEnvelope("execution.unknown.get", mandateEnvelope, context),
    ["request_envelope_operation_unregistered"]);
  assert.deepEqual(validateOperationRequestEnvelope("execution.mandate.get", {
    ...mandateEnvelope, operation: "execution.binding_set.get"
  }, context), ["request_envelope_schema_invalid"]);
  assert.deepEqual(validateOperationRequestEnvelope("execution.mandate.get", {
    ...mandateEnvelope, body: {}, extra: true
  }, context), ["request_envelope_schema_invalid"]);

  const badHashSources = structuredClone(sources);
  badHashSources.registry.operations[0].request_schema_hash = `sha-256:${"f".repeat(64)}`;
  assert.throws(() => auditPhase1Sources(badHashSources), /registry schema commitment differs/);
  const badResponseHashSources = structuredClone(sources);
  badResponseHashSources.registry.operations[0].response_schema_hash = `sha-256:${"f".repeat(64)}`;
  assert.throws(() => auditPhase1Sources(badResponseHashSources), /registry schema commitment differs/);
  const badMetadataSources = structuredClone(sources);
  badMetadataSources.registry.operations[1].authentication_branch = "public";
  assert.throws(() => auditPhase1Sources(badMetadataSources), /exact closed surface/);
  const registrySchema = schemasById.get(
    "https://cairn.cards/protocol/execution/schemas/v0.1/operation-registry.schema.json"
  );
  const registryRow = registrySchema.properties.operations.items.properties;
  assert.equal(registryRow.disclosure_prerequisite.const, "none");
  assert.equal(registryRow.authority_prerequisite.const, "none");
  assert.equal(registryRow.idempotency_rule.const, "not_applicable_schema_only");
  assert.equal(registryRow.receipt_family.const, "none");
  assert.equal(registryRow.authority_effect.const, "none");
  assert.equal(registryRow.implementation_status.const, "schema_only");
});

test("generic read responses are typed and bind the exact returned object", () => {
  const receipt = make("cairn.confirmation_receipt.v0.1");
  const receiptResponse = { ref: refFor(receipt), object: receipt, retrieved_at: "2026-07-22T10:00:00Z" };
  assert.deepEqual(validateReceiptObjectResponse(receiptResponse, context), []);
  const policy = make("cairn.confirmation_assurance_policy.v0.1");
  const policyResponse = { ref: refFor(policy), object: policy, retrieved_at: "2026-07-22T10:00:00Z" };
  assert.deepEqual(validatePolicyObjectResponse(policyResponse, context), []);
  const responseDocument = schemasById.get("https://cairn.cards/protocol/execution/schemas/v0.1/operation-bodies.schema.json");
  const alternatives = (definition) => responseDocument.$defs[definition].properties.object.oneOf.map(({ $ref }) => $ref);
  assert.deepEqual(alternatives("baseObjectResponse"), sources.pins.baseObjectSchemaUris);
  assert.deepEqual(alternatives("policyObjectResponse"), [
    "https://cairn.cards/protocol/execution/schemas/v0.1/confirmation-assurance-policy.schema.json",
    "https://cairn.cards/protocol/execution/schemas/v0.1/confirmation-verifier-profile.schema.json"
  ]);
  const receiptAlternatives = alternatives("receiptObjectResponse");
  assert.equal(receiptAlternatives.length, 8);
  for (const removed of [
    "execution-redemption-receipt-v0.2.schema.json",
    "lineage-provisional-terminal-receipt.schema.json",
    "compartment-state-transition-receipt.schema.json"
  ]) {
    assert.ok(receiptAlternatives.every((reference) => !reference.endsWith(removed)), removed);
  }
  assert.deepEqual(validateBaseObjectResponse(receiptResponse, context), ["base_object_response_schema_invalid"]);
  assert.deepEqual(validatePolicyObjectResponse(receiptResponse, context), ["policy_object_response_schema_invalid"]);
  assert.deepEqual(validateReceiptObjectResponse(policyResponse, context), ["receipt_object_response_schema_invalid"]);
  assert.deepEqual(validateReceiptObjectResponse({
    ...receiptResponse,
    object: { schema: "cairn.unregistered.v0.1", undeclared_authority: true }
  }, context), ["receipt_object_response_schema_invalid"]);
  assert.deepEqual(validateReceiptObjectResponse({
    ...receiptResponse,
    ref: distinctRefs(1, "wrong-read-object")[0]
  }, context), ["receipt_object_response_ref_mismatch"]);
  const driftedConfirmation = make("cairn.confirmation_receipt.v0.1", {
    authority_object_hash: `sha-256:${"f".repeat(64)}`
  });
  assert.ok(validatePhase1Object(driftedConfirmation, context).includes("phase1_ref_hash_mismatch"));
  assert.ok(validateReceiptObjectResponse({
    ref: refFor(driftedConfirmation), object: driftedConfirmation, retrieved_at: "2026-07-22T10:00:00Z"
  }, context).includes("receipt_object_response_ref_hash_mismatch"));
  assert.equal(sources.pins.baseObjectSchemaUris.length, 12);
});

test("read surfaces close every execution family and bind object requests to returned identity", () => {
  const authorization = make("cairn.execution_control_authorization.v0.1");
  const authorizationResponse = { ref: refFor(authorization), object: authorization, retrieved_at: "2026-07-22T10:00:00Z" };
  assert.deepEqual(validateAuthorizationObjectResponse(authorizationResponse, context), []);
  const control = make("cairn.scoped_execution_control_leaf_state_head.v0.1");
  const controlResponse = { ref: refFor(control), object: control, retrieved_at: "2026-07-22T10:00:00Z" };
  assert.deepEqual(validateControlObjectResponse(controlResponse, context), []);
  assert.deepEqual(validateAuthorizationObjectResponse(controlResponse, context), ["authorization_object_response_schema_invalid"]);

  const mandate = validMandate();
  const mandateRequest = { ref: refFor(mandate) };
  const mandateRuntime = context.objectResolver.get(mandate.agent.runtime_binding_ref.object_hash);
  const mandateAuthorization = context.objectResolver.get(mandate.agent.connection_authorization_ref.object_hash);
  assert.deepEqual(validateExactObjectRead(
    "execution.mandate.get", mandateRequest, mandate,
    signedReadContext([mandate, mandateRuntime, mandateAuthorization], context, mandate.principal_id)
  ), ["phase1_authenticated_resolution_unsupported"]);
  const signedMandateContext = signedReadContext(
    [mandate, mandateRuntime, mandateAuthorization], context, mandate.principal_id
  );
  const invalidRuntimeSignature = structuredClone(mandateRuntime);
  invalidRuntimeSignature.provider_signature.value = "A".repeat(86);
  assert.ok(validateExactObjectRead(
    "execution.mandate.get", mandateRequest, mandate, {
      ...signedMandateContext,
      objectResolver: new Map([
        ...context.objectResolver,
        [mandate.agent.runtime_binding_ref.object_hash, invalidRuntimeSignature]
      ])
    }
  ).includes("object_read_mandate_runtime_signature_invalid"));
  const invalidAuthorizationSignature = structuredClone(mandateAuthorization);
  invalidAuthorizationSignature.principal_signature.value = "A".repeat(86);
  assert.ok(validateExactObjectRead(
    "execution.mandate.get", mandateRequest, mandate, {
      ...signedMandateContext,
      objectResolver: new Map([
        ...context.objectResolver,
        [mandate.agent.connection_authorization_ref.object_hash, invalidAuthorizationSignature]
      ])
    }
  ).includes("object_read_mandate_connection_authorization_mismatch"));
  const invalidMandateScope = validMandate();
  invalidMandateScope.scope_bindings[0].receiver_account_or_contract_scope = null;
  const reboundInvalidMandateScope = bindObjectHash(
    invalidMandateScope, schemasByObjectId.get(invalidMandateScope.schema)
  );
  assert.ok(validateExactObjectRead(
    "execution.mandate.get", { ref: refFor(reboundInvalidMandateScope) }, reboundInvalidMandateScope, context
  ).includes("object_read_mandate_external_receiver_scope_incomplete"));
  const otherMandate = validMandate({ mandate_id: "urn:uuid:00000000-0000-4000-8000-000000000002" });
  assert.deepEqual(validateExactObjectRead("execution.mandate.get", mandateRequest, otherMandate, context),
    ["object_read_request_ref_mismatch"]);

  const bodies = schemasById.get("https://cairn.cards/protocol/execution/schemas/v0.1/operation-bodies.schema.json").$defs;
  for (const name of [
    "action_record", "execution_binding_set", "lineage_commitment", "current_action_state_head",
    "current_lineage_state_head", "current_activity_detail", "authority_basis", "authority_reservations",
    "confirmation_receipt", "gate_request", "gate_result"
  ]) {
    assert.ok(Object.hasOwn(bodies.actionGetResponse.properties, name), name);
  }
  assert.equal(bodies.actionGetResponse.properties.action_record.$ref,
    "https://cairn.cards/protocol/execution/schemas/v0.1/action-record-v0.2.schema.json");
  assert.equal(PHASE1_OPERATIONS.find(({ name }) => name === "execution.action.get").response_schema,
    "https://cairn.cards/protocol/execution/schemas/v0.1/operation-bodies.schema.json#/$defs/actionGetResponse");
  const boundaryActionRecord = make("cairn.action_record.v0.2");
  const boundaryBindingSet = make("cairn.execution_binding_set.v0.1");
  const boundaryLineageCommitment = make("cairn.lineage_commitment.v0.1");
  const boundaryActionState = make("cairn.action_state_head.v0.1");
  const boundaryLineageState = make("cairn.lineage_state_head.v0.1");
  const boundaryActivity = make("cairn.execution_activity_detail.v0.1");
  const boundaryView = make("cairn.execution_action_view.v0.1");
  const actionBoundaryResponse = {
    ref: refFor(boundaryView),
    view: boundaryView,
    action_record: boundaryActionRecord,
    execution_binding_set: boundaryBindingSet,
    lineage_commitment: boundaryLineageCommitment,
    current_action_state_head: boundaryActionState,
    current_lineage_state_head: boundaryLineageState,
    current_activity_detail: boundaryActivity,
    authority_basis: null,
    authority_reservations: [],
    confirmation_receipt: null,
    gate_request: null,
    gate_result: null,
    retrieved_at: "2026-07-22T10:00:00Z"
  };
  const actionBoundaryFailures = validateActionGetResponse(
    { ref: actionBoundaryResponse.ref }, actionBoundaryResponse, context
  );
  assert.ok(actionBoundaryFailures.includes("phase1_authenticated_resolution_unsupported"),
    JSON.stringify(actionBoundaryFailures));
});

test("exact reads authenticate returned bytes and reject stale mutable heads", () => {
  const control = make("cairn.scoped_execution_control_leaf_state_head.v0.1", {
    scope: "connection", target_kind: "object_ref", target_ref: distinctRefs(1, "control-target")[0],
    compartment_control_key: null, action_control_key: null,
    state: "active", revocation_nonce: 0, sequence: 0, previous_state_hash: null
  });
  const controlRef = refFor(control);
  const signedContext = signedReadContext(control, {
    ...context,
    currentHeadResolver: currentHeadResolverFor([controlRef])
  }, control.principal_id);
  const response = { ref: controlRef, object: control, retrieved_at: "2026-07-22T10:00:00Z" };
  assert.deepEqual(validateExactObjectRead(
    "execution.control.get", { ref: controlRef }, response, signedContext
  ), ["phase1_authenticated_resolution_unsupported"]);

  const lateSignedControl = make("cairn.scoped_execution_control_leaf_state_head.v0.1", {
    ...control,
    authority_service_signature: {
      ...control.authority_service_signature,
      signed_at: "2026-07-22T10:00:01Z"
    }
  });
  const lateControlRef = refFor(lateSignedControl);
  const lateControlContext = signedReadContext(lateSignedControl, {
    ...context,
    currentHeadResolver: currentHeadResolverFor([lateControlRef])
  }, lateSignedControl.principal_id);
  assert.ok(validateExactObjectRead(
    "execution.control.get", { ref: lateControlRef }, {
      ref: lateControlRef, object: lateSignedControl, retrieved_at: "2026-07-22T10:00:00Z"
    }, lateControlContext
  ).includes("object_read_signature_from_future"));

  const futureEffectiveControl = make("cairn.scoped_execution_control_leaf_state_head.v0.1", {
    ...control,
    updated_at: "2026-07-22T10:00:01Z",
    authority_service_signature: {
      ...control.authority_service_signature,
      signed_at: "2026-07-22T10:00:00Z"
    }
  });
  const futureEffectiveRef = refFor(futureEffectiveControl);
  const futureEffectiveContext = signedReadContext(futureEffectiveControl, {
    ...context,
    currentHeadResolver: currentHeadResolverFor([futureEffectiveRef])
  }, futureEffectiveControl.principal_id);
  assert.ok(validateExactObjectRead(
    "execution.control.get", { ref: futureEffectiveRef }, {
      ref: futureEffectiveRef, object: futureEffectiveControl, retrieved_at: "2026-07-22T10:00:00Z"
    }, futureEffectiveContext
  ).includes("object_read_effective_time_after_snapshot"));

  const corrupted = structuredClone(control);
  corrupted.authority_service_signature.value = "A".repeat(86);
  const corruptedFailures = validateExactObjectRead(
    "execution.control.get", { ref: controlRef }, { ...response, object: corrupted }, signedContext
  );
  assert.ok(corruptedFailures.includes("object_read_signature_invalid"), JSON.stringify(corruptedFailures));

  const staleRef = { ...controlRef, object_hash: `sha-256:${"9".repeat(64)}` };
  assert.ok(validateExactObjectRead(
    "execution.control.get", { ref: controlRef }, response, {
      ...signedContext, currentHeadResolver: currentHeadResolverFor([staleRef])
    }
  ).includes("object_read_current_head_mismatch"));
});

test("resource limits are byte-based, aggregate, depth-bounded, and applied before parsing", () => {
  assert.deepEqual(validatePhase1RequestBytes(Buffer.alloc(2_097_152)), []);
  assert.deepEqual(validatePhase1RequestBytes(Buffer.alloc(2_097_153)), ["phase1_request_bytes_exceeded"]);
  assert.deepEqual(validatePhase1RequestBytes("é".repeat(1_048_577)), ["phase1_request_bytes_exceeded"]);

  const longStringMandate = validMandate();
  longStringMandate.scope_bindings[0].ultimate_receiver_or_payee = "é".repeat(32_769);
  const longStringBound = bindObjectHash(longStringMandate, schemasByObjectId.get(longStringMandate.schema));
  assert.ok(validatePhase1Object(longStringBound, context).includes("phase1_canonical_string_bytes_exceeded"));

  const bounds = make("cairn.execution_resource_bounds_profile.v0.1", {
    execution_resource_audiences: [`https://example.invalid/${"x".repeat(4097)}`]
  });
  assert.ok(validatePhase1Object(bounds, context).includes("phase1_uri_bytes_exceeded"));

  const oversizedMandate = validMandate();
  const wide = "x".repeat(4096);
  oversizedMandate.scope_bindings = Array.from({ length: 64 }, () => ({
    ...structuredClone(oversizedMandate.scope_bindings[0]),
    ultimate_receiver_or_payee: wide,
    receiver_account_or_contract_scope: wide,
    receiver_operation_namespace: wide,
    executor_target: wide
  }));
  const oversizedBound = bindObjectHash(oversizedMandate, schemasByObjectId.get(oversizedMandate.schema));
  assert.ok(validatePhase1Object(oversizedBound, context).includes("phase1_canonical_object_bytes_exceeded"));

  const deep = validMandate();
  let nested = {};
  deep.undeclared_deep_value = nested;
  for (let depth = 0; depth < 33; depth += 1) {
    nested.next = {};
    nested = nested.next;
  }
  const deepBound = bindObjectHash(deep, schemasByObjectId.get(deep.schema));
  assert.ok(validatePhase1Object(deepBound, context).includes("phase1_json_nesting_depth_exceeded"));
});

test("every Phase 1 object schema admits a bound closed specimen and rejects extensions", () => {
  assert.equal(PHASE1_OBJECTS.length, 46);
  for (const profile of PHASE1_OBJECTS) {
    const schema = schemasByObjectId.get(profile.schema);
    const validate = audit.ajv.getSchema(schema.$id);
    const specimen = make(profile.schema);
    assert.equal(validate(specimen), true, `${profile.schema}: ${JSON.stringify(validate.errors)}`);
    assert.deepEqual(validatePhase1Object(specimen, context), [], profile.schema);
    const extended = { ...specimen, undeclared_authority: true };
    assert.equal(validate(extended), false, `${profile.schema} accepted an undeclared field`);
  }
});

test("explicit prose schemas retain exact fields and every array is release-bounded", () => {
  const bounds = PHASE1_OBJECTS.find(({ schema }) => schema === "cairn.execution_resource_bounds_profile.v0.1");
  assert.equal(bounds.fields.profile_id, "const:cairn-supervised-execution-v0.1-bounds");
  assert.equal(bounds.fields.max_request_bytes, "constint:2097152");
  assert.equal(bounds.fields.max_state_head_writes_per_atomic_transaction, "constint:32768");
  assert.equal(bounds.signatures[0], "execution_release_authority_signature");
  assert.equal(Object.keys(bounds.fields).length, 49);
  const manifest = PHASE1_OBJECTS.find(({ schema }) => schema === "cairn.enumerable_transition_manifest.v0.1");
  assert.deepEqual(Object.keys(manifest.fields), ["manifest_kind", "subject_ref", "subject_hash", "authority_transaction_id", "entry_count", "sorted_entries", "entries_root", "manifest_hash", "issuing_authority_id", "issuing_authority_signature"]);
  const authorization = PHASE1_OBJECTS.find(({ schema }) => schema === "cairn.action_authorization.v0.2");
  for (const field of ["receiver_account_or_contract_scope", "receiver_operation_namespace", "explicit_scope_selection_proof_ref",
    "explicit_scope_selection_proof_hash", "payee_account_commitment", "exposure_vector", "rail", "disclosure_authorization_refs",
    "disclosure_reservation_refs", "acknowledged_warning_codes", "acknowledged_transaction_semantics", "reserved_judgments_decided",
    "idempotency_key", "required_confirmation_assurance_policy_ref"]) assert.ok(field in authorization.fields, field);
  assert.ok(!("warning_acknowledgement_codes" in authorization.fields));
  assert.ok(!("confirmation_policy_ref" in authorization.fields));
  assert.ok(!("issued_at" in authorization.fields));
  const cancellation = PHASE1_OBJECTS.find(({ schema }) => schema === "cairn.cancellation_authorization.v0.1");
  assert.equal(Object.keys(cancellation.fields).length, 60);
  for (const field of ["authorization_mode", "restrictive_control_head_ref", "original_outbox_handoff_receipt_ref",
    "cancellation_credential_continuity_receipt_ref", "original_operation_locator", "authorized_cancel_state_set",
    "reserved_judgments_decided",
    "required_confirmation_assurance_policy_ref"]) assert.ok(field in cancellation.fields, field);
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (value.type === "array") assert.ok(Number.isInteger(value.maxItems) && value.maxItems <= 128);
    for (const child of Object.values(value)) walk(child);
  };
  for (const { document } of sources.schemas) walk(document);
});

test("Phase 1 signed objects derive controllers and separate historical validity from current eligibility", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const object = sampleFor(schemasByObjectId.get("cairn.agent_connection_authorization.v0.1"));
  object.not_before = "2026-07-22T09:00:00Z";
  object.expires_at = "2026-07-22T11:00:00Z";
  if (Object.hasOwn(object, "issued_at")) object.issued_at = "2026-07-22T10:00:00Z";
  object.principal_signature.key_id = "did:example:collector#phase1";
  object.principal_signature.signed_at = "2026-07-22T10:00:01Z";
  const bound = bindObjectHash(object, schemasByObjectId.get(object.schema));
  const proof = valueAtPointer(bound, "/principal_signature");
  proof.value = signBytes(null, signatureInput(bound.schema, proof.signed_hash), privateKey).toString("base64url");
  const key = {
    key_id: proof.key_id, key_type: "Ed25519", controller: bound.principal_id, status: "active",
    not_before: "2026-07-22T08:00:00Z", expires_at: "2026-07-22T12:00:00Z", revocation_time: null,
    public_key: publicKey.export({ format: "jwk" }).x
  };
  const signedContext = {
    ...context,
    now: "2026-07-22T10:01:00Z",
    keyResolver: new Map([[key.key_id, key]]),
    expectedControllersByPointer: { "/principal_signature": bound.principal_id }
  };
  assert.deepEqual(validatePhase1SignedObject(bound, signedContext),
    ["phase1_authenticated_resolution_unsupported"]);
  assert.deepEqual(validatePhase1SignedObject(bound, {
    ...signedContext, expectedControllersByPointer: { "/principal_signature": "did:example:attacker" }
  }), ["phase1_authenticated_resolution_unsupported"]);
  const tampered = structuredClone(bound);
  tampered.principal_signature.value = Buffer.alloc(64, 1).toString("base64url");
  assert.ok(validatePhase1SignedObject(tampered, signedContext).includes("signature_invalid"));
  const wrongController = { ...key, controller: "did:example:other" };
  assert.ok(validatePhase1SignedObject(bound, {
    ...signedContext, keyResolver: new Map([[key.key_id, wrongController]])
  }).includes("signature_controller_mismatch"));
  const historicallyValid = { ...key, status: "revoked", revocation_time: "2026-07-22T10:30:00Z" };
  assert.deepEqual(validatePhase1SignedObject(bound, {
    ...signedContext, keyResolver: new Map([[key.key_id, historicallyValid]])
  }), ["phase1_authenticated_resolution_unsupported"]);
  assert.deepEqual(validatePhase1SignedObject(bound, {
    ...signedContext, keyResolver: new Map([[key.key_id, historicallyValid]]), requireCurrentKeyEligibility: true
  }), ["phase1_authenticated_resolution_unsupported"]);
  assert.ok(validatePhase1SignedObject(bound, {
    ...signedContext, now: "2026-07-22T10:30:00Z",
    keyResolver: new Map([[key.key_id, historicallyValid]]), requireCurrentKeyEligibility: true
  }).includes("signature_key_not_currently_eligible"));
  const resolverEvaluationTimes = [];
  const functionResolverContext = {
    ...signedContext,
    keyResolver: (keyId, evaluationTime) => {
      resolverEvaluationTimes.push([keyId, evaluationTime]);
      return historicallyValid;
    },
    requireCurrentKeyEligibility: true
  };
  assert.deepEqual(validatePhase1SignedObject(bound, functionResolverContext),
    ["phase1_authenticated_resolution_unsupported"]);
  assert.deepEqual(resolverEvaluationTimes, [
    [key.key_id, bound.principal_signature.signed_at],
    [key.key_id, signedContext.now]
  ]);
  const currentlyExpired = { ...key, expires_at: "2026-07-22T10:30:00Z" };
  assert.ok(validatePhase1SignedObject(bound, {
    ...signedContext, now: "2026-07-22T11:00:00Z", keyResolver: new Map([[key.key_id, currentlyExpired]]),
    requireCurrentKeyEligibility: true
  }).includes("signature_key_not_currently_eligible"));
  const currentlyRevoked = { ...key, revocation_time: "2026-07-22T10:30:00Z" };
  assert.ok(validatePhase1SignedObject(bound, {
    ...signedContext, now: "2026-07-22T11:00:00Z", keyResolver: new Map([[key.key_id, currentlyRevoked]]),
    requireCurrentKeyEligibility: true
  }).includes("signature_key_not_currently_eligible"));
  const splitResolverTimes = [];
  assert.ok(validatePhase1SignedObject(bound, {
    ...signedContext,
    now: "2026-07-22T11:00:00Z",
    requireCurrentKeyEligibility: true,
    keyResolver: (keyId, evaluationTime) => {
      splitResolverTimes.push([keyId, evaluationTime]);
      return evaluationTime === bound.principal_signature.signed_at ? key : currentlyRevoked;
    }
  }).includes("signature_key_not_currently_eligible"));
  assert.deepEqual(splitResolverTimes, [
    [key.key_id, bound.principal_signature.signed_at],
    [key.key_id, "2026-07-22T11:00:00Z"]
  ]);
  assert.equal(validatePhase1SignedObject(bound, {
    ...signedContext, now: "2026-07-22T09:59:59Z"
  }).includes("signature_from_future"), false);
  const delayedExactReadFailures = validateExactObjectRead(
    "execution.connection_authorization.get", { ref: refFor(bound) }, bound, signedContext
  );
  assert.equal(delayedExactReadFailures.includes("object_read_signature_from_future"), false);
  const afterSnapshotSeed = structuredClone(bound);
  afterSnapshotSeed.principal_signature.signed_at = "2026-07-22T10:01:01Z";
  const afterSnapshot = bindObjectHash(afterSnapshotSeed, schemasByObjectId.get(bound.schema));
  afterSnapshot.principal_signature.value = signBytes(
    null,
    signatureInput(afterSnapshot.schema, afterSnapshot.principal_signature.signed_hash),
    privateKey
  ).toString("base64url");
  assert.ok(validateExactObjectRead(
    "execution.connection_authorization.get", { ref: refFor(afterSnapshot) }, afterSnapshot,
    signedContext
  ).includes("object_read_signature_from_future"));
  const { now: ignoredNow, ...withoutEvaluationTime } = signedContext;
  assert.equal(ignoredNow, "2026-07-22T10:01:00Z");
  assert.equal(validatePhase1SignedObject(bound, withoutEvaluationTime)
    .includes("signature_evaluation_time_required"), false);
  assert.ok(validatePhase1SignedObject(bound, {
    ...withoutEvaluationTime, requireCurrentKeyEligibility: true
  }).includes("signature_evaluation_time_required"));
  const malformedKeyFailures = validatePhase1SignedObject(bound, {
    ...signedContext, keyResolver: new Map([[key.key_id, { ...key, key_id: "did:example:other", key_type: "RSA", status: "mystery" }]])
  });
  for (const code of ["signature_key_id_mismatch", "signature_key_type_mismatch", "signature_key_status_invalid"]) {
    assert.ok(malformedKeyFailures.includes(code));
  }

  const recoveryGrantHash = `sha-256:${"4".repeat(64)}`;
  const recoveryHeadHash = `sha-256:${"5".repeat(64)}`;
  const recoveryRef = { schema: "cairn.recovery_grant.v0.1", object_id: "recovery-1", object_hash: recoveryGrantHash };
  const recoveryHeadRef = { schema: "cairn.recovery_grant_state_head.v0.1", object_id: "recovery-1", object_hash: recoveryHeadHash };
  const recoveryControl = validControlAuthorization({
    control_action: "pause", reason_code: "recovery", recovery_grant_ref: recoveryRef,
    recovery_grant_state_head_ref: recoveryHeadRef, recovery_grant_state_head_hash: recoveryHeadHash,
    recovery_use_idempotency_nonce: "recovery-use-0001"
  });
  recoveryControl.principal_or_recovery_signature.key_id = "did:example:recovery#one";
  recoveryControl.principal_or_recovery_signature.signed_at = "2026-07-22T10:00:00Z";
  const reboundRecovery = bindObjectHash(recoveryControl, schemasByObjectId.get(recoveryControl.schema));
  reboundRecovery.principal_or_recovery_signature.value = signBytes(
    null, signatureInput(reboundRecovery.schema, reboundRecovery.principal_or_recovery_signature.signed_hash), privateKey
  ).toString("base64url");
  const recoveryKey = { ...key, key_id: "did:example:recovery#one", controller: reboundRecovery.principal_id };
  const recoveryObjects = new Map([
    [recoveryGrantHash, { schema: "cairn.recovery_grant.v0.1", recovery_grant_id: "recovery-1", principal_id: reboundRecovery.principal_id,
      recovery_key_id: recoveryKey.key_id, allowed_control_actions: ["pause", "freeze_new_redemptions", "revoke"],
      allowed_scopes: ["all_agents"], control_namespace_generation: 0 }],
    [recoveryHeadHash, { schema: "cairn.recovery_grant_state_head.v0.1", state: "active", state_hash: recoveryHeadHash, recovery_grant_ref: recoveryRef }]
  ]);
  assert.ok(validatePhase1SignedObject(reboundRecovery, {
    ...context, now: "2026-07-22T10:01:00Z",
    keyResolver: new Map([[recoveryKey.key_id, recoveryKey]]), objectResolver: recoveryObjects
  }).includes("phase1_object_schema_invalid"));
  const recoveryResume = validControlAuthorization({
    control_action: "resume", reason_code: "recovery", recovery_grant_ref: recoveryRef,
    recovery_grant_state_head_ref: recoveryHeadRef, recovery_grant_state_head_hash: recoveryHeadHash,
    recovery_use_idempotency_nonce: "recovery-use-0002"
  });
  assert.ok(validateControlAuthorization(recoveryResume, context).includes("phase1_object_schema_invalid"));
});

test("Phase 1 timestamps reject impossible calendar instants", () => {
  const object = make("cairn.agent_connection_authorization.v0.1", { not_before: "2026-02-31T10:00:00Z" });
  const schema = schemasByObjectId.get(object.schema);
  assert.equal(audit.ajv.getSchema(schema.$id)(object), false);
});

test("capabilities response pins the exact Phase 1 surface and frozen artifact", () => {
  const response = {
    profile: PROFILE_ID,
    release_phase: "phase_1_schema_only",
    bundle_hash: built.bundle.bundle_hash,
    operation_registry_hash: audit.operationRegistryHash,
    base_bundle_hash: BASE_BUNDLE_HASH,
    base_operation_registry_hash: BASE_REGISTRY_HASH,
    operations: PHASE1_OPERATIONS.map(({ name }) => name),
    external_effects_available: false
  };
  assert.deepEqual(validateCapabilitiesResponse(response, {
    ...context, baseRegistryHash: BASE_REGISTRY_HASH, operationNames: PHASE1_OPERATIONS.map(({ name }) => name)
  }), []);
  assert.deepEqual(validateCapabilitiesResponse({ ...response, bundle_hash: `sha-256:${"f".repeat(64)}` }, {
    ...context, operationNames: PHASE1_OPERATIONS.map(({ name }) => name)
  }), ["capabilities_bundle_hash_mismatch"]);
  assert.deepEqual(validateCapabilitiesResponse({ ...response, base_bundle_hash: `sha-256:${"f".repeat(64)}` }, {
    ...context, operationNames: PHASE1_OPERATIONS.map(({ name }) => name)
  }), ["capabilities_schema_invalid"]);
  assert.deepEqual(validateCapabilitiesResponse({ ...response, base_operation_registry_hash: `sha-256:${"f".repeat(64)}` }, {
    ...context, operationNames: PHASE1_OPERATIONS.map(({ name }) => name)
  }), ["capabilities_schema_invalid"]);
  assert.deepEqual(validateCapabilitiesResponse(response, {
    ...context, baseBundleHash: `sha-256:${"f".repeat(64)}`,
    operationNames: PHASE1_OPERATIONS.map(({ name }) => name)
  }), ["capabilities_base_bundle_hash_mismatch"]);
  assert.deepEqual(validateCapabilitiesResponse(response, {
    ...context, baseRegistryHash: `sha-256:${"f".repeat(64)}`,
    operationNames: PHASE1_OPERATIONS.map(({ name }) => name)
  }), ["capabilities_base_registry_hash_mismatch"]);
  assert.deepEqual(validateCapabilitiesResponse({ ...response, external_effects_available: true }, context), ["capabilities_schema_invalid"]);
});

test("control authorization enforces the exact target and recovery unions", () => {
  assert.deepEqual(validateControlAuthorization(validControlAuthorization(), context), []);
  const wrongTarget = validControlAuthorization({ scope: "compartment", target_kind: "compartment_resource", compartment_control_key: null });
  assert.ok(validateControlAuthorization(wrongTarget, context).includes("control_compartment_target_union_mismatch"));
  const partialRecovery = validControlAuthorization({ recovery_grant_ref: sampleFor(resolveRef("https://cairn.cards/protocol/execution/schemas/v0.1/common.schema.json#/$defs/objectRef", schemasById.values().next().value).schema) });
  assert.ok(validateControlAuthorization(partialRecovery, context).includes("phase1_object_schema_invalid"));
});

test("control receipts and lineage heads enforce closed state unions", () => {
  const controlReceipt = make("cairn.execution_control_receipt.v0.1");
  assert.deepEqual(validatePhase1Object(controlReceipt, context), []);
  const invalidGenesis = make("cairn.execution_control_receipt.v0.1", {
    cause: "namespace_genesis", authorization_basis_kind: "control_authorization",
    control_authorization_ref: null, control_authorization_hash: null,
    control_namespace_ref: controlReceipt.after_control_head_ref,
    control_namespace_hash: controlReceipt.after_control_head_ref.object_hash,
    before_control_head_ref: null, before_control_head_hash: null,
    before_scoped_control_map_ref: null, before_scoped_control_map_hash: null
  });
  assert.ok(validatePhase1Object(invalidGenesis, context).includes("phase1_object_schema_invalid"));
  const genesisWithRecovery = make("cairn.execution_control_receipt.v0.1", {
    cause: "namespace_genesis", authorization_basis_kind: "control_namespace",
    control_authorization_ref: null, control_authorization_hash: null,
    control_namespace_ref: controlReceipt.after_control_head_ref,
    control_namespace_hash: controlReceipt.after_control_head_ref.object_hash,
    before_control_head_ref: null, before_control_head_hash: null,
    before_scoped_control_map_ref: null, before_scoped_control_map_hash: null,
    recovery_grant_transition_receipt_ref: controlReceipt.after_control_head_ref,
    recovery_grant_transition_receipt_hash: controlReceipt.after_control_head_ref.object_hash
  });
  assert.ok(validatePhase1Object(genesisWithRecovery, context).includes("phase1_object_schema_invalid"));
  const rotationWithRecovery = make("cairn.execution_control_receipt.v0.1", {
    cause: "namespace_rotation", authorization_basis_kind: "control_namespace",
    control_authorization_ref: null, control_authorization_hash: null,
    control_namespace_ref: controlReceipt.after_control_head_ref,
    control_namespace_hash: controlReceipt.after_control_head_ref.object_hash,
    prior_control_namespace_ref: controlReceipt.before_control_head_ref,
    prior_control_namespace_hash: controlReceipt.before_control_head_ref.object_hash,
    prior_revoked_control_head_ref: controlReceipt.before_control_head_ref,
    prior_revoked_control_head_hash: controlReceipt.before_control_head_ref.object_hash,
    recovery_grant_transition_receipt_ref: controlReceipt.after_control_head_ref,
    recovery_grant_transition_receipt_hash: controlReceipt.after_control_head_ref.object_hash
  });
  assert.ok(validatePhase1Object(rotationWithRecovery, context).includes("phase1_object_schema_invalid"));

  const lineageCommitment = make("cairn.lineage_commitment.v0.1", {
    authority_kind: "supervised_pending", mandate_ref: null, scope_binding_index: null,
    prior_lineage_state: "none", prior_lineage_receipt_ref: null, expected_activation_fence: 4,
    expires_at: "2026-07-22T10:10:00Z"
  });
  const provisional = make("cairn.lineage_state_head.v0.1", {
    principal_occurrence_id: lineageCommitment.principal_occurrence_id,
    principal_authorized_lineage_id: lineageCommitment.principal_authorized_lineage_id,
    action_control_key: lineageCommitment.action_control_key,
    attempt_sequence: lineageCommitment.attempt_sequence,
    commitment_generation: lineageCommitment.commitment_generation,
    commitment_ref: refFor(lineageCommitment), fencing_token: lineageCommitment.expected_activation_fence
  });
  const lineageContext = { ...context, lineageCommitment };
  assert.deepEqual(validateLineageStateTransition(null, provisional, lineageContext), []);
  const alienGenesis = make("cairn.lineage_state_head.v0.1", {
    ...provisional, action_control_key: `sha-256:${"8".repeat(64)}`
  });
  assert.ok(validateLineageStateTransition(null, alienGenesis, lineageContext)
    .includes("lineage_state_genesis_commitment_mismatch"));
  assert.ok(validateLineageStateTransition(null, provisional, context)
    .includes("lineage_state_genesis_commitment_unresolved"));
  const activatedActionRef = distinctRefs(1, "activated-action")[0];
  const activeDraft = make("cairn.lineage_state_head.v0.1", {
    principal_occurrence_id: provisional.principal_occurrence_id,
    principal_authorized_lineage_id: provisional.principal_authorized_lineage_id,
    action_control_key: provisional.action_control_key,
    attempt_sequence: provisional.attempt_sequence,
    commitment_generation: provisional.commitment_generation,
    commitment_ref: provisional.commitment_ref,
    sequence: 1, previous_state_hash: provisional.state_hash, state: "active",
    activation_receipt_ref: distinctRefs(1, "pending-activation-receipt")[0],
    activation_transaction_id: "activation-transaction-1",
    next_state_commitment_hash: activatedActionRef.object_hash, activated_action_ref: activatedActionRef,
    outbox_state_head_ref: null, terminal_receiver_receipt_ref: null, finalization_tombstone: false,
    fencing_token: provisional.fencing_token + 1
  });
  const activeCommitmentHash = lineageActiveStateCommitmentHash(activeDraft);
  const activationReceipt = make("cairn.lineage_activation_receipt.v0.1", {
    lineage_commitment_ref: provisional.commitment_ref,
    lineage_commitment_hash: provisional.commitment_ref.object_hash,
    prior_lineage_state_head_ref: refFor(provisional),
    prior_lineage_state_head_hash: provisional.state_hash,
    expected_activation_fence: provisional.fencing_token,
    next_activation_fence: provisional.fencing_token + 1,
    activated_action_ref: activatedActionRef,
    authority_transaction_id: "activation-transaction-1",
    next_state_commitment_hash: activeCommitmentHash,
    activated_at: activeDraft.updated_at
  });
  const active = make("cairn.lineage_state_head.v0.1", {
    ...activeDraft,
    activation_receipt_ref: refFor(activationReceipt), activation_transaction_id: "activation-transaction-1",
    next_state_commitment_hash: activeCommitmentHash
  });
  assert.deepEqual(validateLineageStateTransition(provisional, active, lineageContext), []);
  const arbitraryCommitment = make("cairn.lineage_state_head.v0.1", {
    ...active, next_state_commitment_hash: activatedActionRef.object_hash
  });
  assert.ok(validateLineageStateTransition(provisional, arbitraryCommitment, lineageContext)
    .includes("lineage_state_activation_commitment_mismatch"));
  const vectorHash = (character) => `sha-256:${character.repeat(64)}`;
  const goldenLineageCommitmentRef = {
    schema: "cairn.lineage_commitment.v0.1", object_id: "lineage-commitment-vector", object_hash: vectorHash("5")
  };
  const goldenActionRef = {
    schema: "cairn.action_record.v0.2", object_id: "action-vector", object_hash: vectorHash("6")
  };
  const goldenActiveHead = {
    principal_occurrence_id: vectorHash("1"), principal_authorized_lineage_id: vectorHash("2"),
    action_control_key: vectorHash("3"), attempt_sequence: 7, commitment_generation: 2,
    sequence: 11, previous_state_hash: vectorHash("4"), commitment_ref: goldenLineageCommitmentRef,
    activation_transaction_id: "activation-vector-1", activated_action_ref: goldenActionRef,
    fencing_token: 12, updated_at: "2026-07-22T10:00:00Z"
  };
  const goldenPreimage = [
    "cairn.lineage_active_state_commitment_preimage.v0.1",
    vectorHash("1"), vectorHash("2"), vectorHash("3"), 7, 2, 11, vectorHash("4"), "active",
    goldenLineageCommitmentRef, "activation-vector-1", goldenActionRef, null, null, false, 12,
    "2026-07-22T10:00:00Z"
  ];
  assert.deepEqual(lineageActiveStateCommitmentPreimage(goldenActiveHead), goldenPreimage);
  assert.equal(lineageActiveStateCommitmentHash(goldenActiveHead),
    "sha-256:824cb1cc025e151fac5f817b9f7a5c28ced05fe00d3a6a1bd83b1a3cc4f589a1");
  assert.ok(validateLineageActivationReceipt(activationReceipt, { before: provisional, after: active }, lineageContext)
    .includes("lineage_activation_dependency_context_missing"));
  const invalidActivationReceipt = make("cairn.lineage_activation_receipt.v0.1", {
    ...activationReceipt, next_activation_fence: activationReceipt.next_activation_fence + 1
  });
  const invalidActivationFailures = validateLineageActivationReceipt(
    invalidActivationReceipt, { before: provisional, after: active }, lineageContext
  );
  assert.ok(invalidActivationFailures.includes("lineage_activation_receipt_fence_invalid"), JSON.stringify(invalidActivationFailures));
  const brokenTransitionDraft = make("cairn.lineage_state_head.v0.1", {
    ...active, sequence: active.sequence + 1
  });
  const brokenTransitionAfter = make("cairn.lineage_state_head.v0.1", {
    ...brokenTransitionDraft, next_state_commitment_hash: lineageActiveStateCommitmentHash(brokenTransitionDraft)
  });
  assert.ok(validateLineageActivationReceipt(activationReceipt, {
    before: provisional, after: brokenTransitionAfter
  }, lineageContext).includes("lineage_activation_transition_lineage_state_sequence_mismatch"));
  const unchangedActivationFence = make("cairn.lineage_state_head.v0.1", {
    ...active, fencing_token: provisional.fencing_token
  });
  assert.ok(validateLineageStateTransition(provisional, unchangedActivationFence, lineageContext)
    .includes("lineage_state_activation_fence_invalid"));
  const jumpedActivationFence = make("cairn.lineage_state_head.v0.1", {
    ...active, fencing_token: provisional.fencing_token + 7
  });
  assert.ok(validateLineageStateTransition(provisional, jumpedActivationFence, lineageContext)
    .includes("lineage_state_activation_fence_invalid"));
  const fenceRollback = make("cairn.lineage_state_head.v0.1", {
    ...active, sequence: 2, previous_state_hash: active.state_hash, fencing_token: active.fencing_token - 1
  });
  assert.ok(validateLineageStateTransition(active, fenceRollback, context).includes("lineage_state_fencing_token_rollback"));
  const impossibleFinalized = make("cairn.lineage_state_head.v0.1", {
    ...active, sequence: 2, previous_state_hash: active.state_hash, state: "finalized",
    outbox_state_head_ref: activatedActionRef, terminal_receiver_receipt_ref: activatedActionRef,
    finalization_tombstone: false
  });
  assert.ok(validatePhase1Object(impossibleFinalized, context).includes("phase1_object_schema_invalid"));
  const invalidEdge = make("cairn.lineage_state_head.v0.1", {
    ...active, sequence: 2, previous_state_hash: active.state_hash, state: "provisional",
    activation_receipt_ref: null, activation_transaction_id: null, next_state_commitment_hash: null,
    activated_action_ref: null, outbox_state_head_ref: null, terminal_receiver_receipt_ref: null,
    finalization_tombstone: false
  });
  assert.ok(validateLineageStateTransition(active, invalidEdge, context).includes("lineage_state_edge_invalid"));
});

test("scoped control leaves cannot alias a different target class", () => {
  const leaf = make("cairn.scoped_execution_control_leaf_state_head.v0.1", {
    scope: "action", target_kind: "action_occurrence", target_ref: null,
    compartment_control_key: null, action_control_key: `sha-256:${"a".repeat(64)}`
  });
  assert.deepEqual(validateScopedControlLeaf(leaf, context), []);
  const alias = make("cairn.scoped_execution_control_leaf_state_head.v0.1", {
    scope: "action", target_kind: "object_ref", target_ref: sampleFor(resolveRef("https://cairn.cards/protocol/execution/schemas/v0.1/common.schema.json#/$defs/objectRef", schemasById.values().next().value).schema),
    compartment_control_key: null, action_control_key: `sha-256:${"a".repeat(64)}`
  });
  assert.ok(validateScopedControlLeaf(alias, context).includes("control_target_kind_mismatch"));
});

test("connection transition binds exact heads, sequence, epochs, nonce, and control basis", () => {
  let connectionSeed = make("cairn.agent_connection_state_head.v0.1", {
    sequence: 0, previous_state_hash: null, state: "active", pause_epoch: 0, revocation_nonce: 0
  });
  connectionSeed = make("cairn.agent_connection_state_head.v0.1", {
    ...connectionSeed,
    connection_scoped_control_key: scopedControlLeafKey({
      principal_id: connectionSeed.principal_id,
      control_namespace_generation: 0,
      scope: "connection",
      target_kind: "object_ref",
      target_ref: connectionSeed.connection_authorization_ref,
      compartment_control_key: null,
      action_control_key: null
    })
  });
  const leafBefore = make("cairn.scoped_execution_control_leaf_state_head.v0.1", {
    principal_id: connectionSeed.principal_id, control_namespace_generation: 0,
    scope: "connection", target_kind: "object_ref", target_ref: connectionSeed.connection_authorization_ref,
    compartment_control_key: null, action_control_key: null, sequence: 0, previous_state_hash: null,
    state: "active", pause_epoch: 0, revocation_nonce: 0
  });
  const leafAfter = make("cairn.scoped_execution_control_leaf_state_head.v0.1", {
    ...leafBefore, sequence: 1, previous_state_hash: leafBefore.head_hash, state: "paused", pause_epoch: 1
  });
  const controlLeafBeforeEntry = {
    entry_key: leafBefore.scoped_control_leaf_key, entry_kind: "scoped_execution_control",
    entry_object_ref: refFor(leafBefore), entry_object_hash: leafBefore.head_hash
  };
  const controlLeafAfterEntry = {
    entry_key: leafAfter.scoped_control_leaf_key, entry_kind: "scoped_execution_control",
    entry_object_ref: refFor(leafAfter), entry_object_hash: leafAfter.head_hash
  };
  const controlMapNodeBefore = make("cairn.enumerable_map_node.v0.1", {
    map_domain: "scoped_execution_control", node_kind: "leaf",
    path_prefix_nibbles: leafBefore.scoped_control_leaf_key.slice(8),
    leaf_entry: controlLeafBeforeEntry, branch_children: [], subtree_entry_count: 1,
    entries_root: enumerableMapLeafEntriesRoot("scoped_execution_control", controlLeafBeforeEntry)
  });
  const controlMapNodeAfter = make("cairn.enumerable_map_node.v0.1", {
    map_domain: "scoped_execution_control", node_kind: "leaf",
    path_prefix_nibbles: leafAfter.scoped_control_leaf_key.slice(8),
    leaf_entry: controlLeafAfterEntry, branch_children: [], subtree_entry_count: 1,
    entries_root: enumerableMapLeafEntriesRoot("scoped_execution_control", controlLeafAfterEntry)
  });
  const controlMapKey = executionControlMapKey(
    connectionSeed.principal_id, connectionSeed.authority_namespace, 0
  );
  const controlMapBefore = make("cairn.enumerable_map_root.v0.1", {
    map_key: controlMapKey, map_domain: "scoped_execution_control", revision: 0,
    root_node_ref: refFor(controlMapNodeBefore), root_node_hash: controlMapNodeBefore.node_hash,
    entry_count: 1, entries_root: controlMapNodeBefore.entries_root
  });
  const controlMapAfter = make("cairn.enumerable_map_root.v0.1", {
    map_key: controlMapKey, map_domain: "scoped_execution_control", revision: 1,
    root_node_ref: refFor(controlMapNodeAfter), root_node_hash: controlMapNodeAfter.node_hash,
    entry_count: 1, entries_root: controlMapNodeAfter.entries_root
  });
  const before = make("cairn.agent_connection_state_head.v0.1", {
    ...connectionSeed, connection_scoped_control_leaf_hash: leafBefore.head_hash
  });
  const after = make("cairn.agent_connection_state_head.v0.1", {
    connection_state_id: before.connection_state_id, principal_id: before.principal_id,
    connection_authorization_ref: before.connection_authorization_ref,
    connection_authorization_hash: before.connection_authorization_hash,
    agent_runtime_binding_ref: before.agent_runtime_binding_ref,
    authority_namespace: before.authority_namespace,
    connection_scoped_control_key: before.connection_scoped_control_key,
    connection_scoped_control_leaf_hash: leafAfter.head_hash,
    outstanding_action_index_key: before.outstanding_action_index_key,
    accepted_at: before.accepted_at,
    sequence: 1, previous_state_hash: before.state_hash, state: "paused", pause_epoch: 1, revocation_nonce: 0
  });
  const aggregateBefore = make("cairn.execution_control_state_head.v0.1", {
    principal_id: before.principal_id, authority_namespace: before.authority_namespace,
    control_namespace_generation: 0, sequence: 0, previous_head_hash: null,
    global_state: "active", global_pause_epoch: 0, global_revocation_nonce: 0,
    scoped_control_map_ref: refFor(controlMapBefore), scoped_control_map_hash: controlMapBefore.map_hash,
    scoped_control_head_count: 1, scoped_control_heads_root: controlMapBefore.entries_root
  });
  const aggregateAfter = make("cairn.execution_control_state_head.v0.1", {
    ...aggregateBefore, sequence: 1, previous_head_hash: aggregateBefore.head_hash,
    scoped_control_map_ref: refFor(controlMapAfter), scoped_control_map_hash: controlMapAfter.map_hash,
    scoped_control_heads_root: controlMapAfter.entries_root
  });
  const emptyOutstandingNode = make("cairn.enumerable_map_node.v0.1");
  const outstandingActionMap = make("cairn.enumerable_map_root.v0.1", {
    map_key: connectionOutstandingMapKey(before.outstanding_action_index_key),
    root_node_ref: refFor(emptyOutstandingNode), root_node_hash: emptyOutstandingNode.node_hash,
    revision: 0, entry_count: 0, entries_root: enumerableMapEmptyEntriesRoot("connection_outstanding_action")
  });
  const outstandingIndexBefore = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    outstanding_action_index_key: before.outstanding_action_index_key,
    connection_state_id: before.connection_state_id, sequence: 0, previous_state_hash: null,
    outstanding_action_map_ref: refFor(outstandingActionMap),
    outstanding_action_map_hash: outstandingActionMap.map_hash,
    outstanding_action_count: 0, outstanding_action_root: outstandingActionMap.entries_root,
    state: "active"
  });
  const outstandingIndexAfter = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    ...outstandingIndexBefore, sequence: 1, previous_state_hash: outstandingIndexBefore.head_hash
  });
  const control = validControlAuthorization({
    principal_id: before.principal_id, scope: "connection", target_kind: "object_ref",
    target_ref: before.connection_authorization_ref, control_action: "pause",
    expected_control_head_hash: aggregateBefore.head_hash,
    expected_pause_epoch: before.pause_epoch, expected_revocation_nonce: before.revocation_nonce
  });
  const receipt = make("cairn.connection_state_event_receipt.v0.1", {
    connection_state_id: before.connection_state_id, cause: "principal_control",
    connection_authorization_ref: before.connection_authorization_ref,
    connection_authorization_hash: before.connection_authorization_hash,
    connection_before_head_ref: refFor(before), connection_before_head_hash: before.state_hash,
    connection_after_head_ref: refFor(after), connection_after_head_hash: after.state_hash,
    aggregate_control_before_head_ref: refFor(aggregateBefore), aggregate_control_before_head_hash: aggregateBefore.head_hash,
    aggregate_control_after_head_ref: refFor(aggregateAfter), aggregate_control_after_head_hash: aggregateAfter.head_hash,
    connection_leaf_before_hash: leafBefore.head_hash, connection_leaf_after_hash: leafAfter.head_hash,
    pause_epoch_before: 0, pause_epoch_after: 1, revocation_nonce_before: 0, revocation_nonce_after: 0,
    expected_connection_sequence_before: 0, principal_control_authorization_ref: refFor(control),
    principal_control_authorization_hash: control.control_authorization_hash,
    outstanding_action_index_before_head_ref: refFor(outstandingIndexBefore),
    outstanding_action_index_before_head_hash: outstandingIndexBefore.head_hash,
    outstanding_action_index_after_head_ref: refFor(outstandingIndexAfter),
    outstanding_action_index_after_head_hash: outstandingIndexAfter.head_hash,
    authority_transaction_id: "connection-control-transaction", committed_at: after.updated_at
  });
  const outstandingIndexTransition = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    outstanding_action_index_key: before.outstanding_action_index_key,
    cause: "connection_restriction_snapshot", before_head_ref: refFor(outstandingIndexBefore),
    before_head_hash: outstandingIndexBefore.head_hash, after_head_ref: refFor(outstandingIndexAfter),
    after_head_hash: outstandingIndexAfter.head_hash,
    before_action_map_ref: outstandingIndexBefore.outstanding_action_map_ref,
    before_action_map_hash: outstandingIndexBefore.outstanding_action_map_hash,
    after_action_map_ref: outstandingIndexAfter.outstanding_action_map_ref,
    after_action_map_hash: outstandingIndexAfter.outstanding_action_map_hash,
    changed_action_key: null, changed_entry_before_ref: null, changed_entry_before_hash: null,
    changed_entry_after_ref: null, changed_entry_after_hash: null,
    terminal_evidence_ref: null, terminal_evidence_hash: null,
    authority_transaction_id: receipt.authority_transaction_id, committed_at: receipt.committed_at
  });
  const controlReceipt = make("cairn.execution_control_receipt.v0.1", {
    principal_id: before.principal_id, cause: "connection_joint_control",
    authorization_basis_kind: "control_authorization", control_authorization_ref: refFor(control),
    control_authorization_hash: control.control_authorization_hash,
    control_namespace_ref: null, control_namespace_hash: null, prior_control_namespace_ref: null,
    prior_control_namespace_hash: null, prior_revoked_control_head_ref: null, prior_revoked_control_head_hash: null,
    before_control_head_ref: refFor(aggregateBefore), before_control_head_hash: aggregateBefore.head_hash,
    after_control_head_ref: refFor(aggregateAfter), after_control_head_hash: aggregateAfter.head_hash,
    before_scoped_control_map_ref: aggregateBefore.scoped_control_map_ref,
    before_scoped_control_map_hash: aggregateBefore.scoped_control_map_hash,
    after_scoped_control_map_ref: aggregateAfter.scoped_control_map_ref,
    after_scoped_control_map_hash: aggregateAfter.scoped_control_map_hash,
    before_change_proof: mapPathProof(
      controlMapBefore, controlMapNodeBefore, leafBefore.scoped_control_leaf_key, "membership"
    ),
    after_change_proof: mapPathProof(
      controlMapAfter, controlMapNodeAfter, leafAfter.scoped_control_leaf_key, "membership"
    ),
    scoped_leaf_before_ref: refFor(leafBefore), scoped_leaf_before_hash: leafBefore.head_hash,
    scoped_leaf_after_ref: refFor(leafAfter), scoped_leaf_after_hash: leafAfter.head_hash,
    connection_state_event_receipt_ref: refFor(receipt), connection_state_event_receipt_hash: receipt.receipt_hash,
    recovery_grant_transition_receipt_ref: null, recovery_grant_transition_receipt_hash: null,
    outstanding_action_index_head_ref: refFor(outstandingIndexAfter),
    outstanding_action_index_head_hash: outstandingIndexAfter.head_hash,
    authority_transaction_id: receipt.authority_transaction_id, committed_at: receipt.committed_at
  });
  const connectionObjects = [
    before, after, aggregateBefore, aggregateAfter,
    controlMapNodeBefore, controlMapNodeAfter, controlMapBefore, controlMapAfter,
    emptyOutstandingNode, outstandingActionMap,
    outstandingIndexBefore, outstandingIndexAfter,
    control, leafBefore, leafAfter, receipt, controlReceipt, outstandingIndexTransition
  ];
  const connectionContext = {
    ...context, controlAuthorization: control, controlReceipt,
    outstandingIndexTransitionReceipt: outstandingIndexTransition,
    objectResolver: new Map(connectionObjects.map((object) => [refFor(object).object_hash, object]))
  };
  const signedControlContext = signedReadContext(
    [before, after, aggregateBefore, aggregateAfter, controlMapBefore, controlMapAfter,
      outstandingActionMap, outstandingIndexBefore, outstandingIndexAfter,
      outstandingIndexTransition, leafBefore, leafAfter, control, receipt, controlReceipt],
    { ...connectionContext, requireDependencySignatures: true }, before.principal_id
  );
  assert.deepEqual(validateConnectionOutstandingIndexHead(
    outstandingIndexAfter, signedControlContext
  ), []);
  assert.deepEqual(validateExecutionControlReceipt(controlReceipt, signedControlContext),
    ["phase1_authenticated_resolution_unsupported"]);
  const peerSequenceDriftReceipt = make("cairn.connection_state_event_receipt.v0.1", {
    ...receipt, expected_connection_sequence_before: receipt.expected_connection_sequence_before + 7
  });
  const controlForPeerSequenceDrift = make("cairn.execution_control_receipt.v0.1", {
    ...controlReceipt,
    connection_state_event_receipt_ref: refFor(peerSequenceDriftReceipt),
    connection_state_event_receipt_hash: peerSequenceDriftReceipt.receipt_hash
  });
  const peerSequenceDriftContext = signedReadContext(
    [peerSequenceDriftReceipt, controlForPeerSequenceDrift], {
      ...signedControlContext,
      skipJointPeerValidation: true,
      controlReceipt: controlForPeerSequenceDrift,
      objectResolver: new Map(signedControlContext.objectResolver)
        .set(refFor(peerSequenceDriftReceipt).object_hash, peerSequenceDriftReceipt)
        .set(refFor(controlForPeerSequenceDrift).object_hash, controlForPeerSequenceDrift)
    }, before.principal_id
  );
  assert.ok(validateExecutionControlReceipt(
    controlForPeerSequenceDrift, peerSequenceDriftContext
  ).includes("execution_control_receipt_peer_connection_connection_sequence_mismatch"));
  const peerMapProofDriftControl = make("cairn.execution_control_receipt.v0.1", {
    ...controlReceipt,
    after_change_proof: {
      ...controlReceipt.after_change_proof,
      entry_key: `sha-256:${"f".repeat(64)}`
    }
  });
  const peerMapProofDriftContext = signedReadContext([peerMapProofDriftControl], {
    ...signedControlContext,
    skipJointPeerValidation: true,
    controlReceipt: peerMapProofDriftControl,
    objectResolver: new Map(signedControlContext.objectResolver)
      .set(refFor(peerMapProofDriftControl).object_hash, peerMapProofDriftControl)
  }, before.principal_id);
  assert.ok(validateConnectionEvent(
    receipt, before, after, peerMapProofDriftContext
  ).includes("connection_peer_control_execution_control_receipt_map_proof_mismatch"));
  const unresolvedControlAuthorizationContext = {
    ...signedControlContext,
    controlAuthorization: { schema: "cairn.unresolved_control_authorization.v0.1" }
  };
  assert.ok(validateExecutionControlReceipt(
    controlReceipt, unresolvedControlAuthorizationContext
  ).includes("execution_control_receipt_authorization_unresolved"));
  const observedJointHeadTimes = [];
  const jointCurrentHeadResolver = signedControlContext.currentHeadResolver;
  assert.deepEqual(validateExecutionControlReceipt(controlReceipt, {
    ...signedControlContext,
    currentHeadResolver: (reference, evaluationTime) => {
      if (sameObjectRef(reference, controlReceipt.outstanding_action_index_head_ref)) {
        observedJointHeadTimes.push(evaluationTime);
      }
      return jointCurrentHeadResolver(reference, evaluationTime);
    }
  }), ["phase1_authenticated_resolution_unsupported"]);
  assert.ok(observedJointHeadTimes.length > 0);
  assert.ok(observedJointHeadTimes.every((instant) => instant === controlReceipt.committed_at));
  const inconsistentJointReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...controlReceipt, authority_transaction_id: "different-joint-transaction"
  });
  assert.ok(validateExecutionControlReceipt(inconsistentJointReceipt, signedControlContext)
    .includes("joint_connection_control_pair_mismatch"));
  const globalAuthorizationOnJointReceipt = validControlAuthorization({
    ...control, scope: "all_agents", target_kind: "global", target_ref: null,
    compartment_control_key: null, action_control_key: null
  });
  const wrongJointMatrixReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...controlReceipt,
    control_authorization_ref: refFor(globalAuthorizationOnJointReceipt),
    control_authorization_hash: globalAuthorizationOnJointReceipt.control_authorization_hash
  });
  const wrongJointMatrixContext = signedReadContext([
    globalAuthorizationOnJointReceipt, wrongJointMatrixReceipt
  ], {
    ...signedControlContext,
    controlAuthorization: globalAuthorizationOnJointReceipt,
    objectResolver: new Map(signedControlContext.objectResolver)
      .set(refFor(globalAuthorizationOnJointReceipt).object_hash, globalAuthorizationOnJointReceipt)
  }, before.principal_id);
  const wrongJointMatrixFailures = validateExecutionControlReceipt(
    wrongJointMatrixReceipt, wrongJointMatrixContext
  );
  assert.ok(wrongJointMatrixFailures.includes("execution_control_receipt_cause_scope_mismatch"));
  assert.ok(wrongJointMatrixFailures.includes("joint_connection_control_pair_mismatch"));
  const wrongPairAction = structuredClone(control);
  wrongPairAction.control_action = "resume";
  const wrongActionPairFailures = validateConnectionEvent(receipt, before, after, {
    ...connectionContext, controlAuthorization: wrongPairAction
  });
  assert.ok(wrongActionPairFailures.includes("connection_joint_connection_control_pair_mismatch"),
    JSON.stringify(wrongActionPairFailures));
  const impossibleJointChronology = make("cairn.execution_control_receipt.v0.1", {
    ...controlReceipt, committed_at: "2026-07-21T10:00:00Z"
  });
  assert.ok(validateExecutionControlReceipt(impossibleJointChronology, signedControlContext)
    .includes("execution_control_receipt_chronology_invalid"));
  const mapDriftControlReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...controlReceipt,
    after_scoped_control_map_ref: aggregateBefore.scoped_control_map_ref,
    after_scoped_control_map_hash: aggregateBefore.scoped_control_map_hash
  });
  assert.ok(validateExecutionControlReceipt(mapDriftControlReceipt, signedControlContext)
    .includes("execution_control_receipt_map_binding_mismatch"));
  const missingControlProof = make("cairn.execution_control_receipt.v0.1", {
    ...controlReceipt, before_change_proof: null
  });
  assert.ok(validateExecutionControlReceipt(missingControlProof, signedControlContext)
    .includes("execution_control_receipt_map_proof_mismatch"));
  const wrongControlProof = make("cairn.execution_control_receipt.v0.1", {
    ...controlReceipt,
    after_change_proof: {
      ...controlReceipt.after_change_proof,
      entry_key: `sha-256:${"9".repeat(64)}`
    }
  });
  assert.ok(validateExecutionControlReceipt(wrongControlProof, signedControlContext)
    .includes("execution_control_receipt_map_proof_mismatch"));
  const wrongTargetControl = validControlAuthorization({
    ...control,
    target_ref: distinctRefs(1, "wrong-control-target")[0]
  });
  const wrongTargetControlReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...controlReceipt, control_authorization_ref: refFor(wrongTargetControl),
    control_authorization_hash: wrongTargetControl.control_authorization_hash
  });
  const wrongTargetControlContext = signedReadContext([
    wrongTargetControl, wrongTargetControlReceipt
  ], {
    ...signedControlContext, controlAuthorization: wrongTargetControl,
    objectResolver: new Map(signedControlContext.objectResolver)
      .set(refFor(wrongTargetControl).object_hash, wrongTargetControl)
      .set(refFor(wrongTargetControlReceipt).object_hash, wrongTargetControlReceipt)
  }, before.principal_id);
  assert.ok(validateExecutionControlReceipt(wrongTargetControlReceipt, wrongTargetControlContext)
    .includes("execution_control_receipt_target_mismatch"));
  const wrongEpochControl = validControlAuthorization({
    ...control, expected_pause_epoch: control.expected_pause_epoch + 1
  });
  const wrongEpochControlReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...controlReceipt, control_authorization_ref: refFor(wrongEpochControl),
    control_authorization_hash: wrongEpochControl.control_authorization_hash
  });
  const wrongEpochControlContext = signedReadContext([
    wrongEpochControl, wrongEpochControlReceipt
  ], {
    ...signedControlContext, controlAuthorization: wrongEpochControl,
    objectResolver: new Map(signedControlContext.objectResolver)
      .set(refFor(wrongEpochControl).object_hash, wrongEpochControl)
      .set(refFor(wrongEpochControlReceipt).object_hash, wrongEpochControlReceipt)
  }, before.principal_id);
  assert.ok(validateExecutionControlReceipt(wrongEpochControlReceipt, wrongEpochControlContext)
    .includes("execution_control_receipt_epoch_nonce_mismatch"));
  const missingConnectionReceiptContext = {
    ...signedControlContext, objectResolver: new Map(signedControlContext.objectResolver)
  };
  missingConnectionReceiptContext.objectResolver.delete(refFor(receipt).object_hash);
  assert.ok(validateExecutionControlReceipt(controlReceipt, missingConnectionReceiptContext)
    .includes("execution_control_receipt_connection_dependency_invalid"));
  const missingOutstandingHeadContext = {
    ...signedControlContext, objectResolver: new Map(signedControlContext.objectResolver)
  };
  missingOutstandingHeadContext.objectResolver.delete(refFor(outstandingIndexAfter).object_hash);
  assert.ok(validateExecutionControlReceipt(controlReceipt, missingOutstandingHeadContext)
    .includes("execution_control_receipt_outstanding_dependency_invalid"));
  const invalidAggregateSignature = structuredClone(aggregateAfter);
  invalidAggregateSignature.authority_service_signature.value = "A".repeat(86);
  assert.ok(validateExecutionControlReceipt(controlReceipt, {
    ...signedControlContext,
    objectResolver: new Map([
      ...connectionContext.objectResolver,
      [refFor(aggregateAfter).object_hash, invalidAggregateSignature]
    ])
  }).includes("execution_control_receipt_head_transition_mismatch"));
  const invalidLeafSignature = structuredClone(leafAfter);
  invalidLeafSignature.authority_service_signature.value = "A".repeat(86);
  assert.ok(validateExecutionControlReceipt(controlReceipt, {
    ...signedControlContext,
    objectResolver: new Map([
      ...connectionContext.objectResolver,
      [refFor(leafAfter).object_hash, invalidLeafSignature]
    ])
  }).includes("execution_control_receipt_scoped_leaf_transition_mismatch"));
  const skippedAggregateAfter = make("cairn.execution_control_state_head.v0.1", {
    ...aggregateAfter, sequence: aggregateBefore.sequence + 2
  });
  const skippedControlReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...controlReceipt, after_control_head_ref: refFor(skippedAggregateAfter),
    after_control_head_hash: skippedAggregateAfter.head_hash
  });
  const skippedControlContext = signedReadContext([skippedAggregateAfter], {
    ...signedControlContext,
    objectResolver: new Map([
      ...connectionContext.objectResolver,
      [refFor(skippedAggregateAfter).object_hash, skippedAggregateAfter]
    ])
  }, before.principal_id);
  assert.ok(validateExecutionControlReceipt(skippedControlReceipt, skippedControlContext)
    .includes("execution_control_receipt_head_transition_mismatch"));
  assert.deepEqual(validateConnectionEvent(receipt, before, after, connectionContext),
    ["phase1_authenticated_resolution_unsupported"]);
  const signedConnectionContext = signedReadContext(connectionObjects, {
    ...connectionContext, requireDependencySignatures: true
  }, before.principal_id);
  const invalidConnectionAggregateFailures = validateConnectionEvent(receipt, before, after, {
    ...signedConnectionContext,
    objectResolver: new Map(signedConnectionContext.objectResolver)
      .set(refFor(aggregateAfter).object_hash, invalidAggregateSignature)
  });
  assert.ok(invalidConnectionAggregateFailures.includes("connection_aggregate_control_head_mismatch"),
    JSON.stringify(invalidConnectionAggregateFailures));
  const staleJointOutstandingRef = {
    ...refFor(outstandingIndexAfter), object_hash: `sha-256:${"4".repeat(64)}`
  };
  assert.ok(validateConnectionEvent(receipt, before, after, {
    ...connectionContext,
    currentHeadResolver: currentHeadResolverFor([staleJointOutstandingRef])
  }).includes("connection_joint_control_current_outstanding_head_mismatch"));
  const forgedIndexAfter = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    ...outstandingIndexAfter, outstanding_action_root: `sha-256:${"9".repeat(64)}`
  });
  const forgedReceipt = make("cairn.connection_state_event_receipt.v0.1", {
    ...receipt, outstanding_action_index_after_head_ref: refFor(forgedIndexAfter),
    outstanding_action_index_after_head_hash: forgedIndexAfter.head_hash
  });
  const forgedIndexTransition = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    ...outstandingIndexTransition, after_head_ref: refFor(forgedIndexAfter),
    after_head_hash: forgedIndexAfter.head_hash
  });
  const forgedControlReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...controlReceipt, connection_state_event_receipt_ref: refFor(forgedReceipt),
    connection_state_event_receipt_hash: forgedReceipt.receipt_hash,
    outstanding_action_index_head_ref: refFor(forgedIndexAfter),
    outstanding_action_index_head_hash: forgedIndexAfter.head_hash
  });
  const forgedConnectionContext = {
    ...connectionContext, controlReceipt: forgedControlReceipt,
    outstandingIndexTransitionReceipt: forgedIndexTransition,
    objectResolver: new Map([...connectionObjects.filter((object) =>
      ![outstandingIndexAfter.head_hash, outstandingIndexTransition.receipt_hash].includes(refFor(object).object_hash)),
    forgedIndexAfter, forgedIndexTransition].map((object) => [refFor(object).object_hash, object]))
  };
  assert.ok(validateConnectionEvent(forgedReceipt, before, after, forgedConnectionContext)
    .includes("connection_after_connection_outstanding_map_commitment_mismatch"));
  const unbackedControlReceipt = make("cairn.connection_state_event_receipt.v0.1", {
    ...receipt, principal_control_authorization_ref: null, principal_control_authorization_hash: null
  });
  assert.ok(validateConnectionEvent(unbackedControlReceipt, before, after, connectionContext)
    .includes("connection_control_basis_mismatch"));
  assert.ok(validateConnectionEvent(receipt, before, after, context)
    .includes("connection_aggregate_control_head_mismatch"));
  assert.ok(validateConnectionEvent(receipt, before, after, context)
    .includes("connection_outstanding_index_head_mismatch"));
  assert.ok(validateConnectionEvent(receipt, before, after, context)
    .includes("connection_control_authorization_mismatch"));
  assert.ok(validateConnectionEvent(receipt, before, after, context)
    .includes("connection_joint_control_receipt_mismatch"));
  const connectionContextWithoutLeaves = {
    ...connectionContext,
    objectResolver: new Map(connectionObjects
      .filter((object) => ![leafBefore.head_hash, leafAfter.head_hash].includes(refFor(object).object_hash))
      .map((object) => [refFor(object).object_hash, object]))
  };
  assert.ok(validateConnectionEvent(receipt, before, after, connectionContextWithoutLeaves)
    .includes("connection_scoped_control_leaf_mismatch"));
  assert.ok(validateConnectionEvent(receipt, before, after, {
    ...connectionContext, outstandingIndexTransitionReceipt: null,
    outstandingIndexTransitionResolver: null
  }).includes("connection_outstanding_index_transition_receipt_mismatch"));
  assert.deepEqual(validateExactObjectRead(
    "execution.connection_state_event_receipt.get", { ref: refFor(receipt) },
    receipt,
    signedReadContext([...connectionObjects, receipt, before, after], {
      ...connectionContext, connectionBefore: before, connectionAfter: after,
      currentHeadHistoryResolver: (reference) => reference
    }, before.principal_id)
  ), ["object_read_phase1_authenticated_resolution_unsupported",
    "phase1_authenticated_resolution_unsupported"]);
  const impossibleChronology = make("cairn.connection_state_event_receipt.v0.1", {
    ...receipt, committed_at: "2026-07-21T10:00:00Z"
  });
  assert.ok(validateConnectionEvent(impossibleChronology, before, after, connectionContext)
    .includes("connection_event_chronology_invalid"));
  assert.ok(validateExactObjectRead(
    "execution.connection_state_event_receipt.get", { ref: refFor(impossibleChronology) },
    impossibleChronology,
    { ...connectionContext, connectionBefore: before, connectionAfter: after }
  ).includes("object_read_connection_event_chronology_invalid"));
  const stale = make("cairn.connection_state_event_receipt.v0.1", { ...receipt, expected_connection_sequence_before: 1 });
  assert.ok(validateConnectionEvent(stale, before, after, connectionContext).includes("connection_sequence_mismatch"));
  const revoked = make("cairn.agent_connection_state_head.v0.1", { ...before, sequence: 4, previous_state_hash: before.state_hash, state: "revoked", revocation_nonce: 1 });
  const reactivated = make("cairn.agent_connection_state_head.v0.1", {
    ...revoked, sequence: 5, previous_state_hash: revoked.state_hash, state: "active", revocation_nonce: 1
  });
  const replay = make("cairn.connection_state_event_receipt.v0.1", {
    ...receipt, connection_before_head_ref: refFor(revoked), connection_before_head_hash: revoked.state_hash,
    connection_after_head_ref: refFor(reactivated), connection_after_head_hash: reactivated.state_hash,
    connection_leaf_before_hash: revoked.connection_scoped_control_leaf_hash,
    connection_leaf_after_hash: reactivated.connection_scoped_control_leaf_hash,
    expected_connection_sequence_before: 4, pause_epoch_before: revoked.pause_epoch, pause_epoch_after: reactivated.pause_epoch,
    revocation_nonce_before: 1, revocation_nonce_after: 1
  });
  assert.ok(validateConnectionEvent(replay, revoked, reactivated, connectionContext).includes("connection_terminal_reactivation"));
  const drifted = make("cairn.agent_connection_state_head.v0.1", { ...after, principal_id: "did:example:other" });
  const driftReceipt = make("cairn.connection_state_event_receipt.v0.1", {
    ...receipt, connection_after_head_ref: refFor(drifted), connection_after_head_hash: drifted.state_hash,
    connection_leaf_after_hash: drifted.connection_scoped_control_leaf_hash
  });
  assert.ok(validateConnectionEvent(driftReceipt, before, drifted, connectionContext).includes("connection_immutable_identity_mismatch"));
});

test("execution controls close global, scoped genesis, recovery, and namespace rotation edges", () => {
  const principalId = "did:example:control-machine";
  const authorityNamespace = "cairn:test:control-authority";
  const namespace0 = make("cairn.execution_control_namespace.v0.1", {
    principal_id: principalId, authority_namespace: authorityNamespace, generation: 0,
    prior_namespace_ref: null, prior_revoked_head_ref: null
  });
  const invalidNamespaceGenesis = bindObjectHash({
    ...namespace0,
    prior_namespace_ref: distinctRefs(1, "invalid-namespace-genesis-prior")[0],
    prior_revoked_head_ref: distinctRefs(1, "invalid-namespace-genesis-head")[0]
  }, schemasByObjectId.get(namespace0.schema));
  assert.ok(validatePhase1Object(invalidNamespaceGenesis, context)
    .includes("phase1_object_schema_invalid"));
  const emptyNode0 = make("cairn.enumerable_map_node.v0.1", {
    map_domain: "scoped_execution_control", node_kind: "empty", path_prefix_nibbles: "",
    leaf_entry: null, branch_children: [], subtree_entry_count: 0,
    entries_root: enumerableMapEmptyEntriesRoot("scoped_execution_control")
  });
  const emptyMap0 = make("cairn.enumerable_map_root.v0.1", {
    map_key: executionControlMapKey(principalId, authorityNamespace, 0),
    map_domain: "scoped_execution_control", revision: 0,
    root_node_ref: refFor(emptyNode0), root_node_hash: emptyNode0.node_hash,
    entry_count: 0, entries_root: emptyNode0.entries_root,
    issuing_authority_id: principalId
  });
  const baseHead = make("cairn.execution_control_state_head.v0.1", {
    principal_id: principalId, authority_namespace: authorityNamespace,
    control_namespace_ref: refFor(namespace0), control_namespace_generation: 0,
    sequence: 0, previous_head_hash: null, global_state: "active",
    global_pause_epoch: 0, global_revocation_nonce: 0,
    scoped_control_map_ref: refFor(emptyMap0), scoped_control_map_hash: emptyMap0.map_hash,
    scoped_control_head_count: 0, scoped_control_heads_root: emptyMap0.entries_root
  });

  const globalPause = validControlAuthorization({
    principal_id: principalId, scope: "all_agents", target_kind: "global",
    target_ref: null, compartment_control_key: null, action_control_key: null,
    control_action: "pause", expected_control_head_hash: baseHead.head_hash,
    expected_pause_epoch: 0, expected_revocation_nonce: 0
  });
  const globalPausedHead = make("cairn.execution_control_state_head.v0.1", {
    ...baseHead, sequence: 1, previous_head_hash: baseHead.head_hash,
    global_state: "paused", global_pause_epoch: 1
  });
  const globalPauseReceipt = make("cairn.execution_control_receipt.v0.1", {
    principal_id: principalId, cause: "global_control",
    authorization_basis_kind: "control_authorization",
    control_authorization_ref: refFor(globalPause), control_authorization_hash: globalPause.control_authorization_hash,
    control_namespace_ref: null, control_namespace_hash: null,
    prior_control_namespace_ref: null, prior_control_namespace_hash: null,
    prior_revoked_control_head_ref: null, prior_revoked_control_head_hash: null,
    before_control_head_ref: refFor(baseHead), before_control_head_hash: baseHead.head_hash,
    after_control_head_ref: refFor(globalPausedHead), after_control_head_hash: globalPausedHead.head_hash,
    before_scoped_control_map_ref: refFor(emptyMap0), before_scoped_control_map_hash: emptyMap0.map_hash,
    after_scoped_control_map_ref: refFor(emptyMap0), after_scoped_control_map_hash: emptyMap0.map_hash,
    before_change_proof: null, after_change_proof: null,
    scoped_leaf_before_ref: null, scoped_leaf_before_hash: null,
    scoped_leaf_after_ref: null, scoped_leaf_after_hash: null,
    connection_state_event_receipt_ref: null, connection_state_event_receipt_hash: null,
    recovery_grant_transition_receipt_ref: null, recovery_grant_transition_receipt_hash: null,
    outstanding_action_index_head_ref: null, outstanding_action_index_head_hash: null,
    authority_transaction_id: "global-pause-1", committed_at: globalPausedHead.updated_at
  });
  const globalContext = signedReadContext([
    namespace0, emptyMap0, baseHead, globalPause, globalPausedHead, globalPauseReceipt
  ], {
    ...context, controlAuthorization: globalPause, requireDependencySignatures: true,
    objectResolver: new Map([
      namespace0, emptyNode0, emptyMap0, baseHead, globalPause, globalPausedHead, globalPauseReceipt
    ].map((object) => [refFor(object).object_hash, object]))
  }, principalId);
  assert.deepEqual(validateExecutionControlNamespace(namespace0, globalContext), []);
  assert.deepEqual(validateExecutionControlStateHead(baseHead, globalContext), []);
  const wrongDomainControlMap = make("cairn.enumerable_map_root.v0.1", {
    ...emptyMap0, map_domain: "connection_outstanding_action"
  });
  const wrongDomainControlHead = make("cairn.execution_control_state_head.v0.1", {
    ...baseHead,
    scoped_control_map_ref: refFor(wrongDomainControlMap),
    scoped_control_map_hash: wrongDomainControlMap.map_hash,
    scoped_control_head_count: wrongDomainControlMap.entry_count,
    scoped_control_heads_root: wrongDomainControlMap.entries_root
  });
  const wrongDomainControlContext = {
    ...globalContext,
    requireDependencySignatures: false,
    objectResolver: new Map(globalContext.objectResolver)
      .set(refFor(wrongDomainControlMap).object_hash, wrongDomainControlMap)
  };
  assert.ok(validateExecutionControlStateHead(wrongDomainControlHead, wrongDomainControlContext)
    .includes("execution_control_head_map_mismatch"));
  const foreignControlPredecessor = make("cairn.execution_control_state_head.v0.1", {
    ...baseHead, principal_id: "did:example:foreign-control-predecessor"
  });
  const foreignControlSuccessor = make("cairn.execution_control_state_head.v0.1", {
    ...globalPausedHead, previous_head_hash: foreignControlPredecessor.head_hash
  });
  assert.ok(validateExecutionControlStateHead(foreignControlSuccessor, {
    ...globalContext,
    statePredecessorResolver: () => foreignControlPredecessor,
    objectResolver: new Map(globalContext.objectResolver)
      .set(refFor(foreignControlPredecessor).object_hash, foreignControlPredecessor)
  }).includes("execution_control_head_predecessor_mismatch"));
  const unresolvedNamespaceSuccessor = make("cairn.execution_control_namespace.v0.1", {
    ...namespace0, generation: 1,
    prior_namespace_ref: distinctRefs(1, "unresolved-control-namespace")[0],
    prior_revoked_head_ref: distinctRefs(1, "unresolved-revoked-control-head")[0]
  });
  assert.ok(validateExecutionControlNamespace(unresolvedNamespaceSuccessor, globalContext)
    .includes("control_namespace_predecessor_mismatch"));
  const unresolvedNamespaceReadContext = signedReadContext(
    unresolvedNamespaceSuccessor, globalContext, principalId
  );
  assert.ok(validateExactObjectRead(
    "execution.control_namespace.get",
    { ref: refFor(unresolvedNamespaceSuccessor) },
    unresolvedNamespaceSuccessor,
    unresolvedNamespaceReadContext
  ).includes("object_read_control_namespace_predecessor_mismatch"));
  const aggregateMapDriftHead = make("cairn.execution_control_state_head.v0.1", {
    ...baseHead, scoped_control_head_count: baseHead.scoped_control_head_count + 1
  });
  const aggregateMapDriftContext = signedReadContext(aggregateMapDriftHead, {
    ...globalContext,
    currentHeadResolver: currentHeadResolverFor([refFor(aggregateMapDriftHead)])
  }, principalId);
  assert.ok(validateExactObjectRead(
    "execution.control.get", { ref: refFor(aggregateMapDriftHead) }, {
      ref: refFor(aggregateMapDriftHead), object: aggregateMapDriftHead,
      retrieved_at: "2026-07-22T10:00:00Z"
    }, aggregateMapDriftContext
  ).includes("object_read_execution_control_head_map_mismatch"));
  assert.deepEqual(validateEnumerableMapRoot(emptyMap0, {
    ...globalContext, expectedMapDomain: "scoped_execution_control",
    expectedMapKey: executionControlMapKey(principalId, authorityNamespace, 0)
  }), []);
  assert.deepEqual(validatePhase1SignedObject(emptyMap0, globalContext),
    ["phase1_authenticated_resolution_unsupported"]);
  assert.equal(sameObjectRef(baseHead.scoped_control_map_ref, globalPausedHead.scoped_control_map_ref), true);
  assert.equal(baseHead.scoped_control_map_hash, globalPausedHead.scoped_control_map_hash);
  assert.equal(baseHead.scoped_control_head_count, globalPausedHead.scoped_control_head_count);
  assert.equal(baseHead.scoped_control_heads_root, globalPausedHead.scoped_control_heads_root);
  assert.deepEqual(validateExecutionControlReceipt(globalPauseReceipt, globalContext), []);
  const wrongGlobalEpoch = make("cairn.execution_control_state_head.v0.1", {
    ...globalPausedHead, global_pause_epoch: 0
  });
  const wrongGlobalEpochReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...globalPauseReceipt, after_control_head_ref: refFor(wrongGlobalEpoch),
    after_control_head_hash: wrongGlobalEpoch.head_hash, committed_at: wrongGlobalEpoch.updated_at
  });
  const wrongGlobalContext = signedReadContext([wrongGlobalEpoch, wrongGlobalEpochReceipt], {
    ...globalContext,
    objectResolver: new Map(globalContext.objectResolver)
      .set(refFor(wrongGlobalEpoch).object_hash, wrongGlobalEpoch)
      .set(refFor(wrongGlobalEpochReceipt).object_hash, wrongGlobalEpochReceipt)
  }, principalId);
  assert.ok(validateExecutionControlReceipt(wrongGlobalEpochReceipt, wrongGlobalContext)
    .includes("execution_control_receipt_transition_mismatch"));

  const globalControlTransitionFixture = ({
    action, beforeState, afterState, beforeEpoch, afterEpoch, beforeNonce, afterNonce
  }) => {
    const beforeHead = beforeState === "active" && beforeEpoch === 0 && beforeNonce === 0
      ? baseHead
      : make("cairn.execution_control_state_head.v0.1", {
        ...baseHead, sequence: 1, previous_head_hash: baseHead.head_hash,
        global_state: beforeState, global_pause_epoch: beforeEpoch,
        global_revocation_nonce: beforeNonce
      });
    const afterHead = make("cairn.execution_control_state_head.v0.1", {
      ...beforeHead, sequence: beforeHead.sequence + 1, previous_head_hash: beforeHead.head_hash,
      global_state: afterState, global_pause_epoch: afterEpoch,
      global_revocation_nonce: afterNonce
    });
    const authorization = validControlAuthorization({
      ...globalPause, control_action: action,
      expected_control_head_hash: beforeHead.head_hash,
      expected_pause_epoch: beforeEpoch, expected_revocation_nonce: beforeNonce
    });
    const receipt = make("cairn.execution_control_receipt.v0.1", {
      ...globalPauseReceipt,
      control_authorization_ref: refFor(authorization),
      control_authorization_hash: authorization.control_authorization_hash,
      before_control_head_ref: refFor(beforeHead), before_control_head_hash: beforeHead.head_hash,
      after_control_head_ref: refFor(afterHead), after_control_head_hash: afterHead.head_hash,
      before_scoped_control_map_ref: beforeHead.scoped_control_map_ref,
      before_scoped_control_map_hash: beforeHead.scoped_control_map_hash,
      after_scoped_control_map_ref: afterHead.scoped_control_map_ref,
      after_scoped_control_map_hash: afterHead.scoped_control_map_hash,
      authority_transaction_id: `global-${action}-${beforeState}`,
      committed_at: afterHead.updated_at
    });
    const predecessorByHash = new Map([
      [beforeHead.previous_head_hash, baseHead],
      [afterHead.previous_head_hash, beforeHead]
    ]);
    return {
      receipt,
      context: {
        ...globalContext, requireDependencySignatures: false,
        controlAuthorization: authorization,
        statePredecessorResolver: (reference) => predecessorByHash.get(reference.object_hash) ?? null,
        objectResolver: new Map(globalContext.objectResolver)
          .set(refFor(beforeHead).object_hash, beforeHead)
          .set(refFor(afterHead).object_hash, afterHead)
          .set(refFor(authorization).object_hash, authorization)
          .set(refFor(receipt).object_hash, receipt)
      }
    };
  };
  for (const transition of [
    ["freeze_new_redemptions", "active", "frozen_new_redemptions", 0, 1, 0, 0],
    ["resume", "paused", "active", 1, 1, 0, 0],
    ["resume", "frozen_new_redemptions", "active", 1, 1, 0, 0],
    ["revoke", "active", "revoked", 0, 0, 0, 1],
    ["revoke", "paused", "revoked", 1, 1, 0, 1],
    ["revoke", "frozen_new_redemptions", "revoked", 1, 1, 0, 1]
  ]) {
    const [action, beforeState, afterState, beforeEpoch, afterEpoch, beforeNonce, afterNonce] = transition;
    const fixture = globalControlTransitionFixture({
      action, beforeState, afterState, beforeEpoch, afterEpoch, beforeNonce, afterNonce
    });
    assert.deepEqual(validateExecutionControlReceipt(fixture.receipt, fixture.context), [],
      `${action}:${beforeState}->${afterState}`);
  }
  const terminalReactivation = globalControlTransitionFixture({
    action: "resume", beforeState: "revoked", afterState: "active",
    beforeEpoch: 1, afterEpoch: 1, beforeNonce: 1, afterNonce: 1
  });
  assert.ok(validateExecutionControlReceipt(
    terminalReactivation.receipt, terminalReactivation.context
  ).includes("execution_control_receipt_transition_mismatch"));

  const lateAuthorization = structuredClone(globalPause);
  lateAuthorization.principal_or_recovery_signature.signed_at = "2099-01-01T00:00:00Z";
  assert.ok(validateExecutionControlReceipt(globalPauseReceipt, {
    ...globalContext, requireDependencySignatures: false,
    controlAuthorization: lateAuthorization,
    objectResolver: new Map(globalContext.objectResolver)
      .set(refFor(globalPause).object_hash, lateAuthorization)
  }).includes("execution_control_receipt_chronology_invalid"));
  const lateBeforeSignature = structuredClone(baseHead);
  lateBeforeSignature.authority_service_signature.signed_at = "2099-01-01T00:00:00Z";
  assert.ok(validateExecutionControlReceipt(globalPauseReceipt, {
    ...globalContext, requireDependencySignatures: false,
    objectResolver: new Map(globalContext.objectResolver)
      .set(refFor(baseHead).object_hash, lateBeforeSignature)
  }).includes("execution_control_receipt_chronology_invalid"));
  const driftedAfterEffective = make("cairn.execution_control_state_head.v0.1", {
    ...globalPausedHead, updated_at: "2099-01-01T00:00:00Z"
  });
  const driftedAfterEffectiveReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...globalPauseReceipt,
    after_control_head_ref: refFor(driftedAfterEffective),
    after_control_head_hash: driftedAfterEffective.head_hash
  });
  assert.ok(validateExecutionControlReceipt(driftedAfterEffectiveReceipt, {
    ...globalContext, requireDependencySignatures: false,
    objectResolver: new Map(globalContext.objectResolver)
      .set(refFor(driftedAfterEffective).object_hash, driftedAfterEffective)
  }).includes("execution_control_receipt_chronology_invalid"));
  const lateAfterSignature = structuredClone(globalPausedHead);
  lateAfterSignature.authority_service_signature.signed_at = "2099-01-01T00:00:00Z";
  assert.ok(validateExecutionControlReceipt(globalPauseReceipt, {
    ...globalContext, requireDependencySignatures: false,
    objectResolver: new Map(globalContext.objectResolver)
      .set(refFor(globalPausedHead).object_hash, lateAfterSignature)
  }).includes("execution_control_receipt_chronology_invalid"));
  const preCommitSignedAfterHead = make("cairn.execution_control_state_head.v0.1", {
    ...globalPausedHead,
    authority_service_signature: {
      ...globalPausedHead.authority_service_signature,
      signed_at: "2026-07-22T09:59:00Z"
    }
  });
  const preCommitSignedReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...globalPauseReceipt,
    after_control_head_ref: refFor(preCommitSignedAfterHead),
    after_control_head_hash: preCommitSignedAfterHead.head_hash,
    authority_service_signature: {
      ...globalPauseReceipt.authority_service_signature,
      signed_at: "2026-07-22T09:59:30Z"
    }
  });
  assert.ok(validateExecutionControlReceipt(preCommitSignedReceipt, {
    ...globalContext, requireDependencySignatures: false,
    objectResolver: new Map(globalContext.objectResolver)
      .set(refFor(preCommitSignedAfterHead).object_hash, preCommitSignedAfterHead)
      .set(refFor(preCommitSignedReceipt).object_hash, preCommitSignedReceipt)
  }).includes("execution_control_receipt_chronology_invalid"));
  const actionControlKey = `sha-256:${"a".repeat(64)}`;
  const insertedLeaf = make("cairn.scoped_execution_control_leaf_state_head.v0.1", {
    principal_id: principalId, control_namespace_generation: 0,
    scope: "action", target_kind: "action_occurrence", target_ref: null,
    compartment_control_key: null, action_control_key: actionControlKey,
    sequence: 0, previous_state_hash: null, state: "paused", pause_epoch: 1,
    revocation_nonce: 0, updated_at: baseHead.updated_at
  });
  const insertedEntry = {
    entry_key: insertedLeaf.scoped_control_leaf_key, entry_kind: "scoped_execution_control",
    entry_object_ref: refFor(insertedLeaf), entry_object_hash: insertedLeaf.head_hash
  };
  const insertedNode = make("cairn.enumerable_map_node.v0.1", {
    map_domain: "scoped_execution_control", node_kind: "leaf",
    path_prefix_nibbles: insertedLeaf.scoped_control_leaf_key.slice(8),
    leaf_entry: insertedEntry, branch_children: [], subtree_entry_count: 1,
    entries_root: enumerableMapLeafEntriesRoot("scoped_execution_control", insertedEntry)
  });
  const insertedMap = make("cairn.enumerable_map_root.v0.1", {
    map_key: emptyMap0.map_key, map_domain: "scoped_execution_control", revision: 1,
    root_node_ref: refFor(insertedNode), root_node_hash: insertedNode.node_hash,
    entry_count: 1, entries_root: insertedNode.entries_root,
    issuing_authority_id: principalId
  });
  const scopedAfter = make("cairn.execution_control_state_head.v0.1", {
    ...baseHead, sequence: 1, previous_head_hash: baseHead.head_hash,
    scoped_control_map_ref: refFor(insertedMap), scoped_control_map_hash: insertedMap.map_hash,
    scoped_control_head_count: 1, scoped_control_heads_root: insertedMap.entries_root
  });
  const scopedPause = validControlAuthorization({
    principal_id: principalId, scope: "action", target_kind: "action_occurrence",
    target_ref: null, compartment_control_key: null, action_control_key: actionControlKey,
    control_action: "pause", expected_control_head_hash: baseHead.head_hash,
    expected_pause_epoch: 0, expected_revocation_nonce: 0
  });
  const scopedReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...globalPauseReceipt, cause: "scoped_control",
    control_authorization_ref: refFor(scopedPause), control_authorization_hash: scopedPause.control_authorization_hash,
    after_control_head_ref: refFor(scopedAfter), after_control_head_hash: scopedAfter.head_hash,
    after_scoped_control_map_ref: refFor(insertedMap), after_scoped_control_map_hash: insertedMap.map_hash,
    before_change_proof: mapPathProof(
      emptyMap0, emptyNode0, insertedLeaf.scoped_control_leaf_key, "nonmembership", "empty_root"
    ),
    after_change_proof: mapPathProof(
      insertedMap, insertedNode, insertedLeaf.scoped_control_leaf_key, "membership"
    ),
    scoped_leaf_before_ref: null, scoped_leaf_before_hash: null,
    scoped_leaf_after_ref: refFor(insertedLeaf), scoped_leaf_after_hash: insertedLeaf.head_hash,
    authority_transaction_id: "scoped-pause-genesis-1", committed_at: insertedLeaf.updated_at
  });
  const scopedContext = signedReadContext([
    insertedLeaf, insertedMap, scopedAfter, scopedPause, scopedReceipt
  ], {
    ...globalContext, controlAuthorization: scopedPause,
    objectResolver: new Map([
      ...globalContext.objectResolver,
      [refFor(insertedNode).object_hash, insertedNode],
      [refFor(insertedLeaf).object_hash, insertedLeaf],
      [refFor(insertedMap).object_hash, insertedMap],
      [refFor(scopedAfter).object_hash, scopedAfter],
      [refFor(scopedPause).object_hash, scopedPause],
      [refFor(scopedReceipt).object_hash, scopedReceipt]
    ])
  }, principalId);
  assert.deepEqual(validateExecutionControlReceipt(scopedReceipt, scopedContext), []);
  const unresolvedJointConnectionRef = {
    ...distinctRefs(1, "unresolved-joint-connection-receipt")[0],
    schema: "cairn.connection_state_event_receipt.v0.1"
  };
  const unresolvedJointOutstandingRef = {
    ...distinctRefs(1, "unresolved-joint-outstanding-head")[0],
    schema: "cairn.connection_outstanding_action_index_state_head.v0.1"
  };
  const unresolvedJointControlReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...scopedReceipt, cause: "connection_joint_control",
    scoped_leaf_before_ref: refFor(insertedLeaf),
    scoped_leaf_before_hash: insertedLeaf.head_hash,
    connection_state_event_receipt_ref: unresolvedJointConnectionRef,
    connection_state_event_receipt_hash: unresolvedJointConnectionRef.object_hash,
    outstanding_action_index_head_ref: unresolvedJointOutstandingRef,
    outstanding_action_index_head_hash: unresolvedJointOutstandingRef.object_hash
  });
  const unresolvedJointControlFailures = validateExecutionControlReceipt(
    unresolvedJointControlReceipt, scopedContext
  );
  assert.ok(unresolvedJointControlFailures.includes("phase1_authenticated_resolution_unsupported"),
    JSON.stringify(unresolvedJointControlFailures));
  assert.ok(unresolvedJointControlFailures.includes("joint_connection_control_pair_mismatch"),
    JSON.stringify(unresolvedJointControlFailures));
  const invalidMatrixLeaf = make("cairn.scoped_execution_control_leaf_state_head.v0.1", {
    ...insertedLeaf, pause_epoch: 0
  });
  const invalidMatrixEntry = {
    ...insertedEntry,
    entry_object_ref: refFor(invalidMatrixLeaf),
    entry_object_hash: invalidMatrixLeaf.head_hash
  };
  const invalidMatrixNode = make("cairn.enumerable_map_node.v0.1", {
    ...insertedNode, leaf_entry: invalidMatrixEntry,
    entries_root: enumerableMapLeafEntriesRoot("scoped_execution_control", invalidMatrixEntry)
  });
  const invalidMatrixMap = make("cairn.enumerable_map_root.v0.1", {
    ...insertedMap,
    root_node_ref: refFor(invalidMatrixNode), root_node_hash: invalidMatrixNode.node_hash,
    entries_root: invalidMatrixNode.entries_root
  });
  const invalidMatrixHead = make("cairn.execution_control_state_head.v0.1", {
    ...scopedAfter,
    scoped_control_map_ref: refFor(invalidMatrixMap),
    scoped_control_map_hash: invalidMatrixMap.map_hash,
    scoped_control_heads_root: invalidMatrixMap.entries_root
  });
  const invalidMatrixReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...scopedReceipt,
    after_control_head_ref: refFor(invalidMatrixHead),
    after_control_head_hash: invalidMatrixHead.head_hash,
    after_scoped_control_map_ref: refFor(invalidMatrixMap),
    after_scoped_control_map_hash: invalidMatrixMap.map_hash,
    after_change_proof: mapPathProof(
      invalidMatrixMap, invalidMatrixNode, invalidMatrixLeaf.scoped_control_leaf_key, "membership"
    ),
    scoped_leaf_after_ref: refFor(invalidMatrixLeaf),
    scoped_leaf_after_hash: invalidMatrixLeaf.head_hash
  });
  const invalidMatrixContext = {
    ...scopedContext, requireDependencySignatures: false,
    objectResolver: new Map(scopedContext.objectResolver)
      .set(refFor(invalidMatrixLeaf).object_hash, invalidMatrixLeaf)
      .set(refFor(invalidMatrixNode).object_hash, invalidMatrixNode)
      .set(refFor(invalidMatrixMap).object_hash, invalidMatrixMap)
      .set(refFor(invalidMatrixHead).object_hash, invalidMatrixHead)
      .set(refFor(invalidMatrixReceipt).object_hash, invalidMatrixReceipt)
  };
  assert.ok(validateExecutionControlReceipt(invalidMatrixReceipt, invalidMatrixContext)
    .includes("execution_control_receipt_transition_mismatch"));
  const scopedGlobalDriftHead = make("cairn.execution_control_state_head.v0.1", {
    ...scopedAfter, global_state: "paused", global_pause_epoch: 1
  });
  const scopedGlobalDriftReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...scopedReceipt, after_control_head_ref: refFor(scopedGlobalDriftHead),
    after_control_head_hash: scopedGlobalDriftHead.head_hash
  });
  const scopedGlobalDriftContext = signedReadContext([
    scopedGlobalDriftHead, scopedGlobalDriftReceipt
  ], {
    ...scopedContext,
    objectResolver: new Map(scopedContext.objectResolver)
      .set(refFor(scopedGlobalDriftHead).object_hash, scopedGlobalDriftHead)
      .set(refFor(scopedGlobalDriftReceipt).object_hash, scopedGlobalDriftReceipt)
  }, principalId);
  assert.ok(validateExecutionControlReceipt(scopedGlobalDriftReceipt, scopedGlobalDriftContext)
    .includes("execution_control_receipt_scoped_global_tuple_mismatch"));
  const firstResume = validControlAuthorization({
    ...scopedPause, control_action: "resume"
  });
  const firstResumeReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...scopedReceipt, control_authorization_ref: refFor(firstResume),
    control_authorization_hash: firstResume.control_authorization_hash
  });
  const firstResumeContext = signedReadContext([firstResume, firstResumeReceipt], {
    ...scopedContext, controlAuthorization: firstResume,
    objectResolver: new Map(scopedContext.objectResolver)
      .set(refFor(firstResume).object_hash, firstResume)
      .set(refFor(firstResumeReceipt).object_hash, firstResumeReceipt)
  }, principalId);
  assert.ok(validateExecutionControlReceipt(firstResumeReceipt, firstResumeContext)
    .includes("execution_control_receipt_scoped_genesis_invalid"));
  const wrongLeafKey = bindObjectHash({
    ...insertedLeaf, scoped_control_leaf_key: `sha-256:${"f".repeat(64)}`
  }, schemasByObjectId.get(insertedLeaf.schema));
  assert.ok(validateScopedControlLeaf(wrongLeafKey, context).includes("scoped_control_leaf_key_mismatch"));

  const recoveryRef = distinctRefs(1, "unsupported-recovery-grant")[0];
  const recoveryHeadRef = distinctRefs(1, "unsupported-recovery-head")[0];
  const recoveryAuthorization = validControlAuthorization({
    ...globalPause, reason_code: "recovery",
    recovery_grant_ref: recoveryRef, recovery_grant_state_head_ref: recoveryHeadRef,
    recovery_grant_state_head_hash: recoveryHeadRef.object_hash,
    recovery_use_idempotency_nonce: "recovery-use-1"
  });
  assert.ok(validateControlAuthorization(recoveryAuthorization, context)
    .includes("phase1_object_schema_invalid"));
  assert.equal(audit.ajv.getSchema(
    schemasByObjectId.get(recoveryAuthorization.schema).$id
  )(recoveryAuthorization), false);

  const revokedHead = make("cairn.execution_control_state_head.v0.1", {
    ...baseHead, sequence: 2, previous_head_hash: baseHead.head_hash,
    global_state: "revoked", global_revocation_nonce: 1
  });
  const namespace1 = make("cairn.execution_control_namespace.v0.1", {
    principal_id: principalId, authority_namespace: authorityNamespace, generation: 1,
    prior_namespace_ref: refFor(namespace0), prior_revoked_head_ref: refFor(revokedHead)
  });
  const emptyNode1 = make("cairn.enumerable_map_node.v0.1", {
    ...emptyNode0, map_domain: "scoped_execution_control"
  });
  const emptyMap1 = make("cairn.enumerable_map_root.v0.1", {
    ...emptyMap0, map_key: executionControlMapKey(principalId, authorityNamespace, 1),
    root_node_ref: refFor(emptyNode1), root_node_hash: emptyNode1.node_hash
  });
  const rotatedHead = make("cairn.execution_control_state_head.v0.1", {
    ...revokedHead, control_namespace_ref: refFor(namespace1), control_namespace_generation: 1,
    sequence: 3, previous_head_hash: revokedHead.head_hash,
    global_state: "active", global_pause_epoch: 0, global_revocation_nonce: 0,
    scoped_control_map_ref: refFor(emptyMap1), scoped_control_map_hash: emptyMap1.map_hash,
    scoped_control_head_count: 0, scoped_control_heads_root: emptyMap1.entries_root
  });
  const rotationReceipt = make("cairn.execution_control_receipt.v0.1", {
    ...globalPauseReceipt, cause: "namespace_rotation", authorization_basis_kind: "control_namespace",
    control_authorization_ref: null, control_authorization_hash: null,
    control_namespace_ref: refFor(namespace1), control_namespace_hash: namespace1.namespace_hash,
    prior_control_namespace_ref: refFor(namespace0), prior_control_namespace_hash: namespace0.namespace_hash,
    prior_revoked_control_head_ref: refFor(revokedHead), prior_revoked_control_head_hash: revokedHead.head_hash,
    before_control_head_ref: refFor(revokedHead), before_control_head_hash: revokedHead.head_hash,
    after_control_head_ref: refFor(rotatedHead), after_control_head_hash: rotatedHead.head_hash,
    before_scoped_control_map_ref: refFor(emptyMap0), before_scoped_control_map_hash: emptyMap0.map_hash,
    after_scoped_control_map_ref: refFor(emptyMap1), after_scoped_control_map_hash: emptyMap1.map_hash,
    authority_transaction_id: "namespace-rotation-1", committed_at: rotatedHead.updated_at
  });
  const rotationContext = signedReadContext([
    namespace0, revokedHead, namespace1, emptyMap1, rotatedHead, rotationReceipt
  ], {
    ...context, requireDependencySignatures: true,
    objectResolver: new Map([
      namespace0, emptyNode0, emptyMap0, revokedHead, namespace1, emptyNode1, emptyMap1, rotatedHead,
      rotationReceipt
    ].map((object) => [refFor(object).object_hash, object]))
  }, principalId);
  assert.deepEqual(validateExecutionControlReceipt(rotationReceipt, rotationContext), []);
  const lateNamespaceSignature = structuredClone(namespace1);
  lateNamespaceSignature.authority_service_signature.signed_at = "2099-01-01T00:00:00Z";
  assert.ok(validateExecutionControlReceipt(rotationReceipt, {
    ...rotationContext, requireDependencySignatures: false,
    objectResolver: new Map(rotationContext.objectResolver)
      .set(refFor(namespace1).object_hash, lateNamespaceSignature)
  }).includes("execution_control_receipt_chronology_invalid"));
  const skippedNamespace = make("cairn.execution_control_namespace.v0.1", {
    ...namespace1, generation: 2
  });
  const skippedRotation = make("cairn.execution_control_receipt.v0.1", {
    ...rotationReceipt, control_namespace_ref: refFor(skippedNamespace),
    control_namespace_hash: skippedNamespace.namespace_hash
  });
  const skippedRotationContext = signedReadContext([skippedNamespace, skippedRotation], {
    ...rotationContext,
    objectResolver: new Map(rotationContext.objectResolver)
      .set(refFor(skippedNamespace).object_hash, skippedNamespace)
      .set(refFor(skippedRotation).object_hash, skippedRotation)
  }, principalId);
  assert.ok(validateExecutionControlReceipt(skippedRotation, skippedRotationContext)
    .includes("execution_control_receipt_namespace_rotation_invalid"));
});

test("connection outstanding maps bind exact roots, entries, transitions, and parent-authorized reads", () => {
  const connectionStateId = `sha-256:${"1".repeat(64)}`;
  const indexKey = `sha-256:${"2".repeat(64)}`;
  assert.equal(connectionOutstandingMapKey(indexKey),
    "sha-256:4ad79bdffba44296a3512fa12e6260dd3f963ac3e497f11083ae36a9128c72dd");
  assert.equal(connectionOutstandingActionKey({
    connection_state_id: connectionStateId,
    action_ref: {
      schema: "cairn.action_record.v0.2", object_id: "x", object_hash: `sha-256:${"a".repeat(64)}`
    },
    effect_id: `sha-256:${"b".repeat(64)}`,
    lineage_id: `sha-256:${"3".repeat(64)}`
  }), "sha-256:96ec7041d55cd6250600035dc66c923ed04f6bac16a9c195c8b9f70ff4cf2c39");
  assert.equal(enumerableMapEmptyEntriesRoot("connection_outstanding_action"),
    "sha-256:ff9f0a9011c8fa97f0feb4cc467b7fa5874215554d59bb7fa63a1d82a5596c0d");
  const goldenLeafA = {
    entry_key: `sha-256:${"1".repeat(64)}`, entry_kind: "connection_outstanding_action",
    entry_object_ref: { schema: "cairn.connection_outstanding_action_entry.v0.1", object_id: "entry-a",
      object_hash: `sha-256:${"a".repeat(64)}` }, entry_object_hash: `sha-256:${"a".repeat(64)}`
  };
  const goldenLeafB = {
    entry_key: `sha-256:${"2".repeat(64)}`, entry_kind: "connection_outstanding_action",
    entry_object_ref: { schema: "cairn.connection_outstanding_action_entry.v0.1", object_id: "entry-b",
      object_hash: `sha-256:${"b".repeat(64)}` }, entry_object_hash: `sha-256:${"b".repeat(64)}`
  };
  assert.equal(enumerableMapLeafEntriesRoot("connection_outstanding_action", goldenLeafA),
    "sha-256:cb737d3f57d155e016518d0cee1132ea0a869926bc70c2706ec7a100244a3e0b");
  assert.equal(enumerableMapBranchEntriesRoot("connection_outstanding_action", "", 2, [
    { nibble: "1", child_path_prefix_nibbles: "1".repeat(64), child_node_hash: `sha-256:${"c".repeat(64)}`,
      child_subtree_entry_count: 1, child_entries_root: enumerableMapLeafEntriesRoot("connection_outstanding_action", goldenLeafA) },
    { nibble: "2", child_path_prefix_nibbles: "2".repeat(64), child_node_hash: `sha-256:${"d".repeat(64)}`,
      child_subtree_entry_count: 1, child_entries_root: enumerableMapLeafEntriesRoot("connection_outstanding_action", goldenLeafB) }
  ]), "sha-256:98604d20fe3717186da39f08802805664f8eb6ea933a24b2d1186ef7d2e61d13");
  const bindingSeed = make("cairn.execution_binding_set.v0.1", {
    execution_bundle_hash: built.bundle.bundle_hash,
    operation_registry_hash: audit.operationRegistryHash,
    actor_branch: "principal_direct", agent_runtime_binding_ref: null,
    connection_authorization_ref: null, connection_state_head_ref: null,
    cancellation_context: null, capability: "request_evidence",
    created_at: "2026-07-22T10:00:00Z", expires_at: "2026-07-22T10:05:00Z"
  });
  const lineage = make("cairn.lineage_commitment.v0.1", {
    principal_id: bindingSeed.principal_id,
    principal_occurrence_id: bindingSeed.principal_occurrence_id,
    principal_authorized_lineage_id: `sha-256:${"3".repeat(64)}`,
    action_control_key: bindingSeed.action_control_key,
    action_proposal_hash: bindingSeed.action_proposal_hash,
    effect_id: bindingSeed.effect_id, prior_lineage_state: "none", prior_lineage_receipt_ref: null
  });
  const binding = make("cairn.execution_binding_set.v0.1", {
    ...bindingSeed, principal_authorized_lineage_id: lineage.principal_authorized_lineage_id,
    lineage_commitment_ref: refFor(lineage), lineage_commitment_hash: lineage.commitment_hash
  });
  const action = make("cairn.action_record.v0.2", {
    principal_id: binding.principal_id, execution_binding_set_ref: refFor(binding),
    execution_binding_set_hash: binding.binding_set_hash,
    lineage_commitment_ref: refFor(lineage), lineage_commitment_hash: lineage.commitment_hash,
    action_proposal_ref: binding.action_proposal_ref, action_proposal_hash: binding.action_proposal_hash,
    effect_descriptor_ref: binding.effect_descriptor_ref, effect_id: binding.effect_id,
    capability: binding.capability
  });
  const actionState = make("cairn.action_state_head.v0.1", {
    action_id: action.action_id, action_ref: refFor(action), sequence: 0,
    previous_state_hash: null, state: "reserved"
  });
  const finalityProfileRef = distinctRefs(1, "outstanding-finality-profile")[0];
  const entrySeed = make("cairn.connection_outstanding_action_entry.v0.1", {
    connection_state_id: connectionStateId, action_ref: refFor(action), effect_id: action.effect_id,
    lineage_id: lineage.principal_authorized_lineage_id,
    current_action_state_head_ref: refFor(actionState),
    current_action_state_head_hash: actionState.state_hash,
    receiver_event_stream_key: null, finality_transition_profile_ref: finalityProfileRef,
    finality_transition_profile_hash: finalityProfileRef.object_hash,
    sequence: 0, previous_entry_hash: null, state: "reserved"
  });
  const entry = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...entrySeed, outstanding_action_key: connectionOutstandingActionKey(entrySeed)
  });
  const leafEntry = {
    entry_key: entry.outstanding_action_key, entry_kind: "connection_outstanding_action",
    entry_object_ref: refFor(entry), entry_object_hash: entry.entry_hash
  };
  const leaf = make("cairn.enumerable_map_node.v0.1", {
    node_kind: "leaf", path_prefix_nibbles: entry.outstanding_action_key.slice(8),
    leaf_entry: leafEntry, branch_children: [], subtree_entry_count: 1,
    entries_root: enumerableMapLeafEntriesRoot("connection_outstanding_action", leafEntry)
  });
  const map = make("cairn.enumerable_map_root.v0.1", {
    map_key: connectionOutstandingMapKey(indexKey), revision: 1,
    issuing_authority_id: binding.principal_id,
    root_node_ref: refFor(leaf), root_node_hash: leaf.node_hash,
    entry_count: 1, entries_root: leaf.entries_root
  });
  const index = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    outstanding_action_index_key: indexKey, connection_state_id: connectionStateId,
    sequence: 1, previous_state_hash: `sha-256:${"4".repeat(64)}`,
    outstanding_action_map_ref: refFor(map), outstanding_action_map_hash: map.map_hash,
    outstanding_action_count: 1, outstanding_action_root: map.entries_root, state: "active"
  });
  const objects = [lineage, binding, action, actionState, entry, leaf, map, index];
  const mapContext = {
    ...context, parentAccessAuthorized: true,
    objectResolver: new Map(objects.map((object) => [refFor(object).object_hash, object]))
  };
  let secondAction;
  let secondEntry;
  for (let attempt = 1; attempt < 64; attempt += 1) {
    const candidateAction = make("cairn.action_record.v0.2", {
      ...action, action_id: `sha-256:${attempt.toString(16).padStart(64, "0")}`,
      effect_id: `sha-256:${(attempt + 64).toString(16).padStart(64, "0")}`
    });
    const candidateState = make("cairn.action_state_head.v0.1", {
      ...actionState, action_id: candidateAction.action_id, action_ref: refFor(candidateAction)
    });
    const candidateSeed = make("cairn.connection_outstanding_action_entry.v0.1", {
      ...entry, action_ref: refFor(candidateAction), effect_id: candidateAction.effect_id,
      current_action_state_head_ref: refFor(candidateState), current_action_state_head_hash: candidateState.state_hash
    });
    const candidateEntry = make("cairn.connection_outstanding_action_entry.v0.1", {
      ...candidateSeed, outstanding_action_key: connectionOutstandingActionKey(candidateSeed)
    });
    if (candidateEntry.outstanding_action_key[8] !== entry.outstanding_action_key[8]) {
      secondAction = candidateAction;
      secondEntry = candidateEntry;
      mapContext.objectResolver.set(refFor(candidateAction).object_hash, candidateAction);
      mapContext.objectResolver.set(refFor(candidateState).object_hash, candidateState);
      mapContext.objectResolver.set(refFor(candidateEntry).object_hash, candidateEntry);
      break;
    }
  }
  assert.ok(secondEntry);
  const secondLeafEntry = {
    entry_key: secondEntry.outstanding_action_key, entry_kind: "connection_outstanding_action",
    entry_object_ref: refFor(secondEntry), entry_object_hash: secondEntry.entry_hash
  };
  const secondLeaf = make("cairn.enumerable_map_node.v0.1", {
    node_kind: "leaf", path_prefix_nibbles: secondEntry.outstanding_action_key.slice(8),
    leaf_entry: secondLeafEntry, branch_children: [], subtree_entry_count: 1,
    entries_root: enumerableMapLeafEntriesRoot("connection_outstanding_action", secondLeafEntry)
  });
  mapContext.objectResolver.set(refFor(secondLeaf).object_hash, secondLeaf);
  const branchChildren = [leaf, secondLeaf].map((child) => ({
    nibble: child.path_prefix_nibbles[0], child_path_prefix_nibbles: child.path_prefix_nibbles,
    child_node_ref: refFor(child), child_node_hash: child.node_hash,
    child_subtree_entry_count: child.subtree_entry_count, child_entries_root: child.entries_root
  })).sort((left, right) => left.nibble.localeCompare(right.nibble));
  const branch = make("cairn.enumerable_map_node.v0.1", {
    node_kind: "branch", path_prefix_nibbles: "", leaf_entry: null, branch_children: branchChildren,
    subtree_entry_count: 2,
    entries_root: enumerableMapBranchEntriesRoot("connection_outstanding_action", "", 2, branchChildren)
  });
  mapContext.objectResolver.set(refFor(branch).object_hash, branch);
  const branchMap = make("cairn.enumerable_map_root.v0.1", {
    map_key: connectionOutstandingMapKey(indexKey), revision: 2,
    root_node_ref: refFor(branch), root_node_hash: branch.node_hash,
    entry_count: 2, entries_root: branch.entries_root
  });
  mapContext.objectResolver.set(refFor(branchMap).object_hash, branchMap);
  assert.deepEqual(validateEnumerableMapNode(branch, mapContext), []);
  const branchMembershipProof = mapPathProof(branchMap, leaf, entry.outstanding_action_key,
    "membership", null, [branch]);
  assert.deepEqual(validateEnumerableMapPathProof(branchMembershipProof, branchMap, "membership", {
    entry_object_ref: refFor(entry), entry_object_hash: entry.entry_hash
  }, { ...mapContext, expectedEntryKey: entry.outstanding_action_key }).failures, []);
  const wrongProofKey = { ...branchMembershipProof, entry_key: secondEntry.outstanding_action_key };
  assert.ok(validateEnumerableMapPathProof(wrongProofKey, branchMap, "membership", {
    entry_object_ref: refFor(entry), entry_object_hash: entry.entry_hash
  }, { ...mapContext, expectedEntryKey: entry.outstanding_action_key }).failures
    .includes("enumerable_map_proof_binding_mismatch"));
  const forgedChildSummary = structuredClone(branchChildren);
  forgedChildSummary.find(({ child_node_ref }) => sameObjectRef(child_node_ref, refFor(leaf)))
    .child_entries_root = `sha-256:${"f".repeat(64)}`;
  const forgedBranch = make("cairn.enumerable_map_node.v0.1", {
    ...branch, branch_children: forgedChildSummary,
    entries_root: enumerableMapBranchEntriesRoot("connection_outstanding_action", "", 2, forgedChildSummary)
  });
  const forgedBranchMap = make("cairn.enumerable_map_root.v0.1", {
    ...branchMap, root_node_ref: refFor(forgedBranch), root_node_hash: forgedBranch.node_hash,
    entries_root: forgedBranch.entries_root
  });
  mapContext.objectResolver.set(refFor(forgedBranch).object_hash, forgedBranch);
  mapContext.objectResolver.set(refFor(forgedBranchMap).object_hash, forgedBranchMap);
  const forgedProof = mapPathProof(forgedBranchMap, leaf, entry.outstanding_action_key,
    "membership", null, [forgedBranch]);
  assert.ok(validateEnumerableMapPathProof(forgedProof, forgedBranchMap, "membership", {
    entry_object_ref: refFor(entry), entry_object_hash: entry.entry_hash
  }, { ...mapContext, expectedEntryKey: entry.outstanding_action_key }).failures
    .includes("enumerable_map_proof_child_summary_mismatch"));
  assert.deepEqual(validateConnectionOutstandingActionEntry(entry, mapContext), []);
  assert.deepEqual(validateEnumerableMapNode(leaf, mapContext), []);
  const unresolvedLeafContext = { ...mapContext, objectResolver: new Map(mapContext.objectResolver) };
  unresolvedLeafContext.objectResolver.delete(refFor(entry).object_hash);
  assert.ok(validateEnumerableMapNode(leaf, unresolvedLeafContext).includes("map_node_leaf_union_mismatch"));
  const reboundLeafEntry = { ...leafEntry, entry_key: `sha-256:${"6".repeat(64)}` };
  const reboundLeaf = make("cairn.enumerable_map_node.v0.1", {
    ...leaf, path_prefix_nibbles: reboundLeafEntry.entry_key.slice(8), leaf_entry: reboundLeafEntry,
    entries_root: enumerableMapLeafEntriesRoot("connection_outstanding_action", reboundLeafEntry)
  });
  assert.ok(validateEnumerableMapNode(reboundLeaf, mapContext).includes("map_node_leaf_union_mismatch"));
  assert.deepEqual(validateEnumerableMapRoot(map, {
    ...mapContext, expectedMapKey: connectionOutstandingMapKey(indexKey),
    expectedMapDomain: "connection_outstanding_action"
  }), []);
  assert.deepEqual(validateConnectionOutstandingIndexHead(index, mapContext), []);
  assert.ok(validateConnectionOutstandingIndexHead(index, context)
    .includes("connection_outstanding_map_ref_mismatch"));
  const signedIndexReadContext = signedReadContext(
    [index, map, leaf, entry, action, actionState, lineage, binding], mapContext
  );
  assert.deepEqual(validateExactObjectRead(
    "execution.connection_outstanding_action_index.get", { ref: refFor(index) }, index,
    signedIndexReadContext
  ), ["phase1_authenticated_resolution_unsupported"]);
  const signedEntryReadContext = signedReadContext(
    [entry, action, actionState, lineage, binding], mapContext
  );
  assert.deepEqual(validateExactObjectRead(
    "execution.connection_outstanding_action_entry.get", { ref: refFor(entry) }, entry,
    signedEntryReadContext
  ), ["phase1_authenticated_resolution_unsupported"]);
  const corruptSignedMap = structuredClone(map);
  corruptSignedMap.issuing_authority_signature.value = "A".repeat(86);
  assert.ok(validateExactObjectRead(
    "execution.connection_outstanding_action_index.get", { ref: refFor(index) }, index, {
      ...signedIndexReadContext,
      objectResolver: new Map(signedIndexReadContext.objectResolver)
        .set(refFor(map).object_hash, corruptSignedMap)
    }
  ).includes("object_read_connection_outstanding_map_ref_mismatch"));
  const corruptSignedActionState = structuredClone(actionState);
  corruptSignedActionState.action_service_signature.value = "A".repeat(86);
  assert.ok(validateExactObjectRead(
    "execution.connection_outstanding_action_entry.get", { ref: refFor(entry) }, entry, {
      ...signedEntryReadContext,
      objectResolver: new Map(signedEntryReadContext.objectResolver)
        .set(refFor(actionState).object_hash, corruptSignedActionState)
    }
  ).includes("object_read_outstanding_action_entry_action_chain_mismatch"));
  const corruptSignedAction = structuredClone(action);
  corruptSignedAction.action_service_signature.value = "A".repeat(86);
  assert.ok(validateExactObjectRead(
    "execution.connection_outstanding_action_entry.get", { ref: refFor(entry) }, entry, {
      ...signedEntryReadContext,
      objectResolver: new Map(signedEntryReadContext.objectResolver)
        .set(refFor(action).object_hash, corruptSignedAction)
    }
  ).includes("object_read_outstanding_action_entry_action_chain_mismatch"));
  const corruptSignedLineage = structuredClone(lineage);
  corruptSignedLineage.authority_service_signature.value = "A".repeat(86);
  assert.ok(validateExactObjectRead(
    "execution.connection_outstanding_action_entry.get", { ref: refFor(entry) }, entry, {
      ...signedEntryReadContext,
      objectResolver: new Map(signedEntryReadContext.objectResolver)
        .set(refFor(lineage).object_hash, corruptSignedLineage)
    }
  ).includes("object_read_outstanding_action_entry_action_chain_mismatch"));
  const corruptSignedBinding = structuredClone(binding);
  corruptSignedBinding.binding_service_signature.value = "A".repeat(86);
  assert.ok(validateExactObjectRead(
    "execution.connection_outstanding_action_entry.get", { ref: refFor(entry) }, entry, {
      ...signedEntryReadContext,
      objectResolver: new Map(signedEntryReadContext.objectResolver)
        .set(refFor(binding).object_hash, corruptSignedBinding)
    }
  ).includes("object_read_outstanding_action_entry_action_chain_mismatch"));
  const corruptSignedEntry = structuredClone(entry);
  corruptSignedEntry.authority_service_signature.value = "A".repeat(86);
  assert.ok(validateExactObjectRead(
    "execution.connection_outstanding_action_index.get", { ref: refFor(index) }, index, {
      ...signedIndexReadContext,
      objectResolver: new Map(signedIndexReadContext.objectResolver)
        .set(refFor(entry).object_hash, corruptSignedEntry)
    }
  ).includes("object_read_connection_outstanding_map_map_node_leaf_union_mismatch"));
  const liveWrongIndexCount = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    ...index, outstanding_action_count: 0
  });
  assert.ok(validateConnectionOutstandingIndexHead(liveWrongIndexCount, mapContext)
    .includes("connection_outstanding_map_commitment_mismatch"));
  const liveWrongIndexRoot = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    ...index, outstanding_action_root: `sha-256:${"9".repeat(64)}`
  });
  assert.ok(validateConnectionOutstandingIndexHead(liveWrongIndexRoot, mapContext)
    .includes("connection_outstanding_map_commitment_mismatch"));
  assert.ok(validateExactObjectRead(
    "execution.connection_outstanding_action_index.get",
    { ref: refFor(liveWrongIndexRoot) },
    liveWrongIndexRoot,
    signedReadContext(
      [liveWrongIndexRoot, map, leaf, entry, action, actionState, lineage, binding], mapContext
    )
  ).includes("object_read_connection_outstanding_map_commitment_mismatch"));
  const liveWrongMapNodeCount = make("cairn.enumerable_map_root.v0.1", {
    ...map, entry_count: map.entry_count + 1
  });
  assert.ok(validateEnumerableMapRoot(liveWrongMapNodeCount, mapContext)
    .includes("enumerable_map_entries_commitment_mismatch"));
  const liveWrongEntryKey = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...entry, outstanding_action_key: `sha-256:${"7".repeat(64)}`
  });
  assert.ok(validateConnectionOutstandingActionEntry(liveWrongEntryKey, mapContext)
    .includes("outstanding_action_entry_key_mismatch"));
  assert.ok(validateExactObjectRead(
    "execution.connection_outstanding_action_entry.get",
    { ref: refFor(liveWrongEntryKey) },
    liveWrongEntryKey,
    signedReadContext([liveWrongEntryKey, action, actionState, lineage, binding], mapContext)
  ).includes("object_read_outstanding_action_entry_key_mismatch"));
  const rootResponse = { ref: refFor(map), object: map, retrieved_at: "2026-07-22T10:00:00Z" };
  const rootRequest = {
    ref: refFor(map), owner_head_ref: refFor(index), map_root_ref: refFor(map), ancestor_node_refs: []
  };
  assert.deepEqual(validateExactObjectRead(
    "execution.enumerable_map.get", rootRequest, rootResponse,
    signedReadContext(map, mapContext, map.issuing_authority_id)
  ), ["object_read_operation_invalid"]);
  const nodeResponse = { ref: refFor(leaf), object: leaf, retrieved_at: "2026-07-22T10:00:00Z" };
  assert.deepEqual(validateExactObjectRead("execution.enumerable_map.get", {
    ...rootRequest, ref: refFor(leaf)
  }, nodeResponse, mapContext), ["object_read_operation_invalid"]);
  assert.deepEqual(validateExactObjectRead("execution.enumerable_map.get", {
    ...rootRequest, ref: refFor(leaf), ancestor_node_refs: [refFor(leaf)]
  }, nodeResponse, mapContext), ["object_read_operation_invalid"]);
  assert.deepEqual(validateExactObjectRead("execution.enumerable_map.get", rootRequest, rootResponse, {
    ...mapContext, parentAccessAuthorized: false
  }), ["object_read_operation_invalid"]);

  const emptyNode = make("cairn.enumerable_map_node.v0.1");
  const emptyMap = make("cairn.enumerable_map_root.v0.1", {
    map_key: connectionOutstandingMapKey(indexKey), revision: 0,
    root_node_ref: refFor(emptyNode), root_node_hash: emptyNode.node_hash,
    entry_count: 0, entries_root: emptyNode.entries_root
  });
  const emptyIndex = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    outstanding_action_index_key: indexKey, connection_state_id: connectionStateId,
    sequence: 0, previous_state_hash: null, outstanding_action_map_ref: refFor(emptyMap),
    outstanding_action_map_hash: emptyMap.map_hash, outstanding_action_count: 0,
    outstanding_action_root: emptyMap.entries_root, state: "active"
  });
  const reservedIndex = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    ...index, sequence: 1, previous_state_hash: emptyIndex.head_hash
  });
  const reservationReceipt = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    outstanding_action_index_key: indexKey, cause: "action_reserved",
    before_head_ref: refFor(emptyIndex), before_head_hash: emptyIndex.head_hash,
    after_head_ref: refFor(reservedIndex), after_head_hash: reservedIndex.head_hash,
    before_action_map_ref: refFor(emptyMap), before_action_map_hash: emptyMap.map_hash,
    after_action_map_ref: refFor(map), after_action_map_hash: map.map_hash,
    changed_action_key: entry.outstanding_action_key,
    changed_entry_before_ref: null, changed_entry_before_hash: null,
    changed_entry_after_ref: refFor(entry), changed_entry_after_hash: entry.entry_hash,
    before_change_proof: mapPathProof(emptyMap, emptyNode, entry.outstanding_action_key,
      "nonmembership", "empty_root"),
    after_change_proof: mapPathProof(map, leaf, entry.outstanding_action_key, "membership"),
    action_transition_receipt_ref: null, action_transition_receipt_hash: null,
    terminal_evidence_ref: null, terminal_evidence_hash: null,
    authority_transaction_id: "reserve-outstanding-action", committed_at: reservedIndex.updated_at
  });
  const reservationContext = {
    ...mapContext,
    objectResolver: new Map([...objects, emptyNode, emptyMap, emptyIndex, reservedIndex, reservationReceipt]
      .map((object) => [refFor(object).object_hash, object]))
  };
  assert.deepEqual(validateConnectionOutstandingIndexTransitionReceipt(reservationReceipt, reservationContext), []);
  const badReservationCount = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    ...reservedIndex, outstanding_action_count: 0
  });
  const badReservationReceipt = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    ...reservationReceipt, after_head_ref: refFor(badReservationCount), after_head_hash: badReservationCount.head_hash
  });
  const badReservationContext = {
    ...reservationContext,
    objectResolver: new Map([...objects, emptyNode, emptyMap, emptyIndex, badReservationCount]
      .map((object) => [refFor(object).object_hash, object]))
  };
  assert.ok(validateConnectionOutstandingIndexTransitionReceipt(badReservationReceipt, badReservationContext)
    .includes("outstanding_index_transition_reservation_union_mismatch"));

  const updatedActionStateSeed = make("cairn.action_state_head.v0.1", {
    action_id: action.action_id, action_ref: refFor(action), sequence: 1,
    previous_state_hash: actionState.state_hash, state: "definitive_failure",
    gate_result_ref: null, redemption_receipt_ref: null,
    outbox_state_head_ref: null, receiver_receipt_ref: null
  });
  const actionLineageState = make("cairn.lineage_state_head.v0.1", {
    principal_occurrence_id: lineage.principal_occurrence_id,
    principal_authorized_lineage_id: lineage.principal_authorized_lineage_id,
    action_control_key: lineage.action_control_key,
    attempt_sequence: lineage.attempt_sequence,
    commitment_generation: lineage.commitment_generation,
    commitment_ref: refFor(lineage), state: "definitive_failure",
    activated_action_ref: refFor(action), activation_receipt_ref: actionState.lineage_activation_receipt_ref,
    activation_transaction_id: "outstanding-action-activation",
    next_state_commitment_hash: `sha-256:${"7".repeat(64)}`,
    terminal_receiver_receipt_ref: distinctRefs(1, "terminal-receiver-proof")[0]
  });
  const actionTransition = make("cairn.action_receipt.v0.2", {
    action_ref: refFor(action), execution_binding_set_ref: action.execution_binding_set_ref,
    execution_binding_set_hash: action.execution_binding_set_hash, effect_id: action.effect_id,
    lineage_state_head_ref: refFor(actionLineageState),
    state_before: "reserved", state_after: "definitive_failure",
    prior_action_receipt_ref: actionState.prior_transition_receipt_ref
  });
  const updatedActionState = make("cairn.action_state_head.v0.1", {
    ...updatedActionStateSeed, prior_transition_receipt_ref: refFor(actionTransition)
  });
  const updatedEntrySeed = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...entry, current_action_state_head_ref: refFor(updatedActionState),
    current_action_state_head_hash: updatedActionState.state_hash,
    receiver_event_stream_key: null, sequence: 1, previous_entry_hash: entry.entry_hash,
    state: "reserved"
  });
  const updatedEntry = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...updatedEntrySeed, outstanding_action_key: connectionOutstandingActionKey(updatedEntrySeed)
  });
  const updatedLeafEntry = {
    ...leafEntry, entry_object_ref: refFor(updatedEntry), entry_object_hash: updatedEntry.entry_hash
  };
  const updatedLeaf = make("cairn.enumerable_map_node.v0.1", {
    ...leaf, leaf_entry: updatedLeafEntry,
    entries_root: enumerableMapLeafEntriesRoot("connection_outstanding_action", updatedLeafEntry)
  });
  const updatedMap = make("cairn.enumerable_map_root.v0.1", {
    ...map, revision: 2, root_node_ref: refFor(updatedLeaf), root_node_hash: updatedLeaf.node_hash,
    entries_root: updatedLeaf.entries_root
  });
  const updatedIndex = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    ...reservedIndex, sequence: 2, previous_state_hash: reservedIndex.head_hash,
    outstanding_action_map_ref: refFor(updatedMap), outstanding_action_map_hash: updatedMap.map_hash,
    outstanding_action_root: updatedMap.entries_root
  });
  const updateReceipt = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    ...reservationReceipt, cause: "action_head_updated",
    before_head_ref: refFor(reservedIndex), before_head_hash: reservedIndex.head_hash,
    after_head_ref: refFor(updatedIndex), after_head_hash: updatedIndex.head_hash,
    before_action_map_ref: refFor(map), before_action_map_hash: map.map_hash,
    after_action_map_ref: refFor(updatedMap), after_action_map_hash: updatedMap.map_hash,
    changed_entry_before_ref: refFor(entry), changed_entry_before_hash: entry.entry_hash,
    changed_entry_after_ref: refFor(updatedEntry), changed_entry_after_hash: updatedEntry.entry_hash,
    before_change_proof: mapPathProof(map, leaf, entry.outstanding_action_key, "membership"),
    after_change_proof: mapPathProof(updatedMap, updatedLeaf, entry.outstanding_action_key, "membership"),
    action_transition_receipt_ref: refFor(actionTransition),
    action_transition_receipt_hash: actionTransition.receipt_hash,
    authority_transaction_id: "update-outstanding-action", committed_at: updatedIndex.updated_at
  });
  const updateObjects = [...objects, emptyNode, emptyMap, emptyIndex, reservedIndex, actionLineageState, actionTransition,
    updatedActionState, updatedEntry, updatedLeaf, updatedMap, updatedIndex, updateReceipt];
  const updateContext = {
    ...mapContext,
    objectResolver: new Map(updateObjects.map((object) => [refFor(object).object_hash, object]))
  };
  assert.deepEqual(validateActionReceipt(
    actionTransition, actionState, updatedActionState, binding, { ...updateContext, action }
  ), []);
  const skippedPriorActionReceipt = make("cairn.action_receipt.v0.2", {
    ...actionTransition, prior_action_receipt_ref: null
  });
  assert.ok(validateActionReceipt(
    skippedPriorActionReceipt, actionState, updatedActionState, binding, { ...updateContext, action }
  ).includes("action_receipt_prior_chain_mismatch"));
  assert.deepEqual(validateConnectionOutstandingIndexTransitionReceipt(updateReceipt, updateContext), []);
  const forgedUpdatedActionState = make("cairn.action_state_head.v0.1", {
    ...updatedActionState, prior_transition_receipt_ref: refFor(skippedPriorActionReceipt)
  });
  const forgedUpdatedEntrySeed = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...updatedEntry, current_action_state_head_ref: refFor(forgedUpdatedActionState),
    current_action_state_head_hash: forgedUpdatedActionState.state_hash
  });
  const forgedUpdatedEntry = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...forgedUpdatedEntrySeed, outstanding_action_key: connectionOutstandingActionKey(forgedUpdatedEntrySeed)
  });
  const forgedUpdatedLeafEntry = {
    ...leafEntry, entry_object_ref: refFor(forgedUpdatedEntry), entry_object_hash: forgedUpdatedEntry.entry_hash
  };
  const forgedUpdatedLeaf = make("cairn.enumerable_map_node.v0.1", {
    ...leaf, leaf_entry: forgedUpdatedLeafEntry,
    entries_root: enumerableMapLeafEntriesRoot("connection_outstanding_action", forgedUpdatedLeafEntry)
  });
  const forgedUpdatedMap = make("cairn.enumerable_map_root.v0.1", {
    ...updatedMap, root_node_ref: refFor(forgedUpdatedLeaf), root_node_hash: forgedUpdatedLeaf.node_hash,
    entries_root: forgedUpdatedLeaf.entries_root
  });
  const forgedUpdatedIndex = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    ...updatedIndex, outstanding_action_map_ref: refFor(forgedUpdatedMap),
    outstanding_action_map_hash: forgedUpdatedMap.map_hash, outstanding_action_root: forgedUpdatedMap.entries_root
  });
  const forgedUpdateReceipt = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    ...updateReceipt, after_head_ref: refFor(forgedUpdatedIndex), after_head_hash: forgedUpdatedIndex.head_hash,
    after_action_map_ref: refFor(forgedUpdatedMap), after_action_map_hash: forgedUpdatedMap.map_hash,
    changed_entry_after_ref: refFor(forgedUpdatedEntry), changed_entry_after_hash: forgedUpdatedEntry.entry_hash,
    after_change_proof: mapPathProof(forgedUpdatedMap, forgedUpdatedLeaf,
      forgedUpdatedEntry.outstanding_action_key, "membership"),
    action_transition_receipt_ref: refFor(skippedPriorActionReceipt),
    action_transition_receipt_hash: skippedPriorActionReceipt.receipt_hash
  });
  const forgedUpdateContext = {
    ...updateContext,
    objectResolver: new Map([...updateObjects, skippedPriorActionReceipt, forgedUpdatedActionState,
      forgedUpdatedEntry, forgedUpdatedLeaf, forgedUpdatedMap, forgedUpdatedIndex, forgedUpdateReceipt]
      .map((object) => [refFor(object).object_hash, object]))
  };
  assert.ok(validateConnectionOutstandingIndexTransitionReceipt(forgedUpdateReceipt, forgedUpdateContext)
    .includes("outstanding_index_transition_update_union_mismatch"));
  const skippedEntrySequence = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...updatedEntry, sequence: 2
  });
  const badUpdateReceipt = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    ...updateReceipt, changed_entry_after_ref: refFor(skippedEntrySequence),
    changed_entry_after_hash: skippedEntrySequence.entry_hash
  });
  const badUpdateContext = {
    ...updateContext,
    objectResolver: new Map([...updateObjects, skippedEntrySequence]
      .map((object) => [refFor(object).object_hash, object]))
  };
  assert.ok(validateConnectionOutstandingIndexTransitionReceipt(badUpdateReceipt, badUpdateContext)
    .includes("outstanding_index_transition_update_union_mismatch"));

  const drainedMap = make("cairn.enumerable_map_root.v0.1", {
    ...emptyMap, revision: 3
  });
  const drainedIndex = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    ...updatedIndex, sequence: 3, previous_state_hash: updatedIndex.head_hash,
    outstanding_action_map_ref: refFor(drainedMap), outstanding_action_map_hash: drainedMap.map_hash,
    outstanding_action_count: 0, outstanding_action_root: drainedMap.entries_root
  });
  const fencedEvidence = {
    schema: "cairn.fenced_non_submission_receipt.v0.1",
    receipt_id: "fenced-outstanding-action",
    receipt_hash: `sha-256:${"6".repeat(64)}`,
    action_ref: refFor(action), effect_id: action.effect_id,
    lineage_id: lineage.principal_authorized_lineage_id
  };
  const fencedEvidenceRef = {
    schema: fencedEvidence.schema, object_id: fencedEvidence.receipt_id,
    object_hash: fencedEvidence.receipt_hash
  };
  const selectorKey = `sha-256:${"8".repeat(64)}`;
  const identityScopeKey = `sha-256:${"9".repeat(64)}`;
  const receiverRuleHash = make("cairn.receiver_outstanding_stream_entry.v0.1")
    .authenticated_closure_or_horizon_rule_hash;
  const externalSignature = (signedHash) => ({
    profile: "cairn-ed25519-v0.1", key_id: "cairn:test:external-authority",
    signed_hash: signedHash, value: "A".repeat(86), signed_at: drainedIndex.updated_at
  });
  const eventAssignment = {
    schema: "cairn.bounded_index_slot_assignment.v0.1",
    slot_assignment_id: `sha-256:${"1".repeat(64)}`, directory_key: identityScopeKey, epoch: 0,
    action_ref: refFor(action), effect_id: action.effect_id,
    lineage_id: lineage.principal_authorized_lineage_id, slot_kind: "receiver_event_id",
    reserved_slots: 2, consumed_slots: 0, stream_closure_or_horizon_rule_hash: receiverRuleHash,
    state: "reserved", assignment_hash: `sha-256:${"a".repeat(64)}`,
    authority_service_signature: externalSignature(`sha-256:${"a".repeat(64)}`)
  };
  const sequenceAssignment = {
    ...eventAssignment, slot_assignment_id: `sha-256:${"2".repeat(64)}`,
    slot_kind: "receiver_sequence", assignment_hash: `sha-256:${"b".repeat(64)}`,
    authority_service_signature: externalSignature(`sha-256:${"b".repeat(64)}`)
  };
  const trustAssignment = {
    ...eventAssignment, slot_assignment_id: `sha-256:${"3".repeat(64)}`,
    slot_kind: "trust_assertion", assignment_hash: `sha-256:${"0".repeat(63)}d`,
    authority_service_signature: externalSignature(`sha-256:${"0".repeat(63)}d`)
  };
  const eventAssignmentRef = {
    schema: eventAssignment.schema, object_id: eventAssignment.slot_assignment_id,
    object_hash: eventAssignment.assignment_hash
  };
  const sequenceAssignmentRef = {
    schema: sequenceAssignment.schema, object_id: sequenceAssignment.slot_assignment_id,
    object_hash: sequenceAssignment.assignment_hash
  };
  const trustAssignmentRef = {
    schema: trustAssignment.schema, object_id: trustAssignment.slot_assignment_id,
    object_hash: trustAssignment.assignment_hash
  };
  const trustEntryBase = {
    entry_kind: "bounded_index_slot_assignment", entry_object_ref: trustAssignmentRef,
    entry_object_hash: trustAssignmentRef.object_hash
  };
  const trustEntry = { ...trustEntryBase, entry_key: transitionManifestEntryKey(trustEntryBase) };
  const trustManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    manifest_kind: "receiver_trust_slot_assignments", entry_count: 1,
    sorted_entries: [trustEntry], entries_root: canonicalHash([trustEntry])
  });
  const receiverEntrySeed = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    receiver_sequence_epoch_selector_key: selectorKey, identity_scope_index_key: identityScopeKey,
    action_ref: refFor(action), effect_id: action.effect_id,
    lineage_id: lineage.principal_authorized_lineage_id,
    precommitted_client_reference: "outstanding-client-reference",
    assigned_identity_epoch: 0, event_id_slot_assignment_ref: eventAssignmentRef,
    event_id_slot_assignment_hash: eventAssignmentRef.object_hash,
    sequence_slot_assignment_ref: sequenceAssignmentRef,
    sequence_slot_assignment_hash: sequenceAssignmentRef.object_hash,
    trust_epoch_assignment_manifest_ref: refFor(trustManifest),
    trust_epoch_assignment_manifest_hash: trustManifest.manifest_hash,
    trust_epoch_assignment_count: 1, trust_epoch_assignments_root: trustManifest.entries_root,
    future_dependency_pool_state_head_ref: null, future_dependency_pool_state_head_hash: null,
    future_dependency_assignment_ref: null, future_dependency_assignment_hash: null,
    connection_outstanding_action_key: updatedEntry.outstanding_action_key,
    connection_outstanding_action_entry_ref: refFor(updatedEntry),
    connection_outstanding_action_entry_hash: updatedEntry.entry_hash,
    finality_transition_profile_ref: finalityProfileRef,
    finality_transition_profile_hash: finalityProfileRef.object_hash,
    authenticated_closure_or_horizon_rule_hash: receiverRuleHash,
    sequence: 0, previous_entry_hash: null, state: "reserved",
    current_receiver_stream_head_ref: null, current_receiver_stream_head_hash: null
  });
  const receiverEntryBefore = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...receiverEntrySeed, outstanding_stream_key: receiverOutstandingStreamKey(receiverEntrySeed)
  });
  let receiverEntryAfter;
  const receiverLeafEntry = {
    entry_key: receiverEntryBefore.outstanding_stream_key, entry_kind: "receiver_outstanding_stream",
    entry_object_ref: refFor(receiverEntryBefore), entry_object_hash: receiverEntryBefore.entry_hash
  };
  const receiverLeaf = make("cairn.enumerable_map_node.v0.1", {
    map_domain: "receiver_outstanding_stream", node_kind: "leaf",
    path_prefix_nibbles: receiverEntryBefore.outstanding_stream_key.slice(8), leaf_entry: receiverLeafEntry,
    branch_children: [], subtree_entry_count: 1,
    entries_root: enumerableMapLeafEntriesRoot("receiver_outstanding_stream", receiverLeafEntry)
  });
  const receiverMapBefore = make("cairn.enumerable_map_root.v0.1", {
    map_domain: "receiver_outstanding_stream", map_key: receiverOutstandingMapKey(selectorKey), revision: 0,
    root_node_ref: refFor(receiverLeaf), root_node_hash: receiverLeaf.node_hash,
    entry_count: 1, entries_root: receiverLeaf.entries_root
  });
  const receiverEmptyNode = make("cairn.enumerable_map_node.v0.1", {
    map_domain: "receiver_outstanding_stream", entries_root: enumerableMapEmptyEntriesRoot("receiver_outstanding_stream")
  });
  const receiverMapAfter = make("cairn.enumerable_map_root.v0.1", {
    map_domain: "receiver_outstanding_stream", map_key: receiverOutstandingMapKey(selectorKey), revision: 1,
    root_node_ref: refFor(receiverEmptyNode), root_node_hash: receiverEmptyNode.node_hash,
    entry_count: 0, entries_root: receiverEmptyNode.entries_root
  });
  const selectorBefore = {
    schema: "cairn.receiver_sequence_epoch_selector_state_head.v0.1",
    receiver_sequence_epoch_selector_key: selectorKey, sequence: 0, previous_state_hash: null,
    outstanding_stream_map_ref: refFor(receiverMapBefore), outstanding_stream_map_hash: receiverMapBefore.map_hash,
    head_hash: `sha-256:${"c".repeat(64)}`
  };
  const selectorAfter = {
    ...selectorBefore, sequence: 1, previous_state_hash: selectorBefore.head_hash,
    outstanding_stream_map_ref: refFor(receiverMapAfter), outstanding_stream_map_hash: receiverMapAfter.map_hash,
    head_hash: `sha-256:${"d".repeat(64)}`
  };
  const selectorBeforeRef = { schema: selectorBefore.schema, object_id: selectorKey, object_hash: selectorBefore.head_hash };
  const selectorAfterRef = { schema: selectorAfter.schema, object_id: selectorKey, object_hash: selectorAfter.head_hash };
  const identityScope = {
    schema: "cairn.receiver_event_identity_index_state_head.v0.1",
    identity_scope_index_key: identityScopeKey, receiver_sequence_epoch_selector_key: selectorKey,
    sequence: 0, previous_state_hash: null, state: "active", accepting_index_epoch: 0,
    index_epoch_directory_head_ref: {
      schema: "cairn.bounded_index_epoch_directory_head.v0.1", object_id: identityScopeKey,
      object_hash: `sha-256:${"4".repeat(64)}`
    },
    index_epoch_directory_head_hash: `sha-256:${"4".repeat(64)}`,
    accepting_index_epoch_state_head_ref: {
      schema: "cairn.bounded_index_epoch_state_head.v0.1", object_id: `${identityScopeKey}:0`,
      object_hash: `sha-256:${"5".repeat(64)}`
    },
    accepting_index_epoch_state_head_hash: `sha-256:${"5".repeat(64)}`,
    total_event_id_count: 0, total_provider_sequence_count: 0,
    total_reserved_event_id_slots: 2, total_reserved_provider_sequence_slots: 2,
    updated_at: drainedIndex.updated_at, head_hash: `sha-256:${"e".repeat(64)}`,
    authority_service_signature: externalSignature(`sha-256:${"e".repeat(64)}`)
  };
  const identityScopeAfter = {
    ...identityScope, sequence: 1, previous_state_hash: identityScope.head_hash,
    accepting_index_epoch_state_head_ref: {
      schema: "cairn.bounded_index_epoch_state_head.v0.1", object_id: `${identityScopeKey}:0`,
      object_hash: `sha-256:${"0".repeat(62)}51`
    },
    accepting_index_epoch_state_head_hash: `sha-256:${"0".repeat(62)}51`,
    head_hash: `sha-256:${"7".repeat(64)}`,
    authority_service_signature: externalSignature(`sha-256:${"7".repeat(64)}`)
  };
  const assignedEpochBefore = {
    schema: "cairn.bounded_index_epoch_state_head.v0.1",
    directory_key: identityScopeKey, epoch: 0, sequence: 0, previous_state_hash: null,
    state: "accepting", manifest_set_map_ref: distinctRefs(1, "epoch-manifest-before")[0],
    manifest_set_map_hash: null, manifest_set_count: 0,
    reservation_assignment_map_ref: distinctRefs(1, "epoch-reservations-before")[0],
    reservation_assignment_map_hash: null, reservation_assignment_count: 2,
    outstanding_reserved_slots: 4, updated_at: drainedIndex.updated_at,
    head_hash: identityScope.accepting_index_epoch_state_head_hash,
    authority_service_signature: externalSignature(identityScope.accepting_index_epoch_state_head_hash)
  };
  assignedEpochBefore.manifest_set_map_hash = assignedEpochBefore.manifest_set_map_ref.object_hash;
  assignedEpochBefore.reservation_assignment_map_hash =
    assignedEpochBefore.reservation_assignment_map_ref.object_hash;
  const assignedEpochAfter = {
    ...assignedEpochBefore, sequence: 1, previous_state_hash: assignedEpochBefore.head_hash,
    head_hash: identityScopeAfter.accepting_index_epoch_state_head_hash,
    authority_service_signature: externalSignature(identityScopeAfter.accepting_index_epoch_state_head_hash)
  };
  const identityScopeRef = {
    schema: identityScope.schema, object_id: identityScopeKey, object_hash: identityScope.head_hash
  };
  const identityScopeAfterRef = {
    schema: identityScopeAfter.schema, object_id: identityScopeKey, object_hash: identityScopeAfter.head_hash
  };
  const releasedAssignment = (assignment, state, hash) => ({
    ...assignment, state, assignment_hash: hash,
    authority_service_signature: externalSignature(hash)
  });
  const eventAssignmentAfter = releasedAssignment(
    eventAssignment, "released_on_fenced_non_submission", `sha-256:${"0".repeat(63)}a`
  );
  const sequenceAssignmentAfter = releasedAssignment(
    sequenceAssignment, "released_on_fenced_non_submission", `sha-256:${"0".repeat(63)}b`
  );
  const trustAssignmentAfter = releasedAssignment(
    trustAssignment, "released_on_fenced_non_submission", `sha-256:${"0".repeat(63)}c`
  );
  const eventAssignmentAfterRef = {
    schema: eventAssignmentAfter.schema, object_id: eventAssignmentAfter.slot_assignment_id,
    object_hash: eventAssignmentAfter.assignment_hash
  };
  const sequenceAssignmentAfterRef = {
    schema: sequenceAssignmentAfter.schema, object_id: sequenceAssignmentAfter.slot_assignment_id,
    object_hash: sequenceAssignmentAfter.assignment_hash
  };
  receiverEntryAfter = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...receiverEntryBefore, sequence: 1, previous_entry_hash: receiverEntryBefore.entry_hash,
    event_id_slot_assignment_ref: eventAssignmentAfterRef,
    event_id_slot_assignment_hash: eventAssignmentAfterRef.object_hash,
    sequence_slot_assignment_ref: sequenceAssignmentAfterRef,
    sequence_slot_assignment_hash: sequenceAssignmentAfterRef.object_hash,
    state: "fenced_non_submission"
  });
  const trustAssignmentAfterRef = {
    schema: trustAssignmentAfter.schema, object_id: trustAssignmentAfter.slot_assignment_id,
    object_hash: trustAssignmentAfter.assignment_hash
  };
  const identityTransition = {
    schema: "cairn.bounded_index_epoch_transition_receipt.v0.1", directory_key: identityScopeKey,
    cause: "fenced_non_submission_release",
    before_directory_head_ref: identityScope.index_epoch_directory_head_ref,
    before_directory_head_hash: identityScope.index_epoch_directory_head_hash,
    after_directory_head_ref: identityScopeAfter.index_epoch_directory_head_ref,
    after_directory_head_hash: identityScopeAfter.index_epoch_directory_head_hash,
    live_epoch_map_before_ref: distinctRefs(1, "identity-live-map-before")[0],
    live_epoch_map_before_hash: null,
    live_epoch_map_after_ref: distinctRefs(1, "identity-live-map-after")[0],
    live_epoch_map_after_hash: null,
    affected_epoch_before_head_ref: identityScope.accepting_index_epoch_state_head_ref,
    affected_epoch_before_head_hash: identityScope.accepting_index_epoch_state_head_hash,
    affected_epoch_after_head_ref: identityScopeAfter.accepting_index_epoch_state_head_ref,
    affected_epoch_after_head_hash: identityScopeAfter.accepting_index_epoch_state_head_hash,
    reservation_assignment_transitions: [
      { assignment_before_ref: eventAssignmentRef, assignment_before_hash: eventAssignmentRef.object_hash,
        assignment_after_ref: eventAssignmentAfterRef, assignment_after_hash: eventAssignmentAfterRef.object_hash,
        after_map_membership: false },
      { assignment_before_ref: sequenceAssignmentRef, assignment_before_hash: sequenceAssignmentRef.object_hash,
        assignment_after_ref: sequenceAssignmentAfterRef, assignment_after_hash: sequenceAssignmentAfterRef.object_hash,
        after_map_membership: false }
    ],
    terminal_release_evidence_ref: fencedEvidenceRef,
    terminal_release_evidence_hash: fencedEvidenceRef.object_hash,
    closure_receipt_ref: null, closure_receipt_hash: null,
    authority_transaction_id: "remove-outstanding-action", committed_at: drainedIndex.updated_at,
    receipt_hash: `sha-256:${"f".repeat(64)}`,
    authority_service_signature: externalSignature(`sha-256:${"f".repeat(64)}`)
  };
  identityTransition.live_epoch_map_before_hash = identityTransition.live_epoch_map_before_ref.object_hash;
  identityTransition.live_epoch_map_after_hash = identityTransition.live_epoch_map_after_ref.object_hash;
  identityTransition.reservation_assignment_transitions_root =
    canonicalHash(identityTransition.reservation_assignment_transitions);
  const identityTransitionRef = {
    schema: identityTransition.schema, object_id: identityTransition.receipt_hash,
    object_hash: identityTransition.receipt_hash
  };
  const releasePlanSeed = make("cairn.receiver_terminal_release_plan_core.v0.1", {
    release_cause: "fenced_non_submission", terminal_release_evidence_ref: fencedEvidenceRef,
    terminal_release_evidence_hash: fencedEvidenceRef.object_hash,
    receiver_outstanding_stream_entry_ref: refFor(receiverEntryBefore),
    receiver_outstanding_stream_entry_hash: receiverEntryBefore.entry_hash,
    event_id_slot_assignment_ref: eventAssignmentRef, event_id_slot_assignment_hash: eventAssignmentRef.object_hash,
    sequence_slot_assignment_ref: sequenceAssignmentRef, sequence_slot_assignment_hash: sequenceAssignmentRef.object_hash,
    trust_epoch_assignment_manifest_ref: refFor(trustManifest),
    trust_epoch_assignment_manifest_hash: trustManifest.manifest_hash, trust_epoch_assignment_count: 1,
    future_dependency_pool_state_head_ref: receiverEntryBefore.future_dependency_pool_state_head_ref,
    future_dependency_pool_state_head_hash: receiverEntryBefore.future_dependency_pool_state_head_hash,
    future_dependency_assignment_ref: receiverEntryBefore.future_dependency_assignment_ref,
    future_dependency_assignment_hash: receiverEntryBefore.future_dependency_assignment_hash,
    receiver_stream_before_head_ref: null, receiver_stream_before_head_hash: null,
    connection_outstanding_action_entry_ref: refFor(updatedEntry),
    connection_outstanding_action_entry_hash: updatedEntry.entry_hash,
    authority_transaction_id: "remove-outstanding-action"
  });
  const releasePlan = make("cairn.receiver_terminal_release_plan_core.v0.1", {
    ...releasePlanSeed, terminal_release_plan_key: receiverTerminalReleasePlanKey(releasePlanSeed, receiverEntryBefore),
    expected_transition_kind_set_root: receiverTerminalTransitionKindSetRoot(releasePlanSeed, receiverEntryBefore)
  });
  const receiverTransition = make("cairn.receiver_outstanding_stream_transition_receipt.v0.1", {
    outstanding_stream_key: receiverEntryBefore.outstanding_stream_key,
    epoch_selector_before_head_ref: selectorBeforeRef, epoch_selector_before_head_hash: selectorBeforeRef.object_hash,
    epoch_selector_after_head_ref: selectorAfterRef, epoch_selector_after_head_hash: selectorAfterRef.object_hash,
    assigned_identity_scope_before_head_ref: identityScopeRef,
    assigned_identity_scope_before_head_hash: identityScopeRef.object_hash,
    assigned_identity_scope_after_head_ref: identityScopeAfterRef,
    assigned_identity_scope_after_head_hash: identityScopeAfterRef.object_hash,
    outstanding_stream_map_before_ref: refFor(receiverMapBefore),
    outstanding_stream_map_before_hash: receiverMapBefore.map_hash,
    outstanding_stream_map_after_ref: refFor(receiverMapAfter),
    outstanding_stream_map_after_hash: receiverMapAfter.map_hash,
    before_change_proof: mapPathProof(receiverMapBefore, receiverLeaf,
      receiverEntryBefore.outstanding_stream_key, "membership"),
    after_change_proof: mapPathProof(receiverMapAfter, receiverEmptyNode,
      receiverEntryBefore.outstanding_stream_key, "nonmembership", "empty_root"),
    cause: "fenced_non_submission", entry_before_ref: refFor(receiverEntryBefore),
    entry_before_hash: receiverEntryBefore.entry_hash, entry_after_ref: refFor(receiverEntryAfter),
    entry_after_hash: receiverEntryAfter.entry_hash, after_current_map_membership: false,
    identity_epoch_transition_receipt_ref: identityTransitionRef,
    identity_epoch_transition_receipt_hash: identityTransitionRef.object_hash,
    unchanged_assigned_identity_epoch_head_ref: null, unchanged_assigned_identity_epoch_head_hash: null,
    terminal_release_evidence_ref: fencedEvidenceRef,
    terminal_release_evidence_hash: fencedEvidenceRef.object_hash,
    terminal_release_plan_core_ref: refFor(releasePlan),
    terminal_release_plan_core_hash: releasePlan.plan_hash,
    receiver_stream_transition_receipt_ref: null, receiver_stream_transition_receipt_hash: null,
    unchanged_receiver_stream_head_ref: null, unchanged_receiver_stream_head_hash: null,
    authority_transaction_id: "remove-outstanding-action", committed_at: drainedIndex.updated_at
  });
  const removalReceipt = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    ...updateReceipt, cause: "fenced_non_submission_removed",
    before_head_ref: refFor(updatedIndex), before_head_hash: updatedIndex.head_hash,
    after_head_ref: refFor(drainedIndex), after_head_hash: drainedIndex.head_hash,
    before_action_map_ref: refFor(updatedMap), before_action_map_hash: updatedMap.map_hash,
    after_action_map_ref: refFor(drainedMap), after_action_map_hash: drainedMap.map_hash,
    changed_entry_before_ref: refFor(updatedEntry), changed_entry_before_hash: updatedEntry.entry_hash,
    changed_entry_after_ref: null, changed_entry_after_hash: null,
    before_change_proof: mapPathProof(updatedMap, updatedLeaf, updatedEntry.outstanding_action_key, "membership"),
    after_change_proof: mapPathProof(drainedMap, emptyNode, updatedEntry.outstanding_action_key,
      "nonmembership", "empty_root"),
    action_transition_receipt_ref: null, action_transition_receipt_hash: null,
    terminal_evidence_ref: refFor(receiverTransition), terminal_evidence_hash: receiverTransition.receipt_hash,
    authority_transaction_id: "remove-outstanding-action", committed_at: drainedIndex.updated_at
  });
  const removalContext = {
    ...updateContext,
    externalObjectVerifier: ({ object, expectedSchema }) => {
      const exemplar = new Map([
        [fencedEvidence.schema, fencedEvidence],
        [eventAssignment.schema, eventAssignment],
        [selectorBefore.schema, selectorBefore],
        [identityScope.schema, identityScope],
        [assignedEpochBefore.schema, assignedEpochBefore],
        [identityTransition.schema, identityTransition]
      ]).get(expectedSchema);
      return exemplar !== undefined &&
        canonicalHash(Object.keys(object).sort()) === canonicalHash(Object.keys(exemplar).sort());
    },
    objectResolver: new Map([
      ...[...updateObjects, drainedMap, drainedIndex, trustManifest, receiverEntryBefore, receiverEntryAfter,
        receiverLeaf, receiverMapBefore, receiverEmptyNode, receiverMapAfter, releasePlan,
        receiverTransition, removalReceipt].map((object) => [refFor(object).object_hash, object]),
      ...[fencedEvidence, eventAssignment, sequenceAssignment, trustAssignment,
        eventAssignmentAfter, sequenceAssignmentAfter, trustAssignmentAfter,
        selectorBefore, selectorAfter, identityScope, identityScopeAfter,
        assignedEpochBefore, assignedEpochAfter, identityTransition].map((object) => [
          object.receipt_hash ?? object.assignment_hash ?? object.head_hash, object
        ])
    ])
  };
  assert.deepEqual(validateReceiverOutstandingStreamEntry(receiverEntryBefore, removalContext), []);
  const fencedMissingSelectorContext = {
    ...removalContext, objectResolver: new Map(removalContext.objectResolver)
  };
  fencedMissingSelectorContext.objectResolver.delete(
    receiverTransition.epoch_selector_before_head_ref.object_hash
  );
  assert.ok(validateReceiverOutstandingStreamTransitionReceipt(
    receiverTransition, fencedMissingSelectorContext
  ).includes("receiver_outstanding_transition_selector_scope_mismatch"));
  const fencedMissingSelectorReadFailures = validateExactObjectRead(
    "execution.receiver_outstanding_stream_transition_receipt.get",
    { ref: refFor(receiverTransition) },
    receiverTransition,
    fencedMissingSelectorContext
  );
  assert.ok(fencedMissingSelectorReadFailures.includes(
    "object_read_receiver_outstanding_transition_entry_mismatch"
  ), JSON.stringify(fencedMissingSelectorReadFailures));
  assert.ok(validateReceiverOutstandingStreamEntry(receiverEntryBefore, {
    ...removalContext, externalObjectVerifier: () => false
  }).includes("receiver_outstanding_entry_slot_assignment_mismatch"));
  assert.deepEqual(validateReceiverTerminalReleasePlan(releasePlan, removalContext), []);
  assert.deepEqual(validateReceiverOutstandingStreamTransitionReceipt(receiverTransition, removalContext), []);
  assert.deepEqual(validateConnectionOutstandingIndexTransitionReceipt(removalReceipt, removalContext), []);
  const liveMissingTerminalEvidence = make(
    "cairn.connection_outstanding_action_index_transition_receipt.v0.1",
    { ...removalReceipt, terminal_evidence_ref: null, terminal_evidence_hash: null }
  );
  assert.ok(validateConnectionOutstandingIndexTransitionReceipt(
    liveMissingTerminalEvidence, removalContext
  ).includes("outstanding_index_transition_removal_union_mismatch"));
  assert.ok(validateExactObjectRead(
    "execution.connection_outstanding_action_index_transition_receipt.get",
    { ref: refFor(liveMissingTerminalEvidence) },
    liveMissingTerminalEvidence,
    removalContext
  ).includes("object_read_outstanding_index_transition_removal_union_mismatch"));
  const liveFalseSnapshot = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    ...updateReceipt, cause: "connection_restriction_snapshot",
    changed_action_key: null, changed_entry_before_ref: null, changed_entry_before_hash: null,
    changed_entry_after_ref: null, changed_entry_after_hash: null
  });
  assert.ok(validateConnectionOutstandingIndexTransitionReceipt(liveFalseSnapshot, updateContext)
    .includes("outstanding_index_transition_snapshot_changed_map"));
  const liveSealedIndex = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    ...index, sequence: index.sequence + 1, previous_state_hash: index.head_hash, state: "sealed"
  });
  const liveSealReceipt = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    outstanding_action_index_key: indexKey, cause: "connection_terminal_seal",
    before_head_ref: refFor(index), before_head_hash: index.head_hash,
    after_head_ref: refFor(liveSealedIndex), after_head_hash: liveSealedIndex.head_hash,
    before_action_map_ref: refFor(map), before_action_map_hash: map.map_hash,
    after_action_map_ref: refFor(map), after_action_map_hash: map.map_hash,
    changed_action_key: null, changed_entry_before_ref: null, changed_entry_before_hash: null,
    changed_entry_after_ref: null, changed_entry_after_hash: null,
    before_change_proof: null, after_change_proof: null,
    action_transition_receipt_ref: null, action_transition_receipt_hash: null,
    terminal_evidence_ref: null, terminal_evidence_hash: null,
    authority_transaction_id: "live-terminal-seal", committed_at: liveSealedIndex.updated_at
  });
  const liveSealContext = {
    ...mapContext,
    objectResolver: new Map(mapContext.objectResolver)
      .set(refFor(liveSealedIndex).object_hash, liveSealedIndex)
      .set(refFor(liveSealReceipt).object_hash, liveSealReceipt)
  };
  assert.deepEqual(validateConnectionOutstandingIndexTransitionReceipt(liveSealReceipt, liveSealContext), []);
  const liveFalseSeal = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    ...liveSealReceipt,
    after_head_ref: refFor(updatedIndex), after_head_hash: updatedIndex.head_hash,
    after_action_map_ref: refFor(updatedMap), after_action_map_hash: updatedMap.map_hash
  });
  assert.ok(validateConnectionOutstandingIndexTransitionReceipt(liveFalseSeal, updateContext)
    .includes("outstanding_index_transition_terminal_seal_mismatch"));
  const liveReboundReceiverKey = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...receiverEntryBefore, precommitted_client_reference: "live-rebound-client-reference"
  });
  assert.ok(validateReceiverOutstandingStreamEntry(liveReboundReceiverKey, removalContext)
    .includes("receiver_outstanding_entry_key_mismatch"));
  assert.ok(validateExactObjectRead(
    "execution.receiver_outstanding_stream_entry.get",
    { ref: refFor(liveReboundReceiverKey) },
    liveReboundReceiverKey,
    removalContext
  ).includes("object_read_receiver_outstanding_entry_key_mismatch"));
  const liveHollowTerminalEvidence = {
    schema: fencedEvidence.schema,
    receipt_id: fencedEvidence.receipt_id,
    receipt_hash: fencedEvidence.receipt_hash
  };
  const liveHollowEvidenceContext = {
    ...removalContext,
    objectResolver: new Map(removalContext.objectResolver)
      .set(fencedEvidenceRef.object_hash, liveHollowTerminalEvidence)
  };
  assert.ok(validateReceiverTerminalReleasePlan(releasePlan, liveHollowEvidenceContext)
    .includes("receiver_outstanding_terminal_evidence_mismatch"));
  const liveUnverifiedTerminalEvidence = {
    ...fencedEvidence, unverified_extension: true
  };
  const liveUnverifiedEvidenceContext = {
    ...removalContext,
    objectResolver: new Map(removalContext.objectResolver)
      .set(fencedEvidenceRef.object_hash, liveUnverifiedTerminalEvidence)
  };
  assert.ok(validateReceiverTerminalReleasePlan(releasePlan, liveUnverifiedEvidenceContext)
    .includes("receiver_outstanding_terminal_evidence_mismatch"));
  const missingSlotContext = { ...removalContext, objectResolver: new Map(removalContext.objectResolver) };
  missingSlotContext.objectResolver.delete(eventAssignmentRef.object_hash);
  assert.ok(validateReceiverOutstandingStreamEntry(receiverEntryBefore, missingSlotContext)
    .includes("receiver_outstanding_entry_slot_assignment_mismatch"));
  const missingTrustContext = { ...removalContext, objectResolver: new Map(removalContext.objectResolver) };
  missingTrustContext.objectResolver.delete(refFor(trustManifest).object_hash);
  assert.ok(validateReceiverOutstandingStreamEntry(receiverEntryBefore, missingTrustContext)
    .includes("receiver_outstanding_entry_trust_manifest_mismatch"));
  const wrongPlanRoot = make("cairn.receiver_terminal_release_plan_core.v0.1", {
    ...releasePlan, expected_transition_kind_set_root: `sha-256:${"7".repeat(64)}`
  });
  assert.ok(validateReceiverTerminalReleasePlan(wrongPlanRoot, removalContext)
    .includes("receiver_terminal_plan_transition_kind_set_mismatch"));
  const wrongPlanReadFailures = validateExactObjectRead(
    "execution.receiver_terminal_release_plan_core.get", { ref: refFor(wrongPlanRoot) },
    wrongPlanRoot, removalContext
  );
  assert.ok(wrongPlanReadFailures.includes(
    "object_read_receiver_terminal_plan_entry_binding_mismatch"
  ), JSON.stringify(wrongPlanReadFailures));
  const wrongPlanTransition = make("cairn.receiver_outstanding_stream_transition_receipt.v0.1", {
    ...receiverTransition, terminal_release_plan_core_ref: refFor(wrongPlanRoot),
    terminal_release_plan_core_hash: wrongPlanRoot.plan_hash
  });
  const wrongPlanTransitionContext = {
    ...removalContext,
    objectResolver: new Map([...removalContext.objectResolver, [refFor(wrongPlanRoot).object_hash, wrongPlanRoot]])
  };
  assert.ok(validateReceiverOutstandingStreamTransitionReceipt(wrongPlanTransition, wrongPlanTransitionContext)
    .includes("receiver_outstanding_transition_terminal_union_mismatch"));
  const alteredRuleAfter = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...receiverEntryAfter, authenticated_closure_or_horizon_rule_hash: `sha-256:${"7".repeat(64)}`
  });
  const alteredRuleTransition = make("cairn.receiver_outstanding_stream_transition_receipt.v0.1", {
    ...receiverTransition, entry_after_ref: refFor(alteredRuleAfter), entry_after_hash: alteredRuleAfter.entry_hash
  });
  const alteredRuleContext = {
    ...removalContext,
    objectResolver: new Map([...removalContext.objectResolver,
      [refFor(alteredRuleAfter).object_hash, alteredRuleAfter]])
  };
  assert.ok(validateReceiverOutstandingStreamTransitionReceipt(alteredRuleTransition, alteredRuleContext)
    .includes("receiver_outstanding_transition_entry_mismatch"));
  const [foreignFuturePoolRef, foreignFutureAssignmentRef] = distinctRefs(2, "foreign-future-capacity");
  const alteredFutureAfter = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...receiverEntryAfter,
    future_dependency_pool_state_head_ref: foreignFuturePoolRef,
    future_dependency_pool_state_head_hash: foreignFuturePoolRef.object_hash,
    future_dependency_assignment_ref: foreignFutureAssignmentRef,
    future_dependency_assignment_hash: foreignFutureAssignmentRef.object_hash
  });
  const alteredFutureTransition = make("cairn.receiver_outstanding_stream_transition_receipt.v0.1", {
    ...receiverTransition, entry_after_ref: refFor(alteredFutureAfter),
    entry_after_hash: alteredFutureAfter.entry_hash
  });
  const alteredFutureContext = {
    ...removalContext,
    objectResolver: new Map([...removalContext.objectResolver,
      [refFor(alteredFutureAfter).object_hash, alteredFutureAfter]])
  };
  const alteredFutureFailures = validateReceiverOutstandingStreamTransitionReceipt(
    alteredFutureTransition, alteredFutureContext
  );
  assert.ok(alteredFutureFailures.includes("receiver_outstanding_transition_sequence_mismatch"),
    JSON.stringify(alteredFutureFailures));
  const secondIdentityTransition = identityTransition;
  const secondIdentityTransitionRef = identityTransitionRef;
  const trustTransition = {
    ...identityTransition,
    reservation_assignment_transitions: [{
      assignment_before_ref: trustAssignmentRef,
      assignment_before_hash: trustAssignmentRef.object_hash,
      assignment_after_ref: trustAssignmentAfterRef,
      assignment_after_hash: trustAssignmentAfterRef.object_hash,
      after_map_membership: false
    }],
    receipt_hash: `sha-256:${"0".repeat(63)}1`,
    authority_service_signature: externalSignature(`sha-256:${"0".repeat(63)}1`)
  };
  trustTransition.reservation_assignment_transitions_root =
    canonicalHash(trustTransition.reservation_assignment_transitions);
  const trustTransitionRef = {
    schema: trustTransition.schema, object_id: trustTransition.receipt_hash,
    object_hash: trustTransition.receipt_hash
  };
  const trustTransitionEntryBase = {
    entry_kind: "bounded_index_epoch_transition_receipt", entry_object_ref: trustTransitionRef,
    entry_object_hash: trustTransitionRef.object_hash
  };
  const trustTransitionEntry = {
    ...trustTransitionEntryBase, entry_key: transitionManifestEntryKey(trustTransitionEntryBase)
  };
  const trustTransitionManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    manifest_kind: "receiver_trust_epoch_transitions", entry_count: 1,
    sorted_entries: [trustTransitionEntry], entries_root: canonicalHash([trustTransitionEntry])
  });
  const identityTransitionReceipts = [
    { assignment_ref: eventAssignmentRef, assignment_hash: eventAssignmentRef.object_hash,
      transition_receipt_ref: identityTransitionRef, transition_receipt_hash: identityTransitionRef.object_hash },
    { assignment_ref: sequenceAssignmentRef, assignment_hash: sequenceAssignmentRef.object_hash,
      transition_receipt_ref: secondIdentityTransitionRef,
      transition_receipt_hash: secondIdentityTransitionRef.object_hash }
  ];
  const completionSeed = make("cairn.receiver_terminal_release_completion_receipt.v0.1", {
    terminal_release_plan_core_ref: refFor(releasePlan), terminal_release_plan_core_hash: releasePlan.plan_hash,
    terminal_release_evidence_ref: fencedEvidenceRef, terminal_release_evidence_hash: fencedEvidenceRef.object_hash,
    identity_epoch_transition_receipts: identityTransitionReceipts, identity_transition_count: 2,
    identity_transition_root: canonicalHash(identityTransitionReceipts),
    trust_epoch_transition_manifest_ref: refFor(trustTransitionManifest),
    trust_epoch_transition_manifest_hash: trustTransitionManifest.manifest_hash,
    trust_epoch_transition_count: 1, trust_epoch_transition_root: trustTransitionManifest.entries_root,
    future_dependency_transition_receipt_ref: null, future_dependency_transition_receipt_hash: null,
    receiver_stream_transition_receipt_ref: null, receiver_stream_transition_receipt_hash: null,
    unchanged_receiver_stream_head_ref: null, unchanged_receiver_stream_head_hash: null,
    receiver_outstanding_stream_transition_receipt_ref: refFor(receiverTransition),
    receiver_outstanding_stream_transition_receipt_hash: receiverTransition.receipt_hash,
    connection_outstanding_action_transition_receipt_ref: refFor(removalReceipt),
    connection_outstanding_action_transition_receipt_hash: removalReceipt.receipt_hash,
    completed_transition_kind_set_root: releasePlan.expected_transition_kind_set_root,
    authority_transaction_id: releasePlan.authority_transaction_id,
    committed_at: removalReceipt.committed_at
  });
  const completion = make("cairn.receiver_terminal_release_completion_receipt.v0.1", {
    ...completionSeed, completion_key: receiverTerminalCompletionKey(releasePlan),
    plan_to_receipt_keyset_equality_proof_hash:
      receiverTerminalPlanToReceiptKeysetEqualityHash(releasePlan, completionSeed)
  });
  const completionContext = {
    ...removalContext,
    objectResolver: new Map([
      ...removalContext.objectResolver,
      [refFor(trustTransitionManifest).object_hash, trustTransitionManifest],
      [trustTransitionRef.object_hash, trustTransition],
      [refFor(completion).object_hash, completion]
    ])
  };
  assert.deepEqual(validateReceiverTerminalReleaseCompletion(completion, completionContext), []);
  const wrongIdentityTransition = {
    ...identityTransition,
    reservation_assignment_transitions: [identityTransition.reservation_assignment_transitions[0]],
    receipt_hash: `sha-256:${"0".repeat(63)}9`,
    authority_service_signature: externalSignature(`sha-256:${"0".repeat(63)}9`)
  };
  wrongIdentityTransition.reservation_assignment_transitions_root =
    canonicalHash(wrongIdentityTransition.reservation_assignment_transitions);
  const wrongIdentityTransitionRef = {
    schema: wrongIdentityTransition.schema, object_id: wrongIdentityTransition.receipt_hash,
    object_hash: wrongIdentityTransition.receipt_hash
  };
  const wrongIdentityReceipts = [identityTransitionReceipts[0], {
    ...identityTransitionReceipts[1], transition_receipt_ref: wrongIdentityTransitionRef,
    transition_receipt_hash: wrongIdentityTransitionRef.object_hash
  }];
  const wrongIdentityCompletion = make("cairn.receiver_terminal_release_completion_receipt.v0.1", {
    ...completion, identity_epoch_transition_receipts: wrongIdentityReceipts,
    identity_transition_root: canonicalHash(wrongIdentityReceipts)
  });
  const wrongIdentityContext = {
    ...completionContext,
    objectResolver: new Map(completionContext.objectResolver)
      .set(wrongIdentityTransitionRef.object_hash, wrongIdentityTransition)
  };
  assert.ok(validateReceiverTerminalReleaseCompletion(wrongIdentityCompletion, wrongIdentityContext)
    .includes("receiver_terminal_completion_identity_transition_atomicity_mismatch"));
  const wrongKeysetProof = make("cairn.receiver_terminal_release_completion_receipt.v0.1", {
    ...completion, plan_to_receipt_keyset_equality_proof_hash: `sha-256:${"7".repeat(64)}`
  });
  assert.ok(validateReceiverTerminalReleaseCompletion(wrongKeysetProof, completionContext)
    .includes("receiver_terminal_completion_plan_mismatch"));
  const missingIdentityCompletionContext = {
    ...completionContext, objectResolver: new Map(completionContext.objectResolver)
  };
  missingIdentityCompletionContext.objectResolver.delete(secondIdentityTransitionRef.object_hash);
  assert.ok(validateReceiverTerminalReleaseCompletion(completion, missingIdentityCompletionContext)
    .includes("receiver_terminal_completion_dependency_mismatch"));
  const reboundIdentityCompletionContext = {
    ...completionContext,
    objectResolver: new Map(completionContext.objectResolver).set(secondIdentityTransitionRef.object_hash, {
      ...secondIdentityTransition, assignment_ref: eventAssignmentRef
    })
  };
  assert.ok(validateReceiverTerminalReleaseCompletion(completion, reboundIdentityCompletionContext)
    .includes("receiver_terminal_completion_dependency_mismatch"));
  const foreignAssignment = {
    ...sequenceAssignment, slot_assignment_id: `sha-256:${"0".repeat(63)}e`,
    assignment_hash: `sha-256:${"0".repeat(63)}2`
  };
  const foreignAssignmentRef = {
    schema: foreignAssignment.schema, object_id: foreignAssignment.slot_assignment_id,
    object_hash: foreignAssignment.assignment_hash
  };
  const foreignIdentityReceipts = [identityTransitionReceipts[0], {
    assignment_ref: foreignAssignmentRef, assignment_hash: foreignAssignmentRef.object_hash,
    transition_receipt_ref: identityTransitionRef,
    transition_receipt_hash: identityTransitionRef.object_hash
  }];
  const foreignIdentitySeed = {
    ...completion, identity_epoch_transition_receipts: foreignIdentityReceipts,
    identity_transition_root: canonicalHash(foreignIdentityReceipts)
  };
  const foreignIdentityCompletion = make("cairn.receiver_terminal_release_completion_receipt.v0.1", {
    ...foreignIdentitySeed,
    plan_to_receipt_keyset_equality_proof_hash:
      receiverTerminalPlanToReceiptKeysetEqualityHash(releasePlan, foreignIdentitySeed)
  });
  const foreignIdentityContext = {
    ...completionContext,
    objectResolver: new Map([
      ...completionContext.objectResolver,
      [foreignAssignmentRef.object_hash, foreignAssignment]
    ])
  };
  assert.ok(validateReceiverTerminalReleaseCompletion(foreignIdentityCompletion, foreignIdentityContext)
    .includes("receiver_terminal_completion_plan_mismatch"));
  const wrongTrustTransition = {
    ...trustTransition,
    reservation_assignment_transitions: [{
      assignment_before_ref: sequenceAssignmentRef,
      assignment_before_hash: sequenceAssignmentRef.object_hash,
      assignment_after_ref: sequenceAssignmentAfterRef,
      assignment_after_hash: sequenceAssignmentAfterRef.object_hash,
      after_map_membership: false
    }],
    receipt_hash: `sha-256:${"0".repeat(63)}4`,
    authority_service_signature: externalSignature(`sha-256:${"0".repeat(63)}4`)
  };
  wrongTrustTransition.reservation_assignment_transitions_root =
    canonicalHash(wrongTrustTransition.reservation_assignment_transitions);
  const wrongTrustTransitionRef = {
    schema: wrongTrustTransition.schema, object_id: wrongTrustTransition.receipt_hash,
    object_hash: wrongTrustTransition.receipt_hash
  };
  const wrongTrustEntryBase = {
    entry_kind: "bounded_index_epoch_transition_receipt", entry_object_ref: wrongTrustTransitionRef,
    entry_object_hash: wrongTrustTransitionRef.object_hash
  };
  const wrongTrustEntry = {
    ...wrongTrustEntryBase, entry_key: transitionManifestEntryKey(wrongTrustEntryBase)
  };
  const wrongTrustManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    manifest_kind: "receiver_trust_epoch_transitions", entry_count: 1,
    sorted_entries: [wrongTrustEntry], entries_root: canonicalHash([wrongTrustEntry])
  });
  const wrongTrustSeed = {
    ...completion, trust_epoch_transition_manifest_ref: refFor(wrongTrustManifest),
    trust_epoch_transition_manifest_hash: wrongTrustManifest.manifest_hash,
    trust_epoch_transition_root: wrongTrustManifest.entries_root
  };
  const wrongTrustCompletion = make("cairn.receiver_terminal_release_completion_receipt.v0.1", {
    ...wrongTrustSeed,
    plan_to_receipt_keyset_equality_proof_hash:
      receiverTerminalPlanToReceiptKeysetEqualityHash(releasePlan, wrongTrustSeed)
  });
  const wrongTrustContext = {
    ...completionContext,
    objectResolver: new Map([
      ...completionContext.objectResolver,
      [refFor(wrongTrustManifest).object_hash, wrongTrustManifest],
      [wrongTrustTransitionRef.object_hash, wrongTrustTransition]
    ])
  };
  assert.ok(validateReceiverTerminalReleaseCompletion(wrongTrustCompletion, wrongTrustContext)
    .includes("receiver_terminal_completion_trust_transition_mismatch"));
  const wrongCompletionRoot = make("cairn.receiver_terminal_release_completion_receipt.v0.1", {
    ...completion, completed_transition_kind_set_root: `sha-256:${"7".repeat(64)}`
  });
  assert.ok(validateReceiverTerminalReleaseCompletion(wrongCompletionRoot, completionContext)
    .includes("receiver_terminal_completion_plan_mismatch"));
  const wrongCompletionReadContext = signedReadContext([
    ...completionContext.objectResolver.values(), wrongCompletionRoot
  ], completionContext, action.principal_id);
  const wrongCompletionReadFailures = validateExactObjectRead(
    "execution.receiver_terminal_release_completion_receipt.get",
    { ref: refFor(wrongCompletionRoot) }, wrongCompletionRoot, wrongCompletionReadContext
  );
  assert.ok(wrongCompletionReadFailures.includes(
    "object_read_receiver_terminal_completion_plan_mismatch"
  ), JSON.stringify(wrongCompletionReadFailures));
  assert.ok(validateExactObjectRead(
    "execution.receiver_terminal_release_completion_receipt.get",
    { ref: refFor(completion) }, completion, signedReadContext(completion, completionContext)
  ).includes("phase1_authenticated_resolution_unsupported"));
  const receiverActionState = make("cairn.action_state_head.v0.1", {
    action_id: action.action_id, action_ref: refFor(action), sequence: 2,
    previous_state_hash: updatedActionState.state_hash, state: "acknowledged",
    authority_ref: updatedActionState.authority_ref,
    lineage_activation_receipt_ref: updatedActionState.lineage_activation_receipt_ref,
    reservation_refs: updatedActionState.reservation_refs,
    gate_result_ref: updatedActionState.gate_result_ref
  });
  const receiverStreamKey = `sha-256:${"6".repeat(64)}`;
  const receiverCurrentEntrySeed = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...updatedEntry, current_action_state_head_ref: refFor(receiverActionState),
    current_action_state_head_hash: receiverActionState.state_hash,
    receiver_event_stream_key: receiverStreamKey, sequence: 2,
    previous_entry_hash: updatedEntry.entry_hash, state: "receiver_state_current"
  });
  const receiverCurrentEntry = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...receiverCurrentEntrySeed, outstanding_action_key: connectionOutstandingActionKey(receiverCurrentEntrySeed)
  });
  const receiverWrongConnectionStateSeed = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...receiverEntryBefore, connection_outstanding_action_key: receiverCurrentEntry.outstanding_action_key,
    connection_outstanding_action_entry_ref: refFor(receiverCurrentEntry),
    connection_outstanding_action_entry_hash: receiverCurrentEntry.entry_hash
  });
  const receiverWrongConnectionState = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...receiverWrongConnectionStateSeed,
    outstanding_stream_key: receiverOutstandingStreamKey(receiverWrongConnectionStateSeed)
  });
  const wrongConnectionStateContext = {
    ...removalContext,
    objectResolver: new Map([
      ...removalContext.objectResolver,
      [refFor(receiverActionState).object_hash, receiverActionState],
      [refFor(receiverCurrentEntry).object_hash, receiverCurrentEntry]
    ])
  };
  assert.ok(validateReceiverOutstandingStreamEntry(receiverWrongConnectionState, wrongConnectionStateContext)
    .includes("receiver_outstanding_entry_connection_state_mismatch"));
  const receiverStream = {
    schema: "cairn.receiver_event_stream_state_head.v0.1",
    receiver_event_stream_key: receiverStreamKey, receiver_id: "cairn:test:receiver",
    receiver_account_or_contract_scope: "cairn:test:receiver-scope",
    operation_kind: "cairn:test:operation",
    action_ref: refFor(action), effect_id: action.effect_id,
    precommitted_client_reference: receiverEntryBefore.precommitted_client_reference,
    finality_transition_profile_ref: finalityProfileRef,
    finality_transition_profile_hash: finalityProfileRef.object_hash,
    sequence: 0, previous_state_hash: null,
    head_hash: `sha-256:${"1".repeat(63)}2`
  };
  const receiverStreamRef = {
    schema: receiverStream.schema, object_id: receiverStreamKey, object_hash: receiverStream.head_hash
  };
  const reservationEmptyMap = make("cairn.enumerable_map_root.v0.1", {
    ...receiverMapAfter, revision: 40
  });
  const reservationLeafMap = make("cairn.enumerable_map_root.v0.1", {
    ...receiverMapBefore, revision: 41
  });
  const reservationSelectorBefore = {
    ...selectorBefore, sequence: 40, previous_state_hash: `sha-256:${"2".repeat(64)}`,
    outstanding_stream_map_ref: refFor(reservationEmptyMap),
    outstanding_stream_map_hash: reservationEmptyMap.map_hash,
    head_hash: `sha-256:${"2".repeat(63)}1`
  };
  const reservationSelectorAfter = {
    ...reservationSelectorBefore, sequence: 41, previous_state_hash: reservationSelectorBefore.head_hash,
    outstanding_stream_map_ref: refFor(reservationLeafMap),
    outstanding_stream_map_hash: reservationLeafMap.map_hash,
    head_hash: `sha-256:${"2".repeat(63)}2`
  };
  const reservationSelectorBeforeRef = {
    schema: reservationSelectorBefore.schema, object_id: selectorKey,
    object_hash: reservationSelectorBefore.head_hash
  };
  const reservationSelectorAfterRef = {
    schema: reservationSelectorAfter.schema, object_id: selectorKey,
    object_hash: reservationSelectorAfter.head_hash
  };
  let receiverReservationTransition = make("cairn.receiver_outstanding_stream_transition_receipt.v0.1", {
    ...receiverTransition, cause: "reservation_registered",
    epoch_selector_before_head_ref: reservationSelectorBeforeRef,
    epoch_selector_before_head_hash: reservationSelectorBeforeRef.object_hash,
    epoch_selector_after_head_ref: reservationSelectorAfterRef,
    epoch_selector_after_head_hash: reservationSelectorAfterRef.object_hash,
    outstanding_stream_map_before_ref: refFor(reservationEmptyMap),
    outstanding_stream_map_before_hash: reservationEmptyMap.map_hash,
    outstanding_stream_map_after_ref: refFor(reservationLeafMap),
    outstanding_stream_map_after_hash: reservationLeafMap.map_hash,
    before_change_proof: mapPathProof(reservationEmptyMap, receiverEmptyNode,
      receiverEntryBefore.outstanding_stream_key, "nonmembership", "empty_root"),
    after_change_proof: mapPathProof(reservationLeafMap, receiverLeaf,
      receiverEntryBefore.outstanding_stream_key, "membership"),
    entry_before_ref: null, entry_before_hash: null,
    entry_after_ref: refFor(receiverEntryBefore), entry_after_hash: receiverEntryBefore.entry_hash,
    after_current_map_membership: true,
    terminal_release_evidence_ref: null, terminal_release_evidence_hash: null,
    terminal_release_plan_core_ref: null, terminal_release_plan_core_hash: null,
    receiver_stream_transition_receipt_ref: null, receiver_stream_transition_receipt_hash: null,
    unchanged_receiver_stream_head_ref: null, unchanged_receiver_stream_head_hash: null,
    authority_transaction_id: "receiver-reservation"
  });
  const reservationAssignmentTransitions = [eventAssignmentRef, sequenceAssignmentRef].map((reference) => ({
    assignment_before_ref: null, assignment_before_hash: null,
    assignment_after_ref: reference, assignment_after_hash: reference.object_hash,
    after_map_membership: true
  }));
  const reservationIdentityTransition = {
    ...identityTransition, cause: "reserved_entry_added",
    reservation_assignment_transitions: reservationAssignmentTransitions,
    reservation_assignment_transitions_root: canonicalHash(reservationAssignmentTransitions),
    terminal_release_evidence_ref: null, terminal_release_evidence_hash: null,
    authority_transaction_id: "receiver-reservation",
    receipt_hash: `sha-256:${"2".repeat(63)}3`,
    authority_service_signature: externalSignature(`sha-256:${"2".repeat(63)}3`)
  };
  const reservationIdentityTransitionRef = {
    schema: reservationIdentityTransition.schema,
    object_id: reservationIdentityTransition.receipt_hash,
    object_hash: reservationIdentityTransition.receipt_hash
  };
  receiverReservationTransition = make("cairn.receiver_outstanding_stream_transition_receipt.v0.1", {
    ...receiverReservationTransition,
    identity_epoch_transition_receipt_ref: reservationIdentityTransitionRef,
    identity_epoch_transition_receipt_hash: reservationIdentityTransitionRef.object_hash
  });
  const reservationReceiverContext = {
    ...removalContext,
    objectResolver: new Map([
      ...removalContext.objectResolver,
      [refFor(reservationEmptyMap).object_hash, reservationEmptyMap],
      [refFor(reservationLeafMap).object_hash, reservationLeafMap],
      [reservationSelectorBeforeRef.object_hash, reservationSelectorBefore],
      [reservationSelectorAfterRef.object_hash, reservationSelectorAfter],
      [reservationIdentityTransitionRef.object_hash, reservationIdentityTransition]
    ])
  };
  assert.deepEqual(validateReceiverOutstandingStreamTransitionReceipt(
    receiverReservationTransition, reservationReceiverContext
  ), []);

  const submittedActionState = make("cairn.action_state_head.v0.1", {
    action_id: action.action_id, action_ref: refFor(action), sequence: 2,
    previous_state_hash: updatedActionState.state_hash, state: "submitted"
  });
  const handedConnectionSeed = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...updatedEntry, current_action_state_head_ref: refFor(submittedActionState),
    current_action_state_head_hash: submittedActionState.state_hash,
    receiver_event_stream_key: receiverStreamKey, sequence: updatedEntry.sequence + 1,
    previous_entry_hash: updatedEntry.entry_hash, state: "handed_off"
  });
  const handedConnectionEntry = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...handedConnectionSeed, outstanding_action_key: connectionOutstandingActionKey(handedConnectionSeed)
  });
  const handedReceiverSeed = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...receiverEntryBefore, connection_outstanding_action_key: handedConnectionEntry.outstanding_action_key,
    connection_outstanding_action_entry_ref: refFor(handedConnectionEntry),
    connection_outstanding_action_entry_hash: handedConnectionEntry.entry_hash,
    current_receiver_stream_head_ref: receiverStreamRef,
    current_receiver_stream_head_hash: receiverStreamRef.object_hash,
    sequence: 1, previous_entry_hash: receiverEntryBefore.entry_hash, state: "handed_off"
  });
  const handedReceiverEntry = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...handedReceiverSeed, outstanding_stream_key: receiverOutstandingStreamKey(handedReceiverSeed)
  });
  const handedLeafEntry = {
    entry_key: handedReceiverEntry.outstanding_stream_key, entry_kind: "receiver_outstanding_stream",
    entry_object_ref: refFor(handedReceiverEntry), entry_object_hash: handedReceiverEntry.entry_hash
  };
  const handedLeaf = make("cairn.enumerable_map_node.v0.1", {
    map_domain: "receiver_outstanding_stream", node_kind: "leaf",
    path_prefix_nibbles: handedReceiverEntry.outstanding_stream_key.slice(8), leaf_entry: handedLeafEntry,
    branch_children: [], subtree_entry_count: 1,
    entries_root: enumerableMapLeafEntriesRoot("receiver_outstanding_stream", handedLeafEntry)
  });
  const handedMap = make("cairn.enumerable_map_root.v0.1", {
    map_domain: "receiver_outstanding_stream", map_key: receiverOutstandingMapKey(selectorKey), revision: 1,
    root_node_ref: refFor(handedLeaf), root_node_hash: handedLeaf.node_hash,
    entry_count: 1, entries_root: handedLeaf.entries_root
  });
  const handoffSelectorBefore = {
    ...selectorBefore, sequence: 50, previous_state_hash: `sha-256:${"3".repeat(64)}`,
    outstanding_stream_map_ref: refFor(receiverMapBefore),
    outstanding_stream_map_hash: receiverMapBefore.map_hash,
    head_hash: `sha-256:${"3".repeat(63)}1`
  };
  const handoffSelectorAfter = {
    ...handoffSelectorBefore, sequence: 51, previous_state_hash: handoffSelectorBefore.head_hash,
    outstanding_stream_map_ref: refFor(handedMap), outstanding_stream_map_hash: handedMap.map_hash,
    head_hash: `sha-256:${"3".repeat(63)}2`
  };
  const handoffSelectorBeforeRef = {
    schema: handoffSelectorBefore.schema, object_id: selectorKey, object_hash: handoffSelectorBefore.head_hash
  };
  const handoffSelectorAfterRef = {
    schema: handoffSelectorAfter.schema, object_id: selectorKey, object_hash: handoffSelectorAfter.head_hash
  };
  const handoffTransition = make("cairn.receiver_outstanding_stream_transition_receipt.v0.1", {
    ...receiverTransition, cause: "handoff_bound",
    epoch_selector_before_head_ref: handoffSelectorBeforeRef,
    epoch_selector_before_head_hash: handoffSelectorBeforeRef.object_hash,
    epoch_selector_after_head_ref: handoffSelectorAfterRef,
    epoch_selector_after_head_hash: handoffSelectorAfterRef.object_hash,
    assigned_identity_scope_before_head_ref: identityScopeRef,
    assigned_identity_scope_before_head_hash: identityScopeRef.object_hash,
    assigned_identity_scope_after_head_ref: identityScopeRef,
    assigned_identity_scope_after_head_hash: identityScopeRef.object_hash,
    outstanding_stream_map_before_ref: refFor(receiverMapBefore),
    outstanding_stream_map_before_hash: receiverMapBefore.map_hash,
    outstanding_stream_map_after_ref: refFor(handedMap), outstanding_stream_map_after_hash: handedMap.map_hash,
    before_change_proof: mapPathProof(receiverMapBefore, receiverLeaf,
      receiverEntryBefore.outstanding_stream_key, "membership"),
    after_change_proof: mapPathProof(handedMap, handedLeaf,
      handedReceiverEntry.outstanding_stream_key, "membership"),
    entry_before_ref: refFor(receiverEntryBefore), entry_before_hash: receiverEntryBefore.entry_hash,
    entry_after_ref: refFor(handedReceiverEntry), entry_after_hash: handedReceiverEntry.entry_hash,
    after_current_map_membership: true,
    identity_epoch_transition_receipt_ref: null, identity_epoch_transition_receipt_hash: null,
    unchanged_assigned_identity_epoch_head_ref: identityScopeRef,
    unchanged_assigned_identity_epoch_head_hash: identityScopeRef.object_hash,
    terminal_release_evidence_ref: null, terminal_release_evidence_hash: null,
    terminal_release_plan_core_ref: null, terminal_release_plan_core_hash: null,
    receiver_stream_transition_receipt_ref: null, receiver_stream_transition_receipt_hash: null,
    unchanged_receiver_stream_head_ref: null, unchanged_receiver_stream_head_hash: null,
    authority_transaction_id: "receiver-handoff"
  });
  const handoffContext = {
    ...removalContext,
    externalObjectVerifier: (request) => request.expectedSchema === receiverStream.schema
      ? canonicalHash(Object.keys(request.object).sort()) === canonicalHash(Object.keys(receiverStream).sort())
      : removalContext.externalObjectVerifier(request),
    objectResolver: new Map([
      ...removalContext.objectResolver,
      ...[submittedActionState, handedConnectionEntry, handedReceiverEntry, handedLeaf, handedMap]
        .map((object) => [refFor(object).object_hash, object]),
      [receiverStreamRef.object_hash, receiverStream],
      [handoffSelectorBeforeRef.object_hash, handoffSelectorBefore],
      [handoffSelectorAfterRef.object_hash, handoffSelectorAfter]
    ])
  };
  const submittedActionStateFailures = validatePhase1Object(submittedActionState, context);
  if (submittedActionStateFailures.includes("phase1_object_schema_invalid")) {
    assert.deepEqual(
      validateReceiverOutstandingStreamTransitionReceipt(handoffTransition, handoffContext),
      ["receiver_outstanding_transition_entry_mismatch"]
    );
  } else {
  // Retain the wider receiver graph probes for a future profile that structurally reopens submission.
  assert.deepEqual(validateReceiverOutstandingStreamTransitionReceipt(handoffTransition, handoffContext), []);
  const skippedHandedConnection = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...handedConnectionEntry, sequence: handedConnectionEntry.sequence + 1,
    previous_entry_hash: updatedEntry.entry_hash
  });
  const skippedHandedReceiverSeed = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...handedReceiverEntry,
    connection_outstanding_action_entry_ref: refFor(skippedHandedConnection),
    connection_outstanding_action_entry_hash: skippedHandedConnection.entry_hash
  });
  const skippedHandedReceiver = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...skippedHandedReceiverSeed,
    outstanding_stream_key: receiverOutstandingStreamKey(skippedHandedReceiverSeed)
  });
  const skippedHandoff = make("cairn.receiver_outstanding_stream_transition_receipt.v0.1", {
    ...handoffTransition, entry_after_ref: refFor(skippedHandedReceiver),
    entry_after_hash: skippedHandedReceiver.entry_hash
  });
  const skippedHandoffContext = {
    ...handoffContext,
    objectResolver: new Map([
      ...handoffContext.objectResolver,
      [refFor(skippedHandedConnection).object_hash, skippedHandedConnection],
      [refFor(skippedHandedReceiver).object_hash, skippedHandedReceiver]
    ])
  };
  assert.ok(validateReceiverOutstandingStreamTransitionReceipt(skippedHandoff, skippedHandoffContext)
    .includes("receiver_outstanding_transition_connection_successor_mismatch"));

  const eventAssignmentConsumed = {
    ...eventAssignment, consumed_slots: 1, state: "reserved",
    assignment_hash: `sha-256:${"6".repeat(63)}2`,
    authority_service_signature: externalSignature(`sha-256:${"6".repeat(63)}2`)
  };
  const sequenceAssignmentConsumed = {
    ...sequenceAssignment, consumed_slots: 1, state: "reserved",
    assignment_hash: `sha-256:${"6".repeat(63)}3`,
    authority_service_signature: externalSignature(`sha-256:${"6".repeat(63)}3`)
  };
  const eventAssignmentConsumedRef = {
    schema: eventAssignmentConsumed.schema, object_id: eventAssignmentConsumed.slot_assignment_id,
    object_hash: eventAssignmentConsumed.assignment_hash
  };
  const sequenceAssignmentConsumedRef = {
    schema: sequenceAssignmentConsumed.schema, object_id: sequenceAssignmentConsumed.slot_assignment_id,
    object_hash: sequenceAssignmentConsumed.assignment_hash
  };
  const receiverStreamSuccessor = {
    ...receiverStream, sequence: 1, previous_state_hash: receiverStream.head_hash,
    head_hash: `sha-256:${"6".repeat(63)}1`
  };
  const receiverStreamSuccessorRef = {
    schema: receiverStreamSuccessor.schema, object_id: receiverStreamKey,
    object_hash: receiverStreamSuccessor.head_hash
  };
  const eventReceiverEntry = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...handedReceiverEntry, sequence: 2, previous_entry_hash: handedReceiverEntry.entry_hash,
    event_id_slot_assignment_ref: eventAssignmentConsumedRef,
    event_id_slot_assignment_hash: eventAssignmentConsumedRef.object_hash,
    sequence_slot_assignment_ref: sequenceAssignmentConsumedRef,
    sequence_slot_assignment_hash: sequenceAssignmentConsumedRef.object_hash,
    current_receiver_stream_head_ref: receiverStreamSuccessorRef,
    current_receiver_stream_head_hash: receiverStreamSuccessorRef.object_hash
  });
  const eventLeafEntry = {
    entry_key: eventReceiverEntry.outstanding_stream_key, entry_kind: "receiver_outstanding_stream",
    entry_object_ref: refFor(eventReceiverEntry), entry_object_hash: eventReceiverEntry.entry_hash
  };
  const eventLeaf = make("cairn.enumerable_map_node.v0.1", {
    ...handedLeaf, leaf_entry: eventLeafEntry,
    entries_root: enumerableMapLeafEntriesRoot("receiver_outstanding_stream", eventLeafEntry)
  });
  const eventMap = make("cairn.enumerable_map_root.v0.1", {
    ...handedMap, revision: 2, root_node_ref: refFor(eventLeaf), root_node_hash: eventLeaf.node_hash,
    entries_root: eventLeaf.entries_root
  });
  const eventSelectorAfter = {
    ...handoffSelectorAfter, sequence: 52, previous_state_hash: handoffSelectorAfter.head_hash,
    outstanding_stream_map_ref: refFor(eventMap), outstanding_stream_map_hash: eventMap.map_hash,
    head_hash: `sha-256:${"3".repeat(63)}4`
  };
  const eventSelectorAfterRef = {
    schema: eventSelectorAfter.schema, object_id: selectorKey, object_hash: eventSelectorAfter.head_hash
  };
  const eventBindingReceipt = {
    schema: "cairn.receiver_event_identity_binding_receipt.v0.1",
    binding_core_ref: distinctRefs(1, "receiver-event-binding-core")[0],
    binding_core_hash: null,
    identity_scope_index_before_head_ref: identityScopeRef,
    identity_scope_index_before_head_hash: identityScopeRef.object_hash,
    identity_scope_index_after_head_ref: identityScopeAfterRef,
    identity_scope_index_after_head_hash: identityScopeAfterRef.object_hash,
    identity_epoch_directory_before_head_ref: identityScope.index_epoch_directory_head_ref,
    identity_epoch_directory_before_head_hash: identityScope.index_epoch_directory_head_hash,
    identity_epoch_directory_after_head_ref: identityScopeAfter.index_epoch_directory_head_ref,
    identity_epoch_directory_after_head_hash: identityScopeAfter.index_epoch_directory_head_hash,
    assigned_identity_epoch_before_head_ref: identityScope.accepting_index_epoch_state_head_ref,
    assigned_identity_epoch_before_head_hash: identityScope.accepting_index_epoch_state_head_hash,
    assigned_identity_epoch_after_head_ref: identityScopeAfter.accepting_index_epoch_state_head_ref,
    assigned_identity_epoch_after_head_hash: identityScopeAfter.accepting_index_epoch_state_head_hash,
    event_id_slot_assignment_before_ref: eventAssignmentRef,
    event_id_slot_assignment_before_hash: eventAssignmentRef.object_hash,
    event_id_slot_assignment_after_ref: eventAssignmentConsumedRef,
    event_id_slot_assignment_after_hash: eventAssignmentConsumedRef.object_hash,
    sequence_slot_assignment_before_ref: sequenceAssignmentRef,
    sequence_slot_assignment_before_hash: sequenceAssignmentRef.object_hash,
    sequence_slot_assignment_after_ref: sequenceAssignmentConsumedRef,
    sequence_slot_assignment_after_hash: sequenceAssignmentConsumedRef.object_hash,
    event_id_identity_head_ref: distinctRefs(1, "event-identity-head")[0],
    event_id_identity_head_hash: null,
    provider_sequence_identity_head_ref: distinctRefs(1, "sequence-identity-head")[0],
    provider_sequence_identity_head_hash: null,
    identity_manifests_before_root: `sha-256:${"6".repeat(63)}4`,
    identity_manifests_after_root: `sha-256:${"6".repeat(63)}5`,
    authority_transaction_id: "receiver-event", committed_at: drainedIndex.updated_at,
    receipt_hash: `sha-256:${"6".repeat(63)}6`,
    authority_service_signature: externalSignature(`sha-256:${"6".repeat(63)}6`)
  };
  eventBindingReceipt.binding_core_hash = eventBindingReceipt.binding_core_ref.object_hash;
  eventBindingReceipt.event_id_identity_head_hash = eventBindingReceipt.event_id_identity_head_ref.object_hash;
  eventBindingReceipt.provider_sequence_identity_head_hash =
    eventBindingReceipt.provider_sequence_identity_head_ref.object_hash;
  const eventBindingReceiptRef = {
    schema: eventBindingReceipt.schema, object_id: eventBindingReceipt.receipt_hash,
    object_hash: eventBindingReceipt.receipt_hash
  };
  const eventTransition = make("cairn.receiver_outstanding_stream_transition_receipt.v0.1", {
    ...handoffTransition, cause: "authenticated_event_observed",
    epoch_selector_before_head_ref: handoffSelectorAfterRef,
    epoch_selector_before_head_hash: handoffSelectorAfterRef.object_hash,
    epoch_selector_after_head_ref: eventSelectorAfterRef,
    epoch_selector_after_head_hash: eventSelectorAfterRef.object_hash,
    assigned_identity_scope_before_head_ref: identityScopeRef,
    assigned_identity_scope_before_head_hash: identityScopeRef.object_hash,
    assigned_identity_scope_after_head_ref: identityScopeAfterRef,
    assigned_identity_scope_after_head_hash: identityScopeAfterRef.object_hash,
    outstanding_stream_map_before_ref: refFor(handedMap), outstanding_stream_map_before_hash: handedMap.map_hash,
    outstanding_stream_map_after_ref: refFor(eventMap), outstanding_stream_map_after_hash: eventMap.map_hash,
    before_change_proof: mapPathProof(handedMap, handedLeaf,
      handedReceiverEntry.outstanding_stream_key, "membership"),
    after_change_proof: mapPathProof(eventMap, eventLeaf,
      eventReceiverEntry.outstanding_stream_key, "membership"),
    entry_before_ref: refFor(handedReceiverEntry), entry_before_hash: handedReceiverEntry.entry_hash,
    entry_after_ref: refFor(eventReceiverEntry), entry_after_hash: eventReceiverEntry.entry_hash,
    identity_epoch_transition_receipt_ref: eventBindingReceiptRef,
    identity_epoch_transition_receipt_hash: eventBindingReceiptRef.object_hash,
    unchanged_assigned_identity_epoch_head_ref: null, unchanged_assigned_identity_epoch_head_hash: null,
    authority_transaction_id: "receiver-event"
  });
  const eventContext = {
    ...handoffContext,
    externalObjectVerifier: (request) => request.expectedSchema === eventBindingReceipt.schema
      ? canonicalHash(Object.keys(request.object).sort()) === canonicalHash(Object.keys(eventBindingReceipt).sort())
      : handoffContext.externalObjectVerifier(request),
    objectResolver: new Map([
      ...handoffContext.objectResolver,
      ...[eventReceiverEntry, eventLeaf, eventMap].map((object) => [refFor(object).object_hash, object]),
      [receiverStreamSuccessorRef.object_hash, receiverStreamSuccessor],
      [eventSelectorAfterRef.object_hash, eventSelectorAfter],
      [eventAssignmentConsumedRef.object_hash, eventAssignmentConsumed],
      [sequenceAssignmentConsumedRef.object_hash, sequenceAssignmentConsumed],
      [eventBindingReceiptRef.object_hash, eventBindingReceipt]
    ])
  };
  assert.deepEqual(validateReceiverOutstandingStreamTransitionReceipt(eventTransition, eventContext), []);
  const acceptingEpochOneRef = {
    schema: "cairn.bounded_index_epoch_state_head.v0.1",
    object_id: `${identityScopeKey}:1`, object_hash: `sha-256:${"8".repeat(63)}1`
  };
  const drainingScopeBefore = {
    ...identityScope, sequence: 10, previous_state_hash: `sha-256:${"8".repeat(63)}0`,
    accepting_index_epoch: 1, accepting_index_epoch_state_head_ref: acceptingEpochOneRef,
    accepting_index_epoch_state_head_hash: acceptingEpochOneRef.object_hash,
    head_hash: `sha-256:${"8".repeat(63)}2`,
    authority_service_signature: externalSignature(`sha-256:${"8".repeat(63)}2`)
  };
  const drainingScopeAfter = {
    ...drainingScopeBefore, sequence: 11, previous_state_hash: drainingScopeBefore.head_hash,
    head_hash: `sha-256:${"8".repeat(63)}3`,
    authority_service_signature: externalSignature(`sha-256:${"8".repeat(63)}3`)
  };
  const drainingScopeBeforeRef = {
    schema: drainingScopeBefore.schema, object_id: identityScopeKey,
    object_hash: drainingScopeBefore.head_hash
  };
  const drainingScopeAfterRef = {
    schema: drainingScopeAfter.schema, object_id: identityScopeKey,
    object_hash: drainingScopeAfter.head_hash
  };
  const drainingEpochBefore = {
    ...assignedEpochBefore, state: "draining", sequence: 7,
    previous_state_hash: `sha-256:${"8".repeat(63)}4`,
    head_hash: `sha-256:${"8".repeat(63)}5`,
    authority_service_signature: externalSignature(`sha-256:${"8".repeat(63)}5`)
  };
  const drainingEpochAfter = {
    ...drainingEpochBefore, sequence: 8, previous_state_hash: drainingEpochBefore.head_hash,
    head_hash: `sha-256:${"8".repeat(63)}6`,
    authority_service_signature: externalSignature(`sha-256:${"8".repeat(63)}6`)
  };
  const drainingEpochBeforeRef = {
    schema: drainingEpochBefore.schema, object_id: `${identityScopeKey}:0`,
    object_hash: drainingEpochBefore.head_hash
  };
  const drainingEpochAfterRef = {
    schema: drainingEpochAfter.schema, object_id: `${identityScopeKey}:0`,
    object_hash: drainingEpochAfter.head_hash
  };
  const drainingEventBindingReceipt = {
    ...eventBindingReceipt,
    identity_scope_index_before_head_ref: drainingScopeBeforeRef,
    identity_scope_index_before_head_hash: drainingScopeBeforeRef.object_hash,
    identity_scope_index_after_head_ref: drainingScopeAfterRef,
    identity_scope_index_after_head_hash: drainingScopeAfterRef.object_hash,
    assigned_identity_epoch_before_head_ref: drainingEpochBeforeRef,
    assigned_identity_epoch_before_head_hash: drainingEpochBeforeRef.object_hash,
    assigned_identity_epoch_after_head_ref: drainingEpochAfterRef,
    assigned_identity_epoch_after_head_hash: drainingEpochAfterRef.object_hash,
    receipt_hash: `sha-256:${"8".repeat(63)}7`,
    authority_service_signature: externalSignature(`sha-256:${"8".repeat(63)}7`)
  };
  const drainingEventBindingReceiptRef = {
    schema: drainingEventBindingReceipt.schema,
    object_id: drainingEventBindingReceipt.receipt_hash,
    object_hash: drainingEventBindingReceipt.receipt_hash
  };
  const drainingEventTransition = make("cairn.receiver_outstanding_stream_transition_receipt.v0.1", {
    ...eventTransition,
    assigned_identity_scope_before_head_ref: drainingScopeBeforeRef,
    assigned_identity_scope_before_head_hash: drainingScopeBeforeRef.object_hash,
    assigned_identity_scope_after_head_ref: drainingScopeAfterRef,
    assigned_identity_scope_after_head_hash: drainingScopeAfterRef.object_hash,
    identity_epoch_transition_receipt_ref: drainingEventBindingReceiptRef,
    identity_epoch_transition_receipt_hash: drainingEventBindingReceiptRef.object_hash
  });
  const drainingEventContext = {
    ...eventContext,
    objectResolver: new Map(eventContext.objectResolver)
      .set(drainingScopeBeforeRef.object_hash, drainingScopeBefore)
      .set(drainingScopeAfterRef.object_hash, drainingScopeAfter)
      .set(drainingEpochBeforeRef.object_hash, drainingEpochBefore)
      .set(drainingEpochAfterRef.object_hash, drainingEpochAfter)
      .set(drainingEventBindingReceiptRef.object_hash, drainingEventBindingReceipt)
  };
  assert.deepEqual(validateReceiverOutstandingStreamTransitionReceipt(
    drainingEventTransition, drainingEventContext
  ), []);
  const migratedDrainingEpochAfter = {
    ...drainingEpochAfter, epoch: 1,
    head_hash: `sha-256:${"8".repeat(63)}8`,
    authority_service_signature: externalSignature(`sha-256:${"8".repeat(63)}8`)
  };
  const migratedDrainingEpochAfterRef = {
    schema: migratedDrainingEpochAfter.schema, object_id: `${identityScopeKey}:1`,
    object_hash: migratedDrainingEpochAfter.head_hash
  };
  const migratedDrainingReceipt = {
    ...drainingEventBindingReceipt,
    assigned_identity_epoch_after_head_ref: migratedDrainingEpochAfterRef,
    assigned_identity_epoch_after_head_hash: migratedDrainingEpochAfterRef.object_hash,
    receipt_hash: `sha-256:${"8".repeat(63)}9`,
    authority_service_signature: externalSignature(`sha-256:${"8".repeat(63)}9`)
  };
  const migratedDrainingReceiptRef = {
    schema: migratedDrainingReceipt.schema, object_id: migratedDrainingReceipt.receipt_hash,
    object_hash: migratedDrainingReceipt.receipt_hash
  };
  const migratedDrainingTransition = make("cairn.receiver_outstanding_stream_transition_receipt.v0.1", {
    ...drainingEventTransition,
    identity_epoch_transition_receipt_ref: migratedDrainingReceiptRef,
    identity_epoch_transition_receipt_hash: migratedDrainingReceiptRef.object_hash
  });
  const migratedDrainingContext = {
    ...drainingEventContext,
    objectResolver: new Map(drainingEventContext.objectResolver)
      .set(migratedDrainingEpochAfterRef.object_hash, migratedDrainingEpochAfter)
      .set(migratedDrainingReceiptRef.object_hash, migratedDrainingReceipt)
  };
  assert.ok(validateReceiverOutstandingStreamTransitionReceipt(
    migratedDrainingTransition, migratedDrainingContext
  ).includes("receiver_outstanding_transition_identity_transition_mismatch"));
  const staleSuccessorEntry = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...eventReceiverEntry,
    event_id_slot_assignment_ref: eventAssignmentRef,
    event_id_slot_assignment_hash: eventAssignmentRef.object_hash,
    sequence_slot_assignment_ref: sequenceAssignmentRef,
    sequence_slot_assignment_hash: sequenceAssignmentRef.object_hash
  });
  const staleSuccessorLeafEntry = {
    entry_key: staleSuccessorEntry.outstanding_stream_key, entry_kind: "receiver_outstanding_stream",
    entry_object_ref: refFor(staleSuccessorEntry), entry_object_hash: staleSuccessorEntry.entry_hash
  };
  const staleSuccessorLeaf = make("cairn.enumerable_map_node.v0.1", {
    ...eventLeaf, leaf_entry: staleSuccessorLeafEntry,
    entries_root: enumerableMapLeafEntriesRoot("receiver_outstanding_stream", staleSuccessorLeafEntry)
  });
  const staleSuccessorMap = make("cairn.enumerable_map_root.v0.1", {
    ...eventMap, root_node_ref: refFor(staleSuccessorLeaf), root_node_hash: staleSuccessorLeaf.node_hash,
    entries_root: staleSuccessorLeaf.entries_root
  });
  const staleSuccessorSelector = {
    ...eventSelectorAfter, outstanding_stream_map_ref: refFor(staleSuccessorMap),
    outstanding_stream_map_hash: staleSuccessorMap.map_hash,
    head_hash: `sha-256:${"6".repeat(63)}4`
  };
  const staleSuccessorSelectorRef = {
    schema: staleSuccessorSelector.schema, object_id: selectorKey,
    object_hash: staleSuccessorSelector.head_hash
  };
  const staleSuccessorTransition = make("cairn.receiver_outstanding_stream_transition_receipt.v0.1", {
    ...eventTransition,
    epoch_selector_after_head_ref: staleSuccessorSelectorRef,
    epoch_selector_after_head_hash: staleSuccessorSelectorRef.object_hash,
    outstanding_stream_map_after_ref: refFor(staleSuccessorMap),
    outstanding_stream_map_after_hash: staleSuccessorMap.map_hash,
    after_change_proof: mapPathProof(staleSuccessorMap, staleSuccessorLeaf,
      staleSuccessorEntry.outstanding_stream_key, "membership"),
    entry_after_ref: refFor(staleSuccessorEntry), entry_after_hash: staleSuccessorEntry.entry_hash
  });
  const staleSuccessorContext = {
    ...eventContext,
    objectResolver: new Map(eventContext.objectResolver)
      .set(refFor(staleSuccessorEntry).object_hash, staleSuccessorEntry)
      .set(refFor(staleSuccessorLeaf).object_hash, staleSuccessorLeaf)
      .set(refFor(staleSuccessorMap).object_hash, staleSuccessorMap)
      .set(staleSuccessorSelectorRef.object_hash, staleSuccessorSelector)
  };
  assert.ok(validateReceiverOutstandingStreamTransitionReceipt(
    staleSuccessorTransition, staleSuccessorContext
  ).includes("receiver_outstanding_transition_identity_transition_mismatch"));
  const wrongEpochAssignment = { ...eventAssignment, epoch: eventAssignment.epoch + 1 };
  const wrongEpochContext = {
    ...eventContext,
    objectResolver: new Map(eventContext.objectResolver)
      .set(eventAssignmentRef.object_hash, wrongEpochAssignment)
  };
  assert.ok(validateReceiverOutstandingStreamTransitionReceipt(eventTransition, wrongEpochContext)
    .includes("receiver_outstanding_transition_entry_mismatch"));
  const prematurelyConsumedAssignment = { ...eventAssignmentConsumed, state: "fully_consumed" };
  const prematurelyConsumedContext = {
    ...eventContext,
    objectResolver: new Map(eventContext.objectResolver)
      .set(eventAssignmentConsumedRef.object_hash, prematurelyConsumedAssignment)
  };
  assert.ok(validateReceiverOutstandingStreamTransitionReceipt(eventTransition, prematurelyConsumedContext)
    .includes("receiver_outstanding_transition_entry_mismatch"));
  const wrongScopeBindingReceipt = {
    ...eventBindingReceipt,
    identity_scope_index_after_head_ref: identityScopeRef,
    identity_scope_index_after_head_hash: identityScopeRef.object_hash
  };
  const wrongScopeBindingContext = {
    ...eventContext,
    objectResolver: new Map(eventContext.objectResolver)
      .set(eventBindingReceiptRef.object_hash, wrongScopeBindingReceipt)
  };
  assert.ok(validateReceiverOutstandingStreamTransitionReceipt(eventTransition, wrongScopeBindingContext)
    .includes("receiver_outstanding_transition_identity_transition_mismatch"));
  const wrongReceiptFamily = {
    ...eventBindingReceipt, schema: "cairn.bounded_index_epoch_transition_receipt.v0.1"
  };
  const wrongReceiptFamilyContext = {
    ...eventContext,
    objectResolver: new Map(eventContext.objectResolver)
      .set(eventBindingReceiptRef.object_hash, wrongReceiptFamily)
  };
  assert.ok(validateReceiverOutstandingStreamTransitionReceipt(eventTransition, wrongReceiptFamilyContext)
    .includes("receiver_outstanding_transition_identity_transition_mismatch"));
  const skippedStreamSuccessor = { ...receiverStreamSuccessor, sequence: 2 };
  const skippedStreamContext = {
    ...eventContext,
    objectResolver: new Map(eventContext.objectResolver)
      .set(receiverStreamSuccessorRef.object_hash, skippedStreamSuccessor)
  };
  assert.ok(validateReceiverOutstandingStreamTransitionReceipt(eventTransition, skippedStreamContext)
    .includes("receiver_outstanding_transition_event_stream_successor_mismatch"));
  const unlinkedStreamSuccessor = {
    ...receiverStreamSuccessor, previous_state_hash: `sha-256:${"7".repeat(64)}`
  };
  const unlinkedStreamContext = {
    ...eventContext,
    objectResolver: new Map(eventContext.objectResolver)
      .set(receiverStreamSuccessorRef.object_hash, unlinkedStreamSuccessor)
  };
  assert.ok(validateReceiverOutstandingStreamTransitionReceipt(eventTransition, unlinkedStreamContext)
    .includes("receiver_outstanding_transition_event_stream_successor_mismatch"));

  const terminalReceiverFixture = (cause, discriminator) => {
    const terminalEvidence = cause === "authenticated_stream_closed" ? {
      schema: "cairn.receiver_event_stream_transition_receipt.v0.1",
      receiver_event_stream_key: receiverStreamKey,
      authority_transaction_id: `${cause}-transaction`,
      committed_at: "2026-07-22T10:00:00Z",
      receipt_hash: `sha-256:${discriminator.repeat(64)}`
    } : {
      schema: "cairn.authenticated_irreversible_horizon_receipt.v0.1",
      action_ref: refFor(action), effect_id: action.effect_id,
      lineage_id: lineage.principal_authorized_lineage_id,
      receiver_finality_profile_ref: finalityProfileRef,
      receiver_finality_profile_hash: finalityProfileRef.object_hash,
      receipt_hash: `sha-256:${discriminator.repeat(64)}`
    };
    const terminalEvidenceRef = {
      schema: terminalEvidence.schema,
      object_id: cause === "authenticated_stream_closed" ? receiverStreamKey : terminalEvidence.receipt_hash,
      object_hash: terminalEvidence.receipt_hash
    };
    const beforeSeed = make("cairn.receiver_outstanding_stream_entry.v0.1", {
      ...receiverEntryBefore, connection_outstanding_action_key: receiverCurrentEntry.outstanding_action_key,
      connection_outstanding_action_entry_ref: refFor(receiverCurrentEntry),
      connection_outstanding_action_entry_hash: receiverCurrentEntry.entry_hash,
      sequence: 0, previous_entry_hash: null, state: "handed_off",
      current_receiver_stream_head_ref: receiverStreamRef,
      current_receiver_stream_head_hash: receiverStreamRef.object_hash
    });
    const receiverBefore = make("cairn.receiver_outstanding_stream_entry.v0.1", {
      ...beforeSeed, outstanding_stream_key: receiverOutstandingStreamKey(beforeSeed)
    });
    let receiverAfter;
    const receiverLeafValue = {
      entry_key: receiverBefore.outstanding_stream_key, entry_kind: "receiver_outstanding_stream",
      entry_object_ref: refFor(receiverBefore), entry_object_hash: receiverBefore.entry_hash
    };
    const receiverBeforeNode = make("cairn.enumerable_map_node.v0.1", {
      map_domain: "receiver_outstanding_stream", node_kind: "leaf",
      path_prefix_nibbles: receiverBefore.outstanding_stream_key.slice(8), leaf_entry: receiverLeafValue,
      branch_children: [], subtree_entry_count: 1,
      entries_root: enumerableMapLeafEntriesRoot("receiver_outstanding_stream", receiverLeafValue)
    });
    const receiverBeforeMap = make("cairn.enumerable_map_root.v0.1", {
      map_domain: "receiver_outstanding_stream", map_key: receiverOutstandingMapKey(selectorKey), revision: 20,
      root_node_ref: refFor(receiverBeforeNode), root_node_hash: receiverBeforeNode.node_hash,
      entry_count: 1, entries_root: receiverBeforeNode.entries_root
    });
    const receiverAfterMap = make("cairn.enumerable_map_root.v0.1", {
      map_domain: "receiver_outstanding_stream", map_key: receiverOutstandingMapKey(selectorKey), revision: 21,
      root_node_ref: refFor(receiverEmptyNode), root_node_hash: receiverEmptyNode.node_hash,
      entry_count: 0, entries_root: receiverEmptyNode.entries_root
    });
    const selectorBeforeObject = {
      ...selectorBefore, sequence: 20, previous_state_hash: `sha-256:${"2".repeat(64)}`,
      outstanding_stream_map_ref: refFor(receiverBeforeMap), outstanding_stream_map_hash: receiverBeforeMap.map_hash,
      head_hash: `sha-256:${discriminator.repeat(63)}1`
    };
    const selectorAfterObject = {
      ...selectorBeforeObject, sequence: 21, previous_state_hash: selectorBeforeObject.head_hash,
      outstanding_stream_map_ref: refFor(receiverAfterMap), outstanding_stream_map_hash: receiverAfterMap.map_hash,
      head_hash: `sha-256:${discriminator.repeat(63)}2`
    };
    const selectorBeforeObjectRef = {
      schema: selectorBeforeObject.schema, object_id: selectorKey, object_hash: selectorBeforeObject.head_hash
    };
    const selectorAfterObjectRef = {
      schema: selectorAfterObject.schema, object_id: selectorKey, object_hash: selectorAfterObject.head_hash
    };
    const planSeed = make("cairn.receiver_terminal_release_plan_core.v0.1", {
      ...releasePlanSeed, release_cause: cause, terminal_release_evidence_ref: terminalEvidenceRef,
      terminal_release_evidence_hash: terminalEvidenceRef.object_hash,
      receiver_outstanding_stream_entry_ref: refFor(receiverBefore),
      receiver_outstanding_stream_entry_hash: receiverBefore.entry_hash,
      receiver_stream_before_head_ref: receiverStreamRef,
      receiver_stream_before_head_hash: receiverStreamRef.object_hash,
      connection_outstanding_action_entry_ref: refFor(receiverCurrentEntry),
      connection_outstanding_action_entry_hash: receiverCurrentEntry.entry_hash,
      authority_transaction_id: `${cause}-transaction`
    });
    const plan = make("cairn.receiver_terminal_release_plan_core.v0.1", {
      ...planSeed, terminal_release_plan_key: receiverTerminalReleasePlanKey(planSeed, receiverBefore),
      expected_transition_kind_set_root: receiverTerminalTransitionKindSetRoot(planSeed, receiverBefore)
    });
    const terminalAssignmentState = cause === "authenticated_stream_closed"
      ? "released_on_authenticated_closure" : "released_on_authenticated_horizon";
    const terminalEventAssignmentAfter = releasedAssignment(
      { ...eventAssignment, consumed_slots: cause === "authenticated_stream_closed" ? 1 : 0 },
      terminalAssignmentState, `sha-256:${discriminator.repeat(62)}a3`
    );
    const terminalSequenceAssignmentAfter = releasedAssignment(
      { ...sequenceAssignment, consumed_slots: cause === "authenticated_stream_closed" ? 1 : 0 },
      terminalAssignmentState, `sha-256:${discriminator.repeat(62)}b4`
    );
    const terminalEventAssignmentAfterRef = {
      schema: terminalEventAssignmentAfter.schema, object_id: terminalEventAssignmentAfter.slot_assignment_id,
      object_hash: terminalEventAssignmentAfter.assignment_hash
    };
    const terminalSequenceAssignmentAfterRef = {
      schema: terminalSequenceAssignmentAfter.schema, object_id: terminalSequenceAssignmentAfter.slot_assignment_id,
      object_hash: terminalSequenceAssignmentAfter.assignment_hash
    };
    receiverAfter = make("cairn.receiver_outstanding_stream_entry.v0.1", {
      ...receiverBefore, sequence: 1, previous_entry_hash: receiverBefore.entry_hash,
      event_id_slot_assignment_ref: terminalEventAssignmentAfterRef,
      event_id_slot_assignment_hash: terminalEventAssignmentAfterRef.object_hash,
      sequence_slot_assignment_ref: terminalSequenceAssignmentAfterRef,
      sequence_slot_assignment_hash: terminalSequenceAssignmentAfterRef.object_hash,
      state: cause
    });
    const terminalAssignmentTransitions = [
      [eventAssignmentRef, terminalEventAssignmentAfterRef],
      [sequenceAssignmentRef, terminalSequenceAssignmentAfterRef]
    ].map(([beforeRef, afterRef]) => ({
      assignment_before_ref: beforeRef, assignment_before_hash: beforeRef.object_hash,
      assignment_after_ref: afterRef, assignment_after_hash: afterRef.object_hash,
      after_map_membership: false
    }));
    const terminalIdentityTransition = {
      ...identityTransition,
      cause: cause === "authenticated_stream_closed"
        ? "authenticated_stream_closure_release" : "authenticated_irreversible_horizon_release",
      reservation_assignment_transitions: terminalAssignmentTransitions,
      reservation_assignment_transitions_root: canonicalHash(terminalAssignmentTransitions),
      terminal_release_evidence_ref: terminalEvidenceRef,
      terminal_release_evidence_hash: terminalEvidenceRef.object_hash,
      authority_transaction_id: `${cause}-transaction`,
      receipt_hash: `sha-256:${discriminator.repeat(62)}c5`,
      authority_service_signature: externalSignature(`sha-256:${discriminator.repeat(62)}c5`)
    };
    const terminalIdentityTransitionRef = {
      schema: terminalIdentityTransition.schema, object_id: terminalIdentityTransition.receipt_hash,
      object_hash: terminalIdentityTransition.receipt_hash
    };
    const transition = make("cairn.receiver_outstanding_stream_transition_receipt.v0.1", {
      ...receiverTransition, outstanding_stream_key: receiverBefore.outstanding_stream_key, cause,
      epoch_selector_before_head_ref: selectorBeforeObjectRef,
      epoch_selector_before_head_hash: selectorBeforeObjectRef.object_hash,
      epoch_selector_after_head_ref: selectorAfterObjectRef,
      epoch_selector_after_head_hash: selectorAfterObjectRef.object_hash,
      outstanding_stream_map_before_ref: refFor(receiverBeforeMap),
      outstanding_stream_map_before_hash: receiverBeforeMap.map_hash,
      outstanding_stream_map_after_ref: refFor(receiverAfterMap),
      outstanding_stream_map_after_hash: receiverAfterMap.map_hash,
      before_change_proof: mapPathProof(receiverBeforeMap, receiverBeforeNode,
        receiverBefore.outstanding_stream_key, "membership"),
      after_change_proof: mapPathProof(receiverAfterMap, receiverEmptyNode,
        receiverBefore.outstanding_stream_key, "nonmembership", "empty_root"),
      entry_before_ref: refFor(receiverBefore), entry_before_hash: receiverBefore.entry_hash,
      entry_after_ref: refFor(receiverAfter), entry_after_hash: receiverAfter.entry_hash,
      identity_epoch_transition_receipt_ref: terminalIdentityTransitionRef,
      identity_epoch_transition_receipt_hash: terminalIdentityTransitionRef.object_hash,
      terminal_release_evidence_ref: terminalEvidenceRef,
      terminal_release_evidence_hash: terminalEvidenceRef.object_hash,
      terminal_release_plan_core_ref: refFor(plan), terminal_release_plan_core_hash: plan.plan_hash,
      receiver_stream_transition_receipt_ref: cause === "authenticated_stream_closed" ? terminalEvidenceRef : null,
      receiver_stream_transition_receipt_hash: cause === "authenticated_stream_closed" ? terminalEvidenceRef.object_hash : null,
      unchanged_receiver_stream_head_ref: cause === "authenticated_irreversible_horizon" ? receiverStreamRef : null,
      unchanged_receiver_stream_head_hash: cause === "authenticated_irreversible_horizon" ? receiverStreamRef.object_hash : null,
      authority_transaction_id: `${cause}-transaction`
    });
    const connectionLeafValue = {
      entry_key: receiverCurrentEntry.outstanding_action_key, entry_kind: "connection_outstanding_action",
      entry_object_ref: refFor(receiverCurrentEntry), entry_object_hash: receiverCurrentEntry.entry_hash
    };
    const connectionNode = make("cairn.enumerable_map_node.v0.1", {
      node_kind: "leaf", path_prefix_nibbles: receiverCurrentEntry.outstanding_action_key.slice(8),
      leaf_entry: connectionLeafValue, branch_children: [], subtree_entry_count: 1,
      entries_root: enumerableMapLeafEntriesRoot("connection_outstanding_action", connectionLeafValue)
    });
    const connectionMapBefore = make("cairn.enumerable_map_root.v0.1", {
      map_key: connectionOutstandingMapKey(indexKey), revision: 30,
      root_node_ref: refFor(connectionNode), root_node_hash: connectionNode.node_hash,
      entry_count: 1, entries_root: connectionNode.entries_root
    });
    const connectionMapAfter = make("cairn.enumerable_map_root.v0.1", {
      ...emptyMap, revision: 31
    });
    const connectionIndexBefore = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
      ...updatedIndex, sequence: 30, previous_state_hash: `sha-256:${"3".repeat(64)}`,
      outstanding_action_map_ref: refFor(connectionMapBefore), outstanding_action_map_hash: connectionMapBefore.map_hash,
      outstanding_action_count: 1, outstanding_action_root: connectionMapBefore.entries_root
    });
    const connectionIndexAfter = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
      ...connectionIndexBefore, sequence: 31, previous_state_hash: connectionIndexBefore.head_hash,
      outstanding_action_map_ref: refFor(connectionMapAfter), outstanding_action_map_hash: connectionMapAfter.map_hash,
      outstanding_action_count: 0, outstanding_action_root: connectionMapAfter.entries_root
    });
    const connectionCause = cause === "authenticated_stream_closed"
      ? "authenticated_stream_closed_removed" : "authenticated_irreversible_horizon_removed";
    const connectionReceipt = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
      ...removalReceipt, cause: connectionCause,
      before_head_ref: refFor(connectionIndexBefore), before_head_hash: connectionIndexBefore.head_hash,
      after_head_ref: refFor(connectionIndexAfter), after_head_hash: connectionIndexAfter.head_hash,
      before_action_map_ref: refFor(connectionMapBefore), before_action_map_hash: connectionMapBefore.map_hash,
      after_action_map_ref: refFor(connectionMapAfter), after_action_map_hash: connectionMapAfter.map_hash,
      changed_action_key: receiverCurrentEntry.outstanding_action_key,
      changed_entry_before_ref: refFor(receiverCurrentEntry), changed_entry_before_hash: receiverCurrentEntry.entry_hash,
      before_change_proof: mapPathProof(connectionMapBefore, connectionNode,
        receiverCurrentEntry.outstanding_action_key, "membership"),
      after_change_proof: mapPathProof(connectionMapAfter, emptyNode,
        receiverCurrentEntry.outstanding_action_key, "nonmembership", "empty_root"),
      terminal_evidence_ref: refFor(transition), terminal_evidence_hash: transition.receipt_hash,
      authority_transaction_id: `${cause}-transaction`, committed_at: connectionIndexAfter.updated_at
    });
    const allObjects = [receiverActionState, receiverCurrentEntry, receiverBefore, receiverAfter,
      receiverBeforeNode, receiverBeforeMap, receiverAfterMap, plan, transition, connectionNode,
      connectionMapBefore, connectionMapAfter, connectionIndexBefore, connectionIndexAfter, connectionReceipt];
    const externalObjects = [receiverStream, terminalEvidence, selectorBeforeObject, selectorAfterObject,
      terminalEventAssignmentAfter, terminalSequenceAssignmentAfter, terminalIdentityTransition];
    const fixtureContext = {
      ...removalContext,
      externalObjectVerifier: (request) => {
        const exemplar = new Map([
          [receiverStream.schema, receiverStream],
          [terminalEvidence.schema, terminalEvidence],
          [terminalIdentityTransition.schema, terminalIdentityTransition]
        ]).get(request.expectedSchema);
        return exemplar === undefined
          ? removalContext.externalObjectVerifier(request)
          : canonicalHash(Object.keys(request.object).sort()) === canonicalHash(Object.keys(exemplar).sort());
      },
      objectResolver: new Map([
        ...removalContext.objectResolver,
        ...allObjects.map((object) => [refFor(object).object_hash, object]),
        ...externalObjects.map((object) => [
          object.receipt_hash ?? object.assignment_hash ?? object.head_hash ?? object.state_hash, object
        ])
      ])
    };
    return { transition, terminalIdentityTransition, connectionReceipt, receiverBefore, receiverAfter,
      receiverCurrentEntry, terminalEvidence, terminalEvidenceRef, plan, context: fixtureContext };
  };
  for (const [cause, discriminator] of [
    ["authenticated_stream_closed", "4"], ["authenticated_irreversible_horizon", "5"]
  ]) {
    const fixture = terminalReceiverFixture(cause, discriminator);
    assert.deepEqual(validateConnectionOutstandingActionEntry(
      fixture.receiverCurrentEntry, fixture.context
    ), [], `${cause}:connection`);
    assert.deepEqual(validateReceiverOutstandingStreamEntry(fixture.receiverBefore, fixture.context), [], `${cause}:before`);
    assert.deepEqual(validateReceiverOutstandingStreamEntry(fixture.receiverAfter, fixture.context), [], `${cause}:after`);
    for (const item of fixture.terminalIdentityTransition.reservation_assignment_transitions) {
      const resolvedAfter = fixture.context.objectResolver.get(item.assignment_after_ref.object_hash);
      assert.equal(resolvedAfter?.assignment_hash, item.assignment_after_hash, `${cause}:assignment-after-resolved`);
      assert.equal(fixture.context.externalObjectVerifier({
        reference: item.assignment_after_ref, object: resolvedAfter,
        expectedSchema: "cairn.bounded_index_slot_assignment.v0.1"
      }), true, `${cause}:assignment-after-closed`);
    }
    assert.deepEqual(validateReceiverOutstandingStreamTransitionReceipt(fixture.transition, fixture.context), [], cause);
    if (cause === "authenticated_stream_closed") {
      const afterRef = fixture.terminalIdentityTransition.reservation_assignment_transitions[0].assignment_after_ref;
      const unchangedConsumption = {
        ...fixture.context.objectResolver.get(afterRef.object_hash), consumed_slots: 0
      };
      const unchangedConsumptionContext = {
        ...fixture.context,
        objectResolver: new Map(fixture.context.objectResolver).set(afterRef.object_hash, unchangedConsumption)
      };
      assert.ok(validateReceiverOutstandingStreamTransitionReceipt(
        fixture.transition, unchangedConsumptionContext
      ).includes("receiver_outstanding_transition_identity_transition_mismatch"));
    }
    assert.deepEqual(validateConnectionOutstandingIndexTransitionReceipt(
      fixture.connectionReceipt, fixture.context
    ), [], cause);
    const missingSelectorContext = {
      ...fixture.context, objectResolver: new Map(fixture.context.objectResolver)
    };
    missingSelectorContext.objectResolver.delete(fixture.transition.epoch_selector_before_head_ref.object_hash);
    assert.ok(validateReceiverOutstandingStreamTransitionReceipt(
      fixture.transition, missingSelectorContext
    ).includes("receiver_outstanding_transition_selector_scope_mismatch"));
    const missingIdentityTransitionContext = {
      ...fixture.context, objectResolver: new Map(fixture.context.objectResolver)
    };
    missingIdentityTransitionContext.objectResolver.delete(
      fixture.transition.identity_epoch_transition_receipt_ref.object_hash
    );
    assert.ok(validateReceiverOutstandingStreamTransitionReceipt(
      fixture.transition, missingIdentityTransitionContext
    ).includes("receiver_outstanding_transition_identity_transition_mismatch"));
    const alteredEvidence = cause === "authenticated_stream_closed"
      ? { ...fixture.terminalEvidence, receiver_event_stream_key: `sha-256:${"7".repeat(64)}` }
      : { ...fixture.terminalEvidence,
        receiver_finality_profile_hash: `sha-256:${"7".repeat(64)}` };
    const alteredEvidenceContext = {
      ...fixture.context,
      objectResolver: new Map(fixture.context.objectResolver)
        .set(fixture.terminalEvidenceRef.object_hash, alteredEvidence)
    };
    assert.ok(validateReceiverOutstandingStreamTransitionReceipt(
      fixture.transition, alteredEvidenceContext
    ).some((code) => code.includes("terminal")), `${cause}:altered evidence`);
  }
  const reboundReceiverKey = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...receiverEntryBefore, precommitted_client_reference: "rebound-client-reference"
  });
  assert.ok(validateReceiverOutstandingStreamEntry(reboundReceiverKey, removalContext)
    .includes("receiver_outstanding_entry_key_mismatch"));
  assert.ok(validateExactObjectRead(
    "execution.receiver_outstanding_stream_entry.get", { ref: refFor(reboundReceiverKey) },
    reboundReceiverKey, removalContext
  ).includes("object_read_receiver_outstanding_entry_key_mismatch"));
  const hollowEvidence = { schema: fencedEvidence.schema, receipt_id: fencedEvidence.receipt_id,
    receipt_hash: fencedEvidence.receipt_hash };
  const hollowEvidenceContext = {
    ...removalContext,
    objectResolver: new Map(removalContext.objectResolver).set(fencedEvidenceRef.object_hash, hollowEvidence)
  };
  assert.ok(validateReceiverTerminalReleasePlan(releasePlan, hollowEvidenceContext)
    .includes("receiver_outstanding_terminal_evidence_mismatch"));
  const wrongEvidenceIdRef = { ...fencedEvidenceRef, object_id: "other-fenced-receipt" };
  const wrongEvidenceIdPlanSeed = make("cairn.receiver_terminal_release_plan_core.v0.1", {
    ...releasePlan, terminal_release_evidence_ref: wrongEvidenceIdRef
  });
  const wrongEvidenceIdPlan = make("cairn.receiver_terminal_release_plan_core.v0.1", {
    ...wrongEvidenceIdPlanSeed,
    terminal_release_plan_key: receiverTerminalReleasePlanKey(wrongEvidenceIdPlanSeed, receiverEntryBefore)
  });
  assert.ok(validateReceiverTerminalReleasePlan(wrongEvidenceIdPlan, removalContext)
    .includes("receiver_outstanding_terminal_evidence_mismatch"));
  const unresolvedPlanContext = {
    ...removalContext, objectResolver: new Map(removalContext.objectResolver)
  };
  unresolvedPlanContext.objectResolver.delete(refFor(releasePlan).object_hash);
  assert.ok(validateReceiverOutstandingStreamTransitionReceipt(receiverTransition, unresolvedPlanContext)
    .includes("receiver_outstanding_transition_terminal_union_mismatch"));
  const reboundReceiverAfter = make("cairn.receiver_outstanding_stream_entry.v0.1", {
    ...receiverEntryAfter, precommitted_client_reference: "changed-after-reference"
  });
  const reboundReceiverTransition = make("cairn.receiver_outstanding_stream_transition_receipt.v0.1", {
    ...receiverTransition, entry_after_ref: refFor(reboundReceiverAfter),
    entry_after_hash: reboundReceiverAfter.entry_hash
  });
  const reboundReceiverContext = {
    ...removalContext,
    objectResolver: new Map([...removalContext.objectResolver,
      [refFor(reboundReceiverAfter).object_hash, reboundReceiverAfter]])
  };
  assert.ok(validateReceiverOutstandingStreamTransitionReceipt(reboundReceiverTransition, reboundReceiverContext)
    .includes("receiver_outstanding_transition_entry_mismatch"));
  assert.ok(validateExactObjectRead(
    "execution.receiver_outstanding_stream_transition_receipt.get",
    { ref: refFor(reboundReceiverTransition) }, reboundReceiverTransition, reboundReceiverContext
  ).includes("object_read_receiver_outstanding_transition_entry_mismatch"));
  const missingTerminalEvidence = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    ...removalReceipt, terminal_evidence_ref: null, terminal_evidence_hash: null
  });
  assert.ok(validateConnectionOutstandingIndexTransitionReceipt(missingTerminalEvidence, removalContext)
    .includes("outstanding_index_transition_removal_union_mismatch"));
  assert.ok(validateExactObjectRead(
    "execution.connection_outstanding_action_index_transition_receipt.get",
    { ref: refFor(missingTerminalEvidence) }, missingTerminalEvidence, removalContext
  ).includes("object_read_outstanding_index_transition_removal_union_mismatch"));
  const falseSnapshot = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    ...updateReceipt, cause: "connection_restriction_snapshot",
    changed_action_key: null, changed_entry_before_ref: null, changed_entry_before_hash: null,
    changed_entry_after_ref: null, changed_entry_after_hash: null
  });
  assert.ok(validateConnectionOutstandingIndexTransitionReceipt(falseSnapshot, updateContext)
    .includes("outstanding_index_transition_snapshot_changed_map"));

  const sealed = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    ...index, sequence: 2, previous_state_hash: index.head_hash, state: "sealed"
  });
  const sealReceipt = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    outstanding_action_index_key: indexKey, cause: "connection_terminal_seal",
    before_head_ref: refFor(index), before_head_hash: index.head_hash,
    after_head_ref: refFor(sealed), after_head_hash: sealed.head_hash,
    before_action_map_ref: refFor(map), before_action_map_hash: map.map_hash,
    after_action_map_ref: refFor(map), after_action_map_hash: map.map_hash,
    changed_action_key: null, changed_entry_before_ref: null, changed_entry_before_hash: null,
    changed_entry_after_ref: null, changed_entry_after_hash: null,
    terminal_evidence_ref: null, terminal_evidence_hash: null,
    authority_transaction_id: "seal-nonempty-index", committed_at: sealed.updated_at
  });
  const sealedContext = {
    ...mapContext,
    objectResolver: new Map([...objects, sealed, sealReceipt].map((object) => [refFor(object).object_hash, object]))
  };
  assert.deepEqual(validateConnectionOutstandingIndexTransitionReceipt(sealReceipt, sealedContext), []);
  assert.deepEqual(validateExactObjectRead(
    "execution.connection_outstanding_action_index_transition_receipt.get",
    { ref: refFor(sealReceipt) }, sealReceipt, signedReadContext(sealReceipt, sealedContext)
  ), ["phase1_authenticated_resolution_unsupported"]);
  const falseSeal = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    ...sealReceipt, after_head_ref: refFor(updatedIndex), after_head_hash: updatedIndex.head_hash,
    after_action_map_ref: refFor(updatedMap), after_action_map_hash: updatedMap.map_hash
  });
  assert.ok(validateConnectionOutstandingIndexTransitionReceipt(falseSeal, updateContext)
    .includes("outstanding_index_transition_terminal_seal_mismatch"));

  const wrongRoot = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    ...index, outstanding_action_root: `sha-256:${"9".repeat(64)}`
  });
  assert.ok(validateConnectionOutstandingIndexHead(wrongRoot, mapContext)
    .includes("connection_outstanding_map_commitment_mismatch"));
  assert.ok(validateExactObjectRead(
    "execution.connection_outstanding_action_index.get", { ref: refFor(wrongRoot) }, wrongRoot, mapContext
  ).includes("object_read_connection_outstanding_map_commitment_mismatch"));
  const wrongCount = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    ...index, outstanding_action_count: 0
  });
  assert.ok(validateConnectionOutstandingIndexHead(wrongCount, mapContext)
    .includes("connection_outstanding_map_commitment_mismatch"));
  const wrongMapHash = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    ...index, outstanding_action_map_hash: `sha-256:${"6".repeat(64)}`
  });
  assert.ok(validateConnectionOutstandingIndexHead(wrongMapHash, mapContext)
    .includes("phase1_ref_hash_mismatch"));
  const wrongRootCount = make("cairn.enumerable_map_root.v0.1", {
    ...map, entry_count: 2
  });
  assert.ok(validateEnumerableMapRoot(wrongRootCount, mapContext)
    .includes("enumerable_map_entries_commitment_mismatch"));
  const wrongMapKey = make("cairn.enumerable_map_root.v0.1", {
    ...map, map_key: `sha-256:${"8".repeat(64)}`
  });
  const wrongMapContext = {
    ...mapContext,
    objectResolver: new Map([...objects.filter((object) => object !== map), wrongMapKey]
      .map((object) => [refFor(object).object_hash, object]))
  };
  assert.ok(validateEnumerableMapRoot(wrongMapKey, {
    ...wrongMapContext, expectedMapKey: connectionOutstandingMapKey(indexKey),
    expectedMapDomain: "connection_outstanding_action"
  }).includes("enumerable_map_key_mismatch"));
  const wrongEntry = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...entry, outstanding_action_key: `sha-256:${"7".repeat(64)}`
  });
  assert.ok(validateConnectionOutstandingActionEntry(wrongEntry, mapContext)
    .includes("outstanding_action_entry_key_mismatch"));
  assert.ok(validateExactObjectRead(
    "execution.connection_outstanding_action_entry.get", { ref: refFor(wrongEntry) }, wrongEntry, mapContext
  ).includes("object_read_outstanding_action_entry_key_mismatch"));
  }
});

test("receiver closure evidence is transaction-correlated", () => {
  const [closureRef, otherClosureRef] = distinctRefs(2, "receiver-closure-correlation");
  const transition = {
    receiver_stream_transition_receipt_ref: closureRef,
    terminal_release_evidence_ref: closureRef,
    authority_transaction_id: "receiver-closure-transaction",
    committed_at: "2026-07-22T10:00:00Z"
  };
  const streamTransition = {
    authority_transaction_id: transition.authority_transaction_id,
    committed_at: transition.committed_at
  };
  assert.deepEqual(receiverOutstandingClosureCorrelationFailures(transition, streamTransition), []);
  assert.deepEqual(receiverOutstandingClosureCorrelationFailures({
    ...transition, receiver_stream_transition_receipt_ref: otherClosureRef
  }, streamTransition), ["receiver_outstanding_transition_closure_evidence_mismatch"]);
  assert.deepEqual(receiverOutstandingClosureCorrelationFailures(transition, {
    ...streamTransition, authority_transaction_id: "different-transaction"
  }), ["receiver_outstanding_transition_closure_transaction_mismatch"]);
  assert.deepEqual(receiverOutstandingClosureCorrelationFailures(transition, {
    ...streamTransition, committed_at: "2026-07-22T10:00:01Z"
  }), ["receiver_outstanding_transition_closure_commit_mismatch"]);

  const plan = { terminal_release_evidence_ref: closureRef };
  const receiverTransition = { receiver_stream_transition_receipt_ref: closureRef };
  assert.deepEqual(receiverTerminalCompletionClosureCorrelationFailures(
    transition, plan, receiverTransition
  ), []);
  assert.deepEqual(receiverTerminalCompletionClosureCorrelationFailures(
    transition, { terminal_release_evidence_ref: otherClosureRef }, receiverTransition
  ), ["receiver_terminal_completion_plan_closure_evidence_mismatch"]);
  assert.deepEqual(receiverTerminalCompletionClosureCorrelationFailures(
    transition, plan, { receiver_stream_transition_receipt_ref: otherClosureRef }
  ), ["receiver_terminal_completion_receiver_closure_evidence_mismatch"]);
});

test("compartment limits are single-asset and ordered", () => {
  const resourceBounds = make("cairn.execution_resource_bounds_profile.v0.1");
  assert.equal(resourceBounds.max_binding_set_disclosures, 0);
  const valid = validCompartment();
  const attestation = {
    schema: "cairn.compartment_protection_attestation.v0.1",
    attestation_hash: valid.protection_attestation_ref.object_hash,
    asset: "USD",
    enforced_cap: { amount_minor: 10000, asset: "USD" }
  };
  const compartmentContext = { ...context, objectResolver: new Map([[attestation.attestation_hash, attestation]]) };
  assert.deepEqual(validateCompartmentDefinition(valid, compartmentContext),
    ["phase1_external_protection_attestation_unsupported"]);
  const over = validCompartment({ per_action_ceiling: { amount_minor: 6000, asset: "USD" } });
  assert.ok(validateCompartmentDefinition(over, compartmentContext).includes("compartment_limit_order_invalid"));
  const crossed = validCompartment({ lifetime_limit: { amount_minor: 10000, asset: "EUR" } });
  assert.ok(validateCompartmentDefinition(crossed, compartmentContext).includes("compartment_asset_mismatch"));
  const capped = validCompartment({ configured_ceiling: { amount_minor: 10001, asset: "USD" } });
  assert.ok(validateCompartmentDefinition(capped, compartmentContext).includes("compartment_ceiling_exceeds_enforced_cap"));
});

test("compartment state heads bind definitions, typed manifests, assets, and predecessors", () => {
  const recursiveMapPrincipal = "did:example:recursive-map-principal";
  const recursiveMapNamespace = "recursive-map-namespace";
  const recursiveLeaves = [];
  for (let attempt = 1; attempt < 128 && recursiveLeaves.length < 2; attempt += 1) {
    const candidate = make("cairn.scoped_execution_control_leaf_state_head.v0.1", {
      principal_id: recursiveMapPrincipal,
      control_namespace_generation: 0,
      scope: "action",
      target_kind: "action_occurrence",
      target_ref: null,
      compartment_control_key: null,
      action_control_key: `sha-256:${attempt.toString(16).padStart(64, "0")}`,
      sequence: 0,
      previous_state_hash: null,
      state: "active",
      pause_epoch: 0,
      revocation_nonce: 0
    });
    if (recursiveLeaves.length === 0 ||
        candidate.scoped_control_leaf_key[8] !== recursiveLeaves[0].scoped_control_leaf_key[8]) {
      recursiveLeaves.push(candidate);
    }
  }
  assert.equal(recursiveLeaves.length, 2);
  const recursiveNodes = recursiveLeaves.map((leaf) => {
    const leafEntry = {
      entry_key: leaf.scoped_control_leaf_key,
      entry_kind: "scoped_execution_control",
      entry_object_ref: refFor(leaf),
      entry_object_hash: leaf.head_hash
    };
    return make("cairn.enumerable_map_node.v0.1", {
      map_domain: "scoped_execution_control",
      node_kind: "leaf",
      path_prefix_nibbles: leaf.scoped_control_leaf_key.slice(8),
      leaf_entry: leafEntry,
      branch_children: [],
      subtree_entry_count: 1,
      entries_root: enumerableMapLeafEntriesRoot("scoped_execution_control", leafEntry)
    });
  });
  const recursiveChildren = recursiveNodes.map((node) => ({
    nibble: node.path_prefix_nibbles[0],
    child_path_prefix_nibbles: node.path_prefix_nibbles,
    child_node_ref: refFor(node),
    child_node_hash: node.node_hash,
    child_subtree_entry_count: node.subtree_entry_count,
    child_entries_root: node.entries_root
  })).sort((left, right) => left.nibble.localeCompare(right.nibble));
  const recursiveRootNode = make("cairn.enumerable_map_node.v0.1", {
    map_domain: "scoped_execution_control",
    node_kind: "branch",
    path_prefix_nibbles: "",
    leaf_entry: null,
    branch_children: recursiveChildren,
    subtree_entry_count: 2,
    entries_root: enumerableMapBranchEntriesRoot(
      "scoped_execution_control", "", 2, recursiveChildren
    )
  });
  const recursiveMap = make("cairn.enumerable_map_root.v0.1", {
    map_key: executionControlMapKey(recursiveMapPrincipal, recursiveMapNamespace, 0),
    map_domain: "scoped_execution_control",
    revision: 0,
    root_node_ref: refFor(recursiveRootNode),
    root_node_hash: recursiveRootNode.node_hash,
    entry_count: 2,
    entries_root: recursiveRootNode.entries_root,
    issuing_authority_id: recursiveMapPrincipal
  });
  const recursiveMapContext = {
    ...context,
    objectResolver: new Map([
      ...recursiveLeaves.map((object) => [refFor(object).object_hash, object]),
      ...recursiveNodes.map((object) => [refFor(object).object_hash, object]),
      [refFor(recursiveRootNode).object_hash, recursiveRootNode],
      [refFor(recursiveMap).object_hash, recursiveMap]
    ])
  };
  assert.deepEqual(validateEnumerableMapRoot(recursiveMap, {
    ...recursiveMapContext,
    expectedMapKey: recursiveMap.map_key,
    expectedMapDomain: "scoped_execution_control"
  }), []);
  const missingRecursiveDescendantContext = {
    ...recursiveMapContext,
    objectResolver: new Map(recursiveMapContext.objectResolver)
  };
  missingRecursiveDescendantContext.objectResolver.delete(refFor(recursiveNodes[1]).object_hash);
  assert.ok(validateEnumerableMapRoot(recursiveMap, {
    ...missingRecursiveDescendantContext,
    expectedMapKey: recursiveMap.map_key,
    expectedMapDomain: "scoped_execution_control"
  }).includes("enumerable_map_descendant_invalid"));
  const fixture = compartmentStateFixture();
  const signedContext = signedReadContext(fixture.objects, {
    ...fixture.context,
    requireDependencySignatures: true,
    currentHeadResolver: currentHeadResolverFor([refFor(fixture.state)])
  }, fixture.compartment.principal_id);
  assert.ok(validateCompartmentStateHead(fixture.state, signedContext)
    .includes("phase1_external_protection_attestation_unsupported"));
  assert.deepEqual(validateExactObjectRead(
    "execution.compartment_state.get", { ref: refFor(fixture.state) }, fixture.state, signedContext
  ), ["object_read_operation_invalid"]);

  assert.ok(validateCompartmentStateHead(fixture.state, {
    ...signedContext, objectResolver: new Map()
  }).includes("compartment_state_definition_mismatch"));
  const malformedFrozen = make("cairn.compartment_state_head.v0.1", {
    ...fixture.state, state: "frozen", pre_freeze_state: null
  });
  assert.ok(validateCompartmentStateHead(malformedFrozen, signedContext)
    .includes("compartment_state_union_mismatch"));
  const wrongAsset = make("cairn.compartment_state_head.v0.1", {
    ...fixture.state, cairn_reserved: { amount_minor: 0, asset: "EUR" }
  });
  assert.ok(validateCompartmentStateHead(wrongAsset, signedContext)
    .includes("compartment_state_asset_mismatch"));
  const nonzeroEmptyMapState = make("cairn.compartment_state_head.v0.1", {
    ...fixture.state, cairn_reserved: { amount_minor: 1, asset: "USD" }
  });
  assert.ok(validateCompartmentStateHead(nonzeroEmptyMapState, signedContext)
    .includes("compartment_state_atom_accounting_mismatch"));

  const atomCauseRef = {
    schema: "cairn.economic_mutation_cause_core.v0.1", object_id: "accounting-state-fixture",
    object_hash: `sha-256:${"9".repeat(64)}`
  };
  const atomFor = (atomId, ledgerClass, amountMinor, atomHash) => ({
    schema: "cairn.current_economic_atom.v0.1", atom_id: atomId,
    economic_resource_key: fixture.state.economic_resource_key,
    compartment_control_key: fixture.state.compartment_control_key,
    obligation_or_reservation_id: `sha-256:${"1".repeat(64)}`,
    component_role: ledgerClass === "active_reversal" ? "reversal" : "item",
    component_id: `sha-256:${"2".repeat(64)}`, reservation_fence: 1,
    ledger_class: ledgerClass, amount: { amount_minor: amountMinor, asset: "USD" },
    economic_mutation_cause_core_ref: atomCauseRef,
    economic_mutation_cause_core_hash: atomCauseRef.object_hash,
    atom_hash: atomHash, authority_service_signature: stubExternalSignature(atomHash)
  });
  const reservedAtom = atomFor(`sha-256:${"a".repeat(64)}`, "reserved", 40, `sha-256:${"3".repeat(64)}`);
  const reversalAtom = atomFor(`sha-256:${"b".repeat(64)}`, "active_reversal", 10, `sha-256:${"4".repeat(64)}`);
  const atomValues = [reservedAtom, reversalAtom].map((entryObject) => ({
    entryKey: entryObject.atom_id, entryObject,
    entryRef: { schema: entryObject.schema, object_id: entryObject.atom_id, object_hash: entryObject.atom_hash }
  }));
  const atomMapFixture = enumerableMapForExternalEntries(
    "compartment_economic_atom", "accounting-branch-atoms", "compartment_economic_atom", atomValues
  );
  const reservationEntry = {
    schema: "cairn.current_reservation_index_entry.v0.1",
    reservation_index_key: `sha-256:${"c".repeat(64)}`,
    compartment_control_key: fixture.state.compartment_control_key,
    authority_reservation_ref: {
      schema: "cairn.authority_reservation.v0.2",
      object_id: reservedAtom.obligation_or_reservation_id,
      object_hash: `sha-256:${"5".repeat(64)}`
    },
    authority_reservation_hash: `sha-256:${"5".repeat(64)}`,
    action_ref: distinctRefs(1, "accounted-reservation-action")[0],
    effect_id: `sha-256:${"6".repeat(64)}`,
    lineage_id: `sha-256:${"7".repeat(64)}`,
    reservation_fence: reservedAtom.reservation_fence,
    held_atom_ids_root: null,
    entry_hash: `sha-256:${"8".repeat(64)}`,
    authority_service_signature: stubExternalSignature(`sha-256:${"8".repeat(64)}`)
  };
  reservationEntry.held_atom_ids_root = currentReservationHeldAtomsRoot(
    reservationEntry, atomMapFixture.leaves
  );
  const reservationRef = {
    schema: reservationEntry.schema, object_id: reservationEntry.reservation_index_key,
    object_hash: reservationEntry.entry_hash
  };
  const reservationMapFixture = enumerableMapForExternalEntries(
    "compartment_active_reservation", "accounting-active-reservations",
    "compartment_active_reservation", [{
      entryKey: reservationEntry.reservation_index_key,
      entryObject: reservationEntry, entryRef: reservationRef
    }]
  );
  const accountedState = make("cairn.compartment_state_head.v0.1", {
    ...fixture.state,
    active_reservation_manifest_ref: refFor(reservationMapFixture.map),
    active_reservation_manifest_hash: reservationMapFixture.map.map_hash,
    active_reservation_count: 1,
    active_reservations_root: reservationMapFixture.map.entries_root,
    current_economic_atom_manifest_ref: refFor(atomMapFixture.map),
    current_economic_atom_manifest_hash: atomMapFixture.map.map_hash,
    current_economic_atom_count: 2,
    cairn_reserved: { amount_minor: 40, asset: "USD" },
    outstanding_reversal_exposure: { amount_minor: 10, asset: "USD" },
    active_hold_atoms_root: compartmentEconomicAtomSubsetRoot("reserved", atomMapFixture.leaves),
    active_reversal_atoms_root: compartmentEconomicAtomSubsetRoot("active_reversal", atomMapFixture.leaves),
    quarantine_hold_atoms_root: compartmentEconomicAtomSubsetRoot("quarantine_hold", atomMapFixture.leaves)
  });
  const accountedContext = {
    ...fixture.context,
    objectResolver: new Map([
      ...fixture.context.objectResolver,
      ...reservationMapFixture.nodes.map((object) => [refFor(object).object_hash, object]),
      [refFor(reservationMapFixture.map).object_hash, reservationMapFixture.map],
      [reservationRef.object_hash, reservationEntry],
      ...atomMapFixture.nodes.map((object) => [refFor(object).object_hash, object]),
      [refFor(atomMapFixture.map).object_hash, atomMapFixture.map],
      ...atomValues.map(({ entryRef, entryObject }) => [entryRef.object_hash, entryObject])
    ])
  };
  const accountedStateFailures = validateCompartmentStateHead(accountedState, accountedContext);
  assert.ok(accountedStateFailures.includes("phase1_external_protection_attestation_unsupported"));
  assert.ok(accountedStateFailures.includes("phase1_external_accounting_leaf_unsupported"));
  const isolatedAtomValue = atomValues[0];
  const isolatedAtomMap = enumerableMapForExternalEntries(
    "compartment_economic_atom", "isolated-economic-atom",
    "compartment_economic_atom", [{
      entryKey: isolatedAtomValue.entryObject.atom_id,
      entryObject: isolatedAtomValue.entryObject,
      entryRef: isolatedAtomValue.entryRef
    }]
  );
  const isolatedAtomMapFailures = validateEnumerableMapRoot(isolatedAtomMap.map, {
    ...accountedContext, expectedMapDomain: "compartment_economic_atom",
    objectResolver: new Map([
      ...accountedContext.objectResolver,
      ...isolatedAtomMap.nodes.map((object) => [refFor(object).object_hash, object]),
      [refFor(isolatedAtomMap.map).object_hash, isolatedAtomMap.map],
      [isolatedAtomValue.entryRef.object_hash, isolatedAtomValue.entryObject]
    ])
  });
  assert.ok(isolatedAtomMapFailures.includes("phase1_external_accounting_leaf_unsupported"),
    JSON.stringify(isolatedAtomMapFailures));
  const successor = make("cairn.compartment_state_head.v0.1", {
    ...fixture.state, sequence: 1, previous_state_hash: fixture.state.state_hash,
    fencing_token: 1, observed_at: "2026-07-22T10:01:00Z"
  });
  const successorContext = signedReadContext([...fixture.objects, successor], {
    ...fixture.context,
    objectResolver: new Map([
      ...fixture.context.objectResolver,
      [refFor(successor).object_hash, successor]
    ]),
    requireDependencySignatures: true,
    statePredecessorResolver: () => fixture.state
  }, fixture.compartment.principal_id);
  assert.ok(validateCompartmentStateHead(successor, successorContext)
    .includes("phase1_external_protection_attestation_unsupported"));
  const skipped = make("cairn.compartment_state_head.v0.1", {
    ...successor, sequence: 2
  });
  assert.ok(validateCompartmentStateHead(skipped, successorContext)
    .includes("compartment_state_predecessor_mismatch"));
  const staleRef = { ...refFor(fixture.state), object_hash: `sha-256:${"7".repeat(64)}` };
  assert.deepEqual(validateExactObjectRead(
    "execution.compartment_state.get", { ref: refFor(fixture.state) }, fixture.state, {
      ...signedContext, currentHeadResolver: currentHeadResolverFor([staleRef])
    }
  ), ["object_read_operation_invalid"]);
});

test("compartment transitions enforce exact causes, manifests, economics, closure, and chronology", () => {
  const fixture = compartmentStateFixture();
  const transactionId = "compartment-role-transfer-1";
  const causeCore = {
    schema: "cairn.economic_mutation_cause_core.v0.1",
    economic_mutation_id: "economic-mutation-role-transfer-1",
    cause_kind: "role_transfer",
    economic_resource_key: fixture.state.economic_resource_key,
    before_compartment_heads: [{
      compartment_control_key: fixture.state.compartment_control_key,
      head_ref: refFor(fixture.state), head_hash: fixture.state.state_hash
    }],
    proposed_semantic_atom_deltas_root: canonicalHash([]),
    authority_transaction_id: transactionId,
    core_hash: `sha-256:${"4".repeat(64)}`
  };
  const causeRef = {
    schema: causeCore.schema, object_id: causeCore.economic_mutation_id, object_hash: causeCore.core_hash
  };
  const deltaManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    manifest_kind: "compartment_economic_atom_deltas", subject_ref: causeRef,
    subject_hash: causeCore.core_hash, authority_transaction_id: transactionId,
    entry_count: 0, sorted_entries: [], entries_root: canonicalHash([])
  });
  const after = make("cairn.compartment_state_head.v0.1", {
    ...fixture.state, sequence: 1, previous_state_hash: fixture.state.state_hash,
    fencing_token: 1, observed_at: "2026-07-22T10:01:00Z"
  });
  const transition = make("cairn.compartment_state_transition_receipt.v0.1", {
    compartment_control_key: fixture.state.compartment_control_key,
    economic_mutation_cause_core_ref: causeRef, economic_mutation_cause_core_hash: causeCore.core_hash,
    cause: "role_transfer", before_head_ref: refFor(fixture.state), before_head_hash: fixture.state.state_hash,
    after_head_ref: refFor(after), after_head_hash: after.state_hash,
    reservation_manifest_before_ref: fixture.state.active_reservation_manifest_ref,
    reservation_manifest_before_hash: fixture.state.active_reservation_manifest_hash,
    reservation_manifest_after_ref: after.active_reservation_manifest_ref,
    reservation_manifest_after_hash: after.active_reservation_manifest_hash,
    economic_atom_manifest_before_ref: fixture.state.current_economic_atom_manifest_ref,
    economic_atom_manifest_before_hash: fixture.state.current_economic_atom_manifest_hash,
    economic_atom_manifest_after_ref: after.current_economic_atom_manifest_ref,
    economic_atom_manifest_after_hash: after.current_economic_atom_manifest_hash,
    confirmed_event_manifest_before_ref: fixture.state.confirmed_event_manifest_ref,
    confirmed_event_manifest_before_hash: fixture.state.confirmed_event_manifest_hash,
    confirmed_event_manifest_after_ref: after.confirmed_event_manifest_ref,
    confirmed_event_manifest_after_hash: after.confirmed_event_manifest_hash,
    economic_atom_delta_manifest_ref: refFor(deltaManifest),
    economic_atom_delta_manifest_hash: deltaManifest.manifest_hash,
    authority_transaction_id: transactionId, committed_at: "2026-07-22T10:01:00Z",
    authority_service_signature: {
      ...after.authority_service_signature, signed_at: "2026-07-22T10:01:00Z"
    }
  });
  const transitionObjects = [...fixture.objects, after, deltaManifest, transition];
  const transitionContext = signedReadContext(transitionObjects, {
    ...fixture.context, externalObjectVerifier: () => true,
    objectResolver: new Map([
      ...fixture.context.objectResolver,
      [refFor(after).object_hash, after], [refFor(deltaManifest).object_hash, deltaManifest],
      [causeRef.object_hash, causeCore]
    ]),
    statePredecessorResolver: () => fixture.state,
    requireDependencySignatures: true
  }, fixture.compartment.principal_id);
  assert.ok(validateCompartmentStateTransitionReceipt(transition, transitionContext)
    .includes("phase1_external_protection_attestation_unsupported"));

  const holdCauseRef = {
    schema: "cairn.economic_mutation_cause_core.v0.1", object_id: "economic-mutation-map-hold-1",
    object_hash: `sha-256:${"7".repeat(64)}`
  };
  const heldAtom = {
    schema: "cairn.current_economic_atom.v0.1", atom_id: `sha-256:${"a".repeat(64)}`,
    economic_resource_key: fixture.state.economic_resource_key,
    compartment_control_key: fixture.state.compartment_control_key,
    obligation_or_reservation_id: `sha-256:${"8".repeat(64)}`,
    component_role: "item", component_id: `sha-256:${"9".repeat(64)}`,
    reservation_fence: 1, ledger_class: "reserved", amount: { amount_minor: 100, asset: "USD" },
    economic_mutation_cause_core_ref: holdCauseRef,
    economic_mutation_cause_core_hash: holdCauseRef.object_hash,
    atom_hash: `sha-256:${"a".repeat(63)}1`,
    authority_service_signature: stubExternalSignature(`sha-256:${"a".repeat(63)}1`)
  };
  const heldAtomRef = {
    schema: heldAtom.schema, object_id: heldAtom.atom_id, object_hash: heldAtom.atom_hash
  };
  assert.equal(
    compartmentConfirmedEventComponentRoot([heldAtom.component_id]),
    "sha-256:45f789acd0e2b034217d5485c7a76d544b4cb1ffcc6e4b240748a6cd12a222dd"
  );
  const heldAtomMap = enumerableMapForExternalEntries(
    "compartment_economic_atom", "held-atom-map", "compartment_economic_atom",
    [{ entryKey: heldAtom.atom_id, entryObject: heldAtom, entryRef: heldAtomRef }]
  );
  const heldReservation = {
    schema: "cairn.current_reservation_index_entry.v0.1",
    reservation_index_key: `sha-256:${"c".repeat(64)}`,
    compartment_control_key: fixture.state.compartment_control_key,
    authority_reservation_ref: {
      schema: "cairn.authority_reservation.v0.2",
      object_id: heldAtom.obligation_or_reservation_id,
      object_hash: `sha-256:${"d".repeat(64)}`
    },
    authority_reservation_hash: `sha-256:${"d".repeat(64)}`,
    action_ref: distinctRefs(1, "held-reservation-action")[0],
    effect_id: `sha-256:${"e".repeat(64)}`,
    lineage_id: `sha-256:${"f".repeat(64)}`,
    reservation_fence: heldAtom.reservation_fence,
    held_atom_ids_root: null,
    entry_hash: `sha-256:${"1".repeat(63)}2`,
    authority_service_signature: stubExternalSignature(`sha-256:${"1".repeat(63)}2`)
  };
  heldReservation.held_atom_ids_root = currentReservationHeldAtomsRoot(
    heldReservation, heldAtomMap.leaves
  );
  const heldReservationRef = {
    schema: heldReservation.schema, object_id: heldReservation.reservation_index_key,
    object_hash: heldReservation.entry_hash
  };
  const heldReservationMap = enumerableMapForExternalEntries(
    "compartment_active_reservation", "held-reservation-map", "compartment_active_reservation", [{
      entryKey: heldReservation.reservation_index_key,
      entryObject: heldReservation, entryRef: heldReservationRef
    }]
  );
  const holdDelta = {
    schema: "cairn.economic_atom_delta_entry.v0.1",
    economic_resource_key: fixture.state.economic_resource_key,
    compartment_control_key: fixture.state.compartment_control_key,
    obligation_or_reservation_id: heldAtom.obligation_or_reservation_id,
    atom_id: heldAtom.atom_id, before_class: "absent", after_class: "reserved",
    amount: heldAtom.amount, economic_mutation_cause_core_ref: holdCauseRef,
    economic_mutation_cause_core_hash: holdCauseRef.object_hash,
    authority_transaction_id: "compartment-map-hold-1", entry_hash: `sha-256:${"b".repeat(64)}`,
    authority_service_signature: stubExternalSignature(`sha-256:${"b".repeat(64)}`)
  };
  const holdDeltaRef = {
    schema: holdDelta.schema, object_id: holdDelta.atom_id, object_hash: holdDelta.entry_hash
  };
  const holdManifestEntrySeed = {
    entry_kind: "economic_atom_delta", entry_object_ref: holdDeltaRef,
    entry_object_hash: holdDeltaRef.object_hash
  };
  const holdManifestEntry = {
    ...holdManifestEntrySeed, entry_key: transitionManifestEntryKey(holdManifestEntrySeed)
  };
  const mapHoldCause = {
    schema: holdCauseRef.schema, economic_mutation_id: holdCauseRef.object_id,
    cause_kind: "reservation_hold", economic_resource_key: fixture.state.economic_resource_key,
    before_compartment_heads: [{
      compartment_control_key: fixture.state.compartment_control_key,
      head_ref: refFor(fixture.state), head_hash: fixture.state.state_hash
    }],
    proposed_semantic_atom_deltas_root: canonicalHash([{
      atom_id: holdDelta.atom_id, before_class: holdDelta.before_class,
      after_class: holdDelta.after_class, amount: holdDelta.amount
    }]),
    authority_transaction_id: holdDelta.authority_transaction_id,
    core_hash: holdCauseRef.object_hash
  };
  const mapHoldManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    manifest_kind: "compartment_economic_atom_deltas", subject_ref: holdCauseRef,
    subject_hash: holdCauseRef.object_hash, authority_transaction_id: holdDelta.authority_transaction_id,
    entry_count: 1, sorted_entries: [holdManifestEntry], entries_root: canonicalHash([holdManifestEntry])
  });
  const heldState = make("cairn.compartment_state_head.v0.1", {
    ...fixture.state, sequence: 1, previous_state_hash: fixture.state.state_hash,
    fencing_token: 1, observed_at: "2026-07-22T10:01:00Z",
    active_reservation_manifest_ref: refFor(heldReservationMap.map),
    active_reservation_manifest_hash: heldReservationMap.map.map_hash,
    active_reservation_count: 1, active_reservations_root: heldReservationMap.map.entries_root,
    current_economic_atom_manifest_ref: refFor(heldAtomMap.map),
    current_economic_atom_manifest_hash: heldAtomMap.map.map_hash, current_economic_atom_count: 1,
    cairn_reserved: { amount_minor: 100, asset: "USD" },
    active_hold_atoms_root: compartmentEconomicAtomSubsetRoot("reserved", heldAtomMap.leaves)
  });
  const mapHoldReceipt = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...transition, cause: "reservation_hold",
    economic_mutation_cause_core_ref: holdCauseRef,
    economic_mutation_cause_core_hash: holdCauseRef.object_hash,
    after_head_ref: refFor(heldState), after_head_hash: heldState.state_hash,
    reservation_manifest_after_ref: refFor(heldReservationMap.map),
    reservation_manifest_after_hash: heldReservationMap.map.map_hash,
    economic_atom_manifest_after_ref: refFor(heldAtomMap.map),
    economic_atom_manifest_after_hash: heldAtomMap.map.map_hash,
    economic_atom_delta_manifest_ref: refFor(mapHoldManifest),
    economic_atom_delta_manifest_hash: mapHoldManifest.manifest_hash,
    authority_transaction_id: holdDelta.authority_transaction_id
  });
  const mapHoldContext = {
    ...transitionContext, requireDependencySignatures: false,
    objectResolver: new Map([
      ...transitionContext.objectResolver,
      ...heldReservationMap.nodes.map((object) => [refFor(object).object_hash, object]),
      [refFor(heldReservationMap.map).object_hash, heldReservationMap.map],
      [heldReservationRef.object_hash, heldReservation],
      ...heldAtomMap.nodes.map((object) => [refFor(object).object_hash, object]),
      [refFor(heldAtomMap.map).object_hash, heldAtomMap.map], [heldAtomRef.object_hash, heldAtom],
      [holdDeltaRef.object_hash, holdDelta], [holdCauseRef.object_hash, mapHoldCause],
      [refFor(mapHoldManifest).object_hash, mapHoldManifest], [refFor(heldState).object_hash, heldState]
    ])
  };
  assert.ok(validateCompartmentStateTransitionReceipt(mapHoldReceipt, mapHoldContext)
    .includes("phase1_external_protection_attestation_unsupported"));
  const rewrittenReservation = {
    ...heldReservation,
    effect_id: `sha-256:${"0".repeat(64)}`,
    entry_hash: `sha-256:${"2".repeat(63)}3`
  };
  const rewrittenReservationRef = {
    schema: rewrittenReservation.schema, object_id: rewrittenReservation.reservation_index_key,
    object_hash: rewrittenReservation.entry_hash
  };
  const rewrittenReservationMap = enumerableMapForExternalEntries(
    "compartment_active_reservation", "rewritten-reservation-map", "compartment_active_reservation", [{
      entryKey: rewrittenReservation.reservation_index_key,
      entryObject: rewrittenReservation,
      entryRef: rewrittenReservationRef
    }]
  );
  const rewrittenReservationState = make("cairn.compartment_state_head.v0.1", {
    ...heldState,
    sequence: 2, previous_state_hash: heldState.state_hash,
    observed_at: "2026-07-22T10:02:00Z",
    active_reservation_manifest_ref: refFor(rewrittenReservationMap.map),
    active_reservation_manifest_hash: rewrittenReservationMap.map.map_hash,
    active_reservations_root: rewrittenReservationMap.map.entries_root
  });
  const rewriteCauseRef = {
    schema: "cairn.economic_mutation_cause_core.v0.1", object_id: "reservation-provenance-rewrite",
    object_hash: `sha-256:${"4".repeat(64)}`
  };
  const rewriteCause = {
    schema: rewriteCauseRef.schema, economic_mutation_id: rewriteCauseRef.object_id,
    cause_kind: "role_transfer", economic_resource_key: fixture.state.economic_resource_key,
    before_compartment_heads: [{
      compartment_control_key: heldState.compartment_control_key,
      head_ref: refFor(heldState), head_hash: heldState.state_hash
    }],
    proposed_semantic_atom_deltas_root: canonicalHash([]),
    authority_transaction_id: "reservation-provenance-rewrite",
    core_hash: rewriteCauseRef.object_hash
  };
  const rewriteDeltaManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    manifest_kind: "compartment_economic_atom_deltas", subject_ref: rewriteCauseRef,
    subject_hash: rewriteCauseRef.object_hash,
    authority_transaction_id: rewriteCause.authority_transaction_id,
    entry_count: 0, sorted_entries: [], entries_root: canonicalHash([])
  });
  const rewrittenReservationReceipt = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...mapHoldReceipt,
    cause: "role_transfer",
    economic_mutation_cause_core_ref: rewriteCauseRef,
    economic_mutation_cause_core_hash: rewriteCauseRef.object_hash,
    before_head_ref: refFor(heldState), before_head_hash: heldState.state_hash,
    after_head_ref: refFor(rewrittenReservationState),
    after_head_hash: rewrittenReservationState.state_hash,
    reservation_manifest_before_ref: refFor(heldReservationMap.map),
    reservation_manifest_before_hash: heldReservationMap.map.map_hash,
    reservation_manifest_after_ref: refFor(rewrittenReservationMap.map),
    reservation_manifest_after_hash: rewrittenReservationMap.map.map_hash,
    economic_atom_manifest_before_ref: refFor(heldAtomMap.map),
    economic_atom_manifest_before_hash: heldAtomMap.map.map_hash,
    economic_atom_manifest_after_ref: refFor(heldAtomMap.map),
    economic_atom_manifest_after_hash: heldAtomMap.map.map_hash,
    confirmed_event_manifest_before_ref: heldState.confirmed_event_manifest_ref,
    confirmed_event_manifest_before_hash: heldState.confirmed_event_manifest_hash,
    confirmed_event_manifest_after_ref: rewrittenReservationState.confirmed_event_manifest_ref,
    confirmed_event_manifest_after_hash: rewrittenReservationState.confirmed_event_manifest_hash,
    economic_atom_delta_manifest_ref: refFor(rewriteDeltaManifest),
    economic_atom_delta_manifest_hash: rewriteDeltaManifest.manifest_hash,
    authority_transaction_id: rewriteCause.authority_transaction_id,
    committed_at: rewrittenReservationState.observed_at
  });
  const rewrittenReservationContext = {
    ...mapHoldContext,
    statePredecessorResolver: (reference) =>
      reference.object_hash === fixture.state.state_hash ? fixture.state :
        reference.object_hash === heldState.state_hash ? heldState : null,
    objectResolver: new Map([
      ...mapHoldContext.objectResolver,
      ...rewrittenReservationMap.nodes.map((object) => [refFor(object).object_hash, object]),
      [refFor(rewrittenReservationMap.map).object_hash, rewrittenReservationMap.map],
      [rewrittenReservationRef.object_hash, rewrittenReservation],
      [refFor(rewrittenReservationState).object_hash, rewrittenReservationState],
      [rewriteCauseRef.object_hash, rewriteCause],
      [refFor(rewriteDeltaManifest).object_hash, rewriteDeltaManifest]
    ])
  };
  assert.ok(validateCompartmentStateTransitionReceipt(
    rewrittenReservationReceipt, rewrittenReservationContext
  ).includes("phase1_external_accounting_leaf_unsupported"));
  const unexplainedReservation = {
    ...heldReservation,
    held_atom_ids_root: `sha-256:${"3".repeat(64)}`,
    entry_hash: `sha-256:${"4".repeat(63)}5`
  };
  const unexplainedReservationRef = {
    schema: unexplainedReservation.schema, object_id: unexplainedReservation.reservation_index_key,
    object_hash: unexplainedReservation.entry_hash
  };
  const unexplainedReservationMap = enumerableMapForExternalEntries(
    "compartment_active_reservation", "unexplained-reservation-map",
    "compartment_active_reservation", [{
      entryKey: unexplainedReservation.reservation_index_key,
      entryObject: unexplainedReservation, entryRef: unexplainedReservationRef
    }]
  );
  const unexplainedReservationState = make("cairn.compartment_state_head.v0.1", {
    ...heldState,
    sequence: 2, previous_state_hash: heldState.state_hash,
    observed_at: "2026-07-22T10:02:00Z",
    active_reservation_manifest_ref: refFor(unexplainedReservationMap.map),
    active_reservation_manifest_hash: unexplainedReservationMap.map.map_hash,
    active_reservations_root: unexplainedReservationMap.map.entries_root
  });
  const unexplainedReservationReceipt = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...rewrittenReservationReceipt,
    after_head_ref: refFor(unexplainedReservationState),
    after_head_hash: unexplainedReservationState.state_hash,
    reservation_manifest_after_ref: refFor(unexplainedReservationMap.map),
    reservation_manifest_after_hash: unexplainedReservationMap.map.map_hash
  });
  const unexplainedReservationContext = {
    ...rewrittenReservationContext,
    objectResolver: new Map([
      ...rewrittenReservationContext.objectResolver,
      ...unexplainedReservationMap.nodes.map((object) => [refFor(object).object_hash, object]),
      [refFor(unexplainedReservationMap.map).object_hash, unexplainedReservationMap.map],
      [unexplainedReservationRef.object_hash, unexplainedReservation],
      [refFor(unexplainedReservationState).object_hash, unexplainedReservationState]
    ])
  };
  assert.ok(validateCompartmentStateTransitionReceipt(
    unexplainedReservationReceipt, unexplainedReservationContext
  ).includes("phase1_external_accounting_leaf_unsupported"));

  const debitCauseRef = {
    schema: "cairn.economic_mutation_cause_core.v0.1", object_id: "confirmed-debit-correlation",
    object_hash: `sha-256:${"5".repeat(64)}`
  };
  const debitedAtom = {
    ...heldAtom,
    ledger_class: "confirmed_debit",
    economic_mutation_cause_core_ref: debitCauseRef,
    economic_mutation_cause_core_hash: debitCauseRef.object_hash,
    atom_hash: `sha-256:${"6".repeat(64)}`
  };
  const debitedAtomRef = {
    schema: debitedAtom.schema, object_id: debitedAtom.atom_id, object_hash: debitedAtom.atom_hash
  };
  const debitedAtomMap = enumerableMapForExternalEntries(
    "compartment_economic_atom", "confirmed-debit-atoms", "compartment_economic_atom", [{
      entryKey: debitedAtom.atom_id, entryObject: debitedAtom, entryRef: debitedAtomRef
    }]
  );
  const debitDelta = {
    ...holdDelta,
    before_class: "reserved", after_class: "confirmed_debit",
    economic_mutation_cause_core_ref: debitCauseRef,
    economic_mutation_cause_core_hash: debitCauseRef.object_hash,
    authority_transaction_id: "confirmed-debit-correlation",
    entry_hash: `sha-256:${"7".repeat(64)}`
  };
  const debitDeltaRef = {
    schema: debitDelta.schema, object_id: debitDelta.atom_id, object_hash: debitDelta.entry_hash
  };
  const debitManifestSeed = {
    entry_kind: "economic_atom_delta", entry_object_ref: debitDeltaRef,
    entry_object_hash: debitDeltaRef.object_hash
  };
  const debitManifestEntry = {
    ...debitManifestSeed, entry_key: transitionManifestEntryKey(debitManifestSeed)
  };
  const debitCause = {
    schema: debitCauseRef.schema, economic_mutation_id: debitCauseRef.object_id,
    cause_kind: "receiver_debit", economic_resource_key: fixture.state.economic_resource_key,
    before_compartment_heads: [{
      compartment_control_key: heldState.compartment_control_key,
      head_ref: refFor(heldState), head_hash: heldState.state_hash
    }],
    proposed_semantic_atom_deltas_root: canonicalHash([{
      atom_id: debitDelta.atom_id, before_class: debitDelta.before_class,
      after_class: debitDelta.after_class, amount: debitDelta.amount
    }]),
    authority_transaction_id: debitDelta.authority_transaction_id,
    core_hash: debitCauseRef.object_hash
  };
  const debitManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    manifest_kind: "compartment_economic_atom_deltas", subject_ref: debitCauseRef,
    subject_hash: debitCauseRef.object_hash,
    authority_transaction_id: debitDelta.authority_transaction_id,
    entry_count: 1, sorted_entries: [debitManifestEntry],
    entries_root: canonicalHash([debitManifestEntry])
  });
  const confirmedEvent = {
    schema: "cairn.confirmed_economic_event_entry.v0.1",
    confirmed_event_key: `sha-256:${"8".repeat(64)}`,
    economic_resource_key: fixture.state.economic_resource_key,
    compartment_control_key: fixture.state.compartment_control_key,
    event_kind: "confirmed_debit",
    receiver_event_import_ref: distinctRefs(1, "confirmed-debit-import")[0],
    receiver_event_import_hash: null,
    obligation_exposure_id: heldAtom.obligation_or_reservation_id,
    component_ids_root: compartmentConfirmedEventComponentRoot([heldAtom.component_id]),
    amount: heldAtom.amount,
    accounting_policy_ref: distinctRefs(1, "confirmed-debit-accounting-policy")[0],
    accounting_policy_hash: null,
    event_hash: `sha-256:${"9".repeat(64)}`,
    authority_service_signature: stubExternalSignature(`sha-256:${"9".repeat(64)}`)
  };
  confirmedEvent.receiver_event_import_hash = confirmedEvent.receiver_event_import_ref.object_hash;
  confirmedEvent.accounting_policy_hash = confirmedEvent.accounting_policy_ref.object_hash;
  const confirmedEventRef = {
    schema: confirmedEvent.schema, object_id: confirmedEvent.confirmed_event_key,
    object_hash: confirmedEvent.event_hash
  };
  const confirmedEventMap = enumerableMapForExternalEntries(
    "compartment_confirmed_event", "confirmed-debit-events", "compartment_confirmed_event", [{
      entryKey: confirmedEvent.confirmed_event_key,
      entryObject: confirmedEvent,
      entryRef: confirmedEventRef
    }]
  );
  const debitedState = make("cairn.compartment_state_head.v0.1", {
    ...heldState, sequence: 2, previous_state_hash: heldState.state_hash,
    observed_at: "2026-07-22T10:02:00Z",
    active_reservation_manifest_ref: fixture.state.active_reservation_manifest_ref,
    active_reservation_manifest_hash: fixture.state.active_reservation_manifest_hash,
    active_reservation_count: 0, active_reservations_root: fixture.state.active_reservations_root,
    current_economic_atom_manifest_ref: refFor(debitedAtomMap.map),
    current_economic_atom_manifest_hash: debitedAtomMap.map.map_hash,
    current_economic_atom_count: 1,
    confirmed_event_manifest_ref: refFor(confirmedEventMap.map),
    confirmed_event_manifest_hash: confirmedEventMap.map.map_hash,
    confirmed_event_count: 1,
    cairn_reserved: { amount_minor: 0, asset: "USD" },
    confirmed_spent: heldAtom.amount,
    active_hold_atoms_root: compartmentEconomicAtomSubsetRoot("reserved", debitedAtomMap.leaves),
    confirmed_spend_events_root: compartmentConfirmedEventSubsetRoot(
      "confirmed_debit", confirmedEventMap.leaves
    )
  });
  const debitReceipt = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...mapHoldReceipt, cause: "receiver_debit",
    economic_mutation_cause_core_ref: debitCauseRef,
    economic_mutation_cause_core_hash: debitCauseRef.object_hash,
    before_head_ref: refFor(heldState), before_head_hash: heldState.state_hash,
    after_head_ref: refFor(debitedState), after_head_hash: debitedState.state_hash,
    reservation_manifest_before_ref: refFor(heldReservationMap.map),
    reservation_manifest_before_hash: heldReservationMap.map.map_hash,
    reservation_manifest_after_ref: fixture.state.active_reservation_manifest_ref,
    reservation_manifest_after_hash: fixture.state.active_reservation_manifest_hash,
    economic_atom_manifest_before_ref: refFor(heldAtomMap.map),
    economic_atom_manifest_before_hash: heldAtomMap.map.map_hash,
    economic_atom_manifest_after_ref: refFor(debitedAtomMap.map),
    economic_atom_manifest_after_hash: debitedAtomMap.map.map_hash,
    confirmed_event_manifest_before_ref: heldState.confirmed_event_manifest_ref,
    confirmed_event_manifest_before_hash: heldState.confirmed_event_manifest_hash,
    confirmed_event_manifest_after_ref: refFor(confirmedEventMap.map),
    confirmed_event_manifest_after_hash: confirmedEventMap.map.map_hash,
    economic_atom_delta_manifest_ref: refFor(debitManifest),
    economic_atom_delta_manifest_hash: debitManifest.manifest_hash,
    authority_transaction_id: debitDelta.authority_transaction_id,
    committed_at: debitedState.observed_at,
    authority_service_signature: {
      ...mapHoldReceipt.authority_service_signature, signed_at: debitedState.observed_at
    }
  });
  const debitContext = {
    ...mapHoldContext,
    statePredecessorResolver: (reference) =>
      reference.object_hash === fixture.state.state_hash ? fixture.state :
        reference.object_hash === heldState.state_hash ? heldState : null,
    objectResolver: new Map([
      ...mapHoldContext.objectResolver,
      ...debitedAtomMap.nodes.map((object) => [refFor(object).object_hash, object]),
      [refFor(debitedAtomMap.map).object_hash, debitedAtomMap.map],
      [debitedAtomRef.object_hash, debitedAtom],
      ...confirmedEventMap.nodes.map((object) => [refFor(object).object_hash, object]),
      [refFor(confirmedEventMap.map).object_hash, confirmedEventMap.map],
      [confirmedEventRef.object_hash, confirmedEvent],
      [debitDeltaRef.object_hash, debitDelta],
      [debitCauseRef.object_hash, debitCause],
      [refFor(debitManifest).object_hash, debitManifest],
      [refFor(debitedState).object_hash, debitedState]
    ])
  };
  assert.ok(validateEnumerableMapRoot(confirmedEventMap.map, {
    ...debitContext, expectedMapDomain: "compartment_confirmed_event"
  }).includes("phase1_external_accounting_leaf_unsupported"));
  assert.ok(validateCompartmentStateTransitionReceipt(debitReceipt, debitContext)
    .includes("phase1_external_protection_attestation_unsupported"));
  const wrongComponentEvent = {
    ...confirmedEvent,
    component_ids_root: `sha-256:${"0".repeat(64)}`,
    event_hash: `sha-256:${"a".repeat(64)}`
  };
  const wrongComponentEventRef = {
    schema: wrongComponentEvent.schema, object_id: wrongComponentEvent.confirmed_event_key,
    object_hash: wrongComponentEvent.event_hash
  };
  const wrongComponentMap = enumerableMapForExternalEntries(
    "compartment_confirmed_event", "wrong-component-events", "compartment_confirmed_event", [{
      entryKey: wrongComponentEvent.confirmed_event_key,
      entryObject: wrongComponentEvent,
      entryRef: wrongComponentEventRef
    }]
  );
  const wrongComponentState = make("cairn.compartment_state_head.v0.1", {
    ...debitedState,
    confirmed_event_manifest_ref: refFor(wrongComponentMap.map),
    confirmed_event_manifest_hash: wrongComponentMap.map.map_hash,
    confirmed_spend_events_root: compartmentConfirmedEventSubsetRoot(
      "confirmed_debit", wrongComponentMap.leaves
    )
  });
  const wrongComponentReceipt = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...debitReceipt,
    after_head_ref: refFor(wrongComponentState), after_head_hash: wrongComponentState.state_hash,
    confirmed_event_manifest_after_ref: refFor(wrongComponentMap.map),
    confirmed_event_manifest_after_hash: wrongComponentMap.map.map_hash
  });
  const wrongComponentContext = {
    ...debitContext,
    objectResolver: new Map([
      ...debitContext.objectResolver,
      ...wrongComponentMap.nodes.map((object) => [refFor(object).object_hash, object]),
      [refFor(wrongComponentMap.map).object_hash, wrongComponentMap.map],
      [wrongComponentEventRef.object_hash, wrongComponentEvent],
      [refFor(wrongComponentState).object_hash, wrongComponentState]
    ])
  };
  assert.ok(validateCompartmentStateTransitionReceipt(wrongComponentReceipt, wrongComponentContext)
    .includes("phase1_external_protection_attestation_unsupported"));
  const unchangedAtomMapHold = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...mapHoldReceipt,
    economic_atom_manifest_after_ref: fixture.state.current_economic_atom_manifest_ref,
    economic_atom_manifest_after_hash: fixture.state.current_economic_atom_manifest_hash
  });
  assert.ok(validateCompartmentStateTransitionReceipt(unchangedAtomMapHold, mapHoldContext)
    .includes("compartment_transition_manifest_projection_mismatch"));
  const missingDeltaCauseRef = {
    ...holdCauseRef, object_id: "economic-mutation-map-hold-missing-delta",
    object_hash: `sha-256:${"d".repeat(64)}`
  };
  const missingDeltaCause = {
    ...mapHoldCause, economic_mutation_id: missingDeltaCauseRef.object_id,
    proposed_semantic_atom_deltas_root: canonicalHash([]),
    core_hash: missingDeltaCauseRef.object_hash
  };
  const missingDeltaManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    ...mapHoldManifest, subject_ref: missingDeltaCauseRef, subject_hash: missingDeltaCauseRef.object_hash,
    entry_count: 0, sorted_entries: [], entries_root: canonicalHash([])
  });
  const missingDeltaReceipt = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...mapHoldReceipt, economic_mutation_cause_core_ref: missingDeltaCauseRef,
    economic_mutation_cause_core_hash: missingDeltaCauseRef.object_hash,
    economic_atom_delta_manifest_ref: refFor(missingDeltaManifest),
    economic_atom_delta_manifest_hash: missingDeltaManifest.manifest_hash
  });
  const missingDeltaContext = {
    ...mapHoldContext,
    objectResolver: new Map(mapHoldContext.objectResolver)
      .set(missingDeltaCauseRef.object_hash, missingDeltaCause)
      .set(refFor(missingDeltaManifest).object_hash, missingDeltaManifest)
  };
  assert.ok(validateCompartmentStateTransitionReceipt(missingDeltaReceipt, missingDeltaContext)
    .includes("phase1_external_protection_attestation_unsupported"));
  const unexpectedEvent = {
    schema: "cairn.confirmed_economic_event_entry.v0.1",
    confirmed_event_key: `sha-256:${"e".repeat(64)}`,
    economic_resource_key: fixture.state.economic_resource_key,
    compartment_control_key: fixture.state.compartment_control_key,
    event_kind: "confirmed_debit", receiver_event_import_ref: distinctRefs(1, "confirmed-event-import")[0],
    receiver_event_import_hash: null, obligation_exposure_id: `sha-256:${"f".repeat(64)}`,
    component_ids_root: `sha-256:${"1".repeat(64)}`,
    amount: { amount_minor: 50, asset: "USD" }, accounting_policy_ref: distinctRefs(1, "accounting-policy")[0],
    accounting_policy_hash: null, event_hash: `sha-256:${"2".repeat(64)}`,
    authority_service_signature: stubExternalSignature(`sha-256:${"2".repeat(64)}`)
  };
  unexpectedEvent.receiver_event_import_hash = unexpectedEvent.receiver_event_import_ref.object_hash;
  unexpectedEvent.accounting_policy_hash = unexpectedEvent.accounting_policy_ref.object_hash;
  const unexpectedEventRef = {
    schema: unexpectedEvent.schema, object_id: unexpectedEvent.confirmed_event_key,
    object_hash: unexpectedEvent.event_hash
  };
  const unexpectedEventMap = enumerableMapForExternalEntries(
    "compartment_confirmed_event", "unexpected-confirmed-event", "compartment_confirmed_event",
    [{ entryKey: unexpectedEvent.confirmed_event_key, entryObject: unexpectedEvent, entryRef: unexpectedEventRef }]
  );
  const unexpectedEventState = make("cairn.compartment_state_head.v0.1", {
    ...after, confirmed_event_manifest_ref: refFor(unexpectedEventMap.map),
    confirmed_event_manifest_hash: unexpectedEventMap.map.map_hash, confirmed_event_count: 1,
    confirmed_spent: { amount_minor: 50, asset: "USD" },
    confirmed_spend_events_root: compartmentConfirmedEventSubsetRoot("confirmed_debit", unexpectedEventMap.leaves)
  });
  const unexpectedEventTransition = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...transition, after_head_ref: refFor(unexpectedEventState), after_head_hash: unexpectedEventState.state_hash,
    confirmed_event_manifest_after_ref: refFor(unexpectedEventMap.map),
    confirmed_event_manifest_after_hash: unexpectedEventMap.map.map_hash
  });
  const unexpectedEventContext = {
    ...transitionContext, requireDependencySignatures: false,
    objectResolver: new Map([
      ...transitionContext.objectResolver,
      ...unexpectedEventMap.nodes.map((object) => [refFor(object).object_hash, object]),
      [refFor(unexpectedEventMap.map).object_hash, unexpectedEventMap.map],
      [unexpectedEventRef.object_hash, unexpectedEvent],
      [refFor(unexpectedEventState).object_hash, unexpectedEventState]
    ])
  };
  assert.ok(validateCompartmentStateTransitionReceipt(unexpectedEventTransition, unexpectedEventContext)
    .includes("phase1_external_protection_attestation_unsupported"));

  const badProjection = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...transition,
    reservation_manifest_after_ref: refFor(fixture.events.map),
    reservation_manifest_after_hash: fixture.events.map.map_hash
  });
  assert.ok(validateCompartmentStateTransitionReceipt(badProjection, transitionContext)
    .includes("phase1_external_protection_attestation_unsupported"));

  const holdCore = {
    ...causeCore, economic_mutation_id: "economic-mutation-empty-hold-1", cause_kind: "reservation_hold",
    authority_transaction_id: "compartment-empty-hold-1", core_hash: `sha-256:${"5".repeat(64)}`
  };
  const holdRef = { schema: holdCore.schema, object_id: holdCore.economic_mutation_id, object_hash: holdCore.core_hash };
  const holdManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    ...deltaManifest, subject_ref: holdRef, subject_hash: holdCore.core_hash,
    authority_transaction_id: holdCore.authority_transaction_id
  });
  const emptyHold = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...transition, cause: "reservation_hold", economic_mutation_cause_core_ref: holdRef,
    economic_mutation_cause_core_hash: holdCore.core_hash,
    economic_atom_delta_manifest_ref: refFor(holdManifest),
    economic_atom_delta_manifest_hash: holdManifest.manifest_hash,
    authority_transaction_id: holdCore.authority_transaction_id
  });
  const emptyHoldContext = {
    ...transitionContext,
    objectResolver: new Map([
      ...transitionContext.objectResolver,
      [holdRef.object_hash, holdCore], [refFor(holdManifest).object_hash, holdManifest]
    ])
  };
  assert.ok(validateCompartmentStateTransitionReceipt(emptyHold, emptyHoldContext)
    .includes("phase1_external_protection_attestation_unsupported"));

  const nonemptyClosed = make("cairn.compartment_state_head.v0.1", {
    ...after, state: "closed", cairn_reserved: { amount_minor: 1, asset: "USD" }
  });
  const closeCore = {
    ...causeCore, economic_mutation_id: "economic-mutation-close-1", cause_kind: "close",
    authority_transaction_id: "compartment-close-1", core_hash: `sha-256:${"6".repeat(64)}`
  };
  const closeRef = { schema: closeCore.schema, object_id: closeCore.economic_mutation_id, object_hash: closeCore.core_hash };
  const closeManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    ...deltaManifest, subject_ref: closeRef, subject_hash: closeCore.core_hash,
    authority_transaction_id: closeCore.authority_transaction_id
  });
  const invalidClose = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...transition, cause: "close", after_head_ref: refFor(nonemptyClosed), after_head_hash: nonemptyClosed.state_hash,
    economic_mutation_cause_core_ref: closeRef, economic_mutation_cause_core_hash: closeCore.core_hash,
    economic_atom_delta_manifest_ref: refFor(closeManifest), economic_atom_delta_manifest_hash: closeManifest.manifest_hash,
    authority_transaction_id: closeCore.authority_transaction_id
  });
  const invalidCloseContext = {
    ...transitionContext,
    objectResolver: new Map([
      ...transitionContext.objectResolver, [refFor(nonemptyClosed).object_hash, nonemptyClosed],
      [closeRef.object_hash, closeCore], [refFor(closeManifest).object_hash, closeManifest]
    ])
  };
  assert.ok(validateCompartmentStateTransitionReceipt(invalidClose, invalidCloseContext)
    .includes("phase1_external_protection_attestation_unsupported"));
  const earlySigned = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...transition,
    authority_service_signature: { ...transition.authority_service_signature, signed_at: "2026-07-22T10:00:59Z" }
  });
  assert.ok(validateCompartmentStateTransitionReceipt(earlySigned, transitionContext)
    .includes("phase1_external_protection_attestation_unsupported"));
});

test("mandate v0.3 keeps financial and nonfinancial authority branches disjoint", () => {
  const valid = validMandate();
  assert.deepEqual(validateMandate(valid, context), []);
  const crossAsset = structuredClone(valid);
  crossAsset.constraints.financial.fee_limit.asset = "EUR";
  const reboundCrossAsset = bindObjectHash(crossAsset, schemasByObjectId.get(crossAsset.schema));
  assert.ok(validateMandate(reboundCrossAsset, context).includes("mandate_financial_asset_mismatch"));
  const connectionAuthorization = context.objectResolver.get(valid.agent.connection_authorization_ref.object_hash);
  const runtime = context.objectResolver.get(valid.agent.runtime_binding_ref.object_hash);
  assert.deepEqual(validateConnectionAuthorization(connectionAuthorization, context), []);
  const unresolvedAuthorizationContext = { ...context, objectResolver: new Map() };
  assert.ok(validateConnectionAuthorization(connectionAuthorization, unresolvedAuthorizationContext)
    .includes("connection_authorization_runtime_unresolved"));
  assert.ok(validateExactObjectRead(
    "execution.connection_authorization.get", { ref: refFor(connectionAuthorization) },
    connectionAuthorization, unresolvedAuthorizationContext
  ).includes("object_read_connection_authorization_runtime_unresolved"));
  const connectionState = make("cairn.agent_connection_state_head.v0.1", {
    principal_id: valid.principal_id,
    connection_authorization_ref: refFor(connectionAuthorization),
    connection_authorization_hash: connectionAuthorization.authorization_hash,
    agent_runtime_binding_ref: valid.agent.runtime_binding_ref,
    sequence: 0, previous_state_hash: null,
    accepted_at: "2026-07-22T09:00:00Z", updated_at: "2026-07-22T09:00:00Z", state: "active"
  });
  const connectionStateContext = {
    ...context,
    objectResolver: new Map([
      [refFor(connectionAuthorization).object_hash, connectionAuthorization],
      [valid.agent.runtime_binding_ref.object_hash, runtime],
      [refFor(connectionState).object_hash, connectionState]
    ]),
    currentHeadResolver: currentHeadResolverFor([refFor(connectionState)]),
    requireCurrentConnection: true
  };
  assert.deepEqual(validateConnectionStateHead(connectionState, connectionStateContext), []);
  const staleConnectionRef = { ...refFor(connectionState), object_hash: `sha-256:${"9".repeat(64)}` };
  const staleConnectionContext = {
    ...connectionStateContext, currentHeadResolver: currentHeadResolverFor([staleConnectionRef])
  };
  assert.ok(validateConnectionStateHead(connectionState, staleConnectionContext)
    .includes("connection_state_not_current"));
  assert.ok(validateExactObjectRead(
    "execution.connection_state.get", { ref: refFor(connectionState) }, connectionState, staleConnectionContext
  ).includes("object_read_connection_state_not_current"));
  const underboundedAuthorization = make("cairn.agent_connection_authorization.v0.1", {
    ...connectionAuthorization, not_before: "2026-07-22T08:00:00Z"
  });
  const underboundedMandate = make("cairn.agent_mandate.v0.3", {
    ...valid, agent: { ...valid.agent, connection_authorization_ref: refFor(underboundedAuthorization) }
  });
  const underboundedContext = {
    ...context,
    objectResolver: new Map([
      ...context.objectResolver,
      [refFor(underboundedAuthorization).object_hash, underboundedAuthorization]
    ])
  };
  assert.ok(validateMandate(underboundedMandate, underboundedContext)
    .includes("mandate_connection_authorization_mismatch"));
  assert.ok(validateMandate(valid, { ...context, objectResolver: new Map() })
    .includes("mandate_runtime_unresolved"));
  assert.ok(validateExactObjectRead("execution.mandate.get", { ref: refFor(valid) }, valid, {
    ...context, objectResolver: new Map()
  }).includes("object_read_mandate_runtime_unresolved"));
  const expiringAuthorization = make("cairn.agent_connection_authorization.v0.1", {
    principal_id: valid.principal_id, agent_runtime_binding_ref: valid.agent.runtime_binding_ref,
    not_before: "2026-07-22T09:00:00Z", expires_at: "2026-07-22T10:00:30Z"
  });
  const expiredConnectionMandate = make("cairn.agent_mandate.v0.3", {
    ...valid, agent: { ...valid.agent, connection_authorization_ref: refFor(expiringAuthorization) }
  });
  const expiredConnectionContext = {
    ...context,
    objectResolver: new Map([
      ...context.objectResolver,
      [refFor(expiringAuthorization).object_hash, expiringAuthorization]
    ])
  };
  assert.ok(validateMandate(expiredConnectionMandate, expiredConnectionContext)
    .includes("mandate_runtime_connection_interval_mismatch"));
  const both = validMandate();
  both.constraints.nonfinancial = { maximum_payload_bytes: 1, allowed_audiences: ["a"] };
  const rebound = bindObjectHash(both, schemasByObjectId.get(both.schema));
  assert.ok(validateMandate(rebound, context).includes("mandate_financial_union_mismatch"));
  const delegated = validMandate({ max_delegation_depth: 1 });
  assert.ok(validateMandate(delegated, context).includes("phase1_object_schema_invalid"));
  const paymentAsNonfinancial = validMandate({ capability: "authorize_payment" });
  paymentAsNonfinancial.constraints.kind = "nonfinancial";
  paymentAsNonfinancial.constraints.financial = null;
  paymentAsNonfinancial.constraints.nonfinancial = { maximum_payload_bytes: 1024, allowed_audiences: ["buyer"] };
  const reboundPayment = bindObjectHash(paymentAsNonfinancial, schemasByObjectId.get(paymentAsNonfinancial.schema));
  assert.ok(validateMandate(reboundPayment, context).includes("phase1_object_schema_invalid"));
  const noticeAsFinancial = validMandate({ capability: "send_typed_nonbinding_notice" });
  assert.ok(validateMandate(noticeAsFinancial, context).includes("phase1_object_schema_invalid"));
  const overBound = validMandate();
  overBound.scope_bindings = Array.from({ length: 65 }, () => structuredClone(overBound.scope_bindings[0]));
  const reboundOverBound = bindObjectHash(overBound, schemasByObjectId.get(overBound.schema));
  assert.ok(validateMandate(reboundOverBound, context).includes("phase1_object_schema_invalid"));
  const aggregateArrayOverflow = validMandate();
  aggregateArrayOverflow.scope_bindings = Array.from({ length: 64 }, (_, bindingIndex) => ({
    ...structuredClone(aggregateArrayOverflow.scope_bindings[0]),
    intent_refs: distinctRefs(64, `aggregate-intent-${bindingIndex}`)
  }));
  const reboundAggregateArrayOverflow = bindObjectHash(aggregateArrayOverflow, schemasByObjectId.get(aggregateArrayOverflow.schema));
  assert.ok(validateMandate(reboundAggregateArrayOverflow, context).includes("phase1_total_inline_array_entries_exceeded"));
  const financialLeak = validMandate({ capability: "request_evidence" });
  financialLeak.constraints.kind = "nonfinancial";
  financialLeak.constraints.financial = null;
  financialLeak.constraints.nonfinancial = { maximum_payload_bytes: 1024, allowed_audiences: ["buyer"] };
  const reboundFinancialLeak = bindObjectHash(financialLeak, schemasByObjectId.get(financialLeak.schema));
  assert.ok(validateMandate(reboundFinancialLeak, context).includes("mandate_nonfinancial_scope_leaks_financial_authority"));
  const scopeHashDrift = validMandate();
  scopeHashDrift.scope_bindings[0].provider_account_identity_trust_overlay_head_hash = `sha-256:${"9".repeat(64)}`;
  const reboundScopeHashDrift = bindObjectHash(scopeHashDrift, schemasByObjectId.get(scopeHashDrift.schema));
  assert.ok(validateMandate(reboundScopeHashDrift, context).includes("mandate_scope_ref_hash_mismatch"));
  const missingReceiverScope = validMandate();
  missingReceiverScope.scope_bindings[0].receiver_operation_namespace = null;
  const reboundMissingReceiverScope = bindObjectHash(missingReceiverScope, schemasByObjectId.get(missingReceiverScope.schema));
  assert.ok(validateMandate(reboundMissingReceiverScope, context).includes("mandate_external_receiver_scope_incomplete"));
  const cancellationMandate = validMandate({ capability: "cancel_receiver_action" });
  cancellationMandate.constraints.kind = "nonfinancial";
  cancellationMandate.constraints.financial = null;
  cancellationMandate.constraints.nonfinancial = { maximum_payload_bytes: 1024, allowed_audiences: ["receiver"] };
  for (const field of [
    "asset", "compartment_ref", "economic_resource_key", "provider_account_identity_head_ref", "account_generation",
    "provider_account_identity_trust_overlay_head_ref", "provider_account_identity_trust_overlay_head_hash",
    "provider_sublimit_identity_head_ref", "provider_sublimit_identity_head_hash", "provider_sublimit_id", "sublimit_generation",
    "provider_sublimit_identity_trust_overlay_head_ref", "provider_sublimit_identity_trust_overlay_head_hash",
    "accounting_policy_ref", "payee_account_commitment", "rail"
  ]) cancellationMandate.scope_bindings[0][field] = null;
  const reboundCancellationMandate = bindObjectHash(cancellationMandate, schemasByObjectId.get(cancellationMandate.schema));
  assert.ok(validateMandate(reboundCancellationMandate, context).includes("phase1_object_schema_invalid"));
  const overWindowBound = validMandate();
  overWindowBound.constraints.financial.window_limits = Array.from({ length: 33 }, (_, index) => ({
    amount: { amount_minor: index + 1, asset: "USD" }, window_kind: "rolling", window_seconds: 60 + index
  }));
  const reboundOverWindowBound = bindObjectHash(overWindowBound, schemasByObjectId.get(overWindowBound.schema));
  assert.ok(validateMandate(reboundOverWindowBound, context).includes("phase1_object_schema_invalid"));
});

test("lineage commitments do not accept runtime-chosen or cross-branch mandate state", () => {
  const value = make("cairn.lineage_commitment.v0.1", {
    authority_kind: "preauthorized_mandate", mandate_ref: sampleFor(resolveRef("https://cairn.cards/protocol/execution/schemas/v0.1/common.schema.json#/$defs/objectRef", schemasById.values().next().value).schema),
    scope_binding_index: 0, prior_lineage_state: "none", prior_lineage_receipt_ref: null
  });
  assert.deepEqual(validateLineageCommitment(value, context), []);
  const crossed = make("cairn.lineage_commitment.v0.1", { authority_kind: "supervised_pending", mandate_ref: value.mandate_ref, scope_binding_index: 0 });
  assert.ok(validateLineageCommitment(crossed, context).includes("lineage_nonmandate_authority_mismatch"));
});

test("binding sets separate direct principals from connected runtimes and bind the exact release", () => {
  const mandate = validMandate();
  const runtime = context.objectResolver.get(mandate.agent.runtime_binding_ref.object_hash);
  const authorization = context.objectResolver.get(mandate.agent.connection_authorization_ref.object_hash);
  const connection = make("cairn.agent_connection_state_head.v0.1", {
    principal_id: mandate.principal_id,
    connection_authorization_ref: refFor(authorization),
    connection_authorization_hash: authorization.authorization_hash,
    agent_runtime_binding_ref: mandate.agent.runtime_binding_ref,
    sequence: 0,
    previous_state_hash: null,
    accepted_at: "2026-07-22T09:30:00Z",
    updated_at: "2026-07-22T09:30:00Z",
    state: "active"
  });
  const value = make("cairn.execution_binding_set.v0.1", {
    execution_bundle_hash: built.bundle.bundle_hash,
    operation_registry_hash: audit.operationRegistryHash,
    actor_branch: "agent_runtime",
    principal_id: mandate.principal_id,
    agent_runtime_binding_ref: mandate.agent.runtime_binding_ref,
    connection_authorization_ref: refFor(authorization),
    connection_state_head_ref: refFor(connection),
    cancellation_context: null,
    capability: "send_typed_nonbinding_notice",
    created_at: "2026-07-22T10:00:00Z",
    expires_at: "2026-07-22T10:05:00Z"
  });
  const graphContext = signedReadContext([runtime, authorization, connection], {
    ...context,
    objectResolver: new Map([
      [mandate.agent.runtime_binding_ref.object_hash, runtime],
      [refFor(authorization).object_hash, authorization],
      [refFor(connection).object_hash, connection]
    ]),
    currentHeadResolver: currentHeadResolverFor([refFor(connection)])
  }, value.principal_id);
  assert.deepEqual(validateBindingSet(value, graphContext), []);
  const invalidRuntimeSignature = structuredClone(runtime);
  invalidRuntimeSignature.provider_signature.value = "A".repeat(86);
  assert.ok(validateBindingSet(value, {
    ...graphContext,
    objectResolver: new Map([
      [mandate.agent.runtime_binding_ref.object_hash, invalidRuntimeSignature],
      [refFor(authorization).object_hash, authorization],
      [refFor(connection).object_hash, connection]
    ])
  }).includes("binding_runtime_graph_mismatch"));
  const invalidAuthorizationSignature = structuredClone(authorization);
  invalidAuthorizationSignature.principal_signature.value = "A".repeat(86);
  assert.ok(validateBindingSet(value, {
    ...graphContext,
    objectResolver: new Map([
      [mandate.agent.runtime_binding_ref.object_hash, runtime],
      [refFor(authorization).object_hash, invalidAuthorizationSignature],
      [refFor(connection).object_hash, connection]
    ])
  }).includes("binding_connection_authorization_graph_mismatch"));
  const staleConnectionRef = { ...refFor(connection), object_hash: `sha-256:${"8".repeat(64)}` };
  assert.ok(validateBindingSet(value, {
    ...graphContext, currentHeadResolver: currentHeadResolverFor([staleConnectionRef])
  }).includes("binding_connection_state_graph_mismatch"));
  const proxyStaleConnectionContext = new Proxy({
    ...graphContext, currentHeadResolver: currentHeadResolverFor([staleConnectionRef])
  }, {
    get(target, property, receiver) {
      return typeof property === "symbol" ? true : Reflect.get(target, property, receiver);
    }
  });
  assert.ok(validateBindingSet(value, proxyStaleConnectionContext)
    .includes("binding_connection_state_graph_mismatch"));
  const observedHistoricalConnectionTimes = [];
  const historicalBindingContext = signedReadContext([value, runtime, authorization, connection], {
    ...graphContext,
    currentHeadHistoryResolver: (reference, evaluationTime) => {
      observedHistoricalConnectionTimes.push(evaluationTime);
      return reference;
    }
  }, value.principal_id);
  assert.ok(validateExactObjectRead(
    "execution.binding_set.get", { ref: refFor(value) }, value, historicalBindingContext
  ).includes("phase1_authenticated_resolution_unsupported"));
  assert.ok(observedHistoricalConnectionTimes.length > 0);
  assert.ok(observedHistoricalConnectionTimes.every((instant) => instant === value.created_at));
  assert.ok(validateExactObjectRead(
    "execution.binding_set.get", { ref: refFor(value) }, value,
    { ...historicalBindingContext, currentHeadHistoryResolver: null }
  ).includes("object_read_binding_connection_state_graph_mismatch"));
  const beforeConnection = make("cairn.execution_binding_set.v0.1", {
    ...value, created_at: "2026-07-22T09:00:00Z"
  });
  assert.ok(validateBindingSet(beforeConnection, graphContext)
    .includes("binding_runtime_graph_interval_mismatch"));
  const beyondRuntime = make("cairn.execution_binding_set.v0.1", {
    ...value, expires_at: "2026-07-25T10:05:00Z"
  });
  assert.ok(validateBindingSet(beyondRuntime, graphContext)
    .includes("binding_runtime_graph_interval_mismatch"));
  const crossWiredAuthorizationRef = distinctRefs(1, "cross-wired-connection-authorization")[0];
  const crossWiredGraph = make("cairn.execution_binding_set.v0.1", {
    ...value, connection_authorization_ref: {
      ...crossWiredAuthorizationRef, schema: "cairn.agent_connection_authorization.v0.1"
    }
  });
  assert.ok(validateBindingSet(crossWiredGraph, graphContext)
    .includes("binding_connection_authorization_graph_mismatch"));
  const crossed = make("cairn.execution_binding_set.v0.1", { ...value, actor_branch: "principal_direct" });
  assert.ok(validateBindingSet(crossed, context).includes("binding_principal_branch_leaks_runtime"));
  const stale = make("cairn.execution_binding_set.v0.1", { ...value, execution_bundle_hash: `sha-256:${"f".repeat(64)}` });
  assert.ok(validateBindingSet(stale, context).includes("binding_release_mismatch"));
  const grantTemplate = structuredClone(value.action_proposal_ref);
  const dataGrantSchema = baseSchemasByObjectId.get("cairn.data_grant.v0.1");
  const dataGrantSeed = sampleFor(dataGrantSchema);
  dataGrantSeed.principal_id = value.principal_id;
  dataGrantSeed.recipient = runtime.agent_identity.runtime_instance_key_id;
  dataGrantSeed.audience = [runtime.agent_identity.runtime_instance_key_id];
  dataGrantSeed.purpose = "read";
  dataGrantSeed.maximum_disclosures = 3;
  dataGrantSeed.issued_at = "2026-07-22T09:00:00Z";
  dataGrantSeed.expires_at = "2026-07-22T11:00:00Z";
  dataGrantSeed.retention.expires_at = "2026-07-22T11:00:00Z";
  const dataGrant = bindObjectHash(dataGrantSeed, dataGrantSchema);
  const dataGrantRef = objectRefFor(dataGrant, dataGrantSchema);
  const dataGrantState = make("cairn.data_grant_state_head.v0.1", {
    principal_id: value.principal_id, data_grant_ref: dataGrantRef,
    sequence: 0, previous_state_hash: null, state: "active", revocation_nonce: dataGrant.revocation_nonce,
    remaining_reads: 3, maximum_response_bytes: 65536, maximum_response_items: 128,
    query_bound: { kind: "temporal", maximum_range_seconds: 86400, maximum_keys_or_partitions: null },
    expires_at: dataGrant.expires_at, updated_at: "2026-07-22T10:00:00Z"
  });
  const dataGrantBinding = make("cairn.execution_binding_set.v0.1", {
    ...value, data_grant_refs: [dataGrantRef],
    data_grant_state_heads: [dataGrantHead(
      dataGrantRef, refFor(dataGrantState), dataGrantState.revocation_nonce, dataGrant
    )]
  });
  const dataGrantContext = signedReadContext(
    [runtime, authorization, connection, dataGrant, dataGrantState], {
      ...graphContext,
      objectResolver: new Map([
        ...graphContext.objectResolver,
        [dataGrantRef.object_hash, dataGrant], [refFor(dataGrantState).object_hash, dataGrantState]
      ]),
      currentHeadResolver: currentHeadResolverFor([refFor(connection), refFor(dataGrantState)]),
      requireDependencySignatures: true
    }, value.principal_id
  );
  assert.deepEqual(validateDataGrantStateHead(dataGrantState, dataGrantContext), []);
  const mismatchedGrantGenesis = make("cairn.data_grant_state_head.v0.1", {
    ...dataGrantState, remaining_reads: 2
  });
  assert.ok(validateDataGrantStateHead(mismatchedGrantGenesis, dataGrantContext)
    .includes("data_grant_state_genesis_mismatch"));
  assert.deepEqual(validateBindingSet(dataGrantBinding, dataGrantContext), []);
  const widenedAudienceSeed = structuredClone(dataGrant);
  widenedAudienceSeed.audience = [...dataGrant.audience, "cairn:test:foreign-runtime"].sort();
  const widenedAudience = bindObjectHash(widenedAudienceSeed, dataGrantSchema);
  const widenedAudienceRef = objectRefFor(widenedAudience, dataGrantSchema);
  const widenedAudienceState = make("cairn.data_grant_state_head.v0.1", {
    ...dataGrantState, data_grant_ref: widenedAudienceRef
  });
  const widenedAudienceBinding = make("cairn.execution_binding_set.v0.1", {
    ...dataGrantBinding,
    data_grant_refs: [widenedAudienceRef],
    data_grant_state_heads: [dataGrantHead(
      widenedAudienceRef, refFor(widenedAudienceState), widenedAudienceState.revocation_nonce, widenedAudience
    )]
  });
  const widenedAudienceContext = signedReadContext([widenedAudience, widenedAudienceState], {
    ...dataGrantContext,
    objectResolver: new Map(dataGrantContext.objectResolver)
      .set(widenedAudienceRef.object_hash, widenedAudience)
      .set(refFor(widenedAudienceState).object_hash, widenedAudienceState),
    currentHeadResolver: currentHeadResolverFor([refFor(connection), refFor(widenedAudienceState)])
  }, value.principal_id);
  const widenedAudienceFailures = validateBindingSet(widenedAudienceBinding, widenedAudienceContext);
  assert.ok(widenedAudienceFailures.includes("binding_data_grant_runtime_recipient_mismatch"),
    widenedAudienceFailures.join(","));
  const pausedGrantState = make("cairn.data_grant_state_head.v0.1", {
    ...dataGrantState, sequence: 1, previous_state_hash: dataGrantState.state_hash,
    state: "paused", remaining_reads: dataGrantState.remaining_reads
  });
  const pausedGrantBinding = make("cairn.execution_binding_set.v0.1", {
    ...dataGrantBinding,
    data_grant_state_heads: [dataGrantHead(
      dataGrantRef, refFor(pausedGrantState), pausedGrantState.revocation_nonce, dataGrant
    )]
  });
  assert.ok(validateBindingSet(pausedGrantBinding, {
    ...dataGrantContext,
    objectResolver: new Map(dataGrantContext.objectResolver)
      .set(refFor(pausedGrantState).object_hash, pausedGrantState),
    currentHeadResolver: currentHeadResolverFor([refFor(connection), refFor(pausedGrantState)])
  }).includes("binding_data_grant_state_ineligible"));
  const wrongGrantPurposeBinding = make("cairn.execution_binding_set.v0.1", {
    ...dataGrantBinding,
    data_grant_state_heads: [{
      ...dataGrantBinding.data_grant_state_heads[0], required_purpose: "wrong_purpose"
    }]
  });
  assert.ok(validateBindingSet(wrongGrantPurposeBinding, dataGrantContext)
    .includes("binding_data_grant_scope_mismatch"));
  const wrongGrantUsesBinding = make("cairn.execution_binding_set.v0.1", {
    ...dataGrantBinding,
    data_grant_state_heads: [{
      ...dataGrantBinding.data_grant_state_heads[0], required_uses: ["derive"]
    }]
  });
  assert.ok(validateBindingSet(wrongGrantUsesBinding, dataGrantContext)
    .includes("binding_data_grant_scope_mismatch"));
  const wrongGrantScopeBinding = make("cairn.execution_binding_set.v0.1", {
    ...dataGrantBinding,
    data_grant_state_heads: [{
      ...dataGrantBinding.data_grant_state_heads[0],
      required_resource_scopes_root: `sha-256:${"9".repeat(64)}`
    }]
  });
  assert.ok(validateBindingSet(wrongGrantScopeBinding, dataGrantContext)
    .includes("binding_data_grant_scope_mismatch"));
  const zeroReadGrantState = make("cairn.data_grant_state_head.v0.1", {
    ...dataGrantState, remaining_reads: 0
  });
  const zeroReadGrantBinding = make("cairn.execution_binding_set.v0.1", {
    ...dataGrantBinding,
    data_grant_state_heads: [dataGrantHead(
      dataGrantRef, refFor(zeroReadGrantState), zeroReadGrantState.revocation_nonce, dataGrant
    )]
  });
  const zeroReadGrantContext = signedReadContext([zeroReadGrantState], {
    ...dataGrantContext,
    objectResolver: new Map(dataGrantContext.objectResolver)
      .set(refFor(zeroReadGrantState).object_hash, zeroReadGrantState),
    currentHeadResolver: currentHeadResolverFor([refFor(connection), refFor(zeroReadGrantState)])
  }, value.principal_id);
  assert.ok(validateBindingSet(zeroReadGrantBinding, zeroReadGrantContext)
    .includes("binding_data_grant_state_ineligible"));
  const exhaustedGrantState = make("cairn.data_grant_state_head.v0.1", {
    ...dataGrantState, sequence: 1, previous_state_hash: dataGrantState.state_hash,
    state: "exhausted", remaining_reads: 0, updated_at: "2026-07-22T10:01:00Z"
  });
  const exhaustedGrantDisclosureSchema = resolveRef(
      "https://cairn.cards/protocol/execution/schemas/v0.1/common.schema.json#/$defs/disclosure",
      schemasById.values().next().value
    );
  const exhaustedGrantDisclosure = {
    ...sampleFor(exhaustedGrantDisclosureSchema.schema, exhaustedGrantDisclosureSchema.document),
    source_read_next_state_head_ref: refFor(exhaustedGrantState),
    source_read_next_state_head_hash: exhaustedGrantState.state_hash
  };
  const exhaustedGrantBinding = make("cairn.execution_binding_set.v0.1", {
    ...dataGrantBinding,
    disclosures: [exhaustedGrantDisclosure],
    data_grant_state_heads: [dataGrantHead(
      dataGrantRef, refFor(exhaustedGrantState), exhaustedGrantState.revocation_nonce, dataGrant
    )]
  });
  const exhaustedGrantContext = signedReadContext([exhaustedGrantState], {
    ...dataGrantContext,
    objectResolver: new Map(dataGrantContext.objectResolver)
      .set(refFor(exhaustedGrantState).object_hash, exhaustedGrantState),
    currentHeadResolver: currentHeadResolverFor([refFor(connection), refFor(exhaustedGrantState)]),
    statePredecessorResolver: (reference) => sameObjectRef(reference, refFor(dataGrantState))
      ? dataGrantState : null
  }, value.principal_id);
  assert.ok(validateBindingSet(exhaustedGrantBinding, exhaustedGrantContext)
    .includes("phase1_object_schema_invalid"));
  const revokedGrantState = make("cairn.data_grant_state_head.v0.1", {
    ...dataGrantState, state: "revoked", remaining_reads: 0,
    revocation_nonce: dataGrantState.revocation_nonce + 1
  });
  const revokedGrantBinding = make("cairn.execution_binding_set.v0.1", {
    ...dataGrantBinding,
    data_grant_state_heads: [dataGrantHead(
      dataGrantRef, refFor(revokedGrantState), revokedGrantState.revocation_nonce, dataGrant
    )]
  });
  const revokedGrantContext = signedReadContext([revokedGrantState], {
    ...dataGrantContext,
    objectResolver: new Map(dataGrantContext.objectResolver)
      .set(refFor(revokedGrantState).object_hash, revokedGrantState),
    currentHeadResolver: currentHeadResolverFor([refFor(connection), refFor(revokedGrantState)])
  }, value.principal_id);
  assert.ok(validateBindingSet(revokedGrantBinding, revokedGrantContext)
    .includes("binding_data_grant_state_ineligible"));
  const overGrantLifetimeBinding = make("cairn.execution_binding_set.v0.1", {
    ...dataGrantBinding, expires_at: "2026-07-22T11:00:01Z"
  });
  assert.ok(validateBindingSet(overGrantLifetimeBinding, dataGrantContext)
    .includes("binding_data_grant_interval_mismatch"));
  const foreignGrantSeed = structuredClone(dataGrant);
  foreignGrantSeed.grant_id = "foreign-principal-data-grant";
  foreignGrantSeed.principal_id = "did:example:foreign-data-grant-principal";
  const foreignGrant = bindObjectHash(foreignGrantSeed, dataGrantSchema);
  const foreignPrincipalGrantRef = objectRefFor(foreignGrant, dataGrantSchema);
  const foreignGrantState = make("cairn.data_grant_state_head.v0.1", {
    ...dataGrantState, data_grant_state_id: "00000000-0000-4000-8000-000000000099",
    principal_id: foreignGrant.principal_id, data_grant_ref: foreignPrincipalGrantRef,
    revocation_nonce: foreignGrant.revocation_nonce, expires_at: foreignGrant.expires_at
  });
  const foreignGrantBinding = make("cairn.execution_binding_set.v0.1", {
    ...dataGrantBinding, data_grant_refs: [foreignPrincipalGrantRef],
    data_grant_state_heads: [dataGrantHead(
      foreignPrincipalGrantRef, refFor(foreignGrantState), foreignGrantState.revocation_nonce, foreignGrant
    )]
  });
  const foreignGrantContext = signedReadContext([foreignGrant, foreignGrantState], {
    ...dataGrantContext,
    objectResolver: new Map(dataGrantContext.objectResolver)
      .set(foreignPrincipalGrantRef.object_hash, foreignGrant)
      .set(refFor(foreignGrantState).object_hash, foreignGrantState),
    currentHeadResolver: currentHeadResolverFor([refFor(connection), refFor(foreignGrantState)])
  }, foreignGrant.principal_id);
  assert.ok(validateBindingSet(foreignGrantBinding, foreignGrantContext)
    .includes("binding_data_grant_principal_mismatch"));
  const wrongRecipientGrantSeed = structuredClone(dataGrant);
  wrongRecipientGrantSeed.grant_id = "wrong-runtime-recipient-data-grant";
  wrongRecipientGrantSeed.recipient = "did:example:provider-wide-agent";
  wrongRecipientGrantSeed.audience = ["did:example:provider-wide-agent"];
  const wrongRecipientGrant = bindObjectHash(wrongRecipientGrantSeed, dataGrantSchema);
  const wrongRecipientGrantRef = objectRefFor(wrongRecipientGrant, dataGrantSchema);
  const wrongRecipientGrantState = make("cairn.data_grant_state_head.v0.1", {
    ...dataGrantState, data_grant_state_id: "00000000-0000-4000-8000-000000000098",
    data_grant_ref: wrongRecipientGrantRef
  });
  const wrongRecipientBinding = make("cairn.execution_binding_set.v0.1", {
    ...dataGrantBinding, data_grant_refs: [wrongRecipientGrantRef],
    data_grant_state_heads: [dataGrantHead(
      wrongRecipientGrantRef, refFor(wrongRecipientGrantState), wrongRecipientGrantState.revocation_nonce,
      wrongRecipientGrant
    )]
  });
  const wrongRecipientContext = signedReadContext([wrongRecipientGrant, wrongRecipientGrantState], {
    ...dataGrantContext,
    objectResolver: new Map(dataGrantContext.objectResolver)
      .set(wrongRecipientGrantRef.object_hash, wrongRecipientGrant)
      .set(refFor(wrongRecipientGrantState).object_hash, wrongRecipientGrantState),
    currentHeadResolver: currentHeadResolverFor([refFor(connection), refFor(wrongRecipientGrantState)])
  }, value.principal_id);
  assert.ok(validateBindingSet(wrongRecipientBinding, wrongRecipientContext)
    .includes("binding_data_grant_runtime_recipient_mismatch"));
  assert.deepEqual(validateExactObjectRead(
    "execution.data_grant_state.get", { ref: refFor(dataGrantState) }, dataGrantState, dataGrantContext
  ), ["phase1_authenticated_resolution_unsupported"]);
  const decrementedGrantState = make("cairn.data_grant_state_head.v0.1", {
    ...dataGrantState, sequence: 1, previous_state_hash: dataGrantState.state_hash,
    state: "active", remaining_reads: 2, updated_at: "2026-07-22T10:01:00Z"
  });
  const grantTransitionContext = signedReadContext(
    [dataGrant, dataGrantState, decrementedGrantState], {
      ...dataGrantContext,
      objectResolver: new Map(dataGrantContext.objectResolver)
        .set(refFor(decrementedGrantState).object_hash, decrementedGrantState),
      statePredecessorResolver: (reference) => sameObjectRef(reference, refFor(dataGrantState))
        ? dataGrantState : null
    }, value.principal_id
  );
  assert.deepEqual(validateDataGrantStateHead(decrementedGrantState, grantTransitionContext), []);
  const expiredGrantState = make("cairn.data_grant_state_head.v0.1", {
    ...dataGrantState, sequence: 1, previous_state_hash: dataGrantState.state_hash,
    state: "expired", remaining_reads: dataGrantState.remaining_reads,
    revocation_nonce: dataGrantState.revocation_nonce + 1,
    updated_at: dataGrantState.expires_at
  });
  assert.deepEqual(validateDataGrantStateHead(expiredGrantState, grantTransitionContext), []);
  const earlyExpiredGrantState = make("cairn.data_grant_state_head.v0.1", {
    ...expiredGrantState, updated_at: "2026-07-22T10:59:59Z"
  });
  assert.ok(validateDataGrantStateHead(earlyExpiredGrantState, grantTransitionContext)
    .includes("data_grant_state_interval_mismatch"));
  const skippedGrantRead = make("cairn.data_grant_state_head.v0.1", {
    ...decrementedGrantState, sequence: 2
  });
  assert.ok(validateDataGrantStateHead(skippedGrantRead, grantTransitionContext)
    .includes("data_grant_state_predecessor_mismatch"));
  const unversionedPause = make("cairn.data_grant_state_head.v0.1", {
    ...decrementedGrantState, state: "paused", remaining_reads: 3,
    revocation_nonce: dataGrantState.revocation_nonce
  });
  assert.ok(validateDataGrantStateHead(unversionedPause, grantTransitionContext)
    .includes("data_grant_state_transition_mismatch"));
  const invalidGrantHeadSignature = structuredClone(dataGrantState);
  invalidGrantHeadSignature.authority_service_signature.value = "A".repeat(86);
  assert.ok(validateBindingSet(dataGrantBinding, {
    ...dataGrantContext,
    objectResolver: new Map(dataGrantContext.objectResolver)
      .set(refFor(dataGrantState).object_hash, invalidGrantHeadSignature)
  }).includes("binding_data_grant_current_head_mismatch"));
  const staleGrantStateRef = {
    ...refFor(dataGrantState), object_hash: `sha-256:${"6".repeat(64)}`
  };
  assert.ok(validateExactObjectRead(
    "execution.data_grant_state.get", { ref: refFor(dataGrantState) }, dataGrantState, {
      ...dataGrantContext,
      currentHeadResolver: currentHeadResolverFor([refFor(connection), staleGrantStateRef])
    }
  ).includes("object_read_current_head_mismatch"));
  assert.ok(validateBindingSet(dataGrantBinding, {
    ...dataGrantContext,
    currentHeadResolver: currentHeadResolverFor([refFor(connection), staleGrantStateRef])
  }).includes("binding_data_grant_current_head_mismatch"));
  const proxyStaleGrantContext = new Proxy({
    ...dataGrantContext,
    currentHeadResolver: currentHeadResolverFor([refFor(connection), staleGrantStateRef])
  }, {
    get(target, property, receiver) {
      return typeof property === "symbol" ? true : Reflect.get(target, property, receiver);
    }
  });
  assert.ok(validateBindingSet(dataGrantBinding, proxyStaleGrantContext)
    .includes("binding_data_grant_current_head_mismatch"));
  const observedHistoricalGrantTimes = [];
  const historicalGrantBindingContext = signedReadContext(
    [dataGrantBinding, runtime, authorization, connection, dataGrant, dataGrantState], {
      ...dataGrantContext,
      currentHeadHistoryResolver: (reference, evaluationTime) => {
        observedHistoricalGrantTimes.push(evaluationTime);
        return reference;
      }
    }, value.principal_id
  );
  assert.ok(validateExactObjectRead(
    "execution.binding_set.get", { ref: refFor(dataGrantBinding) },
    dataGrantBinding, historicalGrantBindingContext
  ).includes("phase1_authenticated_resolution_unsupported"));
  assert.ok(observedHistoricalGrantTimes.length >= 2);
  assert.ok(observedHistoricalGrantTimes.every(
    (instant) => instant === dataGrantBinding.created_at
  ));
  const lateSignedGrantPredecessor = make("cairn.data_grant_state_head.v0.1", {
    ...dataGrantState,
    authority_service_signature: {
      ...dataGrantState.authority_service_signature,
      signed_at: "2026-07-22T12:00:01Z"
    }
  });
  const latePredecessorGrantState = make("cairn.data_grant_state_head.v0.1", {
    ...dataGrantState,
    sequence: 1,
    previous_state_hash: lateSignedGrantPredecessor.state_hash,
    state: "active",
    remaining_reads: dataGrantState.remaining_reads - 1,
    updated_at: dataGrantBinding.created_at
  });
  const latePredecessorBinding = make("cairn.execution_binding_set.v0.1", {
    ...dataGrantBinding,
    data_grant_state_heads: [dataGrantHead(
      dataGrantRef, refFor(latePredecessorGrantState),
      latePredecessorGrantState.revocation_nonce, dataGrant
    )]
  });
  const latePredecessorContext = signedReadContext([
    latePredecessorBinding, runtime, authorization, connection, dataGrant,
    lateSignedGrantPredecessor, latePredecessorGrantState
  ], {
    ...dataGrantContext,
    objectResolver: new Map(dataGrantContext.objectResolver)
      .set(refFor(lateSignedGrantPredecessor).object_hash, lateSignedGrantPredecessor)
      .set(refFor(latePredecessorGrantState).object_hash, latePredecessorGrantState),
    currentHeadHistoryResolver: currentHeadResolverFor([
      refFor(connection), refFor(latePredecessorGrantState)
    ]),
    statePredecessorResolver: (reference) => sameObjectRef(
      reference, refFor(lateSignedGrantPredecessor)
    ) ? lateSignedGrantPredecessor : null
  }, value.principal_id);
  assert.ok(validateExactObjectRead(
    "execution.binding_set.get", { ref: refFor(latePredecessorBinding) },
    latePredecessorBinding, latePredecessorContext
  ).includes("object_read_binding_data_grant_current_head_mismatch"));
  const foreignGrantRef = { ...dataGrantRef, object_id: "foreign-data-grant" };
  const crossGrantState = make("cairn.data_grant_state_head.v0.1", {
    ...dataGrantState, data_grant_ref: foreignGrantRef
  });
  assert.ok(validateDataGrantStateHead(crossGrantState, dataGrantContext)
    .includes("data_grant_state_grant_mismatch"));
  const crossGrantBinding = make("cairn.execution_binding_set.v0.1", {
    ...dataGrantBinding, data_grant_refs: [dataGrantRef],
    data_grant_state_heads: [dataGrantHead(
      dataGrantRef, refFor(crossGrantState), crossGrantState.revocation_nonce, dataGrant
    )]
  });
  assert.ok(validateBindingSet(crossGrantBinding, {
    ...dataGrantContext,
    objectResolver: new Map(dataGrantContext.objectResolver)
      .set(refFor(crossGrantState).object_hash, crossGrantState),
    currentHeadResolver: currentHeadResolverFor([refFor(connection), refFor(crossGrantState)])
  }).includes("binding_data_grant_current_head_mismatch"));
  const tooManyGrants = Array.from({ length: 33 }, (_, index) => ({
    ...grantTemplate, object_id: `grant-${index}`, object_hash: `sha-256:${index.toString(16).padStart(64, "0")}`
  }));
  const overGrantBound = make("cairn.execution_binding_set.v0.1", {
    ...value, data_grant_refs: tooManyGrants, data_grant_state_heads: []
  });
  assert.ok(validateBindingSet(overGrantBound, context).includes("phase1_object_schema_invalid"));
  const missingGrantHead = make("cairn.execution_binding_set.v0.1", {
    ...value, data_grant_refs: [tooManyGrants[1]], data_grant_state_heads: []
  });
  assert.ok(validateBindingSet(missingGrantHead, context).includes("binding_data_grant_head_set_mismatch"));
  const duplicatedGrantHeads = make("cairn.execution_binding_set.v0.1", {
    ...value, data_grant_refs: [tooManyGrants[1], tooManyGrants[2]], data_grant_state_heads: [
      dataGrantHead(tooManyGrants[1], tooManyGrants[3], 0),
      dataGrantHead(tooManyGrants[1], tooManyGrants[4], 0)
    ]
  });
  assert.ok(validateBindingSet(duplicatedGrantHeads, context).includes("binding_data_grant_head_set_mismatch"));
  const currentHeadRef = {
    schema: "cairn.data_grant_state_head.v0.1", object_id: "grant-state-1", object_hash: `sha-256:${"7".repeat(64)}`
  };
  const mismatchedCurrentHead = {
    schema: currentHeadRef.schema, data_grant_ref: tooManyGrants[1], revocation_nonce: 4,
    state_hash: `sha-256:${"6".repeat(64)}`
  };
  const staleGrantHeadBinding = make("cairn.execution_binding_set.v0.1", {
    ...value, data_grant_refs: [tooManyGrants[1]],
    data_grant_state_heads: [dataGrantHead(tooManyGrants[1], currentHeadRef, 4)]
  });
  assert.ok(validateBindingSet(staleGrantHeadBinding, {
    ...context, objectResolver: new Map([[currentHeadRef.object_hash, mismatchedCurrentHead]])
  }).includes("binding_data_grant_current_head_mismatch"));
  const overCopyBound = make("cairn.execution_binding_set.v0.1", {
    ...value, copy_ids: Array.from({ length: 65 }, (_, index) => `copy-${index.toString().padStart(2, "0")}`)
  });
  assert.ok(validateBindingSet(overCopyBound, context).includes("phase1_object_schema_invalid"));
  const refHashDrift = make("cairn.execution_binding_set.v0.1", {
    ...value, action_proposal_hash: `sha-256:${"9".repeat(64)}`
  });
  assert.ok(validateBindingSet(refHashDrift, context).includes("phase1_ref_hash_mismatch"));
  const nonfinancialCheckout = make("cairn.execution_binding_set.v0.1", {
    ...value, checkout_group_core_ref: value.action_proposal_ref,
    checkout_group_core_hash: value.action_proposal_ref.object_hash, checkout_role: "terms_acceptance"
  });
  assert.ok(validateBindingSet(nonfinancialCheckout, context).includes("phase1_object_schema_invalid"));
  const disclosureSchema = resolveRef(
    "https://cairn.cards/protocol/execution/schemas/v0.1/common.schema.json#/$defs/disclosure",
    schemasById.values().next().value
  );
  const disclosure = sampleFor(disclosureSchema.schema, disclosureSchema.document);
  assert.equal(
    schemasByObjectId.get("cairn.execution_binding_set.v0.1").properties.disclosures.maxItems,
    0
  );
  const bindingWithDisclosure = make("cairn.execution_binding_set.v0.1", {
    ...value, disclosures: [disclosure]
  });
  assert.ok(validateBindingSet(bindingWithDisclosure, context)
    .includes("phase1_object_schema_invalid"));
  const disclosureDrift = { ...disclosure, source_read_receipt_hash: `sha-256:${"9".repeat(64)}` };
  const bindingWithDisclosureDrift = make("cairn.execution_binding_set.v0.1", { ...value, disclosures: [disclosureDrift] });
  assert.ok(validateBindingSet(bindingWithDisclosureDrift, context).includes("phase1_object_schema_invalid"));
  const cancellationContextSchema = resolveRef(
    "https://cairn.cards/protocol/execution/schemas/v0.1/common.schema.json#/$defs/cancellationContext",
    schemasById.values().next().value
  );
  const cancellationContext = sampleFor(cancellationContextSchema.schema, cancellationContextSchema.document);
  const originalCancellationAction = make("cairn.action_record.v0.2", { principal_id: value.principal_id });
  const originalCancellationState = make("cairn.action_state_head.v0.1", {
    action_id: originalCancellationAction.action_id, action_ref: refFor(originalCancellationAction),
    state: "submitted", reservation_refs: [value.action_proposal_ref]
  });
  Object.assign(cancellationContext, {
    original_action_ref: refFor(originalCancellationAction), original_action_hash: originalCancellationAction.action_hash,
    original_action_state_head_ref: refFor(originalCancellationState),
    original_action_state_head_hash: originalCancellationState.state_hash,
    original_effect_id: originalCancellationAction.effect_id, expected_original_state: originalCancellationState.state
  });
  const cancellationBinding = make("cairn.execution_binding_set.v0.1", {
    ...value, capability: "cancel_receiver_action", cancellation_context: cancellationContext,
    checkout_group_core_ref: null, checkout_group_core_hash: null, checkout_role: null,
    checkout_reservation_batch_core_ref: null, checkout_reservation_batch_core_hash: null,
    checkout_transition_template_ref: null, checkout_transition_template_hash: null
  });
  const cancellationValidationContext = signedReadContext(
    [originalCancellationAction, originalCancellationState], {
      ...graphContext, originalAction: originalCancellationAction,
      originalActionStateHead: originalCancellationState,
      currentHeadResolver: currentHeadResolverFor([
        refFor(connection), refFor(originalCancellationState)
      ])
    }, value.principal_id
  );
  assert.ok(validateBindingSet(cancellationBinding, cancellationValidationContext)
    .includes("binding_original_action_state_phase1_object_schema_invalid"));
  const driftedCancellationContext = {
    ...cancellationContext, original_action_hash: `sha-256:${"9".repeat(64)}`
  };
  const cancellationBindingDrift = make("cairn.execution_binding_set.v0.1", {
    ...cancellationBinding, cancellation_context: driftedCancellationContext
  });
  assert.ok(validateBindingSet(cancellationBindingDrift, cancellationValidationContext)
    .includes("binding_cancellation_ref_hash_mismatch"));
  const financialTruthRef = value.action_proposal_ref;
  const financialTruthBinding = make("cairn.execution_binding_set.v0.1", {
    ...value, capability: "submit_bindable_offer",
    obligation_exposure_core_ref: financialTruthRef,
    obligation_exposure_core_hash: financialTruthRef.object_hash,
    obligation_exposure_id: financialTruthRef.object_hash,
    obligation_role: "create_or_update",
    exposure_vector: [{ amount_minor: 100, asset: "USD" }],
    fulfillment_attempt_core_ref: null, fulfillment_attempt_core_hash: null,
    payee_account_commitment: null, rail: null,
    ...financialBindingContext(financialTruthRef)
  });
  assert.deepEqual(validateBindingSet(financialTruthBinding, graphContext),
    ["phase1_financial_external_truth_unsupported"]);
});

test("action state is append-only and receiver states require receiver evidence", () => {
  const genesis = make("cairn.action_state_head.v0.1", { sequence: 0, previous_state_hash: null, state: "prepared" });
  assert.deepEqual(validateActionStateTransition(null, genesis, context), []);
  const next = make("cairn.action_state_head.v0.1", {
    action_id: genesis.action_id, action_ref: genesis.action_ref, sequence: 1,
    previous_state_hash: genesis.state_hash, state: "authorized"
  });
  assert.deepEqual(validateActionStateTransition(genesis, next, context), []);
  const prematureActivation = make("cairn.action_state_head.v0.1", {
    action_id: genesis.action_id, action_ref: genesis.action_ref, sequence: 1,
    previous_state_hash: genesis.state_hash, state: "authorized", lineage_activation_receipt_ref: next.authority_ref
  });
  assert.ok(validateActionStateTransition(genesis, prematureActivation, context).includes("phase1_object_schema_invalid"));
  const backward = make("cairn.action_state_head.v0.1", {
    action_id: genesis.action_id, action_ref: genesis.action_ref, sequence: 2,
    previous_state_hash: next.state_hash, state: "prepared"
  });
  assert.ok(validateActionStateTransition(next, backward, context).includes("action_state_edge_invalid"));
  const futureRef = sampleFor(resolveRef("https://cairn.cards/protocol/execution/schemas/v0.1/common.schema.json#/$defs/objectRef", schemasById.values().next().value).schema);
  const invalidPrepared = make("cairn.action_state_head.v0.1", { sequence: 0, previous_state_hash: null, state: "prepared", authority_ref: futureRef });
  assert.ok(validateActionStateTransition(null, invalidPrepared, context).includes("phase1_object_schema_invalid"));
  const reservedWithoutActivation = make("cairn.action_state_head.v0.1", {
    action_id: next.action_id, action_ref: next.action_ref, sequence: 2, previous_state_hash: next.state_hash,
    state: "reserved", lineage_activation_receipt_ref: null
  });
  assert.ok(validateActionStateTransition(next, reservedWithoutActivation, context).includes("phase1_object_schema_invalid"));
  const reserved = make("cairn.action_state_head.v0.1", {
    action_id: next.action_id, action_ref: next.action_ref, sequence: 2, previous_state_hash: next.state_hash, state: "reserved"
  });
  assert.deepEqual(validateActionStateTransition(next, reserved, context), []);
  const driftedActivation = { ...reserved.lineage_activation_receipt_ref, object_hash: `sha-256:${"8".repeat(64)}` };
  const driftedGate = make("cairn.action_state_head.v0.1", {
    action_id: reserved.action_id, action_ref: reserved.action_ref, sequence: 3, previous_state_hash: reserved.state_hash,
    state: "definitive_failure", lineage_activation_receipt_ref: driftedActivation,
    gate_result_ref: null, redemption_receipt_ref: null,
    outbox_state_head_ref: null, receiver_receipt_ref: null
  });
  assert.ok(validateActionStateTransition(reserved, driftedGate, context).includes("action_state_dependency_drift"));
  const removedGateAllowed = make("cairn.action_state_head.v0.1", {
    action_id: reserved.action_id, action_ref: reserved.action_ref, sequence: 3,
    previous_state_hash: reserved.state_hash, state: "gate_allowed"
  });
  assert.ok(validateActionStateTransition(reserved, removedGateAllowed, context)
    .includes("phase1_object_schema_invalid"));
  const removedPostRedemptionReceipt = make("cairn.action_receipt.v0.2", {
    state_before: "gate_allowed", state_after: "redemption_committed"
  });
  assert.ok(validatePhase1Object(removedPostRedemptionReceipt, context)
    .includes("phase1_object_schema_invalid"));
  const receiptEffectLeaks = [
    { disclosure_receipt_refs: [futureRef] },
    { obligation_transition_refs: [futureRef] },
    { checkout_transition_refs: [futureRef] },
    { receiver_import_receipt_ref: futureRef, receiver_assertion_trust_state_head_ref: futureRef },
    { exposure_before: { amount_minor: 1, asset: "USD" } },
    { exposure_reserved: { amount_minor: 1, asset: "USD" } },
    { exposure_spent: { amount_minor: 1, asset: "USD" } },
    { exposure_remaining: { amount_minor: 1, asset: "USD" } }
  ];
  for (const leak of receiptEffectLeaks) {
    assert.ok(validatePhase1Object(make("cairn.action_receipt.v0.2", leak), context)
      .includes("phase1_object_schema_invalid"));
  }
  const earlyCancelled = make("cairn.action_state_head.v0.1", {
    action_id: genesis.action_id, action_ref: genesis.action_ref, sequence: 1,
    previous_state_hash: genesis.state_hash, state: "cancelled", authority_ref: null,
    lineage_activation_receipt_ref: null, reservation_refs: [], gate_result_ref: null,
    redemption_receipt_ref: null, outbox_state_head_ref: null, receiver_receipt_ref: null
  });
  assert.deepEqual(validateActionStateTransition(genesis, earlyCancelled, context), []);
  const reservedFailure = make("cairn.action_state_head.v0.1", {
    action_id: reserved.action_id, action_ref: reserved.action_ref, sequence: 3,
    previous_state_hash: reserved.state_hash, state: "definitive_failure",
    authority_ref: reserved.authority_ref, lineage_activation_receipt_ref: reserved.lineage_activation_receipt_ref,
    reservation_refs: reserved.reservation_refs, gate_result_ref: null, redemption_receipt_ref: null,
    outbox_state_head_ref: null, receiver_receipt_ref: null
  });
  assert.deepEqual(validateActionStateTransition(reserved, reservedFailure, context), []);
  const fabricatedTerminalAuthority = make("cairn.action_state_head.v0.1", {
    ...earlyCancelled, authority_ref: futureRef
  });
  assert.ok(validateActionStateTransition(genesis, fabricatedTerminalAuthority, context).includes("action_state_terminal_prefix_drift"));
  const overReservationBound = make("cairn.action_state_head.v0.1", {
    ...reserved, reservation_refs: distinctRefs(33, "reservation")
  });
  assert.ok(validateActionStateTransition(next, overReservationBound, context).includes("phase1_object_schema_invalid"));
  const submitted = make("cairn.action_state_head.v0.1", {
    action_id: reserved.action_id, action_ref: reserved.action_ref, sequence: 6,
    previous_state_hash: reserved.state_hash, state: "submitted"
  });
  const cancelledWithoutReceiverEvidence = make("cairn.action_state_head.v0.1", {
    ...submitted, sequence: 7, previous_state_hash: submitted.state_hash, state: "cancelled",
    receiver_receipt_ref: null
  });
  const receiverFailures = validateActionStateTransition(submitted, cancelledWithoutReceiverEvidence, context);
  assert.deepEqual(receiverFailures, [
    "phase1_object_schema_invalid", "before_phase1_object_schema_invalid"
  ]);
});

test("gate, authorization, reservation, cancellation, and receipt branches are executable constraints", () => {
  const deniedCheck = { code: "CHECK_DENIED", decision: "deny", evidence_refs: [] };
  const impossibleAllow = make("cairn.gate_result.v0.2", { decision: "allow", check_results: [deniedCheck] });
  assert.ok(validateGateResult(impossibleAllow, context).includes("phase1_object_schema_invalid"));
  const denyWithoutDenyWitness = make("cairn.gate_result.v0.2", {
    decision: "deny",
    check_results: [{ code: "CHECK_PASS", decision: "pass", evidence_refs: [] }]
  });
  assert.ok(validateGateResult(denyWithoutDenyWitness, context).includes("phase1_object_schema_invalid"));
  const reopenedPassDecision = make("cairn.gate_result.v0.2", {
    decision: "pass", check_results: [deniedCheck]
  });
  assert.ok(validateGateResult(reopenedPassDecision, context).includes("phase1_object_schema_invalid"));

  const bindingSeed = make("cairn.execution_binding_set.v0.1", { actor_branch: "principal_direct", agent_runtime_binding_ref: null,
    connection_authorization_ref: null, connection_state_head_ref: null, cancellation_context: null,
    obligation_exposure_core_ref: null, obligation_exposure_core_hash: null, obligation_exposure_id: null, obligation_role: null,
    checkout_group_core_ref: null, checkout_group_core_hash: null, checkout_role: null,
    checkout_reservation_batch_core_ref: null, checkout_reservation_batch_core_hash: null,
    fulfillment_attempt_core_ref: null, fulfillment_attempt_core_hash: null,
    payee_account_commitment: null, rail: null, exposure_vector: [],
    execution_bundle_hash: built.bundle.bundle_hash, operation_registry_hash: audit.operationRegistryHash,
    created_at: "2026-07-22T10:00:00Z", expires_at: "2026-07-22T10:05:00Z" });
  const gateDependencySources = [];
  const gateDependency = (dependencyRole, subjectLabel = dependencyRole, state = "active") => {
    const subjectRef = distinctRefs(1, `gate-subject-${subjectLabel}`)[0];
    const source = make("cairn.gate_dependency_attestation.v0.1", {
      principal_id: bindingSeed.principal_id, dependency_role: dependencyRole,
      subject_ref: subjectRef, subject_hash: subjectRef.object_hash, state,
      valid_from: "2026-07-22T09:00:00Z", valid_until: "2026-07-22T11:00:00Z",
      issued_at: "2026-07-22T09:00:00Z", issuing_authority_id: bindingSeed.principal_id
    });
    gateDependencySources.push(source);
    return make("cairn.gate_dependency_state_head.v0.1", {
      dependency_key: gateDependencyKey(bindingSeed.principal_id, dependencyRole, subjectRef),
      principal_id: bindingSeed.principal_id, dependency_role: dependencyRole,
      source_ref: refFor(source), source_hash: source.attestation_hash,
      sequence: 0, previous_head_hash: null, state,
      valid_from: "2026-07-22T09:00:00Z", valid_until: "2026-07-22T11:00:00Z",
      updated_at: "2026-07-22T09:00:00Z"
    });
  };
  const executionReleaseDependency = gateDependency("execution_release");
  const executionIntegrityDependency = gateDependency("execution_integrity");
  const assuranceLifecycleDependency = gateDependency("policy_lifecycle");
  const verifierLifecycleDependency = gateDependency("policy_lifecycle", "verifier-policy-lifecycle");
  const executionControlDependency = gateDependency("execution_control");
  const executorPolicyDependency = gateDependency("executor_policy");
  const receiverFinalityDependency = gateDependency("receiver_finality");
  const receiverSelectorDependency = gateDependency("receiver_sequence_selector");
  const reservationCommitment = make("cairn.lineage_commitment.v0.1", {
    principal_id: bindingSeed.principal_id, authority_kind: "supervised_pending", mandate_ref: null, scope_binding_index: null,
    principal_occurrence_id: bindingSeed.principal_occurrence_id,
    principal_authorized_lineage_id: bindingSeed.principal_authorized_lineage_id,
    action_control_key: bindingSeed.action_control_key, action_proposal_hash: bindingSeed.action_proposal_hash,
    effect_id: bindingSeed.effect_id, expected_activation_fence: 4,
    prior_lineage_state: "none", prior_lineage_receipt_ref: null, expires_at: "2026-07-22T10:05:00Z"
  });
  const confirmationFixture = confirmationPolicyFixture(
    bindingSeed.capability, refFor(assuranceLifecycleDependency)
  );
  confirmationFixture.verifierLifecycleRef = refFor(verifierLifecycleDependency);
  const verifierLifecycleKey = `confirmation_verifier:${canonicalText(refFor(confirmationFixture.verifierProfile))}`;
  confirmationFixture.currentPolicyLifecycleResolver.set(verifierLifecycleKey, {
    ...confirmationFixture.currentPolicyLifecycleResolver.get(verifierLifecycleKey),
    current_head_ref: confirmationFixture.verifierLifecycleRef
  });
  const binding = make("cairn.execution_binding_set.v0.1", {
    ...bindingSeed, lineage_commitment_ref: refFor(reservationCommitment),
    lineage_commitment_hash: reservationCommitment.commitment_hash, expected_lineage_activation_fence: 4,
    execution_release_state_head_ref: refFor(executionReleaseDependency),
    execution_integrity_state_head_ref: refFor(executionIntegrityDependency),
    execution_integrity_state_head_hash: executionIntegrityDependency.head_hash,
    execution_control_state_head_ref: refFor(executionControlDependency),
    receiver_finality_profile_ref: refFor(receiverFinalityDependency),
    receiver_sequence_epoch_selector_state_head_ref: refFor(receiverSelectorDependency),
    receiver_sequence_epoch_selector_state_head_hash: receiverSelectorDependency.head_hash,
    receiver_channel_policy_ref: null, receiver_channel_policy_hash: null,
    receiver_channel_policy_lifecycle_head_ref: null,
    receiver_channel_policy_lifecycle_head_hash: null,
    confirmation_assurance_policy_ref: refFor(confirmationFixture.policy),
    confirmation_assurance_policy_hash: confirmationFixture.policy.policy_hash,
    confirmation_assurance_policy_lifecycle_head_ref: confirmationFixture.policyLifecycleRef,
    confirmation_assurance_policy_lifecycle_head_hash: confirmationFixture.policyLifecycleRef.object_hash,
    allowed_confirmation_verifier_profile_refs_root:
      canonicalHash(confirmationFixture.policy.allowed_verifier_profile_refs)
  });
  const authorization = make("cairn.action_authorization.v0.2", {
    execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    lineage_commitment_ref: binding.lineage_commitment_ref, lineage_commitment_hash: binding.lineage_commitment_hash,
    required_confirmation_assurance_policy_ref: binding.confirmation_assurance_policy_ref,
    expires_at: "2026-07-22T10:05:00Z"
  });
  assert.deepEqual(validateActionAuthorization(authorization, binding, { ...context, authorityServiceTime: Date.parse("2026-07-22T10:01:00Z") }), []);
  assert.ok(validateActionAuthorization(authorization, binding, {
    ...context, principalRevocationNonce: 1
  }).includes("authorization_principal_revocation_nonce_mismatch"));
  const proxyAuthorizationContext = new Proxy({
    ...context, principalRevocationNonce: 1,
    requiredReservedJudgments: ["evidence_review"]
  }, {
    get(target, property, receiver) {
      return typeof property === "symbol" ? true : Reflect.get(target, property, receiver);
    }
  });
  assert.ok(validateActionAuthorization(authorization, binding, proxyAuthorizationContext)
    .includes("authorization_principal_revocation_nonce_mismatch"));
  assert.ok(validateActionAuthorization(authorization, binding, proxyAuthorizationContext)
    .includes("authorization_reserved_judgments_mismatch"));
  assert.ok(validateActionAuthorization(authorization, binding, {
    ...context, requiredReservedJudgments: ["evidence_review"]
  }).includes("authorization_reserved_judgments_mismatch"));
  assert.ok(validateActionAuthorization(authorization, binding, {
    ...context, principalRevocationNonce: undefined, requiredReservedJudgments: undefined
  }).includes("authorization_principal_revocation_nonce_mismatch"));
  const judgmentAuthorization = make("cairn.action_authorization.v0.2", {
    ...authorization, reserved_judgments_decided: ["evidence_review"]
  });
  assert.deepEqual(validateActionAuthorization(judgmentAuthorization, binding, {
    ...context, requiredReservedJudgments: ["evidence_review"]
  }), []);
  const historicalAuthorizationContext = signedReadContext(authorization, {
    ...context, binding, principalRevocationNonce: 9,
    requiredReservedJudgments: ["new_judgment_after_issuance"]
  }, authorization.principal_id);
  assert.deepEqual(validateExactObjectRead(
    "execution.authorization.get", { ref: refFor(authorization) }, {
      ref: refFor(authorization), object: authorization, retrieved_at: "2026-07-22T10:03:00Z"
    }, historicalAuthorizationContext
  ), ["phase1_authenticated_resolution_unsupported"]);
  const mismatchedConfirmationPolicy = make("cairn.action_authorization.v0.2", {
    ...authorization,
    required_confirmation_assurance_policy_ref: distinctRefs(1, "alien-confirmation-policy")[0]
  });
  assert.ok(validateActionAuthorization(mismatchedConfirmationPolicy, binding, context)
    .includes("authorization_binding_semantics_mismatch"));
  const acknowledgementBinding = make("cairn.execution_binding_set.v0.1", {
    ...binding, required_acknowledgement_codes: ["TERMS_MAY_BIND_BEFORE_PAYMENT"]
  });
  const missingAcknowledgement = make("cairn.action_authorization.v0.2", {
    ...authorization, execution_binding_set_ref: refFor(acknowledgementBinding),
    execution_binding_set_hash: acknowledgementBinding.binding_set_hash,
    acknowledged_transaction_semantics: []
  });
  assert.ok(validateActionAuthorization(missingAcknowledgement, acknowledgementBinding, context)
    .includes("authorization_transaction_semantics_mismatch"));
  const confirmation = confirmationReceiptFixture(authorization, binding, confirmationFixture);
  const confirmationContext = signedReadContext([
    confirmationFixture.policy, confirmationFixture.verifierProfile
  ], {
    ...context,
    confirmationPolicy: confirmationFixture.policy,
    confirmationVerifierProfile: confirmationFixture.verifierProfile,
    currentPolicyLifecycleResolver: confirmationFixture.currentPolicyLifecycleResolver,
    policyLifecycleHistoryResolver: confirmationFixture.currentPolicyLifecycleResolver
  }, binding.principal_id);
  assert.deepEqual(validateExecutionConfirmation(
    confirmation, authorization, binding, null,
    { ...confirmationContext, confirmationEvaluationTime: "2026-07-22T10:01:00Z" }
  ), []);
  const corruptedConfirmationPolicy = structuredClone(confirmationFixture.policy);
  corruptedConfirmationPolicy.policy_authority_signature.value = "A".repeat(86);
  assert.ok(validateExecutionConfirmation(
    confirmation, authorization, binding, null, {
      ...confirmationContext,
      confirmationPolicy: corruptedConfirmationPolicy,
      confirmationEvaluationTime: "2026-07-22T10:01:00Z"
    }
  ).includes("confirmation_assurance_policy_mismatch"));
  const corruptedVerifierProfile = structuredClone(confirmationFixture.verifierProfile);
  corruptedVerifierProfile.verifier_registry_signature.value = "A".repeat(86);
  assert.ok(validateExecutionConfirmation(
    confirmation, authorization, binding, null, {
      ...confirmationContext,
      confirmationVerifierProfile: corruptedVerifierProfile,
      confirmationEvaluationTime: "2026-07-22T10:01:00Z"
    }
  ).includes("confirmation_verifier_profile_mismatch"));
  const foreignPrincipalConfirmation = confirmationReceiptFixture(
    authorization, binding, confirmationFixture,
    { principal_id: "did:example:foreign-confirming-principal" }
  );
  assert.ok(validateExecutionConfirmation(
    foreignPrincipalConfirmation, authorization, binding, null,
    { ...confirmationContext, confirmationEvaluationTime: "2026-07-22T10:01:00Z" }
  ).includes("confirmation_principal_or_authority_mismatch"));
  const alienConfirmationPolicyRef = distinctRefs(1, "alien-confirmation-policy")[0];
  const alienPolicyConfirmation = confirmationReceiptFixture(
    authorization, binding, confirmationFixture,
    { assurance_policy_ref: alienConfirmationPolicyRef, assurance_policy_hash: alienConfirmationPolicyRef.object_hash }
  );
  assert.ok(validateExecutionConfirmation(
    alienPolicyConfirmation, authorization, binding, null,
    { ...confirmationContext, confirmationEvaluationTime: "2026-07-22T10:01:00Z" }
  ).includes("confirmation_assurance_policy_mismatch"));
  const expiredConfirmation = confirmationReceiptFixture(
    authorization, binding, confirmationFixture,
    { verified_at: "2026-07-22T09:58:00Z", expires_at: "2026-07-22T09:59:00Z" }
  );
  assert.ok(validateExecutionConfirmation(
    expiredConfirmation, authorization, binding, null,
    { ...confirmationContext, confirmationEvaluationTime: "2026-07-22T10:01:00Z" }
  ).includes("confirmation_freshness_mismatch"));
  const preAuthorityConfirmation = confirmationReceiptFixture(
    authorization, binding, confirmationFixture,
    { verified_at: "2026-07-22T09:59:30Z", expires_at: "2026-07-22T10:03:00Z" }
  );
  assert.ok(validateExecutionConfirmation(
    preAuthorityConfirmation, authorization, binding, null,
    { ...confirmationContext, confirmationEvaluationTime: "2026-07-22T10:01:00Z" }
  ).includes("confirmation_freshness_mismatch"));
  assert.ok(validateExecutionConfirmation(
    confirmation, authorization, binding, null,
    { ...confirmationContext, confirmationEvaluationTime: "2026-07-22T10:01:00Z",
      currentPolicyLifecycleResolver: null }
  ).includes("confirmation_lifecycle_current_active_mismatch"));
  const retiredLifecycleResolver = new Map(confirmationFixture.currentPolicyLifecycleResolver);
  retiredLifecycleResolver.set(`confirmation_assurance:${canonicalText(refFor(confirmationFixture.policy))}`, {
    ...retiredLifecycleResolver.get(`confirmation_assurance:${canonicalText(refFor(confirmationFixture.policy))}`),
    state: "retired"
  });
  assert.ok(validateExecutionConfirmation(
    confirmation, authorization, binding, null,
    { ...confirmationContext, confirmationEvaluationTime: "2026-07-22T10:01:00Z",
      currentPolicyLifecycleResolver: retiredLifecycleResolver }
  ).includes("confirmation_lifecycle_current_active_mismatch"));
  const replayedChallengeConfirmation = make("cairn.confirmation_receipt.v0.1", {
    ...confirmation, challenge_hash: `sha-256:${"8".repeat(64)}`
  });
  assert.ok(validateExecutionConfirmation(
    replayedChallengeConfirmation, authorization, binding, null,
    { ...confirmationContext, confirmationEvaluationTime: "2026-07-22T10:01:00Z" }
  ).includes("confirmation_challenge_mismatch"));
  const gateRequestSeed = make("cairn.gate_request.v0.2", {
    principal_id: binding.principal_id, execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    execution_integrity_state_head_ref: binding.execution_integrity_state_head_ref,
    authority_basis_ref: refFor(authorization), confirmation_receipt_ref: refFor(confirmation),
    confirmation_assurance_policy_lifecycle_head_ref: confirmationFixture.policyLifecycleRef,
    confirmation_assurance_policy_lifecycle_head_hash: confirmationFixture.policyLifecycleRef.object_hash,
    confirmation_verifier_profile_lifecycle_head_ref: confirmationFixture.verifierLifecycleRef,
    confirmation_verifier_profile_lifecycle_head_hash: confirmationFixture.verifierLifecycleRef.object_hash,
    policy_refs: [
      refFor(confirmationFixture.policy), confirmationFixture.policyLifecycleRef,
      refFor(confirmationFixture.verifierProfile), confirmationFixture.verifierLifecycleRef
    ],
    current_control_head_refs: [binding.execution_control_state_head_ref],
    current_connection_head_ref: null, current_compartment_head_ref: null,
    current_economic_resource_head_ref: null,
    current_data_grant_head_refs: binding.data_grant_state_heads.map(({ current_state_head_ref }) => current_state_head_ref),
    current_business_state_head_refs: [], current_provider_identity_head_refs: [],
    current_provider_identity_trust_overlay_head_refs: [], current_seller_copy_lease_heads_root: null,
    receiver_finality_profile_ref: binding.receiver_finality_profile_ref,
    accounting_policy_ref: binding.accounting_policy_ref,
    receiver_channel_policy_ref: binding.receiver_channel_policy_ref,
    receiver_sequence_epoch_selector_ref: binding.receiver_sequence_epoch_selector_state_head_ref,
    executor_policy_ref: refFor(executorPolicyDependency),
    checkout_dependency_refs: [],
    action_control_key: binding.action_control_key, checkout_readiness_receipt_ref: null,
    checkout_group_state_head_ref: null, checkout_terms_receipt_ref: null,
    requested_at: "2026-07-22T10:01:00Z"
  });
  const gateDependencyManifest = gateDependencyManifestFor(
    gateRequestSeed, binding, authorization, confirmation
  );
  const gateRequest = make("cairn.gate_request.v0.2", {
    ...gateRequestSeed, dependency_manifest_ref: refFor(gateDependencyManifest),
    dependency_manifest_hash: gateDependencyManifest.manifest_hash,
    gate_service_signature: {
      ...gateRequestSeed.gate_service_signature, signed_at: "2026-07-22T10:01:00Z"
    }
  });
  const gateDependencyObjects = [
    ...gateDependencySources,
    executionReleaseDependency, executionIntegrityDependency,
    assuranceLifecycleDependency, verifierLifecycleDependency,
    executionControlDependency, executorPolicyDependency,
    receiverFinalityDependency, receiverSelectorDependency,
    confirmationFixture.policy, confirmationFixture.verifierProfile
  ];
  const gateRequestContext = signedReadContext([
    ...gateDependencyObjects, gateDependencyManifest, gateRequest, binding, authorization, confirmation
  ], {
    ...confirmationContext,
    gateDependencyAuthorityResolver: () => binding.principal_id,
    objectResolver: new Map([...gateDependencyObjects, gateDependencyManifest]
      .map((object) => [refFor(object).object_hash, object])),
    currentHeadResolver: currentHeadResolverFor(gateRequiredHeadRefs(gateRequest, binding))
  }, binding.principal_id);
  assert.deepEqual(validateGateRequest(gateRequest, binding, authorization, confirmation, gateRequestContext),
    ["phase1_authenticated_resolution_unsupported"]);
  const executorPolicySourceForChronology = gateDependencySources.find((source) =>
    source.dependency_role === "executor_policy");
  const postEvaluationSource = make("cairn.gate_dependency_attestation.v0.1", {
    ...executorPolicySourceForChronology, issued_at: "2026-07-22T10:03:00Z"
  });
  const postEvaluationSourceContext = signedReadContext(postEvaluationSource, {
    ...gateRequestContext,
    gateEvaluationTime: "2026-07-22T10:02:00Z",
    objectResolver: new Map(gateRequestContext.objectResolver)
      .set(refFor(postEvaluationSource).object_hash, postEvaluationSource)
  }, binding.principal_id);
  assert.ok(validateGateDependencyAttestation(postEvaluationSource, postEvaluationSourceContext)
    .includes("gate_dependency_attestation_semantics_invalid"));
  const postEvaluationWrapper = make("cairn.gate_dependency_state_head.v0.1", {
    ...executorPolicyDependency, updated_at: "2026-07-22T10:03:00Z"
  });
  const postEvaluationWrapperContext = signedReadContext(postEvaluationWrapper, {
    ...gateRequestContext,
    gateEvaluationTime: "2026-07-22T10:02:00Z",
    objectResolver: new Map(gateRequestContext.objectResolver)
      .set(refFor(postEvaluationWrapper).object_hash, postEvaluationWrapper)
  }, binding.principal_id);
  assert.ok(validateGateDependencyStateHead(postEvaluationWrapper, postEvaluationWrapperContext)
    .includes("gate_dependency_state_semantics_invalid"));
  const postEvaluationSignedDependency = make("cairn.gate_dependency_state_head.v0.1", {
    ...executorPolicyDependency,
    authority_service_signature: {
      ...executorPolicyDependency.authority_service_signature,
      signed_at: "2026-07-22T10:03:00Z"
    }
  });
  const postEvaluationSignedRequest = make("cairn.gate_request.v0.2", {
    ...gateRequest, executor_policy_ref: refFor(postEvaluationSignedDependency)
  });
  const postEvaluationSignedContext = signedReadContext([
    postEvaluationSignedDependency, postEvaluationSignedRequest
  ], {
    ...gateRequestContext,
    objectResolver: new Map(gateRequestContext.objectResolver)
      .set(refFor(postEvaluationSignedDependency).object_hash, postEvaluationSignedDependency)
  }, binding.principal_id);
  const postEvaluationSignedChecks = evaluateGateChecks(
    postEvaluationSignedRequest, binding, authorization, confirmation, postEvaluationSignedContext
  );
  assert.equal(postEvaluationSignedChecks.find(({ code }) => code === "SCHEMA_SIGNATURE")?.decision, "deny");
  const missingManifestContext = {
    ...gateRequestContext, objectResolver: new Map(gateRequestContext.objectResolver)
  };
  missingManifestContext.objectResolver.delete(refFor(gateDependencyManifest).object_hash);
  assert.ok(validateGateRequest(gateRequest, binding, authorization, confirmation, missingManifestContext)
    .includes("gate_request_dependency_manifest_unresolved"));
  const crossWiredManifest = make("cairn.gate_dependency_manifest.v0.1", {
    ...gateDependencyManifest,
    authority_basis_ref: distinctRefs(1, "cross-wired-manifest-authority")[0]
  });
  const crossWiredManifestRequest = make("cairn.gate_request.v0.2", {
    ...gateRequest, dependency_manifest_ref: refFor(crossWiredManifest),
    dependency_manifest_hash: crossWiredManifest.manifest_hash
  });
  const crossWiredManifestContext = signedReadContext([
    crossWiredManifest, crossWiredManifestRequest
  ], {
    ...gateRequestContext,
    objectResolver: new Map(gateRequestContext.objectResolver)
      .set(refFor(crossWiredManifest).object_hash, crossWiredManifest)
  }, binding.principal_id);
  assert.ok(validateGateRequest(
    crossWiredManifestRequest, binding, authorization, confirmation, crossWiredManifestContext
  ).includes("gate_request_dependency_manifest_binding_mismatch"));
  const unrelatedBusinessHead = distinctRefs(1, "unrelated-gate-business-head")[0];
  const selfSelectedGateRequest = make("cairn.gate_request.v0.2", {
    ...gateRequest,
    current_business_state_head_refs: [...gateRequest.current_business_state_head_refs, unrelatedBusinessHead]
  });
  assert.ok(validateGateRequest(selfSelectedGateRequest, binding, authorization, confirmation, {
    ...gateRequestContext,
    currentHeadResolver: currentHeadResolverFor(gateRequiredHeadRefs(selfSelectedGateRequest, binding))
  }).includes("gate_request_dependency_projection_mismatch:current_business_state_head_refs"));
  const staleCurrentHeadResolver = currentHeadResolverFor(gateRequiredHeadRefs(gateRequest, binding));
  const staleControl = { ...binding.execution_control_state_head_ref,
    object_hash: `sha-256:${"f".repeat(64)}` };
  staleCurrentHeadResolver.set(canonicalText({ schema: staleControl.schema, object_id: staleControl.object_id }), staleControl);
  assert.ok(validateGateRequest(gateRequest, binding, authorization, confirmation, {
    ...gateRequestContext, currentHeadResolver: staleCurrentHeadResolver
  }).includes("gate_request_current_head_set_mismatch"));
  const gateLifecycleHashDrift = make("cairn.gate_request.v0.2", {
    ...gateRequest, confirmation_assurance_policy_lifecycle_head_hash: `sha-256:${"9".repeat(64)}`
  });
  assert.ok(validateGateRequest(gateLifecycleHashDrift, binding, authorization, confirmation, gateRequestContext)
    .includes("phase1_ref_hash_mismatch"));
  const wrongGateBinding = make("cairn.gate_request.v0.2", { ...gateRequest, action_control_key: `sha-256:${"9".repeat(64)}` });
  assert.ok(validateGateRequest(wrongGateBinding, binding, authorization, confirmation, gateRequestContext).includes("gate_request_binding_mismatch"));
  const genericRef = sampleFor(resolveRef("https://cairn.cards/protocol/execution/schemas/v0.1/common.schema.json#/$defs/objectRef", schemasById.values().next().value).schema);
  const pairedWithoutAcknowledgement = make("cairn.action_authorization.v0.2", {
    checkout_group_core_ref: genericRef, checkout_group_core_hash: genericRef.object_hash, checkout_role: "terms_acceptance",
    checkout_reservation_batch_core_ref: genericRef, checkout_reservation_batch_core_hash: genericRef.object_hash,
    acknowledged_transaction_semantics: []
  });
  assert.ok(validateActionAuthorization(pairedWithoutAcknowledgement, null, context).includes("phase1_object_schema_invalid"));
  const bindableWithoutExposure = make("cairn.action_authorization.v0.2", {
    capability: "submit_bindable_offer", obligation_exposure_core_ref: genericRef,
    obligation_exposure_core_hash: genericRef.object_hash, obligation_exposure_id: genericRef.object_hash,
    obligation_role: "create_or_update", exposure_vector: []
  });
  assert.ok(validateActionAuthorization(bindableWithoutExposure, null, context).includes("phase1_object_schema_invalid"));
  const paymentBindingWithoutExposure = make("cairn.execution_binding_set.v0.1", {
    capability: "authorize_payment", obligation_exposure_core_ref: null, obligation_exposure_core_hash: null,
    obligation_exposure_id: null, obligation_role: null, exposure_vector: [], fulfillment_attempt_core_ref: null,
    fulfillment_attempt_core_hash: null, payee_account_commitment: null, rail: null
  });
  assert.ok(validateBindingSet(paymentBindingWithoutExposure, context).includes("phase1_object_schema_invalid"));
  const offerBindingWithoutExposure = make("cairn.execution_binding_set.v0.1", {
    capability: "submit_bindable_offer", obligation_exposure_core_ref: null, obligation_exposure_core_hash: null,
    obligation_exposure_id: null, obligation_role: null, exposure_vector: [], fulfillment_attempt_core_ref: null,
    fulfillment_attempt_core_hash: null, payee_account_commitment: null, rail: null
  });
  assert.ok(validateBindingSet(offerBindingWithoutExposure, context).includes("phase1_object_schema_invalid"));
  const offerBindingWithoutFinancialContext = make("cairn.execution_binding_set.v0.1", {
    capability: "submit_bindable_offer", obligation_exposure_core_ref: genericRef,
    obligation_exposure_core_hash: genericRef.object_hash, obligation_exposure_id: genericRef.object_hash,
    obligation_role: "create_or_update", exposure_vector: [{ amount_minor: 100, asset: "USD" }],
    principal_limit_policy_state_head_refs: [genericRef],
    fulfillment_attempt_core_ref: null, fulfillment_attempt_core_hash: null,
    payee_account_commitment: null, rail: null
  });
  assert.ok(validateBindingSet(offerBindingWithoutFinancialContext, context).includes("phase1_object_schema_invalid"));

  const redemptionAction = make("cairn.action_record.v0.2", {
    principal_id: binding.principal_id,
    execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    lineage_commitment_ref: binding.lineage_commitment_ref,
    lineage_commitment_hash: binding.lineage_commitment_hash,
    action_proposal_ref: binding.action_proposal_ref, action_proposal_hash: binding.action_proposal_hash,
    effect_descriptor_ref: binding.effect_descriptor_ref, effect_id: binding.effect_id,
    capability: binding.capability
  });
  const allowedGate = make("cairn.gate_result.v0.2", {
    gate_request_ref: refFor(gateRequest), gate_request_hash: gateRequest.request_hash,
    execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    decision: "deny",
    evaluated_head_refs: gateRequiredHeadRefs(gateRequest, binding),
    evaluated_nonce_and_fence_root: gateEvaluatedHeadRoot(gateRequiredHeadRefs(gateRequest, binding)),
    business_state_root: gateBusinessStateRoot(gateRequest.current_business_state_head_refs),
    checkout_dependency_root: gateCheckoutDependencyRoot(gateRequest),
    check_results: evaluateGateChecks(
      gateRequest, binding, authorization, confirmation, gateRequestContext
    )
  });
  const gateContext = { ...gateRequestContext, gateRequest, binding, authority: authorization, confirmation };
  assert.ok(validateGateResult(allowedGate, gateContext).includes("gate_result_signature_invalid"));
  const signedGateContext = signedReadContext(
    [allowedGate, gateRequest, binding, authorization, confirmation],
    { ...gateContext, requireDependencySignatures: true }, binding.principal_id
  );
  assert.deepEqual(validateGateResult(allowedGate, signedGateContext),
    [
      "phase1_authenticated_resolution_unsupported",
      "gate_result_phase1_authenticated_resolution_unsupported"
    ]);
  const evaluatedCurrentHeadResolver = currentHeadResolverFor(gateRequiredHeadRefs(gateRequest, binding));
  const observedEvaluationTimes = [];
  const evaluatedAtContext = {
    ...signedGateContext,
    currentHeadResolver: (reference, evaluationTime) => {
      observedEvaluationTimes.push(evaluationTime);
      return evaluatedCurrentHeadResolver.get(canonicalText({
        schema: reference.schema, object_id: reference.object_id
      })) ?? null;
    }
  };
  assert.deepEqual(validateGateResult(allowedGate, evaluatedAtContext),
    [
      "phase1_authenticated_resolution_unsupported",
      "gate_result_phase1_authenticated_resolution_unsupported"
    ]);
  assert.ok(observedEvaluationTimes.length > 0);
  assert.ok(observedEvaluationTimes.every((evaluationTime) => evaluationTime === allowedGate.evaluated_at));
  const phase1UnsupportedCheckCodes = new Set([
    "BUSINESS_DEPENDENCIES", "REVIEWS_POLICIES", "RESERVED_JUDGMENTS", "LIMITS",
    "ECONOMIC_EXPOSURE", "DUPLICATE_EFFECT_LINEAGE", "EXECUTOR_TARGET",
    "DOMAIN_POLICY", "ATOMIC_PRECONDITIONS", "EXECUTION_CONTROLS"
  ]);
  assert.equal(phase1UnsupportedCheckCodes.size, 10);
  for (const code of phase1UnsupportedCheckCodes) {
    assert.equal(
      allowedGate.check_results.find((check) => check.code === code)?.decision,
      "deny",
      `${code} must remain unavailable in Phase 1`
    );
  }
  const assertUnsupportedWithSatisfiedRoles = (code, roles, requestFields) => {
    const firstNewSource = gateDependencySources.length;
    const heads = roles.map((role) => gateDependency(role, `${code.toLowerCase()}-${role}`));
    const sources = gateDependencySources.slice(firstNewSource);
    const request = { ...gateRequest, ...requestFields(heads.map(refFor)) };
    const roleContext = signedReadContext([...sources, ...heads], {
      ...gateRequestContext,
      objectResolver: new Map([
        ...gateRequestContext.objectResolver,
        ...sources.map((object) => [refFor(object).object_hash, object]),
        ...heads.map((object) => [refFor(object).object_hash, object])
      ])
    }, binding.principal_id);
    assert.equal(
      evaluateGateChecks(request, binding, authorization, confirmation, roleContext)
        .find((check) => check.code === code)?.decision,
      "deny",
      `${code} must deny even when every local predicate passes`
    );
  };
  assertUnsupportedWithSatisfiedRoles(
    "BUSINESS_DEPENDENCIES",
    ["business_state", "provider_identity", "provider_identity_trust_overlay"],
    ([business, provider, overlay]) => ({
      current_business_state_head_refs: [business],
      current_provider_identity_head_refs: [provider],
      current_provider_identity_trust_overlay_head_refs: [overlay],
      current_seller_copy_lease_heads_root: null
    })
  );
  assertUnsupportedWithSatisfiedRoles(
    "LIMITS",
    ["compartment", "economic_resource", "accounting_policy"],
    ([compartment, economicResource, accountingPolicy]) => ({
      current_compartment_head_ref: compartment,
      current_economic_resource_head_ref: economicResource,
      accounting_policy_ref: accountingPolicy
    })
  );
  assertUnsupportedWithSatisfiedRoles(
    "ECONOMIC_EXPOSURE",
    ["compartment", "economic_resource"],
    ([compartment, economicResource]) => ({
      current_compartment_head_ref: compartment,
      current_economic_resource_head_ref: economicResource,
      reservation_receipt_refs: []
    })
  );
  assertUnsupportedWithSatisfiedRoles(
    "DOMAIN_POLICY",
    ["policy", "accounting_policy", "receiver_channel_policy", "receiver_finality"],
    ([policy, accountingPolicy, receiverChannelPolicy, receiverFinality]) => ({
      policy_refs: [policy],
      accounting_policy_ref: accountingPolicy,
      receiver_channel_policy_ref: receiverChannelPolicy,
      receiver_finality_profile_ref: receiverFinality
    })
  );
  assertUnsupportedWithSatisfiedRoles(
    "ATOMIC_PRECONDITIONS",
    ["checkout_dependency", "checkout_readiness", "checkout_group_state", "checkout_terms"],
    ([dependency, readiness, groupState, terms]) => ({
      checkout_dependency_refs: [dependency],
      checkout_readiness_receipt_ref: readiness,
      checkout_group_state_head_ref: groupState,
      checkout_terms_receipt_ref: terms,
      reservation_receipt_refs: []
    })
  );
  assert.equal(
    allowedGate.check_results.find(({ code }) => code === "LIFECYCLES_KEYS")?.decision,
    "deny",
    "missing provider lifecycle roles must deny"
  );
  const forgedAllow = make("cairn.gate_result.v0.2", {
    ...allowedGate,
    decision: "allow",
    check_results: allowedGate.check_results.map((result) => ({ ...result, decision: "pass" }))
  });
  const forgedAllowContext = signedReadContext(
    [forgedAllow], signedGateContext, binding.principal_id
  );
  assert.ok(validateGateResult(forgedAllow, forgedAllowContext)
    .includes("phase1_object_schema_invalid"));
  const unsignedGateRequestDependency = structuredClone(gateRequest);
  unsignedGateRequestDependency.gate_service_signature.value = "A".repeat(86);
  assert.ok(validateGateRequest(
    unsignedGateRequestDependency, binding, authorization, confirmation, signedGateContext
  ).includes("gate_request_signature_invalid"));
  assert.ok(validateGateResult(allowedGate, {
    ...signedGateContext, gateRequest: unsignedGateRequestDependency
  }).includes("gate_result_request_signature_invalid"));
  const unsignedBindingDependency = structuredClone(binding);
  unsignedBindingDependency.binding_service_signature.value = "A".repeat(86);
  assert.ok(validateGateRequest(gateRequest, unsignedBindingDependency, authorization, confirmation, signedGateContext)
    .includes("gate_request_binding_signature_invalid"));
  const unsignedAuthorityDependency = structuredClone(authorization);
  unsignedAuthorityDependency.principal_signature.value = "A".repeat(86);
  assert.ok(validateGateRequest(gateRequest, binding, unsignedAuthorityDependency, confirmation, signedGateContext)
    .includes("gate_request_authority_signature_invalid"));
  const unsignedConfirmationDependency = structuredClone(confirmation);
  unsignedConfirmationDependency.verifier_signature.value = "A".repeat(86);
  assert.ok(validateGateRequest(gateRequest, binding, authorization, unsignedConfirmationDependency, signedGateContext)
    .includes("gate_request_confirmation_signature_invalid"));
  const unsignedExecutorPolicyDependency = structuredClone(executorPolicyDependency);
  unsignedExecutorPolicyDependency.authority_service_signature.value = "A".repeat(86);
  assert.ok(validateGateRequest(gateRequest, binding, authorization, confirmation, {
    ...signedGateContext,
    objectResolver: new Map(signedGateContext.objectResolver)
      .set(refFor(executorPolicyDependency).object_hash, unsignedExecutorPolicyDependency)
  }).includes("gate_request_dependency_signature_invalid:executor_policy"));
  const unsignedExecutorPolicySource = structuredClone(
    gateDependencyObjects.find((object) => object.schema === "cairn.gate_dependency_attestation.v0.1" &&
      object.dependency_role === "executor_policy")
  );
  unsignedExecutorPolicySource.issuing_authority_signature.value = "A".repeat(86);
  assert.ok(validateGateRequest(gateRequest, binding, authorization, confirmation, {
    ...signedGateContext,
    objectResolver: new Map(signedGateContext.objectResolver)
      .set(refFor(unsignedExecutorPolicySource).object_hash, unsignedExecutorPolicySource)
  }).includes("gate_request_dependency_semantics_invalid:executor_policy"));
  const unsignedManifest = structuredClone(gateDependencyManifest);
  unsignedManifest.authority_service_signature.value = "A".repeat(86);
  assert.ok(validateGateRequest(gateRequest, binding, authorization, confirmation, {
    ...signedGateContext,
    objectResolver: new Map(signedGateContext.objectResolver)
      .set(refFor(gateDependencyManifest).object_hash, unsignedManifest)
  }).includes("gate_request_dependency_manifest_unresolved"));
  const missingGateCheck = make("cairn.gate_result.v0.2", {
    ...allowedGate, check_results: allowedGate.check_results.slice(1)
  });
  assert.ok(validateGateResult(missingGateCheck, gateContext).includes("gate_result_check_set_mismatch"));
  const permutedGateChecks = [...allowedGate.check_results];
  [permutedGateChecks[0], permutedGateChecks[1]] = [permutedGateChecks[1], permutedGateChecks[0]];
  const permutedGate = make("cairn.gate_result.v0.2", {
    ...allowedGate, check_results: permutedGateChecks
  });
  assert.ok(validateGateResult(permutedGate, gateContext).includes("gate_result_check_set_mismatch"));
  const alteredGateHeadRoot = make("cairn.gate_result.v0.2", {
    ...allowedGate, business_state_root: `sha-256:${"f".repeat(64)}`
  });
  assert.ok(validateGateResult(alteredGateHeadRoot, gateContext)
    .includes("gate_result_complete_head_commitment_mismatch"));
  const misboundGate = make("cairn.gate_result.v0.2", {
    ...allowedGate, gate_request_hash: `sha-256:${"9".repeat(64)}`
  });
  assert.ok(validateGateResult(misboundGate, context).includes("phase1_ref_hash_mismatch"));
  const invertedGate = make("cairn.gate_result.v0.2", {
    ...allowedGate, expires_at: "2026-07-22T10:01:59Z"
  });
  assert.ok(validateGateResult(invertedGate, gateContext).includes("gate_result_interval_invalid"));
  const alienGateRequest = make("cairn.gate_request.v0.2", { ...gateRequest, gate_request_id: "urn:uuid:00000000-0000-4000-8000-000000000099" });
  const crossWiredGate = make("cairn.gate_result.v0.2", {
    ...allowedGate, gate_request_ref: refFor(alienGateRequest), gate_request_hash: alienGateRequest.request_hash
  });
  assert.ok(validateGateResult(crossWiredGate, gateContext).includes("gate_result_request_mismatch"));
  const gateAlienAuthorityRef = distinctRefs(1, "alien-gate-authority")[0];
  const alienAuthorityGateRequest = make("cairn.gate_request.v0.2", {
    ...gateRequest, authority_basis_ref: gateAlienAuthorityRef
  });
  const alienAuthorityGateResult = make("cairn.gate_result.v0.2", {
    ...allowedGate, gate_request_ref: refFor(alienAuthorityGateRequest),
    gate_request_hash: alienAuthorityGateRequest.request_hash
  });
  assert.ok(validateGateResult(alienAuthorityGateResult, {
    ...gateContext, gateRequest: alienAuthorityGateRequest
  }).includes("gate_result_gate_request_authority_mismatch"));
  const alienConfirmationRef = distinctRefs(1, "alien-gate-confirmation")[0];
  const alienConfirmationGateRequest = make("cairn.gate_request.v0.2", {
    ...gateRequest, confirmation_receipt_ref: alienConfirmationRef
  });
  const alienConfirmationGateResult = make("cairn.gate_result.v0.2", {
    ...allowedGate, gate_request_ref: refFor(alienConfirmationGateRequest),
    gate_request_hash: alienConfirmationGateRequest.request_hash
  });
  assert.ok(validateGateResult(alienConfirmationGateResult, {
    ...gateContext, gateRequest: alienConfirmationGateRequest
  }).includes("gate_result_gate_request_confirmation_mismatch"));
  const semanticallyInvalidGateAuthority = make("cairn.action_authorization.v0.2", {
    ...authorization, effect_id: `sha-256:${"9".repeat(64)}`
  });
  const semanticallyInvalidAuthorityRequest = make("cairn.gate_request.v0.2", {
    ...gateRequest, authority_basis_ref: refFor(semanticallyInvalidGateAuthority)
  });
  const semanticallyInvalidAuthorityResult = make("cairn.gate_result.v0.2", {
    ...allowedGate, gate_request_ref: refFor(semanticallyInvalidAuthorityRequest),
    gate_request_hash: semanticallyInvalidAuthorityRequest.request_hash
  });
  assert.ok(validateGateResult(semanticallyInvalidAuthorityResult, {
    ...gateContext, gateRequest: semanticallyInvalidAuthorityRequest,
    authority: semanticallyInvalidGateAuthority
  }).includes("gate_result_gate_request_authority_binding_mismatch"));
  assert.equal(schemasByObjectId.has("cairn.execution_redemption_receipt.v0.2"), false);
  assert.equal(PHASE1_OBJECTS.some(
    ({ schema }) => schema === "cairn.execution_redemption_receipt.v0.2"
  ), false);
  for (const removedRecoverySchema of [
    "cairn.recovery_grant.v0.1", "cairn.recovery_grant_state_head.v0.1"
  ]) {
    assert.equal(schemasByObjectId.has(removedRecoverySchema), false);
    assert.equal(PHASE1_OBJECTS.some(({ schema }) => schema === removedRecoverySchema), false);
  }

  const preparedAction = make("cairn.action_record.v0.2", {
    principal_id: binding.principal_id, execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    lineage_commitment_ref: binding.lineage_commitment_ref, lineage_commitment_hash: binding.lineage_commitment_hash,
    capability: binding.capability
  });
  assert.deepEqual(validateActionRecord(preparedAction, context), []);
  const misboundPreparedAction = make("cairn.action_record.v0.2", {
    ...preparedAction, action_proposal_hash: `sha-256:${"9".repeat(64)}`
  });
  assert.ok(validateActionRecord(misboundPreparedAction, context).includes("phase1_ref_hash_mismatch"));
  const reservation = make("cairn.authority_reservation.v0.2", { prepared_action_ref: refFor(preparedAction),
    execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    principal_id: binding.principal_id, action_control_key: binding.action_control_key,
    lineage_commitment_ref: binding.lineage_commitment_ref, lineage_commitment_hash: binding.lineage_commitment_hash,
    authority_limit_ledger_commit_refs: [genericRef], expected_lineage_fence: 4, next_lineage_fence: 5,
    obligation_exposure_core_ref: null, obligation_exposure_state_before_ref: null, obligation_exposure_state_after_ref: null,
    economic_resource_exposure_before_ref: null, economic_resource_exposure_after_ref: null, exposure_vector: [], seller_inventory_context: null,
    reserved_at: "2026-07-22T10:01:00Z", expires_at: "2026-07-22T10:04:00Z" });
  const reservationContext = { ...context, lineageCommitment: reservationCommitment };
  assert.deepEqual(validateAuthorityReservation(reservation, preparedAction, binding, reservationContext), []);
  const activationReservation = make("cairn.authority_reservation.v0.2", {
    ...reservation, authority_basis_ref: refFor(authorization), authority_basis_hash: authorization.authorization_hash,
    authority_service_signature: {
      ...reservation.authority_service_signature, signed_at: "2026-07-22T10:01:00Z"
    }
  });
  const activationBefore = make("cairn.lineage_state_head.v0.1", {
    principal_occurrence_id: reservationCommitment.principal_occurrence_id,
    principal_authorized_lineage_id: reservationCommitment.principal_authorized_lineage_id,
    action_control_key: reservationCommitment.action_control_key,
    attempt_sequence: reservationCommitment.attempt_sequence,
    commitment_generation: reservationCommitment.commitment_generation,
    commitment_ref: refFor(reservationCommitment), fencing_token: reservationCommitment.expected_activation_fence
  });
  const activationAfterDraft = make("cairn.lineage_state_head.v0.1", {
    principal_occurrence_id: activationBefore.principal_occurrence_id,
    principal_authorized_lineage_id: activationBefore.principal_authorized_lineage_id,
    action_control_key: activationBefore.action_control_key, attempt_sequence: activationBefore.attempt_sequence,
    commitment_generation: activationBefore.commitment_generation, commitment_ref: activationBefore.commitment_ref,
    sequence: 1, previous_state_hash: activationBefore.state_hash, state: "active",
    activation_receipt_ref: distinctRefs(1, "activation-receipt-pending")[0],
    activation_transaction_id: "authority-transaction-activation", activated_action_ref: refFor(preparedAction),
    next_state_commitment_hash: preparedAction.action_hash, outbox_state_head_ref: null,
    terminal_receiver_receipt_ref: null, finalization_tombstone: false,
    fencing_token: activationBefore.fencing_token + 1, updated_at: "2026-07-22T10:02:00Z",
    authority_service_signature: {
      ...activationBefore.authority_service_signature, signed_at: "2026-07-22T10:02:00Z"
    }
  });
  const activationStateCommitment = lineageActiveStateCommitmentHash(activationAfterDraft);
  const activationReceipt = make("cairn.lineage_activation_receipt.v0.1", {
    authority_reservation_ref: refFor(activationReservation), authority_reservation_hash: activationReservation.reservation_hash,
    lineage_commitment_ref: refFor(reservationCommitment), lineage_commitment_hash: reservationCommitment.commitment_hash,
    actual_authority_ref: refFor(authorization), actual_authority_hash: authorization.authorization_hash,
    execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    prior_lineage_state_head_ref: refFor(activationBefore), prior_lineage_state_head_hash: activationBefore.state_hash,
    expected_activation_fence: activationBefore.fencing_token, next_activation_fence: activationBefore.fencing_token + 1,
    activated_action_ref: refFor(preparedAction), authority_transaction_id: "authority-transaction-activation",
    next_state_commitment_hash: activationStateCommitment, activated_at: activationAfterDraft.updated_at,
    authority_service_signature: {
      ...activationBefore.authority_service_signature, signed_at: "2026-07-22T10:02:00Z"
    }
  });
  const activationAfter = make("cairn.lineage_state_head.v0.1", {
    ...activationAfterDraft, activation_receipt_ref: refFor(activationReceipt),
    next_state_commitment_hash: activationStateCommitment
  });
  const activationGraph = {
    before: activationBefore, after: activationAfter, reservation: activationReservation,
    commitment: reservationCommitment, authority: authorization, binding, preparedAction
  };
  assert.deepEqual(validateLineageActivationReceipt(activationReceipt, activationGraph, context), [], JSON.stringify({
    activated_at: activationReceipt.activated_at,
    authority_signed_at: authorization.principal_signature.signed_at,
    authority_expires_at: authorization.expires_at,
    reservation_reserved_at: activationReservation.reserved_at,
    reservation_expires_at: activationReservation.expires_at,
    binding_created_at: binding.created_at,
    binding_expires_at: binding.expires_at,
    commitment_expires_at: reservationCommitment.expires_at
  }));
  const lateActivationDraft = make("cairn.lineage_state_head.v0.1", {
    ...activationAfter, activation_receipt_ref: distinctRefs(1, "late-activation-receipt-pending")[0],
    updated_at: "2026-07-22T10:06:00Z"
  });
  const lateActivationCommitment = lineageActiveStateCommitmentHash(lateActivationDraft);
  const lateActivationReceipt = make("cairn.lineage_activation_receipt.v0.1", {
    ...activationReceipt, activated_at: lateActivationDraft.updated_at,
    next_state_commitment_hash: lateActivationCommitment
  });
  const lateActivationAfter = make("cairn.lineage_state_head.v0.1", {
    ...lateActivationDraft, activation_receipt_ref: refFor(lateActivationReceipt),
    next_state_commitment_hash: lateActivationCommitment
  });
  assert.ok(validateLineageActivationReceipt(
    lateActivationReceipt, { ...activationGraph, after: lateActivationAfter }, context
  ).includes("lineage_activation_dependency_time_invalid"));
  const postActivationCommitment = make("cairn.lineage_commitment.v0.1", {
    ...reservationCommitment,
    authority_service_signature: {
      ...reservationCommitment.authority_service_signature, signed_at: "2026-07-22T10:03:00Z"
    }
  });
  assert.ok(validateLineageActivationReceipt(
    activationReceipt, { ...activationGraph, commitment: postActivationCommitment }, context
  ).includes("lineage_activation_dependency_time_invalid"));
  const postActivationPredecessor = make("cairn.lineage_state_head.v0.1", {
    ...activationBefore, updated_at: "2026-07-22T10:03:00Z",
    authority_service_signature: {
      ...activationBefore.authority_service_signature, signed_at: "2026-07-22T10:00:00Z"
    }
  });
  assert.ok(validateLineageActivationReceipt(
    activationReceipt, { ...activationGraph, before: postActivationPredecessor }, context
  ).includes("lineage_activation_dependency_time_invalid"));
  const prematurelySignedActivation = make("cairn.lineage_activation_receipt.v0.1", {
    ...activationReceipt,
    authority_service_signature: {
      ...activationReceipt.authority_service_signature, signed_at: "2026-07-22T10:01:59Z"
    }
  });
  assert.ok(validateLineageActivationReceipt(
    prematurelySignedActivation, activationGraph, context
  ).includes("lineage_activation_receipt_time_invalid"));
  const commitmentAfterBinding = make("cairn.lineage_commitment.v0.1", {
    ...reservationCommitment,
    authority_service_signature: {
      ...reservationCommitment.authority_service_signature, signed_at: "2026-07-22T10:00:30Z"
    }
  });
  assert.ok(validateLineageActivationReceipt(
    activationReceipt, { ...activationGraph, commitment: commitmentAfterBinding }, context
  ).includes("lineage_activation_causal_order_invalid"));
  const bindingAfterApproval = make("cairn.execution_binding_set.v0.1", {
    ...binding,
    binding_service_signature: {
      ...binding.binding_service_signature, signed_at: "2026-07-22T10:00:30Z"
    }
  });
  assert.ok(validateLineageActivationReceipt(
    activationReceipt, { ...activationGraph, binding: bindingAfterApproval }, context
  ).includes("lineage_activation_causal_order_invalid"));
  const approvalAfterAction = make("cairn.action_authorization.v0.2", {
    ...authorization,
    principal_signature: {
      ...authorization.principal_signature, signed_at: "2026-07-22T10:00:30Z"
    }
  });
  assert.ok(validateLineageActivationReceipt(
    activationReceipt, { ...activationGraph, authority: approvalAfterAction }, context
  ).includes("lineage_activation_causal_order_invalid"));
  const actionAfterReservation = make("cairn.action_record.v0.2", {
    ...preparedAction,
    action_service_signature: {
      ...preparedAction.action_service_signature, signed_at: "2026-07-22T10:01:30Z"
    }
  });
  assert.ok(validateLineageActivationReceipt(
    activationReceipt, { ...activationGraph, preparedAction: actionAfterReservation }, context
  ).includes("lineage_activation_causal_order_invalid"));
  const reservationAfterActivation = make("cairn.authority_reservation.v0.2", {
    ...activationReservation,
    authority_service_signature: {
      ...activationReservation.authority_service_signature, signed_at: "2026-07-22T10:02:30Z"
    }
  });
  assert.ok(validateLineageActivationReceipt(
    activationReceipt, { ...activationGraph, reservation: reservationAfterActivation }, context
  ).includes("lineage_activation_causal_order_invalid"));
  const predecessorAfterCommitment = make("cairn.lineage_state_head.v0.1", {
    ...activationBefore,
    authority_service_signature: {
      ...activationBefore.authority_service_signature, signed_at: "2026-07-22T10:00:30Z"
    }
  });
  assert.ok(validateLineageActivationReceipt(
    activationReceipt, { ...activationGraph, before: predecessorAfterCommitment }, context
  ).includes("lineage_activation_causal_order_invalid"));
  const crossWiredActivation = make("cairn.lineage_activation_receipt.v0.1", {
    ...activationReceipt, authority_reservation_ref: refFor(reservation), authority_reservation_hash: reservation.reservation_hash
  });
  const crossWiredAfter = make("cairn.lineage_state_head.v0.1", {
    ...activationAfter, activation_receipt_ref: refFor(crossWiredActivation)
  });
  assert.ok(validateLineageActivationReceipt(crossWiredActivation, { ...activationGraph, after: crossWiredAfter }, context)
    .includes("lineage_activation_receipt_head_mismatch"));
  const alienAuthorityRef = distinctRefs(1, "alien-activation-authority")[0];
  const alienAuthorityActivation = make("cairn.lineage_activation_receipt.v0.1", {
    ...activationReceipt, actual_authority_ref: alienAuthorityRef,
    actual_authority_hash: alienAuthorityRef.object_hash
  });
  assert.ok(validateLineageActivationReceipt(alienAuthorityActivation, activationGraph, context)
    .includes("lineage_activation_exact_authority_mismatch"));
  const alienBindingRef = distinctRefs(1, "alien-activation-binding")[0];
  const alienBindingActivation = make("cairn.lineage_activation_receipt.v0.1", {
    ...activationReceipt, execution_binding_set_ref: alienBindingRef,
    execution_binding_set_hash: alienBindingRef.object_hash
  });
  assert.ok(validateLineageActivationReceipt(alienBindingActivation, activationGraph, context)
    .includes("lineage_activation_exact_binding_mismatch"));
  const alienActionActivation = make("cairn.lineage_activation_receipt.v0.1", {
    ...activationReceipt, activated_action_ref: distinctRefs(1, "alien-activation-action")[0]
  });
  assert.ok(validateLineageActivationReceipt(alienActionActivation, activationGraph, context)
    .includes("lineage_activation_exact_action_mismatch"));
  const inventoryBinding = make("cairn.execution_binding_set.v0.1", {
    ...binding, capability: "submit_bindable_offer", copy_ids: ["copy-1"],
    obligation_exposure_core_ref: genericRef, obligation_exposure_core_hash: genericRef.object_hash,
    obligation_exposure_id: genericRef.object_hash, obligation_role: "create_or_update",
    exposure_vector: [{ amount_minor: 100, asset: "USD" }],
    ...financialBindingContext(genericRef),
    seller_inventory_context_kind: "ordinary_deal",
    seller_inventory_context_ref: genericRef, seller_inventory_context_hash: genericRef.object_hash,
    seller_inventory_stage: "ordinary_held", seller_inventory_state_head_ref: genericRef,
    seller_inventory_state_head_hash: genericRef.object_hash, seller_copy_lease_heads_root: genericRef.object_hash,
    seller_inventory_transition_receipt_ref: genericRef,
    seller_inventory_transition_receipt_hash: genericRef.object_hash,
    seller_inventory_authority_state_head_ref: genericRef,
    seller_inventory_authority_state_head_hash: genericRef.object_hash,
    seller_inventory_authority_signing_key_generation: 1,
    copy_ownership_registry_authority_state_head_ref: genericRef,
    copy_ownership_registry_authority_state_head_hash: genericRef.object_hash,
    copy_ownership_registry_authority_signing_key_generation: 1
  });
  assert.deepEqual(validateBindingSet(inventoryBinding, context),
    ["phase1_financial_external_truth_unsupported"]);
  const offerWithAdoptedInventory = make("cairn.execution_binding_set.v0.1", {
    ...inventoryBinding, seller_inventory_context_kind: "adopted_obligation", seller_inventory_stage: "adopted_consumed"
  });
  assert.ok(validateBindingSet(offerWithAdoptedInventory, context).includes("phase1_object_schema_invalid"));
  const evidenceCopyBinding = make("cairn.execution_binding_set.v0.1", {
    ...binding, capability: "request_evidence", copy_ids: ["copy-1"]
  });
  assert.deepEqual(validateBindingSet(evidenceCopyBinding, context), []);
  const inventoryPreparedAction = make("cairn.action_record.v0.2", {
    principal_id: inventoryBinding.principal_id, execution_binding_set_ref: refFor(inventoryBinding),
    execution_binding_set_hash: inventoryBinding.binding_set_hash,
    lineage_commitment_ref: inventoryBinding.lineage_commitment_ref,
    lineage_commitment_hash: inventoryBinding.lineage_commitment_hash,
    capability: inventoryBinding.capability
  });
  const missingReservationInventory = make("cairn.authority_reservation.v0.2", {
    ...reservation, prepared_action_ref: refFor(inventoryPreparedAction),
    execution_binding_set_ref: refFor(inventoryBinding), execution_binding_set_hash: inventoryBinding.binding_set_hash,
    obligation_exposure_core_ref: genericRef, obligation_exposure_state_before_ref: genericRef,
    obligation_exposure_state_after_ref: genericRef, economic_resource_exposure_before_ref: genericRef,
    economic_resource_exposure_after_ref: genericRef,
    exposure_vector: [{ amount_minor: 100, asset: "USD" }], seller_inventory_context: null
  });
  assert.ok(validateAuthorityReservation(missingReservationInventory, inventoryPreparedAction, inventoryBinding, reservationContext)
    .includes("reservation_inventory_context_mismatch"));
  const exactInventoryReservation = make("cairn.authority_reservation.v0.2", {
    ...missingReservationInventory,
    seller_inventory_context: {
      kind: "ordinary_held", context_ref: genericRef, state_head_ref: genericRef,
      copy_lease_heads_root: genericRef.object_hash, transition_receipt_ref: genericRef
    }
  });
  assert.deepEqual(validateAuthorityReservation(exactInventoryReservation, inventoryPreparedAction, inventoryBinding, reservationContext), []);
  const reservationAuthorityHashDrift = make("cairn.authority_reservation.v0.2", {
    ...reservation, authority_basis_hash: `sha-256:${"9".repeat(64)}`
  });
  assert.ok(validateAuthorityReservation(reservationAuthorityHashDrift, preparedAction, binding, reservationContext)
    .includes("phase1_ref_hash_mismatch"));
  const unledgeredReservation = make("cairn.authority_reservation.v0.2", {
    ...reservation, authority_limit_ledger_commit_refs: []
  });
  assert.ok(validateAuthorityReservation(unledgeredReservation, preparedAction, binding, reservationContext).includes("phase1_object_schema_invalid"));
  const skippedFence = make("cairn.authority_reservation.v0.2", { ...reservation, next_lineage_fence: 6 });
  assert.ok(validateAuthorityReservation(skippedFence, preparedAction, binding, reservationContext).includes("reservation_lineage_fence_invalid"));
  const coherentlyReboundReservation = make("cairn.authority_reservation.v0.2", {
    ...reservation, action_control_key: `sha-256:${"7".repeat(64)}`
  });
  assert.ok(validateAuthorityReservation(coherentlyReboundReservation, preparedAction, binding, reservationContext)
    .includes("reservation_binding_field_mismatch:action_control_key"));
  const overReservationReadBound = make("cairn.authority_reservation.v0.2", {
    ...reservation, source_read_receipt_refs: distinctRefs(33, "read")
  });
  assert.ok(validateAuthorityReservation(overReservationReadBound, preparedAction, binding, reservationContext)
    .includes("phase1_object_schema_invalid"));
  const overGateControlBound = make("cairn.gate_request.v0.2", {
    ...gateRequest, current_control_head_refs: distinctRefs(65, "control")
  });
  assert.ok(validateGateRequest(overGateControlBound, binding, authorization, confirmation, confirmationContext)
    .includes("phase1_object_schema_invalid"));
  const overAuthorizationDisclosureBound = make("cairn.action_authorization.v0.2", {
    ...authorization, disclosure_authorization_refs: distinctRefs(33, "disclosure")
  });
  assert.ok(validateActionAuthorization(overAuthorizationDisclosureBound, binding, context)
    .includes("phase1_object_schema_invalid"));
  const financialBinding = make("cairn.execution_binding_set.v0.1", {
    ...binding,
    execution_bundle_hash: built.bundle.bundle_hash, operation_registry_hash: audit.operationRegistryHash,
    cancellation_context: null, created_at: "2026-07-22T10:00:00Z", expires_at: "2026-07-22T10:05:00Z",
    capability: "submit_bindable_offer", obligation_exposure_core_ref: genericRef,
    obligation_exposure_core_hash: genericRef.object_hash, obligation_exposure_id: genericRef.object_hash,
    obligation_role: "create_or_update", exposure_vector: [{ amount_minor: 100, asset: "USD" }],
    fulfillment_attempt_core_ref: null, fulfillment_attempt_core_hash: null, payee_account_commitment: null, rail: null,
    ...financialBindingContext(genericRef)
  });
  assert.deepEqual(validateBindingSet(financialBinding, context),
    ["phase1_financial_external_truth_unsupported"]);
  const financialBindingWithoutQuoteProvenance = make("cairn.execution_binding_set.v0.1", {
    ...financialBinding, quote_snapshot_ref: null, quote_hash: null, provider_quote_import_receipt_ref: null,
    provider_quote_import_receipt_hash: null, quote_source_credential_lifecycle_head_ref: null,
    quote_source_credential_lifecycle_head_hash: null, quote_source_credential_generation: null,
    quote_importer_adapter_lifecycle_head_ref: null, quote_importer_adapter_lifecycle_head_hash: null
  });
  assert.ok(validateBindingSet(financialBindingWithoutQuoteProvenance, context).includes("phase1_object_schema_invalid"));
  const financialBindingWithoutAccountOverlay = make("cairn.execution_binding_set.v0.1", {
    ...financialBinding, provider_account_identity_trust_overlay_head_ref: null,
    provider_account_identity_trust_overlay_head_hash: null
  });
  assert.ok(validateBindingSet(financialBindingWithoutAccountOverlay, context).includes("phase1_object_schema_invalid"));
  const partialSublimit = make("cairn.execution_binding_set.v0.1", {
    ...financialBinding, provider_sublimit_identity_head_ref: genericRef
  });
  assert.ok(validateBindingSet(partialSublimit, context).includes("phase1_object_schema_invalid"));
  const wrongFinancialRole = make("cairn.execution_binding_set.v0.1", {
    ...financialBinding, obligation_role: "fulfill"
  });
  assert.ok(validateBindingSet(wrongFinancialRole, context).includes("phase1_object_schema_invalid"));
  const nonfinancialQuoteLeak = make("cairn.execution_binding_set.v0.1", {
    ...binding, quote_snapshot_ref: genericRef, quote_hash: genericRef.object_hash
  });
  assert.ok(validateBindingSet(nonfinancialQuoteLeak, context).includes("phase1_object_schema_invalid"));
  const financialAuthorization = make("cairn.action_authorization.v0.2", {
    execution_binding_set_ref: refFor(financialBinding), execution_binding_set_hash: financialBinding.binding_set_hash,
    lineage_commitment_ref: financialBinding.lineage_commitment_ref,
    lineage_commitment_hash: financialBinding.lineage_commitment_hash,
    capability: financialBinding.capability, obligation_exposure_core_ref: financialBinding.obligation_exposure_core_ref,
    obligation_exposure_core_hash: financialBinding.obligation_exposure_core_hash,
    obligation_exposure_id: financialBinding.obligation_exposure_id, obligation_role: financialBinding.obligation_role,
    exposure_vector: financialBinding.exposure_vector, fulfillment_attempt_core_ref: null,
    fulfillment_attempt_core_hash: null, payee_account_commitment: null, rail: null,
    required_confirmation_assurance_policy_ref: financialBinding.confirmation_assurance_policy_ref
  });
  assert.deepEqual(validateActionAuthorization(financialAuthorization, financialBinding, context), []);
  const mismatchedExposureAuthorization = make("cairn.action_authorization.v0.2", {
    ...financialAuthorization, exposure_vector: [{ amount_minor: 999, asset: "USD" }]
  });
  assert.ok(validateActionAuthorization(mismatchedExposureAuthorization, financialBinding, context).includes("authorization_binding_semantics_mismatch"));
  const financialAction = make("cairn.action_record.v0.2", {
    principal_id: financialBinding.principal_id, execution_binding_set_ref: refFor(financialBinding),
    execution_binding_set_hash: financialBinding.binding_set_hash,
    lineage_commitment_ref: financialBinding.lineage_commitment_ref,
    lineage_commitment_hash: financialBinding.lineage_commitment_hash,
    action_proposal_ref: financialBinding.action_proposal_ref,
    action_proposal_hash: financialBinding.action_proposal_hash,
    effect_descriptor_ref: financialBinding.effect_descriptor_ref,
    effect_id: financialBinding.effect_id, capability: financialBinding.capability
  });
  const emptyFinancialReservation = make("cairn.authority_reservation.v0.2", {
    prepared_action_ref: refFor(financialAction), execution_binding_set_ref: refFor(financialBinding),
    execution_binding_set_hash: financialBinding.binding_set_hash, authority_limit_ledger_commit_refs: [genericRef],
    obligation_exposure_core_ref: null, obligation_exposure_state_before_ref: null, obligation_exposure_state_after_ref: null,
    economic_resource_exposure_before_ref: null, economic_resource_exposure_after_ref: null, exposure_vector: []
  });
  assert.ok(validateAuthorityReservation(emptyFinancialReservation, financialAction, financialBinding, context).includes("reservation_financial_context_missing"));
  const financialReservation = make("cairn.authority_reservation.v0.2", {
    prepared_action_ref: refFor(financialAction), execution_binding_set_ref: refFor(financialBinding),
    execution_binding_set_hash: financialBinding.binding_set_hash,
    principal_id: financialBinding.principal_id, action_control_key: financialBinding.action_control_key,
    lineage_commitment_ref: financialBinding.lineage_commitment_ref,
    lineage_commitment_hash: financialBinding.lineage_commitment_hash,
    expected_lineage_fence: financialBinding.expected_lineage_activation_fence,
    next_lineage_fence: financialBinding.expected_lineage_activation_fence + 1,
    authority_limit_ledger_commit_refs: [genericRef],
    obligation_exposure_core_ref: financialBinding.obligation_exposure_core_ref,
    obligation_exposure_state_before_ref: genericRef, obligation_exposure_state_after_ref: genericRef,
    economic_resource_exposure_before_ref: financialBinding.pre_reservation_resource_exposure_state_head_ref,
    economic_resource_exposure_after_ref: genericRef, exposure_vector: financialBinding.exposure_vector,
    seller_inventory_context: null,
    reserved_at: "2026-07-22T10:01:00Z", expires_at: "2026-07-22T10:04:00Z"
  });
  assert.deepEqual(validateAuthorityReservation(financialReservation, financialAction, financialBinding, {
    ...context, lineageCommitment: reservationCommitment
  }), []);
  const alienExposureBefore = make("cairn.authority_reservation.v0.2", {
    ...financialReservation,
    economic_resource_exposure_before_ref: distinctRefs(1, "alien-economic-exposure-before")[0]
  });
  assert.ok(validateAuthorityReservation(alienExposureBefore, financialAction, financialBinding, {
    ...context, lineageCommitment: reservationCommitment
  }).includes("reservation_binding_field_mismatch:economic_resource_exposure_before_ref"));

  const cancellation = make("cairn.cancellation_authorization.v0.1");
  assert.ok(validateCancellationAuthorization(cancellation, null, context).includes("cancellation_binding_mismatch"));
  const cancellationRefHashDrift = make("cairn.cancellation_authorization.v0.1", {
    ...cancellation, execution_binding_set_hash: `sha-256:${"9".repeat(64)}`
  });
  assert.ok(validateCancellationAuthorization(cancellationRefHashDrift, null, context)
    .includes("phase1_ref_hash_mismatch"));
  const unsafeOrdinary = make("cairn.cancellation_authorization.v0.1", { restrictive_control_scope: "connection" });
  assert.ok(validateCancellationAuthorization(unsafeOrdinary, null, context).includes("phase1_object_schema_invalid"));

  const beforeAction = make("cairn.action_state_head.v0.1", {
    action_id: preparedAction.action_id, action_ref: refFor(preparedAction), sequence: 0,
    previous_state_hash: null, state: "prepared", prior_transition_receipt_ref: null
  });
  const actionReceipt = make("cairn.action_receipt.v0.2", {
    action_ref: refFor(preparedAction), execution_binding_set_ref: refFor(binding),
    execution_binding_set_hash: binding.binding_set_hash, effect_id: binding.effect_id,
    lineage_state_head_ref: refFor(activationBefore),
    state_before: "prepared", state_after: "authorized", prior_action_receipt_ref: null
  });
  const afterAction = make("cairn.action_state_head.v0.1", {
    action_id: preparedAction.action_id, action_ref: refFor(preparedAction), sequence: 1,
    previous_state_hash: beforeAction.state_hash, state: "authorized", authority_ref: refFor(authorization),
    prior_transition_receipt_ref: refFor(actionReceipt)
  });
  const untypedTransitionHead = make("cairn.action_state_head.v0.1", {
    ...afterAction, prior_transition_receipt_ref: distinctRefs(1, "untyped-transition-receipt")[0]
  });
  assert.ok(validateActionStateTransition(beforeAction, untypedTransitionHead, context).includes("phase1_object_schema_invalid"));
  const actionReceiptContext = {
    ...context, action: preparedAction, lineageStateHead: activationBefore,
    lineageCommitment: reservationCommitment
  };
  assert.deepEqual(validateActionReceipt(actionReceipt, beforeAction, afterAction, binding, actionReceiptContext), []);
  const chronologyFixture = ({
    beforeUpdatedAt = "2026-07-22T10:00:00Z",
    beforeSignedAt = "2026-07-22T10:00:00Z",
    issuedAt = "2026-07-22T10:00:00Z",
    receiptSignedAt = "2026-07-22T10:00:00Z",
    afterUpdatedAt = "2026-07-22T10:00:00Z",
    afterSignedAt = "2026-07-22T10:00:00Z"
  } = {}) => {
    const predecessor = make("cairn.action_state_head.v0.1", {
      ...beforeAction, updated_at: beforeUpdatedAt,
      action_service_signature: { ...beforeAction.action_service_signature, signed_at: beforeSignedAt }
    });
    const receipt = make("cairn.action_receipt.v0.2", {
      ...actionReceipt, issued_at: issuedAt,
      action_service_signature: { ...actionReceipt.action_service_signature, signed_at: receiptSignedAt }
    });
    const successor = make("cairn.action_state_head.v0.1", {
      ...afterAction, previous_state_hash: predecessor.state_hash,
      prior_transition_receipt_ref: refFor(receipt), updated_at: afterUpdatedAt,
      action_service_signature: { ...afterAction.action_service_signature, signed_at: afterSignedAt }
    });
    return { predecessor, receipt, successor };
  };
  for (const invalid of [
    { beforeUpdatedAt: "2026-07-22T10:00:01Z" },
    { beforeSignedAt: "2026-07-22T10:00:01Z" },
    { afterUpdatedAt: "2026-07-22T10:00:01Z", afterSignedAt: "2026-07-22T10:00:01Z" },
    { receiptSignedAt: "2026-07-22T09:59:59Z" },
    { afterSignedAt: "2026-07-22T09:59:59Z" }
  ]) {
    const specimen = chronologyFixture(invalid);
    assert.ok(validateActionReceipt(
      specimen.receipt, specimen.predecessor, specimen.successor, binding, actionReceiptContext
    ).includes("action_receipt_chronology_invalid"), JSON.stringify(invalid));
  }
  const stateTimeRegression = chronologyFixture({
    beforeUpdatedAt: "2026-07-22T10:00:01Z", beforeSignedAt: "2026-07-22T10:00:00Z",
    issuedAt: "2026-07-22T10:00:02Z", receiptSignedAt: "2026-07-22T10:00:02Z",
    afterUpdatedAt: "2026-07-22T10:00:00Z", afterSignedAt: "2026-07-22T10:00:02Z"
  });
  assert.ok(validateActionStateTransition(
    stateTimeRegression.predecessor, stateTimeRegression.successor, context
  ).includes("action_state_chronology_invalid"));
  const stateLatePredecessorSignature = chronologyFixture({
    beforeUpdatedAt: "2026-07-22T10:00:00Z", beforeSignedAt: "2026-07-22T10:00:01Z",
    issuedAt: "2026-07-22T10:00:02Z", receiptSignedAt: "2026-07-22T10:00:02Z",
    afterUpdatedAt: "2026-07-22T10:00:00Z", afterSignedAt: "2026-07-22T10:00:02Z"
  });
  assert.ok(validateActionStateTransition(
    stateLatePredecessorSignature.predecessor, stateLatePredecessorSignature.successor, context
  ).includes("action_state_chronology_invalid"));
  const statePrematureSuccessorSignature = chronologyFixture({
    beforeUpdatedAt: "2026-07-22T10:00:00Z", beforeSignedAt: "2026-07-22T10:00:00Z",
    issuedAt: "2026-07-22T10:00:01Z", receiptSignedAt: "2026-07-22T10:00:01Z",
    afterUpdatedAt: "2026-07-22T10:00:01Z", afterSignedAt: "2026-07-22T10:00:00Z"
  });
  assert.ok(validateActionStateTransition(
    statePrematureSuccessorSignature.predecessor, statePrematureSuccessorSignature.successor, context
  ).includes("action_state_chronology_invalid"));
  const latePredecessorSignature = chronologyFixture({
    beforeSignedAt: "2026-07-22T10:00:01Z", issuedAt: "2026-07-22T10:00:02Z",
    receiptSignedAt: "2026-07-22T10:00:02Z", afterUpdatedAt: "2026-07-22T10:00:02Z",
    afterSignedAt: "2026-07-22T10:00:02Z"
  });
  assert.deepEqual(validateActionStateTransition(
    latePredecessorSignature.predecessor, latePredecessorSignature.successor, context
  ), []);
  const successorSignedBeforeReceipt = chronologyFixture({
    issuedAt: "2026-07-22T10:00:00Z", receiptSignedAt: "2026-07-22T10:00:01Z",
    afterUpdatedAt: "2026-07-22T10:00:00Z", afterSignedAt: "2026-07-22T10:00:00Z"
  });
  assert.ok(validateActionReceipt(
    successorSignedBeforeReceipt.receipt, successorSignedBeforeReceipt.predecessor,
    successorSignedBeforeReceipt.successor, binding, actionReceiptContext
  ).includes("action_receipt_chronology_invalid"));
  const tamperedLineageDependency = { ...activationBefore, updated_at: "2026-07-22T10:03:00Z" };
  assert.ok(validateActionReceipt(
    actionReceipt, beforeAction, afterAction, binding,
    { ...actionReceiptContext, lineageStateHead: tamperedLineageDependency }
  ).includes("action_receipt_lineage_state_object_hash_mismatch"));
  const alienReceiptCommitment = make("cairn.lineage_commitment.v0.1", {
    ...reservationCommitment, canonical_business_tuple_hash: `sha-256:${"7".repeat(64)}`
  });
  const alienReceiptBinding = make("cairn.execution_binding_set.v0.1", {
    ...binding, lineage_commitment_ref: refFor(alienReceiptCommitment),
    lineage_commitment_hash: alienReceiptCommitment.commitment_hash
  });
  const crossLineageAction = make("cairn.action_record.v0.2", {
    ...preparedAction, execution_binding_set_ref: refFor(alienReceiptBinding),
    execution_binding_set_hash: alienReceiptBinding.binding_set_hash
  });
  const crossLineageBefore = make("cairn.action_state_head.v0.1", {
    ...beforeAction, action_id: crossLineageAction.action_id, action_ref: refFor(crossLineageAction)
  });
  const crossLineageReceiptSeed = make("cairn.action_receipt.v0.2", {
    ...actionReceipt, action_ref: refFor(crossLineageAction),
    execution_binding_set_ref: refFor(alienReceiptBinding),
    execution_binding_set_hash: alienReceiptBinding.binding_set_hash
  });
  const crossLineageAfter = make("cairn.action_state_head.v0.1", {
    ...afterAction, action_id: crossLineageAction.action_id, action_ref: refFor(crossLineageAction),
    previous_state_hash: crossLineageBefore.state_hash,
    prior_transition_receipt_ref: refFor(crossLineageReceiptSeed)
  });
  assert.ok(validateActionReceipt(
    crossLineageReceiptSeed, crossLineageBefore, crossLineageAfter, alienReceiptBinding,
    { ...actionReceiptContext, action: crossLineageAction }
  ).includes("action_receipt_lineage_mismatch"));
  const foreignActionId = `sha-256:${"f".repeat(64)}`;
  const foreignIdReceiptBefore = make("cairn.action_state_head.v0.1", {
    ...beforeAction, action_id: foreignActionId
  });
  const foreignIdReceiptAfter = make("cairn.action_state_head.v0.1", {
    ...afterAction, action_id: foreignActionId, previous_state_hash: foreignIdReceiptBefore.state_hash
  });
  assert.ok(validateActionReceipt(
    actionReceipt, foreignIdReceiptBefore, foreignIdReceiptAfter, binding, actionReceiptContext
  ).includes("action_receipt_action_id_mismatch"));
  const driftedReceiptLineageHead = make("cairn.lineage_state_head.v0.1", {
    ...activationBefore, principal_occurrence_id: foreignActionId
  });
  const driftedReceiptLineage = make("cairn.action_receipt.v0.2", {
    ...actionReceipt, lineage_state_head_ref: refFor(driftedReceiptLineageHead)
  });
  const driftedReceiptLineageAfter = make("cairn.action_state_head.v0.1", {
    ...afterAction, prior_transition_receipt_ref: refFor(driftedReceiptLineage)
  });
  assert.ok(validateActionReceipt(
    driftedReceiptLineage, beforeAction, driftedReceiptLineageAfter, binding,
    { ...actionReceiptContext, lineageStateHead: driftedReceiptLineageHead }
  ).includes("action_receipt_lineage_identity_mismatch:principal_occurrence_id"));
  const skippedActionReceipt = make("cairn.action_receipt.v0.2", {
    ...actionReceipt, prior_action_receipt_ref: {
      ...distinctRefs(1, "alien-prior-action-receipt")[0], schema: "cairn.action_receipt.v0.2"
    }
  });
  assert.ok(validateActionReceipt(skippedActionReceipt, beforeAction, afterAction, binding, actionReceiptContext)
    .includes("action_receipt_prior_chain_mismatch"));
  const alienReceiptLineage = make("cairn.action_receipt.v0.2", {
    ...actionReceipt, lineage_state_head_ref: distinctRefs(1, "alien-receipt-lineage")[0]
  });
  assert.ok(validateActionReceipt(alienReceiptLineage, beforeAction, afterAction, binding, actionReceiptContext)
    .includes("action_receipt_lineage_mismatch"));
  const activityDetail = make("cairn.execution_activity_detail.v0.1", {
    principal_id: preparedAction.principal_id, action_ref: refFor(preparedAction),
    action_state_head_ref: refFor(afterAction), binding_set_ref: preparedAction.execution_binding_set_ref,
    lineage_state_head_ref: refFor(activationBefore), authority_basis_ref: afterAction.authority_ref,
    current_receipt_refs: [refFor(actionReceipt)], state: afterAction.state
  });
  const actionView = make("cairn.execution_action_view.v0.1", {
    action_record_ref: refFor(preparedAction), current_action_state_head_ref: refFor(afterAction),
    current_lineage_state_head_ref: refFor(activationBefore), current_activity_detail_ref: refFor(activityDetail)
  });
  const actionResponse = {
    ref: refFor(actionView), view: actionView, action_record: preparedAction,
    execution_binding_set: binding, lineage_commitment: reservationCommitment,
    current_action_state_head: afterAction, current_lineage_state_head: activationBefore,
    current_activity_detail: activityDetail, authority_basis: authorization, authority_reservations: [],
    confirmation_receipt: null, gate_request: null, gate_result: null,
    retrieved_at: actionView.assembled_at
  };
  const actionRequest = { ref: refFor(actionView) };
  const signedCompositeContext = signedActionGetContext(actionResponse);
  const actionResponseFailures = validateActionGetResponse(
    actionRequest, actionResponse, signedCompositeContext
  );
  assert.ok(actionResponseFailures.includes("phase1_authenticated_resolution_unsupported"));
  assert.equal(actionResponseFailures.some((code) => code.startsWith("action_get_current_")), false,
    JSON.stringify(actionResponseFailures));
  assert.equal(actionResponseFailures.includes("action_get_authority_mismatch"), false);
  assert.equal(actionResponseFailures.includes("action_get_authority_branch_mismatch"), false);
  const observedActionHistoryTimes = [];
  const historicalHeadResolver = signedCompositeContext.currentHeadHistoryResolver;
  const observedKeyTimes = [];
  const historicalKeyResolver = signedCompositeContext.keyResolver;
  const observedHistoricalActionFailures = validateActionGetResponse(actionRequest, actionResponse, {
    ...signedCompositeContext,
    gateEvaluationTime: "2026-07-22T09:00:00Z",
    currentHeadHistoryResolver: (reference, evaluationTime) => {
      observedActionHistoryTimes.push(evaluationTime);
      return historicalHeadResolver(reference, evaluationTime);
    },
    keyResolver: (keyId, evaluationTime) => {
      observedKeyTimes.push(evaluationTime);
      return historicalKeyResolver.get(keyId) ?? null;
    }
  });
  assert.ok(observedHistoricalActionFailures.includes("phase1_authenticated_resolution_unsupported"));
  assert.ok(observedActionHistoryTimes.length >= 3);
  assert.ok(observedActionHistoryTimes.every((instant) => instant === actionView.assembled_at));
  assert.ok(observedKeyTimes.every((instant) => instant === "2026-07-22T10:00:00Z"));
  const tamperedRetrievalHistoryTimes = [];
  const tamperedRetrievalFailures = validateActionGetResponse(actionRequest, {
    ...actionResponse, retrieved_at: "2026-07-22T10:03:00Z"
  }, {
    ...signedCompositeContext,
    currentHeadHistoryResolver: (reference, evaluationTime) => {
      tamperedRetrievalHistoryTimes.push(evaluationTime);
      return historicalHeadResolver(reference, evaluationTime);
    }
  });
  assert.ok(tamperedRetrievalFailures.includes("action_get_snapshot_time_mismatch"));
  assert.ok(tamperedRetrievalHistoryTimes.length >= 3);
  assert.ok(tamperedRetrievalHistoryTimes.every(
    (instant) => instant === actionView.assembled_at
  ));
  const lateSignedActionView = make("cairn.execution_action_view.v0.1", {
    ...actionView,
    activity_service_signature: {
      ...actionView.activity_service_signature,
      signed_at: "2026-07-22T10:00:01Z"
    }
  });
  const lateSignedActionResponse = {
    ...actionResponse,
    ref: refFor(lateSignedActionView),
    view: lateSignedActionView,
    retrieved_at: lateSignedActionView.assembled_at
  };
  assert.ok(validateActionGetResponse(
    { ref: refFor(lateSignedActionView) }, lateSignedActionResponse,
    signedActionGetContext(lateSignedActionResponse)
  ).includes("action_get_view_signature_from_future"));
  const liveOnlyHistoryFailures = validateActionGetResponse(actionRequest, actionResponse, {
    ...signedCompositeContext, currentHeadHistoryResolver: null,
    currentHeadResolver: (reference) => reference
  });
  assert.ok(liveOnlyHistoryFailures.includes("action_get_current_action_state_mismatch"));
  const laterHeadAdvanceFailures = validateActionGetResponse(actionRequest, actionResponse, {
    ...signedCompositeContext,
    currentHeadResolver: currentHeadResolverFor([
      { ...refFor(afterAction), object_hash: `sha-256:${"7".repeat(64)}` },
      { ...refFor(activationBefore), object_hash: `sha-256:${"6".repeat(64)}` },
      { ...refFor(activityDetail), object_hash: `sha-256:${"5".repeat(64)}` }
    ])
  });
  assert.equal(laterHeadAdvanceFailures.some((code) => code.startsWith("action_get_current_")), false,
    JSON.stringify(laterHeadAdvanceFailures));
  const wrongActionPredecessor = make("cairn.action_state_head.v0.1", {
    ...beforeAction, action_id: `sha-256:${"d".repeat(64)}`
  });
  assert.ok(validateActionGetResponse(actionRequest, actionResponse, {
    ...signedCompositeContext, actionStatePredecessor: wrongActionPredecessor
  }).includes("action_get_action_state_action_state_identity_mismatch"));
  const historicalActionFailures = validateActionGetResponse(actionRequest, actionResponse, {
    ...signedCompositeContext, principalRevocationNonce: authorization.principal_revocation_nonce + 1,
    requiredReservedJudgments: ["new_judgment_after_authorization"]
  });
  assert.ok(historicalActionFailures.includes("phase1_authenticated_resolution_unsupported"));
  assert.equal(historicalActionFailures.includes(
    "action_get_authority_authorization_principal_revocation_nonce_mismatch"
  ), false, JSON.stringify(historicalActionFailures));
  assert.equal(historicalActionFailures.includes(
    "action_get_authority_authorization_reserved_judgments_mismatch"
  ), false, JSON.stringify(historicalActionFailures));
  const staleActionStateRef = {
    ...refFor(afterAction), object_hash: `sha-256:${"8".repeat(64)}`
  };
  assert.ok(validateActionGetResponse(actionRequest, actionResponse, {
    ...signedCompositeContext,
    currentHeadHistoryResolver: currentHeadResolverFor([
      staleActionStateRef, refFor(activationBefore), refFor(activityDetail)
    ])
  }).includes("action_get_current_action_state_mismatch"));
  const invalidSignedActionRecord = structuredClone(preparedAction);
  invalidSignedActionRecord.action_service_signature.value = "A".repeat(86);
  assert.ok(validateActionGetResponse(actionRequest, {
    ...actionResponse, action_record: invalidSignedActionRecord
  }, signedCompositeContext).includes("action_get_action_record_signature_invalid"));
  const preparedActivity = make("cairn.execution_activity_detail.v0.1", {
    principal_id: preparedAction.principal_id, action_ref: refFor(preparedAction),
    action_state_head_ref: refFor(beforeAction), binding_set_ref: preparedAction.execution_binding_set_ref,
    lineage_state_head_ref: refFor(activationBefore), authority_basis_ref: null,
    current_receipt_refs: [], state: beforeAction.state
  });
  const preparedView = make("cairn.execution_action_view.v0.1", {
    action_record_ref: refFor(preparedAction), current_action_state_head_ref: refFor(beforeAction),
    current_lineage_state_head_ref: refFor(activationBefore), current_activity_detail_ref: refFor(preparedActivity)
  });
  const preparedResponse = {
    ...actionResponse, ref: refFor(preparedView), view: preparedView,
    current_action_state_head: beforeAction, current_activity_detail: preparedActivity,
    authority_basis: null
  };
  assert.ok(validateActionGetResponse(
    { ref: refFor(preparedView) }, preparedResponse, signedActionGetContext(preparedResponse)
  ).includes("phase1_authenticated_resolution_unsupported"));
  const mandateAgentSeed = sampleFor(schemasByObjectId.get("cairn.agent_mandate.v0.3")).agent;
  const mandateRuntimeSchema = baseSchemasByObjectId.get("cairn.agent_runtime_binding.v0.1");
  const mandateRuntimeSeed = sampleFor(mandateRuntimeSchema);
  mandateRuntimeSeed.agent_identity.agent_provider_id = mandateAgentSeed.provider_id;
  mandateRuntimeSeed.agent_identity.agent_product_id = mandateAgentSeed.product_id;
  mandateRuntimeSeed.runtime_public_key.public_key = "A".repeat(43);
  mandateRuntimeSeed.not_before = "2026-07-22T09:00:00Z";
  mandateRuntimeSeed.expires_at = "2026-07-23T10:00:00Z";
  const mandateRuntime = bindObjectHash(mandateRuntimeSeed, mandateRuntimeSchema);
  const mandateRuntimeRef = objectRefFor(mandateRuntime, mandateRuntimeSchema);
  const mandateConnectionAuthorization = make("cairn.agent_connection_authorization.v0.1", {
    principal_id: binding.principal_id, agent_runtime_binding_ref: mandateRuntimeRef,
    not_before: "2026-07-22T09:00:00Z", expires_at: "2026-07-23T10:00:00Z"
  });
  const mandateConnectionState = make("cairn.agent_connection_state_head.v0.1", {
    principal_id: binding.principal_id,
    connection_authorization_ref: refFor(mandateConnectionAuthorization),
    connection_authorization_hash: mandateConnectionAuthorization.authorization_hash,
    agent_runtime_binding_ref: mandateRuntimeRef, state: "active",
    sequence: 0, previous_state_hash: null,
    accepted_at: "2026-07-22T09:30:00Z", updated_at: "2026-07-22T10:00:00Z"
  });
  confirmationContext.currentHeadResolver = currentHeadResolverFor([refFor(mandateConnectionState)]);
  for (const [reference, object] of [
    [mandateRuntimeRef, mandateRuntime],
    [refFor(mandateConnectionAuthorization), mandateConnectionAuthorization],
    [refFor(mandateConnectionState), mandateConnectionState]
  ]) context.objectResolver.set(reference.object_hash, object);
  const signedMandateConnectionContext = signedReadContext([
    mandateRuntime, mandateConnectionAuthorization, mandateConnectionState
  ], confirmationContext, binding.principal_id);
  assert.deepEqual(validateConnectionAuthorization(
    mandateConnectionAuthorization, signedMandateConnectionContext
  ), []);
  assert.deepEqual(validateConnectionStateHead(mandateConnectionState, signedMandateConnectionContext), []);
  const staleConnectionHead = { ...refFor(mandateConnectionState), object_hash: `sha-256:${"7".repeat(64)}` };
  assert.ok(validateConnectionStateHead(mandateConnectionState, {
    ...confirmationContext, requireCurrentConnection: true,
    currentHeadResolver: currentHeadResolverFor([staleConnectionHead])
  }).includes("connection_state_not_current"));
  assert.deepEqual(validateExactObjectRead(
    "execution.connection_authorization.get",
    { ref: refFor(mandateConnectionAuthorization) }, mandateConnectionAuthorization,
    signedMandateConnectionContext
  ), ["phase1_authenticated_resolution_unsupported"]);
  assert.ok(validateExactObjectRead(
    "execution.connection_authorization.get",
    { ref: refFor(mandateConnectionAuthorization) }, mandateConnectionAuthorization,
    { ...signedMandateConnectionContext, objectResolver: new Map() }
  ).includes("object_read_connection_authorization_runtime_unresolved"));
  assert.deepEqual(validateExactObjectRead(
    "execution.connection_state.get", { ref: refFor(mandateConnectionState) },
    mandateConnectionState, signedMandateConnectionContext
  ), ["phase1_authenticated_resolution_unsupported"]);
  assert.ok(validateExactObjectRead(
    "execution.connection_state.get", { ref: refFor(mandateConnectionState) }, mandateConnectionState,
    { ...signedMandateConnectionContext, objectResolver: new Map([[mandateRuntimeRef.object_hash, mandateRuntime]]) }
  ).includes("object_read_connection_state_authorization_binding_mismatch"));
  const mandateSeed = make("cairn.agent_mandate.v0.3", {
    principal_id: binding.principal_id, capability: binding.capability,
    agent: {
      ...mandateAgentSeed, runtime_binding_ref: mandateRuntimeRef,
      connection_authorization_ref: refFor(mandateConnectionAuthorization)
    },
    required_confirmation_assurance_policy_ref: binding.confirmation_assurance_policy_ref,
    issued_at: "2026-07-22T10:00:00Z"
  });
  const nonfinancialMandateConstraints = {
    ...mandateSeed.constraints,
    kind: "nonfinancial",
    financial: null,
    nonfinancial: { maximum_payload_bytes: 1048576, allowed_audiences: ["cairn:test"] },
    not_before: "2026-07-22T10:00:00Z",
    expires_at: "2026-07-22T10:05:00Z"
  };
  const mandateScope = {
    ...mandateSeed.scope_bindings[0],
    deal_ref: binding.deal_ref,
    proposal_ref: binding.action_proposal_ref,
    cart_hash: binding.closed_terms_or_cart_hash,
    copy_ids: binding.copy_ids,
    asset: null,
    ultimate_receiver_or_payee: binding.ultimate_receiver,
    receiver_account_or_contract_scope: binding.receiver_account_or_contract_scope,
    receiver_operation_namespace: binding.receiver_operation_namespace,
    explicit_scope_selection_proof_ref: binding.explicit_scope_selection_proof_ref,
    explicit_scope_selection_proof_hash: binding.explicit_scope_selection_proof_hash,
    payee_account_commitment: binding.payee_account_commitment,
    rail: binding.rail,
    data_grant_refs: binding.data_grant_refs,
    compartment_ref: binding.compartment_ref,
    economic_resource_key: binding.economic_resource_key,
    provider_account_identity_head_ref: binding.provider_account_identity_head_ref,
    account_generation: binding.account_generation,
    provider_account_identity_trust_overlay_head_ref: binding.provider_account_identity_trust_overlay_head_ref,
    provider_account_identity_trust_overlay_head_hash: binding.provider_account_identity_trust_overlay_head_hash,
    provider_sublimit_identity_head_ref: binding.provider_sublimit_identity_head_ref,
    provider_sublimit_identity_head_hash: binding.provider_sublimit_identity_head_hash,
    provider_sublimit_id: binding.provider_sublimit_id,
    sublimit_generation: binding.sublimit_generation,
    provider_sublimit_identity_trust_overlay_head_ref: binding.provider_sublimit_identity_trust_overlay_head_ref,
    provider_sublimit_identity_trust_overlay_head_hash: binding.provider_sublimit_identity_trust_overlay_head_hash,
    executor_target: binding.executor_target,
    accounting_policy_ref: binding.accounting_policy_ref,
    receiver_finality_profile_ref: binding.receiver_finality_profile_ref,
    receiver_sequence_epoch_selector_key: binding.receiver_sequence_epoch_selector_key,
    lineage_policy: {
      ...mandateSeed.scope_bindings[0].lineage_policy,
      principal_occurrence_id: reservationCommitment.principal_occurrence_id
    }
  };
  const mandate = make("cairn.agent_mandate.v0.3", {
    ...mandateSeed, constraints: nonfinancialMandateConstraints, scope_bindings: [mandateScope]
  });
  const preauthorizedResponseFor = (authority) => {
    const commitment = make("cairn.lineage_commitment.v0.1", {
      ...reservationCommitment, authority_kind: "preauthorized_mandate",
      mandate_ref: refFor(authority), scope_binding_index: 0,
      canonical_business_tuple_hash: mandateBusinessTupleHash(authority.scope_bindings[0])
    });
    const mandateBinding = make("cairn.execution_binding_set.v0.1", {
      ...binding, lineage_commitment_ref: refFor(commitment),
      lineage_commitment_hash: commitment.commitment_hash,
      canonical_business_tuple_hash: commitment.canonical_business_tuple_hash,
      actor_branch: "agent_runtime", agent_runtime_binding_ref: mandateRuntimeRef,
      connection_authorization_ref: refFor(mandateConnectionAuthorization),
      connection_state_head_ref: refFor(mandateConnectionState)
    });
    const mandateAction = make("cairn.action_record.v0.2", {
      ...preparedAction, execution_binding_set_ref: refFor(mandateBinding),
      execution_binding_set_hash: mandateBinding.binding_set_hash,
      lineage_commitment_ref: refFor(commitment), lineage_commitment_hash: commitment.commitment_hash
    });
    const mandateLineage = make("cairn.lineage_state_head.v0.1", {
      ...activationBefore, commitment_ref: refFor(commitment),
      principal_occurrence_id: commitment.principal_occurrence_id,
      principal_authorized_lineage_id: commitment.principal_authorized_lineage_id,
      action_control_key: commitment.action_control_key,
      attempt_sequence: commitment.attempt_sequence,
      commitment_generation: commitment.commitment_generation,
      fencing_token: commitment.expected_activation_fence
    });
    const mandateState = make("cairn.action_state_head.v0.1", {
      ...beforeAction, action_id: mandateAction.action_id, action_ref: refFor(mandateAction),
      authority_ref: null
    });
    const issuanceConfirmation = confirmationReceiptFixture(
      authority, mandateBinding, confirmationFixture
    );
    const mandateActivity = make("cairn.execution_activity_detail.v0.1", {
      ...activityDetail, principal_id: mandateAction.principal_id, action_ref: refFor(mandateAction),
      action_state_head_ref: refFor(mandateState), binding_set_ref: refFor(mandateBinding),
      lineage_state_head_ref: refFor(mandateLineage), authority_basis_ref: refFor(authority),
      current_receipt_refs: [], state: mandateState.state
    });
    const mandateView = make("cairn.execution_action_view.v0.1", {
      action_record_ref: refFor(mandateAction), current_action_state_head_ref: refFor(mandateState),
      current_lineage_state_head_ref: refFor(mandateLineage), current_activity_detail_ref: refFor(mandateActivity)
    });
    return {
      request: { ref: refFor(mandateView) },
      response: {
        ...actionResponse, ref: refFor(mandateView), view: mandateView, action_record: mandateAction,
        execution_binding_set: mandateBinding, lineage_commitment: commitment,
        current_action_state_head: mandateState, current_lineage_state_head: mandateLineage,
        current_activity_detail: mandateActivity, authority_basis: authority,
        confirmation_receipt: issuanceConfirmation
      }
    };
  };
  const mandateGraph = preauthorizedResponseFor(mandate);
  const actionGetResponseSchema = context.ajv.getSchema(
    "https://cairn.cards/protocol/execution/schemas/v0.1/operation-bodies.schema.json#/$defs/actionGetResponse"
  );
  assert.equal(actionGetResponseSchema(mandateGraph.response), true, JSON.stringify(actionGetResponseSchema.errors));
  const mandateIssuanceConfirmationFailures = validateExecutionConfirmation(
    mandateGraph.response.confirmation_receipt,
    mandateGraph.response.authority_basis,
    mandateGraph.response.execution_binding_set,
    null,
    {
      ...confirmationContext,
      confirmationEvaluationTime: mandateGraph.response.confirmation_receipt.verified_at
    }
  );
  assert.equal(
    mandateIssuanceConfirmationFailures.includes("confirmation_binding_branch_mismatch"),
    false
  );
  const mandateReadContext = signedActionGetContext(
    mandateGraph.response, signedMandateConnectionContext
  );
  const mandateReadFailures = validateActionGetResponse(
    mandateGraph.request, mandateGraph.response, mandateReadContext
  );
  assert.ok(mandateReadFailures.includes("phase1_authenticated_resolution_unsupported"));
  assert.equal(mandateReadFailures.includes(
    "action_get_confirmation_confirmation_lifecycle_current_active_mismatch"
  ), false, JSON.stringify(mandateReadFailures));
  const missingPolicyHistoryFailures = validateActionGetResponse(
    mandateGraph.request, mandateGraph.response, {
      ...mandateReadContext,
      policyLifecycleHistoryResolver: null,
      currentPolicyLifecycleResolver: confirmationFixture.currentPolicyLifecycleResolver
    }
  );
  assert.ok(missingPolicyHistoryFailures.includes(
    "action_get_confirmation_confirmation_lifecycle_current_active_mismatch"
  ), JSON.stringify(missingPolicyHistoryFailures));
  const tupleDriftBinding = make("cairn.execution_binding_set.v0.1", {
    ...mandateGraph.response.execution_binding_set,
    canonical_business_tuple_hash: `sha-256:${"c".repeat(64)}`
  });
  const tupleDriftConfirmation = confirmationReceiptFixture(
    mandate, tupleDriftBinding, confirmationFixture
  );
  const tupleDriftGate = make("cairn.gate_request.v0.2", {
    ...gateRequest, authority_basis_ref: refFor(mandate),
    confirmation_receipt_ref: refFor(tupleDriftConfirmation),
    execution_binding_set_ref: refFor(tupleDriftBinding),
    execution_binding_set_hash: tupleDriftBinding.binding_set_hash,
    action_control_key: tupleDriftBinding.action_control_key
  });
  assert.ok(validateGateRequest(
    tupleDriftGate, tupleDriftBinding, mandate, tupleDriftConfirmation,
    { ...confirmationContext, lineageCommitment: mandateGraph.response.lineage_commitment }
  ).includes("gate_request_mandate_business_tuple_mismatch"));
  const mismatchedMandateCapability = binding.capability === "request_evidence"
    ? "send_typed_nonbinding_notice"
    : "request_evidence";
  const mismatchedMandate = make("cairn.agent_mandate.v0.3", {
    ...mandate, capability: mismatchedMandateCapability
  });
  const mismatchedMandateGraph = preauthorizedResponseFor(mismatchedMandate);
  assert.ok(validateActionGetResponse(
    mismatchedMandateGraph.request, mismatchedMandateGraph.response, confirmationContext
  ).includes("action_get_mandate_binding_identity_mismatch"));
  const mismatchedMandateSeller = make("cairn.agent_mandate.v0.3", {
    ...mandate,
    scope_bindings: [{ ...mandate.scope_bindings[0], seller_id: "did:example:foreign-seller" }]
  });
  const mismatchedMandateSellerGraph = preauthorizedResponseFor(mismatchedMandateSeller);
  assert.ok(validateActionGetResponse(
    mismatchedMandateSellerGraph.request, mismatchedMandateSellerGraph.response, confirmationContext
  ).includes("action_get_mandate_scope_binding_mismatch:seller_id"));
  for (const [field, value] of [
    ["intent_refs", distinctRefs(1, "foreign-intent")],
    ["counterparties", ["did:example:foreign-counterparty"]],
    ["listing_refs", distinctRefs(1, "foreign-listing")],
    ["asset", "USD"],
    ["review_policy_hash", `sha-256:${"a".repeat(64)}`],
    ["taint_policy_hash", `sha-256:${"b".repeat(64)}`]
  ]) {
    const changedMandate = make("cairn.agent_mandate.v0.3", {
      ...mandate, scope_bindings: [{ ...mandate.scope_bindings[0], [field]: value }]
    });
    const changedGraph = preauthorizedResponseFor(changedMandate);
    assert.ok(validateActionGetResponse(changedGraph.request, changedGraph.response, confirmationContext)
      .includes(`action_get_mandate_scope_binding_mismatch:${field}`), field);
  }
  const retainedBusinessTupleCommitment = make("cairn.lineage_commitment.v0.1", {
    ...mismatchedMandateSellerGraph.response.lineage_commitment,
    canonical_business_tuple_hash: mandateGraph.response.lineage_commitment.canonical_business_tuple_hash
  });
  const retainedBusinessTupleBinding = make("cairn.execution_binding_set.v0.1", {
    ...mismatchedMandateSellerGraph.response.execution_binding_set,
    lineage_commitment_ref: refFor(retainedBusinessTupleCommitment),
    lineage_commitment_hash: retainedBusinessTupleCommitment.commitment_hash
  });
  assert.ok(mandateBusinessTupleHash(mismatchedMandateSeller.scope_bindings[0]) !==
    retainedBusinessTupleCommitment.canonical_business_tuple_hash);
  const mismatchedMandateSellerConfirmation = confirmationReceiptFixture(
    mismatchedMandateSeller, retainedBusinessTupleBinding, confirmationFixture
  );
  const mismatchedMandateSellerGate = make("cairn.gate_request.v0.2", {
    ...gateRequest, authority_basis_ref: refFor(mismatchedMandateSeller),
    confirmation_receipt_ref: refFor(mismatchedMandateSellerConfirmation),
    execution_binding_set_ref: refFor(retainedBusinessTupleBinding),
    execution_binding_set_hash: retainedBusinessTupleBinding.binding_set_hash,
    action_control_key: retainedBusinessTupleBinding.action_control_key
  });
  assert.ok(validateGateRequest(
    mismatchedMandateSellerGate, retainedBusinessTupleBinding, mismatchedMandateSeller,
    mismatchedMandateSellerConfirmation,
    { ...confirmationContext, lineageCommitment: retainedBusinessTupleCommitment }
  ).includes("gate_request_mandate_business_tuple_mismatch"));
  assert.ok(validateActionGetResponse(
    mandateGraph.request, { ...mandateGraph.response, authority_basis: null, confirmation_receipt: null },
    confirmationContext
  ).includes("action_get_authority_mismatch"));
  assert.ok(validateActionGetResponse(
    mandateGraph.request, { ...mandateGraph.response, authority_basis: null }, confirmationContext
  ).includes("action_get_authority_mismatch"));
  assert.ok(validateActionGetResponse(
    mandateGraph.request, { ...mandateGraph.response, confirmation_receipt: null }, confirmationContext
  ).includes("action_get_gate_pair_mismatch"));
  const authorizedMandateState = make("cairn.action_state_head.v0.1", {
    action_id: mandateGraph.response.action_record.action_id,
    action_ref: refFor(mandateGraph.response.action_record), sequence: 1,
    previous_state_hash: mandateGraph.response.current_action_state_head.state_hash,
    state: "authorized", authority_ref: refFor(mandate), lineage_activation_receipt_ref: null,
    reservation_refs: [], gate_result_ref: null, redemption_receipt_ref: null,
    outbox_state_head_ref: null, receiver_receipt_ref: null,
    prior_transition_receipt_ref: {
      ...distinctRefs(1, "authorized-mandate-transition")[0], schema: "cairn.action_receipt.v0.2"
    }
  });
  const authorizedMandateActivity = make("cairn.execution_activity_detail.v0.1", {
    ...mandateGraph.response.current_activity_detail,
    action_state_head_ref: refFor(authorizedMandateState),
    authority_basis_ref: refFor(mandate), current_receipt_refs: [authorizedMandateState.prior_transition_receipt_ref],
    state: authorizedMandateState.state
  });
  const authorizedMandateView = make("cairn.execution_action_view.v0.1", {
    ...mandateGraph.response.view, current_action_state_head_ref: refFor(authorizedMandateState),
    current_activity_detail_ref: refFor(authorizedMandateActivity)
  });
  assert.ok(validateActionGetResponse({ ref: refFor(authorizedMandateView) }, {
    ...mandateGraph.response, ref: refFor(authorizedMandateView), view: authorizedMandateView,
    current_action_state_head: authorizedMandateState, current_activity_detail: authorizedMandateActivity,
    confirmation_receipt: null
  }, confirmationContext).includes("action_get_gate_pair_mismatch"));
  const wrongProvisionalFence = make("cairn.lineage_state_head.v0.1", {
    ...mandateGraph.response.current_lineage_state_head,
    fencing_token: mandateGraph.response.lineage_commitment.expected_activation_fence + 1
  });
  const wrongProvisionalFenceActivity = make("cairn.execution_activity_detail.v0.1", {
    ...mandateGraph.response.current_activity_detail,
    lineage_state_head_ref: refFor(wrongProvisionalFence)
  });
  const wrongProvisionalFenceView = make("cairn.execution_action_view.v0.1", {
    ...mandateGraph.response.view, current_lineage_state_head_ref: refFor(wrongProvisionalFence),
    current_activity_detail_ref: refFor(wrongProvisionalFenceActivity)
  });
  assert.ok(validateActionGetResponse({ ref: refFor(wrongProvisionalFenceView) }, {
    ...mandateGraph.response, ref: refFor(wrongProvisionalFenceView), view: wrongProvisionalFenceView,
    current_lineage_state_head: wrongProvisionalFence,
    current_activity_detail: wrongProvisionalFenceActivity
  }, confirmationContext).includes("action_get_provisional_lineage_fence_mismatch"));
  const foreignIdState = make("cairn.action_state_head.v0.1", {
    ...afterAction, action_id: `sha-256:${"f".repeat(64)}`
  });
  const foreignIdActivity = make("cairn.execution_activity_detail.v0.1", {
    ...activityDetail, action_state_head_ref: refFor(foreignIdState)
  });
  const foreignIdView = make("cairn.execution_action_view.v0.1", {
    ...actionView, current_action_state_head_ref: refFor(foreignIdState),
    current_activity_detail_ref: refFor(foreignIdActivity)
  });
  assert.ok(validateActionGetResponse({ ref: refFor(foreignIdView) }, {
    ...actionResponse, ref: refFor(foreignIdView), view: foreignIdView,
    current_action_state_head: foreignIdState, current_activity_detail: foreignIdActivity
  }, context).includes("action_get_action_id_mismatch"));
  const unrelatedReceiptActivity = make("cairn.execution_activity_detail.v0.1", {
    ...activityDetail, current_receipt_refs: [distinctRefs(1, "unrelated-current-receipt")[0]]
  });
  const unrelatedReceiptView = make("cairn.execution_action_view.v0.1", {
    ...actionView, current_activity_detail_ref: refFor(unrelatedReceiptActivity)
  });
  assert.ok(validateActionGetResponse({ ref: refFor(unrelatedReceiptView) }, {
    ...actionResponse, ref: refFor(unrelatedReceiptView), view: unrelatedReceiptView,
    current_activity_detail: unrelatedReceiptActivity
  }, context).includes("action_get_activity_receipt_projection_mismatch"));
  const driftedIdentityLineage = make("cairn.lineage_state_head.v0.1", {
    ...activationBefore, principal_occurrence_id: `sha-256:${"f".repeat(64)}`
  });
  const driftedIdentityActivity = make("cairn.execution_activity_detail.v0.1", {
    ...activityDetail, lineage_state_head_ref: refFor(driftedIdentityLineage)
  });
  const driftedIdentityView = make("cairn.execution_action_view.v0.1", {
    ...actionView, current_lineage_state_head_ref: refFor(driftedIdentityLineage),
    current_activity_detail_ref: refFor(driftedIdentityActivity)
  });
  assert.ok(validateActionGetResponse({ ref: refFor(driftedIdentityView) }, {
    ...actionResponse, ref: refFor(driftedIdentityView), view: driftedIdentityView,
    current_lineage_state_head: driftedIdentityLineage, current_activity_detail: driftedIdentityActivity
  }, context).includes("action_get_lineage_identity_mismatch:principal_occurrence_id"));
  const crossWiredActionState = make("cairn.action_state_head.v0.1", {
    ...afterAction, action_ref: refFor(inventoryPreparedAction)
  });
  const crossWiredActionView = make("cairn.execution_action_view.v0.1", {
    ...actionView, current_action_state_head_ref: refFor(crossWiredActionState)
  });
  assert.ok(validateActionGetResponse({ ref: refFor(crossWiredActionView) }, {
    ...actionResponse, ref: refFor(crossWiredActionView), view: crossWiredActionView,
    action_record: inventoryPreparedAction, current_action_state_head: crossWiredActionState
  }, context)
    .includes("action_get_embedded_ref_mismatch"));
  assert.ok(validateActionGetResponse({ ref: distinctRefs(1, "alien-action-view")[0] }, actionResponse, context)
    .includes("action_get_embedded_ref_mismatch"));
  const alienActivityDetail = make("cairn.execution_activity_detail.v0.1", {
    ...activityDetail, action_ref: refFor(inventoryPreparedAction)
  });
  const alienActivityView = make("cairn.execution_action_view.v0.1", {
    ...actionView, current_activity_detail_ref: refFor(alienActivityDetail)
  });
  assert.ok(validateActionGetResponse({ ref: refFor(alienActivityView) }, {
    ...actionResponse, ref: refFor(alienActivityView), view: alienActivityView,
    current_activity_detail: alienActivityDetail
  }, context).includes("action_get_activity_chain_mismatch"));
  const alienLineage = make("cairn.lineage_state_head.v0.1", {
    ...activationBefore, commitment_ref: distinctRefs(1, "alien-action-view-commitment")[0]
  });
  const alienLineageActivity = make("cairn.execution_activity_detail.v0.1", {
    ...activityDetail, lineage_state_head_ref: refFor(alienLineage)
  });
  const alienLineageView = make("cairn.execution_action_view.v0.1", {
    ...actionView, current_lineage_state_head_ref: refFor(alienLineage),
    current_activity_detail_ref: refFor(alienLineageActivity)
  });
  assert.ok(validateActionGetResponse({ ref: refFor(alienLineageView) }, {
    ...actionResponse, ref: refFor(alienLineageView), view: alienLineageView,
    current_lineage_state_head: alienLineage, current_activity_detail: alienLineageActivity
  }, context).includes("action_get_lineage_action_mismatch"));
  const reservedActionState = make("cairn.action_state_head.v0.1", {
    action_id: preparedAction.action_id, action_ref: refFor(preparedAction), sequence: 2,
    previous_state_hash: afterAction.state_hash, state: "reserved", authority_ref: refFor(authorization),
    lineage_activation_receipt_ref: refFor(activationReceipt), reservation_refs: [refFor(activationReservation)],
    gate_result_ref: null, redemption_receipt_ref: null, outbox_state_head_ref: null, receiver_receipt_ref: null
  });
  const reservedActivity = make("cairn.execution_activity_detail.v0.1", {
    principal_id: preparedAction.principal_id, action_ref: refFor(preparedAction),
    action_state_head_ref: refFor(reservedActionState), binding_set_ref: preparedAction.execution_binding_set_ref,
    lineage_state_head_ref: refFor(activationAfter), authority_basis_ref: reservedActionState.authority_ref,
    current_receipt_refs: [
      reservedActionState.prior_transition_receipt_ref, reservedActionState.lineage_activation_receipt_ref,
      ...reservedActionState.reservation_refs
    ], state: reservedActionState.state
  });
  const reservedView = make("cairn.execution_action_view.v0.1", {
    action_record_ref: refFor(preparedAction), current_action_state_head_ref: refFor(reservedActionState),
    current_lineage_state_head_ref: refFor(activationAfter), current_activity_detail_ref: refFor(reservedActivity)
  });
  const reservedResponse = {
    ...actionResponse, ref: refFor(reservedView), view: reservedView,
    current_action_state_head: reservedActionState, current_lineage_state_head: activationAfter,
    current_activity_detail: reservedActivity,
    authority_reservations: [activationReservation]
  };
  assert.ok(validateActionGetResponse(
    { ref: refFor(reservedView) }, reservedResponse,
    signedActionGetContext(reservedResponse, {
      ...context,
      objectResolver: new Map([[refFor(activationBefore).object_hash, activationBefore]])
    })
  ).includes("phase1_authenticated_resolution_unsupported"));
  assert.ok(validateActionGetResponse(
    { ref: refFor(reservedView) }, reservedResponse,
    signedActionGetContext(reservedResponse, { ...context, objectResolver: new Map() })
  ).includes("action_get_current_lineage_state_invalid"));
  const splitActivationLineage = make("cairn.lineage_state_head.v0.1", {
    ...activationAfter, activation_receipt_ref: distinctRefs(1, "split-activation-receipt")[0]
  });
  const splitActivationActivity = make("cairn.execution_activity_detail.v0.1", {
    ...reservedActivity, lineage_state_head_ref: refFor(splitActivationLineage)
  });
  const splitActivationView = make("cairn.execution_action_view.v0.1", {
    ...reservedView, current_lineage_state_head_ref: refFor(splitActivationLineage),
    current_activity_detail_ref: refFor(splitActivationActivity)
  });
  assert.ok(validateActionGetResponse({ ref: refFor(splitActivationView) }, {
    ...reservedResponse, ref: refFor(splitActivationView), view: splitActivationView,
    current_lineage_state_head: splitActivationLineage,
    current_activity_detail: splitActivationActivity
  }, context).includes("action_get_lineage_activation_receipt_mismatch"));
  const terminalReservedLineage = make("cairn.lineage_state_head.v0.1", {
    ...activationAfter, state: "fenced_non_submission"
  });
  const terminalReservedActivity = make("cairn.execution_activity_detail.v0.1", {
    ...reservedActivity, lineage_state_head_ref: refFor(terminalReservedLineage)
  });
  const terminalReservedView = make("cairn.execution_action_view.v0.1", {
    ...reservedView, current_lineage_state_head_ref: refFor(terminalReservedLineage),
    current_activity_detail_ref: refFor(terminalReservedActivity)
  });
  assert.ok(validateActionGetResponse({ ref: refFor(terminalReservedView) }, {
    ...reservedResponse, ref: refFor(terminalReservedView), view: terminalReservedView,
    current_lineage_state_head: terminalReservedLineage,
    current_activity_detail: terminalReservedActivity
  }, context).includes("action_get_action_lineage_state_mismatch"));
  const invalidFenceReservation = make("cairn.authority_reservation.v0.2", {
    ...activationReservation, expected_lineage_fence: activationReservation.next_lineage_fence
  });
  const invalidFenceState = make("cairn.action_state_head.v0.1", {
    ...reservedActionState, reservation_refs: [refFor(invalidFenceReservation)]
  });
  const invalidFenceActivity = make("cairn.execution_activity_detail.v0.1", {
    ...reservedActivity, action_state_head_ref: refFor(invalidFenceState),
    current_receipt_refs: [
      invalidFenceState.prior_transition_receipt_ref, invalidFenceState.lineage_activation_receipt_ref,
      ...invalidFenceState.reservation_refs
    ]
  });
  const invalidFenceView = make("cairn.execution_action_view.v0.1", {
    ...reservedView, current_action_state_head_ref: refFor(invalidFenceState),
    current_activity_detail_ref: refFor(invalidFenceActivity)
  });
  assert.ok(validateActionGetResponse({ ref: refFor(invalidFenceView) }, {
    ...reservedResponse, ref: refFor(invalidFenceView), view: invalidFenceView,
    current_action_state_head: invalidFenceState, current_activity_detail: invalidFenceActivity,
    authority_reservations: [invalidFenceReservation]
  }, context).includes("action_get_reservation_reservation_lineage_fence_invalid"));
  const provisionalReservedActivity = make("cairn.execution_activity_detail.v0.1", {
    ...reservedActivity, lineage_state_head_ref: refFor(activationBefore)
  });
  const provisionalReservedView = make("cairn.execution_action_view.v0.1", {
    ...reservedView, current_lineage_state_head_ref: refFor(activationBefore),
    current_activity_detail_ref: refFor(provisionalReservedActivity)
  });
  assert.ok(validateActionGetResponse({ ref: refFor(provisionalReservedView) }, {
    ...reservedResponse, ref: refFor(provisionalReservedView), view: provisionalReservedView,
    current_lineage_state_head: activationBefore, current_activity_detail: provisionalReservedActivity
  }, context).includes("action_get_lineage_stage_mismatch"));
  const compositeGateRequestSeed = make("cairn.gate_request.v0.2", {
    ...gateRequest,
    principal_id: binding.principal_id, execution_binding_set_ref: refFor(binding),
    execution_binding_set_hash: binding.binding_set_hash, authority_basis_ref: refFor(authorization),
    confirmation_receipt_ref: refFor(confirmation), action_control_key: binding.action_control_key,
    reservation_receipt_refs: [refFor(activationReservation)], checkout_readiness_receipt_ref: null,
    checkout_group_state_head_ref: null, checkout_terms_receipt_ref: null
  });
  const compositeDependencyManifest = gateDependencyManifestFor(
    compositeGateRequestSeed, binding, authorization, confirmation
  );
  const compositeGateRequest = make("cairn.gate_request.v0.2", {
    ...compositeGateRequestSeed, dependency_manifest_ref: refFor(compositeDependencyManifest),
    dependency_manifest_hash: compositeDependencyManifest.manifest_hash
  });
  const compositeGateHeadRefs = gateRequiredHeadRefs(compositeGateRequest, binding);
  const compositeGateContext = signedReadContext([
    compositeDependencyManifest, compositeGateRequest, activationReservation,
    preparedAction, reservationCommitment
  ], {
    ...gateRequestContext,
    lineageCommitment: reservationCommitment, authority: authorization,
    objectResolver: new Map([
      ...gateRequestContext.objectResolver,
      [refFor(activationReservation).object_hash, activationReservation],
      [refFor(activationBefore).object_hash, activationBefore],
      [refFor(preparedAction).object_hash, preparedAction],
      [refFor(reservationCommitment).object_hash, reservationCommitment],
      [refFor(compositeDependencyManifest).object_hash, compositeDependencyManifest]
    ]),
    currentHeadResolver: currentHeadResolverFor(compositeGateHeadRefs)
  }, binding.principal_id);
  const executorPolicySource = gateDependencySources.find((source) =>
    source.dependency_role === "executor_policy" && source.state === "active");
  const deniedExecutorPolicySource = make("cairn.gate_dependency_attestation.v0.1", {
    ...executorPolicySource, state: "revoked", issued_at: "2026-07-22T10:01:30Z"
  });
  const deniedExecutorPolicyDependency = make("cairn.gate_dependency_state_head.v0.1", {
    ...executorPolicyDependency, source_ref: refFor(deniedExecutorPolicySource),
    source_hash: deniedExecutorPolicySource.attestation_hash, sequence: 1,
    previous_head_hash: executorPolicyDependency.head_hash, state: "revoked",
    updated_at: "2026-07-22T10:01:30Z"
  });
  const revokedGenesis = make("cairn.gate_dependency_state_head.v0.1", {
    ...deniedExecutorPolicyDependency, sequence: 0, previous_head_hash: null
  });
  const gateDependencyTransitionContext = signedReadContext([
    executorPolicySource, executorPolicyDependency, deniedExecutorPolicySource,
    deniedExecutorPolicyDependency, revokedGenesis
  ], {
    ...gateRequestContext,
    objectResolver: new Map([
      ...gateRequestContext.objectResolver,
      [refFor(executorPolicySource).object_hash, executorPolicySource],
      [refFor(executorPolicyDependency).object_hash, executorPolicyDependency],
      [refFor(deniedExecutorPolicySource).object_hash, deniedExecutorPolicySource],
      [refFor(deniedExecutorPolicyDependency).object_hash, deniedExecutorPolicyDependency],
      [refFor(revokedGenesis).object_hash, revokedGenesis]
    ])
  }, binding.principal_id);
  assert.deepEqual(validateGateDependencyStateHead(
    deniedExecutorPolicyDependency, gateDependencyTransitionContext
  ), []);
  assert.ok(validateGateDependencyStateHead(
    revokedGenesis, gateDependencyTransitionContext
  ).includes("gate_dependency_state_semantics_invalid"));
  const foreignTransitionSource = make("cairn.gate_dependency_attestation.v0.1", {
    ...deniedExecutorPolicySource, subject_ref: distinctRefs(1, "foreign-executor-policy-subject")[0]
  });
  const foreignTransition = make("cairn.gate_dependency_state_head.v0.1", {
    ...deniedExecutorPolicyDependency, source_ref: refFor(foreignTransitionSource),
    source_hash: foreignTransitionSource.attestation_hash
  });
  const foreignTransitionContext = signedReadContext([
    foreignTransitionSource, foreignTransition
  ], {
    ...gateDependencyTransitionContext,
    objectResolver: new Map(gateDependencyTransitionContext.objectResolver)
      .set(refFor(foreignTransitionSource).object_hash, foreignTransitionSource)
      .set(refFor(foreignTransition).object_hash, foreignTransition)
  }, binding.principal_id);
  assert.ok(validateGateDependencyStateHead(
    foreignTransition, foreignTransitionContext
  ).includes("gate_dependency_state_predecessor_mismatch"));
  const deniedCompositeGateRequestSeed = make("cairn.gate_request.v0.2", {
    ...compositeGateRequest, executor_policy_ref: refFor(deniedExecutorPolicyDependency)
  });
  const deniedCompositeDependencyManifest = gateDependencyManifestFor(
    deniedCompositeGateRequestSeed, binding, authorization, confirmation
  );
  const deniedCompositeGateRequest = make("cairn.gate_request.v0.2", {
    ...deniedCompositeGateRequestSeed,
    dependency_manifest_ref: refFor(deniedCompositeDependencyManifest),
    dependency_manifest_hash: deniedCompositeDependencyManifest.manifest_hash
  });
  const deniedCompositeGateHeadRefs = gateRequiredHeadRefs(deniedCompositeGateRequest, binding);
  const deniedCompositeGateContext = signedReadContext([
    deniedExecutorPolicySource, deniedExecutorPolicyDependency,
    deniedCompositeDependencyManifest, deniedCompositeGateRequest
  ], {
    ...compositeGateContext,
    objectResolver: new Map(compositeGateContext.objectResolver)
      .set(refFor(deniedExecutorPolicyDependency).object_hash, deniedExecutorPolicyDependency)
      .set(refFor(deniedExecutorPolicySource).object_hash, deniedExecutorPolicySource)
      .set(refFor(deniedCompositeDependencyManifest).object_hash, deniedCompositeDependencyManifest),
    currentHeadResolver: currentHeadResolverFor(deniedCompositeGateHeadRefs)
  }, binding.principal_id);
  const deniedCompositeGate = make("cairn.gate_result.v0.2", {
    gate_request_ref: refFor(deniedCompositeGateRequest), gate_request_hash: deniedCompositeGateRequest.request_hash,
    execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    decision: "deny",
    evaluated_head_refs: deniedCompositeGateHeadRefs,
    evaluated_nonce_and_fence_root: gateEvaluatedHeadRoot(deniedCompositeGateHeadRefs),
    business_state_root: gateBusinessStateRoot(deniedCompositeGateRequest.current_business_state_head_refs),
    checkout_dependency_root: gateCheckoutDependencyRoot(deniedCompositeGateRequest),
    check_results: evaluateGateChecks(
      deniedCompositeGateRequest, binding, authorization, confirmation, {
        ...deniedCompositeGateContext,
        now: "2026-07-22T10:02:00Z",
        gateEvaluationTime: "2026-07-22T10:02:00Z",
        requireDependencySignatures: true,
        requireCurrentKeyEligibility: true
      }
    )
  });
  const forgedPassChecks = deniedCompositeGate.check_results.map((check) => ({
    ...check, decision: "pass"
  }));
  const forgedAllowedCompositeGate = make("cairn.gate_result.v0.2", {
    ...deniedCompositeGate, decision: "allow", check_results: forgedPassChecks
  });
  const forgedAllowedContext = signedReadContext(forgedAllowedCompositeGate, {
    ...deniedCompositeGateContext, gateRequest: deniedCompositeGateRequest,
    binding, authority: authorization, confirmation
  }, binding.principal_id);
  assert.ok(validateGateResult(forgedAllowedCompositeGate, forgedAllowedContext)
    .includes("phase1_object_schema_invalid"));
  const deniedCompositeResponse = {
    ...reservedResponse, confirmation_receipt: confirmation,
    gate_request: deniedCompositeGateRequest, gate_result: deniedCompositeGate
  };
  assert.ok(validateActionGetResponse(
    { ref: refFor(reservedView) }, deniedCompositeResponse,
    signedActionGetContext(deniedCompositeResponse, deniedCompositeGateContext)
  ).includes("phase1_authenticated_resolution_unsupported"));
  const alienGraphReservation = make("cairn.authority_reservation.v0.2", {
    ...activationReservation, prepared_action_ref: refFor(inventoryPreparedAction)
  });
  const alienReservationState = make("cairn.action_state_head.v0.1", {
    ...reservedActionState, reservation_refs: [refFor(alienGraphReservation)]
  });
  const alienReservationActivity = make("cairn.execution_activity_detail.v0.1", {
    ...reservedActivity, action_state_head_ref: refFor(alienReservationState),
    current_receipt_refs: [
      alienReservationState.prior_transition_receipt_ref, alienReservationState.lineage_activation_receipt_ref,
      ...alienReservationState.reservation_refs
    ]
  });
  const alienReservationView = make("cairn.execution_action_view.v0.1", {
    ...reservedView, current_action_state_head_ref: refFor(alienReservationState),
    current_activity_detail_ref: refFor(alienReservationActivity)
  });
  assert.ok(validateActionGetResponse({ ref: refFor(alienReservationView) }, {
    ...reservedResponse, ref: refFor(alienReservationView), view: alienReservationView,
    current_action_state_head: alienReservationState, current_activity_detail: alienReservationActivity,
    authority_reservations: [alienGraphReservation]
  }, context).includes("action_get_reservation_chain_mismatch"));

  assert.ok(validateActionReceipt(actionReceipt, beforeAction, afterAction, financialBinding, actionReceiptContext)
    .includes("action_receipt_action_binding_mismatch"));

  const illegalReceipt = make("cairn.action_receipt.v0.2", { state_before: "finalized", state_after: "prepared" });
  assert.ok(validateActionReceipt(illegalReceipt, { state: "finalized" }, { state: "prepared" }, binding, context).includes("phase1_object_schema_invalid"));
});

test("cancellation authority is an exact projection of one binding and one gate chain", () => {
  const continuityRef = distinctRefs(1, "credential-continuity-receipt")[0];
  const cancellationPrincipal = "did:example:cancellation-principal";
  const originalAction = make("cairn.action_record.v0.2", { principal_id: cancellationPrincipal });
  const originalState = make("cairn.action_state_head.v0.1", {
    action_id: originalAction.action_id, action_ref: refFor(originalAction), state: "submitted",
    reservation_refs: [originalAction.action_proposal_ref]
  });
  const seed = make("cairn.cancellation_authorization.v0.1", {
    principal_id: cancellationPrincipal,
    original_action_ref: refFor(originalAction), original_action_hash: originalAction.action_hash,
    original_action_state_head_ref: refFor(originalState), original_action_state_head_hash: originalState.state_hash,
    original_effect_id: originalAction.effect_id, expected_original_state: originalState.state,
    cancellation_credential_instance_key: `sha-256:${"7".repeat(64)}`,
    cancellation_credential_continuity_receipt_ref: continuityRef,
    cancellation_credential_continuity_receipt_hash: continuityRef.object_hash,
    expires_at: "2026-07-22T10:04:00Z"
  });
  const common = schemasById.get("https://cairn.cards/protocol/execution/schemas/v0.1/common.schema.json");
  const cancellationContext = sampleFor(common.$defs.cancellationContext, common);
  for (const field of Object.keys(cancellationContext)) {
    if (Object.hasOwn(seed, field)) cancellationContext[field] = structuredClone(seed[field]);
  }
  const cancellationGateSources = [];
  const cancellationGateDependency = (dependencyRole, discriminator = dependencyRole) => {
    const subjectRef = distinctRefs(1, `cancellation-gate-subject-${discriminator}`)[0];
    const source = make("cairn.gate_dependency_attestation.v0.1", {
      principal_id: cancellationPrincipal, dependency_role: dependencyRole,
      subject_ref: subjectRef, subject_hash: subjectRef.object_hash, state: "active",
      valid_from: "2026-07-22T09:00:00Z", valid_until: "2026-07-22T11:00:00Z",
      issued_at: "2026-07-22T09:00:00Z", issuing_authority_id: cancellationPrincipal
    });
    cancellationGateSources.push(source);
    return make("cairn.gate_dependency_state_head.v0.1", {
      dependency_key: gateDependencyKey(cancellationPrincipal, dependencyRole, subjectRef),
      principal_id: cancellationPrincipal, dependency_role: dependencyRole,
      source_ref: refFor(source), source_hash: source.attestation_hash,
      sequence: 0, previous_head_hash: null, state: "active",
      valid_from: "2026-07-22T09:00:00Z", valid_until: "2026-07-22T11:00:00Z",
      updated_at: "2026-07-22T09:00:00Z"
    });
  };
  const cancellationReleaseDependency = cancellationGateDependency("execution_release");
  const cancellationIntegrityDependency = cancellationGateDependency("execution_integrity");
  const cancellationAssuranceLifecycle = cancellationGateDependency("policy_lifecycle", "assurance_lifecycle");
  const cancellationVerifierLifecycle = cancellationGateDependency("policy_lifecycle", "verifier_lifecycle");
  const cancellationControlDependency = cancellationGateDependency("execution_control");
  const cancellationExecutorPolicy = cancellationGateDependency("executor_policy");
  const cancellationFinalityDependency = cancellationGateDependency("receiver_finality");
  const cancellationSelectorDependency = cancellationGateDependency("receiver_sequence_selector");
  const finalityRef = refFor(cancellationFinalityDependency);
  cancellationContext.cancellation_finality_profile_ref = finalityRef;
  const cancellationValidationContext = {
    ...context, originalAction, originalActionStateHead: originalState,
    currentHeadResolver: currentHeadResolverFor([refFor(originalState)])
  };
  const signedOriginalContext = signedReadContext(
    [originalAction, originalState], {
      ...cancellationValidationContext, requireDependencySignatures: true
    }, cancellationPrincipal
  );
  const cancellationConfirmationFixture = confirmationPolicyFixture(
    "cancel_receiver_action", refFor(cancellationAssuranceLifecycle)
  );
  cancellationConfirmationFixture.verifierLifecycleRef = refFor(cancellationVerifierLifecycle);
  const cancellationVerifierLifecycleKey =
    `confirmation_verifier:${canonicalText(refFor(cancellationConfirmationFixture.verifierProfile))}`;
  cancellationConfirmationFixture.currentPolicyLifecycleResolver.set(cancellationVerifierLifecycleKey, {
    ...cancellationConfirmationFixture.currentPolicyLifecycleResolver.get(cancellationVerifierLifecycleKey),
    current_head_ref: cancellationConfirmationFixture.verifierLifecycleRef
  });
  const binding = make("cairn.execution_binding_set.v0.1", {
    actor_branch: "principal_direct", agent_runtime_binding_ref: null, connection_authorization_ref: null,
    connection_state_head_ref: null, execution_bundle_hash: built.bundle.bundle_hash,
    operation_registry_hash: audit.operationRegistryHash, principal_id: seed.principal_id,
    execution_release_state_head_ref: refFor(cancellationReleaseDependency),
    execution_integrity_state_head_ref: refFor(cancellationIntegrityDependency),
    execution_integrity_state_head_hash: cancellationIntegrityDependency.head_hash,
    execution_control_state_head_ref: refFor(cancellationControlDependency),
    capability: "cancel_receiver_action", cancellation_context: cancellationContext,
    effect_id: seed.cancellation_effect_id, lineage_commitment_ref: seed.lineage_commitment_ref,
    ultimate_receiver: seed.receiver_id,
    receiver_account_or_contract_scope: cancellationContext.receiver_account_or_contract_scope,
    receiver_operation_namespace: cancellationContext.cancellation_operation_namespace,
    receiver_finality_profile_ref: finalityRef,
    receiver_sequence_epoch_selector_state_head_ref: refFor(cancellationSelectorDependency),
    receiver_sequence_epoch_selector_state_head_hash: cancellationSelectorDependency.head_hash,
    receiver_channel_policy_ref: null, receiver_channel_policy_hash: null,
    receiver_channel_policy_lifecycle_head_ref: null,
    receiver_channel_policy_lifecycle_head_hash: null,
    executor_credential_binding_head_ref: cancellationContext.cancellation_executor_credential_binding_head_ref,
    confirmation_assurance_policy_ref: refFor(cancellationConfirmationFixture.policy),
    confirmation_assurance_policy_hash: cancellationConfirmationFixture.policy.policy_hash,
    confirmation_assurance_policy_lifecycle_head_ref: cancellationConfirmationFixture.policyLifecycleRef,
    confirmation_assurance_policy_lifecycle_head_hash: cancellationConfirmationFixture.policyLifecycleRef.object_hash,
    allowed_confirmation_verifier_profile_refs_root:
      canonicalHash(cancellationConfirmationFixture.policy.allowed_verifier_profile_refs),
    warning_codes: seed.acknowledged_warning_codes,
    created_at: "2026-07-22T10:00:00Z", expires_at: "2026-07-22T10:05:00Z"
  });
  assert.ok(validateBindingSet(binding, cancellationValidationContext)
    .includes("binding_cancellation_original_action_signature_invalid"));
  assert.ok(validateBindingSet(binding, signedOriginalContext)
    .includes("binding_original_action_state_phase1_object_schema_invalid"));
  const unsignedOriginalAction = structuredClone(originalAction);
  unsignedOriginalAction.action_service_signature.value = "A".repeat(86);
  assert.ok(validateBindingSet(binding, {
    ...signedOriginalContext, originalAction: unsignedOriginalAction
  }).includes("binding_cancellation_original_action_signature_invalid"));
  const unsignedOriginalState = structuredClone(originalState);
  unsignedOriginalState.action_service_signature.value = "A".repeat(86);
  assert.ok(validateBindingSet(binding, {
    ...signedOriginalContext, originalActionStateHead: unsignedOriginalState
  }).includes("binding_cancellation_original_action_state_signature_invalid"));
  const staleOriginalStateRef = {
    ...refFor(originalState), object_hash: `sha-256:${"9".repeat(64)}`
  };
  assert.ok(validateBindingSet(binding, {
    ...signedOriginalContext,
    currentHeadResolver: currentHeadResolverFor([staleOriginalStateRef])
  }).includes("binding_cancellation_original_action_state_not_current"));
  const proxyCancellationBindingContext = new Proxy({
    ...signedOriginalContext,
    currentHeadResolver: currentHeadResolverFor([staleOriginalStateRef])
  }, {
    get(target, property, receiver) {
      return typeof property === "symbol" ? true : Reflect.get(target, property, receiver);
    }
  });
  assert.ok(validateBindingSet(binding, proxyCancellationBindingContext)
    .includes("binding_cancellation_original_action_state_not_current"));
  const authorization = make("cairn.cancellation_authorization.v0.1", {
    ...seed, execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    required_confirmation_assurance_policy_ref: binding.confirmation_assurance_policy_ref,
    expires_at: "2026-07-22T10:05:00Z"
  });
  assert.ok(validateCancellationAuthorization(authorization, binding, signedOriginalContext)
    .includes("phase1_authenticated_resolution_unsupported"));
  assert.ok(validateCancellationAuthorization(authorization, binding, {
    ...signedOriginalContext,
    cancellationReservedJudgmentsResolver: (_principalId, resolvedBinding) => ({
      binding_ref: refFor(resolvedBinding),
      review_ref: resolvedBinding.execution_review_receipt_ref,
      review_hash: resolvedBinding.review_hash,
      current_policy_hash: resolvedBinding.review_policy_hash,
      decisions: ["evidence_review"]
    })
  }).includes("cancellation_reserved_judgments_mismatch"));
  assert.ok(validateCancellationAuthorization(authorization, binding, {
    ...signedOriginalContext, cancellationReservedJudgmentsResolver: null
  }).includes("cancellation_reserved_judgment_graph_unresolved"));
  assert.ok(validateCancellationAuthorization(authorization, binding, {
    ...signedOriginalContext,
    cancellationReservedJudgmentsResolver: (_principalId, resolvedBinding) => ({
      binding_ref: distinctRefs(1, "foreign-cancellation-binding")[0],
      review_ref: resolvedBinding.execution_review_receipt_ref,
      review_hash: resolvedBinding.review_hash,
      current_policy_hash: resolvedBinding.review_policy_hash,
      decisions: []
    })
  }).includes("cancellation_reserved_judgment_graph_unresolved"));
  assert.ok(validateCancellationAuthorization(authorization, binding, {
    ...signedOriginalContext,
    cancellationReservedJudgmentsResolver: (_principalId, resolvedBinding) => ({
      binding_ref: refFor(resolvedBinding), review_ref: resolvedBinding.execution_review_receipt_ref,
      review_hash: resolvedBinding.review_hash,
      current_policy_hash: `sha-256:${"9".repeat(64)}`, decisions: []
    })
  }).includes("cancellation_reserved_judgment_graph_unresolved"));
  assert.ok(validateCancellationAuthorization(authorization, binding, {
    ...signedOriginalContext, principalRevocationNonce: authorization.principal_revocation_nonce + 1
  }).includes("cancellation_principal_revocation_nonce_mismatch"));
  const proxyCancellationContext = new Proxy({
    ...signedOriginalContext,
    principalRevocationNonce: authorization.principal_revocation_nonce + 1,
    currentHeadResolver: currentHeadResolverFor([staleOriginalStateRef]),
    cancellationReservedJudgmentsResolver: (_principalId, resolvedBinding) => ({
      binding_ref: refFor(resolvedBinding),
      review_ref: resolvedBinding.execution_review_receipt_ref,
      review_hash: resolvedBinding.review_hash,
      current_policy_hash: resolvedBinding.review_policy_hash,
      decisions: ["evidence_review"]
    })
  }, {
    get(target, property, receiver) {
      return typeof property === "symbol" ? true : Reflect.get(target, property, receiver);
    }
  });
  const proxyCancellationFailures = validateCancellationAuthorization(
    authorization, binding, proxyCancellationContext
  );
  for (const code of [
    "phase1_authenticated_resolution_unsupported",
    "cancellation_principal_revocation_nonce_mismatch",
    "cancellation_reserved_judgments_mismatch",
    "cancellation_original_action_state_not_current"
  ]) assert.ok(proxyCancellationFailures.includes(code), proxyCancellationFailures.join(","));
  const proxyUnresolvedJudgmentsContext = new Proxy({
    ...signedOriginalContext,
    principalRevocationNonce: authorization.principal_revocation_nonce + 1,
    currentHeadResolver: currentHeadResolverFor([staleOriginalStateRef]),
    cancellationReservedJudgmentsResolver: null
  }, {
    get(target, property, receiver) {
      return typeof property === "symbol" ? true : Reflect.get(target, property, receiver);
    }
  });
  const proxyUnresolvedJudgmentFailures = validateCancellationAuthorization(
    authorization, binding, proxyUnresolvedJudgmentsContext
  );
  assert.ok(proxyUnresolvedJudgmentFailures.includes(
    "cancellation_reserved_judgment_graph_unresolved"
  ));
  assert.ok(validateCancellationAuthorization(authorization, binding, {
    ...signedOriginalContext, principalRevocationNonce: undefined
  }).includes("cancellation_principal_revocation_nonce_mismatch"));
  const alienOccurrence = make("cairn.cancellation_authorization.v0.1", {
    ...authorization, principal_occurrence_id: `sha-256:${"8".repeat(64)}`
  });
  assert.ok(validateCancellationAuthorization(alienOccurrence, binding, signedOriginalContext)
    .includes("cancellation_binding_semantics_mismatch"));
  const alienReceiver = make("cairn.cancellation_authorization.v0.1", {
    ...authorization, receiver_id: "did:example:alien-receiver"
  });
  assert.ok(validateCancellationAuthorization(alienReceiver, binding, signedOriginalContext)
    .includes("cancellation_binding_semantics_mismatch"));
  const driftedOriginalEffectContext = { ...cancellationContext, original_effect_id: `sha-256:${"9".repeat(64)}` };
  const driftedOriginalEffectBinding = make("cairn.execution_binding_set.v0.1", {
    ...binding, cancellation_context: driftedOriginalEffectContext
  });
  assert.ok(validateBindingSet(driftedOriginalEffectBinding, signedOriginalContext)
    .includes("binding_cancellation_original_action_mismatch"));
  const driftedOriginalEffectAuthorization = make("cairn.cancellation_authorization.v0.1", {
    ...authorization, execution_binding_set_ref: refFor(driftedOriginalEffectBinding),
    execution_binding_set_hash: driftedOriginalEffectBinding.binding_set_hash,
    original_effect_id: driftedOriginalEffectContext.original_effect_id
  });
  assert.ok(validateCancellationAuthorization(
    driftedOriginalEffectAuthorization, driftedOriginalEffectBinding, signedOriginalContext
  ).includes("cancellation_original_action_mismatch"));

  const confirmation = confirmationReceiptFixture(
    authorization, binding, cancellationConfirmationFixture
  );
  const cancellationGateContext = {
    ...signedOriginalContext,
    gateDependencyAuthorityResolver: () => cancellationPrincipal,
    confirmationPolicy: cancellationConfirmationFixture.policy,
    confirmationVerifierProfile: cancellationConfirmationFixture.verifierProfile,
    currentPolicyLifecycleResolver: cancellationConfirmationFixture.currentPolicyLifecycleResolver
  };
  const requestSeed = make("cairn.gate_request.v0.2", {
    principal_id: binding.principal_id, execution_binding_set_ref: refFor(binding),
    execution_binding_set_hash: binding.binding_set_hash, authority_basis_ref: refFor(authorization),
    execution_integrity_state_head_ref: binding.execution_integrity_state_head_ref,
    confirmation_receipt_ref: refFor(confirmation), action_control_key: binding.action_control_key,
    confirmation_assurance_policy_lifecycle_head_ref: cancellationConfirmationFixture.policyLifecycleRef,
    confirmation_assurance_policy_lifecycle_head_hash: cancellationConfirmationFixture.policyLifecycleRef.object_hash,
    confirmation_verifier_profile_lifecycle_head_ref: cancellationConfirmationFixture.verifierLifecycleRef,
    confirmation_verifier_profile_lifecycle_head_hash: cancellationConfirmationFixture.verifierLifecycleRef.object_hash,
    policy_refs: [
      refFor(cancellationConfirmationFixture.policy), cancellationConfirmationFixture.policyLifecycleRef,
      refFor(cancellationConfirmationFixture.verifierProfile), cancellationConfirmationFixture.verifierLifecycleRef
    ],
    current_control_head_refs: [binding.execution_control_state_head_ref],
    current_connection_head_ref: null, current_compartment_head_ref: null,
    current_economic_resource_head_ref: null,
    current_data_grant_head_refs: binding.data_grant_state_heads.map(({ current_state_head_ref }) => current_state_head_ref),
    current_business_state_head_refs: [], current_provider_identity_head_refs: [],
    current_provider_identity_trust_overlay_head_refs: [], current_seller_copy_lease_heads_root: null,
    receiver_finality_profile_ref: finalityRef,
    accounting_policy_ref: binding.accounting_policy_ref,
    receiver_channel_policy_ref: binding.receiver_channel_policy_ref,
    receiver_sequence_epoch_selector_ref: binding.receiver_sequence_epoch_selector_state_head_ref,
    executor_policy_ref: refFor(cancellationExecutorPolicy),
    checkout_dependency_refs: [],
    checkout_readiness_receipt_ref: null, checkout_group_state_head_ref: null, checkout_terms_receipt_ref: null,
    requested_at: "2026-07-22T10:01:00Z"
  });
  const cancellationDependencyManifest = gateDependencyManifestFor(
    requestSeed, binding, authorization, confirmation
  );
  const request = make("cairn.gate_request.v0.2", {
    ...requestSeed, dependency_manifest_ref: refFor(cancellationDependencyManifest),
    dependency_manifest_hash: cancellationDependencyManifest.manifest_hash,
    gate_service_signature: {
      ...requestSeed.gate_service_signature, signed_at: "2026-07-22T10:01:00Z"
    }
  });
  const cancellationGateDependencies = [
    ...cancellationGateSources,
    cancellationReleaseDependency, cancellationIntegrityDependency,
    cancellationAssuranceLifecycle, cancellationVerifierLifecycle,
    cancellationControlDependency, cancellationExecutorPolicy,
    cancellationFinalityDependency, cancellationSelectorDependency,
    cancellationConfirmationFixture.policy, cancellationConfirmationFixture.verifierProfile
  ];
  const cancellationRequestContext = signedReadContext([
    ...cancellationGateDependencies, originalAction, originalState,
    cancellationDependencyManifest, request, binding, authorization, confirmation
  ], {
    ...cancellationGateContext,
    objectResolver: new Map([...cancellationGateDependencies, cancellationDependencyManifest]
      .map((object) => [refFor(object).object_hash, object])),
    currentHeadResolver: currentHeadResolverFor(gateRequiredHeadRefs(request, binding))
  }, binding.principal_id);
  const cancellationGateRequestFailures = validateGateRequest(
    request, binding, authorization, confirmation, cancellationRequestContext
  );
  assert.ok(cancellationGateRequestFailures.includes("phase1_authenticated_resolution_unsupported"));
  assert.ok(cancellationGateRequestFailures.includes("gate_request_cancellation_authority_mismatch"));
  const alienGate = make("cairn.gate_request.v0.2", {
    ...request, receiver_finality_profile_ref: distinctRefs(1, "alien-finality-profile")[0]
  });
  assert.ok(validateGateRequest(alienGate, binding, authorization, confirmation, cancellationRequestContext)
    .includes("gate_request_cancellation_authority_mismatch"));
});

test("transition manifests remain intrinsically typed while their direct getter is absent", () => {
  const entryHash = `sha-256:${"3".repeat(64)}`;
  const entryBase = {
    entry_kind: "economic_atom_delta",
    entry_object_ref: { schema: "cairn.economic_atom_delta_entry.v0.1", object_id: "delta-1", object_hash: entryHash },
    entry_object_hash: entryHash
  };
  const entry = { ...entryBase, entry_key: transitionManifestEntryKey(entryBase) };
  const causeRef = {
    schema: "cairn.economic_mutation_cause_core.v0.1", object_id: "cause-1", object_hash: `sha-256:${"4".repeat(64)}`
  };
  const manifest = make("cairn.enumerable_transition_manifest.v0.1", {
    manifest_kind: "compartment_economic_atom_deltas", entry_count: 1, sorted_entries: [entry],
    entries_root: canonicalHash([entry]), subject_ref: causeRef, subject_hash: causeRef.object_hash,
    issuing_authority_id: "did:example:cairn-authority"
  });
  const manifestSchema = schemasByObjectId.get(manifest.schema);
  const validateManifestSchema = audit.ajv.getSchema(manifestSchema.$id);
  assert.equal(validateManifestSchema(manifest), true, JSON.stringify(validateManifestSchema.errors));
  assert.deepEqual(validateTransitionManifest(manifest, context), []);
  const mismatchedSubject = make("cairn.enumerable_transition_manifest.v0.1", {
    ...manifest, subject_hash: `sha-256:${"9".repeat(64)}`
  });
  assert.ok(validateTransitionManifest(mismatchedSubject, context).includes("phase1_ref_hash_mismatch"));
  const wrongKind = make("cairn.enumerable_transition_manifest.v0.1", { ...manifest, manifest_kind: "receiver_trust_slot_assignments" });
  assert.ok(validateTransitionManifest(wrongKind, context).includes("transition_manifest_kind_matrix_invalid"));
  const inventedLifecycleEntryBase = {
    entry_kind: "lifecycle_transition_receipt",
    entry_object_ref: {
      schema: "cairn.invented_transition_receipt.v0.1", object_id: "invented-1", object_hash: `sha-256:${"6".repeat(64)}`
    },
    entry_object_hash: `sha-256:${"6".repeat(64)}`
  };
  const inventedLifecycleEntry = { ...inventedLifecycleEntryBase, entry_key: transitionManifestEntryKey(inventedLifecycleEntryBase) };
  const inventedLifecycleManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    manifest_kind: "lifecycle_transition_chain", entry_count: 1, sorted_entries: [inventedLifecycleEntry],
    entries_root: canonicalHash([inventedLifecycleEntry])
  });
  assert.ok(validateTransitionManifest(inventedLifecycleManifest, context).includes("transition_manifest_entry_schema_mismatch"));
  const inventedKeyEntry = { ...entry, entry_key: `sha-256:${"5".repeat(64)}` };
  const inventedKeyManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    ...manifest, sorted_entries: [inventedKeyEntry], entries_root: canonicalHash([inventedKeyEntry])
  });
  assert.ok(validateTransitionManifest(inventedKeyManifest, context).includes("transition_manifest_entry_key_mismatch"));
  assert.equal(sources.registry.operations.find(
    ({ name }) => name === "execution.transition_manifest.get"
  ), undefined);
  assert.deepEqual(validateExactObjectRead(
    "execution.transition_manifest.get", { ref: refFor(manifest) }, manifest, context
  ), ["object_read_operation_invalid"]);
});

test("activity surfaces are privacy-minimized projections of exact action state", () => {
  const activityListValidate = context.ajv.getSchema(
    "https://cairn.cards/protocol/execution/schemas/v0.1/operation-bodies.schema.json#/$defs/activityListRequest"
  );
  assert.equal(activityListValidate({ cursor: null, page_size: 25, state_filter: ["reserved"] }), true);
  assert.equal(activityListValidate({ cursor: null, page_size: 25, state_filter: ["gate_allowed"] }), false);
  const bindingSeed = make("cairn.execution_binding_set.v0.1");
  const activityLineage = make("cairn.lineage_commitment.v0.1", {
    principal_id: bindingSeed.principal_id,
    principal_occurrence_id: bindingSeed.principal_occurrence_id,
    principal_authorized_lineage_id: bindingSeed.principal_authorized_lineage_id,
    action_control_key: bindingSeed.action_control_key,
    action_proposal_hash: bindingSeed.action_proposal_hash,
    effect_id: bindingSeed.effect_id
  });
  const binding = make("cairn.execution_binding_set.v0.1", {
    ...bindingSeed,
    lineage_commitment_ref: refFor(activityLineage),
    lineage_commitment_hash: activityLineage.commitment_hash
  });
  const action = make("cairn.action_record.v0.2", {
    principal_id: binding.principal_id,
    execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    lineage_commitment_ref: refFor(activityLineage),
    lineage_commitment_hash: activityLineage.commitment_hash,
    action_proposal_ref: binding.action_proposal_ref,
    action_proposal_hash: binding.action_proposal_hash,
    effect_descriptor_ref: binding.effect_descriptor_ref,
    effect_id: binding.effect_id,
    capability: binding.capability
  });
  const state = make("cairn.action_state_head.v0.1", {
    action_id: action.action_id, action_ref: refFor(action), sequence: 0, previous_state_hash: null, state: "prepared"
  });
  const summary = make("cairn.execution_activity_summary.v0.1", {
    action_ref: refFor(action), action_state_head_ref: refFor(state), principal_id: action.principal_id,
    capability: action.capability, state: state.state
  });
  assert.deepEqual(validateActivitySummary(summary, action, state, context), []);
  const activityListRequest = { cursor: null, page_size: 25, state_filter: [state.state] };
  const activityListResponse = {
    items: [summary], next_cursor: null, total_disclosed: 1,
    retrieved_at: summary.updated_at,
    omitted_fields: [
      "payee_accounts", "private_budgets", "evidence", "contact_shipping",
      "full_warning_text", "other_agent_authority"
    ]
  };
  const activityListContext = signedReadContext(
    [summary, action, state, binding, activityLineage], {
    ...context,
    principalId: action.principal_id,
    objectResolver: new Map([
      [refFor(action).object_hash, action], [refFor(state).object_hash, state],
      [refFor(binding).object_hash, binding],
      [refFor(activityLineage).object_hash, activityLineage]
    ]),
    currentHeadHistoryResolver: currentHeadResolverFor([refFor(state)])
  }, action.principal_id);
  assert.deepEqual(validateActivityListResponse(
    activityListRequest, activityListResponse, activityListContext
  ), ["phase1_authenticated_resolution_unsupported"]);
  assert.deepEqual(validateActivityListResponse(
    { ...activityListRequest, page_size: 0 }, activityListResponse, activityListContext
  ), ["activity_list_request_schema_invalid"]);
  const { retrieved_at: omittedListSnapshot, ...listWithoutSnapshot } = activityListResponse;
  assert.equal(omittedListSnapshot, summary.updated_at);
  assert.deepEqual(validateActivityListResponse(
    activityListRequest, listWithoutSnapshot, activityListContext
  ), ["activity_list_response_schema_invalid"]);
  assert.ok(validateActivityListResponse(
    activityListRequest, activityListResponse,
    { ...activityListContext, principalId: "did:example:foreign-principal" }
  ).includes("activity_list_principal_scope_mismatch"));
  const { principalId: omittedPrincipalId, ...activityListWithoutPrincipal } = activityListContext;
  assert.equal(omittedPrincipalId, action.principal_id);
  assert.ok(validateActivityListResponse(
    activityListRequest, activityListResponse, activityListWithoutPrincipal
  ).includes("activity_list_principal_scope_unresolved"));
  assert.ok(validateActivityListResponse(
    { ...activityListRequest, state_filter: [] },
    { ...activityListResponse, items: [], total_disclosed: 0 },
    activityListWithoutPrincipal
  ).includes("activity_list_principal_scope_unresolved"));
  assert.ok(validateActivityListResponse(
    activityListRequest, activityListResponse,
    { ...activityListContext, currentHeadHistoryResolver: null }
  ).includes("activity_list_item_graph_mismatch"));
  assert.ok(validateActivityListResponse(
    { ...activityListRequest, state_filter: ["reserved"] },
    activityListResponse, activityListContext
  ).includes("activity_list_state_filter_mismatch"));
  assert.ok(validateActivityListResponse(
    activityListRequest,
    { ...activityListResponse, items: [summary, summary], total_disclosed: 2 },
    activityListContext
  ).includes("activity_list_duplicate_activity"));
  assert.ok(validateActivityListResponse(
    { ...activityListRequest, page_size: 1 },
    { ...activityListResponse, items: [summary, summary], total_disclosed: 2 },
    activityListContext
  ).includes("activity_list_page_projection_mismatch"));
  assert.ok(validateActivityListResponse(
    activityListRequest, { ...activityListResponse, total_disclosed: 0 }, activityListContext
  ).includes("activity_list_page_projection_mismatch"));
  const cursorRequest = { ...activityListRequest, page_size: 1 };
  const cursorResponseSeed = { ...activityListResponse, total_disclosed: 2 };
  const expectedNextCursor = activityListNextCursor(cursorRequest, cursorResponseSeed);
  assert.equal(typeof expectedNextCursor, "string");
  assert.ok(validateActivityListResponse(
    cursorRequest, cursorResponseSeed, activityListContext
  ).includes("activity_list_cursor_mismatch"));
  assert.deepEqual(validateActivityListResponse(
    cursorRequest, { ...cursorResponseSeed, next_cursor: expectedNextCursor }, activityListContext
  ), ["phase1_authenticated_resolution_unsupported"]);
  const corruptListSummary = structuredClone(summary);
  corruptListSummary.activity_service_signature.value = "A".repeat(86);
  assert.ok(validateActivityListResponse(
    activityListRequest, { ...activityListResponse, items: [corruptListSummary] },
    activityListContext
  ).includes("activity_list_item_graph_mismatch"));
  const lateListSummary = make("cairn.execution_activity_summary.v0.1", {
    ...summary,
    activity_service_signature: {
      ...summary.activity_service_signature,
      signed_at: "2026-07-22T10:00:01Z"
    }
  });
  const lateListContext = signedReadContext([lateListSummary], {
    ...activityListContext,
    objectResolver: new Map(activityListContext.objectResolver)
  }, action.principal_id);
  assert.ok(validateActivityListResponse(
    activityListRequest,
    { ...activityListResponse, items: [lateListSummary] }, lateListContext
  ).includes("activity_list_item_graph_mismatch"));
  const corruptListState = structuredClone(state);
  corruptListState.action_service_signature.value = "A".repeat(86);
  assert.ok(validateActivityListResponse(
    activityListRequest, activityListResponse, {
      ...activityListContext,
      objectResolver: new Map(activityListContext.objectResolver)
        .set(refFor(state).object_hash, corruptListState)
    }
  ).includes("activity_list_item_graph_mismatch"));
  const corruptListAction = structuredClone(action);
  corruptListAction.action_service_signature.value = "A".repeat(86);
  assert.ok(validateActivityListResponse(
    activityListRequest, activityListResponse, {
      ...activityListContext,
      objectResolver: new Map(activityListContext.objectResolver)
        .set(refFor(action).object_hash, corruptListAction)
    }
  ).includes("activity_list_item_graph_mismatch"));
  const corruptListBinding = structuredClone(binding);
  corruptListBinding.binding_service_signature.value = "A".repeat(86);
  assert.ok(validateActivityListResponse(
    activityListRequest, activityListResponse, {
      ...activityListContext,
      objectResolver: new Map(activityListContext.objectResolver)
        .set(refFor(binding).object_hash, corruptListBinding)
    }
  ).includes("activity_list_item_graph_mismatch"));
  const corruptListLineage = structuredClone(activityLineage);
  corruptListLineage.authority_service_signature.value = "A".repeat(86);
  assert.ok(validateActivityListResponse(
    activityListRequest, activityListResponse, {
      ...activityListContext,
      objectResolver: new Map(activityListContext.objectResolver)
        .set(refFor(activityLineage).object_hash, corruptListLineage)
    }
  ).includes("activity_list_item_graph_mismatch"));
  const lie = make("cairn.execution_activity_summary.v0.1", { ...summary, state: "reserved" });
  assert.ok(validateActivitySummary(lie, action, state, context).includes("activity_semantics_mismatch"));
  const lieListContext = signedReadContext([lie], {
    ...activityListContext,
    objectResolver: new Map(activityListContext.objectResolver)
  }, action.principal_id);
  assert.ok(validateActivityListResponse(
    { ...activityListRequest, state_filter: [] },
    { ...activityListResponse, items: [lie] }, lieListContext
  ).includes("activity_list_item_graph_mismatch"));
  const forbiddenSummary = make("cairn.execution_activity_summary.v0.1", { ...summary, state: "gate_allowed" });
  assert.ok(validateActivitySummary(forbiddenSummary, action, state, context).includes("phase1_object_schema_invalid"));

  const lineageState = make("cairn.lineage_state_head.v0.1", {
    principal_occurrence_id: activityLineage.principal_occurrence_id,
    principal_authorized_lineage_id: activityLineage.principal_authorized_lineage_id,
    action_control_key: activityLineage.action_control_key,
    attempt_sequence: activityLineage.attempt_sequence,
    commitment_generation: activityLineage.commitment_generation,
    commitment_ref: refFor(activityLineage)
  });
  const detail = make("cairn.execution_activity_detail.v0.1", {
    action_ref: refFor(action), action_state_head_ref: refFor(state), binding_set_ref: refFor(binding),
    lineage_state_head_ref: refFor(lineageState), principal_id: action.principal_id, state: state.state,
    receiver_truth_status: "not_handed_off", exposure_status: "none"
  });
  assert.deepEqual(validateActivityDetail(detail, action, state, binding, lineageState, context), []);
  const detailLie = make("cairn.execution_activity_detail.v0.1", { ...detail, state: "reserved" });
  assert.ok(validateActivityDetail(detailLie, action, state, binding, lineageState, context)
    .includes("activity_detail_semantics_mismatch"));
  const detailReadContext = signedReadContext(
    [detailLie, action, state, binding, lineageState, activityLineage],
    {
      ...context,
      objectResolver: new Map([
        [refFor(action).object_hash, action], [refFor(state).object_hash, state],
        [refFor(binding).object_hash, binding], [refFor(lineageState).object_hash, lineageState],
        [refFor(activityLineage).object_hash, activityLineage]
      ])
    },
    action.principal_id
  );
  assert.ok(validateExactObjectRead(
    "execution.activity.detail.get", { ref: refFor(detailLie) }, detailLie, detailReadContext
  ).includes("object_read_activity_detail_semantics_mismatch"));
  const signedDetailReadContext = signedReadContext(
    [detail, action, state, binding, lineageState, activityLineage], {
      ...context,
      objectResolver: new Map([
        [refFor(action).object_hash, action], [refFor(state).object_hash, state],
        [refFor(binding).object_hash, binding], [refFor(lineageState).object_hash, lineageState],
        [refFor(activityLineage).object_hash, activityLineage]
      ])
    }, action.principal_id
  );
  const corruptDetailState = structuredClone(state);
  corruptDetailState.action_service_signature.value = "A".repeat(86);
  assert.ok(validateExactObjectRead(
    "execution.activity.detail.get", { ref: refFor(detail) }, detail, {
      ...signedDetailReadContext,
      objectResolver: new Map(signedDetailReadContext.objectResolver)
        .set(refFor(state).object_hash, corruptDetailState)
    }
  ).includes("object_read_state_signature_invalid"));
  const corruptDetailAction = structuredClone(action);
  corruptDetailAction.action_service_signature.value = "A".repeat(86);
  assert.ok(validateExactObjectRead(
    "execution.activity.detail.get", { ref: refFor(detail) }, detail, {
      ...signedDetailReadContext,
      objectResolver: new Map(signedDetailReadContext.objectResolver)
        .set(refFor(action).object_hash, corruptDetailAction)
    }
  ).includes("object_read_action_signature_invalid"));
  const corruptDetailBinding = structuredClone(binding);
  corruptDetailBinding.binding_service_signature.value = "A".repeat(86);
  assert.ok(validateExactObjectRead(
    "execution.activity.detail.get", { ref: refFor(detail) }, detail, {
      ...signedDetailReadContext,
      objectResolver: new Map(signedDetailReadContext.objectResolver)
        .set(refFor(binding).object_hash, corruptDetailBinding)
    }
  ).includes("object_read_binding_signature_invalid"));
  const corruptDetailLineageState = structuredClone(lineageState);
  corruptDetailLineageState.authority_service_signature.value = "A".repeat(86);
  assert.ok(validateExactObjectRead(
    "execution.activity.detail.get", { ref: refFor(detail) }, detail, {
      ...signedDetailReadContext,
      objectResolver: new Map(signedDetailReadContext.objectResolver)
        .set(refFor(lineageState).object_hash, corruptDetailLineageState)
    }
  ).includes("object_read_lineage_state_signature_invalid"));
  const corruptDetailLineage = structuredClone(activityLineage);
  corruptDetailLineage.authority_service_signature.value = "A".repeat(86);
  assert.ok(validateExactObjectRead(
    "execution.activity.detail.get", { ref: refFor(detail) }, detail, {
      ...signedDetailReadContext,
      objectResolver: new Map(signedDetailReadContext.objectResolver)
        .set(refFor(activityLineage).object_hash, corruptDetailLineage)
    }
  ).includes("object_read_action_action_dependency_lineage_mismatch"));
  for (const forbidden of [
    { state: "gate_allowed" },
    { receiver_truth_status: "receiver_confirmed" },
    { exposure_status: "spent" }
  ]) {
    const specimen = make("cairn.execution_activity_detail.v0.1", { ...detail, ...forbidden });
    assert.ok(validateActivityDetail(specimen, action, state, binding, lineageState, context)
      .includes("phase1_object_schema_invalid"));
  }
});

test("generated files are byte-identical to the current deterministic source", async () => {
  assert.equal(await readFile(path.join(root, "dist", "cairn-supervised-execution-phase1-v0.1.json"), "utf8"), built.bytes);
  assert.equal(await readFile(path.join(root, "dist", "operation-registry-phase1-v0.1.json"), "utf8"), built.registryBytes);
  assert.equal(canonicalText(JSON.parse(built.registryBytes)) + "\n", built.registryBytes);
});
