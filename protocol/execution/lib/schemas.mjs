import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { canonicalText, isCanonicalBase64Url, utf8Sorted, valueAtPointer } from "./core.mjs";

function jsonDepth(value) {
  let maximum = 0;
  const stack = [{ value, depth: 1 }];
  while (stack.length) {
    const current = stack.pop();
    maximum = Math.max(maximum, current.depth);
    if (Array.isArray(current.value)) {
      for (const child of current.value) stack.push({ value: child, depth: current.depth + 1 });
    } else if (current.value !== null && typeof current.value === "object") {
      for (const child of Object.values(current.value)) stack.push({ value: child, depth: current.depth + 1 });
    }
  }
  return maximum;
}

export function createExecutionAjv(schemas = []) {
  const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
  addFormats(ajv);
  ajv.addFormat("cairn-ed25519-public-key", (value) => isCanonicalBase64Url(value, 32));
  ajv.addFormat("cairn-ed25519-signature", (value) => isCanonicalBase64Url(value, 64));
  ajv.addFormat("cairn-timestamp", (value) => {
    if (typeof value !== "string") return false;
    const match = /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])Z$/.exec(value);
    if (!match) return false;
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) return false;
    const date = new Date(parsed);
    return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() + 1 === Number(match[2]) &&
      date.getUTCDate() === Number(match[3]) && date.getUTCHours() === Number(match[4]) &&
      date.getUTCMinutes() === Number(match[5]) && date.getUTCSeconds() === Number(match[6]);
  });
  for (const keyword of [
    "x-cairn-kind",
    "x-cairn-object-schema",
    "x-cairn-object-id-pointer",
    "x-cairn-self-hash-pointer",
    "x-cairn-signature-pointers",
    "x-cairn-hash-exclusion-pointers",
    "x-cairn-ref-hash-pairs",
    "x-cairn-source-spec-sha256",
    "x-cairn-invariants",
    "x-cairn-semantic-hash",
    "x-cairn-body-hash"
  ]) ajv.addKeyword({ keyword, valid: true });
  ajv.addKeyword({
    keyword: "x-cairn-max-utf8-bytes",
    type: "string",
    schemaType: "number",
    validate: (maximum, data) => Buffer.byteLength(data, "utf8") <= maximum
  });
  ajv.addKeyword({
    keyword: "x-cairn-max-canonical-bytes",
    schemaType: "number",
    validate: (maximum, data) => Buffer.byteLength(canonicalText(data), "utf8") <= maximum
  });
  ajv.addKeyword({
    keyword: "x-cairn-max-json-depth",
    schemaType: "number",
    validate: (maximum, data) => jsonDepth(data) <= maximum
  });
  ajv.addKeyword({
    keyword: "x-cairn-utf8-sorted",
    type: "array",
    schemaType: "boolean",
    validate: (enabled, data) => !enabled || utf8Sorted(data)
  });
  ajv.addKeyword({
    keyword: "x-cairn-equal-non-null-pointers",
    type: "object",
    schemaType: "array",
    validate: (pairs, data) => {
      try {
        return pairs.every(([left, right]) => {
          const leftValue = valueAtPointer(data, left);
          const rightValue = valueAtPointer(data, right);
          return leftValue === null || rightValue === null || leftValue === rightValue;
        });
      } catch {
        return false;
      }
    }
  });
  ajv.addKeyword({
    keyword: "x-cairn-unique-by",
    type: "array",
    schemaType: "string",
    validate: (field, data) =>
      data.every((item) => item !== null && typeof item === "object" && Object.hasOwn(item, field)) &&
      new Set(data.map((item) => item[field])).size === data.length
  });
  for (const { document } of schemas) ajv.addSchema(document);
  return ajv;
}

export function errorsText(validate) {
  return (validate?.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message}`).join("; ");
}

export function requireValid(validate, value, label) {
  if (!validate || !validate(value)) throw new Error(`${label}: ${errorsText(validate) || "schema unavailable"}`);
}
