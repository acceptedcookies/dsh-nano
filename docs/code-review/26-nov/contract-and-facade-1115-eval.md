# 1115 接口合同与 Facade 债务评估

> - 面向：[业主]
> - 日期：2026-11-15
> - 代码基线：`main @ f7199f96259baad78b1b6f162db38297ecaff5c1`，即 `Merge branch 'dncs-devin-cloud-session-full'`。
> - 历史基线：[1112 接口审计](./contract-and-facade.md)，以及该文件首次入库提交 `348f544` 中的安全台账。
> - 状态：**评估报告，供后续 QNA 使用；不是新[真相层]、实现授权或发布门禁。**
> - 范围：根 `AGENTS.md` 登记的八个活跃包、六个共享 package、相关接口台账与构建入口。退役目录只参与历史对账。
> - 方法：静态调用链核查、声明集合/登记集合统计、历史 Git 对账、两个既有台账检查。没有安装插件、启动服务、访问云端业务 API、修改运行时状态或重演端到端验收。

---

## 0. 向[业主]报告的结论

**公共协议固化到 package，并完成生产者—消费者 facade 收口，已经应成为下一轮架构工作的优先主线。**

但紧迫的不是把所有协议变成 REST，也不是建立一个接管所有插件的运行时。当前的主要债务已经从“普通 JSON 请求写法不一致”，发展为：

1. **合同、实现、构建产物三者分叉**：共享 guard 已有消费者内修改版；同名 terminal 工具有独立 schema；部分目录声明与实际分发不一致。
2. **能力接线和协议完整性债务**：[DNLS] host MCP 声明 20 个名字，却统一返回诊断摘要；不能把“工具列出来了”记成“20 项业务能力已完成”。
3. **登记覆盖不等于运行时约束**：两个路由检查可绿，但仍有扫描外 prefix 路由、未消费的 body limit、未实现为对象级授权的 `sessionBinding`。
4. **接口所有权发生变化，旧实现没有完全退场**：[DNK] 已不拥有页面路由，但发布清单和运行入口仍带容器时代资产、锁路径与诊断推送。
5. **新的 native/跨包合同不在旧 HTTP 视野里**：[DNMSC] 的 Provider/overlay，[DNCS] 的原生 session/agent 投影，以及浏览器服务和全局 API。

规模结论必须分层读取：

| 度量 | 本轮结果 | 不代表什么 |
|---|---:|---|
| 活跃交付包 | 8 | 不是 8 个同构 UI 插件 |
| 现有扫描器登记的 host 路由项 | 85 | 不是完整接口总数，也不是 85 个 REST 资源 |
| 这些登记项的 path × method 对 | 118 | HEAD、upgrade、MCP、SSE 不能当独立业务能力相加 |
| 静态确认的扫描外 host prefix 入口 | 至少 1 | 因此真实注册声明下界为 86，而不是“85 全覆盖” |
| 自有 JSON/HTTP 登记项 | 79 / 111 方法对 | 包含操作式 JSON 和自定义 RPC；不宣称全部满足 REST 风格 |
| host MCP 工具声明槽位 | 39 = 19 + 20 | 不代表 39 个经过端到端验证的工具 |
| 加上[DNLS]容器 bridge 的已知自有声明槽位 | 54 = 19 + 20 + 15 | 不是 54 个唯一工具名，不含外部 agent-browser 动态目录 |
| 上述 MCP 声明去重后的自有工具名 | 41 = 19 个 `term.*` + 22 个 `sandbox.*` | 不代表 41 项能力均已接通 |
| 逐包债务观察项 | 36 | 不是 36 个独立漏洞；跨包项会共享机制 |
| 横向治理观察项 | 4 | 不与逐包项相加形成风险分数 |

统计口径见 §1、§5、§6；逐包债务见 §4；完整 85 项登记清单及额外盲点见附录 A。

**判断边界**：这是架构债务评估，不是一次完整的安全审计或 MCP 标准符合性认证。静态确定的分叉可以登记；生产事故、可利用性、兼容性通过率和修复工时，均不在本轮声称范围内。

---

## 1. 证据、计量与权威口径

### 1.1 当前范围以谁为准

- 八个活跃包以 `AGENTS.md:23-32` 为准，不采用 README 中的历史插件数量。
- 根约束以 `AGENTS.md:35-43` 为准：插件中立、上层建筑归 host、不得侧载、单一真源、公共合同变更先经[业主]决定、不得过度仪式。
- 包的安装/运行合同仍归各包 `AGENTS.md`；本报告跨包观察，不要求任何插件运行时依赖邻居源码。
- 后续冻结优先于 1112 的未实施设计示例。特别是 `docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md:55-65` 及 `docs/specs/dsh-nano-model-selector/qna/DNMS01-qna.md:94-96`。
- 本文中的 `E1115-*` 是**评估观察项编号**，不是 Truth-ID，不授予任何改约权限。

### 1.2 三种证据强度

| 标识 | 含义 |
|---|---|
| 静态确认 | 在固定 HEAD 的入口、声明、分发、构建代码中直接可见；不等同于在已安装环境重现 |
| 检查实测 | 本轮分析期间实际执行的只读台账检查；只证明检查覆盖的断言 |
| 治理判断 / 待核 | 对增长成本的判断，或尚需契约/端到端验证的行为；不得升级成已发生故障 |

各债务行的“机制”默认是静态确认；涉及运行结果预测、未来成本和处理顺序时，属于治理判断。

### 1.3 不混用的六个单位

1. **路由登记项 R**：`scanRoutes()` 返回的插件/path 行。prefix 的一个路径模式记一项，不把其所有可能 URL 枚举成无穷项。
2. **方法对 M**：每行 `methods.length` 的总和。HEAD 计入 M，但不是新业务 operation。
3. **operation 标签 O**：同一路径内 `action/op/method/resource` 的具名分支；别名也按声明标签计数，不冒充唯一实现数量。
4. **MCP 声明槽位 T**：一个提供面的一条工具声明。同名工具在不同提供面声明两次，计两个槽位。
5. **唯一工具名 U**：指定集合按完整名字去重。名字相同不保证参数、错误、幂等或生命周期一致。
6. **债务观察项 D**：按机制登记的条目。一个 D 可影响多个 R/T，多个 D 也可落在同一个 R/T；不能直接相加为“坏接口总数”。

另外，本文**不重算旧文“约 100 个接口面”“facade 覆盖约 50%”**。旧文混合了路径、全局、slot、inject 和状态，未给出足以复用的逐项分母；当前也不能用 raw `fetch` 次数代替公共合同数量。旧文口径见 `docs/code-review/26-nov/contract-and-facade.md:24-43`、`docs/code-review/26-nov/contract-and-facade.md:74-82`。

---

## 2. 1112 债务账单与 1115 的对账

### 2.1 先修正历史分母，不改写历史

1112 文档形成于共享工作区仍活跃、平台切割尚未完成的时期。文件在提交 `348f544` 中首次入库，提交时间为 `2026-11-12 18:52:45 +0800`；该提交不是一个独立的“接口统一已落地”提交。

本轮读取的是三个不同的历史值：

| 历史口径 | [DNN] | [DNEE] | 退役 shared-workspace | [DNMS] | 合计 |
|---|---:|---:|---:|---:|---:|
| 1112 文档宣称的扫描数 | 7 | 16 | 21 | 3 | 47 |
| `348f544` 的 route-sensitivity 行数 | 7 | 16 | 22 | 3 | 48 |
| `348f544` 的 feature-contract 行数 | 7 | 13 | 20 | 3 | 43 |

第一行证据：`docs/code-review/26-nov/contract-and-facade.md:33-43`。后两行以 `git show 348f544:security/route-sensitivity.json` 和 `git show 348f544:security/feature-contract.json` 的 `routes` 数组按 plugin 分组得到，复核命令见附录 B。

**解释**：47 是原审计账单数，48 是入库时安全台账数，43 是同一提交的功能合同台账数。本轮没有重建当年的运行环境，因此不把 48 宣称为“当时真实可达端点数”。差额本身就是历史登记漂移，不能算成 1115 新增业务。

### 2.2 同一台账口径的存量、退役与增量

| 包/归属 | 1112 入库时 sensitivity 行数 | 1115 行数 | 净变化 | 对账处理 |
|---|---:|---:|---:|---|
| [DNN] | 7 | 13 | +6 | fx、推理与 pipeline/RPC 面扩展；仍有额外 SDK prefix 未计入 |
| [DNEE] | 16 | 18 | +2 | 存续接口扩展；旧客户端/跨插件债务仍在 |
| [DNMS] | 3 | 5 | +2 | 压缩策略与开关控制面进入 |
| shared-workspace | 22 | 0 | -22 | 按退役销账，不记为公共 facade 已修复 |
| [DNK] | 不在当时四包基线 | 0 | 不作同包增减 | 期末页面路由已归[DNLS]，零不代表没有协议债务 |
| [DNLS] | 不在当时基线 | 31 | 新归属 +31 | 含平台切割归属转移，不能全部解释成净新业务 |
| [DNT] | 不在当时基线 | 6 | 新归属 +6 | 含 MCP、SSE、WS，不是六个 REST 业务资源 |
| [DNCS] | 不在当时基线 | 12 | 新归属 +12 | carrier 与原生 Chat 投影 |
| [DNMSC] | 不在当时基线 | 0 | 无 HTTP 项 | 新增的是 native Provider/overlay 合同 |
| **合计** | **48** | **85** | **+37** | **48 - 22 + 10 + 49 = 85** |

其中 `10 = 6 + 2 + 2` 为三个存续包的台账净增加；`49 = 31 + 6 + 12` 为新归属期末存量。此式是台账对账，不是净新增能力数。退役事实及拆线范围见 `deprecated/README.md:7-35`。

### 2.3 按旧债务机制逐项结算

| 1112 账项 | 1115 状态 | 当前结算依据 | 不能做的解释 |
|---|---|---|---|
| HTTP 路径/method/bodyLimit 台账漂移 | **部分偿还** | 两个既有检查当前均 PASS；§3.2 | 不是整个合同已验证 |
| 手写 route inventory 过期 | **延续** | 当前仍自称 35 条；`security/route-inventory.md:1-7` | 不能拿 35 作现状分母 |
| handler 各写请求解析与错误信封 | **延续并扩大** | §4 各包；[DNLS] reader、[DNMS]嵌套错误、[DNCS] CarrierError | 不能说所有差异都应改成一种 wire envelope |
| 客户端没有公共调用/错误解析点 | **延续** | [DNEE] request、[DNK] post、[DNMS] compact/media、[DNN] rpc、[DNCS] post | wrapper 数量不等于公共能力数量 |
| `sessionBinding` 只是 metadata | **延续** | `packages/dsh-host-route-guard/src/route-guard.js:21-22`；[DNLS]生产入口仍传一个共享 session 对象 | 不由本报告私自改成新对象授权模型 |
| `window.__nsw={store,ctx,face}` | **随活跃包退役退出本轮分母** | 退役清单与根 AGENTS | 不是其他窗口全局已统一，也不证明旧安装实例已清理 |
| `window.__nanoNotepad` 隐性公共面 | **延续并扩展** | `dsh-nano-notepad/src/client/panel.js:4500-4624` | 不把页内 client ctx 等同于已直接取得全部 host 服务 |
| [DNEE]→notepad / open-in-app 软依赖 | **延续** | `dsh-nano-explorer-extra/src/client/body.js:930-966`；另新增 terminal 服务消费 | 不把外部原生插件路由算成[DNEE]自己拥有的路由 |
| 非 HTTP 缺统一目录与演进模型 | **延续，但应修正“零登记”措辞** | manifests、OpenRPC、QNA、UI/dataLocations 已有局部声明；没有全类型一致性闭环 | “无统一注册”不等于“所有面都无授权或无文档” |
| `dsh-interface` / 全 kind registry | **未形成现行公共实现** | 当前共享包仍为 §3.3 六个；旧文只是设计 | 不能因示例存在而认为枚举/API 已冻结 |
| 413、错误映射、幂等与 retry | **局部出现，不统一** | [DNLS]错误目录有 413；终端/沙箱有后续冻结规则，运行链仍需对账 | 不再沿用旧文“413 从不使用”，也不全盘重开已冻结规则 |
| 旧文按“低成本抽 wrapper”演进 | **已不足** | 新增 native、MCP、多流协议、平台所有权与发布副本 | 今日成本包含协议接线和生命周期，不止去重 |

旧账出处：`docs/code-review/26-nov/contract-and-facade.md:47-114`、`docs/code-review/26-nov/contract-and-facade.md:132-160`、`docs/code-review/26-nov/contract-and-facade.md:249-312`。

**审计措辞修正**：旧文把浏览器 `ctx` 直接描述为握有全部宿主能力的引用（`docs/code-review/26-nov/contract-and-facade.md:120-130`），本轮不继承该跨 realm 推断。判断权限必须沿实际 remote/service 边界核查。window API 可造成未治理的页内耦合，但不能仅凭名字或可见性就宣称宿主提权。

---

## 3. 当前整体机制：已偿还什么，仍缺什么

### 3.1 八包拓扑与规模

| 包 | 当前形态 | 版本 | R | M | 主要边界证据 |
|---|---|---|---:|---:|---|
| [DNEE] | UI + 文件/Git 宿主能力 | 0.3.0 | 18 | 18 | `dsh-nano-explorer-extra/src/host/routes.js:336-642`；`dsh-nano-explorer-extra/src/client/index.js:80-91` |
| [DNK] | 设计 UI、skills 与平台消费者，仍有旧宿主残留 | 0.1.0 | 0 | 0 | `dsh-nano-kitesurf/src/client/index.js:12-29`；`dsh-nano-kitesurf/index.js:637-681` |
| [DNMS] | 模型/媒体 + 压缩配置与开关控制面 | 0.3.0 | 5 | 11 | `dsh-nano-model-selector/index.js:34-51`、`dsh-nano-model-selector/index.js:264-388` |
| [DNMSC] | host-only Compaction Provider / overlay | 0.1.0 | 0 | 0 | `dsh-nano-model-selector-compaction/index.js:1-9`；`dsh-nano-model-selector-compaction/AGENTS.md:3-24` |
| [DNN] | IDB 草稿 + S3 + WASM/fx + RPC/推理流 | 0.2.0 | 13 | 14 | `dsh-nano-notepad/index.js:67-82`、`dsh-nano-notepad/index.js:327-357` |
| [DNT] | WASM 终端、MCP 控制面、WS 数据面、SSE 事件面 | 0.1.0 | 6 | 6 | `dsh-nano-terminal/index.js:15-26`、`dsh-nano-terminal/index.js:193-270` |
| [DNLS] | macOS 特权平台；无第二套浏览器产品面 | 0.1.0 | 31 | 57 | `dsh-nano-local-sandbox/index.js:6-19`；`dsh-nano-local-sandbox/AGENTS.md:11-35` |
| [DNCS] | carrier 客户端 + 原生 session/agent 投影 | 0.1.0 | 12 | 12 | `dsh-nano-cloud-session/index.js:15-34`、`dsh-nano-cloud-session/index.js:187-237` |
| **合计** | **8 包** | — | **85** | **118** | manifest 版本以各包 `package.json` 为准 |

R/M 是扫描器口径。[DNN] 的额外 prefix 使其静态实际入口至少为 14、全仓至少为 86；不在上表偷偷扩充分母。

### 3.2 现有检查的实测与盲区

本轮分析期间执行并保留输出：

```text
node scripts/check-route-sensitivity.mjs
route-sensitivity OK: 85 routes, 0 drift
exit: 0

node scripts/check-feature-contract.mjs
feature-contract OK: 85 routes, ui+dataLocations for 6 plugins
exit: 0
```

原始日志位于本机临时目录 `/tmp/dsh-audit-1794723707/`；不依赖该目录作为长期证据，以上输出和附录 B 的复核方式留在本文。后续未改生产代码，因此未重复运行同一检查。

需要同时看到：

- `scripts/check-feature-contract.mjs:18-54` 只对 path/method/bodyLimit 做代码对账，对 UI/dataLocations 只要求指定插件存在快照，**不检验 responseShape、参数 schema 或业务错误语义**。
- 该脚本的固定清单是六包；JSON 实际有七包 UI/dataLocations 快照，新增[DNCS]不在必检列表。[DNMSC]本就不是普通 UI 包，不应为了凑数量伪造 UI 项。
- `scripts/check-clean-lib.mjs:28-39` 已列七包，含[DNMSC]，不含[DNCS]。
- `scripts/test-all.mjs:25-46` 自动发现根目录插件和共享包；不能把上面两个固定清单的遗漏，夸大为“新包完全没有测试入口”。
- `scripts/route-scan.mjs:302-325` 对[DNT]的 method/cap 使用手写 `known` 表，因此这里的 PASS 还含“扫描器假设没有落后”的前提。
- `packages/dsh-host-route-guard/src/route-guard.js:17-22` 明确 guard 不消费 body，`sessionBinding` 不执行对象级约束；它们不是检查绿后自动获得的运行时保证。

### 3.3 共享 package 已有基础，不是从零开始

| 共享包 | 已承担的职责 | 不应误认为已承担 |
|---|---|---|
| `dsh-host-route-guard` | 登记准入、连接服务 fail-closed、方法/字段漂移检查、JSON helper | 通用 body schema、对象授权、全协议 facade |
| `dsh-html-policy` | HTML 内容策略 | 跨插件协议或调用授权 |
| `dsh-nano-ui` | 共享 UI 基础 | 统一网络调用层 |
| `dsh-performance-review` | host/client 性能观测、聚合 | 业务错误合同、durable 审计权威 |
| `dsh-remote-data-schema` | 指定远程对象的结构验证 | 全部 HTTP/MCP 输入输出 schema |
| `dsh-s3-client` | S3 访问、签名、相关存储机制 | 所有插件状态权威或跨插件读写总线 |

包范围与导出可复核 `packages/dsh-host-route-guard/package.json:1-18`、`packages/dsh-html-policy/package.json:1-12`、`packages/dsh-nano-ui/package.json:1-12`、`packages/dsh-performance-review/package.json:1-21`、`packages/dsh-remote-data-schema/package.json:1-20`、`packages/dsh-s3-client/package.json:1-23`。

这里应复用的资产是**构建期共享、产物自包含**的机制，而不是引入一个必须额外安装、替各包保存状态的公共插件。

---

## 4. 逐插件债务登记

### 4.0 类型说明

| 类型 | 含义 |
|---|---|
| C | 合同/schema/能力声明与实现一致性 |
| E | 机器错误、失败分类与状态码语义 |
| T | 请求/流传输 facade、编码、协商与恢复 |
| A | 连接准入、scope、能力/主体边界 |
| S | canonical 状态、投影、生命周期与审计归属 |
| B | 构建生成、发布副本、版本与装配 |
| G | 台账、权威来源与验证覆盖 |

类型可以叠加；不是安全严重性等级。每包“规模”描述观察边界，**不把受影响面积直接当已损坏数量**。

### 4.1 [DNEE]：文件/Git 与外部能力的汇合点

**当前正资产**：HTTP 经共享 guard；工作区 store 对同 root 共享状态、去重请求；terminal 集成通过 Cordis 服务惰性发现并保留原生体验回退，而不是 window 总线。证据：`dsh-nano-explorer-extra/src/client/workspace-store.js:24-59`、`dsh-nano-explorer-extra/src/client/index.js:80-91`。

**规模**：18 路径/18 方法对；没有本包 MCP server；至少涉及 notepad、nanoTerminal、open-in-app 三类外部能力提供方，另有资源 URI 合同。以下登记 4 项。

| 编号 | 类型 | 形成机制与现状 | 规模/增长后果 | 事实证据 |
|---|---|---|---|---|
| E1115-DNEE-01 | E/T | 服务端 catch 输出 `400 {error}`，客户端 request 转换成返回值 `{ok:false,message}`；其他包使用 throw/嵌套 code。调用层必须认识本包特例 | 18 路由的注册 catch 共用；不表示每条业务都失败 | `dsh-nano-explorer-extra/src/host/routes.js:630-642`；`dsh-nano-explorer-extra/src/client/workspace-store.js:33-48` |
| E1115-DNEE-02 | C/T | body parser 自写，64 KiB 超限、非对象、解析错误均以普通 Error 进入本包处理；已有共享 reader 但没有公共校验/分类合同 | 1 公共 parser + 一族 handler；统一时不能只替换 fetch | `dsh-nano-explorer-extra/src/host/routes.js:15-35`；`packages/dsh-host-route-guard/src/route-guard.js:52-69` |
| E1115-DNEE-03 | C/A | `/open-in-app/apps|open|icon`、`window.__nanoNotepad.import`、`nanoTerminal.openLocal` 是不同接入方式；缺席检查不等于签名/版本/失败语义有共同合同 | 3 个已确认外部提供方；open-in-app 的 3 个路径形态不计入本包 18 路由 | `dsh-nano-explorer-extra/src/client/body.js:94-104`、`dsh-nano-explorer-extra/src/client/body.js:924-966`；`dsh-nano-explorer-extra/src/client/index.js:87-91` |
| E1115-DNEE-04 | A/G | `scopeOf` 根据传入 session 取 workspace；代码明确跨 workspace 只记观测、不阻止。不能把 ledger 的 sessionBinding 解释成所有权校验 | 文件/Git 一族 scope 的共同边界；是否增强必须回 host/已有裁决，不擅自改成“当前会话限定” | `dsh-nano-explorer-extra/src/host/routes.js:63-90`；`packages/dsh-host-route-guard/src/route-guard.js:21-22` |

**长期定位**：共享协议与错误机制，不共享本包工作区 store、文件/Git 业务或 host 的 session 权威。DNEE-04 是需显式保留/审视的权限模型，不在本报告判作新发现的越权漏洞。

### 4.2 [DNK]：页面入口已迁移，旧宿主所有权仍未完全退出

**当前正资产**：注册页面路由的数组已空，client 直接消费 `/nano-local-sandbox/*`；这说明平台切割已发生，不能按早期 Kitesurf 路由数量继续记账。证据：`dsh-nano-kitesurf/index.js:680-681`、`dsh-nano-kitesurf/src/client/index.js:12-29`。

**规模**：0 自有页面路由；17 个页面端点常量；2 个运行时 skill 注册；自身仍维护 43 条错误匹配规则，另保留一份容器 bridge 代码。以下登记 4 项。

| 编号 | 类型 | 形成机制与现状 | 规模/增长后果 | 事实证据 |
|---|---|---|---|---|
| E1115-DNK-01 | C/T | 17 个端点常量由消费者书写；POST helper 与多处直接 fetch 并存，错误读取 `error/errorId/reason` | 1 个跨包 HTTP 消费族；提供者改约需要搜索消费者，而非由公共声明派生 | `dsh-nano-kitesurf/src/client/index.js:12-29`、`dsh-nano-kitesurf/src/client/index.js:266-280` |
| E1115-DNK-02 | C/E | 自身 diagnostics 中有 43 条 ERROR_CATALOG 规则，[DNLS]另有 18 条；不再是一份目录四处派生 | 2 份规则目录，数量是 regex 行、不是 61 个唯一错误码；将来新增错误可能只更新一侧 | `dsh-nano-kitesurf/lib/diagnostics.js:36-84`；`dsh-nano-local-sandbox/src/host/error-catalog.js:1-25` |
| E1115-DNK-03 | B/S | package files 仍发容器资产；宿主入口仍引用旧锁路径并启动诊断 snapshot 推送定时器 | 发布清单中至少 5 项容器时代资产：container-engine、nano-kite、Dockerfile、entrypoint、mcp-bridge；不是单纯文档残留 | `dsh-nano-kitesurf/package.json:26-40`；`dsh-nano-kitesurf/index.js:430-438`、`dsh-nano-kitesurf/index.js:637-658` |
| E1115-DNK-04 | C/B/G | 模型侧两个 skill 仍由本包注册；容器 bridge 工具目录同时在本包 runtime 与[DNLS]profile 内保留 | 2 skill + 2 份 bridge 源码载体；未证明旧 runtime 在已安装环境仍执行，但它仍被声明为交付物 | `dsh-nano-kitesurf/index.js:660-678`；`dsh-nano-kitesurf/runtime/mcp-bridge.mjs:163-263`；`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:163-263` |

**对冻结合同的关系**：`docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md:55-58` 要求所有权硬切、旧资产彻底退役、无兼容第四阶段。这里登记的是可见残留，不据此恢复旧别名或否定全部切割成果；哪些残留可立即删除、哪些仍被调用，须沿当前调用链收口。

### 4.3 [DNMS]：同包内新旧接口语义并存，跨包控制合同已经形成

**当前正资产**：策略校验、原子写入、GET 派生投影和 sanctioned bundle writer 已有明确分工；开关不是第二份 enabled 状态。证据：`dsh-nano-model-selector/index.js:280-388`、`dsh-nano-model-selector/AGENTS.md:145-157`。

**规模**：5 路径/11 方法对；其中 2 条压缩控制路径；1 个 companion bundle 及 1 份压缩策略 durable 文件。以下登记 4 项。

| 编号 | 类型 | 形成机制与现状 | 规模/增长后果 | 事实证据 |
|---|---|---|---|---|
| E1115-DNMS-01 | E/T | catalog/media 旧面返回字符串 error，新压缩面返回嵌套 `{error:{code,reason}}`；media/compact client 分别解析 | 1 包内至少 2 套错误解析路径；不能靠统一外层 HTTP status 自动消除 | `dsh-nano-model-selector/index.js:150-157`、`dsh-nano-model-selector/index.js:216-228`、`dsh-nano-model-selector/index.js:280-310`；`dsh-nano-model-selector/src/client/compact.js:13-46`；`dsh-nano-model-selector/src/client/media.js:24-47` |
| E1115-DNMS-02 | C/E | readBody 与错误映射属于本包；部分分类通过 `error.message === 'body too large'` 判别 | 两条压缩控制路径各有失败映射；错误文本仍承担机器判别，增加改写成本 | `dsh-nano-model-selector/index.js:308-309`、`dsh-nano-model-selector/index.js:356-387` |
| E1115-DNMS-03 | C/B | compact-policy 在主包与 companion 各有一份当前逐字相同的代码，尚非从共享 package 的作者真源构建 | 2 份同构实现；本轮 SHA-256 相同，登记为维护分叉风险，不冒充已发生参数漂移 | `dsh-nano-model-selector/lib/compact-policy.js:1-47`；`dsh-nano-model-selector-compaction/lib/compact-policy.js:1-47` |
| E1115-DNMS-04 | C/S/G | 控制链横跨 policy、runtime projection、bundle inventory 与 pluginManager；普通路由清单无法说明谁是唯一写者、谁只是投影 | 2 控制路径 + 1 bundle + 1 canonical policy；已有正确分工需被公共合同保存，而不是被通用 facade 抹平 | `dsh-nano-model-selector/index.js:339-388`；`dsh-nano-model-selector/lib/compact-runtime.js:58-108`；`dsh-nano-model-selector/AGENTS.md:147-155` |

**不能倒退**：统一包不得另存开关状态、另设启停 writer、把 runtime 派生字段变成恢复读源；也不在本文重开已有压缩参数裁决。

### 4.4 [DNMSC]：零 REST 不等于零合同；主要是 native/装配债务

**当前正资产**：独立 host-only bundle，ON/OFF 由 `dsh.profile.bundles` 成员决定；主包常驻。安装实际先 ON、推荐安装后 OFF，包内说明已区分。证据：`dsh-nano-model-selector-compaction/AGENTS.md:3-24`。

**规模**：0 HTTP、0 自有 MCP server；1 个 Compaction Provider；4 份 preset 的完整配置重放；1 份 vendored 引擎实现及相关类型边界。以下登记 3 项。

| 编号 | 类型 | 形成机制与现状 | 规模/增长后果 | 事实证据 |
|---|---|---|---|---|
| E1115-DNMSC-01 | C/B/E | vendored 模块与宿主可能有不同 class identity；当前又尝试动态升级 ManualCompactionError 类型，失败则静默保留本地形态 | 1 个已接受的模块身份降级 + 1 条条件升级路径；不能靠“共享一个 Error 类”跨产物保证分类 | `dsh-nano-model-selector-compaction/lib/host-compaction.js:25-39`；`docs/specs/dsh-nano-model-selector/qna/DNMS01-qna.md:94-96` |
| E1115-DNMSC-02 | B/C | 互斥通过 4 个 preset 的 config.plugins 全量重放表达；上游增加行、包解析与版本窗口会影响装配 | 4 个 preset：standard/ptc/minimal/cordis；这是已接受的维护成本，不是未经批准侧载 | `dsh-nano-model-selector-compaction/scripts/gen-mutex-patch.mjs:3-23`、`dsh-nano-model-selector-compaction/scripts/gen-mutex-patch.mjs:30-43`；`dsh-nano-model-selector-compaction/AGENTS.md:22-24` |
| E1115-DNMSC-03 | G/S | Provider 注册、isolate 服务和 overlay 移除行为不是 HTTP 路由，无法由 route gate 描述。必须保留 native 合同的独立登记/验证视角 | 1 native Provider + 1 bundle 生命周期；不是要求给它新增 HTTP/MCP 门面 | `dsh-nano-model-selector-compaction/index.js:1-9`；`dsh-nano-model-selector-compaction/AGENTS.md:3-20`；`dsh-nano-model-selector-compaction/package.json:17-30` |

**长期定位**：引擎升级与装配合同归 native 兼容治理；公共 interface package 可承担稳定类型/错误判别，不能代替宿主提供官方扩展 seam，也不能把 vendored 引擎扩散成所有插件的公共依赖。

### 4.5 [DNN]：HTTP 家族最多样，浏览器公共面已经超出“导入记事本”

**当前正资产**：S3 client、远程对象 schema、HTML policy 均已复用；凭证签名留 host；发布语料的读取有白名单 RPC，不要求其他插件直读桶或浏览器 IDB。证据：`dsh-nano-notepad/package.json:1-63`、`dsh-nano-notepad/src/host/pipeline.js:172-196`。

**规模**：13 登记路径/14 方法对，另有至少 1 条 SDK prefix；五条多操作路径承载 27 个具名分支标签；1 个 window 公共根、BroadcastChannel、推理 SSE。以下登记 5 项。

| 编号 | 类型 | 形成机制与现状 | 规模/增长后果 | 事实证据 |
|---|---|---|---|---|
| E1115-DNN-01 | A/B/G | SDK prefix 因公共 guard 只支持 exact 而旁路注册，手动调用 connection fence；不在 13 行扫描结果里 | +1 已确认 prefix 盲点；**有手动准入，不宣称未鉴权**，但不受同一路径/method 登记闭环约束 | `dsh-nano-notepad/index.js:334-357`、`dsh-nano-notepad/index.js:389-407` |
| E1115-DNN-02 | E/T/C | index、pipeline、fx bridge 有各自 reader/错误分类；sync rpc 只按 HTTP 成败处理。fx chat reader 未使用 route.bodyLimit | 至少 3 个 host 请求处理载体 + 1 个浏览器 sync helper；并非每条 reader 都无大小限制 | `dsh-nano-notepad/index.js:105-121`、`dsh-nano-notepad/index.js:269-277`；`dsh-nano-notepad/src/host/pipeline.js:92-110`；`dsh-nano-notepad/src/host/fx-bridge.js:142-156`；`dsh-nano-notepad/src/client/sync.js:53-61` |
| E1115-DNN-03 | C/G | 路径登记没有覆盖路径内 operation；`/rpc` 虽在注释中称“内部 MCP/RPC”，实际为 `{method,params}` 的自定义只读 JSON RPC | 5 路径/27 标签；其中 RPC 为 5 个 method 标签、含 1 对语义别名，不是标准 MCP 工具目录 | `dsh-nano-notepad/src/host/s3-sync.js:287-315`、`dsh-nano-notepad/src/host/s3-sync.js:379-410`；`dsh-nano-notepad/src/host/pipeline.js:118-159`、`dsh-nano-notepad/src/host/pipeline.js:172-234`、`dsh-nano-notepad/src/host/pipeline.js:241-259` |
| E1115-DNN-04 | C/A/S | `__nanoNotepad` 同时承载跨插件 import、诊断、fx/corpus/sqlite/pipeline 及测试辅助；返回活对象和模块，公共/内部/测试面未分层 | 1 全局根下至少 import 与 fx 两大能力族，另有 BroadcastChannel；不是按 window 属性数估算“漏洞数” | `dsh-nano-notepad/src/client/panel.js:4438-4444`、`dsh-nano-notepad/src/client/panel.js:4500-4557`、`dsh-nano-notepad/src/client/panel.js:4557-4624`；`dsh-nano-explorer-extra/src/client/body.js:955-966` |
| E1115-DNN-05 | T/E/C | fx chat 先返回 JSON 错误，成功后输出 OpenAI 风格 SSE，流中错误又用 SSE error payload；不能用 res.json() facade 统一 | 1 推理 SSE 面 + WASM/SDK 静态资产例外；需要协议适配，不是另造聊天协议 | `dsh-nano-notepad/src/host/fx-bridge.js:140-198`、`dsh-nano-notepad/src/host/fx-bridge.js:207-212`、`dsh-nano-notepad/src/host/fx-bridge.js:268-273`；`dsh-nano-notepad/index.js:362-407` |

**不能倒退**：不要把 corpus、IDB、SQLite、S3 和 pipeline 状态全部移进“公共 facade store”；也不能把只读 RPC 未经裁决直接升级为通用跨插件写通道。

### 4.6 [DNT]：局部合同最完整之一，但声明、消费与装配仍有断点

**当前正资产**：OpenRPC 生成 TOOLS；13 个稳定 kind；12 个事件类型声明；SSE 有 snapshot/seq/missed/heartbeat；持久化状态放安装树之外；generic McpLane 使用 server 返回的 attach.url。证据：`dsh-nano-terminal/src/host/mcp.js:18-29`、`dsh-nano-terminal/src/host/errors.js:1-20`、`dsh-nano-terminal/schema/dnt-mcp.openrpc.json:8-16`、`dsh-nano-terminal/src/host/events.js:48-62`、`dsh-nano-terminal/index.js:31-41`、`dsh-nano-terminal/src/client/lanes.js:199-209`。

**规模**：6 个登记入口，其中 1 WS、1 SSE、1 MCP、3 普通 JSON 管理入口；19 MCP 工具，另有 slash 命令与浏览器 Cordis 服务。以下登记 6 项。

| 编号 | 类型 | 形成机制与现状 | 规模/增长后果 | 事实证据 |
|---|---|---|---|---|
| E1115-DNT-01 | B/C/A | lib 中 guard 与公共源码逐行对比，只有注册 kind 一行被改为支持 spec.kind；build 不烤 route table、不重建该 guard，manifest 无 route-guard devDep | 1 私改 guard 副本 + 1 本地 5 行 route table（第 6 个 WS 另注册）；共享包修复不随普通 build 自动进入 | `dsh-nano-terminal/lib/route-guard.js:235-245` 对照 `packages/dsh-host-route-guard/src/route-guard.js:235-245`；`dsh-nano-terminal/scripts/build-client.mjs:18-56`；`dsh-nano-terminal/package.json:25-33`；`dsh-nano-terminal/lib/route-table.js:1-8` |
| E1115-DNT-02 | C/E | schema 的 create 仍广告 local/mcp/isolate；host implementation 明确只接 local。TOOLS 生成不等于 dispatcher 执行 inputSchema 校验；kind 也在代码中另列一次 | 19 工具声明；create 的 1 个确定声明差异；13 kind 双载体。不能推论所有参数都毫无局部验证 | `dsh-nano-terminal/schema/dnt-mcp.openrpc.json:18-42`；`dsh-nano-terminal/src/host/mcp.js:18-29`、`dsh-nano-terminal/src/host/mcp.js:53-60`、`dsh-nano-terminal/src/host/mcp.js:219-240`；`dsh-nano-terminal/src/host/errors.js:1-20` |
| E1115-DNT-03 | T/C | LocalLane 有 v2 channel 编解码；McpLane attach 发送 v:2，但 binary 输入输出仍裸转，不依据 ready.v 切编解码 | 1 generic McpLane 与本仓 v2 server 组合的静态不一致；本轮未做真实连接，不能把所有远端接入都判失败 | `dsh-nano-terminal/src/client/lanes.js:24-35`、`dsh-nano-terminal/src/client/lanes.js:116-143`、`dsh-nano-terminal/src/client/lanes.js:212-261`；`dsh-nano-terminal/index.js:102-125` |
| E1115-DNT-04 | T/S/C | McpLane 有自身 reconnect/backoff；本地 create 每次生成 randomUUID。[DNLS]冻结合同又定义按 sessionId 的幂等及有限 transport 重连，需要明确各提供者适用范围 | 1 create 语义 + 1 reconnect 状态机，横跨两个提供者；禁止据此给 POST 自动重试 | `dsh-nano-terminal/src/host/sessions.js:112-130`；`dsh-nano-terminal/src/client/lanes.js:212-249`；`docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md:64-64` |
| E1115-DNT-05 | S/G | index 配 auditPath，但 createMcpHandler 的 audit 只在 writeAudit 被传入时写，且 void auditPath；当前 apply 未传该 writer | 1 宿主控制面审计接线债务；不把“路径常量存在”算实际落盘，也未访问真实审计文件 | `dsh-nano-terminal/index.js:34-62`；`dsh-nano-terminal/src/host/mcp.js:38-44`；`dsh-nano-terminal/AGENTS.md:86-90` |
| E1115-DNT-06 | A/E/G | WS upgrade 手动准入，HTTP 用 guard；WS open 错误只传 message，没有 MCP 的 kind；跨传输一致性不由 HTTP 登记检查覆盖 | 2 准入路径 + 多种错误出口；不宣称 WS 无鉴权，也不把 sessionBinding metadata 当 session owner 校验 | `dsh-nano-terminal/index.js:66-74`、`dsh-nano-terminal/index.js:164-185`、`dsh-nano-terminal/index.js:193-270`；`dsh-nano-terminal/src/host/mcp.js:233-240` |

**长期定位**：保留终端状态机、屏幕镜像、输入 gate 与背压的领域实现。抽取的是双方共享的工具/帧/能力合同和通用适配，不是把 PTY 字节流转成普通 REST 响应。

### 4.7 [DNLS]：平台合同最需要优先固化，当前“声明完成”与“接线完成”有明显差距

**当前正资产**：独立特权包；backend 分层；已有 instance registry、policy fingerprint、CDP keeper、terminal driver 模块；HTTP 共用注册准入。这些是基础资产，但不能只凭文件存在推断生产调用链已接通。证据：`dsh-nano-local-sandbox/index.js:6-19`、`dsh-nano-local-sandbox/src/host/instance-registry.js:21-69`、`dsh-nano-local-sandbox/src/host/cdp-keeper.js:5-43`。

**规模**：31 路径/57 方法对；host MCP 20 个名字；容器 bridge 15 个自有名字；terminal driver 另有 8 个 term 工具声明。以下登记 6 项。

| 编号 | 类型 | 形成机制与现状 | 规模/增长后果 | 事实证据 |
|---|---|---|---|---|
| E1115-DNLS-01 | C/T | host MCP 20 个 inputSchema 全为空对象且禁额外属性；tools/call 不传 arguments，20 个已知名统一返回 diagnostics/pushes，未按名分发业务；initialize 等走非 JSON-RPC fallback | 20 个声明槽位有目录，但不能记作 20 个业务已实现；如 ensure/list 等不能从该 handler 推出实际操作 | `dsh-nano-local-sandbox/src/host/mcp-sandbox.js:2-38`；`dsh-nano-local-sandbox/src/host/routes.js:514-529` |
| E1115-DNLS-02 | C/E/S | host 20 工具与容器 bridge 15 工具只重合 13 名；后者还依赖外部 host snapshot，返回使用 MCP content/structuredContent/isError，与 host result 形状不同 | host-only 7、bridge-only 2；是两个角色/合同分叉，不能未裁决就要求两个目录完全相同 | `dsh-nano-local-sandbox/src/host/mcp-sandbox.js:2-30`；`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:163-278`、`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:291-315` |
| E1115-DNLS-03 | C/A/T | route 声明携带 bodyLimit，但 handler 使用自写 readJson：不累计限额、非法 JSON 返回 {}。共同 metadata 不能兑现请求约束 | 31 路由的统一 handler 框架中有该 reader 的多处调用；不是说 31 条都接收 body | `dsh-nano-local-sandbox/src/host/routes.js:283-290`、`dsh-nano-local-sandbox/src/host/routes.js:346-368`；`packages/dsh-host-route-guard/src/route-guard.js:17-22` |
| E1115-DNLS-04 | S/A/C | 生产 apply 只建一个 session 对象并传 routeSpecs；HTTP 路径使用该对象和按环境的容器名，未接入独立 instance registry 的 per-session ensure/policyFingerprint 链 | 1 HTTP 生产入口、31 路由共用状态；与已有 per-session 模块/冻结方向不等价，需生产接线验证 | `dsh-nano-local-sandbox/index.js:14-19`；`dsh-nano-local-sandbox/src/host/routes.js:55-76`、`dsh-nano-local-sandbox/src/host/routes.js:346-359`；`dsh-nano-local-sandbox/src/host/instance-registry.js:21-69` |
| E1115-DNLS-05 | C/E/B | 本包 18 条错误 regex、[DNK]43 条 regex、[DNT]13 kind 并存；本包目录虽含两个 sandbox 新 id，但公共错误合同没有共同可执行来源 | 至少 3 个错误目录载体；regex 条数与 kind 数不能相加成唯一错误码数 | `dsh-nano-local-sandbox/src/host/error-catalog.js:1-25`；`dsh-nano-kitesurf/lib/diagnostics.js:41-84`；`dsh-nano-terminal/src/host/errors.js:6-20`；`docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md:62-64` |
| E1115-DNLS-06 | C/T/B | terminal-driver 声明 8 个工具并有校验/create helper，但 host MCP 列表只有 sandbox 名，生产 index→routeSpecs→MCP 分发链未接此 driver；profile 的 pty-entry 文件仅导出路径常量，没有 PTY 服务实现 | 8 个声明 + 1 个两行 profile 入口不能额外计为已公开/接通的 terminal 能力；模块级 helper 不等于公开 endpoint | `dsh-nano-local-sandbox/src/host/terminal-driver.js:4-74`；`dsh-nano-local-sandbox/profiles/terminal/pty-entry.mjs:1-2`；`dsh-nano-local-sandbox/index.js:6-19`；`dsh-nano-local-sandbox/src/host/routes.js:38-39`、`dsh-nano-local-sandbox/src/host/routes.js:514-529` |

**优先判断**：这里首先要偿还的是“公共合同能否驱动真实能力”，不是先把空 schema 和统一摘要包装得更漂亮。已有模块不应被推倒重写；应将生产接线与冻结合同逐项对账，不能用模块测试或台账 PASS 替代。

### 4.8 [DNCS]：carrier 隔离已有，但 native 会话投影增加了新的生命周期合同

**当前正资产**：浏览器只请求同源 host，carrier token 留 host；CarrierError 保留上游特有语义，尤其 403 的 forbidden-or-invisible；archive 与 terminate 未被错误合并。证据：`dsh-nano-cloud-session/index.js:1-16`、`dsh-nano-cloud-session/src/host/devin-api.js:1-39`。

**规模**：12 路径/12 方法对，全部 POST；按当前具名分发展开为 31 个分支标签；1 个 carrier 实现、1 条原生 session/agent 投影链；无自有 MCP server。以下登记 4 项。

| 编号 | 类型 | 形成机制与现状 | 规模/增长后果 | 事实证据 |
|---|---|---|---|---|
| E1115-DNCS-01 | E/T | 自有 post helper、CarrierError 和 work wrapper；共享 readJsonBody 的超限/解析异常不是 CarrierError，落入通用 500 分支 | 12 路由共用 work；不是另加一套通用重试就能解决，也不能抹掉上游 status 语义 | `dsh-nano-cloud-session/src/client/api.js:4-19`；`dsh-nano-cloud-session/index.js:80-93`；`packages/dsh-host-route-guard/src/route-guard.js:57-69` |
| E1115-DNCS-02 | C/G | 路径内 config/action、sessions/op、session/op、catalog/resource 多路分发；路由台账不含这些分支的独立参数/错误/副作用合同 | 12 路径展开 31 标签，详细算式见 §5.3；不是 31 个互不重叠业务实现 | `dsh-nano-cloud-session/index.js:108-137`、`dsh-nano-cloud-session/index.js:240-269`、`dsh-nano-cloud-session/index.js:289-350` |
| E1115-DNCS-03 | S/C/A | nativeOpen 创建本地 session 并投影远端消息，经 ctx.agents.enter 进入原生交互；fake agent 的 cancel 等为空操作，followup 则调用 carrier | 1 native bridge 涉及远端真源、本地会话/事件、agent 生命周期；需明确投影/重建/取消语义，不能直接判成本地第二真源 | `dsh-nano-cloud-session/index.js:166-237`；`dsh-nano-cloud-session/src/client/index.js:85-98` |
| E1115-DNCS-04 | G/B | 路由扫描已覆盖，但 feature-contract 的 UI/dataLocations 必检列表及 clean-lib 包列表未同步 | 2 个手工包清单遗漏；不等于本包未测试，test-all 是自动发现 | `scripts/check-feature-contract.mjs:18-18`；`scripts/check-clean-lib.mjs:28-39`；`scripts/test-all.mjs:25-46` |

**长期定位**：carrier adapter 属领域边界；公共包不持 token、不变成云 session 的新 canonical。原生 agent/session 的扩展 seam 必须按[dsh]公开能力治理，不从[nano-agent]或私域拓扑搬入另一套协议。

---

## 5. 从 REST API / HTTP 视角核算债务

### 5.1 先把“HTTP 路由”和“REST”分开

本仓大量 POST 以 body 的 op/action 分发，更接近 operation-oriented JSON API。它们不是仅因使用 HTTP 就自动成为 REST 资源模型；本报告也不把改成资源式 URL 当作必要偿债动作。

85 项/118 方法对分解如下：

| 传输/响应族 | R | M | 归属与说明 |
|---|---:|---:|---|
| 自有 JSON/HTTP，包括 operation 式与自定义 RPC | 79 | 111 | [DNEE]18、[DNMS]5、[DNLS]除 MCP 的30、[DNCS]12、[DNT]普通管理3、[DNN]除 WASM/推理 SSE 的11 |
| MCP over HTTP | 2 | 2 | [DNT] `/mcp`、[DNLS] `/mcp`；在 §6 再按工具语义观察，不重复计净接口总数 |
| SSE | 2 | 2 | [DNT] events、[DNN] fx chat |
| WebSocket upgrade | 1 | 1 | [DNT] stream；GET 只描述握手入口 |
| WASM 静态资源 | 1 | 2 | [DNN] fx-core.wasm 的 GET/HEAD |
| **登记合计** | **85** | **118** | 不含额外 SDK prefix |
| 扫描外 SDK 静态 prefix | **至少 +1** | **不赋值** | handler 无对应显式 method allowlist；不能凭 GET 注释擅自按两个方法入账 |

上表有意不声称“79 条都有缺陷”：它描述公共 JSON facade 可能覆盖的面积。MCP、SSE、WS、WASM 的协议职责不能被一个 `res.json()` 封装替代。

**方法分布复核**：GET 29、HEAD 22、POST 64、PUT 2、DELETE 1，总计 118。方法对不是风险权重，不按 POST 数推算写操作数，因部分 POST 是只读查询。

### 5.2 HTTP 债务的机制层次

| 层次 | 当前资产 | 当前债务 | 影响范围 |
|---|---|---|---|
| 注册/路由模型 | scan → sensitivity → baked table → guard | exact/prefix/upgrade 分别处理；存在私改副本和旁路 | 85 登记项 + 至少 1 盲点；不等于全无保护 |
| 连接准入 | connection.requestRejection，注册期检查 callable | 不同传输有不同接入点；元数据不等于对象授权 | 普通 HTTP、WS、SDK 需保持同一 host 权限来源 |
| 请求解析/约束 | 公共 reader 已存在，部分路由使用 | 各包 parser、无上限 reader、非法 JSON 变空对象、错误误映射 | §4 的具体 reader/handler，不以全仓路由数冒充失败数量 |
| operation/schema | 路径和 bodyLimit 有台账 | op/action 内部合同无共同机器源 | 至少确认[DNN]27 标签、[DNCS]31 标签 |
| 响应/错误 | 部分领域已有稳定 code/kind/reason | 返回值失败与 throw、顶层与嵌套、上游与本地失败混合 | JSON 家族共同机制；标准协议外壳需要适配 |
| 客户端调用 | 多个本地 wrapper 可作为迁移 seam | 不能统一 cancellation、空响应、错误判别与版本不兼容 | 至少 DNEE/DNK/DNMS/DNN/DNCS 五个浏览器调用实现族，另有 DNT lane |
| 状态与副作用 | 各包有已有 canonical/投影分工 | 通用 retry、幂等和 UI 成败表达尚不能安全复用 | 创建会话/终端、消息、Git 写操作尤其不能盲目重放 |

**不是新的安全漏洞定级**：例如[DNLS]未消费 bodyLimit 是静态机制缺口；是否被其他宿主级限制兜住、实际能达到多大内存、是否已触发事故，本轮未测。

### 5.3 路径内 operation 的放大

#### [DNN]：五条路径，27 个声明标签

| 路径后缀 | 标签数 | 标签 |
|---|---:|---|
| `/s3/object` | 5 | put、get、head、delete、list |
| `/s3/config` | 8 | list、save、delete、probe、testOne、beginSwitch、commitSwitch、abortSwitch |
| `/pipeline/s3` | 5 | put、get、del、list、head |
| `/pipeline/claim` | 4 | acquire、renew、read、release |
| `/rpc` | 5 | manifest.get、corpus.list、corpus.read、lsrag.manifest、claim.read |
| **合计** | **27** | probe/testOne、manifest.get/lsrag.manifest 含复用/别名，不算独立实现 |

证据：`dsh-nano-notepad/src/host/s3-sync.js:287-315`、`dsh-nano-notepad/src/host/s3-sync.js:379-410`、`dsh-nano-notepad/src/host/pipeline.js:118-159`、`dsh-nano-notepad/src/host/pipeline.js:185-234`、`dsh-nano-notepad/src/host/pipeline.js:246-259`。

#### [DNCS]：十二条路径，31 个声明分支

- `/config`：7 个 action，list/save/remove/activate/test/security/ssh-key。
- `/sessions`：2 个 op，list/insights。
- `/session`：10 个 op，native_open/get/messages/attachments/insights/generate_insights/tags/set_tags/append_tags/sleep。
- `/catalog`：4 个 resource，playbooks/secrets/knowledge/repositories。
- 其余 8 条路径各计一个默认功能分支。
- **7 + 2 + 10 + 4 + 8 = 31**。其中 status 复用配置 list，仍不是 31 项唯一实现。

证据：`dsh-nano-cloud-session/index.js:108-137`、`dsh-nano-cloud-session/index.js:240-269`、`dsh-nano-cloud-session/index.js:289-350`。

**两组都是已确认的局部展开，不是全仓 operation 总数，也不是可与 85 相加的增量**。例如[DNLS]的 kite/control、[DNMS]策略更新也有各自语义，本轮不虚构一个没有逐项分类的全仓 REST operation 总数。

### 5.4 REST/HTTP 视角的小结

债务规模不是“85 个接口要换 URL”，而是：

1. 至少 86 个静态入口声明中，85 个进入现有扫描口径，至少 1 个 prefix 在外。
2. 79 个 JSON 登记项可考虑共同 transport/error facade，但其中多操作合同需要比路径更细的声明。
3. 至少两个已展开领域证明 route 数会低估合同维护量。
4. 其余 6 个登记项承载标准/流/资源协议，需要保留协议外壳。
5. 上游 REST、原生扩展和外部插件调用必须单列消费合同，不进入本仓 host 路由分母。

---

## 6. 从 MCP 协议视角核算债务

### 6.1 提供面、声明面与未接线模块

| 提供/声明面 | 传输入口 | 自有工具声明 | 当前实现认识 | 计量处理 |
|---|---|---:|---|---|
| [DNT] host MCP | POST `/dsh-nano-terminal/mcp` | 19 | OpenRPC → TOOLS；有 JSON-RPC 分发与工具实现 | 计入 host 39 |
| [DNLS] host MCP | POST `/nano-local-sandbox/mcp` | 20 | list 可列名；call 统一摘要；非完整生命周期操作分发 | 计入声明，不计为 20 项业务验证通过 |
| [DNLS] Kitesurf profile bridge | 容器 WS `/mcp` | 15 自有 `sandbox.*` | 合并 agent-browser child 目录；有 native reply/isError 形状 | 计入已知自有声明；child 动态数未知 |
| [DNLS] terminal-driver 模块 | 当前 host 生产链未公开这 8 项 | 8 | schema/校验/helper 已有；PTY profile 入口只有路径常量，不等于服务已实现 | 单列，不加进 54 |
| [DNK] runtime bridge 副本 | 仍在 package files 中 | 同一族 15 名 | 源码/交付重复；不据此推定另一个在线 endpoint | 记构建/退役债务，不额外加一次 |
| [DNN] `/rpc` | POST 自定义 JSON RPC | 5 method 标签 | 非 MCP initialize/tools/list/tools/call 协议 | 留在 HTTP/RPC 账，不混为 MCP 工具 |
| [DNEE]/[DNMS]/[DNMSC]/[DNCS] | 无本轮确认的自有 MCP server | 0 | native 服务、skills、carrier REST 不等于 MCP | 不为凑统一而改造 |

核心证据：`dsh-nano-terminal/src/host/mcp.js:18-29`、`dsh-nano-terminal/src/host/mcp.js:184-248`；`dsh-nano-local-sandbox/src/host/mcp-sandbox.js:2-38`；`dsh-nano-local-sandbox/src/host/routes.js:514-529`；`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:163-278`、`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:505-516`；`dsh-nano-local-sandbox/src/host/terminal-driver.js:4-28`；`dsh-nano-notepad/src/host/pipeline.js:172-196`。

### 6.2 工具目录集合对账

**[DNT] 的 19 名**：

```text
term.session.create  term.session.list    term.session.input
term.send            term.keys            term.interrupt
term.wait            term.session.read    term.session.resize
term.session.keep    term.session.label   term.events
term.session.note    term.template.list   term.template.run
term.session.close   term.audit           term.lane.status
term.skill
```

唯一名字来自 `dsh-nano-terminal/schema/dnt-mcp.openrpc.json` 的 `methods` 数组；工具表派生点见 `dsh-nano-terminal/src/host/mcp.js:18-29`。

**[DNLS] host 与容器 bridge 的集合关系**：

| 分组 | 数量 | 完整名字 |
|---|---:|---|
| 两者共有 | 13 | sandbox.diagnostics、sandbox.console、sandbox.operations、sandbox.error_catalog、sandbox.targets、sandbox.history、sandbox.dom、sandbox.elements、sandbox.selftest、sandbox.network、sandbox.ports、sandbox.recovery_plan、sandbox.bridge_health |
| 仅 host 声明 | 7 | sandbox.profile.list、sandbox.profile.describe、sandbox.instance.ensure、sandbox.instance.start、sandbox.instance.stop、sandbox.instance.restart、sandbox.instance.status |
| 仅 bridge 声明 | 2 | sandbox.snapshot、sandbox.control |
| **并集** | **22** | **20 + 15 - 13 = 22** |

目录分源证据：`dsh-nano-local-sandbox/src/host/mcp-sandbox.js:2-23`、`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:163-263`。

因此：

- host 声明槽位：`19 + 20 = 39`。
- 加容器 bridge 的已知自有槽位：`19 + 20 + 15 = 54`。
- 唯一自有工具名：`19 + 22 = 41`。
- terminal-driver 的 8 名均为[DNT] 19 名的子集，**不增加 U**；但它们的 inputSchema 和语义仍可能分叉。
- agent-browser 子进程工具是运行时合并的外部集合，未读取实际在线 tools/list，**不填写数量、不计算全量工具覆盖率**。

### 6.3 MCP 债务不只是“再套一层 JSON-RPC”

| 机制 | [DNT] | [DNLS] host | [DNLS]容器 bridge | 债务认识 |
|---|---|---|---|---|
| 握手/协议版本 | 有 initialize，版本常量 | initialize 落入普通 `{ok,tools}` fallback | 与 child/bridge 消息转发相关 | 不把路径叫 mcp 当作协议完整证据 |
| tools/list | OpenRPC 生成 | 20 个空参数对象 schema | child 列表 + 15 自有 schema | 至少 3 个目录来源/派生链 |
| tools/call 入参 | 分发直接传 args；领域内部分验证 | 未向 answerNativeTool 传 arguments | native 分支与 child 转发 | 生成 schema 不等于执行 schema |
| 工具成功返回 | content + structuredContent | result 直接放摘要对象 | content + structuredContent | 同名 sandbox 名不能保证可替换 |
| 工具失败 | isError + kind/message | answer.ok 对应 HTTP 404，result 仍为普通对象 | isError 随 ok:false 派生 | 协议错误、工具失败、transport 失败缺公共分类 |
| 业务接线 | 多项实际领域分支 | 20 名统一摘要 | 多项依赖 host snapshot | 宣告能力、依赖能力与真实执行能力未清晰区分 |
| lifecycle/attach | MCP create + WS 数据面 | host 目录无 term.* | profile terminal 是另一个交付方向 | 工具调用成功不是 attach/流恢复成功 |

分发证据：`dsh-nano-terminal/src/host/mcp.js:184-248`、`dsh-nano-local-sandbox/src/host/routes.js:514-529`、`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:267-315`、`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:547-580`。

**边界提醒**：

- 不把 JSON-RPC 错误与 MCP 工具业务失败强制合并为一个 HTTP 错误码。
- 不因两个 endpoint 都有 sandbox 名就擅自合并进程、凭证或能力所有权；先由 QNA 明确它们是互补角色还是应统一的公共提供面。
- [DNT] generic McpLane 应是标准消费/协商适配，不新增专有 sandbox lane；该边界已经冻结，见 `docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md:64-64`。
- 本轮未逐条执行 19/20/15 工具，不提供“可用工具比例”或“标准符合率”。

### 6.4 MCP 视角的小结

**规模已经达到至少三个不同提供面、54 个自有声明槽位、41 个唯一名字，以及未公开的 8 项 terminal 声明模块。**

当前最重的债务是“声明—验证—业务接线—输出—attach/生命周期”未形成可复用链，而不只是工具名过多。继续逐插件写 schema/dispatcher，会让每个新消费者都携带提供者特例，最终破坏通用 McpLane 和平台中立。

---

## 7. 横向机制债务：为什么新增一个 helper 不足以偿债

| 编号 | 类型 | 机制与事实 | 长期后果 |
|---|---|---|---|
| E1115-CROSS-01 | G | 活跃包8、feature UI 必检6、clean-lib7、JSON UI 快照7、人工 inventory35、扫描85、已确认静态入口至少86；它们描述不同范围但缺少派生关系。证据：`AGENTS.md:23-32`、`scripts/check-feature-contract.mjs:18-18`、`scripts/check-clean-lib.mjs:28-39`、`security/route-inventory.md:1-7`、§3.2/附录A | 每加包都要人工寻找多个包列表；数量看似接近但覆盖不可推断 |
| E1115-CROSS-02 | B/G | 多个 build 脚本各自 bakeRouteTable；[DNT]是另一种副本路径。[DNMS]脚本先 bake 再 bundle，但没有执行两个完整台账检查。证据：`dsh-nano-model-selector/scripts/build-client.mjs:9-36`、`dsh-nano-model-selector/scripts/build-client.mjs:72-88`、`dsh-nano-terminal/scripts/build-client.mjs:18-56` | 运行时不读仓根是正确约束，但产物来源与再生成责任分散；“跑过 build”不等于全合同对账 |
| E1115-CROSS-03 | C/E | 至少存在字符串 error、reason/message、嵌套 error.code/reason、errorId/error、MCP kind、OpenAI SSE error 等输出族；其中有合法标准差异，也有自有语义重复。证据：§4 的具体失败出口 | 不能靠删到一种键名解决；需要共同语义与协议适配，且稳定判别不能只依赖跨 bundle instanceof |
| E1115-CROSS-04 | G/S/A | 非 HTTP 合同分布于 manifest、QNA、OpenRPC、window API、ctx 服务与业务实现；旧文的全 kind registry 仍未成为现行实现。证据：`docs/code-review/26-nov/contract-and-facade.md:253-312`、`dsh-nano-terminal/src/client/index.js:220-238`、`dsh-nano-notepad/src/client/panel.js:4500-4624`、`dsh-nano-cloud-session/index.js:187-237` | 若再加一个手写总表而不明确作者真源，会从“两份漂移”变成“三份漂移” |

**不能误判为债务的差异**：

- 每包业务模型不同，不应因此建设全仓共享 mutable store。
- 只安装某个插件时不需要邻居源码，是必须保留的交付性质。
- 标准 MCP、OpenAI SSE、二进制资源与自有 JSON 有不同 wire format，是合法协议边界。
- [DNLS]独占特权、[DNT]保留 local lane、[DNMSC]可 OFF 回原生，分别属于已明确的所有权/体验合同，不是需要“统一掉”的重复。
- build 产物内的只读代码/schema 副本不自动构成 durable 状态双真源；债务在于作者来源是否唯一、能否一致再生成，而不是简单禁止产物复制。

---

## 8. 统一思维架构与长期治理模型

本节是**治理建议**，不是本轮新冻结合同。沿用旧文包名 `dsh-interface` 也可，最终名字、导出面和 wire 变更留 QNA；不以命名代替设计。

### 8.1 一个概念模型，多个明确的协议出口

```text
公共合同的作者真源
  ├─ 接口所有者 / 调用主体 / scope 与权限来源
  ├─ 输入输出结构 / 稳定机器错误 / 能力与版本
  └─ 已裁决的副作用、幂等、取消、恢复与生命周期
                 │
           只读派生与构建
                 │
  ┌──────────────┼────────────────┬─────────────────┐
  自有 JSON/HTTP  MCP adapter      WS/SSE adapter    native 扩展合同
  host + client   server + client  codec + lifecycle Provider/service/projection
  └──────────────┴────────────────┴─────────────────┘
                 │
       每包自包含产物；领域状态仍归领域/host
```

重点是“共同语义、不同适配”，不是“所有协议经过同一个中央服务”。

### 8.2 package 的合理职责

建议公共包只拥有可跨包复用、平台中立且不持 canonical 业务状态的部分：

- 已冻结公共合同的 schema、稳定标识、能力/版本声明与必要 codec。
- 自有 JSON 请求/响应适配；host/client 的公共错误判别与协议异常分类。
- MCP 的通用 server/client adapter，以及公共 terminal/sandbox 合同的可执行来源。
- 协议工具目录、客户端调用声明、必要文档/台账视图的派生工具。
- 与现有 route-guard 的单入口集成，含 exact/prefix/upgrade 的明确模型；不是第二套注册器。

包内可以按 host/client/contract/transport 等职责分导出，避免浏览器打入 node 模块；这是职责建议，不在这里冻结签名、错误枚举或新事件。

### 8.3 必须留在领域或 host 的部分

| 所有者 | 应保留职责 |
|---|---|
| [dsh] host | 连接身份、原生权限与 session 权威、pluginManager sanctioned 写者、官方扩展生命周期 |
| [DNLS] | 特权 backend、profile/实例、容器/CDP/terminal driver 的平台实现与政策适配 |
| [DNT] | PTY 会话、屏幕、输入闸门、背压与终端恢复 |
| [DNN] | 草稿、IDB/SQLite、语料、claim/S3 发布的领域权威和转换 |
| [DNMS]/[DNMSC] | 压缩策略、派生 runtime、Provider 算法与 overlay 装配 |
| [DNCS] | carrier 身份和业务映射；远端真源与本地投影的清晰边界 |
| [DNEE]/[DNK] | 本领域 UI/store、交互与受声明约束的能力消费 |

不允许共享包成为新凭证库、新 canonical 状态库、私有跨插件 RPC 总线，或引入对[dsh-mini]/[nano-agent]内部运行时的依赖。

### 8.4 面向增长的成本模型

本节是设计推演，不是已测性能或业务增长预测：

| 未来变化 | 当前复制式机制的成本 | 长期治理应让变化落到哪里 |
|---|---|---|
| 增加一个普通 UI 插件 | 重写 reader/fetch/error，补多个列表 | 复用公共机制；只新增本领域合同与显式消费声明 |
| 增加一个 sandbox profile/backend | 消费者可能复制路径、工具、重试特例 | 实现留[DNLS]，L2 能力/端点由提供者声明，消费者不认识特权细节 |
| 增加 MCP 消费者 | 各自猜 tools/schema/result/attach | 使用共同 adapter、能力协商和领域合同，不新增专用 lane |
| 增加云 carrier | 让所有 UI 认识上游字段和状态码 | 在 carrier adapter 隔离；公共层保留错误语义，不抹平供应商事实 |
| 扩大 Web/Desktop/宿主版本范围 | 硬编地址和模块身份条件分支扩散 | 版本/能力与 transport 来源显式；bundle identity 不作为唯一机器判别 |
| 引入真实多用户/更细对象权限 | 把当前 connection peer 误当全量授权 | 回到 host 权限合同，由[业主]裁决；插件 package 不私自发明 token/role |
| 发布包版本不同步 | 保留永久别名、双写与猜测兜底 | 有限且显式的兼容关系、先验收后成对切换、不保留未经授权的第二合同 |

期望削减的是“每新增一条消费关系就复制协议实现”的成本。不能在报告中假设任意未来工具、权限面和重试义务已获批准。

### 8.5 单一真源如何同时服务代码、台账和文档

1. **作者真源先明确**：领域合同已有 QNA/OpenRPC 的，不另外复制一份可手改的公共定义作为第二权威；迁入 package 必须说明哪处继续承载决定来源、哪处是可执行派生。
2. **安全字段仍需人审**：生成器可以对账路径/schema，不能从代码自动推断“允许谁调用、能否重试、属于何种能力”并当成[业主]决定。
3. **派生视图可多份**：每包 baked table、工具目录、人类文档可以多份，只读且可追溯到同一作者来源。
4. **运行时权威不能多份**：不得借 interface registry 再存 policy、enabled、凭证或可恢复业务 payload。
5. **明确验证的含义**：登记一致、schema 一致、handler 接线、客户端互操作、端到端行为分别给证据，不再用一个 PASS 覆盖所有层。
6. **不增加未经授权门禁**：先利用现有检查和构建入口形成准确反馈；是否改变硬门行为留给[业主]，不从本评估自动推出。

### 8.6 建议的偿债顺序

**第一组：公共平台合同与生产接线。** [DNLS] host MCP/terminal-driver/instance registry、[DNT]声明与 v2 消费、[DNK]旧所有权残留，以及 exact/prefix 的公共注册模型。优先理由是已有真实跨包生产者—消费者关系，并存在“声明了但没接上”的机制，不是代码行数较多。

**第二组：自有 JSON facade 成对收口。** [DNEE]/[DNN]/[DNMS]/[DNCS]按调用链迁移 producer 与 consumer；同时明确 operation/schema 与错误语义。不能只加新 helper，旧 fetch 和旧分发永久并存。

**第三组：native/浏览器公共面与派生治理。** 收窄[DNN]窗口公开能力，保存 native Provider/投影边界，消除手工包清单和重复文档漂移。

每组都应采用“确认目标合同 → 验证生产者/消费者 → 成对硬切 → 退役旧作者源”的方式。可以分批交付，不要求全仓同时重写；不增加兼容 façade、双写或发布冻结期。时序依据见 `docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md:163-165`。

---

## 9. 后续 QNA 的输入，不在此预冻结答案

| 议题 | 由哪些债务驱动 | 需要[业主]锁定的边界 | 已有决定的处理 |
|---|---|---|---|
| 公共合同的作者来源和 package 边界 | CROSS-02/04、DNMS-03、DNT-01 | 公共内核、领域合同、生成物分别归谁；是否迁移现有来源 | 复用已冻方向，不另立同义真相文件 |
| 自有 JSON 错误语义及标准协议例外 | DNEE-01、DNMS-01/02、DNN-02/05、DNCS-01 | 稳定机器判别、消息/详情、上游语义、取消/空结果如何表达 | 不直接采用 1112 示例枚举覆盖后续领域合同 |
| MCP 公开提供面的角色与实际能力 | DNLS-01/02/06、DNT-02 | host MCP、容器 bridge、terminal driver 哪些对外、如何声明/验证实际能力 | 先对账冻结的四 L2 面，不把现有实现反推成新法律 |
| 创建、幂等、重连、流版本的适用域 | DNT-03/04、DNLS-05/06 | 共用 term 名时哪些语义必须相同，哪些由能力区分 | 继承 DNLS01 的禁止新专有 lane、已定 retry/幂等，冲突 append-only 修订 |
| native/窗口公共面与状态权威 | DNMSC-03、DNN-04、DNCS-03 | 哪些是业务 API、诊断/测试、投影、Provider；取消和恢复由谁负责 | 不把 approved bundle 开关换成第二 writer |
| 版本、构建与退役 | DNK-03/04、DNMSC-01/02、DNT-01 | 成对交付、上游版本责任、派生物再生成、旧资产删除边界 | 保留先验收后硬切；不恢复兼容第四阶段 |
| 检查证据与治理入口 | CROSS-01/02、DNCS-04 | 如何区分登记绿、schema 绿、接线绿；哪些既有入口需修正 | 不擅自新增 release-gate 或延长 QNA 轮次 |

这些是议题，不是正式 Q 编号，不含预填 Truth-ID。QNA 只需锁定会改变公共合同或权威归属的关键选择，不应把每个 helper、每条文案和每个测试细节都变成新仪式。

---

## 10. 最终评估

1112 的主要担忧是隐性 API 会锁死未来。1115 已看到三个可追溯的阶段：

1. **旧账部分偿还**：退役包退出活跃面，两个路由台账检查恢复一致，局部领域 schema/事件/错误已形成。
2. **旧账继续累积**：普通 JSON 的输入输出和客户端消费依旧分散，窗口公共面、跨插件软依赖及手写 inventory 未收口。
3. **新账改变性质**：平台与消费者分离、native overlay、carrier 投影、MCP/WS/SSE，使“合同本身”成为独立交付与演进对象；已有声明/实现/构建分叉。

因此：

> **统一到 package 已经紧迫，但应统一的是可执行合同和公共机制；facade 收口应覆盖生产者与消费者，同时保留标准协议、领域语义和 host 权威。**
>
> **最需要避免的不是多写了几个 fetch，而是让每一个新消费者继续复制一套“它理解的公共协议”。**

本报告落地后，下一步是 QNA 锁定公共合同、来源与切换边界；不是把本文建议直接当作已授权实施计划。

---

## 附录 A：85 项 host 路由登记清单与已确认盲点

以下按本轮 `scanRoutes()` 输出登记。`证据` 指源码声明位置；[DNLS]的实际 method 集合来自 baked table/扫描规则，不能仅凭常量行认为 handler 已遵守所有语义。每行可承载多个 operation。域前缀不省略，便于独立核对。

| 包 | 路径 | 方法 | 事实定位 |
|---|---|---|---|
| [DNN] | `/nano-notepad/read` | POST | `dsh-nano-notepad/index.js:68` |
| [DNN] | `/nano-notepad/save` | POST | `dsh-nano-notepad/index.js:67` |
| [DNN] | `/nano-notepad/fetch-mp` | POST | `dsh-nano-notepad/index.js:69` |
| [DNN] | `/nano-notepad/s3/status` | POST | `dsh-nano-notepad/index.js:70` |
| [DNN] | `/nano-notepad/s3/test` | POST | `dsh-nano-notepad/index.js:71` |
| [DNN] | `/nano-notepad/s3/object` | POST | `dsh-nano-notepad/index.js:72` |
| [DNN] | `/nano-notepad/s3/config` | POST | `dsh-nano-notepad/index.js:73` |
| [DNN] | `/nano-notepad/fx-core.wasm` | GET, HEAD | `dsh-nano-notepad/index.js:75` |
| [DNN] | `/nano-notepad/fx/models` | GET | `dsh-nano-notepad/index.js:77` |
| [DNN] | `/nano-notepad/fx/chat/completions` | POST | `dsh-nano-notepad/index.js:78` |
| [DNN] | `/nano-notepad/pipeline/s3` | POST | `dsh-nano-notepad/index.js:79` |
| [DNN] | `/nano-notepad/pipeline/claim` | POST | `dsh-nano-notepad/index.js:80` |
| [DNN] | `/nano-notepad/rpc` | POST | `dsh-nano-notepad/index.js:82` |
| [DNEE] | `/nano-explorer-extra/status` | GET | `dsh-nano-explorer-extra/src/host/routes.js:338` |
| [DNEE] | `/nano-explorer-extra/commit` | POST | `dsh-nano-explorer-extra/src/host/routes.js:369` |
| [DNEE] | `/nano-explorer-extra/pull` | POST | `dsh-nano-explorer-extra/src/host/routes.js:381` |
| [DNEE] | `/nano-explorer-extra/fetch` | POST | `dsh-nano-explorer-extra/src/host/routes.js:393` |
| [DNEE] | `/nano-explorer-extra/push` | POST | `dsh-nano-explorer-extra/src/host/routes.js:407` |
| [DNEE] | `/nano-explorer-extra/remote` | POST | `dsh-nano-explorer-extra/src/host/routes.js:422` |
| [DNEE] | `/nano-explorer-extra/author` | POST | `dsh-nano-explorer-extra/src/host/routes.js:435` |
| [DNEE] | `/nano-explorer-extra/ssh-key` | POST | `dsh-nano-explorer-extra/src/host/routes.js:448` |
| [DNEE] | `/nano-explorer-extra/checkout` | POST | `dsh-nano-explorer-extra/src/host/routes.js:462` |
| [DNEE] | `/nano-explorer-extra/create-file` | POST | `dsh-nano-explorer-extra/src/host/routes.js:474` |
| [DNEE] | `/nano-explorer-extra/create-folder` | POST | `dsh-nano-explorer-extra/src/host/routes.js:487` |
| [DNEE] | `/nano-explorer-extra/rename` | POST | `dsh-nano-explorer-extra/src/host/routes.js:501` |
| [DNEE] | `/nano-explorer-extra/move` | POST | `dsh-nano-explorer-extra/src/host/routes.js:517` |
| [DNEE] | `/nano-explorer-extra/delete` | POST | `dsh-nano-explorer-extra/src/host/routes.js:535` |
| [DNEE] | `/nano-explorer-extra/ignored` | POST | `dsh-nano-explorer-extra/src/host/routes.js:550` |
| [DNEE] | `/nano-explorer-extra/list` | POST | `dsh-nano-explorer-extra/src/host/routes.js:561` |
| [DNEE] | `/nano-explorer-extra/perf-review/host` | GET | `dsh-nano-explorer-extra/src/host/routes.js:577` |
| [DNEE] | `/nano-explorer-extra/read` | POST | `dsh-nano-explorer-extra/src/host/routes.js:589` |
| [DNMS] | `/nano-model-selector/catalog` | GET, HEAD | `dsh-nano-model-selector/index.js:34` |
| [DNMS] | `/nano-model-selector/media-engines` | GET, HEAD | `dsh-nano-model-selector/index.js:35` |
| [DNMS] | `/nano-model-selector/media-engine` | GET, HEAD, PUT | `dsh-nano-model-selector/index.js:36` |
| [DNMS] | `/nano-model-selector/async-compact` | GET, HEAD, PUT | `dsh-nano-model-selector/index.js:37` |
| [DNMS] | `/nano-model-selector/async-compact/switch` | POST | `dsh-nano-model-selector/index.js:39` |
| [DNLS] | `/nano-local-sandbox/status` | GET, HEAD | `dsh-nano-local-sandbox/src/host/routes.js:1` |
| [DNLS] | `/nano-local-sandbox/open` | POST | `dsh-nano-local-sandbox/src/host/routes.js:2` |
| [DNLS] | `/nano-local-sandbox/shot` | POST | `dsh-nano-local-sandbox/src/host/routes.js:3` |
| [DNLS] | `/nano-local-sandbox/history` | POST | `dsh-nano-local-sandbox/src/host/routes.js:4` |
| [DNLS] | `/nano-local-sandbox/pick` | POST | `dsh-nano-local-sandbox/src/host/routes.js:5` |
| [DNLS] | `/nano-local-sandbox/edit` | POST | `dsh-nano-local-sandbox/src/host/routes.js:6` |
| [DNLS] | `/nano-local-sandbox/settings` | POST | `dsh-nano-local-sandbox/src/host/routes.js:7` |
| [DNLS] | `/nano-local-sandbox/perf-review/host` | GET, HEAD, POST | `dsh-nano-local-sandbox/src/host/routes.js:8` |
| [DNLS] | `/nano-local-sandbox/perf-report` | POST | `dsh-nano-local-sandbox/src/host/routes.js:9` |
| [DNLS] | `/nano-local-sandbox/kite` | POST | `dsh-nano-local-sandbox/src/host/routes.js:10` |
| [DNLS] | `/nano-local-sandbox/console` | GET, HEAD, POST | `dsh-nano-local-sandbox/src/host/routes.js:11` |
| [DNLS] | `/nano-local-sandbox/operations` | GET, HEAD, POST | `dsh-nano-local-sandbox/src/host/routes.js:12` |
| [DNLS] | `/nano-local-sandbox/diagnostics` | GET, HEAD | `dsh-nano-local-sandbox/src/host/routes.js:13` |
| [DNLS] | `/nano-local-sandbox/mcp` | POST | `dsh-nano-local-sandbox/src/host/routes.js:14` |
| [DNLS] | `/nano-local-sandbox/ports` | GET, HEAD | `dsh-nano-local-sandbox/src/host/routes.js:15` |
| [DNLS] | `/nano-local-sandbox/recover` | POST | `dsh-nano-local-sandbox/src/host/routes.js:16` |
| [DNLS] | `/nano-local-sandbox/dom` | GET, HEAD | `dsh-nano-local-sandbox/src/host/routes.js:17` |
| [DNLS] | `/nano-local-sandbox/selftest` | GET, HEAD, POST | `dsh-nano-local-sandbox/src/host/routes.js:18` |
| [DNLS] | `/nano-local-sandbox/elements` | GET, HEAD | `dsh-nano-local-sandbox/src/host/routes.js:19` |
| [DNLS] | `/nano-local-sandbox/browse-history` | GET, HEAD, POST, DELETE | `dsh-nano-local-sandbox/src/host/routes.js:20` |
| [DNLS] | `/nano-local-sandbox/network` | GET, HEAD, POST | `dsh-nano-local-sandbox/src/host/routes.js:21` |
| [DNLS] | `/nano-local-sandbox/targets` | GET, HEAD | `dsh-nano-local-sandbox/src/host/routes.js:22` |
| [DNLS] | `/nano-local-sandbox/evaluate` | POST | `dsh-nano-local-sandbox/src/host/routes.js:23` |
| [DNLS] | `/nano-local-sandbox/wait` | POST | `dsh-nano-local-sandbox/src/host/routes.js:24` |
| [DNLS] | `/nano-local-sandbox/storage` | GET, HEAD, POST | `dsh-nano-local-sandbox/src/host/routes.js:25` |
| [DNLS] | `/nano-local-sandbox/interact` | POST | `dsh-nano-local-sandbox/src/host/routes.js:26` |
| [DNLS] | `/nano-local-sandbox/state` | POST | `dsh-nano-local-sandbox/src/host/routes.js:27` |
| [DNLS] | `/nano-local-sandbox/har` | GET, HEAD | `dsh-nano-local-sandbox/src/host/routes.js:28` |
| [DNLS] | `/nano-local-sandbox/snapshot` | GET, HEAD | `dsh-nano-local-sandbox/src/host/routes.js:29` |
| [DNLS] | `/nano-local-sandbox/refs` | GET, HEAD | `dsh-nano-local-sandbox/src/host/routes.js:30` |
| [DNLS] | `/nano-local-sandbox/control` | GET, HEAD, POST | `dsh-nano-local-sandbox/src/host/routes.js:31` |
| [DNT] | `/dsh-nano-terminal/stream` | GET | `dsh-nano-terminal/index.js:66-74` |
| [DNT] | `/dsh-nano-terminal/mcp` | POST | `dsh-nano-terminal/index.js:193-214` |
| [DNT] | `/dsh-nano-terminal/sessions` | GET | `dsh-nano-terminal/index.js:215-222` |
| [DNT] | `/dsh-nano-terminal/events` | GET | `dsh-nano-terminal/index.js:228-245` |
| [DNT] | `/dsh-nano-terminal/health` | GET | `dsh-nano-terminal/index.js:247-253` |
| [DNT] | `/dsh-nano-terminal/session`（prefix，处理 `/:id/close`） | POST | `dsh-nano-terminal/index.js:255-268` |
| [DNCS] | `/nano-cloud-session/status` | POST | `dsh-nano-cloud-session/index.js:22` |
| [DNCS] | `/nano-cloud-session/config` | POST | `dsh-nano-cloud-session/index.js:23` |
| [DNCS] | `/nano-cloud-session/sessions` | POST | `dsh-nano-cloud-session/index.js:24` |
| [DNCS] | `/nano-cloud-session/session` | POST | `dsh-nano-cloud-session/index.js:25` |
| [DNCS] | `/nano-cloud-session/create` | POST | `dsh-nano-cloud-session/index.js:26` |
| [DNCS] | `/nano-cloud-session/message` | POST | `dsh-nano-cloud-session/index.js:27` |
| [DNCS] | `/nano-cloud-session/archive` | POST | `dsh-nano-cloud-session/index.js:28` |
| [DNCS] | `/nano-cloud-session/unarchive` | POST | `dsh-nano-cloud-session/index.js:29` |
| [DNCS] | `/nano-cloud-session/terminate` | POST | `dsh-nano-cloud-session/index.js:30` |
| [DNCS] | `/nano-cloud-session/catalog` | POST | `dsh-nano-cloud-session/index.js:32` |
| [DNCS] | `/nano-cloud-session/upload` | POST | `dsh-nano-cloud-session/index.js:33` |
| [DNCS] | `/nano-cloud-session/ssh` | POST | `dsh-nano-cloud-session/index.js:31` |

**额外确认项，不混入上表 85 项**：

| 包 | 路径模式 | 注册形态 | 事实定位 |
|---|---|---|---|
| [DNN] | `/nano-notepad/fx/sdk/*` | 手动 prefix；无对应显式 method allowlist | `dsh-nano-notepad/index.js:345-357`、`dsh-nano-notepad/index.js:389-407` |

[DNK] 和[DNMSC]没有遗漏在上表：它们在该 HEAD 的 host 路由登记数确为 0，协议债务已在 §4 单独登记。

---

## 附录 B：复核方法与本轮验证边界

### B.1 路由规模与历史台账

在仓根执行以下只读命令，不运行 build、不重新生成台账：

```bash
git rev-parse HEAD
git show -s --format='%h %ai %s' 348f544
node --input-type=module <<'JS'
import { scanRoutes } from './scripts/route-scan.mjs'
import { execFileSync } from 'node:child_process'
const rows = scanRoutes()
const plugins = [...new Set(rows.map(row => row.plugin))]
for (const plugin of plugins) {
  const own = rows.filter(row => row.plugin === plugin)
  console.log(plugin, own.length, own.reduce((n, row) => n + row.methods.length, 0))
}
console.log('registered', rows.length, rows.reduce((n, row) => n + row.methods.length, 0))
for (const file of ['security/route-sensitivity.json', 'security/feature-contract.json']) {
  const historical = JSON.parse(execFileSync('git', ['show', `348f544:${file}`], { encoding: 'utf8' }))
  const byPlugin = {}
  for (const row of historical.routes) byPlugin[row.plugin] = (byPlugin[row.plugin] ?? 0) + 1
  console.log(file, historical.routes.length, byPlugin)
}
JS
node scripts/check-route-sensitivity.mjs
node scripts/check-feature-contract.mjs
```

`scanRoutes()` 统计不包含未登记 SDK prefix，且不能证明真实安装环境运行成功；需要结合附录 A 和生产入口阅读。

### B.2 MCP 声明集合

统计来源限定为：

1. [DNT] OpenRPC 的 `methods`、`x-errorKinds`、`x-events` 数组。
2. [DNLS] host 的 `SANDBOX_TOOL_NAMES`。
3. [DNLS] profile bridge 的 `KITESURF_TOOLS` 自有 `name` 字段。
4. [DNLS] terminal-driver 的 `TERM_TOOL_NAMES` 单列，不并入公开工具数。

本轮用读取文件、提取这些明确数组并作集合交并差的方式计算，未启动 bridge，也没有把 `tools/list` 的外部 child 动态结果写成已知数量。§6.2 已完整列出足以复核 19/20/15/13/7/2/22 的名字集合。

### B.3 两个精确副本对比

- 公共 guard 源码与[DNT] lib guard 对比：只有 `kind: ROUTE_KIND` 与 `kind: spec.kind ?? ROUTE_KIND` 这一处差异，证据位置见 DNT-01。
- [DNMS]/[DNMSC] 两份 compact-policy 文件本轮 SHA-256 都为：

```text
1cc09be91551ec48a8496457c3a6b4c959853190c440bb38406d235a481f2d0c
```

因此 DNMS-03 登记的是**作者来源重复带来的未来维护债务**，不是当前内容已不一致；只读构建副本本身也不等于业务状态双真源。

### B.4 没有做的验证

- 没有重跑历史运行环境，没有用 1112 台账数冒充历史真实可达端点数。
- 没有运行全仓 test/build、Rust 编译、打包、安装、重启或修改 profile。
- 没有在线调用终端、沙箱或 carrier，不触碰真实 session/容器/凭证/审计文件。
- 没有验证每一个 MCP 工具和 native Provider 的端到端行为。
- 没有声称已完成完整 MCP 标准合规、安全漏洞定级、性能基准或生产事故归因。
- 交付仅为本评估文件；后续公共合同变更等待 QNA/[业主]决定。
