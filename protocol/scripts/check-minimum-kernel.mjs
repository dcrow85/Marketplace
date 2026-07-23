import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  buildMinimumTrustKernelRelease,
  verifyMinimumTrustKernelRelease
} from "../lib/minimum-kernel.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist", "cairn-minimum-trust-kernel-v0.1.json");
const { bytes, release, audit } = await buildMinimumTrustKernelRelease(root);
const actual = await readFile(output, "utf8");
const actualRelease = JSON.parse(actual);
const verificationFailures = await verifyMinimumTrustKernelRelease(root, actualRelease, {
  expectedReleaseHash: release.release_hash
});
if (verificationFailures.length) {
  throw new Error(`generated minimum trust kernel release verification failed: ${verificationFailures.join(",")}`);
}
if (actual !== bytes) throw new Error("generated minimum trust kernel release differs from source; run npm run build");

console.log(
  `minimum trust kernel check passed: ${audit.operationCount} operations, ` +
    `${audit.objectStoreMutationCount} object-store writes, ` +
    `${audit.grantConsumerCount} grant-budget consumers, ${release.release_hash}`
);
