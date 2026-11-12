/** Host half. Exposes an enriched model catalog and the media engine routes for the browser selector. */

import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { defaultEngine, imagineSkill, imagineStub, readEngine, scanEngines, writeEngine } from './lib/host-media.js'
import { ensurePerfReviewHost, LIB_VERSION } from './lib/perf-review-host.js'
import { registerRoutes } from './lib/route-guard.js'
import { ROUTE_TABLE, PLUGIN } from './lib/route-table.js'

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

/** Plugin-private state file holding the chosen media engine. */
const STATE_PATH = join(
  process.env.DSH_DATA_DIR ?? process.env.DSH_HOME ?? join(homedir(), '.dsh'),
  'plugins', 'nano-model-selector', 'media-engine.json',
)

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

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  const imagine = registerImagine(ctx)
  ctx.effect(() => () => imagine.dispose(), 'nano-model-selector: imagine skill')

  // All web routes register through dsh-host-route-guard (P1-05 / T-O-7): the
  // guard owns requestRejection and the uniform 405; handlers keep the work.
  const media = mediaHandlers(ctx, imagine)
  registerRoutes(ctx, [
    { path: ROUTE, methods: ['GET', 'HEAD'], handler: catalogHandler(ctx) },
    { path: ENGINES_ROUTE, methods: ['GET', 'HEAD'], handler: media.engines },
    { path: ENGINE_ROUTE, methods: ['GET', 'HEAD', 'PUT'], handler: media.engine },
  ], { table: ROUTE_TABLE, plugin: PLUGIN })
}
