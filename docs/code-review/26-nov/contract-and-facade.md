# 接口合同与 Facade 统一 —— 全插件接口审计与统一方案

| 项 | 值 |
|---|---|
| 日期 | 2026-11-12 |
| 范围 | 4 个 `dsh-nano-*` 插件 + `packages/` 下 6 个共享库 |
| 性质 | 接口合同（contract）与输入/输出门面（facade）审计 → 统一方案设计 |
| 方法 | 5-agent 并行深度审计（结构化 schema）+ 逐文件一手复核（`file:line` 证据） |
| 中间产物 | `.interface-audit/{nsw,ms,packages}.json`（结构化原始盘点） |
| 读者 | 改本仓任何接口、写注册表、定错误码的 agent |

> 本文件是**分析与方案文档**，不改任何代码。其中「错误码枚举」「注册表 schema」属于公共合同 —— 按 [`不得擅自扩约`]，落地前须经 [业主] durable 登记冻结，agent 不得自行实现反推。

---

## 0. 摘要（verdict 先行）

全仓 ~100 个接口面里，**只有 47 条宿主 HTTP 路由**有单一真源与 fail-closed 注册门；**另一半（window 全局、slot、host/client inject、skill、跨插件软依赖、浏览器/宿主状态）完全没有注册表、没有鉴权模型、没有统一错误面**。错误信封在三套键名间漂移，客户端调用面一半走共享 wrapper、一半是散装 `fetch` 站点。**结论：现状不可持续；统一注册表 + facade + 错误码是必要且顺水推舟的演进，但「未登记即禁止 push/build」必须分软硬两档落地，否则既违反 `不得过度仪式`、又无法真正生效。**

---

## 1. 调查方法

1. 先一手读 4 个 `src/host/route-table.js`（烤入常量）+ `packages/dsh-host-route-guard/src/route-guard.js` + 全部 gate 脚本。
2. 用 `workflow` 派 **5 个并行审计 agent**（每插件 1 + packages/gate 1），产出结构化 JSON（`.interface-audit/`）。
3. 对关键证据逐行 `read`/`grep` 复核，拒绝直接引用二手结论。
4. 口径统一：接口「面」= 任何一个可被调用/读取的边界（HTTP 路由、window 全局、slot、inject、skill、事件、存储、跨插件调用）。

---

## 2. 接口全景（注册表覆盖率）

| 插件 | host 路由 | window 全局 | slot | host inject | client inject | 其他（skill/event/state/跨插件） |
|---|---|---|---|---|---|---|
| `dsh-nano-notepad` | 7 | `__nanoNotepad`、`__ModuleLoader__`、`__perfReview`、`__NOTEPAD_VERSION__` | `shell.overlay` | webServer, connection, subprocess | 6 包 | mp-fetch seam、S3 SigV4、osascript、IDB v4、BroadcastChannel |
| `dsh-nano-explorer-extra` | 16 | `__perfReview`、`__ModuleLoader__` | `sidebar.right.pane.tab`(+title)、`contextMenu.icon` | fs, sessions, webServer, subprocess, sandbox, sandboxPolicy, connection, sessionPersistence | 7 包 | `/open-in-app/*` ×3、`dsh-resource://`、`window.__nanoNotepad` |
| `dsh-nano-shared-workspace` | 21 | **`__nsw={store,ctx,face}`**、`__ModuleLoader__`、`__perfReview`、`__NSW_VERSION__` | `shell.overlay`(SidebarGraft) | webServer, connection, credentials, workspaceRegistry | 6 包 | S3 marker/session、DOM graft、background timer |
| `dsh-nano-model-selector` | 3 | `__perfReview` | `conversation.input.model` | llm, webServer, connection, skills | 4 包 | `/imagine` skill、grok/codex subprocess、media-engine.json |
| **小计** | **47** | **~6 类** | **~7** | **19 项** | **23 包** | **~40 面** |

- **HTTP 路由数 47** 以 `scripts/route-scan.mjs` 为权威（烤入 `security/route-sensitivity.json`，21+16+7+3）。
- **已注册面：47 条 HTTP**；**未注册面：~50+**（其余全部）。
- `route-inventory.md` 自称「44 路由」、`feature-contract.json` 仅 43 行 —— **文档已漂移**（见 §6.3）。

---

## 3. 授权方式 —— 已统一一层，但只覆盖一半

### 3.1 HTTP 层（已统一）

所有 47 条路由都经 `dsh-host-route-guard`，它是**唯一** `ctx.webServer.register` 入口：

- `route-guard.js:218` — 每个请求先调 `conn.requestRejection?.(req)`；非 `undefined` 即 `statusCode=值; res.end()`（401/403 裸状态码空 body）。这是 Host/Origin 围栏 + 已认证 peer。
- `route-guard.js:160` — `ctx.get('connection')` 为空 → 抛 `no-connection`，**注册前就 fail-closed**。
- `route-guard.js:172` — `(path,method)` 不在烤入表 → `route-not-listed`；`:196` 表有而 spec 无 → `route-stale`；`:187` 字段冲突 → `route-drift`。

### 3.2 授权缺口（证据）

| 面 | 证据 | 问题 |
|---|---|---|
| `sessionBinding` | `route-guard.js:22`（注释）+ `:192-199`（仅台账） | **运行时不强制**；explorer `scopeOf`（`routes.js:63-91`）接受任意 `sessionId`，只 `console.warn` 一行 |
| `window.__nsw` | `index.js:501` `window.__nsw={store,ctx,face}` | 把**原始 cordis `ctx` + 可变 settings store** 给任意页内脚本，零鉴权 |
| `window.__nanoNotepad.import` | `panel.js:3358` | 页全局，无调用方约束，explorer 直接消费 |
| 跨插件 `/open-in-app/*` | `body.js:98,889,1149` | 请求经他人路由，**本插件代码里完全不可见**，注册表无从登记 |
| `dsh-resource://` URI | `body.js:354-391` | URI 模式是隐性合同，任何插件都能构造 |
| subprocess env | notepad `index.js:151-220`（osascript）、ms `lib/host-media.js`（grok/codex）、nsw（`git remote get-url`） | 无统一登记 |

### 3.3 小结

HTTP 授权收口在 guard，是唯一已统一的接缝；**非 HTTP 面没有任何鉴权/调用方模型**，注册表评审本应在这里先抓 `__nsw`。

---

## 4. facade / 输入输出 —— 约 50% 覆盖

| 方向 | 应有 facade | 实际 |
|---|---|---|
| 服务端→错误 | guard `sendJson` 统一 `{ok:false,reason}` | **handler 内部各写各的**，guard 只管自己 |
| 服务端→请求 | `readJsonBody(req,limit)` 已导出 | **多数 handler 不用**，自写 `jsonBody`/`readBody` |
| 客户端→调用 | 单一 `callApi()` | nsw `call()` + explorer `request()` 两套 + **~12 处散装 `fetch`** |
| 入口校验 | 共享 schema | 散装英文 `Error.message` 透传 |
| 远程对象 | `dsh-remote-data-schema` 白名单 | ✅ 唯一结构化 |

## 5. 请求 / 返回方式 —— 信封三重漂移 + 错误码失踪

### 5.1 服务端错误信封：三套键名并存（一手证据）

| 插件 | 行 | 信封 |
|---|---|---|
| `nsw` `routes.js` | `sendJson:189` → `:312,427,502` | `{ok:false,error:'<msg>'}`，且 `:502` 夹带 `code:'job-not-found'` —— **同文件内 `error`/`code` 两套键** |
| `explorer` `routes.js` | `sendJson:44` → `:581` | `400 {error:'<msg>'}` |
| `ms` `index.js` | `sendJson:109` → `:142,208,213` | `400/500 {error:'<msg>'}` |
| `notepad` `index.js` | `sendJson:96` → `:153,158,256,280` | `{ok:false,reason:'<ad-hoc>'[,message]}` |
| `guard` `route-guard.js` | `:226,233` | `{ok:false,reason:'<ad-hoc>'}` |

→ **`error` / `reason` / `code` 三个键 + 散装 ad-hoc 字符串，没有枚举，没有结构化码**。

### 5.2 客户端错误解析：三套各读各的键

| 客户端 | 行 | 读什么键 |
|---|---|---|
| nsw `call()` | `api.js:12-13` | `body.error` → `throw Error` |
| explorer `request()` | `workspace-store.js:43` | `payload.error` → `return {ok:false,message}` |
| ms 散装 fetch | `media.js:25,32,40`；`ModelSelector.jsx:201,211` | **不读错误键**，只认 `response.ok` |
| explorer 跨插件 fetch | `body.js:98,889,1149` | **绕过 `request()` 直接裸调**，响应体丢弃 |

→ 即使服务端统一，客户端也没有统一解析点；反之亦然。

### 5.3 其他请求/返回不一致

- `content-type` 校验只有 notepad `/save`、`/fetch-mp` 做（`index.js:280` 415）。
- 业务失败状态码漂移：nsw 用 `200 {ok:false}`、explorer 用 `400 {error}`。
- `413` 从不使用；超限一律 `500 'failed'`。
- 幂等几乎缺席：仅 nsw `workspaces/create` 收 `requestId`、`s3/object` 有 `ifMatch` ETag CAS、nsw switch 有 begin/commit/abort。

---

## 6. Case Study —— 最差案例

### 6.1 案例 A：`window.__nsw` 裸 `ctx` 泄漏（最差单点）

`dsh-nano-shared-workspace/src/client/index.js:501`：

```js
window.__nsw = { store, ctx, face }
```

- **无鉴权**：任何页内脚本（含其它插件、被注入的 `__perfReview` 探针、浏览器 console、甚至某个被妥协的第三方 bundle）都能拿到**活的 cordis `ctx`**——它握着 `credentials`、`workspaceRegistry`、`webServer` 等 host 服务的直接引用。
- **可变**：`store` 是 settings 的 mutable store，可任意 `store.set(...)`；`face` 暴露全部上层调用。
- **无登记**：这条面不在任何台账里——`route-sensitivity.json`/`feature-contract.json` 只管 HTTP，window 全局完全瞎。
- **演进风险**：`__nsw` 一旦被人依赖，就成了**无法回收的公共 API**。今天它只挂在测试与调试路径上，明天某个外部脚本开始 `__nsw.ctx.get('credentials')`，这条接口就被锁死，而安全评审从未见过它。

### 6.2 案例 B：三重错误信封 + 未登记的跨插件调用（最差系统点）

`explorer/src/client/body.js` 同时暴露三件事：

```js
// :98     裸 fetch /open-in-app/apps        —— 其它插件的路由，本仓注册表不可见
// :889    裸 fetch /open-in-app/open        —— 同上，响应体整个丢弃
// :905    await window.__nanoNotepad.import(...) —— notepad 的页全局，隐性软依赖
// :151    request('/status', ...)            —— 走 request() wrapper，读 payload.error
```

同一文件里四种调用风格并存：自己的 `request()` wrapper、裸 `fetch` 到别人家的路由、裸 `fetch` 到别人家的页全局、以及 `dsh-resource://` URI 拼接（`:354`）。**当 `/open-in-app` 改键名或 `__nanoNotepad.import` 换签名时，没有任何一处会 fail，而错误面五花八门**（`payload.error` vs `body.error` vs 丢弃 vs URI）。

### 6.3 为什么不可持续（长期影响）

1. **注册表已漂移，无闸**：`check-route-sensitivity` 此刻 PASSING（47 路由），但 `check-feature-contract` **FAILING 4 条 stale 行**，`route-inventory.md` 自称 44 —— **没有任何机制在 build/push 时拦它**。双份真源 + 无强制点 = 必然腐烂。再加一条路由，文档再漂一次，没人发现，三个月后「注册表」沦为谎言。
2. **错误码失踪 = 客户端无法统一处理**：`error`/`reason`/`code` 三键并存意味着任何一条新调用都要重新实现错误解析；想加统一重试/统一幂等 key/统一提示，**没有单一挂点**。
3. **非 HTTP 面零登记 = 隐性 API 锁定**：`__nsw`、`__nanoNotepad`、`/open-in-app`、`dsh-resource://`、slot 注入点、host 状态文件、subprocess/env seam —— 这些才是插件间真正会耦合、会破接口的地方，却恰好全部落在注册表盲区。下一个插件照抄 `__nsw` 模式，又多一条无法回收的泄漏。
4. **无 gate = `不得过度仪式`/`不得擅自扩约` 都失效**：接口悄悄增生、悄悄漂移，业主无法在合同层看到变化。

---

## 7. 完整解决方案（台账化）

| # | 件 | 形态 | 真源 | 检查点 |
|---|---|---|---|---|
| 1 | `security/interface-registry.json` | JSON 单一真源：47 HTTP + 全部非 HTTP 面 | 手写 + `scan` 生成 HTTP 段 | `check-interface-registry.mjs` |
| 2 | `packages/dsh-interface` | 共享 devDep：统一信封 + 错误码 + `callApi` | `src/` | node --test |
| 3 | `dsh-host-route-guard` 演进 | 消费新注册表 + 拦 `ApiError` | 现有 | `route-*.test.mjs` |
| 4 | `check-interface-registry.mjs` | 新增 drift gate（全 kind） | registry | **接进 `npm run build`** |
| 5 | `git` `pre-push` 钩 | 软拦截（husky/lefthook） | registry | advisory，可 `--no-verify` |
| 6 | `gen-interface-inventory.mjs` | 从真源生成人类可读清单（替代手写 `route-inventory.md`） | registry | 文档不再漂移 |

---

## 8. 统一 facade 设计

### 8.1 服务端 —— `dsh-interface` + 演进后的 route-guard

```js
// packages/dsh-interface/src/host.js
export class ApiError extends Error {
  constructor(code, message, httpStatus = 400) { super(message); this.code = code; this.httpStatus = httpStatus }
}
export const sendOk  = (res, data)              => sendJson(res, 200, { ok: true, ...data })
export const sendFail= (res, code, message, s=400)=> sendJson(res, s, { ok:false, code, message })
export { readJsonBody }                          // 复用 guard 的 readJsonBody
```

- handler 只 `throw new ApiError('scope:no-session', 'sessionId is required')`；guard 统一捕获 → `{ok:false,code,message}` + `httpStatus`；未识别 `Error` → `sys:failed` + 500。
- 成功统一 `{ok:true, ...payload}`（保持现有 spread 习惯，向后兼容）。
- 请求入口统一 `readJsonBody(req, route.bodyLimit)`，不再自写。

### 8.2 客户端 —— 单一 `callApi`

```js
// packages/dsh-interface/src/client.js
export async function callApi(prefix, path, { method='GET', body, params } = {}) {
  const res = await fetch(prefix+path+qs(params), { credentials:'same-origin', cache:'no-store',
    method, headers: body?{'content-type':'application/json'}:undefined, body: body&&JSON.stringify(body) })
  const p = await res.json().catch(()=>({}))
  if (!res.ok || p.ok === false) throw new ApiError(p.code ?? `http:${res.status}`, p.message ?? res.statusText)
  return p
}
// 用法：api.call('/status', {params:{sessionId}})  —— 任何插件同一封装、同一错误、同一挂点
```

→ 替代 nsw `call()`、explorer `request()`、以及全部散装 `fetch` 站点；错误解析只此一处。

### 8.3 非 HTTP 面 facade

- `window.*` 全局：改为**命名空间 + 显式注册**（`dsh-interface` 提供 `exposeApi(ns, api)`），禁止裸挂 `ctx`；`__nsw`/`__nanoNotepad` 收窄为只暴露白名单方法。
- 跨插件调用：改经 `callApi(prefix,...)` + 注册表 `cross-plugin` 行，URI/路径不再散写。

---

## 9. 统一 error-code 设计

### 9.1 信封（业主冻结）

```json
成功: { "ok": true,  ...payload }
失败: { "ok": false, "code": "<domain>:<kebab>", "message": "<human-readable>" }
```

- `code` 唯一机器键；`message` 永远只是给人看的，客户端**不得**据 `message` 分支。
- 业务失败**统一 HTTP 4xx/5xx 语义**（不再 `200 {ok:false}`）：校验错 400、auth 401/403、not-found 404、conflict/CAS 409、too-large 413、unsupported 415、上游失败 502。

### 9.2 命名空间 + 枚举（kebab-case，与 `schema:*`/`route-*` 风格一致）

| domain | 含义 | 枚举 |
|---|---|---|
| `req:` | 请求非法 | `bad-json`, `body-too-large`, `missing-field`, `bad-value`, `bad-content-type` |
| `auth:` | 认证/授权 | `host-origin`, `unauthenticated`, `cross-session`, `not-member`, `forbidden` |
| `scope:` | 工作区/会话解析 | `no-session`, `no-cwd`, `outside-workspace`, `git-fence`, `not-found` |
| `cap:` | 能力/方法 | `method-not-allowed`, `unsupported`, `not-configured` |
| `dep:` | 依赖/上游 | `git-failed`, `s3-failed`, `fetch-failed`, `schema:<field>`（沿用 SchemaReject） |
| `sys:` | 内部 | `failed`, `unavailable`, `timeout` |

### 9.3 现状 → 枚举映射（节选）

| 现状字符串 | 统一 code | HTTP |
|---|---|---|
| `route-not-listed`/`route-stale`/`route-drift`/`no-connection` (guard) | `sys:failed`（注册期） / `cap:method-not-allowed`（405） | — |
| `'request body is too large'` | `req:body-too-large` | 413 |
| `'sessionId is required'`/`'unknown session'` | `scope:no-session` | 400 |
| `'this session has no working directory'` | `scope:no-cwd` | 400 |
| `'... is outside the workspace'` | `scope:outside-workspace` | 403 |
| `'writes inside .git are refused'` | `scope:git-fence` | 403 |
| `'content-type'` (415) | `req:bad-content-type` | 415 |
| `'cancelled'` / `'unsupported'` (notepad) | `cap:unsupported` / `sys:failed` | 400/500 |
| `'not-configured'` / `'incomplete'` / `'unreachable'` (s3) | `cap:not-configured` / `dep:s3-failed` | 400/502 |
| `'not-mp-url'`/`'fetch-failed'`/`'too-many-redirects'`/`'not-article'` (mp) | `req:bad-value` / `dep:fetch-failed` / `dep:fetch-failed` / `dep:fetch-failed` | 422/502 |
| `S3Error{op,status,code}` (s3-client) | `dep:s3-failed` + 透传 `code` detail | 502 |
| `{ok:false,error:'...',code:'job-not-found'}` (nsw) | `dep:s3-failed` / `scope:not-found` | 404 |

枚举内容属公共合同，**须经 [业主] 冻结后**写进 `dsh-interface/src/codes.js` 单一导出。

---

## 10. 统一 API 注册系统

### 10.1 `security/interface-registry.json` 单一真源

```json
{
  "version": 1,
  "http":   [ { "plugin","path","methods","sensitivity","capability","bodyLimit","sessionBinding","justification","request","response","errors" } ],
  "clientApi": [ { "plugin","name","signature","auth","invocation","errors" } ],
  "windowGlobal": [ { "plugin","name","exposes","auth" } ],
  "slot": [ { "plugin","slot","key","auth" } ],
  "hostInject": [ { "plugin","inject","usage" } ],
  "clientInject": [ { "plugin","package","ctxKey" } ],
  "skill": [ { "plugin","skill","boundary" } ],
  "crossPlugin": [ { "from","to","via","contract" } ],
  "state": [ { "plugin","kind":"idb|localStorage|file|env","name","auth" } ]
}
```

- `http` 段 = 现 `route-sensitivity.json` 演进版（合并 responseShape/契约字段），由 `route-scan.mjs` 生成 + 手审字段。
- 其余段 = **清单申报制**（正则抓不了 `window.*`/`ctx.*`），每插件在 `src/interface.registry.mjs` 声明 → 合并入总表。

### 10.2 工作流程（declare → generate → check → bake → gate）

```
写/改接口 ──► 更新本插件 src/interface.registry.mjs（非HTTP面）
              │
   gen-interface-registry.mjs ──► security/interface-registry.json（唯一真源）
              │
   check-interface-registry.mjs ──► ①HTTP 行↔route-scan 全对
                                   ②非HTTP 行↔各 registry.mjs 全对
                                   ③每条 errors 都用枚举里的 code
              │
   build-client.mjs ──► ①先跑 check，drift→硬失败
                        ②把本插件接口行烤进 lib/interface-table.js
              │
   dsh-host-route-guard（运行时）──► (path,method) 不在烤表→拒绝注册
              │
   git pre-push 钩（软）──► check 不过→提示，可 --no-verify
```

### 10.3 硬性 vs 软性 —— 对 `不得过度仪式` 的诚实裁决

| 闸点 | 能真正拦吗 | 建议档位 |
|---|---|---|
| `npm run build` | ✅ 唯一本地硬执行点 | **硬**：drift → build 失败 |
| route-guard 运行时 | ✅ 已 fail-closed（仅 HTTP） | 保持；扩到新表 |
| `pre-push` git 钩 | ❌ `git push --no-verify` 一句绕过，且管不到远端 | **软**：advisory + 文档 |
| CI | ❌ 本仓无 CI（release.yml 已清，业主不走 GitHub CI/CD） | 不建 |

→ 「未登记接口立即禁止 push」**只能做到 soft advisory**；硬门唯一落地处是 `npm run build` + 运行时 guard。对业主的「立即禁止 push + build」：如实告知 push 拦截是软约定，硬执行点是 build。

---

## 11. Verdict

1. **必要性成立**：约一半接口面（非 HTTP）零注册、零鉴权、零统一错误面；HTTP 面虽有 guard 收口，错误信封与客户端调用仍三/四套并存；注册表文档已在漂移（`feature-contract` FAILING、`route-inventory` 过期）。再不统一，隐性 API（`__nsw`、`__nanoNotepad`、`/open-in-app`、`dsh-resource://`）将锁死演化路径。
2. **方案顺水推舟**：`route-scan → route-sensitivity.json → guard` 这条链已证明「单一真源 + 烤入 + fail-closed」可行；把它扩成全 kind 注册表、补 `dsh-interface` 信封与 `callApi`、冻结错误码枚举，是低成本高价值演进。
3. **须分软硬**：`npm run build` 硬接 check、运行时 guard 硬拦（已有）—— 真生效；`pre-push` 只给 advisory —— 诚实不装硬门。
4. **前提**：`interface-registry.json` schema 与错误码枚举是公共合同，[业主] durable 冻结后方可实现；`window.__nsw` 这类裸 `ctx` 泄漏应在同一轮收窄。
