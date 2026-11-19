/**
 * Single error catalogue. kitesurf.* ids keep that prefix.
 * The only new namespace rows are the two sandbox.* ids.
 */
export const ERROR_CATALOG = [
  { match: '^kitesurf\\.shot\\.fit$', example: 'kitesurf.shot.fit', status: 400, cause: 'fit 不是 {width,height}', next: 'POST /shot {fit:{width,height}}' },
  { match: '^kitesurf\\.shot\\.empty$', example: 'kitesurf.shot.empty', status: 502, cause: '引擎返回了空截图', next: '先 POST /open，再重试' },
  { match: '^kitesurf\\.history\\.body$', example: 'kitesurf.history.body', status: 400, cause: 'history body 不是 {delta:±1} 或 browse-history 不是 {clear:true}', next: 'POST /history {delta:-1|1}' },
  { match: '^kitesurf\\.network\\.query$', example: 'kitesurf.network.query', status: 400, cause: 'network 查询参数非法', next: 'GET /network?limit=1..200' },
  { match: '^kitesurf\\.dom\\.empty$', example: 'kitesurf.dom.empty', status: 502, cause: '没有可序列化的文档', next: '先 POST /open' },
  { match: '^kitesurf\\.dom\\.blank$', example: 'kitesurf.dom.blank', status: 502, cause: '页面仍是 about:blank', next: 'GET /status 看 phase' },
  { match: '^kitesurf\\.elements\\.empty$', example: 'kitesurf.elements.empty', status: 502, cause: 'DOM.getDocument 没有文档根', next: '先 POST /open' },
  { match: '^sandbox\\.instance\\.policy-stale$', example: 'sandbox.instance.policy-stale', status: 409, cause: 'session 策略指纹与实例不一致', next: '显式 recreate，不要热改挂载' },
  { match: '^sandbox\\.cdp\\.page-lost$', example: 'sandbox.cdp.page-lost', status: 502, cause: '该实例的页面 socket 已丢失', next: '按 lastUrl 重开，不要复用旧 DOM' },
  { match: '^kitesurf\\.body\\.toolarge$', example: 'kitesurf.body.toolarge', status: 413, cause: '请求体超过该路由上限', next: '拆小请求' },
  { match: '^kitesurf\\.body\\.', example: 'kitesurf.body.json', status: 400, cause: 'body 不是 JSON 对象', next: '发送 JSON 对象' },
  { match: '^kitesurf\\.url\\.', example: 'kitesurf.url.scheme', status: 400, cause: '地址不是 http(s)', next: '用完整 https:// 地址' },
  { match: '^kitesurf\\.shot\\.(scroll|format)$', example: 'kitesurf.shot.scroll', status: 400, cause: 'scroll 或 format 非法', next: 'POST /shot {scroll,format}' },
  { match: '^kitesurf\\.evaluate\\.(empty|toolong)$', example: 'kitesurf.evaluate.empty', status: 400, cause: 'expression 为空或超过 2000 字符', next: '缩短表达式' },
  // engine.mismatch MUST precede the '^kitesurf\.engine\.' wildcard: the
  // catalog is order-sensitive, and the wildcard (502) used to swallow this
  // row's 409 — send() still answered 409 but statusOf/diagnostics lied.
  { match: '^kitesurf\\.engine\\.mismatch$', example: 'kitesurf.engine.mismatch', status: 409, cause: 'configure 目标的 devtools 指纹不是 Kitesurf 引擎', next: '确认端口指向 Kitesurf 容器，不要指向本机 Chrome' },
  { match: '^kitesurf\\.engine\\.', example: 'kitesurf.engine.connect', status: 502, cause: 'CDP 连接失败', next: 'GET /status' },
  { match: '^kitesurf\\.control\\.bridge$', example: 'kitesurf.control.bridge', status: 502, cause: '容器 MCP 桥不可达（humanHold/控制态读写失败）', next: 'GET /nano-local-sandbox/status 看 phase；桥健康走 ws://<mcpPort>/health 或 sandbox.bridge_health' },
  { match: '^kitesurf\\.control\\.held$', example: 'kitesurf.control.held', status: 409, cause: 'humanHold 生效中：人工接管了页面，agent 写类调用被拒', next: '人工点击「停止写入/释放」后重试；或等待人工完成' },
  { match: '^kitesurf\\.control\\.(query|body)$', example: 'kitesurf.control.query', status: 400, cause: '/control 请求非法：action 不是 takeover|release，或 body 不是 JSON', next: 'POST /control {action:takeover} 或 {action:release}' },
  { match: '^kitesurf\\.query\\.', example: 'kitesurf.query.limit', status: 400, cause: '查询参数非法（如 limit 不是数字）', next: '按路由文档修正查询参数' },
  { match: '^kitesurf\\.state\\.miss$', example: 'kitesurf.state.miss', status: 404, cause: '命名快照不存在', next: 'POST /state {action:"save",name} 先存一份' },
  { match: '^kitesurf\\.ref\\.miss$', example: 'kitesurf.ref.miss', status: 404, cause: '@N 引用不在当前快照表里', next: 'GET /snapshot 重建引用表' },
  { match: '^kitesurf\\.interact\\.', example: 'kitesurf.interact.selector', status: 400, cause: 'interact 目标/动作非法', next: '传 selector、@N 或坐标' },
  { match: '^kitesurf\\.evaluate\\.threw$', example: 'kitesurf.evaluate.threw', status: 400, cause: '表达式在页内抛异常', next: '修正表达式后重试' },
  { match: '^kitesurf\\.evaluate\\.', example: 'kitesurf.evaluate.exception', status: 400, cause: 'evaluatePage 内的表达式异常（settings/state 等内部路径）', next: '检查表达式合法性' },
  { match: '^kitesurf\\.wait\\.query$', example: 'kitesurf.wait.query', status: 400, cause: 'wait 需要 selector|text|url|fn 恰一，load 属合法枚举', next: 'POST /wait {selector:"@1"} 或 {text}/{url}/{fn}；load: commit|domcontentloaded|load|networkidle' },
  { match: '^kitesurf\\.wait\\.timeout$', example: 'kitesurf.wait.timeout', status: 504, cause: '条件在期限内未成立', next: '换条件或加大 timeoutMs' },
  { match: '^kitesurf\\.kite\\.state$', example: 'kitesurf.kite.state', status: 409, cause: 'kite 动作与当前 phase 不符或引擎不可达', next: 'GET /status 看 phase 再选动作' },
  { match: '^kitesurf\\.tool\\.unknown$', example: 'kitesurf.tool.unknown', status: 404, cause: '路由存在但该方法无对应工具', next: '对照 /mcp tools/list' },
  { match: '^kitesurf\\.network\\.missing$', example: 'kitesurf.network.missing', status: 404, cause: 'requestId 不在网络环形缓冲', next: 'GET /network 重列' },
  { match: '^kitesurf\\.edit\\.miss$', example: 'kitesurf.edit.miss', status: 400, cause: 'edit 需要 selector 或 @N', next: 'POST /edit {selector,text}' },
  { match: '^kitesurf\\.edit\\.(selector|badtext)$', example: 'kitesurf.edit.badtext', status: 400, cause: 'edit text 非 1..4000 或 selector 超 320', next: 'POST /edit {selector,text} 按边界重发' },
  { match: '^kitesurf\\.settings\\.', example: 'kitesurf.settings.viewport', status: 400, cause: 'settings 字段值非法（viewport/extraHeaders/userAgent/media/locale/geo）', next: '按字段边界重发；看 capabilities.unsupported' },
  { match: '^kitesurf\\.storage\\.op$', example: 'kitesurf.storage.op', status: 400, cause: 'storage op 不是 read|set|delete|clear', next: 'POST /storage {scope,op:read|set|delete|clear}' },
  { match: '^kitesurf\\.state\\.name$', example: 'kitesurf.state.name', status: 400, cause: "'__last__' 为保留快照名", next: '换名字；不带 name 保存即用隐式槽' },
  { match: '^kitesurf\\.pick\\.', example: 'kitesurf.pick.miss', status: 404, cause: 'pick 目标不在页内（selector 无匹配 / 坐标无元素）', next: '换 selector 或先 GET /snapshot 取 @N' },
  { match: '^kitesurf\\.dom\\.stale$', example: 'kitesurf.dom.stale', status: 502, cause: '该实例尚未捕获过 DOM', next: '先 GET /dom 或 POST /open' },
  { match: '^kitesurf\\.diag\\.stale$', example: 'kitesurf.diag.stale', status: 502, cause: '诊断生产者尚未推送文档', next: '等 15s 或 POST /nano-local-sandbox/recover' },
  { match: '^kitesurf\\.control\\.', example: 'kitesurf.control.busy', status: 409, cause: '写所有权被占（另一个 writer 或 humanHold）', next: 'sandbox.control {action:status} 看持有者' },
  { match: '^kitesurf\\.elements\\.stale$', example: 'kitesurf.elements.stale', status: 502, cause: '桥侧尚未收到 elements 推送', next: '先 GET /nano-local-sandbox/elements' },
  { match: '^kitesurf\\.history\\.stale$', example: 'kitesurf.history.stale', status: 502, cause: '桥侧尚未收到 history 推送', next: '打开页面后重试' },
  { match: '^kitesurf\\.selftest\\.stale$', example: 'kitesurf.selftest.stale', status: 502, cause: '尚未跑过 selftest', next: 'GET /nano-local-sandbox/selftest' },
  { match: '^kitesurf\\.backend\\.', example: 'kitesurf.backend.cli', status: 502, cause: 'container CLI 调用失败/超时（backend.timeout 同族）', next: 'GET /nano-local-sandbox/selftest；查 backend.lastError' },
  { match: '^sandbox\\.params\\.', example: 'sandbox.params.type', status: 400, cause: 'MCP 工具参数非法', next: '对照 tools/list 的 inputSchema' },
  { match: '^kitesurf\\.navigate\\.egress$', example: 'kitesurf.navigate.egress', status: 504, cause: '目标站点出站超时（引擎 errorText=egress）', next: '换可达站点；不要重试同一地址' },
  { match: '^kitesurf\\.navigate\\.', example: 'kitesurf.navigate.failed', status: 502, cause: '导航失败或超时后引擎未完成', next: 'GET /status 看 navigation.outcome；超时不是取消' },
  { match: '^sandbox\\.profile\\.', example: 'sandbox.profile.unknown', status: 404, cause: '请求的 profile id 不存在', next: 'GET /profiles 列可用 profile' },
  { match: '^sandbox\\.selftest\\.', example: 'sandbox.selftest.unavailable', status: 502, cause: '自检无法完成（引擎/桥不可达）', next: '先 GET /status 修引擎面' },
]

export const ERROR_STATUS = ERROR_CATALOG.map((row) => [new RegExp(row.match), row.status])

export function statusOf(id) {
  for (const [pattern, status] of ERROR_STATUS) {
    if (pattern.test(id)) return status
  }
  return 502
}

export function renderSkillTable(catalog = ERROR_CATALOG) {
  return catalog.map((row) => `${row.example}\t${row.status}\t${row.cause}\t${row.next}`).join('\n')
}
