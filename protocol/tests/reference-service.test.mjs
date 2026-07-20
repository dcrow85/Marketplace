import assert from "node:assert/strict";
import { generateKeyPairSync, sign as signBytes } from "node:crypto";
import { createServer } from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  bindObjectHash,
  canonicalHash,
  objectRefFor,
  objectRefKey,
  semanticHash,
  signatureInput,
  valueAtPointer
} from "../lib/core.mjs";
import { idempotencyRecordKey, operationFingerprint } from "../lib/validation.mjs";
import { createReferenceHttpHandler } from "../reference-service/http.mjs";
import { createReferenceSeeder, createReferenceService, loadReferenceFoundation } from "../reference-service/service.mjs";
import { ZERO_HASH, signaturePlaceholder } from "../reference-service/signer.mjs";
import { MemoryReferenceStores } from "../reference-service/state.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const foundation = await loadReferenceFoundation(root);

const PRINCIPAL_ID = "did:example:collector";
const OTHER_PRINCIPAL_ID = "did:example:other-collector";
const AGENT_PROVIDER_ID = "did:web:agent.example";
const AGENT_KEY_ID = "did:web:agent.example#runtime-1";
const SECOND_AGENT_KEY_ID = "did:web:agent.example#runtime-2";
const PROVIDER_KEY_ID = "did:web:agent.example#provider-1";
const PRINCIPAL_KEY_ID = "did:example:collector#key-1";
const OTHER_PRINCIPAL_KEY_ID = "did:example:other-collector#key-1";
const SERVICE_ID = "cairn:action-service";
const SERVICE_KEY_ID = "https://reference.cairn.cards/keys/service-1";
const EFFECT_KEY_ID = "https://reference.cairn.cards/keys/effect-issuer-1";
const CREATED = "2026-07-20T16:00:00Z";
const NOW = "2026-07-20T16:30:00Z";
const EXPIRES = "2026-07-20T17:00:00Z";
const HASH_A = `sha-256:${"a".repeat(64)}`;

const AGENT_IDENTITY = Object.freeze({
  agent_provider_id: AGENT_PROVIDER_ID,
  agent_product_id: "reference-test-agent",
  runtime_instance_key_id: AGENT_KEY_ID,
  model_id_and_version: "reference-test-model-1",
  policy_hash: `sha-256:${"1".repeat(64)}`,
  toolset_hash: `sha-256:${"2".repeat(64)}`,
  session_id: "reference-test-session"
});
const SECOND_AGENT_IDENTITY = Object.freeze({
  ...AGENT_IDENTITY,
  runtime_instance_key_id: SECOND_AGENT_KEY_ID,
  session_id: "reference-test-session-2"
});

function uuid(number) {
  return `urn:uuid:00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

function testKey(key_id, controller) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    key_id,
    key_type: "Ed25519",
    controller,
    status: "active",
    not_before: "2026-07-20T15:00:00Z",
    expires_at: "2026-07-20T18:00:00Z",
    revocation_time: null,
    public_key: publicKey.export({ format: "jwk" }).x,
    privateKey
  };
}

const AGENT_KEY = testKey(AGENT_KEY_ID, AGENT_PROVIDER_ID);
const SECOND_AGENT_KEY = testKey(SECOND_AGENT_KEY_ID, AGENT_PROVIDER_ID);
const PROVIDER_KEY = testKey(PROVIDER_KEY_ID, AGENT_PROVIDER_ID);
const PRINCIPAL_KEY = testKey(PRINCIPAL_KEY_ID, PRINCIPAL_ID);
const OTHER_PRINCIPAL_KEY = testKey(OTHER_PRINCIPAL_KEY_ID, OTHER_PRINCIPAL_ID);
const SERVICE_KEY = testKey(SERVICE_KEY_ID, SERVICE_ID);
const EFFECT_KEY = testKey(EFFECT_KEY_ID, "cairn:object-service");
const keyResolver = new Map([AGENT_KEY, SECOND_AGENT_KEY, PROVIDER_KEY, PRINCIPAL_KEY, OTHER_PRINCIPAL_KEY, SERVICE_KEY, EFFECT_KEY].map((key) => [key.key_id, key]));

function schemaFor(object) {
  const schema = foundation.schemasByObjectId.get(object?.schema);
  assert.ok(schema, `missing object schema for ${object?.schema}`);
  return schema;
}

function signature(key, signedAt = CREATED) {
  return signaturePlaceholder(key.key_id, signedAt);
}

function bindAndSign(object, key) {
  const schema = schemaFor(object);
  const bound = bindObjectHash(object, schema);
  const pointer = schema["x-cairn-signature-pointers"][0];
  const proof = valueAtPointer(bound, pointer);
  proof.value = signBytes(null, signatureInput(bound.schema, proof.signed_hash), key.privateKey).toString("base64url");
  return bound;
}

function makeRuntimeBinding(number = 60, identity = AGENT_IDENTITY, runtimeKey = AGENT_KEY) {
  return bindAndSign({
    schema: "cairn.agent_runtime_binding.v0.1",
    runtime_binding_id: uuid(number),
    agent_identity: structuredClone(identity),
    runtime_public_key: {
      profile: "cairn-ed25519-v0.1",
      key_id: runtimeKey.key_id,
      public_key: runtimeKey.public_key
    },
    key_status: "active",
    not_before: "2026-07-20T15:00:00Z",
    expires_at: "2026-07-20T18:00:00Z",
    runtime_binding_hash: ZERO_HASH,
    provider_signature: signature(PROVIDER_KEY),
    not_claiming: ["model_or_policy_attestation", "principal_authority", "personhood"]
  }, PROVIDER_KEY);
}

function makeEffect() {
  const schema = foundation.schemasByObjectId.get("cairn.effect_descriptor.v0.1");
  const effect = {
    schema: "cairn.effect_descriptor.v0.1",
    effect_descriptor_id: uuid(20),
    executor_target: "cairn:executor:proposal-only",
    effect_semantics: {
      principal_id: PRINCIPAL_ID,
      capability: "prepare",
      operation_kind: "draft_action",
      provider_id: "cairn:object-service",
      ultimate_receiver: null,
      deal_id: null,
      closed_terms_or_cart_hash: HASH_A,
      copy_ids: ["copy-a", "copy-b"],
      rail: null,
      amounts_by_role: {}
    },
    effect_id: ZERO_HASH,
    descriptor_hash: ZERO_HASH,
    descriptor_issuer_signature: signature(EFFECT_KEY),
    not_claiming: ["receiver_effect", "authority_to_act", "global_exactly_once"]
  };
  effect.effect_id = semanticHash(effect, schema);
  return bindAndSign(effect, EFFECT_KEY);
}

function makeProposal(effect) {
  return bindAndSign({
    schema: "cairn.action_proposal.v0.1",
    action_proposal_id: uuid(21),
    principal_id: PRINCIPAL_ID,
    agent_identity: structuredClone(AGENT_IDENTITY),
    capability: "prepare",
    deal_id: null,
    expected_deal_head_hash: null,
    target: effect.executor_target,
    ultimate_effect_recipient: null,
    ultimate_effect_account_commitment: null,
    effect_operation_kind: effect.effect_semantics.operation_kind,
    effect_provider_id: effect.effect_semantics.provider_id,
    copy_ids: structuredClone(effect.effect_semantics.copy_ids),
    resource_refs: [objectRefFor(effect, schemaFor(effect))],
    inputs_hash: HASH_A,
    terms_or_cart_hash: effect.effect_semantics.closed_terms_or_cart_hash,
    evidence_snapshot_hash: null,
    amounts: [],
    rail: null,
    requested_execution_mode: "supervised",
    authority_candidate_ref: null,
    effect_descriptor_ref: objectRefFor(effect, schemaFor(effect)),
    effect_id: effect.effect_id,
    unknowns: [],
    not_claiming: ["authority_to_act", "external_effect"],
    created_at: CREATED,
    expires_at: EXPIRES,
    action_proposal_hash: ZERO_HASH,
    agent_signature: signature(AGENT_KEY)
  }, AGENT_KEY);
}

function makeActiveIntent({ revision = 1, supersedesRevision = null, stance = "want" } = {}) {
  return bindAndSign({
    schema: "cairn.active_intent.v0.1",
    intent_id: uuid(30),
    principal_id: PRINCIPAL_ID,
    revision,
    supersedes_revision: supersedesRevision,
    intent_type: "acquire",
    domain: "trading_cards",
    targets: [{
      catalog_ref: { catalog_hash: HASH_A, row_id: "azuki-test-card" },
      exact_copy_required: false,
      quantity: 1,
      substitution_policy: "exact_print"
    }],
    stance,
    constraints: {
      condition_floor: "NM",
      total_budget: { amount_minor: 1200, asset: "USD" },
      per_item_budget: { amount_minor: 1200, asset: "USD" },
      fees_included_in_budget: true,
      evidence_policy_ref: {
        schema: "cairn.evidence_policy.v0.1",
        object_id: uuid(31),
        object_hash: HASH_A
      },
      allowed_sellers: [],
      blocked_sellers: [],
      geography: ["US"],
      shipping_requirements: ["tracked"],
      allowed_rails: ["escrow"],
      deadline: EXPIRES,
      substitutions_require_confirmation: true
    },
    attention_contract: {
      interrupt_budget: 1,
      reserved_judgments: ["price_above_budget"],
      default_if_unavailable: "wait"
    },
    privacy: {
      disclosure_policy: "minimum_necessary",
      never_disclose: ["total_budget", "negotiation_strategy"]
    },
    agent_posture: "proposal_only",
    source_claim_ids: ["reference-test-claim"],
    initial_status: "active",
    created_at: CREATED,
    expires_at: EXPIRES,
    profile_version_hash: HASH_A,
    intent_hash: ZERO_HASH,
    principal_signature: signature(PRINCIPAL_KEY),
    consent_receipt_ref: {
      schema: "cairn.consent_receipt.v0.1",
      object_id: uuid(32),
      object_hash: HASH_A
    },
    not_claiming: ["market_availability", "authority_to_spend", "authority_to_disclose_private_constraints"]
  }, PRINCIPAL_KEY);
}

function makeProjection(expiresAt = EXPIRES) {
  return bindAndSign({
    schema: "cairn.scoped_projection.v0.1",
    projection_id: uuid(33),
    principal_id: PRINCIPAL_ID,
    source_refs: {
      profile_version_hash: HASH_A,
      intent_id: uuid(30),
      intent_revision: 1,
      claim_ids: ["reference-test-claim"]
    },
    purpose: "search",
    audience: [AGENT_KEY_ID],
    data_uses: ["read_local"],
    disclosed_fields: ["/targets"],
    redacted_fields: ["total_budget"],
    disclosure_authority_ref: null,
    derived_at: CREATED,
    expires_at: expiresAt,
    projection_hash: ZERO_HASH,
    issuer_signature: signature(SERVICE_KEY),
    not_claiming: ["authority_to_act"]
  }, SERVICE_KEY);
}

function makeDataGrant(service, proposal) {
  const proposalRef = objectRefFor(proposal, schemaFor(proposal));
  return bindAndSign({
    schema: "cairn.data_grant.v0.1",
    grant_id: uuid(61),
    principal_id: PRINCIPAL_ID,
    recipient: AGENT_KEY_ID,
    resource_scopes: [proposalRef, ...proposal.resource_refs].map((ref) => ({
      resource_kind: "object",
      ref,
      retrieval_uri: service.objectUri(ref),
      field_paths: [""]
    })),
    uses: ["derive"],
    purpose: "action_preparation",
    audience: [AGENT_KEY_ID],
    maximum_disclosures: 2,
    retention: { expires_at: EXPIRES, deletion_terms: "Delete when the operation expires." },
    revocation_nonce: 2,
    disclosure_ledger_namespace: "reference-service-tests",
    issued_at: CREATED,
    expires_at: EXPIRES,
    grant_hash: ZERO_HASH,
    principal_signature: signature(PRINCIPAL_KEY),
    not_claiming: ["external_deletion_enforced"]
  }, PRINCIPAL_KEY);
}

function makeIntentGrant(service, intent, grantNumber = 62) {
  const intentRef = objectRefFor(intent, schemaFor(intent));
  return bindAndSign({
    schema: "cairn.data_grant.v0.1",
    grant_id: uuid(grantNumber),
    principal_id: PRINCIPAL_ID,
    recipient: AGENT_KEY_ID,
    resource_scopes: [{
      resource_kind: "object",
      ref: intentRef,
      retrieval_uri: service.objectUri(intentRef),
      field_paths: [""]
    }],
    uses: ["write_object"],
    purpose: "intent_storage",
    audience: [AGENT_KEY_ID],
    maximum_disclosures: 2,
    retention: { expires_at: EXPIRES, deletion_terms: "Delete when the intent expires." },
    revocation_nonce: grantNumber,
    disclosure_ledger_namespace: `reference-service-intent-${grantNumber}`,
    issued_at: CREATED,
    expires_at: EXPIRES,
    grant_hash: ZERO_HASH,
    principal_signature: signature(PRINCIPAL_KEY),
    not_claiming: ["external_deletion_enforced"]
  }, PRINCIPAL_KEY);
}

function makeReadGrant(service, {
  ref,
  purpose,
  principalId = PRINCIPAL_ID,
  principalKey = PRINCIPAL_KEY,
  grantNumber = 63,
  maximumDisclosures = 2
}) {
  return bindAndSign({
    schema: "cairn.data_grant.v0.1",
    grant_id: uuid(grantNumber),
    principal_id: principalId,
    recipient: AGENT_KEY_ID,
    resource_scopes: [{
      resource_kind: "object",
      ref,
      retrieval_uri: service.objectUri(ref),
      field_paths: [""]
    }],
    uses: ["read_local"],
    purpose,
    audience: [AGENT_KEY_ID],
    maximum_disclosures: maximumDisclosures,
    retention: { expires_at: EXPIRES, deletion_terms: "Delete when the read grant expires." },
    revocation_nonce: grantNumber,
    disclosure_ledger_namespace: `reference-read-${grantNumber}`,
    issued_at: CREATED,
    expires_at: EXPIRES,
    grant_hash: ZERO_HASH,
    principal_signature: signature(principalKey),
    not_claiming: ["external_deletion_enforced"]
  }, principalKey);
}

function makeEnvelope({
  operationName,
  body,
  subjectRefs = [],
  authorizationRefs = [],
  messageNumber = 50,
  nonce = "reference-nonce-00000001",
  idempotencyKey,
  principalId = PRINCIPAL_ID,
  senderIdentity = AGENT_IDENTITY,
  senderKey = AGENT_KEY
}) {
  const operation = foundation.registry.operations.find(({ name }) => name === operationName);
  assert.ok(operation, operationName);
  const envelope = {
    schema: "cairn.envelope.v0.1",
    protocol_version: "0.1",
    message_id: uuid(messageNumber),
    message_type: operationName,
    created_at: CREATED,
    expires_at: EXPIRES,
    sender: {
      actor_id: senderIdentity.agent_provider_id,
      runtime_key_id: senderIdentity.runtime_instance_key_id
    },
    principal_id: principalId,
    audience: [SERVICE_ID],
    subject_refs: subjectRefs,
    authorization_refs: authorizationRefs,
    nonce,
    idempotency_key: idempotencyKey ?? (operation.mutating ? "reference-idempotency-0001" : null),
    operation_fingerprint: ZERO_HASH,
    critical_extensions: [],
    body_schema: operation.request_schema,
    body,
    body_hash: canonicalHash(body),
    trace: { parent_message_id: null, correlation_id: "reference-service-workflow" },
    envelope_hash: ZERO_HASH,
    signature: signature(senderKey)
  };
  envelope.operation_fingerprint = operationFingerprint(envelope);
  return bindAndSign(envelope, senderKey);
}

function newIdempotentAttempt(envelope, number, idempotencyKey) {
  const attempt = structuredClone(envelope);
  attempt.message_id = uuid(number);
  attempt.nonce = `reference-nonce-${String(number).padStart(8, "0")}`;
  attempt.idempotency_key = idempotencyKey;
  attempt.envelope_hash = ZERO_HASH;
  attempt.signature = signature(AGENT_KEY);
  return bindAndSign(attempt, AGENT_KEY);
}

function freshTransport(envelope, number) {
  const retry = structuredClone(envelope);
  retry.message_id = uuid(number);
  retry.nonce = `reference-nonce-${String(number).padStart(8, "0")}`;
  retry.envelope_hash = ZERO_HASH;
  retry.signature = signature(AGENT_KEY);
  return bindAndSign(retry, AGENT_KEY);
}

function makeHarness({ serviceSigner, idFactory } = {}) {
  const stores = new MemoryReferenceStores();
  let generatedIds = 0;
  let generatedSignatures = 0;
  const signObject = serviceSigner ?? ((draft) => {
    generatedSignatures += 1;
    assert.equal(draft.action_service_signature?.key_id ?? draft.issuer_signature?.key_id, SERVICE_KEY_ID);
    return bindAndSign(draft, SERVICE_KEY);
  });
  const service = createReferenceService({
    foundation,
    stores,
    keyResolver,
    expectedAudience: SERVICE_ID,
    issuer: SERVICE_ID,
    issuerKeyId: SERVICE_KEY_ID,
    clock: () => NOW,
    idFactory: idFactory ?? (() => uuid(800 + (++generatedIds))),
    signObject
  });
  const seeder = createReferenceSeeder({ foundation, stores, keyResolver, clock: () => NOW });
  const runtime = makeRuntimeBinding();
  const effect = makeEffect();
  const proposal = makeProposal(effect);
  const grant = makeDataGrant(service, proposal);
  const runtimeRef = seeder.seedObject(runtime);
  seeder.seedObject(effect);
  const grantRef = seeder.seedObject(grant, {
    grantState: { status: "active", revocation_nonce: 2, remaining_disclosures: 2 }
  });
  const envelope = makeEnvelope({
    operationName: "action.prepare",
    body: proposal,
    subjectRefs: [objectRefFor(proposal, schemaFor(proposal))],
    authorizationRefs: [grantRef]
  });
  const authentication = {
    principalId: PRINCIPAL_ID,
    actorId: AGENT_PROVIDER_ID,
    authorityNamespace: `${PRINCIPAL_ID}|action.prepare`
  };
  return {
    service,
    stores,
    runtime,
    runtimeRef,
    effect,
    proposal,
    grant,
    grantRef,
    seeder,
    envelope,
    authentication,
    generatedIds: () => generatedIds,
    generatedSignatures: () => generatedSignatures
  };
}

test("reference service advertises the exact proposal-only ten-operation surface", () => {
  const value = makeHarness();
  const { service } = value;
  const expected = [
    "capabilities.get",
    "runtime_binding.get",
    "intent.put",
    "intent.get",
    "data_grant.get",
    "projection.get",
    "object.resolve",
    "action.prepare",
    "action.get",
    "receipt.get"
  ];
  assert.deepEqual(service.capabilities().operations, expected);
  assert.deepEqual(service.registry.operations.map(({ name }) => name), expected);
  assert.equal(service.registry.operations.length, 10);
  assert.equal(
    expected.some((name) => /authorize|execute|dispatch|pay|settle|release|waive|deliver/.test(name)),
    false
  );
  const prepare = service.registry.operations.find(({ name }) => name === "action.prepare");
  assert.equal(prepare.consequence, "preparation_only");
  assert.equal(prepare.authority_effect, "none");
  assert.equal(service.stores, undefined);
  assert.equal(service.registerObject, undefined);

  const signedCapabilities = makeEnvelope({
    operationName: "capabilities.get",
    body: {},
    messageNumber: 41,
    nonce: "reference-nonce-00000041"
  });
  const response = service.handleEnvelope(signedCapabilities, {
    principalId: PRINCIPAL_ID,
    actorId: AGENT_PROVIDER_ID
  });
  assert.equal(response.ok, true, JSON.stringify(response));
  assert.deepEqual(response.body, service.capabilities());

  const originalMutating = foundation.registry.operations[2].mutating;
  foundation.registry.operations[2].mutating = false;
  assert.equal(service.registry.operations[2].mutating, true, "caller registry mutation must not alter service policy");
  assert.equal(service.capabilities().operations.length, 10);
  foundation.registry.operations[2].mutating = originalMutating;
  assert.throws(() => { service.registry.operations[2].mutating = false; }, TypeError);

  const runtimeSchema = foundation.schemasByObjectId.get("cairn.agent_runtime_binding.v0.1");
  foundation.ajv.removeSchema(runtimeSchema.$id);
  try {
    const request = makeEnvelope({
      operationName: "runtime_binding.get",
      body: { ref: value.runtimeRef, retrieval_uri: service.objectUri(value.runtimeRef) },
      messageNumber: 42,
      nonce: "reference-nonce-00000042"
    });
    assert.equal(service.handleEnvelope(request, value.authentication).ok, true, "caller AJV mutation must not alter service policy");
  } finally {
    foundation.ajv.addSchema(runtimeSchema);
  }
});

test("unknown and consequential operation names fail before any state or factory work", () => {
  const value = makeHarness();
  const before = value.stores.objectsByRef.size;
  const result = value.service.handleEnvelope({
    message_type: "action.execute",
    principal_id: PRINCIPAL_ID,
    sender: { actor_id: AGENT_PROVIDER_ID }
  }, value.authentication);
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.code, "operation_unknown");
  assert.equal(value.stores.objectsByRef.size, before);
  assert.equal(value.stores.usedNonces.size, 0);
  assert.equal(value.generatedIds(), 0);
  assert.equal(value.generatedSignatures(), 0);
});

test("action.prepare creates only a draft action and an explicit no-effect receipt", () => {
  const value = makeHarness();
  const before = value.stores.objectsByRef.size;
  const result = value.service.handleEnvelope(value.envelope, value.authentication);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.status, 201);
  assert.equal(result.replayed, false);
  assert.equal(result.body.schema, "cairn.action_preparation_receipt.v0.1");
  assert.equal(result.body.external_effect, false);
  assert.deepEqual(result.body.not_claiming, ["authority_to_act", "external_effect"]);

  const action = value.stores.objectsByRef.get(objectRefKey(result.body.action_ref));
  assert.ok(action);
  assert.equal(action.current_state, "draft");
  assert.equal(action.state_version, 0);
  assert.equal(action.authorization_ref, null);
  assert.deepEqual(action.reservation_refs, []);
  assert.equal(action.gate_result_ref, null);
  assert.equal(action.last_transition_receipt_ref, null);
  assert.deepEqual(
    value.stores.objectsByRef.get(objectRefKey(result.body.action_proposal_ref)),
    value.proposal,
    "the validated proposal must remain resolvable from the preparation graph"
  );
  assert.equal(value.stores.objectsByRef.size, before + 3);
  assert.equal(value.stores.grantStatesByRef.get(objectRefKey(value.grantRef)).remaining_disclosures, 1);
  assert.equal(value.generatedIds(), 2);
  assert.equal(value.generatedSignatures(), 2);
});

test("fresh-envelope replay returns the original result before changed new-work state", () => {
  const value = makeHarness();
  const first = value.service.handleEnvelope(value.envelope, value.authentication);
  assert.equal(first.ok, true);
  const objectCount = value.stores.objectsByRef.size;
  const idCount = value.generatedIds();
  const signatureCount = value.generatedSignatures();
  const remaining = value.stores.grantStatesByRef.get(objectRefKey(value.grantRef)).remaining_disclosures;

  value.stores.grantStatesByRef.get(objectRefKey(value.grantRef)).status = "revoked";
  value.stores.effectDescriptorsByRef.clear();
  const retry = freshTransport(value.envelope, 52);
  const replay = value.service.handleEnvelope(retry, value.authentication);
  assert.equal(replay.ok, true);
  assert.equal(replay.status, 200);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.body, first.body);
  assert.equal(value.stores.objectsByRef.size, objectCount);
  assert.equal(value.generatedIds(), idCount, "replay must not invoke the lazy preparation factory");
  assert.equal(value.generatedSignatures(), signatureCount, "replay must not sign a second result");
  assert.equal(value.stores.grantStatesByRef.get(objectRefKey(value.grantRef)).remaining_disclosures, remaining);
  assert.equal(value.stores.usedNonces.has(retry.nonce), true);
});

test("grant disclosures are consumed once per successful new operation and never on replay", () => {
  const value = makeHarness();
  const grantState = () => value.stores.grantStatesByRef.get(objectRefKey(value.grantRef));
  const first = value.service.handleEnvelope(value.envelope, value.authentication);
  assert.equal(first.ok, true);
  assert.equal(grantState().remaining_disclosures, 1);

  const replay = value.service.handleEnvelope(freshTransport(value.envelope, 82), value.authentication);
  assert.equal(replay.ok, true);
  assert.equal(replay.replayed, true);
  assert.equal(grantState().remaining_disclosures, 1);

  const second = value.service.handleEnvelope(
    newIdempotentAttempt(value.envelope, 83, "reference-idempotency-0002"),
    value.authentication
  );
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.equal(grantState().remaining_disclosures, 0);
  const idsAfterSecond = value.generatedIds();
  const signaturesAfterSecond = value.generatedSignatures();

  const exhausted = value.service.handleEnvelope(
    newIdempotentAttempt(value.envelope, 84, "reference-idempotency-0003"),
    value.authentication
  );
  assert.equal(exhausted.ok, false);
  assert.ok(exhausted.failures.includes("grant_disclosures_exhausted"));
  assert.equal(value.generatedIds(), idsAfterSecond);
  assert.equal(value.generatedSignatures(), signaturesAfterSecond);
  assert.equal(grantState().remaining_disclosures, 0);
});

test("a grant and idempotent result stay bound to one exact runtime under a shared provider", () => {
  const value = makeHarness();
  value.seeder.seedObject(makeRuntimeBinding(85, SECOND_AGENT_IDENTITY, SECOND_AGENT_KEY));
  const first = value.service.handleEnvelope(value.envelope, value.authentication);
  assert.equal(first.ok, true);

  const otherRuntime = structuredClone(value.envelope);
  otherRuntime.message_id = uuid(86);
  otherRuntime.nonce = "reference-nonce-00000086";
  otherRuntime.sender.runtime_key_id = SECOND_AGENT_KEY_ID;
  otherRuntime.operation_fingerprint = operationFingerprint(otherRuntime);
  otherRuntime.envelope_hash = ZERO_HASH;
  otherRuntime.signature = signature(SECOND_AGENT_KEY);
  const signedOtherRuntime = bindAndSign(otherRuntime, SECOND_AGENT_KEY);
  assert.notEqual(signedOtherRuntime.operation_fingerprint, value.envelope.operation_fingerprint);
  const replayAttempt = value.service.handleEnvelope(signedOtherRuntime, {
    principalId: PRINCIPAL_ID,
    actorId: AGENT_PROVIDER_ID,
    authorityNamespace: value.authentication.authorityNamespace
  });
  assert.equal(replayAttempt.ok, false);
  assert.equal(replayAttempt.status, 409);
  assert.ok(replayAttempt.failures.includes("idempotency_conflict"));

  const newAttempt = structuredClone(signedOtherRuntime);
  newAttempt.message_id = uuid(87);
  newAttempt.nonce = "reference-nonce-00000087";
  newAttempt.idempotency_key = "reference-idempotency-0087";
  newAttempt.envelope_hash = ZERO_HASH;
  newAttempt.signature = signature(SECOND_AGENT_KEY);
  const signedNewAttempt = bindAndSign(newAttempt, SECOND_AGENT_KEY);
  const denied = value.service.handleEnvelope(signedNewAttempt, {
    principalId: PRINCIPAL_ID,
    actorId: AGENT_PROVIDER_ID,
    authorityNamespace: value.authentication.authorityNamespace
  });
  assert.equal(denied.ok, false);
  assert.ok(denied.failures.includes("grant_recipient_mismatch"));
  assert.ok(denied.failures.includes("grant_audience_mismatch"));
  assert.equal(value.generatedIds(), 2);
  assert.equal(value.generatedSignatures(), 2);
});

test("intent.put stores only the signed intent and replays its bound object reference", () => {
  const value = makeHarness();
  const intent = makeActiveIntent();
  const intentRef = objectRefFor(intent, schemaFor(intent));
  const grant = makeIntentGrant(value.service, intent);
  const grantRef = value.seeder.seedObject(grant, {
    grantState: { status: "active", revocation_nonce: 62, remaining_disclosures: 2 }
  });
  const envelope = makeEnvelope({
    operationName: "intent.put",
    body: intent,
    subjectRefs: [intentRef],
    authorizationRefs: [grantRef],
    messageNumber: 54,
    nonce: "reference-nonce-00000054",
    idempotencyKey: "reference-intent-idempotency-0001"
  });
  const authentication = {
    ...value.authentication,
    authorityNamespace: `${PRINCIPAL_ID}|intent.put`
  };
  const first = value.service.handleEnvelope(envelope, authentication);
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(first.status, 201);
  assert.deepEqual(first.body, { ref: intentRef, receipt_ref: null });
  assert.deepEqual(value.stores.objectsByRef.get(objectRefKey(intentRef)), intent);

  value.stores.grantStatesByRef.get(objectRefKey(grantRef)).status = "revoked";
  const replay = value.service.handleEnvelope(freshTransport(envelope, 55), authentication);
  assert.equal(replay.ok, true);
  assert.equal(replay.status, 200);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.body, first.body);
});

test("intent identity permits signed revisions but rejects a fork at one revision", () => {
  const value = makeHarness();
  const authentication = {
    ...value.authentication,
    authorityNamespace: `${PRINCIPAL_ID}|intent.put`
  };
  const putIntent = (intent, grantNumber, messageNumber, idempotencyKey) => {
    const intentRef = objectRefFor(intent, schemaFor(intent));
    const grant = makeIntentGrant(value.service, intent, grantNumber);
    const grantRef = value.seeder.seedObject(grant, {
      grantState: { status: "active", revocation_nonce: grantNumber, remaining_disclosures: 1 }
    });
    const result = value.service.handleEnvelope(makeEnvelope({
      operationName: "intent.put",
      body: intent,
      subjectRefs: [intentRef],
      authorizationRefs: [grantRef],
      messageNumber,
      nonce: `reference-nonce-00000${messageNumber}`,
      idempotencyKey
    }), authentication);
    return { result, intentRef, grantRef };
  };

  const revisionOne = makeActiveIntent();
  const revisionTwo = makeActiveIntent({ revision: 2, supersedesRevision: 1 });
  const first = putIntent(revisionOne, 161, 162, "reference-intent-revision-0001");
  const second = putIntent(revisionTwo, 163, 164, "reference-intent-revision-0002");
  assert.equal(first.result.ok, true);
  assert.equal(second.result.ok, true);
  assert.notDeepEqual(first.intentRef, second.intentRef);
  assert.deepEqual(value.stores.objectsByRef.get(objectRefKey(first.intentRef)), revisionOne);
  assert.deepEqual(value.stores.objectsByRef.get(objectRefKey(second.intentRef)), revisionTwo);

  const forkDraft = structuredClone(revisionTwo);
  forkDraft.targets[0].quantity = 2;
  const revisionFork = bindAndSign(forkDraft, PRINCIPAL_KEY);
  const fork = putIntent(revisionFork, 165, 166, "reference-intent-revision-fork");
  assert.equal(fork.result.ok, false);
  assert.equal(fork.result.status, 503);
  assert.equal(fork.result.code, "reference_service_failure");
  assert.equal(value.stores.objectsByRef.has(objectRefKey(fork.intentRef)), false);
  assert.equal(value.stores.grantStatesByRef.get(objectRefKey(fork.grantRef)).remaining_disclosures, 1);
});

test("authentication and validation failures leave nonce, idempotency, and result state untouched", () => {
  const authCase = makeHarness();
  const authObjects = authCase.stores.objectsByRef.size;
  const actorDenied = authCase.service.handleEnvelope(authCase.envelope, {
    ...authCase.authentication,
    actorId: "did:web:impostor.example"
  });
  assert.equal(actorDenied.status, 403);
  assert.equal(actorDenied.code, "authenticated_identity_mismatch");
  const principalDenied = authCase.service.handleEnvelope(authCase.envelope, {
    ...authCase.authentication,
    principalId: OTHER_PRINCIPAL_ID
  });
  assert.equal(principalDenied.status, 403);
  assert.equal(principalDenied.code, "authenticated_identity_mismatch");
  const missingAuthentication = authCase.service.handleEnvelope(authCase.envelope, null);
  assert.equal(missingAuthentication.status, 403);
  assert.equal(missingAuthentication.code, "authenticated_identity_mismatch");
  const missingNamespace = authCase.service.handleEnvelope(authCase.envelope, {
    principalId: PRINCIPAL_ID,
    actorId: AGENT_PROVIDER_ID
  });
  assert.equal(missingNamespace.status, 403);
  assert.equal(missingNamespace.code, "authenticated_authority_namespace_required");
  assert.equal(authCase.stores.usedNonces.size, 0);
  assert.equal(authCase.stores.idempotencyRecords.size, 0);
  assert.equal(authCase.stores.objectsByRef.size, authObjects);

  const stateCase = makeHarness();
  const stateObjects = stateCase.stores.objectsByRef.size;
  stateCase.stores.effectDescriptorsByRef.clear();
  const rejected = stateCase.service.handleEnvelope(stateCase.envelope, stateCase.authentication);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.code, "operation_rejected");
  assert.ok(rejected.failures.includes("effect_descriptor_unresolved"));
  assert.equal(stateCase.stores.usedNonces.size, 0);
  assert.equal(stateCase.stores.idempotencyRecords.size, 0);
  assert.equal(stateCase.stores.objectsByRef.size, stateObjects);
  assert.equal(stateCase.generatedIds(), 0);
  assert.equal(stateCase.generatedSignatures(), 0);
});

test("signing-key failures distinguish resolver faults from denied authority", () => {
  const unavailableCase = makeHarness();
  const agentKey = keyResolver.get(AGENT_KEY_ID);
  keyResolver.delete(AGENT_KEY_ID);
  try {
    const unavailable = unavailableCase.service.handleEnvelope(
      unavailableCase.envelope,
      unavailableCase.authentication
    );
    assert.equal(unavailable.ok, false);
    assert.equal(unavailable.status, 503);
    assert.ok(unavailable.failures.includes("signing_key_unknown"));
  } finally {
    keyResolver.set(AGENT_KEY_ID, agentKey);
  }

  const malformedCase = makeHarness();
  const originalStatus = AGENT_KEY.status;
  AGENT_KEY.status = "compromised";
  try {
    const malformed = malformedCase.service.handleEnvelope(
      malformedCase.envelope,
      malformedCase.authentication
    );
    assert.equal(malformed.ok, false);
    assert.equal(malformed.status, 503);
    assert.ok(malformed.failures.includes("signing_key_status_invalid"));
  } finally {
    AGENT_KEY.status = originalStatus;
  }

  const deniedCase = makeHarness();
  const originalRevocation = AGENT_KEY.revocation_time;
  AGENT_KEY.status = "revoked";
  AGENT_KEY.revocation_time = "2026-07-20T16:15:00Z";
  try {
    const denied = deniedCase.service.handleEnvelope(deniedCase.envelope, deniedCase.authentication);
    assert.equal(denied.ok, false);
    assert.equal(denied.status, 403);
    assert.ok(denied.failures.includes("signing_key_revoked"));
  } finally {
    AGENT_KEY.status = originalStatus;
    AGENT_KEY.revocation_time = originalRevocation;
  }

  const nestedMalformedCase = makeHarness();
  const originalEffectStatus = EFFECT_KEY.status;
  EFFECT_KEY.status = "compromised";
  try {
    const malformed = nestedMalformedCase.service.handleEnvelope(
      nestedMalformedCase.envelope,
      nestedMalformedCase.authentication
    );
    assert.equal(malformed.ok, false);
    assert.equal(malformed.status, 503);
    assert.ok(malformed.failures.includes("effect_descriptor_signing_key_status_invalid"));
  } finally {
    EFFECT_KEY.status = originalEffectStatus;
  }

  const nestedDeniedCase = makeHarness();
  const originalEffectRevocation = EFFECT_KEY.revocation_time;
  EFFECT_KEY.status = "revoked";
  EFFECT_KEY.revocation_time = "2026-07-20T16:15:00Z";
  try {
    const denied = nestedDeniedCase.service.handleEnvelope(
      nestedDeniedCase.envelope,
      nestedDeniedCase.authentication
    );
    assert.equal(denied.ok, false);
    assert.equal(denied.status, 403);
    assert.ok(denied.failures.includes("effect_descriptor_signing_key_revoked"));
  } finally {
    EFFECT_KEY.status = originalEffectStatus;
    EFFECT_KEY.revocation_time = originalEffectRevocation;
  }
});

test("private object ownership defeats a self-signed cross-principal read grant", () => {
  const value = makeHarness();
  const effectRef = objectRefFor(value.effect, schemaFor(value.effect));
  const foreignGrant = makeReadGrant(value.service, {
    ref: effectRef,
    purpose: "object_resolution",
    principalId: OTHER_PRINCIPAL_ID,
    principalKey: OTHER_PRINCIPAL_KEY,
    grantNumber: 91
  });
  const foreignGrantRef = value.seeder.seedObject(foreignGrant, {
    grantState: { status: "active", revocation_nonce: 91, remaining_disclosures: 2 }
  });
  const envelope = makeEnvelope({
    operationName: "object.resolve",
    body: { ref: effectRef, retrieval_uri: value.service.objectUri(effectRef) },
    authorizationRefs: [foreignGrantRef],
    messageNumber: 92,
    nonce: "reference-nonce-00000092",
    principalId: OTHER_PRINCIPAL_ID
  });
  const result = value.service.handleEnvelope(envelope, {
    principalId: OTHER_PRINCIPAL_ID,
    actorId: AGENT_PROVIDER_ID
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
  assert.ok(result.failures.includes("object_not_found"));
  assert.equal(value.stores.usedNonces.has(envelope.nonce), false);
  assert.equal(value.stores.grantStatesByRef.get(objectRefKey(foreignGrantRef)).remaining_disclosures, 2);
});

test("a provider cannot drop the runtime key and reuse a provider-wide private-read grant", () => {
  const value = makeHarness();
  const effectRef = objectRefFor(value.effect, schemaFor(value.effect));
  const providerGrant = makeReadGrant(value.service, {
    ref: effectRef,
    purpose: "object_resolution",
    grantNumber: 95
  });
  providerGrant.recipient = AGENT_PROVIDER_ID;
  providerGrant.audience = [AGENT_PROVIDER_ID];
  const signedProviderGrant = bindAndSign(providerGrant, PRINCIPAL_KEY);
  const grantRef = value.seeder.seedObject(signedProviderGrant, {
    grantState: { status: "active", revocation_nonce: 95, remaining_disclosures: 1 }
  });
  const draft = makeEnvelope({
    operationName: "object.resolve",
    body: { ref: effectRef, retrieval_uri: value.service.objectUri(effectRef) },
    authorizationRefs: [grantRef],
    messageNumber: 96,
    nonce: "reference-nonce-00000096"
  });
  draft.sender.runtime_key_id = null;
  draft.operation_fingerprint = operationFingerprint(draft);
  draft.envelope_hash = ZERO_HASH;
  draft.signature = signature(PROVIDER_KEY);
  const envelope = bindAndSign(draft, PROVIDER_KEY);
  const result = value.service.handleEnvelope(envelope, {
    principalId: PRINCIPAL_ID,
    actorId: AGENT_PROVIDER_ID
  });
  assert.equal(result.ok, false);
  assert.ok(result.failures.includes("direct_sender_principal_mismatch"));
  assert.equal(value.stores.grantStatesByRef.get(objectRefKey(grantRef)).remaining_disclosures, 1);
});

test("service access preflight runs before IDs or signatures", () => {
  const value = makeHarness();
  const effectRef = objectRefFor(value.effect, schemaFor(value.effect));
  value.stores.accessByRef.set(objectRefKey(effectRef), {
    visibility: "private",
    principal_id: OTHER_PRINCIPAL_ID
  });
  const result = value.service.handleEnvelope(value.envelope, value.authentication);
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.ok(result.failures.includes("proposal_resource_authority_mismatch"));
  assert.equal(value.generatedIds(), 0);
  assert.equal(value.generatedSignatures(), 0);
  assert.equal(value.stores.usedNonces.size, 0);
  assert.equal(value.stores.idempotencyRecords.size, 0);

  const unresolved = makeHarness();
  const unresolvedEffectRef = objectRefFor(unresolved.effect, schemaFor(unresolved.effect));
  unresolved.stores.objectsByRef.delete(objectRefKey(unresolvedEffectRef));
  const missing = unresolved.service.handleEnvelope(unresolved.envelope, unresolved.authentication);
  assert.equal(missing.ok, false);
  assert.ok(missing.failures.includes("proposal_resource_unresolved"));
  assert.equal(unresolved.generatedIds(), 0);
  assert.equal(unresolved.generatedSignatures(), 0);
});

test("a preparation factory failure rolls the transaction back closed", () => {
  let signerCalls = 0;
  const value = makeHarness({
    serviceSigner: () => {
      signerCalls += 1;
      throw new Error("signer unavailable");
    }
  });
  const before = value.stores.objectsByRef.size;
  const result = value.service.handleEnvelope(value.envelope, value.authentication);
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(result.code, "operation_rejected");
  assert.ok(result.failures.includes("operation_result_unavailable"));
  assert.equal(signerCalls, 1);
  assert.equal(value.stores.usedNonces.size, 0);
  assert.equal(value.stores.idempotencyRecords.size, 0);
  assert.equal(value.stores.objectsByRef.size, before);
});

test("the injected signer may sign but cannot rewrite the service draft", () => {
  const value = makeHarness({
    serviceSigner: (draft) => {
      const changed = structuredClone(draft);
      if (changed.schema === "cairn.action_record.v0.1") changed.updated_at = "2026-07-20T16:31:00Z";
      return bindAndSign(changed, SERVICE_KEY);
    }
  });
  const before = value.stores.objectsByRef.size;
  const result = value.service.handleEnvelope(value.envelope, value.authentication);
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.ok(result.failures.includes("operation_result_unavailable"));
  assert.equal(value.stores.objectsByRef.size, before);
  assert.equal(value.stores.usedNonces.size, 0);
  assert.equal(value.stores.idempotencyRecords.size, 0);
});

test("a changed fingerprint cannot reuse a committed idempotency key", () => {
  const value = makeHarness();
  assert.equal(value.service.handleEnvelope(value.envelope, value.authentication).ok, true);
  const conflictDraft = structuredClone(value.envelope);
  conflictDraft.message_id = uuid(53);
  conflictDraft.nonce = "reference-nonce-00000053";
  conflictDraft.audience = [SERVICE_ID, "cairn:another-audience"];
  conflictDraft.operation_fingerprint = operationFingerprint(conflictDraft);
  conflictDraft.envelope_hash = ZERO_HASH;
  conflictDraft.signature = signature(AGENT_KEY);
  const conflict = bindAndSign(conflictDraft, AGENT_KEY);
  const result = value.service.handleEnvelope(conflict, value.authentication);
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.ok(result.failures.includes("idempotency_conflict"));
  assert.equal(value.stores.usedNonces.has(conflict.nonce), false);
});

test("every private read operation resolves an owned exact object and consumes its read grant", () => {
  const value = makeHarness();
  const prepared = value.service.handleEnvelope(value.envelope, value.authentication);
  assert.equal(prepared.ok, true);
  const action = value.stores.objectsByRef.get(objectRefKey(prepared.body.action_ref));

  const intent = makeActiveIntent();
  const intentRef = objectRefFor(intent, schemaFor(intent));
  const intentWriteGrant = makeIntentGrant(value.service, intent);
  const intentWriteGrantRef = value.seeder.seedObject(intentWriteGrant, {
    grantState: { status: "active", revocation_nonce: 62, remaining_disclosures: 2 }
  });
  const storedIntent = value.service.handleEnvelope(makeEnvelope({
    operationName: "intent.put",
    body: intent,
    subjectRefs: [intentRef],
    authorizationRefs: [intentWriteGrantRef],
    messageNumber: 111,
    nonce: "reference-nonce-00000111",
    idempotencyKey: "reference-intent-idempotency-0111"
  }), {
    ...value.authentication,
    authorityNamespace: `${PRINCIPAL_ID}|intent.put`
  });
  assert.equal(storedIntent.ok, true);

  const projection = makeProjection();
  const projectionRef = value.seeder.seedObject(projection);
  const cases = [
    ["intent.get", "intent_read", intent, intentRef],
    ["data_grant.get", "grant_read", value.grant, value.grantRef],
    ["projection.get", "projection_read", projection, projectionRef],
    ["object.resolve", "object_resolution", value.effect, objectRefFor(value.effect, schemaFor(value.effect))],
    ["action.get", "action_read", action, prepared.body.action_ref],
    ["receipt.get", "receipt_read", prepared.body, objectRefFor(prepared.body, schemaFor(prepared.body))]
  ];

  for (const [index, [operationName, purpose, object, ref]] of cases.entries()) {
    const grantNumber = 120 + index;
    const readGrant = makeReadGrant(value.service, {
      ref,
      purpose,
      grantNumber,
      maximumDisclosures: 1
    });
    const readGrantRef = value.seeder.seedObject(readGrant, {
      grantState: { status: "active", revocation_nonce: grantNumber, remaining_disclosures: 1 }
    });
    const envelope = makeEnvelope({
      operationName,
      body: { ref, retrieval_uri: value.service.objectUri(ref) },
      authorizationRefs: [readGrantRef],
      messageNumber: 130 + index,
      nonce: `reference-nonce-00000${130 + index}`
    });
    const result = value.service.handleEnvelope(envelope, value.authentication);
    assert.equal(result.ok, true, `${operationName}: ${JSON.stringify(result)}`);
    if (operationName === "object.resolve") {
      assert.deepEqual(result.body, { ref, retrieval_uri: value.service.objectUri(ref), object });
    } else {
      assert.deepEqual(result.body, object);
    }
    assert.equal(value.stores.grantStatesByRef.get(objectRefKey(readGrantRef)).remaining_disclosures, 0);
  }
});

test("replay fails closed when its stored exact result binding is corrupt", () => {
  const value = makeHarness();
  const first = value.service.handleEnvelope(value.envelope, value.authentication);
  assert.equal(first.ok, true);
  const second = value.service.handleEnvelope(
    freshTransport(value.envelope, 93),
    { ...value.authentication, authorityNamespace: `${value.authentication.authorityNamespace}|independent` }
  );
  assert.equal(second.ok, true);
  const firstKey = objectRefKey(objectRefFor(first.body, schemaFor(first.body)));
  value.stores.objectsByRef.set(firstKey, structuredClone(second.body));

  const replay = value.service.handleEnvelope(freshTransport(value.envelope, 94), value.authentication);
  assert.equal(replay.ok, false);
  assert.equal(replay.status, 503);
  assert.equal(replay.code, "idempotency_result_unavailable");
  assert.equal(replay.body, undefined);
});

test("replay result remains bound to the original operation after idempotency-state corruption", () => {
  const value = makeHarness();
  const first = value.service.handleEnvelope(value.envelope, value.authentication);
  const secondEnvelope = newIdempotentAttempt(value.envelope, 138, "reference-idempotency-0138");
  const second = value.service.handleEnvelope(secondEnvelope, value.authentication);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  const firstStateKey = idempotencyRecordKey(
    value.authentication.authorityNamespace,
    value.envelope.idempotency_key
  );
  value.stores.idempotencyRecords.get(firstStateKey).result_ref = objectRefFor(second.body, schemaFor(second.body));
  const replay = value.service.handleEnvelope(freshTransport(value.envelope, 139), value.authentication);
  assert.equal(replay.ok, false);
  assert.equal(replay.status, 503);
  assert.equal(replay.code, "idempotency_result_unavailable");
  assert.equal(replay.body, undefined);
});

test("historical receipts survive later key revocation while new signatures fail", () => {
  const value = makeHarness();
  const first = value.service.handleEnvelope(value.envelope, value.authentication);
  assert.equal(first.ok, true);
  const receiptRef = objectRefFor(first.body, schemaFor(first.body));
  const originalStatus = SERVICE_KEY.status;
  const originalRevocation = SERVICE_KEY.revocation_time;
  SERVICE_KEY.status = "revoked";
  SERVICE_KEY.revocation_time = "2026-07-20T16:45:00Z";
  try {
    const replay = value.service.handleEnvelope(freshTransport(value.envelope, 141), value.authentication);
    assert.equal(replay.ok, true, JSON.stringify(replay));
    assert.deepEqual(replay.body, first.body);

    const readGrant = makeReadGrant(value.service, {
      ref: receiptRef,
      purpose: "receipt_read",
      grantNumber: 142,
      maximumDisclosures: 1
    });
    const readGrantRef = value.seeder.seedObject(readGrant, {
      grantState: { status: "active", revocation_nonce: 142, remaining_disclosures: 1 }
    });
    const receiptRead = value.service.handleEnvelope(makeEnvelope({
      operationName: "receipt.get",
      body: { ref: receiptRef, retrieval_uri: value.service.objectUri(receiptRef) },
      authorizationRefs: [readGrantRef],
      messageNumber: 143,
      nonce: "reference-nonce-00000143"
    }), value.authentication);
    assert.equal(receiptRead.ok, true, JSON.stringify(receiptRead));
    assert.deepEqual(receiptRead.body, first.body);

    const newPreparation = value.service.handleEnvelope(
      newIdempotentAttempt(value.envelope, 144, "reference-idempotency-0144"),
      value.authentication
    );
    assert.equal(newPreparation.ok, false);
    assert.equal(newPreparation.status, 503);
    assert.ok(newPreparation.failures.includes("operation_result_unavailable"));
  } finally {
    SERVICE_KEY.status = originalStatus;
    SERVICE_KEY.revocation_time = originalRevocation;
  }
});

test("historical receipt verification rejects unknown signing-key status values", () => {
  const value = makeHarness();
  const first = value.service.handleEnvelope(value.envelope, value.authentication);
  assert.equal(first.ok, true);
  const originalStatus = SERVICE_KEY.status;
  SERVICE_KEY.status = "compromised";
  try {
    const replay = value.service.handleEnvelope(freshTransport(value.envelope, 146), value.authentication);
    assert.equal(replay.ok, false);
    assert.equal(replay.status, 503);
    assert.equal(replay.code, "idempotency_result_unavailable");
    assert.equal(replay.body, undefined);
  } finally {
    SERVICE_KEY.status = originalStatus;
  }
});

test("historical key verification does not revive an expired private object", () => {
  const value = makeHarness();
  const expiredProjection = makeProjection("2026-07-20T16:15:00Z");
  const historicalSeeder = createReferenceSeeder({
    foundation,
    stores: value.stores,
    keyResolver,
    clock: () => "2026-07-20T16:10:00Z"
  });
  const projectionRef = historicalSeeder.seedObject(expiredProjection);
  const readGrant = makeReadGrant(value.service, {
    ref: projectionRef,
    purpose: "projection_read",
    grantNumber: 145,
    maximumDisclosures: 1
  });
  const readGrantRef = value.seeder.seedObject(readGrant, {
    grantState: { status: "active", revocation_nonce: 145, remaining_disclosures: 1 }
  });
  const result = value.service.handleEnvelope(makeEnvelope({
    operationName: "projection.get",
    body: { ref: projectionRef, retrieval_uri: value.service.objectUri(projectionRef) },
    authorizationRefs: [readGrantRef],
    messageNumber: 146,
    nonce: "reference-nonce-00000146"
  }), value.authentication);
  assert.equal(result.ok, false);
  assert.equal(result.code, "resolved_object_invalid");
  assert.equal(value.stores.grantStatesByRef.get(objectRefKey(readGrantRef)).remaining_disclosures, 1);
});

test("runtime_binding.get resolves only the registered ref at its exact URI", () => {
  const value = makeHarness();
  const retrievalUri = value.service.objectUri(value.runtimeRef);
  const request = makeEnvelope({
    operationName: "runtime_binding.get",
    body: { ref: value.runtimeRef, retrieval_uri: retrievalUri },
    messageNumber: 70,
    nonce: "reference-nonce-00000070"
  });
  const result = value.service.handleEnvelope(request, value.authentication);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, value.runtime);

  const wrongUri = makeEnvelope({
    operationName: "runtime_binding.get",
    body: { ref: value.runtimeRef, retrieval_uri: `${retrievalUri}-substitution` },
    messageNumber: 71,
    nonce: "reference-nonce-00000071"
  });
  const missing = value.service.handleEnvelope(wrongUri, value.authentication);
  assert.equal(missing.ok, false);
  assert.equal(missing.status, 404);
  assert.equal(missing.code, "object_not_found");

  result.body.key_status = "revoked";
  const freshRead = value.service.handleEnvelope(makeEnvelope({
    operationName: "runtime_binding.get",
    body: { ref: value.runtimeRef, retrieval_uri: retrievalUri },
    messageNumber: 73,
    nonce: "reference-nonce-00000073"
  }), value.authentication);
  assert.equal(freshRead.ok, true);
  assert.equal(freshRead.body.key_status, "active", "returned objects must be defensive copies");

  const poison = makeRuntimeBinding(74);
  value.stores.objectsByRef.set(objectRefKey(value.runtimeRef), poison);
  const poisoned = value.service.handleEnvelope(makeEnvelope({
    operationName: "runtime_binding.get",
    body: { ref: value.runtimeRef, retrieval_uri: retrievalUri },
    messageNumber: 75,
    nonce: "reference-nonce-00000075"
  }), value.authentication);
  assert.equal(poisoned.ok, false);
  assert.equal(poisoned.code, "resolved_object_invalid");
});

test("returned bodies cannot alias committed in-memory state", () => {
  const value = makeHarness();
  const key = objectRefKey(value.runtimeRef);
  const before = structuredClone(value.stores.objectsByRef.get(key));
  const result = value.service.handleEnvelope(makeEnvelope({
    operationName: "runtime_binding.get",
    body: { ref: value.runtimeRef, retrieval_uri: value.service.objectUri(value.runtimeRef) },
    messageNumber: 152,
    nonce: "reference-nonce-00000152"
  }), value.authentication);
  assert.equal(result.ok, true);
  result.body.agent_identity.session_id = "caller-mutated-session";
  result.body.key_status = "revoked";
  assert.deepEqual(value.stores.objectsByRef.get(key), before);
});

test("response types remain operation-specific even under corrupted access metadata", () => {
  const value = makeHarness();
  const effectRef = objectRefFor(value.effect, schemaFor(value.effect));
  value.stores.accessByRef.set(objectRefKey(effectRef), { visibility: "public", principal_id: null });
  const result = value.service.handleEnvelope(makeEnvelope({
    operationName: "runtime_binding.get",
    body: { ref: effectRef, retrieval_uri: value.service.objectUri(effectRef) },
    messageNumber: 76,
    nonce: "reference-nonce-00000076"
  }), value.authentication);
  assert.equal(result.ok, false);
  assert.equal(result.code, "response_schema_mismatch");
});

test("memory transactions roll back every map and nonce when commit is false", () => {
  const stores = new MemoryReferenceStores();
  stores.grantStatesByRef.set("existing", { status: "active", remaining_disclosures: 2 });
  const mapNames = [
    "objectsByRef",
    "refsByIdentity",
    "urisByRef",
    "accessByRef",
    "runtimeBindingsByKey",
    "dataGrantsByRef",
    "grantStatesByRef",
    "effectDescriptorsByRef",
    "idempotencyRecords"
  ];
  stores.transaction((draft) => {
    for (const name of mapNames) draft[name].set("transient", { changed: true });
    draft.grantStatesByRef.get("existing").remaining_disclosures = 0;
    draft.usedNonces.add("transient-nonce");
    return { commit: false, value: "rolled-back" };
  });
  for (const name of mapNames) assert.equal(stores[name].has("transient"), false, name);
  assert.equal(stores.grantStatesByRef.get("existing").remaining_disclosures, 2);
  assert.equal(stores.usedNonces.size, 0);
});

test("trusted seeding is insert-only and cannot resurrect a consumed grant", () => {
  const value = makeHarness();
  const key = objectRefKey(value.grantRef);
  value.stores.grantStatesByRef.get(key).remaining_disclosures = 0;
  assert.throws(() => value.seeder.seedObject(value.grant, {
    grantState: { status: "active", revocation_nonce: 2, remaining_disclosures: 2 }
  }), /insert-only/);
  assert.equal(value.stores.grantStatesByRef.get(key).remaining_disclosures, 0);
  assert.throws(() => value.seeder.seedObject(value.proposal), /not seedable/);
  const conflictingRuntime = makeRuntimeBinding(151);
  const conflictingRuntimeRef = objectRefFor(conflictingRuntime, schemaFor(conflictingRuntime));
  assert.throws(() => value.seeder.seedObject(conflictingRuntime), /runtime binding identity fork/);
  assert.equal(value.stores.objectsByRef.has(objectRefKey(conflictingRuntimeRef)), false);
});

test("service-generated object identities cannot fork across new operations", () => {
  const constantId = uuid(97);
  const value = makeHarness({ idFactory: () => constantId });
  const first = value.service.handleEnvelope(value.envelope, value.authentication);
  assert.equal(first.ok, true);
  const beforeObjects = value.stores.objectsByRef.size;
  const beforeGrant = value.stores.grantStatesByRef.get(objectRefKey(value.grantRef)).remaining_disclosures;
  const second = value.service.handleEnvelope(
    newIdempotentAttempt(value.envelope, 98, "reference-idempotency-0098"),
    value.authentication
  );
  assert.equal(second.ok, false);
  assert.equal(second.status, 503);
  assert.equal(second.code, "reference_service_failure");
  assert.equal(value.stores.objectsByRef.size, beforeObjects);
  assert.equal(value.stores.grantStatesByRef.get(objectRefKey(value.grantRef)).remaining_disclosures, beforeGrant);
});

test("HTTP facade keeps capabilities public and enforces route, media, version, and idempotency boundaries", async (t) => {
  const value = makeHarness();
  let authenticationCalls = 0;
  const handler = createReferenceHttpHandler({
    service: value.service,
    authenticateRequest: async () => {
      authenticationCalls += 1;
      return value.authentication;
    }
  });
  const server = createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const capabilities = await fetch(`${base}/cairn/0.1/capabilities`);
  assert.equal(capabilities.status, 200);
  assert.match(capabilities.headers.get("content-type"), /^application\/json/);
  assert.equal(capabilities.headers.get("cache-control"), "no-store");
  assert.match(capabilities.headers.get("link"), /rel="profile"/);
  assert.deepEqual((await capabilities.json()).operations, value.service.capabilities().operations);
  assert.equal(authenticationCalls, 0);

  const wrongRoute = await fetch(`${base}/cairn/0.1/action/execute`, { method: "POST" });
  assert.equal(wrongRoute.status, 404);
  assert.equal((await wrongRoute.json()).error, "route_not_found");
  const wrongMethod = await fetch(`${base}/cairn/0.1/messages`);
  assert.equal(wrongMethod.status, 404);
  assert.equal((await wrongMethod.json()).error, "route_not_found");

  const wrongMedia = await fetch(`${base}/cairn/0.1/messages`, {
    method: "POST",
    headers: { "content-type": "text/plain", "cairn-protocol-version": "0.1" },
    body: "{}"
  });
  assert.equal(wrongMedia.status, 415);
  assert.equal((await wrongMedia.json()).error, "unsupported_content_type");
  const deceptiveMedia = await fetch(`${base}/cairn/0.1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json.evil", "cairn-protocol-version": "0.1" },
    body: "{}"
  });
  assert.equal(deceptiveMedia.status, 415);
  assert.equal((await deceptiveMedia.json()).error, "unsupported_content_type");

  const wrongVersion = await fetch(`${base}/cairn/0.1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "cairn-protocol-version": "0.2" },
    body: "{}"
  });
  assert.equal(wrongVersion.status, 400);
  assert.equal((await wrongVersion.json()).error, "protocol_version_mismatch");

  const missingIdempotencyHeader = await fetch(`${base}/cairn/0.1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "cairn-protocol-version": "0.1" },
    body: JSON.stringify(value.envelope)
  });
  assert.equal(missingIdempotencyHeader.status, 400);
  assert.equal((await missingIdempotencyHeader.json()).error, "idempotency_header_mismatch");
  const mismatchedIdempotencyHeader = await fetch(`${base}/cairn/0.1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cairn-protocol-version": "0.1",
      "idempotency-key": "different-idempotency-key"
    },
    body: JSON.stringify(value.envelope)
  });
  assert.equal(mismatchedIdempotencyHeader.status, 400);
  assert.equal((await mismatchedIdempotencyHeader.json()).error, "idempotency_header_mismatch");
  assert.equal(authenticationCalls, 0, "rejected protocol negotiation must precede authentication");

  const retrievalUri = value.service.objectUri(value.runtimeRef);
  const readEnvelope = makeEnvelope({
    operationName: "runtime_binding.get",
    body: { ref: value.runtimeRef, retrieval_uri: retrievalUri },
    messageNumber: 72,
    nonce: "reference-nonce-00000072"
  });
  const accepted = await fetch(`${base}/cairn/0.1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "cairn-protocol-version": "0.1" },
    body: JSON.stringify(readEnvelope)
  });
  assert.equal(accepted.status, 200, await accepted.clone().text());
  assert.deepEqual(await accepted.json(), value.runtime);
  assert.equal(authenticationCalls, 1);

  const malformed = await fetch(`${base}/cairn/0.1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "cairn-protocol-version": "0.1" },
    body: "{"
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error, "invalid_json");

  const serialized = JSON.stringify(readEnvelope);
  const duplicatePrincipal = serialized.replace(
    `"principal_id":"${PRINCIPAL_ID}"`,
    `"principal_id":"${PRINCIPAL_ID}","principal_id":"${OTHER_PRINCIPAL_ID}"`
  );
  const duplicate = await fetch(`${base}/cairn/0.1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "cairn-protocol-version": "0.1" },
    body: duplicatePrincipal
  });
  assert.equal(duplicate.status, 400);
  assert.equal((await duplicate.json()).error, "invalid_json");

  const invalidUtf8 = await fetch(`${base}/cairn/0.1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "cairn-protocol-version": "0.1" },
    body: new Uint8Array([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d])
  });
  assert.equal(invalidUtf8.status, 400);
  assert.equal((await invalidUtf8.json()).error, "invalid_json");
  assert.equal(authenticationCalls, 1, "invalid JSON must never reach authentication");
});

test("HTTP body limits and authentication errors fail before service dispatch", async (t) => {
  const value = makeHarness();
  let authenticationCalls = 0;
  const handler = createReferenceHttpHandler({
    service: value.service,
    maximumBytes: 8,
    authenticateRequest: async () => {
      authenticationCalls += 1;
      throw new Error("no session");
    }
  });
  const server = createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const tooLarge = await fetch(`${base}/cairn/0.1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "cairn-protocol-version": "0.1" },
    body: '{"more":"than-eight-bytes"}'
  });
  assert.equal(tooLarge.status, 413);
  assert.equal((await tooLarge.json()).error, "request_too_large");
  assert.equal(authenticationCalls, 0);
  const unauthenticated = await fetch(`${base}/cairn/0.1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "cairn-protocol-version": "0.1" },
    body: "{}"
  });
  assert.equal(unauthenticated.status, 401);
  assert.equal((await unauthenticated.json()).error, "authentication_failed");
  assert.equal(authenticationCalls, 1);
});
