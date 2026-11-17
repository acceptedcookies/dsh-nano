import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadProfile } from './profile-registry.js'

const DEFAULT_PROFILES_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'profiles')

// Driver-side compatibility checks, reviewed for each repin. These are the
// upstream stage-dev-build outputs/imports, not locally patched upstream code.
export const KITESURF_RUNTIME_FILES = [
  'packages/core/pkg/kitesurf_core_bg.wasm',
  'packages/core/pkg/kitesurf_core.glue.js',
  'packages/renderer-core/pkg/renderer_core_bg.wasm',
  'packages/renderer-core/pkg/renderer_core.glue.js',
  'packages/dom-shim/dist/index.js',
  'packages/page-script/dist/index.js',
  'packages/page-renderer/dist/index.js',
  'packages/worker-script/dist/index.js',
  'packages/engine/public/rbi/scene_host.wasm',
]

function configError(message) {
  // Keep the existing route error contract; no new public error namespace.
  return Object.assign(new Error(`kitesurf: ${message}`), { status: 400 })
}

export function profilesRootFor(deps = {}) {
  return deps.profilesRoot ?? (deps.env || process.env).KITESURF_PROFILES ?? DEFAULT_PROFILES_ROOT
}

/** One recipe source for registry, prepare, resource reconciliation and image. */
export function kitesurfRecipe(deps = {}) {
  const dir = join(profilesRootFor(deps), 'kitesurf')
  let loaded
  try { loaded = loadProfile(dir) } catch (error) {
    throw configError(`cannot read profile at ${dir}: ${error.message}`)
  }
  if (!loaded.ready) throw configError(`invalid profile at ${dir}: ${loaded.errors.join(', ')}`)
  const profile = loaded.manifest
  const resources = profile.runtime?.isolation?.resources
  const cpus = Number(resources?.cpus)
  if (!(cpus > 0) || !resources?.memory) throw configError('profile runtime.isolation.resources is missing or invalid')
  return { profile, resources: { cpus, memory: String(resources.memory) } }
}

export function kitesurfImage(recipe, env = process.env) {
  const image = String(env.KITESURF_IMAGE || recipe.profile.build.image || '').trim()
  if (!/(?:@sha256:[0-9a-f]{64}|:[A-Za-z0-9_][A-Za-z0-9_.-]*)$/.test(image) || /:latest$/i.test(image)) {
    throw configError('set a pinned build.image in the profile (or an explicit pinned KITESURF_IMAGE)')
  }
  return image
}

export function kitesurfRuntimeRoot(recipe, deps = {}) {
  const env = deps.env || process.env
  const override = String(env.KITESURF_CHECKOUT || '').trim()
  const dshHome = env.DSH_HOME || join(deps.home || env.HOME || homedir(), '.dsh')
  const root = override || join(dshHome, 'artifacts', 'kitesurf', recipe.profile.build.checkout.ref, 'runtime')
  if (!isAbsolute(root) || /[,\r\n]/.test(root)) throw configError('runtime path must be absolute and contain no mount separators')
  return root
}

/** Fail before creating mounts or removing a working container. Never builds. */
export function assertKitesurfRuntime(recipe, deps = {}) {
  const root = kitesurfRuntimeRoot(recipe, deps)
  if (existsSync(join(root, '.git'))) throw configError(`runtime must be derived build artifacts, not a source checkout: ${root}`)
  // A consumption receipt proves which official ref was built; it is never
  // another executable recipe. An override must carry the same sibling receipt.
  const receiptPath = join(dirname(root), 'artifact.json')
  let receipt
  try { receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) } catch {
    throw configError(`built runtime receipt is missing or invalid at ${receiptPath}; build the profile pin before prepare`)
  }
  if (receipt?.ref !== recipe.profile.build.checkout.ref) {
    throw configError(`built runtime receipt ref does not match profile pin at ${receiptPath}; expected ${recipe.profile.build.checkout.ref}`)
  }
  const verify = recipe.profile.build.checkout.verify
  if (typeof verify !== 'string' || isAbsolute(verify) || verify.split(/[\\/]/).includes('..')) {
    throw configError('profile build.checkout.verify must be a relative runtime file')
  }
  const missing = [verify, ...KITESURF_RUNTIME_FILES].filter((file) => {
    try { const info = statSync(join(root, file)); return !info.isFile() || info.size === 0 } catch { return true }
  })
  try { if (!statSync(join(root, 'node_modules')).isDirectory()) missing.push('node_modules/') } catch { missing.push('node_modules/') }
  if (missing.length) {
    throw configError(`built runtime is missing or incomplete at ${root}; missing: ${missing.join(', ')}. Build the profile pin before prepare, or set KITESURF_CHECKOUT to derived build artifacts.`)
  }
  return root
}

export function kitesurfMounts(recipe, deps, stateDir) {
  const runtime = assertKitesurfRuntime(recipe, deps)
  mkdirSync(stateDir, { recursive: true })
  return [
    { arg: `type=virtiofs,source=${runtime},target=/opt/kitesurf,readonly` },
    { arg: 'type=tmpfs,target=/opt/kitesurf/packages/engine/.wrangler' },
    { arg: `type=virtiofs,source=${stateDir},target=/var/lib/kitesurf-state` },
  ]
}
