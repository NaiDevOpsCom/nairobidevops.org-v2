#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import semver from "semver";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let targetDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, "..");
let packageJsonPath = path.join(targetDir, "package.json");
let lockFilePath = path.join(targetDir, "package-lock.json");

function maxVersion(versions) {
  return versions.reduce((highest, next) => {
    if (!highest) return next;
    try {
      return semver.gt(next, highest) ? next : highest;
    } catch {
      return highest;
    }
  }, null);
}

function getMinVersionFromRange(range) {
  if (!range) return null;
  try {
    const min = semver.minVersion(range);
    return min ? min.version : null;
  } catch {
    return null;
  }
}

/**
 * Extract the `node` engine range from an `npm view <pkg> engines --json`
 * response, which may be a bare string, an object, or (npm >= 12) an array
 * of objects. Returns null when no node range is present.
 * @param {string|object|Array<{node?: string}>|undefined} engines
 * @returns {string|null}
 */
export function enginesNodeFromNpmView(engines) {
  if (!engines) return null;
  if (typeof engines === "string") return engines;
  if (Array.isArray(engines)) {
    for (const entry of engines) {
      if (entry && typeof entry === "object" && entry.node) return entry.node;
    }
    return null;
  }
  return engines.node ?? null;
}

async function npmViewEngines(packageName, versionSpec) {
  const spec = `${packageName}@${versionSpec}`;
  try {
    const { stdout } = await execFileAsync(
      "npm",
      ["view", spec, "engines", "--json"],
      {
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    const trimmed = stdout.trim();
    if (!trimmed || trimmed === "undefined") return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  } catch (error) {
    console.warn(
      `Warning: failed to query ${spec}. Skipping. ${error.message}`,
    );
    return null;
  }
}

async function readJson(filePath) {
  const resolvedPath = path.resolve(filePath);
  const projectRoot = path.resolve(__dirname, "..");

  if (!resolvedPath.startsWith(projectRoot)) {
    throw new Error(`Unsafe file path detected: ${filePath}`);
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const content = await readFile(resolvedPath, "utf8");
  return JSON.parse(content);
}

function gatherDependencyList(packageJson) {
  const dependencies = Object.keys(packageJson.dependencies ?? {});
  const devDependencies = Object.keys(packageJson.devDependencies ?? {});
  return [...new Set([...dependencies, ...devDependencies])].sort(
    (left, right) => left.localeCompare(right),
  );
}

function findPackageVersion(packages, name) {
  const rootDep = packages[`node_modules/${name}`];
  if (rootDep?.version) return rootDep.version;

  for (const [key, pkg] of Object.entries(packages)) {
    if (!key.endsWith(`node_modules/${name}`) || !pkg?.version) continue;

    const parts = key.split("node_modules");
    if (parts.length <= 2) {
      return pkg.version;
    }
  }

  return null;
}

async function resolveDependencyVersion(name, packageJson, lockfile) {
  if (lockfile.packages) {
    const packageVersion = findPackageVersion(lockfile.packages, name);
    if (packageVersion) return packageVersion;
  }

  // Fallback to v2 lockfile format (uses flat dependencies object)
  const locked = lockfile.dependencies?.[name]?.version;
  if (locked) return locked;
  if (packageJson.dependencies?.[name]) return packageJson.dependencies[name];
  if (packageJson.devDependencies?.[name])
    return packageJson.devDependencies[name];
  return null;
}

async function collectRequiredNodeVersions() {
  const packageJson = await readJson(packageJsonPath);
  const lockfile = await readJson(lockFilePath);
  const dependencyNames = gatherDependencyList(packageJson);
  const queue = [...dependencyNames];

  const requiredRanges = [];
  const concurrency = 6;
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const name = queue.shift();
      if (!name) continue;
      const versionSpec = await resolveDependencyVersion(
        name,
        packageJson,
        lockfile,
      );
      if (!versionSpec) continue;
      const engines = await npmViewEngines(name, versionSpec);
      const range = enginesNodeFromNpmView(engines);
      if (!range) continue;
      requiredRanges.push(range);
    }
  });

  await Promise.all(workers);
  return requiredRanges;
}

/**
 * Decide how the project's engines.node range relates to the Node ranges
 * its dependencies require.
 *
 * The project range must be a *subset* of every dependency range: every
 * Node version we allow must be one every dependency supports.
 *
 * @param {string|null} currentRange engines.node of the project
 * @param {string[]} dependencyRanges engines.node of every direct dependency
 * @returns {{status: "ok"|"bump"|"manual", candidate?: string, incompatible: string[]}}
 */
export function evaluateEngines(currentRange, dependencyRanges) {
  const incompatible = [];
  if (currentRange) {
    for (const depRange of dependencyRanges) {
      let isSubset = false;
      try {
        isSubset = semver.subset(currentRange, depRange);
      } catch {
        isSubset = false;
      }
      if (!isSubset) incompatible.push(depRange);
    }
    if (incompatible.length === 0) {
      return { status: "ok", incompatible };
    }
  }

  const minima = dependencyRanges
    .map((range) => getMinVersionFromRange(range))
    .filter((min) => min && min !== "0.0.0");
  const requiredMinimum = maxVersion(minima);
  if (!requiredMinimum) {
    return { status: "manual", incompatible };
  }

  const candidate = `>=${requiredMinimum}`;
  for (const depRange of dependencyRanges) {
    let candidateIsSubset = false;
    try {
      candidateIsSubset = semver.subset(candidate, depRange);
    } catch {
      candidateIsSubset = false;
    }
    if (!candidateIsSubset) {
      return { status: "manual", candidate, incompatible };
    }
  }
  return { status: "bump", candidate, incompatible };
}

async function run() {
  const packageJson = await readJson(packageJsonPath);
  const currentRange = enginesNodeFromNpmView(packageJson.engines);
  const requiredRanges = await collectRequiredNodeVersions();

  if (requiredRanges.length === 0) {
    console.log(
      "No dependency published Node engine requirement was detected. No update needed.",
    );
    return;
  }

  const outcome = evaluateEngines(currentRange, requiredRanges);

  if (outcome.status === "ok") {
    console.log(
      `Current engines.node range (${currentRange}) is supported by every dependency. No update needed.`,
    );
    return;
  }

  if (outcome.status === "bump") {
    packageJson.engines = {
      ...packageJson.engines,
      node: outcome.candidate,
    };

    await writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + "\n",
      "utf8",
    );
    console.log(
      `Updated package.json engines.node from ${currentRange ?? "<unset>"} to ${outcome.candidate}`,
    );
    return;
  }

  console.error(
    [
      "engines.node cannot be updated automatically: dependency Node ranges",
      "do not reduce to a single `>=` floor, so a safe range must be composed by hand.",
      "",
      "Current engines.node:",
      `  ${currentRange ?? "<unset>"}`,
      "",
      "Dependency ranges that constrain the project range:",
      ...outcome.incompatible.map((range) => `  ${range}`),
      "",
      "Update engines.node in package.json to a range that is a subset of every range above.",
    ].join("\n"),
  );
  process.exitCode = 1;
}

export async function runForDir(dir) {
  targetDir = path.resolve(dir);
  packageJsonPath = path.join(targetDir, "package.json");
  lockFilePath = path.join(targetDir, "package-lock.json");
  await run();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    await run();
  } catch (error) {
    console.error("Node engine check failed:", error);
    process.exit(1);
  }
}
