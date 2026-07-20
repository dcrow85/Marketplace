import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildBundle, loadSources } from "../lib/bundle.mjs";
import {
  bindObjectHash,
  bodyHash,
  canonicalHash,
  canonicalText,
  objectHash,
  semanticHash,
  signatureInput,
  validateContinuationBinding,
  validateEnvelopeOperation,
  validateProposalEffectBinding,
  verifyEd25519,
  verifyObjectBindings
} from "../lib/core.mjs";
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

function uuid(number) {
  return `urn:uuid:00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

function signature() {
  return structuredClone(fixture.signature);
}

function ref(schema, number, object_hash = HASH_A) {
  return { schema, object_id: uuid(number), object_hash };
}

function schemaFor(object) {
  const schema = schemaByObjectId.get(object.schema);
  assert.ok(schema, `missing schema for ${object.schema}`);
  return schema;
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
    descriptor_issuer_signature: signature(),
    not_claiming: ["receiver_effect", "authority_to_act", "global_exactly_once"],
    ...overrides
  };
  effect.effect_id = semanticHash(effect, schema);
  return bindObjectHash(effect, schema);
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
    target: "cairn:action-service",
    ultimate_effect_recipient: null,
    resource_refs: [
      ref("cairn.active_intent.v0.1", 10),
      ref("cairn.effect_descriptor.v0.1", 20, effect.descriptor_hash)
    ],
    inputs_hash: HASH_A,
    terms_or_cart_hash: null,
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
    agent_signature: signature()
  };
  return bindObjectHash(proposal, schemaFor(proposal));
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
    action_service_signature: signature(),
    not_claiming: ["receiver_effect_before_confirmation"]
  };
  return bindObjectHash(action, schemaFor(action));
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
    issuer_signature: signature(),
    not_claiming: ["authority_to_act", "external_effect"]
  };
  return bindObjectHash(receipt, schemaFor(receipt));
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
    issuer_signature: signature(),
    not_claiming: ["authority_to_act", "physical_truth", "future_market_outcome"]
  };
  return bindObjectHash(judgment, schemaFor(judgment));
}

function makeContinuation() {
  const grantRef = ref("cairn.data_grant.v0.1", 40, HASH_B);
  const runtimeRef = ref("cairn.agent_runtime_binding.v0.1", 41, HASH_A);
  const privateEntry = (objectRef, suffix) => ({
    ref: objectRef,
    retrieval_uri: `https://objects.example/${suffix}`,
    data_grant_ref: grantRef
  });
  const bundle = {
    schema: "cairn.continuation_bundle.v0.1",
    bundle_id: uuid(42),
    principal_id: fixture.principal_id,
    recipient_runtime_binding: privateEntry(runtimeRef, "runtime-binding"),
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
        ...privateEntry(ref("cairn.active_intent.v0.1", 10), "intent"),
        required_for: "state"
      }
    ],
    current_intent_control_heads: [
      privateEntry(ref("cairn.intent_control_event.v0.1", 45), "intent-head")
    ],
    current_deal_heads: [],
    current_action_reservation_service_refs: [],
    current_grant_status_and_revocation_refs: [
      privateEntry(ref("cairn.data_grant.v0.1", 40, HASH_B), "grant-head")
    ],
    unresolved_unknown_refs: [
      privateEntry(ref("cairn.unknown.v0.1", 46), "unknown")
    ],
    issued_at: CREATED,
    expires_at: EXPIRES,
    bundle_hash: ZERO_HASH,
    issuer_signature: signature(),
    not_claiming: ["authority_transfer"]
  };
  const boundBundle = bindObjectHash(bundle, schemaFor(bundle));
  const authorization = {
    schema: "cairn.continuation_disclosure_authorization.v0.1",
    authorization_id: uuid(47),
    principal_id: fixture.principal_id,
    recipient_runtime_binding_ref: runtimeRef,
    recipient_runtime_binding_hash: runtimeRef.object_hash,
    bundle_hash: boundBundle.bundle_hash,
    data_grant_refs: [grantRef],
    purpose: "agent_continuation",
    one_shot: true,
    issued_at: CREATED,
    expires_at: EXPIRES,
    authorization_hash: ZERO_HASH,
    principal_signature: signature(),
    not_claiming: ["authority_transfer", "mandate_transfer"]
  };
  return { bundle: boundBundle, authorization: bindObjectHash(authorization, schemaFor(authorization)) };
}

function makeEnvelope(proposal = makeProposal()) {
  const operation = registry.operations.find(({ name }) => name === "action.prepare");
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
    subject_refs: [ref("cairn.action_proposal.v0.1", 21, proposal.action_proposal_hash)],
    nonce: "fixture-nonce-00000001",
    idempotency_key: "fixture-idempotency-0001",
    operation_fingerprint: HASH_A,
    critical_extensions: [],
    body_schema: operation.request_schema,
    body: proposal,
    body_hash: canonicalHash(proposal),
    trace: { parent_message_id: null, correlation_id: "fixture-workflow-1" },
    envelope_hash: ZERO_HASH,
    signature: signature()
  };
  return bindObjectHash(envelope, schemaFor(envelope));
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

test("signed-object hash excludes only declared hash and signature fields", () => {
  const proposal = makeProposal();
  assertSchemaValid(proposal);
  assert.deepEqual(verifyObjectBindings(proposal, schemaFor(proposal)), []);
  const changedProof = structuredClone(proposal);
  changedProof.agent_signature.value = "A".repeat(86);
  assert.equal(objectHash(changedProof, schemaFor(proposal)), proposal.action_proposal_hash);
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
  assert.deepEqual(validateProposalEffectBinding(forked, effect), ["effect_descriptor_hash_mismatch", "effect_id_mismatch"]);
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
  assert.equal(
    registry.operations.find(({ name }) => name === "continuation.get").authorization_requirement,
    "continuation_disclosure_authorization"
  );
  assert.equal(registry.operations.some(({ name }) => /authorize|execute|dispatch|pay|release|waive|issue/.test(name)), false);
  assert.deepEqual(sources.manifest.conformance_claims, []);
});

test("envelope binds its body and enforces mutation idempotency", () => {
  const envelope = makeEnvelope();
  assertSchemaValid(envelope);
  assert.equal(bodyHash(envelope, schemaFor(envelope)), envelope.body_hash);
  assert.deepEqual(verifyObjectBindings(envelope, schemaFor(envelope)), []);
  assert.deepEqual(validateEnvelopeOperation(envelope, registry), []);

  const mutatedBody = structuredClone(envelope);
  mutatedBody.body.target = "cairn:different-target";
  assert.ok(verifyObjectBindings(mutatedBody, schemaFor(mutatedBody)).includes("body_hash_mismatch"));

  const noIdempotency = structuredClone(envelope);
  noIdempotency.idempotency_key = null;
  assert.ok(validateEnvelopeOperation(noIdempotency, registry).includes("idempotency_key_required"));

  const wrongSchema = structuredClone(envelope);
  wrongSchema.body_schema = registry.operations.find(({ name }) => name === "intent.get").request_schema;
  assert.ok(validateEnvelopeOperation(wrongSchema, registry).includes("body_schema_mismatch"));
});

test("unknown critical envelope extensions fail closed", () => {
  const envelope = makeEnvelope();
  envelope.critical_extensions = ["https://malicious.example/authority-upgrade"];
  assert.ok(validateEnvelopeOperation(envelope, registry).includes("critical_extension_unknown"));
});

test("continuation bundle carries context but binds no transferable authority", () => {
  const { bundle, authorization } = makeContinuation();
  assertSchemaValid(bundle);
  assertSchemaValid(authorization);
  assert.deepEqual(validateContinuationBinding(bundle, authorization), []);
  assert.deepEqual(bundle.not_claiming, ["authority_transfer"]);

  const embeddedAuthorization = structuredClone(bundle);
  embeddedAuthorization.authorization = authorization;
  assert.equal(ajv.getSchema(schemaFor(bundle).$id)(embeddedAuthorization), false);
});

test("continuation runtime swap and grant-graph expansion fail", () => {
  const { bundle, authorization } = makeContinuation();
  const wrongRuntime = structuredClone(authorization);
  wrongRuntime.recipient_runtime_binding_hash = HASH_B;
  assert.ok(validateContinuationBinding(bundle, wrongRuntime).includes("runtime_binding_hash_mismatch"));

  const missingGrant = structuredClone(authorization);
  missingGrant.data_grant_refs = [];
  assert.ok(validateContinuationBinding(bundle, missingGrant).includes("data_grant_graph_exceeded"));

  const inlineUnknown = structuredClone(bundle);
  inlineUnknown.unresolved_unknown_refs[0].private_budget = { amount_minor: 9999, asset: "USD" };
  assert.equal(ajv.getSchema(schemaFor(bundle).$id)(inlineUnknown), false);
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
