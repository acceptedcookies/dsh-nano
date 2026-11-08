/** Host half. Exposes an enriched model catalog for the browser selector. */

export const name = 'nano-model-selector'

export const inject = ['llm', 'webServer', 'connection']

const ROUTE = '/nano-model-selector/catalog'

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
  return async (req, res) => {
    // Gate reads too: the catalog discloses the deployment's provider/model
    // fingerprint, so it must not answer unauthenticated pages or LAN clients.
    const rejection = ctx.get('connection')?.requestRejection(req)
    if (rejection !== undefined) { res.statusCode = rejection; res.end(); return }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('allow', 'GET, HEAD')
      sendJson(res, 405, { error: `method ${req.method} is not allowed` })
      return
    }
    try {
      if (cache === null || Date.now() - cache.at > CATALOG_TTL_MS) {
        const payload = await build()
        cache = { at: Date.now(), payload }
      }
      sendJson(res, 200, { ...cache.payload, generatedAt: cache.at })
    } catch (error) {
      sendJson(res, 500, { error: messageOf(error) })
    }
  }
}

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE,
    handler: catalogHandler(ctx),
  }), 'nano-model-selector: catalog route')
}
