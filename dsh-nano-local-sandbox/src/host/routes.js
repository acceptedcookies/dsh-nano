export const STATUS_ROUTE = '/nano-local-sandbox/status'
export const OPEN_ROUTE = '/nano-local-sandbox/open'
export const SHOT_ROUTE = '/nano-local-sandbox/shot'
export const HISTORY_ROUTE = '/nano-local-sandbox/history'
export const PICK_ROUTE = '/nano-local-sandbox/pick'
export const EDIT_ROUTE = '/nano-local-sandbox/edit'
export const SETTINGS_ROUTE = '/nano-local-sandbox/settings'
export const PERF_REVIEW_HOST_ROUTE = '/nano-local-sandbox/perf-review/host'
export const PERF_REPORT_ROUTE = '/nano-local-sandbox/perf-report'
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

import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROUTE_TABLE } from '../../lib/route-table.js'
import { createCdpKeeper } from './cdp-keeper.js'
import { publishedHttpBase } from './backend-apple.js'
import { ensureClient, evaluatePage, navigate, readElements, withPage } from './cdp-elements.js'
import { answerNativeTool, toolsList } from './mcp-sandbox.js'
import { listProfiles, loadProfile } from './profile-registry.js'
import { ERROR_CATALOG, statusOf } from './error-catalog.js'

const keeper = createCdpKeeper()

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
function envTag(env = process.env) {
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

/** Engine liveness probe: reachable CDP /json/list, bounded so the UI never hangs. */
async function engineAlive(base, timeoutMs = 900) {
  if (!base) return false
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const response = await fetch(`${base}/json/list`, { signal: controller.signal }).catch(() => null)
    clearTimeout(timer)
    return Boolean(response && response.ok)
  } catch {
    return false
  }
}

/**
 * The env self-heal / diagnostics snapshot EnvPanel reads: container state,
 * published ports, resolved httpBase, engine liveness, and a derived healthy
 * flag. Failure degrades to a partial shape rather than throwing.
 */
async function envSnapshot(session, deps) {
  const name = containerNameFor(session, deps.env || process.env)
  const host = envHostPorts(deps.env || process.env)
  let info = null
  try {
    const inspected = await deps.backend?.inspect?.(name)
    info = parseInspect(inspected?.raw ?? inspected, host.engineContainerPort)
  } catch { info = null }
  const engineRow = info?.ports?.find((p) => p.containerPort === host.engineContainerPort) || null
  const bridgeRow = info?.ports?.find((p) => p.containerPort === host.bridgeContainerPort) || null
  // Prefer the port THIS env's container actually published — session.httpBase
  // may be stale from a previous env (dev used to adopt the prod container).
  const derived = engineRow ? `http://${engineRow.hostAddress === '0.0.0.0' ? '127.0.0.1' : engineRow.hostAddress}:${engineRow.hostPort}` : null
  const httpBase = derived || session.httpBase || null
  const alive = await engineAlive(httpBase)
  const state = info?.state || 'missing'
  const healthy = state === 'running' && alive === true
  return {
    containerName: name,
    container: { state, name },
    effective: { httpBase, enginePort: engineRow?.hostPort ?? host.engineHostPort, bridgePort: bridgeRow?.hostPort ?? host.bridgeHostPort },
    ports: {
      engine: engineRow ? { port: engineRow.hostPort, containerPort: engineRow.containerPort, heldBy: 'this-container' } : { port: host.engineHostPort, containerPort: host.engineContainerPort, heldBy: 'free' },
      bridge: bridgeRow ? { port: bridgeRow.hostPort, containerPort: bridgeRow.containerPort, heldBy: 'this-container' } : { port: host.bridgeHostPort, containerPort: host.bridgeContainerPort, heldBy: 'free' },
    },
    engineAlive: alive,
    healthy,
    phase: session.phase,
    httpBase,
  }
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
  const deadline = Date.now() + (action === 'noop' ? 0 : 6000)
  let snap = await envSnapshot(session, deps)
  while (!snap.engineAlive && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    snap = await envSnapshot(session, deps)
  }
  if (snap.httpBase) session.httpBase = session.httpBase || snap.httpBase
  if (snap.healthy && session.phase === 'idle') session.phase = 'running'
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

async function ensureBase(session, deps) {
  if (session.httpBase) return session.httpBase
  if (!deps.backend?.inspect) return null
  try {
    const inspected = await deps.backend.inspect(containerNameFor(session, deps))
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
      ensure: async ({ sessionId } = {}) => prepareEnvironment(session, deps),
      start: async () => { await deps.backend?.start?.(name()); return { ok: true, action: 'started' } },
      stop: async () => { await deps.backend?.stop?.(name()); return { ok: true, action: 'stopped' } },
      restart: async () => { await deps.backend?.stop?.(name()); await deps.backend?.start?.(name()); return { ok: true, action: 'restarted' } },
      status: async () => envSnapshot(session, deps),
    },
    // observability plane — the live session snapshot the routes mutate.
    state: session,
    // page / cdp planes — the real engine face (null when no page).
    page: {
      dom: async () => { const base = await ensureBase(session, deps); return base ? { url: base } : null },
      elements: async () => null,
    },
    targets: { list: async () => (session.httpBase ? [{ url: session.httpBase }] : []) },
    ports: { list: async () => (await envSnapshot(session, deps)).ports },
    selftest: { run: async () => ({ ok: (await envSnapshot(session, deps)).healthy }) },
    recovery: { plan: async () => [] },
    bridge: { health: async () => { try { const r = await bridgeFetch(session, '/health'); return { ok: r.status === 200, status: r.status } } catch (e) { return { ok: false, errorId: 'kitesurf.control.bridge', error: e.message } } } },
  }
}

export function routeSpecs(deps = {}) {
  // #4: session.containerName is left empty on purpose — containerNameFor()
  // derives 'kitesurf' (prod) or 'kitesurf-<env>' per DSH_HOME so each of the
  // three local environments owns a distinct, concurrently-running instance.
  const session = deps.session ?? { phase: 'idle', history: [], containerName: '' }
  return ROUTE_TABLE.map((row) => ({
    path: row.path,
    methods: [...row.methods],
    sessionBinding: true,
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
          const client = await ensureClient(session, base)
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
        send(res, 200, { ok: session.phase === 'running', httpBase: session.httpBase ?? null, kite: { phase: session.phase } })
        return
      }
      if (row.path.endsWith('/kite')) {
        const body = await readJson(req)
        const action = body.action
        const name = containerNameFor(session, deps)
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
        }
        send(res, 200, { ok: true, url: body.url ?? null })
        return
      }
      if (row.path.endsWith('/selftest')) {
        const failed = session.phase === 'running' ? 0 : 1
        send(res, 200, { ok: failed === 0, failed, total: 1 })
        return
      }
      if (row.path.endsWith('/browse-history')) {
        send(res, 200, { ok: true, entries: session.history, source: 'plugin-store' })
        return
      }
      if (row.path.endsWith('/dom')) {
        const last = session.history.at(-1)
        send(res, last ? 200 : 502, last ? { ok: true, url: last.url } : { ok: false, errorId: 'kitesurf.dom.blank' })
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
            const client = await ensureClient(session, base)
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
          res.statusCode = 200
          res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id ?? null, result: { tools: toolsList() } }))
          return
        }
        if (rpc.method === 'tools/call') {
          // P3-03: dispatch against real injected owners (async-capable), not the
          // retired uniform digest. owners built per-call from live session+deps.
          const answer = await answerNativeTool(rpc.params?.name, buildOwners(session, deps), session, rpc.params?.arguments ?? {})
          res.statusCode = answer.ok ? 200 : (answer.status ?? (answer.errorId ? statusOf(answer.errorId) : 400))
          res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id ?? null, result: answer }))
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
          const client = await ensureClient(session, base)
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
        return ensureClient(session, base)
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
          // One-shot diagnostic: full env snapshot + targets + trace + catalog +
          // derived hints. Degrades per-section so a dead engine still returns
          // a useful map instead of a bare 502.
          const snap = await envSnapshot(session, deps)
          let targetInfos = []
          let engineError = null
          if (snap.engineAlive && snap.httpBase) {
            try {
              const client = await ensureClient(session, snap.httpBase)
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
          send(res, 200, {
            ok: snap.healthy,
            httpBase: snap.httpBase,
            kite: { phase: session.phase },
            container: snap.container,
            containerName: snap.containerName,
            effective: snap.effective,
            ports: snap.ports,
            engineAlive: snap.engineAlive,
            healthy: snap.healthy,
            targets: targetInfos.map((t) => ({ targetId: t.targetId, type: t.type, url: t.url, title: t.title })),
            console: (session.console || []).slice(-20),
            network: (session.network || []).slice(-20),
            operations: (session.operations || []).slice(-20),
            history: (session.history || []).slice(-10),
            errorCatalog: ERROR_CATALOG.map((row) => ({ errorId: row.example, status: row.status, cause: row.cause, next: row.next })),
            hints,
          })
          return
        }
        if (row.path.endsWith('/ports')) {
          const snap = await envSnapshot(session, deps)
          send(res, 200, {
            ok: true,
            httpBase: snap.httpBase ?? session.httpBase ?? null,
            phase: session.phase,
            containerName: snap.containerName,
            container: snap.container,
            effective: snap.effective,
            ports: snap.ports,
            engineAlive: snap.engineAlive,
            healthy: snap.healthy,
          })
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
          const last = session.history.at(-1)
          if (last && snap.httpBase) {
            try { await navigate(session, snap.httpBase, last.url) } catch { /* replay is best-effort */ }
          }
          send(res, 200, {
            ok: true,
            action: snap.action,
            healthy: snap.healthy,
            engineAlive: snap.engineAlive,
            url: last?.url ?? null,
            replay: Boolean(last),
            ports: snap.ports,
            container: snap.container,
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
        if (row.path.endsWith('/perf-report')) {
          session.spans = session.spans || []
          session.spans.push({ at: new Date().toISOString(), ...pageBody })
          send(res, 200, { ok: true, count: session.spans.length })
          return
        }
        if (row.path.endsWith('/perf-review/host')) {
          send(res, 200, { ok: true, spans: session.spans || [] })
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
