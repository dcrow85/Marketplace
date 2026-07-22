import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildPhase1Bundle } from "../lib/bundle.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const { bundle, bytes, registryBytes, audit } = await buildPhase1Bundle(root);
await mkdir(dist, { recursive: true });
await writeFile(path.join(dist, "cairn-supervised-execution-phase1-v0.1.json"), bytes, "utf8");
await writeFile(path.join(dist, "operation-registry-phase1-v0.1.json"), registryBytes, "utf8");
console.log(
  `built Phase 1 execution bundle: ${audit.objectSchemaCount} object schemas, ` +
  `${audit.operationCount} read-only operations, ${bundle.bundle_hash}`
);
