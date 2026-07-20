import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildBundle } from "../lib/bundle.mjs";
import { canonicalHash } from "../lib/core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist", "cairn-protocol-bundle-v0.1.json");
const { bundle, bytes, audit } = await buildBundle(root);
const actualBytes = await readFile(output, "utf8");
if (actualBytes !== bytes) throw new Error("generated bundle differs from source; run npm run build");

const parsed = JSON.parse(actualBytes);
const { bundle_hash: claimedHash, ...unsigned } = parsed;
if (claimedHash !== canonicalHash(unsigned) || claimedHash !== bundle.bundle_hash) {
  throw new Error("bundle hash does not match canonical source content");
}
console.log(
  `bundle check passed: ${audit.objectSchemaCount} object schemas, ${audit.operationCount} operations, ${claimedHash}`
);
