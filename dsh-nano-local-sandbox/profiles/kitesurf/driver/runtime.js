import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'

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

const EXACT_VERSION = /^\d+\.\d+\.\d+$/

function configError(message) {
  // Keep the existing route error contract; no new public error namespace.
  return Object.assign(new Error(`kitesurf: ${message}`), { status: 400 })
}

/** Profile-specific required fields the neutral kernel does not know about. */
export function validateManifest(manifest) {
  const errors = []
  const prefix = manifest?.build?.npmPrefix
  if (!prefix || typeof prefix !== 'object' || Array.isArray(prefix) || Object.keys(prefix).length === 0) errors.push('missing:build.npmPrefix')
  for (const [name, version] of Object.entries(prefix || {})) {
    if (typeof version !== 'string' || version.includes('^') || version.includes('~') || !EXACT_VERSION.test(version)) errors.push(`version:${name}`)
  }
  const verify = manifest?.build?.checkout?.verify
  if (typeof verify !== 'string' || isAbsolute(verify) || verify.split(/[\\/]/).includes('..')) errors.push('checkout.verify')
  return errors
}

/** Build args are a property of this profile's Dockerfile, not of the kernel. */
export function buildArgs(manifest) {
  return [`KITESURF_BASE_IMAGE=${manifest.build.base}`]
}

export function image(manifest) {
  const tag = String(manifest?.build?.image || '').trim()
  if (!/(?:@sha256:[0-9a-f]{64}|:[A-Za-z0-9_][A-Za-z0-9_.-]*)$/.test(tag) || /:latest$/i.test(tag)) {
    throw configError('set a pinned build.image in the profile')
  }
  return tag
}

export function runtimeRoot(manifest, deps = {}) {
  if (deps.runtimeRoot) return resolve(deps.runtimeRoot)
  const env = deps.env || process.env
  const dshHome = env.DSH_HOME || join(deps.home || env.HOME || homedir(), '.dsh')
  const root = join(dshHome, 'artifacts', 'kitesurf', manifest.build.checkout.ref, 'runtime')
  if (!isAbsolute(root) || /[,\r\n]/.test(root)) throw configError('runtime path must be absolute and contain no mount separators')
  return root
}

/** Fail before creating mounts or removing a working container. Never builds. */
export function assertRuntime(manifest, deps = {}) {
  const root = runtimeRoot(manifest, deps)
  if (existsSync(join(root, '.git'))) throw configError(`runtime must be derived build artifacts, not a source checkout: ${root}`)
  // A consumption receipt proves which official ref was built; it is never
  // another executable recipe.
  const receiptPath = join(dirname(root), 'artifact.json')
  let receipt
  try { receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) } catch {
    throw configError(`built runtime receipt is missing or invalid at ${receiptPath}; build the profile pin before prepare`)
  }
  if (receipt?.ref !== manifest.build.checkout.ref) {
    throw configError(`built runtime receipt ref does not match profile pin at ${receiptPath}; expected ${manifest.build.checkout.ref}`)
  }
  const verify = manifest.build.checkout.verify
  if (typeof verify !== 'string' || isAbsolute(verify) || verify.split(/[\\/]/).includes('..')) {
    throw configError('profile build.checkout.verify must be a relative runtime file')
  }
  const missing = [verify, ...KITESURF_RUNTIME_FILES].filter((file) => {
    try { const info = statSync(join(root, file)); return !info.isFile() || info.size === 0 } catch { return true }
  })
  try { if (!statSync(join(root, 'node_modules')).isDirectory()) missing.push('node_modules/') } catch { missing.push('node_modules/') }
  if (missing.length) {
    throw configError(`built runtime is missing or incomplete at ${root}; missing: ${missing.join(', ')}. Build the profile pin before prepare`)
  }
  return root
}

export function mounts(manifest, deps, stateDir) {
  const runtime = assertRuntime(manifest, deps)
  mkdirSync(stateDir, { recursive: true })
  return [
    { arg: `type=virtiofs,source=${runtime},target=/opt/kitesurf,readonly` },
    { arg: 'type=tmpfs,target=/opt/kitesurf/packages/engine/.wrangler' },
    { arg: `type=virtiofs,source=${stateDir},target=/var/lib/kitesurf-state` },
  ]
}
