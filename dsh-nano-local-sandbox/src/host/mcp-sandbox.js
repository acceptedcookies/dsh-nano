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
    run: (o) => o.state?.diagnostics ?? null,
  },
  'sandbox.console': {
    schema: obj({ limit: int }),
    run: (o, p) => o.state?.console?.tail?.(p.limit ?? 200) ?? [],
  },
  'sandbox.operations': {
    schema: obj({ limit: int }),
    run: (o, p) => (o.state?.operations ?? []).slice(-(p.limit ?? 30)),
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
    run: (o, p) => (o.state?.history ?? []).slice(-(p.limit ?? 30)),
  },
  'sandbox.dom': {
    schema: obj(),
    run: (o) => o.page?.dom?.() ?? { ok: false, errorId: 'kitesurf.dom.empty', error: 'no serializable document' },
  },
  'sandbox.elements': {
    schema: obj({ limit: int }),
    run: (o, p) => o.page?.elements?.(p.limit ?? 40) ?? { ok: false, errorId: 'kitesurf.elements.empty', error: 'no document root' },
  },
  'sandbox.selftest': {
    schema: obj(),
    run: (o) => o.selftest?.run?.() ?? { ok: false, errorId: 'sandbox.selftest.unavailable' },
  },
  'sandbox.network': {
    schema: obj({ limit: int }),
    run: (o, p) => (o.state?.network ?? []).slice(-(p.limit ?? 200)),
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
    description: name,
    inputSchema: TOOL_DEFS[name].schema,
  }))
}

/** Validate params against a tool's schema (shallow: required + no-extra-fields). */
function validateParams(def, params) {
  const p = params == null ? {} : params
  if (typeof p !== 'object' || Array.isArray(p)) return { ok: false, errorId: 'sandbox.params.shape', error: 'params must be an object' }
  const props = def.schema.properties ?? {}
  for (const key of Object.keys(p)) {
    if (!(key in props)) return { ok: false, errorId: 'sandbox.params.extra', error: `unexpected field '${key}'` }
  }
  for (const key of def.schema.required ?? []) {
    if (p[key] === undefined) return { ok: false, errorId: 'sandbox.params.required', error: `missing required field '${key}'` }
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
