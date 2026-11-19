/**
 * Q7's twenty sandbox tools — the host /mcp control plane.
 *
 * P3-03 (CF1115): each tool carries its OWN `additionalProperties:false`
 * inputSchema and is wired to the REAL domain owner — never the old uniform
 * `{ok:true, diagnostics, pushes}` digest that ignored the tool name. The
 * `toolsList()` catalog and the `answerNativeTool` dispatcher are generated
 * from ONE table (TOOL_DEFS) so catalog and dispatch can never drift.
 *
 * Owners are injected, not imported: routes.js builds `deps.owners` from the
 * same session/backend/env the HTTP routes use, so a tool reads the real
 * domain (backend.inspect status, session phase/history/operations, the
 * single error catalog). A tool that has no reachable owner returns
 * `{ok:false, errorId}` — never a fabricated success.
 */

import { ERROR_CATALOG, statusOf } from './error-catalog.js'

/** Per-tool real input schema (object, no extra fields). */
const obj = (properties = {}, required = []) => ({
  type: 'object', additionalProperties: false, properties, required,
})

const str = { type: 'string' }
const int = { type: 'integer' }
const bool = { type: 'boolean' }

/** limit: absent/NaN → fallback; otherwise clamped into 1..cap. */
const clampLimit = (value, fallback, cap) => {
  if (value === undefined || value === null) return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.min(Math.trunc(n), cap))
}

const DESCRIPTIONS = {
  'sandbox.profile.list': 'List registered sandbox profiles (id, version, scope, digest, ready).',
  'sandbox.profile.describe': 'Describe one profile by id.',
  'sandbox.instance.ensure': 'Ensure the Kitesurf instance exists and is usable: adopt a running container, start a stopped one, or prepare a missing one. With sessionId, registers the caller against the env container.',
  'sandbox.instance.start': 'Start the environment container.',
  'sandbox.instance.stop': 'Stop the environment container (suspends the engine; page is lost).',
  'sandbox.instance.restart': 'Stop then start the environment container.',
  'sandbox.instance.status': 'Full environment snapshot: container/engine/page/DOM/bridge planes, ports, ready flag.',
  'sandbox.diagnostics': 'Same diagnostics document as GET /nano-local-sandbox/diagnostics: planes, targets, console/network tails, operations, hints.',
  'sandbox.console': 'Page console entries captured over the pane CDP socket (log/warn/error/exception/log-domain). {limit:1..400}',
  'sandbox.operations': 'Route-call trace with status, errorId and duration. {limit:1..100, errorsOnly:boolean}',
  'sandbox.error_catalog': 'errorId → HTTP status → cause → next-step catalog. Reference data, not state.',
  'sandbox.targets': 'Live CDP Target.getTargets on the pane socket — the real page target list.',
  'sandbox.history': 'Browse history (durable on the instance state volume): grouped by url with visit counts.',
  'sandbox.dom': 'The rendered page document: url + serializable DOM size, from the live engine.',
  'sandbox.elements': 'Elements tree read via DOM.getDocument (tag/id/class/children) up to {limit} nodes.',
  'sandbox.selftest': 'Run the 11-check environment self-test and return per-check results.',
  'sandbox.network': 'Network ring entries from the pane CDP session (pending and finished). {limit:1..200}',
  'sandbox.ports': 'Published port truth: which host ports the env container owns and what the effective bases are.',
  'sandbox.recovery_plan': 'Ordered recovery steps for the CURRENT snapshot (container missing/stopped, engine down, bridge down).',
  'sandbox.bridge_health': 'MCP bridge /health: conns, writer/humanHold control state, diagnostics freshness.',
}

/**
 * The single source table: name → { schema, run }.
 * `run(owners, params, state)` returns the tool's `data` payload
 * ({ok:true,data} is wrapped by the dispatcher). Throw → {ok:false,errorId}.
 * The `owners` shape is defined by routes.js's buildOwners().
 */
const TOOL_DEFS = {
  // ---- profile plane -----------------------------------------------------
  'sandbox.profile.list': {
    schema: obj(),
    run: (o) => o.profiles?.list?.() ?? [],
  },
  'sandbox.profile.describe': {
    schema: obj({ id: str }, ['id']),
    run: (o, p) => {
      const profile = o.profiles?.describe?.(p.id)
      if (!profile) return { ok: false, errorId: 'sandbox.profile.unknown', error: `no profile ${p.id}` }
      return profile
    },
  },
  // ---- instance lifecycle -------------------------------------------------
  'sandbox.instance.ensure': {
    schema: obj({ sessionId: str, policy: { type: 'object', additionalProperties: true } }),
    run: (o, p) => o.instances.ensure({ sessionId: p.sessionId, policy: p.policy }),
  },
  'sandbox.instance.start': {
    schema: obj({ sessionId: str }),
    run: (o, p) => o.instances.start({ sessionId: p.sessionId }),
  },
  'sandbox.instance.stop': {
    schema: obj({ sessionId: str }),
    run: (o, p) => o.instances.stop({ sessionId: p.sessionId }),
  },
  'sandbox.instance.restart': {
    schema: obj({ sessionId: str }),
    run: (o, p) => o.instances.restart({ sessionId: p.sessionId }),
  },
  'sandbox.instance.status': {
    schema: obj({ sessionId: str }),
    run: (o, p) => o.instances.status({ sessionId: p.sessionId }),
  },
  // ---- observability plane (real domain reads) -----------------------------
  'sandbox.diagnostics': {
    schema: obj(),
    // The real owner is diagnostics.read; state.diagnostics remains the
    // fixture/test seam, never a fabricated success.
    run: (o) => o.diagnostics?.read?.() ?? o.state?.diagnostics ?? { ok: false, errorId: 'kitesurf.diag.stale', error: 'diagnostics owner unavailable' },
  },
  'sandbox.console': {
    schema: obj({ limit: int, level: str }),
    run: (o, p) => {
      const rows = o.state?.console ?? []
      const levels = typeof p.level === 'string' ? p.level.split(',').map((s) => s.trim()).filter(Boolean) : null
      const filtered = levels ? rows.filter((row) => levels.includes(row.level)) : rows
      // Clamp to the advertised 1..400 — a slice(-NaN/-0) returns the whole
      // ring and defeats the bound the schema promises.
      return filtered.slice(-clampLimit(p.limit, 200, 400))
    },
  },
  'sandbox.operations': {
    schema: obj({ limit: int, errorsOnly: bool }),
    run: (o, p) => {
      let rows = o.state?.operations ?? []
      if (p.errorsOnly === true) rows = rows.filter((row) => row.ok === false || (row.status && row.status >= 400))
      return rows.slice(-clampLimit(p.limit, 30, 100))
    },
  },
  'sandbox.error_catalog': {
    schema: obj(),
    run: () => ERROR_CATALOG.map((row) => ({ id: row.example, status: row.status, cause: row.cause, next: row.next })),
  },
  'sandbox.targets': {
    schema: obj(),
    run: (o) => o.targets?.list?.() ?? [],
  },
  'sandbox.history': {
    schema: obj({ limit: int }),
    run: (o, p) => {
      // Grouped like REST /browse-history — raw visit lists made the tool
      // return N copies of the same URL where the contract promises counts.
      const groups = new Map()
      for (const row of o.state?.history ?? []) {
        const url = row?.url
        if (!url) continue
        const g = groups.get(url) || { url, count: 0, lastAt: null, title: row.title || '' }
        g.count += 1
        const at = row.at || row.lastAt || null
        if (at && (!g.lastAt || at > g.lastAt)) g.lastAt = at
        if (!g.title && row.title) g.title = row.title
        groups.set(url, g)
      }
      return [...groups.values()].sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || ''))).slice(0, clampLimit(p.limit, 30, 100))
    },
  },
  'sandbox.dom': {
    schema: obj(),
    run: (o) => o.page?.dom?.() ?? { ok: false, errorId: 'kitesurf.dom.empty', error: 'no serializable document' },
  },
  'sandbox.elements': {
    schema: obj({ limit: int, selector: str }),
    run: (o, p) => o.page?.elements?.({ limit: clampLimit(p.limit, 40, 220), selector: p.selector }) ?? { ok: false, errorId: 'kitesurf.elements.empty', error: 'no document root' },
  },
  'sandbox.selftest': {
    schema: obj(),
    run: (o) => o.selftest?.run?.() ?? { ok: false, errorId: 'sandbox.selftest.unavailable' },
  },
  'sandbox.network': {
    schema: obj({ limit: int, failedOnly: bool }),
    run: (o, p) => {
      let rows = (o.state?.network ?? []).filter((row) => row && !row.gap)
      if (p.failedOnly === true) rows = rows.filter((row) => row.failed || (row.status && row.status >= 400))
      return rows.slice(-clampLimit(p.limit, 200, 400))
    },
  },
  'sandbox.ports': {
    schema: obj(),
    run: (o) => o.ports?.list?.() ?? [],
  },
  'sandbox.recovery_plan': {
    schema: obj(),
    run: (o) => o.recovery?.plan?.() ?? [],
  },
  'sandbox.bridge_health': {
    schema: obj(),
    run: (o) => o.bridge?.health?.() ?? { ok: false, errorId: 'kitesurf.control.bridge', error: 'bridge unreachable' },
  },
}

export const SANDBOX_TOOL_NAMES = Object.freeze(Object.keys(TOOL_DEFS))

/** tools/list — generated from the same table the dispatcher reads. */
export function toolsList() {
  return SANDBOX_TOOL_NAMES.map((name) => ({
    name,
    description: DESCRIPTIONS[name] || name,
    inputSchema: TOOL_DEFS[name].schema,
  }))
}

const JSON_TYPES = {
  string: (v) => typeof v === 'string',
  integer: (v) => Number.isInteger(v),
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  boolean: (v) => typeof v === 'boolean',
  object: (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
  array: (v) => Array.isArray(v),
}

/** Validate params against a tool's schema: required + no-extra + JSON types + enum. */
function validateParams(def, params) {
  const p = params == null ? {} : params
  if (typeof p !== 'object' || Array.isArray(p)) return { ok: false, errorId: 'sandbox.params.shape', error: 'params must be an object', status: 400 }
  const props = def.schema.properties ?? {}
  for (const key of Object.keys(p)) {
    if (!(key in props)) return { ok: false, errorId: 'sandbox.params.extra', error: `unexpected field '${key}'`, status: 400 }
  }
  for (const key of def.schema.required ?? []) {
    if (p[key] === undefined) return { ok: false, errorId: 'sandbox.params.required', error: `missing required field '${key}'`, status: 400 }
  }
  for (const [key, spec] of Object.entries(props)) {
    const value = p[key]
    if (value === undefined) continue
    const check = spec?.type ? JSON_TYPES[spec.type] : null
    if (check && !check(value)) return { ok: false, errorId: 'sandbox.params.type', error: `field '${key}' must be ${spec.type}`, status: 400 }
    if (spec?.enum && !spec.enum.includes(value)) return { ok: false, errorId: 'sandbox.params.enum', error: `field '${key}' must be one of ${spec.enum.join(', ')}`, status: 400 }
  }
  return { ok: true, params: p }
}

/**
 * Dispatch a tools/call to the tool's real owner.
 * `owners` = the injected domain plane (built in routes.js); `state` is the
 * live session/diagnostics snapshot. Returns `{ok:true,data}` or
 * `{ok:false,errorId,error}` — never the old uniform digest.
 *
 * Async-capable: `run` may return a promise; the HTTP layer awaits it.
 */
export async function answerNativeTool(name, owners = {}, state = {}, params = {}) {
  const def = TOOL_DEFS[name]
  if (!def) return { ok: false, errorId: 'kitesurf.tool.unknown', error: `no sandbox tool '${name}'` }
  const check = validateParams(def, params)
  if (!check.ok) return check
  try {
    const data = await def.run(owners, check.params, state)
    if (data && data.ok === false) return data
    return { ok: true, data }
  } catch (error) {
    return {
      ok: false,
      errorId: error.errorId ?? 'sandbox.tool.failed',
      error: error.message ?? String(error),
      status: statusOf(error.errorId ?? 'sandbox.tool.failed'),
    }
  }
}
