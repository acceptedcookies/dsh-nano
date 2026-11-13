/**
 * CDP client for one Kitesurf engine.
 *
 * The engine is external. This module never launches a browser. It talks to
 * the Worker at `httpBase` (`/health`, `/json/version`) and to the browser
 * socket at `/devtools/browser`. Page commands go through a flattened
 * Target session, which is the same attachment Puppeteer uses.
 */

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
const STYLE_KEYS = ['color', 'backgroundColor', 'fontSize', 'fontFamily', 'display', 'position']

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
/** @type {{ width: number, height: number, mobile: boolean } | null} */
let viewport = null
let viewportApplied = false

const VIEWPORTS = {
  390: { width: 390, height: 844, mobile: true },
  768: { width: 768, height: 1024, mobile: true },
  1280: { width: 1280, height: 800, mobile: false },
}

export function currentUserAgent() {
  return userAgent
}

export function currentViewport() {
  return viewport
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
      deviceScaleFactor: 1,
      mobile: viewport.mobile,
    }, page.sessionId)
    viewportApplied = true
  } else if (viewportApplied) {
    await client.send('Emulation.clearDeviceMetricsOverride', {}, page.sessionId)
    viewportApplied = false
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
    if (typeof message.id !== 'number' || !pending.has(message.id)) return
    const settle = pending.get(message.id)
    pending.delete(message.id)
    settle(message)
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
      if (message.error) reject(new KitesurfError('kitesurf.engine.failed', message.error.message || method))
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
 * @param {string} httpBase
 */
/**
 * @param {string} httpBase
 * @param {string} value empty clears the override
 */
/**
 * @param {string} httpBase
 * @param {{ userAgent?: string, viewport?: { width: number } | null }} patch
 */
export async function setBrowserSettings(httpBase, patch) {
  const next = patch && typeof patch === 'object' ? patch : {}
  if (typeof next.userAgent === 'string') {
    if (next.userAgent.length > 400 || /[\r\n]/.test(next.userAgent)) {
      throw new KitesurfError('kitesurf.settings.userAgent', 'User-Agent 必须是一行，最长 400 个字符')
    }
    userAgent = next.userAgent.trim()
  }
  if (next.viewport === null) viewport = null
  else if (next.viewport && typeof next.viewport === 'object') {
    const preset = VIEWPORTS[next.viewport.width]
    if (!preset) throw new KitesurfError('kitesurf.settings.viewport', '视口只能是 390、768 或 1280')
    viewport = preset
  }
  await useLive(httpBase, async (client) => {
    const page = await pageHandle(client)
    await applyEmulation(client, page)
  })
  return { userAgent, viewport }
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

export async function captureShot(httpBase, scrollY = 0) {
  return useLive(httpBase, async (client) => {
    const page = await pageHandle(client)
    if (scrollY) {
      await client.send('Runtime.evaluate', {
        expression: `window.scrollBy(0, ${scrollY})`,
        returnByValue: true,
      }, page.sessionId)
    }
    const shot = await client.send('Page.captureScreenshot', { format: 'png' }, page.sessionId)
    if (typeof shot.data !== 'string' || shot.data.length === 0) {
      throw new KitesurfError('kitesurf.shot.empty', 'screenshot was empty')
    }
    // Page identity rides with every shot so the pane can compare a pick's
    // identity against the frame it's drawn over and notice drift.
    const info = await pageInfo(client, page)
    return {
      mimeType: 'image/png',
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
