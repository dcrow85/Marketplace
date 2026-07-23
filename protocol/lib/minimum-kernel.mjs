import path from "node:path";

import { buildBundle } from "./bundle.mjs";
import { canonicalHash, canonicalText } from "./core.mjs";
import { readJson } from "./schemas.mjs";

const EXPECTED_SCHEMA = "cairn.minimum_trust_kernel_manifest.v0.1";
const EXPECTED_KERNEL_ID = "cairn-agent-minimum-trust-kernel-v0.1";
const EXPECTED_STATUS = "active_narrowed_candidate";
const EXPECTED_MUTATIONS = [
  {
    operation: "intent.put",
    authority_effect: "records_principal_signed_intent_only"
  },
  {
    operation: "action.prepare",
    authority_effect: "none"
  }
];
const EXPECTED_FORBIDDEN_TERMS = [
  "authorize",
  "execute",
  "dispatch",
  "pay",
  "payment",
  "settle",
  "release",
  "waive",
  "issue"
];
const REQUIRED_EXCLUSIONS = ["cairn-supervised-execution-v0.1"];
const REQUIRED_PREREQUISITES = [
  "signed_service_read_snapshot",
  "authenticated_service_key_profile",
  "exact_dependency_semantics",
  "independent_frozen_review"
];
const REQUIRED_NON_CLAIMS = [
  "production_service",
  "runtime_conformance",
  "authority_to_act",
  "external_effect",
  "authorization",
  "execution",
  "payment",
  "settlement",
  "release",
  "waiver",
  "authenticated_service_observation"
];

function exact(actual, expected, message) {
  if (canonicalText(actual) !== canonicalText(expected)) throw new Error(message);
}

function uniqueStrings(value, label) {
  if (!Array.isArray(value) || value.some((member) => typeof member !== "string" || member.length === 0)) {
    throw new Error(`${label} must be a nonempty-string array`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${label} must not contain duplicates`);
}

export async function auditMinimumTrustKernel(root) {
  const manifest = await readJson(path.join(root, "minimum-trust-kernel.json"));
  const { bundle } = await buildBundle(root);
  const registry = bundle.operation_registry;
  const operationNames = registry.operations.map(({ name }) => name);
  const mutating = registry.operations
    .filter(({ mutating }) => mutating)
    .map(({ name: operation, authority_effect }) => ({ operation, authority_effect }));

  if (manifest.schema !== EXPECTED_SCHEMA) throw new Error("minimum kernel schema identifier differs");
  if (manifest.kernel_id !== EXPECTED_KERNEL_ID) throw new Error("minimum kernel identifier differs");
  if (manifest.release_status !== EXPECTED_STATUS) throw new Error("minimum kernel release status differs");
  if (manifest.profile !== registry.profile || manifest.profile !== bundle.manifest.profile) {
    throw new Error("minimum kernel profile differs from the foundation");
  }
  if (manifest.foundation_bundle_hash !== bundle.bundle_hash) {
    throw new Error("minimum kernel foundation bundle hash differs");
  }
  if (manifest.operation_registry_hash !== canonicalHash(registry)) {
    throw new Error("minimum kernel operation registry hash differs");
  }

  uniqueStrings(manifest.included_operations, "included_operations");
  exact(manifest.included_operations, operationNames, "minimum kernel operation surface differs");
  exact(manifest.allowed_local_mutations, EXPECTED_MUTATIONS, "minimum kernel allowed mutation boundary differs");
  exact(mutating, EXPECTED_MUTATIONS, "foundation mutations exceed the minimum kernel boundary");

  uniqueStrings(manifest.forbidden_operation_terms, "forbidden_operation_terms");
  exact(
    manifest.forbidden_operation_terms,
    EXPECTED_FORBIDDEN_TERMS,
    "minimum kernel forbidden operation terms differ"
  );
  for (const operation of registry.operations) {
    const inspected = `${operation.name} ${operation.consequence} ${operation.authority_effect}`.toLowerCase();
    const forbidden = manifest.forbidden_operation_terms.find((term) => inspected.includes(term));
    if (forbidden) throw new Error(`${operation.name}: forbidden consequential term ${forbidden}`);
  }

  exact(manifest.excluded_profiles, REQUIRED_EXCLUSIONS, "minimum kernel excluded profiles differ");
  exact(manifest.next_profile_requires, REQUIRED_PREREQUISITES, "minimum kernel next-profile prerequisites differ");
  exact(manifest.conformance_claims, [], "minimum kernel may not claim conformance");
  exact(manifest.not_claiming, REQUIRED_NON_CLAIMS, "minimum kernel non-claims differ");
  if (!Array.isArray(registry.not_claiming) || !registry.not_claiming.includes("external_effect")) {
    throw new Error("foundation registry no longer disclaims external effect");
  }

  return {
    kernelId: manifest.kernel_id,
    bundleHash: bundle.bundle_hash,
    registryHash: canonicalHash(registry),
    operationCount: operationNames.length,
    mutationCount: mutating.length
  };
}
