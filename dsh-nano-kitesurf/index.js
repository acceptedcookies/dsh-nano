/** Host half. The Kitesurf process stays outside this plugin; we only speak CDP. */

import { readFileSync } from 'node:fs'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import { fileURLToPath } from 'node:url'
import { registerRoutes } from './lib/route-guard.js'
import { ROUTE_TABLE, PLUGIN } from './lib/route-table.js'
import { createHistory } from './lib/history.js'
import { browserSocketUrl, captureDom, captureElements, captureShot, captureSnapshot, currentEmulation, engineHistoryAdd, engineHistoryClear, engineHistoryList, engineHistoryRemove, currentUserAgent, currentViewport, engineTargets, evaluateInPage, evaluateChunked, fetchEngine, interactElement, KitesurfError, navigateHistory, openPage, pickElement, pickBySelector, pickPoint, pickSelector, editBody, editElement, pageUrl, releaseEngine, scrollDelta, setBrowserSettings, stateOp, storageOp, waitForCondition } from './lib/engine.js'
import { ERROR_STATUS, clearConsole, clearNetwork, clearOperations, diagnosticsSummary, elementRefSelector, elementRefSummary, getElementRef, getLastSnapshot, getRef, isElementRef, listNetwork, listNetworkHar, listConsole, listOperations, listRefs, putElementRefs, putRef, recordOperation, refChip, setLastSnapshot, summarizeInput } from './lib/diagnostics.js'
import { buildSrcDoc } from './lib/dom.js'
import { kitesurfSkill, nanoKiteSkill } from './lib/skill.js'
import { createNanoKite } from './lib/nano-kite.js'
import { hostPort, hostPortFree } from './lib/container-engine.js'
import { hostSpan as rawHostSpan, perfCount, perfSnapshot, setPerfEnabled } from './lib/perf-host.js'

// Request-scoped incident id (P1-4): traced() opens an ALS context per request
// so every hostSpan inside correlates to the incidentId that fail() stamps on
// the error response and the operations ring — an agent reading a slow/failed
// span event can jump straight to the incident row and vice versa.
const reqContext = new AsyncLocalStorage()
const activeIncidentId = () => reqContext.getStore()?.incidentId ?? null
const hostSpan = (name, fn) => rawHostSpan(name, fn, { incidentId: activeIncidentId() })

export const name = 'nano-kitesurf'
export const inject = ['webServer', 'connection', 'skills']


const DEFAULT_ORIGIN = 'http://127.0.0.1:8787'

/** @type {{ at: string, point: { x: number, y: number }, targetId: string, element: object } | null} */
let lastPick = null
/** @type {{ at: string, errorId: string, error: string } | null} */
let lastError = null

/**
 * P0-5 ref language: "@N" in a selector-ish field resolves through the last
 * /snapshot's element-ref table to the SAME element the human saw. Non-@N
 * input passes through untouched so plain selectors keep working.
 */
function resolveSelectorRefs(body) {
  if (!body || typeof body !== 'object') return body
  const out = { ...body }
  for (const key of ['selector', 'target', 'needle']) {
    if (isElementRef(out[key])) {
      const sel = elementRefSelector(out[key])
      if (!sel) throw new KitesurfError('kitesurf.ref.miss', `element ref ${out[key]} unknown — run /snapshot to rebuild the ref table`)
      out[key] = sel
    }
  }
  return out
}

/**
 * @N whose stored selector selects the SAME element as `pickedSelector`. A
 * string compare cannot be trusted (pick emits "html > body > a", the walker
 * emits "a" — same node, different spelling), so this probes the live page
 * once: querySelector each candidate and compare node identity.
 */
async function elementRefForPicked(httpBase, pickedSelector) {
  const { refs } = elementRefSummary()
  const candidates = Object.entries(refs)
    .map(([id, row]) => ({ id, selector: row?.selector }))
    .filter((c) => typeof c.selector === 'string' && c.selector)
  if (!candidates.length || !pickedSelector) return null
  const expr = `(() => {
    const want = document.querySelector(${JSON.stringify(pickedSelector)})
    if (!want) return null
    const table = ${JSON.stringify(candidates.map((c) => [c.id, c.selector]))}
    for (const [id, sel] of table) {
      try { if (sel && document.querySelector(sel) === want) return id } catch (e) { /* malformed stored sel */ }
    }
    return null
  })()`
  try {
    const result = await evaluateInPage(httpBase, expr)
    // evaluateInPage returns the JSON.stringify'd value; unwrap to the bare ref.
    const value = JSON.parse(result?.value ?? 'null')
    return typeof value === 'string' && /^@\d+$/.test(value) ? value : null
  } catch {
    return null
  }
}

// Render-fidelity report for /snapshot: how trustworthy is the a11y-lite tree
// as a semantic model? Kitesurf rewrites rich pages into svg viewport + P text
// runs, so a tree of generics is a renderer limit, not a walker bug.
// semantic = roles a real a11y tree would carry (heading/list/landmark/table);
// interactive = actable nodes; sparse means semantic is ~0 and svg dominates.
function snapshotFidelity(snap) {
  const refs = Object.values(snap?.refs || {})
  const interactive = refs.filter((r) => /^(link|button|input|textbox|checkbox|radio|combobox|slider|searchbox|option)$/.test(r.role)).length
  const semantic = refs.filter((r) => /^(heading|list|listitem|table|main|navigation|banner|contentinfo|article|section)$/.test(r.role)).length
  // A page is "sparse" when the tree has actable nodes but no semantic
  // landmarks AND almost nothing to act on — i.e. it's a rendered picture,
  // not a navigable document. interactive<=1 keeps form pages (httpbin) out.
  const svgViewport = /\bsvg\b/i.test(snap?.tree || '')
  const sparse = refs.length > 0 && semantic === 0 && interactive <= 1
  return { refs: refs.length, interactive, semantic, svgViewport, sparse }
}

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
      const perfReview = source.perfReview !== false
      return { value: { httpBase: url.origin, allowRemote, checkout, perfReview } }
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

/**
 * Answer "which code am I actually running?" — the single most useful field
 * during a broken deploy. Two files (index.js / route-table.js) drift once
 * caused the whole plugin to fail activation with route-not-listed; hashing
 * both plus the client bundle makes that visible in /status.
 */
function digestOf(relative) {
  try {
    return createHash('sha256').update(readFileSync(new URL(relative, import.meta.url))).digest('hex').slice(0, 8)
  } catch {
    return 'missing'
  }
}
const buildId = `${pluginVersion() ?? '0'}-i${digestOf('./index.js')}r${digestOf('./lib/route-table.js')}c${digestOf('./lib/client.js')}`
const storePath = fileURLToPath(new URL('./index.js', import.meta.url))
const history = createHistory(fileURLToPath(new URL('.', import.meta.url)))

/**
 * The lock file is the plugin's only durable state (DSH_HOME, never inside
 * the plugin dir — a host restart replaces that). We remember the checkout
 * that last created the container so a later cold start can rebuild it even
 * when neither KITESURF_CHECKOUT nor config.checkout is set. It is a
 * consumption receipt of a *previous* config, not a new canonical source:
 * an explicit env/config value always wins.
 */
function lockPathOf() {
  return path.join(process.env.DSH_HOME || homedir(), 'nano-kitesurf.lock.json')
}

function persistedCheckout() {
  try {
    const row = JSON.parse(readFileSync(lockPathOf(), 'utf8'))
    return typeof row.checkout === 'string' && row.checkout ? row.checkout : undefined
  } catch {
    return undefined
  }
}

/**
 * P1-3 snapshot archive: append a compact evidence row ({kind,at,buildId,url,
 * …shape}) to a durable jsonl so 「昨天那次 500 的上下文」is queryable across
 * restarts. Fire-and-forget — archival failure must never break the route.
 */
function archiveSnapshot(kind, shape = {}) {
  try {
    const file = path.join(process.env.DSH_HOME || homedir(), 'nano-kitesurf-snapshots.jsonl')
    const row = JSON.stringify({ kind, at: new Date().toISOString(), buildId, ...shape })
    mkdir(path.dirname(file), { recursive: true }).then(() => appendFile(file, `${row}\n`)).catch(() => {})
  } catch { /* best-effort */ }
}

async function rememberCheckout(checkout) {
  if (!checkout) return
  try {
    const file = lockPathOf()
    let row = {}
    try { row = JSON.parse(await readFile(file, 'utf8')) } catch { /* fresh */ }
    row.checkout = checkout
    row.checkoutAt = new Date().toISOString()
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, `${JSON.stringify(row, null, 2)}\n`)
  } catch { /* diagnostics/config must never break engine start */ }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

/**
 * Drain-guarded body reader: on overflow it keeps eating 'data' (so the
 * socket doesn't RST mid-write) then rejects — callers still send the real
 * 413 instead of a silent TCP close.
 */
function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let overflow = false
    req.on('data', (chunk) => {
      if (overflow) return // keep draining so the 413 can be written
      size += chunk.length
      if (size > maxBytes) {
        overflow = true
      } else {
        chunks.push(chunk)
      }
    })
    req.on('end', () => {
      if (overflow) {
        reject(new KitesurfError('kitesurf.body.toolarge', `body exceeds ${maxBytes} bytes`))
        return
      }
      if (chunks.length === 0) {
        req.__dnkBody = {}
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(new KitesurfError('kitesurf.body.json', 'body must be a JSON object'))
          return
        }
        // Stash the whitelisted summary source for the operation trace.
        req.__dnkBody = parsed
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
 * ERROR_STATUS lives in lib/diagnostics.js together with the cause + next
 * command for every id. index.js, the API and the skill docs all read that
 * one table, so the status an agent sees can never drift from the skill.
 * Unlisted ids stay 502 (upstream/engine) by default.
 */
function statusOf_error(errorId) {
  for (const [pattern, status] of ERROR_STATUS) {
    if (pattern.test(errorId)) return status
  }
  return 502
}

function fail(res, error) {
  const errorId = errorIdOf(error)
  const errorText = messageOf(error)
  // Reuse the request-scoped id when fail() runs inside a traced handler —
  // span events, the operations row and this response then share one key.
  const incidentId = activeIncidentId() ?? randomUUID()
  lastError = { at: new Date().toISOString(), incidentId, errorId, error: errorText }
  // One grep-able JSON line per failure in the host log. Before this, five
  // triggered errors produced ZERO kitesurf lines and an MCP client had no
  // durable evidence at all.
  try {
    process.stderr.write(`${JSON.stringify({
      ts: new Date().toISOString(), plugin: 'nano-kitesurf', incidentId,
      errorId, status: statusOf_error(errorId), error: errorText.slice(0, 240), buildId,
    })}\n`)
  } catch { /* logging must never break the response */ }
  sendJson(res, statusOf_error(errorId), { ok: false, errorId, error: errorText, incidentId })
}

/**
 * Execution-state instrumentation for EVERY route. Wrapping res.end lets us
 * observe the exact JSON that went out (status, errorId, error) without
 * editing a single handler; the input summary comes from readBody's stash.
 * This is the missing "error 埋点": before this, only `lastError` (one row,
 * overwritten) existed and an MCP client could not reconstruct what happened.
 */
function traced(spec) {
  const original = spec.handler
  return {
    ...spec,
    handler: async (req, res, route) => {
      const started = Date.now()
      let payload = null
      const originalEnd = res.end.bind(res)
      res.end = (body, ...rest) => {
        if (typeof body === 'string' && body.startsWith('{')) {
          try { payload = JSON.parse(body) } catch { /* non-JSON response */ }
        }
        return originalEnd(body, ...rest)
      }
      // The request's incidentId: fail() reuses it so error response, stderr
      // line, operations row and span events all share one correlation id.
      const incidentId = randomUUID()
      req.__dnkIncidentId = incidentId
      try {
        await reqContext.run({ incidentId }, () => original(req, res, route))
      } finally {
        // The pane polls perf-review ~1/s; recording it would push every real
        // failure out of the 200-row ring within minutes. Skip it entirely —
        // but never `return` from finally (that would swallow a throw).
        const skip = spec.path === PERF_ROUTE
        const status = res.statusCode || 0
        const ok = payload ? payload.ok !== false && status < 400 : status < 400
        if (!skip) {
          try {
            recordOperation({
            route: spec.path,
            method: req.method || 'GET',
            status,
            durationMs: Date.now() - started,
            ok,
            errorId: payload?.errorId || null,
            error: payload?.error || null,
            incidentId: payload?.incidentId || req.__dnkIncidentId || null,
            input: summarizeInput(req.__dnkBody),
              result: payload?.moved === false ? 'no-op' : (payload?.mimeType ? 'png' : null),
            })
          } catch { /* diagnostics must never break a route */ }
          // P1-4 usage counters: route failures + slow calls, per route name —
          // cheap tallies an agent can read next to the span stats.
          try {
            const short = spec.path.replace(/^\/nano-kitesurf\//, '').replace(/[^a-z0-9-]/g, '-').slice(0, 32)
            if (!ok) perfCount(`route-err-${short}`)
            const dur = Date.now() - started
            if (dur >= 500) perfCount(`route-slow-${short}`)
          } catch { /* counters are best effort */ }
        }
        // Push a fresh snapshot to the MCP bridge, immediately on failure and
        // debounced otherwise. An agent using only MCP sees the same state.
        try { diagnosticsPusher?.(!ok) } catch { /* best effort */ }
      }
    },
  }
}

function queryOf(req) {
  return new URL(req.url ?? '/', 'http://localhost').searchParams
}

/** Set by apply(): the host pushes its diagnostics snapshot into the MCP
 * bridge so an MCP-only client can read execution state. */
let diagnosticsPusher = null
/** Module-scope: if apply() ever runs twice in one process the previous
 * timer must die here — a per-apply local would leave a stale timer whose
 * closure pushes a null-snapshot payload that flaps the bridge. */
let diagnosticsPushTimer = null

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
      buildId,
      userAgent: currentUserAgent(),
      viewport: currentViewport(),
      emulation: currentEmulation(),
      lastError,
    }
  } catch (error) {
    // First-render honesty: a failed probe IS the current error, so record it.
    // Without this the pane showed "engine not answering" with no errorId until
    // the human pressed Retry.
    lastError = { at: new Date().toISOString(), incidentId: randomUUID(), errorId: errorIdOf(error), error: messageOf(error).slice(0, 240) }
    return { ok: false, httpBase, cdp: socket, errorId: errorIdOf(error), error: messageOf(error), userAgent: currentUserAgent(), viewport: currentViewport(), emulation: currentEmulation(), lastError, version: pluginVersion() ?? null, buildId, storePath }
  }
}

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx, config) {
  // perf-review capture is a documented plugin-side switch: perf spans feed
  // /nano-local-sandbox/perf-review/host and the host's own perf-review UI.
  // setEnabled lands the choice even though hostJoin already ran at import —
  // the env var is kept as the lazy-resolution fallback for the same value.
  setPerfEnabled(config?.perfReview !== false)
  if (config?.perfReview !== false) process.env.DSH_PERF_REVIEW = '1'
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
  /** Last port repair performed by bringUp — surfaced in /status + /ports. */
  let portRepair = null
  async function bringUp(id) {
    await hostSpan('kite-warmup', async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const health = await fetchEngine(kite.snapshot().httpBase, '/health')
          if (health.status === 200) return { healthy: true }
        } catch { /* the engine is not answering */ }
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      throw new KitesurfError(id, '引擎没有应答。容器的启动不在这个包里。')
    })
  }
  async function sleepEngine() {
    releaseEngine()
  }
  const origin = () => kite.snapshot().httpBase
  // Explicit config wins, then env, then the last checkout that actually
  // created a container. Without this a host restart + deleted container is
  // an unrecoverable 400 for someone who cannot edit their profile. Resolved
  // lazily so writing the lock file takes effect on the NEXT resume without
  // a host restart.
  const effectiveCheckout = () => config?.checkout || process.env.KITESURF_CHECKOUT || persistedCheckout()

  /**
   * Port truth: what the config asks for, what the engine actually uses, what
   * the container published, and who else holds the port. This is the data an
   * agent needs to diagnose "8787 is Cursor, the engine is on 8798" without a
   * shell.
   */
  async function portReport() {
    const snap = kite.snapshot()
    const want = { httpBase: config?.httpBase ?? DEFAULT_ORIGIN, mcpPort: snap.mcpPort }
    const published = null
    const containerState = null
    const probe = async (port) => {
      if (!Number.isFinite(port)) return null
      return { port, free: await hostPortFree(port) }
    }
    const [wantEngine, wantMcp] = await Promise.all([probe(hostPort(snap.httpBase)), probe(snap.mcpPort)])
    // "Occupied" is ambiguous: our own container holding its published port is
    // healthy, not a conflict. Say who holds it.
    const own = new Set((published || []).map((p) => p.hostPort))
    const who = (row) => row == null ? null
      : row.free ? 'free' : (own.has(row.port) ? 'this-container' : 'other')
    return {
      configured: want,
      effective: { httpBase: snap.httpBase, mcpPort: snap.mcpPort },
      container: { state: containerState, published },
      ports: {
        engine: wantEngine ? { ...wantEngine, heldBy: who(wantEngine) } : null,
        mcp: wantMcp ? { ...wantMcp, heldBy: who(wantMcp) } : null,
      },
      lastRepair: portRepair,
      healthy: (await statusOf(snap.httpBase)).ok === true,
    }
  }

  /**
   * Container / init / restart self-test: one call answers "is this
   * installation actually functional?" across every layer we own, so a human
   * (or an agent over MCP) never has to run `container` by hand.
   */
  let lastSelfTest = null
  let lastClientPerf = null
  let lastElements = null
  let lastDom = null
  // P1-7: each check carries its own repair call so an agent gets "doctor"
  // output — the exact route/command to run, not just a verdict it has to
  // translate. FIX maps a failing check to a concrete next action.
  const SELFTEST_FIX = {
    plugin: 'buildId 缺失：在本包 npm run build → 同步到 profile 插件目录 → pnpm install --force → 重启宿主',
    engine: 'POST /nano-local-sandbox/recover {}（自动 suspend→resume）；若 400 kitesurf.kite.checkout 先配 config.checkout',
    'engine-identity': 'POST /nano-local-sandbox/kite {"action":"configure","httpBase":"http://127.0.0.1:<enginePort>"}（httpBase 指向了非 Kitesurf 服务）',
    container: 'container list --all 看容器；容器缺失/停止 → POST /nano-local-sandbox/kite {"action":"resume"}',
    'ports-published': '端口漂移：GET /nano-local-sandbox/ports 看 configured/effective/published → POST /nano-local-sandbox/recover {} 修复端口',
    'ports-loopback': '端口发布在公网接口——安全风险：POST /nano-local-sandbox/recover {} 重新发布到 127.0.0.1',
    'mcp-bridge': '桥不可达：GET http://127.0.0.1:<mcpPort>/health 验 → POST /nano-local-sandbox/recover {}',
    targets: '无 page target：POST /nano-local-sandbox/open {"url":"https://example.com"} 让引擎开一页',
    dom: '页面 blank/无 DOM：GET /diagnostics→hints；POST /nano-local-sandbox/open 加载真实页',
    routes: '路由表过旧（<15）说明 buildId 陈旧：npm run build → 重链 → 重启宿主',
    phase: 'phase 与 engineAlive 不一致：GET /nano-local-sandbox/status 看 kite.phase，按阶段 start/suspend/resume',
  }
  async function runSelfTest() {
    const started = Date.now()
    const checks = []
    const add = (name, ok, detail) => {
      const row = { name, ok: ok === true, detail: String(detail ?? '').slice(0, 200) }
      if (!row.ok && SELFTEST_FIX[name]) row.fixCall = SELFTEST_FIX[name]
      checks.push(row)
    }

    add('plugin', !!buildId, buildId)

    let status = null
    try { status = await statusOf(origin()) } catch (error) { add('engine', false, messageOf(error)) }
    if (status) add('engine', status.ok === true, status.ok ? status.health : `${status.errorId}: ${status.error}`)
    if (status) add('engine-identity', status.engineMismatch !== true, status.engineMismatch ? 'not Kitesurf' : 'kitesurf')

    let ports = null
    try { ports = await portReport() } catch (error) { add('container', false, messageOf(error)) }
    if (ports) {
      add('container', ports.container?.state === 'running', `state=${ports.container?.state}`)
      const published = Array.isArray(ports.container?.published) ? ports.container.published : []
      add('ports-published', published.length >= 2, published.map((x) => `${x.hostPort}->${x.containerPort}@${x.hostAddress}`).join(', '))
      const loopback = published.every((x) => x.hostAddress === '127.0.0.1' || x.hostAddress === '::1')
      add('ports-loopback', loopback, loopback ? 'all loopback' : 'exposed on a public interface')
    }

    try {
      const response = await fetch(`http://127.0.0.1:${kite.snapshot().mcpPort}/health`, { signal: AbortSignal.timeout(2000) })
      const body = await response.json()
      add('mcp-bridge', body.ok === true, `conns=${body.conns} accepted=${body.accepted} rejected=${body.rejected}`)
    } catch (error) { add('mcp-bridge', false, messageOf(error)) }

    try {
      const targets = await engineTargets(origin())
      add('targets', targets.count > 0, `${targets.count} target(s), attached=${targets.attachedPage || 'none'}`)
    } catch (error) { add('targets', false, messageOf(error)) }
    try {
      const page = await captureDom(origin())
      add('dom', page.bytes > 200, `${page.bytes} bytes · ${page.url}`)
    } catch (error) { add('dom', false, `${errorIdOf(error)}: ${messageOf(error)}`) }

    add('routes', ROUTE_TABLE.length >= 15, `${ROUTE_TABLE.length} routes in the baked table`)
    const phase = kite.snapshot().phase
    add('phase', status?.ok ? phase === 'running' : phase !== 'running', `phase=${phase} engineAlive=${status?.ok === true}`)

    const failed = checks.filter((c) => !c.ok).length
    lastSelfTest = { at: new Date().toISOString(), ok: failed === 0, total: checks.length, failed, durationMs: Date.now() - started, checks }
    return lastSelfTest
  }

  /** One packed snapshot, shared by GET /diagnostics and the MCP push. */
  async function buildDiagnostics(limit = 20, withTargets = true) {
    const status = await statusOf(origin())
    const before = kite.snapshot().phase
    if (status.ok && before === 'idle') kite.adopt()
    else if (!status.ok && before === 'running') kite.degrade()
    let targets = null
    let targetsError = null
    if (withTargets) {
      try { targets = await engineTargets(origin()) } catch (error) { targetsError = messageOf(error).slice(0, 160) }
    }
    const summary = diagnosticsSummary()
    const hints = []
    if (!status.ok) hints.push('引擎不可达：看 status.error，然后 curl http://127.0.0.1:8798/health、container list --all、container logs kitesurf --tail 80')
    if (!status.ok) hints.push('恢复顺序：先 GET /status 确认 phase（running 但死会自动降级为 idle）→ POST /kite {action:"suspend"}（若 suspended 可跳过）→ POST /kite {action:"resume"}；若返回 400 kitesurf.kite.checkout，说明缺 KITESURF_CHECKOUT/config.checkout，先在 profile cordis.patch.yml 写 config.checkout 或 export 后再试')
    if (status.engineMismatch) hints.push('engineMismatch：httpBase 指向了非 Kitesurf 服务，POST /kite configure 回 loopback 引擎端口')
    if (!targets && targetsError) hints.push(`Target.getTargets 失败：${targetsError}`)
    if (summary.operations.failures > 0) hints.push(`最近 ${summary.operations.failures} 次操作失败：GET /operations?errorsOnly=true 看 errorId，再对照 errorCatalog`)
    if (summary.console.counts.error || summary.console.counts.exception) hints.push('页面有 error/exception：GET /console?level=error,exception 看堆栈')
    if (kite.snapshot().phase !== 'running') hints.push(`phase=${kite.snapshot().phase}：按阶段用 start/suspend/resume，409 是阶段不符不是引擎故障`)
    // Resolve snapshot/live state ONCE up front — the fidelity, empty and
    // stale hints below all read these; declaring before use avoids a TDZ
    // reference on the empty-hint path.
    const attachedTid = targets?.attachedPage
    const liveUrl = status.ok ? ((targets?.targets || []).find((t) => t.type === 'page' && (t.targetId === attachedTid || t.attached))?.url
      || (targets?.targets || []).find((t) => t.type === 'page')?.url || null) : null
    const snapUrl = getLastSnapshot()?.url
    const snapFid = getLastSnapshot()?.fidelity
    const recentNavFail = (summary.recentErrors || []).some((e) => /navigate|open|egress|timeout/i.test(e.errorId || '') && Date.now() - new Date(e.at || 0).getTime() < 60000)
    if (snapFid?.sparse) hints.push(`渲染保真稀疏：a11y 树 ${snapFid.refs} 个节点但 semantic=0、interactive=${snapFid.interactive}（Kitesurf 把语义结构渲染成了块）。用人点选 /pick 或 @N 定位，勿依赖 heading/list/语义 landmark；富语义页面建议 Chromium/ego`)
    // Empty-snapshot wall: refs=0 on a real URL = the renderer produced no DOM
    // at all (heavy-SSR capacity wall — observed on wikipedia: url lands but
    // body stays ~empty for minutes). Distinct from sparse (sparse still had
    // actable nodes); this means "walk gave nothing", not "page is semantic-poor".
    if (snapFid && snapFid.refs === 0 && snapUrl && !/about:blank|^$/.test(snapUrl)) {
      hints.push(`空快照：lastSnapshot url=${snapUrl} 但 refs=0——渲染器未产出 DOM。重 SSR 页（如 wikipedia）超出 Kitesurf 渲染容量墙；此页建议 Chromium/ego 或确认页面是否真已加载完（看 /console?level=navigation）`)
    }
    if (snapUrl && liveUrl && snapUrl !== liveUrl) {
      hints.push(`快照可能陈旧：lastSnapshot.url=${snapUrl} ≠ 引擎当前 ${liveUrl}。/open 可能超时但引擎仍在导航——先 /snapshot 重新抓取并核对 url，再信这棵树${recentNavFail ? '（最近有 navigate 超时/egress 记录）' : ''}`)
    } else if (snapUrl && recentNavFail) {
      hints.push(`最近 navigate 超时/egress：引擎可能仍在加载，/snapshot 的树可能是旧页——核对 snap.url 再行动`)
    }
    return {
      ok: true,
      at: new Date().toISOString(),
      plugin: { version: pluginVersion() ?? null, buildId, storePath, httpBase: origin(), cdp: browserSocketUrl(origin()), ...kite.snapshot() },
      engine: { ...status, targets, targetsError, engineAlive: status.ok === true, phaseConsistent: status.ok ? kite.snapshot().phase === 'running' : kite.snapshot().phase !== 'running' },
      settings: currentEmulation(),
      ports: await portReport().catch(() => null),
      selftest: lastSelfTest,
      elements: lastElements,
      history: history.list({ limit: 30 }),
      dom: lastDom,
      snapshot: getLastSnapshot(),
      observability: summary,
      console: listConsole({ limit }),
      network: listNetwork({ limit }),
      operations: listOperations({ limit }),
      perf: (() => { try { return perfSnapshot() } catch { return null } })(),
      hints,
    }
  }

  let lastPushAt = 0
  /** Push the snapshot into the in-container MCP bridge over host loopback. */
  async function pushDiagnostics(force = false) {
    const now = Date.now()
    if (!force && now - lastPushAt < 5000) return
    lastPushAt = now
    try {
      const payload = await buildDiagnostics(20, false)
      await fetch(`http://127.0.0.1:${kite.snapshot().mcpPort}/diagnostics`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(2000),
      })
    } catch { /* bridge may be down; the next request retries */ }
  }
  diagnosticsPusher = pushDiagnostics
  if (diagnosticsPushTimer) clearInterval(diagnosticsPushTimer)
  diagnosticsPushTimer = setInterval(() => { pushDiagnostics(true) }, 30_000)
  diagnosticsPushTimer.unref?.()
  setTimeout(() => { pushDiagnostics(true) }, 1500)?.unref?.()
  ctx.effect(() => () => { clearInterval(diagnosticsPushTimer); diagnosticsPushTimer = null; diagnosticsPusher = null }, 'nano-kitesurf: diagnostics push')

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
  ].map(traced), { table: ROUTE_TABLE, plugin: PLUGIN })
}
