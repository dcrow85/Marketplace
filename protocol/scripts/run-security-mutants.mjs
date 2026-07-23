import { spawnSync } from "node:child_process";
import { cpSync, lstatSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SECURITY_MUTANTS } from "../mutations/security-mutants.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function escapedPointerToken(token) {
  return token.replaceAll("~1", "/").replaceAll("~0", "~");
}

function applyJsonPointer(document, pointer, value) {
  const members = pointer.split("/").slice(1).map(escapedPointerToken);
  let cursor = document;
  for (const member of members.slice(0, -1)) {
    if (cursor === null || typeof cursor !== "object" || !(member in cursor)) {
      throw new Error(`stale JSON pointer ${pointer}`);
    }
    cursor = cursor[member];
  }
  const final = members.at(-1);
  if (cursor === null || typeof cursor !== "object" || !(final in cursor)) {
    throw new Error(`stale JSON pointer ${pointer}`);
  }
  cursor[final] = value;
}

function applyMutant(directory, mutant) {
  const target = path.join(directory, mutant.file);
  if (mutant.jsonPointer) {
    const document = JSON.parse(readFileSync(target, "utf8"));
    applyJsonPointer(document, mutant.jsonPointer, mutant.value);
    writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
    return;
  }
  const source = readFileSync(target, "utf8");
  const occurrences = source.split(mutant.search).length - 1;
  if (occurrences !== 1) throw new Error(`${mutant.id}: source anchor matched ${occurrences} times`);
  writeFileSync(target, source.replace(mutant.search, mutant.replace));
}

function run(command, args, cwd) {
  return spawnSync(command, args, { cwd, encoding: "utf8", timeout: 30_000 });
}

function combined(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function copyProtocol(destination) {
  cpSync(root, destination, {
    recursive: true,
    filter: (source) => !["node_modules", "dist"].includes(path.basename(source))
  });
  const modules = path.join(root, "node_modules");
  if (!lstatSync(modules).isDirectory()) throw new Error("node_modules is required; run npm install first");
  symlinkSync(modules, path.join(destination, "node_modules"), "dir");
}

const failures = [];
for (const mutant of SECURITY_MUTANTS) {
  const parent = mkdtempSync(path.join(os.tmpdir(), "cairn-mutant-"));
  const candidate = path.join(parent, "protocol");
  try {
    copyProtocol(candidate);
    applyMutant(candidate, mutant);
    const build = run("npm", ["run", "build"], candidate);
    const buildOutput = combined(build);
    if (mutant.expectedStage === "build") {
      if (build.status !== 0 && !/SyntaxError|Unexpected token/.test(buildOutput) && buildOutput.includes(mutant.expectedOutput)) {
        process.stdout.write(`KILLED ${mutant.id} at build\n`);
      } else {
        failures.push(`${mutant.id}: expected semantic build kill`);
      }
      continue;
    }
    if (mutant.expectedStage === "kernel") {
      if (build.status !== 0) {
        failures.push(`${mutant.id}: invalid kernel mutant; build failed\n${buildOutput}`);
        continue;
      }
      const kernel = run("node", ["scripts/check-minimum-kernel.mjs"], candidate);
      const kernelOutput = combined(kernel);
      if (
        kernel.status !== 0 &&
        !/SyntaxError|Unexpected token/.test(kernelOutput) &&
        kernelOutput.includes(mutant.expectedOutput)
      ) {
        process.stdout.write(`KILLED ${mutant.id} at kernel release check\n`);
      } else {
        failures.push(`${mutant.id}: expected minimum-kernel release kill\n${kernelOutput}`);
      }
      continue;
    }
    if (build.status !== 0) {
      failures.push(`${mutant.id}: invalid mutant; build failed\n${buildOutput}`);
      continue;
    }
    const testResult = run("node", [
      "--test",
      "--test-reporter=tap",
      `--test-name-pattern=^${mutant.test.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      mutant.testFile ?? "tests/foundation.test.mjs"
    ], candidate);
    const output = combined(testResult);
    const title = mutant.test.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const namedFailure = new RegExp(`not ok \\d+ - ${title}(?:\\n|$)`).test(output);
    if (testResult.status !== 0 && namedFailure && !/SyntaxError|Unexpected token/.test(output)) {
      process.stdout.write(`KILLED ${mutant.id} by ${mutant.test}\n`);
    } else {
      failures.push(`${mutant.id}: ${testResult.status === 0 ? "survived" : "invalid or wrong test failed"}\n${output}`);
    }
  } catch (error) {
    failures.push(`${mutant.id}: ${error.message}`);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
}

if (failures.length) {
  throw new Error(`security mutation controls failed:\n${failures.join("\n")}`);
}
process.stdout.write(`security mutation controls passed: ${SECURITY_MUTANTS.length}/${SECURITY_MUTANTS.length} mutants killed\n`);
