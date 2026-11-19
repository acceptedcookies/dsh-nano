# `DNLS03` — QnA Truth Ledger

> **Ledger ID**：`DNLS03-TRUTH`
> **范围**：[DNLS] v1.3 合约、接口及消费层升级与适配的对象/控制权/执行面真相（只列已冻结 ID：`T-O-33`–`T-O-54`，共 22 条）
> **文档性质**：`frozen-truth ledger / compact consumption entry`（问答是 decision provenance；本文不是第二真源）
> **状态**：`🔒 FROZEN · foundational 7 条 + executional 15 条（Q25–Q43 全确认） · NOT IMPLEMENTATION CLOSURE · NOT IMPLEMENTATION GRANT`
> **日期**：`2026-11-19`
> **Owner decision provenance**：[`DNLS03-qna.md`](./DNLS03-qna.md)（Round 0 baseline + Round 1–2 foundational Q25–Q28 + Round 3–7 executional Q29–Q43；19 题均有 [业主] 答复，推荐项全部 A（R1–6 逐项确认、R7 逐项签收）；second-opinion 自 Round 1 起 `retired`）
> **上游已冻法律（只 CITE，本文不 supersede）**：[`DNLS01-qna.md`](./DNLS01-qna.md) 的 `T-O-8` 长期治理、`T-O-17` 通用终端面、`T-O-18` 收口判据（含无 agent session 的 UI 可用）；[`DNLS02-qna.md`](./DNLS02-qna.md) 的 `T-O-19/20` 单一命名空间与 HTTP/MCP 同 owner、`T-O-23/25/27` kernel/driver 边界/同页协作/物理复用、`T-O-29` timeout≠cancel、`T-O-31` pin 与构建纪律；仓根 [`AGENTS.md`](../../../../AGENTS.md) 核心原则
> **形成史输入（测量，不裁决）**：[`dsh-nano-local-sandbox-v1.3.md`](../dsh-nano-local-sandbox-v1.3.md)（v1.3 草案，现作对象/协议/UI 证据索引）与 QNA 的 Round 中场评估、源码核查段
> **Review HEAD**：`bd4b056`（QNA 第六/七轮取证快照；行号漂移以「路径 + 符号名」为准）
> **远端 / paid**：`none`（`remote_ops=0`）

## 0. 权威边界（必须有）

本文是 [`DNLS03-qna.md`](./DNLS03-qna.md) 的精炼消费入口，也是下游直接 CITE 的引用面。本文：

1. 只登记 [业主] 已经接受的 `T-O-33`–`T-O-54`。不新建 Truth-ID，不改变 [业主] 结论，不把摘要升级成新法律。
2. 不保留问题解析、候选方案、推荐论证、证据表或中场推演。这些留在问答原文。
3. 与问答的台账或 [业主] 回答不一致时 fail-closed，以问答为 provenance，并修订本台账。
4. 下游只能引用或细化本台账。不得把未选中的选项、或已被本台账改判的暂行句，再当成现行合同。
5. `FROZEN` 不表示代码已改、测试已绿、迁移已应用、或修正案已签署。
6. 本文不构成 implementation、build、deploy、secret、provider 或任何远端动作的 grant。
7. 测量层是当时的 HEAD 事实，`T-O` 是目标态。施工落地后不回改测量层。
8. 推翻任一旧行，只能在原问答里 append-only supersession。不得改旧行，不得在下游文档里改写，不得回改更早的台账。

### 0.1 总体裁决（必须有）

```text
foundational T-O-33..-35:        FROZEN（开轮基线 / [业主] 阶段指令）
foundational T-O-36..-39:        FROZEN（Round 1–2，Q25–Q28 全 A）
executional T-O-40..-54:         FROZEN（Round 3–7，Q29–Q43 全 A / 签收）
OPEN owner decisions:            0（无预留、无待决、无 OPEN 残题）
足以写下游计划:                  YES（T-O 全冻结、无 OPEN；Case 2/4 按 T-O-34 暂缓）
足以签发 implementation grant:    NO
remote / deploy / live:          NOT CLAIMED
```

```text
DNLS03-qna.md（已冻结，decision provenance）
  → 本台账（引用面，只投影已选中那一格）
  → 《DNLS03 计划》§2（只 CITE；不复制正文）
  → （另立）ImplementationGrant
```

## 1. Truth-Gate 总表（必须有）

> 一行一个已有 ID。内核只写已选中的那一格，不写落选项。

| Truth-ID | 领域 | 冻结核心 | 来源 |
|----------|------|----------|------|
| `T-O-33` | 阶段范围 | 本专项名为 `DNLS03`；交付范围是 [DNLS] v1.3 的合约、接口及消费层升级与适配，不是只画一个面板 | 开轮基线 / [业主] 阶段指令 |
| `T-O-34` | 范围/暂缓 | Case 2（[DNMS] `/imagine` 沙箱执行）与 Case 4（[DNN] fx、KV/D1 迁库）暂缓；Case 1（[DNT] 长期终端）与 Case 3（Kitesurf 服务上下文中的终端）在范围内 | 开轮基线 / [业主]「同意 case-2/case-4 暂缓」 |
| `T-O-35` | 归属判据 | 沿用 J1/J2：[DNLS] 接由本地控制面掌握完整环境生命周期的对象；[DNCS] 接以 session 及其生命周期为主的载体；位置与后端类型本身不决定归属 | 开轮基线 / v1.3 §9.0 [业主] 原意 |
| `T-O-36` | 对象身份 | 生命周期归可独立寻址的受管 sandbox；同 env/同 profile 可有多个；身份跨 [dsh] 重启保持；多个 session 可共用；session 实例与策略指纹是使用关系，不是物理身份 | Round 1 / Q25 |
| `T-O-37` | 控制权 | 控制权来自 [DNLS] 自建或明确授权接管；发现/对账只读；profile 持配方，[DNLS] 持受管身份/归属/期望，backend 持运行态/端口/实挂；不以派生视图作恢复真源 | Round 1 / Q26 |
| `T-O-38` | 目标绑定 | 已有对象的读与动作都绑定调用者明确选定的目标；无选择可列举/可首次创建但不执行对象操作；只有一个候选也不自动选中；不设 env/session 默认回退；选择不授予权限 | Round 2 / Q27 |
| `T-O-39` | 终端连续性 | 长期沙箱终端保住原执行，不是保住旧屏；[DNLS] 环境内 PTY broker 持有原终端，[DNT] 呈现/输入/附着；只重启 [dsh] 不终止原任务；重连经重新授权接回；不承诺 sandbox 停止/重建后的进程恢复 | Round 2 / Q28 |
| `T-O-40` | 控制台账 | 每受管 env 一份 `stateRoot/registry.json`；稳定 `sandboxId`/名称/profile/归属/期望/配方引用/backend 绑定/卷与端口分配；改名不改 ID；新卷按 profile/sandboxId；接管旧卷保留实挂；不持 attach.url/屏幕/整份配方/权威健康布尔值 | Round 3 / Q29 |
| `T-O-41` | 目标分派 | 保留能力路径；已有对象 HTTP 只取 query `sandboxId`，宿主 MCP `tools/call` 只取 `arguments.sandboxId`；对象级读写/终端必须有且仅有一个目标；缺失/空/重复/冲突不执行；无 body/header/session/env 兜底 | Round 3 / Q30 |
| `T-O-42` | 创建/附着 | `term.session.create({sandboxId,paneId,openId,service?,cwd?,cols?,rows?}) → {sandboxId,terminalId}` 不发地址；`attach({sandboxId,terminalId})` 核权/归属/执行状态后才发动态地址；list 不发 URL；断连非 close；不重放输入 | Round 3 / Q31 |
| `T-O-43` | 生命周期写 | 同一 sandbox 生命周期写串行，一笔意图只派发一次；`(主体,requestId)` 去重；同键同参返原操作、异参拒绝；删除不重置旧键；创建先持久化 ID+意图；HTTP/MCP 同操作文档；未结束 202 | Round 4 / Q32 |
| `T-O-44` | 准入/授权 | 请求准入不是对象授权；主体由正式宿主接口证明；operator 可无 session 观察/管理/只读发现/显式接管，但不因此读写/附着他人的终端；绑定 session 只见获准 sandbox；终端逐项核 `(主体,sandboxId,terminalId,动作)` | Round 4 / Q33 |
| `T-O-45` | 终端 wire | [DNLS] 沙箱终端硬切 `dnt-ws-v2` + `align:1`；open 带 `v:2,align:1,session:<terminalId>`；ready 回显；不匹配拒绝、无 v1 降级；快照后只发同序列较新 DATA；仅 transport 断线至多一次重连；WS close 只 detach | Round 4 / Q34 |
| `T-O-46` | 服务寻址 | 以 `(sandboxId,serviceId)` 寻址独立服务；profile/driver 提供 service ID/容器端口/协议/允许 cwd/探针；投影声明版本/实测版本/health/observedAt/实际发布；无证据即未知；服务列表不发凭证 | Round 5 / Q35 |
| `T-O-47` | 变更/回滚 | 保存候选不应用；换代须显式授权并核实；同对象记录 `desiredRevision`/`appliedRevision`；`expectedRevision` 拒旧编辑；保存只报告影响；配置回退≠数据恢复；迁移需静默 + 可验证只读快照；接管不迁卷 | Round 5 / Q36 |
| `T-O-48` | 用量采样 | 每 env 一个 [DNLS] 后台采样写者；24h/7d/30d 共用最近 30 天有界分钟槽；每 UTC 分钟每受管 sandbox/代次至多一次；跨重启可读；满载显式留缺口；读数不作控制/审计真源 | Round 5 / Q37 |
| `T-O-49` | 读模型 | 一个授权后的对象投影：fleet 窄行、详情按需、bridge 隔离；fleet 仅取宿主明确配置且主体可见的受管 env；授权先于计数/排序/分页；在途/失败不覆盖实态；进程只读 `/proc`；bridge 只取绑定对象 | Round 6 / Q38 |
| `T-O-50` | 合同版本 | 对象面硬切 `dnls.control/1`；无目标只读 contract 返回 `{contractVersion,capabilities}`；受管 HTTP 带 `X-DNLS-Contract`，MCP 带 `_meta["dnls/contract"]`；缺失/不匹配在派发前拒绝；七项固定业务错误 | Round 6 / Q39 |
| `T-O-51` | 管理入口 | [DNLS] 同包独立交付 web 管理；「沙箱」页签与 `/sandbox` 打开同一 [dsh工作台] 页面；保留宿主入口/安装/容器特权；用正式 client export/宿主 UI/nano-ui；终端清单/创建/关闭可独装，交互留给可选 [DNT] | Round 6 / Q40 |
| `T-O-52` | 附着主体 | 附着权来自宿主可信主体 + 独立对象授权，不来自地址；受限 HTTP/MCP/WS 用实际请求经 `connection.admit(req)`；动态 WS locator 无 bearer；签发与 upgrade 两次核权；撤权阻断输入输出并 detach，不杀 PTY | Round 7 / Q41 |
| `T-O-53` | 计额/自动停 | 每 env/profile 按受管 sandbox 计额；策略许可且可证空闲时只 stop、不 remove；scope 仍为 session/shared 使用/策略范围；已停/失联/未决占位；同一对象换代不重计；不逐出其他对象 | Round 7 / Q42 |
| `T-O-54` | 终端交接 | 通过公开、无凭证、当前 host 范围的 `dsh-resource://sandbox-terminal/<envId>/<sandboxId>/<terminalId>` 交接已有终端；确认正式处理能力后，仅明确新建手势 create 一次；处理器消失显示已创建未连接；恢复只 attach/对齐 | Round 7 / Q43 |

## 2. 规范内核（必须有）

> 按业务簇分组。每条只有来源与已冻结的内核；不落选项、不搬推荐理由、不搬证据表。
> 密度跟源头走：短句就短段；QNA 台账已列出的执行约束按原义投影，不另编一套序号。
> 注：内核按业务簇排列，ID 顺序不连续；QNA 题内 A 项「四项执行说明」中已纳入者按原义投影，未投影的收口轮细节以「全纳入」指针回指 QNA。

### 2.1 阶段范围、归属与对象身份（开轮基线 + foundational）

#### `T-O-33` —— 阶段范围：合约、接口与消费层，不是只画面板

> **来源**：`开轮基线 / [业主] 本次阶段指令首段及阶段命名` ｜ **驱动后续**：`Q25/Q26`

本专项名为 `DNLS03`。交付范围是 [DNLS] v1.3 的**合约、接口及消费层升级与适配**，不是只画一个面板。计划必须同时说明控制方提供什么、消费方如何使用；草案本身不等于逐项授权。

#### `T-O-34` —— Case 2/4 暂缓，Case 1/3 在范围内

> **来源**：`开轮基线 / [业主]「同意你对于 case-2 和 case-4 的暂缓判断」`；四案定义见 v1.3 §10 ｜ **驱动后续**：`Q25/Q26`

Case 2（[DNMS] `/imagine` 沙箱执行）与 Case 4（[DNN] fx、KV/D1 迁库）**暂缓**；Case 1（[DNT] 长期终端）与 Case 3（Kitesurf 服务上下文中的终端）是本阶段在范围内的案例。

- 不以生图 job、凭证注入、笔记迁库或这两案的页面作本期交付条件。
- 暂缓不是永久否决，也不删除既有能力。

#### `T-O-35` —— J1/J2 归属判据，原样沿用

> **来源**：`开轮基线 / v1.3 §9.0 记录的 [业主] 原意` ｜ **驱动后续**：`Q25/Q26`

沿用 [业主] 的 J1/J2 判据：

- **[DNLS]** 对接由**本地控制面掌握完整环境生命周期**的对象。
- **[DNCS]** 对接以 **session 及其生命周期**为主的载体。
- 位置与后端类型本身不决定归属。

本册只锚定原判据；草案作者在 v1.3 §9.0 提出的「排他性补充」不是 [业主] 新答复，也没有据此批准远端 provider。

#### `T-O-36` —— 生命周期归可独立寻址的受管 sandbox

> **来源**：`Round 1 / Q25，[业主] 同意 A 全部推荐` ｜ **驱动后续**：`Q27/Q28`

**生命周期归可独立寻址的受管 sandbox。** 同一 env、同一 profile 可有多个独立启停的 sandbox，身份跨 [dsh] 宿主重启保持；多个 session 可以使用同一 sandbox。session 实例及策略指纹描述**使用关系**，不是物理环境身份；session 结束不等于销毁环境，pane 切换不改变环境身份。

> **下游约束**：细化 `T-O-27`；page/CDP/history 的共享边界是同一 sandbox，不跨 sandbox。[DNLS] 解析目标，[DNK]/[DNT] 不各建权威映射；容器名、端口或旧 session ID 不作替代身份。经授权接管一个存量对象只登记一次；未定默认寻址、协议字段或新 lane、角色枚举、凭证形状、台账介质或路由。

#### `T-O-37` —— 控制权来自创建或明确授权接管，发现只读

> **来源**：`Round 1 / Q26，[业主] 同意 A 全部推荐` ｜ **驱动后续**：`Q27/Q28`

**控制权来自 [DNLS] 自建或明确授权接管；发现和对账只读。** profile 持有配方；[DNLS] 唯一持有受管身份、归属和对象期望配置或配方引用；backend 是运行态、端口和实际挂载的事实来源。允许期望与实际不符或实际未知，不以派生视图作恢复真源。

> **下游约束**：刷新不启停、不重建、不迁卷；接管不授予重建或搬卷许可。不按名称认领相邻 env、未知归属或探测失败的对象，也不将失联对象改绑同名替代物。纳管不等于请求授权：动作仍校验宿主主体与对象范围；列表不授予 attach/stop/delete，不复制 attach 凭证。

#### `T-O-38` —— 已有对象绑定明确选定的目标

> **来源**：`Round 2 / Q27，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q29/Q30/Q31`

**已有对象上的读与动作都绑定调用者明确选定的目标**（对象引用或已明确绑定的上下文）。可一次选择、多次使用；**选择不授予权限**。[DNLS] 解析与校验，无 agent session 的人工使用同样成立。无选择可列举、可首次创建，不执行对象操作；只有一个候选也不自动选中，不设 env/session 默认回退。

> **下游约束**：A 的在途请求和迟到应答仍归 A，不污染 B 视图；对象消失、授权失效或服务不支持，均不改投。消费者只持所选对象引用，不维护容器名、端口或凭证的第二份恢复映射。通过既有公开面同时硬切提供者与消费者，退役隐式 env 寻址；不借此批准路径形状、错误枚举或私有通道。

#### `T-O-39` —— 长期终端保住原执行，不是旧屏

> **来源**：`Round 2 / Q28，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q31`

**长期沙箱终端保住原执行，不是保住旧屏。** 由 [DNLS] 的**环境内 PTY broker** 持有原终端；[DNT] 负责呈现、输入与附着。sandbox 仍运行、终端未退出/终止/按策略回收时，浏览器断连、隐藏 pane 或只重启 [dsh] 进程不终止原任务；重连经重新授权接回同一终端。**不承诺**整机或 sandbox 停止、重建后的进程恢复。

> **下游约束**：终端归属固定到 sandbox；service/cwd 是启动上下文，不另开 Kitesurf 私有终端。独立创建的终端不因 session 相同而合并；pane、session、临时地址不是终端身份。不重放输入、不开新 shell 冒充原程序；broker 不可确认报未知；以宿主重启后新输入能推进原任务辨真伪，而非仅重现屏幕。[DNT] 本地 lane 不变；未审批 wire 版本、重连次数、TTL、凭证形状或新 release-gate。

### 2.2 目标分派、终端创建/附着与 wire

#### `T-O-41` —— 保留能力路径，单目标分派

> **来源**：`Round 3 / Q30，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q32/Q33`

**保留能力路径，单目标分派**：已有对象的 HTTP 能力只取 query `sandboxId`；宿主 MCP `/mcp` 的 `tools/call` 只取 `arguments.sandboxId`。清单、profile 目录、首次创建不造已有目标；对象级读写及终端操作必须有且仅有一个目标。缺失、空、重复、冲突不执行，无 body/header、session 或 env 兜底；不把 sessionId 当替代品，不能用 `/mcp` URL 再传一个选择。

> **下游约束**：宿主准入 → 可信主体/动作/对象授权 → 对象专属上下文、driver 与端点；HTTP/MCP 同 owner。诊断推送及已绑定 bridge/CDP 不跨对象。JSON 应答标识目标，流/无 body 靠连接绑定；不让 A 的迟到结果进 B。提供者、公告/schema、真实 handler 和 [DNK]/[DNT] 同切，无旧 façade；不新发凭证、不登记新错误枚举。

#### `T-O-42` —— 终端创建与附着分离

> **来源**：`Round 3 / Q31，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q33/Q34`

**终端创建与附着分离**：

```text
term.session.create({sandboxId,paneId,openId,service?,cwd?,cols?,rows?})
  → {sandboxId,terminalId}                 # 不发地址

term.session.attach({sandboxId,terminalId})
  → {sandboxId,terminalId,attach:{protocol,url}}
  # 核权/归属/原执行后才发；失联报不可确认、已结束报结束，绝不 spawn，不转 create
```

- 创建键 `(可信主体,sandboxId,openId)`：同参只返原引用、异参拒绝；旧键不复活已结束进程，新开需新键；不引入自动 retry。
- 保持策略/尺寸限制；driver 校验 service/cwd；不收任意宿主 env 或凭证。
- list 不发 URL；read/input/resize/close 按二元引用校验；断连非 close，不补发旧输入；布局只恢复稳定引用。
- [DNT] 仍用通用 `McpLane`，[DNLS] broker 回答执行状态，无私有 import。

> **下游约束**：仅替代 `T-O-17` 中相应工具面/返回值/创建幂等粒度；不据此改 wire、凭证时效或重连上限。

#### `T-O-45` —— [DNLS] 沙箱终端 wire 硬切 v2 + align

> **来源**：`Round 4 / Q34，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q35/Q36`

**[DNLS] 沙箱终端 wire 硬切 `dnt-ws-v2` + `align:1`。**

- 动态 URL 上 `open` 带 `v:2,align:1,session:<terminalId>`；校验与已授权终端一致；`ready` 回显终端/版本/对齐；不匹配拒绝、**无 v1 降级**。
- 按协议公告分派，不按插件名、URL 特征或私有 import 分支；通用 `McpLane`、[DNT] local 及第三方既有合同**不被替换**；只修订 `T-O-17` 的本沙箱 wire，不重开 `T-O-42`。
- 沿用 framed channel、CREDIT/RESIZE/FACTS/AUTO_INPUT/PING/PONG；逐连接流控。
- 环境内屏幕投影先发序号/几何/光标/文本快照，再发同序列较新 DATA；快照是屏幕投影、不是原始字节；停顿/断序重对齐，不可确认报未对齐；不拼旧 replay、不承诺全历史或样式无损；自动输入不免核权。
- 仅 transport 断线至多一次自动重连；重新授权 attach 取地址，不复用过期地址，不 create、不重放输入。拒权、版本不符、已结束或应答超时不自动重跑。
- WS 关闭只 detach，显式 close 才主动终止原执行。

> **下游约束**：`session` 是既有 wire 字段，指 `terminalId`，不是 [dsh] 会话；[DNT] 本地与第三方端点不被迫弃用自身协议。

### 2.3 台账、生命周期写与授权

#### `T-O-40` —— 每受管 env 一份控制台账

> **来源**：`Round 3 / Q29，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q32/Q33`

**每受管 env 一份 `stateRoot/registry.json` 控制台账。**

- 根为 `{version,envId,sandboxes}`；行持稳定 `sandboxId`、展示名、profile、归属、期望覆盖/配方引用、backend 绑定及卷/端口分配。
- 改名不改 ID；新卷 `<stateRoot>/<profileId>/<sandboxId>`；接管旧卷保留实挂路径。
- 预留不等于成功发布：端点读 inspect；不持 `attach.url`、屏幕、整份配方或权威健康布尔值。
- `sandboxId` 分配一次，改名不改 ID；每根一个 env 所有者、一个活动写者；即使显式根目录覆盖导致两个宿主相撞，也拒绝第二个写者，不做最后写入者胜出。先原子持久化意图/预留，再允许特权动作，核实结果后提交绑定。
- 同目录临时文件持久化并原子替换；抢写或落盘失败不报成功。
- 重启只读对账；容器名只作 locator，须有可验证身份/创建代次。未决不重放；inspect 失败为未知；台账损坏、缺失而有存量或版本不识别均不以空表认领；旧对象身份不明须显式核对/接管。

#### `T-O-43` —— 生命周期写串行，一笔意图只派发一次

> **来源**：`Round 4 / Q32，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q35/Q36/Q37`

**同一 sandbox 的生命周期写串行，一笔意图只派发一次。** create/start/stop/restart/recreate/remove（含需重建的资源变更）以 env 内 `(可信主体,requestId)` 去重，绑定动作、对象或首次创建参数的规范化指纹；同键同参只返原操作，异参拒绝；删除不重置旧键。创建先将 ID 与意图一起持久化。操作和去重依据属 `T-O-40` 台账，不以 trace 作恢复源；查询遵守 `T-O-41`。

- HTTP/MCP 同一 `{sandboxId,operationId,action,state,step}`；未结束 HTTP 202。
- `accepted → running → succeeded / failed / indeterminate`；仅派发前可与派发互斥地取消为 `cancelled`；已派发后拒绝取消并返回现态。
- 断线/超时非取消、不重发；已知部分失败保留步骤，不可证实只读核对，未决阻止冲突写。
- 已达态 start/stop 不重复动作；start/recover 不隐含 remove；recreate 须独立授权并先核资源、卷、镜像，明确中断旧终端。
- remove 只移除核实对象，确认后释放端口、**默认保卷**（含接管卷）；不批准删卷接口。

#### `T-O-44` —— 准入不是对象授权，主体由宿主证明

> **来源**：`Round 4 / Q33，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q35/Q37`

**请求准入不是对象授权；主体由正式宿主接口证明。**

- 本 env operator 可无 agent session 观察/管理受管对象、只读发现及显式接管，不因此获准读写或附着他人的终端。
- 绑定 session 只见获准 sandbox，服务和共享 page/history 沿既有能力与写锁；可获准创建自己的终端；终端逐项校验 `(主体,sandboxId,terminalId,动作)`；绑定本身不授予启停/删除、全机日志或他人终端。
- 可见性过滤先于列表、计数、分页和 push。缺可信主体/绑定/必要策略不放行、不发地址，不以空结果冒充成功。
- 宿主准入拒绝沿用宿主结果；已认证但不可见与不存在同 404；可见但无动作权限 403。
- 默认视图不披露真实挂载源、终端内容、私密 env 或 token；审计只存主体/对象/动作/结果及操作引用，不落 attach URL 或输入内容。
- HTTP/MCP/WS 同边界；attach 签发和使用都核权，撤权后不得继续写。
- 取不到可信身份证明报告宿主依赖，不以 localhost、自报角色、硬编 secret 或插件私道代替。

### 2.4 服务、变更与用量

#### `T-O-46` —— 以 `(sandboxId,serviceId)` 寻址独立服务

> **来源**：`Round 5 / Q35，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q38/Q39/Q40`

**以 `(sandboxId,serviceId)` 寻址独立服务。** 对象的 profile/driver 提供 service ID、容器端口/协议、允许的 cwd/探针，分别投影声明版本、实测版本、health、observedAt、实际发布；无证据即未知；版本声明可为空；镜像 tag 或 wrangler 包版本不是 engine 进程版本。按对象选 driver，不选首个 CDP profile。服务列表不发凭证。

- env 范围不重叠；同根各 profile 在创建意图内按服务整组预留 `(loopback 地址,协议,hostPort)`，不要求邻号；同 env 所有 profile 共用该根的预留检查，不为每个 driver 各建池。
- OS 占用/池不足/映射不符不报成功；已知没创建才回收此次预留，部分/不确定保留核对，不换号重发。
- 停止保留，删除确认后释放；接管保留实际发布。
- probe/bridge/CDP/详情只取同对象 inspect 映射，无 `httpBase` 兜底或 `enginePort+1`，区分未发布与不健康。
- service 只作 create 上下文；driver 验容器内 cwd 边界，不收宿主路径/任意 env；不支持则拒绝；重连仍按终端引用。

#### `T-O-47` —— 保存候选不应用，换代显式授权并核实

> **来源**：`Round 5 / Q36，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q38/Q39/Q40`

**保存候选不应用，换代须显式授权并核实。**

- 同对象记录 `desiredRevision` 和最后核实的 `appliedRevision` 引用，按 `expectedRevision` 拒绝旧编辑。
- `appliedRevision` 是消费回执，不是另一份配方或恢复脚本。区分 profile 默认与 CPU/内存覆盖，验证单位/界限，超界拒绝不静默截断；空闲策略不即时扫停活跃终端；网络/挂载仅支持宿主与 driver 声明且可验证的范围。
- 保存只报告影响，不构建、启动或停机。
- operator 确认对象、候选、终端中断及卷计划，走 `T-O-43`。
- 先核实例身份、实挂卷、端口、候选 pin/runtime 回执、镜像 digest 与回退所需旧产物；歧义/保护不足不拆旧；配方摘要不是镜像 digest，镜像 tag 也不是代次。
- 新代次/卷/资源/服务均核实才推进 applied；失败保留候选、最后核实回执与真实步骤，不谎报旧实例存活。
- 重建默认保卷；**配置回退**是兼容当前卷的显式新操作、新代次。
- 可能迁格式/卷时先停写并有可验只读快照，无能力则拒绝；不把只读快照当第二份可写真源。**数据恢复**另行确认恢复点及后续写入损失，隔离验证再切唯一写者，不自动覆卷。
- 接管不迁卷，回退不复活 PTY、不改官方 pin。

#### `T-O-48` —— 每 env 一个后台采样写者，30 天有界分钟槽

> **来源**：`Round 5 / Q37，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q38/Q39/Q40`

**每 env 一个 [DNLS] 后台采样写者；24h/7d/30d 共用最近 30 天有界分钟槽。**

- 宿主运行时按 UTC 每个已核实 sandbox/代次每分钟至多采一次，记时间、来源、代次及可得指标；不因刷新多采。
- 跨宿主重启可读，按时间淘汰且限制对象数/存储预算，满载显式留缺口；读数不作控制或审计真源；分钟库是读数的唯一持久源，三个时间窗查询同一份数据，不写三份可恢复汇总。
- 截止最近完成的 UTC 分钟，取 `[end-window,end)`。
- 实测内存 bytes 报有效样本均值/峰值；CPU 单位 core，累计量仅限同代次连续段内相邻分钟差除实际经过秒数，均值按有效时长加权。
- 首次/倒退/断段/换代不跨界，单位不明不猜；停机、漏采、失败、真零区分，不做零填充或静默插值。
- 每指标给单位、有效/应有槽及值或 null；分母按窗口与纳管寿命内的完整分钟槽（含停机/失败），未创建时段不算。
- 仅汇合已验证片段；先核历史可见范围，再按同分钟同单位可加量汇总可见对象，报告贡献/应有对象数，缺样不补零、不反推隐藏对象；已验证片段可归同一 sandboxId 查询，但不拼接计数器。
- 进程表、命令行、屏幕、token 不入分钟库。

### 2.5 读模型、合同版本与管理入口

#### `T-O-49` —— 一个授权后的对象投影：fleet 窄行、详情按需、bridge 隔离

> **来源**：`Round 6 / Q38，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q41/Q42`

**一个授权后的对象投影：fleet 窄行、详情按需、bridge 隔离。** 完整边界见 Q38 的 A 项执行说明。

- `GET /nano-local-sandbox/fleet` 仅取宿主明确配置且主体可见的受管 env；来源不可用标不完整，不遍历相邻 home、不代写、不泄露隐藏 env。host 容量不从可见对象反推。
- `GET …/sandboxes` 与 `sandbox.list` 同 owner；`GET …/inspect?sandboxId=B` 与 `sandbox.inspect` 同 owner；授权先于计数/排序/分页，发现不混入受管清单。
- 窄行分列 env/对象/名称/profile、已核实代次或空、观测时间、running/stopped/missing/unknown、driver 健康、操作 state/step 及期望/已应用修订；在途、失败不覆盖实态；实际身份有歧义不挂旧代次的绿灯。
- 服务、可见终端数、覆盖度不带私密正文/路径/凭证；列表刷新不得隐式采集进程、日志、屏幕或触发 prepare。
- 获准 operator 主动读 `…/processes?sandboxId=B`，固定只读 `/proc`，PID 升序，默认 50/最多 200，pid/ppid/短名/状态/实测值及代次/时间/truncated；不暴露 argv/env、宿主 PID，不把旧代次 PID 当可控制引用，不接调用者命令，不让空行冒充失败；仅在已核实运行的对象内读取。
- 刷新不触发重操作。推送限已验证发布者、env/对象/代次和单调序号，宿主重启重绑，乱序/异对象拒收；合法清空覆盖旧投影，过期报时间，不拼最长历史，不靠 `storePath/httpBase` 选胜者。不可信共享读者只见非受限健康。

#### `T-O-50` —— 对象面硬切 `dnls.control/1`

> **来源**：`Round 6 / Q39，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q41/Q42/Q43`

**对象面硬切 `dnls.control/1`。**

- 无目标只读 `GET /nano-local-sandbox/contract` 与 `sandbox.contract` 返回同源 `{contractVersion,capabilities}`，不授权；能力不表示权限、不枚举隐藏对象；先发现后调用，不试写探版本；旧提供者不认识发现接口即停止。
- 受管 HTTP 带 `X-DNLS-Contract`；宿主 MCP 带 `tools/call.params._meta["dnls/contract"]`；对象 JSON/bridge push 带 `contractVersion`；无 body 用绑定与响应头。
- 宿主准入后、访问/派发前拒绝缺失/不匹配。major 内可忽略只读新增字段，不改已有语义/单位/可空性；第三方、原生 MCP 协商与 [DNT] local 不改；沙箱 wire 仍为 `T-O-45`。
- 七项固定业务错误：`sandbox.contract_mismatch` 400；`sandbox.{name_taken,port_exhausted,quota,state_conflict,image_missing}` 均 409；`sandbox.upgrade_failed` 500（已知派发后失败，非未决）。
- `errorId/status/cause/next` 与已有 operation 引用跨 HTTP/MCP 同义，MCP 用 isError；查失败操作可读取成功；仅在获准范围内报告细节，不能用冲突消息揭示其他主体。
- 保留宿主拒绝、404/403、JSON-RPC 错误和既有重试边界。版本、route 审核、tool schema/dispatch、错误各有唯一来源；bindings/perf/发布产物投影，driver 目录按目标组合，不按全局活动 profile 漂移。
- 不补无目标兼容，不扩全仓生成器或闸门。

#### `T-O-51` —— 同包独立交付 web 管理，终端交互留给可选消费者

> **来源**：`Round 6 / Q40，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q41/Q43`

**[DNLS] 同包独立交付 web 管理，「沙箱」页签与 `/sandbox` 打开同一 [dsh工作台] 页面。**

- 保留宿主入口、安装方式及容器特权点；无 agent session 的获准 operator 可管理。
- 用正式 client export/模块、宿主 UI/主题/语言与 nano-ui；不加独立 shell、私有 DOM 或第二个设计面。缺槽位/命令冲突报宿主依赖，不覆盖宿主命令。
- 展示获准 fleet/创建/用量/部署；按所选目标展开服务、进程、存储/网络、时间线、设置、关于、终端等，不浏览业务正文。
- 只持视图与稳定引用；拒权、为空、缺样、进度、失败分开；确认影响后一次提交，断线查原操作，迟到数据不串对象。
- 终端清单、明确创建（不连接）、关闭可独装；交互由可选 [DNT]/同协议客户端呈现；无正式处理能力不先建 PTY、不先创建孤立终端再假报已打开、明示不可用；不用 openLocal/本机 shell、token 剪贴板/私道/专有 lane 兜底；已有终端可提供稳定非凭证引用供获准用户选择，引用不授予 attach。
- [DNK] 仍做设计；[DNT] 布局仅稳定引用，重附着再授权。
- 消费者同切不等于必装，关页/卸载不是杀进程；未适配的消费者明确不可用。

### 2.6 收口轮：主体、寿命与交接

#### `T-O-52` —— 附着权来自宿主可信主体，不来自地址

> **来源**：`Round 7 / Q41，[业主] 签收「A 宿主核身」` ｜ **驱动后续**：`收口`

**附着权来自宿主可信主体及独立对象授权，不来自地址。**

- 受限 HTTP/MCP/WS 用实际请求经 `connection.admit(req)`；按 host/env 的稳定 principal、可信使用绑定、目标及动作核权。
- 单用户本 env 的 owner 可管理，但不因此可读所有终端；共享 browser owner 不是多用户证明，临时 `peer.id` 不是持久归属。
- 动态 WS locator 无 bearer，绑定目标而非可转授权限；发放及 upgrade 两次核权（upgrade 在接通 broker 前再次 admission、核对象代次/终端归属）；持续验证凭证/业务权限；撤权或失效即阻断输入输出、清队列并 detach，**不杀 PTY**。
- 不把宿主 cookie/token/原始请求或可绕过宿主的端点交给容器、日志或布局；broker 不接受公网/loopback 直连作为替代授权；`peer.signal` 不足以证明业务授权，每批受限数据前须能确认主体与业务权限并能及时停空闲连接，无法可靠确认就不开放此流。
- 重启重验主体及原执行，无法证明则拒绝；不批准新票据、operator 密钥或认证插件，不向 broker 传宿主凭证。Q41 A 四项执行说明全纳入。

#### `T-O-53` —— 按受管 sandbox 计额，可证空闲只 stop 不 remove

> **来源**：`Round 7 / Q42，[业主] 签收「A 计对象只停不删」` ｜ **驱动后续**：`收口`

**每 env/profile 按受管 sandbox 计额；策略许可且可证空闲时只 stop、不 remove。**

- scope 仍为 session/shared 使用/策略范围；不新增 `scope: sandbox`，`shared` 不免除逐次授权。
- 创建与接管先原子占位；已停/失联/未决占位；同一对象的绑定/换代不重计；只读发现、session、terminal 不占额；确认未建、派发前取消或既成对象确认删除才退，不以 quota 逐出其他对象；并发纳管与创建须由同一台账写者原子判额；满额报 `sandbox.quota`，不把无权限对象细节作为原因。
- 物理生命周期单位固定为 sandbox，不再用 profile `scope` 选容器；自建时接受 profile 空闲策略，接管默认手动停，operator 可显式启改；live/detached PTY、活跃工作/在途写或 broker 未知均不可自动停；负有持续工作职责的服务视为不能回收。
- 连续证明完整空闲窗，断档重计，不补算断档、不在启动时集中停机；与新使用串行复核，按对象/代次/空闲周期合并操作；打开 fleet、读 stats、收遥测不刷新使用时间，新使用/新 PTY 重置计时。
- 停止保 ID、端口、卷和名额，不后台预热。
- 到期在对象写边界内与 attach/create/use 串行复核；新使用使停机条件失效；断线/不确定不重发。
- 成功只标已停止，不删行/删卷/杀 detached PTY；显式中断活动终端另走手动停机。Q42 A 四项执行说明全纳入。

#### `T-O-54` —— 通过公开资源地址交接已有终端

> **来源**：`Round 7 / Q43，[业主] 签收「A 公开资源导航」` ｜ **驱动后续**：`收口`

**通过公开、无凭证、当前 host 范围的 `dsh-resource://sandbox-terminal/<envId>/<sandboxId>/<terminalId>` 交接已有终端。**

- 地址只标识**已存在**的终端；各 ID 为经校验/编码的单独路径段；不编码主机 URL、session、shell、命令、attach 地址或 token，不承诺跨主机可用；未安装或不兼容的处理器不能作为可交互证明；目标 [DNLS] 与 `dnls.control/1` 从当前宿主的公开路由/合同发现确认，不从链接构造网络目的地。
- 确认正式处理能力后，仅明确新建手势以 `paneId/openId` 创建一次；处理器消失显示「已创建未连接」；重试导航不制造 T2；对已存在的 T，重开只走引用→核权→attach→对齐。
- 无处理器不为打开交互而预建，可手动选择公开目标；任何符合合同的处理器均可注册，不固定 [DNT] 私有 kind。
- 调用方和处理器各守正式接口；引用不授予权限，不带 URL/token/命令；通用 `McpLane` 不新增 lane，不回落本机。
- 未决 create 只按已授权幂等语义核实，不另换键自动重跑；不可见引用按同一拒绝边界，不据此泄露已结束的 T；本地 lane 和第三方生命周期不一并改。
- 恢复、切页、卸载不 close 或重放；只显式结束才终止，重复关闭不再杀。
- 缺少无 session 的正式页签入口记为**宿主交付依赖**；不得以假 session 顶替，API 可用不等于该 UI 已交付。Q43 A 四项执行说明全纳入。

## 3. 收口（必须有）

- 形成史文档（v1.3 草案、QNA 中场评估、修订历史、源码核查段）只作测量指针，不在本文产生新裁决。
- 本文没有新建 Truth-ID。
- 与 [`DNLS03-qna.md`](./DNLS03-qna.md) 冲突时以该问答为准。
- 下游 action-plan 不填写 Q/A，不修改本台账的规则句。
- 需要推翻时，回到原问答追加 supersession，再投影到本台账的对应行。

## 4. 启用的插件

> 只列触发成立的插件；未触发的已删。

### 4.1 P1 · 基线事实层（非 `T-O`，本台账只 CITE）

> 问答内已登记、但不产生 Truth-ID 的事实：阶段基线、HEAD 实测、源码核查、当前实现缺口。**具裁决效力、下游会当口径用的项**在表后点名。

| 事实 ID | 一句话 | 出处 |
|---------|--------|------|
| `B-1` | `DNLS03` 是 v1.3 合约/接口/消费层升级，不是面板专项；Case 2/4 暂缓，Case 1/3 在范围内 | QNA §1 `T-O-33/34`、§7 |
| `B-2` | J1/J2 是 [业主] 原判据；位置/后端类型不决定归属；草案的「排他性补充」未获 [业主] 新答复，也未批准远端 provider | QNA §1 `T-O-35` |
| `B-3` | QNA v1.0 已冻结：19 题（Q25–Q43）、22 条 `T-O`，全部 A（R1–6 确认、R7 签收），无 OPEN 残题；second-opinion 自 Round 1 起 retired | QNA 头部、§0、§7 |
| `B-4` | QNA 取证快照：`a8d25d1`（R1–4 原始快照）、`652e8c8`（R5）、`bd4b056`（R6–7）；行号漂移以「路径 + 符号名」为准 | QNA 头部 |
| `B-5` | 当前 [DNLS] 终端是 `term.session.create` 按 `sessionId` 复用、env 容器 PTY、`dnt-ws-v1`、loopback + token；`term.session.list`/`term.audit` 现状随创建即发 `attach.url`；`profiles/terminal/pty-entry.mjs` 仅为 stub | QNA Q25/Q28/Q31/Q34 |
| `B-6` | 当前 `instanceId` 是 session 记录，不是物理身份；两个 session 可指向同一容器；`registry.json` 未实现 | QNA Q25/Q29 |
| `B-7` | 当前 [DNLS] 包只有 host bundle，无 `./client` / `dsh.client`；`T-O-51` 是目标态，不是现状 | QNA Q40 |
| `B-8` | 当前服务探测仍可能用 engine `httpBase` / `enginePort+1`；当前 stats 是单次读取；当前 operation trace 把客户端断连标 `cancelled`（cap 200 行）；当前 scope 计内存记录、sweep 删行 | QNA Q32/Q35/Q37/Q42 |
| `B-9` | 宿主 `connection.admit(req)` 在 pinned rc.1 可返回 Peer；共享 browser owner 不是多用户证明；[DNLS] 尚未接线，且未批准新 bearer | QNA Q41 |
| `B-10` | `dnls.control/1` 是对象合同版本，不是包版本 `1.3`；`dnt-ws-v2` 的 `session` 是 `terminalId`，不是 [dsh] 会话；包内既有 `dnls.control` 绑定 id（`/control` 人工接管回路）与合同版本无关 | QNA `T-O-45/50` |
| `B-11` | `scope: session/shared` 是使用/策略范围，不是生命周期模式；`stop` 保留 ID/卷/端口/名额，`remove` 默认保卷，无删卷接口 | QNA `T-O-43/47/53` |
| `B-12` | 本册不授权 implementation、remote、deploy、live、发布；Case 2/4 不在本期；[DNCS] carrier 不由 [DNLS] 接管 | QNA §7/§8 |

> **裁决效力点名**：`B-1`/`B-2` 是范围与归属口径；`B-5`–`B-9` 是当前实现缺口，用于施工前定位，不得当目标态；`B-10`/`B-11` 是读法纠偏；`B-12` 是授权边界。其余作上下文。

### 4.2 P2 · 权威次序

`DNLS03-qna.md`（decision provenance）> **本台账（投影面）** > 《DNLS03 计划》（只 CITE）> ImplementationGrant。不一致时**回到问答**修订本台账，不得反向改问答。上游 `DNLS01/02` 的既有 `T-O` 在未被本册明确局部替代的范围内继续有效。`T-R` 与测量是事实、不是 [业主] 真相；`QNA_FROZEN` ≠ 代码 PASS。

### 4.3 P3 · 与上游真相的关系

| 上游 ID | 关系 | 回改上游正文 |
|---------|------|----------------|
| `DNLS01 T-O-8`（长期治理四原则） | 只消费；本册不 supersede | 否 |
| `DNLS01 T-O-17`（通用终端面） | 局部替代：仅 [DNLS] 沙箱终端的 create/attach 工具面、返回值与创建幂等粒度；wire 由 `T-O-45` 定点修订；[DNT] local 与第三方端点保留 | 否 |
| `DNLS01 T-O-18`（无 agent session 的 UI 可用） | 只消费；由 `T-O-44/51/54` 落执行面 | 否 |
| `DNLS02 T-O-19`（单一命名空间/能力路由） | 只消费；`T-O-41` 保留能力路径 | 否 |
| `DNLS02 T-O-20`（HTTP/MCP 同 owner/同源投影） | 只消费；`T-O-41/49/50` 细化 | 否 |
| `DNLS02 T-O-23`（kernel/driver 边界） | 只消费；`T-O-46` 按对象选 driver | 否 |
| `DNLS02 T-O-25`（同一 page target、MCP 写锁） | 只消费；不与终端授权混同 | 否 |
| `DNLS02 T-O-27`（session 记录隔离、物理复用） | 细化：`T-O-36` 把生命周期从 session 记录上移到受管 sandbox；共享 page/CDP/history 边界改为同一 sandbox | 否 |
| `DNLS02 T-O-29`（timeout≠cancel） | 只消费；`T-O-43` 保持断线/超时非取消 | 否 |
| `DNLS02 T-O-31`（pin/build/repin） | 只消费；`T-O-47` 不重写官方 pin | 否 |

> 注：本册不改写上游正文；`T-O-17` 的局部替代仅限 [DNLS] 沙箱终端，不扩大到 [DNT] local 或第三方 MCP 端点。

### 4.4 P4 · 冻结审计注记（append-only，不改内核原句）

> `AF-1`：`dnt-ws-v2` 的 `session` 字段一律读作 `terminalId`，**不是** [dsh] 会话 ID；旧 `sessionId` 不是终端身份。

> `AF-2`：`term.session.create` 的 `service` 是**同一 sandbox 内的启动上下文**，不是另一个环境；不得据此新开 Kitesurf 私有终端或另一条 lane。

> `AF-3`：`stop` 只停止对象，保留 ID、端口、卷和名额；`remove` 默认保卷；**没有**删卷接口。不得把 `stop` 读作 `remove`，也不得把删除确认读作数据删除授权。

> `AF-4`：Case 2/4 的「暂缓」是本期范围收窄，**不是永久否决**，也不删除既有能力；不得据 `T-O-34` 把 [DNMS]/[DNN] 已有功能判为退役。

> `AF-5`：`scope: session/shared` 是**使用关系/策略范围**，不是生命周期模式；不得新增 `scope: sandbox`，也不得用 `scope` 选容器。

> `AF-6`：`dnls.control/1` 是**对象合同版本**，不是 npm 包版本 `1.3`，也不是 [dsh] 的版本；版本匹配不授予权限，缺 `sandboxId` 仍按 `T-O-41` 拒绝。

> `AF-7`：`sandboxId` 是对象身份，**不是凭证**；选择不授予权限，locator 不授予权限，资源引用也不授予权限。

### 4.5 P6 · 残项、不得重开、授权边界

- **残项**：
  1. 实施时仍须核实目标安装件的**宿主主体/撤权能力**，以及**无 agent session 的正式 [dsh工作台] 入口**；缺一则对应能力报宿主依赖，不用假 session/私有通道补位。
  2. Case 2/4 按 `T-O-34` 暂缓；其原语（生图 exec、KV/D1 迁移）不在本期出口。
  3. 自动 stop 的具体配置值、终端 wire 的重连次数/TTL/凭证形状、`service` 探针的具体实现，未在本册冻结；按实现细节处理，不得反推成新合同。
- **残项是否阻塞当前出口**：`NO`（真相层已冻结）；**阻塞受影响能力的实现**，须在计划中登记为宿主依赖或 deferral。
- **不得重开**：Q25–Q43 的已冻结选项；`T-O-33`–`T-O-54`；无目标默认槽/`default`；`/sandboxes/:id/...` 对象路径；`dnt-ws-v1` 降级；旧 façade/别名；新 bearer/operator 密钥；自动 remove/删卷；新 release-gate；Case 2/4 本期纳入；[DNCS] carrier 接管。
- **仍然不授权**：implementation grant、远端、deploy、live、发布、版本 bump/tag、跨 provider 凭证、第二套设计面。

## 修订

| 版本 | 日期 | 变更 |
|------|------|------|
| `0.1.0` | 2026-11-19 | 首版：从 `DNLS03-qna.md`（v1.0 已冻结）抽取 22 条 `T-O` 投影为统一 truth ledger；启用 P1/P2/P3/P4/P6 |
