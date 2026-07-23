import path from "node:path";
import { fileURLToPath } from "node:url";

import { auditMinimumTrustKernel } from "../lib/minimum-kernel.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = await auditMinimumTrustKernel(root);

console.log(
  `minimum trust kernel check passed: ${result.operationCount} operations, ` +
    `${result.mutationCount} bounded local mutations, ${result.bundleHash}`
);
