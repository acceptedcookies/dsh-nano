# DNK 本地 dev 网站调试场景 — 四路深度审查汇总

> 审查对象：`dsh-nano-kitesurf` + `dsh-nano-local-sandbox`（主仓 HEAD，镜像 `…-dfe7b4388fdc`）
> 场景：host `next dev -p 3008` → 容器网络命名空间的宿主网关（运行时值，非字面量；本机 vz NAT 实测为 192.168.64.1，**不得写入代码/提示词**）→ kitesurf 容器引擎 → mcp-bridge → DNLS REST/MCP → DNK pane/agent
> 审查方式：4 路只读子代理并行（协议与状态 / SKILL / 错误与诊断 / perf 与链路观测），全部要求 file:line 锚点

## 0. 总评

**协议面功能闭合、观测面结构性缺三个维度**：拓扑事实（localhost≠localhost）、源站活性（page:open≠源站活着）、链路分段（知道哪条路由慢、不知道慢在哪段）。SKILL 工程化质量好（单一真源、正负例表、决策树），但对本场景**内容零覆盖**。错误处理骨架好（catalog 单一真源、incidentId、五平面），但存在一处**会谎报成功**的实证 bug 与一处错误压扁。

## 1. 跨维度交叉主题（真问题按主题归并，非按 agent 罗列）

### 主题 A — localhost 拓扑事实全系统缺失【最高优先级，四维共证】

- **SKILL 无任何地方告知 agent**：容器内 `localhost`/`127.0.0.1` 是容器自己；访问 host dev 服务须用「容器网络的宿主网关地址」（运行时拓扑值，随 backend/部署变，**不可字面量**）。agent 拿到「调试 localhost:3008」必然 `/open http://localhost:3008` → 静默落容器 loopback → `net::ERR_CONNECTION_REFUSED`。（agent-22 G1；SKILL/recipes/playbook/routes.md 全文无 localhost/NAT/host 字样）
- **[业主] 修正**：此前建议「SKILL 写入 192.168.64.1 / profile.yaml 声明网关」均违规（见 §7 修正）。正确做法是 DNLS **运行时暴露**该拓扑值（`/status`/`/diagnostics` 挂 `networking.hostGateway` 类字段），SKILL 只教规则+指向该字段，永不写字面量。
- **错误面亦无拓扑提示**：`navigate.failed` 的 hint 只有「GET /status 看 outcome」，无「localhost 在容器内是容器自身」指引——agent 会把「写错地址」误判成「host 服务死了」。（agent-23 G4；`error-catalog.js` 全文无 gateway 词）
- **`/open` 不做回环改写**：`navigationUrl` 只校验 http(s)+无凭证（`routes.js:899-902`），localhost 原样透传。（agent-21 G1）
- **真源位置建议**：网关地址属 DNLS profile 事实（`profile.yaml`/`/diagnostics` 暴露 `container→host gateway`），DNK SKILL 只消费引用——符合 [单一真源]，DNK 不复制 DNLS 面。

### 主题 B — egress 超时谎报成功【实证 bug，非观测缺口】

- 引擎把 `kitesurf: egress timeout` 合成 **403 text/plain 响应** → `documentKind` 判 `text` → 包 `<pre>` → `Page.navigate` 无 errorText → **`/open` 返回 `ok:true`**。catalog 的 `navigate.egress`(504) 经此路径**不可达**。（agent-23 G2；上游 `outbound.ts:968-970,1362-1366` + `document-kind.ts:39-49` + `page.ts:996-1014`；host `cdp-elements.js:206-213,229`）
- next dev 冷编译慢（首次编译秒级）正踩此路径——**本场景最高频失败恰好落进谎报路径**。
- 修法方向：`x-kitesurf-blocked` 响应头映射为 errorText/`navigate.egress`（host 侧 adapter，不改 pin），或 host 侧检测 blocked header。
- 另：`net::ERR_*` 全压扁为 `navigate.failed`+502（REFUSED/DNS/TIMEOUT 同类），hint 不区分「查 host 服务」vs「查容器」。（agent-23 G1；`cdp-elements.js:207-213`）

### 主题 C — 源站活性维度缺失【状态机对「源站世界」结构性失明】

- `page` plane 的 `none/blank/open` 由 `Target.getTargets` URL 决定——表达「引擎持有已提交 URL」而非「源站活着」。源站死后 **planes 全绿、selftest 11/11 全过、dom:ready**（DOM 是已渲染产物非活性证明）。（agent-21 G2/G3；`routes.js:434-445,491-507`）
- 「导航 ok 但应用坏」零诊断态：`landed.bodyBytes` 已采集但无人消费；agencyfolio 白屏实证——`/open` 200，必须 agent **主动** `/console?level=exception` 才能归因。（agent-23 G3；`cdp-elements.js:218-229`；`routes.js:1118-1126` hints 全集无此类）
- `restoreLastPage` 一次性：host 重启早于 `next dev` 时恢复失败永不重试、无提示。（agent-21 G11）
- **修复边界**：不建议加第 6 plane（OBSERVE_V=1、`LAMP_PLANES`、`bumpEpoch`、selftest 合同面全要动=扩约）；在 `page.detail`/`checks` 附带页内 `fetch(location.origin)` 探活即可——从引擎网络栈测容器→源站，天然同拓扑。（agent-21 G1 建议）

### 主题 D — SKILL 本地 dev 内容空白 + 文档-实现漂移

**空白**（agent-22 G2/G3/G9/G10）：
- 无「本地 dev 站」recipe：http 非 secure-context（SW/crypto/clipboard 静默失效——宿主网关地址非 `localhost` 字面量，连 secure-context 例外都不享受，agent-21 G8）、HMR WS 可达性、source map、CORS、`document.domain`、cookie host-only 域、自签证书——全空白。
- 白屏（SSR 到、JS 未跑）排查路径未写进决策树——`/network?failedOnly=true` + `/console?level=network` 两条最相关路由没串成路径。
- frontmatter 触发窄：「帮我调试 localhost:3008」更可能命中 ego-browser 而非 kitesurf-cdp。
- 无「源站可达性预检」回退（先容器内 fetch 目标再 /open）。

**漂移**（agent-22 G4/G5/G6/G7/G8；agent-23 G7）：
| 漂移点 | 文档 | 实现 |
|---|---|---|
| `/diagnostics?limit=N` | 写 1..100 | handler 只认 `catalog=1`，limit 丢弃 |
| `/snapshot` 默认 | observability 写 200 | 实现 120（routes.md 写对） |
| `/console limit` 域 | 写 1..250 | 实现 1..400 |
| `/settings` 字段 | 列 4 键 | 实有 7 键（cookie/locale/geo/colorScheme 缺记） |
| selftest `fixCall` | playbook 承诺 | 实现无此字段 |
| `level=navigation` | MCP 描述/文档 | `pushConsole` 从不写 navigation level |
| 构建期路由校验 | 用 DNK 空 BINDING_TABLE reconcile | `missingRoutes` 恒空，形同虚设（build-client.mjs:98-108） |

### 主题 E — 链路观测「两层总耗时」模型【perf-review 植入的核心缺口】

- 能定位「哪条路由慢」，不能定位「慢在哪一段」：CDP send 零计时（`cdp-elements.js:610-646`）、mcp-bridge **全链路唯一零观测段**（无 per-call 计时/计数，`mcp-bridge.mjs:236-242`）、ops 行仅 `durationMs` 无 `phases` 分解、srcdoc 组装与截图编码无耗时、NAT/vz 段混在 CDP ms 里不可分辨。
- 已就位：route-guard contract 打点（29 个 `dnls.*` id）、ops 审计环、`/network` 瀑布（**唯一能分辨"源站慢"的既有数据**——next dev 冷编译会表现为首文档 GET 的巨大 durationMs）、`DSH_PERF_REVIEW=1`/`?perf-review=1` 开关、diagnostics push 统一分发。缺的只是"分段"不是"开关"。
- 最小埋点集（agent-24 建议，均为既有字段加挂、无新管线）：① send() 记 `{method,ms,err,via}` 环 cap64；② ops 行加 `phases:{}`（/shot: targetsMs/viewportMs/scrollMs/captureMs；/dom: evalMs/buildMs；/open: navMs）；③ bridge stats() 记 `{tool|method,ms}` + p50/p95；④ navigation ledger 附 `ms=settledAt-sinceMs`。

### 主题 F — 审计上下文断点

- ops 行不带上游错误原文（`net::ERR_*` 只在响应体与会被覆盖的 `session.lastError`）；失败导航不留 URL（`/open` 独立块无 argSummary）。（agent-23 G5；agent-21 G4；`routes.js:1031-1050,1395,1974-1979`）
- incidentId 只关联 ops 行+响应体两点，串不到 /logs /console。（agent-23 G6）
- pane 丢上下文：`post()` 只透传 errorId，incidentId/detail 全丢；`RECOVERABLE` 把 `navigate.failed` 挂「一键修复」→ 实际 /recover 重启容器，对 host 服务死是**错层修复**。（agent-23 G10）
- hints 非结构化中文串，agent 无可执行 recovery 链；`sandbox.recovery_plan` 只覆盖容器/引擎/桥三层，页面层/源站层不入 plan。（agent-23 G8）
- `sandbox.tool.failed` 未登记 catalog → 兜底 502 无 hint。（agent-23 G9）

### 主题 G — writer 锁半覆盖（与既有 G01 D-gated 同域，不重开）

- 锁只管 `/mcp` 通路：REST 写与 `/cdp` relay 明示豁免（`mcp-bridge.mjs:1084-1090` 注释 by design）——「同页一个写者」只在半条通路成立。
- 锁无 lease/TTL（zombie writer 风险，humanHold takeover 可强夺兜底）；bridge 重启丢 humanHold（内存态）。
- **建议**：维持 G01 D-gated 边界，只做诚实化——`/control` 快照/pane 提示「REST/CDP 写不受此锁约束」。

## 2. 对业主 4 个升级问题的回答

| 问题 | 结论 | 证据 |
|---|---|---|
| 1. 协议层+状态控制+健康度+诊断 | **需要，但以小切口为主**：origin 探活 detail（非新 plane）、`navigate.*` 细类、egress blocked-header 映射、失败导航 URL 审计、hints 结构化 | 主题 B/C/F |
| 2. SKILL 提示 | **需要，且是本场景最大单点缺口**：localhost 拓扑事实、dev 站 recipe、白屏排查路径、负例表补本地场景、frontmatter 触发词、7 处漂移修正 | 主题 A/D |
| 3. error-handling+查询接口+上下文 | **需要**：ERR_* 精确分类、ops 行 error 原文+失败 URL、hints→可执行 action、incidentId 贯通、pane 透传、错层修复分流 | 主题 B/F |
| 4. perf-review 植入 | **需要，且基础好**：开关/打点/push 全有，补 4 处最小埋点即成可选诊断路径 | 主题 E |

## 3. 扩约边界（[不得擅自扩约]，需 [业主] 登记）

- `navigate.refused`/`navigate.dns`/`navigate.host-unreachable` 新 errorId（error 枚举变更）
- selftest 新增 `origin-live` 项（`checks[]` id + `health.selftest: 11`→12 声明同步）
- hints 结构化 `{plane,errorId?,text,action}`（diagnostics 输出 schema 变更）
- `sandbox.tool.failed` 登记 catalog（新 errorId）
- `recovery_plan` 扩到页面/源站层（MCP 工具行为面）
- G01 writer 锁覆盖面维持 D-gated，不在本次范围

## 4. 可直接做（非扩约）的修复清单

- SKILL：补 localhost 拓扑小节 + dev recipe + 白屏路径 + 负例行 + frontmatter + 7 处文档漂移修正（内容补充非合同变更）
- `/open` 失败 ops 行 argSummary 写截断 URL（既有字段、既有白名单模式）
- ops 行 `phases:{}` 可选字段 + send() 计时环 + bridge stats 计时（观测字段非合同）
- `localhost` 导航 hint 追加拓扑提示（hint 文案非枚举变更——若决定改 hint 文案无需登记，新增 errorId 才需）
- pane `post()` 透传 incidentId；`navigate.failed` 移出 `RECOVERABLE` 或按 error 原文分流
- 构建期校验改读 `dsh-nano-local-sandbox/lib/bindings.js` 真源
- `capabilities.unsupported` 在 http 非 localhost 源站时追加 secure-context note（只读提示）

## 5. 合理面（防过度工程，保留）

- `/open` 无 SSRF 白名单 = 特性（dev 调试本质就是开任意地址；vz NAT 内无云元数据服务面）
- 五 plane 对引擎世界语义完备且诚实（unknown/http-only/skipped 各有定义）
- catalog 单一真源五面同读；「超时≠取消」全链一致；HAR `har-lite` 自声明诚实
- ops 环 `cancelled` 兜底、incidentId 回显、桥每 15s push diagnostics 给纯 MCP agent
- DNK 不复制 DNLS error 目录（主仓已无 `lib/diagnostics.js`——审查任务按旧布局派发，实际已符合 [单一真源]）

## 6. 修复优先级

1. **主题 A**（localhost 拓扑规则进 DNLS hint + DNK SKILL）——本场景 agent 必踩的第一个坑
2. **主题 B**（egress blocked 映射 + ERR_* 细类）——谎报成功是最重的诚实性缺陷
3. **主题 C**（origin 探活 detail + app-broken 诊断态）——状态机补齐最后一维
4. **主题 D**（SKILL dev 内容 + 漂移修正）——与 A 同一批编辑
5. **主题 E**（4 处最小埋点）——可选诊断路径
6. **主题 F**（审计上下文）——随上面顺手做

## 7. 修正（[业主] 裁决：拓扑字面量违规）

[业主] 指出：报告此前建议「把 `192.168.64.1` 写进 SKILL/profile.yaml/提示词」违反 **不得侧载**——那是 vz NAT 实现细节的字面量，插件必须拓扑中立。逐条裁决本报告此前建议的合规性：

| 此前建议 | 判定 | 修正后形态 |
|---|---|---|
| SKILL 告知 `192.168.64.1` 网关 | **违** | SKILL 只教规则「容器内 localhost=容器自身；宿主服务经容器宿主网关」+ 指向运行时字段 |
| `profile.yaml` 登记网关地址 | **违**（静态字面量入 recipe 真源） | 不入任何静态文件；由 backend 运行时暴露 |
| `capabilities`/`/status`/`/diagnostics` 写字面量网关 | **违** | 字段名为拓扑中立的 `networking.hostGateway`（或等价），**值由 backend 动态发现**（apple-container 读默认路由表；其他 backend 各自语义） |
| `navigate.failed` localhost hint 写「改用 192.168.64.x」 | **违** | hint 写规则+指向 `hostGateway` 字段，永不写值 |
| `x-kitesurf-blocked` → `navigate.egress` 映射 | 合规（行为映射，无拓扑字面量） | 保留 |
| `net::ERR_*` 精确分类 `navigate.refused/dns/…` | 合规（error 枚举，非拓扑） | 保留（需 [业主] 登记新 errorId） |
| origin 探活（页内 `fetch(location.origin)`） | 合规（拓扑中立，location 是运行时值） | 保留 |
| `phases`/`error`/incidentId/计时埋点 | 合规（观测字段） | 保留 |
| SKILL 补「本地 dev」规则（http/HMR/CORS/cookie 域/白屏路径） | 合规（通用 web 规则，无拓扑字面量） | 保留 |
| frontmatter/构建期校验改读 DNLS bindings | 合规 | 保留 |

**正确模式**（对所有拓扑值通用）：**暴露运行时发现的拓扑字段，不字面量化**。网关地址属「容器网络命名空间的宿主」这一**角色**，其值随 backend（apple-container vz NAT / docker / cloud / 其他）而变——只能由 backend 实现按其拓扑语义返回，写入 `/status`/`/diagnostics`/`/ports` 既有文档面；SKILL 与 hint 只引用字段名，永不引用值。

## 8. 落地回执（kitesurf-local-dev 分支，A 级验证后补记）

已合入并在 `~/.dsh-dev` + `kitesurf-dev` live 验证的实现（commit `ffee4d3` 及后续）：

| 主题 | 落地内容 | 证据等级 |
|---|---|---|
| A（localhost 拓扑失明） | `parseInspect` 提取 `status.networks[].ipv4Gateway` → `networking{hostGateway,containerAddress,network}`，透传 `/status`、`/diagnostics`、`/ports`；`navigateHint` 拓扑中立（loopback→指字段名，永不写值）；live `/status` 回报 `192.168.64.1`（运行时自发现） | A |
| B（egress 谎报） | `driver.blockedDocument` 检测 `x-kitesurf-blocked` 头 + `kitesurf: ` body；`/open` 被拦文档回 `navigate.egress`(504)/`navigate.failed`(502)；检测器在 driver 非内核（no-business-core 回归约束） | A |
| D（SKILL 空白+漂移） | `lib/skill.js` §3 容器地址空间规则；`recipes` 配方5（localhost 翻译/secure-context/HMR/PNA/cookie 域）；`playbook` +2 步；`emulation` 7 键+cookies；`probe.sh` 去硬编主机名；`error-catalog` https→http(s)；`level=navigation` console 行实发（frameNavigated）；routes.md↔routeSpecs 漂移守卫测试 | A |
| E（链路观测） | `/shot`/`/dom` `phases`（targets/viewport/scroll/capture/identity/ms+bytes）；`session.cdpCalls` 每 CDP 命令计时（cap64）暴露于 `/diagnostics`；桥 `tools/call` per-call 计时 + `calls{p50,p95,last10,byTool}` 进 `/health`/`sandbox.bridge_health`；CDP relay per-method 计时环（`stats.cdpCalls`） | A |
| F（审计上下文） | `/open` `argSummary` 记尝试 URL；导航 ledger `ms`/`error`；`send()` 记 `result.error`；`incidentId` 既有 | A |
| 文档-实现漂移修复 | `/diagnostics?limit` 注明忽略、snapshot 默认 120、console 1..400、settings 7 键、`fixCall` 不存在注明、FRONTMATTER 改读 `lib/skill.js` 单一真源 | A |

未落地（[业主] 门控扩约，等待 durable 登记）：`navigate.refused/dns/host-unreachable` 新 errorId、`selftest` 第 12 探针 origin-live、结构化 hint `{plane,errorId?,text,action}`、`sandbox.tool.failed` catalog 行、第 6 plane（origin 活性——按裁决归入 page.detail/hints 不新开 plane）。
