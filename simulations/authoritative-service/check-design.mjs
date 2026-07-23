import assert from "node:assert/strict";
import {
  createPrivateKey,
  createPublicKey,
  sign as signBytes
} from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  bindObjectHash,
  canonicalHash,
  canonicalText,
  objectHash,
  signatureInput,
  verifyEd25519
} from "../../protocol/lib/core.mjs";
import { EXACT_FOUNDATION_OPERATION_TUPLES } from "../../protocol/lib/foundation-profile.mjs";
import { createAjv } from "../../protocol/lib/schemas.mjs";
import {
  createReferenceService,
  loadReferenceFoundation
} from "../../protocol/reference-service/service.mjs";
import { MemoryReferenceStores } from "../../protocol/reference-service/state.mjs";

const SCHEMA_PATH = new URL("./authoritative-service.schema.json", import.meta.url);
const SPEC_PATH = new URL(
  "../../Protocol_Agent_Authoritative_Service_Change_Spec_v0.1.md",
  import.meta.url
);
const VECTORS_PATH = new URL("./canonical-vectors.json", import.meta.url);
const REGISTRY_PATH = new URL("../../protocol/operations/registry.json", import.meta.url);
const EXPECTED_SCHEMA_HASH = "sha-256:225a6e85866b98937b91f77a265c7a8a7aa3c6d38022ea043a3b0720f47297fd";
const EXPECTED_VECTORS_HASH = "sha-256:18fb8a5b2fd2a05f1b95dd2f0de4c1fb1be46295ab49f2162c2dc3440152d4e0";
const EXPECTED_DEFS = [
  "sha256",
  "nullableSha256",
  "timestamp",
  "nullableTimestamp",
  "uuidUrn",
  "identifier",
  "keyId",
  "schemaId",
  "registrySchemaReference",
  "registeredOperation",
  "idempotentMutationOperation",
  "operationContract",
  "structuralKey",
  "objectRef",
  "nullableObjectRef",
  "externalArtifactRef",
  "nullableExternalArtifactRef",
  "signature",
  "keyRecord",
  "localServiceKeyProfile",
  "validationKeyManifest",
  "receiverAuthenticationRecord",
  "hostAuthenticationContext",
  "objectRow",
  "runtimeBindingRow",
  "referenceRow",
  "validationKeyRow",
  "grantStateRow",
  "usedNonceRow",
  "idempotencyRow",
  "operationalRowProjection",
  "objectRowProjection",
  "runtimeBindingRowProjection",
  "dataGrantRowProjection",
  "effectDescriptorRowProjection",
  "validationKeyRowProjection",
  "grantStateRowProjection",
  "usedNonceRowProjection",
  "idempotencyRowProjection",
  "dependencyEntry",
  "dependencyManifest",
  "genesisManifest",
  "grantEffect",
  "notClaiming",
  "serviceObservation",
  "kernelSuccess",
  "kernelFailure",
  "localObservedResult"
];
const EXPECTED_ENTRYPOINTS = [
  "localServiceKeyProfile",
  "validationKeyManifest",
  "receiverAuthenticationRecord",
  "hostAuthenticationContext",
  "genesisManifest",
  "dependencyManifest",
  "operationalRowProjection",
  "serviceObservation",
  "localObservedResult"
];
const EXPECTED_NONCLAIMS = [
  "production_service",
  "deployed_service",
  "authenticated_transport",
  "delivery_to_caller",
  "continuation_delivery",
  "cross_page_continuity",
  "runtime_onboarding",
  "agent_onboarding",
  "grant_issuance",
  "authenticated_service_discovery",
  "production_service_identity",
  "host_authentication_truth",
  "authority_to_act",
  "authorization",
  "execution",
  "payment",
  "settlement",
  "escrow",
  "release",
  "waiver",
  "external_exactly_once",
  "external_system_idempotency",
  "card_authenticity",
  "card_condition",
  "custody",
  "shipment",
  "delivery",
  "legal_identity",
  "postgresql_equivalence",
  "protocol_conformance",
  "external_effect",
  "confidential_computing",
  "operator_blindness",
  "unlinkability",
  "deletion_enforced",
  "service_availability",
  "runtime_conformance",
  "object_reference_discovery",
  "transport_binding_conformance",
  "raw_runtime_private_key_transfer",
  "release_authenticity_without_external_pin"
];
const EXPECTED_FIXTURE = {
  public_key: "6kpsY-KcUgq-9VB7Ey7F-ZVHdq6-vnuSQh7qaRRG0iw",
  service_profile_hash: "sha-256:043f9fe408bbbd4ac74dd50a909c90cb87e08cc7e71c617bab1d117460bfef0b",
  validation_manifest_hash: "sha-256:5fe6e62dfe489cc14a114389d59c9082b7bb8cb98aea81bb5f5145b0db65569c",
  host_context_hash: "sha-256:e52249db719f30e7238c91de07121e901e71186ad84273f100f2363b4beee283",
  dependency_manifest_hash: "sha-256:ffb2b754677e87ab68c6619c065e5fc323088ca2737f24b92346e09fe77a8379",
  genesis_manifest_hash: "sha-256:5d34f0aa27bd784749499c4e4359834ea230b3ad824a109a0c1495e0e54262e1",
  genesis_state_root: "sha-256:4a29781a4cb0b742a95847f6ad31acf1e852dcb952020ee79c0ba5baeb0ed5ab",
  success_observation_hash: "sha-256:2a4afa507db825b330a29b726a61f2961d246c63ada6a9bba3c4a5fb9ed4a098",
  success_observation_signature: "Xnl5zIMpZ76nZhomaTvcd8251eukdpDy7Jugo799EMyAWsn5sjJPpPdW2PPbgztHyLf_wmRDHeR26njWWH73Ag",
  accepted_failure_observation_hash: "sha-256:959dd09cdb524a52c6ba580de01a58234880b840b84dfb40d5a30033e8df3482",
  accepted_failure_observation_signature: "w1fGHhyGfV3V3WO5a4Y4vYydiVpWQ_F81-SZkAcefJSDbrLhQ98CsuS6ToAQAtIQS-NNWpdukY35iG3tEvhlBg"
};

const schema = JSON.parse(await readFile(SCHEMA_PATH, "utf8"));
const spec = await readFile(SPEC_PATH, "utf8");
const vectors = JSON.parse(await readFile(VECTORS_PATH, "utf8"));
const registry = JSON.parse(await readFile(REGISTRY_PATH, "utf8"));
const ajv = createAjv();
const validateBundle = ajv.compile(schema);

assert.deepEqual(Object.keys(schema.$defs), EXPECTED_DEFS);
assert.deepEqual(
  schema.oneOf.map(({ $ref }) => $ref.replace("#/$defs/", "")),
  EXPECTED_ENTRYPOINTS
);
assert.deepEqual(
  schema.$defs.notClaiming.prefixItems.map(({ const: value }) => value),
  EXPECTED_NONCLAIMS
);
assert.equal(schema.$defs.notClaiming.minItems, EXPECTED_NONCLAIMS.length);
assert.equal(schema.$defs.notClaiming.maxItems, EXPECTED_NONCLAIMS.length);
assert.equal(schema.$defs.notClaiming.items, false);

const validateOperationContract = ajv.compile({
  "$ref": `${schema.$id}#/$defs/operationContract`
});
const registryContracts = registry.operations.map((operation) => ({
  operation: operation.name,
  request_schema: operation.request_schema,
  response_schema: operation.response_schema,
  consequence: operation.consequence
}));
const foundationContracts = EXACT_FOUNDATION_OPERATION_TUPLES.map((tuple) => ({
  operation: tuple[0],
  request_schema: tuple[4],
  response_schema: tuple[5],
  consequence: tuple[3]
}));
assert.deepEqual(registryContracts, foundationContracts);
for (const contract of registryContracts) {
  assert.equal(
    validateOperationContract(contract),
    true,
    `${contract.operation}: ${JSON.stringify(validateOperationContract.errors)}`
  );
}
assert.equal(
  validateOperationContract({
    operation: "action.execute",
    request_schema: registryContracts[7].request_schema,
    response_schema: registryContracts[7].response_schema,
    consequence: "preparation_only"
  }),
  false,
  "consequential operation escaped the exact registry contract"
);

const observation = schema.$defs.serviceObservation;
assert.equal(observation["x-cairn-object-schema"], "cairn.service_observation.v0.1");
assert.equal(observation["x-cairn-self-hash-pointer"], "/observation_hash");
assert.deepEqual(observation["x-cairn-signature-pointers"], ["/service_signature"]);
assert.deepEqual(observation["x-cairn-hash-exclusion-pointers"], [
  "/service_signature/signed_hash",
  "/service_signature/value"
]);
for (const vector of vectors.vectors) {
  assert.equal(canonicalText(vector.value), vector.canonical_text, vector.id);
  assert.equal(canonicalHash(vector.value), vector.canonical_hash, vector.id);
}
const rowVector = vectors.vectors.find(({ id }) => id === "operational_object_row");
assert.ok(rowVector, "operational row vector missing");
const validateRow = ajv.compile({
  "$ref": `${schema.$id}#/$defs/operationalRowProjection`
});
assert.equal(validateRow(rowVector.value), true, JSON.stringify(validateRow.errors));
assert.equal(
  validateBundle(rowVector.value),
  true,
  JSON.stringify(validateBundle.errors)
);
const unknownColumn = structuredClone(rowVector.value);
unknownColumn.columns.implementation_note = "must fail closed";
assert.equal(validateRow(unknownColumn), false, "unknown committed column accepted");
const invalidGenesis = {
  schema: "cairn.genesis_manifest.v0.1",
  manifest_id: "urn:uuid:00000000-0000-4000-8000-000000000001",
  manifest_hash: `sha-256:${"0".repeat(64)}`,
  store_id: "urn:uuid:00000000-0000-4000-8000-000000000002",
  kernel_profile: "cairn-proposal-foundation-v0.1",
  bundle_hash: `sha-256:${"1".repeat(64)}`,
  service_key_profile_ref: {
    artifact_schema: "cairn.local_service_key_profile.v0.1",
    artifact_id: "urn:uuid:00000000-0000-4000-8000-000000000003",
    artifact_hash: `sha-256:${"2".repeat(64)}`
  },
  validation_key_manifest_ref: {
    artifact_schema: "cairn.validation_key_manifest.v0.1",
    artifact_id: "urn:uuid:00000000-0000-4000-8000-000000000004",
    artifact_hash: `sha-256:${"3".repeat(64)}`
  },
  initial_rows: [rowVector.value]
};
const validateGenesis = ajv.compile({
  "$ref": `${schema.$id}#/$defs/genesisManifest`
});
assert.equal(
  validateGenesis(invalidGenesis),
  false,
  "genesis accepted a nonzero owner scope sequence"
);

const ZERO_HASH = `sha-256:${"0".repeat(64)}`;
const NOW = "2026-07-23T16:00:00Z";
const EXPIRES = "2027-07-23T16:00:00Z";
const SERVICE_ID = "cairn:reference-service";
const STORE_ID = "urn:uuid:00000000-0000-4000-8000-000000000001";
const SERVICE_KEY_ID = "https://cairn.invalid/keys/service-1";
const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const fixturePrivateKey = createPrivateKey({
  key: Buffer.concat([PKCS8_ED25519_PREFIX, Buffer.alloc(32, 7)]),
  format: "der",
  type: "pkcs8"
});
const fixturePublicKey = createPublicKey(fixturePrivateKey)
  .export({ format: "der", type: "spki" })
  .subarray(-32)
  .toString("base64url");
const fixtureKeyRecord = {
  key_id: SERVICE_KEY_ID,
  controller: SERVICE_ID,
  key_type: "Ed25519",
  public_key: fixturePublicKey,
  status: "active",
  not_before: "2026-07-23T00:00:00Z",
  expires_at: EXPIRES,
  revocation_time: null,
  profile_revision: 1
};

function bindExternal(value, definition) {
  return bindObjectHash(value, schema.$defs[definition]);
}

function validateDefinition(definition, value) {
  const validate = ajv.compile({
    "$ref": `${schema.$id}#/$defs/${definition}`
  });
  assert.equal(validate(value), true, `${definition}: ${JSON.stringify(validate.errors)}`);
}

function keyArrayIsStrict(records) {
  return records.every((record, index) =>
    index === 0 ||
    Buffer.compare(
      Buffer.from(records[index - 1].key_id, "utf8"),
      Buffer.from(record.key_id, "utf8")
    ) < 0
  );
}

function serviceProfileIsCoherent(profile, at) {
  const current = profile.keys.filter(({ key_id }) => key_id === profile.current_key_id);
  return keyArrayIsStrict(profile.keys) &&
    current.length === 1 &&
    current[0].controller === profile.service_id &&
    current[0].status === "active" &&
    current[0].not_before <= at &&
    at < current[0].expires_at &&
    current[0].revocation_time === null &&
    objectHash(profile, schema.$defs.localServiceKeyProfile) === profile.profile_hash;
}

const serviceProfile = bindExternal({
  schema: "cairn.local_service_key_profile.v0.1",
  profile_id: "urn:uuid:00000000-0000-4000-8000-000000000010",
  profile_hash: ZERO_HASH,
  service_id: SERVICE_ID,
  store_id: STORE_ID,
  kernel_profile: "cairn-proposal-foundation-v0.1",
  bundle_hash: `sha-256:${"a".repeat(64)}`,
  allowed_observation_schema: "cairn.service_observation.v0.1",
  current_key_id: SERVICE_KEY_ID,
  keys: [fixtureKeyRecord],
  prior_profile_hash: null,
  created_at: NOW
}, "localServiceKeyProfile");
validateDefinition("localServiceKeyProfile", serviceProfile);
assert.equal(serviceProfileIsCoherent(serviceProfile, NOW), true);

const missingCurrentProfile = structuredClone(serviceProfile);
missingCurrentProfile.current_key_id = "https://cairn.invalid/keys/missing";
assert.equal(serviceProfileIsCoherent(missingCurrentProfile, NOW), false);
const duplicateProfile = structuredClone(serviceProfile);
duplicateProfile.keys.push(structuredClone(fixtureKeyRecord));
const validateServiceProfile = ajv.compile({
  "$ref": `${schema.$id}#/$defs/localServiceKeyProfile`
});
assert.equal(validateServiceProfile(duplicateProfile), false, "duplicate profile key accepted");
const nullExpiryProfile = structuredClone(serviceProfile);
nullExpiryProfile.keys[0].expires_at = null;
assert.equal(validateServiceProfile(nullExpiryProfile), false, "null key expiry accepted");
const noncanonicalKeyProfile = structuredClone(serviceProfile);
noncanonicalKeyProfile.keys[0].public_key = `${"A".repeat(42)}B`;
assert.equal(validateServiceProfile(noncanonicalKeyProfile), false, "noncanonical key accepted");

const validationManifest = bindExternal({
  schema: "cairn.validation_key_manifest.v0.1",
  manifest_id: "urn:uuid:00000000-0000-4000-8000-000000000011",
  manifest_hash: ZERO_HASH,
  keys: [fixtureKeyRecord]
}, "validationKeyManifest");
validateDefinition("validationKeyManifest", validationManifest);
assert.equal(keyArrayIsStrict(validationManifest.keys), true);
const validateValidationManifest = ajv.compile({
  "$ref": `${schema.$id}#/$defs/validationKeyManifest`
});
const duplicateValidationManifest = structuredClone(validationManifest);
duplicateValidationManifest.keys.push(structuredClone(fixtureKeyRecord));
assert.equal(
  validateValidationManifest(duplicateValidationManifest),
  false,
  "duplicate validation key accepted"
);
const earlierKey = {
  ...fixtureKeyRecord,
  key_id: "https://cairn.invalid/keys/service-0"
};
const unsortedValidationManifest = bindExternal({
  schema: "cairn.validation_key_manifest.v0.1",
  manifest_id: "urn:uuid:00000000-0000-4000-8000-000000000013",
  manifest_hash: ZERO_HASH,
  keys: [fixtureKeyRecord, earlierKey]
}, "validationKeyManifest");
assert.equal(validateValidationManifest(unsortedValidationManifest), true);
assert.equal(keyArrayIsStrict(unsortedValidationManifest.keys), false);

const authorityNamespaceRaw = "tenant:demo";
const accountTenantCommitment = `sha-256:${"b".repeat(64)}`;
const authorityNamespaceCommitment = canonicalHash([
  "cairn-authority-namespace-v0.1",
  accountTenantCommitment,
  authorityNamespaceRaw
]);
const receiverAuthenticationRecord = {
  schema: "cairn.receiver_authentication_record.v0.1",
  authentication_handle: "auth:fixture-1",
  account_tenant_commitment: accountTenantCommitment,
  principal_id: null,
  actor_id: "agent:anko",
  runtime_key_id: null,
  authority_namespace_raw: authorityNamespaceRaw,
  authority_namespace_commitment: authorityNamespaceCommitment,
  trust_profile_id: "host-auth:fixture",
  trust_profile_hash: `sha-256:${"c".repeat(64)}`,
  authentication_evidence_commitment: `sha-256:${"d".repeat(64)}`,
  assertion_level: "host_asserted"
};
validateDefinition("receiverAuthenticationRecord", receiverAuthenticationRecord);

const hostContext = bindExternal({
  schema: "cairn.host_authentication_context.v0.1",
  context_hash: ZERO_HASH,
  account_tenant_commitment: accountTenantCommitment,
  principal_id: null,
  actor_id: "agent:anko",
  runtime_key_id: null,
  authority_namespace_commitment: authorityNamespaceCommitment,
  trust_profile_id: "host-auth:fixture",
  trust_profile_hash: `sha-256:${"c".repeat(64)}`,
  authentication_evidence_commitment: `sha-256:${"d".repeat(64)}`,
  assertion_level: "host_asserted"
}, "hostAuthenticationContext");
validateDefinition("hostAuthenticationContext", hostContext);

const attemptedRuntimeKey = canonicalText(["did:key:runtime-missing"]);
const absentStructuralKey = canonicalText([
  "index",
  "runtime_key_id",
  attemptedRuntimeKey
]);
const dependencyEntry = {
  entry_key: canonicalText(["runtime_bindings", absentStructuralKey]),
  table_name: "runtime_bindings",
  structural_key: absentStructuralKey,
  access_kind: "read_absent",
  canonical_row_hash: canonicalHash([
    "cairn-authoritative-absent-row-v0.1",
    "runtime_bindings",
    "runtime_key_id",
    attemptedRuntimeKey
  ])
};
const dependencyManifest = bindExternal({
  schema: "cairn.dependency_manifest.v0.1",
  entries: [dependencyEntry],
  dependency_set_commitment: ZERO_HASH
}, "dependencyManifest");
const validateDependencyManifestSchema = ajv.compile({
  "$ref": `${schema.$id}#/$defs/dependencyManifest`
});
assert.equal(
  validateDependencyManifestSchema(dependencyManifest),
  true,
  JSON.stringify(validateDependencyManifestSchema.errors)
);

const INDEX_NAMES = new Set([
  "primary_ref",
  "identity_key",
  "uri_by_ref",
  "access_by_ref",
  "runtime_key_id",
  "grant_ref",
  "grant_state_ref",
  "effect_ref",
  "authority_idempotency",
  "nonce",
  "key_id"
]);

function dependencyManifestIsCoherent(manifest, presentRows = new Map()) {
  try {
    if (!validateDependencyManifestSchema(manifest)) return false;
    if (
      objectHash(manifest, schema.$defs.dependencyManifest) !==
      manifest.dependency_set_commitment
    ) return false;
    let prior = null;
    for (const entry of manifest.entries) {
      const parsedStructuralKey = JSON.parse(entry.structural_key);
      if (
        !Array.isArray(parsedStructuralKey) ||
        canonicalText(parsedStructuralKey) !== entry.structural_key ||
        entry.entry_key !== canonicalText([entry.table_name, entry.structural_key])
      ) return false;
      if (
        prior !== null &&
        Buffer.compare(Buffer.from(prior, "utf8"), Buffer.from(entry.entry_key, "utf8")) >= 0
      ) return false;
      prior = entry.entry_key;
      if (entry.access_kind === "read_absent") {
        if (
          parsedStructuralKey.length !== 3 ||
          parsedStructuralKey[0] !== "index" ||
          !INDEX_NAMES.has(parsedStructuralKey[1])
        ) return false;
        const attemptedKey = JSON.parse(parsedStructuralKey[2]);
        if (
          !Array.isArray(attemptedKey) ||
          canonicalText(attemptedKey) !== parsedStructuralKey[2]
        ) return false;
        const expectedAbsentHash = canonicalHash([
          "cairn-authoritative-absent-row-v0.1",
          entry.table_name,
          parsedStructuralKey[1],
          parsedStructuralKey[2]
        ]);
        if (entry.canonical_row_hash !== expectedAbsentHash) return false;
      } else {
        const projection = presentRows.get(entry.entry_key);
        if (
          !projection ||
          projection.table !== entry.table_name ||
          projection.structural_key !== entry.structural_key ||
          canonicalHash(projection) !== entry.canonical_row_hash
        ) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

assert.equal(dependencyManifestIsCoherent(dependencyManifest), true);
const duplicateDependency = structuredClone(dependencyManifest);
duplicateDependency.entries.push(structuredClone(dependencyEntry));
assert.equal(
  validateDependencyManifestSchema(duplicateDependency),
  false,
  "duplicate dependency entry accepted"
);
const wrongAbsentDependency = structuredClone(dependencyManifest);
wrongAbsentDependency.entries[0].canonical_row_hash = `sha-256:${"f".repeat(64)}`;
wrongAbsentDependency.dependency_set_commitment = objectHash(
  wrongAbsentDependency,
  schema.$defs.dependencyManifest
);
assert.equal(dependencyManifestIsCoherent(wrongAbsentDependency), false);
const presentDependencyEntry = {
  entry_key: canonicalText(["objects", rowVector.value.structural_key]),
  table_name: "objects",
  structural_key: rowVector.value.structural_key,
  access_kind: "read_present",
  canonical_row_hash: canonicalHash(rowVector.value)
};
const presentDependencyManifest = bindExternal({
  schema: "cairn.dependency_manifest.v0.1",
  entries: [presentDependencyEntry],
  dependency_set_commitment: ZERO_HASH
}, "dependencyManifest");
const presentRows = new Map([[presentDependencyEntry.entry_key, rowVector.value]]);
assert.equal(
  dependencyManifestIsCoherent(presentDependencyManifest, presentRows),
  true
);
const wrongPresentDependency = structuredClone(presentDependencyManifest);
wrongPresentDependency.entries[0].canonical_row_hash = `sha-256:${"e".repeat(64)}`;
wrongPresentDependency.dependency_set_commitment = objectHash(
  wrongPresentDependency,
  schema.$defs.dependencyManifest
);
assert.equal(
  dependencyManifestIsCoherent(wrongPresentDependency, presentRows),
  false
);
const reversedDependencyManifest = bindExternal({
  schema: "cairn.dependency_manifest.v0.1",
  entries: [dependencyEntry, presentDependencyEntry],
  dependency_set_commitment: ZERO_HASH
}, "dependencyManifest");
assert.equal(
  dependencyManifestIsCoherent(reversedDependencyManifest, presentRows),
  false,
  "reversed dependency manifest accepted"
);

const genesisRow = structuredClone(rowVector.value);
genesisRow.columns.owner_scope_sequence = 0;
const genesisManifest = bindExternal({
  schema: "cairn.genesis_manifest.v0.1",
  manifest_id: "urn:uuid:00000000-0000-4000-8000-000000000012",
  manifest_hash: ZERO_HASH,
  store_id: STORE_ID,
  kernel_profile: "cairn-proposal-foundation-v0.1",
  bundle_hash: serviceProfile.bundle_hash,
  service_key_profile_ref: {
    artifact_schema: serviceProfile.schema,
    artifact_id: serviceProfile.profile_id,
    artifact_hash: serviceProfile.profile_hash
  },
  validation_key_manifest_ref: {
    artifact_schema: validationManifest.schema,
    artifact_id: validationManifest.manifest_id,
    artifact_hash: validationManifest.manifest_hash
  },
  initial_rows: [genesisRow]
}, "genesisManifest");
validateDefinition("genesisManifest", genesisManifest);
const genesisStateRoot = canonicalHash([
  "cairn-reference-genesis-v0.1",
  STORE_ID,
  "cairn-proposal-foundation-v0.1",
  serviceProfile.bundle_hash,
  serviceProfile.profile_hash,
  validationManifest.manifest_hash,
  [[genesisRow.table, genesisRow.structural_key, canonicalHash(genesisRow)]]
]);

const foundation = await loadReferenceFoundation();
const referenceService = createReferenceService({
  foundation,
  stores: new MemoryReferenceStores(),
  keyResolver: new Map(),
  issuerKeyId: SERVICE_KEY_ID,
  signObject: (value) => value
});
const capabilitiesBody = referenceService.capabilities();
const capabilityContract = registryContracts[0];
const kernelSuccess = {
  ok: true,
  status: 200,
  body: capabilitiesBody,
  replayed: false
};
const kernelAcceptedFailure = {
  ok: false,
  status: 503,
  code: "idempotency_result_unavailable",
  failures: ["idempotency_result_unavailable"]
};
const idempotencyIntegrityProjection = {
  schema: "cairn.authoritative_row_projection.v0.1",
  table: "idempotency_records",
  structural_key: canonicalText(["tenant:demo", "idem-1"]),
  columns: {
    structural_key_hash: canonicalHash(["tenant:demo", "idem-1"]),
    operation_name: "intent.put",
    operation_fingerprint: `sha-256:${"4".repeat(64)}`,
    principal_id: "principal:alice",
    actor_id: "agent:anko",
    runtime_key_id: null,
    result_ref: rowVector.value.columns.ref,
    kernel_result_hash: canonicalHash(kernelSuccess),
    origin_global_commit_sequence: 1,
    origin_scope_sequence: 1,
    created_global_commit_sequence: 1,
    created_scope_sequence: 1
  }
};
validateDefinition("operationalRowProjection", idempotencyIntegrityProjection);
const frozenIdempotencyView = {
  fingerprint: idempotencyIntegrityProjection.columns.operation_fingerprint,
  result_ref: idempotencyIntegrityProjection.columns.result_ref
};
assert.deepEqual(Object.keys(frozenIdempotencyView), ["fingerprint", "result_ref"]);
for (const [field, value] of [
  ["operation_name", "action.prepare"],
  ["principal_id", "principal:mallory"],
  ["actor_id", "agent:mallory"],
  ["kernel_result_hash", `sha-256:${"5".repeat(64)}`],
  ["origin_scope_sequence", 2]
]) {
  const mutated = structuredClone(idempotencyIntegrityProjection);
  mutated.columns[field] = value;
  validateDefinition("operationalRowProjection", mutated);
  assert.notEqual(
    canonicalHash(mutated),
    canonicalHash(idempotencyIntegrityProjection),
    `idempotency integrity field omitted from row hash: ${field}`
  );
}

function queryCommitmentFor(contract) {
  return canonicalHash({
    operation_contract: contract,
    principal_id: null,
    actor_id: "agent:anko",
    runtime_key_id: null,
    body_hash: canonicalHash({}),
    subject_refs: [],
    authorization_refs: [],
    host_authentication_context_hash: hostContext.context_hash,
    declared_purpose: null,
    intended_use: null,
    filters: [],
    ordering: null,
    page_boundary: null
  });
}

function signedObservation({
  observationId,
  snapshotId,
  scopeBefore,
  scopeAfter,
  kernel,
  outcome
}) {
  const draft = {
    schema: "cairn.service_observation.v0.1",
    observation_id: observationId,
    service: {
      service_id: SERVICE_ID,
      profile: "cairn-proposal-foundation-v0.1",
      bundle_hash: serviceProfile.bundle_hash,
      store_id: STORE_ID,
      key_profile_ref: {
        artifact_schema: serviceProfile.schema,
        artifact_id: serviceProfile.profile_id,
        artifact_hash: serviceProfile.profile_hash
      },
      key_profile_hash: serviceProfile.profile_hash
    },
    access: {
      consequence: capabilityContract.consequence,
      visibility: "private",
      owner_kind: "actor",
      owner_id: "agent:anko"
    },
    request: {
      envelope_hash: `sha-256:${"1".repeat(64)}`,
      message_id: "urn:uuid:00000000-0000-4000-8000-000000000020",
      operation_contract: capabilityContract,
      principal_id: null,
      actor_id: "agent:anko",
      runtime_key_id: null,
      body_hash: canonicalHash({}),
      subject_refs: [],
      authorization_refs: [],
      query_commitment: queryCommitmentFor(capabilityContract),
      host_authentication_context_hash: hostContext.context_hash
    },
    observed_at: NOW,
    transaction: {
      isolation: "serializable",
      snapshot_id: snapshotId,
      scope_sequence_before: scopeBefore,
      scope_sequence_after: scopeAfter,
      dependency_set_commitment: dependencyManifest.dependency_set_commitment,
      scope_state_commitment_after: `sha-256:${String(scopeAfter).repeat(64)}`,
      committed: true
    },
    result: {
      outcome,
      status: kernel.status,
      code: kernel.ok ? null : kernel.code,
      failures: kernel.ok ? [] : kernel.failures,
      replayed: kernel.ok ? kernel.replayed : false,
      response_schema: kernel.ok ? capabilityContract.response_schema : null,
      kernel_result_hash: canonicalHash(kernel),
      returned_refs: [],
      relevant_heads: [],
      nonce_disposition: "newly_reserved",
      grant_effects: [],
      idempotency: {
        structural_key_hash: null,
        disposition: "not_applicable",
        original_result_hash: null,
        original_observation_ref: null,
        original_scope_sequence: null
      }
    },
    page: {
      kind: "single_result",
      ordering: "not_applicable",
      boundary: null,
      cursor: null
    },
    observation_hash: ZERO_HASH,
    service_signature: {
      profile: "cairn-ed25519-v0.1",
      key_id: SERVICE_KEY_ID,
      signed_hash: ZERO_HASH,
      signed_at: NOW,
      value: "A".repeat(86)
    },
    not_claiming: EXPECTED_NONCLAIMS
  };
  const bound = bindExternal(draft, "serviceObservation");
  bound.service_signature.value = signBytes(
    null,
    signatureInput(bound.schema, bound.observation_hash),
    fixturePrivateKey
  ).toString("base64url");
  return bound;
}

const successObservation = signedObservation({
  observationId: "urn:uuid:00000000-0000-4000-8000-000000000021",
  snapshotId: "urn:uuid:00000000-0000-4000-8000-000000000022",
  scopeBefore: 0,
  scopeAfter: 1,
  kernel: kernelSuccess,
  outcome: "success"
});
const acceptedFailureObservation = signedObservation({
  observationId: "urn:uuid:00000000-0000-4000-8000-000000000023",
  snapshotId: "urn:uuid:00000000-0000-4000-8000-000000000024",
  scopeBefore: 1,
  scopeAfter: 2,
  kernel: kernelAcceptedFailure,
  outcome: "accepted_failure"
});
validateDefinition("serviceObservation", successObservation);
validateDefinition("serviceObservation", acceptedFailureObservation);
for (const signed of [successObservation, acceptedFailureObservation]) {
  assert.equal(
    objectHash(signed, schema.$defs.serviceObservation),
    signed.observation_hash
  );
  assert.equal(
    verifyEd25519({
      schemaId: signed.schema,
      objectHash: signed.observation_hash,
      publicKey: fixturePublicKey,
      signature: signed.service_signature.value
    }),
    true
  );
}

const localSuccess = {
  schema: "cairn.local_observed_result.v0.1",
  disposition: "committed_success",
  kernel: kernelSuccess,
  service_observation: successObservation
};
const localAcceptedFailure = {
  schema: "cairn.local_observed_result.v0.1",
  disposition: "committed_accepted_failure",
  kernel: kernelAcceptedFailure,
  service_observation: acceptedFailureObservation
};
const localRolledBackFailure = {
  schema: "cairn.local_observed_result.v0.1",
  disposition: "rolled_back_failure",
  kernel: {
    ok: false,
    status: 503,
    code: "reference_service_failure",
    failures: ["reference_service_failure"]
  },
  service_observation: null
};
for (const result of [localSuccess, localAcceptedFailure, localRolledBackFailure]) {
  validateDefinition("localObservedResult", result);
}

function localResultIsCoherent(result) {
  if (result.disposition === "rolled_back_failure") {
    return result.kernel.ok === false && result.service_observation === null;
  }
  const observed = result.service_observation;
  if (!observed) return false;
  const expectedOutcome = result.disposition === "committed_success"
    ? "success"
    : "accepted_failure";
  return observed.result.outcome === expectedOutcome &&
    observed.result.status === result.kernel.status &&
    observed.result.code === (result.kernel.ok ? null : result.kernel.code) &&
    canonicalText(observed.result.failures) === canonicalText(
      result.kernel.ok ? [] : result.kernel.failures
    ) &&
    observed.result.replayed === (result.kernel.ok ? result.kernel.replayed : false) &&
    observed.result.kernel_result_hash === canonicalHash(result.kernel) &&
    observed.access.consequence === observed.request.operation_contract.consequence &&
    (
      observed.result.response_schema === null ||
      observed.result.response_schema ===
        observed.request.operation_contract.response_schema
    );
}

assert.equal(localResultIsCoherent(localSuccess), true);
assert.equal(localResultIsCoherent(localAcceptedFailure), true);
assert.equal(localResultIsCoherent(localRolledBackFailure), true);
const mismatchedResult = structuredClone(localSuccess);
mismatchedResult.kernel.status = 201;
assert.equal(localResultIsCoherent(mismatchedResult), false);
const swappedObservation = structuredClone(localSuccess);
swappedObservation.service_observation = acceptedFailureObservation;
const validateLocalResult = ajv.compile({
  "$ref": `${schema.$id}#/$defs/localObservedResult`
});
assert.equal(validateLocalResult(swappedObservation), false, "outcome branch swap accepted");
for (const artifact of [
  serviceProfile,
  validationManifest,
  receiverAuthenticationRecord,
  hostContext,
  genesisManifest,
  dependencyManifest,
  rowVector.value,
  idempotencyIntegrityProjection,
  successObservation,
  localSuccess,
  localAcceptedFailure,
  localRolledBackFailure
]) {
  assert.equal(
    validateBundle(artifact),
    true,
    `bundle entrypoint: ${JSON.stringify(validateBundle.errors)}`
  );
}

const pinnedFixture = {
  public_key: fixturePublicKey,
  service_profile_hash: serviceProfile.profile_hash,
  validation_manifest_hash: validationManifest.manifest_hash,
  host_context_hash: hostContext.context_hash,
  dependency_manifest_hash: dependencyManifest.dependency_set_commitment,
  genesis_manifest_hash: genesisManifest.manifest_hash,
  genesis_state_root: genesisStateRoot,
  success_observation_hash: successObservation.observation_hash,
  success_observation_signature: successObservation.service_signature.value,
  accepted_failure_observation_hash: acceptedFailureObservation.observation_hash,
  accepted_failure_observation_signature:
    acceptedFailureObservation.service_signature.value
};
if (Object.values(EXPECTED_FIXTURE).includes("__PIN__")) {
  console.log(`PIN_FIXTURE=${JSON.stringify(pinnedFixture)}`);
} else {
  assert.deepEqual(pinnedFixture, EXPECTED_FIXTURE);
}
const observationNonclaimBlock = spec.match(
  /not_claiming:\n((?:  - [a-z0-9_]+\n)+)/
);
assert.ok(observationNonclaimBlock, "observation nonclaim example missing");
assert.deepEqual(
  [...observationNonclaimBlock[1].matchAll(/  - ([a-z0-9_]+)/g)].map((match) => match[1]),
  EXPECTED_NONCLAIMS
);
const explicitNonclaimSection = spec.split("## 11. Explicit nonclaims\n")[1];
assert.ok(explicitNonclaimSection, "explicit nonclaim section missing");
assert.deepEqual(
  [...explicitNonclaimSection.matchAll(/^- `([a-z0-9_]+)`[;.]?(?: or)?$/gm)].map(
    (match) => match[1]
  ),
  EXPECTED_NONCLAIMS
);
assert.equal(canonicalHash(schema), EXPECTED_SCHEMA_HASH);
assert.equal(canonicalHash(vectors), EXPECTED_VECTORS_HASH);

console.log(`authoritative_design_schema_defs=${EXPECTED_DEFS.length}`);
console.log(`authoritative_design_entrypoints=${EXPECTED_ENTRYPOINTS.length}`);
console.log(`authoritative_design_nonclaims=${EXPECTED_NONCLAIMS.length}`);
console.log(`authoritative_design_schema_hash=${EXPECTED_SCHEMA_HASH}`);
console.log(`authoritative_design_vectors_hash=${EXPECTED_VECTORS_HASH}`);
