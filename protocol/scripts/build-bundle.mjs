import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildBundle } from "../lib/bundle.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist", "cairn-protocol-bundle-v0.1.json");
const { bundle, bytes, audit } = await buildBundle(root);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, bytes, "utf8");
console.log(
  `built ${path.relative(root, output)}: ${audit.objectSchemaCount} object schemas, ` +
    `${audit.operationCount} operations, ${bundle.bundle_hash}`
);
