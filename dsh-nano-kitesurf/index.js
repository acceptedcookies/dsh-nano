/** Host half. The Kitesurf process stays outside this plugin; we only speak CDP. */

import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { registerRoutes } from './lib/route-guard.js'
import { ROUTE_TABLE, PLUGIN } from './lib/route-table.js'
import { browserSocketUrl, captureShot, currentUserAgent, currentViewport, fetchEngine, KitesurfError, openPage, pickElement, pickPoint, pageUrl, releaseEngine, scrollDelta, setBrowserSettings } from './lib/engine.js'
import { kitesurfSkill, nanoKiteSkill } from './lib/skill.js'
import { createNanoKite } from './lib/nano-kite.js'
import { ensureLocalContainer, stopLocalContainer } from './lib/container-engine.js'
import { hostSpan, perfSnapshot } from './lib/perf-host.js'

export const name = 'nano-kitesurf'
export const inject = ['webServer', 'connection', 'skills']

const STATUS_ROUTE = '/nano-kitesurf/status'
const LAST_ROUTE = '/nano-kitesurf/last'
const OPEN_ROUTE = '/nano-kitesurf/open'
const SHOT_ROUTE = '/nano-kitesurf/shot'
const PICK_ROUTE = '/nano-kitesurf/pick'
const SETTINGS_ROUTE = '/nano-kitesurf/settings'
const PERF_ROUTE = '/nano-kitesurf/perf-review/host'
const KITE_ROUTE = '/nano-kitesurf/kite'

const DEFAULT_ORIGIN = 'http://127.0.0.1:8787'

/** @type {{ at: string, point: { x: number, y: number }, targetId: string, element: object } | null} */
let lastPick = null
/** @type {{ at: string, errorId: string, error: string } | null} */
let lastError = null

export const Config = {
  '~standard': {
    version: 1,
    vendor: 'dsh-nano-kitesurf',
    validate(value) {
      const source = value && typeof value === 'object' ? value : {}
      const raw = source.httpBase ?? DEFAULT_ORIGIN
      let url
      try {
        url = new URL(raw)
      } catch {
        return { issues: [{ message: 'httpBase must be an http(s) URL' }] }
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { issues: [{ message: 'httpBase must be http or https' }] }
      }
      if (url.username || url.password) {
        return { issues: [{ message: 'httpBase must not carry credentials' }] }
      }
      const host = url.hostname
      const loopback = host === 'localhost' || host === '127.0.0.1' || host === '::1'
      const allowRemote = source.allowRemote === true
      if (!loopback && !allowRemote) {
        return { issues: [{ message: 'httpBase must be loopback unless allowRemote is true' }] }
      }
      const checkout = typeof source.checkout === 'string' && source.checkout ? source.checkout : undefined
      return { value: { httpBase: url.origin, allowRemote, checkout } }
    },
  },
}

function pluginVersion() {
  try {
    return JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version
  } catch {
    return undefined
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        req.destroy()
        reject(new KitesurfError('kitesurf.body.toolarge', `body exceeds ${maxBytes} bytes`))
      } else {
        chunks.push(chunk)
      }
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(new KitesurfError('kitesurf.body.json', 'body must be a JSON object'))
          return
        }
        resolve(parsed)
      } catch {
        reject(new KitesurfError('kitesurf.body.json', 'invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

function errorIdOf(error) {
  return error instanceof KitesurfError ? error.id : 'kitesurf.engine.failed'
}

/**
 * One errorId → HTTP status map, so 4xx client faults are never reported as
 * upstream engine failures. Prefix table is the single authority; anything
 * unlisted stays a 502 (engine/upstream) by default.
 */
const ERROR_STATUS = [
  [/^kitesurf\.body\.toolarge$/, 413],
  [/^kitesurf\.body\./, 400],
  [/^kitesurf\.url\./, 400],
  [/^kitesurf\.pick\.point$/, 400],
  [/^kitesurf\.shot\.scroll$/, 400],
  [/^kitesurf\.settings\./, 400],
  [/^kitesurf\.kite\.state$/, 409],
  [/^kitesurf\.kite\.(origin|remote|mcpPort|action|checkout)$/, 400],
  [/^kitesurf\.kite\.(node|init)$/, 500],
  [/^kitesurf\.navigate\.egress$/, 504],
  [/^kitesurf\.perf\./, 400],
  [/^kitesurf\.navigate\.(timeout|failed)$/, 502],
  [/^kitesurf\.kite\.(container|start|resume)$/, 502],
]

function statusOf_error(errorId) {
  for (const [pattern, status] of ERROR_STATUS) {
    if (pattern.test(errorId)) return status
  }
  return 502
}

function fail(res, error) {
  const errorId = errorIdOf(error)
  const errorText = messageOf(error)
  lastError = { at: new Date().toISOString(), errorId, error: errorText }
  sendJson(res, statusOf_error(errorId), { ok: false, errorId, error: errorText })
}

/**
 * @param {string} httpBase
 */
async function statusOf(httpBase) {
  const socket = browserSocketUrl(httpBase)
  try {
    const health = await fetchEngine(httpBase, '/health')
    let version = null
    try {
      const listed = await fetchEngine(httpBase, '/json/version')
      version = listed.status === 200 ? JSON.parse(listed.text) : null
    } catch {
      version = null
    }
    const mismatch = health.status === 200 && !health.text.startsWith('kitesurf')
    return {
      ok: health.status === 200,
      engineMismatch: mismatch,
      httpBase,
      cdp: socket,
      healthStatus: health.status,
      health: health.text.slice(0, 300),
      browser: version && typeof version === 'object' ? version.Browser ?? version.browser ?? null : null,
      version: pluginVersion() ?? null,
      userAgent: currentUserAgent(),
      viewport: currentViewport(),
      lastError,
    }
  } catch (error) {
    return { ok: false, httpBase, cdp: socket, errorId: errorIdOf(error), error: messageOf(error), userAgent: currentUserAgent(), viewport: currentViewport(), lastError, version: pluginVersion() ?? null }
  }
}

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx, config) {
  const httpBase = config?.httpBase ?? DEFAULT_ORIGIN
  const kite = createNanoKite({
    httpBase,
    mcpPort: 8799,
    allowRemote: config?.allowRemote === true,
    lockPath: path.join(process.env.DSH_HOME || homedir(), 'nano-kitesurf.lock.json'),
    fs: { readFile, writeFile, mkdir },
    onStart: () => bringUp('kitesurf.kite.start'),
    onSuspend: () => sleepEngine(),
    onResume: () => bringUp('kitesurf.kite.resume'),
  })
  async function bringUp(id) {
    // Container bring-up can run ~100s (image pull + workerd boot + health
    // polling). Split the observables: `kite.container` covers the CLI call
    // (cold image pull vs warm re-adopt), `kite.warmup` the health poll —
    // so perf review distinguishes a slow boot from a slow spawn.
    await hostSpan('kite.bringUp', async () => {
      const ensured = await hostSpan('kite.container',
        () => ensureLocalContainer(kite.snapshot(), { checkout: config?.checkout }))
      await hostSpan('kite.warmup', async () => {
        for (let attempt = 0; attempt < 20; attempt += 1) {
          try {
            const health = await fetchEngine(kite.snapshot().httpBase, '/health')
            if (health.status === 200) return { ...ensured, healthy: true }
          } catch { /* the process is still booting */ }
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
        throw new KitesurfError(id, '引擎没有应答')
      })
    })
  }
  async function sleepEngine() {
    // Stop first, then drop the socket: a failed stop leaves the phase
    // 'running' with a still-open socket, not a dead one (R13 residual).
    await stopLocalContainer(kite.snapshot())
    releaseEngine()
  }
  const origin = () => kite.snapshot().httpBase
  // The skill body no longer bakes the origin: it teaches the agent to read
  // kite.cdp from /status so it always follows the live configure() value.
  const skill = kitesurfSkill()
  const disposeSkill = ctx.skills.register({
    ...skill,
    source: 'runtime',
    invocation: { modelInvocable: true, userInvocable: true },
    provider: 'nano-kitesurf',
  })
  const disposeKite = ctx.skills.register({
    ...nanoKiteSkill(),
    source: 'runtime',
    invocation: { modelInvocable: true, userInvocable: true },
    provider: 'nano-kitesurf',
  })
  ctx.effect(() => () => {
    disposeSkill?.()
    disposeKite?.()
  }, 'nano-kitesurf: skill')

  registerRoutes(ctx, [
    {
      path: STATUS_ROUTE,
      methods: ['GET', 'HEAD'],
      handler: async (_req, res) => {
        const status = await statusOf(origin())
        const { phase, httpBase: base, mcpPort, cdp } = kite.snapshot()
        sendJson(res, 200, { ...status, kite: { phase, httpBase: base, mcpPort, cdp } })
      },
    },
    {
      path: LAST_ROUTE,
      methods: ['GET', 'HEAD'],
      handler: (_req, res) => {
        sendJson(res, 200, { pick: lastPick })
      },
    },
    {
      path: OPEN_ROUTE,
      methods: ['POST'],
      bodyLimit: 4096,
      handler: async (req, res, route) => {
        try {
          const body = await readBody(req, route.bodyLimit)
          const opened = await hostSpan('open', () => openPage(origin(), pageUrl(body.url)))
          lastError = null
          sendJson(res, 200, { ok: true, ...opened })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: SHOT_ROUTE,
      methods: ['POST'],
      bodyLimit: 4096,
      handler: async (req, res, route) => {
        try {
          const body = await readBody(req, route.bodyLimit)
          const shot = await hostSpan('shot', () => captureShot(origin(), scrollDelta(body)))
          lastError = null
          sendJson(res, 200, { ok: true, ...shot })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: PICK_ROUTE,
      methods: ['POST'],
      bodyLimit: 4096,
      handler: async (req, res, route) => {
        try {
          const body = await readBody(req, route.bodyLimit)
          const point = pickPoint(body)
          const picked = await hostSpan('pick', () => pickElement(origin(), point.x, point.y))
          // Hover previews ask with preview:true — they must not move
          // lastPick, which belongs to the note the human is composing.
          if (body.preview !== true) {
            lastPick = { at: new Date().toISOString(), ...picked }
          }
          lastError = null
          sendJson(res, 200, { ok: true, pick: { at: new Date().toISOString(), ...picked } })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: SETTINGS_ROUTE,
      methods: ['POST'],
      bodyLimit: 4096,
      handler: async (req, res, route) => {
        try {
          const body = await readBody(req, route.bodyLimit)
          const saved = await hostSpan('settings', () => setBrowserSettings(origin(), {
            userAgent: typeof body.userAgent === 'string' ? body.userAgent : undefined,
            viewport: body.viewport === null || (body.viewport && typeof body.viewport === 'object') ? body.viewport : undefined,
          }))
          lastError = null
          sendJson(res, 200, { ok: true, ...saved })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: KITE_ROUTE,
      methods: ['POST'],
      bodyLimit: 4096,
      handler: async (req, res, route) => {
        try {
          const body = await readBody(req, route.bodyLimit)
          const action = body.action
          if (action === 'init') {
            const result = await kite.init()
            lastError = null
            sendJson(res, 200, result)
            return
          }
          if (action === 'start') sendJson(res, 200, { ok: true, ...(await kite.start()) })
          else if (action === 'suspend') sendJson(res, 200, { ok: true, ...(await kite.suspend()) })
          else if (action === 'resume') sendJson(res, 200, { ok: true, ...(await kite.resume()) })
          else if (action === 'configure') sendJson(res, 200, { ok: true, ...kite.configure(body) })
          else throw new KitesurfError('kitesurf.kite.action', '未知的 nano-kite 动作')
          lastError = null
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: PERF_ROUTE,
      methods: ['GET', 'HEAD', 'POST'],
      handler: (req, res) => {
        const mode = new URL(req.url ?? '/', 'http://localhost').searchParams.get('mode')
        // mode=window drains the process-global reservoir — a write, so it is
        // POST-only; a bare GET (or HEAD, or a prefetcher) can never drain.
        if (mode === 'window' && req.method !== 'POST') {
          fail(res, new KitesurfError('kitesurf.perf.method', 'mode=window drains samples; use POST'))
          return
        }
        sendJson(res, 200, perfSnapshot(mode))
      },
    },
  ], { table: ROUTE_TABLE, plugin: PLUGIN })
}
