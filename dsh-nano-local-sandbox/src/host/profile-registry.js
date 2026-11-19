import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { parseYaml } from './yaml.js'

const SHA = /^sha256:[0-9a-f]{64}$/
const REF = /^[0-9a-f]{40}$/
const BANNED = ['latest', 'container machine', 'curl | sh']

/** Kernel-required manifest fields. Anything profile-specific is the driver's. */
const REQUIRED = [
  'id',
  'version',
  'platform',
  'backend',
  'scope',
  'driver',
  'build.base',
  'build.image',
  'build.recipe',
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
  'instance.name',
  'instance.ports.engine',
  'instance.ports.bridge',
  'instance.hostPorts.prod',
]

function recipeFilesOf(manifest) {
  const files = manifest?.build?.recipe
  return Array.isArray(files) ? files.filter((name) => typeof name === 'string' && name) : []
}

function safeFileName(name) {
  return typeof name === 'string' && name && !name.includes('..') && !/[/\\]/.test(name)
}

/**
 * Recipe digest over the canonical LF text of the declared recipe files.
 * `profile.yaml` and the driver sources are deliberately outside the recipe:
 * adding a driver module or a manifest field must not invalidate a built image.
 */
export function recipeDigest(dir, files = recipeFilesOf(parseYaml(readFileSync(join(dir, 'profile.yaml'), 'utf8')))) {
  const hash = createHash('sha256')
  for (const name of files) {
    hash.update(readFileSync(join(dir, name), 'utf8').replace(/\r\n/g, '\n'))
  }
  return `sha256:${hash.digest('hex')}`
}

export function recipeText(dir, files) {
  return files.map((name) => readFileSync(join(dir, name), 'utf8')).join('\n')
}

function get(obj, path) {
  return path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), obj)
}

export function validateManifest(manifest, { digest, text = '', checkoutRoot = null, profileDir = null, driver = null } = {}) {
  const errors = []
  if (!manifest || typeof manifest !== 'object') return ['manifest']
  for (const path of REQUIRED) {
    const value = get(manifest, path)
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) errors.push(`missing:${path}`)
  }
  if (manifest.scope !== 'session' && manifest.scope !== 'shared') errors.push('scope')

  const driverEntry = manifest.driver
  if (typeof driverEntry !== 'string' || !driverEntry.startsWith('./')) errors.push('driver')
  else if (profileDir) {
    const root = resolve(profileDir)
    const target = resolve(root, driverEntry)
    if (!target.startsWith(root + sep)) errors.push('driver-path')
    else if (!existsSync(target)) errors.push('driver-missing')
  }

  const files = recipeFilesOf(manifest)
  if (Array.isArray(manifest.build?.recipe) && files.length !== manifest.build.recipe.length) errors.push('build.recipe')
  for (const name of files) {
    if (!safeFileName(name)) errors.push(`build.recipe:${name}`)
    else if (profileDir && !existsSync(join(profileDir, name))) errors.push(`build.recipe-missing:${name}`)
  }

  const ref = manifest.build?.checkout?.ref
  if (typeof ref !== 'string' || !REF.test(ref)) errors.push('checkout.ref')
  const image = manifest.build?.image
  if (typeof image !== 'string' || !/(?:@sha256:[0-9a-f]{64}|:[A-Za-z0-9_][A-Za-z0-9_.-]*)$/.test(image) || /:latest$/i.test(image)) errors.push('build.image')
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
  // The driver owns its profile-specific fields and fails closed on them.
  if (driver && typeof driver.validateManifest === 'function') {
    try { errors.push(...(driver.validateManifest(manifest) || [])) } catch (error) { errors.push(`driver-validate:${error?.message || error}`) }
  }
  return errors
}

export function loadProfile(dir, options = {}) {
  const manifest = parseYaml(readFileSync(join(dir, 'profile.yaml'), 'utf8'))
  const files = recipeFilesOf(manifest).filter((name) => safeFileName(name) && existsSync(join(dir, name)))
  const digest = recipeDigest(dir, files)
  let text = ''
  try { text = recipeText(dir, files) } catch { /* a missing recipe file is reported as a digest/recipe error */ }
  const errors = validateManifest(manifest, { digest, text, ...options, profileDir: dir })
  return { manifest, errors, ready: errors.length === 0, digest }
}

/** ensure refuses a bad profile before any image build. */
export async function ensureReady(dir, backend, options = {}) {
  const loaded = loadProfile(dir, options)
  if (!loaded.ready) return { ok: false, status: 400, errors: loaded.errors, loaded }
  // The profile's own driver validates the fields the kernel cannot know
  // about; a build must not start on a profile the driver would refuse.
  if (!options.skipDriver) {
    const { loadProfileDriver } = await import('./profile-drivers.js')
    const withDriver = await loadProfileDriver(dir, options)
    if (!withDriver.ready) return { ok: false, status: 400, errors: withDriver.errors, loaded }
  }
  if (typeof backend?.ensureImage === 'function') {
    await backend.ensureImage({ tag: loaded.manifest.build.image, publicSpec: {} })
  }
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
