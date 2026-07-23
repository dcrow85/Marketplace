import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { buildBundle } from "./bundle.mjs";
import { canonicalHash, canonicalText } from "./core.mjs";
import { createAjv, readJson, requireValid } from "./schemas.mjs";

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
const REQUIRED_BYO_PREREQUISITES = [
  "preprovisioned_authenticated_runtime_binding",
  "principal_bound_exact_runtime_data_grants_and_state",
  "authenticated_object_ref_and_uri_handoff",
  "signing_key_resolution_profile"
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
  "authenticated_service_observation",
  "agent_onboarding",
  "grant_issuance",
  "object_reference_discovery",
  "continuation_delivery"
];
const EXPECTED_PACKAGE_FILES = [
  "README.md",
  "dist",
  "fixtures",
  "lib",
  "manifest.json",
  "minimum-trust-kernel.json",
  "mutations",
  "operations",
  "package-lock.json",
  "package.json",
  "reference-service",
  "release",
  "schemas",
  "scripts",
  "tests",
  "vectors"
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

function requireStrictJson(root) {
  const script = path.join(root, "scripts", "check-json-sources.py");
  const result = spawnSync("python3", [
    script,
    path.join(root, "minimum-trust-kernel.json"),
    path.join(root, "release"),
    path.join(root, "execution", "rejection.json")
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`minimum kernel strict JSON check failed: ${(result.stderr || result.stdout).trim()}`);
  }
}

async function releaseSchemas(root) {
  const names = [
    "minimum-trust-kernel.schema.json",
    "rejected-profile-marker.schema.json"
  ];
  return Promise.all(names.map(async (name) => ({
    name,
    document: await readJson(path.join(root, "release", name))
  })));
}

function expectedStateEffects(registry) {
  return registry.operations.map((operation) => ({
    operation: operation.name,
    object_store_mutating: operation.object_store_mutating,
    access_state_effects: operation.access_state_effects,
    signed_envelope_effects: operation.object_store_mutating
      ? ["consume_replay_nonce", "write_idempotency_record"]
      : ["consume_replay_nonce"]
  }));
}

function rawSha256(bytes) {
  return `sha-256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function sourceFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    if (entry.name === "__pycache__") continue;
    if (["dist", "execution", "node_modules"].includes(entry.name) && prefix === "") continue;
    const absolute = path.join(directory, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const metadata = await lstat(absolute);
    if (metadata.isSymbolicLink()) throw new Error(`minimum kernel source may not be a symlink: ${relative}`);
    if (metadata.isDirectory()) files.push(...await sourceFiles(absolute, relative));
    else if (metadata.isFile()) {
      if (/\.py[co]$/.test(entry.name)) continue;
      files.push({ absolute, relative });
    }
    else throw new Error(`unsupported minimum kernel source type: ${relative}`);
  }
  return files;
}

async function sourceCommitments(root) {
  const files = await sourceFiles(root);
  files.push(
    { absolute: path.resolve(root, "..", "Protocol_Agent_Intent_Interop_v0.1.md"), relative: "../Protocol_Agent_Intent_Interop_v0.1.md" },
    { absolute: path.resolve(root, "..", "Protocol_Agent_Minimum_Trust_Kernel_v0.1.md"), relative: "../Protocol_Agent_Minimum_Trust_Kernel_v0.1.md" },
    { absolute: path.join(root, "execution", "README.md"), relative: "execution/README.md" },
    { absolute: path.join(root, "execution", "REJECTED.md"), relative: "execution/REJECTED.md" },
    { absolute: path.join(root, "execution", "rejection.json"), relative: "execution/rejection.json" }
  );
  files.sort((left, right) => left.relative.localeCompare(right.relative, "en"));
  if (new Set(files.map(({ relative }) => relative)).size !== files.length) {
    throw new Error("minimum kernel source commitment paths must be unique");
  }
  return Object.fromEntries(await Promise.all(files.map(async ({ absolute, relative }) => [
    relative,
    rawSha256(await readFile(absolute))
  ])));
}

async function auditExecutionExclusion(root, manifest, ajv) {
  const rejection = await readJson(path.join(root, "execution", "rejection.json"));
  requireValid(
    ajv.getSchema("https://cairn.cards/protocol/release/rejected-profile-marker.schema.json"),
    rejection,
    "execution rejection marker"
  );
  exact([rejection.profile], manifest.excluded_profiles, "execution rejection profile differs from kernel exclusion");
  exact(rejection.reopen_requires, manifest.next_profile_requires, "execution reopen prerequisites differ");

  const historicalManifest = await readJson(path.join(root, "execution", "manifest.json"));
  const historicalPackage = await readJson(path.join(root, "execution", "package.json"));
  if (historicalManifest.profile !== rejection.profile) throw new Error("historical execution profile differs from rejection marker");
  exact(historicalManifest.conformance_claims, [], "historical execution artifact may not claim conformance");
  if (historicalPackage.private !== true) throw new Error("historical execution package must remain private");

  const packageDocument = await readJson(path.join(root, "package.json"));
  exact(packageDocument.files, EXPECTED_PACKAGE_FILES, "minimum kernel package file allowlist differs");
  if (packageDocument.files.some((entry) => entry === "execution" || entry.startsWith("execution/"))) {
    throw new Error("rejected execution tree is present in package allowlist");
  }

  const executionReadme = await readFile(path.join(root, "execution", "README.md"), "utf8");
  const rejectedReadme = await readFile(path.join(root, "execution", "REJECTED.md"), "utf8");
  if (!executionReadme.includes("Status: `rejected_research_only`") || !rejectedReadme.includes("`rejected_research_only`")) {
    throw new Error("execution rejection prose status differs");
  }
  if (/current candidate|remains blocked until the narrowed artifact/i.test(executionReadme)) {
    throw new Error("execution README retains an obsolete candidate gate");
  }

  const activeFiles = await sourceFiles(root);
  for (const { absolute, relative } of activeFiles) {
    if (!/\.(?:mjs|js|cjs)$/.test(relative)) continue;
    const source = await readFile(absolute, "utf8");
    if (/^\s*(?:import(?:\s+[^"'()]*?\s+from)?|export\s+[^"']*?\s+from|import\s*\()\s*["'](?:\.\.\/|\.\/)*execution(?:\/[^"']*)?["']/m.test(source)) {
      throw new Error(`active runtime reaches rejected execution source: ${relative}`);
    }
  }
}

export async function auditMinimumTrustKernel(root) {
  requireStrictJson(root);
  const manifest = await readJson(path.join(root, "minimum-trust-kernel.json"));
  const releaseSchemaDocuments = await releaseSchemas(root);
  const ajv = createAjv(releaseSchemaDocuments);
  requireValid(
    ajv.getSchema("https://cairn.cards/protocol/release/minimum-trust-kernel.schema.json"),
    manifest,
    "minimum trust kernel manifest"
  );

  const { bundle } = await buildBundle(root);
  const registry = bundle.operation_registry;
  const operationNames = registry.operations.map(({ name }) => name);
  const objectStoreMutations = registry.operations
    .filter(({ object_store_mutating }) => object_store_mutating)
    .map(({ name: operation, authority_effect }) => ({ operation, authority_effect }));
  const grantConsumers = registry.operations.filter(({ access_state_effects }) =>
    access_state_effects.includes("consume_grant_disclosure_budget"));

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
  exact(
    manifest.allowed_object_store_mutations,
    EXPECTED_MUTATIONS,
    "minimum kernel allowed object-store mutation boundary differs"
  );
  exact(
    objectStoreMutations,
    EXPECTED_MUTATIONS,
    "foundation object-store mutations exceed the minimum kernel boundary"
  );
  exact(
    manifest.operation_state_effects,
    expectedStateEffects(registry),
    "minimum kernel operation state effects differ"
  );
  for (const operation of registry.operations) {
    const consumesGrant = operation.access_state_effects.includes("consume_grant_disclosure_budget");
    if (consumesGrant !== operation.data_grant_required) {
      throw new Error(`${operation.name}: DataGrant requirement and disclosure-budget effect differ`);
    }
  }

  uniqueStrings(manifest.byo_prerequisites, "byo_prerequisites");
  exact(manifest.byo_prerequisites, REQUIRED_BYO_PREREQUISITES, "minimum kernel BYO prerequisites differ");
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
  await auditExecutionExclusion(root, manifest, ajv);

  return {
    manifest,
    bundleHash: bundle.bundle_hash,
    registryHash: canonicalHash(registry),
    operationCount: operationNames.length,
    objectStoreMutationCount: objectStoreMutations.length,
    grantConsumerCount: grantConsumers.length
  };
}

export async function buildMinimumTrustKernelRelease(root) {
  const audit = await auditMinimumTrustKernel(root);
  const foundationBundleBytes = await readFile(path.join(root, "dist", "cairn-protocol-bundle-v0.1.json"));
  const unsigned = {
    schema: "cairn.minimum_trust_kernel_release.v0.1",
    kernel_manifest: audit.manifest,
    foundation_bundle_hash: audit.bundleHash,
    operation_registry_hash: audit.registryHash,
    foundation_bundle_file_hash: rawSha256(foundationBundleBytes),
    source_commitments: await sourceCommitments(root)
  };
  const release = { ...unsigned, release_hash: canonicalHash(unsigned) };
  return {
    release,
    bytes: `${canonicalText(release)}\n`,
    audit
  };
}
