#!/usr/bin/env node

/**
 * Deterministic BYO-agent replacement drill for the reviewed Cairn proposal
 * foundation.
 *
 * This is intentionally outside protocol/. It composes the frozen nine-operation
 * reference service without changing that kernel or claiming production
 * conformance. Test keys are deterministic fixtures whose private material stays
 * inside signing-capability closures and is never placed in the resolver,
 * serialized Agent B input, trace, or report.
 */

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as signBytes
} from "node:crypto";
import { realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  bindObjectHash,
  canonicalHash,
  canonicalText,
  objectRefFor,
  objectRefKey,
  sameObjectRef,
  semanticHash,
  signatureInput,
  valueAtPointer
} from "../protocol/lib/core.mjs";
import {
  operationFingerprint
} from "../protocol/lib/validation.mjs";
import {
  createReferenceSeeder,
  createReferenceService,
  loadReferenceFoundation
} from "../protocol/reference-service/service.mjs";
import {
  signaturePlaceholder,
  ZERO_HASH
} from "../protocol/reference-service/signer.mjs";
import { MemoryReferenceStores } from "../protocol/reference-service/state.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROTOCOL_ROOT = path.resolve(HERE, "../protocol");
const AGENT_B_WORKER = path.resolve(HERE, "protocol_byo_agent_b_worker.mjs");

const PRINCIPAL_ID = "did:example:cairn-collector";
const SERVICE_ID = "cairn:action-service";
const OBJECT_ISSUER_ID = "cairn:object-service";
const CREATED = "2026-07-23T14:00:00Z";
const REVOKED_AT = "2026-07-23T14:20:00Z";
const NOW = "2026-07-23T14:30:00Z";
const EXPIRES = "2026-07-23T16:00:00Z";
const NOT_BEFORE = "2026-07-23T13:00:00Z";
const KEY_EXPIRES = "2026-07-23T17:00:00Z";
const HASH_A = `sha-256:${"a".repeat(64)}`;

export const EXPECTED_OPERATIONS = Object.freeze([
  "capabilities.get",
  "runtime_binding.get",
  "intent.put",
  "intent.get",
  "data_grant.get",
  "projection.get",
  "object.resolve",
  "action.prepare",
  "receipt.get"
]);

const FORBIDDEN_OPERATION_TERMS = Object.freeze([
  "authorize",
  "execute",
  "dispatch",
  "pay",
  "payment",
  "settle",
  "release",
  "waive",
  "issue"
]);

function uuid(number) {
  return `urn:uuid:00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

function fixtureSigningCapability(label, keyId, controller) {
  const seed = createHash("sha256")
    .update(`cairn-byo-replacement-fixture:${label}`, "utf8")
    .digest()
    .subarray(0, 32);
  const pkcs8Prefix = Buffer.from("302e020100300506032b657004220420", "hex");
  const privateKey = createPrivateKey({
    key: Buffer.concat([pkcs8Prefix, seed]),
    format: "der",
    type: "pkcs8"
  });
  const publicKey = createPublicKey(privateKey);
  const publicKeyX = publicKey.export({ format: "jwk" }).x;
  const record = Object.freeze({
    key_id: keyId,
    key_type: "Ed25519",
    controller,
    status: "active",
    not_before: NOT_BEFORE,
    expires_at: KEY_EXPIRES,
    revocation_time: null,
    public_key: publicKeyX
  });
  const publicFingerprint = canonicalHash({
    key_id: keyId,
    controller,
    public_key: publicKeyX
  });
  return Object.freeze({
    keyId,
    controller,
    record,
    publicFingerprint,
    sign: (bytes) => signBytes(null, bytes, privateKey)
  });
}

function schemaFor(foundation, object) {
  const schema = foundation.schemasByObjectId.get(object?.schema);
  if (!schema) throw new TypeError(`missing object schema for ${object?.schema}`);
  return schema;
}

function signature(capability, signedAt = CREATED) {
  return signaturePlaceholder(capability.keyId, signedAt);
}

function bindAndSign(foundation, object, capability) {
  const schema = schemaFor(foundation, object);
  const bound = bindObjectHash(structuredClone(object), schema);
  const pointer = schema["x-cairn-signature-pointers"][0];
  const proof = valueAtPointer(bound, pointer);
  proof.value = capability
    .sign(signatureInput(bound.schema, proof.signed_hash))
    .toString("base64url");
  return bound;
}

function runAgentBWorker(input) {
  const result = spawnSync(process.execPath, [AGENT_B_WORKER], {
    input: JSON.stringify(input),
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024
  });
  if (result.status !== 0) {
    return {
      ok: false,
      status: result.status,
      stderr: result.stderr.trim(),
      output: null
    };
  }
  try {
    return {
      ok: true,
      status: result.status,
      stderr: result.stderr.trim(),
      output: JSON.parse(result.stdout)
    };
  } catch {
    return {
      ok: false,
      status: result.status,
      stderr: "Agent B worker returned malformed JSON",
      output: null
    };
  }
}

function makeAgentIdentity({
  providerId,
  productId,
  runtimeKeyId,
  sessionId,
  modelId,
  policyByte,
  toolsetByte
}) {
  return Object.freeze({
    agent_provider_id: providerId,
    agent_product_id: productId,
    runtime_instance_key_id: runtimeKeyId,
    model_id_and_version: modelId,
    policy_hash: `sha-256:${policyByte.repeat(64)}`,
    toolset_hash: `sha-256:${toolsetByte.repeat(64)}`,
    session_id: sessionId
  });
}

function makeRuntimeBinding(
  foundation,
  { bindingNumber, identity, runtimeCapability, providerCapability }
) {
  return bindAndSign(foundation, {
    schema: "cairn.agent_runtime_binding.v0.1",
    runtime_binding_id: uuid(bindingNumber),
    agent_identity: structuredClone(identity),
    runtime_public_key: {
      profile: "cairn-ed25519-v0.1",
      key_id: runtimeCapability.keyId,
      public_key: runtimeCapability.record.public_key
    },
    key_status: "active",
    not_before: NOT_BEFORE,
    expires_at: KEY_EXPIRES,
    runtime_binding_hash: ZERO_HASH,
    provider_signature: signature(providerCapability),
    not_claiming: [
      "model_or_policy_attestation",
      "principal_authority",
      "personhood"
    ]
  }, providerCapability);
}

function makeIntent(foundation, principalCapability) {
  return bindAndSign(foundation, {
    schema: "cairn.active_intent.v0.1",
    intent_id: uuid(100),
    principal_id: PRINCIPAL_ID,
    revision: 1,
    supersedes_revision: null,
    intent_type: "acquire",
    domain: "trading_cards",
    targets: [{
      catalog_ref: {
        catalog_hash: HASH_A,
        row_id: "azuki-stt03-001-bobu"
      },
      exact_copy_required: false,
      quantity: 1,
      substitution_policy: "exact_print"
    }],
    stance: "want",
    constraints: {
      condition_floor: "NM",
      total_budget: { amount_minor: 1200, asset: "USD" },
      per_item_budget: { amount_minor: 1200, asset: "USD" },
      fees_included_in_budget: true,
      evidence_policy_ref: {
        schema: "cairn.evidence_policy.v0.1",
        object_id: uuid(101),
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
    source_claim_ids: ["principal-stated-bobu-want"],
    initial_status: "active",
    created_at: CREATED,
    expires_at: EXPIRES,
    profile_version_hash: HASH_A,
    intent_hash: ZERO_HASH,
    principal_signature: signature(principalCapability),
    consent_receipt_ref: {
      schema: "cairn.consent_receipt.v0.1",
      object_id: uuid(102),
      object_hash: HASH_A
    },
    not_claiming: [
      "market_availability",
      "authority_to_spend",
      "authority_to_disclose_private_constraints"
    ]
  }, principalCapability);
}

function makeProjection(
  foundation,
  serviceCapability,
  { projectionNumber, recipient, intent }
) {
  const intentRef = objectRefFor(intent, schemaFor(foundation, intent));
  return bindAndSign(foundation, {
    schema: "cairn.scoped_projection.v0.1",
    projection_id: uuid(projectionNumber),
    principal_id: PRINCIPAL_ID,
    source_refs: {
      profile_version_hash: intent.profile_version_hash,
      intent_id: intent.intent_id,
      intent_revision: intent.revision,
      claim_ids: structuredClone(intent.source_claim_ids)
    },
    purpose: "search",
    audience: [recipient],
    data_uses: ["read_local"],
    disclosed_fields: ["/targets"],
    payload: {
      schema: "cairn.scoped_projection_payload.v0.1",
      entries: [{
        output_path: "/targets",
        source_ref: intentRef,
        source_path: "/targets",
        derivation: "exact_copy",
        value: structuredClone(intent.targets)
      }]
    },
    redacted_fields: [
      "/constraints/total_budget",
      "/privacy/never_disclose"
    ],
    disclosure_authority_ref: null,
    derived_at: CREATED,
    expires_at: EXPIRES,
    projection_hash: ZERO_HASH,
    issuer_signature: signature(serviceCapability),
    not_claiming: [
      "authority_to_act",
      "source_value_independently_verified"
    ]
  }, serviceCapability);
}

function makeGrant(
  foundation,
  service,
  principalCapability,
  {
    grantNumber,
    recipient,
    resources,
    uses,
    purpose,
    maximumDisclosures = 1
  }
) {
  return bindAndSign(foundation, {
    schema: "cairn.data_grant.v0.1",
    grant_id: uuid(grantNumber),
    principal_id: PRINCIPAL_ID,
    recipient,
    resource_scopes: resources.map(({ resourceKind = "object", ref }) => ({
      resource_kind: resourceKind,
      ref,
      retrieval_uri: service.objectUri(ref),
      field_paths: [""]
    })),
    uses,
    purpose,
    audience: [recipient],
    maximum_disclosures: maximumDisclosures,
    retention: {
      expires_at: EXPIRES,
      deletion_terms: "Delete when this bounded replacement drill expires."
    },
    revocation_nonce: grantNumber,
    disclosure_ledger_namespace: `byo-replacement-${grantNumber}`,
    issued_at: CREATED,
    expires_at: EXPIRES,
    grant_hash: ZERO_HASH,
    principal_signature: signature(principalCapability),
    not_claiming: ["external_deletion_enforced"]
  }, principalCapability);
}

function makeEnvelope(
  foundation,
  {
    operationName,
    body,
    senderIdentity,
    senderCapability,
    messageNumber,
    nonce,
    subjectRefs = [],
    authorizationRefs = [],
    idempotencyKey = undefined
  }
) {
  const operation = foundation.registry.operations.find(({ name }) => name === operationName);
  if (!operation) throw new TypeError(`unknown envelope operation ${operationName}`);
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
    principal_id: PRINCIPAL_ID,
    audience: [SERVICE_ID],
    subject_refs: subjectRefs,
    authorization_refs: authorizationRefs,
    nonce,
    idempotency_key: idempotencyKey ??
      (operation.object_store_mutating ? `byo-idempotency-${messageNumber}` : null),
    operation_fingerprint: ZERO_HASH,
    critical_extensions: [],
    body_schema: operation.request_schema,
    body,
    body_hash: canonicalHash(body),
    trace: {
      parent_message_id: null,
      correlation_id: "byo-agent-replacement-drill"
    },
    envelope_hash: ZERO_HASH,
    signature: signature(senderCapability)
  };
  envelope.operation_fingerprint = operationFingerprint(envelope);
  return bindAndSign(foundation, envelope, senderCapability);
}

function makeEffectDescriptor(foundation, objectIssuerCapability, intentRef) {
  const schema = foundation.schemasByObjectId.get("cairn.effect_descriptor.v0.1");
  const effect = {
    schema: "cairn.effect_descriptor.v0.1",
    effect_descriptor_id: uuid(300),
    executor_target: "cairn:executor:proposal-only",
    effect_semantics: {
      principal_id: PRINCIPAL_ID,
      capability: "prepare",
      operation_kind: "draft_action",
      provider_id: OBJECT_ISSUER_ID,
      ultimate_receiver: null,
      deal_id: null,
      closed_terms_or_cart_hash: intentRef.object_hash,
      copy_ids: ["copy-bobu-candidate"],
      rail: null,
      amounts_by_role: {}
    },
    effect_id: ZERO_HASH,
    descriptor_hash: ZERO_HASH,
    descriptor_issuer_signature: signature(objectIssuerCapability),
    not_claiming: [
      "receiver_effect",
      "authority_to_act",
      "global_exactly_once"
    ]
  };
  effect.effect_id = semanticHash(effect, schema);
  return bindAndSign(foundation, effect, objectIssuerCapability);
}

function recordProbe(probes, id, passed, evidence) {
  probes.push({ id, passed: Boolean(passed), evidence });
}

function containsExportedSecretField(value) {
  const forbidden = /(?:private[_-]?key|secret|seed|mnemonic|pem)/i;
  const visit = (member) => {
    if (Array.isArray(member)) return member.some(visit);
    if (member === null || typeof member !== "object") return false;
    return Object.entries(member).some(([key, nested]) =>
      (forbidden.test(key) && nested !== false && nested !== null) || visit(nested)
    );
  };
  return visit(value);
}

/**
 * Execute the bounded replacement drill and return a deterministic JSON report.
 */
export async function runReplacementDrill() {
  const foundation = await loadReferenceFoundation(PROTOCOL_ROOT);

  const principal = fixtureSigningCapability(
    "principal",
    `${PRINCIPAL_ID}#key-1`,
    PRINCIPAL_ID
  );
  const serviceSigner = fixtureSigningCapability(
    "service",
    "https://reference.cairn.cards/keys/service-1",
    SERVICE_ID
  );
  const objectIssuer = fixtureSigningCapability(
    "object-issuer",
    "https://reference.cairn.cards/keys/object-issuer-1",
    OBJECT_ISSUER_ID
  );
  const providerA = fixtureSigningCapability(
    "provider-a",
    "did:web:anko.example#provider-1",
    "did:web:anko.example"
  );
  const runtimeA = fixtureSigningCapability(
    "runtime-a",
    "did:web:anko.example#runtime-1",
    "did:web:anko.example"
  );
  const providerB = fixtureSigningCapability(
    "provider-b",
    "did:web:independent-agent.example#provider-1",
    "did:web:independent-agent.example"
  );
  const runtimeB = fixtureSigningCapability(
    "runtime-b",
    "did:web:independent-agent.example#runtime-1",
    "did:web:independent-agent.example"
  );

  const identityA = makeAgentIdentity({
    providerId: providerA.controller,
    productId: "anko-proof-of-concept",
    runtimeKeyId: runtimeA.keyId,
    sessionId: "anko-session-1",
    modelId: "anko-poc-model",
    policyByte: "1",
    toolsetByte: "2"
  });
  const identityB = makeAgentIdentity({
    providerId: providerB.controller,
    productId: "independent-replacement-agent",
    runtimeKeyId: runtimeB.keyId,
    sessionId: "replacement-session-1",
    modelId: "independent-model",
    policyByte: "3",
    toolsetByte: "4"
  });

  const keyResolver = new Map([
    principal,
    serviceSigner,
    objectIssuer,
    providerA,
    runtimeA,
    providerB,
    runtimeB
  ].map((capability) => [
    capability.keyId,
    structuredClone(capability.record)
  ]));

  const stores = new MemoryReferenceStores();
  let generatedId = 0;
  const service = createReferenceService({
    foundation,
    stores,
    keyResolver,
    expectedAudience: SERVICE_ID,
    issuer: SERVICE_ID,
    issuerKeyId: serviceSigner.keyId,
    clock: () => NOW,
    idFactory: () => uuid(800 + (++generatedId)),
    signObject: (draft) => bindAndSign(foundation, draft, serviceSigner)
  });
  const seeder = createReferenceSeeder({
    foundation,
    stores,
    keyResolver,
    clock: () => NOW
  });

  const probes = [];
  const capabilities = service.capabilities();
  const actualOperations = capabilities.operations;
  recordProbe(
    probes,
    "kernel_surface_is_exactly_nine_operations",
    canonicalText(actualOperations) === canonicalText(EXPECTED_OPERATIONS),
    actualOperations
  );
  const consequentialOperations = actualOperations.filter((name) =>
    FORBIDDEN_OPERATION_TERMS.some((term) => name.includes(term))
  );
  recordProbe(
    probes,
    "kernel_has_no_consequential_operation",
    consequentialOperations.length === 0,
    consequentialOperations
  );

  const bindingA = makeRuntimeBinding(foundation, {
    bindingNumber: 110,
    identity: identityA,
    runtimeCapability: runtimeA,
    providerCapability: providerA
  });
  const bindingB = makeRuntimeBinding(foundation, {
    bindingNumber: 210,
    identity: identityB,
    runtimeCapability: runtimeB,
    providerCapability: providerB
  });
  const bindingARef = seeder.seedObject(bindingA);
  const bindingBRef = seeder.seedObject(bindingB);

  recordProbe(
    probes,
    "replacement_has_independent_provider_runtime_and_key",
    identityA.agent_provider_id !== identityB.agent_provider_id &&
      identityA.runtime_instance_key_id !== identityB.runtime_instance_key_id &&
      runtimeA.publicFingerprint !== runtimeB.publicFingerprint,
    {
      agent_a_provider: identityA.agent_provider_id,
      agent_b_provider: identityB.agent_provider_id,
      agent_a_runtime_key_id: runtimeA.keyId,
      agent_b_runtime_key_id: runtimeB.keyId,
      agent_a_public_key_fingerprint: runtimeA.publicFingerprint,
      agent_b_public_key_fingerprint: runtimeB.publicFingerprint
    }
  );

  const intent = makeIntent(foundation, principal);
  const intentRef = objectRefFor(intent, schemaFor(foundation, intent));

  const writeGrantA = makeGrant(foundation, service, principal, {
    grantNumber: 120,
    recipient: runtimeA.keyId,
    resources: [{ ref: intentRef }],
    uses: ["write_object"],
    purpose: "intent_storage",
    maximumDisclosures: 1
  });
  const writeGrantARef = seeder.seedObject(writeGrantA, {
    grantState: {
      status: "active",
      revocation_nonce: 120,
      remaining_disclosures: 1
    }
  });
  const intentPutA = makeEnvelope(foundation, {
    operationName: "intent.put",
    body: intent,
    senderIdentity: identityA,
    senderCapability: runtimeA,
    messageNumber: 121,
    nonce: "byo-replacement-nonce-0121",
    subjectRefs: [intentRef],
    authorizationRefs: [writeGrantARef],
    idempotencyKey: "byo-shared-intent-idempotency-0001"
  });
  const intentPutAuthA = {
    principalId: PRINCIPAL_ID,
    actorId: identityA.agent_provider_id,
    authorityNamespace: `${PRINCIPAL_ID}|intent.put`
  };
  const storedByA = service.handleEnvelope(intentPutA, intentPutAuthA);
  recordProbe(
    probes,
    "agent_a_records_principal_signed_intent",
    storedByA.ok === true &&
      storedByA.status === 201 &&
      sameObjectRef(storedByA.body.ref, intentRef),
    {
      status: storedByA.status,
      intent_ref: storedByA.body?.ref ?? null,
      intent_signer: intent.principal_signature.key_id,
      intent_not_claiming: intent.not_claiming
    }
  );

  const projectionA = makeProjection(foundation, serviceSigner, {
    projectionNumber: 125,
    recipient: runtimeA.keyId,
    intent
  });
  const projectionARef = seeder.seedObject(projectionA);
  const readGrantA = makeGrant(foundation, service, principal, {
    grantNumber: 130,
    recipient: runtimeA.keyId,
    resources: [{ ref: projectionARef }],
    uses: ["read_local"],
    purpose: "projection_read",
    maximumDisclosures: 2
  });
  const readGrantARef = seeder.seedObject(readGrantA, {
    grantState: {
      status: "active",
      revocation_nonce: 130,
      remaining_disclosures: 2
    }
  });
  const readA = service.handleEnvelope(makeEnvelope(foundation, {
    operationName: "projection.get",
    body: {
      ref: projectionARef,
      retrieval_uri: service.objectUri(projectionARef),
      declared_purpose: "search",
      intended_use: "read_local"
    },
    senderIdentity: identityA,
    senderCapability: runtimeA,
    messageNumber: 131,
    nonce: "byo-replacement-nonce-0131",
    authorizationRefs: [readGrantARef]
  }), {
    principalId: PRINCIPAL_ID,
    actorId: identityA.agent_provider_id
  });
  recordProbe(
    probes,
    "agent_a_reads_privacy_bounded_intent_projection",
    readA.ok === true &&
      sameObjectRef(readA.body.payload.entries[0].source_ref, intentRef) &&
      readA.body.redacted_fields.includes("/constraints/total_budget"),
    {
      status: readA.status,
      source_intent_ref: readA.body?.payload?.entries?.[0]?.source_ref ?? null,
      disclosed_fields: readA.body?.disclosed_fields ?? null,
      redacted_fields: readA.body?.redacted_fields ?? null
    }
  );

  const wrongGrantByB = service.handleEnvelope(makeEnvelope(foundation, {
    operationName: "projection.get",
    body: {
      ref: projectionARef,
      retrieval_uri: service.objectUri(projectionARef),
      declared_purpose: "search",
      intended_use: "read_local"
    },
    senderIdentity: identityB,
    senderCapability: runtimeB,
    messageNumber: 221,
    nonce: "byo-replacement-nonce-0221",
    authorizationRefs: [readGrantARef]
  }), {
    principalId: PRINCIPAL_ID,
    actorId: identityB.agent_provider_id
  });
  recordProbe(
    probes,
    "agent_b_cannot_use_agent_a_data_grant",
    wrongGrantByB.ok === false &&
      wrongGrantByB.failures.includes("grant_recipient_mismatch") &&
      wrongGrantByB.failures.includes("grant_audience_mismatch"),
    {
      status: wrongGrantByB.status,
      failures: wrongGrantByB.failures
    }
  );

  const idempotencyTheftByB = service.handleEnvelope(makeEnvelope(foundation, {
    operationName: "intent.put",
    body: intent,
    senderIdentity: identityB,
    senderCapability: runtimeB,
    messageNumber: 222,
    nonce: "byo-replacement-nonce-0222",
    subjectRefs: [intentRef],
    authorizationRefs: [writeGrantARef],
    idempotencyKey: "byo-shared-intent-idempotency-0001"
  }), {
    principalId: PRINCIPAL_ID,
    actorId: identityB.agent_provider_id,
    authorityNamespace: `${PRINCIPAL_ID}|intent.put`
  });
  recordProbe(
    probes,
    "agent_b_cannot_inherit_agent_a_idempotent_work",
    idempotencyTheftByB.ok === false &&
      idempotencyTheftByB.status === 409 &&
      idempotencyTheftByB.failures.includes("idempotency_conflict"),
    {
      status: idempotencyTheftByB.status,
      failures: idempotencyTheftByB.failures
    }
  );

  const projectionB = makeProjection(foundation, serviceSigner, {
    projectionNumber: 225,
    recipient: runtimeB.keyId,
    intent
  });
  const projectionBRef = seeder.seedObject(projectionB);
  const readGrantB = makeGrant(foundation, service, principal, {
    grantNumber: 230,
    recipient: runtimeB.keyId,
    resources: [{ ref: projectionBRef }],
    uses: ["read_local"],
    purpose: "projection_read",
    maximumDisclosures: 1
  });
  const readGrantBRef = seeder.seedObject(readGrantB, {
    grantState: {
      status: "active",
      revocation_nonce: 230,
      remaining_disclosures: 1
    }
  });
  const normalResumeInput = {
    mode: "resume",
    runtime_binding: {
      object: bindingB,
      ref: bindingBRef,
      retrieval_uri: service.objectUri(bindingBRef)
    },
    context_grant: readGrantB,
    context_grant_ref: readGrantBRef
  };
  const agentAMarkers = [
    identityA.agent_provider_id,
    runtimeA.keyId,
    objectRefKey(writeGrantARef),
    objectRefKey(readGrantARef)
  ];
  const normalResumeInputText = JSON.stringify(normalResumeInput);
  const normalResumeContainsAgentA = agentAMarkers.some((marker) =>
    normalResumeInputText.includes(marker)
  );
  const extraContextInput = structuredClone(normalResumeInput);
  extraContextInput.legacy_context = {
    identity: identityA.agent_provider_id,
    runtime: runtimeA.keyId,
    opaque: "renamed Agent A material"
  };
  const extraContextWorker = runAgentBWorker(extraContextInput);
  const substitutedUriInput = structuredClone(normalResumeInput);
  substitutedUriInput.runtime_binding.retrieval_uri =
    "https://reference.cairn.cards/cairn/0.1/objects/did%3Aweb%3Aanko.example";
  const substitutedUriWorker = runAgentBWorker(substitutedUriInput);
  const normalResumeWorker = runAgentBWorker(normalResumeInput);
  recordProbe(
    probes,
    "isolated_agent_b_accepts_only_principal_signed_b_context",
    normalResumeWorker.ok === true &&
      normalResumeWorker.output.forbidden_input_paths.length === 0 &&
      normalResumeContainsAgentA === false &&
      extraContextWorker.ok === false &&
      /unknown or missing fields/.test(extraContextWorker.stderr) &&
      substitutedUriWorker.ok === false &&
      /runtime-binding identity mismatch/.test(
        substitutedUriWorker.stderr
      ) &&
      canonicalText(normalResumeWorker.output.accepted_input_keys) ===
        canonicalText(Object.keys(normalResumeInput).sort()),
    {
      worker_status: normalResumeWorker.status,
      accepted_input_keys:
        normalResumeWorker.output?.accepted_input_keys ?? null,
      forbidden_input_paths:
        normalResumeWorker.output?.forbidden_input_paths ?? null,
      serialized_input_hash: canonicalHash(normalResumeInput),
      serialized_input_contains_agent_a_marker:
        normalResumeContainsAgentA,
      renamed_extra_context_status: extraContextWorker.status,
      renamed_extra_context_error: extraContextWorker.stderr,
      substituted_uri_status: substitutedUriWorker.status,
      substituted_uri_error: substitutedUriWorker.stderr,
      context_grant_signer: readGrantB.principal_signature.key_id,
      context_grant_ref: readGrantBRef
    }
  );

  const swappedRuntimeInput = structuredClone(normalResumeInput);
  swappedRuntimeInput.runtime_binding = {
    object: bindingA,
    ref: bindingARef,
    retrieval_uri: service.objectUri(bindingARef)
  };
  const swappedRuntimeWorker = runAgentBWorker(swappedRuntimeInput);
  const substitutedKeyBindingDraft = structuredClone(bindingB);
  substitutedKeyBindingDraft.runtime_public_key.public_key =
    runtimeA.record.public_key;
  substitutedKeyBindingDraft.runtime_binding_hash = ZERO_HASH;
  substitutedKeyBindingDraft.provider_signature = signature(providerB);
  const substitutedKeyBinding = bindAndSign(
    foundation,
    substitutedKeyBindingDraft,
    providerB
  );
  const substitutedKeyRuntimeInput = structuredClone(normalResumeInput);
  substitutedKeyRuntimeInput.runtime_binding = {
    object: substitutedKeyBinding,
    ref: objectRefFor(
      substitutedKeyBinding,
      schemaFor(foundation, substitutedKeyBinding)
    ),
    retrieval_uri: service.objectUri(
      objectRefFor(
        substitutedKeyBinding,
        schemaFor(foundation, substitutedKeyBinding)
      )
    )
  };
  const substitutedKeyRuntimeWorker = runAgentBWorker(
    substitutedKeyRuntimeInput
  );
  recordProbe(
    probes,
    "isolated_agent_b_rejects_runtime_swap",
    swappedRuntimeWorker.ok === false &&
      /signing_key_unknown|controller mismatch|identity mismatch/.test(
        swappedRuntimeWorker.stderr
      ) &&
      substitutedKeyRuntimeWorker.ok === false &&
      /runtime_public_key_material_mismatch|runtime-binding identity mismatch/.test(
        substitutedKeyRuntimeWorker.stderr
      ),
    {
      worker_status: swappedRuntimeWorker.status,
      error: swappedRuntimeWorker.stderr,
      substituted_key_worker_status: substitutedKeyRuntimeWorker.status,
      substituted_key_error: substitutedKeyRuntimeWorker.stderr
    }
  );

  const swappedGrantInput = structuredClone(normalResumeInput);
  swappedGrantInput.context_grant = readGrantA;
  swappedGrantInput.context_grant_ref = readGrantARef;
  const swappedGrantWorker = runAgentBWorker(swappedGrantInput);
  recordProbe(
    probes,
    "isolated_agent_b_rejects_agent_a_grant_swap",
    swappedGrantWorker.ok === false &&
      /principal\/runtime\/purpose\/use mismatch/.test(
        swappedGrantWorker.stderr
      ),
    {
      worker_status: swappedGrantWorker.status,
      error: swappedGrantWorker.stderr
    }
  );

  const tamperedGrant = structuredClone(readGrantB);
  tamperedGrant.resource_scopes[0].retrieval_uri =
    "https://reference.cairn.cards/cairn/0.1/objects/substituted";
  const tamperedGrantInput = structuredClone(normalResumeInput);
  tamperedGrantInput.context_grant = tamperedGrant;
  const tamperedGrantWorker = runAgentBWorker(tamperedGrantInput);
  const nonPrincipalGrantDraft = structuredClone(readGrantB);
  nonPrincipalGrantDraft.grant_hash = ZERO_HASH;
  nonPrincipalGrantDraft.principal_signature = signature(runtimeB);
  const nonPrincipalGrant = bindAndSign(
    foundation,
    nonPrincipalGrantDraft,
    runtimeB
  );
  const nonPrincipalGrantInput = structuredClone(normalResumeInput);
  nonPrincipalGrantInput.context_grant = nonPrincipalGrant;
  nonPrincipalGrantInput.context_grant_ref = objectRefFor(
    nonPrincipalGrant,
    schemaFor(foundation, nonPrincipalGrant)
  );
  const nonPrincipalGrantWorker = runAgentBWorker(nonPrincipalGrantInput);
  const expandedGrant = makeGrant(foundation, service, principal, {
    grantNumber: 233,
    recipient: runtimeB.keyId,
    resources: [{ ref: projectionBRef }, { ref: intentRef }],
    uses: ["read_local", "derive"],
    purpose: "projection_read",
    maximumDisclosures: 1
  });
  const expandedGrantInput = structuredClone(normalResumeInput);
  expandedGrantInput.context_grant = expandedGrant;
  expandedGrantInput.context_grant_ref = objectRefFor(
    expandedGrant,
    schemaFor(foundation, expandedGrant)
  );
  const expandedGrantWorker = runAgentBWorker(expandedGrantInput);
  recordProbe(
    probes,
    "isolated_agent_b_rejects_tampered_or_nonprincipal_context",
    tamperedGrantWorker.ok === false &&
      /signed object invalid/.test(tamperedGrantWorker.stderr) &&
      nonPrincipalGrantWorker.ok === false &&
      /controller mismatch/.test(nonPrincipalGrantWorker.stderr) &&
      expandedGrantWorker.ok === false &&
      /principal\/runtime\/purpose\/use mismatch|one whole-object ScopedProjection grant required/.test(
        expandedGrantWorker.stderr
      ),
    {
      tampered_worker_status: tamperedGrantWorker.status,
      tampered_error: tamperedGrantWorker.stderr,
      nonprincipal_worker_status: nonPrincipalGrantWorker.status,
      nonprincipal_error: nonPrincipalGrantWorker.stderr,
      expanded_grant_worker_status: expandedGrantWorker.status,
      expanded_grant_error: expandedGrantWorker.stderr
    }
  );

  stores.grantStatesByRef.get(objectRefKey(readGrantARef)).status = "revoked";
  const revokedRuntimeARecord = keyResolver.get(runtimeA.keyId);
  revokedRuntimeARecord.status = "revoked";
  revokedRuntimeARecord.revocation_time = REVOKED_AT;
  const disconnectedA = service.handleEnvelope(makeEnvelope(foundation, {
    operationName: "projection.get",
    body: {
      ref: projectionARef,
      retrieval_uri: service.objectUri(projectionARef),
      declared_purpose: "search",
      intended_use: "read_local"
    },
    senderIdentity: identityA,
    senderCapability: runtimeA,
    messageNumber: 141,
    nonce: "byo-replacement-nonce-0141",
    authorizationRefs: [readGrantARef]
  }), {
    principalId: PRINCIPAL_ID,
    actorId: identityA.agent_provider_id
  });
  recordProbe(
    probes,
    "disconnected_agent_a_cannot_make_new_requests",
    disconnectedA.ok === false &&
      disconnectedA.status === 403 &&
      disconnectedA.failures.includes("signing_key_revoked"),
    {
      status: disconnectedA.status,
      failures: disconnectedA.failures
    }
  );

  const forbiddenAgentBInputs = Object.freeze([
    "agent_a_private_key",
    "agent_a_prompt",
    "agent_a_chat_transcript",
    "agent_a_database",
    "agent_a_grant",
    "agent_a_idempotency_record",
    "action_authority"
  ]);

  const resolvedBindingB = service.handleEnvelope(
    normalResumeWorker.output.runtime_request,
    {
      principalId: PRINCIPAL_ID,
      actorId: identityB.agent_provider_id
    }
  );
  const resumedByB = service.handleEnvelope(
    normalResumeWorker.output.projection_request,
    {
      principalId: PRINCIPAL_ID,
      actorId: identityB.agent_provider_id
    }
  );
  recordProbe(
    probes,
    "agent_b_process_resolves_its_own_runtime_binding",
    resolvedBindingB.ok === true &&
      canonicalText(resolvedBindingB.body) === canonicalText(bindingB),
    {
      status: resolvedBindingB.status,
      runtime_binding_hash:
        resolvedBindingB.body?.runtime_binding_hash ?? null,
      worker_mode: normalResumeWorker.output.mode
    }
  );

  const resumedSourceRef =
    resumedByB.body?.payload?.entries?.[0]?.source_ref ?? null;
  const projectedBudgetBytes = JSON.stringify(
    resumedByB.body?.payload ?? null
  );
  recordProbe(
    probes,
    "agent_b_process_recovers_same_intent_ref_through_bounded_projection",
    resumedByB.ok === true &&
      sameObjectRef(resumedSourceRef, intentRef) &&
      resumedByB.body.audience.includes(runtimeB.keyId) &&
      resumedByB.body.redacted_fields.includes(
        "/constraints/total_budget"
      ) &&
      !projectedBudgetBytes.includes('"amount_minor":1200') &&
      canonicalText(resumedByB.body.payload.entries[0].value) ===
        canonicalText(intent.targets),
    {
      status: resumedByB.status,
      source_intent_ref: resumedSourceRef,
      expected_intent_ref: intentRef,
      disclosed_fields: resumedByB.body?.disclosed_fields ?? null,
      redacted_fields: resumedByB.body?.redacted_fields ?? null,
      private_budget_present_in_payload:
        projectedBudgetBytes.includes('"amount_minor":1200')
    }
  );

  const effect = makeEffectDescriptor(foundation, objectIssuer, intentRef);
  const effectRef = seeder.seedObject(effect);
  const proposalWorkerInput = {
    mode: "proposal",
    projection: resumedByB.body,
    effect,
    intent_ref: intentRef
  };
  const proposalWorker = runAgentBWorker(proposalWorkerInput);
  if (!proposalWorker.ok) {
    throw new Error(`isolated Agent B proposal failed: ${proposalWorker.stderr}`);
  }
  const proposalB = proposalWorker.output.proposal;
  const proposalBRef = objectRefFor(proposalB, schemaFor(foundation, proposalB));
  const prepareGrantB = makeGrant(foundation, service, principal, {
    grantNumber: 240,
    recipient: runtimeB.keyId,
    resources: [
      { ref: proposalBRef },
      { ref: projectionBRef },
      { ref: effectRef }
    ],
    uses: ["derive"],
    purpose: "action_preparation",
    maximumDisclosures: 1
  });
  const prepareGrantBRef = seeder.seedObject(prepareGrantB, {
    grantState: {
      status: "active",
      revocation_nonce: 240,
      remaining_disclosures: 1
    }
  });
  const prepareWorkerInput = {
    mode: "prepare",
    proposal: proposalB,
    prepare_grant: prepareGrantB,
    prepare_grant_ref: prepareGrantBRef
  };
  const prepareWorker = runAgentBWorker(prepareWorkerInput);
  if (!prepareWorker.ok) {
    throw new Error(`isolated Agent B prepare failed: ${prepareWorker.stderr}`);
  }
  const normalAgentBInputText = JSON.stringify([
    normalResumeInput,
    proposalWorkerInput,
    prepareWorkerInput
  ]);
  const normalAgentBInputsContainAgentA = agentAMarkers.some((marker) =>
    normalAgentBInputText.includes(marker)
  );
  const preparedByB = service.handleEnvelope(
    prepareWorker.output.prepare_request,
    {
      principalId: PRINCIPAL_ID,
      actorId: identityB.agent_provider_id,
      authorityNamespace: `${PRINCIPAL_ID}|action.prepare`
    }
  );
  recordProbe(
    probes,
    "agent_b_resumes_only_to_a_no_effect_draft",
    preparedByB.ok === true &&
      preparedByB.body.action_state === "draft" &&
      preparedByB.body.action_state_transition === false &&
      preparedByB.body.external_effect === false &&
      normalAgentBInputsContainAgentA === false &&
      canonicalText(preparedByB.body.not_claiming) ===
        canonicalText(["authority_to_act", "external_effect"]),
    {
      status: preparedByB.status,
      action_state: preparedByB.body?.action_state ?? null,
      action_state_transition:
        preparedByB.body?.action_state_transition ?? null,
      external_effect: preparedByB.body?.external_effect ?? null,
      not_claiming: preparedByB.body?.not_claiming ?? null,
      proposal_worker_input_keys:
        proposalWorker.output.accepted_input_keys,
      prepare_worker_input_keys:
        prepareWorker.output.accepted_input_keys,
      all_normal_worker_inputs_hash: canonicalHash([
        normalResumeInput,
        proposalWorkerInput,
        prepareWorkerInput
      ]),
      all_normal_worker_inputs_contain_agent_a_marker:
        normalAgentBInputsContainAgentA
    }
  );

  const executeAttempt = service.handleEnvelope({
    message_type: "action.execute",
    principal_id: PRINCIPAL_ID,
    sender: { actor_id: identityB.agent_provider_id }
  }, {
    principalId: PRINCIPAL_ID,
    actorId: identityB.agent_provider_id,
    authorityNamespace: `${PRINCIPAL_ID}|action.execute`
  });
  recordProbe(
    probes,
    "agent_b_cannot_execute_or_pay",
    executeAttempt.ok === false &&
      executeAttempt.status === 400 &&
      executeAttempt.code === "operation_unknown",
    {
      status: executeAttempt.status,
      code: executeAttempt.code
    }
  );

  const grantRefsAreDistinct =
    !sameObjectRef(writeGrantARef, readGrantBRef) &&
    !sameObjectRef(readGrantARef, readGrantBRef) &&
    !sameObjectRef(readGrantARef, prepareGrantBRef);
  const agentBNormalGrantsContainPrivateIntentScope = [
    ...readGrantB.resource_scopes,
    ...prepareGrantB.resource_scopes
  ].some(({ ref }) => sameObjectRef(ref, intentRef));
  recordProbe(
    probes,
    "agent_b_uses_new_principal_issued_grants",
    grantRefsAreDistinct &&
      readGrantB.recipient === runtimeB.keyId &&
      prepareGrantB.recipient === runtimeB.keyId &&
      readGrantB.resource_scopes.length === 1 &&
      agentBNormalGrantsContainPrivateIntentScope === false,
    {
      agent_a_write_grant_ref: writeGrantARef,
      agent_a_read_grant_ref: readGrantARef,
      agent_b_read_grant_ref: readGrantBRef,
      agent_b_prepare_grant_ref: prepareGrantBRef,
      agent_b_read_scope_refs:
        readGrantB.resource_scopes.map(({ ref }) => ref),
      agent_b_prepare_scope_refs:
        prepareGrantB.resource_scopes.map(({ ref }) => ref),
      agent_b_normal_grants_contain_private_intent_scope:
        agentBNormalGrantsContainPrivateIntentScope
    }
  );

  const reportDraft = {
    schema: "cairn.byo_agent_replacement_drill_report.v0.1",
    profile_under_test: capabilities.profile,
    result: probes.every(({ passed }) => passed)
      ? "local_candidate_pass"
      : "local_candidate_fail",
    generated_at: NOW,
    foundation: {
      bundle_hash: capabilities.bundle_hash,
      operations: actualOperations,
      operation_count: actualOperations.length,
      frozen_kernel_path: "protocol/",
      kernel_changed_by_drill: false
    },
    scenario: {
      principal_id: PRINCIPAL_ID,
      agent_a: {
        provider_id: identityA.agent_provider_id,
        runtime_key_id: runtimeA.keyId,
        public_key_fingerprint: runtimeA.publicFingerprint,
        final_status: "disconnected_and_revoked"
      },
      agent_b: {
        provider_id: identityB.agent_provider_id,
        runtime_key_id: runtimeB.keyId,
        public_key_fingerprint: runtimeB.publicFingerprint,
        process_boundary: "separate_node_process_with_serialized_json",
        resume_input_names:
          normalResumeWorker.output.accepted_input_keys,
        proposal_input_names:
          proposalWorker.output.accepted_input_keys,
        prepare_input_names:
          prepareWorker.output.accepted_input_keys,
        explicitly_absent_inputs: forbiddenAgentBInputs,
        final_status:
          "read_bounded_projection_of_same_intent_and_prepare_no_effect_draft"
      },
      intent_ref: intentRef,
      context_grant_ref: readGrantBRef,
      projection_ref: projectionBRef
    },
    probes,
    boundaries: {
      deterministic_fixture_keys_only: true,
      agent_b_separate_process_boundary: true,
      private_key_material_exported: false,
      agent_a_marker_present_in_serialized_b_inputs: false,
      authority_transferred: false,
      consequential_operation_available: false,
      external_effect_observed: false
    },
    not_claiming: [
      "production_service",
      "runtime_conformance",
      "agent_onboarding",
      "grant_issuance",
      "authenticated_context_transport",
      "continuation_delivery",
      "authenticated_service_observation",
      "transport_binding_conformance",
      "raw_runtime_private_key_transfer",
      "authority_to_act",
      "authorization",
      "execution",
      "payment",
      "settlement",
      "external_effect",
      "independent_verification"
    ]
  };
  recordProbe(
    probes,
    "machine_report_contains_no_private_key_material",
    containsExportedSecretField(reportDraft) === false,
    {
      exported_secret_named_field: containsExportedSecretField(reportDraft)
    }
  );
  reportDraft.result = probes.every(({ passed }) => passed)
    ? "local_candidate_pass"
    : "local_candidate_fail";
  reportDraft.report_hash = canonicalHash(reportDraft);
  return reportDraft;
}

function humanSummary(report) {
  const passed = report.probes.filter(({ passed }) => passed).length;
  const total = report.probes.length;
  return [
    `BYO-agent replacement drill: ${report.result}`,
    `${passed}/${total} direct probes passed`,
    `Agent B recovered a bounded projection of intent ${report.scenario.intent_ref.object_hash}`,
    "Agent B ran in a separate process with a new runtime-bound grant; injected Agent A material was rejected.",
    "The furthest permitted step was a signed draft with action_state_transition=false and external_effect=false.",
    "This is local candidate evidence, not production conformance or execution."
  ].join("\n");
}

const invokedPath = process.argv[1] ? realpathSync(process.argv[1]) : null;
if (invokedPath === realpathSync(fileURLToPath(import.meta.url))) {
  const report = await runReplacementDrill();
  if (process.argv.includes("--human")) {
    process.stdout.write(`${humanSummary(report)}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  }
  if (report.result !== "local_candidate_pass") process.exitCode = 1;
}
