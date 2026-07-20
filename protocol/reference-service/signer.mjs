import { sign as signBytes } from "node:crypto";

import { bindObjectHash, signatureInput, valueAtPointer } from "../lib/core.mjs";

const ZERO_HASH = `sha-256:${"0".repeat(64)}`;

export function signaturePlaceholder(keyId, signedAt) {
  return {
    profile: "cairn-ed25519-v0.1",
    key_id: keyId,
    signed_hash: ZERO_HASH,
    signed_at: signedAt,
    value: "A".repeat(86)
  };
}

export function createEd25519ObjectSigner({ keyId, privateKey, schemasByObjectId }) {
  if (typeof keyId !== "string" || !privateKey || !(schemasByObjectId instanceof Map)) {
    throw new TypeError("complete Ed25519 signer dependencies required");
  }
  return (draft) => {
    const schema = schemasByObjectId.get(draft?.schema);
    if (!schema) throw new TypeError(`unknown signed-object schema: ${draft?.schema}`);
    const signaturePointer = schema["x-cairn-signature-pointers"]?.[0];
    const signature = valueAtPointer(draft, signaturePointer);
    if (signature.key_id !== keyId) {
      throw new TypeError("signature placeholder does not match signer identity");
    }
    const bound = bindObjectHash(draft, schema);
    const proof = valueAtPointer(bound, signaturePointer);
    proof.value = signBytes(null, signatureInput(bound.schema, proof.signed_hash), privateKey).toString("base64url");
    return bound;
  };
}

export { ZERO_HASH };
