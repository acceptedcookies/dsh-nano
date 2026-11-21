# DNLS03 行动计划 · 受管 sandbox 控制面（合约 / 接口 / 消费层）

> 服务业务簇: `dsh-nano-local-sandbox` / `[DNLS]`
> 计划对象: `DNLS03` 受管 sandbox 的对象身份、控制台账、终端连续性、对象合同与消费层硬切
> 类型: `upgrade`
> 作者: `DNLS03 架构 agent（lead）`
> 时间: `2026-11-19`
> 文件位置: `docs/specs/dsh-nano-local-sandbox/plan/DNLS03-managed-sandbox-control.md`
> 上游前序 / closure:
> - [`qna/DNLS03-qna-truth.md`](../qna/DNLS03-qna-truth.md) `FROZEN`（`T-O-33`–`T-O-54`，22 条；`NOT IMPLEMENTATION GRANT`）
> - [`qna/DNLS03-qna.md`](../qna/DNLS03-qna.md) 是 decision provenance；本计划与台账冲突时回到问答，不改已冻结行
> - 上游继续有效、本计划不回改正文：[`DNLS01-qna.md`](../qna/DNLS01-qna.md) 的 `T-O-8` / `T-O-17` / `T-O-18`；[`DNLS02-qna.md`](../qna/DNLS02-qna.md) 的 `T-O-19` / `T-O-20` / `T-O-23` / `T-O-25` / `T-O-27` / `T-O-29` / `T-O-31`
> 下游交接:
> - 《DNLS03 action-todo》按本计划 1:1 派生；`ImplementationGrant` 另立，不由本文件承担
> - Case 2（[DNMS] `/imagine`）与 Case 4（[DNN] fx、KV/D1）留在后继计划，本期出口不含它们
> - 文末「DNLS03 补充计划」按 `T-O-55` append 在本文件，不另立计划文件。补充阶段 S1–S6 只以该节为准，不改写上文 P0–P8 的已有记录
> 关联设计 / 调研文档:
> - [`dsh-nano-local-sandbox-v1.3.md`](../dsh-nano-local-sandbox-v1.3.md)（形成史与证据索引；**已被 `T-O-33`–`T-O-54` supersede**；冲突以真相层为准）
> 冻结决策来源:
> - [`qna/DNLS03-qna-truth.md`](../qna/DNLS03-qna-truth.md) §1–§2（只读 CITE；本计划不开 Q/A）
> grounding 来源:
> - 本计划 §7。测量提交 `1e41d91`（`bd4b056` 的后代；DNLS03 对象面仍为零实现）。行号漂移以「路径 + 符号名」为准
> 关联 reference-anchor:
> - 无独立 eval-reference-anchor。§7 是本计划的 grounding 真源
> 对抗审查（已回写，未改 QNA）:
> - [`.anote/reviews/dsh-nano-local-sandbox/DNLS03/na/4721/qna-compliance.md`](../../../../.anote/reviews/dsh-nano-local-sandbox/DNLS03/na/4721/qna-compliance.md)
> - [`.anote/reviews/dsh-nano-local-sandbox/DNLS03/na/4721/exit-and-antigreen.md`](../../../../.anote/reviews/dsh-nano-local-sandbox/DNLS03/na/4721/exit-and-antigreen.md)
> 文档状态: `reviewed`

---

## 0. 执行背景与目标

[业主] 已冻结 `DNLS03`：交付的是 [DNLS] v1.3 的合约、接口和消费层，不是一块新面板（`T-O-33`）。生命周期从 session 记录上移到可独立寻址的受管 sandbox（`T-O-36`）；控制权只来自自建或明确授权接管（`T-O-37`）；每受管 env 一份 `stateRoot/registry.json`（`T-O-40`）；已有对象的读和写只认调用者明确给出的一个 `sandboxId`（`T-O-38` / `T-O-41`）；长期终端保住的是原执行，不是旧屏（`T-O-39` / `T-O-42` / `T-O-45`）；对象面硬切 `dnls.control/1`（`T-O-50`）。QNA 与真相层都写明 `NOT IMPLEMENTATION GRANT`。本文件只排执行顺序、落点和可证伪测试，不签发实现、发布、远端或版本 tag。

当前 HEAD `1e41d91` 仍是测量层，不是目标态。终端按 `sessionId` 复用并在 create 时发 `dnt-ws-v1` URL（`term-bridge.js:23-44`、`:124-125`）；实例是内存 `Map`，空闲 sweep 停机后删行（`instance-registry.js:18`、`:91-98`）；bridge 地址由 engine 端口加一推导（`routes.js:1114-1127`）；包没有 `./client`（`package.json:12-17`）。这些是要被替换的缺口（真相层 `B-5`–`B-9`），不是可以「保持绿灯」的合同。

- **服务业务簇**：`[DNLS]`（包 `dsh-nano-local-sandbox`）；消费侧同切只触及 [DNK] / [DNT] 上被 `T-O-38` / `T-O-41` / `T-O-45` / `T-O-54` 点名的公开面
- **计划对象**：`DNLS03-managed-sandbox-control`
- **本次计划解决的问题**：
  - 物理身份仍绑在 session 记录和内存 `Map` 上，宿主重启即丢；两个 session 可以指向同一容器，但没有稳定 `sandboxId`
  - 终端 create 即发 attach URL，wire 仍是 `dnt-ws-v1`，断线与「保住原执行」没有环境内 broker
  - 对象面没有 `dnls.control/1`、没有 fleet 窄行、没有按 sandbox 计额；空闲回收会删行；管理页与无凭证资源交接都不存在
- **本次计划的直接产出**：
  - 每受管 env 一份可原子替换的 `registry.json`，以及与之配套的单目标分派、生命周期操作文档、服务预留和分钟用量库
  - 终端 create / attach 分离、环境内 PTY broker、沙箱 wire 硬切 `dnt-ws-v2` + `align:1`（[DNT] local 与第三方端点不改）
  - 同包 web 管理的正式 client 出口；宿主没有无 session 页签入口时，记为宿主交付依赖，不伪造 session
- **本计划不重新讨论的设计结论**：
  - 阶段范围与 Case 2/4 暂缓（`T-O-33` / `T-O-34`）
  - J1/J2 归属；不批准远端 provider，不接管 [DNCS] carrier（`T-O-35`）
  - 选择、locator、资源引用、合同版本都不授予权限（`T-O-38` / `T-O-44` / `T-O-50` / `T-O-52` / `AF-7`）
  - `stop` 留 ID/卷/端口/名额；`remove` 默认保卷；没有删卷接口（`T-O-43` / `AF-3`）
  - 不新设 release-gate，不扩全仓生成器（`T-O-50`；真相层 P6）

---

## 1. 执行综述

### 1.1 总体执行方式

九段，顺序锁死为：**先锁测量、再落身份与台账、再落合同与单目标分派、再落生命周期写与授权、再拆终端 create/attach、再硬切沙箱 wire、再做服务/修订/用量、再做读模型与计额、最后才做管理页和资源交接**。这是真相层「驱动后续」的方向，不是另起一套架构。

公开面硬切是原子的：提供者、公告、真实 handler 和被点名的 [DNK]/[DNT] 消费点同一批改完。禁止旧 façade、禁止 `dnt-ws-v1` 降级、禁止「sessionId 仍能当 sandboxId 用」的兼容分支。台账和 broker 可以先于公开路由以夹具单测落地，但**对宿主可见的路由在同一切割提交里切换**，中间不留双轨。

### 1.2 Phase 总览

| Phase | 名称 | 规模 | 目标摘要 | 依赖前序 |
|------|------|------|----------|----------|
| Phase 0 | 测量锁与 worktree | S | 在 `.agents/worktrees` 开工；复核 `B-5`–`B-9` 仍为零实现，漂移则停 | - |
| Phase 1 | 对象身份与控制台账 | L | `sandboxId` 跨重启；每 env 一份 `registry.json`；单写者 | Phase 0 |
| Phase 2 | 合同版本与单目标分派 | L | `dnls.control/1`；HTTP/MCP 只认一个 `sandboxId` | Phase 1 |
| Phase 3 | 生命周期写与对象授权 | XL | 一笔意图一次派发；准入 ≠ 授权；断线 ≠ 取消 | Phase 2 |
| Phase 4 | 终端创建 / 附着与 broker | XL | create 不发地址；环境内 broker 保住原执行 | Phase 3 |
| Phase 5 | 沙箱 wire 硬切与附着核身 | L | `dnt-ws-v2` + `align:1`；两次 admission；不杀 PTY | Phase 4 |
| Phase 6 | 服务、修订与用量 | XL | 废止端口加一；候选不自动应用；30 天分钟槽 | Phase 3 |
| Phase 7 | 读模型与计额 | L | fleet 窄行；按 sandbox 计额；可证空闲只 stop | Phase 1, Phase 6 |
| Phase 8 | 管理页、资源交接与同切收口 | L | 同包页签或明示宿主依赖；`dsh-resource://`；文档同步 | Phase 5, Phase 7 |

> 规模只帮助阅读，不是开工闸。Phase 6 可在 Phase 4–5 之后与之并行，但 Phase 7 的服务列和用量覆盖依赖 Phase 6。Phase 8 不得早于终端交接合同（Phase 5）和读模型（Phase 7）。

### 1.3 Phase 说明

1. **Phase 0 — 测量锁与 worktree**
   - **核心目标**：执行树离开 `main` 脏写；开工前确认测量锚仍指向「零实现」。
   - **为什么先做**：真相层写明测量是当时的 HEAD 事实。锚已漂移却按旧行号改，会改错文件。
2. **Phase 1 — 对象身份与控制台账**
   - **核心目标**：受管身份、归属、期望只活在 `registry.json`；session 记录降为使用关系。
   - **为什么先做**：后面的分派、操作文档、计额、终端归属都要先有稳定 `sandboxId`（`T-O-36` 驱动 `T-O-40`）。
3. **Phase 2 — 合同版本与单目标分派**
   - **核心目标**：新对象路由在派发前完成合同配对，并且只接受一个明确目标。
   - **为什么放在这里**：没有这层，Phase 3 的写会沿用「按 session 找容器」。
4. **Phase 3 — 生命周期写与对象授权**
   - **核心目标**：同一 sandbox 的写串行、可查询、断线不重发；主体来自 `connection.admit`。
   - **为什么放在这里**：终端 create、换代、自动 stop 都是这笔操作文档的调用方。
5. **Phase 4 — 终端创建 / 附着与 broker**
   - **核心目标**：create 与 attach 分离；原执行放在环境内 broker，而不是宿主进程内的一次性 PTY。
   - **为什么放在这里**：`T-O-39` 的真伪判据是重启宿主后新输入仍能推进原任务。broker 不在，wire 硬切没有对象可附着。
6. **Phase 5 — 沙箱 wire 硬切与附着核身**
   - **核心目标**：只改 [DNLS] 沙箱终端 wire；locator 无 bearer；撤权 detach 且不杀 PTY。
   - **为什么放在这里**：`T-O-45` 明确不重开 `T-O-42`。工具面先定，wire 后切。
7. **Phase 6 — 服务、修订与用量**
   - **核心目标**：服务按 `(sandboxId,serviceId)` 发布；保存候选不应用；用量是一份有界分钟库。
   - **为什么放在这里**：读模型要投影这三样。端口加一不先废，fleet 的服务列会继续报错地址。
8. **Phase 7 — 读模型与计额**
   - **核心目标**：授权后的窄投影；`maxInstances` 计 sandbox 而不是内存行，空闲只 stop。
   - **为什么放在这里**：计额写者就是 Phase 1 的那一个台账写者。读模型不反向成为控制真源。
9. **Phase 8 — 管理页、资源交接与同切收口**
   - **核心目标**：同包交付管理出口；资源地址只标识已有终端；被点名的消费者同切；文档与包说明不再写「无浏览器入口 = 没有管理页」。
   - **为什么放在这里**：页签和资源导航消费的是已经冻结的公开面。缺宿主槽位时停止在「宿主依赖」，不补假 session。

### 1.4 执行策略说明

- **执行顺序原则**：身份与台账先于任何新路由；合同配对先于对象派发；操作文档先于终端、换代和自动 stop；create/attach 先于 wire；读模型最后投影，不提前当恢复源。
- **风险控制原则**：容器 CLI 仍只在 `backend-apple.js`。新路由不新设第四道门禁，只把新增行投影进既有 route 账本与既有 bake。威胁面（无选择执行、凭 URL 附着、空台账认领、断线当取消、端口加一、版本当权限）按 §7.3 与 §8.5 验收。
- **测试推进原则**：短途每改一组就跑，且必须改掉编码旧语义的断言，见 §8.5。spike 在 Phase 4 收口时证明「重启宿主后原进程仍接受新输入」。mega 在 Phase 8 跑公开面同切。soak 只打写者并发与空闲停机竞态。
- **文档同步原则**：`dsh-nano-local-sandbox/AGENTS.md` 里「浏览器入口：无」「终端 attach 只认返回的 attach.url」「ensure 按 session 复用」这三句在 Phase 8 与代码同一批改。不改 QNA，不改真相层规则句，不 bump 版本、不打 tag。
- **回滚 / 降级原则**：没有运行时 v1 降级，也没有 sessionId 兜底。Phase 5 开工前留快照 commit。切割失败回到该 commit，不把 `dnt-ws-v1` 加回来。

### 1.5 本次 action-plan 影响结构图

```text
DNLS03-managed-sandbox-control
├── Phase 0
│   └── .agents/worktrees/dnls03-managed-sandbox-control
├── Phase 1  身份 / 台账
│   ├── src/host/control-registry.js          🆕 原子写 registry.json
│   └── src/host/instance-registry.js:18-98   ♻️ session 记录不再是物理身份
├── Phase 2  合同 / 分派
│   ├── src/host/error-catalog.js:15,88-110   ♻️ 废进程级 activeNamespace 漂移
│   ├── src/host/routes.js                    ♻️ 对象路由只读 query sandboxId
│   ├── src/host/mcp-sandbox.js:189-250       ♻️ tools/call 只读 arguments.sandboxId
│   └── lib/bindings.js:34 + src/perf/declaration.json:40
│       ✅ 保留绑定 id dnls.control；不把它当成合同版本
├── Phase 3  写 / 授权
│   ├── src/host/routes.js:1469-1471          ♻️ 断连不再写成 cancelled
│   └── connection.admit（宿主，只调用不改 pin）
├── Phase 4–5  终端
│   ├── src/host/term-bridge.js:23-44,124-125 ♻️ create/list 不再发 URL
│   ├── src/host/term-ws.js                   ♻️ 沙箱 open 只认 v:2,align:1
│   ├── profiles/terminal/pty-entry.mjs       ♻️ 不再是 2 行 stub
│   └── dsh-nano-terminal 的沙箱 McpLane 消费点（local lane 不改）
├── Phase 6
│   ├── src/host/routes.js:1114-1127          ♻️ 删除 port+1
│   ├── src/host/profile-drivers.js:138-149   ♻️ 预留改走共享池
│   └── src/host/usage-minutes.js             🆕
├── Phase 7
│   ├── GET /nano-local-sandbox/fleet|sandboxes|inspect|processes
│   └── instance-registry.js:91-98            ♻️ sweep 不得删行
└── Phase 8
    ├── package.json:12-30                    ♻️ 增加正式 client 出口
    ├── src/client/                           🆕 宿主槽位上的「沙箱」页，不是第二套设计面
    └── dsh-resource://sandbox-terminal/...   🆕 无凭证交接
```

---

## 2. In-Scope / Out-of-Scope

### 2.1 In-Scope（本次 action-plan 明确要做）

- **[S1]** 把受管 sandbox 做成跨 [dsh] 重启仍在的对象，并给每个受管 env 一份 `registry.json`（`T-O-36` / `T-O-37` / `T-O-40`）。
- **[S2]** 对象 HTTP/MCP 硬切到单一 `sandboxId` 与 `dnls.control/1`，错误闭集只增加真相层点名的七项（`T-O-38` / `T-O-41` / `T-O-50`）。
- **[S3]** 生命周期写、对象授权、终端 create/attach、沙箱 wire、服务发布、修订、用量、fleet、计额，按 `T-O-43`–`T-O-49` 与 `T-O-52`–`T-O-53` 落地。
- **[S4]** 同包管理出口与 `dsh-resource://sandbox-terminal/...` 交接；[DNK]/[DNT] 只改被点名的公开消费点（`T-O-51` / `T-O-54`）。
- **[S5]** 改写当前把旧语义断言成绿灯的测试（§8.5），而不是在旁边再加一组新测试让旧断言继续 PASS。

### 2.2 Out-of-Scope（本次 action-plan 明确不做）

- **[O1]** Case 2 与 Case 4 的原语、页面和迁库（`T-O-34`）。暂缓不是永久否决，也不删 [DNMS]/[DNN] 已有能力。
- **[O2]** [DNCS] carrier、远端 provider、跨主机资源地址（`T-O-35` / `T-O-54`）。
- **[O3]** 新 bearer、operator 密钥、认证插件、删卷接口、`scope: sandbox`、新 lane、新 release-gate、版本 bump / tag（真相层 P6）。
- **[O4]** [DNT] local lane、第三方 MCP 端点、官方 pin 的改写（`T-O-45` / `T-O-31` / `T-O-47`）。
- **[O5]** 把「无 agent session 的正式页签」在宿主未提供槽位时造出来。缺槽位只登记宿主依赖（`T-O-51` / `T-O-54`）。

### 2.3 边界判定表

| 项目 | 判定 | 理由 | 重评条件 |
|------|------|------|----------|
| `registry.json` 与 `sandboxId` | `in-scope` | `T-O-36` / `T-O-40` | 无。未冻结的介质细节不得另造第二真源 |
| 对象路由与 `dnls.control/1` | `in-scope` | `T-O-41` / `T-O-50` | 无 |
| 沙箱终端 wire `dnt-ws-v2` | `in-scope` | `T-O-45` 只修订 `T-O-17` 的本沙箱 wire | 不得扩到 [DNT] local |
| 同包「沙箱」页 | `in-scope`，槽位缺失则降为宿主依赖 | `T-O-51` | 宿主交付无 session 页签入口之后，才把「能打开页」从依赖改成出口 |
| Case 2 / Case 4 | `out-of-scope` | `T-O-34` | 后继 QNA 解冻，不在本计划里提前做 |
| 包版本改为 `1.3` | `out-of-scope` | `dnls.control/1` 不是包版本（`AF-6`）；P6 不授权 bump | 另立的 ImplementationGrant 明确要求时 |
| 自动 stop 的具体时长数字 | `defer / 沿用 profile 声明` | 真相层 P6：具体配置值未冻结 | 只读 `profile.yaml` 已有 `idleTimeoutMs`，不新写魔法数 |
| 重连次数 / TTL / 凭证形状 | `defer / 不得反推成合同` | `T-O-39` 下游：未审批这些；`T-O-45` 只冻结「至多一次自动重连」 | 新形状必须回 QNA |

### 2.4 `T-O` CITE 总表（不复制正文）

| Truth-ID | 本计划中的兑现 | 工作项 |
|----------|----------------|--------|
| `T-O-33` | 计划同时写控制方与消费方，不只写页面 | 全文；P8 |
| `T-O-34` | Case 1/3 在内，Case 2/4 不在出口 | §2.2 [O1] |
| `T-O-35` | 不因本计划改归属，不接 [DNCS] | §2.2 [O2] |
| `T-O-36` | sandbox 是物理身份，session 是使用关系 | P1-01 / P1-02 |
| `T-O-37` | 自建或授权接管；发现只读 | P1-02 / P1-04 |
| `T-O-38` | 无选择不执行；唯一候选也不自动选 | P2-04 |
| `T-O-39` | broker 保原执行；重启宿主后新输入可推进 | P4-02 |
| `T-O-40` | `registry.json`；单写者；损坏不以空表认领 | P1-01 / P1-03 / P1-04 |
| `T-O-41` | query / arguments 各只取一个 `sandboxId` | P2-04 |
| `T-O-42` | create 不发地址；attach 失联不 spawn | P4-01 / P4-03 |
| `T-O-43` | 操作文档；派发前才可取消；断线不重发 | P3-01 / P3-02 |
| `T-O-44` | admit 之后还要对象授权；审计不落 URL | P3-03 |
| `T-O-45` | 沙箱 wire 硬切；无 v1 降级 | P5-01 |
| `T-O-46` | 服务整组预留；废止 `enginePort+1` | P6-01 |
| `T-O-47` | 候选与 applied 分开；保存不启停 | P6-02 |
| `T-O-48` | 一份分钟库；不插值、不拼接计数器 | P6-03 |
| `T-O-49` | fleet 窄行；进程按需；bridge 只见绑定对象 | P7-01 |
| `T-O-50` | `dnls.control/1` 与七项错误 | P2-01 / P2-02 / P2-03 |
| `T-O-51` | 同包管理页或宿主依赖 | P8-01 |
| `T-O-52` | locator 无 bearer；两次核权；撤权不杀 PTY | P5-02 |
| `T-O-53` | 按 sandbox 计额；可证空闲只 stop | P7-02 |
| `T-O-54` | 无凭证资源地址；恢复不 create | P8-02 |

---

## 3. 业务工作总表

| 编号 | 所属 Phase | 工作项 | 类型 | 涉及文件（file:line） | 收口目标 | 测试映射（Test-ID） | 风险 |
|------|------------|--------|------|------------------------|----------|----------------------|------|
| P0-01 | Phase 0 | 语义 worktree | add | `.agents/worktrees/dnls03-managed-sandbox-control` | 后续改动不落在当前 `main` 工作区 | `DNLS03-T00` | low |
| P0-02 | Phase 0 | 复核测量锚 | update | §7.1 锚表 | 任一锚不符则停，回 QNA，不改目标态 | `DNLS03-T00` | medium |
| P1-01 | Phase 1 | 控制台账 | add | `src/host/control-registry.js`（新）；`profile-drivers.js:152` `stateRootFor` | 每 env 一份 `registry.json`，同目录临时文件后原子替换 | `DNLS03-T01` | high |
| P1-02 | Phase 1 | 身份上移 | refactor | `instance-registry.js:18,28-43` | `sandboxId` 分配一次；session 只是使用绑定 | `DNLS03-T02` | high |
| P1-03 | Phase 1 | 单写者 | add | `control-registry.js` | 第二宿主写者被拒，无最后写入者胜出 | `DNLS03-T03` | high |
| P1-04 | Phase 1 | 重启对账 | add | `control-registry.js` | 损坏、缺失有存量、版本不识别时不空表认领 | `DNLS03-T04` | high |
| P2-01 | Phase 2 | 合同发现 | add | `routes.js` `registerRoutes`；`mcp-sandbox.js:189-229` | `GET /contract` 与 `sandbox.contract` 同源返回版本与能力，不授权 | `DNLS03-T10` | medium |
| P2-02 | Phase 2 | 派发前配对 | add | `routes.js` 对象路由入口；`mcp-sandbox.js` tools/call 前 | 缺头或版本不符在访问对象前拒绝 | `DNLS03-T11` | high |
| P2-03 | Phase 2 | 七项错误 | update | `error-catalog.js:15,88-110` | 七个 `sandbox.*` 不随 active profile 改前缀 | `DNLS03-T12` | medium |
| P2-04 | Phase 2 | 单目标 | update | `routes.js` 对象 handler；`mcp-sandbox.js:229` | 缺失、空、重复、冲突、sessionId 兜底都不执行 | `DNLS03-T13` | high |
| P2-05 | Phase 2 | 绑定投影 | update | `lib/bindings.js:12-34`；`src/perf/declaration.json:11-41` | 新路由进既有 bake；`dnls.control` 绑定 id 保持为 `/control` | `DNLS03-T14` | medium |
| P3-01 | Phase 3 | 操作文档 | add | `control-registry.js`；`routes.js` lifecycle | `(主体,requestId)` 去重；未结束 202；派发后取消返回现态 | `DNLS03-T20` | high |
| P3-02 | Phase 3 | 断线 ≠ 取消 | update | `routes.js:1469-1471,2268-2270` | 客户端断连不再把操作标成 `cancelled` | `DNLS03-T21` | high |
| P3-03 | Phase 3 | 主体与对象授权 | add | 新 `src/host/object-authz.js`，挂在对象路由之前；只调用 `connection.admit`（pin `rpc.ts:240`，不改 pin） | 404/403 分开；审计无 attach URL 与输入 | `DNLS03-T22` | high |
| P4-01 | Phase 4 | create/attach 分离 | refactor | `term-bridge.js:23-44,124-125`；`terminal-driver.js:4-39` | create 与 list 的返回值没有 URL | `DNLS03-T30` | high |
| P4-02 | Phase 4 | 环境内 broker | add | `profiles/terminal/pty-entry.mjs`；`backend-apple.js:289` 不再是「只有容器名和 /bin/sh」这一条路径的全部 | 只重启宿主后，新输入进入同一原执行 | `DNLS03-T31` | high |
| P4-03 | Phase 4 | 创建键 | add | `term-bridge.js` | 同参返原引用；已结束不复活；attach 失联不 spawn | `DNLS03-T32` | high |
| P5-01 | Phase 5 | wire 硬切 | update | `term-ws.js`；`term-bridge.js:50` 附近 ready | open 必须 `v:2,align:1,session:<terminalId>`；沿用既有帧集与逐连接流控；无 v1 降级 | `DNLS03-T40` | high |
| P5-02 | Phase 5 | 两次核权 | add | upgrade 路径；`src/host/object-authz.js`（新）；删除 `term-bridge.js:44` 的 token query | locator 无 bearer；直连 broker 不是授权；撤权 detach 且 PTY 仍在 | `DNLS03-T41` | high |
| P5-03 | Phase 5 | [DNT] 沙箱消费同切 | update | `dsh-nano-terminal` 里只接 sandbox attach 的 McpLane 调用点 | local lane 协议字节不变 | `DNLS03-T42` | high |
| P6-01 | Phase 6 | 服务预留 | refactor | `routes.js:1114-1127`；`profile-drivers.js:138-149`；`profile.yaml:25-56` | 地址只来自同一对象的 inspect；邻号被占不影响 | `DNLS03-T50` | high |
| P6-02 | Phase 6 | 修订 | add | `control-registry.js` | 保存候选不启停；`appliedRevision` 只是回执 | `DNLS03-T51` | high |
| P6-03 | Phase 6 | 分钟库 | add | `src/host/usage-minutes.js`（新）；`backend-apple.js:190-197` | 24h/7d/30d 查同一份槽；断段不插值 | `DNLS03-T52` | medium |
| P7-01 | Phase 7 | fleet 投影 | add | `routes.js` 新只读路由；`observe.js:34` 不得升格为恢复真源 | 窄行不含正文/路径/凭证；进程默认 50、上限 200 | `DNLS03-T60` | high |
| P7-02 | Phase 7 | 计额与只停 | refactor | `instance-registry.js:42,91-98`；`control-registry.js` | 创建/接管先原子占位；两 session 只占一格；stop 后台账行还在 | `DNLS03-T61` | high |
| P8-01 | Phase 8 | 管理出口 | add | `package.json:12-30`；`src/client/`（新，仅在有宿主槽位时） | 无槽位则显式宿主依赖，不覆盖宿主命令 | `DNLS03-T70` | medium |
| P8-02 | Phase 8 | 资源交接 | add | 新 `src/host/terminal-resource.js`：向宿主公开资源导航注册 `sandbox-terminal`，不新 lane、不私有 import [DNT] | 地址无 token；恢复只 attach | `DNLS03-T71` | high |
| P8-03 | Phase 8 | 文档同切 | update | `dsh-nano-local-sandbox/AGENTS.md` 身份表与「使用」表 | 人读说明与目标态一致；版本号仍读 package.json，不写死 1.3 | `DNLS03-T72` | low |

---

## 4. Phase 业务表格

### 4.1 Phase 0 — 测量锁与 worktree

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P0-01 | worktree | 从当时 HEAD 建 `.agents/worktrees/dnls03-managed-sandbox-control`。实现提交只发生在该树。 | 仓根 `.agents/worktrees/` | 当前文档所在工作区不被实现 diff 污染 | `DNLS03-T00` | `git -C` 该树 `rev-parse` 成功，分支名即目录名 |
| P0-02 | 锚复核 | 打开 §7.1 每一行，确认符号仍在。不符则停工并回到 QNA 追加测量，不在计划里改目标态。 | §7.1 | 复核记录写在执行日志，不写进真相层 | `DNLS03-T00` | 全部锚命中，或已停工 |

### 4.2 Phase 1 — 对象身份与控制台账

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P1-01 | 台账文件 | a) 根文档 `{version,envId,sandboxes}`。b) 行含稳定 `sandboxId`、展示名、profile、归属、期望覆盖或配方引用、backend 绑定、卷与端口分配。c) 同目录临时文件写完后原子替换；替换失败对调用方是失败。d) 不写入 `attach.url`、屏幕、整份配方、权威健康布尔。 | 新 `src/host/control-registry.js`；卷根沿用 `stateRootFor`（`profile-drivers.js:152`） | 进程杀掉再读，行还在 | `DNLS03-T01` | 读回字节与写入意图一致；失败路径不留半截终态文件 |
| P1-02 | 身份上移 | a) 新对象分配一次 `sandboxId`，改名不改 ID。b) 新卷路径 `<stateRoot>/<profileId>/<sandboxId>`。c) `ensure` 不再以 `(profileId,sessionId)` 作为物理主键（现 `instance-registry.js:32`）。d) session / pane 只登记使用关系；session 结束不删对象。e) 容器名只作 locator，必须带可核验的代次。 | `instance-registry.js:18-43` | 两个 session 绑定同一 sandbox 时只有一个对象行 | `DNLS03-T02` | 重启后 ID 不变；容器名或旧 session 不能当 ID 查回 |
| P1-03 | 单写者 | a) 每根一个 env 所有者、一个活动写者。b) 锁文件与台账同目录。c) 第二进程即使指向同一显式根，写入也被拒。d) 不做最后写入者胜出。 | `control-registry.js` | 并发第二写者收到冲突，第一写者的文档不变 | `DNLS03-T03` | 交错写之后文件仍可解析且等于第一写者的提交 |
| P1-04 | 对账与接管 | a) 重启只读对账，未决操作不自动重放。b) inspect 失败标未知，不改绑同名容器。c) 台账损坏、缺失但磁盘上有受管卷、或 `version` 不识别：拒绝以空表认领。d) 发现只读，不启停、不迁卷。e) 接管旧对象必须显式，且保留实挂路径，只登记一次。 | `control-registry.js`；`backend-apple.js` 的 inspect 读口 | 空台账不会把邻居容器收成自己的 | `DNLS03-T04` | 三条否定夹具都失败关闭 |

### 4.3 Phase 2 — 合同版本与单目标分派

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P2-01 | 发现 | a) `GET /nano-local-sandbox/contract` 与 `sandbox.contract` 从同一函数返回 `{contractVersion,capabilities}`。b) 不枚举隐藏对象，不表示权限。c) 旧客户端找不到该工具就停止，不准用试写探版本。 | `routes.js`；`mcp-sandbox.js:189-229` | HTTP 与 MCP 字节级同字段 | `DNLS03-T10` | 无 `sandboxId` 的发现调用不触达 backend |
| P2-02 | 配对 | a) 受管 HTTP 要求 `X-DNLS-Contract: dnls.control/1`。b) MCP 要求 `tools/call` params 的 `_meta["dnls/contract"]`。c) 对象 JSON 与 bridge 推送带 `contractVersion`。d) 缺失或不匹配在准入之后、碰对象之前拒绝为 `sandbox.contract_mismatch`。e) 无 body 的应答用响应头。f) [DNT] local、第三方端点、JSON-RPC `initialize` 不套这层。 | 对象路由入口；`routes.js:1871` initialize 保持原样 | 错版本的 start 不产生操作行 | `DNLS03-T11` | 拒绝发生在 backend spawn 计数仍为 0 时 |
| P2-03 | 错误闭集 | a) 只增加 `sandbox.contract_mismatch`（400）、`sandbox.name_taken` / `port_exhausted` / `quota` / `state_conflict` / `image_missing`（409）、`sandbox.upgrade_failed`（500）。b) 目录按目标 profile 组合，禁止 `activeNamespace`（`error-catalog.js:15,90`）被后加载 profile 改掉另一个对象的前缀。c) 细节只在主体获准的范围内出现。 | `error-catalog.js` | HTTP 与 MCP `isError` 用同一 `errorId` | `DNLS03-T12` | 切换 active profile 夹具后，已存在对象的错误前缀不变 |
| P2-04 | 单目标 | a) 已有对象的 HTTP 只读 query `sandboxId`。b) MCP 只读 `arguments.sandboxId`。c) body、header、session、env、`/mcp` URL 上的选择都忽略且不执行。d) 缺、空、重复、冲突：不执行。e) 只有一个候选也不自动选中。f) 清单与首次创建不要求已有目标。g) 应答带目标；A 的迟到结果不进 B。 | `routes.js`；`mcp-sandbox.js` | sessionId 不能启动 B | `DNLS03-T13` | 否定夹具的 backend 调用次数为 0 |
| P2-05 | 投影 | a) 新路由只经既有 `registerRoutes` 与既有 bake 进入 `lib/bindings.js` 与 perf 声明。b) 不改 `bindings.js:34` 的 `dnls.control` → `/nano-local-sandbox/control`。c) 不把 `declaration.json:40` 的 `dnls.control` 改名为合同版本。d) 不新增仓级门禁脚本。 | `package.json` 的 build 脚本；`lib/bindings.js:34`；`declaration.json:40` | `/control` 仍是人工接管回路 | `DNLS03-T14` | 烘焙后两处 id 仍在，且与 `dnls.control/1` 字符串不相等 |

### 4.4 Phase 3 — 生命周期写与对象授权

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P3-01 | 操作文档 | a) create/start/stop/restart/recreate/remove 以 `(可信主体,requestId)` 去重，指纹含动作与对象或首次创建参数。b) 同键同参返回原操作，异参拒绝，删除不回收旧键。c) 创建先把 ID 和意图写入台账，再做特权动作。d) 状态 `accepted → running → succeeded/failed/indeterminate`；仅派发前可取消；已派发后取消返回现态。e) 未结束 HTTP 202。f) HTTP/MCP 同一 `{sandboxId,operationId,action,state,step}`。g) 超时不重发；未决期间拒绝冲突写。h) remove 只删核实到的对象，默认保卷，不提供删卷工具。 | 台账；lifecycle 路由 | 重复 POST 不会第二次 stop | `DNLS03-T20` | backend stop/remove 计数等于成功派发次数 |
| P3-02 | 断线 | a) 删除「`res.destroyed` 则 `op.status='cancelled'`」（`routes.js:1470`）作为生命周期真源的用法。b) 操作是否取消只看派发前的互斥取消。c) 现有 trace 若仍记录连接结束，不得使用 `cancelled` 这个操作态词，避免和 `T-O-43` 冲突。d) `delivery-guard` 里「errorsOnly 保留 cancelled」改测连接事件或改名，不得再把断线说成操作取消。 | `routes.js:1469-1471,2268-2270` | 客户端中途断开，操作仍是 running 或 indeterminate | `DNLS03-T21` | 查询该 operationId 的状态不是 `cancelled` |
| P3-03 | 授权 | a) 受限 HTTP/MCP/WS 用实际请求调用 `connection.admit`（pin 接口 `rpc.ts:240`；本计划不改 pin）。b) 共享 browser owner 与临时 `peer.id` 不是「可读所有终端」的证明。c) 无可信主体：不发地址，并报告宿主依赖，不用 localhost 或硬编 secret 代替。d) 不可见与不存在都是 404；可见但不能做是 403。e) 审计记录主体、对象、动作、结果、操作引用；不记录 attach URL 和输入内容。 | `src/host/object-authz.js`；pin 只读 | 正确合同版本 + 错误主体仍然 403/404 | `DNLS03-T22` | 审计文件字节中无 `token=` 与输入片段 |

### 4.5 Phase 4 — 终端创建 / 附着与 broker

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P4-01 | 拆返回值 | a) `term.session.create` 入参改为 `{sandboxId,paneId,openId,service?,cwd?,cols?,rows?}`，返回 `{sandboxId,terminalId}`，无 `attach`。b) `attach` 入参 `{sandboxId,terminalId}`，核权、归属、原执行之后才返回 `{protocol,url}`。c) list、read、input、resize、close 按二元引用；list 无 URL。d) 断连不是 close，不补发缓冲输入。e) 改写本包 `term-bridge.test.mjs`（含 `:81-91` 的 v1 URL、`token=`、无 token 拒升级，以及 `:125` 的两次 create 同一 URL）和 `terminal-contract.test.mjs:22-24`。**不要改** `threat.spike.test.mjs:191`：那一断言打的是 [DNT] local 的 `createMcpHandler`，不是本包 create。 | `term-bridge.js:4,23-44,124-125`；`terminal-driver.js:4-63` | create 响应体搜索不到 `url` | `DNLS03-T30` | 旧测试文件中不再期望 create 返回 `dnt-ws-v1` |
| P4-02 | broker | a) 原 PTY 由环境内 broker 持有，不由一次 `openTermSession` 的子进程代表「终端身份」。b) `pty-entry.mjs` 从常量 stub 改为真实入口（现文件仅 2 行）。c) 浏览器断连、隐藏 pane、只重启宿主进程：不杀该 PTY。d) sandbox stop/重建不承诺进程还在。e) 真伪：重启宿主后写入新输入，原进程状态前进；只比对旧屏不算通过。f) 容器 CLI 仍只从 `backend-apple.js` 出去。 | `profiles/terminal/pty-entry.mjs`；`backend-apple.js:289`；`term-bridge.js` | 宿主进程退出再起，同一 `terminalId` 仍能 attach | `DNLS03-T31` | 输入前后的进程侧标记不同，且不是新 shell 的启动横幅冒充 |
| P4-03 | 创建键与 attach 否定 | a) 键是 `(可信主体,sandboxId,openId)`。b) 同参返回原 `terminalId`；异参拒绝；已结束的旧键不复活。c) attach 到失联：不可确认，不 spawn，不转 create。d) attach 到已结束：报告结束，不 spawn。e) `service` 只是启动上下文，不因此新建一套 Kitesurf 私有终端。 | `term-bridge.js` | 失联 attach 的 spawn 计数为 0 | `DNLS03-T32` | 三次否定（失联、已结束、异参）都没有新 PTY |

### 4.6 Phase 5 — 沙箱 wire 与附着核身

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P5-01 | v2 | a) 动态 URL 上的 `open` 必须带 `v:2,align:1,session:<terminalId>`。b) `ready` 回显终端、版本、对齐。c) 不匹配直接拒绝，不降级到现 `term-bridge.js:50` 的 `v:1`。d) 沿用既有 framed channel，以及 CREDIT / RESIZE / FACTS / AUTO_INPUT / PING / PONG；逐连接流控。缺这些帧不算切完。e) 快照是屏幕投影；断序则重新对齐，发「未对齐」，不拼接旧 replay。f) 断连期间客户端已发出、尚未写入 PTY 的输入，重连后不得补写。g) 仅传输断开可自动重连一次；重连重新走 attach，不复用过期地址，不 create。h) WS 关闭只 detach。 | `term-ws.js`；`term-bridge.js:45-50` | v1 open 被拒绝且 PTY 仍在；无 CREDIT 的 v2 连接不得进入 DATA | `DNLS03-T40` | 拒绝帧之后进程标记不变；重连后的 stdin 记录不含断连期间的缓冲输入 |
| P5-02 | 核身 | a) 发放 locator 与 upgrade 各做一次 admission；upgrade 在接通 broker 前再核代次与终端归属。b) URL 不带 bearer、cookie、token。c) broker 只接受已经完成这两次 admission 的连接。公网或 loopback 直连不是授权，不能绕过宿主。d) 撤权后停输入、输出、resize，清队列，detach，不杀 PTY。e) `peer.signal` 单独存在不够；每批受限数据前要能确认主体与业务权限，否则不开放这条流。f) 不把宿主凭证交给容器日志或布局。 | `src/host/object-authz.js`；删除 `term-bridge.js:44` 的 token query | 直连 broker 被拒；撤权后写入失败，PTY 存活 | `DNLS03-T41` | broker 侧未见新的 kill；直连尝试的 stdin 字节数为 0 |
| P5-03 | 消费同切 | a) [DNT] 仍走通用 `McpLane`，不新增 lane，[DNLS] 不私有 import [DNT]。b) 只改沙箱终端的 open/ready 与 attach 消费。c) [DNT] local 与第三方端点的协议测试原样通过。 | `dsh-nano-terminal` 中 sandbox attach 消费点；local 测试保持 | local 套件 diff 为空或仅有与本切无关的零改动 | `DNLS03-T42` | local 协议夹具仍拒绝被改成 v2 |

### 4.7 Phase 6 — 服务、修订与用量

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P6-01 | 服务与端口 | a) 标识是 `(sandboxId,serviceId)`，声明来自该对象的 profile（`profile.yaml:25-31`）。b) 创建意图内按服务整组预留 `(loopback,协议,hostPort)`，同 env 各 profile 共用一个预留检查，不按 driver 各建池。已知未创建才回收本次预留；部分创建或结果不确定时保留原端口，按原 operation 核对，不换号重发。c) 删除 `bridgeControlBase` 的 `portNum+1`（`routes.js:1122-1127`）。d) probe、bridge、CDP、详情只读该对象 inspect 映射。e) 邻号被别的服务占用时，本对象仍报自己的映射；映射消失报不可用，而不是去敲 `enginePort+1`。f) 服务列表不发终端凭证。g) `service` 传给 create 时，driver 只接受容器内 cwd。 | `routes.js:336-440,1114-1127`；`profile-drivers.js:138-149` | 非相邻 bridge 仍可探测 | `DNLS03-T50` | 夹具中 bridge 端口 = engine+2 时，探测打到 +2 而不是 +1 |
| P6-02 | 修订 | a) 同行保存 `desiredRevision` 与最后核实的 `appliedRevision`。b) `appliedRevision` 不是配方副本。c) 保存只校验单位与界限，超界拒绝，不启停、不构建。d) 换代走 `T-O-43` 的操作；先核身份、实挂卷、端口、pin 回执、镜像 digest，并显式中断该对象上仍在的旧终端，不把终端归属留成悬空。e) 摘要不等于 digest，tag 不等于代次。f) 失败不谎称旧实例仍在运行。g) 接管不迁卷。 | 台账；lifecycle | 只保存时 backend build/start 计数为 0 | `DNLS03-T51` | 旧编辑带过期 `expectedRevision` 被拒 |
| P6-03 | 分钟库 | a) 每 env 一个写者；每个已核实 sandbox/代次每 UTC 分钟至多一次。b) 24h/7d/30d 查询同一份最近 30 天槽，不写三份汇总。c) 内存用实测 bytes；CPU 只在同代次连续分钟上做差。d) 停机、漏采、失败、真零可区分；不零填充。e) 刷新页面不额外采样。f) 进程表、命令行、屏幕、token 不入库。g) 现 `backend-apple.js:195` 的单次 stats 只作为一次采样的来源，不作为历史真源。 | 新 `src/host/usage-minutes.js` | 缺分钟处响应为 null 加覆盖度，不是 0 | `DNLS03-T52` | 人为删掉一分钟后，窗口均值分母不含伪造点 |

### 4.8 Phase 7 — 读模型与计额

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P7-01 | fleet | a) `GET /nano-local-sandbox/fleet` 只列宿主明确配置且主体可见的 env；来源不可用标不完整，不扫相邻 home。b) `GET …/sandboxes` 与 `sandbox.list` 同一 owner；inspect 同理。c) 先授权再计数、排序、分页。d) 窄行含实态与操作态两列；在途不覆盖实态。e) `GET …/processes?sandboxId=` 仅对已核实运行的对象，固定只读 `/proc`，PID 升序，默认 50、最多 200；不接调用者命令；不返回 argv/env。f) 列表刷新不触发 prepare，不采进程。g) 推送带 env、对象、代次、单调序号；乱序与异对象整份拒绝。 | 新只读路由；不把 `observe.js:34` 的快照当台账 | 隐藏 env 的名字不出现在 404 正文里 | `DNLS03-T60` | 无 processes 权限时响应不带别人的 pid |
| P7-02 | 计额 | a) `maxInstances` 计不同 `sandboxId`，不是 `instances.size`（现 `instance-registry.js:42`）。b) 已停、失联、未决占位；只读发现、session、terminal 不占额。c) 创建与接管在派发特权动作之前，由同一写者先原子写入占位行，再判额。不得「先判额、创建成功后再登记」。并发的两个创建只能有一个占位成功。满额 `sandbox.quota`，不逐出别人。d) 替换 `sweep`（`:91-98`）：可证空闲才 stop；stop 后行、卷、端口、名额都还在；不在启动时集中停。e) live/detached PTY、在途写、broker 未知：不自动停。f) 打开 fleet 或读 stats 不刷新空闲计时。g) 不再用 `scope` 选容器；不新增 `scope: sandbox`。 | `instance-registry.js:42,91-98`；`profile.yaml:6,55-56`；`control-registry.js` | 两 session 共一对象只占 1；停机后 `registry.json` 仍有该 `sandboxId` 行 | `DNLS03-T61` | 收口证据是台账文件里的行，不是内存 `Map.has`；旧 `:51` 删行断言必须消失 |

### 4.9 Phase 8 — 管理页、资源交接与收口

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P8-01 | 管理出口 | a) `package.json` 增加正式 client 出口与 `files` 项（现 `:12-30` 没有 `src/client`）。b) 通过宿主槽位注册唯一「沙箱」页；`/sandbox` 只聚焦该页。c) 用宿主 primitive，其次 nano-ui；不写独立 HTML，不找宿主私有 DOM，不覆盖宿主命令。d) 若目标宿主没有无 session 的正式页签：返回明确的宿主依赖，管理 API 仍可用，不得伪造 session 把 UI 说成已交付。e) 无 [DNT] 时可以创建（不连接），不可以假装交互已打开。 | `package.json`；`src/client/` 仅在槽位存在时 | 槽位缺失的夹具退出码表达依赖，不是 0 伪装成功 | `DNLS03-T70` | 包内不出现第二套设计壳的 HTML 入口 |
| P8-02 | 资源地址 | a) 地址 `dsh-resource://sandbox-terminal/<envId>/<sandboxId>/<terminalId>`，三段都是校验后的单独路径段。b) 不含主机 URL、session、命令、token。c) 只有明确的一次新建手势才 create；导航失败显示「已创建，未连接」，重试不制造第二个终端。d) 恢复、切页、卸载不 close。e) 不新增 lane；无处理器时允许在公开选择器里手选，不回落本机 shell。 | `src/host/terminal-resource.js` 注册到宿主公开导航；[DNT] 只做通用处理器 | 两次导航同一地址，broker 仍是一个 PTY | `DNLS03-T71` | 地址解析结果里没有 `token` 键 |
| P8-03 | 文档 | a) 改 `dsh-nano-local-sandbox/AGENTS.md`：浏览器入口改为「同包工作台页，不是第二套设计面；无槽位则宿主依赖」。b) 「使用」表里 ensure 不再写「按 session 复用或创建实例」作为物理身份。c) 终端一行改为 create 不发 URL、attach 才发。d) 不改 `engines.dsh`，不改 `version`。e) 仓根清单若仍把本包写成「无任何 UI」，同步一句，避免和 `T-O-51` 冲突。 | 包 `AGENTS.md`；必要时仓根插件表 | 文档与 §2.4 CITE 无矛盾 | `DNLS03-T72` | `git diff` 中无 QNA / 真相层规则句 |

---

## 5. Phase 详情

### 5.1 Phase 0 — 测量锁与 worktree

- **Phase 目标**：执行位置合法，测量锚仍成立。
- **本 Phase 对应编号**：`P0-01` / `P0-02`
- **本 Phase 新增文件**：无交付代码
- **本 Phase 修改文件**：无
- **具体功能预期**：
  1. worktree 路径在 `.agents/worktrees/dnls03-managed-sandbox-control`。
  2. 复核时 `term-bridge.js` 的 create 仍返回 `dnt-ws-v1` URL。若此处已经变成 v2，说明测量过期，停工。
  3. 复核时 `instance-registry.js` 的 `sweep` 仍会 `instances.delete`。若已经改为保留行，停工核对，不把两套语义叠在一起。
  4. `DNLS03-T00` 只在这一 Phase 点名运行。通过后停用该文件，不放进 `package.json` 的 `test` 脚本。后面的 Phase 删掉旧符号时，不得再被它打红。
- **对应测试台账项**：`DNLS03-T00`
- **收口标准**：复核记录存在；锚漂移则没有后续 Phase 的提交。
- **本 Phase 风险提醒**：在脏的 `main` 工作区里「顺手改两行」会和本计划的原子切割混在一起。

### 5.2 Phase 1 — 对象身份与控制台账

- **Phase 目标**：磁盘上的台账是受管身份的唯一可写权威。
- **本 Phase 对应编号**：`P1-01`–`P1-04`
- **本 Phase 新增文件**：`dsh-nano-local-sandbox/src/host/control-registry.js`、`dsh-nano-local-sandbox/test/control-registry.test.mjs`
- **本 Phase 修改文件**：`instance-registry.js`
- **具体功能预期**：
  1. 分配的 `sandboxId` 在改名、重启、再绑定另一个 session 之后不变。
  2. 新卷目录含 `sandboxId`，不含 sessionId 作为主键。
  3. 第二写者被拒时，文件校验和等于第一写者提交后的值。
  4. 台账 JSON 损坏时，下一次启动不创建空 `sandboxes: []` 去认领已有卷。
  5. 发现接口可以列出「未知」，但不能 stop 那个未知对象。
  6. 接管同一存量对象两次，台账里仍是一行。
- **对应测试台账项**：`DNLS03-T01`–`T04`
- **收口标准**：四项测试在夹具 backend 上 PASS；不要求本机 Apple `container`。
- **本 Phase 风险提醒**：若把台账写进 `observe.js` 的内存快照，会违反「派生视图不是恢复真源」。

### 5.3 Phase 2 — 合同版本与单目标分派

- **Phase 目标**：派发前就能拒绝错版本和错目标，且不碰容器。
- **本 Phase 对应编号**：`P2-01`–`P2-05`
- **本 Phase 新增文件**：`test/contract-version.test.mjs`、`test/target-dispatch.test.mjs`
- **本 Phase 修改文件**：`routes.js`、`mcp-sandbox.js`、`error-catalog.js`、烘焙产物所来自的声明
- **具体功能预期**：
  1. 发现接口在 backend spawn 计数为 0 时返回 `dnls.control/1`。
  2. 正确版本但不带 `sandboxId` 的对象写被拒。
  3. query 与 body 各给一个不同的 `sandboxId` 时不执行。
  4. `/mcp?sandboxId=` 不能代替 arguments。
  5. 唯一可见对象也不会被自动选中。
  6. `dnls.control` 绑定 id 仍然等于 `/nano-local-sandbox/control` 那一行，字符串值不是 `dnls.control/1`。
- **对应测试台账项**：`DNLS03-T10`–`T14`
- **收口标准**：否定用例的特权计数为 0。
- **本 Phase 风险提醒**：把合同版本写进绑定 id 会打断现有人工接管回路。

### 5.4 Phase 3 — 生命周期写与对象授权

- **Phase 目标**：一次意图最多一次特权副作用；主体与权限分开。
- **本 Phase 对应编号**：`P3-01`–`P3-03`
- **本 Phase 新增文件**：`test/lifecycle-operation.test.mjs`
- **本 Phase 修改文件**：`routes.js` 操作跟踪段
- **具体功能预期**：
  1. 相同 requestId 与相同指纹的第二次 stop 不再调用 backend。
  2. 相同 requestId、不同动作：拒绝，且不覆盖原操作。
  3. 已派发后的取消返回现态，状态不是新的 `cancelled`。
  4. 响应中途 `destroyed` 时，操作文档不是 `cancelled`。
  5. 不可见 sandbox 的 stop 与不存在的 stop 都是 404，正文不说明「你没权限所以它其实在」。
  6. 审计行可以按 operationId 找到，但没有 URL 和键入内容。
- **对应测试台账项**：`DNLS03-T20`–`T22`
- **收口标准**：上述六条都是断言，不是注释。
- **本 Phase 风险提醒**：继续用 trace 的 200 行环形缓冲当恢复源，重启后会把未决写成成功或取消。

### 5.5 Phase 4 — 终端创建 / 附着与 broker

- **Phase 目标**：终端身份与附着地址分开；原执行不跟着宿主进程死。
- **本 Phase 对应编号**：`P4-01`–`P4-03`
- **本 Phase 新增文件**：`test/term-create-attach.test.mjs`；broker 夹具（假 PTY，记录 stdin 与 pid）
- **本 Phase 修改文件**：`term-bridge.js`、`terminal-driver.js`、`pty-entry.mjs`、`term-bridge.test.mjs`、`terminal-contract.test.mjs`。不改 `threat.spike.test.mjs:191`
- **具体功能预期**：
  1. create 响应没有 `attach` 字段。
  2. list 响应没有 `url`。
  3. 未授权 attach 不监听端口。
  4. 失联与已结束都不调用 spawn。
  5. 杀掉持有路由的进程再拉起后，向原 `terminalId` 写入的字节出现在原夹具 PTY，而不是新 PTY。
  6. 只恢复上一帧屏幕、没有新输入被原进程消费：测试必须 FAIL（这是防假绿，不是备用成功条件）。
- **对应测试台账项**：`DNLS03-T30`–`T32`
- **收口标准**：`DNLS03-T31` 用进程侧标记，不用截图像素。
- **本 Phase 风险提醒**：把 broker 放在宿主 Node 进程里，会在「只重启 [dsh]」时直接判负。

### 5.6 Phase 5 — 沙箱 wire 与附着核身

- **Phase 目标**：沙箱终端只有一种 wire；地址不能当权限。
- **本 Phase 对应编号**：`P5-01`–`P5-03`
- **本 Phase 新增文件**：`test/term-wire-v2.test.mjs`
- **本 Phase 修改文件**：`term-ws.js`、`term-bridge.js`、[DNT] 沙箱消费点
- **具体功能预期**：
  1. `v:1` open 被拒绝。
  2. `session` 与 URL 所绑定的 `terminalId` 不一致时拒绝。
  3. 没有 CREDIT / 逐连接流控的 v2 连接不能进入 DATA。
  4. 传输断开后的第一次重连要换新 URL；第二次自动重连不发生；断连期间的输入不写入原 PTY。
  5. 撤权后队列被清空，PTY 的 kill 计数仍为 0。绕过宿主直连 broker 的写入字节数为 0。
  6. locator 字符串不含 `token=`。
  7. [业主] 执行期勘误（T42）：零差异保护的是 [DNT] local 与第三方既有协议行为，不是整个包。允许通用 McpLane 的沙箱分支及其构建产物变化。原 :191 断言保持；分别实测三条路径。
- **对应测试台账项**：`DNLS03-T40`–`T42`
- **收口标准**：`t42-dnt-local.log` 与 `t42-sandbox-wire.log` 分开记 PASS；前者仍包含 `:191` 的 `session=` 断言。
- **本 Phase 风险提醒**：按插件名或 URL 特征分派，会把第三方端点卷进硬切。

### 5.7 Phase 6 — 服务、修订与用量

- **Phase 目标**：发布地址、代次、用量各自只有一个事实来源。
- **本 Phase 对应编号**：`P6-01`–`P6-03`
- **本 Phase 新增文件**：`src/host/usage-minutes.js`、`test/service-ports.test.mjs`、`test/usage-minutes.test.mjs`
- **本 Phase 修改文件**：`routes.js` `bridgeControlBase`、`profile-drivers.js` `envHostPorts`
- **具体功能预期**：
  1. inspect 给出的 bridge 不是 engine+1 时，探测仍打到 inspect 的端口。
  2. 预留失败不发布成功 URL。部分创建或结果不确定时不换端口重发。服务列表与详情里没有 token 或 attach URL。
  3. 保存超界内存被拒，backend 无 start。
  4. 镜像 tag 变化但 digest 相同，不单独构成新代次。
  5. 分钟缺口保持 null。
  6. 同一分钟的第二次采样被写者丢弃。
- **对应测试台账项**：`DNLS03-T50`–`T52`
- **收口标准**：`bridgeControlBase` 不再导出「端口加一」行为；若函数还在，其测试必须证明它不参与对象寻址。
- **本 Phase 风险提醒**：保留 `port+1` 当「inspect 失败时的兜底」就是 `T-O-46` 禁止的 `httpBase` 兜底。

### 5.8 Phase 7 — 读模型与计额

- **Phase 目标**：读是投影；额是台账上的对象计数；空闲回收不删对象。
- **本 Phase 对应编号**：`P7-01` / `P7-02`
- **本 Phase 新增文件**：`test/fleet-projection.test.mjs`、`test/quota-idle.test.mjs`
- **本 Phase 修改文件**：`instance-registry.js`；`lifecycle.spike.test.mjs`
- **具体功能预期**：
  1. 未授权 env 不出现在 fleet，也不出现在错误字符串里。
  2. 操作态 `stopping` 时，实态列仍是停止前的核实值，直到核实完成。
  3. processes 在对象未运行时不是空数组冒充成功。
  4. 两个 session 绑定同一 sandbox，再创建第二个 sandbox，在 `maxInstances: 2` 时成功；第三个 sandbox 才是 `sandbox.quota`。并发的两次创建只留下一个占位行。
  5. 空闲 stop 之后，`registry.json` 里该 `sandboxId` 仍在，卷路径还在，名额不释放。只让内存 `Map.has` 为真不算通过。
  6. detached PTY 存在时，空闲计时器到点也不 stop。刷新 fleet 不增加 prepare 或采样次数。
- **对应测试台账项**：`DNLS03-T60` / `DNLS03-T61`
- **收口标准**：旧 spike 若仍断言 `instances.has(...) === false`，整 Phase 不得标完成。
- **本 Phase 风险提醒**：用 session 数乘 `maxInstances` 会把「两个人用同一环境」算成两格。

### 5.9 Phase 8 — 管理页、资源交接与收口

- **Phase 目标**：消费层接上公开面；接不上就明示依赖。
- **本 Phase 对应编号**：`P8-01`–`P8-03`
- **本 Phase 新增文件**：`src/client/`（条件）；`test/resource-handoff.test.mjs`
- **本 Phase 修改文件**：`package.json` exports/files；包 `AGENTS.md`
- **具体功能预期**：
  1. 有槽位的夹具里，`/sandbox` 与页签是同一个注册 id。
  2. 无槽位的夹具失败信息含「宿主依赖」，且没有创建 PTY。
  3. 资源地址三段缺一不可解析。
  4. 导航失败后再导航，create 计数不增加。
  5. 关闭页签不调用 `term.session.close`。
  6. 包说明不再把「无浏览器入口」写成「本期不交付管理能力」。
- **对应测试台账项**：`DNLS03-T70`–`T72`
- **收口标准**：Case 2/4 路径无新增路由；`package.json` 的 `version` 仍是开工时的值。
- **本 Phase 风险提醒**：用假 session 把页签塞进只在会话内存在的宿主槽，会被 `T-O-54` 判为未交付还假装交付。

---

## 6. 依赖的冻结设计决策（只读引用）

| 决策 / Q ID | 冻结来源 | 本计划中的影响 | 若不成立的处理 |
|-------------|----------------|----------------|----------------|
| `T-O-33`–`T-O-35` | 真相层 §2.1 | 范围、暂缓、归属 | 不得在本计划里扩 Case 2/4 或改 J1/J2 |
| `T-O-36`–`T-O-40` | 真相层 §2.1 / §2.3 | Phase 1 | 台账介质若被后继 supersede，停在 Phase 1 |
| `T-O-38` / `T-O-41` / `T-O-50` | 真相层 §2.2 / §2.5 | Phase 2 | 不得恢复 body/header/session 兜底 |
| `T-O-43` / `T-O-44` | 真相层 §2.3 | Phase 3 | 不得把断线再标成取消 |
| `T-O-39` / `T-O-42` | 真相层 §2.1 / §2.2 | Phase 4 | 不得用旧屏当原执行的证据 |
| `T-O-45` / `T-O-52` | 真相层 §2.2 / §2.6 | Phase 5 | 不得保留 v1 降级 |
| `T-O-46`–`T-O-48` | 真相层 §2.4 | Phase 6 | 不得恢复端口加一 |
| `T-O-49` / `T-O-53` | 真相层 §2.5 / §2.6 | Phase 7 | 不得用 sweep 删行充作空闲回收 |
| `T-O-51` / `T-O-54` | 真相层 §2.5 / §2.6 | Phase 8 | 槽位缺失不得假绿 |
| `T-O-17` | DNLS01，局部替代 | 仅沙箱终端工具面与本沙箱 wire | 不得改 [DNT] local |
| `T-O-18` | DNLS01 | 无 session UI；做不到就宿主依赖 | 不得伪造 session |
| `T-O-27` | DNLS02，被 `T-O-36` 细化 | session 记录不再是物理身份 | 不得回改 DNLS02 正文 |
| `T-O-29` | DNLS02 | Phase 3 断线不取消 | 不得重开 |
| `T-O-31` | DNLS02 | 换代不改官方 pin | pin 脏写即停 |

---

## 7. 内置 Reference-Anchor 锚区

测量 HEAD：`1e41d91`。下列行号在本文件写作时打开过源文件。执行时先做 P0-02。

### 7.1 锚表

| 锚 ID | path:line | 落点（这是什么） | 本 AP 用途 | 处置 | 备注 |
|-------|-----------|------------------|------------|------|------|
| A-1 | `dsh-nano-local-sandbox/src/host/instance-registry.js:18` | 内存 `Map` | P1-02 物理身份的现落点 | ♻️ 重 substrate | 不能把 Map 持久化成第二台账 |
| A-2 | `instance-registry.js:28-43` | `ensure({sessionId})` 按 session 复用 | P1-02 | ♻️ 重 substrate | 主键改为 sandbox |
| A-3 | `instance-registry.js:42` | `instances.size` 与 `maxInstances` 比较 | P7-02 | ♻️ 重 substrate | 改为计 sandboxId |
| A-4 | `instance-registry.js:91-98` | sweep stop 后 `delete` | P7-02 | ♻️ 重 substrate | 旧语义，必须替换 |
| A-5 | `src/host/profile-drivers.js:152-153` | `stateRootFor`（注释在 :152，export 在 :153） | P1-01 台账根目录 | ✅ 复用 | 不另造根 |
| A-6 | `src/host/term-bridge.js:4-5` | :4 是「一 session 一 PTY」注释，:5 是 `active` Map | P4-01 | ♻️ 重 substrate | 注释本身就是旧合同 |
| A-7 | `term-bridge.js:23-44` | create 复用并发 `dnt-ws-v1` URL | P4-01 / P5-01 | ♻️ 重 substrate | create 不得再发 URL |
| A-8 | `term-bridge.js:124-125` | list 随行发 URL | P4-01 | ♻️ 重 substrate | |
| A-9 | `profiles/terminal/pty-entry.mjs:1-2` | 仅导出常量的 stub | P4-02 | ♻️ 重 substrate | 不是已实现的 broker |
| A-10 | `src/host/backend-apple.js:190-197` | 单次 `container stats` | P6-03 的采样来源 | ✅ 复用 | 不是分钟库 |
| A-11 | `backend-apple.js:289` | `container exec -it … /bin/sh` | P4-02 现 PTY 路径 | ♻️ 重 substrate | CLI 仍只许在本文件 |
| A-12 | `src/host/routes.js:1114-1127` | `bridgeControlBase` 端口加一 | P6-01 | ♻️ 重 substrate | 禁止留作兜底 |
| A-13 | `routes.js:431-440` | 已分别找到 engineRow/bridgeRow，探测仍用 httpBase | P6-01 | ♻️ 重 substrate | |
| A-14 | `routes.js:1469-1471` | `res.destroyed` → `cancelled` | P3-02 | ♻️ 重 substrate | 这是操作跟踪，不是「lifecycle 模块」 |
| A-15 | `src/host/error-catalog.js:15,88-110` | 进程级 `activeNamespace` | P2-03 | ♻️ 重 substrate | |
| A-16 | `src/host/mcp-sandbox.js:189-250` | tools/list 与 tools/call 同一张表 | P2-01 / P2-04 | ✅ 复用 | 新工具进这张表，不另写分发 |
| A-17 | `lib/bindings.js:34` | 绑定 id `dnls.control` = `/control` | P2-05 | ✅ 复用 | 与合同版本 `dnls.control/1` 不是一回事 |
| A-18 | `src/perf/declaration.json:40` | perf 里的 `dnls.control` 字符串 | P2-05 | ✅ 复用 | 不要改成合同版本 |
| A-19 | `package.json:12-30` | exports/files 无 client | P8-01 | ♻️ 重 substrate | 版本字段不改 |
| A-20 | `profiles/kitesurf/profile.yaml:6,25-56` | `scope: session`、两个 service、`idleTimeoutMs`、`maxInstances: 2` | P6-01 / P7-02 | ✅ 复用 | scope 仍是使用范围；时长沿用声明值 |
| A-21 | `src/host/observe.js:34` | `projectSnapshot` | P7-01 只读参考 | ✅ 复用 | 不得升格为恢复真源 |
| A-22 | `src/host/terminal-driver.js:4-39` | `TERM_TOOL_NAMES` | P4-01 工具面 | ♻️ 重 substrate | 只改沙箱工具的返回值 |
| A-23 | pin `packages/client/connection/src/rpc.ts:240` | `admit(request)` | P3-03 / P5-02 | ✅ 复用 | 不改 pin，不批新票据 |
| A-24 | `test/lifecycle.spike.test.mjs:41-51` | 断言 sweep 后行不在 | P7-02 必须改写的旧绿灯 | ♻️ 重 substrate | 见 §8.5 ⛔G1 |
| A-25 | `test/term-bridge.test.mjs:81-91,125` | 断言 create 返回 v1 URL、URL 含 `token=`、无 token 拒绝 upgrade、两次 create 同一 URL | P4-01 必须整段改写 | ♻️ 重 substrate | 见 §8.5 G2。不要改 `threat.spike.test.mjs:191`（那是 [DNT] local） |
| A-26 | `test/terminal-contract.test.mjs:23-24` | 同上 | P4-01 | ♻️ 重 substrate | |
| A-27 | `test/instances-ensure.test.mjs:57-116` | sessionId 索引 env 容器 | P1-02 必须改写 | ♻️ 重 substrate | 见 §8.5 ⛔G3 |

### 7.2 反例 ledger

| ⛔ | 反例 / 陷阱 | 为什么 |
|----|-------------|--------|
| ⛔1 | create 仍返回 `attach.url`，另加一个「新 API」 | `T-O-42` 要求的是这一次硬切，不是第二条通道 |
| ⛔2 | `dnt-ws-v1` 作为 v2 失败时的降级 | `T-O-45` |
| ⛔3 | 用 sessionId、容器名、端口当 `sandboxId` | `T-O-36` / `T-O-41` |
| ⛔4 | 台账损坏时写入空列表以「恢复服务」 | `T-O-40` |
| ⛔5 | 最后写入者胜出，或第二宿主覆盖同一根 | `T-O-40` |
| ⛔6 | `res.destroyed` 写成操作 `cancelled` | `T-O-43` 与 `T-O-29` |
| ⛔7 | 正确的 `X-DNLS-Contract` 代替对象授权 | `T-O-50` / `AF-6` |
| ⛔8 | 共享 browser owner 可读全部终端 | `T-O-52` |
| ⛔9 | locator 上带 token，或把 cookie 送进容器 | `T-O-52` |
| ⛔10 | 撤权时 kill PTY | `T-O-52` |
| ⛔11 | `enginePort+1` 或历史 `httpBase` 兜底 | `T-O-46` |
| ⛔12 | 保存候选时顺手重启 | `T-O-47` |
| ⛔13 | 用量缺口填 0 | `T-O-48` |
| ⛔14 | sweep 删行，或按 session 计额 | `T-O-53`；现 `instance-registry.js:91-98` |
| ⛔15 | 用截图相等证明原执行还在 | `T-O-39` |
| ⛔16 | 无页签槽位时伪造 session | `T-O-51` / `T-O-54` |
| ⛔17 | 恢复布局再 create 一次 | `T-O-54` |
| ⛔18 | 把 `dnls.control` 绑定 id 改成 `dnls.control/1` | `B-10` / `AF-6` |
| ⛔19 | 新 release-gate、删卷 API、`scope: sandbox`、Case 2/4 路由 | 真相层 P6 / `T-O-34` |
| ⛔20 | 改官方 pin 或在 `backend-apple.js` 以外调用容器 CLI | `T-O-31`；包 AGENTS |

### 7.3 上游真源指针 + 安全项威胁模型

- **独立 reference-anchor**：无。本表就是 grounding 真源。
- **威胁模型（本计划内，不另起文件）**。安全项的测试必须打这些向量，不能只走 happy path：
  1. **无选择执行**：缺、空、重复、冲突的 `sandboxId`，以及用 sessionId / URL 查询参数代替。期望：不派发（`T-O-38` / `T-O-41`）。
  2. **凭地址附着**：持有旧 URL、错误 `terminalId`、撤权后的 locator，或绕过宿主直接连 broker 的 loopback/公网口。期望：拒绝，且不 spawn、不杀已有 PTY、直连写不进 stdin（`T-O-42` / `T-O-52`）。
  3. **空台账认领**：损坏 JSON、缺失文件但卷还在、版本字节不认识。期望：不把磁盘上的容器收成受管对象（`T-O-40`）。
  4. **第二写者**：两个进程同一 `stateRoot`。期望：后者失败，前者文档不变（`T-O-40`）。
  5. **断线伪装取消**：响应对象 `destroyed`。期望：操作态不是 `cancelled`，也不重发（`T-O-43`）。
  6. **版本当权限**：头正确、主体不可见。期望：404，且错误正文不泄露对象细节（`T-O-44` / `T-O-50`）。
  7. **端口邻接探测**：bridge 端口 ≠ engine+1，且 engine+1 上有别的监听。期望：只命中 inspect 映射（`T-O-46`）。
  8. **隐藏 env**：fleet 调用方无权。期望：列表与错误字符串都不含该 env（`T-O-49`）。
  9. **额度旁路**：只读发现、多 session、换代。期望：不增加占用；满额不踢掉别人（`T-O-53`）。
  10. **假交付**：没有页签槽位仍报告 UI 可用，或资源 URL 内嵌 token。期望：宿主依赖 / 解析失败（`T-O-51` / `T-O-54`）。

---

## 8. 测试台账

夹具 backend 必须能跑完契约测试；没有 Apple `container` 不是失败理由（包 AGENTS 的前置第 4 条）。本计划**不**把「`npm test` 退出码 0」单独当成 PASS。退出码 0 只在 §8.5 的旧断言已被改写之后才算数。

### 8.1 测试清单（主表）

| Test-ID | 测试项（验证什么） | 类型 | 层 | 来源 | 映射（工作项 → 收口目标） | PASS 证据（四元组） |
|---------|-------------------|------|----|------|---------------------------|---------------------|
| `DNLS03-T00` | Phase 0 一次性闸：开工时 §7.1 符号仍在；漂移则 FAIL 并阻止后续。**不进常驻 `npm test`**。Phase 0 出口后把结果写入执行日志，随即停用该文件，避免后续 Phase 删掉旧符号后它把整包打红 | 短途 | 契约 | 🆕 `test/dnls03-anchors.once.test.mjs`，只在 Phase 0 点名运行，不放进 `package.json` 的 `test` glob | P0-02 → 测量未漂移 | Phase 0 commit + 点名命令 PASS + UTC；之后该项状态改为 `observed-OK-at-closure`，不再要求常驻绿 |
| `DNLS03-T01` | 原子替换；失败不留终态；行内无 attach URL | 短途 | unit | 🆕 `test/control-registry.test.mjs` | P1-01 → 重启可读回 | commit + PASS + UTC |
| `DNLS03-T02` | 两 session 一行；改名 ID 不变；session 结束不删行 | 短途 | unit | 🔱 fork `test/instances-ensure.test.mjs` | P1-02 → session 不是物理身份 | commit + PASS + UTC |
| `DNLS03-T03` | 第二写者失败且字节不变 | 短途 | unit | 🆕 同上 registry 测试 | P1-03 → 无 LWW | commit + PASS + UTC |
| `DNLS03-T04` | 损坏 / 有卷无账 / 坏版本 均不认领；发现不能 stop | 短途 | unit | 🆕 | P1-04 → 失败关闭 | commit + PASS + UTC |
| `DNLS03-T10` | contract 发现不授权、不枚举、不 spawn | 短途 | 契约 | 🆕 `test/contract-version.test.mjs` | P2-01 | commit + PASS + UTC |
| `DNLS03-T11` | 缺头、错版本在 spawn 前拒绝 | 短途 | 契约 | 🆕 | P2-02 | commit + spawn 计数 0 |
| `DNLS03-T12` | 七个 errorId 的状态码；切 profile 不改前缀；不泄露他主体 | 短途 | unit | 🔱 fork `test/error-catalog.test.mjs` | P2-03 | commit + PASS + UTC |
| `DNLS03-T13` | 缺/空/重复/冲突/session 兜底/URL 选择 均不执行；唯一候选不自动选 | 短途 | 契约 | 🆕 `test/target-dispatch.test.mjs` | P2-04 | commit + backend 计数 0 |
| `DNLS03-T14` | 烘焙后 `dnls.control` 仍是 `/control`；源码无新门禁脚本 | 短途 | 契约 | ♻️ `test/route-scan-coverage.test.mjs` 扩断言 | P2-05 | commit + PASS + UTC |
| `DNLS03-T20` | 同键同参一次副作用；异参拒绝；派发后取消返回现态；202 | 短途 | unit | 🆕 `test/lifecycle-operation.test.mjs` | P3-01 | commit + backend 计数 |
| `DNLS03-T21` | `res.destroyed` 不把操作写成 cancelled，也不重发 | 短途 | unit | 🔱 fork `test/delivery-guard.test.mjs` 的 cancelled 用例 | P3-02 | commit + 状态查询 |
| `DNLS03-T22` | 404/403 分离；审计无 URL/输入；owner 不能读他人终端 | 短途 | 契约 | 🆕；攻击向量 §7.3-6 | P3-03 | commit + 审计字节断言 |
| `DNLS03-T30` | create 与 list 的返回值都没有 `url` / `attach`；本包两份旧测试已改写。不改 [DNT] local | 短途 | unit | 🔱 改写 `term-bridge.test.mjs`（`:81-91` 与 `:125`）和 `terminal-contract.test.mjs:22-24` | P4-01 | commit + 源码扫描：create 与 list 返回对象均无 `url`/`attach` |
| `DNLS03-T31` | 重启宿主后新输入推进原 PTY；只对齐屏幕的替身断言失败 | spike | 集成 | 🆕 `test/term-broker.spike.test.mjs` | P4-02 → 真伪是新输入 | commit + spike PASS + UTC |
| `DNLS03-T32` | 失联/已结束/异参 不 spawn；同参返原 id | 短途 | unit | 🆕 `test/term-create-attach.test.mjs` | P4-03 | commit + spawn 0 |
| `DNLS03-T40` | v1 拒绝；session 不符拒绝；缺 CREDIT/流控不得进入 DATA；断序报未对齐；断连期间的输入重连后不出现在 PTY stdin；自动重连只一次且换地址 | 短途 | 契约 | 🆕 `test/term-wire-v2.test.mjs` | P5-01 | commit + PASS + stdin 记录 |
| `DNLS03-T41` | URL 无 token；loopback/公网直连 broker 被拒且 stdin 为 0；撤权 detach 且 kill 计数 0；无主体不开放流 | 短途 | 契约 | 🆕；攻击向量 §7.3-2 | P5-02 | commit + kill 计数 + 直连字节数 |
| `DNLS03-T42` | [DNT] local 仍 PASS；沙箱消费点拒绝 v1。不改 `threat.spike.test.mjs:191` | 短途 | 回归 | ♻️ `node --test dsh-nano-local-sandbox/test/threat.spike.test.mjs`（`:191` 的 `session=` 断言保持，日志 `t42-dnt-local.log`）+ 🆕 本包沙箱夹具（日志 `t42-sandbox-wire.log`） | P5-03 | 两份日志都 PASS；按 §5.6(7) 验收 |
| `DNLS03-T50` | bridge ≠ engine+1 时命中 inspect；+1 端口上的假服务不被当成 bridge；服务列表与详情应答字节中无 `token=`、无 attach URL | 短途 | unit | 🆕 `test/service-ports.test.mjs`；攻击向量 §7.3-7 | P6-01 | commit + 命中端口 + 应答字节断言 |
| `DNLS03-T51` | 保存不 start；过期 expectedRevision 拒绝；tag ≠ 代次 | 短途 | unit | 🆕 | P6-02 | commit + start 计数 0 |
| `DNLS03-T52` | 缺口为 null；不跨断段做差；刷新不二次采样 | 短途 | unit | 🆕 `test/usage-minutes.test.mjs` | P6-03 | commit + PASS |
| `DNLS03-T60` | fleet 不泄露隐藏 env；在途不覆盖实态；processes 上限与无 argv；列表刷新后 prepare 与采样计数为 0；乱序或异对象推送整份拒绝 | 短途 | 契约 | 🆕 `test/fleet-projection.test.mjs` | P7-01 | commit + 正文断言 + prepare 计数 |
| `DNLS03-T61` | 两 session 占一格；并发创建只留下一个占位；满额不逐出；stop 后 `registry.json` 仍有该 `sandboxId`（含卷/端口/名额）；内存 Map 只作补充；detached 不停 | 短途 | unit | 🔱 改写 `lifecycle.spike.test.mjs:41-57` | P7-02 | commit + 读回的台账 JSON |
| `DNLS03-T70` | 有槽位则同一页签；无槽位则宿主依赖且 create 计数 0 | spike | 集成 | 🆕 `test/sandbox-tab.spike.test.mjs` | P8-01 | commit + 两夹具 |
| `DNLS03-T71` | 地址无 token；二次导航不第二次 create；关页不 close | 短途 | 契约 | 🆕 `test/resource-handoff.test.mjs` | P8-02 | commit + create 计数 |
| `DNLS03-T72` | AGENTS 三句已改；version 与 engines 未改；`DNLS03-qna.md` 与 `DNLS03-qna-truth.md` 都不在 diff | 短途 | 契约 | 🆕 `test/dnls03-docs.test.mjs` | P8-03 | commit + git diff 断言 |
| `DNLS03-T80` | 公开面同切：从发现到 attach 的夹具旅程，中间无 v1、无 session 主键 | mega | e2e | 🆕 `test/dnls03-journey.mega.test.mjs` | Phase 8 出口 | commit + mega PASS + UTC |
| `DNLS03-T81` | 两写者交错 + 空闲 stop 与新 attach 竞态，N=20 顺序稳定 | soak | 集成 | 🆕 `test/registry-race.soak.test.mjs` | P1-03 + P7-02 | commit + soak 日志 + UTC |

### 8.2 复用台账

| 既有用例 | 处置 | 改动 | 起跑线状态 |
|----------|------|------|------------|
| `test/term-bridge.test.mjs` | 🔱 改写 create 断言 | 删「create 返回 v1 URL」；改为无 URL | 现 HEAD 上 PASS，但是旧合同 |
| `test/terminal-contract.test.mjs` | 🔱 改写 | 同上 | 旧合同绿灯 |
| `test/threat.spike.test.mjs:170-193` | ♻️ 沿用，不改 | 0。`:191` 测的是 [DNT] `createMcpHandler` 的 local lane，不是本包 create | 必须保持 PASS。同文件 `:197` 只在 `createTermSession` 签名变化时改调用参数 |
| `test/lifecycle.spike.test.mjs` | 🔱 反转删行断言 | `:51` 改为行仍在 | 旧合同绿灯 |
| `test/instances-ensure.test.mjs` | 🔱 身份改测 sandbox | session 降为绑定 | 旧合同绿灯 |
| `test/delivery-guard.test.mjs` | 🔱 cancelled 词 | `:539` 不再把断线当操作取消 | 旧词绿灯 |
| `test/error-catalog.test.mjs` | 🔱 fork | 加七项与前缀稳定 | 保留既有码 |
| `test/route-scan-coverage.test.mjs` | ♻️ 扩一行 | 新路由必须被扫到 | 既有门禁，不新增脚本 |
| [DNT] local 协议测试 | ♻️ 沿用 | 0 改协议 | 必须仍然 PASS |
| `test/no-sandbox-provider.test.mjs` | ♻️ 沿用 | 0 | 本计划仍不实现 `SandboxProvider` |
| `test/container-spawn-sites.test.mjs` | ♻️ 沿用 | 0 | CLI 仍只在 apple backend |
| `test/repin-*.test.mjs` | ♻️ 沿用 | 0 | pin 纪律不在本期改写 |

### 8.3 分层与跑法

| 类型 | 跑法 / 频率 | 主要层 | 触发时机 |
|------|-------------|--------|----------|
| 短途 | `npm test`（包脚本，含 `test/contracts`）。`DNLS03-T00` 不在此 glob 里 | unit / 契约 | 每组改动；T00 只在 Phase 0 点名跑一次 |
| spike | `node --test` 点名 `*.spike.test.mjs` | 集成 | Phase 4 与 Phase 8 |
| mega | 点名 `dnls03-journey.mega.test.mjs` | e2e 夹具，无真实云 | Phase 8 收口 |
| soak | 点名 soak 文件，固定种子，N=20 | 集成 | 退出硬闸 |

不新增仓级 release-gate。路由数变化只更新既有扫描器所读的账本，让既有 `route-scan-coverage` 继续有效。

### 8.4 测试缺口

- 不覆盖 Case 2 / Case 4 的生图与迁库（`T-O-34`）→ 后继计划。
- 不覆盖真实 Apple `container` 的长时间运行 → 夹具 backend 证明合同；上机由另立 grant 决定，本计划不把「没有 CLI」写成失败。
- 不覆盖宿主尚未提供的无 session 页签实现 → `DNLS03-T70` 的无槽位夹具只证明「明示依赖」。宿主补槽位之后另测「能打开」，不在本计划假装已经打开。
- 不覆盖 [DNT] local 与第三方端点的协议迁移 → 明确不改，`DNLS03-T42` 只证明它们没被改坏。
- 不覆盖自动 stop 时长的产品默认值辩论 → 测试读 `profile.yaml` 的 `idleTimeoutMs`，不断言 1800000 以外的新魔法数。

### 8.5 测试保真（防假绿）

现 HEAD 的 `npm test` 可以通过，同时完全没有 `DNLS03`。所以「测试全绿」在改写旧断言之前没有信息量。下面每条都是执行者必须对上的侦测；对不上则该项不得记 PASS。

| 编号 | 假绿形态 | 侦测 |
|------|----------|------|
| G1 | `lifecycle.spike.test.mjs:51` 仍断言行被删除，且为了让它继续 PASS 而保留 `instances.delete` | `DNLS03-T61` 断言 stop 后 ID 仍在台账。旧断言还在 = 本项 FAIL |
| G2 | `term-bridge.test.mjs:81-91` 与 `:125`，以及 `terminal-contract.test.mjs:22-24`，仍期望 create 返回 v1 URL、`token=`、无 token 拒 upgrade、或两次 create 同一 URL | `DNLS03-T30` 扫描 create **与 list** 的返回对象，都不得含 `url` 或 `attach`。上述旧断言还在 = FAIL。不把 `threat.spike.test.mjs:191` 算进本项 |
| G3 | `instances-ensure.test.mjs` 仍用 sessionId 当容器主键，新台账只是旁路文件 | `DNLS03-T02` 要求删掉 session 绑定后对象还在，且不能用 sessionId 查到第二个对象 |
| G4 | 断线仍写 `cancelled`，但测试改成不断言 | `DNLS03-T21` 必须正向断言状态不是 `cancelled` |
| G5 | 另加 v2 路径，保留 v1 create 让旧测试绿 | `DNLS03-T40` 对 v1 open 断言拒绝；G2 同时挡住「两套 API」 |
| G6 | 截图或 ready 帧一致，就宣称原执行还在 | `DNLS03-T31` 的替身分支：只回放旧屏、新输入没有进原 PTY = FAIL |
| G7 | 合同头正确就 200，主体测试用了同一个 owner | `DNLS03-T22` 用第二个主体看同一 sandbox，期望 404 且无细节 |
| G8 | 端口测试只造 engine 与 engine+1 | `DNLS03-T50` 要求 bridge = engine+2，且 engine+1 上有假监听 |
| G9 | 用量测试不插入缺口，均值当然对 | `DNLS03-T52` 必须删掉一分钟再查 |
| G10 | 任一 Test-ID 被 `it.skip` / `test.skip` / `todo` 跳过仍算覆盖 | 全表适用，不只 T70。跳过 = 该项 FAIL。T70 的无槽位夹具还必须跑起来并断言「宿主依赖」 |
| G11 | 资源交接测试不检查 token，URL 里带了 token 仍绿 | `DNLS03-T71` 断言地址与 locator 都没有 `token` |
| G12 | 用测试数量或 `npm test` 退出码汇报「22 项全绿」 | 收口只认本表 Test-ID 的四元组。没有 commit、没有 UTC 时间的 PASS 记为未观察 |
| G13 | 改了实现却不改 `AGENTS.md`，验收文档仍写「按 session 复用」 | `DNLS03-T72` |
| G14 | soak 只跑 N=1 | `DNLS03-T81` 固定 N=20；日志条数不足 = FAIL |

另外：

- `degraded` 必须带机器可读原因。本计划里唯一允许的降级是「宿主无页签槽位」，原因码固定，且不得同时声称 UI 已交付。
- 既有失败若属于本计划没碰的文件，必须用 `git blame` / 基线 commit 说明，不能算进本计划 PASS。
- 安全项 `DNLS03-T04`、`T11`、`T13`、`T21`、`T22`、`T32`、`T41`、`T50`、`T60`、`T61`、`T71` 缺任一攻击向量，对应工作项不算收口。

---

## 9. 风险、依赖与完成后状态

### 9.1 风险与依赖

| 风险 / 依赖 | 描述 | 当前判断 | 应对方式 |
|-------------|------|----------|----------|
| 宿主无 session 页签 | `T-O-51` / `T-O-54` 的 UI 出口依赖 [dsh工作台] | medium | P8-01 明示依赖，不假绿 |
| `admit` 只证明共享 owner | pin `rpc.ts:240` 的 browser 路径不是多用户证明 | high | P3-03 / P5-02 另做对象授权；不改 pin |
| 旧测试绿灯 | §8.5 G1–G3 | high | 同一提交改写断言 |
| 端口加一遗留调用点 | `routes.js` 里不止 `bridgeControlBase` 一处读 `httpBase` | medium | P6-01 以「非相邻夹具」扫全部探测函数 |
| broker 误放在宿主进程 | 重启宿主即丢 PTY，与 `T-O-39` 相反 | high | `DNLS03-T31` 先杀宿主再写 |
| 绑定 id 与合同版本混淆 | `bindings.js:34` 已有 `dnls.control` | medium | P2-05 禁止改名 |
| 无实现授权 | 真相层 `NOT IMPLEMENTATION GRANT` | high | 本文件状态到 `reviewed` 为止；开工要另立 grant |

### 9.2 约束与前提

- **技术前提**：容器 CLI 只在 `backend-apple.js`；内核目录不写 profile 业务词；新错误只进一份 catalog。
- **运行时前提**：夹具 backend 足够完成 §8。真实容器不是本计划的出口。
- **组织协作前提**：消费者改动限于 [DNK]/[DNT] 被点名的公开面，且与提供者同一批切割。不改 pin 仓。
- **上线 / 合并前提**：本计划不授权合并到发布、不授权 tag。worktree 合并回指定分支是执行阶段的事，不在写这份计划时做。

### 9.3 文档同步要求

- 需要同步更新的设计文档：无新设计。v1.3 草案保持形成史，不回写成「已实现」。
- 需要同步更新的说明文档 / README：包 `AGENTS.md` 身份表与使用表（P8-03）。仓根插件清单只在它仍写「本包无 UI」时改一句。
- 需要同步更新的测试说明：§8.2 点名的旧用例，在改写的同一提交里更新。
- 退役清单（代码、注释、头注、行号锚、文档句）：
  - 代码：`term-bridge.js` 的 session 主键与 token query；`instance-registry.js` 的删行 sweep；`routes.js` 的端口加一与断线即 cancelled
  - 注释：`term-bridge.js:4`、`routes.js:1122-1123` 的「bridge 在下一端口」
  - 头注：操作跟踪里把 cancelled 当连接结束的说明（`routes.js:2268` 附近）
  - 行号锚：本计划 §7；执行后若行号漂移，改锚不改规则
  - 文档句：包 AGENTS 的三条旧使用说明

### 9.4 完成后的预期状态

1. 受管对象能在宿主重启后以同一 `sandboxId` 被引用；session 结束不删除它。
2. 对象写只有一个操作文档；断线和超时不会变成取消，也不会再发一次。
3. 沙箱终端 create 不给地址；attach 走 `dnt-ws-v2`；只重启宿主后原执行仍接受新输入。
4. fleet、用量、服务地址都是投影；控制权威仍是台账与 inspect，不是页面缓存。
5. 管理 UI 要么出现在正式宿主槽位上，要么有一条明确的宿主依赖。两种结局都不能伴有假 session。

---

## 10. 收口（Definition of Done = 测试台账全 PASS 映射）

本文件现在是计划，不是执行记录。§10.2 的状态在执行前全部是 `未观察`。不得提前写成 `verified`。

### 10.1 收口硬闸

1. `DNLS03-T31` PASS：重启宿主后的新输入进入原 PTY（Phase 4）。
2. `DNLS03-T40` 与 `DNLS03-T42` PASS：沙箱 wire 无 v1 降级，且 [DNT] local 没被改协议（Phase 5）。
3. `DNLS03-T50` PASS：非相邻端口夹具命中 inspect（Phase 6）。
4. `DNLS03-T61` PASS：stop 后对象行仍在，且旧删行断言不在（Phase 7）。
5. `DNLS03-T70` 的无槽位夹具 PASS 为「宿主依赖」，有槽位夹具若未跑则该项是 `未观察` 而不是成功（Phase 8）。
6. `DNLS03-T80` 与 `DNLS03-T81` PASS，四元组齐全。

### 10.2 收口映射表

| 收口目标 | 工作项 | Test-ID | PASS 证据（四元组） | 状态 |
|----------|--------|---------|---------------------|------|
| 台账原子且可重启 | P1-01 | `DNLS03-T01` | `e32697b`，16:22:30Z，control-registry | 夹具 PASS |
| session 不是物理身份 | P1-02 | `DNLS03-T02` | `e32697b`，16:22:30Z，instances-ensure；最终包回归 §11 | 夹具 PASS |
| 无第二写者胜出 | P1-03 | `DNLS03-T03` | `e32697b`，16:22:30Z，control-registry 跨进程锁 | PASS |
| 不空表认领 | P1-04 | `DNLS03-T04` | `e32697b`，16:22:30Z，损坏/缺账否定 | 内核 PASS；接管入口见 closure |
| 发现不授权 | P2-01 | `DNLS03-T10` | `589c8ea`，16:43:44Z，contract-version | 夹具 PASS |
| 错版本不派发 | P2-02 | `DNLS03-T11` | `589c8ea`，16:44:49Z，contract-version | 夹具 PASS |
| 错误前缀稳定 | P2-03 | `DNLS03-T12` | `589c8ea`，16:43:44Z，error-catalog | 夹具 PASS |
| 无选择不执行 | P2-04 | `DNLS03-T13` | `589c8ea`，16:43:44Z，target-dispatch | 夹具 PASS |
| 绑定 id 未被冒名 | P2-05 | `DNLS03-T14` | `589c8ea`，16:43:44Z，route-scan-coverage | PASS |
| 一笔意图一次派发 | P3-01 | `DNLS03-T20` | `ac025df`，17:02:44Z，lifecycle-operation | 夹具 PASS |
| 断线不是取消 | P3-02 | `DNLS03-T21` | `ac025df`，16:59:33Z，lifecycle-operation / delivery-guard | 夹具 PASS |
| 授权与审计 | P3-03 | `DNLS03-T22` | `ac025df`，16:59:33Z，object-authz；`b3ad7e5` 的 T80 补证 | 核权夹具 PASS；实际多人归属未观察 |
| create 不发地址 | P4-01 | `DNLS03-T30` | `6f84933`，17:38:00Z，term-bridge / terminal-contract | 夹具 PASS |
| 原执行可被新输入推进 | P4-02 | `DNLS03-T31` | `6f84933`，17:38:00Z，term-broker.spike：换宿主进程后验证新输入/原 PID | 本地进程 PASS，非 Apple 实机 |
| attach 不 spawn | P4-03 | `DNLS03-T32` | `6f84933`，17:38:00Z，term-bridge 失联、已结束、异参 | 夹具 PASS |
| 无 v1 降级 | P5-01 | `DNLS03-T40` | `b3ad7e5`，19:07:46Z，t42-sandbox-wire.log | PASS |
| 撤权不杀 PTY | P5-02 | `DNLS03-T41` | `b3ad7e5`，19:07:46Z，term-attach-authz | 夹具 PASS |
| local 协议未改 | P5-03 | `DNLS03-T42` | `b3ad7e5`，19:07:37Z / 19:07:46Z，两份 T42 日志 | 按[业主]勘误范围 PASS |
| 废止端口加一 | P6-01 | `DNLS03-T50` | `3f87460`，18:23:21Z，非相邻端口；`b33a2a8` 补 CDP 18:41:19Z | 回环夹具 PASS |
| 保存不应用 | P6-02 | `DNLS03-T51` | `3f87460`，18:28:54Z，environment-owner / managed-revision | 夹具 PASS |
| 用量不插值 | P6-03 | `DNLS03-T52` | `3f87460`，18:24:20Z，usage-minutes 删一分钟再查 | PASS |
| fleet 不泄露 | P7-01 | `DNLS03-T60` | `b3ad7e5`，19:05:58Z，fleet-projection 逐行、逐 env 撤权及进程字段断言 | 夹具 PASS |
| 只停不删且按对象计额 | P7-02 | `DNLS03-T61` | `b33a2a8`，18:44:54Z，quota-idle / lifecycle.spike | 夹具 PASS |
| UI 不假交付 | P8-01 | `DNLS03-T70` | `b3ad7e5`，19:05:58Z，sandbox-tab.spike 子进程退出 3 | 无槽位分支 PASS；有槽位未观察 |
| 交接不二次 create | P8-02 | `DNLS03-T71` | `b3ad7e5`，19:05:58Z，resource-handoff；19:07:37Z，sandbox-resource | 公开引用与夹具 PASS；真实页签未观察 |
| 文档与版本边界 | P8-03 | `DNLS03-T72` | `b3ad7e5`，19:05:58Z，dnls03-docs | PASS |
| 旅程同切 | Phase 8 | `DNLS03-T80` | `b3ad7e5`，19:05:14Z，dnls03-journey.mega | 包入口夹具 PASS |
| 写者竞态 | P1-03/P7-02 | `DNLS03-T81` | `b33a2a8`，18:44:54Z，registry-race.soak，20 轮 | PASS |

### 10.3 Definition of Done

| 维度 | 完成定义 |
|------|----------|
| 功能 | §3 每一行的收口目标都有对应 Test-ID，且该测试在改写后的代码上为真、在旧语义上为假 |
| 测试 | §8 全表 PASS；硬闸六条的四元组齐全；§8.5 的 G1–G14 无一条成立 |
| 文档 | 包 AGENTS 三条旧句已改；QNA 与真相层规则句无 diff |
| 风险收敛 | 宿主页签依赖被显式记录；没有 v1 降级、没有假 session、没有删卷 API |
| 可交付性 | 夹具测试可在无 Apple CLI 的环境跑完；本文件仍不构成发布或 tag 的授权 |

### 10.4 NOT-成功识别

任一硬闸为 `degraded` 或 `未观察`，本计划不得标 `executed`。特别地：

- `npm test` 为 0，但 G1 或 G2 的旧断言还在：不是成功。
- 管理页没做，也没有宿主依赖记录：不是成功。
- 只对齐了屏幕：`DNLS03-T31` 不是成功。
- Case 2/4 出现在本期路由里：不是成功，是越界。

---

## 11. 执行日志回填

执行日为 2026-11-19，§10.2 的时点均为 UTC。状态为 `executing / No-Go`，不是 `executed`。逐 Phase 命令、提交及观察值见[工作台账](todo.DNLS03.md)，审查裁定见[closure](../closure/DNLS03-closure.md)。

| 工作项 | 实际落点 | 命令或观察 | 结果 |
|---|---|---|---|
| P0–P1 | 文件测量、`control-registry.js` | `ba55bf7` / `e32697b`；第二进程抢锁、退出重开、解绑后读取 | 已证实持久内核；未操作已有环境 |
| P2–P3 | `managed-routes.js`、`lifecycle-operations.js` | `589c8ea` / `ac025df`；合同配对、单目标、写者/审计、未决态 | 台账先于后端派发；当时尚未启用宿主入口 |
| P4–P5 | broker、WS、[DNT] 消费点 | `6f84933` / `b7f3d34`；两个不同宿主进程复用原 shell；v1 拒绝、断开后不补发 | 真实本地 PTY；不是已部署镜像 |
| P6–P7 | profile、分钟库、fleet、idle | `3f87460` / `b33a2a8`；非相邻桥、修订不应用、缺采样、20 轮竞态 | 配方最终记录以当前 `profile.yaml` 为准；无持续空闲证明即不自动停 |
| P8 公开入口及消费 | `b3ad7e5`，包 `index.js` 与两个已构建 client | 从 `apply` 注册路由，经回环 HTTP 查同一操作、对象与服务，取终端引用后另发 attach；共享 owner 否定分支 | 正式包入口夹具 PASS；不代表 [dsh] Loader、浏览器或 Apple 实机验证 |
| 审查复核 | 三路 PROMPT、报告与两份 T42 日志 | 首次包全量 432 pass / 6 fail：目录映射 1、缺 operations 的旧行夹具 4、pack 清单 1；T80 暴露了 route 注册与 broker 夹具问题 | 已修复并复测；完整 [DNLS] 433/433、[DNK] 51/51、[DNT] 定向 33/33、沙箱 wire 定向 20/20，均无跳过 |

**偏差与阻塞**：审查在 Phase 8 工作树先行，以便在公开面同一提交里修复。rc.5 的正式右栏 API 需要 session；无会话管理页不交付。默认宿主共享 owner 不足以授权个人终端；已有容器的登记内核不是面向操作者的接管入口。以上不以假 session、fixture 授权、临时密钥或部署覆盖。没有发版、合并、push 或 PR 状态结论。

**2026-11-20 开发站补测**：已按[业主]指令物理清除旧开发容器及其数据，切换真实 `dsh-dev.local`。已有 session 的右栏总览/控制、实机创建与启停、[DNK] 浏览和 [DNT] local PTY 均有现场证据。现场发现并修复详情刷新及 390px 操作可达性问题，重新打包部署后以同一对象复验。见 [todo §6：对象、回执及包摘要](todo.DNLS03.md)；不改变个人终端主体与无 session 槽位的宿主边界。

**原生工作台重做**：`fe1af79` 隔离后端观察与控制；`505871f` 重建正式槽位中的管理页；`7174b44`、`266bbda` 修正派生包、确认文案及长日志窄屏显示。最终候选已在真实 web profile 安装。按[本轮台账](todo.DNLS03-control-redesign.md)分别查首次实机写操作回执、最后一次复装后的验证、截图与未验动作。未把模态框演示作为对象重建或退役证明。

---

# DNLS03 补充计划 · W1 / W2 / W3（S1–S6）

> 服务业务簇: `dsh-nano-local-sandbox` / `[DNLS]`，同切只触及 [DNK]、[DNT]、`packages/dsh-nano-ui` 上被本册点名的面
> 计划对象: `DNLS03` 补充阶段（仍是 `DNLS03`，不另立阶段名，不另立计划文件）
> 类型: `upgrade`
> 作者: `DNLS03-extra 执行文档 agent（lead）`
> 时间: `2026-11-20`
> 文件位置: 本文件文末。`T-O-55` 禁止另立计划文件，因此不写 `plan/DNLS03-extra.md`
> 上游前序 / closure:
> - [`qna/DNLS03-extra-qna-truth.md`](../qna/DNLS03-extra-qna-truth.md) `FROZEN`（`T-O-55`–`T-O-71`；`NOT IMPLEMENTATION GRANT`）
> - [`qna/DNLS03-extra-qna.md`](../qna/DNLS03-extra-qna.md) 是 decision provenance
> - 上文 P0–P8 已按 [`DNLS03-qna-truth.md`](../qna/DNLS03-qna-truth.md) 执行到 `b3ad7e5` 的 No-Go；本补充计划不改写那些记录
> - [`closure/DNLS03-closure.md`](../closure/DNLS03-closure.md) 继续是唯一终判；S1 只换文首横幅，§0 留到 S6 之后一次改
> 下游交接:
> - [`todo.DNLS03.md`](todo.DNLS03.md) 在 S1 新增「补充阶段 S1–S6」，作为唯一执行跟踪
> - `ImplementationGrant` 另立。本计划不是 grant
> 关联设计 / 调研文档:
> - [`todo.DNLS03-control-redesign.md`](todo.DNLS03-control-redesign.md)（P2/P4 行将迁入补充阶段；旧行原文不改）
> - [`docs/specs/dsh-nano-ui/DESIGN.md`](../../dsh-nano-ui/DESIGN.md) §6、§10
> 冻结决策来源:
> - [`qna/DNLS03-extra-qna-truth.md`](../qna/DNLS03-extra-qna-truth.md) §1–§2 与 §4.4（只读 CITE；本计划不开 Q/A）
> grounding 来源:
> - 本补充计划 §7。测量提交 `3e7a775`（与问答取证快照相同）。宿主 pin `0.2.2-rc.5@9c2670d3`。行号漂移以「路径 + 符号名」为准
> 关联 reference-anchor:
> - 无独立 eval-reference-anchor。§7 是本补充计划的 grounding 真源
> 对抗审查（已回写，未改问答与真相层）:
> - [`.anote/reviews/dsh-nano-local-sandbox/DNLS03-extra/na/6281/qna-compliance.md`](../../../../.anote/reviews/dsh-nano-local-sandbox/DNLS03-extra/na/6281/qna-compliance.md)
> - [`.anote/reviews/dsh-nano-local-sandbox/DNLS03-extra/na/6281/exit-and-antigreen.md`](../../../../.anote/reviews/dsh-nano-local-sandbox/DNLS03-extra/na/6281/exit-and-antigreen.md)
> 文档状态: `reviewed`

---

## 0. 执行背景与目标

[业主] 已冻结 `DNLS03-extra`：在已有 `DNLS03` 上补三件事。W1 是 [DNT] 在 [DNLS] 里的实际对接。W2 是 [DNK] 未尽项的收口与真机。W3 是管理页，以及在 `dsh-dev` 上的双操作者真机。顺序已经关闭：S1 合同与代码，S2 一次构建，S3 一次清场，S4 一次完整真机，S5 只复跑失败行，S6 只切生产 web。桌面推迟，不是 OPEN。

本计划只排落点、顺序和可证伪测试。现场授权只存在于问答的 `T-O-65` 与 `T-O-70`，引用本计划不再签发一次。`FROZEN` 不表示代码已改、镜像已换、清场已做或生产已切。

测量 HEAD `3e7a775` 仍是旧行为：浏览器 `owner` 对 `terminal.*` 一律 `canUse=false`（`object-authz.js:49-57`）；[DNLS] 仍 `openTab('kitesurf')` 且用私有 kind `'dnt-sandbox-terminal'`（`index.jsx:835-838`）；`/res` 仍注册（`routes.js:39`）；外壳仍从 nano-ui 引出（`packages/dsh-nano-ui/index.js:18`）。这些是要替换的缺口，不是可以保持绿灯的合同。

- **服务业务簇**：`[DNLS]`；同切面是 [DNK] 的页签、skill、旧脚本，[DNT] 不改协议、只被公开资源交接消费，nano-ui 只删除被点名的外壳导出
- **计划对象**：`DNLS03` 补充阶段 S1–S6
- **本次计划解决的问题**：
  - 共享浏览器身份被当成「终端不可用」的终态，owner 无法持有自己的沙箱终端
  - [DNLS] 与 [DNK]、[DNT] 仍用私有 kind 交接，引用页签还能被读成可切换对象
  - `/res`、旧 e2e 脚本、nano-ui 外壳和管理页设计裁决还散在过渡态里
- **本次计划的直接产出**：
  - S1 的代码、测试、收口台账初值与指针（不部署）
  - S2–S5 在 `dsh-dev` 上的一次构建、一次清场、一次真机与失败行复跑
  - S6 对 `~/.dsh` web 的同批切换，以及之后在 main 上的日志、终判和删树
- **本计划不重新讨论的设计结论**：
  - 顺序是 S1–S6，不由实现方便重排（`T-O-65` / `T-O-70`，读法 R-3）
  - `/res` 彻底退役，不改成宿主准入路由（`T-O-66`，读法 R-4）
  - 引用页签锁定对象，不提供换对象（`T-O-67`，读法 R-5）
  - 打开的接管拒绝在 [DNLS] 分派器，不在桥上；HTTP `/open` 不受接管约束（读法 R-11）
  - 本文不是 grant（真相层 §0 第 6 条）

---

## 1. 执行综述

### 1.1 总体执行方式

六个阶段按已冻结顺序串行。S1 内部先把 main 并入并重建账本，再改代码：写闸先于四个工具，公开引用先于页签锁定，打开内核与 `/res` 删除先于失败体收口。S1 结束不部署。S2 只构建一次。S3 只清场一次并只建一个对象。S4 按 W1 → W2 → W3 走完双操作者场景并取 8 张截图。S5 只复跑失败行。P2 通过且 S5 完成后，才把分支合入 main，再执行 S6。

### 1.2 Phase 总览

| Phase | 名称 | 规模 | 目标摘要 | 依赖前序 |
|------|------|------|----------|----------|
| S1 | 合同与代码 | XL | 并入 main；落 `T-O-59`–`T-O-64`、`T-O-66`–`T-O-69`、`T-O-62` 的删除与台账初值；三包测试绿；不部署 | 上文 P0–P8 的已冻结合同 |
| S2 | 一次构建 | S | 经宿主 confine 构建一次镜像和三包，记下 digest 与 SHA-256 | S1 |
| S3 | 一次清场 | M | 删除两个点名对象和精确卷，只建一个新对象 | S2 |
| S4 | 一次完整真机 | L | W1 → W2 → W3；8 张截图；模型消息按场景清单计数 | S3 |
| S5 | 失败行复跑 | M | 只复跑失败行与受影响行；P2 返工只改 [DNLS] client | S4 |
| S6 | 生产 web 切换与收口 | L | 合入 main 后按 `T-O-70` 六步切换；回填后删工作树 | S5 且 P2 已由 [业主] 通过 |

> 规模只帮助阅读，不是开工闸。阶段名只用 S1–S6，不另起一套 Phase 编号。

### 1.3 Phase 说明

1. **S1 — 合同与代码**
   - **核心目标**：在不部署的前提下，把补充合同落到代码、单测和台账初值。
   - **为什么先做**：镜像、清场和真机都消费这份代码。先部署再改，会把证据混到旧代次上。
2. **S2 — 一次构建**
   - **核心目标**：留下将要安装的那一份镜像 digest 和三包 SHA-256。
   - **为什么放在这里**：桥在镜像配方里。S1 改了 `mcp-bridge.mjs` 之后只能换一次代。
3. **S3 — 一次清场**
   - **核心目标**：开发站 `kitesurf` 只剩一个从新镜像创建的对象。
   - **为什么放在这里**：两个旧对象占满名额。不先清场就不能新建，也不能复用旧卷冒充干净创建。
4. **S4 — 一次完整真机**
   - **核心目标**：同一制品、同一新对象上，用户手势与 session 内 agent 分开取证，并交出 8 张截图。
   - **为什么放在这里**：场景依赖新对象和新代次。e2e 通过不代替 [业主] 的设计通过。
5. **S5 — 失败行复跑**
   - **核心目标**：修失败行，在同一对象上复跑受影响行。
   - **为什么放在这里**：完整重放只跑一次。再换镜像也只在同一对象上换代，不再清场。
6. **S6 — 生产 web 切换与收口**
   - **核心目标**：main 上的制品与 S5 最终候选 SHA 一致后，只切 `~/.dsh` web；然后回填并删树。
   - **为什么放在这里**：生产切换用的必须是已经合入 main、并且 SHA 对得上的那一份。

### 1.4 执行策略说明

- **执行顺序原则**：S1 开头 `git merge --no-ff main` 一次。冲突只应出现在三个账本文件，用仓内脚本重建，不手改。不用 rebase。S5 与 P2 通过之后，才用 `merge(dnls): …` 把分支 `--no-ff` 合入 main。两处方向相反，不能对调。
- **风险控制原则**：S1 对开发站只读。超出 `T-O-65` 五类或 `T-O-70` 六类的动作停下来另请 [业主]。模型消息一次完整重放不超过 20 条，S5 同一上限。本计划清单至多 6 条（A1、A2、A3 各 1 条任务、至多 1 条追问），不自行加码，也不把 20 条上限提高。
- **测试推进原则**：S1 用短途单测关闭内部行为。用户或 agent 可见的行为只在 S4 取证。软件回归与真机证据分开登记。夹具主体的通过不是 W1 通过。
- **文档同步原则**：过程只写 todo 补充阶段。终判只在 S6 之后改 closure §0。合同仍在问答 §1。七份旧文档和 redesign todo 只加指针，不回改正文。
- **回滚 / 降级原则**：S6 失败时用切换前复制的旧三包目录重装并重启。不保留旧对象数据，也不删镜像。桌面不在本期回滚或切换的范围内。

### 1.5 本次 action-plan 影响结构图

```text
DNLS03 补充阶段
├── S1 合同与代码
│   ├── 分支并入 main，三个 security 账本只经脚本重建
│   ├── [DNLS] 终端主体、公开资源、/res 删除、失败投影、四个工具的分派器
│   ├── [DNK] 页签 patterns、轮询、skill、失败展示、旧脚本删除
│   ├── nano-ui 外壳退回 [DNLS] client
│   └── todo 补充阶段、七份旧文档指针、closure 文首一行
├── S2 一次构建
│   └── confine → 镜像 digest + 三包 tarball SHA-256
├── S3 一次清场
│   └── 两个点名对象与精确卷 → 一个新对象
├── S4 一次完整真机
│   ├── W1 辨真（只重启 [dsh]）
│   ├── W2 引用页签与 agent 写闸
│   └── W3 管理页 8 张截图
├── S5 失败行复跑
│   └── 同一对象；P2 返工只重装 [DNLS]
└── S6 生产 web
    ├── 合入 main 后 SHA 比对
    ├── ~/.dsh web 六步
    └── main 上回填 §11、todo、closure §0，然后删工作树与分支
```

---

## 2. In-Scope / Out-of-Scope

### 2.1 In-Scope（本次 action-plan 明确要做）

- **[S1]** 代码与单测：`T-O-59`、`T-O-61`、`T-O-62`、`T-O-63`、`T-O-64`、`T-O-66`、`T-O-67`、`T-O-68`、`T-O-69`，以及收口台账的逐行终态初值（`T-O-60`）
- **[S2]** `dsh-dev` 上一次镜像构建与三包候选（`T-O-65` ①）
- **[S3]** 永久删除 `dnls03-dev`（`7ef19658-39c7-43e7-8dc8-d387a45a9d83`）与 `dnls03-ui-check`（`75bfac14-8cd4-4978-a101-32cb7115d988`）及各自精确卷，然后只建一个新对象（`T-O-65` ②③）
- **[S4]** 一次完整双操作者真机，场景顺序 W1 → W2 → W3；8 张 P2 截图（`T-O-62`、`T-O-69`）
- **[S5]** 失败行与受影响行的复跑；P2 不通过时只改 [DNLS] client 并重取受影响截图
- **[S6]** `~/.dsh` web 的同批切换、只读验收与失败回滚（`T-O-70`）；通过后在 main 上回填并删除工作树（`T-O-71` ⑤ 的后半）

### 2.2 Out-of-Scope（本次 action-plan 明确不做）

- **[O1]** 另立计划文件、另立 closure、另立阶段名
- **[O2]** 桌面 `~/.dsh-desktop` 与容器 `kitesurf-desktop`（K-07，已登记推迟）
- **[O3]** 第二次清场、额外对象、其他 profile、宿主 pin、删任何镜像、生产上创建对象、超过 20 条的模型消息
- **[O4]** 无 session 的正式页签入口；为 API token 客户端另做一套终端身份；把「按对象经沙箱网络取资源」写进本期
- **[O5]** 回改 `DNLS03` / `DNK01` 已冻结真相正文，或把 R 注记写进那些原句
- **[O6]** 新的 error 枚举、lane、路由、release-gate，或把旧脚本改写成新的验收套件

### 2.3 边界判定表

| 项目 | 判定 | 理由 | 重评条件 |
|------|------|------|----------|
| S1–S6 的代码、构建、清场、真机、生产 web | `in-scope` | `T-O-65` 五类与 `T-O-70` 六类已经写在问答里 | 动作超出这两张清单 |
| 桌面 profile | `defer` | `T-O-70` 记为 [业主] 推迟 | 另一次 [业主] 裁决；约束仍是三包同批、状态根先清 |
| 无 session 管理页 | `out-of-scope` | `XB-5`，宿主依赖，不在插件内推断 | 宿主提供不依赖已挂载 session 的正式入口 |
| API token 是否另辨终端 | `defer` | 只有在需要区分时才登记 | 出现必须区分的消费者 |
| 第二个 profile 的 `drivers` 差异 | `out-of-scope` | 仓内今天只有 `kitesurf` 一份清单 | 第二个 profile 进入仓库 |
| Q51 落选的「只做准入的宿主 `/res`」 | `out-of-scope` | 已冻结为不重开 | 不得在实现里换一条路由绕回去 |

### 2.4 `T-O` 与收口读法 CITE（不复制正文）

补充计划 §2 必须点名全部 17 条和 §4.4 的全部读法。下表只写本计划用它约束哪一段，不改口。

| ID | 冻结来源 | 本计划何处消费 | 不成立时 |
|----|----------|----------------|----------|
| `T-O-55` | 真相层 §2.1 | 本文件是 append，不另立文件 | 停，不新建 `DNLS03-extra.md` |
| `T-O-56` | 真相层 §2.1 | S4 才算 W1 完成，夹具不算 | 不得把 S1 绿标成 W1 完成 |
| `T-O-57` | 真相层 §2.1 | DNK01 只追加指针 | 不得改 DNK01 旧真相正文 |
| `T-O-58` | 真相层 §2.1 | 并线事实保持；K-01 原句不改，终态由 `T-O-66` 关闭 | 不得把过渡态写成终态 |
| `T-O-59` | 真相层 §2.2 | S1-03；S4 的 W1 | owner 仍全拒则 S1 不出口 |
| `T-O-60` | 真相层 §2.2 | S1-12 台账初值；可见行的真机在 S4 | 行停在「开放」则 S1 不出口 |
| `T-O-61` | 真相层 §2.2 | S1-06 硬切；未决两点留到 `T-O-67`，不在本条原文里宣布已关闭 | 留下私有 kind 则 S1 不出口 |
| `T-O-62` | 真相层 §2.2 | S1-11 删脚本；S4 场景 | 把旧脚本改写后继续当证据，则该行失败 |
| `T-O-63` | 真相层 §2.3 | S1-04 | 自报名或复制 relay 仍能通过，则 S1 不出口 |
| `T-O-64` | 真相层 §2.3 | S1-05；S4 的 A1/A2 | 工具不经宿主 `tools.register`，或打开拒绝做在桥上 |
| `T-O-65` | 真相层 §2.3 | S1 不部署；S2–S5 只做五类 | 第二次清场、额外对象、生产部署即停 |
| `T-O-66` | 真相层 §2.4 | S1-08 | 留下 `/res` 别名、墓碑路由或代理改写 |
| `T-O-67` | 真相层 §2.4 | S1-07；S4 的 U3 | 引用页签提供换对象，或隐藏页签仍按可见性轮询 |
| `T-O-68` | 真相层 §2.4 | S1-09 | 失败体多出 `incidentId`，或派发前失败带上 `error`/`hint` |
| `T-O-69` | 真相层 §2.5 | S1-10；S4 的 8 张截图 | 外壳留在 nano-ui，或用 e2e 绿代替设计通过 |
| `T-O-70` | 真相层 §2.5 | S6 | SHA 不一致仍切换，或删除镜像 |
| `T-O-71` | 真相层 §2.5 | S1-01、S1-02、S5-03、S6-07 | 合并提交携带问答，或 S6 前删除工作树 |
| R-1 | 真相层 §4.4 | 现场授权同时读 `T-O-65` 与 `T-O-70` | 只读开发站授权就去做生产 |
| R-2 | 真相层 §4.4 | S6 不回写 `T-O-65` 的范围 | 把生产步骤塞进 S1–S5 |
| R-3 | 真相层 §4.4 | 顺序只认 S1–S6 | 用实现顺序替换已关闭的「待裁定」 |
| R-4 | 真相层 §4.4 | K-01 终态是本期实现，原句不改 | 把「仍须裁决」从真相层删掉 |
| R-5 | 真相层 §4.4 | S4 的 U3 按锁定页签写，不按「下拉切换」 | 真机行写成切换对象 |
| R-6 | 真相层 §4.4 | 对照清单沿用参考行；`2ba1d4a` 实测转历史 | 把旧开发站实测当候选 |
| R-7 | 真相层 §4.4 | S6 的 SHA 基准是最后一次复跑的三包 | 比对失败后放宽 |
| R-8 | 真相层 §4.4 | 合并提交只有 main 并入与账本重建 | 把问答打进合并提交 |
| R-9 | 真相层 §4.4 | 合入 main 时不碰主工作区未提交文件 | 路径重叠仍继续 |
| R-10 | 真相层 §4.4 | `incidentId` 留在操作行，经 `/operations` 查 | 为了「保留诊断」把它加回失败体 |
| R-11 | 真相层 §4.4 | S1-05 与 S4 的 A2 | 在桥上拦截宿主类打开 |
| R-12 | 真相层 §4.4 | S6 不删镜像 | 删除 `kitesurf-engine` 或实验镜像 |

---

## 3. 业务工作总表

| 编号 | 所属 Phase | 工作项 | 类型 | 涉及文件（file:line） | 收口目标 | 测试映射 | 风险 |
|------|------------|--------|------|------------------------|----------|----------|------|
| S1-01 | S1 | 并入 main 并重建账本 | update | `security/route-sensitivity.json:1528`、`security/feature-contract.json`、`security/perf-binding-ids.md:79` | 合并提交只含并入与账本重建，检查 0 漂移 | `DNLS03X-T01` | high |
| S1-02 | S1 | 指针、跟踪节、closure 横幅 | update | `plan/todo.DNLS03.md:4`、`plan/todo.DNLS03-control-redesign.md:1`、`closure/DNLS03-closure.md:1,7` | 唯一跟踪节出现；两段横幅都换成一行；旧文档只有文首指针 | `DNLS03X-T02` | medium |
| S1-03 | S1 | owner 持有自己的沙箱终端 | update | `src/host/object-authz.js:49-57`、`AGENTS.md:96`、`test/dnls03-journey.mega.test.mjs:117-123` | 同主体同代次可 create/attach；非 owner kind 仍拒绝 | `DNLS03X-T03` | high |
| S1-04 | S1 | 代次凭据、读白名单、relay 记账 | update | `profiles/kitesurf/mcp-bridge.mjs:731-797,933,1045-1076`、`src/host/backend-apple.js:484-498` | 代次随机凭据认出宿主连接；读白名单放行；`relay.conns` 只计 agent 类 | `DNLS03X-T04` | high |
| S1-05 | S1 | 四个模型工具与打开前拒绝 | add | `index.js:19-35`、`src/host/routes.js:2`、`dsh-nano-kitesurf/lib/skill.js:38` | `tools` inject 后经 `tools.register` 注册；接管中打开在 [DNLS] 分派器被拒；HTTP `/open` 仍可用 | `DNLS03X-T05` | high |
| S1-06 | S1 | 公开对象引用硬切 | refactor | `src/client/index.jsx:393-394,835-838`、`src/host/terminal-resource.js:1-13`、`src/client/i18n.js:102-103` | 不再调用 `kitesurf()` / `openKitesurf` / 私有 kind | `DNLS03X-T06` | high |
| S1-07 | S1 | 一引用一页签、drivers、停止轮询 | update | `dsh-nano-kitesurf/src/client/index.js:608-611,3058`、`profiles/kitesurf/profile.yaml:84-86`、`src/host/fleet-projection.js:222` | 引用页签锁定对象；列表带 `drivers`；隐藏页签不再定时请求 | `DNLS03X-T07` | high |
| S1-08 | S1 | 删除 `/res` 与代理改写 | remove | `src/host/res-proxy.js`、`src/host/routes.js:39,57,1081,1493`、`src/host/dom-srcdoc.js:76-117`、`src/host/error-catalog.js:46-54`、`dsh-nano-kitesurf/src/client/index.js:1533` | 路径不再注册；没有墓碑；HTML 只留真实地址；账本少一行 | `DNLS03X-T08` | high |
| S1-09 | S1 | 失败投影收口 | update | `src/host/object-pages.js:137`、`src/host/routes.js:1126-1128`、`dsh-nano-kitesurf/src/client/index.js:1436-1439` | 至少一例内核失败同时带 `error` 与 `hint`；派发前只有 `errorId`；失败体没有 `incidentId` | `DNLS03X-T09` | high |
| S1-10 | S1 | 外壳退回 [DNLS]，接上三个入口 | migrate | `packages/dsh-nano-ui/src/shell.js:9,103`、`packages/dsh-nano-ui/index.js:18`、`src/client/index.jsx:12,762`、`DESIGN.md:153` | nano-ui 不再导出外壳；U10 条数等于 §10 | `DNLS03X-T10` | high |
| S1-11 | S1 | 旧验收脚本整批删除 | remove | `dsh-nano-kitesurf/package.json:11`、`RELEASE.md:97`、`scripts/gui-smoke-kitesurf.sh` | 四份 `scripts/*.mjs`、`e2e-script.test.mjs`、仓根 smoke 共六条都不在；`test:e2e` 消失；RELEASE 不新增必跑项 | `DNLS03X-T11` | medium |
| S1-12 | S1 | 收口台账终态初值 | update | `plan/todo.DNLS03.md` 新节 | 点名行有终态；普查行逐行复核后不得留「开放」 | `DNLS03X-T12` | medium |
| S1-13 | S1 | S1 出口，仍不部署 | update | 三包 `npm test` 与 `check-*` | 全绿且开发站未被写、未被重启、未发模型消息 | `DNLS03X-T13` | high |
| S2-01 | S2 | 一次镜像与三包 | add | `dsh-nano-local-sandbox/scripts/build-profile.mjs`、`profiles/kitesurf/profile.yaml:10-14` | 记下 digest 与三包 SHA；同一阶段内的失败重试算同一次 | `DNLS03X-T20` | high |
| S3-01 | S3 | 清场两个点名对象 | remove | `todo.DNLS03-control-redesign.md:76-78` | 两个旧 ID 与精确卷都不存在；台账和审计还在 | `DNLS03X-T30` | high |
| S3-02 | S3 | 只建一个新对象 | add | 同上清场顺序的最后两步 | 该 profile 只剩一个受管对象卷，ID 不是那两个旧 UUID | `DNLS03X-T31` | high |
| S4-01 | S4 | 安装核对与场景重放 | update | `.anote/reviews/dsh-nano-local-sandbox/DNLS03/` | 加载字节与 tarball 一致；场景按清单走完；模型消息 ≤ 20 | `DNLS03X-T40` | high |
| S4-02 | S4 | 八张设计截图 | add | 同上目录，`p2-*.png` | 八张文件名齐，且每张标明参考行与 client SHA | `DNLS03X-T41` | medium |
| S5-01 | S5 | 只复跑失败行 | update | S4 失败的 todo 行 | 不第二次清场；需要换镜像时只在同一对象换代 | `DNLS03X-T50` | high |
| S5-02 | S5 | P2 返工 | update | `src/client/` | 只重装 [DNLS]、只重启开发 Web；不换镜像、不发与返工无关的模型消息 | `DNLS03X-T51` | medium |
| S5-03 | S5 | 合入 main | migrate | 主工作区；不覆盖未提交文件 | main 上三包测试与 `check-*` 绿；按合并提交重建的 SHA 与 S5 最后一次复跑比对，不一致即停 | `DNLS03X-T52` | high |
| S6-01 | S6 | 生产 web 六步 | migrate | `~/.dsh/plugins/`、`~/.dsh/nano-local-sandbox/state/kitesurf/` | SHA 一致才切换；失败则旧三包重装；不删镜像 | `DNLS03X-T60` | high |
| S6-02 | S6 | 回填并删除工作树 | remove | 本计划 §11、`todo.DNLS03.md`、`closure/DNLS03-closure.md` §0 | 三处一次写完后才删 `.agents/worktrees/dnls03-managed-sandbox-control` | `DNLS03X-T61` | high |

---

## 4. Phase 业务表格

### 4.1 S1 — 合同与代码

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| S1-01 | 并入 main | a) 在本工作树 `git merge --no-ff main` 一次。b) 冲突只处理 `security/route-sensitivity.json`、`security/feature-contract.json`、`security/perf-binding-ids.md`。c) 用 `check-route-sensitivity` 与 `check-feature-contract` 的生成路径重建，不手改。d) 三包 `npm test` 全绿后才继续改产品代码。e) 这一笔提交不含问答、不含本补充计划。 | 三个账本；`security/route-sensitivity.json:1528` 在删除 `/res` 之前仍有 `dnls.res` | 合并提交可被认出只有并入和账本 | `DNLS03X-T01` | 0 漂移；无 rebase |
| S1-02 | 跟踪与指针 | a) `todo.DNLS03.md` 增加「补充阶段 S1–S6」，`todo.DNLS03.md:4` 的「当前追踪」改指这一节。b) redesign todo 文首加冻结指针，P2/P4 行抄入新节，旧行不改。c) closure `:1` 与 `:7` 两段横幅都换成一行「补充阶段进行中，见 todo 补充阶段一节」。不改 §0。d) 七份旧文档文首各加一行，指向问答 `DNLS03-extra-qna.md` §1 与收口台账。e) DNK01 状态行与部署快照各追加一行，只列 `T-O-63`、`T-O-64`、`T-O-66`、`T-O-68`。 | `plan/todo.DNLS03.md:4,126`；`closure/DNLS03-closure.md:1,7`；`docs/specs/dsh-nano-kitesurf/` 下 `1119-delivery-gaps.md`、`1119-loop3-closure.md`、`1119-local-dev-review.md`、`design-mode-feedback.md`、`ego-vs-dnk-gap-analysis.md`、`final-eval.md`、`e2e/DNK01-1120-e2e.md`；DNK01 台账状态行与部署快照 | 读者只在 todo 看过程 | `DNLS03X-T02` | 旧正文无行为改写；第二段横幅也不留 |
| S1-03 | 终端主体 | a) `resolveOwnerPrincipal` 不再对全部 `terminal.*` 返回 false。b) 允许的条件只是 `principalKey` 为 `owner` 且代次匹配，不是通配。c) 非 owner kind 仍拒绝。d) 改 `AGENTS.md:96`：owner 可以通过，并写明两个浏览器标签不是跨用户证明。e) 改 journey：夹具 owner 的 403 断言改为同代次允许；另保留一条非 owner 拒绝。f) 终端坞在拒绝时仍是一行静默文案，不为此加新入口。 | `object-authz.js:49-57,110`；`AGENTS.md:96`；`i18n.js:329`；`dnls03-journey.mega.test.mjs:117-123` | create 不发 URL；attach 才发 locator；重启 [dsh] 不换 terminalId | `DNLS03X-T03` | 单测分清 owner 与非 owner |
| S1-04 | 写闸 | a) 每一代次生成随机凭据。投放走与 `publishHealth` 相同的 `container exec`（root、stdin、`env -i`），凭据不是 health 文档本身。b) 握手出示当前代次凭据才是宿主类；自报 `clientInfo.name`、缺省 `'human'`、复制出去的 relay 地址都不算。c) 接管中宿主类写成功；agent 类写以 `kitesurf.control.held` 拒绝，先记 `lastAction`，不更新 `lastAt`。读白名单仍放行。d) `controlSnapshot` 增加 `relay: {conns,lastAt,lastMethod}`，只计 agent 类。e) 凭据不出现在任何响应、台账、审计、日志、截图或 skill。换代后旧凭据失效。投放失败则对象页不连 relay，沿用 503。f) agent 类 `takeover` 回 `kitesurf.control.query`；无凭据 `POST /control` 回 403。不新增 errorId。`:79` 的 `originAllowed` 不改，不用它代替凭据。 | `mcp-bridge.mjs:731-797,933,1045-1076`；`backend-apple.js:484-498` | 一律拒写不能通过；pane 的写不走「接管期间一律拒写」 | `DNLS03X-T04` | 攻击用例见 §8.5；缺任一条不得 PASS |
| S1-05 | 四个工具 | a) 在 `index.js:19` 的 `inject` 增加 `tools`，再 `tools.register` 四个工具（列表、状态、打开、接管状态）。不另开通道，不改成 `commands`。b) 主体只走 `T-O-59` 的组合层适配器，不从参数推断。对象工具必须带显式 `sandboxId`。结果经同一 `redact`。c) 打开与 HTTP、`/mcp` 共用 `routes.js:2` 的打开内核。d) 模型工具和 `/mcp` 由 [DNLS] 分派器在调用内核之前读 `humanHold`；active 则以既有 `kitesurf.control.held` 拒绝，属派发前失败，只有 `errorId`。不在桥上做这道拒绝。`mcp-bridge.mjs:933` 只留给 S1-04 的写闸。e) 读 `humanHold` 失败走既有 `control.bridge`。HTTP `/open` 不读这个闸。f) 不可见与不存在的拒绝一致。注册随卸载处置。g) skill 改 `lib/skill.js` 与 `src/skill/`（含 `observability.md:26`），然后构建生成 `skills/`。不手改 `SKILL.md`。Step 0 改为列表 → 用户明确对象 → 状态；只有一个候选也询问。删掉「实例按 session 记录」和 suspend/resume。h) S1 核实不了非 owner 工具限制就登记为宿主依赖。 | `index.js:19-35`；`routes.js:2`；`dsh-nano-kitesurf/lib/skill.js:38,82-83`；`src/skill/kitesurf-cdp/references/observability.md:26` | 缺 `sandboxId`、redact、卸载都有断言；打开拒绝不发生在桥上 | `DNLS03X-T05` | 三个入口的差异都有单测 |
| S1-06 | 公开引用 | a) 删除 `kitesurf()`、`openKitesurf`、`openWorkspaceHint`、`workspaceMissing` 和 `'dnt-sandbox-terminal'` 判断，不留旧分支。b) 新增 `dsh-resource://sandbox/<envId>/<sandboxId>`，校验与 `terminal-resource.js:1-7` 同一组。c) 用 `candidates(address)` 列出打开动作，经 `openResource` 交接。d) [DNK] 注册 `patterns` 与 `canOpen`；body 先 `GET /contract` 再 inspect，失败不改投。e) 原空选择器页保留，不自动选中。f) 页签复用与设计能力两点不在这项里宣布关闭，交给 S1-07。 | `index.jsx:393-394,835-838`；`i18n.js:102-103,319-320`；`terminal-resource.js:1-13`；[DNK] `index.js` 注册处 `3058` 附近 | 地址不编码 URL、session、token | `DNLS03X-T06` | 零、一、多候选和核实失败都有断言 |
| S1-07 | 页签与 drivers | a) 一个引用一个页签，对象锁定，不提供换对象。同一引用再次打开回到原页签。b) 列表行带只读 `drivers`。不含 `cdp` 时显示原因且不发对象请求。c) `tab.visible` 为假时停止 `/status`、`/shot`、`/dom`、`/control` 的定时请求；恢复可见时刷新一次。保留 `keepMounted`。只删掉 `setInterval` 或只改 `document.visibilityState` 不算完成。d) 两个不同引用是两个页签，这条只作软件回归，不填 S4。e) 不新增路由或错误枚举。仓内只有一份 profile，用夹具清单证明不含 `cdp` 的分支。 | `profile.yaml:84-86`；`fleet-projection.js:222`；[DNK] `index.js:608-611,2030-2110,3058` | 切走后不再定时请求 | `DNLS03X-T07` | S4 只取「同一引用复用、空选择器还在、切走后停止请求」 |
| S1-08 | 删除 `/res` | a) 删除 `res-proxy.js` 与 `test/res-proxy.test.mjs`。b) 去掉 `RES_ROUTE`、`serveRes`、`dom-srcdoc.js` 的 `proxy` 与 `rewriteAbsoluteUrls`。c) 去掉 `object-pages.js:9-13` 的例外。d) 删除 `res.*` 九行。e) 烘焙绑定与 perf，账本少 `dnls.res`。不留别名、开关或墓碑路由。f) `/open` 命中已知隧道域时，成功体和失败体都带 hint，不改状态码。g) 删 [DNK] `index.js:1533` 的 `proxied` 推断。`hintUnproxiedHtml` 的中英文案改 `i18n.js:106` 与 `:338`，方向是「看样式用默认的引擎渲染」。h) `src/skill/` 的 `routes.md:19`、`recovery-playbook.md:18` 删去 `/res`，再构建生成 `skills/`。diagnostics 不再写「+ `/res`」。 | `routes.js:39,57,1081,1493`；`dom-srcdoc.js:23,76-117`；`error-catalog.js:46-54`；`lib/bindings.js:40`；`lib/browser-bindings.js:38`；`src/perf/declaration.json:46`；`security/route-sensitivity.json:1528`；`security/perf-binding-ids.md:79`；[DNK] `index.js:1533`；`i18n.js:106,338` | 路径不存在；只断言 `sandbox.provider_unsupported` 不算过 | `DNLS03X-T08` | 隧道 hint 与墓碑都在断言里 |
| S1-09 | 失败体 | a) 至少一例内核失败同时带 `error` 和 `hint`，键只有 `ok`、`errorId`、`error`、`hint`。不承诺每个失败都带 `hint`。b) 超长 `error` 按 240 字截断。c) 另有一例派发前失败只有状态码和 `errorId`，没有 `hint`。d) 失败体没有 `incidentId`；操作行仍有，经 `/operations` 查。e) [DNK] 删除 `engineLog` 死分支、`openErrorLoopback` 和自带 loopback 判断；`hint` 挂到错误对象上。`:1533` 的 `proxied` 归 S1-08，不在这里改。f) 不改成功体。 | `object-pages.js:137`；`routes.js:1122-1128`；[DNK] `index.js:1436-1439` | 只有 `errorId` 的内核失败不算这例通过 | `DNLS03X-T09` | 断言失败体没有 `incidentId` |
| S1-10 | 外壳回迁 | a) 把 `WorkbenchShell`、`StatusDock` 及其同文件外壳从 `shell.js` 移回 [DNLS] client。b) `packages/dsh-nano-ui/index.js:18` 删除这些导出。c) DESIGN §6 删除该行。d) §10 为每处自绘控件登记 `nano-ui-exempt`。e) 已使用宿主 `Button` 的调用不改。f) 管理页接上终端可用行、`candidates` 打开动作和 `drivers`。g) 不改 [DNK] 去凑第二个使用方。 | `shell.js:9,103`；`index.js:18`；`src/client/index.jsx:12,762`；`DESIGN.md:153,210-216` | U10 计数等于 §10 行数 | `DNLS03X-T10` | 候选仍是 `77e217e` 那条外壳线，不是 `2ba1d4a` |
| S1-11 | 删旧脚本 | a) 删除 [DNK] `scripts/e2e-ego.mjs`、`eval-design-mode.mjs`、`eval-ego-vs-dnk.mjs`、`eval-proto-mcp.mjs`。b) 删除 `package.json` 的 `test:e2e` 与 `test/e2e-script.test.mjs`。c) 删除仓根 `scripts/gui-smoke-kitesurf.sh`。d) 改写 `RELEASE.md:97`，不新增必跑项。e) 不留别名。历史文档里的脚本名不回改。 | `dsh-nano-kitesurf/package.json:11`；`RELEASE.md:97` | [DNK] 测试数下降是预期 | `DNLS03X-T11` | `npm test` 不再调用这些文件 |
| S1-12 | 台账初值 | a) 在补充阶段节建表：行、执行方、终态、证据。b) 终态只允许已完成、已作废（引 `T-O`）、本期实现、[业主] 推迟。c) 下表这些行先写入初值。d) 普查里的 `G`/`L`/`V`/`E`/`F`/`X`/`D` 行把旧分类当初值，S1 内逐行复核；S1 出口时不得仍是「开放」。e) 台账不是 release-gate。 | `plan/todo.DNLS03.md` 新节；旧 `/res` 句在 `:126`，由新节取代，旧句不改 | 点名行与复核后的普查行都有终态 | `DNLS03X-T12` | 可见行为的证据栏写「待 S4」，不写成已通过 |
| S1-13 | S1 出口 | a) 三包 `npm test` 全绿，`check-*` 通过。b) 开发站只做了只读探查。c) 问答与本补充计划放在合并提交之后的第一个普通提交。d) 不安装、不重启、不发模型消息。 | 三包测试命令 | S1 完成不等于 W1/W2/W3 完成 | `DNLS03X-T13` | 日志里没有部署记录 |

S1-12 的点名初值（普查行不在这张表里预判）：

| 行 | 终态初值 | 证据留到哪 |
|----|----------|------------|
| `DNK01 T-O-5` | 已作废（`T-O-66`） | S1 单测证明 `/res` 不再注册 |
| `DNK01 T-O-4` 的代理改写两句 | 已作废（`T-O-66`） | 同上；保留句记本期实现 |
| `DNK01 T-O-6` 的 `/res` 与 `res.public-tunnel` | 已作废（`T-O-66`） | `/open` hint 另记本期实现 |
| `DNK01 T-O-1` 的 agent 落点与失败投影 | 本期实现 | S1 单测；可见部分待 S4 |
| `DNK01 T-O-2/3` | 本期实现 | S1-04 单测；真机待 S4 |
| K-01、K-04 | 本期实现 | S1-08；隧道 hint 的真机在 S4 |
| K-02 | 本期实现 | 与 `DNK01 T-O-1` 的 agent 打开是同一落点：S1-05，真机在 S4 的 A1 |
| K-03 | 本期实现 | 证据在 S2，S1 只登记执行方 |
| K-05 | 本期实现 | S1-09；真机 hint 待 S4 |
| K-06 | 本期实现 | 证据只在 S4 |
| K-07 web | 本期实现 | 证据只在 S6 |
| K-07 桌面 | [业主] 推迟 | 不执行 |

### 4.2 S2 — 一次构建

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| S2-01 | 一次构建 | a) 只经 `ctx.sandbox.confine` 调用 `scripts/build-profile.mjs`。b) 没有 `ctx.sandbox` 就失败，不改成裸 spawn。c) 记录镜像 digest 与三包 tarball 的 SHA-256。d) 同一阶段里为了修好构建失败而重建，仍算这一次授权。e) 不创建对象，不清场。 | `AGENTS.md:106`；`scripts/build-profile.mjs`；`profile.yaml:10-14` | todo 里有 digest 和三个 SHA | `DNLS03X-T20` | 找不到第二次独立授权的构建 |

### 4.3 S3 — 一次清场

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| S3-01 | 删除两个对象 | a) 核对绑定和挂载，确认就是这两个 UUID。b) 逐个受管退役，并证实容器不存在。c) 永久删除各自精确卷目录，不备份、不迁移。d) 环境控制台账和审计不删。e) 任一步没证实就停，不记已清场。 | redesign todo `:76-78`；状态根 `~/.dsh-dev/nano-local-sandbox/state/kitesurf/` | 两个旧卷都不在 | `DNLS03X-T30` | 停在半截时 todo 写「未清场」 |
| S3-02 | 新建一个 | a) 只用 S2 的镜像创建一个对象。b) 核对新 ID、新卷、挂载，三者缺一即停，不记已新建。c) 该 profile 只剩这一个受管对象卷，卷路径不是两个旧目录。d) 保卷 `recreate` 不算这一步。 | redesign todo `:78` 末两步 | 新 ID 不等于两个旧 UUID，且卷是新目录 | `DNLS03X-T31` | 半截或保卷重建不得 PASS |

### 4.4 S4 — 一次完整真机

场景按 W1 → W2 → W3。用户手势走 ego-browser。agent 行只给任务和对象名，不提示绕过方法。证据只记操作号、截图名、session 标识和结论。

| 场景 | 操作者 | 模型消息 | 做什么 | 怎样才算过 | 映射 |
|------|--------|----------|--------|------------|------|
| U1 | ego | 0 | 选中新对象，创建终端，attach，看见原任务；只重启 [dsh]；新输入仍推进同一任务 | terminalId 不变，任务还在 | `DNLS03X-T40` |
| U2 | 软件回归，不进真机 | 0 | 非 owner kind 被拒 | 不把两个浏览器标签记成跨用户证明 | `DNLS03X-T03` |
| U3 | ego | 0 | 工作台选中对象 → 在 Kitesurf 中打开 → 显示该对象 → 再次打开回到原页签；空选择器页签还在；切走后停止请求 | 引用页签没有换对象控件；切走后不再定时请求 | `DNLS03X-T40` |
| U4 | ego | 0 | 真实 session 上做一次操作并看到回执；390 上核对文字、操作、焦点、状态。桌面不跑 | 看过页面不算 P4；要有操作号和回执 | `DNLS03X-T40` |
| U5 | ego | 0 | 未接管时，pane 打开容器内不可达的 localhost | 记下 hint 原文，留给 A3 对照。不拿 A2 的 `errorId` 当 hint | `DNLS03X-T40` |
| U8 | ego | 0 | 打开 HTML 模式开关 | 仍是静态投影，子资源是真实地址 | `DNLS03X-T40` |
| U9 | ego | 0 | 打开已知隧道域 | hint 出现，状态码不变 | `DNLS03X-T40` |
| U6 | ego | 0 | 核对页面实际加载的 client 字节 | SHA-256 与安装 tarball 一致，不是安装命令退出码 0 | `DNLS03X-T40` |
| A1 | agent | 1 条任务，至多 1 条追问 | 任务不点名对象。先列表，只有一个对象也询问，用户指明后再打开并经 relay 只写该对象 | 请求带 `sandboxId`；询问发生过 | `DNLS03X-T40` |
| A2 | agent，接管由 ego 先按下 | 1 条任务，至多 1 条追问 | 接管期间让 agent 写和打开 | 打开工具在分派器被拒，体里只有 `errorId`；同一次接管里 pane 的 HTTP `/open` 仍可打开。这不是 hint 证据 | `DNLS03X-T40` |
| A3 | agent，未接管 | 1 条任务，至多 1 条追问 | 打开与 U5 相同的不可达 localhost | pane 与 agent 的 hint 文本相同 | `DNLS03X-T40` |
| U7 | ego | 0 | 八张截图：总览深色、总览浅色、对象监控、服务与终端坞、设置弹窗、最近操作回执、390 总览、390 设置 | 文件名 `p2-<视图>-<dark\|light\|390>.png`，每张有参考行和 client SHA | `DNLS03X-T41` |

计划内模型消息至多 6 条：A1、A2、A3 各 1 条任务、至多 1 条追问。上限仍是 20，不提高。U8、U9 是用户手势，计 0。清单如果在执行前被加长到明显超过 20，先写进本计划的修订并请 [业主] 批准，执行者不得自行加码。

对照清单（R-6，随 P2 行迁入 todo）：redesign todo 的 `02.png`、`01.jpg`，加上 [业主] 指定的 `cli-interface.jpg`、`context-mgmt.png`、`model-selection.jpg`、`.temp/01.png`，再加补登的 `03.png`。原图仍只在主工作区 `.temp/`，不入库。「当前开发站：`2ba1d4a`」的实测和旧 SHA 转为历史。

| 编号 | 工作项 | 工作内容 | 涉及文件 | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|----------|----------|----------|----------|
| S4-01 | 重放 | a) 安装 S2 的候选并核对加载字节。b) 按上表执行。c) 每一条真机行各自要有「通过」结论，带操作号、对象 ID 或截图名、session 标识、UTC。失败或未做的行保持未通过，不用整表的一个状态涂绿。d) 夹具、`npm test`、文件在磁盘上，都不能填这些行。e) 失败即该行失败，不改 skill 迁就。f) 重启开发 Web 只在场景需要时做，计入 `T-O-65` ④。 | `.anote/reviews/dsh-nano-local-sandbox/DNLS03/` | 真机行各自通过；消息计数 ≤ 20 且与上表一致 | `DNLS03X-T40` | 消息计数写在 todo |
| S4-02 | 截图 | a) 同一对象、同一 SHA。b) 八张文件名齐。c) 不截会话内容。d) [业主] 的设计结论只写在 P2 行。 | 同上 | e2e 绿不等于设计通过 | `DNLS03X-T41` | P2 行在 [业主] 看过之前保持未通过 |

### 4.5 S5 — 失败行复跑

| 编号 | 工作项 | 工作内容 | 涉及文件 | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|----------|----------|----------|----------|
| S5-01 | 复跑 | a) 只修失败行和被修复碰到的行。b) 不再清场。c) 要换镜像就在 S3 的那个对象上换代。d) agent 行若复跑，仍受 20 条上限，不与 S4 共用一个计数池，而是另一次完整重放自己的上限。 | 失败行的代码与 todo | 未失败的行不重跑来刷绿 | `DNLS03X-T50` | 没有第二个新对象 |
| S5-02 | 设计返工 | a) 只改 [DNLS] client。b) 重装 [DNLS]，重启开发 Web。c) 只重取受影响截图和受影响的 W3 行。d) 与 agent 无关的返工不发模型消息。e) 轮次不设上限，每轮仍由 [业主] 裁决，不扩大授权。 | `dsh-nano-local-sandbox/src/client/` | P2 行只有一处结论 | `DNLS03X-T51` | 镜像 digest 不变 |
| S5-03 | 合入 main | a) P2 已通过且 S5 已完成。b) 分支 `--no-ff` 合入 main，提交信息 `merge(dnls): …`。c) 路径与主工作区未提交改动重叠则停。d) 不覆盖、不暂存、不清理 `docs/specs/dsh-nano-3d-factory/` 与 `model-selector-fusion-v1`。e) 在 main 上跑三包测试和 `check-*`。f) 按合并提交重建三包，与 S5 最后一次复跑的三包 SHA 逐一比对。不一致即停。不得把这次重建的 SHA 写回基准再比。 | 主工作区 | 比对通过才可进入 S6；基准仍是 S5 复跑 | `DNLS03X-T52` | 工作树还在，留到 S6 之后 |

### 4.6 S6 — 生产 web 与收口

| 编号 | 工作项 | 工作内容 | 涉及文件 | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|----------|----------|----------|----------|
| S6-01 | 六步切换 | a) 使用 S5-03 已经比对通过的那一次重建结果，不再单独重建，也不把新 SHA 写成基准。不一致则不得 `plugin add`。b) 把 `~/.dsh/plugins/` 下三包目录复制到该目录之外，作为唯一回滚来源。五项只读验收都通过之后才删除这份留存。c) 删除容器前核对 ID、镜像、挂载。然后停止并删除容器 `kitesurf`，永久删除 `~/.dsh/nano-local-sandbox/state/kitesurf/`，确认状态根没有其他条目。`term.audit` 仍在。d) 一次 `dsh plugin --profile web add` 三个 tarball，重启生产 Web 一次。e) 只读验收：依赖与 bundles 含三包；`/contract` 头和正文都是 `dnls.control/1`；三份 client 字节一致；已挂载 session 的右栏有「沙箱」且总览为空；[DNK] 打开后是空选择器。不在生产创建对象来换一个非空总览。f) 失败则用留存目录重装旧三包并重启。留存已删而验收未完，不得写已切换，也不得写已回滚。g) 不发模型消息，不改 pin，不删任何镜像，不碰桌面和 `kitesurf-lab-*`。 | `~/.dsh`；`RELEASE.md:67` 只作桌面推迟后的未来路径，本期不执行 | K-07 web 记本期实现；桌面仍是推迟 | `DNLS03X-T60` | 镜像仍在；半截删除不得 PASS |
| S6-02 | 回填与删树 | a) 在 main 上一次回填本计划 §12、todo 终态、closure §0。b) 其余 closure 各节保留为 `b3ad7e5` 快照并在节首注明。c) 写完之后删除工作树和分支 `dnls03-managed-sandbox-control`。d) [DNK]、[DNT] 的「前置」各加一行：需要提供 `dnls.control/1` 的 [DNLS]。e) [DNLS]「安装」加一行：同批安装，状态根有旧条目时先清理。这三行不进 RELEASE 必跑项。 | `AGENTS.md`：`dsh-nano-kitesurf/AGENTS.md:39`、`dsh-nano-terminal/AGENTS.md:47`、`dsh-nano-local-sandbox/AGENTS.md:52` | 过程、终判、合同仍各只一处 | `DNLS03X-T61` | 删树发生在回填之后 |

---

## 5. Phase 详情

### 5.1 S1 — 合同与代码

- **Phase 目标**：代码和单测表达已冻结合同，开发站保持不动。
- **本 Phase 对应编号**：`S1-01`–`S1-13`
- **本 Phase 新增文件**：无计划中的新路由文件。公开资源地址加在 `terminal-resource.js` 同模块。四个工具加在现有宿主注册点，不新开插件通道。
- **本 Phase 修改文件**：§4.1 各行。高风险项的顺序是 S1-01 →（S1-04 先于 S1-05）→（S1-06 先于 S1-07）→（S1-05 与 S1-08 先于 S1-09）→ S1-10、S1-03、S1-11 可与前述并行，但都在 S1-13 之前。
- **本 Phase 删除文件**：`src/host/res-proxy.js`、`test/res-proxy.test.mjs`、[DNK] 四个 `scripts/*.mjs`、`dsh-nano-kitesurf/test/e2e-script.test.mjs`、`scripts/gui-smoke-kitesurf.sh`
- **具体功能预期**：
  1. owner 同代次可以 create 与 attach；非 owner kind 被拒；两个标签页不被写成跨用户证明。
  2. 代次凭据认出宿主。接管中宿主类写成功；自报名、缺省 human、复制的 relay 都不能充当凭据。
  3. 接管中，模型工具和 `/mcp` 的打开在分派器失败，只返回 `errorId`；HTTP `/open` 仍打开。
  4. 仓库里搜不到 `openKitesurf`、`'dnt-sandbox-terminal'`、`RES_ROUTE`。
  5. 引用页签没有换对象；隐藏页签不再定时打对象。
  6. 失败体没有 `incidentId`；操作行仍有。
  7. nano-ui 的包入口不再导出 `WorkbenchShell`。
  8. S1 结束时开发站的对象 ID 仍是原来的两个，镜像 digest 仍是 `profile.yaml:10` 的旧值。
- **对应测试台账项**：`DNLS03X-T01`–`DNLS03X-T13`
- **收口标准**：三包测试与检查通过，且日志明确写「未部署」。
- **本 Phase 风险提醒**：journey 里现在的 owner 403 是旧合同。改断言之前先改产品，禁止只改测试让旧拒绝继续存在。

### 5.2 S2 — 一次构建

- **Phase 目标**：得到唯一一份将要安装的制品记录。
- **本 Phase 对应编号**：`S2-01`
- **本 Phase 新增 / 修改 / 删除文件**：不改产品源码来「修记录」。构建失败若要改代码，回到 S1 的同一工作树，再计入同一次构建授权。
- **具体功能预期**：
  1. 命令经过 confine。
  2. todo 有镜像 digest 和三个 SHA-256。
  3. 没有新建 sandbox。
- **对应测试台账项**：`DNLS03X-T20`
- **收口标准**：记录可被 S4 的加载字节核对复用。
- **本 Phase 风险提醒**：裸 spawn 成功不算这次构建。

### 5.3 S3 — 一次清场

- **Phase 目标**：开发站该 profile 只剩一个新对象。
- **本 Phase 对应编号**：`S3-01`、`S3-02`
- **本 Phase 新增 / 修改 / 删除文件**：不改仓库源码。动的是 `dsh-dev` 状态根里的两个精确目录。
- **具体功能预期**：
  1. 删除前核对 UUID。
  2. 容器消失之后才删卷。
  3. 删卷后两个旧路径都不存在。
  4. `registry.json` 和审计文件还在。
  5. 新对象只有一个，卷是新的。
  6. 半截失败不叫已清场。
- **对应测试台账项**：`DNLS03X-T30`、`DNLS03X-T31`
- **收口标准**：todo 写下新 ID，并写明旧 ID 已不在。
- **本 Phase 风险提醒**：保卷重建不是本阶段。公共 `recreate` 的保卷语义不得拿来留测试数据。

### 5.4 S4 — 一次完整真机

- **Phase 目标**：同一制品上分开取得用户证据、agent 证据和设计截图。
- **本 Phase 对应编号**：`S4-01`、`S4-02`
- **本 Phase 新增 / 修改 / 删除文件**：不改代码。失败留到 S5。
- **具体功能预期**：
  1. U1 证明重启的是 [dsh]，不是容器，而且任务还在。
  2. U3 的第二次打开不新建页签，也不出现对象下拉。
  3. A1 先列表再询问，即使用户面前只有一个对象；指明之后才打开，请求里有 `sandboxId`。
  4. A2 的打开拒绝发生在 [DNLS] 分派器，体里只有 `errorId`；pane 的 `/open` 在同一次接管里仍然成功。A2 不是 hint。
  5. U5 与 A3 看到同一句 hint。U8 是静态投影。U9 的隧道 hint 不改状态码。
  6. U4 有一次真实操作和回执。U6 的 SHA 不等于「安装命令退出码 0」。
  7. U7 的八张图在 P2 被 [业主] 看过之前，不算 W3 完成。W3 还要 U4 通过。
  8. 模型消息至多 6 条。上限仍是 20。
- **对应测试台账项**：`DNLS03X-T40`、`DNLS03X-T41`
- **收口标准**：todo 的可见行要么有现场结论，要么明确失败。没有「软件已绿所以跳过」。
- **本 Phase 风险提醒**：S3 只有一个对象。「两个引用、两个页签」只能当软件回归，不能当这轮真机证据。

### 5.5 S5 — 失败行复跑

- **Phase 目标**：把失败行修完，而不再消耗一次清场。
- **本 Phase 对应编号**：`S5-01`–`S5-03`
- **本 Phase 新增 / 修改 / 删除文件**：只改失败行碰到的文件；P2 返工只改 [DNLS] client。
- **具体功能预期**：
  1. 未失败的场景没有被重跑来制造新的通过次数。
  2. 对象 ID 与 S3 相同，除非该项失败本身就是对象创建。
  3. 合入 main 时碰到主工作区脏路径就停。
  4. main 上重建出的 SHA 与 S5 最后一次复跑逐包一致。不一致即停，不把重建结果写成新基准。
  5. 工作树在本阶段结束时还在。
- **对应测试台账项**：`DNLS03X-T50`–`DNLS03X-T52`
- **收口标准**：P2 行已有 [业主] 结论，且 main 上的检查是绿的。
- **本 Phase 风险提醒**：合入方向是分支进入 main。不要再做一次「main 并入分支」来代替它。

### 5.6 S6 — 生产 web 与收口

- **Phase 目标**：生产 web 切到已核对的三包；桌面保持推迟；文档三处各写一次。
- **本 Phase 对应编号**：`S6-01`、`S6-02`
- **本 Phase 新增 / 修改 / 删除文件**：三份 `AGENTS.md` 各加一行；closure §0 一次改写；不改 RELEASE 的必跑项。
- **具体功能预期**：
  1. SHA 不一致时生产目录没有被替换。
  2. 回滚来源在切换成功之后才删除。
  3. 状态根删的是 `kitesurf/`，不是 `term.audit`。
  4. 验收不创建对象，总览是空的。
  5. 失败回滚后，生产回到旧组合，旧对象数据不被声称还能恢复。
  6. 镜像仍在。
  7. §11、todo、closure §0 写完之后，工作树和分支才消失。
- **对应测试台账项**：`DNLS03X-T60`、`DNLS03X-T61`
- **收口标准**：K-07 两行分别是「本期实现」和「[业主] 推迟」。
- **本 Phase 风险提醒**：切换窗口内生产 [DNK] 不可用，这是已接受的代价，不是可以临时混装旧 [DNLS] 的理由。

---

## 6. 依赖的冻结设计决策（只读引用）

本节不新增裁决。影响列只指向 §3 的编号。

| 决策 / Q ID | 冻结来源 | 本计划中的影响 | 若不成立的处理 |
|-------------|----------------|----------------|----------------|
| `T-O-55`–`T-O-71` | [`DNLS03-extra-qna-truth.md`](../qna/DNLS03-extra-qna-truth.md) §1 | §2.4 已逐条 CITE | 任一读法冲突则停工，回到问答，不在本文件改合同 |
| R-1–R-12 | 同文件 §4.4 | S4 场景按 R-5、R-11；S6 按 R-7、R-12；合并按 R-8、R-9 | 不得把注记写回 `T-O-55`、`T-O-58`、`T-O-61` 的原句 |
| `DNLS03 T-O-33`–`T-O-54` | [`DNLS03-qna-truth.md`](../qna/DNLS03-qna-truth.md) | 上文 P0–P8 继续有效；本计划只消费被点名的 append | 不得回改那些正文 |
| `DNK01 T-O-1`–`T-O-6` | DNK01 台账 | 只追加指针；关系以真相层 §4.3 为准 | 不得改 DNK01 旧行 |

---

## 7. 内置 Reference-Anchor 锚区

### 7.1 锚表

| 锚 ID | `path:line` | 落点 | 本 AP 用途 | 处置 | 备注 |
|-------|-------------|------|------------|------|------|
| A-1 | `dsh-nano-local-sandbox/src/host/object-authz.js:49` | `resolveOwnerPrincipal` 拒绝全部 `terminal.*` | S1-03 | ♻️ 重 substrate | 符号留着，谓词改掉 |
| A-2 | `dsh-nano-local-sandbox/AGENTS.md:96` | 终端拒绝句 | S1-03 | ✅ 复用 | 改这一段，不新开一篇说明 |
| A-3 | `dsh-nano-local-sandbox/test/dnls03-journey.mega.test.mjs:117` | 夹具 owner 期望 403 | S1-03 | ♻️ 重 substrate | 旧断言是旧合同，不能留着充绿 |
| A-4 | `dsh-nano-local-sandbox/src/client/index.jsx:835` | `openTab('kitesurf')` 与私有 kind | S1-06 | ♻️ 重 substrate | 函数本身删除，不留兼容分支 |
| A-5 | `dsh-nano-local-sandbox/src/host/terminal-resource.js:1` | env / UUID 校验 | S1-06 | ✅ 复用 | 对象地址用同一组正则 |
| A-6 | `dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:797` | `controlSnapshot` | S1-04 | ✅ 复用 | 加上 `relay` 字段，不另做快照 |
| A-7 | `dsh-nano-local-sandbox/src/host/backend-apple.js:484` | `publishHealth` 的投放模式 | S1-04 | ✅ 复用 | 凭据另生成；只借用同一套 root / stdin / `env -i`。不把 health 文档当成凭据 |
| A-8 | `dsh-nano-local-sandbox/index.js:19` | inject 名单，今天没有 `tools` | S1-05 | ✅ 复用 | 在这一行增加 `tools`，再 `tools.register`。不另开通道，不改成 `commands` |
| A-9 | `dsh-nano-local-sandbox/src/host/routes.js:2` | `OPEN_ROUTE` | S1-05、S1-09 | ✅ 复用 | 打开内核已在；前置拒绝加在分派器 |
| A-10 | `dsh-nano-local-sandbox/src/host/routes.js:39` | `RES_ROUTE` | S1-08 | ♻️ 重 substrate | 删除，不改成别的路径 |
| A-11 | `dsh-nano-local-sandbox/src/host/dom-srcdoc.js:76` | `rewriteAbsoluteUrls` | S1-08 | ♻️ 重 substrate | 只留真实地址一种构建 |
| A-12 | `dsh-nano-local-sandbox/src/host/object-pages.js:137` | 失败体只留 `errorId` | S1-09 | ✅ 复用 | 扩展允许的键，不改成功分支 |
| A-13 | `dsh-nano-local-sandbox/src/host/routes.js:1126` | 内核把 `incidentId` 写进失败体 | S1-09 | ♻️ 重 substrate | 操作行保留，失败体去掉 |
| A-14 | `dsh-nano-kitesurf/src/client/index.js:3058` | `keepMounted: true` | S1-07 | ✅ 复用 | 注册还在；轮询条件要改 |
| A-15 | `dsh-nano-kitesurf/src/client/index.js:608` | 按 `document.visibilityState` 定时 | S1-07 | ♻️ 重 substrate | 隐藏的引用页签停止请求 |
| A-16 | `dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml:84` | `drivers: cdp, mcp` | S1-07 | ✅ 复用 | 清单已有；列表投影还没有这个字段 |
| A-17 | `dsh-nano-local-sandbox/src/host/fleet-projection.js:222` | 列表有 `profileId`，没有 `drivers` | S1-07 | ✅ 复用 | 在这行附近加字段 |
| A-18 | `packages/dsh-nano-ui/index.js:18` | 外壳导出 | S1-10 | ♻️ 重 substrate | 删除导出 |
| A-19 | `packages/dsh-nano-ui/src/shell.js:9` | `WorkbenchShell` | S1-10 | ♻️ 重 substrate | 移回 [DNLS] client |
| A-20 | `docs/specs/dsh-nano-ui/DESIGN.md:153` | §6 外壳行 | S1-10 | ♻️ 重 substrate | 删除该行，豁免改记 §10 |
| A-21 | `dsh-nano-kitesurf/package.json:11` | `test:e2e` | S1-11 | ♻️ 重 substrate | 删除脚本和这条 script |
| A-22 | `RELEASE.md:97` | Kitesurf smoke 必过句 | S1-11 | ✅ 复用 | 改写对应句，不新增必跑项 |
| A-23 | `dsh-nano-kitesurf/lib/skill.js:38` | 「实例按 session 记录」的真源 | S1-05、S1-08 | ♻️ 重 substrate | 同时改 `src/skill/`。`skills/kitesurf-cdp/SKILL.md:32` 由构建生成，不手改。suspend/resume 在 `lib/skill.js:82-83` |
| A-24 | `dsh-nano-local-sandbox/src/host/error-catalog.js:46` | `res.*` 九行 | S1-08 | ♻️ 重 substrate | 整段删除 |
| A-25 | `security/route-sensitivity.json:1528` | `dnls.res` | S1-01、S1-08 | ✅ 复用 | S1-01 先重建；S1-08 再减一行并再次 0 漂移 |
| A-26 | `dsh-nano-kitesurf/AGENTS.md:39` | 「前置」 | S6-02 | ✅ 复用 | 加一行，不改安装步骤的结构 |
| A-27 | `dsh-nano-terminal/AGENTS.md:47` | 「前置」 | S6-02 | ✅ 复用 | 同上 |
| A-28 | `dsh-nano-local-sandbox/AGENTS.md:52` | 「安装」 | S6-02 | ✅ 复用 | 同批安装与旧状态根清理 |

### 7.2 反例 ledger

| ⛔ | 反例 / 陷阱 | 为什么 |
|----|-------------|--------|
| ⛔1 | 用两个浏览器标签证明跨用户 | `T-O-59` 写明这不是跨用户证明 |
| ⛔2 | 在引用页签里做「下拉切到另一对象」 | 那是 Q46 解读里的举例，R-5 已否定 |
| ⛔3 | 在桥上拒绝宿主类打开 | R-11：拒绝在分派器；HTTP `/open` 不受接管约束 |
| ⛔4 | 把 `incidentId` 留在失败体里当诊断 | R-10：它留在操作行 |
| ⛔5 | 保留 `/res` 作墓碑或改成只做准入的宿主路由 | `T-O-66` 彻底删除；那是落选项 |
| ⛔6 | 用夹具主体或 `npm test` 宣布 W1 完成 | `T-O-56`；完成在 S4 的 U1 |
| ⛔7 | e2e 通过就算 P2 通过 | `T-O-69`；设计结论只在 P2 行，由 [业主] 写 |
| ⛔8 | 把外壳留在 nano-ui 以等待第二个使用方 | `T-O-69` 明确不做 |
| ⛔9 | S6 删除 `kitesurf-engine` 镜像 | R-12；生产、桌面、开发共用该镜像族 |
| ⛔10 | 合并提交里带上问答或本计划 | R-8 |
| ⛔11 | 合入 main 时清理主工作区未跟踪文件 | R-9 |
| ⛔12 | 把「共享身份下终端不可用」修成再加一个终端按钮 | 现文案是旧拒绝的 UI；新合同是改主体谓词，不是加入口 |
| ⛔13 | 只改 journey 的期望值、产品仍返回 403 | 假绿。先改 `object-authz.js` |
| ⛔14 | 用 `2ba1d4a` 的旧截图当 P2 候选 | R-6；那些实测转为历史 |

### 7.3 上游真源指针 + 安全项威胁模型

- **独立 reference-anchor**：无。§7.1 就是本补充计划的 grounding。测量提交 `3e7a775`。
- **威胁模型锚**：写闸、打开拒绝、失败体和终端主体都落在已冻结合同里，不另写一份威胁模型文件。执行时对着这些句子做攻击用例，而不是对着幸福路径：
  - 终端：非 owner kind、代次不符、把第二个标签页当成另一个主体（`T-O-59`，锚 A-1）
  - 凭据：自报 `clientInfo.name`、`owner` 缺省 `'human'`、把 relay 地址交给另一个客户端（`T-O-63`，锚 A-6、A-7）
  - 打开：接管中走模型工具、走 `/mcp`、走 HTTP `/open` 三条都要打（R-11，锚 A-9）
  - 失败体：多带一个 `incidentId` 或在派发前塞 `hint`（`T-O-68`，锚 A-12、A-13）
  - 清场与生产删除：删错目录、顺手删镜像（`T-O-65` ②、R-12）

---

## 8. 测试台账

### 8.1 测试清单

| Test-ID | 测试项 | 类型 | 层 | 来源 | 映射 | PASS 证据 |
|---------|--------|------|----|------|------|-----------|
| `DNLS03X-T01` | 合并后三个账本 0 漂移，合并提交不含问答 | 短途 | 契约 | ♻️ 沿用 `check-route-sensitivity`、`check-feature-contract` | S1-01 → 只含并入与重建 | commit + 两条 check 的 0 漂移 + UTC |
| `DNLS03X-T02` | 七份文档与 redesign、DNK01 只有新增指针；closure 文首只剩一行 | 短途 | 回归 | 🆕 `test` 不覆盖文档。人工 diff 只允许文首指针 | S1-02 → 旧正文未被改写 | commit + `git diff -U0` 摘要 + UTC |
| `DNLS03X-T03` | owner 同代次 create/attach 成功；非 owner 拒绝；不断言两个标签页 | 短途 | unit | 🔱 fork `dnls03-journey.mega.test.mjs:117`，反转 owner 期望并加非 owner | S1-03 → 主体谓词 | commit + 该文件 PASS + UTC |
| `DNLS03X-T04` | 宿主类接管中写成功；agent 写被拒且 `lastAt` 不变；自报 human、缺省 human、复制 relay 都不算宿主；无凭据 `POST /control` 为 403；读白名单放行；换代后旧凭据失效；凭据不入响应 | spike | 集成 | 🆕 加在现有 bridge 测试，不新建第二套桥 | S1-04 → 凭据与记账 | commit + 点名测试 PASS + UTC。缺任一条不得 PASS |
| `DNLS03X-T05` | 缺 `sandboxId` 拒绝；不可见与不存在拒绝一致；`redact` 生效；接管中模型工具和 `/mcp` 在内核前以 `kitesurf.control.held` 拒绝且只有 `errorId`；HTTP `/open` 不读这个闸；卸载后四个工具不再注册 | spike | 集成 | 🆕 三入口同夹具 | S1-05 → R-11 | commit + 三入口断言 PASS + UTC |
| `DNLS03X-T06` | 地址语法；0/1/多候选；核实失败不改投；源码无 `openKitesurf` 与私有 kind | 短途 | unit | 🆕 资源地址测试 + 源码扫描断言 | S1-06 → 硬切 | commit + 测试 PASS + 扫描 0 命中 + UTC |
| `DNLS03X-T07` | 同一引用不新增页签；两个不同引用是两个页签，且这条不能填 U3 或 T40；不含 `cdp` 时显示原因且不发对象请求；`tab.visible` 为假时 `/status`、`/shot`、`/dom`、`/control` 都没有定时请求，恢复可见刷新一次 | 短途 | unit | 🔱 fork [DNK] pane 测试 | S1-07 → 锁定与轮询 | commit + PASS + UTC。只断言源码没有 `setInterval` 不算 |
| `DNLS03X-T08` | `/res` 与 `res.*` 不在路由表和错误目录；没有别名、开关或墓碑；srcdoc 只有真实地址；命中隧道域的 `/open` 成功体和失败体都带 hint 且状态码不变；账本少一行且 0 漂移 | 短途 | 契约 | ♻️ 改 `dom-srcdoc`、`dom-health-routes`、`environment-owner` 的旧断言 | S1-08 → 路径消失 | commit + 三份测试 PASS + check 0 漂移 + UTC。只断言 `sandbox.provider_unsupported` 不是 T08 |
| `DNLS03X-T09` | 至少一例内核失败同时带 `error` 和 `hint`，键只有 `ok`、`errorId`、`error`、`hint`；超长 `error` 按 240 字截断；另有一例派发前失败只有状态码和 `errorId`；失败体没有 `incidentId`；`/operations` 仍有 | 短途 | unit | 🆕 投影测试 | S1-09 → 白名单 | commit + PASS + UTC。只断言「有 errorId」或「可以有 error/hint」不算 |
| `DNLS03X-T10` | nano-ui 入口无外壳导出；`check-ui-rules` 的 U10 条数等于 DESIGN §10 | 短途 | 契约 | ♻️ `check-ui-rules --plugin DNLS` | S1-10 → 豁免登记 | commit + JSON 计数相等 + UTC |
| `DNLS03X-T11` | 六条路径都不存在：四份 `scripts/*.mjs`、`test/e2e-script.test.mjs`、仓根 `scripts/gui-smoke-kitesurf.sh`；`package.json` 无 `test:e2e`；RELEASE 无「全 PASS 才算 Kitesurf 真的可用」，且没有新的必跑项 | 短途 | 回归 | 🆕 一条存在性断言即可，不把删除做成新闸门 | S1-11 → 旧脚本退役 | commit + 断言 PASS + UTC |
| `DNLS03X-T12` | 点名行和普查行逐行都落在允许终态里，没有「开放」 | 短途 | 回归 | 人工核对 todo 新节 | S1-12 → 台账可查 | commit + 逐行终态摘要 + UTC。抽查通过不算。可见行的证据栏仍写「待 S4」或「待 S6」 |
| `DNLS03X-T13` | 三包 `npm test` 与 `check-*` 为 0；同时记录开发站未被写 | mega | 集成 | ♻️ 三包现有 `npm test` | S1-13 → 不部署的出口 | commit + 三条命令的退出码 + 只读核对 UTC |
| `DNLS03X-T20` | digest 与三个 SHA 写在 todo；构建命令经 confine | spike | live | 🆕 执行记录，不是包内常驻测试 | S2-01 → 一次构建 | 记录中的 digest + 命令 + UTC |
| `DNLS03X-T30` | 两个旧 UUID 都先核对绑定和挂载；容器证实不存在之后才删各自精确卷；审计和台账还在 | spike | live | 🆕 现场核对 | S3-01 → 未半截 | 容器、卷、审计三者的前后记录 + UTC。顺序颠倒或半截则保持 `未观察`，todo 写「未清场」 |
| `DNLS03X-T31` | 新 ID、新卷、挂载三者都核对到；该 profile 只剩这一个受管对象卷；卷路径不是两个旧目录 | spike | live | 🆕 现场核对 | S3-02 → 干净创建 | 新 ID + 卷路径 + UTC。创建半截或保卷重建不得 PASS |
| `DNLS03X-T40` | §4.4 里每一条真机行各自有「通过」结论，并带操作号、对象 ID 或截图名、session 标识、UTC；消息数 ≤ 20 且与 A1/A2/A3 的账一致；加载 SHA 一致 | mega | live | 🆕 ego 与 session 证据 | S4-01 → 双操作者 | 任一行失败、未做或只写「有结论」，T40 不得 PASS，也不能用 T40 的总状态代替 U1、U3、U4 或 A2 |
| `DNLS03X-T41` | 八个 `p2-*.png` 存在，且各有参考行与 client SHA | mega | live | 🆕 截图清单 | S4-02 → 交给 [业主] | 文件名列表 + SHA + UTC。没有 [业主] 结论时状态是 `未观察`，不是 PASS |
| `DNLS03X-T50` | 复跑只覆盖失败行；对象 ID 不变 | mega | live | 🆕 对比 S4 记录 | S5-01 → 不再清场 | 复跑行列表 + 同一 ID + UTC |
| `DNLS03X-T51` | P2 返工不改变镜像 digest | mega | live | 🆕 | S5-02 → 只改 client | 返工前后 digest + UTC |
| `DNLS03X-T52` | main 上三包测试与检查为 0；按合并提交重建的 SHA 与 S5 最后一次复跑逐包一致；不一致则未进入 S6；主工作区脏路径未被动过 | mega | 集成 | ♻️ `npm test` 与 `check-*` | S5-03 → 可切换的制品 | main commit + 命令 + 两边 SHA + UTC。不得把重建结果写回基准 |
| `DNLS03X-T60` | 使用 S5-03 的比对结果，未再单独重建；删除前有容器 ID、镜像、挂载核对；状态根没有其他条目；`term.audit` 仍在；五项只读验收都通过之后才删留存目录；镜像仍在；桌面未动 | mega | live | 🆕 现场核对 | S6-01 → K-07 web | 三包 SHA + contract 响应 + 留存目录的删除时间在验收之后 + UTC。缺一不得 PASS，不得写已切换或已回滚。未执行时保持 `未观察` |
| `DNLS03X-T61` | §11、todo 终态、closure §0 都在删树之前写入 | mega | 回归 | 人工 | S6-02 → 一处终判 | main 上三处 diff + 删树命令的时间在其后 |

### 8.2 复用台账

| 既有用例 | 处置 | 改动 | 起跑线状态 |
|----------|------|------|------------|
| `test/dnls03-journey.mega.test.mjs` | 🔱 fork 断言 | owner 403 改为同代次允许，并加非 owner 拒绝 | HEAD 上是旧合同的 PASS，不能原样沿用 |
| `test/dom-srcdoc`、`test/dom-health-routes`、`environment-owner` 里找 `/res` 的断言 | ♻️ 改断言 | 改为路径不存在、srcdoc 用真实地址 | 现在会在删除后变红，这是预期，不是回归 |
| `check-route-sensitivity`、`check-feature-contract`、`check-ui-rules` | ♻️ 沿用 | 0 改动检查器本身 | 已存在 |
| [DNK] `test:e2e` 与 `e2e-ego` 27/27 | 删除，不 fork | 整文件删除 | 受管前证据，不得移用 |
| 三包 `npm test` | ♻️ 沿用 | [DNK] 数量下降不补假测试 | HEAD 上是 468/468、52/52、272/272 的测量，不是本计划的出口 |

### 8.3 分层与跑法

| 类型 | 跑法 / 频率 | 主要层 | 触发时机 |
|------|-------------|--------|----------|
| 短途 | 改对应文件就跑点名测试 | unit、契约 | S1 开发中 |
| spike | 点名测试或现场核对 | 集成、live | S1 高风险项收口、S2、S3 |
| mega | 三包 `npm test`，以及 S4–S6 的现场记录 | 集成、live | S1 出口、S4、S5、S6 |
| soak | 本计划不新增长稳循环 | — | 不把 N 次重放当成第二轮真机 |

### 8.4 测试缺口

- 不覆盖无 session 的正式页签（`XB-5`）→ 宿主提供入口之前不做。
- 不覆盖 API token 客户端与浏览器 owner 的区分 → 只有出现必须区分的消费者才登记。
- 不覆盖第二个 profile 的 `drivers` 差异 → 仓内没有第二份清单。
- 不覆盖桌面切换 → `T-O-70` 推迟。
- 不把「两个引用两个页签」写进 S4 → S3 只有一个对象；该断言只留在 `DNLS03X-T07`。
- 非 owner 主体驱动回合时的工具限制：S1 核实；核实不了就在台账登记，不用夹具主体冒充现场。

### 8.5 测试保真（防假绿）

- 每个 PASS 要有 commit 或现场记录、测试或核对的名字、UTC。只有计数没有对象 ID、SHA 或操作号，不算现场 PASS。
- `DNLS03X-T41` 在 [业主] 写下 P2 结论之前不得标 PASS。文件在磁盘上只说明截图已取。
- `DNLS03X-T13` 为 0 而 `object-authz.js` 仍拒绝全部 `terminal.*`，不是 S1 成功。
- 只改测试期望、不改谓词，不是 `DNLS03X-T03` 的成功。
- 夹具里的具名主体通过了 create，不能填写 U1。U1 必须是 `dsh-dev` 上重启 [dsh] 之后的同一次任务。
- 旧 `e2e-ego` 27/27、`final-eval`、E1–E15 不得抄进新台账的证据栏。
- [DNK] 测试数变少不是失败。为了维持 52 这个数字而留下空测试，才是假绿。
- 删除 `/res` 之后，如果还有测试只断言「返回 `sandbox.provider_unsupported`」，那是旧过渡态，不是 `DNLS03X-T08`。新断言是路径不存在。
- 失败体测试若只断言「有 `errorId`」而不断言「没有 `incidentId`」，不算 `DNLS03X-T09`。
- U10 数量对上了、但 DESIGN §10 没有对应说明，不算 `DNLS03X-T10`。
- S4 的 agent 场景如果提示词里写了如何绕过 `humanHold`，该行作废，不记通过。
- 生产验收如果创建了对象才看到非空总览，`DNLS03X-T60` 失败。
- `degraded` 必须写机器可读的原因。已有的宿主依赖写「宿主依赖」，不写成产品通过。

攻击向量，随对应测试一起写，不能只留幸福路径：

| 向量 | 挂在 | 期望 |
|------|------|------|
| 非 owner kind 调 `term.session.attach` | `DNLS03X-T03` | 拒绝，不签发 locator |
| 代次不符的 owner 再 attach | `DNLS03X-T03` | 拒绝 |
| 自报 `clientInfo.name` 等于接管 owner | `DNLS03X-T04` | 仍不当作宿主 |
| 无凭据 `POST /control` | `DNLS03X-T04` | 403，不是 200 再当 agent |
| 第二个客户端拿着复制的 relay 地址去写 | `DNLS03X-T04` | 拒绝，且 `lastAt` 不变 |
| 接管中宿主类写 | `DNLS03X-T04` | 成功。一律拒写不算 T04 |
| 换代后用旧凭据 | `DNLS03X-T04` | 失效 |
| 接管中模型工具调用打开 | `DNLS03X-T05` | 内核未被调用；只有 `errorId`，且是 `kitesurf.control.held` |
| 接管中 `/mcp` 打开 | `DNLS03X-T05` | 同上 |
| 接管中 HTTP `/open` | `DNLS03X-T05` | 不被这个闸拒绝 |
| 不可见对象与不存在对象 | `DNLS03X-T05` | 拒绝一致 |
| 卸载插件 | `DNLS03X-T05` | 四个工具不再注册 |
| 失败体额外带 `incidentId` | `DNLS03X-T09` | 断言失败 |
| 派发前失败带 `hint` | `DNLS03X-T09` | 断言失败 |
| 清场路径不是那两个精确卷 | `DNLS03X-T30` | 停，不记已清场 |
| S6 的 SHA 少一位仍继续 `plugin add` | `DNLS03X-T60` | 这不是 PASS |

---

## 9. 风险、依赖与完成后状态

### 9.1 风险与依赖

| 风险 / 依赖 | 描述 | 当前判断 | 应对方式 |
|-------------|------|----------|----------|
| 主工作区脏路径 | 合入 main 时可能重叠 | high | R-9：重叠即停，请 [业主] |
| 20 条上限 | 本清单至多 6 条；执行中加场景会超 | medium | 先改计划并请 [业主] 批准。不把 20 提高 |
| 清场不可逆 | 两个卷删除后不能恢复 | high | 每步核对 UUID；半截不叫完成 |
| 生产切换窗口 | [DNK] 在窗口内不可用，旧浏览器状态丢失 | high | 先留回滚目录；失败就重装旧三包 |
| 共享镜像 | 删镜像会同时影响桌面和开发 | high | S6 不删镜像 |
| 宿主页签 | 无 session 时管理页不渲染 | medium | 保持宿主依赖，不另做第二套 UI |
| P2 可能多轮 | 返工次数不封顶 | medium | 只改 client，不扩大 S2/S3 授权 |

### 9.2 约束与前提

- **技术前提**：宿主 pin 保持 `0.2.2-rc.5@9c2670d3`。不改 `engines`。构建必须有 `ctx.sandbox`。
- **运行时前提**：S2–S5 只动 `dsh-dev` 的 web profile。S6 只动 `~/.dsh` 的 web profile。S1 期间开发站只读。
- **组织协作前提**：P2 的通过只由 [业主] 写在 P2 行。本计划不代写设计结论。
- **上线 / 合并前提**：S6 的比对基准是 S5 最后一次复跑的三包。main 上按合并提交重建的结果与该基准不一致即停，不得把重建结果写回基准，也不得 `plugin add`。

### 9.3 文档同步要求

- 需要同步更新的设计文档：DESIGN §6 删除外壳行，§10 补豁免。不改真相层规则句。
- 需要同步更新的说明文档：三份 `AGENTS.md` 各一行；`RELEASE.md:97` 只改写旧句。
- 需要同步更新的测试说明：旧 e2e 文档不回改。新证据只进 `.anote/reviews/dsh-nano-local-sandbox/DNLS03/` 与 todo。
- 退役清单：`/res` 与旧脚本要同时清掉代码、注释、头注、测试里的行号锚、以及 RELEASE 那一句。七份历史文档里的旧句子不回改。

### 9.4 完成后的预期状态

1. [DNLS] 用公开对象引用交接，owner 可以持有自己的沙箱终端，非 owner 仍被拒绝。
2. `/res`、私有 kind、旧 e2e 脚本和 nano-ui 里的外壳导出都不在。
3. `dsh-dev` 上有且只有一个 S3 新建的对象；P2 的结论写在 todo 的一行里。
4. `~/.dsh` web 跑的是 SHA 核对过的三包；桌面仍是旧组合，并标明推迟。
5. closure §0 是这轮的终判；工作树和分支已按 `T-O-71` 删除。

---

## 10. 收口（Definition of Done = 测试台账全 PASS 映射）

### 10.1 收口硬闸

§10.2 的每一行都是出口项。缺四元组、该行行为失败、或证据只是「有结论 / 文件在 / 退出码 0」，该行不得标 PASS，本补充计划不得标 `executed`。相邻行的 PASS 不能把下面这些捎上：

1. S1 的内部合同由 `DNLS03X-T03`、`T04`、`T05`、`T07`、`T08`、`T09`、`T12`、`T13` 各自证明。T13 的记录写明未部署。点名攻击用例被 skip，T13 不得 PASS。
2. W1 只认 U1 在 `dsh-dev` 上的通过，不认 T40 整行，也不认夹具 journey。
3. 引用页签只认 U3：同一引用复用、空选择器还在、切走后停止请求。两个引用两个页签只在 T07，不能填 U3。
4. 打开拒绝只认 A2，并且 T05 已经区分三条入口。列出 → 询问 → 打开只认 A1。pane 与 agent 的同一 hint 只认 U5 加 A3。
5. HTML 模式开关只认 U8。隧道 hint 只认 U9，并有 T08 的单测。
6. W3 要同时有 U4 的操作与回执，以及 [业主] 写在 P2 行的结论。`DNLS03X-T41` 只有截图没有结论时，不得算过。
7. 清场只认 T30 与 T31 的完整顺序。SHA 比对只认 T52。生产删除与回滚只认 T60。桌面行保持推迟，不算未完成。

### 10.2 收口映射表

| 收口目标 | 工作项 | Test-ID | PASS 证据 | 状态 |
|----------|--------|---------|-----------|------|
| 账本可重建 | S1-01 | `DNLS03X-T01` | 待执行 | `未观察` |
| 指针不改旧正文 | S1-02 | `DNLS03X-T02` | 待执行 | `未观察` |
| owner 终端谓词 | S1-03 | `DNLS03X-T03` | 待执行 | `未观察` |
| 宿主凭据 | S1-04 | `DNLS03X-T04` | 待执行 | `未观察` |
| 三入口打开差异 | S1-05 | `DNLS03X-T05` | 待执行 | `未观察` |
| 私有 kind 消失 | S1-06 | `DNLS03X-T06` | 待执行 | `未观察` |
| 页签锁定 | S1-07 | `DNLS03X-T07` | 待执行 | `未观察` |
| `/res` 消失 | S1-08 | `DNLS03X-T08` | 待执行 | `未观察` |
| 失败体白名单 | S1-09 | `DNLS03X-T09` | 待执行 | `未观察` |
| 外壳回迁 | S1-10 | `DNLS03X-T10` | 待执行 | `未观察` |
| 旧脚本退役 | S1-11 | `DNLS03X-T11` | 待执行 | `未观察` |
| 台账初值 | S1-12 | `DNLS03X-T12` | 待执行 | `未观察` |
| S1 不部署 | S1-13 | `DNLS03X-T13` | 待执行 | `未观察` |
| 一次构建 | S2-01 | `DNLS03X-T20` | 待执行 | `未观察` |
| 清场 | S3-01 | `DNLS03X-T30` | 待执行 | `未观察` |
| 一个新对象 | S3-02 | `DNLS03X-T31` | 待执行 | `未观察` |
| 双操作者场景 | S4-01 | `DNLS03X-T40` | 待执行 | `未观察` |
| 设计截图 | S4-02 | `DNLS03X-T41` | 待执行 | `未观察` |
| 失败行复跑 | S5-01 | `DNLS03X-T50` | 待执行 | `未观察` |
| P2 返工不换镜像 | S5-02 | `DNLS03X-T51` | 待执行 | `未观察` |
| main 上的制品 | S5-03 | `DNLS03X-T52` | 待执行 | `未观察` |
| 生产 web | S6-01 | `DNLS03X-T60` | 待执行 | `未观察` |
| 回填后删树 | S6-02 | `DNLS03X-T61` | 待执行 | `未观察` |

### 10.3 Definition of Done

| 维度 | 完成定义 |
|------|----------|
| 功能 | §4 的 S1–S6 收口标准都有证据；桌面行是推迟而不是遗漏 |
| 测试 | §10.2 每一行都有自己的通过证据；四元组不等于「有结论」；`T41` 另需 [业主] 的 P2 结论；U4 另需操作与回执 |
| 文档 | todo 是唯一过程，closure §0 是唯一终判，问答 §1 是唯一合同；本计划 §11 只在 S6 之后出现 |
| 风险收敛 | 没有第二次清场，没有删镜像，没有把夹具写成 W1 |
| 可交付性 | 本文件仍不构成新的 grant。现场动作只重复问答里已经写出的五类和六类 |

### 10.4 NOT-成功识别

任一出口项是 `degraded` 或 `未观察`，本补充计划不得标 `executed`。特别地：

- 三包测试是 0，但 `RES_ROUTE` 还在：不是成功。
- 管理页截图齐了，P2 行没有 [业主] 结论：不是 W3 完成。
- 只在夹具里 attach 成功：不是 W1 完成。
- 生产目录已替换，但 SHA 没事先比对：不是 S6 成功，要按回滚路径处理并如实记录。
- 工作树已删，§11 或 closure §0 还没写：不是收口。

---

## 11. 执行日志回填

文档状态不是 `executed`。本节留空，直到 S6 在 main 上一次回填。不在 S1–S5 期间把过程写到这里；过程写在 `todo.DNLS03.md` 的补充阶段节。


---

## 12. 补充阶段工作日志（执行回填，append-only）

> 编号说明：上文 §11 是 P0–P8 的历史执行日志；本节是补充阶段（S1–S6）的日志，故编为 §12，避免同名。

> 执行者：`DNLS03-extra 执行文档 agent（lead）`
> 执行时间：`2026-11-20` – `2026-11-21`（UTC+8）
> 文档状态：`executing`（S4 收尾、S5/S6 未开始）
> 代码改动统计：`S1 阶段 12 个提交；S3–S4 期修复 4 个提交；三包测试 489/73/272`

- **实际执行摘要**：S1 全 13 项、S2 一次构建、S3 清场与新建、S4 真机除 U7 浅色外全部完成（模型回合 5 个，发送 8 次；3 次被提供方 400 拒、无回合）。S4 期间修掉三个只有真机/真模型才暴露的缺陷（`openDesign` 事件参数、relay 凭据子协议、工具名非法 + skill 缺「必须问」）。
- **Phase 偏差（计划 vs 实际）**：
  1. `顺序调整` 文档提交早于 `S1-01` 的并入提交（WARN#1 要求工作树干净），并入提交本身仍不含问答与本计划。
  2. `顺序调整` S3-02 与 S4-01 a) 互换：对象必须用 S2 新镜像创建，所以先装候选再建对象。
  3. `口径调整` S4 期内的代码修复（`8b77cc2`、`aaba1dd`、`65cfd68`）按 `S5-01`「修失败行」记账，S4 本身仍「不改代码」。
  4. `文档落点` 不建 `plan/DNLS03-extra.md`、不建 `todo.DNLS03&extra.md`（`T-O-55` + 单一真源），均 append 到既有文件。
- **阻塞与处理**：
  1. `A1` 首两次被提供方 400 拒绝：一次是工具名带点号（`^[a-zA-Z0-9_-]+$`），一次是会话默认 `SWE-2 · Devin` 内部错误。均已处理（改名 + 切 DeepSeek），第三次通过。
  2. `U7 总览浅色` 需要改 macOS 外观，站内无主题开关；未授权，未生成。
  3. `S6` 需要 [业主] 的 P2 设计结论，且 S5 未开始。
- **测试发现**：三包 `npm test` 491/491（[DNLS]）、73/73（[DNK]）、272/272（[DNT]）；`check-route-sensitivity` 99 路由 0 漂移；`check-feature-contract` 100 路由；`check-clean-lib` 104；`check-client-rules` 仅基线 1 warning。
- **后续 handoff**：S5 只剩 U7 浅色一张待授权；S6 等 P2 结论后按 §4.6 六步执行。

### 11.1 逐工作项状态

| 工作项 | 状态 | 实际落点 | 备注 |
|--------|------|----------|------|
| `S1-01` | ✅ done | 并入 `805df28` | 三账本无冲突，0 漂移 |
| `S1-02` | ✅ done | `2261040` | closure 两段并一行、七份旧文档、DNK01 头 |
| `S1-03` | ✅ done | `ab9650a` | owner 同代次可 attach，他人终端仍拒 |
| `S1-04` | ✅ done | `47f92b5` | 代次凭据 + 读白名单 + `relay.conns` 只计 agent |
| `S1-05` | ✅ done | `7a12008`、`65cfd68` | 四工具走 `tools.register`；工具名改 `sandbox_*` |
| `S1-06` | ✅ done | `d689f44` | 公开对象引用 + `candidates`→`openResource` |
| `S1-07` | ✅ done | `7a12008` | `drivers` 三入口同源；隐藏即停 |
| `S1-08` | ✅ done | `47f92b5` | `/res` 与代理改写退役；隧道 hint |
| `S1-09` | ✅ done | `804cf22`、`c4f2644` | 四键白名单；typed 409 挂 `sandbox.state_conflict` |
| `S1-10` | ✅ done | `98879d2` | 外壳退回 [DNLS]；U10 = §10 行数 |
| `S1-11` | ✅ done | `962ce1e` | 六条路径删除；`test:e2e` 消失 |
| `S1-12` | ✅ done | `98879d2` | §8.8 台账 131 行，无「开放」 |
| `S1-13` | ✅ done | `4f058eb` | 三包全绿、未部署 |
| `S2-01` | ✅ done | `f8d4fef` | 镜像 digest `5bab7732…`；三包 SHA 已记 |
| `S3-01` | ✅ done | `c9473d6` | 两容器/两卷清除；`7ef19658` 卡 `pre-missing` 已登记 |
| `S3-02` | ✅ done | `c9473d6` | 新对象 `ad32a65f…` 跑 S2 镜像 |
| `S4-01` | 🟩 partial | `65cfd68`、`1dab37a` | U1/U3/U4/U5/U6/U8/U9/A1/A2/A3 通过；U7 缺浅色一张 |
| `S4-02` | 🟩 partial | 同上 | 7/9 张 |
| `S5-01` | ⬜ pending | - | 只剩 U7 浅色；未授权 |
| `S5-02` | ⬜ pending | - | 等 [业主] 的 P2 结论 |
| `S5-03` | ⬜ pending | - | 等 S5 完成 |
| `S6-01` | ⬜ pending | - | 等 S5-03 的 SHA 比对 |
| `S6-02` | ⬜ pending | - | 等 S6-01 |

### 11.2 关键决策

#### Decision-1 — relay 凭据改用请求头
- **背景**：宿主以 `dnls-relay.<token>` 子协议出示凭据，桥的 101 不回选子协议，WHATWG WebSocket 按规范中止握手，真机表现为 `cdp connect failed`。
- **决议**：生产传输改用 `ws` 的 `x-dnls-relay-credential` 头；注入的 Socket 仍走子协议 seam。
- **理由**：桥本就支持该头，不需要重建镜像；且不必让 101 回显凭据。
- **代价**：多了一个可注入的 `relayTransport` 测试缝。

#### Decision-2 — 工具名与能力 id 脱钩
- **背景**：模型工具沿用了带点号的能力 id，提供方以 `^[a-zA-Z0-9_-]+$` 拒绝整个请求。
- **决议**：四个工具名固定为 `sandbox_list` / `sandbox_status` / `sandbox_open` / `sandbox_control_status`，加 `assertToolName` 守卫，skill 同步。
- **理由**：工具 schema 与描述是模型可见合同，名字非法会让每一轮对话都失败，不只是这个工具。
- **代价**：名字与 `dnls.control/1` 的能力 id 不再字面一致，需要 skill 与测试各自对表。

#### Decision-3 — skill 必须有「必须问」的硬规则
- **背景**：`T-O-64` 要求「只有一个候选也问」，但第二次真机里模型直接替用户选了对象。
- **决议**：在 Step 0 写死硬规则（重复请求、上一轮失败、单候选都不算指定；问完停下等回答）。
- **理由**：这一条只能靠 skill 文本约束，工具层无法判断用户是否已指定。
- **代价**：技能文本更啰嗦；模型仍可能偏离，需真机回归。
