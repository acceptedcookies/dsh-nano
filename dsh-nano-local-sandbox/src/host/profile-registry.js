import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { parseYaml } from './yaml.js'

const RECIPE_FILES = ['Dockerfile', 'entrypoint.sh', 'mcp-bridge.mjs']
const EXACT_VERSION = /^\d+\.\d+\.\d+$/
const SHA = /^sha256:[0-9a-f]{64}$/
const REF = /^[0-9a-f]{40}$/
const BANNED = ['latest', 'container machine', 'curl | sh']

const REQUIRED = [
  'id',
  'version',
  'platform',
  'backend',
  'scope',
  'build.base',
  'build.npmPrefix.wrangler',
  'build.npmPrefix.agent-browser',
  'build.checkout.ref',
  'build.checkout.verify',
  'build.digest',
  'runtime.user',
  'runtime.entrypoint',
  'runtime.services',
  'runtime.state',
  'runtime.isolation',
  'lifecycle.idleTimeoutMs',
  'lifecycle.maxInstances',
  'policyMapping.read-only',
  'policyMapping.workspace-write',
  'policyMapping.danger-full-access',
  'capabilities',
  'health',
]

export function recipeDigest(dir) {
  const hash = createHash('sha256')
  for (const name of RECIPE_FILES) hash.update(readFileSync(join(dir, name)))
  return `sha256:${hash.digest('hex')}`
}

export function recipeText(dir) {
  return RECIPE_FILES.map((name) => readFileSync(join(dir, name), 'utf8')).join('\n')
}

function get(obj, path) {
  return path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), obj)
}

export function validateManifest(manifest, { digest, text = '', checkoutRoot = null, profileDir = null } = {}) {
  const errors = []
  if (!manifest || typeof manifest !== 'object') return ['manifest']
  for (const path of REQUIRED) {
    const value = get(manifest, path)
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) errors.push(`missing:${path}`)
  }
  if (manifest.scope !== 'session' && manifest.scope !== 'shared') errors.push('scope')
  for (const name of ['wrangler', 'agent-browser']) {
    const version = manifest.build?.npmPrefix?.[name]
    if (typeof version !== 'string' || version.includes('^') || version.includes('~') || !EXACT_VERSION.test(version)) {
      errors.push(`version:${name}`)
    }
  }
  const ref = manifest.build?.checkout?.ref
  if (typeof ref !== 'string' || !REF.test(ref)) errors.push('checkout.ref')
  const claimed = manifest.build?.digest
  if (typeof claimed !== 'string' || !SHA.test(claimed) || (digest && claimed !== digest)) errors.push('digest')
  for (const token of BANNED) {
    if (text.includes(token)) errors.push(`banned:${token}`)
  }
  if (checkoutRoot) {
    const verify = manifest.build?.checkout?.verify
    if (typeof verify !== 'string' || verify.includes('..') || !existsSync(join(checkoutRoot, verify))) errors.push('verify')
  }
  if (profileDir && checkoutRoot) {
    const root = resolve(profileDir)
    const target = resolve(checkoutRoot)
    if (target.includes('..') || !target.startsWith(root + sep)) errors.push('checkout-path')
  }
  return errors
}

export function loadProfile(dir, options = {}) {
  const manifest = parseYaml(readFileSync(join(dir, 'profile.yaml'), 'utf8'))
  const digest = recipeDigest(dir)
  const text = recipeText(dir)
  const errors = validateManifest(manifest, { digest, text, ...options, profileDir: dir })
  return { manifest, errors, ready: errors.length === 0, digest }
}

/** ensure refuses a bad profile before any image build. */
export async function ensureReady(dir, backend, options = {}) {
  const loaded = loadProfile(dir, options)
  if (!loaded.ready) return { ok: false, status: 400, errors: loaded.errors, loaded }
  return { ok: true, status: 200, loaded }
}

export function listProfiles(root) {
  const out = []
  if (!existsSync(root)) return out
  for (const name of readdirSync(root)) {
    const dir = join(root, name)
    if (!existsSync(join(dir, 'profile.yaml'))) continue
    out.push({ id: name, ...loadProfile(dir) })
  }
  return out
}
