/** HTTP routes the client half calls: settings read/write and a status probe. */

import { clearIdentity, readIdentity, writeIdentity } from './credentials.js'

export const PREFIX = '/nano-shared-workspace'

/** Error message extraction that never leaks a stack to the response. */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(payload)
}

/** Read the whole request body (bounded: settings payloads are a few hundred bytes). */
async function readBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > 64 * 1024) throw new Error('request body too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** `undefined` for absent fields so the caller can tell "not sent" from "sent empty". */
const field = value => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined)

/** One masked form of a secret for the settings card's "configured" hint. */
const mask = secret => (typeof secret === 'string' && secret.length >= 8
  ? `${secret.slice(0, 4)}…${secret.slice(-4)}`
  : undefined)

/**
 * @param ctx - host context.
 * @param config - validated Config value `{endpoint, bucket, region, prefix}`.
 */
export function createRoutes(ctx, config) {
  return {
    '/settings': {
      method: 'GET',
      async run() {
        const identity = await readIdentity(ctx)
        return {
          endpoint: config.endpoint,
          bucket: config.bucket,
          region: config.region,
          username: identity?.username ?? null,
          configured: identity?.configured === true,
          credentialSource: identity?.source ?? null,
          maskedSecret: mask(identity?.accessKey ?? identity?.token) ?? null,
        }
      },
    },
    '/settings/update': {
      method: 'PUT',
      async run(req) {
        const body = JSON.parse(await readBody(req) || '{}')
        const username = field(body?.username)
        const token = field(body?.token)
        const accessKey = field(body?.accessKey)
        if (username === undefined && token === undefined && accessKey === undefined) {
          return { ok: false, error: 'nothing to update' }
        }
        await writeIdentity(ctx, { username, token, accessKey })
        return { ok: true }
      },
    },
    '/settings/clear': {
      method: 'POST',
      async run() {
        await clearIdentity(ctx)
        return { ok: true }
      },
    },
    '/status': {
      method: 'GET',
      async run() {
        const identity = await readIdentity(ctx)
        return {
          configured: identity?.configured === true,
          username: identity?.username ?? null,
          // Phase-0: no sync engine yet. These rows shape the client contract.
          state: identity?.configured === true ? 'idle' : 'unconfigured',
          sessions: [],
        }
      },
    },
  }
}

/**
 * Register every route on the web server, gated by the connection's request admission.
 * @param ctx - host context providing `webServer` and `connection`.
 * @param routes - the handlers built by {@link createRoutes}.
 * @returns one disposer per registered route.
 */
export function registerRoutes(ctx, routes) {
  const connection = () => ctx.get('connection')
  const disposers = []
  for (const [suffix, route] of Object.entries(routes)) {
    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: `${PREFIX}${suffix}`,
      handler: async (req, res) => {
        const rejection = connection()?.requestRejection(req)
        if (rejection !== undefined) {
          res.statusCode = rejection
          res.end()
          return
        }
        if (req.method !== route.method) {
          res.setHeader('allow', route.method)
          sendJson(res, 405, { error: `method ${req.method} is not allowed` })
          return
        }
        try {
          sendJson(res, 200, await route.run(req))
        } catch (error) {
          sendJson(res, 400, { error: messageOf(error) })
        }
      },
    }))
  }
  return disposers
}
