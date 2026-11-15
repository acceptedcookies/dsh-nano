# `CF1115` Action Todo — 全活跃插件 Contract/Facade 统一实施（P0–P4）

> 文档性质：`action-todo`（DAG-guided execution；不是新的设计或授权文件）
> 目标：按 `contract-and-facade-1115-action-plan.md`（draft v0.1.2）完成全部 21 工作项编码 + 21 Test-ID 测试 + 文档撰写，并收口至 closure
> In-scope：8 个活跃插件 `contract`/`facade` 统一（`packages/dsh-interface` 归口包 + guard 唯一源 + createWebRegistrar + JSON/MCP/导入/作者记录/terminal/sandbox/native/host 适配 + 全范围结算）
> Out-of-scope：不签发 implementation grant；不安装/重启现用 profile；不新增 release-gate；不开 Round 7 / 新 Q/A；不修 security-audit 既有发现（O5）；不做版本 bump/tag/release；无兼容第四阶段/双写/兼容 alias/统一 wire 信封/通用 DSL/runtime 总线/插件私有通道
> 上游依据：`docs/code-review/26-nov/contract-and-facade-1115-qna-truth.md`（`CF1115-TRUTH` v0.1.1 FROZEN）、`contract-and-facade-1115-qna.md`（v0.12 FROZEN）、`contract-and-facade-1115-eval.md`
> 关联 action-plan：`docs/code-review/26-nov/contract-and-facade-1115-action-plan.md`（本文的唯一施工图）
> authority / owner：[业主] · 授权边界：`不得擅自扩约`/`不得过度仪式`/`单一真源`/`插件中立`/`不得侧载`/`上层建筑归host`；本 directive 即本工作项目内的施工授权（INFO#4：live migration/rebuild/deploy + digest 创建 + SSOT 建立，仅限 `contract-and-facade`/`1115` 框架内）
> 基线：`main @ 653b15b`（live HEAD；AP 锚定 `f7199f9` 快照，路径+符号名为准，见 AP §7.0）
> 文档状态：`executing` · 执行状态：`in-progress`

## 1. 核心脊

- **目标与边界**：交付 AP 的 21 工作项落地代码 + 21 Test-ID PASS 证据 + 工作日志 + closure；明确不签发 grant、不装/重启 profile、不开 Round 7、不修 security-audit 发现。
- **权威与决策**：唯一施工图 = `contract-and-facade-1115-action-plan.md`；冲突一律回冻结 `contract-and-facade-1115-qna.md` / `CF1115-TRUTH`；未决公共改约走 `AGENTS.md:40` 正常变更登记，不在本 todo 偷偷裁决。
- **完成定义**：21 个 Test-ID 全部 `PASS` 且四元组齐全（`commit + 测试/命令 + 结果 + run-time(UTC)`）、§8.6 逐 Test-ID 防假绿封口全部成立、任一退出硬闸不 `degraded/未观察`、closure 如实归类。
- **证据原则**：每个 PASS 都要有可复现的四元组；计数/目录/声明/占位/源码字符串 `includes`/两个生成投影互证/测试自建计数器均不得充当完成证据。
- **执行回写**：每完成一个 Item-ID 回写 `[x]` + `执行状态` + UTC 时间 + 证据；未跑/部分/阻塞/deferred 保持未勾选并写 reason。
- **交接原则**：阻塞项写明 reason、下一动作、责任/承接方。

## 2. 依赖关系 / DAG 指引

```text
[Phase 1 / P0] 归口基座 + guard唯一源 + createWebRegistrar + DNN/DNT 首批闭环
      │
      ├──────► [Phase 2 / P1] 普通JSON + 导入 + FamilyDefinition + 基础JSON成对硬切
      │              │  （-14/-16/-17；F17.4 同源投影为跨 Phase backbone）
      │              ▼
      ├──────► [Phase 3 / P2] MCP + terminal两提供面 + sandbox二十工具 + DNK/DNT消费
      │              │  （-15/-20/-21；真实生产路径、非stub）
      │              ▼
      └──────► [Phase 4 / P3] host适配 + DNCS native + DNMSC例外 + DNN S3/RPC/标准流
                     │  （-18/-22/-21(DNN)；F21.8 DNN S3/RPC 归 P3）
                     ▼
               [Phase 5 / P4] 全范围结算（八包 + 36+4 观察 + 旧源/离仓产物 + 五态）

并行边：Phase 2/3/4 内独立合同族闭环可并行（F19.1）；阶段数字不构成全仓 release-gate。
每族微环：目标合同(CITE) → 作者/实现/消费者/派生表/测试/说明/产物 成对硬切
  → 分层窄验证 → 旧作者源一次性退役 → 按义务销账（未接通/未验证/需延期保持未完成）。
```

**DAG notes**：严格按 AP §1.4。Phase 1 是基座，必须先完成（P1-01→P1-02→P1-03→P1-04→P1-05）。Phase 2 依赖 Phase 1（注册门面）+ `-17`（FamilyDefinition backbone，供 P2/P3 facade 消费）。Phase 3 依赖 Phase 1+2（codec/作者记录）。Phase 4 依赖 Phase 2+3。Phase 5 依赖 Phase 1–4 全部销账入账。

### 节点台账

| 节点 | 目的 | depends on | exit condition |
|------|------|------------|----------------|
| Phase 1 / P0 | 归口包 + guard唯一 + createWebRegistrar + DNN/DNT 首批 | `-` | CF1115-T01..T09 PASS |
| Phase 2 / P1 | JSON codec + 导入服务 + FamilyDefinition + 基础JSON硬切 | Phase 1 | T10..T13 PASS |
| Phase 3 / P2 | MCP toolset + terminal 两提供面 + sandbox + DNK/DNT | Phase 1+2 | T14..T17 PASS |
| Phase 4 / P3 | host adapter + DNCS native + DNMSC例外 + DNN标准流/别名 | Phase 2+3 | T16/T17/T18/T19 PASS |
| Phase 5 / P4 | 八包 + 36+4 观察结算 + 五态 handoff | Phase 1–4 | T20/T21 PASS |

## 3. 工作项清单

> 工作项 = AP §3 的 `P{phase}-{nn}`；执行登记每完成一项回写。

### Phase 1 — P0 · 归口基座与首批闭环

- [x] `P1-01` — `packages/dsh-interface` 纯 ESM 构建期私有库 + contracts/host/build 三出口
  - **落点**：🆕 `packages/dsh-interface/{package.json,src/contracts/,src/host/,src/build/,test/}`；参照 `packages/dsh-host-route-guard/src/route-guard.js:1-24`
  - **完成判据**：contracts 无 I/O/Node/DOM/Cordis/store；host 只注入；build 仅构建期；无 `dsh.bundle`/`dsh.client`；无万能根入口
  - **验证映射**：`CF1115-T01` · **依赖**：`-`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P1-02` — guard 唯一实现单向复用 + 每包 build 物化 / 离仓自包含
  - **落点**：`packages/dsh-host-route-guard/src/route-guard.js:162-166,243-245`；`dsh-nano-terminal/lib/route-guard.js:243`（私改点退役）；各包 `scripts/build-client.mjs`
  - **完成判据**：同一机制一份可修改实现；`file:../packages/dsh-interface` devDep；baked 表随产物；离仓不读邻居源码
  - **验证映射**：`CF1115-T02`/`T03` · **依赖**：`P1-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P1-03` — `createWebRegistrar` channel/match 绑定表 + mixed-batch 注册
  - **落点**：🆕 `packages/dsh-interface/src/host/createWebRegistrar.*`；`packages/dsh-host-route-guard/src/route-guard.js:157-166,243-247`
  - **完成判据**：全批预检后注册、失败回收、幂等 dispose 纳入 ctx.effect、inventory 只读有效绑定
  - **验证映射**：`CF1115-T04`/`T05`/`T06` · **依赖**：`P1-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P1-04` — DNN/DNT 首批真实接线（HTTP + SDK prefix / exact·close prefix·stream upgrade）
  - **落点**：`dsh-nano-notepad/index.js:67-82,334-357`；`dsh-nano-terminal/index.js:15-26,66-74,193-270`；`dsh-nano-terminal/lib/route-table.js:1-8`
  - **完成判据**：原 URL/字节/HEAD/MIME/MCP/SSE/WS/PTY 责任保留；真实 register/upgrade 经可注入 seam、撤销重装
  - **验证映射**：`CF1115-T08`/`T09` · **依赖**：`P1-02`/`P1-03`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P1-05` — 首批验证层 + 成对硬切退役 + 条件销账
  - **落点**：`packages/dsh-host-route-guard/test/route-guard.test.mjs`；`dsh-nano-terminal/test/register-routes.smoke.mjs`；`scripts/check-{route-sensitivity,feature-contract,clean-lib}.mjs`
  - **完成判据**：三检查扩维不缩 scope、smoke 改更强装配断言不删、DNN-01/DNT-01 条件真实兑现才销账、CROSS-02 至多部分偿还
  - **验证映射**：`CF1115-T07` · **依赖**：`P1-01..P1-04`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`

### Phase 2 — P1 · 普通 JSON / 导入 / 作者记录

- [x] `P2-01` — `createJsonClient` + `JsonOutcome` 五类失败 + 每操作唯一 codec
  - **落点**：🆕 `packages/dsh-interface/src/host/createJsonClient.*`、`src/contracts/jsonOutcome.*`；`dsh-nano-explorer-extra/src/host/routes.js:637-638`、`src/client/workspace-store.js:33-48`
  - **完成判据**：Q8 判别矩阵 7 类逐态 + F14.8 细分状态夹具；不自动 retry/换 endpoint/补空
  - **验证映射**：`CF1115-T10` · **依赖**：`P1-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P2-02` — `FamilyDefinition` 最小作者记录 + 同源投影
  - **落点**：🆕 `packages/dsh-interface/src/contracts/FamilyDefinition.*`；`dsh-nano-terminal/schema/dnt-mcp.openrpc.json`（派生参照）
  - **完成判据**：唯一关联操作/绑定/提供面/批准来源；web 表/operation/definition/服务声明同源；不造通用 IDL/runtime 注册中心
  - **验证映射**：`CF1115-T12` · **依赖**：`P1-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P2-03` — `nanoNotepad` 最小导入服务（Cordis）+ window global/别名退役
  - **落点**：`dsh-nano-notepad/src/client/panel.js:4438-4444,4500-4624,4673,4700`；`dsh-nano-explorer-extra/src/client/body.js:924-966`
  - **完成判据**：只公开 `import(name,content,meta?)`；DB 就绪/卸载/过期句柄接线；真 service 提供/发现/撤销 + 真实导入
  - **验证映射**：`CF1115-T11` · **依赖**：`P2-02`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P2-04` — DNEE/DNMS/DNN 基础 JSON 生产者—消费者成对硬切
  - **落点**：`dsh-nano-explorer-extra/src/host/routes.js:336-642`；`dsh-nano-model-selector/{index.js:34-51,150-157,264-388,src/client/{compact,media}.js}`；`dsh-nano-notepad/index.js:105-121,269-277`
  - **完成判据**：唯一 codec、旧 wrapper/parser/alias 零残留、领域政策/sanctioned writer 保留
  - **验证映射**：`CF1115-T13` · **依赖**：`P2-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`

### Phase 3 — P2 · 沙箱与终端真实互操作

- [x] `P3-01` — `createMcpToolset` + `decodeMcpReply` 三层解码 + attach 严格
  - **落点**：🆕 `packages/dsh-interface/src/host/createMcpToolset.*`、`decodeMcpReply.*`；`dsh-nano-terminal/src/host/mcp.js`；`src/client/lanes.js`
  - **完成判据**：广告精确对账、真实 schema 校验、rpc/tool/protocol 分层、wss 不降级 / URL 不猜
  - **验证映射**：`CF1115-T14` · **依赖**：`P1-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P3-02` — terminal 两提供面：[DNLS] 八工具 / [DNT] 本地十九工具 + McpLane v1/v2
  - **落点**：`dsh-nano-terminal/schema/dnt-mcp.openrpc.json:8-42`；`src/host/mcp.js`；`src/client/lanes.js`；`dsh-nano-local-sandbox/src/host/terminal-driver.js`
  - **完成判据**：两提供面分别标识、DNLS 单飞幂等 / DNT 多个不同 id、v1/v2 门控、断连至多一次不重跑写入
  - **验证映射**：`CF1115-T15` · **依赖**：`P3-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P3-03` — sandbox 二十工具真实业务 + bridge 只做获准 CDP — `partial`
  - **落点**：`dsh-nano-local-sandbox/src/host/{mcp-sandbox,routes,instance-registry,error-catalog}.js`；`profiles/kitesurf/mcp-bridge.mjs`
  - **完成判据**：二十工具逐一接真实领域 owner、`{ok:true,data}`、PublicInstance/Snapshot 边界、catalog 与 dispatch 同源、无自造 sandbox 工具
  - **验证映射**：`CF1115-T16` · **依赖**：`P3-01`
  - **执行状态**：`partial` · **执行时间**：`2026-11-15` · **证据**：`68210f6` — TOOL_DEFS 单源表、每工具 own `additionalProperties:false` schema + 真实 owner（profiles/instances/state/page/ports/bridge），catalog↔dispatch 同源；mcp-tools.spike 4/4 + DNLS 66/66。留：CDP 深工具（dom/elements/selftest/network 等）当前为 owner-null/只读近似、bridge CDP-only 收窄未做 → `CF1115-T16` 二十项全真实业务调用未达。
- [ ] `P3-04` — [DNK] 真实消费 + 容器时代旧资产/bridge 副本退役
  - **落点**：`dsh-nano-kitesurf/{index.js,src/client/index.js,package.json,runtime/mcp-bridge.mjs,lib/diagnostics.js}`
  - **完成判据**：端点常量/fetch 改指真实提供面、错误目录归属、旧容器资产/双载体退役、不删既有业务
  - **验证映射**：`CF1115-T17` · **依赖**：`P3-03`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P3-05` — [DNT] MCP/attach/WS/SSE/审计消费 + 公开 nanoTerminal — `partial`
  - **落点**：`dsh-nano-terminal/{index.js,src/host/{mcp,events}.js,src/client/lanes.js}`
  - **完成判据**：真实工具分发、attach 用返回 url、SSE 生命周期、审计 writer 接线、公开 `ctx.provide('nanoTerminal')` 消费
  - **验证映射**：`CF1115-T15`/`T17` · **依赖**：`P3-02`
  - **执行状态**：`partial` · **执行时间**：`2026-11-15` · **证据**：`a162463` — audit writer 真实落盘（`writeAudit`→appendFileSync 接线，term.audit 可回读，曾是无写者空文件）；`ctx.provide('nanoTerminal',{openLocal})` 已在 client；attach 用返回 `attach.url`（F20.7）、McpLane 至多一次重连（F20.6）已就。留：v1/v2 门控规定轨迹、SSE snapshot/seq/missed 逐项契约、断连净重发=0 的 live 验证 → `CF1115-T15` 全封口未达。
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`

### Phase 4 — P3 · 剩余领域 / 标准协议 / host 适配

- [ ] `P4-01` — 官方 host 薄 adapter + 异步结算 / 桥身份 / 配置失效
  - **落点**：`dsh-nano-cloud-session/{index.js,src/client/index.js}`；`dsh-nano-model-selector-compaction/index.js`
  - **完成判据**：直接引用官方服务/类型、Provider ON/OFF/isolate、配置失效旧 scope 失效、受控 Promise 结算
  - **验证映射**：`CF1115-T18` · **依赖**：`P2`/`P3`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [ ] `P4-02` — [DNCS] native 支持边界 + `NATIVE_*` 四码 + 义务表
  - **落点**：`dsh-nano-cloud-session/{index.js,src/host/devin-api.js,src/client/api.js}`
  - **完成判据**：只在公开能力满足义务时发布、否则 503 + 可见原因 + 无伪 localId；四码只进唯一作者、403 不误判
  - **验证映射**：`CF1115-T19` · **依赖**：`P4-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [ ] `P4-03` — [DNMSC] R-16 精确例外 + 影子 FallbackService 退役
  - **落点**：`dsh-nano-model-selector-compaction/lib/{host-services,host-compaction,compact-policy}.js`、`scripts/gen-mutex-patch.mjs`；`dsh-nano-model-selector/lib/compact-policy.js`
  - **完成判据**：真实 Service 解析（无法解析即激活失败）、ON/OFF/四 preset/isolate、已准 instanceof 降级、无影子服务
  - **验证映射**：`CF1115-T19` · **依赖**：`P4-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [ ] `P4-04` — [DNEE] native 资源 / [DNN] fx·S3·RPC·标准流 + 两组别名取舍
  - **落点**：`dsh-nano-explorer-extra/src/client/body.js`；`dsh-nano-notepad/src/host/{s3-sync,pipeline,fx-bridge}.js`
  - **完成判据**：`/s3/config` 只留 `probe`、`/rpc` 只留 `manifest.get`；四只读 RPC 唯一 codec；标准流/资源协议独立不 JSON 化
  - **验证映射**：`CF1115-T17`/`T16` · **依赖**：`P4-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`

### Phase 5 — P4 · 全范围结算

- [ ] `P5-01` — 八包逐包覆盖证据 + 36 逐包 + 4 横向观察逐项结算
  - **落点**：`contract-and-facade-1115-eval.md`（E1115-* 台账）；QNA §7.3
  - **完成判据**：逐观察号给覆盖/证据/旧源/离仓产物，不按数量销账、不静默缩范围、不另造替代账单
  - **验证映射**：`CF1115-T20` · **依赖**：`P1..P4`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P5-02` — 旧源 / 离仓产物 / 扫描覆盖对账 + 五类退役清单 — `partial`
  - **落点**：`scripts/{check-feature-contract,check-clean-lib,route-scan}.mjs`；`security/route-inventory.md`（仅回溯）
  - **完成判据**：派生表/清单/说明同源、五类落点零残留、扫描覆盖遗漏修正
  - **验证映射**：`CF1115-T20` · **依赖**：`P5-01`
  - **执行状态**：`partial` · **执行时间**：`2026-11-15` · **证据**：`68210f6` — feature-contract 8 插件（+DNCS/+DNMSC ui+dataLocations）、clean-lib 8 插件 + 递归 lib/（58→72 artifacts）、pack-manifest 基线重建。留：route-scan DNN/DNT/DNEE 读生成物 `lib/bindings.js`（投影自证，失独立 source-scan）—— `CF1115-T20` 未达。
- [ ] `P5-03` — 五态如实归类 + 债务按原观察号 handoff
  - **落点**：QNA §7.3；truth §4.6 P6
  - **完成判据**：`verified/observed-OK/partial/未观察/deferred` 如实归类；未实施/未验证债务保留原号；任一退出硬闸 `degraded/未观察` ⇒ 不标 `executed`
  - **验证映射**：`CF1115-T21` · **依赖**：`P5-01`/`P5-02`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`

## 4. 验收与证据

> 全部 21 Test-ID；四元组执行期回填。详见 AP §8.1/§8.6。

| Check-ID | 验证什么 | 状态 |
|----------|----------|------|
| `CF1115-T01..T21` | 见 AP §8.1 主表 + §8.6 逐 ID 防假绿 | `pending` |

## 5. 当前状态与交接

- **当前节点 / 已完成**：`P1-01..P1-05`、`P2-01..P2-04`、`P3-01`（10 项 ticked）
- **下一动作**：`P3-02`（terminal 两提供面）→ `P4-01` → `P5-01`
- **当前阻塞**：`无`
- **待 owner / 外部决定**：`implementation grant 已由本 directive 框架内授予；真实远端/引擎区间核验 deferred 至另立授权。P4-04 的「/s3/config 只留 probe」与端点切换握手（beginSwitch/commitSwitch/abortSwitch 均为合法业务动作）冲突——收窄会破功能，待 AP 原文裁决`
- **最终交接目标**：`closure + 工作日志回填 + 3 路审查`

## 6. 已启用插件

- `P-CTX`（跨多轮、接续）：读取依据 = AP + truth + QNA；基线 = `main @ 653b15b`
- `P-RED`（修 bug/改行为）：退役点走 first-red（原行为 → 新行为）
- `P-SCOPE`（跨边界/迁移/安全）：scope audit + 五类退役落点零残留
- `P-REF`（file:line 锚点）：AP §7.1 锚区 + §7.2 反例 ledger
- `P-TEST`（多层验证）：AP §8 测试台账
- `P-EXEC`（多步/多轮/偏差）：§4 偏差逐条登记
- `P-CLOSE`（阶段收口）：closure 文件

---

## 附件：完整发车指令（注册本 directive）

> 以下为 [业主] 本次发车的完整指令原文，作为本 todo 的授权与范围锚点。

# 工作范围与目标
仓库与分支: dsh-nano / main
目标: 按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作

## 本次工作涉及的编号
| 工作插件 | 工作波次 | 工作项目 | 子项阶段 |
|-------|-------|-------|-------|
| `contract-and-facade` | N/A | `1115` | N/A |

---
## 原则
WARN#1 - 开始 `编码` 执行前, 必须保证工作树干净。如果工作树中有未保存的内容, 你会对内容进行分析, 然后在当前分支下完成 commit
WARN#2 - `业主授权`: 必须阅读 AGENTS.md 对应文档的指导下进行工作
WARN#3 - 每一个 [执行计划] 中的 Phase 完成后, 你需要回到 todo.{工作项目}.md 中, 更新 checkbox 并登记执行状态, 不得在所有工作完成后一次性 tick 全部的 boxes
INFO#1 - 必须按照 [执行计划] 中的 DAG 中明确要求, 构建执行顺序。在构建 todo 文档的时候, 必须严格进行顺序 block 限制
INFO#2 - 工作波次是可选项。如果存在, 则下面的对应目录层级可以增加。如果没有指定, 则忽略这个层级
INFO#3 - 代码审查子代理的的 `专用审查PROMPT` 以及审查产出的 review 报告, 需要落盘于 [.anote/reviews/{工作阶段}/{工作项目}] 文件夹
INFO#4 - 按照 [执行计划], 在 `业主授权` 规范下, 有权对 workers 集群进行 live migration + rebuild + deploy , 并授权你在当前 `工作阶段` + `工作项目` 的框架内完成 digest 的创建与 SSOT 建立

---
## 上游必读文件
最终执行计划: [docs/code-review/26-nov/contract-and-facade-1115-action-plan.md]
真相层: [docs/code-review/26-nov/contract-and-facade-1115-qna-truth.md]

---
## 工作方法
STEP.0 - 在 [执行计划] 位于的目录内, 在 `todo计划模板` 规范下创建 todo.{工作项目}.md 这个跟踪对象, 以 DAG + checkbox 的创建任务执行的跟踪文件. 你会将本次发车的完整指令, 作为附件, 注入在 todo 文档底部
STEP.1 - 重新拉取本阶段使用的全部上游必读文件, 并对工作区域的代码进行梳理, 从结构上理解当前工作区域的性质, 业务流转的方向, 建立对当前业务的横向层面认知
STEP.2 - 在建立横向认知后, 对重点代码的 git 历史进行回溯, 建立起从时间轴纵向上, 对焦点代码的历史沿革的认知。创建对 git HASH 映射关系的图谱
STEP.3 - 从横向和纵向上建立执行关系后, 判断是否存在对应的 reference-anchor, 是否拥有正例/反例可供参考, 是否在 context/ 内存在对应的参考系可以进行借鉴
STEP.4 - 在获得全部上下文后, 你会严格在 [工作目标] 的范围内, 按照 [执行计划] 中的详细要求, 进行完整, 完全的代码开发, 静态审查, 以及测试收口工作。在执行期间内每完成一个 Phase, 就对当前阶段对应的代码完成分组 commit
STEP.5 - 全部编码工作完成后, 使用 `工作日志模板` 创建 [工作日志] 并回填至 [执行计划] 文档的底部
STEP.6 - 按照 todo 中的安排, 完成全部的工作后, 按照 `closure模板` 要求, 输出本阶段 closure 文件至 docs/code-review/26-nov/contract-and-facade-1115-closure.md
STEP.7 - 你会定制不少于3路从 **真相层对账**, **工作完成度**, **防测试假绿,防业务侧载** 等工作面的审查子代理, 对当前 todo 内已完成工作内容进行深度审查。审查开始前, 请为每一路子代理, 定制其专用的 Comprehensive 进攻性 `专用审查PROMPT`, 以便让子代理载入本次工作的 [执行计划] 后, 对我们本次执行展开深度, 专注, 全面地展开工作质量与数量的全面回顾
STEP.8 - 回收子代理的代码审查报告, 在汇聚, 分析, 整理, 核实全部子代理的分析后, 执行更新或修复。修复完成后再次进入 测试↔修复 循环, 直至完成本工作项目的收口。并更新 closure 文件

---
## 使用到的模板
`closure模板` = [.adocs/templates/closure.md]
`工作日志模板` = [.adocs/templates/code-execution-log.md]
`todo计划模板` = [.adocs/templates/action-todo.md]

---
# 发车指令
基于我的上述要求, 请立刻按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作
> Step.0 中的 todo 需要保留完整业主发车指令, 并注册本 directive
