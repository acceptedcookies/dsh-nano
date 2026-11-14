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
| **agent-browser** | vercel-labs 独立 Rust CLI，daemon→CDP 控 Chrome | CLI ~90 子命令 + `mcp` stdio JSON-RPC（8 档 tool profile，core=33 / all=160 工具） | **DNK 容器内嵌的就是它**：`mcp-bridge.mjs` 每连接 spawn `agent-browser mcp` 透传 + 13 个本地 `sandbox.*` 工具 |

所以正确的对比是：**agent-browser（CLI+MCP）与 ego 的 TaskSpace/Page 语义模型** vs **DNK（24 HTTP 路由 + bridge MCP + workerd 引擎）**。ego 的贡献是「人机共存与所有权语义」，agent-browser 的贡献是「自动化命令面 + MCP 协议完备性」。

### DNK 的真实接口面（已核实）

- **HTTP**：`src/host/route-table.js` 共 **24** 条路由（子代理报 26 系误读，按文件实际计数）。
- **MCP**：`ws://…/mcp` → bridge 本地应答 13 个 `sandbox.*` 只读诊断工具 + 透传 `agent-browser mcp`（默认 core 档 33 工具，**但大部分在 workerd 引擎上无法工作**，见 §1）。
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
| 等待原语 | `wait --text/--url/--load/--fn/--download` | 无 | **阻塞** | **P0 纯 host 可实现**：evaluate 轮询 + 现有 `frameNavigated`/`Network.*` 环缓冲判定；`/wait` 路由 + `sandbox.wait` 工具，**不需要引擎改动** |
| JS 执行 | `eval` 无界/文件/`--base64` | `/evaluate` ≤2000 入 ≤4000 出 | **阻塞**（兜底手段全被截断） | P0：分段返回 + `awaitPromise` + objectId 续取 |
| 网络观测 | `network_requests`（含 body）+ HAR | `/network` 仅元数据 | **阻塞** | P0：ring→HAR 组装（body 先留空）；P1：workerd `Network.getResponseBody` |
| 拦截/mock/离线 | `network route/unroute`、`set_offline`、`emulateNetworkConditions` | 无 | **阻塞** | 仅 P1：workerd `Fetch.*`（唯一正确拦截层） |
| cookie/storage/认证态 | `cookies_*`、`storage_*`、`state_save/load`、`auth` vault | 无；`/settings` 显式禁 cookie | **阻塞** | P0：evaluate 封装 local/sessionStorage + `document.cookie`（HttpOnly 拿不到）；P1：workerd cookie jar + `Target.createBrowserContext` |
| 多页/tab/会话 | `tab_*`、`--session` 隔离、TaskSpace ownership/handOff | 单页共享，无所有权协议 | **阻塞** | P0：bridge 对写类 tools/call 串行化互斥；P1：workerd 多 target + context；同时引入 ego 式「agent 持有/交还控制权」语义（`waitForControl`/`handOff` 对应物） |
| 对话框 | `dialog_status/accept/dismiss` | 无 | 效率 | P1：workerd `Page.javascriptDialogOpening` |
| 上传/下载 | `upload`、`download`、`wait_for_download` | 无 | 效率 | P1：`DOM.setFileInputFiles` + `Page.setDownloadBehavior` |
| 页面性能 | `trace/profiler/vitals`（Tracing/Profiler 域） | 无页面级指标 | 效率 | P0：`performance.getEntries*`/`PerformanceObserver`/`memory` 经 evaluate 采集；Tracing/Profiler workerd 大概率不可行，**接受降级** |
| 截图/PDF/录像 | screenshot/PDF/screencast/record | `/shot` 已较好（webp/fit） | 锦上添花 | P2：`Page.startScreencast`（若引擎支持）替代轮询 |
| console/errors | `console/errors` | `/console` + `sandbox.console` | ✅ **唯一持平** | — |
| 仿真 | geo/timezone/locale/device | UA/viewport/media/extraHeaders ✅ | 效率 | P1：workerd 补三个 `Emulation.set*` |

### 1.3 实现路径总纲（按 ROI）

**P0（纯 host/bridge 侧，不碰 workerd，先做）**
1. `/wait` 路由 + `sandbox.wait`：selector/text/url/fn/networkidle 全部可用现有事件环 + evaluate 轮询实现。
2. `evaluate` 放宽：分段返回、objectId 句柄、awaitPromise。
3. storage/cookie-lite：evaluate 封装的读写/导出/导入路由。
4. a11y-lite + interact-lite：注入 walker 建 ref 表 → `sandbox.snapshot`/`sandbox.interact` 桥内工具。
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
3. **MCP 事实过期**：SKILL.md §8 写「6 个 `sandbox.*` 工具」实际 13 个（`sandbox.history/dom/elements/selftest/network` 五个未提及）；「33 个 `agent_browser_*`」未经对账。
4. **MCP 入口零引导**：没有文档告诉 agent 走 `ws://…/mcp` 时工具名前缀、native 工具的 inputSchema、MCP 能做而 HTTP 不能做的（反之 `sandbox.elements` 的 description 自己承认是快照缓存版，得回 HTTP `/elements?selector=`）。

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
    mcp-bridge.md              # 13 个 sandbox.* 工具 schema + 透传说明 + 帧尾 \n
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

- **阶段 A（纯 host/bridge，不碰引擎，1-2 轮迭代）**：补 `/wait` + `sandbox.wait`、`evaluate` 分段放宽、a11y-lite ref 表 + `sandbox.snapshot/interact` 桥内工具、storage/cookie-lite、bridge 写类互斥 + ownership 标记。这一步把「能做动作」的 80% 场景补上。
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
| 「6 个 sandbox.* 工具」vs 实际 13 个 | 属实（`sandbox.history/dom/elements/selftest/network` 未在 skill 文档） |
| `config.perfReview` 假开关 | **属实已复现**（decideEnabled 冻结时机） |
| `resourceBase` directory 机制 | **属实已验证**（`dsh-skill/lib/index.js:445,492,501`） |
| ERROR_CATALOG 漏 id | 部分属实：host 侧 `history.body`/`network.query`/`shot.empty`/`shot.fit`/`dom.*`/`elements.empty`；bridge 本地 `.stale`/`tool.unknown` 应单列 |

---

# §6 演化工作台账（P0–P2，可执行）

> 本章是承接 §1–§5 差距结论的**施工合同**。每项含：要做什么 / ego·cursor 对照 / 为什么需要 / 对 dsh 长期演化的价值 / 交付物与验收。P0=契约与最小动作环，P1=工作面完整化，P2=引擎级与平台化。

## 6.1 定位：DNK 在 dsh 生态里该演化成什么

**不要**把 Kitesurf 做成「又一台 agent-browser」或「dsh 里的 Chrome」。它在 dsh 内的唯一且正确的定位是：

**人机共享的自动化调试与设计反馈工作台**——人标注的元素、agent 驱动的页面、测试产出的证据，三者说**同一种定位语言**、用**同一份控制契约**、产出**可回放的验证闭环**。

三个生态事实决定了这个定位：

1. **Cursor design mode 的教训**（`design-mode-feedback.md`）：annotation 是一次性贴文——选中即失语、换页即丢稿、不可执行、无所有权。DNK 已有手势/note/chip/就改改字，差的是让这份笔记**成为 agent 可执行的凭据**，而不是死文本。
2. **ego 的启示**：人机共存不是「谁抢页面」，而是 `ownership: agent|user` + `waitForControl()/handOff()` + 用户批准清状态的**显式契约**。dsh 里 agent 与人类天然共享同一 workspace，这套语义必须在插件层一等公民化。
3. **dsh 的结构优势**：skill/MCP/route-guard/perf-review/workspace pane 全栈在位，agent 就在插件隔壁——Chrome DevTools 做不到「点选→注入 composer→agent 执行→同一元素验证→回执」这个跨界面闭环，DNK 做得到。

**演化主线**：

- P0 —— **契约可信 + 最小动作环**：错误目录/perf 开关先诚实，补「等待」与「所有权」，统一元素 ref 语言，文档分层。
- P1 —— **动作面完整 + 工作台闭环**：交互/状态/回放证据/自愈，把「能看」升成「能调」。
- P2 —— **引擎原生 + 平台化**：CDP 域扩展、多会话隔离、页面级指标、录制回放、场景记忆、远程引擎。

**判据**：每一项都问「它让 agent 在 dsh 内**自主完成哪一条以前必须人手的调试环**」——不能回答的不做。

## 6.2 总览表

| # | 工作项 | 主题 | 依赖 | 风险级 |
|---|---|---|---|---|
| **P0-1** | 错误目录与事实对账补齐 | 契约可信 | 无 | 低 |
| **P0-2** | `perfReview` 假开关修复 | 契约可信 | 无 | 低 |
| **P0-3** | 等待原语 `/wait` + `sandbox.wait` | 动作环 | 无 | 低 |
| **P0-4** | 所有权契约 + 写操作互斥 | 人机共存 | P0-3（先验证 socket 语义） | 中 |
| **P0-5** | 元素 ref 统一语言（a11y-lite） | 定位语言 | 无 | 中 |
| **P0-6** | skill 包化分层 + build 对账 | 文档可信 | P0-1 | 中 |
| **P1-1** | 交互核心 `interact-lite`（合成事件） | 动作面 | P0-5、P0-4 | 中 |
| **P1-2** | `evaluate` 分段 + 状态读写 lite | 动作面 | P0-5 | 低 |
| **P1-3** | 页面证据链：network body + HAR + 快照归档 | 观测 | P0-6 | 中 |
| **P1-4** | perf 统计化 + 可视化（瀑布/p95/时间序列） | 观测 | P0-2 | 中 |
| **P1-5** | 容器监督对称 + 取证 + 自愈升级 | 可靠 | 无 | 中 |
| **P1-6** | feedback-report 模板 + recipe 工作流 | 闭环 | P0-6、P1-3 | 低 |
| **P1-7** | `/selftest` 强化为 agent-first 自检 | 可信 | P0-1 | 低 |
| **P2-1** | 引擎 CDP 域扩展（Input/AX/Fetch/ResponseBody/Context） | 引擎 | 需引擎侧排期 | 高 |
| **P2-2** | 多 session/context 隔离 + 状态快照 | 平台 | P2-1、P0-4 | 高 |
| **P2-3** | 页面级指标（Web Vitals + 引擎 metrics） | 观测 | P1-4 | 中 |
| **P2-4** | 录制→回放→断言 测试原语 | 平台 | P2-1、P1-6 | 高 |
| **P2-5** | 场景化 learnings/recipes 沉淀 | 记忆 | P1-6 | 低 |
| **P2-6** | 远程/多引擎管理（nano-platform 对接） | 平台 | 业主裁决扩约 | 中 |

---

## 6.3 P0 —— 契约可信与最小动作环（先做，全部不碰引擎）

### P0-1 错误目录与事实对账补齐

- **做什么**：把 §2.2 已核实的 5 个 host 侧 errorId 补进 `ERROR_CATALOG`（`history.body`、`network.query` 归 400；`shot.empty`/`shot.fit`、`dom.blank`/`dom.empty`/`elements.empty` 归 502）；4 个 bridge 本地 id（`.stale` 系、`tool.unknown`）单列「MCP 层错误」表，写进 skill 而非混进 host 目录。
- **ego/cursor 对照**：agent-browser 的 MCP 错误按 JSON-RPC code + tool-specific message 分层，业务错与协议错互不等价；DNK 已有等价分层思想，但表没追平实现。
- **为什么需要**：`history.body`/`network.query` 是输入侧 400，未入表会被 `§5` 的「unlisted=502」规则误诊为引擎故障——agent 会按错误分支自愈，浪费整轮排障。
- **dsh 长期价值**：`ERROR_CATALOG` 是 DNK 对 agent 的**契约真源**，它的完整性直接决定「agent 能不能不靠人自助排障」。这是所有自动化能力的地基。
- **交付/验收**：catalog 新行 + `test/` 增加「扫描全部 `KitesurfError('…')` 字面量必须命中 catalog 或显式登记 unlisted」防回归断言；`npm test` 通过。

### P0-2 `perfReview` 假开关修复

- **做什么**：`decideEnabled` 从「首次 `hostJoin` 冻结」改为「首个 span 记录时判定」，或暴露 `setEnabled(true)` 由 `apply()` 调用；`config.perfReview` 恢复真实语义。
- **ego/cursor 对照**：ego/agent-browser 无等价物（这是 dsh 独有资产），但正因为独有，开关必须是真开关——假开关比没有更糟（产生「已开启」的错觉）。
- **为什么需要**：P1-4 的所有统计、可视化、回归检测都建立在「perf 采集真的开着」上；当前实测样本来自外部 env，config 路径是断的。
- **dsh 长期价值**：perf-review 是跨插件的共享监控面，一个假开关会污染整个 `host.json` 的可信度。
- **交付/验收**：`config.perfReview:true` 且无 env 时 `GET /perf-review/host` 返回 `{enabled:true}` 且 span 落盘；`npm test` 加开关语义用例。

### P0-3 等待原语 `/wait` + `sandbox.wait`

- **做什么**：新路由 `POST 见 QNA wait {selector?|text?|url?|fn?|load?:commit|domcontentloaded|load|networkidle, timeoutMs?, intervalMs?}` + MCP `sandbox.wait` 同名镜像。实现：`Runtime.evaluate` 轮询 + 复用 `captureCdpEvent` 已有的 `Page.frameNavigated`/`Network.*` 环缓冲判定 navigation/networkidle；命中 `{ok:true,matched,elapsedMs}`，超时 `{ok:false,errorId:kitesurf.wait.*}`。
- **ego/cursor 对照**：agent-browser `wait --text/--url/--load/--fn/--download`（commands.md:165）；Playwright `waitFor*`；ego `page.waitForSelector/waitForLoadState/waitForFunction`——**全部等价语义**，这是 agentic 自动化最基础的原语，Cursor design mode 完全没有。
- **为什么需要**：它是自动化闭环的**第三环**（snapshot→interact→**wait**→verify）。没有它，agent 只能靠固定 `sleep` 猜，SPA/异步渲染下必然不可靠；且它是**唯一一个纯 host 侧就能实现的「阻塞级」缺口**，ROI 最高。
- **dsh 长期价值**：等待原语把「轮询页面」从 agent 的 token 消耗变成插件的确定性协议调用——每省一次自轮询就是省一轮 LLM 往返。它是后续所有 recipe/断言测试的公共地基。
- **交付/验收**：`/wait` 进 route-table（L2 `write:engine`）+ `sandbox.wait` 进 `KITESURF_TOOLS`；e2e 加「wait text 命中 / 超时返回 wait.timeout」两项；skill reference 收录。

### P0-4 所有权契约 + 写操作互斥

- **做什么**：host 维护「页面控制者」标记（`agent`/`user`/`none`，带 TTL 与显式 `handOff`）；bridge 对写类 `tools/call` 串行化（`answerNativeTool` 拦截点现成）；diagnostics 输出 `owner` 字段；`suspend`/engine 事件自动 `handOff`。同步做一件事：**验证「browser socket 一关→页面 about:blank」的作用域**（按 socket 还是按全局），决定互斥粒度。
- **ego/cursor 对照**：ego TaskSpace `ownership` + `waitForControl()/handOff()` + `claimTaskSpace()`（需用户批准认领 user 空间）——这是「agent 与人共用浏览器」的成熟契约；Cursor 无此概念（agent 直接改你的编辑器，无共享页模型）。
- **为什么需要**：§1 判定 MCP 连接断开可能重置人类正在看的页；而人机共享单页是 DNK 的**核心交互模型**，没有所有权契约，第二个 agent/agent 与人会互相踩。这比「多 target」便宜一个数量级。
- **dsh 长期价值**：dsh 内「人 + 多 agent 共用一个工作面」是平台常态，所有权协议会成为 dsh 级通用模式（不止 Kitesurf）。先在这里跑通最小契约，是给整个生态打样。
- **交付/验收**：diagnostics 出 `owner` 字段；bridge 写调用互斥 + 冲突返回 `kitesurf.control.busy`；`/status` 输出 owner；e2e 模拟两写方串行通过。

### P0-5 元素 ref 统一语言（a11y-lite 快照）

- **做什么**：注入 a11y-walker 脚本生成带 `@N` ref 的语义树（role/name/text/可见性，截断 200 节点）；宿主 `putRef/getRef` 复用为统一 ref 存储；**人类 pick note 的 selector 与 agent `sandbox.snapshot` 的 ref 指向同一元素**；`interact`/`wait`/`get_text` 全部接受 `@N`/selector 双入参。
- **ego/cursor 对照**：agent-browser `snapshot -i` 的 `@ref` 体系 + `find role/text/label/testid` + ego `page.snapshot()` 的 stableLocator——这是**整个 agentic 交互模型的入口语言**。Cursor design mode 的 selector 是一次性字符串，人写的与 agent 用的不是同一套。
- **为什么需要**：DNK 的灵魂特性是「人标注→agent 执行」。若人类点选产生的是 CSS selector 而 agent 工具用的是 `@ref`，两种语言不互通，标注就无法被复用——闭环断在翻译层。统一 ref 让「人指什么，agent 就能动什么」。
- **dsh 长期价值**：这是 dsh 内「人机协作」的**词汇表**——一旦 ref 语义统一，composer 里的 `[kitesurf]` chip、devtools 面板、agent 工具、测试断言全部说同一种元素语言。这是 dsh 独有的、Chrome DevTools 天然没有的能力。
- **交付/验收**：`sandbox.snapshot` MCP 工具返回 `{tree,refs}`；pick note 与 snapshot ref 可互查；`interact`/`wait` 接受 ref；e2e 验证 ref→元素往返。

### P0-6 skill 包化分层 + build 对账

- **做什么**：`lib/skill.js` 从单文件生成器改为 skill 包生成器（入口 ≤90 行 + `references/{routes,observability,mcp-bridge,element-packets,recovery-playbook,recipes,emulation}.md` + `templates/probe.sh|feedback-report.md`）；注册处补 `resourceBase:{kind:'directory'}`；frontmatter 注入 `version`/`date`（读 `package.json`）；build 时断言 ROUTE_TABLE path 集合与 `KITESURF_TOOLS` 名集合被对应 reference 覆盖。
- **ego/cursor 对照**：agent-browser「258 行 core 入口 + `--ref` 按需加载 10 篇 + 8 个场景 skill + 3 个 .sh 模板」是渐进披露的成熟范式；`design-mode-feedback.md` 里 totalum 原文记录过「skill/MCP 定义本身吃掉大量 token」——分层正是对这个痛点的回应。
- **为什么需要**：232 行单文件一次全量进上下文，且 §2.2 有事实漂移（「6 个工具」vs 实际 13）。分层 = 入口只讲「先跑什么探针 + 什么时候去读哪篇」，把 14KB 一次性开销摊成按需加载。
- **dsh 长期价值**：dsh 的 skill 机制原生支持 directory `resourceBase`，DNK 是第一个把「接口真源 → 分层生成 → build 对账」全链路打通的插件——会成为整个仓库 skill 工程的模板。
- **交付/验收**：`skills/kitesurf-cdp/` 目录树生成；`skill.test.mjs` 逐文件比对 + 路径集合断言；入口 frontmatter 含 `version`/`date`；e2e 注册检查仍过。

---

## 6.4 P1 —— 动作面完整与工作台闭环

### P1-1 交互核心 `interact-lite`（合成事件）

- **做什么**：`interact` 路由 + `sandbox.interact` 工具：`{action:click|dblclick|fill|type|press|hover|select|focus|check|uncheck, target:@N|selector, text?|key?|value?|option?}`。实现：`Runtime.evaluate` 派发合成事件 + `native setter`（InputEvent/bubbles，对 React 受控组件用 native setter 技巧）+ `scrollIntoViewIfNeeded` 前置 + 遮挡检测。写操作走 P0-4 所有权。
- **ego/cursor 对照**：agent-browser `click/fill/type/press/hover/select` + `find role/text/label` 语义定位 + ego `page.click/fill/selectOption/press`——**这是自动化调试的核心动作集**。Cursor design mode 只有「选中给 agent」，agent 自己点不了。
- **为什么需要**：§1 Top-2 阻塞缺口。没有交互，agent 只能「看页面-告诉人问题」，不能「复现-验证-再测」。合成事件覆盖 ~80% 场景，是引擎 `Input.*` 落地前的正解。
- **dsh 长期价值**：把「做动作」从「请人去点」变成 agent 的原语——这是 DNK 从「投射器」升级为「工作台」的分界线。它与 P0-5 的 ref 语言组合后，人标注的元素第一次可以被 agent 直接驱动。
- **交付/验收**：`/interact` 进 route-table（L2 `write:engine`）；`sandbox.interact` 进 `KITESURF_TOOLS`；e2e 完成「fill+click→console 出事件」；遮挡/不可见返回 `interact.occluded`。

### P1-2 `evaluate` 分段 + 状态读写 lite

- **做什么**：`evaluate` 放宽——结果分段返回（`generatePreview`+chunk）、`awaitPromise`、objectId 续取句柄；新增 `/storage` 路由封装 `localStorage`/`sessionStorage`/`document.cookie` 读写导出（HttpOnly 标注不可达）；`/state` 快照把 `{cookies,localStorage}` 导出/恢复到 profile 状态文件。
- **ego/cursor 对照**：agent-browser `eval`（无界、`--base64`、文件输入）+ `storage_*`/`cookies_*`/`state_save/load`——ego 的 `state` 命令族是「可复现环境」的标准实现。Cursor 无。
- **为什么需要**：§1 Top-4/5 阻塞缺口——4KB 返回上限让所有兜底手段（合成事件读回、storage 导出、a11y walker 输出）被截断；无状态读写则「测登录态页面」不可能。
- **dsh 长期价值**：`evaluate` 是所有「引擎尚未实现的能力」的逃逸口——放宽它等于放大整个 P0/P1 兜底面的上限。`/state` 快照让「bug 发生在登录态」第一次可复现，这是调试工具与测试工具的共同地基。
- **交付/验收**：`/evaluate` 支持 `?page=` 分段与 `objectId`；`/storage` GET/SET/CLEAR；`/state` save/load 到 `$DSH_HOME`；e2e 验证长表达式与 storage 往返。

### P1-3 页面证据链：network body + HAR + 快照归档

- **做什么**：network 环在现有 metadata 上补 `requestHeaders`/`responseHeaders`（事件里已有可透传字段），引擎侧若不支持 body 则显式标注 `body:null, reason:'engine'`；`/har` 路由把环组装为 HAR 1.2 导出；`shot`/`dom`/`elements` 快照加 `at`/`buildId`/`url` 归档到 `$DSH_HOME` 的只追加 jsonl，供跨次对比。
- **ego/cursor 对照**：agent-browser `network_requests`（含 body）+ `har_start/stop` + Chrome DevTools Network 面板——「接口为什么挂」的第一手证据是 body 而非 status。Cursor 无网络面。
- **为什么需要**：现有 `/network` 只有 method/url/status/bytes——调试「后端返错」时必须看 body；无归档则「昨天那次 500 的上下文」不可追溯。
- **dsh 长期价值**：证据链把 DNK 的观测从「实时查看」升级为「可归档审计」——这是 nano-platform「可审计执行环境」价值观在插件层的落地。HAR 是跨工具通用格式，导出即与外部 DevTools/抓包工具互通。
- **交付/验收**：`/network` 条目含 headers；`/har` 导出合法 HAR；快照 jsonl 落盘；e2e 验证 failedOnly 与 HAR 结构。

### P1-4 perf 统计化 + 可视化

- **做什么**：`dsh-performance-review` 库增强——样本 `{ms,at,err}` 三元组、snapshot 预聚合 p50/p95/max、`count()` 实现、`host-snapshots.jsonl` 时间序列落盘、span 携带 `traceId`/`incidentId`；前端把 `network` 环渲染瀑布图（`startedAt`/`durationMs` 已具备）、devtools 改 `?since=` 增量拉（`consoleSeq` 已有）、轮询对 `visibilityState` 降频；e2e 加延迟预算断言。
- **ego/cursor 对照**：agent-browser `profiling`（trace→Perfetto/CI 回归对比范式）——它给的是「采 trace 看火焰」，DNK 的差异是**把监控做进工作台面**而非离线文件；Cursor 无。
- **为什么需要**：§3.3 已证实现有 `host.json` 裸 `samples` 数组无法回答「哪次慢、是否失败」——统计不可用的监控等于没有监控。P0-2 修的是开关，P1-4 修的是数据可用性。
- **dsh 长期价值**：perf-review 是跨插件共享库，三元组/p95/jsonl 的增强会让**所有** dsh 插件的监控数据同时升级——这是「做一件事、全生态受益」的杠杆点。
- **交付/验收**：host.json 样本带 `at/err` 与 `p50/p95/max`；devtools 网络面板出瀑布；e2e 断言 `shot p95 < X`；`diffHostSnapshots` 接入跨 build 对比。

### P1-5 容器监督对称 + 取证 + 自愈升级

- **做什么**：`entrypoint.sh` 把 wrangler/workerd 也纳入重启循环（退避+计数+退出码落 `/tmp/kitesurf-state/`）；bridge `/health` 报 `restarts/lastExit`；诊断推送载荷瘦身（ports/selftest 移出 30s 周期或 `portReport` 缓存 ≥60s）；linux-prefix 剪枝（删非 linux-arm64 二进制 ~91MB + sharp）+ `FROM …@sha256:` pin；`-c`/`-m` 参数化。
- **ego/cursor 对照**：agent-browser daemon「首命令自启、崩溃后下条命令自动重拉、doctor 自检修复」——无人值守的运行时韧性是自动化底座的基本要求；Cursor 引擎即 IDE 进程，无容器层。
- **为什么需要**：当前 workerd 崩 = 容器死 = 只能手动 `/kite resume`，DNK 的「引擎可用性」依赖人手；而每 30s 的 `container inspect` 是纯浪费的常驻开销。
- **dsh 长期价值**：自愈 + 取证 + 镜像卫生让 DNK 的容器运行时达到「7×24 可托管」水位——这是它未来接入 nano-platform 被编排托管的前置条件。
- **交付/验收**：手动 kill workerd 后容器自动恢复且 `/health` 报 restarts；`container inspect` 不再出现在 30s 路径；镜像体积下降 ≥30%；`container list` 资源按 config 生效。

### P1-6 feedback-report 模板 + recipe 工作流

- **做什么**：新增 `templates/feedback-report.md`（问题/元素包/复现/建议 结构）+ `references/recipes.md`（五条端到端配方：读人类点选并回答 / 就改改字并截图复核 / 注入 console.log 探针 / MCP-only 排障 / 写反馈报告）；`/context` chip 与 report 模板打通——agent 产出结构化报告而非散文。
- **ego/cursor 对照**：agent-browser `skill-data/dogfood` 的 `issue-taxonomy.md` + `dogfood-report-template.md`（QA 报告的成熟范式）；Cursor design mode 的痛点正是「annotation 是死文本，没有反馈闭环」——这条工作项就是把它补成「annotation→执行→结构化回执」。
- **为什么需要**：DNK 的核心场景是「人标注，agent 干活」。没有标准化输出，agent 每次都要即兴组织反馈——不稳定、不可归档、不可对比。模板把「反馈」变成数据。
- **dsh 长期价值**：「结构化反馈报告」是 dsh 内「人机协作」的**通用输出协议**——notepad/terminal/explorer 未来都可复用同一模板规范。
- **交付/验收**：skill 包含 recipes+template；e2e 用模板产出一份报告并断言结构字段；`[kitesurf]` chip 与报告 ref 互查。

### P1-7 `/selftest` 强化为 agent-first 自检

- **做什么**：`/selftest` 除现有 verdict 外补「每一检查项的修复命令」（从 `sandbox.recovery_plan` 升级：每项 `{check,ok,failHint,fixCall}`）；`agent-browser doctor` 式输出——agent 拿到即知怎么修。
- **ego/cursor 对照**：agent-browser `doctor [--fix]` 自动清 stale socket/pid 并出 exit code——「自检 + 自愈指引」是 agentic 工具的标准运维面；Cursor 无插件自检概念。
- **为什么需要**：现在 `/selftest` 给的是 verdict 字符串，agent 还得自己翻译「buildId 不符→该重启谁」。把 fix 命令直接编进返回，自助排障闭环才完整。
- **dsh 长期价值**：`/selftest` 是 DNK 对 agent 的「健康协议」——协议化的自检让所有上层自动化（P2 录制回放、nano-platform 编排）都有了标准探针。
- **交付/验收**：`/selftest` 每项含 `fixCall`；e2e 断言结构；skill `recovery-playbook.md` 收录对应关系。

---

## 6.5 P2 —— 引擎级与平台化

### P2-1 引擎 CDP 域扩展（正解层）

- **做什么**：按 §1.3 P1 清单推动 workerd 引擎实现：`Input.dispatch*{Mouse,Key,Touch}Event/insertText` + `DOM.getBoxModel/scrollIntoViewIfNeeded`（真实交互）→ `Accessibility.getFullAXTree`（snapshot 正解）→ `Network.getResponseBody` + `getCookies/setCookies`（证据+状态正解）→ `Fetch.*`（拦截/mock/offline 唯一正解）→ `Page.javascriptDialogOpening` → `Target.createBrowserContext` → `Page.addScriptToEvaluateOnNewDocument` → `DOM.setFileInputFiles` + `Page.setDownloadBehavior` → `Emulation.set{Geo,Timezone,Locale}Override`。
- **ego/cursor 对照**：agent-browser 全部交互/拦截/多 context 能力的底层就是这些域在 Chromium 上的实现；ego `page.cdp()` 逃逸口直调 `Input/DOM/Network` 域——**没有域就没有真自动化，兜底只是近似**。
- **为什么需要**：P0-5/P1-1 的合成事件+a11y-walker 是「能用的 80%」，但有 bot 检测/受控组件/Shadow DOM 死角；Fetch 拦截更是引擎出站 fetch 上的**唯一**正确层。
- **dsh 长期价值**：这是把 DNK 从「近似自动化」升级为「真实自动化」的唯一路径；每落一个域，P0/P1 对应兜底即可退役，接口不变（对 agent 透明）。
- **交付/验收**：引擎侧每落一域，host `engine.js` 加封装 + 对应兜底标注「engine-native」；`/selftest` 报支持的域清单。

### P2-2 多 session/context 隔离

- **做什么**：`Target.createBrowserContext` + 多 page target（P2-1 前置）→ `/session` 路由族（new/list/switch/close）→ 每 session 独立 cookie jar/存储/viewport；与 P0-4 所有权组合成「并发多 agent 各管一页」。
- **ego/cursor 对照**：agent-browser `--session <name>` 每会话独立 daemon+restore 目录、`session id --scope worktree`；ego TaskSpace 按 `profileId` 划分且共享 profile jar——**会话隔离是并发自动化的前提**；Cursor 单页无此概念。
- **为什么需要**：单页共享是 P0 阶段的正确取舍，但它天然排除了「并行测试」「多账号对照」这类场景；而「两个 agent 抢一页」的问题在 P0-4 只是互斥，P2-2 才是正解（各有页）。
- **dsh 长期价值**：dsh 的 runtime 天然多 agent；会话隔离让 DNK 第一次能承接「并行 agent 测试」工作负载，是平台化的前置。
- **交付/验收**：`/session` 路由族 + `Target.createBrowserContext` 落地；e2e 验证两 session cookie 不互通；diagnostics 报 session 清单。

### P2-3 页面级指标（Web Vitals + 引擎 metrics）

- **做什么**：`evaluate` 采集 `performance.getEntriesByType('navigation'|'paint'|'largest-contentful-paint')` + `PerformanceObserver`（LCP/INP/CLS）+ `performance.memory`（若可用）；引擎侧探测 `Performance.getMetrics`/`Tracing.start`，不支持则在 workerd 加 `/metrics` 端点（CPU/mem/请求计数）；`见 QNA vitals` 聚合输出 + 并入 perf-review 时间序列。
- **ego/cursor 对照**：agent-browser `vitals`/`trace`/`profiler`（Chrome Trace→Perfetto）——页面级黑盒是它已解决而 DNK 只有「路由墙钟」的明确差距；Cursor 无页面指标面。
- **为什么需要**：§3.4 已判定 perf-review 只看见「路由花了多久」，看不见「页面为什么慢」。Web Vitals 是前端调试的第一公民指标，没有它「性能调试」名不副实。
- **dsh 长期价值**：「路由墙钟 + 页面指标」双轨后，DNK 的 perf 面从「运维监控」升级为「性能调试」——这是它能否承接「前端性能回归测试」（P2-4）的决定性前提。
- **交付/验收**：`/vitals` 返回 LCP/INP/CLS/内存；`PerformanceObserver` 在 SPA 下持续出数；vitals 进 perf-report 时间序列；e2e 采集一次完整页面指标。

### P2-4 录制 → 回放 → 断言 测试原语

- **做什么**：把 P1-6 recipe 的手动步骤结构化为可执行步骤集 `{open|wait|interact|assert|snapshot}`；`/record` 开始/停止把人的标注+导航录成步骤流；`/replay` 按步骤重放并对 `assert`（selector 存在/text 匹配/vitals 阈值/console 无错）出 verdict——DNK 从「调试工具」长出「测试工具」身份。
- **ego/cursor 对照**：agent-browser `flow save/run`（实验性录制回放）+ `record`（screencast 录像）+ Playwright Codegen 的「录制即脚本」范式——「录人的操作，让 agent 重放断言」是自动化测试的标准形态；Cursor 无测试面。
- **为什么需要**：「人标注→agent 执行→验证」闭环的最后一块是**可重复**——每一次 design feedback 都应该能沉淀成一条回归测试，而不是一次性对话。
- **dsh 长期价值**：这是 DNK 与 dsh「agentic 运行」最深的结合点——agent 可以自主「录一遍 → 改代码 → 回放断言 → 再改」形成开发闭环，不需要人参与回放阶段。
- **交付/验收**：步骤 schema 冻结；`/record`/`/replay` 路由；e2e 录制一条「open→click→assert text」回放通过；断言失败返回结构化 diff。

### P2-5 场景化 learnings/recipes 沉淀

- **做什么**：在 skill 包下加 `learnings/<domain-or-task>/`（manifest + notes + 可选 tools），把「这个站点/这类任务怎么调」的配方沉淀为可复用资源；agent 完成任务后可将本次探针序列归档进对应场景。
- **ego/cursor 对照**：ego skill 原生带 `learnings/{google,github,x-com}`（manifest 声明 nodeTools/browserTools + 站点笔记）——「站点级记忆」是 ego 已验证的模式；Cursor 无学习沉淀。
- **为什么需要**：skill 是「通用能力说明」，learnings 是「特定战场的经验」——没有沉淀层，agent 每次都在从零排障同一站点。
- **dsh 长期价值**：learnings 是 dsh 内「插件级记忆」的雏形——与「单一真源」原则配合（manifest 只存配方与 receipt，不存可执行 payload），它会成为 agent 跨会话复用调试经验的机制。
- **交付/验收**：`learnings/` 目录结构 + manifest schema；首条场景笔记入库；skill 注册处指向可发现。

### P2-6 远程/多引擎管理（nano-platform 对接）

- **做什么**：`allowRemote:true` 语义完善（远程引擎的认证/隔离/配额契约，需业主裁决）；`/kite` 支持多引擎注册与切换；`nano-kite` 对接 nano-platform 的引擎编排（被平台驱动而非只被插件驱动）。
- **ego/cursor 对照**：agent-browser `--provider browserbase/kernel/browseruse`（远程浏览器即服务）+ `connect <cdp-url>`——「引擎在哪」与「谁在用」解耦是成熟做法；ego 多实例靠 `--ego-server-name` 选服务；Cursor 引擎即本地。
- **为什么需要**：本地容器只适合开发机场景；nano-platform 的「Harness as a Service」需要引擎可被平台调度，DNK 必须有「接受远程引擎」的契约面。
- **dsh 长期价值**：这是 DNK 从「本机插件」接入「平台编排」的边界——但它是**扩约**（新 lane、新凭证面、远程凭证），必须先有业主 durable 登记，不能由实现反推。
- **交付/验收**：**先决议再动手**；决议后 allowRemote 语义 + 远程引擎健康/配额面；`/kite configure` 远程路径通过 route-guard。

---

## 6.6 实施次序与判据

**建议推进序**：P0-1 → P0-2（修契约，立即可做）→ P0-3 → P0-5 → P0-4 → P0-6（最小动作环闭合）→ P1-1 → P1-2 → P1-5 → P1-3 → P1-4 → P1-6 → P1-7 → P2 按需。

**阶段验收门**：

- **P0 完成标志**：agent 能在不动手的情况下完成「打开 → 等元素出现 → 按 ref 读出语义 → 与人标注互查」，且所有错误可自查、所有开关是真实的。
- **P1 完成标志**：agent 能闭环「打开 → 等 → 点击/填表 → 截图复核 → 导出证据 → 产结构化报告」，且单 agent 不会踩人的页面。
- **P2 完成标志**：多 agent 并行各管一页、引擎真实交互、页面指标可采、操作可录可断言、远程引擎可编排。

**三条不做的线**（守住定位）：① 不做本地 Chrome fallback（架构红线）；② 不做「先试样式再写代码」（design-mode-feedback 已裁决：`DOM.highlightNode` 是空的，假功能不做）；③ P2-6 远程面不在无业主决议时动（扩约）。