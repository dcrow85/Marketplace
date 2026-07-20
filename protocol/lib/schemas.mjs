import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { utf8Sorted } from "./core.mjs";

export async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function loadSchemas(root) {
  const directory = path.join(root, "schemas");
  const names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  return Promise.all(names.map(async (name) => ({ name, document: await readJson(path.join(directory, name)) })));
}

export function createAjv(schemas = []) {
  const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
  addFormats(ajv);

  for (const keyword of [
    "x-cairn-kind",
    "x-cairn-object-schema",
    "x-cairn-self-hash-pointer",
    "x-cairn-signature-pointers",
    "x-cairn-semantic-hash",
    "x-cairn-body-hash"
  ]) {
    ajv.addKeyword({ keyword, valid: true });
  }
  ajv.addKeyword({
    keyword: "x-cairn-utf8-sorted",
    type: "array",
    schemaType: "boolean",
    validate: (enabled, data) => !enabled || utf8Sorted(data)
  });
  ajv.addKeyword({
    keyword: "x-cairn-unique-by",
    type: "array",
    schemaType: "string",
    validate: (field, data) => new Set(data.map((item) => item?.[field])).size === data.length
  });

  for (const { document } of schemas) ajv.addSchema(document);
  return ajv;
}

export function formatErrors(errors) {
  return (errors ?? [])
    .map((error) => `${error.instancePath || "/"} ${error.message}`)
    .join("; ");
}

export function requireValid(validate, value, label) {
  if (!validate(value)) throw new Error(`${label}: ${formatErrors(validate.errors)}`);
}
