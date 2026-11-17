export const STATUS_ROUTE = '/nano-local-sandbox/status'
export const OPEN_ROUTE = '/nano-local-sandbox/open'
export const SHOT_ROUTE = '/nano-local-sandbox/shot'
export const HISTORY_ROUTE = '/nano-local-sandbox/history'
export const PICK_ROUTE = '/nano-local-sandbox/pick'
export const EDIT_ROUTE = '/nano-local-sandbox/edit'
export const SETTINGS_ROUTE = '/nano-local-sandbox/settings'
export const KITE_ROUTE = '/nano-local-sandbox/kite'
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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { BINDING_TABLE } from '../../lib/bindings.js'
import { createCdpKeeper } from './cdp-keeper.js'
import { publishedHttpBase } from './backend-apple.js'
import { ensureClient, evaluatePage, navigate, readElements, withPage } from './cdp-elements.js'
import { answerNativeTool, toolsList } from './mcp-sandbox.js'
import { listProfiles, loadProfile } from './profile-registry.js'
import { createInstanceRegistry } from './instance-registry.js'
import { policyFingerprint, tupleFromPolicy } from './policy-adapter.js'
import { ERROR_CATALOG, statusOf } from './error-catalog.js'
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
function stateDirFor(deps) {
  const env = deps.env || process.env
  const tag = envTag(env)
  const home = deps.home || env.HOME || ''
  return env.KITESURF_STATE || `${home}/.dsh-kitesurf-state${tag === 'prod' ? '' : `-${tag}`}`
}

function lastPagePath(deps) {
  return join(stateDirFor(deps), 'last-page.json')
}

/** @returns {{url: string, at: string}|null} */
function readLastPage(deps) {
  try {
    const info = JSON.parse(readFileSync(lastPagePath(deps), 'utf8'))
    return typeof info?.url === 'string' && info.url ? { url: info.url, at: String(info.at || '') } : null
  } catch { return null }
}

function writeLastPage(deps, url) {
  if (typeof url !== 'string' || !url) return
  try {
    mkdirSync(stateDirFor(deps), { recursive: true })
    writeFileSync(lastPagePath(deps), JSON.stringify({ url, at: new Date().toISOString() }, null, 2) + '\n')
  } catch { /* a read-only home only costs the restore, not the browse */ }
}

/**
 * #4 multi-env: one host owns ONE kitesurf-family container, but that name +
 * its published ports are derived from the environment tag so dev / 正式 /
 * desktop hosts can each own a distinct, concurrently-running instance
 * instead of all adopting the same 'kitesurf' container.
 *
 * Env tag resolution: KITESURF_ENV > DSH_HOME suffix
 * (.dsh-dev→dev, .dsh-desktop→desktop, .dsh/prod→prod).
 * prod keeps the historic single name 'kitesurf' on 8798/8799 so the existing
 * manual container is adopted untouched; dev→kitesurf-dev on 8800/8801,
 * desktop→kitesurf-desktop on 8802/8803. Deterministic, no registry needed.
 */
export function envTag(env = process.env) {
  const explicit = String(env.KITESURF_ENV || '').trim().toLowerCase()
  if (explicit && /^[a-z][a-z0-9-]{0,15}$/.test(explicit)) return explicit
  const home = String(env.DSH_HOME || '')
  if (/\.dsh-dev(\/|$)/.test(home)) return 'dev'
  if (/\.dsh-desktop(\/|$)/.test(home)) return 'desktop'
  return 'prod'
}
const ENV_SLOTS = { prod: 0, dev: 1, desktop: 2 }
function envSlot(tag) { return ENV_SLOTS[tag] ?? ((tag.charCodeAt(0) % 3) + 1) }

/** The container name this host owns: 'kitesurf' on prod, 'kitesurf-<env>' otherwise. */
export function containerNameFor(session, env = process.env) {
  if (typeof session?.containerName === 'string' && session.containerName) return session.containerName
  const tag = envTag(env)
  return tag === 'prod' ? 'kitesurf' : `kitesurf-${tag}`
}

/** Host ports to publish for this environment's container: 8787→engine, 8791→bridge. */
export function envHostPorts(env = process.env) {
  const slot = envSlot(envTag(env))
  return { engineHostPort: 8798 + slot * 2, bridgeHostPort: 8799 + slot * 2, engineContainerPort: 8787, bridgeContainerPort: 8791 }
}

/** Parse `container inspect` output into a normalized {state,ports[],httpBase}. */
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
  return { state, ports, containerPort }
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
 * env-scoped container (kitesurf image, published engine+bridge ports, the
 * checkout/tmpfs/state mounts) instead of the registry's bare default.
 */
function registryFor(deps, profilesRoot) {
  if (deps.registry) return deps.registry
  const env = deps.env || process.env
  const manifest = (() => {
    try { return loadProfile(join(profilesRoot, 'kitesurf'))?.manifest || null } catch { return null }
  })()
  const profile = manifest || {
    id: 'kitesurf',
    version: 1,
    scope: 'session',
    build: { base: 'kitesurf-engine:latest', digest: 'unknown' },
    runtime: { isolation: { resources: { cpus: 4, memory: '4G' } } },
    lifecycle: { idleTimeoutMs: 1800000, maxInstances: 2 },
  }
  const home = deps.home || env.HOME || ''
  const stateRoot = env.KITESURF_STATE_ROOT || `${home}/.dsh-kitesurf-instances`
  deps.registry = createInstanceRegistry({
    backend: deps.backend,
    profile,
    volumeFor: (id) => join(stateRoot, id),
    imageFor: () => env.KITESURF_IMAGE || 'kitesurf-engine:latest',
    portSpecFor: (instance) => {
      if (!instance.endpoints?.engine || !instance.endpoints?.mcp) return []
      const enginePort = Number(new URL(instance.endpoints.engine).port)
      const bridgePort = Number(new URL(instance.endpoints.mcp).port)
      return [
        { publish: `127.0.0.1:${enginePort}:8787` },
        { publish: `127.0.0.1:${bridgePort}:8791` },
      ]
    },
    mountsFor: (instance) => {
      const checkout = env.KITESURF_CHECKOUT || `${home}/Documents/dsh-plugins/context/kitesurf`
      try { mkdirSync(instance.stateVolume, { recursive: true }) } catch { /* mount surfaces it */ }
      return [
        { arg: `type=virtiofs,source=${checkout},target=/opt/kitesurf,readonly` },
        { arg: 'type=tmpfs,target=/opt/kitesurf/packages/engine/.wrangler' },
        { arg: `type=virtiofs,source=${instance.stateVolume},target=/var/lib/kitesurf-state` },
      ]
    },
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
  try {
    const inspected = await deps.backend?.inspect?.(name)
    info = parseInspect(inspected?.raw ?? inspected, host.engineContainerPort)
  } catch { info = null }
  const engineRow = info?.ports?.find((p) => p.containerPort === host.engineContainerPort) || null
  const bridgeRow = info?.ports?.find((p) => p.containerPort === host.bridgeContainerPort) || null
  const derived = engineRow ? `http://${engineRow.hostAddress === '0.0.0.0' ? '127.0.0.1' : engineRow.hostAddress}:${engineRow.hostPort}` : null
  const httpBase = derived || session.httpBase || null
  const httpUp = await engineHttpUp(httpBase, deps)
  const cdpUp = await probeCdp(session, httpBase, httpUp, deps)
  const state = info?.state || 'missing'
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
 * The 11 checks `profiles/kitesurf/profile.yaml` declares as
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
  push('history-consistent', Array.isArray(session.history), `${(session.history || []).length} entries`)

  // The remaining checks need a live CDP session; skip cleanly when there is none.
  let version = null
  let blank = null
  let shot = null
  let writer = null
  if (snap.engineAlive && snap.effective.httpBase) {
    try {
      const client = await clientFor(session, snap.effective.httpBase, deps)
      version = (await client.send('Browser.getVersion'))?.product || null
      const dom = await probeDom(session, snap.effective.httpBase, deps)
      blank = dom.skipped === true ? false : true
      const cap = await withPage(client, (sessionId) => client.send('Page.captureScreenshot', { format: 'png' }, sessionId))
      shot = typeof cap?.data === 'string' && cap.data.length > 0
    } catch { /* each probe reports its own failure below */ }
  }
  push('engine-version', Boolean(version), version || 'unavailable')
  push('page-not-blank', blank === true, blank === null ? 'no page' : blank ? 'has document' : 'about:blank')
  push('shot-capturable', shot === true, shot === null ? 'no engine' : shot ? 'non-empty frame' : 'empty frame')

  const bridgeBase = bridgeControlBase({ httpBase: snap.effective.httpBase })
  if (snap.checks.bridge?.ok) {
    try {
      const response = await probeHttp(`${bridgeBase}/health`, 900)
      const data = response.ok ? response.data : null
      writer = data?.control?.writer ?? null
      // The bridge reports `writer:false` when free; only a truthy id is a holder.
      if (writer === false) writer = null
    } catch { /* reported as not free */ }
  }
  push('bridge-writer-free', writer === null, writer === null ? 'no writer held' : `held by ${writer}`)

  // Emit in the declared order so the response reads like the profile contract.
  const checks = SELFTEST_IDS.map((id) => found.get(id) || { id, ok: false, detail: 'not run' })
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
async function prepareEnvironment(session, deps) {
  const env = deps.env || process.env
  const name = containerNameFor(session, env)
  const host = envHostPorts(env)
  const image = env.KITESURF_IMAGE || 'kitesurf-engine:latest'
  let action = 'noop'
  let info = null
  const canInspect = typeof deps.backend?.inspect === 'function'
  if (canInspect) {
    try {
      const inspected = await deps.backend.inspect(name)
      info = parseInspect(inspected?.raw ?? inspected, host.engineContainerPort)
    } catch { info = null }
  }
  if (!info && !canInspect) {
    // Fixture-grade backend without inspect: preserve the legacy "start it"
    // contract instead of inventing a create it can't fulfil.
    await deps.backend?.start?.(name)
    action = 'started'
  } else if (!info) {
    // Recreate the documented kitesurf runtime shape: ro checkout at
    // /opt/kitesurf, tmpfs over wrangler state, a writable per-env state
    // volume, 4c/4G, published engine+bridge ports. Sources come from env so
    // no host path is baked into the contract.
    const tag = envTag(env)
    const home = deps.home || env.HOME || ''
    const checkout = env.KITESURF_CHECKOUT || `${home}/Documents/dsh-plugins/context/kitesurf`
    const stateDir = env.KITESURF_STATE || `${home}/.dsh-kitesurf-state${tag === 'prod' ? '' : `-${tag}`}`
    try { mkdirSync(stateDir, { recursive: true }) } catch { /* mount surfaces the failure */ }
    await deps.backend?.create?.({
      containerName: name,
      image,
      resources: { cpus: 4, memory: '4G' },
      mounts: [
        { arg: `type=virtiofs,source=${checkout},target=/opt/kitesurf,readonly` },
        { arg: 'type=tmpfs,target=/opt/kitesurf/packages/engine/.wrangler' },
        { arg: `type=virtiofs,source=${stateDir},target=/var/lib/kitesurf-state` },
      ],
      ports: [
        { publish: `127.0.0.1:${host.engineHostPort}:${host.engineContainerPort}` },
        { publish: `127.0.0.1:${host.bridgeHostPort}:${host.bridgeContainerPort}` },
      ],
    })
    action = 'created'
  } else if (info.state !== 'running') {
    await deps.backend?.start?.(name)
    action = 'started'
  }
  // A fresh container needs a beat for wrangler+engine to come up. Poll the
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
      await deps.backend?.stop?.(name)
      await deps.backend?.start?.(name)
      action = 'restarted'
      snap = await waitUntil((row) => row.live === true, settleMs)
    } catch { /* keep the snapshot; the failure stays visible in planes */ }
  }
  if (snap.httpBase) session.httpBase = session.httpBase || snap.httpBase
  if (snap.healthy) session.phase = 'running'
  return { action, ...snap }
}

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
  return `(()=>{${scope}.clear();return{ok:true}})()`
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
  })
  return `(()=>{
    const a=${arg};
    const el=document.querySelector(a.selector);
    if(!el)return{ok:false,errorId:'kitesurf.interact.miss',error:'no element matches '+a.selector};
    try{el.scrollIntoView({block:'center',inline:'center'})}catch{}
    const r=el.getBoundingClientRect();
    const cx=r.left+r.width/2,cy=r.top+r.height/2;
    const top=document.elementFromPoint(cx,cy);
    const occluded=top&&top!==el&&!el.contains(top)&&!top.contains(el);
    if(!(r.width>0&&r.height>0))return{ok:false,errorId:'kitesurf.interact.invisible',error:'element has zero box'};
    if(occluded)return{ok:false,errorId:'kitesurf.interact.occluded',error:'covered by '+(top.id?'#'+top.id:top.tagName)};
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
      case 'select': if(el.tagName!=='SELECT')return{ok:false,errorId:'kitesurf.interact.type',error:'select only works on select'}; {const o=[...el.options].find(o=>o.value===a.option||o.text===a.option); if(!o)return{ok:false,errorId:'kitesurf.interact.option',error:'no option '+a.option}; nativeSet(el,o.value); fire('change');} break;
      case 'check': if(el.type!=='checkbox'&&el.type!=='radio')return{ok:false,errorId:'kitesurf.interact.type',error:'check only works on checkbox/radio'}; el.checked=true; fire('click'); fire('change'); break;
      case 'uncheck': if(el.type!=='checkbox')return{ok:false,errorId:'kitesurf.interact.type',error:'uncheck only works on checkbox'}; el.checked=false; fire('click'); fire('change'); break;
      default: return{ok:false,errorId:'kitesurf.interact.action',error:'unsupported action '+a.action};
    }
    return{ok:true,action:a.action,selector:a.selector,tag:el.tagName.toLowerCase()};
  })()`
}

function stateSaveExpression() {
  return `(()=>{const grab=s=>{const m={};for(let i=0;i<s.length;i++){const k=s.key(i);m[k]=s.getItem(k)}return m};return{localStorage:grab(localStorage),sessionStorage:grab(sessionStorage),cookie:document.cookie,url:location.href}})()`
}

function stateLoadExpression(state) {
  return `(()=>{const put=(s,o)=>{for(const [k,v] of Object.entries(o||{}))s.setItem(k,v)};put(localStorage,${JSON.stringify(state.localStorage || {})});put(sessionStorage,${JSON.stringify(state.sessionStorage || {})});return{ok:true}})()`
}

function snapshotExpression() {
  return `(()=>({url:location.href,title:document.title,count:document.querySelectorAll('*').length,tree:(document.body&&document.body.innerText||'').slice(0,500),refs:{},truncated:false}))()`
}

async function readJson(req) {
  if (req?.body && typeof req.body === 'object') return req.body
  const chunks = []
  if (req && typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req) chunks.push(Buffer.from(chunk))
  }
  if (!chunks.length) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { return {} }
}

/**
 * CDP client for a base url. `deps.connect` lets tests and fixtures inject a
 * fake transport; production falls through to the real socket in cdp-elements.
 */
function clientFor(session, base, deps) {
  return ensureClient(session, base, deps?.connect)
}

/**
 * Re-open the address this instance last browsed, if the engine came back
 * blank. Called once per host process, from the first /status.
 * @returns {Promise<boolean>} whether a navigation was issued
 */
async function restoreLastPage(session, deps) {
  const remembered = readLastPage(deps)
  if (!remembered) return false
  const base = await ensureBase(session, deps)
  if (!base) return false
  const client = await clientFor(session, base, deps)
  const current = await evaluatePage(client, 'location.href').catch(() => null)
  const href = typeof current === 'string' ? current : current?.value
  if (href && href !== 'about:blank') return false
  await navigate(session, base, remembered.url)
  session.history.push({ url: remembered.url, at: new Date().toISOString() })
  return true
}

async function ensureBase(session, deps) {
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

function send(res, status, body) {
  res.statusCode = status
  res.end(JSON.stringify(body))
}

/**
 * HITL: the container's MCP bridge holds the real writer lock + humanHold on
 * its loopback HTTP face (engine port +1 — engine:8798 → bridge:8799, the same
 * convention entrypoint uses). The pane can't reach that port directly, so
 * /nano-local-sandbox/control proxies it: GET merges bridge /health control
 * state, POST {action:takeover|release} toggles the sticky human override.
 */
function bridgeControlBase(session) {
  const httpBase = session.httpBase || ''
  const m = /^https?:\/\/([^:]+):(\d+)/.exec(httpBase)
  if (!m) return null
  return `http://${m[1]}:${Number(m[2]) + 1}`
}

async function bridgeFetch(session, pathname, { method = 'GET', body = null, timeoutMs = 2500 } = {}) {
  const base = bridgeControlBase(session)
  if (!base) throw Object.assign(new Error('engine base unknown'), { errorId: 'kitesurf.control.bridge', status: 502 })
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
 * Build the tool-owner plane for /mcp from the SAME session+deps the HTTP
 * routes use. Read-only tools are real domain reads; lifecycle tools reuse
 * prepareEnvironment/envSnapshot/backend so a tool does observable work.
 * `owners` is what mcp-sandbox.js's TOOL_DEFS consume.
 */
function buildOwners(session, deps) {
  const env = deps.env || process.env
  const name = () => containerNameFor(session, env)
  const profilesRoot = deps.profilesRoot ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'profiles')
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
        if (!sessionId) return prepareEnvironment(session, deps)
        const snap = await envSnapshot(session, deps)
        const registry = registryFor(deps, profilesRoot)
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
          containerName: instance.containerName,
          endpoints: instance.endpoints,
          phase: instance.phase,
        }
      },
      start: async () => { await deps.backend?.start?.(name()); return { ok: true, action: 'started' } },
      stop: async () => { await deps.backend?.stop?.(name()); return { ok: true, action: 'stopped' } },
      restart: async () => { await deps.backend?.stop?.(name()); await deps.backend?.start?.(name()); return { ok: true, action: 'restarted' } },
      status: async () => envSnapshot(session, deps),
      list: async () => registryFor(deps, profilesRoot).list(),
    },
    // observability plane — the live session snapshot the routes mutate.
    state: session,
    // page / cdp planes — the real engine face (null when no page).
    page: {
      dom: async () => { const base = await ensureBase(session, deps); return base ? { url: base } : null },
      elements: async () => null,
    },
    targets: { list: async () => (session.httpBase ? [{ url: session.httpBase }] : []) },
    ports: { list: async () => envSnapshot(session, deps) },
    selftest: { run: async () => runSelftest(session, deps) },
    recovery: { plan: async () => [] },
    bridge: { health: async () => { try { const r = await bridgeFetch(session, '/health'); return { ok: r.status === 200, status: r.status } } catch (e) { return { ok: false, errorId: 'kitesurf.control.bridge', error: e.message } } } },
  }
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
  const profilesRoot = deps?.profilesRoot ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'profiles')
  const registry = registryFor(deps, profilesRoot)
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
  // derives 'kitesurf' (prod) or 'kitesurf-<env>' per DSH_HOME so each of the
  // three local environments owns a distinct, concurrently-running instance.
  const session = deps.session ?? { phase: 'idle', history: [], containerName: '' }
  return BINDING_TABLE.map((row) => ({
    path: row.path,
    methods: [...row.methods],
    bodyLimit: row.bodyLimit,
    async handler(req, res) {
      deps.onHandler?.()
      session.operations = session.operations || []
      session.operations.push({ path: row.path, method: req.method, at: new Date().toISOString() })
      if (session.operations.length > 200) session.operations.shift()
      if (row.path.endsWith('/shot')) {
        // Real implementation: the page-ready stub (deps.pageReady) was a
        // scaffold nobody ever wired — shot has a route row but no body. Drive
        // CDP directly: optional fit (viewport emulate to the pane's aspect,
        // no letterbox), optional scroll, then Page.captureScreenshot. Empty
        // capture is the contract's kitesurf.shot.empty (502), not a stub.
        try {
          const body = await readJson(req)
          const base = await ensureBase(session, deps)
          if (!base) {
            send(res, 502, { ok: false, errorId: 'kitesurf.shot.empty', error: 'no engine page' })
            return
          }
          const client = await clientFor(session, base, deps)
          const format = typeof body.format === 'string' && ['png', 'jpeg', 'webp'].includes(body.format) ? body.format : 'webp'
          const fit = body.fit && typeof body.fit === 'object' ? body.fit : null
          const fitW = fit ? Math.round(Number(fit.width)) : null
          const fitH = fit ? Math.round(Number(fit.height)) : null
          const useFit = Number.isFinite(fitW) && Number.isFinite(fitH) && fitW >= 320 && fitW <= 3840 && fitH >= 240 && fitH <= 2160
          const scroll = Number(body.scroll) || 0
          const targets = await client.send('Target.getTargets')
          const pageTargetId = (targets?.targetInfos || []).find((row) => row.type === 'page')?.targetId || ''
          const shot = await withPage(client, async (sessionId) => {
            if (useFit) {
              await client.send('Emulation.setDeviceMetricsOverride', { width: fitW, height: fitH, deviceScaleFactor: 1, mobile: false }, sessionId)
            }
            if (scroll) {
              await client.send('Runtime.evaluate', { expression: `window.scrollBy(0, ${scroll})`, returnByValue: true }, sessionId)
            }
            const params = format === 'png' ? { format } : { format, quality: 80 }
            const cap = await client.send('Page.captureScreenshot', params, sessionId)
            // Frame identity rides with the shot so the pane's pick-drift check
            // compares a pick's identity against the frame it's drawn over.
            const info = await client.send('Runtime.evaluate', {
              expression: `(()=>({url:location.href,scrollX:window.scrollX||0,scrollY:window.scrollY||0}))()`,
              returnByValue: true,
            }, sessionId)
            return { ...cap, identity: info?.result?.value }
          })
          const data = shot?.data
          if (typeof data !== 'string' || data.length === 0) {
            send(res, 502, { ok: false, errorId: 'kitesurf.shot.empty', error: 'engine returned empty screenshot' })
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
            viewport: useFit ? { width: fitW, height: fitH } : null,
          })
        } catch (error) {
          send(res, error.status || 502, { ok: false, errorId: error.errorId || 'kitesurf.engine.connect', error: error.message })
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
        send(res, 200, { ...snap, ok: true, kite: { phase: session.phase }, lastPage: readLastPage(deps) })
        return
      }
      if (row.path.endsWith('/kite')) {
        const body = await readJson(req)
        const action = body.action
        const name = containerNameFor(session, deps.env || process.env)
        if (action === 'suspend' && session.phase === 'running') {
          await deps.backend?.stop?.(name)
          session.phase = 'suspended'
          send(res, 200, { ok: true, phase: session.phase })
          return
        }
        if (action === 'resume' || action === 'start') {
          // Prepare self-heals: adopt running / start stopped / create missing —
          // resume and start both land on "environment usable", the pane's ask.
          const snap = await prepareEnvironment(session, deps)
          session.phase = 'running'
          send(res, 200, { ok: true, phase: session.phase, action: snap.action, healthy: snap.healthy })
          return
        }
        send(res, 409, { ok: false, errorId: 'kitesurf.kite.state', phase: session.phase })
        return
      }
      if (row.path.endsWith('/open')) {
        const body = await readJson(req)
        if (typeof body.url === 'string' && body.url) {
          session.history.push({ url: body.url, at: new Date().toISOString() })
          const base = await ensureBase(session, deps)
          if (base) {
            try { await navigate(session, base, body.url) } catch { /* the history entry still stands */ }
          }
          writeLastPage(deps, body.url)
        }
        send(res, 200, { ok: true, url: body.url ?? null })
        return
      }
      if (row.path.endsWith('/selftest')) {
        // 11 real probes, matching profiles/kitesurf/profile.yaml `health.selftest`.
        try {
          const result = await runSelftest(session, deps)
          send(res, 200, result)
        } catch (error) {
          send(res, 502, { ok: false, errorId: error.errorId || 'kitesurf.engine.connect', error: error.message })
        }
        return
      }
      if (row.path.endsWith('/logs')) {
        // Engine output exists only inside the container. Without this the
        // pane can say "engine down" but never why.
        const url = new URL(req.url, 'http://localhost')
        const tail = Math.max(20, Math.min(2000, Number(url.searchParams.get('tail')) || 200))
        const name = containerNameFor(session, deps.env || process.env)
        try {
          if (typeof deps.backend?.logs !== 'function') {
            send(res, 409, { ok: false, errorId: 'kitesurf.kite.state', error: 'backend has no logs()' })
            return
          }
          const out = await deps.backend.logs(name, { tail })
          send(res, 200, { ok: true, container: name, tail, text: out.text })
        } catch (error) {
          send(res, 502, { ok: false, errorId: 'kitesurf.engine.connect', error: error.message })
        }
        return
      }
      if (row.path.endsWith('/browse-history')) {
        send(res, 200, { ok: true, entries: session.history, source: 'plugin-store' })
        return
      }
      if (row.path.endsWith('/dom')) {
        // Native-HTML plane: the pane renders this srcdoc in an iframe so the
        // browser does layout/scroll/hover instead of a raster screenshot.
        // Without it the pane can only ever show "IMG 截图回退".
        try {
          const base = await ensureBase(session, deps)
          if (!base) {
            send(res, 502, { ok: false, errorId: 'kitesurf.dom.empty', error: 'no engine page' })
            return
          }
          const client = await clientFor(session, base, deps)
          const page = await withPage(client, async (sessionId) => {
            const result = await client.send('Runtime.evaluate', {
              expression: '(()=>({url:location.href,html:document.documentElement?document.documentElement.outerHTML:""}))()',
              returnByValue: true,
            }, sessionId)
            return result?.result?.value
          })
          if (!page?.html) {
            send(res, 502, { ok: false, errorId: 'kitesurf.dom.empty', error: 'no serializable document' })
            return
          }
          if (page.url === 'about:blank') {
            send(res, 502, { ok: false, errorId: 'kitesurf.dom.blank', error: 'page is still about:blank' })
            return
          }
          const built = buildSrcDoc({ url: page.url, html: page.html })
          send(res, 200, { ok: true, url: built.url, srcdoc: built.srcdoc, bytes: built.bytes, stripped: built.stripped })
        } catch (error) {
          send(res, error.status || 502, { ok: false, errorId: error.errorId || 'kitesurf.engine.connect', error: error.message })
        }
        return
      }
      if (row.path.endsWith('/elements')) {
        const url = new URL(req.url ?? '/', 'http://localhost')
        try {
          const data = await (deps.captureElements ?? (async (base, options) => {
            base = base || await ensureBase(session, deps)
            if (!base) {
              const error = new Error('no engine page')
              error.status = 502
              error.errorId = 'kitesurf.elements.empty'
              throw error
            }
            const client = await clientFor(session, base, deps)
            return readElements(client, options)
          }))(deps.httpBase ?? session.httpBase, {
            selector: url.searchParams.get('selector') || '',
            depth: Number(url.searchParams.get('depth') || 4),
          })
          res.statusCode = 200
          res.end(JSON.stringify({ ok: true, ...data }))
        } catch (error) {
          res.statusCode = error.status || 502
          res.end(JSON.stringify({ ok: false, errorId: error.errorId || 'kitesurf.elements.empty', error: error.message }))
        }
        return
      }
      if (row.path.endsWith('/control')) {
        try {
          await ensureBase(session, deps)
          if (req.method === 'POST') {
            const body = await readJson(req)
            const { status, data } = await bridgeFetch(session, '/control', { method: 'POST', body })
            send(res, status === 200 ? 200 : (status || 502), data?.ok ? data : { ok: false, errorId: data?.errorId || 'kitesurf.control.bridge', error: data?.error || 'bridge refused' })
            return
          }
          const { data } = await bridgeFetch(session, '/control')
          send(res, 200, { ok: true, control: data?.control ?? null })
        } catch (error) {
          send(res, error.status || 502, { ok: false, errorId: error.errorId || 'kitesurf.control.bridge', error: error.message })
        }
        return
      }
      if (row.path.endsWith('/mcp')) {
        const rpc = deps.rpc ?? await readJson(req)
        if (rpc.method === 'tools/list') {
          const term = TERM_TOOLS.map((tool) => ({ name: tool.name, description: tool.name, inputSchema: tool.inputSchema }))
          res.statusCode = 200
          res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id ?? null, result: { tools: [...toolsList(), ...term] } }))
          return
        }
        if (rpc.method === 'tools/call') {
          const name = rpc.params?.name
          const args = rpc.params?.arguments ?? {}
          const answer = String(name).startsWith('term.')
            ? await callTermTool(name, args, session, deps)
            : await answerNativeTool(name, buildOwners(session, deps), session, args)
          const failed = answer?.ok === false
          const payload = failed ? answer : (answer?.data !== undefined ? answer.data : answer)
          res.statusCode = failed ? (answer.status ?? (answer.errorId ? statusOf(answer.errorId) : 400)) : 200
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: rpc.id ?? null,
            result: {
              ...answer,
              isError: failed,
              structuredContent: payload,
              content: [{ type: 'text', text: JSON.stringify(payload) }],
            },
          }))
          return
        }
        res.statusCode = 200
        res.end(JSON.stringify({ ok: true, tools: toolsList().length }))
        return
      }
      if (row.path.endsWith('/storage') || row.path.endsWith('/interact') || row.path.endsWith('/state') || row.path.endsWith('/snapshot')) {
        try {
          const base = await ensureBase(session, deps)
          if (!base) {
            send(res, 502, { ok: false, errorId: 'kitesurf.elements.empty', error: 'no engine page' })
            return
          }
          const client = await clientFor(session, base, deps)
          const body = await readJson(req)
          if (row.path.endsWith('/storage')) {
            const scope = body.scope || new URL(req.url ?? '/', 'http://localhost').searchParams.get('scope') || 'local'
            const op = req.method === 'POST' ? (body.op || 'read') : 'read'
            const value = await evaluatePage(client, storageExpression({ ...body, scope, op }))
            send(res, 200, { ok: true, scope, op, result: value })
            return
          }
          if (row.path.endsWith('/interact')) {
            if (!body.selector && !body.target) {
              send(res, 400, { ok: false, errorId: 'kitesurf.interact.selector', error: 'target selector is required' })
              return
            }
            const value = await evaluatePage(client, interactExpression(body))
            if (value && value.ok === false) {
              send(res, 400, { ok: false, errorId: value.errorId || 'kitesurf.interact.fail', error: value.error || 'interact failed' })
              return
            }
            send(res, 200, { ok: true, ...(value || {}) })
            return
          }
          if (row.path.endsWith('/state')) {
            const action = body.action === 'load' ? 'load' : 'save'
            const value = await evaluatePage(client, action === 'save' ? stateSaveExpression() : stateLoadExpression(body.state || {}))
            send(res, 200, { ok: true, action, state: action === 'save' ? value : undefined, restored: action === 'load' ? value : undefined })
            return
          }
          const snap = await evaluatePage(client, snapshotExpression())
          session.refs = snap?.refs || {}
          send(res, 200, { ok: true, ...(snap || {}) })
        } catch (error) {
          send(res, error.status || 502, { ok: false, errorId: error.errorId || 'kitesurf.engine.connect', error: error.message })
        }
        return
      }
      if (row.path.endsWith('/refs')) {
        const ref = new URL(req.url ?? '/', 'http://localhost').searchParams.get('ref')
        const refs = session.refs || {}
        if (ref) {
          if (!refs[ref]) {
            send(res, 404, { ok: false, errorId: 'kitesurf.ref.miss', error: `no element ref ${ref}` })
            return
          }
          send(res, 200, { ok: true, ref, ...refs[ref] })
          return
        }
        send(res, 200, { ok: true, refs })
        return
      }
      if (row.path.endsWith('/har')) {
        const entries = (session.network || []).slice(-100).map((item) => ({
          startedDateTime: item.at,
          time: 0,
          request: { method: item.method || 'GET', url: item.url || '' },
          response: { status: item.status || 0, statusText: '' },
        }))
        send(res, 200, { ok: true, log: { version: '1.2', creator: { name: 'dsh-nano-local-sandbox', version: '0' }, entries } })
        return
      }
      if (row.path.endsWith('/evaluate')) {
        const expression = deps.expression ?? ''
        const result = await keeper.evaluate(deps.instanceId, expression, deps.execute)
        res.statusCode = result.status
        res.end(JSON.stringify({ ok: result.ok, errorId: result.errorId ?? null, dom: result.dom }))
        return
      }
      const pageUrl = new URL(req.url ?? '/', 'http://localhost')
      const pageBody = req.method === 'GET' || req.method === 'HEAD' ? {} : await readJson(req)
      const page = async () => {
        const base = await ensureBase(session, deps)
        if (!base) {
          const error = new Error('no engine page')
          error.status = 502
          error.errorId = 'kitesurf.elements.empty'
          throw error
        }
        return clientFor(session, base, deps)
      }
      try {
        if (row.path.endsWith('/history')) {
          const delta = Number(pageBody.delta || 0)
          const client = await page()
          const value = await evaluatePage(client, `(()=>{history.go(${delta});return{ok:true,delta:${delta},url:location.href}})()`)
          send(res, 200, { ok: true, ...(value || {}) })
          return
        }
        if (row.path.endsWith('/pick')) {
          const client = await page()
          const selector = pageBody.selector || ''
          const expression = selector
            ? `(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return{ok:false,errorId:'kitesurf.pick.miss'};const r=el.getBoundingClientRect();return{ok:true,tag:el.tagName.toLowerCase(),text:(el.innerText||'').slice(0,80),box:{x:r.x,y:r.y,width:r.width,height:r.height}}})()`
            : `(()=>{const el=document.elementFromPoint(${Number(pageBody.x)||0},${Number(pageBody.y)||0});if(!el)return{ok:false,errorId:'kitesurf.pick.miss'};return{ok:true,tag:el.tagName.toLowerCase(),text:(el.innerText||'').slice(0,80)}})()`
          const value = await evaluatePage(client, expression)
          if (value && value.ok === false) {
            send(res, 404, value)
            return
          }
          send(res, 200, value || { ok: true })
          return
        }
        if (row.path.endsWith('/edit')) {
          const client = await page()
          const value = await evaluatePage(client, `(()=>{const el=document.querySelector(${JSON.stringify(pageBody.selector || '')});if(!el)return{ok:false,errorId:'kitesurf.edit.miss'};el.textContent=${JSON.stringify(String(pageBody.text || ''))};return{ok:true,tag:el.tagName.toLowerCase()}})()`)
          send(res, value && value.ok === false ? 404 : 200, value || { ok: true })
          return
        }
        if (row.path.endsWith('/settings')) {
          const client = await page()
          const viewport = pageBody.viewport
          if (viewport && viewport.width && viewport.height) {
            await withPage(client, (sessionId) => client.send('Emulation.setDeviceMetricsOverride', {
              width: Number(viewport.width),
              height: Number(viewport.height),
              deviceScaleFactor: Number(viewport.deviceScaleFactor || 1),
              mobile: viewport.mobile === true,
            }, sessionId))
          }
          send(res, 200, { ok: true, viewport: viewport || null })
          return
        }
        if (row.path.endsWith('/console')) {
          if (pageBody.clear === true) session.console = []
          const level = pageUrl.searchParams.get('level')
          const rows = (session.console || []).filter((item) => !level || item.level === level)
          send(res, 200, { ok: true, entries: rows.slice(-100) })
          return
        }
        if (row.path.endsWith('/operations')) {
          if (pageBody.clear === true) session.operations = []
          send(res, 200, { ok: true, entries: (session.operations || []).slice(-100) })
          return
        }
        if (row.path.endsWith('/diagnostics')) {
          // Two audiences, one endpoint:
          //  - agents read the full JSON (state + trace + catalog + hints);
          //  - humans read `text`, a short report they can paste into a chat.
          // The catalog is reference data, not diagnostic state, so it is only
          // included on request (?catalog=1) — it used to be ~half the payload.
          // Operations are collapsed: /control polling every 1.5s drowned the
          // rows that actually explain a failure.
          const query = new URL(req.url ?? '/', 'http://localhost').searchParams
          const withCatalog = query.get('catalog') === '1'
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
          if (snap.container.state === 'missing') hints.push('容器缺失：点「一键准备环境」或 POST /kite {action:start} 创建')
          else if (snap.container.state !== 'running') hints.push(`容器状态 ${snap.container.state}：一键准备环境启动它`)
          if (!snap.engineAlive) hints.push('引擎未应答 CDP：容器 running 但引擎僵死时重试 /recover 或重启容器')
          if (engineError) hints.push(`引擎探测失败：${engineError}`)
          if (targetInfos.length === 0 && snap.engineAlive) hints.push('无 page target：先 POST /open 打开一个页面')
          if (snap.checks.page?.ok && snap.checks.dom && !snap.checks.dom.ok) hints.push(`DOM 不可渲染（${snap.checks.dom.detail}）：面板会退回截图模式`)
          if (snap.checks.bridge && !snap.checks.bridge.ok) hints.push(`MCP 桥不可达（${snap.checks.bridge.detail}）：HITL 控制态与 agent 工具会失败`)
          const summary = summaryOf(snap)
          const text = [
            `Kitesurf 环境诊断 · ${snap.healthy ? '正常' : '异常'}`,
            `实例 ${snap.containerName} · 容器 ${snap.container.state}`,
            `引擎 ${snap.effective.httpBase || '—'} · 桥 ${snap.effective.bridgePort || '—'}`,
            ...summary.map((row) => `${row.skipped ? '○' : row.ok ? '✓' : '✗'} ${row.label}：${row.detail || '—'}`),
            ...(hints.length ? ['', '建议：', ...hints.map((hint) => `· ${hint}`)] : []),
          ].join('\n')
          send(res, 200, {
            ...snap,
            ok: true,
            httpBase: snap.httpBase,
            kite: { phase: session.phase },
            container: snap.container,
            containerName: snap.containerName,
            effective: snap.effective,
            ports: snap.ports,
            engineAlive: snap.engineAlive,
            checks: snap.checks,
            healthy: snap.healthy,
            summary,
            text,
            targets: targetInfos.map((t) => ({ targetId: t.targetId, type: t.type, url: t.url, title: t.title })),
            console: (session.console || []).slice(-10),
            network: (session.network || []).slice(-10),
            operations: collapseOperations(session.operations || []),
            history: (session.history || []).slice(-10),
            ...(withCatalog ? { errorCatalog: ERROR_CATALOG.map((row) => ({ errorId: row.example, status: row.status, cause: row.cause, next: row.next })) } : {}),
            hints,
          })
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
            send(res, error.status || 502, { ok: false, errorId: error.errorId || 'kitesurf.engine.connect', error: error.message })
            return
          }
          const last = session.history.at(-1) ?? readLastPage(deps)
          if (last && snap.httpBase) {
            try { await navigate(session, snap.httpBase, last.url) } catch { /* replay is best-effort */ }
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
          send(res, 200, { ok: true, entries: (session.network || []).slice(-100) })
          return
        }
        if (row.path.endsWith('/targets')) {
          const client = await page()
          const targets = await client.send('Target.getTargets')
          send(res, 200, { ok: true, targetInfos: targets.targetInfos || [] })
          return
        }
        if (row.path.endsWith('/wait')) {
          const client = await page()
          const selector = String(pageBody.selector || 'body')
          let found = null
          for (let attempt = 0; attempt < 4; attempt += 1) {
            found = await evaluatePage(client, `(()=>{const el=document.querySelector(${JSON.stringify(selector)});return el?{ok:true,tag:el.tagName.toLowerCase()}:{ok:false}})()`)
            if (found && found.ok) break
          }
          if (!found || found.ok !== true) {
            send(res, 504, { ok: false, errorId: 'kitesurf.wait.timeout', error: `selector did not match: ${selector}` })
            return
          }
          send(res, 200, found)
          return
        }
        send(res, 404, { ok: false, errorId: 'kitesurf.tool.unknown', error: row.path })
      } catch (error) {
        send(res, error.status || 502, { ok: false, errorId: error.errorId || 'kitesurf.engine.connect', error: error.message })
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

export { keeper }
