/** Host half. The Kitesurf process stays outside this plugin; we only speak CDP. */

import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { registerRoutes } from './lib/route-guard.js'
import { ROUTE_TABLE, PLUGIN } from './lib/route-table.js'
import { createHistory } from './lib/history.js'
import { browserSocketUrl, captureDom, captureElements, captureShot, captureSnapshot, currentEmulation, engineHistoryAdd, engineHistoryClear, engineHistoryList, engineHistoryRemove, currentUserAgent, currentViewport, engineTargets, evaluateInPage, fetchEngine, KitesurfError, navigateHistory, openPage, pickElement, pickBySelector, pickPoint, pickSelector, editBody, editElement, pageUrl, releaseEngine, scrollDelta, setBrowserSettings, waitForCondition } from './lib/engine.js'
import { ERROR_STATUS, clearConsole, clearNetwork, clearOperations, diagnosticsSummary, elementRefSelector, elementRefSummary, getElementRef, getLastSnapshot, getRef, isElementRef, listNetwork, listConsole, listOperations, listRefs, putElementRefs, putRef, recordOperation, refChip, setLastSnapshot, summarizeInput } from './lib/diagnostics.js'
import { buildSrcDoc } from './lib/dom.js'
import { kitesurfSkill, nanoKiteSkill } from './lib/skill.js'
import { createNanoKite } from './lib/nano-kite.js'
import { ensureLocalContainer, hostPort, stopLocalContainer } from './lib/container-engine.js'
import { hostSpan, perfSnapshot, setPerfEnabled } from './lib/perf-host.js'

export const name = 'nano-kitesurf'
export const inject = ['webServer', 'connection', 'skills']

const STATUS_ROUTE = '/nano-kitesurf/status'
const LAST_ROUTE = '/nano-kitesurf/last'
const OPEN_ROUTE = '/nano-kitesurf/open'
const SHOT_ROUTE = '/nano-kitesurf/shot'
const HISTORY_ROUTE = '/nano-kitesurf/history'
const PICK_ROUTE = '/nano-kitesurf/pick'
const EDIT_ROUTE = '/nano-kitesurf/edit'
const SETTINGS_ROUTE = '/nano-kitesurf/settings'
const PERF_ROUTE = '/nano-kitesurf/perf-review/host'
const PERF_REPORT_ROUTE = '/nano-kitesurf/perf-report'
const KITE_ROUTE = '/nano-kitesurf/kite'
const CONSOLE_ROUTE = '/nano-kitesurf/console'
const OPERATIONS_ROUTE = '/nano-kitesurf/operations'
const DIAGNOSTICS_ROUTE = '/nano-kitesurf/diagnostics'
const PORTS_ROUTE = '/nano-kitesurf/ports'
const RECOVER_ROUTE = '/nano-kitesurf/recover'
const CONTEXT_ROUTE = '/nano-kitesurf/context'
const DOM_ROUTE = '/nano-kitesurf/dom'
const SELFTEST_ROUTE = '/nano-kitesurf/selftest'
const ELEMENTS_ROUTE = '/nano-kitesurf/elements'
const BROWSE_HISTORY_ROUTE = '/nano-kitesurf/browse-history'
const NETWORK_ROUTE = '/nano-kitesurf/network'
const TARGETS_ROUTE = '/nano-kitesurf/targets'
const EVALUATE_ROUTE = '/nano-kitesurf/evaluate'
const WAIT_ROUTE = '/nano-kitesurf/wait'
const SNAPSHOT_ROUTE = '/nano-kitesurf/snapshot'
const REFS_ROUTE = '/nano-kitesurf/refs'

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
  const incidentId = randomUUID()
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
      try {
        await original(req, res, route)
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
            incidentId: payload?.incidentId || null,
            input: summarizeInput(req.__dnkBody),
              result: payload?.moved === false ? 'no-op' : (payload?.mimeType ? 'png' : null),
            })
          } catch { /* diagnostics must never break a route */ }
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
  // /nano-kitesurf/perf-review/host and the host's own perf-review UI.
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
    // Container bring-up can run ~100s (image pull + workerd boot + health
    // polling). Split the observables: `kite.container` covers the CLI call
    // (cold image pull vs warm re-adopt), `kite.warmup` the health poll —
    // so perf review distinguishes a slow boot from a slow spawn.
    await hostSpan('kite-bringup', async () => {
      const ensured = await hostSpan('kite-container',
        () => ensureLocalContainer(kite.snapshot(), { checkout: effectiveCheckout }))
      // Resilience: the container may have been adopted on a different port
      // than the config asked for (the configured one was busy). Rewrite the
      // live engine endpoint so every later call follows reality, and record
      // the repair for /status + /ports.
      if (ensured && ensured.hostEnginePort) {
        const before = kite.snapshot()
        const wantBase = `http://127.0.0.1:${ensured.hostEnginePort}`
        const patch = {}
        if (before.httpBase !== wantBase) patch.httpBase = wantBase
        if (ensured.mcpPort && before.mcpPort !== ensured.mcpPort) patch.mcpPort = ensured.mcpPort
        if (Object.keys(patch).length) {
          try { kite.configure(patch) } catch { /* keep config if it refuses */ }
          portRepair = {
            at: new Date().toISOString(),
            from: { httpBase: before.httpBase, mcpPort: before.mcpPort },
            to: { httpBase: kite.snapshot().httpBase, mcpPort: kite.snapshot().mcpPort },
            reason: ensured.adopted ? 'adopted-existing-container' : 'port-busy-repaired',
            requestedEnginePort: ensured.requestedEnginePort ?? null,
          }
        }
      }
      // Remember what actually worked so the next cold start can rebuild the
      // container without anyone editing a profile again.
      await rememberCheckout(effectiveCheckout)
      await hostSpan('kite-warmup', async () => {
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
    let published = null
    let containerState = null
    try {
      const { execFile } = await import('node:child_process')
      const out = await new Promise((resolve) => {
        execFile('container', ['inspect', 'kitesurf'], { timeout: 5000 }, (error, stdout) => resolve(error ? null : stdout))
      })
      if (out) {
        const row = JSON.parse(out)?.[0]
        containerState = row?.status?.state ?? (typeof row?.status === 'string' ? row.status : null)
        published = (row?.configuration?.publishedPorts ?? []).map((p) => ({
          containerPort: Number(p.containerPort), hostPort: Number(p.hostPort), hostAddress: p.hostAddress,
        }))
      }
    } catch { /* container CLI missing is itself reported as null */ }
    const probe = async (port) => {
      if (!Number.isFinite(port)) return null
      const { hostPortFree } = await import('./lib/container-engine.js')
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
  async function runSelfTest() {
    const started = Date.now()
    const checks = []
    const add = (name, ok, detail) => checks.push({ name, ok: ok === true, detail: String(detail ?? '').slice(0, 200) })

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
    const snapFid = getLastSnapshot()?.fidelity
    if (snapFid?.sparse) hints.push(`渲染保真稀疏：a11y 树 ${snapFid.refs} 个节点但 semantic=0、interactive=${snapFid.interactive}（Kitesurf 把语义结构渲染成了块）。用人点选 /pick 或 @N 定位，勿依赖 heading/list/语义 landmark；富语义页面建议 Chromium/ego`)
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
    {
      path: STATUS_ROUTE,
      methods: ['GET', 'HEAD'],
      handler: async (_req, res) => {
        const status = await statusOf(origin())
        // Health-driven phase: host restart → adopt a live engine; engine
        // died underneath a running phase → degrade so the pane can offer
        // a one-click start instead of trapping the operator behind 409.
        const before = kite.snapshot().phase
        if (status.ok && before === 'idle') kite.adopt()
        else if (!status.ok && before === 'running') kite.degrade()
        const { phase, httpBase: base, mcpPort, cdp } = kite.snapshot()
        sendJson(res, 200, {
          ...status,
          engineAlive: status.ok === true,
          phaseConsistent: status.ok ? phase === 'running' : phase !== 'running',
          buildId,
          storePath,
          kite: { phase, httpBase: base, mcpPort, cdp },
        })
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
          const target = pageUrl(body.url)
          const opened = await hostSpan('open', () => openPage(origin(), target))
          lastError = null
          try { history.add({ url: target, at: new Date().toISOString(), source: 'pane' }) } catch { /* local mirror */ }
          try { await engineHistoryAdd(origin(), target) } catch { /* engine may be down */ }
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
          const format = ['png', 'jpeg', 'webp'].includes(body.format) ? body.format : undefined
          if (body.format !== undefined && !format) {
            throw new KitesurfError('kitesurf.shot.format', 'format must be png, jpeg or webp')
          }
          // fit:{width,height} = use the pane's own aspect ratio as the engine
          // viewport, so the screenshot fills the frame with no letterbox.
          const fit = body.fit && typeof body.fit === 'object'
            ? { width: Number(body.fit.width), height: Number(body.fit.height) }
            : null
          if (body.fit !== undefined && (!fit || !Number.isFinite(fit.width) || !Number.isFinite(fit.height))) {
            throw new KitesurfError('kitesurf.shot.fit', 'fit must be {width,height} in pane pixels')
          }
          const shot = await hostSpan('shot', () => captureShot(origin(), scrollDelta(body), { format, quality: body.quality, fit }))
          lastError = null
          sendJson(res, 200, { ok: true, ...shot })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: HISTORY_ROUTE,
      methods: ['POST'],
      bodyLimit: 4096,
      handler: async (req, res, route) => {
        try {
          const body = await readBody(req, route.bodyLimit)
          const moved = await hostSpan('navigate', () => navigateHistory(origin(), body?.delta))
          lastError = null
          sendJson(res, 200, { ok: true, ...moved })
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
          const body = resolveSelectorRefs(await readBody(req, route.bodyLimit))
          // {x, y} is a click; {selector} is Arrow Up/Down navigation — the
          // pane names a parent/child selector and gets the same packet back.
          const picked = await hostSpan('pick', () => typeof body.selector === 'string'
            ? pickBySelector(origin(), pickSelector(body))
            : (() => { const p = pickPoint(body); return pickElement(origin(), p.x, p.y) })())
          // Hover previews ask with preview:true — they must not move
          // lastPick, which belongs to the note the human is composing.
          // preview truthy-in-any-shape stays read-only — a mistyped
          // "true" must not scribble over the human's live lastPick.
          const preview = body.preview === true || body.preview === 'true'
          // P0-5 link: annotate the pick packet with the @N element ref that
          // resolves to the SAME DOM node. Selectors differ in spelling (pick
          // emits "html > body > a", the walker emits "a") so a string compare
          // is unreliable — probe the page for element identity instead.
          const pickedSelector = picked?.element?.selector
          const ref = pickedSelector ? await elementRefForPicked(origin(), pickedSelector) : null
          if (ref) picked.element = { ...picked.element, ref }
          if (!preview) {
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
      path: EDIT_ROUTE,
      methods: ['POST'],
      bodyLimit: 8192,
      handler: async (req, res, route) => {
        try {
          const body = resolveSelectorRefs(await readBody(req, route.bodyLimit))
          const { selector, text } = editBody(body)
          const edited = await hostSpan('edit', () => editElement(origin(), selector, text))
          lastError = null
          sendJson(res, 200, { ok: true, ...edited })
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
          // Present-but-wrong-typed fields are a caller bug, not "unset" —
          // silently dropping them would echo the old value as if it saved.
          if (body.userAgent !== undefined && typeof body.userAgent !== 'string') {
            throw new KitesurfError('kitesurf.settings.userAgent', 'userAgent must be a string')
          }
          if (body.viewport !== undefined && body.viewport !== null && (typeof body.viewport !== 'object' || Array.isArray(body.viewport))) {
            throw new KitesurfError('kitesurf.settings.viewport', 'viewport must be an object or null')
          }
          if (body.media !== undefined && body.media !== null && !['screen', 'print'].includes(body.media)) {
            throw new KitesurfError('kitesurf.settings.media', 'media must be screen, print or null')
          }
          if (body.extraHeaders !== undefined && body.extraHeaders !== null && (typeof body.extraHeaders !== 'object' || Array.isArray(body.extraHeaders))) {
            throw new KitesurfError('kitesurf.settings.headers', 'extraHeaders must be an object or null')
          }
          const saved = await hostSpan('settings', () => setBrowserSettings(origin(), {
            userAgent: typeof body.userAgent === 'string' ? body.userAgent : undefined,
            viewport: body.viewport === null || (body.viewport && typeof body.viewport === 'object') ? body.viewport : undefined,
            media: body.media === null || ['screen', 'print'].includes(body.media) ? body.media : undefined,
            extraHeaders: body.extraHeaders === null || (body.extraHeaders && typeof body.extraHeaders === 'object') ? body.extraHeaders : undefined,
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
      path: CONSOLE_ROUTE,
      methods: ['GET', 'HEAD', 'POST'],
      bodyLimit: 4096,
      handler: async (req, res, route) => {
        try {
          const body = req.method === 'POST' ? await readBody(req, route.bodyLimit) : {}
          if (body.clear === true) {
            const cleared = clearConsole()
            sendJson(res, 200, { ok: true, cleared })
            return
          }
          const q = queryOf(req)
          const limit = Number(q.get('limit') || 50)
          if (!Number.isFinite(limit) || limit < 1 || limit > 250) {
            throw new KitesurfError('kitesurf.console.query', 'limit must be 1..250')
          }
          const level = q.get('level')
          if (level && !/^[a-z,]+$/i.test(level)) {
            throw new KitesurfError('kitesurf.console.query', 'level must be a comma-separated list of names')
          }
          sendJson(res, 200, { ok: true, ...listConsole({ limit, level, since: q.get('since') }) })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: OPERATIONS_ROUTE,
      methods: ['GET', 'HEAD', 'POST'],
      bodyLimit: 4096,
      handler: async (req, res, route) => {
        try {
          const body = req.method === 'POST' ? await readBody(req, route.bodyLimit) : {}
          if (body.clear === true) {
            const cleared = clearOperations()
            sendJson(res, 200, { ok: true, cleared })
            return
          }
          const q = queryOf(req)
          const limit = Number(q.get('limit') || 50)
          if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
            throw new KitesurfError('kitesurf.diag.query', 'limit must be 1..200')
          }
          const errorsOnly = q.get('errorsOnly') === 'true' || body.errorsOnly === true
          sendJson(res, 200, { ok: true, ...listOperations({ limit, errorsOnly, since: q.get('since') }) })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: TARGETS_ROUTE,
      methods: ['GET', 'HEAD'],
      handler: async (_req, res) => {
        try {
          const targets = await hostSpan('targets', () => engineTargets(origin()))
          sendJson(res, 200, { ok: true, ...targets })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: EVALUATE_ROUTE,
      methods: ['POST'],
      bodyLimit: 4096,
      handler: async (req, res, route) => {
        try {
          const body = await readBody(req, route.bodyLimit)
          const result = await hostSpan('evaluate', () => evaluateInPage(origin(), body.expression))
          sendJson(res, 200, { ok: true, ...result })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: PORTS_ROUTE,
      methods: ['GET', 'HEAD'],
      handler: async (_req, res) => {
        try {
          sendJson(res, 200, { ok: true, ...(await portReport()) })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      // POST {text, packet, label} -> {id, chip, bytes}: the composer gets the
      // chip, the full text stays here. GET /context/:id resolves it.
      path: CONTEXT_ROUTE,
      methods: ['GET', 'HEAD', 'POST'],
      bodyLimit: 16384,
      handler: async (req, res, route) => {
        try {
          if (req.method === 'POST') {
            const body = await readBody(req, route.bodyLimit)
            if (typeof body.text !== 'string' || !body.text.trim()) {
              throw new KitesurfError('kitesurf.context.text', 'text must be a non-empty string')
            }
            const row = putRef(body.text, body.packet ?? null, { label: body.label })
            sendJson(res, 200, { ok: true, id: row.id, chip: refChip(row.id, row.label), bytes: row.bytes })
            return
          }
          // Exact-path routing: the id rides as ?id=N, never as a path segment.
          const q = queryOf(req)
          const raw = q.get('id')
          if (raw == null) {
            sendJson(res, 200, { ok: true, ...listRefs(Number(q.get('limit') || 20)) })
            return
          }
          if (!/^\d+$/.test(raw)) throw new KitesurfError('kitesurf.context.text', 'id must be an integer')
          const row = getRef(Number(raw))
          if (!row) throw new KitesurfError('kitesurf.context.miss', `no context ref ${raw}`)
          sendJson(res, 200, { ok: true, ...row })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: RECOVER_ROUTE,
      methods: ['POST'],
      bodyLimit: 4096,
      handler: async (req, res) => {
        try {
          const body = await readBody(req, 4096)
          const steps = []
          // Phase is in-memory; the container may have been stopped behind our
          // back. Reconcile against /health first, then pick the legal action:
          // alive+idle→adopt, dead+running→degrade, then start or resume.
          const probe = await statusOf(origin())
          const before = kite.snapshot().phase
          if (probe.ok && before === 'idle') kite.adopt()
          else if (!probe.ok && before === 'running') kite.degrade()
          steps.push({ step: 'reconcile', ok: true, from: before, to: kite.snapshot().phase, engineAlive: probe.ok === true })

          if (kite.snapshot().phase === 'running' && !probe.ok) {
            await hostSpan('kite-suspend', () => kite.suspend())
            steps.push({ step: 'suspend', ok: true })
          }
          if (body.reset !== false) {
            const phase = kite.snapshot().phase
            if (phase === 'suspended') {
              await hostSpan('kite-resume', () => kite.resume())
              steps.push({ step: 'resume', ok: true })
            } else if (phase === 'idle') {
              await hostSpan('kite-start', () => kite.start())
              steps.push({ step: 'start', ok: true })
            } else {
              steps.push({ step: 'already-running', ok: true })
            }
          }
          const after = await statusOf(kite.snapshot().httpBase)
          sendJson(res, 200, {
            ok: after.ok === true,
            steps,
            phase: kite.snapshot().phase,
            engineAlive: after.ok === true,
            ports: await portReport().catch(() => null),
      selftest: lastSelfTest,
      elements: lastElements,
      history: history.list({ limit: 30 }),
      dom: lastDom,
      snapshot: getLastSnapshot(),
          })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      // One probe that answers "what is the plugin doing, and why did it
      // fail?" — status, engine targets, settings, console tail, operation
      // trace, error catalogue, perf summary and generated next-step hints.
      path: DIAGNOSTICS_ROUTE,
      methods: ['GET', 'HEAD'],
      handler: async (req, res) => {
        try {
          const q = queryOf(req)
          const limit = Number(q.get('limit') || 20)
          if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
            throw new KitesurfError('kitesurf.diag.query', 'limit must be 1..100')
          }
          sendJson(res, 200, await buildDiagnostics(limit))
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: BROWSE_HISTORY_ROUTE,
      methods: ['GET', 'HEAD', 'POST', 'DELETE'],
      handler: async (req, res, route) => {
        try {
          const method = String(req.method || 'GET').toUpperCase()
          const q = queryOf(req)
          if (method === 'DELETE') {
            const id = q.get('id') || ''
            const url = q.get('url') || ''
            if (url) {
              // Tab-close semantics: remove the address everywhere it is
              // stored — engine KV first (canonical while the container
              // lives), then the local mirror. Missing from one store is not
              // an error: the tab is gone either way.
              let engineOk = false
              try { engineOk = Boolean((await engineHistoryRemove(origin(), url))?.ok) } catch { /* engine down */ }
              history.removeUrl(url)
              sendJson(res, 200, { ok: true, engine: engineOk, ...history.stats() })
              return
            }
            sendJson(res, id && history.remove(id) ? 200 : 404, { ok: Boolean(id && history.remove(id)), ...history.stats() })
            return
          }
          if (method === 'POST') {
            const body = await readBody(req, route.bodyLimit)
            if (body?.clear) { history.clear(); try { await engineHistoryClear(origin()) } catch { /* engine down */ } sendJson(res, 200, { ok: true, ...history.stats() }); return }
            sendJson(res, 400, { ok: false, errorId: 'kitesurf.history.body', error: 'expected {clear:true}' })
            return
          }
          const limit = Math.min(Number(q.get('limit') || 50), 200)
          const needle = String(q.get('q') || '').toLowerCase()
          let data = null
          try {
            const engine = await engineHistoryList(origin(), 500)
            if (engine.ok) data = { total: engine.entries.length, entries: engine.entries.filter((row) => !needle || row.url.toLowerCase().includes(needle)).slice(0, limit), source: 'workerd-kv' }
          } catch { /* fall through to the local mirror */ }
          if (!data) { data = { ...history.list({ limit, offset: Number(q.get('offset') || 0), q: q.get('q') || '' }), source: 'plugin-store' } }
          sendJson(res, 200, { ok: true, ...history.stats(), ...data })
        } catch (error) { fail(res, error) }
      },
    },
    {
      path: ELEMENTS_ROUTE,
      methods: ['GET', 'HEAD'],
      handler: async (req, res) => {
        try {
          const q = queryOf(req)
          const data = await hostSpan('elements', () => captureElements(origin(), {
            depth: Number(q.get('depth') || 4),
            selector: q.get('selector') || '',
          }))
          // Keep a trimmed copy for the MCP snapshot (a full tree is too heavy
          // for the 30s push).
          lastElements = {
            at: new Date().toISOString(),
            count: data.count,
            selector: data.selector,
            computedCount: Object.keys(data.computed || {}).length,
            nodes: data.nodes.slice(0, 40),
          }
          sendJson(res, 200, { ok: true, ...data })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: SELFTEST_ROUTE,
      methods: ['GET', 'HEAD', 'POST'],
      handler: async (_req, res) => {
        try {
          sendJson(res, 200, { ok: true, ...(await runSelfTest()) })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: DOM_ROUTE,
      methods: ['GET', 'HEAD'],
      handler: async (_req, res) => {
        try {
          const page = await hostSpan('dom', () => captureDom(origin()))
          // Build the iframe document on the host: the client bundle cannot
          // import lib/, and the rebasing/picker injection belongs to one place.
          lastDom = { at: new Date().toISOString(), url: page.url, bytes: page.bytes, html: page.html.slice(0, 4000) }
          sendJson(res, 200, { ok: true, ...page, srcdoc: buildSrcDoc(page) })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: NETWORK_ROUTE,
      methods: ['GET', 'HEAD', 'POST'],
      bodyLimit: 4096,
      handler: async (req, res, route) => {
        try {
          const body = req.method === 'POST' ? await readBody(req, route.bodyLimit) : {}
          if (body.clear === true) {
            sendJson(res, 200, { ok: true, cleared: clearNetwork() })
            return
          }
          const q = queryOf(req)
          const limit = Number(q.get('limit') || 100)
          if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
            throw new KitesurfError('kitesurf.network.query', 'limit must be 1..200')
          }
          sendJson(res, 200, { ok: true, ...listNetwork({ limit, failedOnly: q.get('failedOnly') === 'true' }) })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      // a11y-lite snapshot (P0-5): the shared element-ref language. One live
      // DOM walk emits the tree + ref table; the host stores refs so @N in a
      // later wait/pick/evaluate/edit resolves to the same element the human
      // saw. This is what makes a pick note and an agent ref interchangeable.
      path: SNAPSHOT_ROUTE,
      methods: ['GET', 'HEAD'],
      handler: async (req, res) => {
        try {
          const q = queryOf(req)
          const snap = await hostSpan('snapshot', () => captureSnapshot(origin(), { maxNodes: Number(q.get('maxNodes') || 200) }))
          putElementRefs(snap.refs, snap.url)
          // Render-fidelity honesty (P0-5 follow-up, eval-round-1 finding):
          // Kitesurf rewrites rich pages into svg+P with no <h1>/list/main, so
          // a sparse semantic tree is a RENDERER limit, not a walker bug. Report
          // the density so an agent knows whether the tree is trustworthy for
          // semantic navigation or it should fall back to human pick/@N.
          const fidelity = snapshotFidelity(snap)
          setLastSnapshot({ at: new Date().toISOString(), url: snap.url, title: snap.title, count: snap.count, truncated: snap.truncated, refs: snap.refs, fidelity, treePreview: snap.tree.split('\n').slice(0, 30).join('\n') })
          sendJson(res, 200, { ok: true, ...snap, fidelity })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      // The stored element-ref table: an agent resolves "@N" without re-walking
      // the page. Empty until a /snapshot runs; always the SAME page the last
      // tree described (refs are replaced wholesale each snapshot).
      path: REFS_ROUTE,
      methods: ['GET', 'HEAD'],
      handler: async (req, res) => {
        try {
          const q = queryOf(req)
          const ref = q.get('ref')
          if (ref) {
            const row = getElementRef(ref)
            if (!row) throw new KitesurfError('kitesurf.ref.miss', `no element ref ${ref}; run /snapshot to rebuild`)
            sendJson(res, 200, { ok: true, ref, ...row })
            return
          }
          sendJson(res, 200, { ok: true, ...elementRefSummary() })
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      // Blocking condition wait — the automation loop's third primitive. An
      // agent stops polling `sleep` and gets a deterministic verdict:
      // {selector|text|url|fn} matched, or kitesurf.wait.timeout. `load` adds
      // a readyState/commit/networkidle gate. A bounded read (capability
      // read:engine): it mutates nothing and holds the request ≤30s.
      path: WAIT_ROUTE,
      methods: ['POST'],
      bodyLimit: 4096,
      handler: async (req, res, route) => {
        try {
          const body = resolveSelectorRefs(await readBody(req, route.bodyLimit))
          const result = await hostSpan('wait', () => waitForCondition(origin(), body || {}))
          sendJson(res, 200, result)
        } catch (error) {
          fail(res, error)
        }
      },
    },
    {
      path: PERF_REPORT_ROUTE,
      methods: ['POST'],
      bodyLimit: 200000,
      handler: async (req, res, route) => {
        try {
          const body = await readBody(req, route.bodyLimit)
          lastClientPerf = body && typeof body === 'object' ? { at: new Date().toISOString(), report: body } : null
          sendJson(res, 200, { ok: true, at: lastClientPerf?.at })
        } catch (error) { fail(res, error) }
      },
    },
    {
      path: PERF_ROUTE,
      methods: ['GET', 'HEAD', 'POST'],
      handler: (req, res) => {
        const mode = queryOf(req).get('mode')
        // mode=window drains the process-global reservoir — a write, so it is
        // POST-only; a bare GET (or HEAD, or a prefetcher) can never drain.
        if (mode === 'window' && req.method !== 'POST') {
          fail(res, new KitesurfError('kitesurf.perf.method', 'mode=window drains samples; use POST'))
          return
        }
        sendJson(res, 200, { ...perfSnapshot(mode), client: lastClientPerf })
      },
    },
  ].map(traced), { table: ROUTE_TABLE, plugin: PLUGIN })
}
