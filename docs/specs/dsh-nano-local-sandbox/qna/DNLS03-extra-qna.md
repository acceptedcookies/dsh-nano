# DNLS03-extra QNA · [DNT] 实际对接 / [DNK] 收口 / [DNLS] 工作台与实机 agentic e2e 补充决策册

> **范围（scope）**：在 `DNLS03` 已冻结合同（`T-O-33`–`T-O-54`）之上，锁定三项合并工作的顺序、工作基础与执行细节：W1 [DNT] 在 [DNLS] 内的实际对接；W2 [DNK] 未尽事宜与 closure 彻底关闭；W3 [DNLS] dashboard + control UI 的未完成开发及 ego-browser 真机 agentic e2e。本文记录决定，不是实施计划。
> **QNA 位点**：`deep-dive`（补充册），先 foundational（2 轮 × 2 题），再 executional（每轮 3 题，直至执行层冻结）；台账子类型记为 `foundational` / `execution`。
> **角色配置**：提问 `DNLS03 架构审查`；裁决 `[业主]`。second-opinion 自 Round 1 起 `retired`，不设答复槽。
> **下游消费者**：全部轮次收口后，撰写「DNLS03 补充计划」append 至 [DNLS03 action-plan](../plan/DNLS03-managed-sandbox-control.md)，并更新 [todo.DNLS03](../plan/todo.DNLS03.md)；收口前不输出正式计划。
> **文档状态**：`frozen`（2026-11-20）；Round 1（Q44–Q45）已冻结为 `T-O-59`/`T-O-60`；Round 2（Q46–Q47）已冻结为 `T-O-61`/`T-O-62`，foundational 收束；Round 3（Q48–Q50，首轮 executional）已冻结为 `T-O-63`–`T-O-65`；Round 4（Q51–Q53）已冻结为 `T-O-66`–`T-O-68`；Round 5（Q54–Q56）已冻结为 `T-O-69`–`T-O-71`；收口审查完成（§11），执行层冻结，**本册 `frozen`**。
> **取证快照**：工作树 `.agents/worktrees/dnls03-managed-sandbox-control`，分支 `dnls03-managed-sandbox-control@3e7a775`（2026-11-20）；宿主 pin `.dependencies/pinned/deepseek-harness`＝`0.2.2-rc.5@9c2670d3`（`context/deepseek-harness` 为 `0.2.2-rc.2`，本册引用的接口两份行号一致）。以下是源码、git 历史与既有测试断言的核查，不是新做的容器实测。

## 0. 分轮状态总览

| 轮次 | 题号区间 | 焦点 | second-opinion | 状态 |
|---|---|---|---|---|
| Round 0（开轮基线） | — | 阶段归类、三项工作、上游真相与并线现状 | — | 已登记，`T-O-55`–`T-O-58` |
| Round 1 | Q44–Q45 | foundational：终端主体是否成立；[DNK] 收口以什么为真源 | `retired` | 已冻结，`T-O-59`–`T-O-60` |
| Round 2 | Q46–Q47 | foundational：跨插件对象交接合同；真机 agentic e2e 的判据与旧脚本去留 | `retired` | 已冻结，`T-O-61`–`T-O-62` |
| Round 3 | Q48–Q50 | executional：relay 写闸怎样认出 agent；session 内 agent 的受管入口；施工顺序与开发站授权 | `retired` | 已冻结，`T-O-63`–`T-O-65` |
| Round 4 | Q51–Q53 | executional：`/res` 去留与隧道 hint；[DNK] 引用页签的复用、设计能力核实与隐藏时轮询；受管失败体投影 | `retired` | 已冻结，`T-O-66`–`T-O-68` |
| Round 5 | Q54–Q56 | executional：W3 管理页 P2 的候选线与裁决证据；K-07 生产同批切换与旧对象处置；收口交接（跟踪、closure、指针、合并与工作树） | `retired` | 已冻结，`T-O-69`–`T-O-71` |
| 收口审查 | — | 全册一致性：冲突、竞态、欠登记、欠更新（R-1–R-12） | — | 已完成，执行层冻结，见 §11 |

题号、Truth-ID 分别承接 [DNLS03 收口：647–660](./DNLS03-qna.md#L647-L660) 的 `Q43`、`T-O-54`，不重用编号。[DNK01] 的 `T-O-1`–`T-O-6` 属另一插件族编号（[DNK01 台账 §0.8](../../dsh-nano-kitesurf/qna/DNK01-1120-qna-truth.md#L24)），本册引用时一律写作 `DNK01 T-O-x`。按 [业主] 指定节奏：foundational 共两轮、每轮两题；之后 executional 每轮三题，直到执行层冻结。此处只列已提出的题；**当轮全部裁决入账 → 中场评估 → 重新检索与推理 → 才能提出下一轮**。

## 1. ★ Truth-Gate 台账（已锁定真值 · NORMATIVE · append-only）

| Truth-ID | 子类型 | 已锁定真相 | 来源（Round / Q） | 驱动了哪些题 | 下游约束 |
|---|---|---|---|---|---|
| `T-O-55` | `foundational` | 本补充工作集仍归类 `DNLS03`，在工作树 `.agents/worktrees/dnls03-managed-sandbox-control` 内进行，合并三项工作：**W1** [DNT] 在 [DNLS] 内的实际对接（对应真源、协议层确认、测试）；**W2** [DNK] 的未尽事宜、closure 的彻底关闭、真机实验；**W3** [DNLS] 未完成的开发（dashboard + control UI），并完成 ego-browser 的真机 agentic e2e 测试。 | 开轮基线 / [业主] 本次阶段指令 | Q44、Q45、Q47、Q50、Q54、Q56 | 不另立阶段名或计划文件；正式计划 append 至 DNLS03 action-plan 并更新对应 todo；三项工作的先后顺序待本册裁定，不由实现顺序反推。 |
| `T-O-56` | `foundational` | [业主] 对 W1 的目标：在 [dsh工作台] 内，从 [DNLS] 选中的 sandbox 唤起该 sandbox 的 [DNT] 终端。 | 开轮基线 / [业主] 前序指令（三包联合普查的发车要求） | Q44、Q46 | W1 的完成以真实宿主中该链路可用为准，不以夹具通过或拒绝分支正确代替；手段仍受 `T-O-54` 公开资源交接与「不得侧载」约束。 |
| `T-O-57` | `foundational` | `DNLS03 T-O-33`–`T-O-54` 与 `DNK01 T-O-1`–`T-O-6` 仍为现行合同。本册只以逐条 append supersession 局部改判；未被点名的条目不重开。 | 开轮基线 / [业主]「沿用 DNLS03 作为工作阶段的归类」 | Q44、Q45、Q46、Q48、Q49、Q51、Q53、Q56 | 改判须写明被替代的原句与替代范围；不在下游文档里改写旧真相；DNK01 族的改判在本册登记，并在 DNK01 侧只留指针，不形成第二份登记。 |
| `T-O-58` | `foundational` | `kitesurf-http-render` 已由 `3e7a775` 并入本工作树并退役（分支已删）；受管宿主上 `/res` 失败关闭、`/dom` 不改写到代理是现行过渡态；[todo.DNLS03 §7](../plan/todo.DNLS03.md#L122-L134) 的 K-01–K-07 是本册输入，不是已裁结论。 | 开轮基线 / [业主] 同意并线评估的全部推荐（含 `/res` 方案 c） | Q45、Q51、Q55 | K-01（`/res` 归属）仍须 [业主] 裁决；过渡态不得被当作 `DNK01 T-O-4/5` 的最终兑现。 |
| `T-O-59` | `foundational` | **宿主 `owner` 是本机唯一用户的稳定主体（键 `owner`）**：可按 `T-O-42/54` 创建、列出、附着、读写、调整、关闭 `principalKey` 为 `owner` 且代次匹配的 [DNLS] 沙箱终端；它不是其他主体终端的通配授权，非 `owner` kind 得不到主体、仍 403。对 `DNLS03 T-O-44/52` 作澄清式 append supersession：保留「共享 browser owner 不是多用户证明；临时 `peer.id` 不是持久归属」原句；撤回「共享 owner 一律不得使用 `terminal.*`」这一由 `b3ad7e5` 引入、无 [业主] 裁决的实现读法。 | Round 1 / Q44，[业主] 同意全部推荐（A） | Q46、Q47、Q49 | 硬切 `resolveOwnerPrincipal`，不留拒绝开关；保留 `authorize` 的归属与代次校验、upgrade 前再次 admission、撤权即 detach 不杀 PTY；同切 [DNLS] `AGENTS.md:96` 与 journey 断言（owner 通过、非 owner kind 被拒，注明两个标签页不是跨用户证明）；不新增错误枚举、凭证、lane 或路由；W1 以 `dsh-dev` 上 `T-O-39` 辨真流程验收；若须区分 API token 客户端，登记为宿主依赖，不在插件内推断。 |
| `T-O-60` | `foundational` | **[DNK] 收口的唯一现状真源是由 [todo.DNLS03 §7](../plan/todo.DNLS03.md#L122) 扩展的「[DNK] 收口台账」**：行 = 原编号（`G`/`L`/`V`/`E`/`F`/`X`/`D`）+ `DNK01 T-O-1`–`T-O-6` + K-01–K-07 + 普查新发现；列 = 执行方、终态、证据；终态 ∈ {已完成、已作废（引 `T-O`）、本期实现、[业主] 推迟}，任何行不得停在「开放」。七份旧文档冻结为历史，只在文首加一行指针；`DNK01` 台账的状态行与部署快照只追加指针。 | Round 1 / Q45，[业主] 同意全部推荐（A） | Q46、Q47、Q48、Q50、Q51、Q52、Q53、Q55、Q56 | 内部行为以代码加测试关闭；用户或 agent 可见的行为（pane、skill、bridge 写闸、错误展示）另须在 `dsh-dev` 经显式选择对象的真机重放取证（K-06）；旧取证（E1–E15、`final-eval`、`e2e-ego` 27/27）不移用于合并态；受管前验收脚本在改写或退役前不算证据；普查分类只是初值，逐行复核；台账是 todo 不是闸门，不新增 release-gate；bridge 改动须重建镜像并对开发对象换代（K-03），授权与时机后续轮裁定；DNK01 族改判只在本册登记（`T-O-57`）。 |
| `T-O-61` | `foundational` | **[DNLS] 以公开对象引用交接所选 sandbox**：新增公开资源类型 `dsh-resource://sandbox/<envId>/<sandboxId>`，只标识**已存在**的受管 sandbox；ID 的校验与编码同 `T-O-54`（env tag 与 UUID 各占一个路径段）；不编码主机 URL、session、profile、服务、命令或 token；不承诺跨主机可用；引用不授予权限，每个对象请求仍按 `sandboxId` 单独核权。[DNLS] 用宿主 `candidates(address)` 列出「在〈处理器标题〉中打开」，经 `openResource` 交接，不写任何消费者 kind。对 `DNLS03 T-O-51` 所含 Q40 A 第 3 项作澄清式 append supersession：[DNK] 不与 [DNLS] 共享选择状态，也不从 [DNLS] 推断默认对象；经宿主导航收到的明确对象引用，视为用户的明确选择（`T-O-38`）。`T-O-54` 原文不改，只补齐其中「不固定私有 kind」的实施。 | Round 2 / Q46，[业主] 同意全部推荐（A） | Q49、Q50、Q52、Q54 | 硬切 [DNLS] 的 `kitesurf()`、`openKitesurf`、`openWorkspaceHint`、`workspaceMissing` 与 `'dnt-sandbox-terminal'` 判断，不留旧分支；对象地址的构造与 `terminal-resource.js` 同模块、同一组校验；终端「打开」按 `candidates(终端地址)` 是否非空判断，无候选沿用 `T-O-54` 的「已创建未连接 / 明示不可用」。[DNK] 在现有注册上加 `patterns: ['dsh-resource://sandbox/**']` 与规范语法的 `canOpen`；页签 body 从 `navigation.address` 取引用，先 `GET /contract` 再定向 inspect，核对 `envId` 与 `sandboxId`，通过后等价一次 `choose(sandboxId)`；核实失败显示原因，不回落到其他对象。原 `kitesurf` 页类型与空选择器保留，仍不自动选中。不新增错误枚举、路由或 lane。「每个引用一个页签还是复用单页签」「body 内核实该对象的 profile 是否提供设计能力」留 executional 轮。验收：单测（地址语法；零、一、多候选；核实失败不改投）加 `dsh-dev` 真机重放，记入 `T-O-60` 收口台账。`openResource` 仍要求已挂载 session（宿主依赖，`XB-5`）。 |
| `T-O-62` | `foundational` | **W3「ego-browser 真机 agentic e2e」的定义**：在 `dsh-dev` rc.5 web profile 上，安装经 SHA-256 核对的候选并核对页面实际加载的 client 字节；在真实 session 的 [dsh工作台] 内，由两类操作者走完场景：① 执行者经 ego-browser 以用户手势操作；② session 内的 [dsh] agent 以真实模型回合，按 [DNK] skill 对显式选定的开发测试对象动手。判据看协议行为（是否带 `sandboxId`、是否遵守 `humanHold`、是否只写所选对象），不看措辞。受管前脚本整批退役，不改写，也不另立脚本化套件或 release-gate。 | Round 2 / Q47，[业主] 同意全部推荐（A） | Q48、Q49、Q50、Q53、Q54 | 场景 = `T-O-60` 台账中「用户或 agent 可见」的行 + W1（`T-O-59` 辨真流程）+ W3 管理页的行，写在 DNLS03 补充计划，结果回填 todo；证据沿用 `.anote/reviews/dsh-nano-local-sandbox/DNLS03/`，文档只记操作号、截图名、session 标识与结论，不贴会话正文、cookie 或 token；正反分支分开登记，软件回归与真机证据分开登记；提示词只给任务与对象名，不提示绕过方法；失败即台账行失败，不为迁就单次结果改写 skill。授权在 `dsh-dev` 向测试 session 发送 e2e 所需的模型消息，使用开发站已配置的宿主凭证，不新增凭证；次数与时机由 executional 轮定。删除 [DNK] `scripts/e2e-ego.mjs`、`eval-design-mode.mjs`、`eval-ego-vs-dnk.mjs`、`eval-proto-mcp.mjs`，删除 `package.json` 的 `test:e2e` 与 `test/e2e-script.test.mjs`，删除仓根 `scripts/gui-smoke-kitesurf.sh` 并改写 `RELEASE.md:97`；不留别名或兼容开关；[DNK] 包测试数下降属预期；历史文档中的引用不回改；`RELEASE.md` 不新增必跑项。本条不授权镜像重建、测试对象退役或擦卷。 |
| `T-O-63` | `execution` | **桥以代次宿主凭据认出 [DNLS] 宿主连接，其余 relay 与 MCP 连接一律按 agent 处理**：[DNLS] 在创建、启动、换代与宿主重启后采纳运行中对象时，为每一代次生成随机凭据，只经 `container exec`（root helper、stdin、`env -i`，与 `publishHealth` 同一模式）投放到容器内只有桥能读的位置；宿主的 relay 握手出示凭据，桥逐次比对，未出示当前代次凭据即为 agent 类。`humanHold.active` 时 agent 类只放行读方法白名单（`*.enable`/`*.disable`、`DOM.getDocument`/`querySelector*`/`describeNode`/`getBoxModel`、`CSS.getComputedStyleForNode`、`Accessibility.getFullAXTree`、`Page.captureScreenshot`、`Target.getTargets`/`attachToTarget`），其余方法（必含 `Page.navigate`、`Input.*`、`Runtime.evaluate`）以既有 `kitesurf.control.held` 拒绝；`POST /control` 与 `sandbox.control takeover` 只对宿主类生效；`clientInfo.name` 不再带来任何豁免；`relay.conns` 只计 agent 类连接。本条是对 `DNK01 T-O-2/3` 的澄清式 append（DNK01 侧只留指针，`T-O-57`）。[业主] 签收 A 即判定：该凭据不属于 `T-O-44/52` 所禁的「新票据、operator 密钥」。 | Round 3 / Q48，[业主] 同意全部推荐（A） | Q53 | 凭据不出现在任何 HTTP/MCP 响应、操作台账、审计、日志、截图或 skill；不跨对象；不授予任何主体任何权限，只证明「连接来自 [DNLS] 宿主进程」；投放失败时对象页不连 relay，沿用 503 失败关闭；被拒的写先记 `lastAction`、不更新 `lastAt`、不改 `writer`、不排队、不重放；agent 类调用 `takeover` 回 `kitesurf.control.query`，无凭据 `POST /control` 回 403；`controlSnapshot` 增 `relay: {conns, lastAt, lastMethod}`，`lastMethod` 只存方法名；不新增 errorId、路由或 lane；白名单随 agent-browser 升级复核，误拒只发生在接管期间；宿主以后提供容器侧调用方身份时改用宿主机制并退役本凭据。验收：单测（宿主类接管中写入成功、agent 类被拒且 `lastAt` 不变、自报 `human` 无效、无凭据 `POST /control` 403、白名单读放行、换代后旧凭据失效、凭据不入任何响应体）加 S4 真机 agent 场景，记入 `T-O-60` 台账 `DNK01 T-O-2/3` 行；镜像重建按 `T-O-65`。 |
| `T-O-64` | `execution` | **session 内 agent 的受管入口是 [DNLS] 注册的宿主模型工具**：[DNLS] 增加 `tools` inject，经 `tools.register` 注册四个模型工具（暂名：列表、状态、打开、接管状态），作为 `dnls.control/1` 能力在 HTTP、`/mcp` 之外的第三个入口，共用一个能力 owner 与分派器；主体由组合层显式提供「本宿主 session 内的 agent 工具调用 → owner」适配器（`T-O-59`），不从工具参数推断；对象工具必须带显式 `sandboxId`；结果经同一 `redact`。列表只给可见对象窄行，不替用户选择；状态给 phase、relay 地址 `cdp`、navigation、hints；打开（`sandboxId` + `url`）是 `DNK01 T-O-1` 在 agent 侧的落点，计入写、接管中拒绝；接管状态只读 `humanHold` 与 `relay` 两档。打开能力只登记一次，HTTP `/open`、`/mcp` 与工具共用一个打开内核。 | Round 3 / Q49，[业主] 同意全部推荐（A） | Q52、Q53 | 不提供生命周期写、终端、日志或进程工具；不新增处理逻辑、错误枚举、lane 或凭证。[DNK] skill 重写（改 `lib/skill.js` 与 `src/skill/`，`skills/` 由构建生成）：Step 0 为「列表 → 用户明确对象 → 状态」，relay 地址只从状态工具取，用户未指定对象就询问（只有一个候选也问，`T-O-38`），删除「实例按 session 记录」与 suspend/resume 旧语义，保留 held 即停写，`/nano-kite` 的生命周期改为指引用户在工作台操作，`references/*.md` 同步。工具 schema 与描述成为模型可见合同，改名须同步 skill。S1 须核实宿主对非 owner 主体（如 liveshare `share-viewer` 的 fork）驱动回合时的工具限制，核实不了即登记为宿主依赖，不在插件内推断。若以后要 agent 执行生命周期，另行登记带 `requestId` 的工具。验收：单测（schema、缺 `sandboxId` 拒绝、不可见与不存在拒绝一致、`redact` 生效、接管中打开被拒、注册随卸载处置）加 S4 真机（列出 → 询问 → 对指定对象打开并经 relay 操作），记入 `T-O-60` 台账 skill 行与 `DNK01 T-O-1` 行。 |
| `T-O-65` | `execution` | **施工顺序与开发站授权**：代码先行；镜像只换一次、开发站只清场一次、完整真机重放只跑一次，失败行修复后复跑。S1 合同与代码（`T-O-59`、`T-O-61`、`T-O-62`、`T-O-63`、`T-O-64`、收口台账逐行终态初值）→ S2 经宿主 confine 用 `build-profile.mjs` 构建一次镜像与三包候选，记录镜像 digest 与三包 tarball SHA-256 → S3 严格按 [redesign todo:78](../plan/todo.DNLS03-control-redesign.md#L78) 清场并只新建一个对象 → S4 一次完整双操作者真机 e2e（场景按 W1 → W2 → W3）→ S5 只复跑失败行与受修复影响的行。授权仅限 `dsh-dev` rc.5 web profile：① 重建 kitesurf 镜像一次（同一阶段内修复构建失败后的重建计入同一授权）；② 退役并永久删除 `dnls03-dev`（`7ef19658-39c7-43e7-8dc8-d387a45a9d83`）与 `dnls03-ui-check`（`75bfac14-8cd4-4978-a101-32cb7115d988`）及各自精确的卷目录，不备份、不迁移；③ 从新镜像创建一个新测试对象；④ 按场景需要重启开发 Web 服务；⑤ 向一个专用测试 session 发送 e2e 模型消息：每个 agent 场景 1 条任务消息、至多 1 条追问，一次完整重放合计不超过 20 条，S5 同一上限。 | Round 3 / Q50，[业主] 同意全部推荐（A） | Q51、Q52、Q53、Q54、Q55、Q56 | S1 完成判据：三包 `npm test` 全绿（[DNK] 测试数因脚本退役下降属预期）、`check-*` 通过，不部署；S1 期间只许只读探查开发站（不写、不重启、不发模型消息）；S3 任一步未证实即停，不记为已清场，环境控制台账与审计不随卷擦除；S5 需再换镜像时在同一新对象上换代，不再清场；任何超出（第二次清场、额外对象、其他 profile、生产部署、pin 改动、超过上限的模型消息）另请 [业主]；20 条是建议上限，场景清单定稿后明显不足，在补充计划提出、由 [业主] 批准；P2 设计仍由 [业主] 看截图裁决，e2e 通过不代替设计通过；不含生产实例、宿主 pin、其他 profile 与生产发布配对（K-07）。 |
| `T-O-66` | `execution` | **彻底退役 `/res` 与 HTML 代理改写；隧道 hint 只落在 `/open`**：删除 [DNLS] `src/host/res-proxy.js` 与 `test/res-proxy.test.mjs`、`routes.js` 的 `RES_ROUTE`/`serveRes` 导入与分支、`dom-srcdoc.js` 的 `proxy` 选项及只服务于代理的改写函数（只留真实地址一种构建）、`object-pages.js` 中 `dnls.res` 的例外与注释、仓根路由账本的 `dnls.res` 行（重新烘焙 `lib/bindings.js`、`lib/browser-bindings.js` 与 perf 声明）、错误目录 `res.*` 九行。HTML 模式保持 [DNK] 显式开启的静态投影，`<base>` 为页面真实地址，子资源一律用真实地址。`/open` 的目标主机命中 kitesurf driver 内的已知隧道域常量时，成功体与失败体都附 hint，不改状态码、不阻断；域名清单是常量，不是安全边界；HTTP、`/mcp` 与 `T-O-64` 的打开工具共用打开内核，返回同一 hint。DNK01 族改判（`T-O-57`，DNK01 侧只留指针）：`DNK01 T-O-5` 整条退役；`DNK01 T-O-4` 中「所有绝对 http(s) 子资源引用一律改写到同源代理」与「path 镜像」两句退役，默认引擎渲染、HTML 显式开启、静态投影、`/dom` 版本签名保留，追加「HTML 投影保留真实地址」；`DNK01 T-O-6` 中 `/res` 与 `res.public-tunnel` 退役，`/open` 隧道 hint 保留，hint code 由 kitesurf driver 的目录行登记，`/diagnostics` 提示删去「+ `/res`」。[todo.DNLS03:126](../plan/todo.DNLS03.md#L126) 的「`/res` 的本次处置」由本条取代。 | Round 4 / Q51，[业主] 同意全部推荐（A） | Q55 | 不留别名、开关或墓碑路由；不新增路由、能力、errorId 或 lane；路由账本检查 0 漂移（行数减一）；相关断言同步改写（`dom-srcdoc.test`、`dom-health-routes.test`，`environment-owner.test` 改为断言该路径不再注册）。[DNK] 删除 `proxied` 推断，HTML 模式固定显示静态投影说明（改写 `hintUnproxiedHtml` 中英文案）；skill `routes.md`、`recovery-playbook.md` 删去 `/res`，改为「看样式用默认的引擎渲染」。HTML 模式下本地 http 站缺样式成为确定行为；以后若要 HTML 模式完整显示这类站点，只能另开问答走「按对象经沙箱网络取资源」并接受改约与镜像改造。DNK01 的 F 系列与历史证据不回改。验收：单测（`/dom` 保留真实地址、`/res` 不在路由表、命中隧道域的 `/open` 带 hint 且状态码不变）加 S4 真机两行（HTML 模式开关、隧道 hint），K-01、K-04 终态记「本期实现」。 |
| `T-O-67` | `execution` | **[DNK] 引用页签：一引用一页签、锁定对象、隐藏即停轮询；[DNLS] 投影只读 `drivers`**：一个 `dsh-resource://sandbox/<envId>/<sandboxId>` 对应一个页签，身份即地址（宿主规则），同一引用再次打开回到原页签；引用页签只服务该对象，不提供换对象；`kitesurf` 页类型保留空选择器、不自动选中（`T-O-38`），选择器把 `drivers` 不含 `cdp` 的对象显示为不可选并说明原因。[DNLS] `sandbox.list` 与 `sandbox.inspect` 的行增加只读 `drivers: string[]`，取自该对象 profile 清单的 `capabilities.drivers`；只读、不授权、不表示对象当前可用；按 `T-O-50` 属 major 内只读增量；`T-O-64` 列表工具同源投影。[DNK] `Pane` 读宿主给的 `tab.navigation.address` 与 `tab.visible`：有地址时 `/contract` → 定向读取对象行 → 核对 `envId`、`sandboxId` 与 `drivers` 含 `cdp` → 通过后等价一次 `choose(sandboxId)`；失败按原因显示（不存在或不可见、env 不符、无浏览器驱动），不回落到其他对象。`tab.visible` 为假时停止 `/status`、`/shot`、`/dom`、`/control` 等全部定时请求，恢复可见时立即刷新一次；保留 `keepMounted`；浏览器整体隐藏的判断照旧。 | Round 4 / Q52，[业主] 同意全部推荐（A） | Q54 | 不新增错误枚举、路由或 lane；页签标题核实前显示短 ID、核实后显示对象名；不处理无 session 的入口（`XB-5`，宿主依赖）。仓内只有一个 profile 清单，`drivers` 今天对所有对象同值，其区分价值在第二个 profile 出现时体现，[业主] 接受这一前置投影。验收：单测（同一引用二次打开不新增页签、两个引用两个页签、`drivers` 不含 `cdp` 时显示原因且不发对象请求、不可见时无定时请求而恢复可见刷新一次、`T-O-61` 已列的零/一/多候选与核实失败不改投）加 S4 真机（同一引用复用、引用页签与空选择器页签并存、切走后停止请求），记入 `T-O-60` 台账；「两个引用两个页签」只登记为软件回归证据。 |
| `T-O-68` | `execution` | **受管失败投影白名单**：对象页内核产生的失败（已通过授权与代次核验、处理器已执行、状态码 ≥ 400）投影为 `{ok:false, errorId, error?, hint?}`：`error` 为内核原因文本，截至 240 字符（与操作行同一上限）；`hint` 原样；不含其他键；仍经 `redact`。授权、可见性、代次、准入、合同版本等派发前失败只返回状态码与 `errorId`。HTTP、`/mcp`（`isError`）与 `T-O-64` 模型工具同一投影（`T-O-50` 同义）。本条澄清 `DNK01 T-O-1`「返回与 REST 同 `errorId`/`hint`」在受管宿主上的落点（DNK01 侧只留指针）。[DNK] 请求层把 `hint` 挂到错误对象上，打开失败对话框显示宿主给出的 `hint`；删除 `engineLog` 死分支、自带的 loopback 判断与 `openErrorLoopback` 文案。 | Round 4 / Q53，[业主] 同意全部推荐（A） | — | 不改错误枚举、状态码、成功体与 `/operations` 行；`object-pages.js` 只改失败分支，不改成功分支与派发前的 `fail()`；skill 排障表按 `errorId` 加 `hint` 编写，不承诺每个失败都带 `hint`；提示词约束不变（`T-O-62`）。K-05 终态记「本期实现」，收口台账该行更正「`engineLog`」的表述，不回改 todo 原文。验收：单测（内核失败带 `error`、`hint` 且无其他键；超长 `error` 截断；派发前失败只有 `errorId`；三入口一致）加 S4 真机（打开容器内不可达的 localhost 地址，pane 与 agent 看到同一 hint），记入 K-05 行与 `DNK01 T-O-1` 行。 |
| `T-O-69` | `execution` | **W3 管理页 P2：HEAD 外壳线为唯一候选，外壳退回 [DNLS] 并登记豁免，S4 现场截图交 [业主] 裁决**：P2 的唯一候选是分支 HEAD `77e217e` 的管理页线，`2ba1d4a` 不再参评。S1 在此基础上完成管理页，并接上 `T-O-59`（终端坞的可用行）、`T-O-61`（按 `candidates` 列出打开动作，替代 `openKitesurf` 与私有 kind 判断）、`T-O-67`（`drivers`）。外壳（`WorkbenchShell`、`StatusDock` 等）从 `packages/dsh-nano-ui/src/shell.js` 移回 [DNLS] client；nano-ui `index.js` 删除这些导出，DESIGN §6 删除该行，§10 为每处自绘控件登记一行 `nano-ui-exempt`，`check-ui-rules` 的 U10 条数与 §10 相等；已使用宿主 `Button` 的地方不变。S4 现场、同一对象、同一已核 SHA 的制品上取 8 张截图：总览（深色、浅色）、对象监控、服务与终端坞（含交接入口）、设置弹窗、最近操作回执、390 px 总览、390 px 设置；文件名 `p2-<视图>-<dark\|light\|390>.png`，存 `.anote/reviews/dsh-nano-local-sandbox/DNLS03/`，每张标明对应的参考行，并记录页面实际加载的 client SHA-256，不截会话内容。[业主] 的结论只写在 P2 行一处。不通过时，S5 只改 [DNLS] client，重装 [DNLS] 并重启开发 Web（`T-O-65` ④），不换镜像、不清场、不新建对象，只重取受影响的截图、复跑受影响的 W3 行；返工轮次不设上限，每轮由 [业主] 裁决。W3 完成 = P4 真机行通过 + P2 获 [业主] 通过。 | Round 5 / Q54，[业主] 同意本轮全部推荐（A） | — | 参考原图登记为三张（补登 `03.png`），原图仍只在主工作区 `.temp/`，不入库。对照清单 = redesign todo「P2 对照」一节的原图行，加「当前开发站」一节中 [业主] 指定的四行参考（`cli-interface.jpg`、`context-mgmt.png`、`model-selection.jpg`、`.temp/01.png`），再加补登的 `03.png`；清单随 P2 行迁入 todo 补充阶段一节（`T-O-71`）。「当前开发站：`2ba1d4a`」一节的实测、SHA 与截图转为历史记录（收口审查 R-6：Q54 执行说明 1 与 3 合读为「参考行沿用、实测转历史」）。不为凑第二个使用方改 [DNK]；以后若要共用外壳，另开问答：先改 DESIGN，再迁移 [DNK] 并让 [DNK] 过设计裁决。nano-ui 导出删除后，打包了 nano-ui 的 [DNK] `lib/client.js` 随 S1 重建而变化，属预期。返工不涉及 agent 场景时不发模型消息；e2e 通过不代替设计通过（`T-O-65`）。不扩大 `T-O-65` 的授权。 |
| `T-O-70` | `execution` | **K-07 web 生产同批切换（S6）**：本期增设 S6，只针对 `~/.dsh` 的 web profile，在分支合入 main 并在 main 上验证之后执行。[业主] 签收 A 即授权以下动作：① 以合并提交重建三包 tarball，SHA-256 与 S5 最终候选逐一比对，一致才使用，不一致即停；② 把 `~/.dsh/plugins/` 下三包的当前目录复制到该目录之外的临时位置，作为唯一回滚来源，切换成功后删除；③ 核对容器 `kitesurf` 的 ID、镜像与挂载后，停止并删除它，永久删除 `~/.dsh/nano-local-sandbox/state/kitesurf/`（含 `kitesurf/kitesurf`），不备份、不迁移，并确认状态根内已无其他条目；④ 一次 `dsh plugin --profile web add` 三个 tarball，重启生产 Web 一次；⑤ 只读验收：profile 的依赖与 bundles 含三包，`GET /nano-local-sandbox/contract` 响应头与正文均为 `dnls.control/1`，页面实际加载的三份 client 与 tarball 字节一致，已挂载 session 的右栏出现「沙箱」页签且总览为空，[DNK] 页签打开后为空选择器；⑥ 验收失败时以留存目录重装旧三包并重启，生产回到旧组合，旧对象数据不可恢复。桌面 `~/.dsh-desktop` 与容器 `kitesurf-desktop` 记为「[业主] 推迟」，以后执行时适用同一约束（三包同批、状态根先清），走 RELEASE「本地部署」一节。 | Round 5 / Q55，[业主] 同意本轮全部推荐（A） | — | 不发模型消息，不在生产创建对象，不改宿主 pin；不动 `~/.dsh/nano-local-sandbox/term.audit`（在状态根之外）、桌面 profile、`kitesurf-lab-*` 实验容器与任何镜像（生产旧容器与桌面容器同属 `kitesurf-engine` 镜像族，`XB-32`；收口审查 R-12）。本条就是 `T-O-65`「生产部署另请 [业主]」的那次另请：`T-O-65` 的开发站范围与 S1–S5 内容不变，S6 只由本条定义（R-2）。「S5 最终候选」指最后一次复跑所用的三包，含合入 main 前因再并 main 而触发的重建；比对不一致即停，不放宽（R-7）。[DNK]、[DNT] `AGENTS.md`「前置」各加一行：需要提供 `dnls.control/1` 的 [DNLS]，不与旧 [DNLS] 混装；[DNLS] `AGENTS.md`「安装」加一行：与 [DNK]、[DNT] 同批安装，状态根有旧条目时先按本条清理。这是兼容事实，不是 release-gate，不进 `RELEASE.md` 的必跑项。收口台账 K-07 拆为两行：web 记「本期实现」，附三包 SHA、切换 UTC、旧容器 ID 与删除核对结果；桌面记「[业主] 推迟」。S6 若因代码缺陷失败：先回滚生产，在同一工作树修复，再走一次合并（`T-O-71`）。切换窗口内生产 [DNK] 不可用、旧对象的浏览器状态永久丢失，属 [业主] 已接受的代价。 |
| `T-O-71` | `execution` | **收口交接：一份跟踪、一份终判、指针先写、主线先并入**：① `todo.DNLS03.md` 新增「补充阶段 S1–S6」一节，作为唯一执行跟踪，扩展后的 [DNK] 收口台账（`T-O-60`）也在这一节；`todo.DNLS03.md:4` 的「当前追踪」改指这一节；redesign todo 冻结为历史，文首加一行指针，P2、P4 两行移入新节，旧行原文不改。② 沿用唯一的 `DNLS03-closure.md`：S1 把文首两段横幅换成一行「补充阶段进行中，见 todo 补充阶段一节」；收口时一次改写 §0 终判（按 S4、S5、S6 的结果），其余各节保留为 `b3ad7e5` 快照的历史记录并在节首注明；不新建 closure 文件。③ S1 当即写指针：[DNK] 七份旧文档文首各加一行，指向本册 §1 与收口台账；DNK01 台账的状态行与部署快照各追加一行，列出本册对 DNK01 族的改判 `T-O-63`（`T-O-2/3`）、`T-O-64`（`T-O-1` 的 agent 侧落点）、`T-O-66`（`T-O-4/5/6`）、`T-O-68`（`T-O-1` 的失败投影），不改 DNK01 旧真相原文。④ S1 开头 `git merge --no-ff main` 一次；冲突只应出现在 `security/route-sensitivity.json`、`feature-contract.json`、`perf-binding-ids.md`，以仓内生成与检查脚本重建（`check-route-sensitivity`、`check-feature-contract` 0 漂移），不手改；三包 `npm test` 全绿后继续；不用 rebase。本册与补充计划随 S1 入库。⑤ S5 与 P2 通过后，分支以 `--no-ff` 合入 main（提交信息沿用 `merge(dnls): …`），在 main 上跑三包 `npm test` 与 `check-*`，以合并提交重建三包并比对 SHA-256（`T-O-70` 使用同一结果）；S6 完成后在 main 上一次回填 action plan §11 执行日志、todo 终态与 closure §0，随即删除工作树 `.agents/worktrees/dnls03-managed-sandbox-control` 与分支 `dnls03-managed-sandbox-control`。 | Round 5 / Q56，[业主] 同意本轮全部推荐（A） | — | 每类信息只留一处：过程与证据在 todo，终判在 closure §0，合同在本册 §1。S1 的合并提交只含 main 并入与账本重建，紧随其后的第一个普通提交含本册与补充计划（收口审查 R-8）。S1–S5 期间 main 若再前进，只在合入 main 之前再并一次；新提交触及三包、`packages/` 或 `profiles/` 时，重建并复跑受影响的行。合入 main 在主工作区进行时，不覆盖、不暂存、不清理主工作区的未提交改动与未跟踪文件；与本分支改动的路径重叠即停，请 [业主] 处理（R-9）。不碰主工作区未跟踪的 `docs/specs/dsh-nano-3d-factory/` 与另一个工作树 `model-selector-fusion-v1`。不改 `T-O-60` 已定的台账列与终态集合，不改 S1–S5 的内容。closure 改写后，`b3ad7e5` 的 No-Go 判定只能从 git 历史读到，属 [业主] 已接受的代价。 |

### 1.1 基线事实层（测量，非 `T-O`）

> 以下是 `3e7a775` 的事实，供提问引用；施工落地后不回改。行号漂移以「路径 + 符号名」为准。

| 事实 ID | 一句话 | 出处 |
|---|---|---|
| `XB-1` | 三包之间没有源码互引；[DNK]、[DNT] 只经 `/nano-local-sandbox/*` 公共 HTTP/MCP 与宿主右栏资源寻址消费 [DNLS]。 | [DNK managed-client:100–140](../../../../dsh-nano-kitesurf/src/shared/managed-client.js#L100-L140)；[DNT sandbox-resource:46–77](../../../../dsh-nano-terminal/src/client/sandbox-resource.js#L46-L77) |
| `XB-2` | 宿主只为浏览器提供一个主体：`PrincipalMap.owner` 注释为「The local user who owns this Host」；所有已认证浏览器请求共用一个 owner Peer，API token Peer 同为 `owner`；其他人以独立 kind 进入（liveshare 的 `share-viewer`）。 | [types.ts:450–461](../../../../.dependencies/pinned/deepseek-harness/packages/typert/protocol/src/types.ts#L450-L461)；[rpc-host.ts:94](../../../../.dependencies/pinned/deepseek-harness/packages/client/connection/src/rpc-host.ts#L94)、[:128–137](../../../../.dependencies/pinned/deepseek-harness/packages/client/connection/src/rpc-host.ts#L128-L137)、[:169–173](../../../../.dependencies/pinned/deepseek-harness/packages/client/connection/src/rpc-host.ts#L169-L173)；[viewer-principal.ts:17–25](../../../../.dependencies/pinned/deepseek-harness/packages/experimental/liveshare/src/host/viewer-principal.ts#L17-L25) |
| `XB-3` | [DNLS] 生产默认主体对 `terminal.*` 一律 `canUse=false`，在 `authorize` 变成 403；终端归属另核 `principalKey` 与代次。该排除由 `b3ad7e5`（Phase 8 切换）引入；`b7f3d34`（Phase 5）时 owner 为 `canUse: true`。 | [object-authz.js:49–60](../../../../dsh-nano-local-sandbox/src/host/object-authz.js#L49-L60)、[:107–119](../../../../dsh-nano-local-sandbox/src/host/object-authz.js#L107-L119)；[environment-owner.js:27](../../../../dsh-nano-local-sandbox/src/host/environment-owner.js#L27)；`git blame`/`git show b7f3d34` |
| `XB-4` | W1 链路在生产停在 `term.session.list`：[DNLS] 终端坞显示「共享身份下终端不可用」，无终端行即无「打开」，`openTerm` → `openResource` 从未执行；[DNT] 已认领 `dsh-resource://sandbox-terminal/**` 且只 attach。正向全链只在夹具主体下通过，同测试切回真实 owner 即 403。 | [DNLS index.jsx:684](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L684)、[:397–407](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L397-L407)、[:836–841](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L836-L841)；[DNT index.js:51–62](../../../../dsh-nano-terminal/src/client/index.js#L51-L62)；[journey.mega:57–58](../../../../dsh-nano-local-sandbox/test/dnls03-journey.mega.test.mjs#L57-L58)、[:117–123](../../../../dsh-nano-local-sandbox/test/dnls03-journey.mega.test.mjs#L117-L123)；[redesign todo:57](../plan/todo.DNLS03-control-redesign.md#L57) |
| `XB-5` | 宿主右栏的 `openTab`/`openResource` 都要求已挂载 session；[DNLS] 页签无 `sessionId` 不渲染；`/sandbox` 未交付（P8-01）。 | [service.ts:380–393](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/service.ts#L380-L393)；[DNLS index.jsx:292](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L292)；[todo.DNLS03:56](../plan/todo.DNLS03.md#L56) |
| `XB-6` | [DNLS] → [DNK] 只调用 `openTab('kitesurf')` 不带目标；[DNK] 的 `Pane` 不读页签导航参数；界面以文案要求用户在 [DNK] 内重选同一 sandbox。宿主 `openTab(kind, options)` 本身支持导航参数。 | [DNLS index.jsx:835](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L835)；[i18n.js:102](../../../../dsh-nano-local-sandbox/src/client/i18n.js#L102)；[DNK index.js:3047–3072](../../../../dsh-nano-kitesurf/src/client/index.js#L3047-L3072)；[service.ts:244–250](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/service.ts#L244-L250) |
| `XB-7` | `DNK01 T-O-1/2/3/6` 未实施：仓内无 `sandbox.open`；relay `makeCdpRelay` 不读 control，只有 `tools/call` 受写闸与 `humanHold` 约束；`controlSnapshot` 无 `relay` 字段。 | [DNK01 台账:21](../../dsh-nano-kitesurf/qna/DNK01-1120-qna-truth.md#L21)；[mcp-bridge.mjs:223](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L223)、[:797](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L797)、[:916–960](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L916-L960)；[DNK01 e2e §4:68–79](../../dsh-nano-kitesurf/e2e/DNK01-1120-e2e.md#L68-L79) |
| `XB-8` | [DNK] skills 未受管化：Step 0 不带 `sandboxId` 读 `/diagnostics`，受管宿主直接参数拒绝；仍写「实例按 session 记录」与 `suspend` 旧语义。 | [kitesurf-cdp SKILL.md:18](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L18)、[:32](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L32)；[nano-kite SKILL.md:13–15](../../../../dsh-nano-kitesurf/skills/nano-kite/SKILL.md#L13-L15)；[managed-routes.js:215–222](../../../../dsh-nano-local-sandbox/src/host/managed-routes.js#L215-L222) |
| `XB-9` | 现有验收脚本都是受管前写法：不选对象、不带合同头；`dsh-nano-kitesurf/scripts/` 内 `sandboxId` 命中为 0。 | [gui-smoke-kitesurf.sh:99–116](../../../../scripts/gui-smoke-kitesurf.sh#L99-L116)；[e2e-ego.mjs:83](../../../../dsh-nano-kitesurf/scripts/e2e-ego.mjs#L83)、[:135](../../../../dsh-nano-kitesurf/scripts/e2e-ego.mjs#L135)、[:434](../../../../dsh-nano-kitesurf/scripts/e2e-ego.mjs#L434) |
| `XB-10` | [DNK] 的开放项散在 7 份文档、口径互相矛盾：`1119-delivery-gaps` 仍宣称全部 OPEN；loop3 的五个 D 闸口已由 DNLS02 裁决却仍列为闸口；数字与预算已漂移。普查约 70 项中约三分之一已因受管模型作废、约三分之一已完成。 | [1119-delivery-gaps.md:362](../../dsh-nano-kitesurf/1119-delivery-gaps.md#L362)；[1119-loop3-closure.md:84–85](../../dsh-nano-kitesurf/1119-loop3-closure.md#L84-L85)、[:97](../../dsh-nano-kitesurf/1119-loop3-closure.md#L97)；[final-eval.md:3](../../dsh-nano-kitesurf/final-eval.md#L3)、[:34–36](../../dsh-nano-kitesurf/final-eval.md#L34-L36)；[design-mode-feedback.md:29](../../dsh-nano-kitesurf/design-mode-feedback.md#L29) 对 [note.js:9](../../../../dsh-nano-kitesurf/src/shared/note.js#L9) |
| `XB-11` | W3 现状：管理页设计（P2）待 [业主] 设计裁决；`dsh-dev` 实机（P4）未完成；两个开发测试对象 `dnls03-dev`、`dnls03-ui-check` 的卷仍在，未获处置授权。 | [redesign todo:7](../plan/todo.DNLS03-control-redesign.md#L7)、[:9](../plan/todo.DNLS03-control-redesign.md#L9)、[:76](../plan/todo.DNLS03-control-redesign.md#L76) |
| `XB-12` | 同一 owner 主体今天已能经 [DNT] 本地 lane 在 macOS 宿主上直接起 PTY：[DNT] 路由只经宿主 `requestRejection` 准入，`local` lane 调 `subprocess.spawnTerminal`。 | [DNT index.js:77–85](../../../../dsh-nano-terminal/index.js#L77-L85)；[route-guard.js:204–208](../../../../packages/dsh-host-route-guard/src/route-guard.js#L204-L208)、[:269](../../../../packages/dsh-host-route-guard/src/route-guard.js#L269)；[DNT sessions.js:251](../../../../dsh-nano-terminal/src/host/sessions.js#L251) |
| `XB-13` | 单包测试全绿但不跨包：[DNLS] 468/468、[DNK] 52/52、[DNT] 272/272；没有一条测试跨越真实宿主走完 W1/W2 的跨包链路。 | 本工作树 `npm test` 实测（合并后） |

> Round 2 取证追加（同一快照 `3e7a775`，只读核查）：

| 事实 ID | 一句话 | 出处 |
|---|---|---|
| `XB-14` | [DNLS] 的两处交接都写死消费者的私有 kind：设计入口 `openTab('kitesurf')`，终端入口要求 `candidates[0]?.kind === 'dnt-sandbox-terminal'`；而 `T-O-54` 写明「不固定 [DNT] 私有 kind」，Q40 A 第 3 项写「[DNK] 独立选择其 sandbox」。 | [DNLS index.jsx:834–841](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L834-L841)、[i18n.js:101–103](../../../../dsh-nano-local-sandbox/src/client/i18n.js#L101-L103)；[台账 T-O-54:354](./DNLS03-qna-truth.md#L354)；[DNLS03-qna.md:555](./DNLS03-qna.md#L555) |
| `XB-15` | 宿主右栏有两种交接：`openResource(address, { kind?, params? })` 按 glob、`canOpen` 与优先级认领 `dsh-resource://` 地址，无人认领即抛错；`openTab(kind, { params })` 的参数按 kind 以声明合并定型。处理方都从页签的 `navigation` 读取地址与参数。 | [service.ts:178–201](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/service.ts#L178-L201)、[:228–250](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/service.ts#L228-L250)；[tab-registry.ts:342–395](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/tab-registry.ts#L342-L395)；[params.ts:1–40](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/contract/params.ts#L1-L40)；[DNT index.js:51–70](../../../../dsh-nano-terminal/src/client/index.js#L51-L70) |
| `XB-16` | 受管前脚本仍接在包测试与发布手册上：[DNK] `test:e2e` 指向写死 `https://dsh-dev.local/` 的 `e2e-ego.mjs`；`npm test` 内的 `e2e-script.test.mjs` 对该脚本正文做静态断言；`RELEASE.md` 要求部署后跑 `gui-smoke-kitesurf.sh`「全 PASS 才算 Kitesurf 真的可用」。 | [package.json:11](../../../../dsh-nano-kitesurf/package.json#L11)；[e2e-ego.mjs:1–13](../../../../dsh-nano-kitesurf/scripts/e2e-ego.mjs#L1-L13)；[e2e-script.test.mjs:8–24](../../../../dsh-nano-kitesurf/test/e2e-script.test.mjs#L8-L24)；[RELEASE.md:97](../../../../RELEASE.md#L97)；[gui-smoke-kitesurf.sh:4–17](../../../../scripts/gui-smoke-kitesurf.sh#L4-L17) |
| `XB-17` | 开发站从未运行过 session 内的 agent：DNLS03 开发站验收「通过宿主 `session/create` 创建真实测试会话，不发送模型消息」，[DNK]/[DNT] 的正向操作都由测试者经页面或 MCP 完成。[DNK] skill 却是写给 session 内 agent 的：取 relay socket、遇 `humanHold` 停写。 | [todo.DNLS03:111](../plan/todo.DNLS03.md#L111)、[:117–118](../plan/todo.DNLS03.md#L117-L118)；[kitesurf-cdp SKILL.md:21–27](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L21-L27)、[:39](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L39) |

> Round 3 取证追加（同一快照 `3e7a775`，只读核查）：

| 事实 ID | 一句话 | 出处 |
|---|---|---|
| `XB-18` | 桥分不出宿主与 agent：[DNLS] 宿主自身的 CDP（pane 的 REST 写最终落在这里）与 agent 的 `agent-browser --cdp` 走同一个 `/cdp` relay；relay 对每一帧只做 ID 改写后转发，不读 `control`，注释写明「by design」绕过写锁；握手只看 Origin，缺 Origin 直接放行。 | [object-pages.js:106–110](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L106-L110)；[cdp-elements.js:469](../../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L469)、[:571–575](../../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L571-L575)；[mcp-bridge.mjs:355–418](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L355-L418)、[:1134–1137](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L1134-L1137)、[:79–86](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L79-L86)、[:1106–1111](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L1106-L1111) |
| `XB-19` | 现有接管豁免依赖自报名，且接管开关在发布端口上无人把守：MCP 的 `clientInfo.name` 直接成为 `clientName`，接管豁免比较 `clientName` 与 `humanHold.owner`；`POST /control` 的 `owner` 缺省为 `'human'`，任何不带 Origin 的 JSON 请求都能接管或释放。宿主另有一条不经发布端口的可信写入通道：`container exec` 以 root 调镜像内 helper、经 stdin 传入、`env -i` 清环境。 | [mcp-bridge.mjs:912–915](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L912-L915)、[:933](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L933)、[:731](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L731)、[:1048–1078](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L1048-L1078)；[backend-apple.js:476–499](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L476-L499) |
| `XB-20` | session 内 agent 在受管宿主上没有可用入口：skill 让它读 `/diagnostics`、`/status`，而 [DNLS] 全部路由在宿主准入之后，无会话 cookie 的 shell 请求得 401；[DNLS] 不注入 `tools`；宿主 `commands` 是「人用命令」、不送模型；宿主为插件提供模型工具的接缝是 `tools.register`；[DNLS] `/mcp` 的工具表本就是能力表的投影；受管 `/status` 返回 relay 地址 `cdp`，`redact` 不屏蔽它。 | [SKILL.md:18](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L18)、[:21](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L21)、[nano-kite SKILL.md:11](../../../../dsh-nano-kitesurf/skills/nano-kite/SKILL.md#L11)；[route-guard.js:204–208](../../../../packages/dsh-host-route-guard/src/route-guard.js#L204-L208)；[DNK01-1120-qna.md:48](../../dsh-nano-kitesurf/qna/DNK01-1120-qna.md#L48)；[DNLS index.js:19](../../../../dsh-nano-local-sandbox/index.js#L19)；[commands index.ts:1–3](../../../../.dependencies/pinned/deepseek-harness/packages/interaction/commands/src/index.ts#L1-L3)、[:76](../../../../.dependencies/pinned/deepseek-harness/packages/interaction/commands/src/index.ts#L76)；[tools index.ts:121–153](../../../../.dependencies/pinned/deepseek-harness/packages/core/tools/src/index.ts#L121-L153)；[managed-routes.js:369–385](../../../../dsh-nano-local-sandbox/src/host/managed-routes.js#L369-L385)；[routes.js:1622–1624](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1622-L1624)；[object-pages.js:15–16](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L15-L16) |
| `XB-21` | 写判据只有 MCP 一侧：MCP 按工具名正则判写；relay 侧没有任何判据。`DNK01 T-O-3` 点名的 `Page.navigate`、`Input.*`、`Runtime.evaluate` 不是 CDP 中改变页面的全部方法（另有 `Runtime.callFunctionOn`、`DOM.setOuterHTML`、`Page.reload`、`Emulation.*`、`Storage.*` 等）。 | [mcp-bridge.mjs:766–770](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L766-L770)；[DNK01 台账 T-O-3:58](../../dsh-nano-kitesurf/qna/DNK01-1120-qna-truth.md#L58) |
| `XB-22` | 开发站的施工前提：桥在镜像配方内；开发站 `kitesurf` profile 的两个名额已被 `dnls03-dev`、`dnls03-ui-check` 占满；P4 纠正已判定要验「干净创建」而不是保卷重建，清场顺序已写好，但缺具体处置授权。 | [profile.yaml:14](../../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L14)；[todo.DNLS03:108](../plan/todo.DNLS03.md#L108)、[:130](../plan/todo.DNLS03.md#L130)；[redesign todo:71](../plan/todo.DNLS03-control-redesign.md#L71)、[:76](../plan/todo.DNLS03-control-redesign.md#L76)、[:78](../plan/todo.DNLS03-control-redesign.md#L78) |

> Round 4 取证追加（同一快照 `3e7a775`，只读核查）：

| 事实 ID | 一句话 | 出处 |
|---|---|---|
| `XB-23` | `/res` 在生产里不运行：插件入口只注册受管分派器；`serveRes` 只在通用 `routeSpecs` 的一个分支里，而受管对象页只取除 `dnls.res` 以外的行，`/res` 路径由失败关闭的处理器占位。代码与登记仍散在 9 处：代理与单测、路由常量与分支、`/dom` 的改写分支、绑定行、浏览器绑定、perf 声明、路由账本、九行 `res.*` 错误码。代理只拒非 http(s) 与带凭据的地址，对目标主机不设限。 | [DNLS index.js:35](../../../../dsh-nano-local-sandbox/index.js#L35)；[routes.js:36–39](../../../../dsh-nano-local-sandbox/src/host/routes.js#L36-L39)、[:57](../../../../dsh-nano-local-sandbox/src/host/routes.js#L57)、[:1489–1495](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1489-L1495)；[object-pages.js:9–13](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L9-L13)、[:28](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L28)；[managed-routes.js:470–481](../../../../dsh-nano-local-sandbox/src/host/managed-routes.js#L470-L481)；[bindings.js:40](../../../../dsh-nano-local-sandbox/lib/bindings.js#L40)；[browser-bindings.js:38](../../../../dsh-nano-local-sandbox/lib/browser-bindings.js#L38)；[declaration.json:46](../../../../dsh-nano-local-sandbox/src/perf/declaration.json#L46)；[route-sensitivity.json:1528](../../../../security/route-sensitivity.json#L1528)；[error-catalog.js:46–54](../../../../dsh-nano-local-sandbox/src/host/error-catalog.js#L46-L54)；[res-proxy.js:27–31](../../../../dsh-nano-local-sandbox/src/host/res-proxy.js#L27-L31)、[:91–106](../../../../dsh-nano-local-sandbox/src/host/res-proxy.js#L91-L106) |
| `XB-24` | HTML 模式是 [DNK] 的显式开关，默认面是引擎渲染；受管 `/dom` 保留真实地址；`/dom` 记录不含 `base`，所以 [DNK] 的 `proxied` 恒为假，「宿主未声明同源资源代理」提示在 HTML 模式下总会出现；skill 仍引用 `/res`。隧道 hint 仓内没有任何实现，`/open` 成功体只有 `{ok, url, landed}`，失败时另有 `navigateHint` 给出拓扑提示。 | [DNK index.js:934–942](../../../../dsh-nano-kitesurf/src/client/index.js#L934-L942)、[:1527–1533](../../../../dsh-nano-kitesurf/src/client/index.js#L1527-L1533)、[:2726–2732](../../../../dsh-nano-kitesurf/src/client/index.js#L2726-L2732)、[:2782–2791](../../../../dsh-nano-kitesurf/src/client/index.js#L2782-L2791)；[i18n.js:106](../../../../dsh-nano-kitesurf/src/client/i18n.js#L106)；[routes.js:1079–1081](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1079-L1081)、[:1096](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1096)、[:1719](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1719)、[:949–970](../../../../dsh-nano-local-sandbox/src/host/routes.js#L949-L970)；[dom-srcdoc.js:104–110](../../../../dsh-nano-local-sandbox/src/host/dom-srcdoc.js#L104-L110)；[routes.md:19](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/references/routes.md#L19)、[recovery-playbook.md:18](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/references/recovery-playbook.md#L18) |
| `XB-25` | 宿主把资源页签的身份定为地址本身，同一地址再次打开即显示原页签；页签 body 能从宿主读到 `tab.navigation` 与 `tab.visible`。[DNK] 注册为 `keepMounted: true`，`Pane` 不读任何页签属性，页内下拉可随时换对象；轮询只看 `document.visibilityState`，另有三处无条件定时器，所以保留挂载的隐藏页签仍按 1.5–3 秒请求对象接口。 | [tab-registry.ts:145–151](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/tab-registry.ts#L145-L151)、[:105–108](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/tab-registry.ts#L105-L108)；[service.ts:171–175](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/service.ts#L171-L175)；[slots.ts:196–208](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/contract/slots.ts#L196-L208)；[DNK index.js:3047–3067](../../../../dsh-nano-kitesurf/src/client/index.js#L3047-L3067)、[:3009–3018](../../../../dsh-nano-kitesurf/src/client/index.js#L3009-L3018)、[:608–614](../../../../dsh-nano-kitesurf/src/client/index.js#L608-L614)、[:1171](../../../../dsh-nano-kitesurf/src/client/index.js#L1171)、[:1201](../../../../dsh-nano-kitesurf/src/client/index.js#L1201)、[:1207](../../../../dsh-nano-kitesurf/src/client/index.js#L1207) |
| `XB-26` | 一个对象能否做设计，唯一判据是其 profile 清单的 `capabilities.drivers` 含 `cdp`；列表与 inspect 投影给出 `profileId` 和服务，但不给出 driver；没有浏览器 driver 的对象，对象页只回 503，与「引擎没起」无法区分。仓内目前只有 `kitesurf` 一个 profile 清单。 | [profile-drivers.js:26–32](../../../../dsh-nano-local-sandbox/src/host/profile-drivers.js#L26-L32)；[profile.yaml:83–86](../../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L83-L86)；[fleet-projection.js:218–240](../../../../dsh-nano-local-sandbox/src/host/fleet-projection.js#L218-L240)；[object-pages.js:54–55](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L54-L55) |
| `XB-27` | 受管对象页的失败体只留 `errorId`：内核给出的 `error`（上游原因）与 `hint`（拓扑提示）被删；[DNK] 因此显示「request failed (状态码)」。K-05 所说的 `engineLog` 原是 [DNK] 客户端自取日志，生产者已于 `9b6287f` 删除，对话框里的分支是死代码；[DNK] 另有一份与 [DNLS] `navigateHint` 重复的 loopback 判断。 | [object-pages.js:136–138](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L136-L138)；[routes.js:1720–1727](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1720-L1727)、[:1116–1117](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1116-L1117)；[DNK index.js:382–386](../../../../dsh-nano-kitesurf/src/client/index.js#L382-L386)、[:1408–1419](../../../../dsh-nano-kitesurf/src/client/index.js#L1408-L1419)、[:1438–1440](../../../../dsh-nano-kitesurf/src/client/index.js#L1438-L1440)；`git show 9b6287f`（删除 `engineLogHint`） |

> Round 5 取证追加（同一快照 `3e7a775`，只读核查；含本机 `~/.dsh`、`~/.dsh-desktop` 的只读目录列表与 `container list --all`）：

| 事实 ID | 一句话 | 出处 |
|---|---|---|
| `XB-28` | 管理页有两条 UI 线：开发站加载并取证的是 `2ba1d4a`；其后本分支 `2959dc7` 以「在宿主页签内又画了一层外壳」为由删除整个页签（−5237 行），`77e217e` 自述为「合入 kitesurf 线前的进行中快照」，以 nano-ui `WorkbenchShell`/`StatusDock` 外壳重建（+4608 行），未部署、无截图、todo 未登记；redesign todo 与 closure 仍称当前为 `2ba1d4a`。HEAD 管理页仍含 `T-O-61` 要硬切的 `kitesurf()`/`openKitesurf` 与私有 kind 判断。 | `git show --stat 2959dc7 77e217e`；[redesign todo:21](../plan/todo.DNLS03-control-redesign.md#L21)；[closure:1](../closure/DNLS03-closure.md#L1)；[DNLS index.jsx:12–13](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L12-L13)、[:762](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L762)、[:808](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L808)、[:393–394](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L393-L394)、[:835–838](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L835-L838) |
| `XB-29` | 新外壳登记进 nano-ui 组件表，但仓内唯一使用方是 [DNLS]；设计规范要求「两个以上插件会用」才进 nano-ui，redesign todo 也写明单一消费者的布局不能以「已移到共享包」证明合规。[DNK] 的同型抽屉是自有样式。参考原图目录现有 `01.jpg`、`02.png`、`03.png` 三张，redesign todo 只登记两张。 | [DESIGN.md:14](../../dsh-nano-ui/DESIGN.md#L14)、[:153](../../dsh-nano-ui/DESIGN.md#L153)；[shell.js:9](../../../../packages/dsh-nano-ui/src/shell.js#L9)、[:103](../../../../packages/dsh-nano-ui/src/shell.js#L103)；[redesign todo:13](../plan/todo.DNLS03-control-redesign.md#L13)、[:19](../plan/todo.DNLS03-control-redesign.md#L19)；[DNK index.js:111–114](../../../../dsh-nano-kitesurf/src/client/index.js#L111-L114)；主工作区 `.temp/sandbox-dash-control-visual-reference/` 目录列表 |
| `XB-30` | 生产 web（`~/.dsh`）与桌面（`~/.dsh-desktop`）都还是旧 [DNLS] 加 kitesurf 线 [DNK]：两处 [DNLS] `src/host` 都没有 `control-registry.js`、`object-authz.js`、`managed-routes.js`；生产容器 `kitesurf`（2026-11-19 起运行）与桌面 `kitesurf-desktop` 运行中，另有两个停止的 `kitesurf-lab-*` 实验容器。合并态双向不兼容：新 [DNK]、[DNT] 先读 `/contract`，头或版本不符即拒；新 [DNLS] 入口只注册受管分派器。新台账在状态根有其他条目而无 `registry.json` 时拒绝开账，而生产状态根现有旧目录 `kitesurf/kitesurf`（约 10 MB）且无台账；closure 写明不含旧卷接管。开发站的先例是先删除旧对象与数据、不备份，再装新包。 | [managed-client.js:67–96](../../../../dsh-nano-kitesurf/src/shared/managed-client.js#L67-L96)；[DNT sandbox-resource.js:31–34](../../../../dsh-nano-terminal/src/client/sandbox-resource.js#L31-L34)；[DNLS index.js:35](../../../../dsh-nano-local-sandbox/index.js#L35)；[control-registry.js:302–303](../../../../dsh-nano-local-sandbox/src/host/control-registry.js#L302-L303)、[:342–350](../../../../dsh-nano-local-sandbox/src/host/control-registry.js#L342-L350)；[closure:16](../closure/DNLS03-closure.md#L16)、[:26](../closure/DNLS03-closure.md#L26)；[todo.DNLS03:112–113](../plan/todo.DNLS03.md#L112-L113)、[:134](../plan/todo.DNLS03.md#L134)；[managed-profile.js:22–24](../../../../dsh-nano-local-sandbox/src/host/managed-profile.js#L22-L24) |
| `XB-31` | 收口面现状：同一阶段的状态写在三处——closure（`b3ad7e5` 的 No-Go，文首叠加两段 11-20 横幅）、`todo.DNLS03.md` 与 `todo.DNLS03-control-redesign.md`（前者把「当前追踪」指向后者）。发车指令 STEP.6 要求 closure；[DNPR] 按其 `T-O-17` 删除了 closure，合并与删工作树留给 [业主]。分支无上游；merge-base `0dd99ab` 之后 main 前进 21 个提交、分支领先 38 个，两边都改了 `security/route-sensitivity.json`、`feature-contract.json`、`perf-binding-ids.md`；[DNLS] 绑定表只烘焙本包行，他包账本行不改变本包制品。本册尚未入库。 | [closure:1–5](../closure/DNLS03-closure.md#L1-L5)、[:20](../closure/DNLS03-closure.md#L20)；[todo.DNLS03:4](../plan/todo.DNLS03.md#L4)、[:64](../plan/todo.DNLS03.md#L64)、[:176](../plan/todo.DNLS03.md#L176)；[DNPR01 台账:69](../../dsh-nano-progress-report/qna/DNPR01-qna-truth.md#L69)、`git show 6df597c`；[bindings.js:1–3](../../../../dsh-nano-local-sandbox/lib/bindings.js#L1-L3)；`git merge-base`、`git rev-list --count`、`git status` |

> 收口审查取证（同一快照 `3e7a775`；本机只读目录列表、`container list --all`、`container image list` 与开发站台账只读解析）：

| 事实 ID | 一句话 | 出处 |
|---|---|---|
| `XB-32` | 现场对象与 S3、S6 的授权一一对应：生产状态根 `~/.dsh/nano-local-sandbox/state/` 下只有 `kitesurf` 一个条目，`term.audit` 在状态根之外；开发站台账的两行正是 `dnls03-dev`（`7ef19658-…`，容器 `dnls-4e589664-…`）与 `dnls03-ui-check`（`75bfac14-…`，容器 `dnls-07d3b037-…`），卷目录也只有这两个。生产容器 `kitesurf`、桌面容器 `kitesurf-desktop` 与两个开发对象都使用 `kitesurf-engine` 镜像族的不同标签，镜像存储是本机共享的。 | `ls ~/.dsh/nano-local-sandbox/ …/state/`；`~/.dsh-dev/nano-local-sandbox/state/registry.json` 的 `sandboxes[].binding.locator`；`container list --all`、`container image list`；[profile.yaml:10](../../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L10) |
| `XB-33` | 内核失败体另带 `incidentId`，受管投影只留 `errorId`，`incidentId` 同时记在操作行；对象页的打开等动作由 [DNLS] 宿主经 relay 执行，按 `T-O-63` 这条连接属宿主类，桥侧接管闸不拦它。 | [routes.js:1122–1128](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1122-L1128)；[object-pages.js:137](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L137)、[:106–110](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L106-L110)；`XB-18` |
## 2. Round 1 —— foundational：终端主体是否成立；[DNK] 收口以什么为真源（Q44–Q45）

本轮 `retired`，[业主] 直答。两题可独立作答：Q44 决定 W1 在真实宿主上能不能成立；Q45 决定 W2 的「彻底关闭」以哪一份台账、什么判据来证明。不以一题的推荐作为另一题的前提；W3 与三项工作的先后顺序留待下一轮，按本轮冻结项另行检索后再提。

### Q44 — 宿主只给出一个 `owner` 主体时，它能否创建并附着属于自己的沙箱终端？

**驱动真相**：`T-O-55`（W1）、`T-O-56`（工作台内唤起所选 sandbox 的终端）；现行 `DNLS03 T-O-44/52/54`。来源：[Q41 选项与 A 项执行说明：587–605](./DNLS03-qna.md#L587-L605)；[台账 T-O-44/52](./DNLS03-qna-truth.md#L216-L228)。

- **影响范围**：W1 全部；[DNLS] 对象授权与终端能力公告、`AGENTS.md` 的终端说明、工作台终端坞；[DNT] 沙箱资源页签的真实路径；W3 实机 e2e 中的终端分支。
- **为什么必须确认**：宿主给浏览器的唯一主体被 [DNLS] 判为不得使用任何终端（`XB-3`），所以 `T-O-56` 的目标在真实宿主上**无法交付**，只能在夹具主体下证明（`XB-4`）。而 `T-O-52` 的文字有两种读法：其一，owner 是本机唯一的用户，它不能读**别人**的终端，但可以持有自己的终端；其二，共享 owner 不能证明是哪个人，所以一律拒绝。Phase 5 实现的是前者，Phase 8 切换时改成了后者，期间没有新的 [业主] 裁决。哪种读法是法律，必须由 [业主] 定。
- **当前建议 / 倾向**：选 **A：宿主 `owner` 即本机唯一用户的稳定主体，可创建、附着、操作以自身为归属的沙箱终端；不是其他主体终端的通配授权。**
- **Reasoning**：「哪个人」这个问题，宿主已经给出了答案：upstream 把 `owner` 定义为「拥有本宿主的本地用户」，别的人以别的 kind 进入。共享 Peer 不能区分的是「同一个人开的不同连接」，而终端归属本来就不需要区分同一个人的两个标签页。反过来，在单主体宿主上一律拒绝，等于把 Q41 中 [业主] 没有选的 B（显式暂缓沙箱交互终端）做成了现状。
- **问题（请 [业主] 裁决）**：在宿主只提供一个 `owner` 主体时，是否允许该主体持有并附着以自己为归属的 [DNLS] 沙箱终端（A），维持一律拒绝、等待宿主提供按人区分的主体（B），还是由插件补一层自有身份来区分终端归属（C）？
- **[业主]回答**：已确认 A（2026-11-20：「业主同意你在 [第1轮] 的全部推荐」），冻结为 `T-O-59`。

**【对本问题的解读】**　例：[业主] 在 [dsh工作台] 选中 sandbox B，点「新建终端」，再在 [DNT] 页签里接上它；关掉浏览器、重启 [dsh] 后，从同一工作台重新接回原任务。按 A，这条路成立，因为创建者与附着者都是同一个 `owner`；但若宿主以后让一位 `share-viewer` 进入，他看不到也接不上 B 里属于 `owner` 的终端。本题只回答「单主体宿主上的终端归属」，不回答多用户隔离、不改 wire（`T-O-45`）、不改资源交接方式（`T-O-54`），也不批准任何新凭证。

**【可选选项清单】**

| 选项 | 终端主体 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 宿主 `owner` 是本机唯一用户的稳定主体（键 `owner`），终端按 `principalKey` 与代次归属；其他 kind 各自独立或拒绝。 | `T-O-56` 在真实宿主可交付；不新增任何凭证或身份机制。代价：须对 `T-O-44/52` 追加一条澄清式 supersession，并撤回 `b3ad7e5` 的排除；不能宣称跨用户隔离。 |
| B | 维持现状：共享 owner 不得使用任何 `terminal.*`，直到宿主提供按人区分的主体。 | 最保守；W1 只能交付协议、夹具测试与拒绝分支实机，`T-O-56` 无限期不可交付；等同于 Q41 未被选中的 B。 |
| C | 插件自签每标签页/每浏览器票据或 operator 密钥，以此区分终端归属。 | 表面上能区分标签页；但它新造了凭证面和身份源，违反 `T-O-52`「不批准新票据、operator 密钥或认证插件」与「上层建筑归 host」。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **真相登记**：在本册以 append supersession 澄清 `T-O-44/52`。保留「共享 browser owner 不是多用户证明；临时 `peer.id` 不是持久归属」原句。追加：「宿主 `owner` 是本机唯一用户的稳定主体，键为 `owner`；它可按 `T-O-42/54` 创建、列出、附着、读写、调整、关闭 `principalKey` 为 `owner` 且代次匹配的终端；它不是其他主体终端的通配授权。」不新增错误枚举、凭证、lane 或路由。
2. **实现硬切**：`resolveOwnerPrincipal` 对 owner 恢复终端动作可用；保留 `authorize` 的终端归属与代次校验（[object-authz.js:111–119](../../../../dsh-nano-local-sandbox/src/host/object-authz.js#L111-L119)）；非 `owner` kind 仍得不到主体、仍 403；WS upgrade 前再次 admission 与撤权即 detach、不杀 PTY 的 `T-O-52` 机制不变。不保留旧的拒绝分支作开关。
3. **合同与文案同切**：改写 [DNLS AGENTS.md:96](../../../../dsh-nano-local-sandbox/AGENTS.md#L96) 的终端说明；`terminalsDenied` 只在真实拒绝（非 owner kind、撤权、代次不符）时出现；把 [journey.mega:117–123](../../../../dsh-nano-local-sandbox/test/dnls03-journey.mega.test.mjs#L117-L123) 的「owner 被拒」改为「owner 通过 + 非 owner kind 被拒」；跨主体隔离仍只在夹具中验证，并如 Q41 A 第 4 项注明「两个标签页不是跨用户证明」。
4. **真实宿主判据**：在 `dsh-dev` 上经 ego-browser 走通「工作台选中 B → 明确新建 → [DNT] 资源页签 attach → 输入推进原任务 → 只重启 [dsh] → 重新 attach 后新输入仍推进原任务」（`T-O-39` 的辨真判据）。具体用例归 W3 executional 轮。

**【推荐选项支持证据或其他选项的反例】**

- 宿主对「哪个人」有明确答案：[types.ts:455–457](../../../../.dependencies/pinned/deepseek-harness/packages/typert/protocol/src/types.ts#L455-L457) 把 `owner` 定义为拥有本宿主的本地用户；浏览器与 API token 都映射为 `owner`（[rpc-host.ts:94](../../../../.dependencies/pinned/deepseek-harness/packages/client/connection/src/rpc-host.ts#L94)、[:133](../../../../.dependencies/pinned/deepseek-harness/packages/client/connection/src/rpc-host.ts#L133)、[:170](../../../../.dependencies/pinned/deepseek-harness/packages/client/connection/src/rpc-host.ts#L170)）；其他人走独立 kind（[viewer-principal.ts:25](../../../../.dependencies/pinned/deepseek-harness/packages/experimental/liveshare/src/host/viewer-principal.ts#L25)、[:65](../../../../.dependencies/pinned/deepseek-harness/packages/experimental/liveshare/src/host/viewer-principal.ts#L65)）。[object-authz.js:55–56](../../../../dsh-nano-local-sandbox/src/host/object-authz.js#L55-L56) 的「无法证明是哪个终端用户」在单主体宿主上没有第二个候选人。
- [业主] 在 Q41 选的是 A，不是 B：[DNLS03-qna.md:593](./DNLS03-qna.md#L593) 把「显式暂缓沙箱交互终端」列为 B，[:605](./DNLS03-qna.md#L605) 签收 A；A 的执行说明第 1 项写明「`owner` 可映射到本地单用户部署的本 env operator；不是任何终端的通配授权；共享 owner 浏览器只能代表一个本地主体」（[:597](./DNLS03-qna.md#L597)）。现行全拒绝在效果上就是 B。
- 漂移来自实现，不来自裁决：`b7f3d34`（Phase 5）为 `canUse: true`；`b3ad7e5` 是一次路由与消费者切换提交，顺带加入排除，没有引用新的 [业主] 决定。计划 [P3-03 b](../plan/DNLS03-managed-sandbox-control.md#L285) 与 [⛔8](../plan/DNLS03-managed-sandbox-control.md#L552) 禁的是「可读**所有**终端」；有了 `principalKey` 与代次校验，A 下 owner 只能读归属自己的终端。
- A 不扩大实际权限：同一 owner 今天已能经 [DNT] 本地 lane 在 macOS 宿主上直接起 shell（`XB-12`），拒绝它使用隔离程度更高的容器内 PTY 不增加保护，只阻断 Case 1。
- B 的反例：真实宿主的结果是「无新建或连接按钮」（[redesign todo:57](../plan/todo.DNLS03-control-redesign.md#L57)），[DNT] 资源页签只在桩测试中跑过（`XB-4`、`XB-13`），`T-O-56` 无从交付。
- C 的反例：[台账 T-O-52](./DNLS03-qna-truth.md#L330)「不批准新票据、operator 密钥或认证插件」；[T-O-44](./DNLS03-qna-truth.md#L228)「不以 localhost、自报角色、硬编 secret 或插件私道代替」；仓规「上层建筑归 host」「不得擅自扩约」。
- 诚实反方：A 下任何通过宿主准入的 `owner` 客户端（含 API token 客户端）都能附着 `owner` 的终端；这与它今天对本机 PTY 的能力相同。若 [业主] 认为 API token 客户端不应获得终端，这是宿主区分 Peer 种类的工作，应作为宿主依赖登记，而不是在插件里推断。

### Q45 — [DNK] 的「彻底关闭」以什么为真源与判据？

**驱动真相**：`T-O-55`（W2）、`T-O-57`（`DNK01 T-O-1`–`T-O-6` 仍为现行合同）、`T-O-58`（K-01–K-07 是输入）；`DNLS03 T-O-36/38/41` 已使大量旧条目改变含义。来源：`XB-7`–`XB-10`；[todo.DNLS03 §7：122–134](../plan/todo.DNLS03.md#L122-L134)。

- **影响范围**：`docs/specs/dsh-nano-kitesurf/` 下 `1119-delivery-gaps`、`1119-loop3-closure`、`1119-local-dev-review`、`design-mode-feedback`、`ego-vs-dnk-gap-analysis`、`final-eval`、`e2e/DNK01-1120-e2e` 七份文档；`DNK01` 台账的实施状态行；[DNK] skills 与 pane；[DNLS] bridge（`DNK01 T-O-1/2/3/6` 的执行方）；仓内与 [DNK] 包内的验收脚本。
- **为什么必须确认**：今天没有一处能回答「[DNK] 关了没有」。同一条目在不同文档里状态互相矛盾（`XB-10`）；`DNK01 T-O-1/2/3/6` 冻结后尚未实施（`XB-7`）；现有验收脚本对受管宿主每一步都会被拒（`XB-9`），无法产出真机证据。没有单一台账和判据，「彻底关闭」无法被证伪。
- **当前建议 / 倾向**：选 **A：在 DNLS03 内建一张 [DNK] 收口台账作为唯一现状真源，硬切旧文档为历史；每一项必须落到一个终态，并按项的性质给出代码、测试或真机证据。**
- **Reasoning**：[DNK] 自 DNLS03 起已是 [DNLS] 的消费者，开放项的执行方大半在 [DNLS]（bridge、`/res`、错误目录），追踪也已经有先例迁入 [todo.DNLS03 §7](../plan/todo.DNLS03.md#L122)。逐份回写七份旧文档，是把同一状态写七遍；只修活缺陷再宣布关闭，则让已冻结的 `DNK01 T-O-3`（[DNK01 e2e:74](../../dsh-nano-kitesurf/e2e/DNK01-1120-e2e.md#L74) 称之为「当前最大的语义缺口」）没有归宿。
- **问题（请 [业主] 裁决）**：[DNK] 的收口，是在 DNLS03 内建一张唯一的现状台账、旧文档冻结为历史并按终态判据关闭（A），逐份更新七份旧文档各自关闭（B），还是只修活缺陷后宣布关闭、其余转入积压（C）？
- **[业主]回答**：已确认 A（2026-11-20：「业主同意你在 [第1轮] 的全部推荐」），冻结为 `T-O-60`。

**【对本问题的解读】**　例：`G04`「DOM 预览须为静态并跟随代次」在代码里已完成，但 `1119-delivery-gaps.md` 仍写 OPEN；`G24`「env 共享 vs session 隔离」已因 `sandboxId` 寻址而失去意义；`DNK01 T-O-3`「接管时拒绝 relay 写」冻结了却没人实现。三者在今天的文档里都叫「开放」。本题只决定**用哪一张表、按什么判据**给它们定终态；哪些条目在本期实现、哪些由 [业主] 推迟，以及 K-01 的 `/res` 归属，留给后续 executional 轮逐项裁决。

**【可选选项清单】**

| 选项 | 真源与判据 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | DNLS03 内一张 [DNK] 收口台账为唯一现状真源；七份旧文档冻结为历史，只在文首加一行指针；每项终态 ∈ {已完成、已作废（引 `T-O`）、本期实现、[业主] 推迟}；DNK01 族改判只在本册登记。 | 一处可查、可证伪；与 `T-O-57` 的单一登记一致。代价：需逐项复核约 70 行，并为对用户或 agent 可见的行为补真机证据。 |
| B | 逐份原地更新七份旧文档，各自闭合。 | 文档保持原结构；同一状态写多处，已出现的漂移（测试数、预算、端口）会继续发生，且旧文档的取证基线是受管前模型。 |
| C | 只修活缺陷（skill 失败、错误展示），宣布关闭，其余转积压；不做真机。 | 最快；`DNK01 T-O-1/2/3/6` 作为已冻结合同悬空，与「不得由实现反推合同」相悖；收口没有真机证据。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **唯一台账**：扩展 [todo.DNLS03 §7](../plan/todo.DNLS03.md#L122) 为「[DNK] 收口台账」。行 = 原编号（`G`/`L`/`V`/`E`/`F`/`X`/`D` 各系列）+ `DNK01 T-O-1`–`T-O-6` + K-01–K-07 + 本次普查的新发现；列 = 执行方（[DNLS]/[DNK]）、终态、证据。普查分类只是初值，施工时逐行复核，不把推断当结论。
2. **硬切旧文档**：七份旧文档正文不再维护、不回改历史，文首各加一行「历史档案；现状以 DNLS03 收口台账为准」。`DNK01` 台账的「实施尚未开始」状态行与部署快照行，同样只追加指向本册的指针；DNK01 族真相的改判只在本册登记（`T-O-57`）。
3. **终态判据**：任何一行不得停在「开放」而无 [业主] 推迟记录。内部行为以代码加测试关闭；对用户或 agent 可见的行为（pane、skill、bridge 写闸、错误展示）还须在 `dsh-dev` 上经显式选择对象的真机重放取证（即 K-06）。旧取证（E1–E15、`final-eval`、`e2e-ego` 27/27）不移用于合并态；受管前的验收脚本在改写或退役前不算证据（`XB-9`）。
4. **范围边界**：A 只定真源与判据，不预选哪些行在本期实现，也不新增 release-gate；台账是 todo，不是闸门。bridge 改动须重建镜像并对开发对象换代（K-03），该授权与时机在后续轮裁定。

**【推荐选项支持证据或其他选项的反例】**

- 已有迁移先例：[DNK01 e2e:79](../../dsh-nano-kitesurf/e2e/DNK01-1120-e2e.md#L79) 已写明「上表各项改由 DNLS03 todo §7 追踪」；[todo.DNLS03:128–134](../plan/todo.DNLS03.md#L128-L134) 已登记 K-01–K-07。A 是把这条已开的路走完，而不是新开一处。
- B 的反例（多处登记已经漂移）：[1119-delivery-gaps.md:362](../../dsh-nano-kitesurf/1119-delivery-gaps.md#L362) 仍宣称全部 OPEN；[1119-loop3-closure.md:84](../../dsh-nano-kitesurf/1119-loop3-closure.md#L84) 仍把五项列为 D 闸口，而 [:97](../../dsh-nano-kitesurf/1119-loop3-closure.md#L97) 写明它们已由 DNLS02 裁决；[final-eval.md:3](../../dsh-nano-kitesurf/final-eval.md#L3) 写 MCP 桥 `:8799`，[:34–36](../../dsh-nano-kitesurf/final-eval.md#L34-L36) 写 59/59 与 27/27，而当前 [DNK] 是 52/52（`XB-13`）；[design-mode-feedback.md:29](../../dsh-nano-kitesurf/design-mode-feedback.md#L29) 写 640 字，代码是 [1100](../../../../dsh-nano-kitesurf/src/shared/note.js#L9)。
- C 的反例（冻结合同会悬空）：[DNK01 台账:21](../../dsh-nano-kitesurf/qna/DNK01-1120-qna-truth.md#L21) 记录 `T-O-1/2/3/6` 未开始；relay 不经写闸（[mcp-bridge.mjs:223](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L223) 对比 [:916–960](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L916-L960)），人工接管今天拦不住 agent 的 relay 写。
- 活缺陷证明「只看代码」不够：skill 的 Step 0 在受管宿主上直接被拒（[SKILL.md:18](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L18) 对比 [managed-routes.js:218–220](../../../../dsh-nano-local-sandbox/src/host/managed-routes.js#L218-L220)），这类问题只有让 agent 在真机上照 skill 执行才会暴露。
- 现有脚本不能作证：[gui-smoke-kitesurf.sh:99–116](../../../../scripts/gui-smoke-kitesurf.sh#L99-L116) 与 [e2e-ego.mjs:83](../../../../dsh-nano-kitesurf/scripts/e2e-ego.mjs#L83)、[:135](../../../../dsh-nano-kitesurf/scripts/e2e-ego.mjs#L135) 不选对象、不带合同头；B、C 若沿用它们取证，得到的是对受管宿主的拒绝。
- 原则：仓规「单一真源」；[业主] 本轮重申「能硬切就不要双写」「能彻底退役就不要提供兼容」；`DNK01` 台账自身也引用 `DNPR01 T-O-4`（能硬切不双写）作为上游法律（[DNK01 台账:9](../../dsh-nano-kitesurf/qna/DNK01-1120-qna-truth.md#L9)）。

## 3. ★ 中场评估 I（Round 1 → Round 2）

- **3.1 对 Round 1 的判定**：两题均由 [业主] 一次性签收 A（2026-11-20：「业主同意你在 [第1轮] 的全部推荐」），无保留、无附加条件，无遗留残题。Q44 是本轮最关键的一手：它决定 W1 能否在真实宿主上交付，并把 `b3ad7e5` 带入的、无裁决来源的「共享 owner 全拒」漂移撤回到 Q41 A 的原意。Q45 则让 W2 第一次有了可证伪的关闭判据。
- **3.2 本轮已锁定真相**：`T-O-59`（宿主 `owner` 是本机唯一用户的稳定主体，可持有并附着自己的沙箱终端）；`T-O-60`（[DNK] 收口的唯一现状真源与四种终态，可见行为须真机重放）。两条都已写入 §1，并写明执行细节与下游约束。
- **3.3 诚实反方制衡**：
  - `T-O-59`：任何通过宿主准入的 `owner` 客户端（含 API token 客户端）都能附着 `owner` 的终端；跨用户隔离仍只有夹具证据。若宿主以后区分 Peer 种类，插件须跟随宿主，不能自己推断。改判同时要求同切包规与测试断言，漏切任何一处都会让文档与行为再次分叉。
  - `T-O-60`：约 70 行需逐行复核；真机重放让收口依赖 `dsh-dev` 可用、镜像重建（K-03）以及测试对象的处置授权。台账一旦被当作发布前置，就会变成未经批准的 release-gate；§1 已写明「台账是 todo，不是闸门」，后续轮须守住。
- **3.4 为什么提出 Round 2（注入 Q46、Q47）**：
  - `T-O-59` 让终端交接从夹具变成真实宿主上的线上路径，它的实现形状因此成为先例。新检索发现，这条路径在 [DNLS] 内写死了 [DNT] 的私有 kind，设计入口也写死了 `kitesurf` kind 且不带目标（`XB-14`）；宿主本身已有按地址认领与候选排名的机制（`XB-15`）。`T-O-60` 又要求 pane 行为真机重放，重放从哪个交接开始必须先定。因此剩下的未定点是：[DNLS] 把所选对象交给其他工作区时用什么公开合同 → **Q46**。
  - `T-O-60` 把 agent 可见行为纳入真机重放，并判受管前脚本「改写或退役前不算证据」，但没有定 agentic e2e 由谁执行、取什么证据，也没有定脚本是改写还是退役。新检索发现，开发站从未运行过 session 内 agent（`XB-17`），而旧脚本仍挂在 `npm test` 与发布手册上（`XB-16`）→ **Q47**。
  - 本轮仍不问：W1–W3 的先后顺序、K-01 `/res` 归属、镜像重建与测试对象处置授权、具体场景清单。它们依赖 Q46/Q47 的答案，留给 executional 轮。

## 4. Round 2 —— foundational：跨插件对象交接合同；真机 agentic e2e 的判据与旧脚本去留（Q46–Q47）

本轮 `retired`，[业主] 直答。每题标明驱动真相。两题可独立作答：Q46 定「对象怎样从 [DNLS] 交到其他工作区」；Q47 定「W3 的真机 agentic e2e 以什么为准、旧脚本怎么处理」。

### Q46 — [DNLS] 把已选中的 sandbox 交给其他工作区（[DNK] 设计、[DNT] 终端）时，用什么公开合同交接？

**驱动真相**：`T-O-59`（终端交接成为真实宿主上的线上路径，形状成为先例）；`T-O-60`（pane 属用户可见行为，须真机重放，交接决定重放起点）；`T-O-56`（「从 [DNLS] 选中的 sandbox 唤起」的目标）；`T-O-57`（如改判，须逐条 append：涉及 `DNLS03 T-O-51` 所含 Q40 A 第 3 项与 `T-O-54`）。来源：`XB-6`、`XB-14`、`XB-15`；[Q43 A 执行说明：637–642](./DNLS03-qna.md#L637-L642)。

- **影响范围**：[DNLS] 控制页的「打开设计工作区」与终端「打开」；[DNK] 页签注册、`SandboxPicker` 与页签 body；[DNLS] 中英文案；公开资源地址清单（属合同）；W3 真机 e2e 的起点。[DNT] 的地址语法与处理器不改。
- **为什么必须确认**：用户在 [DNLS] 选中 B、点「打开设计工作区」后，[DNK] 显示空选择器，必须再选一次 B（开发站已实测，[redesign todo:56](../plan/todo.DNLS03-control-redesign.md#L56)）。同时两处交接都在 [DNLS] 内写死消费者的私有 kind，与 `T-O-54`「不固定私有 kind」相悖（`XB-14`）。新增公开资源类型属于「不得擅自扩约」所指的公共合同，须由 [业主] 决定；它还会改变 Q40 A 第 3 项「[DNK] 独立选择其 sandbox」的读法。
- **当前建议 / 倾向**：选 **A：把 `T-O-54` 的公开资源交接扩展到对象层。[DNLS] 只产出无凭证的 sandbox 对象引用，经宿主 `openResource` 交给已注册的处理器认领；[DNLS] 不写任何消费者 kind；[DNK] 认领后按引用核实并绑定该 sandbox，原选择器保留用于切换。**
- **Reasoning**：宿主已经提供按地址认领和候选排名（`XB-15`），[DNT] 也已按这条路径实现；把同一机制用于设计工作区，既省掉一次重选，又消除两处私有 kind，不新增路由、lane 或凭证。选择仍是用户在 [DNLS] 内的明确手势，符合 `T-O-38` 的「已明确绑定的上下文」。
- **问题（请 [业主] 裁决）**：[DNLS] 向其他工作区交接所选 sandbox，是登记一个公开的对象引用资源、由处理器认领（A），由 [DNLS] 按 [DNK] 的 kind 传页签参数（B），还是维持 [DNK] 内重新选择、只修文案（C）？
- **[业主]回答**：已确认 A（2026-11-20：「业主同意你在 [第2轮] 的全部推荐」），冻结为 `T-O-61`。

**【对本问题的解读】**　例：用户在控制页选中 `dnls03-dev`，点「在设计工作区打开」，[DNK] 页签直接显示 `dnls03-dev` 的页面；之后在 [DNK] 下拉里切到 `dnls03-ui-check` 仍然可以。未安装 [DNK] 时，控制页不出现这个动作，也不打开空页签。若 B 已删除或无权访问，[DNK] 显示拒绝原因，不改投其他对象。本题只定交接用什么合同；不改 [DNT] 地址语法（`T-O-54`），不提供无 session 入口（`XB-5`，仍是宿主依赖），不改授权：引用不授予权限，每个对象请求仍按 `sandboxId` 单独核权。

**【可选选项清单】**

| 选项 | 交接方式 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 公开对象引用 `dsh-resource://sandbox/<envId>/<sandboxId>`（语法同 `T-O-54`：env tag 与 UUID 各为单独路径段；不含主机 URL、session、profile、token）。[DNLS] 用宿主 `candidates(address)` 列出可用的打开动作（标题取处理器自己的 `title`），经 `openResource` 交接；[DNK] 用 `patterns` + `canOpen` 认领，从 `navigation.address` 读取，经 contract 与定向 inspect 核实后绑定。终端入口同时去掉 `'dnt-sandbox-terminal'` 字面量。 | 一次选择到底；[DNLS] 不认识任何消费者，第三方处理器同样可以认领。代价：新增一个公开资源类型（合同扩展）；须对 Q40 A 第 3 项作澄清式 supersession；[DNK] 页签要从单一页类型扩展为可按引用打开。 |
| B | `openTab('kitesurf', { params: { envId, sandboxId } })`，[DNK] 为该 kind 声明参数。 | 改动最小；但 [DNLS] 继续点名 [DNK] 的私有 kind 与参数形状，等于两个插件之间的专有约定；终端与设计两种交接方式并存。 |
| C | 维持现状：[DNK] 内重新选择，只改文案；终端入口不动。 | 无合同变更；用户每次重选，可能选错对象；[DNLS] 内两处私有 kind 留存，与 `T-O-54` 的冲突没有消除。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **真相登记**：在本册 append 新的公开资源类型 `sandbox`：`dsh-resource://sandbox/<envId>/<sandboxId>` 只标识**已存在**的受管 sandbox；各 ID 的校验与编码同 `T-O-54`；不编码主机 URL、session、profile、服务、命令或 token；不承诺跨主机可用；引用不授予权限。同时澄清 Q40 A 第 3 项「[DNK] 独立选择其 sandbox」：[DNK] 不与 [DNLS] 共享选择状态，也不从 [DNLS] 推断默认对象；经宿主导航收到的明确对象引用，视为用户的明确选择（`T-O-38`）。`T-O-54` 原文不改，只补齐其中「不固定私有 kind」的实施。不新增错误枚举、路由或 lane。
2. **[DNLS] 硬切**：删除 `kitesurf()`、`openKitesurf`、`openWorkspaceHint`、`workspaceMissing` 与 `'dnt-sandbox-terminal'` 判断，不留旧分支。对象页按 `candidates(对象地址)` 列出「在〈处理器标题〉中打开」，没有候选就显示不可用。终端「打开」改为判断 `candidates(终端地址)` 是否非空；没有候选时沿用 `T-O-54` 的「已创建未连接 / 明示不可用」。对象地址的构造放在 [terminal-resource.js](../../../../dsh-nano-local-sandbox/src/host/terminal-resource.js#L1-L9) 同一模块，复用同一组校验。
3. **[DNK] 认领**：在现有 `sidebarRightTabs.register` 上增加资源认领（`patterns: ['dsh-resource://sandbox/**']` 加规范语法的 `canOpen`）。页签 body 从 `navigation.address` 取引用，先 `GET /contract` 再定向 inspect，核对 `sandboxId` 与 `envId`（与 [DNT `resolveSandboxResource`](../../../../dsh-nano-terminal/src/client/sandbox-resource.js#L46-L77) 相同），通过后等价于一次 `choose(sandboxId)`；核实失败就显示原因，不回落到第一行。原 `kitesurf` 页类型与空选择器保留作通用入口，仍不自动选中。「每个引用一个页签还是复用单页签」「是否在 body 内检查 profile 是否提供设计能力」归 executional 轮。
4. **验收**：单测覆盖地址语法、零/一/多候选、核实失败不改投；`dsh-dev` 真机：工作台选中 B → 在设计工作区打开 → [DNK] 显示 B 的页面 → 切到另一对象 → 再从控制页打开 B；未装 [DNK] 时无此动作。结果记入 `T-O-60` 的收口台账。

**【推荐选项支持证据或其他选项的反例】**

- 现行交接点名私有 kind：[index.jsx:834–841](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L834-L841) 写死 `'kitesurf'` 与 `'dnt-sandbox-terminal'`；[i18n.js:102](../../../../dsh-nano-local-sandbox/src/client/i18n.js#L102) 要求用户「在 Kitesurf 内选同一个 sandbox」。而 [Q43 A 第 1 项：637](./DNLS03-qna.md#L637) 与 [台账 T-O-54:354](./DNLS03-qna-truth.md#L354) 写明「任何符合合同的处理器均可注册；不固定 [DNT] 私有 kind」。
- 重选成本已在实机出现：[redesign todo:56](../plan/todo.DNLS03-control-redesign.md#L56) 记录「[DNK] 出现无预选的对象选择器 → 显式选择相同 ID」；[todo.DNLS03:117](../plan/todo.DNLS03.md#L117) 同样。
- 宿主机制已经齐全：[service.ts:228–243](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/service.ts#L228-L243)（`openResource` 按认领排名，无人认领即抛错）、[:179–183](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/service.ts#L179-L183)（`kind`/`params`）；[tab-registry.ts:342–364](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/tab-registry.ts#L342-L364) 返回排好序的候选。Q43 签收 A 时已以候选查询作为「确认正式处理能力」的依据（[DNLS03-qna.md:642](./DNLS03-qna.md#L642)）。
- 先例可直接复用：[DNT index.js:51–70](../../../../dsh-nano-terminal/src/client/index.js#L51-L70) 以 `patterns` + `canOpen` 认领，并从 `navigation.address` 取地址；[sandbox-resource.js:46–77](../../../../dsh-nano-terminal/src/client/sandbox-resource.js#L46-L77) 先核 contract 与 inspect，不创建任何东西。
- [DNK] 已具备绑定所需的一切：[`choose`:2993–3007](../../../../dsh-nano-kitesurf/src/client/index.js#L2993-L3007) 经 `client.bind(sandboxId)` 绑定；缺的只是认领（[注册:3054–3067](../../../../dsh-nano-kitesurf/src/client/index.js#L3054-L3067) 无 `patterns`）和读取导航（[Pane:3047–3052](../../../../dsh-nano-kitesurf/src/client/index.js#L3047-L3052) 不读页签属性）。
- 与 `T-O-38` 一致：[台账:130](./DNLS03-qna-truth.md#L130) 允许「已明确绑定的上下文」；「只有一个候选也不自动选中」不受影响，因为选择发生在 [DNLS] 内，是用户手势。
- B 的反例：[params.ts:31–40](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/contract/params.ts#L31-L40) 中页签参数按 kind 定型，[DNLS] 必须知道 [DNK] 的 kind 与参数形状，构成插件间专有约定（仓规「不得侧载」）；终端走资源、设计走页签参数，两套交接并存。
- C 的反例：Q40 A 第 3 项（[DNLS03-qna.md:555](./DNLS03-qna.md#L555)）要求 [DNK] 独立负责设计与 CDP 消费，并没有要求用户必须重选；保留重选也消除不了 `XB-14` 的两处 kind 字面量。
- 诚实反方：A 是一次合同扩展，须本次由 [业主] 登记。`sandbox` 地址任何处理器都可认领，[DNK] 的 `canOpen` 只能检查语法，无法同步判断该对象的 profile 是否提供设计能力，须在 body 内核实并明示「此对象不提供设计能力」。`openResource` 仍要求已挂载 session（`XB-5`），A 不改变这一点。

### Q47 — W3 的「ego-browser 真机 agentic e2e」以什么为准：谁操作、取什么证据、受管前脚本怎么处理？

**驱动真相**：`T-O-55`（W3 要求完成 ego-browser 真机 agentic e2e）；`T-O-59`（W1 真实宿主判据即 `T-O-39` 辨真流程）；`T-O-60`（用户或 agent 可见行为须在 `dsh-dev` 经显式选择对象真机重放；受管前脚本「改写或退役前不算证据」，留下改写还是退役未定）。来源：`XB-7`、`XB-8`、`XB-16`、`XB-17`；[redesign todo P4:9](../plan/todo.DNLS03-control-redesign.md#L9)。

- **影响范围**：W1/W2/W3 的全部真机验收；[DNK] skill 的验证方式；`dsh-nano-kitesurf/scripts/` 下的 `e2e-ego.mjs` 与三份 `eval-*.mjs`、`scripts/gui-smoke-kitesurf.sh`、[DNK] 的 `test:e2e` 与 `test/e2e-script.test.mjs`、`RELEASE.md:97`；开发站上的模型调用授权。
- **为什么必须确认**：`T-O-60` 把 agent 可见行为纳入真机重放，但开发站至今没有运行过任何 session 内 agent（`XB-17`）。skill 在受管宿主上的失败（`XB-8`）和 relay 写闸缺失（`DNK01 T-O-3`，`XB-7`）只有真实 agent 照 skill 动手才会暴露。另一方面，受管前脚本仍接在 `npm test` 与发布手册上（`XB-16`）；`T-O-60` 已判它们不算证据，却没定改写还是退役。不定这两点，W3 的「完成」没有可证伪的判据。
- **当前建议 / 倾向**：选 **A：真机 agentic e2e = 在 `dsh-dev` 上、已核对安装制品的同一真实 session 内，由两类操作者走完场景：① 执行者经 ego-browser 以用户手势操作 [dsh工作台]；② session 内的 [dsh] agent 以真实模型回合，按 [DNK] skill 对显式选定的 sandbox 动手。场景与结果记入 DNLS03 补充计划与 todo；受管前脚本整批退役，不改写，也不另立脚本化套件或 release-gate。**
- **Reasoning**：[业主] 指定的是 agentic e2e，不是脚本回归。skill 与 relay 写闸是写给 agent 的合同，只有 agent 真的执行才能证伪。改写脚本会把开发站 URL 和 DOM 选择器固化成第二份验收真源，与 `T-O-60` 的单一台账重叠；退役已有先例（`34ac32e`）。
- **问题（请 [业主] 裁决）**：W3 的真机 agentic e2e，是用户手势加 session 内 agent 真实回合的双操作者真机运行、受管前脚本整批退役（A），只做 ego-browser 用户面、skill 以静态审查和单测关闭、旧脚本保留为可选 smoke（B），还是把旧脚本改写为受管版作为验收主体、agentic 运行可选（C）？
- **[业主]回答**：已确认 A（2026-11-20：「业主同意你在 [第2轮] 的全部推荐」），冻结为 `T-O-62`。

**【对本问题的解读】**　例：W2 有一行「agent 遇到 `humanHold` 立刻停写」。执行者先在 [DNK] 内接管 B，再让 session 内的 agent 按 `/kitesurf-cdp` 对 B 点击一个按钮。合格的结果是：agent 的写被拒，agent 停止并交还控制，页面没有被改动。今天 relay 不经写闸（`XB-7`），这一行会失败，而这正是要暴露的问题。W1 的那一行就是 `T-O-59` 执行细节中的辨真流程。本题只定 e2e 的形态、证据与旧脚本去留；具体场景清单、W1–W3 顺序、镜像重建与测试对象处置授权，归 executional 轮。

**【可选选项清单】**

| 选项 | e2e 形态 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 双操作者真机运行：ego-browser 用户手势 + session 内 agent 真实模型回合。证据 = 安装制品与页面实际加载字节一致、对象 ID 与操作号、截图、session 标识与 agent 回合结论。受管前脚本整批退役。 | 用户面与 agent 面都在真机上可证伪；没有第二份验收真源。代价：须 [业主] 授权在 `dsh-dev` 向测试 session 发送模型消息（使用宿主已配置的凭证，不新增凭证）；每次验收靠 agent 执行，不是一条命令重跑。 |
| B | 只做 ego-browser 用户面；skill 以静态审查与单测关闭；旧脚本保留为可选 smoke。 | 无需模型调用；但 skill 与 relay 写闸没有真机证据，不满足 `T-O-60`「agent 可见行为须真机重放」；保留旧脚本等于兼容受管前形态。 |
| C | 把 `e2e-ego.mjs`、`gui-smoke-kitesurf.sh` 改写为受管版，作为验收主体；agentic 运行可选。 | 可一键重复；但脚本写死开发站 URL 与 DOM，成为与台账并列的第二份验收真源；agent 面仍无证据；`e2e-script.test.mjs` 这类对脚本正文的断言继续存在。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **真相登记**：在本册登记「W3 真机 agentic e2e」的定义。环境：`dsh-dev` rc.5 web profile，安装经 SHA-256 核对的候选制品，并核对页面实际加载的 client 字节。入口：真实 session 的 [dsh工作台]（无 session 入口仍是宿主依赖，`XB-5`）。操作者：① 执行者经 ego-browser 操作；② session 内 agent。每个场景先显式选择对象；正反分支分开登记；软件回归与真机证据分开（沿用 [redesign P4:9](../plan/todo.DNLS03-control-redesign.md#L9)）。
2. **场景来源与证据位置**：不另立场景册。场景 = `T-O-60` 台账中「用户或 agent 可见」的行 + W1（`T-O-59` 辨真流程）+ W3 管理页的行；场景写在 DNLS03 补充计划，结果回填 todo 对应行。截图与回合记录沿用 `.anote/reviews/dsh-nano-local-sandbox/DNLS03/`；文档只记操作号、截图名、session 标识与结论，不贴会话正文、cookie 或 token。
3. **agent 回合的判据**：只在显式选定的开发测试对象上进行；提示词只给任务和对象名，不提示绕过方法。判据看协议行为：是否按 skill 带上 `sandboxId`、是否遵守 `humanHold`、是否只对所选对象写；不看措辞。失败就是台账行失败，不为迁就单次结果改写 skill。选 A 即授权在 `dsh-dev` 向测试 session 发送 e2e 所需的模型消息，使用开发站已配置的宿主凭证；次数与时机在 executional 轮定。
4. **受管前脚本退役**：删除 `dsh-nano-kitesurf/scripts/e2e-ego.mjs`、`eval-design-mode.mjs`、`eval-ego-vs-dnk.mjs`、`eval-proto-mcp.mjs`；删除 [DNK] `package.json` 的 `test:e2e` 与 `test/e2e-script.test.mjs`；删除 `scripts/gui-smoke-kitesurf.sh`，并改写 `RELEASE.md:97`。不留别名或兼容开关。[DNK] 包测试数会因此下降，属预期。历史文档中的引用不回改（`T-O-60` 已冻结为历史）。
5. **边界**：不新增 release-gate，`RELEASE.md` 不新增必跑项。本题不授权镜像重建、测试对象退役或擦卷，这些归 executional 轮。

**【推荐选项支持证据或其他选项的反例】**

- [业主] 的指令原文是「完成 ego-browser 的真机 agentic e2e 测试」（`T-O-55`）；[redesign P4:9](../plan/todo.DNLS03-control-redesign.md#L9) 已定用户面的做法：「从真实 session 点入」，桌面与 390 CSS px，软件回归与实机正反分支分开。
- agent 面从未取证：[todo.DNLS03:111](../plan/todo.DNLS03.md#L111)「不发送模型消息」；[:117–118](../plan/todo.DNLS03.md#L117-L118) 的 [DNK]/[DNT] 正向操作都由测试者完成。
- skill 是给 agent 的合同：[SKILL.md:18](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L18)、[:21–27](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L21-L27) 让 agent 读无目标的诊断与状态、取 relay socket；[:39](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L39) 的「`humanHold.active:true` 时立刻停写」只有真实 agent 写入时才可验证。relay 现不经写闸（[mcp-bridge.mjs:223](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L223) 对比 [:916–960](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L916-L960)），[DNK01 e2e:74](../../dsh-nano-kitesurf/e2e/DNK01-1120-e2e.md#L74) 称之为「当前最大的语义缺口」。
- 旧脚本仍在起作用：[package.json:11](../../../../dsh-nano-kitesurf/package.json#L11)；[e2e-ego.mjs:12](../../../../dsh-nano-kitesurf/scripts/e2e-ego.mjs#L12) 写死 `https://dsh-dev.local/`；[e2e-script.test.mjs:8–24](../../../../dsh-nano-kitesurf/test/e2e-script.test.mjs#L8-L24) 在 `npm test` 中断言脚本正文，是对测试脚本的测试；[RELEASE.md:97](../../../../RELEASE.md#L97) 把 `gui-smoke-kitesurf.sh` 全 PASS 当作「真的可用」，而该脚本查的是不带目标的 `/ports`、`/selftest`（[:11–17](../../../../scripts/gui-smoke-kitesurf.sh#L11-L17)），在受管宿主上会被拒。
- 退役有先例：`34ac32e` 删除 [DNLS] 侧 e2e 副本，由 [DNK] 持有唯一 pane e2e（[1119-loop3-closure.md:156](../../dsh-nano-kitesurf/1119-loop3-closure.md#L156)）；DNLS01 计划明令「不把旧 `e2e-ego.mjs` 的绿灯写成 [DNLS] 对等」（[DNLS01 计划:595](../plan/DNLS01-macos-platform-cutover.md#L595)）。
- B 的反例：`T-O-60` 明列「skill、bridge 写闸」须真机重放；静态审查与单测证明不了 agent 会照 skill 带上 `sandboxId`。保留旧脚本与 [业主]「能彻底退役就不要提供兼容」相悖。
- C 的反例：改写后的脚本仍写死开发站 URL 与 DOM，与收口台账并列成为第二份验收真源（仓规「单一真源」「不得过度仪式」）；agent 面依旧空白。
- 诚实反方：A 需要模型调用，有成本，回合结果也有不确定性，所以判据只看协议行为。去掉一键 smoke 后，以后每次部署的复核要由 agent 按场景重跑；若 [业主] 以后需要可重复的最小 smoke，应按受管合同重新论证后新立，不从旧脚本继承。

## 5. ★ 中场评估 II（Round 2 → Round 3）

- **5.1 对 Round 2 的判定**：两题均由 [业主] 一次性签收 A（2026-11-20：「业主同意你在 [第2轮] 的全部推荐」），无保留、无附加条件。Q46 让 [DNLS] 不再认识任何消费者：设计与终端两处交接都改走宿主按地址认领，`T-O-54` 中「不固定私有 kind」第一次被完整实施。Q47 让 W3 的「完成」有了可证伪的定义，同时退役了仍挂在 `npm test` 和发布手册上的受管前脚本。至此 foundational 两轮四题收束，后续进入 executional，每轮三题。
- **5.2 本轮已锁定真相**：`T-O-61`（公开对象引用 `dsh-resource://sandbox/<envId>/<sandboxId>` 与处理器认领）；`T-O-62`（双操作者真机 agentic e2e 的定义、判据、证据位置与旧脚本退役）。两条都已写入 §1，并写明执行细节与下游约束。Q46 留下两项实现细节（页签复用、body 内核实设计能力）待后续 executional 轮。
- **5.3 诚实反方制衡**：
  - `T-O-61`：新增了一个公开资源类型，任何处理器都能认领；[DNK] 的 `canOpen` 只能检查语法，无法同步判断对象的 profile 是否提供设计能力，必须在 body 内核实并明示。`openResource` 仍要求已挂载 session，无 session 入口仍是宿主依赖。
  - `T-O-62`：模型调用有成本，回合结果有不确定性，因此判据只看协议行为。更要紧的是，本轮复核发现 agent 在受管宿主上**根本到不了** skill 所写的入口（`XB-20`），接管闸也认不出谁是 agent（`XB-18`、`XB-19`）。照现状开跑，agent 场景只会得到「401」和「接管拦不住」两种失败，证明不了任何协议行为。这两点不先定，`T-O-62` 只能交付失败记录。
- **5.4 为什么提出 Round 3（注入 Q48、Q49、Q50）**：
  - `T-O-60` 把 bridge 写闸列为须真机关闭的行，`T-O-62` 把「agent 遵守 `humanHold`」定为判据。新检索发现：pane 的写与 agent 的写走同一个 relay（`XB-18`）；MCP 一侧的豁免靠自报名，接管开关在发布端口上无人把守（`XB-19`）；relay 一侧没有写判据（`XB-21`）。`DNK01 T-O-3` 要求「只拦 agent、不锁人」，但没有定桥用什么认出 agent → **Q48**。
  - `T-O-62` 要求 session 内 agent 照 skill 对显式选定的对象动手，`T-O-59` 已确认 owner 是本机唯一用户。新检索发现，agent 的 shell 请求被宿主准入挡在 401，[DNLS] 没有注册任何模型工具，宿主 slash 命令也不送模型（`XB-20`）；`DNK01 T-O-1` 的打开面若落在 HTTP `/mcp`，agent 同样被挡 → **Q49**。
  - `T-O-55` 把三项工作的顺序留给本册，`T-O-60` 把镜像重建与换代的授权留给后续轮，`T-O-62` 把模型消息次数与时机留给 executional 轮。新检索发现，桥在镜像配方内，开发站名额已满，清场顺序写好却缺授权（`XB-22`）→ **Q50**。
  - 本轮仍不问：Q46 留下的页签复用与设计能力核实、K-01 `/res` 归属、K-04 隧道 hint、K-05 失败体降级、W3 管理页 P2 设计裁决。它们不阻塞 Q48–Q50，留给下一轮 executional。

## 6. Round 3 —— executional：relay 写闸怎样认出 agent；session 内 agent 的受管入口；施工顺序与开发站授权（Q48–Q50）

本轮 `retired`，[业主] 直答。每题标明驱动真相。三题可独立作答：Q48 定桥怎样区分宿主与 agent 并让接管对 agent 成立；Q49 定 agent 从哪里拿到目标、relay 与打开面；Q50 定施工顺序，以及开发站上的镜像、测试对象与模型消息授权到什么程度。

### Q48 — relay 写闸怎样区分「[DNLS] 宿主自身的连接」与「agent 的连接」，并让接管对 agent 真正生效？

**驱动真相**：`T-O-60`（bridge 写闸是 agent 可见行为，须代码、测试加真机关闭；bridge 改动须重建镜像并换代）；`T-O-62`（判据之一是 agent 遵守 `humanHold`）；`T-O-57`（`DNK01 T-O-2/3` 现行，细化在本册 append，DNK01 侧只留指针）；现行 `DNK01 T-O-3`「拦截面只覆盖 agent 主体（MCP 与 relay）；人在 pane 上的 REST 动作不受约束」、`DNLS03 T-O-44`「不以自报角色代替」。来源：`XB-7`、`XB-18`、`XB-19`、`XB-21`；[todo.DNLS03 K-03：130](../plan/todo.DNLS03.md#L130)。

- **影响范围**：`profiles/kitesurf/mcp-bridge.mjs` 的 relay、MCP 写闸、`sandbox.control` 与 `/control`；[DNLS] 宿主的 CDP 连接（`connectCdp`、`object-pages.js` 的 `connect`）与 Apple backend 的 `container exec` 写入；镜像配方与镜像内 helper；[DNK] 控制条（`DNK01 T-O-2` 两档）；skill 中关于 held 的文案。
- **为什么必须确认**：`DNK01 T-O-3` 只许拦 agent，不许锁人。可是 pane 的写由 [DNLS] 宿主经同一个 `/cdp` relay 执行，relay 握手只看 Origin、缺 Origin 就放行（`XB-18`），在桥看来宿主与 agent 是一样的匿名连接。照字面实现只能二选一地出错：要么连人一起锁死（`DNK01 F4` 要避免的），要么什么也拦不住。MCP 一侧的豁免今天比较的是客户端自报的 `clientInfo.name`，`POST /control` 也接受任何不带 Origin 的 JSON 请求（`XB-19`）：agent 把自己命名为 `human` 就能绕过接管，或直接替人 release。若用宿主专用的凭据来区分，它属于「不得擅自扩约」所指的凭证面，而 `T-O-44/52` 又有「不以硬编 secret 代替」「不批准新票据、operator 密钥」的原句，必须由 [业主] 判断。
- **当前建议 / 倾向**：选 **A：桥以「[DNLS] 宿主经可信 `container exec` 通道写入容器的代次随机凭据」认出宿主连接；没有当前代次凭据的 relay 与 MCP 连接一律是 agent 类。接管期间，agent 类连接只放行读方法白名单，其余全部拒绝；`/control` 的接管与释放只接受宿主类；`clientInfo.name` 不再带来任何豁免；`relay.conns` 只计 agent 类连接。**
- **Reasoning**：桥能可靠知道的，只有「谁持有只有宿主才能放进容器的东西」。宿主已经有一条不经发布端口的可信写入通道（`XB-19`），用它投放代次凭据，不对任何客户端或插件发证。按路径或名字区分，agent 自己就能伪造，违反 `T-O-44` 与宿主「在做决定的操作里执行」的规则。接管期间用白名单，未列出的写方法默认被拒，「接管」才在所有写路上成立。
- **问题（请 [业主] 裁决）**：relay 与 MCP 的接管闸，是以宿主经 `container exec` 投放的代次凭据认出宿主连接、其余一律按 agent 处理（A），以独立路径或自报名区分（B），还是不区分、接管期间 relay 一律拒写并把 pane 的写改走其他通道（C）？
- **[业主]回答**：已确认 A（2026-11-20：「业主同意你在 [第3轮] 的全部推荐」），冻结为 `T-O-63`。

**【对本问题的解读】**　例：人在 [DNK] 点「接管」，然后在 pane 上点一个按钮；同时 session 内的 agent 照 skill 经 relay 发 `Input.dispatchMouseEvent`。合格的结果：人的点击照常生效（宿主经 relay，出示宿主凭据）；agent 的命令收到 CDP error `kitesurf.control.held`，页面上不出现 agent 的点击，控制条显示一次被拦回执；agent 读 DOM（`DOM.getDocument`）仍然可以，`Runtime.evaluate` 被拒并说明「读也需人先放开」。agent 改名为 `human`，或直接 `POST /control {action:release}`，都无效。本题不改 `DNK01 T-O-3` 的错误码与拦截面，只定「桥怎样认出 agent」和「接管期间哪些方法放行」；skill 正文与 agent 入口见 Q49，镜像重建与换代的时机见 Q50。

**【可选选项清单】**

| 选项 | 区分方式 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 代次宿主凭据：[DNLS] 在每次创建、启动或采纳运行中的对象时生成随机值，经 `container exec` 以 root 调镜像内 helper、经 stdin 写入只有桥能读的位置；宿主的 relay 握手在请求头出示，桥逐次比对；无凭据即 agent 类。接管期间 agent 类按读白名单放行；`/control` 写与 `sandbox.control takeover` 只对宿主类生效；去掉 `clientName` 豁免；`relay.conns` 只计 agent 类。 | 接管对 agent 的所有写路真实成立；人不被锁；不对外发证。代价：[DNLS] 内部多一个「宿主 ↔ 自身容器」的秘密，须本次登记；helper 与镜像要改；宿主重启采纳对象时要重投；白名单须随 agent-browser 升级复核。 |
| B | 按路径（如另开 `/cdp-host`）或按 `clientInfo.name` 区分 | 改动最小；但任何能连回环端口的进程都能冒充宿主，接管可被绕过；与 `T-O-44`「不以自报角色代替」和宿主「在做决定的操作里执行」相悖。 |
| C | 不区分：接管期间 relay 对所有连接拒写，pane 的写改走 relay 以外的通道（如直连引擎） | 无新秘密；但引擎为每个直连各造一个私有页（[mcp-bridge.mjs:211–221](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L211-L221)），pane 改直连后就不再是人看到的那一页，`DNLS02 T-O-25` 的同页协作被破坏。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **真相登记**（DNK01 族改判在本册 append，DNK01 侧只留指针，`T-O-57`）：
   - `DNK01 T-O-3` 的「agent 主体」= 未出示当前代次宿主凭据的 relay 与 MCP 连接；`clientInfo.name` 不构成身份。
   - `DNK01 T-O-3` 的写集合按「接管期间只放行读白名单」实施。白名单只含不改变页面、导航、输入、存储与仿真状态的方法，例如 `*.enable`/`*.disable`、`DOM.getDocument`/`querySelector*`/`describeNode`/`getBoxModel`、`CSS.getComputedStyleForNode`、`Accessibility.getFullAXTree`、`Page.captureScreenshot`、`Target.getTargets`/`attachToTarget`。`T-O-3` 点名的 `Page.navigate`、`Input.*`、`Runtime.evaluate` 必在拒绝侧。被拒的写先记 `lastAction`，不更新 `lastAt`，不改 `writer` 锁，不排队、不重放（沿用 `T-O-2/3`）。
   - `DNK01 T-O-2` 的 `relay.conns` = 当前 agent 类连接数；宿主常驻连接不计，否则 `DNK01 F6` 的「恒真」会重现。
   - 宿主连接凭据：每代次随机生成；只经 `container exec` 投放；只存在于 [DNLS] 宿主内存与容器内受保护文件；不出现在任何 HTTP/MCP 响应、操作台账、审计、日志、截图或 skill 中；不跨对象；不授予任何主体任何权限，只证明「这条连接来自 [DNLS] 宿主进程」。它不是对外凭证，也不是 `T-O-44/52` 所禁的「代替可信身份」的票据或 operator 密钥。
   - 不新增 errorId：拒写沿用 `kitesurf.control.held`；agent 类调用 `sandbox.control takeover` 沿用 `kitesurf.control.query`；未授权的 `/control` 写沿用 403。不新增路由或 lane。
2. **桥实现**：relay `handle` 在握手时定类；agent 类连接在 `humanHold.active` 时，对白名单外的方法回 CDP error，不转发；宿主类不受约束。MCP 闸（[:933](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L933)、[:731](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L731)）改为按连接类别判断。`/control` 的 GET 照旧只读；POST 无有效凭据即 403。`controlSnapshot` 按 `T-O-2` 增 `relay: {conns, lastAt, lastMethod}`，`lastMethod` 只存方法名。
3. **宿主实现**：Apple backend 增加投放凭据的 exec（与 `publishHealth` 同一模式：root helper、stdin、`env -i`，[backend-apple.js:476–499](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L476-L499)）；`connectCdp` 在 relay 握手时带上凭据；创建、启动、换代与宿主重启后的采纳都重投并作废旧值；投放失败时对象页不连 relay，沿用 503 失败关闭。[DNK] 控制条按两档显示 relay，并对被拦的一次给回执。
4. **验收**：单测覆盖——宿主类在接管中写入成功；agent 类写入被拒且 `lastAction` 更新、`lastAt` 不变；自报 `human` 无效；无凭据 `POST /control` 403；白名单读放行；换代后旧凭据失效；凭据不出现在任何响应体。真机按 `T-O-62` 由 session 内 agent 执行「接管中写入被拒并停写」，结果记入 `T-O-60` 台账的 `DNK01 T-O-2/3` 行。镜像重建与换代按 Q50。

**【推荐选项支持证据或其他选项的反例】**

- 宿主与 agent 走同一 relay：[object-pages.js:106–110](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L106-L110) 的 `relayUrl`；[cdp-elements.js:571–575](../../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L571-L575)；skill 让 agent 连同一地址（[SKILL.md:23](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L23)）。relay 转发不读 `control`（[mcp-bridge.mjs:382–408](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L382-L408)），注释写明「bypass the MCP writer lock by design」（[:1134–1136](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L1134-L1136)）。
- 握手只看 Origin：[:79–86](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L79-L86) 注释「A missing Origin means a non-browser client such as the DSH host agent — allowed」，宿主与 agent 都不带 Origin。
- 自报名豁免与无人把守的开关：[:912–915](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L912-L915) 取 `clientInfo.name`；[:933](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L933) 以它豁免；[:1063](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L1063) 缺省 owner 为 `'human'`；[:1048–1052](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L1048-L1052) 只拒带 Origin 或非 JSON 的请求。
- 可信通道已经存在：[backend-apple.js:476–499](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L476-L499) 写明「never argv, never the published HTTP port」；桥侧 `/diagnostics` 的 POST 也因此被硬拒（[mcp-bridge.mjs:1088–1101](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L1088-L1101)）。A 复用同一信任根，不新开通道。
- 白名单的必要性：MCP 侧写判据是工具名正则（[:766–770](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L766-L770)），relay 侧没有判据；`T-O-3` 点名三类（[DNK01 台账:58](../../dsh-nano-kitesurf/qna/DNK01-1120-qna-truth.md#L58)），而 CDP 改变页面的方法不止三类（`XB-21`）。黑名单漏一个就让接管失效，白名单误拒一个只影响接管期间的某个读。
- B 的反例：[台账 T-O-44:228](./DNLS03-qna-truth.md#L228)「不以 localhost、自报角色、硬编 secret 或插件私道代替」；宿主规则「Enforce a decision in the operation that makes it … not enforcement when direct or alternate callers can bypass them」（[packages/AGENTS.md:16](../../../../.dependencies/pinned/deepseek-harness/packages/AGENTS.md#L16)）。
- C 的反例：[mcp-bridge.mjs:211–221](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L211-L221) 说明 relay 正是为「一页多客户端」而设；同页协作是 `DNLS02 T-O-25` 的现行合同（[台账:407](./DNLS03-qna-truth.md#L407)）。
- 诚实反方：A 新增一个内部秘密。它是每代次随机、不硬编、不交给任何主体，但 [台账 T-O-52:330](./DNLS03-qna-truth.md#L330) 有「不批准新票据、operator 密钥」的原句，是否认为 A 落在该禁令之外，须 [业主] 明确。白名单可能误拒 agent-browser 的某个读，须在真机上校准，误拒只发生在接管期间。凭据保护的是「人在接管时的拒绝权」，不是多用户隔离；若宿主以后提供容器侧的调用方身份，应改用宿主机制并退役本凭据。

### Q49 — session 内 agent 以什么受管入口取得目标、relay 地址与打开面？

**驱动真相**：`T-O-62`（agent 以真实模型回合，按 skill 对显式选定的对象动手；判据看是否带 `sandboxId`）；`T-O-59`（宿主 `owner` 是本机唯一用户的稳定主体）；`T-O-60`（skill 属 agent 可见行为，须真机重放）；`T-O-57`（`DNK01 T-O-1` 现行，细化在本册 append）；现行 `DNLS03 T-O-38`（显式选择，只有一个候选也不自动选中）、`T-O-44`（请求准入不是对象授权）。来源：`XB-8`、`XB-20`。

- **影响范围**：[DNLS] 宿主 inject 与新增的模型工具注册；能力分派器（HTTP、`/mcp` 已共用）；[DNK] 两份 skill 的正文（单一真源 `lib/skill.js` + `src/skill/`，`skills/` 由构建生成）；`DNK01 T-O-1` 与 K-02 的落点；`T-O-62` 中 agent 场景的起点。
- **为什么必须确认**：`T-O-62` 要求 session 内 agent 照 skill 动手，但受管宿主上 agent 没有任何可用入口（`XB-20`）：skill 让它读 `/diagnostics`、`/status`，这些路由都在宿主准入之后，agent 的 shell 没有会话 cookie，得 401；[DNLS] 没有注册模型工具；宿主 slash 命令是人用的，不送模型；relay 地址只在已认证的 `/status` 里。`DNK01 T-O-1` 的「宿主 MCP 工具 `sandbox.open`」若落在 [DNLS] 的 HTTP `/mcp`，agent 同样被 401 挡住。不定入口，agent 场景没有可执行的起点；新增入口是新的公共调用面，须 [业主] 登记。
- **当前建议 / 倾向**：选 **A：[DNLS] 经宿主 `tools` 服务注册少量模型工具，作为既有能力分派器的投影：列出可见对象、读取所选对象的状态（含 relay 地址）、在所选对象中打开页面（即 `DNK01 T-O-1`）、读取接管状态。所有对象工具都必须带显式 `sandboxId`；[DNK] skill 按此重写。**
- **Reasoning**：宿主为「插件给模型提供能力」准备的正式接缝就是 `tools`。工具调用发生在 owner 自己的 session 内，按 `T-O-59` 主体就是 owner，再经同一个 `authorize` 核对象。这样不发 token、不放松路由准入、不新开 HTTP 面；HTTP、`/mcp` 与工具三个入口共用一个能力 owner 与分派器（`DNLS02 T-O-19/20`）。
- **问题（请 [业主] 裁决）**：session 内 agent 的受管入口，是 [DNLS] 注册宿主模型工具、作为能力分派器的投影（A），由用户从控制页复制 `sandboxId` 与 relay 地址交给 agent、agent 只用 relay（B），还是给 agent 一个宿主 API token、让它直接调用 HTTP 路由（C）？
- **[业主]回答**：已确认 A（2026-11-20：「业主同意你在 [第3轮] 的全部推荐」），冻结为 `T-O-64`。

**【对本问题的解读】**　例：用户在 session 里说「在 `dnls03-dev` 上打开 example.com，点 More information」。按 A：agent 调列表工具看到 `dnls03-dev` 及其 ID；调打开工具 `{sandboxId, url}`；再调状态工具取 relay 地址交给 `agent-browser --cdp` 点击。用户只说「打开 example.com」而没有指定对象时，agent 列出对象并询问，不自己挑，即使只有一个候选（`T-O-38`）。若人已接管，打开工具与 relay 写都被拒，agent 停下并告知用户。本题只定 agent 的入口与 skill 取目标的方式；relay 写闸见 Q48；工具的具体名称与描述措辞属实现细节。

**【可选选项清单】**

| 选项 | agent 入口 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | [DNLS] 注入宿主 `tools`，注册四个模型工具（暂名：列表、状态、打开、接管状态），每个都调用现有能力分派器；主体由组合层提供「本宿主 session 内的 agent 工具调用 → owner」适配器；对象工具要求 `sandboxId`；结果经同一 `redact`。 | agent 有正式、进入 session 日志、可审计的入口；`DNK01 T-O-1` 有了 agent 真能用的落点。代价：[DNLS] 新增 inject 与一个调用面（扩约，须本次登记）；工具 schema 与描述成为模型可见合同；主体映射依赖「只有 owner 能驱动本宿主的 agent 回合」这一宿主前提。 |
| B | 控制页提供「复制给 agent」：`sandboxId` + relay 地址，用户贴进对话；agent 只用 relay | 不加工具；但选择与端口靠人工复制，relay 地址随代次变化会过期；`DNK01 T-O-1` 的打开面对 agent 仍不可达；agent 读不到状态、hints 与错误目录，skill 的排障步骤全部失效。 |
| C | 给 agent 一个宿主 API token（环境变量），直接 curl HTTP 路由 | skill 改动最小；但新造凭证面并放进 agent 环境，违反「不得擅自扩约」与 `T-O-52`「不批准新票据」；token 一旦进入 session 日志即泄露。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **真相登记**：append「agent 受管入口」——[DNLS] 经宿主 `tools` 服务注册的模型工具，是 `dnls.control/1` 能力的第三个入口，与 HTTP、`/mcp` 共用一个能力 owner 与分派器；不新增处理逻辑、错误枚举、lane 或凭证。主体：本宿主 session 内的 agent 工具调用映射为 owner（`T-O-59`），由组合层显式提供（[object-authz.js:43–48](../../../../dsh-nano-local-sandbox/src/host/object-authz.js#L43-L48)「a scoped adapter is supplied by composition, not derived from caller input」），不从工具参数推断。澄清 `DNK01 T-O-1`：「宿主 MCP 工具 `sandbox.open`」在 agent 侧的落点就是这个打开工具；打开能力只登记一次，HTTP `/open`、`/mcp` 与模型工具都是同一能力的投影，共用一个打开内核；接管期间它按 `DNK01 T-O-3` 拒绝（调用方是 agent）。
2. **工具集合（最小）**：列表（可见对象窄行，不替用户选择）；状态（`sandboxId` → phase、relay 地址 `cdp`、navigation、hints；不含 `redact` 屏蔽的键）；打开（`sandboxId` + `url`，计入写，接管中拒绝）；接管状态（只读 `humanHold` 与 `relay` 两档）。不提供生命周期写、终端、日志或进程工具，本册不扩大 agent 的权限面；这些仍由人在工作台操作。
3. **skill 重写**（[DNK] 持有正文，改 `lib/skill.js` 与 `src/skill/`，`skills/` 由构建生成）：Step 0 改为「列表 → 用户明确对象 → 状态」；relay 地址只从状态工具取，不猜端口；删除「实例按 session 记录」「suspend/resume」等旧语义；保留 held 即停写的规则；用户没有指定对象就询问。`/nano-kite` 的 start/stop/restart 改为指引用户在工作台操作所选对象。`references/*.md` 同步。
4. **验收**：单测——工具 schema；缺 `sandboxId` 被拒；不可见对象与不存在对象的拒绝一致；`redact` 生效；接管中打开被拒；注册可随插件卸载处置。真机按 `T-O-62`：agent 列出 → 询问 → 对用户指定的对象打开并经 relay 操作；结果记入 `T-O-60` 台账的 skill 行与 `DNK01 T-O-1` 行。

**【推荐选项支持证据或其他选项的反例】**

- skill 指向 agent 到不了的路由：[SKILL.md:18](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L18)（`/diagnostics`）、[:21](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L21)、[:27](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L27)（`curl …/status | jq -r .cdp`）；[nano-kite SKILL.md:11](../../../../dsh-nano-kitesurf/skills/nano-kite/SKILL.md#L11)、[:18](../../../../dsh-nano-kitesurf/skills/nano-kite/SKILL.md#L18)。路由准入在 [route-guard.js:204–208](../../../../packages/dsh-host-route-guard/src/route-guard.js#L204-L208)；无 cookie 的请求 401 已实测（[DNK01-1120-qna.md:48](../../dsh-nano-kitesurf/qna/DNK01-1120-qna.md#L48)）。
- 现有宿主接缝：[DNLS index.js:19](../../../../dsh-nano-local-sandbox/index.js#L19) 没有 `tools`；宿主 `commands` 是「Plugin-owned human-command registry」，handler「without sending the command to the model」（[commands index.ts:1–3](../../../../.dependencies/pinned/deepseek-harness/packages/interaction/commands/src/index.ts#L1-L3)、[:76](../../../../.dependencies/pinned/deepseek-harness/packages/interaction/commands/src/index.ts#L76)），所以 [DNT] 式的 slash 命令不能当 agent 入口；`tools.register` 是插件注册模型工具的接缝（[tools index.ts:121–153](../../../../.dependencies/pinned/deepseek-harness/packages/core/tools/src/index.ts#L121-L153)）。
- A 不新造处理逻辑：[DNLS] `/mcp` 的工具表就是能力表的投影（[managed-routes.js:369–385](../../../../dsh-nano-local-sandbox/src/host/managed-routes.js#L369-L385)）；受管 `/status` 已返回 relay 地址（[routes.js:1622–1624](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1622-L1624)），`redact` 屏蔽 `engineUrl` 等键而不屏蔽 `cdp`（[object-pages.js:15–16](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L15-L16)）。
- `DNK01 T-O-1` 当时的意图就是「不依赖 GUI cookie 的打开面」（[DNK01 台账:51](../../dsh-nano-kitesurf/qna/DNK01-1120-qna-truth.md#L51)）；落在 HTTP `/mcp` 上仍要 cookie，等于没有兑现。
- B 的反例：relay 地址随发布映射变化会被重置（[routes.js:1057–1060](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1057-L1060)），复制的地址在换代后失效；打开、状态与错误目录对 agent 仍不可达。
- C 的反例：[台账 T-O-52:330](./DNLS03-qna-truth.md#L330)「不批准新票据、operator 密钥或认证插件」；[:329](./DNLS03-qna-truth.md#L329)「不把宿主 cookie/token … 交给容器、日志」；宿主规则「Model-visible ⟺ logged」意味着进入 agent 上下文的 token 会被写进 session 日志。
- 诚实反方：A 依赖「只有 owner 能驱动本宿主的 agent 回合」。若宿主允许其他主体（如 liveshare 的 `share-viewer`）在 fork 中驱动回合，工具调用会继承 owner；实现时须核实宿主对这类回合的工具限制，核实不了就登记为宿主依赖，而不是在插件内推断。模型可见的工具描述成为合同，改名要同步 skill。`/nano-kite` 的生命周期动作降为指引用户操作；若 [业主] 希望 agent 也能执行生命周期，需另行登记带 `requestId` 的生命周期工具（遵守 timeout 不等于取消）。

### Q50 — 三项工作按什么顺序施工？开发站上的镜像重建、测试对象处置与模型消息授权到什么程度？

**驱动真相**：`T-O-55`（三项工作的先后由本册裁定，不由实现顺序反推）；`T-O-60`（bridge 改动须重建镜像并对开发对象换代，授权与时机后续轮裁定）；`T-O-62`（模型消息次数与时机由 executional 轮定；该条本身不授权镜像重建与测试对象处置）；`T-O-61`（交接须真机重放）。来源：`XB-11`、`XB-22`；[redesign todo P4 纠正与清场顺序：76–78](../plan/todo.DNLS03-control-redesign.md#L76-L78)。

- **影响范围**：补充计划的阶段划分与 todo 登记；`dsh-dev` 上的 kitesurf 镜像、`dnls03-dev` 与 `dnls03-ui-check` 两个测试对象及其卷、开发 Web 服务的重启、测试 session 的模型消息。不涉及生产实例、宿主 pin、其他 profile 或生产发布配对（K-07）。
- **为什么必须确认**：Q48 的桥改动在镜像配方里，换镜像就必须让对象换代；开发站 `kitesurf` profile 的两个名额已被两个测试对象占满；P4 纠正已判定要验「干净创建」而不是保卷重建，清场顺序也已写好，却一直缺具体处置授权（`XB-22`）。若 W1、W2、W3 各自部署，镜像、清场与重放都会重复多次，证据也会混跨代次。顺序与授权不定，补充计划无法排期，`T-O-62` 也无法开跑。
- **当前建议 / 倾向**：选 **A：代码先行；镜像只换一次、开发站只清场一次、完整真机重放只跑一次，失败行修复后复跑。阶段：S1 合同与代码 → S2 构建一次镜像与三包候选 → S3 开发站清场并只新建一个对象 → S4 一次完整双操作者真机 e2e（场景按 W1 → W2 → W3）→ S5 修复后复跑失败行。并按下文授权列出的开发站动作与模型消息上限。**
- **Reasoning**：三项工作的真机证据依赖同一个开发站对象和同一组候选；桥改动决定了镜像只能在代码完成后构建一次。先清场再重放，所有证据只对应一个新对象、一个镜像 digest、一组包 SHA，不混入旧代次。场景按 W1 → W2 → W3 排，是因为 W3 管理页的验收要用到 W1 的终端和 W2 的设计入口。
- **问题（请 [业主] 裁决）**：是否采用「代码先行、单次换镜像与清场、单次完整重放」的顺序，并授权其中列出的开发站动作与模型消息上限（A）；还是 W1、W2、W3 各自开发、部署与真机（B）；或先完成 W3 管理页的 P2 设计裁决，再动 W1、W2（C）？
- **[业主]回答**：已确认 A（2026-11-20：「业主同意你在 [第3轮] 的全部推荐」），冻结为 `T-O-65`。

**【对本问题的解读】**　例：按 A，开发站在 S3 之前保持现状、不写不删；S3 时先核对两个对象的绑定与挂载，逐个受管退役，确认容器已不存在后永久删除各自精确的卷目录，再从新镜像创建一个新对象，记下新 ID、代次、镜像 digest 与实测挂载；S4 中执行者与 session 内 agent 对这个新对象走完全部场景。授权只限 `dsh-dev` 的 web profile 与这两个具体对象，不含生产、其他实例、宿主 pin 或其他插件。P2 设计仍由 [业主] 看截图后裁决，e2e 通过不代替设计通过。

**【可选选项清单】**

| 选项 | 顺序与授权 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | S1–S5 如上。授权：① 重建 kitesurf 镜像一次（同一阶段内修复构建失败后的重建计入同一授权）；② 退役并永久删除 `dnls03-dev`（`7ef19658-39c7-43e7-8dc8-d387a45a9d83`）与 `dnls03-ui-check`（`75bfac14-8cd4-4978-a101-32cb7115d988`）及各自精确的卷目录，不备份、不迁移；③ 从新镜像创建一个新测试对象；④ 按场景需要重启开发 Web 服务（`T-O-39` 辨真流程要求「只重启 [dsh]」）；⑤ 向一个专用测试 session 发送 e2e 模型消息：每个 agent 场景 1 条任务消息、至多 1 条追问，一次完整重放合计不超过 20 条，S5 复跑同一上限。 | 破坏性动作只发生一次，范围钉死到两个对象；证据可追到唯一对象、镜像与包。代价：S1 期间开发站不产生新证据；若 S4 失败行多，修复集中在 S5。 |
| B | W1、W2、W3 各自开发 → 部署 → 真机 | 更早见到真机反馈；但桥改动落在 W2，W1 阶段使用的对象会在 W2 被换代；清场与重放重复，证据跨代次；模型消息与破坏性动作的次数无法预估。 |
| C | 先完成 W3 管理页 P2 设计裁决，再做 W1、W2 | 设计先定；但 P2 要在真实对象上看终端与设计入口，而它们依赖 W1、W2；会空转。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **登记**：本册记录顺序与授权；补充计划按 S1–S5 编排，todo 按阶段登记。授权只对本题列出的对象与动作有效；任何超出（第二次清场、额外对象、其他 profile、生产部署、pin 改动、超过上限的模型消息）另请 [业主]。S1 期间允许对开发站做只读探查（不写、不重启、不发模型消息），用于核实宿主接口在 rc.5 上的可用性。
2. **S1 合同与代码**：W1 主体硬切（`T-O-59`）；交接硬切（`T-O-61`）；旧脚本退役（`T-O-62`）；Q48 桥与宿主；Q49 工具与 skill；收口台账逐行给出终态初值（`T-O-60`）。完成判据：三包 `npm test` 全绿（[DNK] 测试数因脚本退役下降属预期），`check-*` 脚本通过。不部署。
3. **S2 构建**：经宿主 confine 用 `build-profile.mjs` 构建；记录镜像 digest 与三包 tarball SHA-256。
4. **S3 清场**：严格按 [redesign todo:78](../plan/todo.DNLS03-control-redesign.md#L78) 的顺序执行；任一步未证实即停，不记为已清场；环境控制台账与审计不随卷擦除。
5. **S4 真机 e2e**：按 `T-O-62` 执行。场景清单写在补充计划：W1 辨真流程（含只重启 [dsh]）；`T-O-61` 交接；W2 台账中 agent 可见的行（含 Q48 接管、Q49 入口与 skill）；W3 管理页 P4 的行。证据存入 `.anote/reviews/dsh-nano-local-sandbox/DNLS03/`。
6. **S5 复跑**：只复跑失败行与受修复影响的行，模型消息同一上限；需要再次换镜像时，在同一个新对象上换代，不再清场。

**【推荐选项支持证据或其他选项的反例】**

- 名额已满、处置一直缺授权：[redesign todo:71](../plan/todo.DNLS03-control-redesign.md#L71)「该 profile 已用满两个名额」；[:76](../plan/todo.DNLS03-control-redesign.md#L76)「撤回保卷重建提案 … 要验的是干净创建」；[:78](../plan/todo.DNLS03-control-redesign.md#L78) 清场顺序「任一步未证实，不得记录为已清场」。
- 桥在镜像配方内：[profile.yaml:14](../../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L14)；[todo.DNLS03 K-03:130](../plan/todo.DNLS03.md#L130)「桥属镜像配方，改动后须重建镜像并对开发对象换代」；镜像在开发站构建的先例见 [:108](../plan/todo.DNLS03.md#L108)。
- 彻底删除测试数据的先例：[业主] 曾要求「彻底删除旧开发实例及其数据，不备份、不迁移」，执行记录见 [todo.DNLS03:112–113](../plan/todo.DNLS03.md#L112-L113)。
- W3 依赖 W1、W2：管理页已接入正式 [DNK]/[DNT] 入口（[redesign todo:8](../plan/todo.DNLS03-control-redesign.md#L8)），真实页面上的终端拒绝与 [DNK] 重选（[:56–57](../plan/todo.DNLS03-control-redesign.md#L56-L57)）正是 W1、W2 要消除的问题；P2 设计裁决属 [业主]（[:7](../plan/todo.DNLS03-control-redesign.md#L7)）。
- B 的反例：`T-O-60` 下游约束「bridge 改动须重建镜像并对开发对象换代」，W2 之后 W1 的对象代次失效，W1 证据要重取。
- C 的反例：P2 裁决需要在真实对象上看到可用的终端与设计入口，依赖 W1、W2 先完成。
- 诚实反方：A 把真机反馈推迟到 S4；宿主 `tools` 接缝在已装 rc.5 上的行为等问题，在 S1 只能靠只读探查与单测发现。20 条模型消息是建议上限，不是测得的需要量；若场景清单定稿后明显不足，在补充计划中提出调整，由 [业主] 批准。删除两个对象的卷不可逆，S3 的每一步核对是唯一的保护。

## 7. ★ 中场评估 III（Round 3 → Round 4）

- **7.1 对 Round 3 的判定**：三题均由 [业主] 一次性签收 A（2026-11-20：「业主同意你在 [第3轮] 的全部推荐」），无保留、无附加条件。Q48 让接管对 agent 的全部写路成立，同时留下一条 [业主] 判定：代次宿主凭据不在 `T-O-52` 的禁令之内。Q49 让 session 内 agent 第一次有了受管入口，`T-O-62` 的 agent 场景有了起点。Q50 给出 S1–S5 的施工顺序与开发站授权。执行层的主干（谁能写、agent 从哪里进、按什么顺序施工、能动开发站的哪些东西）至此冻结，剩下的是 S1 里仍无裁决的细项。
- **7.2 本轮已锁定真相**：`T-O-63`（代次宿主凭据、agent 类的读白名单、`/control` 只认宿主类）；`T-O-64`（四个模型工具作为能力分派器的第三个入口，skill 按此重写）；`T-O-65`（S1–S5 与五项开发站授权）。三条都已写入 §1，并写明执行细节与下游约束。
- **7.3 诚实反方制衡**：
  - `T-O-63`：[DNLS] 内部多了一个「宿主 ↔ 自身容器」的秘密；白名单可能误拒 agent-browser 的某个读，须在 S4 校准；宿主重启后的采纳必须重投凭据，漏投会让对象页 503。
  - `T-O-64`：主体映射依赖「只有 owner 能驱动本宿主的 agent 回合」；S1 若核实不了 liveshare fork 的工具限制，只能登记为宿主依赖。工具的描述文字一旦成为模型可见合同，改动就要同步 skill。
  - `T-O-65`：真机反馈推迟到 S4；20 条消息是估计值；删除两个对象的卷不可逆。更要紧的是：S1 是镜像构建前唯一的代码窗口，而 `T-O-60` 要求每一行都有终态。本轮复核发现 S1 仍有三处没有裁决：K-01 `/res` 归属与 K-04 隧道 hint、`T-O-61` 留下的页签细节、K-05 失败体。若不先定，S1 要么带着开放行进入 S2，要么由实现自行决定，两者都违反现行真相。
- **7.4 为什么提出 Round 4（注入 Q51、Q52、Q53）**：
  - `T-O-58` 写明 K-01 须 [业主] 裁决、过渡态不算 `DNK01 T-O-4/5` 的兑现；`T-O-65` 把 S1 定为唯一的代码窗口。新检索发现：`/res` 在生产里根本不运行，代码与登记却散在 9 处，代理对目标主机不设限（`XB-23`）；HTML 模式是默认关闭的开关，[DNK] 的「是否已代理」判断恒为假，隧道 hint 无实现（`XB-24`）→ **Q51**。
  - `T-O-61` 把「每个引用一个页签还是复用」「body 内核实设计能力」留给 executional 轮，`T-O-65` 要求 S1 实施 `T-O-61`。新检索发现：宿主以地址作页签身份、并向 body 提供可见性（`XB-25`）；能否做设计的唯一判据在 profile 清单，投影里没有（`XB-26`）→ **Q52**。
  - `T-O-64` 规定模型工具结果经同一 `redact`，`T-O-62` 要求 agent 遇错按协议行事。新检索发现：受管失败体只剩 `errorId`，内核给出的原因与拓扑提示都被删；K-05 所说的 `engineLog` 是早已删除的客户端功能（`XB-27`）→ **Q53**。
  - 本轮仍不问：W3 管理页 P2 设计在 S1–S5 中的位置与裁决方式、K-07 生产发布配对、收口交接（closure、DNK01 指针、工作树合并与删除）。它们不阻塞 S1 的代码，留给 Round 5。

## 8. Round 4 —— executional：`/res` 去留与隧道 hint；[DNK] 引用页签；受管失败体投影（Q51–Q53）

本轮 `retired`，[业主] 直答。每题标明驱动真相。三题可独立作答，都落在 `T-O-65` 的 S1：Q51 定 HTML 预览是否还保留「预览取资源」面，以及隧道 hint 的落点；Q52 定 [DNK] 收到对象引用后的页签行为；Q53 定受管对象页失败时三个入口返回哪些字段。

### Q51 — `/res` 去留：受管宿主上 HTML 原生预览是否还需要「预览取资源」面？隧道 hint 落在哪里？

**驱动真相**：`T-O-58`（K-01 仍须 [业主] 裁决；过渡态不得被当作 `DNK01 T-O-4/5` 的最终兑现）；`T-O-60`（K-01、K-04 须给终态，不得停在「开放」）；`T-O-65`（S1 是镜像构建前唯一的代码窗口）；`T-O-57`（`DNK01 T-O-4/5/6` 现行，改判在本册 append）；现行 `DNLS03 T-O-41`（已有对象 HTTP 只取 query `sandboxId`，无 header 兜底）、`DNK01 T-O-4`「HTML 模式不得成为默认」。来源：`XB-23`、`XB-24`；[todo.DNLS03 /res 处置与 K-01/K-04：126–131](../plan/todo.DNLS03.md#L126-L131)。

- **影响范围**：[DNLS] `res-proxy.js` 及其单测、`routes.js` 的 `/res` 分支与 `/dom` 构建、`dom-srcdoc.js` 的改写分支、绑定行 `dnls.res`（仓根路由账本、`lib/bindings.js`、`lib/browser-bindings.js`、perf 声明）、错误目录 `res.*`、`/open` 的响应体；[DNK] HTML 模式的提示与 `proxied` 判断、skill 的 `routes.md` 与 `recovery-playbook.md`；`DNK01 T-O-4/5/6` 的登记。
- **为什么必须确认**：`/res` 现在既不是对象能力，也不在生产里运行：插件入口只注册受管分派器，`serveRes` 所在的分支受管对象页从不调用（`XB-23`）。`DNK01 T-O-5` 却仍写着它「放行任意 http/https」。K-01 列出的两条路都要改约：(a) 让宿主替页面取任意地址，可宿主解析的是宿主自己的网络，而引擎在容器内解析，且代理对目标主机不设限；(b) 按对象经沙箱网络取资源，要改 `T-O-41` 的路径形态并豁免合同头。不定，S1 只能继续保留一段死代码和一条失败关闭的路由，K-01、K-04 也给不出终态。
- **当前建议 / 倾向**：选 **A：彻底退役 `/res` 与 HTML 代理改写。HTML 模式保持显式开启的静态投影，子资源一律用真实地址；隧道 hint 只落在 `/open`。**
- **Reasoning**：受管宿主的默认渲染面是引擎渲染：引擎在容器内加载页面，本地站的样式完整（`DNK01 T-O-4`，`XB-24`）。HTML 模式只是可选的静态投影，为它保留一个「宿主替页面任意取资源」的面，风险与收益不对等。退役只删除，不新增任何路由、能力或错误码；`/res` 当初要解决的「本地 http 站在 HTML 模式下缺样式」，由默认的引擎渲染解决。
- **问题（请 [业主] 裁决）**：`/res` 是彻底退役、HTML 模式只用真实地址（A），改为 `dnls.control/1` 之外只做准入的宿主路由并另定是否拒绝宿主回环与私网地址（B），还是改为按对象经沙箱网络取资源、为此修改 `T-O-41`（C）？
- **[业主]回答**：已确认 A（2026-11-20：「业主同意你在 [第4轮] 的全部推荐」），冻结为 `T-O-66`。

**【对本问题的解读】**　例：用户在 [DNK] 打开 `http://<hostGateway>:3000`。默认引擎渲染，画面带完整样式。用户切到 HTML 模式：按 A，iframe 的 `<base>` 是页面真实地址，https 外链资源由浏览器直接加载，http 子资源被浏览器按混合内容拦下；页面角落固定提示「HTML 模式是静态投影，http 资源不会加载，看完整样式请切回引擎渲染」，不再说「宿主未声明代理」。agent 经打开工具打开 `https://<某隧道域>/`，打开照常成功，响应带隧道 hint，pane 与模型工具都能看到。本题不改 `/open` 的状态码、`/dom` 的字段与版本签名、默认渲染面；只定 `/res` 的去留与隧道 hint 的落点。

**【可选选项清单】**

| 选项 | `/res` 与隧道 hint | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 删除 `/res` 的代码、绑定行、错误码与 `/dom` 改写分支；HTML 模式只用真实地址并固定说明；隧道 hint 只在 `/open` 响应附带，不改状态码。 | 一条从未在受管宿主运行的面被移除，路由账本减一行；不新增合同。代价：HTML 模式下本地 http 站缺样式成为确定行为（引擎渲染不受影响）；`DNK01 T-O-5` 整条退役、`T-O-4/6` 局部退役，须本册登记。 |
| B | K-01 (a)：保留路径形态，作为只做准入的宿主路由；宿主侧 fetch | HTML 模式在宿主可达的地址上恢复样式。代价：宿主替页面取任意 http(s) 地址，包括宿主回环上的服务，须另定拒绝范围；宿主与容器解析的是两张网络，容器内 `localhost` 站仍取不到；路由在对象合同之外，没有对象授权。 |
| C | K-01 (b)：按对象经沙箱网络取资源 | 地址空间正确。代价：iframe 子资源请求带不上合同头与 query `sandboxId`，须改 `T-O-41` 并新增一种返回原始字节的对象能力；取资源要在容器内执行，涉及桥或引擎改造与镜像（与 `T-O-65` 的一次重建绑在一起），范围最大。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **真相登记**（DNK01 族改判在本册 append，DNK01 侧只留指针，`T-O-57`）：
   - `DNK01 T-O-5` 整条退役。
   - `DNK01 T-O-4` 中「所有绝对 http(s) 子资源引用一律改写到同源代理」与「path 镜像」两句退役；默认引擎渲染、HTML 显式开启、静态投影、`/dom` 版本签名现状冻结保留；追加「HTML 投影保留真实地址，`<base>` 为页面地址」。
   - `DNK01 T-O-6` 中 `/res` 与 `res.public-tunnel` 退役；`/open` 的隧道 hint 保留，仍是 hint 不是错误；hint code 由 [DNLS] kitesurf driver 的目录行登记（[DNK] 不持有错误目录）；`/diagnostics` 提示中的「+ `/res`」删去。
   - [todo.DNLS03:126](../plan/todo.DNLS03.md#L126) 的「本次处置」由本条取代，K-01、K-04 终态记为「本期实现」。
2. **[DNLS] 删除**：`src/host/res-proxy.js` 与 `test/res-proxy.test.mjs`；`routes.js` 的 `RES_ROUTE`、`serveRes` 导入与分支；`dom-srcdoc.js` 的 `proxy` 选项及只服务于代理的改写函数，只留真实地址一种构建；`object-pages.js` 中 `dnls.res` 的例外与注释；仓根账本删除 `dnls.res` 后重新烘焙 `lib/bindings.js`、`lib/browser-bindings.js` 与 perf 声明；错误目录 `res.*` 九行。相关断言同步改写（`dom-srcdoc.test`、`dom-health-routes.test:78`，`environment-owner.test:507–513` 改为断言该路径不再注册）。不留别名、开关或墓碑路由。
3. **隧道 hint（K-04）**：`/open` 的目标主机命中 driver 内的已知隧道域常量时，成功体与失败体都附 hint；不改状态码、不阻断；域名清单是常量，不是安全边界。HTTP、`/mcp` 与 `T-O-64` 的打开工具共用打开内核，返回同一 hint。
4. **[DNK]**：删除 `proxied` 推断；HTML 模式固定显示静态投影说明（改写 `hintUnproxiedHtml` 的中英文案）；skill 的 `routes.md`、`recovery-playbook.md` 删去 `/res`，改为「看样式用默认的引擎渲染」。
5. **验收**：单测——`/dom` 构建保留真实地址；`/res` 路径不在路由表；路由账本检查 0 漂移（行数减一）；命中隧道域的 `/open` 带 hint 且状态码不变。真机按 `T-O-62`：HTML 模式开关一行、隧道 hint 一行，记入 `T-O-60` 台账 K-01、K-04 行。

**【推荐选项支持证据或其他选项的反例】**

- `/res` 在生产不运行：插件入口只注册 `createManagedRoutes`（[DNLS index.js:35](../../../../dsh-nano-local-sandbox/index.js#L35)）；`serveRes` 只在 `routeSpecs` 的分支里（[routes.js:1489–1495](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1489-L1495)），对象页只取 `dnls.res` 以外的行（[object-pages.js:9–13](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L9-L13)、[:28](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L28)），该路径由失败关闭处理器占位（[managed-routes.js:470–481](../../../../dsh-nano-local-sandbox/src/host/managed-routes.js#L470-L481)）。
- 默认面已是引擎渲染：[DNK index.js:934–942](../../../../dsh-nano-kitesurf/src/client/index.js#L934-L942)；[DNK01 台账 T-O-4:64](../../dsh-nano-kitesurf/qna/DNK01-1120-qna-truth.md#L64)「HTML 模式不得成为默认」；skill 写明「打开本地站就看到完整样式是默认结果」（[recipes.md:56](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/references/recipes.md#L56)）。
- 受管 `/dom` 早已用真实地址：[routes.js:1079–1081](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1079-L1081)、[dom-srcdoc.js:104–110](../../../../dsh-nano-local-sandbox/src/host/dom-srcdoc.js#L104-L110)。[DNK] 的 `proxied` 读 `data.base`（[index.js:1533](../../../../dsh-nano-kitesurf/src/client/index.js#L1533)），而 `/dom` 记录不含该字段（[routes.js:1096](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1096)），提示文案因此总在 HTML 模式出现（[i18n.js:106](../../../../dsh-nano-kitesurf/src/client/i18n.js#L106)）。
- B 的反例：代理只拒非 http(s) 与带凭据的地址（[res-proxy.js:27–31](../../../../dsh-nano-local-sandbox/src/host/res-proxy.js#L27-L31)、[:91–106](../../../../dsh-nano-local-sandbox/src/host/res-proxy.js#L91-L106)），`DNK01 T-O-5` 要求「放行任意 http/https」（[DNK01 台账:65](../../dsh-nano-kitesurf/qna/DNK01-1120-qna-truth.md#L65)），即页面内容可让宿主请求宿主回环上的服务；`/open` 的 URL 在容器内解析（[SKILL.md:40](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L40)），宿主侧代理解析的是另一台机器（[todo.DNLS03:128](../plan/todo.DNLS03.md#L128)）。
- C 的反例：`T-O-41`「已有对象 HTTP 只取 query `sandboxId` … 无 body/header/session/env 兜底」（[台账:60](./DNLS03-qna-truth.md#L60)）；iframe 子资源带不上合同头与 `sandboxId`、响应不是 JSON（[object-pages.js:9–11](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L9-L11)）。
- 隧道 hint 的落点：`/open` 成功体现为 `{ok, url, landed}`（[routes.js:1719](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1719)），失败体已有 `hint`（[:1720–1727](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1720-L1727)）；skill 禁令表把隧道列为错误方案（[recipes.md:66](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/references/recipes.md#L66)），与 `DNK01 T-O-6`「第二落点」一致（[DNK01 台账:71](../../dsh-nano-kitesurf/qna/DNK01-1120-qna-truth.md#L71)）。
- 诚实反方：A 让 HTML 模式在本地 http 站上永远缺样式；若 [业主] 以后要 HTML 模式在这类站点上也完整，地址空间正确的只有 C，须另开问答并接受改约与镜像改造。退役后 `DNK01` 的 F 系列与历史证据中关于 `/res` 的条目不回改，只由本册指针说明已退役。

### Q52 — [DNK] 收到对象引用后：每个引用一个页签还是复用一个？怎样核实该对象能做设计？隐藏的页签是否继续轮询？

**驱动真相**：`T-O-61`（「每个引用一个页签还是复用单页签」「body 内核实设计能力」留 executional 轮；核实失败显示原因，不回落到其他对象；原 `kitesurf` 页类型与空选择器保留）；`T-O-65`（S1 实施 `T-O-61`；S3 只新建一个对象）；`T-O-60`（交接属用户可见行为，须真机重放）；`T-O-64`（列表工具与 HTTP 同源投影）；现行 `DNLS03 T-O-38`（只有一个候选也不自动选中）、`T-O-50`（major 内可增只读字段，不改既有语义）。来源：`XB-25`、`XB-26`。

- **影响范围**：[DNK] 页签注册与 body（`Pane`、`SandboxPicker`）、轮询；[DNLS] `sandbox.list` 与 `sandbox.inspect` 的行投影；`T-O-64` 列表工具的输出；`T-O-61` 的验收。
- **为什么必须确认**：宿主把资源页签的身份定为地址本身，同一地址再次打开即显示原页签（`XB-25`）。若 [DNK] 允许在一个引用页签里换对象，页签的身份与内容就不一致；若每个引用一个页签，又因为 `keepMounted` 与只看浏览器整体可见性的轮询，隐藏页签会继续每 1.5–3 秒打对象接口。设计能力方面，判据在 profile 清单的 `capabilities.drivers`，但列表与 inspect 都不投影它（`XB-26`），[DNK] 只能等对象页回 503，分不清「引擎没起」和「这个对象不能做设计」。补投影是公共读模型的增量，须登记。
- **当前建议 / 倾向**：选 **A：每个引用一个页签，同一引用复用原页签；引用页签锁定该对象、不提供换对象；页签不可见时停止轮询；[DNLS] 在列表与 inspect 行增加只读 `drivers`（取自 profile 清单），[DNK] 以 `drivers` 含 `cdp` 判定可做设计。**
- **Reasoning**：页签身份跟随宿主已有规则，不另造；「能否做设计」从唯一来源（profile 清单）投影，不让 [DNK] 猜 profile 名或服务名；可见性由宿主 `tab.visible` 给出，不自建判断。三项都不新增路由、错误码或 lane。
- **问题（请 [业主] 裁决）**：[DNK] 是每个引用一个页签、引用页签锁定对象、以投影的 `drivers` 核实设计能力并在隐藏时停轮询（A），只用一个页签、新引用替换当前内容（B），还是每个引用一个页签但不核实设计能力、页签内保留换对象下拉、轮询不变（C）？
- **[业主]回答**：已确认 A（2026-11-20：「业主同意你在 [第4轮] 的全部推荐」），冻结为 `T-O-67`。

**【对本问题的解读】**　例：用户在 [DNLS] 对 `dnls03-dev` 点「在 Kitesurf 中打开」，再对另一个对象点一次：右栏出现两个 Kitesurf 页签，标题分别是两个对象名；对 `dnls03-dev` 再点一次，回到它原来的页签，标注与浏览历史都在。引用页签里没有对象下拉；要换对象，回 [DNLS] 选另一个，或打开没有预选的 `kitesurf` 页。切到别的页签后，原页签停止请求，切回时立即刷新一次。若引用的对象所属 profile 不声明 `cdp`，页签显示「该沙箱的 profile 不提供浏览器驱动」，不发任何对象写请求，也不改投到其他对象。本题不改 [DNLS] 的候选显示（`T-O-61` 已定），也不处理无 session 的入口（`XB-5`，宿主依赖）。

**【可选选项清单】**

| 选项 | 页签与核实 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 一引用一页签（宿主按地址复用）；引用页签锁定对象；`tab.visible` 为假时停轮询；[DNLS] 列表与 inspect 增只读 `drivers`，[DNK] 核实含 `cdp`；`kitesurf` 页类型保留空选择器，选择器把无 `cdp` 的对象显示为不可选并说明原因。 | 页签身份与内容一致；多个对象可以并排；隐藏页签不耗对象接口；「不能做设计」有明确原因。代价：读模型多一个只读字段，须本次登记；真机只有一个对象，「两个引用两个页签」只能靠单测证明。 |
| B | 单页签：新引用替换当前页签内容（`replaceTab` 或页内切换） | 右栏始终只有一个 Kitesurf。代价：页签地址与所示对象不一致，宿主「同址同页签」失效；无法并排对比；切换即丢失上一对象的标注与历史（body 以 `key={sandboxId}` 重挂）。 |
| C | 一引用一页签，但不核实设计能力、页签内保留下拉、轮询不变 | 改动最小。代价：违反 `T-O-61`「核实失败显示原因」；页签内换对象有 B 的身份问题；多页签时轮询请求成倍增长。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **真相登记**：append「[DNK] 引用页签」——一个 `dsh-resource://sandbox/<envId>/<sandboxId>` 对应一个页签，身份即地址（宿主规则）；引用页签只服务该对象，不提供换对象；`kitesurf` 页类型保留空选择器，不自动选中（`T-O-38`）。append「只读 `drivers` 字段」——[DNLS] `sandbox.list` 与 `sandbox.inspect` 的行增加 `drivers: string[]`，取自该对象 profile 清单的 `capabilities.drivers`；只读、不授权、不表示对象当前可用；按 `T-O-50` 属 major 内只读增量；`T-O-64` 列表工具同源投影。不新增错误枚举、路由或 lane。
2. **[DNK] body**：`Pane` 读取宿主给的 `tab.navigation.address` 与 `tab.visible`。有地址：`/contract` → 定向读取对象行，核对 `envId`、`sandboxId`，并核对 `drivers` 含 `cdp` → 通过后等价一次 `choose(sandboxId)`；失败按原因显示（对象不存在或不可见、env 不符、无浏览器驱动），不回落。无地址：现有空选择器。页签标题在核实前显示短 ID，核实后显示对象名。
3. **轮询**：以 `tab.visible` 为准；不可见时停止 `/status`、`/shot`、`/dom`、`/control` 等全部定时请求，恢复可见时立即刷新一次；保留 `keepMounted`，以保住标注与历史；浏览器整体隐藏的判断照旧。
4. **验收**：单测——同一引用二次打开不新增页签（用宿主语义的测试替身）；两个引用两个页签；`drivers` 不含 `cdp` 时显示原因且不发对象请求；不可见时没有定时请求，恢复可见时刷新一次；`T-O-61` 已列的零、一、多候选与核实失败不改投。真机按 `T-O-62`（只有 `T-O-65` 授权的一个对象）：同一引用复用、引用页签与空选择器页签并存、切走后停止请求，记入 `T-O-60` 台账；「两个引用两个页签」登记为软件回归证据，不记为真机证据。

**【推荐选项支持证据或其他选项的反例】**

- 宿主的身份规则：「Stable identity of the content, which is the address itself. Two opens of the same address are the same tab」（[tab-registry.ts:145–151](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/tab-registry.ts#L145-L151)）；「Resource tabs reveal an existing (kind, contentId) by default」（[service.ts:171–175](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/service.ts#L171-L175)）。B 要么违背这条规则，要么靠 `replaceTab` 关掉原页签。
- 宿主已提供可见性：`tab.visible`「Only the foreground Session is visible. Docked bodies require expansion and selection」（[slots.ts:196–208](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/contract/slots.ts#L196-L208)）；`keepMounted` 会在隐藏时保留 body（[tab-registry.ts:105–108](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/tab-registry.ts#L105-L108)）。[DNK] 的 `Pane` 不读页签属性（[index.js:3047–3052](../../../../dsh-nano-kitesurf/src/client/index.js#L3047-L3052)），轮询只看 `document.visibilityState`（[:608–614](../../../../dsh-nano-kitesurf/src/client/index.js#L608-L614)），另有无条件定时器（[:1171](../../../../dsh-nano-kitesurf/src/client/index.js#L1171)、[:1201](../../../../dsh-nano-kitesurf/src/client/index.js#L1201)、[:1207](../../../../dsh-nano-kitesurf/src/client/index.js#L1207)）。
- 换对象会重挂并丢状态：`BrowserPane` 以 `key={selection.sandboxId}` 挂载（[index.js:2953–2959](../../../../dsh-nano-kitesurf/src/client/index.js#L2953-L2959)、[:3030–3031](../../../../dsh-nano-kitesurf/src/client/index.js#L3030-L3031)），页内下拉随时可换（[:3009–3018](../../../../dsh-nano-kitesurf/src/client/index.js#L3009-L3018)）。
- 设计能力的唯一判据与投影缺口：[profile-drivers.js:26–32](../../../../dsh-nano-local-sandbox/src/host/profile-drivers.js#L26-L32) 以 `capabilities.drivers` 含 `cdp` 选浏览器 profile；[profile.yaml:83–86](../../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L83-L86)；列表与 inspect 行只有 `profileId` 与服务（[fleet-projection.js:218–240](../../../../dsh-nano-local-sandbox/src/host/fleet-projection.js#L218-L240)）；无 driver 时对象页只回 503（[object-pages.js:54–55](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L54-L55)）。只读增量合规：[台账 T-O-50:298](./DNLS03-qna-truth.md#L298)「major 内可忽略只读新增字段」。
- C 的反例：§1 `T-O-61` 写明「核实失败显示原因，不回落到其他对象」。
- 诚实反方：仓内目前只有一个 profile 清单（`XB-26`），`drivers` 今天对所有对象都含 `cdp`，它的价值在第二个 profile 出现时才体现；若 [业主] 认为不应为尚不存在的情况加字段，可只做页签与轮询两项，把设计能力核实登记为「[业主] 推迟」。真机只能证明一个对象上的行为。

### Q53 — 受管对象页失败时，HTTP、`/mcp` 与模型工具返回哪些字段？

**驱动真相**：`T-O-64`（模型工具是能力分派器的投影，结果经同一 `redact`）；`T-O-62`（agent 判据看协议行为：遇错停下，或按提示纠正）；`T-O-60`（K-05 须给终态；错误展示属用户可见行为）；`T-O-63`（接管中被拒的打开也走失败体）；`T-O-57`（`DNK01 T-O-1`「返回与 REST 同 `errorId`/`hint`」现行）；现行 `DNLS03 T-O-50`（`errorId/status/cause/next` 跨 HTTP/MCP 同义；仅在获准范围内报告细节）、`T-O-44`。来源：`XB-27`；[todo.DNLS03 K-05：132](../plan/todo.DNLS03.md#L132)。

- **影响范围**：[DNLS] `object-pages.js` 的失败投影；HTTP、`/mcp` 与 `T-O-64` 模型工具三个入口；[DNK] 请求层的错误对象与打开失败对话框；skill 的排障表。
- **为什么必须确认**：对象页内核失败时给出 `{ok:false, errorId, error, hint}`，其中 `hint` 是「localhost 在容器内指容器自身，请改用 `networking.hostGateway`」这类可操作提示；受管投影只留 `errorId`（`XB-27`）。结果是：用户在 [DNK] 只看到「request failed (502)」；agent 经模型工具只拿到一个错误码，skill 的排障步骤失去依据；`DNK01 T-O-1` 要求的「同 hint」在受管宿主上未兑现。K-05 原文写「收不到 `engineLog`」，核查发现 `engineLog` 是 [DNK] 早已删除的客户端功能，对话框中的分支是死代码；真正被删的是 `error` 与 `hint`。放宽失败体是对外合同的变化，须登记。
- **当前建议 / 倾向**：选 **A：对已通过授权与代次核验、由对象页内核产生的失败，按白名单投影 `{ok:false, errorId, error, hint}`（`error` 截至 240 字符）；授权、可见性、代次、准入与合同版本等派发前失败仍只返回 `errorId`。三个入口同一投影；[DNK] 删除 `engineLog` 死分支与自带的 loopback 判断，改为显示宿主给出的 `hint`。**
- **Reasoning**：能到达内核的请求，主体已对该对象核权；`error` 与 `hint` 只描述这个主体自己发起的导航或动作，不揭示其他主体，符合 `T-O-50`「仅在获准范围内报告细节」。白名单比沿用成功体的删除表更稳：内核以后新增字段，默认不外泄。提示只由 [DNLS] 产生一次，[DNK] 不再复制判断逻辑。
- **问题（请 [业主] 裁决）**：受管对象页内核失败时，是按白名单返回 `errorId`、`error`、`hint`（A），维持只返回 `errorId`、由 [DNK] 与 agent 按错误目录自查原因与下一步（B），还是按成功体同一删除表放行整个失败体（C）？
- **[业主]回答**：已确认 A（2026-11-20：「业主同意你在 [第4轮] 的全部推荐」），冻结为 `T-O-68`。

**【对本问题的解读】**　例：用户让 agent 在 `dnls03-dev` 上打开 `http://localhost:3000`。按 A，打开工具返回错误结果，带导航失败的 `errorId`、`error: net::ERR_CONNECTION_REFUSED` 与 `hint`（容器内的 localhost 是容器自身，改用状态里的 `networking.hostGateway`）；agent 据此读状态工具，改用网关地址再开，这正是 skill 配方 5 的步骤。用户在 [DNK] 打开同一地址，对话框显示同一条 hint，而不是「request failed (502)」。若请求的对象对该主体不可见，仍只返回 403 与 `errorId`，不说明原因。本题不改错误枚举、状态码、成功体与 `/operations` 行（该行已记录截断后的 `error`）。

**【可选选项清单】**

| 选项 | 失败体 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 内核失败：白名单 `{ok:false, errorId, error, hint}`，`error` ≤ 240 字符；派发前失败：只 `errorId`；三入口一致。[DNK] 显示 `hint`，删死分支与重复判断。 | 用户与 agent 都拿到可操作的原因；`DNK01 T-O-1` 兑现；以后新增字段默认不外泄。代价：失败体字段扩大，须本次登记；`error` 来自引擎或上游，措辞不受 [DNLS] 控制，只能截断。 |
| B | 维持只 `errorId`；[DNK] 与 agent 按错误目录查 cause/next | 不改合同。代价：动态提示丢失（同一个导航失败码可能是回环、DNS 或超时）；错误目录在受管宿主上是对象页，模型工具也不提供，agent 查不到；K-05 只能记为「接受降级」。 |
| C | 失败体按成功体的删除表放行全部键 | 实现最简单。代价：删除表之外的任何键都会外泄（含 `detail`、上游正文等）；与「只报告获准范围内的细节」的意图不符。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **真相登记**：append「受管失败投影」——对象页内核产生的失败（处理器已执行、状态码 ≥ 400）投影为 `{ok:false, errorId, error?, hint?}`：`error` 为内核原因文本，截至 240 字符（与操作行同一上限）；`hint` 原样；不含其他键；仍经 `redact`。授权、可见性、代次、准入、合同版本等派发前失败只返回状态码与 `errorId`。HTTP、`/mcp`（`isError`）与模型工具同一投影（`T-O-50` 同义）。澄清 `DNK01 T-O-1`「同 `errorId`/`hint`」在受管宿主上的落点。K-05 终态记为「本期实现」，并在收口台账该行更正「`engineLog`」的表述，不回改 todo 原文。
2. **[DNLS]**：`object-pages.js` 的失败分支改为白名单投影；不改成功分支与派发前的 `fail()`。
3. **[DNK]**：请求层已优先使用 `payload.error`，只需把 `hint` 挂到错误对象上；打开失败对话框显示 `hint`；删除 `engineLog` 分支、loopback 判断与 `openErrorLoopback` 文案。
4. **skill**：排障表按 `errorId` 加 `hint` 编写，不承诺每个失败都带 `hint`；提示词约束不变（`T-O-62`：只给任务与对象名，不提示绕过方法）。
5. **验收**：单测——内核失败带 `error`、`hint` 且没有其他键；超长 `error` 被截断；派发前失败只有 `errorId`；HTTP、`/mcp`、模型工具三处结果一致。真机按 `T-O-62`：打开一个在容器内不可达的 localhost 地址，pane 与 agent 都看到同一 hint，记入 `T-O-60` 台账 K-05 行与 `DNK01 T-O-1` 行。

**【推荐选项支持证据或其他选项的反例】**

- 删除点：[object-pages.js:136–138](../../../../dsh-nano-local-sandbox/src/host/object-pages.js#L136-L138) 失败时只回 `{ok:false, errorId}`；成功时才 `redact(body)`。内核失败体：[routes.js:1720–1727](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1720-L1727) `send(res, …, { ok: false, errorId, error: error.message, hint })`，提示来源 `navigateHint`（[:949–970](../../../../dsh-nano-local-sandbox/src/host/routes.js#L949-L970)）。
- [DNK] 的表现：[index.js:382–386](../../../../dsh-nano-kitesurf/src/client/index.js#L382-L386) 无 `payload.error` 时退化为「request failed (状态码)」；`engineLog` 分支（[:1438–1440](../../../../dsh-nano-kitesurf/src/client/index.js#L1438-L1440)）的生产者 `engineLogHint` 已在 `9b6287f` 删除；重复的 loopback 判断见 [:1408–1419](../../../../dsh-nano-kitesurf/src/client/index.js#L1408-L1419)。
- 合同依据：`DNK01 T-O-1`「返回与 REST 同 `errorId`/`hint`」（[DNK01 台账:51](../../dsh-nano-kitesurf/qna/DNK01-1120-qna-truth.md#L51)）；`T-O-50`「`errorId/status/cause/next` … 跨 HTTP/MCP 同义 … 仅在获准范围内报告细节，不能用冲突消息揭示其他主体」（[台账:300](./DNLS03-qna-truth.md#L300)）。
- 截断上限已有先例：操作行记录 `error` 时截至 240 字符（[routes.js:1116–1117](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1116-L1117)）。
- agent 需要 hint：skill 的排障表与配方 5 都以「读 `networking.hostGateway` 后改址」为纠正步骤（[recipes.md:138](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/references/recipes.md#L138)、[SKILL.md:40](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L40)）。
- 诚实反方：`error` 来自引擎或上游，可能含用户输入的 URL；它只回给发起该请求的同一主体，且已在操作行中记录同样的文本。`hint` 目前只覆盖导航失败，其他对象动作多数没有 hint，skill 不得假定一定存在。

## 9. ★ 中场评估 IV（Round 4 → Round 5）

- **9.1 对 Round 4 的判定**：三题均由 [业主] 一次性签收 A（2026-11-20：「业主同意你在 [第4轮] 的全部推荐」），无保留、无附加条件。Q51 删除了一条从未在受管宿主运行的面，K-01、K-04 有了终态；Q52 让交接后的页签行为与宿主的身份规则一致，「能否做设计」有了唯一的投影来源；Q53 让用户与 agent 都能拿到可操作的失败原因，K-05 有了终态。至此 S1 的代码范围已全部裁定：`T-O-59`、`T-O-61`–`T-O-64`、`T-O-66`–`T-O-68`。
- **9.2 本轮已锁定真相**：`T-O-66`（退役 `/res` 与代理改写，隧道 hint 只落在 `/open`，DNK01 `T-O-4/5/6` 局部或整条退役）；`T-O-67`（一引用一页签、锁定对象、隐藏即停轮询、只读 `drivers` 投影）；`T-O-68`（内核失败按白名单投影 `errorId`/`error`/`hint`，派发前失败只给 `errorId`）。三条都已写入 §1，并写明执行细节与下游约束。
- **9.3 诚实反方制衡**：
  - `T-O-66`：HTML 模式在本地 http 站上永远缺样式；DNK01 族三条改判若不在 DNK01 侧补指针，读 DNK01 台账的人仍会以为 `/res` 现行。
  - `T-O-67`：`drivers` 今天对所有对象同值；真机只能证明单个对象上的行为。
  - `T-O-68`：`error` 的措辞来自引擎或上游，[DNLS] 只能截断；`hint` 目前只覆盖导航失败。
  - 全局：S1 的范围已经完整，但 S4 之后怎样收尾仍无裁决。本轮复核发现三处会在 S4 之后卡住：管理页有两条 UI 线，开发站取证的不是分支 HEAD，HEAD 的外壳又与设计规范的共享条件不符（`XB-28`、`XB-29`）；生产 web 与桌面仍是旧组合，合并态双向不兼容，生产旧目录还会让新台账拒绝开账（`XB-30`）；同一阶段的状态写在三处，main 已前进 21 个提交、三个账本文件两边都改过（`XB-31`）。
- **9.4 为什么提出 Round 5（注入 Q54、Q55、Q56）**：
  - `T-O-55` 把 W3 管理页列为本期工作，`T-O-65` 规定 P2 由 [业主] 看截图裁决、e2e 通过不代替设计通过。新检索发现：候选线不唯一，HEAD 的外壳未部署、未登记，而且只有 [DNLS] 一个使用方（`XB-28`、`XB-29`）→ **Q54**。
  - `T-O-60` 要求 K-07 给出终态，`T-O-65` 把生产排除在授权之外，`T-O-66` 退役的面仍在生产运行。新检索发现：三包只能同批升级，生产旧目录必须先清掉新 [DNLS] 才能开账（`XB-30`）→ **Q55**。
  - `T-O-55` 要求不另立计划文件、正式计划 append 至 action plan 并更新 todo；`T-O-60`、`T-O-57` 要求旧文档与 DNK01 侧只留指针；AGENTS「worktree」原则要求合并后及时删除工作树。新检索发现：三处状态叙述、主线分叉与账本冲突、本册未入库（`XB-31`）→ **Q56**。
  - 冻结判断：三题是执行层最后三项未裁事项。若 [业主] 签收且无保留、裁决后也没有新的阻断事实，本轮之后执行层冻结，按 §11 撰写补充计划。

## 10. Round 5 —— executional：W3 管理页 P2；K-07 生产同批切换；收口交接（Q54–Q56）

本轮 `retired`，[业主] 直答。每题标明驱动真相。三题可独立作答：Q54 定 P2 的候选线、裁决时机与证据；Q55 定合并态三包怎样进入生产、生产旧对象怎样处置；Q56 定执行跟踪、closure、[DNK] 指针、主线合并与工作树删除的方式与时机。三题都不改 S1–S5 已冻结的内容。

### Q54 — W3 管理页 P2：以哪条 UI 线为候选、在哪一步、凭什么证据交 [业主] 裁决？

**驱动真相**：`T-O-55`（W3 = dashboard + control UI 的未完成开发）；`T-O-65`（P2 仍由 [业主] 看截图裁决，e2e 通过不代替设计通过；S5 只复跑失败行与受影响的行；开发 Web 重启已授权）；`T-O-62`（证据存 `.anote/reviews/dsh-nano-local-sandbox/DNLS03/`，文档只记截图名与结论；软件回归与真机证据分开登记）；`T-O-59`、`T-O-61`、`T-O-67`（S1 会改动管理页的终端坞、交接入口与列表字段）。来源：`XB-28`、`XB-29`；[redesign todo P2：7](../plan/todo.DNLS03-control-redesign.md#L7)、[P2 对照：11–19](../plan/todo.DNLS03-control-redesign.md#L11-L19)。

- **影响范围**：[DNLS] `src/client/`（`index.jsx`、`history.jsx`、`i18n.js`）；`packages/dsh-nano-ui/src/shell.js` 与 `index.js`；nano-ui DESIGN §6 组件表与 §10 豁免表；redesign todo 的 P2、P4 行与「当前开发站」一节；closure 文首横幅；S4、S5 的截图清单。
- **为什么必须确认**：开发站加载并取证的是 `2ba1d4a`。本分支随后先删掉整个页签（`2959dc7`，理由是在宿主页签里又画了一层外壳），再以 nano-ui 外壳重建（`77e217e`，自述为进行中快照）；重建版未部署、无截图、todo 未登记（`XB-28`）。新外壳登记进了共享组件表，但仓内只有 [DNLS] 使用，与 DESIGN「两个以上插件会用才进 nano-ui」不符（`XB-29`）。S1 还会改动终端坞、交接入口和列表字段。不先定「哪条线是候选、什么时候看、看哪些图」，P2 要么去评一版已被删除的页面，要么到 S4 之后才发现候选线本身不合规。
- **当前建议 / 倾向**：选 **A：以分支 HEAD 的 `77e217e` 线为唯一候选，在 S1 内完成并接上 `T-O-59/61/67`；外壳按 DESIGN 条文退回 [DNLS] 包内，逐项登记 `nano-ui-exempt`；在 S4 现场取一组固定截图交 [业主] 裁决；不通过时在 S5 只返工 client，不换镜像、不清场。**
- **Reasoning**：候选只能有一条，而且应当是将要合并、将要发布的那条；`2ba1d4a` 已被本分支删除，评它没有下游价值。外壳归属按设计规范的现行条文处理，不为凑「第二个使用方」去改 [DNK]。截图在 S4 现场取，页面上才有运行中的对象、可用的终端和 Kitesurf 交接，这些正是参考图要求展示的内容。
- **问题（请 [业主] 裁决）**：P2 是以 HEAD 外壳线为唯一候选、外壳退回 [DNLS] 并登记豁免、S4 现场截图裁决、S5 只返工 client（A），在 S1 之前先就开发站上的 `2ba1d4a` 裁决（B），还是把 P2 移出本期、S4 只验管理页功能行（C）？
- **[业主]回答**：已确认 A（2026-11-20：「业主同意本轮全部推荐」），冻结为 `T-O-69`。

**【对本问题的解读】**　例：S1 结束时，[DNLS] 页签沿用 `77e217e` 的布局（顶栏、滑出列表、状态条），外壳代码位于 `dsh-nano-local-sandbox/src/client/`，每处自绘控件有一行豁免说明，nano-ui 不再导出 `WorkbenchShell` 等组件。S4 在新对象运行时，执行者按清单取 8 张图：总览（深色、浅色）、对象监控、服务与终端坞（含「在 Kitesurf 中打开」入口）、设置弹窗、最近操作回执、390 px 总览、390 px 设置；每张标明对应的参考行。[业主] 看图给出结论。若判不通过并附意见，S5 只改 client，重装 [DNLS]、重启开发 Web，重取受影响的截图；镜像、对象和卷都不动。本题不扩大 `T-O-65` 的授权，也不预设设计细节（那由 [业主] 看图裁决）。

**【可选选项清单】**

| 选项 | 候选线与裁决方式 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | HEAD `77e217e` 线为唯一候选；外壳退回 [DNLS] 并登记豁免；S4 现场取固定一组截图；不通过则 S5 只返工 client。 | 候选与合并、发布的是同一份代码；nano-ui 规则不破例；裁决发生在页面内容完整的时候。代价：P2 结论推迟到 S4 之后；外壳退回包内后，[DNK] 的同型抽屉仍是另一份实现，统一留待以后。 |
| B | S1 之前先就开发站 `2ba1d4a` 裁决 | 设计意见更早到达。代价：评的是已被 `2959dc7` 删除的页面；开发站上没有可用终端和对象交接；S1 改动后还要再评一次。 |
| C | P2 移出本期（[业主] 推迟），S4 只验功能行 | 本期不被设计往返拖住。代价：W3 只在功能上收口；HEAD 上一版未经评审的外壳会随合并进入主线，若同时执行生产切换，也会进入生产。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **登记**：本册登记候选线与裁决方式。redesign todo 的「当前开发站：`2ba1d4a`」一节与 closure 文首横幅改为历史记录（承接位置按 Q56 的跟踪方式）。参考原图登记为三张（补登 `03.png`）；原图仍只在主工作区 `.temp/`，不入库。
2. **S1 管理页**：在 `77e217e` 的基础上完成管理页，并接上 `T-O-59`（终端坞的可用行）、`T-O-61`（候选列表替代 `openKitesurf` 与私有 kind 判断）、`T-O-67`（`drivers`）。外壳从 `packages/dsh-nano-ui/src/shell.js` 移回 [DNLS] client；nano-ui `index.js` 删除这些导出，DESIGN §6 删除该行，§10 为每处自绘控件登记一行，`check-ui-rules` 的 U10 条数与 §10 相等。外壳里已使用宿主 `Button` 的地方保持不变。
3. **截图清单**：在 S4 现场、同一对象、同一已核 SHA 的制品上取上述 8 张；文件名 `p2-<视图>-<dark|light|390>.png`，存入 `.anote/reviews/dsh-nano-local-sandbox/DNLS03/`；每张对应 [redesign todo P2 对照](../plan/todo.DNLS03-control-redesign.md#L15-L28) 中的参考行；记录页面实际加载的 client SHA-256；不截会话内容。
4. **裁决与返工**：[业主] 的结论只写在 P2 行一处。不通过时，S5 只改 [DNLS] client，重装 [DNLS] 并重启开发 Web（`T-O-65` 授权 ④），不换镜像、不清场、不新建对象；只重取受影响的截图、复跑受影响的 W3 行。返工轮次不设上限，每轮都由 [业主] 裁决；返工不涉及 agent 场景时不发模型消息。
5. **判据**：W3 完成 = P4 真机行通过 + P2 获 [业主] 通过；e2e 通过不代替设计通过（`T-O-65`）。

**【推荐选项支持证据或其他选项的反例】**

- 两条线：`git log` 依次为 `2ba1d4a`（14:47）→ `2959dc7`（16:13，提交说明「painted a second chrome inside the host tab. Drop that registration」，−5237 行）→ `77e217e`（18:22，提交说明「Snapshot of the in-progress workbench adaptation before integrating the kitesurf-http-render line」，+4608 行）。redesign todo 仍写「当前开发站：`2ba1d4a`」（[:21](../plan/todo.DNLS03-control-redesign.md#L21)），closure 文首相同（[:1](../closure/DNLS03-closure.md#L1)）。HEAD 页签使用该外壳：[index.jsx:12–13](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L12-L13)、[:762](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L762)、[:808](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L808)。
- 规范条文：[DESIGN.md:14](../../dsh-nano-ui/DESIGN.md#L14)「两个以上插件会用：先改本文，再在 nano-ui 里实现」；外壳登记行 [DESIGN.md:153](../../dsh-nano-ui/DESIGN.md#L153)；仓内只有 [DNLS] 引用这些组件；[redesign todo:19](../plan/todo.DNLS03-control-redesign.md#L19)「只有 [DNLS] 一个已知消费者的布局，不能用『已移到共享包』证明符合通用缺口规则」。[DNK] 的同型抽屉是自有样式（[DNK index.js:111–114](../../../../dsh-nano-kitesurf/src/client/index.js#L111-L114)）。
- S1 一定会改管理页：`T-O-61` 要硬切的分支在 [index.jsx:393–394](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L393-L394)、[:835–838](../../../../dsh-nano-local-sandbox/src/client/index.jsx#L835-L838)。
- P2 属 [业主]、功能回归不代替：[redesign todo:7](../plan/todo.DNLS03-control-redesign.md#L7)；截图与加载制品核对的先例见 [:30–32](../plan/todo.DNLS03-control-redesign.md#L30-L32)。
- B 的反例：`2ba1d4a` 的页签注册已被 `2959dc7` 删除；该版本的截图里终端坞是共享身份拒绝（[redesign todo:30](../plan/todo.DNLS03-control-redesign.md#L30)），交接入口仍要求在 [DNK] 内重选（`XB-6`）。
- C 的反例：`T-O-55` 的 W3 就是「dashboard + control UI 的未完成开发」；`77e217e` 自述为进行中快照，跳过 P2 等于让未评审的界面进入主线。
- 诚实反方：若 [业主] 希望该外壳成为 [DNK] 与 [DNLS] 的共同外壳，正确做法是另开一题：先改 DESIGN，再迁移 [DNK]，并让 [DNK] 也过一次设计裁决；本题不扩到 [DNK]。P2 推迟到 S4 之后，设计返工发生在真机重放之后，可能让部分 W3 行复跑。

### Q55 — K-07：合并态三包怎样进入生产？生产旧对象怎样处置？

**驱动真相**：`T-O-60`（K-07 须给终态，不得停在「开放」）；`T-O-65`（授权只限 `dsh-dev`，不含生产实例与生产发布配对；超出部分另请 [业主]）；`T-O-66`（`/res` 与代理改写已退役，生产仍在运行这些面）；`T-O-58`（过渡态不是 `DNK01 T-O-4/5` 的最终兑现）；现行 `DNLS03 T-O-41`（已有对象 HTTP 无兜底）。来源：`XB-30`；[todo.DNLS03 K-07：134](../plan/todo.DNLS03.md#L134)。

- **影响范围**：`~/.dsh` web profile 的三包安装与生产 Web 重启；生产旧容器 `kitesurf` 与状态目录 `~/.dsh/nano-local-sandbox/state/kitesurf/`；`~/.dsh-desktop` 桌面 profile 与容器 `kitesurf-desktop`；[DNK]、[DNT] `AGENTS.md` 的「前置」；收口台账 K-07 行。
- **为什么必须确认**：生产 web 与桌面都还是旧 [DNLS] 加 kitesurf 线 [DNK]（`XB-30`）。合并态三包双向不兼容：新 [DNK]、[DNT] 先读 `/contract`，不符即拒；新 [DNLS] 只注册受管路由，旧 [DNK] 的请求会被拒。更关键的是，生产状态根里有旧目录而没有台账，新 [DNLS] 会拒绝开账，所以「先装新包、验收通过再清旧对象」这个顺序走不通。`T-O-65` 明确不含生产。不定，K-07 只能停在「开放」，或者由实现自行决定何时、怎样动生产。
- **当前建议 / 倾向**：选 **A：本期增加 S6「生产同批切换」，只针对 `~/.dsh` web：合并后以合并提交重建三包，SHA-256 须与 S5 最终候选一致；先留存旧插件目录，再退役生产旧容器 `kitesurf` 并永久删除其状态目录；一次安装三包、一次重启；只读验收；失败则以留存目录重装旧组合。桌面 profile 记为「[业主] 推迟」，写明同一配对约束。**
- **Reasoning**：三包只能同批升级，这是合同硬切的直接结果，不能靠兼容层分批。生产继续运行本册已退役的面，与 `T-O-66`、`T-O-58` 不一致。新台账拒绝在有旧条目的状态根上开账，这是「重启对账不以空表认领」的失败关闭设计（[todo.DNLS03 P1-04：22](../plan/todo.DNLS03.md#L22)），不应为迁就升级而放宽；开发站已有同类先例：[业主] 选择彻底删除旧对象与数据，不备份、不迁移。回滚只恢复插件组合，不恢复旧对象的数据，这一点在授权里写明。
- **问题（请 [业主] 裁决）**：K-07 是本期执行 web 生产同批切换、先删生产旧对象再装新包、桌面推迟（A），本期止于合并、生产保持旧组合直到 [业主] 另行发布（B），还是给合并态 [DNK]、[DNT] 加旧路由回落、允许分批升级（C）？
- **[业主]回答**：已确认 A（2026-11-20：「业主同意本轮全部推荐」），冻结为 `T-O-70`。

**【对本问题的解读】**　例：S5 通过、P2 通过，分支合入 main。执行者从合并提交重建三个 tarball，SHA-256 与 S5 在开发站验证过的三个一致。接着把 `~/.dsh/plugins/` 下三包的当前目录复制到临时位置；核对生产容器 `kitesurf` 的 ID、镜像与挂载后，停止并删除它，再删除 `~/.dsh/nano-local-sandbox/state/kitesurf/`（含 `kitesurf/kitesurf`，约 10 MB），确认状态根里没有其他条目。然后一次安装三个 tarball，重启生产 Web。打开生产页面：`/contract` 的头与正文都是 `dnls.control/1`，页面加载的三份 client 与 tarball 一致，右栏出现「沙箱」页签，总览为空。通过后删除临时副本。生产里此时没有受管对象，[业主] 需要时自己从工作台创建。若验收失败，以临时副本为 spec 重新安装旧三包、重启，生产回到旧组合；旧对象的数据已删，不能恢复。桌面应用不动，继续运行旧组合，直到 [业主] 另行决定。本题不涉及开发站、宿主 pin、`term.audit` 或 `kitesurf-lab-*` 实验容器。

**【可选选项清单】**

| 选项 | 生产怎么走 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | S6：合并提交重建、SHA 与 S5 一致 → 留存旧目录 → 删生产旧对象与状态目录 → 同批安装、一次重启 → 只读验收 → 失败重装旧组合。桌面推迟。 | 生产与主线一致，退役的面不再在生产运行；K-07（web）有终态。代价：生产旧对象的约 10 MB 数据永久删除；切换窗口内生产 [DNK] 不可用；桌面在一段时间内仍是旧组合。 |
| B | 本期止于合并；K-07 记「[业主] 推迟」 | 本期不动生产。代价：生产在不定期限内运行本册已退役的 `/res` 与 HTML 代理改写等旧面；任何单包升级都会立刻打断生产；以后发布仍要回答本题的每一项。 |
| C | 合并态 [DNK]、[DNT] 在发现失败时回落旧路由，允许分批升级 | 升级顺序自由。代价：违反硬切与 `T-O-41`「无兜底」；把 `T-O-66` 刚退役的面重新接回客户端；兼容层没有退役终点。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **授权范围**（[业主] 签收 A 即授权以下动作，仅限 `~/.dsh` 的 web profile）：① 以合并提交重建三包 tarball，SHA-256 与 S5 最终候选逐一比对，一致才使用，不一致即停；② 留存 `~/.dsh/plugins/` 下三包的当前目录，作为唯一回滚来源，切换成功后删除；③ 核对后停止并删除容器 `kitesurf`，永久删除 `~/.dsh/nano-local-sandbox/state/kitesurf/`，不备份、不迁移，并确认状态根内没有其他条目；④ 一次 `dsh plugin --profile web add` 三个 tarball，重启生产 Web 一次；⑤ 只读验收；⑥ 失败时以留存目录重装旧三包并重启。不发模型消息，不在生产创建对象，不改宿主 pin，不动 `~/.dsh/nano-local-sandbox/term.audit`、桌面 profile 与 `kitesurf-lab-*`。
2. **只读验收**：按 [DNLS AGENTS 验收：70–76](../../../../dsh-nano-local-sandbox/AGENTS.md#L70-L76)：profile 的依赖与 bundles 含三包；`GET /nano-local-sandbox/contract` 头与正文均为 `dnls.control/1`；页面实际加载的三份 client 与 tarball 字节一致；已挂载 session 的右栏出现「沙箱」页签且总览为空；[DNK] 页签打开后为空选择器。
3. **配对约束**：在 [DNK]、[DNT] `AGENTS.md`「前置」各加一行：需要提供 `dnls.control/1` 的 [DNLS]，不与旧 [DNLS] 混装；[DNLS] `AGENTS.md`「安装」加一行：与 [DNK]、[DNT] 同批安装，状态根有旧条目时先按上述方式清理。这是兼容事实，不是 release-gate，不进 `RELEASE.md` 的必跑项。
4. **桌面**：`~/.dsh-desktop` 与 `kitesurf-desktop` 记为「[业主] 推迟」；以后执行时适用同一约束（三包同批、状态根先清），走 [RELEASE 本地部署](../../../../RELEASE.md#L67) 一节。
5. **台账**：K-07 拆为两行，web 记「本期实现」并附三包 SHA、切换 UTC、旧容器 ID 与删除核对结果；桌面记「[业主] 推迟」。

**【推荐选项支持证据或其他选项的反例】**

- 生产是旧组合：`~/.dsh/profiles/web/node_modules` 的三包链接到 `~/.dsh/plugins/`，其中 [DNLS] `src/host` 没有 `control-registry.js`、`object-authz.js`、`managed-routes.js`（只读目录列表）；[todo.DNLS03:134](../plan/todo.DNLS03.md#L134)「生产当前是 kitesurf 版 [DNK] 加旧 [DNLS]，两者须同批升级」。
- 双向不兼容：[managed-client.js:75–79](../../../../dsh-nano-kitesurf/src/shared/managed-client.js#L75-L79) 发现失败或版本不符即拒；[DNT sandbox-resource.js:31–34](../../../../dsh-nano-terminal/src/client/sandbox-resource.js#L31-L34) 同；新 [DNLS] 入口只注册 `createManagedRoutes`（[index.js:35](../../../../dsh-nano-local-sandbox/index.js#L35)）。
- 必须先清旧目录：[control-registry.js:342–350](../../../../dsh-nano-local-sandbox/src/host/control-registry.js#L342-L350) 状态根有其他条目而无 `registry.json` 时抛出「refusing an empty ledger」；状态根默认是 `${DSH_HOME}/nano-local-sandbox/state`（[DNLS AGENTS:100](../../../../dsh-nano-local-sandbox/AGENTS.md#L100)），生产该目录下现有 `kitesurf/kitesurf` 而无台账；[DNLS AGENTS:80](../../../../dsh-nano-local-sandbox/AGENTS.md#L80)「台账不可验证时不要删锁、清库或把旧卷当成新环境」，因此清理必须由 [业主] 授权，不能由实现自行决定。
- 开发站先例：[todo.DNLS03:112–113](../plan/todo.DNLS03.md#L112-L113)「彻底删除旧开发实例及其数据，不备份、不迁移」，删除后「state 根为空」，再安装新包。
- 没有旧卷接管：[closure:16](../closure/DNLS03-closure.md#L16)「不推广到生产……或旧卷接管」、[:26](../closure/DNLS03-closure.md#L26)「未交付操作者接管入口」。
- 端口不冲突：受管端口池在旧固定端口 8798–8803 之外（[managed-profile.js:22–24](../../../../dsh-nano-local-sandbox/src/host/managed-profile.js#L22-L24)）。
- C 的反例：`T-O-41`「无 body/header/session/env 兜底」（[台账:60](./DNLS03-qna-truth.md#L60)）；[DNLS AGENTS:102](../../../../dsh-nano-local-sandbox/AGENTS.md#L102)「旧的 `KITESURF_*` 名字已退役，无别名」。
- 诚实反方：A 让生产在切换窗口内没有可用的 Kitesurf，旧对象里的浏览器状态（登录态、历史）永久丢失；若 [业主] 认为这些数据有价值，应选 B，并另行提出旧卷接管的问答。桌面推迟期间，若有人单独升级桌面里的某一个包，会立刻打断桌面版的 Kitesurf。

### Q56 — 收口交接：执行跟踪放在哪里、closure 怎么收、[DNK] 指针何时写、何时合并与删除工作树？

**驱动真相**：`T-O-55`（不另立阶段名或计划文件；正式计划 append 至 DNLS03 action-plan 并更新对应 todo）；`T-O-60`（收口台账由 todo §7 扩展；七份旧文档冻结、只加一行指针；DNK01 台账的状态行与部署快照只追加指针）；`T-O-57`（DNK01 族改判只在本册登记，DNK01 侧只留指针）；`T-O-65`（S1–S5 的顺序与「不部署」判据）；`T-O-58`（kitesurf 分支以 `--no-ff` 并入后退役的先例）。来源：`XB-31`；AGENTS「worktree」原则。

- **影响范围**：`todo.DNLS03.md`、`todo.DNLS03-control-redesign.md`、`DNLS03-closure.md`、action plan §10–§11 与补充计划；[DNK] 七份旧文档与 DNK01 台账；本册入库时机；分支与 main 的合并；工作树与分支的删除。
- **为什么必须确认**：同一阶段的状态现在写在三处：closure（`b3ad7e5` 的 No-Go，文首叠了两段 11-20 横幅）和两份 todo（总 todo 把「当前追踪」指向 redesign todo）（`XB-31`）。补充计划若再开一份跟踪，就是四处。DNLS03 发车指令要求 closure，[DNPR] 的先例却按它自己的真相删掉了 closure。main 已前进 21 个提交，三个账本文件两边都改过；分支没有上游；本册尚未入库。合并与删除工作树的时机，直接决定 S2 构建的制品是不是将要合并、将要发布的那一份。
- **当前建议 / 倾向**：选 **A：一份跟踪、一份终判、指针先写、主线先并入。** ① `todo.DNLS03.md` 新增「补充阶段 S1–S6」一节，作为唯一执行跟踪，扩展后的 [DNK] 收口台账也放在这里；redesign todo 冻结为历史，只留指针。② 沿用唯一的 `DNLS03-closure.md`，收口时一次改写 §0 终判并删去叠加横幅，不新建第二份 closure。③ [DNK] 七份旧文档与 DNK01 台账的指针在 S1 当即写。④ S1 开头把 main 合入分支一次，本册与补充计划随 S1 入库；S5 与 P2 通过后以 `--no-ff` 合入 main；工作树保留到 S6 结束，回填后删除工作树与分支。
- **Reasoning**：每类信息只留一处：过程与证据在 todo，终判在 closure，合同在本册 §1。指针在 S1 写，是因为 S1–S6 期间旧文档仍会误导读者（例如 `1119-delivery-gaps` 仍称全部 OPEN）。先把 main 并入分支，S2 构建的就是将要合并的代码树，最终合并时不再出现新冲突，制品 SHA 也不会因合并而变。工作树留到 S6 结束，S6 发现缺陷时可以在同一处修复。
- **问题（请 [业主] 裁决）**：收口是采用「todo 单一跟踪 + 沿用唯一 closure 并改写终判 + S1 写指针 + 主线先并入、S6 后删工作树」（A），按 [DNPR] 先例删除 closure、终判写入 action plan §10–§11、合并与删除留给 [业主] 执行（B），还是为补充阶段新建 closure 与 todo、旧文档原样保留（C）？
- **[业主]回答**：已确认 A（2026-11-20：「业主同意本轮全部推荐」），冻结为 `T-O-71`。

**【对本问题的解读】**　例：S1 第一天，执行者把 main 合入分支，三个账本文件用仓内脚本重新生成、不手改，然后与本册、补充计划一起提交。`todo.DNLS03.md` 出现新的一节，每行写执行方、终态与证据；redesign todo 文首一行写明「已冻结，后续见 todo.DNLS03 补充阶段」。[DNK] 的 `1119-delivery-gaps.md` 等七份文档文首各加一行指针。S5 与 P2 通过后，分支合入 main，在 main 上跑三包测试与检查；S6（若 [业主] 签收 Q55 A）用 main 的制品执行；之后在 main 上一次回填 action plan §11、todo 与 closure §0，然后删除工作树和分支。读者想知道 DNLS03 的结论只看 closure §0，想知道过程只看 todo。本题不改 S1–S5 的内容，也不改 `T-O-60` 已定的台账列与终态集合。

**【可选选项清单】**

| 选项 | 跟踪、终判与合并 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | todo 单一跟踪；沿用唯一 closure、收口时改写 §0；S1 写 [DNK] 与 DNK01 指针；S1 开头并入 main，S5+P2 后 `--no-ff` 合入 main，S6 后回填并删除工作树与分支。 | 一处跟踪、一处终判；最终合并无新冲突，S2 制品即发布制品；工作树寿命有明确终点。代价：S1 开头多一次主线合并；closure 里 `b3ad7e5` 的历史判定只保留在 git 历史中，不在文内并列。 |
| B | [DNPR] 式：删除 closure，终判写入 action plan §10–§11，合并与删除工作树由 [业主] 执行 | 少一份文档。代价：DNLS03 发车指令 STEP.6 要求 closure，todo 多处引用它；[DNPR] 的 `T-O-17` 是它自己的冻结真相，套用到这里等于改发车指令；工作树删除没有确定的时点。 |
| C | 补充阶段新建 closure 与 todo，旧文档原样保留 | 补充阶段的记录自成一体。代价：两份终判、三份 todo 并存，违反单一真源；与 `T-O-55`「不另立计划文件」冲突；旧文档继续误导。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **入库**：S1 的第一次提交包含本册与 append 进 action plan 的「DNLS03 补充计划」；此前本册不入库（`T-O-55`：收口后才输出正式计划）。
2. **主线并入**：S1 开头 `git merge --no-ff main` 一次。冲突只应出现在 `security/route-sensitivity.json`、`feature-contract.json`、`perf-binding-ids.md`，以仓内生成与检查脚本重建（`check-route-sensitivity`、`check-feature-contract` 0 漂移），不手改；三包 `npm test` 全绿后再继续。不用 rebase：分支虽未推送，但 DNK01 问答引用了分支内的提交号（[todo.DNLS03:124](../plan/todo.DNLS03.md#L124)）。S1–S5 期间 main 若再前进，只在合入 main 之前再并一次；新提交若触及三包、`packages/` 或 `profiles/`，重建并复跑受影响的行。
3. **跟踪**：`todo.DNLS03.md` 新增「补充阶段 S1–S6」一节，包含扩展后的 [DNK] 收口台账（`T-O-60`）；[todo.DNLS03:4](../plan/todo.DNLS03.md#L4) 的「当前追踪」改指这一节；redesign todo 冻结，文首加一行指针，P2、P4 两行移到新节继续；旧行原文不改。
4. **指针（S1 当即）**：[DNK] 七份旧文档文首各加一行指针，指向本册 §1 与收口台账；DNK01 台账的状态行与部署快照各追加一行指针，列出本册对 DNK01 族的改判（`T-O-63`、`T-O-64`、`T-O-66`、`T-O-68`）；不改 DNK01 旧真相原文。
5. **closure**：S1 只把文首两段横幅换成一行「补充阶段进行中，见 todo 补充阶段一节」；收口时一次改写 §0 终判（按 S4、S5、S6 的结果），其余各节保留为 `b3ad7e5` 快照的历史记录并在节首注明；不新建 closure 文件。
6. **合并与删除**：S5 与 P2 通过后，分支以 `--no-ff` 合入 main（提交信息沿用 `merge(dnls): …`）；在 main 上跑三包 `npm test` 与 `check-*`；以合并提交重建三包 tarball，并与 S5 最终候选比对 SHA-256（Q55 也使用这一结果）。S6 完成后（或 [业主] 推迟 S6 时，在合并验证之后），在 main 上一次完成文档回填：action plan §11 执行日志、todo 终态、closure §0；随即删除工作树 `.agents/worktrees/dnls03-managed-sandbox-control` 与分支 `dnls03-managed-sandbox-control`。S6 若因代码缺陷失败：先回滚生产，在同一工作树修复，再走一次合并。
7. **不碰**：主工作区未跟踪的 `docs/specs/dsh-nano-3d-factory/` 与另一个工作树 `model-selector-fusion-v1`。

**【推荐选项支持证据或其他选项的反例】**

- 三处状态：closure 文首两段横幅与 `b3ad7e5` 判定并存（[closure:1–5](../closure/DNLS03-closure.md#L1-L5)、[:20](../closure/DNLS03-closure.md#L20)）；总 todo 把「当前追踪」指向 redesign todo（[todo.DNLS03:4](../plan/todo.DNLS03.md#L4)），又登记了 closure（[:64](../plan/todo.DNLS03.md#L64)）。
- 发车指令要求 closure：[todo.DNLS03:176](../plan/todo.DNLS03.md#L176)（STEP.6）。
- [DNPR] 先例的来源是它自己的冻结真相：[DNPR01 台账:69](../../dsh-nano-progress-report/qna/DNPR01-qna-truth.md#L69)（`T-O-17`：不另立收口文档；完成 = 验证 + 合并 + 回写 + 删 worktree）；`6df597c` 删除 closure，提交说明写「merge/worktree removal left to the owner」。
- 旧文档仍误导：`XB-10`（[1119-delivery-gaps.md:362](../../dsh-nano-kitesurf/1119-delivery-gaps.md#L362) 仍宣称全部 OPEN）。
- 主线与冲突：merge-base `0dd99ab`，main 前进 21、分支领先 38；三个账本文件两边都改过；分支无上游；[DNLS] 绑定表只烘焙本包行（[bindings.js:1–3](../../../../dsh-nano-local-sandbox/lib/bindings.js#L1-L3)），他包账本行不改变本包制品。
- 合并先例：`3e7a775` 以 `--no-ff` 并入 kitesurf 线，「保留 DNK01 问答引用的提交号」，分支随后退役（[todo.DNLS03:124](../plan/todo.DNLS03.md#L124)，`T-O-58`）；main 上 `a681ac5 merge(dnpr): …`。
- C 的反例：`T-O-55`「不另立阶段名或计划文件」；AGENTS「单一真源」。
- 诚实反方：A 让工作树一直活到 S6 结束；若 Q55 选 B，工作树在合并验证与回填后即删除。主线并入会在分支历史中多一个合并提交。closure 改写后，`b3ad7e5` 的 No-Go 判定只能从 git 历史读到。

## 11. 收口（全轮冻结）

- **冻结判据**：方向钉死，§1 全部 `T-O` 冻结，无 OPEN 残题（或残题由 [业主] 显式推迟并登记）。
- **11.1 判定**：Round 5 三题由 [业主] 一次性签收 A（2026-11-20：「业主同意本轮全部推荐」），无保留、无附加条件，冻结为 `T-O-69`–`T-O-71`。随后对全册做了一次一致性审查（11.3）：发现项都是已冻结真相之间的读法合并、执行细节补登或已知取舍，已在 `T-O-69`–`T-O-71` 的下游约束与本节写明；没有发现需要 [业主] 再裁决的阻断事实，也没有改动任何已锁定真相的原文。**执行层于 Round 5 冻结，本册状态为 `frozen`。**
- **11.2 冻结核对**：

| 检查项 | 结果 |
|---|---|
| Truth-ID | `T-O-55`–`T-O-71` 共 17 条，连续无缺号：foundational 8 条（`T-O-55`–`T-O-62`），execution 9 条（`T-O-63`–`T-O-71`） |
| 题目 | Q44–Q56 共 13 题，答复栏全部为「已确认 A」，无「待答」 |
| OPEN 残题 | 0 |
| [业主] 推迟项 | K-07 桌面 profile（`T-O-70`） |
| 宿主依赖（登记，不在插件内推断） | 无 session 的入口（`XB-5`）；区分 API token 客户端（`T-O-59`）；非 owner 主体驱动回合时的工具限制（`T-O-64`，S1 核实，核实不了即登记） |
| 现场授权 | 开发站：`T-O-65`（含模型消息上限）；生产 web：`T-O-70`；`T-O-62` 只定 e2e 形态与模型消息的授权来源；其余一律另请 [业主] |
| release-gate | 未新增；`RELEASE.md` 不新增必跑项（`T-O-62`、`T-O-70`） |
| 指针落点 | DNK01 台账状态行 [:21](../../dsh-nano-kitesurf/qna/DNK01-1120-qna-truth.md#L21)、部署快照 [:87](../../dsh-nano-kitesurf/qna/DNK01-1120-qna-truth.md#L87) 均存在（`T-O-60`、`T-O-71`） |

- **11.3 收口审查：发现与处置**（审查范围：§0–§12 全文、§1 台账逐行、各题答复与执行说明；对照源码与现场只读取证 `XB-32`、`XB-33`）：

| 编号 | 类型 | 发现 | 处置 |
|---|---|---|---|
| R-1 | 欠更新 | §12 只把 `T-O-65` 列为现场动作的授权来源，S6 的生产授权（`T-O-70`）未列入。 | §12 改为「`T-O-65`（开发站）与 `T-O-70`（生产 web）」。 |
| R-2 | 表面冲突 | `T-O-65` 写「不含生产实例……与生产发布配对（K-07）」，`T-O-70` 授权 S6 生产切换。 | 不冲突：`T-O-70` 正是 `T-O-65`「生产部署另请 [业主]」的那次另请。`T-O-65` 的开发站范围与 S1–S5 内容不变，S6 只由 `T-O-70` 定义；已写入 `T-O-70` 下游约束。 |
| R-3 | 已被后续裁定 | `T-O-55` 下游约束「三项工作的先后顺序待本册裁定」。 | 已由 `T-O-65`（S1–S5，场景 W1 → W2 → W3）与 `T-O-70`（S6）裁定；台账原行不改。 |
| R-4 | 已被后续裁定 | `T-O-58` 下游约束「K-01 仍须 [业主] 裁决」。 | 已由 `T-O-66` 裁定（彻底退役），K-01、K-04 终态为「本期实现」；台账原行不改。 |
| R-5 | 正文与后续真相冲突 | Q46 的推荐与解读写「原选择器保留用于切换」「之后在 [DNK] 下拉里切到另一对象仍然可以」，执行说明 4 的真机步骤含「切到另一对象」；`T-O-67` 定为引用页签锁定对象、不提供换对象。 | 以 `T-O-67` 为准；`T-O-61` 台账行本无「切换」一句，不受影响。补充计划中 `T-O-61` 的真机行写为：工作台选中对象 → 在 Kitesurf 中打开 → 显示该对象 → 再次打开回到原页签，引用页签与空选择器页签并存；与 `T-O-67` 的真机行合并登记；「两个引用两个页签」只作软件回归证据（S3 只有一个对象）。 |
| R-6 | 同题内歧义 | Q54 执行说明 1 把 redesign todo「当前开发站：`2ba1d4a`」一节转为历史，执行说明 3 又让截图对应 `:15–28` 中的参考行（含该节 [业主] 指定的四行参考）；驱动行另引 `:11–19`。 | 合读为「参考行沿用、实测转历史」；对照清单列在 `T-O-69` 下游约束。 |
| R-7 | 竞态 | `T-O-70` 要求 SHA-256 与「S5 最终候选」一致；`T-O-71` 允许合入 main 前再并一次 main，触及三包时要重建并复跑，比对基准会移动。 | `T-O-70` 明确基准是最后一次复跑所用的三包；不一致即停，不放宽。 |
| R-8 | 同题内歧义 | Q56 执行说明 1 写「S1 的第一次提交包含本册」，解读例写「合并后……与本册、补充计划一起提交」：合并提交是否携带本册不明。 | `T-O-71` 定：合并提交只含 main 并入与账本重建；紧随其后的第一个普通提交含本册与补充计划。 |
| R-9 | 欠登记（竞态） | 合入 main 发生在主工作区，而主工作区可能有 [业主] 未提交的改动（本册取证期间曾有 `AGENTS.md` 未提交修改与未跟踪的 `scripts/dep-status.mjs`）。 | `T-O-71` 补登：不覆盖、不暂存、不清理主工作区改动；与本分支改动路径重叠即停，请 [业主] 处理。 |
| R-10 | 已知取舍 | 内核失败体另带 `incidentId`（`XB-33`），`T-O-68` 白名单「不含其他键」会去掉它。 | 不改：`incidentId` 仍记在操作行，可经 `/operations` 查到；白名单照旧；S1 单测按白名单断言，失败体中没有 `incidentId`。 |
| R-11 | 欠登记（执行点） | `T-O-64` 规定打开工具「接管中拒绝」，`T-O-63` 让桥只拦无宿主凭据的连接；而打开内核由 [DNLS] 宿主以宿主类连接执行（`XB-33`），桥侧接管闸拦不到经内核发起的 agent 打开。 | 按现行文字合读：`DNK01 T-O-1` 要求 MCP 打开「必须计入写，否则被 `T-O-3` 拦不到」，`DNK01 T-O-3` 的拦截面是「agent 主体（MCP 与 relay）」，人在 pane 上的 REST 动作不受约束。因此模型工具与 `/mcp` 两个入口的打开，由 [DNLS] 分派器在调用打开内核之前读取该对象的 `humanHold`：active 即以既有 `kitesurf.control.held` 拒绝，属派发前失败，按 `T-O-68` 只给 `errorId`；读取失败按既有 `control.bridge` 失败关闭。HTTP `/open`（pane）不受接管约束。不新增 errorId、路由或 lane。S1 单测覆盖三个入口在接管中的差异；S4 的 agent 接管场景同时验证打开工具被拒。 |
| R-12 | 欠登记 | Q55 未写镜像去留；生产旧容器、桌面容器与开发对象同属 `kitesurf-engine` 镜像族，镜像存储是本机共享的（`XB-32`）。 | `T-O-70` 补登：S6 不删除任何镜像。 |

- **11.4 改判索引**（本册对前册与他族真相的全部改判；原文一律不改，读者以本册对应条目为准）：

| 被改判条目 | 本册条目 | 方式 |
|---|---|---|
| `DNLS03 T-O-44/52`（共享 owner 与终端） | `T-O-59` | 澄清式 append supersession：owner 可持有并附着自己的沙箱终端 |
| `DNLS03 T-O-51` 所含 Q40 A 第 3 项 | `T-O-61` | 澄清式 append supersession：经宿主导航收到的明确对象引用视为用户的明确选择 |
| `DNLS03 T-O-54`（不固定私有 kind） | `T-O-61` | 补齐实施，原文不改 |
| `DNK01 T-O-1` | `T-O-64`、`T-O-68`；R-11 | agent 侧落点为模型工具；受管失败投影；接管拒绝的执行点 |
| `DNK01 T-O-2/3` | `T-O-63` | 澄清式 append：代次宿主凭据、读白名单、`relay.conns` 只计 agent 类 |
| `DNK01 T-O-4` | `T-O-66` | 「改写到同源代理」「path 镜像」两句退役；追加「HTML 投影保留真实地址」 |
| `DNK01 T-O-5` | `T-O-66` | 整条退役 |
| `DNK01 T-O-6` | `T-O-66` | `/res` 与 `res.public-tunnel` 退役，`/open` 隧道 hint 保留 |
| [todo.DNLS03:126](../plan/todo.DNLS03.md#L126) 的 `/res` 处置 | `T-O-66` | 取代 |
| redesign todo「当前开发站」与 P2、P4 行；closure 文首横幅；[todo.DNLS03:4](../plan/todo.DNLS03.md#L4) | `T-O-69`、`T-O-71` | 转为历史、迁移或改指 |

- **11.5 交接**：
  1. 下一步撰写「DNLS03 补充计划」，append 至 [DNLS03 action-plan](../plan/DNLS03-managed-sandbox-control.md)；§2 CITE 本册 §1 的 17 条与 11.3 的处置。补充计划至少包含：S1–S6 的阶段内容与完成判据；S4 场景清单（W1 → W2 → W3，按 R-5、R-11 写定）与模型消息计数（每次完整重放 ≤ 20 条）；P2 的 8 张截图与对照清单（`T-O-69`）；S6 的步骤、验收与回滚（`T-O-70`）；收口台账的逐行终态初值（`T-O-60`）。
  2. 同步更新 [todo.DNLS03](../plan/todo.DNLS03.md)：新增「补充阶段 S1–S6」一节，并按 `T-O-71` ① 迁入 P2、P4 两行（迁移、指针与改指在 S1 执行）。
  3. 本册与补充计划随 S1 入库（`T-O-71`）；不另立计划文件（`T-O-55`）。

## 12. 使用约束

[业主] 在各题回答栏裁决；修正以追加记录为准，不改写前册与本册旧行。计划引用 Truth-ID 与对应题答，不把推荐、测试或普查分类当作授权。每轮只问一个焦点；上一轮未冻结不生成下一轮的问题。除 `T-O-65` 明列的开发站动作与模型消息、`T-O-70` 明列的生产 web 切换动作外，本册不授权 implementation 以外的部署、实机破坏性动作或测试对象处置；超出部分逐项另请 [业主]。不增设 release-gate。

## 13. [业主] 覆盖：撤销合并与发布前的门禁（2026-11-21）

[业主] 裁定：下列条件在实质上阻拦合并或发布，违反 [AGENTS.md]「不得过度仪式」（不得发布未经 [业主] 允许的 release-gate，不得阻碍 [业主] 进行发布）。以本节 append-only 覆盖，旧行原文不改。

1. **P2 不再是门**：`T-O-69` 的「S4 八张截图交 [业主] 裁决」「W3 完成 = P4 真机行通过 + P2 获 [业主] 通过」，`T-O-71` ⑤ 的「S5 与 P2 通过后」中的 P2 前置，一并作废。管理页设计意见是普通的迭代反馈，[业主] 随时给出、随时返工，不设通过或不通过的结论，不阻拦合并、发布或收口。
2. **截图不设齐备要求**：S4-02 八张 `p2-*.png` 不再是完成条件；截图只作参考。
3. **SHA 比对不再是闸**：`T-O-71` ⑤ 与 `T-O-70` ① 的「按合并提交重建三包、与 S5 最终候选逐包比对、不一致即停」作废。合入 main 后在 main 上跑三包测试与 `check-*`，作为普通步骤并记录结果；S6 安装时记录所用三包 SHA 并核对页面加载字节，作为记录，不是关卡。
4. **完成定义不设证据闸**：勾选时写明证据即可，不再以「每项必须带 `DNLS03X-T*` 通过证据」作为收口门槛。
5. **保留**：`T-O-65` 与 `T-O-70` 的授权边界（含模型消息上限）不变。它们限制的是执行者的动作范围，不阻拦 [业主] 发布；放宽它们须 [业主] 另行决定。S6 仍按 `T-O-70` 的既有授权执行，本节不为它新增前置。
6. 合并时机由 [业主] 决定。

## 修订历史

| 版本 | 日期 | 作者 | 主要变更 |
|---|---|---|---|
| v0.1 | 2026-11-20 | DNLS03 架构审查 | 登记开轮基线 `T-O-55`–`T-O-58` 与基线事实 `XB-1`–`XB-13`；提出第一轮 foundational Q44、Q45，两题待答。 |
| v0.2 | 2026-11-20 | DNLS03 架构审查 | [业主] 签收 Round 1 全部推荐：Q44、Q45 冻结为 `T-O-59`、`T-O-60`；补中场评估 I 与 Round 2 取证 `XB-14`–`XB-17`；提出第二轮 foundational Q46、Q47，两题待答。 |
| v0.3 | 2026-11-20 | DNLS03 架构审查 | [业主] 签收 Round 2 全部推荐：Q46、Q47 冻结为 `T-O-61`、`T-O-62`，foundational 收束；补中场评估 II 与 Round 3 取证 `XB-18`–`XB-22`；提出第三轮（首轮 executional）Q48、Q49、Q50，三题待答。 |
| v0.4 | 2026-11-20 | DNLS03 架构审查 | [业主] 签收 Round 3 全部推荐：Q48、Q49、Q50 冻结为 `T-O-63`、`T-O-64`、`T-O-65`；补中场评估 III 与 Round 4 取证 `XB-23`–`XB-27`；提出第四轮 executional Q51、Q52、Q53，三题待答；收口节登记「Round 5 可作冻结轮」的预判与前提。 |
| v0.5 | 2026-11-20 | DNLS03 架构审查 | [业主] 签收 Round 4 全部推荐：Q51、Q52、Q53 冻结为 `T-O-66`、`T-O-67`、`T-O-68`；补中场评估 IV 与 Round 5 取证 `XB-28`–`XB-31`；提出第五轮 executional Q54、Q55、Q56（预判为执行层冻结轮），三题待答；收口节改为 §11、使用约束改为 §12。 |
| v1.0 | 2026-11-20 | DNLS03 架构审查 | [业主] 签收 Round 5 全部推荐：Q54、Q55、Q56 冻结为 `T-O-69`、`T-O-70`、`T-O-71`；补收口审查取证 `XB-32`、`XB-33`；全册一致性审查登记 R-1–R-12 并就地处置（§12 授权来源补 `T-O-70`；读法合并与补登写入 `T-O-69`–`T-O-71` 下游约束）；§11 改写为最终收口（判定、冻结核对、审查表、改判索引、交接）；文档状态改为 `frozen`。 |
| v1.1 | 2026-11-21 | [业主] 裁定 | 追加 §13：撤销 P2、截图齐备、SHA 比对、完成证据闸等合并与发布前门禁；授权边界不变。旧行原文不改。 |
