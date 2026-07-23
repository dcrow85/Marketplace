import assert from "node:assert/strict";
import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  sign as signBytes
} from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

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
const FROZEN_SERVICE_PATH = new URL(
  "../../protocol/reference-service/service.mjs",
  import.meta.url
);
const FROZEN_CAPTURE_PATH = fileURLToPath(
  new URL("./capture-frozen-transactions.mjs", import.meta.url)
);
const FROZEN_TEST_PATH = "protocol/tests/reference-service.test.mjs";
const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const EXPECTED_SCHEMA_HASH = "sha-256:0b80ffc51b9180b1f292e9596958c6d8e7310c85f7deeec706b4e49b9f1c0cee";
const EXPECTED_VECTORS_HASH = "sha-256:1b708027482289eabc06ed2247b6f112cd61ac6b92112b83152d5e6f730d9120";
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
  success_observation_hash: "sha-256:885fc906ef4ff965f05cfcb57c418a33084f4dd0abf8e9db4eff8d0e2d7f1bb5",
  success_observation_signature: "jzIWigzSnG1AqzU45j4piDlEOkTMK8mh7mjeRForXCKtMZrPcyqvKIIWWSNxLF-qJj2Dd3Kt0dkTTuXvUBTXAw",
  accepted_failure_observation_hash: "sha-256:eb74e980c4412f48b5163388621afc8cc2dfcc3ce667b4fa0a4acbaa768ea84a",
  accepted_failure_observation_signature: "qlp7vWRkjfhhWsyEvgURJTn0jGfph-862ak9mmyLdvAQwjcNUMXggv7xhw3NLBE-PcDdKfQlkU-Pf3ZW-R5eAQ"
};

function runFrozenTransactionProbe(testName) {
  const control = spawnSync(
    process.execPath,
    [
      "--import",
      FROZEN_CAPTURE_PATH,
      "--test",
      "--test-name-pattern",
      `^${testName}$`,
      FROZEN_TEST_PATH
    ],
    {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8"
    }
  );
  assert.equal(control.status, 0, `${control.stdout}\n${control.stderr}`);
  assert.equal(
    control.stdout.includes(testName),
    true,
    `actual frozen replay control did not execute: ${testName}`
  );
  return [...control.stdout.matchAll(/CAIRN_FROZEN_TX=(\{.*\})/g)].map(
    ([, record]) => JSON.parse(record)
  );
}

const schema = JSON.parse(await readFile(SCHEMA_PATH, "utf8"));
const spec = await readFile(SPEC_PATH, "utf8");
const vectors = JSON.parse(await readFile(VECTORS_PATH, "utf8"));
const registry = JSON.parse(await readFile(REGISTRY_PATH, "utf8"));
const frozenServiceSource = await readFile(FROZEN_SERVICE_PATH, "utf8");
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
  principal_id: "principal:alice"
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
const originalMutationKernelSuccess = {
  ok: true,
  status: 201,
  body: {
    ref: rowVector.value.columns.ref,
    receipt_ref: null
  },
  replayed: false
};
const frozenConflictTransactions = runFrozenTransactionProbe(
  "a changed fingerprint cannot reuse a committed idempotency key"
);
const actualFrozenConflict = frozenConflictTransactions.findLast(
  ({ value }) => value?.failures?.includes("idempotency_conflict")
);
assert.ok(actualFrozenConflict, "actual frozen idempotency conflict missing");
assert.equal(actualFrozenConflict.commit, false);
assert.ok(actualFrozenConflict.callback_before);
assert.ok(actualFrozenConflict.callback_after);
assert.deepEqual(actualFrozenConflict.after, actualFrozenConflict.before);

const frozenCorruptResultTransactions = runFrozenTransactionProbe(
  "replay fails closed when its stored exact result binding is corrupt"
);
const actualFrozenCorruptResult = frozenCorruptResultTransactions.findLast(
  ({ value }) => value?.code === "idempotency_result_unavailable"
);
assert.ok(actualFrozenCorruptResult, "actual frozen corrupt replay missing");
assert.equal(actualFrozenCorruptResult.commit, true);
assert.equal(
  actualFrozenCorruptResult.callback_after.used_nonces.length,
  actualFrozenCorruptResult.callback_before.used_nonces.length + 1
);
for (const name of Object.keys(actualFrozenCorruptResult.callback_before.maps)) {
  assert.deepEqual(
    actualFrozenCorruptResult.callback_after.maps[name],
    actualFrozenCorruptResult.callback_before.maps[name],
    `actual frozen corrupt replay changed ${name}`
  );
}
assert.deepEqual(
  actualFrozenCorruptResult.after,
  actualFrozenCorruptResult.callback_after
);
const frozenGrantExhaustionTransactions = runFrozenTransactionProbe(
  "grant disclosures are consumed once per successful new operation and never on replay"
);
const actualFrozenGrantExhaustion =
  frozenGrantExhaustionTransactions.findLast(
    ({ value }) =>
      value?.failures?.includes("grant_disclosures_exhausted")
  );
assert.ok(actualFrozenGrantExhaustion, "actual frozen grant exhaustion missing");
assert.equal(actualFrozenGrantExhaustion.commit, false);
assert.ok(actualFrozenGrantExhaustion.callback_before);
assert.ok(actualFrozenGrantExhaustion.callback_after);
assert.deepEqual(
  actualFrozenGrantExhaustion.after,
  actualFrozenGrantExhaustion.before
);
const idempotencyDatabaseLookupKey = canonicalText([
  authorityNamespaceRaw,
  "idem-1"
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
const originalMutationFacts = {
  authority_namespace:
    originalMutationReceiverAuthenticationRecord.authority_namespace_raw,
  idempotency_key: "idem-1",
  operation_name: intentPutContract.operation,
  operation_fingerprint: `sha-256:${"4".repeat(64)}`,
  principal_id: "principal:alice",
  actor_id: originalMutationReceiverAuthenticationRecord.actor_id,
  runtime_key_id: originalMutationReceiverAuthenticationRecord.runtime_key_id,
  result_ref: structuredClone(rowVector.value.columns.ref),
  kernel_result_hash: canonicalHash(originalMutationKernelSuccess),
  origin_global_commit_sequence: 1,
  origin_scope_sequence: 1,
  created_global_commit_sequence: 1,
  created_scope_sequence: 1
};
const idempotencyOperatorRow = {
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
  created_scope_sequence: originalMutationFacts.created_scope_sequence
};

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
assert.equal(serializedIdempotencyDependency.includes(authorityNamespaceRaw), false);
assert.equal(serializedIdempotencyDependency.includes("idem-1"), false);
assert.equal(
  idempotencyDatabaseLookupKey,
  canonicalText([authorityNamespaceRaw, "idem-1"])
);
const serializedIdempotencyProjection = canonicalText(
  idempotencyIntegrityProjection
);
assert.equal(serializedIdempotencyProjection.includes(authorityNamespaceRaw), false);
assert.equal(serializedIdempotencyProjection.includes("idem-1"), false);
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
  created_scope_sequence: originalMutationFacts.created_scope_sequence
};

function idempotencyOperatorRowIsCoherent(operatorRow, truth) {
  return canonicalText(operatorRow) === canonicalText(truth) &&
    privateScopeCommitMap.get(
      `${operatorRow.principal_id}:${operatorRow.origin_scope_sequence}`
    ) === operatorRow.origin_global_commit_sequence &&
    privateScopeCommitMap.get(
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

const ORIGINAL_ENVELOPE_HASH = `sha-256:${"6".repeat(64)}`;
const ORIGINAL_SNAPSHOT_ID =
  "urn:uuid:00000000-0000-4000-8000-000000000028";
const originalNonceProjection = {
  schema: "cairn.authoritative_row_projection.v0.1",
  table: "used_nonces",
  structural_key: canonicalText(["nonce:original"]),
  columns: {
    nonce: "nonce:original",
    envelope_hash: ORIGINAL_ENVELOPE_HASH,
    operation: intentPutContract.operation,
    owner_kind: "principal",
    owner_id: originalMutationFacts.principal_id,
    owner_scope_sequence: 1
  }
};
validateDefinition("operationalRowProjection", originalNonceProjection);
const originalMutationCommittedProjections = [
  structuredClone(rowVector.value),
  structuredClone(idempotencyIntegrityProjection),
  structuredClone(originalNonceProjection)
];
const originalMutationDependencyManifest = committedDependencyManifest([
  dependencyEntryForProjection(rowVector.value, "write_insert"),
  dependencyEntryForProjection(idempotencyIntegrityProjection, "write_insert"),
  dependencyEntryForProjection(originalNonceProjection, "write_insert"),
  aliasDependencyEntry({
    table: "idempotency_records",
    indexName: "authority_idempotency",
    attemptedKey: canonicalText([
      idempotencyStructuralKeyCommitmentValue
    ]),
    accessKind: "read_absent"
  })
]);
assert.equal(
  dependencyManifestIsCoherent(
    originalMutationDependencyManifest,
    new Map(originalMutationCommittedProjections.map((projection) => [
      canonicalText([projection.table, projection.structural_key]),
      projection
    ]))
  ),
  true
);
const originalMutationScopeCommitment = ownerScopeCommitment({
  ownerKind: "principal",
  ownerId: originalMutationFacts.principal_id,
  scopeSequence: 1,
  projections: originalMutationCommittedProjections
});

function queryCommitmentFor(contract, {
  principalId = null,
  actorId = "agent:anko",
  runtimeKeyId = null,
  hostContextHash = hostContext.context_hash
} = {}) {
  return canonicalHash({
    operation_contract: contract,
    principal_id: principalId,
    actor_id: actorId,
    runtime_key_id: runtimeKeyId,
    body_hash: canonicalHash({}),
    subject_refs: [],
    authorization_refs: [],
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
  dependencySetCommitment = dependencyManifest.dependency_set_commitment,
  scopeStateCommitmentAfter = `sha-256:${String(scopeAfter).repeat(64)}`,
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
      body_hash: canonicalHash({}),
      subject_refs: [],
      authorization_refs: [],
      query_commitment: queryCommitmentFor(contract, {
        principalId,
        actorId,
        runtimeKeyId,
        hostContextHash: hostAuthenticationContext.context_hash
      }),
      host_authentication_context_hash: hostAuthenticationContext.context_hash
    },
    observed_at: NOW,
    transaction: {
      isolation: "serializable",
      snapshot_id: snapshotId,
      scope_sequence_before: scopeBefore,
      scope_sequence_after: scopeAfter,
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
      grant_effects: [],
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
const originalMutationObservation = signedObservation({
  observationId: "urn:uuid:00000000-0000-4000-8000-000000000027",
  snapshotId: ORIGINAL_SNAPSHOT_ID,
  scopeBefore: 0,
  scopeAfter: 1,
  kernel: originalMutationKernelSuccess,
  outcome: "success",
  contract: intentPutContract,
  principalId: originalMutationFacts.principal_id,
  actorId: originalMutationFacts.actor_id,
  runtimeKeyId: originalMutationFacts.runtime_key_id,
  ownerKind: "principal",
  ownerId: originalMutationFacts.principal_id,
  hostAuthenticationContext: originalMutationHostContext,
  returnedRefs: [originalMutationFacts.result_ref],
  envelopeHash: ORIGINAL_ENVELOPE_HASH,
  dependencySetCommitment:
    originalMutationDependencyManifest.dependency_set_commitment,
  scopeStateCommitmentAfter: originalMutationScopeCommitment,
  idempotency: {
    structural_key_commitment: idempotencyStructuralKeyCommitmentValue,
    disposition: "created",
    original_result_hash: null,
    original_observation_ref: null,
    original_scope_sequence: null
  }
});
function uuidForControl(number) {
  return `urn:uuid:00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

function replayCaseArtifacts(caseId, ordinal) {
  const envelopeHash = canonicalHash([
    "cairn-authoritative-replay-control-v0.1",
    caseId
  ]);
  const nonceProjection = {
    schema: "cairn.authoritative_row_projection.v0.1",
    table: "used_nonces",
    structural_key: canonicalText([`nonce:${caseId}`]),
    columns: {
      nonce: `nonce:${caseId}`,
      envelope_hash: envelopeHash,
      operation: intentPutContract.operation,
      owner_kind: "principal",
      owner_id: originalMutationFacts.principal_id,
      owner_scope_sequence: 2
    }
  };
  validateDefinition("operationalRowProjection", nonceProjection);

  let objectProjection = null;
  if (
    caseId !== "missing_result_object" &&
    caseId !== "corrupt_result_binding"
  ) {
    objectProjection = structuredClone(rowVector.value);
    if (caseId === "public_result_acl") {
      objectProjection.columns.visibility = "public";
      objectProjection.columns.principal_id = null;
    } else if (caseId === "foreign_result_acl") {
      objectProjection.columns.principal_id = "principal:mallory";
    }
    validateDefinition("operationalRowProjection", objectProjection);
  }

  const dependencies = [
    dependencyEntryForProjection(
      idempotencyIntegrityProjection,
      "read_present"
    ),
    aliasDependencyEntry({
      table: "idempotency_records",
      indexName: "authority_idempotency",
      attemptedKey: canonicalText([
        idempotencyStructuralKeyCommitmentValue
      ]),
      accessKind: "read_present",
      canonicalRowHash: canonicalHash(idempotencyIntegrityProjection)
    }),
    dependencyEntryForProjection(nonceProjection, "write_insert")
  ];
  const presentRows = new Map([
    [
      canonicalText([
        idempotencyIntegrityProjection.table,
        idempotencyIntegrityProjection.structural_key
      ]),
      idempotencyIntegrityProjection
    ],
    [
      canonicalText([
        nonceProjection.table,
        nonceProjection.structural_key
      ]),
      nonceProjection
    ]
  ]);
  const aliasResolutions = new Map();
  const idempotencyBaseEntryKey = canonicalText([
    idempotencyIntegrityProjection.table,
    idempotencyIntegrityProjection.structural_key
  ]);
  const idempotencyAliasEntry = dependencies[1];
  aliasResolutions.set(
    idempotencyAliasEntry.entry_key,
    idempotencyBaseEntryKey
  );

  const objectAttemptedKey = objectRefStructuralKey(
    originalMutationFacts.result_ref
  );
  if (!objectProjection) {
    dependencies.push(aliasDependencyEntry({
      table: "objects",
      indexName: "primary_ref",
      attemptedKey: objectAttemptedKey,
      accessKind: "read_absent"
    }));
  } else {
    const objectBaseEntry = dependencyEntryForProjection(
      objectProjection,
      "read_present"
    );
    dependencies.push(objectBaseEntry);
    presentRows.set(objectBaseEntry.entry_key, objectProjection);
    const primaryAliasEntry = aliasDependencyEntry({
      table: "objects",
      indexName: "primary_ref",
      attemptedKey: objectAttemptedKey,
      accessKind: "read_present",
      canonicalRowHash: canonicalHash(objectProjection)
    });
    dependencies.push(primaryAliasEntry);
    aliasResolutions.set(primaryAliasEntry.entry_key, objectBaseEntry.entry_key);
    const accessAliasEntry = aliasDependencyEntry({
      table: "objects",
      indexName: "access_by_ref",
      attemptedKey: objectAttemptedKey,
      accessKind: caseId === "missing_result_acl"
        ? "read_absent"
        : "read_present",
      canonicalRowHash: caseId === "missing_result_acl"
        ? null
        : canonicalHash(objectProjection)
    });
    dependencies.push(accessAliasEntry);
    if (caseId !== "missing_result_acl") {
      aliasResolutions.set(
        accessAliasEntry.entry_key,
        objectBaseEntry.entry_key
      );
    }
  }

  const transactionDependencyManifest =
    committedDependencyManifest(dependencies);
  assert.equal(
    dependencyManifestIsCoherent(
      transactionDependencyManifest,
      presentRows,
      aliasResolutions
    ),
    true,
    `incoherent replay dependency truth: ${caseId}`
  );
  const transactionProjections = [
    structuredClone(idempotencyIntegrityProjection),
    structuredClone(nonceProjection),
    ...(objectProjection ? [structuredClone(objectProjection)] : [])
  ];
  const scopeStateCommitmentAfter = ownerScopeCommitment({
    ownerKind: "principal",
    ownerId: originalMutationFacts.principal_id,
    scopeSequence: 2,
    projections: transactionProjections
  });
  const observation = signedObservation({
    observationId: uuidForControl(ordinal),
    snapshotId: uuidForControl(ordinal + 1),
    scopeBefore: 1,
    scopeAfter: 2,
    kernel: kernelAcceptedFailure,
    outcome: "accepted_failure",
    contract: intentPutContract,
    principalId: originalMutationFacts.principal_id,
    actorId: originalMutationFacts.actor_id,
    runtimeKeyId: originalMutationFacts.runtime_key_id,
    ownerKind: "principal",
    ownerId: originalMutationFacts.principal_id,
    nonceDisposition: "replay_fresh_nonce",
    hostAuthenticationContext: originalMutationHostContext,
    envelopeHash,
    messageId: uuidForControl(ordinal + 2),
    dependencySetCommitment:
      transactionDependencyManifest.dependency_set_commitment,
    scopeStateCommitmentAfter,
    idempotency: {
      structural_key_commitment: idempotencyStructuralKeyCommitmentValue,
      disposition: "replayed",
      original_result_hash: idempotencyOperatorRow.kernel_result_hash,
      original_observation_ref: {
        artifact_schema: "cairn.service_observation.v0.1",
        artifact_id: originalMutationObservation.observation_id,
        artifact_hash: originalMutationObservation.observation_hash
      },
      original_scope_sequence: 1
    }
  });
  validateDefinition("serviceObservation", observation);
  return {
    observation,
    transactionDependencyManifest,
    transactionProjections,
    nonceProjection
  };
}

const replayControlArtifacts = new Map([
  ["missing_result_object", replayCaseArtifacts("missing_result_object", 31)],
  ["missing_result_acl", replayCaseArtifacts("missing_result_acl", 41)],
  ["public_result_acl", replayCaseArtifacts("public_result_acl", 51)],
  ["foreign_result_acl", replayCaseArtifacts("foreign_result_acl", 61)],
  ["corrupt_result_binding", replayCaseArtifacts("corrupt_result_binding", 71)]
]);
const replayAcceptedFailureObservation =
  replayControlArtifacts.get("missing_result_acl").observation;
validateDefinition("serviceObservation", successObservation);
validateDefinition("serviceObservation", acceptedFailureObservation);
validateDefinition("serviceObservation", originalMutationObservation);
validateDefinition("serviceObservation", replayAcceptedFailureObservation);
for (const signed of [
  successObservation,
  acceptedFailureObservation,
  originalMutationObservation,
  replayAcceptedFailureObservation
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
  originalMutationHostContext.context_hash
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

const wrapperIntegrityFailure = {
  status: 503,
  code: "idempotency_integrity_invalid",
  failures: ["idempotency_integrity_invalid"],
  stage: "preflight"
};

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

function runWrapperStoreHarness({
  initialState,
  preflight,
  frozenCallback,
  observation = null,
  transactionDependencyManifest = null,
  transactionProjections = [],
  preflightFailure = wrapperIntegrityFailure,
  wrapperFailure = null,
  caseId = "unspecified"
}) {
  const state = structuredClone(initialState);
  const before = canonicalText(state);
  const beforeHash = canonicalHash(state);
  let callbackCalls = 0;
  let callbackResult = null;
  let result;

  if (!preflight(state.authoritative)) {
    result = {
      schema: "cairn.local_observed_result.v0.1",
      disposition: "rolled_back_failure",
      kernel: null,
      wrapper_failure: preflightFailure,
      service_observation: null
    };
  } else {
    const kernelDraft = structuredClone(state.kernel);
    assert.equal("idempotency_row" in kernelDraft, false);
    assert.equal("operational_versions" in kernelDraft, false);
    assert.deepEqual(
      Object.keys(kernelDraft.idempotency_records[0]).sort(),
      ["fingerprint", "result_ref"]
    );
    callbackCalls += 1;
    callbackResult = frozenCallback(kernelDraft);
    assert.equal(typeof callbackResult.commit, "boolean");
    if (!callbackResult.commit) {
      result = {
        schema: "cairn.local_observed_result.v0.1",
        disposition: "rolled_back_failure",
        kernel: callbackResult.value,
        wrapper_failure: null,
        service_observation: null
      };
    } else if (wrapperFailure) {
      result = {
        schema: "cairn.local_observed_result.v0.1",
        disposition: "rolled_back_failure",
        kernel: callbackResult.value,
        wrapper_failure: wrapperFailure,
        service_observation: null
      };
    } else {
      assert.ok(observation);
      assert.ok(transactionDependencyManifest);
      assert.equal(
        validateDependencyManifestSchema(transactionDependencyManifest),
        true,
        `invalid transaction dependency manifest: ${caseId}`
      );
      assert.equal(
        observation.transaction.dependency_set_commitment,
        transactionDependencyManifest.dependency_set_commitment
      );
      assert.equal(
        observation.transaction.scope_state_commitment_after,
        ownerScopeCommitment({
          ownerKind: observation.access.owner_kind,
          ownerId: observation.access.owner_id,
          scopeSequence:
            observation.transaction.scope_sequence_after,
          projections: transactionProjections
        })
      );
      const authoritativeDraft = structuredClone(state.authoritative);
      kernelDraft.idempotency_records = [{
        fingerprint:
          authoritativeDraft.idempotency_row.operation_fingerprint,
        result_ref: structuredClone(
          authoritativeDraft.idempotency_row.result_ref
        )
      }];
      authoritativeDraft.global_sequence += 1;
      authoritativeDraft.scope_sequence += 1;
      const globalSequence = authoritativeDraft.global_sequence;
      const scopeSequence = authoritativeDraft.scope_sequence;
      assert.equal(
        observation.transaction.scope_sequence_before,
        scopeSequence - 1
      );
      assert.equal(
        observation.transaction.scope_sequence_after,
        scopeSequence
      );
      const newlyVersionedRows = transactionProjections.filter(
        (projection) =>
          projection.table === "used_nonces" &&
          projection.columns.nonce === kernelDraft.used_nonces.at(-1)
      );
      assert.equal(
        newlyVersionedRows.length,
        1,
        `accepted transaction must version its exact fresh nonce: ${caseId}`
      );
      authoritativeDraft.operational_versions.push(
        operationalVersionFor(newlyVersionedRows[0], globalSequence)
      );
      authoritativeDraft.dependency_rows.push(
        ...transactionDependencyManifest.entries.map((entry) => ({
          global_sequence: globalSequence,
          ...structuredClone(entry)
        }))
      );
      authoritativeDraft.dependency_set_commitment =
        transactionDependencyManifest.dependency_set_commitment;
      authoritativeDraft.dependency_commits.push({
        global_sequence: globalSequence,
        dependency_set_commitment:
          transactionDependencyManifest.dependency_set_commitment
      });
      const observationRefKey = observationRefKeyFor(observation);
      authoritativeDraft.service_commits.push({
        global_sequence: globalSequence,
        previous_global_sequence: globalSequence - 1,
        transaction_kind: "replay",
        committed_at: observation.observed_at,
        observation_ref_key: observationRefKey
      });
      authoritativeDraft.scope_commits.push({
        owner_kind: observation.access.owner_kind,
        owner_id: observation.access.owner_id,
        scope_sequence: scopeSequence,
        previous_scope_sequence: scopeSequence - 1,
        global_sequence: globalSequence,
        scope_state_commitment_after:
          observation.transaction.scope_state_commitment_after,
        dependency_set_commitment:
          authoritativeDraft.dependency_set_commitment,
        snapshot_id: observation.transaction.snapshot_id,
        observation_ref_key: observationRefKey
      });
      authoritativeDraft.observation_repository.push({
        observation_ref_key: observationRefKey,
        observation_id: observation.observation_id,
        observation_hash: observation.observation_hash,
        request_envelope_hash: observation.request.envelope_hash,
        canonical_observation_bytes: canonicalText(observation),
        principal_id: observation.request.principal_id,
        owner_kind: observation.access.owner_kind,
        owner_id: observation.access.owner_id,
        visibility: observation.access.visibility,
        global_commit_sequence: globalSequence,
        scope_sequence: scopeSequence
      });
      authoritativeDraft.observation_by_envelope[
        observation.request.envelope_hash
      ] = observation.observation_id;
      authoritativeDraft.counters.signer_calls += 1;
      authoritativeDraft.counters.persistence_calls += 1;
      authoritativeDraft.counters.commit_calls += 1;
      state.kernel = structuredClone(kernelDraft);
      state.authoritative = authoritativeDraft;
      result = {
        schema: "cairn.local_observed_result.v0.1",
        disposition: callbackResult.value.ok
          ? "committed_success"
          : "committed_accepted_failure",
        kernel: callbackResult.value,
        wrapper_failure: null,
        service_observation: observation
      };
    }
  }

  validateDefinition("localObservedResult", result);
  assert.equal(localResultIsCoherent(result), true);
  return {
    caseId,
    result,
    callbackCalls,
    callbackCommit: callbackResult?.commit ?? null,
    before,
    after: canonicalText(state),
    beforeHash,
    afterHash: canonicalHash(state),
    state
  };
}

const ORIGINAL_OBSERVATION_REF_KEY =
  observationRefKeyFor(originalMutationObservation);
const GENESIS_SNAPSHOT_ID =
  "urn:uuid:00000000-0000-4000-8000-000000000029";
const genesisScopeCommitment = ownerScopeCommitment({
  ownerKind: "principal",
  ownerId: originalMutationFacts.principal_id,
  scopeSequence: 0,
  projections: []
});
const wrapperHarnessBaseState = {
  kernel: {
    objects: [{
      ref: structuredClone(idempotencyIntegrityTruth.result_ref),
      object_hash: idempotencyIntegrityTruth.result_ref.object_hash
    }],
    access_rows: [{
      ref: structuredClone(idempotencyIntegrityTruth.result_ref),
      visibility: "private",
      principal_id: idempotencyIntegrityTruth.principal_id
    }],
    runtime_bindings: [],
    data_grants: [],
    grant_states: [{ grant: "grant:fixture", remaining_disclosures: 7 }],
    effect_descriptors: [],
    validation_keys: [structuredClone(fixtureKeyRecord)],
    used_nonces: ["nonce:original"],
    idempotency_records: [structuredClone(frozenIdempotencyView)]
  },
  authoritative: {
    global_sequence: 1,
    scope_sequence: 1,
    idempotency_row: structuredClone(idempotencyOperatorRow),
    idempotency_projection: structuredClone(idempotencyIntegrityProjection),
    idempotency_row_hash: canonicalHash(idempotencyIntegrityProjection),
    operational_versions: originalMutationCommittedProjections.map(
      (projection) => operationalVersionFor(projection, 1)
    ),
    dependency_rows: originalMutationDependencyManifest.entries.map(
      (entry) => ({
        global_sequence: 1,
        ...structuredClone(entry)
      })
    ),
    dependency_set_commitment:
      originalMutationDependencyManifest.dependency_set_commitment,
    dependency_commits: [
      {
        global_sequence: 0,
        dependency_set_commitment: ZERO_HASH
      },
      {
        global_sequence: 1,
        dependency_set_commitment:
          originalMutationDependencyManifest.dependency_set_commitment
      }
    ],
    service_commits: [
      {
        global_sequence: 0,
        previous_global_sequence: null,
        transaction_kind: "genesis",
        committed_at: NOW,
        observation_ref_key: null
      },
      {
        global_sequence: 1,
        previous_global_sequence: 0,
        transaction_kind: "service_operation",
        committed_at: originalMutationObservation.observed_at,
        observation_ref_key: ORIGINAL_OBSERVATION_REF_KEY
      }
    ],
    scope_commits: [
      {
        owner_kind: "principal",
        owner_id: idempotencyIntegrityTruth.principal_id,
        scope_sequence: 0,
        previous_scope_sequence: null,
        global_sequence: 0,
        scope_state_commitment_after: genesisScopeCommitment,
        dependency_set_commitment: ZERO_HASH,
        snapshot_id: GENESIS_SNAPSHOT_ID,
        observation_ref_key: null
      },
      {
        owner_kind: "principal",
        owner_id: idempotencyIntegrityTruth.principal_id,
        scope_sequence: 1,
        previous_scope_sequence: 0,
        global_sequence: 1,
        scope_state_commitment_after: originalMutationScopeCommitment,
        dependency_set_commitment:
          originalMutationDependencyManifest.dependency_set_commitment,
        snapshot_id: ORIGINAL_SNAPSHOT_ID,
        observation_ref_key: ORIGINAL_OBSERVATION_REF_KEY
      }
    ],
    observation_repository: [{
      observation_ref_key: ORIGINAL_OBSERVATION_REF_KEY,
      observation_id: originalMutationObservation.observation_id,
      observation_hash: originalMutationObservation.observation_hash,
      request_envelope_hash:
        originalMutationObservation.request.envelope_hash,
      canonical_observation_bytes:
        canonicalText(originalMutationObservation),
      principal_id: originalMutationObservation.request.principal_id,
      owner_kind: "principal",
      owner_id: idempotencyIntegrityTruth.principal_id,
      visibility: "private",
      global_commit_sequence: 1,
      scope_sequence: 1
    }],
    observation_by_envelope: {
      [originalMutationObservation.request.envelope_hash]:
        originalMutationObservation.observation_id
    },
    counters: {
      result_construction_calls: 1,
      work_calls: 1,
      charge_calls: 1,
      signer_calls: 1,
      persistence_calls: 1,
      commit_calls: 1
    }
  }
};
function coherentRichHistory(authoritative) {
  const row = authoritative.idempotency_row;
  const originServiceCommit = authoritative.service_commits.find(
    ({ global_sequence }) =>
      global_sequence === row.origin_global_commit_sequence
  );
  const originScopeCommit = authoritative.scope_commits.find(
    ({ scope_sequence }) =>
      scope_sequence === row.origin_scope_sequence
  );
  const originObservation = authoritative.observation_repository.find(
    ({ observation_ref_key }) =>
      observation_ref_key === originServiceCommit?.observation_ref_key
  );
  const originDependencyRows = authoritative.dependency_rows
    .filter(({ global_sequence }) =>
      global_sequence === row.origin_global_commit_sequence
    )
    .map(({ global_sequence: _globalSequence, ...entry }) => entry);
  const reconstructedDependencyManifest =
    committedDependencyManifest(originDependencyRows);
  const originDependencyCommit = authoritative.dependency_commits.find(
    ({ global_sequence }) =>
      global_sequence === row.origin_global_commit_sequence
  );
  const versionsAreExact = originalMutationCommittedProjections.every(
    (projection) => {
      const expectedVersion = operationalVersionFor(
        projection,
        row.origin_global_commit_sequence
      );
      return authoritative.operational_versions.some(
        (version) =>
          canonicalText(version) === canonicalText(expectedVersion)
      );
    }
  );
  const serviceChainIsComplete =
    authoritative.service_commits.length >= 2 &&
    authoritative.service_commits[0].global_sequence === 0 &&
    authoritative.service_commits[0].previous_global_sequence === null &&
    authoritative.service_commits.every((commit, index) =>
      index === 0 ||
      commit.previous_global_sequence ===
        authoritative.service_commits[index - 1].global_sequence
    );
  const scopeChainIsComplete =
    authoritative.scope_commits.length >= 2 &&
    authoritative.scope_commits[0].scope_sequence === 0 &&
    authoritative.scope_commits[0].previous_scope_sequence === null &&
    authoritative.scope_commits.every((commit, index) =>
      index === 0 ||
      commit.previous_scope_sequence ===
        authoritative.scope_commits[index - 1].scope_sequence
    );
  return idempotencyOperatorRowIsCoherent(row, idempotencyIntegrityTruth) &&
    canonicalText(authoritative.idempotency_projection) ===
      canonicalText(idempotencyIntegrityProjection) &&
    authoritative.idempotency_row_hash ===
      canonicalHash(authoritative.idempotency_projection) &&
    versionsAreExact &&
    serviceChainIsComplete &&
    scopeChainIsComplete &&
    reconstructedDependencyManifest.dependency_set_commitment ===
      originalMutationDependencyManifest.dependency_set_commitment &&
    originDependencyCommit?.dependency_set_commitment ===
      reconstructedDependencyManifest.dependency_set_commitment &&
    originScopeCommit?.global_sequence ===
      row.origin_global_commit_sequence &&
    originScopeCommit?.scope_state_commitment_after ===
      originalMutationObservation.transaction.scope_state_commitment_after &&
    originScopeCommit?.dependency_set_commitment ===
      originalMutationObservation.transaction.dependency_set_commitment &&
    originScopeCommit?.snapshot_id ===
      originalMutationObservation.transaction.snapshot_id &&
    originScopeCommit?.observation_ref_key ===
      ORIGINAL_OBSERVATION_REF_KEY &&
    originServiceCommit?.observation_ref_key ===
      ORIGINAL_OBSERVATION_REF_KEY &&
    originObservation?.observation_hash ===
      originalMutationObservation.observation_hash &&
    originObservation?.canonical_observation_bytes ===
      canonicalText(originalMutationObservation) &&
    originObservation?.request_envelope_hash ===
      originalMutationObservation.request.envelope_hash &&
    originObservation?.global_commit_sequence ===
      row.origin_global_commit_sequence &&
    originObservation?.scope_sequence === row.origin_scope_sequence &&
    authoritative.observation_by_envelope[
      originalMutationObservation.request.envelope_hash
    ] === originalMutationObservation.observation_id &&
    authoritative.global_sequence ===
      authoritative.service_commits.at(-1).global_sequence &&
    authoritative.scope_sequence ===
      authoritative.scope_commits.at(-1).scope_sequence;
}

function acceptedCommitHistoryIsCoherent(
  authoritative,
  observation,
  transactionDependencyManifest,
  transactionProjections
) {
  const globalSequence = observation.transaction.scope_sequence_after;
  const scopeSequence = observation.transaction.scope_sequence_after;
  const observationRefKey = observationRefKeyFor(observation);
  const serviceCommit = authoritative.service_commits.at(-1);
  const scopeCommit = authoritative.scope_commits.at(-1);
  const observationRow = authoritative.observation_repository.at(-1);
  const dependencyRows = authoritative.dependency_rows
    .filter((row) => row.global_sequence === globalSequence)
    .map(({ global_sequence: _globalSequence, ...entry }) => entry);
  const reconstructedManifest = committedDependencyManifest(dependencyRows);
  const dependencyCommit = authoritative.dependency_commits.at(-1);
  const freshNonceProjection = transactionProjections.find(
    (projection) =>
      projection.table === "used_nonces" &&
      projection.columns.owner_scope_sequence === scopeSequence
  );
  const freshNonceVersion = authoritative.operational_versions.at(-1);
  return globalSequence === authoritative.global_sequence &&
    scopeSequence === authoritative.scope_sequence &&
    canonicalText(reconstructedManifest) ===
      canonicalText(transactionDependencyManifest) &&
    dependencyCommit.global_sequence === globalSequence &&
    dependencyCommit.dependency_set_commitment ===
      observation.transaction.dependency_set_commitment &&
    serviceCommit.global_sequence === globalSequence &&
    serviceCommit.previous_global_sequence === globalSequence - 1 &&
    serviceCommit.transaction_kind === "replay" &&
    serviceCommit.observation_ref_key === observationRefKey &&
    scopeCommit.scope_sequence === scopeSequence &&
    scopeCommit.previous_scope_sequence === scopeSequence - 1 &&
    scopeCommit.global_sequence === globalSequence &&
    scopeCommit.scope_state_commitment_after ===
      observation.transaction.scope_state_commitment_after &&
    scopeCommit.dependency_set_commitment ===
      observation.transaction.dependency_set_commitment &&
    scopeCommit.snapshot_id === observation.transaction.snapshot_id &&
    scopeCommit.observation_ref_key === observationRefKey &&
    observationRow.observation_ref_key === observationRefKey &&
    observationRow.observation_hash === observation.observation_hash &&
    observationRow.request_envelope_hash ===
      observation.request.envelope_hash &&
    observationRow.canonical_observation_bytes === canonicalText(observation) &&
    observationRow.visibility === "private" &&
    observationRow.global_commit_sequence === globalSequence &&
    observationRow.scope_sequence === scopeSequence &&
    authoritative.observation_by_envelope[
      observation.request.envelope_hash
    ] === observation.observation_id &&
    Boolean(freshNonceProjection) &&
    canonicalText(freshNonceVersion) === canonicalText(
      operationalVersionFor(freshNonceProjection, globalSequence)
    );
}

function rebindRichCandidateState(state, candidateRow) {
  const candidateProjection = projectIdempotencyOwnerRow(candidateRow);
  validateDefinition("operationalRowProjection", candidateProjection);
  state.authoritative.idempotency_row = structuredClone(candidateRow);
  state.authoritative.idempotency_projection =
    structuredClone(candidateProjection);
  state.authoritative.idempotency_row_hash =
    canonicalHash(candidateProjection);
  const versionIndex = state.authoritative.operational_versions.findIndex(
    (version) =>
      version.table === "idempotency_records" &&
      version.valid_from_global_sequence === 1
  );
  state.authoritative.operational_versions[versionIndex] =
    operationalVersionFor(candidateProjection, 1);

  const retainedOriginDependencies = state.authoritative.dependency_rows
    .filter((row) =>
      row.global_sequence === 1 &&
      row.table_name !== "idempotency_records"
    )
    .map(({ global_sequence: _globalSequence, ...entry }) => entry);
  const candidateDependencies = committedDependencyManifest([
    ...retainedOriginDependencies,
    dependencyEntryForProjection(candidateProjection, "write_insert"),
    aliasDependencyEntry({
      table: "idempotency_records",
      indexName: "authority_idempotency",
      attemptedKey: canonicalText([
        candidateProjection.columns.structural_key_commitment
      ]),
      accessKind: "read_absent"
    })
  ]);
  state.authoritative.dependency_rows = [
    ...state.authoritative.dependency_rows.filter(
      (row) => row.global_sequence !== 1
    ),
    ...candidateDependencies.entries.map((entry) => ({
      global_sequence: 1,
      ...entry
    }))
  ];
  state.authoritative.dependency_set_commitment =
    candidateDependencies.dependency_set_commitment;
  state.authoritative.dependency_commits.find(
    (commit) => commit.global_sequence === 1
  ).dependency_set_commitment =
    candidateDependencies.dependency_set_commitment;
  const originScopeCommit = state.authoritative.scope_commits.find(
    (commit) => commit.scope_sequence === 1
  );
  originScopeCommit.dependency_set_commitment =
    candidateDependencies.dependency_set_commitment;
  originScopeCommit.scope_state_commitment_after = ownerScopeCommitment({
    ownerKind: "principal",
    ownerId: originalMutationFacts.principal_id,
    scopeSequence: 1,
    projections: [
      rowVector.value,
      candidateProjection,
      originalNonceProjection
    ]
  });
}

function assertPreflightVeto(initialState, caseId) {
  const run = runWrapperStoreHarness({
    initialState,
    preflight: coherentRichHistory,
    frozenCallback: () => {
      throw new Error(`${caseId} invoked frozen callback`);
    },
    caseId
  });
  assert.equal(run.callbackCalls, 0, caseId);
  assert.equal(run.callbackCommit, null, caseId);
  assert.equal(run.before, run.after, caseId);
  assert.equal(run.beforeHash, run.afterHash, caseId);
  assert.equal(run.result.kernel, null, caseId);
  assert.equal(run.result.wrapper_failure.stage, "preflight", caseId);
  assert.equal(run.result.service_observation, null, caseId);
}

for (const [field, value] of idempotencyOperatorRowMutations) {
  const candidateState = structuredClone(wrapperHarnessBaseState);
  const candidateRow = structuredClone(idempotencyOperatorRow);
  candidateRow[field] = structuredClone(value);
  rebindRichCandidateState(candidateState, candidateRow);
  assertPreflightVeto(candidateState, `rich_row_${field}`);
}

const richHistoryMutationControls = [
  ["projection_hash", (state) => {
    state.authoritative.idempotency_row_hash = `sha-256:${"a".repeat(64)}`;
  }],
  ["version_bytes", (state) => {
    state.authoritative.operational_versions.find(
      (version) => version.table === "idempotency_records"
    ).canonical_row_bytes = canonicalText({ changed: true });
  }],
  ["version_hash", (state) => {
    state.authoritative.operational_versions.find(
      (version) => version.table === "idempotency_records"
    ).canonical_row_hash = `sha-256:${"b".repeat(64)}`;
  }],
  ["version_sequence", (state) => {
    state.authoritative.operational_versions.find(
      (version) => version.table === "idempotency_records"
    ).valid_from_global_sequence = 2;
  }],
  ["dependency_commitment", (state) => {
    state.authoritative.dependency_commits.find(
      (commit) => commit.global_sequence === 1
    ).dependency_set_commitment = `sha-256:${"c".repeat(64)}`;
  }],
  ["origin_observation_bytes", (state) => {
    state.authoritative.observation_repository[0]
      .canonical_observation_bytes = canonicalText({ changed: true });
  }],
  ["origin_observation_hash", (state) => {
    state.authoritative.observation_repository[0].observation_hash =
      `sha-256:${"d".repeat(64)}`;
  }],
  ["scope_global_mapping", (state) => {
    state.authoritative.scope_commits.find(
      (commit) => commit.scope_sequence === 1
    ).global_sequence = 2;
  }],
  ["scope_root", (state) => {
    state.authoritative.scope_commits.find(
      (commit) => commit.scope_sequence === 1
    ).scope_state_commitment_after = `sha-256:${"e".repeat(64)}`;
  }],
  ["service_commit_ancestry", (state) => {
    state.authoritative.service_commits.find(
      (commit) => commit.global_sequence === 1
    ).previous_global_sequence = 1;
  }],
  ["scope_commit_ancestry", (state) => {
    state.authoritative.scope_commits.find(
      (commit) => commit.scope_sequence === 1
    ).previous_scope_sequence = 1;
  }],
  ["observation_envelope_index", (state) => {
    state.authoritative.observation_by_envelope[
      originalMutationObservation.request.envelope_hash
    ] = uuidForControl(999);
  }]
];
for (const [caseId, mutate] of richHistoryMutationControls) {
  const candidateState = structuredClone(wrapperHarnessBaseState);
  mutate(candidateState);
  assertPreflightVeto(candidateState, `rich_history_${caseId}`);
}

const fingerprintConflictRun = runWrapperStoreHarness({
  initialState: wrapperHarnessBaseState,
  preflight: coherentRichHistory,
  frozenCallback: () => ({
    commit: actualFrozenConflict.commit,
    value: structuredClone(actualFrozenConflict.value)
  }),
  caseId: "actual_frozen_fingerprint_conflict"
});
assert.equal(fingerprintConflictRun.callbackCalls, 1);
assert.equal(fingerprintConflictRun.callbackCommit, false);
assert.equal(fingerprintConflictRun.before, fingerprintConflictRun.after);
assert.equal(fingerprintConflictRun.result.wrapper_failure, null);
assert.equal(fingerprintConflictRun.result.service_observation, null);

const grantExhaustionRun = runWrapperStoreHarness({
  initialState: wrapperHarnessBaseState,
  preflight: coherentRichHistory,
  frozenCallback: () => ({
    commit: actualFrozenGrantExhaustion.commit,
    value: structuredClone(actualFrozenGrantExhaustion.value)
  }),
  caseId: "actual_frozen_grant_exhaustion"
});
assert.equal(grantExhaustionRun.callbackCalls, 1);
assert.equal(grantExhaustionRun.callbackCommit, false);
assert.equal(grantExhaustionRun.before, grantExhaustionRun.after);
assert.deepEqual(
  grantExhaustionRun.result.kernel,
  actualFrozenGrantExhaustion.value
);
assert.equal(grantExhaustionRun.result.wrapper_failure, null);
assert.equal(grantExhaustionRun.result.service_observation, null);

const retryExhaustionFailure = {
  status: 503,
  code: "retry_exhausted",
  failures: ["retry_exhausted"],
  stage: "retry"
};
const retryExhaustionRun = runWrapperStoreHarness({
  initialState: wrapperHarnessBaseState,
  preflight: () => false,
  preflightFailure: retryExhaustionFailure,
  frozenCallback: () => {
    throw new Error("retry exhaustion invoked frozen callback");
  },
  caseId: "retry_exhaustion"
});
assert.equal(retryExhaustionRun.callbackCalls, 0);
assert.equal(retryExhaustionRun.before, retryExhaustionRun.after);
assert.equal(retryExhaustionRun.result.kernel, null);
assert.deepEqual(
  retryExhaustionRun.result.wrapper_failure,
  retryExhaustionFailure
);

const postCallbackFailureRuns = new Map();
for (const stage of ["observation", "persistence", "commit"]) {
  const wrapperFailure = {
    status: 503,
    code: `${stage}_failed`,
    failures: [`${stage}_failed`],
    stage
  };
  const failureRun = runWrapperStoreHarness({
    initialState: wrapperHarnessBaseState,
    preflight: coherentRichHistory,
    frozenCallback: (kernelDraft) => {
      kernelDraft.used_nonces.push(
        replayControlArtifacts.get("missing_result_acl")
          .nonceProjection.columns.nonce
      );
      return {
        commit: actualFrozenCorruptResult.commit,
        value: structuredClone(actualFrozenCorruptResult.value)
      };
    },
    wrapperFailure,
    caseId: `${stage}_rollback`
  });
  assert.equal(failureRun.callbackCalls, 1, stage);
  assert.equal(failureRun.callbackCommit, true, stage);
  assert.equal(failureRun.before, failureRun.after, stage);
  assert.equal(failureRun.beforeHash, failureRun.afterHash, stage);
  assert.deepEqual(failureRun.result.kernel, actualFrozenCorruptResult.value);
  assert.deepEqual(failureRun.result.wrapper_failure, wrapperFailure);
  assert.equal(failureRun.result.service_observation, null);
  postCallbackFailureRuns.set(stage, failureRun);
}

const replayFaultCases = [
  ["missing_result_object", (state) => {
    state.kernel.objects = [];
  }],
  ["corrupt_result_binding", (state) => {
    state.kernel.objects[0].object_hash = `sha-256:${"f".repeat(64)}`;
  }],
  ["missing_result_acl", (state) => {
    state.kernel.access_rows = [];
  }],
  ["public_result_acl", (state) => {
    state.kernel.access_rows[0].visibility = "public";
  }],
  ["foreign_result_acl", (state) => {
    state.kernel.access_rows[0].principal_id = "principal:mallory";
  }]
];
for (const [caseId, injectFault] of replayFaultCases) {
  const replayControl = replayControlArtifacts.get(caseId);
  assert.ok(replayControl);
  const faultedState = structuredClone(wrapperHarnessBaseState);
  injectFault(faultedState);
  const baseline = structuredClone(faultedState);
  const acceptedFailureRun = runWrapperStoreHarness({
    initialState: faultedState,
    preflight: coherentRichHistory,
    frozenCallback: (kernelDraft) => {
      assert.equal("idempotency_row" in kernelDraft, false);
      kernelDraft.used_nonces.push(
        replayControl.nonceProjection.columns.nonce
      );
      return {
        commit: actualFrozenCorruptResult.commit,
        value: structuredClone(actualFrozenCorruptResult.value)
      };
    },
    observation: replayControl.observation,
    transactionDependencyManifest:
      replayControl.transactionDependencyManifest,
    transactionProjections: replayControl.transactionProjections,
    caseId
  });
  assert.equal(acceptedFailureRun.callbackCalls, 1);
  assert.equal(acceptedFailureRun.callbackCommit, true);
  assert.equal(
    canonicalText(acceptedFailureRun.result.kernel),
    canonicalText(actualFrozenCorruptResult.value)
  );
  assert.equal(
    acceptedFailureRun.result.disposition,
    "committed_accepted_failure"
  );
  assert.deepEqual(
    acceptedFailureRun.state.kernel.used_nonces,
    [
      ...baseline.kernel.used_nonces,
      replayControl.nonceProjection.columns.nonce
    ]
  );
  for (const key of [
    "objects",
    "access_rows",
    "runtime_bindings",
    "data_grants",
    "grant_states",
    "effect_descriptors",
    "validation_keys"
  ]) {
    assert.deepEqual(
      acceptedFailureRun.state.kernel[key],
      baseline.kernel[key],
      `${caseId} changed kernel ${key}`
    );
  }
  assert.deepEqual(
    acceptedFailureRun.state.authoritative.idempotency_row,
    baseline.authoritative.idempotency_row
  );
  assert.deepEqual(
    acceptedFailureRun.state.authoritative.idempotency_projection,
    baseline.authoritative.idempotency_projection
  );
  assert.equal(
    acceptedFailureRun.state.authoritative.global_sequence,
    baseline.authoritative.global_sequence + 1
  );
  assert.equal(
    acceptedFailureRun.state.authoritative.scope_sequence,
    baseline.authoritative.scope_sequence + 1
  );
  assert.equal(
    acceptedFailureRun.state.authoritative.service_commits.length,
    baseline.authoritative.service_commits.length + 1
  );
  assert.equal(
    acceptedFailureRun.state.authoritative.scope_commits.length,
    baseline.authoritative.scope_commits.length + 1
  );
  assert.equal(
    acceptedFailureRun.state.authoritative.observation_repository.length,
    baseline.authoritative.observation_repository.length + 1
  );
  assert.equal(
    acceptedFailureRun.state.authoritative.operational_versions.length,
    baseline.authoritative.operational_versions.length + 1
  );
  assert.equal(
    acceptedFailureRun.state.authoritative.dependency_rows.length,
    baseline.authoritative.dependency_rows.length +
      replayControl.transactionDependencyManifest.entries.length
  );
  assert.equal(
    acceptedFailureRun.state.authoritative.dependency_commits.length,
    baseline.authoritative.dependency_commits.length + 1
  );
  for (const counter of [
    "result_construction_calls",
    "work_calls",
    "charge_calls"
  ]) {
    assert.equal(
      acceptedFailureRun.state.authoritative.counters[counter],
      baseline.authoritative.counters[counter],
      `${caseId} changed ${counter}`
    );
  }
  for (const counter of [
    "signer_calls",
    "persistence_calls",
    "commit_calls"
  ]) {
    assert.equal(
      acceptedFailureRun.state.authoritative.counters[counter],
      baseline.authoritative.counters[counter] + 1,
      `${caseId} did not stage ${counter}`
    );
  }
  assert.equal(
    acceptedFailureRun.result.service_observation.result.nonce_disposition,
    "replay_fresh_nonce"
  );
  assert.equal(
    acceptedFailureRun.result.service_observation.result.idempotency.disposition,
    "replayed"
  );
  assert.equal(
    acceptedCommitHistoryIsCoherent(
      acceptedFailureRun.state.authoritative,
      replayControl.observation,
      replayControl.transactionDependencyManifest,
      replayControl.transactionProjections
    ),
    true,
    `${caseId} committed an incoherent replay history`
  );
}

const projectionMutationReplay =
  replayControlArtifacts.get("missing_result_acl");
for (const [stage, failureRun] of postCallbackFailureRuns) {
  const recoveredRun = runWrapperStoreHarness({
    initialState: failureRun.state,
    preflight: coherentRichHistory,
    frozenCallback: (kernelDraft) => {
      kernelDraft.used_nonces.push(
        projectionMutationReplay.nonceProjection.columns.nonce
      );
      return {
        commit: actualFrozenCorruptResult.commit,
        value: structuredClone(actualFrozenCorruptResult.value)
      };
    },
    observation: projectionMutationReplay.observation,
    transactionDependencyManifest:
      projectionMutationReplay.transactionDependencyManifest,
    transactionProjections:
      projectionMutationReplay.transactionProjections,
    caseId: `${stage}_sequence_reuse`
  });
  assert.equal(
    recoveredRun.state.authoritative.global_sequence,
    wrapperHarnessBaseState.authoritative.global_sequence + 1,
    `${stage} rollback left a hidden global-sequence gap`
  );
  assert.equal(
    recoveredRun.state.authoritative.scope_sequence,
    wrapperHarnessBaseState.authoritative.scope_sequence + 1,
    `${stage} rollback left a hidden owner-sequence gap`
  );
}
for (const mutation of ["set", "delete", "clear"]) {
  const mutationRun = runWrapperStoreHarness({
    initialState: wrapperHarnessBaseState,
    preflight: coherentRichHistory,
    frozenCallback: (kernelDraft) => {
      if (mutation === "set") {
        kernelDraft.idempotency_records[0] = {
          fingerprint: `sha-256:${"f".repeat(64)}`,
          result_ref: structuredClone(rowVector.value.columns.ref),
          actor_id: "agent:mallory"
        };
      } else if (mutation === "delete") {
        delete kernelDraft.idempotency_records[0];
      } else {
        kernelDraft.idempotency_records = [];
      }
      kernelDraft.used_nonces.push(
        projectionMutationReplay.nonceProjection.columns.nonce
      );
      return {
        commit: actualFrozenCorruptResult.commit,
        value: structuredClone(actualFrozenCorruptResult.value)
      };
    },
    observation: projectionMutationReplay.observation,
    transactionDependencyManifest:
      projectionMutationReplay.transactionDependencyManifest,
    transactionProjections:
      projectionMutationReplay.transactionProjections,
    caseId: `frozen_projection_${mutation}`
  });
  assert.deepEqual(
    mutationRun.state.authoritative.idempotency_row,
    wrapperHarnessBaseState.authoritative.idempotency_row
  );
  assert.deepEqual(
    mutationRun.state.authoritative.idempotency_projection,
    wrapperHarnessBaseState.authoritative.idempotency_projection
  );
  assert.deepEqual(
    mutationRun.state.kernel.idempotency_records,
    [frozenIdempotencyView],
    `frozen projection ${mutation} escaped adapter reconstruction`
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
  replayAcceptedFailureObservation,
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
