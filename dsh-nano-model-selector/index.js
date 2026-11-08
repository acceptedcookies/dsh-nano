/** Host half. Exposes an enriched model catalog for the browser selector. */

export const name = 'nano-model-selector'

export const inject = ['llm', 'webServer']

const ROUTE = '/nano-model-selector/catalog'

/** @param {unknown} value */
function messageOf(value) {
  return value instanceof Error ? value.message : String(value)
}

/** @param {string} providerId @param {string} providerName @param {any[]} models */
async function groupOf(ctx, provider, models) {
  const entries = []
  for (const model of models) {
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
    entries.push({
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
    })
  }
  return { id: provider.id, name: provider.name, models: entries }
}

/** Build one detached catalog response from the live LLM registry. */
async function buildCatalog(ctx) {
  const providers = ctx.llm.listProviders()
  const groups = []
  const failures = []
  for (const provider of providers) {
    try {
      const models = await ctx.llm.listModels(provider.id)
      if (models.length > 0) groups.push(await groupOf(ctx, provider, models))
    } catch (error) {
      failures.push({ id: provider.id, name: provider.name, message: messageOf(error) })
    }
  }
  return { groups, failures, generatedAt: Date.now() }
}

/** Serve one JSON catalog response. */
async function catalogResponse(ctx) {
  try {
    const body = JSON.stringify(await buildCatalog(ctx))
    return new Response(body, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: messageOf(error) }), {
      status: 500,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }
}

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE,
    resource: () => catalogResponse(ctx),
  }), 'nano-model-selector: catalog route')
}
