import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { listProfiles, loadProfile } from './profile-registry.js'
import { errorCode, registerDriverErrors } from './error-catalog.js'
import { CDP_TIMEOUTS, withPage } from './cdp-elements.js'

const DEFAULT_PROFILES_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'profiles')
const BROWSER_DRIVER = 'cdp'

export function profilesRootFor(deps = {}) {
  return deps.profilesRoot ?? (deps.env || process.env).DNLS_PROFILES ?? DEFAULT_PROFILES_ROOT
}

/** Resource envelope from the profile manifest — the only source of container size. */
export function resourcesOf(manifest) {
  const resources = manifest?.runtime?.isolation?.resources
  const cpus = Number(resources?.cpus)
  if (!(cpus > 0) || !resources?.memory) {
    throw Object.assign(new Error('profile runtime.isolation.resources is missing or invalid'), { status: 400 })
  }
  return { cpus, memory: String(resources.memory) }
}

/** The profile that owns the browser routes: the first one declaring the cdp driver. */
function browserProfile(root) {
  const candidates = listProfiles(root)
    .filter((row) => Array.isArray(row.manifest?.capabilities?.drivers) && row.manifest.capabilities.drivers.includes(BROWSER_DRIVER))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
  return candidates[0] ?? null
}

async function importDriver(profileDir, manifest) {
  const root = resolve(profileDir)
  const entry = resolve(root, manifest.driver)
  if (!entry.startsWith(root + sep) || !existsSync(entry)) {
    return { driver: null, errors: existsSync(entry) ? ['driver-path'] : ['driver-missing'] }
  }
  let mod
  try { mod = await import(pathToFileURL(entry).href) } catch (error) {
    return { driver: null, errors: [`driver-load:${error?.message || error}`] }
  }
  const exported = mod?.default ?? mod?.driver ?? null
  // A driver is a factory over the kernel services it may use; a bare object is
  // accepted for drivers that need none of them.
  let driver = exported
  if (typeof exported === 'function') {
    try { driver = exported({ errorCode, cdp: { withPage, timeouts: CDP_TIMEOUTS } }) } catch (error) {
      return { driver: null, errors: [`driver-init:${error?.message || error}`] }
    }
  }
  if (!driver || typeof driver !== 'object' || typeof driver.image !== 'function') {
    return { driver: null, errors: ['driver-surface'] }
  }
  const errors = typeof driver.validateManifest === 'function' ? (driver.validateManifest(manifest) || []) : []
  if (driver.id && driver.id !== manifest.id) errors.push(`driver-id:${driver.id}`)
  return { driver, errors }
}

/**
 * Resolve the active browser profile + its driver. Cached per profiles root:
 * a driver is code, and re-importing it per request would only re-run its
 * module init.
 */
export async function loadProfileDriver(profileDir, options = {}) {
  const loaded = loadProfile(profileDir, options)
  if (!loaded.ready) return { ...loaded, driver: null }
  const imported = await importDriver(profileDir, loaded.manifest)
  const errors = [...loaded.errors, ...imported.errors]
  return { ...loaded, driver: imported.driver, errors, ready: errors.length === 0 }
}

const cache = new Map()

export function profileContext(deps = {}) {
  const root = profilesRootFor(deps)
  const cached = cache.get(root)
  if (cached) return cached
  const flight = (async () => {
    const found = browserProfile(root)
    if (!found) {
      throw Object.assign(new Error(`no profile with the ${BROWSER_DRIVER} driver under ${root}`), { status: 400 })
    }
    const dir = join(root, found.id)
    const loaded = await loadProfileDriver(dir)
    if (!loaded.ready || !loaded.driver) {
      throw Object.assign(new Error(`invalid profile at ${dir}: ${loaded.errors.join(', ')}`), { status: 400 })
    }
    if (loaded.driver.errors) registerDriverErrors(loaded.driver.errors)
    return {
      id: found.id,
      dir,
      profile: loaded.manifest,
      driver: loaded.driver,
      digest: loaded.digest,
      resources: resourcesOf(loaded.manifest),
    }
  })()
  cache.set(root, flight)
  // A failed load must not pin the failure forever (a fixture dir can be fixed
  // between calls); a successful one is immutable code.
  flight.catch(() => cache.delete(root))
  return flight
}

/** Drop cached loads — tests build profiles in fresh temp dirs. */
export function resetProfileCache() {
  cache.clear()
}

const ENV_SLOTS = { prod: 0, dev: 1, desktop: 2 }
function envSlot(tag) {
  return ENV_SLOTS[tag] ?? ((tag.charCodeAt(0) % 3) + 1)
}

/**
 * One host owns one environment container per profile. The tag comes from
 * `DNLS_ENV`, else the DSH_HOME suffix; the name prefix and the per-env host
 * port pairs are declared by the profile's `instance` section.
 */
export function envTag(env = process.env) {
  const explicit = String(env.DNLS_ENV || '').trim().toLowerCase()
  if (explicit && /^[a-z][a-z0-9-]{0,15}$/.test(explicit)) return explicit
  const home = String(env.DSH_HOME || '')
  if (/\.dsh-dev(\/|$)/.test(home)) return 'dev'
  if (/\.dsh-desktop(\/|$)/.test(home)) return 'desktop'
  return 'prod'
}

export function containerNameFor(profile, session, env = process.env) {
  if (typeof session?.containerName === 'string' && session.containerName) return session.containerName
  const base = String(profile?.instance?.name || profile?.id || 'sandbox')
  const tag = envTag(env)
  return tag === 'prod' ? base : `${base}-${tag}`
}

export function envHostPorts(profile, env = process.env) {
  const layout = profile?.instance ?? {}
  const prod = layout.hostPorts?.prod ?? {}
  const tag = envTag(env)
  const declared = layout.hostPorts?.[tag]
  const slot = ENV_SLOTS[tag] ?? envSlot(tag)
  return {
    engineHostPort: Number(declared?.engine) || Number(prod.engine) + slot * 2,
    bridgeHostPort: Number(declared?.bridge) || Number(prod.bridge) + slot * 2,
    engineContainerPort: Number(layout.ports?.engine) || 0,
    bridgeContainerPort: Number(layout.ports?.bridge) || 0,
  }
}

/** Root under which every per-profile state volume lives. */
export function stateRootFor(deps = {}) {
  const env = deps.env || process.env
  const explicit = String(env.DNLS_STATE_ROOT || '').trim()
  if (explicit) return explicit
  const home = env.DSH_HOME || join(deps.home || env.HOME || homedir(), '.dsh')
  return join(home, 'nano-local-sandbox', 'state')
}

/** Per-instance state volume: <root>/<profileId>/<instanceKey>. */
export function stateDirFor(deps, profile, session) {
  return join(stateRootFor(deps), String(profile?.id || 'profile'), containerNameFor(profile, session, deps.env || process.env))
}
