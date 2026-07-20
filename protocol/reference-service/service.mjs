import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildBundle } from "../lib/bundle.mjs";
import { bindObjectHash, canonicalText, objectRefFor, objectRefKey, sameObjectRef, valueAtPointer } from "../lib/core.mjs";
import { EXACT_FOUNDATION_OPERATION_TUPLES, operationTuple } from "../lib/foundation-profile.mjs";
import { createAjv } from "../lib/schemas.mjs";
import {
  acceptEnvelopeOperation,
  validateCapabilitiesResponse,
  validatePreparationReceipt,
  validateResolvedObjectResponse,
  validateRuntimeBinding,
  validateSignedObject
} from "../lib/validation.mjs";
import { MemoryReferenceStores } from "./state.mjs";
import { signaturePlaceholder, ZERO_HASH } from "./signer.mjs";

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE_LINK = '<https://cairn.cards/protocol/envelope/0.1>; rel="profile"';
const LOADED_FOUNDATIONS = new WeakMap();

function schemaMap(sources, key) {
  return new Map(sources.schemas.map(({ document }) => [document[key], document]).filter(([id]) => id));
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const member of Object.values(value)) deepFreeze(member);
  return Object.freeze(value);
}

function frozenCopy(value) {
  return deepFreeze(structuredClone(value));
}

function frozenMap(source) {
  return new Map([...source].map(([key, value]) => [key, frozenCopy(value)]));
}

export async function loadReferenceFoundation(root = DEFAULT_ROOT) {
  const { bundle } = await buildBundle(root);
  const schemas = Object.entries(bundle.schemas).map(([name, document]) => ({ name, document }));
  const privateSchemasById = frozenMap(schemaMap({ schemas }, "$id"));
  const privateSchemasByObjectId = frozenMap(schemaMap({ schemas }, "x-cairn-object-schema"));
  const privateSchemas = [...privateSchemasById].map(([name, document]) => ({ name, document }));
  const privateSnapshot = Object.freeze({
    ajv: createAjv(privateSchemas),
    registry: frozenCopy(bundle.operation_registry),
    schemasById: privateSchemasById,
    schemasByObjectId: privateSchemasByObjectId,
    bundleHash: bundle.bundle_hash
  });
  const exposed = Object.freeze({
    ajv: createAjv(schemas),
    registry: structuredClone(bundle.operation_registry),
    schemasById: schemaMap({ schemas: structuredClone(schemas) }, "$id"),
    schemasByObjectId: schemaMap({ schemas: structuredClone(schemas) }, "x-cairn-object-schema"),
    bundleHash: bundle.bundle_hash
  });
  LOADED_FOUNDATIONS.set(exposed, privateSnapshot);
  return exposed;
}

function statusForFailures(failures) {
  if (failures.some((code) => /idempotency_conflict|nonce_replay/.test(code))) return 409;
  if (failures.some((code) => code === "object_not_found")) return 404;
  if (failures.some((code) => /schema|malformed|binding_invalid|fingerprint_invalid/.test(code))) return 400;
  if (failures.some((code) => /(?:^|_)signing_key_(unknown|record_invalid|record_incomplete|id_mismatch|type_mismatch|controller_missing|status_invalid|validity_invalid|history_incomplete)$/.test(code))) return 503;
  if (failures.some((code) => /(?:^|_)signing_key_(inactive|revoked|not_current|not_valid_at_signature|revoked_at_signature)$/.test(code))) return 403;
  if (failures.some((code) => /signature|signer|controller|audience|runtime_binding|authority_mismatch/.test(code))) return 403;
  if (failures.some((code) => /state_required|unresolved|required$|unavailable/.test(code))) return 503;
  return 422;
}

function failure(status, code, failures = [code]) {
  return { ok: false, status, code, failures };
}

function responseBody(operation, body, context, status, replayed) {
  const validate = context.ajv?.getSchema(operation.response_schema);
  if (!validate || !validate(body)) {
    return failure(503, "response_schema_invalid");
  }
  return { ok: true, status, body: structuredClone(body), replayed };
}

function objectUriForKey(baseUrl, key) {
  return `${baseUrl}/objects/${encodeURIComponent(key)}`;
}

function putObject(draft, object, uri, access, schemasByObjectId) {
  if (
    access === null ||
    typeof access !== "object" ||
    !["public", "private"].includes(access.visibility) ||
    (access.visibility === "public" && access.principal_id !== null) ||
    (access.visibility === "private" && (typeof access.principal_id !== "string" || access.principal_id.length === 0))
  ) {
    throw new TypeError("typed object access metadata required");
  }
  const schema = schemasByObjectId.get(object.schema);
  const ref = objectRefFor(object, schema);
  const key = objectRefKey(ref);
  const identity = [object.schema, valueAtPointer(object, schema["x-cairn-object-id-pointer"])];
  if (object.schema === "cairn.active_intent.v0.1") identity.push(object.revision);
  const identityKey = canonicalText(identity);
  const priorRefKey = draft.refsByIdentity.get(identityKey);
  if (priorRefKey !== undefined && priorRefKey !== key) {
    throw new TypeError("object identity fork rejected");
  }
  if (
    draft.objectsByRef.has(key) &&
    (draft.urisByRef.get(key) !== uri || canonicalText(draft.accessByRef.get(key)) !== canonicalText(access))
  ) {
    throw new TypeError("object binding cannot be reclassified");
  }
  draft.objectsByRef.set(key, structuredClone(object));
  draft.refsByIdentity.set(identityKey, key);
  draft.urisByRef.set(key, uri);
  draft.accessByRef.set(key, structuredClone(access));
  if (object.schema === "cairn.agent_runtime_binding.v0.1") {
    const existing = draft.runtimeBindingsByKey.get(object.agent_identity.runtime_instance_key_id);
    if (existing) {
      const existingRef = objectRefFor(existing, schemasByObjectId.get(existing.schema));
      if (!sameObjectRef(existingRef, ref)) throw new TypeError("runtime binding identity fork rejected");
    }
    draft.runtimeBindingsByKey.set(object.agent_identity.runtime_instance_key_id, structuredClone(object));
  } else if (object.schema === "cairn.data_grant.v0.1") {
    draft.dataGrantsByRef.set(key, structuredClone(object));
  } else if (object.schema === "cairn.effect_descriptor.v0.1") {
    draft.effectDescriptorsByRef.set(key, structuredClone(object));
  }
  return ref;
}

function privateAccess(principalId) {
  return { visibility: "private", principal_id: principalId };
}

function publicAccess() {
  return { visibility: "public", principal_id: null };
}

function readAccessFailure(operation, envelope, draft) {
  if (!["runtime_binding.get", "intent.get", "data_grant.get", "projection.get", "object.resolve", "action.get", "receipt.get"].includes(operation.name)) {
    return null;
  }
  const access = draft.accessByRef.get(objectRefKey(envelope.body.ref));
  if (operation.name === "runtime_binding.get") {
    return access?.visibility === "public" ? null : "object_not_found";
  }
  return access?.visibility === "private" && access.principal_id === envelope.principal_id
    ? null
    : "object_not_found";
}

function preparationAccessFailure(envelope, draft, context) {
  if (envelope.message_type !== "action.prepare") return null;
  for (const ref of envelope.body.resource_refs ?? []) {
    const key = objectRefKey(ref);
    const access = draft.accessByRef.get(key);
    if (!resolvedStoredObject(ref, draft, context)) return "proposal_resource_unresolved";
    if (access?.visibility !== "public" && !(access?.visibility === "private" && access.principal_id === envelope.principal_id)) {
      return "proposal_resource_authority_mismatch";
    }
  }
  return null;
}

function consumeAuthorizationGrants(draft, envelope) {
  const keys = [...new Set((envelope.authorization_refs ?? []).map(objectRefKey))]
    .sort((left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")));
  for (const key of keys) {
    const state = draft.grantStatesByRef.get(key);
    if (
      !state ||
      state.status !== "active" ||
      !Number.isSafeInteger(state.remaining_disclosures) ||
      state.remaining_disclosures < 1
    ) {
      return false;
    }
  }
  for (const key of keys) {
    const state = draft.grantStatesByRef.get(key);
    state.remaining_disclosures -= 1;
  }
  return true;
}

function exactSignedDraft(draft, signed, schema, context) {
  const expected = bindObjectHash(structuredClone(draft), schema);
  const signaturePointer = schema["x-cairn-signature-pointers"]?.[0];
  const actualProof = valueAtPointer(signed, signaturePointer);
  valueAtPointer(expected, signaturePointer).value = actualProof.value;
  if (canonicalText(expected) !== canonicalText(signed)) {
    throw new TypeError("signer changed the service-issued draft");
  }
  const failures = validateSignedObject(signed, context);
  if (failures.length) throw new TypeError(`service signature invalid: ${failures.join(",")}`);
  return signed;
}

function resolvedStoredObject(ref, draft, context, { allowExpired = false } = {}) {
  const key = objectRefKey(ref);
  const object = draft.objectsByRef.get(key);
  const retrievalUri = draft.urisByRef.get(key);
  if (!object || !retrievalUri) return null;
  const failures = validateResolvedObjectResponse({ ref, retrieval_uri: retrievalUri, object }, {
    ...context,
    historicalKeyProof: true,
    historicalObjectLifecycle: allowExpired,
    expectedRef: ref,
    expectedUri: retrievalUri
  });
  return failures.length === 0 ? object : null;
}

function exactResponseObject(operation, body, draft, context) {
  const key = objectRefKey(body.ref);
  const object = draft.objectsByRef.get(key);
  const uri = draft.urisByRef.get(key);
  if (!object || uri !== body.retrieval_uri) return failure(404, "object_not_found");
  const resolved = { ref: body.ref, retrieval_uri: body.retrieval_uri, object };
  const bindingFailures = validateResolvedObjectResponse(resolved, {
    ...context,
    historicalKeyProof: true,
    expectedRef: body.ref,
    expectedUri: body.retrieval_uri
  });
  if (bindingFailures.length) return failure(statusForFailures(bindingFailures), "resolved_object_invalid", bindingFailures);
  if (operation.name === "object.resolve") return responseBody(operation, resolved, context, 200, false);
  const responseSchema = context.schemasById.get(operation.response_schema);
  if (!responseSchema || responseSchema["x-cairn-object-schema"] !== object.schema) {
    return failure(422, "response_schema_mismatch");
  }
  return responseBody(operation, object, context, 200, false);
}

function resolveKey(source, key) {
  if (typeof source === "function") return source(key);
  if (source && typeof source.get === "function") return source.get(key);
  return source?.[key];
}

function seedAccess(object, keyResolver) {
  if (object.schema === "cairn.agent_runtime_binding.v0.1") return publicAccess();
  const principalId = object.schema === "cairn.effect_descriptor.v0.1"
    ? object.effect_semantics?.principal_id
    : object.principal_id;
  if (typeof principalId !== "string" || principalId.length === 0) {
    throw new TypeError("seeded private object must bind an intrinsic principal");
  }
  if (object.schema === "cairn.data_grant.v0.1") {
    const principalKey = resolveKey(keyResolver, object.principal_signature?.key_id);
    if (!principalKey || principalKey.controller !== principalId) {
      throw new TypeError("seeded DataGrant signer must be its principal");
    }
  }
  return privateAccess(principalId);
}

function exactHttpsUri(value) {
  try {
    return typeof value === "string" && new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function createReferenceSeeder({
  foundation,
  stores,
  keyResolver,
  baseUrl = "https://reference.cairn.cards/cairn/0.1",
  clock = () => new Date().toISOString()
}) {
  const trustedFoundation = LOADED_FOUNDATIONS.get(foundation);
  if (!trustedFoundation) throw new TypeError("foundation must come from loadReferenceFoundation");
  if (!(stores instanceof MemoryReferenceStores) || !keyResolver) {
    throw new TypeError("reference stores and key resolver required");
  }
  const allowedSchemas = new Set([
    "cairn.agent_runtime_binding.v0.1",
    "cairn.data_grant.v0.1",
    "cairn.effect_descriptor.v0.1",
    "cairn.scoped_projection.v0.1"
  ]);
  const objectUri = (ref) => objectUriForKey(baseUrl, objectRefKey(ref));

  function seedObject(object, { uri = null, grantState = null } = {}) {
    if (!allowedSchemas.has(object?.schema)) throw new TypeError("object family is not seedable");
    const validationContext = {
      ajv: trustedFoundation.ajv,
      schemasByObjectId: trustedFoundation.schemasByObjectId,
      keyResolver,
      now: clock()
    };
    const signedFailures = object.schema === "cairn.agent_runtime_binding.v0.1"
      ? validateRuntimeBinding(object, validationContext)
      : validateSignedObject(object, validationContext);
    if (signedFailures.length) throw new TypeError(`cannot seed invalid object: ${signedFailures.join(",")}`);
    const access = seedAccess(object, keyResolver);
    const ref = objectRefFor(object, trustedFoundation.schemasByObjectId.get(object.schema));
    const retrievalUri = uri ?? objectUri(ref);
    if (!exactHttpsUri(retrievalUri)) throw new TypeError("seeded object URI must be HTTPS");
    if (object.schema === "cairn.data_grant.v0.1") {
      if (
        grantState === null ||
        typeof grantState !== "object" ||
        grantState.status !== "active" ||
        grantState.revocation_nonce !== object.revocation_nonce ||
        !Number.isSafeInteger(grantState.remaining_disclosures) ||
        grantState.remaining_disclosures < 0 ||
        grantState.remaining_disclosures > object.maximum_disclosures
      ) {
        throw new TypeError("seeded DataGrant requires matching typed active state");
      }
    } else if (grantState !== null) {
      throw new TypeError("grant state is valid only for a DataGrant");
    }
    return stores.transaction((draft) => {
      const key = objectRefKey(ref);
      if (draft.objectsByRef.has(key) || draft.grantStatesByRef.has(key)) {
        throw new TypeError("reference seeding is insert-only");
      }
      const storedRef = putObject(
        draft,
        object,
        retrievalUri,
        access,
        trustedFoundation.schemasByObjectId
      );
      if (grantState !== null) draft.grantStatesByRef.set(objectRefKey(storedRef), structuredClone(grantState));
      return { commit: true, value: storedRef };
    });
  }

  return Object.freeze({ seedObject, objectUri });
}

export function createReferenceService({
  foundation,
  stores = new MemoryReferenceStores(),
  keyResolver,
  expectedAudience = "cairn:reference-service",
  baseUrl = "https://reference.cairn.cards/cairn/0.1",
  clock = () => new Date().toISOString(),
  idFactory = () => `urn:uuid:${randomUUID()}`,
  issuer = "cairn:reference-service",
  issuerKeyId,
  signObject
}) {
  const trustedFoundation = LOADED_FOUNDATIONS.get(foundation);
  if (!trustedFoundation) throw new TypeError("foundation must come from loadReferenceFoundation");
  if (!(stores instanceof MemoryReferenceStores)) throw new TypeError("MemoryReferenceStores required");
  if (!keyResolver || typeof signObject !== "function" || typeof issuerKeyId !== "string") {
    throw new TypeError("key resolver and service signer required");
  }

  const registry = trustedFoundation.registry;
  const schemasById = trustedFoundation.schemasById;
  const schemasByObjectId = trustedFoundation.schemasByObjectId;
  const bundleHash = trustedFoundation.bundleHash;
  const ajv = trustedFoundation.ajv;
  if (canonicalText(registry.operations.map(operationTuple)) !== canonicalText(EXACT_FOUNDATION_OPERATION_TUPLES)) {
    throw new TypeError("reference foundation operation tuples are not exact");
  }
  const operationByName = new Map(registry.operations.map((operation) => [operation.name, operation]));
  const objectUri = (ref) => objectUriForKey(baseUrl, objectRefKey(ref));

  function capabilities() {
    const body = {
      protocol_version: "0.1",
      profile: "cairn-proposal-foundation-v0.1",
      bundle_hash: bundleHash,
      operations: registry.operations.map(({ name }) => name)
    };
    const failures = validateCapabilitiesResponse(body, {
      ajv,
      registry,
      bundleHash
    });
    if (failures.length) throw new Error(`invalid built-in capabilities: ${failures.join(",")}`);
    return body;
  }

  function validationContext(draft, envelope, authorityNamespace) {
    const runtimeKeyId = envelope?.sender?.runtime_key_id;
    return {
      ajv,
      schemasById,
      schemasByObjectId,
      registry,
      keyResolver,
      now: clock(),
      expectedAudience,
      authorityNamespace,
      runtimeBinding: runtimeKeyId === null ? null : draft.runtimeBindingsByKey.get(runtimeKeyId),
      dataGrantsByRef: draft.dataGrantsByRef,
      grantStatesByRef: draft.grantStatesByRef,
      effectDescriptorsByRef: draft.effectDescriptorsByRef,
      resourceUrisByRef: { get: (key) => draft.urisByRef.get(key) ?? objectUriForKey(baseUrl, key) },
      usedNonces: draft.usedNonces,
      idempotencyRecords: draft.idempotencyRecords
    };
  }

  function buildPreparation(envelope, context) {
    const proposal = envelope.body;
    const issuedAt = context.now;
    const actionDraft = {
      schema: "cairn.action_record.v0.1",
      action_id: idFactory("action", envelope),
      action_proposal_ref: objectRefFor(proposal, schemasByObjectId.get(proposal.schema)),
      principal_id: proposal.principal_id,
      capability: proposal.capability,
      authorization_ref: null,
      reservation_refs: [],
      gate_result_ref: null,
      expected_deal_head_hash: proposal.expected_deal_head_hash,
      effect_id: proposal.effect_id,
      idempotency_key: envelope.idempotency_key,
      current_state: "draft",
      state_version: 0,
      last_transition_receipt_ref: null,
      previous_action_ref: null,
      materialized_from_receipt_hash: null,
      created_at: issuedAt,
      updated_at: issuedAt,
      action_hash: ZERO_HASH,
      action_service_signature: signaturePlaceholder(issuerKeyId, issuedAt),
      not_claiming: ["receiver_effect_before_confirmation"]
    };
    const actionSchema = schemasByObjectId.get(actionDraft.schema);
    const action = exactSignedDraft(
      actionDraft,
      signObject(structuredClone(actionDraft)),
      actionSchema,
      context
    );
    const receiptDraft = {
      schema: "cairn.action_preparation_receipt.v0.1",
      receipt_id: idFactory("receipt", envelope),
      action_ref: objectRefFor(action, schemasByObjectId.get(action.schema)),
      action_proposal_ref: action.action_proposal_ref,
      state_before: "draft",
      state_after: "prepared",
      prepared_for_principal: proposal.principal_id,
      prepared_by_agent: proposal.agent_identity,
      external_effect: false,
      issued_at: issuedAt,
      issuer,
      prior_receipt_or_event_hash: null,
      receipt_hash: ZERO_HASH,
      issuer_signature: signaturePlaceholder(issuerKeyId, issuedAt),
      not_claiming: ["authority_to_act", "external_effect"]
    };
    const receiptSchema = schemasByObjectId.get(receiptDraft.schema);
    const receipt = exactSignedDraft(
      receiptDraft,
      signObject(structuredClone(receiptDraft)),
      receiptSchema,
      context
    );
    const failures = validatePreparationReceipt(receipt, {
      ...context,
      action,
      proposal,
      expectedAgentIdentity: proposal.agent_identity
    });
    if (failures.length) throw new Error(`invalid preparation result: ${failures.join(",")}`);
    return { action, receipt };
  }

  function handleEnvelope(envelope, authentication = {}) {
    if (
      authentication === null ||
      typeof authentication !== "object" ||
      !Object.hasOwn(authentication, "principalId") ||
      typeof authentication.actorId !== "string" ||
      authentication.actorId.length === 0 ||
      authentication.principalId !== envelope?.principal_id ||
      authentication.actorId !== envelope?.sender?.actor_id
    ) {
      return failure(403, "authenticated_identity_mismatch");
    }
    const operation = operationByName.get(envelope?.message_type);
    if (!operation) return failure(400, "operation_unknown");
    if (operation.mutating && (typeof authentication.authorityNamespace !== "string" || authentication.authorityNamespace.length === 0)) {
      return failure(403, "authenticated_authority_namespace_required");
    }
    try {
      return stores.transaction((draft) => {
        const context = validationContext(draft, envelope, authentication.authorityNamespace);
        let staged = null;
        let resultRefFactory = null;
        if (operation.name === "intent.put") {
          resultRefFactory = () => objectRefFor(envelope.body, schemasByObjectId.get(envelope.body.schema));
        } else if (operation.name === "action.prepare") {
          resultRefFactory = () => {
            staged = buildPreparation(envelope, context);
            return objectRefFor(staged.receipt, schemasByObjectId.get(staged.receipt.schema));
          };
        }
        const preflight = () => {
          const accessFailure = readAccessFailure(operation, envelope, draft) ?? preparationAccessFailure(envelope, draft, context);
          return accessFailure ? [accessFailure] : [];
        };
        const admission = acceptEnvelopeOperation(envelope, context, resultRefFactory, preflight);
        if (!admission.accepted) {
          return { commit: false, value: failure(statusForFailures(admission.failures), "operation_rejected", admission.failures) };
        }

        if (operation.mutating && admission.replayed) {
          const resultAccess = draft.accessByRef.get(objectRefKey(admission.result_ref));
          const object = resolvedStoredObject(admission.result_ref, draft, context, { allowExpired: true });
          if (!object || resultAccess?.visibility !== "private" || resultAccess.principal_id !== envelope.principal_id) {
            return { commit: true, value: failure(503, "idempotency_result_unavailable") };
          }
          let body;
          if (operation.name === "intent.put") {
            const expectedRef = objectRefFor(envelope.body, schemasByObjectId.get(envelope.body.schema));
            if (!sameObjectRef(admission.result_ref, expectedRef)) {
              return { commit: true, value: failure(503, "idempotency_result_unavailable") };
            }
            body = { ref: admission.result_ref, receipt_ref: null };
          } else {
            const action = object.schema === "cairn.action_preparation_receipt.v0.1"
              ? resolvedStoredObject(object.action_ref, draft, context, { allowExpired: true })
              : null;
            const actionAccess = action && draft.accessByRef.get(objectRefKey(object.action_ref));
            const replayFailures = action
              ? validatePreparationReceipt(object, {
                ...context,
                historicalKeyProof: true,
                historicalObjectLifecycle: true,
                action,
                proposal: envelope.body,
                expectedAgentIdentity: envelope.body.agent_identity
              })
              : ["replay_action_unavailable"];
            if (
              !action ||
              actionAccess?.visibility !== "private" ||
              actionAccess.principal_id !== envelope.principal_id ||
              action.idempotency_key !== envelope.idempotency_key ||
              replayFailures.length > 0
            ) {
              return { commit: true, value: failure(503, "idempotency_result_unavailable") };
            }
            body = object;
          }
          return { commit: true, value: responseBody(operation, body, context, 200, true) };
        }

        if (operation.name === "capabilities.get") {
          return { commit: true, value: responseBody(operation, capabilities(), context, 200, false) };
        }
        if (operation.name === "intent.put") {
          const ref = putObject(
            draft,
            envelope.body,
            objectUri(admission.result_ref),
            privateAccess(envelope.principal_id),
            schemasByObjectId
          );
          const result = responseBody(operation, { ref, receipt_ref: null }, context, 201, false);
          const grantsConsumed = result.ok && consumeAuthorizationGrants(draft, envelope);
          return { commit: grantsConsumed, value: grantsConsumed ? result : failure(503, "grant_consumption_failed") };
        }
        if (operation.name === "action.prepare") {
          const proposalRef = putObject(
            draft,
            envelope.body,
            objectUri(staged.action.action_proposal_ref),
            privateAccess(envelope.principal_id),
            schemasByObjectId
          );
          const actionRefCandidate = objectRefFor(staged.action, schemasByObjectId.get(staged.action.schema));
          const actionRef = putObject(
            draft,
            staged.action,
            objectUri(actionRefCandidate),
            privateAccess(envelope.principal_id),
            schemasByObjectId
          );
          const receiptRef = putObject(
            draft,
            staged.receipt,
            objectUri(admission.result_ref),
            privateAccess(envelope.principal_id),
            schemasByObjectId
          );
          if (
            !sameObjectRef(proposalRef, staged.action.action_proposal_ref) ||
            !sameObjectRef(proposalRef, staged.receipt.action_proposal_ref) ||
            !sameObjectRef(receiptRef, admission.result_ref) ||
            !sameObjectRef(staged.receipt.action_ref, actionRef)
          ) {
            return { commit: false, value: failure(503, "prepared_result_binding_failed") };
          }
          const result = responseBody(operation, staged.receipt, context, 201, false);
          const grantsConsumed = result.ok && consumeAuthorizationGrants(draft, envelope);
          return { commit: grantsConsumed, value: grantsConsumed ? result : failure(503, "grant_consumption_failed") };
        }

        const result = exactResponseObject(operation, envelope.body, draft, context);
        if (!result.ok || !operation.data_grant_required) return { commit: true, value: result };
        const grantsConsumed = consumeAuthorizationGrants(draft, envelope);
        return { commit: grantsConsumed, value: grantsConsumed ? result : failure(503, "grant_consumption_failed") };
      });
    } catch {
      return failure(503, "reference_service_failure");
    }
  }

  return Object.freeze({
    profileLink: PROFILE_LINK,
    registry,
    capabilities,
    handleEnvelope,
    objectUri
  });
}
