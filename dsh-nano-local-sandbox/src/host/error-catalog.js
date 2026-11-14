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
  { match: '^kitesurf\\.engine\\.', example: 'kitesurf.engine.connect', status: 502, cause: 'CDP 连接失败', next: 'GET /status' },
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
