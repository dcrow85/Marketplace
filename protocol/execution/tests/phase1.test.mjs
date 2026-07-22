import assert from "node:assert/strict";
import { generateKeyPairSync, sign as signBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { bindObjectHash, canonicalHash, canonicalText, objectRefFor, sha256, signatureInput, valueAtPointer } from "../lib/core.mjs";
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
  validateActionStateTransition,
  validateActionAuthorization,
  validateActionRecord,
  validateActionReceipt,
  validateActivitySummary,
  validateAuthorityReservation,
  validateBaseObjectResponse,
  validateBindingSet,
  validateCancellationAuthorization,
  validateCapabilitiesResponse,
  validateCompartmentDefinition,
  confirmationChallengeHash,
  validateConnectionEvent,
  validateConnectionOutstandingActionEntry,
  validateConnectionOutstandingIndexHead,
  validateConnectionOutstandingIndexTransitionReceipt,
  validateControlAuthorization,
  validateEnumerableMapNode,
  validateEnumerableMapRoot,
  validateExecutionRedemptionReceipt,
  validateExecutionConfirmation,
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
  validateTransitionManifestReadRequest,
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
  baseBundleHash: BASE_BUNDLE_HASH
};

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
  if (schemaId === "cairn.enumerable_map_node.v0.1") Object.assign(object, {
    node_kind: "empty", path_prefix_nibbles: "", leaf_entry: null,
    branch_children: [], subtree_entry_count: 0
  });
  if (schemaId === "cairn.connection_outstanding_action_entry.v0.1") Object.assign(object, {
    receiver_event_stream_key: null, finality_transition_profile_ref: null,
    finality_transition_profile_hash: null, sequence: 0, previous_entry_hash: null, state: "reserved"
  });
  if (schemaId === "cairn.execution_control_receipt.v0.1") Object.assign(object, {
    cause: "global_control", authorization_basis_kind: "control_authorization",
    control_namespace_ref: null, control_namespace_hash: null, prior_control_namespace_ref: null,
    prior_control_namespace_hash: null, prior_revoked_control_head_ref: null, prior_revoked_control_head_hash: null,
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
    evaluated_at: "2026-07-22T10:02:00Z", expires_at: "2026-07-22T10:04:00Z",
    gate_service_signature: { ...object.gate_service_signature, signed_at: "2026-07-22T10:02:00Z" }
  });
  if (schemaId === "cairn.execution_redemption_receipt.v0.2") Object.assign(object, {
    redeemed_at: "2026-07-22T10:03:00Z",
    authority_service_signature: { ...object.authority_service_signature, signed_at: "2026-07-22T10:03:00Z" }
  });
  Object.assign(object, overrides);
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

test("Phase 1 pins the fixed prose and byte-stable proposal dependencies", async () => {
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
  assert.equal(audit.objectSchemaCount, 39);
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
      "execution.control_namespace.get", "execution.control.get", "execution.compartment.get",
      "execution.compartment_state.get", "execution.mandate.get", "execution.authorization.get",
      "execution.cancellation_authorization.get"
    ].map((name) => [name, "owner_or_exact_runtime_audit_control_grant"]),
    ...[
      "execution.connection_state_event_receipt.get", "execution.control_receipt.get",
      "execution.connection_outstanding_action_entry.get",
      "execution.connection_outstanding_action_index_transition_receipt.get",
      "execution.compartment_state_transition_receipt.get", "execution.receipt.get",
      "execution.activity.detail.get"
    ].map((name) => [name, "owner_plus_audit_detail_or_exact_runtime_audit_grant"]),
    ["execution.confirmation_receipt.get", "inherited_parent_private_or_audit_acl"],
    ["execution.enumerable_map.get", "inherited_parent_private_or_audit_acl"]
  ]);
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
  assert.equal(expectedAccessByOperation.size, 19);

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
  assert.equal(alternatives("receiptObjectResponse").length, 9);
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
  assert.deepEqual(validateExactObjectRead("execution.mandate.get", mandateRequest, mandate, context), []);
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
  assert.equal(PHASE1_OBJECTS.length, 39);
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
  assert.equal(Object.keys(cancellation.fields).length, 59);
  for (const field of ["authorization_mode", "restrictive_control_head_ref", "original_outbox_handoff_receipt_ref",
    "cancellation_credential_continuity_receipt_ref", "original_operation_locator", "authorized_cancel_state_set",
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
  object.principal_signature.key_id = "did:example:collector#phase1";
  object.principal_signature.signed_at = "2026-07-22T10:00:00Z";
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
  assert.deepEqual(validatePhase1SignedObject(bound, signedContext), []);
  assert.deepEqual(validatePhase1SignedObject(bound, {
    ...signedContext, expectedControllersByPointer: { "/principal_signature": "did:example:attacker" }
  }), []);
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
  }), []);
  assert.ok(validatePhase1SignedObject(bound, {
    ...signedContext, keyResolver: new Map([[key.key_id, historicallyValid]]), requireCurrentKeyEligibility: true
  }).includes("signature_key_not_currently_eligible"));
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
  assert.ok(validatePhase1SignedObject(bound, {
    ...signedContext, now: "2026-07-22T09:59:59Z"
  }).includes("signature_from_future"));
  const { now: ignoredNow, ...withoutEvaluationTime } = signedContext;
  assert.equal(ignoredNow, "2026-07-22T10:01:00Z");
  assert.ok(validatePhase1SignedObject(bound, withoutEvaluationTime).includes("signature_evaluation_time_required"));
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
  assert.deepEqual(validatePhase1SignedObject(reboundRecovery, {
    ...context, now: "2026-07-22T10:01:00Z",
    keyResolver: new Map([[recoveryKey.key_id, recoveryKey]]), objectResolver: recoveryObjects
  }), []);
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
  const connectionSeed = make("cairn.agent_connection_state_head.v0.1", {
    sequence: 0, previous_state_hash: null, state: "active", pause_epoch: 0, revocation_nonce: 0
  });
  const leafBefore = make("cairn.scoped_execution_control_leaf_state_head.v0.1", {
    scoped_control_leaf_key: connectionSeed.connection_scoped_control_key,
    principal_id: connectionSeed.principal_id, control_namespace_generation: 0,
    scope: "connection", target_kind: "object_ref", target_ref: connectionSeed.connection_authorization_ref,
    compartment_control_key: null, action_control_key: null, sequence: 0, previous_state_hash: null,
    state: "active", pause_epoch: 0, revocation_nonce: 0
  });
  const leafAfter = make("cairn.scoped_execution_control_leaf_state_head.v0.1", {
    ...leafBefore, sequence: 1, previous_state_hash: leafBefore.head_hash, state: "paused", pause_epoch: 1
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
    scoped_control_head_count: 1
  });
  const aggregateAfter = make("cairn.execution_control_state_head.v0.1", {
    ...aggregateBefore, sequence: 1, previous_head_hash: aggregateBefore.head_hash,
    scoped_control_map_ref: distinctRefs(1, "connection-control-map-after")[0],
    scoped_control_map_hash: distinctRefs(1, "connection-control-map-after")[0].object_hash
  });
  const emptyOutstandingNode = make("cairn.enumerable_map_node.v0.1");
  const outstandingActionMap = make("cairn.enumerable_map_root.v0.1", {
    map_key: connectionOutstandingMapKey(before.outstanding_action_index_key),
    root_node_ref: refFor(emptyOutstandingNode), root_node_hash: emptyOutstandingNode.node_hash,
    revision: 0, entry_count: 0, entries_root: canonicalHash([])
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
    scoped_leaf_before_ref: refFor(leafBefore), scoped_leaf_before_hash: leafBefore.head_hash,
    scoped_leaf_after_ref: refFor(leafAfter), scoped_leaf_after_hash: leafAfter.head_hash,
    connection_state_event_receipt_ref: refFor(receipt), connection_state_event_receipt_hash: receipt.receipt_hash,
    recovery_grant_transition_receipt_ref: null, recovery_grant_transition_receipt_hash: null,
    outstanding_action_index_head_ref: refFor(outstandingIndexAfter),
    outstanding_action_index_head_hash: outstandingIndexAfter.head_hash,
    authority_transaction_id: receipt.authority_transaction_id, committed_at: receipt.committed_at
  });
  const connectionObjects = [
    before, after, aggregateBefore, aggregateAfter, emptyOutstandingNode, outstandingActionMap,
    outstandingIndexBefore, outstandingIndexAfter,
    control, leafBefore, leafAfter, outstandingIndexTransition
  ];
  const connectionContext = {
    ...context, controlAuthorization: control, controlReceipt,
    outstandingIndexTransitionReceipt: outstandingIndexTransition,
    objectResolver: new Map(connectionObjects.map((object) => [refFor(object).object_hash, object]))
  };
  assert.deepEqual(validateConnectionEvent(receipt, before, after, connectionContext), []);
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
    { ...connectionContext, connectionBefore: before, connectionAfter: after }
  ), []);
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
  const lineage = make("cairn.lineage_commitment.v0.1", {
    principal_authorized_lineage_id: `sha-256:${"3".repeat(64)}`
  });
  const action = make("cairn.action_record.v0.2", {
    lineage_commitment_ref: refFor(lineage), lineage_commitment_hash: lineage.commitment_hash
  });
  const actionState = make("cairn.action_state_head.v0.1", {
    action_id: action.action_id, action_ref: refFor(action), sequence: 0,
    previous_state_hash: null, state: "prepared"
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
    node_kind: "leaf", path_prefix_nibbles: entry.outstanding_action_key.slice(8, 10),
    leaf_entry: leafEntry, branch_children: [], subtree_entry_count: 1
  });
  const map = make("cairn.enumerable_map_root.v0.1", {
    map_key: connectionOutstandingMapKey(indexKey), revision: 1,
    root_node_ref: refFor(leaf), root_node_hash: leaf.node_hash,
    entry_count: 1, entries_root: canonicalHash([leafEntry])
  });
  const index = make("cairn.connection_outstanding_action_index_state_head.v0.1", {
    outstanding_action_index_key: indexKey, connection_state_id: connectionStateId,
    sequence: 1, previous_state_hash: `sha-256:${"4".repeat(64)}`,
    outstanding_action_map_ref: refFor(map), outstanding_action_map_hash: map.map_hash,
    outstanding_action_count: 1, outstanding_action_root: map.entries_root, state: "active"
  });
  const objects = [lineage, action, actionState, entry, leaf, map, index];
  const mapContext = {
    ...context, parentAccessAuthorized: true,
    objectResolver: new Map(objects.map((object) => [refFor(object).object_hash, object]))
  };
  assert.deepEqual(validateConnectionOutstandingActionEntry(entry, mapContext), []);
  assert.deepEqual(validateEnumerableMapNode(leaf, mapContext), []);
  assert.deepEqual(validateEnumerableMapRoot(map, {
    ...mapContext, expectedMapKey: connectionOutstandingMapKey(indexKey),
    expectedMapDomain: "connection_outstanding_action"
  }), []);
  assert.deepEqual(validateConnectionOutstandingIndexHead(index, mapContext), []);
  assert.ok(validateConnectionOutstandingIndexHead(index, context)
    .includes("connection_outstanding_map_ref_mismatch"));
  assert.deepEqual(validateExactObjectRead(
    "execution.connection_outstanding_action_index.get", { ref: refFor(index) }, index, mapContext
  ), []);
  assert.deepEqual(validateExactObjectRead(
    "execution.connection_outstanding_action_entry.get", { ref: refFor(entry) }, entry, mapContext
  ), []);
  const rootResponse = { ref: refFor(map), object: map, retrieved_at: "2026-07-22T10:00:00Z" };
  const rootRequest = {
    ref: refFor(map), owner_head_ref: refFor(index), map_root_ref: refFor(map), ancestor_node_refs: []
  };
  assert.deepEqual(validateExactObjectRead("execution.enumerable_map.get", rootRequest, rootResponse, mapContext), []);
  const nodeResponse = { ref: refFor(leaf), object: leaf, retrieved_at: "2026-07-22T10:00:00Z" };
  assert.deepEqual(validateExactObjectRead("execution.enumerable_map.get", {
    ...rootRequest, ref: refFor(leaf)
  }, nodeResponse, mapContext), []);
  assert.ok(validateExactObjectRead("execution.enumerable_map.get", {
    ...rootRequest, ref: refFor(leaf), ancestor_node_refs: [refFor(leaf)]
  }, nodeResponse, mapContext).includes("object_read_enumerable_map_read_ancestor_mismatch"));
  assert.ok(validateExactObjectRead("execution.enumerable_map.get", rootRequest, rootResponse, {
    ...mapContext, parentAccessAuthorized: false
  }).includes("object_read_enumerable_map_read_parent_acl_denied"));

  const emptyNode = make("cairn.enumerable_map_node.v0.1");
  const emptyMap = make("cairn.enumerable_map_root.v0.1", {
    map_key: connectionOutstandingMapKey(indexKey), revision: 0,
    root_node_ref: refFor(emptyNode), root_node_hash: emptyNode.node_hash,
    entry_count: 0, entries_root: canonicalHash([])
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

  const handedOffState = make("cairn.action_state_head.v0.1", {
    action_id: action.action_id, action_ref: refFor(action), sequence: 1,
    previous_state_hash: actionState.state_hash, state: "authorized"
  });
  const streamKey = `sha-256:${"5".repeat(64)}`;
  const updatedEntrySeed = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...entry, current_action_state_head_ref: refFor(handedOffState),
    current_action_state_head_hash: handedOffState.state_hash,
    receiver_event_stream_key: streamKey, sequence: 1, previous_entry_hash: entry.entry_hash,
    state: "handed_off"
  });
  const updatedEntry = make("cairn.connection_outstanding_action_entry.v0.1", {
    ...updatedEntrySeed, outstanding_action_key: connectionOutstandingActionKey(updatedEntrySeed)
  });
  const updatedLeafEntry = {
    ...leafEntry, entry_object_ref: refFor(updatedEntry), entry_object_hash: updatedEntry.entry_hash
  };
  const updatedLeaf = make("cairn.enumerable_map_node.v0.1", {
    ...leaf, leaf_entry: updatedLeafEntry
  });
  const updatedMap = make("cairn.enumerable_map_root.v0.1", {
    ...map, revision: 2, root_node_ref: refFor(updatedLeaf), root_node_hash: updatedLeaf.node_hash,
    entries_root: canonicalHash([updatedLeafEntry])
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
    authority_transaction_id: "update-outstanding-action", committed_at: updatedIndex.updated_at
  });
  const updateObjects = [...objects, emptyNode, emptyMap, emptyIndex, reservedIndex, handedOffState,
    updatedEntry, updatedLeaf, updatedMap, updatedIndex, updateReceipt];
  const updateContext = {
    ...mapContext,
    objectResolver: new Map(updateObjects.map((object) => [refFor(object).object_hash, object]))
  };
  assert.deepEqual(validateConnectionOutstandingIndexTransitionReceipt(updateReceipt, updateContext), []);
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
  const terminalEvidence = distinctRefs(1, "fenced-non-submission-evidence")[0];
  const removalReceipt = make("cairn.connection_outstanding_action_index_transition_receipt.v0.1", {
    ...updateReceipt, cause: "fenced_non_submission_removed",
    before_head_ref: refFor(updatedIndex), before_head_hash: updatedIndex.head_hash,
    after_head_ref: refFor(drainedIndex), after_head_hash: drainedIndex.head_hash,
    before_action_map_ref: refFor(updatedMap), before_action_map_hash: updatedMap.map_hash,
    after_action_map_ref: refFor(drainedMap), after_action_map_hash: drainedMap.map_hash,
    changed_entry_before_ref: refFor(updatedEntry), changed_entry_before_hash: updatedEntry.entry_hash,
    changed_entry_after_ref: null, changed_entry_after_hash: null,
    terminal_evidence_ref: terminalEvidence, terminal_evidence_hash: terminalEvidence.object_hash,
    authority_transaction_id: "remove-outstanding-action", committed_at: drainedIndex.updated_at
  });
  const removalContext = {
    ...updateContext,
    objectResolver: new Map([...updateObjects, drainedMap, drainedIndex, removalReceipt]
      .map((object) => [refFor(object).object_hash, object]))
  };
  assert.deepEqual(validateConnectionOutstandingIndexTransitionReceipt(removalReceipt, removalContext), []);
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
    { ref: refFor(sealReceipt) }, sealReceipt, sealedContext
  ), []);
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
});

test("compartment limits are single-asset and ordered", () => {
  const valid = validCompartment();
  const attestation = {
    schema: "cairn.compartment_protection_attestation.v0.1",
    attestation_hash: valid.protection_attestation_ref.object_hash,
    asset: "USD",
    enforced_cap: { amount_minor: 10000, asset: "USD" }
  };
  const compartmentContext = { ...context, objectResolver: new Map([[attestation.attestation_hash, attestation]]) };
  assert.deepEqual(validateCompartmentDefinition(valid, compartmentContext), []);
  const over = validCompartment({ per_action_ceiling: { amount_minor: 6000, asset: "USD" } });
  assert.ok(validateCompartmentDefinition(over, compartmentContext).includes("compartment_limit_order_invalid"));
  const crossed = validCompartment({ lifetime_limit: { amount_minor: 10000, asset: "EUR" } });
  assert.ok(validateCompartmentDefinition(crossed, compartmentContext).includes("compartment_asset_mismatch"));
  const capped = validCompartment({ configured_ceiling: { amount_minor: 10001, asset: "USD" } });
  assert.ok(validateCompartmentDefinition(capped, compartmentContext).includes("compartment_ceiling_exceeds_enforced_cap"));
});

test("mandate v0.3 keeps financial and nonfinancial authority branches disjoint", () => {
  assert.deepEqual(validateMandate(validMandate(), context), []);
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
  const value = make("cairn.execution_binding_set.v0.1", {
    execution_bundle_hash: built.bundle.bundle_hash,
    operation_registry_hash: audit.operationRegistryHash,
    actor_branch: "agent_runtime",
    cancellation_context: null,
    capability: "send_typed_nonbinding_notice",
    created_at: "2026-07-22T10:00:00Z",
    expires_at: "2026-07-22T10:05:00Z"
  });
  assert.deepEqual(validateBindingSet(value, context), []);
  const crossed = make("cairn.execution_binding_set.v0.1", { ...value, actor_branch: "principal_direct" });
  assert.ok(validateBindingSet(crossed, context).includes("binding_principal_branch_leaks_runtime"));
  const stale = make("cairn.execution_binding_set.v0.1", { ...value, execution_bundle_hash: `sha-256:${"f".repeat(64)}` });
  assert.ok(validateBindingSet(stale, context).includes("binding_release_mismatch"));
  const grantTemplate = structuredClone(value.action_proposal_ref);
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
      { data_grant_ref: tooManyGrants[1], current_state_head_ref: tooManyGrants[3], revocation_nonce: 0 },
      { data_grant_ref: tooManyGrants[1], current_state_head_ref: tooManyGrants[4], revocation_nonce: 0 }
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
    data_grant_state_heads: [{ data_grant_ref: tooManyGrants[1], current_state_head_ref: currentHeadRef, revocation_nonce: 4 }]
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
  const disclosureDrift = { ...disclosure, source_read_receipt_hash: `sha-256:${"9".repeat(64)}` };
  const bindingWithDisclosureDrift = make("cairn.execution_binding_set.v0.1", { ...value, disclosures: [disclosureDrift] });
  assert.ok(validateBindingSet(bindingWithDisclosureDrift, context).includes("binding_disclosure_ref_hash_mismatch"));
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
  const cancellationValidationContext = {
    ...context, originalAction: originalCancellationAction, originalActionStateHead: originalCancellationState
  };
  assert.deepEqual(validateBindingSet(cancellationBinding, cancellationValidationContext), []);
  const driftedCancellationContext = {
    ...cancellationContext, original_action_hash: `sha-256:${"9".repeat(64)}`
  };
  const cancellationBindingDrift = make("cairn.execution_binding_set.v0.1", {
    ...cancellationBinding, cancellation_context: driftedCancellationContext
  });
  assert.ok(validateBindingSet(cancellationBindingDrift, cancellationValidationContext)
    .includes("binding_cancellation_ref_hash_mismatch"));
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
    state: "gate_allowed", lineage_activation_receipt_ref: driftedActivation
  });
  assert.ok(validateActionStateTransition(reserved, driftedGate, context).includes("action_state_dependency_drift"));
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
  assert.ok(receiverFailures.includes("action_state_terminal_receiver_evidence_missing"));
  assert.ok(receiverFailures.includes("action_state_receiver_evidence_erased"));
});

test("gate, authorization, reservation, cancellation, and receipt branches are executable constraints", () => {
  const deniedCheck = { code: "CHECK_DENIED", decision: "deny", evidence_refs: [] };
  const impossibleAllow = make("cairn.gate_result.v0.2", { decision: "allow", check_results: [deniedCheck] });
  assert.ok(validateGateResult(impossibleAllow, context).includes("phase1_object_schema_invalid"));

  const bindingSeed = make("cairn.execution_binding_set.v0.1", { actor_branch: "principal_direct", agent_runtime_binding_ref: null,
    connection_authorization_ref: null, connection_state_head_ref: null, cancellation_context: null,
    obligation_exposure_core_ref: null, obligation_exposure_core_hash: null, obligation_exposure_id: null, obligation_role: null,
    checkout_group_core_ref: null, checkout_group_core_hash: null, checkout_role: null,
    checkout_reservation_batch_core_ref: null, checkout_reservation_batch_core_hash: null,
    fulfillment_attempt_core_ref: null, fulfillment_attempt_core_hash: null,
    payee_account_commitment: null, rail: null, exposure_vector: [],
    execution_bundle_hash: built.bundle.bundle_hash, operation_registry_hash: audit.operationRegistryHash,
    created_at: "2026-07-22T10:00:00Z", expires_at: "2026-07-22T10:05:00Z" });
  const reservationCommitment = make("cairn.lineage_commitment.v0.1", {
    principal_id: bindingSeed.principal_id, authority_kind: "supervised_pending", mandate_ref: null, scope_binding_index: null,
    principal_occurrence_id: bindingSeed.principal_occurrence_id,
    principal_authorized_lineage_id: bindingSeed.principal_authorized_lineage_id,
    action_control_key: bindingSeed.action_control_key, action_proposal_hash: bindingSeed.action_proposal_hash,
    effect_id: bindingSeed.effect_id, expected_activation_fence: 4,
    prior_lineage_state: "none", prior_lineage_receipt_ref: null, expires_at: "2026-07-22T10:05:00Z"
  });
  const confirmationFixture = confirmationPolicyFixture(
    bindingSeed.capability, bindingSeed.confirmation_assurance_policy_lifecycle_head_ref
  );
  const binding = make("cairn.execution_binding_set.v0.1", {
    ...bindingSeed, lineage_commitment_ref: refFor(reservationCommitment),
    lineage_commitment_hash: reservationCommitment.commitment_hash, expected_lineage_activation_fence: 4,
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
  const confirmationContext = {
    ...context,
    confirmationPolicy: confirmationFixture.policy,
    confirmationVerifierProfile: confirmationFixture.verifierProfile,
    currentPolicyLifecycleResolver: confirmationFixture.currentPolicyLifecycleResolver
  };
  assert.deepEqual(validateExecutionConfirmation(
    confirmation, authorization, binding, null,
    { ...confirmationContext, confirmationEvaluationTime: "2026-07-22T10:01:00Z" }
  ), []);
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
  const gateRequest = make("cairn.gate_request.v0.2", {
    principal_id: binding.principal_id, execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    authority_basis_ref: refFor(authorization), confirmation_receipt_ref: refFor(confirmation),
    confirmation_assurance_policy_lifecycle_head_ref: confirmationFixture.policyLifecycleRef,
    confirmation_assurance_policy_lifecycle_head_hash: confirmationFixture.policyLifecycleRef.object_hash,
    confirmation_verifier_profile_lifecycle_head_ref: confirmationFixture.verifierLifecycleRef,
    confirmation_verifier_profile_lifecycle_head_hash: confirmationFixture.verifierLifecycleRef.object_hash,
    policy_refs: [
      refFor(confirmationFixture.policy), confirmationFixture.policyLifecycleRef,
      refFor(confirmationFixture.verifierProfile), confirmationFixture.verifierLifecycleRef
    ],
    action_control_key: binding.action_control_key, checkout_readiness_receipt_ref: null,
    checkout_group_state_head_ref: null, checkout_terms_receipt_ref: null
  });
  assert.deepEqual(validateGateRequest(gateRequest, binding, authorization, confirmation, confirmationContext), []);
  const gateLifecycleHashDrift = make("cairn.gate_request.v0.2", {
    ...gateRequest, confirmation_assurance_policy_lifecycle_head_hash: `sha-256:${"9".repeat(64)}`
  });
  assert.ok(validateGateRequest(gateLifecycleHashDrift, binding, authorization, confirmation, confirmationContext)
    .includes("phase1_ref_hash_mismatch"));
  const wrongGateBinding = make("cairn.gate_request.v0.2", { ...gateRequest, action_control_key: `sha-256:${"9".repeat(64)}` });
  assert.ok(validateGateRequest(wrongGateBinding, binding, authorization, confirmation, confirmationContext).includes("gate_request_binding_mismatch"));
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
    decision: "allow", check_results: [{ code: "CHECK_OK", decision: "pass", evidence_refs: [] }]
  });
  const gateContext = { ...confirmationContext, gateRequest, binding, authority: authorization, confirmation };
  assert.deepEqual(validateGateResult(allowedGate, gateContext), []);
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
  const redemption = make("cairn.execution_redemption_receipt.v0.2", {
    action_ref: refFor(redemptionAction),
    execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    gate_result_ref: refFor(allowedGate), gate_result_hash: allowedGate.result_hash,
    evaluated_current_head_refs: allowedGate.evaluated_head_refs,
    checkout_dependency_refs: gateRequest.checkout_dependency_refs,
    terms_fence_pending_head_ref: null, redeemed_state_commitment_hash: null
  });
  const redemptionContext = { ...gateContext, action: redemptionAction };
  assert.deepEqual(validateExecutionRedemptionReceipt(redemption, allowedGate, binding, redemptionContext), []);
  const invertedGateRedemption = make("cairn.execution_redemption_receipt.v0.2", {
    ...redemption, gate_result_ref: refFor(invertedGate), gate_result_hash: invertedGate.result_hash
  });
  assert.ok(validateExecutionRedemptionReceipt(
    invertedGateRedemption, invertedGate, binding, redemptionContext
  ).includes("redemption_gate_result_invalid"));
  const lateRedemption = make("cairn.execution_redemption_receipt.v0.2", {
    ...redemption, redeemed_at: allowedGate.expires_at,
    authority_service_signature: {
      ...redemption.authority_service_signature, signed_at: allowedGate.expires_at
    }
  });
  assert.ok(validateExecutionRedemptionReceipt(lateRedemption, allowedGate, binding, redemptionContext)
    .includes("redemption_interval_invalid"));
  const alienActionRef = distinctRefs(1, "alien-redemption-action")[0];
  const alienActionRedemption = make("cairn.execution_redemption_receipt.v0.2", {
    ...redemption, action_ref: alienActionRef
  });
  assert.ok(validateExecutionRedemptionReceipt(alienActionRedemption, allowedGate, binding, redemptionContext)
    .includes("redemption_action_mismatch"));
  const driftedHeadRedemption = make("cairn.execution_redemption_receipt.v0.2", {
    ...redemption, evaluated_current_head_refs: distinctRefs(1, "alien-evaluated-head")
  });
  assert.ok(validateExecutionRedemptionReceipt(driftedHeadRedemption, allowedGate, binding, redemptionContext)
    .includes("redemption_evaluated_heads_mismatch"));
  const driftedCheckoutRedemption = make("cairn.execution_redemption_receipt.v0.2", {
    ...redemption, checkout_dependency_refs: distinctRefs(1, "alien-checkout-dependency")
  });
  assert.ok(validateExecutionRedemptionReceipt(driftedCheckoutRedemption, allowedGate, binding, redemptionContext)
    .includes("redemption_checkout_dependencies_mismatch"));
  assert.deepEqual(validateExactObjectRead(
    "execution.receipt.get", { ref: refFor(redemption) }, {
      ref: refFor(redemption), object: redemption, retrieved_at: "2026-07-22T10:03:30Z"
    },
    { ...redemptionContext, gateResult: allowedGate }
  ), []);
  assert.ok(validateExactObjectRead(
    "execution.receipt.get", { ref: refFor(lateRedemption) }, {
      ref: refFor(lateRedemption), object: lateRedemption, retrieved_at: "2026-07-22T10:04:30Z"
    },
    { ...redemptionContext, gateResult: allowedGate }
  ).includes("object_read_redemption_interval_invalid"));
  const overInventoryFenceBound = make("cairn.execution_redemption_receipt.v0.2", {
    ...redemption, consumed_inventory_fence_refs: distinctRefs(65, "inventory-fence")
  });
  assert.ok(validateExecutionRedemptionReceipt(overInventoryFenceBound, allowedGate, binding, redemptionContext)
    .includes("phase1_object_schema_invalid"));
  const deniedGate = make("cairn.gate_result.v0.2", { ...allowedGate, decision: "deny",
    check_results: [{ code: "CHECK_DENIED", decision: "deny", evidence_refs: [] }] });
  const deniedRedemption = make("cairn.execution_redemption_receipt.v0.2", {
    ...redemption, gate_result_ref: refFor(deniedGate), gate_result_hash: deniedGate.result_hash
  });
  assert.ok(validateExecutionRedemptionReceipt(deniedRedemption, deniedGate, binding, {
    ...redemptionContext, gateResult: deniedGate
  }).includes("redemption_gate_result_invalid"));
  const alienAuthorityGateRedemption = make("cairn.execution_redemption_receipt.v0.2", {
    ...redemption, gate_result_ref: refFor(alienAuthorityGateResult),
    gate_result_hash: alienAuthorityGateResult.result_hash
  });
  assert.ok(validateExecutionRedemptionReceipt(
    alienAuthorityGateRedemption, alienAuthorityGateResult, binding,
    { ...redemptionContext, gateRequest: alienAuthorityGateRequest }
  ).includes("redemption_gate_result_invalid"));

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
  assert.deepEqual(validateBindingSet(inventoryBinding, context), []);
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
  assert.deepEqual(validateBindingSet(financialBinding, context), []);
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
    retrieved_at: "2026-07-22T10:03:00Z"
  };
  const actionRequest = { ref: refFor(actionView) };
  assert.deepEqual(validateActionGetResponse(actionRequest, actionResponse, context), []);
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
  assert.deepEqual(validateActionGetResponse({ ref: refFor(preparedView) }, preparedResponse, context), []);
  const mandateSeed = make("cairn.agent_mandate.v0.3", {
    principal_id: binding.principal_id, capability: binding.capability,
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
      canonical_business_tuple_hash: commitment.canonical_business_tuple_hash
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
  assert.deepEqual(validateActionGetResponse(
    mandateGraph.request, mandateGraph.response, confirmationContext
  ), []);
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
  assert.deepEqual(validateActionGetResponse({ ref: refFor(reservedView) }, reservedResponse, context), []);
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
  const compositeGateRequest = make("cairn.gate_request.v0.2", {
    ...gateRequest,
    principal_id: binding.principal_id, execution_binding_set_ref: refFor(binding),
    execution_binding_set_hash: binding.binding_set_hash, authority_basis_ref: refFor(authorization),
    confirmation_receipt_ref: refFor(confirmation), action_control_key: binding.action_control_key,
    reservation_receipt_refs: [refFor(activationReservation)], checkout_readiness_receipt_ref: null,
    checkout_group_state_head_ref: null, checkout_terms_receipt_ref: null
  });
  const deniedCompositeGate = make("cairn.gate_result.v0.2", {
    gate_request_ref: refFor(compositeGateRequest), gate_request_hash: compositeGateRequest.request_hash,
    execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    decision: "deny", check_results: [{ code: "CHECK_DENIED", decision: "deny", evidence_refs: [] }]
  });
  assert.deepEqual(validateActionGetResponse({ ref: refFor(reservedView) }, {
    ...reservedResponse, confirmation_receipt: confirmation,
    gate_request: compositeGateRequest, gate_result: deniedCompositeGate
  }, confirmationContext), []);
  const allowedCompositeGate = make("cairn.gate_result.v0.2", {
    gate_request_ref: refFor(compositeGateRequest), gate_request_hash: compositeGateRequest.request_hash,
    execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    decision: "allow", check_results: [{ code: "CHECK_OK", decision: "pass", evidence_refs: [] }]
  });
  const gateAllowedState = make("cairn.action_state_head.v0.1", {
    ...reservedActionState, sequence: reservedActionState.sequence + 1,
    previous_state_hash: reservedActionState.state_hash, state: "gate_allowed",
    gate_result_ref: refFor(allowedCompositeGate)
  });
  const gateAllowedActivity = make("cairn.execution_activity_detail.v0.1", {
    ...reservedActivity, action_state_head_ref: refFor(gateAllowedState), state: gateAllowedState.state,
    current_receipt_refs: [
      gateAllowedState.prior_transition_receipt_ref, gateAllowedState.lineage_activation_receipt_ref,
      ...gateAllowedState.reservation_refs, gateAllowedState.gate_result_ref
    ]
  });
  const gateAllowedView = make("cairn.execution_action_view.v0.1", {
    ...reservedView, current_action_state_head_ref: refFor(gateAllowedState),
    current_activity_detail_ref: refFor(gateAllowedActivity)
  });
  const gateAllowedResponse = {
    ...reservedResponse, ref: refFor(gateAllowedView), view: gateAllowedView,
    current_action_state_head: gateAllowedState, current_activity_detail: gateAllowedActivity,
    confirmation_receipt: confirmation, gate_request: compositeGateRequest, gate_result: allowedCompositeGate
  };
  assert.deepEqual(validatePhase1Object(gateAllowedState, context), []);
  assert.deepEqual(validatePhase1Object(gateAllowedActivity, context), []);
  assert.deepEqual(validatePhase1Object(allowedCompositeGate, context), []);
  assert.deepEqual(validateActionGetResponse(
    { ref: refFor(gateAllowedView) }, gateAllowedResponse, confirmationContext
  ), []);
  const deniedAsAllowedState = make("cairn.action_state_head.v0.1", {
    ...gateAllowedState, gate_result_ref: refFor(deniedCompositeGate)
  });
  const deniedAsAllowedActivity = make("cairn.execution_activity_detail.v0.1", {
    ...gateAllowedActivity, action_state_head_ref: refFor(deniedAsAllowedState),
    current_receipt_refs: [
      deniedAsAllowedState.prior_transition_receipt_ref, deniedAsAllowedState.lineage_activation_receipt_ref,
      ...deniedAsAllowedState.reservation_refs, deniedAsAllowedState.gate_result_ref
    ]
  });
  const deniedAsAllowedView = make("cairn.execution_action_view.v0.1", {
    ...gateAllowedView, current_action_state_head_ref: refFor(deniedAsAllowedState),
    current_activity_detail_ref: refFor(deniedAsAllowedActivity)
  });
  assert.ok(validateActionGetResponse({ ref: refFor(deniedAsAllowedView) }, {
    ...gateAllowedResponse, ref: refFor(deniedAsAllowedView), view: deniedAsAllowedView,
    current_action_state_head: deniedAsAllowedState, current_activity_detail: deniedAsAllowedActivity,
    gate_result: deniedCompositeGate
  }, confirmationContext).includes("action_get_gate_decision_state_mismatch"));
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
  const finalityRef = distinctRefs(1, "cancellation-finality-profile")[0];
  cancellationContext.cancellation_finality_profile_ref = finalityRef;
  const cancellationValidationContext = { ...context, originalAction, originalActionStateHead: originalState };
  const cancellationConfirmationFixture = confirmationPolicyFixture(
    "cancel_receiver_action", distinctRefs(3, "cancellation-confirmation-policy-lifecycle")[2]
  );
  const binding = make("cairn.execution_binding_set.v0.1", {
    actor_branch: "principal_direct", agent_runtime_binding_ref: null, connection_authorization_ref: null,
    connection_state_head_ref: null, execution_bundle_hash: built.bundle.bundle_hash,
    operation_registry_hash: audit.operationRegistryHash, principal_id: seed.principal_id,
    capability: "cancel_receiver_action", cancellation_context: cancellationContext,
    effect_id: seed.cancellation_effect_id, lineage_commitment_ref: seed.lineage_commitment_ref,
    ultimate_receiver: seed.receiver_id,
    receiver_account_or_contract_scope: cancellationContext.receiver_account_or_contract_scope,
    receiver_operation_namespace: cancellationContext.cancellation_operation_namespace,
    receiver_finality_profile_ref: finalityRef,
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
  assert.deepEqual(validateBindingSet(binding, cancellationValidationContext), []);
  const authorization = make("cairn.cancellation_authorization.v0.1", {
    ...seed, execution_binding_set_ref: refFor(binding), execution_binding_set_hash: binding.binding_set_hash,
    required_confirmation_assurance_policy_ref: binding.confirmation_assurance_policy_ref,
    expires_at: "2026-07-22T10:05:00Z"
  });
  assert.deepEqual(validateCancellationAuthorization(authorization, binding, cancellationValidationContext), []);
  const alienOccurrence = make("cairn.cancellation_authorization.v0.1", {
    ...authorization, principal_occurrence_id: `sha-256:${"8".repeat(64)}`
  });
  assert.ok(validateCancellationAuthorization(alienOccurrence, binding, cancellationValidationContext)
    .includes("cancellation_binding_semantics_mismatch"));
  const alienReceiver = make("cairn.cancellation_authorization.v0.1", {
    ...authorization, receiver_id: "did:example:alien-receiver"
  });
  assert.ok(validateCancellationAuthorization(alienReceiver, binding, cancellationValidationContext)
    .includes("cancellation_binding_semantics_mismatch"));
  const driftedOriginalEffectContext = { ...cancellationContext, original_effect_id: `sha-256:${"9".repeat(64)}` };
  const driftedOriginalEffectBinding = make("cairn.execution_binding_set.v0.1", {
    ...binding, cancellation_context: driftedOriginalEffectContext
  });
  assert.ok(validateBindingSet(driftedOriginalEffectBinding, cancellationValidationContext)
    .includes("binding_cancellation_original_action_mismatch"));
  const driftedOriginalEffectAuthorization = make("cairn.cancellation_authorization.v0.1", {
    ...authorization, execution_binding_set_ref: refFor(driftedOriginalEffectBinding),
    execution_binding_set_hash: driftedOriginalEffectBinding.binding_set_hash,
    original_effect_id: driftedOriginalEffectContext.original_effect_id
  });
  assert.ok(validateCancellationAuthorization(
    driftedOriginalEffectAuthorization, driftedOriginalEffectBinding, cancellationValidationContext
  ).includes("cancellation_original_action_mismatch"));

  const confirmation = confirmationReceiptFixture(
    authorization, binding, cancellationConfirmationFixture
  );
  const cancellationGateContext = {
    ...cancellationValidationContext,
    confirmationPolicy: cancellationConfirmationFixture.policy,
    confirmationVerifierProfile: cancellationConfirmationFixture.verifierProfile,
    currentPolicyLifecycleResolver: cancellationConfirmationFixture.currentPolicyLifecycleResolver
  };
  const request = make("cairn.gate_request.v0.2", {
    principal_id: binding.principal_id, execution_binding_set_ref: refFor(binding),
    execution_binding_set_hash: binding.binding_set_hash, authority_basis_ref: refFor(authorization),
    confirmation_receipt_ref: refFor(confirmation), action_control_key: binding.action_control_key,
    confirmation_assurance_policy_lifecycle_head_ref: cancellationConfirmationFixture.policyLifecycleRef,
    confirmation_assurance_policy_lifecycle_head_hash: cancellationConfirmationFixture.policyLifecycleRef.object_hash,
    confirmation_verifier_profile_lifecycle_head_ref: cancellationConfirmationFixture.verifierLifecycleRef,
    confirmation_verifier_profile_lifecycle_head_hash: cancellationConfirmationFixture.verifierLifecycleRef.object_hash,
    policy_refs: [
      refFor(cancellationConfirmationFixture.policy), cancellationConfirmationFixture.policyLifecycleRef,
      refFor(cancellationConfirmationFixture.verifierProfile), cancellationConfirmationFixture.verifierLifecycleRef
    ],
    receiver_finality_profile_ref: finalityRef,
    checkout_readiness_receipt_ref: null, checkout_group_state_head_ref: null, checkout_terms_receipt_ref: null
  });
  assert.deepEqual(validateGateRequest(request, binding, authorization, confirmation, cancellationGateContext), []);
  const alienGate = make("cairn.gate_request.v0.2", {
    ...request, receiver_finality_profile_ref: distinctRefs(1, "alien-finality-profile")[0]
  });
  assert.ok(validateGateRequest(alienGate, binding, authorization, confirmation, cancellationGateContext)
    .includes("gate_request_cancellation_authority_mismatch"));
});

test("transition manifests are typed, complete, sorted, and readable only through an authorized naming parent", () => {
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
  const parent = make("cairn.compartment_state_transition_receipt.v0.1", {
    economic_mutation_cause_core_ref: causeRef, economic_mutation_cause_core_hash: causeRef.object_hash,
    economic_atom_delta_manifest_ref: refFor(manifest), economic_atom_delta_manifest_hash: manifest.manifest_hash
  });
  const request = { parent_ref: refFor(parent), manifest_ref: refFor(manifest) };
  const manifestKey = manifest.issuing_authority_signature.key_id;
  const manifestReadContext = {
    ...context, parentAccessAuthorized: true,
    keyResolver: new Map([[manifestKey, { controller: manifest.issuing_authority_id }]])
  };
  assert.deepEqual(validateTransitionManifestReadRequest(request, parent, manifest, manifestReadContext), []);
  assert.ok(validateTransitionManifestReadRequest(request, parent, manifest, { ...manifestReadContext, parentAccessAuthorized: false }).includes("transition_manifest_parent_acl_denied"));
  const wrongCauseSchema = { ...causeRef, schema: "cairn.untyped_cause.v0.1" };
  const wrongCauseManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    ...manifest, subject_ref: wrongCauseSchema, subject_hash: wrongCauseSchema.object_hash
  });
  const wrongCauseParent = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...parent, economic_mutation_cause_core_ref: wrongCauseSchema,
    economic_atom_delta_manifest_ref: refFor(wrongCauseManifest), economic_atom_delta_manifest_hash: wrongCauseManifest.manifest_hash
  });
  assert.ok(validateTransitionManifestReadRequest({ parent_ref: refFor(wrongCauseParent), manifest_ref: refFor(wrongCauseManifest) },
    wrongCauseParent, wrongCauseManifest, manifestReadContext)
    .includes("transition_manifest_parent_subject_schema_mismatch"));
  const alienSubjectRef = { ...manifest.subject_ref, object_id: "other-subject" };
  const alienSubjectManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    ...manifest, subject_ref: alienSubjectRef, subject_hash: alienSubjectRef.object_hash
  });
  assert.deepEqual(validateTransitionManifest(alienSubjectManifest, context), []);
  const alienParent = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...parent, economic_atom_delta_manifest_ref: refFor(alienSubjectManifest),
    economic_atom_delta_manifest_hash: alienSubjectManifest.manifest_hash
  });
  assert.ok(validateTransitionManifestReadRequest({ parent_ref: refFor(alienParent), manifest_ref: refFor(alienSubjectManifest) },
    alienParent, alienSubjectManifest, manifestReadContext).includes("transition_manifest_parent_membership_missing"));
  const other = make("cairn.enumerable_transition_manifest.v0.1", { ...manifest, authority_transaction_id: "other" });
  assert.ok(validateTransitionManifestReadRequest({ ...request, manifest_ref: refFor(other) }, parent, other, {
    ...manifestReadContext
  }).includes("transition_manifest_parent_membership_missing"));
  const inventedKeyEntry = { ...entry, entry_key: `sha-256:${"5".repeat(64)}` };
  const inventedKeyManifest = make("cairn.enumerable_transition_manifest.v0.1", {
    ...manifest, sorted_entries: [inventedKeyEntry], entries_root: canonicalHash([inventedKeyEntry])
  });
  assert.ok(validateTransitionManifest(inventedKeyManifest, context).includes("transition_manifest_entry_key_mismatch"));
  const alienAuthorityContext = {
    ...manifestReadContext,
    keyResolver: new Map([[manifestKey, { controller: "did:example:other-authority" }]])
  };
  assert.ok(validateTransitionManifestReadRequest(request, parent, manifest, alienAuthorityContext)
    .includes("transition_manifest_issuing_authority_mismatch"));
  const otherParentKey = make("cairn.compartment_state_transition_receipt.v0.1", {
    ...parent,
    authority_service_signature: { ...parent.authority_service_signature, key_id: "other-authority-key" }
  });
  assert.ok(validateTransitionManifestReadRequest(
    { parent_ref: refFor(otherParentKey), manifest_ref: refFor(manifest) }, otherParentKey, manifest,
    { ...manifestReadContext, keyResolver: new Map([
      [manifestKey, { controller: manifest.issuing_authority_id }],
      ["other-authority-key", { controller: manifest.issuing_authority_id }]
    ]) }
  ).includes("transition_manifest_issuing_authority_mismatch"));
  const operation = sources.registry.operations.find(({ name }) => name === "execution.transition_manifest.get");
  assert.equal(operation.consequence, "private_read");
  assert.equal(operation.access_requirement, "inherited_parent_private_or_audit_acl");
});

test("activity summaries are privacy-minimized projections of exact action state", () => {
  const action = make("cairn.action_record.v0.2");
  const state = make("cairn.action_state_head.v0.1", {
    action_id: action.action_id, action_ref: refFor(action), sequence: 0, previous_state_hash: null, state: "prepared"
  });
  const summary = make("cairn.execution_activity_summary.v0.1", {
    action_ref: refFor(action), action_state_head_ref: refFor(state), principal_id: action.principal_id,
    capability: action.capability, state: state.state
  });
  assert.deepEqual(validateActivitySummary(summary, action, state, context), []);
  const lie = make("cairn.execution_activity_summary.v0.1", { ...summary, state: "finalized" });
  assert.ok(validateActivitySummary(lie, action, state, context).includes("activity_semantics_mismatch"));
});

test("generated files are byte-identical to the current deterministic source", async () => {
  assert.equal(await readFile(path.join(root, "dist", "cairn-supervised-execution-phase1-v0.1.json"), "utf8"), built.bytes);
  assert.equal(await readFile(path.join(root, "dist", "operation-registry-phase1-v0.1.json"), "utf8"), built.registryBytes);
  assert.equal(canonicalText(JSON.parse(built.registryBytes)) + "\n", built.registryBytes);
});
