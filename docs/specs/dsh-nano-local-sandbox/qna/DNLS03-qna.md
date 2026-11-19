# DNLS03 QNA · [DNLS] v1.3 对象与控制权决策册

> **范围（scope）**：按 §1 的阶段基线，锁定 v1.3 合约、接口及消费层升级与适配。本文记录决定，不是实施计划。
> **QNA 位点**：`deep-dive`，先 foundational，再 executional（台账子类型记为 `execution`）。
> **角色配置**：提问 `DNLS03 架构审查`；裁决 `[业主]`。second-opinion 自 Round 1 起 `retired`，不设答复槽。
> **下游消费者**：「DNLS03 计划」§2 引用冻结的 `T-O-*`；全部轮次收口前不输出正式计划。
> **文档状态**：`frozen`；§1 基线、两轮 foundational 及第 3–7 轮 executional 均已冻结。第七轮三项已签收，无 OPEN 残题。原始证据快照 `main@a8d25d1`；第五轮记录的快照为 `main@652e8c8`，第六、七轮取证为 `main@bd4b056`（2026-11-19），下列相对链接指向当前源码。以下是源码与既有测试断言的核查，不是新做的容器实测。

## 0. 分轮状态总览

| 轮次 | 题号区间 | 焦点 | second-opinion | 状态 |
|---|---|---|---|---|
| Round 1 | Q25–Q26 | 控制对象是什么；谁有权把它纳入管理 | `retired` | 已冻结，2/2 已答 |
| Round 2 | Q27–Q28 | 消费者选中哪个环境；重连时接回什么 | `retired` | 已冻结，2/2 已答 |
| Round 3 | Q29–Q31 | 重启后认回对象、请求携带目标、终端重附着 | `retired` | 已冻结，3/3 已答 |
| Round 4 | Q32–Q34 | 写操作的结果、主体的权限、附着后的字节流 | `retired` | 已冻结，3/3 已答 |
| Round 5 | Q35–Q37 | 服务端点、配置换代、历史用量 | `retired` | 已冻结，3/3 已答 |
| Round 6 | Q38–Q40 | 可见对象读模型、公共协议硬切、管理入口 | `retired` | 已冻结，3/3 已答 |
| Round 7（收口轮） | Q41–Q43 | 请求主体、受管寿命、终端交接 | `retired` | 已冻结，3/3 已答（收口） |

题号、Truth-ID 分别承接 [DNLS02 题目总览：14–29](DNLS02-qna.md#L14-L29) 的 `Q24`、`T-O-32`，不重用编号。按 [业主] 指定节奏：foundational 共两轮、每轮两题；之后 executional 每轮三题，直到执行层冻结。此处只列已提出的题；**当轮全部裁决入账 → 中场评估 → 重新检索与推理 → 才能提出下一轮**。

## 1. ★ Truth-Gate 台账（已锁定真值 · NORMATIVE · append-only）

| Truth-ID | 子类型 | 已锁定真相 | 来源（Round / Q） | 驱动了哪些题 | 下游约束 |
|---|---|---|---|---|---|
| `T-O-33` | `foundational` | 本专项名为 `DNLS03`，交付范围是 [DNLS] v1.3 的合约、接口及消费层升级与适配，不是只画一个面板。 | 开轮基线 / [业主] 本次阶段指令首段及阶段命名 | Q25、Q26 | 计划必须同时说明控制方提供什么、消费方如何使用；草案本身不等于逐项授权。 |
| `T-O-34` | `foundational` | Case 2（[DNMS] `/imagine` 沙箱执行）与 Case 4（[DNN] fx、KV/D1 迁库）暂缓；Case 1（[DNT] 长期终端）与 Case 3（Kitesurf 服务上下文中的终端）是本阶段在范围内的案例。 | 开轮基线 / [业主]「同意你对于 case-2 和 case-4 的暂缓判断」；[四案定义：1151–1156](../dsh-nano-local-sandbox-v1.3.md#L1151-L1156) | Q25、Q26 | 不以生图 job、凭证注入、笔记迁库或这两案的页面作本期交付条件；暂缓不是永久否决，也不删除既有能力。 |
| `T-O-35` | `foundational` | 沿用 [业主] 的 J1/J2 判据：[DNLS] 对接由本地控制面掌握生命周期的完整环境；[DNCS] 对接以 session 及其生命周期为主的载体。位置与后端类型本身不决定归属。 | 开轮基线 / [v1.3 §9.0 记录的业主原意：962–967](../dsh-nano-local-sandbox-v1.3.md#L962-L967) | Q25、Q26 | 只锚定原判据；草案作者在 969–973 行提出的排他性补充不是 [业主] 新答复，也没有据此批准远端 provider。 |
| `T-O-36` | `foundational` | **生命周期归可独立寻址的受管 sandbox**。同一 env、同一 profile 可有多个独立启停的 sandbox，身份跨 [dsh] 宿主重启保持；多个 session 可以使用同一 sandbox。session 实例及策略指纹描述使用关系，不是物理环境身份，session 结束不等于销毁环境，pane 切换不改变环境身份。 | Round 1 / Q25，[业主] 同意 A 全部推荐 | Q27、Q28 | 细化 `T-O-27`：page/CDP/history 的共享边界是同一 sandbox，不跨 sandbox。[DNLS] 解析目标，[DNK]/[DNT] 不各建权威映射；容器名、端口或旧 session ID 不作替代身份。经授权接管一个存量对象只登记一次；未定默认寻址、协议字段或新 lane。 |
| `T-O-37` | `foundational` | **控制权来自 [DNLS] 自建或明确授权接管，发现和对账只读**。profile 持有配方；[DNLS] 唯一持有受管身份、归属和对象期望配置或配方引用；backend 是运行态、端口和实际挂载的事实来源。允许期望与实际不符或实际未知，不以派生视图作恢复真源。 | Round 1 / Q26，[业主] 同意 A 全部推荐 | Q27、Q28 | 刷新不启停、不重建、不迁卷；接管不授予重建或搬卷许可。不按名称认领相邻 env、未知归属或探测失败的对象，也不将失联对象改绑同名替代物。纳管不等于请求授权：动作仍校验宿主主体与对象范围；列表不授予 attach/stop/delete，不复制 attach 凭证。未定角色枚举、凭证形状、台账介质或路由。 |
| `T-O-38` | `foundational` | **已有对象上的读与动作都绑定调用者明确选定的目标**（对象引用或已明确绑定的上下文）。可一次选择、多次使用；选择不授予权限。[DNLS] 解析与校验，无 agent session 的人工使用同样成立。无选择可列举、可首次创建，不执行对象操作；只有一个候选也不自动选中，不设 env/session 默认回退。 | Round 2 / Q27，[业主] 同意全部推荐（A） | Q29、Q30、Q31 | A 的在途请求和迟到应答仍归 A，不污染 B 视图；对象消失、授权失效或服务不支持，均不改投。消费者只持所选对象引用，不维护容器名、端口或凭证的第二份恢复映射。通过既有公开面同时硬切提供者与消费者，退役隐式 env 寻址；不借此批准路径形状、错误枚举或私有通道。 |
| `T-O-39` | `foundational` | **长期沙箱终端保住原执行，不是保住旧屏**。由 [DNLS] 的环境内 PTY broker 持有原终端；[DNT] 负责呈现、输入与附着。sandbox 仍运行、终端未退出/终止/按策略回收时，浏览器断连、隐藏 pane 或只重启 [dsh] 进程不终止原任务，重连经重新授权接回同一终端。不承诺整机或 sandbox 停止、重建后的进程恢复。 | Round 2 / Q28，[业主] 同意全部推荐（A） | Q31 | 终端归属固定到 sandbox；service/cwd 是启动上下文，不另开 Kitesurf 私有终端。独立创建的终端不因 session 相同而合并；pane、session、临时地址不是终端身份。不重放输入、不开新 shell 冒充原程序；broker 不可确认报未知。以宿主重启后新输入能推进原任务辨真伪，而非仅重现屏幕。[DNT] 本地 lane 不变；未审批 wire 版本、重连次数、TTL、凭证形状或新 release-gate。 |
| `T-O-40` | `execution` | **每受管 env 一份 `stateRoot/registry.json` 控制台账**。根为 `{version,envId,sandboxes}`；行持稳定 `sandboxId`、展示名、profile、归属、期望覆盖/配方引用、backend 绑定及卷/端口分配。改名不改 ID；新卷 `<stateRoot>/<profileId>/<sandboxId>`，接管旧卷保留实挂路径。预留不等于成功发布：端点读 inspect；不持 `attach.url`、屏幕、整份配方或权威健康布尔值。 | Round 3 / Q29，[业主] 同意全部推荐（A） | Q32、Q33 | 每根一个 env 所有者、一个活动写者；先原子持久化意图/预留，再允许特权动作，核实结果后提交绑定。同目录临时文件持久化并原子替换，抢写或落盘失败不报成功。重启只读对账；容器名只作 locator，须有可验证身份/创建代次。未决不重放；inspect 失败为未知，台账损坏、缺失而有存量或版本不识别均不以空表认领；旧对象身份不明须显式核对/接管。 |
| `T-O-41` | `execution` | **保留能力路径，单目标分派**：已有对象的 HTTP 能力只取 query `sandboxId`；宿主 MCP `/mcp` 的 `tools/call` 只取 `arguments.sandboxId`。清单、profile 目录、首次创建不造已有目标；对象级读写及终端操作必须有且仅有一个目标。缺失、空、重复、冲突不执行，无 body/header、session 或 env 兜底。 | Round 3 / Q30，[业主] 同意全部推荐（A） | Q32、Q33 | 宿主准入 → 可信主体/动作/对象授权 → 对象专属上下文、driver 与端点；HTTP/MCP 同 owner。诊断推送及已绑定 bridge/CDP 不跨对象。JSON 应答标识目标，流/无 body 靠连接绑定；不让 A 的迟到结果进 B。提供者、公告/schema、真实 handler 和 [DNK]/[DNT] 同切，无旧 façade。此项不新发凭证、不登记新错误枚举。 |
| `T-O-42` | `execution` | **终端创建与附着分离**：`term.session.create({sandboxId,paneId,openId,service?,cwd?,cols?,rows?}) → {sandboxId,terminalId}`，不发地址。创建键 `(可信主体,sandboxId,openId)` 同参只返原引用、异参拒绝；旧键不复活已结束进程，新开需新键，不引入自动 retry。保持策略/尺寸限制，driver 校验 service/cwd，不收任意宿主 env 或凭证。 | Round 3 / Q31，[业主] 同意全部推荐（A） | Q33、Q34 | `term.session.attach({sandboxId,terminalId}) → {sandboxId,terminalId,attach:{protocol,url}}`；核权、核归属和原执行状态后才发动态地址，失联报不可确认、已结束报结束，绝不 spawn。list 不发 URL；read/input/resize/close 按二元引用校验。断连非 close，不补发旧输入；布局只恢复稳定引用。[DNT] 仍用通用 `McpLane`，[DNLS] broker 回答执行状态，无私有 import；仅替代 `T-O-17` 中相应工具面/返回值/创建幂等粒度，不据此改 wire、凭证时效或重连上限。 |
| `T-O-43` | `execution` | **同一 sandbox 的生命周期写串行，一笔意图只派发一次。** create/start/stop/restart/recreate/remove（含需重建的资源变更）以 env 内 `(可信主体,requestId)` 去重，绑定动作、对象或首次创建参数的规范化指纹；同键同参只返原操作，异参拒绝，删除不重置旧键。创建先将 ID 与意图一起持久化。操作和去重依据属 `T-O-40` 台账，不以 trace 作恢复源；查询遵守 `T-O-41`。 | Round 4 / Q32，[业主] 同意全部推荐（A） | Q35、Q36、Q37 | HTTP/MCP 同一 `{sandboxId,operationId,action,state,step}`，未结束 HTTP 202。`accepted → running → succeeded / failed / indeterminate`；仅派发前可与派发互斥地取消为 `cancelled`。断线/超时非取消、不重发；已知部分失败保留步骤，不可证实只读核对，未决阻止冲突写。已达态 start/stop 不重复动作；start/recover 不隐含 remove，recreate 须独立授权并先核资源、卷、镜像，明确中断旧终端。remove 只移除核实对象，确认后释放端口、默认保卷（含接管卷），不批准删卷接口。 |
| `T-O-44` | `execution` | **请求准入不是对象授权；主体由正式宿主接口证明。** 本 env operator 可无 agent session 观察/管理受管对象、只读发现及显式接管，不因此获准读写或附着他人的终端。绑定 session 只见获准 sandbox，服务和共享 page/history 沿既有能力与写锁；可获准创建自己的终端；终端逐项校验 `(主体,sandboxId,terminalId,动作)`，绑定本身不授予启停/删除、全机日志或他人终端。 | Round 4 / Q33，[业主] 同意全部推荐（A） | Q35、Q37 | 可见性过滤先于列表、计数、分页和 push。缺可信主体/绑定/必要策略不放行、不发地址，不以空结果冒充成功；宿主准入拒绝沿用宿主结果，已认证但不可见与不存在同 404，可见但无动作权限 403。默认视图不披露真实挂载源、终端内容、私密 env 或 token；审计只存主体/对象/动作/结果及操作引用。HTTP/MCP/WS 同边界，attach 签发和使用都核权，撤权后不得继续写。取不到可信身份证明报告宿主依赖，不以 localhost、自报角色、硬编 secret 或插件私道代替。 |
| `T-O-45` | `execution` | **[DNLS] 沙箱终端 wire 硬切 `dnt-ws-v2` + `align:1`。** 动态 URL 上 `open` 带 `v:2,align:1,session:<terminalId>`；校验与已授权终端一致，`ready` 回显终端/版本/对齐，不匹配拒绝、无 v1 降级。按协议公告分派，通用 `McpLane`、[DNT] local 及第三方既有合同不被替换；只修订 `T-O-17` 的本沙箱 wire，不重开 `T-O-42`。 | Round 4 / Q34，[业主] 同意全部推荐（A） | Q35、Q36 | 沿用 framed channel、CREDIT/RESIZE/FACTS/AUTO_INPUT/PING/PONG；逐连接流控。环境内屏幕投影先发序号/几何/光标/文本快照，再发同序列较新 DATA，停顿/断序重对齐；不可确认报未对齐，不拼旧 replay、不承诺全历史或样式无损；自动输入不免核权。仅 transport 断线至多一次自动重连，重新授权 attach 取地址，不 create、不重放输入。拒权、版本不符、已结束或应答超时不自动重跑。WS 关闭只 detach，显式 close 才主动终止原执行。 |
| `T-O-46` | `execution` | **以 `(sandboxId,serviceId)` 寻址独立服务**。对象的 profile/driver 提供 service ID、容器端口/协议、允许的 cwd/探针，分别投影声明版本、实测版本、health、observedAt、实际发布；无证据即未知。按对象选 driver，不选首个 CDP profile。服务列表不发凭证。 | Round 5 / Q35，[业主] 同意全部推荐（A） | Q38、Q39、Q40 | env 范围不重叠，同根各 profile 在创建意图内按服务整组预留 `(loopback 地址,协议,hostPort)`，不要求邻号。OS 占用/池不足/映射不符不报成功；已知没创建才回收此次预留，部分/不确定保留核对，不换号重发。停止保留，删除确认后释放；接管保留实际发布。probe/bridge/CDP/详情只取同对象 inspect 映射，无 `httpBase` 兜底或 `enginePort+1`，区分未发布与不健康。service 只作 create 上下文；driver 验容器内 cwd 边界，不收宿主路径/任意 env，不支持则拒绝；重连仍按终端引用。 |
| `T-O-47` | `execution` | **保存候选不应用，换代须显式授权并核实。** 同对象记录 `desiredRevision` 和最后核实的 `appliedRevision` 引用，按 `expectedRevision` 拒绝旧编辑。区分 profile 默认与 CPU/内存覆盖，验证单位/界限；空闲策略不即时扫停活跃终端，网络/挂载仅支持宿主与 driver 声明且可验证的范围。保存只报告影响，不构建、启动或停机。 | Round 5 / Q36，[业主] 同意全部推荐（A） | Q38、Q39、Q40 | operator 确认对象、候选、终端中断及卷计划，走 `T-O-43`。先核实例身份、实挂卷、端口、候选 pin/runtime 回执、镜像 digest 与回退所需旧产物；歧义/保护不足不拆旧。新代次/卷/资源/服务均核实才推进 applied；失败保留候选、最后核实回执与真实步骤，不谎报旧实例存活。重建默认保卷；配置回退是兼容当前卷的显式新操作、新代次。可能迁格式/卷时先停写并有可验只读快照，无能力则拒绝。恢复数据另行确认恢复点及后续写入损失，隔离验证再切唯一写者，不自动覆卷。接管不迁卷，回退不复活 PTY、不改官方 pin。 |
| `T-O-48` | `execution` | **每 env 一个 [DNLS] 后台采样写者；24h/7d/30d 共用最近 30 天有界分钟槽。** 宿主运行时按 UTC 每个已核实 sandbox/代次每分钟至多采一次，记时间、来源、代次及可得指标；不因刷新多采。跨宿主重启可读，按时间淘汰且限制对象数/存储预算，满载显式留缺口；读数不作控制或审计真源。 | Round 5 / Q37，[业主] 同意全部推荐（A） | Q38、Q39、Q40 | 截止最近完成的 UTC 分钟，取 `[end-window,end)`。实测内存 bytes 报有效样本均值/峰值；CPU 单位 core，累计量仅限同代次连续段内相邻分钟差除实际经过秒数，均值按有效时长加权。首次/倒退/断段/换代不跨界，单位不明不猜；停机、漏采、失败、真零区分。每指标给单位、有效/应有槽及值或 null；分母按窗口与纳管寿命内的完整分钟槽（含停机/失败），未创建时段不算。仅汇合已验证片段；先核历史可见范围，再按同分钟同单位可加量汇总可见对象，报告贡献/应有对象数，缺样不补零、不反推隐藏对象。进程表、命令行、屏幕、token 不入分钟库。 |
| `T-O-49` | `execution` | **一个授权后的对象投影：fleet 窄行、详情按需、bridge 隔离。** `GET /nano-local-sandbox/fleet` 仅取宿主明确配置且主体可见的受管 env；来源不可用标不完整，不遍历相邻 home、不代写、不泄露隐藏 env。host 容量不从可见对象反推。`GET …/sandboxes` 与 `sandbox.list` 同 owner，`GET …/inspect?sandboxId=B` 与 `sandbox.inspect` 同 owner；授权先于计数/排序/分页，发现不混入受管清单。 | Round 6 / Q38，[业主] 同意全部推荐（A） | Q41、Q42 | 窄行分列 env/对象/名称/profile、已核实代次或空、观测时间、running/stopped/missing/unknown、driver 健康、操作 state/step 及期望/已应用修订；在途、失败不覆盖实态。服务、可见终端数、覆盖度不带私密正文/路径/凭证。获准 operator 主动读 `…/processes?sandboxId=B`，固定只读 `/proc`，PID 升序，默认 50/最多 200，pid/ppid/短名/状态/实测值及代次/时间/truncated；不暴露 argv/env 或宿主 PID，不让空行冒充失败。刷新不触发重操作。推送限已验证发布者、env/对象/代次和单调序号，宿主重启重绑，乱序/异对象拒收；合法清空覆盖旧投影，过期报时间，不拼最长历史。不可信共享读者只见非受限健康。完整边界见 Q38 的 A 项执行说明。 |
| `T-O-50` | `execution` | **对象面硬切 `dnls.control/1`。** 无目标只读 `GET /nano-local-sandbox/contract` 与 `sandbox.contract` 返回同源 `{contractVersion,capabilities}`，不授权；先发现后调用，不试写探版本。受管 HTTP 带 `X-DNLS-Contract`，宿主 MCP 带 `tools/call.params._meta["dnls/contract"]`，对象 JSON/bridge push 带 `contractVersion`，无 body 用绑定与响应头。宿主准入后、访问/派发前拒绝缺失/不匹配。major 内可忽略只读新增字段，不改已有语义/单位/可空性；第三方、原生 MCP 协商与 [DNT] local 不改，沙箱 wire 仍为 `T-O-45`。 | Round 6 / Q39，[业主] 同意全部推荐（A） | Q41、Q42、Q43 | 七项固定业务错误：`sandbox.contract_mismatch` 400；`sandbox.name_taken/port_exhausted/quota/state_conflict/image_missing`（均为 sandbox 前缀）409；`sandbox.upgrade_failed` 500（已知派发后失败，非未决）。`errorId/status/cause/next` 与已有 operation 引用跨 HTTP/MCP 同义，MCP 用 isError；查失败操作可读取成功。保留宿主拒绝、404/403、JSON-RPC 错误和既有重试边界。版本、route 审核、tool schema/dispatch、错误各有唯一来源；bindings/perf/发布产物投影，driver 目录按目标组合，不按全局活动 profile 漂移。不补无目标兼容，不扩全仓生成器或闸门；七项处置见 Q39 的 A 项执行说明。 |
| `T-O-51` | `execution` | **[DNLS] 同包独立交付 web 管理，「沙箱」页签与 `/sandbox` 打开同一 [dsh工作台] 页面**；保留宿主入口、安装方式及容器特权点，无 agent session 的获准 operator 可管理。用正式 client export/模块、宿主 UI/主题/语言与 nano-ui，不加独立 shell、私有 DOM 或第二个设计面。缺槽位/命令冲突报宿主依赖。 | Round 6 / Q40，[业主] 同意全部推荐（A） | Q41、Q43 | 展示获准 fleet/创建/用量/部署；按所选目标展开服务、进程、存储/网络、时间线、设置、关于、终端等，不浏览业务正文。只持视图与稳定引用，拒权、为空、缺样、进度、失败分开；确认影响后一次提交，断线查原操作，迟到数据不串对象。终端清单、明确创建（不连接）、关闭可独装；交互由可选 [DNT]/同协议客户端呈现，无正式处理能力不先建 PTY、不用 openLocal/本机 shell、token 剪贴板/私道/专有 lane 兜底。[DNK] 仍做设计；[DNT] 布局仅稳定引用，重附着再授权。消费者同切不等于必装，关页/卸载不是杀进程。详见 Q40 的 A 项执行说明。 |
| `T-O-52` | `execution` | **附着权来自宿主可信主体及独立对象授权，不来自地址。** 受限 HTTP/MCP/WS 用实际请求经 `connection.admit(req)`；按 host/env 的稳定 principal、可信使用绑定、目标及动作核权。单用户本 env 的 owner 可管理，但不因此可读所有终端；共享 browser owner 不是多用户证明，临时 peer.id 不是持久归属。 | Round 7 / Q41，[业主] 签收「A 宿主核身」 | 收口 | Q41 A 四项执行说明全纳入。动态 WS locator 无 bearer；发放及 upgrade 两次核权，持续验证凭证/业务权限，撤权或失效即阻断输入输出、清队列并 detach，不杀 PTY。重启重验主体及原执行，无法证明则拒绝；不发新票据、不向 broker 传宿主凭证。 |
| `T-O-53` | `execution` | **每 env/profile 按受管 sandbox 计额，策略许可且可证空闲时只 stop、不 remove。** scope 仍为 session/shared 使用/策略范围。创建与接管先原子占位；已停/失联/未决占位，同一对象的绑定/换代不重计；确认未建、派发前取消或既成对象确认删除才退，不以 quota 逐出其他对象。 | Round 7 / Q42，[业主] 签收「A 计对象只停不删」 | 收口 | Q42 A 四项执行说明全纳入。接管默认手动停；live/detached PTY、活跃工作/在途写或 broker 未知均不可自动停。连续证明完整空闲窗，断档重计；与新使用串行复核，按对象/代次/空闲周期合并操作。停止保 ID、端口、卷和名额，不后台预热。 |
| `T-O-54` | `execution` | **通过公开、无凭证、当前 host 范围的 `dsh-resource://sandbox-terminal/<envId>/<sandboxId>/<terminalId>` 交接已有终端。** 确认正式处理能力后，仅明确新建手势以 paneId/openId 创建一次；处理器消失显示已创建未连接，重开只 attach/对齐。无处理器不为打开交互而预建，可手动选择公开目标。 | Round 7 / Q43，[业主] 签收「A 公开资源导航」 | 收口 | Q43 A 四项执行说明全纳入。调用方和处理器各守正式接口，引用不授予权限，不带 URL/token/命令；通用 McpLane 不新增 lane，不回落本机。恢复、切页、卸载不 close 或重放；只显式结束才终止，重复关闭不再杀。没有无 session 的正式页签入口是宿主交付依赖，不是假 session 或 UI 已完成。 |

**继承，不重登**：[DNLS01：48–56](DNLS01-qna.md#L48-L56) 的特权、平台边界及 `T-O-8` 长期治理原则；[DNLS01：64](DNLS01-qna.md#L64) 的 `T-O-17` 通用终端面；[DNLS02：37–38](DNLS02-qna.md#L37-L38) 的 `T-O-19/20` 能力路由与同源投影；[DNLS02：41–45](DNLS02-qna.md#L41-L45) 的 `T-O-23/25/27` driver 边界、同页协作与物理复用。前册仍是这些裁决的真源。各题保留提问时的选项与依据；只有 [业主] 已答且已入台账的决定生效，不因源码、测试或推荐预发 Truth-ID。

## 2. Round 1 —— foundational：控制对象与纳管边界（Q25–Q26）

本轮 `retired`，[业主] 直答。两题可独立作答：Q25 问两个标识何时指向同一对象；Q26 问即便已经认得对象，谁能决定控制它。不以一题的推荐作为另一题的前提。

### Q25 — 生命周期动作应指向受管 sandbox，还是 session 实例或 env 默认槽？

**驱动真相**：`T-O-33/34/35`、`T-O-27`。来源：[v1.3 待裁的对象与 scope：943–952](../dsh-nano-local-sandbox-v1.3.md#L943-L952)。

- **影响范围**：[DNLS] 的启停和恢复、[DNK] 的 page/CDP/history、[DNT] 的 terminal target，以及 fleet 里“一行”究竟代表什么。
- **为什么必须确认**：当前两个 session 可以拿到不同的 `instanceId`，却指向同一个容器。若只把 `instanceId` 改名为 `sandboxId`，列表会把一个对象画成两个；停掉其中一行，实际会停掉另一行正在使用的环境。
- **当前建议 / 倾向**：选 **A**，把受管运行环境作为独立生命周期对象；session 是使用者，不是环境身份。
- **Reasoning**：Case 1 要在 [dsh] 宿主重启后找回同一目标，Case 3 要在指定环境的指定服务上下文开终端。二者都要求目标可独立于会话、pane、进程名而被识别，但都没有要求每个 session 独占一个容器。
- **问题（请 [业主] 裁决）**：在同一 env、同一 profile 下，是否允许存在多个各自可启停、跨宿主重启仍可辨认的 sandbox，并以它们而非 session 记录作为控制目标？请选择 A/B/C，或给出修订。
- **[业主]回答**：已确认 A（2026-11-19：「业主同意你在 [第1轮] 的全部推荐」），冻结为 `T-O-36`。

**【对本问题的解读】**　例：会话甲、乙都使用 sandbox A，同时存在同配方的 B。按推荐，环境清单是 A、B 两行，不是甲、乙两行；A 的共享页面仍是 A 的，操作 B 不应重置 A。这里的 env 指一套 [dsh] 运行环境，profile 是配方，sandbox 是可启停的运行对象，terminal 是在其中执行的子对象。这是身份粒度的选择，不是 URL、ID 编码或端口算法的选择。

**【可选选项清单】**

| 选项 | 控制单元 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 每个受管 sandbox 有独立身份；允许多个 session 绑定同一 sandbox，也允许同配方多个 sandbox。 | 既能共享 A，也能单独控制 B；必须把运行对象和使用关系分开管理。 |
| B | 每个 session 实例拥有独占 sandbox，生命周期一一绑定。 | 会话隔离直观；同一环境跨会话协作不再是原语，资源数随会话增长，须明确替换现行共享裁决。 |
| C | 每个 env、每个 profile 永远只有一个槽位；fleet 仅聚合这些槽位。 | 改造最小，适合只做运维总览；无法同时指定同 env、同配方的 A 和 B。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. [DNLS] 对环境的控制以稳定的 sandbox 身份定位；profile 解释其配方，provider 解释如何执行。容器名、端口或 session 记录都不作为另一把可独立选目标的权威钥匙。
2. 保留 `T-O-27` 中“使用记录及策略按 session 区分”的意义；明确变更的是共享边界：同一 sandbox 内可共享 page/CDP/history，不同 sandbox 之间不共享这些状态。session 结束不等于环境销毁，切换 pane 也不等于切换环境。
3. [DNK] 和 [DNT] 消费同一目标，由 [DNLS] 解析；不各自维护 container 名映射。既有环境若获准接管，只对应一个受管对象，不按旧 session 行数复制。此次不选择默认值、不增改 `term.*` schema、不新增 lane。

**【推荐选项支持证据或其他选项的反例】**

- [routes.js:1271–1292](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1271-L1292) 的实际 `ensure` 对带 session 的请求用 `skipCreate: true` 登记当前 env 容器；[instances-ensure.test.mjs:92–109](../../../../dsh-nano-local-sandbox/test/instances-ensure.test.mjs#L92-L109) 断言两次返回不同 ID/指纹、相同容器名、零次 create。B 并非“沿用现状”。
- [profile-drivers.js:131–149](../../../../dsh-nano-local-sandbox/src/host/profile-drivers.js#L131-L149) 的默认名字和端口按 profile/env 得出；[routes.js:1305–1309](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1305-L1309) 的启停直接取 env 容器名。C 能解释今天的行为，却不能兑现同配方第二个目标。
- [[DNT] lanes.js:214–225](../../../../dsh-nano-terminal/src/client/lanes.js#L214-L225) 创建请求只带尺寸与 session；[[DNK] index.js:67–75](../../../../dsh-nano-kitesurf/src/client/index.js#L67-L75) 从应答的 `lifecycle` 读端点。缺的是控制方与消费者都能识别的目标，不是让消费者另存一份后端地址。

### Q26 — 后端发现了一个环境，凭什么把它从“可观察”变为“可控制”？

**驱动真相**：`T-O-33/35`、`T-O-8/23`。来源：[v1.3 台账、卷与 owner 提议：840–851](../dsh-nano-local-sandbox-v1.3.md#L840-L851)；[仓规：39–46](../../../../AGENTS.md#L39-L46)。

- **影响范围**：fleet 发现、重启后对账、旧环境接管、卷归属及 dashboard 控制动作；同样适用于 Q25 的任一粒度。
- **为什么必须确认**：读到容器存在、名字相符、配方一致，只证明“看见了它”。这些证据不能证明“本 [dsh] 环境可以重建它”。反过来，本地配置写着某卷，也不能证明后端现在就挂着它。
- **当前建议 / 倾向**：选 **A**：控制权只来自本控制面的创建或显式授权的接管；发现与对账本身只读。
- **Reasoning**：控制归属与物理状态回答不同问题。前者要在宿主重启后仍有唯一依据；后者随运行环境变化，必须允许显示“未知／不一致”。混在一起，要么一次只读刷新会改变环境，要么一份过时台账会把不存在的服务报成在线。
- **问题（请 [业主] 裁决）**：对从未登记、但现场可见且配方匹配的环境，[DNLS] 应仅在显式授权接管后才控制（A），自动纳管（B），还是完全不接管存量、只管理新建环境（C）？
- **[业主]回答**：已确认 A（2026-11-19：「业主同意你在 [第1轮] 的全部推荐」），冻结为 `T-O-37`。

**【对本问题的解读】**　典型分歧是“旧环境还在跑，但卷不是当前期望路径”。它不等于空白机器，也不等于损坏。Q26 决定的是谁能让控制权发生变化，不是所有进程是否都应出现在面板里；可见范围仍受宿主授权约束。已有绑定的恢复也不同于首次认领陌生对象。

**【可选选项清单】**

| 选项 | 接管原则 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 自建即受管；存量先观察，经授权明确接管；归属不明不写。 | 保留现有运行环境和数据，又避免误控相邻 env；首次接管需要一次明确决定。 |
| B | 扫描发现匹配命名、配方或端口的对象就纳管。 | 迁移省一步；同配方的实验容器也可能被认作生产对象，发现规则实际成了第二个授权来源。 |
| C | 只管理本阶段新建的对象；存量不允许原地接管。 | 归属最简单；即使确认存量属于自己，也必须另建、迁移，可能打断终端或丢失对旧卷的引用。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. 按事实划分真源：profile 持有配方；[DNLS] 持有唯一的受管身份、归属和该对象的期望配置或配方引用；backend 回答实际运行态、端口、挂载。面板可以并列显示“期望 / 实际”，不把派生快照当重启恢复的第二份真源。
2. 把发现、接管、变更拆开：发现不启动、不重建、不迁卷；接管须确认控制归属并绑定既有对象，**接管授权不是重建或搬卷授权**。发现别的 env 的资源、无归属证据或 inspect 失败，均不靠名字取得写权；已受管对象失联也不偷偷改绑到同名替代物。
3. 控制归属解决“谁管理”，不是给每个请求授权。即使已纳管，消费者仍须经宿主授权和对象范围校验。浏览列表不等于可 attach、stop 或 delete；不以复制 attach 凭证来支持 fleet。这里不冻结角色枚举、凭证形状、registry 文件名或新路由。

**【推荐选项支持证据或其他选项的反例】**

- [instance-registry.js:42–70](../../../../dsh-nano-local-sandbox/src/host/instance-registry.js#L42-L70) 按记录 ID 填 `stateVolume`；[routes.js:327–333](../../../../dsh-nano-local-sandbox/src/host/routes.js#L327-L333) 给出其路径算法，但[真正创建 env 的分支：658–671](../../../../dsh-nano-local-sandbox/src/host/routes.js#L658-L671) 传入的是 `session.stateDir`。所以不能把旧 session 记录直接持久化后当实挂卷清单。
- [driver/reconciliation.js:14–23](../../../../dsh-nano-local-sandbox/profiles/kitesurf/driver/reconciliation.js#L14-L23) 已从 inspect 提取镜像、挂载和实际 `stateSource`；[routes.js:674–697](../../../../dsh-nano-local-sandbox/src/host/routes.js#L674-L697) 遇到配方或资源漂移则会停、删、重建。这支持复用前者观察，反对把后者当作列表刷新或首次接管。
- [route-guard.js:21–25](../../../../packages/dsh-host-route-guard/src/route-guard.js#L21-L25) 明示 `sessionBinding` 只是元数据；[实际请求入口：263–272](../../../../packages/dsh-host-route-guard/src/route-guard.js#L263-L272) 调用宿主 `requestRejection`。已通过宿主请求围栏，仍不是对某个对象拥有生命周期控制权的证明。

## 3. ★ 中场评估 I（Round 1 → Round 2）

- **3.1 判定**：Q25、Q26 均有 [业主] 无附加条件的 A 答复。两题分别回答“这是不是同一环境”和“本控制面凭什么能动它”：前者不靠 session 数量推断，后者不靠发现结果推断。
- **3.2 已锁定真相**：Q25 → `T-O-36`；Q26 → `T-O-37`。例如，甲乙共用 A 时清单仍只有一个 A；另见同名或同配方的 B，不能据此控制 B。完整约束以 §1 对应行为准。
- **3.3 反方制衡**：独立身份多出一层绑定，显式接管也增加一次判断；在只有一个容器时，旧默认槽看起来更省事。但名字对了不能证明卷对了，能看见环境也不能证明某次请求有操作权。不能为省这一步保留两个可写目标来源。
- **3.4 为什么注入 Round 2**：新检索发现，[DNK] 先读共享状态再发不带目标的启停动作，而 [DNT] 的 MCP 终端会复用同一 session 的 PTY；[DNT] 本地 lane 还可以重放旧屏幕到新 shell（证据见下列两题）。因此由 `T-O-36/37` 导出两处分歧：已有多个合法目标时，使用者的操作意图如何固定（Q27）；已选定环境时，断开消费者究竟应该保住哪个执行对象（Q28）。两者都不是给旧 API 改个名字就能决定的。

## 4. Round 2 —— foundational：消费者的目标与执行连续性（Q27–Q28）

本轮 `retired`，[业主] 直答。Q27 决定“一次操作去哪里”，Q28 决定“回来时是不是原来的工作”；两题均从第一轮冻结项出发，不互相预设答案。案例范围不变。

### Q27 — 对已有 sandbox 的操作，目标必须由本次操作固定，还是允许平台代选？

**驱动真相**：`T-O-36` 允许同一 env、同一 profile 有 A、B；`T-O-37` 要求按目标校验授权。即使 A、B 都已纳管，调用者也有权使用两者，这两条仍不能回答“这次要动哪一个”。草案在 [v1.3:943–952](../dsh-nano-local-sandbox-v1.3.md#L943-L952) 把 `default` 明列为待裁，而非现行义务。

- **影响范围**：[DNK] 查看、导航和启停，[DNT] 向指定服务开终端，agent 的 MCP 操作，以及没有 agent session 时的人工操作。
- **为什么必须确认**：若在 A 的详情上发起操作、送达前当前页已经切到 B，授权检查可能对 A、B 都通过；它不能替用户选出 A。相同问题也发生在没有会话、或原目标消失时。
- **当前建议 / 倾向**：选 **A：先明确选定，操作始终绑定原目标；无目标不执行对象操作**。可以一次选择、多次使用，不要求每次点击都弹选择器。
- **Reasoning**：把“界面上显示哪个对象”与“这一次请求打到哪个对象”分开，才能让中途切换标签、并发或连接恢复不改变已经发出的意图。代价是旧的无目标调用必须随消费者一起适配，而不是留一条长期回退路径。
- **问题（请 [业主] 裁决）**：对于针对已有 sandbox 的读取与动作，是否要求每次操作都能还原到调用者已明确选定的原对象，拒绝由当前 session 或 env 默认值临时代选？请选择 A/B/C，或修订。
- **[业主]回答**：已确认 A（「业主同意你在 [第2轮] 的全部推荐」），冻结为 `T-O-38`。

**【对本问题的解读】**　这里裁的是选择权，不是 URL 形状，更不是把 `sandboxId` 当通行证。显式既可以是对象 ID，也可以是已明确绑定该对象的调用上下文；关键是发出后不能随宿主“当前对象”漂移。列出可见对象、首次创建不需要一个已存在的目标；“启动已选的 B”不能在 B 不可用时变成“创建或启动 A”。

**【可选选项清单】**

| 选项 | 调用没有明确目标时 | 收益 / 代价 |
|---|---|---|
| **A（推荐）** | 可发现或选择；未选择则不执行对象操作。已选目标失效，明示不可用，不改投。 | 并发与重连不串目标；无目标的旧客户端须适配。 |
| B | [DNLS] 在 env 内维护一个受管默认对象，仅对省略目标的调用使用它。 | 单机使用方便；默认对象的设置、变更与披露都成为长期公共合同。 |
| C | 把 session 当前绑定作为默认对象；无 session 的 UI 仍需显式选择。 | 连续对话便利；同一 session 的不同 pane 要额外处理并发改绑。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. [DNK] 面板、[DNT] pane 或 agent 在操作前选定一个受管对象。[DNLS] 解析并校验该主体对该对象的权限；消费者只携带所选对象的引用，不保存另一份可恢复的容器名、端口或 attach 凭证映射。人工可在没有 agent session 时选择，仍须受宿主授权。
2. 对 A 已发出的请求和应答均按 A 处理。切到 B 不将 A 的迟到结果写进 B 的视图；A 消失、权限失效或不支持所选服务，不发往 B。只有一个候选也不把“可见”变成“已选”。
3. 用登记过的 HTTP/MCP/terminal 面适配双方；同一次切换退役旧的隐式 env 寻址，不建插件专用 route 或常驻兼容分支。本题不决定 path/body、默认展示哪一页或失败枚举；`T-O-19/20` 的命名空间与同源原则不因此解冻。

**【推荐选项支持证据或其他选项的反例】**

- [[DNK] index.js:1012–1021](../../../../dsh-nano-kitesurf/src/client/index.js#L1012-L1021) 从固定 `STATUS` 读取状态；[同文件:1839–1845](../../../../dsh-nano-kitesurf/src/client/index.js#L1839-L1845) 根据 phase 只提交 `{ action }`。宿主 [routes.js:1644–1658](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1644-L1658) 再按 env 取名操作。只改 picker 而不改消费链，用户即使选了 B，后端也没有收到这个选择。
- [routes.js:1434–1451](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1434-L1451) 多条路由闭包共享 `session`；[/open:1673–1700](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1673-L1700) 用这个上下文解析引擎并写入页面历史。它解释了为什么不能将共享指针直接升级为所有 pane 的当前目标。
- [[DNT] lanes.js:214–225](../../../../dsh-nano-terminal/src/client/lanes.js#L214-L225) 的 create 发送尺寸和 `sessionId`；[DNLS routes.js:1407–1420](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1407-L1420) 用 env 快照的 `containerName` 开 PTY。session 定位的是会话，不是操作者本次选定的 sandbox/service。旧 [T-O-18：DNLS01:65](DNLS01-qna.md#L65) 还要求无 agent 会话时 UI 可用，不能强制每次人工操作先造 session。

### Q28 — “长期终端”承诺保住原执行，还是只保住身份和屏幕？

**驱动真相**：`T-O-36` 已把 sandbox 生命周期与 session/pane 分开，`T-O-37` 要求重新操作仍受对象授权；`T-O-34` 将 Case 1、3 留在本期。[v1.3:1518–1522](../dsh-nano-local-sandbox-v1.3.md#L1518-L1522) 提出宿主重启后 reattach，但仅凭“有屏幕”不足以确认原进程还在。

- **影响范围**：[DNLS] 的沙箱终端持有者、[DNT] 的通用 MCP lane、面板关闭/分离语义，以及 Kitesurf 服务上下文中的交互工作。
- **为什么必须确认**：同一张屏幕既可能来自仍在运行的程序，也可能来自新 shell 上方重放的旧输出。对只想回看日志的人，两者相近；对正在等待交互输入的原任务，两者完全不同。
- **当前建议 / 倾向**：选 **A：sandbox 仍运行、终端未退出且未被明确终止或按策略回收时，只重启 [dsh] 宿主也应接回同一活终端**。这里的“宿主重启”是 [dsh] 进程重启，不是整台机器或 sandbox 的重启。
- **Reasoning**：Case 3 所说的 `engine` 是目标容器里的服务上下文，不是另一个环境。如果执行依附于浏览器 pane 或 [dsh] 进程，环境即便完好，使用者仍可能只能找回最后一屏。把 PTY 放在受管环境的生命周期内，可以同时给出可信的继续条件和终止边界。
- **问题（请 [业主] 裁决）**：只断开浏览器或重启 [dsh]、不停止目标 sandbox 时，是否以“原程序能继续并接受输入”而非“旧屏重新出现”作为长期终端的基础承诺？请选择 A/B/C，或修订。
- **[业主]回答**：已确认 A（「业主同意你在 [第2轮] 的全部推荐」），冻结为 `T-O-39`。

**【对本问题的解读】**　判断例：程序在宿主重启前已进入第二步并等待输入。重连后输入应由那个仍在第二步的程序接收；新 shell 即使显示一样的提示符也不算。两个独立创建的 pane 可以在同一会话、同一服务内运行不同终端；刻意再附着同一终端则不是创建第二份执行。

**【可选选项清单】**

| 选项 | 只重启 [dsh] 后的产品承诺 | 收益 / 代价 |
|---|---|---|
| **A（推荐）** | 原终端仍在目标环境中执行；经授权可重新附着。屏幕恢复是辅助。 | 支持交互式长任务；[DNLS] 需有不依赖 [dsh] 进程的 PTY 持有者，并处理失联与回收。 |
| B | 可恢复身份与屏幕，但开的是新 shell，明确标识，不重跑旧命令。 | 可复用本地 lane 的使用习惯；交互任务本身不能继续。 |
| C | 只承诺 [dsh] 进程活着时的传输重连；宿主重启后明确结束。 | 无需独立持有者；不能满足跨宿主重启的长任务目标。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. 由 [DNLS] 的环境内 PTY broker 持有终端及其原执行，[DNT] 只呈现、发送输入与附着。终端归属固定到目标 sandbox；服务与 cwd 是开终端的上下文，不另起一套 Kitesurf 专用终端。pane、session、临时连接地址都不是活进程身份。
2. 断连、隐藏 pane 或重启 [dsh] 不等于显式终止；两个独立终端不因共用 session 而合并。重连只附着原对象并重新核权，不重放旧输入、不偷偷新建 shell。无法确认 broker 状态时报告未知/不可达，不能冒称程序已死或仍活；确认退出或 sandbox 停止、重建后，不承诺旧进程复活。
3. 验证要区分执行与回显：让非生产测试任务保持内存中的进度并等待输入，只重启 [dsh]，确认新输入能推进原任务；再对照 sandbox 本身重启，不把旧屏当作运行证据。该例不是新增 release-gate。本题不选择 v2 帧、重连次数、凭证形式、TTL 或实现语言；[DNT] 本地 lane 语义不改，`T-O-17` 中已冻结的协议也不因本题自动变更。

**【推荐选项支持证据或其他选项的反例】**

- [[DNT] NanoTerm.jsx:393–406](../../../../dsh-nano-terminal/src/client/NanoTerm.jsx#L393-L406) 区分视图切换和显式关闭 pane；[McpLane.close:318–330](../../../../dsh-nano-terminal/src/client/lanes.js#L318-L330) 不只断 WS，还请求关闭远端终端。[DNLS term-bridge.js:23–36](../../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L23-L36) 又按 `sessionId` 复用活 PTY，[关闭分支:109–117](../../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L109-L117) 会终止 child。这是必须区分 pane、attach 与终端身份的具体原因。
- [backend-apple.js:287–299](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L287-L299) 当前从宿主启动 PTY 包装进程去执行容器 shell；[term-bridge.js:66–82](../../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L66-L82) 在宿主内存保存 child 和输出；[pty-entry.mjs:1–2](../../../../dsh-nano-local-sandbox/profiles/terminal/pty-entry.mjs#L1-L2) 只导出路径。这证明目前没有这条可跨宿主重启重附着的 broker 链，不证明所有容器内子进程在任何断连下必死。
- [[DNT] sessions.js:277–283](../../../../dsh-nano-terminal/src/host/sessions.js#L277-L283) 描述本地 placeholder，[实际恢复:356–369](../../../../dsh-nano-terminal/src/host/sessions.js#L356-L369) 新开 shell，再[重放屏幕:378–386](../../../../dsh-nano-terminal/src/host/sessions.js#L378-L386)。这是 B 而非 A。相反，[Apple backend:163–170](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L163-L170) 的 sandbox restart 是 stop + start，不能把这个故障域同 [dsh] 进程重启混为一谈。
- [Kitesurf profile.yaml:22–33](../../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L22-L33) 在同一配方内声明 `engine` 与 `mcp-bridge`。Case 1、3 可以检验同一套终端承诺，不要求 [DNT] 感知私有路径或修改上游 pin。

## 5. ★ 中场评估 II（Round 2 → Round 3）

- **5.1 判定**：Q27、Q28 两个 A 均获 [业主] 无附加条件确认；加上 Q25、Q26，四个 foundational 问题已全部冻结，不重新询问默认槽或“旧屏是否等于原进程”。
- **5.2 已锁定真相**：Q27 → `T-O-38`，用户选的 B 不能因切页、迟到或失败而变成 A；Q28 → `T-O-39`，重连的证据是 B 里的原程序接受新输入，而不是 B 的旧画面。权威细节只在 §1 对应行。
- **5.3 诚实反方**：无目标不执行，牺牲了单例时代省略选择的便利；环境内 broker 增加交付和回收成本。但在旧流程上叠一个默认槽或在新 shell 上回放旧屏，都会掩盖调用者最需要知道的事实。两条裁决不提供现成的传输格式、落盘机制或重连协议。

- **5.4 为什么注入 Round 3**：按已冻结结果重走三条链：registry 分配记录 → backend 创建/inspect；HTTP/MCP 公告 → handler → owner；[DNT] 新建/重连 → [DNLS] broker。分别发现“回到同名容器”“接收目标参数却操作默认环境”“拿旧连接代替原终端”都不能兑现第二轮承诺。由此只提三个执行合同，不重开对象模型。

## 6. Round 3 —— executional：把已选目标带到实际执行者（Q29–Q31）

本轮 `retired`，[业主] 已直答。保留提问时的备选与依据，生效口径为 §1 的 `T-O-40/41/42`；裁决不等于 API 已发布。

### Q29 — 宿主重启后，用哪份台账恢复 `sandboxId` 与物理对象的绑定？

**驱动真相**：`T-O-36/37/38`。Q27 已排除改投默认环境；要兑现“还是 B”，[DNLS] 必须能区分原 B、失联的 B 和新出现的同名容器。

- **影响范围**：registry 写者、backend 绑定、存量接管及重启恢复。**为什么必须确认**：今天的 `instanceId` 是 session 记录；把它写盘不会产生可验证的物理身份。
- **当前建议 / 倾向**：**A：每个受管 env 以一份版本化 `stateRoot/registry.json` 为控制台账，配方和现场保持各自权威。**
- **Reasoning**：在本地单写者规模下，单文件比另建数据服务简单；代价是必须处理抢写、写失败以及 CLI 已成功但台账还未提交的窗口。不能把浏览器缓存的“尽力写入”语义借来做控制权恢复。
- **问题（请 [业主] 裁决）**：是否按 A 冻结持久化位置、写入边界及只读恢复规则？也可选 B/C 或修订。
- **[业主]回答**：已确认 A（「业主同意你在 [第3轮] 的全部推荐」），冻结为 `T-O-40`。

**【对本问题的解读】**　崩溃前已为 B 分配 ID，重启后 backend 又报告一个叫 B 的容器。应能回答“我曾打算创建什么”和“现场究竟是哪一份”，而不是通过再执行一次 create 来试探。

**【可选选项清单】**　**A**：env 根目录单文件、单写者，整份提交；容易检查和随迁。**B**：同一 env 一个 SQLite 事务库，只用数据库作权威；约束与并发更强，但引入数据库运行时与迁移。**C**：每对象一份受控目录记录、扫描生成只读索引；分对象恢复容易，跨对象同名、端口预留及未完成创建的协调更复杂。三者都不得从扫描结果自动取得写权。

**【推荐选项的详细执行说明析】**

1. 根文档为 `{version, envId, sandboxes}`；每行记录稳定 `sandboxId`、展示名、`profileId`、归属、期望覆盖/配方引用、backend 绑定及卷和端口分配。ID 分配一次，改名不改 ID；新卷按 `<stateRoot>/<profileId>/<sandboxId>` 分配，授权接管的旧卷保留实际路径，不因入账搬卷。端口分配是预留，不是已成功发布的证明；实际端点读 inspect。表内不保存 `attach.url`、会话屏幕、整份配方或权威 `healthy`。
2. 同一 stateRoot 只许一个 env 所有者和一个活动写者；即使显式根目录覆盖导致两个宿主相撞，也拒绝第二个写者，不做最后写入者胜出。先在台账原子提交意图/预留，再允许特权变更，核实结果后提交绑定；整份更新需独占、同目录临时文件持久化后原子替换。持久化失败不报成功；不能把悬而未决的意图当作重放写命令的授权。
3. backend 定位名仅用于查找；恢复控制还须核对可验证的实例身份/创建代次。对未能证明唯一身份的旧对象，只展示观察结果，另行显式接管或人工核对。inspect 失败是未知，不是可重建的缺失。已知有存量而台账遗失、版本不识别或损坏时，不以空表接管全机。验收对照：模拟创建后、最终提交前退出；重启可报告未决，不能多建一个，也不能启动同名替代物。

**【推荐选项支持证据或其他选项的反例】**

- [instance-registry.js:17–43](../../../../dsh-nano-local-sandbox/src/host/instance-registry.js#L17-L43) 在 `Map` 内按 profile/session 查找并分配 ID；[同文件:68–80](../../../../dsh-nano-local-sandbox/src/host/instance-registry.js#L68-L80) 的非 adopt 分支先 `backend.create` 后 `instances.set`。这是崩溃窗口的源码依据，不是已观测到的事故。
- [profile-drivers.js:152–164](../../../../dsh-nano-local-sandbox/src/host/profile-drivers.js#L152-L164) 允许 `DNLS_STATE_ROOT` 覆盖且当前卷尾段取容器名；[backend-apple.js:139–152](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L139-L152) 当前 create 的返回 `id` 就是名字。不能假设它已提供不可复用的 provider ID，缺标识时不能用配方相同代替身份证明。
- [backend-apple.js:172–182](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L172-L182) 区分 not-found 与其他 inspect 错误；[routes.js:145–149](../../../../dsh-nano-local-sandbox/src/host/routes.js#L145-L149) 有 tmp + rename 先例，却会吞下浏览器状态写失败。前者应保留，后者不能照搬到控制台账。

### Q30 — 同一个公开能力通过 HTTP 和 MCP 调用时，`sandboxId` 放在哪里、在哪里生效？

**驱动真相**：`T-O-38`（必须携带已选目标）、`T-O-37`（目标不是授权）；承接 [DNLS02 `T-O-19/20`:37–38](DNLS02-qna.md#L37-L38)。本题只裁**宿主入口的对象寻址格式和分派位置**，不重答“要不要显式选择”。

- **影响范围**：[DNK] 能力路由、agent 和 [DNT] 的宿主 MCP 调用、同对象的 bridge/CDP 视图。**为什么必须确认**：若只改调用端或 `tools/list`，handler 仍可能先绑定默认 profile，再把显式 B 的动作交给 A。
- **当前建议 / 倾向**：**A：保留能力路径。对已有对象的 HTTP 能力统一用 query `sandboxId`；宿主 MCP 工具统一用 `arguments.sandboxId`；两者进入同一对象解析和授权步骤。**
- **Reasoning**：同一个 HTTP 约定可覆盖零 body 的 GET/HEAD 与已有业务 body 的 POST，也不用维护两套路径台账。代价是所有目标型调用点和真实分派必须一起切，不能给漏改端留默认值。
- **问题（请 [业主] 裁决）**：是否按 A 硬切 HTTP/MCP 的目标承载和 owner 分派，还是选 B/C？
- **[业主]回答**：已确认 A（「业主同意你在 [第3轮] 的全部推荐」），冻结为 `T-O-41`。

**【对本问题的解读】**　例：`POST /nano-local-sandbox/lifecycle?sandboxId=B`，body 为 `{action:"start"}`；同一目标的 `sandbox.instance.start` 传 `arguments:{sandboxId:"B"}`。示例的 B 是不透明对象引用，不是容器名或访问凭证。先拿到正确的 B，再讨论它能否 start。

**【可选选项清单】**　**A**：HTTP query + MCP 参数；保留能力路由与生成台账。**B**：HTTP 以 `/sandboxes/:id/...` 对象路径硬切，MCP 仍用参数；对象层次直观，但必须明确修订能力路径合同并迁移路由匹配。**C**：HTTP 改用统一的目标 header，MCP 仍用参数；路径稳定，但导航、资源加载和不能附带自定义 header 的客户端需额外适配。不接受三种入口并存。

**【推荐选项的详细执行说明析】**

1. 先区分集合/全局请求与对象操作：可见清单、profile 目录及首次创建不假造已有目标；对象级读、写、终端控制则必须且只能声明一个目标。HTTP 能力不再从 body/header 寻找备用目标；MCP `/mcp` 是传输信封，按 `tools/call` 的 `arguments` 取值，不能用 `/mcp` URL 再传一个选择。缺失、空值、重复或冲突均不执行；不把 sessionId 当替代品。
2. 先走宿主请求准入，再以可信主体、动作及 `sandboxId` 校验对象范围；通过后才取对象上下文、driver、观测与服务端点。GET、HEAD、POST 与诊断推送都不能先读共用 `session` 的历史再过滤。bridge/CDP 等已绑定连接只服务已选对象；端点失效不得换引擎。JSON 应答标识实际目标；流或无 body 应答以建立时的绑定关联，不改帧格式来回显 ID。
3. [DNK]、[DNT] 与 provider 同切：更新公开工具 schema、校验及实际 handler；旧 env 缺参调用退役，不开 façade。对照验收：授权 A/B，在 A 请求发出后切到 B，A 的迟到结果不得更新 B；将 B 的 `terminalId` 配上 A 时，拒绝且不触达任一 PTY。本题不签发新凭证或预定新的 errorId。

**【推荐选项支持证据或其他选项的反例】**

- [lib/bindings.js:2–6](../../../../dsh-nano-local-sandbox/lib/bindings.js#L2-L6) 是生成的 exact 路由，`status` 的 GET/HEAD 为零 body；[同表:12–17](../../../../dsh-nano-local-sandbox/lib/bindings.js#L12-L17) 的 lifecycle 与 MCP 分属两条能力。只增加 POST body 字段无法覆盖读取面。
- [mcp-sandbox.js:80–99](../../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L80-L99) 生命周期只广告 session 参数，[同文件:207–217](../../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L207-L217) 拒绝未声明字段；[routes.js:1890–1901](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1890-L1901) 对 `term.*` 和其他工具实际分流。给调用方加 ID 而不改两条 dispatch 都不成立。
- [routes.js:1434–1457](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1434-L1457) 注册时捕获共享 `session` 并在处理前恢复其浏览器状态；[诊断推送:2550–2557](../../../../dsh-nano-local-sandbox/src/host/routes.js#L2550-L2557) 也取传入 session 的 base；[[DNK] index.js:1839–1845](../../../../dsh-nano-kitesurf/src/client/index.js#L1839-L1845) 今日只发 `{action}`。查询参数本身不能纠正这些取址点。

### Q31 — 终端创建与重新附着，是两种明确的 MCP 操作，还是继续走一次 `create`？

**驱动真相**：`T-O-38` 要求固定 sandbox，`T-O-39` 要求找回原执行、不续造新 shell；具体要修订的是 [DNLS01 `T-O-17`:64](DNLS01-qna.md#L64) 的工具清单、创建返回值与创建幂等粒度，不是重裁 [DNT] 本地 lane。

- **影响范围**：Case 1、3 的 [DNT] `McpLane`、[DNLS] 终端工具及环境内 broker。**为什么必须确认**：同一 pane 首次打开、用户另开新终端、网络中断后接回原终端，不能都被服务端解释成“若没有就新建”。
- **当前建议 / 倾向**：**A：`term.session.create` 只建立执行并返回稳定引用；新增 `term.session.attach` 只为已有执行取得这次连接。**
- **Reasoning**：多一次明确的附着调用，换来可直接验证的不变量：attach 路径不可能 spawn。即使建立连接失败，用户仍可区分“任务已创建”和“尚未接入”。
- **问题（请 [业主] 裁决）**：是否按 A 批准这项工具/schema 变更及下述创建键语义？也可选 B/C 或修订。
- **[业主]回答**：已确认 A（「业主同意你在 [第3轮] 的全部推荐」），冻结为 `T-O-42`。

**【对本问题的解读】**　目标 sandbox B、打开它的 pane P、其中运行的终端 T、这一次 WS 连接，是四个不同对象。另一个经授权的 pane 可附着 T；P 自己也可显式创建新的 T2。P 或 session 的 ID 都不是 T，更不是连接密钥。

**【可选选项清单】**　**A**：create / attach 两工具，首次打开先 create 再 attach。**B**：create 既返回稳定引用又发初次 attach 地址；后续独立 attach，不自动创建；省一次调用，但签发连接有两个入口。**C**：沿用一个工具但强制互斥 `new` / `attachOnly` 模式；调用少，schema 与权限分支较复杂。三者均不得为失联的旧终端偷偷 spawn。

**【推荐选项的详细执行说明析】**

1. `term.session.create({sandboxId,paneId,openId,service?,cwd?,cols?,rows?}) → {sandboxId,terminalId}` 为新建路径的核心形状；不再返回 attach 地址。`openId` 由调用者为一次明确新建生成，唯一键为 `(可信主体,sandboxId,openId)`；broker 将它与启动参数和执行引用关联，同键同参返回原引用，不同参拒绝，不再生成进程。经确认结束的创建不能靠旧键复活；用户要求新开才分配新键。此幂等规则不新增自动 retry 义务。已有策略设置或尺寸限制不能因换接口而放宽；service/cwd 由目标 driver 校验，不收任意宿主 env 或凭证。
2. `term.session.attach({sandboxId,terminalId}) → {sandboxId,terminalId,attach:{protocol,url}}` 只在对象关系、主体权限及原 broker/执行均确认后返回动态地址；失联报告不可确认，已结束报告结束，不转 create。list 在授权范围内返回稳定引用和状态、**不含 attach URL**。针对终端的 read/input/resize/close 均按二元引用校验；断开连接不是显式 close，重连不补发输入。可恢复布局只留稳定引用，不存临时地址。
3. [DNT] 保留通用 `McpLane`，调整创建/恢复分支；[DNLS] 由 broker 回答执行状态，kernel 不导入 [DNT] 私有实现。此题裁的是**控制面**：不靠另设 lane、给旧 create 留别名或改上游 pin 过渡。`attach.protocol` 的具体迁版、凭证时效与重连上限不在本题暗改，旧冻结项未被明确替换的部分仍有效。验收：同一 session 两次明确新建得不同 T；重复同键不多开；重启 [dsh] 后只调用 attach，原任务推进且 broker 的新建次数不增加。

**【推荐选项支持证据或其他选项的反例】**

- [[DNT] NanoTerm.jsx:215–219](../../../../dsh-nano-terminal/src/client/NanoTerm.jsx#L215-L219) 已为 pane 分配 `tid`，但[持久化布局:247–254](../../../../dsh-nano-terminal/src/client/NanoTerm.jsx#L247-L254) 仅为 local lane 回填 attach 引用。[McpLane.open:214–239](../../../../dsh-nano-terminal/src/client/lanes.js#L214-L239) 总是调 create，将返回 ID 和 WS URL 暂存在 lane 上；[实际连接:261–268](../../../../dsh-nano-terminal/src/client/lanes.js#L261-L268) 重用这个地址。这两条引用的寿命不同。
- [terminal-driver.js:15–28](../../../../dsh-nano-local-sandbox/src/host/terminal-driver.js#L15-L28) 当前工具表没有 attach，list 无对象参数，read/close 等只要求 `id`；[routes.js:1407–1430](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1407-L1430) 的生产分派确实按 `args.sessionId` 创建、按 `args.id` 操作，而不是已经有了未公布的二元定位。
- [term-bridge.js:23–36](../../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L23-L36) 按 session 复用，查不到就 spawn；[同文件:120–126](../../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L120-L126) 的 list 返回含 `url` 的 attach。把现有 create/list 当恢复 API，既混淆新建意图，也把连接信息放进了列表。

### 第三轮提问时的收口预判（历史记录）

**按当前完整范围，不应承诺第 4 轮收口；建议为第 5 轮留出空间。** 即使本轮三项均选 A，也只解决“台账认回对象、调用带上目标、创建与恢复分开”。下列仍是相互独立的公共取舍，而非写代码时可代决的参数：

| 尚无本阶段裁决覆盖的合同边界 | 为什么影响收口 |
|---|---|
| 生命周期、端口资源、幂等操作与失败恢复 | v1.3 的[对象状态机、错误、长操作：858–864](../dsh-nano-local-sandbox-v1.3.md#L858-L864) 和[增删、knobs、进度：871–880](../dsh-nano-local-sandbox-v1.3.md#L871-L880) 不等于已有 backend 的 [stop/start:163–170](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L163-L170)。删除是否释放既有卷、重建后如何恢复、响应超时与取消的区别影响数据及重放。Case 2 暂缓不自动取消平台生命周期进度合同。 |
| 对象授权、披露和审计 | [route-guard.js:21–25](../../../../packages/dsh-host-route-guard/src/route-guard.js#L21-L25) 明示 `sessionBinding` 只是元数据；[实际请求准入:263–272](../../../../packages/dsh-host-route-guard/src/route-guard.js#L263-L272) 不等价于 session/operator 字段披露、写权限及 attach 准入矩阵。 |
| terminal 数据面与服务描述 | [DNT 本地协商:149–179](../../../../dsh-nano-terminal/src/host/web-routes.js#L149-L179) 已有 v2 对齐；[MCP lane:263–290](../../../../dsh-nano-terminal/src/client/lanes.js#L263-L290) 并非同一握手。控制面拆分也不会自动生成 [v1.3:1380–1387](../dsh-nano-local-sandbox-v1.3.md#L1380-L1387) 的 service 健康/端口/版本与安全工作目录合同。 |
| fleet 观测与 UI 交付 | [backend-apple.js:194–197](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L194-L197) 是一次 stats 读取，不是跨 24h/7d/30d 的窗口；[package.json:34–38](../../../../dsh-nano-local-sandbox/package.json#L34-L38) 只登记 host bundle。[v1.3:884–891](../dsh-nano-local-sandbox-v1.3.md#L884-L891) 的入口、信息披露、操作反馈和安装边界未因此落定。 |

这是覆盖度判断，不是预定轮数或将事项自动延期。暂缓范围仍以 `T-O-34` 为准。第三轮全部答复后重新对照 v1.3 §7 与第一、二轮冻结项：**只有**剩余分歧确实能由三个独立且可一次裁决的问题覆盖，或已有可引用裁决 / [业主] 明确暂缓，第四轮才可能成为收口轮；否则续轮。不接受用一题打包互不相干的取舍来凑数。此刻不生成第四轮题目、选项或 Truth-ID，不输出正式计划。

## 6.1 ★ 中场评估 III（Round 3 → Round 4）

- **判定**：Q29–Q31 均为 A，无附加条件。上一轮没有批准另一套对象路径、新 lane 或平台授权服务。
- **已锁定真相**：持久台账回答“B 是谁”（`T-O-40`）；分派合同回答“请求去 B 而不是 A”（`T-O-41`）；终端引用回答“接回 B 的哪一个执行”（`T-O-42`）。三者不能互相替代：能读到 ID 或拿到 URL 不等于有操作权，终端能附着也不等于可以安全重启环境。
- **反方制衡**：单写者遇到不明状态会少做一次自动恢复；无隐式目标会使未适配客户端显式失败；分离 create/attach 增加一次调用。接受这些成本，是为了不靠重放、改投或新开 shell 换取表面成功。

- **为何进入第四轮**：重新沿 `/lifecycle` 到 backend、`requestRejection` 到对象 owner、`attach.url` 到 [DNT] 解帧三条路径核查。发现请求断开与动作取消不是一回事、请求准入不提供对象权限矩阵、MCP lane 收到二进制也不代表能解 v2。由三条已冻结合同各向下追一层，才得到本轮问题。

## 6.2 Round 4 —— executional：已定位对象上的执行合同（Q32–Q34）

本轮由 [业主] 直答，三项均已冻结；保留提问时的选项及证据。生效口径见 §1 的 T-O-43 至 T-O-45，不等于现行版本已经实现。

### Q32 — 生命周期写入是一次 HTTP 调用，还是一项可查询、不可重复派发的操作？

**驱动真相**：`T-O-40` 已要求先记意图、现场复核后提交；`T-O-41` 已固定目标。剩余分歧是：调用返回前断线，控制面如何解释这笔写入。

- **影响范围**：create/start/stop/restart/recreate/remove，以及因资源调整需重建的动作。**为什么必须确认**：已停、待启动的 restart 与完全没执行的 restart 不能用同一个“再试一次”处理。
- **当前建议 / 倾向**：**A，同一 sandbox 的生命周期写串行化，以持久操作记录回报进度和结果。**
- **Reasoning**：`restart` 是两次有副作用的调用。HTTP 只能说明调用者有没有等到应答，不能证明整个重启完成、没发生或已撤回。
- **问题（请 [业主] 裁决）**：是否批准 A 的操作键、状态和取消边界，由 HTTP/MCP 共用，不用 trace 或健康布尔值替代操作结果？
- **[业主]回答**：已确认 A（「业主同意你在 [第4轮] 的全部推荐」），冻结为 `T-O-43`。

**【对本问题的解读】**　例：已停止 B，启动 B 前 [dsh] 退出。现场“B 已停止”可信，但不能推断这次 restart 已完成，更不能静默再停再启。对象运行态、动作进度、请求是否断开是三种事实。

**【可选选项清单】**　**A**：受理后有持久操作引用及阶段，调用者查询而非重放；多一次入账。**B**：同步等待终态，断线后一律由 operator 核对现场和既有意图；简单，但跨重启不能给消费者完整进度。**C**：登记期望配置，由后台持续自动收敛；适合声明式配置，不适合不带新授权就重做 restart/remove，与 `T-O-40` 的未决不重放冲突，不推荐。

**【推荐选项的详细执行说明析】**

1. 调用者每次明确写入提供 `requestId`。在同一 env 以 `(可信主体,requestId)` 去重，绑定不可变指纹（动作、已选 sandbox 或首次创建参数、规范化参数）；同键同参只返原操作，同键异参拒绝。创建先分配 sandboxId 并与意图原子入账再调 backend；首次应答丢失，用同键取回原引用，不另建。查具体对象/操作仍遵守 `T-O-41` 与对象授权。去重依据与意图同属 `T-O-40` 台账，不从审计列表恢复执行；不因对象删除而把旧键当新创建。
2. 受理返回 `{sandboxId,operationId,action,state,step}`，未结束的 HTTP 返回 `202`，MCP 投影同一文档。拟定 `accepted → running → succeeded / failed / indeterminate`；`accepted` 尚未派发时可显式取消至 `cancelled`，与派发原子互斥。已派发后拒绝取消并返回现态；断线、响应超时均不是取消，不增加写重试。已知副作用但目标未达标报失败并保留步骤；无法证实报未决，只读核实，不补发。相同目标有未决写时不接受冲突动作。
3. 已 running 的 start、已 stopped 的 stop 不产生第二次动作；restart 不是无条件可重放。start/recover 不得暗含 remove。recreate 要独立授权，先核资源、卷与镜像，再明确中断原终端；remove 只移除经核实的后端对象并在确认后释放端口，**默认保留卷**（收窄草案 A2 的自动释放表述）。不借本题批准删卷接口；接管卷尤其不能因删除对象而清空。验收：断线后查询只见同一操作；若 stop 成功而 start 失败，结果不得是 running/succeeded。

**【推荐选项支持证据或其他选项的反例】**　[backend-apple.js:163–182](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L163-L182) 的 restart 实为 stop + start，inspect 又区分缺失与异常；[routes.js:1458–1471](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1458-L1471) 却把连接中断标作请求 trace 的 `cancelled`，且只留 200 条。[routes.js:648–650](../../../../dsh-nano-local-sandbox/src/host/routes.js#L648-L650) 可返回 blocked，[同文件:1653–1661](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1653-L1661) 的生命周期应答仍设置 running；[漂移分支:674–697](../../../../dsh-nano-local-sandbox/src/host/routes.js#L674-L697) 会移除重建。这些是分开记账的理由，不是现行异步能力。既有 [T-O-29](DNLS02-qna.md#L47-L47) 的响应超时语义保持。

### Q33 — 通过宿主准入后，operator、绑定 session 和无绑定主体各能看到、操作什么？

**驱动真相**：`T-O-40` 给出归属，`T-O-41` 要求分派前核权，`T-O-42` 要求 attach 单独核终端归属。本题给三个入口同一份**对象授权和披露矩阵**。

- **影响范围**：fleet、detail、生命周期、终端控制及 WS 准入。**为什么必须确认**：多个 session 可以共享 B 的页面，不表示它们也共享彼此的交互终端、宿主路径或控制 B 的权利。
- **当前建议 / 倾向**：**A，身份来自宿主，权限按 env/sandbox/terminal 分层；无可信上下文不放行受限动作。**
- **Reasoning**：本机单用户不等于 UI、agent、连接中的终端皆有相同权限。不能用调用者自报的 sessionId、paneId、角色或 `sandboxId` 推导可信主体，也不应让插件自己发长期 operator 密钥。
- **问题（请 [业主] 裁决）**：是否采用 A 的矩阵、未授权时的披露边界及宿主依赖约束？
- **[业主]回答**：已确认 A（「业主同意你在 [第4轮] 的全部推荐」），冻结为 `T-O-44`。

**【对本问题的解读】**　一次操作须过三关：宿主是否接纳该请求、能否把它绑定到可信主体、该主体是否能对具体对象做该动作。`policyFingerprint` 只说明策略是否改变，不是第三关的许可证。

**【可选选项清单】**　**A**：按主体、动作、对象投影同一矩阵；兼顾人工管理与会话隔离。**B**：仅 operator 使用全部受限面；简单，却让 [DNK]/[DNT] 的普通 session 无法消费。**C**：仅绑定 session 能操作，operator 也必须先加入该 session；会把“无 agent session 的人工管理”变成假会话，与既有裁决冲突。

**【推荐选项的详细执行说明析】**

| 宿主确认的主体 | 可发现 / 可读 | 可写 / 不授予 |
|---|---|---|
| 本 env operator（无需 agent session） | 本 env 受管对象的运维详情、资源、服务和脱敏操作时间线；可只读发现未纳管资源 | 可显式创建、接管和管理受管对象；运维权限**不自动授予读取、附着或向他人终端输入**。 |
| 获准绑定 B 的 session | 只列获准对象；B 的服务及共享 page/history 按既有能力与写锁公开；终端仅列自己拥有或另获授权者 | 可按既有授权使用 B、创建自己的终端；attach/read/input/resize/close 另核 `(主体,B,T,动作)`。不因绑定而获得 env 启停/删除、其他 session 的终端或全机日志。 |
| 无可信主体、无对应绑定，或所需策略无法判明 | 不返回受限字段或全机计数；不把“空”冒充已成功读取 | 不签 attach 地址，不调用 backend/broker。已认证但目标不可见与目标不存在对调用者给相同 404；可见对象上无动作权限给 403。宿主请求准入拒绝沿用宿主结果。 |

- 对象可见性在列表、聚合计数、分页与 push **之前**过滤。默认视图不含真实挂载源、终端字节、私密环境变量、连接 token；诊断和审计只留可信主体引用、目标、动作、结果及操作引用，不落 attach URL 或输入内容。拒绝也不泄漏目标存在性。
- 只从正式宿主接口取得可信身份；本次源码核查只证实准入和策略接口，**未证实当前插件已经取得请求级 operator/session 证明**。不能证明时报告宿主能力依赖，不用 localhost、请求头自报角色、硬编凭证或插件私道补洞。签发及使用 attach 时均校验目标/权限，撤权后不允许保持写入。这里批准的是矩阵，不臆造 [dsh] 的接口名。
- 验收：operator 无 agent session 仍可管理自己的 env；甲乙获准使用同一 B，甲的终端不出现在乙的列表；甲失去授权后，既不能重附着也不能继续写。HTTP、MCP 和 WS 得出相同的权限结果。

**【推荐选项支持证据或其他选项的反例】**　[route-guard.js:263–280](../../../../packages/dsh-host-route-guard/src/route-guard.js#L263-L280) 是请求拒绝与 method 检查，不返回 operator/session 授权；[`sessionBinding`:21–25](../../../../packages/dsh-host-route-guard/src/route-guard.js#L21-L25) 仅为元数据。[routes.js:1379–1404](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1379-L1404) 的策略不可得时并不报告 stale，因此“非 stale”不是主体证明。[instance-registry.js:105–116](../../../../dsh-nano-local-sandbox/src/host/instance-registry.js#L105-L116) 的 list 已省略挂载源，却仍返回 session、容器名和 endpoints；[终端分派:1425–1430](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1425-L1430) 对 list/audit 调用同一列表函数。以上描述现有分派，不把它当新授权来源。

### Q34 — `attach.protocol` 对 [DNLS] 沙箱终端选什么版本，重连后的第一屏如何与原 PTY 对齐？

**驱动真相**：`T-O-42` 固定 attach 只返回已有执行的动态连接，`T-O-39` 要求原程序继续。本题补上控制面没有裁决的 **wire 合同**，不重开 create/attach 或另造 lane。

- **影响范围**：[DNLS] broker/WS 端与 [DNT] 通用 `McpLane`。**为什么必须确认**：今天 MCP 客户端把每个 binary payload 当作可显示字节，发送端单改成 v2 会把帧头也送进终端。
- **当前建议 / 倾向**：**A，对升级后的 [DNLS] 端点硬切 `dnt-ws-v2` + `align:1`，重连发当前屏快照再接增量。**
- **Reasoning**：长任务是否活着与客户端能否准确重画是两个验收条件。断连期间大量输出后，旧尾巴即使能回看，也不能替代有序号的当前屏。
- **问题（请 [业主] 裁决）**：是否批准 A 对 `T-O-17` 的定点改约，只替换 [DNLS] 沙箱连接的 v1 wire 及恢复方式，不改变 [DNT] 本地或第三方端点的既有合同？
- **[业主]回答**：已确认 A（「业主同意你在 [第4轮] 的全部推荐」），冻结为 `T-O-45`。

**【对本问题的解读】**　broker 继续持有原 PTY，attach 只恢复这一条连接的显示、流控和输入。确认 `ready` 不等于已恢复画面；只有已消费与原执行一致的快照/增量才能退出“对齐中”。

**【可选选项清单】**　**A**：目标端点只供 v2 + align，版本不符显式拒绝；一次协同更新。**B**：同一 [DNLS] 端点长期维护 v1/v2 协商与两种恢复路径；可容纳旧客户端，但持续背负两种屏幕语义。**C**：保留 v1 原始流并声明只能接收从现在开始的字节；无需解帧，却不能承诺多 pane 重连后的当前屏一致性。

**【推荐选项的详细执行说明析】**

1. [DNLS] 返回的 `attach.protocol` 固定 `dnt-ws-v2`。使用 server 给的 URL，WS 首个 `open` 载 `v:2,align:1,session:<terminalId>`（此处 `session` 是既有 wire 字段，不是 [dsh] 会话）；与已授权对象不符则拒绝。`ready` 回显同一终端和版本/对齐模式，不匹配即停止，不重试 v1。协议按公告分派，不按插件名、URL 特征或私有 import 分支。通用 MCP lane 对其他合法端点不被迫弃用它们自己的协议。
2. 沿用 [DNT] 的 framed channel、CREDIT、RESIZE、FACTS、AUTO_INPUT、PING/PONG；各附着连接独立流控、不阻塞另一 pane。快照由持有 PTY 的环境侧持续维护的屏幕投影产生，含序号、几何、光标、文本；随后只显示同一序列中晚于该快照的 DATA。停顿或序列断裂先重新对齐，不把 SNAPSHOT 当原始字节，不拼“旧 replay + 新快照”；不能获得可信当前屏就报告未对齐。AUTO_INPUT 与人工输入分流不免除写权限。这里不是全量历史录屏、样式无损或命令重放承诺。
3. 仅 transport 断线沿用既有至多一次自动重连：**重新走已授权的 `attach` 取当前地址**，不复用过期地址、不调用 create、不补发用户输入。权限拒绝、版本不符、原执行结束或响应超时不自动重跑。关闭 WS 只 detach，显式 close 才终止原终端。验收：让 B 的 T 在两个获准 pane 上显示，暂停一个 pane 后恢复，收到 SNAPSHOT 再显示后续 DATA；另一 pane 不受牵连，新输入推进同一任务。

**【推荐选项支持证据或其他选项的反例】**　[DNLS term-bridge.js:44–55](../../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L44-L55) 只回复 `ready.v=1` 且 binary 直入 stdin；[DNT lanes.js:263–290](../../../../dsh-nano-terminal/src/client/lanes.js#L263-L290) 的 MCP 接收端直送 `onOutput`，[同文件:293–304](../../../../dsh-nano-terminal/src/client/lanes.js#L293-L304) 断线后调同一连接函数。相反，[本地 web-routes.js:149–179](../../../../dsh-nano-terminal/src/host/web-routes.js#L149-L179) 已有 ready、align、detach 与恢复分支，[ws.js:77–105](../../../../dsh-nano-terminal/src/host/ws.js#L77-L105) 定义帧通道，[align.js:55–86](../../../../dsh-nano-terminal/src/shared/align.js#L55-L86) 分辨快照及过期数据。可复用的是公开语义，不是本地 lane 的宿主进程或私有模块。

### 第四轮提问时的收口预判（历史记录）

**按完整 v1.3 范围，不把第 5 轮视为确定的收口轮；当前建议预留第 6 轮。** 与上一轮相比，若 Q32–Q34 全选 A，可从未定清单划掉“断线后动作如何认账”“谁能看/动目标”“attach 后用哪种 wire”。但下面仍有不同归属、可分别否决的边界：

| 当前余量（不是未来轮次分配） | 已有依据与仍需裁决之处 |
|---|---|
| 服务与端口的分配/描述 | [profile.yaml:25–33](../../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L25-L33) 有 engine/bridge 服务，[routes.js:1114–1127](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1114-L1127) 却推算相邻端口。台账有预留字段，不等于第二个 sandbox 已有端口冲突、服务版本/健康及 service→cwd 合同。 |
| 资源变更、升级与存量回滚 | [driver/reconciliation.js:38–56](../../../../dsh-nano-local-sandbox/profiles/kitesurf/driver/reconciliation.js#L38-L56) 已能比较镜像/卷与保留发布端口；[v1.3:924–932](../dsh-nano-local-sandbox-v1.3.md#L924-L932) 要求接管与快照回滚。操作可查询不等于已决定资源覆盖、可验证后端代次、失败后的版本/卷切回及哪些新错误进入单一目录。 |
| fleet/detail 的观测数据合同 | [backend-apple.js:190–197](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L190-L197) 有单次读取；[v1.3:871–879](../dsh-nano-local-sandbox-v1.3.md#L871-L879) 要进程、服务、部署和时间窗。事实何时采、缺样与真实零如何区分、如何按对象聚合，不由一次 stats 调用决定。 |
| 面板的发行与消费硬切 | [package.json:34–38](../../../../dsh-nano-local-sandbox/package.json#L34-L38) 只有 host bundle；[v1.3:884–892](../dsh-nano-local-sandbox-v1.3.md#L884-L892) 要求只装 [DNLS] 也能打开管理页。入口归属、安装合同及消费迁移，与选哪种统计口径不是同一个决定。 |

收口按合同而非按日期：第四轮答复后重查这些边界；若已有冻结项或 [业主] 显式暂缓能消去至少一个独立边界，其余又能由三项清晰裁决覆盖，则第五轮**可以**收口。否则续轮，不挤题、不擅自缩范围。正式宿主主体来源等实现依赖应区分：合同与失败行为已定的依赖可在计划标明，不因缺一次实机测试强加一轮；仍需宿主公共合同决定的不能算已冻结。Case 2/4 继续按 `T-O-34` 暂缓；本次不生成下一轮题号、选项或正式计划。

## 6.3 ★ 中场评估 IV（Round 4 → Round 5）

- **判定**：Q32–Q34 均选 A，无附加条件。写操作未决不重放、对象权限不从地址推断、显示恢复不从旧输入重放，分别可追溯到 `T-O-43/44/45`。
- **已解决的分歧**：B 的 restart 中途失联，查原操作而非再 restart；两人共享 B 不表示甲能接乙的 T；T 活着不表示屏幕已经对齐。控制结果、权限和画面各有自己的事实依据，不能由一个 `ok` 代替。
- **代价与限制**：部分失败需要显式处理；没有正式主体来源时受限操作不能交付；旧沙箱 v1 客户端必须协同升级。接受这些代价，但没有批准不可逆删卷、插件自发 operator 密钥、兼容别名或新 release-gate。

- **为何进入第五轮**：冻结后重走了三条此前没有裁完的链路：服务声明 → 发布端口 → probe/终端；官方 pin → runtime/image 检查 → 移除和重建；单次 stats → 观测存储 → 读者视图。结论不同：服务有名字，却可能探错端口；镜像可用，不证明能保住旧卷；配置了 4G，不等于用过 4G。以下问题只裁这些差额。

## 6.4 Round 5 —— executional：服务、变更与用量如何对应到同一对象（Q35–Q37）

本轮由 [业主] 直答，三项均已冻结。保留提问时的备选与证据；生效口径见 §1 的 T-O-46 至 T-O-48，不等于已实现或已做实机验证。

### Q35 — [DNLS] 按 env 分一对端口，还是按所选 sandbox 的每个服务独立发布、探测和打开终端？

**驱动真相**：`T-O-40/41` 区分预留与实况并锁定目标；`T-O-43` 规定端口何时释放；`T-O-44/45` 要求获准才能附着且接回原终端。Case 3 还缺一个可实际消费的服务引用。

**【对本问题的解读】**　A、B 都声明 `engine` 与 `mcp-bridge`。即便 B 的 engine 已健康，B 的 bridge 也可能未发布、更换了 host 端口或未就绪。`service` 是 B 内的上下文，不是另一台机器。选定 B/engine 打开的 shell 应进入该服务的容器内工作目录，不是登录 workerd isolate。

**【可选选项清单】**　**A（推荐）**：每个服务独立预留和验证发布，端口可不相邻，service ID 是跨层引用。**B**：backend 动态分配任意可用端口；只在创建后 inspect 取得实际映射，重建可换号。分配容易，但须明确替换已冻结的先预留语义。**C**：每对象预留固定连续块，再由显式 service 表分槽；便于人工认端口，但块大小限制新增服务，空闲槽也占用；同样不得凭邻号探测。

**【推荐选项的详细执行说明析】**

1. `services[]` 的标识为 `(sandboxId,serviceId)`；profile 声明稳定 service ID、容器端口/协议及允许的默认工作目录/探针，版本声明可为空。driver 据此给出 `declaredVersion`、`observedVersion`、`health`、`observedAt` 和实际发布情况。无探测证据就标未知；镜像 tag 或 wrangler 包版本不是 engine 进程版本。按该 sandbox 的 profile 选择 driver，不再用“首个声明 CDP 的 profile”代表所有对象。列表中的服务不会自行发 terminal 凭证。
2. 新建时按 env 显式分配的 host 端口范围，在 `T-O-40` 的意图提交内，按服务整组预留未占用的 `(loopback 地址,传输协议,hostPort)`，不要求相邻。env 范围须避免重叠；同 env 的所有 profile 共用该根的预留检查，不为每个 driver 各建池。预留不代表占到了 OS 端口：外部进程抢占、池不足、实际映射不符时不公布成功地址。已知未创建才回收本次预留；部分创建/不确定则保留预留并按原 operation 核对，不换号暗中重发 create。已停止对象仍保留分配；受管删除确认后才释放。授权接管记录**实际**发布，不挪旧端口适配新区间。
3. probe、bridge、CDP、服务详情均从**同一已验证对象**的 inspect 映射取址，不读历史 `httpBase` 兜底，不做 `enginePort + 1`。无实际映射与探针探得不健康是不同状态。终端只给 `T-O-42` 的 create 增加已批准的 `service` 上下文：由目标 driver 在容器内解析允许的 cwd（含实际路径边界校验），不接受客户端提供的宿主路径或任意 env；不支持的服务明确拒绝，不换到另一个 shell。之后仍按 `(sandboxId,terminalId)` 重附着，不按服务名新建。
4. **辨别用例**：B 的 bridge 与 engine 不相邻，另一个服务恰占邻号。B 只能报告自己的 bridge；若 B 的发布消失则显示不可用。打开 B/engine 后只重启 [dsh]，仍能回到该终端；刷新服务表不会重启任何程序。

**【推荐选项支持证据或其他选项的反例】**

- [profile.yaml:25–31](../../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L25-L31) 声明两个不同服务；[profile-drivers.js:138–149](../../../../dsh-nano-local-sandbox/src/host/profile-drivers.js#L138-L149) 却只按 env/tag 计算两路 host 端口。[routes.js:431–440](../../../../dsh-nano-local-sandbox/src/host/routes.js#L431-L440) **已经分别找到了** engineRow、bridgeRow，但探测用的 bridgeBase 仍来自 engine 的 httpBase；[实际算式:1114–1127](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1114-L1127) 为端口加一。给面板换列名不会修好这条链。
- [profile-drivers.js:76–89](../../../../dsh-nano-local-sandbox/src/host/profile-drivers.js#L76-L89) 按 root 取 browser profile；[entrypoint.sh:31–45](../../../../dsh-nano-local-sandbox/profiles/kitesurf/entrypoint.sh#L31-L45) 实际进入 `packages/engine` 后启动 wrangler；[backend-apple.js:287–293](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L287-L293) 的 PTY 调用只有容器名和 `/bin/sh`。已有容器终端不是已实现服务上下文的证据。

- **问题（请 [业主] 裁决）**：是否选 A，冻结服务引用、端口分配寿命及 probe/终端共用的服务解析规则？
- **[业主]回答**：已确认 A（「业主同意你在 [第5轮] 的全部推荐」），冻结为 `T-O-46`。

### Q36 — 调整资源或升级镜像时，何时切换生效，失败后究竟能回滚什么？

**驱动真相**：`T-O-40/43` 要求单写者、独立授权的重建、未决不重放和默认保卷；`T-O-45` 只保证原执行仍在时重附着。尚未决定“保卷”是否等于“数据和进程都能回到旧版本”。

**【对本问题的解读】**　把 B 的内存改为 6G 或换一个 pin，至少涉及三样不同的东西：期望配置、当前实际安装的版本、持续被写入的数据卷。旧镜像还在并不能证明旧程序能读被新版本改过的卷；把期望值写入 registry 也不能证明 backend 已成功应用。

**【可选选项清单】**　**A（推荐）**：保存候选修订与变更清单，显式提交一次换代；配置回退和数据恢复分别授权。**B**：修改即安排一次已明确授权的重建，没有单独的候选/应用步骤；交互较短，但连续编辑可能反复中断终端。**C**：蓝绿双实例验证后切换服务；减少停机，但需要额外配额、端口和明确的数据写者切换，不能把同一可写卷挂给两边。

**【推荐选项的详细执行说明析】**

1. 在同一对象行持有 `desiredRevision` 与最近核实的 `appliedRevision` 引用；后者是消费回执，不是另一份配方或恢复脚本。变更请求携带 `expectedRevision`，旧修订的编辑不得盖过新编辑。CPU/内存的 profile 默认及对象覆盖值分开显示；正数、单位、上限按 profile/backend 验证，超界拒绝不静默截断。空闲策略可在受支持时仅更新策略，不即时扫停活跃终端；网络/挂载只准从宿主策略与 driver 已声明且可验证的能力中选择，不放宽已有隔离，不支持就标不可用。保存只报告影响和是否需重建，**不启动、不构建、不停旧对象**。
2. operator 明确确认目标、候选修订、停机/终端影响与卷计划后，以 `T-O-43` 的 `requestId/operationId` 执行一次。先核对当前后端实例身份、实挂卷、预留端口、候选 pin 与 runtime 回执、实际镜像 digest，以及回退所需旧产物是否可用；旧代次有歧义，或承诺的保护条件未满足，不移除旧实例。配方摘要不是镜像 digest，镜像 tag 也不是代次。只有同一 `sandboxId` 的新建代次、实挂载、资源和服务就绪都经验证，才推进已应用指针。失败保留候选、最后核实回执及实际阶段；已移除旧实例时不再显示“旧版仍在运行”。
3. 资源重建默认沿用已核实的卷；**配置回退**是显式的新操作：指定上一个已核实的不可变产物和覆盖值，在当前卷确认兼容时才可回切，产生新的容器代次。可能迁移数据格式或迁卷时，切换前须让旧写者静止，留下可验证、只读的卷快照及其引用；无安全快照能力则拒绝该类升级。若需**数据恢复**，须另行确认恢复点和会丢失的后续写入，在隔离目标验证后再切唯一写者；不自动覆盖现卷、不把只读快照当第二份可写真源。接管本身不迁卷。二者都不复活旧 PTY，不重写官方 pin。
4. **辨别用例**：候选缺镜像时，旧 B 和其终端不应被停掉；新代次已创建而健康验证失败时，结果不得是“已应用”，也不得自动拿旧镜像读不兼容的新数据。部署查询可报缺的是哪项证据，不把 receipt 本身当可执行恢复包。

**【推荐选项支持证据或其他选项的反例】**

- [profile-registry.js:51–61](../../../../dsh-nano-local-sandbox/src/host/profile-registry.js#L51-L61) 明确配方摘要不含 manifest/driver；[build-profile.mjs:30–45](../../../../dsh-nano-local-sandbox/scripts/build-profile.mjs#L30-L45) 的 readiness 是 runtime 与 image 两项，[backend-apple.js:111–119](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L111-L119) 只 inspect tag 就返回。不能把现行 `ready:true` 当作新代次或可回滚卷已核实。
- [runtime.js:75–99](../../../../dsh-nano-local-sandbox/profiles/kitesurf/driver/runtime.js#L75-L99) 校验官方 ref 与派生文件；[挂载:103–110](../../../../dsh-nano-local-sandbox/profiles/kitesurf/driver/runtime.js#L103-L110) 将只读 runtime 和可写 state 分开。[routes.js:674–697](../../../../dsh-nano-local-sandbox/src/host/routes.js#L674-L697) 的漂移处理会 stop/remove/create；[页面快照:820–829](../../../../dsh-nano-local-sandbox/src/host/routes.js#L820-L829) 保存浏览器存储/cookie/URL，并非后端卷快照。沿用构建责任与 pin 纪律见 [DNLS02 T-O-31](DNLS02-qna.md#L49-L49)。

- **问题（请 [业主] 裁决）**：是否选 A，以显式应用及复核为换代边界，且不把配置回退授权解释成数据恢复授权？
- **[业主]回答**：已确认 A（「业主同意你在 [第5轮] 的全部推荐」），冻结为 `T-O-47`。

### Q37 — 面板无人打开时是否继续采样？24h / 7d / 30d 的“缺读数”和“实际为零”如何区分？

**驱动真相**：`T-O-40` 区分期望与实测，`T-O-43` 将换代与未决操作绑定到对象，`T-O-44` 要求先按对象核权再汇总。现要决定的是时间窗里的数字由谁产生、能解释什么。

**【对本问题的解读】**　B 配了 4G 内存只说明上限。昨天只有半天有 stats，并不表示另外半天占用为零；B 更换容器后 CPU 累计计数还可能从头开始。用页面刷新驱动用量，最少被看的对象反而最像“没有使用”。

**【可选选项清单】**　**A（推荐）**：[DNLS] 在宿主运行期间按固定周期采集并持久保留有界读数；窗口返回数值和覆盖度。**B**：只在用户查询时取样并如实显示稀疏历史；成本低，但两个相同负载的 sandbox 结果取决于谁打开过面板。**C**：只返回当前 stats，不承诺历史窗；最简单，但须 [业主] 显式收窄 v1.3 的 T7/A5，不能把一张实时卡称为 30 天用量。

**【推荐选项的详细执行说明析】**

1. 每个受管 env 只有一个 [DNLS] 采样写者；按 UTC 每分钟至多为每个已核实的 sandbox/后端代次采一次。记录时间、代次、来源和每项可得指标；同对象同分钟不因 HTTP、MCP、页面切换而增加样本。保留最近 30 天的分钟槽；跨宿主重启可读，超保留期自然淘汰。每对象的槽数与对象数/存储预算均须有界，容量不足明确暴露缺口，不谎称完整。它是读数的唯一持久源，**不是**控制台账、operator 审计或发布端口的恢复源；三个时间窗查询同一份数据，不写三份可恢复汇总。
2. 窗口截止到最近完成的 UTC 分钟，按半开区间 `[end-window,end)` 查询。内存用量报实测 bytes 的有效样本均值/峰值，标明不是配置上限；CPU 以 *core* 表示（一个核用满为 1）。若 backend 只给累计 CPU 时间，仅同一代次、同一连续采样段内相邻分钟的有效点作差，以 CPU 时间增量除以真实经过秒数，窗口均值按有效时长加权。首次读数、计数倒退、换代、重启造成的断段都不用跨界差值；不明确的单位不猜。已停、未获读数、backend 失败、真零要能区分，不做零填充或静默插值。
3. 每指标返回单位、有效槽数/应有槽数、统计值或 `null`；分母是窗口内与已纳管寿命相交的完整分钟槽（含停机、采集失败），未创建时段不算作缺样。不同代次的已验证片段可归同一 `sandboxId` 查询，但不拼接计数器；缺口和有限覆盖显式显示。先按 `T-O-44` 限定读者及历史可见范围，再作 fleet 投影；只对同分钟可见对象的**同单位可加量**求和，并带贡献对象数/应有对象数。部分总量标部分；没有读数返回 `null`，不以全机读数减去隐藏对象反推。进程表、终端屏幕、命令行、token 不随 CPU/内存分钟采样入库。
4. **辨别用例**：B 的 CPU 计数同代次 60 秒增加 30 CPU 秒，该段为 0.5 core；下一分钟断采，不摊成两个 0.25；新代次首点不能产生负值。同一分钟若 A 没有读数、B 实测为 0，可显示 B=0、fleet 部分覆盖，不能显示“两台都为零”。

**【推荐选项支持证据或其他选项的反例】**　[backend-apple.js:190–197](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L190-L197) 的 stats 是单次 `--no-stream --format json`；[inspect-kitesurf-container.mjs:4–10](../../../../dsh-nano-local-sandbox/scripts/inspect-kitesurf-container.mjs#L4-L10) 只是按**容器名**调用并打印，不存在由此可推得的时间窗或单位。[routes.js:218–237](../../../../dsh-nano-local-sandbox/src/host/routes.js#L218-L237) 读取的是配置的 cpus/memory；[诊断推送:2583–2599](../../../../dsh-nano-local-sandbox/src/host/routes.js#L2583-L2599) 推的是有界诊断尾部，不是可恢复的资源时序。包合同还明确 [不持有 `/perf-review/host`](../../../../dsh-nano-local-sandbox/AGENTS.md#L83-L88)；不把插件自身的性能计数充当 sandbox 采样。

- **问题（请 [业主] 裁决）**：是否选 A，承诺后台有界采样、上述窗口/单位/覆盖度口径及授权后的聚合，而非“未采即零”？
- **[业主]回答**：已确认 A（「业主同意你在 [第5轮] 的全部推荐」），冻结为 `T-O-48`。

### 第五轮提问时的收口预判（历史记录）

**当前判断：第 6 轮可以争取收口，但按完整范围尚不能认定足够，应预留第 7 轮。** 若本轮全选 A，前轮列出的服务/端口、变更/回退、资源用量三块已有执行口径，不应在后轮换名再问。以下是判断容量的依据，不是下一轮的问题或选项：

| §7 剩余边界 | 为何不能按“已有代码”销账 |
|---|---|
| 可消费的对象与 fleet/detail 文档（P1/P2、A1/A6/A7/A9） | [v1.3:871–879](../dsh-nano-local-sandbox-v1.3.md#L871-L879) 要求对象级进程、host 与 fleet；[backend-apple.js:190–197](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L190-L197) 只有 backend 读取原语。使用量可按对象相加，不等于已定义多 env 的可见清单、对象运行态与操作态的投影、进程上限及字段披露。 |
| 对外版本、失败及登记（P3/P7/P8、T9） | [initialize:1871–1877](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1871-L1877) 的版本是 MCP 协商/包版本，不是 sandbox 对象版本；[error-catalog.js:103–118](../../../../dsh-nano-local-sandbox/src/host/error-catalog.js#L103-L118) 有唯一目录，不代表新冲突/耗尽/升级错误已获准。生成的 [bindings:11–16](../../../../dsh-nano-local-sandbox/lib/bindings.js#L11-L16) 有 lifecycle，而 [perf 声明:16–23](../../../../dsh-nano-local-sandbox/src/perf/declaration.json#L16-L23) 仍列旧标识。须分清新增公共约定与既有台账的机械生成。 |
| [dsh工作台] 交付边界（U1–U7） | [本包安装身份:13–18](../../../../dsh-nano-local-sandbox/AGENTS.md#L13-L18) 当前无浏览器入口，与 [v1.3:884–892](../dsh-nano-local-sandbox-v1.3.md#L884-L892) 的独立可安装管理入口还差一次裁决。不能让 [DNK]/[DNT] 成为必装依赖，也不能从设计图反推扩包授权。 |
| 一项**可能额外**的公共合同：attach 准入/凭证 | `T-O-42/44/45` 已冻结何时核权、撤权及帧行为，不等于批准新凭证面。[term-ws.js:63–85](../../../../dsh-nano-local-sandbox/src/host/term-ws.js#L63-L85) 现有 upgrade 校验请求目标，[routes.js:2533–2541](../../../../dsh-nano-local-sandbox/src/host/routes.js#L2533-L2541) 的宿主拒绝检查也不能单独证明可信主体可传到 broker。若可直接使用正式宿主合同满足这些语义，不为内部适配单独占题；若须新票据、对外时效或新的宿主接口，则须另裁，不得藏进 UI 或版本号。 |

第五轮全部答复后，再把未决公共取舍逐项对应到已有 Truth-ID、[业主] 明确暂缓或待裁项。若仅余不超过三个可独立签字的决定，第六轮即可完成冻结；若仍多于三个（或其中必须拆出独立的新合同），则续轮。无需把缺一次实测、存储引擎选型或生成脚本实现升格成新闸门。Case 2/4 仍按 `T-O-34` 暂缓；现在不写第六轮题目或正式计划。

## 6.5 ★ 中场评估 V（Round 5 → Round 6）

- **判定**：Q35–Q37 三个 A 均无附加条件获准；第五轮结束。服务已经预留端口、候选镜像已就绪、内存上限已配置，这三件事都不是现场结果。
- **锁定的界线**：服务是否可连看该服务的实际发布（`T-O-46`）；新版本是否生效看该对象最近核实的修订及实际代次（`T-O-47`）；用量是否可信看实测单位、窗口与覆盖度（`T-O-48`）。消费者应读这些事实，不自行推端口、推进指针或补零。
- **代价与限制**：端口不确定要保留预留，升级前置不足要拒绝，有界采样要承担后台成本且可能留空。这些均优于串到邻居、覆写卷或画出一条虚假的零线；不是新建私有通道或另设发布闸门的理由。

- **冻结后复查**：从 profile 选定的 B 追到 HTTP/MCP owner、bridge 快照接收、消费端页签，读到三处尚未裁决的边界：即使知道 B 的实况，也需规定 fleet 取哪一组对象、bridge 何时必须丢弃旧投影；即使能列出工具名，也不能证明客户端理解相同的合同；即使能注册一个页签，也不能借此把 [DNK]/[DNT] 变成 [DNLS] 的安装依赖。以下三题对应这三处，不重问端口、回退或采样算法。

## 6.6 Round 6 —— executional：怎样把同一个 sandbox 的事实交到消费者手里（Q38–Q40）

本轮由 [业主] 直答，三项均已冻结；保留提问时的建议与证据。生效口径见 §1 的 T-O-49 至 T-O-51，不等于已实现。证据区分当前代码、v1.3 目标与推荐变更；以下路径沿用 `T-O-41` 的能力寻址，不恢复草案的对象路径或默认目标。

### Q38 — fleet 的一行、详情与 bridge 的读数，怎样证明是同一对象的事实？

**驱动真相**：`T-O-46` 给出服务实况，`T-O-47` 区分候选与已应用，`T-O-48` 定义带覆盖度的用量。`T-O-40/41/44` 限定身份、路由及读者；缺的是这些来源对外如何组成一份读模型。

**【对本问题的解读】**　B 的 restart 可以已失败、容器已停止、上一代最近一次服务探针却成功。三个描述可能同时为真。把它们压成一个红绿灯，或优先保留“历史更多”的推送，都会让面板看似完整，却无法回答 **谁在什么时间观测了哪个代次**。

**【可选选项清单】**　**A（推荐）**：一个授权后的对象投影，fleet 返回窄行，详情按需展开；bridge 只取绑定对象且允许披露的只读投影。**B**：一个全量对象文档，列表、详情都在服务端核权后取全量再裁剪；易复用，但翻页也可能触发昂贵的进程/日志读取。**C**：只冻结独立资源读接口，由各客户端组装清单、详情与缺样状态；成本分散，却容易对同一结果得出不同状态。

**【推荐选项的详细执行说明析】**

1. `GET /nano-local-sandbox/fleet` 以当前宿主明确配置、当前主体获准的受管 env 为范围，不遍历相邻 home、不代其他 env 写账；没有可信跨 env 读取来源就标该已授权范围不可用，不冒称全机完整，也不泄露无权 env 是否存在。host 容量与可见 sandbox 用量分列；未知容量不由子集反推。`GET …/sandboxes` 与 MCP `sandbox.list` 共用列表 owner；`GET …/inspect?sandboxId=B` 与 `sandbox.inspect({sandboxId:B})` 共用详情 owner。无目标可列举，不能补选 B。列表先授权再计数、排序及分页；默认只列受管对象，operator 的只读发现结果另列，不因此纳管。
2. 一行至少含 `envId,sandboxId,name,profileId`、当前核实的后端代次（可空）、观测时间与实态；把 `observedState`（running/stopped/missing/unknown）、按 driver 判的 `health`、最近操作的 `state/step`、`desiredRevision/appliedRevision` 分列。creating/starting/stopping/removing 是在途操作的展示，不覆盖实态；failed 属于确定失败的操作，不能把停止当失败或把 inspect 异常当 missing。列表中的服务摘要、可见终端数及用量覆盖度按 `T-O-44/46/48` 投影，无历史正文、原始挂载路径、端口凭证或终端内容。实际身份有歧义不挂旧代次的绿灯。详情里的服务/部署/使用量沿用同一对象引用及 `observedAt`，不承诺多个 backend 探针是一个原子现场。
3. 进程为**获准 operator 主动读取**的详情，不进入 fleet/minute ring：`GET …/processes?sandboxId=B`，仅在已核实运行的 B 内由固定只读 driver 读取 `/proc`，不要求安装 `ps`，不接调用者命令。按 PID 升序，默认 50、最多 200，公开 pid/ppid/短名/状态和已实测的资源值，带代次、观测时间及 `truncated`；无权限、已停止、读失败和成功零行不是同一种结果。绝不返回 argv/env、宿主进程或把旧代次 PID 当可控制引用。列表刷新不得隐式采集进程、日志、屏幕或触发 prepare。
4. HTTP/MCP 对同一主体、同一观测给出相同值；bridge 不是第三个 owner。推送只接收来自已核实绑定且获准的发布者，带 `(envId,sandboxId,generation)` 和该发布周期内单调序号；缺失身份、旧代次或乱序整份拒收。宿主重启须重新建立发布绑定再起新序列，不能靠序号猜 owner。清空历史的合法新投影须覆盖旧投影；过期报最后观测时间与陈旧，不合并最长历史，不靠 `storePath/httpBase` 选胜者。不能核读者身份的共享 bridge 只可呈现该绑定的非受限健康事实，不缓存用户特有计数/历史或跨 env fleet。验收反例：B 在换代后 history 为空，迟到的 A 或旧 B 文档不能给 B 添回记录。

**【推荐选项支持证据或其他选项的反例】**　[registry.list:106–116](../../../../dsh-nano-local-sandbox/src/host/instance-registry.js#L106-L116) 列的是 session 实例并带 endpoints；[routes.js:454–482](../../../../dsh-nano-local-sandbox/src/host/routes.js#L454-L482) 的 terminal plane 会看全局 `listTermSessions().length`，而 [observe.js:95–102](../../../../dsh-nano-local-sandbox/src/host/observe.js#L95-L102) 的 epoch 只随 plane 状态串变化，不是后端创建代次。[bridge:1077–1104](../../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L1077-L1104) 在按 phase/sender 选择推送前还会保留较长旧 history，不能用作“清空后仍属 B”的证据。[backend:172–195](../../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L172-L195) 已区分 not-found 与异常并有容器内诊断原语；[v1.3 A6/A7/A9](../dsh-nano-local-sandbox-v1.3.md#L875-L879) 要求的则是有界对象进程、host/fleet 与同源读取。

- **问题（请 [业主] 裁决）**：是否选 A，以一个授权对象投影交付窄列表、按需详情及隔离的 bridge 视图？
- **[业主]回答**：已确认 A（「业主同意你在 [第6轮] 的全部推荐」），冻结为 `T-O-49`。

### Q39 — 怎样让不同安装版本的消费者明确拒绝不懂的 v1.3 合同，而不把工具名或包版本当能力证明？

**驱动真相**：`T-O-46/47/48` 新增服务、修订、覆盖度语义；`T-O-41/43/45` 已定目标、写操作与终端 wire。这里裁公共**对象合同**的版本识别、失败表达及发布来源，不改变 JSON-RPC 或终端帧版本。

**【对本问题的解读】**　消费者即使收到 HTTP 200 或 MCP initialize 成功，也未必理解 `appliedRevision`，更未必知道 `usage=null` 与 0 不同。最危险的不是旧页打不开，而是旧页向一个仍接受无目标写的提供者提交成功。版本必须在派发前可验证，不能事后看应答的 buildId 才发现错版。

**【可选选项清单】**　**A（推荐）**：v1.3 受管对象面采用一个独立、显式的 major 标识，提供者/消费者同切，不兼容时拒绝。**B**：按每个操作协商能力及字段版本；适合独立多版本扩展，但本期会引入多份可组合的协商状态。**C**：按 npm 包版本或 MCP transport 版本做白名单；装配简单，但同一包可暴露多个协议，且 bridge、HTTP、terminal 不由同一协商控制。

**【推荐选项的详细执行说明析】**

1. 对象面标识提议为 `dnls.control/1`（第一次发布这个对象合同，不是包版本 `1.3`）。不带目标的只读发现 `GET /nano-local-sandbox/contract` 与 `sandbox.contract` 从同一 owner 返回 `{contractVersion,capabilities}`；能力不表示权限、不枚举隐藏对象。新版消费端先确认提供者支持再调用，旧提供者不认识发现接口即停止，绝不试写探版本。后续受管对象 HTTP 请求用 `X-DNLS-Contract: dnls.control/1`，宿主 MCP 对应 `tools/call.params._meta["dnls/contract"]`，对象 JSON 和 bridge 推送携带 `contractVersion`；缺失或不匹配在宿主准入后、访问对象/派发前拒绝。相同 major 的只读新增字段可忽略；不得静默改变已有字段单位、可空性或动作含义。无 body 的应答只需既有绑定与应答头确认版本。发现引导、JSON-RPC 自身协商、第三方端点及 [DNT] local 不强加此要求；[DNLS] 终端数据面仍只认 `T-O-45`。
2. **提请批准的对象域错误增量**（名称不随 active profile 漂移）：`sandbox.contract_mismatch` 400（更新配对版本）；`sandbox.name_taken`、`sandbox.port_exhausted`、`sandbox.quota`、`sandbox.state_conflict` 409（分别改名、释放/调整预留、核配额、重新读修订/操作）；`sandbox.image_missing` 409（备妥目标构建再显式操作）；`sandbox.upgrade_failed` 500（已知已派发的后端升级失败，查原 operation/已完成步骤）。仅在获准范围内报告细节，不能用冲突消息揭示其他主体。失败采用 `errorId,status,cause,next`，已有关联才附 operation 引用。未决依 `T-O-43`，不是 upgrade_failed；查询已失败操作可成功返回操作文档，其 `state=failed`，不把成功读取误报为 HTTP 500。宿主拒绝、不可见同 404、可见不可做 403 及协议级 JSON-RPC 错误沿现约，不为它们另造命名空间。MCP 工具失败 `isError` 和结构化业务错误与 HTTP 一致；上述错误均不添加自动写重试。
3. **一项属性一个发布来源**：route 身份/审核分类沿用仓根 security 账本与已有生成链；由该合同集投影本包的 host/browser bindings、perf 的 route ID 子集及包内所需产物，不把 route 再手抄进 perf。每个 MCP tool 的 schema/dispatch 仍由 tool 定义持有，非 route 不假造 path；目录、发布描述与示例由相应定义投影，消费者不另存错误映射。版本标识由对象合同定义导出，不能从构建日期算。新错误进唯一 catalog，driver 错误按所选 profile 组合，不允许一个进程内“最后加载的 profile”改变另一对象的错误前缀。只切本次受管面，不扩张全仓生成器的授权，不增发布闸门。
4. **辨别用例**：新 [DNK] 遇旧 [DNLS] 读不到正式合同，启停按钮不发请求；旧 [DNK] 遇新 [DNLS] 无标记或无目标不派发。即便传了正确版本，缺 `sandboxId` 仍按 `T-O-41` 拒绝；正确版本不是权限。HTTP/MCP 对同一端口耗尽报告同一业务原因，不能一边显示“请重试”，另一边静默分配邻号。

**【推荐选项支持证据或其他选项的反例】**　[initialize:1871–1877](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1871-L1877) 回的是 MCP protocolVersion/serverInfo，[tools/call:1897–1915](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1897-L1915) 已区分工具结果与结构化错误；[mcp-sandbox.js:236–250](../../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L236-L250) 使用同一工具定义校验和分派。[error-catalog.js:88–110](../../../../dsh-nano-local-sandbox/src/host/error-catalog.js#L88-L110) 目前使用进程级 activeNamespace/driverRows。构建已分别运行 [bindings 与 perf 两次 bake](../../../../dsh-nano-local-sandbox/scripts/build-client.mjs#L8-L17)，[browser bindings 只投影 id/path](../../../../scripts/bake-plugin-bindings.mjs#L109-L115)；但 [perf 声明:16–24](../../../../dsh-nano-local-sandbox/src/perf/declaration.json#L16-L24) 仍列 `dnls.kite`，而 [绑定:11–16](../../../../dsh-nano-local-sandbox/lib/bindings.js#L11-L16) 为 `dnls.lifecycle`。两个文件都经生成，不等于共同字段同源。草案的六类错误和版本目标见 [v1.3 P3–P8](../dsh-nano-local-sandbox-v1.3.md#L860-L865)；具体标识/状态码在本题裁决前不生效。

- **问题（请 [业主] 裁决）**：是否选 A，批准上述版本握手、列明的错误与同源发布边界，不提供旧版无目标兼容分支？
- **[业主]回答**：已确认 A（「业主同意你在 [第6轮] 的全部推荐」），冻结为 `T-O-50`。

### Q40 — 只安装 [DNLS] 时由谁交付管理入口？选中 B 后，哪些动作必须留给可选消费者？

**驱动真相**：`T-O-46/47/48` 决定详情要显示什么；`T-O-38/41/42/44` 决定 UI 只能提交选定目标、区分创建与附着、不能替主体授权。本题裁安装与消费边界，不以 Q38 或 Q39 的待答方案为前提。

**【对本问题的解读】**　“[DNLS] 不是第二个设计界面”与“[DNLS] 独立提供 sandbox 管理”不是同一个限制。只装 [DNLS] 的 operator 需要在没有 agent session 时查 B、改资源、看操作；这不要求复制 [DNK] 的设计模式或 [DNT] 的终端模拟器。

**【可选选项清单】**　**A（推荐）**：现有 [DNLS] 包同时交付 web 管理页签和 `/sandbox`，宿主仍是唯一特权执行者。**B**：单独的中性 console 包消费相同公开面；拆分可独立发布，但必须接受“只装 [DNLS] 不含管理页”的范围变更。**C**：交给 [dsh] 宿主内建管理页；适于跨 provider 统一管理，但需要宿主排期，不能把宿主尚未交付的 UI 算作 [DNLS] 交付。

**【推荐选项的详细执行说明析】**

1. 在同一包新增 web client export/打包文件及正式 client 模块声明；保留原宿主入口、安装命令与唯一容器特权点。通过 [dsh工作台] 注册唯一「沙箱」页签，`/sandbox` 只打开或聚焦同一页签，无 session 也能查看自己有权访问的范围。不要独立 HTML shell、借 [DNK] 页签挂载或依赖其他插件的文件。明确修订包规“无浏览器入口”，保留“不做第二套设计界面”。用宿主 primitive、theme、locale、a11y 及其次的 nano-ui；无可用正式槽位或命令冲突则显式报告宿主依赖，不覆盖宿主命令、不查找私有 DOM。
2. 初始页展示已授权 host/fleet、创建入口、用量与部署；选中对象才显示概览、服务、进程、用量、存储/网络、时间线、设置、关于和终端管理。端口取实发端点，配置并列期望/应用/实际，用量并列数值/覆盖；存储不浏览业务正文。面板只持选择引用/视图状态，不写第二份对象或凭证。加载、确实为空、缺读数、拒权、未决、失败分开；变更前显示准确对象、卷与中断影响，确认只提交一次，掉线查原 operation。切 A→B 后 A 的迟到结果不刷新 B，不自行选择 `default`。
3. [DNLS] 独装可做管理：含获准的终端清单、状态、创建/关闭与操作反馈；交互式渲染/输入属于可选的 [DNT] 或同协议客户端。**缺客户端时不先创建孤立终端再假报已打开**：把“创建（不连接）”与“打开交互终端”区分，后者无正式处理能力就明示不可用。已有终端可提供稳定的非凭证引用给获准用户在公开客户端中选择，引用不授予 attach。正式宿主无携带 sandbox/service/terminal 引用的打开入口时，不用 `openLocal(sessionId,cwd)`、本机 shell、明文 token 剪贴板、私有插件事件或专有 lane 补位。[DNK] 独立选择其 sandbox，继续负责设计/CDP 消费；[DNT] 布局只保存稳定引用，恢复须重新授权。提供者/已安装的消费者在同次升级中硬切，但装包互不强制；未适配的消费者明确不可用。
4. **辨别用例**：仅装 [DNLS]、无 agent session 的获准 operator 能打开同一管理页；未安装 [DNT] 不影响管理 B，也不会误开宿主 shell。有 [DNT] 时从 B/engine 发起交互只能进入 B。关闭页签/卸载前端不是结束原 PTY；关闭终端才是终止动作。管理入口不接管 [DNCS] carrier，不重开 Case 2/4。

**【推荐选项支持证据或其他选项的反例】**　[DNLS 包清单:12–37](../../../../dsh-nano-local-sandbox/package.json#L12-L37) 现在没有 `./client` 或 `dsh.client`，[包规:13–18](../../../../dsh-nano-local-sandbox/AGENTS.md#L13-L18) 明写无浏览器入口；[v1.3 U1–U7](../dsh-nano-local-sandbox-v1.3.md#L884-L892) 却要求独装可开、排除 design mode。[DNK 已注册右侧页签](../../../../dsh-nano-kitesurf/src/client/index.js#L2841-L2859)，[DNT 使用 commandUi](../../../../dsh-nano-terminal/src/client/index.js#L204-L212)，说明存在正式扩展方式，不证明 `/sandbox` 已注册或宿主每种上下文都可用。[DNT 的公开 openLocal 实际固定 local lane](../../../../dsh-nano-terminal/src/client/index.js#L176-L186)，[McpLane.create 目前只传会话及尺寸](../../../../dsh-nano-terminal/src/client/lanes.js#L214-L225)，[布局只回填 local attach](../../../../dsh-nano-terminal/src/client/NanoTerm.jsx#L246-L254)。这些是消费硬切的原因，不是批准另建插件私道的证据。

- **问题（请 [业主] 裁决）**：是否选 A，由 [DNLS] 包独立交付管理，终端/设计继续走可选公开消费者，缺能力不降级到错误目标？
- **[业主]回答**：已确认 A（「业主同意你在 [第6轮] 的全部推荐」），冻结为 `T-O-51`。

### 第六轮提问时的收口预判（历史记录）

**判断：第七轮可以作为目标收口轮；目前不要求第八轮。** 条件是第六轮全部作答后，剩余独立公共取舍不超过三项，且其余缺口确属实现或已经 [业主] 明确暂缓。不能为了正好三题而把宿主尚未提供的能力说成已具备。

| 仍要对账的边界 | 现有证据与处置标准 |
|---|---|
| 请求主体与附着的实际准入链 | [共享 upgrade registrar:146–163](../../../../packages/dsh-interface/src/host/createWebRegistrar.js#L146-L163) 能按宿主准入拒绝，但调用处理器时给的是 req/socket/binding；[DNLS 现行 attach:44–59](../../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L44-L59) 是独立 loopback 监听，[term-ws:79–93](../../../../dsh-nano-local-sandbox/src/host/term-ws.js#L79-L93) 校验握手目标。[livePolicy:1379–1386](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1379-L1386) 是 session 策略读取；三者合起来也不能证明实际 WS 请求是谁或已撤权。`T-O-44/45` 已冻结失败关闭；若须新宿主接口、可转授票据或额外公开期限，必须明示授权或明示依赖/暂缓。未证实不是断言整个 [dsh] 不支持。 |
| 托管寿命、限额和长任务 | [现行 scope 校验:75–79](../../../../dsh-nano-local-sandbox/src/host/profile-registry.js#L75-L79) 仍是 session/shared；[profile:54–56](../../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L54-L56) 有 idleTimeout 与 maxInstances，[sweep:91–98](../../../../dsh-nano-local-sandbox/src/host/instance-registry.js#L91-L98) 却据 attached/lastAttach 停实例并删行。须区分与已冻结身份/活终端冲突的旧行为（应退役）和仍需定的新公开语义（何时可自动回收、配额算什么）；不能由“页签关了”决定。 |
| 跨包消费是否还有新的宿主合同 | [DNT 插件销毁:38–43](../../../../dsh-nano-terminal/src/client/index.js#L38-L43)、[MCP close:318–330](../../../../dsh-nano-terminal/src/client/lanes.js#L318-L330) 与 `T-O-39/42/45` 的 detach/close 边界需要适配；这部分已裁，不因缺代码另占一题。若从管理页到通用消费者确需新的公开导航意图/宿主服务，与身份或自动回收无关，须单独裁或明确以公共客户端手动选定作为交付边界。 |

若剩余合同能在第七轮全部裁清，且每项范围目标均能回指已冻结 Truth-ID 或明示暂缓，即可写正式计划；**不是**等全部代码实现才可冻结。若实际宿主取证表明要分别新增身份、票据、消费者导航等互不等价的公共合同，或本轮有保留意见导致仍超过三项，就继续第八轮，不用一个笼统授权包住多个决定。沿用 `T-O-34` 的 Case 2/4 暂缓；没有新增 release-gate。

## 6.7 ★ 中场评估 VI（Round 6 → Round 7）

- **判定**：Q38–Q40 全部选 A，无附加条件。对象读模型、版本与错误合同、管理入口的安装归属分别入账为 `T-O-49/50/51`。
- **结果**：看 B，只读 B 的已授权代次；对 B 写，先确认双方理解同一对象合同；只装 [DNLS] 仍能管理 B，但不能假装本地 shell 就是 B 的交互终端。
- **代价**：接受陈旧数据被拒、旧消费者停止工作、没有正式处理能力时按钮不可用。这比保留第二份历史、无版本写入或从私有渠道打开终端更可治理。此轮没有批准新凭证、自动回收策略或新的跨插件服务。

- **收口轮的调查范围**：除当前插件外，核对仓内 [宿主版本清单:50–65](../../../../.dependencies/MANIFEST.json#L50-L65) 锚定的 `dsh-v0.2.2-rc.1` 源码。下文 pinned 链接是可按该 ref 重取的源码证据，不是本机安装件或 rc.5 的实测结果。源码能证明宿主接口的形状，不能代替 [业主] 授予业务权限。

## 6.8 Round 7 —— executional 收口轮：谁能接、何时停、怎样交给正确客户端（Q41–Q43）

本轮 [业主] 逐项签收三个 A，无附加条件；下列各题保留选项及依据。冻结口径见 §1 的 T-O-52 至 T-O-54。

### Q41 — 哪份宿主身份证明可以让一次 attach 生效？撤权或重启后还认什么？

**驱动真相**：`T-O-44/45` 要求签发和使用时都核权；`T-O-49/50/51` 已定可见范围、协议及无 agent session 的 operator 入口。未决的是把这些要求落在哪个正式宿主边界，而不是再发明一套登录。

**【对本问题的解读】**　宿主允许一条请求进入、宿主能说出它代表哪个 principal、这个 principal 能读 B/T，是三层判断。rc.1 有返回 Peer 的接口，纠正了“仓内找不到请求主体接口”的疑虑；但同一浏览器 owner 身份不能证明甲乙是不同用户，也不能证明某项 session 绑定。`peer.id` 的存活期也不能当宿主重启后的所有权。

**【可选选项清单】**　**A（推荐）**：同源宿主 HTTP/MCP/WS 入口均复用正式 admission，再由 [DNLS] 对象 owner 核权；不发新的 bearer。**B**：只为已证明的非交互管理开放控制面，显式暂缓沙箱交互终端，直到宿主提供专门终端授权服务；安全但收窄 Case 1/3。**C**：批准对象、主体、用途、时效均受限的一次性票据作为额外公共凭证；仍须证明真实主体并处理撤权，新增签发与失效责任，首期没有必要。

**【推荐选项的详细执行说明析】**

1. 每次受限调用从真实 HTTP/upgrade 请求经宿主 `connection.admit(req)` 取 live Peer 或原样拒绝；宿主 MCP 的 transport 同规。以宿主确认的稳定 principal（在明确 host/env 范围内）及独立核实的 session/对象/终端授权定位读者。`owner` 可映射到本地单用户部署的本 env operator；**不是任何终端的通配授权**。共享 owner 浏览器只能代表一个本地主体；若某动作要求区分两个主体/绑定而宿主不能证明，拒绝，不以请求里的 sessionId、paneId、角色或 `peer.id` 补造身份。审计不存认证材料。
2. `term.session.attach` 成功只返宿主受保护 WS 的动态 locator 与 `dnt-ws-v2`；locator 绑定目标而非可转授权限。upgrade 在接通 broker 前再次 admission、核对象代次/终端归属及交互权。浏览器不需在原生 WS 塞自定义授权头；控制请求遵 `T-O-50`，帧握手遵 `T-O-45`。不把宿主 cookie、token、原始请求或可绕过宿主的端点交给容器、日志或布局；broker 持 PTY，不接受公网/loopback 直连作为替代授权。
3. 已建立连接绑定当前 Peer 存活期与对象授权；宿主凭证失效、Peer dispose、终端授权撤销或绑定变更时停止该流的输出、输入、resize 与自动输入，清除待发送数据并 detach，不杀原执行。仅 `peer.signal` 不足以证明业务授权或凭证一直有效：接收/交付每批受限数据前须能确认两者仍有效，并能及时停掉空闲连接；无法可靠确认就不开放此流。宿主重启后重新 admission，用稳定主体归属与终端引用重新查权；新 Peer、同名 shell 或旧地址本身都不能恢复权限。共享 bridge 无此证明仍只给非受限健康。A 不批准新票据、operator 密钥或认证插件。
4. **辨别用例**：甲复制 B/T 的 locator 给无权乙，乙不能读第一屏；甲撤权后旧连接不能再收下一段输出或提交输入。若两个窗口只证明同一共享 owner，不以“不同标签页”冒充通过跨用户隔离测试。宿主版本缺正式接口、无对应 session 授权或无法识别旧终端所有者时，报告哪一项受限，不影响仍可证明的非受限功能。

**【推荐选项支持证据或其他选项的反例】**　[宿主公开类型 rpc.ts:227–240](../../../../.dependencies/pinned/deepseek-harness/packages/client/connection/src/rpc.ts#L227-L240) 区分仅返回拒绝状态与返回 Peer 的 admission；[rpc-host.ts:122–136](../../../../.dependencies/pinned/deepseek-harness/packages/client/connection/src/rpc-host.ts#L122-L136) 的 browser 分支返共享 Peer，[其初始化:89–96](../../../../.dependencies/pinned/deepseek-harness/packages/client/connection/src/rpc-host.ts#L89-L96) 为 owner。[PeerScope:463–475](../../../../.dependencies/pinned/deepseek-harness/packages/typert/protocol/src/types.ts#L463-L475) 区分 principal 与 dispose 信号；[peer.ts:26–45](../../../../.dependencies/pinned/deepseek-harness/packages/client/connection/src/peer.ts#L26-L45) 的 ID 为随机值。反之，[当前 DNLS term-bridge:44–59](../../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L44-L59) 是自开 loopback 与带 token 的路径，[routes.js:1394–1404](../../../../dsh-nano-local-sandbox/src/host/routes.js#L1394-L1404) 在缺策略/行时不判 stale。不能把这条现行组合当作 A 的实现。

- **问题（请 [业主] 裁决）**：是否选 A，沿正式 Peer admission 核权，不新增 bearer，无法证明的动作失败关闭？
- **[业主]回答**：已签收「A 宿主核身」，冻结为 `T-O-52`。

### Q42 — 已经断开所有窗口的 B，何时才可自动停止？上限究竟数 session 还是受管对象？

**驱动真相**：`T-O-36/39/43` 让对象独立、原 PTY 可长跑、写操作串行；`T-O-47/49/50` 区分策略与实态，已有 quota/state_conflict 错误。此处决定可自动停止的授权与证据，不重开回收时长的具体配置值。

**【对本问题的解读】**　一个等待输入的程序既可能没有最近输出，也可能没有任何前端连接。两者都不等于它的主人同意停机。同时，甲乙各开一条 session 绑定到 B，消耗的是一个 sandbox，不是两个。

**【可选选项清单】**　**A（推荐）**：按受管对象计配额，自动化只在策略获准且能证明空闲时 stop，从不自动 remove。**B**：只允许显式 stop，完全不用空闲策略；最保护长任务，但需要明确替代原有空闲治理承诺。**C**：用可续租的显式运行租约保护 B，到期可停；需要新的续约/失联语义，单纯的浏览器心跳不能保护断连长跑程序。

**【推荐选项的详细执行说明析】**

1. 物理生命周期单位固定为 sandbox，不再用 profile `scope` 选容器。现有必填 `scope: session/shared` 保留为**使用关系/策略作用域**，不是两个生命周期模式，也不新增 `scope: sandbox` 破坏已裁的策略隔离；`shared` 不免除逐次授权。`maxInstances` 在每 `(envId,profileId)` 计不同的受管 `sandboxId`：已受理创建/接管预留先占位，已停、失联、结果未明仍占位；只读发现、session、terminal、同一对象就地换代不重复占位。并发纳管与创建须由同一台账写者原子判额；同键取原操作不重占。已确认未创建的失败/派发前取消可退预留，既成对象在确认 remove 后才退。保留卷和旧键不占活动对象名额。满额报 `sandbox.quota`，不逐出别的对象，不把无权限对象细节作为原因。
2. 自建时明确接受 profile 的空闲策略，接管旧对象默认仅显式停；operator 可为所选对象显式启用/修改该策略。仅在身份已核实、对象 running、无 live 终端（包括 detached/无输出）、无活动使用/工作或在途/未决写，且 driver/broker 能证明这些事实时，才开始连续的 `idleTimeoutMs` 观察。服务若负有持续工作职责而不能证实空闲，视为不能回收。打开 fleet、读 stats、收遥测不刷新使用时间；新使用/新 PTY 重置计时。宿主重启、broker 失联、时间连续性不可信时不补算断档，重新核实后重新计满，不在启动时集中停机。不后台预热或因面板刷新唤醒环境。
3. 到期在对象写边界内与 attach/create/use 串行复核，并阻止“判空后、真正 stop 之前”新工作偷偷开始；抢先到来的新使用使停机条件失效。调度器仅表示已批准策略的执行者：按对象/代次/空闲周期合并为一个 `T-O-43` 操作，记录策略依据，断线或不确定不重发。成功只标已停止，保 ID、卷、端口预留与配额；不删行、删卷、杀 detached PTY 或因超额强行停机。若操作者明确要中断活动终端，另走已授权的手动停机路径。
4. **辨别用例**：两 session 共用 B 只占一格，两次不同创建争最后一格只能有一个被受理。B 的程序等输入超过阈值且零连接，仍能重附着继续；所有工作确已结束并完整空闲一窗后才停 B，重启仍是同一 ID。已停 B 不会腾出“创建 C”的名额，界面要说清楚为何不能创建。

**【推荐选项支持证据或其他选项的反例】**　[前册 T-O-27](DNLS02-qna.md#L45-L45) 已把 scope 与使用记录分开；[profile 校验:72–79](../../../../dsh-nano-local-sandbox/src/host/profile-registry.js#L72-L79) 只认 session/shared，[profile:54–56](../../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L54-L56) 配置时长与上限。[ensure:28–43](../../../../dsh-nano-local-sandbox/src/host/instance-registry.js#L28-L43) 数内存记录，[双 session 测试:92–108](../../../../dsh-nano-local-sandbox/test/instances-ensure.test.mjs#L92-L108) 两个 ID 可对应一个容器；[sweep:91–98](../../../../dsh-nano-local-sandbox/src/host/instance-registry.js#L91-L98) 的实现超时 stop 后删行，[旧测试:41–57](../../../../dsh-nano-local-sandbox/test/lifecycle.spike.test.mjs#L41-L57) 甚至断言记录消失。这是应替换的旧语义，不是现网确有调度器在运行的证明。

- **问题（请 [业主] 裁决）**：是否选 A，冻结对象计额、保护 detached 原执行和“可证空闲只停不删”的边界？
- **[业主]回答**：已签收「A 计对象只停不删」，冻结为 `T-O-53`。

### Q43 — 从 B/engine 打开终端，选择怎样到达公开客户端？恢复视图是否能再次创建程序？

**驱动真相**：`T-O-42/45/46` 已定创建、附着与服务定位；`T-O-50/51` 已定兼容判断、同包独装及可选客户端。最后要定的是交接载荷和动作归谁，不能用 [DNLS] 私下调用 [DNT] 来补一键体验。

**【对本问题的解读】**　“打开 B/engine”是一次用户意图；“显示刚才那个页签”是恢复视图。若恢复布局或导航历史也触发 create，一个工作台动作便可能产生两个 PTY。导航能否定位对象，也不同于调用者能否向其输入。

**【可选选项清单】**　**A（推荐）**：在已有宿主资源导航上登记无凭证的终端资源，消费方复用通用 `McpLane`；无处理器时可手动选择公开目标，不新增私有服务。**B**：本期只做公共客户端内手动选 sandbox/service/terminal；接口够用，但显式暂缓 Case 3 的一键打开。**C**：由宿主另设与 session 无关的通用终端意图服务；有统一导航价值，但须宿主交付新合同，不能由两插件约定一个同名私道代替。

**【推荐选项的详细执行说明析】**

1. 在当前可信 host 上定义公开、非凭证资源地址 `dsh-resource://sandbox-terminal/<envId>/<sandboxId>/<terminalId>`，各 ID 为经校验/编码的单独路径段。只标识**已存在**的终端；不编码主机 URL、session、shell、命令、attach 地址或 token，不承诺跨主机可用。目标 [DNLS] 与 `dnls.control/1` 从当前宿主的公开路由/合同发现确认，不从链接构造网络目的地。未安装或不兼容的处理器不能作为“可以交互”的证明。任何符合合同的处理器均可注册；不固定 [DNT] 私有 kind，不新增 lane。
2. 打开 B/engine 新终端时，先确认正式资源处理能力（在当前 surface 查询该资源类型的注册/可用性，不创建 PTY 做测试）。只有**明确的一次新建手势**才由发起者分配 `paneId/openId` 并经公开 `term.session.create` 创建；得到稳定引用后把终端资源交给宿主 `openResource`。若处理器此时消失或导航失败，保留同一引用，明确显示“已创建，未连接”，允许重新打开**该引用**或显式关闭，不再 create。没有合适处理器时不先建；独立“创建（不连接）”仍可用。对已存在的 T，列表、重开与布局恢复均只走选定引用 → 合同发现/核权 → attach → 当前屏对齐；未决 create 只按已授权幂等语义核实，不另换键自动重跑。终端 close 对同一获准引用重复请求不二次终止；不可见引用仍按同一拒绝边界，不据此泄露已结束的 T。
3. [DNT] 提供的是通用资源视图/处理器，继续使用 `mcp` lane；资源打开、切页、浏览器刷新、插件卸载均不得触发 `term.session.close` 或从旧输入重跑。只对明确的“结束原程序”动作派发 close；需要时将“关闭视图（detach）”与它分开。本地 lane 和第三方生命周期不一并改。没有可用自动导航时，已授权客户端可在其公开选择器显式选 B/engine 或 B/T；不拷贝 bearer，不落回 local。无 agent session 的管理是 `T-O-51` 的承诺：若目标安装的 [dsh工作台] 没有无 session 的正式页面入口，将这一入口列为**宿主交付依赖**，API 可用不算该 UI 已交付；不伪造 session、私挂 DOM 或另起 HTML shell。
4. **辨别用例**：同一 B/T 被导航两次或 [DNT] 重载，broker 仍只有一个原程序；有权才可看到对齐画面。处理器在 create 与打开之间卸载，用户看见“已创建，未连接”，重试导航不制造 T2。没有 [DNT]、没有已挂载的 session 界面或主体被拒，不能误开宿主终端，已获准的其他管理动作也不因此被标为失败。

**【推荐选项支持证据或其他选项的反例】**　[宿主 tab-registry.ts:342–363](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/tab-registry.ts#L342-L363) 可列识别地址的候选，[导航:375–392](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/service.ts#L375-L392) 进入已选 surface，[require:854–864](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-sidebar-right/src/client/service.ts#L854-L864) 说明无挂载 session 会失败：注册资源类型不等于已经有全局页面。[DNT 的 openLocal:175–186](../../../../dsh-nano-terminal/src/client/index.js#L175-L186) 只能开 local；[McpLane.open:214–239](../../../../dsh-nano-terminal/src/client/lanes.js#L214-L239) 从 create 起步，[外层重试:1356–1370](../../../../dsh-nano-terminal/src/client/NanoTerm.jsx#L1356-L1370) 会重复 `lane.open()`；[卸载:321–327](../../../../dsh-nano-terminal/src/client/NanoTerm.jsx#L321-L327)、[MCP close:318–330](../../../../dsh-nano-terminal/src/client/lanes.js#L318-L330) 则会走远端关闭。这是必须同切的消费端，不是可保留的旧行为。

- **问题（请 [业主] 裁决）**：是否选 A，批准非凭证资源交接、新建只发生一次、恢复只 attach，以及无宿主入口时的明确交付边界？
- **[业主]回答**：已签收「A 公开资源导航」，冻结为 `T-O-54`。

## 7. 收口对账（全轮已冻结）

**第七轮已签收，本册收口，不开第八轮。** Q41 → T-O-52，Q42 → T-O-53，Q43 → T-O-54。以下为范围交接，不是实现验收报告。

| 范围 | 冻结依据及最后签收点 |
|---|---|
| 对象、scope、控制权、卷与多环境（T1–T4，V13-Q1–Q5） | `T-O-35–41/43/46/47/49`；显式接管，保卷；由收口裁决补全 `T-O-53` 的作用域解释、计额与可证空闲。 |
| 服务、部署、用量、披露与台账（T5–T9） | `T-O-40/44/46–50`；`T-O-52` 落实名义主体与运行中撤权；不把推送、遥测或回执当恢复源。 |
| 协议（P1–P8，V13-Q6/Q8） | `T-O-38/41–45/49/50`；`T-O-52` 定宿主准入，不重开 wire、错误或写重试；无默认目标。 |
| API（A1–A10） | `T-O-40/41/43/46–50` 覆盖列表/详情、建删启停、配置、服务、用量、进程、host、部署及操作查询；`T-O-53` 补并发占额和自动 stop。草案的对象路径、删卷等与已裁不同处以 §1 为准。 |
| [dsh工作台]、消费者、Case 1/3（U1–U7，V13-Q7/Q8） | `T-O-38/39/41/42/44–46/49–51`；`T-O-52` 负责重附着的证明，`T-O-53` 保住等待输入的程序，`T-O-54` 负责无私道交接、恢复与无入口时的责任。 |
| 非本期 | `T-O-34/35`：Case 2/4 仍暂缓，[DNCS] 载体不由 [DNLS] 接管；[v1.3 范围:917–921](../dsh-nano-local-sandbox-v1.3.md#L917-L921) 的多租户、额外平台与新 release-gate 不加入收口。 |

**签收结果与交接**：两轮 foundational 与五轮 executional 共 19 题均有 [业主] 答复；开轮基线及裁决连续登记为 T-O-33 至 T-O-54，无 OPEN 残题。Case 2/4 依 T-O-34 暂缓，不是遗漏。§1 现可作为正式 DNLS03 计划 §2 的引用来源。仍须在实施中核实目标安装件的身份/撤权能力及无 session 工作台入口，不得将本册的合同冻结写成运行时已实现。

## 8. 使用约束

[业主] 在各题回答栏裁决；修正以追加记录为准，不改写前册。计划引用 Truth-ID 与对应题答，不把推荐或测试当作授权。每轮只问一个焦点；上一轮未冻结不生成下一轮的问题。不增设 release-gate。

## 修订历史

| 版本 | 日期 | 作者 | 主要变更 |
|---|---|---|---|
| v0.1 | 2026-11-19 | DNLS03 架构审查 | 登记开轮基线，提出第一轮两项 foundational 裁决。 |
| v0.2 | 2026-11-19 | DNLS03 架构审查 | 按 [业主] 答复冻结第一轮两题，完成中场判定。 |
| v0.3 | 2026-11-19 | DNLS03 架构审查 | 依据第一轮冻结项与新源码检索提出 Q27、Q28，两题待答。 |
| v0.4 | 2026-11-19 | DNLS03 架构审查 | 按 [业主] 答复冻结第二轮两题，结束 foundational 阶段。 |
| v0.5 | 2026-11-19 | DNLS03 架构审查 | 依据已冻结原则提出第一轮执行题并评估第四轮收口余量。 |
| v0.6 | 2026-11-19 | DNLS03 架构审查 | 按 [业主] 答复冻结第三轮三项执行合同，完成中场判定。 |
| v0.7 | 2026-11-19 | DNLS03 架构审查 | 基于第三轮冻结项提出 Q32–Q34，更新第五轮收口判断。 |
| v0.8 | 2026-11-19 | DNLS03 架构审查 | 按 [业主] 答复冻结 Q32–Q34 并记录第四轮中场判定。 |
| v0.9 | 2026-11-19 | DNLS03 架构审查 | 基于第四轮冻结项与 652e8c8 源码提出 Q35–Q37；评估第六轮收口，校正随合并移动的引用。 |
| v0.10 | 2026-11-19 | DNLS03 架构审查 | 按 [业主] 答复冻结第五轮三项推荐，记录中场判定。 |
| v0.11 | 2026-11-19 | DNLS03 架构审查 | 复核 bd4b056 的对象投影、协议与工作台链路；校正已迁移源码行号，提交 Q38–Q40 待裁。 |
| v0.12 | 2026-11-19 | DNLS03 架构审查 | 按 [业主] 答复冻结 Q38–Q40，登记第六轮中场评估。 |
| v0.13 | 2026-11-19 | DNLS03 架构审查 | 对照固定宿主源码提出收口轮 Q41–Q43，并将 v1.3 全部层次与最后签收点对账。 |
| v1.0 | 2026-11-19 | DNLS03 架构审查 | 登记第七轮三项 A 的逐题签收，冻结全册并交接正式计划。 |
