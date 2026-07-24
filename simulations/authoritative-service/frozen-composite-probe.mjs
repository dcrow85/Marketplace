import assert from "node:assert/strict";
import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  sign as signBytes
} from "node:crypto";
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  bindObjectHash,
  canonicalHash,
  canonicalText,
  objectHash,
  objectRefFor,
  objectRefKey,
  signatureInput,
  valueAtPointer,
  verifyEd25519,
  verifyObjectBindings
} from "../../protocol/lib/core.mjs";
import { createAjv } from "../../protocol/lib/schemas.mjs";
import {
  operationFingerprint,
  validateSignedObject
} from "../../protocol/lib/validation.mjs";
import { loadReferenceFoundation } from "../../protocol/reference-service/service.mjs";
import { MemoryReferenceStores } from "../../protocol/reference-service/state.mjs";

const AUTHORITATIVE_SCHEMA = JSON.parse(await readFile(
  new URL("./authoritative-service.schema.json", import.meta.url),
  "utf8"
));
const AUTHORITATIVE_SCHEMA_HASH = canonicalHash(AUTHORITATIVE_SCHEMA);
const AUTHORITATIVE_AJV = createAjv();
AUTHORITATIVE_AJV.addSchema(AUTHORITATIVE_SCHEMA);
const validateServiceObservation = AUTHORITATIVE_AJV.compile({
  "$ref": `${AUTHORITATIVE_SCHEMA.$id}#/$defs/serviceObservation`
});
const validateDependencyManifest = AUTHORITATIVE_AJV.compile({
  "$ref": `${AUTHORITATIVE_SCHEMA.$id}#/$defs/dependencyManifest`
});
const validateGenesisManifest = AUTHORITATIVE_AJV.compile({
  "$ref": `${AUTHORITATIVE_SCHEMA.$id}#/$defs/genesisManifest`
});
const validateOperationalProjection = AUTHORITATIVE_AJV.compile({
  "$ref": `${AUTHORITATIVE_SCHEMA.$id}#/$defs/operationalRowProjection`
});
const validateHostAuthenticationContext = AUTHORITATIVE_AJV.compile({
  "$ref": `${AUTHORITATIVE_SCHEMA.$id}#/$defs/hostAuthenticationContext`
});
const validateReceiverAuthenticationRecord = AUTHORITATIVE_AJV.compile({
  "$ref": `${AUTHORITATIVE_SCHEMA.$id}#/$defs/receiverAuthenticationRecord`
});
const FROZEN_FOUNDATION = await loadReferenceFoundation();

const PKCS8_ED25519_PREFIX =
  Buffer.from("302e020100300506032b657004220420", "hex");
const SERVICE_OBSERVATION_PRIVATE_KEY = createPrivateKey({
  key: Buffer.concat([PKCS8_ED25519_PREFIX, Buffer.alloc(32, 7)]),
  format: "der",
  type: "pkcs8"
});
export const SERVICE_OBSERVATION_PUBLIC_KEY =
  createPublicKey(SERVICE_OBSERVATION_PRIVATE_KEY)
    .export({ format: "der", type: "spki" })
    .subarray(-32)
    .toString("base64url");
export const PRIOR_SERVICE_KEY_PROFILE = Object.freeze(bindObjectHash({
  schema: "cairn.local_service_key_profile.v0.1",
  profile_id: "urn:uuid:00000000-0000-4000-8000-000000000009",
  profile_hash: `sha-256:${"0".repeat(64)}`,
  service_id: "cairn:reference-service",
  store_id: "urn:uuid:00000000-0000-4000-8000-000000000001",
  kernel_profile: "cairn-proposal-foundation-v0.1",
  bundle_hash: FROZEN_FOUNDATION.bundleHash,
  allowed_observation_schema: "cairn.service_observation.v0.1",
  current_key_id: "https://cairn.invalid/keys/service-0",
  keys: [{
    key_id: "https://cairn.invalid/keys/service-0",
    controller: "cairn:reference-service",
    key_type: "Ed25519",
    public_key: SERVICE_OBSERVATION_PUBLIC_KEY,
    status: "active",
    not_before: "2026-01-01T00:00:00Z",
    expires_at: "2026-07-23T15:59:59Z",
    revocation_time: null,
    profile_revision: 0
  }],
  prior_profile_hash: null,
  created_at: "2026-01-01T00:00:00Z"
}, AUTHORITATIVE_SCHEMA.$defs.localServiceKeyProfile));
export const SERVICE_KEY_PROFILE = Object.freeze(bindObjectHash({
  schema: "cairn.local_service_key_profile.v0.1",
  profile_id: "urn:uuid:00000000-0000-4000-8000-000000000002",
  profile_hash: `sha-256:${"0".repeat(64)}`,
  service_id: "cairn:reference-service",
  store_id: "urn:uuid:00000000-0000-4000-8000-000000000001",
  kernel_profile: "cairn-proposal-foundation-v0.1",
  bundle_hash: FROZEN_FOUNDATION.bundleHash,
  allowed_observation_schema: "cairn.service_observation.v0.1",
  current_key_id: "https://cairn.invalid/keys/service-1",
  keys: [{
    key_id: "https://cairn.invalid/keys/service-1",
    controller: "cairn:reference-service",
    key_type: "Ed25519",
    public_key: SERVICE_OBSERVATION_PUBLIC_KEY,
    status: "active",
    not_before: "2026-07-23T00:00:00Z",
    expires_at: "2027-07-23T16:00:00Z",
    revocation_time: null,
    profile_revision: 1
  }],
  prior_profile_hash: PRIOR_SERVICE_KEY_PROFILE.profile_hash,
  created_at: "2026-07-23T16:00:00Z"
}, AUTHORITATIVE_SCHEMA.$defs.localServiceKeyProfile));
export const SERVICE_KEY_PROFILE_CHAIN = Object.freeze([
  PRIOR_SERVICE_KEY_PROFILE,
  SERVICE_KEY_PROFILE
]);
export const COMPOSITE_FIXTURE = Object.freeze({
  genesis_at: "2026-07-23T15:59:59Z",
  now: "2026-07-23T16:00:00Z",
  service_id: SERVICE_KEY_PROFILE.service_id,
  store_id: SERVICE_KEY_PROFILE.store_id,
  service_key_id: SERVICE_KEY_PROFILE.current_key_id,
  provider_key_id: "did:web:agent.example#provider-1",
  principal_key_id: "did:example:collector#key-1",
  service_profile_id: SERVICE_KEY_PROFILE.profile_id,
  service_profile_hash: SERVICE_KEY_PROFILE.profile_hash,
  authoritative_schema_hash: AUTHORITATIVE_SCHEMA_HASH
});
const EXPECTED_COMPOSITE_GENESIS_MANIFEST_HASH =
  "sha-256:4d611336b590521b5ec06a659d958912ae4b6fe2e5c2f7b30a28a386abc3f8aa";
const validateServiceKeyProfile = AUTHORITATIVE_AJV.compile({
  "$ref": `${AUTHORITATIVE_SCHEMA.$id}#/$defs/localServiceKeyProfile`
});

function compareProtocolInstants(left, right) {
  const timestampPattern =
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?Z$/;
  const leftMatch = timestampPattern.exec(left);
  const rightMatch = timestampPattern.exec(right);
  if (!leftMatch || !rightMatch) {
    throw new TypeError("invalid protocol timestamp");
  }
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

export function verifyServiceKeyProfile(
  profile,
  at = COMPOSITE_FIXTURE.now
) {
  try {
    if (
      !validateServiceKeyProfile(profile) ||
      objectHash(
        profile,
        AUTHORITATIVE_SCHEMA.$defs.localServiceKeyProfile
      ) !== profile.profile_hash
    ) {
      return false;
    }
    const keyIds = profile.keys.map(({ key_id: keyId }) => keyId);
    const sortedKeyIds = [...keyIds].sort(compareUtf8);
    if (
      new Set(sortedKeyIds).size !== keyIds.length ||
      canonicalText(sortedKeyIds) !== canonicalText(keyIds)
    ) {
      return false;
    }
    const current = profile.keys.filter(
      ({ key_id: keyId }) => keyId === profile.current_key_id
    );
    return profile.keys.every(
      (key) =>
        compareProtocolInstants(key.not_before, key.expires_at) < 0
    ) &&
      current.length === 1 &&
      current[0].controller === profile.service_id &&
      current[0].status === "active" &&
      current[0].revocation_time === null &&
      compareProtocolInstants(current[0].not_before, at) <= 0 &&
      compareProtocolInstants(at, current[0].expires_at) < 0;
  } catch {
    return false;
  }
}

export function verifyServiceKeyProfileChain(
  profiles,
  at = COMPOSITE_FIXTURE.now,
  expectedCurrentHash = profiles?.at(-1)?.profile_hash
) {
  try {
    if (!Array.isArray(profiles) || profiles.length === 0) return false;
    const hashes = new Set();
    const ids = new Set();
    const first = profiles[0];
    for (let index = 0; index < profiles.length; index += 1) {
      const profile = profiles[index];
      const keyIds = profile.keys.map(({ key_id: keyId }) => keyId);
      if (
        !validateServiceKeyProfile(profile) ||
        objectHash(
          profile,
          AUTHORITATIVE_SCHEMA.$defs.localServiceKeyProfile
        ) !== profile.profile_hash ||
        hashes.has(profile.profile_hash) ||
        ids.has(profile.profile_id) ||
        canonicalText([...keyIds].sort(compareUtf8)) !==
          canonicalText(keyIds) ||
        new Set(keyIds).size !== keyIds.length ||
        profile.keys.some(
          (key) =>
            key.controller !== profile.service_id ||
            compareProtocolInstants(
              key.not_before,
              key.expires_at
            ) >= 0
        ) ||
        profile.service_id !== first.service_id ||
        profile.store_id !== first.store_id ||
        profile.kernel_profile !== first.kernel_profile ||
        profile.bundle_hash !== first.bundle_hash ||
        profile.allowed_observation_schema !==
          first.allowed_observation_schema ||
        profile.prior_profile_hash !==
          (index === 0 ? null : profiles[index - 1].profile_hash) ||
        !verifyServiceKeyProfile(profile, profile.created_at) ||
        compareProtocolInstants(profile.created_at, at) > 0 ||
        (
          index > 0 &&
          compareProtocolInstants(
            profiles[index - 1].created_at,
            profile.created_at
          ) >= 0
        )
      ) {
        return false;
      }
      hashes.add(profile.profile_hash);
      ids.add(profile.profile_id);
    }
    const current = profiles.at(-1);
    return current.profile_hash === expectedCurrentHash &&
      verifyServiceKeyProfile(current, at);
  } catch {
    return false;
  }
}

const STORE_PROJECTION_SECRET = Buffer.alloc(32, 11);
const ZERO_HASH = `sha-256:${"0".repeat(64)}`;
const NOT_CLAIMING = AUTHORITATIVE_SCHEMA.$defs.notClaiming.prefixItems.map(
  ({ const: value }) => value
);

export function compositeObservationRefKey(observation) {
  return canonicalText([
    observation.schema,
    observation.observation_id,
    observation.observation_hash
  ]);
}

export function verifyCompositeObservation(
  observation,
  serviceKeyProfiles = SERVICE_KEY_PROFILE_CHAIN
) {
  const profileChain = Array.isArray(serviceKeyProfiles)
    ? serviceKeyProfiles
    : [serviceKeyProfiles];
  const profileIndex = profileChain.findIndex(
    ({ profile_hash: profileHash }) =>
      profileHash === observation?.service?.key_profile_hash
  );
  if (profileIndex < 0) return false;
  const effectiveChain = profileChain.slice(0, profileIndex + 1);
  const serviceKeyProfile = effectiveChain.at(-1);
  const currentKey = serviceKeyProfile.keys?.find(
    ({ key_id: keyId }) => keyId === serviceKeyProfile.current_key_id
  );
  return verifyServiceKeyProfileChain(
    profileChain,
    COMPOSITE_FIXTURE.now,
    profileChain.at(-1).profile_hash
  ) &&
    verifyServiceKeyProfileChain(
      effectiveChain,
      observation?.observed_at,
      observation?.service?.key_profile_hash
    ) &&
    profileChain.slice(profileIndex + 1).every(
      (profile) =>
        compareProtocolInstants(
          observation.observed_at,
          profile.created_at
        ) < 0
    ) &&
    validateServiceObservation(observation) &&
    observation.service.service_id === serviceKeyProfile.service_id &&
    observation.service.profile === serviceKeyProfile.kernel_profile &&
    observation.service.bundle_hash === serviceKeyProfile.bundle_hash &&
    observation.service.store_id === serviceKeyProfile.store_id &&
    observation.service.key_profile_ref.artifact_schema ===
      serviceKeyProfile.schema &&
    observation.service.key_profile_ref.artifact_id ===
      serviceKeyProfile.profile_id &&
    observation.service.key_profile_ref.artifact_hash ===
      serviceKeyProfile.profile_hash &&
    observation.service.key_profile_hash ===
      serviceKeyProfile.profile_hash &&
    objectHash(
      observation,
      AUTHORITATIVE_SCHEMA.$defs.serviceObservation
    ) === observation.observation_hash &&
    observation.service_signature.profile === "cairn-ed25519-v0.1" &&
    observation.service_signature.key_id ===
      serviceKeyProfile.current_key_id &&
    observation.service_signature.signed_hash ===
      observation.observation_hash &&
    observation.service_signature.signed_at === observation.observed_at &&
    verifyEd25519({
      schemaId: observation.schema,
      objectHash: observation.observation_hash,
      publicKey: currentKey.public_key,
      signature: observation.service_signature.value
    });
}

const MAP_NAMES = [
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

function compareUtf8(left, right) {
  return Buffer.compare(
    Buffer.from(String(left), "utf8"),
    Buffer.from(String(right), "utf8")
  );
}

function canonicalMaybe(value) {
  return value === undefined
    ? canonicalText(["cairn-undefined-v0.1"])
    : canonicalText(value);
}

function safeCanonicalValue(value) {
  try {
    canonicalText(value);
    return structuredClone(value);
  } catch {
    if (value && typeof value === "object") {
      return {
        key_id: value.key_id ?? null,
        key_type: value.key_type ?? null,
        controller: value.controller ?? null,
        status: value.status ?? null,
        public_key: value.public_key ?? null,
        not_before: value.not_before ?? null,
        expires_at: value.expires_at ?? null,
        revocation_time: value.revocation_time ?? null,
        profile_revision: value.profile_revision ?? 1
      };
    }
    return [typeof value, String(value)];
  }
}

function safeCanonicalHash(value) {
  return canonicalHash(safeCanonicalValue(value));
}

class AccessRecorder {
  constructor() {
    this.active = false;
    this.events = [];
  }

  record(
    store,
    method,
    key = null,
    before = undefined,
    after = undefined,
    {
      beforePresent = before !== undefined,
      afterPresent = after !== undefined
    } = {}
  ) {
    if (!this.active) return;
    this.events.push({
      order: this.events.length + 1,
      store,
      method,
      key: key === null ? null : canonicalMaybe(key),
      before_present: beforePresent,
      after_present: afterPresent,
      before_hash: before === undefined ? null : safeCanonicalHash(before),
      after_hash: after === undefined ? null : safeCanonicalHash(after),
      before_value: before === undefined
        ? null
        : safeCanonicalValue(before),
      after_value: after === undefined
        ? null
        : safeCanonicalValue(after)
    });
  }
}

class TrackedMap extends Map {
  constructor(name, source, recorder) {
    super();
    this.name = name;
    this.recorder = recorder;
    for (const [key, value] of source) {
      super.set(key, structuredClone(value));
    }
  }

  get(key) {
    const present = super.has(key);
    const value = super.get(key);
    this.recorder.record(this.name, "get", key, value, value, {
      beforePresent: present,
      afterPresent: present
    });
    return value;
  }

  has(key) {
    const present = super.has(key);
    this.recorder.record(this.name, "has", key, present, present, {
      beforePresent: present,
      afterPresent: present
    });
    return present;
  }

  set(key, value) {
    const present = super.has(key);
    const before = super.get(key);
    super.set(key, value);
    this.recorder.record(this.name, "set", key, before, value, {
      beforePresent: present,
      afterPresent: true
    });
    return this;
  }

  delete(key) {
    const present = super.has(key);
    const before = super.get(key);
    const deleted = super.delete(key);
    this.recorder.record(this.name, "delete", key, before, undefined, {
      beforePresent: present,
      afterPresent: false
    });
    return deleted;
  }

  clear() {
    this.recorder.record(this.name, "clear", null, [...super.entries()], []);
    super.clear();
  }

  entries() {
    this.recorder.record(this.name, "entries");
    return super.entries();
  }

  keys() {
    this.recorder.record(this.name, "keys");
    return super.keys();
  }

  values() {
    this.recorder.record(this.name, "values");
    return super.values();
  }

  [Symbol.iterator]() {
    this.recorder.record(this.name, "iterate");
    return super[Symbol.iterator]();
  }
}

class TrackedSet extends Set {
  constructor(name, source, recorder) {
    super();
    this.name = name;
    this.recorder = recorder;
    for (const value of source) super.add(value);
  }

  has(value) {
    const present = super.has(value);
    this.recorder.record(this.name, "has", value, present, present, {
      beforePresent: present,
      afterPresent: present
    });
    return present;
  }

  add(value) {
    const present = super.has(value);
    super.add(value);
    this.recorder.record(this.name, "add", value, present, true, {
      beforePresent: present,
      afterPresent: true
    });
    return this;
  }

  delete(value) {
    const present = super.has(value);
    const deleted = super.delete(value);
    this.recorder.record(this.name, "delete", value, present, false, {
      beforePresent: present,
      afterPresent: false
    });
    return deleted;
  }

  clear() {
    this.recorder.record(this.name, "clear", null, [...super.values()], []);
    super.clear();
  }

  values() {
    this.recorder.record(this.name, "values");
    return super.values();
  }

  [Symbol.iterator]() {
    this.recorder.record(this.name, "iterate");
    return super[Symbol.iterator]();
  }
}

function cloneMap(source) {
  return new Map(
    [...source].map(([key, value]) => [key, structuredClone(value)])
  );
}

function replaceMap(target, source) {
  target.clear();
  for (const [key, value] of source) {
    target.set(key, structuredClone(value));
  }
}

function sortedMapEntries(map) {
  return [...map.entries()].sort(([left], [right]) =>
    compareUtf8(left, right)
  );
}

function objectStructuralKey(ref) {
  return canonicalText([ref.schema, ref.object_id, ref.object_hash]);
}

function objectStructuralKeyFromRefKey(refKey) {
  const parts = refKey.split("|");
  assert.equal(parts.length, 3, `invalid frozen object ref key ${refKey}`);
  return canonicalText(parts);
}

function idempotencyLookupKey(context) {
  return canonicalText([
    context.authentication.authorityNamespace,
    context.envelope.idempotency_key
  ]);
}

export function compositeIdempotencyStructuralKeyCommitment(
  databaseLookupKey
) {
  return `sha-256:${createHmac("sha256", STORE_PROJECTION_SECRET)
    .update(Buffer.from(canonicalText([
      "cairn-idempotency-row-key-v0.1",
      COMPOSITE_FIXTURE.store_id,
      databaseLookupKey
    ]), "utf8"))
    .digest("hex")}`;
}

function richRowForObservation(sidecar, observation) {
  const commitment =
    observation.result.idempotency.structural_key_commitment;
  if (commitment === null) return null;
  const matches = sidecar.rich_idempotency_rows.filter(
    (row) =>
      compositeIdempotencyStructuralKeyCommitment(canonicalText([
        row.authority_namespace,
        row.idempotency_key
      ])) === commitment
  );
  return matches.length === 1 ? matches[0] : null;
}

function verifyIdempotencyEnvelopeBinding(
  receiverAuthentication,
  envelope,
  observation,
  richRow
) {
  const commitment =
    observation.result.idempotency.structural_key_commitment;
  if (commitment === null) {
    return richRow === null && envelope.idempotency_key === null;
  }
  if (
    !richRow ||
    typeof envelope.idempotency_key !== "string"
  ) {
    return false;
  }
  const exactDatabaseKey = canonicalText([
    receiverAuthentication.authority_namespace_raw,
    envelope.idempotency_key
  ]);
  return compositeIdempotencyStructuralKeyCommitment(exactDatabaseKey) ===
      commitment &&
    richRow.authority_namespace ===
      receiverAuthentication.authority_namespace_raw &&
    richRow.idempotency_key === envelope.idempotency_key &&
    richRow.operation_fingerprint === envelope.operation_fingerprint;
}

function projectionKey(projection) {
  return canonicalText([projection.table, projection.structural_key]);
}

function dependencyEntryForProjection(projection, accessKind) {
  return {
    entry_key: projectionKey(projection),
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
  projection = null
}) {
  assert.equal(typeof attemptedKey, "string");
  assert.equal(
    canonicalText(JSON.parse(attemptedKey)),
    attemptedKey,
    `${table}.${indexName} attempted key is not a canonical JCS value`
  );
  assert.ok(
    Array.isArray(JSON.parse(attemptedKey)),
    `${table}.${indexName} attempted key is not a JCS tuple`
  );
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
    canonical_row_hash: projection === null
      ? canonicalHash([
          "cairn-authoritative-absent-row-v0.1",
          table,
          indexName,
          attemptedKey
        ])
      : canonicalHash(projection)
  };
}

function committedDependencyManifest(entries) {
  const draft = {
    schema: "cairn.dependency_manifest.v0.1",
    entries: structuredClone(entries).sort((left, right) =>
      compareUtf8(left.entry_key, right.entry_key)
    ),
    dependency_set_commitment: ZERO_HASH
  };
  const manifest = bindObjectHash(
    draft,
    AUTHORITATIVE_SCHEMA.$defs.dependencyManifest
  );
  assert.equal(
    validateDependencyManifest(manifest),
    true,
    JSON.stringify(validateDependencyManifest.errors)
  );
  return manifest;
}

function operationalVersionFor(projection, globalSequence) {
  const ownerKind = projection.columns.owner_kind ??
    (projection.columns.principal_id ? "principal" : "service");
  const ownerId = projection.columns.owner_id ??
    projection.columns.principal_id ??
    COMPOSITE_FIXTURE.service_id;
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

const OPERATIONAL_VERSION_KEYS = [
  "canonical_row_bytes",
  "canonical_row_hash",
  "owner_id",
  "owner_kind",
  "structural_key",
  "table",
  "valid_from_global_sequence",
  "visibility"
];

const SIDECAR_KEYS = [
  "access_traces",
  "callback_witnesses",
  "counters",
  "current_projections",
  "dependency_commits",
  "dependency_rows",
  "frozen_idempotency_rows",
  "genesis_manifest",
  "global_sequence",
  "host_authentication_contexts",
  "observation_by_envelope",
  "observation_repository",
  "observations",
  "operational_versions",
  "owner_sequences",
  "receiver_authentication_records",
  "request_envelopes",
  "rich_idempotency_rows",
  "scope_commits",
  "service_commits",
  "validation_bindings"
];

const SIDECAR_COUNTER_KEYS = [
  "callback_calls",
  "commit_calls",
  "observation_calls",
  "persistence_calls"
];
const SERVICE_COMMIT_KEYS = [
  "committed_at",
  "global_commit_sequence",
  "observation_ref_key",
  "previous_global_sequence",
  "transaction_kind"
];
const DEPENDENCY_COMMIT_KEYS = [
  "dependency_set_commitment",
  "global_sequence"
];
const SCOPE_COMMIT_KEYS = [
  "dependency_set_commitment",
  "global_sequence",
  "observation_ref_key",
  "owner_id",
  "owner_kind",
  "previous_scope_sequence",
  "scope_sequence",
  "scope_state_commitment_after",
  "snapshot_id"
];
const OBSERVATION_REPOSITORY_ROW_KEYS = [
  "canonical_observation_bytes",
  "global_commit_sequence",
  "observation_hash",
  "observation_id",
  "observation_ref_key",
  "owner_id",
  "owner_kind",
  "principal_id",
  "request_envelope_hash",
  "scope_sequence",
  "visibility"
];
const VALIDATION_BINDING_KEYS = [
  "authoritative_schema_hash",
  "frozen_bundle_hash",
  "global_sequence",
  "operation_contract",
  "operation_contract_hash",
  "response_schema",
  "response_source_schema_bytes",
  "response_source_schema_hash",
  "validator_binding_hash"
];
const RECEIVER_AUTHENTICATION_ROW_KEYS = [
  "global_sequence",
  "record"
];
const HOST_AUTHENTICATION_ROW_KEYS = [
  "context",
  "global_sequence"
];
const REQUEST_ENVELOPE_ROW_KEYS = [
  "canonical_envelope_bytes",
  "global_sequence"
];
const ACCESS_TRACE_ROW_KEYS = [
  "envelope_hash",
  "events",
  "events_commitment",
  "global_sequence"
];
const CALLBACK_WITNESS_ROW_KEYS = [
  "callback_commit",
  "canonical_result_bytes",
  "global_sequence",
  "kernel_result_hash"
];

function verifyOperationalVersionRecord(version, maximumSequence) {
  try {
    if (
      !hasExactKeys(version, OPERATIONAL_VERSION_KEYS) ||
      !Number.isSafeInteger(version.valid_from_global_sequence) ||
      version.valid_from_global_sequence < 0 ||
      version.valid_from_global_sequence > maximumSequence
    ) {
      return false;
    }
    const projection = JSON.parse(version.canonical_row_bytes);
    const expectedOwnerKind = projection.columns.owner_kind ??
      (projection.columns.principal_id ? "principal" : "service");
    const expectedOwnerId = projection.columns.owner_id ??
      projection.columns.principal_id ??
      COMPOSITE_FIXTURE.service_id;
    return canonicalText(projection) === version.canonical_row_bytes &&
      canonicalHash(projection) === version.canonical_row_hash &&
      validateOperationalProjection(projection) &&
      version.table === projection.table &&
      version.structural_key === projection.structural_key &&
      version.visibility ===
        (projection.columns.visibility ?? "private") &&
      version.owner_kind === expectedOwnerKind &&
      version.owner_id === expectedOwnerId;
  } catch {
    return false;
  }
}

function ownerScopeCommitment(ownerKind, ownerId, scopeSequence, projections) {
  const committedRows = projections.map((projection) => [
    projection.table,
    projection.structural_key,
    canonicalHash(projection)
  ]).sort((left, right) =>
    compareUtf8(left[0], right[0]) || compareUtf8(left[1], right[1])
  );
  return canonicalHash([
    "cairn-reference-owner-state-v0.1",
    COMPOSITE_FIXTURE.service_id,
    COMPOSITE_FIXTURE.store_id,
    ownerKind,
    ownerId,
    scopeSequence,
    committedRows
  ]);
}

function queryCommitment(contract, context, hostContextHash) {
  return canonicalHash({
    operation_contract: contract,
    principal_id: context.authentication.principalId,
    actor_id: context.authentication.actorId,
    runtime_key_id: context.envelope.sender.runtime_key_id,
    body_hash: context.envelope.body_hash,
    subject_refs: context.envelope.subject_refs,
    authorization_refs: context.envelope.authorization_refs,
    host_authentication_context_hash: hostContextHash,
    declared_purpose: null,
    intended_use: null,
    filters: [],
    ordering: null,
    page_boundary: null
  });
}

function requestOperationFingerprintMatches(envelope) {
  try {
    return envelope.operation_fingerprint === operationFingerprint(envelope);
  } catch {
    return false;
  }
}

function deriveObservationOwner(observation) {
  const principalId = observation.request.principal_id;
  if (principalId !== null) {
    return {
      owner_kind: "principal",
      owner_id: principalId
    };
  }
  if (![
    "capabilities.get",
    "runtime_binding.get"
  ].includes(observation.request.operation_contract.operation)) {
    return null;
  }
  return {
    owner_kind: "actor",
    owner_id: observation.request.actor_id
  };
}

function receiverStableBinding(record) {
  return canonicalText([
    record.authentication_handle,
    record.account_tenant_commitment,
    record.principal_id,
    record.actor_id,
    record.runtime_key_id,
    record.authority_namespace_raw,
    record.trust_profile_id,
    record.trust_profile_hash,
    record.authentication_evidence_commitment,
    record.assertion_level
  ]);
}

function receiverAuthenticationMatchesEnvelope(record, envelope) {
  return validateReceiverAuthenticationRecord(record) &&
    record.principal_id === envelope.principal_id &&
    record.actor_id === envelope.sender.actor_id &&
    record.runtime_key_id === envelope.sender.runtime_key_id;
}

function receiverAuthenticationFitsHistory(sidecar, candidate) {
  if (!validateReceiverAuthenticationRecord(candidate)) return false;
  for (const { record } of sidecar.receiver_authentication_records) {
    if (
      record.account_tenant_commitment ===
        candidate.account_tenant_commitment &&
      receiverStableBinding(record) !== receiverStableBinding(candidate)
    ) {
      return false;
    }
    if (
      record.authentication_handle === candidate.authentication_handle &&
      receiverStableBinding(record) !== receiverStableBinding(candidate)
    ) {
      return false;
    }
  }
  return true;
}

function sidecarWrapperShapesAreExact(sidecar) {
  return hasExactKeys(sidecar.counters, SIDECAR_COUNTER_KEYS) &&
    Object.values(sidecar.counters).every(
      (value) =>
        Number.isSafeInteger(value) &&
        value === sidecar.global_sequence
    ) &&
    sidecar.service_commits.every(
      (row) => hasExactKeys(row, SERVICE_COMMIT_KEYS)
    ) &&
    sidecar.dependency_commits.every(
      (row) => hasExactKeys(row, DEPENDENCY_COMMIT_KEYS)
    ) &&
    sidecar.scope_commits.every(
      (row) => hasExactKeys(row, SCOPE_COMMIT_KEYS)
    ) &&
    sidecar.observation_repository.every(
      (row) => hasExactKeys(row, OBSERVATION_REPOSITORY_ROW_KEYS)
    ) &&
    sidecar.validation_bindings.every(
      (row) => hasExactKeys(row, VALIDATION_BINDING_KEYS)
    ) &&
    sidecar.receiver_authentication_records.every(
      (row) => hasExactKeys(row, RECEIVER_AUTHENTICATION_ROW_KEYS)
    ) &&
    sidecar.host_authentication_contexts.every(
      (row) => hasExactKeys(row, HOST_AUTHENTICATION_ROW_KEYS)
    ) &&
    sidecar.request_envelopes.every(
      (row) => hasExactKeys(row, REQUEST_ENVELOPE_ROW_KEYS)
    ) &&
    sidecar.access_traces.every(
      (row) => hasExactKeys(row, ACCESS_TRACE_ROW_KEYS)
    ) &&
    sidecar.callback_witnesses.every(
      (row) => hasExactKeys(row, CALLBACK_WITNESS_ROW_KEYS)
    );
}

function perOperationRowsAreOrdered(sidecar) {
  const operationSequenceAtIndex = (rows, field) =>
    rows.every(
      (row, index) => row[field] === index + 1
    );
  return sidecar.service_commits.every(
    (row, index) => row.global_commit_sequence === index
  ) &&
    sidecar.dependency_commits.every(
      (row, index) => row.global_sequence === index
    ) &&
    operationSequenceAtIndex(sidecar.scope_commits, "global_sequence") &&
    operationSequenceAtIndex(
      sidecar.observation_repository,
      "global_commit_sequence"
    ) &&
    operationSequenceAtIndex(sidecar.validation_bindings, "global_sequence") &&
    operationSequenceAtIndex(
      sidecar.receiver_authentication_records,
      "global_sequence"
    ) &&
    operationSequenceAtIndex(
      sidecar.host_authentication_contexts,
      "global_sequence"
    ) &&
    operationSequenceAtIndex(sidecar.request_envelopes, "global_sequence") &&
    operationSequenceAtIndex(sidecar.access_traces, "global_sequence") &&
    operationSequenceAtIndex(sidecar.callback_witnesses, "global_sequence") &&
    sidecar.observations.every(
      (observation, index) => {
        const repositoryRow = sidecar.observation_repository[index];
        return repositoryRow !== undefined &&
          observation.observation_id === repositoryRow.observation_id &&
          observation.observation_hash === repositoryRow.observation_hash &&
          canonicalText(observation) ===
            repositoryRow.canonical_observation_bytes;
      }
    ) &&
    sidecar.dependency_rows.every(
      (row, index, rows) =>
        index === 0 ||
        rows[index - 1].global_sequence < row.global_sequence ||
        (
          rows[index - 1].global_sequence === row.global_sequence &&
          compareUtf8(rows[index - 1].entry_key, row.entry_key) < 0
        )
    );
}

function genesisValidationManifestHash(initialRows) {
  return canonicalHash(
    initialRows
      .filter(({ table }) => table === "validation_keys")
      .map(({ columns }) => columns)
      .sort((left, right) => compareUtf8(left.key_id, right.key_id))
  );
}

function verifyCompositeGenesis(sidecar) {
  const manifest = sidecar.genesis_manifest;
  if (
    !validateGenesisManifest(manifest) ||
    objectHash(
      manifest,
      AUTHORITATIVE_SCHEMA.$defs.genesisManifest
    ) !== manifest.manifest_hash ||
    (
      EXPECTED_COMPOSITE_GENESIS_MANIFEST_HASH !== null &&
      manifest.manifest_hash !==
        EXPECTED_COMPOSITE_GENESIS_MANIFEST_HASH
    ) ||
    manifest.store_id !== COMPOSITE_FIXTURE.store_id ||
    manifest.kernel_profile !== "cairn-proposal-foundation-v0.1" ||
    manifest.bundle_hash !== FROZEN_FOUNDATION.bundleHash ||
    canonicalText(manifest.service_key_profile_ref) !== canonicalText({
      artifact_schema: SERVICE_KEY_PROFILE.schema,
      artifact_id: SERVICE_KEY_PROFILE.profile_id,
      artifact_hash: SERVICE_KEY_PROFILE.profile_hash
    }) ||
    manifest.validation_key_manifest_ref.artifact_hash !==
      genesisValidationManifestHash(manifest.initial_rows)
  ) {
    return false;
  }
  const orderedRows = [...manifest.initial_rows].sort(
    (left, right) => compareUtf8(projectionKey(left), projectionKey(right))
  );
  if (
    canonicalText(orderedRows) !== canonicalText(manifest.initial_rows) ||
    new Set(orderedRows.map(projectionKey)).size !== orderedRows.length
  ) {
    return false;
  }
  const expectedVersions = orderedRows.map((projection) =>
    operationalVersionFor(projection, 0)
  );
  const actualVersions = sidecar.operational_versions
    .filter(({ valid_from_global_sequence: sequence }) => sequence === 0)
    .sort(
      (left, right) =>
        compareUtf8(
          canonicalText([left.table, left.structural_key]),
          canonicalText([right.table, right.structural_key])
        )
    );
  return canonicalText(actualVersions) === canonicalText(expectedVersions);
}

function recordExpectedOperationalVersions(
  sidecar,
  globalSequence,
  dependencyEntries,
  expectedVersionKeys
) {
  for (const dependency of dependencyEntries) {
    const structuralTuple = JSON.parse(dependency.structural_key);
    if (structuralTuple[0] === "index") continue;
    const priorVersions = sidecar.operational_versions
      .filter(
        (version) =>
          version.table === dependency.table_name &&
          version.structural_key === dependency.structural_key &&
          version.valid_from_global_sequence < globalSequence
      )
      .sort(
        (left, right) =>
          left.valid_from_global_sequence -
            right.valid_from_global_sequence
      );
    const currentVersions = sidecar.operational_versions.filter(
      (version) =>
        version.table === dependency.table_name &&
        version.structural_key === dependency.structural_key &&
        version.valid_from_global_sequence === globalSequence
    );
    const prior = priorVersions.at(-1);
    const inserted = [
      "write_insert",
      "read_absent_write_insert"
    ].includes(dependency.access_kind);
    const updated = [
      "write_update",
      "read_present_write_update"
    ].includes(dependency.access_kind);
    const readPresent = dependency.access_kind === "read_present";
    const readAbsent = dependency.access_kind === "read_absent";
    if (
      (
        (inserted || readAbsent) &&
        prior !== undefined
      ) ||
      (
        (updated || readPresent) &&
        prior === undefined
      ) ||
      (
        (readPresent || readAbsent) &&
        currentVersions.length !== 0
      ) ||
      (
        (inserted || updated) &&
        currentVersions.length !== 1
      )
    ) {
      return false;
    }
    if (
      readPresent &&
      prior.canonical_row_hash !== dependency.canonical_row_hash
    ) {
      return false;
    }
    if (inserted || updated) {
      const current = currentVersions[0];
      if (
        current.canonical_row_hash !== dependency.canonical_row_hash
      ) {
        return false;
      }
      expectedVersionKeys.add(canonicalText([
        current.table,
        current.structural_key,
        current.valid_from_global_sequence
      ]));
    }
  }
  return true;
}

function kernelResultKind(result, responseBodyValidator) {
  if (
    hasExactKeys(result, ["body", "ok", "replayed", "status"]) &&
    result.ok === true &&
    Number.isSafeInteger(result.status) &&
    result.status >= 200 &&
    result.status <= 299 &&
    typeof result.replayed === "boolean" &&
    typeof responseBodyValidator === "function" &&
    responseBodyValidator(result.body)
  ) {
    return "success";
  }
  if (
    hasExactKeys(result, ["code", "failures", "ok", "status"]) &&
    result.ok === false &&
    Number.isSafeInteger(result.status) &&
    result.status >= 300 &&
    result.status <= 599 &&
    typeof result.code === "string" &&
    /^[a-z][a-z0-9_]{1,95}$/.test(result.code) &&
    Array.isArray(result.failures) &&
    result.failures.length > 0 &&
    result.failures.every(
      (failure) =>
        typeof failure === "string" &&
        /^[a-z][a-z0-9_]{1,95}$/.test(failure)
    )
  ) {
    return "accepted_failure";
  }
  return null;
}

function kernelResultMatchesObservation(
  result,
  observation,
  responseBodyValidator
) {
  const kind = kernelResultKind(result, responseBodyValidator);
  if (
    kind === null ||
    kind !== observation.result.outcome ||
    result.status !== observation.result.status
  ) {
    return false;
  }
  if (kind === "success") {
    return observation.result.code === null &&
      observation.result.failures.length === 0 &&
      observation.result.response_schema ===
        observation.request.operation_contract.response_schema &&
      result.replayed === observation.result.replayed;
  }
  return observation.result.code === result.code &&
    canonicalText(observation.result.failures) ===
      canonicalText(result.failures) &&
    observation.result.replayed === false &&
    observation.result.response_schema === null &&
    observation.result.returned_refs.length === 0 &&
    observation.result.grant_effects.length === 0;
}

function signedObjectKeyResolver(currentVersions) {
  return new Map(
    [...currentVersions.values()]
      .filter(({ table }) => table === "validation_keys")
      .map(({ columns }) => [columns.key_id, columns])
  );
}

export function verifySignedObjectWitness(
  value,
  currentVersions,
  observedAt
) {
  return validateSignedObject(value, {
    ajv: FROZEN_FOUNDATION.ajv,
    schemasByObjectId: FROZEN_FOUNDATION.schemasByObjectId,
    keyResolver: signedObjectKeyResolver(currentVersions),
    now: observedAt,
    historicalKeyProof: true,
    historicalObjectLifecycle: true
  }).length === 0;
}

function registeredResponseValidatorBinding(foundation, operation) {
  const sourceSchemaId = operation.response_schema.split("#", 1)[0];
  const sourceSchema = foundation.schemasById.get(sourceSchemaId);
  assert.ok(
    sourceSchema,
    `registered response source schema missing: ${sourceSchemaId}`
  );
  const operationName = operation.name ?? operation.operation;
  const operationContract = {
    operation: operationName,
    request_schema: operation.request_schema,
    response_schema: operation.response_schema,
    consequence: operation.consequence
  };
  return {
    response_schema: operation.response_schema,
    response_source_schema_bytes: canonicalText(sourceSchema),
    response_source_schema_hash: canonicalHash(sourceSchema),
    validator_binding_hash: canonicalHash([
      "cairn-registered-response-validator-v0.1",
      foundation.bundleHash,
      operationContract,
      canonicalHash(sourceSchema)
    ])
  };
}

function deterministicUuid(namespace, sequence) {
  const prefix = namespace === "observation" ? "30000000" : "40000000";
  return `urn:uuid:${prefix}-0000-4000-8000-${
    String(sequence).padStart(12, "0")
  }`;
}

function bindAndSignServiceObservation(draft) {
  const bound = bindObjectHash(
    draft,
    AUTHORITATIVE_SCHEMA.$defs.serviceObservation
  );
  bound.service_signature.value = signBytes(
    null,
    signatureInput(bound.schema, bound.observation_hash),
    SERVICE_OBSERVATION_PRIVATE_KEY
  ).toString("base64url");
  return bound;
}

function signServiceObservation(draft) {
  const bound = bindAndSignServiceObservation(draft);
  assert.equal(
    validateServiceObservation(bound),
    true,
    JSON.stringify(validateServiceObservation.errors)
  );
  assert.equal(verifyCompositeObservation(bound), true);
  return bound;
}

export function verifyCompositeHistory(sidecar) {
  try {
    if (
      !hasExactKeys(sidecar, SIDECAR_KEYS) ||
      !sidecarWrapperShapesAreExact(sidecar) ||
      !perOperationRowsAreOrdered(sidecar) ||
      !verifyCompositeGenesis(sidecar) ||
      sidecar.service_commits.length !== sidecar.global_sequence + 1 ||
      sidecar.dependency_commits.length !== sidecar.global_sequence + 1 ||
      sidecar.scope_commits.length !== sidecar.global_sequence ||
      sidecar.observation_repository.length !== sidecar.global_sequence ||
      sidecar.observations.length !== sidecar.global_sequence ||
      sidecar.validation_bindings.length !== sidecar.global_sequence ||
      sidecar.receiver_authentication_records.length !==
        sidecar.global_sequence ||
      sidecar.host_authentication_contexts.length !==
        sidecar.global_sequence ||
      sidecar.request_envelopes.length !== sidecar.global_sequence ||
      sidecar.access_traces.length !== sidecar.global_sequence ||
      sidecar.callback_witnesses.length !== sidecar.global_sequence ||
      Object.keys(sidecar.observation_by_envelope).length !==
        sidecar.global_sequence
    ) {
      return false;
    }
    if (
      !Array.isArray(sidecar.dependency_rows) ||
      sidecar.dependency_rows.some(
        ({ global_sequence: sequence }) =>
          !Number.isSafeInteger(sequence) ||
          sequence < 1 ||
          sequence > sidecar.global_sequence
      )
    ) {
      return false;
    }
    if (
      !sidecar.operational_versions.every((version) =>
        verifyOperationalVersionRecord(version, sidecar.global_sequence)
      )
    ) {
      return false;
    }
    const versionKeys = sidecar.operational_versions.map((version) =>
      canonicalText([
        version.table,
        version.structural_key,
        version.valid_from_global_sequence
      ])
    );
    if (new Set(versionKeys).size !== versionKeys.length) return false;
    const expectedVersionKeys = new Set(
      sidecar.genesis_manifest.initial_rows.map((projection) =>
        canonicalText([
          projection.table,
          projection.structural_key,
          0
        ])
      )
    );
    const receiverBindingByAccount = new Map();
    const receiverBindingByHandle = new Map();
    for (
      let globalSequence = 0;
      globalSequence <= sidecar.global_sequence;
      globalSequence += 1
    ) {
      const serviceCommit = sidecar.service_commits[globalSequence];
      const dependencyCommit = sidecar.dependency_commits[globalSequence];
      if (
        serviceCommit?.global_commit_sequence !== globalSequence ||
        serviceCommit.previous_global_sequence !==
          (globalSequence === 0 ? null : globalSequence - 1) ||
        dependencyCommit?.global_sequence !== globalSequence
      ) {
        return false;
      }
      if (globalSequence === 0) {
        if (
          serviceCommit.transaction_kind !== "genesis" ||
          serviceCommit.committed_at !== COMPOSITE_FIXTURE.genesis_at ||
          serviceCommit.observation_ref_key !== null ||
          dependencyCommit.dependency_set_commitment !== ZERO_HASH
        ) {
          return false;
        }
        continue;
      }
      const repositoryRow =
        sidecar.observation_repository[globalSequence - 1];
      const scopeCommit = sidecar.scope_commits[globalSequence - 1];
      if (
        !repositoryRow ||
        !scopeCommit ||
        !["service_operation", "replay"].includes(
          serviceCommit.transaction_kind
        ) ||
        repositoryRow.observation_ref_key !==
          serviceCommit.observation_ref_key ||
        scopeCommit.observation_ref_key !== serviceCommit.observation_ref_key
      ) {
        return false;
      }
      const observation =
        JSON.parse(repositoryRow.canonical_observation_bytes);
      if (
        serviceCommit.committed_at !== observation.observed_at ||
        serviceCommit.transaction_kind !==
          (observation.result.replayed ? "replay" : "service_operation")
      ) {
        return false;
      }
      const durableObservation = sidecar.observations[globalSequence - 1];
      const validationBinding =
        sidecar.validation_bindings[globalSequence - 1];
      const receiverAuthenticationRecordRow =
        sidecar.receiver_authentication_records[globalSequence - 1];
      const requestEnvelopeRow =
        sidecar.request_envelopes[globalSequence - 1];
      const hostAuthenticationContext =
        sidecar.host_authentication_contexts[globalSequence - 1]?.context;
      const accessTrace = sidecar.access_traces[globalSequence - 1];
      const callbackWitness = sidecar.callback_witnesses[globalSequence - 1];
      const callbackResult = callbackWitness === undefined
        ? null
        : JSON.parse(callbackWitness.canonical_result_bytes);
      const callbackBodyValidator = FROZEN_FOUNDATION.ajv.getSchema(
        observation.request.operation_contract.response_schema
      );
      const expectedValidatorBinding = registeredResponseValidatorBinding(
        FROZEN_FOUNDATION,
        observation.request.operation_contract
      );
      const receiverAuthentication =
        receiverAuthenticationRecordRow?.record;
      const requestEnvelope = requestEnvelopeRow
        ? JSON.parse(requestEnvelopeRow.canonical_envelope_bytes)
        : null;
      const envelopeSchema = requestEnvelope === null
        ? null
        : FROZEN_FOUNDATION.schemasByObjectId.get(requestEnvelope.schema);
      const envelopeValidator = envelopeSchema === null ||
          envelopeSchema === undefined
        ? null
        : FROZEN_FOUNDATION.ajv.getSchema(envelopeSchema.$id);
      const expectedHostContext = receiverAuthentication === undefined
        ? null
        : hostAuthenticationContextFromReceiver(receiverAuthentication);
      const expectedFrozenAuthentication =
        receiverAuthentication === undefined
          ? null
          : frozenAuthenticationFromReceiver(receiverAuthentication);
      const derivedOwner = deriveObservationOwner(observation);
      if (
        !durableObservation ||
        !validationBinding ||
        !receiverAuthenticationRecordRow ||
        !requestEnvelopeRow ||
        !hostAuthenticationContext ||
        !accessTrace ||
        !callbackWitness ||
        !callbackResult ||
        typeof callbackBodyValidator !== "function" ||
        !validateReceiverAuthenticationRecord(receiverAuthentication) ||
        !requestEnvelope ||
        !envelopeSchema ||
        typeof envelopeValidator !== "function" ||
        !envelopeValidator(requestEnvelope) ||
        verifyObjectBindings(requestEnvelope, envelopeSchema).length !== 0 ||
        canonicalText(requestEnvelope) !==
          requestEnvelopeRow.canonical_envelope_bytes ||
        objectHash(requestEnvelope, envelopeSchema) !==
          requestEnvelope.envelope_hash ||
        requestEnvelope.envelope_hash !==
          observation.request.envelope_hash ||
        requestEnvelope.message_id !== observation.request.message_id ||
        requestEnvelope.message_type !==
          observation.request.operation_contract.operation ||
        !receiverAuthenticationMatchesEnvelope(
          receiverAuthentication,
          requestEnvelope
        ) ||
        !requestOperationFingerprintMatches(requestEnvelope) ||
        requestEnvelope.body_hash !== observation.request.body_hash ||
        canonicalText(requestEnvelope.subject_refs) !==
          canonicalText(observation.request.subject_refs) ||
        canonicalText(requestEnvelope.authorization_refs) !==
          canonicalText(observation.request.authorization_refs) ||
        receiverAuthentication.runtime_key_id !==
          requestEnvelope.sender.runtime_key_id ||
        canonicalText(expectedFrozenAuthentication) !== canonicalText({
          principalId: observation.request.principal_id,
          actorId: observation.request.actor_id,
          authorityNamespace:
            receiverAuthentication.authority_namespace_raw
        }) ||
        canonicalText(expectedHostContext) !==
          canonicalText(hostAuthenticationContext) ||
        observation.request.query_commitment !== queryCommitment(
          observation.request.operation_contract,
          {
            authentication: expectedFrozenAuthentication,
            envelope: requestEnvelope
          },
          hostAuthenticationContext.context_hash
        ) ||
        receiverAuthentication.authority_namespace_commitment !==
          receiverAuthorityNamespaceCommitment(
            receiverAuthentication.account_tenant_commitment,
            receiverAuthentication.authority_namespace_raw
          ) ||
        canonicalText(durableObservation) !==
          repositoryRow.canonical_observation_bytes ||
        validationBinding.authoritative_schema_hash !==
          AUTHORITATIVE_SCHEMA_HASH ||
        canonicalText(validationBinding.operation_contract) !==
          canonicalText(observation.request.operation_contract) ||
        validationBinding.operation_contract_hash !==
          canonicalHash(observation.request.operation_contract) ||
        validationBinding.frozen_bundle_hash !==
          FROZEN_FOUNDATION.bundleHash ||
        validationBinding.frozen_bundle_hash !==
          observation.service.bundle_hash ||
        validationBinding.response_schema !==
          observation.request.operation_contract.response_schema ||
        validationBinding.response_source_schema_bytes !==
          expectedValidatorBinding.response_source_schema_bytes ||
        validationBinding.response_source_schema_hash !==
          expectedValidatorBinding.response_source_schema_hash ||
        validationBinding.validator_binding_hash !==
          expectedValidatorBinding.validator_binding_hash ||
        !validateHostAuthenticationContext(hostAuthenticationContext) ||
        objectHash(
          hostAuthenticationContext,
          AUTHORITATIVE_SCHEMA.$defs.hostAuthenticationContext
        ) !== hostAuthenticationContext.context_hash ||
        hostAuthenticationContext.context_hash !==
          observation.request.host_authentication_context_hash ||
        hostAuthenticationContext.principal_id !==
          observation.request.principal_id ||
        hostAuthenticationContext.actor_id !==
          observation.request.actor_id ||
        hostAuthenticationContext.runtime_key_id !==
          observation.request.runtime_key_id ||
        accessTrace.envelope_hash !== observation.request.envelope_hash ||
        accessTrace.events_commitment !==
          canonicalHash(accessTrace.events) ||
        accessTrace.events_commitment !==
          observation.transaction.access_trace_commitment ||
        callbackWitness.callback_commit !== true ||
        canonicalText(callbackResult) !==
          callbackWitness.canonical_result_bytes ||
        canonicalHash(callbackResult) !==
          callbackWitness.kernel_result_hash ||
        callbackWitness.kernel_result_hash !==
          observation.result.kernel_result_hash ||
        !kernelResultMatchesObservation(
          callbackResult,
          observation,
          callbackBodyValidator
        ) ||
        canonicalText(observation) !==
          repositoryRow.canonical_observation_bytes ||
        !verifyCompositeObservation(observation) ||
        compositeObservationRefKey(observation) !==
          repositoryRow.observation_ref_key ||
        repositoryRow.observation_id !== observation.observation_id ||
        repositoryRow.observation_hash !== observation.observation_hash ||
        repositoryRow.request_envelope_hash !==
          observation.request.envelope_hash ||
        repositoryRow.principal_id !== observation.request.principal_id ||
        repositoryRow.owner_kind !== observation.access.owner_kind ||
        repositoryRow.owner_id !== observation.access.owner_id ||
        !derivedOwner ||
        observation.access.owner_kind !== derivedOwner.owner_kind ||
        observation.access.owner_id !== derivedOwner.owner_id ||
        repositoryRow.visibility !== observation.access.visibility ||
        repositoryRow.scope_sequence !==
          observation.transaction.scope_sequence_after ||
        scopeCommit.owner_kind !== observation.access.owner_kind ||
        scopeCommit.owner_id !== observation.access.owner_id ||
        scopeCommit.scope_sequence !==
          observation.transaction.scope_sequence_after ||
        scopeCommit.previous_scope_sequence !==
          observation.transaction.scope_sequence_before ||
        scopeCommit.snapshot_id !== observation.transaction.snapshot_id ||
        scopeCommit.scope_state_commitment_after !==
          observation.transaction.scope_state_commitment_after ||
        scopeCommit.dependency_set_commitment !==
          observation.transaction.dependency_set_commitment ||
        dependencyCommit.dependency_set_commitment !==
          observation.transaction.dependency_set_commitment ||
        sidecar.observation_by_envelope[
          observation.request.envelope_hash
        ] !== observation.observation_id
      ) {
        return false;
      }
      const receiverBinding = receiverStableBinding(receiverAuthentication);
      const priorAccountBinding = receiverBindingByAccount.get(
        receiverAuthentication.account_tenant_commitment
      );
      const priorBinding = receiverBindingByHandle.get(
        receiverAuthentication.authentication_handle
      );
      if (
        (
          priorAccountBinding !== undefined &&
          priorAccountBinding !== receiverBinding
        ) ||
        (
          priorBinding !== undefined &&
          priorBinding !== receiverBinding
        )
      ) {
        return false;
      }
      receiverBindingByAccount.set(
        receiverAuthentication.account_tenant_commitment,
        receiverBinding
      );
      receiverBindingByHandle.set(
        receiverAuthentication.authentication_handle,
        receiverBinding
      );
      const dependencyEntries = sidecar.dependency_rows
        .filter((row) => row.global_sequence === globalSequence)
        .map(({ global_sequence: _globalSequence, ...entry }) => entry);
      const manifest = committedDependencyManifest(dependencyEntries);
      if (
        manifest.dependency_set_commitment !==
          dependencyCommit.dependency_set_commitment ||
        !recordExpectedOperationalVersions(
          sidecar,
          globalSequence,
          dependencyEntries,
          expectedVersionKeys
        )
      ) {
        return false;
      }
      for (const version of sidecar.operational_versions.filter(
        (candidate) =>
          candidate.valid_from_global_sequence === globalSequence
      )) {
        if (!dependencyEntries.some(
          (entry) =>
            entry.table_name === version.table &&
            entry.structural_key === version.structural_key &&
            entry.access_kind.includes("write")
        )) {
          return false;
        }
      }
      const currentVersions = new Map();
      for (const version of sidecar.operational_versions
        .filter(
          (candidate) =>
            candidate.valid_from_global_sequence <= globalSequence
        )
        .sort(
          (left, right) =>
            left.valid_from_global_sequence -
              right.valid_from_global_sequence ||
            compareUtf8(
              canonicalText([left.table, left.structural_key]),
              canonicalText([right.table, right.structural_key])
            )
        )) {
        const projection = JSON.parse(version.canonical_row_bytes);
        if (
          canonicalText(projection) !== version.canonical_row_bytes ||
          canonicalHash(projection) !== version.canonical_row_hash ||
          !validateOperationalProjection(projection)
        ) {
          return false;
        }
        currentVersions.set(
          canonicalText([version.table, version.structural_key]),
          projection
        );
      }
      const requestSigningKey = currentVersions.get(canonicalText([
        "validation_keys",
        canonicalText([requestEnvelope.signature.key_id])
      ]));
      if (
        !requestSigningKey ||
        requestEnvelope.signature.profile !== "cairn-ed25519-v0.1" ||
        requestEnvelope.signature.key_id !==
          requestEnvelope.sender.runtime_key_id ||
        requestEnvelope.signature.signed_hash !==
          requestEnvelope.envelope_hash ||
        requestSigningKey.columns.controller !==
          requestEnvelope.sender.actor_id ||
        requestSigningKey.columns.key_type !== "Ed25519" ||
        requestSigningKey.columns.status !== "active" ||
        requestSigningKey.columns.revocation_time !== null ||
        compareProtocolInstants(
          requestSigningKey.columns.not_before,
          requestEnvelope.signature.signed_at
        ) > 0 ||
        compareProtocolInstants(
          requestEnvelope.signature.signed_at,
          requestSigningKey.columns.expires_at
        ) >= 0 ||
        !verifyEd25519({
          schemaId: requestEnvelope.schema,
          objectHash: requestEnvelope.envelope_hash,
          publicKey: requestSigningKey.columns.public_key,
          signature: requestEnvelope.signature.value
        })
      ) {
        return false;
      }
      const phase = serviceCommit.transaction_kind === "replay"
        ? "replay"
        : observation.result.outcome === "accepted_failure"
          ? "accepted_failure"
        : observation.request.operation_contract.operation ===
            "capabilities.get"
          ? "capabilities"
          : "origin";
      const nonceProjection = [...currentVersions.values()].find(
        (projection) =>
          projection.table === "used_nonces" &&
          projection.columns.envelope_hash ===
            observation.request.envelope_hash
      );
      const resultRef = observation.result.returned_refs[0] ?? null;
      const accessedRef =
        resultRef ?? requestEnvelope.body?.ref ?? null;
      const resultProjection = accessedRef === null
        ? null
        : currentVersions.get(canonicalText([
            "objects",
            objectStructuralKey(accessedRef)
          ]));
      const richRow = resultRef === null
        ? null
        : richRowForObservation(sidecar, observation);
      if (
        !verifyIdempotencyEnvelopeBinding(
          receiverAuthentication,
          requestEnvelope,
          observation,
          richRow
        )
      ) {
        return false;
      }
      assert.ok(nonceProjection);
      const accessedObjectEvent = accessTrace.events.find(
        ({ store, method }) =>
          store === "objectsByRef" && method === "get"
      );
      const accessFacts = {
        runtime_key_id: observation.request.runtime_key_id,
        provider_key_id: COMPOSITE_FIXTURE.provider_key_id,
        principal_key_id: COMPOSITE_FIXTURE.principal_key_id,
        object_signing_key_id:
          accessedObjectEvent?.before_value
            ?.descriptor_issuer_signature?.key_id ?? null,
        nonce: nonceProjection.columns.nonce,
        database_key: richRow === null
          ? null
          : canonicalText([
              richRow.authority_namespace,
              richRow.idempotency_key
            ]),
        result_ref_key:
          accessedRef === null ? null : objectRefKey(accessedRef),
        identity_key: resultProjection?.columns.identity_key ?? null,
        result_preexisting: accessedRef === null
          ? false
          : sidecar.operational_versions.some(
              (version) =>
                version.table === "objects" &&
                version.structural_key ===
                  objectStructuralKey(accessedRef) &&
                version.valid_from_global_sequence < globalSequence
            ),
        grant_ref_key: observation.request.authorization_refs.length === 0
          ? null
          : objectRefKey(observation.request.authorization_refs[0])
      };
      assertRequiredAccessTrace(phase, accessTrace.events, accessFacts);
      if (
        !verifyAccessTraceValueBindings({
          sidecar,
          globalSequence,
          observation,
          events: accessTrace.events,
          facts: accessFacts,
          currentVersions
        }) ||
        !verifyDependencyManifestSemantics(
          dependencyEntries,
          currentVersions
        ) ||
        canonicalText(
          dependencyEntries
            .map(({ entry_key: entryKey, access_kind: accessKind }) => [
              entryKey,
              accessKind
            ])
            .sort((left, right) => compareUtf8(left[0], right[0]))
        ) !== canonicalText(
          [...expectedDependencyEntryKeys(
            phase,
            accessFacts,
            currentVersions
          ).entries()].sort(
            (left, right) => compareUtf8(left[0], right[0])
          )
        )
      ) {
        return false;
      }
      const dependencyProjectionKeys = new Set(
        dependencyEntries
          .map((entry) => entry.entry_key)
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
        ownerScopeCommitment(
          observation.access.owner_kind,
          observation.access.owner_id,
          observation.transaction.scope_sequence_after,
          ownerProjections
        ) !== observation.transaction.scope_state_commitment_after
      ) {
        return false;
      }
      if (!verifyGrantEffectHistory(
        sidecar,
        globalSequence,
        observation,
        dependencyEntries
      )) {
        return false;
      }
      if (observation.result.replayed) {
        const originRef =
          observation.result.idempotency.original_observation_ref;
        const originRepositoryRow = sidecar.observation_repository.find(
          (row) =>
            row.observation_id === originRef.artifact_id &&
            row.observation_hash === originRef.artifact_hash
        );
        const richRow = richRowForObservation(sidecar, observation);
        if (
          !originRepositoryRow ||
          originRepositoryRow.observation_ref_key !== canonicalText([
            originRef.artifact_schema,
            originRef.artifact_id,
            originRef.artifact_hash
          ]) ||
          !richRow ||
          richRow.kernel_result_hash !==
            observation.result.idempotency.original_result_hash ||
          richRow.origin_scope_sequence !==
            observation.result.idempotency.original_scope_sequence ||
          canonicalText(richRow.origin_observation_ref) !==
            canonicalText(originRef)
        ) {
          return false;
        }
      }
    }
    if (
      canonicalText([...expectedVersionKeys].sort(compareUtf8)) !==
        canonicalText([...versionKeys].sort(compareUtf8))
    ) {
      return false;
    }
    const latestByKey = new Map();
    for (const version of [...sidecar.operational_versions].sort(
      (left, right) =>
        left.valid_from_global_sequence -
          right.valid_from_global_sequence ||
        compareUtf8(
          canonicalText([left.table, left.structural_key]),
          canonicalText([right.table, right.structural_key])
        )
    )) {
      latestByKey.set(
        canonicalText([version.table, version.structural_key]),
        JSON.parse(version.canonical_row_bytes)
      );
    }
    const expectedCurrent = [...latestByKey.values()].sort((left, right) =>
      compareUtf8(projectionKey(left), projectionKey(right))
    );
    if (
      canonicalText(expectedCurrent) !==
        canonicalText(sidecar.current_projections)
    ) {
      return false;
    }
    return verifyOwnerHistories(sidecar) &&
      verifyRichIdempotencyState(sidecar);
  } catch {
    return false;
  }
}

export function verifyCompositeArtifactBinding(sidecar, trace) {
  try {
    const observation = trace.local_result.service_observation;
    const repositoryRow = sidecar.observation_repository.at(-1);
    const serviceCommit = sidecar.service_commits.at(-1);
    const scopeCommit = sidecar.scope_commits.at(-1);
    const accessTrace = sidecar.access_traces.at(-1);
    const callbackWitness = sidecar.callback_witnesses.at(-1);
    return trace.final_commit === true &&
      trace.callback_commit === true &&
      observation !== null &&
      verifyCompositeHistory(sidecar) &&
      canonicalText(trace.frozen_callback_value) ===
        canonicalText(trace.callback_value) &&
      canonicalText(trace.callback_value) ===
        canonicalText(trace.local_result.kernel) &&
      canonicalText(trace.callback_value) ===
        callbackWitness.canonical_result_bytes &&
      canonicalHash(trace.callback_value) ===
        callbackWitness.kernel_result_hash &&
      callbackWitness.kernel_result_hash ===
        observation.result.kernel_result_hash &&
      trace.callback_value.status === observation.result.status &&
      kernelResultMatchesObservation(
        trace.callback_value,
        observation,
        FROZEN_FOUNDATION.ajv.getSchema(
          observation.request.operation_contract.response_schema
        )
      ) &&
      accessTrace.global_sequence ===
        repositoryRow.global_commit_sequence &&
      accessTrace.envelope_hash === trace.envelope_hash &&
      canonicalText(accessTrace.events) ===
        canonicalText(trace.callback_access_trace) &&
      repositoryRow.canonical_observation_bytes ===
        canonicalText(observation) &&
      repositoryRow.observation_ref_key ===
        compositeObservationRefKey(observation) &&
      serviceCommit.observation_ref_key ===
        repositoryRow.observation_ref_key &&
      scopeCommit.observation_ref_key ===
        repositoryRow.observation_ref_key;
  } catch {
    return false;
  }
}

function replaceSignedObservation(
  sidecar,
  globalSequence,
  mutate,
  { refreshDependencyLinks = false } = {}
) {
  const repositoryIndex = sidecar.observation_repository.findIndex(
    (row) => row.global_commit_sequence === globalSequence
  );
  assert.notEqual(repositoryIndex, -1);
  const repositoryRow = sidecar.observation_repository[repositoryIndex];
  const prior = JSON.parse(repositoryRow.canonical_observation_bytes);
  const draft = structuredClone(prior);
  mutate(draft);
  draft.observation_hash = ZERO_HASH;
  draft.service_signature.signed_hash = ZERO_HASH;
  draft.service_signature.value = "A".repeat(86);
  const observation = bindAndSignServiceObservation(draft);
  const observationRefKey = compositeObservationRefKey(observation);
  const observationIndex = sidecar.observations.findIndex(
    (candidate) => candidate.observation_id === prior.observation_id
  );
  assert.notEqual(observationIndex, -1);
  sidecar.observations[observationIndex] = observation;
  sidecar.observation_repository[repositoryIndex] = {
    ...repositoryRow,
    observation_ref_key: observationRefKey,
    observation_hash: observation.observation_hash,
    request_envelope_hash: observation.request.envelope_hash,
    canonical_observation_bytes: canonicalText(observation),
    principal_id: observation.request.principal_id,
    owner_kind: observation.access.owner_kind,
    owner_id: observation.access.owner_id,
    visibility: observation.access.visibility,
    scope_sequence: observation.transaction.scope_sequence_after
  };
  const serviceCommit = sidecar.service_commits.find(
    (commit) => commit.global_commit_sequence === globalSequence
  );
  const scopeCommit = sidecar.scope_commits.find(
    (commit) => commit.global_sequence === globalSequence
  );
  assert.ok(serviceCommit);
  assert.ok(scopeCommit);
  serviceCommit.observation_ref_key = observationRefKey;
  scopeCommit.observation_ref_key = observationRefKey;
  if (refreshDependencyLinks) {
    const dependencyRows = sidecar.dependency_rows
      .filter((row) => row.global_sequence === globalSequence)
      .map(({ global_sequence: _globalSequence, ...entry }) => entry);
    const dependencyManifest = committedDependencyManifest(dependencyRows);
    const dependencyCommit = sidecar.dependency_commits.find(
      (commit) => commit.global_sequence === globalSequence
    );
    assert.ok(dependencyCommit);
    dependencyCommit.dependency_set_commitment =
      dependencyManifest.dependency_set_commitment;
    scopeCommit.dependency_set_commitment =
      dependencyManifest.dependency_set_commitment;
    if (
      observation.transaction.dependency_set_commitment !==
      dependencyManifest.dependency_set_commitment
    ) {
      replaceSignedObservation(
        sidecar,
        globalSequence,
        (linkedDraft) => {
          linkedDraft.transaction.dependency_set_commitment =
            dependencyManifest.dependency_set_commitment;
        }
      );
    }
  }
  return observation;
}

function kernelSnapshot(store) {
  return {
    used_nonces: [...store.usedNonces].sort(),
    maps: Object.fromEntries(MAP_NAMES.map((name) => [
      name,
      {
        size: store[name].size,
        hash: canonicalHash(sortedMapEntries(store[name]))
      }
    ]))
  };
}

function sidecarSnapshot(sidecar) {
  return {
    value: structuredClone(sidecar),
    hash: canonicalHash(sidecar)
  };
}

function emptySidecar() {
  return {
    global_sequence: 0,
    owner_sequences: {},
    rich_idempotency_rows: [],
    frozen_idempotency_rows: [],
    genesis_manifest: null,
    current_projections: [],
    operational_versions: [],
    dependency_rows: [],
    dependency_commits: [{
      global_sequence: 0,
      dependency_set_commitment: ZERO_HASH
    }],
    callback_witnesses: [],
    service_commits: [{
      global_commit_sequence: 0,
      previous_global_sequence: null,
      transaction_kind: "genesis",
      committed_at: COMPOSITE_FIXTURE.genesis_at,
      observation_ref_key: null
    }],
    scope_commits: [],
    observation_repository: [],
    observation_by_envelope: {},
    observations: [],
    validation_bindings: [],
    receiver_authentication_records: [],
    host_authentication_contexts: [],
    request_envelopes: [],
    access_traces: [],
    counters: {
      callback_calls: 0,
      observation_calls: 0,
      persistence_calls: 0,
      commit_calls: 0
    }
  };
}

function ownerSequenceKey(ownerKind, ownerId) {
  return canonicalText([ownerKind, ownerId]);
}

function upsertCurrentProjection(staged, projection) {
  const key = projectionKey(projection);
  const index = staged.current_projections.findIndex(
    (candidate) => projectionKey(candidate) === key
  );
  if (index === -1) staged.current_projections.push(structuredClone(projection));
  else staged.current_projections[index] = structuredClone(projection);
  staged.current_projections.sort((left, right) =>
    compareUtf8(projectionKey(left), projectionKey(right))
  );
}

function objectProjectionFromKernel(kernelDraft, resultRef, scopeSequence) {
  const refKey = objectRefKey(resultRef);
  const value = kernelDraft.objectsByRef.get(refKey);
  const access = kernelDraft.accessByRef.get(refKey);
  const retrievalUri = kernelDraft.urisByRef.get(refKey);
  assert.ok(value);
  assert.ok(access);
  assert.equal(typeof retrievalUri, "string");
  const identity = [...kernelDraft.refsByIdentity.entries()].find(
    ([, candidateRefKey]) => candidateRefKey === refKey
  );
  assert.ok(identity);
  const projection = {
    schema: "cairn.authoritative_row_projection.v0.1",
    table: "objects",
    structural_key: objectStructuralKey(resultRef),
    columns: {
      ref: structuredClone(resultRef),
      schema_id: value.schema,
      object_hash: resultRef.object_hash,
      identity_key: identity[0],
      retrieval_uri: retrievalUri,
      visibility: access.visibility,
      principal_id: access.principal_id,
      owner_scope_sequence: scopeSequence
    }
  };
  assert.equal(
    validateOperationalProjection(projection),
    true,
    JSON.stringify(validateOperationalProjection.errors)
  );
  return projection;
}

function idempotencyProjectionFromRichRow(row) {
  const structuralKeyCommitment =
    compositeIdempotencyStructuralKeyCommitment(
      canonicalText([row.authority_namespace, row.idempotency_key])
    );
  const projection = {
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
      result_ref: structuredClone(row.result_ref),
      kernel_result_hash: row.kernel_result_hash,
      origin_scope_sequence: row.origin_scope_sequence,
      created_scope_sequence: row.created_scope_sequence
    }
  };
  assert.equal(
    validateOperationalProjection(projection),
    true,
    JSON.stringify(validateOperationalProjection.errors)
  );
  return projection;
}

const RICH_IDEMPOTENCY_KEYS = [
  "actor_id",
  "authority_namespace",
  "created_global_commit_sequence",
  "created_scope_sequence",
  "idempotency_key",
  "kernel_result_hash",
  "operation_fingerprint",
  "operation_name",
  "origin_global_commit_sequence",
  "origin_observation_ref",
  "origin_scope_sequence",
  "principal_id",
  "result_ref",
  "runtime_key_id"
].sort(compareUtf8);

function hasExactKeys(value, expected) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    canonicalText(Object.keys(value).sort(compareUtf8)) ===
      canonicalText([...expected].sort(compareUtf8));
}

function verifyOwnerHistories(sidecar) {
  const byOwner = new Map();
  const seenScopes = new Set();
  for (const commit of sidecar.scope_commits) {
    const ownerKey = ownerSequenceKey(
      commit.owner_kind,
      commit.owner_id
    );
    const scopeKey = canonicalText([
      ownerKey,
      commit.scope_sequence
    ]);
    if (seenScopes.has(scopeKey)) return false;
    seenScopes.add(scopeKey);
    const commits = byOwner.get(ownerKey) ?? [];
    commits.push(commit);
    byOwner.set(ownerKey, commits);
  }
  const expectedCounters = {};
  for (const [ownerKey, commits] of byOwner) {
    commits.sort(
      (left, right) => left.global_sequence - right.global_sequence
    );
    for (let index = 0; index < commits.length; index += 1) {
      const prior = index === 0 ? 0 : commits[index - 1].scope_sequence;
      if (
        commits[index].scope_sequence !== prior + 1 ||
        commits[index].previous_scope_sequence !== prior
      ) {
        return false;
      }
    }
    expectedCounters[ownerKey] = commits.at(-1).scope_sequence;
  }
  return canonicalText(sidecar.owner_sequences) ===
    canonicalText(expectedCounters);
}

function verifyRichIdempotencyState(sidecar) {
  if (
    !Array.isArray(sidecar.rich_idempotency_rows) ||
    !Array.isArray(sidecar.frozen_idempotency_rows) ||
    sidecar.rich_idempotency_rows.length !==
      sidecar.frozen_idempotency_rows.length
  ) {
    return false;
  }
  const frozenByKey = new Map();
  for (const entry of sidecar.frozen_idempotency_rows) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== "string" ||
      frozenByKey.has(entry[0]) ||
      !hasExactKeys(entry[1], ["fingerprint", "result_ref"])
    ) {
      return false;
    }
    frozenByKey.set(entry[0], entry[1]);
  }
  const seenDatabaseKeys = new Set();
  const expectedProjectionKeys = new Set();
  for (const row of sidecar.rich_idempotency_rows) {
    if (!hasExactKeys(row, RICH_IDEMPOTENCY_KEYS)) return false;
    const databaseKey = canonicalText([
      row.authority_namespace,
      row.idempotency_key
    ]);
    if (seenDatabaseKeys.has(databaseKey)) return false;
    seenDatabaseKeys.add(databaseKey);
    const frozen = frozenByKey.get(databaseKey);
    if (
      !frozen ||
      frozen.fingerprint !== row.operation_fingerprint ||
      canonicalText(frozen.result_ref) !== canonicalText(row.result_ref) ||
      row.origin_global_commit_sequence !==
        row.created_global_commit_sequence ||
      row.origin_scope_sequence !== row.created_scope_sequence
    ) {
      return false;
    }
    const repositoryRow = sidecar.observation_repository.find(
      (candidate) =>
        candidate.observation_id ===
          row.origin_observation_ref?.artifact_id &&
        candidate.observation_hash ===
          row.origin_observation_ref?.artifact_hash
    );
    if (!repositoryRow) return false;
    const observation = JSON.parse(
      repositoryRow.canonical_observation_bytes
    );
    const serviceCommit = sidecar.service_commits.find(
      ({ global_commit_sequence: sequence }) =>
        sequence === row.origin_global_commit_sequence
    );
    const scopeCommit = sidecar.scope_commits.find(
      ({ global_sequence }) =>
        global_sequence === row.origin_global_commit_sequence
    );
    const structuralKeyCommitment =
      compositeIdempotencyStructuralKeyCommitment(databaseKey);
    const hostAuthenticationContext =
      sidecar.host_authentication_contexts.find(
        ({ global_sequence: sequence }) =>
          sequence === row.origin_global_commit_sequence
      )?.context;
    if (
      !verifyCompositeObservation(observation) ||
      row.origin_observation_ref.artifact_schema !== observation.schema ||
      repositoryRow.global_commit_sequence !==
        row.origin_global_commit_sequence ||
      repositoryRow.scope_sequence !== row.origin_scope_sequence ||
      observation.transaction.scope_sequence_after !==
        row.origin_scope_sequence ||
      observation.request.operation_contract.operation !==
        row.operation_name ||
      observation.request.principal_id !== row.principal_id ||
      observation.request.actor_id !== row.actor_id ||
      observation.request.runtime_key_id !== row.runtime_key_id ||
      !hostAuthenticationContext ||
      observation.request.host_authentication_context_hash !==
        hostAuthenticationContext.context_hash ||
      hostAuthenticationContext.principal_id !== row.principal_id ||
      hostAuthenticationContext.actor_id !== row.actor_id ||
      hostAuthenticationContext.runtime_key_id !== row.runtime_key_id ||
      hostAuthenticationContext.authority_namespace_commitment !==
        receiverAuthorityNamespaceCommitment(
          hostAuthenticationContext.account_tenant_commitment,
          row.authority_namespace
        ) ||
      observation.result.replayed !== false ||
      observation.result.outcome !== "success" ||
      observation.result.idempotency.disposition !== "created" ||
      observation.result.idempotency.structural_key_commitment !==
        structuralKeyCommitment ||
      observation.result.idempotency.original_result_hash !== null ||
      observation.result.idempotency.original_observation_ref !== null ||
      observation.result.idempotency.original_scope_sequence !== null ||
      observation.result.kernel_result_hash !== row.kernel_result_hash ||
      canonicalText(observation.result.returned_refs) !==
        canonicalText([row.result_ref]) ||
      serviceCommit?.transaction_kind !== "service_operation" ||
      serviceCommit.observation_ref_key !==
        repositoryRow.observation_ref_key ||
      scopeCommit?.scope_sequence !== row.origin_scope_sequence ||
      scopeCommit.owner_kind !== "principal" ||
      scopeCommit.owner_id !== row.principal_id
    ) {
      return false;
    }
    const projection = idempotencyProjectionFromRichRow(row);
    const expectedProjectionKey = projectionKey(projection);
    expectedProjectionKeys.add(expectedProjectionKey);
    const currentProjection = sidecar.current_projections.find(
      (candidate) => projectionKey(candidate) === expectedProjectionKey
    );
    const versions = sidecar.operational_versions.filter(
      (version) =>
        version.table === projection.table &&
        version.structural_key === projection.structural_key
    );
    if (
      canonicalText(currentProjection) !== canonicalText(projection) ||
      versions.length !== 1 ||
      versions[0].valid_from_global_sequence !==
        row.origin_global_commit_sequence ||
      versions[0].canonical_row_bytes !== canonicalText(projection) ||
      versions[0].canonical_row_hash !== canonicalHash(projection)
    ) {
      return false;
    }
    const originDependency = sidecar.dependency_rows.find(
      (entry) =>
        entry.global_sequence === row.origin_global_commit_sequence &&
        entry.entry_key === expectedProjectionKey
    );
    if (
      !originDependency ||
      originDependency.access_kind !== "read_absent_write_insert" ||
      originDependency.canonical_row_hash !== canonicalHash(projection)
    ) {
      return false;
    }
  }
  if (
    [...frozenByKey.keys()].some(
      (databaseKey) => !seenDatabaseKeys.has(databaseKey)
    )
  ) {
    return false;
  }
  const actualProjectionKeys = new Set(
    sidecar.current_projections
      .filter(({ table }) => table === "idempotency_records")
      .map(projectionKey)
  );
  return canonicalText([...actualProjectionKeys].sort(compareUtf8)) ===
    canonicalText([...expectedProjectionKeys].sort(compareUtf8));
}

function nonceProjection(context, ownerKind, ownerId, scopeSequence) {
  const projection = {
    schema: "cairn.authoritative_row_projection.v0.1",
    table: "used_nonces",
    structural_key: canonicalText([context.envelope.nonce]),
    columns: {
      nonce: context.envelope.nonce,
      envelope_hash: context.envelope.envelope_hash,
      operation: context.envelope.message_type,
      owner_kind: ownerKind,
      owner_id: ownerId,
      owner_scope_sequence: scopeSequence
    }
  };
  assert.equal(
    validateOperationalProjection(projection),
    true,
    JSON.stringify(validateOperationalProjection.errors)
  );
  return projection;
}

function referenceProjection(table, structuralKey, ref) {
  const projection = {
    schema: "cairn.authoritative_row_projection.v0.1",
    table,
    structural_key: structuralKey,
    columns: {
      ref: structuredClone(ref)
    }
  };
  assert.equal(
    validateOperationalProjection(projection),
    true,
    JSON.stringify(validateOperationalProjection.errors)
  );
  return projection;
}

function runtimeBindingProjection(kernelDraft, runtimeKeyId, foundation) {
  const value = kernelDraft.runtimeBindingsByKey.get(runtimeKeyId);
  assert.ok(value, `missing traced runtime binding ${runtimeKeyId}`);
  const schema = foundation.schemasByObjectId.get(value.schema);
  assert.ok(schema, `missing runtime-binding schema ${value.schema}`);
  const projection = {
    schema: "cairn.authoritative_row_projection.v0.1",
    table: "runtime_bindings",
    structural_key: canonicalText([runtimeKeyId]),
    columns: {
      runtime_key_id: runtimeKeyId,
      ref: objectRefFor(value, schema)
    }
  };
  assert.equal(
    validateOperationalProjection(projection),
    true,
    JSON.stringify(validateOperationalProjection.errors)
  );
  return projection;
}

function validationKeyProjection(keyResolver, keyId) {
  const record = keyResolver.get(keyId);
  assert.ok(record, `missing traced validation key ${keyId}`);
  const projection = {
    schema: "cairn.authoritative_row_projection.v0.1",
    table: "validation_keys",
    structural_key: canonicalText([keyId]),
    columns: {
      key_id: record.key_id,
      controller: record.controller,
      key_type: record.key_type,
      public_key: record.public_key,
      status: record.status,
      not_before: record.not_before,
      expires_at: record.expires_at,
      revocation_time: record.revocation_time,
      profile_revision: record.profile_revision ?? 1
    }
  };
  assert.equal(
    validateOperationalProjection(projection),
    true,
    JSON.stringify(validateOperationalProjection.errors)
  );
  return projection;
}

function traceKey(event) {
  assert.notEqual(event.key, null, `traced ${event.store}.${event.method} lacks key`);
  return JSON.parse(event.key);
}

const ACCESS_KIND_PRECEDENCE = new Map([
  ["read_absent", 0],
  ["read_present", 1],
  ["write_update", 2],
  ["write_insert", 3],
  ["read_present_write_update", 4],
  ["read_absent_write_insert", 5]
]);

function mergeDependencyEntry(entriesByKey, entry) {
  const prior = entriesByKey.get(entry.entry_key);
  if (!prior) {
    entriesByKey.set(entry.entry_key, entry);
    return;
  }
  assert.equal(prior.table_name, entry.table_name);
  assert.equal(prior.structural_key, entry.structural_key);
  assert.equal(prior.canonical_row_hash, entry.canonical_row_hash);
  if (
    ACCESS_KIND_PRECEDENCE.get(entry.access_kind) >
      ACCESS_KIND_PRECEDENCE.get(prior.access_kind)
  ) {
    entriesByKey.set(entry.entry_key, entry);
  }
}

function accessKindFromEvents(
  events,
  { finalValue = undefined } = {}
) {
  assert.ok(events.length > 0);
  const reads = events.filter(({ method }) =>
    method === "get" || method === "has"
  );
  const writes = events.filter(({ method }) =>
    method === "set" || method === "add" || method === "delete"
  );
  const readAbsent = reads.some(({ before_present }) => !before_present);
  const readPresent = reads.some(({ before_present }) => before_present);
  const writeStartedPresent = writes.some(({ before_present }) => before_present);
  const writeStartedAbsent = writes.some(({ before_present }) => !before_present);
  const finalHash = finalValue === undefined
    ? null
    : safeCanonicalHash(finalValue);
  const inPlaceUpdate = finalHash !== null && reads.some(
    ({ before_present, before_hash }) =>
      before_present && before_hash !== finalHash
  );
  if (readAbsent && (writes.length > 0 || inPlaceUpdate)) {
    return "read_absent_write_insert";
  }
  if (readPresent && (writes.length > 0 || inPlaceUpdate)) {
    return "read_present_write_update";
  }
  if (writes.length > 0) {
    return writeStartedPresent && !writeStartedAbsent
      ? "write_update"
      : "write_insert";
  }
  return readPresent ? "read_present" : "read_absent";
}

function normalizeAccessTrace({
  events,
  kernelDraft,
  keyResolver,
  foundation,
  resultRef,
  resultObjectProjection,
  idempotencyProjection,
  nonceRow,
  grantProjection
}) {
  const consumed = new Set();
  const entriesByKey = new Map();
  const seedProjectionsByKey = new Map();
  const byStore = new Map();
  for (const event of events) {
    const list = byStore.get(event.store) ?? [];
    list.push(event);
    byStore.set(event.store, list);
  }
  const consume = (event) => consumed.add(event.order);
  const addProjectionEntry = (projection, accessKind) =>
    mergeDependencyEntry(
      entriesByKey,
      dependencyEntryForProjection(projection, accessKind)
    );
  const addAliasEntry = (options) =>
    mergeDependencyEntry(entriesByKey, aliasDependencyEntry(options));
  const seed = (projection) => {
    seedProjectionsByKey.set(projectionKey(projection), projection);
  };
  const assertMethods = (store, allowed) => {
    for (const event of byStore.get(store) ?? []) {
      assert.ok(
        allowed.includes(event.method),
        `unsupported traced access ${store}.${event.method}`
      );
    }
  };
  const addJoinedObject = (ref) => {
    const projection = objectProjectionFromKernel(kernelDraft, ref, 0);
    seed(projection);
    addProjectionEntry(projection, "read_present");
    addAliasEntry({
      table: "objects",
      indexName: "primary_ref",
      attemptedKey: objectStructuralKey(ref),
      accessKind: "read_present",
      projection
    });
  };

  assertMethods("runtimeBindingsByKey", ["get"]);
  for (const event of byStore.get("runtimeBindingsByKey") ?? []) {
    assert.equal(event.before_present, true);
    const runtimeKeyId = traceKey(event);
    const projection =
      runtimeBindingProjection(kernelDraft, runtimeKeyId, foundation);
    seed(projection);
    addProjectionEntry(projection, "read_present");
    addAliasEntry({
      table: "runtime_bindings",
      indexName: "runtime_key_id",
      attemptedKey: canonicalText([runtimeKeyId]),
      accessKind: "read_present",
      projection
    });
    addJoinedObject(projection.columns.ref);
    consume(event);
  }

  assertMethods("keyResolver", ["get"]);
  for (const event of byStore.get("keyResolver") ?? []) {
    assert.equal(event.before_present, true);
    const keyId = traceKey(event);
    const projection = validationKeyProjection(keyResolver, keyId);
    seed(projection);
    addProjectionEntry(projection, "read_present");
    addAliasEntry({
      table: "validation_keys",
      indexName: "key_id",
      attemptedKey: canonicalText([keyId]),
      accessKind: "read_present",
      projection
    });
    consume(event);
  }

  for (const [store, table, indexName] of [
    ["dataGrantsByRef", "data_grants", "grant_ref"],
    ["effectDescriptorsByRef", "effect_descriptors", "effect_ref"]
  ]) {
    assertMethods(store, ["get"]);
    for (const event of byStore.get(store) ?? []) {
      assert.equal(event.before_present, true);
      const refKey = traceKey(event);
      const value = kernelDraft[store].get(refKey);
      assert.ok(value, `missing traced ${store} value`);
      const schema = foundation.schemasByObjectId.get(value.schema);
      assert.ok(schema, `missing ${store} schema ${value.schema}`);
      const ref = objectRefFor(value, schema);
      const projection = referenceProjection(
        table,
        objectStructuralKey(ref),
        ref
      );
      seed(projection);
      addProjectionEntry(projection, "read_present");
      addAliasEntry({
        table,
        indexName,
        attemptedKey: objectStructuralKey(ref),
        accessKind: "read_present",
        projection
      });
      addJoinedObject(ref);
      consume(event);
    }
  }

  assertMethods("usedNonces", ["has", "add"]);
  const nonceEvents = byStore.get("usedNonces") ?? [];
  if (nonceEvents.length > 0) {
    assert.ok(nonceEvents.every((event) =>
      traceKey(event) === nonceRow.columns.nonce
    ));
    addProjectionEntry(nonceRow, accessKindFromEvents(nonceEvents));
    for (const event of nonceEvents.filter(({ method }) => method === "has")) {
      addAliasEntry({
        table: "used_nonces",
        indexName: "nonce",
        attemptedKey: canonicalText([nonceRow.columns.nonce]),
        accessKind: event.before_present ? "read_present" : "read_absent",
        projection: event.before_present ? nonceRow : null
      });
    }
    nonceEvents.forEach(consume);
  }

  assertMethods("idempotencyRecords", ["get", "set"]);
  const idempotencyEvents = byStore.get("idempotencyRecords") ?? [];
  if (idempotencyEvents.length > 0) {
    assert.ok(idempotencyProjection);
    addProjectionEntry(
      idempotencyProjection,
      accessKindFromEvents(idempotencyEvents)
    );
    for (const event of idempotencyEvents.filter(
      ({ method }) => method === "get"
    )) {
      addAliasEntry({
        table: "idempotency_records",
        indexName: "authority_idempotency",
        attemptedKey: idempotencyProjection.structural_key,
        accessKind: event.before_present ? "read_present" : "read_absent",
        projection: event.before_present ? idempotencyProjection : null
      });
    }
    idempotencyEvents.forEach(consume);
  }

  const objectEvents = byStore.get("objectsByRef") ?? [];
  assertMethods("objectsByRef", ["get", "has", "set"]);
  if (objectEvents.length > 0) {
    assert.ok(resultRef);
    assert.ok(resultObjectProjection);
    const resultRefKey = objectRefKey(resultRef);
    assert.ok(objectEvents.every((event) => traceKey(event) === resultRefKey));
    addProjectionEntry(
      resultObjectProjection,
      accessKindFromEvents(objectEvents)
    );
    for (const event of objectEvents.filter(({ method }) =>
      method === "get" || method === "has"
    )) {
      addAliasEntry({
        table: "objects",
        indexName: "primary_ref",
        attemptedKey: objectStructuralKey(resultRef),
        accessKind: event.before_present ? "read_present" : "read_absent",
        projection: event.before_present ? resultObjectProjection : null
      });
    }
    objectEvents.forEach(consume);
  }

  for (const [store, indexName] of [
    ["refsByIdentity", "identity_key"],
    ["urisByRef", "uri_by_ref"],
    ["accessByRef", "access_by_ref"]
  ]) {
    assertMethods(store, ["get", "set"]);
    const storeEvents = byStore.get(store) ?? [];
    for (const event of storeEvents) {
      if (event.method === "get") {
        assert.ok(resultRef);
        assert.ok(resultObjectProjection);
        addAliasEntry({
          table: "objects",
          indexName,
          attemptedKey: store === "refsByIdentity"
            ? traceKey(event)
            : objectStructuralKey(resultRef),
          accessKind: event.before_present ? "read_present" : "read_absent",
          projection: event.before_present ? resultObjectProjection : null
        });
      }
      consume(event);
    }
  }

  assertMethods("grantStatesByRef", ["get"]);
  const grantEvents = byStore.get("grantStatesByRef") ?? [];
  if (grantEvents.length > 0) {
    assert.ok(grantProjection);
    const accessKind = accessKindFromEvents(
      grantEvents,
      {
        finalValue: kernelDraft.grantStatesByRef.get(
          traceKey(grantEvents[0])
        )
      }
    );
    addProjectionEntry(grantProjection, accessKind);
    for (const event of grantEvents) {
      addAliasEntry({
        table: "grant_state",
        indexName: "grant_state_ref",
        attemptedKey: objectStructuralKey(
          grantProjection.columns.grant_ref
        ),
        accessKind: event.before_present ? "read_present" : "read_absent",
        projection: event.before_present ? grantProjection : null
      });
      consume(event);
    }
  }

  const unconsumed = events.filter(({ order }) => !consumed.has(order));
  assert.deepEqual(
    unconsumed,
    [],
    `unconsumed callback accesses: ${unconsumed.map(
      ({ store, method, order }) => `${order}:${store}.${method}`
    ).join(", ")}`
  );
  assert.equal(consumed.size, events.length);
  return {
    dependencyEntries: [...entriesByKey.values()],
    seedProjections: [...seedProjectionsByKey.values()]
  };
}

function expectedAccessTrace(phase, facts) {
  const event = (
    store,
    method,
    key,
    beforePresent,
    afterPresent
  ) => ({
    store,
    method,
    key: canonicalMaybe(key),
    before_present: beforePresent,
    after_present: afterPresent
  });
  const runtime = facts.runtime_key_id;
  const provider = facts.provider_key_id;
  const principal = facts.principal_key_id;
  const nonce = facts.nonce;
  if (phase === "capabilities") {
    return [
      event("runtimeBindingsByKey", "get", runtime, true, true),
      event("keyResolver", "get", runtime, true, true),
      event("usedNonces", "has", nonce, false, false),
      event("keyResolver", "get", provider, true, true),
      event("keyResolver", "get", runtime, true, true),
      event("keyResolver", "get", provider, true, true),
      event("keyResolver", "get", runtime, true, true),
      event("usedNonces", "has", nonce, false, false),
      event("keyResolver", "get", provider, true, true),
      event("keyResolver", "get", runtime, true, true),
      event("keyResolver", "get", provider, true, true),
      event("usedNonces", "add", nonce, false, true)
    ];
  }
  if (phase === "accepted_failure") {
    const accessedRefKey = facts.result_ref_key;
    return [
      event("runtimeBindingsByKey", "get", runtime, true, true),
      event("keyResolver", "get", runtime, true, true),
      event("usedNonces", "has", nonce, false, false),
      event("keyResolver", "get", provider, true, true),
      event("keyResolver", "get", runtime, true, true),
      event("keyResolver", "get", provider, true, true),
      event("accessByRef", "get", accessedRefKey, true, true),
      event("keyResolver", "get", runtime, true, true),
      event("usedNonces", "has", nonce, false, false),
      event("keyResolver", "get", provider, true, true),
      event("keyResolver", "get", runtime, true, true),
      event("keyResolver", "get", provider, true, true),
      event("usedNonces", "add", nonce, false, true),
      event("objectsByRef", "get", accessedRefKey, true, true),
      event("urisByRef", "get", accessedRefKey, true, true),
      event(
        "keyResolver",
        "get",
        facts.object_signing_key_id,
        true,
        true
      )
    ];
  }
  const databaseKey = facts.database_key;
  const resultRefKey = facts.result_ref_key;
  if (phase === "replay") {
    return [
      event("runtimeBindingsByKey", "get", runtime, true, true),
      event("keyResolver", "get", runtime, true, true),
      event("usedNonces", "has", nonce, false, false),
      event("keyResolver", "get", provider, true, true),
      event("keyResolver", "get", runtime, true, true),
      event("keyResolver", "get", provider, true, true),
      event("idempotencyRecords", "get", databaseKey, true, true),
      event("usedNonces", "add", nonce, false, true),
      event("accessByRef", "get", resultRefKey, true, true),
      event("objectsByRef", "get", resultRefKey, true, true),
      event("urisByRef", "get", resultRefKey, true, true),
      event("keyResolver", "get", principal, true, true)
    ];
  }
  assert.equal(phase, "origin");
  const grantRefKey = facts.grant_ref_key;
  const identityKey = facts.identity_key;
  const resultPreexisting = facts.result_preexisting === true;
  return [
    event("runtimeBindingsByKey", "get", runtime, true, true),
    event("keyResolver", "get", runtime, true, true),
    event("usedNonces", "has", nonce, false, false),
    event("keyResolver", "get", provider, true, true),
    event("keyResolver", "get", runtime, true, true),
    event("keyResolver", "get", provider, true, true),
    event("idempotencyRecords", "get", databaseKey, false, false),
    event("keyResolver", "get", runtime, true, true),
    event("usedNonces", "has", nonce, false, false),
    event("keyResolver", "get", provider, true, true),
    event("keyResolver", "get", runtime, true, true),
    event("keyResolver", "get", provider, true, true),
    event("keyResolver", "get", principal, true, true),
    event("idempotencyRecords", "get", databaseKey, false, false),
    event(
      "urisByRef",
      "get",
      resultRefKey,
      resultPreexisting,
      resultPreexisting
    ),
    event("dataGrantsByRef", "get", grantRefKey, true, true),
    event("keyResolver", "get", principal, true, true),
    event("keyResolver", "get", principal, true, true),
    event("grantStatesByRef", "get", grantRefKey, true, true),
    event("keyResolver", "get", principal, true, true),
    event("idempotencyRecords", "set", databaseKey, false, true),
    event("usedNonces", "add", nonce, false, true),
    event(
      "refsByIdentity",
      "get",
      identityKey,
      resultPreexisting,
      resultPreexisting
    ),
    event(
      "objectsByRef",
      "has",
      resultRefKey,
      resultPreexisting,
      resultPreexisting
    ),
    ...(resultPreexisting
      ? [
          event("urisByRef", "get", resultRefKey, true, true),
          event("accessByRef", "get", resultRefKey, true, true)
        ]
      : []),
    event(
      "objectsByRef",
      "set",
      resultRefKey,
      resultPreexisting,
      true
    ),
    event(
      "refsByIdentity",
      "set",
      identityKey,
      resultPreexisting,
      true
    ),
    event(
      "urisByRef",
      "set",
      resultRefKey,
      resultPreexisting,
      true
    ),
    event(
      "accessByRef",
      "set",
      resultRefKey,
      resultPreexisting,
      true
    ),
    event("grantStatesByRef", "get", grantRefKey, true, true),
    event("grantStatesByRef", "get", grantRefKey, true, true)
  ];
}

function assertRequiredAccessTrace(phase, events, facts) {
  const expected = expectedAccessTrace(phase, facts);
  assert.deepEqual(
    events.map(({
      store,
      method,
      key,
      before_present,
      after_present
    }) => ({
      store,
      method,
      key,
      before_present,
      after_present
    })),
    expected,
    `${phase} callback access plan changed`
  );
  assert.deepEqual(
    events.map(({ order }) => order),
    events.map((_, index) => index + 1),
    `${phase} callback access order is not contiguous`
  );
  for (const event of events) {
    assert.notEqual(event.key, null);
    assert.equal(canonicalMaybe(JSON.parse(event.key)), event.key);
    assert.equal(
      event.before_hash,
      event.before_value === null
        ? null
        : canonicalHash(event.before_value)
    );
    assert.equal(
      event.after_hash,
      event.after_value === null
        ? null
        : canonicalHash(event.after_value)
    );
    if (event.method === "get") {
      assert.equal(event.before_present, event.after_present);
      assert.equal(event.before_hash, event.after_hash);
      assert.equal(event.before_present, event.before_hash !== null);
    } else if (event.method === "has" || event.method === "add") {
      assert.equal(event.before_hash, canonicalHash(event.before_present));
      assert.equal(event.after_hash, canonicalHash(event.after_present));
    } else if (event.method === "set") {
      assert.equal(event.after_present, true);
      assert.notEqual(event.after_hash, null);
      assert.equal(event.before_present, event.before_hash !== null);
    } else {
      assert.fail(`unexpected access method ${event.method}`);
    }
  }
}

function verifyAccessTraceValueBindings({
  sidecar,
  globalSequence,
  observation,
  events,
  facts,
  currentVersions
}) {
  try {
    const projection = (table, structuralKey) =>
      currentVersions.get(canonicalText([table, structuralKey]));
    const resultStructuralKey = facts.result_ref_key === null
      ? null
      : objectStructuralKeyFromRefKey(facts.result_ref_key);
    const resultProjection = resultStructuralKey === null
      ? null
      : projection("objects", resultStructuralKey);
    const frozenRow = facts.database_key === null
      ? null
      : new Map(sidecar.frozen_idempotency_rows).get(facts.database_key);
    const grantEffect = observation.result.grant_effects[0] ?? null;
    for (const event of events) {
      const key = JSON.parse(event.key);
      const value = event.method === "set" || event.method === "add"
        ? event.after_value
        : event.before_value;
      if (
        event.method === "set" &&
        event.before_present &&
        canonicalText(event.before_value) !==
          canonicalText(event.after_value)
      ) {
        return false;
      }
      if (event.store === "usedNonces") {
        if (
          typeof value !== "boolean" ||
          canonicalText(value) !==
            canonicalText(event.method === "add" ? true : false)
        ) {
          return false;
        }
        continue;
      }
      if (!event.before_present && event.method !== "set") {
        if (event.method === "has") {
          if (value !== false) return false;
          continue;
        }
        if (value !== null) return false;
        continue;
      }
      if (event.store === "runtimeBindingsByKey") {
        const runtimeProjection = projection(
          "runtime_bindings",
          canonicalText([key])
        );
        const schema = FROZEN_FOUNDATION.schemasByObjectId.get(value.schema);
        if (
          !runtimeProjection ||
          !schema ||
          !verifySignedObjectWitness(
            value,
            currentVersions,
            observation.observed_at
          ) ||
          canonicalText(objectRefFor(value, schema)) !==
            canonicalText(runtimeProjection.columns.ref)
        ) {
          return false;
        }
      } else if (event.store === "keyResolver") {
        const keyProjection = projection(
          "validation_keys",
          canonicalText([key])
        );
        if (
          !keyProjection ||
          canonicalText(value) !== canonicalText(keyProjection.columns)
        ) {
          return false;
        }
      } else if (event.store === "dataGrantsByRef") {
        const grantStructuralKey = objectStructuralKeyFromRefKey(key);
        const grantProjection = projection(
          "data_grants",
          grantStructuralKey
        );
        const schema = FROZEN_FOUNDATION.schemasByObjectId.get(value.schema);
        if (
          !grantProjection ||
          !schema ||
          !verifySignedObjectWitness(
            value,
            currentVersions,
            observation.observed_at
          ) ||
          canonicalText(objectRefFor(value, schema)) !==
            canonicalText(grantProjection.columns.ref)
        ) {
          return false;
        }
      } else if (event.store === "grantStatesByRef") {
        if (
          !grantEffect ||
          canonicalText({
            status: value.status,
            revocation_nonce: value.revocation_nonce,
            remaining_disclosures: value.remaining_disclosures
          }) !== canonicalText({
            status: "active",
            revocation_nonce:
              projection(
                "grant_state",
                objectStructuralKey(grantEffect.grant_ref)
              ).columns.revocation_nonce,
            remaining_disclosures: grantEffect.remaining_before
          })
        ) {
          return false;
        }
      } else if (event.store === "idempotencyRecords") {
        if (
          !frozenRow ||
          canonicalText(value) !== canonicalText(frozenRow)
        ) {
          return false;
        }
      } else if (event.store === "objectsByRef") {
        if (event.method === "has") {
          if (
            value !== true ||
            !resultProjection
          ) {
            return false;
          }
          continue;
        }
        const schema = FROZEN_FOUNDATION.schemasByObjectId.get(value.schema);
        if (
          !resultProjection ||
          !schema ||
          !verifySignedObjectWitness(
            value,
            currentVersions,
            observation.observed_at
          ) ||
          canonicalText(objectRefFor(value, schema)) !==
            canonicalText(resultProjection.columns.ref)
        ) {
          return false;
        }
      } else if (event.store === "refsByIdentity") {
        if (value !== facts.result_ref_key) {
          return false;
        }
      } else if (event.store === "urisByRef") {
        if (
          !resultProjection ||
          value !== resultProjection.columns.retrieval_uri
        ) {
          return false;
        }
      } else if (event.store === "accessByRef") {
        if (
          !resultProjection ||
          canonicalText(value) !== canonicalText({
            visibility: resultProjection.columns.visibility,
            principal_id: resultProjection.columns.principal_id
          })
        ) {
          return false;
        }
      } else {
        return false;
      }
    }
    const trace = sidecar.access_traces.find(
      ({ global_sequence: sequence }) => sequence === globalSequence
    );
    return trace !== undefined &&
      trace.events_commitment === canonicalHash(events);
  } catch {
    return false;
  }
}

function aliasAttemptedKeyForProjection(indexName, projection) {
  const columns = projection.columns;
  if (
    ["primary_ref", "uri_by_ref", "access_by_ref"].includes(indexName)
  ) {
    return objectStructuralKey(columns.ref);
  }
  if (indexName === "identity_key") return columns.identity_key;
  if (indexName === "runtime_key_id") {
    return canonicalText([columns.runtime_key_id]);
  }
  if (indexName === "grant_ref" || indexName === "effect_ref") {
    return objectStructuralKey(columns.ref);
  }
  if (indexName === "key_id") return canonicalText([columns.key_id]);
  if (indexName === "grant_state_ref") {
    return objectStructuralKey(columns.grant_ref);
  }
  if (indexName === "nonce") return canonicalText([columns.nonce]);
  if (indexName === "authority_idempotency") {
    return canonicalText([columns.structural_key_commitment]);
  }
  return null;
}

function verifyDependencyManifestSemantics(
  dependencyEntries,
  currentVersions
) {
  const admittedAliases = {
    objects: ["primary_ref", "identity_key", "uri_by_ref", "access_by_ref"],
    runtime_bindings: ["runtime_key_id"],
    data_grants: ["grant_ref"],
    effect_descriptors: ["effect_ref"],
    validation_keys: ["key_id"],
    grant_state: ["grant_state_ref"],
    used_nonces: ["nonce"],
    idempotency_records: ["authority_idempotency"]
  };
  const entriesByKey = new Map();
  let priorEntryKey = null;
  for (const entry of dependencyEntries) {
    if (
      entry.entry_key !== canonicalText([
        entry.table_name,
        entry.structural_key
      ]) ||
      entriesByKey.has(entry.entry_key) ||
      (
        priorEntryKey !== null &&
        compareUtf8(priorEntryKey, entry.entry_key) >= 0
      )
    ) {
      return false;
    }
    priorEntryKey = entry.entry_key;
    entriesByKey.set(entry.entry_key, entry);
  }
  for (const entry of dependencyEntries) {
    const structural = JSON.parse(entry.structural_key);
    const alias = structural.length === 3 &&
      structural[0] === "index" &&
      typeof structural[1] === "string" &&
      typeof structural[2] === "string";
    if (!alias) {
      const projection = currentVersions.get(entry.entry_key);
      if (
        !projection ||
        !validateOperationalProjection(projection) ||
        projection.table !== entry.table_name ||
        projection.structural_key !== entry.structural_key ||
        canonicalHash(projection) !== entry.canonical_row_hash ||
        entry.access_kind === "read_absent"
      ) {
        return false;
      }
      continue;
    }
    const [, indexName, attemptedKey] = structural;
    let attemptedTuple;
    try {
      attemptedTuple = JSON.parse(attemptedKey);
    } catch {
      return false;
    }
    if (
      !Array.isArray(attemptedTuple) ||
      canonicalText(attemptedTuple) !== attemptedKey ||
      !admittedAliases[entry.table_name]?.includes(indexName) ||
      !["read_present", "read_absent"].includes(entry.access_kind)
    ) {
      return false;
    }
    const candidates = [...currentVersions.entries()]
      .filter(([, projection]) => projection.table === entry.table_name)
      .filter(([, projection]) =>
        aliasAttemptedKeyForProjection(indexName, projection) === attemptedKey
      );
    if (entry.access_kind === "read_absent") {
      const conflicting = candidates.some(([baseEntryKey]) => {
        const baseEntry = entriesByKey.get(baseEntryKey);
        return !baseEntry || !baseEntry.access_kind.includes("write");
      });
      if (
        conflicting ||
        entry.canonical_row_hash !== canonicalHash([
          "cairn-authoritative-absent-row-v0.1",
          entry.table_name,
          indexName,
          attemptedKey
        ])
      ) {
        return false;
      }
      continue;
    }
    if (candidates.length !== 1) return false;
    const [baseEntryKey, projection] = candidates[0];
    const baseEntry = entriesByKey.get(baseEntryKey);
    if (
      !baseEntry ||
      baseEntry.table_name !== entry.table_name ||
      baseEntry.canonical_row_hash !== entry.canonical_row_hash ||
      canonicalHash(projection) !== entry.canonical_row_hash
    ) {
      return false;
    }
  }
  return true;
}

function expectedDependencyEntryKeys(phase, facts, currentVersions) {
  const keys = new Map();
  const base = (table, structuralKey, accessKind = "read_present") => {
    const entryKey = canonicalText([table, structuralKey]);
    assert.ok(currentVersions.has(entryKey), `missing ${entryKey}`);
    keys.set(entryKey, accessKind);
    return currentVersions.get(entryKey);
  };
  const alias = (
    table,
    indexName,
    attemptedKey,
    accessKind = "read_present"
  ) => {
    keys.set(canonicalText([
      table,
      canonicalText(["index", indexName, attemptedKey])
    ]), accessKind);
  };
  const runtimeProjection = base(
    "runtime_bindings",
    canonicalText([facts.runtime_key_id])
  );
  alias(
    "runtime_bindings",
    "runtime_key_id",
    canonicalText([facts.runtime_key_id])
  );
  const runtimeObject = base(
    "objects",
    objectStructuralKey(runtimeProjection.columns.ref)
  );
  alias(
    "objects",
    "primary_ref",
    objectStructuralKey(runtimeObject.columns.ref)
  );
  const expectedEvents = expectedAccessTrace(phase, facts);
  const validationKeyIds = new Set(
    expectedEvents
      .filter(
        ({ store, method }) =>
          store === "keyResolver" && method === "get"
      )
      .map(({ key }) => JSON.parse(key))
  );
  for (const keyId of validationKeyIds) {
    base("validation_keys", canonicalText([keyId]));
    alias("validation_keys", "key_id", canonicalText([keyId]));
  }
  const nonceStructuralKey = canonicalText([facts.nonce]);
  base("used_nonces", nonceStructuralKey, "read_absent_write_insert");
  alias("used_nonces", "nonce", nonceStructuralKey, "read_absent");
  if (phase === "capabilities") return keys;

  const resultProjection = base(
    "objects",
    objectStructuralKeyFromRefKey(facts.result_ref_key),
    phase === "origin"
      ? (
          facts.result_preexisting
            ? "read_present_write_update"
            : "read_absent_write_insert"
        )
      : "read_present"
  );
  alias(
    "objects",
    "primary_ref",
    objectStructuralKey(resultProjection.columns.ref),
    phase === "origin" && !facts.result_preexisting
      ? "read_absent"
      : "read_present"
  );
  if (phase === "origin") {
    alias(
      "objects",
      "identity_key",
      facts.identity_key,
      facts.result_preexisting ? "read_present" : "read_absent"
    );
    alias(
      "objects",
      "uri_by_ref",
      objectStructuralKey(resultProjection.columns.ref),
      facts.result_preexisting ? "read_present" : "read_absent"
    );
    if (facts.result_preexisting) {
      alias(
        "objects",
        "access_by_ref",
        objectStructuralKey(resultProjection.columns.ref),
        "read_present"
      );
    }
  } else {
    alias(
      "objects",
      "access_by_ref",
      objectStructuralKey(resultProjection.columns.ref)
    );
    alias(
      "objects",
      "uri_by_ref",
      objectStructuralKey(resultProjection.columns.ref)
    );
  }
  if (phase === "accepted_failure") return keys;
  const idempotencyStructuralKey = canonicalText([
    compositeIdempotencyStructuralKeyCommitment(facts.database_key)
  ]);
  const idempotencyProjection = currentVersions.get(canonicalText([
    "idempotency_records",
    idempotencyStructuralKey
  ]));
  assert.ok(idempotencyProjection);
  base(
    "idempotency_records",
    idempotencyProjection.structural_key,
    phase === "origin"
      ? "read_absent_write_insert"
      : "read_present"
  );
  alias(
    "idempotency_records",
    "authority_idempotency",
    idempotencyProjection.structural_key,
    phase === "origin" ? "read_absent" : "read_present"
  );
  if (phase === "origin") {
    const grantStructuralKey =
      objectStructuralKeyFromRefKey(facts.grant_ref_key);
    const grantProjection = base("data_grants", grantStructuralKey);
    alias("data_grants", "grant_ref", grantStructuralKey);
    const grantObject = base(
      "objects",
      objectStructuralKey(grantProjection.columns.ref)
    );
    alias(
      "objects",
      "primary_ref",
      objectStructuralKey(grantObject.columns.ref)
    );
    base(
      "grant_state",
      grantStructuralKey,
      "read_present_write_update"
    );
    alias("grant_state", "grant_state_ref", grantStructuralKey);
  }
  return keys;
}

function grantStateProjection(
  kernelDraft,
  grantRef,
  scopeSequence,
  priorProjection
) {
  const state = kernelDraft.grantStatesByRef.get(objectRefKey(grantRef));
  assert.ok(state);
  const projection = {
    schema: "cairn.authoritative_row_projection.v0.1",
    table: "grant_state",
    structural_key: objectStructuralKey(grantRef),
    columns: {
      grant_ref: structuredClone(grantRef),
      status: state.status,
      revocation_nonce: state.revocation_nonce,
      remaining_disclosures: state.remaining_disclosures,
      state_version: (priorProjection?.columns.state_version ?? 0) + 1,
      owner_scope_sequence: scopeSequence
    }
  };
  assert.equal(
    validateOperationalProjection(projection),
    true,
    JSON.stringify(validateOperationalProjection.errors)
  );
  return projection;
}

function priorGrantStateProjection(
  finalProjection,
  finalState
) {
  assert.ok(finalState.remaining_disclosures >= 0);
  const projection = {
    schema: "cairn.authoritative_row_projection.v0.1",
    table: "grant_state",
    structural_key: finalProjection.structural_key,
    columns: {
      grant_ref: structuredClone(finalProjection.columns.grant_ref),
      status: finalState.status,
      revocation_nonce: finalState.revocation_nonce,
      remaining_disclosures: finalState.remaining_disclosures + 1,
      state_version: finalProjection.columns.state_version - 1,
      owner_scope_sequence: 0
    }
  };
  assert.equal(
    validateOperationalProjection(projection),
    true,
    JSON.stringify(validateOperationalProjection.errors)
  );
  return projection;
}

function initialGrantStateProjection(kernelDraft, grantRef) {
  const state = kernelDraft.grantStatesByRef.get(objectRefKey(grantRef));
  assert.ok(state);
  const projection = {
    schema: "cairn.authoritative_row_projection.v0.1",
    table: "grant_state",
    structural_key: objectStructuralKey(grantRef),
    columns: {
      grant_ref: structuredClone(grantRef),
      status: state.status,
      revocation_nonce: state.revocation_nonce,
      remaining_disclosures: state.remaining_disclosures,
      state_version: 0,
      owner_scope_sequence: 0
    }
  };
  assert.equal(
    validateOperationalProjection(projection),
    true,
    JSON.stringify(validateOperationalProjection.errors)
  );
  return projection;
}

function compositeGenesisManifest(stores, foundation, keyResolver) {
  const rowsByKey = new Map();
  const add = (projection) => {
    const key = projectionKey(projection);
    const prior = rowsByKey.get(key);
    if (prior !== undefined) {
      assert.equal(canonicalText(prior), canonicalText(projection));
    } else {
      rowsByKey.set(key, projection);
    }
  };
  for (const value of stores.objectsByRef.values()) {
    const schema = foundation.schemasByObjectId.get(value.schema);
    assert.ok(schema);
    add(objectProjectionFromKernel(
      stores,
      objectRefFor(value, schema),
      0
    ));
  }
  for (const runtimeKeyId of stores.runtimeBindingsByKey.keys()) {
    add(runtimeBindingProjection(stores, runtimeKeyId, foundation));
  }
  for (const value of stores.dataGrantsByRef.values()) {
    const ref = objectRefFor(
      value,
      foundation.schemasByObjectId.get(value.schema)
    );
    add(referenceProjection(
      "data_grants",
      objectStructuralKey(ref),
      ref
    ));
  }
  for (const value of stores.effectDescriptorsByRef.values()) {
    const ref = objectRefFor(
      value,
      foundation.schemasByObjectId.get(value.schema)
    );
    add(referenceProjection(
      "effect_descriptors",
      objectStructuralKey(ref),
      ref
    ));
  }
  for (const keyId of keyResolver.keys()) {
    add(validationKeyProjection(keyResolver, keyId));
  }
  for (const value of stores.dataGrantsByRef.values()) {
    const ref = objectRefFor(
      value,
      foundation.schemasByObjectId.get(value.schema)
    );
    if (stores.grantStatesByRef.has(objectRefKey(ref))) {
      add(initialGrantStateProjection(stores, ref));
    }
  }
  const initialRows = [...rowsByKey.values()].sort(
    (left, right) => compareUtf8(projectionKey(left), projectionKey(right))
  );
  const validationManifestHash =
    genesisValidationManifestHash(initialRows);
  const manifest = bindObjectHash({
    schema: "cairn.genesis_manifest.v0.1",
    manifest_id: deterministicUuid("genesis-manifest", 0),
    manifest_hash: ZERO_HASH,
    store_id: COMPOSITE_FIXTURE.store_id,
    kernel_profile: "cairn-proposal-foundation-v0.1",
    bundle_hash: foundation.bundleHash,
    private_projection_key_commitment: canonicalHash([
      "cairn-composite-private-projection-key-v0.1",
      COMPOSITE_FIXTURE.store_id
    ]),
    service_key_profile_ref: {
      artifact_schema: SERVICE_KEY_PROFILE.schema,
      artifact_id: SERVICE_KEY_PROFILE.profile_id,
      artifact_hash: SERVICE_KEY_PROFILE.profile_hash
    },
    validation_key_manifest_ref: {
      artifact_schema: "cairn.fixture_validation_key_manifest.v0.1",
      artifact_id: deterministicUuid("validation-key-manifest", 0),
      artifact_hash: validationManifestHash
    },
    initial_rows: initialRows
  }, AUTHORITATIVE_SCHEMA.$defs.genesisManifest);
  assert.equal(
    validateGenesisManifest(manifest),
    true,
    JSON.stringify(validateGenesisManifest.errors)
  );
  return manifest;
}

function verifyGrantEffectHistory(
  sidecar,
  globalSequence,
  observation,
  dependencyEntries
) {
  const effects = observation.result.grant_effects;
  const updateEntries = dependencyEntries.filter(
    (entry) =>
      entry.table_name === "grant_state" &&
      entry.access_kind === "read_present_write_update" &&
      JSON.parse(entry.structural_key)[0] !== "index"
  );
  if (effects.length !== updateEntries.length) return false;
  const seen = new Set();
  for (const effect of effects) {
    const structuralKey = objectStructuralKey(effect.grant_ref);
    if (seen.has(structuralKey)) return false;
    seen.add(structuralKey);
    if (
      !observation.request.authorization_refs.some(
        (ref) => canonicalText(ref) === canonicalText(effect.grant_ref)
      )
    ) {
      return false;
    }
    const dependency = updateEntries.find(
      (entry) => entry.structural_key === structuralKey
    );
    const versions = sidecar.operational_versions
      .filter(
        (version) =>
          version.table === "grant_state" &&
          version.structural_key === structuralKey &&
          version.valid_from_global_sequence <= globalSequence
      )
      .sort(
        (left, right) =>
          left.valid_from_global_sequence -
          right.valid_from_global_sequence
      );
    const afterVersion = versions.find(
      ({ valid_from_global_sequence }) =>
        valid_from_global_sequence === globalSequence
    );
    const beforeVersion = versions
      .filter(
        ({ valid_from_global_sequence }) =>
          valid_from_global_sequence < globalSequence
      )
      .at(-1);
    if (!dependency || !beforeVersion || !afterVersion) return false;
    const before = JSON.parse(beforeVersion.canonical_row_bytes);
    const after = JSON.parse(afterVersion.canonical_row_bytes);
    if (
      beforeVersion.canonical_row_hash !== canonicalHash(before) ||
      afterVersion.canonical_row_hash !== canonicalHash(after) ||
      dependency.canonical_row_hash !== canonicalHash(after) ||
      canonicalText(before.columns.grant_ref) !==
        canonicalText(effect.grant_ref) ||
      canonicalText(after.columns.grant_ref) !==
        canonicalText(effect.grant_ref) ||
      before.columns.status !== after.columns.status ||
      before.columns.revocation_nonce !== after.columns.revocation_nonce ||
      before.columns.state_version !== effect.state_version_before ||
      after.columns.state_version !== effect.state_version_after ||
      before.columns.remaining_disclosures !== effect.remaining_before ||
      after.columns.remaining_disclosures !== effect.remaining_after ||
      effect.state_version_after !== effect.state_version_before + 1 ||
      effect.remaining_after !== effect.remaining_before - 1
    ) {
      return false;
    }
  }
  return true;
}

function stageAuthoritativeCommit(
  sidecar,
  context,
  outcome,
  kernelDraft,
  accessTrace,
  operation,
  foundation,
  keyResolver
) {
  const staged = structuredClone(sidecar);
  let activeStage = "observation";
  try {
  const ownerId =
    context.authentication.principalId ?? context.authentication.actorId;
  const ownerKind =
    context.authentication.principalId === null ? "actor" : "principal";
  const ownerKey = ownerSequenceKey(ownerKind, ownerId);
  const scopeBefore = staged.owner_sequences[ownerKey] ?? 0;
  const scopeAfter = scopeBefore + 1;
  const globalBefore = staged.global_sequence;
  const globalAfter = globalBefore + 1;
  const observationId = deterministicUuid("observation", globalAfter);
  const snapshotId = deterministicUuid("snapshot", globalAfter);
  const contract = {
    operation: operation.name,
    request_schema: operation.request_schema,
    response_schema: operation.response_schema,
    consequence: operation.consequence
  };
  const validationBinding = {
    global_sequence: globalAfter,
    authoritative_schema_hash: AUTHORITATIVE_SCHEMA_HASH,
    frozen_bundle_hash: foundation.bundleHash,
    operation_contract: contract,
    operation_contract_hash: canonicalHash(contract),
    ...registeredResponseValidatorBinding(foundation, operation)
  };
  assert.equal(foundation.bundleHash, FROZEN_FOUNDATION.bundleHash);

  const responseBodyValidator = foundation.ajv.getSchema(
    operation.response_schema
  );
  const resultKind = kernelResultKind(
    outcome.value,
    responseBodyValidator
  );
  assert.ok(resultKind, "callback result is not a closed kernel result");
  const acceptedFailure = resultKind === "accepted_failure";
  const isIdempotentMutation = operation.object_store_mutating === true;
  const replayed =
    resultKind === "success" && outcome.value.replayed === true;
  assert.equal(replayed && !isIdempotentMutation, false);
  assert.equal(acceptedFailure && replayed, false);
  const structuralKeyCommitment = isIdempotentMutation
    ? compositeIdempotencyStructuralKeyCommitment(
        idempotencyLookupKey(context)
      )
    : null;
  let richRow = null;
  if (isIdempotentMutation) {
    assert.ok(outcome.value.body?.ref);
    richRow = staged.rich_idempotency_rows.find(
      (row) =>
        row.authority_namespace ===
          context.authentication.authorityNamespace &&
        row.idempotency_key === context.envelope.idempotency_key
    );
  }
  if (isIdempotentMutation && !replayed) {
    const frozenRow = kernelDraft.idempotencyRecords.get(
      idempotencyLookupKey(context)
    );
    assert.ok(frozenRow, "origin callback omitted its idempotency row");
    richRow = {
      authority_namespace: context.authentication.authorityNamespace,
      idempotency_key: context.envelope.idempotency_key,
      operation_name: context.envelope.message_type,
      operation_fingerprint: context.envelope.operation_fingerprint,
      principal_id: context.authentication.principalId,
      actor_id: context.authentication.actorId,
      runtime_key_id: context.envelope.sender.runtime_key_id,
      result_ref: structuredClone(frozenRow.result_ref),
      kernel_result_hash: canonicalHash(outcome.value),
      origin_global_commit_sequence: globalAfter,
      origin_scope_sequence: scopeAfter,
      created_global_commit_sequence: globalAfter,
      created_scope_sequence: scopeAfter,
      origin_observation_ref: null
    };
    staged.rich_idempotency_rows.push(richRow);
  } else if (isIdempotentMutation) {
    assert.ok(richRow, "replay omitted its durable rich idempotency row");
    assert.equal(
      canonicalText(outcome.value.body.ref),
      canonicalText(richRow.result_ref)
    );
    assert.ok(richRow.origin_observation_ref);
  }

  const resultRef = richRow === null
    ? null
    : structuredClone(richRow.result_ref);
  const currentByKey = new Map(
    staged.current_projections.map((projection) => [
      projectionKey(projection),
      projection
    ])
  );
  const changedProjections = [];
  let objectProjection;
  let idempotencyProjection;
  if (isIdempotentMutation && !replayed) {
    objectProjection =
      objectProjectionFromKernel(kernelDraft, resultRef, scopeAfter);
    idempotencyProjection = idempotencyProjectionFromRichRow(richRow);
    changedProjections.push(objectProjection, idempotencyProjection);
  } else if (isIdempotentMutation) {
    objectProjection = currentByKey.get(canonicalText([
      "objects",
      objectStructuralKey(resultRef)
    ]));
    const exactIdempotencyProjection =
      idempotencyProjectionFromRichRow(richRow);
    idempotencyProjection = currentByKey.get(
      projectionKey(exactIdempotencyProjection)
    );
    assert.ok(objectProjection);
    assert.ok(idempotencyProjection);
  } else if (context.envelope.body?.ref) {
    objectProjection = currentByKey.get(canonicalText([
      "objects",
      objectStructuralKey(context.envelope.body.ref)
    ]));
    assert.ok(objectProjection);
  }
  const nonceRow =
    nonceProjection(context, ownerKind, ownerId, scopeAfter);
  changedProjections.push(nonceRow);

  let grantProjection = null;
  let grantBeforeProjection = null;
  const grantEffects = [];
  if (isIdempotentMutation && !replayed) {
    const grantRef = context.envelope.authorization_refs[0];
    assert.ok(grantRef);
    const grantKey = canonicalText([
      "grant_state",
      objectStructuralKey(grantRef)
    ]);
    grantProjection = grantStateProjection(
      kernelDraft,
      grantRef,
      scopeAfter,
      currentByKey.get(grantKey)
    );
    const finalGrantState = kernelDraft.grantStatesByRef.get(
      objectRefKey(grantRef)
    );
    grantBeforeProjection = currentByKey.get(grantKey) ??
      priorGrantStateProjection(grantProjection, finalGrantState);
    assert.equal(
      grantProjection.columns.state_version,
      grantBeforeProjection.columns.state_version + 1
    );
    assert.equal(
      grantProjection.columns.remaining_disclosures,
      grantBeforeProjection.columns.remaining_disclosures - 1
    );
    assert.equal(
      grantProjection.columns.status,
      grantBeforeProjection.columns.status
    );
    assert.equal(
      grantProjection.columns.revocation_nonce,
      grantBeforeProjection.columns.revocation_nonce
    );
    if (!currentByKey.has(grantKey)) {
      staged.operational_versions.push(
        operationalVersionFor(grantBeforeProjection, 0)
      );
    }
    grantEffects.push({
      grant_ref: structuredClone(grantProjection.columns.grant_ref),
      state_version_before:
        grantBeforeProjection.columns.state_version,
      state_version_after: grantProjection.columns.state_version,
      remaining_before:
        grantBeforeProjection.columns.remaining_disclosures,
      remaining_after:
        grantProjection.columns.remaining_disclosures
    });
    changedProjections.push(grantProjection);
  }
  const accessedObject = objectProjection === undefined
    ? null
    : kernelDraft.objectsByRef.get(
        objectRefKey(objectProjection.columns.ref)
      );
  assertRequiredAccessTrace(context.phase, accessTrace, {
    runtime_key_id: context.envelope.sender.runtime_key_id,
    provider_key_id: COMPOSITE_FIXTURE.provider_key_id,
    principal_key_id: COMPOSITE_FIXTURE.principal_key_id,
    object_signing_key_id:
      accessedObject?.descriptor_issuer_signature?.key_id ?? null,
    nonce: context.envelope.nonce,
    database_key: isIdempotentMutation
      ? idempotencyLookupKey(context)
      : null,
    result_ref_key: objectProjection === undefined
      ? null
      : objectRefKey(objectProjection.columns.ref),
    identity_key: objectProjection?.columns.identity_key ?? null,
    result_preexisting: objectProjection === undefined
      ? false
      : currentByKey.has(canonicalText([
          "objects",
          objectProjection.structural_key
        ])),
    grant_ref_key: grantProjection === null
      ? null
      : objectRefKey(grantProjection.columns.grant_ref)
  });
  for (const projection of changedProjections) {
    upsertCurrentProjection(staged, projection);
    staged.operational_versions.push(
      operationalVersionFor(projection, globalAfter)
    );
  }

  const {
    dependencyEntries,
    seedProjections
  } = normalizeAccessTrace({
    events: accessTrace,
    kernelDraft,
    keyResolver,
    foundation,
    resultRef: objectProjection?.columns.ref ?? resultRef,
    resultObjectProjection: objectProjection,
    idempotencyProjection,
    nonceRow,
    grantProjection
  });
  for (const projection of seedProjections) {
    const sealedProjection = staged.current_projections.find(
      (candidate) => projectionKey(candidate) === projectionKey(projection)
    );
    assert.ok(
      sealedProjection,
      `callback accessed an object outside sealed genesis: ${
        projectionKey(projection)
      }`
    );
    assert.equal(
      canonicalText(sealedProjection),
      canonicalText(projection),
      `callback seed diverged from sealed genesis: ${projectionKey(projection)}`
    );
  }
  const dependencyManifest = committedDependencyManifest(dependencyEntries);
  const dependencyProjectionKeys = new Set(
    dependencyEntries.map((entry) => entry.entry_key)
  );
  const ownerProjections = staged.current_projections
    .filter((projection) =>
      dependencyProjectionKeys.has(projectionKey(projection))
    )
    .filter((projection) => {
      const projectionOwner =
        projection.columns.owner_id ?? projection.columns.principal_id;
      return projectionOwner === undefined || projectionOwner === ownerId;
    });
  const scopeStateCommitment = ownerScopeCommitment(
    ownerKind,
    ownerId,
    scopeAfter,
    ownerProjections
  );
  const receiverAuthentication = context.receiver_authentication;
  assert.equal(
    validateReceiverAuthenticationRecord(receiverAuthentication),
    true
  );
  assert.deepEqual(
    context.authentication,
    frozenAuthenticationFromReceiver(receiverAuthentication)
  );
  assert.equal(
    receiverAuthentication.runtime_key_id,
    context.envelope.sender.runtime_key_id
  );
  const hostContext =
    hostAuthenticationContextFromReceiver(receiverAuthentication);
  const hostContextHash = hostContext.context_hash;
  if (context.throw_stage === "observation") {
    throw new CompositeStageFault("observation", staged);
  }
  if (context.throw_untyped_stage === "observation") {
    throw new Error("fixture signer provider failed");
  }
  const observation = signServiceObservation({
    schema: "cairn.service_observation.v0.1",
    observation_id: observationId,
    service: {
      service_id: COMPOSITE_FIXTURE.service_id,
      profile: "cairn-proposal-foundation-v0.1",
      bundle_hash: foundation.bundleHash,
      store_id: COMPOSITE_FIXTURE.store_id,
      key_profile_ref: {
        artifact_schema: "cairn.local_service_key_profile.v0.1",
        artifact_id: COMPOSITE_FIXTURE.service_profile_id,
        artifact_hash: COMPOSITE_FIXTURE.service_profile_hash
      },
      key_profile_hash: COMPOSITE_FIXTURE.service_profile_hash
    },
    access: {
      consequence: contract.consequence,
      visibility: "private",
      owner_kind: ownerKind,
      owner_id: ownerId
    },
    request: {
      envelope_hash: context.envelope.envelope_hash,
      message_id: context.envelope.message_id,
      operation_contract: contract,
      principal_id: context.authentication.principalId,
      actor_id: context.authentication.actorId,
      runtime_key_id: context.envelope.sender.runtime_key_id,
      body_hash: context.envelope.body_hash,
      subject_refs: structuredClone(context.envelope.subject_refs),
      authorization_refs:
        structuredClone(context.envelope.authorization_refs),
      query_commitment:
        queryCommitment(contract, context, hostContextHash),
      host_authentication_context_hash: hostContextHash
    },
    observed_at: COMPOSITE_FIXTURE.now,
    transaction: {
      isolation: "serializable",
      snapshot_id: snapshotId,
      scope_sequence_before: scopeBefore,
      scope_sequence_after: scopeAfter,
      access_trace_commitment: canonicalHash(accessTrace),
      dependency_set_commitment:
        dependencyManifest.dependency_set_commitment,
      scope_state_commitment_after: scopeStateCommitment,
      committed: true
    },
    result: {
      outcome: resultKind,
      status: outcome.value.status,
      code: acceptedFailure ? outcome.value.code : null,
      failures: acceptedFailure
        ? structuredClone(outcome.value.failures)
        : [],
      replayed,
      response_schema: acceptedFailure ? null : contract.response_schema,
      kernel_result_hash: canonicalHash(outcome.value),
      returned_refs: acceptedFailure || resultRef === null
        ? []
        : [structuredClone(resultRef)],
      relevant_heads: [],
      nonce_disposition:
        replayed ? "replay_fresh_nonce" : "newly_reserved",
      grant_effects: acceptedFailure ? [] : grantEffects,
      idempotency: {
        structural_key_commitment: structuralKeyCommitment,
        disposition: isIdempotentMutation
          ? (replayed ? "replayed" : "created")
          : "not_applicable",
        original_result_hash:
          replayed ? richRow.kernel_result_hash : null,
        original_observation_ref: replayed
          ? structuredClone(richRow.origin_observation_ref)
          : null,
        original_scope_sequence:
          replayed ? richRow.origin_scope_sequence : null
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
      key_id: COMPOSITE_FIXTURE.service_key_id,
      signed_hash: ZERO_HASH,
      signed_at: COMPOSITE_FIXTURE.now,
      value: "A".repeat(86)
    },
    not_claiming: NOT_CLAIMING
  });
  const observationRefKey = compositeObservationRefKey(observation);
  const repositoryRow = {
    observation_ref_key: observationRefKey,
    observation_id: observation.observation_id,
    observation_hash: observation.observation_hash,
    request_envelope_hash: observation.request.envelope_hash,
    canonical_observation_bytes: canonicalText(observation),
    principal_id: observation.request.principal_id,
    owner_kind: observation.access.owner_kind,
    owner_id: observation.access.owner_id,
    visibility: observation.access.visibility,
    global_commit_sequence: globalAfter,
    scope_sequence: scopeAfter
  };
  staged.counters.observation_calls += 1;
  activeStage = "persistence";
  if (context.throw_stage === "persistence") {
    throw new CompositeStageFault("persistence", staged);
  }
  if (context.throw_untyped_stage === "persistence") {
    throw new Error("fixture persistence adapter failed");
  }

  staged.global_sequence = globalAfter;
  staged.owner_sequences[ownerKey] = scopeAfter;
  staged.frozen_idempotency_rows =
    structuredClone(sortedMapEntries(kernelDraft.idempotencyRecords));
  staged.dependency_rows.push(
    ...dependencyManifest.entries.map((entry) => ({
      global_sequence: globalAfter,
      ...structuredClone(entry)
    }))
  );
  staged.dependency_commits.push({
    global_sequence: globalAfter,
    dependency_set_commitment:
      dependencyManifest.dependency_set_commitment
  });
  staged.service_commits.push({
    global_commit_sequence: globalAfter,
    previous_global_sequence: globalBefore,
    transaction_kind:
      replayed ? "replay" : "service_operation",
    committed_at: observation.observed_at,
    observation_ref_key: observationRefKey
  });
  staged.scope_commits.push({
    owner_kind: ownerKind,
    owner_id: ownerId,
    scope_sequence: scopeAfter,
    previous_scope_sequence: scopeBefore,
    global_sequence: globalAfter,
    scope_state_commitment_after: scopeStateCommitment,
    dependency_set_commitment:
      dependencyManifest.dependency_set_commitment,
    snapshot_id: snapshotId,
    observation_ref_key: observationRefKey
  });
  staged.observations.push(observation);
  staged.observation_repository.push(repositoryRow);
  staged.observation_by_envelope[observation.request.envelope_hash] =
    observation.observation_id;
  staged.validation_bindings.push(validationBinding);
  staged.receiver_authentication_records.push({
    global_sequence: globalAfter,
    record: structuredClone(receiverAuthentication)
  });
  staged.host_authentication_contexts.push({
    global_sequence: globalAfter,
    context: structuredClone(hostContext)
  });
  staged.request_envelopes.push({
    global_sequence: globalAfter,
    canonical_envelope_bytes: canonicalText(context.envelope)
  });
  staged.access_traces.push({
    global_sequence: globalAfter,
    envelope_hash: context.envelope.envelope_hash,
    events_commitment: canonicalHash(accessTrace),
    events: structuredClone(accessTrace)
  });
  staged.callback_witnesses.push({
    global_sequence: globalAfter,
    callback_commit: true,
    canonical_result_bytes: canonicalText(outcome.value),
    kernel_result_hash: canonicalHash(outcome.value)
  });
  staged.counters.persistence_calls += 1;
  staged.counters.commit_calls += 1;

  if (isIdempotentMutation && !replayed) {
    richRow.origin_observation_ref = {
      artifact_schema: observation.schema,
      artifact_id: observation.observation_id,
      artifact_hash: observation.observation_hash
    };
  }
  if (!verifyCompositeHistory(staged)) {
    throw new CompositeStageFault(
      activeStage,
      staged,
      new Error("staged authoritative history is internally inconsistent")
    );
  }

  return staged;
  } catch (error) {
    if (error instanceof CompositeStageFault) throw error;
    throw new CompositeStageFault(activeStage, staged, error);
  }
}

class CompositeStageFault extends Error {
  constructor(stage, stagedSidecar, cause = undefined) {
    super(`${stage}_failed`);
    this.name = "CompositeStageFault";
    this.stage = stage;
    this.code = `${stage}_failed`;
    this.staged_sidecar = structuredClone(stagedSidecar);
    this.cause = cause;
  }
}

function compositePreflightFailure(sidecar, kernelDraft, context) {
  if (
    !verifyCompositeHistory(sidecar) ||
    canonicalText(sortedMapEntries(kernelDraft.idempotencyRecords)) !==
    canonicalText(sidecar.frozen_idempotency_rows)
  ) {
    return "idempotency_integrity_invalid";
  }
  if (
    !receiverAuthenticationMatchesEnvelope(
      context.receiver_authentication,
      context.envelope
    ) ||
    canonicalText(context.authentication) !== canonicalText(
      frozenAuthenticationFromReceiver(context.receiver_authentication)
    )
  ) {
    return "receiver_authentication_invalid";
  }
  if (
    !receiverAuthenticationFitsHistory(
      sidecar,
      context.receiver_authentication
    )
  ) {
    return "receiver_authentication_invalid";
  }
  const databaseKey = idempotencyLookupKey(context);
  const frozenRow = kernelDraft.idempotencyRecords.get(databaseKey);
  const richRows = sidecar.rich_idempotency_rows.filter(
    (row) =>
      row.authority_namespace ===
        context.authentication.authorityNamespace &&
      row.idempotency_key === context.envelope.idempotency_key
  );
  if (!frozenRow && richRows.length === 0) return null;
  if (
    !frozenRow ||
    richRows.length !== 1
  ) {
    return "idempotency_integrity_invalid";
  }
  const row = richRows[0];
  return row.operation_name === context.envelope.message_type &&
    row.operation_fingerprint === frozenRow.fingerprint &&
    row.principal_id === context.authentication.principalId &&
    row.actor_id === context.authentication.actorId &&
    row.runtime_key_id === context.envelope.sender.runtime_key_id &&
    canonicalText(row.result_ref) ===
      canonicalText(frozenRow.result_ref)
    ? null
    : "idempotency_integrity_invalid";
}

class CompositeReferenceStores extends MemoryReferenceStores {
  constructor(foundation) {
    super();
    this.foundation = foundation;
    this.sidecar = emptySidecar();
    this.context = null;
    this.installedContextToken = null;
    this.issuedContextTokens = new Set();
    this.consumedContextTokens = new Set();
    this.contextTokenSequence = 0;
    this.bootstrapOpen = true;
    this.traces = [];
    this.compositeActive = false;
    this.accessRecorder = new AccessRecorder();
  }

  sealGenesis() {
    assert.equal(this.bootstrapOpen, true, "genesis is already sealed");
    assert.ok(this.keyResolver, "genesis requires the frozen key resolver");
    const manifest = compositeGenesisManifest(
      this,
      this.foundation,
      this.keyResolver
    );
    this.sidecar.genesis_manifest = manifest;
    this.sidecar.current_projections =
      structuredClone(manifest.initial_rows);
    this.sidecar.operational_versions = manifest.initial_rows.map(
      (projection) => operationalVersionFor(projection, 0)
    );
    this.bootstrapOpen = false;
    assert.equal(
      verifyCompositeHistory(this.sidecar),
      true,
      "sealed genesis history is invalid"
    );
    return manifest.manifest_hash;
  }

  issueContextToken() {
    assert.equal(this.bootstrapOpen, false, "genesis is not sealed");
    const token = `context-lease-${++this.contextTokenSequence}`;
    this.issuedContextTokens.add(token);
    return token;
  }

  setContext(context, token) {
    if (
      typeof token !== "string" ||
      !this.issuedContextTokens.has(token) ||
      this.consumedContextTokens.has(token)
    ) {
      throw new Error("context_token_invalid");
    }
    this.issuedContextTokens.delete(token);
    this.consumedContextTokens.add(token);
    if (
      this.context !== null ||
      this.installedContextToken !== null ||
      this.compositeActive
    ) {
      throw new Error("context_nested");
    }
    const receiverAuthentication = context.receiver_authentication;
    assert.equal(
      validateReceiverAuthenticationRecord(receiverAuthentication),
      true,
      "composite context lacks a valid receiver authentication record"
    );
    this.accessRecorder.events.length = 0;
    this.accessRecorder.active = true;
    this.installedContextToken = token;
    this.context = structuredClone({
      ...context,
      receiver_authentication: receiverAuthentication
    });
  }

  installContext(context) {
    const token = this.issueContextToken();
    this.setContext(context, token);
    return token;
  }

  trackedResolver(source) {
    this.keyResolver =
      new TrackedMap("keyResolver", source, this.accessRecorder);
    return this.keyResolver;
  }

  injectReplayFault(kind) {
    const frozenRow = [...this.idempotencyRecords.values()][0];
    assert.ok(frozenRow?.result_ref, "fault injection requires an origin row");
    const resultKey = objectRefKey(frozenRow.result_ref);
    if (kind === "missing_result_object") {
      this.objectsByRef.delete(resultKey);
    } else if (kind === "corrupt_result_binding") {
      const corrupt = structuredClone(this.objectsByRef.get(resultKey));
      corrupt.revision += 1;
      this.objectsByRef.set(resultKey, corrupt);
    } else if (kind === "missing_result_acl") {
      this.accessByRef.delete(resultKey);
    } else if (kind === "public_result_acl") {
      this.accessByRef.set(resultKey, {
        visibility: "public",
        principal_id: null
      });
    } else if (kind === "foreign_result_acl") {
      this.accessByRef.set(resultKey, {
        visibility: "private",
        principal_id: "did:example:foreign-collector"
      });
    } else {
      throw new Error(`unknown replay fault ${kind}`);
    }
  }

  transaction(work) {
    if (!this.context) {
      if (this.bootstrapOpen) return super.transaction(work);
      return {
        ok: false,
        status: 503,
        code: "receiver_authentication_required",
        failures: ["receiver_authentication_required"]
      };
    }
    if (this.compositeActive) {
      throw new Error("composite transaction is already active");
    }
    this.compositeActive = true;
    const context = structuredClone(this.context);
    const kernelBefore = kernelSnapshot(this);
    const liveKernelBackup = Object.fromEntries(
      MAP_NAMES.map((name) => [
        name,
        new Map([...this[name]].map(([key, value]) => [
          key,
          structuredClone(value)
        ]))
      ])
    );
    liveKernelBackup.usedNonces = new Set(this.usedNonces);
    const sidecarBefore = sidecarSnapshot(this.sidecar);
    const kernelDraft = Object.fromEntries(
      MAP_NAMES.map((name) => [
        name,
        new TrackedMap(name, this[name], this.accessRecorder)
      ])
    );
    kernelDraft.usedNonces =
      new TrackedSet("usedNonces", this.usedNonces, this.accessRecorder);

    if (context.fault === "grant_consumption_failed") {
      const grantStates = kernelDraft.grantStatesByRef;
      const originalGet = grantStates.get.bind(grantStates);
      grantStates.get = (key) => {
        const value = originalGet(key);
        if (
          value &&
          kernelDraft.idempotencyRecords.size >
            this.idempotencyRecords.size
        ) {
          return {
            ...structuredClone(value),
            remaining_disclosures: 0
          };
        }
        return value;
      };
    }

    let callbackOutcome = null;
    let frozenCallbackOutcome = null;
    let stagedSidecar = structuredClone(this.sidecar);
    try {
      this.accessRecorder.active = false;
      const callbackBefore = kernelSnapshot(kernelDraft);
      const preflightFailureCode = compositePreflightFailure(
        this.sidecar,
        kernelDraft,
        context
      );
      if (preflightFailureCode !== null) {
        const wrapperFailure = {
          status: 503,
          code: preflightFailureCode,
          failures: [preflightFailureCode],
          stage: "preflight"
        };
        const trace = {
          case_id: context.case_id,
          operation: context.envelope.message_type,
          envelope_hash: context.envelope.envelope_hash,
          authentication: structuredClone(context.authentication),
          receiver_authentication:
            structuredClone(context.receiver_authentication),
          callback_before: callbackBefore,
          callback_after: structuredClone(callbackBefore),
          callback_commit: null,
          frozen_callback_value: null,
          callback_value: null,
          callback_access_trace: [],
          response_validation: null,
          staged_sidecar: sidecarBefore,
          final_commit: false,
          wrapper_failure: structuredClone(wrapperFailure),
          local_result: {
            disposition: "rolled_back_failure",
            kernel: null,
            wrapper_failure: structuredClone(wrapperFailure),
            service_observation: null
          },
          kernel_before: kernelBefore,
          kernel_after: kernelSnapshot(this),
          sidecar_before: sidecarBefore,
          sidecar_after: sidecarSnapshot(this.sidecar)
        };
        this.traces.push(trace);
        return {
          ok: false,
          status: wrapperFailure.status,
          code: wrapperFailure.code,
          failures: structuredClone(wrapperFailure.failures)
        };
      }
      this.accessRecorder.active = true;
      frozenCallbackOutcome = work(kernelDraft);
      if (
        frozenCallbackOutcome &&
        typeof frozenCallbackOutcome.then === "function"
      ) {
        throw new TypeError("reference transactions must be synchronous");
      }
      this.accessRecorder.active = false;
      callbackOutcome = frozenCallbackOutcome;
      let responseValidation = null;
      const operation = this.foundation.registry.operations.find(
        ({ name }) => name === context.envelope.message_type
      );
      assert.ok(operation, "registered operation disappeared");
      const responseValidator =
        this.foundation.ajv.getSchema(operation.response_schema);
      assert.equal(typeof responseValidator, "function");
      if (context.response_schema_mutation === "delete_ref") {
        const validateBoundary = (caseId, body) => {
          const accepted = responseValidator(body);
          return {
            case_id: caseId,
            accepted,
            errors: structuredClone(responseValidator.errors ?? [])
          };
        };
        const validBody =
          structuredClone(frozenCallbackOutcome.value.body);
        const missingRefBody = structuredClone(validBody);
        delete missingRefBody.ref;
        const missingReceiptBody = structuredClone(validBody);
        delete missingReceiptBody.receipt_ref;
        const extraPropertyBody = {
          ...structuredClone(validBody),
          unexpected: true
        };
        const malformedRefBody = structuredClone(validBody);
        malformedRefBody.ref.object_hash = "not-a-sha256";
        const boundaryControls = [
          validateBoundary("registered_valid", validBody),
          validateBoundary("missing_ref", missingRefBody),
          validateBoundary("missing_receipt_ref", missingReceiptBody),
          validateBoundary("extra_property", extraPropertyBody),
          validateBoundary("malformed_nested_ref", malformedRefBody)
        ];
        assert.deepEqual(
          boundaryControls.map(({ accepted }) => accepted),
          [true, false, false, false, false]
        );
        callbackOutcome = structuredClone(frozenCallbackOutcome);
        delete callbackOutcome.value.body.ref;
        const accepted = responseValidator(callbackOutcome.value.body);
        const validatorBinding =
          registeredResponseValidatorBinding(this.foundation, operation);
        responseValidation = {
          schema: validatorBinding.response_schema,
          response_source_schema_bytes:
            validatorBinding.response_source_schema_bytes,
          response_source_schema_hash:
            validatorBinding.response_source_schema_hash,
          validator_binding_hash:
            validatorBinding.validator_binding_hash,
          authoritative_schema_hash: AUTHORITATIVE_SCHEMA_HASH,
          operation_contract_hash: canonicalHash({
            operation: operation.name,
            request_schema: operation.request_schema,
            response_schema: operation.response_schema,
            consequence: operation.consequence
          }),
          mutation: context.response_schema_mutation,
          accepted,
          errors: structuredClone(responseValidator.errors ?? []),
          boundary_controls: boundaryControls
        };
        assert.equal(accepted, false);
      }
      const callbackAfter = kernelSnapshot(kernelDraft);
      const callbackAccessTrace =
        structuredClone(this.accessRecorder.events);
      stagedSidecar.counters.callback_calls += 1;
      let wrapperFailure = responseValidation?.accepted === false
        ? {
            status: 503,
            code: "response_schema_failed",
            failures: ["response_schema_failed"],
            stage: "observation"
          }
        : context.integrity_fault
          ? {
              status: 503,
              code: "authoritative_integrity_invalid",
              failures: ["authoritative_integrity_invalid"],
              stage: "observation"
            }
          : null;
      if (
        callbackOutcome?.commit !== false &&
        wrapperFailure === null
      ) {
        try {
          stagedSidecar = stageAuthoritativeCommit(
            stagedSidecar,
            context,
            callbackOutcome,
            kernelDraft,
            callbackAccessTrace,
            operation,
            this.foundation,
            this.keyResolver
          );
        } catch (error) {
          const stage = error instanceof CompositeStageFault
            ? error.stage
            : "observation";
          const code = `${stage}_failed`;
          if (error instanceof CompositeStageFault) {
            stagedSidecar = structuredClone(error.staged_sidecar);
          }
          wrapperFailure = {
            status: 503,
            code,
            failures: [code],
            stage
          };
        }
      }
      let finalCommit =
        callbackOutcome?.commit !== false && wrapperFailure === null;
      if (finalCommit) {
        try {
          for (const [index, name] of MAP_NAMES.entries()) {
            replaceMap(this[name], kernelDraft[name]);
            if (index === 0 && context.throw_stage === "commit") {
              throw new CompositeStageFault("commit", stagedSidecar);
            }
            if (
              index === 0 &&
              context.throw_untyped_stage === "commit"
            ) {
              throw new Error("fixture database publication failed");
            }
          }
          this.usedNonces.clear();
          for (const nonce of kernelDraft.usedNonces) {
            this.usedNonces.add(nonce);
          }
          this.sidecar = structuredClone(stagedSidecar);
        } catch (error) {
          for (const name of MAP_NAMES) {
            replaceMap(this[name], liveKernelBackup[name]);
          }
          this.usedNonces.clear();
          for (const nonce of liveKernelBackup.usedNonces) {
            this.usedNonces.add(nonce);
          }
          this.sidecar = structuredClone(sidecarBefore.value);
          const stage = "commit";
          const code = `${stage}_failed`;
          wrapperFailure = {
            status: 503,
            code,
            failures: [code],
            stage
          };
          finalCommit = false;
        }
      }

      const localResult = wrapperFailure
        ? {
            disposition: "rolled_back_failure",
            kernel: structuredClone(callbackOutcome?.value ?? null),
            wrapper_failure: structuredClone(wrapperFailure),
            service_observation: null
          }
        : callbackOutcome?.commit === false
          ? {
              disposition: "rolled_back_failure",
              kernel: structuredClone(callbackOutcome.value),
              wrapper_failure: null,
              service_observation: null
            }
          : {
              disposition: callbackOutcome.value.ok
                ? "committed_success"
                : "committed_accepted_failure",
              kernel: structuredClone(callbackOutcome.value),
              wrapper_failure: null,
              service_observation: stagedSidecar.observations.at(-1)
            };
      const trace = {
        case_id: context.case_id,
        operation: context.envelope.message_type,
        envelope_hash: context.envelope.envelope_hash,
        authentication: structuredClone(context.authentication),
        receiver_authentication:
          structuredClone(context.receiver_authentication),
        callback_before: callbackBefore,
        callback_after: callbackAfter,
        callback_commit: callbackOutcome?.commit ?? null,
        frozen_callback_value:
          structuredClone(frozenCallbackOutcome?.value ?? null),
        callback_value: structuredClone(callbackOutcome?.value ?? null),
        callback_access_trace: callbackAccessTrace,
        response_validation: responseValidation,
        staged_sidecar: sidecarSnapshot(stagedSidecar),
        final_commit: finalCommit,
        wrapper_failure: structuredClone(wrapperFailure),
        local_result: localResult,
        kernel_before: kernelBefore,
        kernel_after: kernelSnapshot(this),
        sidecar_before: sidecarBefore,
        sidecar_after: sidecarSnapshot(this.sidecar)
      };
      this.traces.push(trace);
      return wrapperFailure
        ? {
            ok: false,
            status: wrapperFailure.status,
            code: wrapperFailure.code,
            failures: structuredClone(wrapperFailure.failures)
          }
        : callbackOutcome?.value;
    } finally {
      this.accessRecorder.active = false;
      this.compositeActive = false;
      this.context = null;
      this.installedContextToken = null;
    }
  }
}

let helperModulePromise = null;

export async function loadFrozenFixtureHelpers() {
  if (helperModulePromise) return helperModulePromise;
  helperModulePromise = (async () => {
    const testUrl = new URL(
      "../../protocol/tests/reference-service.test.mjs",
      import.meta.url
    );
    const protocolRoot = fileURLToPath(
      new URL("../../protocol/", import.meta.url)
    );
    let source = await readFile(testUrl, "utf8");
    source = source.replace(
      'import test from "node:test";',
      "const test = () => {}; test.skip = () => {};"
    );
    source = source.replace(
      'import { generateKeyPairSync, sign as signBytes } from "node:crypto";',
      'import { createHash, createPrivateKey, createPublicKey, sign as signBytes } from "node:crypto";'
    );
    source = source.replace(
      `function testKey(key_id, controller) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    key_id,`,
      `function testKey(key_id, controller) {
  const seed = createHash("sha256")
    .update("cairn-authoritative-composite-probe-v0.1:" + key_id)
    .digest();
  const privateKey = createPrivateKey({
    key: Buffer.concat([
      Buffer.from("302e020100300506032b657004220420", "hex"),
      seed
    ]),
    format: "der",
    type: "pkcs8"
  });
  const publicKey = createPublicKey(privateKey);
  return {
    key_id,`
    );
    for (const relative of [
      "../lib/core.mjs",
      "../lib/validation.mjs",
      "../reference-service/http.mjs",
      "../reference-service/service.mjs",
      "../reference-service/signer.mjs",
      "../reference-service/state.mjs"
    ]) {
      source = source.replaceAll(
        `"${relative}"`,
        `"${new URL(relative, testUrl).href}"`
      );
    }
    source = source.replace(
      'const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");',
      `const root = ${JSON.stringify(protocolRoot)};`
    );
    source = source.replace(
      "const stores = new MemoryReferenceStores();",
      "const stores = globalThis.__CAIRN_STORE_FACTORY__?.() ?? new MemoryReferenceStores();"
    );
    source += `
export {
  makeHarness,
  makeActiveIntent,
  makeIntentGrant,
  makeEnvelope,
  newIdempotentAttempt,
  freshTransport,
  schemaFor,
  bindAndSign,
  operationFingerprint,
  signature,
  AGENT_KEY,
  foundation,
  keyResolver
};
`;
    const encoded = Buffer.from(source, "utf8").toString("base64");
    return import(`data:text/javascript;base64,${encoded}`);
  })();
  return helperModulePromise;
}

const RECEIVER_BINDING_SECRET = Buffer.alloc(32, 13);

function receiverAuthorityNamespaceCommitment(
  accountTenantCommitment,
  authorityNamespace
) {
  return `sha-256:${createHmac("sha256", RECEIVER_BINDING_SECRET)
    .update(Buffer.from(canonicalText([
      "cairn-authority-namespace-v0.1",
      accountTenantCommitment,
      authorityNamespace
    ]), "utf8"))
    .digest("hex")}`;
}

function receiverAuthenticationRecord(authentication, envelope) {
  const accountTenantCommitment = canonicalHash([
    "cairn-composite-account-tenant-v0.1",
    authentication.principalId,
    authentication.actorId
  ]);
  const authorityNamespaceCommitment =
    receiverAuthorityNamespaceCommitment(
      accountTenantCommitment,
      authentication.authorityNamespace
    );
  const record = {
    schema: "cairn.receiver_authentication_record.v0.1",
    authentication_handle:
      `${authentication.principalId ?? authentication.actorId}|host-auth`,
    account_tenant_commitment: accountTenantCommitment,
    principal_id: authentication.principalId,
    actor_id: authentication.actorId,
    runtime_key_id: envelope.sender.runtime_key_id,
    authority_namespace_raw: authentication.authorityNamespace,
    authority_namespace_commitment: authorityNamespaceCommitment,
    trust_profile_id: "cairn:fixture:host-auth",
    trust_profile_hash: canonicalHash([
      "cairn-composite-host-trust-profile-v0.1"
    ]),
    authentication_evidence_commitment: canonicalHash([
      "cairn-composite-authentication-evidence-v0.1",
      authentication.actorId,
      authentication.principalId,
      envelope.sender.runtime_key_id
    ]),
    assertion_level: "host_asserted"
  };
  assert.equal(
    validateReceiverAuthenticationRecord(record),
    true,
    JSON.stringify(validateReceiverAuthenticationRecord.errors)
  );
  return record;
}

function frozenAuthenticationFromReceiver(record) {
  assert.equal(validateReceiverAuthenticationRecord(record), true);
  return {
    principalId: record.principal_id,
    actorId: record.actor_id,
    authorityNamespace: record.authority_namespace_raw
  };
}

function hostAuthenticationContextFromReceiver(record) {
  assert.equal(validateReceiverAuthenticationRecord(record), true);
  return bindObjectHash({
    schema: "cairn.host_authentication_context.v0.1",
    context_hash: ZERO_HASH,
    account_tenant_commitment: record.account_tenant_commitment,
    principal_id: record.principal_id,
    actor_id: record.actor_id,
    runtime_key_id: record.runtime_key_id,
    authority_namespace_commitment:
      record.authority_namespace_commitment,
    trust_profile_id: record.trust_profile_id,
    trust_profile_hash: record.trust_profile_hash,
    authentication_evidence_commitment:
      record.authentication_evidence_commitment,
    assertion_level: record.assertion_level
  }, AUTHORITATIVE_SCHEMA.$defs.hostAuthenticationContext);
}

async function buildIntentScenario(caseId = "origin") {
  const helpers = await loadFrozenFixtureHelpers();
  const stores = new CompositeReferenceStores(helpers.foundation);
  const resolver = stores.trackedResolver(helpers.keyResolver);
  globalThis.__CAIRN_STORE_FACTORY__ = () => stores;
  let harness;
  try {
    harness = helpers.makeHarness({ resolver });
  } finally {
    delete globalThis.__CAIRN_STORE_FACTORY__;
  }
  const intent = helpers.makeActiveIntent();
  const intentRef =
    (await import("../../protocol/lib/core.mjs")).objectRefFor(
      intent,
      helpers.schemaFor(intent)
    );
  const grant = helpers.makeIntentGrant(harness.service, intent);
  const grantRef = harness.seeder.seedObject(grant, {
    grantState: {
      status: "active",
      revocation_nonce: 62,
      remaining_disclosures: 2
    }
  });
  const effectRef = objectRefFor(
    harness.effect,
    helpers.schemaFor(harness.effect)
  );
  stores.accessByRef.set(objectRefKey(effectRef), {
    visibility: "public",
    principal_id: null
  });
  const genesisManifestHash = stores.sealGenesis();
  const envelope = helpers.makeEnvelope({
    operationName: "intent.put",
    body: intent,
    subjectRefs: [intentRef],
    authorizationRefs: [grantRef],
    messageNumber: 54,
    nonce: "reference-nonce-00000054",
    idempotencyKey: "reference-intent-idempotency-0001"
  });
  const receiverAuthentication = receiverAuthenticationRecord({
    ...harness.authentication,
    authorityNamespace:
      `${harness.authentication.principalId}|cairn-account`
  }, envelope);
  const authentication =
    frozenAuthenticationFromReceiver(receiverAuthentication);
  const originContextToken = stores.installContext({
    case_id: `${caseId}:origin`,
    phase: "origin",
    envelope,
    authentication,
    receiver_authentication: receiverAuthentication
  });
  const first = harness.service.handleEnvelope(envelope, authentication);
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(first.status, 201);
  const originTrace = stores.traces.at(-1);
  assert.equal(originTrace.callback_commit, true);
  assert.equal(originTrace.final_commit, true);
  assert.equal(verifyCompositeHistory(stores.sidecar), true);
  assert.equal(
    verifyCompositeArtifactBinding(stores.sidecar, originTrace),
    true
  );
  assert.equal(
    originTrace.callback_access_trace.some(
      ({ store }) => store === "keyResolver"
    ),
    true,
    "frozen callback key-resolver reads were not instrumented"
  );
  const resultKey = objectRefKey(first.body.ref);
  const identity = [...stores.refsByIdentity.entries()].find(([, refKey]) =>
    refKey === resultKey
  );
  assert.ok(identity, "origin object identity index missing");
  return {
    helpers,
    harness,
    stores,
    envelope,
    authentication,
    receiverAuthentication,
    originContextToken,
    genesisManifestHash,
    effectRef,
    first,
    originTrace,
    originObject: {
      ref: structuredClone(first.body.ref),
      value: structuredClone(stores.objectsByRef.get(resultKey)),
      identity_key: identity[0],
      retrieval_uri: stores.urisByRef.get(resultKey),
      access: structuredClone(stores.accessByRef.get(resultKey))
    }
  };
}

export async function runCompositeProbe() {
  const origin = await buildIntentScenario("canonical");
  const originReport = {
    envelope: structuredClone(origin.envelope),
    authentication: structuredClone(origin.authentication),
    receiver_authentication:
      structuredClone(origin.receiverAuthentication),
    callback: structuredClone(origin.originTrace),
    object: structuredClone(origin.originObject),
    sidecar: structuredClone(origin.stores.sidecar)
  };
  const changedCallbackArtifact = structuredClone(origin.originTrace);
  changedCallbackArtifact.frozen_callback_value.status = 299;
  changedCallbackArtifact.callback_value.status = 299;
  changedCallbackArtifact.local_result.kernel.status = 299;
  const callbackValueArtifactMutationRejected =
    verifyCompositeArtifactBinding(
      origin.stores.sidecar,
      changedCallbackArtifact
    ) === false;
  assert.equal(
    callbackValueArtifactMutationRejected,
    true,
    "callback_value_artifact_binding"
  );

  const conflictScenario = await buildIntentScenario("fingerprint_conflict");
  const conflictKernelBaseline = kernelSnapshot(conflictScenario.stores);
  const conflictSidecarBaseline =
    sidecarSnapshot(conflictScenario.stores.sidecar);
  const conflictDraft = structuredClone(conflictScenario.envelope);
  conflictDraft.message_id =
    "urn:uuid:00000000-0000-4000-8000-000000000058";
  conflictDraft.nonce = "reference-nonce-00000058";
  conflictDraft.audience = [
    ...conflictDraft.audience,
    "cairn:another-audience"
  ];
  conflictDraft.operation_fingerprint =
    conflictScenario.helpers.operationFingerprint(conflictDraft);
  conflictDraft.envelope_hash =
    "sha-256:0000000000000000000000000000000000000000000000000000000000000000";
  conflictDraft.signature =
    conflictScenario.helpers.signature(conflictScenario.helpers.AGENT_KEY);
  const conflictEnvelope = conflictScenario.helpers.bindAndSign(
    conflictDraft,
    conflictScenario.helpers.AGENT_KEY
  );
  conflictScenario.stores.installContext({
    case_id: "fingerprint_conflict",
    phase: "replay",
    envelope: conflictEnvelope,
    authentication: conflictScenario.authentication,
    receiver_authentication: conflictScenario.receiverAuthentication
  });
  const conflictRaw = conflictScenario.harness.service.handleEnvelope(
    conflictEnvelope,
    conflictScenario.authentication
  );
  const conflictTrace = conflictScenario.stores.traces.at(-1);
  assert.equal(conflictRaw.code, "operation_rejected");
  assert.equal(
    conflictRaw.failures.includes("idempotency_conflict"),
    true
  );
  assert.equal(conflictTrace.callback_commit, false);
  assert.equal(conflictTrace.final_commit, false);
  assert.deepEqual(conflictTrace.kernel_after, conflictKernelBaseline);
  assert.deepEqual(conflictTrace.sidecar_after, conflictSidecarBaseline);

  const replayScenario = await buildIntentScenario("successful_replay");
  const successfulReplayEnvelope = replayScenario.helpers.freshTransport(
    replayScenario.envelope,
    59
  );
  replayScenario.stores.installContext({
    case_id: "successful_replay",
    phase: "replay",
    envelope: successfulReplayEnvelope,
    authentication: replayScenario.authentication,
    receiver_authentication: replayScenario.receiverAuthentication
  });
  const successfulReplayRaw =
    replayScenario.harness.service.handleEnvelope(
      successfulReplayEnvelope,
      replayScenario.authentication
    );
  const successfulReplayTrace = replayScenario.stores.traces.at(-1);
  assert.equal(successfulReplayRaw.ok, true);
  assert.equal(successfulReplayRaw.replayed, true);
  assert.equal(successfulReplayTrace.callback_commit, true);
  assert.equal(successfulReplayTrace.final_commit, true);
  assert.equal(
    verifyCompositeHistory(replayScenario.stores.sidecar),
    true
  );
  assert.equal(
    verifyCompositeArtifactBinding(
      replayScenario.stores.sidecar,
      successfulReplayTrace
    ),
    true
  );
  assert.equal(replayScenario.stores.sidecar.global_sequence, 2);
  assert.deepEqual(
    replayScenario.stores.sidecar.scope_commits.map((commit) => [
      commit.scope_sequence,
      commit.previous_scope_sequence,
      commit.global_sequence
    ]),
    [[1, 0, 1], [2, 1, 2]]
  );

  const acceptedFailureScenario =
    await buildIntentScenario("accepted_failure");
  const acceptedFailureEnvelope =
    acceptedFailureScenario.helpers.makeEnvelope({
      operationName: "runtime_binding.get",
      body: {
        ref: acceptedFailureScenario.effectRef,
        retrieval_uri:
          acceptedFailureScenario.harness.service.objectUri(
            acceptedFailureScenario.effectRef
          )
      },
      messageNumber: 57,
      nonce: "reference-nonce-00000057"
    });
  const acceptedFailureReceiver = receiverAuthenticationRecord(
    acceptedFailureScenario.authentication,
    acceptedFailureEnvelope
  );
  const acceptedFailureKernelBefore =
    kernelSnapshot(acceptedFailureScenario.stores);
  const acceptedFailureGlobalBefore =
    acceptedFailureScenario.stores.sidecar.global_sequence;
  acceptedFailureScenario.stores.installContext({
    case_id: "accepted_failure",
    phase: "accepted_failure",
    envelope: acceptedFailureEnvelope,
    authentication: acceptedFailureScenario.authentication,
    receiver_authentication: acceptedFailureReceiver
  });
  const acceptedFailureRaw =
    acceptedFailureScenario.harness.service.handleEnvelope(
      acceptedFailureEnvelope,
      acceptedFailureScenario.authentication
    );
  const acceptedFailureTrace =
    acceptedFailureScenario.stores.traces.at(-1);
  assert.equal(
    acceptedFailureRaw.code,
    "response_schema_mismatch",
    JSON.stringify(acceptedFailureTrace?.callback_access_trace)
  );
  assert.equal(acceptedFailureRaw.status, 422);
  assert.equal(acceptedFailureTrace.callback_commit, true);
  assert.equal(acceptedFailureTrace.final_commit, true);
  assert.equal(
    acceptedFailureScenario.stores.sidecar.global_sequence,
    acceptedFailureGlobalBefore + 1
  );
  assert.equal(
    acceptedFailureTrace.local_result.disposition,
    "committed_accepted_failure"
  );
  assert.equal(
    acceptedFailureTrace.local_result.service_observation.result.outcome,
    "accepted_failure"
  );
  for (const mapName of [
    "objectsByRef",
    "idempotencyRecords",
    "grantStatesByRef"
  ]) {
    assert.deepEqual(
      acceptedFailureTrace.kernel_after.maps[mapName],
      acceptedFailureKernelBefore.maps[mapName],
      mapName
    );
  }
  assert.notDeepEqual(
    acceptedFailureTrace.kernel_after.used_nonces,
    acceptedFailureKernelBefore.used_nonces
  );
  assert.equal(
    verifyCompositeHistory(acceptedFailureScenario.stores.sidecar),
    true
  );
  assert.equal(
    verifyCompositeArtifactBinding(
      acceptedFailureScenario.stores.sidecar,
      acceptedFailureTrace
    ),
    true
  );

  const multiRowScenario =
    await buildIntentScenario("multi_idempotency");
  const secondKeyEnvelope =
    multiRowScenario.helpers.newIdempotentAttempt(
      multiRowScenario.envelope,
      62,
      "reference-intent-idempotency-0002"
    );
  multiRowScenario.stores.installContext({
    case_id: "multi_idempotency:second_origin",
    phase: "origin",
    envelope: secondKeyEnvelope,
    authentication: multiRowScenario.authentication,
    receiver_authentication: multiRowScenario.receiverAuthentication
  });
  const secondKeyRaw =
    multiRowScenario.harness.service.handleEnvelope(
      secondKeyEnvelope,
      multiRowScenario.authentication
    );
  const secondKeyTrace = multiRowScenario.stores.traces.at(-1);
  assert.equal(secondKeyRaw.ok, true, JSON.stringify(secondKeyRaw));
  assert.equal(
    secondKeyTrace.final_commit,
    true,
    JSON.stringify({
      callback_commit: secondKeyTrace.callback_commit,
      final_commit: secondKeyTrace.final_commit,
      wrapper_failure: secondKeyTrace.wrapper_failure,
      rollback: secondKeyTrace.rollback
    })
  );
  assert.equal(
    multiRowScenario.stores.sidecar.rich_idempotency_rows.length,
    2
  );
  assert.equal(
    verifyCompositeHistory(multiRowScenario.stores.sidecar),
    true
  );
  const multiOriginSidecar =
    structuredClone(multiRowScenario.stores.sidecar);
  const replaySecondKeyEnvelope =
    multiRowScenario.helpers.freshTransport(secondKeyEnvelope, 63);
  multiRowScenario.stores.installContext({
    case_id: "multi_idempotency:second_replay",
    phase: "replay",
    envelope: replaySecondKeyEnvelope,
    authentication: multiRowScenario.authentication,
    receiver_authentication: multiRowScenario.receiverAuthentication
  });
  const replaySecondKeyRaw =
    multiRowScenario.harness.service.handleEnvelope(
      replaySecondKeyEnvelope,
      multiRowScenario.authentication
    );
  const replaySecondKeyTrace = multiRowScenario.stores.traces.at(-1);
  assert.equal(replaySecondKeyRaw.ok, true);
  assert.equal(replaySecondKeyRaw.replayed, true);
  assert.equal(replaySecondKeyTrace.final_commit, true);
  const [firstRichRow, secondRichRow] =
    multiRowScenario.stores.sidecar.rich_idempotency_rows;
  assert.notEqual(
    compositeIdempotencyStructuralKeyCommitment(canonicalText([
      firstRichRow.authority_namespace,
      firstRichRow.idempotency_key
    ])),
    compositeIdempotencyStructuralKeyCommitment(canonicalText([
      secondRichRow.authority_namespace,
      secondRichRow.idempotency_key
    ]))
  );
  assert.deepEqual(
    replaySecondKeyTrace.local_result.service_observation.result
      .idempotency.original_observation_ref,
    secondRichRow.origin_observation_ref
  );
  const coherentFirstKeyRelinkEnvelope =
    multiRowScenario.helpers.newIdempotentAttempt(
      multiRowScenario.envelope,
      64,
      firstRichRow.idempotency_key
    );
  const exactKeyRelinkRejected =
    verifyIdempotencyEnvelopeBinding(
      multiRowScenario.receiverAuthentication,
      coherentFirstKeyRelinkEnvelope,
      replaySecondKeyTrace.local_result.service_observation,
      secondRichRow
    ) === false;
  assert.equal(exactKeyRelinkRejected, true);
  assert.equal(
    verifyCompositeHistory(multiRowScenario.stores.sidecar),
    true
  );
  const reorderedVersionHistory =
    structuredClone(multiRowScenario.stores.sidecar);
  reorderedVersionHistory.operational_versions.reverse();
  const versionOrderIndependent =
    verifyCompositeHistory(reorderedVersionHistory);
  assert.equal(versionOrderIndependent, true);
  const replayHistoryMutationControls = {};
  for (const [caseId, mutate] of [
    ["repository_bytes", (sidecar) => {
      const observation = JSON.parse(
        sidecar.observation_repository.at(-1).canonical_observation_bytes
      );
      observation.request.message_id =
        "urn:uuid:90000000-0000-4000-8000-000000000001";
      sidecar.observation_repository.at(-1).canonical_observation_bytes =
        canonicalText(observation);
    }],
    ["service_commit_ref", (sidecar) => {
      sidecar.service_commits.at(-1).observation_ref_key =
        canonicalText(["corrupt-service-commit-ref"]);
    }],
    ["scope_commit_ref", (sidecar) => {
      sidecar.scope_commits.at(-1).observation_ref_key =
        canonicalText(["corrupt-scope-commit-ref"]);
    }],
    ["dependency_commit", (sidecar) => {
      sidecar.dependency_commits.at(-1).dependency_set_commitment =
        ZERO_HASH;
    }],
    ["missing_operational_version", (sidecar) => {
      sidecar.operational_versions.pop();
    }],
    ["duplicate_repository_row", (sidecar) => {
      sidecar.observation_repository.push(
        structuredClone(sidecar.observation_repository.at(-1))
      );
    }],
    ["origin_link", (sidecar) => {
      const observation = structuredClone(sidecar.observations.at(-1));
      observation.result.idempotency.original_observation_ref.artifact_hash =
        `sha-256:${"f".repeat(64)}`;
      sidecar.observations[sidecar.observations.length - 1] = observation;
      sidecar.observation_repository.at(-1).canonical_observation_bytes =
        canonicalText(observation);
    }],
    ["validator_source", (sidecar) => {
      sidecar.validation_bindings.at(-1).response_source_schema_bytes =
        canonicalText({
          "$id": sidecar.validation_bindings.at(-1)
            .response_schema.split("#", 1)[0],
          "type": "object",
          "required": ["ref"]
        });
    }],
    ["validator_binding", (sidecar) => {
      sidecar.validation_bindings.at(-1).validator_binding_hash =
        `sha-256:${"e".repeat(64)}`;
    }],
    ["frozen_bundle", (sidecar) => {
      sidecar.validation_bindings.at(-1).frozen_bundle_hash =
        `sha-256:${"d".repeat(64)}`;
    }]
  ]) {
    const changed = structuredClone(replayScenario.stores.sidecar);
    mutate(changed);
    const rejected = verifyCompositeHistory(changed) === false;
    assert.equal(rejected, true, caseId);
    replayHistoryMutationControls[caseId] = rejected;
  }

  const accessTraceMutationControls = {};
  const originAccessFacts = {
    runtime_key_id: origin.envelope.sender.runtime_key_id,
    provider_key_id: COMPOSITE_FIXTURE.provider_key_id,
    principal_key_id: COMPOSITE_FIXTURE.principal_key_id,
    nonce: origin.envelope.nonce,
    database_key: idempotencyLookupKey({
      envelope: origin.envelope,
      authentication: origin.authentication
    }),
    result_ref_key: objectRefKey(origin.first.body.ref),
    identity_key: origin.originObject.identity_key,
    grant_ref_key: objectRefKey(origin.envelope.authorization_refs[0])
  };
  const replayAccessFacts = {
    ...originAccessFacts,
    nonce: successfulReplayEnvelope.nonce
  };
  for (const [phase, events, facts] of [
    ["origin", origin.originTrace.callback_access_trace, originAccessFacts],
    [
      "replay",
      successfulReplayTrace.callback_access_trace,
      replayAccessFacts
    ]
  ]) {
    const accessPairs = [...new Set(
      events.map(({ store, method }) => `${store}:${method}`)
    )].sort(compareUtf8);
    for (const accessPair of accessPairs) {
      const [store, method] = accessPair.split(":");
      const changed = events.filter(
        (event) => event.store !== store || event.method !== method
      );
      const caseId = `${phase}_missing_${store}_${method}`;
      let rejected = false;
      try {
        assertRequiredAccessTrace(phase, changed, facts);
      } catch {
        rejected = true;
      }
      assert.equal(rejected, true, caseId);
      accessTraceMutationControls[caseId] = rejected;
    }
  }
  for (const [caseId, phase, mutate] of [
    [
      "origin_uninstrumented_store",
      "origin",
      (events) => events.push({
        order: events.length + 1,
        store: "uninstrumentedStore",
        method: "get",
        key: canonicalText(["unexpected"]),
        before_present: false,
        after_present: false,
        before_hash: null,
        after_hash: null
      })
    ],
    [
      "replay_noncontiguous_order",
      "replay",
      (events) => {
        events[0].order = 99;
      }
    ]
  ]) {
    const source = phase === "origin"
      ? origin.originTrace.callback_access_trace
      : successfulReplayTrace.callback_access_trace;
    const changed = structuredClone(source);
    mutate(changed);
    let rejected = false;
    try {
      assertRequiredAccessTrace(
        phase,
        changed,
        phase === "origin" ? originAccessFacts : replayAccessFacts
      );
    } catch {
      rejected = true;
    }
    assert.equal(rejected, true, caseId);
    accessTraceMutationControls[caseId] = rejected;
  }

  const signedHistoryMutationControls = {};
  const rejectHistoryMutation = (caseId, source, mutate) => {
    const changed = structuredClone(source);
    mutate(changed);
    const rejected = verifyCompositeHistory(changed) === false;
    assert.equal(rejected, true, caseId);
    signedHistoryMutationControls[caseId] = rejected;
  };
  for (const [caseId, collection, first, second] of [
    ["service_commits_reordered", "service_commits", 1, 2],
    ["dependency_commits_reordered", "dependency_commits", 1, 2],
    ["scope_commits_reordered", "scope_commits", 0, 1],
    [
      "observation_repository_reordered",
      "observation_repository",
      0,
      1
    ],
    ["observations_reordered", "observations", 0, 1],
    ["validation_bindings_reordered", "validation_bindings", 0, 1],
    [
      "receiver_authentication_records_reordered",
      "receiver_authentication_records",
      0,
      1
    ],
    [
      "host_authentication_contexts_reordered",
      "host_authentication_contexts",
      0,
      1
    ],
    ["request_envelopes_reordered", "request_envelopes", 0, 1],
    ["access_traces_reordered", "access_traces", 0, 1],
    ["callback_witnesses_reordered", "callback_witnesses", 0, 1]
  ]) {
    rejectHistoryMutation(
      caseId,
      replayScenario.stores.sidecar,
      (sidecar) => {
        [
          sidecar[collection][first],
          sidecar[collection][second]
        ] = [
          sidecar[collection][second],
          sidecar[collection][first]
        ];
      }
    );
  }
  rejectHistoryMutation(
    "dependency_rows_reordered",
    replayScenario.stores.sidecar,
    (sidecar) => {
      const first = sidecar.dependency_rows.findIndex(
        ({ global_sequence: sequence }) => sequence === 1
      );
      assert.notEqual(first, -1);
      [
        sidecar.dependency_rows[first],
        sidecar.dependency_rows[first + 1]
      ] = [
        sidecar.dependency_rows[first + 1],
        sidecar.dependency_rows[first]
      ];
    }
  );
  rejectHistoryMutation(
    "genesis_version_backdated_extra",
    replayScenario.stores.sidecar,
    (sidecar) => {
      const version = structuredClone(
        sidecar.operational_versions.find(
          (candidate) =>
            candidate.table === "used_nonces" &&
            candidate.valid_from_global_sequence === 2
        )
      );
      assert.ok(version);
      version.valid_from_global_sequence = 0;
      sidecar.operational_versions.push(version);
    }
  );
  rejectHistoryMutation(
    "genesis_manifest_rebound_extra",
    replayScenario.stores.sidecar,
    (sidecar) => {
      const draft = structuredClone(sidecar.genesis_manifest);
      draft.initial_rows.push(structuredClone(draft.initial_rows[0]));
      draft.manifest_hash = ZERO_HASH;
      sidecar.genesis_manifest = bindObjectHash(
        draft,
        AUTHORITATIVE_SCHEMA.$defs.genesisManifest
      );
    }
  );
  rejectHistoryMutation(
    "operational_version_extra_without_write",
    replayScenario.stores.sidecar,
    (sidecar) => {
      const version = structuredClone(
        sidecar.operational_versions.find(
          (candidate) =>
            candidate.table === "validation_keys" &&
            candidate.valid_from_global_sequence === 0
        )
      );
      assert.ok(version);
      version.valid_from_global_sequence = 1;
      sidecar.operational_versions.push(version);
    }
  );
  const rewriteOriginTrace = (sidecar, mutate) => {
    const trace = sidecar.access_traces.find(
      ({ global_sequence: sequence }) => sequence === 1
    );
    assert.ok(trace);
    mutate(trace.events);
    trace.events_commitment = canonicalHash(trace.events);
    replaceSignedObservation(sidecar, 1, (draft) => {
      draft.transaction.access_trace_commitment =
        trace.events_commitment;
    });
  };
  {
    const changedEnvelope = structuredClone(origin.envelope);
    changedEnvelope.operation_fingerprint = `sha-256:${"6".repeat(64)}`;
    const rejected =
      requestOperationFingerprintMatches(changedEnvelope) === false;
    assert.equal(rejected, true, "request_operation_fingerprint");
    signedHistoryMutationControls.request_operation_fingerprint = rejected;
  }
  {
    const originObservation = JSON.parse(
      origin.stores.sidecar.observation_repository[0]
        .canonical_observation_bytes
    );
    const changedObservation = structuredClone(originObservation);
    changedObservation.access.owner_kind = "actor";
    changedObservation.access.owner_id =
      changedObservation.request.actor_id;
    const derivedOwner = deriveObservationOwner(changedObservation);
    const rejected = derivedOwner === null ||
      changedObservation.access.owner_kind !== derivedOwner.owner_kind ||
      changedObservation.access.owner_id !== derivedOwner.owner_id;
    assert.equal(rejected, true, "owner_derivation_actor_for_principal");
    signedHistoryMutationControls.owner_derivation_actor_for_principal =
      rejected;
  }
  {
    const baseVersions = new Map(
      origin.stores.sidecar.current_projections.map((projection) => [
        projectionKey(projection),
        projection
      ])
    );
    const objectSchema = FROZEN_FOUNDATION.schemasByObjectId.get(
      origin.originObject.value.schema
    );
    assert.ok(objectSchema);
    const signaturePointer =
      objectSchema["x-cairn-signature-pointers"][0];
    const signingKeyId = valueAtPointer(
      origin.originObject.value,
      signaturePointer
    ).key_id;
    for (const [caseId, mutate] of [
      ["trace_signed_object_binding", (value) => {
        value.constraints.geography = ["substituted-region"];
      }],
      ["trace_signed_object_signed_hash", (value) => {
        valueAtPointer(value, signaturePointer).signed_hash = ZERO_HASH;
      }],
      ["trace_signed_object_signature_value", (value) => {
        valueAtPointer(value, signaturePointer).value = "A".repeat(86);
      }],
      ["trace_signed_object_historical_key", (_value, versions) => {
        const keyProjection = [...versions.values()].find(
          ({ table, columns }) =>
            table === "validation_keys" &&
            columns.key_id === signingKeyId
        );
        assert.ok(keyProjection);
        assert.notEqual(
          keyProjection.columns.public_key,
          SERVICE_OBSERVATION_PUBLIC_KEY
        );
        keyProjection.columns.public_key = SERVICE_OBSERVATION_PUBLIC_KEY;
      }]
    ]) {
      const changedObject = structuredClone(origin.originObject.value);
      const changedVersions = structuredClone(baseVersions);
      mutate(changedObject, changedVersions);
      const rejected = verifySignedObjectWitness(
        changedObject,
        changedVersions,
        COMPOSITE_FIXTURE.now
      ) === false;
      assert.equal(rejected, true, caseId);
      signedHistoryMutationControls[caseId] = rejected;
    }
  }
  for (const [caseId, sequence] of [
    ["dependency_sequence_negative", -1],
    ["dependency_sequence_zero", 0],
    ["dependency_sequence_future", origin.stores.sidecar.global_sequence + 1]
  ]) {
    rejectHistoryMutation(caseId, origin.stores.sidecar, (sidecar) => {
      sidecar.dependency_rows.push({
        ...structuredClone(sidecar.dependency_rows[0]),
        global_sequence: sequence
      });
    });
  }
  rejectHistoryMutation(
    "sidecar_uncommitted_operational_snapshot",
    origin.stores.sidecar,
    (sidecar) => {
      sidecar.operational_snapshots = [];
    }
  );
  for (const [caseId, mutate] of [
    ["sidecar_counter_substitution", (sidecar) => {
      sidecar.counters.callback_calls += 1;
    }],
    ["request_envelope_wrapper_extra", (sidecar) => {
      sidecar.request_envelopes[0].unexpected = true;
    }],
    ["receiver_authentication_wrapper_extra", (sidecar) => {
      sidecar.receiver_authentication_records[0].unexpected = true;
    }],
    ["validation_binding_wrapper_extra", (sidecar) => {
      sidecar.validation_bindings[0].unexpected = true;
    }],
    ["host_authentication_wrapper_extra", (sidecar) => {
      sidecar.host_authentication_contexts[0].unexpected = true;
    }],
    ["repository_wrapper_extra", (sidecar) => {
      sidecar.observation_repository[0].unexpected = true;
    }],
    ["service_commit_committed_at", (sidecar) => {
      sidecar.service_commits[1].committed_at =
        COMPOSITE_FIXTURE.genesis_at;
    }],
    ["service_commit_global_sequence", (sidecar) => {
      sidecar.service_commits[1].global_commit_sequence = 7;
    }],
    ["service_commit_wrapper_extra", (sidecar) => {
      sidecar.service_commits[1].unexpected = true;
    }],
    ["dependency_commit_wrapper_extra", (sidecar) => {
      sidecar.dependency_commits[1].unexpected = true;
    }],
    ["scope_commit_wrapper_extra", (sidecar) => {
      sidecar.scope_commits[0].unexpected = true;
    }],
    ["access_trace_wrapper_extra", (sidecar) => {
      sidecar.access_traces[0].unexpected = true;
    }],
    ["callback_witness_wrapper_extra", (sidecar) => {
      sidecar.callback_witnesses[0].unexpected = true;
    }]
  ]) {
    rejectHistoryMutation(caseId, origin.stores.sidecar, mutate);
  }
  for (const [caseId, mutate] of [
    ["callback_witness_missing", (sidecar) => {
      sidecar.callback_witnesses.length = 0;
    }],
    ["callback_witness_commit", (sidecar) => {
      sidecar.callback_witnesses[0].callback_commit = false;
    }],
    ["callback_witness_bytes", (sidecar) => {
      const result = JSON.parse(
        sidecar.callback_witnesses[0].canonical_result_bytes
      );
      result.status = 299;
      sidecar.callback_witnesses[0].canonical_result_bytes =
        canonicalText(result);
    }]
  ]) {
    rejectHistoryMutation(caseId, origin.stores.sidecar, mutate);
  }
  rejectHistoryMutation(
    "validation_binding_operation_contract",
    origin.stores.sidecar,
    (sidecar) => {
      sidecar.validation_bindings[0].operation_contract.consequence =
        "public_read";
    }
  );
  rejectHistoryMutation(
    "request_envelope_signature_value",
    origin.stores.sidecar,
    (sidecar) => {
      const row = sidecar.request_envelopes.find(
        ({ global_sequence: sequence }) => sequence === 1
      );
      assert.ok(row);
      const envelope = JSON.parse(row.canonical_envelope_bytes);
      envelope.signature.value = "A".repeat(86);
      row.canonical_envelope_bytes = canonicalText(envelope);
    }
  );
  rejectHistoryMutation(
    "request_envelope_signature_signed_hash",
    origin.stores.sidecar,
    (sidecar) => {
      const row = sidecar.request_envelopes.find(
        ({ global_sequence: sequence }) => sequence === 1
      );
      assert.ok(row);
      const envelope = JSON.parse(row.canonical_envelope_bytes);
      envelope.signature.signed_hash = ZERO_HASH;
      row.canonical_envelope_bytes = canonicalText(envelope);
    }
  );
  rejectHistoryMutation(
    "request_query_commitment",
    origin.stores.sidecar,
    (sidecar) => {
      replaceSignedObservation(sidecar, 1, (draft) => {
        draft.request.query_commitment = `sha-256:${"4".repeat(64)}`;
      });
    }
  );
  rejectHistoryMutation(
    "operational_version_future_sequence",
    origin.stores.sidecar,
    (sidecar) => {
      const projection = sidecar.current_projections.find(
        ({ table }) => table === "objects"
      );
      assert.ok(projection);
      sidecar.operational_versions.push(
        operationalVersionFor(projection, sidecar.global_sequence + 1)
      );
    }
  );
  rejectHistoryMutation(
    "operational_version_negative_sequence",
    origin.stores.sidecar,
    (sidecar) => {
      const projection = sidecar.current_projections.find(
        ({ table }) => table === "objects"
      );
      assert.ok(projection);
      sidecar.operational_versions.push(
        operationalVersionFor(projection, -1)
      );
    }
  );
  for (const [caseId, mutate] of [
    ["trace_remove_one_event", (events) => events.splice(0, 1)],
    ["trace_key_substitution", (events) => {
      events[0].key = canonicalText(["substituted-runtime-key"]);
    }],
    ["trace_presence_substitution", (events) => {
      events[0].before_present = !events[0].before_present;
    }],
    ["trace_hash_substitution", (events) => {
      events.at(-1).after_hash = `sha-256:${"9".repeat(64)}`;
    }],
    ["trace_value_and_hash_substitution", (events) => {
      events[0].before_value = {
        schema: "cairn.agent_runtime_binding.v0.1",
        runtime_binding_id:
          "urn:uuid:90000000-0000-4000-8000-000000000001"
      };
      events[0].after_value =
        structuredClone(events[0].before_value);
      events[0].before_hash = canonicalHash(events[0].before_value);
      events[0].after_hash = canonicalHash(events[0].after_value);
    }],
    ["trace_duplicate_event", (events) => {
      const duplicate = structuredClone(events.at(-1));
      duplicate.order += 1;
      events.push(duplicate);
    }]
  ]) {
    rejectHistoryMutation(
      caseId,
      origin.stores.sidecar,
      (sidecar) => rewriteOriginTrace(sidecar, mutate)
    );
  }
  rejectHistoryMutation(
    "trace_signed_object_binding_history",
    origin.stores.sidecar,
    (sidecar) => {
      const trace = sidecar.access_traces.find(
        ({ global_sequence: sequence }) => sequence === 1
      );
      assert.ok(trace);
      const write = trace.events.find(
        (event) =>
          event.store === "objectsByRef" &&
          event.method === "set" &&
          event.after_present
      );
      assert.ok(write?.after_value?.constraints);
      write.after_value.constraints.geography = ["substituted-region"];
      write.after_hash = canonicalHash(write.after_value);
      trace.events_commitment = canonicalHash(trace.events);
      const observation = replaceSignedObservation(
        sidecar,
        1,
        (draft) => {
          draft.transaction.access_trace_commitment =
            trace.events_commitment;
        }
      );
      const richRow = sidecar.rich_idempotency_rows.find(
        ({ origin_global_commit_sequence: sequence }) => sequence === 1
      );
      assert.ok(richRow);
      richRow.origin_observation_ref = {
        artifact_schema: observation.schema,
        artifact_id: observation.observation_id,
        artifact_hash: observation.observation_hash
      };
    }
  );
  rejectHistoryMutation(
    "trace_write_before_value_and_hash_substitution",
    multiOriginSidecar,
    (sidecar) => {
      const trace = sidecar.access_traces.find(
        ({ global_sequence: sequence }) => sequence === 2
      );
      assert.ok(trace);
      const write = trace.events.find(
        (event) => event.method === "set" && event.before_present
      );
      assert.ok(write);
      write.before_value = {
        substituted: "coherent-but-not-authoritative"
      };
      write.before_hash = canonicalHash(write.before_value);
      trace.events_commitment = canonicalHash(trace.events);
      const observation = replaceSignedObservation(
        sidecar,
        2,
        (draft) => {
          draft.transaction.access_trace_commitment =
            trace.events_commitment;
        }
      );
      const richRow = sidecar.rich_idempotency_rows.find(
        ({ origin_global_commit_sequence: sequence }) => sequence === 2
      );
      assert.ok(richRow);
      richRow.origin_observation_ref = {
        artifact_schema: observation.schema,
        artifact_id: observation.observation_id,
        artifact_hash: observation.observation_hash
      };
    }
  );
  rejectHistoryMutation(
    "signed_trace_commitment_divergence",
    origin.stores.sidecar,
    (sidecar) => {
      replaceSignedObservation(sidecar, 1, (draft) => {
        draft.transaction.access_trace_commitment =
          `sha-256:${"8".repeat(64)}`;
      });
    }
  );
  for (const [caseId, mutate] of [
    ["host_account_tenant_commitment", (context) => {
      context.account_tenant_commitment = `sha-256:${"1".repeat(64)}`;
    }],
    ["host_principal_id", (context) => {
      context.principal_id = "did:example:substituted-principal";
    }],
    ["host_actor_id", (context) => {
      context.actor_id = "did:example:substituted-actor";
    }],
    ["host_runtime_key_id", (context) => {
      context.runtime_key_id = "did:example:substituted-runtime";
    }],
    ["host_authority_namespace_commitment", (context) => {
      context.authority_namespace_commitment =
        `sha-256:${"2".repeat(64)}`;
    }],
    ["host_trust_profile_id", (context) => {
      context.trust_profile_id = "cairn:substituted-host-profile";
    }],
    ["host_trust_profile_hash", (context) => {
      context.trust_profile_hash = `sha-256:${"3".repeat(64)}`;
    }],
    ["host_authentication_evidence", (context) => {
      context.authentication_evidence_commitment =
        `sha-256:${"4".repeat(64)}`;
    }],
    ["host_assertion_level", (context) => {
      context.assertion_level = "substituted";
    }]
  ]) {
    rejectHistoryMutation(
      caseId,
      origin.stores.sidecar,
      (sidecar) => {
        const row = sidecar.host_authentication_contexts.find(
          ({ global_sequence: sequence }) => sequence === 1
        );
        assert.ok(row);
        const draft = structuredClone(row.context);
        mutate(draft);
        draft.context_hash = ZERO_HASH;
        row.context = bindObjectHash(
          draft,
          AUTHORITATIVE_SCHEMA.$defs.hostAuthenticationContext
        );
        replaceSignedObservation(sidecar, 1, (observation) => {
          observation.request.host_authentication_context_hash =
            row.context.context_hash;
        });
      }
    );
  }
  rejectHistoryMutation(
    "receiver_operation_qualified_namespace",
    replayScenario.stores.sidecar,
    (sidecar) => {
      const receiverRow =
        sidecar.receiver_authentication_records.find(
          ({ global_sequence: sequence }) => sequence === 2
        );
      const hostRow = sidecar.host_authentication_contexts.find(
        ({ global_sequence: sequence }) => sequence === 2
      );
      assert.ok(receiverRow);
      assert.ok(hostRow);
      receiverRow.record.authority_namespace_raw += "|intent.put";
      receiverRow.record.authority_namespace_commitment =
        receiverAuthorityNamespaceCommitment(
          receiverRow.record.account_tenant_commitment,
          receiverRow.record.authority_namespace_raw
        );
      hostRow.context =
        hostAuthenticationContextFromReceiver(receiverRow.record);
      replaceSignedObservation(sidecar, 2, (observation) => {
        observation.request.host_authentication_context_hash =
          hostRow.context.context_hash;
      });
    }
  );
  rejectHistoryMutation(
    "alias_noncanonical_attempted_key",
    origin.stores.sidecar,
    (sidecar) => {
      const entry = sidecar.dependency_rows.find(
        (candidate) =>
          candidate.global_sequence === 1 &&
          JSON.parse(candidate.structural_key)[0] === "index"
      );
      assert.ok(entry);
      entry.structural_key = canonicalText([
        "index",
        "grant_ref",
        "data_grants|grant_ref|non-canonical-attempted-key"
      ]);
      entry.entry_key = canonicalText([
        entry.table_name,
        entry.structural_key
      ]);
      replaceSignedObservation(
        sidecar,
        1,
        () => {},
        { refreshDependencyLinks: true }
      );
    }
  );
  rejectHistoryMutation(
    "dependency_access_kind_substitution",
    origin.stores.sidecar,
    (sidecar) => {
      const entry = sidecar.dependency_rows.find(
        (candidate) =>
          candidate.global_sequence === 1 &&
          candidate.table_name === "runtime_bindings" &&
          JSON.parse(candidate.structural_key)[0] !== "index"
      );
      assert.ok(entry);
      entry.access_kind = "write_insert";
      replaceSignedObservation(
        sidecar,
        1,
        () => {},
        { refreshDependencyLinks: true }
      );
    }
  );
  rejectHistoryMutation(
    "false_absent_hidden_identity_fork",
    origin.stores.sidecar,
    (sidecar) => {
      const original = sidecar.current_projections.find(
        (projection) =>
          projection.table === "objects" &&
          projection.columns.identity_key ===
            origin.originObject.identity_key
      );
      assert.ok(original);
      const fork = structuredClone(original);
      fork.columns.ref.object_hash = `sha-256:${"c".repeat(64)}`;
      fork.columns.object_hash = fork.columns.ref.object_hash;
      fork.structural_key = objectStructuralKey(fork.columns.ref);
      upsertCurrentProjection(sidecar, fork);
      sidecar.operational_versions.push(
        operationalVersionFor(fork, 0)
      );
    }
  );
  for (const [caseId, mutate] of [
    ["trust_service_id", (draft) => {
      draft.service.service_id = "cairn:substituted-service";
    }],
    ["trust_profile", (draft) => {
      draft.service.profile = "cairn-substituted-profile-v0.1";
    }],
    ["trust_bundle_hash", (draft) => {
      draft.service.bundle_hash = `sha-256:${"7".repeat(64)}`;
    }],
    ["trust_store_id", (draft) => {
      draft.service.store_id =
        "urn:uuid:70000000-0000-4000-8000-000000000001";
    }],
    ["trust_key_profile_id", (draft) => {
      draft.service.key_profile_ref.artifact_id =
        "urn:uuid:70000000-0000-4000-8000-000000000002";
    }],
    ["trust_key_profile_ref_hash", (draft) => {
      draft.service.key_profile_ref.artifact_hash =
        `sha-256:${"6".repeat(64)}`;
    }],
    ["trust_key_profile_hash", (draft) => {
      draft.service.key_profile_hash =
        `sha-256:${"5".repeat(64)}`;
    }],
    ["trust_signature_profile", (draft) => {
      draft.service_signature.profile =
        "cairn-substituted-signature-v0.1";
    }],
    ["trust_signature_key", (draft) => {
      draft.service_signature.key_id =
        "https://cairn.invalid/keys/substituted";
    }],
    ["trust_signature_time", (draft) => {
      draft.service_signature.signed_at = "2026-07-23T16:00:01Z";
    }]
  ]) {
    rejectHistoryMutation(
      caseId,
      origin.stores.sidecar,
      (sidecar) => replaceSignedObservation(sidecar, 1, mutate)
    );
  }
  rejectHistoryMutation(
    "trust_signature_signed_hash",
    origin.stores.sidecar,
    (sidecar) => {
      const observation = structuredClone(sidecar.observations[0]);
      observation.service_signature.signed_hash =
        `sha-256:${"d".repeat(64)}`;
      assert.equal(
        objectHash(
          observation,
          AUTHORITATIVE_SCHEMA.$defs.serviceObservation
        ),
        observation.observation_hash
      );
      assert.equal(
        verifyEd25519({
          schemaId: observation.schema,
          objectHash: observation.observation_hash,
          publicKey: SERVICE_OBSERVATION_PUBLIC_KEY,
          signature: observation.service_signature.value
        }),
        true
      );
      sidecar.observations[0] = observation;
      sidecar.observation_repository[0].canonical_observation_bytes =
        canonicalText(observation);
    }
  );
  const serviceProfileMutationControls = {};
  const observationForProfileChain = (
    profileChain,
    profileIndex = profileChain.length - 1,
    observedAt = COMPOSITE_FIXTURE.now
  ) => {
    const profile = profileChain[profileIndex];
    const draft = structuredClone(
      origin.originTrace.local_result.service_observation
    );
    draft.service.service_id = profile.service_id;
    draft.service.profile = profile.kernel_profile;
    draft.service.bundle_hash = profile.bundle_hash;
    draft.service.store_id = profile.store_id;
    draft.service.key_profile_ref = {
      artifact_schema: profile.schema,
      artifact_id: profile.profile_id,
      artifact_hash: profile.profile_hash
    };
    draft.service.key_profile_hash = profile.profile_hash;
    draft.observed_at = observedAt;
    draft.service_signature.key_id = profile.current_key_id;
    draft.service_signature.signed_at = observedAt;
    draft.observation_hash = ZERO_HASH;
    draft.service_signature.signed_hash = ZERO_HASH;
    draft.service_signature.value = "A".repeat(86);
    return bindAndSignServiceObservation(draft);
  };
  const reboundCurrentProfile = (mutate) => {
    const chain = structuredClone(SERVICE_KEY_PROFILE_CHAIN);
    const draft = chain.at(-1);
    mutate(draft);
    draft.profile_hash = ZERO_HASH;
    chain[chain.length - 1] = bindObjectHash(
      draft,
      AUTHORITATIVE_SCHEMA.$defs.localServiceKeyProfile
    );
    return chain;
  };
  const reboundProfileChain = (profileIndex, mutate) => {
    const chain = structuredClone(SERVICE_KEY_PROFILE_CHAIN);
    mutate(chain[profileIndex]);
    for (let index = profileIndex; index < chain.length; index += 1) {
      const draft = chain[index];
      if (index > 0) {
        draft.prior_profile_hash = chain[index - 1].profile_hash;
      }
      draft.profile_hash = ZERO_HASH;
      chain[index] = bindObjectHash(
        draft,
        AUTHORITATIVE_SCHEMA.$defs.localServiceKeyProfile
      );
    }
    return chain;
  };
  const historicalObservation = observationForProfileChain(
    SERVICE_KEY_PROFILE_CHAIN,
    0,
    "2026-07-01T12:00:00Z"
  );
  const historicalProfilePositive = verifyCompositeObservation(
    historicalObservation,
    SERVICE_KEY_PROFILE_CHAIN
  );
  assert.equal(historicalProfilePositive, true);
  {
    const invalidSuffix = reboundCurrentProfile((draft) => {
      draft.keys[0].controller = "cairn:invalid-later-controller";
    });
    const rejected = verifyCompositeObservation(
      historicalObservation,
      invalidSuffix
    ) === false;
    assert.equal(rejected, true, "profile_historical_invalid_suffix");
    serviceProfileMutationControls.profile_historical_invalid_suffix =
      rejected;
  }
  for (const [caseId, profileChain] of [
    ["profile_wrong_controller", reboundCurrentProfile((draft) => {
      draft.keys[0].controller = "cairn:substituted-controller";
    })],
    ["profile_revoked_key", reboundCurrentProfile((draft) => {
      draft.keys[0].status = "revoked";
      draft.keys[0].revocation_time = "2026-07-23T15:59:59Z";
    })],
    ["profile_expired_key", reboundCurrentProfile((draft) => {
      draft.keys[0].expires_at = "2026-07-23T16:00:00Z";
    })],
    ["profile_missing_current_key", reboundCurrentProfile((draft) => {
      draft.current_key_id =
        "https://cairn.invalid/keys/missing-current";
    })],
    ["profile_noncurrent_signing_key", reboundCurrentProfile((draft) => {
      draft.keys.unshift({
        ...structuredClone(draft.keys[0]),
        key_id: "https://cairn.invalid/keys/service-0"
      });
    })]
  ]) {
    let observation = observationForProfileChain(profileChain);
    if (caseId === "profile_noncurrent_signing_key") {
      const draft = structuredClone(observation);
      draft.service_signature.key_id =
        "https://cairn.invalid/keys/service-0";
      draft.observation_hash = ZERO_HASH;
      draft.service_signature.signed_hash = ZERO_HASH;
      draft.service_signature.value = "A".repeat(86);
      observation = bindAndSignServiceObservation(draft);
    }
    const rejected =
      verifyCompositeObservation(observation, profileChain) === false;
    assert.equal(rejected, true, caseId);
    serviceProfileMutationControls[caseId] = rejected;
  }
  for (const [caseId, profileChain] of [
    [
      "profile_historical_missing_current",
      reboundProfileChain(0, (draft) => {
        draft.current_key_id =
          "https://cairn.invalid/keys/missing-historical";
      })
    ],
    [
      "profile_historical_revoked_key",
      reboundProfileChain(0, (draft) => {
        draft.keys[0].status = "revoked";
        draft.keys[0].revocation_time = "2026-06-30T00:00:00Z";
      })
    ],
    [
      "profile_historical_expired_at_creation",
      reboundProfileChain(0, (draft) => {
        draft.keys[0].expires_at = draft.created_at;
      })
    ]
  ]) {
    const observation = observationForProfileChain(
      profileChain,
      0,
      "2026-07-01T12:00:00Z"
    );
    const rejected =
      verifyCompositeObservation(observation, profileChain) === false;
    assert.equal(rejected, true, caseId);
    serviceProfileMutationControls[caseId] = rejected;
  }
  {
    const profileChain = structuredClone(SERVICE_KEY_PROFILE_CHAIN);
    profileChain.at(-1).keys[0].profile_revision += 1;
    const rejected = verifyCompositeObservation(
      observationForProfileChain(profileChain),
      profileChain
    ) === false;
    assert.equal(rejected, true, "profile_self_hash");
    serviceProfileMutationControls.profile_self_hash = rejected;
  }
  const siblingProfileDraft = {
    ...structuredClone(SERVICE_KEY_PROFILE),
    profile_id: "urn:uuid:90000000-0000-4000-8000-000000000002",
    profile_hash: ZERO_HASH,
    created_at: "2026-07-23T15:59:58Z"
  };
  const siblingProfile = bindObjectHash(
    siblingProfileDraft,
    AUTHORITATIVE_SCHEMA.$defs.localServiceKeyProfile
  );
  for (const [caseId, profileChain, expectedHash] of [
    [
      "profile_chain_link",
      reboundCurrentProfile((draft) => {
        draft.prior_profile_hash = `sha-256:${"b".repeat(64)}`;
      }),
      SERVICE_KEY_PROFILE.profile_hash
    ],
    [
      "profile_chain_order",
      [...SERVICE_KEY_PROFILE_CHAIN].reverse(),
      SERVICE_KEY_PROFILE.profile_hash
    ],
    [
      "profile_chain_fork",
      [
        PRIOR_SERVICE_KEY_PROFILE,
        siblingProfile,
        SERVICE_KEY_PROFILE
      ],
      SERVICE_KEY_PROFILE.profile_hash
    ],
    [
      "profile_chain_rollback",
      [PRIOR_SERVICE_KEY_PROFILE],
      SERVICE_KEY_PROFILE.profile_hash
    ],
    [
      "profile_noncurrent_interval",
      reboundCurrentProfile((draft) => {
        draft.keys.unshift({
          ...structuredClone(draft.keys[0]),
          key_id: "https://cairn.invalid/keys/service-0",
          not_before: "2027-01-01T00:00:00Z",
          expires_at: "2026-01-01T00:00:00Z"
        });
      }),
      null
    ],
    [
      "profile_future_created",
      reboundCurrentProfile((draft) => {
        draft.created_at = "2026-07-23T16:00:01Z";
      }),
      null
    ]
  ]) {
    const rejected = verifyServiceKeyProfileChain(
      profileChain,
      COMPOSITE_FIXTURE.now,
      expectedHash ?? profileChain.at(-1).profile_hash
    ) === false;
    assert.equal(rejected, true, caseId);
    serviceProfileMutationControls[caseId] = rejected;
  }
  rejectHistoryMutation(
    "owner_counter_substitution",
    origin.stores.sidecar,
    (sidecar) => {
      const ownerKey = ownerSequenceKey(
        "principal",
        origin.authentication.principalId
      );
      sidecar.owner_sequences[ownerKey] += 1;
    }
  );
  for (const [caseId, source, sequence, replacement] of [
    [
      "transaction_kind_open_value",
      origin.stores.sidecar,
      1,
      "arbitrary_future_kind"
    ],
    [
      "transaction_kind_origin_as_replay",
      origin.stores.sidecar,
      1,
      "replay"
    ],
    [
      "transaction_kind_origin_as_genesis",
      origin.stores.sidecar,
      1,
      "genesis"
    ],
    [
      "transaction_kind_genesis_as_operation",
      origin.stores.sidecar,
      0,
      "service_operation"
    ],
    [
      "transaction_kind_replay_as_operation",
      replayScenario.stores.sidecar,
      2,
      "service_operation"
    ]
  ]) {
    rejectHistoryMutation(caseId, source, (sidecar) => {
      sidecar.service_commits[sequence].transaction_kind = replacement;
    });
  }
  for (const [field, replacement] of [
    ["actor_id", "did:web:substituted-agent.example"],
    ["authority_namespace", "did:example:substituted|intent.put"],
    ["created_global_commit_sequence", 9],
    ["created_scope_sequence", 9],
    ["idempotency_key", "substituted-idempotency-key"],
    ["kernel_result_hash", `sha-256:${"4".repeat(64)}`],
    ["operation_fingerprint", `sha-256:${"3".repeat(64)}`],
    ["operation_name", "capabilities.get"],
    ["origin_global_commit_sequence", 9],
    ["origin_scope_sequence", 9],
    ["principal_id", "did:example:substituted"],
    ["runtime_key_id", "did:web:agent.example#substituted-runtime"]
  ]) {
    rejectHistoryMutation(
      `rich_${field}`,
      origin.stores.sidecar,
      (sidecar) => {
        sidecar.rich_idempotency_rows[0][field] = replacement;
      }
    );
  }
  rejectHistoryMutation(
    "rich_result_ref",
    origin.stores.sidecar,
    (sidecar) => {
      sidecar.rich_idempotency_rows[0].result_ref.object_hash =
        `sha-256:${"2".repeat(64)}`;
    }
  );
  rejectHistoryMutation(
    "rich_origin_observation_ref",
    origin.stores.sidecar,
    (sidecar) => {
      sidecar.rich_idempotency_rows[0]
        .origin_observation_ref.artifact_hash =
          `sha-256:${"1".repeat(64)}`;
    }
  );
  rejectHistoryMutation(
    "rich_duplicate_row",
    origin.stores.sidecar,
    (sidecar) => {
      sidecar.rich_idempotency_rows.push(
        structuredClone(sidecar.rich_idempotency_rows[0])
      );
    }
  );
  rejectHistoryMutation(
    "rich_missing_row",
    origin.stores.sidecar,
    (sidecar) => {
      sidecar.rich_idempotency_rows = [];
    }
  );
  rejectHistoryMutation(
    "frozen_missing_row",
    origin.stores.sidecar,
    (sidecar) => {
      sidecar.frozen_idempotency_rows = [];
    }
  );
  rejectHistoryMutation(
    "frozen_fingerprint",
    origin.stores.sidecar,
    (sidecar) => {
      sidecar.frozen_idempotency_rows[0][1].fingerprint =
        `sha-256:${"e".repeat(64)}`;
    }
  );
  rejectHistoryMutation(
    "frozen_result_ref",
    origin.stores.sidecar,
    (sidecar) => {
      sidecar.frozen_idempotency_rows[0][1].result_ref.object_hash =
        `sha-256:${"f".repeat(64)}`;
    }
  );
  rejectHistoryMutation(
    "frozen_extra_field",
    origin.stores.sidecar,
    (sidecar) => {
      sidecar.frozen_idempotency_rows[0][1].unexpected = true;
    }
  );
  rejectHistoryMutation(
    "frozen_duplicate_row",
    origin.stores.sidecar,
    (sidecar) => {
      sidecar.frozen_idempotency_rows.push(
        structuredClone(sidecar.frozen_idempotency_rows[0])
      );
    }
  );
  rejectHistoryMutation(
    "rich_projection_missing",
    origin.stores.sidecar,
    (sidecar) => {
      sidecar.current_projections =
        sidecar.current_projections.filter(
          ({ table }) => table !== "idempotency_records"
        );
    }
  );
  rejectHistoryMutation(
    "rich_version_missing",
    origin.stores.sidecar,
    (sidecar) => {
      sidecar.operational_versions =
        sidecar.operational_versions.filter(
          ({ table }) => table !== "idempotency_records"
        );
    }
  );
  rejectHistoryMutation(
    "rich_origin_dependency_missing",
    origin.stores.sidecar,
    (sidecar) => {
      sidecar.dependency_rows = sidecar.dependency_rows.filter(
        ({ global_sequence: sequence, table_name: tableName }) =>
          sequence !== 1 || tableName !== "idempotency_records"
      );
    }
  );
  for (const [caseId, mutate] of [
    ["grant_effect_removed", (draft) => {
      draft.result.grant_effects = [];
    }],
    ["grant_effect_remaining", (draft) => {
      draft.result.grant_effects[0].remaining_after = 0;
    }],
    ["grant_effect_state_version", (draft) => {
      draft.result.grant_effects[0].state_version_before = 1;
    }],
    ["grant_effect_ref", (draft) => {
      draft.result.grant_effects[0].grant_ref.object_hash =
        `sha-256:${"a".repeat(64)}`;
    }]
  ]) {
    rejectHistoryMutation(
      caseId,
      origin.stores.sidecar,
      (sidecar) => replaceSignedObservation(sidecar, 1, mutate)
    );
  }

  const replayFaults = {};
  for (const kind of [
    "missing_result_object",
    "corrupt_result_binding",
    "missing_result_acl",
    "public_result_acl",
    "foreign_result_acl"
  ]) {
    const scenario = await buildIntentScenario(kind);
    scenario.stores.injectReplayFault(kind);
    const baselineKernel = kernelSnapshot(scenario.stores);
    const baselineSidecar = sidecarSnapshot(scenario.stores.sidecar);
    const replayEnvelope = scenario.helpers.freshTransport(
      scenario.envelope,
      55
    );
    scenario.stores.installContext({
      case_id: kind,
      phase: "replay",
      envelope: replayEnvelope,
      authentication: scenario.authentication,
      receiver_authentication: scenario.receiverAuthentication,
      integrity_fault: kind
    });
    const raw = scenario.harness.service.handleEnvelope(
      replayEnvelope,
      scenario.authentication
    );
    const trace = scenario.stores.traces.at(-1);
    assert.equal(raw.code, "authoritative_integrity_invalid", kind);
    assert.equal(
      trace.callback_value.code,
      "idempotency_result_unavailable",
      kind
    );
    assert.equal(trace.callback_commit, true, kind);
    assert.equal(trace.final_commit, false, kind);
    assert.deepEqual(trace.kernel_after, baselineKernel, kind);
    assert.deepEqual(trace.sidecar_after, baselineSidecar, kind);
    replayFaults[kind] = { raw: structuredClone(raw), trace };
  }

  const wrapperFaults = {};
  for (const stage of [
    "response_schema",
    "observation",
    "persistence",
    "commit"
  ]) {
    const scenario = await buildIntentScenario(stage);
    const baselineKernel = kernelSnapshot(scenario.stores);
    const baselineSidecar = sidecarSnapshot(scenario.stores.sidecar);
    const replayEnvelope = scenario.helpers.freshTransport(
      scenario.envelope,
      56
    );
    const context = {
      case_id: `${stage}_failure`,
      phase: "replay",
      envelope: replayEnvelope,
      authentication: scenario.authentication,
      receiver_authentication: scenario.receiverAuthentication
    };
    if (stage === "response_schema") {
      context.response_schema_mutation = "delete_ref";
    } else {
      context.throw_stage = stage;
    }
    scenario.stores.installContext(context);
    const raw = scenario.harness.service.handleEnvelope(
      replayEnvelope,
      scenario.authentication
    );
    const trace = scenario.stores.traces.at(-1);
    assert.equal(raw.ok, false, stage);
    assert.equal(raw.code, `${stage}_failed`, stage);
    assert.equal(trace.callback_commit, true, stage);
    assert.equal(trace.final_commit, false, stage);
    assert.deepEqual(trace.kernel_after, baselineKernel, stage);
    assert.deepEqual(trace.sidecar_after, baselineSidecar, stage);
    if (stage === "response_schema") {
      assert.equal(trace.response_validation.accepted, false);
      assert.equal(Object.hasOwn(trace.callback_value.body, "ref"), false);
      assert.equal(Object.hasOwn(trace.frozen_callback_value.body, "ref"), true);
    }
    wrapperFaults[stage] = { raw: structuredClone(raw), trace };
  }

  const unexpectedWrapperFaults = {};
  for (const stage of ["observation", "persistence", "commit"]) {
    const scenario = await buildIntentScenario(
      `unexpected_${stage}`
    );
    const baselineKernel = kernelSnapshot(scenario.stores);
    const baselineSidecar = sidecarSnapshot(scenario.stores.sidecar);
    const replayEnvelope = scenario.helpers.freshTransport(
      scenario.envelope,
      61
    );
    scenario.stores.installContext({
      case_id: `unexpected_${stage}_failure`,
      phase: "replay",
      envelope: replayEnvelope,
      authentication: scenario.authentication,
      receiver_authentication: scenario.receiverAuthentication,
      throw_untyped_stage: stage
    });
    const raw = scenario.harness.service.handleEnvelope(
      replayEnvelope,
      scenario.authentication
    );
    const trace = scenario.stores.traces.at(-1);
    assert.equal(raw.ok, false, stage);
    assert.equal(raw.code, `${stage}_failed`, stage);
    assert.equal(trace.callback_commit, true, stage);
    assert.equal(trace.final_commit, false, stage);
    assert.equal(trace.wrapper_failure.code, `${stage}_failed`, stage);
    assert.equal(
      trace.local_result.kernel.status,
      trace.callback_value.status,
      stage
    );
    assert.deepEqual(trace.kernel_after, baselineKernel, stage);
    assert.deepEqual(trace.sidecar_after, baselineSidecar, stage);
    unexpectedWrapperFaults[stage] = {
      raw: structuredClone(raw),
      trace
    };
  }

  const grantScenario = await buildIntentScenario("grant_consumption");
  const grantBaselineKernel = kernelSnapshot(grantScenario.stores);
  const grantBaselineSidecar = sidecarSnapshot(grantScenario.stores.sidecar);
  const grantAttempt = grantScenario.helpers.newIdempotentAttempt(
    grantScenario.envelope,
    57,
    "reference-intent-idempotency-0002"
  );
  grantScenario.stores.installContext({
    case_id: "grant_consumption_failed",
    phase: "new_operation",
    envelope: grantAttempt,
    authentication: grantScenario.authentication,
    receiver_authentication: grantScenario.receiverAuthentication,
    fault: "grant_consumption_failed"
  });
  const grantRaw = grantScenario.harness.service.handleEnvelope(
    grantAttempt,
    grantScenario.authentication
  );
  const grantTrace = grantScenario.stores.traces.at(-1);
  assert.equal(grantRaw.code, "grant_consumption_failed");
  assert.equal(grantTrace.callback_commit, false);
  assert.equal(grantTrace.final_commit, false);
  assert.deepEqual(grantTrace.kernel_after, grantBaselineKernel);
  assert.deepEqual(grantTrace.sidecar_after, grantBaselineSidecar);

  const receiverIdentityMismatches = {};
  for (const kind of ["principal", "actor"]) {
    const scenario =
      await buildIntentScenario(`receiver_${kind}_mismatch`);
    const baselineKernel = kernelSnapshot(scenario.stores);
    const baselineSidecar = sidecarSnapshot(scenario.stores.sidecar);
    const envelope = scenario.helpers.makeEnvelope({
      operationName: "intent.put",
      body: scenario.envelope.body,
      subjectRefs: scenario.envelope.subject_refs,
      authorizationRefs: scenario.envelope.authorization_refs,
      messageNumber: kind === "principal" ? 65 : 66,
      nonce: kind === "principal"
        ? "reference-nonce-00000065"
        : "reference-nonce-00000066",
      idempotencyKey: scenario.envelope.idempotency_key,
      principalId: kind === "principal"
        ? "did:example:substituted-principal"
        : scenario.envelope.principal_id
    });
    const authentication = {
      principalId: envelope.principal_id,
      actorId: envelope.sender.actor_id,
      authorityNamespace:
        scenario.authentication.authorityNamespace
    };
    let receiver = scenario.receiverAuthentication;
    if (kind === "actor") {
      receiver = receiverAuthenticationRecord({
        ...authentication,
        actorId: "did:example:substituted-actor"
      }, envelope);
      receiver.authentication_handle += "|actor-mismatch";
      assert.equal(validateReceiverAuthenticationRecord(receiver), true);
    }
    scenario.stores.installContext({
      case_id: `receiver_${kind}_mismatch`,
      phase: "replay",
      envelope,
      authentication,
      receiver_authentication: receiver
    });
    const raw = scenario.harness.service.handleEnvelope(
      envelope,
      authentication
    );
    const trace = scenario.stores.traces.at(-1);
    assert.equal(raw.code, "receiver_authentication_invalid", kind);
    assert.equal(trace.callback_commit, null, kind);
    assert.equal(trace.callback_value, null, kind);
    assert.deepEqual(trace.callback_access_trace, [], kind);
    assert.equal(trace.final_commit, false, kind);
    assert.deepEqual(trace.kernel_after, baselineKernel, kind);
    assert.deepEqual(trace.sidecar_after, baselineSidecar, kind);
    const controlName = `request_receiver_${kind}_binding`;
    signedHistoryMutationControls[controlName] = true;
    receiverIdentityMismatches[kind] = {
      raw: structuredClone(raw),
      trace
    };
  }

  const receiverStabilityScenario =
    await buildIntentScenario("receiver_stability_origin");
  const receiverStabilityBaselineKernel =
    kernelSnapshot(receiverStabilityScenario.stores);
  const receiverStabilityBaselineSidecar =
    sidecarSnapshot(receiverStabilityScenario.stores.sidecar);
  const receiverStabilityEnvelope =
    receiverStabilityScenario.helpers.freshTransport(
      receiverStabilityScenario.envelope,
      59
    );
  const operationQualifiedReceiver = receiverAuthenticationRecord({
    ...receiverStabilityScenario.authentication,
    authorityNamespace:
      `${receiverStabilityScenario.authentication.authorityNamespace}|intent.put`
  }, receiverStabilityEnvelope);
  const operationQualifiedAuthentication =
    frozenAuthenticationFromReceiver(operationQualifiedReceiver);
  receiverStabilityScenario.stores.installContext({
    case_id: "receiver_stability_preflight",
    phase: "replay",
    envelope: receiverStabilityEnvelope,
    authentication: operationQualifiedAuthentication,
    receiver_authentication: operationQualifiedReceiver
  });
  const receiverStabilityRaw =
    receiverStabilityScenario.harness.service.handleEnvelope(
      receiverStabilityEnvelope,
      operationQualifiedAuthentication
    );
  const receiverStabilityTrace =
    receiverStabilityScenario.stores.traces.at(-1);
  assert.equal(
    receiverStabilityRaw.code,
    "receiver_authentication_invalid"
  );
  assert.equal(receiverStabilityTrace.callback_commit, null);
  assert.equal(receiverStabilityTrace.callback_value, null);
  assert.deepEqual(receiverStabilityTrace.callback_access_trace, []);
  assert.equal(receiverStabilityTrace.wrapper_failure.stage, "preflight");
  assert.deepEqual(
    receiverStabilityTrace.kernel_after,
    receiverStabilityBaselineKernel
  );
  assert.deepEqual(
    receiverStabilityTrace.sidecar_after,
    receiverStabilityBaselineSidecar
  );

  const receiverContextEnvelope =
    receiverStabilityScenario.helpers.freshTransport(
      receiverStabilityScenario.envelope,
      60
    );
  const receiverContextRecord = receiverAuthenticationRecord(
    receiverStabilityScenario.authentication,
    receiverContextEnvelope
  );
  receiverContextRecord.authentication_handle =
    `${receiverContextRecord.authentication_handle}|rotated`;
  assert.equal(
    validateReceiverAuthenticationRecord(receiverContextRecord),
    true
  );
  const receiverContextAuthentication =
    frozenAuthenticationFromReceiver(receiverContextRecord);
  receiverStabilityScenario.stores.installContext({
    case_id: "receiver_handle_stability_preflight",
    phase: "replay",
    envelope: receiverContextEnvelope,
    authentication: receiverContextAuthentication,
    receiver_authentication: receiverContextRecord
  });
  const receiverContextRaw =
    receiverStabilityScenario.harness.service.handleEnvelope(
      receiverContextEnvelope,
      receiverContextAuthentication
    );
  const receiverContextTrace =
    receiverStabilityScenario.stores.traces.at(-1);
  assert.equal(
    receiverContextRaw.code,
    "receiver_authentication_invalid"
  );
  assert.equal(receiverContextTrace.callback_commit, null);
  assert.equal(receiverContextTrace.callback_value, null);
  assert.deepEqual(receiverContextTrace.callback_access_trace, []);
  assert.equal(receiverContextTrace.wrapper_failure.stage, "preflight");
  assert.deepEqual(
    receiverContextTrace.kernel_after,
    receiverStabilityBaselineKernel
  );
  assert.deepEqual(
    receiverContextTrace.sidecar_after,
    receiverStabilityBaselineSidecar
  );
  assert.equal(
    Object.hasOwn(receiverStabilityScenario.stores, "receiverAuthentication"),
    false
  );
  let receiverCacheFallbackRejected = false;
  try {
    receiverStabilityScenario.stores.installContext({
      case_id: "receiver_cache_fallback_rejected",
      phase: "replay",
      envelope: receiverContextEnvelope,
      authentication: receiverStabilityScenario.authentication
    });
  } catch {
    receiverCacheFallbackRejected = true;
  }
  assert.equal(receiverCacheFallbackRejected, true);
  const receiverRecoveryEnvelope =
    receiverStabilityScenario.helpers.freshTransport(
      receiverStabilityScenario.envelope,
      61
    );
  const receiverRecoveryRecord = receiverAuthenticationRecord(
    receiverStabilityScenario.authentication,
    receiverRecoveryEnvelope
  );
  receiverStabilityScenario.stores.installContext({
    case_id: "receiver_recovery_success",
    phase: "replay",
    envelope: receiverRecoveryEnvelope,
    authentication: receiverStabilityScenario.authentication,
    receiver_authentication: receiverRecoveryRecord
  });
  const receiverRecoveryRaw =
    receiverStabilityScenario.harness.service.handleEnvelope(
      receiverRecoveryEnvelope,
      receiverStabilityScenario.authentication
    );
  const receiverRecoveryTrace =
    receiverStabilityScenario.stores.traces.at(-1);
  assert.equal(receiverRecoveryRaw.ok, true);
  assert.equal(receiverRecoveryRaw.replayed, true);
  assert.equal(receiverRecoveryTrace.callback_commit, true);
  assert.equal(receiverRecoveryTrace.final_commit, true);
  assert.equal(
    verifyCompositeHistory(receiverStabilityScenario.stores.sidecar),
    true
  );

  const contextLifecycleScenario =
    await buildIntentScenario("context_lifecycle");
  const contextLifecycleBaselineKernel =
    kernelSnapshot(contextLifecycleScenario.stores);
  const contextLifecycleBaselineSidecar =
    sidecarSnapshot(contextLifecycleScenario.stores.sidecar);
  const contextTraceCount = contextLifecycleScenario.stores.traces.length;
  const missingContextEnvelope =
    contextLifecycleScenario.helpers.freshTransport(
      contextLifecycleScenario.envelope,
      67
    );
  const missingContextRaw =
    contextLifecycleScenario.harness.service.handleEnvelope(
      missingContextEnvelope,
      contextLifecycleScenario.authentication
    );
  assert.equal(
    missingContextRaw.code,
    "receiver_authentication_required"
  );
  const missingContextTraceCountUnchanged =
    contextLifecycleScenario.stores.traces.length === contextTraceCount;
  assert.equal(missingContextTraceCountUnchanged, true);
  const missingContextKernelUnchanged =
    canonicalText(kernelSnapshot(contextLifecycleScenario.stores)) ===
      canonicalText(contextLifecycleBaselineKernel);
  const missingContextSidecarUnchanged =
    canonicalText(sidecarSnapshot(
      contextLifecycleScenario.stores.sidecar
    )) === canonicalText(contextLifecycleBaselineSidecar);
  assert.equal(missingContextKernelUnchanged, true);
  assert.equal(missingContextSidecarUnchanged, true);
  const installedEnvelope =
    contextLifecycleScenario.helpers.freshTransport(
      contextLifecycleScenario.envelope,
      68
    );
  const nestedEnvelope =
    contextLifecycleScenario.helpers.freshTransport(
      contextLifecycleScenario.envelope,
      69
    );
  const installedContext = {
    case_id: "context_nested_primary",
    phase: "replay",
    envelope: installedEnvelope,
    authentication: contextLifecycleScenario.authentication,
    receiver_authentication: receiverAuthenticationRecord(
      contextLifecycleScenario.authentication,
      installedEnvelope
    )
  };
  const nestedContext = {
    case_id: "context_nested_secondary",
    phase: "replay",
    envelope: nestedEnvelope,
    authentication: contextLifecycleScenario.authentication,
    receiver_authentication: receiverAuthenticationRecord(
      contextLifecycleScenario.authentication,
      nestedEnvelope
    )
  };
  const installedToken =
    contextLifecycleScenario.stores.issueContextToken();
  contextLifecycleScenario.stores.setContext(
    installedContext,
    installedToken
  );
  const nestedToken =
    contextLifecycleScenario.stores.issueContextToken();
  let nestedContextRejected = false;
  try {
    contextLifecycleScenario.stores.setContext(
      nestedContext,
      nestedToken
    );
  } catch (error) {
    nestedContextRejected = error.message === "context_nested";
  }
  assert.equal(nestedContextRejected, true);
  assert.equal(
    contextLifecycleScenario.stores.context.envelope.envelope_hash,
    installedEnvelope.envelope_hash
  );
  const installedRaw =
    contextLifecycleScenario.harness.service.handleEnvelope(
      installedEnvelope,
      contextLifecycleScenario.authentication
    );
  const installedTrace =
    contextLifecycleScenario.stores.traces.at(-1);
  assert.equal(installedRaw.ok, true);
  assert.equal(installedRaw.replayed, true);
  assert.equal(installedTrace.final_commit, true);
  let reusedContextRejected = false;
  try {
    contextLifecycleScenario.stores.setContext(
      installedContext,
      installedToken
    );
  } catch (error) {
    reusedContextRejected = error.message === "context_token_invalid";
  }
  assert.equal(reusedContextRejected, true);
  assert.equal(contextLifecycleScenario.stores.context, null);

  const preflightFaults = {};
  for (const kind of [
    "rich_row_corrupt",
    "live_frozen_fingerprint_corrupt",
    "live_frozen_result_ref_corrupt",
    "live_frozen_missing",
    "live_frozen_extra",
    "rich_row_duplicate",
    "unrelated_rich_corruption"
  ]) {
    const scenario = await buildIntentScenario(`preflight_${kind}`);
    if (
      kind === "rich_row_corrupt" ||
      kind === "unrelated_rich_corruption"
    ) {
      scenario.stores.sidecar.rich_idempotency_rows[0].operation_name =
        "capabilities.get";
    } else if (kind === "live_frozen_fingerprint_corrupt") {
      const [databaseKey, row] =
        [...scenario.stores.idempotencyRecords.entries()][0];
      scenario.stores.idempotencyRecords.set(databaseKey, {
        ...structuredClone(row),
        fingerprint: `sha-256:${"b".repeat(64)}`
      });
    } else if (kind === "live_frozen_result_ref_corrupt") {
      const [databaseKey, row] =
        [...scenario.stores.idempotencyRecords.entries()][0];
      const resultRef = structuredClone(row.result_ref);
      resultRef.object_hash = `sha-256:${"c".repeat(64)}`;
      scenario.stores.idempotencyRecords.set(databaseKey, {
        ...structuredClone(row),
        result_ref: resultRef
      });
    } else if (kind === "live_frozen_missing") {
      scenario.stores.idempotencyRecords.clear();
    } else if (kind === "live_frozen_extra") {
      scenario.stores.idempotencyRecords.set(
        canonicalText([
          "did:example:unrelated|intent.put",
          "unrelated-idempotency-key"
        ]),
        {
          fingerprint: `sha-256:${"d".repeat(64)}`,
          result_ref: structuredClone(
            scenario.stores.sidecar.rich_idempotency_rows[0].result_ref
          )
        }
      );
    } else {
      scenario.stores.sidecar.rich_idempotency_rows.push(
        structuredClone(
          scenario.stores.sidecar.rich_idempotency_rows[0]
        )
      );
    }
    const baselineKernel = kernelSnapshot(scenario.stores);
    const baselineSidecar = sidecarSnapshot(scenario.stores.sidecar);
    const envelope = kind === "unrelated_rich_corruption"
      ? scenario.helpers.newIdempotentAttempt(
          scenario.envelope,
          60,
          "reference-intent-idempotency-unrelated-new-key"
        )
      : scenario.helpers.freshTransport(
          scenario.envelope,
          60
        );
    scenario.stores.installContext({
      case_id: `preflight_${kind}`,
      phase: kind === "unrelated_rich_corruption"
        ? "origin"
        : "replay",
      envelope,
      authentication: scenario.authentication,
      receiver_authentication: scenario.receiverAuthentication
    });
    const raw = scenario.harness.service.handleEnvelope(
      envelope,
      scenario.authentication
    );
    const trace = scenario.stores.traces.at(-1);
    assert.equal(raw.code, "idempotency_integrity_invalid", kind);
    assert.equal(trace.callback_commit, null, kind);
    assert.equal(trace.callback_value, null, kind);
    assert.equal(trace.frozen_callback_value, null, kind);
    assert.deepEqual(trace.callback_access_trace, [], kind);
    assert.equal(trace.wrapper_failure.stage, "preflight", kind);
    assert.deepEqual(trace.kernel_after, baselineKernel, kind);
    assert.deepEqual(trace.sidecar_after, baselineSidecar, kind);
    preflightFaults[kind] = {
      raw: structuredClone(raw),
      trace
    };
  }

  const interleavedScenario =
    await buildIntentScenario("interleaved_history");
  const isolatedOriginRoot =
    interleavedScenario.stores.sidecar.scope_commits[0]
      .scope_state_commitment_after;
  const foreignTraces = [];
  for (let index = 0; index < 6; index += 1) {
    const number = 70 + index;
    const principalId = `did:example:foreign-${index + 1}`;
    const envelope = interleavedScenario.helpers.makeEnvelope({
      operationName: "capabilities.get",
      body: {},
      messageNumber: number,
      nonce: `reference-foreign-nonce-${String(number).padStart(8, "0")}`,
      principalId
    });
    const receiverAuthentication = receiverAuthenticationRecord({
      ...interleavedScenario.authentication,
      principalId,
      authorityNamespace: `${principalId}|cairn-account`
    }, envelope);
    const authentication =
      frozenAuthenticationFromReceiver(receiverAuthentication);
    interleavedScenario.stores.installContext({
      case_id: `foreign_capabilities_${index + 1}`,
      phase: "capabilities",
      envelope,
      authentication,
      receiver_authentication: receiverAuthentication
    });
    const raw =
      interleavedScenario.harness.service.handleEnvelope(
        envelope,
        authentication
      );
    const trace = interleavedScenario.stores.traces.at(-1);
    assert.equal(raw.ok, true, JSON.stringify(raw));
    assert.equal(trace.callback_commit, true);
    assert.equal(trace.final_commit, true);
    foreignTraces.push(trace);
  }
  assert.equal(interleavedScenario.stores.sidecar.global_sequence, 7);
  assert.equal(
    verifyCompositeHistory(interleavedScenario.stores.sidecar),
    true
  );
  assert.equal(
    interleavedScenario.stores.sidecar.scope_commits.find(
      ({ owner_id }) =>
        owner_id === interleavedScenario.authentication.principalId
    ).scope_state_commitment_after,
    isolatedOriginRoot
  );
  {
    const capabilityObservation = JSON.parse(
      interleavedScenario.stores.sidecar.observation_repository.find(
        ({ global_commit_sequence: sequence }) => sequence === 2
      ).canonical_observation_bytes
    );
    capabilityObservation.request.principal_id = null;
    capabilityObservation.access.owner_kind = "principal";
    const derivedOwner = deriveObservationOwner(capabilityObservation);
    const rejected = derivedOwner === null ||
      capabilityObservation.access.owner_kind !== derivedOwner.owner_kind ||
      capabilityObservation.access.owner_id !== derivedOwner.owner_id;
    assert.equal(rejected, true, "owner_derivation_principal_for_actor");
    signedHistoryMutationControls.owner_derivation_principal_for_actor =
      rejected;
  }
  rejectHistoryMutation(
    "owner_derivation_history",
    interleavedScenario.stores.sidecar,
    (sidecar) => {
      const globalSequence = 2;
      const repositoryRow = sidecar.observation_repository.find(
        ({ global_commit_sequence: sequence }) =>
          sequence === globalSequence
      );
      assert.ok(repositoryRow);
      const originalObservation = JSON.parse(
        repositoryRow.canonical_observation_bytes
      );
      const actorId = originalObservation.request.actor_id;
      const currentVersions = new Map();
      for (const version of sidecar.operational_versions
        .filter(
          ({ valid_from_global_sequence: sequence }) =>
            sequence <= globalSequence
        )
        .sort(
          (left, right) =>
            left.valid_from_global_sequence -
              right.valid_from_global_sequence ||
            compareUtf8(
              canonicalText([left.table, left.structural_key]),
              canonicalText([right.table, right.structural_key])
            )
        )) {
        currentVersions.set(
          canonicalText([version.table, version.structural_key]),
          JSON.parse(version.canonical_row_bytes)
        );
      }
      const dependencyKeys = new Set(
        sidecar.dependency_rows
          .filter(
            ({ global_sequence: sequence }) => sequence === globalSequence
          )
          .map(({ entry_key: entryKey }) => entryKey)
          .filter((entryKey) => currentVersions.has(entryKey))
      );
      const ownerProjections = [...currentVersions.entries()]
        .filter(([entryKey]) => dependencyKeys.has(entryKey))
        .map(([, projection]) => projection)
        .filter((projection) => {
          const projectionOwner =
            projection.columns.owner_id ?? projection.columns.principal_id;
          return projectionOwner === undefined ||
            projectionOwner === actorId;
        });
      const actorRoot = ownerScopeCommitment(
        "actor",
        actorId,
        originalObservation.transaction.scope_sequence_after,
        ownerProjections
      );
      replaceSignedObservation(sidecar, globalSequence, (observation) => {
        observation.access.owner_kind = "actor";
        observation.access.owner_id = actorId;
        observation.transaction.scope_state_commitment_after = actorRoot;
      });
      const scopeCommit = sidecar.scope_commits.find(
        ({ global_sequence: sequence }) => sequence === globalSequence
      );
      assert.ok(scopeCommit);
      scopeCommit.owner_kind = "actor";
      scopeCommit.owner_id = actorId;
      scopeCommit.scope_state_commitment_after = actorRoot;
      delete sidecar.owner_sequences[ownerSequenceKey(
        "principal",
        originalObservation.request.principal_id
      )];
      sidecar.owner_sequences[ownerSequenceKey("actor", actorId)] =
        originalObservation.transaction.scope_sequence_after;
    }
  );
  const foreignHistoryMutationControls = {};
  for (const [caseId, mutate] of [
    ["foreign_owner_counter", (sidecar) => {
      const ownerKey = ownerSequenceKey(
        "principal",
        "did:example:foreign-3"
      );
      sidecar.owner_sequences[ownerKey] = 2;
    }],
    ["foreign_transaction_kind", (sidecar) => {
      sidecar.service_commits[4].transaction_kind = "foreign_label";
    }],
    ["foreign_observation_bytes", (sidecar) => {
      sidecar.observation_repository[3].canonical_observation_bytes += " ";
    }],
    ["foreign_repository_hash", (sidecar) => {
      sidecar.observation_repository[4].observation_hash =
        `sha-256:${"c".repeat(64)}`;
    }],
    ["foreign_service_ref", (sidecar) => {
      sidecar.service_commits[5].observation_ref_key =
        canonicalText(["substituted-foreign-ref"]);
    }],
    ["foreign_scope_mapping", (sidecar) => {
      sidecar.scope_commits[5].global_sequence = 2;
    }],
    ["foreign_dependency_commitment", (sidecar) => {
      sidecar.dependency_commits[7].dependency_set_commitment = ZERO_HASH;
    }],
    ["foreign_access_trace", (sidecar) => {
      sidecar.access_traces[1].events[0].key =
        canonicalText(["substituted-foreign-runtime"]);
    }]
  ]) {
    const changed =
      structuredClone(interleavedScenario.stores.sidecar);
    mutate(changed);
    const rejected = verifyCompositeHistory(changed) === false;
    assert.equal(rejected, true, caseId);
    foreignHistoryMutationControls[caseId] = rejected;
  }

  return {
    origin: originReport,
    fingerprint_conflict: {
      raw: structuredClone(conflictRaw),
      trace: conflictTrace
    },
    successful_replay: {
      envelope: structuredClone(successfulReplayEnvelope),
      raw: structuredClone(successfulReplayRaw),
      trace: successfulReplayTrace,
      sidecar: structuredClone(replayScenario.stores.sidecar)
    },
    accepted_failure: {
      envelope: structuredClone(acceptedFailureEnvelope),
      raw: structuredClone(acceptedFailureRaw),
      trace: acceptedFailureTrace,
      sidecar: structuredClone(
        acceptedFailureScenario.stores.sidecar
      )
    },
    multi_idempotency: {
      second_origin: {
        envelope: structuredClone(secondKeyEnvelope),
        raw: structuredClone(secondKeyRaw),
        trace: secondKeyTrace
      },
      second_replay: {
        envelope: structuredClone(replaySecondKeyEnvelope),
        raw: structuredClone(replaySecondKeyRaw),
        trace: replaySecondKeyTrace
      },
      exact_key_relink_rejected: exactKeyRelinkRejected,
      version_order_independent: versionOrderIndependent,
      sidecar: structuredClone(multiRowScenario.stores.sidecar)
    },
    durable_artifact_controls: {
      origin_bound:
        verifyCompositeArtifactBinding(
          origin.stores.sidecar,
          origin.originTrace
        ),
      replay_bound:
        verifyCompositeArtifactBinding(
          replayScenario.stores.sidecar,
          successfulReplayTrace
        ),
      callback_value_artifact_mutation_rejected:
        callbackValueArtifactMutationRejected,
      replay_history_mutations: replayHistoryMutationControls,
      access_trace_mutations: accessTraceMutationControls,
      signed_history_mutations: signedHistoryMutationControls,
      foreign_history_mutations: foreignHistoryMutationControls,
      service_profile_mutations: serviceProfileMutationControls,
      historical_profile_positive: historicalProfilePositive
    },
    replay_faults: replayFaults,
    wrapper_faults: wrapperFaults,
    unexpected_wrapper_faults: unexpectedWrapperFaults,
    grant_consumption_failure: {
      raw: structuredClone(grantRaw),
      trace: grantTrace
    },
    receiver_stability_failure: {
      raw: structuredClone(receiverStabilityRaw),
      trace: receiverStabilityTrace
    },
    receiver_handle_stability_failure: {
      raw: structuredClone(receiverContextRaw),
      trace: receiverContextTrace
    },
    receiver_recovery: {
      cache_fallback_rejected: receiverCacheFallbackRejected,
      raw: structuredClone(receiverRecoveryRaw),
      trace: receiverRecoveryTrace
    },
    receiver_identity_mismatches: receiverIdentityMismatches,
    context_lifecycle: {
      missing_context: {
        raw: structuredClone(missingContextRaw),
        kernel_unchanged: missingContextKernelUnchanged,
        sidecar_unchanged: missingContextSidecarUnchanged,
        trace_count_unchanged: missingContextTraceCountUnchanged
      },
      nested_context_rejected: nestedContextRejected,
      reused_context_rejected: reusedContextRejected,
      installed_raw: structuredClone(installedRaw),
      installed_trace: installedTrace
    },
    preflight_faults: preflightFaults,
    interleaved_history: {
      isolated_origin_root: isolatedOriginRoot,
      foreign_traces: structuredClone(foreignTraces),
      sidecar: structuredClone(interleavedScenario.stores.sidecar)
    }
  };
}

if (
  process.argv[1] &&
  process.argv[1] !== "-" &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  const report = await runCompositeProbe();
  process.stdout.write(
    `composite_probe_hash=${canonicalHash(report)}\n`
  );
  process.stdout.write(
    `composite_probe_cases=${
      Object.keys(report.replay_faults).length +
      Object.keys(report.wrapper_faults).length +
      Object.keys(report.unexpected_wrapper_faults).length +
      Object.keys(report.preflight_faults).length +
      report.interleaved_history.foreign_traces.length +
      12
    }\n`
  );
  process.stdout.write(
    `composite_probe_operation=${report.origin.envelope.message_type}\n`
  );
  process.stdout.write(
    `composite_probe_origin=${canonicalText({
      status: report.origin.callback.callback_value.status,
      commit: report.origin.callback.callback_commit,
      final_commit: report.origin.callback.final_commit
    })}\n`
  );
}
