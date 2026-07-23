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
  verifyEd25519
} from "../../protocol/lib/core.mjs";
import { createAjv } from "../../protocol/lib/schemas.mjs";
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
const validateOperationalProjection = AUTHORITATIVE_AJV.compile({
  "$ref": `${AUTHORITATIVE_SCHEMA.$id}#/$defs/operationalRowProjection`
});
const FROZEN_FOUNDATION = await loadReferenceFoundation();

export const COMPOSITE_FIXTURE = Object.freeze({
  now: "2026-07-23T16:00:00Z",
  service_id: "cairn:reference-service",
  store_id: "urn:uuid:00000000-0000-4000-8000-000000000001",
  service_key_id: "https://cairn.invalid/keys/service-1",
  service_profile_id: "urn:uuid:00000000-0000-4000-8000-000000000002",
  service_profile_hash:
    "sha-256:043f9fe408bbbd4ac74dd50a909c90cb87e08cc7e71c617bab1d117460bfef0b",
  authoritative_schema_hash: AUTHORITATIVE_SCHEMA_HASH
});

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

export function verifyCompositeObservation(observation) {
  return validateServiceObservation(observation) &&
    objectHash(
      observation,
      AUTHORITATIVE_SCHEMA.$defs.serviceObservation
    ) === observation.observation_hash &&
    verifyEd25519({
      schemaId: observation.schema,
      objectHash: observation.observation_hash,
      publicKey: SERVICE_OBSERVATION_PUBLIC_KEY,
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

function safeCanonicalHash(value) {
  try {
    return canonicalHash(value);
  } catch {
    if (value && typeof value === "object") {
      return canonicalHash({
        key_id: value.key_id ?? null,
        key_type: value.key_type ?? null,
        controller: value.controller ?? null,
        status: value.status ?? null,
        public_key: value.public_key ?? null
      });
    }
    return canonicalHash([typeof value, String(value)]);
  }
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
      after_hash: after === undefined ? null : safeCanonicalHash(after)
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

function signServiceObservation(draft) {
  const bound = bindObjectHash(
    draft,
    AUTHORITATIVE_SCHEMA.$defs.serviceObservation
  );
  bound.service_signature.value = signBytes(
    null,
    signatureInput(bound.schema, bound.observation_hash),
    SERVICE_OBSERVATION_PRIVATE_KEY
  ).toString("base64url");
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
      sidecar.service_commits.length !== sidecar.global_sequence + 1 ||
      sidecar.dependency_commits.length !== sidecar.global_sequence + 1 ||
      sidecar.scope_commits.length !== sidecar.global_sequence ||
      sidecar.observation_repository.length !== sidecar.global_sequence ||
      sidecar.observations.length !== sidecar.global_sequence ||
      sidecar.validation_bindings.length !== sidecar.global_sequence ||
      sidecar.access_traces.length !== sidecar.global_sequence ||
      Object.keys(sidecar.observation_by_envelope).length !==
        sidecar.global_sequence
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
    for (
      let globalSequence = 0;
      globalSequence <= sidecar.global_sequence;
      globalSequence += 1
    ) {
      const serviceCommit = sidecar.service_commits[globalSequence];
      const dependencyCommit = sidecar.dependency_commits[globalSequence];
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
          serviceCommit.observation_ref_key !== null ||
          dependencyCommit.dependency_set_commitment !== ZERO_HASH
        ) {
          return false;
        }
        continue;
      }
      const repositoryRow = sidecar.observation_repository.find(
        (row) => row.global_commit_sequence === globalSequence
      );
      const scopeCommit = sidecar.scope_commits.find(
        (row) => row.global_sequence === globalSequence
      );
      if (
        !repositoryRow ||
        !scopeCommit ||
        repositoryRow.observation_ref_key !==
          serviceCommit.observation_ref_key ||
        scopeCommit.observation_ref_key !== serviceCommit.observation_ref_key
      ) {
        return false;
      }
      const observation =
        JSON.parse(repositoryRow.canonical_observation_bytes);
      const durableObservation = sidecar.observations.find(
        (candidate) => candidate.observation_id === repositoryRow.observation_id
      );
      const validationBinding = sidecar.validation_bindings.find(
        (candidate) => candidate.global_sequence === globalSequence
      );
      const accessTrace = sidecar.access_traces.find(
        (candidate) => candidate.global_sequence === globalSequence
      );
      const expectedValidatorBinding = registeredResponseValidatorBinding(
        FROZEN_FOUNDATION,
        observation.request.operation_contract
      );
      if (
        !durableObservation ||
        !validationBinding ||
        !accessTrace ||
        canonicalText(durableObservation) !==
          repositoryRow.canonical_observation_bytes ||
        validationBinding.authoritative_schema_hash !==
          AUTHORITATIVE_SCHEMA_HASH ||
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
        accessTrace.envelope_hash !== observation.request.envelope_hash ||
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
      assertRequiredAccessTrace(
        serviceCommit.transaction_kind === "replay" ? "replay" : "origin",
        accessTrace.events
      );
      const dependencyEntries = sidecar.dependency_rows
        .filter((row) => row.global_sequence === globalSequence)
        .map(({ global_sequence: _globalSequence, ...entry }) => entry);
      const manifest = committedDependencyManifest(dependencyEntries);
      if (
        manifest.dependency_set_commitment !==
          dependencyCommit.dependency_set_commitment
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
      for (const version of sidecar.operational_versions.filter(
        (candidate) =>
          candidate.valid_from_global_sequence <= globalSequence
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
      if (observation.result.replayed) {
        const originRef =
          observation.result.idempotency.original_observation_ref;
        const originRepositoryRow = sidecar.observation_repository.find(
          (row) =>
            row.observation_id === originRef.artifact_id &&
            row.observation_hash === originRef.artifact_hash
        );
        const richRow = sidecar.rich_idempotency_rows.find(
          (row) =>
            row.result_ref.object_hash ===
              observation.result.returned_refs[0].object_hash
        );
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
    const latestByKey = new Map();
    for (const version of sidecar.operational_versions) {
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
    return true;
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
    return trace.final_commit === true &&
      observation !== null &&
      verifyCompositeHistory(sidecar) &&
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
    current_projections: [],
    operational_versions: [],
    dependency_rows: [],
    dependency_commits: [{
      global_sequence: 0,
      dependency_set_commitment: ZERO_HASH
    }],
    operational_snapshots: [],
    service_commits: [{
      global_sequence: 0,
      previous_global_sequence: null,
      transaction_kind: "genesis",
      observation_ref_key: null
    }],
    scope_commits: [],
    observation_repository: [],
    observation_by_envelope: {},
    observations: [],
    validation_bindings: [],
    access_traces: [],
    counters: {
      callback_calls: 0,
      observation_calls: 0,
      persistence_calls: 0,
      commit_calls: 0
    }
  };
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
  ["write_insert", 2],
  ["write_update", 3],
  ["read_absent_write_insert", 4],
  ["read_present_write_update", 5]
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
      attemptedKey: objectRefKey(ref),
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
      attemptedKey: runtimeKeyId,
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
      attemptedKey: keyId,
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
        attemptedKey: refKey,
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
        attemptedKey: nonceRow.columns.nonce,
        accessKind: event.before_present ? "read_present" : "read_absent",
        projection: event.before_present ? nonceRow : null
      });
    }
    nonceEvents.forEach(consume);
  }

  assertMethods("idempotencyRecords", ["get", "set"]);
  const idempotencyEvents = byStore.get("idempotencyRecords") ?? [];
  if (idempotencyEvents.length > 0) {
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

  const resultRefKey = objectRefKey(resultRef);
  const objectEvents = byStore.get("objectsByRef") ?? [];
  assertMethods("objectsByRef", ["get", "has", "set"]);
  if (objectEvents.length > 0) {
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
        attemptedKey: resultRefKey,
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
        addAliasEntry({
          table: "objects",
          indexName,
          attemptedKey: traceKey(event),
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
        attemptedKey: traceKey(event),
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

function assertRequiredAccessTrace(phase, events) {
  const expectedByPhase = {
    origin: [
      "accessByRef:set",
      "dataGrantsByRef:get",
      "grantStatesByRef:get",
      "idempotencyRecords:get",
      "idempotencyRecords:set",
      "keyResolver:get",
      "objectsByRef:has",
      "objectsByRef:set",
      "refsByIdentity:get",
      "refsByIdentity:set",
      "runtimeBindingsByKey:get",
      "urisByRef:get",
      "urisByRef:set",
      "usedNonces:add",
      "usedNonces:has"
    ],
    replay: [
      "accessByRef:get",
      "idempotencyRecords:get",
      "keyResolver:get",
      "objectsByRef:get",
      "runtimeBindingsByKey:get",
      "urisByRef:get",
      "usedNonces:add",
      "usedNonces:has"
    ]
  };
  const expected = expectedByPhase[phase];
  assert.ok(expected, `unknown composite access-trace phase ${phase}`);
  const actual = [...new Set(
    events.map(({ store, method }) => `${store}:${method}`)
  )].sort(compareUtf8);
  assert.deepEqual(
    actual,
    [...expected].sort(compareUtf8),
    `${phase} callback access surface changed`
  );
  assert.deepEqual(
    events.map(({ order }) => order),
    events.map((_, index) => index + 1),
    `${phase} callback access order is not contiguous`
  );
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
  const ownerId =
    context.authentication.principalId ?? context.authentication.actorId;
  const ownerKind =
    context.authentication.principalId === null ? "actor" : "principal";
  const scopeBefore = staged.owner_sequences[ownerId] ?? 0;
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
  assertRequiredAccessTrace(context.phase, accessTrace);
  const structuralKeyCommitment =
    compositeIdempotencyStructuralKeyCommitment(idempotencyLookupKey(context));

  assert.equal(outcome.value.ok, true);
  assert.ok(outcome.value.body?.ref);
  const replayed = outcome.value.replayed === true;
  let richRow = staged.rich_idempotency_rows.find(
    (row) =>
      row.authority_namespace ===
        context.authentication.authorityNamespace &&
      row.idempotency_key === context.envelope.idempotency_key
  );
  if (context.phase === "origin") {
    const frozenRow = [...kernelDraft.idempotencyRecords.values()].find(
      ({ fingerprint }) =>
        fingerprint === context.envelope.operation_fingerprint
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
  } else {
    assert.ok(richRow, "replay omitted its durable rich idempotency row");
    assert.equal(
      canonicalText(outcome.value.body.ref),
      canonicalText(richRow.result_ref)
    );
    assert.ok(richRow.origin_observation_ref);
  }

  const resultRef = structuredClone(richRow.result_ref);
  const currentByKey = new Map(
    staged.current_projections.map((projection) => [
      projectionKey(projection),
      projection
    ])
  );
  const changedProjections = [];
  let objectProjection;
  let idempotencyProjection;
  if (context.phase === "origin") {
    objectProjection =
      objectProjectionFromKernel(kernelDraft, resultRef, scopeAfter);
    idempotencyProjection = idempotencyProjectionFromRichRow(richRow);
    changedProjections.push(objectProjection, idempotencyProjection);
  } else {
    objectProjection = currentByKey.get(canonicalText([
      "objects",
      objectStructuralKey(resultRef)
    ]));
    idempotencyProjection = staged.current_projections.find(
      ({ table }) => table === "idempotency_records"
    );
    assert.ok(objectProjection);
    assert.ok(idempotencyProjection);
  }
  const nonceRow =
    nonceProjection(context, ownerKind, ownerId, scopeAfter);
  changedProjections.push(nonceRow);

  let grantProjection = null;
  if (context.phase === "origin") {
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
    changedProjections.push(grantProjection);
  }
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
    resultRef,
    resultObjectProjection: objectProjection,
    idempotencyProjection,
    nonceRow,
    grantProjection
  });
  for (const projection of seedProjections) {
    if (!staged.current_projections.some(
      (candidate) => projectionKey(candidate) === projectionKey(projection)
    )) {
      upsertCurrentProjection(staged, projection);
      staged.operational_versions.push(
        operationalVersionFor(projection, 0)
      );
    }
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
  const hostContextHash = canonicalHash({
    principal_id: context.authentication.principalId,
    actor_id: context.authentication.actorId,
    runtime_key_id: context.envelope.sender.runtime_key_id,
    authority_namespace_commitment: canonicalHash([
      "cairn-authority-namespace-v0.1",
      context.authentication.authorityNamespace
    ])
  });
  const operationalSnapshot = {
    global_sequence: globalAfter,
    kernel_state_hash: canonicalHash(kernelSnapshot(kernelDraft)),
    scope_state_commitment: scopeStateCommitment,
    dependency_set_commitment:
      dependencyManifest.dependency_set_commitment
  };
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
      dependency_set_commitment:
        dependencyManifest.dependency_set_commitment,
      scope_state_commitment_after: scopeStateCommitment,
      committed: true
    },
    result: {
      outcome: "success",
      status: outcome.value.status,
      code: null,
      failures: [],
      replayed,
      response_schema: contract.response_schema,
      kernel_result_hash: canonicalHash(outcome.value),
      returned_refs: [structuredClone(resultRef)],
      relevant_heads: [],
      nonce_disposition:
        replayed ? "replay_fresh_nonce" : "newly_reserved",
      grant_effects: [],
      idempotency: {
        structural_key_commitment: structuralKeyCommitment,
        disposition: replayed ? "replayed" : "created",
        original_result_hash: replayed ? richRow.kernel_result_hash : null,
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

  staged.global_sequence = globalAfter;
  staged.owner_sequences[ownerId] = scopeAfter;
  staged.operational_snapshots.push(operationalSnapshot);
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
    global_sequence: globalAfter,
    previous_global_sequence: globalBefore,
    transaction_kind:
      context.phase === "origin" ? "service_operation" : "replay",
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
  staged.access_traces.push({
    global_sequence: globalAfter,
    envelope_hash: context.envelope.envelope_hash,
    events: structuredClone(accessTrace)
  });
  staged.counters.observation_calls += 1;
  staged.counters.persistence_calls += 1;
  staged.counters.commit_calls += 1;

  if (context.phase === "origin") {
    richRow.origin_observation_ref = {
      artifact_schema: observation.schema,
      artifact_id: observation.observation_id,
      artifact_hash: observation.observation_hash
    };
  }

  return staged;
}

class CompositeReferenceStores extends MemoryReferenceStores {
  constructor(foundation) {
    super();
    this.foundation = foundation;
    this.sidecar = emptySidecar();
    this.context = null;
    this.traces = [];
    this.compositeActive = false;
    this.accessRecorder = new AccessRecorder();
  }

  setContext(context) {
    this.accessRecorder.events.length = 0;
    this.accessRecorder.active = true;
    this.context = structuredClone(context);
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
      return super.transaction(work);
    }
    if (this.compositeActive) {
      throw new Error("composite transaction is already active");
    }
    this.compositeActive = true;
    const context = structuredClone(this.context);
    const kernelBefore = kernelSnapshot(this);
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
      if (
        callbackOutcome?.commit !== false &&
        responseValidation?.accepted !== false &&
        !context.integrity_fault
      ) {
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
      }

      const wrapperFailure = responseValidation?.accepted === false
        ? {
            status: 503,
            code: "response_schema_failed",
            failures: ["response_schema_failed"],
            stage: "observation"
          }
        : context.wrapper_failure ?? (context.integrity_fault
          ? {
              status: 503,
              code: "authoritative_integrity_invalid",
              failures: ["authoritative_integrity_invalid"],
              stage: "observation"
            }
          : null);
      const finalCommit =
        callbackOutcome?.commit !== false && wrapperFailure === null;
      if (finalCommit) {
        for (const name of MAP_NAMES) {
          replaceMap(this[name], kernelDraft[name]);
        }
        this.usedNonces.clear();
        for (const nonce of kernelDraft.usedNonces) {
          this.usedNonces.add(nonce);
        }
        this.sidecar = structuredClone(stagedSidecar);
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
      return callbackOutcome?.value;
    } finally {
      this.accessRecorder.active = false;
      this.compositeActive = false;
      this.context = null;
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
  const envelope = helpers.makeEnvelope({
    operationName: "intent.put",
    body: intent,
    subjectRefs: [intentRef],
    authorizationRefs: [grantRef],
    messageNumber: 54,
    nonce: "reference-nonce-00000054",
    idempotencyKey: "reference-intent-idempotency-0001"
  });
  const authentication = {
    ...harness.authentication,
    authorityNamespace: `${harness.authentication.principalId}|intent.put`
  };
  stores.setContext({
    case_id: `${caseId}:origin`,
    phase: "origin",
    envelope,
    authentication
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
    callback: structuredClone(origin.originTrace),
    object: structuredClone(origin.originObject),
    sidecar: structuredClone(origin.stores.sidecar)
  };

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
  conflictScenario.stores.setContext({
    case_id: "fingerprint_conflict",
    phase: "replay",
    envelope: conflictEnvelope,
    authentication: conflictScenario.authentication
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
  replayScenario.stores.setContext({
    case_id: "successful_replay",
    phase: "replay",
    envelope: successfulReplayEnvelope,
    authentication: replayScenario.authentication
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
  for (const [phase, events] of [
    ["origin", origin.originTrace.callback_access_trace],
    ["replay", successfulReplayTrace.callback_access_trace]
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
        assertRequiredAccessTrace(phase, changed);
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
      assertRequiredAccessTrace(phase, changed);
    } catch {
      rejected = true;
    }
    assert.equal(rejected, true, caseId);
    accessTraceMutationControls[caseId] = rejected;
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
    scenario.stores.setContext({
      case_id: kind,
      phase: "replay",
      envelope: replayEnvelope,
      authentication: scenario.authentication,
      integrity_fault: kind
    });
    const raw = scenario.harness.service.handleEnvelope(
      replayEnvelope,
      scenario.authentication
    );
    const trace = scenario.stores.traces.at(-1);
    assert.equal(raw.code, "idempotency_result_unavailable", kind);
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
      authentication: scenario.authentication
    };
    if (stage === "response_schema") {
      context.response_schema_mutation = "delete_ref";
    } else {
      context.wrapper_failure = {
        status: 503,
        code: `${stage}_failed`,
        failures: [`${stage}_failed`],
        stage
      };
    }
    scenario.stores.setContext(context);
    const raw = scenario.harness.service.handleEnvelope(
      replayEnvelope,
      scenario.authentication
    );
    const trace = scenario.stores.traces.at(-1);
    assert.equal(trace.callback_commit, true, stage);
    assert.equal(trace.final_commit, false, stage);
    assert.deepEqual(trace.kernel_after, baselineKernel, stage);
    assert.deepEqual(trace.sidecar_after, baselineSidecar, stage);
    if (stage === "response_schema") {
      assert.equal(trace.response_validation.accepted, false);
      assert.equal(Object.hasOwn(raw.body, "ref"), false);
      assert.equal(Object.hasOwn(trace.frozen_callback_value.body, "ref"), true);
    }
    wrapperFaults[stage] = { raw: structuredClone(raw), trace };
  }

  const grantScenario = await buildIntentScenario("grant_consumption");
  const grantBaselineKernel = kernelSnapshot(grantScenario.stores);
  const grantBaselineSidecar = sidecarSnapshot(grantScenario.stores.sidecar);
  const grantAttempt = grantScenario.helpers.newIdempotentAttempt(
    grantScenario.envelope,
    57,
    "reference-intent-idempotency-0002"
  );
  grantScenario.stores.setContext({
    case_id: "grant_consumption_failed",
    phase: "new_operation",
    envelope: grantAttempt,
    authentication: grantScenario.authentication,
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
      replay_history_mutations: replayHistoryMutationControls,
      access_trace_mutations: accessTraceMutationControls
    },
    replay_faults: replayFaults,
    wrapper_faults: wrapperFaults,
    grant_consumption_failure: {
      raw: structuredClone(grantRaw),
      trace: grantTrace
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
      3
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
