import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowedTopLevel = new Set([
  "README.md",
  "docs",
  "dist",
  "fixtures",
  "lib",
  "manifest.json",
  "minimum-trust-kernel.json",
  "mutations",
  "npm-shrinkwrap.json",
  "operations",
  "package.json",
  "reference-service",
  "release",
  "schemas",
  "scripts",
  "tests",
  "vectors"
]);

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", timeout: 120_000 });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

function sha256(pathname) {
  return createHash("sha256").update(readFileSync(pathname)).digest("hex");
}

function pack(directory, destination) {
  const output = run("npm", ["pack", "--json", "--pack-destination", destination], directory);
  const report = JSON.parse(output)[0];
  const paths = report.files.map(({ path: pathname }) => pathname);
  const unexpected = paths.filter((pathname) => !allowedTopLevel.has(pathname.split("/")[0]));
  if (unexpected.length) throw new Error(`packed package contains unexpected files: ${unexpected.join(", ")}`);
  const transient = paths.filter((pathname) =>
    pathname.split("/").includes("__pycache__") || /\.py[co]$/.test(pathname)
  );
  if (transient.length) throw new Error(`packed package contains transient compiler files: ${transient.join(", ")}`);
  if (paths.some((pathname) => pathname === "execution" || pathname.startsWith("execution/"))) {
    throw new Error("packed package contains rejected execution implementation");
  }
  if (!paths.includes("npm-shrinkwrap.json")) throw new Error("packed package omits npm-shrinkwrap.json");
  for (const required of ["package.json", "minimum-trust-kernel.json", "dist/cairn-minimum-trust-kernel-v0.1.json"]) {
    if (!paths.includes(required)) throw new Error(`packed package omits ${required}`);
  }
  return { report, pathname: path.join(destination, report.filename) };
}

const workspace = mkdtempSync(path.join(os.tmpdir(), "cairn-packed-kernel-"));
try {
  const firstDirectory = path.join(workspace, "first");
  const secondDirectory = path.join(workspace, "second");
  const extracted = path.join(workspace, "extracted");
  run("mkdir", ["-p", firstDirectory, secondDirectory, extracted], workspace);
  const first = pack(root, firstDirectory);
  run("tar", ["-xzf", first.pathname, "-C", extracted], workspace);
  const packageRoot = path.join(extracted, "package");
  const foundationBefore = readFileSync(path.join(packageRoot, "dist", "cairn-protocol-bundle-v0.1.json"));
  const kernelBefore = readFileSync(path.join(packageRoot, "dist", "cairn-minimum-trust-kernel-v0.1.json"));
  run("npm", ["ci", "--ignore-scripts"], packageRoot);
  run("npm", ["test"], packageRoot);
  run("npm", ["run", "build"], packageRoot);
  const foundationAfter = readFileSync(path.join(packageRoot, "dist", "cairn-protocol-bundle-v0.1.json"));
  const kernelAfter = readFileSync(path.join(packageRoot, "dist", "cairn-minimum-trust-kernel-v0.1.json"));
  if (!foundationBefore.equals(foundationAfter)) throw new Error("packed foundation bundle does not rebuild byte-identically");
  if (!kernelBefore.equals(kernelAfter)) throw new Error("packed kernel release does not rebuild byte-identically");
  const second = pack(packageRoot, secondDirectory);
  if (sha256(first.pathname) !== sha256(second.pathname)) {
    throw new Error("pack/build/repack did not converge to identical package bytes");
  }
  console.log(
    `packed package check passed: ${first.report.files.length} files, ` +
    `sha-256:${sha256(first.pathname)}, rejected execution files 0`
  );
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
