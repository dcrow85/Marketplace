import { spawnSync } from "node:child_process";
import { cpSync, lstatSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PHASE1_MUTANTS } from "../mutations/phase1-mutants.mjs";
import { canonicalText } from "../lib/core.mjs";

const executionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const protocolRoot = path.resolve(executionRoot, "..");
const repositoryRoot = path.resolve(protocolRoot, "..");

function applyMutant(candidateExecution, mutant) {
  const target = path.join(candidateExecution, mutant.file);
  if (mutant.dataMutation === "base-bundle-body") {
    const value = JSON.parse(readFileSync(target, "utf8"));
    value.manifest.bundle_id = "urn:uuid:ffffffff-ffff-4fff-8fff-ffffffffffff";
    writeFileSync(target, `${canonicalText(value)}\n`);
    return;
  }
  const source = readFileSync(target, "utf8");
  const occurrences = source.split(mutant.search).length - 1;
  if (occurrences !== 1) throw new Error(`${mutant.id}: source anchor matched ${occurrences} times`);
  writeFileSync(target, source.replace(mutant.search, mutant.replace));
  if (mutant.auxiliaryMutation === "connection-control-basis-fixture") {
    const testFile = path.join(candidateExecution, "tests", "phase1.test.mjs");
    const testSource = readFileSync(testFile, "utf8");
    const search = '  assert.deepEqual(validateConnectionEvent(receipt, before, after, context), []);';
    const replace = '  assert.deepEqual(validateConnectionEvent(receipt, before, after, context), []);\n  const unbacked = make("cairn.connection_state_event_receipt.v0.1", { ...receipt, principal_control_authorization_ref: null, principal_control_authorization_hash: null });\n  assert.ok(validateConnectionEvent(unbacked, before, after, context).includes("connection_control_basis_mismatch"));';
    writeFileSync(testFile, testSource.replace(search, replace));
  }
  if (mutant.auxiliaryMutation === "mandate-asset-fixture") {
    const testFile = path.join(candidateExecution, "tests", "phase1.test.mjs");
    const testSource = readFileSync(testFile, "utf8");
    const search = '  assert.deepEqual(validateMandate(validMandate(), context), []);';
    const replace = '  assert.deepEqual(validateMandate(validMandate(), context), []);\n  const crossAsset = validMandate();\n  crossAsset.constraints.financial.fee_limit.asset = "EUR";\n  const crossAssetBound = bindObjectHash(crossAsset, schemasByObjectId.get(crossAsset.schema));\n  assert.ok(validateMandate(crossAssetBound, context).includes("mandate_financial_asset_mismatch"));';
    writeFileSync(testFile, testSource.replace(search, replace));
  }
  if (mutant.auxiliaryMutation === "local-core-byte") {
    const coreFile = path.join(candidateExecution, "lib", "core.mjs");
    writeFileSync(coreFile, `${readFileSync(coreFile, "utf8")}\n// deliberate local-core drift\n`);
  }
  if (mutant.auxiliaryMutation === "transitive-lock-version") {
    const lockFile = path.join(candidateExecution, "package-lock.json");
    const lock = JSON.parse(readFileSync(lockFile, "utf8"));
    lock.packages["node_modules/fast-uri"].version = "0.0.0";
    writeFileSync(lockFile, `${canonicalText(lock)}\n`);
  }
}

function run(command, args, cwd) {
  return spawnSync(command, args, { cwd, encoding: "utf8", timeout: 30_000 });
}

function output(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

const requestedIds = new Set((process.env.CAIRN_MUTANT_IDS ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean));
const selectedMutants = requestedIds.size === 0
  ? PHASE1_MUTANTS
  : PHASE1_MUTANTS.filter(({ id }) => requestedIds.has(id));
if (selectedMutants.length !== (requestedIds.size || PHASE1_MUTANTS.length)) {
  const known = new Set(PHASE1_MUTANTS.map(({ id }) => id));
  const unknown = [...requestedIds].filter((id) => !known.has(id));
  throw new Error(`unknown Phase 1 mutant ids: ${unknown.join(",")}`);
}

const failures = [];
for (const mutant of selectedMutants) {
  const parent = mkdtempSync(path.join(os.tmpdir(), "cairn-execution-mutant-"));
  const candidateRepository = path.join(parent, "marketplace-main");
  const candidateProtocol = path.join(candidateRepository, "protocol");
  const candidateExecution = path.join(candidateProtocol, "execution");
  try {
    cpSync(protocolRoot, candidateProtocol, {
      recursive: true,
      filter: (source) => path.basename(source) !== "node_modules" && source !== path.join(protocolRoot, "execution", "dist")
    });
    if (!lstatSync(path.join(executionRoot, "node_modules")).isDirectory()) {
      throw new Error("protocol/execution/node_modules is required");
    }
    symlinkSync(path.join(executionRoot, "node_modules"), path.join(candidateExecution, "node_modules"), "dir");
    cpSync(
      path.join(repositoryRoot, "Protocol_Agent_Execution_Change_Spec_v0.1.md"),
      path.join(candidateRepository, "Protocol_Agent_Execution_Change_Spec_v0.1.md")
    );
    applyMutant(candidateExecution, mutant);
    const build = run("npm", ["run", "build"], candidateExecution);
    const buildOutput = output(build);
    if (mutant.expectedStage === "build") {
      if (build.status !== 0 && buildOutput.includes(mutant.expectedOutput) && !/SyntaxError|Unexpected token/.test(buildOutput)) {
        process.stdout.write(`KILLED ${mutant.id} at build\n`);
      } else failures.push(`${mutant.id}: expected semantic build kill\n${buildOutput}`);
      continue;
    }
    if (build.status !== 0) {
      failures.push(`${mutant.id}: invalid mutant; build failed\n${buildOutput}`);
      continue;
    }
    const escaped = mutant.test.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const result = run("node", ["--test", "--test-reporter=tap", `--test-name-pattern=^${escaped}$`, "tests/phase1.test.mjs"], candidateExecution);
    const resultOutput = output(result);
    const namedFailure = new RegExp(`not ok \\d+ - ${escaped}(?:\\n|$)`).test(resultOutput);
    if (result.status !== 0 && namedFailure && !/SyntaxError|Unexpected token/.test(resultOutput)) {
      process.stdout.write(`KILLED ${mutant.id} by ${mutant.test}\n`);
    } else failures.push(`${mutant.id}: ${result.status === 0 ? "survived" : "invalid or wrong test failed"}\n${resultOutput}`);
  } catch (error) {
    failures.push(`${mutant.id}: ${error.message}`);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
}

if (failures.length) throw new Error(`Phase 1 mutation controls failed:\n${failures.join("\n")}`);
process.stdout.write(`Phase 1 mutation controls passed: ${selectedMutants.length}/${selectedMutants.length} mutants killed\n`);
