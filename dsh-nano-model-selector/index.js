/** Host half. Exposes an enriched model catalog and the media engine routes for the browser selector. */

import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'
import { defaultEngine, imagineSkill, imagineStub, readEngine, scanEngines, writeEngine } from './lib/host-media.js'
import { ensurePerfReviewHost, LIB_VERSION } from './lib/perf-review-host.js'
import { registerRoutes } from './lib/route-guard.js'
import { compactRuntime } from './lib/compact-runtime.js'
import { COMPACTION_BUNDLE_NAME, createBundleInventory } from './lib/bundle-inventory.js'
import { BINDING_TABLE, PLUGIN } from './lib/bindings.js'
import {
  mergePutBody, readState, validateMasterOrder, validatePutBody, writeState,
} from './lib/compact-policy.js'

export const name = 'nano-model-selector'

export const inject = ['llm', 'webServer', 'connection', 'skills']

/** Package version for perf-review meta; index.js is unbundled, so read it at runtime. */
function pluginVersion() {
  try {
    return JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version
  } catch {
    return undefined
  }
}

/** Host-side observability; identity wrapper unless DSH_PERF_REVIEW=1. */
const review = ensurePerfReviewHost().hostJoin('nano-model-selector', {
  version: pluginVersion(),
  libVersion: LIB_VERSION,
})

const ROUTE = '/nano-model-selector/catalog'
const ENGINES_ROUTE = '/nano-model-selector/media-engines'
const ENGINE_ROUTE = '/nano-model-selector/media-engine'
const ASYNC_COMPACT_ROUTE = '/nano-model-selector/async-compact'
/**
 * The bundle inventory lives on its own read surface. `pluginManager.listBundles()`
 * costs ~0.9 s of blocking disk work, so it must never ride the status poll the
 * session-header badge makes — that turned every badge tick into an event-loop
 * stall and took the host down behind Caddy (502). Only the settings panel,
 * on open, asks for this.
 */
const ASYNC_COMPACT_BUNDLE_ROUTE = '/nano-model-selector/async-compact/bundle'
/** -20⑦: panel forwards the bundle flip through this one route (browser half cannot reach pluginManager). */
const ASYNC_COMPACT_SWITCH_ROUTE = '/nano-model-selector/async-compact/switch'

/** Plugin-private state file holding the chosen media engine. */
const STATE_PATH = join(
  process.env.DSH_DATA_DIR ?? process.env.DSH_HOME ?? join(homedir(), '.dsh'),
  'plugins', 'nano-model-selector', 'media-engine.json',
)

/** Async-compaction policy file — the sole writable authority while ON (-11). */
const ASYNC_COMPACT_PATH = join(
  process.env.DSH_DATA_DIR ?? process.env.DSH_HOME ?? join(homedir(), '.dsh'),
  'plugins', 'nano-model-selector', 'async-compact.json',
)

/**
 * Async-compaction audit ledger directory (DNMS01 observability).
 *
 * The companion bundle `dsh-nano-model-selector-compaction` is the ONLY writer:
 * it appends one JSON line per engine decision to `<sessionId>.jsonl` here.
 * This half only reads it. The location is the same plugin state directory the
 * policy file already lives in — a published contract between DNMS and its own
 * companion, not a private side channel between unrelated plugins.
 */
const ASYNC_HISTORY_DIR = join(dirname(ASYNC_COMPACT_PATH), 'async-history')

/** Ledger read cap: the newest N records are enough for one dialog. */
const ASYNC_HISTORY_LIMIT = 200

/** Freshness windows for the live phase derived from the ledger tail. */
const ASYNC_ARMED_TTL_MS = 15 * 60 * 1000
const ASYNC_RUNNING_TTL_MS = 3 * 60 * 1000
const ASYNC_FAILED_TTL_MS = 10 * 60 * 1000
const ASYNC_COMMITTED_TTL_MS = 10 * 60 * 1000

/** Session ids only; anything else could escape the ledger directory. */
const ASYNC_HISTORY_ID = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,128}$/

/** Reuse a built catalog this long; the selector does not need per-open freshness. */
const CATALOG_TTL_MS = 15000

/** @param {unknown} value */
function messageOf(value) {
  return value instanceof Error ? value.message : String(value)
}

/** @param {string} providerId @param {string} providerName @param {any[]} models */
async function groupOf(ctx, provider, models) {
  // Resolve every model in parallel instead of one credential/metadata hop at a
  // time; on a large registry the serial chain dominated the whole request.
  const entries = await Promise.all(models.map(async model => {
    let resolved
    try {
      resolved = await ctx.llm.resolveModelInfo(provider.id, model.id)
    } catch {
      resolved = undefined
    }
    const description = model.description ?? resolved?.description
    const badge = model.badge ?? resolved?.badge
    const contextWindow = resolved?.context?.contextWindow
    const maxTokens = resolved?.defaultMaxTokens
    const inputs = resolved?.inputModalities ?? model.inputModalities
    const reasoning = resolved?.reasoning
    return {
      id: model.id,
      name: model.name,
      ...(description === undefined ? {} : { description }),
      ...(badge === undefined ? {} : { badge }),
      ...(contextWindow === undefined ? {} : { contextWindow }),
      ...(maxTokens === undefined ? {} : { maxTokens }),
      ...(inputs === undefined ? {} : { inputModalities: [...inputs] }),
      ...(reasoning === undefined ? {} : {
        reasoning: {
          efforts: reasoning.efforts.map(effort => ({
            id: effort.id,
            name: effort.name,
            ...(effort.description === undefined ? {} : { description: effort.description }),
          })),
          ...(reasoning.defaultEffort === undefined ? {} : { defaultEffort: reasoning.defaultEffort }),
        },
      }),
    }
  }))
  return { id: provider.id, name: provider.name, models: entries }
}

/** Build one detached catalog payload from the live LLM registry. */
async function buildCatalog(ctx) {
  const providers = ctx.llm.listProviders()
  const settled = await Promise.all(providers.map(async provider => {
    try {
      const models = await ctx.llm.listModels(provider.id)
      if (models.length === 0) return { group: null, failure: null }
      return { group: await groupOf(ctx, provider, models), failure: null }
    } catch (error) {
      return { group: null, failure: { id: provider.id, name: provider.name, message: messageOf(error) } }
    }
  }))
  const groups = []
  const failures = []
  for (const result of settled) {
    if (result.group !== null) groups.push(result.group)
    if (result.failure !== null) failures.push(result.failure)
  }
  return { groups, failures }
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/**
 * Serve the catalog behind the connection's request admission, with a short
 * cache + in-flight dedupe so each panel open does not rebuild the registry.
 * The whole route (TTL hit or miss) is timed by review.hostSpan('catalog').
 * @param ctx - host context.
 */
function catalogHandler(ctx) {
  let cache = /** @type {{ at: number, payload: { groups: any[], failures: any[] } } | null} */ (null)
  let inflight = /** @type {Promise<{ groups: any[], failures: any[] }> | null} */ (null)
  const build = () => {
    if (inflight === null) {
      inflight = buildCatalog(ctx).finally(() => { inflight = null })
    }
    return inflight
  }
  return (req, res) => review.hostSpan('catalog', async () => {
    // The guard owns requestRejection + the method gate; this handler only runs
    // for admitted GET/HEAD (the catalog still discloses the deployment's
    // provider/model fingerprint, so it stays behind that fence).
    try {
      if (cache === null || Date.now() - cache.at > CATALOG_TTL_MS) {
        const payload = await build()
        cache = { at: Date.now(), payload }
      }
      sendJson(res, 200, { ...cache.payload, generatedAt: cache.at })
    } catch (error) {
      sendJson(res, 500, { error: messageOf(error) })
    }
  })
}

/** Read at most `maxBytes` of request body as UTF-8 JSON. */
function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > maxBytes) { req.destroy(); reject(new Error('body too large')); return }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try { resolve(chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
      catch { reject(new Error('invalid JSON body')) }
    })
    req.on('error', reject)
  })
}

/**
 * Register (or re-register) the `imagine` skill.
 * Resolution order: the persisted user choice → auto-pick a detected engine
 * (grok first) → a stub that guides the user to the Media tab. A stub is
 * always registered so `/imagine` exists even on a fresh install.
 * @param ctx - host context.
 */
function registerImagine(ctx) {
  let dispose = null
  const refresh = () => {
    dispose?.()
    dispose = null
    const persisted = readEngine(STATE_PATH)
    const engine = persisted ?? defaultEngine()
    const skill = engine !== null ? imagineSkill(engine) ?? imagineStub() : imagineStub()
    dispose = ctx.skills.register({
      ...skill,
      source: 'runtime',
      invocation: { modelInvocable: false, userInvocable: true },
      provider: 'nano-model-selector',
    })
  }
  refresh()
  return { refresh, dispose: () => dispose?.() }
}

/**
 * Media-engine handlers, one per route-table path. The guard owns
 * requestRejection + the 405 gate; these keep only the work: engines scan,
 * engine read-back on GET/HEAD, engine write + skill re-register on PUT.
 * @param ctx - host context.
 * @param imagine - the registerImagine() handle (refresh re-registers /imagine).
 */
function mediaHandlers(ctx, imagine) {
  const engines = (req, res) => {
    sendJson(res, 200, scanEngines())
  }
  const engine = async (req, res) => {
    if (req.method === 'PUT') {
      try {
        const body = await readBody(req, 16384)
        const detected = scanEngines().engines
        const wanted = detected.find(item => item.key === body.engine)
        if (wanted === undefined) { sendJson(res, 400, { error: 'unknown media engine' }); return }
        writeEngine(STATE_PATH, wanted.key)
        imagine.refresh()
        sendJson(res, 200, { engine: wanted.key })
      } catch (error) {
        sendJson(res, 400, { error: messageOf(error) })
      }
      return
    }
    // GET/HEAD: report the persisted choice, falling back to the auto-picked
    // engine so a fresh install still shows which engine `/imagine` is wired to.
    const persisted = readEngine(STATE_PATH)
    sendJson(res, 200, { engine: persisted ?? defaultEngine(), explicit: persisted !== null })
  }
  return { engines, engine }
}

/**
 * Resolve the nominal context window for a policy's model target, when one is
 * routed. An empty {provider,model} pair means "reuse the routed target" and
 * yields no resolvable window here (the Provider resolves it at runtime).
 * @returns context window in tokens, or null when unresolvable.
 */
async function policyWindow(ctx, model) {
  if (!model || model.provider === '' || model.model === '') return null
  try {
    const info = await ctx.llm.resolveModelInfo(model.provider, model.model)
    const w = info?.context?.contextWindow
    return typeof w === 'number' && w > 0 ? w : null
  } catch {
    return null
  }
}

/**
 * `?sessionId=` opts into the audit ledger; without it the response keeps its
 * original shape so existing callers see no change.
 * @param {import('node:http').IncomingMessage} req
 * @returns {ReturnType<typeof readAsyncHistory>|undefined}
 */
function historyQuery(req) {
  try {
    const sessionId = new URL(req.url ?? '/', 'http://localhost').searchParams.get('sessionId')
    return sessionId === null || sessionId.length === 0 ? undefined : readAsyncHistory(sessionId)
  } catch {
    return undefined
  }
}

/**
 * Read one session's async-compaction ledger (newest last).
 *
 * Degrades instead of failing: a missing ledger is `records: []` with
 * `degraded: null` (the engine simply never decided anything for this
 * session), while an unreadable one reports `degraded: 'history-read-failed'`
 * so the dialog can say why the timeline is empty.
 *
 * @param {string} sessionId
 * @returns {{sessionId: string, records: object[], summary: object, degraded: string|null}}
 */
export function readAsyncHistory(sessionId) {
  const empty = {
    sessionId,
    records: [],
    summary: { arm: 0, claim: 0, commit: 0, drop: 0, skip: 0, lastCommitAt: null, lastDropReason: null },
    phase: { state: 'idle', since: null, model: null, promptVersion: null, reason: null, detail: null },
    degraded: null,
  }
  if (!ASYNC_HISTORY_ID.test(sessionId)) return { ...empty, degraded: 'history-read-failed' }
  let text
  try {
    text = readFileSync(join(ASYNC_HISTORY_DIR, `${sessionId}.jsonl`), 'utf8')
  } catch (error) {
    // ENOENT is the normal "no decisions yet" case, not a degradation.
    return error?.code === 'ENOENT' ? empty : { ...empty, degraded: 'history-read-failed' }
  }
  const records = []
  for (const line of text.split('\n')) {
    if (line.length === 0) continue
    try {
      const record = JSON.parse(line)
      if (record !== null && typeof record === 'object' && typeof record.kind === 'string') records.push(record)
    } catch { /* a torn tail line is not a read failure */ }
  }
  const summary = { ...empty.summary }
  for (const record of records) {
    if (record.kind in summary) summary[record.kind] += 1
    if (record.kind === 'commit') summary.lastCommitAt = record.at ?? null
    if (record.kind === 'drop') summary.lastDropReason = record.reason ?? null
  }
  return {
    sessionId,
    records: records.slice(-ASYNC_HISTORY_LIMIT),
    summary,
    phase: derivePhase(records.at(-1)),
    degraded: null,
  }
}

/**
 * Live phase of the async lane, derived from the ledger tail.
 *
 * The engine keeps its episode state in memory only, so the ledger is the one
 * place the browser can learn "an episode is queued / running right now". The
 * derivation is deliberately conservative: a record older than its window is
 * treated as settled, because a stale `arm` (host restarted mid-episode) must
 * never leave a permanent "compacting…" line on screen.
 *
 * @param {object|undefined} tail - newest ledger record.
 * @returns {{state: 'idle'|'armed'|'running'|'failed', since: string|null, model: object|null, promptVersion: string|null, reason: string|null, detail: string|null}}
 */
export function derivePhase(tail) {
  const idle = { state: 'idle', since: null, model: null, promptVersion: null, reason: null, detail: null }
  if (tail === undefined || typeof tail.at !== 'string') return idle
  const at = Date.parse(tail.at)
  if (!Number.isFinite(at)) return idle
  const age = Date.now() - at
  const model = tail.target ?? null
  const promptVersion = typeof tail.promptVersion === 'string' ? tail.promptVersion : null
  // A claim is bounded by the engine's own 120 s episode timeout plus margin;
  // an arm waits for the next idle boundary, which can be much later.
  if (tail.kind === 'claim' && age <= ASYNC_RUNNING_TTL_MS) {
    return { state: 'running', since: tail.at, model, promptVersion, reason: null, detail: null }
  }
  if (tail.kind === 'arm' && age <= ASYNC_ARMED_TTL_MS) {
    return { state: 'armed', since: tail.at, model, promptVersion, reason: null, detail: null }
  }
  if (tail.kind === 'drop' && age <= ASYNC_FAILED_TTL_MS) {
    return {
      state: 'failed',
      since: tail.at,
      model,
      promptVersion,
      reason: tail.reason ?? null,
      detail: tail.detail ?? null,
    }
  }
  // A fresh commit is reported as `committed`, not `idle`: the shell's own
  // 「上下文已压缩」 row does not say WHICH lane produced it, so the async
  // attribution has to come from us, and it has to outlive the moment of
  // commit long enough to be read.
  if (tail.kind === 'commit' && age <= ASYNC_COMMITTED_TTL_MS) {
    return {
      state: 'committed',
      since: tail.at,
      model,
      promptVersion,
      reason: null,
      detail: null,
      compactionId: typeof tail.compactionId === 'string' ? tail.compactionId : null,
      tokens: typeof tail.tokens === 'number' ? tail.tokens : null,
      records: typeof tail.records === 'number' ? tail.records : null,
    }
  }
  return idle
}

/**
 * GET/PUT /nano-model-selector/async-compact (L3, PUT bodyLimit 16384,
 * sessionBinding:false — T-O-DNMS01-15).
 * GET -> {...policy, effective:{pin,windowMin,dcs}, runtime:{fill,lastCompaction}};
 * GET ?sessionId=<id> additionally returns `history` (the companion's audit
 * ledger for that session) — additive only, the policy shape is unchanged.
 * PUT -> partial update: validatePutBody -> optional model route check ->
 * merge -> master-order -> atomic write. Every rejection is 400 with the
 * closed error-code set; nothing is written on failure.
 */
function asyncCompactHandlers(ctx, runtimeHandle) {
  const payload = async policy => {
    const W = await policyWindow(ctx, policy.model)
    const effective = W === null
      ? { pin: null, windowMin: null, dcs: [] }
      : (() => {
        const r = validateMasterOrder(policy, W)
        return r.ok ? { pin: r.effectivePin, windowMin: r.windowMin, dcs: r.dcs } : { pin: null, windowMin: null, dcs: [], invalid: r.reason }
      })()
    const rt = runtimeHandle?.runtime(null, W, null) ?? { fill: null, lastCompaction: null, degraded: null }
    return {
      ...policy,
      effective,
      runtime: rt,
    }
  }
  const handler = async (req, res) => {
    if (req.method === 'PUT') {
      try {
        const body = await readBody(req, 16384)
        const shape = validatePutBody(body)
        if (!shape.ok) { sendJson(res, 400, { ok: false, error: { code: 'invalid-schema', reason: shape.reason } }); return }
        const state = readState(ASYNC_COMPACT_PATH)
        if (!state.ok) { sendJson(res, 400, { ok: false, error: { code: 'state-read-failed', reason: state.reason } }); return }
        const next = mergePutBody(state.policy, body)
        const model = next.model
        // A half-empty pair is never meaningful: either both fields are set or both empty.
        if (model !== undefined && (model.provider === '') !== (model.model === '')) {
          sendJson(res, 400, { ok: false, error: { code: 'invalid-model', reason: 'model pair must be fully set or fully empty' } }); return
        }
        const W = await policyWindow(ctx, model)
        // Always run master-order validation (W-independent checks are mandatory);
        // W only adds the DC-1 + effectivePin derivations on top.
        const order = W === null
          ? validateMasterOrder(next, 1000000) /* arbitrary large W for ordering checks */
          : validateMasterOrder(next, W)
        if (!order.ok) { sendJson(res, 400, { ok: false, error: { code: order.code, reason: order.reason } }); return }
        // Model-route check: only when the merged target is a non-empty pair.
        if (model !== undefined && model.provider !== '') {
          if (W === null) { sendJson(res, 400, { ok: false, error: { code: 'invalid-model', reason: 'model target is not a registered route' } }); return }
        }
        const wrote = writeState(ASYNC_COMPACT_PATH, next)
        if (!wrote.ok) { sendJson(res, 400, { ok: false, error: { code: 'state-write-failed', reason: wrote.reason } }); return }
        sendJson(res, 200, { ok: true, policy: await payload(next) })
      } catch (error) {
        sendJson(res, 400, { ok: false, error: { code: error.message === 'body too large' ? 'body-too-large' : 'invalid-json-body', reason: messageOf(error) } })
      }
      return
    }
    // GET/HEAD: the policy face. Deliberately NO bundle projection — see
    // ASYNC_COMPACT_BUNDLE_ROUTE. A read failure projects
    // `degraded:'state-read-failed'` (U4) instead of 500 — the panel never
    // derives state itself; PUT stays fail-closed.
    const state = readState(ASYNC_COMPACT_PATH)
    if (!state.ok) {
      // The ledger matters most in exactly this state: a broken policy is a
      // prime suspect for "async compaction stopped", so serve it too.
      const degradedHistory = historyQuery(req)
      sendJson(res, 200, {
        ok: true,
        policy: null,
        degraded: 'state-read-failed',
        missing: false,
        runtime: runtimeHandle?.runtime(null, null, 'state-read-failed') ?? { fill: null, lastCompaction: null, degraded: 'state-read-failed' },
        ...(degradedHistory === undefined ? {} : { history: degradedHistory }),
      })
      return
    }
    const history = historyQuery(req)
    sendJson(res, 200, {
      ok: true,
      policy: await payload(state.policy),
      missing: state.missing,
      ...(history === undefined ? {} : { history }),
    })
  }
  return handler
}

/**
 * GET/HEAD /nano-model-selector/async-compact/bundle — the read-only U1–U4
 * projection from the sanctioned inventory.
 *
 * Separate from the policy face on purpose: this is the only read that touches
 * `pluginManager.listBundles()`, it is expensive by nature, and only the
 * settings panel needs it. Keeping it off the status route is what keeps a
 * polling badge from stalling the host.
 */
function asyncCompactBundleHandler(bundleInventory) {
  return async (req, res) => {
    sendJson(res, 200, { ok: true, bundle: await bundleInventory.get() })
  }
}

/**
 * -20⑦: the panel's only write path for the takeover toggle. Forwards to the
 * sanctioned writer `pluginManager.setBundleEnabled` — not a second truth.
 * The inventory changes here, so the cached snapshot is dropped before it is
 * re-read for the response.
 */
async function asyncCompactSwitchHandler(ctx, req, res, bundleInventory) {
  try {
    const body = await readBody(req, 1024)
    if (typeof body?.enabled !== 'boolean') { sendJson(res, 400, { ok: false, error: { code: 'invalid-schema', reason: 'enabled must be a boolean' } }); return }
    const parsed = body
    const pm = ctx.get('pluginManager')
    if (pm === undefined || pm === null) { sendJson(res, 400, { ok: false, error: { code: 'manager-unavailable', reason: 'pluginManager service is not reachable' } }); return }
    try {
      const result = await pm.setBundleEnabled(COMPACTION_BUNDLE_NAME, parsed.enabled)
      bundleInventory.invalidate()
      const application = result?.application ?? 'applied'
      if (application === 'failed') {
        sendJson(res, 500, {
          ok: false,
          application,
          error: { code: 'switch-failed', reason: result?.reason ?? 'setBundleEnabled reported application failure' },
          ...(result?.restartReason === undefined ? {} : { restartReason: result.restartReason }),
          bundle: await bundleInventory.get(),
        })
        return
      }
      sendJson(res, 200, {
        ok: true,
        application,
        ...(result?.restartReason === undefined ? {} : { restartReason: result.restartReason }),
        bundle: await bundleInventory.get(),
      })
    } catch (error) {
      sendJson(res, 400, { ok: false, error: { code: 'switch-failed', reason: messageOf(error) } })
    }
  } catch (error) {
    sendJson(res, 400, { ok: false, error: { code: error.message === 'body too large' ? 'body-too-large' : 'switch-failed', reason: messageOf(error) } })
  }
}

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  const imagine = registerImagine(ctx)
  ctx.effect(() => () => imagine.dispose(), 'nano-model-selector: imagine skill')

  // All web routes register through dsh-host-route-guard (P1-05 / T-O-7): the
  // guard owns requestRejection and the uniform 405; handlers keep the work.
  const media = mediaHandlers(ctx, imagine)
  const runtimeHandle = compactRuntime(ctx)
  // One inventory reader for the whole plugin; every caller shares its cache
  // and its in-flight read. `plugin-manager/changed` fires from every
  // install/remove/update/enable operation, so the snapshot never outlives a
  // real change — the TTL only guards against a missed event.
  const bundleInventory = createBundleInventory(ctx)
  ctx.effect(
    () => ctx.on('plugin-manager/changed', () => bundleInventory.invalidate()),
    'nano-model-selector: bundle inventory invalidation',
  )
  registerRoutes(ctx, [
    { path: ROUTE, methods: ['GET', 'HEAD'], handler: catalogHandler(ctx) },
    { path: ENGINES_ROUTE, methods: ['GET', 'HEAD'], handler: media.engines },
    { path: ENGINE_ROUTE, methods: ['GET', 'HEAD', 'PUT'], handler: media.engine },
    { path: ASYNC_COMPACT_ROUTE, methods: ['GET', 'HEAD', 'PUT'], handler: asyncCompactHandlers(ctx, runtimeHandle) },
    { path: ASYNC_COMPACT_BUNDLE_ROUTE, methods: ['GET', 'HEAD'], handler: asyncCompactBundleHandler(bundleInventory) },
    { path: ASYNC_COMPACT_SWITCH_ROUTE, methods: ['POST'], handler: (req, res) => asyncCompactSwitchHandler(ctx, req, res, bundleInventory) },
  ], { table: BINDING_TABLE, plugin: PLUGIN })
}
