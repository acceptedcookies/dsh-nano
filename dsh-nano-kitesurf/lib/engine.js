/**
 * Engine client for one Kitesurf engine.
 *
 * The engine is external. This module never launches a browser. It talks to
 * the engine's HTTP face at `httpBase` (`/health`, `/json/version`,
 * `/json/list`).
 *
 * The CDP socket at `/devtools/browser` is owned by dsh-nano-local-sandbox
 * (DNLS), not this package. Every exported function that used to reach it
 * through `useLive()` is retired: it keeps its signature, keeps its cheap
 * input validation, and then fails fast with `kitesurf.engine.connect` so a
 * caller sees the same documented 502 contract instead of a bare exception.
 * The CDP-side diagnostics feed (console/network events) lives with the
 * socket — nothing in this package feeds those rings anymore.
 */

const CONNECT_MS = 4000

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
   *   itself is suspect.
   */
  constructor(id, message, flags = {}) {
    super(message)
    this.id = id
    this.transport = flags.transport === true
  }
}

/**
 * Fail-fast for every export that used to drive the CDP socket. Reuses
 * `kitesurf.engine.connect` (the documented "engine unreachable" id → 502)
 * instead of minting a new enum: the route contract and ERROR_CATALOG stay
 * untouched. `transport` stays false — retrying cannot re-own the socket.
 */
function retiredCdp() {
  throw new KitesurfError(
    'kitesurf.engine.connect',
    'CDP socket owned by dsh-nano-local-sandbox; use /nano-local-sandbox/* routes',
  )
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

let userAgent = ''
/** @type {{ width: number, height: number, mobile: boolean, deviceScaleFactor: number } | null} */
let viewport = null
/** @type {'screen'|'print'|null} */
let media = null
/** @type {Record<string,string>|null} */
let extraHeaders = null

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

/** No live socket to drop anymore — kept for the exported signature. */
export function releaseEngine() {
  retiredCdp()
}

/**
 * Debug surface: the engine's live target list, read through the engine's
 * HTTP face (`GET /json/list`) instead of `Target.getTargets` on the CDP
 * socket. /json/list entries are normalized to the same field names the old
 * WS path returned; `attachedPage` is always null because session attachment
 * is invisible over HTTP.
 * @param {string} httpBase
 */
export async function engineTargets(httpBase) {
  let listed
  try {
    listed = await fetchEngine(httpBase, '/json/list')
  } catch {
    throw new KitesurfError('kitesurf.engine.connect', `cannot reach ${httpBase}`, { transport: true })
  }
  if (listed.status !== 200) {
    throw new KitesurfError('kitesurf.engine.connect', `${httpBase}/json/list answered ${listed.status}`)
  }
  let rows
  try {
    rows = JSON.parse(listed.text)
  } catch {
    throw new KitesurfError('kitesurf.engine.connect', `${httpBase}/json/list did not return JSON`)
  }
  const targetInfos = (Array.isArray(rows) ? rows : []).slice(0, 20).map((item) => ({
    targetId: String(item?.targetId ?? item?.id ?? '').slice(0, 80),
    type: String(item?.type || '').slice(0, 20),
    url: String(item?.url || '').slice(0, 200),
    title: String(item?.title || '').slice(0, 120),
  }))
  return { targetInfos, count: targetInfos.length, attachedPage: null }
}

/**
 * @param {string} httpBase
 * @param {string} url
 */
export async function openPage(httpBase, url) {
  pageUrl(url) // keep the input contract even though the socket is retired
  retiredCdp()
}

/**
 * Debug surface: bounded JS evaluation in the engine page — retired with the
 * CDP socket; DNLS owns page evaluation now.
 */
export async function evaluateInPage(httpBase, expression) {
  const text = typeof expression === 'string' ? expression.trim() : ''
  if (!text) throw new KitesurfError('kitesurf.evaluate.empty', 'expression is empty')
  if (text.length > 2000) throw new KitesurfError('kitesurf.evaluate.toolong', 'expression exceeds 2000 characters')
  retiredCdp()
}

/** Chunked evaluation over the page-global eval cache — retired with the CDP socket. */
export async function evaluateChunked(httpBase, opts = {}) {
  void opts
  retiredCdp()
}

/** Storage read/write via in-page storage — retired with the CDP socket. */
export async function storageOp(httpBase, opts = {}) {
  void opts
  retiredCdp()
}

/** Synthetic-event interaction (click/fill/type…) — retired with the CDP socket. */
export async function interactElement(httpBase, opts = {}) {
  void opts
  retiredCdp()
}

/** State snapshot save/restore — retired with the CDP socket. */
export async function stateOp(httpBase, opts = {}) {
  void opts
  retiredCdp()
}

/** Real back/forward through the engine's navigationHistory — retired with the CDP socket. */
export async function navigateHistory(httpBase, delta) {
  const step = delta === -1 ? -1 : delta === 1 ? 1 : 0
  if (!step) throw new KitesurfError('kitesurf.navigate.delta', 'delta must be -1 or +1')
  retiredCdp()
}

/** Poll a page condition (selector/text/url/fn) — retired with the CDP socket. */
export async function waitForCondition(httpBase, spec = {}) {
  void spec
  retiredCdp()
}

/**
 * Browser disguise / emulation. The validation + transactional contract is
 * unchanged (a bad field still throws kitesurf.settings.* and leaves state
 * untouched), but the engine-side apply is retired: after validation the call
 * fails fast and rolls back so /status never shows a ghost setting.
 * @param {string} httpBase
 * @param {{ userAgent?: string, viewport?: object|null, media?: string|null,
 *   extraHeaders?: object|null }} patch
 */
export async function setBrowserSettings(httpBase, patch) {
  const next = patch && typeof patch === 'object' ? patch : {}
  // The engine-side apply is retired: every path below fails fast with
  // kitesurf.engine.connect, so the module state is never touched — the old
  // stage-then-rollback machinery was deleted since it could never commit.
  if (typeof next.userAgent === 'string') {
    if (next.userAgent.length > 400 || /[\r\n]/.test(next.userAgent)) {
      throw new KitesurfError('kitesurf.settings.userAgent', 'User-Agent 必须是一行，最长 400 个字符')
    }
  }
  if (next.viewport !== null && next.viewport && typeof next.viewport === 'object' && !Array.isArray(next.viewport)) {
    const width = Number(next.viewport.width)
    const height = Number(next.viewport.height ?? VIEWPORTS[width]?.height)
    const dsf = Number(next.viewport.deviceScaleFactor ?? 1)
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 320 || width > 3840 || height < 240 || height > 2160) {
      throw new KitesurfError('kitesurf.settings.viewport', '视口宽高必须是 320..3840 / 240..2160 的整数（或只给 width 用预设高度）')
    }
    if (![1, 2, 3].includes(dsf)) {
      throw new KitesurfError('kitesurf.settings.viewport', 'deviceScaleFactor 只能是 1、2 或 3')
    }
  }
  if (next.media !== null && next.media !== 'screen' && next.media !== 'print' && next.media !== undefined) {
    throw new KitesurfError('kitesurf.settings.media', 'media 只能是 screen、print 或 null')
  }
  if (next.extraHeaders !== null && next.extraHeaders !== undefined) {
    if (typeof next.extraHeaders !== 'object' || Array.isArray(next.extraHeaders)) {
      throw new KitesurfError('kitesurf.settings.headers', 'extraHeaders 必须是对象或 null')
    }
    const entries = Object.entries(next.extraHeaders)
    if (entries.length > 20) {
      throw new KitesurfError('kitesurf.settings.headers', 'extraHeaders 最多 20 项')
    }
    for (const [key, value] of entries) {
      const lower = key.toLowerCase()
      if (!/^[a-z0-9-]{1,64}$/i.test(key) || FORBIDDEN_HEADERS.has(lower)) {
        throw new KitesurfError('kitesurf.settings.headers', `不允许的 header 名：${key}`)
      }
      if (typeof value !== 'string' || value.length > 200) {
        throw new KitesurfError('kitesurf.settings.headers', `header ${key} 的值必须是 ≤200 字符的字符串`)
      }
    }
  }
  retiredCdp()
}

/** Retired with the CDP socket; kept for the exported signature. */
export async function captureShot(httpBase, scrollY = 0, options = {}) {
  void scrollY; void options
  retiredCdp()
}

/** Re-derive a pick packet by selector — retired with the CDP socket. */
export async function pickBySelector(httpBase, selector) {
  const clean = String(selector || '').slice(0, 320)
  if (!clean) throw new KitesurfError('kitesurf.pick.selector', 'selector required')
  retiredCdp()
}

/** Double-click live text edit — retired with the CDP socket. */
export async function editElement(httpBase, selector, text) {
  const clean = String(selector || '').slice(0, 320)
  if (!clean) throw new KitesurfError('kitesurf.edit.selector', 'selector required')
  void text
  retiredCdp()
}

export async function pickElement(httpBase, x, y) {
  pickPoint({ x, y }) // keep the input contract even though the socket is retired
  retiredCdp()
}

/** Live DOM of the engine page — retired with the CDP socket. */
export async function captureDom(httpBase) {
  retiredCdp()
}

/** Elements panel data (DOM/CSS domains) — retired with the CDP socket. */
export async function captureElements(httpBase, options = {}) {
  void options
  retiredCdp()
}

/** a11y-lite snapshot — retired with the CDP socket. */
export async function captureSnapshot(httpBase, options = {}) {
  void options
  retiredCdp()
}
