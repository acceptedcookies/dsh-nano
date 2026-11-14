/**
 * Observability core for nano-kitesurf.
 *
 * Why this exists: an agent debugging a frontend through MCP must be able to
 * answer "what did the plugin just do, and why did it fail?" without asking a
 * human to open a log file or paste a screenshot. Before this module the only
 * state was `lastError` (one row, overwritten) — no operation trace, no page
 * console, no machine-readable error catalogue.
 *
 * Three ring buffers + one catalogue:
 *  - operations: every route call, success or failure, with duration/status.
 *  - console: CDP Runtime/Log/Network events from the engine page.
 *  - ERROR_CATALOG: the single source of truth mapping errorId → HTTP status
 *    → cause → next command. index.js derives its status table from it and
 *    lib/skill.js regenerates the troubleshooting table from it, so the three
 *    surfaces can never drift apart.
 *
 * All buffers are process-local and bounded; nothing durable, nothing secret.
 * Input summaries are whitelisted and truncated so cookies/tokens never land
 * in a debug response.
 */

const OP_CAP = 200
const CONSOLE_CAP = 250
const TEXT_CAP = 320

/** @type {Array<object>} */
const operations = []
/** @type {Array<object>} */
const consoleEntries = []
let seq = 0
let consoleSeq = 0
let droppedOps = 0
let droppedConsole = 0

/**
 * errorId → status → cause → next. `match` is a regex source; index.js uses
 * it verbatim for routing, skill.js renders `example` + cause + next for the
 * agent. Keep ids in sync with real throw sites; unmatched ids stay 502.
 */
export const ERROR_CATALOG = [
  { match: '^kitesurf\\.body\\.toolarge$', example: 'kitesurf.body.toolarge', status: 413, cause: '请求体超过该路由上限（shot/pick/settings/history 4096B，edit 8192B）', next: '拆小请求；/edit text ≤4000 字符；不要整页 HTML 塞进 body' },
  { match: '^kitesurf\\.body\\.', example: 'kitesurf.body.json', status: 400, cause: 'body 不是 JSON 对象、JSON 截断或为空', next: '确认 content-type: application/json 与合法 JSON 对象；空 body 视为 {}' },
  { match: '^kitesurf\\.url\\.', example: 'kitesurf.url.scheme', status: 400, cause: '地址为空/超长/非 http(s)/带用户名密码', next: '用完整 https:// 地址；去掉 user:pass@；长度 ≤2000' },
  { match: '^kitesurf\\.pick\\.(point|selector)$', example: 'kitesurf.pick.point', status: 400, cause: '坐标非有限数/越界，或选择器语法错', next: '坐标取画面内容区域（注意 letterbox 黑边）；selector 用合法 CSS' },
  { match: '^kitesurf\\.pick\\.badpoint$', example: 'kitesurf.pick.badpoint', status: 400, cause: 'selector 缺失或含控制字符', next: '传 {selector:"h1"} 或先 /pick {x,y}' },
  { match: '^kitesurf\\.pick\\.miss$', example: 'kitesurf.pick.miss', status: 404, cause: '坐标下没有元素，或选择器未命中（输入侧未命中，不是引擎故障）', next: '重新 /shot 拿最新画面；换 selector；确认页面已 /open' },
  { match: '^kitesurf\\.pick\\.failed$', example: 'kitesurf.pick.failed', status: 502, cause: '引擎侧元素探针异常', next: 'GET /status 看 engineMismatch；POST /kite {action:"resume"}' },
  { match: '^kitesurf\\.edit\\.(badtext|badpoint|selector)$', example: 'kitesurf.edit.badtext', status: 400, cause: 'text 为空/超 4000，或 selector 缺失非法', next: '/edit 必须同时给 selector 与 1..4000 字符 text' },
  { match: '^kitesurf\\.edit\\.miss$', example: 'kitesurf.edit.miss', status: 404, cause: '改字目标选择器未命中', next: '重新 /pick 取 selector；页面若已导航需重选' },
  { match: '^kitesurf\\.shot\\.(scroll|format|fit)$', example: 'kitesurf.shot.scroll', status: 400, cause: 'scroll 非有限数/超 ±4000，format 不是 png/jpeg/webp，或 fit 不是 {width,height}', next: 'POST /shot {scroll: ±整数, format:\"webp\", quality:1..100, fit:{width,height}}' },
  { match: '^kitesurf\\.settings\\.', example: 'kitesurf.settings.viewport', status: 400, cause: 'userAgent/viewport/media/extraHeaders 形状非法或值越界（视口 320..3840 × 240..2160；dsf 1/2/3；media screen|print；header 名禁用凭证类）', next: 'POST /settings {"viewport":{"width":1024,"height":768},"media":"print","extraHeaders":{"X-Debug":"1"}}；任一字段传 null 清除；空串 UA 清除伪装' },
  { match: '^kitesurf\\.kite\\.state$', example: 'kitesurf.kite.state', status: 409, cause: '生命周期阶段不符（idle 才能 start、running 才能 suspend、suspended 才能 resume）', next: 'GET /status 读 kite.phase；按阶段选 start/suspend/resume；host 重启后 phase 会自动 adopt' },
  { match: '^kitesurf\\.kite\\.(origin|remote|mcpPort|action|checkout)$', example: 'kitesurf.kite.remote', status: 400, cause: 'configure 参数非法、远程地址未开 allowRemote、或缺少 KITESURF_CHECKOUT/config.checkout', next: 'loopback 地址；mcpPort 1..65535；在 profile patch 写 config.checkout' },
  { match: '^kitesurf\\.kite\\.(node|init)$', example: 'kitesurf.kite.node', status: 500, cause: 'Node 版本过低或锁文件不可写', next: '需要 Node ≥22；检查 DSH_HOME 可写' },
  { match: '^kitesurf\\.kite\\.portbusy$', example: 'kitesurf.kite.portbusy', status: 409, cause: '要重建到的宿主端口被其他程序占用（本机 8787 常被 Cursor 占用）', next: '把 profile 的 config.httpBase 指到空闲端口（如 http://127.0.0.1:8798）后重启宿主；现有容器不会被删' },
  { match: '^kitesurf\\.kite\\.(container|start|resume)$', example: 'kitesurf.kite.container', status: 502, cause: 'container CLI 冷启动/镜像/挂载失败（错误正文含 stdout 尾部真因）', next: '看 error 里的 failed to bootstrap 类信息；container system start；GET /diagnostics 看最近操作' },
  { match: '^kitesurf\\.navigate\\.egress$', example: 'kitesurf.navigate.egress', status: 504, cause: '目标站点出站超过 25s（引擎写入 egress timeout）', next: '换可达站点；不要重试同一地址；GET /status 确认引擎仍活' },
  { match: '^kitesurf\\.navigate\\.delta$', example: 'kitesurf.navigate.delta', status: 400, cause: '/history delta 不是 -1 或 +1', next: 'POST /history {delta:-1} 后退 / {delta:1} 前进' },
  { match: '^kitesurf\\.navigate\\.(timeout|failed)$', example: 'kitesurf.navigate.failed', status: 502, cause: 'Page.navigate 超时或被拒绝（DNS/网络）', next: '检查 URL 可达；超时后不要立刻重复 open（可能已在导航）' },
  { match: '^kitesurf\\.engine\\.context$', example: 'kitesurf.engine.context', status: 409, cause: '页面正在导航，JS 执行上下文被销毁（竞态，不是引擎故障）', next: '已自动重试一次；仍失败时等页面稳定后重试，或 POST /recover 一键恢复' },
  { match: '^kitesurf\\.engine\\.', example: 'kitesurf.engine.connect', status: 502, cause: 'CDP 连接失败/服务不是 Kitesurf/socket 关闭/命令超时', next: 'GET /status；container list；curl http://127.0.0.1:8798/health；必要时 /kite resume' },
  { match: '^kitesurf\\.perf\\.', example: 'kitesurf.perf.method', status: 400, cause: 'mode=window 排水只允许 POST', next: 'GET /perf-review/host 读快照；POST /perf-review/host?mode=window 排水' },
  { match: '^kitesurf\\.context\\.(text|miss)$', example: 'kitesurf.context.miss', status: 404, cause: '上下文引用不存在或 text 为空（ref 环只保留最近 50 条，宿主重启即清空）', next: '重新点选生成新 ref；GET /nano-kitesurf/context 列出最近引用' },
  { match: '^kitesurf\\.console\\.', example: 'kitesurf.console.query', status: 400, cause: 'console 查询参数非法', next: 'GET /console?level=error&limit=50；POST /console {clear:true} 清空' },
  { match: '^kitesurf\\.diag\\.query$', example: 'kitesurf.diag.query', status: 400, cause: 'diagnostics/operations 查询参数非法', next: 'GET /diagnostics?limit=20；GET /operations?errorsOnly=true' },
  { match: '^kitesurf\\.evaluate\\.(empty|toolong)$', example: 'kitesurf.evaluate.empty', status: 400, cause: 'expression 为空或超过 2000 字符', next: 'POST /evaluate {expression:"document.title"}，≤2000 字符' },
  { match: '^kitesurf\\.evaluate\\.exception$', example: 'kitesurf.evaluate.exception', status: 400, cause: '页面 JS 求值抛异常（输入侧表达式错误）', next: '看 error 里的异常描述；先 /open 再求值；确认 selector/变量名存在' },
  { match: '^kitesurf\\.wait\\.query$', example: 'kitesurf.wait.query', status: 400, cause: '/wait 条件不合法：selector/text/url/fn 必须恰好一个，load 必须是 commit|domcontentloaded|load|networkidle', next: 'POST /wait {selector:".ready"} 或 {text:"Done"} 或 {url:"/home"}；加 load:"networkidle" 等空闲' },
  { match: '^kitesurf\\.wait\\.timeout$', example: 'kitesurf.wait.timeout', status: 504, cause: '等待超时：条件在 timeoutMs 内没成立（元素没出现/文本没渲染/导航没到）', next: '确认条件写对（selector 真实存在？）；加大 timeoutMs≤30000；GET /console 看页面是否报错' },
  { match: '^kitesurf\\.history\\.body$', example: 'kitesurf.history.body', status: 400, cause: '/browse-history POST body 不是 {clear:true}，或 /history body 不是 {delta:±1}', next: 'POST /browse-history {"clear":true}；导航用 POST /history {delta:-1|1}' },
  { match: '^kitesurf\\.network\\.query$', example: 'kitesurf.network.query', status: 400, cause: '/network 查询参数非法（limit 越界）', next: 'GET /network?limit=1..200&failedOnly=true；POST /network {clear:true} 清空' },
  { match: '^kitesurf\\.shot\\.empty$', example: 'kitesurf.shot.empty', status: 502, cause: '引擎返回了空截图（页面不可绘/渲染器忙）', next: '确认页面已 /open；等一秒重试；仍空则 GET /diagnostics 看页面是否 about:blank' },
  { match: '^kitesurf\\.dom\\.(empty|blank)$', example: 'kitesurf.dom.blank', status: 502, cause: '无文档可序列化（页面未打开/仍是 about:blank/文档不可序列化）', next: '先 POST /open；空白页是 socket 断开重置的信号 — GET /status 看 phase' },
  { match: '^kitesurf\\.elements\\.empty$', example: 'kitesurf.elements.empty', status: 502, cause: '引擎 DOM.getDocument 未返回文档根（页面未打开）', next: '先 POST /open；或 GET /elements?selector=… 前先确认页面存在' },
  { match: '^kitesurf\\.snapshot\\.(empty|failed)$', example: 'kitesurf.snapshot.empty', status: 502, cause: 'a11y walker 没返回 JSON / 在页面里抛异常', next: '先 POST /open 再 GET /snapshot；页面若 about:blank 先导航' },
  { match: '^kitesurf\\.ref\\.miss$', example: 'kitesurf.ref.miss', status: 404, cause: '@N 元素 ref 不在当前表（页面变了/还没跑过 /snapshot）', next: 'GET /nano-kitesurf/snapshot 重建 ref 表后重试；或直接传 selector' },
]

/**
 * Bridge-local errors (runtime/mcp-bridge.mjs) — these fire inside the MCP
 * bridge, not on an HTTP route, so they are not host KitesurfError sites.
 * They are registered here so the "every kitesurf.* id is documented" test
 * and the agent's error table treat them as first-class, bridge-scoped ids
 * (status is null: they never map to an HTTP status).
 */
export const BRIDGE_ERRORS = [
  { id: 'kitesurf.diag.stale', cause: '宿主尚未把诊断快照推给桥（首次连接/刚重启）', next: '等几秒重试，或先在已登录页面调 GET /diagnostics 让宿主推一份' },
  { id: 'kitesurf.history.stale', cause: '桥侧还没有 history 快照', next: '在宿主打开一个页面产生 history 后重试' },
  { id: 'kitesurf.dom.stale', cause: '桥侧还没有 dom 快照', next: '先调 GET /nano-kitesurf/dom' },
  { id: 'kitesurf.elements.stale', cause: '桥侧还没有 elements 快照', next: '先调 GET /nano-kitesurf/elements' },
  { id: 'kitesurf.selftest.stale', cause: '桥侧还没有 selftest 快照', next: '先调 GET /nano-kitesurf/selftest' },
  { id: 'kitesurf.control.busy', cause: '另一连接正在持有写操作（人机共享单页，写串行）', next: '等待并重试；GET /health 看当前 owner' },
  { id: 'kitesurf.control.query', cause: 'kitesurf_control 的 action 不是 status|claim|release', next: '用 kitesurf_control {action:"status"|"claim"|"release"}' },
  { id: 'kitesurf.tool.unknown', cause: '调用了不存在的 kitesurf_* 工具名', next: '对照 tools/list 的 kitesurf_* 工具名' },
]

/** Bridge ids are bridge-scoped, not host-catalog rows — kept separate. */
export const BRIDGE_ERROR_IDS = new Set(BRIDGE_ERRORS.map((row) => row.id))

/** Derived status table — index.js must not keep a second copy. */
export const ERROR_STATUS = ERROR_CATALOG.map((row) => [new RegExp(row.match), row.status])

function bounded(text, cap = TEXT_CAP) {
  const value = typeof text === 'string' ? text : String(text ?? '')
  return value.length > cap ? `${value.slice(0, cap)}…` : value
}

/** Only whitelisted, bounded fields of a request body are recorded. */
export function summarizeInput(body) {
  if (!body || typeof body !== 'object') return null
  const out = {}
  const keys = ['url', 'selector', 'x', 'y', 'scroll', 'delta', 'action', 'preview', 'httpBase', 'mcpPort', 'clear', 'level', 'limit', 'expression']
  for (const key of keys) {
    if (body[key] === undefined) continue
    if (key === 'url' || key === 'selector' || key === 'expression') out[key] = bounded(body[key], 160)
    else if (key === 'httpBase') out[key] = bounded(body[key], 80)
    else if (key === 'viewport') out.viewport = body.viewport === null ? null : '[object]'
    else if (key === 'userAgent') out.userAgent = `[string:${String(body[key]).length}]`
    else out[key] = body[key]
  }
  if (body.text !== undefined) out.text = `[string:${String(body.text).length}]`
  if (body.viewport !== undefined) out.viewport = body.viewport === null ? null : '[object]'
  if (body.userAgent !== undefined) out.userAgent = `[string:${String(body.userAgent).length}]`
  return Object.keys(out).length ? out : null
}

/**
 * @param {{ route: string, method: string, status: number, durationMs: number,
 *   ok: boolean, errorId?: string|null, error?: string|null, incidentId?: string|null,
 *   input?: object|null, result?: string|null }} entry
 */
export function recordOperation(entry) {
  const row = {
    seq: ++seq,
    at: new Date().toISOString(),
    route: entry.route,
    method: entry.method || 'GET',
    durationMs: Math.round(Number(entry.durationMs) || 0),
    status: Number(entry.status) || 0,
    ok: entry.ok === true,
    ...(entry.errorId ? { errorId: bounded(entry.errorId, 80) } : {}),
    ...(entry.incidentId ? { incidentId: bounded(entry.incidentId, 60) } : {}),
    ...(entry.error ? { error: bounded(entry.error, 240) } : {}),
    ...(entry.input ? { input: entry.input } : {}),
    ...(entry.result ? { result: bounded(entry.result, 80) } : {}),
  }
  operations.push(row)
  while (operations.length > OP_CAP) { operations.shift(); droppedOps += 1 }
  return row
}

export function listOperations({ limit = 50, errorsOnly = false, since = null } = {}) {
  const cap = Math.max(1, Math.min(Number(limit) || 50, OP_CAP))
  const sinceMs = since ? Date.parse(since) : 0
  let rows = operations.filter((row) => (!errorsOnly || !row.ok) && (!sinceMs || Date.parse(row.at) > sinceMs))
  rows = rows.slice(-cap)
  return { entries: rows, total: operations.length, dropped: droppedOps }
}

/** CDP console/network event, already normalized by lib/engine.js. */
export function recordConsole(entry) {
  const row = {
    seq: ++consoleSeq,
    at: new Date().toISOString(),
    level: ['log', 'info', 'warn', 'error', 'debug', 'network', 'exception', 'page', 'navigation'].includes(entry.level) ? entry.level : 'log',
    source: bounded(entry.source || 'console', 60),
    text: bounded(entry.text, 600),
    ...(entry.url ? { url: bounded(entry.url, 200) } : {}),
    ...(Number.isFinite(entry.lineNumber) ? { lineNumber: entry.lineNumber } : {}),
  }
  consoleEntries.push(row)
  while (consoleEntries.length > CONSOLE_CAP) { consoleEntries.shift(); droppedConsole += 1 }
  return row
}

export function listConsole({ limit = 50, level = null, since = null } = {}) {
  const cap = Math.max(1, Math.min(Number(limit) || 50, CONSOLE_CAP))
  const sinceMs = since ? Date.parse(since) : 0
  const levels = level ? String(level).split(',').map((s) => s.trim()).filter(Boolean) : null
  let rows = consoleEntries.filter((row) =>
    (!levels || levels.includes(row.level)) && (!sinceMs || Date.parse(row.at) > sinceMs))
  rows = rows.slice(-cap)
  const counts = {}
  for (const row of consoleEntries) counts[row.level] = (counts[row.level] || 0) + 1
  return { entries: rows, total: consoleEntries.length, counts, dropped: droppedConsole }
}

export function clearConsole() {
  const cleared = consoleEntries.length
  consoleEntries.length = 0
  return cleared
}

export function clearOperations() {
  const cleared = operations.length
  operations.length = 0
  return cleared
}

export function diagnosticsSummary() {
  const errors = operations.filter((row) => !row.ok)
  const latencies = {}
  for (const row of operations) {
    const bucket = latencies[row.route] || (latencies[row.route] = [])
    bucket.push(row.durationMs)
  }
  const latency = {}
  for (const [route, values] of Object.entries(latencies)) {
    const sorted = [...values].sort((a, b) => a - b)
    latency[route] = { n: values.length, p50: sorted[Math.floor(sorted.length / 2)] || 0, max: sorted[sorted.length - 1] || 0 }
  }
  return {
    operations: { total: operations.length, failures: errors.length, dropped: droppedOps, latency },
    recentErrors: errors.slice(-5),
    console: { total: consoleEntries.length, counts: listConsole({ limit: 1 }).counts, dropped: droppedConsole },
    errorCatalog: ERROR_CATALOG.map(({ example, status, cause, next }) => ({ errorId: example, status, cause, next })),
  }
}

/**
 * Context refs: the composer carries a one-line chip `⟦kitesurf:N⟧`, while the
 * full (never truncated) element packet lives here, resolvable by id. This is
 * the plugin-side equivalent of Cursor's inline context pill: the composer
 * stays readable, the payload stays complete.
 */
const REF_CAP = 50
const refs = []
let refSeq = 0

/** @param {string} text full note; @param {object|null} packet element packet */
export function putRef(text, packet = null, meta = {}) {
  const id = ++refSeq
  const row = {
    id,
    at: new Date().toISOString(),
    label: String(meta.label || '').slice(0, 60),
    bytes: Buffer.byteLength(String(text), 'utf8'),
    text: String(text),
    packet,
  }
  refs.push(row)
  while (refs.length > REF_CAP) refs.shift()
  return row
}

export function getRef(id) {
  return refs.find((row) => row.id === Number(id)) || null
}

export function listRefs(limit = 20) {
  const cap = Math.max(1, Math.min(Number(limit) || 20, REF_CAP))
  return {
    total: refs.length,
    entries: refs.slice(-cap).map(({ id, at, label, bytes }) => ({ id, at, label, bytes })),
  }
}

/** Composer chip text — one line, stable, resolvable. */
export function refChip(id, label) {
  return `⟦kitesurf:${id}${label ? ` ${label}` : ''}⟧`
}

/**
 * Element refs (P0-5). The @N table from the latest /snapshot walk. Separate
 * from the note `refs` above: notes are human-authored composer chips, element
 * refs are the machine-readable selector table an agent hands to wait/pick/
 * evaluate/edit. Replaced wholesale on every snapshot so refs always resolve
 * against the same rendered page the tree described.
 */
let elementRefs = {}      // "@N" → {role,name,text,selector}
let elementRefsUrl = null // page url the table was built against
let elementRefsAt = null

/** Replace the element-ref table (called by the /snapshot route). */
export function putElementRefs(refs, url) {
  elementRefs = refs && typeof refs === 'object' ? refs : {}
  elementRefsUrl = typeof url === 'string' ? url : null
  elementRefsAt = new Date().toISOString()
}

/** Resolve "@N" to its {role,name,text,selector} or null. */
export function getElementRef(ref) {
  return elementRefs[String(ref || '')] || null
}

/** "@N" → CSS selector; null when ref is unknown or not a ref. */
export function elementRefSelector(ref) {
  const row = getElementRef(ref)
  return row && typeof row.selector === 'string' && row.selector ? row.selector : null
}

/** True when the string is an @N element ref (not a note ref or a selector). */
export function isElementRef(value) {
  return /^@\d+$/.test(String(value || '').trim())
}

export function elementRefSummary() {
  return { count: Object.keys(elementRefs).length, url: elementRefsUrl, at: elementRefsAt, refs: elementRefs }
}

/**
 * Network lifecycle. The engine pushes requestWillBeSent → responseReceived →
 * loadingFinished/Failed on the same page session we already hold, so a
 * DevTools-style waterfall needs no extra socket and no polling of the page.
 */
const NET_CAP = 200
const netRequests = new Map()   // requestId → row (insertion ordered)
const netOrder = []
let droppedNetwork = 0

function trimNetwork() {
  while (netOrder.length > NET_CAP) {
    const id = netOrder.shift()
    if (netRequests.delete(id)) droppedNetwork += 1
  }
}

export function networkRequest(p) {
  const id = String(p.requestId || '')
  if (!id) return
  const existing = netRequests.get(id)
  if (existing) return existing
  const row = {
    id,
    at: new Date().toISOString(),
    method: String(p.request?.method || 'GET').slice(0, 12),
    url: String(p.request?.url || '').slice(0, 400),
    type: String(p.type || 'Other').slice(0, 24),
    status: null,
    mimeType: '',
    size: null,
    durationMs: null,
    failed: false,
    error: '',
    startedAt: Date.now(),
  }
  netRequests.set(id, row)
  netOrder.push(id)
  trimNetwork()
  return row
}

export function networkResponse(p) {
  const row = netRequests.get(String(p.requestId || ''))
  if (!row) return
  row.status = Number(p.response?.status) || 0
  row.mimeType = String(p.response?.mimeType || '').slice(0, 60)
  if (p.response?.fromDiskCache || p.response?.fromServiceWorker) row.cached = true
}

export function networkFinished(p) {
  const row = netRequests.get(String(p.requestId || ''))
  if (!row) return
  row.size = Number(p.encodedDataLength) || row.size
  row.durationMs = Date.now() - row.startedAt
}

export function networkFailed(p) {
  const row = netRequests.get(String(p.requestId || ''))
  if (!row) return
  row.failed = true
  row.error = String(p.errorText || 'failed').slice(0, 120)
  row.durationMs = Date.now() - row.startedAt
}

export function listNetwork({ limit = 100, failedOnly = false } = {}) {
  const cap = Math.max(1, Math.min(Number(limit) || 100, NET_CAP))
  let rows = netOrder.map((id) => netRequests.get(id)).filter(Boolean)
  if (failedOnly) rows = rows.filter((r) => r.failed || (r.status && r.status >= 400))
  return { entries: rows.slice(-cap), total: netOrder.length, dropped: droppedNetwork }
}

/** In-flight request count (requestWillBeSent seen, no finish/fail yet). */
export function networkPending() {
  let n = 0
  for (const id of netOrder) {
    const row = netRequests.get(id)
    if (row && row.status === null && !row.failed && row.durationMs === null) n += 1
  }
  return n
}

export function clearNetwork() {
  const cleared = netOrder.length
  netOrder.length = 0
  netRequests.clear()
  return cleared
}
