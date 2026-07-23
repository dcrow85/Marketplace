import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildMinimumTrustKernelRelease } from "../lib/minimum-kernel.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist", "cairn-minimum-trust-kernel-v0.1.json");
const { bytes, release, audit } = await buildMinimumTrustKernelRelease(root);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, bytes, "utf8");

console.log(
  `built ${path.relative(root, output)}: ${audit.operationCount} operations, ` +
    `${audit.objectStoreMutationCount} object-store writes, ` +
    `${audit.grantConsumerCount} grant-budget consumers, ${release.release_hash}`
);
