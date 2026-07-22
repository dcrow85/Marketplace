import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalHash } from "../lib/core.mjs";
import { buildPhase1Bundle } from "../lib/bundle.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { bundle, bytes, registryBytes, audit } = await buildPhase1Bundle(root);
const actualBundle = await readFile(path.join(root, "dist", "cairn-supervised-execution-phase1-v0.1.json"), "utf8");
const actualRegistry = await readFile(path.join(root, "dist", "operation-registry-phase1-v0.1.json"), "utf8");
if (actualBundle !== bytes) throw new Error("generated Phase 1 bundle differs from source; run npm run build");
if (actualRegistry !== registryBytes) throw new Error("generated Phase 1 registry differs from source; run npm run build");
const parsed = JSON.parse(actualBundle);
const { bundle_hash: claimed, ...unsigned } = parsed;
if (claimed !== bundle.bundle_hash || claimed !== canonicalHash(unsigned)) throw new Error("Phase 1 bundle hash mismatch");
if (parsed.operation_registry_hash !== audit.operationRegistryHash) throw new Error("Phase 1 registry hash mismatch");
console.log(
  `Phase 1 bundle check passed: ${audit.objectSchemaCount} object schemas, ` +
  `${audit.operationCount} read-only operations, ${claimed}`
);
