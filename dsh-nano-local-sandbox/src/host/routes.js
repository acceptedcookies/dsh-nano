export const STATUS_ROUTE = '/nano-local-sandbox/status'
export const OPEN_ROUTE = '/nano-local-sandbox/open'
export const SHOT_ROUTE = '/nano-local-sandbox/shot'
export const HISTORY_ROUTE = '/nano-local-sandbox/history'
export const PICK_ROUTE = '/nano-local-sandbox/pick'
export const EDIT_ROUTE = '/nano-local-sandbox/edit'
export const SETTINGS_ROUTE = '/nano-local-sandbox/settings'
export const LIFECYCLE_ROUTE = '/nano-local-sandbox/lifecycle'
export const CONSOLE_ROUTE = '/nano-local-sandbox/console'
export const OPERATIONS_ROUTE = '/nano-local-sandbox/operations'
export const DIAGNOSTICS_ROUTE = '/nano-local-sandbox/diagnostics'
export const MCP_ROUTE = '/nano-local-sandbox/mcp'
export const PORTS_ROUTE = '/nano-local-sandbox/ports'
export const RECOVER_ROUTE = '/nano-local-sandbox/recover'
export const DOM_ROUTE = '/nano-local-sandbox/dom'
export const SELFTEST_ROUTE = '/nano-local-sandbox/selftest'
export const ELEMENTS_ROUTE = '/nano-local-sandbox/elements'
export const BROWSE_HISTORY_ROUTE = '/nano-local-sandbox/browse-history'
export const LOGS_ROUTE = '/nano-local-sandbox/logs'
export const NETWORK_ROUTE = '/nano-local-sandbox/network'
export const TARGETS_ROUTE = '/nano-local-sandbox/targets'
export const EVALUATE_ROUTE = '/nano-local-sandbox/evaluate'
export const WAIT_ROUTE = '/nano-local-sandbox/wait'
export const STORAGE_ROUTE = '/nano-local-sandbox/storage'
export const INTERACT_ROUTE = '/nano-local-sandbox/interact'
export const STATE_ROUTE = '/nano-local-sandbox/state'
export const HAR_ROUTE = '/nano-local-sandbox/har'
export const SNAPSHOT_ROUTE = '/nano-local-sandbox/snapshot'
export const REFS_ROUTE = '/nano-local-sandbox/refs'
export const CONTROL_ROUTE = '/nano-local-sandbox/control'

import { request as httpRequest } from 'node:http'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { basename, dirname, join } from 'node:path'
import { BINDING_TABLE } from '../../lib/bindings.js'
import { createCdpKeeper } from './cdp-keeper.js'
import { publishedHttpBase } from './backend-apple.js'
import { ensureClient, evaluatePage, navigate, navigationLedger, queueNavigation, readElements, resetClient, withPage } from './cdp-elements.js'
import { answerNativeTool, toolsList } from './mcp-sandbox.js'
import { listProfiles } from './profile-registry.js'
import { containerNameFor as nameForProfile, envHostPorts as portsForProfile, envTag as tagFor, profileContext, profilesRootFor, stateDirFor as stateDirPath, stateRootFor } from './profile-drivers.js'
import { createInstanceRegistry } from './instance-registry.js'
import { policyFingerprint, tupleFromPolicy } from './policy-adapter.js'
import { errorCatalog, errorCode, statusOf } from './error-catalog.js'
import { buildSrcDoc } from './dom-srcdoc.js'
import { bumpEpoch, projectSnapshot } from './observe.js'
import { closeTermSession, listTermSessions, openTermSession, readTermSession, resizeTermSession, termStateFor, writeTermSession } from './term-bridge.js'
import { TERM_TOOLS } from './terminal-driver.js'
import { spawnContainerPty } from './backend-apple.js'

const keeper = createCdpKeeper()

// One restore per process. The engine keeps the page, this process keeps the
// socket that owns it: after a restart the page is about:blank and only the
// durable last address can bring the human back to where they were.
let restoreAttempted = false

// The package version shown in EnvPanel's 插件 row — read once at load, the
// deployed copy's package.json is the source of truth.
const BUILD_ID = (() => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  // The package version, nothing else. A deploy stamp here invited a
  // cross-package comparison that reported drift no deploy had caused.
  try { return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version || null } catch { return null }
})()

/**
 * The page lives in the container, but the CDP socket that created it lives in
 * this process: when the host restarts the socket closes and the engine drops
 * the page back to about:blank. Nothing in memory survives that, so the last
 * address is kept on the instance's own state volume — one file per instance,
 * next to the engine's own state, which is the only durable copy.
 */
let activeProfile = null
let activeDriver = null

/** Resolve the active profile once per request; every sync helper reads this. */
async function bindProfile(session, deps) {
  if (session.__profile) return session.__profile
  const ctx = await profileContext(deps)
  activeProfile = ctx.profile
  activeDriver = ctx.driver
  session.__profile = ctx
  session.stateDir = stateDirPath(deps, ctx.profile, session)
  if (!session.browserHistory) session.browserHistory = ctx.driver.history.create(session)
  return ctx
}

function lastPagePath(session) {
  return join(session.stateDir, 'last-page.json')
}

/** @returns {{url: string, at: string}|null} */
function readLastPage(session) {
  try {
    const info = JSON.parse(readFileSync(lastPagePath(session), 'utf8'))
    return typeof info?.url === 'string' && info.url ? { url: info.url, at: String(info.at || '') } : null
  } catch { return null }
}

function writeLastPage(session, url) {
  if (typeof url !== 'string' || !url) return
  try {
    mkdirSync(session.stateDir, { recursive: true })
    writeFileSync(lastPagePath(session), JSON.stringify({ url, at: new Date().toISOString() }, null, 2) + '\n')
  } catch { /* a read-only home only costs the restore, not the browse */ }
}

/** Durable browser state on the instance state volume (the container's mount). */
function browserStatePath(session) {
  return join(session.stateDir, 'browser-state.json')
}

/**
 * The single durable copy of history/settings/state-snapshots. Written
 * atomically (tmp + rename) after every mutation; loaded lazily once per
 * session so a host restart resumes the same browser, per the owner-approved
 * persistence decision (1119 G22).
 */
function persistBrowserState(session) {
  try {
    mkdirSync(session.stateDir, { recursive: true })
    const doc = {
      v: 1,
      at: new Date().toISOString(),
      history: (session.history || []).slice(-400),
      settings: {
        viewport: session.viewport ?? null,
        userAgent: session.userAgent ?? '',
        media: session.media ?? null,
        extraHeaders: session.extraHeaders ?? null,
        locale: session.locale ?? null,
        geolocation: session.geolocation ?? null,
        colorScheme: session.colorScheme ?? null,
        cookies: session.cookies ?? '',
        // What the driver actually wrote into the jar — without this the
        // post-restart clearAppliedCookies can't delete names it no longer
        // remembers, and stale cookies outlive the settings that set them.
        cookiesApplied: Array.isArray(session.cookiesApplied) ? session.cookiesApplied : [],
      },
      stateSnapshots: session.stateSnapshots || {},
    }
    const tmp = `${browserStatePath(session)}.tmp`
    writeFileSync(tmp, JSON.stringify(doc, null, 2) + '\n')
    renameSync(tmp, browserStatePath(session))
    session.__browserStateDirty = false
  } catch { /* persistence is best-effort; the session copy stays correct */ }
}

/** Load the durable copy once. Settings replay on the next attach/navigation. */
function restoreBrowserState(session) {
  if (session.__browserStateLoaded === true) return
  session.__browserStateLoaded = true
  try {
    const doc = JSON.parse(readFileSync(browserStatePath(session), 'utf8'))
    if (doc?.v !== 1) return
    if (Array.isArray(doc.history) && (!Array.isArray(session.history) || session.history.length === 0)) session.history = doc.history
    const s = doc.settings || {}
    for (const key of ['viewport', 'userAgent', 'media', 'extraHeaders', 'locale', 'geolocation', 'colorScheme', 'cookies']) {
      if (s[key] !== undefined && s[key] !== null) session[key] = s[key]
    }
    if (Array.isArray(s.cookiesApplied)) session.cookiesApplied = s.cookiesApplied
    // Rebuild with a null prototype: a durable doc carrying a 'constructor'
    // key would otherwise leave prototype keys reachable from load lookups.
    if (doc.stateSnapshots && typeof doc.stateSnapshots === 'object' && !Array.isArray(doc.stateSnapshots)) {
      const clean = Object.create(null)
      for (const [key, value] of Object.entries(doc.stateSnapshots)) clean[key] = value
      session.stateSnapshots = clean
    }
  } catch { /* no durable copy yet — fresh environment */ }
}

/**
 * Multi-env: one host owns ONE container per profile, and the name plus the
 * published ports are declared by the profile's `instance` section, so a dev /
 * prod / desktop host each own a distinct, concurrently-running instance.
 *
 * Env tag resolution: DNLS_ENV > DSH_HOME suffix
 * (.dsh-dev→dev, .dsh-desktop→desktop, .dsh/prod→prod).
 */
export function envTag(env = process.env) {
  return tagFor(env)
}

/** The container name this host owns, from the active profile's instance section. */
export function containerNameFor(session, env = process.env) {
  if (typeof session?.containerName === 'string' && session.containerName) return session.containerName
  const profile = session?.__profile?.profile || activeProfile
  if (!profile) throw new Error('profile not loaded: cannot derive a container name')
  return nameForProfile(profile, session, env)
}

/** Host ports to publish for this environment's container. */
export function envHostPorts(env = process.env) {
  const profile = activeProfile
  if (!profile) throw new Error('profile not loaded: cannot derive host ports')
  return portsForProfile(profile, env)
}

/** Normalize inspect state, publications, resources and visible recipe evidence. */
function parseInspect(raw, containerPort = 8787) {
  const text = String(raw ?? '')
  const start = text.indexOf('[')
  const objectStart = text.indexOf('{')
  const at = start >= 0 ? start : objectStart
  if (at < 0) return null
  let data
  try { data = JSON.parse(text.slice(at)) } catch { return null }
  const item = Array.isArray(data) ? data[0] : data
  const state = item?.status?.state ?? item?.state ?? 'unknown'
  const ports = (item?.configuration?.publishedPorts ?? item?.publishedPorts ?? []).map((row) => ({
    containerPort: Number(row.containerPort),
    hostPort: Number(row.hostPort),
    hostAddress: row.hostAddress || '127.0.0.1',
  }))
  const resources = item?.configuration?.resources ?? item?.resources ?? null
  return {
    state,
    ports,
    containerPort,
    ...activeDriver.inspectedRecipe(item?.configuration ?? item),
    resources: resources
      ? {
        cpus: Number(resources.cpus ?? 0) || null,
        memoryBytes: Number(resources.memoryInBytes ?? 0) || null,
      }
      : null,
  }
}

/** `4G` -> bytes, so a running container can be compared with the profile. */
function memoryBytesOf(spec) {
  const text = String(spec ?? '').trim().toUpperCase()
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(G|M|GB|MB|GI|MI)?$/)
  if (!match) return null
  const value = Number(match[1])
  const unit = match[2] || 'G'
  const factor = unit.startsWith('G') ? 1024 ** 3 : 1024 ** 2
  return Math.round(value * factor)
}

/** Does the running container match the profile's declared size? */
function resourceDrift(info, wanted) {
  if (!info?.resources) return null
  const problems = []
  if (info.resources.cpus && wanted.cpus && info.resources.cpus !== wanted.cpus) {
    problems.push(`cpus ${info.resources.cpus} != ${wanted.cpus}`)
  }
  const wantBytes = memoryBytesOf(wanted.memory)
  if (info.resources.memoryBytes && wantBytes && info.resources.memoryBytes !== wantBytes) {
    problems.push(`memory ${Math.round(info.resources.memoryBytes / 1024 ** 3 * 100) / 100}G != ${wanted.memory}`)
  }
  return problems.length ? problems.join(', ') : null
}

/** One HTTP GET with no keep-alive pool, so a probe cannot pin the process. */
function probeHttp(url, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false
    let timer = null
    const finish = (value) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      resolve(value)
    }
    let req
    try {
      const target = new URL(url)
      req = httpRequest({
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: 'GET',
        agent: false,
        headers: { connection: 'close' },
      }, (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          let data = null
          try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { data = null }
          res.destroy()
          req.destroy()
          finish({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data })
        })
      })
    } catch {
      finish({ ok: false, status: 0, data: null })
      return
    }
    timer = setTimeout(() => { req.destroy(); finish({ ok: false, status: 0, data: null }) }, timeoutMs)
    req.on('socket', (socket) => socket.unref())
    req.on('error', () => { req.destroy(); finish({ ok: false, status: 0, data: null }) })
    req.end()
  })
}

/** HTTP face only. A 200 here is not CDP liveness. */
async function engineHttpUp(base, deps, timeoutMs = 900) {
  if (!base) return false
  if (typeof deps?.httpProbe === 'function') return deps.httpProbe(base) === true
  const response = await probeHttp(`${base}/json/list`, timeoutMs)
  return response.ok === true
}

/**
 * One registry per host deps object, created on first per-session request.
 * The hooks give a per-session instance the same runtime shape as the
 * env-scoped container (profile image, published engine+bridge ports, the
 * runtime/tmpfs/state mounts) instead of the registry's bare default.
 */
function registryFor(deps, ctx) {
  if (deps.registry) return deps.registry
  const env = deps.env || process.env
  const profile = ctx.profile
  const stateRoot = stateRootFor(deps)
  const ports = profile.instance?.ports || {}
  deps.registry = createInstanceRegistry({
    backend: deps.backend,
    profile,
    volumeFor: (id) => join(stateRoot, String(profile.id || 'profile'), id),
    imageFor: () => ctx.driver.image(profile, env),
    portSpecFor: (instance) => {
      if (!instance.endpoints?.engine || !instance.endpoints?.mcp) return []
      const enginePort = Number(new URL(instance.endpoints.engine).port)
      const bridgePort = Number(new URL(instance.endpoints.mcp).port)
      return [
        { publish: `127.0.0.1:${enginePort}:${ports.engine ?? 8787}` },
        { publish: `127.0.0.1:${bridgePort}:${ports.bridge ?? 8791}` },
      ]
    },
    mountsFor: (instance) => ctx.driver.mounts(profile, deps, instance.stateVolume),
  })
  return deps.registry
}

/** Display rows. Identity is `plane`, not the Chinese label. */
function summaryOf(snap) {
  if (Array.isArray(snap?.summary) && snap.summary.length) return snap.summary
  return [
    { plane: 'container', label: '容器', ...(snap.checks?.container || { ok: false, detail: '未探测' }) },
    { plane: 'engine', label: '引擎', ...(snap.checks?.engine || { ok: false, detail: '未探测' }) },
    { plane: 'page', label: '页面', ...(snap.checks?.page || { ok: false, detail: '未探测' }) },
    { plane: 'dom', label: 'DOM', ...(snap.checks?.dom || { ok: false, detail: '未探测' }) },
    { plane: 'bridge', label: '桥', ...(snap.checks?.bridge || { ok: false, detail: '未探测' }) },
  ]
}

/**
 * Collapse the operations ring for human eyes: the pane polls /control every
 * 1.5s, which used to fill most of the trace with identical rows and bury the
 * one call that failed. Consecutive same path+method rows fold into one with a
 * repeat count; the newest 20 distinct rows survive.
 */
function collapseOperations(rows) {
  const folded = []
  for (const row of rows) {
    const last = folded.at(-1)
    if (last && last.path === row.path && last.method === row.method && !row.errorId) {
      last.repeat = (last.repeat || 1) + 1
      last.at = row.at
      continue
    }
    folded.push({ ...row })
  }
  return folded.slice(-20)
}

/** CDP answered Browser.getVersion. HTTP /json/list is not enough. */
async function probeCdp(session, httpBase, httpUp, deps) {
  if (!httpUp || !httpBase) return false
  try {
    const client = await clientFor(session, httpBase, deps)
    // The engine may be busy executing Page.navigate. A short health probe
    // must not queue another command or replace the page-owning connection.
    if (client.navigating) return client.alive !== false
    await client.send('Browser.getVersion', {}, undefined, 1500)
    return true
  } catch {
    return false
  }
}

const inflight = new WeakMap()

/**
 * The only observation document. There is no shallow mode: every caller
 * sees the same planes. `ready` is the pane bit; `healthy` is that same bit.
 * Overlapping reads for one session share a single probe pass, so the pane's
 * 1.5s poll plus MCP reads never stack CDP/bridge probes.
 */
function envSnapshot(session, deps) {
  const running = inflight.get(session)
  if (running) return running
  const pass = observeOnce(session, deps).finally(() => {
    if (inflight.get(session) === pass) inflight.delete(session)
  })
  inflight.set(session, pass)
  return pass
}

async function observeOnce(session, deps) {
  const name = containerNameFor(session, deps.env || process.env)
  const host = envHostPorts(deps.env || process.env)
  let info = null
  let inspectFailed = null
  try {
    const inspected = await deps.backend?.inspect?.(name)
    info = parseInspect(inspected?.raw ?? inspected, host.engineContainerPort)
  } catch (error) {
    info = null
    // A daemon-level inspect failure is NOT "container missing" — that used
    // to collapse a broken backend into a healthy-looking 'missing'.
    inspectFailed = error?.errorId || error?.message || 'inspect failed'
    session.backendError = inspectFailed
  }
  // A successful inspect retires the stuck backendError — a recovered daemon
  // used to keep reporting its earlier failure forever.
  if (!inspectFailed) session.backendError = null
  const engineRow = info?.ports?.find((p) => p.containerPort === host.engineContainerPort) || null
  const bridgeRow = info?.ports?.find((p) => p.containerPort === host.bridgeContainerPort) || null
  const derived = engineRow ? `http://${engineRow.hostAddress === '0.0.0.0' ? '127.0.0.1' : engineRow.hostAddress}:${engineRow.hostPort}` : null
  // The container's published port is the observation target; the session
  // pointer only fills in before the first inspect result arrives.
  const httpBase = derived || session.httpBase || null
  const httpUp = await engineHttpUp(httpBase, deps)
  const cdpUp = await probeCdp(session, httpBase, httpUp, deps)
  const state = info?.state || (inspectFailed ? 'unknown' : 'missing')
  const bridgeBase = bridgeControlBase({ httpBase })
  const pageRaw = await probePage(session, httpBase, httpUp && cdpUp, deps)
  const pageUrl = pageRaw.ok ? (pageRaw.detail || '') : ''
  const page = !pageRaw.ok
    ? { state: 'none', detail: pageRaw.detail || 'no page' }
    : pageUrl === 'about:blank'
      ? { state: 'blank', url: pageUrl, detail: pageUrl }
      : { state: 'open', url: pageUrl, detail: pageUrl }
  const domRaw = page.state === 'none' ? { ok: false, detail: 'no page' } : await probeDom(session, httpBase, deps)
  const dom = domRaw.skipped === true
    ? { state: 'skipped', detail: domRaw.detail || '' }
    : domRaw.ok === true
      ? { state: 'ready', detail: domRaw.detail || '' }
      : { state: 'failed', detail: domRaw.detail || 'dom unreachable' }
  const bridgeRaw = await probeBridge(bridgeBase)
  const bridge = bridgeRaw.ok ? { state: 'up', detail: bridgeRaw.detail || '' } : { state: 'down', detail: bridgeRaw.detail || '' }
  const terminal = deps.termPolicyStale
    ? { state: 'policy-stale' }
    : { state: termStateFor(session.termSessionId) === 'listening' || listTermSessions().length > 0 ? 'listening' : 'absent' }
  const effective = { httpBase, enginePort: engineRow?.hostPort ?? host.engineHostPort, bridgePort: bridgeRow?.hostPort ?? host.bridgeHostPort }
  const ports = {
    engine: engineRow ? { port: engineRow.hostPort, containerPort: engineRow.containerPort, heldBy: 'this-container' } : { port: host.engineHostPort, containerPort: host.engineContainerPort, heldBy: 'free' },
    bridge: bridgeRow ? { port: bridgeRow.hostPort, containerPort: bridgeRow.containerPort, heldBy: 'this-container' } : { port: host.bridgeHostPort, containerPort: host.bridgeContainerPort, heldBy: 'free' },
  }
  const draft = projectSnapshot({
    containerName: name,
    containerState: state,
    httpUp,
    cdpUp,
    cdpGeneration: session.cdpGeneration || 0,
    page,
    dom,
    bridge,
    terminal,
    epoch: 0,
    observedAt: new Date().toISOString(),
    buildId: BUILD_ID,
    effective,
    ports,
  })
  const epoch = bumpEpoch(session, draft.planes)
  const snap = { ...draft, epoch, phase: session.phase, httpBase }
  return snap
}

/** Does the engine expose a page target? (cheap: Target.getTargets) */
async function probePage(session, httpBase, alive, deps) {
  if (!alive || !httpBase) return { ok: false, detail: 'engine not answering' }
  try {
    const client = await clientFor(session, httpBase, deps)
    const targets = await client.send('Target.getTargets')
    const page = (targets?.targetInfos || []).find((row) => row.type === 'page')
    return page ? { ok: true, detail: page.url || 'about:blank', targetId: page.targetId } : { ok: false, detail: 'no page target' }
  } catch (error) {
    return { ok: false, detail: error?.errorId || error?.message || 'targets unreachable' }
  }
}

/** Can the pane render native HTML? Needs a non-blank document with a root. */
async function probeDom(session, httpBase, deps) {
  try {
    const client = await clientFor(session, httpBase, deps)
    const value = await withPage(client, async (sessionId) => {
      const result = await client.send('Runtime.evaluate', {
        expression: '(()=>({url:location.href,root:!!document.documentElement,bytes:document.documentElement?document.documentElement.outerHTML.length:0}))()',
        returnByValue: true,
      }, sessionId)
      return result?.result?.value
    })
    if (!value?.root) return { ok: false, detail: 'no document root' }
    if (value.url === 'about:blank') return { ok: true, skipped: true, detail: '未打开页面（等待打开地址）' }
    return { ok: true, detail: `${value.url} · ${value.bytes}B` }
  } catch (error) {
    return { ok: false, detail: error?.errorId || error?.message || 'dom unreachable' }
  }
}

/** Is the container's MCP bridge answering /health? */
async function probeBridge(bridgeBase) {
  if (!bridgeBase) return { ok: false, detail: 'no bridge port' }
  try {
    const response = await probeHttp(`${bridgeBase}/health`, 900)
    if (!response.ok) return { ok: false, detail: `HTTP ${response.status || 'unreachable'}` }
    const data = response.data
    if (!data?.ok) return { ok: false, detail: 'bridge reported not ok' }
    return { ok: true, detail: `conns ${data.conns ?? 0} · accepted ${data.accepted ?? 0} · rejected ${data.rejected ?? 0}` }
  } catch (error) {
    return { ok: false, detail: error?.message || 'bridge unreachable' }
  }
}

/**
 * The 11 checks the profile's `health.selftest` declares as
 * `health.selftest: 11`. Every id is a real probe — the previous /selftest
 * returned a hard-coded total of 1, which made the declaration a lie.
 */
export const SELFTEST_IDS = Object.freeze([
  'container-exists',
  'container-running',
  'engine-cdp-reachable',
  'engine-version',
  'page-target',
  'page-not-blank',
  'dom-renderable',
  'shot-capturable',
  'bridge-health',
  'bridge-writer-free',
  'history-consistent',
])

async function runSelftest(session, deps) {
  const driver = driverOf(session)
  const snap = await envSnapshot(session, deps)
  const found = new Map()
  const push = (id, ok, detail) => found.set(id, { id, ok: ok === true, detail: detail ?? '' })

  push('container-exists', snap.container.state !== 'missing', snap.container.state)
  push('container-running', snap.container.state === 'running', snap.container.state)
  push('engine-cdp-reachable', snap.live === true, snap.planes?.engine?.state || 'down')
  push('page-target', snap.checks.page?.ok === true, snap.checks.page?.detail)
  // `ok` may be true with skipped:true for a blank page; selftest is strict —
  // "renderable" needs a real document, not an empty shell.
  push('dom-renderable', snap.checks.dom?.ok === true && snap.checks.dom?.skipped !== true, snap.checks.dom?.detail)
  push('bridge-health', snap.checks.bridge?.ok === true, snap.checks.bridge?.detail)

  // The remaining checks need a live CDP session; skip cleanly when there is none.
  let version = null
  let blank = null
  let shot = null
  let writer = null
  if (snap.engineAlive && snap.effective.httpBase) {
    try {
      const client = await clientFor(session, snap.effective.httpBase, deps)
      // An engine may carry its marker in revision rather than product (a
      // Chromium-compatible product string); match the whole label.
      const info = await client.send('Browser.getVersion')
      const label = [info?.product, info?.revision].filter(Boolean).join(' ')
      version = label && driver.engineFingerprint.test(label) ? label : null
      const dom = await probeDom(session, snap.effective.httpBase, deps)
      blank = dom.skipped === true ? false : true
      const cap = await withPage(client, (sessionId) => client.send('Page.captureScreenshot', { format: 'png' }, sessionId))
      // The pin answers a failed capture in-band: {data: TINY_PNG, error}.
      // A non-empty data string with an error attached is NOT a real frame.
      shot = typeof cap?.data === 'string' && cap.data.length > 0 && !cap?.error
      if (cap?.error) shot = { error: String(cap.error).slice(0, 120) }
    } catch { /* each probe reports its own failure below */ }
  }
  push('engine-version', Boolean(version), version || 'unavailable')
  push('page-not-blank', blank === true, blank === null ? 'no page' : blank ? 'has document' : 'about:blank')
  // A passing shot used to print "engine error: undefined" — the object-shape
  // branch only fired when cap.error was truthy, but the detail line read the
  // object regardless. Say what the frame actually is.
  push('shot-capturable', shot === true, shot === null ? 'no engine' : shot === false ? 'empty frame' : shot === true ? 'frame captured' : `engine error: ${shot.error}`)

  // Profile-declared probes fill their declared slot; every other id is the
  // kernel's own neutral probe above.
  const bridgeBase = bridgeControlBase({ httpBase: snap.effective.httpBase })
  const bridge = {
    base: bridgeBase,
    json: (pathname, timeoutMs = 900) => (bridgeBase ? probeHttp(`${bridgeBase}${pathname}`, timeoutMs) : Promise.reject(new Error('no bridge port'))),
  }
  const declared = driver.selftest?.ids || SELFTEST_IDS
  for (const [id, probe] of Object.entries(driver.selftest?.probes || {})) {
    if (!declared.includes(id)) continue
    try {
      const result = await probe({ session, snapshot: snap, bridge })
      found.set(id, { id, ok: result?.ok === true, detail: result?.detail ?? '' })
    } catch (error) {
      found.set(id, { id, ok: false, detail: error?.message || 'probe failed' })
    }
  }

  // Emit in the declared order so the response reads like the profile contract.
  const checks = declared.map((id) => found.get(id) || { id, ok: false, detail: 'not run' })
  const failed = checks.filter((row) => !row.ok).length
  // `ok` means the call ran; `passed` is the strict verdict. The snapshot rides
  // along at the top level and nested, so this response is the same document
  // every other read returns.
  return { ...snap, ok: true, passed: failed === 0, failed, total: checks.length, checks, snapshot: snap }
}

/**
 * Bring the environment to a usable state: adopt a running container, start a
 * stopped one, or create+start a missing one. Returns envSnapshot plus what it
 * did. The owner env can therefore self-heal without re-navigating a page.
 */
async function prepareEnvironment(session, deps, ctx = null) {
  const env = deps.env || process.env
  if (!ctx) ctx = await bindProfile(session, deps)
  const name = containerNameFor(session, env)
  const host = envHostPorts(env)
  const { driver, profile, resources } = ctx
  const image = driver.image(profile, env)
  let action = 'noop'
  let info = null
  let inspectFailed = false
  const canInspect = typeof deps.backend?.inspect === 'function'
  if (canInspect) {
    try {
      const inspected = await deps.backend.inspect(name)
      info = parseInspect(inspected?.raw ?? inspected, host.engineContainerPort)
      // A running/real container that inspect can't parse is NOT "missing" —
      // routing it to create() would collide "already exists" the moment the
      // daemon recovers. Three-way: missing / inspectable / unknown.
      if (!info && inspected !== undefined && inspected !== null) inspectFailed = true
    } catch { inspectFailed = true }
  }
  if (inspectFailed) {
    session.lastError = { errorId: errorCode('backend.cli'), error: 'container inspect failed or returned unparseable output', at: new Date().toISOString() }
    return { action: 'blocked', inspectFailed: true, healthy: false, httpBase: null, phase: session.phase }
  }
  if (!info && !canInspect) {
    // Fixture-grade backend without inspect: preserve the legacy "start it"
    // contract instead of inventing a create it can't fulfil.
    await deps.backend?.start?.(name)
    action = 'started'

  } else if (!info) {
    // Runtime is a prebuilt derivative, never the official source checkout.
    // Validate it before making a state directory or asking the backend to run.
    const mounts = driver.mounts(profile, deps, session.stateDir)
    await deps.backend?.ensureImage?.({ tag: image, publicSpec: {} })
    await deps.backend?.create?.({
      containerName: name,
      image,
      resources,
      mounts,
      ports: [
        { publish: `127.0.0.1:${host.engineHostPort}:${host.engineContainerPort}` },
        { publish: `127.0.0.1:${host.bridgeHostPort}:${host.bridgeContainerPort}` },
      ],
    })
    action = 'created'
  } else {
    const changedRecipe = driver.drift(info, { image, runtimeRoot: driver.runtimeRoot(profile, deps), stateDir: session.stateDir })
    const changedResources = resourceDrift(info, resources)
    if (changedRecipe || changedResources) {
      // Validate the complete derivative + receipt before touching an old
      // container, even when it is stopped. Keep its publications; the state
      // volume is always the kernel-assigned one, so a container still on a
      // retired state location moves to it here and the old directory is left
      // on disk untouched and unread.
      const mounts = driver.mounts(profile, deps, session.stateDir)
      await deps.backend?.ensureImage?.({ tag: image, publicSpec: {} })
      if (info.state !== 'stopped') await deps.backend.stop(name)
      // Stop succeeded (or inspect already proved stopped): only now may we
      // drop the old page-owning socket. Backend failures must abort create.
      resetClient(session)
      await deps.backend.remove(name)
      await deps.backend.create({
        containerName: name,
        image,
        resources,
        mounts,
        ports: driver.recreatePorts(info, host),
      })
      action = changedRecipe ? 'recreated' : `resized (${changedResources})`
    } else if (info.state !== 'running') {
      await deps.backend?.start?.(name)
      action = 'started'
    }
  }
  // A fresh container needs a beat for its services to come up. Poll the
  // engine face briefly so a first-time "prepare" reports real health instead
  // of always saying "created but not answering yet".
  const settleMs = Number(deps.prepareTimeoutMs ?? 6000)
  const waitUntil = async (predicate, ms) => {
    const deadline = Date.now() + ms
    let snap = await envSnapshot(session, deps)
    while (!predicate(snap) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 600))
      snap = await envSnapshot(session, deps)
    }
    return snap
  }
  let snap = await waitUntil((row) => row.live === true, action === 'noop' ? 0 : settleMs)
  // Only a container that was already running and whose HTTP face answers
  // while CDP does not (http-only) is restarted. A blank page is not a wedge.
  // Creation and start get a grace pass: this call does not stop what it just
  // started. Apple container has no restart subcommand; stop+start only.
  if (action === 'noop' && snap.planes?.engine?.state === 'http-only') {
    try {
      await deps.backend.stop(name)
      resetClient(session)
      await deps.backend.start(name)
      action = 'restarted'
      snap = await waitUntil((row) => row.live === true, settleMs)
    } catch { /* keep the snapshot; the failure stays visible in planes */ }
  }
  if (snap.httpBase) session.httpBase = session.httpBase || snap.httpBase
  if (snap.healthy) session.phase = 'running'
  return { action, ...snap }
}

export const STORAGE_OPS = Object.freeze(['read', 'set', 'delete', 'clear'])

function storageExpression(opts) {
  const scope = opts.scope === 'session' ? 'sessionStorage' : opts.scope === 'cookie' ? 'cookie' : 'localStorage'
  const op = opts.op || 'read'
  if (scope === 'cookie') {
    if (op === 'read') return `(()=>{const m={};for(const p of document.cookie.split('; ')){const i=p.indexOf('=');if(i>0)m[p.slice(0,i)]=p.slice(i+1)}return{entries:m}})()`
    if (op === 'set') return `(()=>{document.cookie=${JSON.stringify(`${opts.name}=${opts.value ?? ''}; path=/`)};return{ok:true}})()`
    return `(()=>{document.cookie=${JSON.stringify(`${opts.name || ''}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`)};return{ok:true}})()`
  }
  if (op === 'read') return `(()=>{const s=${scope};const m={};for(let i=0;i<s.length;i++){const k=s.key(i);m[k]=s.getItem(k)}return{entries:m}})()`
  if (op === 'set') return `(()=>{${scope}.setItem(${JSON.stringify(String(opts.name || ''))},${JSON.stringify(String(opts.value ?? ''))});return{ok:true}})()`
  if (op === 'delete') return `(()=>{${scope}.removeItem(${JSON.stringify(String(opts.name || ''))});return{ok:true}})()`
  if (op === 'clear') return `(()=>{${scope}.clear();return{ok:true}})()`
  // Unknown ops must never reach the page — callers 400 them first; a reach
  // here is a bug, and returning clear() would silently wipe the storage.
  throw Object.assign(new Error(`unknown storage op '${op}'`), { status: 400, errorId: errorCode('storage.op') })
}

function interactExpression(body) {
  const action = String(body.action || '').toLowerCase()
  const selector = String(body.selector || body.target || '')
  const arg = JSON.stringify({
    action,
    selector,
    text: body.text ?? body.value ?? '',
    key: body.key || '',
    option: body.option ?? '',
    x: Number.isFinite(Number(body.x)) ? Number(body.x) : null,
    y: Number.isFinite(Number(body.y)) ? Number(body.y) : null,
  })
  return `(()=>{
    const a=${arg};
    // Coordinate targeting uses elementFromPoint — the route guard's
    // {x,y} promise is a real target, not a dropped field.
    const el=a.x!==null||a.y!==null
      ? document.elementFromPoint(a.x||0,a.y||0)
      : document.querySelector(a.selector);
    if(!el)return{ok:false,errorId:'${errorCode('interact.miss')}',error:a.x!==null?('no element at '+a.x+','+a.y):('no element matches '+a.selector)};
    try{el.scrollIntoView({block:'center',inline:'center'})}catch{}
    const r=el.getBoundingClientRect();
    const cx=r.left+r.width/2,cy=r.top+r.height/2;
    const top=document.elementFromPoint(cx,cy);
    const occluded=top&&top!==el&&!el.contains(top)&&!top.contains(el);
    if(!(r.width>0&&r.height>0))return{ok:false,errorId:'${errorCode('interact.invisible')}',error:'element has zero box'};
    if(occluded)return{ok:false,errorId:'${errorCode('interact.occluded')}',error:'covered by '+(top.id?'#'+top.id:top.tagName)};
    const fire=(type,init)=>{el.dispatchEvent(new (type.startsWith('key')?KeyboardEvent:type==='input'?InputEvent:MouseEvent)(type,Object.assign({bubbles:true,cancelable:true},init)))};
    const nativeSet=(o,v)=>{const d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(o),'value');if(d&&d.set)d.set.call(o,v);else o.value=v};
    switch(a.action){
      case 'click': ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(t=>fire(t,{clientX:cx,clientY:cy})); break;
      case 'dblclick': ['pointerdown','mousedown','pointerup','mouseup','click','dblclick'].forEach(t=>fire(t,{clientX:cx,clientY:cy})); break;
      case 'focus': el.focus(); break;
      case 'blur': el.blur(); break;
      case 'hover': ['pointerover','mouseover','pointermove','mousemove'].forEach(t=>fire(t,{clientX:cx,clientY:cy})); break;
      case 'fill': el.focus(); nativeSet(el,a.text); fire('input',{data:a.text,inputType:'insertText'}); fire('change'); break;
      case 'type': el.focus(); for(const ch of String(a.text)){fire('keydown',{key:ch});nativeSet(el,(el.value||'')+ch);fire('input',{data:ch,inputType:'insertText'});fire('keyup',{key:ch})} fire('change'); break;
      case 'press': ['keydown','keypress','keyup'].forEach(t=>fire(t,{key:a.key||'Enter'})); break;
      case 'select': if(el.tagName!=='SELECT')return{ok:false,errorId:'${errorCode('interact.type')}',error:'select only works on select'}; {const o=[...el.options].find(o=>o.value===a.option||o.text===a.option); if(!o)return{ok:false,errorId:'${errorCode('interact.option')}',error:'no option '+a.option}; nativeSet(el,o.value); fire('change');} break;
      case 'check': if(el.type!=='checkbox'&&el.type!=='radio')return{ok:false,errorId:'${errorCode('interact.type')}',error:'check only works on checkbox/radio'}; el.checked=true; fire('click'); fire('change'); break;
      case 'uncheck': if(el.type!=='checkbox')return{ok:false,errorId:'${errorCode('interact.type')}',error:'uncheck only works on checkbox'}; el.checked=false; fire('click'); fire('change'); break;
      default: return{ok:false,errorId:'${errorCode('interact.action')}',error:'unsupported action '+a.action};
    }
    return{ok:true,action:a.action,selector:a.selector,tag:el.tagName.toLowerCase()};
  })()`
}

function stateSaveExpression() {
  return `(()=>{const grab=s=>{const m={};for(let i=0;i<s.length;i++){const k=s.key(i);m[k]=s.getItem(k)}return m};return{localStorage:grab(localStorage),sessionStorage:grab(sessionStorage),cookie:document.cookie,url:location.href}})()`
}

function stateLoadExpression(state) {
  // Load replaces the named stores and clears keys the snapshot did not have —
  // restoring must not leave stale keys from the live page behind.
  // The saved record also carries `cookie` (document.cookie string) and `url`
  // (the snapshot's origin): restore the cookie pairs the origin allows and
  // report the saved url so the caller can decide to navigate back.
  const cookiePairs = typeof state.cookie === 'string' && state.cookie
    ? state.cookie.split(';').map((pair) => pair.trim()).filter(Boolean).slice(0, 100)
    : []
  return `(()=>{const put=(s,o)=>{const keep=new Set(Object.keys(o||{}));const dead=[];for(let i=0;i<s.length;i++){const k=s.key(i);if(!keep.has(k))dead.push(k)}dead.forEach(k=>s.removeItem(k));for(const [k,v] of Object.entries(o||{}))s.setItem(k,v)};put(localStorage,${JSON.stringify(state.localStorage || {})});put(sessionStorage,${JSON.stringify(state.sessionStorage || {})});const pairs=${JSON.stringify(cookiePairs)};let cookieSet=0;for(const p of pairs){try{document.cookie=p;cookieSet++}catch{}};return{ok:true,url:location.href,cookieSet}})()`
}

/**
 * Snapshot yields a numbered ref table — the shared handle pane and agent
 * both dereference (@N → CSS selector). Refs cover interactable + semantic
 * elements with a deterministic CSS path so /pick/@N, /edit/@N and
 * /interact/@N all land on the same node a human sees.
 */
function snapshotExpression(maxNodes = 120) {
  const cap = Math.max(1, Math.min(Number(maxNodes) || 120, 500))
  return `(()=>{
    const path=(el)=>{if(!el||el.nodeType!==1)return'';if(el.id)return'#'+CSS.escape(el.id);const parts=[];let n=el;while(n&&n.nodeType===1&&n.tagName!=='HTML'){const tag=n.tagName.toLowerCase();const cls=(typeof n.className==='string'?n.className.trim():'').split(/\\s+/).filter(Boolean).slice(0,2).map(c=>'.'+CSS.escape(c)).join('');let sel=tag+cls;const p=n.parentElement;if(p){const sib=[...p.children].filter(c=>c.tagName===n.tagName);if(sib.length>1)sel+=':nth-of-type('+String(sib.indexOf(n)+1)+')'}parts.unshift(sel);n=p}return parts.join('>')};
    const wanted='a,button,input,textarea,select,label,[role],[onclick],[contenteditable=true],h1,h2,h3,h4,nav,main,article,section,form,summary';
    const out={};let i=0;
    document.querySelectorAll(wanted).forEach((el)=>{if(i>=${cap})return;const r=el.getBoundingClientRect();const ref='@'+(++i);out[ref]={selector:path(el),tag:el.tagName.toLowerCase(),id:el.id||null,cls:typeof el.className==='string'?el.className.trim().slice(0,80):null,text:(el.innerText||el.value||el.getAttribute('aria-label')||'').trim().slice(0,80),role:el.getAttribute('role'),type:el.tagName==='INPUT'?(el.type||'text'):null,href:el.tagName==='A'?(el.getAttribute('href')||null):null,box:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}}});
    return{url:location.href,title:document.title,count:document.querySelectorAll('*').length,tree:(document.body&&document.body.innerText||'').slice(0,4000),refs:out,truncated:i>=${cap},capturedAt:new Date().toISOString()}
  })()`
}

/**
 * `@N`, a bare number, or a selector resolve through the last /snapshot's ref
 * table. The table is page-generation-scoped: refs are dropped on navigate so
 * a stale handle can't write into a different document.
 */
function resolveTarget(session, body = {}) {
  const ref = body.ref ?? body.target
  if (ref !== undefined && ref !== null && ref !== '') {
    const asText = String(ref)
    // @N / bare number goes through the ref table; a non-numeric string is a
    // selector, not a ref — the old code 404'd every plain selector sent as
    // `target`/`ref`.
    const isRefShape = /^@?\d+$/.test(asText)
    if (isRefShape) {
      const key = asText.startsWith('@') ? asText : `@${asText}`
      // The table is stamped with the page generation that produced it. A
      // generation check backstops the frameNavigated invalidation so an
      // event the engine swallowed can't leak a stale handle through.
      const live = session.refsGen === (session.pageGen || 0) ? session.refs : null
      const hit = live?.[key]
      if (hit?.selector) return { selector: hit.selector, ref: key }
      return { ref: key, miss: true }
    }
    return { selector: asText }
  }
  // @N carried in the selector field resolves too — the skill contract says
  // @N is legal in any selector-taking body (wait/pick/edit/evaluate).
  if (typeof body.selector === 'string' && /^@\d+$/.test(body.selector.trim())) {
    const key = body.selector.trim()
    const live = session.refsGen === (session.pageGen || 0) ? session.refs : null
    const hit = live?.[key]
    if (hit?.selector) return { selector: hit.selector, ref: key }
    return { ref: key, miss: true }
  }
  if (body.selector) return { selector: String(body.selector) }
  if (Number.isFinite(Number(body.x)) || Number.isFinite(Number(body.y))) return { coords: { x: Number(body.x) || 0, y: Number(body.y) || 0 } }
  return {}
}

/** Browser address input accepts a bare hostname, but CDP requires an
 * absolute HTTP(S) URL. Keep this normalization at the navigation boundary. */
function navigationUrl(raw) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  // 'example.com:8080/x' parses as scheme 'example.com' — a bare host:port
  // must not be refused as a bad scheme. Heuristic: a scheme carries '://';
  // a colon before dots or followed by digits is host:port, prepend https.
  const schemeMatch = /^([a-z][a-z\d+.-]*):/i.exec(text)
  let absolute
  if (!schemeMatch) absolute = `https://${text}`
  else if (text.startsWith(`${schemeMatch[0]}//`)) absolute = text
  else {
    const afterColon = text.slice(schemeMatch[0].length)
    const bareHost = schemeMatch[1].includes('.') || /^\d/.test(afterColon)
    absolute = bareHost ? `https://${text}` : text
  }
  let url
  try { url = new URL(absolute) } catch {
    throw Object.assign(new Error('Enter a valid HTTP(S) address'), { errorId: errorCode('url.scheme'), status: 400 })
  }
  if (!text || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw Object.assign(new Error('Only HTTP(S) addresses without credentials are allowed'), { errorId: errorCode('url.scheme'), status: 400 })
  }
  return url.href
}

async function readJson(req, limit = 0) {
  const checkShape = (parsed) => {
    // Every consumer treats the body as an options object. A JSON array or
    // scalar is valid JSON but lands as a *write with empty options* (the
    // /state [1,2] → save-with-side-effects class of bug) — reject it here.
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    if (parsed === undefined) return {}
    throw Object.assign(new Error('request body must be a JSON object'), { status: 400, errorId: errorCode('body.json') })
  }
  if (req?.body !== undefined && req?.body !== null) {
    if (limit > 0 && Buffer.byteLength(JSON.stringify(req.body)) > limit) {
      throw Object.assign(new Error(`request body exceeds ${limit} bytes`), { status: 413, errorId: errorCode('body.toolarge') })
    }
    return checkShape(req.body)
  }
  const chunks = []
  let size = 0
  if (req && typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req) {
      size += chunk.length
      if (limit > 0 && size > limit) {
        throw Object.assign(new Error(`request body exceeds ${limit} bytes`), { status: 413, errorId: errorCode('body.toolarge') })
      }
      chunks.push(Buffer.from(chunk))
    }
  }
  if (!chunks.length) return {}
  const text = Buffer.concat(chunks).toString('utf8')
  let parsed
  try { parsed = JSON.parse(text) } catch {
    // Malformed JSON must never become an empty patch — an empty patch
    // silently wiped settings (the 2026-11-18 audit defect).
    throw Object.assign(new Error('request body is not valid JSON'), { status: 400, errorId: errorCode('body.json') })
  }
  return checkShape(parsed)
}

/**
 * CDP client for a base url. `deps.connect` lets tests and fixtures inject a
 * fake transport; production falls through to the real socket in cdp-elements.
 */
function clientFor(session, base, deps) {
  return ensureClient(session, base, deps?.connect)
}

/** Driver hooks for a navigation: pre-navigation settings and URL decoration. */
function navHooks(session) {
  const driver = driverOf(session)
  return { applySettings: driver.settings.applyToPage, decorateUrl: driver.settings.decorateUrl }
}

/** Re-open the last address once after restart, only if the page is blank. */
async function restoreLastPage(session, deps) {
  const remembered = readLastPage(session)
  if (!remembered) return false
  const base = await ensureBase(session, deps)
  if (!base) return false
  const client = await clientFor(session, base, deps)
  const current = await evaluatePage(client, 'location.href').catch(() => null)
  const href = typeof current === 'string' ? current : current?.value
  if (href && href !== 'about:blank') return false
  session.pageUrl = remembered.url
  await navigate(session, base, remembered.url, deps.connect, { hooks: navHooks(session) })
  session.browserHistory?.recordHistory(remembered.url)
  return true
}

async function ensureBase(session, deps) {
  // The container's published port is the only source: a second writable
  // pointer would let the pane and the routes operate different engines.
  if (session.httpBase) return session.httpBase
  if (!deps.backend?.inspect) return null
  try {
    const inspected = await deps.backend.inspect(containerNameFor(session, deps.env || process.env))
    const base = publishedHttpBase(inspected.raw ?? inspected)
    if (!base) return null
    if (session.phase === 'idle') session.phase = 'running'
    session.httpBase = base
    return base
  } catch {
    return null
  }
}

/**
 * Capture the live document, stamp the page-generation-scoped version fields,
 * and refresh session.lastDom (the record the bridge's sandbox.dom serves).
 * Returns {url, srcdoc, bytes, stripped, capturedAt, domSeq, generation} or
 * {error:'empty'|'blank'} so route and push-tick callers share one truth.
 */
async function captureDom(session, base, deps) {
  const client = await clientFor(session, base, deps)
  const page = await withPage(client, async (sessionId) => {
    const result = await client.send('Runtime.evaluate', {
      expression: '(()=>({url:location.href,html:document.documentElement?document.documentElement.outerHTML:""}))()',
      returnByValue: true,
    }, sessionId)
    return result?.result?.value
  })
  if (!page?.html) return { error: 'empty' }
  if (page.url === 'about:blank') return { error: 'blank' }
  const built = buildSrcDoc({ url: page.url, html: page.html })
  // domSeq is the pane's staleness cursor: it must only advance when the
  // captured document actually changed — bumping it on every read makes the
  // pane's "same-version" guard never hit and rewrites the iframe
  // (scroll/selection lost) every poll tick.
  const hash = createHash('sha1').update(`${built.url}\n${page.html}`).digest('hex').slice(0, 12)
  if (hash !== session.domHash) {
    session.domHash = hash
    session.domSeq = (session.domSeq || 0) + 1
    // capturedAt is the CONTENT's last-change stamp, not this read's clock —
    // a per-poll timestamp makes the pane's version signature differ every
    // tick and rewrites the iframe even though nothing changed.
    session.domCapturedAt = new Date().toISOString()
  }
  const generation = session.pageGen || 0
  const record = { url: built.url, srcdoc: built.srcdoc, bytes: built.bytes, stripped: built.stripped, capturedAt: session.domCapturedAt, domSeq: session.domSeq, generation }
  // The bridge's sandbox.dom tool serves the pushed copy of this record.
  session.lastDom = { url: record.url, bytes: record.bytes, preview: page.html.slice(0, 4000), capturedAt: record.capturedAt, domSeq: record.domSeq, generation }
  return record
}

let opSeq = 0
function send(res, status, body) {
  // res.__op links the response to the operations row opened in the handler,
  // so /operations carries status/errorId/duration instead of presence only.
  if (res.__op) {
    res.__op.status = status
    // JSON-RPC failures ride HTTP 200 — body.error.code is the real outcome,
    // not the transport status.
    const rpcErr = body?.error && typeof body.error === 'object' ? body.error : null
    const rpcFail = rpcErr !== null || body?.result?.isError === true
    res.__op.ok = status < 400 && !rpcFail
    res.__op.errorId = body?.errorId ?? body?.result?.errorId ?? (rpcErr ? `jsonrpc:${rpcErr.code}` : null)
    // A clean answer retires the pane's last-error line; only real failures
    // keep it lit.
    if (res.__op.ok && res.__session) res.__session.lastError = null
    res.__op.durationMs = Date.now() - res.__op.startedMs
    // Errors get a correlatable incidentId — the diagnostic "this route call
    // failed" receipt an agent can grep in the ops ring (same shape the perf
    // span events carry). It is echoed BACK on the response so the caller can
    // find its own row in /operations.
    if ((status >= 400 || rpcFail) && !res.__op.incidentId) {
      res.__op.incidentId = `op-${Date.now().toString(36)}-${(++opSeq).toString(36)}`
      if (body && typeof body === 'object' && !Array.isArray(body)) body.incidentId = res.__op.incidentId
    }
  }
  res.statusCode = status
  res.end(body === null || body === undefined ? undefined : JSON.stringify(body))
}

/**
 * HITL: the container's MCP bridge holds the real writer lock + humanHold on
 * its loopback HTTP face (engine port +1 — engine:8798 → bridge:8799, the same
 * convention entrypoint uses). The pane can't reach that port directly, so
 * /nano-local-sandbox/control proxies it: GET merges bridge /health control
 * state, POST {action:takeover|release} toggles the sticky human override.
 */
// Exported for the unit suite: the IPv6 double-bracket bug is invisible to
// black-box route tests because bridgeFetch swallows the base into network
// errors — the mapping itself needs a direct assertion.
export function bridgeControlBase(session) {
  const httpBase = session?.httpBase || ''
  // URL() handles [::1] bracketed hosts that the old [^:]+ regex split
  // mid-address — a real bug once an agent configures an IPv6 httpBase.
  let parsed
  try { parsed = new URL(httpBase) } catch { return null }
  const portNum = Number(parsed.port)
  if (!Number.isInteger(portNum) || portNum <= 0) return null
  // Every profile that ships a bridge publishes it on the next host port; the
  // lane is derived from the engine's, never configured separately.
  const port = portNum + 1
  // parsed.hostname already carries [] for IPv6 literals — wrapping again
  // produced http://[[::1]]:8801 and broke every bridge call.
  return `${parsed.protocol}//${parsed.hostname}:${port}`
}

async function bridgeFetch(session, pathname, { method = 'GET', body = null, timeoutMs = 2500 } = {}) {
  const base = bridgeControlBase(session)
  if (!base) throw Object.assign(new Error('engine base unknown'), { errorId: errorCode('control.bridge'), status: 502 })
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}${pathname}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : null,
      signal: ac.signal,
    })
    const text = await res.text()
    try { return { status: res.status, data: JSON.parse(text) } } catch { return { status: res.status, data: { ok: false, error: text.slice(0, 200) } } }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * The one diagnostics document. GET /diagnostics, sandbox.diagnostics and the
 * bridge push all serve this — the "MCP sees an empty world" defect came from
 * a second, synthetic copy.
 */
async function diagnosticsPayload(session, deps, { withCatalog = false } = {}) {
  const driver = driverOf(session)
  const snap = await envSnapshot(session, deps)
  let targetInfos = []
  let engineError = null
  if (snap.engineAlive && snap.httpBase) {
    try {
      const client = await clientFor(session, snap.httpBase, deps)
      const targets = await client.send('Target.getTargets')
      targetInfos = targets?.targetInfos || []
    } catch (error) { engineError = error?.errorId || error?.message || 'targets unreachable' }
  }
  const hints = []
  if (snap.container.state === 'missing') hints.push('容器缺失：点「一键准备环境」或 POST /lifecycle {action:start} 创建')
  else if (snap.container.state !== 'running') hints.push(`容器状态 ${snap.container.state}：一键准备环境启动它`)
  if (snap.container.state === 'unknown') hints.push(`容器后台不可达：${session.backendError || 'inspect failed'} — 不是"缺失"，先查 daemon`)
  if (!snap.engineAlive) hints.push('引擎未应答 CDP：容器 running 但引擎僵死时重试 /recover 或重启容器')
  if (engineError) hints.push(`引擎探测失败：${engineError}`)
  if (targetInfos.length === 0 && snap.engineAlive) hints.push('无 page target：先 POST /open 打开一个页面')
  if (snap.checks.page?.ok && snap.checks.dom && !snap.checks.dom.ok) hints.push(`DOM 不可渲染（${snap.checks.dom.detail}）：面板会退回截图模式`)
  if (snap.checks.bridge && !snap.checks.bridge.ok) hints.push(`MCP 桥不可达（${snap.checks.bridge.detail}）：HITL 控制态与 agent 工具会失败`)
  const summary = summaryOf(snap)
  const text = [
    `环境诊断 · ${snap.healthy ? '正常' : '异常'}`,
    `实例 ${snap.containerName} · 容器 ${snap.container.state}`,
    `引擎 ${snap.effective.httpBase || '—'} · 桥 ${snap.effective.bridgePort || '—'}`,
    ...summary.map((row) => `${row.skipped ? '○' : row.ok ? '✓' : '✗'} ${row.label}：${row.detail || '—'}`),
    ...(hints.length ? ['', '建议：', ...hints.map((hint) => `· ${hint}`)] : []),
  ].join('\n')
  return {
    ...snap,
    ok: true,
    httpBase: snap.httpBase,
    // Derived only from the snapshot: a repointed port would make /status and
    // /diagnostics disagree, so there is no second writable source.
    lifecycle: {
      phase: session.phase,
      httpBase: snap.effective?.httpBase ?? '',
      mcpPort: snap.effective?.bridgePort ?? null,
      engineUrl: snap.effective?.httpBase
        ? `ws://${(() => { try { return new URL(snap.effective.httpBase).host } catch { return '' } })()}/devtools/browser`
        : '',
      cdp: (() => {
        try {
          const port = snap.effective?.bridgePort
          return port ? `ws://${new URL(snap.effective?.httpBase || 'http://127.0.0.1').hostname}:${port}/cdp` : null
        } catch { return null }
      })(),
    },
    container: snap.container,
    containerName: snap.containerName,
    effective: snap.effective,
    ports: snap.ports,
    engineAlive: snap.engineAlive,
    checks: snap.checks,
    healthy: snap.healthy,
    summary,
    text,
    navigation: navigationLedger(session),
    targets: targetInfos.map((t) => ({ targetId: t.targetId, type: t.type, url: t.url, title: t.title })),
    console: (session.console || []).slice(-10),
    network: (session.network || []).slice(-10),
    operations: collapseOperations(session.operations || []),
    history: (session.history || []).slice(-10),
    settings: driver.settings.read(session),
    capabilities: { unsupported: driver.settings.capabilityNotes(session) },
    ...(withCatalog ? { errorCatalog: errorCatalog().map((row) => ({ errorId: row.example, status: row.status, cause: row.cause, next: row.next })) } : {}),
    hints,
  }
}

/**
 * Build the tool-owner plane for /mcp from the SAME session+deps the HTTP
 * routes use. Read-only tools are real domain reads; lifecycle tools reuse
 * prepareEnvironment/envSnapshot/backend so a tool does observable work.
 * `owners` is what mcp-sandbox.js's TOOL_DEFS consume.
 */
function buildOwners(session, deps, ctx) {
  const env = deps.env || process.env
  const name = () => containerNameFor(session, env)
  const profilesRoot = profilesRootFor(deps)
  return {
    // profile plane (PublicProfile — id/scope/version/digest, no recipe/mount secrets)
    profiles: {
      list: () => listProfiles(profilesRoot).map((p) => ({ id: p.id, version: p.manifest?.version, scope: p.manifest?.scope, digest: p.digest, ready: p.ready })),
      describe: (id) => {
        const p = listProfiles(profilesRoot).find((x) => x.id === id)
        if (!p) return null
        return { id: p.id, version: p.manifest?.version, scope: p.manifest?.scope, platform: p.manifest?.platform, digest: p.digest, ready: p.ready }
      },
    },
    // instance lifecycle — real backend/registry work, observable side-effects.
    instances: {
      // With a sessionId this provisions a per-session instance through the
      // registry (own container name, own port pair, policy fingerprint) and
      // starts it. Without one it falls back to the env-scoped container, which
      // is what the pane uses. Previously sessionId was accepted and dropped,
      // so the registry's per-session support was unreachable from the route.
      ensure: async ({ sessionId, policy } = {}) => {
        if (!sessionId) return prepareEnvironment(session, deps, ctx)
        const snap = await envSnapshot(session, deps)
        const registry = registryFor(deps, ctx)
        const httpBase = snap.effective?.httpBase || null
        const result = await registry.ensure({
          sessionId,
          policy,
          adopt: {
            skipCreate: true,
            containerName: snap.containerName,
            endpoints: {
              engine: httpBase,
              cdp: httpBase ? `${String(httpBase).replace(/^http/, 'ws')}/devtools/browser` : null,
              mcp: snap.effective?.bridgePort ? `ws://127.0.0.1:${snap.effective.bridgePort}/mcp` : null,
            },
          },
        })
        if (!result.ok) return result
        const instance = result.instance
        instance.phase = snap.container?.state === 'running' ? 'running' : instance.phase
        instance.attached = true
        instance.lastAttach = Date.now()
        return {
          ok: true,
          status: result.status,
          instanceId: instance.instanceId,
          sessionId: instance.sessionId,
          policyFingerprint: instance.policyFingerprint,
          containerName: instance.containerName,
          endpoints: instance.endpoints,
          phase: instance.phase,
        }
      },
      start: async () => { await deps.backend?.start?.(name()); return { ok: true, action: 'started' } },
      stop: async () => { await deps.backend?.stop?.(name()); return { ok: true, action: 'stopped' } },
      restart: async () => { await deps.backend?.stop?.(name()); await deps.backend?.start?.(name()); return { ok: true, action: 'restarted' } },
      status: async () => envSnapshot(session, deps),
      list: async () => registryFor(deps, ctx).list(),
    },
    // observability plane — the live session snapshot the routes mutate.
    state: session,
    // diagnostics reads the SAME document GET /diagnostics serves. A null or
    // {ok:true, data:null} here used to be a silent "everything is empty" lie.
    diagnostics: { read: async () => diagnosticsPayload(session, deps) },
    // page / cdp planes — the real engine face, same answer as the HTTP rows.
    page: {
      dom: async () => {
        const base = await ensureBase(session, deps)
        if (!base) return { ok: false, errorId: errorCode('dom.empty'), error: 'no engine page' }
        const client = await clientFor(session, base, deps)
        return withPage(client, async (sessionId) => {
          const result = await client.send('Runtime.evaluate', {
            expression: '(()=>({url:location.href,bytes:document.documentElement?document.documentElement.outerHTML.length:0,root:!!document.documentElement}))()',
            returnByValue: true,
          }, sessionId)
          const value = result?.result?.value
          if (!value?.root) return { ok: false, errorId: errorCode('dom.empty'), error: 'no serializable document' }
          return { url: value.url, bytes: value.bytes, capturedAt: new Date().toISOString() }
        })
      },
      elements: async ({ limit, selector } = {}) => {
        const base = await ensureBase(session, deps)
        if (!base) return { ok: false, errorId: errorCode('elements.empty'), error: 'no engine page' }
        const client = await clientFor(session, base, deps)
        const read = await readElements(client, { depth: 4, selector })
        const nodes = (read.nodes || []).slice(0, Math.max(1, Math.min(Number(limit) || 40, 220)))
        return { count: nodes.length, nodes, selector: read.selector || '', matched: read.matched || null }
      },
    },
    targets: {
      list: async () => {
        const base = await ensureBase(session, deps)
        if (!base) return []
        const client = await clientFor(session, base, deps)
        const targets = await client.send('Target.getTargets')
        return (targets?.targetInfos || []).map((row) => ({ targetId: row.targetId, type: row.type, url: row.url, title: row.title }))
      },
    },
    ports: { list: async () => envSnapshot(session, deps) },
    selftest: { run: async () => runSelftest(session, deps) },
    // The plan mirrors what /diagnostics would recommend for THIS snapshot —
    // an empty array here used to hide every recoverable fault.
    recovery: {
      plan: async () => {
        const snap = await envSnapshot(session, deps)
        const steps = []
        if (snap.container?.state === 'missing') steps.push({ step: 'create container', command: "POST /nano-local-sandbox/lifecycle {action:'start'}", state: snap.container.state })
        else if (snap.container?.state !== 'running') steps.push({ step: 'start container', command: "POST /nano-local-sandbox/recover {}", state: snap.container?.state })
        if (snap.container?.state === 'running' && !snap.engineAlive) steps.push({ step: 'restart engine', command: "POST /nano-local-sandbox/recover {}", state: 'engine down' })
        // /recover is the real route — /kite has no 'restart' action and the
        // old step taught the agent a self-defeating command.
        if (snap.checks?.bridge && !snap.checks.bridge.ok) steps.push({ step: 'recover container to revive MCP bridge', command: "POST /nano-local-sandbox/recover {}", state: 'bridge down' })
        return steps
      },
    },
    bridge: { health: async () => { try { const r = await bridgeFetch(session, '/health'); return { ok: r.status === 200, status: r.status } } catch (e) { return { ok: false, errorId: errorCode('control.bridge'), error: e.message } } } },
  }
}

/** The active profile driver, resolved by bindProfile before any handler body. */
function driverOf(session) {
  const driver = session?.__profile?.driver
  if (!driver) throw Object.assign(new Error('profile driver unavailable'), { status: 503 })
  return driver
}

/** The live policy the host resolved for this session, or null when unavailable. */
function livePolicy(session, deps) {
  if (typeof deps?.policy === 'function') {
    try { return deps.policy(session) } catch { return null }
  }
  try {
    const service = deps?.ctx?.get?.('sandboxPolicy')
    return service?.resolve?.({ session }) ?? null
  } catch { return null }
}

/**
 * A terminal must not attach to a container whose policy fingerprint no longer
 * matches the live session policy. The registry row is the only durable record
 * of the fingerprint that was actually mounted.
 */
function termPolicyStale(session, sessionId, deps) {
  if (deps?.termPolicyStale === true) return true
  if (session?.policyStale === true) return true
  const policy = livePolicy(session, deps)
  if (!policy || !sessionId) return false
  const registry = registryFor(deps, session.__profile)
  const row = registry?.instances ? [...registry.instances.values()].find((item) => item.sessionId === sessionId) : null
  if (!row?.policyFingerprint) return false
  try {
    return policyFingerprint(tupleFromPolicy({ ...policy, sessionId })) !== row.policyFingerprint
  } catch { return false }
}

async function callTermTool(name, args, session, deps) {
  if (name === 'term.session.create') {
    const snap = await envSnapshot(session, deps)
    const created = await openTermSession({
      sessionId: args.sessionId,
      cols: args.cols,
      rows: args.rows,
      containerRunning: snap.planes?.container?.state === 'running',
      policyStale: termPolicyStale(session, args.sessionId, deps),
      spawnPty: (spec) => {
        if (typeof deps.spawnPty === 'function') return deps.spawnPty(spec)
        if (typeof deps.backend?.openPty === 'function') return deps.backend.openPty(snap.containerName, spec)
        return spawnContainerPty(snap.containerName, spec)
      },
    })
    if (created.ok) session.termSessionId = created.id
    return created
  }
  if (name === 'term.session.close') return closeTermSession(args.id)
  if (name === 'term.session.list') return { ok: true, sessions: listTermSessions() }
  if (name === 'term.session.input') return writeTermSession(args.id, args.data)
  if (name === 'term.session.read') return readTermSession(args.id, args.lines)
  if (name === 'term.session.resize') return resizeTermSession(args.id, args.cols, args.rows)
  if (name === 'term.audit' || name === 'term.lane.status') return { ok: true, sessions: listTermSessions() }
  return { ok: false, kind: 'invalid', status: 400, error: `no terminal tool ${name}` }
}

export function routeSpecs(deps = {}) {
  // #4: session.containerName is left empty on purpose — containerNameFor()
  // derives the profile's instance name plus the env tag, so each local
  // environment owns a distinct, concurrently-running instance.
  const session = deps.session ?? { phase: 'idle', history: [], containerName: '' }
  const browserHistory = () => session.browserHistory
  const historyOf = browserHistory
  return BINDING_TABLE.map((row) => ({
    path: row.path,
    methods: [...row.methods],
    bodyLimit: row.bodyLimit,
    async handler(req, res) {
      deps.onHandler?.()
      // Every face (HTTP, MCP, diagnostics push) reads the active profile
      // driver; an unusable profile fails the request instead of half-working.
      try {
        await bindProfile(session, deps)
      } catch (error) {
        send(res, error?.status || 400, { ok: false, errorId: errorCode('profile.invalid'), error: error?.message || String(error) })
        return
      }
      // Durable history/settings/state live on the instance state volume;
      // restore once so a host restart sees the same browser truth.
      restoreBrowserState(session)
      // The trace row records outcome, not just presence: /operations is the
      // agent's only "did my last call fail and why" source, so status, errorId
      // and duration are captured by wrapping send().
      session.operations = session.operations || []
      const op = { path: row.path, method: req.method, at: new Date().toISOString(), status: null, errorId: null, durationMs: null, startedMs: Date.now() }
      session.operations.push(op)
      if (session.operations.length > 200) session.operations.shift()
      res.__op = op
      res.__session = session
      // A client that disconnects mid-handler never calls send() — the row
      // would sit status:null forever, unsearchable even by errorsOnly.
      res.on?.('close', () => {
        if (op.status === null && res.destroyed) op.status = 'cancelled'
      })
      if (row.path.endsWith('/shot')) {
        // Real implementation: the page-ready stub (deps.pageReady) was a
        // scaffold nobody ever wired — shot has a route row but no body. Drive
        // CDP directly: optional fit (viewport emulate to the pane's aspect,
        // no letterbox), optional scroll, then Page.captureScreenshot. Empty
        // capture is the contract's shot.empty (502), not a stub.
        try {
          const body = await readJson(req, row.bodyLimit)
          const base = await ensureBase(session, deps)
          if (!base) {
            send(res, 502, { ok: false, errorId: errorCode('shot.empty'), error: 'no engine page' })
            return
          }
          const client = await clientFor(session, base, deps)
          // Validate instead of silently defaulting: the contract's shot.*
          // negative examples must be reachable, not dead ids.
          if (body.format !== undefined && !['png', 'jpeg', 'webp'].includes(body.format)) {
            send(res, 400, { ok: false, errorId: errorCode('shot.format'), error: 'format must be png|jpeg|webp' })
            return
          }
          const format = typeof body.format === 'string' ? body.format : 'webp'
          if (body.quality !== undefined && (!Number.isInteger(Number(body.quality)) || Number(body.quality) < 1 || Number(body.quality) > 100)) {
            send(res, 400, { ok: false, errorId: errorCode('shot.format'), error: 'quality must be an integer 1..100' })
            return
          }
          const quality = body.quality !== undefined ? Math.trunc(Number(body.quality)) : 82
          if (body.scroll !== undefined && body.scroll !== null && (!Number.isFinite(Number(body.scroll)) || Math.abs(Number(body.scroll)) > 4000)) {
            send(res, 400, { ok: false, errorId: errorCode('shot.scroll'), error: 'scroll must be a finite number within ±4000' })
            return
          }
          const fit = body.fit && typeof body.fit === 'object' ? body.fit : null
          const scroll = Number(body.scroll) || 0
          const targets = await client.send('Target.getTargets')
          const pageTargetId = (targets?.targetInfos || []).find((row) => row.type === 'page')?.targetId || ''
          const shot = await withPage(client, async (sessionId) => {
            const viewport = await driverOf(session).settings.viewport(session, client, fit, sessionId)
            if (scroll) {
              await client.send('Runtime.evaluate', { expression: `window.scrollBy(0, ${scroll})`, returnByValue: true }, sessionId)
            }
            const params = format === 'png' ? { format } : { format, quality }
            const cap = await client.send('Page.captureScreenshot', params, sessionId)
            // Frame identity rides with the shot so the pane's pick-drift check
            // compares a pick's identity against the frame it's drawn over.
            const info = await client.send('Runtime.evaluate', {
              expression: `(()=>({url:location.href,scrollX:window.scrollX||0,scrollY:window.scrollY||0}))()`,
              returnByValue: true,
            }, sessionId)
            return { ...cap, identity: info?.result?.value, viewport }
          })
          const data = shot?.data
          // G32: an engine-side capture error travels back in-band at this pin
          // (cap.error alongside an empty/placeholder data). Never report it
          // as a successful frame.
          if (shot?.error) {
            send(res, 502, { ok: false, errorId: errorCode('shot.empty'), error: `screenshot failed: ${shot.error}` })
            return
          }
          if (typeof data !== 'string' || data.length === 0) {
            send(res, 502, { ok: false, errorId: errorCode('shot.empty'), error: 'engine returned empty screenshot' })
            return
          }
          send(res, 200, {
            ok: true,
            mimeType: format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp',
            format,
            data,
            url: shot.identity?.url || '',
            scrollX: shot.identity?.scrollX || 0,
            scrollY: shot.identity?.scrollY || 0,
            targetId: pageTargetId,
            viewport: shot.viewport,
          })
        } catch (error) {
          send(res, error.status || 502, { ok: false, errorId: error.errorId || errorCode('engine.connect'), error: error.message })
        }
        return
      }
      if (row.path.endsWith('/status')) {
        await ensureBase(session, deps)
        if (!restoreAttempted && session.phase === 'running') {
          restoreAttempted = true
          // Fire and forget: the pane polls status, and the next shot picks up
          // the restored page. Never make status wait on a navigation.
          restoreLastPage(session, deps).catch(() => {})
        }
        const snap = await envSnapshot(session, deps)
        const nav = navigationLedger(session)
        // engineMismatch: an origin that answers /json/list but is NOT a
        // A foreign engine must be flagged to the pane and skill — attaching
        // blindly would drive a foreign browser. Best-effort probe only.
        let engineMismatch = false
        if (snap.effective?.httpBase && snap.engineAlive) {
          try {
            const version = await probeHttp(`${snap.effective.httpBase}/json/version`, 800)
            const fingerprint = JSON.stringify(version?.data || {})
            // The profile declares the marker its engine reports; a foreign
            // engine (Chrome/Edge/Playwright) never carries it.
            engineMismatch = Boolean(version?.ok && fingerprint && !driverOf(session).engineFingerprint.test(fingerprint))
          } catch { engineMismatch = false }
        }
        send(res, 200, {
          ...snap,
          ok: true,
          ...driverOf(session).settings.read(session),
          // The socket agents attach to — surfaced at top level per the
          // skill contract (jq -r .cdp) as well as inside lifecycle.
          cdp: (() => {
            try {
              const port = snap.effective?.bridgePort
              return port ? `ws://${new URL(snap.effective?.httpBase || 'http://127.0.0.1').hostname}:${port}/cdp` : null
            } catch { return null }
          })(),
          via: session.cdp?.via || null, // relay | direct — a silent direct fallback would hide a private page
          engineMismatch,
          lastError: session.lastError || null,
          // Derived only from the snapshot, never from a stored pointer: one
          // writable source keeps /status, /diagnostics and the routes on the
          // same engine.
          lifecycle: {
            phase: session.phase,
            httpBase: snap.effective?.httpBase ?? '',
            mcpPort: snap.effective?.bridgePort ?? null,
            // The browser-level CDP socket (not the relay): the field used to
            // be a permanently-empty placeholder. Agents that need the engine
            // directly get a real URL; agents that want the pane's shared page
            // use lifecycle.cdp.
            engineUrl: snap.effective?.httpBase
              ? `ws://${(() => { try { return new URL(snap.effective.httpBase).host } catch { return '' } })()}/devtools/browser`
              : '',
            // The CDP socket agents attach to — the relay on the bridge, so
            // their page IS the pane's page. `ws://<host>:<mcpPort>/cdp`.
            cdp: (() => {
              try {
                const port = snap.effective?.bridgePort
                return port ? `ws://${new URL(snap.effective?.httpBase || 'http://127.0.0.1').hostname}:${port}/cdp` : null
              } catch { return null }
            })(),
          },
          navigating: Boolean(nav && nav.outcome === 'in-flight') || session.cdp?.navigating === true,
          navigation: nav,
          capabilities: { unsupported: driverOf(session).settings.capabilityNotes(session) },
          lastPage: readLastPage(session),
        })
        return
      }
      if (row.path.endsWith('/lifecycle')) {
        let body
        try { body = await readJson(req, row.bodyLimit) } catch (error) {
          send(res, error.status || 400, { ok: false, errorId: error.errorId || errorCode('body.json'), error: error.message })
          return
        }
        const action = body.action
        const name = containerNameFor(session, deps.env || process.env)
        if (action === 'suspend' && session.phase === 'running') {
          await deps.backend?.stop?.(name)
          session.phase = 'suspended'
          send(res, 200, { ok: true, phase: session.phase })
          return
        }
        if (action === 'resume' || action === 'start' || action === 'init') {
          // init is the bindings contract's create-if-missing: same ensure
          // path as start, so a cold pane lands on a usable engine either way.
          // Prepare self-heals: adopt running / start stopped / create missing —
          // resume and start both land on "environment usable", the pane's ask.
          const snap = await prepareEnvironment(session, deps)
          session.phase = 'running'
          send(res, 200, { ok: true, phase: session.phase, action: snap.action, healthy: snap.healthy })
          return
        }
        send(res, 409, { ok: false, errorId: errorCode('lifecycle.state'), phase: session.phase })
        return
      }
      if (row.path.endsWith('/open')) {
        let body
        try { body = await readJson(req, row.bodyLimit) } catch (error) {
          send(res, error.status || 400, { ok: false, errorId: error.errorId || errorCode('body.json'), error: error.message })
          return
        }
        try {
          const url = navigationUrl(body.url)
          // Explicit navigation wins over startup restoration. Never replay a
          // remembered address on top of the page the human is opening now.
          restoreAttempted = true
          const base = await ensureBase(session, deps)
          if (!base) throw Object.assign(new Error('sandbox engine is unavailable'), { errorId: errorCode('engine.connect') })
          // Do NOT pre-write session.pageUrl: a failed navigation leaves the
          // recorded address at a page the engine never reached, and
          // cookieScope() would then write cookies onto the wrong origin.
          // frameNavigated stamps pageUrl on the real commit.
          session.refs = {}
          session.refsGen = -1 // frameNavigated re-stamps on the next /snapshot
          const result = await navigate(session, base, url, deps.connect, {
            isCancelled: () => req.aborted === true || res.destroyed === true,
            hooks: navHooks(session),
          })
          // Commit succeeded: stamp the OBSERVED url (frameNavigated may have
          // done it already; engines without the event still need pageUrl).
          session.pageUrl = result?.url || url
          historyOf().recordHistory(result?.url || url)
          writeLastPage(session, result?.url || url)
          persistBrowserState(session)
          // navigate() stamps session.lastArrival from the OBSERVED document
          // just before returning, so on success this IS this nav's landing —
          // never the previous open's. On failure this line is unreachable.
          if (!res.destroyed) send(res, 200, { ok: true, url: result?.url || url, landed: session.lastArrival || null })
        } catch (error) {
          const errorId = error.errorId || errorCode('navigate.failed')
          if (!res.destroyed) send(res, error.status || statusOf(errorId), { ok: false, errorId, error: error.message })
        }
        return
      }
      if (row.path.endsWith('/selftest')) {
        // 11 real probes, matching the profile's `health.selftest` declaration.
        try {
          const result = await runSelftest(session, deps)
          session.lastSelftest = { ...result, at: new Date().toISOString() }
          send(res, 200, result)
        } catch (error) {
          send(res, 502, { ok: false, errorId: error.errorId || errorCode('engine.connect'), error: error.message })
        }
        return
      }
      if (row.path.endsWith('/logs')) {
        // Engine output exists only inside the container. Without this the
        // pane can say "engine down" but never why.
        const url = new URL(req.url, 'http://localhost')
        const tailRaw = url.searchParams.get('tail')
        if (tailRaw !== null && tailRaw !== '' && !Number.isFinite(Number(tailRaw))) {
          send(res, 400, { ok: false, errorId: errorCode('query.tail'), error: 'tail must be a number' })
          return
        }
        const tail = Math.max(20, Math.min(2000, Number(tailRaw) || 200))
        const name = containerNameFor(session, deps.env || process.env)
        try {
          if (typeof deps.backend?.logs !== 'function') {
            send(res, 409, { ok: false, errorId: errorCode('lifecycle.state'), error: 'backend has no logs()' })
            return
          }
          const out = await deps.backend.logs(name, { tail })
          send(res, 200, { ok: true, container: name, tail, text: out.text })
        } catch (error) {
          send(res, 502, { ok: false, errorId: errorCode('engine.connect'), error: error.message })
        }
        return
      }
      if (row.path.endsWith('/browse-history')) {
        try {
          const query = new URL(req.url, 'http://localhost').searchParams
          const limitRaw = query.get('limit')
          if (limitRaw !== null && limitRaw !== '' && !Number.isFinite(Number(limitRaw))) {
            throw Object.assign(new Error('limit must be a number'), { status: 400, errorId: errorCode('query.limit') })
          }
          let changed = {}
          if (req.method === 'DELETE') changed = historyOf().removeHistory({ url: query.get('url'), id: query.get('id') })
          else if (req.method === 'POST') {
            const body = await readJson(req, row.bodyLimit)
            if (body.clear !== true) throw Object.assign(new Error('history body must be {clear:true}'), { status: 400, errorId: errorCode('history.body') })
            changed = historyOf().clearHistory()
          }
          // Mutations persist to the instance state volume — the route's
          // `source` field now tells the truth about where history lives.
          if (req.method === 'DELETE' || req.method === 'POST') persistBrowserState(session)
          send(res, 200, { ok: true, ...historyOf().listHistory({ q: query.get('q') || '', limit: query.get('limit') || 100 }), ...changed, source: 'instance-state' })
        } catch (error) {
          send(res, error.status || 400, { ok: false, errorId: error.errorId || errorCode('history.body'), error: error.message })
        }
        return
      }
      if (row.path.endsWith('/dom')) {
        // Native-HTML plane: the pane renders this srcdoc in an iframe so the
        // browser does layout/scroll/hover instead of a raster screenshot.
        // Without it the pane can only ever show "IMG 截图回退".
        try {
          const base = await ensureBase(session, deps)
          if (!base) {
            send(res, 502, { ok: false, errorId: errorCode('dom.empty'), error: 'no engine page' })
            return
          }
          const result = await captureDom(session, base, deps)
          if (result.error === 'empty') {
            send(res, 502, { ok: false, errorId: errorCode('dom.empty'), error: 'no serializable document' })
            return
          }
          if (result.error === 'blank') {
            send(res, 502, { ok: false, errorId: errorCode('dom.blank'), error: 'page is still about:blank' })
            return
          }
          send(res, 200, { ok: true, ...result })
        } catch (error) {
          send(res, error.status || 502, { ok: false, errorId: error.errorId || errorCode('engine.connect'), error: error.message })
        }
        return
      }
      if (row.path.endsWith('/elements')) {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const depthRaw = url.searchParams.get('depth')
        if (depthRaw !== null && depthRaw !== '' && !Number.isFinite(Number(depthRaw))) {
          send(res, 400, { ok: false, errorId: errorCode('query.depth'), error: 'depth must be a number' })
          return
        }
        try {
          const data = await (deps.captureElements ?? (async (base, options) => {
            base = base || await ensureBase(session, deps)
            if (!base) {
              const error = new Error('no engine page')
              error.status = 502
              error.errorId = errorCode('elements.empty')
              throw error
            }
            const client = await clientFor(session, base, deps)
            return readElements(client, options)
          }))(deps.httpBase ?? session.httpBase, {
            selector: url.searchParams.get('selector') || '',
            depth: Number(url.searchParams.get('depth') || 4),
          })
          session.lastElements = { ...data, capturedAt: new Date().toISOString() }
          // send() is the only writer that stamps the /operations row; raw
          // res.end() left this route's op with status:null forever.
          send(res, 200, { ok: true, ...data })
        } catch (error) {
          send(res, error.status || 502, { ok: false, errorId: error.errorId || errorCode('elements.empty'), error: error.message })
        }
        return
      }
      if (row.path.endsWith('/control')) {
        try {
          await ensureBase(session, deps)
          if (req.method === 'POST') {
            const body = await readJson(req, row.bodyLimit)
            const { status, data } = await bridgeFetch(session, '/control', { method: 'POST', body })
            send(res, status === 200 ? 200 : (status || 502), data?.ok ? data : { ok: false, errorId: data?.errorId || errorCode('control.bridge'), error: data?.error || 'bridge refused' })
            return
          }
          const { data } = await bridgeFetch(session, '/control')
          send(res, 200, { ok: true, control: data?.control ?? null })
        } catch (error) {
          send(res, error.status || 502, { ok: false, errorId: error.errorId || errorCode('control.bridge'), error: error.message })
        }
        return
      }
      if (row.path.endsWith('/mcp')) {
        // Real JSON-RPC 2.0, not the old "every method is a 200 tools-count".
        // Notifications (no id) get 204 and NO body — answering them used to
        // break strict MCP clients. Unknown methods are -32601 in-band while
        // the HTTP status stays 200, the correct split for a request/response
        // transport that lacks its own error channel.
        let rpc
        try { rpc = deps.rpc ?? await readJson(req, row.bodyLimit) } catch (error) {
          // 413 (body too large) is an HTTP-level rejection, not a JSON-RPC
          // parse failure — a strict client must see the real status.
          if (error.status === 413) {
            send(res, 413, { ok: false, errorId: errorCode('body.toolarge'), error: error.message })
            return
          }
          send(res, 200, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } })
          return
        }
        const isNotification = rpc && typeof rpc === 'object' && !Array.isArray(rpc) && !('id' in rpc) && typeof rpc.method === 'string'
        if (!rpc || typeof rpc !== 'object' || Array.isArray(rpc) || rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') {
          send(res, 200, { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'invalid request' } })
          return
        }
        const rpcError = (code, message) => send(res, 200, { jsonrpc: '2.0', id: rpc.id ?? null, error: { code, message } })
        const rpcResult = (result) => send(res, 200, { jsonrpc: '2.0', id: rpc.id, result })
        if (rpc.method === 'initialize') {
          if (isNotification) { send(res, 204, null); return }
          rpcResult({
            protocolVersion: typeof rpc.params?.protocolVersion === 'string' ? rpc.params.protocolVersion : '2025-03-26',
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'dsh-nano-local-sandbox', version: BUILD_ID.split('@')[0] || '0' },
          })
          return
        }
        if (rpc.method.startsWith('notifications/')) {
          send(res, 204, null)
          return
        }
        if (rpc.method === 'ping') {
          if (isNotification) { send(res, 204, null); return }
          rpcResult({})
          return
        }
        if (isNotification) { send(res, 204, null); return }
        if (rpc.method === 'tools/list') {
          const term = TERM_TOOLS.map((tool) => ({ name: tool.name, description: tool.description || tool.name, inputSchema: tool.inputSchema }))
          rpcResult({ tools: [...toolsList(), ...term] })
          return
        }
        if (rpc.method === 'tools/call') {
          const name = rpc.params?.name
          const args = rpc.params?.arguments ?? {}
          const answer = String(name).startsWith('term.')
            ? await callTermTool(name, args, session, deps)
            : await answerNativeTool(name, buildOwners(session, deps, session.__profile), session, args)
          const failed = answer?.ok === false
          const payload = failed ? answer : (answer?.data !== undefined ? answer.data : answer)
          // HTTP carries the business status (callers assert it); the JSON-RPC
          // body stays a result with isError per MCP, plus ok/data for hosts
          // that read the flat shape.
          send(res, failed ? (answer.status ?? (statusOf(answer.errorId) || 400)) : 200, {
            jsonrpc: '2.0',
            id: rpc.id,
            result: {
              ...answer,
              isError: failed,
              structuredContent: payload,
              content: [{ type: 'text', text: JSON.stringify(payload) }],
            },
          })
          return
        }
        rpcError(-32601, `method not found: ${rpc.method}`)
        return
      }
      if (row.path.endsWith('/storage') || row.path.endsWith('/interact') || row.path.endsWith('/state') || row.path.endsWith('/snapshot')) {
        try {
          const base = await ensureBase(session, deps)
          if (!base) {
            send(res, 502, { ok: false, errorId: errorCode('elements.empty'), error: 'no engine page' })
            return
          }
          const client = await clientFor(session, base, deps)
          const body = await readJson(req, row.bodyLimit)
          if (row.path.endsWith('/storage')) {
            const scope = body.scope || new URL(req.url ?? '/', 'http://localhost').searchParams.get('scope') || 'local'
            const op = req.method === 'POST' ? (body.op || 'read') : 'read'
            // Whitelist first: a typo'd op used to fall through to .clear()
            // and wipe the whole storage scope.
            if (!STORAGE_OPS.includes(op)) {
              send(res, 400, { ok: false, errorId: errorCode('storage.op'), error: `op must be one of ${STORAGE_OPS.join('/')}` })
              return
            }
            const value = await evaluatePage(client, storageExpression({ ...body, scope, op }))
            send(res, 200, { ok: true, scope, op, result: value })
            return
          }
          if (row.path.endsWith('/interact')) {
            const target = resolveTarget(session, body)
            if (target.miss) {
              send(res, 404, { ok: false, errorId: errorCode('ref.miss'), error: `no element ref ${target.ref}; run /snapshot first` })
              return
            }
            if (!target.selector && !target.coords) {
              send(res, 400, { ok: false, errorId: errorCode('interact.selector'), error: 'target selector, ref or coords is required' })
              return
            }
            const value = await evaluatePage(client, interactExpression({ ...body, selector: target.selector ?? body.selector ?? '', x: target.coords?.x, y: target.coords?.y }))
            if (value && value.ok === false) {
              send(res, 400, { ok: false, errorId: value.errorId || errorCode('interact.fail'), error: value.error || 'interact failed' })
              return
            }
            send(res, 200, { ok: true, ...(value || {}) })
            return
          }
          if (row.path.endsWith('/state')) {
            const action = body.action === 'load' ? 'load' : 'save'
            const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : null
            if (name === '__last__') {
              // Reserved for the implicit slot — a user-named snapshot would
              // squat it, dodge the cap, and shadow the unnamed save path.
              send(res, 400, { ok: false, errorId: errorCode('state.name'), error: "'__last__' is reserved" })
              return
            }
            if (action === 'save') {
              // The snapshot lives on the instance state volume so it survives
              // a host restart; name→record in session.stateSnapshots.
              const value = await evaluatePage(client, stateSaveExpression())
              // null-prototype: 'constructor'/'toString'/'__proto__' names must
              // never hit Object.prototype — a load by a prototype key used to
              // run stateLoadExpression({}) which CLEARS localStorage.
              if (!session.stateSnapshots || session.stateSnapshots.__proto__ !== null) {
                session.stateSnapshots = Object.assign(Object.create(null), session.stateSnapshots || {})
              }
              const record = { name, at: new Date().toISOString(), url: session.pageUrl || '', state: value }
              if (name) session.stateSnapshots[name] = record
              else session.stateSnapshots.__last__ = record
              // Bound the map: a loop of named saves must not grow the durable
              // doc (or the host's memory) without limit. Oldest-first eviction;
              // __last__ is the implicit slot and is exempt from the cap.
              const names = Object.keys(session.stateSnapshots).filter((key) => key !== '__last__')
                .sort((a, b) => String(session.stateSnapshots[a].at || '').localeCompare(String(session.stateSnapshots[b].at || '')))
              while (names.length > 32) delete session.stateSnapshots[names.shift()]
              persistBrowserState(session)
              send(res, 200, { ok: true, action, name, state: value })
              return
            }
            // `load` accepts either a persisted snapshot name OR an inline
            // `state` object in the shape /state save returns — the binding
            // contract promises `state|name`, so an inline body must not fall
            // into the named-snapshot 404 path.
            let record
            if (body.state && typeof body.state === 'object' && !Array.isArray(body.state)) {
              record = { name: name || null, state: body.state, url: body.state.url || null }
            } else {
              const key = name || '__last__'
              // hasOwn: a plain-object map would let 'constructor'/'toString'
              // find Object.prototype and wipe the page's storage.
              record = session.stateSnapshots && Object.hasOwn(session.stateSnapshots, key) ? session.stateSnapshots[key] : undefined
            }
            if (!record) {
              send(res, 404, { ok: false, errorId: errorCode('state.miss'), error: name ? `no snapshot named ${name}` : 'no saved snapshot' })
              return
            }
            const value = await evaluatePage(client, stateLoadExpression(record.state || {}))
            send(res, 200, { ok: true, action, name: record.name ?? name, restored: value, savedUrl: record.url || record.state?.url || null })
            return
          }
          // Snapshot builds the shared ref table every interact consumer reads:
          // @N resolves through session.refs (written here, read by /refs,
          // /pick, /edit, /interact) so pane and agent point at one selector.
          // GET-only route: maxNodes arrives as a query param, not a body
          // (bindings declare no POST, so body.maxNodes is never reachable).
          const snapParams = new URL(req.url ?? '/', 'http://localhost').searchParams
          const snap = await evaluatePage(client, snapshotExpression(snapParams.get('maxNodes')))
          session.refs = snap?.refs || {}
          session.refsGen = session.pageGen || 0
          session.refsUrl = snap?.url || session.pageUrl || ''
          session.lastSnapshot = snap ? { url: snap.url, refs: snap.refs, count: snap.count, capturedAt: snap.capturedAt } : null
          send(res, 200, { ok: true, ...(snap || {}) })
        } catch (error) {
          send(res, error.status || 502, { ok: false, errorId: error.errorId || errorCode('engine.connect'), error: error.message })
        }
        return
      }
      if (row.path.endsWith('/refs')) {
        const ref = new URL(req.url ?? '/', 'http://localhost').searchParams.get('ref')
        const refs = session.refs || {}
        if (ref) {
          if (!refs[ref]) {
            send(res, 404, { ok: false, errorId: errorCode('ref.miss'), error: `no element ref ${ref}` })
            return
          }
          send(res, 200, { ok: true, ref, ...refs[ref] })
          return
        }
        send(res, 200, { ok: true, refs })
        return
      }
      if (row.path.endsWith('/har')) {
        const entries = (session.network || []).filter((item) => !item.gap).slice(-100).map((item) => ({
          startedDateTime: item.at,
          time: item.durationMs ?? -1,
          request: { method: item.method || 'GET', url: item.url || '' },
          response: { status: item.failed ? 0 : (item.status || 0), statusText: item.error || '', content: { size: item.size ?? 0, mimeType: item.mimeType || '' } },
          _dnk: { type: item.type || 'Other', cached: item.cached === true },
        }))
        // HAR-lite, declared: timings/bodies are approximations of the network
        // ring, not a full capture — the field name says so, no silent pretend.
        send(res, 200, { ok: true, _format: 'har-lite', log: { version: '1.2', creator: { name: 'dsh-nano-local-sandbox', version: BUILD_ID.split('@')[0] || '0' }, comment: 'har-lite: request/response headers and bodies are not captured', entries } })
        return
      }
      const pageUrl = new URL(req.url ?? '/', 'http://localhost')
      const page = async () => {
        const base = await ensureBase(session, deps)
        if (!base) {
          const error = new Error('no engine page')
          error.status = 502
          error.errorId = errorCode('elements.empty')
          throw error
        }
        return clientFor(session, base, deps)
      }
      try {
        // readJson sits inside the try so a body error maps to its declared
        // 400/413 through the shared catch, not the guard's 500 fallback.
        const pageBody = req.method === 'GET' || req.method === 'HEAD' ? {} : await readJson(req, row.bodyLimit)
        // Input summary on the ops row — "which selector/name/tool failed"
        // is the first question /operations has to answer; bound it so a
        // 4000-char expression can't bloat the ring.
        if (res.__op && pageBody && typeof pageBody === 'object') {
          const pick = {}
          for (const key of ['url', 'selector', 'action', 'name', 'delta', 'op', 'scope', 'preview', 'timeoutMs', 'load', 'format', 'scroll', 'ref']) {
            if (pageBody[key] !== undefined) pick[key] = String(pageBody[key]).slice(0, 120)
          }
          if (Object.keys(pick).length) res.__op.argSummary = JSON.stringify(pick).slice(0, 300)
        }
        if (row.path.endsWith('/history')) {
          const delta = Number(pageBody.delta || 0)
          // Same invariants as /open: ledger the intent (one intent = one
          // navigation row the pane can read) and die-stamp the @N table —
          // frameNavigated is a UDP event; a missed commit must not leave
          // last-generation refs pointing at a new document.
          session.navigation = { intent: `hist:${delta > 0 ? '+' : ''}${delta}`, outcome: 'in-flight', startedAt: new Date().toISOString() }
          session.refs = {}
          session.refsGen = -1
          try {
            const value = await queueNavigation(session, async () => driverOf(session).history.navigate(await page(), delta), {
              isCancelled: () => req.aborted === true || res.destroyed === true,
            })
            session.navigation = { ...session.navigation, outcome: 'committed', settledAt: new Date().toISOString(), url: value?.url || null }
            if (!res.destroyed) send(res, 200, { ok: true, ...(value || {}) })
          } catch (error) {
            session.navigation = { ...session.navigation, outcome: 'failed', errorId: error.errorId || null, error: String(error.message || error).slice(0, 200), settledAt: new Date().toISOString() }
            throw error
          }
          return
        }
        if (row.path.endsWith('/pick')) {
          const client = await page()
          const target = resolveTarget(session, pageBody)
          if (target.miss) {
            send(res, 404, { ok: false, errorId: errorCode('ref.miss'), error: `no element ref ${target.ref}; run /snapshot first` })
            return
          }
          // The contract is {pick:{elements:[elementPacket]}} — pane hover,
          // inspector, ↑↓ parent/child navigation and the composer inject all
          // read fields OFF the packet, so a flat tag/text answer starves
          // every one of them. preview:true hovers must not land as a pick.
          if (!target.selector && !target.coords) {
            send(res, 400, { ok: false, errorId: errorCode('pick.point'), error: 'pick needs {x,y} or {selector}' })
            return
          }
          if (target.coords) {
            const cx = Number(target.coords.x); const cy = Number(target.coords.y)
            if (!Number.isFinite(cx) || !Number.isFinite(cy) || cx < 0 || cy < 0 || cx > 10000 || cy > 10000) {
              send(res, 400, { ok: false, errorId: errorCode('pick.point'), error: 'x,y must be finite numbers in 0..10000' })
              return
            }
          } else if (String(pageBody.selector).length > 320) {
            send(res, 400, { ok: false, errorId: errorCode('pick.selector'), error: 'selector exceeds 320 chars' })
            return
          }
          const finder = target.selector
            ? `document.querySelector(${JSON.stringify(target.selector)})`
            : `document.elementFromPoint(${Number(target.coords?.x) || 0},${Number(target.coords?.y) || 0})`
          const expression = `(()=>{
            const el=${finder};
            if(!el)return{ok:false,errorId:'${errorCode('pick.miss')}',error:'no element at target'};
            const path=(el)=>{if(!el||el.nodeType!==1)return'';if(el.id)return'#'+CSS.escape(el.id);const parts=[];let n=el;while(n&&n.nodeType===1&&n.tagName!=='HTML'){const tag=n.tagName.toLowerCase();const cls=(typeof n.className==='string'?n.className.trim():'').split(/\\s+/).filter(Boolean).slice(0,2).map(c=>'.'+CSS.escape(c)).join('');let sel=tag+cls;const p=n.parentElement;if(p){const sib=[...p.children].filter(c=>c.tagName===n.tagName);if(sib.length>1)sel+=':nth-of-type('+String(sib.indexOf(n)+1)+')'}parts.unshift(sel);n=p}return parts.join('>')};
            const r=el.getBoundingClientRect();
            const cs=getComputedStyle(el);
            // componentStack is the React fiber chain when the page carries it —
            // element.__reactFiber$*/__reactContainer$* walk + fiber type name,
            // not a DOM ancestor list (docs promise component names).
            const stack=[];
            let fiber=null;
            for(const k of Object.keys(el)){if(k.startsWith('__reactFiber$')||k.startsWith('__reactContainer$')){fiber=el[k];break}}
            let hop=0;
            while(fiber&&stack.length<8&&hop++<64){
              const t=fiber.type;
              const name=typeof t==='string'?null:(t&&(t.displayName||t.name))||null;
              if(name)stack.push(name);
              fiber=fiber.return;
            }
            let best=null;
            for(const node of el.children||[]){
              const b=node.getBoundingClientRect();
              if(b.width*b.height>(best?best.area:0)&&b.width>4&&b.height>4)best={sel:path(node),area:b.width*b.height};
            }
            const parentSel=el.parentElement?path(el.parentElement):null;
            return{ok:true,element:{
              tag:el.tagName.toLowerCase(),
              id:el.id||null,
              className:typeof el.className==='string'?el.className.slice(0,120):null,
              text:(el.innerText||el.textContent||'').slice(0,200),
              box:{x:r.x,y:r.y,width:r.width,height:r.height},
              // The snapshot walker's path() gives the @N ref table a selector
              // that can match — a bare 'div' never can, and coords-only picks
              // used to ship selector:undefined.
              selector:path(el)||undefined,
              style:{color:cs.color,fontSize:cs.fontSize,fontFamily:cs.fontFamily,display:cs.display,position:cs.position,backgroundColor:cs.backgroundColor,border:cs.border.slice(0,80)},
              attrs:{role:el.getAttribute('role'),href:el.getAttribute('href'),type:el.getAttribute('type'),alt:el.getAttribute('alt')},
              componentStack:stack.length?stack:null,
              parentSel,childSel:best?best.sel:null,
            },url:location.href,scrollY:window.scrollY||0};
          })()`
          const value = await evaluatePage(client, expression)
          if (!value || value.ok === false) {
            const body = value && value.ok === false
              ? { ...value, error: value.error ?? 'no element at target' }
              : { ok: false, errorId: errorCode('pick.miss'), error: 'no element at target' }
            send(res, 404, body)
            return
          }
          const element = value.element || {}
          // Ref-stamp the packet so @N exchange keys carry into the composer
          // payload when this element was minted by /snapshot's walker.
          if (!pageBody.preview) {
            if (!element.ref) {
              const refs = session.refs || {}
              const hit = Object.entries(refs).find(([, row]) => row.selector === element.selector)
              if (hit) element.ref = hit[0]
            }
          }
          send(res, 200, {
            ok: true,
            pick: {
              elements: [element],
              url: value.url || '',
              scrollY: value.scrollY || 0,
              targetId: client.pageTargetId || '',
            },
          })
          return
        }
        if (row.path.endsWith('/edit')) {
          const client = await page()
          const target = resolveTarget(session, pageBody)
          if (target.miss) {
            send(res, 404, { ok: false, errorId: errorCode('ref.miss'), error: `no element ref ${target.ref}; run /snapshot first` })
            return
          }
          if (!target.selector) {
            send(res, 400, { ok: false, errorId: errorCode('edit.miss'), error: 'edit requires a selector or @ref' })
            return
          }
          // Contract bounds: selector ≤320 like pick's, text 1..4000 chars.
          if (String(pageBody.selector || '').length > 320) {
            send(res, 400, { ok: false, errorId: errorCode('edit.selector'), error: 'selector exceeds 320 chars' })
            return
          }
          const editText = String(pageBody.text ?? '')
          if (editText.length < 1 || editText.length > 4000) {
            send(res, 400, { ok: false, errorId: errorCode('edit.badtext'), error: 'text must be 1..4000 characters' })
            return
          }
          const value = await evaluatePage(client, `(()=>{const el=document.querySelector(${JSON.stringify(target.selector)});if(!el)return{ok:false,errorId:'${errorCode('edit.miss')}'};el.textContent=${JSON.stringify(editText)};return{ok:true,tag:el.tagName.toLowerCase(),id:el.id||null}})()`)
          send(res, value && value.ok === false ? 404 : 200, value || { ok: true })
          return
        }
        if (row.path.endsWith('/settings')) {
          // POST-only per the binding table: the old GET branch was dead code
          // the guard never reached, so "is settings readable" lied two ways.
          const settings = await driverOf(session).settings.apply(session, await page(), pageBody)
          persistBrowserState(session)
          send(res, 200, { ok: true, ...settings, capabilities: { unsupported: driverOf(session).settings.capabilityNotes(session) } })
          return
        }
        if (row.path.endsWith('/console')) {
          if (pageBody.clear === true) { session.console = []; session.consoleSeq = 0 }
          const level = pageUrl.searchParams.get('level')
          const levels = level ? level.split(',').map((s) => s.trim()).filter(Boolean) : null
          const sinceSeqRaw = pageUrl.searchParams.get('sinceSeq')
          const sinceRaw = pageUrl.searchParams.get('since')
          const limitRaw = pageUrl.searchParams.get('limit')
          for (const [name, value] of [['sinceSeq', sinceSeqRaw], ['since', sinceRaw], ['limit', limitRaw]]) {
            if (value !== null && value !== '' && !Number.isFinite(Number(value))) {
              throw Object.assign(new Error(`${name} must be a number`), { status: 400, errorId: errorCode(`query.${name}`) })
            }
          }
          const sinceSeq = Number(sinceSeqRaw) || 0
          const since = Number(sinceRaw) || 0
          let rows = (session.console || [])
          if (levels) rows = rows.filter((item) => levels.includes(item.level))
          if (sinceSeq) rows = rows.filter((item) => (item.seq || 0) > sinceSeq)
          else if (since) rows = rows.filter((item) => Date.parse(item.at || 0) > since)
          const limit = Math.max(1, Math.min(Number(limitRaw) || 100, 400))
          const entries = rows.slice(-limit)
          send(res, 200, { ok: true, entries, lastSeq: entries.length ? entries[entries.length - 1].seq : (session.consoleSeq || 0) })
          return
        }
        if (row.path.endsWith('/operations')) {
          if (pageBody.clear === true) session.operations = []
          const errorsOnly = pageUrl.searchParams.get('errorsOnly') === 'true'
          const opsLimitRaw = pageUrl.searchParams.get('limit')
          if (opsLimitRaw !== null && opsLimitRaw !== '' && !Number.isFinite(Number(opsLimitRaw))) {
            send(res, 400, { ok: false, errorId: errorCode('query.limit'), error: 'limit must be a number' })
            return
          }
          const opsLimit = Math.max(1, Math.min(Number(opsLimitRaw) || 100, 200))
          let rows = (session.operations || [])
          // errorsOnly also keeps 'cancelled' — a status:null row the client
          // dropped mid-flight is still a failed call.
          if (errorsOnly) rows = rows.filter((item) => item.ok === false || (item.status && (item.status === 'cancelled' || item.status >= 400)))
          send(res, 200, { ok: true, entries: rows.slice(-opsLimit) })
          return
        }
        if (row.path.endsWith('/diagnostics')) {
          const query = new URL(req.url ?? '/', 'http://localhost').searchParams
          const withCatalog = query.get('catalog') === '1'
          send(res, 200, await diagnosticsPayload(session, deps, { withCatalog }))
          return
        }
        if (row.path.endsWith('/ports')) {
          // Deep on purpose: this is what the panel's健康灯 reads. A shallow
          // probe (container+engine only) produced the exact bug where the
          // badge said OK while 页面/DOM rows were red.
          const snap = await envSnapshot(session, deps)
          send(res, 200, { ...snap, ok: true, phase: session.phase })
          return
        }
        if (row.path.endsWith('/recover')) {
          // Prepare-environment semantics: make the engine usable FIRST, then
          // replay the last page when there is one. Previously an empty history
          // hard-failed the whole call, so a fresh pane could never self-heal.
          let snap = null
          try {
            snap = await prepareEnvironment(session, deps)
          } catch (error) {
            send(res, error.status || 502, { ok: false, errorId: error.errorId || errorCode('engine.connect'), error: error.message })
            return
          }
          const last = session.history.at(-1) ?? readLastPage(session)
          if (last && snap.httpBase) {
            try { await navigate(session, snap.httpBase, last.url, deps.connect, { hooks: navHooks(session) }) } catch { /* replay is best-effort */ }
          }
          send(res, 200, {
            ...snap,
            ok: true,
            action: snap.action,
            healthy: snap.healthy,
            engineAlive: snap.engineAlive,
            url: last?.url ?? null,
            replay: Boolean(last),
            ports: snap.ports,
            container: snap.container,
            containerName: snap.containerName,
            effective: snap.effective,
            checks: snap.checks,
            summary: summaryOf(snap),
            buildId: BUILD_ID,
          })
          return
        }
        if (row.path.endsWith('/network')) {
          if (req.method === 'POST') {
            if (pageBody.clear === true) session.network = []
            send(res, 200, { ok: true, cleared: pageBody.clear === true })
            return
          }
          const query = new URL(req.url ?? '/', 'http://localhost').searchParams
          const detailId = query.get('id')
          if (detailId) {
            const entry = (session.network || []).find((item) => item && item.id === detailId)
            if (!entry) {
              send(res, 404, { ok: false, errorId: errorCode('network.missing'), error: 'request not found' })
              return
            }
            let body = null
            try {
              const client = await page()
              body = await withPage(client, (sessionId) => client.send('Network.getResponseBody', { requestId: detailId }, sessionId))
            } catch { /* body retention is best effort; headers/payload still render */ }
            const text = typeof body?.body === 'string' ? body.body : null
            send(res, 200, {
              ok: true,
              entry,
              responseBody: text == null ? null : {
                body: text.slice(0, 200000),
                base64Encoded: body?.base64Encoded === true,
                truncated: text.length > 200000,
              },
            })
            return
          }
          const limitRaw = query.get('limit')
          const sinceRaw = query.get('since')
          for (const [name, value] of [['limit', limitRaw], ['since', sinceRaw]]) {
            if (value !== null && value !== '' && !Number.isFinite(Number(value))) {
              throw Object.assign(new Error(`${name} must be a number`), { status: 400, errorId: errorCode(`query.${name}`) })
            }
          }
          const limit = Math.max(1, Math.min(Number(limitRaw) || 100, 200))
          const failedOnly = query.get('failedOnly') === 'true'
          const since = Number(sinceRaw) || 0
          let entries = (session.network || []).filter((item) => item && !item.gap)
          if (failedOnly) entries = entries.filter((item) => item.failed || (item.status && item.status >= 400))
          // `since` is an update cursor, not a birth cursor: pending → failed
          // moves updatedAt and must re-emit the row or the pane keeps `0ms`
          // forever.
          if (since) entries = entries.filter((item) => Number(item.updatedAt || item.startedAt) > since)
          entries = entries.slice(-limit).map(({ requestHeaders, responseHeaders, postData, ...rest }) => rest)
          send(res, 200, { ok: true, entries })
          return
        }
        if (row.path.endsWith('/targets')) {
          const client = await page()
          const targets = await client.send('Target.getTargets')
          send(res, 200, { ok: true, targetInfos: targets.targetInfos || [] })
          return
        }
        if (row.path.endsWith('/evaluate')) {
          // Real expression evaluation against the live page. The old handler
          // read deps.expression (always '') and returned a 400 — the audit's
          // most-cited dead route.
          const expression = String(pageBody.expression || '')
          if (!expression) {
            send(res, 400, { ok: false, errorId: errorCode('evaluate.empty'), error: 'expression is required' })
            return
          }
          // The contract caps expressions at 2000 chars (error catalog + skill
          // doc + DNK AGENTS.md all say so); the old 8192 was dead code — the
          // 4096-byte bodyLimit already 413'd everything it would have caught.
          if (expression.length > 2000) {
            send(res, 400, { ok: false, errorId: errorCode('evaluate.toolong'), error: 'expression exceeds 2000 characters' })
            return
          }
          const client = await page()
          const result = await withPage(client, async (sessionId) => {
            const out = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: pageBody.awaitPromise === true }, sessionId)
            // Runtime.evaluate: {result: RemoteObject, exceptionDetails?}
            if (out?.exceptionDetails) {
              return { ok: false, errorId: errorCode('evaluate.threw'), error: out.exceptionDetails.text || 'expression threw', exception: out.exceptionDetails.exception?.description?.slice(0, 4000) || null }
            }
            const r = out?.result || {}
            // Contract caps results at 4000 chars — a string value returned
            // raw used to sail past it untouched.
            const raw = r.value !== undefined ? r.value : (r.description ?? null)
            const value = typeof raw === 'string' && raw.length > 4000 ? `${raw.slice(0, 4000)}…` : raw
            return { ok: true, type: r.type, subtype: r.subtype, value, objectId: r.objectId || null }
          })
          send(res, result?.ok === false ? 400 : 200, result || { ok: false, errorId: errorCode('evaluate.threw'), error: 'no result' })
          return
        }
        if (row.path.endsWith('/wait')) {
          // Contract: exactly one of selector|text|url|fn + optional load mode.
          // @N in the selector field resolves through the same ref table as
          // pick/edit — the contract names wait among the @N consumers.
          const hasSelector = typeof pageBody.selector === 'string' && pageBody.selector !== ''
          const hasText = typeof pageBody.text === 'string' && pageBody.text !== ''
          const hasUrl = typeof pageBody.url === 'string' && pageBody.url !== ''
          const hasFn = typeof pageBody.fn === 'string' && pageBody.fn !== ''
          const modes = [hasSelector, hasText, hasUrl, hasFn].filter(Boolean).length
          if (modes !== 1) {
            send(res, 400, { ok: false, errorId: errorCode('wait.query'), error: 'wait needs exactly one of selector|text|url|fn' })
            return
          }
          // fn runs INSIDE the page — same unbounded-JS class as /evaluate, so
          // it inherits the 2000-char cap the contract places on that lane.
          if (hasFn && String(pageBody.fn).length > 2000) {
            send(res, 400, { ok: false, errorId: errorCode('wait.query'), error: 'fn exceeds 2000 characters' })
            return
          }
          const load = pageBody.load ?? 'commit'
          if (!['commit', 'domcontentloaded', 'load', 'networkidle'].includes(load)) {
            send(res, 400, { ok: false, errorId: errorCode('wait.query'), error: `load must be commit|domcontentloaded|load|networkidle` })
            return
          }
          let expression
          if (hasSelector) {
            const target = resolveTarget(session, { selector: pageBody.selector })
            if (target.miss) {
              send(res, 404, { ok: false, errorId: errorCode('ref.miss'), error: `no element ref ${target.ref}; run /snapshot first` })
              return
            }
            const selector = target.selector || String(pageBody.selector || 'body')
            expression = `(()=>{const el=document.querySelector(${JSON.stringify(selector)});return el?{ok:true,tag:el.tagName.toLowerCase(),text:(el.innerText||'').slice(0,80)}:{ok:false}})()`
          } else if (hasText) {
            expression = `(()=>{const t=${JSON.stringify(pageBody.text)};return (document.body?.innerText||'').includes(t)?{ok:true,text:t}:{ok:false}})()`
          } else if (hasUrl) {
            expression = `(()=>{const u=${JSON.stringify(pageBody.url)};return location.href.includes(u)?{ok:true,url:location.href}:{ok:false}})()`
          } else {
            // fn is a truthy page expression, not a function to invoke —
            // "document.querySelector('a')" / "document.title.includes('x')".
            expression = `(()=>{try{const v=(${pageBody.fn});return v?{ok:true,result:v}:{ok:false}}catch(e){return {ok:false,error:String(e&&e.message||e)}}})()`
          }
          const client = await page()
          // Honor the requested timeout instead of the old fixed 4 tries:
          // an agent asking for 500ms gets 500ms, and 15000ms actually waits.
          const timeoutRaw = pageBody.timeoutMs ?? pageBody.timeout
          if (timeoutRaw !== undefined && timeoutRaw !== null && timeoutRaw !== '' && !Number.isFinite(Number(timeoutRaw))) {
            send(res, 400, { ok: false, errorId: errorCode('query.timeoutMs'), error: 'timeoutMs must be a number' })
            return
          }
          const timeoutMs = Math.max(0, Math.min(Number(timeoutRaw ?? 3000), 30000))
          const deadline = Date.now() + timeoutMs
          // `load` is real, not a validated-then-dropped knob: commit skips
          // the gate; domcontentloaded/load gate on document.readyState;
          // networkidle additionally requires the host's network ring to sit
          // quiet for ~600ms. All of it stays inside the same timeout budget.
          if (load !== 'commit') {
            const want = load === 'domcontentloaded' ? 'interactive' : 'complete'
            let quietSince = null
            do {
              try {
                const rs = await evaluatePage(client, '(()=>({rs:document.readyState}))()')
                const ready = rs?.rs === 'complete' || (want === 'interactive' && rs?.rs === 'interactive')
                if (ready && (load !== 'networkidle' || quietSince === null)) {
                  const pending = (session.network || []).filter((r) => r && !r.gap && r.status == null && !r.failed).length
                  if (load !== 'networkidle' || pending === 0) {
                    if (load !== 'networkidle') break
                    if (quietSince === null) quietSince = Date.now()
                    else if (Date.now() - quietSince >= 600) break
                  } else quietSince = null
                }
              } catch { /* mid-navigation evaluate throws — keep polling per load semantics */ }
              if (Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 250))
            } while (Date.now() < deadline)
          }
          let found = null
          do {
            try { found = await evaluatePage(client, expression) } catch { found = null /* nav churn: retry within budget */ }
            if (found && found.ok) break
            if (Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 250))
          } while (Date.now() < deadline)
          if (!found || found.ok !== true) {
            send(res, 504, { ok: false, errorId: errorCode('wait.timeout'), error: `condition did not hold within ${timeoutMs}ms` })
            return
          }
          send(res, 200, { ok: true, matched: found })
          return
        }
        send(res, 404, { ok: false, errorId: errorCode('tool.unknown'), error: row.path })
      } catch (error) {
        // lastError is a live field the pane actually renders — it was
        // declared in /status but nothing ever wrote it.
        session.lastError = { errorId: error.errorId || errorCode('engine.connect'), error: String(error.message || error).slice(0, 300), at: new Date().toISOString(), path: row.path }
        send(res, error.status || 502, { ok: false, errorId: error.errorId || errorCode('engine.connect'), error: error.message })
      }
    },
  }))
}

/** WebSocket upgrade: rejection runs before any handshake. */
export function acceptUpgrade(req, socket, requestRejection, onHandshake) {
  const denied = requestRejection(req)
  if (denied !== undefined) {
    socket.statusCode = denied
    return { handshake: false, handled: false }
  }
  onHandshake(req, socket)
  return { handshake: true, handled: true }
}

/**
 * Push the diagnostics document the bridge's sandbox.* tools serve. The host
 * is the only process with the session truth; without this loop every
 * agent-side sandbox.* call answered the profile's stale-diagnostics code forever.
 * Best-effort, unref'd: a dead bridge costs a 2.5s probe per interval.
 */
export function startDiagnosticsPush(session, deps, { intervalMs = 15000 } = {}) {
  if (session.__diagPushTimer) return session.__diagPushTimer
  const tick = async () => {
    try {
      await bindProfile(session, deps)
      const base = await ensureBase(session, deps)
      if (!base) return
      const snap = await envSnapshot(session, deps)
      // WS sandbox.dom must never be a dead letter: if nobody has captured a
      // DOM yet — or the pushed copy belongs to a previous page generation —
      // recapture here so the doc carries THIS page, not a permanent stale.
      const domStale = !session.lastDom
        || session.lastDom.generation !== (session.pageGen || 0)
      if (domStale && snap.checks?.page?.ok && snap.checks?.page?.detail && snap.checks.page.detail !== 'about:blank') {
        try { await captureDom(session, base, deps) } catch { /* serve stale next tick */ }
      }
      const doc = {
        at: new Date().toISOString(),
        // The doc ships to the bridge's agent-facing diagnostics surface —
        // publish the store's identity (basename), not the host's absolute
        // path.
        plugin: { phase: session.phase, storePath: session.stateDir ? basename(session.stateDir) : '', httpBase: session.httpBase || '' },
        engine: {
          engineAlive: snap.engineAlive === true,
          lifecycle: { phase: session.phase },
          targets: {
            count: snap.checks?.page?.ok ? 1 : 0,
            // The page check's detail IS the url (probePage puts it there) —
            // reading a nonexistent `.url` left every pushed doc targets-empty.
            targets: snap.checks?.page?.ok && snap.checks?.page?.detail ? [{ url: snap.checks.page.detail, targetId: snap.checks.page.targetId || null }] : [],
          },
          targetsError: null,
        },
        console: { entries: (session.console || []).slice(-50), total: session.consoleSeq || (session.console || []).length, counts: {} },
        operations: { entries: (session.operations || []).slice(-50), total: (session.operations || []).length, dropped: 0 },
        network: { entries: (session.network || []).filter((row) => row && !row.gap).slice(-50), total: (session.network || []).filter((row) => row && !row.gap).length },
        history: { total: (session.history || []).length, entries: (session.history || []).slice(-30) },
        observability: { errorCatalog: errorCatalog().map((row) => ({ errorId: row.example, status: row.status, cause: row.cause, next: row.next })) },
        ports: { effective: snap.effective, ports: snap.ports, container: snap.container },
        dom: session.lastDom || null,
        elements: session.lastElements || null,
        snapshot: session.lastSnapshot || null,
        selftest: session.lastSelftest || null,
      }
      await bridgeFetch(session, '/diagnostics', { method: 'POST', body: doc })
    } catch { /* push is opportunistic */ }
  }
  const timer = setInterval(tick, intervalMs)
  timer.unref?.()
  session.__diagPushTimer = timer
  tick().catch(() => {})
  return timer
}

export { keeper }
