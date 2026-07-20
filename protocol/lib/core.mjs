import { createHash, createPublicKey, verify } from "node:crypto";

import canonicalize from "canonicalize";

const HASH_PREFIX = "sha-256:";
const DOMAIN = "cairn-object-v0.1";
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function canonicalText(value) {
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
  if (!expectedSchema || !selfHashPointer || !Array.isArray(signaturePointers)) {
    throw new TypeError("schema does not declare the Cairn signed-object annotations");
  }
  if (object.schema !== expectedSchema) {
    throw new TypeError(`object schema ${object.schema} does not match ${expectedSchema}`);
  }
  return canonicalHash(withoutPointers(object, [selfHashPointer, ...signaturePointers]));
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

export function rawEd25519PublicKeyToKeyObject(publicKey) {
  const raw = Buffer.from(publicKey, "base64url");
  if (raw.length !== 32) throw new TypeError("Ed25519 public key must be 32 bytes");
  return createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, raw]),
    format: "der",
    type: "spki"
  });
}

export function verifyEd25519({ schemaId, objectHash: objectHashValue, publicKey, signature }) {
  const signatureBytes = Buffer.from(signature, "base64url");
  if (signatureBytes.length !== 64) return false;
  return verify(
    null,
    signatureInput(schemaId, objectHashValue),
    rawEd25519PublicKeyToKeyObject(publicKey),
    signatureBytes
  );
}

export function utf8Sorted(values) {
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

export function validateContinuationBinding(bundle, authorization) {
  const failures = [];
  if (authorization.principal_id !== bundle.principal_id) failures.push("principal_mismatch");
  if (authorization.bundle_hash !== bundle.bundle_hash) failures.push("bundle_hash_mismatch");
  if (authorization.recipient_runtime_binding_hash !== bundle.recipient_runtime_binding.ref.object_hash) {
    failures.push("runtime_binding_hash_mismatch");
  }
  if (
    authorization.recipient_runtime_binding_ref.object_id !== bundle.recipient_runtime_binding.ref.object_id ||
    authorization.recipient_runtime_binding_ref.object_hash !== bundle.recipient_runtime_binding.ref.object_hash
  ) {
    failures.push("runtime_binding_ref_mismatch");
  }

  const allowedGrants = new Set(authorization.data_grant_refs.map((ref) => `${ref.object_id}|${ref.object_hash}`));
  const privateRefs = [
    bundle.recipient_runtime_binding,
    ...bundle.items,
    ...bundle.current_intent_control_heads,
    ...bundle.current_deal_heads,
    ...bundle.current_action_reservation_service_refs,
    ...bundle.current_grant_status_and_revocation_refs,
    ...bundle.unresolved_unknown_refs
  ];
  for (const entry of privateRefs) {
    const key = `${entry.data_grant_ref.object_id}|${entry.data_grant_ref.object_hash}`;
    if (!allowedGrants.has(key)) failures.push("data_grant_graph_exceeded");
  }
  return [...new Set(failures)];
}

export function validateEnvelopeOperation(envelope, registry, supportedCriticalExtensions = new Set()) {
  const failures = [];
  const operation = registry.operations.find(({ name }) => name === envelope.message_type);
  if (!operation) return ["operation_unknown"];
  if (envelope.body_schema !== operation.request_schema) failures.push("body_schema_mismatch");
  if (operation.mutating && !envelope.idempotency_key) failures.push("idempotency_key_required");
  for (const extension of envelope.critical_extensions) {
    if (!supportedCriticalExtensions.has(extension)) failures.push("critical_extension_unknown");
  }
  return [...new Set(failures)];
}

export function validateProposalEffectBinding(proposal, effect) {
  const failures = [];
  if (proposal.effect_descriptor_ref.schema !== effect.schema) failures.push("effect_descriptor_schema_mismatch");
  if (proposal.effect_descriptor_ref.object_id !== effect.effect_descriptor_id) failures.push("effect_descriptor_id_mismatch");
  if (proposal.effect_descriptor_ref.object_hash !== effect.descriptor_hash) failures.push("effect_descriptor_hash_mismatch");
  if (proposal.effect_id !== effect.effect_id) failures.push("effect_id_mismatch");
  if (proposal.principal_id !== effect.effect_semantics.principal_id) failures.push("effect_principal_mismatch");
  if (proposal.capability !== effect.effect_semantics.capability) failures.push("effect_capability_mismatch");
  if (proposal.rail !== effect.effect_semantics.rail) failures.push("effect_rail_mismatch");

  const proposalAmounts = Object.fromEntries(proposal.amounts.map(({ role, money }) => [role, money]));
  if (canonicalText(proposalAmounts) !== canonicalText(effect.effect_semantics.amounts_by_role)) {
    failures.push("effect_amounts_mismatch");
  }
  return failures;
}
