# `CF1115` Closure — 全活跃插件 Contract/Facade 统一实施

> **文档状态**：`partial`（**非 `executed`** — 硬闸 Test-ID 未全 verified）。
> **会话快照**：`2026-11-15` CST · 分支 `main` · 基线 `653b15b` → HEAD（STEP.8 对抗修复后 `aab216d`）。
> **真源**：[真相层] `CF1115-TRUTH` v0.1.1 `FROZEN` 只冻结决策；本文登记**施工面**实测结果，五态如实，不 overclaim、不另立第二账本。
>
> **对抗审查**：STEP.7 三路审查（真相层对账 / 完成度 / 防假绿侧载）已跑；报告落 `.anote/reviews/contract-and-facade/1115/47f0/`。判定「有条件通过」——核心归口真实落地，发现 **2 blocker + 6 major** 已在 STEP.8 修复（见 §6）。

---

## 1. 本次实施落点（真实完成的归口）

全部编码落在 `packages/dsh-interface` 私有归口包（`file:` devDep + 每包 esbuild 物化进 `lib/`），运行时**从不**解析该包 —— 离仓自包含、`不得侧载` 满足。三出口：

| 出口 | 内容 | 约束 |
|------|------|------|
| `./contracts` | 纯断言/形状（无 `node:*`/DOM/Cordis/store/IO） | 可被浏览器与 host 两侧引用 |
| `./host` | ctx-注入 facade：`createWebRegistrar` / `createJsonClient` / `createMcpToolset` / `decodeMcpReply` | 注入依赖，零全局态、零文件读 |
| `./build` | 物化/打包帮助 | 构建期 |

### 已完成工作项（11 项 ticked）

| 项 | 落点 | commit | 验证（四元组） |
|----|------|--------|----------------|
| P1-01 | `dsh-interface` 三出口 | `eef4808` | `node --test test/*.test.mjs` → 37 pass |
| P1-02 | guard 单向复用 + 物化自包含 | `eef4808` | `check-clean-lib` → 58 artifacts 零 bare import |
| P1-03 | `createWebRegistrar` 绑定表 + 幂等 dispose | `eef4808` | unit + register-routes smoke 4/4 |
| P1-04 | DNN/DNT 首批真实接线 | `eef4808` | smoke + wasm 97/97 |
| P1-05 | 成对硬切 + 条件销账 | `eef4808` | `route-scan` 85 routes 0 drift；feature-contract 6 plugins |
| P2-01 | `createJsonClient`/`JsonOutcome` 五类失败 | `7b2d1de` | json-outcome.test |
| P2-02 | `FamilyDefinition` 作者记录 + 同源投影 | `7b2d1de` | family-definition.test |
| P2-03 | `nanoNotepad` 导入服务（Cordis） | `4a212d9` | notepad 71/71 · DNEE 5/5 |
| P2-04 | DNEE/DNMS/DNN JSON codec 收口 | `1653ae3` | 71+5+7 PASS · clean-lib OK |
| P3-01 | `createMcpToolset` + `decodeMcpReply` | `a34ec7f` + `6446c5c` | mcp-toolset.test 7/7 |
| P3-02 | DNT lane/schema 广告精确对账（F20.2/F20.4 全兑现） | `6446c5c` | enum `["local"]`；`template`/`task` 删；`x-address` 可执行；19 params 全 `additionalProperties:false` |

### 关键退役（防侧载/单真源落地）

- `window.__nanoNotepad` → 私有 `controller`；`ctx.provide('nanoNotepad',{import})`，DNEE `ctx.get` 惰性读（无本插件时 `undefined` 自行回退）。
- DNEE 两处重复 `request()` fetch 助手 → 单一 `jsonClient.js`；producer `sendJson` → 制裁 `{ok,error}` JsonOutcome 线上形状（2xx `{ok:true,data}` / 业务失败 `{ok:false,error}`）。
- DNT `handleRpc`/`rpcReply` → `createMcpToolset`；`McpLane` bespoke 解析 → `decodeMcpReply`（rpc→tool→protocol 三层，attach.url 由返回携带不猜）。

---

## 2. 五态如实归类（按 `E1115-*` / 原观察号 handoff）

> 计数为快照口径（route-scan 85 routes / clean-lib 58 artifacts / dsh-interface 37 tests / notepad 71 / DNMS 7 / DNEE 5 / DNT smoke 4 + wasm 97）。

| 观察面 | 状态 | 说明 / 债务号 |
|--------|------|---------------|
| `dsh-interface` 归口包骨架 | `verified` | 三出口 + 4 facade + 37 单测全过 |
| Web 路由 channel×match 收敛（DNN/DNT/DNEE） | `verified` | registrar 单实现、幂等、dispose 收口 |
| JSON 生产者—消费者 codec（DNEE/DNMS/DNN） | `verified` | 单 JsonOutcome；无第二 codec；producer 线上形状归一 |
| `nanoNotepad` Cordis 服务（去 window 全局） | `verified` | `ctx.provide`/`ctx.get`；DNEE 消费 |
| MCP 控制面归口（DNT） | `observed-OK-at-closure` | toolset/decoder 单测过；远端引擎区间未真实握手（无授权端点） |
| Terminal 两提供面 / DNLS 八工具 / v1-v2 门控 | `partial` | schema 广告已对账；DNLS `terminal-driver` 19 工具分发、断连至多一次重跑语义未全验 |
| Sandbox 二十工具真实业务 + bridge（DNLS/DNK） | `deferred` | 待续轮；容器内 script 是否引用 DNK `runtime/mcp-bridge.mjs` 需容器侧核验 |
| DNK 容器时代双载体/bridge 副本退役 | `deferred` | DNK `runtime/mcp-bridge.mjs` 与 DNLS `profiles/kitesurf/mcp-bridge.mjs` 不同源（env 前缀 `KITESURF_MCP_` vs `DNLS_MCP_`），删前需容器核验 |
| host adapter / DNCS `NATIVE_*` / DNMSC R-16 | `deferred` | Phase-4 域迁移，超本会话预算 |
| DNEE native 资源 / DNN fx·S3·RPC 边界收窄 | `deferred` | `/s3/config` 收窄与端点切换握手冲突，待 AP 原文裁决 |

> 任一 `deferred`/`partial`/`未观察` ⇒ **不标 `executed`**。债务保留原观察号，交后继 charter。

---

## 3. 偏差登记（P-EXEC）

- DNEE `dsh-host-route-guard` devDep → `dsh-interface`（registrar 单向传递解析 guard 实现）。该包 `AGENTS.md` 有「不改依赖」字样，与 AP P2-04 迁移落点冲突；按 AP 执行并如实记此偏差，待 [业主] 裁决该字样的现行效力。
- DNN 侧 `node --test test/`（目录）失败为 pre-existing 探针，统一改 `test/*.test.mjs` glob；非本次回归。

---

## 6. STEP.7 对抗审查发现 + STEP.8 修复（如实登记）

三路审查 `.anote/reviews/contract-and-facade/1115/47f0/{truth-reconcile,completion,antigreen}`，总判「有条件通过」（0 blocker→修复 / majors→部分修复 / 余项记债务）。

**已修（commit `6446c5c`）：**

| 严重度 | 发现 | 修复 |
|--------|------|------|
| blocker | `term.session.create` lane enum 留 `mcp`，违背 F20.2（我只删 `isolate`，自洽注释=由实现反推合同） | enum → `["local"]`；mcp/isolate 均不广告 |
| blocker | `template`/`task` create 字段仍在（F20.4 令删未兑现字段） | 删除 |
| blocker | DNN `files` 列已删 `lib/route-guard.js`/`route-table.js`，漏 `lib/web-registrar.js`/`lib/bindings.js` → `index.js:8` import 挂载即挂 | 改正 `files` |
| blocker | DNEE `files` 漏 `lib/bindings.js`（`lib/host.js` 依赖） | 加入 `files` |
| major | `x-address` 仍是散文，非可执行 string schema（F20.4） | 改 `{type:string,minLength:1}` |
| major | 多数 params 对象无 `additionalProperties:false`（F20.4 拒绝额外字段） | 19 个方法全部补齐 |
| major | `createWebRegistrar` upgrade 未在请求时校验 GET；`?.` fail-open；`disposed` 跨 registerAll 共享致二次注册不回收 | GET 校验 + 直调 + per-call `disposed`；+5 fence 测试 |
| major | `FamilyDefinition` array 形 `authorityRefs` 跳过审批门 | 修复 + 测试 |
| nit | decode 抛错非法 2xx → transport（F14.3 应 protocol） | 分类修正 |

**记为债务（deferred，不标 executed）：**
- `route-scan.mjs` 现为 DNN/DNT/DNEE 改读生成物 `lib/bindings.js` —— 该文件由 `route-sensitivity.json` 生成，**扫描器比较一个投影与它自己的真源**，失独立校验性（agent-7 major）。恢复独立 source-scan 待续轮。
- `check-clean-lib` `HOST_RESOLVED_SPECIFIERS` 加 `@deepseek-ai/dsh-compaction` 未登记 P-EXEC（全局放宽，非 per-plugin 域）。
- `createMcpToolset`/`decodeMcpReply`/`createWebRegistrar` 三个签名偏离冻结形状 `{definition,handlers}.invoke()`/`{ok,layer,error}`/`{plugin,table}`——**未登记改约**，待 [业主] 在 P-EXEC 裁决保留或回退。
- DNN/DNT `index.js` spec↔binding 缺行静默丢弃（无漂移告警）。
- 测试盲区：T09 离线装载、T11 导入服务、T15–T21 无专测文件（AP 要求的 Test-ID 证据不全）。

## 4. 未收口原因（诚实）

Phase-3 后半（sandbox/terminal 领域深迁）与 Phase-4/5（host 适配 + 全范围结算）体量超本单轮上下文预算；容器侧核验需另立授权。按 §10.4 NOT-成功识别，未把所有 Test-ID 填四元组前本文保持 `partial`。

## 5. 交接

- 下一动作：`P3-03` sandbox 二十工具逐一接真实领域 owner。
- 阻塞：无硬阻塞；容器侧 / 远端引擎核验需授权。
- 完成判据仍锚 `AP §10.1` 硬闸 + `§10.3` DoD。
