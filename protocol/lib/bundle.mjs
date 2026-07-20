import { readdir } from "node:fs/promises";
import path from "node:path";

import { canonicalHash, canonicalText } from "./core.mjs";
import { createAjv, loadSchemas, readJson, requireValid } from "./schemas.mjs";

export async function loadSources(root) {
  const schemas = await loadSchemas(root);
  const manifest = await readJson(path.join(root, "manifest.json"));
  const registry = await readJson(path.join(root, manifest.operation_registry));
  const vectorDirectory = path.join(root, "vectors");
  let vectorNames = [];
  try {
    vectorNames = (await readdir(vectorDirectory)).filter((name) => name.endsWith(".json")).sort();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const vectors = await Promise.all(
    vectorNames.map(async (name) => ({ name, document: await readJson(path.join(vectorDirectory, name)) }))
  );
  return { manifest, registry, schemas, vectors };
}

export function auditSources({ manifest, registry, schemas }) {
  const ajv = createAjv(schemas);
  for (const { name, document } of schemas) {
    if (!ajv.validateSchema(document)) {
      throw new Error(`${name} is not valid JSON Schema: ${ajv.errorsText(ajv.errors)}`);
    }
  }

  requireValid(
    ajv.getSchema("https://cairn.cards/protocol/schemas/v0.1/machine-bundle-manifest.schema.json"),
    manifest,
    "manifest"
  );
  requireValid(
    ajv.getSchema("https://cairn.cards/protocol/schemas/v0.1/operation-registry.schema.json"),
    registry,
    "operation registry"
  );

  const objectSchemas = new Set();
  for (const { name, document } of schemas) {
    const objectSchema = document["x-cairn-object-schema"];
    if (!objectSchema) continue;
    if (objectSchemas.has(objectSchema)) throw new Error(`duplicate object schema id: ${objectSchema}`);
    objectSchemas.add(objectSchema);
    if (document.properties?.schema?.const !== objectSchema) {
      throw new Error(`${name} does not bind properties.schema to ${objectSchema}`);
    }
    if (document.additionalProperties !== false) {
      throw new Error(`${name} must reject undeclared top-level fields`);
    }
    const exclusionPointers = [
      document["x-cairn-self-hash-pointer"],
      ...document["x-cairn-signature-pointers"]
    ];
    if (new Set(exclusionPointers).size !== exclusionPointers.length) {
      throw new Error(`${name} repeats a hash/signature exclusion pointer`);
    }
    for (const pointer of exclusionPointers) {
      if (typeof pointer !== "string" || !pointer.startsWith("/")) {
        throw new Error(`${name} has an invalid Cairn exclusion pointer`);
      }
      const rootProperty = pointer.slice(1).split("/", 1)[0].replaceAll("~1", "/").replaceAll("~0", "~");
      if (!document.properties?.[rootProperty] || !document.required?.includes(rootProperty)) {
        throw new Error(`${name}: exclusion pointer ${pointer} is not a required declared property`);
      }
    }
    for (const ruleName of ["x-cairn-semantic-hash", "x-cairn-body-hash"]) {
      const rule = document[ruleName];
      if (!rule) continue;
      for (const pointer of [rule.source_pointer, rule.target_pointer]) {
        const rootProperty = pointer?.slice(1).split("/", 1)[0];
        if (!pointer?.startsWith("/") || !document.properties?.[rootProperty] || !document.required?.includes(rootProperty)) {
          throw new Error(`${name}: ${ruleName} pointer ${pointer} is not a required declared property`);
        }
      }
    }
  }

  const operationNames = registry.operations.map(({ name }) => name);
  if (registry.protocol_version !== manifest.protocol_version || registry.profile !== manifest.profile) {
    throw new Error("manifest and operation registry profile differ");
  }
  if (manifest.conformance_claims.length !== 0) throw new Error("foundation may not claim conformance");
  if (new Set(operationNames).size !== operationNames.length) throw new Error("operation names must be unique");
  for (const operation of registry.operations) {
    if (!ajv.getSchema(operation.request_schema)) throw new Error(`${operation.name}: request schema does not resolve`);
    if (!ajv.getSchema(operation.response_schema)) throw new Error(`${operation.name}: response schema does not resolve`);
    if (operation.consequence === "preparation_only" && operation.authority_effect !== "none") {
      throw new Error(`${operation.name}: preparation may not carry an authority effect`);
    }
    if (operation.data_grant_required === (operation.authorization_requirement === "none")) {
      throw new Error(`${operation.name}: grant flag and authorization requirement disagree`);
    }
    if (
      operation.name === "continuation.get" &&
      operation.authorization_requirement !== "continuation_disclosure_authorization"
    ) {
      throw new Error("continuation.get must require its one-shot disclosure authorization");
    }
    if (/authorize|execute|dispatch|pay|release|waive|issue/.test(operation.name)) {
      throw new Error(`${operation.name}: consequential operation is outside the foundation profile`);
    }
  }

  const envelope = schemas.find(({ document }) => document["x-cairn-object-schema"] === "cairn.envelope.v0.1")?.document;
  const messageTypes = envelope?.properties?.message_type?.enum ?? [];
  if ([...messageTypes].sort().join("\n") !== [...operationNames].sort().join("\n")) {
    throw new Error("envelope message types and operation registry differ");
  }
  return { ajv, objectSchemaCount: objectSchemas.size, operationCount: operationNames.length };
}

export async function buildBundle(root) {
  const sources = await loadSources(root);
  const audit = auditSources(sources);
  const unsigned = {
    schema: "cairn.machine_bundle.v0.1",
    manifest: sources.manifest,
    schemas: Object.fromEntries(sources.schemas.map(({ document }) => [document.$id, document])),
    operation_registry: sources.registry,
    vectors: Object.fromEntries(sources.vectors.map(({ name, document }) => [name, document]))
  };
  const bundle = { ...unsigned, bundle_hash: canonicalHash(unsigned) };
  return { bundle, bytes: `${canonicalText(bundle)}\n`, audit };
}
