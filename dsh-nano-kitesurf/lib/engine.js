/**
 * CDP client for one Kitesurf engine.
 *
 * The engine is external. This module never launches a browser. It talks to
 * the Worker at `httpBase` (`/health`, `/json/version`) and to the browser
 * socket at `/devtools/browser`. Page commands go through a flattened
 * Target session, which is the same attachment Puppeteer uses.
 *
 * CDP events (console/exception/log/network/navigation) are normalized into
 * the process-local ring buffer in ./diagnostics.js so an MCP client can read
 * the page's execution state without attaching a second socket.
 */
import { networkFailed, networkFinished, networkRequest, networkResponse, recordConsole } from './diagnostics.js'

const CONNECT_MS = 4000
const CALL_MS = 20000
const NAVIGATE_MS = 45000

/** @param {string} httpBase origin, no path */
export function browserSocketUrl(httpBase) {
  const url = new URL(httpBase)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/devtools/browser'
  url.search = ''
  url.hash = ''
  return url.toString()
}

/**
 * @param {string} raw
 * @returns {string} absolute http(s) URL without credentials
 */
export class KitesurfError extends Error {
  /**
   * @param {string} id stable id for the agent and the toast
   * @param {string} message
   * @param {{ transport?: boolean }} [flags] transport=true means the socket
   *   itself is suspect, so useLive may reconnect and retry once.
   */
  constructor(id, message, flags = {}) {
    super(message)
    this.id = id
    this.transport = flags.transport === true
  }
}

/** The engine writes this into the document when a top-level fetch exceeds 25s. */
export function egressFailure(text) {
  if (typeof text !== 'string' || !text.startsWith('kitesurf: egress timeout')) return null
  return new KitesurfError('kitesurf.navigate.egress', text.slice(0, 160))
}

export function pageUrl(raw) {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new KitesurfError('kitesurf.url.empty', '地址是空的')
  }
  let text = raw.trim()
  if (text.length > 2000) throw new KitesurfError('kitesurf.url.invalid', '地址过长')
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = `https://${text}`
  let url
  try {
    url = new URL(text)
  } catch {
    throw new KitesurfError('kitesurf.url.invalid', '这个地址无效')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new KitesurfError('kitesurf.url.scheme', '只支持 HTTP 和 HTTPS 地址')
  }
  if (url.username || url.password) throw new KitesurfError('kitesurf.url.credentials', '地址不能包含用户名或密码')
  return url.toString()
}

/**
 * @param {unknown} body
 * @returns {{ x: number, y: number }}
 */
/**
 * Optional screenshot scroll. Zero means do not move.
 * @param {unknown} body
 * @returns {number}
 */
export function scrollDelta(body) {
  if (!body || typeof body !== 'object' || body.scroll == null) return 0
  const value = body.scroll
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new KitesurfError('kitesurf.shot.scroll', 'scroll must be a finite number')
  }
  const rounded = Math.round(value)
  if (Math.abs(rounded) > 4000) throw new KitesurfError('kitesurf.shot.scroll', 'scroll is out of range')
  return rounded
}

/** Selector strings for pickBySelector — bounded, must look like a selector. */
export function editBody(body) {
  let selector
  try {
    selector = pickSelector(body)
  } catch (error) {
    // /edit owns its own selector faults — surface them as edit.* ids, not
    // pick.badpoint borrowed from the sibling route.
    throw new KitesurfError('kitesurf.edit.selector', error instanceof Error ? error.message : String(error))
  }
  const text = body?.text
  if (typeof text !== 'string' || !text.length) {
    throw new KitesurfError('kitesurf.edit.badtext', 'text required')
  }
  if (text.length > 4000) {
    throw new KitesurfError('kitesurf.edit.badtext', 'text too long')
  }
  return { selector, text }
}

export function pickSelector(body) {
  const selector = body?.selector
  if (typeof selector !== 'string' || !selector.trim()) {
    throw new KitesurfError('kitesurf.pick.badpoint', 'selector required')
  }
  const clean = selector.trim().slice(0, 320)
  if (/[\0-\x08\x0b\x0c\x0e-\x1f]/.test(clean)) {
    throw new KitesurfError('kitesurf.pick.badpoint', 'invalid selector')
  }
  return clean
}

export function pickPoint(body) {
  const x = body && typeof body === 'object' ? body.x : undefined
  const y = body && typeof body === 'object' ? body.y : undefined
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
    throw new KitesurfError('kitesurf.pick.point', 'x and y must be finite numbers')
  }
  if (x < 0 || y < 0 || x > 10000 || y > 10000) {
    throw new KitesurfError('kitesurf.pick.point', 'x and y are out of range')
  }
  return { x, y }
}

/** Six computed styles, matching the fields a design note actually carries. */
// 6 was enough to describe a note; a debugger needs the box model and the
// typography that actually explains a layout bug.
const STYLE_KEYS = [
  'color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight', 'lineHeight',
  'display', 'position', 'margin', 'padding', 'border', 'borderRadius',
  'width', 'height', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'zIndex', 'overflow',
]

/**
 * @param {Record<string, unknown> | null | undefined} value
 */
export function elementPacket(value) {
  const source = value && typeof value === 'object' ? value : {}
  const styleIn = source.style && typeof source.style === 'object' ? source.style : {}
  const style = {}
  for (const key of STYLE_KEYS) style[key] = typeof styleIn[key] === 'string' ? styleIn[key] : ''
  const box = source.box && typeof source.box === 'object' ? source.box : {}
  return {
    tag: typeof source.tag === 'string' ? source.tag : '',
    id: typeof source.id === 'string' ? source.id : '',
    className: typeof source.className === 'string' ? source.className : '',
    selector: typeof source.selector === 'string' ? source.selector : '',
    text: typeof source.text === 'string' ? source.text.slice(0, 200) : '',
    alt: typeof source.alt === 'string' ? source.alt.slice(0, 80) : '',
    src: typeof source.src === 'string' && !source.src.startsWith('data:') ? source.src.slice(0, 120) : '',
    box: {
      x: numberOrZero(box.x),
      y: numberOrZero(box.y),
      width: numberOrZero(box.width),
      height: numberOrZero(box.height),
    },
    style,
    // Attribute map + ancestor chain: a selector alone cannot tell an agent
    // whether the node is a button, a link, or a decorative svg.
    attrs: source.attrs && typeof source.attrs === 'object'
      ? Object.fromEntries(Object.entries(source.attrs).slice(0, 12).map(([k, v]) => [String(k).slice(0, 32), String(v).slice(0, 120)]))
      : {},
    ancestors: Array.isArray(source.ancestors)
      ? source.ancestors.slice(0, 6).map((n) => String(n).slice(0, 80))
      : [],
    componentStack: Array.isArray(source.componentStack) && source.componentStack.length
      ? source.componentStack.map((n) => String(n).slice(0, 60)).slice(0, 8)
      : null,
    parentSel: typeof source.parentSel === 'string' ? source.parentSel.slice(0, 320) : null,
    childSel: typeof source.childSel === 'string' ? source.childSel.slice(0, 320) : null,
  }
}

function numberOrZero(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * @param {string} httpBase
 * @param {string} path
 * @param {number} timeoutMs
 */
export async function fetchEngine(httpBase, path, timeoutMs = CONNECT_MS) {
  const url = new URL(path, httpBase)
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  const text = await response.text()
  return { status: response.status, text: text.slice(0, 4000) }
}

/**
 * Kitesurf drops the page when the browser socket closes. Open, screenshot,
 * and pick have to share one socket or the second call sees about:blank.
 * @type {{ wsUrl: string, ws: WebSocket, send: Function, page: { targetId: string, sessionId: string } | null } | null}
 */
let live = null
let userAgent = ''
let userAgentApplied = false
/** @type {{ width: number, height: number, mobile: boolean, deviceScaleFactor: number } | null} */
let viewport = null
let viewportApplied = false
/** @type {'screen'|'print'|null} */
let media = null
let mediaApplied = false
/** @type {Record<string,string>|null} */
let extraHeaders = null
let headersApplied = false

const VIEWPORTS = {
  390: { width: 390, height: 844, mobile: true },
  768: { width: 768, height: 1024, mobile: true },
  1280: { width: 1280, height: 800, mobile: false },
}

// Header names that must never be injected by a debug setting: they carry
// credentials or change request framing.
const FORBIDDEN_HEADERS = new Set(['cookie', 'authorization', 'proxy-authorization', 'host', 'content-length', 'connection', 'transfer-encoding'])

export function currentUserAgent() {
  return userAgent
}

export function currentViewport() {
  return viewport
}

/** All emulation state in one object for /status and /diagnostics. */
export function currentEmulation() {
  return {
    userAgent,
    viewport,
    media,
    extraHeaders: extraHeaders ? Object.keys(extraHeaders) : [],
  }
}

async function applyEmulation(client, page) {
  // An empty-UA override is not the same as "no override" to Chrome: it sets a
  // blank agent. Send once when set, send once when clearing, else skip.
  if (userAgent !== '' || userAgentApplied) {
    await client.send('Emulation.setUserAgentOverride', { userAgent }, page.sessionId)
    userAgentApplied = userAgent !== ''
  }
  if (viewport) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor,
      mobile: viewport.mobile,
    }, page.sessionId)
    viewportApplied = true
  } else if (viewportApplied) {
    await client.send('Emulation.clearDeviceMetricsOverride', {}, page.sessionId)
    viewportApplied = false
  }
  if (media || mediaApplied) {
    await client.send('Emulation.setEmulatedMedia', { media: media || 'screen' }, page.sessionId)
    mediaApplied = media !== null
  }
  if (extraHeaders || headersApplied) {
    await client.send('Network.setExtraHTTPHeaders', { headers: extraHeaders || {} }, page.sessionId)
    headersApplied = extraHeaders !== null
  }
}

/** Console arg → short printable text (RemoteObject, bounded). */
function remoteArgText(arg) {
  if (!arg || typeof arg !== 'object') return String(arg ?? '')
  if (typeof arg.value === 'string' || typeof arg.value === 'number' || typeof arg.value === 'boolean') return String(arg.value)
  if (typeof arg.description === 'string') return arg.description
  if (arg.preview && Array.isArray(arg.preview.properties)) {
    return `{${arg.preview.properties.slice(0, 8).map((p) => `${p.name}:${String(p.value ?? '').slice(0, 60)}`).join(', ')}}`
  }
  return arg.type === 'undefined' ? 'undefined' : `[${arg.type || 'object'}]`
}

/**
 * One normalizer for all execution-state events. The engine emits
 * Runtime.consoleAPICalled / Runtime.exceptionThrown / Log.entryAdded /
 * Network.loadingFailed / Page.frameNavigated on the page session; keeping
 * them here means the pane, the API and MCP all read the same ledger.
 */
function captureCdpEvent(method, params) {
  try {
    if (method === 'Runtime.consoleAPICalled') {
      const level = params.type === 'warning' ? 'warn' : (['log', 'info', 'debug', 'error'].includes(params.type) ? params.type : 'log')
      const frame = params.stackTrace?.callFrames?.[0]
      recordConsole({
        level,
        source: 'console',
        text: (Array.isArray(params.args) ? params.args : []).map(remoteArgText).join(' ').slice(0, 600) || '(empty console call)',
        url: frame?.url,
        lineNumber: frame?.lineNumber,
      })
      return
    }
    if (method === 'Runtime.exceptionThrown') {
      const detail = params.exceptionDetails || {}
      const text = [detail.text, detail.exception?.description, detail.exception?.value].filter(Boolean).join(' | ')
      recordConsole({ level: 'exception', source: 'javascript', text: String(text || 'uncaught exception').slice(0, 600), url: detail.url, lineNumber: detail.lineNumber })
      return
    }
    if (method === 'Log.entryAdded') {
      const entry = params.entry || {}
      const allowed = ['error', 'warn', 'log', 'info', 'debug']
      const level = entry.level === 'warning' ? 'warn' : (allowed.includes(entry.level) ? entry.level : 'log')
      recordConsole({
        level: entry.source === 'network' ? 'network' : level,
        source: `log:${entry.source || 'other'}`,
        text: String(entry.text || '').slice(0, 600),
        url: entry.url,
        lineNumber: entry.lineNumber,
      })
      return
    }
    if (method === 'Network.requestWillBeSent') { networkRequest(params); return }
    if (method === 'Network.responseReceived') { networkResponse(params); return }
    if (method === 'Network.loadingFinished') { networkFinished(params); return }
    if (method === 'Network.loadingFailed') {
      networkFailed(params)
      recordConsole({ level: 'network', source: 'network', text: `${params.errorText || 'request failed'} (${params.type || 'unknown'})`.slice(0, 600) })
      return
    }
    if (method === 'Page.frameNavigated') {
      const url = params.frame?.url
      if (url && url !== 'about:blank') recordConsole({ level: 'navigation', source: 'page', text: `→ ${url}`.slice(0, 600), url })
      return
    }
    if (method === 'Inspector.targetCrashed' || method === 'Target.targetCrashed') {
      recordConsole({ level: 'exception', source: 'page', text: 'page target crashed' })
    }
  } catch {
    // Diagnostics must never break the CDP transport.
  }
}

export function releaseEngine() {
  dropLive()
}

function dropLive() {
  if (live) {
    try { live.ws.close() } catch { /* already closed */ }
    live = null
  }
  // The identity proof is per-socket, not per-origin: a same-port replacement
  // service must be re-verified before the next attach.
  verifiedBase = null
}

/**
 * The engine identifies itself through /health ("kitesurf..." body). The CDP
 * handshake alone cannot tell a Kitesurf from a local Chrome, and attaching to
 * the wrong browser would steer an agent onto a socket that eats every
 * non-Puppeteer command. Verified once per origin, before the first socket.
 * @type {string | null}
 */
let verifiedBase = null

async function verifyEngine(httpBase) {
  if (verifiedBase === httpBase) return
  let health
  try {
    health = await fetchEngine(httpBase, '/health')
  } catch {
    throw new KitesurfError('kitesurf.engine.connect', `cannot reach ${httpBase}`, { transport: true })
  }
  if (health.status !== 200 || !health.text.startsWith('kitesurf')) {
    throw new KitesurfError(
      'kitesurf.engine.mismatch',
      `${httpBase} did not answer as Kitesurf (health ${health.status})`,
    )
  }
  verifiedBase = httpBase
}

async function connectLive(httpBase) {
  const wsUrl = browserSocketUrl(httpBase)
  if (live && live.wsUrl === wsUrl && live.ws.readyState === WebSocket.OPEN) return live
  dropLive()
  await verifyEngine(httpBase)
  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new KitesurfError('kitesurf.engine.connect', 'cdp connect timeout', { transport: true }))
    }, CONNECT_MS)
    ws.addEventListener('open', () => { clearTimeout(timer); resolve() }, { once: true })
    ws.addEventListener('error', () => {
      clearTimeout(timer)
      reject(new KitesurfError('kitesurf.engine.connect', 'cdp connect failed', { transport: true }))
    }, { once: true })
  })
  let next = 1
  const pending = new Map()
  ws.addEventListener('message', (event) => {
    let message
    try { message = JSON.parse(String(event.data)) } catch { return }
    if (typeof message.id === 'number' && pending.has(message.id)) {
      const settle = pending.get(message.id)
      pending.delete(message.id)
      settle(message)
      return
    }
    // Everything else is a CDP event. Normalize the handful that carry
    // execution state into the diagnostics ring; ignore the rest cheaply.
    if (typeof message.method === 'string') captureCdpEvent(message.method, message.params || {})
  })
  ws.addEventListener('close', () => {
    if (live && live.ws === ws) live = null
    // Never leave callers hanging on a dead socket: their CALL_MS timer would
    // otherwise stretch a known-dead transport into a 20s stall.
    const closed = new KitesurfError('kitesurf.engine.closed', 'browser socket closed', { transport: true })
    for (const settle of pending.values()) settle({ error: { message: closed.message }, kitesurfError: closed })
    pending.clear()
  })
  const send = (method, params = {}, sessionId, timeoutMs = CALL_MS) => new Promise((resolve, reject) => {
    const id = next++
    const timer = setTimeout(() => {
      pending.delete(id)
      // A command timeout is NOT proof the socket is dead — Page.navigate may
      // still complete inside the engine. Retrying a timed-out body would
      // navigate twice, so timeouts stay transport=false and the socket is
      // only dropped, leaving the caller's own retry policy to decide.
      dropLive()
      reject(new KitesurfError(
        method === 'Page.navigate' ? 'kitesurf.navigate.timeout' : 'kitesurf.engine.timeout',
        `${method} timed out`,
      ))
    }, timeoutMs)
    pending.set(id, (message) => {
      clearTimeout(timer)
      if (message.kitesurfError) { reject(message.kitesurfError); return }
      if (message.error) {
        const text = String(message.error.message || method)
        // A navigation between attach and evaluate destroys the execution
        // context. That is a race, not an engine failure — retryable.
        if (/Execution context was destroyed|Cannot find context|Inspected target navigated|Target closed/i.test(text)) {
          reject(new KitesurfError('kitesurf.engine.context', text.slice(0, 160), { transport: true }))
          return
        }
        reject(new KitesurfError('kitesurf.engine.failed', text))
        return
      }
      else resolve(message.result ?? {})
    })
    const frame = { id, method, params }
    if (sessionId) frame.sessionId = sessionId
    ws.send(JSON.stringify(frame))
  })
  live = { wsUrl, ws, send, page: null }
  return live
}

async function pageHandle(client) {
  if (client.page) return client.page
  const listed = await client.send('Target.getTargets')
  const pages = Array.isArray(listed.targetInfos) ? listed.targetInfos.filter(item => item.type === 'page') : []
  let targetId = pages[0]?.targetId
  if (!targetId) {
    const created = await client.send('Target.createTarget', { url: 'about:blank' })
    targetId = created.targetId
  }
  if (!targetId) throw new Error('kitesurf did not return a page target')
  const attached = await client.send('Target.attachToTarget', { targetId, flatten: true })
  if (!attached.sessionId) throw new Error('kitesurf did not attach a page session')
  await client.send('Page.enable', {}, attached.sessionId)
  await client.send('Runtime.enable', {}, attached.sessionId)
  // Best-effort: these domains are what make console/network/navigation
  // events observable. An engine that lacks one simply emits fewer events;
  // it must never fail the whole attach.
  for (const domain of ['Log.enable', 'Network.enable']) {
    try { await client.send(domain, {}, attached.sessionId) } catch { /* optional */ }
  }
  client.page = { targetId, sessionId: attached.sessionId }
  return client.page
}

/**
 * Retry only when the transport was never reached: a socket that failed to
 * OPEN or was closed mid-call can be reopened cleanly. A timed-out command
 * may still be executing inside the engine (a second Page.navigate would
 * race the first), and CDP domain or deterministic failures (probe failed,
 * navigate refused, shot empty) must not re-run at all — so transport is
 * limited to connect/closed, never timeout.
 */
async function useLive(httpBase, body) {
  try {
    return await body(await connectLive(httpBase))
  } catch (error) {
    if (!error || error.transport !== true) throw error
    dropLive()
    // A destroyed execution context means the page is mid-navigation: give it
    // a beat, then retry the whole operation once on a fresh session.
    if (error.id === 'kitesurf.engine.context') await new Promise((r) => setTimeout(r, 350))
    try {
      return await body(await connectLive(httpBase))
    } catch (second) {
      dropLive()
      throw second
    }
  }
}

/**
 * Wait for the page to actually move off about:blank. Redirect chains end on
 * a different URL than `target`, so exact-equality here would spin and
 * silently continue — instead accept any real location.
 */
async function waitForPage(client, page) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const info = await client.send('Runtime.evaluate', {
      expression: 'location.href',
      returnByValue: true,
    }, page.sessionId)
    const href = info.result?.value
    if (typeof href === 'string' && href !== '' && href !== 'about:blank') return
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}

async function waitForContent(client, page) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const info = await client.send('Runtime.evaluate', {
      expression: "(() => { const b = document.body; if (!b) return 0; const t = (b.innerText || '').trim().length; return Math.max(t, b.childElementCount * 2) })()",
      returnByValue: true,
    }, page.sessionId)
    if (Number(info.result?.value) > 40) return
    await new Promise(resolve => setTimeout(resolve, 250))
  }
}

/**
 * React/component-stack introspection, inlined into both packet expressions.
 * Walks React fiber keys (the `__reactFiber$<key>` / `__reactInternalInstance`
 * attach points) up the DOM
 * then follows .return, collecting component display names (Class/Function
 * components only — DOM/Host fibers and anonymous renders are skipped).
 * Returns null when nothing resolves so the packet stays honest about
 * "no framework detected" rather than [].
 */
const STACK_SNIPPET = `(() => {
  const names = [];
  const seen = new Set();
  const fiberOf = (node) => {
    if (!node) return null;
    const keys = Object.keys(node);
    const key = keys.find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance'));
    return key ? node[key] : null;
  };
  const nameOf = (fiber) => {
    const t = fiber && fiber.type;
    if (!t) return null;
    if (typeof t === 'function' || typeof t === 'object') {
      const n = t.displayName || t.name || (t.render && t.render.name) || (t.type && t.type.name) || '';
      // Skip junk: lowercase DOM names, single chars, or the minifier's '$'.
      return n && n.length > 1 && n !== '$' && !/^[a-z]+$/.test(n) ? n : null;
    }
    return null;
  };
  let dom = el;
  while (dom && names.length < 8) {
    let fiber = fiberOf(dom);
    while (fiber && names.length < 8) {
      const n = nameOf(fiber);
      if (n && !seen.has(n)) { seen.add(n); names.unshift(n); }
      fiber = fiber.return;
    }
    dom = dom.parentElement;
  }
  return names.length ? names.slice(-8) : null;
})()`

const PACKET_EXPRESSION = `(() => {
  const el = document.elementFromPoint(__X__, __Y__);
  if (!el || el.nodeType !== 1) return null;
  const own = [];
  if (el.tagName !== 'HTML' && el.tagName !== 'BODY' && el.tagName !== 'IFRAME') {
    for (const child of el.childNodes) {
      if (child.nodeType === 3) own.push(child.textContent);
    }
  }
  let text = own.join('').replace(/\\s+/g, ' ').trim();
  if (!text && el.tagName !== 'HTML' && el.tagName !== 'BODY' && el.tagName !== 'IFRAME' && el.getBoundingClientRect().height <= 80) {
    text = String(el.innerText || '').replace(/\\s+/g, ' ').trim();
  }
  text = text.slice(0, 200);
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && parts.length < 8) {
    let piece = node.tagName.toLowerCase();
    if (node.id) piece += '#' + node.id;
    else if (typeof node.className === 'string' && node.className.trim()) {
      piece += '.' + node.className.trim().split(/\\s+/).slice(0, 2).join('.');
    } else if (node.parentElement) {
      const same = Array.prototype.filter.call(node.parentElement.children, (child) => child.tagName === node.tagName);
      if (same.length > 1) piece += ':nth-of-type(' + (Array.prototype.indexOf.call(same, node) + 1) + ')';
    }
    parts.unshift(piece);
    node = node.parentElement;
  }
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || '',
    className: typeof el.className === 'string' ? el.className : '',
    selector: parts.join(' > '),
    text,
    alt: String(el.getAttribute('alt') || '').slice(0, 80),
    src: (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'SOURCE')
      ? String(el.currentSrc || el.src || el.getAttribute('src') || '').slice(0, 120)
      : '',
    // Parent/child navigation (Arrow Up/Down): parent is the selector minus
    // its last segment; childSel names the largest visible element child so
    // Arrow Down lands on something real rather than an inline text node.
    parentSel: parts.length > 1 ? parts.slice(0, -1).join(' > ') : null,
    childSel: (() => {
      let best = null; let bestArea = 0;
      for (const child of el.children) {
        const r = child.getBoundingClientRect();
        const area = r.width * r.height;
        if (area > bestArea) { bestArea = area; best = child; }
      }
      if (!best) return null;
      let piece = best.tagName.toLowerCase();
      if (best.id) piece += '#' + best.id;
      else if (typeof best.className === 'string' && best.className.trim()) {
        piece += '.' + best.className.trim().split(/\s+/).slice(0, 2).join('.');
      } else {
        const same = Array.prototype.filter.call(el.children, (c) => c.tagName === best.tagName);
        if (same.length > 1) piece += ':nth-of-type(' + (Array.prototype.indexOf.call(same, best) + 1) + ')';
      }
      return parts.join(' > ') + ' > ' + piece;
    })(),
    box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    style: {
      color: style.color,
      backgroundColor: style.backgroundColor,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      display: style.display,
      position: style.position,
    },
    attrs: (() => {
      const out = {};
      const keys = ['id','class','role','aria-label','aria-expanded','href','src','type','name','alt','title','placeholder'];
      for (const k of keys) {
        const v = k === 'class' ? (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) : el.getAttribute?.(k);
        if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 120);
      }
      return out;
    })(),
    ancestors: (() => {
      const chain = [];
      let node = el.parentElement;
      while (node && chain.length < 6) {
        const cls = typeof node.className === 'string' ? node.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
        chain.push((node.tagName || '').toLowerCase() + (cls ? '.' + cls : ''));
        node = node.parentElement;
      }
      return chain;
    })(),
    componentStack: ${STACK_SNIPPET},
  };
})()`

/**
 * @param {string} httpBase
 * @param {string} url
 */
export async function openPage(httpBase, url) {
  const target = pageUrl(url)
  return useLive(httpBase, async (client) => {
    const page = await pageHandle(client)
    await applyEmulation(client, page)
    const navigated = await client.send('Page.navigate', { url: target }, page.sessionId, NAVIGATE_MS)
    // A refused navigate (net::ERR_*) is a failure of the action the user
    // asked for, not an ok:true with a blank screenshot behind it.
    if (navigated.errorText) {
      throw new KitesurfError('kitesurf.navigate.failed', String(navigated.errorText).slice(0, 160))
    }
    await waitForPage(client, page)
    await waitForContent(client, page)
    const facts = await client.send('Runtime.evaluate', {
      expression: "(document.body && document.body.innerText || '').trim().slice(0, 160)",
      returnByValue: true,
    }, page.sessionId)
    const egress = egressFailure(facts.result?.value)
    if (egress) throw egress
    return { url: target, targetId: page.targetId, frameId: navigated.frameId ?? null }
  })
}

/**
 * Debug surface: the engine's live target list. An agent comparing the pane
 * with the engine can see whether it is attached to the expected page target,
 * and whether another socket opened an isolated page.
 */
export async function engineTargets(httpBase) {
  return useLive(httpBase, async (client) => {
    const listed = await client.send('Target.getTargets')
    const targets = Array.isArray(listed.targetInfos) ? listed.targetInfos : []
    return {
      count: targets.length,
      targets: targets.slice(0, 20).map((item) => ({
        targetId: String(item.targetId || '').slice(0, 80),
        type: String(item.type || '').slice(0, 20),
        url: String(item.url || '').slice(0, 200),
        title: String(item.title || '').slice(0, 120),
        attached: item.attached === true,
      })),
      attachedPage: client.page?.targetId || null,
    }
  })
}

/**
 * Debug surface: bounded JS evaluation in the engine page. This is the same
 * primitive a frontend debugger's console uses; returnByValue + a hard
 * length cap keep the response inspectable. Writes are allowed (that is what
 * "change the page and see it" means), so the route is session-bound L2.
 */
export async function evaluateInPage(httpBase, expression) {
  const text = typeof expression === 'string' ? expression.trim() : ''
  if (!text) throw new KitesurfError('kitesurf.evaluate.empty', 'expression is empty')
  if (text.length > 2000) throw new KitesurfError('kitesurf.evaluate.toolong', 'expression exceeds 2000 characters')
  return useLive(httpBase, async (client) => {
    const page = await pageHandle(client)
    const evaluated = await client.send('Runtime.evaluate', {
      expression: text,
      returnByValue: true,
      awaitPromise: true,
    }, page.sessionId)
    if (evaluated.exceptionDetails) {
      const detail = evaluated.exceptionDetails
      throw new KitesurfError('kitesurf.evaluate.exception',
        String(detail.exception?.description || detail.text || 'evaluation threw').slice(0, 240))
    }
    const remote = evaluated.result || {}
    let value = remote.value
    if (value === undefined) value = remote.description ?? null
    let serialized
    try { serialized = JSON.stringify(value) } catch { serialized = String(value) }
    if (serialized == null) serialized = 'null'
    return {
      type: String(remote.type || typeof value),
      value: serialized.slice(0, 4000),
      truncated: serialized.length > 4000,
    }
  })
}

/**
 * Browser chrome — real back/forward via the engine's navigationHistory,
 * not scroll-by-pixels wearing nav-button clothing. `delta` is -1|+1.
 * Returns the destination entry (or null when the move is a no-op) so the
 * pane can still refresh its shot either way.
 */
export async function navigateHistory(httpBase, delta) {
  const step = delta === -1 ? -1 : delta === 1 ? 1 : 0
  if (!step) throw new KitesurfError('kitesurf.navigate.delta', 'delta must be -1 or +1')
  return useLive(httpBase, async (client) => {
    const page = await pageHandle(client)
    const history = await client.send('Page.getNavigationHistory', {}, page.sessionId)
    const current = history.currentIndex
    const entries = Array.isArray(history.entries) ? history.entries : []
    const nextIndex = current + step
    const next = entries[nextIndex]
    if (!next || typeof next.id !== 'number') {
      return { moved: false, currentIndex: current, entries: entries.length }
    }
    await client.send('Page.navigateToHistoryEntry', { entryId: next.id }, page.sessionId, NAVIGATE_MS)
    await waitForPage(client, page)
    await waitForContent(client, page)
    return { moved: true, url: next.url, title: next.title || '', currentIndex: nextIndex, entries: entries.length }
  })
}

/**
 * Browser disguise / emulation. All fields are optional; `null` clears the
 * corresponding override. Viewport is no longer limited to three presets —
 * any bounded integer width/height is accepted, with a preset supplying the
 * default mobile flag and height when only width is given.
 * @param {string} httpBase
 * @param {{ userAgent?: string, viewport?: object|null, media?: string|null,
 *   extraHeaders?: object|null }} patch
 */
export async function setBrowserSettings(httpBase, patch) {
  const next = patch && typeof patch === 'object' ? patch : {}
  // Transactional: a failed engine call must not leave a "ghost setting" in
  // /status. Snapshot everything and roll back on any error.
  const before = { userAgent, media, viewport, extraHeaders, userAgentApplied, mediaApplied, viewportApplied, headersApplied }
  const rollback = () => {
    userAgent = before.userAgent; media = before.media; viewport = before.viewport; extraHeaders = before.extraHeaders
    userAgentApplied = before.userAgentApplied; mediaApplied = before.mediaApplied
    viewportApplied = before.viewportApplied; headersApplied = before.headersApplied
  }
  if (typeof next.userAgent === 'string') {
    if (next.userAgent.length > 400 || /[\r\n]/.test(next.userAgent)) {
      throw new KitesurfError('kitesurf.settings.userAgent', 'User-Agent 必须是一行，最长 400 个字符')
    }
    userAgent = next.userAgent.trim()
  }
  if (next.viewport === null) viewport = null
  else if (next.viewport && typeof next.viewport === 'object' && !Array.isArray(next.viewport)) {
    const width = Number(next.viewport.width)
    const height = Number(next.viewport.height ?? VIEWPORTS[width]?.height)
    const dsf = Number(next.viewport.deviceScaleFactor ?? 1)
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 320 || width > 3840 || height < 240 || height > 2160) {
      throw new KitesurfError('kitesurf.settings.viewport', '视口宽高必须是 320..3840 / 240..2160 的整数（或只给 width 用预设高度）')
    }
    if (![1, 2, 3].includes(dsf)) {
      throw new KitesurfError('kitesurf.settings.viewport', 'deviceScaleFactor 只能是 1、2 或 3')
    }
    const preset = VIEWPORTS[width]
    const mobile = typeof next.viewport.mobile === 'boolean' ? next.viewport.mobile : (preset?.mobile ?? false)
    viewport = { width, height, mobile, deviceScaleFactor: dsf }
  }
  if (next.media === null) media = null
  else if (next.media === 'screen' || next.media === 'print') media = next.media
  else if (next.media !== undefined) throw new KitesurfError('kitesurf.settings.media', 'media 只能是 screen、print 或 null')
  if (next.extraHeaders === null) extraHeaders = null
  else if (next.extraHeaders !== undefined) {
    if (!next.extraHeaders || typeof next.extraHeaders !== 'object' || Array.isArray(next.extraHeaders)) {
      throw new KitesurfError('kitesurf.settings.headers', 'extraHeaders 必须是对象或 null')
    }
    const entries = Object.entries(next.extraHeaders)
    if (entries.length > 20) throw new KitesurfError('kitesurf.settings.headers', 'extraHeaders 最多 20 项')
    const clean = {}
    for (const [key, value] of entries) {
      const lower = key.toLowerCase()
      if (!/^[a-z0-9-]{1,64}$/i.test(key) || FORBIDDEN_HEADERS.has(lower)) {
        throw new KitesurfError('kitesurf.settings.headers', `不允许的 header 名：${key}`)
      }
      if (typeof value !== 'string' || value.length > 200) {
        throw new KitesurfError('kitesurf.settings.headers', `header ${key} 的值必须是 ≤200 字符的字符串`)
      }
      clean[key] = value
    }
    extraHeaders = clean
  }
  try {
    await useLive(httpBase, async (client) => {
      const page = await pageHandle(client)
      await applyEmulation(client, page)
    })
  } catch (error) {
    rollback()
    throw error
  }
  return currentEmulation()
}

const PAGE_INFO_EXPRESSION = `JSON.stringify({ url: location.href, scrollX: Math.round(window.scrollX), scrollY: Math.round(window.scrollY) })`

async function pageInfo(client, page) {
  const evaluated = await client.send('Runtime.evaluate', {
    expression: PAGE_INFO_EXPRESSION,
    returnByValue: true,
  }, page.sessionId)
  try {
    return JSON.parse(evaluated.result?.value || '{}')
  } catch {
    return {}
  }
}

/** Screenshot encodings the engine supports, plus the default quality. */
const SHOT_FORMATS = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }
const SHOT_DEFAULT_QUALITY = 82

/**
 * A 1280x720 PNG of a text page is ~226 KB base64 — decoded on the main
 * thread for every refresh. WebP at q82 is typically 5-10x smaller and is
 * what the pane uses by default; png stays available for pixel work.
 */
export async function captureShot(httpBase, scrollY = 0, options = {}) {
  const format = SHOT_FORMATS[options.format] ? options.format : 'webp'
  const quality = Number.isFinite(Number(options.quality))
    ? Math.max(1, Math.min(Number(options.quality), 100))
    : SHOT_DEFAULT_QUALITY
  // fit: drive the engine viewport to the pane's own aspect ratio so the PNG
  // needs no letterbox at all. Without this a 1280x720 shot inside a 636x800
  // pane wastes ~55% of the frame on black bars.
  const fit = options.fit && typeof options.fit === 'object' ? options.fit : null
  const fitWidth = fit ? Math.round(Number(fit.width)) : null
  const fitHeight = fit ? Math.round(Number(fit.height)) : null
  const useFit = Number.isFinite(fitWidth) && Number.isFinite(fitHeight)
    && fitWidth >= 320 && fitWidth <= 3840 && fitHeight >= 240 && fitHeight <= 2160
  return useLive(httpBase, async (client) => {
    const page = await pageHandle(client)
    if (useFit) {
      viewport = { width: fitWidth, height: fitHeight, mobile: false, deviceScaleFactor: 1 }
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: fitWidth, height: fitHeight, deviceScaleFactor: 1, mobile: false,
      }, page.sessionId)
      viewportApplied = true
    }
    if (scrollY) {
      await client.send('Runtime.evaluate', {
        expression: `window.scrollBy(0, ${scrollY})`,
        returnByValue: true,
      }, page.sessionId)
    }
    const params = format === 'png' ? { format } : { format, quality }
    const shot = await client.send('Page.captureScreenshot', params, page.sessionId)
    if (typeof shot.data !== 'string' || shot.data.length === 0) {
      throw new KitesurfError('kitesurf.shot.empty', 'screenshot was empty')
    }
    // Page identity rides with every shot so the pane can compare a pick's
    // identity against the frame it's drawn over and notice drift.
    const info = await pageInfo(client, page)
    return {
      mimeType: SHOT_FORMATS[format],
      format,
      data: shot.data,
      targetId: page.targetId,
      url: typeof info.url === 'string' ? info.url : '',
      scrollX: typeof info.scrollX === 'number' ? info.scrollX : 0,
      scrollY: typeof info.scrollY === 'number' ? info.scrollY : 0,
      // Viewport is part of frame identity: emulating 390px changes the same
      // url/scroll into a different-looking page.
      viewport: currentViewport(),
    }
  })
}

/**
 * @param {string} httpBase
 * @param {number} x
 * @param {number} y
 */
/**
 * Same packet shape as a click pick, but the element is named by selector
 * rather than located by a point — parent/child navigation must return the
 * *named* element, not whatever sits on top of its center.
 */
const SELECTOR_PACKET_EXPRESSION = `(() => {
  const el = document.querySelector(__SELECTOR__);
  if (!el || el.nodeType !== 1) return null;
  const own = [];
  if (el.tagName !== 'HTML' && el.tagName !== 'BODY' && el.tagName !== 'IFRAME') {
    for (const child of el.childNodes) {
      if (child.nodeType === 3) own.push(child.textContent);
    }
  }
  let text = own.join('').replace(/\\s+/g, ' ').trim();
  if (!text && el.tagName !== 'HTML' && el.tagName !== 'BODY' && el.tagName !== 'IFRAME' && el.getBoundingClientRect().height <= 80) {
    text = String(el.innerText || '').replace(/\\s+/g, ' ').trim();
  }
  text = text.slice(0, 200);
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && parts.length < 8) {
    let piece = node.tagName.toLowerCase();
    if (node.id) piece += '#' + node.id;
    else if (typeof node.className === 'string' && node.className.trim()) {
      piece += '.' + node.className.trim().split(/\\s+/).slice(0, 2).join('.');
    } else if (node.parentElement) {
      const same = Array.prototype.filter.call(node.parentElement.children, (child) => child.tagName === node.tagName);
      if (same.length > 1) piece += ':nth-of-type(' + (Array.prototype.indexOf.call(same, node) + 1) + ')';
    }
    parts.unshift(piece);
    node = node.parentElement;
  }
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || '',
    className: typeof el.className === 'string' ? el.className : '',
    selector: parts.join(' > '),
    text,
    alt: String(el.getAttribute('alt') || '').slice(0, 80),
    src: (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'SOURCE')
      ? String(el.currentSrc || el.src || el.getAttribute('src') || '').slice(0, 120)
      : '',
    parentSel: parts.length > 1 ? parts.slice(0, -1).join(' > ') : null,
    childSel: (() => {
      let best = null; let bestArea = 0;
      for (const child of el.children) {
        const r = child.getBoundingClientRect();
        const area = r.width * r.height;
        if (area > bestArea) { bestArea = area; best = child; }
      }
      if (!best) return null;
      let piece = best.tagName.toLowerCase();
      if (best.id) piece += '#' + best.id;
      else if (typeof best.className === 'string' && best.className.trim()) {
        piece += '.' + best.className.trim().split(/\\s+/).slice(0, 2).join('.');
      } else {
        const same = Array.prototype.filter.call(el.children, (c) => c.tagName === best.tagName);
        if (same.length > 1) piece += ':nth-of-type(' + (Array.prototype.indexOf.call(same, best) + 1) + ')';
      }
      return parts.join(' > ') + ' > ' + piece;
    })(),
    box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    style: {
      color: style.color,
      backgroundColor: style.backgroundColor,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      display: style.display,
      position: style.position,
    },
    attrs: (() => {
      const out = {};
      const keys = ['id','class','role','aria-label','aria-expanded','href','src','type','name','alt','title','placeholder'];
      for (const k of keys) {
        const v = k === 'class' ? (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) : el.getAttribute?.(k);
        if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 120);
      }
      return out;
    })(),
    ancestors: (() => {
      const chain = [];
      let node = el.parentElement;
      while (node && chain.length < 6) {
        const cls = typeof node.className === 'string' ? node.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
        chain.push((node.tagName || '').toLowerCase() + (cls ? '.' + cls : ''));
        node = node.parentElement;
      }
      return chain;
    })(),
    componentStack: ${STACK_SNIPPET},
  };
})()`

/**
 * Re-derive a pick packet for an element the pane already identified by
 * selector (Arrow Up/Down parent/child navigation). Returns the *named*
 * element — a point-based pick would hit whatever sits on top of its center.
 */
export async function pickBySelector(httpBase, selector) {
  const clean = String(selector || '').slice(0, 320)
  if (!clean) throw new KitesurfError('kitesurf.pick.selector', 'selector required')
  return useLive(httpBase, async (client) => {
    const page = await pageHandle(client)
    const evaluated = await client.send('Runtime.evaluate', {
      expression: SELECTOR_PACKET_EXPRESSION.replace('__SELECTOR__', JSON.stringify(clean)),
      returnByValue: true,
    }, page.sessionId)
    const remote = evaluated.result ?? {}
    // A syntax error in the selector is an input fault (400), a valid-but-
    // unmatched selector is a miss (404) — neither is an engine fault (502).
    if (evaluated.exceptionDetails) {
      // Engine may report just "Uncaught" in .text — the real SyntaxError
      // description lives in .exception.description (Boa-in-WASM).
      const text = `${evaluated.exceptionDetails.text || ''} ${evaluated.exceptionDetails.exception?.description || ''}`
      if (/SyntaxError|not a valid selector/i.test(text)) {
        throw new KitesurfError('kitesurf.pick.selector', 'invalid selector syntax')
      }
      throw new KitesurfError('kitesurf.pick.failed', 'selector probe failed')
    }
    if (remote.value == null) {
      throw new KitesurfError('kitesurf.pick.miss', 'selector matched nothing')
    }
    const packet = elementPacket(remote.value)
    const info = await pageInfo(client, page)
    return {
      point: null,
      targetId: page.targetId,
      url: typeof info.url === 'string' ? info.url : '',
      scrollY: typeof info.scrollY === 'number' ? info.scrollY : 0,
      viewport: currentViewport(),
      element: packet,
      elements: [packet],
    }
  })
}

const EDIT_EXPRESSION = `(() => {
  const el = document.querySelector(__SELECTOR__);
  if (!el || el.nodeType !== 1) return { missing: true };
  const text = __TEXT__;
  if (el.childElementCount === 0) {
    el.textContent = text;
  } else {
    el.innerText = text;
  }
  const r = el.getBoundingClientRect();
  return { ok: true, box: { x: r.x, y: r.y, width: r.width, height: r.height } };
})()`

/**
 * Double-click live text edit: set the element's text content in place.
 * Leaf nodes get textContent (safer — wipes nested markup cleanly); richer
 * nodes get innerText so layout-preserving children survive. Returns the
 * element's post-edit box so the client can keep its overlay honest.
 */
export async function editElement(httpBase, selector, text) {
  const clean = String(selector || '').slice(0, 320)
  if (!clean) throw new KitesurfError('kitesurf.edit.selector', 'selector required')
  const body = String(text ?? '').slice(0, 4000)
  return useLive(httpBase, async (client) => {
    const page = await pageHandle(client)
    const evaluated = await client.send('Runtime.evaluate', {
      expression: EDIT_EXPRESSION
        .replace('__SELECTOR__', JSON.stringify(clean))
        .replace('__TEXT__', JSON.stringify(body)),
      returnByValue: true,
    }, page.sessionId)
    const result = evaluated.result?.value
    if (!result || result.missing === true || evaluated.exceptionDetails) {
      throw new KitesurfError('kitesurf.edit.miss', 'selector matched nothing')
    }
    return { ok: true, box: result.box || null }
  })
}

export async function pickElement(httpBase, x, y) {
  const point = pickPoint({ x, y })
  return useLive(httpBase, async (client) => {
    const page = await pageHandle(client)
    const expression = PACKET_EXPRESSION
      .replace('__X__', String(point.x))
      .replace('__Y__', String(point.y))
    const evaluated = await client.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    }, page.sessionId)
    const remote = evaluated.result ?? {}
    if (remote.subtype === 'error' || evaluated.exceptionDetails) {
      throw new KitesurfError('kitesurf.pick.failed', String(evaluated.exceptionDetails?.text || 'element probe failed').slice(0, 160))
    }
    // elementFromPoint hit nothing (point outside drawn content / no element)
    // — an input-side miss, not a success with an empty packet that would
    // poison lastPick.
    if (remote.value == null) {
      throw new KitesurfError('kitesurf.pick.miss', 'no element at point')
    }
    const packet = elementPacket(remote.value)
    const info = await pageInfo(client, page)
    return {
      point,
      targetId: page.targetId,
      url: typeof info.url === 'string' ? info.url : '',
      scrollY: typeof info.scrollY === 'number' ? info.scrollY : 0,
      viewport: currentViewport(),
      element: packet,
      // Multi-select notes read this list; single picks put one element here.
      elements: [packet],
    }
  })
}


/** Live DOM of the engine page — the source for native-HTML rendering. */
export async function captureDom(httpBase) {
  return useLive(httpBase, async (client) => {
    const page = await pageHandle(client)
    const evaluated = await client.send('Runtime.evaluate', {
      expression: "JSON.stringify({ url: location.href, html: document.documentElement.outerHTML })",
      returnByValue: true,
    }, page.sessionId)
    const raw = evaluated.result?.value
    if (typeof raw !== 'string' || !raw) {
      throw new KitesurfError('kitesurf.dom.empty', 'no document to read')
    }
    let parsed
    try { parsed = JSON.parse(raw) } catch { throw new KitesurfError('kitesurf.dom.empty', 'document was not serializable') }
    if (parsed.url === 'about:blank') throw new KitesurfError('kitesurf.dom.blank', 'page is about:blank')
    return { url: String(parsed.url || ''), html: String(parsed.html || ''), bytes: raw.length }
  })
}
