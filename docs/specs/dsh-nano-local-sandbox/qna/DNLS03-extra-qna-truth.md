# `DNLS03-extra` — QnA Truth Ledger

> **Ledger ID**：`DNLS03-EXTRA-TRUTH`
> **范围**：[DNLS] 在已冻 `DNLS03` 之上的补充工作集（W1 [DNT] 对接、W2 [DNK] 收口、W3 管理页与真机 agentic e2e）。只列已经冻结的 ID：`T-O-55`–`T-O-71`，共 17 条
> **文档性质**：`frozen-truth ledger / compact consumption entry`（问答是 decision provenance；本文不是第二真源）
> **状态**：`🔒 FROZEN · foundational 8 条（T-O-55–T-O-62）+ execution 9 条（T-O-63–T-O-71）· NOT IMPLEMENTATION CLOSURE · NOT IMPLEMENTATION GRANT`
> **日期**：`2026-11-20`
> **Owner decision provenance**：[`DNLS03-extra-qna.md`](./DNLS03-extra-qna.md)（Round 0 基线 `T-O-55`–`T-O-58` + Round 1–2 foundational Q44–Q47 + Round 3–5 executional Q48–Q56；13 题均「已确认 A」，无保留；second-opinion 自 Round 1 起 `retired`；§11 收口审查 R-1–R-12 已处置，未改已锁定原文）
> **上游已冻法律（只 CITE，本文不 supersede 其正文）**：[`DNLS03-qna-truth.md`](./DNLS03-qna-truth.md) 的 `T-O-33`–`T-O-54`；[`DNK01-1120-qna-truth.md`](../../dsh-nano-kitesurf/qna/DNK01-1120-qna-truth.md) 的 `DNK01 T-O-1`–`T-O-6`。本台账点名的改判见 §4.3，上游正文不回改
> **形成史输入（测量，不裁决）**：问答 §1.1 的 `XB-1`–`XB-33`、各轮中场评估、§11 收口审查
> **Review HEAD**：`3e7a775`（问答取证快照，2026-11-20；宿主 pin `0.2.2-rc.5@9c2670d3`。行号漂移以「路径 + 符号名」为准。P2 候选线 `77e217e` 是 `T-O-69` 的目标，不是本快照）
> **远端 / paid**：`none`（`remote_ops=0`）

## 0. 权威边界（必须有）

本文是 [`DNLS03-extra-qna.md`](./DNLS03-extra-qna.md) 的精炼消费入口，也是下游直接 CITE 的引用面。本文：

1. 只登记 [业主] 已经接受的 `T-O-55`–`T-O-71`。不新建 Truth-ID，不改变 [业主] 结论，不把摘要升级成新法律。
2. 不保留问题解析、候选方案、推荐论证、证据表或中场推演。这些留在问答原文。
3. 与问答的台账或 [业主] 回答不一致时 fail-closed，以问答为 provenance，并修订本台账。
4. 下游只能引用或细化本台账。不得把未选中的选项、或已被本台账改判的暂行句，再当成现行合同。`T-O-55` 的「顺序待裁定」、`T-O-58` 的「K-01 仍须裁决」、`T-O-61` 的「页签复用与设计能力核实留 executional」都已由后续条目裁定；读法见 §4.4，原句不改。
5. `FROZEN` 不表示代码已改、测试已绿、镜像已换、清场已做、生产已切换、或 closure §0 已改写。
6. 本文不构成 implementation、build、deploy、secret、provider 或任何远端动作的 grant。`T-O-65` 与 `T-O-70` 里的现场授权只存在于问答的对应格；引用本文不等于再签发一次。
7. 测量层是 `3e7a775` 的事实，`T-O` 是目标态。施工落地后不回改测量层。
8. 推翻任一旧行，只能在原问答里 append-only supersession。不得改旧行，不得在下游文档里改写，不得回改 [`DNLS03-qna.md`](./DNLS03-qna.md) 或 DNK01 台账正文。

### 0.1 总体裁决（必须有）

```text
foundational T-O-55..-58:        FROZEN（开轮基线 / [业主] 阶段指令与并线签收）
foundational T-O-59..-62:        FROZEN（Round 1–2，Q44–Q47 全 A）
execution    T-O-63..-71:        FROZEN（Round 3–5，Q48–Q56 全 A）
OPEN owner decisions:            0
[业主] 推迟（已登记，不是 OPEN）:  K-07 桌面 profile 与 kitesurf-desktop（T-O-70）
足以写下游计划:                  YES（补充计划 append 至 DNLS03 action-plan，不另立计划文件）
足以签发 implementation grant:    NO
现场授权（只存在于问答，本文只投影）: T-O-65（dsh-dev）与 T-O-70（~/.dsh web）
remote / deploy / live:          NOT CLAIMED
```

```text
DNLS03-extra-qna.md（已冻结，decision provenance）
  → 本台账（引用面，只投影已选中那一格）
  → DNLS03 补充计划（append 至 action-plan；只 CITE，含 §11.3 的读法）
  → （另立）ImplementationGrant
```

## 1. Truth-Gate 总表（必须有）

> 一行一个已有 ID。内核只写已选中的那一格，不写落选项。

| Truth-ID | 领域 | 冻结核心 | 来源 |
|----------|------|----------|------|
| `T-O-55` | 阶段范围 | 补充工作仍归 `DNLS03`、仍在本工作树；合并 W1 [DNT] 对接、W2 [DNK] 收口、W3 管理页与真机 agentic e2e；不另立阶段名或计划文件 | 开轮基线 / [业主] 阶段指令 |
| `T-O-56` | W1 目标 | 在 [dsh工作台] 内，从 [DNLS] 选中的 sandbox 唤起该 sandbox 的 [DNT] 终端；以真实宿主链路可用为完成，不以夹具代替 | 开轮基线 / [业主] 发车要求 |
| `T-O-57` | 上游效力 | `DNLS03 T-O-33`–`T-O-54` 与 `DNK01 T-O-1`–`T-O-6` 仍为现行合同；本册只逐条 append supersession，未点名者不重开 | 开轮基线 / [业主]「沿用 DNLS03」 |
| `T-O-58` | 并线输入 | `kitesurf-http-render` 已由 `3e7a775` 并入并退役；`/res` 失败关闭、`/dom` 不改写是过渡态；K-01–K-07 是输入不是结论 | 开轮基线 / [业主] 并线签收 |
| `T-O-59` | 终端主体 | 宿主 `owner`（键 `owner`）是本机唯一用户的稳定主体，可操作归属自己且代次匹配的沙箱终端；不是通配授权；撤回「共享 owner 一律不得使用 `terminal.*`」 | Round 1 / Q44 A |
| `T-O-60` | [DNK] 收口真源 | 唯一现状真源是扩展后的 [DNK] 收口台账；终态只有四种，不得停在「开放」；七份旧文档冻结为历史 | Round 1 / Q45 A |
| `T-O-61` | 对象交接 | 新增公开资源 `dsh-resource://sandbox/<envId>/<sandboxId>`；[DNLS] 不写消费者 kind，经宿主 `openResource` 交接；引用不授予权限 | Round 2 / Q46 A |
| `T-O-62` | 真机 e2e | 双操作者：ego-browser 用户手势 + session 内 agent 真实模型回合；判据看协议行为；受管前脚本整批退役，不另立套件或 release-gate | Round 2 / Q47 A |
| `T-O-63` | relay 写闸 | 代次宿主凭据认出 [DNLS] 宿主连接，其余 relay 与 MCP 一律按 agent；接管中 agent 只放行读白名单；该凭据不是 `T-O-44/52` 所禁的新票据 | Round 3 / Q48 A |
| `T-O-64` | agent 入口 | session 内 agent 的受管入口是 [DNLS] 经 `tools.register` 注册的四个模型工具，与 HTTP、`/mcp` 共用一个分派器；不从参数推断主体 | Round 3 / Q49 A |
| `T-O-65` | 顺序与开发站授权 | 代码先行；镜像只换一次、开发站只清场一次、完整真机重放只跑一次，失败行修复后复跑；授权仅限 `dsh-dev` 上明列的五类动作 | Round 3 / Q50 A |
| `T-O-66` | `/res` 退役 | 彻底删除 `/res` 与 HTML 代理改写；隧道 hint 只落在 `/open`；`DNK01 T-O-5` 整条退役，`T-O-4/6` 按句退役 | Round 4 / Q51 A |
| `T-O-67` | 引用页签 | 一引用一页签、锁定对象、隐藏即停轮询；列表与 inspect 增加只读 `drivers`；无 `cdp` 则不可选 | Round 4 / Q52 A |
| `T-O-68` | 失败投影 | 内核失败投影为 `{ok:false, errorId, error?, hint?}`，不含其他键；派发前失败只有状态码与 `errorId`；三入口同投影 | Round 4 / Q53 A |
| `T-O-69` | 管理页 P2 | 唯一候选是 `77e217e`；外壳退回 [DNLS] 并登记 `nano-ui-exempt`；S4 八张截图交 [业主] 裁决；e2e 通过不代替设计通过 | Round 5 / Q54 A |
| `T-O-70` | 生产切换 | S6 只切 `~/.dsh` web：三包同批、先清生产旧对象、只读验收、失败回装旧包；桌面推迟；不删镜像 | Round 5 / Q55 A |
| `T-O-71` | 收口交接 | 一份 todo 跟踪、一份 closure 终判、指针在 S1 写、main 先并入；S6 后再删工作树与分支 | Round 5 / Q56 A |

> 覆盖指针（2026-11-21）：`T-O-69` 的 P2 通过要求、`T-O-71` ⑤ 的 P2 前置与 SHA 比对闸、`T-O-70` ① 的 SHA 比对闸，已由 [业主] 在 [问答 §13](./DNLS03-extra-qna.md) 撤销。登记只在问答 §13 一处；本表原行不改。

## 2. 规范内核（必须有）

> 按业务簇分组。每条只有来源与已冻结的内核；不落选项、不搬推荐理由、不搬证据表。
> 密度跟源头走：问答台账已写出的执行约束与 ①②③ 原样投影。序号不另编。
> 注：内核按业务簇排列。`T-O-55`、`T-O-58`、`T-O-61` 里「留给后续轮」的句子保持原样；它们已被后续条目关闭的读法只在 §4.4，不回写本节。

### 2.1 阶段范围与上游边界（开轮基线）

#### `T-O-55` —— 仍是 DNLS03，合并三项工作

> **来源**：`开轮基线 / [业主] 本次阶段指令` ｜ **驱动后续**：`Q44、Q45、Q47、Q50、Q54、Q56`

本补充工作集仍归类 `DNLS03`，在工作树 `.agents/worktrees/dnls03-managed-sandbox-control` 内进行，合并三项工作：

- **W1**：[DNT] 在 [DNLS] 内的实际对接（对应真源、协议层确认、测试）。
- **W2**：[DNK] 的未尽事宜、closure 的彻底关闭、真机实验。
- **W3**：[DNLS] 未完成的开发（dashboard + control UI），并完成 ego-browser 的真机 agentic e2e 测试。

不另立阶段名或计划文件。正式计划 append 至 DNLS03 action-plan，并更新对应 todo。三项工作的先后顺序待本册裁定，不由实现顺序反推。

#### `T-O-56` —— W1 的完成是真实宿主里唤起所选终端

> **来源**：`开轮基线 / [业主] 三包联合普查的发车要求` ｜ **驱动后续**：`Q44、Q46`

[业主] 对 W1 的目标：在 [dsh工作台] 内，从 [DNLS] 选中的 sandbox 唤起该 sandbox 的 [DNT] 终端。

完成以真实宿主中该链路可用为准，不以夹具通过或拒绝分支正确代替。手段仍受 `T-O-54` 公开资源交接与「不得侧载」约束。

#### `T-O-57` —— 上游继续有效，只允许逐条 append

> **来源**：`开轮基线 / [业主]「沿用 DNLS03 作为工作阶段的归类」` ｜ **驱动后续**：`Q44、Q45、Q46、Q48、Q49、Q51、Q53、Q56`

`DNLS03 T-O-33`–`T-O-54` 与 `DNK01 T-O-1`–`T-O-6` 仍为现行合同。本册只以逐条 append supersession 局部改判；未被点名的条目不重开。

改判须写明被替代的原句与替代范围。不在下游文档里改写旧真相。DNK01 族的改判在本册登记，并在 DNK01 侧只留指针，不形成第二份登记。引用 DNK01 族时一律写作 `DNK01 T-O-x`。

#### `T-O-58` —— 并线结果是输入，过渡态不是终态

> **来源**：`开轮基线 / [业主] 同意并线评估的全部推荐（含 /res 方案 c）` ｜ **驱动后续**：`Q45、Q51、Q55`

`kitesurf-http-render` 已由 `3e7a775` 并入本工作树并退役（分支已删）。受管宿主上 `/res` 失败关闭、`/dom` 不改写到代理是现行过渡态。[todo.DNLS03 §7](../plan/todo.DNLS03.md) 的 K-01–K-07 是本册输入，不是已裁结论。

K-01（`/res` 归属）仍须 [业主] 裁决。过渡态不得被当作 `DNK01 T-O-4/5` 的最终兑现。

### 2.2 终端主体、收口真源、对象交接、真机判据

#### `T-O-59` —— 宿主 `owner` 可持有自己的沙箱终端

> **来源**：`Round 1 / Q44，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q46、Q47、Q49`
> **改判**：`DNLS03 T-O-44/52` 的澄清式 append supersession

**宿主 `owner` 是本机唯一用户的稳定主体（键 `owner`）。** 它可以按 `T-O-42/54` 创建、列出、附着、读写、调整、关闭 `principalKey` 为 `owner` 且代次匹配的 [DNLS] 沙箱终端。它不是其他主体终端的通配授权。非 `owner` kind 得不到主体，仍 403。

保留原句：「共享 browser owner 不是多用户证明；临时 `peer.id` 不是持久归属。」撤回「共享 owner 一律不得使用 `terminal.*`」这一由 `b3ad7e5` 引入、无 [业主] 裁决的实现读法。

- 硬切 `resolveOwnerPrincipal`，不留拒绝开关。
- 保留 `authorize` 的归属与代次校验、upgrade 前再次 admission、撤权即 detach、不杀 PTY。
- 同切 [DNLS] `AGENTS.md` 的终端说明与 journey 断言：owner 通过，非 owner kind 被拒；注明两个标签页不是跨用户证明。
- 不新增错误枚举、凭证、lane 或路由。
- W1 以 `dsh-dev` 上 `T-O-39` 辨真流程验收：选中对象 → 明确新建 → [DNT] attach → 输入推进原任务 → 只重启 [dsh] → 重新 attach 后新输入仍推进原任务。
- 若须区分 API token 客户端，登记为宿主依赖，不在插件内推断。

#### `T-O-60` —— [DNK] 收口只有一张现状台账

> **来源**：`Round 1 / Q45，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q46、Q47、Q48、Q50、Q51、Q52、Q53、Q55、Q56`

**[DNK] 收口的唯一现状真源是由 todo.DNLS03 §7 扩展的「[DNK] 收口台账」。**

- 行 = 原编号（`G` / `L` / `V` / `E` / `F` / `X` / `D`）+ `DNK01 T-O-1`–`T-O-6` + K-01–K-07 + 普查新发现。
- 列 = 执行方、终态、证据。
- 终态 ∈ {已完成、已作废（引 `T-O`）、本期实现、[业主] 推迟}。任何行不得停在「开放」。
- 七份旧文档冻结为历史，只在文首加一行指针。`DNK01` 台账的状态行与部署快照只追加指针。
- 内部行为以代码加测试关闭。用户或 agent 可见的行为（pane、skill、bridge 写闸、错误展示）另须在 `dsh-dev` 经显式选择对象的真机重放取证（K-06）。
- 旧取证（E1–E15、`final-eval`、`e2e-ego` 27/27）不移用于合并态。受管前验收脚本在改写或退役前不算证据。
- 普查分类只是初值，逐行复核。台账是 todo，不是闸门，不新增 release-gate。
- bridge 改动须重建镜像并对开发对象换代（K-03）；授权与时机由后续轮裁定。
- DNK01 族改判只在本册登记（`T-O-57`）。

#### `T-O-61` —— 用公开对象引用交接，不写消费者 kind

> **来源**：`Round 2 / Q46，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q49、Q50、Q52、Q54`
> **改判**：`DNLS03 T-O-51` 所含 Q40 A 第 3 项的澄清式 append supersession；`T-O-54` 原文不改，只补齐「不固定私有 kind」的实施

**[DNLS] 以公开对象引用交接所选 sandbox。** 新增公开资源类型 `dsh-resource://sandbox/<envId>/<sandboxId>`，只标识**已存在**的受管 sandbox。ID 的校验与编码同 `T-O-54`（env tag 与 UUID 各占一个路径段）。不编码主机 URL、session、profile、服务、命令或 token。不承诺跨主机可用。引用不授予权限；每个对象请求仍按 `sandboxId` 单独核权。

[DNLS] 用宿主 `candidates(address)` 列出「在〈处理器标题〉中打开」，经 `openResource` 交接，不写任何消费者 kind。

对 Q40 A 第 3 项的澄清：[DNK] 不与 [DNLS] 共享选择状态，也不从 [DNLS] 推断默认对象；经宿主导航收到的明确对象引用，视为用户的明确选择（`T-O-38`）。

- 硬切 [DNLS] 的 `kitesurf()`、`openKitesurf`、`openWorkspaceHint`、`workspaceMissing` 与 `'dnt-sandbox-terminal'` 判断，不留旧分支。
- 对象地址的构造与 `terminal-resource.js` 同模块、同一组校验。
- 终端「打开」按 `candidates(终端地址)` 是否非空判断；无候选沿用 `T-O-54` 的「已创建未连接 / 明示不可用」。
- [DNK] 在现有注册上加 `patterns: ['dsh-resource://sandbox/**']` 与规范语法的 `canOpen`。页签 body 从 `navigation.address` 取引用，先 `GET /contract` 再定向 inspect，核对 `envId` 与 `sandboxId`，通过后等价一次 `choose(sandboxId)`。核实失败显示原因，不回落到其他对象。
- 原 `kitesurf` 页类型与空选择器保留，仍不自动选中。
- 不新增错误枚举、路由或 lane。
- 「每个引用一个页签还是复用单页签」「body 内核实该对象的 profile 是否提供设计能力」留 executional 轮。
- 验收：单测（地址语法；零、一、多候选；核实失败不改投）加 `dsh-dev` 真机重放，记入 `T-O-60` 收口台账。
- `openResource` 仍要求已挂载 session（宿主依赖，`XB-5`）。

#### `T-O-62` —— 真机 e2e 是双操作者，旧脚本整批退役

> **来源**：`Round 2 / Q47，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q48、Q49、Q50、Q53、Q54`

**W3「ego-browser 真机 agentic e2e」的定义：**

1. 环境：`dsh-dev` rc.5 web profile。安装经 SHA-256 核对的候选，并核对页面实际加载的 client 字节。
2. 入口：真实 session 的 [dsh工作台]。
3. 操作者：① 执行者经 ego-browser 以用户手势操作；② session 内的 [dsh] agent 以真实模型回合，按 [DNK] skill 对显式选定的开发测试对象动手。
4. 判据看协议行为：是否带 `sandboxId`、是否遵守 `humanHold`、是否只写所选对象。不看措辞。

受管前脚本整批退役，不改写，也不另立脚本化套件或 release-gate。

- 场景 = `T-O-60` 台账中「用户或 agent 可见」的行 + W1（`T-O-59` 辨真流程）+ W3 管理页的行。写在 DNLS03 补充计划，结果回填 todo。
- 证据沿用 `.anote/reviews/dsh-nano-local-sandbox/DNLS03/`。文档只记操作号、截图名、session 标识与结论，不贴会话正文、cookie 或 token。
- 正反分支分开登记。软件回归与真机证据分开登记。
- 提示词只给任务与对象名，不提示绕过方法。失败即台账行失败，不为迁就单次结果改写 skill。
- 授权在 `dsh-dev` 向测试 session 发送 e2e 所需的模型消息，使用开发站已配置的宿主凭证，不新增凭证。次数与时机由 executional 轮定。
- 删除 [DNK] `scripts/e2e-ego.mjs`、`eval-design-mode.mjs`、`eval-ego-vs-dnk.mjs`、`eval-proto-mcp.mjs`，删除 `package.json` 的 `test:e2e` 与 `test/e2e-script.test.mjs`，删除仓根 `scripts/gui-smoke-kitesurf.sh` 并改写 `RELEASE.md` 的对应句。不留别名或兼容开关。[DNK] 包测试数下降属预期。历史文档中的引用不回改。`RELEASE.md` 不新增必跑项。
- 本条不授权镜像重建、测试对象退役或擦卷。

### 2.3 写闸、agent 入口、施工顺序

#### `T-O-63` —— 代次凭据认出宿主，其余一律 agent

> **来源**：`Round 3 / Q48，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q53`
> **改判**：`DNK01 T-O-2/3` 的澄清式 append（DNK01 侧只留指针）

**桥以代次宿主凭据认出 [DNLS] 宿主连接，其余 relay 与 MCP 连接一律按 agent 处理。**

- [DNLS] 在创建、启动、换代与宿主重启后采纳运行中对象时，为每一代次生成随机凭据。只经 `container exec`（root helper、stdin、`env -i`，与 `publishHealth` 同一模式）投放到容器内只有桥能读的位置。
- 宿主的 relay 握手出示凭据。桥逐次比对。未出示当前代次凭据即为 agent 类。
- `humanHold.active` 时，agent 类只放行读方法白名单：`*.enable` / `*.disable`、`DOM.getDocument` / `querySelector*` / `describeNode` / `getBoxModel`、`CSS.getComputedStyleForNode`、`Accessibility.getFullAXTree`、`Page.captureScreenshot`、`Target.getTargets` / `attachToTarget`。其余方法（必含 `Page.navigate`、`Input.*`、`Runtime.evaluate`）以既有 `kitesurf.control.held` 拒绝。
- `POST /control` 与 `sandbox.control takeover` 只对宿主类生效。`clientInfo.name` 不再带来任何豁免。`relay.conns` 只计 agent 类连接。
- [业主] 签收 A 即判定：该凭据不属于 `T-O-44/52` 所禁的「新票据、operator 密钥」。

凭据不出现在任何 HTTP/MCP 响应、操作台账、审计、日志、截图或 skill。不跨对象。不授予任何主体任何权限，只证明「连接来自 [DNLS] 宿主进程」。投放失败时对象页不连 relay，沿用 503 失败关闭。被拒的写先记 `lastAction`，不更新 `lastAt`，不改 `writer`，不排队，不重放。agent 类调用 `takeover` 回 `kitesurf.control.query`；无凭据 `POST /control` 回 403。`controlSnapshot` 增 `relay: {conns, lastAt, lastMethod}`，`lastMethod` 只存方法名。不新增 errorId、路由或 lane。白名单随 agent-browser 升级复核；误拒只发生在接管期间。宿主以后提供容器侧调用方身份时，改用宿主机制并退役本凭据。

验收：单测（宿主类接管中写入成功、agent 类被拒且 `lastAt` 不变、自报 `human` 无效、无凭据 `POST /control` 403、白名单读放行、换代后旧凭据失效、凭据不入任何响应体）加 S4 真机 agent 场景，记入 `T-O-60` 台账 `DNK01 T-O-2/3` 行。镜像重建按 `T-O-65`。

#### `T-O-64` —— agent 走四个模型工具，不走自报身份

> **来源**：`Round 3 / Q49，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q52、Q53`
> **改判**：`DNK01 T-O-1` 的 agent 侧落点（DNK01 侧只留指针）

**session 内 agent 的受管入口是 [DNLS] 注册的宿主模型工具。** [DNLS] 增加 `tools` inject，经 `tools.register` 注册四个模型工具（暂名：列表、状态、打开、接管状态），作为 `dnls.control/1` 能力在 HTTP、`/mcp` 之外的第三个入口，共用一个能力 owner 与分派器。

- 主体由组合层显式提供「本宿主 session 内的 agent 工具调用 → owner」适配器（`T-O-59`），不从工具参数推断。
- 对象工具必须带显式 `sandboxId`。结果经同一 `redact`。
- 列表只给可见对象窄行，不替用户选择。
- 状态给 phase、relay 地址 `cdp`、navigation、hints。
- 打开（`sandboxId` + `url`）是 `DNK01 T-O-1` 在 agent 侧的落点，计入写，接管中拒绝。
- 接管状态只读 `humanHold` 与 `relay` 两档。
- 打开能力只登记一次。HTTP `/open`、`/mcp` 与工具共用一个打开内核。

不提供生命周期写、终端、日志或进程工具。不新增处理逻辑、错误枚举、lane 或凭证。

[DNK] skill 重写（改 `lib/skill.js` 与 `src/skill/`，`skills/` 由构建生成）：Step 0 为「列表 → 用户明确对象 → 状态」；relay 地址只从状态工具取；用户未指定对象就询问（只有一个候选也问，`T-O-38`）；删除「实例按 session 记录」与 suspend/resume 旧语义；保留 held 即停写；`/nano-kite` 的生命周期改为指引用户在工作台操作；`references/*.md` 同步。工具 schema 与描述成为模型可见合同，改名须同步 skill。

S1 须核实宿主对非 owner 主体（如 liveshare `share-viewer` 的 fork）驱动回合时的工具限制。核实不了即登记为宿主依赖，不在插件内推断。若以后要 agent 执行生命周期，另行登记带 `requestId` 的工具。

验收：单测（schema、缺 `sandboxId` 拒绝、不可见与不存在拒绝一致、`redact` 生效、接管中打开被拒、注册随卸载处置）加 S4 真机（列出 → 询问 → 对指定对象打开并经 relay 操作），记入 `T-O-60` 台账 skill 行与 `DNK01 T-O-1` 行。

#### `T-O-65` —— S1–S5，开发站授权限于明列动作

> **来源**：`Round 3 / Q50，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q51、Q52、Q53、Q54、Q55、Q56`

**施工顺序与开发站授权：代码先行；镜像只换一次、开发站只清场一次、完整真机重放只跑一次，失败行修复后复跑。**

```text
S1  合同与代码（T-O-59、T-O-61、T-O-62、T-O-63、T-O-64、收口台账逐行终态初值）
S2  经宿主 confine 用 build-profile.mjs 构建一次镜像与三包候选；记录镜像 digest 与三包 tarball SHA-256
S3  严格按 redesign todo 的清场顺序清场，并只新建一个对象
S4  一次完整双操作者真机 e2e（场景按 W1 → W2 → W3）
S5  只复跑失败行与受修复影响的行
```

[业主] 签收 A 即授权，且仅限 `dsh-dev` rc.5 web profile：

1. 重建 kitesurf 镜像一次。同一阶段内修复构建失败后的重建计入同一授权。
2. 退役并永久删除 `dnls03-dev`（`7ef19658-39c7-43e7-8dc8-d387a45a9d83`）与 `dnls03-ui-check`（`75bfac14-8cd4-4978-a101-32cb7115d988`）及各自精确的卷目录。不备份、不迁移。
3. 从新镜像创建一个新测试对象。
4. 按场景需要重启开发 Web 服务。
5. 向一个专用测试 session 发送 e2e 模型消息：每个 agent 场景 1 条任务消息、至多 1 条追问；一次完整重放合计不超过 20 条；S5 同一上限。

- S1 完成判据：三包 `npm test` 全绿（[DNK] 测试数因脚本退役下降属预期）、`check-*` 通过，不部署。
- S1 期间只许只读探查开发站（不写、不重启、不发模型消息）。
- S3 任一步未证实即停，不记为已清场。环境控制台账与审计不随卷擦除。
- S5 需再换镜像时，在同一新对象上换代，不再清场。
- 任何超出（第二次清场、额外对象、其他 profile、生产部署、pin 改动、超过上限的模型消息）另请 [业主]。
- 20 条是建议上限。场景清单定稿后明显不足，在补充计划提出，由 [业主] 批准。
- P2 设计仍由 [业主] 看截图裁决。e2e 通过不代替设计通过。
- 不含生产实例、宿主 pin、其他 profile 与生产发布配对（K-07）。

### 2.4 `/res`、引用页签、失败投影

#### `T-O-66` —— `/res` 与代理改写彻底退役

> **来源**：`Round 4 / Q51，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q55`
> **改判**：`DNK01 T-O-4` 两句、`DNK01 T-O-5` 整条、`DNK01 T-O-6` 的 `/res` 与 `res.public-tunnel`；并取代 todo.DNLS03 的「`/res` 的本次处置」

**彻底退役 `/res` 与 HTML 代理改写；隧道 hint 只落在 `/open`。**

删除：[DNLS] `src/host/res-proxy.js` 与 `test/res-proxy.test.mjs`；`routes.js` 的 `RES_ROUTE` / `serveRes` 导入与分支；`dom-srcdoc.js` 的 `proxy` 选项及只服务于代理的改写函数（只留真实地址一种构建）；`object-pages.js` 中 `dnls.res` 的例外与注释；仓根路由账本的 `dnls.res` 行（重新烘焙 `lib/bindings.js`、`lib/browser-bindings.js` 与 perf 声明）；错误目录 `res.*` 九行。

HTML 模式保持 [DNK] 显式开启的静态投影。`<base>` 为页面真实地址。子资源一律用真实地址。

`/open` 的目标主机命中 kitesurf driver 内的已知隧道域常量时，成功体与失败体都附 hint。不改状态码，不阻断。域名清单是常量，不是安全边界。HTTP、`/mcp` 与 `T-O-64` 的打开工具共用打开内核，返回同一 hint。

DNK01 族（DNK01 侧只留指针）：

- `DNK01 T-O-5` 整条退役。
- `DNK01 T-O-4` 中「所有绝对 http(s) 子资源引用一律改写到同源代理」与「path 镜像」两句退役。默认引擎渲染、HTML 显式开启、静态投影、`/dom` 版本签名保留。追加「HTML 投影保留真实地址」。
- `DNK01 T-O-6` 中 `/res` 与 `res.public-tunnel` 退役。`/open` 隧道 hint 保留。hint code 由 kitesurf driver 的目录行登记。`/diagnostics` 提示删去「+ `/res`」。

不留别名、开关或墓碑路由。不新增路由、能力、errorId 或 lane。路由账本检查 0 漂移（行数减一）。相关断言同步改写：`dom-srcdoc.test`、`dom-health-routes.test`；`environment-owner.test` 改为断言该路径不再注册。[DNK] 删除 `proxied` 推断；HTML 模式固定显示静态投影说明（改写 `hintUnproxiedHtml` 中英文案）。skill `routes.md`、`recovery-playbook.md` 删去 `/res`，改为「看样式用默认的引擎渲染」。

HTML 模式下本地 http 站缺样式成为确定行为。以后若要 HTML 模式完整显示这类站点，只能另开问答走「按对象经沙箱网络取资源」，并接受改约与镜像改造。DNK01 的 F 系列与历史证据不回改。

验收：单测（`/dom` 保留真实地址、`/res` 不在路由表、命中隧道域的 `/open` 带 hint 且状态码不变）加 S4 真机两行（HTML 模式开关、隧道 hint）。K-01、K-04 终态记「本期实现」。

#### `T-O-67` —— 一引用一页签，隐藏即停

> **来源**：`Round 4 / Q52，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`Q54`

**[DNK] 引用页签：一引用一页签、锁定对象、隐藏即停轮询。[DNLS] 投影只读 `drivers`。**

- 一个 `dsh-resource://sandbox/<envId>/<sandboxId>` 对应一个页签。身份即地址（宿主规则）。同一引用再次打开回到原页签。
- 引用页签只服务该对象，不提供换对象。
- `kitesurf` 页类型保留空选择器、不自动选中（`T-O-38`）。选择器把 `drivers` 不含 `cdp` 的对象显示为不可选并说明原因。
- [DNLS] `sandbox.list` 与 `sandbox.inspect` 的行增加只读 `drivers: string[]`，取自该对象 profile 清单的 `capabilities.drivers`。只读、不授权、不表示对象当前可用。按 `T-O-50` 属 major 内只读增量。`T-O-64` 列表工具同源投影。
- [DNK] `Pane` 读宿主给的 `tab.navigation.address` 与 `tab.visible`。有地址时：`/contract` → 定向读取对象行 → 核对 `envId`、`sandboxId` 与 `drivers` 含 `cdp` → 通过后等价一次 `choose(sandboxId)`。失败按原因显示（不存在或不可见、env 不符、无浏览器驱动），不回落到其他对象。
- `tab.visible` 为假时停止 `/status`、`/shot`、`/dom`、`/control` 等全部定时请求。恢复可见时立即刷新一次。保留 `keepMounted`。浏览器整体隐藏的判断照旧。

不新增错误枚举、路由或 lane。页签标题核实前显示短 ID、核实后显示对象名。不处理无 session 的入口（`XB-5`，宿主依赖）。仓内只有一个 profile 清单，`drivers` 今天对所有对象同值；其区分价值在第二个 profile 出现时体现。[业主] 接受这一前置投影。

验收：单测（同一引用二次打开不新增页签、两个引用两个页签、`drivers` 不含 `cdp` 时显示原因且不发对象请求、不可见时无定时请求而恢复可见刷新一次、以及 `T-O-61` 已列的零/一/多候选与核实失败不改投）加 S4 真机（同一引用复用、引用页签与空选择器页签并存、切走后停止请求），记入 `T-O-60` 台账。「两个引用两个页签」只登记为软件回归证据。

#### `T-O-68` —— 失败体只有 errorId、error、hint

> **来源**：`Round 4 / Q53，[业主] 同意全部推荐（A）` ｜ **驱动后续**：`无`
> **改判**：澄清 `DNK01 T-O-1`「返回与 REST 同 `errorId`/`hint`」在受管宿主上的落点（DNK01 侧只留指针）

**受管失败投影白名单。** 对象页内核产生的失败（已通过授权与代次核验、处理器已执行、状态码 ≥ 400）投影为 `{ok:false, errorId, error?, hint?}`：

- `error` 为内核原因文本，截至 240 字符（与操作行同一上限）。
- `hint` 原样。
- 不含其他键。仍经 `redact`。

授权、可见性、代次、准入、合同版本等派发前失败只返回状态码与 `errorId`。HTTP、`/mcp`（`isError`）与 `T-O-64` 模型工具同一投影（`T-O-50` 同义）。

[DNK] 请求层把 `hint` 挂到错误对象上。打开失败对话框显示宿主给出的 `hint`。删除 `engineLog` 死分支、自带的 loopback 判断与 `openErrorLoopback` 文案。

不改错误枚举、状态码、成功体与 `/operations` 行。`object-pages.js` 只改失败分支，不改成功分支与派发前的 `fail()`。skill 排障表按 `errorId` 加 `hint` 编写，不承诺每个失败都带 `hint`。提示词约束不变（`T-O-62`）。K-05 终态记「本期实现」。收口台账该行更正「`engineLog`」的表述，不回改 todo 原文。

验收：单测（内核失败带 `error`、`hint` 且无其他键；超长 `error` 截断；派发前失败只有 `errorId`；三入口一致）加 S4 真机（打开容器内不可达的 localhost 地址，pane 与 agent 看到同一 hint），记入 K-05 行与 `DNK01 T-O-1` 行。

### 2.5 管理页、生产切换、收口交接

#### `T-O-69` —— P2 只评 HEAD 外壳线，外壳退回 [DNLS]

> **来源**：`Round 5 / Q54，[业主] 同意本轮全部推荐（A）` ｜ **驱动后续**：`无`

**W3 管理页 P2：HEAD 外壳线为唯一候选，外壳退回 [DNLS] 并登记豁免，S4 现场截图交 [业主] 裁决。**

- P2 的唯一候选是分支 HEAD `77e217e` 的管理页线。`2ba1d4a` 不再参评。
- S1 在此基础上完成管理页，并接上 `T-O-59`（终端坞的可用行）、`T-O-61`（按 `candidates` 列出打开动作，替代 `openKitesurf` 与私有 kind 判断）、`T-O-67`（`drivers`）。
- 外壳（`WorkbenchShell`、`StatusDock` 等）从 `packages/dsh-nano-ui/src/shell.js` 移回 [DNLS] client。nano-ui `index.js` 删除这些导出。DESIGN §6 删除该行。§10 为每处自绘控件登记一行 `nano-ui-exempt`。`check-ui-rules` 的 U10 条数与 §10 相等。已使用宿主 `Button` 的地方不变。
- S4 现场、同一对象、同一已核 SHA 的制品上取 8 张截图：总览（深色、浅色）、对象监控、服务与终端坞（含交接入口）、设置弹窗、最近操作回执、390 px 总览、390 px 设置。文件名 `p2-<视图>-<dark|light|390>.png`，存 `.anote/reviews/dsh-nano-local-sandbox/DNLS03/`。每张标明对应的参考行，并记录页面实际加载的 client SHA-256。不截会话内容。
- [业主] 的结论只写在 P2 行一处。不通过时，S5 只改 [DNLS] client，重装 [DNLS] 并重启开发 Web（`T-O-65` ④），不换镜像、不清场、不新建对象，只重取受影响的截图、复跑受影响的 W3 行。返工轮次不设上限，每轮由 [业主] 裁决。返工不涉及 agent 场景时不发模型消息。
- W3 完成 = P4 真机行通过 + P2 获 [业主] 通过。e2e 通过不代替设计通过（`T-O-65`）。

参考原图登记为三张（补登 `03.png`）。原图仍只在主工作区 `.temp/`，不入库。对照清单 = redesign todo「P2 对照」一节的原图行，加「当前开发站」一节中 [业主] 指定的四行参考（`cli-interface.jpg`、`context-mgmt.png`、`model-selection.jpg`、`.temp/01.png`），再加补登的 `03.png`。清单随 P2 行迁入 todo 补充阶段一节（`T-O-71`）。「当前开发站：`2ba1d4a`」一节的实测、SHA 与截图转为历史记录（参考行沿用、实测转历史，R-6）。

不为凑第二个使用方改 [DNK]。以后若要共用外壳，另开问答：先改 DESIGN，再迁移 [DNK]，并让 [DNK] 过设计裁决。nano-ui 导出删除后，打包了 nano-ui 的 [DNK] `lib/client.js` 随 S1 重建而变化，属预期。不扩大 `T-O-65` 的授权。

#### `T-O-70` —— S6 只切生产 web，桌面推迟

> **来源**：`Round 5 / Q55，[业主] 同意本轮全部推荐（A）` ｜ **驱动后续**：`无`

**K-07 web 生产同批切换（S6）。** 本期增设 S6，只针对 `~/.dsh` 的 web profile，在分支合入 main 并在 main 上验证之后执行。本条就是 `T-O-65`「生产部署另请 [业主]」的那次另请。`T-O-65` 的开发站范围与 S1–S5 内容不变。S6 只由本条定义。

[业主] 签收 A 即授权：

1. 以合并提交重建三包 tarball。SHA-256 与 S5 最终候选逐一比对，一致才使用，不一致即停。「S5 最终候选」指最后一次复跑所用的三包，含合入 main 前因再并 main 而触发的重建。比对不一致即停，不放宽。
2. 把 `~/.dsh/plugins/` 下三包的当前目录复制到该目录之外的临时位置，作为唯一回滚来源。切换成功后删除。
3. 核对容器 `kitesurf` 的 ID、镜像与挂载后，停止并删除它。永久删除 `~/.dsh/nano-local-sandbox/state/kitesurf/`（含 `kitesurf/kitesurf`）。不备份、不迁移。并确认状态根内已无其他条目。
4. 一次 `dsh plugin --profile web add` 三个 tarball。重启生产 Web 一次。
5. 只读验收：profile 的依赖与 bundles 含三包；`GET /nano-local-sandbox/contract` 响应头与正文均为 `dnls.control/1`；页面实际加载的三份 client 与 tarball 字节一致；已挂载 session 的右栏出现「沙箱」页签且总览为空；[DNK] 页签打开后为空选择器。
6. 验收失败时以留存目录重装旧三包并重启。生产回到旧组合。旧对象数据不可恢复。

桌面 `~/.dsh-desktop` 与容器 `kitesurf-desktop` 记为「[业主] 推迟」。以后执行时适用同一约束（三包同批、状态根先清），走 RELEASE「本地部署」一节。

不发模型消息。不在生产创建对象。不改宿主 pin。不动 `~/.dsh/nano-local-sandbox/term.audit`（在状态根之外）、桌面 profile、`kitesurf-lab-*` 实验容器与任何镜像。生产旧容器与桌面容器同属 `kitesurf-engine` 镜像族；S6 不删除任何镜像。

[DNK]、[DNT] `AGENTS.md`「前置」各加一行：需要提供 `dnls.control/1` 的 [DNLS]，不与旧 [DNLS] 混装。[DNLS] `AGENTS.md`「安装」加一行：与 [DNK]、[DNT] 同批安装，状态根有旧条目时先按本条清理。这是兼容事实，不是 release-gate，不进 `RELEASE.md` 的必跑项。

收口台账 K-07 拆为两行：web 记「本期实现」，附三包 SHA、切换 UTC、旧容器 ID 与删除核对结果；桌面记「[业主] 推迟」。S6 若因代码缺陷失败：先回滚生产，在同一工作树修复，再走一次合并（`T-O-71`）。切换窗口内生产 [DNK] 不可用、旧对象的浏览器状态永久丢失，属 [业主] 已接受的代价。

#### `T-O-71` —— 一份跟踪、一份终判、指针先写、主线先并入

> **来源**：`Round 5 / Q56，[业主] 同意本轮全部推荐（A）` ｜ **驱动后续**：`无`

**收口交接：一份跟踪、一份终判、指针先写、主线先并入。**

1. `todo.DNLS03.md` 新增「补充阶段 S1–S6」一节，作为唯一执行跟踪。扩展后的 [DNK] 收口台账（`T-O-60`）也在这一节。`todo.DNLS03.md` 的「当前追踪」改指这一节。redesign todo 冻结为历史，文首加一行指针。P2、P4 两行移入新节。旧行原文不改。
2. 沿用唯一的 `DNLS03-closure.md`。S1 把文首两段横幅换成一行「补充阶段进行中，见 todo 补充阶段一节」。收口时一次改写 §0 终判（按 S4、S5、S6 的结果）。其余各节保留为 `b3ad7e5` 快照的历史记录并在节首注明。不新建 closure 文件。
3. S1 当即写指针。[DNK] 七份旧文档文首各加一行，指向问答 [`DNLS03-extra-qna.md`](./DNLS03-extra-qna.md) §1 与收口台账。DNK01 台账的状态行与部署快照各追加一行，列出该问答对 DNK01 族的改判：`T-O-63`（`T-O-2/3`）、`T-O-64`（`T-O-1` 的 agent 侧落点）、`T-O-66`（`T-O-4/5/6`）、`T-O-68`（`T-O-1` 的失败投影）。不改 DNK01 旧真相原文。
4. S1 开头 `git merge --no-ff main` 一次。冲突只应出现在 `security/route-sensitivity.json`、`feature-contract.json`、`perf-binding-ids.md`，以仓内生成与检查脚本重建（`check-route-sensitivity`、`check-feature-contract` 0 漂移），不手改。三包 `npm test` 全绿后继续。不用 rebase。问答 [`DNLS03-extra-qna.md`](./DNLS03-extra-qna.md) 与补充计划随 S1 入库。合并提交只含 main 并入与账本重建；紧随其后的第一个普通提交含该问答与补充计划。
5. S5 与 P2 通过后，分支以 `--no-ff` 合入 main（提交信息沿用 `merge(dnls): …`）。在 main 上跑三包 `npm test` 与 `check-*`。以合并提交重建三包并比对 SHA-256（`T-O-70` 使用同一结果）。S6 完成后在 main 上一次回填 action plan §11 执行日志、todo 终态与 closure §0。随即删除工作树 `.agents/worktrees/dnls03-managed-sandbox-control` 与分支 `dnls03-managed-sandbox-control`。

每类信息只留一处：过程与证据在 todo，终判在 closure §0，合同在问答 §1。S1–S5 期间 main 若再前进，只在合入 main 之前再并一次；新提交触及三包、`packages/` 或 `profiles/` 时，重建并复跑受影响的行。合入 main 在主工作区进行时，不覆盖、不暂存、不清理主工作区的未提交改动与未跟踪文件；与本分支改动的路径重叠即停，请 [业主] 处理。不碰主工作区未跟踪的 `docs/specs/dsh-nano-3d-factory/` 与另一个工作树 `model-selector-fusion-v1`。不改 `T-O-60` 已定的台账列与终态集合，不改 S1–S5 的内容。closure 改写后，`b3ad7e5` 的 No-Go 判定只能从 git 历史读到，属 [业主] 已接受的代价。

## 3. 收口（必须有）

- 形成史文档（问答中场评估、修订历史、`XB-*` 取证）只作测量指针，不在本文产生新裁决。
- 本文没有新建 Truth-ID。
- 与 [`DNLS03-extra-qna.md`](./DNLS03-extra-qna.md) 冲突时以该问答为准。
- 下游 action-plan 不填写 Q/A，不修改本台账的规则句。补充计划 §2 CITE 本台账 17 条与 §4.4 的全部读法（对应问答 §11.3）；其中 S4 场景清单按 R-5、R-11 写定。
- 需要推翻时，回到原问答追加 supersession，再投影到本台账的对应行。

## 4. 启用的插件

> 只列触发成立的插件。未触发的已删。P5 未触发：收口审查没有改已锁定原文，读法合并记在 §4.4，不另立修正案。

### 4.1 P1 · 基线事实层（非 `T-O`，本台账只 CITE）

> 问答 §1.1 已登记、不产生 Truth-ID 的 `3e7a775` 测量。施工落地后不回改。下表只留一句话；出处一律是问答 §1.1 的对应行。

| 事实 ID | 一句话 | 出处 |
|---------|--------|------|
| `XB-1` | 三包没有源码互引；[DNK]、[DNT] 只经 `/nano-local-sandbox/*` 公共 HTTP/MCP 与宿主右栏资源寻址消费 [DNLS] | 问答 §1.1 |
| `XB-2` | 宿主只给浏览器一个主体：已认证浏览器与 API token 都是 `owner`；其他人走独立 kind | 问答 §1.1 |
| `XB-3` | 生产默认主体对 `terminal.*` 一律 `canUse=false`；该排除由 `b3ad7e5` 引入，`b7f3d34` 时 owner 仍可用 | 问答 §1.1 |
| `XB-4` | W1 在生产停在 `term.session.list`：终端坞显示「共享身份下终端不可用」，`openTerm` 从未执行；正向全链只在夹具主体下通过 | 问答 §1.1 |
| `XB-5` | `openTab` / `openResource` 与 [DNLS] 页签都要求已挂载 session；`/sandbox` 未交付 | 问答 §1.1 |
| `XB-6` | [DNLS] 只 `openTab('kitesurf')` 且不带目标；[DNK] `Pane` 不读导航参数 | 问答 §1.1 |
| `XB-7` | `DNK01 T-O-1/2/3/6` 未实施：无 `sandbox.open`；relay 不读 control；`controlSnapshot` 无 `relay` | 问答 §1.1 |
| `XB-8` | [DNK] skill 未受管化：Step 0 不带 `sandboxId`，仍写 session 记录与 `suspend` | 问答 §1.1 |
| `XB-9` | 现有验收脚本不选对象、不带合同头；[DNK] `scripts/` 内 `sandboxId` 命中为 0 | 问答 §1.1 |
| `XB-10` | [DNK] 开放项散在七份文档且互相矛盾；普查约 70 项里约三分之一已作废、约三分之一已完成 | 问答 §1.1 |
| `XB-11` | 取证时 P2 待设计裁决、P4 未完成；`dnls03-dev` 与 `dnls03-ui-check` 的卷仍在 | 问答 §1.1 |
| `XB-12` | 同一 owner 已能经 [DNT] 本地 lane 在 macOS 宿主上直接起 PTY | 问答 §1.1 |
| `XB-13` | 单包测试全绿（[DNLS] 468/468、[DNK] 52/52、[DNT] 272/272）但不跨包；没有一条测试跨越真实宿主走完 W1/W2 的跨包链路 | 问答 §1.1 |
| `XB-14` | 两处交接写死私有 kind：`openTab('kitesurf')`，以及 `candidates[0]?.kind === 'dnt-sandbox-terminal'` | 问答 §1.1 |
| `XB-15` | 宿主已有 `openResource`（按 glob / `canOpen` / 优先级）与带参数的 `openTab`；处理方从页签 `navigation` 读取 | 问答 §1.1 |
| `XB-16` | 受管前脚本仍接在 `test:e2e`、`npm test` 与 `RELEASE.md` 上 | 问答 §1.1 |
| `XB-17` | 开发站从未向测试 session 发送模型消息；[DNK] skill 却是写给 session 内 agent 的 | 问答 §1.1 |
| `XB-18` | 宿主 CDP 与 agent 的 `agent-browser --cdp` 走同一个 `/cdp` relay；握手只看 Origin，缺 Origin 放行 | 问答 §1.1 |
| `XB-19` | 接管豁免比较自报 `clientInfo.name`；`POST /control` 的 `owner` 缺省为 `'human'`；另有 `container exec` 可信写入通道 | 问答 §1.1 |
| `XB-20` | session 内 agent 没有可用入口：无 cookie 的 shell 得 401；[DNLS] 不注入 `tools`；宿主 `commands` 不送模型 | 问答 §1.1 |
| `XB-21` | 写判据只有 MCP 工具名正则；`DNK01 T-O-3` 点名的方法不是全部会改页面的 CDP 方法 | 问答 §1.1 |
| `XB-22` | 桥在镜像配方内；开发站两个名额已被占满；清场顺序已写，缺具体处置授权 | 问答 §1.1 |
| `XB-23` | `/res` 在生产不运行，代码与登记仍散在九处；代理对目标主机不设限 | 问答 §1.1 |
| `XB-24` | HTML 模式是显式开关；受管 `/dom` 保留真实地址；`proxied` 恒为假；隧道 hint 无实现 | 问答 §1.1 |
| `XB-25` | 宿主以地址为资源页签身份；[DNK] `keepMounted` 且不读 `tab.visible`，隐藏页签仍定时请求 | 问答 §1.1 |
| `XB-26` | 能否做设计的唯一判据是 profile 清单 `capabilities.drivers` 含 `cdp`；投影不给出 driver；仓内只有 `kitesurf` 一个清单 | 问答 §1.1 |
| `XB-27` | 受管失败体只留 `errorId`；`engineLog` 分支已死；[DNK] 另有一份重复的 loopback 判断 | 问答 §1.1 |
| `XB-28` | 管理页有两条线：开发站取证的是 `2ba1d4a`；`2959dc7` 删除页签后 `77e217e` 用 nano-ui 外壳重建，未部署 | 问答 §1.1 |
| `XB-29` | 新外壳的仓内唯一使用方是 [DNLS]；参考原图有三张，redesign todo 只登记两张 | 问答 §1.1 |
| `XB-30` | 生产 web 与桌面都还是旧 [DNLS] 加 kitesurf 线 [DNK]；合并态双向不兼容；生产状态根有旧目录且无 `registry.json` | 问答 §1.1 |
| `XB-31` | 同一阶段的状态写在 closure、`todo.DNLS03.md`、redesign todo 三处；分支相对 main 双向分叉，三份账本两边都改过 | 问答 §1.1 |
| `XB-32` | 现场对象与 S3、S6 的授权一一对应；生产、桌面与开发对象共用 `kitesurf-engine` 镜像族，镜像存储本机共享 | 问答 §1.1 |
| `XB-33` | 内核失败体另带 `incidentId`，受管投影只留 `errorId`；对象页打开由宿主类连接执行，桥侧接管闸不拦它 | 问答 §1.1 |

> **裁决效力点名**：`XB-5` 是无 session 入口的宿主依赖，被 `T-O-61` / `T-O-67` 点名。`XB-32` 是 S6 不删镜像的测量依据。`XB-33` 是 R-10、R-11 的测量依据。其余是 `3e7a775` 的缺口或现状，不得当目标态，不得用来重开已关闭的选项。

### 4.2 P2 · 权威次序

[`DNLS03-extra-qna.md`](./DNLS03-extra-qna.md)（decision provenance）> **本台账（投影面）** > DNLS03 补充计划（只 CITE）> ImplementationGrant。不一致时回到问答修订本台账，不得反向改问答。

未被问答点名的 `DNLS03 T-O-33`–`T-O-43`、`T-O-45`–`T-O-50`、`T-O-53` 继续有效。`DNK01 T-O-1`–`T-O-6` 均已被点名，关系见 §4.3。点名改判的读法以问答对应条目为准，上游正文保持不动。`XB-*` 是测量，不是 [业主] 真相。`QNA_FROZEN` ≠ 代码 PASS，也 ≠ S4/S6 已执行。

同一问答内部，后冻结的条目关闭前条留下的未决句，但不改前条原文：`T-O-65` / `T-O-70` 关闭 `T-O-55` 的顺序；`T-O-66` 关闭 `T-O-58` 的 K-01；`T-O-67` 关闭 `T-O-61` 留下的页签与设计能力两点。冲突时按 §4.4，不按 Q46 解读、推荐或执行说明里的「下拉切换」举例。

### 4.3 P3 · 与上游真相的关系

| 上游 ID | 关系 | 回改上游正文 |
|---------|------|----------------|
| `DNLS03 T-O-33`–`T-O-43`、`T-O-45`–`T-O-50`、`T-O-53` | 只消费；未被本册点名 | 否 |
| `DNLS03 T-O-44/52` | 澄清式 append：`T-O-59` 允许 owner 持有并附着自己的沙箱终端；「不是多用户证明 / `peer.id` 不是持久归属」保留；「一律不得使用 `terminal.*`」撤回 | 否 |
| `DNLS03 T-O-51` 所含 Q40 A 第 3 项 | 澄清式 append：`T-O-61` 把经宿主导航收到的明确对象引用视为用户的明确选择；[DNK] 仍不与 [DNLS] 共享选择状态 | 否 |
| `DNLS03 T-O-54` | 只补齐实施：`T-O-61` 去掉私有 kind；原文不改 | 否 |
| `DNK01 T-O-1` | 落执行面：`T-O-64` 为 agent 侧模型工具；`T-O-68` 为受管失败投影；接管拒绝的执行点见 R-11 | 否 |
| `DNK01 T-O-2/3` | 澄清式 append：`T-O-63` 代次宿主凭据、读白名单、`relay.conns` 只计 agent 类 | 否 |
| `DNK01 T-O-4` | 收窄：`T-O-66` 退役「改写到同源代理」与「path 镜像」两句；追加「HTML 投影保留真实地址」 | 否 |
| `DNK01 T-O-5` | 整条退役（`T-O-66`） | 否 |
| `DNK01 T-O-6` | 收窄：`/res` 与 `res.public-tunnel` 退役；`/open` 隧道 hint 保留（`T-O-66`） | 否 |
| todo.DNLS03 的「`/res` 的本次处置」 | 由 `T-O-66` 取代 | 否（todo 原文不回改；新节另记） |
| redesign todo 的「当前开发站」实测、P2/P4 行；closure 文首横幅；todo 的「当前追踪」 | `T-O-69` / `T-O-71`：实测转历史，P2/P4 迁入补充阶段，横幅与指针按 `T-O-71` 改 | 否（旧行原文不改） |

> 默认不回改上游正文。DNK01 侧只在 S1 追加指针（`T-O-71` ③）。

### 4.4 P4 · 冻结审计注记（append-only，不改内核原句）

> 注记 ID 沿用问答 §11.3 的 `R-1`–`R-12`。不另编。下面只保留会把旧句读错的形态。

> `R-1`：现场授权来源一律读作 `T-O-65`（开发站）与 `T-O-70`（生产 web）。不得只读 `T-O-65`。

> `R-2`：`T-O-65`「不含生产」与 `T-O-70` 不冲突。`T-O-70` 就是那次另请。S1–S5 仍只覆盖开发站；S6 只由 `T-O-70` 定义。

> `R-3`：`T-O-55`「先后顺序待本册裁定」已关闭。现行顺序是 `T-O-65` 的 S1–S5（场景 W1 → W2 → W3）加 `T-O-70` 的 S6。`T-O-55` 原行不改。

> `R-4`：`T-O-58`「K-01 仍须裁决」已关闭。`T-O-66` 彻底退役 `/res`；K-01、K-04 终态为「本期实现」。`T-O-58` 原行不改。过渡态仍然不是终态。

> `R-5`：引用页签不提供换对象，以 `T-O-67` 为准。Q46 解读、推荐与执行说明里的「下拉切到另一对象」不是现行合同。`T-O-61` 台账行本无「切换」一句，不受影响。补充计划中 `T-O-61` 的真机行写为：工作台选中对象 → 在 Kitesurf 中打开 → 显示该对象 → 再次打开回到原页签；引用页签与空选择器页签并存。与 `T-O-67` 的真机行合并登记。「两个引用两个页签」只作软件回归证据（S3 只有一个对象）。

> `R-6`：P2 对照清单沿用 redesign todo 的参考行，包括 [业主] 指定的四行；「当前开发站：`2ba1d4a`」的实测、SHA 与截图转为历史，不再当候选。

> `R-7`：`T-O-70` 的 SHA-256 基准是最后一次复跑所用的三包。合入 main 前若再并 main 并因此重建，基准跟着移动；比对不一致即停，不放宽。

> `R-8`：S1 的合并提交只含 main 并入与账本重建。问答 [`DNLS03-extra-qna.md`](./DNLS03-extra-qna.md) 与补充计划在紧随其后的第一个普通提交。不得读成「合并提交携带该问答」。

> `R-9`：合入 main 时不覆盖、不暂存、不清理主工作区未提交改动与未跟踪文件。路径重叠即停，请 [业主] 处理。

> `R-10`：`T-O-68`「不含其他键」会去掉内核失败体上的 `incidentId`。不改白名单。`incidentId` 仍记在操作行，经 `/operations` 查。S1 单测断言失败体中没有 `incidentId`。

> `R-11`：打开的接管拒绝不发生在桥上。模型工具与 `/mcp` 两个入口，由 [DNLS] 分派器在调用打开内核之前读取该对象的 `humanHold`；active 即以既有 `kitesurf.control.held` 拒绝，属派发前失败，按 `T-O-68` 只给 `errorId`；读取失败按既有 `control.bridge` 失败关闭。HTTP `/open`（pane）不受接管约束。不新增 errorId、路由或 lane。S1 单测覆盖三个入口在接管中的差异；S4 的 agent 接管场景同时验证打开工具被拒。

> `R-12`：S6 不删除任何镜像。生产旧容器、桌面容器与开发对象同属 `kitesurf-engine` 镜像族，镜像存储本机共享。

### 4.5 P6 · 残项、不得重开、授权边界

- **残项**：
  1. K-07 桌面 profile 与 `kitesurf-desktop` 记为「[业主] 推迟」（`T-O-70`）。以后执行适用同一约束：三包同批、状态根先清。
  2. 宿主依赖，不在插件内推断：无 session 的正式页签入口（`XB-5`）；区分 API token 客户端是否应附着终端（`T-O-59`）；非 owner 主体驱动回合时的工具限制（`T-O-64`，S1 核实，核实不了即登记）。
  3. 模型消息 20 条是建议上限。场景清单定稿后明显不足，须在补充计划提出并由 [业主] 批准，不得自行加码。
  4. P2 的通过与否只由 [业主] 看 S4 截图裁决。返工轮次不设上限，但不扩大 `T-O-65` 的授权。
- **残项是否阻塞当前出口**：`NO`（[真相层] 已冻结，OPEN 为 0）。桌面推迟不阻塞 web 的 S6。宿主依赖不阻塞本台账，也不把已冻结条目退回 OPEN：无 session 入口不在本期；API token 客户端是否另辨，只在需要区分时登记；非 `owner` 主体的工具限制在 S1 核实，核实不了即登记。都不在插件内推断。
- **不得重开**：Q44–Q56 的未选中项（维持终端全拒、插件自签身份、七份旧文档各写一份、只修活缺陷、页签参数私约、维持重选、只做用户面、改写旧脚本当验收、自报名或独立路径区分连接、不区分连接并在接管期间一律拒写且把 pane 的写改走其他通道、复制 relay 地址、给 agent API token、分工作流各自部署、先完成 P2 设计裁决再动 W1/W2、先裁 `2ba1d4a`、把 P2 移出本期、把 `/res` 改成 `dnls.control/1` 之外只做准入的宿主路由、单页签且新引用替换内容、不核实设计能力并保留换对象下拉与原轮询、失败体维持只有 `errorId`、整份失败体按成功体删除表放行、生产继续旧组合、旧路由回落、删除 closure、另建 closure）；`/res` 与 HTML 代理改写；私有 kind；新错误枚举、lane、路由；release-gate；为凑第二个使用方把外壳留在 nano-ui；把 `incidentId` 加回失败体；在桥上拦截宿主类打开。不得把「按对象经沙箱网络取资源」写成本期选项；`T-O-66` 只说以后若要 HTML 模式完整显示本地 http 站，须另开问答。
- **仍然不授权**：本台账本身；超出 `T-O-65` 五类与 `T-O-70` 六类的部署、清场、删对象、删卷、模型消息、生产创建对象、宿主 pin、其他 profile、删镜像、桌面切换、第二次清场。那些动作逐项另请 [业主]。

## 修订

| 版本 | 日期 | 变更 |
|------|------|------|
| `0.1.0` | 2026-11-20 | 首版：从已冻结的 `DNLS03-extra-qna.md`（v1.0）投影 `T-O-55`–`T-O-71`；启用 P1/P2/P3/P4/P6；R-1–R-12 只作读法，不改内核原句 |
| `0.1.1` | 2026-11-20 | 三路对抗审查后修订投影：删掉写进 `T-O-60/62/65` 内核的后文回指；`T-O-61` 未决句恢复「留 executional 轮」；「本册」在指针与入库句改回问答文件；R-5 改回补充计划真机行；总表补上 S5 复跑；`XB-1`/`XB-13` 收回被写窄或写绝的测量句；`NOT CLAIMED` 不再带例外；宿主依赖不退回 OPEN；落选项按题补全。未改问答，未新建 Truth-ID |
| `0.1.2` | 2026-11-21 | §1 表后加覆盖指针，指向问答 §13（[业主] 撤销合并与发布前门禁）。未改旧行，未新建 Truth-ID |
