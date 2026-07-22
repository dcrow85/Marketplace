import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalHash, canonicalText, sha256 } from "./core.mjs";
import { buildPhase1Schemas, EXECUTION_SCHEMA_ROOT } from "./schema-factory.mjs";
import {
  BASE_BUNDLE_HASH,
  BASE_REGISTRY_HASH,
  EXACT_PHASE1_OPERATION_TUPLES,
  PHASE1_OPERATIONS,
  PROFILE_ID,
  RELEASE_PHASE,
  SCHEMA_COMMITMENT_PROFILE,
  SPEC_SHA256,
  operationTuple
} from "./profile.mjs";
import { createExecutionAjv, requireValid } from "./schemas.mjs";
import { IMPLEMENTED_PHASE1_INVARIANTS } from "./validation.mjs";

export const PHASE1_SOURCE_COMMITMENT_FILES = Object.freeze([
  "../lib/core.mjs", "lib/core.mjs",
  "../scripts/check-json-sources.py",
  "README.md", "lib/bundle.mjs", "lib/objects.mjs", "lib/profile.mjs", "lib/schema-factory.mjs",
  "lib/schemas.mjs", "lib/validation.mjs", "manifest.json", "mutations/phase1-mutants.mjs", "package-lock.json", "package.json",
  "scripts/build-bundle.mjs", "scripts/check-bundle.mjs", "scripts/run-mutants.mjs", "tests/phase1.test.mjs"
]);

const EXACT_RUNTIME_DEPENDENCIES = Object.freeze({
  ajv: "8.20.0",
  "ajv-formats": "3.0.1",
  canonicalize: "3.0.0"
});

export const SHARED_CORE_SHA256 = "sha-256:ec796289dfd19ad61bb7d1567bf5d517f91aa23d11ed377b24879fd1da9fc6d3";

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function auditRuntimeDependencies(root) {
  for (const required of ["../lib/core.mjs", "lib/core.mjs", "../scripts/check-json-sources.py", "package-lock.json"]) {
    if (!PHASE1_SOURCE_COMMITMENT_FILES.includes(required)) {
      throw new Error(`execution source commitment graph omits ${required}`);
    }
  }
  const packageDocument = await readJson(path.join(root, "package.json"));
  const lock = await readJson(path.join(root, "package-lock.json"));
  const sharedCore = await readFile(path.join(root, "../lib/core.mjs"));
  const localCore = await readFile(path.join(root, "lib/core.mjs"));
  if (sha256(sharedCore) !== SHARED_CORE_SHA256 || !sharedCore.equals(localCore)) {
    throw new Error("execution local core differs from the fixed shared core");
  }
  if (canonicalText(packageDocument.dependencies) !== canonicalText(EXACT_RUNTIME_DEPENDENCIES) ||
      canonicalText(lock.packages?.[""]?.dependencies) !== canonicalText(EXACT_RUNTIME_DEPENDENCIES)) {
    throw new Error("execution runtime dependency declarations differ from the fixed closure");
  }
  for (const [name, version] of Object.entries(EXACT_RUNTIME_DEPENDENCIES)) {
    const locked = lock.packages?.[`node_modules/${name}`];
    let dependencyRoot = path.dirname(fileURLToPath(import.meta.resolve(name)));
    let installed = null;
    for (let depth = 0; depth < 8 && dependencyRoot !== path.dirname(dependencyRoot); depth += 1) {
      try {
        const candidate = await readJson(path.join(dependencyRoot, "package.json"));
        if (candidate.name === name) {
          installed = candidate;
          break;
        }
      } catch {}
      dependencyRoot = path.dirname(dependencyRoot);
    }
    const expectedPackageRoot = await realpath(path.join(root, "node_modules", name));
    const actualPackageRoot = installed ? await realpath(dependencyRoot) : null;
    if (locked?.version !== version || installed?.version !== version || !locked.integrity?.startsWith("sha512-") ||
        actualPackageRoot !== expectedPackageRoot) {
      throw new Error(`execution runtime dependency ${name} is not the exact locked version`);
    }
  }
  for (const [location, locked] of Object.entries(lock.packages ?? {})) {
    if (location === "") continue;
    if (!location.startsWith("node_modules/") || typeof locked.version !== "string" ||
        !locked.integrity?.startsWith("sha512-")) {
      throw new Error(`execution lock entry ${location} is not integrity-closed`);
    }
    const installed = await readJson(path.join(root, location, "package.json"));
    if (installed.version !== locked.version) throw new Error(`execution lock entry ${location} version differs`);
  }
  return { dependencies: structuredClone(EXACT_RUNTIME_DEPENDENCIES), sharedCoreHash: SHARED_CORE_SHA256 };
}

function decodePointerToken(token) {
  return token.replaceAll("~1", "/").replaceAll("~0", "~");
}

export function schemaNodeAtLocation(location, schemas) {
  const [documentUri, fragment = ""] = location.split("#", 2);
  const document = schemas.find(({ document: candidate }) => candidate.$id === documentUri)?.document;
  if (!document) throw new Error(`schema location document does not resolve: ${location}`);
  if (fragment === "") return document;
  if (!fragment.startsWith("/")) throw new Error(`schema location fragment is not a JSON Pointer: ${location}`);
  return fragment.slice(1).split("/").filter(Boolean).map(decodePointerToken).reduce((value, token) => {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, token)) {
      throw new Error(`schema location fragment does not resolve: ${location}`);
    }
    return value[token];
  }, document);
}

export function schemaLocationCommitment(location, schemas) {
  return canonicalHash({ schema_uri: location, schema_node: schemaNodeAtLocation(location, schemas) });
}

export function phase1Registry(schemas) {
  return {
    schema: "cairn.execution_operation_registry.v0.1",
    protocol_version: "0.1",
    profile: PROFILE_ID,
    release_phase: RELEASE_PHASE,
    schema_commitment_profile: SCHEMA_COMMITMENT_PROFILE,
    operations: PHASE1_OPERATIONS.map((operation) => ({
      ...structuredClone(operation),
      request_schema_hash: schemaLocationCommitment(operation.request_schema, schemas),
      request_body_schema_hash: schemaLocationCommitment(operation.request_body_schema, schemas),
      response_schema_hash: schemaLocationCommitment(operation.response_schema, schemas)
    })),
    not_claiming: ["service_implementation", "mutation_surface", "external_effect", "conformance"]
  };
}

async function auditPinnedInputs(root, manifest) {
  const runtimeDependencies = await auditRuntimeDependencies(root);
  const specPath = path.resolve(root, manifest.audited_prose_spec);
  const specBytes = await readFile(specPath);
  const rawSpecHash = sha256(specBytes);
  if (rawSpecHash !== `sha-256:${SPEC_SHA256}` || manifest.audited_prose_spec_sha256 !== SPEC_SHA256) {
    throw new Error("audited prose spec hash differs from the fixed closure artifact");
  }
  const foundationRoot = path.resolve(root, "..");
  const baseBundlePath = path.join(foundationRoot, "dist", "cairn-protocol-bundle-v0.1.json");
  const baseBundleBytes = await readFile(baseBundlePath, "utf8");
  const baseBundle = JSON.parse(baseBundleBytes);
  const baseRegistry = await readJson(path.join(foundationRoot, "operations", "registry.json"));
  const { bundle_hash: claimedBaseBundleHash, ...unsignedBaseBundle } = baseBundle;
  const recomputedBaseBundleHash = canonicalHash(unsignedBaseBundle);
  if (claimedBaseBundleHash !== recomputedBaseBundleHash || recomputedBaseBundleHash !== BASE_BUNDLE_HASH ||
      manifest.base_bundle_hash !== BASE_BUNDLE_HASH) {
    throw new Error("base proposal bundle hash changed");
  }
  if (baseBundleBytes !== `${canonicalText(baseBundle)}\n`) throw new Error("base proposal bundle bytes are not canonical");
  if (canonicalHash(baseRegistry) !== BASE_REGISTRY_HASH || manifest.base_operation_registry_hash !== BASE_REGISTRY_HASH) {
    throw new Error("base proposal registry hash changed");
  }
  const baseSchemas = Object.entries(baseBundle.schemas).map(([name, document]) => ({ name, document }));
  const baseObjectSchemaUris = baseSchemas
    .filter(({ document }) => typeof document["x-cairn-object-schema"] === "string")
    .map(({ document }) => document.$id)
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  if (baseObjectSchemaUris.length !== 12) throw new Error("base proposal object-schema surface changed");
  return {
    specPath,
    baseBundleHash: recomputedBaseBundleHash,
    baseRegistryHash: canonicalHash(baseRegistry),
    baseSchemas,
    baseObjectSchemaUris,
    runtimeDependencies
  };
}

export async function loadPhase1Sources(root) {
  const manifest = await readJson(path.join(root, "manifest.json"));
  const pins = await auditPinnedInputs(root, manifest);
  const schemas = buildPhase1Schemas(pins.baseObjectSchemaUris);
  const registry = phase1Registry(schemas);
  return { manifest, schemas, registry, pins, baseSchemas: pins.baseSchemas };
}

export function auditPhase1Sources({ manifest, schemas, registry, baseSchemas = [] }) {
  const ajv = createExecutionAjv([...baseSchemas, ...schemas]);
  for (const { name, document } of schemas) {
    if (!ajv.validateSchema(document)) throw new Error(`${name} is not valid JSON Schema: ${ajv.errorsText(ajv.errors)}`);
  }
  requireValid(ajv.getSchema(`${EXECUTION_SCHEMA_ROOT}machine-bundle-manifest.schema.json`), manifest, "execution manifest");
  requireValid(ajv.getSchema(`${EXECUTION_SCHEMA_ROOT}operation-registry.schema.json`), registry, "execution registry");

  if (manifest.profile !== PROFILE_ID || registry.profile !== PROFILE_ID) throw new Error("execution profile identifiers differ");
  if (manifest.release_phase !== RELEASE_PHASE || registry.release_phase !== RELEASE_PHASE) throw new Error("release phases differ");
  if (registry.schema_commitment_profile !== SCHEMA_COMMITMENT_PROFILE) throw new Error("execution schema commitment profile differs");
  if (manifest.conformance_claims.length !== 0) throw new Error("Phase 1 may not claim conformance");

  const objectIds = new Set();
  const schemaUris = new Set();
  for (const { name, document } of schemas) {
    if (schemaUris.has(document.$id)) throw new Error(`duplicate schema URI: ${document.$id}`);
    schemaUris.add(document.$id);
    const objectId = document["x-cairn-object-schema"];
    if (!objectId) continue;
    if (objectIds.has(objectId)) throw new Error(`duplicate object schema id: ${objectId}`);
    objectIds.add(objectId);
    if (document.properties?.schema?.const !== objectId || document.additionalProperties !== false) {
      throw new Error(`${name} is not a closed exact object schema`);
    }
    const idPointer = document["x-cairn-object-id-pointer"];
    const hashPointer = document["x-cairn-self-hash-pointer"];
    const signatures = document["x-cairn-signature-pointers"];
    const exclusions = document["x-cairn-hash-exclusion-pointers"];
    const refHashPairs = document["x-cairn-ref-hash-pairs"];
    if (![idPointer, hashPointer].every((pointer) => typeof pointer === "string" && pointer.startsWith("/"))) {
      throw new Error(`${name} lacks object identity/hash annotations`);
    }
    const objectKind = document["x-cairn-kind"];
    if (!Array.isArray(signatures) || !Array.isArray(exclusions) ||
        (objectKind === "signed-object" && signatures.length === 0) ||
        (objectKind === "content-addressed-object" && signatures.length !== 0) ||
        !["signed-object", "content-addressed-object"].includes(objectKind)) {
      throw new Error(`${name} has invalid object/signature annotations`);
    }
    const expectedExclusions = signatures.flatMap((pointer) => [`${pointer}/signed_hash`, `${pointer}/value`]);
    if (canonicalText(exclusions) !== canonicalText(expectedExclusions)) {
      throw new Error(`${name} excludes anything beyond signature proof cycle fields`);
    }
    const expectedRefHashPairs = Object.keys(document.properties)
      .filter((property) => property.endsWith("_ref") && Object.hasOwn(document.properties, `${property.slice(0, -4)}_hash`))
      .map((property) => [property, `${property.slice(0, -4)}_hash`]);
    if (canonicalText(refHashPairs) !== canonicalText(expectedRefHashPairs)) {
      throw new Error(`${name} does not declare its exact sibling ref/hash bindings`);
    }
    for (const pointer of [idPointer, hashPointer, ...signatures]) {
      const property = pointer.slice(1);
      if (!document.required.includes(property) || !document.properties[property]) {
        throw new Error(`${name}: annotation pointer ${pointer} is not a required property`);
      }
    }
    for (const pointer of signatures) {
      if (document.properties[pointer.slice(1)].$ref !== `${EXECUTION_SCHEMA_ROOT}common.schema.json#/$defs/signature`) {
        throw new Error(`${name}: signature is not the exact Phase 1 signature type`);
      }
    }
    if (document["x-cairn-source-spec-sha256"] !== SPEC_SHA256) throw new Error(`${name}: source spec pin missing`);
    for (const invariant of document["x-cairn-invariants"] ?? []) {
      if (!IMPLEMENTED_PHASE1_INVARIANTS.has(invariant)) throw new Error(`${name}: invariant ${invariant} has no bundled validator`);
    }
  }

  const walkSchema = (value, location) => {
    if (!value || typeof value !== "object") return;
    if (value.type === "array" && (!Number.isInteger(value.maxItems) || value.maxItems > 128)) {
      throw new Error(`${location}: array lacks the release-bound maxItems`);
    }
    for (const [key, child] of Object.entries(value)) walkSchema(child, `${location}/${key}`);
  };
  for (const { name, document } of schemas) walkSchema(document, name);

  const names = registry.operations.map(({ name }) => name);
  if (new Set(names).size !== names.length) throw new Error("execution operation names must be unique");
  if (canonicalText(registry.operations.map(operationTuple)) !== canonicalText(EXACT_PHASE1_OPERATION_TUPLES)) {
    throw new Error("Phase 1 registry differs from the exact closed surface");
  }
  for (const operation of registry.operations) {
    if (!operation.name.startsWith("execution.")) throw new Error(`${operation.name}: not execution-namespaced`);
    if (operation.mutating || operation.external_effect || operation.authority_effect !== "none") {
      throw new Error(`${operation.name}: Phase 1 operation must be read-only and non-authorizing`);
    }
    if (/\.(?:issue|import|transition|execute|deliver|hold|release|revoke|pause|resume|expire|close|evaluate|verify|commit|bind|quarantine)$/.test(operation.name)) {
      throw new Error(`${operation.name}: mutation verb is outside Phase 1`);
    }
    if (!ajv.getSchema(operation.request_schema)) throw new Error(`${operation.name}: request schema does not resolve`);
    if (!ajv.getSchema(operation.request_body_schema)) throw new Error(`${operation.name}: request body schema does not resolve`);
    if (!ajv.getSchema(operation.response_schema)) throw new Error(`${operation.name}: response schema does not resolve`);
    if (operation.request_schema_hash !== schemaLocationCommitment(operation.request_schema, schemas) ||
        operation.request_body_schema_hash !== schemaLocationCommitment(operation.request_body_schema, schemas) ||
        operation.response_schema_hash !== schemaLocationCommitment(operation.response_schema, schemas)) {
      throw new Error(`${operation.name}: registry schema commitment differs from its exact location`);
    }
    const requestEnvelope = schemaNodeAtLocation(operation.request_schema, schemas);
    if (requestEnvelope.additionalProperties !== false ||
        requestEnvelope.properties?.protocol_version?.const !== "0.1" ||
        requestEnvelope.properties?.profile_id?.const !== PROFILE_ID ||
        requestEnvelope.properties?.base_bundle_hash?.const !== BASE_BUNDLE_HASH ||
        requestEnvelope.properties?.operation?.const !== operation.name ||
        requestEnvelope.properties?.body?.$ref !== operation.request_body_schema ||
        requestEnvelope.properties?.execution_bundle_hash?.const !== undefined ||
        requestEnvelope.properties?.operation_registry_hash?.const !== undefined) {
      throw new Error(`${operation.name}: request envelope is not the exact nonrecursive compatibility binding`);
    }
  }
  return {
    ajv,
    schemaCount: schemas.length,
    objectSchemaCount: objectIds.size,
    operationCount: names.length,
    operationRegistryHash: canonicalHash(registry)
  };
}

export async function buildPhase1Bundle(root) {
  const sources = await loadPhase1Sources(root);
  const audit = auditPhase1Sources(sources);
  const sourceCommitments = Object.fromEntries(await Promise.all(PHASE1_SOURCE_COMMITMENT_FILES.map(async (file) =>
    [file, sha256(await readFile(path.join(root, file)))])));
  const unsigned = {
    schema: "cairn.execution_machine_bundle.v0.1",
    manifest: sources.manifest,
    dependency_pins: {
      base_bundle_hash: sources.pins.baseBundleHash,
      base_operation_registry_hash: sources.pins.baseRegistryHash,
      audited_prose_spec_sha256: SPEC_SHA256,
      shared_core_sha256: sources.pins.runtimeDependencies.sharedCoreHash
    },
    operation_registry_hash: audit.operationRegistryHash,
    source_commitments: sourceCommitments,
    schemas: Object.fromEntries(sources.schemas.map(({ document }) => [document.$id, document])),
    operation_registry: sources.registry
  };
  const bundle = { ...unsigned, bundle_hash: canonicalHash(unsigned) };
  return { bundle, bytes: `${canonicalText(bundle)}\n`, registryBytes: `${canonicalText(sources.registry)}\n`, audit };
}
