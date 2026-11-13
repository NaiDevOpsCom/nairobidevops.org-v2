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

let targetDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, "..");
let packageJsonPath = path.join(targetDir, "package.json");
let lockFilePath = path.join(targetDir, "package-lock.json");

const LOG_VALUE_MAX_LENGTH = 256;

/**
 * Make an externally sourced value safe to interpolate into a log line.
 *
 * Ranges printed by this script come from `package.json` and from `npm view`
 * responses, so they are untrusted input: a value carrying CR/LF or an ANSI
 * escape sequence could forge log entries, hide the real outcome, or inject
 * terminal escapes into the CI log.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeForLog(value) {
  if (value === null || value === undefined) return "<unset>";
  const text = String(value).replace(
    // eslint-disable-next-line no-control-regex -- stripping control chars is the point
    /[\u0000-\u001F\u007F-\u009F]/g,
    "",
  );
  if (text.length <= LOG_VALUE_MAX_LENGTH) return text;
  return `${text.slice(0, LOG_VALUE_MAX_LENGTH - 1)}…`;
}

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
      `Warning: failed to query ${sanitizeForLog(spec)}. Skipping. ${sanitizeForLog(error.message)}`,
    );
    return null;
  }
}

async function readJson(filePath) {
  const resolvedPath = path.resolve(filePath);
  // Validate against the directory currently being checked (the repo root by
  // default, or an explicit target passed to runForDir / process.argv[2]) so
  // the target-directory support actually works and cannot escape that root.
  const relativePath = path.relative(targetDir, resolvedPath);
  if (
    relativePath.startsWith(`..${path.sep}`) ||
    relativePath === ".." ||
    path.isAbsolute(relativePath)
  ) {
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

function isSubsetSafe(candidateRange, constraintRange) {
  try {
    return semver.subset(candidateRange, constraintRange);
  } catch {
    return false;
  }
}

function rangesNotCoveredBy(currentRange, dependencyRanges) {
  if (!currentRange) return [...dependencyRanges];
  return dependencyRanges.filter(
    (depRange) => !isSubsetSafe(currentRange, depRange),
  );
}

function computeFloorCandidate(dependencyRanges) {
  const minima = dependencyRanges
    .map((range) => getMinVersionFromRange(range))
    .filter((min) => min && min !== "0.0.0");
  const requiredMinimum = maxVersion(minima);
  return requiredMinimum ? `>=${requiredMinimum}` : null;
}

// A universal engine range constrains nothing, so it must never be reported as
// an incompatibility (and must never drag the composed candidate down to `*`).
// Semver normalises `*`, `x`, `>=0`, and `>=0.0.0` to `range === ""`, so
// comparing against the literal `"*"` misses almost every universal form.
function isUniversalRange(range) {
  try {
    return new semver.Range(range).range === "";
  } catch {
    return false;
  }
}

function comparatorSetTexts(range) {
  try {
    return new semver.Range(range).set.map((comparators) =>
      comparators.map((comparator) => comparator.value),
    );
  } catch {
    return null;
  }
}

function joinComparators(comparators) {
  return comparators.length === 0 ? "*" : comparators.join(" ");
}

/**
 * Reduce a comparator set to its tightest lower and upper bound. Semver keeps
 * every comparator it was given (`>=20 <23 >=22` stays three comparators), but
 * only the tightest bound of each direction actually constrains the range.
 * Returns null when the set cannot be reduced safely.
 * @param {string[]} comparators
 * @returns {string[]|null}
 */
function reduceComparators(comparators) {
  let lower = null;
  let upper = null;

  const raiseLower = (version, inclusive) => {
    if (!lower) {
      lower = { version, inclusive };
      return;
    }
    const comparison = semver.compare(version, lower.version);
    if (comparison > 0) lower = { version, inclusive };
    else if (comparison === 0 && !inclusive) lower.inclusive = false;
  };

  const lowerUpper = (version, inclusive) => {
    if (!upper) {
      upper = { version, inclusive };
      return;
    }
    const comparison = semver.compare(version, upper.version);
    if (comparison < 0) upper = { version, inclusive };
    else if (comparison === 0 && !inclusive) upper.inclusive = false;
  };

  for (const value of comparators) {
    const comparator = new semver.Comparator(value);
    // An `ANY` comparator (`*`) carries no version and constrains nothing.
    if (!comparator.value) continue;
    switch (comparator.operator) {
      case ">":
        raiseLower(comparator.semver, false);
        break;
      case ">=":
        raiseLower(comparator.semver, true);
        break;
      case "<":
        lowerUpper(comparator.semver, false);
        break;
      case "<=":
        lowerUpper(comparator.semver, true);
        break;
      case "":
      case "=":
      case "==":
      case "===":
        raiseLower(comparator.semver, true);
        lowerUpper(comparator.semver, true);
        break;
      default:
        return null;
    }
  }

  const reduced = [];
  if (lower) {
    reduced.push(`${lower.inclusive ? ">=" : ">"}${lower.version.version}`);
  }
  if (upper) {
    reduced.push(`${upper.inclusive ? "<=" : "<"}${upper.version.version}`);
  }
  if (reduced.length === 0) return null;

  try {
    new semver.Range(joinComparators(reduced));
  } catch {
    return null;
  }
  return reduced;
}

/**
 * Rewrite the canonical comparator pair `>=X <Y` back into the compact caret
 * or tilde form when it is exactly equivalent, so the range written into
 * package.json stays human readable instead of turning into raw comparators.
 * @param {string[]} comparators
 * @returns {string}
 */
function formatComparatorSet(comparators) {
  const text = joinComparators(comparators);
  if (comparators.length !== 2) return text;

  const [lowerComparator, upperComparator] = comparators;
  if (
    !lowerComparator.startsWith(">=") ||
    upperComparator.startsWith("<=") ||
    !upperComparator.startsWith("<")
  ) {
    return text;
  }

  const lower = semver.parse(lowerComparator.slice(2));
  const upper = semver.parse(upperComparator.slice(1));
  // `^`/`~` exclude prereleases of the next line via an `-0` upper bound; only
  // that exact shape is equivalent to the caret/tilde shorthand.
  if (
    !lower ||
    !upper ||
    upper.prerelease.length !== 1 ||
    upper.prerelease[0] !== 0
  ) {
    return text;
  }

  // The caret's upper bound only advances the major line for `^1.0.0` and up.
  // For 0.x releases caret advances the minor (`^0.1.0` is `<0.2.0-0`), so a
  // pair like `>=0.1.0 <1.0.0-0` must not be rewritten as `^0.1.0`.
  if (
    lower.major > 0 &&
    upper.major === lower.major + 1 &&
    upper.minor === 0 &&
    upper.patch === 0
  ) {
    return `^${lower.version}`;
  }
  if (
    upper.major === lower.major &&
    upper.minor === lower.minor + 1 &&
    upper.patch === 0
  ) {
    return `~${lower.version}`;
  }
  return text;
}

/**
 * Compose the intersection of several semver ranges (the set of Node versions
 * every range allows). Returns null when the ranges share no version, i.e.
 * when no safe candidate can be derived from them.
 *
 * @param {string[]} ranges
 * @returns {string|null}
 */
function composeIntersection(ranges) {
  // Every element is a comparator set (a conjunction); the outer array is a
  // union. Start from the universal range, then intersect with each range.
  let accumulator = [[]];

  for (const range of ranges) {
    const sets = comparatorSetTexts(range);
    if (!sets) return null;

    const merged = [];
    for (const current of accumulator) {
      for (const next of sets) {
        try {
          if (
            !semver.intersects(joinComparators(current), joinComparators(next))
          )
            continue;
        } catch {
          continue;
        }
        merged.push([...new Set([...current, ...next])]);
      }
    }
    accumulator = merged;
    if (accumulator.length === 0) return null;
  }

  // Canonicalise (sort + dedupe comparators) and drop duplicate branches.
  const branches = new Map();
  for (const comparators of accumulator) {
    const canonical = new semver.Range(joinComparators(comparators));
    if (canonical.set.length !== 1) continue;
    const original = canonical.set[0].map((comparator) => comparator.value);
    const originalText = joinComparators(original);
    const reduced = reduceComparators(original);
    // Only trust the reduction when it is provably equivalent; otherwise keep
    // the verbose but correct canonical comparators.
    const reducedText = reduced ? joinComparators(reduced) : null;
    const equivalent =
      reducedText !== null &&
      isSubsetSafe(reducedText, originalText) &&
      isSubsetSafe(originalText, reducedText);
    const text = equivalent ? reducedText : originalText;
    if (text === "*") continue;
    branches.set(text, equivalent ? reduced : original);
  }
  if (branches.size === 0) return null;

  // Keep only the widest branch when one branch contains another: the range is
  // a union, so a narrower branch adds nothing.
  const kept = [];
  for (const [range, comparators] of branches) {
    if (kept.some((entry) => isSubsetSafe(range, entry.range))) continue;
    for (let index = kept.length - 1; index >= 0; index -= 1) {
      if (isSubsetSafe(kept[index].range, range)) kept.splice(index, 1);
    }
    kept.push({ range, comparators });
  }

  kept.sort((left, right) => {
    const leftMin = getMinVersionFromRange(left.range);
    const rightMin = getMinVersionFromRange(right.range);
    if (!leftMin || !rightMin) return 0;
    return semver.compare(leftMin, rightMin);
  });

  const composed = kept
    .map((entry) => formatComparatorSet(entry.comparators))
    .join(" || ");
  return composed === "*" ? null : composed;
}

// A curated multi-line OR range (e.g. `^22.12.0 || ^24.0.0 || >=26.0.0`) is
// deliberate support policy (non-LTS Node lines excluded); a flat `>=` floor
// would silently re-admit those lines. The same applies to an explicit bounded
// range such as `>=20 <23`, which is one comparator set but still excludes
// Node 23+. Only a single-token range such as `>=20` or `^16.0.0` is safe to
// raise automatically.
function isSimpleFloor(range) {
  if (typeof range !== "string") return false;
  const trimmed = range.trim();
  // Whitespace marks a compound range (`>=20 <23`, `20 - 22`) and `||` marks
  // an OR range; neither may be flattened to a single `>=` floor.
  if (/\s/.test(trimmed) || trimmed.includes("||")) return false;
  try {
    return new semver.Range(trimmed).set.length === 1;
  } catch {
    return false;
  }
}

/**
 * Decide how the project's engines.node range relates to the Node ranges
 * its dependencies require.
 *
 * The project range must be a *subset* of every dependency range: every
 * Node version we allow must be one every dependency supports.
 *
 * The preferred answer is the exact intersection of the current range with
 * every dependency range. That is the largest safe subset, so it can never
 * widen the project's declared support (a curated `^22 || ^24 || >=26` range
 * keeps excluding Node 23/25), and it handles multi-line OR ranges that a
 * flat `>=` floor cannot express.
 *
 * @param {string|null} currentRange engines.node of the project
 * @param {string[]} dependencyRanges engines.node of every direct dependency
 * @returns {{status: "ok"|"bump"|"manual", candidate?: string, incompatible: string[]}}
 */
export function evaluateEngines(currentRange, dependencyRanges) {
  const constraints = dependencyRanges.filter(
    (range) => !isUniversalRange(range),
  );
  const incompatible = rangesNotCoveredBy(currentRange, constraints);
  if (currentRange && incompatible.length === 0) {
    return { status: "ok", incompatible };
  }

  const constraintRanges = currentRange
    ? [currentRange, ...constraints]
    : [...constraints];
  const intersection = composeIntersection(constraintRanges);
  if (intersection) {
    const supportedByDependencies = constraints.every((depRange) =>
      isSubsetSafe(intersection, depRange),
    );
    const staysWithinCurrent = currentRange
      ? isSubsetSafe(intersection, currentRange)
      : true;
    if (supportedByDependencies && staysWithinCurrent) {
      return { status: "bump", candidate: intersection, incompatible };
    }
  }

  // Fall back to a flat `>=` floor when no non-empty intersection exists,
  // e.g. the project range is disjoint from what its dependencies support.
  // That widens the project range, so it is only allowed for simple floors.
  const candidate = computeFloorCandidate(constraints);
  if (!candidate) {
    return { status: "manual", incompatible };
  }

  const candidateSupportedByDeps = constraints.every((depRange) =>
    isSubsetSafe(candidate, depRange),
  );
  const currentIsSimpleFloor = currentRange
    ? isSimpleFloor(currentRange)
    : true;
  if (!candidateSupportedByDeps || !currentIsSimpleFloor) {
    return { status: "manual", candidate, incompatible };
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
      `Current engines.node range (${sanitizeForLog(currentRange)}) is supported by every dependency. No update needed.`,
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
      `Updated package.json engines.node from ${sanitizeForLog(currentRange)} to ${sanitizeForLog(outcome.candidate)}`,
    );
    return;
  }

  console.error(
    [
      "engines.node cannot be updated automatically: dependency Node ranges",
      "do not reduce to a single `>=` floor, so a safe range must be composed by hand.",
      "",
      "Current engines.node:",
      `  ${sanitizeForLog(currentRange)}`,
      "",
      "Dependency ranges that constrain the project range:",
      ...outcome.incompatible.map((range) => `  ${sanitizeForLog(range)}`),
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

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  try {
    await run();
  } catch (error) {
    console.error("Node engine check failed:", error);
    process.exit(1);
  }
}
