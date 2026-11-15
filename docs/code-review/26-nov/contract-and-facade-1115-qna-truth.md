# `CF1115` — QnA Truth Ledger

> **Ledger ID**：`CF1115-TRUTH`
> **范围**：[dsh-nano] 全部活跃插件 contract 与 facade 统一为固定真源、分阶段统一与测试的执行层真相（只列已冻结 ID：`T-O-CF1115-1`–`-22`，共 22 条真相 / 126 条细节条款）
> **文档性质**：`frozen-truth ledger / compact consumption entry`（问答是 decision provenance；本文不是第二真源）
> **状态**：`🔒 FROZEN · baseline 6 条 + foundational 4 条（Q1–Q4）+ executional 12 条（Q5–Q16）· Q1–Q16 全选 A · NOT IMPLEMENTATION CLOSURE · NOT IMPLEMENTATION GRANT`
> **日期**：`2026-11-15`
> **Owner decision provenance**：[`contract-and-facade-1115-qna.md`](./contract-and-facade-1115-qna.md)（Baseline U-1–U-6 归档 + Round 1–6 逐轮「同意全部推荐」，Q1/Q2→`-7`/`-8`、Q3/Q4→`-9`/`-10`、Q5–Q7→`-11`–`-13`、Q8–Q10→`-14`–`-16`、Q11–Q13→`-17`–`-19`、Q14–Q16→`-20`–`-22`；second-opinion 全程 `retired`）
> **上游已冻法律（只 CITE，本文不 supersede）**：[`DNLS01-qna.md`](../../specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md)（`T-O-8` 长期治理四原则 :55、`T-O-10` 先验收后硬切/无兼容第四阶段 :57 及读法判例 :158-166（「硬切=切割方式非时序」:163、「不兼容=合同面」:165）、`T-O-12` instance scope :59、`T-O-17` [DNLS] 八工具/幂等/attach :64，及 :62-65/:548-554/:726-731）、[`DNMS01-qna.md`](../../specs/dsh-nano-model-selector/qna/DNMS01-qna.md)（R-16 vendoring/overlay/class-identity 精确例外 :94-96、`T-O-DNMS01-15` 闭集错误码登记 :66）、仓根 `AGENTS.md` 六条核心原则 + worktree 约定 + U-6 长期治理四原则
> **形成史输入（测量，不裁决）**：[`contract-and-facade-1115-eval.md`](./contract-and-facade-1115-eval.md)（分析与债务锚点；36 项逐包观察 + 4 项横向观察按原号保留）、QNA 内 E1–E76 逐轮 `file:line` 调查
> **Review HEAD**：`f7199f9`（`main @ f7199f96259baad78b1b6f162db38297ecaff5c1`；行号为该时点快照，漂移时以「路径 + 符号名」为准）
> **远端 / paid**：`none`（`remote_ops=0`）

## 0. 权威边界（必须有）

本文是 [`contract-and-facade-1115-qna.md`](./contract-and-facade-1115-qna.md) 的精炼消费入口，也是下游直接 CITE 的引用面。本文：

1. 只登记业主已经接受的 `T-O-CF1115-1`–`-22`，连同其 §1.3–§1.8 的 F 条款细节与被宣告为规范组成的原题矩阵/签名/表（出口表、registrar/client/toolset 签名、判别矩阵、FamilyDefinition 形状、P0–P4 阶段与八包责任表、terminal 两提供面矩阵、sandbox 二十工具表、native 八义务表与四错误码表）。不新建 Truth-ID，不改变业主结论，不把摘要升级成新法律。
2. 不保留问题解读、候选方案、推荐论证、E1–E76 证据表、中场推演或修订链。这些留在问答原文。
3. 与问答的台账、F 条款或业主回答不一致时 fail-closed，以问答为 provenance，并修订本台账。Q14–Q16 的原题正文矩阵/表与 §1.8 索引表达同一决定；索引与正文表述差异属编辑错误，按 append-only 修正，不形成第二套业务目标。
4. 下游只能引用或细化本台账。不得把未选中的选项（多领域权威包、按包/按层销账、统一 wire 信封、B/C 路线等）、或已被本台账改判的暂行句，再当成现行合同。
5. `FROZEN` 不表示代码已改、测试已绿、迁移已应用、或修正案已签署；本 campaign 没有实施协议迁移或运行时验收，36+4 项评估观察未因收口清零。
6. 本文不构成 implementation、build、deploy、secret、provider 或任何远端动作的 grant；不新增 release-gate。
7. 测量层是当时的 HEAD 事实（P1），`T-O` 是目标态。施工落地后不回改测量层。
8. 推翻任一旧行，只能在原问答里 append-only supersession。不得改旧行，不得在下游文档里改写，不得回改更早的台账。

### 0.1 总体裁决（必须有）

```text
baseline    T-O-CF1115-1..-6:      FROZEN（业主指令归档，2026-11-15）
foundational T-O-CF1115-7..-10:    FROZEN（Round 1–2，业主逐轮同意全部推荐，均选 A）
executional T-O-CF1115-11..-22:    FROZEN（Round 3–6，业主逐轮同意全部推荐，均选 A）
OPEN owner decisions:              0（§7.3 全部 owner-gated 余额已映射；无 Round 7）
足以写下游计划:                     YES（P0–P4 交接无 owner-gated 空白）
足以签发 implementation grant:      NO
remote / deploy / live:            NOT CLAIMED
```

```text
contract-and-facade-1115-qna.md（已冻结，decision provenance）
  → 本台账（引用面，只投影已选中那一格）
  → 下游统一实施计划 / P0–P4 action-plan（只 CITE；§1 T-O 1:1、P1 事实按 CITE 型别引用）
  → （另立）ImplementationGrant
```

## 1. Truth-Gate 总表（必须有）

> 一行一个已有 ID。内核只写已选中的那一格，不写落选项。

| Truth-ID | 领域 | 冻结核心 | 来源 |
|----------|------|----------|------|
| `T-O-CF1115-1` | 范围 | 全部活跃插件的 contract 与 facade 统一为固定真源，分阶段完成所有插件的统一与测试；不以共享 helper 或单包试点代替全体目标 | Baseline / U-1 |
| `T-O-CF1115-2` | 分析锚点 | `contract-and-facade-1115-eval.md` 为分析与债务锚点；其代码事实、检查结果与治理建议必须区分，建议未经裁决不升级为合同 | Baseline / U-1 |
| `T-O-CF1115-3` | 治理约束 | 按 U-6 四原则与根 AGENTS 权威边界推进；不借统一引入双写、可彻底退役合同的兼容壳、私域耦合或插件私有通道 | Baseline / U-6 |
| `T-O-CF1115-4` | 提问程序 | 先两轮每轮两题 foundational-qna（共四题），再转 executional-qna；不提前指定执行轮题数 | Baseline / U-3 |
| `T-O-CF1115-5` | 渐进纪律 | 下一轮问题须等上一轮全数冻结、完成中场评估，再经新一轮事实调查与 Reasoning 生成，不预设题目或推荐 | Baseline / U-4 |
| `T-O-CF1115-6` | 册体质量 | 严格按 progressive 模板，不设 second-opinion；每题含解读/选项/推荐执行说明/证据反例四组信息，提问前完成 file:line 取证 | Baseline / U-2、U-5 |
| `T-O-CF1115-7` | 归口拓扑 | 一个构建期共享的 contract/facade 归口包作为可执行真源，内部按协议/领域分层；规范决定和业务/host 权威不迁移，插件自包含交付，派生物不得成为第二作者源 | Round 1 / Q1-A |
| `T-O-CF1115-8` | 销账单位 | 以合同族的生产者—消费者闭环为最小完成/销账单位；经真实接线、相关测试、成对切换及旧面退役才销账，最终逐包证明全覆盖 | Round 1 / Q2-A |
| `T-O-CF1115-9` | 作者模型 | 以领域公共能力/操作及生命周期语义为合同作者主轴，协议入口为显式绑定与派生投影；不造 runtime 总线 | Round 2 / Q3-A |
| `T-O-CF1115-10` | 同约判定 | 按经批准且显式的支持面/版本约束判定多提供方同约；真实广告、兑现承诺、消费者不静默降级；继续先验收后硬切 | Round 2 / Q4-A |
| `T-O-CF1115-11` | 归口基座 | `packages/dsh-interface`（纯 ESM 构建期私有库）以显式 contracts/host/build 出口统一作者与消费，单向复用唯一 guard，每包构建物化、离仓自包含交付 | Round 3 / Q5-A |
| `T-O-CF1115-12` | web 注册 | 显式 channel/match 绑定表 + `createWebRegistrar` mixed-batch；handler 只按 id 接线；统一预检、fail-closed 准入、统一释放与多维登记对账 | Round 3 / Q6-A |
| `T-O-CF1115-13` | 首批闭环 | 首批只闭环公共 web 注册/准入合同族与 [DNN]/[DNT] 真实绑定；隔离验证、协议保真、离仓产物、成对硬切、限定债务销账 | Round 3 / Q7-A |
| `T-O-CF1115-14` | JSON facade | 统一 JS `JsonOutcome` 五类失败 + `createJsonClient` + 每操作唯一目标 codec；不新造全仓 wire 信封、不猜测兼容旧格式、不自动重放副作用 | Round 4 / Q8-A |
| `T-O-CF1115-15` | MCP facade | 同一 MCP 工具定义 + 完整 handler map + 真实输入/结果校验 + `decodeMcpReply` 三层解码；attach 严格兑现获准 protocol/URL，不降级 wss | Round 4 / Q9-A |
| `T-O-CF1115-16` | 导入服务 | `nanoNotepad` 只公开最小导入服务（Cordis 可选服务），私有 controller 持状态；DB 就绪/卸载/过期句柄接线；成对退役 window global 及包内旧引用 | Round 4 / Q10-A |
| `T-O-CF1115-17` | 作者记录 | 最小 ESM `FamilyDefinition` 唯一关联操作/绑定/提供面/批准来源；各 facade 消费同源投影；不造通用 IDL、runtime 注册中心或自动裁定业务冲突 | Round 5 / Q11-A |
| `T-O-CF1115-18` | host 适配 | 领域内薄 adapter 直接承接官方 host 契约与精确获准例外；业务实例归插件 scope；明确桥身份、配置失效与异步结算；不复制影子 host | Round 5 / Q12-A |
| `T-O-CF1115-19` | 全包交接 | 继承 P0 首批并锁定 P1–P4 依赖阶段与八包责任；逐合同族成对硬切、验证、退役销账；阶段不成为全仓发布总闸 | Round 5 / Q13-A |
| `T-O-CF1115-20` | terminal 提供面 | [DNLS] 八工具与 [DNT] local 十九工具是两个显式语义提供面；共享可共享字段，create 等语义差异分别标识；固定最小 McpLane 调用、准确 v1/v2 attach、不自动重发写入 | Round 6 / Q14-A |
| `T-O-CF1115-21` | sandbox/业务 wire | host 兑现二十个 sandbox 工具的明确输入/业务结果；bridge 只做获准 CDP 驱动；`/s3/config` 只留 `probe`、`/rpc` 只留 `manifest.get`；其余公开 JSON 按 `-14` codec 逐项承接 | Round 6 / Q15-A |
| `T-O-CF1115-22` | native/收口 | native 只在正式 host 公开能力满足完整义务时发布，否则显式 `NATIVE_UNAVAILABLE`；精确保留 DNMS01 R-16 例外并退役影子 Service；按 §7.3 完成全账交接 | Round 6 / Q16-A |

## 2. 规范内核（必须有）

> 按业务簇分组。每条只有来源与已冻结的内核；不落选项、不搬推荐理由、不搬证据表。
> 密度跟源头走：§1.3–§1.8 的 `F*.n` 条款是下游点名序号，**原样投影**；被 QNA 宣告为规范组成的原题矩阵/签名/表一并投影，不另编一套。

### 2.1 范围、锚点与治理（baseline）

#### `T-O-CF1115-1` —— 总目标
> **来源**：`Baseline / U-1` ｜ **驱动后续**：`Q1–Q3 及全部轮次`

本 campaign 的目标是将全部活跃插件的 contract 与 facade 统一为固定真源，并分阶段完成所有插件的统一与测试，不以某个共享 helper 或单包试点代替全体目标。

> **下游约束**：约束最终 scope；不预先指定包的数量、名字或目录结构。

#### `T-O-CF1115-2` —— 分析锚点
> **来源**：`Baseline / U-1` ｜ **驱动后续**：`Q1–Q3 及全部轮次`

以 `contract-and-facade-1115-eval.md` 为分析与债务锚点；其代码事实、检查结果与治理建议必须区分，建议未经裁决不升级为合同。

> **下游约束**：事实有变化须补查并留痕；85 等时点统计不是永久真相或未来验收阈值。

#### `T-O-CF1115-3` —— 治理硬约束
> **来源**：`Baseline / U-6；AGENTS.md:37-42` ｜ **驱动后续**：`Q1–Q4 及全部轮次`

本 campaign 按 U-6 的长期治理原则及根 AGENTS 的既有权威边界推进，不借统一引入双写、可彻底退役合同的兼容壳、私域耦合或插件私有通道。

> **下游约束**：原则的原登记源不迁移；不擅自新增错误枚举、retry 义务、lane、凭证面或发布门禁。

#### `T-O-CF1115-4` —— 提问结构
> **来源**：`Baseline / U-3` ｜ **驱动后续**：`全部轮次`

本 campaign 按先两轮、每轮两题的 foundational-qna（共四题），再转 executional-qna 的结构推进。

> **下游约束**：不提前指定执行轮题数，不把执行细节塞入首轮；「当前只生成第一轮两题」是创建时点约束，不是禁止依程序开启后续轮。

#### `T-O-CF1115-5` —— 渐进纪律
> **来源**：`Baseline / U-4` ｜ **驱动后续**：`全部轮次`

下一轮问题必须等上一轮全数冻结、完成中场评估，再经新一轮事实调查与 Reasoning 生成，不预设题目或推荐。

> **下游约束**：下一轮每题标出其新增驱动真相；评估报告 §9 议题清单不构成问题排期。

#### `T-O-CF1115-6` —— 册体与证据质量
> **来源**：`Baseline / U-2、U-5` ｜ **驱动后续**：`全部轮次`

本册严格按 progressive 模板推进，不设 second-opinion 槽位；每题含四组有效信息，并在提问前完成仓内代码调查及精确 `file:line` 取证。

> **下游约束**：各轮沿用 Truth-Gate、中场评估、驱动链；不因少一个角色而减少证据与反方分析。

### 2.2 foundational 架构（Round 1–2）

#### `T-O-CF1115-7` —— 构建期归口包为可执行真源
> **来源**：`Round 1 / Q1（业主 选 A）` ｜ **驱动后续**：`Q3–Q6、Q8–Q10、Q12`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F7.1 | 公共边界的结构、稳定语义与 facade 机制统一归口；业务实现仍留领域，公共包不持业务 canonical、凭证或可变跨插件 store | 文件/Git、PTY、容器 backend、压缩算法、草稿和 carrier 业务不被搬进公共状态中心 |
| F7.2 | 共同语义以协议原生适配输出，保留 MCP 的协议错误/工具失败区分、WS/SSE 的流语义与 native 扩展边界 | 不强制一种 wire envelope，不为 native Provider/service 新造 HTTP 或私有总线 |
| F7.3 | 复用已有共享机制；同一机制只保留一份可修改实现，不另造注册/授权链，也不要求所有共享包物理合并 | route-guard 可单向复用或迁入，具体装配待执行决定；不能继续私改消费者副本 |
| F7.4 | 构建期共享、每包按自身合同携带所需产物；不必装公共运行时插件，不运行时读取仓根/邻居私有 lib | 只读代码/schema 派生物允许多份；统一源码不假设同一个内存模块实例 |
| F7.5 | 生成关系单向且可追溯；工具目录、绑定、baked table、文档视图从明确作者源派生，已有同义作者源须明确保留或退役 | 不许以消费者修改倒灌公共合同；规范决定继续引用相应[业主]登记源 |
| F7.6 | 公共错误跨产物以稳定结构识别，不能仅依赖跨 bundle 的 instanceof | 本条没有新增字段、错误枚举、兼容版本或接口签名 |
| F7.7 | 包内保持领域/协议模块边界和按需构建；目标是唯一有效 facade，不是退役合同的兼容壳 | 不把全部业务绑定成巨型公共包，不恢复旧别名、双写或兼容第四阶段；包名/目录未在本题锁定 |

> **下游约束**：Q1 推荐完整含义与 F7.1–F7.7 一并冻结；不是仅批准建目录。

#### `T-O-CF1115-8` —— 合同族闭环为最小销账单位
> **来源**：`Round 1 / Q2（业主 选 A）` ｜ **驱动后续**：`Q3–Q5、Q7、Q13、Q16`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F8.1 | 先有获准目标合同，再让实现、schema、测试对账 | 不从当前代码或新测试要求反推合同 |
| F8.2 | 声明/登记与实际业务执行分别提供证据；真实入口须接到所承诺能力 | 不自行删名、改称 unsupported 或用诊断摘要代替已承诺业务来销账 |
| F8.3 | 提供者与真实消费者共同迁移，包含原有合法缺席行为及同族流协议承诺 | 不只换 server helper、无限期保留旧 client；外部边界只治理本仓拥有的绑定与适配 |
| F8.4 | 相关验证区分生成/登记、schema/分发、消费者互操作及必要 e2e，并复用现有入口与同族夹具 | 增量验证，不每改一处重跑全仓，不给每个私有函数新造仪式或 release-gate |
| F8.5 | 先跑通和对等验收，再成对硬切、一次性退役；可离线构建/对照，不得生产双写或保留两份恢复权威 | 不先删后补，不增加兼容第四阶段 |
| F8.6 | 作者源、旧消费、副本、旧路径/别名和相关登记/说明一起结算 | 同源只读构建产物不等于第二作者源；可保留但不可手改 |
| F8.7 | 阶段可批量交付多个合同族闭环；最终逐包证明全部适用边界覆盖 | native/无 HTTP 包同样计入，包/技术层可组织施工但不是独立销账依据 |
| F8.8 | 未接通、未验证、未裁决、需延期均保持未完成；改变支持面或 defer 必须由[业主]决定 | 不借分阶段静默缩减全插件目标；未批准逐项修复方案、错误码、幂等键、retry 次数或兼容窗口 |

> **下游约束**：Q2 推荐完整含义与 F8.1–F8.8 一并冻结；不新增 release-gate、不静默缩 scope。

#### `T-O-CF1115-9` —— 领域能力/操作语义为作者主轴
> **来源**：`Round 2 / Q3（业主 选 A）` ｜ **驱动后续**：`Q5–Q12`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F9.1 | 按真实承诺区分操作，各有输入输出、副作用与失败边界，不按传输行数合并合同 | 同一路径内 list/save、get/generate 等差异不能被一条路由登记遮蔽 |
| F9.2 | 同一语义只有一份作者定义，适用的 HTTP/MCP/native 等是其显式绑定 | 无需要不生成额外协议；内部语义标识不自动成为新公共 wire 名称 |
| F9.3 | 公共 reader/validator/codec 承接通用结构约束，领域/host 接线承接动态政策、唯一 writer 与状态机，并明确验证责任 | 不承诺由一个 schema 自动生成全部授权或业务算法 |
| F9.4 | 主体/scope、能力、安全声明和状态所有者有获准来源及执行映射，host 权威不迁移 | 不从 HTTP 动词猜权限，不新增角色/token，不替换 pluginManager 等 sanctioned writer |
| F9.5 | native Provider/service、流协议和资源分别表达接入/生命周期、交互及交付合同 | 不为统一硬造 request/response RPC |
| F9.6 | 现有台账、schema 与文档逐项确定作者归属，同义字段迁入或退役、单向派生 | 不保留两处手改；代码不能自动批准安全等级或错误法则 |
| F9.7 | 只承载已批准承诺，未裁决/未接线保持未完成 | 不用全支持、空 schema、默认可重试补空，不把每个局部 helper 注册为公共能力；未批准具体 ID、字段、错误码、retry 或旧名去留 |

> **下游约束**：Q3 全部推荐及 F9.1–F9.7 冻结；不据此批准具体操作 ID、字段、错误码或 retry 法则。

#### `T-O-CF1115-10` —— 显式支持面/版本约束判定同约
> **来源**：`Round 2 / Q4（业主 选 A）` ｜ **驱动后续**：`Q6、Q7、Q9–Q12、Q14`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F10.1 | 相同合同版本/能力须兑现相同参数域、结果、错误与副作用；差异仅限已批准且消费者可辨识的可选边界 | 不能给漂移贴能力子集标签即销账 |
| F10.2 | 必需面、可选面来自批准决定，不由实现并集/交集推导 | 已冻结但未完成的能力仍未完成，降级/defer 须经[业主] |
| F10.3 | 目录、profile、native 服务存在性、实际 handler 和依赖就绪各有责任，广告与真实提供面一致 | manifest 或占位摘要不证明业务已接通；不另存可改的支持面权威 |
| F10.4 | 消费者依据公开合同及相应协议已有发现/版本信息判断支持面，必要扩展须另获批准 | 缺能力/不兼容须明确表达，不猜 URL、不丢参数、不自动换含义、不新增专有 lane |
| F10.5 | create 等控制面与 attach/帧/结束/恢复等数据及生命周期面共同对账 | 契约、MCP、帧、包及 host 版本不互相代替，不用同源或包版本相同证明互操作 |
| F10.6 | 保留获准的可选服务缺席、companion OFF 回原生等行为，未就绪不得伪装成功 | 能力广告不是授权凭证，host 继续负责主体与政策；合法回退不是旧约兼容 |
| F10.7 | 唯一目标合同先验收后硬切，能力/版本不成为复活兼容第四阶段的理由 | 不新增旧别名、双写、常驻翻译链；未批准额外旧版本、retry、错误码或兼容窗口 |
| F10.8 | 每个已承诺提供面分别给覆盖证据，共同夹具可以复用 | 单个 provider 通过不证明其他 provider/profile/native/流通过，仍按相关增量验证，不新增发布门禁；未决定具体 source/id/工具集合/帧版本值 |

> **下游约束**：Q4 全部推荐及 F10.1–F10.8 冻结；不批准具体支持集合、版本值、协商字段或兼容窗口。

### 2.3 归口基座与 web 注册（Round 3）

#### `T-O-CF1115-11` —— `packages/dsh-interface` 首版接线
> **来源**：`Round 3 / Q5（业主 选 A）` ｜ **驱动后续**：`Q8–Q13`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F11.1 | packages/dsh-interface、包名 dsh-interface、纯 ESM 构建期私有库，无 dsh.bundle/client | 不装 runtime 插件，不扩大 host 引擎范围，源码不是运行时数据源 |
| F11.2 | 显式 contracts/host/build 出口；contracts 无 I/O、Node/DOM/Cordis 实例/store，host 注入服务，build 仅构建期 | 不设万能根入口；client 待真实消费才开放，不发布空壳谎称已统一 |
| F11.3 | host 单向复用 dsh-host-route-guard 唯一实现，模型扩展落唯一机制 | 不复制 guard，不保留消费者私改或已迁移链路旁路 |
| F11.4 | 插件以 file:../packages/dsh-interface 构建 devDependency 消费；源码依赖闭包正确声明和锁定 | 不假设库的 devDependency 被传递安装，不删仍在使用的共享依赖，不留运行时源码解析 |
| F11.5 | build 共用生成入口并物化本包 bundle，未 bundle 的 index 仅相对导入；可沿用 lib 文件名 | 不保留新旧有效 guard，新增产物同步 files，不留裸 dsh-interface import |
| F11.6 | 按合同/字段归属单向迁移到 src/contracts；已迁移旧源失去手改资格，输出可为只读投影 | 未迁移部分保留原唯一作者；拒绝重复作者，不回读投影补字段，不失败回退旧源 |
| F11.7 | 手审安全字段逐项原值承接，缺项未完成，迁移来源说明随同更新 | 不自动给权限、推导 retry 或放宽限额；批准来源调整不是批准值改变 |
| F11.8 | 幂等再生成、环境隔离和离仓加载有证据；不为接线升级工具链或新增外部 runtime 依赖 | 不批准通用 DSL/完整 AST/新 wire envelope，不复制远端 schema 或领域校验器 |

规范组成的原题出口表（Q5 第 2 项）：

| 首版消费入口（拟建） | 职责和环境 |
|---|---|
| `dsh-interface/contracts` | 无 I/O 的合同定义、已获准 schema/语义与绑定数据；不 import Node、DOM、Cordis 实例或可变 store |
| `dsh-interface/host` | host 侧适配及注册门面；只注入领域 handler/host 服务，不持业务 canonical |
| `dsh-interface/build` | Node 构建期生成/对账工具，不进入页面或运行时请求链 |

> **下游约束**：Q5 完整推荐及 F11.1–F11.8 冻结；不新造运行时插件或复制既有机制。

#### `T-O-CF1115-12` —— channel/match 绑定表 + mixed-batch registrar
> **来源**：`Round 3 / Q6（业主 选 A）` ｜ **驱动后续**：`Q9、Q11、Q13`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F12.1 | createWebRegistrar({plugin,table}).register(ctx,handlersByBindingId) 返回 dispose，inventory 返回只读有效绑定；表含稳定 id/plugin/channel/match/path/methods 及获准元数据/关联/来源 | handler 仅 id→function；内部 id 不成为新 wire 方法 |
| F12.2 | 覆盖键含 plugin/channel/match/path/method，id 与键不得重复；缺字段、归属冲突、缺/多/非函数 handler、未知维度或缺 host API 注册前拒绝 | http 支持 exact/prefix；upgrade 首版仅 exact/GET；不默认旧格式为 http/exact |
| F12.3 | 注册前确认 connection/requestRejection；每个请求/升级在业务及握手前同样 fail-closed | 拒绝不触发副作用，不保留手工可选链放行；不声称线上已发生绕过 |
| F12.4 | 映射真实 register/registerUpgrade，保留 host 匹配和原 URL；HTTP 传有效 binding，upgrade 保留宿主数据后附 binding | 不私造 priority，不丢 head（如宿主提供），不在公共层握手 |
| F12.5 | 新接口有效元数据在作者/构建阶段确定，无运行时 spec.kind/methods/bodyLimit 覆写 | 显式修订新接口 override 用法，不擅改安全值；未迁移消费者不静默改约 |
| F12.6 | 既有 HTTP 准入/405 保留，MCP/SSE/资源由适用 adapter/handler 负责，已发头/升级失败按流/socket 释放 | 不用兜底 JSON 污染协议，不新增业务错误枚举或信封 |
| F12.7 | 全批预检后注册，中途失败回收本批已注册项；统一幂等 dispose 纳入 ctx.effect | 不漏 HTTP/upgrade，不重复释放，不保留第二注册链 |
| F12.8 | 所有视图/检查识别 channel/match，以实际观察与独立负例校验 | 不 path-only 吞一面，不同源双投影自证；sessionBinding 非自动授权；逐绑定硬切，历史85/118不改写 |

规范组成的原题接口（Q6 推荐第 0 项）：

```text
createWebRegistrar({ plugin, table })
  .register(ctx, handlersByBindingId) -> dispose
  .inventory() -> readonly effective bindings
```

轴定义：`channel: 'http'` 配 `match: 'exact' | 'prefix'`，映射现有 `webServer.register`；`channel: 'upgrade'` 首版只允许 `match: 'exact'`，映射现有 `webServer.registerUpgrade`；不假设宿主支持 prefix upgrade。

> **下游约束**：Q6 完整推荐及 F12.1–F12.8 冻结，包含新接口无运行时元数据覆写的显式改约。

#### `T-O-CF1115-13` —— 首批闭环 = 公共 web 注册/准入 + [DNN]/[DNT]
> **来源**：`Round 3 / Q7（业主 选 A）` ｜ **驱动后续**：`Q8–Q10、Q13`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F13.1 | 首批[DNN]HTTP+SDK prefix、[DNT]exact/close prefix/stream upgrade 与两包 build/产物同源接线，退役手工/私改与独立释放链 | 原 URL、字节/HEAD/MIME、MCP/SSE/WS/PTY 领域责任与必要资产保留；不选择新帧版本 |
| F13.2 | 缺准入/host API/handler、未知或重复绑定、错误维度等负例覆盖；测试注册失败回收和幂等释放 | 断言握手与业务副作用前拒绝，不只测 happy path |
| F13.3 | 真实 binding/handler 经可注入 seam 接受控 host，观察真实 register/upgrade 与受控往返、撤销重装 | 不只检查源码字符串或两个生成投影，不双注册/漏升级 |
| F13.4 | 代表性协议回归与证据强度分开，离线夹具不启动真实 PTY/容器或写用户数据 | 不冒充安装态 e2e；必要 host 证据未获准或未完成则待验，不提前销账 |
| F13.5 | 再生成幂等、作者变化可达产物，实际临时 tarball/最小受控 host 离仓验证并带必要资产 | 不手改 lib；dry-run 只证清单，不授权装/重启现用 profile |
| F13.6 | 复用唯一机制单测、新归口 Node 测试、DNT npm test/smoke 及三项既有检查；smoke 改为更强真实装配断言 | 按原题验证表执行相关窄测试，收口一次必要集成，不复制实现、不删断言求绿、不新增门禁 |
| F13.7 | 验证后成对切换退役，同步 scanner/表/说明；DNN-01/DNT-01 条件真实兑现才销账，CROSS-02 本批至多部分偿还 | 其他编号和余额保留；不把注册回归当全部业务/MCP 正确 |
| F13.8 | 首批结束说明其他活跃包未迁移字段/入口，保持单一有效作者及未完成状态 | 全仓目标不变，不预排后续题；冻结执行决策不等于已经实施 |

规范组成的原题表（Q7 第 1/6 项）：

| 真实边界 | 首批必须改变 | 必须保留/不得冒领 |
|---|---|---|
| [DNN]现有 HTTP 注册与 SDK prefix | 使用获准公共入口及同源 baked 绑定；退役手工 prefix 注册/准入分支 | SDK/WASM 的字节、HEAD、Content-Type，JSON/MCP式 RPC/SSE 各自协议不改 |
| [DNT]普通 exact、session close prefix、WS stream upgrade | 使用同一获准作者/注册模型；退役私改 guard 与手工 upgrade 登记/准入；清理独立释放链 | 原路由、MCP 错误/工具返回、SSE 生命周期、WS 协商/帧和领域 PTY 责任保留；不在本题选择新帧版本 |
| 两包的 build/相对导入/发布物 | 共同作者 → 本包 baked 表与 guard/facade bundle → 实际加载；不靠邻居源码 | WASM、schema、skill 等运行时资源仍按各包白名单交付；不是只生成一个新 helper |

| 验证层 | 已有可复用入口或拟新增位置 | 使用边界 |
|---|---|---|
| 唯一注册实现单测 | 现有 `packages/dsh-host-route-guard/test/route-guard.test.mjs`；若选 Q5-B 则随实现迁移测试 | 增加 upgrade/mixed-batch/释放负例，不复制第二套实现测试成第二作者 |
| 新归口与真实装配 | 拟新增 `packages/dsh-interface/test/` 下 Node 测试，必要时补各包装配测试 | 用真实导出和 binding，不用同一生成表的两个投影自证 |
| [DNT]既有回归 | `npm --prefix dsh-nano-terminal test`；`node --test dsh-nano-terminal/test/register-routes.smoke.mjs` | smoke 目前期待直注册 upgrade，迁移后须换成对共同机制和实际准入的更强断言，不能简单删测试 |
| 登记/发布引用 | `node scripts/check-route-sensitivity.mjs`、`node scripts/check-feature-contract.mjs`、`node scripts/check-clean-lib.mjs` | 扩现有检查所需维度，不缩 scope/移除安全断言求绿；PASS 仍只证明其检查范围 |

> **下游约束**：Q7 完整推荐及 F13.1–F13.8 冻结；不冒领两插件全部业务/MCP 或全仓已完成。

### 2.4 消费侧 facade（Round 4）

#### `T-O-CF1115-14` —— 普通 JSON 的 JS Outcome 与唯一 codec
> **来源**：`Round 4 / Q8（业主 选 A）` ｜ **驱动后续**：`Q11、Q13、Q15、Q16`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F14.1 | createJsonClient({fetch,resolveUrl}).call(operation,input,{signal}?) 返回 Promise<JsonOutcome<T>>，真实实现开放 client 出口；operation 持唯一 encode/decode/验证 | 缺必要构造依赖即拒绝；URL 只由获准绑定/官方 transport 解析，不接受业务输入绕过绑定，不硬编私域/凭证或猜 GET |
| F14.2 | JS 成功为 {ok:true,data}；失败为 {ok:false,error:{kind,message,httpStatus?,domainCode?,domainData?}}，kind 为 transport/cancelled/http/protocol/domain | 不改 wire 或新增服务端业务码；domainCode 只用识别成功的获准码，httpStatus 不被上游 status 覆盖，详情限获准公开字段 |
| F14.3 | 依 Q8 矩阵：取消→cancelled；本地绑定/输入/编码不符且未请求→protocol；网络/读体中断→transport；识别业务失败→domain；其余非2xx→http；非法2xx→protocol；合法 null/degraded→成功 | 已取消/本地拒绝不发请求；响应头可用时保留真 status；空体须明确允许，HEAD/204 不一概判成败；响应体只读一次 |
| F14.4 | host/client 承接同一目标编码/结构规则，handler 保留授权、动态政策和 canonical writer | 不另抄错误码，不让 client 取代注册/准入或从 schema 生成全部业务政策 |
| F14.5 | 公共层不自动 retry、换方法/endpoint、轮询、补偿、重提写操作或创造默认 timeout | 取消/未响应不证明未执行/已回滚；既有特定 retry 只留获准适配层 |
| F14.6 | 跨 bundle 结构识别，错误安全显示，不自动夹带或记录 headers/凭证/原始请求响应 | 不依赖 instanceof，不吞为空对象或假成功；degraded/restart-required 等保持领域含义 |
| F14.7 | 选定闭环 host encode/client decode/UI/旧 wrapper 同时硬切 | 不保留另一解释源，不扩张已冻注册首批；普通 JSON 业务另按闭环结算，同绑定不设多旧格式猜测 |
| F14.8 | Q8 原题验证清单及细分状态夹具均须覆盖，含不发请求/不重发、非法2xx、领域/HTTP分型、空体/null/degraded、取消/读体中断和双 status | 旧 codec 不作失败兜底；相关窄验证，不制造反复全仓或真实业务调用仪式 |

规范组成的原题接口与判别矩阵（Q8 第 1/3 项）：

```text
createJsonClient({ fetch, resolveUrl })
  .call(operation, input, { signal }?) -> Promise<JsonOutcome<T>>
```

| 情况 | JsonOutcome |
|---|---|
| signal 已取消 | cancelled；发出请求前已取消则不调用 fetch，不承诺取消了服务端副作用 |
| 未取消，但 operation/输入不符绑定或无法按约编码，尚未发出请求 | protocol，不发请求、不伪造业务码 |
| 其他网络或响应体读取传输失败 | transport；取得过响应头时可保留真实 httpStatus，否则不伪造 |
| 响应按目标 codec 识别为获准业务失败，包括合法的 HTTP 2xx 业务失败 | domain，保留原业务码和本地 HTTP status |
| 非 2xx 且不是可识别的获准业务失败 | http，保留 status；不靠错误文本猜业务码 |
| 2xx 但 JSON/结构/目标输出不合法 | protocol，绝不能包装成 ok:true |
| 合法成功、合法空值或合法 degraded | ok:true，由目标 codec 确定 data，不按 truthiness 判错 |

> **下游约束**：Q8 完整推荐及 F14.1–F14.8 冻结；五类 JS 失败不改变服务端业务错误枚举。

#### `T-O-CF1115-15` —— MCP 工具集构造、解码与 attach
> **来源**：`Round 4 / Q9（业主 选 A）` ｜ **驱动后续**：`Q11–Q15`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F15.1 | createMcpToolset({definition,handlers}) 提供 list 与 invoke(name,args,callContext)；定义持获准名字/schema/codec/支持面，领域 handler 注入 | host 提供既有主体/scope/依赖，调度错由适用 RPC adapter 映射；不新增 wire 凭证/总线或搬业务状态 |
| F15.2 | 广告与 handler 精确对账，缺/多/重名/缺必要 schema 或支持来源使目标构造/验证失败且保持未完成 | 不过滤既承诺工具、不占位摘要冒成功、不以剩余 handlers 决定合法子集；真正无参工具可有合法空对象 schema |
| F15.3 | 唯一获准 schema 真正先校验输入，获准 codec 校验结果；required/额外字段/类型/integer/界限全部兑现 | 不手抄宽松 validator；授权/实例政策/幂等/状态机归所属领域 |
| F15.4 | RPC 协议/调度错误与 isError/content/structuredContent 工具失败分层，参数错依适用版本/绑定映射 | 不全部变 HTTP500/普通JSON domain；notifications/id/initialize/协议版本由适用 adapter 承接 |
| F15.5 | decodeMcpReply(reply,binding)：成功 {ok:true,value}，失败 {ok:false,layer,error}，layer 为 rpc/tool/protocol，分别保留适用原错误/工具结果或结构说明 | 先错误/isError后取值，不能仅看id；先做binding要求的发现/初始化/支持核验，不以名字/schema冒语义版本证据，不造字段补空；传输/取消不伪造MCP回包 |
| F15.6 | 按匹配且获准的 attach.protocol 选择 adapter；完整 URL 不猜路径/擅加业务query，相对地址按官方上下文解析 | 无匹配明确拒绝；不固定v2；ws/wss原样保留，http(s)转换须绑定允许，禁wss→ws、私域base-url/新lane/凭证 |
| F15.7 | 目录/分发/真实消费一起切换，OpenRPC/目录可只读派生，同义旧 catalogue/switch 退役；DNLS业务必须接真正所属服务 | 不把诊断搬包即销账；外部child只治理本仓公开适配；字段/错误/版本变更先复核决定，不按代码自动裁定 |
| F15.8 | 每提供面真实handler/结构/副作用/结果验证，含RPC错、带id的isError、attach/protocol/URL与禁止降级；完整流生命周期另证 | 名字测试补真实调用，不用控制面替WS/关闭/恢复，不扩大领域retry，不给无关插件新门禁 |

规范组成的原题接口（Q9 第 1/5 项）：

```text
createMcpToolset({ definition, handlers })
  .list() -> Tool[]
  .invoke(name, args, callContext) -> Promise<McpToolResult>
```

Q9 第 5 项另以文字规定消费者独立 MCP 解码：`decodeMcpReply(reply,binding)`——成功为 `{ok:true,value}`；失败为 `{ok:false,layer,error}`，layer 为本 JS facade 的 `rpc | tool | protocol` 三值，分别保留原 RPC error、原 isError 工具结果、结构不合法说明；先检查错误/矛盾回包和 isError，再验证提取结果，不得仅看到 structuredContent.id 就 attach。

> **下游约束**：Q9 完整推荐及 F15.1–F15.8 冻结；具体支持面冲突不由生成器自动裁定。

#### `T-O-CF1115-16` —— `nanoNotepad` 最小导入服务
> **来源**：`Round 4 / Q10（业主 选 A）` ｜ **驱动后续**：`Q11–Q13`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F16.1 | 惰性读取 nanoNotepad；import(name,content,meta?)→Promise<{id:string,name:string}>，前两者字符串，meta只许可选字符串sourcePath | 非法类型/额外meta写前拒绝；不暴露DB/store/corpus/node，不由sourcePath授读写原文件权，不破坏Windows路径 |
| F16.2 | 当前活动工作区草稿导入；空名规范化，同名未pinned替换并按原规则留版本，pinned/文件夹冲突生新名，成功沿openFile/render展示 | 不由来源隐式换工作区；空内容合法，不变写源/同步命令，不新增幂等或自动retry |
| F16.3 | 成功回id/name值拷贝；失败拒绝Promise并给安全message，无新业务错误枚举、不依赖instanceof/解析文本 | 不假成功，不保证失败无存储副作用，调用方不自动重放 |
| F16.4 | panel/controller持DB/操作，外层index用ctx.provide投影与disposer，合同归口但状态归DNN | 不把host/ctx塞纯contracts或面板，不另存草稿/操作队列 |
| F16.5 | DB/控制器真就绪才发布；ready(mounted)不是DB就绪；初始化失败不设永远排队服务 | 卸载撤销、晚ready不复活、旧句柄新写前拒绝；已开始事务按原语义结束，不承诺dispose回滚/重提 |
| F16.6 | DNEE惰性发现，读文件后导入前再核可用；缺席不供动作，中途失效明确失败 | 不长期缓存权威句柄、不回旧global、不新加强依赖/私有通道；nanoTerminal合法原生回退不变 |
| F16.7 | 先迁完包内fx/导入自调用到私有controller，再成对切服务并彻底移除global/别名/转发 | 调试留包内或隔离夹具，不自动升公共；同步当前说明测试，不篡改历史快照，不另留恢复权威 |
| F16.8 | 就绪/缺席/失败/类型拒绝/竞态/过期句柄、替换版本冲突、空内容/Windows来源/源不变/最小回执及内部fx均验证 | 真service提供/发现/撤销和真实导入，不只断言全局名消失 |

> **下游约束**：Q10 完整推荐及 F16.1–F16.8 冻结；不把整个调试/数据对象升级为公共 API。

### 2.5 作者记录、host 适配与全包交接（Round 5）

#### `T-O-CF1115-17` —— 最小 `FamilyDefinition` 作者记录
> **来源**：`Round 5 / Q11（业主 选 A）` ｜ **驱动后续**：`Q14、Q15`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F17.1 | FamilyDefinition含contractId/authorityRefs、operations(input/output/failures/semanticsRef)、bindings(operationIds/transport/codecs/dispatch?)、providers(plugin/supports/constraintsRef)，supports为绑定/操作/约束引用列表 | 引用唯一schema或官方同进程类型入口；外部边界有真实codec，同进程typed API不复制整个host对象schema |
| F17.2 | contractId分别与operationId/bindingId/providerId联合定位，支持约束显式引用 | 不以path/工具名/插件名推同约，不混npm/OpenRPC/MCP协议/语义版本或hash；本题不新增wire version字段或发现通道 |
| F17.3 | web原样承接Q6绑定；MCP/native保留获准协议，多operation绑定有显式selector/cases及既有未知值拒绝 | 不默认到首个操作，不按插件重写同义codec，不改变既准授权/作用域 |
| F17.4 | 同源投影web table、Q8带绑定的operation、Q9 definition及Q10服务声明，保留稳定来源关联 | handler/客户端/领域仍执行，不生成universal executor |
| F17.5 | 每族一次迁作者，原台账/OpenRPC等可留派生产物但不反作第二作者 | REVIEW/无来源/自动false不当批准；明确获准false正常承接，未知目标不猜 |
| F17.6 | contracts和可移植codec纯净；host、build及业务初始化分层 | 不捕获ctx/凭证/DB或读repo/DSH_HOME，不承诺host裸包runtime可解析，沿用离仓打包 |
| F17.7 | 每个已切换提供面只交付一份获准目标，不建通用兼容/版本机器 | 不取参数并集/最低交集、不旧作者回退；新约须裁决，普通helper命名不另设审批 |
| F17.8 | 验证多操作/同名异约/跨族标识/未知dispatch/未批准字段与环境隔离，并从真实factory和离仓产物验证同源 | 引用存在不等于批准内容；按领域及互操作证据结账 |

规范组成的原题记录形状（Q11 第 1 项）：

```text
FamilyDefinition = {
  contractId,
  authorityRefs,
  operations: {
    operationId: { input, output, failures, semanticsRef }
  },
  bindings: {
    bindingId: { operationIds, transport, codecs, dispatch? }
  },
  providers: {
    providerId: { plugin, supports, constraintsRef }
  }
}
supports = [{ bindingId, operationIds, constraintsRef }]
```

> **下游约束**：Q11 完整推荐、记录形状和 F17.1–F17.8 共同冻结；版本/权限/目标值不由生成器猜测。

#### `T-O-CF1115-18` —— 官方 host 薄 adapter + 异步结算
> **来源**：`Round 5 / Q12（业主 选 A）` ｜ **驱动后续**：`Q16`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F18.1 | 直接引用官方服务/类型，领域插件持Provider/adapter业务和资源，公共包只含必要纯定义/机制 | 不复制Agent/Session/Service runtime，不造共享registry/store或公共影子host DTO |
| F18.2 | 对所声明host/平台逐项核验公开API、解析和真实装配，既有DNMS01例外精确承接 | context/本机类型不证明全engines；不一揽子批准fallback或扩窗口，也不撤既准部分 |
| F18.3 | DNMSC保持isolate/互斥装配；DNCS/DNN各自scope持有桥/controller，初始化成功后发布 | 不强加agents注入，不警告后假成功/永久排队；失败撤局部资源，不擅以本地factory代远端 |
| F18.4 | 官方branded identity、事件/持久化/错误类型/完成条件仍有效，JS Outcome不覆盖host原义务 | 注释不证不持久化，不能直接判第二canonical；新事件/恢复payload/码先裁决 |
| F18.5 | DNCS桥由carrier+稳定profile+remote identity限定，配置store唯一权威，改配置/删档令旧scope失效 | 不仅remote id复用，不用token/label/私域URL当身份，不无限持旧凭证、不增durable副本或顺带远端销毁 |
| F18.6 | 停接入、取消可取消任务并等待结算、最后释放所需依赖/观察者；后台迟到刷新不得新写失效投影 | timer/disposer/倒序或inject不等于异步安全；用户已接纳操作明确结算/未知，不假回滚不重发 |
| F18.7 | cancel/idle/流/恢复等不足须明确目标，不默认no-op合法或terminate等同cancel，也不删native Chat求绿 | 不据此新增通用错误/重试/取消协议；尚缺公共目标须裁决 |
| F18.8 | 官方类型与真实入口验证Provider ON/OFF/isolate、桥身份/配置失效/初始化失败和卸载替换竞态 | 受控Promise验证结算、最终值、可见错误及资源；不拿次数/clearInterval/idle路径代替 |

> **下游约束**：Q12 完整推荐及 F18.1–F18.8 共同冻结；具体 native 义务不足仍须目标裁决（已由 `-22` 定案）。

#### `T-O-CF1115-19` —— P0–P4 阶段与八包责任
> **来源**：`Round 5 / Q13（业主 选 A）` ｜ **驱动后续**：`Q14–Q16 及 §7.3`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F19.1 | 原样继承P0；P1普通JSON/导入，P2沙箱终端互操作，P3剩余领域/标准/host，P4全范围结算，详见原题 | 依赖驱动、独立闭环可并行，不把阶段数字当全仓release-gate |
| F19.2 | 原题八包责任表完整冻结，覆盖HTTP/MCP/流/资源/native、真实生产消费和旧资产 | host-only/无UI/零HTTP不造假入口；不遗漏DNCS或companion |
| F19.3 | 下游计划关联Q/T-O、端点/操作/目标来源/产物/验证/退役/E1115观察，区分待裁决/待迁移/接线/验证/销账 | 不复制回答真源，不拿已定义当完成，不作runtime恢复源 |
| F19.4 | 获准作者和实际package元数据单向派生参与面，现有扫描继续发现异常 | 不由扫描授权，不新增手工required-plugin清单，修现有覆盖遗漏 |
| F19.5 | 每族作者/实现/消费者/派生表/测试/说明/产物成对硬切，证明后退旧源 | 不双写、旧parser回退或兼容alias，标准协议独立验证不JSON化 |
| F19.6 | 相关夹具、真实装配消费、离仓产物分层窄验证，覆盖跨包端点与合法平台差异 | 不反复全仓、不增总闸、不以真实远端写操作验证每次文档/构建；环境动作须授权 |
| F19.7 | 公共机制生效、目标兑现、消费者通过、旧作者入口退役且独立产物可交付后才按义务销账 | 跨族余额保留，新约未定不销账，新债不静默塞入已完成项 |
| F19.8 | 阶段/交接冻结不等于本次开工或所有业务值获准；只由业主defer，机械细节直接落实 | 继承评估历史，不另账替换，不为fixture命名等强开QNA；真相冻结与实现完成分离 |

规范组成的原题表（Q13 第 1/2 项，完整冻结）：

| 阶段 | 主交付范围 | 开始切换的前提 |
|---|---|---|
| P0 · 已冻首批，原样继承 | 公共包/构建/guard唯一源及[DNN]/[DNT]真实web注册、准入、释放与产物 | 按 `-11` 至 `-13`，不冒领业务/MCP |
| P1 · 普通JSON与浏览器公开能力 | [DNEE]/[DNMS]普通JSON、[DNN]非S3/fx/pipeline的基础文件JSON与最小导入、[DNEE]相关消费者；复用已批准领域政策 | 每个选定目标 codec/语义明确，按 `-14` / `-16` 成对接线 |
| P2 · 沙箱与终端真实互操作 | [DNLS] HTTP/MCP/CDP/terminal、[DNK]真实消费与旧资产退役、[DNT]MCP/attach/WS/SSE/审计消费 | 已冻领域义务接到真实生产路径；具体支持面/工具参数/幂等冲突先裁定，不能以stub或缩目录通过 |
| P3 · 剩余领域/标准协议/host适配 | [DNCS]carrier与native、[DNMSC]Provider及主包共享合同、[DNEE]官方native资源调用、[DNN]fx/S3/自定义RPC/标准流与资源例外 | 适用官方/领域合同可指认；未解决新约先回QNA，不伪造协议或复制host |
| P4 · 全范围结算 | 八包及横向四项观察的覆盖/证据/旧源/离仓产物对账 | 所有适用合同族有完成证据或[业主]明确批准的其他处置，不由 agent 自行缩范围 |

| 包 | 主要阶段 | 不能漏掉的闭环 |
|---|---|---|
| [DNEE] | P1/P3 | 文件/Git的host+client、合法scope、notepad/terminal消费及官方open-in-app资源调用 |
| [DNK] | P2 | [DNLS]HTTP/CDP消费、错误目录、skill/bridge与旧容器时代交付物按既冻归属退役 |
| [DNMS] | P1/P3 | catalog/media/compact策略/开关的codec和UI、sanctioned writer及与companion共享的唯一合同作者 |
| [DNMSC] | P3 | Provider/isolate、互斥overlay、host seam/错误身份及ON/OFF，不要求新增HTTP或UI |
| [DNN] | P0/P1/P3 | 注册、JSON、导入controller/global退役、自定义RPC/S3/fx标准流、SDK/WASM资源及实际消费者 |
| [DNT] | P0/P2 | 注册与产物、工具/真实分发、McpLane/attach/WS/SSE、审计writer及公开nanoTerminal消费 |
| [DNLS] | P2 | 四公开提供面、实例/政策/错误/审计/真PTY与[DNK]/[DNT]成对互操作 |
| [DNCS] | P3 | 路由内operation、HTTP/carrier状态与秘密边界、原生会话身份/生命周期及发布清单覆盖 |

> **下游约束**：Q13 完整阶段/覆盖表及 F19.1–F19.8 共同冻结；不授权自动延期或假定阶段内所有业务值已批准。

### 2.6 末轮业务目标与收口（Round 6）

#### `T-O-CF1115-20` —— terminal 两提供面：[DNLS] 八工具 / [DNT] local 十九工具
> **来源**：`Round 6 / Q14（业主 选 A）` ｜ **驱动后续**：`无后续题（最终轮）；§7.3 / P2 交接`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F20.1 | DNLS严格八工具（create/list/input/read/resize/close、audit、lane.status）与DNT local十九工具（八工具加send/keys/interrupt/wait/session.keep/label/note/events/template.list/run/skill）是两个显式语义提供面；仅在语义相同的操作上共享定义，参数/结果/生命周期不同的operation分别标识，由显式supports约束提供面 | 不把DNLS领域幂等外推为DNT单终端，不删DNT真实本地能力；通用客户端不按插件名分支、不新增lane/私有端点，不复制作者 |
| F20.2 | DNLS create字段为lane/sessionId/shell/cols/rows/title，缺省或local表示所选提供端本地PTY；sessionId优先经授权明确值或正式调用上下文，二者都无则拒绝，不用term-1共享默认，按该作用域复用同一活动PTY，关闭后可重建，政策冲突沿既冻政策拒绝。DNT create字段为lane/sessionId/shell/cols/rows/title加name/parent/keep/labels/args/cwd；lane只允许local，不再广告mcp/isolate；sessionId保留owning dsh session语义，每次明确create可建新终端，不保证重复create同id，不增加幂等键；删除未兑现的template/task字段，模板仍走template.list/run | 客户端连接方式local/mcp与后端lane不是同一枚举；不静默删参、不以缺省sessionId冒充DNLS复用身份、不把未实现字段留在广告 |
| F20.3 | DNLS read仅id、lines默认50且整数1..500，不接source；DNT read为id、lines默认50且整数1..500，并接source=visible/recent/detection，默认visible。两端resize的cols/rows为整数2..512，create缺省80×24；audit.lines默认50、整数1..500 | 不在validator外截断非法输入冒充合法；不把DNT source扩展给DNLS，不取schema并集 |
| F20.4 | DNT作者固定为本册代码基线`f7199f9`的`dnt-mcp.openrpc.json` methods，不授权迁移者再挑字段；所有参数对象拒绝额外字段，已有required保留，create无sessionId仍可显式本地创建；create结果要求id/addr/lane/title/attach，attach要求protocol/url；其余已声明结果字段/可选性保留，不吞生产额外数据伪造schema通过；未声明但确有公开消费者的字段依`-19`成对纳入同族公开定义，不扩展业务；`x-address`改成可执行string schema并保留id/name/addr含义；其余十一工具参数、默认值、返回与事件保持基线明确声明 | 不自动给DNLS增加DNT工具；不以schema生成成功认证业务；不新增地址语法或wire版本字段 |
| F20.5 | DNLS八工具成功structuredContent明确为：create`{ok:true,id,attach}`；list`{sessions:[{id,lane:"local",title?}]}`；input/resize`{ok:true}`；read`{id,text,complete}`；close`{closed:boolean}`；audit`{log:JSONRecord[]}`；lane.status`{lanes:{local:{status:string,detail?:string}}}`；id/text为string，title若有为string，其他布尔不做字符串强转 | input确认接纳不代表程序完成；合法重复close可返回closed=false，不以此掩盖越权；read.complete=true须有该端真实完成/退出依据，未知状态不得因“不等于working”默认true，消费者不得仅据此推断写入已提交 |
| F20.6 | DNLS按已有决定对同作用域并发create单飞、同实例返回同id；DNT创建是有副作用的新建。McpLane统一只提交`{sessionId,cols,rows}`最小create及`{id}`close，超出目标支持面明确拒绝，不静默删参；任何提供面都不因timeout、丢响应或attach失败自动再发create/input/send；已得到id只重新attach该id，未得到id的未知创建结果可见报告、不称回滚；McpLane自动transport重连统一为DNLS既冻“至多一次”，明确替换E64现有递归退避，不逐次重置预算，建立新调用需明确动作；连接重建不重放业务写入，不顺带改LocalLane自己的监督合同 | 不把“有id/收到字节”当成功；不重发未知写入；不以timer/disposer/倒序推定异步安全 |
| F20.7 | DNLS attach仍为获准`dnt-ws-v1`；DNT的MCP提供面明确广告已公开的`dnt-ws-v2`，与门控/通道帧相符；此处是MCP attach声明修订，已由本题批准切换；不由生成器自行发明wire版本字段或发现通道。两端都返回完整实际`ws/wss`URL及已有必要session参数，不猜prefix、不覆盖query、不降级wss，不新建凭证面或跨域转发宿主token；客户端按精确protocol选择v1原始字节或v2通道帧编解码，核验ready协商值；v2 human/agent/auto通道不得混用 | 未知协议或版本不符即失败；不把v2标识扩成新发现协议；不以本地URL改写掩盖真实scheme |
| F20.8 | 声明、校验、dispatch和codec由同一提供面投影；DNT十三kind（not_found/blocked/finished/live/unavailable/spawn_failed/conflict/status_mismatch/name_taken/needs_target/incompatible/limit/invalid）与DNLS已冻领域目录分别有所有者，不并成全仓万能错误表；MCP协议错误/工具失败依`-15`分层；无额外capability发现通道，工具名不是身份或授权；audit只返回所属提供面获准视图。用同一通用McpLane分别消费真实两端，验证DNLS并发幂等、DNT同会话多个不同id、非法字段/边界、source只在DNT、失败含id不能当成功、v1/v2输入输出门控、wss/query不变、断连最多一次且不重跑写入；PTY真实启动/关闭/资源归属按`-19`在P2完成；同步删除错误lane广告、未兑现create字段、旧URL改写和协议猜测 | 不复制DNLS实例审计到另一durable作者；不把两行PTY helper标成已完成服务；不新增通用错误/重试/取消协议 |

规范组成的原题提供面矩阵（Q14 第 1 项）：

| 项目 | DNLS terminal提供面 | DNT local提供面 |
|---|---|---|
| 工具支持 | 严格八工具 | 当前十九工具；其余十一为send、keys、interrupt、wait、session.keep/label/note、events、template.list/run、skill |
| create允许字段 | lane、sessionId、shell、cols、rows、title；不加cwd/source等隐式扩展 | 左列加name、parent、keep、labels、args、cwd；**删除未兑现的template/task字段**，模板仍用template.list/run显式执行 |
| create lane | 缺省或`local`表示“所选提供端的本地PTY”；在DNLS内部仍由获准实例提供 | 同一字段只允许`local`；不再广告`mcp/isolate`。客户端连接方式`local/mcp`与该后端字段不是一个枚举 |
| create sessionId | 优先使用经授权的明确sessionId或正式调用上下文；二者都没有则拒绝，不用term-1共享默认；按该作用域复用同一活动PTY，关闭后可重建；配置冲突沿既冻政策拒绝 | 保留owning dsh session语义；每次明确create可建新终端，**不保证重复create返回同id**，不增加幂等键 |
| read | id必填，lines默认50、整数1..500；不接source | 同左，另接source=`visible/recent/detection`，默认visible |
| resize/audit | cols/rows整数2..512，create缺省为80×24；audit.lines默认50、整数1..500 | 共享相同边界，不在validator外截断非法输入冒充合法 |
| 其他输入/结果 | 已冻八工具语义，create成功必须有id和attach；其余输出由同一明确八工具定义消费 | 将基线OpenRPC十九methods的params/result及十三errorKinds作为本题明确批准的目标，**以本表与下述修订优先**；不是承接序言only-grows口号 |

> **下游约束**：Q14 完整推荐、两提供面矩阵及 F20.1–F20.8 共同冻结；不把 DNLS 领域幂等外推为 DNT 单终端。

#### `T-O-CF1115-21` —— sandbox 二十工具 + 别名取舍 + 剩余 JSON 承接
> **来源**：`Round 6 / Q15（业主 选 A）` ｜ **驱动后续**：`无后续题（最终轮）；§7.3 / P1–P3 交接`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F21.1 | host按DNLS01已准二十名兑现，另按领域支持面公开terminal工具；bridge仅保留真实agent-browser的标准CDP profile驱动，不再自行广告十五个sandbox工具或维护宿主诊断推送副本；child工具目录由真实获准驱动声明派生，不硬写“永远33个”或无条件透传未知新增特权；snapshot/control等既有HTTP能力继续保留并接同一领域所有者，不因bridge曾广告而扩成第二十二工具清单；旧DNK宿主/bridge作者及别名按既冻决定彻底退役 | 不把bridge十五与host二十取并集；不删既有HTTP/CDP业务；不新增手工required-plugin清单或第二作者 |
| F21.2 | 二十工具输入/业务目标完整冻结为Q15原题第2项二十行表（以下工具名省略`sandbox.`前缀）：profile.list`{}`；profile.describe`{profileId:S}`；instance.ensure`{profileId:S,sessionId:S}`；instance.start`{instanceId:S}`；instance.stop`{instanceId:S}`；instance.restart`{instanceId:S}`；instance.status`{instanceId:S}`；diagnostics`{instanceId:S}`；targets`{instanceId:S}`；history`{instanceId:S}`；dom`{instanceId:S}`；elements`{instanceId:S}`；selftest`{instanceId:S}`；ports`{instanceId:S}`；recovery_plan`{instanceId:S}`；bridge_health`{instanceId:S}`；console`{instanceId:S,level?:S,limit?:N}`默认50、1..250；operations`{instanceId:S,errorsOnly?:boolean,limit?:N}`默认false、50、1..200；network`{instanceId:S,failedOnly?:boolean,limit?:N}`默认false、100、1..200；error_catalog`{errorId?:S}`。所有输入object且additionalProperties:false，未标者必填，profileId/instanceId/sessionId不能互换；`instance.ensure.sessionId`按既有DNLS01 `T-O-12`的profile.scope解释：session scope必填，shared scope可省略并产出null，首期kitesurf仍为session，不新增scope或默认。各行负面保证按原表冻结：profile类不构建/不启动、不返回配方命令/凭证；ensure只由正式host解析政策并按既冻tuple幂等，不接受任意policy/mount，政策冲突拒绝；start/stop按既准目标结算，start已在该目标可重复且不重建身份，stop不是删除durable状态；restart是一次明确重启、不自动重放；status不把unknown伪成running；diagnostics只读；targets不创建target；history不读全局第二份；dom不evaluate/写页面；elements不加selector/depth；selftest不修复/安装；ports观测不等于分配成功；recovery_plan不执行；bridge_health不靠host-push计数假称存活 | 不以参数本身产生权限，不新增“只许当前会话”等授权规则；不把stub的unknown字段代替目录；不把“返回观测”当控制成功 |
| F21.3 | 二十工具成功structuredContent统一为`{ok:true,data:T}`，T由Q15原题表确定，MCP content/isError/JSON-RPC外层依`-15`；错误不塞进成功data。PublicProfile只含id/version/platform/scope/capabilities，类型沿已准profile manifest；列出已登记元数据不等于认证配方可构建。PublicInstance只含instanceId/profileId/profileVersion/sessionId/phase/policyFingerprint/endpoints，类型及phase/端点含义沿DNLS01已冻实例合同，shared实例sessionId可为null，端点必须来自实际注册/发布而非端口游标猜测 | 不泄露配方命令、mount source、凭证或调用方秘密；不把占位version/checkout认证为有效配方；不把端口游标当实际端点 |
| F21.4 | Snapshot=`{available:boolean,observedAt:string|null,value:JSONValue|null}`；尚无该项真实观测才用false/null/null；有观测时available=true并带真实ISO观测时间，value是该工具所述可扩展、只读诊断JSON，不是供客户端猜测控制分支的第二协议；entries等诊断行同为公开JSON记录，total/dropped/failed及counts各项为非负整数；保持公开HTTP相应数据含义与脱敏；沿E67已广告界限，history至多最新30条、DOM至多4000字符、elements至多40节点，其余受已准领域界限 | 授权/政策失败、读取异常、业务执行失败不是“未观测成功”，走所属目录及isError；真实观测engine不健康可作为成功诊断数据，不等于start成功；不借工具新增无限日志或全量秘密快照 |
| F21.5 | 表中操作由profile/instance/state/CDP等现有所有者兑现，HTTP与MCP投影同一领域操作（各自协议外层不同），不在MCP中self-fetch宿主HTTP或再造可写registry；状态写完成/未知按领域承诺结算；ensure并发/指纹沿已有决定，restart不自动重跑，transport重连不等于重发控制操作；不改已准政策、现有error目录和凭证面；输入/未知工具按`-15`协议层拒绝，工具执行错误用领域获准码 | 不以stub的unknown字段代替目录；不新增“只许当前会话”等授权规则；不把工具名当权限 |
| F21.6 | `/s3/config`只保留action=`probe`，删除`testOne`；`/rpc`只保留method=`manifest.get`，删除`lsrag.manifest`，其他三个只读method为corpus.list/corpus.read/claim.read。保留probe不激活/不切canonical语义，保留manifest.get读取已发布清单语义；生产消费者、发布SDK/fx资产、技能、测试和说明同步切，不留旧名分派分支 | 这是本题明确批准的取舍，不因同函数委托自动允许删除；不把自定义RPC擅改成MCP或普通HTTP统一信封；不保留兼容alias |
| F21.7 | 四个只读RPC method参数/数据形状以基线pipelineRpcHandler对应分支为目标；null只表示已确认不存在，不能由权限/网络/解析失败伪造；corpus.read/claim.read的denied须按唯一operation codec识别为失败，不能当正常data。其余自有JSON族保留各自公开生产入口与真实消费者已经使用的业务字段/操作，按`-14`唯一codec与显式selector逐项转写；既有领域规范优先，标准资源/流协议仍独立 | 不批准所有当前代码缺陷或随机内部字段；不允许新业务参数、错误枚举、幂等/retry由实现者决定；消费者冲突或缺失既准来源时回[业主]，不取并集/交集；下游逐操作对应作者/消费者/既冻来源，不要求每字段再开QNA |
| F21.8 | 二十工具逐一用真实domain fixture验证输入、输出schema和对应业务调用，不只数目录；覆盖两个实例隔离、越权、并发ensure、政策变化、部分观测/真实错误、控制结果未知、非法额外字段、catalog与dispatch同源；验证bridge目录无自造sandbox工具、原HTTP/CDP能力未丢；DNN验证真实probe和manifest消费、旧名明确拒绝、null/denied/读失败区别。原分期不变：沙箱/桥及DNK消费在P2，DNN上述S3/RPC在P3，其余基础JSON在P1；均配对切换，不用多格式parser过渡 | 不反复全仓、不新增总闸；不把目录/声明数量当业务完成；公开能力变化须同步对应包说明，不能只改生成器 |

规范组成的原题二十工具表（Q15 第 2 项；S=非空 string，N=integer；`?`为可选，未标者必填）：

| 工具 | 输入 | 业务及成功data |
|---|---|---|
| sandbox.profile.list | `{}` | 已登记可见profile的`{profiles:PublicProfile[]}`，不构建、不启动 |
| sandbox.profile.describe | `{profileId:S}` | `{profile:PublicProfile}`，不返回配方命令/凭证 |
| sandbox.instance.ensure | `{profileId:S,sessionId:S}` | 正式host解析政策并按既冻tuple幂等复用/创建，`{instance:PublicInstance}`；政策冲突拒绝，不接受任意policy/mount输入 |
| sandbox.instance.start | `{instanceId:S}` | 到达既准运行目标后返回`{instance:PublicInstance}`；已在该目标可重复，不重建身份 |
| sandbox.instance.stop | `{instanceId:S}` | 按既准停机目标结算后返回相同结构；不是删除durable状态 |
| sandbox.instance.restart | `{instanceId:S}` | 对该实例执行一次明确重启，返回相同结构；**不是可自动重放操作** |
| sandbox.instance.status | `{instanceId:S}` | 真实领域状态`{instance:PublicInstance}`；unknown不能伪成running |
| sandbox.diagnostics | `{instanceId:S}` | Snapshot：该实例最近真实诊断，只读 |
| sandbox.console | `{instanceId:S,level?:S,limit?:N}` | limit默认50、1..250；level为既有逗号分隔筛选；data为`{entries,total,counts}` |
| sandbox.operations | `{instanceId:S,errorsOnly?:boolean,limit?:N}` | errorsOnly默认false；limit默认50、1..200；`{entries,total,dropped}` |
| sandbox.error_catalog | `{errorId?:S}` | 唯一已准目录`{entries,total}`；按已有包含匹配筛选，不从错误消息造枚举 |
| sandbox.targets | `{instanceId:S}` | Snapshot：该实例真实CDP目标与附着观测，不创建target |
| sandbox.history | `{instanceId:S}` | 该实例stateVolume公开历史`{entries,total}`，不读全局第二份history |
| sandbox.dom | `{instanceId:S}` | Snapshot：最近真实DOM观测，不执行evaluate或顺带写页面 |
| sandbox.elements | `{instanceId:S}` | Snapshot：最近真实元素观测；不新增selector/depth工具输入 |
| sandbox.selftest | `{instanceId:S}` | Snapshot：最近已完成自检结果；无结果明确未观测，不偷偷运行修复/安装 |
| sandbox.network | `{instanceId:S,failedOnly?:boolean,limit?:N}` | failedOnly默认false；limit默认100、1..200；`{entries,total,failed}` |
| sandbox.ports | `{instanceId:S}` | Snapshot：配置/实际端口观测；返回观测不等于端口探测即分配成功 |
| sandbox.recovery_plan | `{instanceId:S}` | Snapshot：由真实状态生成的公开建议；**不执行**恢复命令 |
| sandbox.bridge_health | `{instanceId:S}` | Snapshot：host拥有的桥进程/连接观测；不靠host-push计数假称存活 |

> **下游约束**：Q15 二十工具表、结果/诊断边界及 F21.1–F21.8 共同冻结；不把当前 stub 或代码缺陷认证为业务目标。

#### `T-O-CF1115-22` —— native 支持边界、DNMSC 例外与全账收口
> **来源**：`Round 6 / Q16（业主 选 A）` ｜ **驱动后续**：`无后续题（最终轮）；§7.3 / P3 交接`

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F22.1 | native只在声明支持的host版本/平台内，其公开API能真正满足Q16第3项义务表时发布成功入口；以该版本官方类型、公开API和真实装配证据建立支持视图，不凭对象有enter函数或超前context源码判断；缺少必要能力则本地native_open明确`NATIVE_UNAVAILABLE`（HTTP503），UI保留可见不可用原因及安全下一步，不return伪造localId、不永久排队；这是本题批准的能力收窄，实施须同步DNCS AGENTS/native入口说明，不是宣布所有安装版目前不可用。可消费官方已公开且真正提供外部会话/视图语义的接口，但不发明包内HostService/AgentRegistry；若只能用完整Agent而无法满足，A的结果是native不可用，没有“先stub、后续QNA”路线；B则把官方host缺的能力作为P3正式依赖交付，不在本仓共享包承包host运行时 | 不改engines掩盖问题，不删可被正式支持的native实现；不以警告后成功或空方法冒充支持；不把“官方接口可扩展”解释为允许插件自建host运行时 |
| F22.2 | profile/会话查询、创建、消息、附件、tags/insights、sleep/archive/terminate等已准carrier功能不随native失效；可独立运行的原生设置/管理面继续可用；依赖local_session_id的原生会话工作台随native不可用，不能继续承诺无条件可用；信息仍通过已准carrier操作可读 | 不新增私有页面、第二套Chat或内部host跳转协议补洞；不把carrier管理功能与native体验混成一个开关 |
| F22.3 | 桥身份由carrier＋稳定profile identity＋remote session identity限定；正式host铸造的本地身份，初始化和注册全部成功后才曝光；同键并发打开单飞，失败清局部资源，不复用跨profile/失效配置的旧桥 | 不仅按remote id复用；不以token/label/私域URL当身份；不无限持旧凭证、不增durable凭证/会话副本、不顺带远端销毁 |
| F22.4 | 历史按carrier分页规则补齐本次应展示内容，按远端稳定消息identity去重；不把“首100条”叫完整历史，不靠永久增长的seen集合当恢复权威；text之外按获准host/carrier能力呈现或明确不支持，不静默丢内容 | 不把分页失败当空历史；不以本地投影覆盖远端权威；不新增恢复payload而不裁决 |
| F22.5 | 本地接纳、上游确认、远端运行完成是三件事；POST确认才显示为确认送达，失败/未知可见，不先写一个已完成用户turn再发送，不自动重发未知写入；不将普通postMessage称为步内steer，不将sleep/terminate称为逐轮取消；若所选官方native接口要求这些能力而carrier不能兑现，该native提供面不发布；可取消的本地读取/轮询传播signal，取消不宣称撤回已提交远端副作用；对实际采用的官方接口保持原义，若采用完整Agent须满足whole-agent activity quiescence及inbox/model/status/scope全部义务，不重定义为“HTTP已返回”或“队列为空”，不空resolve、不伪造turn/step完成 | 不以本地消息追加成功冒充远端完成；不把terminate/sleep当cancel；不新增通用错误/重试/取消协议 |
| F22.6 | 远端会话仍是远端业务权威；本地native为可销毁重建的只读/受控投影，正式host须支持所需非持久化或等价非权威视图；不将远端payload复制为可写/可执行的第二durable恢复源；桥/连接/Promise不持久化，回执只存获准identity/version/hash/consumed_at；卸载时停准入、使旧代际失效、取消可取消任务、等待已接纳任务结算，再撤服务/观察者/资源；迟到读取不再append到失效投影；已发写入未知则报告未知，不假回滚、不顺带远端销毁 | 不把注释“不持久化”当验证；不把同步append成功当已结算；不让迟到刷新新写失效投影；初始化/append/分页/注册/轮询失败须有所属状态与可见报告，不能catch+warn后仍返回成功；恢复必须重新经carrier与正式host流程，不得私有side-load或新开本地LLM替代远端 |
| F22.7 | 本地native失败HTTP仍用DNCS现有`{ok:false,reason,message}`形状，reason取四个稳定标识：`NATIVE_UNAVAILABLE`503、`NATIVE_UNSUPPORTED`422、`NATIVE_PROJECTION_FAILED`500、`NATIVE_OUTCOME_UNKNOWN`502；真实HTTP状态由本地操作codec决定，不被上游status覆盖；host公开错误传递使用所属官方结构化错误约定，不只解析message；Q8的JS Outcome保留这些domainCode，不混入carrier既有reason目录；上游403/404/429等仍沿获准carrier分类，403不得改404，确认远端拒绝不伪装成本地未知 | 新标识已由本题获准，只进入唯一作者，不扩成所有插件的新错误信封；不把初始化失败、投影失败、已提交未知混成一个码 |
| F22.8 | 精确保留DNMS01 R-16的vendored compaction、四preset patch与已接受instanceof降级，不扩为批准复制Cordis Service/内部反射；退役`host-services.js`自制FallbackService，按官方公开依赖/合法loader解析真实Service，并在真实scope/isolate验证，无法解析则明确激活失败，不偷改bundle ON/OFF、不创建影子服务、不替换私有host路径；P3验证正式支持native真实入口与不支持时503/可见原因/无伪localId，覆盖同remote异profile、配置变更、分页重建/重复消息、非text、确认/拒绝/未知发送、取消/idle真实时序、初始化失败和卸载在途barrier；若A在某host为native不可用，验证新支持边界，不冒记原完整能力通过；DNMSC验证真实Service解析、ON/OFF/四preset/isolate及已准降级；版本约束、能力装配与实际发布物必须兑现，不能只依本机hoist假定支持；公开breaking变化在实施中更新维护文档/升级说明，不另立第二决定台账。Q14/Q15已分别冻结其业务目标，不被本题自动批准；按§7.3完成全账交接，未实施/未验证债务继续在原观察号下登记 | 不以收口宣布测试已过、债务清零或自动defer；新发现真正公共改约仍按AGENTS走正常[业主]变更登记，不为本次机械实施预设第7轮；不把上游未交付写成未知需求 |

规范组成的原题义务表（Q16 第 3 项）：

| 义务 | 明确目标 |
|---|---|
| 身份与准入 | carrier＋稳定profile identity＋remote session identity限定桥；正式host铸造的本地身份，初始化和注册全部成功后才曝光；同键并发打开单飞，失败清局部资源，不复用跨profile/失效配置的旧桥 |
| 历史与消息 | 按carrier分页规则补齐本次应展示的历史，按远端稳定消息identity去重；不把“首100条”叫完整历史，不靠永久增长的seen集合当恢复权威；text之外按获准host/carrier能力呈现或明确不支持，不静默丢内容 |
| 发送完成 | 本地接纳、上游确认、远端运行完成是三件事；POST确认才显示为确认送达，失败/未知可见，不先写一个已完成用户turn再发送；不自动重发未知写入 |
| steer/cancel | 不将普通postMessage称为步内steer，不将sleep/terminate称为逐轮取消；若所选官方native接口要求这些能力而carrier不能兑现，该native提供面不发布。可取消的本地读取/轮询传播signal；取消不宣称撤回已提交远端副作用 |
| whenIdle/状态 | 对实际采用的官方接口保持其原义；若采用完整Agent，必须满足whole-agent activity quiescence及其inbox/model/status/scope等全部义务，不重定义为“HTTP已返回”或“队列为空”；不空resolve、不伪造turn/step完成 |
| 恢复与canonical | 远端会话仍是远端业务权威；本地native为可销毁重建的只读/受控投影，正式host须支持所需非持久化或等价非权威视图；不将远端payload复制为可写/可执行的第二durable恢复源。桥/连接/Promise不持久化；回执只存获准identity/version/hash/consumed_at，不用本地投影覆盖远端 |
| 卸载/配置失效 | 停准入、使旧代际失效、取消可取消任务、等待已接纳任务结算，再撤服务/观察者/资源；迟到读取不再append到失效投影。已发写入未知则报告未知，不假回滚、不顺带远端销毁 |
| 失败呈现 | 初始化、append、分页、注册、轮询失败有所属状态与可见报告；不能catch+warn之后仍返回成功。恢复必须重新经carrier与正式host流程，不能私有side-load或新开本地LLM替代远端 |

规范组成的原题错误闭集（Q16 第 5 项，本题获准新增，只进 DNCS 唯一作者）：

| reason / 语义标识 | HTTP | 行为与后果 |
|---|---|---|
| NATIVE_UNAVAILABLE | 503 | 正式host/所需能力未满足；不创建假本地会话，carrier操作仍可用 |
| NATIVE_UNSUPPORTED | 422 | 当前native提供面不支持请求的内容/操作；发送前拒绝，不静默丢字段或降级语义 |
| NATIVE_PROJECTION_FAILED | 500 | 本地初始化/注册/投影义务失败；撤未发布局部资源，已发远端操作不能称已回滚 |
| NATIVE_OUTCOME_UNKNOWN | 502 | 已提交的native送信等写入结果无法确认；明确可能已生效，不自动重发，提示先查看远端权威状态 |

> **下游约束**：Q16 支持边界修订、生命周期/错误目标及 F22.1–F22.8 共同冻结；收窄不等于原完整能力已偿还。

## 3. 收口（必须有）

- 形成史文档（`contract-and-facade-1115-eval.md`、E1–E76 调查段、各轮中场评估、§7.1/§7.2 历史时点、修订历史）只作测量指针，不在本文产生新裁决。
- 本文没有新建 Truth-ID。
- 与 [`contract-and-facade-1115-qna.md`](./contract-and-facade-1115-qna.md) 冲突时以该问答为准；Q14–Q16 的规范组成以其原题正文矩阵/表与 §1.8 索引共同追溯。
- 下游 action-plan 不填写 Q/A，不修改本台账的规则句；不复制业主回答台账，不凭本版宣称已实施。
- 需要推翻时，回到原问答追加 supersession，再投影到本台账的对应行。

## 4. 启用的插件

> 只列触发成立的插件；未触发的已删（P5 修正案未触发——本册无业主事后改读法且不回改正文的记录）。

### 4.1 P1 · 基线事实层（测量指针，非 `T-O`，本台账只 CITE）

| 事实 ID | 一句话 | 出处 | 型别 |
|---------|--------|------|------|
| `B-1` | U-1–U-6 业主指令是 baseline `-1`–`-6` 的决定来源，不是从 agent 推荐反推 | `QNA §1.1` | CITE |
| `B-2` | eval 报告提供事实与债务分析；其建议顺序、包名、统一错误信封和具体工具改约未冻结；85/118/47/48/43 为时点口径（348f544：47 宣称扫描、48 route-sensitivity 行数、43 feature-contract 行数，eval:89-95） | `QNA §1.1 边界`、`eval §3–§9` | CITE |
| `B-3` | 全部 `file:line` 引用锚定 `main @ f7199f9`；行号漂移时以路径+符号名为准 | `QNA header` | CITE |
| `B-4` | E1–E76 是逐轮新调查的静态确认，未运行 host/容器/浏览器/业务调用，不写成线上失败复现 | `QNA §2.0–§6.6.0` | CITE |
| `B-5` | R-7：`/s3/config` 的 probe/testOne 与 `/rpc` 的 method 别名是**两个边界、两组别名**，不是同一个「自定义RPC」；同函数委托不自动批准退役某名 | `QNA §6.6.0 R-7、E69/E70` | CITE |
| `B-6` | 安装版公开类型补证只覆盖该安装包，不证明整个 engines 版本区间支持某 native Provider；context 源码只是研究线索 | `QNA §6.6.0 安装版补证、E73` | CITE |
| `B-7` | `instance.ensure.sessionId` 按 DNLS01 `T-O-12` 读：session scope 必填、shared scope 可省略产出 null；首期 kitesurf 为 session | `QNA §7.4 既有领域合同行` | CITE |
| `B-8` | 36 项逐包观察 + 4 项横向观察（E1115-*）按原号保留至 P4 逐项结算；DNN-01/DNT-01/CROSS-02 首批至多部分偿还 | `QNA §7、§7.3、F13.7` | CITE |
| `B-9` | §7.4 审计只修复文档内部问题（状态残留、时点误读、E65 行范围、Q15 scope 表述），不证明产品行为；Q14–Q16 原题正文矩阵/表与 §1.8 索引为同一决定 | `QNA §7.4` | CITE |
| `B-10` | 收口 ≠ 实施完成：未构建、未安装、未部署、未提交；实施债务继续按原观察号追踪 | `QNA §7、§7.4` | CITE |

> **裁决效力点名**：`B-2`/`B-3`/`B-5`/`B-7`/`B-8`/`B-10` 是施工必须遵守的口径（建议非合同、HEAD 快照、两组别名、scope 读法、债务编号与冻结-实施分离）。其余作上下文。

### 4.2 P2 · 权威次序

`contract-and-facade-1115-qna.md`（decision provenance：§1 台账 + 业主回答 + Q14–Q16 原题规范组成）> **本台账（投影面）** > 下游统一实施计划 / action-plan（只 CITE）> ImplementationGrant。不一致时**回到问答**修订本台账，不得反向改问答。`E*`/`B-*` 与测量是事实、不是业主真相；`QNA_FROZEN` ≠ 代码 PASS。上游 DNLS01/DNMS01 已冻法律在其原登记源继续有效，本册只引用承接。

### 4.3 P3 · 与上游真相的关系

| 上游 ID | 关系 | 回改上游正文 |
|---------|------|----------------|
| `DNLS01-qna.md T-O-8`（四原则 :55）+ `T-O-10`（先验收后硬切、无兼容第四阶段 :57；读法判例 :158-166 / :163「硬切=切割方式」/ :165「不兼容=合同面」） | 只消费 / 引用承接（`-8`/`-13`/`-19` 的硬切与退役规则沿用） | 否 |
| `DNLS01-qna.md T-O-12`（instance/scope，:59） | 只消费（`-21` ensure.sessionId 按其解释） | 否 |
| `DNLS01-qna.md T-O-17`（:64）及 :62-65/:548-554/:726-731（[DNLS] 八工具/幂等/attach/实例合同） | 只消费（`-20` [DNLS] 提供面、`-21` 二十工具/PublicInstance 语义沿用） | 否 |
| `DNMS01-qna.md` R-16（vendored compaction/四 preset patch/instanceof 降级，:94-96） | 精确保留 / 只消费（`-22` 不扩为复制 Cordis Service/内部反射） | 否 |
| `DNMS01-qna.md T-O-DNMS01-15` 闭集错误码登记（:66） | 只消费（`-22` 的 NATIVE_* 四标识只进 [DNCS] 唯一作者，不扩成全仓信封） | 否 |
| 根 `AGENTS.md` 六条核心原则 + worktree 约定 + U-6 四原则 | 只消费 / 权威边界（不迁移登记源） | 否 |

> 注：`contract-and-facade-1115-eval.md` 是**形成史/分析锚点**，不是真相层；E1115-* 观察号是债务追溯索引，不是已获批准的修复方案。

### 4.4 P4 · 冻结审计注记（append-only，不改内核原句）

> `AF-1`（QNA §7.4）：Q15 表中 `instance.ensure` 的 `sessionId` 字面必填，**一律读作**「session scope 必填、shared scope 可省略并产出 null」（DNLS01 `T-O-12`），不新增 scope 或默认。
>
> `AF-2`（QNA R-7）：「自定义RPC」统称作法**一律读作两个边界**——`/s3/config` 的 action 别名（留 `probe` 删 `testOne`）与 `/rpc` 的 method 别名（留 `manifest.get` 删 `lsrag.manifest`）。
>
> `AF-3`（QNA §7.1/§7.2）：两轮「能否收口」的历史时点判断**一律读作渐进链证据**；当前结论以 §7.3 最终收口对账为准，不构成未决项。
>
> `AF-4`（QNA §1.8/R-8）：§1.8 F 条款索引与 Q14–Q16 原题正文（两提供面矩阵、二十工具表、义务表、错误码表）**一律读作同一决定**；索引表述差异按编辑错误 append 修正，不形成第二套业务目标。
>
> `AF-5`（QNA §7/§6.8）：「已冻结/已收口」**一律读作真相层定案**；不读作代码已改、测试已过、债务清零或自动 defer。
>
> `AF-6`（QNA 历史口径）：85/118/47/48/43 等统计**一律读作时点快照**（348f544：47=1112 宣称扫描、48=route-sensitivity 行数、43=feature-contract 行数，eval:89-95）；新模型须另标快照与单位，不改写旧账制造减债（F12.8）。

### 4.6 P6 · 残项、不得重开、授权边界

- **残项**：P0–P4 全部实施与验证（真实 PTY、sandbox 二十工具业务接线、native 真实入口、离仓产物、安装版 engines 区间核验）+ 36 项逐包观察与 4 项横向观察的 P4 逐项结算。**阻塞当前出口：NO**（真相层已收口、无 owner-gated 空白；但**阻塞实现的动工与销账**，未完成项按 `-8` 保持未完成）。
- **不得重开**：Q1–Q16 的已冻结 A 路线及其替代读法（多领域权威包统一索引、按包/按层为销账主单位、协议入口为作者主轴、全量同构、统一 wire 信封、整体迁走 guard、bridge 十五工具为真源、无条件完整 native、fake Agent 现状保留等未选中路线）；`-4` 的两轮 foundational 结构；不设 Round 7（新公共改约走 AGENTS 正常[业主]变更登记）；eval 报告建议与议题清单不构成排期或合同。
- **仍然不授权**：implementation grant、远端、deploy、live、release（版本 bump/tag/发布须[业主]单独授权）、新增 release-gate、安装/重启现用 profile（含 `dsh.local`）。

## 修订

| 版本 | 日期 | 变更 |
|------|------|------|
| `0.1.0` | 2026-11-15 | 首版：从 `contract-and-facade-1115-qna.md`（v0.12 已冻结）抽取 22 条 `T-O` + 126 条 F 细节与全部规范组成表，投影为统一 truth ledger；启用 P1/P2/P3/P4/P6 |
| `0.1.1` | 2026-11-15 | 三路独立攻击审查后修订：修 `44`→`48`（route-sensitivity 台账行数，eval:89-95）；DNLS01 锚点精化（`T-O-8`:55 四原则、`T-O-10`:57 硬切时序+判例 :163/:165、`T-O-12`:59、`T-O-17`:64）；DNMS01 错误闭集收窄至 `T-O-15`:66；`AGENTS.md` 六条核心原则+worktree；规范组成恢复 verbatim（Q5「（拟建）」表头、Q6 轴定义原文、Q7 验证表 Q5-B 条件句、Q9 decodeMcpReply 文字规定）；删 P1/T-R 记号矛盾；补「等」防穷举误读；裸缩写锚定为 `[DNLS]`/`[DNT]`/`[DNCS]` |
