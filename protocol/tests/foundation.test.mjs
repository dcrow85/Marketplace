import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { generateKeyPairSync, sign as signBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { auditSources, buildBundle, loadSources } from "../lib/bundle.mjs";
import { FOUNDATION_DATA_GRANT_USES, SIGNED_OBJECT_ANNOTATIONS } from "../lib/foundation-profile.mjs";
import {
  bindObjectHash,
  bodyHash,
  canonicalHash,
  canonicalText,
  assertIJson,
  objectRefFor,
  objectHash,
  sameObjectRef,
  semanticHash,
  signatureInput,
  utf8Sorted,
  valueAtPointer,
  verifyEd25519,
  verifyObjectBindings
} from "../lib/core.mjs";
import {
  acceptEnvelopeOperation,
  consumeContinuationDisclosure,
  operationFingerprint,
  validateCapabilitiesResponse,
  validateDataGrant,
  validateContinuationBinding,
  validateEnvelopeOperation,
  validatePreparationReceipt,
  validateProposalEffectBinding,
  validateResolvedObjectResponse,
  validateRuntimeBinding,
  validateSignedObject
} from "../lib/validation.mjs";
import { createAjv, readJson } from "../lib/schemas.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sources = await loadSources(root);
const ajv = createAjv(sources.schemas);
const fixture = await readJson(path.join(root, "fixtures", "proposal-only-identities.json"));
const registry = sources.registry;
const schemaByObjectId = new Map(
  sources.schemas
    .filter(({ document }) => document["x-cairn-object-schema"])
    .map(({ document }) => [document["x-cairn-object-schema"], document])
);

const ZERO_HASH = `sha-256:${"0".repeat(64)}`;
const HASH_A = `sha-256:${"a".repeat(64)}`;
const HASH_B = `sha-256:${"b".repeat(64)}`;
const CREATED = "2026-07-20T16:00:00Z";
const EXPIRES = "2026-07-20T17:00:00Z";

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

const AGENT_KEY = testKey(fixture.agent_identity.runtime_instance_key_id, fixture.agent_identity.agent_provider_id);
const PROVIDER_KEY = testKey("https://agent.example/keys/provider-1", fixture.agent_identity.agent_provider_id);
const PRINCIPAL_KEY = testKey("did:example:collector#key-1", fixture.principal_id);
const SERVICE_KEY = testKey("https://objects.example/keys/service-1", "cairn:action-service");
const keyResolver = new Map([AGENT_KEY, PROVIDER_KEY, PRINCIPAL_KEY, SERVICE_KEY].map((key) => [key.key_id, key]));

function uuid(number) {
  return `urn:uuid:00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

function signature(key = AGENT_KEY) {
  return {
    profile: "cairn-ed25519-v0.1",
    key_id: key.key_id,
    signed_hash: ZERO_HASH,
    signed_at: CREATED,
    value: "A".repeat(86)
  };
}

function ref(schema, number, object_hash = HASH_A) {
  return { schema, object_id: uuid(number), object_hash };
}

function schemaFor(object) {
  const schema = schemaByObjectId.get(object.schema);
  assert.ok(schema, `missing schema for ${object.schema}`);
  return schema;
}

function bindAndSign(object, key) {
  const schema = schemaFor(object);
  const bound = bindObjectHash(object, schema);
  const pointer = schema["x-cairn-signature-pointers"][0];
  const proof = valueAtPointer(bound, pointer);
  proof.value = signBytes(null, signatureInput(object.schema, proof.signed_hash), key.privateKey).toString("base64url");
  return bound;
}

function validationContext(extra = {}) {
  return {
    ajv,
    schemasByObjectId: schemaByObjectId,
    keyResolver,
    now: "2026-07-20T16:30:00Z",
    ...extra
  };
}

function assertSchemaValid(object) {
  const validate = ajv.getSchema(schemaFor(object).$id);
  assert.equal(validate(object), true, JSON.stringify(validate.errors, null, 2));
}

function makeEffect(overrides = {}) {
  const schema = schemaByObjectId.get("cairn.effect_descriptor.v0.1");
  const effect = {
    schema: "cairn.effect_descriptor.v0.1",
    effect_descriptor_id: uuid(20),
    executor_target: "cairn:executor:proposal-only",
    effect_semantics: {
      principal_id: fixture.principal_id,
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
    descriptor_issuer_signature: signature(SERVICE_KEY),
    not_claiming: ["receiver_effect", "authority_to_act", "global_exactly_once"],
    ...overrides
  };
  effect.effect_id = semanticHash(effect, schema);
  return bindAndSign(effect, SERVICE_KEY);
}

function makeProposal(effect = makeEffect()) {
  const proposal = {
    schema: "cairn.action_proposal.v0.1",
    action_proposal_id: uuid(21),
    principal_id: fixture.principal_id,
    agent_identity: structuredClone(fixture.agent_identity),
    capability: "prepare",
    deal_id: null,
    expected_deal_head_hash: null,
    target: effect.executor_target,
    ultimate_effect_recipient: null,
    ultimate_effect_account_commitment: null,
    effect_operation_kind: effect.effect_semantics.operation_kind,
    effect_provider_id: effect.effect_semantics.provider_id,
    copy_ids: structuredClone(effect.effect_semantics.copy_ids),
    resource_refs: [
      ref("cairn.active_intent.v0.1", 10),
      ref("cairn.effect_descriptor.v0.1", 20, effect.descriptor_hash)
    ],
    inputs_hash: HASH_A,
    terms_or_cart_hash: effect.effect_semantics.closed_terms_or_cart_hash,
    evidence_snapshot_hash: null,
    amounts: [],
    rail: null,
    requested_execution_mode: "supervised",
    authority_candidate_ref: null,
    effect_descriptor_ref: ref("cairn.effect_descriptor.v0.1", 20, effect.descriptor_hash),
    effect_id: effect.effect_id,
    unknowns: [],
    not_claiming: ["authority_to_act", "external_effect"],
    created_at: CREATED,
    expires_at: EXPIRES,
    action_proposal_hash: ZERO_HASH,
    agent_signature: signature(AGENT_KEY)
  };
  return bindAndSign(proposal, AGENT_KEY);
}

function makeDraftAction(proposal = makeProposal()) {
  const action = {
    schema: "cairn.action_record.v0.1",
    action_id: uuid(22),
    action_proposal_ref: ref("cairn.action_proposal.v0.1", 21, proposal.action_proposal_hash),
    principal_id: fixture.principal_id,
    capability: "prepare",
    authorization_ref: null,
    reservation_refs: [],
    gate_result_ref: null,
    expected_deal_head_hash: null,
    effect_id: proposal.effect_id,
    idempotency_key: "fixture-idempotency-0001",
    current_state: "draft",
    state_version: 0,
    last_transition_receipt_ref: null,
    previous_action_ref: null,
    materialized_from_receipt_hash: null,
    created_at: CREATED,
    updated_at: CREATED,
    action_hash: ZERO_HASH,
    action_service_signature: signature(SERVICE_KEY),
    not_claiming: ["receiver_effect_before_confirmation"]
  };
  return bindAndSign(action, SERVICE_KEY);
}

function makePreparationReceipt(action = makeDraftAction(), proposal = makeProposal()) {
  const receipt = {
    schema: "cairn.action_preparation_receipt.v0.1",
    receipt_id: uuid(23),
    action_ref: ref("cairn.action_record.v0.1", 22, action.action_hash),
    action_proposal_ref: ref("cairn.action_proposal.v0.1", 21, proposal.action_proposal_hash),
    state_before: "draft",
    state_after: "prepared",
    prepared_for_principal: fixture.principal_id,
    prepared_by_agent: structuredClone(fixture.agent_identity),
    external_effect: false,
    issued_at: CREATED,
    issuer: "cairn:action-service",
    prior_receipt_or_event_hash: null,
    receipt_hash: ZERO_HASH,
    issuer_signature: signature(SERVICE_KEY),
    not_claiming: ["authority_to_act", "external_effect"]
  };
  return bindAndSign(receipt, SERVICE_KEY);
}

function makeJudgment() {
  const judgment = {
    schema: "cairn.agent_judgment.v0.1",
    judgment_id: uuid(30),
    agent_identity: structuredClone(fixture.agent_identity),
    principal_id: fixture.principal_id,
    purpose: "compare_offer",
    input_refs: [ref("cairn.active_intent.v0.1", 10)],
    observations: [
      {
        code: "listed_ask_observed",
        statement: "The listing names a 12 USD ask.",
        source_refs: [ref("cairn.closed_terms.v0.1", 31)]
      }
    ],
    inferences: [
      {
        code: "evidence_is_limited",
        statement: "The current record is insufficient for a condition conclusion.",
        based_on: ["listed_ask_observed"],
        confidence_basis: "Only the typed listing input is present."
      }
    ],
    recommendation: {
      kind: "next_step",
      summary: "Ask for a front and back scan before deciding.",
      proposed_capability: "request_evidence"
    },
    alternatives: [
      { kind: "abstain", summary: "Wait for more evidence.", proposed_capability: null }
    ],
    unknowns: [
      {
        code: "copy_condition_unknown",
        description: "No exact-copy scans are attached.",
        blocking_capabilities: ["accept_terms"]
      }
    ],
    stale_if: [{ field: "evidence_snapshot_hash", expected: HASH_A }],
    authority_label: "judged",
    created_at: CREATED,
    expires_at: EXPIRES,
    judgment_hash: ZERO_HASH,
    issuer_signature: signature(AGENT_KEY),
    not_claiming: ["authority_to_act", "physical_truth", "future_market_outcome"]
  };
  return bindAndSign(judgment, AGENT_KEY);
}

function makeContinuation() {
  const runtime = bindAndSign({
    schema: "cairn.agent_runtime_binding.v0.1",
    runtime_binding_id: uuid(41),
    agent_identity: structuredClone(fixture.agent_identity),
    runtime_public_key: {
      profile: "cairn-ed25519-v0.1",
      key_id: AGENT_KEY.key_id,
      public_key: AGENT_KEY.public_key
    },
    key_status: "active",
    not_before: "2026-07-20T15:00:00Z",
    expires_at: "2026-07-20T18:00:00Z",
    runtime_binding_hash: ZERO_HASH,
    provider_signature: signature(PROVIDER_KEY),
    not_claiming: ["model_or_policy_attestation", "principal_authority", "personhood"]
  }, PROVIDER_KEY);
  const runtimeRef = objectRefFor(runtime, schemaFor(runtime));
  const intentRef = ref("cairn.active_intent.v0.1", 10);
  const controlRef = ref("cairn.intent_control_event.v0.1", 45);
  const grantHeadRef = ref("cairn.data_grant.v0.1", 40);
  const unknownRef = ref("cairn.unknown.v0.1", 46);
  const privateEntry = (objectRef, suffix, dataGrantRef = null) => ({
    ref: objectRef,
    retrieval_uri: `https://objects.example/${suffix}`,
    data_grant_ref: dataGrantRef
  });
  const unboundResources = [
    { ...privateEntry(runtimeRef, "runtime-binding"), resource_kind: "runtime_binding" },
    { ...privateEntry(intentRef, "intent"), resource_kind: "object" },
    { ...privateEntry(controlRef, "intent-head"), resource_kind: "control_head" },
    { ...privateEntry(grantHeadRef, "grant-head"), resource_kind: "grant_head" },
    { ...privateEntry(unknownRef, "unknown"), resource_kind: "object" }
  ];
  const grant = bindAndSign({
    schema: "cairn.data_grant.v0.1",
    grant_id: uuid(40),
    principal_id: fixture.principal_id,
    recipient: AGENT_KEY.key_id,
    resource_scopes: unboundResources.map(({ resource_kind, ref: objectRef, retrieval_uri }) => ({
      resource_kind,
      ref: objectRef,
      retrieval_uri,
      field_paths: [""]
    })),
    uses: ["read_local"],
    purpose: "agent_continuation",
    audience: [AGENT_KEY.key_id],
    maximum_disclosures: 1,
    retention: { expires_at: EXPIRES, deletion_terms: "Delete when this continuation expires." },
    revocation_nonce: 7,
    disclosure_ledger_namespace: "fixture-continuations",
    issued_at: CREATED,
    expires_at: EXPIRES,
    grant_hash: ZERO_HASH,
    principal_signature: signature(PRINCIPAL_KEY),
    not_claiming: ["external_deletion_enforced"]
  }, PRINCIPAL_KEY);
  const grantRef = objectRefFor(grant, schemaFor(grant));
  const withGrant = (entry) => ({ ...entry, data_grant_ref: grantRef });
  const bundle = {
    schema: "cairn.continuation_bundle.v0.1",
    bundle_id: uuid(42),
    principal_id: fixture.principal_id,
    recipient_runtime_binding: withGrant(privateEntry(runtimeRef, "runtime-binding")),
    schema_bundle: {
      ref: ref("cairn.machine_bundle.v0.1", 43),
      retrieval_uri: "https://cairn.cards/protocol/v0.1/bundle.json",
      data_grant_ref: null
    },
    object_service_manifest: {
      ref: ref("cairn.object_service_manifest.v0.1", 44),
      retrieval_uri: "https://objects.example/.well-known/cairn.json",
      data_grant_ref: null
    },
    items: [
      {
        ...withGrant(privateEntry(intentRef, "intent")),
        required_for: "state"
      }
    ],
    current_intent_control_heads: [
      withGrant(privateEntry(controlRef, "intent-head"))
    ],
    current_deal_heads: [],
    current_action_reservation_service_refs: [],
    current_grant_status_and_revocation_refs: [
      withGrant(privateEntry(grantHeadRef, "grant-head"))
    ],
    unresolved_unknown_refs: [
      withGrant(privateEntry(unknownRef, "unknown"))
    ],
    issued_at: CREATED,
    expires_at: EXPIRES,
    bundle_hash: ZERO_HASH,
    issuer_signature: signature(SERVICE_KEY),
    not_claiming: ["authority_transfer"]
  };
  const boundBundle = bindAndSign(bundle, SERVICE_KEY);
  const bundleRef = objectRefFor(boundBundle, schemaFor(boundBundle));
  const deliveryEnvelopeHash = HASH_B;
  const authorization = {
    schema: "cairn.continuation_disclosure_authorization.v0.1",
    authorization_id: uuid(47),
    principal_id: fixture.principal_id,
    recipient_actor_id: AGENT_KEY.key_id,
    recipient_runtime_binding_ref: runtimeRef,
    recipient_runtime_binding_hash: runtimeRef.object_hash,
    bundle_ref: bundleRef,
    bundle_hash: boundBundle.bundle_hash,
    delivery_envelope_hash: deliveryEnvelopeHash,
    disclosure_reservation: {
      ledger_namespace: "fixture-continuations",
      reservation_id: uuid(48),
      fencing_token: 3,
      principal_revocation_nonce: 11,
      single_use_nonce: "fixture-disclosure-nonce-0001"
    },
    data_grant_refs: [grantRef],
    purpose: "agent_continuation",
    one_shot: true,
    issued_at: CREATED,
    expires_at: EXPIRES,
    authorization_hash: ZERO_HASH,
    principal_signature: signature(PRINCIPAL_KEY),
    not_claiming: ["authority_transfer", "mandate_transfer"]
  };
  const boundAuthorization = bindAndSign(authorization, PRINCIPAL_KEY);
  const authorizationRef = objectRefFor(boundAuthorization, schemaFor(boundAuthorization));
  const disclosureLedger = new Map([["fixture-continuations|urn:uuid:00000000-0000-4000-8000-000000000048", {
    schema: "cairn.continuation_disclosure_reservation_state.v0.1",
    ledger_namespace: "fixture-continuations",
    reservation_id: uuid(48),
    ledger_sequence: 1,
    principal_id: fixture.principal_id,
    state: "active",
    fencing_token: 3,
    single_use_nonce: "fixture-disclosure-nonce-0001",
    authorization_ref: authorizationRef,
    authorization_hash: boundAuthorization.authorization_hash,
    bundle_ref: bundleRef,
    bundle_hash: boundBundle.bundle_hash,
    recipient_actor_id: AGENT_KEY.key_id,
    runtime_binding_ref: runtimeRef,
    runtime_binding_hash: runtime.runtime_binding_hash,
    delivery_envelope_hash: deliveryEnvelopeHash,
    principal_revocation_nonce: 11,
    data_grant_refs: [grantRef],
    reserved_count: 1,
    created_at: CREATED,
    expires_at: EXPIRES,
    consumed_at: null
  }]]);
  const grantStatesByRef = new Map([[`${grantRef.schema}|${grantRef.object_id}|${grantRef.object_hash}`, {
    status: "active",
    revocation_nonce: 7,
    remaining_disclosures: 1
  }]]);
  const publicRefsByRef = new Map([
    [`${boundBundle.schema_bundle.ref.schema}|${boundBundle.schema_bundle.ref.object_id}|${boundBundle.schema_bundle.ref.object_hash}`, boundBundle.schema_bundle.retrieval_uri],
    [`${boundBundle.object_service_manifest.ref.schema}|${boundBundle.object_service_manifest.ref.object_id}|${boundBundle.object_service_manifest.ref.object_hash}`, boundBundle.object_service_manifest.retrieval_uri]
  ]);
  const context = validationContext({
    runtimeBinding: runtime,
    dataGrantsByRef: new Map([[`${grantRef.schema}|${grantRef.object_id}|${grantRef.object_hash}`, grant]]),
    grantStatesByRef,
    publicRefsByRef,
    disclosureLedger,
    principalRevocationNonce: 11,
    deliveryEnvelopeHash
  });
  return { bundle: boundBundle, authorization: boundAuthorization, runtime, grant, context };
}

function makeRuntimeBinding() {
  return bindAndSign({
    schema: "cairn.agent_runtime_binding.v0.1",
    runtime_binding_id: uuid(60),
    agent_identity: structuredClone(fixture.agent_identity),
    runtime_public_key: { profile: "cairn-ed25519-v0.1", key_id: AGENT_KEY.key_id, public_key: AGENT_KEY.public_key },
    key_status: "active",
    not_before: "2026-07-20T15:00:00Z",
    expires_at: "2026-07-20T18:00:00Z",
    runtime_binding_hash: ZERO_HASH,
    provider_signature: signature(PROVIDER_KEY),
    not_claiming: ["model_or_policy_attestation", "principal_authority", "personhood"]
  }, PROVIDER_KEY);
}

function makeEnvelopeCase(effect = makeEffect(), proposal = makeProposal(effect)) {
  const operation = registry.operations.find(({ name }) => name === "action.prepare");
  const runtimeBinding = makeRuntimeBinding();
  const proposalRef = objectRefFor(proposal, schemaFor(proposal));
  const resourceUrisByRef = new Map();
  for (const [index, objectRef] of [proposalRef, ...proposal.resource_refs].entries()) {
    resourceUrisByRef.set(`${objectRef.schema}|${objectRef.object_id}|${objectRef.object_hash}`, `https://objects.example/action-resource-${index}`);
  }
  const grant = bindAndSign({
    schema: "cairn.data_grant.v0.1",
    grant_id: uuid(61),
    principal_id: fixture.principal_id,
    recipient: fixture.agent_identity.agent_provider_id,
    resource_scopes: [proposalRef, ...proposal.resource_refs].map((objectRef) => ({
      resource_kind: "object",
      ref: objectRef,
      retrieval_uri: resourceUrisByRef.get(`${objectRef.schema}|${objectRef.object_id}|${objectRef.object_hash}`),
      field_paths: [""]
    })),
    uses: ["derive"],
    purpose: "action_preparation",
    audience: [fixture.agent_identity.agent_provider_id],
    maximum_disclosures: 2,
    retention: { expires_at: EXPIRES, deletion_terms: "Delete when the operation expires." },
    revocation_nonce: 2,
    disclosure_ledger_namespace: "fixture-envelope-grants",
    issued_at: CREATED,
    expires_at: EXPIRES,
    grant_hash: ZERO_HASH,
    principal_signature: signature(PRINCIPAL_KEY),
    not_claiming: ["external_deletion_enforced"]
  }, PRINCIPAL_KEY);
  const grantRef = objectRefFor(grant, schemaFor(grant));
  const descriptorKey = `${proposal.effect_descriptor_ref.schema}|${proposal.effect_descriptor_ref.object_id}|${proposal.effect_descriptor_ref.object_hash}`;
  const envelope = {
    schema: "cairn.envelope.v0.1",
    protocol_version: "0.1",
    message_id: uuid(50),
    message_type: "action.prepare",
    created_at: CREATED,
    expires_at: EXPIRES,
    sender: {
      actor_id: fixture.agent_identity.agent_provider_id,
      runtime_key_id: fixture.agent_identity.runtime_instance_key_id
    },
    principal_id: fixture.principal_id,
    audience: ["cairn:action-service"],
    subject_refs: [proposalRef],
    authorization_refs: [grantRef],
    nonce: "fixture-nonce-00000001",
    idempotency_key: "fixture-idempotency-0001",
    operation_fingerprint: ZERO_HASH,
    critical_extensions: [],
    body_schema: operation.request_schema,
    body: proposal,
    body_hash: canonicalHash(proposal),
    trace: { parent_message_id: null, correlation_id: "fixture-workflow-1" },
    envelope_hash: ZERO_HASH,
    signature: signature(AGENT_KEY)
  };
  envelope.operation_fingerprint = operationFingerprint(envelope);
  const bound = bindAndSign(envelope, AGENT_KEY);
  const grantKey = `${grantRef.schema}|${grantRef.object_id}|${grantRef.object_hash}`;
  const context = validationContext({
    registry,
    expectedAudience: "cairn:action-service",
    authorityNamespace: `${fixture.principal_id}|action.prepare`,
    runtimeBinding,
    dataGrantsByRef: new Map([[grantKey, grant]]),
    grantStatesByRef: new Map([[grantKey, { status: "active", revocation_nonce: 2, remaining_disclosures: 2 }]]),
    effectDescriptorsByRef: new Map([[descriptorKey, effect]]),
    resourceUrisByRef,
    usedNonces: new Set(),
    idempotencyRecords: new Map()
  });
  return { envelope: bound, context, grant, runtimeBinding };
}

test("all schemas and registered operation references compile", () => {
  for (const { document, name } of sources.schemas) {
    assert.equal(ajv.validateSchema(document), true, name);
    assert.ok(ajv.getSchema(document.$id), name);
  }
  for (const operation of registry.operations) {
    assert.ok(ajv.getSchema(operation.request_schema), operation.name);
    assert.ok(ajv.getSchema(operation.response_schema), operation.name);
  }
});

test("canonicalization vectors reproduce exact bytes and hashes", async () => {
  const vectors = await readJson(path.join(root, "vectors", "canonicalization-vectors.json"));
  for (const vector of vectors.vectors) {
    assert.equal(canonicalText(vector.input), vector.canonical, vector.name);
    assert.equal(canonicalHash(vector.input), vector.hash, vector.name);
  }
});

test("Ed25519 vector verifies only for the bound domain, schema, and hash", async () => {
  const { vectors } = await readJson(path.join(root, "vectors", "ed25519-vectors.json"));
  const vector = vectors[0];
  assert.equal(signatureInput(vector.schema_id, vector.object_hash).toString("ascii"), vector.payload);
  assert.equal(
    verifyEd25519({
      schemaId: vector.schema_id,
      objectHash: vector.object_hash,
      publicKey: vector.public_key,
      signature: vector.signature
    }),
    true
  );
  assert.equal(
    verifyEd25519({ ...vector, schemaId: "cairn.agent_judgment.v0.1", objectHash: vector.object_hash, publicKey: vector.public_key }),
    false
  );
  assert.equal(
    verifyEd25519({ schemaId: vector.schema_id, objectHash: HASH_A, publicKey: vector.public_key, signature: vector.signature }),
    false
  );
});

test("signed-object hash authenticates signature metadata and excludes only proof bytes", () => {
  const proposal = makeProposal();
  assertSchemaValid(proposal);
  assert.deepEqual(verifyObjectBindings(proposal, schemaFor(proposal)), []);
  const changedProof = structuredClone(proposal);
  changedProof.agent_signature.value = "A".repeat(86);
  assert.equal(objectHash(changedProof, schemaFor(proposal)), proposal.action_proposal_hash);
  changedProof.agent_signature.key_id = "https://agent.example/keys/substitute";
  assert.notEqual(objectHash(changedProof, schemaFor(proposal)), proposal.action_proposal_hash);
  changedProof.agent_signature.key_id = proposal.agent_signature.key_id;
  changedProof.target = "cairn:different-target";
  assert.notEqual(objectHash(changedProof, schemaFor(proposal)), proposal.action_proposal_hash);
});

test("effect identity follows semantics, not descriptor UUID or executor", () => {
  const effect = makeEffect();
  assertSchemaValid(effect);
  assert.deepEqual(verifyObjectBindings(effect, schemaFor(effect)), []);

  const moved = structuredClone(effect);
  moved.effect_descriptor_id = uuid(99);
  moved.executor_target = "cairn:executor:replacement";
  moved.descriptor_hash = ZERO_HASH;
  moved.descriptor_issuer_signature.signed_hash = ZERO_HASH;
  const rebound = bindObjectHash(moved, schemaFor(moved));
  assert.equal(rebound.effect_id, effect.effect_id);
  assert.notEqual(rebound.descriptor_hash, effect.descriptor_hash);
});

test("proposal and effect descriptor must agree across every typed binding", () => {
  const effect = makeEffect();
  const proposal = makeProposal(effect);
  assert.deepEqual(validateProposalEffectBinding(proposal, effect), []);

  const forked = structuredClone(proposal);
  forked.effect_id = HASH_B;
  forked.effect_descriptor_ref.object_hash = HASH_B;
  assert.ok(validateProposalEffectBinding(forked, effect).includes("effect_descriptor_ref_mismatch"));
  assert.ok(validateProposalEffectBinding(forked, effect).includes("effect_id_mismatch"));
});

test("effect copy order, duplicate copies, and semantic forks fail", () => {
  const schema = schemaByObjectId.get("cairn.effect_descriptor.v0.1");
  const reversed = makeEffect();
  reversed.effect_semantics.copy_ids = ["copy-b", "copy-a"];
  assert.equal(ajv.getSchema(schema.$id)(reversed), false);

  const duplicated = makeEffect();
  duplicated.effect_semantics.copy_ids = ["copy-a", "copy-a"];
  assert.equal(ajv.getSchema(schema.$id)(duplicated), false);

  const fork = makeEffect();
  fork.effect_semantics.amounts_by_role.charged_total = { amount_minor: 1200, asset: "USD" };
  assert.ok(verifyObjectBindings(fork, schema).includes("semantic_hash_mismatch"));
});

test("judgment remains judged and cannot smuggle execution fields", () => {
  const judgment = makeJudgment();
  assertSchemaValid(judgment);
  assert.deepEqual(verifyObjectBindings(judgment, schemaFor(judgment)), []);

  const elevated = structuredClone(judgment);
  elevated.authority_label = "enforced";
  assert.equal(ajv.getSchema(schemaFor(elevated).$id)(elevated), false);

  const smuggled = structuredClone(judgment);
  smuggled.recommendation.execute_now = true;
  assert.equal(ajv.getSchema(schemaFor(smuggled).$id)(smuggled), false);
});

test("action proposal cannot claim authorization or an external effect", () => {
  const proposal = makeProposal();
  assertSchemaValid(proposal);
  const authorityLaundering = structuredClone(proposal);
  authorityLaundering.authorized = true;
  assert.equal(ajv.getSchema(schemaFor(proposal).$id)(authorityLaundering), false);

  const claimLaundering = structuredClone(proposal);
  claimLaundering.not_claiming = [];
  assert.equal(ajv.getSchema(schemaFor(proposal).$id)(claimLaundering), false);

  const duplicateAmountRoles = structuredClone(proposal);
  duplicateAmountRoles.amounts = [
    { role: "quoted_total", money: { amount_minor: 1200, asset: "USD" } },
    { role: "quoted_total", money: { amount_minor: 1200, asset: "USD" } }
  ];
  assert.equal(ajv.getSchema(schemaFor(proposal).$id)(duplicateAmountRoles), false);
});

test("preparation receipt is explicit that nothing was sent", () => {
  const proposal = makeProposal();
  const action = makeDraftAction(proposal);
  const receipt = makePreparationReceipt(action, proposal);
  assertSchemaValid(action);
  assertSchemaValid(receipt);
  assert.equal(receipt.state_before, "draft");
  assert.equal(receipt.state_after, "prepared");
  assert.equal(receipt.external_effect, false);

  const falseClaim = structuredClone(receipt);
  falseClaim.external_effect = true;
  assert.equal(ajv.getSchema(schemaFor(receipt).$id)(falseClaim), false);
});

test("operation registry exposes preparation but no authorization or execution", () => {
  const prepare = registry.operations.find(({ name }) => name === "action.prepare");
  assert.equal(prepare.consequence, "preparation_only");
  assert.equal(prepare.authority_effect, "none");
  assert.equal(prepare.authorization_requirement, "data_grant_and_signed_proposal");
  assert.equal(prepare.implementation_status, "schema_only");
  assert.equal(registry.operations.length, 10);
  assert.equal(registry.operations.some(({ name }) => name === "continuation.get"), false);
  assert.equal(registry.operations.some(({ name }) => /authorize|execute|dispatch|pay|release|waive|issue/.test(name)), false);
  assert.deepEqual(sources.manifest.conformance_claims, []);
});

test("envelope binds its body and enforces mutation idempotency", () => {
  const { envelope, context } = makeEnvelopeCase();
  assertSchemaValid(envelope);
  assert.equal(bodyHash(envelope, schemaFor(envelope)), envelope.body_hash);
  assert.deepEqual(verifyObjectBindings(envelope, schemaFor(envelope)), []);
  assert.deepEqual(validateEnvelopeOperation(envelope, context), []);
  assert.equal(acceptEnvelopeOperation(envelope, context, ref("cairn.action_preparation_receipt.v0.1", 600)).accepted, true);
  assert.ok(validateEnvelopeOperation(envelope, context).includes("nonce_replay"));

  const mutatedBody = structuredClone(envelope);
  mutatedBody.body.target = "cairn:different-target";
  assert.ok(verifyObjectBindings(mutatedBody, schemaFor(mutatedBody)).includes("body_hash_mismatch"));

  const noIdempotency = structuredClone(envelope);
  noIdempotency.idempotency_key = null;
  assert.ok(validateEnvelopeOperation(noIdempotency, context).includes("idempotency_key_required"));

  const wrongSchema = structuredClone(envelope);
  wrongSchema.body_schema = registry.operations.find(({ name }) => name === "intent.get").request_schema;
  assert.ok(validateEnvelopeOperation(wrongSchema, context).includes("body_schema_mismatch"));
});

test("unknown critical envelope extensions fail closed", () => {
  const { envelope, context } = makeEnvelopeCase();
  envelope.critical_extensions = ["https://malicious.example/authority-upgrade"];
  assert.ok(validateEnvelopeOperation(envelope, context).includes("critical_extension_unknown"));
});

test("continuation bundle carries context but binds no transferable authority", () => {
  const { bundle, authorization, context } = makeContinuation();
  assertSchemaValid(bundle);
  assertSchemaValid(authorization);
  assert.deepEqual(validateContinuationBinding(bundle, authorization, context), []);
  assert.deepEqual(bundle.not_claiming, ["authority_transfer"]);

  const embeddedAuthorization = structuredClone(bundle);
  embeddedAuthorization.authorization = authorization;
  assert.equal(ajv.getSchema(schemaFor(bundle).$id)(embeddedAuthorization), false);
});

test("continuation runtime swap and grant-graph expansion fail", () => {
  const { bundle, authorization, context } = makeContinuation();
  const wrongRuntime = structuredClone(authorization);
  wrongRuntime.recipient_runtime_binding_hash = HASH_B;
  assert.ok(validateContinuationBinding(bundle, wrongRuntime, context).includes("runtime_binding_hash_mismatch"));

  const missingGrant = structuredClone(authorization);
  missingGrant.data_grant_refs = [ref("cairn.data_grant.v0.1", 999)];
  assert.ok(validateContinuationBinding(bundle, missingGrant, context).includes("data_grant_graph_mismatch"));

  const inlineUnknown = structuredClone(bundle);
  inlineUnknown.unresolved_unknown_refs[0].private_budget = { amount_minor: 9999, asset: "USD" };
  assert.equal(ajv.getSchema(schemaFor(bundle).$id)(inlineUnknown), false);
});

test("continuation enforces recipient, purpose, URI, whole-object scope, and disclosure count", () => {
  const recipientCase = makeContinuation();
  recipientCase.authorization.recipient_actor_id = "https://agent.example/keys/wrong-runtime";
  assert.ok(validateContinuationBinding(recipientCase.bundle, recipientCase.authorization, recipientCase.context).includes("recipient_actor_mismatch"));

  const purposeCase = makeContinuation();
  purposeCase.grant.purpose = "unrelated_read";
  const purposeKey = [...purposeCase.context.dataGrantsByRef.keys()][0];
  purposeCase.context.dataGrantsByRef.set(purposeKey, bindAndSign(purposeCase.grant, PRINCIPAL_KEY));
  assert.ok(validateContinuationBinding(purposeCase.bundle, purposeCase.authorization, purposeCase.context).includes("grant_purpose_mismatch"));

  const uriCase = makeContinuation();
  uriCase.bundle.items[0].retrieval_uri = "https://objects.example/substituted-intent";
  assert.ok(validateContinuationBinding(uriCase.bundle, uriCase.authorization, uriCase.context).includes("grant_resource_scope_mismatch"));

  const fieldCase = makeContinuation();
  fieldCase.grant.resource_scopes[0].field_paths = ["/runtime_binding_id"];
  const fieldKey = [...fieldCase.context.dataGrantsByRef.keys()][0];
  fieldCase.context.dataGrantsByRef.set(fieldKey, bindAndSign(fieldCase.grant, PRINCIPAL_KEY));
  assert.ok(validateContinuationBinding(fieldCase.bundle, fieldCase.authorization, fieldCase.context).includes("grant_resource_scope_mismatch"));

  const countCase = makeContinuation();
  countCase.grant.maximum_disclosures = 0;
  const countKey = [...countCase.context.dataGrantsByRef.keys()][0];
  countCase.context.dataGrantsByRef.set(countKey, bindAndSign(countCase.grant, PRINCIPAL_KEY));
  assert.ok(validateContinuationBinding(countCase.bundle, countCase.authorization, countCase.context).includes("grant_disclosures_exhausted"));

  const publicCase = makeContinuation();
  publicCase.bundle.schema_bundle.retrieval_uri = "https://evil.example/substitute.json";
  assert.ok(validateContinuationBinding(publicCase.bundle, publicCase.authorization, publicCase.context).includes("public_resource_binding_mismatch"));
});

test("continuation disclosure reservation is consumed exactly once", () => {
  const { bundle, authorization, context } = makeContinuation();
  assert.deepEqual(consumeContinuationDisclosure(bundle, authorization, context), { consumed: true, failures: [] });
  assert.equal([...context.grantStatesByRef.values()][0].remaining_disclosures, 0);
  const replay = consumeContinuationDisclosure(bundle, authorization, context);
  assert.equal(replay.consumed, false);
  assert.ok(replay.failures.includes("disclosure_reservation_not_active"));
});

test("continuation reservation binds delivery, fence, revocation, and grant ledger", () => {
  const cases = [
    ["delivery_envelope_hash_mismatch", ({ context }) => { context.deliveryEnvelopeHash = HASH_A; }],
    ["disclosure_fencing_token_mismatch", ({ context }) => { [...context.disclosureLedger.values()][0].fencing_token = 4; }],
    ["principal_revocation_nonce_mismatch", ({ context }) => { context.principalRevocationNonce = 12; }],
    ["grant_disclosure_ledger_mismatch", ({ grant, context }) => {
      grant.disclosure_ledger_namespace = "other-ledger";
      context.dataGrantsByRef.set([...context.dataGrantsByRef.keys()][0], bindAndSign(grant, PRINCIPAL_KEY));
    }]
  ];
  for (const [expected, mutate] of cases) {
    const value = makeContinuation();
    mutate(value);
    assert.ok(validateContinuationBinding(value.bundle, value.authorization, value.context).includes(expected), expected);
  }
});

test("envelope rejects independent mutations at every operation boundary", () => {
  const mutate = (change) => {
    const value = makeEnvelopeCase();
    change(value);
    return validateEnvelopeOperation(value.envelope, value.context);
  };
  assert.ok(mutate(({ envelope }) => { envelope.body.extra = true; }).includes("body_schema_invalid"));
  assert.ok(mutate(({ envelope }) => { envelope.body.principal_id = "did:example:other"; }).includes("body_principal_mismatch"));
  assert.ok(mutate(({ envelope }) => { envelope.sender.actor_id = "did:web:other-agent.example"; }).includes("runtime_binding_sender_mismatch"));
  assert.ok(mutate(({ envelope }) => { envelope.sender.runtime_key_id = PRINCIPAL_KEY.key_id; }).includes("envelope_malformed"));
  assert.ok(mutate(({ envelope }) => { envelope.audience = ["cairn:wrong-service"]; }).includes("audience_mismatch"));
  assert.ok(mutate(({ envelope }) => { envelope.expires_at = "2026-07-20T16:00:01Z"; }).includes("envelope_not_current"));
  assert.ok(mutate(({ envelope }) => { envelope.operation_fingerprint = HASH_A; }).includes("operation_fingerprint_mismatch"));
  assert.ok(mutate(({ envelope }) => { envelope.authorization_refs = []; }).includes("authorization_ref_required"));
  assert.ok(mutate(({ envelope }) => { envelope.subject_refs = []; }).includes("body_subject_ref_missing"));
  assert.ok(mutate(({ envelope }) => { envelope.body.target = "cairn:substituted-executor"; }).includes("effect_target_mismatch"));
  assert.ok(mutate(({ context }) => { context.effectDescriptorsByRef.clear(); }).includes("effect_descriptor_unresolved"));
});

test("idempotency admission rejects the same key with a changed operation fingerprint", () => {
  const { envelope, context } = makeEnvelopeCase();
  assert.equal(acceptEnvelopeOperation(envelope, context, ref("cairn.action_preparation_receipt.v0.1", 601)).accepted, true);
  const conflicting = structuredClone(envelope);
  conflicting.nonce = "fixture-nonce-00000002";
  conflicting.operation_fingerprint = HASH_B;
  const rebound = bindAndSign(conflicting, AGENT_KEY);
  assert.ok(validateEnvelopeOperation(rebound, context).includes("idempotency_conflict"));
});

test("runtime binding cross-binds identity, public key, provider, and envelope signer", () => {
  const { runtimeBinding } = makeEnvelopeCase();
  assert.deepEqual(validateSignedObject(runtimeBinding, validationContext()), []);

  const keySwap = structuredClone(runtimeBinding);
  keySwap.agent_identity.runtime_instance_key_id = PRINCIPAL_KEY.key_id;
  const keySwapSigned = bindAndSign(keySwap, PROVIDER_KEY);
  assert.equal(ajv.getSchema(schemaFor(keySwapSigned).$id)(keySwapSigned), false);

  const materialSwap = structuredClone(runtimeBinding);
  materialSwap.runtime_public_key.public_key = PRINCIPAL_KEY.public_key;
  const materialSwapSigned = bindAndSign(materialSwap, PROVIDER_KEY);
  assert.ok(validateEnvelopeOperation(makeEnvelopeCase().envelope, {
    ...makeEnvelopeCase().context,
    runtimeBinding: materialSwapSigned
  }).includes("runtime_public_key_material_mismatch"));

  const providerSwap = structuredClone(runtimeBinding);
  providerSwap.agent_identity.agent_provider_id = "did:web:other-provider.example";
  const providerSwapSigned = bindAndSign(providerSwap, PROVIDER_KEY);
  const { envelope, context } = makeEnvelopeCase();
  context.runtimeBinding = providerSwapSigned;
  assert.ok(validateEnvelopeOperation(envelope, context).includes("runtime_provider_signer_mismatch"));
});

test("proposal and effect binding rejects every consequential field substitution", () => {
  const effect = makeEffect();
  const cases = [
    ["effect_descriptor_ref", (p) => { p.effect_descriptor_ref.object_id = uuid(999); }],
    ["effect_id", (p) => { p.effect_id = HASH_B; }],
    ["effect_principal", (p) => { p.principal_id = "did:example:other"; }],
    ["effect_capability", (p) => { p.capability = "recommend"; }],
    ["effect_target", (p) => { p.target = "cairn:other-executor"; }],
    ["effect_operation_kind", (p) => { p.effect_operation_kind = "other_operation"; }],
    ["effect_provider", (p) => { p.effect_provider_id = "cairn:other-provider"; }],
    ["effect_recipient", (p) => { p.ultimate_effect_recipient = "did:example:receiver"; }],
    ["effect_account_commitment", (p) => { p.ultimate_effect_account_commitment = HASH_B; }],
    ["effect_deal", (p) => { p.deal_id = uuid(998); }],
    ["effect_terms", (p) => { p.terms_or_cart_hash = HASH_B; }],
    ["effect_copy_ids", (p) => { p.copy_ids = ["copy-a"]; }],
    ["effect_rail", (p) => { p.rail = "paypal"; }],
    ["effect_amounts", (p) => { p.amounts = [{ role: "quoted_total", money: { amount_minor: 1, asset: "USD" } }]; }]
  ];
  for (const [prefix, change] of cases) {
    const proposal = makeProposal(effect);
    change(proposal);
    assert.ok(validateProposalEffectBinding(proposal, effect).some((code) => code.startsWith(prefix)), prefix);
  }
});

test("resolved objects are bound to requested ref, schema, hash, and retrieval URI", () => {
  const object = makeProposal();
  const expectedRef = objectRefFor(object, schemaFor(object));
  const expectedUri = "https://objects.example/proposal-21";
  const response = { ref: expectedRef, retrieval_uri: expectedUri, object };
  const context = validationContext({ expectedRef, expectedUri });
  assert.deepEqual(validateResolvedObjectResponse(response, context), []);

  const wrongRef = structuredClone(response);
  wrongRef.ref.object_hash = HASH_B;
  assert.ok(validateResolvedObjectResponse(wrongRef, context).includes("resolved_ref_mismatch"));
  const wrongUri = structuredClone(response);
  wrongUri.retrieval_uri = "https://evil.example/object";
  assert.ok(validateResolvedObjectResponse(wrongUri, context).includes("resolved_uri_mismatch"));
  const wrongObject = structuredClone(response);
  wrongObject.object.target = "cairn:substituted-target";
  assert.ok(validateResolvedObjectResponse(wrongObject, context).includes("resolved_object_binding_mismatch"));
});

test("preparation receipt cross-checks action, proposal, principal, agent, and draft-only state", () => {
  const proposal = makeProposal();
  const action = makeDraftAction(proposal);
  const receipt = makePreparationReceipt(action, proposal);
  const context = validationContext({ action, proposal, expectedAgentIdentity: fixture.agent_identity });
  assert.deepEqual(validatePreparationReceipt(receipt, context), []);
  const wrong = structuredClone(receipt);
  wrong.action_ref.object_hash = HASH_B;
  wrong.prepared_for_principal = "did:example:other";
  assert.ok(validatePreparationReceipt(wrong, context).includes("receipt_action_ref_mismatch"));
  assert.ok(validatePreparationReceipt(wrong, context).includes("preparation_principal_mismatch"));
  const authority = structuredClone(action);
  authority.authorization_ref = ref("cairn.authorization.v0.1", 901);
  assert.ok(validatePreparationReceipt(receipt, { ...context, action: authority }).includes("action_authority_present"));
});

test("runtime canonicalization rejects non-I-JSON and noncanonical proof encodings", async () => {
  assert.throws(() => assertIJson({ bad: Number.NaN }), /non-finite/);
  assert.throws(() => canonicalText({ bad: "\ud800" }), /unpaired high surrogate/);
  assert.throws(() => canonicalText({ bad: 9007199254740992 }), /interoperable I-JSON range/);
  assert.equal(verifyEd25519({
    schemaId: "cairn.action_proposal.v0.1",
    objectHash: HASH_A,
    publicKey: `${AGENT_KEY.public_key}=`,
    signature: "A".repeat(86)
  }), false);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const noncanonicalKey = `${AGENT_KEY.public_key.slice(0, -1)}${alphabet[alphabet.indexOf(AGENT_KEY.public_key.at(-1)) + 1]}`;
  const vector = (await readJson(path.join(root, "vectors", "ed25519-vectors.json"))).vectors[0];
  const noncanonicalSignature = `${vector.signature.slice(0, -1)}${alphabet[alphabet.indexOf(vector.signature.at(-1)) + 1]}`;
  assert.equal(Buffer.from(noncanonicalKey, "base64url").equals(Buffer.from(AGENT_KEY.public_key, "base64url")), true);
  assert.equal(Buffer.from(noncanonicalSignature, "base64url").equals(Buffer.from(vector.signature, "base64url")), true);
  assert.equal(verifyEd25519({
    schemaId: vector.schema_id,
    objectHash: vector.object_hash,
    publicKey: vector.public_key,
    signature: noncanonicalSignature
  }), false);
  const runtime = makeRuntimeBinding();
  runtime.runtime_public_key.public_key = `${AGENT_KEY.public_key}=`;
  assert.equal(ajv.getSchema(schemaFor(runtime).$id)(runtime), false);
});

test("array annotations fail closed on malformed element types", () => {
  assert.equal(utf8Sorted(["copy-a", 7]), false);
  const effect = makeEffect();
  effect.effect_semantics.copy_ids = ["copy-a", 7];
  assert.doesNotThrow(() => ajv.getSchema(schemaFor(effect).$id)(effect));
  assert.equal(ajv.getSchema(schemaFor(effect).$id)(effect), false);
});

test("proposal-foundation registry surface is exact, not merely a denylist", () => {
  const changed = structuredClone(sources);
  changed.registry.operations.push({ ...changed.registry.operations[0], name: "harmless.extra" });
  assert.throws(() => auditSources(changed), /exact proposal-foundation surface/);
  const weakened = structuredClone(sources);
  weakened.registry.operations[2].grant_use = "read_local";
  assert.throws(() => auditSources(weakened), /exact proposal-foundation surface|write_object/);
});

test("capabilities response pins the exact operation surface and bundle", async () => {
  const { bundle } = await buildBundle(root);
  const response = {
    protocol_version: "0.1",
    profile: "cairn-proposal-foundation-v0.1",
    bundle_hash: bundle.bundle_hash,
    operations: registry.operations.map(({ name }) => name)
  };
  const schemaValidate = ajv.getSchema(
    "https://cairn.cards/protocol/schemas/v0.1/operation-bodies.schema.json#/$defs/capabilitiesResponse"
  );
  assert.equal(schemaValidate(response), true);
  assert.deepEqual(validateCapabilitiesResponse(response, { ajv, registry, bundleHash: bundle.bundle_hash }), []);

  const wrongOperation = structuredClone(response);
  wrongOperation.operations[0] = "harmless.extra";
  assert.equal(schemaValidate(wrongOperation), false);
  const driftedRegistry = structuredClone(registry);
  driftedRegistry.operations[0].name = "harmless.extra";
  assert.ok(validateCapabilitiesResponse(response, { ajv, registry: driftedRegistry, bundleHash: bundle.bundle_hash })
    .includes("capabilities_operation_surface_mismatch"));
  assert.ok(validateCapabilitiesResponse(response, { ajv, registry, bundleHash: HASH_A })
    .includes("capabilities_bundle_hash_mismatch"));
});

test("all exported validation boundaries return stable failures for malformed input", () => {
  const poison = new Proxy({}, { get() { throw new TypeError("hostile resolver value"); } });
  const runtimePoison = new Proxy(makeRuntimeBinding(), {
    get(target, property, receiver) {
      if (property === "key_status") throw new TypeError("hostile runtime value");
      return Reflect.get(target, property, receiver);
    }
  });
  const grantValue = makeContinuation();
  const grantPoison = new Proxy(grantValue.grant, {
    get(target, property, receiver) {
      if (property === "principal_id") throw new TypeError("hostile grant value");
      return Reflect.get(target, property, receiver);
    }
  });
  const envelopeValue = makeEnvelopeCase();
  Object.defineProperty(envelopeValue.context, "registry", { get() { throw new TypeError("hostile registry"); } });
  const continuationValue = makeContinuation();
  Object.defineProperty(continuationValue.context, "disclosureLedger", { get() { throw new TypeError("hostile ledger"); } });
  const effectPoison = new Proxy(makeProposal(), {
    get(target, property, receiver) {
      if (property === "amounts") throw new TypeError("hostile amount list");
      return Reflect.get(target, property, receiver);
    }
  });
  const resolvedObject = makeProposal();
  const resolvedRef = objectRefFor(resolvedObject, schemaFor(resolvedObject));
  const resolvedContext = validationContext({ expectedUri: "https://objects.example/proposal" });
  Object.defineProperty(resolvedContext, "expectedRef", { get() { throw new TypeError("hostile expected ref"); } });
  const preparationContext = validationContext();
  Object.defineProperty(preparationContext, "action", { get() { throw new TypeError("hostile action"); } });
  const malformedCalls = [
    () => validateSignedObject(poison, validationContext()),
    () => validateRuntimeBinding(runtimePoison, validationContext()),
    () => validateDataGrant(grantPoison, grantValue.context),
    () => validateEnvelopeOperation(envelopeValue.envelope, envelopeValue.context),
    () => validateContinuationBinding(continuationValue.bundle, continuationValue.authorization, continuationValue.context),
    () => validateProposalEffectBinding(effectPoison, makeEffect()),
    () => validateResolvedObjectResponse({ ref: resolvedRef, retrieval_uri: "https://objects.example/proposal", object: resolvedObject }, resolvedContext),
    () => validatePreparationReceipt(null, preparationContext),
    () => validateCapabilitiesResponse(poison, { ajv, registry, bundleHash: HASH_A }),
    () => validateSignedObject({ schema: "cairn.envelope.v0.1" }, validationContext()),
    () => validateRuntimeBinding({ schema: "cairn.agent_runtime_binding.v0.1" }, validationContext()),
    () => validateDataGrant(null, validationContext()),
    () => validateEnvelopeOperation({ schema: "cairn.envelope.v0.1" }, validationContext({ registry })),
    () => validateContinuationBinding(null, null, validationContext()),
    () => validateProposalEffectBinding({ amounts: [null] }, {}),
    () => validateResolvedObjectResponse(null, validationContext()),
    () => validatePreparationReceipt(null, validationContext({ action: null, proposal: null })),
    () => acceptEnvelopeOperation(null, {}),
    () => consumeContinuationDisclosure(null, null, {})
  ];
  for (const call of malformedCalls) {
    let result;
    assert.doesNotThrow(() => { result = call(); });
    const failures = Array.isArray(result) ? result : result.failures;
    assert.ok(Array.isArray(failures) && failures.length > 0);
    assert.ok(failures.every((code) => typeof code === "string" && code.length > 0));
  }
});

test("idempotency records are typed and replay precedes changed new-work state", () => {
  const missingResult = makeEnvelopeCase();
  const missing = acceptEnvelopeOperation(missingResult.envelope, missingResult.context);
  assert.equal(missing.accepted, false);
  assert.ok(missing.failures.includes("idempotency_result_ref_required"));
  assert.equal(missingResult.context.usedNonces.has(missingResult.envelope.nonce), false);

  const malformedState = makeEnvelopeCase();
  const stateKey = `${malformedState.context.authorityNamespace}|${malformedState.envelope.idempotency_key}`;
  malformedState.context.idempotencyRecords.set(stateKey, { fingerprint: malformedState.envelope.operation_fingerprint });
  const malformed = acceptEnvelopeOperation(malformedState.envelope, malformedState.context, ref("cairn.action_preparation_receipt.v0.1", 710));
  assert.equal(malformed.accepted, false);
  assert.ok(malformed.failures.includes("idempotency_record_invalid"));

  const replayCase = makeEnvelopeCase();
  const originalResult = ref("cairn.action_preparation_receipt.v0.1", 711);
  assert.equal(acceptEnvelopeOperation(replayCase.envelope, replayCase.context, originalResult).accepted, true);
  [...replayCase.context.grantStatesByRef.values()][0].status = "revoked";
  const retry = structuredClone(replayCase.envelope);
  retry.message_id = uuid(712);
  retry.nonce = "fixture-nonce-00000712";
  const signedRetry = bindAndSign(retry, AGENT_KEY);
  const replay = acceptEnvelopeOperation(signedRetry, replayCase.context, ref("cairn.action_preparation_receipt.v0.1", 713));
  assert.equal(replay.accepted, true);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.result_ref, originalResult);

  const invalidTransport = structuredClone(signedRetry);
  invalidTransport.message_id = uuid(714);
  invalidTransport.nonce = "fixture-nonce-00000714";
  invalidTransport.signature.value = `${invalidTransport.signature.value[0] === "A" ? "B" : "A"}${invalidTransport.signature.value.slice(1)}`;
  const rejected = acceptEnvelopeOperation(invalidTransport, replayCase.context);
  assert.equal(rejected.accepted, false);
  assert.ok(rejected.failures.includes("signature_invalid"));
});

test("DataGrant schema rejects empty field scopes and audiences", () => {
  const fieldCase = makeContinuation().grant;
  fieldCase.resource_scopes[0].field_paths = [];
  const validate = ajv.getSchema(schemaFor(fieldCase).$id);
  assert.equal(validate(fieldCase), false);

  const audienceCase = makeContinuation().grant;
  audienceCase.audience = [];
  assert.equal(validate(audienceCase), false);
});

test("DataGrant validator rejects empty field scopes and audiences", () => {
  const { grant, authorization, context } = makeContinuation();
  grant.resource_scopes[0].field_paths = [];
  grant.audience = [];
  const failures = validateDataGrant(grant, {
    ...context,
    grantRef: authorization.data_grant_refs[0],
    principalId: fixture.principal_id,
    recipient: AGENT_KEY.key_id,
    purpose: "agent_continuation",
    use: "read_local",
    resources: []
  });
  assert.ok(failures.includes("grant_field_scope_empty"));
  assert.ok(failures.includes("grant_audience_empty"));
});

test("foundation annotation profile is recursively immutable", () => {
  const nested = SIGNED_OBJECT_ANNOTATIONS["cairn.agent_runtime_binding.v0.1"][3][0];
  assert.equal(Object.isFrozen(SIGNED_OBJECT_ANNOTATIONS), true);
  assert.equal(Object.isFrozen(nested), true);
  assert.throws(() => { nested[0] = "/substituted"; }, TypeError);
  assert.equal(nested[0], "/agent_identity/runtime_instance_key_id");
});

test("continuation reservation state has one closed vocabulary and exact graph bindings", () => {
  const valid = makeContinuation();
  const state = [...valid.context.disclosureLedger.values()][0];
  const stateValidate = ajv.getSchema(
    "https://cairn.cards/protocol/schemas/v0.1/continuation-disclosure-reservation-state.schema.json"
  );
  assert.equal(stateValidate(state), true, JSON.stringify(stateValidate.errors));

  const malformed = makeContinuation();
  delete [...malformed.context.disclosureLedger.values()][0].ledger_sequence;
  assert.ok(validateContinuationBinding(malformed.bundle, malformed.authorization, malformed.context)
    .includes("disclosure_reservation_state_invalid"));

  const wrongBundle = makeContinuation();
  wrongBundle.authorization.bundle_ref.object_id = uuid(799);
  assert.ok(validateContinuationBinding(wrongBundle.bundle, wrongBundle.authorization, wrongBundle.context)
    .includes("bundle_ref_mismatch"));

  const wrongStateGraph = makeContinuation();
  [...wrongStateGraph.context.disclosureLedger.values()][0].data_grant_refs = [ref("cairn.data_grant.v0.1", 798)];
  assert.ok(validateContinuationBinding(wrongStateGraph.bundle, wrongStateGraph.authorization, wrongStateGraph.context)
    .includes("disclosure_grant_graph_mismatch"));
});

test("resolved key timestamps require the exact protocol UTC representation", () => {
  for (const timestamp of ["2026-07-20T15:00:00+00:00", "2026-07-20t15:00:00z", "2026-07-20", "2026-02-30T15:00:00Z"]) {
    const { envelope, context } = makeEnvelopeCase();
    const keys = new Map([...keyResolver.entries()].map(([id, key]) => [id, { ...key }]));
    keys.get(AGENT_KEY.key_id).not_before = timestamp;
    assert.ok(validateSignedObject(envelope, { ...context, keyResolver: keys }).includes("signing_key_validity_invalid"), timestamp);
  }
});

test("write_object is a non-authorizing exact intent-storage use", () => {
  assert.deepEqual(FOUNDATION_DATA_GRANT_USES.write_object, {
    operation: "intent.put",
    object_schema: "cairn.active_intent.v0.1",
    authority_effect: "records_principal_signed_intent_only",
    action_authority: false
  });
  const operation = registry.operations.find(({ name }) => name === FOUNDATION_DATA_GRANT_USES.write_object.operation);
  assert.equal(operation.grant_use, "write_object");
  assert.equal(operation.request_schema.endsWith("/active-intent.schema.json"), true);
  assert.equal(operation.authority_effect, FOUNDATION_DATA_GRANT_USES.write_object.authority_effect);
});

test("authoritative DataGrant state requires typed counters and fails closed", () => {
  for (const malformed of [undefined, "1", Number.NaN, -1]) {
    const { grant, authorization, context } = makeContinuation();
    const grantRef = authorization.data_grant_refs[0];
    const state = [...context.grantStatesByRef.values()][0];
    if (malformed === undefined) delete state.remaining_disclosures;
    else state.remaining_disclosures = malformed;
    const failures = validateDataGrant(grant, {
      ...context,
      grantRef,
      principalId: fixture.principal_id,
      recipient: AGENT_KEY.key_id,
      purpose: "agent_continuation",
      use: "read_local",
      resources: []
    });
    assert.ok(failures.includes("grant_state_invalid"), String(malformed));
  }
});

test("resolved signing keys require complete identity, status, validity, and revocation metadata", () => {
  const { envelope, context, runtimeBinding } = makeEnvelopeCase();
  const incompleteKeys = new Map([...keyResolver.entries()].map(([id, key]) => [id, { ...key }]));
  for (const field of ["controller", "status", "not_before", "expires_at", "revocation_time"]) {
    delete incompleteKeys.get(AGENT_KEY.key_id)[field];
  }
  delete incompleteKeys.get(PROVIDER_KEY.key_id).controller;
  const incompleteContext = { ...context, keyResolver: incompleteKeys };
  assert.ok(validateSignedObject(envelope, incompleteContext).includes("signing_key_record_incomplete"));
  assert.ok(validateRuntimeBinding(runtimeBinding, incompleteContext).includes("runtime_provider_signer_mismatch"));
  assert.ok(validateEnvelopeOperation(envelope, incompleteContext).length > 0);
});

test("action preparation grants must cover the resolved effect descriptor independently", () => {
  const effect = makeEffect();
  const proposal = makeProposal(effect);
  proposal.resource_refs = proposal.resource_refs.filter((objectRef) => !sameObjectRef(objectRef, proposal.effect_descriptor_ref));
  const rebound = bindAndSign(proposal, AGENT_KEY);
  const { envelope, context } = makeEnvelopeCase(effect, rebound);
  const failures = validateEnvelopeOperation(envelope, context);
  assert.ok(failures.includes("effect_descriptor_resource_ref_missing"));
  assert.ok(failures.includes("resource_uri_missing") || failures.includes("grant_resource_scope_mismatch"));
});

test("expired ActionProposals fail signed-object and envelope admission", () => {
  const effect = makeEffect();
  const proposal = makeProposal(effect);
  proposal.expires_at = "2026-07-20T16:15:00Z";
  const expired = bindAndSign(proposal, AGENT_KEY);
  assert.ok(validateSignedObject(expired, validationContext()).includes("object_expired"));
  const { envelope, context } = makeEnvelopeCase(effect, expired);
  assert.ok(validateEnvelopeOperation(envelope, context).includes("body_object_expired"));
});

test("same-fingerprint retry returns the original result instead of accepting new work", () => {
  const { envelope, context } = makeEnvelopeCase();
  const originalResult = ref("cairn.action_preparation_receipt.v0.1", 700);
  const first = acceptEnvelopeOperation(envelope, context, originalResult);
  assert.equal(first.replayed, false);

  const retry = structuredClone(envelope);
  retry.message_id = uuid(701);
  retry.nonce = "fixture-nonce-00000701";
  const signedRetry = bindAndSign(retry, AGENT_KEY);
  const second = acceptEnvelopeOperation(signedRetry, context, ref("cairn.action_preparation_receipt.v0.1", 702));
  assert.equal(second.accepted, true);
  assert.equal(second.replayed, true);
  assert.deepEqual(second.result_ref, originalResult);
});

test("preparation binds expected deal head and proposal signer to the claimed agent", () => {
  const proposal = makeProposal();
  const changedAction = makeDraftAction(proposal);
  changedAction.expected_deal_head_hash = HASH_B;
  const action = bindAndSign(changedAction, SERVICE_KEY);
  const receipt = makePreparationReceipt(action, proposal);
  const context = validationContext({ action, proposal, expectedAgentIdentity: fixture.agent_identity });
  assert.ok(validatePreparationReceipt(receipt, context).includes("action_proposal_semantics_mismatch"));

  const wrongSigner = makeProposal();
  wrongSigner.agent_signature = signature(PRINCIPAL_KEY);
  const signedByPrincipal = bindAndSign(wrongSigner, PRINCIPAL_KEY);
  const matchingAction = makeDraftAction(signedByPrincipal);
  const matchingReceipt = makePreparationReceipt(matchingAction, signedByPrincipal);
  const signerFailures = validatePreparationReceipt(matchingReceipt, validationContext({
    action: matchingAction,
    proposal: signedByPrincipal,
    expectedAgentIdentity: fixture.agent_identity
  }));
  assert.ok(signerFailures.includes("preparation_agent_key_mismatch"));
  assert.ok(signerFailures.includes("preparation_agent_controller_mismatch"));
});

test("unknown-schema authorization objects fail closed without throwing", () => {
  const { envelope, context } = makeEnvelopeCase();
  const grantKey = [...context.dataGrantsByRef.keys()][0];
  context.dataGrantsByRef.set(grantKey, { schema: "cairn.unknown.v0.1" });
  let failures;
  assert.doesNotThrow(() => { failures = validateEnvelopeOperation(envelope, context); });
  assert.ok(failures.includes("authorization_grant_schema_unknown"));
});

test("source audit pins full annotation paths, not only their root properties", () => {
  const mutated = structuredClone(sources);
  const proposalSchema = mutated.schemas.find(({ document }) => document["x-cairn-object-schema"] === "cairn.action_proposal.v0.1").document;
  proposalSchema["x-cairn-signature-pointers"] = ["/agent_signature/missing"];
  proposalSchema["x-cairn-hash-exclusion-pointers"] = [
    "/agent_signature/missing/signed_hash",
    "/agent_signature/missing/value"
  ];
  assert.throws(() => auditSources(mutated), /exact signed-object annotation profile/);
});

test("I-JSON arrays reject properties that canonical JSON would omit", () => {
  const value = [];
  Object.defineProperty(value, "4294967295", { value: "unhashed", enumerable: true });
  assert.throws(() => canonicalText(value), /array has non-JSON members/);
});

test("direct-principal preparation is coherent without inventing an agent runtime", () => {
  const effect = makeEffect();
  const proposalDraft = makeProposal(effect);
  proposalDraft.agent_identity = null;
  proposalDraft.agent_signature = signature(PRINCIPAL_KEY);
  const proposal = bindAndSign(proposalDraft, PRINCIPAL_KEY);
  const action = makeDraftAction(proposal);
  const receiptDraft = makePreparationReceipt(action, proposal);
  receiptDraft.prepared_by_agent = null;
  const receipt = bindAndSign(receiptDraft, SERVICE_KEY);
  assertSchemaValid(receipt);
  assert.deepEqual(validatePreparationReceipt(receipt, validationContext({
    action,
    proposal,
    expectedAgentIdentity: null
  })), []);

  const envelopeCase = makeEnvelopeCase(effect, proposal);
  const grantDraft = structuredClone(envelopeCase.grant);
  grantDraft.recipient = fixture.principal_id;
  grantDraft.audience = [fixture.principal_id];
  const grant = bindAndSign(grantDraft, PRINCIPAL_KEY);
  const grantRef = objectRefFor(grant, schemaFor(grant));
  const grantKey = `${grantRef.schema}|${grantRef.object_id}|${grantRef.object_hash}`;
  const envelopeDraft = structuredClone(envelopeCase.envelope);
  envelopeDraft.sender = { actor_id: fixture.principal_id, runtime_key_id: null };
  envelopeDraft.authorization_refs = [grantRef];
  envelopeDraft.signature = signature(PRINCIPAL_KEY);
  envelopeDraft.operation_fingerprint = operationFingerprint(envelopeDraft);
  const envelope = bindAndSign(envelopeDraft, PRINCIPAL_KEY);
  const context = {
    ...envelopeCase.context,
    runtimeBinding: null,
    authorityNamespace: `${fixture.principal_id}|action.prepare`,
    dataGrantsByRef: new Map([[grantKey, grant]]),
    grantStatesByRef: new Map([[grantKey, { status: "active", revocation_nonce: 2, remaining_disclosures: 2 }]]),
    usedNonces: new Set(),
    idempotencyRecords: new Map()
  };
  assert.deepEqual(validateEnvelopeOperation(envelope, context), []);
});

test("duplicate members and floating-point source are rejected before Node parsing", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "cairn-json-"));
  try {
    const duplicate = path.join(directory, "duplicate.json");
    writeFileSync(duplicate, '{"schema":"one","schema":"two"}\n');
    const duplicateResult = spawnSync("python3", [path.join(root, "scripts", "check-json-sources.py"), duplicate], {
      encoding: "utf8"
    });
    assert.notEqual(duplicateResult.status, 0);
    assert.match(duplicateResult.stderr, /duplicate member/);

    const floating = path.join(directory, "floating.json");
    writeFileSync(floating, '{"amount":1.25}\n');
    const floatingResult = spawnSync("python3", [path.join(root, "scripts", "check-json-sources.py"), floating], {
      encoding: "utf8"
    });
    assert.notEqual(floatingResult.status, 0);
    assert.match(floatingResult.stderr, /floating-point JSON source is forbidden/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("machine bundle is deterministic and self-addressed", async () => {
  const first = await buildBundle(root);
  const second = await buildBundle(root);
  assert.equal(first.bytes, second.bytes);
  assert.equal(first.bundle.bundle_hash, second.bundle.bundle_hash);
  const disk = readFileSync(path.join(root, "dist", "cairn-protocol-bundle-v0.1.json"), "utf8");
  assert.equal(disk, first.bytes);
  const parsed = JSON.parse(disk);
  const { bundle_hash, ...unsigned } = parsed;
  assert.equal(bundle_hash, canonicalHash(unsigned));
});

test("package-level check passes against generated source", () => {
  assert.doesNotThrow(() =>
    execFileSync("npm", ["run", "check"], { cwd: root, stdio: "pipe", encoding: "utf8" })
  );
});
