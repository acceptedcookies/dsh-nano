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
| 台账原子且可重启 | P1-01 | `DNLS03-T01` | 执行时填写 | `未观察` |
| session 不是物理身份 | P1-02 | `DNLS03-T02` | 执行时填写 | `未观察` |
| 无第二写者胜出 | P1-03 | `DNLS03-T03` | 执行时填写 | `未观察` |
| 不空表认领 | P1-04 | `DNLS03-T04` | 执行时填写 | `未观察` |
| 发现不授权 | P2-01 | `DNLS03-T10` | 执行时填写 | `未观察` |
| 错版本不派发 | P2-02 | `DNLS03-T11` | 执行时填写 | `未观察` |
| 错误前缀稳定 | P2-03 | `DNLS03-T12` | 执行时填写 | `未观察` |
| 无选择不执行 | P2-04 | `DNLS03-T13` | 执行时填写 | `未观察` |
| 绑定 id 未被冒名 | P2-05 | `DNLS03-T14` | 执行时填写 | `未观察` |
| 一笔意图一次派发 | P3-01 | `DNLS03-T20` | 执行时填写 | `未观察` |
| 断线不是取消 | P3-02 | `DNLS03-T21` | 执行时填写 | `未观察` |
| 授权与审计 | P3-03 | `DNLS03-T22` | 执行时填写 | `未观察` |
| create 不发地址 | P4-01 | `DNLS03-T30` | 执行时填写 | `未观察` |
| 原执行可被新输入推进 | P4-02 | `DNLS03-T31` | 执行时填写 | `未观察` |
| attach 不 spawn | P4-03 | `DNLS03-T32` | 执行时填写 | `未观察` |
| 无 v1 降级 | P5-01 | `DNLS03-T40` | 执行时填写 | `未观察` |
| 撤权不杀 PTY | P5-02 | `DNLS03-T41` | 执行时填写 | `未观察` |
| local 协议未改 | P5-03 | `DNLS03-T42` | 执行时填写 | `未观察` |
| 废止端口加一 | P6-01 | `DNLS03-T50` | 执行时填写 | `未观察` |
| 保存不应用 | P6-02 | `DNLS03-T51` | 执行时填写 | `未观察` |
| 用量不插值 | P6-03 | `DNLS03-T52` | 执行时填写 | `未观察` |
| fleet 不泄露 | P7-01 | `DNLS03-T60` | 执行时填写 | `未观察` |
| 只停不删且按对象计额 | P7-02 | `DNLS03-T61` | 执行时填写 | `未观察` |
| UI 不假交付 | P8-01 | `DNLS03-T70` | 执行时填写 | `未观察` |
| 交接不二次 create | P8-02 | `DNLS03-T71` | 执行时填写 | `未观察` |
| 文档与版本边界 | P8-03 | `DNLS03-T72` | 执行时填写 | `未观察` |
| 旅程同切 | Phase 8 | `DNLS03-T80` | 执行时填写 | `未观察` |
| 写者竞态 | P1-03/P7-02 | `DNLS03-T81` | 执行时填写 | `未观察` |

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

文档状态不是 `executed`。本节省略。执行完成后另记，不在本轮把计划写成已完成。
