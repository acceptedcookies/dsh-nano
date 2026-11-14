# DNK vs ego 自动化体系：三方差距分析报告

> 基线版本：DNK @ `68399dd`（dev/desktop 部署一致，e2e 23/23）。ego 侧 = ego lite 0.6.2.9（ego-browser CLI，Chromium 156 + Node 24）+ agent-browser 0.42.0（DNK 容器内嵌的同一 npm 包，Rust 原生 CLI）。
> 取证方式：四路并行只读代码审查 + lead 交叉核验（route 表逐条数、errorId 真表对账、resourceBase 机制验证、perf 开关顺序复现、二进制 strings/`--help`/`tools/list` 实测）。
> 本报告只列已核实结论；子代理误报已剔除（见 §5 勘误）。

---

## 0. 先厘清一个关键事实：这是两套独立体系

「ego-browser 的 MCP」在字面上不存在——本机实测：

| 层 | 真身 | 自动化协议 | 与 DNK 的关系 |
|---|---|---|---|
| **ego-browser** | Chromium `ego_cli` 组件，经 Mojo named-channel IPC 连 ego lite.app | `nodejs` REPL（TaskSpace/Page API）+ `import`/`skill`/`upgrade` CLI；**无 MCP、无 daemon** | 无代码共享；但它是「agent 与人类共用同一浏览器」的成熟范式（ownership/handOff/用户批准） |
| **agent-browser** | vercel-labs 独立 Rust CLI，daemon→CDP 控 Chrome | CLI ~90 子命令 + `mcp` stdio JSON-RPC（8 档 tool profile，core=33 / all=160 工具） | **DNK 容器内嵌的就是它**：`mcp-bridge.mjs` 每连接 spawn `agent-browser mcp` 透传 + 13 个本地 `kitesurf_*` 工具 |

所以正确的对比是：**agent-browser（CLI+MCP）与 ego 的 TaskSpace/Page 语义模型** vs **DNK（24 HTTP 路由 + bridge MCP + workerd 引擎）**。ego 的贡献是「人机共存与所有权语义」，agent-browser 的贡献是「自动化命令面 + MCP 协议完备性」。

### DNK 的真实接口面（已核实）

- **HTTP**：`src/host/route-table.js` 共 **24** 条路由（子代理报 26 系误读，按文件实际计数）。
- **MCP**：`ws://…/mcp` → bridge 本地应答 13 个 `kitesurf_*` 只读诊断工具 + 透传 `agent-browser mcp`（默认 core 档 33 工具，**但大部分在 workerd 引擎上无法工作**，见 §1）。
- **CDP 子集**：`lib/engine.js` 全文件仅调用 **8 个域 17 个方法**——Target(3)/Page(4)/Runtime(2)/Log(1)/Network(2)/DOM(2)/CSS(2)/Emulation(4)。**未出现的域**：Input、Accessibility、Fetch、Tracing、Profiler、Performance、DOM.getBoxModel、Page.printToPDF/screencast/javascriptDialogOpening、Target.createBrowserContext、Network.getCookies/getResponseBody。

---

## 1. 自动化调试接口缺口

### 1.1 判定逻辑

DNK 当前定位 = **「可观测的单页渲染投射 + 诊断」，不是「可自动化」**。agent-browser 的自动化闭环 `snapshot → interact → wait → verify` 在 DNK 上**三环全断**：

1. **snapshot 断**：没有 a11y 树 + `@ref` 可读化（`Accessibility.getFullAXTree` 未实现；`/dom` 只给 outerHTML 前 4KB，`/elements` 是 ≤220 节点扁平列表，无 role/name/ref）。
2. **interact 断**：没有 `Input.dispatch*` 域，没有 click/fill/type/press/hover/select；`/edit` 只是「就地改字」不是事件，`/pick` 是只读探测。
3. **wait 断**：没有 wait_for_selector/text/url/load/function/networkidle；`/open` 固定 45s，其余靠 agent 自轮询 sleep。

外加三个结构性断点：**认证态不可保存**（无 cookie/storage 面，suspend 即丢）、**网络不可拦截**（无 Fetch 域，无法 mock/offline/throttle）、**会话不可隔离**（单页引擎 + 每连接一条独立 browser socket——第二个 agent 一连上来就可能抢/重置人类正在看的页面）。

### 1.2 能力域差距矩阵（摘选，完整 24 域见子代理取证）

| 能力域 | agent-browser/ego | DNK | 严重度 | 实现路径 |
|---|---|---|---|---|
| a11y snapshot + @ref | `snapshot -i/--delta`、ego `page.snapshot()` | 无 | **阻塞** | P1：workerd 实现 `Accessibility.getFullAXTree`；P0 兜底：host 注入 a11y-walker 生成 ref 表（复用 `putRef/getRef` ref 机制） |
| 元素交互 | click/fill/type/press/hover/select/drag + find role/text/label/testid | 无 | **阻塞** | P0：`Runtime.evaluate` 合成事件 + native setter（80% 场景）；P1：workerd `Input.*` + `DOM.getBoxModel/scrollIntoViewIfNeeded` |
| 等待原语 | `wait --text/--url/--load/--fn/--download` | 无 | **阻塞** | **P0 纯 host 可实现**：evaluate 轮询 + 现有 `frameNavigated`/`Network.*` 环缓冲判定；`/wait` 路由 + `kitesurf_wait` 工具，**不需要引擎改动** |
| JS 执行 | `eval` 无界/文件/`--base64` | `/evaluate` ≤2000 入 ≤4000 出 | **阻塞**（兜底手段全被截断） | P0：分段返回 + `awaitPromise` + objectId 续取 |
| 网络观测 | `network_requests`（含 body）+ HAR | `/network` 仅元数据 | **阻塞** | P0：ring→HAR 组装（body 先留空）；P1：workerd `Network.getResponseBody` |
| 拦截/mock/离线 | `network route/unroute`、`set_offline`、`emulateNetworkConditions` | 无 | **阻塞** | 仅 P1：workerd `Fetch.*`（唯一正确拦截层） |
| cookie/storage/认证态 | `cookies_*`、`storage_*`、`state_save/load`、`auth` vault | 无；`/settings` 显式禁 cookie | **阻塞** | P0：evaluate 封装 local/sessionStorage + `document.cookie`（HttpOnly 拿不到）；P1：workerd cookie jar + `Target.createBrowserContext` |
| 多页/tab/会话 | `tab_*`、`--session` 隔离、TaskSpace ownership/handOff | 单页共享，无所有权协议 | **阻塞** | P0：bridge 对写类 tools/call 串行化互斥；P1：workerd 多 target + context；同时引入 ego 式「agent 持有/交还控制权」语义（`waitForControl`/`handOff` 对应物） |
| 对话框 | `dialog_status/accept/dismiss` | 无 | 效率 | P1：workerd `Page.javascriptDialogOpening` |
| 上传/下载 | `upload`、`download`、`wait_for_download` | 无 | 效率 | P1：`DOM.setFileInputFiles` + `Page.setDownloadBehavior` |
| 页面性能 | `trace/profiler/vitals`（Tracing/Profiler 域） | 无页面级指标 | 效率 | P0：`performance.getEntries*`/`PerformanceObserver`/`memory` 经 evaluate 采集；Tracing/Profiler workerd 大概率不可行，**接受降级** |
| 截图/PDF/录像 | screenshot/PDF/screencast/record | `/shot` 已较好（webp/fit） | 锦上添花 | P2：`Page.startScreencast`（若引擎支持）替代轮询 |
| console/errors | `console/errors` | `/console` + `kitesurf_console` | ✅ **唯一持平** | — |
| 仿真 | geo/timezone/locale/device | UA/viewport/media/extraHeaders ✅ | 效率 | P1：workerd 补三个 `Emulation.set*` |

### 1.3 实现路径总纲（按 ROI）

**P0（纯 host/bridge 侧，不碰 workerd，先做）**
1. `/wait` 路由 + `kitesurf_wait`：selector/text/url/fn/networkidle 全部可用现有事件环 + evaluate 轮询实现。
2. `evaluate` 放宽：分段返回、objectId 句柄、awaitPromise。
3. storage/cookie-lite：evaluate 封装的读写/导出/导入路由。
4. a11y-lite + interact-lite：注入 walker 建 ref 表 → `kitesurf_snapshot`/`kitesurf_interact` 桥内工具。
5. bridge 写类调用互斥锁（`answerNativeTool` 拦截点现成）。
6. HAR 组装导出。

**P1（需要 workerd 引擎扩 CDP 域，按依赖排序）**
`Input.dispatch*` + `DOM.getBoxModel` → `Accessibility.getFullAXTree` → `Network.getResponseBody` + `getCookies/setCookies` → `Fetch.*` → `Page.javascriptDialogOpening` → `Target.createBrowserContext` + 多 target → `Page.addScriptToEvaluateOnNewDocument` → `DOM.setFileInputFiles` + `Page.setDownloadBehavior` → `Emulation.set{Geo,Timezone,Locale}Override`。

**P2（workerd 架构边界，接受降级或替代）**
Tracing/Profiler（workerd 非 V8 宿主）→ 用 `performance.*` evaluate 采集补 vitals；printToPDF/screencast → 截图轮询近似；WebGPU/headed → 架构不适用。

**ego 式所有权语义（独立建议）**：DNK「共享单页」最缺的不是多页，而是**控制权的显式归属**。建议参考 ego 的 `ownership: agent|user` + `waitForControl()/handOff()`：bridge/宿主给页面打一个「当前控制者」标记，agent 写操作前声明持有，超时/用户点击自动交还——这是「多 agent/人机混用不互相踩」的最小契约，比「多 target」便宜得多。

---

## 2. Skill 与接口说明完整度缺口

### 2.1 判定

DNK 的 skill 在**错误目录真源化 + 测试防漂移**上已反超 ego 的手工文档（`ERROR_CATALOG` 单源三处派生、`skill.test.mjs` 逐字符比对、§6 正负例、§7 决策树——这些都是 ego 没有的硬约束），但在**接口覆盖度**与**渐进披露**两条线上系统性落后。

### 2.2 已核实的契约级缺口（S0）

1. **24 条路由中 6 条未逐条文档化**：`/dom`、`/elements`、`/selftest`、`/network`、`/browse-history`、`/perf-report`（SKILL.md 只给主流程路由；这些在 route-table 里都有完整 sensitivity/justification，唯独没有 agent-facing 文档）。AGENTS.md 路由表只列 15 条同样缺口。
2. **ERROR_CATALOG 漏 5 个 host 侧真实 throw id**：`history.body`、`network.query`（两个输入侧 400，未入表会兜底成 502 误诊）+ `shot.empty`、`shot.fit`、`dom.blank/dom.empty`、`elements.empty`（502 类，但 `shot.empty`/`dom.empty` 值得明示）。另有 4 个 bridge 本地 id（`diag.stale`/`history.stale`/`dom.stale`/`elements.stale`/`selftest.stale`/`tool.unknown`）应单独登记为「MCP 层错误」，现在既不属 host catalog 也无独立表。
3. **MCP 事实过期**：SKILL.md §8 写「6 个 `kitesurf_*` 工具」实际 13 个（`kitesurf_history/dom/elements/selftest/network` 五个未提及）；「33 个 `agent_browser_*`」未经对账。
4. **MCP 入口零引导**：没有文档告诉 agent 走 `ws://…/mcp` 时工具名前缀、native 工具的 inputSchema、MCP 能做而 HTTP 不能做的（反之 `kitesurf_elements` 的 description 自己承认是快照缓存版，得回 HTTP `/elements?selector=`）。

### 2.3 结构性缺口（S1/S2）

- **无渐进披露**：232 行单文件一次全量进上下文（~14KB），`design-mode-feedback.md` 自己记录过「skill 吃 token」的痛点。ego/agent-browser 是「短入口 + `--ref` 按需加载 10 篇 references + 场景 skill + 可执行 templates」。
- **无按场景 recipe**：DNK 的核心任务环「人类点选 → composer `[kitesurf]` note → agent 解析 → 回写/验证」没有一条端到端配方。
- **无分主题 reference**：端口自愈四规则、共享单页状态模型、导航竞态/幂等义务挤在 §8 一锅炖；缺独立的「snapshot/ref 定位」「容器/端口 playbook」「认证会话管理」专题。
- **无模板**：无 `probe.sh` 排障序列脚本、无 design-feedback 报告模板（ego `dogfood-report-template.md` 的直接对应物）。
- **元数据缺位**：frontmatter 无 `version`/`date`，未教 agent 用 `/status.buildId` 自检「文档与运行体是否同代」。
- **`nano-kite` skill 过薄且与 kitesurf-cdp 深度不一致**：19 行缺 `/selftest`、`/ports`、configure 后 `mcpPort` 只在下次建容器生效的排障分支。

### 2.4 可行机制（已验证）

`ctx.skills.register` 支持 `resourceBase:{kind:'directory',path}`，dsh 会把 `Base directory` 提示注入 `<skill_resources>`，agent 可按相对路径取 references——**分层所需机制全部就绪，缺的只是 `lib/skill.js` 从单文件生成器改成 skill 包生成器**。

建议的 skill 包结构（生成器配套改动）：

```
skills/kitesurf-cdp/
  SKILL.md                     # ≤90 行：探针 + socket + 驱动 + Do-not + Load-more 表
  references/
    routes.md                  # 24 路由逐条（从 ROUTE_TABLE build 时对账路径集合）
    observability.md           # ERROR_CATALOG 全表 + bridge 本地错误表 + span 名 + 参数取值域
    mcp-bridge.md              # 13 个 kitesurf_* 工具 schema + 透传说明 + 帧尾 \n
    element-packets.md         # pick note 字段/chip/ref 环/漂移检测
    recovery-playbook.md       # 端口自愈/自愈/状态模型/幂等
    recipes.md                 # 5 条端到端配方
    emulation.md               # /settings 全字段 + letterbox/dsf 坐标
  templates/probe.sh、feedback-report.md
skills/nano-kite/SKILL.md      # 保持薄，补齐 selftest/ports，引用 recovery-playbook
```

生成器要点：① `SKILL_BODIES` 改「一 skill 一路径→文件 map」；② build 时把 `ROUTE_TABLE` path 集合与 `KITESURF_TOOLS` 名集合**断言**进对应 reference（杜绝「6 vs 13」漂移）；③ test 增加「扫描全部 `KitesurfError('…')` 字面量 → 必须命中 catalog 或显式登记」防回归；④ 注册处补 `resourceBase`；⑤ frontmatter 注入 `version`/`date` 从 `package.json` 烙入。

---

## 3. 执行层缺口（容器后端 + 前端 perf + 优化手段）

### 3.1 已核实的真 bug（优先级最高）

1. **`config.perfReview` 开关静默失效**：`packages/dsh-performance-review/src/host.js:117` `decideEnabled` 在**首次 `hostJoin`（import 期）**一次性冻结 `enabled`；`index.js` `apply()` 在之后才设 `DSH_PERF_REVIEW='1'`——除非进程启动前就有外部 env，config 永远是假开关。（复现：`lib/perf-host.js` 顶层 `ensurePerfReviewHost()` 即冻结。）
2. **每 MCP 连接 spawn 一个 `agent-browser mcp` 子进程**（`mcp-bridge.mjs:362`）：最坏 8 个常驻进程 + **每个子进程持有独立 browser socket**——与 skill 明示的「browser socket 一关 → 页面打回 about:blank」语义叠加，MCP 连接断开可能重置人类正在看的页面。这是隐藏的正确性地雷，先验证作用域（按 socket 还是按全局），再定改造（进程池/桥内原生实现热工具）。
3. **诊断推送每 30s 带 `container inspect`**（`index.js:565→544→427`）：空闲也 spawn 外部 CLI；推送载荷应分「轻推送（去 ports/selftest）/全量路由」两档或结果缓存 ≥60s。

### 3.2 容器后端缺口（按 ROI）

| # | 缺口 | 证据 | 建议 |
|---|---|---|---|
| a1 | **监督不对称**：mcp-bridge 有 while 自拉起，workerd/wrangler `exec` 崩即容器死 | `entrypoint.sh:12 vs :34` | P1：wrangler 也进重启循环（退避+计数+退出码落 `/tmp/kitesurf-state/`）；bridge `/health` 报 `restarts/lastExit` |
| a2 | 每连接一进程 + socket 重置页 | `mcp-bridge.mjs:362`、SKILL.md:231 | P1 验证作用域；P2 桥内原生热工具或子进程池 |
| a3 | 30s 推送含 `container inspect` | `index.js:565` | P1：载荷瘦身/缓存 |
| a4 | bridge 无反查，host 挂后快照陈旧 | `mcp-bridge.mjs:445` | P3：快照 TTL 标记/反拉兜底 |
| a5 | 无容器内崩溃取证管道 | stderr-only | P2：重启事件落状态文件进 `/diagnostics` |
| a6 | **镜像 343MB**：5 个非 linux-arm64 二进制 ~91MB + sharp + musl 全量 COPY；base 未 pin digest | `du linux-prefix`、`Dockerfile:10,16` | P1：linux-prefix 剪枝 + `FROM …@sha256:` |
| a7 | `-c 4 -m 4G` 硬编码 | `container-engine.js:40` | P2：env/config 参数化 |
| a8 | 引擎死被动感知（仅路由触发 adopt/degrade） | `index.js:605` | P2：低频 watchdog 复用 pushTimer 节奏 |
| a9 | CDP 单 socket 串行，断线只重试一次 | `engine.js:207,423` | P2：断线 re-attach + page handle 恢复 |
| a10 | navigate 挂起期间全部排队 | `engine.js:17` NAVIGATE_MS=45s | P3：`Page.stopLoading` 逃生门 |

### 3.3 前端 perf-review 监控缺口

- **span 覆盖**：24 条路由只 ~13 处 `hostSpan` 包裹；最高频的 `status-probe`、`ports-inspect`、`diag-build`、`recover`、`browse-history` 全裸奔。client 侧只 2 个点（`pane-op`/`navigate`），库提供的 `track`/`count`/`profiler` 全没用。
- **统计可用性**：`host.json` 只有裸 `samples` 数组——无 `{ms,at,err}`、无 p50/p95/max、无时间序列（覆盖式写盘）、无错误关联（`host.count()` 是空实现、span 与 `incidentId` 互不相干）。拿到 `[988.99, 53.43, 74.44, 23.62]` 无法回答「那次 989ms 是几点、是否失败」。
- **轮询成本**：shot 空载 2s 重截（captureScreenshot+webp 编码+base64 每趟）、devtools 1.5s 全量 `DOM.getDocument`（220 节点截断）、perf-report 每 10s 无条件 POST（disabled 也发，内存只留最后一份）。
- **可视化缺位**：network 环有 `startedAt/durationMs` 但没画瀑布；`diffHostSnapshots` 在库里有雏形但无人调用；e2e 只断言「有 span」无延迟预算。

**改造清单**：
- host 补 span：`status-probe`、`ports-inspect`、`diag-build`、`recover`、`browse-history`、`history-write`。
- client 补 span：`shot-fetch`、`dom-write`、`devtools-poll`、`pick-req`、`edit-req` + `perf.profiler(BrowserPane)` + `track` 轮询。
- 库增强（P1）：样本 `{ms,at,err}` 三元组、snapshot 预聚合 p50/p95/max（`percentile()` 已有未用）、`decideEnabled` 延迟到首个样本或暴露 `setEnabled`、host `count()` 实现。
- 库增强（P2）：`host-snapshots.jsonl` 追加时间序列、span 携带 `traceId`/`incidentId`、`lastClientPerf` 落盘、disabled 时 client 停发 POST。
- 前端（P2）：devtools `?since=` 增量拉（consoleSeq 已有）、轮询对 `document.visibilityState` 降频、network 环渲染瀑布、e2e 加延迟预算断言。

### 3.4 性能优化手段缺口

- **页面级指标是黑盒**：CDP 面完全无 Performance/Tracing/Profiler/Memory 域——perf-review 只有「路由墙钟」。先探测引擎支持哪些（`Performance.getMetrics`/`Tracing.start`），不支持就在 workerd 侧加 `/metrics` 端点；同时 evaluate 采集 `performance.getEntries*`/`PerformanceObserver`/`memory` 把 Web Vitals 做起来。
- **截图管线**：fit 模式每趟 shot 都重发 `setDeviceMetricsOverride` 且**污染全局 `viewport` 语义**（`engine.js:906`）——fit 与 settings viewport 应分变量 + `lastAppliedFit` 缓存；scroll 是 evaluate+screenshot 两步往返。
- **`waitForContent` 200ms×75 轮询 JS**：应改 `Page.loadEventFired`/`domContentEventFired` 事件（若引擎支持）或指数退避。
- **native HTML 镜像是快照非活镜像**：`doc.write(outerHTML)` 全量重写 iframe，无 DOM 增量；可接受快照语义但需陈旧提示（`nksVersion` 机制可复用）。
- **history.add 在请求路径同步 IO**（`lib/history.js:26` readFileSync+writeFileSync）：频率低可接受，建议 append+jsonl。
- **环容量**：OP_CAP=200/CONSOLE_CAP=250/NET_CAP=200，shot 轮询会快速滚掉 operations；轮询类路由应采样记账或独立 bucket。

### 3.5 已做对、建议保留的设计

loopback 双端口 + Origin 精确白名单 + 无 Origin 才允许非浏览器 client（`mcp-bridge.mjs:44`）；checkout 只读挂载 + tmpfs .wrangler + stateDir 持久卷；`traced()` 全路由记账且跳过 PERF_ROUTE；ERROR_CATALOG 单源三派生；`useLive` 传输错误重连一次 + 页面级错误分类；devtools 轮询 open-gated；`useFit` 的 1:1 无 letterbox 管线。

---

## 4. 综合判断与优化意见

**DNK 的三层定位与距离：**

1. **「能看」** ✅ 已达成——渲染投射、诊断/错误目录、MCP 透传骨架是合格的，部分维度（错误目录真源化、测试防漂移、人机交互手势）甚至超过 ego 的手工层。
2. **「能调」** ⚠️ 半残——观测面齐（console/network/operations/targets/perf），但**动作面全断**：无交互、无等待、无状态保存、无网络干预。自动化调试的核心是「做动作-等结果-再观测」，DNK 只有最后一环。
3. **「能省」** ❌ 未起步——无 ownership 语义、无会话隔离、无状态持久化、无性能数据的可操作性（统计/可视化/回归）。

**优化意见（按 ROI 排序的路线图）：**

- **阶段 A（纯 host/bridge，不碰引擎，1-2 轮迭代）**：补 `/wait` + `kitesurf_wait`、`evaluate` 分段放宽、a11y-lite ref 表 + `kitesurf_snapshot/interact` 桥内工具、storage/cookie-lite、bridge 写类互斥 + ownership 标记。这一步把「能做动作」的 80% 场景补上。
- **阶段 B（契约与文档）**：修 `perfReview` 假开关、ERROR_CATALOG 补 5 个 host id + 4 个 bridge 本地表、skill 改包结构（routes/mcp-bridge/observability/element-packets/recovery/recipes/emulation 七个 reference + 两模板）+ build 对账断言。
- **阶段 C（容器与监控）**：监督对称化 + 取证、推送瘦身 + portReport 缓存、linux-prefix 剪枝 + pin、span 全覆盖 + 三元组样本 + p50/p95 + jsonl 时间序列、devtools `?since=` 增量。
- **阶段 D（引擎依赖，推动 workerd/CDP 面扩展）**：`Input.*`/`DOM.getBoxModel`/`Accessibility`/`Fetch`/`Network.getResponseBody`/`Target.createBrowserContext`/`Page.addScriptToEvaluateOnNewDocument`——这是把「合成事件兜底」升级为「真实交互」的正解；Tracing/Profiler 类接受降级为 `performance.*` evaluate 采集。

**一句话**：ego/agent-browser 赢在「自动化闭环完整 + 文档分层 + daemon/会话/认证/插件化的运维成熟度」；DNK 赢在「错误目录真源化 + 安全姿态 + 人机共享单页的投射体验」。差距不是「少了几个工具」，而是**自动化闭环的三个环节（snapshot-ref / interact / wait）从未被作为一等公民实现**——补完阶段 A 之前，MCP 透传再多工具也只是「把 agent-browser 的命令面暴露在一个跑不动的引擎上」。

---

## 5. 勘误记录（对四份子代理报告）

| 子代理结论 | 核验结果 |
|---|---|
| route-table 有 26 条路由（agent-9/任务书口径） | **实际 24 条**（`"path":` 计数），按 24 为准 |
| `package.json.files` 漏 `lib/dom.js`/`lib/history.js`（agent-10） | **误报**，files 包含两者 |
| `kitesurf.diag.stale` 无 throw site（agent-10） | **误报**，存在于 `mcp-bridge.mjs:278`；但其归类应为「bridge 本地错误」而非 host catalog |
| 「6 个 kitesurf_* 工具」vs 实际 13 个 | 属实（`kitesurf_history/dom/elements/selftest/network` 未在 skill 文档） |
| `config.perfReview` 假开关 | **属实已复现**（decideEnabled 冻结时机） |
| `resourceBase` directory 机制 | **属实已验证**（`dsh-skill/lib/index.js:445,492,501`） |
| ERROR_CATALOG 漏 id | 部分属实：host 侧 `history.body`/`network.query`/`shot.empty`/`shot.fit`/`dom.*`/`elements.empty`；bridge 本地 `.stale`/`tool.unknown` 应单列 |
