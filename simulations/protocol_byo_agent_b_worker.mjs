#!/usr/bin/env node

/**
 * Isolated Agent B fixture process for the BYO replacement drill.
 *
 * The parent sends one JSON value over stdin. This process has no reference to
 * the parent service stores, Agent A capability, Agent A prompt/memory, or live
 * object variables. It validates the serialized inputs it receives, creates
 * B-signed protocol objects/envelopes, and returns one JSON value over stdout.
 *
 * The deterministic runtime key is a public test fixture, not a production
 * secret or key-provisioning design.
 */

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as signBytes
} from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  bindObjectHash,
  canonicalHash,
  canonicalText,
  objectRefFor,
  sameObjectRef,
  signatureInput,
  valueAtPointer
} from "../protocol/lib/core.mjs";
import {
  operationFingerprint,
  validateSignedObject
} from "../protocol/lib/validation.mjs";
import { loadReferenceFoundation } from "../protocol/reference-service/service.mjs";
import {
  signaturePlaceholder,
  ZERO_HASH
} from "../protocol/reference-service/signer.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROTOCOL_ROOT = path.resolve(HERE, "../protocol");
const PRINCIPAL_ID = "did:example:cairn-collector";
const SERVICE_ID = "cairn:action-service";
const OBJECT_ISSUER_ID = "cairn:object-service";
const PROVIDER_B_ID = "did:web:independent-agent.example";
const RUNTIME_B_KEY_ID = `${PROVIDER_B_ID}#runtime-1`;
const CREATED = "2026-07-23T14:00:00Z";
const NOW = "2026-07-23T14:30:00Z";
const EXPIRES = "2026-07-23T16:00:00Z";
const NOT_BEFORE = "2026-07-23T13:00:00Z";
const KEY_EXPIRES = "2026-07-23T17:00:00Z";

const IDENTITY_B = Object.freeze({
  agent_provider_id: PROVIDER_B_ID,
  agent_product_id: "independent-replacement-agent",
  runtime_instance_key_id: RUNTIME_B_KEY_ID,
  model_id_and_version: "independent-model",
  policy_hash: `sha-256:${"3".repeat(64)}`,
  toolset_hash: `sha-256:${"4".repeat(64)}`,
  session_id: "replacement-session-1"
});

function uuid(number) {
  return `urn:uuid:00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

function runtimeCapability() {
  const seed = createHash("sha256")
    .update("cairn-byo-replacement-fixture:runtime-b", "utf8")
    .digest()
    .subarray(0, 32);
  const privateKey = createPrivateKey({
    key: Buffer.concat([
      Buffer.from("302e020100300506032b657004220420", "hex"),
      seed
    ]),
    format: "der",
    type: "pkcs8"
  });
  const publicKey = createPublicKey(privateKey).export({ format: "jwk" }).x;
  return Object.freeze({
    keyId: RUNTIME_B_KEY_ID,
    keyRecord: Object.freeze({
      key_id: RUNTIME_B_KEY_ID,
      key_type: "Ed25519",
      controller: PROVIDER_B_ID,
      status: "active",
      not_before: NOT_BEFORE,
      expires_at: KEY_EXPIRES,
      revocation_time: null,
      public_key: publicKey
    }),
    sign: (bytes) => signBytes(null, bytes, privateKey)
  });
}

function fixturePublicKeyRecord(label, keyId, controller) {
  const seed = createHash("sha256")
    .update(`cairn-byo-replacement-fixture:${label}`, "utf8")
    .digest()
    .subarray(0, 32);
  const privateKey = createPrivateKey({
    key: Buffer.concat([
      Buffer.from("302e020100300506032b657004220420", "hex"),
      seed
    ]),
    format: "der",
    type: "pkcs8"
  });
  return Object.freeze({
    key_id: keyId,
    key_type: "Ed25519",
    controller,
    status: "active",
    not_before: NOT_BEFORE,
    expires_at: KEY_EXPIRES,
    revocation_time: null,
    public_key: createPublicKey(privateKey).export({ format: "jwk" }).x
  });
}

function schemaFor(foundation, object) {
  const schema = foundation.schemasByObjectId.get(object?.schema);
  if (!schema) throw new TypeError(`missing object schema for ${object?.schema}`);
  return schema;
}

function signature(capability) {
  return signaturePlaceholder(capability.keyId, CREATED);
}

function bindAndSign(foundation, object, capability) {
  const schema = schemaFor(foundation, object);
  const bound = bindObjectHash(structuredClone(object), schema);
  const proof = valueAtPointer(
    bound,
    schema["x-cairn-signature-pointers"][0]
  );
  proof.value = capability
    .sign(signatureInput(bound.schema, proof.signed_hash))
    .toString("base64url");
  return bound;
}

function fixtureResolver(runtime) {
  const records = [
    fixturePublicKeyRecord(
      "principal",
      `${PRINCIPAL_ID}#key-1`,
      PRINCIPAL_ID
    ),
    fixturePublicKeyRecord(
      "service",
      "https://reference.cairn.cards/keys/service-1",
      SERVICE_ID
    ),
    fixturePublicKeyRecord(
      "object-issuer",
      "https://reference.cairn.cards/keys/object-issuer-1",
      OBJECT_ISSUER_ID
    ),
    fixturePublicKeyRecord(
      "provider-b",
      `${PROVIDER_B_ID}#provider-1`,
      PROVIDER_B_ID
    ),
    runtime.keyRecord
  ];
  return new Map(records.map((record) => [record.key_id, record]));
}

function validateControllerSigned(
  foundation,
  object,
  expectedController,
  keyResolver
) {
  const failures = validateSignedObject(object, {
    ajv: foundation.ajv,
    schemasByObjectId: foundation.schemasByObjectId,
    keyResolver,
    now: NOW
  });
  if (failures.length) {
    throw new TypeError(`signed object invalid: ${failures.join(",")}`);
  }
  const schema = schemaFor(foundation, object);
  const proof = valueAtPointer(
    object,
    schema["x-cairn-signature-pointers"][0]
  );
  const signer = keyResolver.get(proof.key_id);
  if (!signer || signer.controller !== expectedController) {
    throw new TypeError("signed object controller mismatch");
  }
}

function validateGrant(
  foundation,
  { grant, grantRef, purpose, use, keyResolver }
) {
  validateControllerSigned(
    foundation,
    grant,
    PRINCIPAL_ID,
    keyResolver
  );
  const exactRef = objectRefFor(grant, schemaFor(foundation, grant));
  if (!sameObjectRef(exactRef, grantRef)) {
    throw new TypeError("DataGrant reference mismatch");
  }
  if (
    grant.principal_id !== PRINCIPAL_ID ||
    grant.recipient !== RUNTIME_B_KEY_ID ||
    canonicalText(grant.audience) !== canonicalText([RUNTIME_B_KEY_ID]) ||
    grant.purpose !== purpose ||
    !grant.uses.includes(use)
  ) {
    throw new TypeError("DataGrant principal/runtime/purpose/use mismatch");
  }
}

function makeEnvelope(
  foundation,
  runtime,
  {
    operationName,
    body,
    messageNumber,
    nonce,
    authorizationRefs = [],
    subjectRefs = [],
    idempotencyKey = undefined
  }
) {
  const operation = foundation.registry.operations.find(
    ({ name }) => name === operationName
  );
  if (!operation) throw new TypeError(`unknown operation ${operationName}`);
  const envelope = {
    schema: "cairn.envelope.v0.1",
    protocol_version: "0.1",
    message_id: uuid(messageNumber),
    message_type: operationName,
    created_at: CREATED,
    expires_at: EXPIRES,
    sender: {
      actor_id: PROVIDER_B_ID,
      runtime_key_id: RUNTIME_B_KEY_ID
    },
    principal_id: PRINCIPAL_ID,
    audience: [SERVICE_ID],
    subject_refs: subjectRefs,
    authorization_refs: authorizationRefs,
    nonce,
    idempotency_key: idempotencyKey ??
      (operation.object_store_mutating
        ? `byo-agent-b-idempotency-${messageNumber}`
        : null),
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
    signature: signature(runtime)
  };
  envelope.operation_fingerprint = operationFingerprint(envelope);
  return bindAndSign(foundation, envelope, runtime);
}

function forbiddenNormalInputKeys(input) {
  const forbidden = /(?:agent_a|anko|private_key|prompt|chat|database|stores|idempotency_record|action_authority)/i;
  const matches = [];
  const visit = (value, pathParts = []) => {
    if (Array.isArray(value)) {
      value.forEach((member, index) => visit(member, [...pathParts, index]));
      return;
    }
    if (value === null || typeof value !== "object") return;
    for (const [key, nested] of Object.entries(value)) {
      const next = [...pathParts, key];
      if (forbidden.test(key)) matches.push(`/${next.join("/")}`);
      visit(nested, next);
    }
  };
  visit(input);
  return matches;
}

function projectionScope(grant) {
  const candidates = grant.resource_scopes.filter(
    ({ resource_kind, ref }) =>
      resource_kind === "object" &&
      ref?.schema === "cairn.scoped_projection.v0.1"
  );
  if (
    candidates.length !== 1 ||
    canonicalText(candidates[0].field_paths) !== canonicalText([""])
  ) {
    throw new TypeError("one whole-object ScopedProjection grant required");
  }
  return candidates[0];
}

function resumeRequests(foundation, runtime, input, keyResolver) {
  const forbidden = forbiddenNormalInputKeys(input);
  if (forbidden.length) {
    throw new TypeError(`forbidden normal Agent B input: ${forbidden.join(",")}`);
  }
  validateControllerSigned(
    foundation,
    input.runtime_binding.object,
    PROVIDER_B_ID,
    keyResolver
  );
  const exactRuntimeRef = objectRefFor(
    input.runtime_binding.object,
    schemaFor(foundation, input.runtime_binding.object)
  );
  if (
    !sameObjectRef(exactRuntimeRef, input.runtime_binding.ref) ||
    input.runtime_binding.object.agent_identity.runtime_instance_key_id !==
      RUNTIME_B_KEY_ID ||
    input.runtime_binding.object.agent_identity.agent_provider_id !==
      PROVIDER_B_ID
  ) {
    throw new TypeError("Agent B runtime-binding identity mismatch");
  }
  validateGrant(foundation, {
    grant: input.context_grant,
    grantRef: input.context_grant_ref,
    purpose: "projection_read",
    use: "read_local",
    keyResolver
  });
  const scope = projectionScope(input.context_grant);
  return {
    mode: "resume",
    accepted_input_keys: Object.keys(input).sort(),
    forbidden_input_paths: forbidden,
    runtime_request: makeEnvelope(foundation, runtime, {
      operationName: "runtime_binding.get",
      body: {
        ref: input.runtime_binding.ref,
        retrieval_uri: input.runtime_binding.retrieval_uri
      },
      messageNumber: 231,
      nonce: "byo-replacement-nonce-0231"
    }),
    projection_request: makeEnvelope(foundation, runtime, {
      operationName: "projection.get",
      body: {
        ref: scope.ref,
        retrieval_uri: scope.retrieval_uri,
        declared_purpose: "search",
        intended_use: "read_local"
      },
      messageNumber: 232,
      nonce: "byo-replacement-nonce-0232",
      authorizationRefs: [input.context_grant_ref]
    })
  };
}

function makeProposal(foundation, runtime, input, keyResolver) {
  if (forbiddenNormalInputKeys(input).length) {
    throw new TypeError("forbidden normal Agent B proposal input");
  }
  validateControllerSigned(
    foundation,
    input.projection,
    SERVICE_ID,
    keyResolver
  );
  validateControllerSigned(
    foundation,
    input.effect,
    OBJECT_ISSUER_ID,
    keyResolver
  );
  const projection = input.projection;
  const intentRef = input.intent_ref;
  const sourceEntry = projection.payload.entries.find(
    ({ output_path }) => output_path === "/targets"
  );
  if (
    projection.principal_id !== PRINCIPAL_ID ||
    !projection.audience.includes(RUNTIME_B_KEY_ID) ||
    !sameObjectRef(sourceEntry?.source_ref, intentRef) ||
    sourceEntry?.source_path !== "/targets" ||
    !projection.redacted_fields.includes("/constraints/total_budget")
  ) {
    throw new TypeError("projection does not bind permitted replacement context");
  }
  const effectRef = objectRefFor(
    input.effect,
    schemaFor(foundation, input.effect)
  );
  const proposal = bindAndSign(foundation, {
    schema: "cairn.action_proposal.v0.1",
    action_proposal_id: uuid(301),
    principal_id: PRINCIPAL_ID,
    agent_identity: structuredClone(IDENTITY_B),
    capability: "prepare",
    deal_id: null,
    expected_deal_head_hash: null,
    target: input.effect.executor_target,
    ultimate_effect_recipient: null,
    ultimate_effect_account_commitment: null,
    effect_operation_kind: input.effect.effect_semantics.operation_kind,
    effect_provider_id: input.effect.effect_semantics.provider_id,
    copy_ids: structuredClone(input.effect.effect_semantics.copy_ids),
    resource_refs: [intentRef, effectRef],
    inputs_hash: canonicalHash({
      intent_ref: intentRef,
      projection_hash: projection.projection_hash,
      purpose: "resume_principal_held_intent"
    }),
    terms_or_cart_hash:
      input.effect.effect_semantics.closed_terms_or_cart_hash,
    evidence_snapshot_hash: null,
    amounts: [],
    rail: null,
    requested_execution_mode: "supervised",
    authority_candidate_ref: null,
    effect_descriptor_ref: effectRef,
    effect_id: input.effect.effect_id,
    unknowns: [{
      code: "seller_copy_not_selected",
      description: "The replacement agent has not selected a seller copy.",
      blocking_capabilities: ["accept_terms"]
    }],
    not_claiming: ["authority_to_act", "external_effect"],
    created_at: CREATED,
    expires_at: EXPIRES,
    action_proposal_hash: ZERO_HASH,
    agent_signature: signature(runtime)
  }, runtime);
  return {
    mode: "proposal",
    accepted_input_keys: Object.keys(input).sort(),
    proposal
  };
}

function prepareRequest(foundation, runtime, input, keyResolver) {
  if (forbiddenNormalInputKeys(input).length) {
    throw new TypeError("forbidden normal Agent B prepare input");
  }
  validateControllerSigned(
    foundation,
    input.proposal,
    PROVIDER_B_ID,
    keyResolver
  );
  validateGrant(foundation, {
    grant: input.prepare_grant,
    grantRef: input.prepare_grant_ref,
    purpose: "action_preparation",
    use: "derive",
    keyResolver
  });
  const proposalRef = objectRefFor(
    input.proposal,
    schemaFor(foundation, input.proposal)
  );
  const covered = input.prepare_grant.resource_scopes.some(
    ({ ref }) => ref && sameObjectRef(ref, proposalRef)
  );
  if (!covered) throw new TypeError("prepare grant does not cover proposal");
  return {
    mode: "prepare",
    accepted_input_keys: Object.keys(input).sort(),
    prepare_request: makeEnvelope(foundation, runtime, {
      operationName: "action.prepare",
      body: input.proposal,
      messageNumber: 241,
      nonce: "byo-replacement-nonce-0241",
      subjectRefs: [proposalRef],
      authorizationRefs: [input.prepare_grant_ref],
      idempotencyKey: "byo-agent-b-prepare-idempotency-0001"
    })
  };
}

async function main() {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const foundation = await loadReferenceFoundation(PROTOCOL_ROOT);
  const runtime = runtimeCapability();
  const keyResolver = fixtureResolver(runtime);
  let output;
  if (input.mode === "resume") {
    output = resumeRequests(foundation, runtime, input, keyResolver);
  } else if (input.mode === "proposal") {
    output = makeProposal(foundation, runtime, input, keyResolver);
  } else if (input.mode === "prepare") {
    output = prepareRequest(foundation, runtime, input, keyResolver);
  } else {
    throw new TypeError("unknown Agent B worker mode");
  }
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

try {
  await main();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Agent B worker failure"}\n`
  );
  process.exitCode = 2;
}
