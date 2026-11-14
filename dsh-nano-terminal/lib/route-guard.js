/**
 * dsh-host-route-guard — the single web-route registration entry.
 *
 * Every dsh-nano plugin registers its HTTP routes through this guard instead of
 * calling `ctx.webServer.register` directly (26-nov-security-fix / P1-01,
 * frozen decisions T-O-6 and T-O-7):
 *
 *   - fail-closed `connection`: `ctx.get('connection')` must resolve before any
 *     route is registered; without it there is no Host/Origin fence.
 *   - fail-closed coverage: a `(path, method)` pair that the baked route table
 *     does not list throws `route-not-listed`; a table row the plugin declares
 *     but does not register throws `route-stale` (prevents silent route drift).
 *   - uniform error shape: method mismatch → 405 JSON `{ok:false,
 *     reason:'method-not-allowed'}`; any error thrown by the guard or the
 *     handler falls back to `{ok:false,reason}` JSON, not plain text.
 *   - `bodyLimit`: the spec's own `bodyLimit` wins; otherwise the table row's
 *     limit is inherited. The effective limit travels with the route record so
 *     handlers bound their reads (`route.bodyLimit` / `readJsonBody(req,
 *     route.bodyLimit)`). The guard never consumes the request stream itself —
 *     handlers keep their current read+parse shape (migration stays 零行为).
 *   - `sessionBinding` is ledger metadata only: it is recorded on the route
 *     record and in `inventory()`, never enforced at runtime.
 *
 * The table is a JS constant baked at build time from the plugin's rows of
 * `security/route-sensitivity.json` (T-O-13); this module performs no file IO.
 */

/** Error thrown for every guard decision, carrying a stable `reason`. */
export class RouteGuardError extends Error {
  constructor(reason, detail = '') {
    super(detail ? `route-guard: ${reason} — ${detail}` : `route-guard: ${reason}`)
    this.name = 'RouteGuardError'
    this.reason = reason
  }
}

const ROUTE_KIND = 'exact'

/* ------------------------------------------------------------------ */
/* Shared request/response helpers (exported so tests and new handlers  */
/* can rely on the same shapes).                                       */
/* ------------------------------------------------------------------ */

/** Write a JSON body with content-type, guarding an already-ended response. */
export function sendJson(res, status, body) {
  if (res.writableEnded || res.destroyed) return
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

/**
 * Read a JSON request body bounded by `maxBytes`. Throws `body-too-large`
 * above the limit (callers map it to their existing too-large error shape;
 * the guard itself never reads the stream). Empty body parses as `{}`.
 */
export async function readJsonBody(req, maxBytes) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (maxBytes !== undefined && total > maxBytes) {
      throw new RouteGuardError('body-too-large', `${total} > ${maxBytes}`)
    }
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text === '') return {}
  return JSON.parse(text)
}

/* ------------------------------------------------------------------ */
/* Table handling                                                      */
/* ------------------------------------------------------------------ */

/**
 * Build a path-indexed lookup from the baked table rows.
 * Row shape: { path, methods:[...], sensitivity, capability, bodyLimit,
 *              sessionBinding, justification }.
 * `plugin` is recorded on each row's provenance for inventory output.
 */
function indexTable(table, plugin) {
  if (!Array.isArray(table)) {
    throw new RouteGuardError('table-invalid', 'table must be an array of route rows')
  }
  const byPath = new Map()
  for (const row of table) {
    if (!row || typeof row.path !== 'string' || row.path === '') {
      throw new RouteGuardError('table-invalid', 'every row needs a non-empty path')
    }
    const methods = Array.isArray(row.methods) ? row.methods.map(m => String(m).toUpperCase()) : []
    if (methods.length === 0) {
      throw new RouteGuardError('table-invalid', `${row.path}: methods list is empty`)
    }
    if (byPath.has(row.path)) {
      throw new RouteGuardError('table-invalid', `${row.path}: duplicate table row`)
    }
    byPath.set(row.path, {
      path: row.path,
      methods,
      sensitivity: row.sensitivity,
      capability: row.capability,
      bodyLimit: row.bodyLimit,
      sessionBinding: row.sessionBinding,
      justification: row.justification,
      plugin: row.plugin ?? plugin,
    })
  }
  return byPath
}

/* ------------------------------------------------------------------ */
/* Spec normalization                                                  */
/* ------------------------------------------------------------------ */

/**
 * RouteSpec: { path, method?, methods?, handler, bodyLimit?, sensitivity?,
 *              capability?, sessionBinding? }.
 * `method` and `methods` are merged; at least one is required.
 */
function normalizeSpec(spec) {
  if (!spec || typeof spec.path !== 'string' || spec.path === '') {
    throw new RouteGuardError('route-spec-invalid', 'every spec needs a non-empty path')
  }
  const methods = new Set()
  if (Array.isArray(spec.methods)) {
    for (const m of spec.methods) methods.add(String(m).toUpperCase())
  }
  if (spec.method !== undefined) methods.add(String(spec.method).toUpperCase())
  if (methods.size === 0) {
    throw new RouteGuardError('route-spec-invalid', `${spec.path}: declare method or methods`)
  }
  if (typeof spec.handler !== 'function') {
    throw new RouteGuardError('route-spec-invalid', `${spec.path}: handler must be a function`)
  }
  return { ...spec, methods: [...methods] }
}

/* ------------------------------------------------------------------ */
/* Guard factory                                                       */
/* ------------------------------------------------------------------ */

/**
 * createGuard({ table, plugin? }) →
 *   { registerRoutes(ctx, specs), inventory(), lookup(path) }
 *
 * `table` is validated eagerly at construction. `plugin` is optional and used
 * for inventory provenance and `ctx.effect` labels.
 */
export function createGuard({ table, plugin } = {}) {
  const byPath = indexTable(table ?? [], plugin)
  const records = [] // registration records, in registration order

  /**
   * registerRoutes(ctx, specs) → disposer[]
   * Registers every spec after the whole batch validates; throws before any
   * `webServer.register` call if the batch is inconsistent.
   */
  function registerRoutes(ctx, specs) {
    const conn = ctx.get('connection')
    if (!conn) throw new RouteGuardError('no-connection', 'no connection service')
    // requestRejection is the auth boundary every route below depends on.
    // Optional-chaining it would turn "the host changed shape" into a silent
    // fail-open, so this contract is checked once at registration instead.
    if (typeof conn.requestRejection !== 'function') {
      throw new RouteGuardError('no-request-rejection', 'connection.requestRejection is not a function; refusing to register unauthenticated routes')
    }

    const normalized = specs.map(normalizeSpec)

    // ---- batch validation (before any register) ----
    const wanted = new Map() // `${method} ${path}` -> spec
    for (const spec of normalized) {
      const row = byPath.get(spec.path)
      for (const method of spec.methods) {
        const key = `${method} ${spec.path}`
        if (!row) {
          throw new RouteGuardError('route-not-listed', `${method} ${spec.path} is not in the route table`)
        }
        if (!row.methods.includes(method)) {
          throw new RouteGuardError('route-not-listed', `${method} ${spec.path}: method not covered by the table row`)
        }
        if (wanted.has(key)) {
          throw new RouteGuardError('route-duplicate', `${method} ${spec.path} declared twice`)
        }
        wanted.set(key, spec)
      }
      // Sensitivity/capability/sessionBinding are declarations, not overrides:
      // a spec may restate the table row but may not contradict it (bodyLimit
      // is the only spec-side override, per the contract).
      for (const field of ['sensitivity', 'capability', 'sessionBinding']) {
        if (spec[field] !== undefined && row[field] !== spec[field]) {
          throw new RouteGuardError('route-drift', `${spec.path}: ${field} declares "${spec[field]}" but the table row has "${row[field]}"`)
        }
      }
    }

    // ---- stale rows: table declares, specs don't register ----
    for (const row of byPath.values()) {
      for (const method of row.methods) {
        if (!wanted.has(`${method} ${row.path}`)) {
          throw new RouteGuardError('route-stale', `${method} ${row.path}: table row has no matching route spec`)
        }
      }
    }

    // ---- registration ----
    const disposers = []
    for (const spec of normalized) {
      const row = byPath.get(spec.path)
      const route = Object.freeze({
        path: spec.path,
        methods: Object.freeze([...spec.methods]),
        sensitivity: row.sensitivity,
        capability: row.capability,
        bodyLimit: spec.bodyLimit ?? row.bodyLimit,
        sessionBinding: row.sessionBinding,
        justification: row.justification,
        plugin: row.plugin,
      })
      records.push(route)

      const handler = async (req, res) => {
        const rejection = conn.requestRejection?.(req)
        if (rejection !== undefined) {
          res.statusCode = rejection
          res.end()
          return
        }
        if (!route.methods.includes(String(req.method ?? '').toUpperCase())) {
          res.setHeader('allow', route.methods.join(', '))
          sendJson(res, 405, { ok: false, reason: 'method-not-allowed' })
          return
        }
        try {
          await spec.handler(req, res, route)
        } catch (error) {
          const reason = error instanceof RouteGuardError ? error.reason : 'failed'
          sendJson(res, 500, { ok: false, reason })
        }
      }

      const register = () => ctx.webServer.register({ kind: spec.kind ?? ROUTE_KIND, path: spec.path, handler })
      if (typeof ctx.effect === 'function') {
        disposers.push(ctx.effect(register, `route-guard: ${spec.path}`))
      } else {
        disposers.push(register())
      }
    }
    return disposers
  }

  /**
   * inventory() → frozen array of route records (registration order):
   *   { path, methods, sensitivity, capability, bodyLimit, sessionBinding,
   *     justification, plugin }
   * Consumed by `scripts/gen-route-inventory` to write
   * `security/route-inventory.md`.
   */
  function inventory() {
    return Object.freeze([...records])
  }

  /** lookup(path) → the route record for a registered path, or undefined. */
  function lookup(path) {
    return records.find(r => r.path === path)
  }

  return { registerRoutes, inventory, lookup }
}

/**
 * Standalone entry mirroring the bound signature used by the migration:
 *   registerRoutes(ctx, specs, { table, plugin? }) → disposer[]
 * Equivalent to `createGuard({ table, plugin }).registerRoutes(ctx, specs)`
 * but creates a fresh guard per call (intended for one-shot registration).
 * For inventory access use `createGuard` directly.
 */
export function registerRoutes(ctx, specs, { table, plugin } = {}) {
  return createGuard({ table, plugin }).registerRoutes(ctx, specs)
}

/**
 * inventoryMarkdown(rows) → a markdown table suitable for
 * `security/route-inventory.md` (§8 B0-T01 / A-14).
 */
export function inventoryMarkdown(rows, { title = 'route-inventory' } = {}) {
  const header = [
    `# ${title}`,
    '',
    '| path | methods | sensitivity | capability | bodyLimit | sessionBinding | justification |',
    '|---|---|---|---|---|---|---|',
  ]
  const body = rows.map(r => [
    `\`${r.path}\``,
    r.methods.join(', '),
    r.sensitivity ?? '',
    r.capability ?? '',
    r.bodyLimit === undefined ? '—' : r.bodyLimit,
    r.sessionBinding ?? '',
    r.justification ?? '',
  ].map(String).join(' | '))
  return `${[...header, ...body.map(cells => `| ${cells} |`), ''].join('\n')}`
}
