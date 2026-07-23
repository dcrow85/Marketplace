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

const PROTOCOL_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/;

function isProtocolTimestamp(value) {
  if (typeof value !== "string") return false;
  const match = PROTOCOL_TIMESTAMP.exec(value);
  if (!match) return false;
  const parsed = instant(value);
  if (!Number.isFinite(parsed)) return false;
  const date = new Date(parsed);
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3]) &&
    date.getUTCHours() === Number(match[4]) &&
    date.getUTCMinutes() === Number(match[5]) &&
    date.getUTCSeconds() === Number(match[6]);
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

function validateKeyRecord(key, expectedKeyId, now, historicalAt = null) {
  const failures = [];
  const required = ["key_id", "key_type", "public_key", "controller", "status", "not_before", "expires_at", "revocation_time"];
  if (key === null || typeof key !== "object" || Array.isArray(key)) return ["signing_key_record_invalid"];
  if (required.some((field) => !Object.hasOwn(key, field))) failures.push("signing_key_record_incomplete");
  if (key.key_id !== expectedKeyId) failures.push("signing_key_id_mismatch");
  if (key.key_type !== "Ed25519") failures.push("signing_key_type_mismatch");
  if (typeof key.controller !== "string" || key.controller.length === 0) failures.push("signing_key_controller_missing");
  if (key.status !== "active" && key.status !== "revoked") failures.push("signing_key_status_invalid");
  if (historicalAt === null && key.status !== "active") failures.push("signing_key_inactive");
  if (historicalAt !== null && key.status === "revoked" && key.revocation_time === null) {
    failures.push("signing_key_history_incomplete");
  }
  if (
    !isProtocolTimestamp(key.not_before) ||
    !isProtocolTimestamp(key.expires_at) ||
    instant(key.not_before) >= instant(key.expires_at) ||
    (key.revocation_time !== null && !isProtocolTimestamp(key.revocation_time))
  ) failures.push("signing_key_validity_invalid");
  const evaluationTime = historicalAt ?? now;
  if (!currentAt(evaluationTime, key.not_before, key.expires_at)) {
    failures.push(historicalAt === null ? "signing_key_not_current" : "signing_key_not_valid_at_signature");
  }
  if (key.revocation_time !== null && nowInstant(evaluationTime) >= instant(key.revocation_time)) {
    failures.push(historicalAt === null ? "signing_key_revoked" : "signing_key_revoked_at_signature");
  }
  return failures;
}

function validateSignedObjectUnsafe(object, {
  ajv,
  schemasByObjectId,
  keyResolver,
  now,
  historicalKeyProof = false,
  historicalObjectLifecycle = false
} = {}) {
  const failures = [];
  const schema = schemaForObject(object, schemasByObjectId);
  if (!schema) return ["object_schema_unknown"];
  const validate = ajv?.getSchema(schema.$id);
  if (!validate || !validate(object)) return ["object_schema_invalid"];
  try {
    failures.push(...verifyObjectBindings(object, schema));
  } catch {
    failures.push("object_binding_invalid");
  }
  if (object.schema === "cairn.scoped_projection.v0.1") {
    const disclosedPaths = object.disclosed_fields;
    const payloadPaths = object.payload?.entries?.map(({ output_path }) => output_path);
    if (!canonicalEqual(disclosedPaths, payloadPaths)) failures.push("projection_payload_paths_mismatch");
    const overlaps = (left, right) =>
      left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
    if (object.redacted_fields?.some((redacted) =>
      disclosedPaths?.some((disclosed) => overlaps(redacted, disclosed))
    )) failures.push("projection_redaction_overlap");
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
    failures.push(...validateKeyRecord(
      key,
      signature.key_id,
      now,
      historicalKeyProof === true ? signature.signed_at : null
    ));
    if (!currentAt(signature.signed_at, key.not_before, key.expires_at)) {
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
  const objectStart = object?.issued_at ?? object?.created_at ?? object?.derived_at ?? null;
  if (typeof objectStart === "string" && instant(objectStart) > nowInstant(now)) failures.push("object_not_yet_valid");
  if (
    historicalObjectLifecycle !== true &&
    typeof object?.expires_at === "string" &&
    nowInstant(now) >= instant(object.expires_at)
  ) failures.push("object_expired");
  return unique(failures);
}

export function validateSignedObject(object, context = {}) {
  try {
    return validateSignedObjectUnsafe(object, context);
  } catch {
    return ["signed_object_malformed"];
  }
}

function validateRuntimeBindingUnsafe(binding, context = {}) {
  const failures = validateSignedObject(binding, context);
  if (failures.includes("object_schema_invalid") || failures.includes("object_schema_unknown")) {
    return unique([...failures, "runtime_binding_malformed"]);
  }
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
    failures.push(...validateKeyRecord(runtimeKey, binding?.runtime_public_key?.key_id, context.now));
    if (runtimeKey.public_key !== binding?.runtime_public_key?.public_key) failures.push("runtime_public_key_material_mismatch");
    if (runtimeKey.controller !== binding?.agent_identity?.agent_provider_id) {
      failures.push("runtime_key_controller_mismatch");
    }
  }
  const providerKey = resolve(context.keyResolver, binding?.provider_signature?.key_id);
  if (!providerKey || providerKey.controller !== binding?.agent_identity?.agent_provider_id) {
    failures.push("runtime_provider_signer_mismatch");
  }
  return unique(failures);
}

export function validateRuntimeBinding(binding, context = {}) {
  try {
    return validateRuntimeBindingUnsafe(binding, context);
  } catch {
    return ["runtime_binding_malformed"];
  }
}

function resourceCovered(scope, resource) {
  if (!scope || !resource || !Array.isArray(scope.field_paths) || !Array.isArray(resource.field_paths)) return false;
  if (scope.field_paths.length === 0 || resource.field_paths.length === 0) return false;
  if (scope.resource_kind !== resource.resource_kind) return false;
  if (!sameObjectRef(scope.ref, resource.ref) && !(scope.ref === null && resource.ref === null)) return false;
  if (scope.retrieval_uri !== resource.retrieval_uri) return false;
  return resource.field_paths.every((field) => scope.field_paths.includes("") || scope.field_paths.includes(field));
}

function validateDataGrantUnsafe(grant, context = {}) {
  const failures = [];
  if (grant?.principal_id !== context.principalId) failures.push("grant_principal_mismatch");
  if (grant?.recipient !== context.recipient) failures.push("grant_recipient_mismatch");
  if (grant?.purpose !== context.purpose) failures.push("grant_purpose_mismatch");
  const requiredUses = context.requiredUses ?? [context.use];
  if (
    !Array.isArray(requiredUses) ||
    requiredUses.length === 0 ||
    requiredUses.some((use) => typeof use !== "string" || use.length === 0)
  ) {
    failures.push("grant_required_uses_invalid");
  } else if (requiredUses.some((use) => !grant?.uses?.includes(use))) {
    failures.push("grant_use_missing");
  }
  if (!grant?.audience?.includes(context.recipient)) failures.push("grant_audience_mismatch");
  if (!Array.isArray(grant?.audience) || grant.audience.length === 0) failures.push("grant_audience_empty");
  if (!Array.isArray(grant?.resource_scopes) || grant.resource_scopes.length === 0) failures.push("grant_resource_scope_empty");
  else if (grant.resource_scopes.some((scope) => !Array.isArray(scope?.field_paths) || scope.field_paths.length === 0)) {
    failures.push("grant_field_scope_empty");
  }
  if (!Number.isSafeInteger(grant?.maximum_disclosures) || grant.maximum_disclosures < 1) failures.push("grant_disclosures_exhausted");
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
    if (
      !Number.isSafeInteger(state.revocation_nonce) ||
      !Number.isSafeInteger(state.remaining_disclosures) ||
      state.remaining_disclosures < 0
    ) failures.push("grant_state_invalid");
    if (state.status !== "active") failures.push("grant_revoked_or_inactive");
    if (state.revocation_nonce !== grant.revocation_nonce) failures.push("grant_revocation_nonce_mismatch");
    if (!Number.isSafeInteger(state.remaining_disclosures) || state.remaining_disclosures < 1) failures.push("grant_disclosures_exhausted");
    if (Number.isSafeInteger(state.remaining_disclosures) && state.remaining_disclosures > grant.maximum_disclosures) failures.push("grant_disclosure_state_invalid");
  }
  for (const resource of context.resources ?? []) {
    if (!grant?.resource_scopes?.some((scope) => resourceCovered(scope, resource))) {
      failures.push("grant_resource_scope_mismatch");
    }
  }
  return unique(failures);
}

export function validateDataGrant(grant, context = {}) {
  try {
    return validateDataGrantUnsafe(grant, context);
  } catch {
    return ["data_grant_malformed"];
  }
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
    sender_runtime_key_id: envelope.sender.runtime_key_id,
    audience: sortedStrings(envelope.audience),
    subject_refs: sortedRefs(envelope.subject_refs),
    authorization_refs: sortedRefs(envelope.authorization_refs),
    body_schema: envelope.body_schema,
    body_hash: envelope.body_hash,
    critical_extensions: sortedStrings(envelope.critical_extensions)
  });
}

const OPERATION_BODIES_ID = "https://cairn.cards/protocol/schemas/v0.1/operation-bodies.schema.json#/$defs/";

function idempotencyRecordIsValid(record, context) {
  const validate = context.ajv?.getSchema(`${OPERATION_BODIES_ID}idempotencyRecord`);
  return Boolean(validate?.(record));
}

export function idempotencyRecordKey(authorityNamespace, idempotencyKey) {
  if (typeof authorityNamespace !== "string" || authorityNamespace.length === 0) throw new TypeError("authority namespace required");
  if (typeof idempotencyKey !== "string" || idempotencyKey.length === 0) throw new TypeError("idempotency key required");
  return canonicalText([authorityNamespace, idempotencyKey]);
}

export function validateCapabilitiesResponse(response, context = {}) {
  try {
    const validate = context.ajv?.getSchema(`${OPERATION_BODIES_ID}capabilitiesResponse`);
    if (!validate || !validate(response)) return ["capabilities_response_schema_invalid"];
    const operations = context.registry?.operations?.map(({ name }) => name);
    if (!operations || !canonicalEqual(response.operations, operations)) return ["capabilities_operation_surface_mismatch"];
    if (!context.bundleHash || response.bundle_hash !== context.bundleHash) return ["capabilities_bundle_hash_mismatch"];
    return [];
  } catch {
    return ["capabilities_response_malformed"];
  }
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
      const refs = [...(envelope.body.resource_refs ?? [])];
      if (envelope.body.effect_descriptor_ref && !refs.some((ref) => sameObjectRef(ref, envelope.body.effect_descriptor_ref))) {
        refs.push(envelope.body.effect_descriptor_ref);
      }
      for (const ref of refs) {
        resources.push({ resource_kind: "object", ref, retrieval_uri: resourceUri(ref, context), field_paths: [""] });
      }
    }
  } else if (envelope.body?.ref && envelope.body?.retrieval_uri) {
    resources.push({ resource_kind: "object", ref: envelope.body.ref, retrieval_uri: envelope.body.retrieval_uri, field_paths: [""] });
  }
  return resources;
}

function validateEnvelopeTransportUnsafe(envelope, context = {}) {
  const failures = validateSignedObject(envelope, context);
  if (failures.includes("object_schema_invalid") || failures.includes("object_schema_unknown") || failures.includes("signed_object_malformed")) {
    return { failures: unique([...failures, "envelope_malformed"]), operation: null, bodySchema: null };
  }
  const operation = context.registry?.operations?.find(({ name }) => name === envelope?.message_type);
  if (!operation) return { failures: unique([...failures, "operation_unknown"]), operation: null, bodySchema: null };
  if (envelope.body_schema !== operation.request_schema) failures.push("body_schema_mismatch");
  const bodyValidate = context.ajv?.getSchema(operation.request_schema);
  const bodyIsValid = Boolean(bodyValidate?.(envelope.body));
  if (!bodyIsValid) failures.push("body_schema_invalid");
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
  if (operation.object_store_mutating && !envelope.idempotency_key) failures.push("idempotency_key_required");
  if (operation.object_store_mutating && !context.authorityNamespace) failures.push("authority_namespace_required");
  if (operation.object_store_mutating && !context.idempotencyRecords?.get) failures.push("idempotency_state_required");
  if ((envelope.critical_extensions?.length ?? 0) > 0) failures.push("critical_extension_unknown");

  if (envelope.sender?.runtime_key_id === null) {
    const senderKey = resolve(context.keyResolver, envelope.signature?.key_id);
    if (context.runtimeBinding) failures.push("runtime_binding_unexpected");
    if (!senderKey || senderKey.controller !== envelope.sender?.actor_id) failures.push("direct_sender_signer_mismatch");
    if (envelope.principal_id !== null && envelope.sender?.actor_id !== envelope.principal_id) {
      failures.push("direct_sender_principal_mismatch");
    }
  } else if (envelope.sender?.runtime_key_id !== envelope.signature?.key_id) {
    failures.push("envelope_signer_runtime_key_mismatch");
  } else if (!context.runtimeBinding) {
    failures.push("runtime_binding_required");
  } else {
    failures.push(...validateRuntimeBinding(context.runtimeBinding, context));
    if (context.runtimeBinding.agent_identity?.runtime_instance_key_id !== envelope.sender?.runtime_key_id) {
      failures.push("runtime_binding_key_mismatch");
    }
    if (context.runtimeBinding.agent_identity?.agent_provider_id !== envelope.sender?.actor_id) {
      failures.push("runtime_binding_sender_mismatch");
    }
  }
  return {
    failures: unique(failures),
    operation,
    bodySchema: schemaForObject(envelope.body, context.schemasByObjectId),
    bodyIsValid
  };
}

function validateEnvelopeOperationUnsafe(envelope, context = {}) {
  const transport = validateEnvelopeTransportUnsafe(envelope, context);
  const failures = [...transport.failures];
  const { operation, bodySchema, bodyIsValid } = transport;
  if (!operation || !bodyIsValid || failures.includes("body_schema_mismatch")) return unique(failures);
  if (bodySchema) failures.push(...validateSignedObject(envelope.body, context).map((code) => `body_${code}`));
  const idempotencyStateKey = envelope.idempotency_key && context.authorityNamespace
    ? idempotencyRecordKey(context.authorityNamespace, envelope.idempotency_key)
    : null;
  const priorRecord = idempotencyStateKey === null
    ? undefined
    : context.idempotencyRecords?.get(idempotencyStateKey);
  if (priorRecord !== undefined) {
    if (!idempotencyRecordIsValid(priorRecord, context)) failures.push("idempotency_record_invalid");
    else if (priorRecord.fingerprint !== envelope.operation_fingerprint) failures.push("idempotency_conflict");
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
  if (operation.name === "projection.get") {
    const projection = resolve(context.objectsByRef, objectRefKey(envelope.body.ref));
    const recipient = envelope.sender.runtime_key_id ?? envelope.sender.actor_id;
    if (!projection) {
      failures.push("projection_unresolved");
    } else {
      failures.push(...validateSignedObject(projection, context).map((code) => `projection_${code}`));
      let exactRef = false;
      try {
        const projectionSchema = schemaForObject(projection, context.schemasByObjectId);
        exactRef = Boolean(projectionSchema && sameObjectRef(envelope.body.ref, objectRefFor(projection, projectionSchema)));
      } catch {
        exactRef = false;
      }
      if (!exactRef || projection.schema !== "cairn.scoped_projection.v0.1") failures.push("projection_ref_mismatch");
      if (projection.principal_id !== envelope.principal_id) failures.push("projection_principal_mismatch");
      if (!projection.audience?.includes(recipient)) failures.push("projection_audience_mismatch");
      if (projection.purpose !== envelope.body.declared_purpose) failures.push("projection_purpose_mismatch");
      if (!projection.data_uses?.includes("read_local")) failures.push("projection_read_use_missing");
      if (!projection.data_uses?.includes(envelope.body.intended_use)) failures.push("projection_intended_use_missing");
    }
  }
  if (operation.name === "object.resolve") {
    const object = resolve(context.objectsByRef, objectRefKey(envelope.body.ref));
    if (object?.schema === "cairn.scoped_projection.v0.1") failures.push("projection_specialized_operation_required");
  }
  if (envelope.message_type === "action.prepare") {
    const identity = envelope.body?.agent_identity;
    if (identity === null) {
      const proposalKey = resolve(context.keyResolver, envelope.body?.agent_signature?.key_id);
      if (envelope.sender?.runtime_key_id !== null || context.runtimeBinding) failures.push("direct_proposal_runtime_present");
      if (!proposalKey || proposalKey.controller !== envelope.principal_id) failures.push("direct_proposal_signer_mismatch");
    } else {
      if (!canonicalEqual(identity, context.runtimeBinding?.agent_identity)) failures.push("proposal_runtime_identity_mismatch");
      if (envelope.body?.agent_signature?.key_id !== envelope.sender?.runtime_key_id) failures.push("proposal_signer_runtime_key_mismatch");
      const proposalKey = resolve(context.keyResolver, envelope.body?.agent_signature?.key_id);
      if (!proposalKey || proposalKey.controller !== identity?.agent_provider_id) failures.push("proposal_signer_controller_mismatch");
    }
    const descriptorRef = envelope.body?.effect_descriptor_ref;
    if (!envelope.body?.resource_refs?.some((ref) => sameObjectRef(ref, descriptorRef))) {
      failures.push("effect_descriptor_resource_ref_missing");
    }
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
      const grantSchema = schemaForObject(grant, context.schemasByObjectId);
      if (!grantSchema) {
        failures.push("authorization_grant_schema_unknown");
        continue;
      }
      try {
        if (!sameObjectRef(grantRef, objectRefFor(grant, grantSchema))) {
          failures.push("authorization_grant_ref_mismatch");
        }
      } catch {
        failures.push("authorization_grant_ref_invalid");
      }
      failures.push(...validateSignedObject(grant, context).map((code) => `grant_${code}`));
      const grantFailures = validateDataGrant(grant, {
        ...context,
        grantRef,
        principalId: envelope.principal_id,
        recipient: envelope.sender.runtime_key_id ?? envelope.sender.actor_id,
        purpose: operation.grant_purpose,
        use: operation.grant_use,
        requiredUses: operation.name === "projection.get"
          ? [...new Set([operation.grant_use, envelope.body.intended_use])]
          : [operation.grant_use],
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

export function validateEnvelopeOperation(envelope, context = {}) {
  try {
    return validateEnvelopeOperationUnsafe(envelope, context);
  } catch {
    return ["envelope_operation_malformed"];
  }
}

function runPreflight(preflight) {
  if (preflight === null) return [];
  if (typeof preflight !== "function") return ["operation_preflight_invalid"];
  let failures;
  try {
    failures = preflight();
  } catch {
    return ["operation_preflight_unavailable"];
  }
  if (!Array.isArray(failures) || failures.some((code) => typeof code !== "string" || code.length === 0)) {
    return ["operation_preflight_invalid"];
  }
  return unique(failures);
}

export function acceptEnvelopeOperation(
  envelope,
  context = {},
  resultRef = null,
  workPreflight = null,
  accessPreflight = null
) {
  try {
    const transport = validateEnvelopeTransportUnsafe(envelope, context);
    if (transport.failures.length) return { accepted: false, failures: transport.failures };
    if (envelope.idempotency_key) {
      const key = idempotencyRecordKey(context.authorityNamespace, envelope.idempotency_key);
      const prior = context.idempotencyRecords.get(key);
      if (prior !== undefined) {
        if (!idempotencyRecordIsValid(prior, context)) {
          return { accepted: false, failures: ["idempotency_record_invalid"] };
        }
        if (prior.fingerprint !== envelope.operation_fingerprint) {
          return { accepted: false, failures: ["idempotency_conflict"] };
        }
        context.usedNonces.add(envelope.nonce);
        return {
          accepted: true,
          replayed: true,
          result_ref: prior.result_ref,
          failures: []
        };
      }
    }
    const accessPreflightFailures = runPreflight(accessPreflight);
    if (accessPreflightFailures.length) return { accepted: false, failures: accessPreflightFailures };
    const failures = validateEnvelopeOperation(envelope, context);
    if (failures.length) return { accepted: false, failures };
    const workPreflightFailures = runPreflight(workPreflight);
    if (workPreflightFailures.length) return { accepted: false, failures: workPreflightFailures };
    if (envelope.idempotency_key) {
      let resolvedResultRef;
      try {
        resolvedResultRef = typeof resultRef === "function" ? resultRef() : resultRef;
      } catch {
        return { accepted: false, failures: ["operation_result_unavailable"] };
      }
      const record = { fingerprint: envelope.operation_fingerprint, result_ref: resolvedResultRef };
      if (!idempotencyRecordIsValid(record, context)) {
        return { accepted: false, failures: ["idempotency_result_ref_required"] };
      }
      const key = idempotencyRecordKey(context.authorityNamespace, envelope.idempotency_key);
      context.idempotencyRecords.set(key, record);
      resultRef = resolvedResultRef;
    }
    context.usedNonces.add(envelope.nonce);
    return { accepted: true, replayed: false, result_ref: resultRef, failures: [] };
  } catch {
    return {
      accepted: false,
      failures: ["envelope_acceptance_malformed"]
    };
  }
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

function validateContinuationBindingUnsafe(bundle, authorization, context = {}) {
  const bundleFailures = validateSignedObject(bundle, context);
  const authorizationFailures = validateSignedObject(authorization, context);
  const failures = [
    ...bundleFailures.map((code) => `bundle_${code}`),
    ...authorizationFailures.map((code) => `authorization_${code}`)
  ];
  if (
    bundleFailures.some((code) => ["object_schema_invalid", "object_schema_unknown", "signed_object_malformed"].includes(code)) ||
    authorizationFailures.some((code) => ["object_schema_invalid", "object_schema_unknown", "signed_object_malformed"].includes(code))
  ) return unique([...failures, "continuation_input_malformed"]);
  if (bundle.principal_id !== authorization.principal_id) failures.push("principal_mismatch");
  const authorizationKey = resolve(context.keyResolver, authorization?.principal_signature?.key_id);
  if (!authorizationKey || authorizationKey.controller !== authorization?.principal_id) {
    failures.push("authorization_principal_signer_mismatch");
  }
  const bundleSchema = schemaForObject(bundle, context.schemasByObjectId);
  const authorizationSchema = schemaForObject(authorization, context.schemasByObjectId);
  let exactBundleRef;
  let exactAuthorizationRef;
  try {
    exactBundleRef = objectRefFor(bundle, bundleSchema);
    exactAuthorizationRef = objectRefFor(authorization, authorizationSchema);
    if (!sameObjectRef(exactBundleRef, authorization.bundle_ref)) failures.push("bundle_ref_mismatch");
  } catch {
    failures.push("continuation_object_ref_invalid");
  }
  if (bundle.bundle_hash !== authorization.bundle_hash || authorization.bundle_ref.object_hash !== authorization.bundle_hash) {
    failures.push("bundle_hash_mismatch");
  }
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
    if (!grantSchema) {
      failures.push("data_grant_schema_unknown");
      continue;
    }
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
    const stateValidate = context.ajv?.getSchema(
      "https://cairn.cards/protocol/schemas/v0.1/continuation-disclosure-reservation-state.schema.json"
    );
    if (!stateValidate || !stateValidate(reservation)) {
      failures.push("disclosure_reservation_state_invalid");
      return unique(failures);
    }
    if (reservation.state !== "active") failures.push("disclosure_reservation_not_active");
    if (reservation.ledger_namespace !== authorization.disclosure_reservation.ledger_namespace) failures.push("disclosure_ledger_namespace_mismatch");
    if (reservation.reservation_id !== authorization.disclosure_reservation.reservation_id) failures.push("disclosure_reservation_id_mismatch");
    if (reservation.principal_id !== authorization.principal_id) failures.push("disclosure_principal_mismatch");
    if (reservation.fencing_token !== authorization.disclosure_reservation.fencing_token) failures.push("disclosure_fencing_token_mismatch");
    if (reservation.single_use_nonce !== authorization.disclosure_reservation.single_use_nonce) failures.push("disclosure_nonce_mismatch");
    if (!sameObjectRef(reservation.authorization_ref, exactAuthorizationRef)) failures.push("disclosure_authorization_ref_mismatch");
    if (reservation.authorization_hash !== authorization.authorization_hash) failures.push("disclosure_authorization_hash_mismatch");
    if (!sameObjectRef(reservation.bundle_ref, exactBundleRef)) failures.push("disclosure_bundle_ref_mismatch");
    if (reservation.bundle_hash !== bundle.bundle_hash) failures.push("disclosure_bundle_hash_mismatch");
    if (reservation.recipient_actor_id !== authorization.recipient_actor_id) failures.push("disclosure_recipient_mismatch");
    if (!sameObjectRef(reservation.runtime_binding_ref, authorization.recipient_runtime_binding_ref)) failures.push("disclosure_runtime_ref_mismatch");
    if (reservation.runtime_binding_hash !== authorization.recipient_runtime_binding_hash) failures.push("disclosure_runtime_hash_mismatch");
    if (!canonicalEqual(sortedRefs(reservation.data_grant_refs), sortedRefs(authorization.data_grant_refs))) failures.push("disclosure_grant_graph_mismatch");
    if (reservation.delivery_envelope_hash !== authorization.delivery_envelope_hash) failures.push("disclosure_delivery_hash_mismatch");
    if (reservation.principal_revocation_nonce !== authorization.disclosure_reservation.principal_revocation_nonce) {
      failures.push("disclosure_revocation_nonce_mismatch");
    }
    if (reservation.expires_at !== authorization.expires_at || !currentAt(context.now, authorization.issued_at, reservation.expires_at)) {
      failures.push("disclosure_reservation_not_current");
    }
    if (reservation.created_at !== authorization.issued_at || reservation.reserved_count !== 1) {
      failures.push("disclosure_reservation_terms_mismatch");
    }
  }
  return unique(failures);
}

export function validateContinuationBinding(bundle, authorization, context = {}) {
  try {
    return validateContinuationBindingUnsafe(bundle, authorization, context);
  } catch {
    return ["continuation_binding_malformed"];
  }
}

export function consumeContinuationDisclosure(bundle, authorization, context = {}) {
  try {
    const failures = validateContinuationBinding(bundle, authorization, context);
    if (failures.length) return { consumed: false, failures };
    const key = continuationReservationKey(authorization);
    const reservation = resolve(context.disclosureLedger, key);
    context.disclosureLedger.set(key, {
      ...reservation,
      state: "consumed",
      ledger_sequence: reservation.ledger_sequence + 1,
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
  } catch {
    return { consumed: false, failures: ["continuation_consumption_malformed"] };
  }
}

function amountMap(proposal) {
  return Object.fromEntries((proposal.amounts ?? []).map(({ role, money }) => [role, money]));
}

function validateProposalEffectBindingUnsafe(proposal, descriptor) {
  const effect = descriptor?.effect_semantics;
  const failures = [];
  if (!proposal || typeof proposal !== "object" || !descriptor || typeof descriptor !== "object" || !effect || typeof effect !== "object") {
    return ["proposal_effect_input_malformed"];
  }
  if (!Array.isArray(proposal.amounts) || proposal.amounts.some((item) => !item || typeof item !== "object")) {
    return ["proposal_effect_input_malformed"];
  }
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

export function validateProposalEffectBinding(proposal, descriptor) {
  try {
    return validateProposalEffectBindingUnsafe(proposal, descriptor);
  } catch {
    return ["proposal_effect_input_malformed"];
  }
}

function validateResolvedObjectResponseUnsafe(response, context = {}) {
  const failures = [];
  const validate = context.ajv?.getSchema(
    "https://cairn.cards/protocol/schemas/v0.1/operation-bodies.schema.json#/$defs/resolvedObjectResponse"
  );
  if (!validate || !validate(response)) return ["resolved_response_schema_invalid"];
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

export function validateResolvedObjectResponse(response, context = {}) {
  try {
    return validateResolvedObjectResponseUnsafe(response, context);
  } catch {
    return ["resolved_response_malformed"];
  }
}

function validatePreparationReceiptUnsafe(receipt, context = {}) {
  const { action, proposal, expectedAgentIdentity } = context;
  const receiptFailures = validateSignedObject(receipt, context);
  const actionFailures = validateSignedObject(action, context);
  const proposalFailures = validateSignedObject(proposal, context);
  const failures = [
    ...receiptFailures.map((code) => `receipt_${code}`),
    ...actionFailures.map((code) => `action_${code}`),
    ...proposalFailures.map((code) => `proposal_${code}`)
  ];
  if ([receiptFailures, actionFailures, proposalFailures].some((codes) =>
    codes.some((code) => ["object_schema_invalid", "object_schema_unknown", "signed_object_malformed"].includes(code)))) {
    return unique([...failures, "preparation_input_malformed"]);
  }
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
  if (!Object.hasOwn(context, "expectedAgentIdentity")) failures.push("expected_agent_identity_required");
  if (!canonicalEqual(receipt?.prepared_by_agent, proposal?.agent_identity) || !canonicalEqual(receipt?.prepared_by_agent, expectedAgentIdentity)) {
    failures.push("preparation_agent_mismatch");
  }
  const proposalKey = resolve(context.keyResolver, proposal?.agent_signature?.key_id);
  if (proposal?.agent_identity === null) {
    if (receipt?.prepared_by_agent !== null) failures.push("direct_preparation_agent_mismatch");
    if (!proposalKey || proposalKey.controller !== proposal?.principal_id) failures.push("direct_preparation_signer_mismatch");
  } else {
    if (proposal?.agent_signature?.key_id !== proposal?.agent_identity?.runtime_instance_key_id) {
      failures.push("preparation_agent_key_mismatch");
    }
    if (!proposalKey || proposalKey.controller !== proposal?.agent_identity?.agent_provider_id) {
      failures.push("preparation_agent_controller_mismatch");
    }
  }
  if (
    receipt?.preparation_status !== "recorded" ||
    receipt?.action_state !== "draft" ||
    receipt?.action_state_transition !== false ||
    receipt?.external_effect !== false
  ) failures.push("preparation_state_mismatch");
  if (action?.current_state !== "draft" || action?.state_version !== 0) failures.push("action_not_draft");
  if (action?.authorization_ref !== null || action?.reservation_refs?.length || action?.gate_result_ref !== null) failures.push("action_authority_present");
  if (
    action?.capability !== proposal?.capability ||
    action?.effect_id !== proposal?.effect_id ||
    action?.expected_deal_head_hash !== proposal?.expected_deal_head_hash
  ) failures.push("action_proposal_semantics_mismatch");
  const issuerKey = resolve(context.keyResolver, receipt?.issuer_signature?.key_id);
  if (!issuerKey || issuerKey.controller !== receipt?.issuer) failures.push("receipt_issuer_signer_mismatch");
  return unique(failures);
}

export function validatePreparationReceipt(receipt, context = {}) {
  try {
    return validatePreparationReceiptUnsafe(receipt, context);
  } catch {
    return ["preparation_input_malformed"];
  }
}
