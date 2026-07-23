import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { canonicalHash, canonicalText } from "../../protocol/lib/core.mjs";
import { createAjv } from "../../protocol/lib/schemas.mjs";

const SCHEMA_PATH = new URL("./authoritative-service.schema.json", import.meta.url);
const SPEC_PATH = new URL(
  "../../Protocol_Agent_Authoritative_Service_Change_Spec_v0.1.md",
  import.meta.url
);
const VECTORS_PATH = new URL("./canonical-vectors.json", import.meta.url);
const EXPECTED_SCHEMA_HASH = "sha-256:f65d946131f6b2a6e203728e36508fef7a2dbc67fd5092b47f3d63c5c3a61020";
const EXPECTED_VECTORS_HASH = "sha-256:b4420c3f0e7603c61d4d86b91d4750df1567559f868127ef7ef490770ec4ce60";
const EXPECTED_DEFS = [
  "sha256",
  "nullableSha256",
  "timestamp",
  "nullableTimestamp",
  "uuidUrn",
  "identifier",
  "schemaId",
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

const schema = JSON.parse(await readFile(SCHEMA_PATH, "utf8"));
const spec = await readFile(SPEC_PATH, "utf8");
const vectors = JSON.parse(await readFile(VECTORS_PATH, "utf8"));
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
