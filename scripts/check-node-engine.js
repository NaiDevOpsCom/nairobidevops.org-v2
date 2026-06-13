#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import semver from 'semver'

const execFileAsync = promisify(execFile)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageJsonPath = path.join(__dirname, '..', 'package.json')
const lockFilePath = path.join(__dirname, '..', 'package-lock.json')


function maxVersion(versions) {
  return versions.reduce((highest, next) => {
    if (!highest) return next
    try {
      return semver.gt(next, highest) ? next : highest
    } catch {
      return highest
    }
  }, null)
}

function getMinVersionFromRange(range) {
  if (!range) return null
  try {
    const min = semver.minVersion(range)
    return min ? min.version : null
  } catch {
    return null
  }
}

function getNodeEnginesRange(engines) {
  if (!engines) return null
  if (typeof engines === 'string') return engines
  return engines.node ?? null
}

async function npmViewEngines(packageName, versionSpec) {
  const spec = `${packageName}@${versionSpec}`
  try {
    const { stdout } = await execFileAsync('npm', ['view', spec, 'engines', '--json'], {
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    })
    const trimmed = stdout.trim()
    if (!trimmed || trimmed === 'undefined') return null
    try {
      return JSON.parse(trimmed)
    } catch {
      return trimmed
    }
  } catch (error) {
    console.warn(`Warning: failed to query ${spec}. Skipping. ${error.message}`)
    return null
  }
}

async function semverSatisfies(version, range) {
  if (!version || !range) return false
  try {
    return semver.satisfies(version, range)
  } catch {
    return false
  }
}

async function readJson(filePath) {
  const resolvedPath = path.resolve(filePath)
  const projectRoot = path.resolve(__dirname, '..')

  if (!resolvedPath.startsWith(projectRoot)) {
    throw new Error(`Unsafe file path detected: ${filePath}`)
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const content = await readFile(resolvedPath, 'utf8')
  return JSON.parse(content)
}

function gatherDependencyList(packageJson) {
  const dependencies = Object.keys(packageJson.dependencies ?? {})
  const devDependencies = Object.keys(packageJson.devDependencies ?? {})
  return [...new Set([...dependencies, ...devDependencies])].sort((left, right) => left.localeCompare(right))
}

function findPackageVersion(packages, name) {
  const rootDep = packages[`node_modules/${name}`]
  if (rootDep?.version) return rootDep.version

  for (const [key, pkg] of Object.entries(packages)) {
    if (!key.endsWith(`node_modules/${name}`) || !pkg?.version) continue

    const parts = key.split('node_modules')
    if (parts.length <= 2) {
      return pkg.version
    }
  }

  return null
}

async function resolveDependencyVersion(name, packageJson, lockfile) {
  if (lockfile.packages) {
    const packageVersion = findPackageVersion(lockfile.packages, name)
    if (packageVersion) return packageVersion
  }

  // Fallback to v2 lockfile format (uses flat dependencies object)
  const locked = lockfile.dependencies?.[name]?.version
  if (locked) return locked
  if (packageJson.dependencies?.[name]) return packageJson.dependencies[name]
  if (packageJson.devDependencies?.[name]) return packageJson.devDependencies[name]
  return null
}

async function collectRequiredNodeVersions() {
  const packageJson = await readJson(packageJsonPath)
  const lockfile = await readJson(lockFilePath)
  const dependencyNames = gatherDependencyList(packageJson)
  const queue = [...dependencyNames]

  const requiredVersions = []
  const concurrency = 6
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const name = queue.shift()
      if (!name) continue
      const versionSpec = await resolveDependencyVersion(name, packageJson, lockfile)
      if (!versionSpec) continue
      const engines = await npmViewEngines(name, versionSpec)
      const range = getNodeEnginesRange(engines)
      if (!range) continue
      const minVer = getMinVersionFromRange(range)
      if (!minVer || minVer === '0.0.0') continue
      requiredVersions.push(minVer)
    }
  })

  await Promise.all(workers)
  return requiredVersions
}

async function run() {
  const packageJson = await readJson(packageJsonPath)
  const currentRange = getNodeEnginesRange(packageJson.engines)
  const requiredVersions = await collectRequiredNodeVersions()

  if (requiredVersions.length === 0) {
    console.log('No dependency published Node engine requirement was detected. No update needed.')
    return
  }

  const requiredMinimum = maxVersion(requiredVersions)
  if (!requiredMinimum) {
    console.log('Unable to determine a required minimum Node.js version. No update made.')
    return
  }
  // Note: maxVersion here is correct - we want the highest minimum requirement across all dependencies

  if (currentRange && await semverSatisfies(requiredMinimum, currentRange)) {
    console.log(`Current engines.node range (${currentRange}) already supports Node ${requiredMinimum}. No update needed.`)
    return
  }

  const updatedRange = `>=${requiredMinimum}`
  packageJson.engines = {
    ...packageJson.engines,
    node: updatedRange,
  }

  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8')
  console.log(`Updated package.json engines.node from ${currentRange ?? '<unset>'} to ${updatedRange}`)
}

try {
  await run()
} catch (error) {
  console.error('Node engine check failed:', error)
  process.exit(1)
}
