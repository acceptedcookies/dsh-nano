# `DNK01` — QnA Truth Ledger

> **Ledger ID**：`DNK01-TRUTH`
> **范围**：Kitesurf 本地站**协作面**的真相（只列已冻结 ID：`T-O-1`–`T-O-6`，共 6 条）
> **文档性质**：`frozen-truth ledger / compact consumption entry`（问答是 decision provenance；本文不是第二真源）
> **状态**：`🔒 FROZEN · foundational 2 条 + executional 4 条（Q1–Q6 全确认） · NOT IMPLEMENTATION CLOSURE`
> **日期**：`2026-11-20`
> **Owner decision provenance**：[`DNK01-1120-qna.md`](./DNK01-1120-qna.md)（Round 1 收口轮 Q1–Q6，6 题均有 [业主] 答复，推荐项全部 A，逐题签收；second-opinion `retired`）
> **上游已冻法律（只 CITE，本文不 supersede）**：[`DNLS03-qna.md`](../../dsh-nano-local-sandbox/qna/DNLS03-qna.md) 的 `T-O-41`（单目标分派）、`T-O-44`（请求准入不是对象授权）、`T-O-50`（对象面硬切与错误真源）；[`DNPR01-qna.md`](../../dsh-nano-progress-report/qna/DNPR01-qna.md) 的 `T-O-4`（能硬切不双写）；仓根 [`AGENTS.md`](../../../../AGENTS.md) 核心原则
> **Review HEAD**：`0c0f20b`（行号漂移以「路径 + 符号名」为准）
> **远端 / paid**：`none`（`remote_ops=0`）

## 0. 权威边界（必须有）

本文是 [`DNK01-1120-qna.md`](./DNK01-1120-qna.md) 的精炼消费入口，也是下游直接 CITE 的引用面。本文：

1. 只登记 [业主] 已经接受的 `T-O-1`–`T-O-6`。不新建 Truth-ID，不改变 [业主] 结论，不把摘要升级成新法律。
2. 不保留问题解析、候选方案、推荐论证、证据表或核查过程。这些留在问答原文（含 §2.4 的 12 项冻结前补正）。
3. 与问答的台账或 [业主] 回答不一致时 fail-closed，以问答为 provenance，并修订本台账。
4. 下游只能引用或细化本台账。不得把未选中的选项、或被本台账改判的暂行句，再当成现行合同。
5. `FROZEN` 不表示代码已改、测试已绿、合并已发生。`T-O-1`/`T-O-2`/`T-O-3`/`T-O-6` 的实施尚未开始。
6. 本文不构成 implementation、build、deploy、secret、provider 或任何远端动作的 grant。
7. 推翻任一旧行，只能在原问答里 append-only supersession。不得改旧行，不得在下游文档里改写。
8. **编号按插件族独立**：本册 `T-O-1`–`T-O-6` 与 [DNLS03] 的 `T-O-33`–`T-O-54`、[DNPR01] 的 `T-O-1`–`T-O-17` 互不续接。引用必须带 QNA 名。

### 0.1 总体裁决（必须有）

```text
foundational T-O-1, T-O-4:   FROZEN（Q1 / Q4，[业主] 同意 A）
executional  T-O-2/3/5/6:    FROZEN（Q2 / Q3 / Q5 / Q6，[业主] 同意 A）
OPEN owner decisions:        0（无预留、无待决）
冻结前核查:                  12 项（1 事实校正 / 2 隐含冲突 / 1 竞态 / 6 欠登记 / 1 命名 / 1 叙事），全部并入
足以写实施计划:              YES
足以签发 implementation grant: YES（[业主] 已同意全部推荐方案）
merged / deployed:           NOT CLAIMED（仅 dsh-dev 已部署验证）
```

```text
DNK01-1120-qna.md（已冻结，decision provenance）
  → 本台账（引用面，只投影已选中那一格）
  → 《DNK01 计划》§2（只 CITE；不复制正文）
  → （另立）ImplementationGrant
```

## 1. ★ Truth-Gate 台账

### 1.1 agent 的打开面

| Truth-ID | 子类型 | 已锁定真相（精简） | 来源 | 下游约束（必须落地） |
|---|---|---|---|---|
| `T-O-1` | `foundational` | agent 必须有一条不依赖 GUI cookie 的「打开页面」面：新增 MCP 工具 `sandbox.open {url}`，与 REST `POST /open` 共享同一内核 `openPage(session, url)`；准入各自为政（HTTP 走 `connection.requestRejection`，MCP 走宿主 `tools/call`），不放松 `/open` 鉴权。 | Q1 A | 只加这一个工具，不开放任意 CDP 透传；`url` 过 `navigationUrl()`；失败导航保留尝试地址并写 `argSummary`；返回与 REST 同 `errorId`/`hint`；**必须计入 `isWriteCall()`**，否则被 `T-O-3` 拦不到；`/open` 现为路由内联分支（`routes.js:1679`），提取内核不得复制逻辑，也不得让 MCP 走 HTTP 撞 401。 |

### 1.2 relay 可见与人的拒绝权

| Truth-ID | 子类型 | 已锁定真相（精简） | 来源 | 下游约束（必须落地） |
|---|---|---|---|---|
| `T-O-2` | `execution` | `/control` 增只读 `relay: {conns, lastAt, lastMethod}`：`conns` = 当前连接数；`lastAt` = 最近一次**成功转发**的写方法时间；`lastMethod` **只存方法名、不存参数**。被拒的写不更新 `lastAt`，只更新 `lastAction`。 | Q2 A | 纯增量只读字段（追加本身已获批准）；不改 `writer`/`humanHold` 语义、不改状态码。pane 控制条按**两档**显示：`conns>0`=已接入（弱）；`lastAt` 在阈值内=最近有写（强）；**不得合并成「正在操作」**。阈值是展示常量（建议 90 s），不入合同。旧 pane 缺字段时降级为不显示，不得崩。 |
| `T-O-3` | `execution` | `humanHold.active` 时，relay 的写类命令（`Page.navigate`、`Input.*`、`Runtime.evaluate`）**先记 `lastAction` 再以 CDP error 拒绝**（`kitesurf.control.held`），不转发；读类不拦。`Runtime.evaluate` **读写不可区分，故全拦**，文案须说明「读也需人先放开」。拦截面**只覆盖 agent 主体（MCP 与 relay）**；人在 pane 上的 REST 动作不受约束。 | Q3 A | `kitesurf.control.held` 是**既有** errorId（`:707`/`:915`），不扩枚举；pane 对被拦的一次给可见回执（复用 `T-O-2` 的 `lastAction`）；被拒写不改变 `writer` 锁、不排队、不重放。 |

### 1.3 渲染面与取资源边界

| Truth-ID | 子类型 | 已锁定真相（精简） | 来源 | 下游约束（必须落地） |
|---|---|---|---|---|
| `T-O-4` | `foundational` | pane 默认渲染面是**引擎渲染**（`/shot` 像素）；HTML 原生渲染是显式 opt-in 的**静态投影**（脚本已剥离），其 `<base>` 与所有绝对 http(s) 子资源引用一律改写到同源代理 `/nano-local-sandbox/res/<scheme>/<host>/<path>`，浏览器全程不跨 scheme。`/dom` 版本签名**已由宿主提供**（`domSeq` 只在内容变化时前进、`capturedAt` 是内容戳），浏览器端以其作签名，`at` 仅是渲染时间戳、不参与比对。 | Q4 A | **不新增 `/dom` 字段、不改其语义**（原拟「收归宿主」已成立，登记为现状冻结）。HTML 模式不得成为默认。改写只作用于触发 fetch 的属性（`src`/`href`/`srcset`/`poster`/`data`/`action`），正文中的 URL 文本不动，相对引用交 `<base>`。**path 镜像**是相对引用能在代理空间内解析的原因，不得改成 query 形态。 |
| `T-O-5` | `execution` | `/res` 是「预览取资源」面，**放行任意 http/https**。硬边界：仅 http/https；主机不带凭据；≤24 MiB；15 s 超时；剥 `Set-Cookie`/`Content-Encoding`/`Content-Length`/`X-Frame-Options`/CSP/HSTS/Alt-Svc；重定向在代理空间内跟随；越界按具名 kernel errorId（`res.scheme|host|path|url|size|timeout|upstream|redirect`）拒绝，不静默降级。 | Q5 A | **与 `T-O-4` 互斥耦合**：`proxify()` 连 https 绝对 URL 一并改写，`proxyBaseFor()` 对 https 页同样给代理 base，收窄到私网会破**全部**外链资源，不只混合内容；两条不得单独改动。GET 语义、只读、不透传请求头、不持凭据；错误行走 `stampOp` 落 operations；不加开关。**已知取舍**：https 页也走代理以换取单一取资源路径；改为直连属合同变更，需另裁。 |

### 1.4 公网隧道的处置

| Truth-ID | 子类型 | 已锁定真相（精简） | 来源 | 下游约束（必须落地） |
|---|---|---|---|---|
| `T-O-6` | `execution` | 公网隧道**不作域名黑名单硬拒绝，而作可见警示**：`/open` 与 `/res` 命中已知隧道域时**附 `hint`**（DNK 侧 `kitesurf.navigate.public-tunnel`，DNLS 侧 `res.public-tunnel`），**不改状态码、不阻断**；`/diagnostics` 的 hints 同源提示「本地站走 `networking.hostGateway` + `/res`，不要用公网隧道或自签证书」。这是对「禁止的工作要用 error 禁止」的**有意偏离**：隧道域可自建可更换，域名黑名单不是可靠控制面。 | Q6 A | 两者是 **hint code，不是 error 枚举项**：不参与失败判定、不改状态码；共用各自 catalog 作**唯一登记表**（catalog 若不能表达 hint 语义就扩展 catalog 自身，不另立清单文档）；提示用域名清单只是常量，**不构成安全边界**；若改硬拒绝须另开 QNA，并同时登记「需持续维护的清单」这一配置面。skill 禁令表（`recipes.md` 配方 5）是并存的第二落点，不互相替代。 |

## 2. 与实施的分界

| 议题 | 已冻结 | 未冻结（留给实施/后续） |
|---|---|---|
| 打开面 | 工具名 `sandbox.open`、共享内核、计入写 | 工具描述文案、返回体的具体字段名 |
| relay 可见 | 三个字段与两档语义 | 展示阈值具体秒数、UI 文案与 i18n 键 |
| 接管 | 三类方法、held errorId、只拦 agent | 被拦回执的具体文案与图标 |
| 渲染 | 默认面、代理路径形态、`/dom` 现状 | 测试用例的具体断言 |
| 取资源 | 放行范围与硬边界 | 错误文案措辞 |
| 隧道 | 警示不阻断、hint 语义 | 域名清单内容 |

## 3. 已知会与本册并存的旧状态

- 生产 `dsh.local`（`:3081`）仍在跑**旧插件构建**：无 `/res`、`/open` 仍 401、`/status` 无 `networking`、`/dom` base 未代理。本册冻结的是**目标态**，不是生产现状。
- `dsh-dev`（`:3083`）已部署 `0c0f20b`，仅验证到「启动无 skill schema 错误 + 单测全绿」，不等于 `T-O-1`–`T-O-3`/`T-O-6` 已实现。

## 4. 消费示例

```text
问题：agent 能不能自己打开一个 localhost 页面？
答：  DNK01.`T-O-1` —— 经 `sandbox.open`，与 `/open` 同内核、同准入语义；
      不得放松 `/open` 鉴权，不得让 MCP 走 HTTP。

问题：人点了「接管」，agent 还能用 relay 改页面吗？
答：  DNK01.`T-O-3` —— 会写不行（`kitesurf.control.held`，且记 `lastAction`）；
      `Runtime.evaluate` 因为读写不可区分，一律拦。

问题：本地 http 站为什么一定要走 `/res`，不能只放私网？
答：  DNK01.`T-O-5` —— 因为 `T-O-4` 把 https 资源也改写到代理；
      收窄范围会破全部外链资源，两条互斥。
```
