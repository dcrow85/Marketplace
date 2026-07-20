import {
  canonicalHash,
  canonicalText,
  objectRefFor,
  objectRefKey,
  sameObjectRef,
  valueAtPointer,
  verifyEd25519,
  verifyObjectBindings
} from "./core.mjs";

function unique(values) {
  return [...new Set(values)];
}

function resolve(source, key) {
  if (!source) return undefined;
  if (typeof source === "function") return source(key);
  if (typeof source.get === "function") return source.get(key);
  return source[key];
}

function instant(value) {
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : Number.NaN;
}

function nowInstant(now) {
  return instant(now ?? new Date().toISOString());
}

function currentAt(now, notBefore, expiresAt) {
  const point = nowInstant(now);
  return Number.isFinite(point) && point >= instant(notBefore) && point < instant(expiresAt);
}

function canonicalEqual(left, right) {
  try {
    return canonicalText(left) === canonicalText(right);
  } catch {
    return false;
  }
}

function schemaForObject(object, schemasByObjectId) {
  return resolve(schemasByObjectId, object?.schema);
}

function validationError(validate, code) {
  return validate && validate.errors ? code : code;
}

export function validateSignedObject(object, { ajv, schemasByObjectId, keyResolver, now } = {}) {
  const failures = [];
  const schema = schemaForObject(object, schemasByObjectId);
  if (!schema) return ["object_schema_unknown"];
  const validate = ajv?.getSchema(schema.$id);
  if (!validate || !validate(object)) failures.push(validationError(validate, "object_schema_invalid"));
  try {
    failures.push(...verifyObjectBindings(object, schema));
  } catch {
    failures.push("object_binding_invalid");
  }

  for (const pointer of schema["x-cairn-signature-pointers"] ?? []) {
    let signature;
    try {
      signature = valueAtPointer(object, pointer);
    } catch {
      failures.push("signature_missing");
      continue;
    }
    const key = resolve(keyResolver, signature.key_id);
    if (!key) {
      failures.push("signing_key_unknown");
      continue;
    }
    if (key.status && key.status !== "active") failures.push("signing_key_inactive");
    if (key.not_before && key.expires_at && !currentAt(now, key.not_before, key.expires_at)) {
      failures.push("signing_key_not_current");
    }
    if (
      key.not_before &&
      key.expires_at &&
      !currentAt(signature.signed_at, key.not_before, key.expires_at)
    ) {
      failures.push("signature_outside_key_validity");
    }
    if (instant(signature.signed_at) > nowInstant(now)) failures.push("signature_from_future");
    if (
      !verifyEd25519({
        schemaId: object.schema,
        objectHash: signature.signed_hash,
        publicKey: key.public_key,
        signature: signature.value
      })
    ) {
      failures.push("signature_invalid");
    }
  }
  return unique(failures);
}

export function validateRuntimeBinding(binding, context = {}) {
  const failures = validateSignedObject(binding, context);
  if (binding?.key_status !== "active") failures.push("runtime_key_inactive");
  if (binding?.not_before && binding?.expires_at && !currentAt(context.now, binding.not_before, binding.expires_at)) {
    failures.push("runtime_binding_not_current");
  }
  if (binding?.agent_identity?.runtime_instance_key_id !== binding?.runtime_public_key?.key_id) {
    failures.push("runtime_identity_key_mismatch");
  }
  const runtimeKey = resolve(context.keyResolver, binding?.runtime_public_key?.key_id);
  if (!runtimeKey) failures.push("runtime_public_key_unresolved");
  else {
    if (runtimeKey.public_key !== binding?.runtime_public_key?.public_key) failures.push("runtime_public_key_material_mismatch");
    if (runtimeKey.status && runtimeKey.status !== "active") failures.push("runtime_resolved_key_inactive");
    if (runtimeKey.not_before && runtimeKey.expires_at && !currentAt(context.now, runtimeKey.not_before, runtimeKey.expires_at)) {
      failures.push("runtime_resolved_key_not_current");
    }
    if (runtimeKey.controller && runtimeKey.controller !== binding?.agent_identity?.agent_provider_id) {
      failures.push("runtime_key_controller_mismatch");
    }
  }
  const providerKey = resolve(context.keyResolver, binding?.provider_signature?.key_id);
  if (providerKey?.controller && providerKey.controller !== binding?.agent_identity?.agent_provider_id) {
    failures.push("runtime_provider_signer_mismatch");
  }
  return unique(failures);
}

function resourceCovered(scope, resource) {
  if (scope.resource_kind !== resource.resource_kind) return false;
  if (!sameObjectRef(scope.ref, resource.ref) && !(scope.ref === null && resource.ref === null)) return false;
  if (scope.retrieval_uri !== resource.retrieval_uri) return false;
  return resource.field_paths.every((field) => scope.field_paths.includes("") || scope.field_paths.includes(field));
}

export function validateDataGrant(grant, context = {}) {
  const failures = [];
  if (grant?.principal_id !== context.principalId) failures.push("grant_principal_mismatch");
  if (grant?.recipient !== context.recipient) failures.push("grant_recipient_mismatch");
  if (grant?.purpose !== context.purpose) failures.push("grant_purpose_mismatch");
  if (!grant?.uses?.includes(context.use)) failures.push("grant_use_missing");
  if (!grant?.audience?.includes(context.recipient)) failures.push("grant_audience_mismatch");
  if (grant?.maximum_disclosures < 1) failures.push("grant_disclosures_exhausted");
  if (!currentAt(context.now, grant?.issued_at, grant?.expires_at)) failures.push("grant_not_current");
  if (grant?.retention?.expires_at && instant(grant.retention.expires_at) > instant(grant.expires_at)) {
    failures.push("grant_retention_exceeds_grant");
  }
  if (grant?.retention?.expires_at && nowInstant(context.now) >= instant(grant.retention.expires_at)) {
    failures.push("grant_retention_expired");
  }
  const principalKey = resolve(context.keyResolver, grant?.principal_signature?.key_id);
  if (!principalKey || principalKey.controller !== grant?.principal_id) failures.push("grant_principal_signer_mismatch");
  const state = resolve(context.grantStatesByRef, objectRefKey(context.grantRef ?? {}));
  if (!state) failures.push("grant_state_missing");
  else {
    if (state.status !== "active") failures.push("grant_revoked_or_inactive");
    if (state.revocation_nonce !== grant.revocation_nonce) failures.push("grant_revocation_nonce_mismatch");
    if (state.remaining_disclosures < 1) failures.push("grant_disclosures_exhausted");
    if (state.remaining_disclosures > grant.maximum_disclosures) failures.push("grant_disclosure_state_invalid");
  }
  for (const resource of context.resources ?? []) {
    if (!grant?.resource_scopes?.some((scope) => resourceCovered(scope, resource))) {
      failures.push("grant_resource_scope_mismatch");
    }
  }
  return unique(failures);
}

function sortedRefs(refs) {
  return [...(refs ?? [])]
    .map(objectRefKey)
    .sort((left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")));
}

function sortedStrings(values) {
  return [...(values ?? [])].sort((left, right) =>
    Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"))
  );
}

export function operationFingerprint(envelope) {
  return canonicalHash({
    message_type: envelope.message_type,
    principal_id: envelope.principal_id,
    sender_actor_id: envelope.sender.actor_id,
    audience: sortedStrings(envelope.audience),
    subject_refs: sortedRefs(envelope.subject_refs),
    authorization_refs: sortedRefs(envelope.authorization_refs),
    body_schema: envelope.body_schema,
    body_hash: envelope.body_hash,
    critical_extensions: sortedStrings(envelope.critical_extensions)
  });
}

function resourceUri(ref, context) {
  return resolve(context.resourceUrisByRef, objectRefKey(ref));
}

function operationResources(envelope, context, bodySchema) {
  const resources = [];
  if (bodySchema?.["x-cairn-object-schema"]) {
    const bodyRef = objectRefFor(envelope.body, bodySchema);
    resources.push({ resource_kind: "object", ref: bodyRef, retrieval_uri: resourceUri(bodyRef, context), field_paths: [""] });
    if (envelope.message_type === "action.prepare") {
      for (const ref of envelope.body.resource_refs ?? []) {
        resources.push({ resource_kind: "object", ref, retrieval_uri: resourceUri(ref, context), field_paths: [""] });
      }
    }
  } else if (envelope.body?.ref && envelope.body?.retrieval_uri) {
    resources.push({ resource_kind: "object", ref: envelope.body.ref, retrieval_uri: envelope.body.retrieval_uri, field_paths: [""] });
  }
  return resources;
}

export function validateEnvelopeOperation(envelope, context = {}) {
  const failures = validateSignedObject(envelope, context);
  const operation = context.registry?.operations?.find(({ name }) => name === envelope?.message_type);
  if (!operation) return unique([...failures, "operation_unknown"]);
  if (envelope.body_schema !== operation.request_schema) failures.push("body_schema_mismatch");
  const bodyValidate = context.ajv?.getSchema(operation.request_schema);
  const bodyIsValid = Boolean(bodyValidate?.(envelope.body));
  if (!bodyIsValid) failures.push("body_schema_invalid");
  const bodySchema = schemaForObject(envelope.body, context.schemasByObjectId);
  if (bodySchema) failures.push(...validateSignedObject(envelope.body, context).map((code) => `body_${code}`));

  try {
    if (envelope.operation_fingerprint !== operationFingerprint(envelope)) failures.push("operation_fingerprint_mismatch");
  } catch {
    failures.push("operation_fingerprint_invalid");
  }
  if (!currentAt(context.now, envelope.created_at, envelope.expires_at)) failures.push("envelope_not_current");
  if (!context.expectedAudience) failures.push("expected_audience_required");
  else if (!envelope.audience?.includes(context.expectedAudience)) failures.push("audience_mismatch");
  if (!context.usedNonces?.has) failures.push("replay_state_required");
  else if (context.usedNonces.has(envelope.nonce)) failures.push("nonce_replay");
  if (operation.mutating && !envelope.idempotency_key) failures.push("idempotency_key_required");
  if (operation.mutating && !context.authorityNamespace) failures.push("authority_namespace_required");
  if (operation.mutating && !context.idempotencyRecords?.get) failures.push("idempotency_state_required");
  const idempotencyRecordKey = envelope.idempotency_key && context.authorityNamespace
    ? `${context.authorityNamespace}|${envelope.idempotency_key}`
    : null;
  const priorFingerprint = idempotencyRecordKey && context.idempotencyRecords?.get(idempotencyRecordKey);
  if (priorFingerprint && priorFingerprint !== envelope.operation_fingerprint) failures.push("idempotency_conflict");
  if ((envelope.critical_extensions?.length ?? 0) > 0) failures.push("critical_extension_unknown");

  if (envelope.sender?.runtime_key_id !== envelope.signature?.key_id) failures.push("envelope_signer_runtime_key_mismatch");
  if (!context.runtimeBinding) failures.push("runtime_binding_required");
  else {
    failures.push(...validateRuntimeBinding(context.runtimeBinding, context));
    if (context.runtimeBinding.agent_identity?.runtime_instance_key_id !== envelope.sender?.runtime_key_id) {
      failures.push("runtime_binding_key_mismatch");
    }
    if (context.runtimeBinding.agent_identity?.agent_provider_id !== envelope.sender?.actor_id) {
      failures.push("runtime_binding_sender_mismatch");
    }
  }
  if (envelope.body?.principal_id && envelope.body.principal_id !== envelope.principal_id) failures.push("body_principal_mismatch");
  if (bodySchema && bodyIsValid) {
    try {
      const bodyRef = objectRefFor(envelope.body, bodySchema);
      if (!envelope.subject_refs?.some((ref) => sameObjectRef(ref, bodyRef))) failures.push("body_subject_ref_missing");
    } catch {
      failures.push("body_subject_ref_invalid");
    }
  }
  if (envelope.message_type === "action.prepare") {
    const identity = envelope.body?.agent_identity;
    if (!identity || !canonicalEqual(identity, context.runtimeBinding?.agent_identity)) failures.push("proposal_runtime_identity_mismatch");
    if (envelope.body?.agent_signature?.key_id !== envelope.sender?.runtime_key_id) failures.push("proposal_signer_runtime_key_mismatch");
    const descriptorRef = envelope.body?.effect_descriptor_ref;
    const descriptor = descriptorRef && resolve(context.effectDescriptorsByRef, objectRefKey(descriptorRef));
    if (!descriptor) failures.push("effect_descriptor_unresolved");
    else {
      failures.push(...validateSignedObject(descriptor, context).map((code) => `effect_descriptor_${code}`));
      failures.push(...validateProposalEffectBinding(envelope.body, descriptor));
    }
  }

  if (operation.data_grant_required) {
    if (!(envelope.authorization_refs?.length > 0)) failures.push("authorization_ref_required");
    let resources = [];
    try {
      resources = bodyIsValid ? operationResources(envelope, context, bodySchema) : [];
    } catch {
      failures.push("operation_resource_binding_invalid");
    }
    if (resources.some((resource) => !resource.retrieval_uri)) failures.push("resource_uri_missing");
    let coveringGrant = false;
    for (const grantRef of envelope.authorization_refs ?? []) {
      const grant = resolve(context.dataGrantsByRef, objectRefKey(grantRef));
      if (!grant) {
        failures.push("authorization_grant_unresolved");
        continue;
      }
      if (!sameObjectRef(grantRef, objectRefFor(grant, schemaForObject(grant, context.schemasByObjectId)))) {
        failures.push("authorization_grant_ref_mismatch");
      }
      failures.push(...validateSignedObject(grant, context).map((code) => `grant_${code}`));
      const grantFailures = validateDataGrant(grant, {
        ...context,
        grantRef,
        principalId: envelope.principal_id,
        recipient: envelope.sender.actor_id,
        purpose: operation.grant_purpose,
        use: operation.grant_use,
        resources
      });
      if (grantFailures.length === 0) coveringGrant = true;
      else failures.push(...grantFailures);
    }
    if (!coveringGrant) failures.push("operation_not_covered_by_grant");
  } else if ((envelope.authorization_refs?.length ?? 0) > 0) {
    failures.push("authorization_ref_unexpected");
  }

  if (operation.authorization_requirement.includes("principal_signature")) {
    const bodyKey = resolve(context.keyResolver, envelope.body?.principal_signature?.key_id);
    if (!bodyKey || bodyKey.controller !== envelope.principal_id) failures.push("principal_signer_mismatch");
  }
  return unique(failures);
}

export function acceptEnvelopeOperation(envelope, context = {}) {
  const failures = validateEnvelopeOperation(envelope, context);
  if (failures.length) return { accepted: false, failures };
  context.usedNonces?.add(envelope.nonce);
  if (envelope.idempotency_key) {
    context.idempotencyRecords.set(
      `${context.authorityNamespace}|${envelope.idempotency_key}`,
      envelope.operation_fingerprint
    );
  }
  return { accepted: true, failures: [] };
}

function continuationResources(bundle) {
  const resources = [];
  const add = (entry, resourceKind) => resources.push({ ...entry, resource_kind: resourceKind, field_paths: [""] });
  add(bundle.recipient_runtime_binding, "runtime_binding");
  add(bundle.schema_bundle, "schema_bundle");
  add(bundle.object_service_manifest, "service_manifest");
  for (const entry of bundle.items) add(entry, "object");
  for (const entry of bundle.current_intent_control_heads) add(entry, "control_head");
  for (const entry of bundle.current_deal_heads) add(entry, "control_head");
  for (const entry of bundle.current_action_reservation_service_refs) add(entry, "service_endpoint");
  for (const entry of bundle.current_grant_status_and_revocation_refs) add(entry, "grant_head");
  for (const entry of bundle.unresolved_unknown_refs) add(entry, "object");
  return resources;
}

export function continuationReservationKey(authorization) {
  const reservation = authorization?.disclosure_reservation ?? {};
  return `${reservation.ledger_namespace}|${reservation.reservation_id}`;
}

export function validateContinuationBinding(bundle, authorization, context = {}) {
  const failures = [
    ...validateSignedObject(bundle, context).map((code) => `bundle_${code}`),
    ...validateSignedObject(authorization, context).map((code) => `authorization_${code}`)
  ];
  if (bundle.principal_id !== authorization.principal_id) failures.push("principal_mismatch");
  const authorizationKey = resolve(context.keyResolver, authorization?.principal_signature?.key_id);
  if (!authorizationKey || authorizationKey.controller !== authorization?.principal_id) {
    failures.push("authorization_principal_signer_mismatch");
  }
  if (bundle.bundle_hash !== authorization.bundle_hash) failures.push("bundle_hash_mismatch");
  if (!currentAt(context.now, bundle?.issued_at, bundle?.expires_at)) failures.push("continuation_bundle_not_current");
  if (instant(authorization?.expires_at) > instant(bundle?.expires_at)) failures.push("continuation_authorization_exceeds_bundle");
  if (!sameObjectRef(bundle.recipient_runtime_binding.ref, authorization.recipient_runtime_binding_ref)) {
    failures.push("runtime_binding_ref_mismatch");
  }
  if (bundle.recipient_runtime_binding.ref.object_hash !== authorization.recipient_runtime_binding_hash) {
    failures.push("runtime_binding_hash_mismatch");
  }
  if (authorization.delivery_envelope_hash !== context.deliveryEnvelopeHash) failures.push("delivery_envelope_hash_mismatch");

  const runtime = context.runtimeBinding;
  if (!runtime) failures.push("runtime_binding_unresolved");
  else {
    failures.push(...validateRuntimeBinding(runtime, context));
    const runtimeSchema = schemaForObject(runtime, context.schemasByObjectId);
    try {
      if (!sameObjectRef(bundle.recipient_runtime_binding.ref, objectRefFor(runtime, runtimeSchema))) failures.push("runtime_binding_object_mismatch");
    } catch {
      failures.push("runtime_binding_object_invalid");
    }
    if (authorization.recipient_actor_id !== runtime.agent_identity.runtime_instance_key_id) failures.push("recipient_actor_mismatch");
  }
  if (authorization.disclosure_reservation?.principal_revocation_nonce !== context.principalRevocationNonce) {
    failures.push("principal_revocation_nonce_mismatch");
  }

  const usedGrantRefs = new Map();
  let resources = [];
  try {
    resources = continuationResources(bundle);
  } catch {
    failures.push("continuation_resource_graph_invalid");
  }
  for (const resource of resources) {
    if (resource.data_grant_ref === null) {
      if (!["schema_bundle", "service_manifest"].includes(resource.resource_kind)) failures.push("private_resource_without_grant");
      const expected = resolve(context.publicRefsByRef, objectRefKey(resource.ref));
      if (!expected || expected !== resource.retrieval_uri) failures.push("public_resource_binding_mismatch");
      continue;
    }
    const grantKey = objectRefKey(resource.data_grant_ref);
    usedGrantRefs.set(grantKey, resource.data_grant_ref);
    const grant = resolve(context.dataGrantsByRef, grantKey);
    if (!grant) {
      failures.push("data_grant_unresolved");
      continue;
    }
    const grantSchema = schemaForObject(grant, context.schemasByObjectId);
    try {
      if (!sameObjectRef(resource.data_grant_ref, objectRefFor(grant, grantSchema))) failures.push("data_grant_ref_mismatch");
    } catch {
      failures.push("data_grant_ref_invalid");
    }
    failures.push(...validateSignedObject(grant, context).map((code) => `grant_${code}`));
    failures.push(
      ...validateDataGrant(grant, {
        ...context,
        grantRef: resource.data_grant_ref,
        principalId: bundle.principal_id,
        recipient: authorization.recipient_actor_id,
        purpose: "agent_continuation",
        use: "read_local",
        resources: [resource]
      })
    );
    if (grant.disclosure_ledger_namespace !== authorization.disclosure_reservation?.ledger_namespace) {
      failures.push("grant_disclosure_ledger_mismatch");
    }
  }
  const authorizedGrantKeys = new Set((authorization.data_grant_refs ?? []).map(objectRefKey));
  if (
    authorizedGrantKeys.size !== usedGrantRefs.size ||
    [...authorizedGrantKeys].some((key) => !usedGrantRefs.has(key))
  ) {
    failures.push("data_grant_graph_mismatch");
  }

  const reservation = resolve(context.disclosureLedger, continuationReservationKey(authorization));
  if (!reservation) failures.push("disclosure_reservation_missing");
  else {
    if (reservation.status !== "active") failures.push("disclosure_reservation_consumed");
    if (reservation.fencing_token !== authorization.disclosure_reservation.fencing_token) failures.push("disclosure_fencing_token_mismatch");
    if (reservation.single_use_nonce !== authorization.disclosure_reservation.single_use_nonce) failures.push("disclosure_nonce_mismatch");
    if (reservation.authorization_hash !== authorization.authorization_hash) failures.push("disclosure_authorization_hash_mismatch");
    if (reservation.bundle_hash !== bundle.bundle_hash) failures.push("disclosure_bundle_hash_mismatch");
    if (reservation.runtime_binding_hash !== authorization.recipient_runtime_binding_hash) failures.push("disclosure_runtime_hash_mismatch");
    if (reservation.delivery_envelope_hash !== authorization.delivery_envelope_hash) failures.push("disclosure_delivery_hash_mismatch");
    if (reservation.principal_revocation_nonce !== authorization.disclosure_reservation.principal_revocation_nonce) {
      failures.push("disclosure_revocation_nonce_mismatch");
    }
    if (reservation.expires_at !== authorization.expires_at || !currentAt(context.now, authorization.issued_at, reservation.expires_at)) {
      failures.push("disclosure_reservation_not_current");
    }
  }
  return unique(failures);
}

export function consumeContinuationDisclosure(bundle, authorization, context = {}) {
  const failures = validateContinuationBinding(bundle, authorization, context);
  if (failures.length) return { consumed: false, failures };
  const key = continuationReservationKey(authorization);
  const reservation = resolve(context.disclosureLedger, key);
  context.disclosureLedger.set(key, {
    ...reservation,
    status: "consumed",
    consumed_at: context.now
  });
  for (const grantRef of authorization.data_grant_refs) {
    const grantKey = objectRefKey(grantRef);
    const state = resolve(context.grantStatesByRef, grantKey);
    context.grantStatesByRef.set(grantKey, {
      ...state,
      remaining_disclosures: state.remaining_disclosures - 1
    });
  }
  return { consumed: true, failures: [] };
}

function amountMap(proposal) {
  return Object.fromEntries((proposal.amounts ?? []).map(({ role, money }) => [role, money]));
}

export function validateProposalEffectBinding(proposal, descriptor) {
  const effect = descriptor?.effect_semantics;
  const failures = [];
  if (!sameObjectRef(proposal.effect_descriptor_ref, {
    schema: descriptor?.schema,
    object_id: descriptor?.effect_descriptor_id,
    object_hash: descriptor?.descriptor_hash
  })) failures.push("effect_descriptor_ref_mismatch");
  if (proposal.effect_id !== descriptor?.effect_id) failures.push("effect_id_mismatch");
  if (proposal.principal_id !== effect?.principal_id) failures.push("effect_principal_mismatch");
  if (proposal.capability !== effect?.capability) failures.push("effect_capability_mismatch");
  if (proposal.target !== descriptor?.executor_target) failures.push("effect_target_mismatch");
  if (proposal.effect_operation_kind !== effect?.operation_kind) failures.push("effect_operation_kind_mismatch");
  if (proposal.effect_provider_id !== effect?.provider_id) failures.push("effect_provider_mismatch");
  if (proposal.ultimate_effect_recipient !== effect?.ultimate_receiver?.canonical_identity && !(proposal.ultimate_effect_recipient === null && effect?.ultimate_receiver === null)) {
    failures.push("effect_recipient_mismatch");
  }
  if (proposal.ultimate_effect_account_commitment !== effect?.ultimate_receiver?.account_commitment && !(proposal.ultimate_effect_account_commitment === null && effect?.ultimate_receiver === null)) {
    failures.push("effect_account_commitment_mismatch");
  }
  if (proposal.deal_id !== effect?.deal_id) failures.push("effect_deal_mismatch");
  if (proposal.terms_or_cart_hash !== effect?.closed_terms_or_cart_hash) failures.push("effect_terms_mismatch");
  if (proposal.rail !== effect?.rail) failures.push("effect_rail_mismatch");
  if (!canonicalEqual(proposal.copy_ids, effect?.copy_ids)) failures.push("effect_copy_ids_mismatch");
  if (!canonicalEqual(amountMap(proposal), effect?.amounts_by_role)) failures.push("effect_amounts_mismatch");
  return unique(failures);
}

export function validateResolvedObjectResponse(response, context = {}) {
  const failures = [];
  const validate = context.ajv?.getSchema(
    "https://cairn.cards/protocol/schemas/v0.1/operation-bodies.schema.json#/$defs/resolvedObjectResponse"
  );
  if (!validate || !validate(response)) failures.push("resolved_response_schema_invalid");
  if (!sameObjectRef(response?.ref, context.expectedRef)) failures.push("resolved_ref_mismatch");
  if (response?.retrieval_uri !== context.expectedUri) failures.push("resolved_uri_mismatch");
  const schema = schemaForObject(response?.object, context.schemasByObjectId);
  if (!schema) failures.push("resolved_object_schema_unknown");
  else {
    const objectFailures = validateSignedObject(response.object, context);
    failures.push(...objectFailures.map((code) => `resolved_${code}`));
    let exactRef = false;
    try {
      exactRef = sameObjectRef(response.ref, objectRefFor(response.object, schema));
    } catch {
      exactRef = false;
    }
    if (objectFailures.length || !exactRef) {
      failures.push("resolved_object_binding_mismatch");
    }
  }
  return unique(failures);
}

export function validatePreparationReceipt(receipt, context = {}) {
  const { action, proposal, expectedAgentIdentity } = context;
  const failures = [
    ...validateSignedObject(receipt, context).map((code) => `receipt_${code}`),
    ...validateSignedObject(action, context).map((code) => `action_${code}`),
    ...validateSignedObject(proposal, context).map((code) => `proposal_${code}`)
  ];
  if (!sameObjectRef(receipt?.action_ref, {
    schema: action?.schema,
    object_id: action?.action_id,
    object_hash: action?.action_hash
  })) failures.push("receipt_action_ref_mismatch");
  if (!sameObjectRef(receipt?.action_proposal_ref, {
    schema: proposal?.schema,
    object_id: proposal?.action_proposal_id,
    object_hash: proposal?.action_proposal_hash
  })) failures.push("receipt_proposal_ref_mismatch");
  if (!sameObjectRef(action?.action_proposal_ref, receipt?.action_proposal_ref)) failures.push("action_proposal_ref_mismatch");
  if (receipt?.prepared_for_principal !== action?.principal_id || action?.principal_id !== proposal?.principal_id) failures.push("preparation_principal_mismatch");
  if (!canonicalEqual(receipt?.prepared_by_agent, proposal?.agent_identity) || !canonicalEqual(receipt?.prepared_by_agent, expectedAgentIdentity)) {
    failures.push("preparation_agent_mismatch");
  }
  if (receipt?.state_before !== "draft" || receipt?.state_after !== "prepared" || receipt?.external_effect !== false) failures.push("preparation_state_mismatch");
  if (action?.current_state !== "draft" || action?.state_version !== 0) failures.push("action_not_draft");
  if (action?.authorization_ref !== null || action?.reservation_refs?.length || action?.gate_result_ref !== null) failures.push("action_authority_present");
  if (action?.capability !== proposal?.capability || action?.effect_id !== proposal?.effect_id) failures.push("action_proposal_semantics_mismatch");
  const issuerKey = resolve(context.keyResolver, receipt?.issuer_signature?.key_id);
  if (!issuerKey || issuerKey.controller !== receipt?.issuer) failures.push("receipt_issuer_signer_mismatch");
  return unique(failures);
}
