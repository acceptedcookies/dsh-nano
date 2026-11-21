/** Per-session CDP reader. The socket hangs off the session object, not a module global. */
import { errorCode } from './error-catalog.js'
import { WebSocket as NodeWebSocket } from 'ws'

/**
 * The page-level session is cached on the client: this pin's TargetInfo rows
 * do not echo an existing sessionId, so every call used to re-attach and leak
 * a session per command. sessionId is connection-scoped, so the cache dies
 * with the socket — resetClient/new client start empty again.
 */
export async function withPage(client, fn) {
  if (client.pageSessionId) return fn(client.pageSessionId)
  // Single-flight the attach: two concurrent first calls would each create a
  // session and the loser leaks one the engine still bills to this socket.
  client.attachFlight = client.attachFlight || (async () => {
    const targets = await client.send('Target.getTargets')
    const page = (targets.targetInfos || []).find((row) => row.type === 'page')
    if (!page) {
      const error = new Error('no document')
      error.status = 502
      error.errorId = errorCode('elements.empty')
      throw error
    }
    const attached = page.sessionId
      ? { sessionId: page.sessionId }
      : await client.send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
    client.pageSessionId = attached.sessionId
    client.pageTargetId = page.targetId
    // Page.enable at ATTACH time, not first navigation: frameNavigated must
    // reach this socket even when the agent over the relay navigates first —
    // otherwise stale @N refs survive into a document they weren't minted on.
    try { await client.send('Page.enable', {}, attached.sessionId) } catch { /* best effort */ }
    return attached.sessionId
  })().finally(() => { client.attachFlight = null })
  const sessionId = await client.attachFlight
  return fn(sessionId)
}

export async function evaluatePage(client, expression) {
  return withPage(client, async (sessionId) => {
    const result = await client.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    }, sessionId)
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails
      const error = new Error(String(detail.exception?.description || detail.text || 'evaluate failed').slice(0, 240))
      error.status = 400
      error.errorId = errorCode('evaluate.exception')
      throw error
    }
    return result.result?.value
  })
}

export async function readElements(client, options = {}) {
  const targets = await client.send('Target.getTargets')
  const page = (targets.targetInfos || []).find((row) => row.type === 'page')
  if (!page) {
    const error = new Error('no document')
    error.status = 502
    error.errorId = errorCode('elements.empty')
    throw error
  }
  const attached = page.sessionId
    ? { sessionId: page.sessionId }
    : await client.send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
  const sessionId = attached.sessionId
  await client.send('DOM.enable', {}, sessionId)
  await client.send('CSS.enable', {}, sessionId)
  const depth = Math.max(1, Math.min(Number(options.depth) || 4, 8))
  const doc = await client.send('DOM.getDocument', { depth, pierce: false }, sessionId)
  const root = doc.root
  if (!root) {
    const error = new Error('no document')
    error.status = 502
    error.errorId = errorCode('elements.empty')
    throw error
  }
  const nodes = []
  const flatten = (node, level) => {
    if (!node || nodes.length >= 220) return
    const attrs = Array.isArray(node.attributes) ? node.attributes : []
    const attrOf = (name) => { const at = attrs.indexOf(name); return at >= 0 ? attrs[at + 1] : undefined }
    nodes.push({
      nodeId: node.nodeId,
      level,
      tag: String(node.localName || node.nodeName || '').toLowerCase(),
      // id/cls/children count are the precision handles the Elements panel
      // searches by; a bare tag list was the audit's "no evidence" gap.
      ...(attrOf('id') ? { id: String(attrOf('id')).slice(0, 80) } : {}),
      ...(attrOf('class') ? { cls: String(attrOf('class')).slice(0, 120) } : {}),
      childCount: (node.children || []).length,
    })
    for (const child of node.children || []) flatten(child, level + 1)
  }
  flatten(root, 0)
  let matched = null
  let computed = null
  const selector = typeof options.selector === 'string' ? options.selector.trim() : ''
  if (selector) {
    const found = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector }, sessionId)
    const nodeId = Number(found.nodeId) || 0
    if (nodeId) {
      const rules = await client.send('CSS.getMatchedStylesForNode', { nodeId }, sessionId)
      matched = {
        matched: (rules.matchedCSSRules || []).slice(0, 40).map((row) => ({
          selector: (row.rule?.selectorList?.selectors || []).map((item) => item.text).join(', '),
        })),
      }
      const styles = await client.send('CSS.getComputedStyleForNode', { nodeId }, sessionId)
      computed = {}
      for (const row of (styles.computedStyle || []).slice(0, 80)) computed[row.name] = row.value
    }
  }
  return { depth, count: nodes.length, nodes, selector, matched, computed }
}

const navigationFlights = new WeakMap()
const NAVIGATION_METHODS = new Set(['Page.navigate', 'Page.navigateToHistoryEntry'])

/**
 * The observable navigation ledger: what the pane should show instead of a
 * bare local timer. `outcome` is settled once per intent; a timed-out caller
 * leaves the intent 'in-flight' until the engine answers or the socket dies,
 * because Page.stopLoading is a no-op at this pin — a timeout is NOT a cancel.
 */
export function navigationLedger(session) {
  return session.navigation || null
}

/** Explicit navigations for one page must not race each other or be retried. */
export function navigate(session, httpBase, url, connect = connectCdp, options = {}) {
  session.navigation = {
    intent: url,
    sinceMs: Date.now(),
    outcome: 'in-flight',
    timedOut: false,
    generation: (session.navigation?.generation || 0) + 1,
  }
  return queueNavigation(session, () => navigateOnce(session, httpBase, url, connect, options.isCancelled || (() => false), options.hooks || {}), options)
    .then((value) => {
      if (session.navigation?.intent === url) session.navigation = { ...session.navigation, outcome: 'committed', url: value?.url ?? url, settledAt: new Date().toISOString(), ms: Math.max(0, Date.now() - (session.navigation.sinceMs || Date.now())) }
      return value
    })
    .catch((error) => {
      if (session.navigation?.intent === url) {
        session.navigation = { ...session.navigation, outcome: /timed out/i.test(error?.message || '') ? 'in-flight' : 'failed', timedOut: /timed out/i.test(error?.message || ''), errorId: error?.errorId || errorCode('navigate.failed'), settledAt: new Date().toISOString(), ms: Math.max(0, Date.now() - (session.navigation.sinceMs || Date.now())), error: String(error?.message || '').slice(0, 240) }
      }
      throw error
    })
}

export function queueNavigation(session, work, { isCancelled = () => false } = {}) {
  const previous = navigationFlights.get(session)
  const flight = (previous ? previous.catch(() => {}) : Promise.resolve())
    .then(() => {
      assertNavigationActive(isCancelled)
      return work()
    })
    .finally(() => {
      if (navigationFlights.get(session) === flight) navigationFlights.delete(session)
    })
  navigationFlights.set(session, flight)
  return flight
}

function assertNavigationActive(isCancelled) {
  if (isCancelled()) throw Object.assign(new Error('Navigation request was cancelled'), { errorId: errorCode('navigate.failed'), status: 502 })
}

async function navigateOnce(session, httpBase, url, connect, isCancelled, hooks = {}) {
  const client = await ensureClient(session, httpBase, connect)
  const targets = await client.send('Target.getTargets')
  const page = (targets.targetInfos || []).find((row) => row.type === 'page')
  if (!page) {
    const error = new Error('no document')
    error.status = 502
    error.errorId = errorCode('elements.empty')
    throw error
  }
  // Reuse the page session across navigations: the pinned engine lists no
  // sessionId on getTargets, so re-attaching on every /open piled up sessions
  // on the same target — one per navigation, forever.
  let sessionId = client.pageSessionId
  if (!sessionId || client.pageTargetId !== page.targetId) {
    const attached = page.sessionId
      ? { sessionId: page.sessionId }
      : await client.send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
    sessionId = attached.sessionId
    client.pageSessionId = sessionId
    client.pageTargetId = page.targetId
  }
  await client.send('Page.enable', {}, sessionId)
  // Driver-owned settings replay on the attached page; never patch the pin
  // or silently claim an override succeeded when its CDP call failed. The
  // pre-navigation script (locale/geo/media shims) is refreshed HERE so the
  // page's first script already sees the override.
  if (typeof hooks.applySettings === 'function') await hooks.applySettings(session, client, sessionId)
  // Cancelling a queued HTTP request must not navigate later. Once sent,
  // however, a CDP navigation is left to finish on its existing connection.
  assertNavigationActive(isCancelled)
  // Driver-level navigation parameters are applied by the profile driver; the
  // kernel only knows that a URL may be decorated before it is sent.
  const navigateUrl = typeof hooks.decorateUrl === 'function' ? hooks.decorateUrl(url, session) : url
  const result = await client.send('Page.navigate', { url: navigateUrl }, sessionId)
  if (result.errorText) {
    const error = new Error(String(result.errorText).slice(0, 240))
    error.status = /egress.*timeout|timed out/i.test(String(result.errorText)) ? 504 : 502
    // The engine reports site-side egress failure in-band; give it the
    // documented navigate.egress id instead of flattening to failed.
    error.errorId = /egress/i.test(String(result.errorText)) ? errorCode('navigate.egress') : errorCode('navigate.failed')
    throw error
  }
  // Page.navigate replying is not arrival: a dead JS entry can leave a
  // non-blank shell. Verify the document the page actually committed to and
  // report its truth — never a fabricated success off errorText alone.
  const observed = await client.send('Runtime.evaluate', {
    expression: '(()=>({url:location.href,title:document.title,readyState:document.readyState,root:!!document.documentElement,bodyBytes:(document.body&&document.body.innerText||"").length,bodyText:(document.body&&document.body.innerText||"").slice(0,300)}))()',
    returnByValue: true,
  }, sessionId)
  const landed = observed?.result?.value || null
  if (landed) session.lastArrival = landed
  // A refused/errored egress hop may still commit a synthetic text document —
  // Page.navigate answers cleanly and the URL is the target's, so a bare
  // ok:true would be a lie. The engine-specific markers (blocked-response
  // header, refusal body prefix) live in the driver; the kernel only calls the
  // hook and maps a detected refusal to navigate.egress/failed.
  const blockedReason = typeof hooks.blockedDocument === 'function'
    ? hooks.blockedDocument({ session, landed, url, network: session?.network })
    : null
  if (blockedReason) {
    const error = new Error(`navigation committed a blocked document (${blockedReason}): ${String(landed?.bodyText || '').slice(0, 160)}`)
    error.status = /timeout/i.test(blockedReason) ? 504 : 502
    error.errorId = /egress-timeout/i.test(blockedReason) ? errorCode('navigate.egress') : errorCode('navigate.failed')
    error.blockedReason = blockedReason
    throw error
  }
  // JS overrides also run in the committed document for the CURRENT page;
  // the pre-nav script already covered the first scripts of the new document.
  if (typeof hooks.applySettings === 'function') {
    try { await hooks.applySettings(session, client, sessionId) } catch { /* best effort on the live doc */ }
  }
  return { ok: true, url: landed?.url || url }
}

/** A slow command is not a dead transport: navigation and capture do real work. */
export const CDP_TIMEOUTS = Object.freeze({ connect: 4000, call: 20000, navigate: 45000, screenshot: 30000 })
/** An idle probe can time out without invalidating the page-owning socket. */
const PROBE_TIMEOUT_MS = 1500
const PROBE_EVERY_MS = 25000
const clientFlights = new WeakMap()

/**
 * Drop the cached CDP client. The socket carries the page session, so callers
 * must only reset when the socket is known dead — a healthy reset would strand
 * the live page.
 */
export function resetClient(session) {
  const client = session?.cdp
  session.cdp = null
  session.cdpGeneration = (session.cdpGeneration || 0) + 1
  session.network = session.network || []
  session.network.push({ gap: true, at: new Date().toISOString(), generation: session.cdpGeneration })
  try { client?.close?.() } catch { /* already gone */ }
}

/**
 * Probe only idle sockets. A busy engine can queue Browser.getVersion behind a
 * navigation, so a missed deadline is not evidence that its socket died.
 * Only the transport's close/error handlers invalidate an existing client.
 */
async function clientUsable(client) {
  if (!client || client.alive === false) return false
  if (client.navigating || Date.now() - (client.probedAt || 0) < PROBE_EVERY_MS) return true
  client.probedAt = Date.now()
  try {
    await client.send('Browser.getVersion', {}, undefined, PROBE_TIMEOUT_MS)
  } catch { /* a busy engine is still the owner of the live page */ }
  return client.alive !== false
}

function networkStartedAt(params) {
  const wall = Number(params.wallTime)
  return Number.isFinite(wall) && wall > 0 ? Math.round(wall * 1000) : Date.now()
}

function networkRow(session, requestId) {
  return [...(session.network || [])].reverse().find((item) => item && item.id === requestId)
}

function networkElapsed(row, timestamp) {
  const end = Number(timestamp)
  if (Number.isFinite(end) && Number.isFinite(row.timestamp)) {
    return Math.max(0, Math.round((end - row.timestamp) * 1000))
  }
  return Math.max(0, Date.now() - row.startedAt)
}

/**
 * Normalize the CDP network lifecycle into the driver's ring. The engine
 * reports type/wallTime/encodedDataLength/timestamp; the pane needs all four
 * to draw a truthful type, size, duration and waterfall. `Network.enable` is
 * scoped to the page session; these events already arrive on this socket.
 */
function networkHeaders(value) {
  if (!value || typeof value !== 'object') return {}
  const out = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof key !== 'string') continue
    if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') out[key] = String(entry)
  }
  return out
}

/**
 * Per-call CDP round-trip ring (cap 64). One data point per send() answers
 * "which CDP call was slow" — the missing segment between REST duration and
 * page work. `via` is relay|direct so relay hop cost is separable.
 */
function recordCdpCall(client, method, startedMs, outcome) {
  const session = client?.__session
  if (!session) return
  session.cdpCalls = session.cdpCalls || []
  session.cdpCalls.push({ method, ms: Math.max(0, Math.round(performance.now() - startedMs)), outcome, via: client?.via || null, at: new Date().toISOString() })
  if (session.cdpCalls.length > 64) session.cdpCalls.shift()
}

function networkPayload(value) {
  return typeof value === 'string' ? value.slice(0, 20000) : ''
}

export function recordNetworkEvent(session, message) {
  const params = message?.params || {}
  const id = String(params.requestId || '')
  if (!id) return
  session.network = session.network || []
  if (message.method === 'Network.requestWillBeSent') {
    const startedAt = networkStartedAt(params)
    const existing = networkRow(session, id)
    if (existing && params.redirectResponse) {
      // A redirect reuses the requestId. Keep one visible row, but reflect the
      // redirect status and restart the timing at the final request.
      existing.status = Number(params.redirectResponse.status) || existing.status
      existing.mimeType = String(params.redirectResponse.mimeType || existing.mimeType || '')
      existing.redirectCount = (existing.redirectCount || 0) + 1
    }
    if (existing && !params.redirectResponse) return
    if (existing) {
      existing.url = String(params.request?.url || existing.url || '')
      existing.method = String(params.request?.method || existing.method || 'GET')
      existing.type = String(params.type || existing.type || 'Other')
      existing.startedAt = startedAt
      existing.at = new Date(startedAt).toISOString()
      existing.timestamp = Number(params.timestamp) || null
      existing.status = null
      existing.statusText = ''
      existing.mimeType = ''
      existing.size = null
      existing.durationMs = null
      existing.failed = false
      existing.error = ''
      existing.requestHeaders = networkHeaders(params.request?.headers)
      existing.postData = networkPayload(params.request?.postData)
      existing.hasPostData = params.request?.hasPostData === true || Boolean(params.request?.postData)
      existing.requestMimeType = String(params.request?.mimeType || '').slice(0, 120)
      existing.responseHeaders = {}
      existing.protocol = ''
      existing.remoteAddress = ''
      return
    }
    session.network.push({
      id,
      url: String(params.request?.url || '').slice(0, 1200),
      method: String(params.request?.method || 'GET').slice(0, 16),
      type: String(params.type || 'Other').slice(0, 32),
      at: new Date(startedAt).toISOString(),
      startedAt,
      updatedAt: Date.now(),
      timestamp: Number(params.timestamp) || null,
      status: null,
      mimeType: '',
      size: null,
      durationMs: null,
      failed: false,
      error: '',
      cached: false,
      requestHeaders: networkHeaders(params.request?.headers),
      postData: networkPayload(params.request?.postData),
      hasPostData: params.request?.hasPostData === true || Boolean(params.request?.postData),
      requestMimeType: String(params.request?.mimeType || '').slice(0, 120),
      responseHeaders: {},
      statusText: '',
      protocol: '',
      remoteAddress: '',
    })
    if (session.network.length > 200) session.network.shift()
    return
  }
  const row = networkRow(session, id)
  if (!row) return
  // Every mutation moves updatedAt: the incremental feed keys off this, not
  // startedAt, or a pending→failed transition would never reach the pane.
  const touch = () => { row.updatedAt = Date.now() }
  if (message.method === 'Network.requestWillBeSentExtraInfo') {
    row.requestHeaders = { ...row.requestHeaders, ...networkHeaders(params.headers) }
    touch()
    return
  }
  if (message.method === 'Network.responseReceivedExtraInfo') {
    row.responseHeaders = { ...row.responseHeaders, ...networkHeaders(params.headers) }
    if (Number(params.statusCode)) row.status = Number(params.statusCode)
    touch()
    return
  }
  if (message.method === 'Network.responseReceived') {
    row.status = Number(params.response?.status) || 0
    row.statusText = String(params.response?.statusText || '').slice(0, 120)
    row.mimeType = String(params.response?.mimeType || '').slice(0, 120)
    row.type = String(params.type || row.type || 'Other')
    row.responseHeaders = { ...row.responseHeaders, ...networkHeaders(params.response?.headers) }
    row.protocol = String(params.response?.protocol || '').slice(0, 40)
    const remote = params.response?.remoteIPAddress
    row.remoteAddress = remote ? `${remote}${params.response.remotePort ? ':' + params.response.remotePort : ''}` : ''
    if (params.response?.fromDiskCache || params.response?.fromServiceWorker) row.cached = true
    touch()
    return
  }
  if (message.method === 'Network.requestServedFromCache') {
    row.cached = true
    touch()
    return
  }
  if (message.method === 'Network.loadingFinished') {
    const size = Number(params.encodedDataLength)
    if (Number.isFinite(size) && size >= 0) row.size = size
    row.durationMs = networkElapsed(row, params.timestamp)
    touch()
    return
  }
  if (message.method === 'Network.loadingFailed') {
    row.failed = true
    row.error = String(params.errorText || 'failed').slice(0, 200)
    row.durationMs = networkElapsed(row, params.timestamp)
    touch()
  }
}

export function ensureClient(session, httpBase, connect = connectCdp) {
  const active = clientFlights.get(session)
  if (active) return active
  // Defer the body until the flight is published: even a synchronous opener
  // must not let a concurrent call create a second, isolated browser page.
  const flight = Promise.resolve().then(() => acquireClient(session, httpBase, connect)).finally(() => {
    if (clientFlights.get(session) === flight) clientFlights.delete(session)
  })
  clientFlights.set(session, flight)
  return flight
}

async function acquireClient(session, httpBase, connect) {
  const cached = session.cdp
  if (cached && await clientUsable(cached)) return cached
  if (session.cdp) resetClient(session)
  session.console = session.console || []
  session.network = session.network || []
  if (connect === connectCdp && !session.bridgeBase) throw new Error('verified CDP bridge publication unavailable')
  const client = connect === connectCdp
    ? await connect(httpBase, { relayUrl: `${session.bridgeBase.replace(/^http/, 'ws')}/cdp`, relayToken: session.relayToken || undefined })
    : await connect(httpBase, {})
  client.__session = session
  session.cdp = client
  client.probedAt = Date.now()
  if (typeof client.listen === 'function') {
    client.listen((message) => {
      const params = message.params || {}
      // Page detach kills the cached page session — withPage's next call must
      // re-attach instead of silently writing to a dead sessionId.
      if (message.method === 'Target.detachedFromTarget' || message.method === 'Inspector.detached') {
        const detached = params.sessionId
        if (detached && detached === client.pageSessionId) { client.pageSessionId = null; client.pageTargetId = null }
        return
      }
      // Relay mux broadcasts every shared-page event to every client. The host
      // only records ITS page-session's events — an agent's attach would
      // otherwise double every console/network row.
      if (client.pageSessionId && message.sessionId && message.sessionId !== client.pageSessionId) {
        // Browser-domain events (no sessionId) and our own session pass;
        // foreign session rows are dropped here.
        return
      }
      const pushConsole = (level, text, extra = {}) => {
        session.consoleSeq = (session.consoleSeq || 0) + 1
        session.console.push({
          seq: session.consoleSeq,
          level,
          text: String(text ?? '').slice(0, 400),
          source: extra.source || '',
          url: String(extra.url || params.stackTrace?.callFrames?.[0]?.url || '').slice(0, 600),
          at: new Date().toISOString(),
        })
        if (session.console.length > 400) session.console.shift()
      }
      if (message.method === 'Runtime.consoleAPICalled') {
        const text = (params.args || []).map((arg) => arg.value ?? arg.description ?? '').join(' ')
        const rawLevel = String(params.type || 'log').toLowerCase()
        const level = rawLevel === 'warning' ? 'warn' : rawLevel
        pushConsole(level, text, { source: 'console' })
      } else if (message.method === 'Runtime.exceptionThrown') {
        const detail = params.exceptionDetails || {}
        const text = detail.exception?.description || detail.text || 'uncaught exception'
        pushConsole('exception', text, { source: 'exception', url: detail.url || '' })
      } else if (message.method === 'Log.entryAdded') {
        const entry = params.entry || {}
        pushConsole(String(entry.level || 'info').toLowerCase(), entry.text || '', { source: entry.source || 'log', url: entry.url || '' })
      } else if (message.method === 'Page.frameNavigated' && !params.frame?.parentId) {
        // A main-frame commit replaces the document — whether it came from
        // /open, /history, an SPA pushState, or the agent over the relay. The
        // @N table is page-generation-scoped: drop it here so a stale handle
        // can never write into a different document.
        session.pageGen = (session.pageGen || 0) + 1
        session.refs = {}
        session.lastSnapshot = null
        if (params.frame?.url && params.frame.url !== 'about:blank') session.pageUrl = params.frame.url
        // Navigation drift is a first-class console level: GET /console?level=
        // navigation shows every committed document hop without the noise of
        // log/error rows — the skill's playbook already names this level.
        pushConsole('navigation', `→ ${params.frame?.url || 'about:blank'}`, { source: 'navigation', url: params.frame?.url || '' })
      }
      recordNetworkEvent(session, message)
    })
  }
  // A late reply to Page.navigate still settles the intent — the caller's
  // deadline expired but the engine finished. 'in-flight' must not stay the
  // pane's forever-state.
  client.onLateNavigation = (message, lateIntent) => {
    const nav = session.navigation
    if (!nav || nav.outcome === 'committed' || nav.outcome === 'failed') return
    // A late reply settles only the intent it was issued for. Sequence beats
    // substring: intent A='example.com/' timeout + B='example.com/page2' makes
    // a prefix match settle A against B's page — wrong. Exact match or, when
    // the intents differ, only a reply whose seq IS the ledger's wins.
    const sent = String(lateIntent ?? '')
    const want = String(nav.intent ?? '')
    if (sent && want && sent !== want && !(sent.includes(want + '?') || sent.includes(want + '&'))) return
    // Page.navigate's engine-level failure travels in result.errorText — a
    // protocol-clean reply carrying it must NOT settle as committed.
    const failed = Boolean(message?.error) || Boolean(message?.result?.errorText)
    session.navigation = {
      ...nav,
      outcome: failed ? 'failed' : 'committed',
      errorId: failed ? (message?.error?.errorId || errorCode('navigate.failed')) : nav.errorId,
      error: message?.result?.errorText || message?.error?.message || nav.error,
      settledAt: new Date().toISOString(),
      ms: Math.max(0, Date.now() - (nav.sinceMs || Date.now())),
    }
  }
  try {
    // Bodies are not retained at the engine's zero default; ask for a bounded
    // buffer so the request detail panel can show a real Response tab.
    await client.send('Network.enable', { maxTotalBufferSize: 8 * 1024 * 1024, maxResourceBufferSize: 2 * 1024 * 1024 })
    await client.send('Runtime.enable')
    // Log domain surfaces browser-side failures (module fetch, CSP) the page
    // Runtime never raises as consoleAPICalled.
    await client.send('Log.enable')
  } catch { /* page-session events still arrive after a later enable */ }
  return client
}

/** Optional transport and budgets are a local test seam, not an HTTP setting. */
export function connectCdp(httpBase, { WebSocket: Socket = globalThis.WebSocket, timeouts = {}, relayUrl, relayToken } = {}) {
  const budgets = { ...CDP_TIMEOUTS, ...timeouts }
  // A failed shared-page relay must not silently open a different page.
  const direct = `${String(httpBase).replace(/^http/, 'ws')}/devtools/browser`
  return openSocket(relayUrl || direct, relayUrl ? 'relay' : 'direct')

  function openSocket(wsUrl, via) {
    // T-O-63: the host proves itself to the bridge with the current
    // generation credential at the relay handshake. A requested subprotocol
    // must be selected by the 101, and the bridge deliberately echoes none,
    // so the production transport presents the token as a request header via
    // `ws`. Injected sockets (tests, fixtures) keep the subprotocol seam.
    const production = Socket === globalThis.WebSocket
    const ws = relayToken
      ? (production
        ? new NodeWebSocket(wsUrl, [], { headers: { 'x-dnls-relay-credential': relayToken } })
        : new Socket(wsUrl, [`dnls-relay.${relayToken}`]))
      : new Socket(wsUrl)
  let next = 1
  const navigations = new Set()
  const navIntents = new Map() // command id -> url the caller asked for
  let navigatingSince = 0
  const pending = new Map()
  const listeners = new Set()
  const rejectPending = (reason) => {
    for (const [, settle] of pending) settle.reject(new Error(reason))
    pending.clear()
    navigations.clear()
  }
  ws.addEventListener('message', (event) => {
    let message
    try { message = JSON.parse(String(event.data)) } catch { return }
    // A late navigation reply still proves the engine finished that command,
    // even when its caller's deadline has already expired. Tell the ledger —
    // 'in-flight' must not stay the pane's forever-state once the engine has
    // actually answered.
    if (navigations.delete(message.id)) {
      const lateIntent = navIntents.get(message.id)
      navIntents.delete(message.id)
      if (navigations.size === 0) navigatingSince = 0
      if (typeof client?.onLateNavigation === 'function' && !pending.has(message.id)) {
        try { client.onLateNavigation(message, lateIntent) } catch { /* ledger is best-effort */ }
      }
    }
    if (typeof message.id === 'number' && pending.has(message.id)) {
      const settle = pending.get(message.id)
      pending.delete(message.id)
      settle.resolve(message)
      return
    }
    if (message.method) {
      for (const listener of listeners) listener(message)
    }
  })
  // A close/error event flips `alive`, so the next ensureClient() reconnects
  // instead of writing into a dead pipe.
  ws.addEventListener('close', () => { client.alive = false; rejectPending('cdp socket closed') })
  ws.addEventListener('error', () => { client.alive = false; rejectPending('cdp socket error') })
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('cdp connect timeout'))
      try { ws.close() } catch { /* never opened */ }
    }, budgets.connect)
    ws.addEventListener('open', () => { clearTimeout(timer); resolve() }, { once: true })
    ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('cdp connect failed')) }, { once: true })
    ws.addEventListener('close', () => { clearTimeout(timer); reject(new Error('cdp socket closed')) }, { once: true })
  })
  const client = {
    alive: true,
    probedAt: 0,
    via,
    pageSessionId: null,
    get navigating() { return navigations.size > 0 },
    get navigatingSince() { return navigatingSince },
    send(method, params = {}, sessionId, timeoutMs = NAVIGATION_METHODS.has(method) ? budgets.navigate : method === 'Page.captureScreenshot' ? budgets.screenshot : budgets.call) {
      if (!client.alive) return Promise.reject(new Error('cdp socket closed'))
      const id = next
      next += 1
      const frame = { id, method, params }
      if (sessionId) frame.sessionId = sessionId
      if (NAVIGATION_METHODS.has(method)) {
        navigations.add(id)
        navigatingSince = Date.now()
        // Record the intent per in-flight id so a LATE reply can be matched to
        // the navigation it actually answers — an A-reply must not settle B.
        navIntents.set(id, params?.url || params?.entryId || null)
      }
      const startedMs = performance.now()
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          recordCdpCall(client, method, startedMs, 'timeout')
          // The engine may still finish this work. A deadline is neither a
          // transport failure nor permission to close its page-owning socket;
          // Page.stopLoading is a no-op at this pin, so nothing was cancelled.
          reject(new Error(`${method} timed out (engine still executing)`))
        }, timeoutMs)
        pending.set(id, {
          resolve: (message) => {
            clearTimeout(timer)
            recordCdpCall(client, method, startedMs, message.error ? 'error' : 'ok')
            if (message.error) reject(new Error(message.error.message || method))
            else resolve(message.result ?? {})
          },
          reject: (error) => { clearTimeout(timer); recordCdpCall(client, method, startedMs, 'error'); reject(error) },
        })
        try { ws.send(JSON.stringify(frame)) } catch (error) {
          clearTimeout(timer)
          pending.delete(id)
          navigations.delete(id)
          reject(error)
        }
      })
    },
    listen(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    close() {
      client.alive = false
      try { ws.close() } catch { /* already closed */ }
    },
  }
  return ready.then(() => client)
  }
}
