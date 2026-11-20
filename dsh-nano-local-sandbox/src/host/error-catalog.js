/**
 * One error catalogue, composed at runtime.
 *
 * Kernel rows are written as codes without a namespace (the profile owns the
 * prefix); the two fixed `sandbox.*` ids stay fully qualified. Driver rows are
 * registered by the active profile and are composed with the same prefix, so
 * every id still has exactly one row and the wire ids do not move.
 *
 * Matching order is kernel-exact, driver, kernel-wildcard: a driver row such as
 * `engine.mismatch` must win over the kernel's `engine.*` fallback, while a
 * driver row can never shadow a kernel exact row.
 */

/** Namespace of the active browser profile; fixed kernel ids never use it. */
let activeNamespace = 'sandbox'
let driverRows = []

// Fully-qualified kernel ids: the `sandbox.*` prefix is the tool/environment
// surface, not a profile namespace, so the profile prefix never applies.
const KERNEL_FIXED = [
  { code: 'sandbox.instance.policy-stale', status: 409, cause: 'session 策略指纹与实例不一致', next: '显式 recreate，不要热改挂载' },
  // dnls.control/1 object surface (Q39.A(2)): fixed ids, never namespaced.
  { code: 'sandbox.contract_mismatch', status: 400, cause: '合同版本缺失或不匹配', next: '先 GET /contract 或 sandbox.contract 配对版本' },
  { code: 'sandbox.name_taken', status: 409, cause: '展示名已被其他受管对象占用', next: '换一个 name，或对原对象显式改名' },
  { code: 'sandbox.port_exhausted', status: 409, cause: '该服务的宿主端口预留不可用', next: '释放或调整预留后重试' },
  { code: 'sandbox.quota', status: 409, cause: '本 env/profile 的受管对象名额已满', next: '核配额；不逐出其他对象' },
  { code: 'sandbox.state_conflict', status: 409, cause: '对象状态或修订与请求冲突', next: '重新读取对象修订/操作后再试' },
  { code: 'sandbox.image_missing', status: 409, cause: '目标镜像或构建产物未备妥', next: '先备妥目标构建，再显式操作' },
  { code: 'sandbox.upgrade_failed', status: 500, cause: '已派发的后端升级失败', next: '查原 operation 与已完成步骤' },
  { code: 'sandbox.cdp.page-lost', status: 502, cause: '该实例的页面 socket 已丢失', next: '按 lastUrl 重开，不要复用旧 DOM' },
  { code: 'sandbox.profile.unknown', status: 404, cause: '请求的 profile id 未注册', next: 'sandbox.profile.list 列可用 profile' },
  { code: 'sandbox.selftest.unavailable', status: 502, cause: '自检无法在当前环境完成', next: '先 GET /status 修引擎/桥面' },
  { code: 'sandbox.params.', wildcard: true, status: 400, cause: 'MCP 工具参数非法（shape/required/type/enum/extra）', next: '对照 tools/list 的 inputSchema' },
]

const KERNEL_CODES = [
  { code: 'shot.fit', status: 400, cause: 'fit 不是 {width,height}', next: 'POST /shot {fit:{width,height}}' },
  { code: 'shot.empty', status: 502, cause: '引擎返回了空截图', next: '先 POST /open，再重试' },
  { code: 'history.body', status: 400, cause: 'history body 不是 {delta:±1} 或 browse-history 不是 {clear:true}', next: 'POST /history {delta:-1|1}' },
  { code: 'network.query', status: 400, cause: 'network 查询参数非法', next: 'GET /network?limit=1..200' },
  { code: 'dom.empty', status: 502, cause: '没有可序列化的文档', next: '先 POST /open' },
  { code: 'dom.blank', status: 502, cause: '页面仍是 about:blank', next: 'GET /status 看 phase' },
  // /res/* — the same-origin resource proxy behind the pane's native-HTML
  // preview. These ids are the "this is forbidden, not broken" face: a caller
  // must be able to tell a policy refusal from an unreachable upstream.
  { code: 'res.scheme', status: 400, cause: '资源代理只接受 http/https；file:/data:/javascript: 等一律拒绝', next: '把页面地址改成 http(s)；不要试图用 res 面读本地文件' },
  { code: 'res.host', status: 400, cause: '目标主机不合法或带了凭据（user:pass@）', next: '用纯 <host[:port]>；凭据不进代理' },
  { code: 'res.path', status: 400, cause: 'res 路径缺 <scheme>/<host>/<path>', next: 'GET /nano-local-sandbox/res/<http|https>/<host>/<path>' },
  { code: 'res.url', status: 400, cause: '无法组成合法的目标 URL', next: '检查 host/port 拼写' },
  { code: 'res.redirect', status: 502, cause: '上游 3xx 指向了不可代理的目标（非 http(s)）', next: '直接打开最终地址，不要依赖该跳转' },
  { code: 'res.size', status: 413, cause: '上游响应超过预览上限（24MiB）', next: '这不是下载面；换小资源或直接看引擎截图' },
  { code: 'res.timeout', status: 504, cause: '宿主侧取资源超时（15s）', next: '确认目标在宿主可达；不要用隧道把公网地址塞进来' },
  { code: 'res.upstream', status: 502, cause: '上游不可达或返回了错误状态', next: '先在宿主确认该地址可访问；body 里的 upstreamStatus 是上游真实状态' },
  { code: 'res.', wildcard: true, status: 502, cause: '资源代理失败', next: '看 errorId 细分：scheme/host/size/timeout/upstream' },
  { code: 'elements.empty', status: 502, cause: 'DOM.getDocument 没有文档根', next: '先 POST /open' },
  { code: 'body.toolarge', status: 413, cause: '请求体超过该路由上限', next: '拆小请求' },
  { code: 'body.', wildcard: true, status: 400, cause: 'body 不是 JSON 对象', next: '发送 JSON 对象' },
  { code: 'url.', wildcard: true, status: 400, cause: '地址不是 http(s)', next: '用完整 http(s) 地址' },
  { code: 'shot.(scroll|format)', wildcard: true, status: 400, cause: 'scroll 或 format 非法', next: 'POST /shot {scroll,format}' },
  { code: 'evaluate.(empty|toolong)', wildcard: true, status: 400, cause: 'expression 为空或超过 2000 字符', next: '缩短表达式' },
  { code: 'engine.', wildcard: true, status: 502, cause: 'CDP 连接失败', next: 'GET /status' },
  { code: 'control.bridge', status: 502, cause: '容器 MCP 桥不可达（humanHold/控制态读写失败）', next: 'GET /nano-local-sandbox/status 看 phase；桥健康走 ws://<bridgePort>/health 或 sandbox.bridge_health' },
  { code: 'control.(query|body)', wildcard: true, status: 400, cause: '/control 请求非法：action 不是 takeover|release，或 body 不是 JSON', next: 'POST /control {action:takeover} 或 {action:release}' },
  { code: 'control.', wildcard: true, status: 409, cause: '写所有权被占（另一个 MCP writer 或 humanHold）', next: 'sandbox.control {action:status} 看持有者' },
  { code: 'query.', wildcard: true, status: 400, cause: '查询参数非法（如 limit 不是数字）', next: '按路由文档修正查询参数' },
  { code: 'state.miss', status: 404, cause: '命名快照不存在', next: 'POST /state {action:"save",name} 先存一份' },
  { code: 'ref.miss', status: 404, cause: '@N 引用不在当前快照表里', next: 'GET /snapshot 重建引用表' },
  { code: 'interact.', wildcard: true, status: 400, cause: 'interact 目标/动作非法', next: '传 selector、@N 或坐标' },
  { code: 'evaluate.threw', status: 400, cause: '表达式在页内抛异常', next: '修正表达式后重试' },
  { code: 'evaluate.miss', status: 404, cause: 'evaluate 的 token 不在页内缓存（已过期或页面已导航）', next: '重新 POST /evaluate {expression} 取新 token；导航即失效' },
  { code: 'evaluate.', wildcard: true, status: 400, cause: 'evaluatePage 内的表达式异常（settings/state 等内部路径）', next: '检查表达式合法性' },
  { code: 'wait.query', status: 400, cause: 'wait 需要 selector|text|url|fn 恰一，load 属合法枚举', next: 'POST /wait {selector:"@1"} 或 {text}/{url}/{fn}；load: commit|domcontentloaded|load|networkidle' },
  { code: 'wait.timeout', status: 504, cause: '条件在期限内未成立', next: '换条件或加大 timeoutMs；超时不是取消，重发前先读 /status 的 navigation.outcome' },
  { code: 'lifecycle.state', status: 409, cause: 'lifecycle 动作与当前 phase 不符', next: 'GET /status 看 phase 再选动作' },
  { code: 'tool.unknown', status: 404, cause: '路由存在但该方法无对应工具', next: '对照 /mcp tools/list' },
  { code: 'network.missing', status: 404, cause: 'requestId 不在网络环形缓冲', next: 'GET /network 重列' },
  { code: 'edit.miss', status: 400, cause: 'edit 需要 selector 或 @N', next: 'POST /edit {selector,text}' },
  { code: 'edit.(selector|badtext)', wildcard: true, status: 400, cause: 'edit text 非 1..4000 或 selector 超 320', next: 'POST /edit {selector,text} 按边界重发' },
  { code: 'settings.unsupported', status: 400, cause: '设置的字段值无法真实生效（deviceScaleFactor 只接受 1，mobile 只接受 false）', next: '按支持面重发；看 capabilities.unsupported' },
  { code: 'settings.', wildcard: true, status: 400, cause: 'settings 字段值非法（viewport/extraHeaders/userAgent/media/locale/geo）', next: '按字段边界重发；看 capabilities.unsupported' },
  { code: 'storage.op', status: 400, cause: 'storage op 不是 read|set|delete|clear', next: 'POST /storage {scope,op:read|set|delete|clear}' },
  { code: 'state.name', status: 400, cause: "'__last__' 为保留快照名", next: '换名字；不带 name 保存即用隐式槽' },
  { code: 'pick.', wildcard: true, status: 404, cause: 'pick 目标不在页内（selector 无匹配 / 坐标无元素）', next: '换 selector 或先 GET /snapshot 取 @N' },
  { code: 'diag.stale', status: 502, cause: '诊断生产者尚未推送文档', next: '等 15s 或 POST /nano-local-sandbox/recover' },
  { code: 'params.', wildcard: true, status: 400, cause: 'MCP 工具参数非法', next: '对照 tools/list 的 inputSchema' },
  { code: 'navigate.egress', status: 504, cause: '目标站点出站超时（引擎 errorText=egress）', next: '换可达站点；不要重试同一地址' },
  { code: 'navigate.', wildcard: true, status: 502, cause: '导航失败或超时后引擎未完成', next: 'GET /status 看 navigation.outcome；超时不是取消' },
  { code: 'profile.', wildcard: true, status: 404, cause: '请求的 profile id 不存在', next: 'GET /profiles 列可用 profile' },
  { code: 'backend.cli', status: 502, cause: '容器 CLI 调用失败', next: '看 lastError 与 GET /logs；确认容器 CLI 可用' },
  { code: 'backend.timeout', status: 504, cause: '容器 CLI 调用超时', next: '先 GET /status 看容器面，再重试一次' },
  { code: 'selftest.', wildcard: true, status: 502, cause: '自检无法完成（引擎/桥不可达）', next: '先 GET /status 修引擎面' },
]

const escapeRe = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** `a.(x|y)` in the table is a deliberate alternation, not literal text. */
function patternOf(code) {
  return escapeRe(code).replace(/\\\(([^)]*)\\\)/g, (_, group) => `(?:${group.split('\\|').map(escapeRe).join('|')})`)
}

function rowFor(namespace, row) {
  const fixed = row.code.startsWith('sandbox.')
  const code = fixed ? row.code : `${namespace}.${row.code}`
  const match = row.wildcard ? `^${patternOf(code)}` : `^${patternOf(code)}$`
  return { match, example: code, status: row.status, cause: row.cause, next: row.next }
}

const NAMESPACE_RE = /^[a-z][a-z0-9-]{0,31}$/

function composeCatalog(ns, drivers) {
  return [
    ...KERNEL_FIXED.map((row) => rowFor(ns, row)),
    ...drivers.map((row) => rowFor(ns, { ...row, wildcard: row.wildcard === true })),
    ...KERNEL_CODES.filter((row) => !row.wildcard).map((row) => rowFor(ns, row)),
    ...KERNEL_CODES.filter((row) => row.wildcard === true).map((row) => rowFor(ns, row)),
  ]
}

function statusIn(catalog, id) {
  for (const row of catalog) {
    if (new RegExp(row.match).test(id)) return row.status
  }
  return 502
}

/**
 * One scoped, immutable catalogue per composition. Driver rows are copied at
 * build time, so loading another profile afterwards can never move the
 * prefix or the row set of a catalogue a caller already holds — the managed
 * object dispatch uses this instead of the global selection.
 */
export function createErrorCatalog({ namespace = 'sandbox', rows = [] } = {}) {
  const ns = typeof namespace === 'string' && NAMESPACE_RE.test(namespace) ? namespace : 'sandbox'
  const drivers = (Array.isArray(rows) ? rows : []).map((row) => Object.freeze({ ...row }))
  const catalog = Object.freeze(composeCatalog(ns, drivers).map((row) => Object.freeze(row)))
  return {
    errorNamespace: ns,
    errorCode: (code) => `${ns}.${code}`,
    errorCatalog: () => catalog.map((row) => ({ ...row })),
    statusOf: (id) => statusIn(catalog, id),
  }
}

/** Register the active profile's namespace and its driver-only rows. */
export function registerDriverErrors({ namespace, rows = [] } = {}) {
  if (typeof namespace === 'string' && NAMESPACE_RE.test(namespace)) activeNamespace = namespace
  driverRows = (Array.isArray(rows) ? rows : []).map((row) => ({ ...row }))
}

export function errorNamespace() {
  return activeNamespace
}

/** A profile-scoped error id: `dom.empty` → `<namespace>.dom.empty`. */
export function errorCode(code) {
  return `${activeNamespace}.${code}`
}

/** The single composed catalogue (kernel rows + driver rows). */
export function errorCatalog() {
  return createErrorCatalog({ namespace: activeNamespace, rows: driverRows }).errorCatalog()
}

export function statusOf(id) {
  return statusIn(errorCatalog(), id)
}

export function renderSkillTable(catalog = errorCatalog()) {
  return catalog.map((row) => `${row.example}\t${row.status}\t${row.cause}\t${row.next}`).join('\n')
}
