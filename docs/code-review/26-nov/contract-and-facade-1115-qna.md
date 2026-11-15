# CF1115 QNA · Contract 与 Facade 统一[真相层]对账册（渐进式 · 多轮 append）

> - **范围（scope）**：[dsh-nano] 全部活跃插件的 contract 与 facade 固定真源、分阶段统一及测试的方向与执行层真相锁定；当前八包以 `AGENTS.md:23-32` 为准，退役包只参与历史对账。
> - **分析锚点**：[`contract-and-facade-1115-eval.md`](./contract-and-facade-1115-eval.md)。该文件提供事实与债务分析，不自动提供已获批准的实现方案。
> - **模板**：[`.adocs/templates/qna-progressive.md`](../../../.adocs/templates/qna-progressive.md)。保留分轮状态、Truth-Gate、问答、中场评估、后续轮承接、收口、使用约束及修订历史骨架；未开启轮次不填题面。
> - **qna 位点**：`pre-charter（多轮 deep-dive）`。
> - **角色配置**：提问与架构分析 `CF1115 架构 agent`；裁决 `[业主]`。
> - **second-opinion 模式**：`retired`，自本 campaign 起不设该角色的分析栏或答复槽位，按[业主]要求直接裁决。
> - **下游消费者**：本 campaign 的统一实施计划及分阶段迁移/测试任务；正式计划中的 owner-gated 真相引用本文 §1，不另抄一份决定真源。
> - **文档状态**：`已冻结`（2026-11-15 最终收口）。**baseline 六条及 Q1–Q16 全部回答并冻结，§1 累计二十二条真相、一百二十六条细节；第6轮已完成最终总结与全册一致性审计，campaign 真相层收口。实施尚未完成，不把冻结当债务清零。**
> - **campaign 结构**：四道 foundational、Round 3–6 十二道 executional 题全部冻结；第6轮为[业主]指定的最终轮，未预排第7轮，不以自动defer或代码现状代答。
> - **Truth-ID 命名空间**：`T-O-CF1115-*`；baseline 为 `-1` 至 `-6`，Round 1 为 `-7` / `-8`，Round 2 为 `-9` / `-10`，Round 3 为 `-11` 至 `-13`，Round 4 为 `-14` 至 `-16`，Round 5 为 `-17` 至 `-19`，Round 6 为 `-20` 至 `-22`；与下游 planning §2 共命名空间，冻结后不回收、不重编号。
> - **代码基线**：`main @ f7199f96259baad78b1b6f162db38297ecaff5c1`，与评估报告一致；本 campaign 只读补查代码、更新本文件，没有实施协议迁移或运行时验收。

---

## 0. 分轮状态总览

| 轮次 | 题号区间 | 焦点 | 状态 |
|---|---|---|---|
| Baseline（既有明确决定归档，不占问题数） | 无 | 总目标、分析锚点、治理约束与渐进程序 | `frozen`，见 §1 的六条真相及其指令来源 |
| Round 1 · foundational | `Q1–Q2` | 固定真源的架构归口，以及分阶段收敛的完成单位 | `frozen`，[业主]同意全部推荐 → `T-O-CF1115-7` / `-8` |
| Round 2 · foundational | `Q3–Q4` | 合同作者模型与多提供方的同约判定 | `frozen`，[业主]同意全部推荐 → `T-O-CF1115-9` / `-10` |
| Round 3 · executional | `Q5–Q7` | 首版源码/构建接线、web 入口登记模型及首批验证闭环 | `frozen`，[业主]同意全部推荐 → `T-O-CF1115-11` 至 `-13` |
| Round 4 · executional | `Q8–Q10` | 注册之后的 JSON、MCP 与浏览器原生消费边界 | `frozen`，[业主]同意全部推荐 → `T-O-CF1115-14` 至 `-16` |
| Round 5 · executional | `Q11–Q13` | 可执行作者记录、非 HTTP host 适配、全插件分阶段交接 | `frozen`，[业主]同意全部推荐 → `T-O-CF1115-17` 至 `-19` |
| Round 6 · executional · 最终轮 | `Q14–Q16` | terminal支持目标、sandbox/业务wire目标、native真实支持边界与全账收口 | `frozen`，[业主]同意全部推荐 → `T-O-CF1115-20` 至 `-22`；最终轮已收口 |

**程序边界**：

1. 本版已冻结 Q1–Q16；第6轮完成最终总结、全册审计与收口，不再生成计划内后续轮。
2. Q1 与 Q2 提问时都由 baseline 驱动，同轮独立；[业主]现已确认两题均选 A，不能把它们的其他选项继续当并行路线。
3. 第二轮由已冻结的 `-7` / `-8` 驱动，现已完成全部 foundational 冻结；其未选路线不再是并行实施备选。
4. 每轮新问题须以已经冻结的真相为前提，不把同轮尚未批准的推荐互相作为既定答案；§7.1/§7.2 的收口评估保留为时点分析，最终结论以 §7.3 为准。
5. 评估报告 §9 的议题列表是分析索引，**不是已排定的问题队列**；不直接把它复制成后续轮次。

---

## 1. ★ Truth-Gate 台账（已锁定真值 · NORMATIVE · append-only across rounds）`[核心·锁死]`

### 1.1 Baseline 的决定来源

以下是[业主]在本次创建 QNA 指令中已经给出的决定，登记于本文件作为本 campaign 的回答真源；不是从 agent 推荐反推的批准：

| 来源锚点 | [业主]明确指令 |
|---|---|
| U-1 · 总目标与分析锚点 | “将整个插件的 contract 和 facade 统一成为一个固定真源，并逐步，分阶段完成所有插件的统一与测试”；“我们的分析锚定在 [docs/code-review/26-nov/contract-and-facade-1115-eval.md] 这份文档” |
| U-2 · 建册与 baseline | “严格使用 [.adocs/templates/qna-progressive.md] 模板”；“无需提供 second opinion 槽位”；“首先在 QNA 内冻结一批真相层作为后续问题提出的 baseline” |
| U-3 · 轮次结构 | “首先提出 2轮x2个问题, 共计 4个 foundational-qna”；“然后在后续轮次转入 executional-qna” |
| U-4 · 渐进纪律 | “严禁在上一轮 qna 尚未完成冻结之前, 对下一轮问题进行预设”；下一轮须基于上一轮中场总结，再展开新的事实调查与 Reasoning |
| U-5 · 每题信息与证据 | 每题须含解读、选项清单、推荐选项详细执行说明、支持证据或反例四组信息；提问前在本仓代码检索，提供精确 `file:line` |
| U-6 · 长期治理 | “能硬切就不要双写”，“能彻底退役就不要提供兼容”，“平台保持中立”，“不得耦合私域” |

根 `AGENTS.md:37-42` 是既有约束的原登记源，本文只引用，不另立同义法律。已有领域 QNA 的冻结决定也保留在各自原登记源；本 campaign 未作明确修订前，不以评估建议、当前实现或新测试要求覆盖它们。最高裁决权仍按 `AGENTS.md:12` 归[业主]。

### 1.2 已锁定真相（baseline + 逐轮追加）

| Truth-ID | 子类型 | 已锁定真相（一句话） | 来源（Round / Q） | 驱动了哪些后续题 | 下游约束 |
|---|---|---|---|---|---|
| `T-O-CF1115-1` | `foundational` | 本 campaign 的目标是将全部活跃插件的 contract 与 facade 统一为固定真源，并分阶段完成所有插件的统一与测试，不以某个共享 helper 或单包试点代替全体目标。 | Baseline / U-1 | Q1–Q3（baseline） | 约束最终 scope；本行不预先指定包的数量、名字或目录结构 |
| `T-O-CF1115-2` | `foundational` | 以 `contract-and-facade-1115-eval.md` 为分析与债务锚点；其代码事实、检查结果与治理建议必须区分，建议未经裁决不升级为合同。 | Baseline / U-1；`docs/code-review/26-nov/contract-and-facade-1115-eval.md:3-9`、`docs/code-review/26-nov/contract-and-facade-1115-eval.md:42-62` | Q1–Q3（baseline） | 事实有变化须补查并留痕；85 等时点统计不是永久真相或未来验收阈值 |
| `T-O-CF1115-3` | `foundational` | 本 campaign 按 U-6 的长期治理原则及根 AGENTS 的既有权威边界推进，不借统一引入双写、可彻底退役合同的兼容壳、私域耦合或插件私有通道。 | Baseline / U-6；`AGENTS.md:37-42` | Q1–Q4（baseline 硬切/中立原则） | 原则的原登记源不迁移；不擅自新增错误枚举、retry 义务、lane、凭证面或发布门禁 |
| `T-O-CF1115-4` | `foundational` | 提问结构固定为先两轮、每轮两题的 foundational-qna，共四题，再转 executional-qna；当前只生成第一轮两题。 | Baseline / U-3 | Q1–Q3（baseline 提问程序约束） | 不提前指定执行轮题数，不把执行细节塞入首轮 |
| `T-O-CF1115-5` | `foundational` | 下一轮问题必须等上一轮全数冻结、完成中场评估，再经新一轮事实调查与 Reasoning 生成，不预设题目或推荐。 | Baseline / U-4；`.adocs/templates/qna-progressive.md:13-15` | Q1–Q3（程序约束） | 下一轮每题标出其新增驱动真相；现有议题清单不构成问题排期 |
| `T-O-CF1115-6` | `foundational` | 本册严格按 progressive 模板推进，不设 second-opinion 槽位；每题含四组有效信息，并在提问前完成仓内代码调查及精确 `file:line` 取证。 | Baseline / U-2、U-5 | Q1–Q3（信息质量约束） | 各轮沿用 Truth-Gate、中场评估、驱动链；不因少一个角色而减少证据与反方分析 |
| `T-O-CF1115-7` | `foundational` | 采用 Q1 的 A：一个构建期共享的 contract/facade 归口包作为可执行真源，内部按协议/领域分层，规范决定和业务/host 权威不迁移，插件自包含交付且派生物不得成为第二作者源。 | Round 1 / Q1；[业主] 2026-11-15 明确“同意第1轮的全部推荐” | Q3–Q6、Q8–Q10、Q12（后续轮关联） | Q1 推荐完整含义与 §1.3 的 F7.1–F7.7 一并冻结；不是仅批准建目录 |
| `T-O-CF1115-8` | `foundational` | 采用 Q2 的 A：以合同族的生产者—消费者闭环为最小完成/销账单位，经真实接线、相关测试、成对切换及旧面退役才销账，阶段可含多闭环并最终逐包证明全覆盖。 | Round 1 / Q2；同一[业主]裁决 | Q3–Q5、Q7、Q13、Q16（后续轮关联） | Q2 推荐完整含义与 §1.3 的 F8.1–F8.8 一并冻结；不新增 release-gate、不静默缩 scope |
| `T-O-CF1115-9` | `foundational` | 采用 Q3 的 A：以领域公共能力/操作及生命周期语义为合同作者主轴，协议入口作为显式绑定与派生投影，由公共机制和领域/host 接线分别承接约束，不造 runtime 总线。 | Round 2 / Q3；[业主] 2026-11-15 明确“同意第2轮的全部推荐” | Q5–Q12（后续轮关联） | Q3 全部推荐及 §1.4 F9.1–F9.7 冻结；不据此批准具体操作 ID、字段、错误码或 retry 法则 |
| `T-O-CF1115-10` | `foundational` | 采用 Q4 的 A：按经批准且显式的支持面/版本约束判定多提供方同约，要求真实广告与兑现承诺、消费者不静默降级，不用能力子集掩盖未完成并继续先验收后硬切。 | Round 2 / Q4；同一[业主]裁决 | Q6、Q7、Q9–Q12、Q14（后续轮关联） | Q4 全部推荐及 §1.4 F10.1–F10.8 冻结；不批准具体支持集合、版本值、协商字段或兼容窗口 |
| `T-O-CF1115-11` | `execution` | 采用 Q5-A：以 packages/dsh-interface 的显式 contracts/host/build 出口统一作者与消费，单向复用唯一 guard，实现每包构建物化、字段归属迁移和离仓交付。 | Round 3 / Q5；[业主] 2026-11-15 明确“同意第3轮的全部推荐” | Q8–Q13（后续轮关联） | Q5 完整推荐及 §1.5 F11.1–F11.8 冻结，不新造运行时插件或复制既有机制 |
| `T-O-CF1115-12` | `execution` | 采用 Q6-A：显式 channel/match 绑定表与 mixed-batch createWebRegistrar，handler 只按 id 接线，统一预检、fail-closed 准入、生命周期及多维登记对账。 | Round 3 / Q6；同一[业主]裁决 | Q9、Q11、Q13（后续轮关联） | Q6 完整推荐及 §1.5 F12.1–F12.8 冻结，包含新接口无运行时元数据覆写的显式改约 |
| `T-O-CF1115-13` | `execution` | 采用 Q7-A：首批只闭环公共 web 注册/准入合同族与[DNN]/[DNT]真实绑定，按隔离验证、协议保真、离仓产物、成对硬切和限定债务范围销账。 | Round 3 / Q7；同一[业主]裁决 | Q8–Q10、Q13（后续轮关联） | Q7 完整推荐及 §1.5 F13.1–F13.8 冻结，不冒领两插件全部业务/MCP 或全仓已完成 |
| `T-O-CF1115-14` | `execution` | 采用 Q8-A：统一普通 JSON 的 JS Outcome、createJsonClient 及每操作唯一目标 codec，不新造全仓 wire 信封，不提供旧格式猜测兼容，不自动重放副作用。 | Round 4 / Q8；[业主] 2026-11-15 明确“同意第4轮的全部推荐” | Q11、Q13、Q15、Q16（后续轮关联） | Q8 完整推荐及 §1.6 F14.1–F14.8 冻结，五类 JS 失败不改变服务端业务错误枚举 |
| `T-O-CF1115-15` | `execution` | 采用 Q9-A：同一 MCP 工具定义、完整 handler map、真实输入/结果校验及原生结果解码共同约束广告、执行和消费，attach 严格兑现获准协议/URL且不降级 wss。 | Round 4 / Q9；同一[业主]裁决 | Q11–Q15（后续轮关联） | Q9 完整推荐及 §1.6 F15.1–F15.8 冻结，具体支持面冲突不由生成器自动裁定 |
| `T-O-CF1115-16` | `execution` | 采用 Q10-A：nanoNotepad 只公开最小导入服务，私有 controller 保持状态所有权，按 DB 就绪/卸载/过期句柄接线，成对退役 window global 及包内旧引用。 | Round 4 / Q10；同一[业主]裁决 | Q11–Q13（后续轮关联） | Q10 完整推荐及 §1.6 F16.1–F16.8 冻结，不把整个调试/数据对象升级为公共 API |
| `T-O-CF1115-17` | `execution` | 采用 Q11-A：最小 ESM FamilyDefinition 唯一关联操作、协议绑定、提供面和批准来源，各 facade 消费同源投影，不造通用IDL/运行时注册中心或自动裁定业务冲突。 | Round 5 / Q11；[业主]本次明确“同意第5轮的全部推荐” | Q14、Q15（后续轮关联） | Q11完整推荐、记录形状和§1.7 F17.1–F17.8共同冻结；版本/权限/目标值不由生成器猜测 |
| `T-O-CF1115-18` | `execution` | 采用 Q12-A：领域内薄adapter直接承接官方host契约与精确获准例外，业务实例归插件scope，明确桥身份、配置失效和异步结算，不复制影子host或以no-op假称支持。 | Round 5 / Q12；同一[业主]裁决 | Q16（后续轮关联） | Q12完整推荐及§1.7 F18.1–F18.8共同冻结；具体native义务不足仍须目标裁决 |
| `T-O-CF1115-19` | `execution` | 采用 Q13-A：继承P0首批并锁定P1–P4依赖阶段和八包责任，逐合同族成对硬切、验证、退役销账；阶段不成为全仓发布总闸。 | Round 5 / Q13；同一[业主]裁决 | Q14–Q16及§7.3（后续轮关联） | Q13完整阶段/覆盖表及§1.7 F19.1–F19.8共同冻结，不授权自动延期或假定阶段内所有业务值已批准 |
| `T-O-CF1115-20` | `execution` | 采用 Q14-A：DNLS八工具与DNT本地十九工具是两个显式语义提供面，共享可共享的字段/操作定义、create等语义不同处分别标识；固定最小McpLane调用、准确v1/v2 attach及不自动重发写入。 | Round 6 / Q14；[业主] 2026-11-15 明确“同意你在本轮全部推荐” | 无后续题（最终轮）；§7.3/P2交接 | Q14完整推荐、两提供面矩阵及§1.8 F20.1–F20.8共同冻结；不把DNLS领域幂等外推为DNT单终端 |
| `T-O-CF1115-21` | `execution` | 采用 Q15-A：host兑现二十个sandbox工具明确输入/业务结果，bridge只做获准CDP驱动；选定probe与manifest.get唯一业务名，其余公开JSON按Q8 codec逐项承接。 | Round 6 / Q15；同一[业主]裁决 | 无后续题（最终轮）；§7.3/P1–P3交接 | Q15二十工具表、结果/诊断边界及§1.8 F21.1–F21.8共同冻结；不把当前stub或代码缺陷认证为业务目标 |
| `T-O-CF1115-22` | `execution` | 采用 Q16-A：native只在正式host公开能力满足完整义务时发布，否则显式NATIVE_UNAVAILABLE；精确保留DNMS01 R-16例外并退役影子Service，按§7.3完成全账交接。 | Round 6 / Q16；同一[业主]裁决 | 无后续题（最终轮）；§7.3/P3交接 | Q16支持边界修订、生命周期/错误目标及§1.8 F22.1–F22.8共同冻结；收窄不等于原完整能力已偿还 |

**Round 3 驱动关联（调查后 append）**：`-7` / `-9` 驱动 Q5 的源码、导出和派生接线；`-7` / `-9` / `-10` 驱动 Q6 的真实 HTTP/upgrade 绑定与统一准入；`-8` / `-9` / `-10` 驱动 Q7 的首批范围和分层验证。此处只追加引用关系，不改变上述真相正文，也不预填执行层真相行。

**创建时的冻结边界（v0.1 历史状态；现行状态见下方 R-1）**：

- 上表六行是[业主]已明确给定的 baseline，不是 Q1/Q2 的替代答案。
- **“一个固定真源”不在 baseline 中被擅自解释为“一份巨型 JSON”“一个必装运行时插件”或“一个已经批准的新 package”**；其架构含义由 Q1 裁决。
- 评估报告中的既有事实可作为问题证据；它的建议顺序、包名、统一错误信封和具体工具改约均未在本册冻结。
- 本轮 Q1/Q2 目前没有冻结后的 Truth-ID 行；答复后只追加裁决，不能先把推荐写进台账再请[业主]确认。
- 既有领域裁决采取**引用承接**：例如 `docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md:158-166` 已明确“先验收后硬切”与“无兼容第四阶段”；本册不重开该题，也不复制成第二份领域决定真源。

**R-1 · Round 1 冻结更新（2026-11-15，append-only）**：[业主]明确同意第1轮全部推荐。Q1/Q2 均选 A，分别冻结为 `T-O-CF1115-7` / `-8`；上方 v0.1 中“尚未批准归口包”“Q1/Q2 尚无冻结行”的语句只记录创建时点，不再描述现状。原题面、选项和 Reasoning 按提问时原文保留；现行决定引用本表、§1.3 细节及对应“业主回答”。冻结设计方向不等于授权本轮开始改代码。

**R-2 · 渐进时点注记（2026-11-15）**：baseline `-4` 中“当前只生成第一轮两题”是创建时点约束，不是禁止依程序开启第二轮。完成 R-1、§3 总结及 §4.0 新调查后，本版追加 Q3/Q4；它们只有推荐，没有答复或新真相行，`-7` / `-8` 的决定内容未改写。

**R-3 · Round 2 冻结更新（2026-11-15，append-only）**：[业主]明确同意第2轮全部推荐。Q3/Q4 均选 A，分别追加冻结 `T-O-CF1115-9` / `-10` 及 §1.4 全部细节；R-2 的“只有推荐”保留为上一版时点记录，不再描述现状。原题面和 Reasoning 不改写，当前决定以真相台账、细节与各题业主回答为准。[业主]同时指定下一轮为三道 executional 题，仍须先总结、新调查，未授权本轮实施迁移。

**R-4 · Round 3 冻结更新（2026-11-15，append-only）**：[业主]明确同意第3轮全部推荐，Q5–Q7 均选 A，追加冻结 `-11` 至 `-13` 与 §1.5 二十四条细节。原题面保留，现行决定由台账、细节和业主回答共同追溯；“若选 A”等条件句已兑现。下一步先总结和新调查，再提出第四轮三道 executional 题；另评估第5轮能否收口，但不提前预设其问题或伪造已完成冻结。

**R-5 · Round 4 冻结更新（2026-11-15，append-only）**：[业主]明确同意第4轮全部推荐，Q8–Q10 均选 A，追加冻结 `-14` 至 `-16` 及 §1.6 二十四条细节。原题面、独立性说明和 Reasoning 保留提问时原文；条件句由业主回答兑现，不再是待选。先完成本轮总结与新调查，再提出第5轮三题并复核收口条件；未授权本轮改代码或用未知公共值补齐目标。

**R-6 · Round 5 冻结更新（2026-11-15，append-only）**：[业主]明确同意第5轮全部推荐，Q11–Q13均选A，追加冻结 `-17` 至 `-19` 和§1.7二十四条细节；原题记录形状、阶段/覆盖表、适用边界及验收设计一并承接，不因摘要删减。[业主]另指定第6轮三道executional题并在该轮收口；这是末轮范围要求，不是对尚未提出题目的预先答复。先完成§6.5总结与新调查，再形成可直接裁决的末轮目标；未实施迁移。

**Round 6 驱动关联（冻结、总结和新调查后追加）**：`-17` 的显式operation/binding/provider记录驱动Q14的同名工具语义拆分和Q15的业务schema目标；`-18` 的官方host义务驱动Q16的真实native支持边界；`-19` 的全八包实施责任驱动三题的硬切、验证及§7.3结账。三题相互独立，不把同轮另一推荐当作已冻事实；[业主]已按原推荐全部选A，原独立性约束保留为提问时纪律，不再是待选状态。

**R-8 · Round 6 冻结更新（2026-11-15，append-only）**：[业主]明确同意第6轮全部推荐，Q14–Q16均选A，追加冻结 `-20` 至 `-22` 及§1.8二十四条细节；Q14两提供面矩阵、Q15二十工具表、Q16义务/错误码表与各题全部推荐正文一并承接，不因摘要删减。§6.6.0的R-7是冻结前事实用语纠正，不是冻结记录；本轮冻结记录以本R-8为准。第6轮已完成最终总结、§7.4审计与§7.3收口，未实施迁移，未把代码/测试未完成写成真相未决。

### 1.3 Round 1 冻结细节（NORMATIVE，属于上表两条真相）

以下条款是 Q1/Q2 **已经推荐且现已获[业主]同意的含义归档**，不是趁冻结新增合同。本节与各原题“推荐选项的详细执行说明与分析”对应；不另起 Truth-ID 或回答真源。

**`T-O-CF1115-7` / Q1-A：**

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F7.1 | 公共边界的结构、稳定语义与 facade 机制统一归口；业务实现仍留领域，公共包不持业务 canonical、凭证或可变跨插件 store | 文件/Git、PTY、容器 backend、压缩算法、草稿和 carrier 业务不被搬进公共状态中心 |
| F7.2 | 共同语义以协议原生适配输出，保留 MCP 的协议错误/工具失败区分、WS/SSE 的流语义与 native 扩展边界 | 不强制一种 wire envelope，不为 native Provider/service 新造 HTTP 或私有总线 |
| F7.3 | 复用已有共享机制；同一机制只保留一份可修改实现，不另造注册/授权链，也不要求所有共享包物理合并 | route-guard 可单向复用或迁入，具体装配待执行决定；不能继续私改消费者副本 |
| F7.4 | 构建期共享、每包按自身合同携带所需产物；不必装公共运行时插件，不运行时读取仓根/邻居私有 lib | 只读代码/schema 派生物允许多份；统一源码不假设同一个内存模块实例 |
| F7.5 | 生成关系单向且可追溯；工具目录、绑定、baked table、文档视图从明确作者源派生，已有同义作者源须明确保留或退役 | 不许以消费者修改倒灌公共合同；规范决定继续引用相应[业主]登记源 |
| F7.6 | 公共错误跨产物以稳定结构识别，不能仅依赖跨 bundle 的 instanceof | 本条没有新增字段、错误枚举、兼容版本或接口签名 |
| F7.7 | 包内保持领域/协议模块边界和按需构建；目标是唯一有效 facade，不是退役合同的兼容壳 | 不把全部业务绑定成巨型公共包，不恢复旧别名、双写或兼容第四阶段；包名/目录未在本题锁定 |

**`T-O-CF1115-8` / Q2-A：**

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

### 1.4 Round 2 冻结细节（NORMATIVE，属于新增两条真相）

以下逐条归档 Q3/Q4 已推荐并获[业主]批准的完整含义，不借冻结新增字段或义务。

**`T-O-CF1115-9` / Q3-A：**

| 条款 | 已冻结细节 | 对执行层的约束 |
|---|---|---|
| F9.1 | 按真实承诺区分操作，各有输入输出、副作用与失败边界，不按传输行数合并合同 | 同一路径内 list/save、get/generate 等差异不能被一条路由登记遮蔽 |
| F9.2 | 同一语义只有一份作者定义，适用的 HTTP/MCP/native 等是其显式绑定 | 无需要不生成额外协议；内部语义标识不自动成为新公共 wire 名称 |
| F9.3 | 公共 reader/validator/codec 承接通用结构约束，领域/host 接线承接动态政策、唯一 writer 与状态机，并明确验证责任 | 不承诺由一个 schema 自动生成全部授权或业务算法 |
| F9.4 | 主体/scope、能力、安全声明和状态所有者有获准来源及执行映射，host 权威不迁移 | 不从 HTTP 动词猜权限，不新增角色/token，不替换 pluginManager 等 sanctioned writer |
| F9.5 | native Provider/service、流协议和资源分别表达接入/生命周期、交互及交付合同 | 不为统一硬造 request/response RPC |
| F9.6 | 现有台账、schema 与文档逐项确定作者归属，同义字段迁入或退役、单向派生 | 不保留两处手改；代码不能自动批准安全等级或错误法则 |
| F9.7 | 只承载已批准承诺，未裁决/未接线保持未完成 | 不用全支持、空 schema、默认可重试补空，不把每个局部 helper 注册为公共能力；未批准具体 ID、字段、错误码、retry 或旧名去留 |

**`T-O-CF1115-10` / Q4-A：**

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

---

### 1.5 Round 3 冻结细节（NORMATIVE，属于新增三条真相）

本节逐条归档 Q5–Q7 已获批准的完整推荐；原题中的表格、接口示意与适用边界仍是对应真相的组成部分，不能只引用一句摘要而忽略细节。

**`T-O-CF1115-11` / Q5-A：**

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

**`T-O-CF1115-12` / Q6-A：**

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

**`T-O-CF1115-13` / Q7-A：**

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

### 1.6 Round 4 冻结细节（NORMATIVE，属于新增三条真相）

以下逐条归档 Q8–Q10 全部推荐含义；原题的接口、判别矩阵、验证清单和适用边界一并组成对应真相，不因摘要表简写而删减，不重复登记领域已有决定。

**`T-O-CF1115-14` / Q8-A：**

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

**`T-O-CF1115-15` / Q9-A：**

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

**`T-O-CF1115-16` / Q10-A：**

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

### 1.7 Round 5 冻结细节（NORMATIVE，属于新增三条真相）

Q11–Q13原题全部推荐为以下条款的完整定义，含记录形状、引用规则、两张阶段/覆盖表与验证条件；本表只做可检索归档，不另造业务决定。

**`T-O-CF1115-17` / Q11-A：**

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

**`T-O-CF1115-18` / Q12-A：**

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

**`T-O-CF1115-19` / Q13-A：**

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

### 1.8 Round 6 冻结细节（NORMATIVE，属于新增三条真相）

Q14–Q16原题中推荐选项A的执行说明正文（含Q14两提供面矩阵、Q15二十工具输入/业务表、Q16八项义务表与四错误码表）是本三条真相的规范组成部分；下列条款为可检索索引，不另造、不删减。索引与原题正文如有表述差异，属于编辑错误，按append-only修正索引，不形成第二套业务目标。

**`T-O-CF1115-20` / Q14-A：**

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

**`T-O-CF1115-21` / Q15-A：**

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

**`T-O-CF1115-22` / Q16-A：**

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

## 2. Round 1 —— foundational：真源归口与收敛完成单位（`Q1–Q2`）· 已冻结

> **本轮状态**：`frozen`。[业主]于 2026-11-15 同意本轮全部推荐，Q1/Q2 均选 A，完整含义冻结于 `T-O-CF1115-7` / `-8` 及 §1.3。以下题面保留提问时原文；其中“若选 A”“本题若冻结”等条件句现在由各题业主回答兑现，不是仍待选择。

### 2.0 本轮提问前的代码检索清单

以下均在本轮重新阅读对应仓内代码；没有依靠旧报告转述代替核查，也没有重新运行旧扫描来改写已经固定的统计。

| # | 仓内证据 | 本轮直接确认的事实 | 用于 |
|---|---|---|---|
| E1 | `packages/dsh-host-route-guard/package.json:2-9` | 公共 guard 已是构建期共享库，明确不是插件、由各插件 bundle 进产物，运行时不按该包名解析 | Q1 的交付拓扑 |
| E2 | `packages/dsh-host-route-guard/src/route-guard.js:235-245`；`dsh-nano-terminal/lib/route-guard.js:235-245` | 公共版固定 `kind: ROUTE_KIND`，[DNT]副本改成 `spec.kind ?? ROUTE_KIND` | Q1 的作者来源；Q2 的退役/再生成 |
| E3 | `dsh-nano-notepad/index.js:343-357` | SDK prefix 另行注册并手动调用 connection fence；有准入，不是“未鉴权”，但不在公共 exact 注册链内 | Q1 的协议/注册模型；Q2 的完整消费链 |
| E4 | `dsh-nano-model-selector/scripts/build-client.mjs:9-36`、`dsh-nano-model-selector/scripts/build-client.mjs:81-88` | 从仓根 ledger 烤入本包表，再 bundle guard；运行时不需要读仓根 | Q1 的只读派生与独立交付 |
| E5 | `dsh-nano-terminal/scripts/build-client.mjs:20-29`、`dsh-nano-terminal/scripts/build-client.mjs:35-57` | 当前 build 枚举若干 host 模块并构建 client，没有在这条链重建 guard/route table | Q2：“有 build”不能替代来源一致证据 |
| E6 | `dsh-nano-terminal/src/host/mcp.js:18-28`；`dsh-nano-terminal/schema/dnt-mcp.openrpc.json:20-25`；`dsh-nano-terminal/src/host/mcp.js:52-56` | TOOLS 从 OpenRPC 生成，但 create 声明 local/mcp/isolate，host 分支只接受 local | Q2：schema 派生不等于行为一致 |
| E7 | `dsh-nano-local-sandbox/src/host/mcp-sandbox.js:2-38`；`dsh-nano-local-sandbox/src/host/routes.js:514-529` | host 列表声明 20 名，inputSchema 均声明无属性的 object 且禁止额外属性；call 不传 arguments，已知名字统一返回诊断摘要 | Q2：登记不等于实际业务接线 |
| E8 | `scripts/check-feature-contract.mjs:22-54`；`packages/dsh-host-route-guard/src/route-guard.js:16-22` | 现有检查比较路径/method/bodyLimit 和指定快照存在性；guard 不消费 body、不执行 sessionBinding 对象约束 | Q2：验证范围必须明确 |
| E9 | `dsh-nano-model-selector-compaction/index.js:1-9`；`dsh-nano-terminal/src/client/index.js:220-238` | 真实边界包括 native Provider 与 Cordis 服务，不止 HTTP | Q1/Q2 的全插件覆盖 |
| E10 | `dsh-nano-cloud-session/src/host/devin-api.js:20-39`；`dsh-nano-notepad/src/host/fx-bridge.js:207-212` | carrier 有 forbidden-or-invisible 分类；推理流有 OpenAI 风格结束帧 | Q1：统一不能抹去领域/标准语义 |
| E11 | `dsh-nano-model-selector-compaction/lib/host-compaction.js:27-39` | 当前有按可用性升级上游 Error 类的路径，vendored 与上游 class identity 不必相同 | Q1：一个包不自动等于一个 runtime module instance |
| E12 | `dsh-nano-explorer-extra/src/client/index.js:87-91`；`dsh-nano-terminal/src/client/index.js:226-238` | [DNEE]消费 nanoTerminal 服务，[DNT]提供该服务；缺席时调用方走原生回退 | Q2：跨包边界与合法缺席行为 |

以上事实分别承接评估报告的 `E1115-DNT-01/02`、`E1115-DNN-01`、`E1115-DNLS-01`、`E1115-CROSS-02/04` 等观察项。**事实成立不代表某个推荐已被[业主]选定。**

### Q1 — 固定真源采用“一个构建期归口包”，还是“多个领域权威包 + 统一索引”？

- **题型**：`foundational`。
- **驱动真相**：`T-O-CF1115-1`、`-2`、`-3`；提问程序受 `-4` 至 `-6` 约束。
- **来源**：评估报告 §7–§8，尤其 `docs/code-review/26-nov/contract-and-facade-1115-eval.md:495-562`；本轮证据 E1–E4、E9–E11。
- **影响范围**：所有活跃插件的公共合同声明、facade 机制、生成物来源、构建依赖及独立交付。
- **为什么必须确认**：只说“单一真源”，仍可能实现成一个聚合清单、多个分散作者包，或一个接管业务的公共运行时。三者对依赖方向、发布和状态归属的含义不同，不先锁定就无法判断后续改动是在收敛还是增加另一份权威。
- **当前建议 / 倾向**（CF1115 架构 agent）：**A：一个构建期共享的 contract/facade 归口包，内部按协议与领域分层，插件自包含交付。**
- **Reasoning**：应把共同作者来源与共同消费机制一起收口，而不是仅集中展示。归口不等于把所有协议揉成一个 wire format，也不等于把业务、凭证和 host 权威迁进公共包。

**【对本问题的解读】**

本题只有一个基础决策：**公共 contract 与 facade 的权威归口拓扑**。为避免“一个”出现歧义，需要区分三层：

1. **规范决定来源**：公共合同为什么这样规定，由相应[业主]决定/QNA 负责；本 campaign 的新决定只在本册登记，已有决定仍引用原源。
2. **可执行作者来源**：经批准的合同怎样成为 schema、codec、facade 和校验机制；这是本题要选择的归口形式。每个合同只能有一个可修改的作者定义，不能让 server/client 各写一份“理解”。
3. **交付物**：各插件内打包的只读代码/schema 是同源派生物，不是另一个可修改作者源；它也不是业务状态的第二份 canonical。

治理范围包括插件内 client↔host、跨插件公开服务、native Provider、模型工具、浏览器全局及流协议等真实边界；不把普通局部 UI 函数也发明成公共 API。外部标准和官方 host 服务的权威仍在其原处，本仓只统一自己承诺的绑定与适配，不复制一套上游法律。

**【可选选项清单】**

| 选项 | 归口形式 | 优点 | 代价与边界 |
|---|---|---|---|
| **A · 推荐** | **一个构建期共享的 contract/facade 归口包**；包内按领域/协议分模块，以统一规则形成声明与适配出口，各插件 bundle 所需部分 | 公共边界的作者位置、变更入口和生成责任容易找到；符合当前自包含交付先例 | 需要明确模块依赖与变更影响，避免大包把所有领域绑定发布；单包本身不会自动阻止手改产物 |
| B | 多个领域权威包分别拥有 contract/facade，再由统一索引指向各源；每个具体合同仍只有一位作者 | 领域可独立发布，适合已有清晰且稳定的独立治理边界 | 需要维护跨包依赖、版本组合与索引；同名 term/sandbox 合同应放哪一域必须额外协调 |

两项都必须满足 baseline，B 不等于允许同一合同多份手写。若[业主]另提满足 baseline 的形式，可直接说明。**仅增加总清单但继续各写 facade**，或增加必装运行时网关来接管凭证/状态，不作为满足现有目标与边界的默认替代方案。

**【推荐选项的详细执行说明与分析】**

若选 A，建议把以下含义一并锁定为该拓扑的解释；这里不创建包、不预定文件布局：

1. **统一作者归口，而不是统一所有业务实现。** 公共边界的结构、稳定语义与 facade 机制进入同一归口；handler 背后的文件/Git、PTY、容器 backend、压缩算法、草稿和 carrier 业务实现仍留各领域。公共包不持业务 canonical、凭证或可变跨插件 store。
2. **共同语义通过协议原生适配输出。** 自有 JSON 可共享调用/校验/失败机制；MCP 保留 JSON-RPC 与工具失败区分；WS/SSE 保留帧、结束、恢复等原生语义；native Provider/service 不为统一而被改造成 HTTP 或专有总线。
3. **复用已有机制，禁止多造注册链。** 已有 route-guard 等可被统一归口单向复用或在实施时迁入；同一个机制不同时保留两份可修改实现。A 不要求把 HTML/UI/性能/S3 六个共享包全部物理合并，也不因新包存在就允许另起一条授权/路由链。
4. **构建期依赖、运行时自包含。** 插件按自己的发布合同携带所需产物，不要求安装一个“公共运行时插件”，也不在运行时读仓根或邻居私有 `lib/`。源码统一不强迫所有插件共用同一个内存实例。
5. **生成关系必须单向且可追溯。** 工具目录、client/server 绑定、baked table 和文档视图从其明确作者源派生；不能在消费者里私改后反过来当事实。已有 OpenRPC 等源在迁移时须明确保留或退役，不能再留一份可手改的同义权威。
6. **跨产物用稳定结构识别，不靠类身份碰巧一致。** 统一 Error 类可以是实现手段，但不能仅用跨 bundle `instanceof` 定义公共错误。具体字段、枚举、兼容版本和接口签名本题均不冻结。
7. **承认成本。** A 仍需要领域模块边界与按需构建；如果把全部业务都移进归口包，反而会损害插件独立性。推荐的收益来自减少重复作者源与适配特例，不是追求包数量最少。

这形成的是**唯一目标 facade**，不是给退役路径保留的“兼容 façade”。没有授权恢复旧别名、双写或第四阶段兼容层。

**【推荐选项的支持证据 / 其他选项的反例】**

- **A 有现成交付先例，而不是假设宿主会提供新服务**：E1 的包说明与 E4 的 bake/bundle 代码证明，公共源码可以进入独立插件产物；不需要新增运行时服务才能共享。
- **只集中源码、不约束派生责任仍会失败**：E2 的 guard 差异与 E3 的 prefix 旁路，分别展示消费者改副本和绕过公共模型的两条演进路径；因此推荐的是“归口 + 消费规则”，不是单独建目录。
- **一套 wire envelope 不足以覆盖全体合同**：E9 的 native Provider/service、E10 的 carrier 分类与 SSE 结束帧，是标准/领域差异，不应被单个普通 JSON wrapper 擦掉。
- **一个包不保证一个类型实例**：E11 是已存在的跨模块 class identity 适配代码；不能把包集中作为跨产物 `instanceof` 永远成立的证据。
- **B 并非技术上错误**：若领域发布已经需要强隔离，多包可以长期治理；但当前已出现同名 terminal/sandbox 合同的跨包维护，先增加多个公共权威包会增加归属与版本协调。这里是成本判断，不伪称已实测多包方案失败。

- **问题（请[业主]裁决）**：**是否选择 A，将一个构建期共享的 contract/facade 归口包作为本 campaign 的可执行真源，采用上述“规范决定不复制、协议/领域内部分层、业务与 host 权威不迁移、插件自包含交付、派生物不可成为第二作者源”的含义；还是选择 B 的多领域权威包统一索引？**
- **业主回答**：**已确认：选 A，同意本题全部推荐及其详细执行含义 → 冻结为 `T-O-CF1115-7`。** 来源：[业主] 2026-11-15“同意你在第1轮的全部推荐”；细节归档见 §1.3 F7.1–F7.7。

### Q2 — 分阶段统一以什么作为“完成并可销账”的基本单位？

- **题型**：`foundational`。
- **驱动真相**：`T-O-CF1115-1`、`-2`、`-3`；提问程序受 `-4` 至 `-6` 约束。**不依赖 Q1 选 A 或 B。**
- **来源**：评估报告 §3.2、§4.6–§4.7、§8.5–§8.6；本轮证据 E2、E5–E8、E12，以及已冻结切割时序。
- **影响范围**：所有插件的阶段完成定义、债务销账、跨包协作、测试证据与旧实现退役。
- **为什么必须确认**：“目录已统一”“某包已换 helper”“build 通过”和“生产者—消费者真实同约”不是同一完成状态。若没有基本单位，后续计划可能每阶段都显示完成，但终局仍残留本地副本、空接线或不一致消费。
- **当前建议 / 倾向**（CF1115 架构 agent）：**A：以合同族的生产者—消费者闭环为最小销账单位，阶段可以批量交付多个闭环，最终逐包核对全覆盖。**
- **Reasoning**：迁移应沿真实边界验证，避免“代码集中但执行不一致”。这不是要求每个内部函数单独走一套流程，也不是规定首批插件或阶段顺序。

**【对本问题的解读】**

本题决定的是**完成语义与验证责任**，不是本轮直接批准一份迁移计划。

- **合同族**：由同一公共能力和调用边界约束、应共同演进的一组操作/消息。例如某个 terminal 能力的工具声明、实际分发和 attach 消费相关联；不是按 raw fetch 或 HTTP 行数机械分组。
- **闭环**：声明能约束提供者，消费者按同一语义消费，相关成功/拒绝/失败路径有证据，旧权威与旧消费已退出。提供者和消费者可以在同一插件，也可以跨包；native/脚本调用同样适用。
- **阶段**：组织交付的批次，可以含多个合同族和多个插件。闭环是销账单位，**并不替代全插件统一目标**。
- 若边界另一侧是官方 host 或第三方 API，只能治理和验证本仓拥有的绑定/适配，不要求改造外部标准或接管上游权威。

**【可选选项清单】**

| 选项 | 作为阶段完成/销账的主要单位 | 优点 | 代价与风险 |
|---|---|---|---|
| **A · 推荐** | **合同族闭环**：作者源、提供实现、真实消费者、相关验证、旧面退役一起对账；再映射回插件覆盖 | 能在分批期间得到真正已统一的边界，较早发现跨包不一致 | 需要识别受影响调用链，某一批会跨插件；不能只按目录分派 |
| B | 插件为单位：一个包内的 contract/facade 全部迁完并测试后，推进下一个包 | 包内责任和交付范围直观 | 公共边界可能横跨多个批次；若不另做交叉验收，“包内完成”仍不等于合同完成 |
| C | 技术层为单位：先全仓声明，再全仓 facade，再全仓消费者/测试，最后统一闭环 | 共同基础可以先成形，适合有集中协同窗口的工程 | 真正业务闭环较晚出现，层间未兑现部分积累；不能把前几层的完成直接当债务销账 |

B/C 并非禁止的施工组织方式；它们也不能豁免已冻结的硬切与全插件测试目标。差别在于**允许把什么标为“已完成”**，而不在于开发任务能否按包或按层并行。

**【推荐选项的详细执行说明与分析】**

若选 A，建议按下列含义定义销账，但不在本轮列测试用例或排序迁移批次：

1. **先有目标合同，再认定实现符合。** 使用已冻结决定定义该能力的支持面和语义；代码、schema、测试三者互相对账，不能用“当前实现就是这样”补写合同，也不能用“新测试要求如此”越过[业主]决定。
2. **登记与实际执行分别给证据。** 共同定义存在、目录可列出，只证明声明层；还需证明真实入口使用对应约束并连接到承诺的业务能力。对已有承诺不能自行删名、改称 unsupported 或用诊断摘要顶替执行来销账。
3. **消费者与提供者共同迁移。** 调用方从同一合同消费结构/语义，包含其原有可选能力缺席行为；同族流协议还需验证协商、结束或恢复等实际承诺。不是只替换 server helper 后把旧 client 留给另一轮无限期兼容。
4. **测试证据按边界分层，不虚增门禁。** 区分登记/生成一致、schema 与分发、消费者互操作，以及必要的端到端行为。复用现有测试入口和同族夹具，采用与改动相关的增量验证，不要求每个私有函数都端到端，也不每改一处重跑全仓环境。
5. **先验证目标，再成对硬切并退役。** 可以离线构建新实现、对照既有行为或使用夹具，不等于生产并存双写。已冻结的“先跑通、对等验收、一次性切换、无兼容第四段”继续适用；不先删后补，不留下两条可恢复写源。
6. **来源、消费和登记一起结算。** 退役的作者定义、消费者副本、旧别名/路径及相应工具/台账/说明须同步处理；同源只读构建产物可以保留，但不能继续手改成为第二源。
7. **按插件汇总全覆盖。** 每批完成后明确该闭环涉及哪些插件、哪些边界仍未迁移；直到全部活跃包的适用 contract/facade 都有去向和证据，才满足全仓统一目标。[DNMSC]等无 HTTP 包必须按 native 边界计入，不能用零路由宣告完成。
8. **不把未完成静默变成已接受风险。** 合同仍未接通、外部环境未能验证、尚未裁决或需要延期，都如实保留未完成状态；改变支持面或 defer 需[业主]明确决定，不能由 agent 借分阶段安排自行缩 scope。

本题若冻结，只确定上述完成定义；不新增 release-gate、错误码、幂等键、重试次数或兼容窗口，也不批准当前发现的债务逐项修复方案。

**【推荐选项的支持证据 / 其他选项的反例】**

- **反例一：目录“完成”，业务未接。** E7 的 20 名声明会让 tools/list 看起来完整，但 tools/call 对已知名统一返回摘要。若只按 registry 条目验收，会把同一缺口保留下来。
- **反例二：生成“完成”，支持面仍漂移。** E6 的 TOOLS 确实来自 OpenRPC，但 create 的 lane 枚举仍大于本 host 支持面；因此“用了生成器”不是足够的完成证据。本轮不据此先决定应删枚举还是补能力。
- **反例三：登记检查“完成”，没有证明 body/schema 被执行。** E8 的检查没有验证响应、工具参数或实际业务分发；guard 注释明确 bodyLimit 由 handler 消费。不能让台账 PASS 承担它没有检查的事实。
- **反例四：构建“完成”，私改副本仍在。** E2 与 E5 表明，普通 build 可以继续产出其他模块，而不是重新生成 guard。单纯跑 build 不能证明共享来源已统一。
- **支持跨包闭环的现实边界**：E12 的 nanoTerminal 服务有实际提供方、消费方和缺席回退；按单包分别验收容易遗漏双方协同，也不应把合法原生回退误删成“旧协议兼容”。
- **硬切时序已有裁决，不能借本题重开**：`docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md:158-165` 已由[业主]确认先验收后切割，且不设兼容第四段。A 将它用作适用边界的实施护栏，不是要求重复确认。
- **B/C 的诚实适用面**：它们可以用于组织研发、先建基础设施；不足在于不宜单独作为债务销账依据。A 的成本是跨包梳理和证据归属，需要避免给每个小 helper 单独造仪式。

- **问题（请[业主]裁决）**：**是否选择 A，以“合同族的生产者—消费者闭环”作为最小完成/销账单位，允许按包或按技术层组织施工，但只有在真实接线、相关测试、成对切换及旧面退役完成后才销账，并最终汇总证明全部活跃插件覆盖；还是选择 B 或 C 作为主要完成单位？**
- **业主回答**：**已确认：选 A，同意本题全部推荐及其详细执行含义 → 冻结为 `T-O-CF1115-8`。** 来源：同一[业主]裁决；细节归档见 §1.3 F8.1–F8.8。

---

## 3. ★ 中场评估 I（Round 1 → Round 2）`[核心·锁死]`

> **Round 1 总结已完成。** 本节先完成 3.1–3.3 的实际裁决评价，再开始新调查；3.4 记录调查完成后才形成的问题驱动链，不从旧评估议题清单机械预排。

- **3.1 对 Round 1 的判定**：两题都有明确裁决且相互一致，无需追问本轮选项。[业主]锁定的不是“建一个目录”，而是共同可执行作者归口、独立交付和协议/领域分层；锁定的也不是“某包 build 绿就算完”，而是合同族生产者—消费者闭环。
- **3.2 本轮已锁定真相**：新增 `T-O-CF1115-7`、`-8`，连同 baseline 共八条；F7.1–F7.7、F8.1–F8.8 将原推荐细节归档。规范决定、可执行作者源、业务 canonical 三者区分；QNA 只批准设计与完成定义，不宣称任何代码债务已偿还。
- **3.3 诚实反方制衡**：一个公共归口包仍可能成为巨型业务包，或只集中声明而把执行留在各包分叉；合同族闭环也可能被过度拆分成仪式或遗漏 native/外部适配。冻结方向减少选择，不会自动消除这些风险。必须守住模块/权威边界、相关增量验证和全插件覆盖，不能增加未经批准的门禁。
- **3.4 为什么提出 Round 2（新调查后追加）**：本轮冻结回答了“归口在哪里”和“何时算完成”，尚未规定归口包的合同作者模型，也未规定不同提供方何时可被认定为同约。随后 §4.0 的新调查确认：一个 HTTP 路径内有不同读写操作，native/资源入口不能按路由数归并；同名 terminal.read 的参数域不同，提供面、协议握手、帧版本和实际消费者行为也不是同一个层次。因此，Q3 由 `-7` 的单一作者源与 `-8` 的可验证闭环驱动，裁决合同以什么为主轴组织；Q4 由 `-7` 的协议/领域分层与 `-8` 的真实同约驱动，裁决多提供方的支持面与差异如何受约束。两题都是基础判定，不规定具体 schema 字段、版本值或迁移批次。

---

## 4. Round 2 —— foundational：合同作者模型与多提供方同约（`Q3–Q4`）· 已冻结

> **本轮状态**：`frozen`。[业主]于 2026-11-15 同意本轮全部推荐，Q3/Q4 均选 A，冻结为 `T-O-CF1115-9` / `-10`，细节见 §1.4。原题的条件句、未选选项与 Reasoning 保留提问时原文，不表示仍待选择。
>
> 四道 foundational-qna 至此全部冻结；先完成 §5 中场总结和新调查，再提出下一轮三道 executional 问题。

### 4.0 本轮提问前的新代码检索与拓扑分析

本轮不是重复计算评估报告的路由/工具总量，而是沿下列调用链补查作者源、分发与消费关系。所有认识均为静态确认，未启动服务或执行真实业务。

| # | 本轮新检索证据 | 实际拓扑与观察 | 驱动 |
|---|---|---|---|
| E13 | `dsh-nano-cloud-session/index.js:108-137`、`dsh-nano-cloud-session/index.js:288-318` | `SPECS → work → configAction/sessionOps`：同一个 config POST 路径内有 list，也有 save/remove/activate/ssh-key 等不同承诺，不能用一个路径或 POST 动词说明全部副作用 | Q3 |
| E14 | `dsh-nano-cloud-session/index.js:240-250`、`dsh-nano-cloud-session/src/host/devin-api.js:117-125` | `sessionOps → carrier adapter`：get/messages 与 generate_insights 分支落到不同上游操作；本地同一路由是绑定，不是完整业务语义 | Q3 |
| E15 | `dsh-nano-notepad/src/host/pipeline.js:185-232` | 自定义 RPC 以 method 白名单分发，含只读/允许键约束、空结果与 denied 形态；其中两个 manifest 标签共用一支实现。本轮不裁决应保留哪个标签 | Q3 |
| E16 | `dsh-nano-notepad/src/host/s3-sync.js:280-305`；`dsh-nano-model-selector/index.js:280-306` | 已有 handler 把结构验证接在远端对象进出或策略写入之前；但策略的 master-order/model 检查还依赖领域/host 信息，不是仅靠 JSON 结构能自动完成 | Q3 |
| E17 | `packages/dsh-host-route-guard/src/route-guard.js:188-220`；`scripts/route-scan.mjs:278-291`、`scripts/route-scan.mjs:302-325` | guard 的安全声明取自 baked table；scanner 对[DNLS]方法读取该表、对[DNT]方法/cap 使用 known 表。这是现有登记/派生拓扑，不是完整操作语义或运行时授权证明 | Q3 |
| E18 | `dsh-nano-model-selector/index.js:352-364`；`dsh-nano-model-selector-compaction/index.js:1-9`；`dsh-nano-notepad/index.js:362-378` | sanctioned bundle writer、native Provider 和 WASM 资源是真实合同边界；统一模型不能只按 REST/MCP 数量覆盖，也不能为它们硬造 RPC | Q3 |
| E19 | `dsh-nano-terminal/schema/dnt-mcp.openrpc.json:127-139`；`dsh-nano-local-sandbox/src/host/terminal-driver.js:15-24`、`dsh-nano-local-sandbox/src/host/terminal-driver.js:39-47` | 同名 `term.session.read`：前者有 `source=visible/recent/detection`，后者没有 source 且拒绝额外属性。后者是尚未接入 host 公共分发的模块，不能据此宣称两个在线 server 已发生互操作事故 | Q4 |
| E20 | `dsh-nano-terminal/src/host/sessions.js:112-130`；`dsh-nano-local-sandbox/src/host/terminal-driver.js:63-74` | 两处 create 的 id 来源不同：registry mint randomUUID 与 helper 取 sessionId。不能只因名字同为 create 就认定身份/幂等相同；本题不从实现反推应采用哪条法则 | Q4 |
| E21 | `dsh-nano-terminal/src/host/mcp.js:193-216`；`dsh-nano-terminal/src/client/lanes.js:176-195` | server 有 initialize/tools/list，generic McpLane.open 这条链直接 tools/call create，再读 structuredContent；这条链未先执行上述发现步骤，不能假定支持面已完成对账 | Q4 |
| E22 | `dsh-nano-terminal/src/host/mcp.js:60-65`；`dsh-nano-terminal/index.js:102-124`；`dsh-nano-terminal/src/client/lanes.js:212-238`、`dsh-nano-terminal/src/client/lanes.js:254-261` | 控制面返回 attach 元数据，client 请求 v:2，server 有 channel v2 解码；McpLane binary 仍裸收发。这是具体组合的静态不一致，本轮未实测该连接 | Q4 |
| E23 | `dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml:50-55`；`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:291-304`、`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:513-517` | profile 的 capability 描述、bridge 的 host-snapshot 依赖、child tools/list 合并分别位于不同层；目录或 manifest 存在不能单独证明某业务已接通 | Q4 |
| E24 | `dsh-nano-explorer-extra/src/client/index.js:87-91`；`dsh-nano-terminal/src/client/index.js:226-238`；`dsh-nano-model-selector-compaction/AGENTS.md:3-9` | optional 服务缺席后的原生回退、companion OFF 回原生是已存在的合法生命周期，不等于给旧协议提供兼容别名 | Q4 |

**从新事实得出的未决点**：

- 共同包已经确定，但其作者模型仍可按领域操作组织，或按协议入口组织；二者都能在单包内实现，第一轮并未选择其中之一。
- 闭环销账已经确定，但“同名、同协议、同包版本”不能自动证明同约；多提供方的差异是否允许、如何有边界地披露，仍需基础裁决。
- 以下推荐是根据上述新调查形成，不是对 `-7` / `-8` 的追加冻结；第三轮题目未生成。

### Q3 — 统一合同的作者模型，以领域能力/操作语义为主轴，还是以协议入口为主轴？

- **题型**：`foundational`。
- **驱动真相**：`T-O-CF1115-7`（一个可执行作者归口、单向派生、协议/领域分层）、`T-O-CF1115-8`（合同族真实闭环、全插件覆盖）；继承 baseline `-1` 至 `-6`。
- **来源**：评估报告 §5.3、§7–§8；本轮 E13–E18。
- **影响范围**：归口包内部的合同组织主轴、HTTP/RPC/MCP/native/资源的绑定、schema/校验/台账视图及未来新增业务。
- **为什么必须确认**：Q1 已决定归口位置，Q2 已决定销账单位，但“合同族”是交付/验收单位，不自动指定族内作者定义以什么组织。如果仍以一条路由代表全部合同，就会遗漏路径内读写差异；若走另一极端把所有业务变成统一 RPC，又会侵入领域与 host。
- **当前建议 / 倾向**（CF1115 架构 agent）：**A：以领域公共能力及其操作/生命周期承诺为主轴，协议入口作为显式绑定与派生投影；不是另造运行时能力总线。**
- **Reasoning**：一个稳定语义应有一个作者定义；path、method、tool name 和 native 服务是它的暴露方式。语义上并不相同的操作，即使共用 URL 也不能合并；并未跨协议复用的能力，也不必强行建立额外出口。

**【对本问题的解读】**

本题只选择**合同作者模型的主轴和表达深度**，不决定具体文件、ID 字段、schema 库或生成器。

“语义合同”不是把业务实现搬成配置，至少要能找到：谁拥有并提供能力；接受/返回什么；成功、空结果、拒绝和失败怎样区分；涉及哪些副作用、scope、权威状态和已获准的生命周期义务；哪些边界执行这些承诺。具体字段值、错误枚举、幂等/retry 法则仍必须继承已有裁决或另获[业主]决定。

协议绑定则描述这份承诺如何落到 URL/method/action、MCP 工具、事件/流、native 调用或资源交付。**绑定不是第二份同义作者源；合同目录也不是能任意调用插件的 runtime dispatcher。**

**【可选选项清单】**

| 选项 | 单一归口包内的作者组织形式 | 优点 | 代价与风险 |
|---|---|---|---|
| **A · 推荐** | **领域能力/操作与生命周期为语义根，协议入口是显式绑定**；同一语义复用同一作者定义，不同语义分别声明 | 能覆盖路径内分支与跨协议消费，未来新增入口不必重写一份业务承诺 | 需要清晰区分“真正相同语义”和表面同名，防止造万能领域模型或配置语言 |
| B | 以 HTTP 路由、MCP 工具、native 接口等协议入口为作者根；每个入口内完整声明操作与生命周期语义，跨入口显式关联 | 贴近现有入口，初期迁移较直观 | 同一能力多入口时更易重复表达，路径内多个操作仍须展开，长期关联成本较高 |

B 仍必须满足 `-7` / `-8`，不能只登记 path/bodyLimit 或只写参数 schema。**“公共包只有清单，语义继续靠各 handler 猜”已不满足上轮决定，不作为可重新选择的路线。**

**【推荐选项的详细执行说明与分析】**

若选择 A，建议锁定以下基础含义：

1. **按真实承诺分清操作，不按传输行数计合同。** config 的 list 与 save、session 的 get 与 generate_insights 即使共用路径，也要有各自的输入输出、副作用与失败边界；可复用公共片段，但不靠一个 route 条目遮蔽差异。
2. **语义作者只一份，暴露可以有多种绑定。** 同一已获准能力可有 HTTP/MCP/native 等适用绑定，绑定消费同一语义源。没有需要的协议不生成，不为每个方法自动新开 HTTP 或 MCP。内部语义标识不等于新增公共 wire 名称。
3. **结构约束和行为义务一起可追溯。** 公共 reader/validator/codec 承接通用约束；领域/host 接线承接动态政策、canonical writer、状态机等义务，并有明确验证责任。不能承诺一个 schema 自动生成全部授权或业务算法。
4. **保留 host 权威，不从 HTTP 动词猜权限。** 已获准的主体/scope、能力要求、状态所有者与安全声明应有明确来源和执行映射；元数据不冒充授权实现。不得借模型新增角色、token 或权限规则，也不把 pluginManager 的唯一 writer 换成公共包自己的写文件函数。
5. **非调用边界也用合适模型表达。** native Provider/service 描述其接入与生命周期；WS/SSE 描述交互/流承诺；WASM/SDK 按资源访问与交付合同表达。它们不被硬改成统一 request/response RPC。
6. **现有台账与 schema 逐项确定作者归属。** 路由表、工具目录和文档是相应作者源的视图/绑定产物；已在其他位置维护的同义字段需迁入或退役，不增加两处手改。代码现状只能发现候选事实，不能自动批准安全等级或新错误法则。
7. **未定内容不靠默认值补成已完成。** 模型只承载已批准承诺；缺少裁决或接线的内容保持未完成，不以“暂时全支持”“空 schema”“默认可重试”填补。避免把每个局部 helper 都注册成公共能力。

本题不冻结任何操作 ID、字段结构、具体错误码、重试义务或旧名称的去留；它决定的是后续如何在统一归口内表达和承接这些决定。

**【推荐选项的支持证据 / 其他选项的反例】**

- **路径无法代表一种副作用**：E13 的 configAction 同时包含读取与写入/激活动作；E14 的 sessionOps 又把读 session 和生成 insights 放在同一路由后。若合同根只到路径，测试与权限分析都无法知道是在约束哪种操作。
- **不能只统一参数而忽略结果语义**：E15 中存在空值、denied 和错误返回；本题不先判定应改成哪个错误码，但它们必须属于可对账的操作合同，而非只由调用方临时解释。
- **可执行约束有局部正例，也有边界**：E16 的对象进出校验与写前策略检查证明验证可以真正进入执行链；同时 master-order/model 依赖领域/host 信息，反证“一个 JSON schema 自动接管业务与授权”的过度方案。
- **现有登记模型不能直接当完整真源**：E17 的 scanner/表/guard 只对其明确范围负责，且不同包的解析来源不同。把这套路径视图直接改名为总合同，并不能满足 `-8` 的实际闭环。
- **A 也有过度抽象风险**：E18 中 native Provider、sanctioned writer 和 WASM 资源不同；它们不应被塞进一种虚构业务 RPC。A 的关键是共同作者规则，不是统一所有调用形态。
- **B 是有效但成本不同的路线**：纯单协议能力按入口组织可以很直接；若选 B，也必须完整展开 E13/E14 的分支并维护跨入口语义关联，不能用入口少来证明合同少。

- **问题（请[业主]裁决）**：**是否选择 A，以“领域公共能力/操作与生命周期语义 + 显式协议绑定”作为统一合同的作者主轴，并按上述责任分工承接执行与验证，不造新 runtime 总线；还是选择 B 的协议入口主轴？**
- **业主回答**：**已确认：选 A，同意本题全部推荐及其详细执行含义 → 冻结为 `T-O-CF1115-9`。** 来源：[业主] 2026-11-15“同意你在第2轮的全部推荐”；细节归档见 §1.4 F9.1–F9.7。

### Q4 — 多提供方何时算“同约”：显式支持面约束，还是要求所有实现全量同构？

- **题型**：`foundational`。
- **驱动真相**：`T-O-CF1115-7`（共同语义、协议原生适配、独立产物）、`T-O-CF1115-8`（真实消费者互操作、不得用 unsupported 规避既有承诺）；继承 baseline `-3` 的硬切与中立原则。
- **来源**：评估报告 §4.6–§4.7、§6；本轮 E19–E24。**不依赖 Q3 选择 A 或 B**，两种作者模型都需要同约判定。
- **影响范围**：terminal/sandbox 多提供面、generic MCP 消费、流协议、可选服务、backend/profile 与未来 carrier 扩展。
- **为什么必须确认**：统一作者源不会让所有独立交付包自动支持相同能力。同名工具可能参数域不同；工具调用成功不等于 attach 可用；服务缺席、暂时不可用和合同不兼容也不是同一种失败。没有判定原则，容易以插件特例继续扩散，或为了统一砍成最低公共能力。
- **当前建议 / 倾向**（CF1115 架构 agent）：**A：共同语义下的显式支持面/版本约束；同一已声明合同必须兑现，差异只能在已获准的能力边界表达，不能静默降级或按插件名猜测。**
- **Reasoning**：统一的是承诺及其消费规则，不是让每个 backend 承担所有功能；但“支持子集”也不能变成躲避已冻结能力的标签。差异须由合同约束并有真实证据，而不是由当前实现自行授予合法性。

**【对本问题的解读】**

本题决定**语义兼容与支持面披露的基础法则**，不决定具体版本号、协商报文、capability 字段或某个 provider 应支持哪些工具。

这里的“同约”同时涉及参数合法域、结果与失败含义、副作用、身份/幂等及相关生命周期，而不是只比较 tool name 或 JSON 字段。契约版本、MCP 协议版本、流帧版本、包版本、host engines 范围是不同维度，不能仅因其中一个相同就互相替代。

能力声明回答“这个提供面承诺什么”，不回答“当前主体被授权做什么”，也不自动证明能力已接线。对暂时不可用、未支持、不兼容和合法可选缺席应按相应合同表达，不发明新枚举。

**【可选选项清单】**

| 选项 | 多提供方统一法则 | 优点 | 代价与风险 |
|---|---|---|---|
| **A · 推荐** | **共同语义 + 经批准的显式支持面/版本约束**；提供方只声明真实且获准的能力，消费者按合同判断所需能力 | 保持平台中立与独立交付，能容纳合理 backend/角色差异，不靠私有特例 | 必须明确哪些是必需承诺、哪些可选，并对广告、实际分发和消费者行为做一致性验证 |
| B | 同一合同族内参与统一的各提供方必须实现该族的同一全量合同、工具与行为，不允许能力子集或角色差异 | 消费者模型最简单，替换条件直观 | 该族每种 backend/平台都要补齐全量；若未具备，不能广告支持，会扩大建设范围并压缩合理的角色边界 |

**不把以下做法当作满足 baseline 的第三路线**：由实现静默决定公共交集、把未完成改称可选、按插件名硬编私有差异，或为新旧合同建立长期兼容翻译层。

**【推荐选项的详细执行说明与分析】**

若选择 A，建议锁定以下基础含义：

1. **同一承诺必须同义。** 提供方声明相同合同版本/能力时，不能自行改变合法参数域、结果、错误与副作用。可选操作、参数维度或资源限制只有在[业主]已批准且消费者可辨识的合同边界内才可不同；不能给现有漂移贴上“能力子集”标签就销账。
2. **不自动取并集或交集作为新合同。** 共同必需面与合法可选面来自已批准决定，不从两个实现各有多少工具推导。现有已冻结能力尚未完成时，仍按 `-8` 保持未完成；改变承诺、降级或 defer 必须获得[业主]裁决。
3. **支持面必须和真实提供面相符。** 工具目录、profile、native 服务存在性和实际 handler/依赖就绪分别有明确责任；不能以一份 manifest 或占位摘要证明全部业务能力可用。目录与广告可以派生，不另存一份可改的支持面权威。
4. **消费者依据公开合同，不认插件私有身份。** 优先利用相应协议已有的发现/声明、版本或返回能力信息；必要的本仓扩展须另获批准，本题不指定协议字段。发现缺少所需能力或不兼容时明确表达，不能猜 URL、忽略参数、自动换含义或新增专有 lane。
5. **控制面与数据/生命周期面一并对账。** MCP create 返回 id 只是其中一段；attach 地址/协议、帧、结束与恢复等承诺必须与真实消费者一致。不同协议各用其原生语义，不用包版本相同代替互操作证据。
6. **保留合法可选/暂时不可用行为，不把它混成旧约兼容。** 已批准的 Cordis 服务缺席原生回退、companion OFF 回原生继续有效；能力广告不是授权凭证，host 仍负责主体与政策。暂时未就绪也不能被静默包装成成功。
7. **版本规则不能复活兼容第四阶段。** 仍以唯一目标合同、先验收后硬切推进；不因“能力/版本”名义新增旧路径别名、双写或常驻翻译链。本题不批准额外旧版本支持、自动重试、错误码或兼容窗口。
8. **覆盖按每个已承诺提供面证明，不按名字去重后验一次。** 共同夹具可以复用，但某个 provider 通过不能证明其他 provider、profile、native 或流适配也通过；增量验证仍遵守 `-8`，不新增未经批准的发布门禁。

这不直接决定 E19 的 source 应补到哪边、create 应采用何种身份/幂等、哪些工具应公开、现有帧版本应如何退役；这些具体公共合同值在本题未被预先填定。

**【推荐选项的支持证据 / 其他选项的反例】**

- **同名不等于同参数域**：E19 的 read.source 在一侧属于公开参数，在另一声明中会触发额外属性拒绝。A 要求先对账承诺与差异是否合法；不能仅共享工具名就认定两者可替换，也不能在本题先判哪份 schema 是正确真相。
- **同名不等于同身份/副作用**：E20 两模块的 create id 来源不同。模块 helper 不是在线能力证明；该例只证明必须表达身份/幂等承诺，不从实现推定新法则。
- **已有发现能力不等于消费者已经使用**：E21 同时存在 initialize/tools/list 与直接调用 create 的消费链。需要验证真实消费行为，而不是仅在 package 中增加一个 capability 类型。
- **控制面版本不等于数据面兼容**：E22 是 attach/帧/消费之间的静态分歧。这里不能靠工具 schema 通过或同一包来源来覆盖，实际修正也不应走私有 endpoint 猜测。
- **能力广告不等于业务接线**：E23 的 profile 声明、child 目录合并与 snapshot 依赖说明不同层次。A 不把它们当可互相替代的“已支持”证据。
- **B 并非不可能，但会承担更大义务**：若业务要求所有实现完全可替换，统一全量合同可以成立；但 E24 的合法可选服务/互斥 overlay 证明当前拓扑并非所有参与方都常驻、同角色。不能为简化消费者而虚假广告或擅自取消这些边界。

- **问题（请[业主]裁决）**：**是否选择 A，在共同语义下以“经批准且显式的支持面/版本约束”判定多提供方同约，要求真实广告、兑现承诺、消费者不静默降级，并继续先验收后硬切；还是选择 B，要求同一合同族的各提供方实现该族同一全量合同？**
- **业主回答**：**已确认：选 A，同意本题全部推荐及其详细执行含义 → 冻结为 `T-O-CF1115-10`。** 来源：同一[业主]裁决；细节归档见 §1.4 F10.1–F10.8。

---

## 5. ★ 中场评估 II（Round 2 → executional 阶段）`[核心·锁死]`

> **Round 2 中场总结已完成。** 先形成 5.1–5.3，再做 §6.0 新调查；5.4 记录调查后形成的第三轮驱动链。

- **5.1 对 Round 2 的判定**：两题均获明确批准，无本轮残留选择。归口包以能力/操作语义及生命周期为根，不以路径数冒充合同；多提供方以获准支持面兑现同约，不是全量同构、取最低交集或按插件名特判。四道 foundational 题已全部冻结，具备进入执行层调查的前提。
- **5.2 本轮已锁定真相**：新增 `T-O-CF1115-9` / `-10`，F9.1–F9.7、F10.1–F10.8 归档全部推荐含义，累计十条真相。未借此选定具体包名、合同字段、接口签名、错误枚举、工具集合、版本值或迁移批次；现有代码债务没有因 QNA 冻结自动销账。
- **5.3 诚实反方制衡**：语义模型可能膨胀成 DSL/巨型配置，支持面描述可能沦为给 stub 或漂移免责的标签。执行层必须把作者源、真实装配与消费者验证落到可检查的责任链，同时不搬业务状态、不替代 host writer、不造兼容层和发布门禁。不能用“以后生成”掩盖现有手改源，也不能为追求统一删减已批准能力。
- **5.4 为什么提出 Round 3（新调查后追加）**：§6.0 新证据显示，构建期共享与相对产物导入已有可复用路径，但 guard 在消费者内被修改；HTTP exact、HTTP prefix 和 `registerUpgrade` 分属不同注册调用，baked 表、扫描视图与 smoke 的覆盖也不同。因此 Q5 由 `-7` / `-9` 驱动，将归口位置落实成源码/导出/构建接线；Q6 由 `-7` / `-9` / `-10` 驱动，选择能覆盖真实宿主 API 的绑定与准入接口；Q7 由 `-8` / `-9` / `-10` 驱动，选择首批可验证范围与销账证据。三题都属于同一 focus：“首个可执行基座和真实入口闭环”，不借机锁定全部业务信封、MCP 工具集合或帧版本。

---

## 6. Executional 阶段（Round 3–6 全部冻结）

> **Round 3 状态**：`frozen`。[业主]同意第三轮全部推荐，Q5–Q7 均选 A，完整含义冻结为 `-11` 至 `-13` 与 §1.5。以下原题面、条件句与 Reasoning 保留提问时原文，不表示仍待选择；全部业务合同并未因此自动锁定。
>
> **同轮独立性**：Q5 的包内职责与派生接线不依赖 Q6 的某个字段方案；Q6 在 Q5 的两种 guard 归属方案下都可实现；Q7 规定首批真实边界与证据，在前两题任一满足既定真相的方案下均适用。若[业主]选择不同组合，按实际裁决整合，不先把同轮推荐当真相。

### 6.0 本轮提问前的新调查（先冻结、总结，再沿执行链取证）

本轮没有重算报告总数，也没有执行 build、业务请求、安装或部署。下列为新的源码/装配/测试检查；“测试中有此断言”不写成“本轮已跑过该测试”。

| # | 精确证据 | 新调查确认的执行关系 | 用于 |
|---|---|---|---|
| E25 | `packages/dsh-host-route-guard/package.json:2-16`；`packages/dsh-host-route-guard/AGENTS.md:3-15`；`packages/dsh-remote-data-schema/package.json:5-17` | 现有共享包是纯 ESM 构建库，有显式 exports 和 node:test；不是安装态插件。拟议 `packages/dsh-interface` 当前不存在 | Q5 |
| E26 | `dsh-nano-model-selector/scripts/build-client.mjs:9-36`、`dsh-nano-model-selector/scripts/build-client.mjs:81-88`；`dsh-nano-model-selector/src/host/route-guard-entry.js:1-16` | ledger → 本包 baked 表 → guard bundle → index 相对导入；本地源包不应成为运行时依赖 | Q5 |
| E27 | `dsh-nano-terminal/scripts/build-client.mjs:20-29`；`dsh-nano-terminal/package.json:25-33`；`dsh-nano-terminal/lib/route-guard.js:235-245` | [DNT]普通 build 不重建 guard/table，且 manifest 当前没有 guard 依赖；消费者副本承担了公共 kind 扩展 | Q5、Q7 |
| E28 | `dsh-nano-notepad/index.js:343-357`；`dsh-nano-notepad/scripts/build-client.mjs:18-36` | 同一包里 exact 经共享 guard，SDK prefix 另行注册；旁路有手动 connection 准入，不把它写成未鉴权 | Q6、Q7 |
| E29 | `dsh-nano-terminal/index.js:64-88`、`dsh-nano-terminal/index.js:255-270` | `registerUpgrade({path,handler})` 是独立宿主 API；HTTP session close 则用 `register` 的 prefix kind。upgrade 手工调用可选链式 requestRejection，并不经过共享 guard 的构造期检查 | Q6 |
| E30 | `dsh-nano-terminal/lib/route-table.js:1-8`；`scripts/route-scan.mjs:302-325`；`dsh-nano-terminal/test/register-routes.smoke.mjs:6-18` | 本地 baked 表只有普通 HTTP 行；scanner 的 known 集合另含 stream；smoke 明确期待单独 registerUpgrade。三个视图描述不同范围，不能互相充当“已统一”证明 | Q6、Q7 |
| E31 | `packages/dsh-host-route-guard/src/route-guard.js:82-107`、`packages/dsh-host-route-guard/src/route-guard.js:121-136`、`packages/dsh-host-route-guard/src/route-guard.js:159-217` | 当前以 path 索引、规范化 specs，再批校验；安全声明来自表，bodyLimit 仍允许 spec 覆写。这是新绑定接口要明确承接/修订的既有合同 | Q6 |
| E32 | `packages/dsh-host-route-guard/test/route-guard.test.mjs:41-56`、`packages/dsh-host-route-guard/test/route-guard.test.mjs:101-129`、`packages/dsh-host-route-guard/test/route-guard.test.mjs:193-228` | 现有 mock 只提供普通 register；验证了缺 connection、未登记、405 和兜底失败，但没有证明 mixed HTTP/upgrade 批次 | Q6、Q7 |
| E33 | `scripts/check-route-sensitivity.mjs:23-46`；`scripts/check-feature-contract.mjs:22-47`；`scripts/gen-route-sensitivity.mjs:22-29`、`scripts/gen-route-sensitivity.mjs:41-55` | 检查/生成目前按 path join；生成器回读既有手审字段。引入 channel 后不能仅增加表字段而继续按 path 去重或回读投影当作者 | Q5、Q6 |
| E34 | `scripts/test-all.mjs:25-54`；`dsh-nano-terminal/package.json:25-28`；`dsh-nano-terminal/test/run.mjs:1-8`、`dsh-nano-terminal/test/run.mjs:172-207` | root 没有 package.json；现有聚合脚本发现各包测试并单列 smoke。[DNT]npm test 有 WASM/WS codec 等测试，不等于 HTTP/upgrade 装配测试 | Q7 |
| E35 | `scripts/check-clean-lib.mjs:3-15`、`scripts/check-clean-lib.mjs:28-47`；`dsh-nano-notepad/package.json:24-33`；`dsh-nano-terminal/package.json:17-23` | 现有检查扫描发布入口和 lib 的裸引用，scope/host 特许项有限；发布物还要带 WASM、schema 等实际资源，不能只看源包 import 成功 | Q5、Q7 |
| E36 | `dsh-nano-terminal/index.js:368-377`；`dsh-nano-local-sandbox/test/route-scan-coverage.test.mjs:14-39`；`dsh-nano-local-sandbox/test/routes.test.mjs:52-62` | [DNT]独立撤销 upgrade 和普通 routes；仓内已有扫描负例与“先拒绝、后握手”的夹具，但它们不自动覆盖[DNT]真实 apply 的全部装配 | Q6、Q7 |

**本轮判断**：不能简单把 `spec.kind` 的一行差异上提就宣布完成 facade 统一；还必须解决真实注册 API、表的身份键、作者/生成方向、构建产物与验证边界。以下是请求[业主]批准的执行方案，不是已实施事实。

### Q5 — 首版归口包如何接入现有源码、guard 和每包构建链？

- **题型**：`executional`。
- **驱动真相**：`T-O-CF1115-7`（构建期单一归口、可复用 guard）、`T-O-CF1115-9`（语义作者源与绑定投影）、`T-O-CF1115-8`（逐闭环迁移）。
- **来源**：本轮 E25–E27、E33、E35；评估报告 `E1115-CROSS-02` 与 `E1115-DNT-01`。
- **影响范围**：拟建包的公开出口、源码依赖图、作者字段归属、生成入口及各插件发布物；不是仅选一个目录名。
- **为什么必须确认**：已批准“一个包”仍不足以告诉实现者，是复用现有 guard 还是搬走它、浏览器可否导入 Node 模块、旧 ledger 还是新合同模块写同一字段、build 到底生成什么。任意猜测都会形成另一条演进路径。
- **当前建议 / 倾向**（CF1115 架构 agent）：**A：建立 `packages/dsh-interface` 统一消费和作者归口，复用 `dsh-host-route-guard` 的唯一注册内核，采用显式环境出口和每包构建期物化。**
- **Reasoning**：公共 facade 归一不等于把已存在的单职责机制再重写一份。先把唯一作者、唯一实现和唯一生效消费链连起来，迁移范围可按合同族硬切。

**【对本问题的解读】**

本题批准的是首版可实施的**包/导出/生成依赖图**。业务状态、host 权威、远端对象数据格式不搬迁；UI/HTML/S3/性能等独立共享库也不合并。

`dsh-interface` 是本轮提出的构建期包名，不是已有包，也不是必装 runtime plugin。其初期实现仍采用仓内已有的 ESM JS、现有 esbuild 与 Node 测试工具，不以统一为由先建设一套新语言或引入未核查的编译器。

**【可选选项清单】**

| 选项 | 执行接线 | 优点 | 成本与边界 |
|---|---|---|---|
| **A · 推荐** | **新归口包拥有公共合同/门面/生成出口，单向复用现有 guard 唯一实现**；各插件只携带构建产物 | 复用已有 fail-closed 机制与测试，不制造第二套 guard；可按闭环切换 | 要约束环境出口、来源归属及源码依赖闭包，不能只加一层转发壳就停止迁移 |
| B | 将 guard 实现、相关公共导出和测试整体迁入新归口包，全部引用方同步切换后彻底退役旧 guard 包 | 最终物理位置更集中 | 必须一并修订所有受影响构建与包级合同，首批影响面更大；不允许旧包留下兼容再导出 |

A 保留的是仍有单一职责的实现模块，不是保留旧业务路径的兼容 facade；B 也是合法硬切路线，但需承担全引用链同批迁移。

**【推荐选项的详细执行说明与分析】**

若选 A，建议锁定以下执行约束：

1. **首版位置与身份**：新增 `packages/dsh-interface`，包名 `dsh-interface`、纯 ESM、构建期私有库，不声明 `dsh.bundle`/`dsh.client`。不扩大现有 host 引擎支持范围，不安装成独立插件；源码不是运行时数据源。
2. **显式出口而非万能根入口**：

   | 首版消费入口（拟建） | 职责和环境 |
   |---|---|
   | `dsh-interface/contracts` | 无 I/O 的合同定义、已获准 schema/语义与绑定数据；不 import Node、DOM、Cordis 实例或可变 store |
   | `dsh-interface/host` | host 侧适配及注册门面；只注入领域 handler/host 服务，不持业务 canonical |
   | `dsh-interface/build` | Node 构建期生成/对账工具，不进入页面或运行时请求链 |

   不提供会把 host/build 混入浏览器的聚合根入口；浏览器侧保持独立职责边界，等有真实迁移消费时再开放对应 client 出口，**不先放空壳导出来声称 client 统一完成**。
3. **guard 不复制**：`host` 单向使用 `dsh-host-route-guard` 的唯一实现。注册模型扩展应落到该唯一实现及门面接线，不在新包再手写一份并保留消费者私改版。既有包级“唯一 guard”约束继续兑现；已迁移调用方不再自行绕过门面拼装第二条注册链。
4. **构建依赖闭包真实可解析**：插件将新包声明为 `file:../packages/dsh-interface` 的构建期 devDependency；复用的 guard 及其依赖须在源码依赖图中有正确声明和锁定，不能指望库自己的 devDependency 会被传递安装。保留仍有使用者的既有共享依赖，不把源码依赖当运行时解析要求。
5. **每包物化、自包含交付**：现有 build 调用共享生成入口，再 bundle 本包需要的 host/client 代码；未 bundle 的 index 只读本包相对产物。可沿用 `lib/route-guard.js`、`lib/route-table.js` 等产物文件名，但其内容必须同源生成；不保留新旧两份有效 guard。新增产物须同步 `files`，不得遗留裸 `dsh-interface` import。
6. **作者迁移按字段归属单向进行**：经批准的合同进入 `src/contracts/` 内的领域模块，旧 OpenRPC/ledger 同义字段在该闭环切换时失去手改作者资格，输出文件可以保留为只读投影；未迁移部分仍保留其原唯一作者源。生成器必须明确归属并拒绝重复作者，**不得回读已生成视图补同一字段，也不得“新源失败就退回旧源”**。
7. **安全决定原值承接、不能由生成器发明**：已有手审的 sensitivity/capability/sessionBinding/justification 等逐项核对迁移，缺项保持未完成，不自动给权限、推导 retry 或放宽 bodyLimit。这里请求批准的是作者来源和生成方向调整，不是修改这些值；包级说明中关于 ledger 烤表的来源描述须随获准迁移同步更新，运行时不读仓根的要求不变。
8. **幂等再生成和环境隔离有证据**：相同作者输入再生成不产生差异；contracts/未来 client 的浏览器构建不能带 Node/host；构建产物离开仓根和源码依赖仍能按各包安装合同加载。不升级工具链、不新增外部运行时依赖来掩盖接线问题。

本题不批准一套通用业务 DSL、全部合同字段 AST 或新的 wire envelope；已有远端对象 schema/领域校验器仍是其唯一实现，不能复制到新包再维护一份。

**【推荐选项的支持证据 / 其他选项的反例】**

- **构建期包和分出口已有先例**：E25 的两个包说明/exports 支持此交付形式，不需要 host 新增公共 runtime 服务。
- **bake/bundle 链已能满足离仓运行**：E26 是现成正例；A 统一作者/生成工具而保留每包物化，不改变发布物自包含性质。
- **“直接拷到 lib 就好”已有反例**：E27 正是 guard 修复不会随普通 build 到达消费者的路径；新包若只多一个 helper 而不修构建来源，不能消除该债。
- **只集中源码、不改生成回读仍会双源**：E33 的生成器回读 JSON 手审字段；迁移后必须明确哪些字段是作者、哪些只是投影，不能继续把产出当备选输入。
- **运行时解析本地源码依赖不可当验收方案**：E35 的 clean-lib 约束及发布白名单要求实际 bundle；不能因开发树 node_modules 可见就认定 tarball 可用。
- **B 的集中收益真实，但并非免费**：现有 guard 有包级职责合同与负例测试；整体迁走必须带走全部引用和验证，不能只删目录或留下永久再导出。A 不属于为旧业务协议提供兼容。

- **问题（请[业主]裁决）**：**是否选择 A，以 `packages/dsh-interface` 及上述显式出口、单向复用 guard、字段作者迁移和每包物化规则落地首版归口；还是选择 B，同批迁走 guard 并彻底退役其原包？**
- **业主回答**：**已确认：选 A，同意本题全部推荐及详细执行含义 → 冻结为 `T-O-CF1115-11`。** 来源：[业主] 2026-11-15“同意你在第3轮的全部推荐”；细节见 §1.5 F11.1–F11.8。

### Q6 — HTTP exact/prefix 与 upgrade 怎样进入同一个登记、准入和释放模型？

- **题型**：`executional`。
- **驱动真相**：`T-O-CF1115-7`（唯一注册机制）、`T-O-CF1115-9`（显式协议绑定及执行映射）、`T-O-CF1115-10`（真实提供面与生命周期一致）。
- **来源**：本轮 E28–E33、E36；不以 Q5 选 A 为前提，guard 无论保留还是迁入均须提供同一获准模型。
- **影响范围**：web 绑定作者形状、公共注册门面、HTTP/upgrade 两类 host API、各包 handler 接线和登记检查的身份键。
- **为什么必须确认**：当前 `kind` 只解决普通 register 的匹配方式，不能覆盖 registerUpgrade；path-only 索引也不能完整表达同路径的普通请求和升级入口。若实现者自行补一行 kind 或复制一套 upgrade guard，会再次分叉。
- **当前建议 / 倾向**（CF1115 架构 agent）：**A：一个显式绑定表 + 一个 mixed-batch registrar，以 channel 区分 HTTP/upgrade，以 match 区分 exact/prefix，统一预检、准入和撤销。**
- **Reasoning**：HTTP/upgrade 应保留真实宿主 API 和参数，而由同一可检查模型约束；不能把它们伪装成一种响应协议，也不能把 upgrade 留在表外。

**【对本问题的解读】**

本题提出新的**构建期/插件内公共注册接口**，不是新增业务路由或网络协议。HTTP 的 `kind` 与连接升级的 channel 是两条轴：

- `channel: 'http'` 配 `match: 'exact' | 'prefix'`，映射现有 `webServer.register`；
- `channel: 'upgrade'` 首版只允许 `match: 'exact'`，映射现有 `webServer.registerUpgrade`；不假设宿主支持 prefix upgrade。

HTTP 的 MCP/SSE/资源 handler 仍各自处理协议，WebSocket 仍由领域代码握手/处理帧；公共层只统一绑定、准入与生命周期，不把数据面改成 JSON。

**【可选选项清单】**

| 选项 | 接口与装配 | 优点 | 代价与风险 |
|---|---|---|---|
| **A · 推荐** | **同一表、同一 register 混合批次**，预检全部 handler/host 能力后再向两类 host API 注册，返回统一幂等 dispose | 可验证完整覆盖，减少先注册 HTTP 后发现 upgrade 不合法的半装配状态 | 要扩展 guard 的记录/身份键和 socket 错误边界，不能只改 kind |
| B | 同一 guard 内分别提供 HTTP 与 upgrade 两个公开注册入口，共用表、准入和 inventory | 接近现有分两处调用的写法 | 调用方必须额外协调两批的完整性、失败清理和释放；容易漏调用其中一个入口 |

B 不允许另写一套鉴权算法或第二份台账；“upgrade 继续完全手工注册，只补文档”不满足既有冻结方向。

**【推荐选项的详细执行说明与分析】**

若选 A，建议将以下接口与行为作为首版合同：

```text
createWebRegistrar({ plugin, table })
  .register(ctx, handlersByBindingId) -> dispose
  .inventory() -> readonly effective bindings
```

1. **绑定表是唯一元数据来源**：每行有稳定内部 `id`、`plugin`、`channel`、`match`、`path`、`methods`，并承接已批准的有效 bodyLimit、安全声明、操作关联和来源。`id` 仅用于本包装配，不成为新 wire 方法名。表由获准作者源构建期物化；handlers map 仅提供 `id → function`，不再重复手写路径、安全字段或 method。
2. **身份不再仅按 path**：注册覆盖键至少包含 `(plugin, channel, match, path, method)`；允许同路径的 HTTP/upgrade 独立声明，不允许同键或 id 重复。必填字段缺失、plugin 归属冲突、handler 非函数、表中有而 handler 缺席、handler 多出未知 id、未知 channel/match、upgrade 非 exact/GET 或缺 host API，均在任何注册前拒绝。不得偷偷默认旧格式为 exact/http 来掩盖遗漏。
3. **公共层统一 fail-closed**：注册前确认 connection 和 requestRejection 可用；每个请求/升级在业务 handler 或握手前执行相同准入。拒绝时不执行 handler、握手、PTY/文件操作或其他副作用；不保留当前手工可选链作为额外放行路径。本题不据此声称现有线上发生过绕过。
4. **适配真实 host 调用，不改变其匹配语义**：HTTP 下将 match 映射为 kind，子路径与资源解析仍归原 handler；不私造 priority 或新 URL。HTTP handler 接收 `(req,res,effectiveBinding)`；upgrade handler 保留宿主请求/socket 参数及其提供的 head（如适用），再附有效 binding，不丢弃宿主传入数据，不在公共层执行握手。
5. **新接口无运行时元数据覆写**：有效 bodyLimit 等已在作者/构建阶段确定，handlers map 不接收 `spec.kind`、methods 或 bodyLimit 覆写。**此项明确修订现有 guard 新接口中的 spec-side override 用法，不是暗中收紧或放宽限额值**；旧限额与安全值须审定后原值承接。未迁移消费者的既有合同不被静默改变。
6. **协议边界不被兜底 JSON 污染**：HTTP 入口的既有拒绝/405 等行为保留；MCP 解析/工具错误、SSE/资源交付由其 adapter/handler 承接。已发头或升级后的失败不能再写普通 JSON 响应，应按流/socket 的适用规则终止并释放。本题不新增通用业务错误枚举或统一信封。
7. **整批释放与失败回收**：预检后按既定装配顺序注册；host 注册中途失败要回收本批已注册项。返回一个幂等 dispose，纳入 ctx.effect 生命周期，撤销 HTTP/upgrade 不遗漏、不重复；不留下暂时暴露的另一条注册链。
8. **所有视图承接同一身份维度**：baked 表、inventory、feature/sensitivity 对账与 scanner 都须识别 channel/match，不能继续只用 path Map 吞掉一面；用实际注册观察和独立负例校验生成声明，不以同一表的两个投影互相“证明正确”。安全字段不从扫描自动批准，sessionBinding 也不因此自动成为对象授权。

原 shared guard 的唯一实现应被演进，而不是与上述 registrar 各养一套校验。已迁移绑定成对硬切，旧手工注册退出；未迁移绑定可按其原单一来源继续运行，但不能对同一绑定双注册。报告原 85/118 是历史口径，新模型须另标快照与单位，不能改写旧账来制造减债。

**【推荐选项的支持证据 / 其他选项的反例】**

- **必须分清两条轴**：E29 直接调用 registerUpgrade，而 prefix 走 register；不存在把 WS 简单设成第三个 HTTP kind 就覆盖全部入口的证据。
- **同名视图不等价**：E30 的五行 baked HTTP 表、包含 stream 的 scanner 和允许直注册 upgrade 的 smoke 各有边界。将它们合并必须改变身份与预检，不能只改人工总数。
- **单处修 kind 不够**：E28 的 SDK prefix 与 E29 的升级都有各自手工准入；它们没有共享 guard 的全部构造/登记检查。A 收口的是机制，不否认当前已有手动准入。
- **新接口是显式改约，不伪称零行为变更**：E31 与 E32 证明旧 spec 有 bodyLimit override、旧 mock 没有 upgrade。A 必须迁移有效值、扩充测试并处理 socket，不可删除旧断言后只看绿灯。
- **B 的复杂度在调用方**：E36 当前就需分别撤销 upgrade/routes。两入口方案可实现，但需要每个调用方正确协调；A 把这个责任集中到唯一机制。

- **问题（请[业主]裁决）**：**是否选择 A，批准上述 channel/match 绑定模型、handlers-only 接线与 mixed-batch registrar（含预检、统一准入、无运行时覆写及统一释放）；还是选择 B，在同一 guard 内保留 HTTP/upgrade 两个独立注册入口并由调用方协调？**
- **业主回答**：**已确认：选 A，同意本题全部推荐及详细执行含义 → 冻结为 `T-O-CF1115-12`。** 来源：同一[业主]裁决；细节见 §1.5 F12.1–F12.8。

### Q7 — 首批迁移锁定哪些真实边界，什么证据才允许将这一批销账？

- **题型**：`executional`。
- **驱动真相**：`T-O-CF1115-8`（闭环、先验收后硬切、全插件目标）、`T-O-CF1115-9`（真实操作/协议绑定）、`T-O-CF1115-10`（逐提供面验证，不用名字去重冒充覆盖）。
- **来源**：本轮 E27–E30、E32–E36；评估报告 `docs/code-review/26-nov/contract-and-facade-1115-eval.md:280`、`docs/code-review/26-nov/contract-and-facade-1115-eval.md:296`、`docs/code-review/26-nov/contract-and-facade-1115-eval.md:500`。
- **影响范围**：第一批实际调用方、回归证据、构建与发布物自包含、退役范围和债务销账边界。
- **为什么必须确认**：基础包单测通过不能证明插件真实使用它；全量业务改约又尚未锁定。需要选择一个足够代表真实形态、又不会借试点吞掉全部支持面裁决的首批闭环。
- **当前建议 / 倾向**（CF1115 架构 agent）：**A：首批闭环为“共享 web 注册/准入绑定合同族”，由[DNN]和[DNT]贯通 exact、prefix、upgrade、构建与发布验证；不把两插件全部业务或 MCP 能力债一起销掉。**
- **Reasoning**：两包正好包含已观察到的旁路/私改路径，且有真实资源、MCP、SSE、WS 和关闭路由可做不改业务语义的接线回归。应先证明共同机制不是空包或另一个副本，再依新调查推进剩余边界。

**【对本问题的解读】**

本题落实 `-8` 的“按合同族闭环”，不是改成“先做完两个插件”。首批只对**注册/准入/产物来源这一个公共机制合同族**结算，涉及两个真实提供包与其真实请求/升级消费。

其余普通 JSON 失败语义、MCP 业务接线、terminal 工具差异和数据面问题继续留账；首批回归“不破坏原协议”不等于认证它们原本已正确或符合全部标准。本题也不提前安排后续 QNA 问题。

**【可选选项清单】**

| 选项 | 第一批范围 | 收益 | 成本与风险 |
|---|---|---|---|
| **A · 推荐** | **公共机制 + [DNN]/[DNT]真实 web 绑定闭环**，覆盖 exact/prefix/upgrade 和离仓产物 | 直接消除已知旁路/私改演进路径，能较早验证共源与真实消费，边界明确 | 不能宣称全插件完成，也不偿还这两包全部业务合同债 |
| B | 首批同时兑现[DNLS]–[DNT]–[DNK]的业务平台全链，包括 MCP/terminal/后端生命周期及所有适用既定承诺 | 优先攻克平台能力债，业务价值直接 | 需要补齐更多真实接线与环境证据，不能只改目录或将 stub 改称可选；实现面和所需裁决更大 |

B 并非不应做，但选择它就要承担实际业务闭环，不能只通过同一批基础包测试便销账。无论选哪项，都不得撤销既有平台承诺或延期而不登记。

**【推荐选项的详细执行说明与分析】**

若选 A，建议把首批责任与验收锁定如下：

1. **真实迁移范围**：

   | 真实边界 | 首批必须改变 | 必须保留/不得冒领 |
   |---|---|---|
   | [DNN]现有 HTTP 注册与 SDK prefix | 使用获准公共入口及同源 baked 绑定；退役手工 prefix 注册/准入分支 | SDK/WASM 的字节、HEAD、Content-Type，JSON/MCP式 RPC/SSE 各自协议不改 |
   | [DNT]普通 exact、session close prefix、WS stream upgrade | 使用同一获准作者/注册模型；退役私改 guard 与手工 upgrade 登记/准入；清理独立释放链 | 原路由、MCP 错误/工具返回、SSE 生命周期、WS 协商/帧和领域 PTY 责任保留；不在本题选择新帧版本 |
   | 两包的 build/相对导入/发布物 | 共同作者 → 本包 baked 表与 guard/facade bundle → 实际加载；不靠邻居源码 | WASM、schema、skill 等运行时资源仍按各包白名单交付；不是只生成一个新 helper |

2. **机制负例必须覆盖新边界**：缺 connection/requestRejection/所需 host 注册 API、缺 handler、未知 handler id、未登记或重复绑定、错误 method/channel/match，均有独立负例；检查任何业务副作用/握手前已拒绝。模拟后一个注册失败，验证前面已回收；重复 dispose 不残留或重复释放。
3. **真实装配不是源码字符串检查**：复用/抽取必要的可注入装配 seam，让真实 binding/handler 接到受控 host API。观察实际 register/registerUpgrade 调用和受控请求/升级往返，不仅断言源码含某个函数名。先撤销再重装时，不出现双注册或漏 upgrade。
4. **协议保真与证据强度分开**：对原路径/方法、SDK GET/HEAD、非法子路径、MCP JSON-RPC 形状、SSE 关闭清理、WS 准入在握手前等做代表性回归；不启动真实 PTY/容器、不写用户数据作为夹具。离线/模拟通过不冒充当前安装环境 e2e；所需真实 host 验证若尚未获准或未完成，明确待验，不能提前销账。
5. **再生成和离仓交付都要核对**：生成两次结果相同，修改作者后结果随之改变，不准手改 lib；用临时目录的实际打包产物/最小受控 host 验证无仓根、源码目录或开发 node_modules 依赖，且保留必要资产。`npm pack --dry-run` 只证明清单，不独自承担运行证明；本题不授权安装/重启现用 profile。
6. **复用现有验证入口，不扩发布门禁**：

   | 验证层 | 已有可复用入口或拟新增位置 | 使用边界 |
   |---|---|---|
   | 唯一注册实现单测 | 现有 `packages/dsh-host-route-guard/test/route-guard.test.mjs`；若选 Q5-B 则随实现迁移测试 | 增加 upgrade/mixed-batch/释放负例，不复制第二套实现测试成第二作者 |
   | 新归口与真实装配 | 拟新增 `packages/dsh-interface/test/` 下 Node 测试，必要时补各包装配测试 | 用真实导出和 binding，不用同一生成表的两个投影自证 |
   | [DNT]既有回归 | `npm --prefix dsh-nano-terminal test`；`node --test dsh-nano-terminal/test/register-routes.smoke.mjs` | smoke 目前期待直注册 upgrade，迁移后须换成对共同机制和实际准入的更强断言，不能简单删测试 |
   | 登记/发布引用 | `node scripts/check-route-sensitivity.mjs`、`node scripts/check-feature-contract.mjs`、`node scripts/check-clean-lib.mjs` | 扩现有检查所需维度，不缩 scope/移除安全断言求绿；PASS 仍只证明其检查范围 |

   这些是未来实施验证入口，**本轮没有执行**。开发时跑相关窄测试，阶段收口再做一次必要集成/既有检查；不每改一行跑全仓或启动真实外部环境，不新增 release-gate。
7. **切换与销账准确限定**：先在隔离产物/夹具验证，再成对切换并退役旧手改源与调用；同步表、scanner、包级安装说明/交付物。`E1115-DNN-01`、`E1115-DNT-01` 只有各自条件真正兑现才可销账；`E1115-CROSS-02` 涉及其他包的生成分叉，首批只能登记部分偿还。其他债务保持原编号与余额。
8. **全仓目标不变**：本批结束需明确其他活跃包哪些字段/入口尚未迁移，保留其单一有效作者和未完成状态；后续范围依据新事实再定，不把首批两包测试通过称作“所有 contract/facade 统一”。本轮仅锁定执行决策，不等于已经开始或完成这批实施。

**【推荐选项的支持证据 / 其他选项的反例】**

- **有针对性的两包选择，而非挑简单 demo**：E27/E28/E29 包含现存私改、prefix 旁路与独立 upgrade，能验证共同机制最容易再次分叉的地方。
- **现有 smoke 的绿不能承诺更广**：E30 明确接受 registerUpgrade 单独存在。迁移要增强真实装配断言，不是把旧脚本 PASS 当新统一的证据。
- **已有测试可复用但不可冒领覆盖**：E32 只有 HTTP mock；E34 的[DNT]测试涵盖 WASM/WS codec。它们有价值，却没有证明同一 registrar 接了所有真实入口。
- **发布验证必须离开开发树**：E26/E35 表明运行时只看相对产物与必要资产；在仓根 import 成功不足以排除 bare import 或漏资产。
- **B 的价值与义务都更大**：既有 `docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md:58-65` 冻结了真实 L2、terminal、生命周期与退役要求。选择 B 不能以声明清单或本地 helper 测试替代那些实际承诺；A 不取消它们，只限定本批可销账子范围。

- **问题（请[业主]裁决）**：**是否选择 A，将首批执行范围锁定为上述公共 web 注册/准入合同族与[DNN]/[DNT]真实绑定闭环，并按分层证据、先验收后硬切及限定销账规则结算；还是选择 B，首批同时完成[DNLS]–[DNT]–[DNK]的业务平台全链？**
- **业主回答**：**已确认：选 A，同意本题全部推荐及详细执行含义 → 冻结为 `T-O-CF1115-13`。** 来源：同一[业主]裁决；细节见 §1.5 F13.1–F13.8。

### 6.1 ★ 中场评估 III（Round 3 → 后续轮）`[核心·锁死]`

**已完成本轮总结。** 先形成下列前三项，再做 §6.2.0 新调查，最后追加第四项驱动链。

- **判定**：三题均明确选 A，彼此一致，无本轮选项残留。已确定归口包/出口/生成依赖图、HTTP/upgrade 混合登记和首批两包绑定验证，不再保留迁走 guard、双注册入口或首批全业务平台作为并行路线。
- **已锁定真相**：新增 `-11` 至 `-13` 及二十四条细节，累计十三条。首批只解决公共注册/准入及构建来源，不把普通 JSON、MCP 实接、native/窗口或所有业务契约债视为完成。
- **诚实反方制衡**：生成器仍可能回读投影制造双源；registrar 仍可能只改 kind 而漏 upgrade、释放或实际准入；首批测试仍可能替全部业务背书。冻结的职责、独立负例、离仓验证及限定销账必须贯彻，不能用空 facade、兼容翻译或删测试绕过。
- **为什么提出下一轮（新调查后追加）**：E37–E48 显示，HTTP 注册正确仍不能防止 JSON 假成功、MCP 目录/分发脱节或 window 能力泛化。由 `-11` / `-13` 驱动 Q8 的真实 client 与结果判别，由 `-11` / `-12` / `-13` 及 `-10` 驱动 Q9 的工具集/实际 handler/协议消费，由 `-11` / `-13` 及 `-7` / `-10` 驱动 Q10 的最小原生导入服务与生命周期。三题均只以已冻真相为前提，不预设第五轮答案；收口判断见 §7.1。

### 6.2 Round 4 —— executional：注册之后，真实消费者怎样兑现合同（`Q8–Q10`）· 已冻结

> **Round 4 状态**：`frozen`。[业主]同意本轮全部推荐，Q8–Q10 均选 A，完整含义冻结为 `-14` 至 `-16` 与 §1.6。原题面/条件句保留提问时原文，三种协议仍不揉成同一 wire 信封。
>
> **同轮独立性**：Q9 不使用 Q8 尚未批准的 JSON Outcome 去封装 MCP；Q10 不依赖 Q8/Q9 的错误分类或工厂。它们可以共享已批准的源码/导出边界，但不能互相借用待答推荐作为真相。

#### 6.2.0 本轮提问前的新代码检索与拓扑分析

本轮在第三轮冻结与总结之后进行以下检查；没有发业务请求、启动 host/容器、安装插件或运行业务测试，不把静态代码路径写成线上失败复现。

| # | 精确证据 | 本轮新检查的执行关系与边界 | 用于 |
|---|---|---|---|
| E37 | `dsh-nano-explorer-extra/src/client/workspace-store.js:27-48` | request 将 JSON 解析失败换成 error 对象，随后在 HTTP 2xx 下展开成 ok:true；说明 transport 成功不等于合同成功 | Q8 |
| E38 | `dsh-nano-cloud-session/src/client/api.js:4-18`；`dsh-nano-cloud-session/index.js:80-93` | host 的 HTTP status 与 carrier 原 status 并非同一维度，client 当前把 json.status 优先放入 error.status | Q8 |
| E39 | `dsh-nano-model-selector/index.js:280-334`；`docs/specs/dsh-nano-model-selector/qna/DNMS01-qna.md:66-72` | PUT 失败与 GET 的合法 degraded/null 投影不同；既有错误闭集、UI/读态契约不能被通用包装器重定义 | Q8、收口判断 |
| E40 | `dsh-nano-local-sandbox/src/host/mcp-sandbox.js:1-38`；`dsh-nano-local-sandbox/src/host/routes.js:514-529` | 目录给每工具空对象 schema；call 不传入 arguments，统一回答诊断摘要。此链只能证明当前接线方式，不证明各业务已实现 | Q9 |
| E41 | `dsh-nano-terminal/src/host/mcp.js:18-30`、`dsh-nano-terminal/src/host/mcp.js:215-246` | TOOLS 来自 OpenRPC，但分发另写 switch；协议错误和 isError 工具失败已分层，不能被普通 HTTP JSON facade 吞并 | Q9 |
| E42 | `dsh-nano-terminal/src/client/lanes.js:176-220` | McpLane 按 structuredContent.id 接受结果，再固定 open.v=2；URL 处理会重设 session query，且 wss 输入会落入设为 ws 的分支。均为该代码路径的静态结论，非本轮联网复现 | Q9、收口判断 |
| E43 | `dsh-nano-terminal/src/client/index.js:220-238`；`dsh-nano-explorer-extra/src/client/index.js:80-91` | nanoTerminal 已按 Cordis service 惰性发现、scope disposer 与合法缺席回退接线，可作为非 HTTP 标准接入的仓内正例 | Q10 |
| E44 | `dsh-nano-explorer-extra/src/client/body.js:953-967`；`dsh-nano-notepad/src/client/panel.js:4500-4559` | 已知跨插件消费者实际只调用 import，但同一 window 对象还公开设置、同步与 fx/数据能力，不能把整个对象直接命名为新合同 | Q10 |
| E45 | `dsh-nano-notepad/src/client/index.js:44-95`；`dsh-nano-notepad/src/client/panel.js:949-950`、`dsh-nano-notepad/src/client/panel.js:4782-4815` | 面板是无 ctx 的 mountNotepad 控制器；ctx 在外层，DB 异步就绪，卸载另行清理。service 注册必须由外层适配生命周期，不能直接向面板灌 host 权威 | Q10 |
| E46 | `dsh-nano-notepad/src/client/panel.js:4567-4589`、`dsh-nano-notepad/src/client/panel.js:4669-4675`；`dsh-nano-notepad/src/client/db.js:326-344` | 旧 global 还被包内 fx/导入使用；当前 import 返回整个 node，身份是本包 DB 生成。退役 global 必须迁完包内调用，不能只改[DNEE]一行 | Q10 |
| E47 | `dsh-nano-model-selector-compaction/index.js:1-9`；`dsh-nano-cloud-session/index.js:187-237`；`dsh-nano-kitesurf/src/client/index.js:12-29` | 仍有 host isolate Provider、native session/agent 投影和跨包 HTTP 消费。首批两包 web 绑定不能覆盖这些活跃形态 | 收口判断 |
| E48 | `dsh-nano-terminal/schema/dnt-mcp.openrpc.json:20-42`、`dsh-nano-terminal/schema/dnt-mcp.openrpc.json:126-139`；`dsh-nano-local-sandbox/src/host/terminal-driver.js:15-54`；`docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md:62-65` | lane/source/参数边界与既冻领域合同要逐项对账；DNLS validator 的 bounds 对非 number 直接返回 null，且 helper 存在不证明在线使用。不能由“共享生成”自动判定哪个字段应改 | Q9、收口判断 |

**事实搜索边界**：另检索了八个活跃包的作者代码/测试以及 scripts/packages 中对 `__nanoNotepad` 的引用，排除 node_modules、派生产物等；本轮发现的跨插件调用为 E44，包内调用见 E46。此结果不是对未列入搜索范围的外部脚本或 host 扩展作无消费者保证。

### Q8 — 普通 JSON 的共享 facade，冻结哪种结果判别与 codec 边界？

- **题型**：`executional`。
- **驱动真相**：`T-O-CF1115-11`（真实 client 消费才开放出口、单向作者）、`T-O-CF1115-13`（注册首批不销业务债），以及 `T-O-CF1115-7` / `-9` 的结构识别、语义/绑定分层。
- **来源**：本轮 E37–E39；继承已有领域裁决，不以当前各种错误形状自动成为获准合同。
- **影响范围**：拟开放的 `dsh-interface/client`、普通 JSON 的 host/client codec、UI 成败分支与真实调用迁移；MCP、JSON-RPC、SSE/WS、下载和 OpenAI 流不在此封装范围。
- **为什么必须确认**：共享 fetch 并不解决 2xx 假成功、degraded 被误当失败、carrier 状态与本地 HTTP status 混淆。若为了统一强改全部 wire，又会覆盖已有领域冻结。
- **当前建议 / 倾向**（CF1115 架构 agent）：**A：统一 JS 消费结果和执行机制，每个操作使用唯一的已批准目标 codec；不新增全仓普通 JSON wire 信封，也不提供多旧格式猜测兼容器。**
- **Reasoning**：稳定的消费判别可以统一，领域成功/失败的合法含义必须来自合同；同一语义/绑定只一份 codec，不由每个 UI 自己猜字段。

**【对本问题的解读】**

本题要锁定可写代码的调用接口与判定矩阵，不是再讨论“是否需要公共 helper”。公共 facade 在生产者和消费者之间承接同一目标绑定：已获准的 wire 可保留为唯一目标，未经批准的旧形状不能因本题被自动合法化。

“每操作 codec”指获准绑定的编码/解码与结构验证，不是同时尝试 `{error}`、`{reason}`、`{errorId}` 的兼容翻译链；同义操作也不能按插件身份另配一份私有解释。

**【可选选项清单】**

| 选项 | 目标接口 | 收益 | 代价与约束 |
|---|---|---|---|
| **A · 推荐** | **统一 client Outcome + 唯一目标 codec**；host/client 从同一作者绑定派生，保留获准 wire | 不覆盖既有领域错误/读态，能将解析、HTTP 与业务失败分开 | 必须逐项确认目标 codec；不能以“支持现状”为由容忍未知形状或长期分叉 |
| B | 对全部自有普通 JSON 面采用同一种新 wire 成功/失败信封，再成对硬切所有相关调用 | 网络层形状最一致 | 必须逐项显式修订已冻结领域回包与错误约定；不能由 facade 作者批量改写或增加兼容窗口 |

**【推荐选项的详细执行说明与分析】**

若选 A，建议锁定：

1. **公开接口与纯绑定职责**：

   ```text
   createJsonClient({ fetch, resolveUrl })
     .call(operation, input, { signal }?) -> Promise<JsonOutcome<T>>
   ```

   在 `dsh-interface/client` 开放真实实现；operation 引用唯一作者的 encode/decode/验证规则，encode 明确 path/method/body，decode 只接受该获准目标。fetch 与 URL 解析经 host/平台适配注入，普通页面可传现有 fetch；URL 只能由获准绑定及官方 transport 上下文解析，不让业务输入绕过绑定指定任意地址，不内置私域 base-url、凭证或“没 body 就猜 GET”的规则。缺失必要构造依赖应在构造期拒绝。
2. **JS 结果固定分支，不改 wire**：成功为 `{ok:true,data:T}`；失败为 `{ok:false,error:{kind,message,httpStatus?,domainCode?,domainData?}}`。`kind` 仅为本 JS facade 的 `transport | cancelled | http | protocol | domain` 五值，不是新增服务端业务错误枚举。domainCode 只能来自已批准且识别成功的业务错误；httpStatus 始终表示本次 HTTP 响应状态，不用上游 status 覆盖它；其他获准领域详情放入 domainData。
3. **执行确定的判别顺序**：

   | 情况 | JsonOutcome |
   |---|---|
   | signal 已取消 | cancelled；发出请求前已取消则不调用 fetch，不承诺取消了服务端副作用 |
   | 未取消，但 operation/输入不符绑定或无法按约编码，尚未发出请求 | protocol，不发请求、不伪造业务码 |
   | 其他网络或响应体读取传输失败 | transport；取得过响应头时可保留真实 httpStatus，否则不伪造 |
   | 响应按目标 codec 识别为获准业务失败，包括合法的 HTTP 2xx 业务失败 | domain，保留原业务码和本地 HTTP status |
   | 非 2xx 且不是可识别的获准业务失败 | http，保留 status；不靠错误文本猜业务码 |
   | 2xx 但 JSON/结构/目标输出不合法 | protocol，绝不能包装成 ok:true |
   | 合法成功、合法空值或合法 degraded | ok:true，由目标 codec 确定 data，不按 truthiness 判错 |

   空 body 只有操作合同显式允许时才能成功；不能把 HEAD/204 或空字符串一律解析失败，也不能默认全部空响应成功。响应体只消费一次。
4. **host/client 同一规则、不同权威**：可共享 JSON reader、编码器与结构验证；业务 handler 仍负责授权、动态政策和 canonical writer。成功/失败 encode 与 client decode 承接同一目标，不另抄错误码表。`-12` 的注册/准入不被 client 取代。
5. **不增加隐藏副作用**：公共层不自动 retry、改方法、换 endpoint、轮询、重新提交写操作或发补偿请求；也不自创默认 timeout。取消或未收到响应不表示服务端未执行/已回滚，UI 不得据此自动重放。已有领域特定 retry 仅留在其已批准适配层。
6. **错误跨 bundle 结构识别**：不依赖 instanceof，不吞成空对象/成功；message 是可安全显示的信息，不自动携带原始 headers、凭证、请求/响应体，也不自动记录它们。HTTP 与 carrier 状态明确区分；合法 degraded、restart-required 等领域状态不得改成通用异常或假成功。
7. **真正迁移才算完成**：每个选定闭环的 host encode、client decode、UI 分支及旧 wrapper 一起切换；旧 request/post 不能无限期保留为另一解释源。已冻结的[DNN]/[DNT]注册首批范围不因此扩成全业务改约；JSON 闭环另按 `-8` 结算。
8. **验证具体假成功与状态边界**：复用 Node 夹具，覆盖本地编码/输入拒绝且不发请求、200 非 JSON、200 业务失败、400 领域失败、401 空 body、204/HEAD 的允许/不允许绑定、null/degraded 成功、信号取消、响应体读取中断、写操作传输不确定且不重发，以及 HTTP/carrier status 不覆盖。断言旧 codec 不能在新源失败时兜底；不为此重跑真实业务/全仓多轮测试。

**【推荐选项的支持证据 / 其他选项的反例】**

- **必须消除假成功**：E37 的 fallback 与随后展开直接给出 2xx 非法 JSON 的静态反例；只抽 fetch 不改变这个结果。
- **不能统一成“只要 null 就失败”**：E39 的 policy:null/degraded 有获准读态含义；B 若修改它须明确重开相关决定，不能悄悄包进新 envelope。
- **两个 status 不能挤同一字段**：E38 同时存在本地代理状态与 carrier 原始状态；A 明确分开，既不丢上游语义，也不让 UI 错认本地 HTTP。
- **A 不是永久兼容**：每绑定只有一个获准目标与一份 codec；B 的 wire 一致性有价值，但额外改约必须逐项裁决，而不是由本题批量授权未知字段。

- **问题（请[业主]裁决）**：**是否选择 A，批准上述 client 接口、五类本地失败与目标 codec 判别矩阵，并坚持逐闭环硬切、不新增通用 wire 信封；还是选择 B，先逐项修订相关领域决定再统一所有普通 JSON wire？**
- **业主回答**：**已确认：选 A，同意本题全部推荐及详细执行含义 → 冻结为 `T-O-CF1115-14`。** 来源：[业主] 2026-11-15“同意你在第4轮的全部推荐”；细节见 §1.6 F14.1–F14.8。

### Q9 — MCP 的唯一工具定义如何同时约束目录、真实分发和消费者？

- **题型**：`executional`。
- **驱动真相**：`T-O-CF1115-11`（合同/生成唯一作者）、`T-O-CF1115-12`（HTTP 绑定不等于工具分发）、`T-O-CF1115-13`（MCP 业务仍未销账），以及 `T-O-CF1115-9` / `-10`。
- **来源**：本轮 E40–E42、E48；既有 DNLS01 冻结直接引用，不重新授予 lane、retry 或凭证面。
- **影响范围**：公共 MCP 工具集构造、tools/list 与 handler 映射、输入/输出验证、McpLane 结果/attach 消费及逐提供面互操作。
- **为什么必须确认**：生成目录仍能配一个占位 dispatcher；消费者仍可能把含 id 的失败当成功，或把服务端 v1 广告接成固定 v2。HTTP registrar 无法发现这些业务/协议错误。
- **当前建议 / 倾向**（CF1115 架构 agent）：**A：同一工具定义 + 精确 handler 映射 + 输入/结果 codec，目录和执行共同派生；消费者先分 RPC/工具/协议结果，再按已批准支持面与 attach 声明接入。**
- **Reasoning**：目录是可兑现的承诺，不是独立清单；工具返回、地址和流协议是一个消费链，不能分别“有 schema 就通过”。

**【对本问题的解读】**

本题把既冻“声明不是实现”落实成构造接口和失败边界，不靠增加一个工具计数门禁。公共包不持有 sandbox registry、PTY、CDP keeper 或审计状态；实际能力由所属 host/领域 handler 注入。

它不自动裁决 E48 的每个字段值或两个实现的并集/交集，也不把代码中的工具/版本当批准来源；已有领域冻结可直接承接，真实冲突保持 OPEN。

**【可选选项清单】**

| 选项 | MCP 接线方式 | 收益 | 成本与风险 |
|---|---|---|---|
| **A · 推荐** | **一个工具集构造器消费同一目标定义和完整 handler map**，共同生成目录/验证/执行接线，client 统一解码原生 MCP 结果 | 能预检缺接线或定义不完整，并用真实调用证明 schema/结果符合获准合同，保留协议分层 | 必须补齐实际能力及已批准语义，不能用构造器掩盖未完成；空对象 schema 对真正无参工具可以合法 |
| B | 共用协议 facade/codec 与唯一合同，插件保留定制业务 dispatcher，以穷举接线/集成验证对账，不设统一工具集构造器 | 贴近领域 switch，保留装配灵活性 | 缺分支/误分发的发现更依赖穷举验证；仍不能只核对名字或另写一套公共协议机制 |

只共享目录、继续维护私有 MCP 编解码和消费规则不满足既有冻结方向；B 也必须遵守公共 facade/codec 的唯一作者约束。

**【推荐选项的详细执行说明与分析】**

若选 A，建议锁定：

1. **工具集的执行入口**：

   ```text
   createMcpToolset({ definition, handlers })
     .list() -> Tool[]
     .invoke(name, args, callContext) -> Promise<McpToolResult>
   ```

   definition 引用唯一作者的获准工具名、schema、结果/失败 codec 与公开支持面；handlers 只负责实际领域操作。callContext 由 host 提供现有主体/scope/实例依赖，不变成新 wire 凭证或全局 runtime bus。未知工具等调度错误由相应 RPC adapter 按获准 MCP 版本映射，不伪装成业务成功。
2. **广告与 handler 精确对账**：目标声明缺 handler、多出未知 handler、重复工具名、缺必要 schema/codec 或支持面来源时，目标构造/验证失败，保持该闭环未完成。不通过过滤未实现工具、把占位摘要标成成功或临时把既承诺工具改称可选来求绿；合法平台差异仍须来自获准支持面，不由 handlers 实际剩多少决定。
3. **结构验证真正进入执行链**：输入先按唯一获准 schema 校验后调用 handler，结果亦按该操作获准 codec 验证再发布；required、额外字段、类型、integer 和边界都要兑现。不能手抄一份宽松 validator；宿主授权、实例政策、幂等与状态机仍由相应领域承担，不由 JSON schema 代替。
4. **保持标准错误分层**：JSON-RPC 协议/调度错误与 MCP 工具执行失败分别处理，后者保留 isError/content/structuredContent 的获准语义；参数错误按所选 MCP 版本及获准绑定映射，不全部变成 HTTP 500 或普通 JSON domain。notifications、id、initialize 与协议版本仍走适用 RPC adapter，不因工具集统一而私改协议。
5. **消费者使用独立 MCP 解码，不借 Q8 待答模型**：在真实 client 消费时提供 `decodeMcpReply(reply,binding)`：成功为 `{ok:true,value}`；失败为 `{ok:false,layer,error}`，layer 为本 JS facade 的 `rpc | tool | protocol` 三值，分别保留原 RPC error、原 isError 工具结果、结构不合法说明。先检查错误/矛盾回包和 isError，再验证、提取结果；不得仅看到 structuredContent.id 就 attach。调用前完成该 binding 要求的初始化/发现与所需支持面核验，tools/list 的名字/schema 不能冒充完整语义版本认证；缺少必要承诺证据时明确不兼容/未完成，不发明协议版本字段来补空。传输/取消仍由实际 transport 表达，不把它们伪造为 MCP 回包。
6. **attach 严格兑现服务器声明**：仅按已批准且匹配 attach.protocol 的数据面 adapter 接入，无匹配则明确拒绝，不固定发 open.v=2。完整 attach.url 不被猜路径/擅加业务 query；相对 URL 按官方 transport 上下文解析。既有 ws/wss scheme 保留，http→ws、https→wss 仅在获准 binding 允许时转换，**不得 wss→ws 降级**；不引入私有 base-url、专有 lane 或新凭证。
7. **目录、分发、真实消费一起切换**：OpenRPC/工具目录可作为只读派生物保留，旧手写同义 catalogue/switch 退役；未完成的[DNLS]业务仍需接到真正 L1/领域服务，不能把目前诊断回答迁进共享包即销账。外部 child MCP 只治理本仓拥有的公开绑定/适配，不把外部 runtime 纳入本仓私有总线。改变参数/结果/错误或版本先复核原决定，不能默认采用代码现状。
8. **逐提供面验证、证明错误不能越层**：用可观测 handler 断言广告=分发、合法/非法输入、真实调用、副作用边界与结果校验；覆盖 rpc-error、isError 即使带 id、缺 attach、未知 protocol、ws/wss/允许的 http(s) 解析及禁止 scheme 降级。复用已有工具名集合断言但补调用/结果证据；控制面通过不代替真实 WS/关闭/恢复验证。公共层不自动重试工具调用，现有获准领域 retry 不被扩大。

**【推荐选项的支持证据 / 其他选项的反例】**

- **目录全、名字对仍可能没有业务**：E40 的 args 未传递且统一摘要回答，是只共享 catalogue 的直接反例。已有 `dsh-nano-local-sandbox/test/mcp-tools.spike.test.mjs:14-25` 只对名字集合与 diagnostics 样例负责，不能证明全部工具。
- **B 有可用起点，但需更完整的接线证明**：E41 一边从 OpenRPC 派生目录、一边维护 switch，保留了正确的错误分层，却没有因此证明完整 input/output 校验。B 应共用唯一 codec 并穷举接线，不能把现状 switch 未经验证地直接认定为合规。
- **客户端不是无关的下一层**：E42 中 id 判定、固定 v2 与 URL 改写在真实 McpLane 代码路径上；A 明确约束结果和数据面，不宣称本轮已联网复现。
- **不能把生成器变成改约权威**：E48 的 source/lane/边界必须回到既冻领域合同；本题不选某一份现状“全对”，也不批准并集或最低交集。
- **本题不是发布总闸**：失败的是尚未就绪的目标工具集/闭环，不是授权停发无关插件；`-8` / `-13` 的分阶段和不加门禁继续有效。

- **问题（请[业主]裁决）**：**是否选择 A，按上述工具集构造、真实验证/分发、原生 MCP 结果解码与 attach 声明接入完成共同机制，并保持具体冲突待裁决；还是选择 B，共用唯一协议 facade/codec，但保留插件级定制 dispatcher 并以穷举接线验证证明覆盖？**
- **业主回答**：**已确认：选 A，同意本题全部推荐及详细执行含义 → 冻结为 `T-O-CF1115-15`。** 来源：同一[业主]裁决；细节见 §1.6 F15.1–F15.8。

### Q10 — [DNEE]→[DNN]导入怎样从 window 对象硬切为最小公开服务？

- **题型**：`executional`。
- **驱动真相**：`T-O-CF1115-11`（合同/host/client 环境分层）、`T-O-CF1115-13`（首批之外的非 HTTP 债仍须覆盖），以及 `T-O-CF1115-7` / `-9` / `-10` 的公开能力、生命周期与合法缺席原则。
- **来源**：本轮 E43–E46；不依赖 Q8/Q9 尚未批准的结果模型。
- **影响范围**：nanoNotepad 导入合同、[DNN]面板控制器/生命周期、[DNEE]右键菜单、包内 fx 自调用与原全局入口退役。
- **为什么必须确认**：把整个 __nanoNotepad 对象搬进共享包或 Cordis 会顺手把 DB/fx/调试能力批准成公共 API；只改外部一处又会留下包内依赖和过期全局句柄。需要明确最小面及退役方式。
- **当前建议 / 倾向**（CF1115 架构 agent）：**A：通过标准 Cordis 可选服务 `nanoNotepad` 只公开导入能力，包内 controller 保持私有；生产者、消费者及所有旧 global 自调用成对硬切，彻底退役 window 别名。**
- **Reasoning**：仓内 nanoTerminal 已证明无需强装依赖或私有总线即可发布可选能力；新公共面只暴露真实跨包需求，不把实现细节带成未来平台债。

**【对本问题的解读】**

本题决定一个具体非 HTTP 闭环，不把全部局部 UI 方法登记成公共合同，也不改变[DNN]草稿/版本/工作区的 canonical 归属。它不批准 host Provider 或原生 session 的新替代协议；其他非 HTTP 边界仍按各自获准合同处理。

新服务与 nanoTerminal 是并列的公开能力，不互相 import 私有 lib、不改成必需 inject；合法缺席意味着不提供该菜单动作，不是悄悄回调旧 window 或假装完成导入。

**【可选选项清单】**

| 选项 | 公开面与退役方式 | 优点 | 代价与风险 |
|---|---|---|---|
| **A · 推荐** | **nanoNotepad 最小导入服务 + 私有 controller**；旧 global 及内部引用同步迁走，无别名 | 缩小公开面，生命周期由标准服务和 UI 所有者管理，保持插件独立 | 必须处理异步 DB 就绪、卸载/重挂载及全部包内引用，不能只改[DNEE] |
| B | 将现有 window 对象整体规范化为正式浏览器 API，再为所有方法逐项冻结并约束 | 外部与当前内部调用改动少 | 会把 settings/cloud/fx/数据句柄等大量实现细节纳入公共承诺；必须先全部审定，不能原样搬过去就算安全 |

继续保留 window 兼容转发、DOM 私有事件总线或插件间私有 import 不作为第三路线。

**【推荐选项的详细执行说明与分析】**

若选 A，建议锁定：

1. **公开服务及签名**：惰性读取 `ctx.get('nanoNotepad')`，存在时其 `import(name, content, meta?) -> Promise<{id:string,name:string}>`。name/content 为字符串，meta 只含可选 sourcePath 字符串；非字符串或额外 meta 字段在写入前拒绝。不引出 DB、workspace store、fx corpus 或 node 可变对象。sourcePath 仅为来源元数据，不授予读取/覆盖原文件的权力，不按 POSIX 假设改写合法的 Windows 来源路径。
2. **现行导入语义明确承接**：导入当前活动工作区的草稿，不由 sourcePath 隐式切换工作区；空名称按现行 note/文件名规则规范化。同名未 pinned 的文件按既有规则替换，并在需要时提交原稿版本；pinned/文件夹冲突仍生成合法新名。成功后沿既有 openFile/render 路径打开并显示草稿。content 可为空，不把导入改成写源文件或云同步命令，不新增幂等键/自动 retry 法则。
3. **最小回执与失败**：成功只返回 id/name 的值拷贝；不得把整个 node 作为可写公开状态。失败拒绝 Promise，并提供可安全显示的 message 字符串，不要求消费者依赖 instanceof、解析文本或新的业务错误枚举；不把失败当成功回执，也不保证错误意味着此前存储完全无副作用。调用方不得自动重放导入。
4. **controller 与 ctx 分层**：mountNotepad 持包内 controller/DB/原有操作；外层 client index 以 ctx.provide 发布最小投影并管理 disposer，合同声明归口但状态仍归[DNN]。不把 Cordis/host 大对象灌进纯 contracts 或面板内部，不在共享包保存另一份草稿/操作队列。
5. **就绪与卸载语义**：DB/控制器就绪后才发布可调用服务；现有 `ready(mounted)` 只表示面板挂载，不能当作 DB 就绪，需经包内就绪信号确认。缺席/未就绪不伪装可用，初始化失败不注册“永远排队”的成功服务。卸载撤销注册，晚到的 ready 不得重新发布；过期句柄在开始新写入前拒绝。已开始的存储操作按所属事务完成或失败，不承诺 dispose 回滚它，也不重新提交。
6. **真实消费者惰性读取**：[DNEE]经 ctx.get 判断能力，文件读取后、导入前重新确认可用，不把服务句柄缓存为长期权威；缺席则不提供该动作，调用中失效则明确显示失败。原有 nanoTerminal 缺席回原生行为不改，不为两插件新增强制依赖、专用通道或硬编路径。
7. **旧对象彻底退役，但不先破坏包内功能**：先将 panel 中现有 fx/导入等自调用迁到同一私有 controller，调试能力按真实需要留在包内或隔离测试夹具，不默认升级成公共 API；再成对切换新服务并移除 window.__nanoNotepad 及别名/转发。当前说明/活跃测试同步，历史审计快照不篡改；不另存一套可写恢复状态。
8. **验证闭环而非菜单快照**：覆盖未安装/未就绪/初始化失败、非法类型/额外字段拒绝且不写入、就绪后导入并打开草稿、卸载与 ready 竞态、过期句柄、同名替换/版本/pinned/文件夹冲突、空内容、来源元数据（含 Windows 路径）与源文件不变、返回值不暴露 node/DB；并回归包内 fx 路径不再借 global。真实 service 提供/发现/撤销与实际导入都要有证据，不能只断言全局名消失。

**【推荐选项的支持证据 / 其他选项的反例】**

- **有标准接入正例**：E43 已用 ctx.provide/get 与 scope 生命周期完成 nanoTerminal 可选发现；A 不是新私有总线。
- **所需公共面远小于当前对象**：E44 的跨插件调用只导入，而对象还公开多种诊断/数据操作。B 是实际扩约，不能默认为零成本整理。
- **仅替换 window 为 ctx.get 不够**：E45 中 ctx 不在 mountNotepad 参数里，DB 异步初始化且 UI 可卸载；必须由真正生命周期所有者装配。
- **不能先删 global 再补内部**：E46 展示包内 fx/导入仍依赖它；A 要迁完整个引用闭环，保留原存储语义而不是留下兼容别名。
- **不把已知搜索范围当全世界**：实现时仍须对新增引用和活跃测试/说明做残留核查；本题不宣称外部消费者已全部验证或替它们批准兼容窗口。

- **问题（请[业主]裁决）**：**是否选择 A，批准 nanoNotepad 的最小服务、回执与生命周期边界，连同[DNEE]消费和包内 controller 一次性退役旧 global；还是选择 B，先把现有整个浏览器对象逐项审定为正式公共 API？**
- **业主回答**：**已确认：选 A，同意本题全部推荐及详细执行含义 → 冻结为 `T-O-CF1115-16`。** 来源：同一[业主]裁决；细节见 §1.6 F16.1–F16.8。

### 6.3 ★ 中场评估 IV（Round 4 → 后续轮）`[核心·锁死]`

**本轮总结已完成。** 先形成前三项判定，再做新调查；下列驱动链于调查后追加。

- **判定**：三题均选 A，无本轮路线残留。普通 JSON 统一的是 JS Outcome 与唯一目标 codec；MCP 统一的是工具定义/分发/验证与原生解码；native import 公开最小服务并退役 global，不把协议或权威混成一个 universal facade。
- **已锁定真相**：新增 `-14` 至 `-16` 及二十四条细节，累计十六条；公共 factory、局部失败标签、attach约束和导入生命周期已有可执行目标，不再作为开放基础问题重问。
- **诚实反方制衡**：共享 codec 仍可能包装现有漂移为合法目标，MCP factory 仍可能只迁目录不接业务，最小服务仍可能遗漏包内/卸载引用。必须沿获准语义与真实调用逐面验证，不能借生成器或测试反推新字段/错误/支持面；不把本轮冻结误作所有业务已实现。
- **为何注入第5轮（新调查后追加）**：E49–E60 显示，已冻 factory 仍需唯一可执行输入，host/native 仍需类型与真实所有者，逐包检查清单仍不能证明全八包闭环。由 `-14` / `-15` / `-16` 驱动 Q11 的操作/绑定/提供面记录，`-15` / `-16` 驱动 Q12 的官方 host 适配与生命周期，三条与 `-8` / `-13` 共同驱动 Q13 的阶段、覆盖和退役交接。已有领域决定直接继承，不把具体目标冲突偷换成工程细节。§7.2 根据新调查追加收口判断，不静默改写 §7.1 的先前判断。

### 6.4 Round 5 —— executional：唯一作者怎样交给全插件实施（`Q11–Q13`）

> **状态**：`frozen`（本次[业主]同意全部推荐）。本轮锁定可执行作者输入、非 HTTP 适配方式及全八包迁移交接，不重新讨论是否归口，也不冒充已锁定所有业务参数。Q11–Q13原题条件句保留，均由选A回答兑现为 `-17` 至 `-19`。

#### 6.4.0 第四轮冻结、总结之后的新调查

本轮读取作者代码、生成器、发布/检查清单及现行领域决定；未运行 host、容器、浏览器、业务接口或构建测试。另按 INTRODUCTION 的版本纪律参照本机已安装 host 类型，未把 context 源码或本机某版本当成全部支持版本的证明。以下引用均落在本仓，描述静态关系而非实测产品结果。

| # | 精确证据 | 本轮确认的关系及不能推出的结论 |
|---|---|---|
| E49 | `scripts/gen-route-sensitivity.mjs:22-55` | 旧台账按 path 索引，生成器会为缺审字段放 REVIEW/false；这不能直接成为新绑定身份或获准安全值。当前未据此宣称已发生跨插件 path 冲突 |
| E50 | `security/feature-contract.json:1-26`；`dsh-nano-model-selector/scripts/build-client.mjs:18-32` | responseShape 是文字，build 又读台账烤表；未来必须让真实 codec/已审字段单向派生，而非把文字快照当可执行 schema |
| E51 | `dsh-nano-terminal/schema/dnt-mcp.openrpc.json:1-17`、`dsh-nano-terminal/schema/dnt-mcp.openrpc.json:126-139`；`dsh-nano-terminal/src/host/mcp.js:18-30`、`dsh-nano-terminal/src/host/mcp.js:127-139` | OpenRPC 格式版本、info.version、MCP 协议日期是不同概念；read.source 实际进入 screenText。文中 only-grows 声明不能覆盖本册硬切原则，已有字段也不能由生成器自动批准 |
| E52 | `dsh-nano-local-sandbox/src/host/terminal-driver.js:15-54`；`dsh-nano-local-sandbox/profiles/terminal/pty-entry.mjs:1-2`；`dsh-nano-terminal/src/host/sessions.js:112-159`；`docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md:64-64` | 严格八工具/幂等/attach 已有领域决定；两行 PTY 入口不是服务；DNT create 现为 randomUUID。共享记录和同名工具本身不能解决具体支持面及重复调用语义 |
| E53 | `dsh-nano-model-selector-compaction/lib/host-compaction.js:25-39`；`dsh-nano-model-selector-compaction/lib/host-services.js:1-29`；`docs/specs/dsh-nano-model-selector/qna/DNMS01-qna.md:94-96` | vendored class identity 与 HostService 模拟确有代码；已批准例外须按 DNMS01 精确范围继承，不能将所有现有 fallback 一揽子视为获准，也不能一律删除 |
| E54 | `dsh-nano-model-selector-compaction/index.js:1-9`；`dsh-nano-model-selector-compaction/lib/host-compaction.js:85-99`；`dsh-nano-model-selector-compaction/scripts/gen-mutex-patch.mjs:3-23`；`INTRODUCTION.md:34-34` | isolate Provider 与上游 preset 是实际依赖；官方类型/目标版本需明确。不能为统一要求所有领域注入 agents，或以超前 context 代表所有安装版 |
| E55 | `dsh-nano-cloud-session/index.js:187-237`；`dsh-nano-cloud-session/AGENTS.md:88-97` | bridge 按 remote id 复用，捕获 profile，提供 followup/steer 与空 cancel/whenIdle；注册失败可只警告后继续。原生 Chat 是包内公开体验，不能为“统一”暗中删掉，也不能将现状自动认证为完整 host 实现 |
| E56 | `dsh-nano-cloud-session/index.js:153-185`、`dsh-nano-cloud-session/index.js:223-237`、`dsh-nano-cloud-session/index.js:359-362` | 定时回调 await 后仍能 append；cleanup 清 timer/detach，但未等待在途 Promise。注释称不持久化不是持久化验证；本轮不据此判定第二 canonical 或已复现卸载故障 |
| E57 | `dsh-nano-explorer-extra/src/host/routes.js:63-90` | scopeOf 有冷会话/政策与合法跨工作区采用行为；sessionBinding 元数据不能被统一层擅改为“只许当前会话”的新授权规则 |
| E58 | `dsh-nano-local-sandbox/index.js:6-19`；`dsh-nano-local-sandbox/src/host/routes.js:346-359` | 生产 apply/routeSpecs 持共享 session 对象；对应实例化/政策目标须按既冻领域决定接入，不能用新 schema 或 sessionBinding:true 代替运行接线 |
| E59 | `scripts/check-clean-lib.mjs:28-47`；`scripts/test-all.mjs:25-68`；`AGENTS.md:23-32` | 静态包列表与自动发现并存，活跃八包中还有 host-only；不能要求每包都有路由/UI，或拿自动发现 test script 证明所有业务都有覆盖 |
| E60 | `dsh-nano-notepad/src/host/s3-sync.js:379-410`；`dsh-nano-notepad/src/host/fx-bridge.js:183-212`；`docs/code-review/26-nov/contract-and-facade-1115-eval.md:495-510` | 同路由有 action/别名，另有标准 SSE；作者记录必须表达 operation 与绑定而非压成 route。一份统一包不自动清偿报告逐包/横向债务 |

### Q11 — 四种已冻 facade 应消费哪种最小可执行合同记录？

- **题型**：`executional`。
- **驱动真相**：`T-O-CF1115-14` / `T-O-CF1115-15` / `T-O-CF1115-16` 的真实输入要求，以及 `T-O-CF1115-9` / `-10` / `-11` / `-12`。
- **来源**：E49–E52、E57、E60。
- **影响范围**：contracts 作者模块、各 factory 的输入投影、操作分发、支持面声明、生成台账和可追溯产物。
- **为什么必须确认**：已锁定工厂签名不等于锁定其数据模型。若继续让 route 表、OpenRPC、错误表和服务签名各做作者，fixed source 仍只是目录；若造万能 IDL，又会把业务/host 实现拉进公共包。
- **当前建议 / 倾向**（CF1115 架构 agent）：**A：采用普通 ESM 的最小 FamilyDefinition，分别记录操作、绑定、提供面和批准来源；各 facade 消费同源投影视图，不做通用 IDL 或 runtime registry。**
- **Reasoning**：必须能表达多操作共用 HTTP 路由和多提供差异，但不需要新语言、新业务状态机或跨插件运行时。

**【对本问题的解读】**

本题决定首版作者记录和引用方式，而不是由 agent 填完全部业务值。记录用于让 Q6/Q8/Q9/Q10 的实际接口引用同一个定义；未裁决的字段、别名、版本或幂等仍保持 OPEN，不能在新对象中默认为合法。

规范来源、可执行 schema/codec、运行时业务权威仍为不同对象。一个 authorityRefs 字符串存在，不证明它授权了其旁边所有字段。

**【可选选项清单】**

| 选项 | 作者与消费方式 | 收益 | 代价 |
|---|---|---|---|
| **A · 推荐** | **最小 ESM 记录 + 直接 schema/codec 引用 + 按环境投影** | 能复用真实实现，操作/绑定/支持面显式关联，避免一组手工总表 | 需做一次字段归属迁移及各 facade 视图接线；不会自动解决目标值冲突 |
| B | 在唯一归口包内分协议手写 HTTP/MCP/native 作者模块，只共享语义 schema 与引用检查，不设共同 FamilyDefinition | 原有模块结构改动较小 | 多处关联需靠穷举验证；不得复制同一字段或另造互相解释的语义定义 |

**【推荐选项的详细执行说明与分析】**

若选 A，建议锁定：

1. **最小作者结构**（以下是待批准的数据形状，不是已存在的运行接口）：

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

   input/output/failures 引用唯一作者的纯 schema，或同进程官方 typed API 的类型入口；semanticsRef 指向获准副作用、作用域、幂等/取消/生命周期定义，不复制实现算法。wire/文件/模型等边界必须有对应真实验证 codec；不为同进程 typed API 复制整个 host 对象 schema。
2. **身份明确、版本不混用**：操作、绑定和提供面分别以 contractId 加各自 id 唯一定位；不拿 path 或工具名充当全仓语义身份，也不从插件名推同约。constraintsRef 引用已批准支持约束；不把 npm 版本、OpenRPC 格式版本、MCP 协议日期或 schema hash 自动当语义兼容版本。本题不新增 wire version 字段或服务发现通道。
3. **绑定保留协议差异与多路分发**：web 的 transport 原样承接 Q6 已冻 channel/match/准入字段；MCP/native 分别承接获准工具或服务描述。多操作绑定须有显式 dispatch：selector 来源、合法 wire 值到 operationId 的映射，以及既有未知值拒绝规则；不能把缺字段默认成任意第一个操作。codecs 按操作/绑定引用，不能按插件身份另写同义规则。
4. **factory 消费投影视图，不另抄定义**：从所选 provider/binding 派生 web table、Q8 带 encode/decode 的 operation、Q9 definition 和 Q10 最小服务声明；Q8 的 operation 不是不含协议绑定的抽象操作。所有视图保留稳定关联和来源，仍由原 host/client/领域 handler 执行，不生成一个 universal executor。
5. **字段一次迁作者、旧台账降为投影**：按闭环迁移已审安全字段、结构、错误和分发映射；原 route/feature/OpenRPC 可保留派生输出，但不能反向成为第二作者。REVIEW、缺来源或旧生成器自动补的 false 都不能被当成新获准值；原本明确获准的 false 则正常继承。批准来源缺失的目标保持未就绪，不扫描源码猜授权。
6. **纯 contracts 与 host/build 分离**：记录及可移植 codec 不读取 repo/DSH_HOME、不捕获 ctx/凭证/DB、不包含 Node 或 DOM 业务初始化。host 适配仍在其出口/领域，build 才处理文件与投影物化。schema/type 引用不赋予 runtime 解析 host 裸包的保证；沿用已冻离仓打包纪律。
7. **不建立新版本兼容机器**：每个已切换提供面只交付一份获准目标，不并集参数、不最低交集缩权、不提供旧作者回退。新约、冲突及兼容窗口仍需[业主]决定；无改约的 helper 私有函数名、文件拆分和具体投影实现属于工程细节，不再逐一设审批。
8. **验证记录真正驱动消费**：覆盖多 operation 共路由、同名 tool 不自动同约、跨族同 suffix 不串绑定、未知 dispatch 值拒绝、缺批准字段不能物化，以及 client/host/build 的 import 隔离；从真实 factory 和离仓产物读到相同目标引用。只验证“引用存在”不等于验证其批准含义，仍按原题的领域与互操作证据销账。

**【推荐选项的支持证据 / 其他选项的反例】**

- E49/E50 给出旧生成链的具体输入形态；不能把索引、REVIEW 默认值或 responseShape 文字直接升级成目标定义。
- E60 的 config/action 说明一条路由需要多个操作；仅改成 keyed route registry 的 B 实现必须额外完整表达该关系。
- E51 有三个不同版本概念，E52 又有真实 create/幂等差异；A 显式引用支持约束，但不凭版本字符串或生成成功认证同约。
- E57 说明元数据不是授权政策。A/B 都不能为了统一偷偷修改合法跨工作区行为；A 的字段归属与语义引用能把这一责任留在正确位置。

- **问题（请[业主]裁决）**：**是否选择 A，批准上述最小记录、身份/引用与 factory 投影规则，并保持具体业务冲突 OPEN；还是选择 B，在同一归口包内维持协议作者模块、以明确引用和穷举验证证明无语义重复？**
- **业主回答**：[业主]已确认：选 A，同意第5轮全部推荐；本题记录形状、全部推荐细节与验证边界一并冻结为 `T-O-CF1115-17`，详见§1.7 F17.1–F17.8。

### Q12 — 非 HTTP 适配直接承接官方 host 契约，还是另设插件私有 port？

- **题型**：`executional`。
- **驱动真相**：`T-O-CF1115-15` / `T-O-CF1115-16` 的主体、真实生命周期与最小能力要求，以及 `T-O-CF1115-7` / `-9` / `-10` / `-11`。
- **来源**：E53–E56；INTRODUCTION 的版本纪律；既有 DNMS01 授权范围。
- **影响范围**：[DNMSC]Provider/seam/overlay、[DNCS]native bridge、[DNEE]官方 native 资源调用及共享 host 适配代码的职责。
- **为什么必须确认**：将所有 ctx 方法包装成统一 facade 容易造出影子 host；只声明“调用官方方法”也不能证明类型、身份、完成条件与卸载对等。需要决定适配层的真实契约与所有者。
- **当前建议 / 倾向**（CF1115 架构 agent）：**A：直接承接官方公开 host 契约与明确获准例外，领域插件持有 adapter/controller；共享包仅有必要的纯声明/无业务状态机制，不建立第二套 host API。**
- **Reasoning**：本仓服务对象是官方[dsh]；新增一套 port 只有在当前真实消费者确需时才有净收益。现有 native 体验必须真实兑现，不能模拟几个同名方法就算完成，也不能擅自删去求绿。

**【对本问题的解读】**

这里的“直接承接”不是把 host 对象暴露给别的插件，也不是把完整 Provider 移进共享包。它决定可依赖什么官方接口、谁持有资源以及如何验证 adapter，而不替 host 决定新的 session/event/agent 语义。

例如，不能仅因 AgentRegistry 有 create/resume 就把远端会话接成新的本地推理 loop；也不能仅因 enter 接受一个对象，就认定所有 native 操作、取消与持久化均已支持。

**【可选选项清单】**

| 选项 | 适配结构 | 收益 | 成本与约束 |
|---|---|---|---|
| **A · 推荐** | **领域内薄 adapter 直接依官方公开类型/方法，实例归插件 scope**，公共包只承接必要纯定义/机制 | 不额外维护影子 host，直接验证真实依赖、身份和生命周期 | 需用目标版本的正式 host 装配验证，不能拿部分对象 mock 代替 |
| B | 每领域先设私有窄 port，再写官方 host adapter；port 不成为对外公共 API | 可隔离局部算法和单元夹具 | 多维护一层类型/语义；同样必须真实 host 验证，不能借 port 兼容私域拓扑或伪造能力 |

**【推荐选项的详细执行说明与分析】**

若选 A，建议锁定：

1. **依赖与职责**：官方服务定义/公开类型属于 host；Provider 和 adapter 的业务实现/资源归相应插件，公共包不复制 Agent/Session/Service runtime、不造共享 registry 或可写业务 store。未改变的官方字段只引用，不翻译成另一套公共 host DTO。
2. **版本与既有例外逐项承接**：对声明支持的 host/平台核验公开 API、解析条件与真实装配，context 仅是研究线索；本机类型不是整个 engines 范围的证明。DNMS01 已准 vendoring/overlay/class-identity 降级按原决定继承，**不**因此批准全部现有 fallback、复制 Cordis 内部或扩大支持窗口；也不借本题撤销已批准部分。不兼容就保持该目标未完成，需改支持承诺时回[业主]。
3. **实例化与发布由真实所有者承担**：[DNMSC]继续 isolate Provider 与既准互斥 overlay，不为统一强加 agents 注入或第二 Provider；[DNCS]桥与[DNN]controller 分别归各自 scope。先取得必要依赖并完成初始化/注册，再对外报告就绪；失败撤销已取得局部资源，不以警告后成功或永久排队掩盖。不擅自用本地 agent factory 替换远端执行权威。
4. **host 原生义务不被 JS codec 覆盖**：官方要求的 branded identity、注册/持久化/错误类型与完成条件仍遵守其实际契约。Q8/Q9 的结构化客户端失败不授权改写 host 内部 class 检查；native session 消息是否仅内存、是否可恢复须用真实路径证明，不能由注释判安全或直接判为第二 canonical。新增事件、恢复 payload 或错误码先裁决，不复制远端执行权威。
5. **[DNCS]桥身份和配置归属明确**：以 carrier、凭证 profile 的稳定身份、remote session identity 共同限定桥，不仅按 remote id 复用；不以 token、label 或硬编 base-url 当身份。当前配置仍由既有 profile store 权威读取；改配置/删 profile 时停止旧桥新接入并清理其 scope，不能无限使用捕获的旧凭证。运行期失效标记可留内存，不新增 durable 凭证/会话副本，也不顺手 terminate/archive 远端。
6. **先停接入，再处理在途，最后释放依赖**：定时器停止不等于 await 中的任务已结束；所有者须跟踪在途工作，取消可取消任务并等待结算。迟到的后台刷新不得在失效 scope 新写投影；已接受用户操作须在必要服务/完成观察者仍可用时结算，未知远端结果明确报告，不假称回滚或自动重发。不能只靠注册有 disposer、倒序释放或注入顺序推定异步清理安全。
7. **真实义务不足时不伪造完成**：cancel/whenIdle、远端流状态、恢复等若不能证明已满足公开目标，保持该合同族 OPEN，带回需裁决的具体差异；不默认 no-op 合法，不把 terminate 当普通 cancel，也不直接删 native Chat 求绿。该约束不是给所有领域加新失败码、重试或统一取消协议。
8. **通过真实入口验证**：检查官方类型/声明合并及实际 consumer，验证 Provider ON/OFF/isolate、native 首次/重复打开、多 profile 同 remote id、配置失效、初始化/注册失败，以及卸载/替换期间在途任务。用可控 Promise 屏障暂停最终依赖使用，确认 dispose 未提前完成/依赖仍在，再释放并断言最终值、可见失败与资源清理；不以 call 次数、clearInterval 或 idle happy path 代替。此处为待批准验收设计，本轮未执行或宣称 P0 运行复现。

**【推荐选项的支持证据 / 其他选项的反例】**

- E53 的 class identity、已有 vendoring 裁决和实际 HostService 模拟不是同一件事；A 逐项承接权威，不把一项例外扩大成通用 runtime 兼容层。
- E54 中实际缺席 agents 注入有 isolate 原因；把 ctx 的所有依赖拉进公共 host factory 会改变正确装配。
- E55/E56 给出可追踪的 native_open→异步拉取/注册→轮询→cleanup 链。静态代码没有提供对在途 Promise 的等待保证；它是要验证/实现的具体责任，不是本轮在线故障结论。
- B 的内部 port 可以合法用于测试隔离，但不能替代官方约束，也不能把部分 fake 对象当真实完成证据。当前一个官方 host 目标下，A 少维护一套映射。

- **问题（请[业主]裁决）**：**是否选择 A，按上述官方契约、实例所有权、桥身份及异步结算规则实现薄适配，不足之处保持 OPEN；还是选择 B，增加领域私有 port，但仍按同等官方约束与真实入口验收？**
- **业主回答**：[业主]已确认：选 A，同意第5轮全部推荐；本题官方host适配、身份/配置失效及异步结算的全部推荐一并冻结为 `T-O-CF1115-18`，详见§1.7 F18.1–F18.8。

### Q13 — 首批之后，八包如何分阶段迁移、退役旧源并结清账单？

- **题型**：`executional`。
- **驱动真相**：`T-O-CF1115-14` / `T-O-CF1115-15` / `T-O-CF1115-16`，以及 `T-O-CF1115-8` / `-11` / `-12` / `-13`。
- **来源**：E49/E50、E57–E60；评估报告逐包观察与 CROSS-01 至 CROSS-04；已冻首批范围。
- **影响范围**：全插件实施交接、合同族排程、真实消费者与打包验证、旧作者/旧入口退役、逐项债务结算。
- **为什么必须确认**：现在只锁定首批[DNN]/[DNT]web 注册；其余若继续“等下一批”，全插件目标可能停在公共 package 或 pilot。反之要求全仓大爆炸会破坏独立交付、增加发布仪式。
- **当前建议 / 倾向**（CF1115 架构 agent）：**A：固定依赖驱动的阶段与八包覆盖责任，仍按合同族成对硬切、带证据退役/销账；阶段不是全仓 release-gate。**
- **Reasoning**：全覆盖与小步交付可以同时成立：覆盖矩阵防漏，合同族闭环防假完成，独立发布不被无关项绑架。

**【对本问题的解读】**

本题锁定首批以后的执行路径，不改写 Q7，也不声称所有目标业务值已经批准。未决公共合同必须在相应切换之前裁定；排进阶段不等于批准它的字段，实施计划也不是第二份[业主]回答台账。

下列是待批准的主推进顺序与覆盖责任。真实依赖满足的独立闭环可并行；不能把阶段数字变成“所有包全绿才许发”的总闸。

**【可选选项清单】**

| 选项 | 组织方式 | 优点 | 风险与约束 |
|---|---|---|---|
| **A · 推荐** | **预先锁全八包覆盖和依赖阶段，逐合同族切换/销账** | 不丢全目标，也不要求一次性重写；共享机制和真正消费同步迁 | 需维护来源/证据/旧源退役关联，不能只有包名状态 |
| B | 不固定后续阶段，每完成一族再从完整余额中选下一族 | 对新事实最灵活，仍可独立交付 | 容易长期挑简单项；全八包余额和原完成标准仍不可省略，不得擅自 defer |

**【推荐选项的详细执行说明与分析】**

若选 A，建议锁定：

1. **固定阶段及依赖，而非发布总闸**：

   | 阶段 | 主交付范围 | 开始切换的前提 |
   |---|---|---|
   | P0 · 已冻首批，原样继承 | 公共包/构建/guard唯一源及[DNN]/[DNT]真实web注册、准入、释放与产物 | 按 `-11` 至 `-13`，不冒领业务/MCP |
   | P1 · 普通JSON与浏览器公开能力 | [DNEE]/[DNMS]普通JSON、[DNN]非S3/fx/pipeline的基础文件JSON与最小导入、[DNEE]相关消费者；复用已批准领域政策 | 每个选定目标 codec/语义明确，按 `-14` / `-16` 成对接线 |
   | P2 · 沙箱与终端真实互操作 | [DNLS] HTTP/MCP/CDP/terminal、[DNK]真实消费与旧资产退役、[DNT]MCP/attach/WS/SSE/审计消费 | 已冻领域义务接到真实生产路径；具体支持面/工具参数/幂等冲突先裁定，不能以stub或缩目录通过 |
   | P3 · 剩余领域/标准协议/host适配 | [DNCS]carrier与native、[DNMSC]Provider及主包共享合同、[DNEE]官方native资源调用、[DNN]fx/S3/自定义RPC/标准流与资源例外 | 适用官方/领域合同可指认；未解决新约先回QNA，不伪造协议或复制host |
   | P4 · 全范围结算 | 八包及横向四项观察的覆盖/证据/旧源/离仓产物对账 | 所有适用合同族有完成证据或[业主]明确批准的其他处置，不由 agent 自行缩范围 |

2. **八包必须都有责任落点**：

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

3. **计划记录只指向真相与事实**：下游为每族关联 Q/T-O、producer/consumer、操作/绑定、目标来源、构建产物、验证证据、旧源退役点和 E1115 债务观察；状态区分待裁决/待迁移/已接线/已验证/已退役销账，不把“已定义”当“已完成”。不复制[业主]答复或另立决定真源，不将此工程记录用于 runtime 恢复。
4. **台账与发现去重**：参与包/绑定/能力由获准作者与实际 package 元数据单向投影，现有扫描器继续发现异常/旁路，不能反过来授权合同。同步现有检查维度和漏包，不新增一份手工 required-plugin 列表；host-only、无UI、零HTTP等合法类型显式适用，不强行补假路由/空client。
5. **每族一次真实成对硬切**：迁作者、实现、消费者、生成表、测试/当前说明与发布物一起改；在对等验证和旧源退役前保持该族未完成，不生产双写、旧parser兜底或兼容alias。标准MCP/OpenAI流/WS/SSE/下载/资源保留自己的协议证明，不因进入公共包而改成JSON。
6. **分层、窄范围验证**：先相关输入/失败与副作用夹具，再真实装配/消费与离仓发布物；跨包链覆盖两个端点和合法平台差异。现有gate只覆盖其声明维度；按已冻政策复用并补断言，不新增全局release-gate、重复全仓循环或要求真实远端写操作来验每次文档/构建。真实环境验证只在明确授权的测试环境执行。
7. **结账看义务，不看文件数量**：只有公共机制上线、适用字段/行为兑现、真实消费者通过、旧可写作者/旧入口退役且产物可独立交付，才可结相应观察；一项观察横跨多族则保留未完部分。安全授权/错误/重试等新约未定时不销账，也不把实现中发现的新债静默塞进已完成项。
8. **QNA收口与交付分开**：本题批准的是阶段与交接，不是本次开工、部署或全部业务合同已经锁定。未决项逐项保留并触发必要QNA，只有[业主]可明确defer；已锁目标下的文件布局/fixture命名等普通工程细节直接执行，不为机械细节强开轮次。完整评估继续以原报告观察项追溯，不另造新账单替换历史。

**【推荐选项的支持证据 / 其他选项的反例】**

- E59 证明“发现了package test”与“全部活跃形态已覆盖”不同。A/B 都不能以当前检查绿代替真实合同族，A 提前锁定不漏 host-only 和[DNCS]。
- E58 显示实例目标与实际生产接线仍需贯通；把所有声明先搬包再宣布完成，会遗漏真正业务状态所有者。
- E60 的 action 与标准流必须分开核验，E57 的授权语义不能顺带加严；A 的分族与阶段不授权统一改写它们。
- 评估报告 CROSS-01 至 CROSS-04 解释了新增helper为何不够；B 并非错误，但需要持续证明复杂边界没有永远留在余额里。A 在保持独立交付前提下减少这一组织风险。

- **问题（请[业主]裁决）**：**是否选择 A，批准上述P0–P4依赖阶段、八包责任与逐族硬切/验证/退役结账方式；还是选择 B，每族完成后再选下一族，但继续保留同等全覆盖、无擅自defer与完成标准？**
- **业主回答**：[业主]已确认：选 A，同意第5轮全部推荐；本题P0–P4、八包责任表及全部推荐细节一并冻结为 `T-O-CF1115-19`，详见§1.7 F19.1–F19.8。

### 6.5 ★ 中场评估 V（Round 5 → Round 6，历史时点）`[核心·锁死]`

> **时点注记**：本节是第5轮冻结后的中场评估；其要求的末轮已由 §6.6–§6.8 完成，原文保留为渐进链证据，不构成当前未决。

**本轮总结已完成，末轮问题须在之后新调查后生成。**

- **6.5.1 判定**：Q11–Q13均选A，唯一作者记录、直接官方host适配及八包分期责任已锁，不再以B路线并行实现；G1与G4的路线选择已解，实施证据仍待工程提供。
- **6.5.2 新增真相**：`-17`至`-19`与§1.7二十四条细节；原记录形状、支持引用和阶段/覆盖表均保留完整约束，不只有摘要。
- **6.5.3 诚实反方**：FamilyDefinition不能替代公共参数/幂等目标，正式类型不能认证fake native行为，阶段表不证明真实PTY/业务已接通。不能通过缩目录、无期限defer或将剩余公共值交给实现者来“完成第6轮”。
- **6.5.4 末轮范围约束**：[业主]要求第6轮完成收口。先针对§7.2的G2/G3重新检索，并清点全八包余额；末轮须给三组完整可裁决选择和余额归属，已有明确决定直接继承，不重开基础题，不把本指令当作新推荐的批准。冻结后才交接P0–P4实施，不要求本次完成代码/测试。

### 6.6 Round 6 —— 剩余业务目标与最终收口（`Q14–Q16`）

> **状态**：`frozen`。[业主]已同意本轮全部推荐，Q14–Q16均选A，分别冻结为 `T-O-CF1115-20` 至 `-22` 及§1.8二十四条细节。本轮按§7.3结束本campaign，不留计划内第7轮；实施未完成不被写成真相未决。

#### 6.6.0 第五轮冻结、总结之后的新调查

**调查范围**：重新核对terminal十九工具作者、生产create/read与通用McpLane、DNLS既冻八工具和二十工具、生产host路由与容器bridge、DNN两处独立别名及只读RPC、DNCS原生桥/消费者/carrier，以及DNMSC官方Service解析。核对了当前本机安装包的公开Agent类型，但没有调用远端、运行容器或复现业务故障。

| 证据 | 精确位置 | 本轮确认的事实；不自动成为目标 |
|---|---|---|
| E61 | `dsh-nano-terminal/schema/dnt-mcp.openrpc.json:1-42`；`dsh-nano-terminal/src/host/mcp.js:54-66` | schema宣称三种create lane，生产只实现local；OpenRPC的only-grows文字不是不能硬切的既冻决定 |
| E62 | `dsh-nano-terminal/src/host/sessions.js:112-162`；`docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md:726-731` | DNT每次分配UUID，sessionId用于owner/cwd；DNLS领域决定要求按sessionId幂等。把二者当同一可替换create会改变多终端体验 |
| E63 | `dsh-nano-local-sandbox/src/host/terminal-driver.js:15-54`；`dsh-nano-terminal/schema/dnt-mcp.openrpc.json:127-140`；`dsh-nano-terminal/src/host/mcp.js:127-139` | DNLS严格八工具不含read.source；DNT真实支持visible/recent/detection。共同字段可共享，不应取schema并集 |
| E64 | `dsh-nano-terminal/src/client/lanes.js:176-249` | 消费者只看structuredContent.id；重写session参数与scheme，wss会落入改成ws的分支；发送v2 open后直接转发收到的二进制。本轮是静态路径确认，不宣称已在线复现 |
| E65 | `dsh-nano-terminal/schema/dnt-mcp.openrpc.json:20-42`、`dsh-nano-terminal/schema/dnt-mcp.openrpc.json:189-299`；`dsh-nano-terminal/src/host/mcp.js:54-66`；`dsh-nano-terminal/src/host/sessions.js:112-162`；`dsh-nano-terminal/AGENTS.md:124-124` | create广告template/task但这条创建链未消费两字段；另有真正的template.list/run。其余本地扩展不能因DNLS只有八工具就统删；WS v2及其标识已有公开说明，需修正MCP attach广告 |
| E66 | `docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md:548-554`；`dsh-nano-local-sandbox/src/host/mcp-sandbox.js:2-38`；`dsh-nano-local-sandbox/src/host/routes.js:514-529` | 二十个名字已获准，但目前统一空schema/诊断摘要，生产调用还忽略arguments；不能把这份实现直接纳为业务目标 |
| E67 | `dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:163-264`、`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:291-359`、`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:513-518` | bridge另有十五个自有sandbox工具，含host二十名之外的snapshot/control，并与真实child目录合并；console/operations/network已有可核对的参数与界限 |
| E68 | `dsh-nano-local-sandbox/src/host/profile-registry.js:12-35`、`dsh-nano-local-sandbox/src/host/profile-registry.js:89-105`；`dsh-nano-local-sandbox/src/host/instance-registry.js:21-69`；`dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml:1-15` | profile与instance已有独立所有者，ensure按profile/session比政策指纹；目录返回不应泄露配方命令、mount source或调用方秘密，也不能采信当前猜出来的端点 |
| E69 | `dsh-nano-notepad/src/host/s3-sync.js:330-358`、`dsh-nano-notepad/src/host/s3-sync.js:379-410`；`dsh-nano-notepad/src/client/sync.js:394-394` | /s3/config的probe/testOne确为两action委托同一函数；生产同步消费者使用probe |
| E70 | `dsh-nano-notepad/src/host/pipeline.js:179-238` | 另有/rpc的manifest.get/lsrag.manifest别名；这才是自定义RPC，不是MCP。读失败被吞成null、denied被包进ok:true也需要目标约束 |
| E71 | `dsh-nano-cloud-session/index.js:153-237`；`dsh-nano-cloud-session/src/client/index.js:85-99`；`dsh-nano-cloud-session/AGENTS.md:88-97` | native是公开体验；fake对象有空cancel/whenIdle，steer委托普通postMessage，且每条消息合成完整turn。删除或缩小该体验都必须明示裁决 |
| E72 | `dsh-nano-cloud-session/src/host/devin-api.js:119-120`、`dsh-nano-cloud-session/src/host/devin-api.js:169-191`；`dsh-nano-cloud-session/index.js:80-93` | 已实现消息分页、普通发送及sleep/terminate，不存在专门的远端逐轮cancel/steer调用；terminate不是硬删除。现有work还把上游5xx统一映射502，不能拿来表示所有本地native失败 |
| E73 | `INTRODUCTION.md:34-34`；`context/deepseek-harness/packages/core/agent/src/runtime-types.ts:190-261`；`context/deepseek-harness/packages/core/session/src/index.ts:1136-1142` | 官方Agent含完整inbox/model/status/scope及取消/静止义务；Session持久化还受生命周期写入者影响。context只是代码参考，不能认证所有安装版本 |
| E74 | `dsh-nano-model-selector-compaction/lib/host-services.js:1-29`、`dsh-nano-model-selector-compaction/lib/host-services.js:65-99`、`dsh-nano-model-selector-compaction/lib/host-services.js:123-125`；`docs/specs/dsh-nano-model-selector/qna/DNMS01-qna.md:94-96` | Service模拟/反射fallback确实存在；R-16批准vendor compaction并接受特定instanceof降级，未一揽子批准这个影子Service |
| E75 | `dsh-nano-cloud-session/index.js:187-237`、`dsh-nano-cloud-session/index.js:359-362`；`dsh-nano-cloud-session/src/host/devin-api.js:42-76` | 旧桥捕获profile、remote键复用、分页只读首批；timer清理不等于在途结算，上游请求只接超时signal。取消传播、历史补全和卸载仍需实现证据 |
| E76 | `AGENTS.md:23-42`；`scripts/test-all.mjs:25-68`；`security/feature-contract.json:1-26` | 八包范围及不得扩约/过度门禁仍生效；台账和test发现不能证明八包全部协议已销账 |

**安装版补证（不随插件分发，不替代仓内证据）**：本轮实际读取 `/Users/seanz/.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-agent/lib/types/runtime-types.d.ts:164-227`，核对到cancel、whole-agent whenIdle、followup/steer声明；`/Users/seanz/.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-agent/lib/types/index.d.ts:333-336` 的enter要求完整Agent及owner。此检查只覆盖该安装包，不据此声称其整个版本区间支持某种新native Provider。

**R-7 · 事实用语纠正（追加，不改已冻内容）**：§7.2历史G2-b将probe/testOne统称“自定义RPC”不精确。E69与E70确认这是两个边界、两组别名：`/s3/config`的action与`/rpc`的method。末轮分开裁定，不把同函数委托误当作已经批准退役某名。本条不是冻结记录；第6轮冻结见§1.1 R-8。

### Q14 — terminal同名工具如何锁定提供面、幂等与attach目标？（**驱动真相：`T-O-CF1115-17`、`T-O-CF1115-19`，继承`-10`、`-15`**）

- **影响范围**：[DNT]本地十九工具、[DNLS]八工具、通用McpLane及真实PTY/WS消费；不改变各自host资源所有权。
- **为什么必须确认**：唯一记录不能替两种create选择同一语义，也不能把当前v1声明/v2消费错配称作互操作成功。
- **当前建议 / 倾向**：**A：两个显式语义提供面，同源维护共享字段，保留真实本地能力；固定客户端最小交集和准确WS版本。**
- **Reasoning**：sessionId在DNT是拥有者上下文，在DNLS还是复用键。二者可共享编码与消费子集，不等于同一个create操作可透明替换；不得用“统一”抹掉一会话多终端。
- **问题（请[业主]裁决）**：是否批准下面两提供面的完整目标矩阵、schema修订、create/retry及attach版本，成对硬切现有声明和消费者？
- **业主回答**：[业主]已确认：选 A，同意本轮全部推荐；本题两提供面矩阵、schema/幂等/attach/验证的全部推荐一并冻结为 `T-O-CF1115-20`，详见§1.8 F20.1–F20.8。

**【对本问题的解读】**

本题把`-17`要求的operation/provider约束填实，而非重开归口方向。DNLS01的`T-O-17`继续约束DNLS terminal-driver的八工具和幂等；**本题申请明确批准DNT本地提供面的不同create语义，不把该领域决定外推成“DNT每个dsh会话只能有一个终端”**。create等确有语义差异的operation分别标识；相同语义操作共享定义，由显式supports约束提供面，不复写作者。通用客户端不引入插件名判断、私有端点或新lane。

**【可选选项清单】**

| 选项 | 完整路线 | 代价 / 判断 |
|---|---|---|
| **A** | 两个显式语义提供面＋真实能力白名单＋通用最小调用＋准确v1/v2消费 | **推荐**；保留DNT多终端与扩展，不假装同名即同约；需补两端真实互操作 |
| B | 两端全部压成DNLS八工具和按sessionId唯一create | 会删除DNT本地任务/父子/模板等能力并改变多终端；不是无损抽取 |
| C | schema取并集，create/WS维持现状交给消费者猜 | 继续广告不能实现的字段，幂等与输入通道不确定，不可作为统一目标 |

**【推荐选项的详细执行说明析】**

1. **提供面及输入目标**。八工具指create/list/input/read/resize/close、audit、lane.status。下表是申请批准的目标，不是把实现自动认证成真相：

   | 项目 | DNLS terminal提供面 | DNT local提供面 |
   |---|---|---|
   | 工具支持 | 严格八工具 | 当前十九工具；其余十一为send、keys、interrupt、wait、session.keep/label/note、events、template.list/run、skill |
   | create允许字段 | lane、sessionId、shell、cols、rows、title；不加cwd/source等隐式扩展 | 左列加name、parent、keep、labels、args、cwd；**删除未兑现的template/task字段**，模板仍用template.list/run显式执行 |
   | create lane | 缺省或`local`表示“所选提供端的本地PTY”；在DNLS内部仍由获准实例提供 | 同一字段只允许`local`；不再广告`mcp/isolate`。客户端连接方式`local/mcp`与该后端字段不是一个枚举 |
   | create sessionId | 优先使用经授权的明确sessionId或正式调用上下文；二者都没有则拒绝，不用term-1共享默认；按该作用域复用同一活动PTY，关闭后可重建；配置冲突沿既冻政策拒绝 | 保留owning dsh session语义；每次明确create可建新终端，**不保证重复create返回同id**，不增加幂等键 |
   | read | id必填，lines默认50、整数1..500；不接source | 同左，另接source=`visible/recent/detection`，默认visible |
   | resize/audit | cols/rows整数2..512，create缺省为80×24；audit.lines默认50、整数1..500 | 共享相同边界，不在validator外截断非法输入冒充合法 |
   | 其他输入/结果 | 已冻八工具语义，create成功必须有id和attach；其余输出由同一明确八工具定义消费 | 将基线OpenRPC十九methods的params/result及十三errorKinds作为本题明确批准的目标，**以本表与下述修订优先**；不是承接序言only-grows口号 |

2. **schema及结果完整边界**：DNT上项引用固定为本册代码基线`f7199f9`的`dnt-mcp.openrpc.json` methods，不授权迁移者再挑字段。所有参数对象拒绝额外字段；已有required保留，create无sessionId仍可显式本地创建，禁止以其缺省值冒充DNLS复用身份。DNT create结果要求id/addr/lane/title/attach；attach要求protocol/url。DNLS的八工具成功structuredContent明确为：create的`{ok:true,id,attach}`、list的`{sessions:[{id,lane:"local",title?}]}`、input/resize的`{ok:true}`、read的`{id,text,complete}`、close的`{closed:boolean}`、audit的`{log:JSONRecord[]}`、lane.status的`{lanes:{local:{status:string,detail?:string}}}`；id/text为string，title若有为string，其他布尔不做字符串强转。input确认接纳不代表程序完成；合法重复close可返回closed=false，不以此掩盖越权。两端read.complete=true均须有该端真实的当前交互完成/退出依据，未知状态不得因“不等于working”默认true，消费者也不得仅据它推断写入已提交。其余DNT已声明结果字段和可选性保留，不吞生产额外数据来伪造schema通过；未声明、确有公开消费者的字段依`-19`成对纳入同族公开定义，不扩展业务。`x-address`改成可执行string schema并保留其id/name/addr含义，不新增地址语法。删除template/task只撤未实现广告，不撤真正的模板工具；其余十一工具的参数、默认值、返回与事件语义保持基线明确声明，不自动给DNLS增加它们。
3. **幂等与重连**：DNLS按已有决定对同作用域并发create单飞、同实例返回同id；DNT创建是有副作用的新建。McpLane统一只提交`{sessionId,cols,rows}`的最小create及`{id}`的close；业务要求超出目标支持面时明确拒绝，不静默删参。**任何提供面都不因timeout、丢响应或attach失败自动再发create/input/send**。已得到id只重新attach该id；未得到id的未知创建结果可见报告，不宣称回滚。McpLane自动transport重连统一为DNLS既冻“至多一次”，明确替换E64现有递归退避，不是一次次失败后重置预算；建立新调用需明确动作。连接重建不重放业务写入，不顺带改LocalLane自己的监督合同。
4. **attach协议目标**：DNLS仍为获准`dnt-ws-v1`；DNT的MCP提供面明确广告已公开的`dnt-ws-v2`，与它的门控/通道帧相符——**此处是MCP attach声明修订，须本题批准才切换，不由生成器自行发明wire版本字段或发现通道**。两端都返回完整的实际`ws/wss` URL及已有必要session参数；不猜prefix、不覆盖query、不降级wss，不新建凭证面或跨域转发宿主token。客户端依据精确protocol选择v1原始字节或v2通道帧编解码，核验ready协商值；v2的human/agent/auto通道不得混用。未知协议或版本不符即失败，不能仅凭有id/收到字节宣称成功。
5. **能力/错误边界**：声明、校验、dispatch和codec都由同一提供面投影；DNT十三kind与DNLS已冻领域目录分别有所有者，不并成全仓万能错误表；MCP协议错误/工具失败依`-15`分层。没有额外capability发现通道，以现有工具目录与attach声明验证所需操作；这不把工具名当身份或授权。audit只返回所属提供面获准的审计视图，不复制DNLS实例审计到另一durable作者。
6. **验证与退役**：用同一通用McpLane分别消费真实两端，验证DNLS并发幂等、DNT同会话多个不同id、非法字段/边界、source只在DNT、失败含id不能当成功、v1/v2输入输出门控、wss/query不变、断连最多一次且不重跑写入。PTY真实启动/关闭/资源归属仍按`-19`在P2完成；同步删除错误lane广告、未兑现create字段、旧URL改写和协议猜测。**不是把两行PTY helper标成已完成服务。**

**【推荐选项支持证据或其他选项的反例】**

- E61–E63表明同名create/read不等价，B会改变已有真实多终端能力；基线十九methods有精确参数与结果可供本题逐项批准。
- E64具体展示URL被重写和v2帧未按通道解释的路径；仅修id判定仍不够。
- E65支持撤未实现create广告、保留真实模板工具；E62的领域裁决直接继承，不从代码另造DNLS幂等政策。

### Q15 — sandbox二十工具与剩余自有业务wire，怎样选定唯一可执行目标？（**驱动真相：`T-O-CF1115-17`、`T-O-CF1115-19`，继承`-14`、`-15`**）

- **影响范围**：[DNLS] host MCP、CDP profile bridge、[DNK]消费与技能、[DNN] S3配置/自定义RPC，以及P1–P3自有普通JSON业务族。
- **为什么必须确认**：同源生成不能决定二十工具实际调什么，也不能替[业主]选择别名或判定null/denied的业务含义。
- **当前建议 / 倾向**：**A：二十工具在host兑现明确输入/业务结果；bridge只做获准CDP驱动；选定唯一业务名与无猜测codec。**
- **Reasoning**：需要消除“返回诊断摘要就是实现所有工具”的伪闭环；保留既准能力，但不把十五与二十目录取并集。
- **问题（请[业主]裁决）**：是否批准下方二十工具输入/结果及作用域矩阵、bridge退役范围、两组别名目标和其余自有JSON的精确承接规则？
- **业主回答**：[业主]已确认：选 A，同意本轮全部推荐；本题二十工具目标、bridge/HTTP退役边界、两组别名及剩余JSON承接的全部推荐一并冻结为 `T-O-CF1115-21`，详见§1.8 F21.1–F21.8。

**【对本问题的解读】**

由`-17`与`-19`承接真实业务，而不是再增一个“稍后填schema”的任务。下面是**新申请批准的业务目标**：既有二十名直接继承，尚缺的参数/返回在本题裁定；诊断负载允许扩展但不充当控制协议，生命周期操作必须强类型。标准MCP外层不改，HTTP不被强制改成此处的工具业务结果。

**【可选选项清单】**

| 选项 | 路线 | 代价 / 判断 |
|---|---|---|
| **A** | host二十工具真实业务＋明确类型/作用域＋bridge仅标准CDP驱动＋业务别名硬切 | **推荐**；需要生产接线与逐工具验证，但不留第二作者或未知目标 |
| B | 将bridge十五工具升为真源，删掉host尚未实现的能力 | 丢弃已批准的profile/instance治理面；旧host快照倒挂仍在 |
| C | 保留二十空schema与两套目录/别名，先统一外壳 | 继续假成功、双作者和猜测解析，不能作为完成标准 |

**【推荐选项的详细执行说明析】**

1. **唯一生产拓扑**：host按DNLS01已准二十名兑现，另按领域支持面公开terminal工具；bridge仅保留真实agent-browser的标准CDP profile驱动，不再自行广告十五个sandbox工具或维护宿主诊断推送副本。child工具目录由真实获准驱动声明派生，不硬写“永远33个”或无条件透传未知新增特权。snapshot/control等既有HTTP能力继续保留并接同一领域所有者；**不因bridge曾广告而扩成第二十二工具清单**。旧DNK宿主/bridge作者及别名按既冻决定彻底退役。
2. **精确输入与业务目标**。S为非空string，N为integer；所有输入均为object且`additionalProperties:false`，`?`为可选，未标者必填。profileId/instanceId/sessionId不能互换；实例调用按既准host政策/调用主体授权，参数本身不产生权限，不增加“只许当前会话”等新规则。

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

3. **结果类型不是空位**：这些MCP工具的成功`structuredContent`统一为`{ok:true,data:T}`，T由上表确定，MCP的content/isError/JSON-RPC外层依`-15`；错误不塞进成功data。`PublicProfile`只含id/version/platform/scope/capabilities，类型沿已准profile manifest；列出已登记元数据不等于认证配方可构建。`PublicInstance`只含instanceId/profileId/profileVersion/sessionId/phase/policyFingerprint/endpoints；类型及phase/端点含义沿DNLS01已冻实例合同，shared实例sessionId可为null，端点必须来自实际注册/发布而非端口游标猜测。
4. **诊断结果和失败的界线**：`Snapshot={available:boolean,observedAt:string|null,value:JSONValue|null}`；尚无该项真实观测才用`false/null/null`。有观测时available=true并带真实ISO观测时间，value是该工具所述的可扩展、只读诊断JSON，不是供客户端猜测控制分支的第二协议；entries等诊断行同为公开JSON记录，total/dropped/failed及counts各项为非负整数。保持公开HTTP相应数据含义与脱敏；沿E67已广告的界限，history至多最新30条、DOM至多4000字符、elements至多40节点，其余仍受已准领域界限，不借工具新增无限日志或全量秘密快照。**授权/政策失败、读取异常、业务执行失败不是“未观测成功”**；走所属目录及isError。真实观测到engine不健康，可以作为成功诊断数据报告，不等于start成功。
5. **同一领域服务，多绑定**：表中操作由profile/instance/state/CDP等现有所有者兑现，HTTP与MCP投影同一操作，不在MCP中self-fetch宿主HTTP或再造可写registry。状态写完成/未知按其领域承诺结算；ensure的并发/指纹沿已有决定，restart不自动重跑，transport重连不等于重发控制操作。不改已准政策、现有error目录和凭证面；输入/未知工具按`-15`协议层拒绝，工具执行错误用该领域获准码，不能让stub的unknown字段代替目录。
6. **两组不同边界的别名目标**：`/s3/config`只保留action=`probe`，删除`testOne`；`/rpc`只保留method=`manifest.get`，删除`lsrag.manifest`，其他三个只读method为corpus.list/corpus.read/claim.read。这是本题明确请求批准的取舍，不是因同函数就自动允许删除。保留probe的不激活/不切canonical语义，保留manifest.get读取已发布清单的语义；生产消费者、发布SDK/fx资产、技能、测试和说明同步切，不留旧名分派分支。
7. **剩余JSON目标承接范围**：四个只读RPC method的参数/数据形状以基线pipelineRpcHandler对应分支为目标；null只表示**已确认不存在**，不能由权限/网络/解析失败伪造；corpus.read/claim.read的denied须按唯一operation codec识别为失败，不能当正常data。其余自有JSON族保留各自**公开生产入口与真实消费者已经使用的业务字段/操作**，按`-14`唯一codec与显式selector逐项转写；既有领域规范优先，标准资源/流协议仍独立。这明确批准“保留业务、纠正已定成败/派生机制”的迁移，不批准所有当前代码缺陷或随机内部字段，也不允许新业务参数、错误枚举、幂等/retry由实现者决定。下游逐操作对应作者/消费者/既冻来源，不要求每个字段命名再开一轮QNA。
8. **验证与退役**：二十工具逐一用真实domain fixture验证输入、输出schema和对应业务调用，而不只数目录；覆盖两个实例隔离、越权、并发ensure、政策变化、部分观测/真实错误、控制结果未知、非法额外字段、catalog与dispatch同源。验证bridge目录无自造sandbox工具、原HTTP/CDP能力未丢。DNN验证真实probe和manifest消费、旧名明确拒绝、null/denied/读失败区别。原分期不变：沙箱/桥及DNK消费在P2，DNN上述S3/RPC在P3，其余基础JSON在P1；均配对切换，不用多格式parser过渡。更改目录/结果/别名的能力影响需在实施时同步对应包的公开说明，不能只改生成器。

**【推荐选项支持证据或其他选项的反例】**

- E66明确显示空schema、丢arguments与诊断stub，C无法证明任何一条instance业务已接通；E68给出现成所有者，不需要再造状态。
- E67的十五工具还多出snapshot/control；直接取并集就是未经批准扩约。A保留既有HTTP能力而退役第二MCP作者，区别于直接删业务。
- E69有真实probe消费者；E70明确自定义RPC别名、假null与denied问题。A逐边界明确目标，不把自定义RPC擅改成MCP或普通HTTP统一信封。

### Q16 — 原生host适配、显式支持边界与全八包余额如何最终定案？（**驱动真相：`T-O-CF1115-18`、`T-O-CF1115-19`，继承`-8`、`-14`**）

- **影响范围**：[DNCS] native Chat/原生工作台与carrier、[DNMSC]官方Service解析例外，以及本campaign最终交接和收口。
- **为什么必须确认**：真实官方Agent义务不能用空方法填平；此前“不能暗删native”也不等于已经批准一个无法兑现的全功能host代理。
- **当前建议 / 倾向**：**A：真实host能力优先、native改为明确的可选支持面；不满足就显式不可用而非假Agent；精确处置Service例外并完成全账交接。**
- **Reasoning**：这是末轮必须明说的能力取舍，不是把困难延期。保留carrier业务及已有正式native路径，但撤销“任何当前host都无条件拥有完整native Chat”的承诺；该收窄须由[业主]批准，不能由实现偷偷执行。
- **问题（请[业主]裁决）**：是否批准以下native支持范围修订、取消/完成/恢复/错误目标、Service例外处置，以及本轮答复冻结后按§7.3收口并交接P0–P4？
- **业主回答**：[业主]已确认：选 A，同意本轮全部推荐；本题native支持边界、生命周期/错误目标、DNMSC例外处置及全账交接的全部推荐一并冻结为 `T-O-CF1115-22`，详见§1.8 F22.1–F22.8。

**【对本问题的解读】**

`-18`已选择官方host薄adapter，尚未批准空cancel、立即whenIdle或远端terminate替代取消。A明确修订DNCS公开native体验的**支持边界**，而非删除该功能求绿、无期限排队或将其冒记“原能力已完成”。**若[业主]要求所有现有支持host都必须完整native，应选B，而不是让实现者暗中决定。** 这两条都是可在本轮冻结的产品路线，代码/上游交付是否已完成与需求是否已锁定分开。

**【可选选项清单】**

| 选项 | 路线 | 能力与代价 |
|---|---|---|
| **A** | native是正式host能力满足时才可用的提供面；不满足明确失败；carrier管理/获准工作台功能保留 | **推荐**；明确收窄无条件native承诺，不牺牲状态/取消正确性，不需要插件内影子host |
| B | 保持无条件完整native承诺，P3必须先由官方host交付足够的外部会话扩展，再交付插件adapter | 保留最强体验；host是明确前置交付责任，不能用shim绕过；实施可能受上游依赖阻塞，但不是待定真相 |
| C | 保留当前fake Agent、合成turn、cancel/idle no-op及Service模拟 | 看似无功能变化，实际违反官方生命周期/失败/权威边界，不可接受 |

**【推荐选项的详细执行说明析】**

1. **明确支持修订**：native只在**声明支持的host版本/平台内，其公开API能真正满足本表义务**时发布成功入口；以该版本官方类型、公开API和真实装配证据建立支持视图，不凭对象有enter函数或超前context源码判断。缺少必要能力则本地native_open明确`NATIVE_UNAVAILABLE`，UI保留可见的不可用原因及安全下一步；不return伪造localId，不把用户永久排队。**这是本题申请批准的能力收窄，实施须同步DNCS AGENTS/native入口说明；不是宣布所有安装版目前不可用。** 不改engines掩盖问题，不删掉可被正式支持的native实现。
2. **carrier与界面剩余能力**：profile/会话查询、创建、消息、附件、tags/insights、sleep/archive/terminate等已准carrier功能不随native失效；可独立运行的原生设置/管理面继续可用。**依赖local_session_id的原生会话工作台也随native不可用，不能继续承诺其无条件可用**；信息仍通过已准carrier操作可读，不新增私有页面、第二套Chat或内部host跳转协议来补洞。
3. **native必须完整兑现的合同**：

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

4. **完整Agent不是唯一假定扩展点**：可以消费官方已公开且真正提供外部会话/视图语义的接口，但本题不发明一个包内HostService或自建AgentRegistry来假装官方提供。若只能用完整Agent而无法满足上表，A的结果是native不可用；**没有“暂时无此接口，先stub、后续QNA再定”的路线**。B若获选，上表仍为需求目标，官方host缺的能力作为P3正式依赖交付，不在本仓共享包承包host运行时。
5. **本地native失败闭集（本题申请新增批准）**：HTTP仍用DNCS现有`{ok:false,reason,message}`形状，reason取下表稳定标识；真实HTTP状态由本地操作codec决定，不被上游status覆盖。host公开错误传递使用所属官方结构化错误约定，不能只解析message；Q8的JS Outcome保留这些domainCode，不把它们混入carrier既有reason目录。

   | reason / 语义标识 | HTTP | 行为与后果 |
   |---|---|---|
   | NATIVE_UNAVAILABLE | 503 | 正式host/所需能力未满足；不创建假本地会话，carrier操作仍可用 |
   | NATIVE_UNSUPPORTED | 422 | 当前native提供面不支持请求的内容/操作；发送前拒绝，不静默丢字段或降级语义 |
   | NATIVE_PROJECTION_FAILED | 500 | 本地初始化/注册/投影义务失败；撤未发布局部资源，已发远端操作不能称已回滚 |
   | NATIVE_OUTCOME_UNKNOWN | 502 | 已提交的native送信等写入结果无法确认；明确可能已生效，不自动重发，提示先查看远端权威状态 |

   上游403/404/429等仍沿获准carrier分类，403不得改404；确认是远端拒绝不伪装成本地未知。这些新标识只在本题获准后进入唯一作者，不能扩成所有插件的新错误信封。
6. **DNMSC例外定案**：精确保留DNMS01 R-16的vendored compaction、四preset patch与已接受instanceof降级；**不将其扩为批准复制Cordis Service/内部反射**。退役`host-services.js`自制FallbackService，按官方公开依赖/合法loader解析使用真实Service，并在真实scope/isolate中验证；无法解析则明确激活失败，不偷偷改bundle ON/OFF、不创建影子服务、不替换为另一个私有host路径。版本约束、能力装配与实际发布物必须兑现，不能只依本机hoist假定支持。
7. **验证与公开能力变更**：P3验证正式支持native的真实入口与不支持时503/可见原因、无伪localId，覆盖同remote异profile、配置变更、分页重建/重复消息、非text拒绝或真实呈现、确认/拒绝/未知发送、取消/idle真实时序、初始化失败和卸载在途barrier。若A在某host上为native不可用，验证这个**新批准的支持边界**，不得冒记原完整native能力通过。DNMSC验证真实Service解析、ON/OFF/四preset/isolate及已准降级。公开breaking变化在实施中更新对应维护文档/升级说明，不在本次另立第二决定台账。
8. **最终交接**：本题批准的host边界与前五轮共为P0–P4输入；Q14/Q15的答案分别填写其自己的业务目标，不被本题自动批准。按§7.3逐行关闭已知owner-gated余额，未实施/未验证的债务继续在原观察号下登记。不得以收口为由宣布测试已过、债务清零或自动defer；新发现的真正公共改约仍按AGENTS走正常[业主]变更登记，不为本次机械实施预设第7轮。

**【推荐选项支持证据或其他选项的反例】**

- E71与包内明确的native公开体验说明，A确实涉及支持承诺收窄，不能当作普通重构偷偷执行；本题把取舍明说，B保留更强承诺但必须承担官方host前置交付。
- E72及安装版补证区分了普通发送/terminate和Agent正式取消/静止义务。**并未证实所有安装版都不可能支持native**，但足以否定C把这些空方法认证为正确。
- E73/E75说明注释、清timer或同步append成功不能证明无持久化副本/已结算；E74与精确R-16范围支持只保留获准例外，不复制整个host运行时。

### 6.7 ★ 第6轮最终冻结（已执行）

2026-11-15，[业主]明确同意第6轮全部推荐，Q14–Q16均选A。三题分别冻结为 `T-O-CF1115-20` 至 `-22`，§1.8登记二十四条细节；Q14两提供面矩阵、Q15二十工具表、Q16义务/错误码表及各题全部推荐正文共同构成规范内容。原题面、选项与Reasoning保留提问时原文，条件句由业主回答兑现，不再是待选。**本轮没有修改推荐、没有新增未登记目标、没有预排第7轮。**

### 6.8 ★ 最终轮总结（Round 6 → 收口）`[核心·锁死]`

- **6.8.1 判定**：Q14–Q16均已决断，terminal两提供面、sandbox二十工具及剩余业务wire、native真实支持边界与DNMSC例外三组剩余目标已锁。十六道题全部回答并冻结，§1累计二十二条真相，未留下需要下一轮才能裁定的公共目标。
- **6.8.2 本轮新增真相**：`-20`锁定DNLS八工具与DNT十九工具的不同create语义、最小McpLane调用及v1/v2 attach；`-21`锁定host二十工具真实输入/结果、bridge只做CDP驱动、probe与manifest.get唯一名及其余JSON承接；`-22`锁定native按正式host能力发布或显式不可用、完整生命周期/错误目标、DNMS01 R-16精确例外及全账交接。
- **6.8.3 诚实反方与剩余风险**：Q16-A确实收窄DNCS native的无条件支持承诺，不能把它说成原完整能力已偿还；若[业主]日后要求所有支持host都完整native，那是新的公共路线选择，须按正常改约登记，不是实现细节。Q14/Q15/Q16的代码、真实PTY、二十工具业务接线、alias退役和运行验证均未在本次执行；§7.4审计只证明文档内部一致，不证明产品行为。原评估的36项逐包观察与4项横向观察仍按原号保留，债务没有因收口清零。
- **6.8.4 为什么不再需要第7轮**：§7.3已把每个已知owner-gated余额映射到既冻真相或本轮三题；剩余工作是P0–P4内的工程落实、验证和销账，不是无人决定的公共语义。新发现的真正公共改约仍按AGENTS走[业主]变更登记，但那是长期治理的常规变更，不是本campaign预留的问答轮。**不为轮数本身制造第7轮，也不把未知实现结果伪装成已批准真相。**
- **6.8.5 交接**：下游实施以§1的`T-O-CF1115-*`为唯一真相引用入口，按§1.7/§1.8及原题完整正文执行；P0–P4阶段、八包责任、验证/退役/销账要求不变。实施计划可补文件、责任人、夹具和证据，但不得另造回答台账、擅改公共目标或以路由/声明数量冒充业务完成。

---

## 7. 收口（全轮冻结）

**已收口（2026-11-15）。**

- **QNA 冻结判据已满足**：十六道题全部回答并冻结，§1登记二十二条真相、一百二十六条细节；没有OPEN残题，也没有未经[业主]批准的defer。§7.3逐项把已知owner-gated余额映射到既冻真相或第6轮三题。
- **与实施完成分开**：QNA全轮冻结不表示代码迁移完成、所有插件已通过测试或所有债务已偿还。实施仍须遵守`T-O-CF1115-8`及后续执行决定，不能拿静态登记或本册冻结代替运行证据。原评估的36项逐包观察与4项横向观察继续按原号保留。
- **交接**：下游统一计划以本文§1的Truth-ID为唯一引用入口，继续用评估报告观察项追溯债务与代码证据；不复制新的owner回答台账，不凭本版宣称已实施。
- **冻结后变更**：本册题号、真相ID和已冻正文append-only；真正的公共改约按AGENTS由[业主]登记并追加修订，不静默改写，也不为常规变更预建第7轮。

### 7.1 第5轮能否收口：第5轮时点判断（历史分析，已被§7.3取代）

> **时点注记**：以下为第5轮提问时的判断，已被§7.3最终收口取代；原文保留为渐进链证据，不构成当前结论或未决项。

**第5轮时点判断：不承诺第5轮完成整个 campaign 的[真相层]冻结，建议为必要时的第6轮保留空间；但不把第6轮定为必走仪式。** 如果第4轮冻结后的新调查证明剩余公共决定已被现有真相覆盖、或能在第5轮完整裁决且不存在依赖后续答案的新冲突，则允许第5轮收口；否则继续 QNA，不能为了五轮结束把公共改约降格为工程细节。

这不是工期预测，也不是宣称已证明“至少需要六轮”；当时证据支持的是**五轮整体收口尚无充分依据**。本次不擅自 defer 任何合同族，不用“基座收口”偷换全插件目标。

#### 7.1.1 为什么还不能只数题数判断

- `-11` 至 `-13` 解决源码/注册/首批验证，**不等于业务目标定义已完整**。E40/E48 中工具的参数、真实操作和多提供差异不会被新 registrar 自动补齐。
- 当时 Q8–Q10 仍是待答推荐；它们的选择会改变后续需要核查的 codec、MCP 执行边界和服务公开范围，不能在答复前预先写完所谓“最后一轮”。
- E39 的合法 degraded、E48 的既冻 terminal schema/attach，以及 E47 的 host-only/native 投影，都有各自权威来源；应先复用既有决定、识别真正冲突，再决定是否需要[业主]改约。不是看到差异就重复开题，也不能按代码自动选答案。

#### 7.1.2 全插件覆盖余额快照

以下只标当时尚需覆盖/对账的类别，不重算报告规模，不表示这些项全都必须新开 QNA；能引用既有冻结且没有新改约的部分直接进入工程落实。

| 活跃包 | 当时已冻覆盖如何落在它身上 | 仍不能用首批或本轮推荐冒领的范围 | 本轮证据 |
|---|---|---|---|
| [DNEE] | 归口/注册规则适用；Q10 当时请求批准真实导入消费闭环 | 普通 JSON 各操作 codec 与 UI、native 资源/终端/导入边界完整对账 | E37、E43、E44 |
| [DNK] | 标准 HTTP 消费和单一合同原则适用 | 与[DNLS]的真实 operation/错误/实例 scope 互操作，不是只改一组常量 | E47；既有 DNLS01 决定 |
| [DNMS] | 归口/生成/JSON facade 约束适用，既有领域真相继续有效 | 策略/开关/媒体各操作的真实 codec，特别是 degraded、状态投影和 sanctioned writer 不被重定义 | E39 |
| [DNMSC] | host-only 也在全插件范围，不要求新增 HTTP | Provider/isolate/event 的获准合同引用与实际接线/测试；不得为统一添加 agents 静态 inject 或复制 host 权威 | E47 |
| [DNN] | 首批 web 绑定闭环已冻；Q10 当时待答 | JSON/流/资源、导入与包内 controller/fx 边界，不是整包已完成 | E44–E46 |
| [DNT] | 首批 exact/prefix/upgrade/build 已冻；Q9 当时待答 | 工具 schema/分发、generic MCP client、attach/WS/生命周期与其他 native 消费的逐面证据 | E41、E42、E48 |
| [DNLS] | 既有 L2/实例/终端决定继续作为源，注册规则适用 | 目录到实际业务、真实 schema/validator、跨主体/实例策略与[DNK]/[DNT]消费闭环，不能用 diagnostics stub 销账 | E40、E48 |
| [DNCS] | 公共生成/JSON/host 权威原则适用 | carrier 与本地 HTTP 状态、native session/agent 投影和生命周期的合同/实现对账，不把 host 对象搬到公共包 | E38、E47 |

#### 7.1.3 未决类型与第5轮收口条件

这是一张缺口登记，不是预排问题；没有为以下条目预设选项、推荐或 Truth-ID。

| 缺口 | 当时缺什么 | 何时仍需[业主]裁决，何时只是工程落实 |
|---|---|---|
| G1 · 本轮三项选择 | 当时 Q8–Q10 的实际答复及完整冻结 | 当时未冻结时不得进入下一轮；若选择 B 等不同路线，应按真实决定重新调查 |
| G2 · 具体目标与支持面 | 对 E39/E48 等现状，逐字段/行为找到已有决定；明确合法差异与真正冲突 | 没有新约且已有决定则直接继承；改 error/参数合法域/幂等/retry/attach 版本等必须裁决，不能让生成器取并集 |
| G3 · 非首批 host/原生边界 | E47 的 Provider 与 native 投影，是否已经被既有 host/领域合同完整覆盖及如何验证 | 完全继承则是接线/测试；若需新增身份映射、取消/生命周期承诺或改变公开能力，则不能当普通重构 |
| G4 · 全仓阶段与债务结算完整性 | 除首批以外的合同族、真实生产消费、作者迁移/旧源退役、验证责任如何覆盖八包，且不漏流/资源/native | 单个函数/测试文件位置是工程细节；改变首批范围、支持承诺、defer 或销账口径必须获准 |

**第5轮可收口的必要条件**：当轮实际提出问题全部答复并冻结；G1–G4 均能指向已有/新增明确决定或经[业主]批准的显式 defer；不存在仍须后续调查才能裁定的公共冲突；全八包的适用边界与执行交接不再有 owner-gated 空白。这里不是要求届时代码/测试全完成，也不是新增 release-gate。

**继续一轮的触发条件**：仍有未裁决公共字段/语义冲突、支持面/版本不明、能力声明与目标业务不能对上、原生边界需新约、阶段遗漏或未经批准的延期。出现任一就继续相应 QNA；若不存在，则不为“预留第6轮”硬造题目。后续问题仍须在前轮冻结、总结和新调查之后才生成。

### 7.2 第四轮冻结后、第5轮提问时的收口复核（历史时点分析，已被§7.3取代）

> **时点注记**：以下为第5轮提问时的复核，其“仍需至少一次补充 QNA”的结论已由第6轮完成；原文保留为渐进链证据，不构成当前未决项。

**按本版三题的实际覆盖，第5轮不能作为整个 campaign 的最终收口轮，仍需至少一次补充 QNA。** Q11–Q13 即使全部接受，也只补齐作者记录、host适配方式和全仓交接；以下业务目标并未被这些结构选择批准。这里不规定第6轮必然最后，也不预排其题目。

| 未决项 | 新调查依据 | 为什么不能标成普通工程细节 |
|---|---|---|
| G1 · 本轮路线 | Q11–Q13 当时待答 | 不能按推荐当作已批准数据结构、host适配与阶段 |
| G2-a · terminal具体支持面 | E51/E52；DNLS01既冻严格八工具/attach/幂等，与DNT现行lane/source/create行为须逐项对账 | 正确继承已有决定的部分直接修；若要把新增参数、不同create语义或新的可选边界认定为同约，就必须明确目标，不能按两份代码取并/交集。旧schema的only-grows口号本身不构成重开硬切原则的理由 |
| G2-b · MCP业务目标与别名 | 既查E40/E48，及本轮E60 | sandbox各工具真实输入/结果与桥角色尚需完整指认获准来源；自定义RPC的probe/testOne不能仅因当前委托同一函数就替[业主]选退役名。已有明确决定则继承，没有依据且要改公共目标则需裁决 |
| G3 · native投影具体承诺/例外 | E53–E56 | 本轮可选定adapter、身份与清理责任，但未决定所有native取消/完成/恢复目标，也未一揽子批准HostService模拟。必须核对真实官方/领域契约，明确哪些已覆盖、哪些需新约；不把注释、no-op或mock当答案 |
| G4 · 全八包实施交接 | Q13与E57–E60 | 本轮可锁阶段/覆盖；是否完成还靠后续实现证据。阶段批准不意味着其中所有业务值已获准，也不授权agent延期复杂族 |

**与 §7.1 的关系**：先前只判断“五轮收口证据不足、预留补充轮”；现在在完成第四轮冻结后的新调查基础上，已能指认本轮结构选择不会自动解决的公共目标，故建议继续补充QNA，而不是重复基础原则或强迫未决内容出现在实现里。

**什么时候可以结束QNA**：后续逐项确认 G2/G3 等真实缺口已由现有决定完整覆盖、或已新增明确裁决、或经[业主]明确处置；所有实际提出问题均答复冻结，实施交接没有owner-gated空白。代码/测试尚未完成不妨碍真相层收口；未知公共语义仍OPEN则妨碍收口。若[业主]在本轮另给足以关闭残题的明确裁决，应依其实际内容归档并重新判断，不为轮数本身多问。

### 7.3 第6轮最终收口对账（已按Q14–Q16冻结完成）

第6轮三题已由[业主]全部选A，分别冻结为`T-O-CF1115-20`至`-22`；本表由提问时的映射转为已闭合映射。§7.1/§7.2保留为历史时点，不再构成当前未决。

| 原余额 | 第6轮的明确处置 / 交接 | 冻结后的状态 |
|---|---|---|
| G1 · 第5轮路线 | Q11–Q13已答A → `-17`至`-19`及二十四条细节 | 已关闭该轮owner-gated路线；实现仍待执行 |
| G2-a · terminal字段/提供面/幂等/WS | Q14已答A → `-20`：两提供面矩阵、完整基线schema与指定修订、重连/写入/attach约束 | 目标已锁，P2实施；不再拿两份代码取并集 |
| G2-b · sandbox真实业务 | Q15已答A → `-21`：二十工具严格输入、业务/结果/作用域、bridge/HTTP能力退役边界 | 目标已锁，P2真实接线；不把stub当完成 |
| G2-b · 自有业务codec/别名 | Q15已答A → `-21`；Q8已冻`-14`：两组别名、四只读RPC、null/denied及其余公开业务形状承接 | P1/P3配对硬切；抽取已批准业务形状与fixture命名不再开基础题 |
| G3 · native/host例外 | Q16已答A → `-22`：明确支持边界修订、全部生命周期/权威/失败目标及Service模拟退役 | 目标已锁，P3实施；A的不可用边界不是原完整能力已偿还 |
| G4 · 全八包阶段/职责/验证/销账 | `-19`原表完整承接；Q14–Q16已分别补terminal/sandbox/native目标 | P0–P4、八包责任与36+4观察继续保留，P4逐项结算 |

**八包余额完整性**：DNEE普通JSON/文件Git与导入→P1及`-14/-16`、官方native资源→P3；DNN web注册→P0、基础JSON/导入→P1、S3/RPC/fx/流/资源→P3及`-21`；DNT web→P0、全部MCP工具/terminal互操作/WS/SSE/审计及公开服务消费→P2及`-20`；DNLS真实二十工具/CDP/PTY及host政策→P2及`-20/-21`；DNK只消费、旧宿主/bridge资产退役→P2及`-21`；DNMS普通JSON→P1、领域/Provider适配→P3；DNMSC isolate/互斥/官方Service及精确例外→P3及`-22`；DNCS carrier/native→P3及`-22`。此处不改Q13原阶段表。标准SSE/WS/OpenAI/下载不改普通JSON信封，host-only包不强造HTTP/UI。最终P4逐一对原评估的**36项逐包观察＋4项横向观察**及1112历史对账附证结算，不另造替代账单或按路由/声明数量销账。

**收口结论**：十六道题全部实际回答并归档冻结；§1二十二条真相、一百二十六条细节均有来源；本表每行能回指既冻Truth-ID，没有无人决定的公共目标；未批准的推荐未进入可执行作者；文档最终总结、状态与下游引用一致。**本轮结束条件已满足。** 若[业主]日后修改路线，按append-only追加修订并重新判断影响，不默设下一轮；本次未先完成全部工程才锁真相。

**收口后执行纪律**：实施仅把已有目标变为代码/测试/派生物，继续保留待迁移、已接线、已验证和已销账的区别。未获运行验证的能力如实登记；新事实若真的要求改变公共目标，走正常[业主]改约并在本册append修订，不假称本轮批准了所有未来新业务。收口不是取消长期变更治理。

### 7.4 冻结前一致性与完整性审计（STEP.1 / STEP.2）

> **状态注记**：本节是最终状态生效前的复核记录；复核完成后，header、§0与§7已置为`已冻结/已收口`，当前状态与本节记录不矛盾。

**审计范围**：本轮先按[业主]答复归档Q14–Q16真相冻结，再执行本审计作为文档状态置为`已冻结`前的最终复核；审计发现按append-only修正，不改写已归档的推荐或业主回答。核对全册题号、业主回答、Truth-ID、细节条款、状态措辞、阶段叙事、交叉引用、证据/链接与文档格式，并检查是否存在“同一决定双状态并存”“真相行引用未定义ID”“同轮推荐被当作已冻事实”等文档内竞态。未运行插件代码、构建、测试、容器或远端调用，因此本审计不证明产品行为。

| 检查项 | 审计结果 | 处置 |
|---|---|---|
| 题号与回答链 | Q1–Q16连续，每题恰有一条业主回答；baseline六条、Round 1–6对应`-7`至`-22`，无断号/重号/提前冻结 | Q14–Q16原未答状态改为选A并指向`-20`至`-22` |
| 真相与细节完整性 | 二十二条真相；F7.1–7.7共7条、F8共8条、F9共7条、F10共8条、F11–13共24条、F14–16共24条、F17–19共24条、F20–22共24条，合计126条 | 新增§1.8二十四条；R-8说明原题矩阵/表与索引共同构成规范 |
| 原题完整性 | Q1–Q13题面及已冻回答未被改写；Q14–Q16只更新业主回答行，原推荐正文、选项、矩阵/表保留 | 通过全文比对复核；不重写历史题面 |
| 状态与叙事 | 发现并修复header、§0表、§0程序边界、§6.6、Q14–Q16回答、§6.7、§7、§7.3中的旧状态词残留 | 统一为`已冻结/已收口`；§7.1/§7.2加历史时点注记，不删原文 |
| 阶段一致性 | Q15原分期P2（sandbox/bridge/DNK）与P3（DNN S3/RPC）、Q16 P3、Q13 P0–P4及八包责任表一致；DNEE P1/P3、DNT/DNLS/DNK P2、DNMS P1/P3、DNMSC/DNCS P3 | 修正§7.3与Q15第8项曾出现的阶段范围模糊表述为P2；不改Q13已冻表 |
| 既有领域合同 | 发现Q15表把`instance.ensure.sessionId`写成必填，与DNLS01 `T-O-12`的`shared` scope可为空不一致 | 按既有`T-O-12`解释为session scope必填、shared可省略并产出null；不新增scope、不改首期kitesurf的session声明 |
| 驱动关系 | `-17`→Q14/Q15，`-18`→Q16，`-19`→Q14–Q16/§7.3，`-20`→P2/§7.3，`-21`→P1–P3/§7.3，`-22`→P3/§7.3；无真相行引用尚未定义的ID | 补齐17–19的后续题元数据；新增20–22行及R-8 |
| 交叉引用 | Q14–Q16→§1.8；§1.8→原题正文；§6.7/§6.8→§7.3/§7.4；R-8→R-7；§7.1/§7.2→§7.3 | 无悬空引用；R-7明确为事实纠正而非冻结记录 |
| 证据/链接/格式 | E1–E76连续；212处`file:line`引用路径与行范围有效；2个相对链接存在；代码围栏成对；无尾随空白；HEAD仍为`f7199f9` | 修正E65的OpenRPC行范围越界为189–299并补WSv2公开说明引用；未改代码 |
| 单一真源 | Q14–Q16原题正文与§1.8索引表达同一决定，未复制第二套业务表；未新增未批准的错误/参数/幂等/retry | 以“原题正文+§1.8索引”共同构成规范，差异按编辑错误append修正 |
| 实施分离 | 本轮只改QNA文档；未构建、未安装、未部署、未提交；仅QNA与评估报告为untracked | 在§7/§6.8明确“冻结不等于债务清零/测试已过” |

**审计结论**：修复后未发现真相之间互相否定、未定义Truth-ID前向引用、同轮未答推荐被写成既冻事实、或同一条款双状态并存。发现的问题是**状态欠更新、历史时点段易误读、Q14–Q16细节尚未入账、阶段措辞一度模糊、Q15与既有DNLS01 scope合同的表述冲突**，均已按上表修复。§7.1/§7.2保留原文并加时点注记，避免用今天的结论改写当时的渐进记录。审计后文档可作为本campaign的冻结真相册；实施债务继续按原观察号追踪。

---

## 8. 使用约束

1. **单一回答来源**：本 campaign 的新裁决归档到本文件的“业主回答”与 §1；下游引用 `Q 编号 + 业主回答 + Truth-ID`。聊天中的明确答复可以据原意归档，agent 的推荐不得冒充答复。本册已于2026-11-15冻结；此后的修订按append-only追加，不另建第二回答册。
2. **冻结后 append-only**：题号稳定续编、不回收；已冻题面和真相不静默改写。推翻、纠偏或范围修订追加记录并标出被修订项。
3. **已有决定不重复发问**：根 AGENTS 与已有领域 QNA 的明确决定直接引用；只有真正冲突或需要改约时提交[业主]，不以“重新统一”为由恢复已退役合同。
4. **每轮一个 focus**：首轮只问真源归口与完成单位。不把包名、目录、函数签名、错误枚举、幂等键、具体测试布局塞入 foundational 题；也不预排后续问题来绕过中场评估。
5. **三种真源不混淆**：规范决定、可执行作者定义、业务 canonical 是不同对象；Q1 已冻结为 `T-O-CF1115-7`，仍不得绕过 `AGENTS.md:40-41` 的状态与改约约束。
6. **证据与裁决分开**：有代码证据不代表已获批准；局部检查绿不代表全协议通过；本轮未运行环境或业务调用，不把静态发现称为已安装环境重现。
7. **不新增仪式门禁**：QNA 是决定登记，不是新增 release-gate。测试须为已定合同提供必要证据，不以测试反推合同或制造反复的全仓验收循环。
8. **后续轮不得偷跑**：严格保留 Truth-Gate、中场评估、已冻真相驱动新问题三件；本模板的未来承接位不是已提出题目，也不授予预设题目的例外。

---

## 修订历史

| 版本 | 日期 | 作者 | 主要变更 |
|---|---|---|---|
| v0.1 | 2026-11-15 | CF1115 架构 agent | 按[业主]明确指令归档并冻结六条 baseline；完成本轮仓内补查；仅提出 Q1/Q2 两道 foundational 问题，均推荐 A、均未冻结；保留后续承接结构，不预设后续题目；不设 second-opinion 槽位 |
| v0.2 | 2026-11-15 | CF1115 架构 agent | 依据[业主]同意第1轮全部推荐，追加冻结 `-7` / `-8` 及全部推荐细节；更新回答与状态，完成中场评估 I；先不预填第二轮问题，待新调查完成后追加 |
| v0.3 | 2026-11-15 | CF1115 架构 agent | 在 v0.2 冻结与总结后完成 E13–E24 新调查，追加 foundational Q3/Q4 及其冻结驱动链；两题均推荐 A、均待答；保留 Q1/Q2 已冻题面与全部推荐细节，不生成执行轮问题 |
| v0.4 | 2026-11-15 | CF1115 架构 agent | 根据[业主]同意第2轮全部推荐，追加冻结 `-9` / `-10` 及十五条细节，完成中场评估 II；登记下一轮三道 executional 的程序要求，先不预填题目，待新调查后追加 |
| v0.5 | 2026-11-15 | CF1115 架构 agent | 在 v0.4 冻结与总结后完成 E25–E36 新调查，追加 executional Q5–Q7，均推荐 A、均未冻结；记录真实 registerUpgrade 与 HTTP kind 的区别、首批范围及证据边界；不生成后续轮问题，不实施代码迁移 |
| v0.6 | 2026-11-15 | CF1115 架构 agent | 依据[业主]同意第3轮全部推荐，追加冻结 `-11` 至 `-13` 及二十四条细节，完成中场评估 III；先不预填第四轮题目，待新调查后生成并评估第5轮收口条件 |
| v0.7 | 2026-11-15 | CF1115 架构 agent | 在 v0.6 冻结/总结后完成 E37–E48 新调查，提出 executional Q8–Q10，均推荐 A、均未冻结；登记全八包余额及第5轮有条件收口/继续轮触发判断，不预设第5轮题面、不自动 defer、不实施迁移 |
| v0.8 | 2026-11-15 | CF1115 架构 agent | 根据[业主]同意第4轮全部推荐，追加冻结 `-14` 至 `-16` 及二十四条细节并完成中场评估 IV；先不预填第五轮题面，待新调查后追加与复核收口判断 |
| v0.9 | 2026-11-15 | CF1115 架构 agent | 新调查E49–E60后提出executional Q11–Q13，均推荐A、未冻结；追加第5轮不能整体收口的具体余额判断，保留前版时点评估；不预设后续题面、不自动defer、不实施迁移 |
| v0.10 | 2026-11-15 | CF1115 架构 agent | 依据[业主]同意第5轮全部推荐，冻结-17至-19及二十四条细节并完成中场总结V；登记第6轮三题收口要求，先调查后提问，不提前冻结或实施 |
| v0.11 | 2026-11-15 | CF1115 架构 agent | E61–E76及安装版公开类型补证后提出最终Q14–Q16，均推荐A、未答未冻；明确terminal双提供面、sandbox二十工具/DNN两组别名及native支持取舍/host例外；新增§7.3完整余额映射，待本轮答复冻结即收口，不预设第7轮、不冒记迁移完成 |
| v0.12 | 2026-11-15 | CF1115 架构 agent | 依据[业主]同意第6轮全部推荐，冻结Q14–Q16为`T-O-CF1115-20`至`-22`及§1.8二十四条细节，完成§6.8最终总结；执行§7.4全册一致性与完整性审计，修复状态残留、历史时点误读、阶段措辞与细节欠登记；将文档状态更新为`已冻结`并按§7.3收口。未实施代码迁移、构建、部署或提交 |
