/**
 * Trusted managed profile source (P6). One profile descriptor per
 * `{profileId,envId}` — the ONLY place untrusted callers' objects get a
 * create spec, a port plan, a cwd allowlist or a resource bound. Nothing
 * here reads request params for those fields; the plan comes from the
 * loaded driver manifest plus the env's declared pool, and every
 * verification step consumes live inspect evidence, never argv echo.
 */
import { lstatSync } from 'node:fs'
import { dirname, isAbsolute, join, normalize } from 'node:path'
import { loadProfileDriver, profilesRootFor, envTag, resourcesOf } from './profile-drivers.js'

/** A trusted-config boundary violation — never a caller-facing catalog row. */
const configError = (message, cause) => {
  const error = new Error(`invalid managed configuration: ${message}`)
  error.errorId = 'sandbox.params.configuration'
  error.status = 400
  if (cause !== undefined) error.cause = cause
  return error
}

/** Trusted deployed port pools — disjoint per env, outside the legacy
 * 8798-8803 fixed reservations. Unknown envs fail closed. */
const ENV_PORT_POOLS = Object.freeze({
  prod: [8900, 8939],
  dev: [8940, 8979],
  desktop: [8980, 8999],
})

const SERVICE_KEYS = ['id', 'port', 'command', 'protocol', 'cwd', 'role']
const PROTO = new Set(['tcp', 'udp'])
const LOOPBACK = new Set(['127.0.0.1', '::1'])

function serviceDecl(manifest) {
  const list = manifest?.runtime?.services
  if (!Array.isArray(list) || list.length === 0) throw configError('profile declares no services')
  const seen = new Set()
  return list.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw configError('service entry is not an object')
    for (const key of Object.keys(entry)) if (!SERVICE_KEYS.includes(key)) throw configError(`service key not supported: ${key}`)
    for (const key of ['id', 'port', 'command', 'protocol', 'cwd', 'role']) {
      if (!Object.hasOwn(entry, key)) throw configError(`service missing ${key}`)
    }
    if (typeof entry.id !== 'string' || !entry.id || seen.has(entry.id)) throw configError(`service id invalid or duplicate: ${entry.id}`)
    seen.add(entry.id)
    if (!Number.isInteger(entry.port) || entry.port < 1 || entry.port > 65535) throw configError(`service port out of range: ${entry.id}`)
    if (!PROTO.has(entry.protocol)) throw configError(`service protocol is not tcp|udp: ${entry.id}`)
    // cwd is the guest path the service is allowed to run from — the only
    // directory a caller may select, never arbitrary host paths.
    if (typeof entry.cwd !== 'string' || !entry.cwd.startsWith('/') || entry.cwd.includes('..')) {
      throw configError(`service cwd is not a bounded guest path: ${entry.id}`)
    }
    if (typeof entry.role !== 'string' || !entry.role) throw configError(`service evidence role missing: ${entry.id}`)
    return {
      id: entry.id,
      port: entry.port,
      protocol: entry.protocol,
      cwd: entry.cwd,
      role: entry.role,
      command: typeof entry.command === 'string' ? entry.command : null,
    }
  })
}

function resourceBounds(manifest) {
  const defaults = resourcesOf(manifest)
  const limits = manifest?.runtime?.isolation?.limits
  if (!limits || typeof limits !== 'object') throw configError('profile declares no explicit resource limits')
  const maxCpus = Number(limits.cpus)
  const mem = limits.memoryBytes ?? limits.memory
  const maxMemoryBytes = Number.isInteger(mem) && mem > 0 ? mem : parseMemory(mem)
  if (!(maxCpus > 0) || !(maxMemoryBytes > 0)) throw configError('profile resource limits are invalid')
  return {
    defaults: { cpus: defaults.cpus, memory: defaults.memory },
    limits: { cpus: maxCpus, memoryBytes: maxMemoryBytes },
  }
}

function parseMemory(value) {
  if (Number.isInteger(value) && value > 0) return value
  const match = typeof value === 'string' && value.trim().match(/^(\d+)([KMG])B?$/i)
  if (!match) return NaN
  const scale = { K: 1024, M: 1024 ** 2, G: 1024 ** 3 }[match[2].toUpperCase()]
  return Number(match[1]) * scale
}

function memoryArg(bytes) {
  const gib = 1024 ** 3
  if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes % (1024 ** 2)) throw configError('memory must be a whole MiB')
  return bytes % gib === 0 ? `${bytes / gib}G` : `${bytes / (1024 ** 2)}M`
}

/** Overrides against profile limits — the only bound check on revision args. */
export function checkOverrides(overrides, bounds) {
  if (overrides === null || overrides === undefined) return {}
  if (typeof overrides !== 'object' || Array.isArray(overrides) ||
      Object.keys(overrides).some(k => !['cpus', 'memoryBytes'].includes(k))) throw configError('unsupported overrides')
  const out = {}
  if (overrides.cpus !== undefined) {
    if (!(Number.isSafeInteger(overrides.cpus) && overrides.cpus > 0 && overrides.cpus <= bounds.limits.cpus)) {
      throw configError(`cpus override out of range (max ${bounds.limits.cpus})`)
    }
    out.cpus = overrides.cpus
  }
  if (overrides.memoryBytes !== undefined) {
    if (!(Number.isInteger(overrides.memoryBytes) && overrides.memoryBytes > 0 && overrides.memoryBytes <= bounds.limits.memoryBytes)) {
      throw configError(`memoryBytes override out of range (max ${bounds.limits.memoryBytes})`)
    }
    memoryArg(overrides.memoryBytes)
    out.memoryBytes = overrides.memoryBytes
  }
  return out
}

/**
 * Actual observed publications joined to the row's reservations. A service
 * is only published when the inspect tuple matches the reserved tuple
 * exactly and is unique — ambiguous, wildcard or non-loopback evidence
 * yields `published:false`, never a guessed URL.
 */
export function serviceMappings(row, obs, services) {
  const reserved = new Map((row?.ports ?? []).map((port) => [port.serviceId, port]))
  const observed = obs?.state === 'running' && !!row.binding?.generation && row.binding.generation === obs.generation &&
    row.binding.locator === obs.locator && row.stateVolume === obs.stateVolume ? obs.publications ?? [] : []
  const at = obs?.observedAt ?? null
  return (services ?? []).map((service) => {
    const reservation = reserved.get(service.id) ?? null
    const hits = observed.filter(pub => pub.containerPort === service.port && pub.protocol === service.protocol)
    const published = !!reservation && hits.length === 1 && LOOPBACK.has(hits[0].hostAddress) &&
      hits[0].hostAddress === reservation.hostAddress && hits[0].hostPort === reservation.hostPort &&
      reservation.protocol === service.protocol && reservation.containerPort === service.port
    return {
      serviceId: service.id,
      containerPort: service.port,
      protocol: reservation?.protocol ?? service.protocol,
      published,
      hostPort: published ? hits[0].hostPort : null,
      hostAddress: published ? hits[0].hostAddress : null,
      health: 'unknown',
      declaredVersion: service.version ?? null,
      observedVersion: null,
      observedAt: at,
    }
  })
}

export function createManagedProfileSource(deps = {}) {
  const loaded = new Map()
  const pools = { ...ENV_PORT_POOLS, ...deps.portPools }
  const ordered = Object.values(pools)
  if (ordered.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isSafeInteger) ||
      p[0] < 1 || p[0] > p[1] || p[1] > 65535)) throw configError('invalid environment port range')
  ordered.sort((a, b) => a[0] - b[0])
  if (ordered.some((p, i) => i && p[0] <= ordered[i - 1][1])) throw configError('overlapping environment port ranges')
  return async function profileFor({ profileId, envId } = {}) {
    const id = typeof profileId === 'string' && profileId ? profileId : deps.defaultProfileId
    if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) {
      throw configError('a supported profileId is required')
    }
    const key = `${id}\n${envId ?? ''}`
    const cached = loaded.get(key)
    if (cached) return cached
    const tag = envTag(deps.env ?? process.env)
    if (envId !== undefined && envId !== tag) throw configError('environment mismatch')
    const pool = pools[tag]
    if (!Array.isArray(pool) || pool.length !== 2 || !pool.every((n) => Number.isInteger(n)) || pool[0] > pool[1]) {
      throw configError(`no declared port pool for env ${tag}`)
    }
    const profileDir = join(profilesRootFor(deps), id)
    if (!lstatSync(profileDir).isDirectory()) throw configError('invalid profile directory')
    const result = await loadProfileDriver(profileDir, deps)
    if (!result.ready || !result.driver) throw configError(`profile ${id} failed to load: ${result.errors.join(', ')}`)
    const manifest = result.manifest
    const services = serviceDecl(manifest)
    const bounds = resourceBounds(manifest)
    const profile = {
      profileId: id,
      context: { id, dir: profileDir, profile: manifest, driver: result.driver, digest: result.digest, resources: bounds.defaults },
      recipeRef: `${manifest.build.image}@${result.digest}`,
      services,
      portPool: [...pool],
      maxInstances: manifest.lifecycle.maxInstances,
      idleTimeoutMs: manifest.lifecycle.idleTimeoutMs,
      idleEvidence: typeof result.driver.idleEvidence === 'function' ? result.driver.idleEvidence.bind(result.driver) : null,
      resourceLimits: bounds.limits,
      validateOverrides: values => checkOverrides(values, bounds),
      defaults: bounds.defaults,
      inspectedRecipe: typeof result.driver.inspectedRecipe === 'function' ? result.driver.inspectedRecipe.bind(result.driver) : null,
      /** The trusted port plan for `registry.accept` — never request input. */
      portPlan() {
        return services.map((service) => ({
          serviceId: service.id,
          containerPort: service.port,
          protocol: service.protocol,
          hostAddress: '127.0.0.1',
          portRange: [...pool],
        }))
      },
      /** Full backend.create descriptor — mounts serialized from driver args. */
      createSpec(row, { overrides = {} } = {}) {
        const effective = checkOverrides(overrides, bounds)
        const volume = row.stateVolume
        if (!isAbsolute(volume) || volume === '/' || normalize(volume) !== volume || /[,\0\r\n]/.test(volume)) throw configError('unsafe volume path')
        for (let p = volume; p !== dirname(p); p = dirname(p)) {
          const st = lstatSync(p, { throwIfNoEntry: false })
          if (st && !st.isDirectory()) throw configError('unsafe volume ancestry')
          if (!st && row.origin === 'adopted') throw configError('adopted volume unavailable')
        }
        if (row.recipeRef !== profile.recipeRef || !row.binding?.locator) throw configError('binding or recipe changed')
        const mountSpecs = result.driver.managedMounts?.(manifest, deps, row.stateVolume)
        if (!Array.isArray(mountSpecs)) throw configError('driver mounts is not an array')
        const mounts = mountSpecs.map((mount) => {
          const arg = typeof mount?.arg === 'string' ? mount.arg : null
          if (!arg || arg.includes('\0') || arg.includes('\n')) throw configError('driver mount arg is not a bounded string')
          return { ...mount, arg }
        })
        const cpus = effective.cpus ?? bounds.defaults.cpus
        const memoryBytes = effective.memoryBytes ?? parseMemory(bounds.defaults.memory)
        // Deployment identity the guest uses to authenticate the host
        // owner's health channel (/proc/1/environ vs the published doc).
        if (typeof row.sandboxId !== 'string' || !row.sandboxId) throw configError('sandboxId required')
        return {
          containerName: row.binding.locator,
          image: manifest.build.image,
          managedIdentity: { envId: tag, sandboxId: row.sandboxId },
          mounts,
          resources: { cpus, memory: memoryArg(memoryBytes), memoryBytes },
          ports: (row.ports ?? []).map((port) => ({
            publish: `${port.hostAddress === '::1' ? '[::1]' : port.hostAddress}:${port.hostPort}:${port.containerPort}/${port.protocol}`,
            ...port,
          })),
        }
      },
      /**
       * Precheck for a destructive replace — pure validation, no IO: exact
       * row, frozen revision, no pending op, overrides in bounds, and the
       * caller-verified evidence gathered beforehand.
       */
      preflight(row, { expectedRevision, operationId, evidence, existing, spec } = {}) {
        if (!row || row.removed) throw configError('unknown sandbox row')
        if (row.operations.some((op) => op.operationId !== operationId && ['accepted', 'running', 'indeterminate'].includes(op.state))) {
          throw configError('lifecycle operation in progress')
        }
        const current = row.desiredRevision?.revision ?? 0
        if (!Number.isInteger(expectedRevision) || expectedRevision !== current) {
          const error = configError('stale expectedRevision')
          error.code = 'revision.stale'
          throw error
        }
        const effective = checkOverrides(row.desiredRevision?.overrides, bounds)
        if (!evidence?.imageDigest || typeof evidence.imageDigest !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(evidence.imageDigest)) {
          const error = configError('image digest could not be verified')
          error.code = 'image.unknown_digest'
          throw error
        }
        // The realized receipt records the desired revision itself — the
        // caller proved `expectedRevision === current`, so that is the
        // revision being applied, not a new one.
        if (row.recipeRef !== profile.recipeRef || row.appliedRevision?.imageDigest !== evidence.imageDigest ||
            !profile.verifySpec(existing, row, { imageDigest: evidence.imageDigest, spec, existing: true })) throw configError('old artifacts or mounts not proven')
        return { revision: current, overrides: effective, imageDigest: evidence.imageDigest }
      },
      /**
       * Verify a live inspect result against the spec actually dispatched:
       * identity+generation proof, mounts, published tuples, resources and
       * image digest — all present in `obs` or the check fails.
       */
      verifySpec(obs, row, { spec, imageDigest, existing = false } = {}) {
        if (!obs || obs.locator !== row.binding.locator || obs.stateVolume !== row.stateVolume) return false
        if (!spec || !imageDigest || obs.imageDigest !== imageDigest || !Array.isArray(obs.mounts) || obs.mounts.length !== spec.mounts.length) return false
        if (spec.mounts.some(m => obs.mounts.filter(o => o.type === m.type && o.target === m.target &&
          (m.type === 'tmpfs' || o.source === m.source) && o.readOnly === m.readOnly).length !== 1)) return false
        const reserved = row.ports ?? []
        const pubs = obs.publications ?? []
        if (!Array.isArray(obs.publications) || reserved.length !== pubs.length) return false
        for (const port of reserved) {
          if (!pubs.some((pub) => pub.containerPort === port.containerPort && pub.hostPort === port.hostPort && pub.protocol === port.protocol && pub.hostAddress === port.hostAddress)) {
            return false
          }
        }
        const res = obs.resources ?? {}
        return existing || (res.cpus === spec.resources.cpus && res.memoryBytes === spec.resources.memoryBytes)
      },
      /** Only a service's declared guest cwd may be selected; no host cwd. */
      resolveCwd({ service: serviceId, cwd } = {}) {
        if (!serviceId && (!cwd || cwd === '/')) return '/'
        const service = services.find((entry) => entry.id === serviceId)
        if (!service || (cwd !== undefined && cwd !== service.cwd)) throw configError('undeclared guest directory')
        return service.cwd
      },
    }
    loaded.set(key, profile)
    return profile
  }
}
