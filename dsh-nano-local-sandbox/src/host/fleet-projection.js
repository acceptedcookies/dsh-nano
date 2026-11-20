/**
 * Managed read projection (P7-01). One seam over explicitly provided env
 * sources — `createFleetProjection({envId, sources, resolvePrincipal})`
 * returns `{capabilities, execute}` composed into the environment owner's
 * capability map, so fleet/list/inspect/processes ride the same
 * dnls.control/1 admission → version → selector → execute pipeline.
 *
 * Each source is host-provided and read-only:
 * `{envId, visibleTo(principal), registry, observe(row), profileFor, usage, backend}`.
 * A source the principal cannot see is skipped before its registry is ever
 * consulted; a visible source whose ledger or probe throws contributes
 * `{envId, complete:false, rows:[]}` — never a path or error detail.
 *
 * Every row projection is a strict allowlist — no executable payload,
 * volume paths, mounts, credentials or request fragments — and is only
 * emitted when the row still authorizes the same principal after the
 * awaited observation. Unproven evidence projects `generation:null` and
 * `observedState:'unknown'`, never guessed health.
 */
import { authorize, resolveTrusted } from './object-authz.js'
import { serviceMappings } from './managed-profile.js'

const boundedText = (value, max = 256) => typeof value === 'string' && value.length > 0 && value.length <= max && !value.includes('\0')
const paramsError = (what) => Object.assign(new Error(`${what} is required`), { errorId: `sandbox.params.${what}` })
const denied = () => Object.assign(new Error('denied'), { status: 403 })
const notFound = () => Object.assign(new Error('not found'), { status: 404 })

const ENV_ID = /^[a-z][a-z0-9-]{0,15}$/
const USAGE_WINDOWS = new Set(['24h', '7d', '30d'])
const LIST_DEFAULT_LIMIT = 50
const LIST_MAX_LIMIT = 200
const PROCESSES_DEFAULT_LIMIT = 50
const PROCESSES_MAX_LIMIT = 200

const schema = (properties, required) => ({ type: 'object', properties, required, additionalProperties: false })
const int = { type: 'integer' }
const objectTool = (name, description, properties = {}, required = []) => [name, {
  http: { path: `/nano-local-sandbox/${name.slice('sandbox.'.length)}`, methods: ['GET', 'HEAD'] },
  target: 'object',
  tool: { name, description, inputSchema: schema({ sandboxId: { type: 'string' }, ...properties }, ['sandboxId', ...required]) },
}]

/**
 * Read pagination parameters — the only declared non-selector HTTP query
 * keys. Parsed after contract + object selection, only for a GET/HEAD
 * request to that capability's own path — /mcp traffic carries args, so
 * query overrides never apply there. Duplicate or undeclared keys reject.
 */
function readParams(req, args, path, keys) {
  const out = { ...(args ?? {}) }
  if (req?.method !== 'GET' && req?.method !== 'HEAD') return out
  let url
  try {
    url = req?.url ? new URL(req.url, 'http://managed.local') : null
  } catch {
    url = null
  }
  if (!url || url.pathname !== path) return out
  const allowed = new Set([...keys, 'sandboxId'])
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key)) throw paramsError(key)
  }
  for (const key of keys) {
    const values = url.searchParams.getAll(key)
    if (values.length > 1) throw paramsError(key)
    if (values.length === 1) out[key] = values[0]
  }
  return out
}

const intParam = (params, key, { min, max, fallback }) => {
  const raw = params[key]
  if (raw === undefined) return fallback
  const value = typeof raw === 'string' && /^-?\d+$/.test(raw) ? Number(raw) : raw
  if (!Number.isInteger(value) || value < min || value > max) throw paramsError(key)
  return value
}

function windowParam(params) {
  const window = params.window
  if (window === undefined) return null
  if (typeof window !== 'string' || !USAGE_WINDOWS.has(window)) throw paramsError('window')
  return window
}

function envFilter(params) {
  const value = params.envId
  if (value === undefined) return null
  if (typeof value !== 'string' || !ENV_ID.test(value)) throw paramsError('envId')
  return value
}

const lastOperation = (row) => {
  const list = Array.isArray(row?.operations) ? row.operations : []
  if (list.length === 0) return null
  const last = list[list.length - 1]
  return { state: last.state, step: last.step }
}

/**
 * Proof that an observation describes the row's bound object — same
 * locator, same nonempty generation, same volume. Anything else is
 * unknown, never attributed liveness.
 */
function proven(row, obs) {
  return !!obs && obs.locator === row.binding?.locator &&
    boundedText(obs.generation) && obs.generation === row.binding?.generation &&
    obs.stateVolume === row.stateVolume
}

/** A confirmed absence of exactly the bound locator — distinct from unknown. */
function absent(row, obs) {
  return !!obs && obs.state === 'missing' && obs.locator === row.binding?.locator
}

export function createFleetProjection({ envId, sources, resolvePrincipal } = {}) {
  if (!Array.isArray(sources) || sources.length === 0) throw new Error('fleet-projection requires explicit sources')
  if (typeof resolvePrincipal !== 'function') throw new Error('fleet-projection requires resolvePrincipal')
  for (const source of sources) {
    if (typeof source?.envId !== 'string' || !ENV_ID.test(source.envId)) throw new Error('fleet-projection source envId out of bounds')
    for (const fn of ['registry', 'observe', 'profileFor']) {
      if (source[fn] === undefined || (fn !== 'registry' && typeof source[fn] !== 'function')) {
        throw new Error(`fleet-projection source ${source.envId} missing ${fn}`)
      }
    }
    if (typeof source.registry?.list !== 'function' || typeof source.registry?.get !== 'function') {
      throw new Error(`fleet-projection source ${source.envId} registry is not readable`)
    }
  }

  /**
   * Is this source still visible to the principal? Scoped visibility is
   * always an explicit host predicate — a missing or throwing `visibleTo`
   * denies, never grants global access.
   */
  function stillVisible(source, principal) {
    if (typeof source.visibleTo !== 'function') return false
    try {
      return source.visibleTo(principal) === true
    } catch {
      return false
    }
  }

  /**
   * Sources this principal may see at all. `visibleTo` is consulted before
   * any registry read; a hidden source leaves no trace in output or counts.
   */
  function visibleSources(peer) {
    const out = []
    for (const source of sources) {
      const trusted = resolveTrusted({ peer, envId: source.envId, resolvePrincipal })
      if (trusted.status || !trusted.principal) continue
      if (stillVisible(source, trusted.principal)) out.push({ source, principal: trusted.principal })
    }
    return out
  }

  async function serviceProfile(source, row) {
    try {
      return await source.profileFor({ envId: source.envId, profileId: row.profileId })
    } catch {
      return null
    }
  }

  /** Rows that still authorize the same principal — the counted set. */
  function stillAuthorized(peer, { source, principal }, row) {
    if (!stillVisible(source, principal)) return null
    const current = source.registry.get(row.sandboxId)
    if (!current || current.binding?.locator !== row.binding?.locator ||
        current.binding?.generation !== row.binding?.generation || current.stateVolume !== row.stateVolume) return null
    const verdict = authorize({ peer, envId: source.envId, row: current, action: 'read', resolvePrincipal })
    return !verdict.status && verdict.principal?.key === principal?.key ? verdict : null
  }

  /**
   * Project one row through the strict allowlist. Returns null when the
   * row stopped authorizing this principal or was replaced in flight —
   * suppressed rows contribute nothing, not even a shape.
   */
  async function projectRow(peer, { source, principal }, row, { detail = false } = {}) {
    const first = authorize({ peer, envId: source.envId, row, action: 'read', resolvePrincipal })
    if (first.status) return null
    let obs = null
    try {
      obs = await source.observe(row)
    } catch {
      obs = null
    }
    const profile = await serviceProfile(source, row)
    // Everything awaited: the ledger, the binding, the authorization and
    // the env's visibility to this principal must all still hold.
    const fresh = source.registry.get(row.sandboxId)
    if (!fresh || fresh.binding?.locator !== row.binding?.locator ||
        fresh.binding?.generation !== row.binding?.generation ||
        fresh.stateVolume !== row.stateVolume ||
        !stillVisible(source, principal)) return null
    const again = authorize({ peer, envId: source.envId, row: fresh, action: 'read', resolvePrincipal })
    if (again.status || again.principal?.key !== first.principal?.key) return null
    const ok = proven(fresh, obs)
    const gone = !ok && absent(fresh, obs)
    // Health is never container.state: only a driver-published health
    // verdict is evidence; everything else stays unknown.
    const health = ok && typeof profile?.healthOf === 'function' ? (profile.healthOf(obs) ?? 'unknown') : 'unknown'
    const mappings = serviceMappings(fresh, ok ? obs : null, profile?.services ?? [])
    const base = {
      envId: source.envId,
      sandboxId: fresh.sandboxId,
      name: fresh.name,
      profileId: fresh.profileId,
      generation: ok ? obs.generation : null,
      observedAt: ok ? (obs.observedAt ?? null) : null,
      observedState: ok ? obs.state : gone ? 'missing' : 'unknown',
      health,
      operation: lastOperation(fresh),
      desiredRevision: fresh.desiredRevision?.revision ?? 0,
      appliedRevision: fresh.appliedRevision?.revision ?? null,
      services: mappings.map((service) => ({
        serviceId: service.serviceId,
        published: service.published === true,
        health: service.health ?? 'unknown',
      })),
      // Only this principal's own live terminals on the bound generation —
      // another principal's opens are not disclosed by a count either.
      visibleTerminalCount: (fresh.terminals ?? []).filter((entry) =>
        entry.state !== 'ended' && entry.principal === again.principal?.key &&
        entry.generation === fresh.binding?.generation).length,
    }
    if (!detail) return base
    const resources = ok && obs?.resources && typeof obs.resources === 'object'
      ? { cpus: obs.resources.cpus ?? null, memoryBytes: obs.resources.memoryBytes ?? null }
      : null
    // Operator-only plane: desired configuration and the applied receipt.
    // A bare read grant never discloses overrides, idle policy or the
    // verified digest — persisted values are cloned out of the ledger row,
    // never re-derived from the request.
    const operator = again.principal?.operator === true
    const overrides = fresh.desiredRevision?.overrides
    return {
      ...base,
      resources,
      ...(operator ? {
        configuration: {
          overrides: overrides ? {
            cpus: overrides.cpus ?? null,
            memoryBytes: overrides.memoryBytes ?? null,
          } : {},
          idleTimeoutMs: fresh.idleTimeoutMs ?? null,
        },
        applied: fresh.appliedRevision
          ? { imageDigest: fresh.appliedRevision.imageDigest, verifiedAt: fresh.appliedRevision.verifiedAt }
          : null,
        // This principal's own recent ledger operations — an allowlisted
        // timeline, never args, ids, fingerprints or other principals.
        operations: (fresh.operations ?? [])
          .filter((entry) => entry.principal === again.principal?.key)
          .slice(-8)
          .map((entry) => ({
            action: entry.action,
            state: entry.state,
            step: entry.step,
            at: entry.at ?? null,
            finishedAt: entry.finishedAt ?? null,
          })),
      } : {}),
      services: mappings.map((service) => ({
        serviceId: service.serviceId,
        containerPort: service.containerPort,
        protocol: service.protocol,
        published: service.published === true,
        hostPort: service.published === true ? service.hostPort : null,
        hostAddress: service.published === true ? service.hostAddress : null,
        health: service.health ?? 'unknown',
        declaredVersion: service.declaredVersion ?? null,
        observedVersion: service.observedVersion ?? null,
        observedAt: service.observedAt ?? null,
        guestCwd: service.cwd ?? null,
        role: service.role ?? null,
      })),
      // Verified guest mounts: target/type/readOnly only — host sources
      // and arbitrary paths stay out of the public detail.
      mounts: ok && Array.isArray(obs.mounts)
        ? obs.mounts.map((mount) => ({
            type: mount.type ?? null,
            target: mount.target ?? null,
            readOnly: mount.readOnly === true,
          }))
        : null,
    }
  }

  /** Every visible row, filtered by canSee BEFORE count/sort/page/probe. */
  function rowsFor({ source, principal }) {
    let rows
    try {
      rows = source.registry.list()
    } catch {
      return { source, rows: null }
    }
    try {
      rows = rows.filter((row) => principal.canSee(row))
    } catch {
      return { source, rows: null }
    }
    return { source, rows }
  }

  const capabilities = new Map([
    ['sandbox.fleet', {
      http: { path: '/nano-local-sandbox/fleet', methods: ['GET', 'HEAD'] },
      target: 'none',
      tool: {
        name: 'sandbox.fleet',
        description: 'Per-environment status of visible managed sandboxes.',
        inputSchema: schema({}, []),
      },
    }],
    ['sandbox.list', {
      http: { path: '/nano-local-sandbox/sandboxes', methods: ['GET', 'HEAD'] },
      target: 'none',
      tool: {
        name: 'sandbox.list',
        description: 'Paged flat list of visible managed sandbox projections.',
        inputSchema: schema({ envId: { type: 'string' }, page: int, offset: int, limit: int }, []),
      },
    }],
    objectTool('sandbox.inspect', 'Allowlisted detail projection of one managed sandbox.', {
      window: { enum: ['24h', '7d', '30d'] },
    }),
    objectTool('sandbox.processes', 'PID-sorted guest process table of one verified running sandbox.', {
      limit: int,
    }),
  ])

  /** The caller's peer may still be admitted at response time. */
  function livePeer(peer) {
    if (peer?.signal?.aborted === true) {
      throw Object.assign(new Error('unauthenticated'), { status: 401 })
    }
  }

  async function execute({ capability, sandboxId, peer, req, args }) {
    livePeer(peer)
    if (capability === 'sandbox.fleet') {
      const envs = []
      for (const entry of visibleSources(peer)) {
        const { rows } = rowsFor(entry)
        if (rows === null) {
          envs.push({ envId: entry.source.envId, complete: false, rows: [] })
          continue
        }
        const projected = []
        let complete = true
        for (const row of rows) {
          const item = await projectRow(peer, entry, row)
          if (item === null) { complete = false; continue }
          projected.push(item)
        }
        // An env that lost visibility mid-flight contributes nothing — not
        // even its name or a count.
        if (stillVisible(entry.source, entry.principal)) {
          envs.push({ envId: entry.source.envId, complete, rows: projected })
        }
      }
      livePeer(peer)
      const visible = visibleSources(peer)
      return { envs: envs.flatMap(env => {
        const entry = visible.find(item => item.source.envId === env.envId)
        if (!entry) return []
        const rows = env.rows.filter(item => {
          const row = entry.source.registry.get(item.sandboxId)
          return row && stillAuthorized(peer, entry, row) && (!item.generation || item.generation === row.binding?.generation)
        })
        return [{ ...env, rows, complete: env.complete && rows.length === env.rows.length }]
      }) }
    }

    if (capability === 'sandbox.list') {
      const params = readParams(req, args, '/nano-local-sandbox/sandboxes', ['envId', 'page', 'offset', 'limit'])
      const limit = intParam(params, 'limit', { min: 1, max: LIST_MAX_LIMIT, fallback: LIST_DEFAULT_LIMIT })
      const page = intParam(params, 'page', { min: 0, max: 1_000_000, fallback: null })
      const offset = intParam(params, 'offset', { min: 0, max: 1_000_000, fallback: page === null ? 0 : page * limit })
      const only = envFilter(params)
      const all = []
      const envs = []
      for (const entry of visibleSources(peer)) {
        if (only !== null && entry.source.envId !== only) continue
        const { rows } = rowsFor(entry)
        if (rows === null) {
          envs.push({ envId: entry.source.envId, complete: false })
          continue
        }
        envs.push({ envId: entry.source.envId, complete: true })
        for (const row of rows) all.push({ entry, row })
      }
      // Stable order: envId then sandboxId — page boundaries never drift.
      all.sort((a, b) => (a.entry.source.envId + a.row.sandboxId).localeCompare(b.entry.source.envId + b.row.sandboxId))
      // Rows that no longer authorize (mid-flight revoke) shrink the total;
      // a leaked pre-revocation count is itself a disclosure.
      const authorized = []
      let complete = envs.every((env) => env.complete)
      for (const { entry, row } of all) {
        const verdict = stillAuthorized(peer, entry, row)
        if (!verdict) { complete = false; continue }
        authorized.push({ entry, row, verdict })
      }
      const pageRows = []
      for (const { entry, row } of authorized.slice(offset, offset + limit)) {
        const item = await projectRow(peer, entry, row)
        if (item !== null) pageRows.push(item)
        else complete = false
      }
      livePeer(peer)
      const visible = new Set(visibleSources(peer).map(entry => entry.source.envId))
      const remaining = authorized.filter(({ entry, row }) => visible.has(entry.source.envId) && stillAuthorized(peer, entry, row))
      const ids = new Set(remaining.map(({ entry, row }) => `${entry.source.envId}/${row.sandboxId}`))
      return { envs: envs.filter(env => visible.has(env.envId)), rows: pageRows.filter(r => ids.has(`${r.envId}/${r.sandboxId}`)),
        total: remaining.length, offset, limit, complete: complete && remaining.length === authorized.length }
    }

    if (capability === 'sandbox.inspect' || capability === 'sandbox.processes') {
      const visible = visibleSources(peer)
      let found = null
      for (const entry of visible) {
        let row = null
        try {
          row = entry.source.registry.get(sandboxId)
        } catch {
          row = null
        }
        if (row) { found = { entry, row }; break }
      }
      if (!found) throw notFound()
      const { entry, row } = found
      if (capability === 'sandbox.inspect') {
        const params = readParams(req, args, '/nano-local-sandbox/inspect', ['window'])
        const detail = await projectRow(peer, entry, row, { detail: true })
        if (detail === null) throw notFound()
        const window = windowParam(params)
        if (window !== null) {
          // Historical usage follows the sandbox.usage grant rule exactly:
          // operator acting on its own object — a use grant alone is not
          // permission to disclose minutes.
          const scoped = authorize({ peer, envId: entry.source.envId, row, action: 'read', resolvePrincipal })
          if (scoped.status || scoped.principal?.operator !== true || scoped.principal.key !== row.principal) throw denied()
          detail.usage = await entry.source.usage.summary(row, window)
          const again = entry.source.registry.get(row.sandboxId)
          const recheck = again && authorize({ peer, envId: entry.source.envId, row: again, action: 'read', resolvePrincipal })
          if (!again || recheck.status || recheck.principal?.key !== scoped.principal?.key ||
              again.binding?.generation !== row.binding?.generation || again.binding?.locator !== row.binding?.locator) {
            throw notFound()
          }
        }
        livePeer(peer)
        return detail
      }
      // sandbox.processes — limit parses before any probe; the row must be
      // the exact same binding before AND after the guest read.
      const params = readParams(req, args, '/nano-local-sandbox/processes', ['limit'])
      const limit = intParam(params, 'limit', { min: 1, max: PROCESSES_MAX_LIMIT, fallback: PROCESSES_DEFAULT_LIMIT })
      const verdict = authorize({ peer, envId: entry.source.envId, row, action: 'processes', resolvePrincipal })
      if (verdict.status || verdict.principal?.operator !== true || !verdict.principal.canUse(row)) throw denied()
      const pre = await entry.source.observe(row)
      const current = entry.source.registry.get(row.sandboxId)
      const reauth = current && authorize({ peer, envId: entry.source.envId, row: current, action: 'processes', resolvePrincipal })
      if (!current || reauth.status || reauth.principal?.key !== verdict.principal?.key ||
          reauth.principal?.operator !== true || !reauth.principal.canUse(current) ||
          current.binding?.locator !== row.binding.locator || current.binding?.generation !== row.binding.generation) {
        throw Object.assign(new Error('sandbox changed under dispatch'), { status: 409 })
      }
      const notRunning = (state) => ({ status: 409, body: { ok: false, state } })
      if (!proven(current, pre)) return notRunning('unknown')
      if (pre.state !== 'running') {
        return notRunning(pre.state === 'missing' ? 'missing' : pre.state === 'stopped' ? 'stopped' : 'unknown')
      }
      if (typeof entry.source.backend?.processes !== 'function') {
        throw Object.assign(new Error('process table unavailable'), { status: 503 })
      }
      const entries = await entry.source.backend.processes(row.binding.locator)
      const afterGuest = entry.source.registry.get(sandboxId)
      if (!afterGuest || !stillVisible(entry.source, entry.principal)) throw notFound()
      const afterGrant = authorize({ peer, envId: entry.source.envId, row: afterGuest, action: 'processes', resolvePrincipal })
      if (afterGrant.status || !afterGrant.principal.operator || afterGrant.principal.key !== verdict.principal.key) throw denied()
      if (afterGuest.binding?.locator !== row.binding?.locator || afterGuest.binding?.generation !== row.binding?.generation ||
          afterGuest.stateVolume !== row.stateVolume) throw Object.assign(new Error('sandbox changed under dispatch'), { status: 409 })
      // The guest table was read under one binding; the post receipt must
      // name the SAME locator+generation+volume as the pre-observation.
      const post = await entry.source.observe(row)
      const latest = entry.source.registry.get(row.sandboxId)
      const recheck = latest && authorize({ peer, envId: entry.source.envId, row: latest, action: 'processes', resolvePrincipal })
      if (!latest || !stillVisible(entry.source, entry.principal) || recheck.status || !recheck.principal.operator || recheck.principal?.key !== verdict.principal?.key ||
          !proven(latest, post) || post.state !== 'running' ||
          post.generation !== pre.generation || post.locator !== pre.locator || post.stateVolume !== pre.stateVolume) {
        throw Object.assign(new Error('sandbox changed under dispatch'), { status: 409 })
      }
      if (!Array.isArray(entries)) {
        throw Object.assign(new Error('malformed process table'), { status: 502 })
      }
      const processes = []
      for (const source_entry of entries) {
        if (!source_entry || typeof source_entry !== 'object' ||
            !Number.isInteger(source_entry.pid) || source_entry.pid < 1 ||
            !Number.isInteger(source_entry.ppid) || source_entry.ppid < 0 ||
            typeof source_entry.name !== 'string' || source_entry.name.length === 0 || source_entry.name.length > 64 ||
            typeof source_entry.state !== 'string' || source_entry.state.length !== 1 ||
            !Number.isInteger(source_entry.rssBytes) || source_entry.rssBytes < 0) {
          throw Object.assign(new Error('malformed process table'), { status: 502 })
        }
        // Strict allowlist — a foreign backend's extra fields never cross.
        processes.push({
          pid: source_entry.pid, ppid: source_entry.ppid,
          name: source_entry.name, state: source_entry.state, rssBytes: source_entry.rssBytes,
        })
      }
      livePeer(peer)
      processes.sort((a, b) => a.pid - b.pid)
      return {
        ok: true,
        generation: pre.generation,
        observedAt: pre.observedAt ?? null,
        processes: processes.slice(0, limit),
        returned: Math.min(processes.length, limit),
        truncated: processes.length > limit,
      }
    }

    throw paramsError('capability')
  }

  return { capabilities, execute }
}
