import assert from "node:assert/strict";
import {
  createHmac,
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
  objectRefFor,
  signatureInput,
  valueAtPointer,
  verifyEd25519
} from "../../protocol/lib/core.mjs";
import { EXACT_FOUNDATION_OPERATION_TUPLES } from "../../protocol/lib/foundation-profile.mjs";
import { createAjv } from "../../protocol/lib/schemas.mjs";
import {
  createReferenceService,
  loadReferenceFoundation
} from "../../protocol/reference-service/service.mjs";
import { MemoryReferenceStores } from "../../protocol/reference-service/state.mjs";
import {
  COMPOSITE_FIXTURE,
  SERVICE_KEY_PROFILE_CHAIN,
  SERVICE_KEY_PROFILE,
  SERVICE_OBSERVATION_PUBLIC_KEY,
  compositeObservationRefKey,
  runCompositeProbe,
  verifyCompositeArtifactBinding,
  verifyCompositeHistory,
  verifyCompositeObservation,
  verifySignedObjectWitness,
  verifyServiceKeyProfileChain,
  verifyServiceKeyProfile
} from "./frozen-composite-probe.mjs";

const SCHEMA_PATH = new URL("./authoritative-service.schema.json", import.meta.url);
const SPEC_PATH = new URL(
  "../../Protocol_Agent_Authoritative_Service_Change_Spec_v0.1.md",
  import.meta.url
);
const VECTORS_PATH = new URL("./canonical-vectors.json", import.meta.url);
const REGISTRY_PATH = new URL("../../protocol/operations/registry.json", import.meta.url);
const FROZEN_SERVICE_PATH = new URL(
  "../../protocol/reference-service/service.mjs",
  import.meta.url
);
const EXPECTED_SCHEMA_HASH = "sha-256:7ea19c53cc58bbce686a8dd5d39aa74d45dd6cd56662429ee16d94c7fc50bfb9";
const EXPECTED_VECTORS_HASH = "sha-256:1b708027482289eabc06ed2247b6f112cd61ac6b92112b83152d5e6f730d9120";
const EXPECTED_COMPOSITE_PROBE_HASH =
  "sha-256:d42e4c06d611ae591b72cadf7af8ad5965a2bc37d9355e38aaa67d02fa8624cd";
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
  "wrapperFailure",
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
  host_context_hash: "sha-256:3d2f4ac44133bda4869b93a0ff8739cfe377123c7867b7f25d66061e4de7e253",
  dependency_manifest_hash: "sha-256:ffb2b754677e87ab68c6619c065e5fc323088ca2737f24b92346e09fe77a8379",
  genesis_manifest_hash: "sha-256:e7e4a2dc6d7e6ba03dfcc916c77f1ffa828d934fd5150e2fd5c3cfead2b529d0",
  genesis_state_root: "sha-256:b2c01c4c3440f1ef44682f7216036fe3d6e1061a62ed4a5073b06ce3d6c47c08",
  success_observation_hash: "sha-256:44aea3321ab02690b702707a2e3dd3c73cede73303ccb4d5ed50ea3a7ac9a5ec",
  success_observation_signature: "4PWcYKuVztcMjw8Ul0XSgasoBY7xxPEorlSnyuuSVX8ehzJahprAWC9Y8zgtMKhT8FBnzu5e3757z2UBStJ1Ag",
  accepted_failure_observation_hash: "sha-256:1f0da83395253976e890b0d351c8ebb1439006e2302cac9f8393fce5f4e15651",
  accepted_failure_observation_signature: "6pg-7Hc11zCCONg1FMjxkjvMRNvLhpwUVQ01L4Qdhlq_Ox1TzWs5AwK1cBUJmXsUKX3ADaDrh8nCMA7basjQBg"
};

const schema = JSON.parse(await readFile(SCHEMA_PATH, "utf8"));
const spec = await readFile(SPEC_PATH, "utf8");
const vectors = JSON.parse(await readFile(VECTORS_PATH, "utf8"));
const registry = JSON.parse(await readFile(REGISTRY_PATH, "utf8"));
const frozenServiceSource = await readFile(FROZEN_SERVICE_PATH, "utf8");
const ajv = createAjv();
const validateBundle = ajv.compile(schema);
const compositeProbe = await runCompositeProbe();
assert.equal(canonicalHash(compositeProbe), EXPECTED_COMPOSITE_PROBE_HASH);
assert.equal(
  verifyCompositeHistory(compositeProbe.origin.sidecar),
  true,
  "probe origin durable history failed independent verification"
);
assert.equal(
  verifyCompositeArtifactBinding(
    compositeProbe.origin.sidecar,
    compositeProbe.origin.callback
  ),
  true,
  "probe origin trace and durable observation are not the same artifact"
);
assert.equal(
  verifyCompositeHistory(compositeProbe.successful_replay.sidecar),
  true,
  "probe replay durable history failed independent verification"
);
assert.equal(
  verifyCompositeArtifactBinding(
    compositeProbe.successful_replay.sidecar,
    compositeProbe.successful_replay.trace
  ),
  true,
  "probe replay trace and durable observation are not the same artifact"
);
assert.equal(
  verifyServiceKeyProfile(SERVICE_KEY_PROFILE, COMPOSITE_FIXTURE.now),
  true,
  "composite service key profile is not independently coherent"
);
assert.equal(
  verifyServiceKeyProfileChain(
    SERVICE_KEY_PROFILE_CHAIN,
    COMPOSITE_FIXTURE.now,
    SERVICE_KEY_PROFILE.profile_hash
  ),
  true,
  "composite service key profile chain is not independently coherent"
);
assert.equal(
  SERVICE_KEY_PROFILE.profile_hash,
  COMPOSITE_FIXTURE.service_profile_hash
);
for (const [caseId, mutate] of [
  ["composite_profile_wrong_controller", (profile) => {
    profile.keys[0].controller = "cairn:independent-controller";
  }],
  ["composite_profile_revoked", (profile) => {
    profile.keys[0].status = "revoked";
    profile.keys[0].revocation_time = "2026-07-23T15:59:59Z";
  }],
  ["composite_profile_expired", (profile) => {
    profile.keys[0].expires_at = COMPOSITE_FIXTURE.now;
  }],
  ["composite_profile_missing_current", (profile) => {
    profile.current_key_id =
      "https://cairn.invalid/keys/independent-missing";
  }]
]) {
  const profile = structuredClone(SERVICE_KEY_PROFILE);
  mutate(profile);
  profile.profile_hash = `sha-256:${"0".repeat(64)}`;
  const rebound = bindObjectHash(
    profile,
    schema.$defs.localServiceKeyProfile
  );
  assert.equal(
    verifyServiceKeyProfile(rebound, COMPOSITE_FIXTURE.now),
    false,
    caseId
  );
}
const actualInterleavedSidecar =
  compositeProbe.interleaved_history.sidecar;
assert.equal(
  verifyCompositeHistory(actualInterleavedSidecar),
  true,
  "actual multi-owner sidecar failed composite verification"
);
assert.equal(actualInterleavedSidecar.global_sequence, 7);
assert.equal(actualInterleavedSidecar.service_commits.length, 8);
assert.equal(actualInterleavedSidecar.scope_commits.length, 7);
assert.equal(
  Object.keys(actualInterleavedSidecar.owner_sequences).length,
  7
);
assert.equal(
  compositeProbe.interleaved_history.foreign_traces.length,
  6
);
for (
  const trace of compositeProbe.interleaved_history.foreign_traces
) {
  assert.equal(trace.operation, "capabilities.get");
  assert.equal(trace.callback_commit, true);
  assert.equal(trace.final_commit, true);
  assert.equal(trace.local_result.kernel.ok, true);
  const repositoryRow =
    actualInterleavedSidecar.observation_repository.find(
      ({ request_envelope_hash: envelopeHash }) =>
        envelopeHash === trace.envelope_hash
    );
  assert.ok(repositoryRow);
  const observation = JSON.parse(
    repositoryRow.canonical_observation_bytes
  );
  assert.equal(verifyCompositeObservation(observation), true);
  const accessTrace = actualInterleavedSidecar.access_traces.find(
    ({ global_sequence: sequence }) =>
      sequence === repositoryRow.global_commit_sequence
  );
  assert.ok(accessTrace);
  assert.deepEqual(accessTrace.events, trace.callback_access_trace);
}
const actualOriginObservation =
  compositeProbe.origin.callback.local_result.service_observation;
const actualReplayObservation =
  compositeProbe.successful_replay.trace.local_result.service_observation;
assert.equal(verifyCompositeObservation(actualOriginObservation), true);
assert.equal(verifyCompositeObservation(actualReplayObservation), true);
assert.equal(
  compositeObservationRefKey(actualOriginObservation),
  compositeProbe.origin.sidecar.service_commits.at(-1)
    .observation_ref_key
);
assert.equal(
  compositeObservationRefKey(actualReplayObservation),
  compositeProbe.successful_replay.sidecar.service_commits.at(-1)
    .observation_ref_key
);
assert.equal(
  SERVICE_OBSERVATION_PUBLIC_KEY,
  EXPECTED_FIXTURE.public_key
);
assert.equal(
  COMPOSITE_FIXTURE.authoritative_schema_hash,
  EXPECTED_SCHEMA_HASH
);

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
assert.match(
  frozenServiceSource,
  /if \(!object \|\| resultAccess\?\.visibility !== "private" \|\| resultAccess\.principal_id !== envelope\.principal_id\) \{\s+return \{ commit: true, value: failure\(503, "idempotency_result_unavailable"\) \};\s+\}/,
  "frozen result-object/ACL replay branch changed"
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
  private_projection_key_commitment: `sha-256:${"9".repeat(64)}`,
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
const STORE_PROJECTION_SECRET = Buffer.alloc(32, 11);
const PRIVATE_PROJECTION_KEY_COMMITMENT = canonicalHash([
  "cairn-private-projection-key-v0.1",
  STORE_PROJECTION_SECRET.toString("base64url")
]);
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

function compareProtocolInstants(left, right) {
  const timestampPattern =
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?Z$/;
  const leftMatch = timestampPattern.exec(left);
  const rightMatch = timestampPattern.exec(right);
  if (!leftMatch || !rightMatch) throw new TypeError("invalid protocol timestamp");
  if (leftMatch[1] !== rightMatch[1]) {
    return leftMatch[1] < rightMatch[1] ? -1 : 1;
  }
  const leftFraction = (leftMatch[2] ?? "").replace(/0+$/, "");
  const rightFraction = (rightMatch[2] ?? "").replace(/0+$/, "");
  const width = Math.max(leftFraction.length, rightFraction.length);
  const leftPadded = leftFraction.padEnd(width, "0");
  const rightPadded = rightFraction.padEnd(width, "0");
  if (leftPadded === rightPadded) return 0;
  return leftPadded < rightPadded ? -1 : 1;
}

function serviceProfileIsCoherent(profile, at) {
  const current = profile.keys.filter(({ key_id }) => key_id === profile.current_key_id);
  try {
    return keyArrayIsStrict(profile.keys) &&
      profile.keys.every(
        (key) => compareProtocolInstants(key.not_before, key.expires_at) < 0
      ) &&
      current.length === 1 &&
      current[0].controller === profile.service_id &&
      current[0].status === "active" &&
      compareProtocolInstants(current[0].not_before, at) <= 0 &&
      compareProtocolInstants(at, current[0].expires_at) < 0 &&
      current[0].revocation_time === null &&
      objectHash(profile, schema.$defs.localServiceKeyProfile) === profile.profile_hash;
  } catch {
    return false;
  }
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

function reboundServiceProfile({ at, notBefore, expiresAt }) {
  const rebound = structuredClone(serviceProfile);
  rebound.keys[0].not_before = notBefore;
  rebound.keys[0].expires_at = expiresAt;
  rebound.profile_hash = ZERO_HASH;
  const bound = bindExternal(rebound, "localServiceKeyProfile");
  validateDefinition("localServiceKeyProfile", bound);
  return { at, profile: bound };
}

for (const fixture of [
  {
    id: "fractional_not_before_future",
    ...reboundServiceProfile({
      at: "2026-07-23T16:00:00Z",
      notBefore: "2026-07-23T16:00:00.5Z",
      expiresAt: "2027-07-23T16:00:00Z"
    }),
    expected: false
  },
  {
    id: "fractional_expiry_elapsed",
    ...reboundServiceProfile({
      at: "2026-07-23T16:00:00.5Z",
      notBefore: "2026-07-23T00:00:00Z",
      expiresAt: "2026-07-23T16:00:00Z"
    }),
    expected: false
  },
  {
    id: "fractional_not_before_inclusive",
    ...reboundServiceProfile({
      at: "2026-07-23T16:00:00.5Z",
      notBefore: "2026-07-23T16:00:00.5Z",
      expiresAt: "2027-07-23T16:00:00Z"
    }),
    expected: true
  },
  {
    id: "fractional_before_expiry",
    ...reboundServiceProfile({
      at: "2026-07-23T16:00:00.499Z",
      notBefore: "2026-07-23T00:00:00Z",
      expiresAt: "2026-07-23T16:00:00.5Z"
    }),
    expected: true
  },
  {
    id: "equivalent_zero_fraction",
    ...reboundServiceProfile({
      at: "2026-07-23T16:00:00.000Z",
      notBefore: "2026-07-23T16:00:00Z",
      expiresAt: "2026-07-23T16:00:00.5Z"
    }),
    expected: true
  },
  {
    id: "arbitrary_fraction_interior",
    ...reboundServiceProfile({
      at: "2026-07-23T16:00:00.075Z",
      notBefore: "2026-07-23T16:00:00.050Z",
      expiresAt: "2026-07-23T16:00:00.1Z"
    }),
    expected: true
  },
  {
    id: "fractional_expiry_exclusive",
    ...reboundServiceProfile({
      at: "2026-07-23T16:00:00.5Z",
      notBefore: "2026-07-23T00:00:00Z",
      expiresAt: "2026-07-23T16:00:00.5000Z"
    }),
    expected: false
  },
  {
    id: "equal_interval_invalid",
    ...reboundServiceProfile({
      at: "2026-07-23T16:00:00Z",
      notBefore: "2026-07-23T16:00:00Z",
      expiresAt: "2026-07-23T16:00:00.0Z"
    }),
    expected: false
  },
  {
    id: "inverted_interval_invalid",
    ...reboundServiceProfile({
      at: "2026-07-23T16:00:00.6Z",
      notBefore: "2026-07-23T16:00:00.7Z",
      expiresAt: "2026-07-23T16:00:00.5Z"
    }),
    expected: false
  }
]) {
  assert.equal(
    serviceProfileIsCoherent(fixture.profile, fixture.at),
    fixture.expected,
    fixture.id
  );
}

function mutateAndRebindServiceProfile(mutator) {
  const draft = structuredClone(serviceProfile);
  mutator(draft);
  draft.profile_hash = ZERO_HASH;
  const rebound = bindExternal(draft, "localServiceKeyProfile");
  validateDefinition("localServiceKeyProfile", rebound);
  return rebound;
}

for (const [id, profile] of [
  ["rebound_missing_current", mutateAndRebindServiceProfile((draft) => {
    draft.current_key_id = "https://cairn.invalid/keys/missing";
  })],
  ["rebound_revoked_current", mutateAndRebindServiceProfile((draft) => {
    draft.keys[0].status = "revoked";
    draft.keys[0].revocation_time = "2026-07-23T15:59:59Z";
  })],
  ["rebound_wrong_controller", mutateAndRebindServiceProfile((draft) => {
    draft.keys[0].controller = "cairn:wrong-service";
  })],
  ["rebound_unsorted_keys", mutateAndRebindServiceProfile((draft) => {
    draft.keys.push({
      ...draft.keys[0],
      key_id: "https://cairn.invalid/keys/service-0"
    });
  })]
]) {
  assert.equal(serviceProfileIsCoherent(profile, NOW), false, id);
}

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
const receiverBindingSecret = Buffer.alloc(32, 9);
function authorityNamespaceCommitmentFor(rawNamespace) {
  const preimage = canonicalText([
    "cairn-authority-namespace-v0.1",
    accountTenantCommitment,
    rawNamespace
  ]);
  return `sha-256:${createHmac("sha256", receiverBindingSecret)
    .update(Buffer.from(preimage, "utf8"))
    .digest("hex")}`;
}
const authorityNamespaceCommitment =
  authorityNamespaceCommitmentFor(authorityNamespaceRaw);
assert.notEqual(
  authorityNamespaceCommitment,
  canonicalHash([
    "cairn-authority-namespace-v0.1",
    accountTenantCommitment,
    authorityNamespaceRaw
  ]),
  "authority namespace commitment became an offline public dictionary oracle"
);
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
assert.equal(canonicalText(hostContext).includes(authorityNamespaceRaw), false);
assert.notEqual(
  authorityNamespaceCommitmentFor("tenant:guessed"),
  authorityNamespaceCommitment
);
const originalMutationReceiverAuthenticationRecord = {
  ...receiverAuthenticationRecord,
  authentication_handle: "auth:fixture-mutation",
  principal_id: compositeProbe.origin.authentication.principalId,
  actor_id: compositeProbe.origin.authentication.actorId,
  runtime_key_id:
    compositeProbe.origin.envelope.sender.runtime_key_id,
  authority_namespace_raw:
    compositeProbe.origin.authentication.authorityNamespace,
  authority_namespace_commitment: authorityNamespaceCommitmentFor(
    compositeProbe.origin.authentication.authorityNamespace
  )
};
validateDefinition(
  "receiverAuthenticationRecord",
  originalMutationReceiverAuthenticationRecord
);
const originalMutationHostContext = bindExternal({
  schema: "cairn.host_authentication_context.v0.1",
  context_hash: ZERO_HASH,
  account_tenant_commitment:
    originalMutationReceiverAuthenticationRecord.account_tenant_commitment,
  principal_id: originalMutationReceiverAuthenticationRecord.principal_id,
  actor_id: originalMutationReceiverAuthenticationRecord.actor_id,
  runtime_key_id: originalMutationReceiverAuthenticationRecord.runtime_key_id,
  authority_namespace_commitment:
    originalMutationReceiverAuthenticationRecord.authority_namespace_commitment,
  trust_profile_id:
    originalMutationReceiverAuthenticationRecord.trust_profile_id,
  trust_profile_hash:
    originalMutationReceiverAuthenticationRecord.trust_profile_hash,
  authentication_evidence_commitment:
    originalMutationReceiverAuthenticationRecord.authentication_evidence_commitment,
  assertion_level:
    originalMutationReceiverAuthenticationRecord.assertion_level
}, "hostAuthenticationContext");
validateDefinition("hostAuthenticationContext", originalMutationHostContext);

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

const validateObjectRef = ajv.compile({
  "$ref": `${schema.$id}#/$defs/objectRef`
});

function parseCanonicalArray(text) {
  const value = JSON.parse(text);
  if (!Array.isArray(value) || canonicalText(value) !== text) {
    throw new TypeError("noncanonical structural key");
  }
  return value;
}

function objectRefStructuralKey(ref) {
  if (!validateObjectRef(ref)) throw new TypeError("invalid object ref");
  return canonicalText([ref.schema, ref.object_id, ref.object_hash]);
}

function objectRefAttemptedKeyIsValid(tuple) {
  return tuple.length === 3 &&
    validateObjectRef({
      schema: tuple[0],
      object_id: tuple[1],
      object_hash: tuple[2]
    });
}

function identityAttemptedKeyIsValid(tuple) {
  if (
    (tuple.length !== 2 && tuple.length !== 3) ||
    typeof tuple[0] !== "string" ||
    typeof tuple[1] !== "string"
  ) return false;
  const schemaPattern = /^cairn\.[a-z0-9_]+\.v0\.1$/;
  const uuidPattern =
    /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  if (!schemaPattern.test(tuple[0]) || !uuidPattern.test(tuple[1])) return false;
  if (tuple[0] === "cairn.active_intent.v0.1") {
    return tuple.length === 3 &&
      Number.isInteger(tuple[2]) &&
      tuple[2] >= 1 &&
      tuple[2] <= 2147483647;
  }
  return tuple.length === 2;
}

function singletonStringAttemptedKeyIsValid(tuple) {
  return tuple.length === 1 &&
    typeof tuple[0] === "string" &&
    tuple[0].length > 0;
}

function singletonHashAttemptedKeyIsValid(tuple) {
  return singletonStringAttemptedKeyIsValid(tuple) &&
    /^sha-256:[0-9a-f]{64}$/.test(tuple[0]);
}

const ROW_PROJECTION_DEFINITIONS = {
  objects: "objectRowProjection",
  runtime_bindings: "runtimeBindingRowProjection",
  data_grants: "dataGrantRowProjection",
  effect_descriptors: "effectDescriptorRowProjection",
  validation_keys: "validationKeyRowProjection",
  grant_state: "grantStateRowProjection",
  used_nonces: "usedNonceRowProjection",
  idempotency_records: "idempotencyRowProjection"
};
const ROW_PROJECTION_VALIDATORS = Object.fromEntries(
  Object.entries(ROW_PROJECTION_DEFINITIONS).map(([table, definition]) => [
    table,
    ajv.compile({ "$ref": `${schema.$id}#/$defs/${definition}` })
  ])
);

function objectIdentityIsCoherent(projection) {
  const identity = parseCanonicalArray(projection.columns.identity_key);
  return identityAttemptedKeyIsValid(identity) &&
    identity[0] === projection.columns.ref.schema &&
    identity[1] === projection.columns.ref.object_id;
}

const TABLE_RULES = {
  objects: {
    validateProjection: ROW_PROJECTION_VALIDATORS.objects,
    aliases: {
      primary_ref: {
        valid: objectRefAttemptedKeyIsValid,
        expected: (projection) =>
          objectRefStructuralKey(projection.columns.ref)
      },
      identity_key: {
        valid: identityAttemptedKeyIsValid,
        expected: (projection) => projection.columns.identity_key
      },
      uri_by_ref: {
        valid: objectRefAttemptedKeyIsValid,
        expected: (projection) =>
          objectRefStructuralKey(projection.columns.ref)
      },
      access_by_ref: {
        valid: objectRefAttemptedKeyIsValid,
        expected: (projection) =>
          objectRefStructuralKey(projection.columns.ref)
      }
    },
    baseKey(projection) {
      assert.equal(projection.columns.schema_id, projection.columns.ref.schema);
      assert.equal(projection.columns.object_hash, projection.columns.ref.object_hash);
      assert.equal(objectIdentityIsCoherent(projection), true);
      return objectRefStructuralKey(projection.columns.ref);
    }
  },
  runtime_bindings: {
    validateProjection: ROW_PROJECTION_VALIDATORS.runtime_bindings,
    aliases: {
      runtime_key_id: {
        valid: singletonStringAttemptedKeyIsValid,
        expected: (projection) =>
          canonicalText([projection.columns.runtime_key_id])
      }
    },
    baseKey(projection) {
      assert.equal(
        projection.columns.ref.schema,
        "cairn.agent_runtime_binding.v0.1"
      );
      return canonicalText([projection.columns.runtime_key_id]);
    }
  },
  data_grants: {
    validateProjection: ROW_PROJECTION_VALIDATORS.data_grants,
    aliases: {
      grant_ref: {
        valid: objectRefAttemptedKeyIsValid,
        expected: (projection) =>
          objectRefStructuralKey(projection.columns.ref)
      }
    },
    baseKey(projection) {
      assert.equal(projection.columns.ref.schema, "cairn.data_grant.v0.1");
      return objectRefStructuralKey(projection.columns.ref);
    }
  },
  effect_descriptors: {
    validateProjection: ROW_PROJECTION_VALIDATORS.effect_descriptors,
    aliases: {
      effect_ref: {
        valid: objectRefAttemptedKeyIsValid,
        expected: (projection) =>
          objectRefStructuralKey(projection.columns.ref)
      }
    },
    baseKey(projection) {
      assert.equal(
        projection.columns.ref.schema,
        "cairn.effect_descriptor.v0.1"
      );
      return objectRefStructuralKey(projection.columns.ref);
    }
  },
  validation_keys: {
    validateProjection: ROW_PROJECTION_VALIDATORS.validation_keys,
    aliases: {
      key_id: {
        valid: singletonStringAttemptedKeyIsValid,
        expected: (projection) => canonicalText([projection.columns.key_id])
      }
    },
    baseKey: (projection) => canonicalText([projection.columns.key_id])
  },
  grant_state: {
    validateProjection: ROW_PROJECTION_VALIDATORS.grant_state,
    aliases: {
      grant_state_ref: {
        valid: objectRefAttemptedKeyIsValid,
        expected: (projection) =>
          objectRefStructuralKey(projection.columns.grant_ref)
      }
    },
    baseKey(projection) {
      assert.equal(
        projection.columns.grant_ref.schema,
        "cairn.data_grant.v0.1"
      );
      return objectRefStructuralKey(projection.columns.grant_ref);
    }
  },
  used_nonces: {
    validateProjection: ROW_PROJECTION_VALIDATORS.used_nonces,
    aliases: {
      nonce: {
        valid: singletonStringAttemptedKeyIsValid,
        expected: (projection) => canonicalText([projection.columns.nonce])
      }
    },
    baseKey: (projection) => canonicalText([projection.columns.nonce])
  },
  idempotency_records: {
    validateProjection: ROW_PROJECTION_VALIDATORS.idempotency_records,
    aliases: {
      authority_idempotency: {
        valid: singletonHashAttemptedKeyIsValid,
        expected: (projection) =>
          canonicalText([projection.columns.structural_key_commitment])
      }
    },
    baseKey(projection) {
      const key = parseCanonicalArray(projection.structural_key);
      assert.deepEqual(key, [projection.columns.structural_key_commitment]);
      return projection.structural_key;
    }
  }
};

function decodeDependencyStructuralKey(text) {
  const tuple = parseCanonicalArray(text);
  if (
    tuple.length === 3 &&
    tuple[0] === "index" &&
    typeof tuple[1] === "string" &&
    typeof tuple[2] === "string"
  ) {
    return {
      kind: "alias",
      indexName: tuple[1],
      attemptedKeyText: tuple[2]
    };
  }
  return { kind: "base", tuple };
}

function dependencyManifestIsCoherent(
  manifest,
  presentRows = new Map(),
  aliasResolutions = new Map()
) {
  try {
    if (!validateDependencyManifestSchema(manifest)) return false;
    if (
      objectHash(manifest, schema.$defs.dependencyManifest) !==
      manifest.dependency_set_commitment
    ) return false;
    const entriesByKey = new Map(
      manifest.entries.map((entry) => [entry.entry_key, entry])
    );
    let prior = null;
    for (const entry of manifest.entries) {
      const rule = TABLE_RULES[entry.table_name];
      if (!rule) return false;
      const decodedStructuralKey =
        decodeDependencyStructuralKey(entry.structural_key);
      if (entry.entry_key !== canonicalText([entry.table_name, entry.structural_key])) {
        return false;
      }
      if (
        prior !== null &&
        Buffer.compare(Buffer.from(prior, "utf8"), Buffer.from(entry.entry_key, "utf8")) >= 0
      ) return false;
      prior = entry.entry_key;

      if (decodedStructuralKey.kind === "alias") {
        const attemptedKey = parseCanonicalArray(
          decodedStructuralKey.attemptedKeyText
        );
        const aliasRule = rule.aliases[decodedStructuralKey.indexName];
        if (
          !aliasRule ||
          !aliasRule.valid(attemptedKey) ||
          !["read_present", "read_absent"].includes(entry.access_kind)
        ) return false;
        if (entry.access_kind === "read_absent") {
          if (aliasResolutions.has(entry.entry_key)) return false;
          for (const projection of presentRows.values()) {
            const projectionEntry = entriesByKey.get(canonicalText([
              projection.table,
              projection.structural_key
            ]));
            if (
              projection.table === entry.table_name &&
              rule.validateProjection(projection) &&
              projectionEntry?.access_kind !== "write_insert" &&
              aliasRule.expected(projection) ===
                decodedStructuralKey.attemptedKeyText
            ) {
              return false;
            }
          }
          const expectedAbsentHash = canonicalHash([
            "cairn-authoritative-absent-row-v0.1",
            entry.table_name,
            decodedStructuralKey.indexName,
            decodedStructuralKey.attemptedKeyText
          ]);
          if (entry.canonical_row_hash !== expectedAbsentHash) return false;
          continue;
        }
        const baseEntryKey = aliasResolutions.get(entry.entry_key);
        const baseEntry = entriesByKey.get(baseEntryKey);
        const projection = presentRows.get(baseEntryKey);
        if (
          !baseEntryKey ||
          !baseEntry ||
          !projection ||
          baseEntry.table_name !== entry.table_name ||
          decodeDependencyStructuralKey(baseEntry.structural_key).kind !== "base" ||
          !rule.validateProjection(projection) ||
          projection.table !== entry.table_name ||
          rule.baseKey(projection) !== baseEntry.structural_key ||
          aliasRule.expected(projection) !==
            decodedStructuralKey.attemptedKeyText ||
          canonicalHash(projection) !== entry.canonical_row_hash ||
          canonicalHash(projection) !== baseEntry.canonical_row_hash
        ) return false;
        continue;
      }

      if (entry.access_kind === "read_absent") return false;
      const projection = presentRows.get(entry.entry_key);
      if (
        !projection ||
        !rule.validateProjection(projection) ||
        projection.table !== entry.table_name ||
        rule.baseKey(projection) !== entry.structural_key ||
        canonicalHash(projection) !== entry.canonical_row_hash
      ) {
        return false;
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

const primaryRefAttemptedKey = objectRefStructuralKey(rowVector.value.columns.ref);
const presentAliasStructuralKey = canonicalText([
  "index",
  "primary_ref",
  primaryRefAttemptedKey
]);
const presentAliasEntry = {
  entry_key: canonicalText(["objects", presentAliasStructuralKey]),
  table_name: "objects",
  structural_key: presentAliasStructuralKey,
  access_kind: "read_present",
  canonical_row_hash: canonicalHash(rowVector.value)
};
const presentAliasManifest = bindExternal({
  schema: "cairn.dependency_manifest.v0.1",
  entries: [presentDependencyEntry, presentAliasEntry].sort((left, right) =>
    Buffer.compare(
      Buffer.from(left.entry_key, "utf8"),
      Buffer.from(right.entry_key, "utf8")
    )
  ),
  dependency_set_commitment: ZERO_HASH
}, "dependencyManifest");
const aliasResolutions = new Map([
  [presentAliasEntry.entry_key, presentDependencyEntry.entry_key]
]);
assert.equal(
  dependencyManifestIsCoherent(
    presentAliasManifest,
    presentRows,
    aliasResolutions
  ),
  true,
  "normative present alias rejected"
);
assert.equal(
  dependencyManifestIsCoherent(presentAliasManifest, presentRows),
  false,
  "present alias without authoritative resolution accepted"
);
for (const indexName of ["primary_ref", "access_by_ref"]) {
  const falseAbsentAliasEntry = aliasDependencyEntry({
    table: "objects",
    indexName,
    attemptedKey: primaryRefAttemptedKey,
    accessKind: "read_absent"
  });
  const falseAbsentAliasManifest = bindExternal({
    schema: "cairn.dependency_manifest.v0.1",
    entries: [presentDependencyEntry, falseAbsentAliasEntry].sort(
      (left, right) => Buffer.compare(
        Buffer.from(left.entry_key, "utf8"),
        Buffer.from(right.entry_key, "utf8")
      )
    ),
    dependency_set_commitment: ZERO_HASH
  }, "dependencyManifest");
  assert.equal(
    dependencyManifestIsCoherent(falseAbsentAliasManifest, presentRows),
    false,
    `present object was accepted as absent through ${indexName}`
  );
}
const borrowedRef = {
  ...rowVector.value.columns.ref,
  object_id: "urn:uuid:00000000-0000-4000-8000-000000000102"
};
const borrowedAttemptedKey = objectRefStructuralKey(borrowedRef);
const borrowedAliasStructuralKey = canonicalText([
  "index",
  "primary_ref",
  borrowedAttemptedKey
]);
const borrowedAliasEntry = {
  ...presentAliasEntry,
  entry_key: canonicalText(["objects", borrowedAliasStructuralKey]),
  structural_key: borrowedAliasStructuralKey
};
const borrowedAliasManifest = bindExternal({
  schema: "cairn.dependency_manifest.v0.1",
  entries: [presentDependencyEntry, borrowedAliasEntry].sort((left, right) =>
    Buffer.compare(
      Buffer.from(left.entry_key, "utf8"),
      Buffer.from(right.entry_key, "utf8")
    )
  ),
  dependency_set_commitment: ZERO_HASH
}, "dependencyManifest");
assert.equal(
  dependencyManifestIsCoherent(
    borrowedAliasManifest,
    presentRows,
    new Map([
      [borrowedAliasEntry.entry_key, presentDependencyEntry.entry_key]
    ])
  ),
  false,
  "valid-shaped alias borrowed an unrelated base row"
);
const wrongTableAlias = structuredClone(dependencyManifest);
wrongTableAlias.entries[0].table_name = "objects";
wrongTableAlias.entries[0].entry_key = canonicalText([
  "objects",
  wrongTableAlias.entries[0].structural_key
]);
wrongTableAlias.dependency_set_commitment = objectHash(
  wrongTableAlias,
  schema.$defs.dependencyManifest
);
assert.equal(
  dependencyManifestIsCoherent(wrongTableAlias),
  false,
  "cross-table alias accepted"
);
const wrongBaseProjection = structuredClone(rowVector.value);
wrongBaseProjection.structural_key = canonicalText(["wrong"]);
const wrongBaseEntry = {
  ...presentDependencyEntry,
  entry_key: canonicalText(["objects", wrongBaseProjection.structural_key]),
  structural_key: wrongBaseProjection.structural_key,
  canonical_row_hash: canonicalHash(wrongBaseProjection)
};
const wrongBaseManifest = bindExternal({
  schema: "cairn.dependency_manifest.v0.1",
  entries: [wrongBaseEntry],
  dependency_set_commitment: ZERO_HASH
}, "dependencyManifest");
assert.equal(
  dependencyManifestIsCoherent(
    wrongBaseManifest,
    new Map([[wrongBaseEntry.entry_key, wrongBaseProjection]])
  ),
  false,
  "underived base structural key accepted"
);
const wrongTypedGrantProjection = {
  ...structuredClone(rowVector.value),
  table: "data_grants"
};
const wrongTypedGrantEntry = {
  entry_key: canonicalText([
    "data_grants",
    wrongTypedGrantProjection.structural_key
  ]),
  table_name: "data_grants",
  structural_key: wrongTypedGrantProjection.structural_key,
  access_kind: "read_present",
  canonical_row_hash: canonicalHash(wrongTypedGrantProjection)
};
const wrongTypedGrantManifest = bindExternal({
  schema: "cairn.dependency_manifest.v0.1",
  entries: [wrongTypedGrantEntry],
  dependency_set_commitment: ZERO_HASH
}, "dependencyManifest");
assert.equal(
  dependencyManifestIsCoherent(
    wrongTypedGrantManifest,
    new Map([
      [wrongTypedGrantEntry.entry_key, wrongTypedGrantProjection]
    ])
  ),
  false,
  "foreign object row was accepted as a DataGrant row"
);
const literalIndexNonceProjection = {
  schema: "cairn.authoritative_row_projection.v0.1",
  table: "used_nonces",
  structural_key: canonicalText(["index"]),
  columns: {
    nonce: "index",
    envelope_hash: `sha-256:${"3".repeat(64)}`,
    operation: "capabilities.get",
    owner_kind: "actor",
    owner_id: "agent:anko",
    owner_scope_sequence: 1
  }
};
validateDefinition("usedNonceRowProjection", literalIndexNonceProjection);
const literalIndexNonceEntry = {
  entry_key: canonicalText([
    "used_nonces",
    literalIndexNonceProjection.structural_key
  ]),
  table_name: "used_nonces",
  structural_key: literalIndexNonceProjection.structural_key,
  access_kind: "read_present",
  canonical_row_hash: canonicalHash(literalIndexNonceProjection)
};
const literalIndexNonceManifest = bindExternal({
  schema: "cairn.dependency_manifest.v0.1",
  entries: [literalIndexNonceEntry],
  dependency_set_commitment: ZERO_HASH
}, "dependencyManifest");
assert.equal(
  dependencyManifestIsCoherent(
    literalIndexNonceManifest,
    new Map([
      [literalIndexNonceEntry.entry_key, literalIndexNonceProjection]
    ])
  ),
  true,
  "literal singleton base key 'index' was misclassified as an alias"
);
const wrongAliasHash = structuredClone(presentAliasManifest);
const wrongAliasHashEntry = wrongAliasHash.entries.find(
  ({ entry_key }) => entry_key === presentAliasEntry.entry_key
);
wrongAliasHashEntry.canonical_row_hash = `sha-256:${"e".repeat(64)}`;
wrongAliasHash.dependency_set_commitment = objectHash(
  wrongAliasHash,
  schema.$defs.dependencyManifest
);
assert.equal(
  dependencyManifestIsCoherent(
    wrongAliasHash,
    presentRows,
    aliasResolutions
  ),
  false,
  "present alias with wrong base hash accepted"
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
  private_projection_key_commitment: PRIVATE_PROJECTION_KEY_COMMITMENT,
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
  PRIVATE_PROJECTION_KEY_COMMITMENT,
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
const intentPutContract = registryContracts.find(
  ({ operation }) => operation === "intent.put"
);
assert.ok(intentPutContract);
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
const originalMutationKernelSuccess = structuredClone(
  compositeProbe.origin.callback.callback_value
);
assert.equal(compositeProbe.origin.envelope.message_type, "intent.put");
assert.equal(compositeProbe.origin.callback.callback_commit, true);
assert.equal(compositeProbe.origin.callback.final_commit, true);
assert.equal(originalMutationKernelSuccess.ok, true);
assert.equal(originalMutationKernelSuccess.status, 201);
const validateIntentPutResponse =
  foundation.ajv.getSchema(intentPutContract.response_schema);
assert.equal(typeof validateIntentPutResponse, "function");
assert.equal(
  validateIntentPutResponse(originalMutationKernelSuccess.body),
  true,
  JSON.stringify(validateIntentPutResponse.errors)
);
const invalidIntentPutResponse = structuredClone(
  originalMutationKernelSuccess.body
);
delete invalidIntentPutResponse.ref;
assert.equal(
  validateIntentPutResponse(invalidIntentPutResponse),
  false,
  "response-schema mutation control did not reach the actual validator"
);
const idempotencyDatabaseLookupKey = canonicalText([
  compositeProbe.origin.authentication.authorityNamespace,
  compositeProbe.origin.envelope.idempotency_key
]);
function idempotencyStructuralKeyCommitment(databaseLookupKey) {
  return `sha-256:${createHmac("sha256", STORE_PROJECTION_SECRET)
    .update(Buffer.from(canonicalText([
      "cairn-idempotency-row-key-v0.1",
      STORE_ID,
      databaseLookupKey
    ]), "utf8"))
    .digest("hex")}`;
}
const idempotencyStructuralKeyCommitmentValue =
  idempotencyStructuralKeyCommitment(idempotencyDatabaseLookupKey);
const actualOriginIdempotencyRow =
  compositeProbe.origin.sidecar.rich_idempotency_rows[0];
const originalMutationFacts = {
  authority_namespace:
    originalMutationReceiverAuthenticationRecord.authority_namespace_raw,
  idempotency_key: compositeProbe.origin.envelope.idempotency_key,
  operation_name: intentPutContract.operation,
  operation_fingerprint:
    compositeProbe.origin.envelope.operation_fingerprint,
  principal_id:
    compositeProbe.origin.authentication.principalId,
  actor_id: originalMutationReceiverAuthenticationRecord.actor_id,
  runtime_key_id: originalMutationReceiverAuthenticationRecord.runtime_key_id,
  result_ref: structuredClone(
    compositeProbe.origin.callback.callback_value.body.ref
  ),
  kernel_result_hash: canonicalHash(originalMutationKernelSuccess),
  origin_global_commit_sequence:
    compositeProbe.origin.sidecar.rich_idempotency_rows[0]
      .origin_global_commit_sequence,
  origin_scope_sequence:
    compositeProbe.origin.sidecar.rich_idempotency_rows[0]
      .origin_scope_sequence,
  created_global_commit_sequence:
    actualOriginIdempotencyRow
      .created_global_commit_sequence,
  created_scope_sequence:
    actualOriginIdempotencyRow.created_scope_sequence,
  origin_observation_ref:
    structuredClone(actualOriginIdempotencyRow.origin_observation_ref)
};
const idempotencyOperatorRow =
  structuredClone(actualOriginIdempotencyRow);

function projectIdempotencyOwnerRow(row) {
  const databaseLookupKey = canonicalText([
    row.authority_namespace,
    row.idempotency_key
  ]);
  const structuralKeyCommitment =
    idempotencyStructuralKeyCommitment(databaseLookupKey);
  return {
    schema: "cairn.authoritative_row_projection.v0.1",
    table: "idempotency_records",
    structural_key: canonicalText([structuralKeyCommitment]),
    columns: {
      structural_key_commitment: structuralKeyCommitment,
      operation_name: row.operation_name,
      operation_fingerprint: row.operation_fingerprint,
      principal_id: row.principal_id,
      actor_id: row.actor_id,
      runtime_key_id: row.runtime_key_id,
      result_ref: row.result_ref,
      kernel_result_hash: row.kernel_result_hash,
      origin_scope_sequence: row.origin_scope_sequence,
      created_scope_sequence: row.created_scope_sequence
    }
  };
}

const idempotencyIntegrityProjection =
  projectIdempotencyOwnerRow(idempotencyOperatorRow);
validateDefinition("operationalRowProjection", idempotencyIntegrityProjection);
const originalObjectValue = compositeProbe.origin.object.value;
const originalObjectSchema = foundation.schemasByObjectId.get(
  originalObjectValue.schema
);
assert.ok(originalObjectSchema);
assert.deepEqual(
  objectRefFor(originalObjectValue, originalObjectSchema),
  originalMutationFacts.result_ref,
  "actual origin object bytes do not bind the captured result ref"
);
const originalObjectIdentity = canonicalText([
  originalObjectValue.schema,
  valueAtPointer(
    originalObjectValue,
    originalObjectSchema["x-cairn-object-id-pointer"]
  ),
  originalObjectValue.revision
]);
assert.equal(
  originalObjectIdentity,
  compositeProbe.origin.object.identity_key,
  "actual origin object bytes do not derive the captured identity index"
);
const originalObjectProjection = {
  schema: "cairn.authoritative_row_projection.v0.1",
  table: "objects",
  structural_key: objectRefStructuralKey(originalMutationFacts.result_ref),
  columns: {
    ref: structuredClone(originalMutationFacts.result_ref),
    schema_id: originalObjectValue.schema,
    object_hash: originalMutationFacts.result_ref.object_hash,
    identity_key: originalObjectIdentity,
    retrieval_uri: compositeProbe.origin.object.retrieval_uri,
    visibility: compositeProbe.origin.object.access.visibility,
    principal_id: compositeProbe.origin.object.access.principal_id,
    owner_scope_sequence: originalMutationFacts.origin_scope_sequence
  }
};
validateDefinition("operationalRowProjection", originalObjectProjection);

const wrongOriginalIdentityProjection =
  structuredClone(originalObjectProjection);
wrongOriginalIdentityProjection.columns.identity_key = canonicalText([
  originalObjectValue.schema,
  originalObjectValue.intent_id,
  originalObjectValue.revision + 1
]);
validateDefinition(
  "operationalRowProjection",
  wrongOriginalIdentityProjection
);
function objectProjectionMatchesCanonicalValue(
  projection,
  value,
  objectSchema
) {
  const ref = objectRefFor(value, objectSchema);
  const identity = [
    value.schema,
    valueAtPointer(value, objectSchema["x-cairn-object-id-pointer"])
  ];
  if (value.schema === "cairn.active_intent.v0.1") {
    identity.push(value.revision);
  }
  return canonicalText(projection.columns.ref) === canonicalText(ref) &&
    projection.columns.schema_id === value.schema &&
    projection.columns.object_hash === ref.object_hash &&
    projection.columns.identity_key === canonicalText(identity);
}
assert.equal(
  objectProjectionMatchesCanonicalValue(
    originalObjectProjection,
    originalObjectValue,
    originalObjectSchema
  ),
  true
);
assert.equal(
  objectProjectionMatchesCanonicalValue(
    wrongOriginalIdentityProjection,
    originalObjectValue,
    originalObjectSchema
  ),
  false,
  "rehashed ActiveIntent wrong-revision identity escaped object-byte truth"
);

function fixtureRef(schemaId, suffix, hashDigit) {
  return {
    schema: schemaId,
    object_id:
      `urn:uuid:00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
    object_hash: `sha-256:${String(hashDigit).repeat(64)}`
  };
}

const runtimeBindingProjection = {
  schema: "cairn.authoritative_row_projection.v0.1",
  table: "runtime_bindings",
  structural_key: canonicalText(["did:key:runtime-fixture"]),
  columns: {
    runtime_key_id: "did:key:runtime-fixture",
    ref: fixtureRef("cairn.agent_runtime_binding.v0.1", 201, 1)
  }
};
const dataGrantProjection = {
  schema: "cairn.authoritative_row_projection.v0.1",
  table: "data_grants",
  structural_key: objectRefStructuralKey(
    fixtureRef("cairn.data_grant.v0.1", 202, 2)
  ),
  columns: {
    ref: fixtureRef("cairn.data_grant.v0.1", 202, 2)
  }
};
const effectDescriptorProjection = {
  schema: "cairn.authoritative_row_projection.v0.1",
  table: "effect_descriptors",
  structural_key: objectRefStructuralKey(
    fixtureRef("cairn.effect_descriptor.v0.1", 203, 3)
  ),
  columns: {
    ref: fixtureRef("cairn.effect_descriptor.v0.1", 203, 3)
  }
};
const validationKeyProjection = {
  schema: "cairn.authoritative_row_projection.v0.1",
  table: "validation_keys",
  structural_key: canonicalText([fixtureKeyRecord.key_id]),
  columns: structuredClone(fixtureKeyRecord)
};
const grantStateRef = fixtureRef("cairn.data_grant.v0.1", 204, 4);
const grantStateProjection = {
  schema: "cairn.authoritative_row_projection.v0.1",
  table: "grant_state",
  structural_key: objectRefStructuralKey(grantStateRef),
  columns: {
    grant_ref: grantStateRef,
    status: "active",
    revocation_nonce: 1,
    remaining_disclosures: 1,
    state_version: 0,
    owner_scope_sequence: 1
  }
};
const usedNonceProjection = {
  schema: "cairn.authoritative_row_projection.v0.1",
  table: "used_nonces",
  structural_key: canonicalText(["nonce:fixture"]),
  columns: {
    nonce: "nonce:fixture",
    envelope_hash: `sha-256:${"5".repeat(64)}`,
    operation: "intent.put",
    owner_kind: "principal",
    owner_id: "principal:alice",
    owner_scope_sequence: 1
  }
};
for (const projection of [
  runtimeBindingProjection,
  dataGrantProjection,
  effectDescriptorProjection,
  validationKeyProjection,
  grantStateProjection,
  usedNonceProjection
]) {
  validateDefinition("operationalRowProjection", projection);
}

const presentAliasCases = [
  ["objects", "primary_ref", rowVector.value,
    objectRefStructuralKey(rowVector.value.columns.ref)],
  ["objects", "identity_key", rowVector.value,
    rowVector.value.columns.identity_key],
  ["objects", "uri_by_ref", rowVector.value,
    objectRefStructuralKey(rowVector.value.columns.ref)],
  ["objects", "access_by_ref", rowVector.value,
    objectRefStructuralKey(rowVector.value.columns.ref)],
  ["runtime_bindings", "runtime_key_id", runtimeBindingProjection,
    runtimeBindingProjection.structural_key],
  ["data_grants", "grant_ref", dataGrantProjection,
    dataGrantProjection.structural_key],
  ["effect_descriptors", "effect_ref", effectDescriptorProjection,
    effectDescriptorProjection.structural_key],
  ["validation_keys", "key_id", validationKeyProjection,
    validationKeyProjection.structural_key],
  ["grant_state", "grant_state_ref", grantStateProjection,
    grantStateProjection.structural_key],
  ["used_nonces", "nonce", usedNonceProjection,
    usedNonceProjection.structural_key],
  ["idempotency_records", "authority_idempotency",
    idempotencyIntegrityProjection,
    idempotencyIntegrityProjection.structural_key]
];
assert.equal(presentAliasCases.length, 11);
for (const [table, indexName, projection, attemptedKey] of presentAliasCases) {
  const baseEntry = {
    entry_key: canonicalText([table, projection.structural_key]),
    table_name: table,
    structural_key: projection.structural_key,
    access_kind: "read_present",
    canonical_row_hash: canonicalHash(projection)
  };
  const aliasStructuralKey = canonicalText([
    "index",
    indexName,
    attemptedKey
  ]);
  const aliasEntry = {
    entry_key: canonicalText([table, aliasStructuralKey]),
    table_name: table,
    structural_key: aliasStructuralKey,
    access_kind: "read_present",
    canonical_row_hash: canonicalHash(projection)
  };
  const manifest = bindExternal({
    schema: "cairn.dependency_manifest.v0.1",
    entries: [baseEntry, aliasEntry].sort((left, right) =>
      Buffer.compare(
        Buffer.from(left.entry_key, "utf8"),
        Buffer.from(right.entry_key, "utf8")
      )
    ),
    dependency_set_commitment: ZERO_HASH
  }, "dependencyManifest");
  const rows = new Map([[baseEntry.entry_key, projection]]);
  const resolution = new Map([[aliasEntry.entry_key, baseEntry.entry_key]]);
  assert.equal(
    dependencyManifestIsCoherent(manifest, rows, resolution),
    true,
    `valid present alias rejected: ${table}.${indexName}`
  );

  const attemptedTuple = parseCanonicalArray(attemptedKey);
  const borrowedTuple = structuredClone(attemptedTuple);
  if (objectRefAttemptedKeyIsValid(attemptedTuple)) {
    borrowedTuple[1] = "urn:uuid:00000000-0000-4000-8000-000000000299";
  } else {
    borrowedTuple[borrowedTuple.length - 1] =
      typeof borrowedTuple.at(-1) === "number"
        ? borrowedTuple.at(-1) + 1
        : `${borrowedTuple.at(-1)}-other`;
  }
  if (indexName === "authority_idempotency") {
    borrowedTuple[0] = `sha-256:${"f".repeat(64)}`;
  }
  const borrowedAttemptedKeyText = canonicalText(borrowedTuple);
  assert.equal(
    TABLE_RULES[table].aliases[indexName].valid(borrowedTuple),
    true,
    `borrowed fixture invalid for ${table}.${indexName}`
  );
  const borrowedStructuralKey = canonicalText([
    "index",
    indexName,
    borrowedAttemptedKeyText
  ]);
  const borrowedEntry = {
    ...aliasEntry,
    entry_key: canonicalText([table, borrowedStructuralKey]),
    structural_key: borrowedStructuralKey
  };
  const borrowedManifest = bindExternal({
    schema: "cairn.dependency_manifest.v0.1",
    entries: [baseEntry, borrowedEntry].sort((left, right) =>
      Buffer.compare(
        Buffer.from(left.entry_key, "utf8"),
        Buffer.from(right.entry_key, "utf8")
      )
    ),
    dependency_set_commitment: ZERO_HASH
  }, "dependencyManifest");
  assert.equal(
    dependencyManifestIsCoherent(
      borrowedManifest,
      rows,
      new Map([[borrowedEntry.entry_key, baseEntry.entry_key]])
    ),
    false,
    `borrowed present alias accepted: ${table}.${indexName}`
  );
}

assert.equal(
  idempotencyIntegrityProjection.structural_key,
  canonicalText([idempotencyStructuralKeyCommitmentValue])
);
assert.equal(
  idempotencyIntegrityProjection.columns.structural_key_commitment,
  idempotencyStructuralKeyCommitmentValue
);
assert.notEqual(
  idempotencyStructuralKeyCommitmentValue,
  canonicalHash(JSON.parse(idempotencyDatabaseLookupKey)),
  "idempotency structural key became an offline public dictionary oracle"
);
const absentIdempotencyAttemptedKey = canonicalText([
  idempotencyStructuralKeyCommitmentValue
]);
const absentIdempotencyStructuralKey = canonicalText([
  "index",
  "authority_idempotency",
  absentIdempotencyAttemptedKey
]);
const absentIdempotencyEntry = {
  entry_key: canonicalText([
    "idempotency_records",
    absentIdempotencyStructuralKey
  ]),
  table_name: "idempotency_records",
  structural_key: absentIdempotencyStructuralKey,
  access_kind: "read_absent",
  canonical_row_hash: canonicalHash([
    "cairn-authoritative-absent-row-v0.1",
    "idempotency_records",
    "authority_idempotency",
    absentIdempotencyAttemptedKey
  ])
};
const absentIdempotencyManifest = bindExternal({
  schema: "cairn.dependency_manifest.v0.1",
  entries: [absentIdempotencyEntry],
  dependency_set_commitment: ZERO_HASH
}, "dependencyManifest");
assert.equal(
  dependencyManifestIsCoherent(absentIdempotencyManifest),
  true,
  "opaque idempotency absence dependency rejected"
);
const serializedIdempotencyDependency = canonicalText(
  absentIdempotencyManifest
);
assert.equal(
  serializedIdempotencyDependency.includes(
    originalMutationFacts.authority_namespace
  ),
  false
);
assert.equal(
  serializedIdempotencyDependency.includes(
    originalMutationFacts.idempotency_key
  ),
  false
);
assert.equal(
  idempotencyDatabaseLookupKey,
  canonicalText([
    originalMutationFacts.authority_namespace,
    originalMutationFacts.idempotency_key
  ])
);
const serializedIdempotencyProjection = canonicalText(
  idempotencyIntegrityProjection
);
assert.equal(
  serializedIdempotencyProjection.includes(
    originalMutationFacts.authority_namespace
  ),
  false
);
assert.equal(
  serializedIdempotencyProjection.includes(
    originalMutationFacts.idempotency_key
  ),
  false
);
assert.equal(serializedIdempotencyProjection.includes("global_commit_sequence"), false);
const frozenIdempotencyView = {
  fingerprint: idempotencyIntegrityProjection.columns.operation_fingerprint,
  result_ref: idempotencyIntegrityProjection.columns.result_ref
};
assert.deepEqual(Object.keys(frozenIdempotencyView), ["fingerprint", "result_ref"]);

const privateScopeCommitMap = new Map([
  [
    `${originalMutationFacts.principal_id}:${originalMutationFacts.origin_scope_sequence}`,
    originalMutationFacts.origin_global_commit_sequence
  ]
]);
const idempotencyIntegrityTruth = {
  authority_namespace: originalMutationFacts.authority_namespace,
  idempotency_key: originalMutationFacts.idempotency_key,
  operation_name: originalMutationFacts.operation_name,
  operation_fingerprint: originalMutationFacts.operation_fingerprint,
  principal_id: originalMutationFacts.principal_id,
  actor_id: originalMutationFacts.actor_id,
  runtime_key_id: originalMutationFacts.runtime_key_id,
  result_ref: structuredClone(originalMutationFacts.result_ref),
  kernel_result_hash: originalMutationFacts.kernel_result_hash,
  origin_global_commit_sequence:
    originalMutationFacts.origin_global_commit_sequence,
  origin_scope_sequence: originalMutationFacts.origin_scope_sequence,
  created_global_commit_sequence:
    originalMutationFacts.created_global_commit_sequence,
  created_scope_sequence: originalMutationFacts.created_scope_sequence,
  origin_observation_ref:
    structuredClone(originalMutationFacts.origin_observation_ref)
};
const IDEMPOTENCY_OPERATOR_FIELDS = Object.keys(idempotencyIntegrityTruth);
assert.deepEqual(
  compositeProbe.origin.sidecar.rich_idempotency_rows,
  [idempotencyIntegrityTruth],
  "actual composite origin did not produce the exact durable idempotency row"
);

function idempotencyOperatorRowIsCoherent(
  operatorRow,
  truth,
  scopeCommitMap = privateScopeCommitMap
) {
  return canonicalText(Object.keys(operatorRow)) ===
      canonicalText(IDEMPOTENCY_OPERATOR_FIELDS) &&
    IDEMPOTENCY_OPERATOR_FIELDS.every(
      (field) =>
        canonicalText(operatorRow[field]) === canonicalText(truth[field])
    ) &&
    scopeCommitMap.get(
      `${operatorRow.principal_id}:${operatorRow.origin_scope_sequence}`
    ) === operatorRow.origin_global_commit_sequence &&
    scopeCommitMap.get(
      `${operatorRow.principal_id}:${operatorRow.created_scope_sequence}`
    ) === operatorRow.created_global_commit_sequence;
}

function idempotencyProjectionIsCoherent(
  projection,
  operatorRow,
  truth = idempotencyIntegrityTruth
) {
  try {
    validateDefinition("operationalRowProjection", projection);
    const expected = projectIdempotencyOwnerRow(operatorRow);
    return idempotencyOperatorRowIsCoherent(operatorRow, truth) &&
      canonicalText(projection) === canonicalText(expected);
  } catch {
    return false;
  }
}
assert.equal(
  idempotencyProjectionIsCoherent(
    idempotencyIntegrityProjection,
    idempotencyOperatorRow
  ),
  true
);

const idempotencyProjectionMutations = [
  ["structural_key", canonicalText([`sha-256:${"5".repeat(64)}`])],
  ["structural_key_commitment", `sha-256:${"5".repeat(64)}`],
  ["operation_name", "action.prepare"],
  ["operation_fingerprint", `sha-256:${"6".repeat(64)}`],
  ["principal_id", "principal:mallory"],
  ["actor_id", "agent:mallory"],
  ["runtime_key_id", "did:key:runtime-other"],
  ["result_ref", {
    ...rowVector.value.columns.ref,
    object_hash: `sha-256:${"7".repeat(64)}`
  }],
  ["kernel_result_hash", `sha-256:${"8".repeat(64)}`],
  ["origin_scope_sequence", 2],
  ["created_scope_sequence", 2]
];
for (const [field, value] of idempotencyProjectionMutations) {
  const mutated = structuredClone(idempotencyIntegrityProjection);
  if (field === "structural_key") mutated.structural_key = value;
  else mutated.columns[field] = value;
  validateDefinition("operationalRowProjection", mutated);
  assert.equal(
    idempotencyProjectionIsCoherent(mutated, idempotencyOperatorRow),
    false,
    `idempotency integrity mutation accepted: ${field}`
  );
  assert.notEqual(
    canonicalHash(mutated),
    canonicalHash(idempotencyIntegrityProjection),
    `idempotency integrity field omitted from row hash: ${field}`
  );
}

const idempotencyOperatorRowMutations = [
  ["authority_namespace", "tenant:mallory"],
  ["idempotency_key", "idem-other"],
  ["operation_name", "action.prepare"],
  ["operation_fingerprint", `sha-256:${"6".repeat(64)}`],
  ["principal_id", "principal:mallory"],
  ["actor_id", "agent:mallory"],
  ["runtime_key_id", "did:key:runtime-other"],
  ["result_ref", {
    ...rowVector.value.columns.ref,
    object_hash: `sha-256:${"7".repeat(64)}`
  }],
  ["kernel_result_hash", `sha-256:${"8".repeat(64)}`],
  ["origin_global_commit_sequence", 42],
  ["origin_scope_sequence", 2],
  ["created_global_commit_sequence", 42],
  ["created_scope_sequence", 2]
];
for (const [field, value] of idempotencyOperatorRowMutations) {
  const mutatedOperatorRow = structuredClone(idempotencyOperatorRow);
  mutatedOperatorRow[field] = value;
  const reboundProjection = projectIdempotencyOwnerRow(mutatedOperatorRow);
  validateDefinition("operationalRowProjection", reboundProjection);
  assert.equal(
    idempotencyProjectionIsCoherent(
      reboundProjection,
      mutatedOperatorRow,
      idempotencyIntegrityTruth
    ),
    false,
    `durable idempotency mutation escaped independent truth: ${field}`
  );
}

const foreignCommitOperatorRow = {
  ...idempotencyOperatorRow,
  origin_global_commit_sequence: 9001,
  created_global_commit_sequence: 9001
};
assert.equal(
  canonicalHash(projectIdempotencyOwnerRow(foreignCommitOperatorRow)),
  canonicalHash(idempotencyIntegrityProjection),
  "operator-private global sequence changed the owner-visible row/root input"
);
assert.equal(
  idempotencyProjectionIsCoherent(
    idempotencyIntegrityProjection,
    foreignCommitOperatorRow
  ),
  false,
  "operator-private global sequence escaped its private scope-commit cross-check"
);

function dependencyEntryForProjection(projection, accessKind) {
  return {
    entry_key: canonicalText([projection.table, projection.structural_key]),
    table_name: projection.table,
    structural_key: projection.structural_key,
    access_kind: accessKind,
    canonical_row_hash: canonicalHash(projection)
  };
}

function aliasDependencyEntry({
  table,
  indexName,
  attemptedKey,
  accessKind,
  canonicalRowHash = null
}) {
  const structuralKey = canonicalText([
    "index",
    indexName,
    attemptedKey
  ]);
  return {
    entry_key: canonicalText([table, structuralKey]),
    table_name: table,
    structural_key: structuralKey,
    access_kind: accessKind,
    canonical_row_hash: canonicalRowHash ?? canonicalHash([
      "cairn-authoritative-absent-row-v0.1",
      table,
      indexName,
      attemptedKey
    ])
  };
}

function committedDependencyManifest(entries) {
  return bindExternal({
    schema: "cairn.dependency_manifest.v0.1",
    entries: structuredClone(entries).sort((left, right) =>
      Buffer.compare(
        Buffer.from(left.entry_key, "utf8"),
        Buffer.from(right.entry_key, "utf8")
      )
    ),
    dependency_set_commitment: ZERO_HASH
  }, "dependencyManifest");
}

function ownerScopeCommitment({
  ownerKind,
  ownerId,
  scopeSequence,
  projections
}) {
  const committedRows = projections.map((projection) => [
    projection.table,
    projection.structural_key,
    canonicalHash(projection)
  ]).sort((left, right) => {
    const tableOrder = Buffer.compare(
      Buffer.from(left[0], "utf8"),
      Buffer.from(right[0], "utf8")
    );
    return tableOrder || Buffer.compare(
      Buffer.from(left[1], "utf8"),
      Buffer.from(right[1], "utf8")
    );
  });
  return canonicalHash([
    "cairn-reference-owner-state-v0.1",
    SERVICE_ID,
    STORE_ID,
    ownerKind,
    ownerId,
    scopeSequence,
    committedRows
  ]);
}

const ORIGINAL_ENVELOPE_HASH =
  compositeProbe.origin.envelope.envelope_hash;
const ORIGINAL_SNAPSHOT_ID =
  actualOriginObservation.transaction.snapshot_id;
const originalNonceProjection = structuredClone(
  compositeProbe.origin.sidecar.current_projections.find(
    (projection) =>
      projection.table === "used_nonces" &&
      projection.columns.nonce === compositeProbe.origin.envelope.nonce
  )
);
assert.ok(originalNonceProjection);
validateDefinition("operationalRowProjection", originalNonceProjection);
const originalMutationCommittedProjections = structuredClone(
  compositeProbe.origin.sidecar.current_projections.filter((projection) => {
    const dependencyKeys = new Set(
      compositeProbe.origin.sidecar.dependency_rows
        .filter(({ global_sequence }) => global_sequence === 1)
        .map(({ entry_key }) => entry_key)
    );
    const projectionOwner =
      projection.columns.owner_id ?? projection.columns.principal_id;
    return dependencyKeys.has(canonicalText([
      projection.table,
      projection.structural_key
    ])) && (
      projectionOwner === undefined ||
      projectionOwner === originalMutationFacts.principal_id
    );
  })
);
const originalMutationDependencyManifest = committedDependencyManifest(
  compositeProbe.origin.sidecar.dependency_rows
    .filter(({ global_sequence }) => global_sequence === 1)
    .map(({ global_sequence: _globalSequence, ...entry }) => entry)
);
const actualOriginDependencyRows =
  compositeProbe.origin.sidecar.dependency_rows.filter(
    ({ global_sequence }) => global_sequence === 1
  );
assert.deepEqual(
  [...new Set(actualOriginDependencyRows.map(({ table_name }) => table_name))]
    .sort(),
  [
    "data_grants",
    "grant_state",
    "idempotency_records",
    "objects",
    "runtime_bindings",
    "used_nonces",
    "validation_keys"
  ]
);
function dependencyRowByStructuralKey(
  rows,
  tableName,
  structuralKeyPredicate
) {
  const matches = rows.filter(
    ({ table_name, structural_key }) =>
      table_name === tableName &&
      structuralKeyPredicate(JSON.parse(structural_key))
  );
  assert.equal(
    matches.length,
    1,
    `expected one ${tableName} dependency row, found ${matches.length}`
  );
  return matches[0];
}
assert.equal(
  dependencyRowByStructuralKey(
    actualOriginDependencyRows,
    "grant_state",
    (key) => key[0] !== "index"
  ).access_kind,
  "read_present_write_update"
);
assert.equal(
  dependencyRowByStructuralKey(
    actualOriginDependencyRows,
    "used_nonces",
    (key) => key[0] !== "index"
  ).access_kind,
  "read_absent_write_insert"
);
assert.equal(
  dependencyRowByStructuralKey(
    actualOriginDependencyRows,
    "used_nonces",
    (key) => key[0] === "index" && key[1] === "nonce"
  ).access_kind,
  "read_absent"
);
assert.equal(
  dependencyRowByStructuralKey(
    actualOriginDependencyRows,
    "idempotency_records",
    (key) => key[0] !== "index"
  ).access_kind,
  "read_absent_write_insert"
);
assert.equal(
  dependencyRowByStructuralKey(
    actualOriginDependencyRows,
    "idempotency_records",
    (key) => key[0] === "index" &&
      key[1] === "authority_idempotency"
  ).access_kind,
  "read_absent"
);
const canonicalOriginDependencyRows =
  canonicalText(actualOriginDependencyRows);
assert.equal(
  canonicalOriginDependencyRows.includes(
    compositeProbe.origin.authentication.authorityNamespace
  ),
  false,
  "origin dependency rows leaked the raw authority namespace"
);
assert.equal(
  canonicalOriginDependencyRows.includes(
    compositeProbe.origin.envelope.idempotency_key
  ),
  false,
  "origin dependency rows leaked the raw idempotency key"
);
assert.equal(
  originalMutationDependencyManifest.dependency_set_commitment,
  actualOriginObservation.transaction.dependency_set_commitment
);
const originalMutationScopeCommitment =
  actualOriginObservation.transaction.scope_state_commitment_after;
assert.equal(
  ownerScopeCommitment({
    ownerKind: "principal",
    ownerId: originalMutationFacts.principal_id,
    scopeSequence: originalMutationFacts.origin_scope_sequence,
    projections: originalMutationCommittedProjections
  }),
  originalMutationScopeCommitment
);

function queryCommitmentFor(contract, {
  principalId = null,
  actorId = "agent:anko",
  runtimeKeyId = null,
  hostContextHash = hostContext.context_hash,
  bodyHash = canonicalHash({}),
  subjectRefs = [],
  authorizationRefs = []
} = {}) {
  return canonicalHash({
    operation_contract: contract,
    principal_id: principalId,
    actor_id: actorId,
    runtime_key_id: runtimeKeyId,
    body_hash: bodyHash,
    subject_refs: subjectRefs,
    authorization_refs: authorizationRefs,
    host_authentication_context_hash: hostContextHash,
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
  outcome,
  contract = capabilityContract,
  principalId = null,
  actorId = "agent:anko",
  runtimeKeyId = null,
  ownerKind = "actor",
  ownerId = actorId,
  nonceDisposition = "newly_reserved",
  hostAuthenticationContext = hostContext,
  returnedRefs = [],
  envelopeHash = `sha-256:${"1".repeat(64)}`,
  messageId = "urn:uuid:00000000-0000-4000-8000-000000000020",
  bodyHash = canonicalHash({}),
  subjectRefs = [],
  authorizationRefs = [],
  accessTraceCommitment = canonicalHash([]),
  dependencySetCommitment = dependencyManifest.dependency_set_commitment,
  scopeStateCommitmentAfter = `sha-256:${String(scopeAfter).repeat(64)}`,
  grantEffects = [],
  idempotency = {
    structural_key_commitment: null,
    disposition: "not_applicable",
    original_result_hash: null,
    original_observation_ref: null,
    original_scope_sequence: null
  }
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
      consequence: contract.consequence,
      visibility: "private",
      owner_kind: ownerKind,
      owner_id: ownerId
    },
    request: {
      envelope_hash: envelopeHash,
      message_id: messageId,
      operation_contract: contract,
      principal_id: principalId,
      actor_id: actorId,
      runtime_key_id: runtimeKeyId,
      body_hash: bodyHash,
      subject_refs: structuredClone(subjectRefs),
      authorization_refs: structuredClone(authorizationRefs),
      query_commitment: queryCommitmentFor(contract, {
        principalId,
        actorId,
        runtimeKeyId,
        hostContextHash: hostAuthenticationContext.context_hash,
        bodyHash,
        subjectRefs,
        authorizationRefs
      }),
      host_authentication_context_hash: hostAuthenticationContext.context_hash
    },
    observed_at: NOW,
    transaction: {
      isolation: "serializable",
      snapshot_id: snapshotId,
      scope_sequence_before: scopeBefore,
      scope_sequence_after: scopeAfter,
      access_trace_commitment: accessTraceCommitment,
      dependency_set_commitment: dependencySetCommitment,
      scope_state_commitment_after: scopeStateCommitmentAfter,
      committed: true
    },
    result: {
      outcome,
      status: kernel.status,
      code: kernel.ok ? null : kernel.code,
      failures: kernel.ok ? [] : kernel.failures,
      replayed: kernel.ok ? kernel.replayed : false,
      response_schema: kernel.ok ? contract.response_schema : null,
      kernel_result_hash: canonicalHash(kernel),
      returned_refs: returnedRefs,
      relevant_heads: [],
      nonce_disposition: nonceDisposition,
      grant_effects: structuredClone(grantEffects),
      idempotency
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
const originalMutationObservation =
  structuredClone(actualOriginObservation);
const successfulReplayKernel = structuredClone(
  compositeProbe.successful_replay.trace.callback_value
);
assert.equal(successfulReplayKernel.ok, true);
assert.equal(successfulReplayKernel.replayed, true);
const successfulReplayEnvelope =
  compositeProbe.successful_replay.envelope;
const replayNonceProjection = structuredClone(
  compositeProbe.successful_replay.sidecar.current_projections.find(
    (projection) =>
      projection.table === "used_nonces" &&
      projection.columns.nonce === successfulReplayEnvelope.nonce
  )
);
assert.ok(replayNonceProjection);
validateDefinition("operationalRowProjection", replayNonceProjection);
const successfulReplayDependencyManifest = committedDependencyManifest(
  compositeProbe.successful_replay.sidecar.dependency_rows
    .filter(({ global_sequence }) => global_sequence === 2)
    .map(({ global_sequence: _globalSequence, ...entry }) => entry)
);
const actualReplayDependencyRows =
  compositeProbe.successful_replay.sidecar.dependency_rows.filter(
    ({ global_sequence }) => global_sequence === 2
  );
assert.deepEqual(
  [...new Set(actualReplayDependencyRows.map(({ table_name }) => table_name))]
    .sort(),
  [
    "idempotency_records",
    "objects",
    "runtime_bindings",
    "used_nonces",
    "validation_keys"
  ]
);
assert.equal(
  dependencyRowByStructuralKey(
    actualReplayDependencyRows,
    "idempotency_records",
    (key) => key[0] !== "index"
  ).access_kind,
  "read_present"
);
assert.equal(
  dependencyRowByStructuralKey(
    actualReplayDependencyRows,
    "idempotency_records",
    (key) => key[0] === "index" &&
      key[1] === "authority_idempotency"
  ).access_kind,
  "read_present"
);
assert.equal(
  dependencyRowByStructuralKey(
    actualReplayDependencyRows,
    "used_nonces",
    (key) => key[0] !== "index"
  ).access_kind,
  "read_absent_write_insert"
);
assert.equal(
  dependencyRowByStructuralKey(
    actualReplayDependencyRows,
    "used_nonces",
    (key) => key[0] === "index" && key[1] === "nonce"
  ).access_kind,
  "read_absent"
);
const canonicalReplayDependencyRows =
  canonicalText(actualReplayDependencyRows);
assert.equal(
  canonicalReplayDependencyRows.includes(
    compositeProbe.origin.authentication.authorityNamespace
  ),
  false,
  "replay dependency rows leaked the raw authority namespace"
);
assert.equal(
  canonicalReplayDependencyRows.includes(
    compositeProbe.origin.envelope.idempotency_key
  ),
  false,
  "replay dependency rows leaked the raw idempotency key"
);
assert.equal(
  successfulReplayDependencyManifest.dependency_set_commitment,
  actualReplayObservation.transaction.dependency_set_commitment
);
const successfulReplayCommittedProjections = structuredClone(
  compositeProbe.successful_replay.sidecar.current_projections.filter(
    (projection) => {
      const dependencyKeys = new Set(
        compositeProbe.successful_replay.sidecar.dependency_rows
          .filter(({ global_sequence }) => global_sequence === 2)
          .map(({ entry_key }) => entry_key)
      );
      const projectionOwner =
        projection.columns.owner_id ?? projection.columns.principal_id;
      return dependencyKeys.has(canonicalText([
        projection.table,
        projection.structural_key
      ])) && (
        projectionOwner === undefined ||
        projectionOwner === originalMutationFacts.principal_id
      );
    }
  )
);
const successfulReplayScopeCommitment =
  actualReplayObservation.transaction.scope_state_commitment_after;
assert.equal(
  ownerScopeCommitment({
    ownerKind: "principal",
    ownerId: originalMutationFacts.principal_id,
    scopeSequence: 2,
    projections: successfulReplayCommittedProjections
  }),
  successfulReplayScopeCommitment
);
const successfulReplayObservation =
  structuredClone(actualReplayObservation);
validateDefinition("serviceObservation", successObservation);
validateDefinition("serviceObservation", acceptedFailureObservation);
validateDefinition("serviceObservation", originalMutationObservation);
validateDefinition("serviceObservation", successfulReplayObservation);
for (const signed of [
  successObservation,
  acceptedFailureObservation,
  originalMutationObservation,
  successfulReplayObservation
]) {
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
const validateServiceObservationSchema = ajv.compile({
  "$ref": `${schema.$id}#/$defs/serviceObservation`
});
const replaySemanticMutations = [
  ["nonce_disposition", (observation) => {
    observation.result.nonce_disposition = "newly_reserved";
  }],
  ["idempotency_disposition", (observation) => {
    observation.result.idempotency.disposition = "created";
  }],
  ["original_result_hash", (observation) => {
    observation.result.idempotency.original_result_hash = null;
  }],
  ["original_observation_ref", (observation) => {
    observation.result.idempotency.original_observation_ref = null;
  }],
  ["original_scope_sequence", (observation) => {
    observation.result.idempotency.original_scope_sequence = null;
  }]
];
for (const [caseId, mutate] of replaySemanticMutations) {
  const changed = structuredClone(successfulReplayObservation);
  mutate(changed);
  assert.equal(
    validateServiceObservationSchema(changed),
    false,
    `replay semantic mutation escaped schema: ${caseId}`
  );
}
const falseReplayOrigin = structuredClone(originalMutationObservation);
falseReplayOrigin.result.replayed = true;
assert.equal(
  validateServiceObservationSchema(falseReplayOrigin),
  false,
  "new mutation observation was accepted as replay without replay semantics"
);
const acceptedFailureClaimingReplay =
  structuredClone(acceptedFailureObservation);
acceptedFailureClaimingReplay.result.replayed = true;
acceptedFailureClaimingReplay.result.nonce_disposition =
  "replay_fresh_nonce";
acceptedFailureClaimingReplay.result.idempotency = {
  structural_key_commitment: idempotencyStructuralKeyCommitmentValue,
  disposition: "replayed",
  original_result_hash: originalMutationObservation.result.kernel_result_hash,
  original_observation_ref: {
    artifact_schema: originalMutationObservation.schema,
    artifact_id: originalMutationObservation.observation_id,
    artifact_hash: originalMutationObservation.observation_hash
  },
  original_scope_sequence:
    originalMutationObservation.transaction.scope_sequence_after
};
assert.equal(
  validateServiceObservationSchema(acceptedFailureClaimingReplay),
  false,
  "schema accepted an impossible accepted-failure replay"
);
assert.equal(
  originalMutationObservation.request.operation_contract.operation,
  idempotencyIntegrityTruth.operation_name
);
assert.equal(
  originalMutationObservation.request.principal_id,
  idempotencyIntegrityTruth.principal_id
);
assert.equal(
  originalMutationObservation.request.actor_id,
  idempotencyIntegrityTruth.actor_id
);
assert.equal(
  originalMutationObservation.request.runtime_key_id,
  idempotencyIntegrityTruth.runtime_key_id
);
assert.equal(
  originalMutationObservation.request.host_authentication_context_hash,
  compositeProbe.origin.sidecar.host_authentication_contexts[0]
    .context.context_hash
);
assert.deepEqual(
  compositeProbe.origin.sidecar.host_authentication_contexts[0].context,
  {
    schema: "cairn.host_authentication_context.v0.1",
    context_hash:
      originalMutationObservation.request.host_authentication_context_hash,
    account_tenant_commitment:
      compositeProbe.origin.receiver_authentication
        .account_tenant_commitment,
    principal_id: compositeProbe.origin.authentication.principalId,
    actor_id: compositeProbe.origin.authentication.actorId,
    runtime_key_id: compositeProbe.origin.envelope.sender.runtime_key_id,
    authority_namespace_commitment:
      compositeProbe.origin.receiver_authentication
        .authority_namespace_commitment,
    trust_profile_id:
      compositeProbe.origin.receiver_authentication.trust_profile_id,
    trust_profile_hash:
      compositeProbe.origin.receiver_authentication.trust_profile_hash,
    authentication_evidence_commitment:
      compositeProbe.origin.receiver_authentication
        .authentication_evidence_commitment,
    assertion_level:
      compositeProbe.origin.receiver_authentication.assertion_level
  }
);
assert.deepEqual(
  compositeProbe.origin.sidecar.receiver_authentication_records[0],
  {
    global_sequence: 1,
    record: compositeProbe.origin.receiver_authentication
  },
  "the committed receiver authentication record differs from the record used by the transaction"
);
assert.equal(
  compositeProbe.origin.sidecar.request_envelopes[0].global_sequence,
  1
);
assert.deepEqual(
  JSON.parse(
    compositeProbe.origin.sidecar.request_envelopes[0]
      .canonical_envelope_bytes
  ),
  compositeProbe.origin.envelope,
  "the committed request bytes do not reconstruct the exact signed envelope"
);
assert.equal(
  compositeProbe.origin.sidecar.request_envelopes[0]
    .canonical_envelope_bytes,
  canonicalText(compositeProbe.origin.envelope),
  "the committed request envelope was not stored as exact canonical bytes"
);
assert.equal(
  canonicalText(
    compositeProbe.origin.sidecar.host_authentication_contexts[0].context
  ).includes(
    compositeProbe.origin.receiver_authentication.authority_namespace_raw
  ),
  false,
  "raw authority namespace leaked into the durable host context"
);
assert.equal(
  originalMutationObservation.request.envelope_hash,
  compositeProbe.origin.envelope.envelope_hash
);
assert.equal(
  originalMutationObservation.request.message_id,
  compositeProbe.origin.envelope.message_id
);
assert.equal(
  originalMutationObservation.request.body_hash,
  compositeProbe.origin.envelope.body_hash
);
assert.deepEqual(
  originalMutationObservation.request.subject_refs,
  compositeProbe.origin.envelope.subject_refs
);
assert.deepEqual(
  originalMutationObservation.request.authorization_refs,
  compositeProbe.origin.envelope.authorization_refs
);
assert.deepEqual(
  originalMutationObservation.result.returned_refs,
  [idempotencyIntegrityTruth.result_ref]
);
assert.equal(
  originalMutationObservation.result.kernel_result_hash,
  idempotencyIntegrityTruth.kernel_result_hash
);
assert.equal(
  originalMutationObservation.transaction.scope_sequence_after,
  idempotencyIntegrityTruth.origin_scope_sequence
);

const localSuccess = {
  schema: "cairn.local_observed_result.v0.1",
  disposition: "committed_success",
  kernel: kernelSuccess,
  wrapper_failure: null,
  service_observation: successObservation
};
const localAcceptedFailure = {
  schema: "cairn.local_observed_result.v0.1",
  disposition: "committed_accepted_failure",
  kernel: kernelAcceptedFailure,
  wrapper_failure: null,
  service_observation: acceptedFailureObservation
};
const localRolledBackFailure = {
  schema: "cairn.local_observed_result.v0.1",
  disposition: "rolled_back_failure",
  kernel: null,
  wrapper_failure: {
    status: 503,
    code: "reference_service_failure",
    failures: ["reference_service_failure"],
    stage: "preflight"
  },
  service_observation: null
};
for (const result of [localSuccess, localAcceptedFailure, localRolledBackFailure]) {
  validateDefinition("localObservedResult", result);
}

function localResultIsCoherent(result) {
  if (result.disposition === "rolled_back_failure") {
    if (result.service_observation !== null) return false;
    if (result.wrapper_failure === null) return result.kernel?.ok === false;
    if (["preflight", "retry"].includes(result.wrapper_failure.stage)) {
      return result.kernel === null;
    }
    return ["observation", "persistence", "commit"].includes(
      result.wrapper_failure.stage
    ) && result.kernel !== null;
  }
  const observed = result.service_observation;
  if (!observed || result.wrapper_failure !== null) return false;
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
const impossibleRollbackSuccess = {
  schema: "cairn.local_observed_result.v0.1",
  disposition: "rolled_back_failure",
  kernel: kernelSuccess,
  wrapper_failure: null,
  service_observation: null
};
assert.equal(
  validateLocalResult(impossibleRollbackSuccess),
  false,
  "successful callback rolled back without an infrastructure failure"
);
assert.equal(localResultIsCoherent(impossibleRollbackSuccess), false);
for (const invalidRollback of [
  {
    ...structuredClone(localRolledBackFailure),
    kernel: kernelAcceptedFailure
  },
  {
    ...structuredClone(localRolledBackFailure),
    wrapper_failure: {
      status: 503,
      code: "observation_failed",
      failures: ["observation_failed"],
      stage: "observation"
    }
  }
]) {
  assert.equal(
    validateLocalResult(invalidRollback),
    false,
    "rolled-back failure crossed its stage/kernel branch"
  );
  assert.equal(localResultIsCoherent(invalidRollback), false);
}
for (const kernel of [kernelSuccess, kernelAcceptedFailure]) {
  const postCallbackRollback = {
    schema: "cairn.local_observed_result.v0.1",
    disposition: "rolled_back_failure",
    kernel,
    wrapper_failure: {
      status: 503,
      code: "commit_failed",
      failures: ["commit_failed"],
      stage: "commit"
    },
    service_observation: null
  };
  assert.equal(
    validateLocalResult(postCallbackRollback),
    true,
    JSON.stringify(validateLocalResult.errors)
  );
  assert.equal(localResultIsCoherent(postCallbackRollback), true);
}
const EXPECTED_REPLAY_FAULTS = [
  "missing_result_object",
  "corrupt_result_binding",
  "missing_result_acl",
  "public_result_acl",
  "foreign_result_acl"
];
const EXPECTED_WRAPPER_FAULTS = [
  "response_schema",
  "observation",
  "persistence",
  "commit"
];

function schemaLocalResult(localResult) {
  return {
    schema: "cairn.local_observed_result.v0.1",
    ...structuredClone(localResult)
  };
}

function assertCompositeRollback(caseId, trace, {
  callbackCommit,
  wrapperCode = null
}) {
  assert.equal(trace.case_id.includes(caseId), true, caseId);
  assert.equal(trace.operation, "intent.put", caseId);
  assert.equal(trace.callback_commit, callbackCommit, caseId);
  assert.equal(trace.final_commit, false, caseId);
  assert.deepEqual(trace.kernel_after, trace.kernel_before, caseId);
  assert.deepEqual(trace.sidecar_after, trace.sidecar_before, caseId);
  assert.equal(trace.local_result.disposition, "rolled_back_failure", caseId);
  assert.deepEqual(trace.local_result.kernel, trace.callback_value, caseId);
  assert.equal(trace.local_result.service_observation, null, caseId);
  if (wrapperCode === null) {
    assert.equal(trace.wrapper_failure, null, caseId);
    assert.equal(trace.local_result.wrapper_failure, null, caseId);
  } else {
    assert.equal(trace.wrapper_failure.code, wrapperCode, caseId);
    assert.deepEqual(
      trace.local_result.wrapper_failure,
      trace.wrapper_failure,
      caseId
    );
  }
  const local = schemaLocalResult(trace.local_result);
  validateDefinition("localObservedResult", local);
  assert.equal(localResultIsCoherent(local), true, caseId);
}

assert.equal(
  compositeProbe.fingerprint_conflict.raw.failures.includes(
    "idempotency_conflict"
  ),
  true
);
assertCompositeRollback(
  "fingerprint_conflict",
  compositeProbe.fingerprint_conflict.trace,
  { callbackCommit: false }
);
assert.equal(
  compositeProbe.fingerprint_conflict.trace.frozen_callback_value !==
    null,
  true,
  "a coherent changed fingerprint was blocked before the frozen callback"
);
assert.equal(
  compositeProbe.fingerprint_conflict.trace.callback_access_trace.some(
    ({ store, method }) =>
      store === "idempotencyRecords" && method === "get"
  ),
  true,
  "fingerprint conflict did not reach the frozen idempotency lookup"
);
assert.deepEqual(
  Object.keys(compositeProbe.preflight_faults).sort(),
  [
    "live_frozen_extra",
    "live_frozen_fingerprint_corrupt",
    "live_frozen_missing",
    "live_frozen_result_ref_corrupt",
    "rich_row_corrupt",
    "rich_row_duplicate",
    "unrelated_rich_corruption"
  ],
  "preflight fault inventory changed"
);
assert.equal(
  Object.keys(compositeProbe.preflight_faults).length,
  7,
  "preflight control count changed"
);
for (const [caseId, { raw, trace }] of Object.entries(
  compositeProbe.preflight_faults
)) {
  assert.equal(raw.code, "idempotency_integrity_invalid", caseId);
  assert.equal(trace.wrapper_failure.stage, "preflight", caseId);
  assert.equal(trace.callback_commit, null, caseId);
  assert.equal(trace.frozen_callback_value, null, caseId);
  assert.equal(trace.callback_value, null, caseId);
  assert.deepEqual(trace.callback_access_trace, [], caseId);
  assert.equal(trace.local_result.kernel, null, caseId);
  assert.equal(trace.local_result.service_observation, null, caseId);
  assert.deepEqual(trace.kernel_after, trace.kernel_before, caseId);
  assert.deepEqual(trace.sidecar_after, trace.sidecar_before, caseId);
}

assert.equal(compositeProbe.successful_replay.raw.ok, true);
assert.equal(compositeProbe.successful_replay.raw.replayed, true);
assert.equal(
  compositeProbe.successful_replay.trace.operation,
  "intent.put"
);
assert.equal(
  compositeProbe.successful_replay.trace.callback_commit,
  true
);
assert.equal(
  compositeProbe.successful_replay.trace.final_commit,
  true
);
assert.deepEqual(
  compositeProbe.successful_replay.sidecar.scope_commits.map((commit) => [
    commit.scope_sequence,
    commit.previous_scope_sequence,
    commit.global_sequence
  ]),
  [[1, 0, 1], [2, 1, 2]]
);
assert.equal(
  verifyCompositeHistory(compositeProbe.multi_idempotency.sidecar),
  true,
  "two-key idempotency history failed independent verification"
);
assert.equal(
  compositeProbe.multi_idempotency.sidecar.rich_idempotency_rows.length,
  2
);
assert.equal(
  compositeProbe.multi_idempotency.second_origin.raw.replayed,
  false
);
assert.equal(
  compositeProbe.multi_idempotency.second_replay.raw.replayed,
  true
);
const multiIdempotencyRows =
  compositeProbe.multi_idempotency.sidecar.rich_idempotency_rows;
assert.notEqual(
  multiIdempotencyRows[0].idempotency_key,
  multiIdempotencyRows[1].idempotency_key
);
assert.deepEqual(
  compositeProbe.multi_idempotency.second_replay.trace.local_result
    .service_observation.result.idempotency.original_observation_ref,
  multiIdempotencyRows[1].origin_observation_ref,
  "the second key replay selected the wrong origin row"
);
assert.equal(
  compositeProbe.multi_idempotency.exact_key_relink_rejected,
  true,
  "a signed envelope could be coherently relinked to another idempotency row"
);
assert.equal(
  compositeProbe.multi_idempotency.version_order_independent,
  true,
  "operational-version reconstruction depended on array order"
);
assert.equal(
  compositeProbe.durable_artifact_controls.origin_bound,
  true
);
assert.equal(
  compositeProbe.durable_artifact_controls.replay_bound,
  true
);
assert.equal(
  compositeProbe.durable_artifact_controls
    .callback_value_artifact_mutation_rejected,
  true
);
{
  const changedTrace = structuredClone(compositeProbe.origin.callback);
  changedTrace.frozen_callback_value.status = 299;
  changedTrace.callback_value.status = 299;
  changedTrace.local_result.kernel.status = 299;
  assert.equal(
    verifyCompositeArtifactBinding(
      compositeProbe.origin.sidecar,
      changedTrace
    ),
    false,
    "coherent callback artifact substitution escaped"
  );
}
{
  const witness = compositeProbe.origin.object.value;
  const witnessSchema = foundation.schemasByObjectId.get(witness.schema);
  assert.ok(witnessSchema);
  const signaturePointer =
    witnessSchema["x-cairn-signature-pointers"][0];
  const signingKeyId = valueAtPointer(witness, signaturePointer).key_id;
  const baseVersions = new Map(
    compositeProbe.origin.sidecar.current_projections.map(
      (projection, index) => [String(index), projection]
    )
  );
  for (const [caseId, mutate] of [
    ["independent_witness_signed_hash", (value) => {
      valueAtPointer(value, signaturePointer).signed_hash =
        `sha-256:${"0".repeat(64)}`;
    }],
    ["independent_witness_signature_value", (value) => {
      valueAtPointer(value, signaturePointer).value = "A".repeat(86);
    }],
    ["independent_witness_historical_key", (_value, versions) => {
      const keyProjection = [...versions.values()].find(
        ({ table, columns }) =>
          table === "validation_keys" &&
          columns.key_id === signingKeyId
      );
      assert.ok(keyProjection);
      keyProjection.columns.public_key = SERVICE_OBSERVATION_PUBLIC_KEY;
    }]
  ]) {
    const changedWitness = structuredClone(witness);
    const changedVersions = structuredClone(baseVersions);
    mutate(changedWitness, changedVersions);
    assert.equal(
      verifySignedObjectWitness(
        changedWitness,
        changedVersions,
        COMPOSITE_FIXTURE.now
      ),
      false,
      caseId
    );
  }
}
assert.equal(
  compositeProbe.durable_artifact_controls.historical_profile_positive,
  true,
  "a valid observation under a prior service-key profile did not verify"
);
assert.equal(
  Object.keys(
    compositeProbe.durable_artifact_controls.replay_history_mutations
  ).length,
  10
);
assert.equal(
  Object.values(
    compositeProbe.durable_artifact_controls.replay_history_mutations
  ).every(Boolean),
  true
);
assert.equal(
  Object.keys(
    compositeProbe.durable_artifact_controls.access_trace_mutations
  ).length,
  25
);
assert.equal(
  Object.values(
    compositeProbe.durable_artifact_controls.access_trace_mutations
  ).every(Boolean),
  true
);
const EXPECTED_SIGNED_HISTORY_MUTATIONS = [
  "access_trace_wrapper_extra",
  "alias_noncanonical_attempted_key",
  "callback_witness_bytes",
  "callback_witness_commit",
  "callback_witness_missing",
  "callback_witness_wrapper_extra",
  "dependency_access_kind_substitution",
  "dependency_commit_wrapper_extra",
  "dependency_sequence_future",
  "dependency_sequence_negative",
  "dependency_sequence_zero",
  "false_absent_hidden_identity_fork",
  "frozen_duplicate_row",
  "frozen_extra_field",
  "frozen_fingerprint",
  "frozen_missing_row",
  "frozen_result_ref",
  "grant_effect_ref",
  "grant_effect_remaining",
  "grant_effect_removed",
  "grant_effect_state_version",
  "host_account_tenant_commitment",
  "host_actor_id",
  "host_assertion_level",
  "host_authentication_evidence",
  "host_authentication_wrapper_extra",
  "host_authority_namespace_commitment",
  "host_principal_id",
  "host_runtime_key_id",
  "host_trust_profile_hash",
  "host_trust_profile_id",
  "operational_version_future_sequence",
  "operational_version_negative_sequence",
  "owner_counter_substitution",
  "owner_derivation_actor_for_principal",
  "owner_derivation_history",
  "owner_derivation_principal_for_actor",
  "receiver_authentication_wrapper_extra",
  "receiver_operation_qualified_namespace",
  "repository_wrapper_extra",
  "request_envelope_signature_signed_hash",
  "request_envelope_signature_value",
  "request_envelope_wrapper_extra",
  "request_operation_fingerprint",
  "request_query_commitment",
  "request_receiver_actor_binding",
  "request_receiver_principal_binding",
  "rich_actor_id",
  "rich_authority_namespace",
  "rich_created_global_commit_sequence",
  "rich_created_scope_sequence",
  "rich_duplicate_row",
  "rich_idempotency_key",
  "rich_kernel_result_hash",
  "rich_missing_row",
  "rich_operation_fingerprint",
  "rich_operation_name",
  "rich_origin_dependency_missing",
  "rich_origin_global_commit_sequence",
  "rich_origin_observation_ref",
  "rich_origin_scope_sequence",
  "rich_principal_id",
  "rich_projection_missing",
  "rich_result_ref",
  "rich_runtime_key_id",
  "rich_version_missing",
  "scope_commit_wrapper_extra",
  "service_commit_wrapper_extra",
  "sidecar_counter_substitution",
  "sidecar_uncommitted_operational_snapshot",
  "signed_trace_commitment_divergence",
  "trace_duplicate_event",
  "trace_hash_substitution",
  "trace_key_substitution",
  "trace_presence_substitution",
  "trace_remove_one_event",
  "trace_signed_object_binding",
  "trace_signed_object_binding_history",
  "trace_signed_object_historical_key",
  "trace_signed_object_signature_value",
  "trace_signed_object_signed_hash",
  "trace_value_and_hash_substitution",
  "trace_write_before_value_and_hash_substitution",
  "transaction_kind_genesis_as_operation",
  "transaction_kind_open_value",
  "transaction_kind_origin_as_genesis",
  "transaction_kind_origin_as_replay",
  "transaction_kind_replay_as_operation",
  "trust_bundle_hash",
  "trust_key_profile_hash",
  "trust_key_profile_id",
  "trust_key_profile_ref_hash",
  "trust_profile",
  "trust_service_id",
  "trust_signature_key",
  "trust_signature_profile",
  "trust_signature_signed_hash",
  "trust_signature_time",
  "trust_store_id",
  "validation_binding_operation_contract",
  "validation_binding_wrapper_extra"
];
const EXPECTED_FOREIGN_HISTORY_MUTATIONS = [
  "foreign_access_trace",
  "foreign_dependency_commitment",
  "foreign_observation_bytes",
  "foreign_owner_counter",
  "foreign_repository_hash",
  "foreign_scope_mapping",
  "foreign_service_ref",
  "foreign_transaction_kind"
];
const EXPECTED_SERVICE_PROFILE_MUTATIONS = [
  "profile_chain_fork",
  "profile_chain_link",
  "profile_chain_order",
  "profile_chain_rollback",
  "profile_expired_key",
  "profile_future_created",
  "profile_historical_expired_at_creation",
  "profile_historical_invalid_suffix",
  "profile_historical_missing_current",
  "profile_historical_revoked_key",
  "profile_missing_current_key",
  "profile_noncurrent_interval",
  "profile_noncurrent_signing_key",
  "profile_revoked_key",
  "profile_self_hash",
  "profile_wrong_controller"
];
for (const [actual, expected, label] of [
  [
    compositeProbe.durable_artifact_controls.signed_history_mutations,
    EXPECTED_SIGNED_HISTORY_MUTATIONS,
    "signed history"
  ],
  [
    compositeProbe.durable_artifact_controls.foreign_history_mutations,
    EXPECTED_FOREIGN_HISTORY_MUTATIONS,
    "actual foreign history"
  ],
  [
    compositeProbe.durable_artifact_controls.service_profile_mutations,
    EXPECTED_SERVICE_PROFILE_MUTATIONS,
    "service profile"
  ]
]) {
  assert.deepEqual(Object.keys(actual).sort(), expected, label);
  assert.equal(
    Object.values(actual).every(Boolean),
    true,
    `${label} mutation escaped`
  );
}

assert.deepEqual(
  Object.keys(compositeProbe.replay_faults),
  EXPECTED_REPLAY_FAULTS
);
const replayTraceHashes = new Set();
for (const caseId of EXPECTED_REPLAY_FAULTS) {
  const { raw, trace } = compositeProbe.replay_faults[caseId];
  assert.equal(raw.code, "authoritative_integrity_invalid", caseId);
  assert.equal(
    trace.callback_value.code,
    "idempotency_result_unavailable",
    caseId
  );
  assert.equal(
    trace.callback_after.used_nonces.length,
    trace.callback_before.used_nonces.length + 1,
    caseId
  );
  assertCompositeRollback(caseId, trace, {
    callbackCommit: true,
    wrapperCode: "authoritative_integrity_invalid"
  });
  replayTraceHashes.add(canonicalHash({
    case_id: trace.case_id,
    callback_before: trace.callback_before,
    callback_after: trace.callback_after,
    wrapper_failure: trace.wrapper_failure
  }));
}
assert.equal(
  replayTraceHashes.size,
  EXPECTED_REPLAY_FAULTS.length,
  "replay fault controls reused one captured transaction"
);

assert.deepEqual(
  Object.keys(compositeProbe.wrapper_faults),
  EXPECTED_WRAPPER_FAULTS
);
for (const stage of EXPECTED_WRAPPER_FAULTS) {
  const { raw, trace } = compositeProbe.wrapper_faults[stage];
  assert.equal(raw.ok, false, stage);
  assert.equal(raw.code, `${stage}_failed`, stage);
  assert.equal(trace.callback_value.ok, true, stage);
  assert.equal(trace.callback_after.used_nonces.length, 2, stage);
  assertCompositeRollback(stage, trace, {
    callbackCommit: true,
    wrapperCode: stage + "_failed"
  });
  const expectedStageCounters = {
    response_schema: {
      callback_calls: 2,
      observation_calls: 1,
      persistence_calls: 1,
      commit_calls: 1
    },
    observation: {
      callback_calls: 2,
      observation_calls: 1,
      persistence_calls: 1,
      commit_calls: 1
    },
    persistence: {
      callback_calls: 2,
      observation_calls: 2,
      persistence_calls: 1,
      commit_calls: 1
    },
    commit: {
      callback_calls: 2,
      observation_calls: 2,
      persistence_calls: 2,
      commit_calls: 2
    }
  };
  assert.deepEqual(
    trace.staged_sidecar.value.counters,
    expectedStageCounters[stage],
    `${stage} fault did not reach its stated wrapper boundary`
  );
  assert.notEqual(
    trace.wrapper_failure.code,
    "reference_service_failure",
    `${stage} fault collapsed to a generic kernel failure`
  );
  if (stage === "response_schema") {
    const responseValidation = trace.response_validation;
    assert.equal(responseValidation.accepted, false);
    assert.equal(
      responseValidation.schema,
      intentPutContract.response_schema
    );
    const responseSourceSchema = foundation.schemasById.get(
      intentPutContract.response_schema.split("#", 1)[0]
    );
    assert.ok(responseSourceSchema);
    assert.equal(
      responseValidation.response_source_schema_bytes,
      canonicalText(responseSourceSchema)
    );
    assert.equal(
      responseValidation.response_source_schema_hash,
      canonicalHash(responseSourceSchema)
    );
    assert.equal(
      responseValidation.operation_contract_hash,
      canonicalHash(intentPutContract)
    );
    assert.equal(
      responseValidation.authoritative_schema_hash,
      EXPECTED_SCHEMA_HASH
    );
    assert.equal(
      responseValidation.validator_binding_hash,
      canonicalHash([
        "cairn-registered-response-validator-v0.1",
        foundation.bundleHash,
        intentPutContract,
        canonicalHash(responseSourceSchema)
      ])
    );
    assert.deepEqual(
      responseValidation.boundary_controls.map(
        ({ case_id, accepted }) => [case_id, accepted]
      ),
      [
        ["registered_valid", true],
        ["missing_ref", false],
        ["missing_receipt_ref", false],
        ["extra_property", false],
        ["malformed_nested_ref", false]
      ],
      "the frozen response validator boundary was weakened or substituted"
    );
    assert.equal(
      validateIntentPutResponse(trace.frozen_callback_value.body),
      true
    );
    assert.equal(
      validateIntentPutResponse(trace.callback_value.body),
      false
    );
    assert.equal(
      canonicalText(trace.local_result.kernel),
      canonicalText(trace.callback_value)
    );
  }
}

assert.deepEqual(
  Object.keys(compositeProbe.unexpected_wrapper_faults),
  ["observation", "persistence", "commit"]
);
for (const stage of ["observation", "persistence", "commit"]) {
  const { raw, trace } = compositeProbe.unexpected_wrapper_faults[stage];
  assert.equal(raw.ok, false, stage);
  assert.equal(raw.code, `${stage}_failed`, stage);
  assert.equal(trace.callback_value.ok, true, stage);
  assertCompositeRollback(`unexpected_${stage}`, trace, {
    callbackCommit: true,
    wrapperCode: `${stage}_failed`
  });
  assert.notEqual(
    trace.wrapper_failure.code,
    "reference_service_failure",
    `unexpected ${stage} exception collapsed to a generic failure`
  );
}

const actualGrantFailure = compositeProbe.grant_consumption_failure;
assert.equal(actualGrantFailure.raw.code, "grant_consumption_failed");
assert.equal(
  actualGrantFailure.trace.callback_value.code,
  "grant_consumption_failed"
);
assert.equal(
  actualGrantFailure.trace.callback_after.maps.idempotencyRecords.size,
  actualGrantFailure.trace.callback_before.maps.idempotencyRecords.size + 1,
  "grant failure was not injected after idempotency staging"
);
assertCompositeRollback(
  "grant_consumption_failed",
  actualGrantFailure.trace,
  { callbackCommit: false }
);

const actualReceiverFailure = compositeProbe.receiver_stability_failure;
assert.equal(
  actualReceiverFailure.raw.code,
  "receiver_authentication_invalid"
);
assert.equal(actualReceiverFailure.trace.callback_value, null);
assert.deepEqual(actualReceiverFailure.trace.callback_access_trace, []);
assertCompositeRollback(
  "receiver_stability_preflight",
  actualReceiverFailure.trace,
  {
    callbackCommit: null,
    wrapperCode: "receiver_authentication_invalid"
  }
);

const actualReceiverContextFailure =
  compositeProbe.receiver_handle_stability_failure;
assert.equal(
  actualReceiverContextFailure.raw.code,
  "receiver_authentication_invalid"
);
assert.equal(actualReceiverContextFailure.trace.callback_value, null);
assert.deepEqual(
  actualReceiverContextFailure.trace.callback_access_trace,
  []
);
assertCompositeRollback(
  "receiver_handle_stability_preflight",
  actualReceiverContextFailure.trace,
  {
    callbackCommit: null,
    wrapperCode: "receiver_authentication_invalid"
  }
);
assert.equal(
  compositeProbe.receiver_recovery.cache_fallback_rejected,
  true
);
assert.equal(compositeProbe.receiver_recovery.raw.ok, true);
assert.equal(compositeProbe.receiver_recovery.raw.replayed, true);
assert.equal(compositeProbe.receiver_recovery.trace.callback_commit, true);
assert.equal(compositeProbe.receiver_recovery.trace.final_commit, true);
assert.equal(
  verifyCompositeHistory(
    compositeProbe.receiver_recovery.trace.sidecar_after.value
  ),
  true
);

const originSidecar = compositeProbe.origin.sidecar;
function assertActualCompositeMutationRejected(
  caseId,
  source,
  mutate
) {
  const changed = structuredClone(source);
  mutate(changed);
  assert.equal(
    verifyCompositeHistory(changed),
    false,
    `actual composite mutation escaped: ${caseId}`
  );
}
assertActualCompositeMutationRejected(
  "independent_request_signature_value",
  originSidecar,
  (sidecar) => {
    const row = sidecar.request_envelopes[0];
    const envelope = JSON.parse(row.canonical_envelope_bytes);
    envelope.signature.value = "A".repeat(86);
    row.canonical_envelope_bytes = canonicalText(envelope);
  }
);
assertActualCompositeMutationRejected(
  "independent_future_operational_version",
  originSidecar,
  (sidecar) => {
    const projection = sidecar.current_projections.find(
      ({ table }) => table === "objects"
    );
    const prior = sidecar.operational_versions
      .filter(
        (version) =>
          version.table === projection.table &&
          version.structural_key === projection.structural_key
      )
      .sort(
        (left, right) =>
          right.valid_from_global_sequence -
            left.valid_from_global_sequence
      )[0];
    sidecar.operational_versions.push({
      ...structuredClone(prior),
      valid_from_global_sequence: sidecar.global_sequence + 1
    });
  }
);
assertActualCompositeMutationRejected(
  "independent_callback_witness_bytes",
  originSidecar,
  (sidecar) => {
    sidecar.callback_witnesses[0].canonical_result_bytes += " ";
  }
);
const actualRichRow = originSidecar.rich_idempotency_rows[0];
for (const field of Object.keys(actualRichRow)) {
  assertActualCompositeMutationRejected(
    `independent_rich_${field}`,
    originSidecar,
    (sidecar) => {
      const row = sidecar.rich_idempotency_rows[0];
      if (field === "result_ref") {
        row.result_ref.object_hash = `sha-256:${"1".repeat(64)}`;
      } else if (field === "origin_observation_ref") {
        row.origin_observation_ref.artifact_hash =
          `sha-256:${"2".repeat(64)}`;
      } else if (typeof row[field] === "number") {
        row[field] += 9;
      } else {
        row[field] = `${row[field]}-substituted`;
      }
    }
  );
}
for (const [caseId, source, sequence, replacement] of [
  ["origin_unknown_kind", originSidecar, 1, "unknown"],
  ["origin_replay_kind", originSidecar, 1, "replay"],
  ["origin_genesis_kind", originSidecar, 1, "genesis"],
  ["genesis_operation_kind", originSidecar, 0, "service_operation"],
  [
    "replay_operation_kind",
    compositeProbe.successful_replay.sidecar,
    2,
    "service_operation"
  ]
]) {
  assertActualCompositeMutationRejected(
    caseId,
    source,
    (sidecar) => {
      sidecar.service_commits[sequence].transaction_kind = replacement;
    }
  );
}
for (const [caseId, mutate] of [
  ["actual_foreign_owner_counter", (sidecar) => {
    sidecar.owner_sequences[
      canonicalText(["principal", "did:example:foreign-4"])
    ] = 2;
  }],
  ["actual_foreign_scope_sequence", (sidecar) => {
    sidecar.scope_commits[4].scope_sequence = 2;
  }],
  ["actual_foreign_observation", (sidecar) => {
    sidecar.observation_repository[4].canonical_observation_bytes += " ";
  }],
  ["actual_foreign_trace", (sidecar) => {
    sidecar.access_traces[4].events[0].key =
      canonicalText(["independent-substitution"]);
  }]
]) {
  assertActualCompositeMutationRejected(
    caseId,
    actualInterleavedSidecar,
    mutate
  );
}
assert.deepEqual(
  originSidecar.service_commits.map((commit) => [
    commit.global_sequence,
    commit.previous_global_sequence
  ]),
  [[0, null], [1, 0]],
  "service genesis/global history is not exact"
);
assert.deepEqual(
  originSidecar.scope_commits.map((commit) => [
    commit.scope_sequence,
    commit.previous_scope_sequence,
    commit.global_sequence
  ]),
  [[1, 0, 1]],
  "owner history must begin at scope sequence one, not owner sequence zero"
);
assert.equal(
  originSidecar.scope_commits.some(
    (commit) => commit.scope_sequence === 0
  ),
  false,
  "owner sequence zero was persisted"
);
assert.deepEqual(originSidecar.owner_sequences, {
  [canonicalText(["principal", originalMutationFacts.principal_id])]: 1
});
assert.deepEqual(originSidecar.observations, [actualOriginObservation]);
assert.equal(
  originSidecar.observation_repository[0].canonical_observation_bytes,
  canonicalText(actualOriginObservation)
);
assert.equal(
  originSidecar.observation_repository[0].observation_ref_key,
  originSidecar.service_commits[1].observation_ref_key
);
assert.equal(
  originSidecar.observation_repository[0].observation_ref_key,
  originSidecar.scope_commits[0].observation_ref_key
);

function observationRefKeyFor(observation) {
  return canonicalText([
    observation.schema,
    observation.observation_id,
    observation.observation_hash
  ]);
}

function operationalVersionFor(projection, globalSequence) {
  const ownerKind = projection.columns.owner_kind ??
    (projection.columns.principal_id ? "principal" : "service");
  const ownerId = projection.columns.owner_id ??
    projection.columns.principal_id ??
    SERVICE_ID;
  return {
    table: projection.table,
    structural_key: projection.structural_key,
    visibility: projection.columns.visibility ?? "private",
    owner_kind: ownerKind,
    owner_id: ownerId,
    valid_from_global_sequence: globalSequence,
    canonical_row_bytes: canonicalText(projection),
    canonical_row_hash: canonicalHash(projection)
  };
}

const ORIGINAL_OBSERVATION_REF_KEY =
  observationRefKeyFor(originalMutationObservation);

function controlUuid(number) {
  return "urn:uuid:20000000-0000-4000-8000-" +
    String(number).padStart(12, "0");
}

function unrelatedCommitArtifacts(globalSequence) {
  const ownerId = "did:example:unrelated-" + globalSequence;
  const envelopeHash = canonicalHash([
    "cairn-unrelated-envelope-v0.1",
    globalSequence
  ]);
  const projection = {
    schema: "cairn.authoritative_row_projection.v0.1",
    table: "used_nonces",
    structural_key: canonicalText([
      "unrelated-nonce-" + globalSequence
    ]),
    columns: {
      nonce: "unrelated-nonce-" + globalSequence,
      envelope_hash: envelopeHash,
      operation: "capabilities.get",
      owner_kind: "actor",
      owner_id: ownerId,
      owner_scope_sequence: 1
    }
  };
  validateDefinition("operationalRowProjection", projection);
  const manifest = committedDependencyManifest([
    dependencyEntryForProjection(
      projection,
      "read_absent_write_insert"
    ),
    aliasDependencyEntry({
      table: "used_nonces",
      indexName: "nonce",
      attemptedKey: "unrelated-nonce-" + globalSequence,
      accessKind: "read_absent"
    })
  ]);
  const observationId = controlUuid(300 + globalSequence);
  const snapshotId = controlUuid(400 + globalSequence);
  const hostAuthenticationContext = bindExternal({
    schema: "cairn.host_authentication_context.v0.1",
    context_hash: ZERO_HASH,
    account_tenant_commitment: canonicalHash([
      "cairn-unrelated-account-v0.1",
      ownerId
    ]),
    principal_id: null,
    actor_id: ownerId,
    runtime_key_id: null,
    authority_namespace_commitment: canonicalHash([
      "cairn-unrelated-authority-v0.1",
      ownerId
    ]),
    trust_profile_id: "cairn:fixture:unrelated",
    trust_profile_hash: canonicalHash([
      "cairn-unrelated-trust-profile-v0.1"
    ]),
    authentication_evidence_commitment: canonicalHash([
      "cairn-unrelated-auth-evidence-v0.1",
      globalSequence
    ]),
    assertion_level: "host_asserted"
  }, "hostAuthenticationContext");
  const scopeStateCommitment = ownerScopeCommitment({
    ownerKind: "actor",
    ownerId,
    scopeSequence: 1,
    projections: [projection]
  });
  const observation = signedObservation({
    observationId,
    snapshotId,
    scopeBefore: 0,
    scopeAfter: 1,
    kernel: kernelSuccess,
    outcome: "success",
    contract: capabilityContract,
    principalId: null,
    actorId: ownerId,
    runtimeKeyId: null,
    ownerKind: "actor",
    ownerId,
    hostAuthenticationContext,
    envelopeHash,
    messageId: controlUuid(500 + globalSequence),
    bodyHash: canonicalHash({}),
    dependencySetCommitment: manifest.dependency_set_commitment,
    scopeStateCommitmentAfter: scopeStateCommitment
  });
  validateDefinition("serviceObservation", observation);
  assert.equal(
    objectHash(observation, schema.$defs.serviceObservation),
    observation.observation_hash
  );
  assert.equal(
    verifyEd25519({
      schemaId: observation.schema,
      objectHash: observation.observation_hash,
      publicKey: fixturePublicKey,
      signature: observation.service_signature.value
    }),
    true
  );
  const observationRefKey = observationRefKeyFor(observation);
  const canonicalObservationBytes = canonicalText(observation);
  return {
    projection,
    manifest,
    observation,
    service_commit: {
      global_sequence: globalSequence,
      previous_global_sequence: globalSequence - 1,
      transaction_kind: "service_operation",
      observation_ref_key: observationRefKey
    },
    scope_commit: {
      owner_kind: "actor",
      owner_id: ownerId,
      scope_sequence: 1,
      previous_scope_sequence: 0,
      global_sequence: globalSequence,
      scope_state_commitment_after: scopeStateCommitment,
      dependency_set_commitment: manifest.dependency_set_commitment,
      snapshot_id: snapshotId,
      observation_ref_key: observationRefKey
    },
    observation_row: {
      observation_ref_key: observationRefKey,
      observation_id: observationId,
      observation_hash: observation.observation_hash,
      request_envelope_hash: envelopeHash,
      canonical_observation_bytes: canonicalObservationBytes,
      principal_id: null,
      owner_kind: "actor",
      owner_id: ownerId,
      visibility: "private",
      global_commit_sequence: globalSequence,
      scope_sequence: 1
    }
  };
}

function expectedOriginHistory(globalSequence = 1) {
  assert.equal(Number.isInteger(globalSequence), true);
  assert.equal(globalSequence >= 1, true);
  const unrelated = Array.from(
    { length: globalSequence - 1 },
    (_, index) => unrelatedCommitArtifacts(index + 1)
  );
  const originVersions =
    compositeProbe.origin.sidecar.operational_versions.map((version) => ({
      ...structuredClone(version),
      valid_from_global_sequence:
        version.valid_from_global_sequence === 0 ? 0 : globalSequence
    }));
  const originDependencyRows =
    originalMutationDependencyManifest.entries.map((entry) => ({
      global_sequence: globalSequence,
      ...structuredClone(entry)
    }));
  const unrelatedDependencyRows = unrelated.flatMap((artifact) =>
    artifact.manifest.entries.map((entry) => ({
      global_sequence: artifact.service_commit.global_sequence,
      ...structuredClone(entry)
    }))
  );
  const observationByEnvelope = Object.fromEntries([
    ...unrelated.map((artifact) => [
      artifact.observation_row.request_envelope_hash,
      artifact.observation_row.observation_id
    ]),
    [
      originalMutationObservation.request.envelope_hash,
      originalMutationObservation.observation_id
    ]
  ]);
  return {
    current_global_sequence: globalSequence,
    current_scope_sequence: 1,
    idempotency_row: {
      ...structuredClone(idempotencyOperatorRow),
      origin_global_commit_sequence: globalSequence,
      created_global_commit_sequence: globalSequence
    },
    idempotency_projection: structuredClone(idempotencyIntegrityProjection),
    object_value: structuredClone(originalObjectValue),
    object_projection: structuredClone(originalObjectProjection),
    operational_versions: [
      ...unrelated.map((artifact) =>
        operationalVersionFor(
          artifact.projection,
          artifact.service_commit.global_sequence
        )
      ),
      ...originVersions
    ],
    dependency_rows: [
      ...unrelatedDependencyRows,
      ...originDependencyRows
    ],
    dependency_commits: [
      { global_sequence: 0, dependency_set_commitment: ZERO_HASH },
      ...unrelated.map((artifact) => ({
        global_sequence: artifact.service_commit.global_sequence,
        dependency_set_commitment:
          artifact.manifest.dependency_set_commitment
      })),
      {
        global_sequence: globalSequence,
        dependency_set_commitment:
          originalMutationDependencyManifest.dependency_set_commitment
      }
    ],
    service_commits: [
      {
        global_sequence: 0,
        previous_global_sequence: null,
        transaction_kind: "genesis",
        observation_ref_key: null
      },
      ...unrelated.map((artifact) =>
        structuredClone(artifact.service_commit)
      ),
      {
        global_sequence: globalSequence,
        previous_global_sequence: globalSequence - 1,
        transaction_kind: "service_operation",
        observation_ref_key: ORIGINAL_OBSERVATION_REF_KEY
      }
    ],
    scope_commits: [
      ...unrelated.map((artifact) =>
        structuredClone(artifact.scope_commit)
      ),
      {
        owner_kind: "principal",
        owner_id: originalMutationFacts.principal_id,
        scope_sequence: 1,
        previous_scope_sequence: 0,
        global_sequence: globalSequence,
        scope_state_commitment_after: originalMutationScopeCommitment,
        dependency_set_commitment:
          originalMutationDependencyManifest.dependency_set_commitment,
        snapshot_id: ORIGINAL_SNAPSHOT_ID,
        observation_ref_key: ORIGINAL_OBSERVATION_REF_KEY
      }
    ],
    observation_repository: [
      ...unrelated.map((artifact) =>
        structuredClone(artifact.observation_row)
      ),
      {
        observation_ref_key: ORIGINAL_OBSERVATION_REF_KEY,
        observation_id: originalMutationObservation.observation_id,
        observation_hash: originalMutationObservation.observation_hash,
        request_envelope_hash:
          originalMutationObservation.request.envelope_hash,
        canonical_observation_bytes:
          canonicalText(originalMutationObservation),
        principal_id: originalMutationObservation.request.principal_id,
        owner_kind: originalMutationObservation.access.owner_kind,
        owner_id: originalMutationObservation.access.owner_id,
        visibility: originalMutationObservation.access.visibility,
        global_commit_sequence: globalSequence,
        scope_sequence: 1
      }
    ],
    observation_by_envelope: observationByEnvelope
  };
}

function historyChainsAreComplete(history) {
  if (
    history.service_commits.length !==
      history.current_global_sequence + 1 ||
    history.dependency_commits.length !==
      history.current_global_sequence + 1
  ) {
    return false;
  }
  for (
    let globalSequence = 0;
    globalSequence <= history.current_global_sequence;
    globalSequence += 1
  ) {
    const serviceCommit = history.service_commits[globalSequence];
    const dependencyCommit = history.dependency_commits[globalSequence];
    if (
      serviceCommit?.global_sequence !== globalSequence ||
      serviceCommit.previous_global_sequence !==
        (globalSequence === 0 ? null : globalSequence - 1) ||
      dependencyCommit?.global_sequence !== globalSequence
    ) {
      return false;
    }
    if (globalSequence === 0) {
      if (
        serviceCommit.transaction_kind !== "genesis" ||
        serviceCommit.observation_ref_key !== null
      ) {
        return false;
      }
      continue;
    }
    const observationRow = history.observation_repository.find(
      (row) =>
        row.global_commit_sequence === globalSequence &&
        row.observation_ref_key === serviceCommit.observation_ref_key
    );
    const scopeCommit = history.scope_commits.find(
      (commit) =>
        commit.global_sequence === globalSequence &&
        commit.observation_ref_key === serviceCommit.observation_ref_key
    );
    let observation;
    try {
      observation = JSON.parse(
        observationRow?.canonical_observation_bytes ?? ""
      );
    } catch {
      return false;
    }
    const dependencyEntries = history.dependency_rows
      .filter((row) => row.global_sequence === globalSequence)
      .map(({ global_sequence: _globalSequence, ...entry }) => entry);
    const manifest = committedDependencyManifest(dependencyEntries);
    const currentVersions = new Map();
    for (const version of history.operational_versions.filter(
      (candidate) =>
        candidate.valid_from_global_sequence <= globalSequence
    )) {
      let projection;
      try {
        projection = JSON.parse(version.canonical_row_bytes);
      } catch {
        return false;
      }
      if (
        canonicalText(projection) !== version.canonical_row_bytes ||
        canonicalHash(projection) !== version.canonical_row_hash
      ) {
        return false;
      }
      try {
        validateDefinition("operationalRowProjection", projection);
      } catch {
        return false;
      }
      currentVersions.set(
        canonicalText([version.table, version.structural_key]),
        projection
      );
    }
    const dependencyProjectionKeys = new Set(
      dependencyEntries
        .map(({ entry_key }) => entry_key)
        .filter((entryKey) => currentVersions.has(entryKey))
    );
    const ownerProjections = [...currentVersions.entries()]
      .filter(([entryKey]) => dependencyProjectionKeys.has(entryKey))
      .map(([, projection]) => projection)
      .filter((projection) => {
        const projectionOwner =
          projection.columns.owner_id ?? projection.columns.principal_id;
        return projectionOwner === undefined ||
          projectionOwner === observation.access.owner_id;
      });
    if (
      !observationRow ||
      !scopeCommit ||
      canonicalText(observation) !==
        observationRow.canonical_observation_bytes ||
      !validateServiceObservationSchema(observation) ||
      objectHash(observation, schema.$defs.serviceObservation) !==
        observation.observation_hash ||
      !verifyEd25519({
        schemaId: observation.schema,
        objectHash: observation.observation_hash,
        publicKey: fixturePublicKey,
        signature: observation.service_signature.value
      }) ||
      observationRefKeyFor(observation) !==
        observationRow.observation_ref_key ||
      observationRow.observation_id !== observation.observation_id ||
      observationRow.observation_hash !== observation.observation_hash ||
      observationRow.request_envelope_hash !==
        observation.request.envelope_hash ||
      observationRow.principal_id !== observation.request.principal_id ||
      observationRow.owner_kind !== observation.access.owner_kind ||
      observationRow.owner_id !== observation.access.owner_id ||
      observationRow.visibility !== observation.access.visibility ||
      observationRow.scope_sequence !==
        observation.transaction.scope_sequence_after ||
      observationRow.owner_kind !== scopeCommit.owner_kind ||
      observationRow.owner_id !== scopeCommit.owner_id ||
      observationRow.scope_sequence !== scopeCommit.scope_sequence ||
      observationRow.visibility !== "private" ||
      scopeCommit.previous_scope_sequence !==
        observation.transaction.scope_sequence_before ||
      scopeCommit.snapshot_id !== observation.transaction.snapshot_id ||
      scopeCommit.scope_state_commitment_after !==
        observation.transaction.scope_state_commitment_after ||
      scopeCommit.dependency_set_commitment !==
        observation.transaction.dependency_set_commitment ||
      dependencyCommit.dependency_set_commitment !==
        observation.transaction.dependency_set_commitment ||
      manifest.dependency_set_commitment !==
        observation.transaction.dependency_set_commitment ||
      ownerScopeCommitment({
        ownerKind: observation.access.owner_kind,
        ownerId: observation.access.owner_id,
        scopeSequence: observation.transaction.scope_sequence_after,
        projections: ownerProjections
      }) !== observation.transaction.scope_state_commitment_after ||
      history.observation_by_envelope[
        observationRow.request_envelope_hash
      ] !== observationRow.observation_id
    ) {
      return false;
    }
  }
  const commitsByOwner = new Map();
  for (const commit of history.scope_commits) {
    const ownerKey = canonicalText([
      commit.owner_kind,
      commit.owner_id
    ]);
    const ownerCommits = commitsByOwner.get(ownerKey) ?? [];
    ownerCommits.push(commit);
    commitsByOwner.set(ownerKey, ownerCommits);
  }
  for (const ownerCommits of commitsByOwner.values()) {
    ownerCommits.sort(
      (left, right) => left.scope_sequence - right.scope_sequence
    );
    if (
      ownerCommits[0].scope_sequence !== 1 ||
      ownerCommits[0].previous_scope_sequence !== 0 ||
      ownerCommits.some(
        (commit, index) =>
          index > 0 &&
          (
            commit.scope_sequence !==
              ownerCommits[index - 1].scope_sequence + 1 ||
            commit.previous_scope_sequence !==
              ownerCommits[index - 1].scope_sequence
          )
      )
    ) {
      return false;
    }
  }
  return history.scope_commits.every(
    (commit) => commit.scope_sequence !== 0
  );
}

function originHistoryIsCoherent(history, globalSequence = 1) {
  try {
    const expected = expectedOriginHistory(globalSequence);
    const scopeCommitMap = new Map(
      history.scope_commits.map((commit) => [
        commit.owner_id + ":" + commit.scope_sequence,
        commit.global_sequence
      ])
    );
    const originDependencyRows = history.dependency_rows
      .filter((row) => row.global_sequence === globalSequence)
      .map(({ global_sequence: _globalSequence, ...entry }) => entry);
    const originManifest =
      committedDependencyManifest(originDependencyRows);
    return historyChainsAreComplete(history) &&
      idempotencyOperatorRowIsCoherent(
        history.idempotency_row,
        expected.idempotency_row,
        scopeCommitMap
      ) &&
      objectProjectionMatchesCanonicalValue(
        history.object_projection,
        history.object_value,
        originalObjectSchema
      ) &&
      history.object_projection.columns.visibility === "private" &&
      history.object_projection.columns.principal_id ===
        originalMutationFacts.principal_id &&
      originManifest.dependency_set_commitment ===
        originalMutationDependencyManifest.dependency_set_commitment &&
      canonicalText(history) === canonicalText(expected);
  } catch {
    return false;
  }
}

const exactOriginHistory = expectedOriginHistory();
assert.equal(originHistoryIsCoherent(exactOriginHistory), true);
const interleavedOriginHistory = expectedOriginHistory(7);
assert.equal(
  originHistoryIsCoherent(interleavedOriginHistory, 7),
  true,
  "complete interleaved global history was rejected"
);
assert.equal(interleavedOriginHistory.service_commits.length, 8);
assert.equal(
  interleavedOriginHistory.scope_commits.find(
    (commit) =>
      commit.owner_id === originalMutationFacts.principal_id
  ).global_sequence,
  7
);
assert.equal(
  interleavedOriginHistory.scope_commits.some(
    (commit) => commit.scope_sequence === 0
  ),
  false
);
for (const [caseId, mutate] of [
  ["foreign_canonical_bytes", (history) => {
    history.observation_repository[0].canonical_observation_bytes += " ";
  }],
  ["foreign_stored_hash", (history) => {
    history.observation_repository[0].observation_hash =
      `sha-256:${"a".repeat(64)}`;
  }],
  ["foreign_signature", (history) => {
    const observation = JSON.parse(
      history.observation_repository[0].canonical_observation_bytes
    );
    observation.service_signature.value = "A".repeat(86);
    history.observation_repository[0].canonical_observation_bytes =
      canonicalText(observation);
  }],
  ["foreign_repository_owner", (history) => {
    history.observation_repository[0].owner_id =
      "did:example:foreign-owner";
  }],
  ["foreign_dependency_commitment", (history) => {
    history.dependency_commits[1].dependency_set_commitment = ZERO_HASH;
  }],
  ["foreign_service_ref", (history) => {
    history.service_commits[1].observation_ref_key =
      canonicalText(["unexpected-observation"]);
  }],
  ["foreign_scope_mapping", (history) => {
    history.scope_commits[0].global_sequence = 2;
  }],
  ["foreign_envelope_index", (history) => {
    const key = history.observation_repository[0].request_envelope_hash;
    history.observation_by_envelope[key] = controlUuid(999);
  }]
]) {
  const changed = structuredClone(interleavedOriginHistory);
  mutate(changed);
  assert.equal(
    originHistoryIsCoherent(changed, 7),
    false,
    "foreign signed-history mutation escaped: " + caseId
  );
}
for (const [candidate, globalSequence, label] of [
  [exactOriginHistory, 1, "origin"],
  [interleavedOriginHistory, 7, "interleaved"]
]) {
  for (const collection of [
    "operational_versions",
    "dependency_rows",
    "dependency_commits",
    "service_commits",
    "scope_commits",
    "observation_repository"
  ]) {
    for (const mutation of ["duplicate", "extra"]) {
      const changed = structuredClone(candidate);
      const item = structuredClone(changed[collection].at(-1));
      if (mutation === "extra") {
        item.__unexpected = collection;
      }
      changed[collection].push(item);
      assert.equal(
        originHistoryIsCoherent(changed, globalSequence),
        false,
        label + " " + mutation + " " + collection +
          " escaped exact inventory verification"
      );
    }
  }
}
const extraEnvelopeIndex = structuredClone(interleavedOriginHistory);
extraEnvelopeIndex.observation_by_envelope[
  canonicalHash(["unexpected-envelope"])
] = controlUuid(999);
assert.equal(
  originHistoryIsCoherent(extraEnvelopeIndex, 7),
  false,
  "extra envelope index escaped exact history verification"
);
const missingInterleavedCommit = structuredClone(
  interleavedOriginHistory
);
missingInterleavedCommit.service_commits.splice(3, 1);
assert.equal(
  originHistoryIsCoherent(missingInterleavedCommit, 7),
  false,
  "incomplete interleaved global chain was accepted"
);
const falseInterleavedMapping = structuredClone(
  interleavedOriginHistory
);
falseInterleavedMapping.scope_commits.find(
  (commit) =>
    commit.owner_id === originalMutationFacts.principal_id
).global_sequence = 6;
assert.equal(
  originHistoryIsCoherent(falseInterleavedMapping, 7),
  false,
  "false owner-to-global mapping was accepted"
);

const originHistoryFieldMutations = [
  ["principal", (history) => {
    history.observation_repository.at(-1).principal_id =
      "did:example:foreign-collector";
  }],
  ["owner_kind", (history) => {
    history.observation_repository.at(-1).owner_kind = "actor";
  }],
  ["owner_id", (history) => {
    history.observation_repository.at(-1).owner_id =
      "did:web:foreign.example";
  }],
  ["visibility", (history) => {
    history.observation_repository.at(-1).visibility = "public";
  }],
  ["global_sequence", (history) => {
    history.observation_repository.at(-1).global_commit_sequence = 2;
  }],
  ["scope_sequence", (history) => {
    history.observation_repository.at(-1).scope_sequence = 2;
  }],
  ["identity_revision", (history) => {
    history.object_projection.columns.identity_key =
      wrongOriginalIdentityProjection.columns.identity_key;
  }],
  ["object_bytes", (history) => {
    history.object_value.revision += 1;
  }]
];
for (const [caseId, mutate] of originHistoryFieldMutations) {
  const changed = structuredClone(exactOriginHistory);
  mutate(changed);
  assert.equal(
    originHistoryIsCoherent(changed),
    false,
    "origin history mutation escaped: " + caseId
  );
}
assert.equal(
  canonicalHash(projectIdempotencyOwnerRow({
    ...idempotencyOperatorRow,
    origin_global_commit_sequence: 7,
    created_global_commit_sequence: 7
  })),
  canonicalHash(idempotencyIntegrityProjection),
  "operator-private global position leaked into the owner projection"
);
assert.equal(
  ownerScopeCommitment({
    ownerKind: "principal",
    ownerId: originalMutationFacts.principal_id,
    scopeSequence: 1,
    projections: originalMutationCommittedProjections
  }),
  originalMutationScopeCommitment,
  "unrelated global commits changed the owner-visible root"
);

const SUCCESSFUL_REPLAY_OBSERVATION_REF_KEY =
  observationRefKeyFor(successfulReplayObservation);
function expectedSuccessfulReplayHistory() {
  return structuredClone(compositeProbe.successful_replay.sidecar);
}

function successfulReplayHistoryIsCoherent(history) {
  return verifyCompositeHistory(history);
}

const exactSuccessfulReplayHistory =
  expectedSuccessfulReplayHistory();
assert.equal(
  successfulReplayHistoryIsCoherent(exactSuccessfulReplayHistory),
  true,
  "actual successful replay history was rejected"
);
assert.deepEqual(
  compositeProbe.successful_replay.sidecar.service_commits.map(
    (commit) => [
      commit.global_sequence,
      commit.previous_global_sequence,
      commit.transaction_kind
    ]
  ),
  [[0, null, "genesis"], [1, 0, "service_operation"], [2, 1, "replay"]]
);
for (const [caseId, mutate] of [
  ["fresh_envelope", (history) => {
    const observation = JSON.parse(
      history.observation_repository.at(-1)
        .canonical_observation_bytes
    );
    observation.request.envelope_hash =
      originalMutationObservation.request.envelope_hash;
    history.observation_repository.at(-1)
      .canonical_observation_bytes = canonicalText(observation);
  }],
  ["nonce_disposition", (history) => {
    const observation = JSON.parse(
      history.observation_repository.at(-1)
        .canonical_observation_bytes
    );
    observation.result.nonce_disposition = "newly_reserved";
    history.observation_repository.at(-1)
      .canonical_observation_bytes = canonicalText(observation);
  }],
  ["origin_result_hash", (history) => {
    const observation = JSON.parse(
      history.observation_repository.at(-1)
        .canonical_observation_bytes
    );
    observation.result.idempotency.original_result_hash =
      "sha-256:" + "a".repeat(64);
    history.observation_repository.at(-1)
      .canonical_observation_bytes = canonicalText(observation);
  }],
  ["origin_observation_ref", (history) => {
    const observation = JSON.parse(
      history.observation_repository.at(-1)
        .canonical_observation_bytes
    );
    observation.result.idempotency.original_observation_ref
      .artifact_hash = "sha-256:" + "b".repeat(64);
    history.observation_repository.at(-1)
      .canonical_observation_bytes = canonicalText(observation);
  }],
  ["origin_scope_sequence", (history) => {
    const observation = JSON.parse(
      history.observation_repository.at(-1)
        .canonical_observation_bytes
    );
    observation.result.idempotency.original_scope_sequence = 2;
    history.observation_repository.at(-1)
      .canonical_observation_bytes = canonicalText(observation);
  }],
  ["repository_owner", (history) => {
    history.observation_repository.at(-1).owner_id =
      "did:example:foreign-collector";
  }],
  ["repository_visibility", (history) => {
    history.observation_repository.at(-1).visibility = "public";
  }],
  ["scope_mapping", (history) => {
    history.scope_commits.at(-1).global_sequence = 1;
  }],
  ["dependency_commit", (history) => {
    history.dependency_commits.at(-1)
      .dependency_set_commitment = ZERO_HASH;
  }]
]) {
  const changed = structuredClone(exactSuccessfulReplayHistory);
  mutate(changed);
  assert.equal(
    successfulReplayHistoryIsCoherent(changed),
    false,
    "replay history mutation escaped: " + caseId
  );
}
for (const collection of [
  "operational_versions",
  "dependency_rows",
  "dependency_commits",
  "service_commits",
  "scope_commits",
  "observation_repository"
]) {
  const changed = structuredClone(exactSuccessfulReplayHistory);
  changed[collection].push(structuredClone(changed[collection].at(-1)));
  assert.equal(
    successfulReplayHistoryIsCoherent(changed),
    false,
    "duplicate replay history inventory escaped: " + collection
  );
}
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
  acceptedFailureObservation,
  originalMutationObservation,
  successfulReplayObservation,
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
console.log(
  `authoritative_design_composite_probe_hash=${EXPECTED_COMPOSITE_PROBE_HASH}`
);
