/** Per-session CDP reader. The socket hangs off the session object, not a module global. */
import { applyBrowserSettingsToPage } from './browser-settings-adapter.js'

export async function withPage(client, fn) {
  const targets = await client.send('Target.getTargets')
  const page = (targets.targetInfos || []).find((row) => row.type === 'page')
  if (!page) {
    const error = new Error('no document')
    error.status = 502
    error.errorId = 'kitesurf.elements.empty'
    throw error
  }
  const attached = page.sessionId
    ? { sessionId: page.sessionId }
    : await client.send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
  return fn(attached.sessionId)
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
      error.errorId = 'kitesurf.evaluate.exception'
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
    error.errorId = 'kitesurf.elements.empty'
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
    error.errorId = 'kitesurf.elements.empty'
    throw error
  }
  const nodes = []
  const flatten = (node, level) => {
    if (!node || nodes.length >= 220) return
    nodes.push({ nodeId: node.nodeId, level, tag: String(node.localName || node.nodeName || '').toLowerCase() })
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

/** Explicit navigations for one page must not race each other or be retried. */
export function navigate(session, httpBase, url, connect = connectCdp, options = {}) {
  return queueNavigation(session, () => navigateOnce(session, httpBase, url, connect, options.isCancelled || (() => false)), options)
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
  if (isCancelled()) throw Object.assign(new Error('Navigation request was cancelled'), { errorId: 'kitesurf.navigate.failed', status: 502 })
}

async function navigateOnce(session, httpBase, url, connect, isCancelled) {
  const client = await ensureClient(session, httpBase, connect)
  const targets = await client.send('Target.getTargets')
  const page = (targets.targetInfos || []).find((row) => row.type === 'page')
  if (!page) {
    const error = new Error('no document')
    error.status = 502
    error.errorId = 'kitesurf.elements.empty'
    throw error
  }
  const attached = page.sessionId
    ? { sessionId: page.sessionId }
    : await client.send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
  await client.send('Page.enable', {}, attached.sessionId)
  // Driver-owned settings replay on the attached page; never patch the pin
  // or silently claim an override succeeded when its CDP call failed.
  await applyBrowserSettingsToPage(session, client, attached.sessionId)
  // Cancelling a queued HTTP request must not navigate later. Once sent,
  // however, a CDP navigation is left to finish on its existing connection.
  assertNavigationActive(isCancelled)
  const result = await client.send('Page.navigate', { url }, attached.sessionId)
  if (result.errorText) {
    const error = new Error(String(result.errorText).slice(0, 240))
    error.status = 502
    error.errorId = 'kitesurf.navigate.failed'
    throw error
  }
  return { ok: true, url }
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
 * Probe only idle sockets. Kitesurf can queue Browser.getVersion behind a
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
      existing.mimeType = ''
      existing.size = null
      existing.durationMs = null
      existing.failed = false
      existing.error = ''
      return
    }
    session.network.push({
      id,
      url: String(params.request?.url || '').slice(0, 1200),
      method: String(params.request?.method || 'GET').slice(0, 16),
      type: String(params.type || 'Other').slice(0, 32),
      at: new Date(startedAt).toISOString(),
      startedAt,
      timestamp: Number(params.timestamp) || null,
      status: null,
      mimeType: '',
      size: null,
      durationMs: null,
      failed: false,
      error: '',
      cached: false,
    })
    if (session.network.length > 200) session.network.shift()
    return
  }
  const row = networkRow(session, id)
  if (!row) return
  if (message.method === 'Network.responseReceived') {
    row.status = Number(params.response?.status) || 0
    row.mimeType = String(params.response?.mimeType || '').slice(0, 120)
    row.type = String(params.type || row.type || 'Other')
    if (params.response?.fromDiskCache || params.response?.fromServiceWorker) row.cached = true
    return
  }
  if (message.method === 'Network.requestServedFromCache') {
    row.cached = true
    return
  }
  if (message.method === 'Network.loadingFinished') {
    const size = Number(params.encodedDataLength)
    if (Number.isFinite(size) && size >= 0) row.size = size
    row.durationMs = networkElapsed(row, params.timestamp)
    return
  }
  if (message.method === 'Network.loadingFailed') {
    row.failed = true
    row.error = String(params.errorText || 'failed').slice(0, 200)
    row.durationMs = networkElapsed(row, params.timestamp)
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
  const client = await connect(httpBase)
  session.cdp = client
  client.probedAt = Date.now()
  if (typeof client.listen === 'function') {
    client.listen((message) => {
      const params = message.params || {}
      if (message.method === 'Runtime.consoleAPICalled') {
        const text = (params.args || []).map((arg) => arg.value ?? arg.description ?? '').join(' ').slice(0, 200)
        session.console.push({ level: params.type || 'log', text, at: new Date().toISOString() })
        if (session.console.length > 200) session.console.shift()
      }
      recordNetworkEvent(session, message)
    })
  }
  try {
    await client.send('Network.enable')
    await client.send('Runtime.enable')
  } catch { /* page-session events still arrive after a later enable */ }
  return client
}

/** Optional transport and budgets are a local test seam, not an HTTP setting. */
export function connectCdp(httpBase, { WebSocket: Socket = globalThis.WebSocket, timeouts = {} } = {}) {
  const budgets = { ...CDP_TIMEOUTS, ...timeouts }
  const wsUrl = `${String(httpBase).replace(/^http/, 'ws')}/devtools/browser`
  const ws = new Socket(wsUrl)
  let next = 1
  const navigations = new Set()
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
    // even when its caller's deadline has already expired.
    navigations.delete(message.id)
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
    get navigating() { return navigations.size > 0 },
    send(method, params = {}, sessionId, timeoutMs = NAVIGATION_METHODS.has(method) ? budgets.navigate : method === 'Page.captureScreenshot' ? budgets.screenshot : budgets.call) {
      if (!client.alive) return Promise.reject(new Error('cdp socket closed'))
      const id = next
      next += 1
      const frame = { id, method, params }
      if (sessionId) frame.sessionId = sessionId
      if (NAVIGATION_METHODS.has(method)) navigations.add(id)
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          // The engine may still finish this work. A deadline is neither a
          // transport failure nor permission to close its page-owning socket.
          reject(new Error(`${method} timed out`))
        }, timeoutMs)
        pending.set(id, {
          resolve: (message) => {
            clearTimeout(timer)
            if (message.error) reject(new Error(message.error.message || method))
            else resolve(message.result ?? {})
          },
          reject: (error) => { clearTimeout(timer); reject(error) },
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
