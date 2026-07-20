import { createHash, createPublicKey, verify } from "node:crypto";

import canonicalize from "canonicalize";

const HASH_PREFIX = "sha-256:";
const DOMAIN = "cairn-object-v0.1";
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function assertUnicodeScalarString(value, path) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new TypeError(`${path}: unpaired high surrogate is not I-JSON`);
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError(`${path}: unpaired low surrogate is not I-JSON`);
    }
  }
}

export function assertIJson(value, path = "$", seen = new WeakSet()) {
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") {
    assertUnicodeScalarString(value, path);
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path}: non-finite number is not I-JSON`);
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) {
      throw new TypeError(`${path}: integer is outside the interoperable I-JSON range`);
    }
    return;
  }
  if (typeof value !== "object") throw new TypeError(`${path}: ${typeof value} is not JSON data`);
  if (seen.has(value)) throw new TypeError(`${path}: cyclic data is not JSON`);
  seen.add(value);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) throw new TypeError(`${path}[${index}]: sparse arrays are not JSON`);
      assertIJson(value[index], `${path}[${index}]`, seen);
    }
    const nonIndexKeys = Object.keys(value).filter((key) => !/^(?:0|[1-9][0-9]*)$/.test(key));
    if (nonIndexKeys.length) throw new TypeError(`${path}: array has non-JSON members`);
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path}: non-plain object is not JSON data`);
    }
    for (const [key, item] of Object.entries(value)) {
      assertUnicodeScalarString(key, `${path}.<key>`);
      assertIJson(item, `${path}.${key}`, seen);
    }
  }
  seen.delete(value);
}

export function canonicalText(value) {
  assertIJson(value);
  const encoded = canonicalize(value);
  if (typeof encoded !== "string") {
    throw new TypeError("value cannot be represented by RFC 8785/JCS");
  }
  return encoded;
}

export function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  return `${HASH_PREFIX}${createHash("sha256").update(bytes).digest("hex")}`;
}

export function canonicalHash(value) {
  return sha256(canonicalText(value));
}

function decodePointerToken(token) {
  return token.replaceAll("~1", "/").replaceAll("~0", "~");
}

export function valueAtPointer(document, pointer) {
  if (pointer === "") return document;
  if (!pointer.startsWith("/")) throw new TypeError(`invalid JSON Pointer: ${pointer}`);
  return pointer
    .slice(1)
    .split("/")
    .map(decodePointerToken)
    .reduce((value, key) => {
      if (value === null || typeof value !== "object" || !(key in value)) {
        throw new TypeError(`JSON Pointer does not resolve: ${pointer}`);
      }
      return value[key];
    }, document);
}

export function withoutPointers(document, pointers) {
  const clone = structuredClone(document);
  for (const pointer of pointers) {
    if (!pointer.startsWith("/") || pointer === "/") {
      throw new TypeError(`unsupported exclusion pointer: ${pointer}`);
    }
    const tokens = pointer.slice(1).split("/").map(decodePointerToken);
    const final = tokens.pop();
    let parent = clone;
    for (const token of tokens) {
      if (parent === null || typeof parent !== "object" || !(token in parent)) {
        throw new TypeError(`exclusion pointer does not resolve: ${pointer}`);
      }
      parent = parent[token];
    }
    if (parent === null || typeof parent !== "object" || !(final in parent)) {
      throw new TypeError(`exclusion pointer does not resolve: ${pointer}`);
    }
    delete parent[final];
  }
  return clone;
}

export function setAtPointer(document, pointer, value) {
  if (!pointer.startsWith("/") || pointer === "/") throw new TypeError(`unsupported JSON Pointer: ${pointer}`);
  const tokens = pointer.slice(1).split("/").map(decodePointerToken);
  const final = tokens.pop();
  let parent = document;
  for (const token of tokens) {
    if (parent === null || typeof parent !== "object" || !(token in parent)) {
      throw new TypeError(`JSON Pointer does not resolve: ${pointer}`);
    }
    parent = parent[token];
  }
  if (parent === null || typeof parent !== "object" || !(final in parent)) {
    throw new TypeError(`JSON Pointer does not resolve: ${pointer}`);
  }
  parent[final] = value;
  return document;
}

export function objectHash(object, schema) {
  const expectedSchema = schema["x-cairn-object-schema"];
  const selfHashPointer = schema["x-cairn-self-hash-pointer"];
  const signaturePointers = schema["x-cairn-signature-pointers"];
  const exclusionPointers = schema["x-cairn-hash-exclusion-pointers"];
  if (
    !expectedSchema ||
    !selfHashPointer ||
    !Array.isArray(signaturePointers) ||
    !Array.isArray(exclusionPointers)
  ) {
    throw new TypeError("schema does not declare the Cairn signed-object annotations");
  }
  if (object.schema !== expectedSchema) {
    throw new TypeError(`object schema ${object.schema} does not match ${expectedSchema}`);
  }
  return canonicalHash(withoutPointers(object, [selfHashPointer, ...exclusionPointers]));
}

export function bindObjectHash(object, schema) {
  const clone = structuredClone(object);
  const hash = objectHash(clone, schema);
  setAtPointer(clone, schema["x-cairn-self-hash-pointer"], hash);
  for (const pointer of schema["x-cairn-signature-pointers"]) {
    const signature = valueAtPointer(clone, pointer);
    setAtPointer(clone, `${pointer}/signed_hash`, hash);
  }
  return clone;
}

export function semanticHash(object, schema) {
  const rule = schema["x-cairn-semantic-hash"];
  if (!rule) throw new TypeError("schema does not declare a semantic hash");
  return canonicalHash(valueAtPointer(object, rule.source_pointer));
}

export function bodyHash(object, schema) {
  const rule = schema["x-cairn-body-hash"];
  if (!rule) throw new TypeError("schema does not declare a body hash");
  return canonicalHash(valueAtPointer(object, rule.source_pointer));
}

export function signatureInput(schemaId, objectHashValue) {
  return Buffer.from(`${DOMAIN}\n${schemaId}\n${objectHashValue}`, "ascii");
}

export function decodeCanonicalBase64Url(value, expectedLength) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new TypeError("value is not unpadded base64url");
  }
  const bytes = Buffer.from(value, "base64url");
  if (bytes.length !== expectedLength) throw new TypeError(`decoded value must be ${expectedLength} bytes`);
  if (bytes.toString("base64url") !== value) throw new TypeError("base64url encoding is not canonical");
  return bytes;
}

export function isCanonicalBase64Url(value, expectedLength) {
  try {
    decodeCanonicalBase64Url(value, expectedLength);
    return true;
  } catch {
    return false;
  }
}

export function rawEd25519PublicKeyToKeyObject(publicKey) {
  const raw = decodeCanonicalBase64Url(publicKey, 32);
  return createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, raw]),
    format: "der",
    type: "spki"
  });
}

export function verifyEd25519({ schemaId, objectHash: objectHashValue, publicKey, signature }) {
  try {
    const signatureBytes = decodeCanonicalBase64Url(signature, 64);
    return verify(
      null,
      signatureInput(schemaId, objectHashValue),
      rawEd25519PublicKeyToKeyObject(publicKey),
      signatureBytes
    );
  } catch {
    return false;
  }
}

export function utf8Sorted(values) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string")) return false;
  for (let index = 1; index < values.length; index += 1) {
    if (Buffer.compare(Buffer.from(values[index - 1], "utf8"), Buffer.from(values[index], "utf8")) >= 0) {
      return false;
    }
  }
  return true;
}

export function verifyObjectBindings(object, schema) {
  const failures = [];
  const expectedObjectHash = objectHash(object, schema);
  const selfHash = valueAtPointer(object, schema["x-cairn-self-hash-pointer"]);
  if (selfHash !== expectedObjectHash) failures.push("object_hash_mismatch");

  for (const pointer of schema["x-cairn-signature-pointers"]) {
    const signature = valueAtPointer(object, pointer);
    if (signature.signed_hash !== expectedObjectHash) failures.push("signature_hash_mismatch");
  }

  if (schema["x-cairn-semantic-hash"]) {
    const expectedEffect = semanticHash(object, schema);
    const actualEffect = valueAtPointer(object, schema["x-cairn-semantic-hash"].target_pointer);
    if (actualEffect !== expectedEffect) failures.push("semantic_hash_mismatch");
  }

  if (schema["x-cairn-body-hash"]) {
    const expectedBody = bodyHash(object, schema);
    const actualBody = valueAtPointer(object, schema["x-cairn-body-hash"].target_pointer);
    if (actualBody !== expectedBody) failures.push("body_hash_mismatch");
  }

  return failures;
}

export function objectRefKey(ref) {
  return `${ref.schema}|${ref.object_id}|${ref.object_hash}`;
}

export function sameObjectRef(left, right) {
  return Boolean(
    left &&
      right &&
      left.schema === right.schema &&
      left.object_id === right.object_id &&
      left.object_hash === right.object_hash
  );
}

export function objectRefFor(object, schema) {
  const idPointer = schema["x-cairn-object-id-pointer"];
  if (!idPointer) throw new TypeError("schema does not declare x-cairn-object-id-pointer");
  return {
    schema: object.schema,
    object_id: valueAtPointer(object, idPointer),
    object_hash: valueAtPointer(object, schema["x-cairn-self-hash-pointer"])
  };
}
