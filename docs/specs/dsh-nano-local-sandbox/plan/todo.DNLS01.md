# `DNLS01` Action Todo — macOS 平台切割

> 文档性质：`action-todo`（DAG-guided execution；不是新的设计或授权文件）
> 目标：按已冻结的 DNLS01 执行计划，在 worktree `dnls01-macos-platform-cutover` 完成 [DNLS] 编码、测试、硬切与文档，并按 Phase 分组 commit
> In-scope：执行计划 §2.1 S1–S4 与 §3 的 P1-01…P8-02
> Out-of-scope：执行计划 §2.2 O1–O4；不改 QNA 冻结行；不修无关 notepad 断链
> 上游依据：`docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md`（冻结真相优先于 v1.1 兼容建议）
> 关联 action-plan：`docs/specs/dsh-nano-local-sandbox/plan/DNLS01-macos-platform-cutover.md`
> authority / owner：[业主] · 授权边界：本 directive 授权在该 worktree 内编码、测试、分阶段 commit；合并回 `main` 与删除 worktree 在收口后执行
> 基线：worktree 创建点 `0854d83`（`main`）
> 文档状态：`executing` · 执行状态：`in-progress`

## 1. 核心脊（必须 follow）

- **目标与边界**：交付可运行的 `dsh-nano-local-sandbox`（id `nano-local-sandbox`），并完成对 [DNK] / [DNT] 的一次性硬切。不实现 NVX 真后端，不新增 errorId，不加 `sandbox` lane，不留 façade。
- **权威与决策**：冻结 QNA `T-O-1`…`T-O-18` 与执行计划。冲突时 QNA 赢。未确定的问题不在本 todo 里改约。
- **完成定义**：§3 每个 Item 的完成判据成立，且对应 Test-ID 有四元组 `commit + 命令 + exit 0 + UTC`；做不到的保持未勾选并写明原因。本计划没有预先允许的 `deferred`。
- **证据原则**：通过必须来自命令退出码与断言，不来自「写过计划」或旧 e2e 退出码。
- **执行回写**：完成一个 Item 立刻把 `- [ ]` 改成 `- [x]`，登记 `complete`、UTC 时间与证据。未完成保持未勾选。
- **交接原则**：阻塞项写原因、下一动作与承接方。

## 2. 依赖关系 / DAG 指引

### 2.1 依赖图

```text
P0-01 ──▶ P1-01 ──▶ P1-02 ──▶ P1-03
                                 │
                                 ▼
                              P2-01 ──▶ P2-02 ──▶ P2-03
                                                   │
                                                   ▼
                              P3-01 ──▶ P3-02 ──▶ P3-03 ──▶ P3-04
                                                               │
                                                               ▼
                              P4-01 ──▶ P4-02 ──▶ P4-03 ──▶ P4-04
                                                               │
                                                               ▼
                                                    P5-01 ──▶ P5-02
                                                               │
                                                               ▼
                              P6-01 ──▶ P6-02 ──▶ P6-03
                                                   │
                                                   ▼
                              P7-01 ──▶ P7-02 ──▶ P7-03 ──▶ P7-04
                                                               │
                                                               ▼
                                                    P8-01 ──▶ P8-02
                                                               │
                                                               ▼
                                                    P9-01 ──▶ P9-02 ──▶ P9-03
```

失败路径：任一 Phase 的测试非 0，不得勾选该项，不得开始下一 Phase 的 commit。P6-03 的 pack 存档不存在时，P7-01 不得开始。

### 2.2 节点台账

| 节点 ID | 目的 / 动作 | depends on | entry condition | exit condition | failure / blocked / handoff |
|---------|-------------|------------|-----------------|----------------|------------------------------|
| P0-01 | 建立本跟踪文件 | 无 | 工作树干净且 worktree 已建 | 本文件含 DAG 与发车指令 | 缺上游则停，不编码 |
| P1-01…P1-03 | 包身份与 backend | P0-01 | Phase 1 计划原文 | T01 T02 T03 exit 0 | 不放宽 engines.dsh |
| P2-01…P2-03 | profile 与 confine 构建 | P1-03 | Phase 1 commit 已在分支上 | T04 T05 T06 exit 0 | 坏 manifest 不得 ready |
| P3-01…P3-04 | 实例、指纹、history、回收 | P2-03 | Phase 2 commit | T07 T08 T09 T10 exit 0 | 不得新增容量 errorId |
| P4-01…P4-04 | MCP、HTTP、CDP、terminal | P3-04 | Phase 3 commit | T12 T13 T14 T15 exit 0 | 不改 [DNK]/[DNT] 源码 |
| P5-01…P5-02 | 错误目录与三门禁 | P4-04 | Phase 4 commit | T16 T17 exit 0 | 不新增第四道门禁 |
| P6-01…P6-03 | 独立跑通、对等、pack 存档 | P5-02 | 三门禁已绿 | T11（只扫本包）T18 T19 T22 | 无 container CLI 时 T18 标未观察，计划不得 executed |
| P7-01…P7-04 | 硬切 | P6-03 | 快照 commit 与 pack 存档存在 | T11 全仓、T20、T15、T21、T23、T24 | 无存档不得开工 |
| P8-01…P8-02 | 文档与 U10 | P7-04 | 硬切 commit | T25 与文档断言 | 不改既有 fingerprint |
| P9-01…P9-03 | 日志、closure、三路审查 | P8-02 | 编码项已回写 | closure 落盘且审查修复闭环 | 审查未核对不得宣称收口 |

**DAG notes：** 严格按上图串行。同一 Phase 内前一项未绿，后一项不 commit。P6 禁止用全仓 spawn 断言。P6 跑 T20 必须失败（未到硬切）。

## 3. 工作项清单（必须有 checkbox）

### 3.1 工作项与执行登记

- [x] `P0-01` — 创建本 todo 并登记发车指令
  - **落点 / 对象**：`docs/specs/dsh-nano-local-sandbox/plan/todo.DNLS01.md`
  - **完成判据**：DAG、checkbox、底部完整 directive 都在
  - **验证映射**：人工核对 · **依赖**：无
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:13:00Z` · **证据 / 备注**：本文件已含 DAG 与发车指令
- [x] `P1-01` — 新建包身份（package.json / cordis / files 白名单）
  - **落点 / 对象**：`dsh-nano-local-sandbox/package.json`、`cordis.patch.yml`
  - **完成判据**：包名、id、`engines.dsh` 与 [DNK] 相同；`files` 不含 `linux-prefix/`
  - **验证映射**：`DNLS01-T01` · **依赖**：`P0-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:13:00Z` · **证据 / 备注**：`node --test test/identity.test.mjs test/backend.test.mjs test/no-sandbox-provider.test.mjs` exit 0
- [x] `P1-02` — inject 五元组与 apply 只走 registerRoutes
  - **落点 / 对象**：`dsh-nano-local-sandbox/index.js`、`AGENTS.md`
  - **完成判据**：inject 集合等于计划；无消费者名；apply 不直接 `ctx.webServer.register`
  - **验证映射**：`DNLS01-T01` `DNLS01-T03` · **依赖**：`P1-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:13:00Z` · **证据 / 备注**：同上，6 tests pass
- [x] `P1-03` — 13 方法 backend；NVX 除 capabilities 外拒绝
  - **落点 / 对象**：`src/host/backend.js`、`backend-apple.js`、`backend-nvx.js`
  - **完成判据**：公开参数出现 Apple 名词则构造函数抛错；`backend.nvx.unimplemented` 不进目录
  - **验证映射**：`DNLS01-T02` · **依赖**：`P1-02`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:13:00Z` · **证据 / 备注**：`backend.test.mjs` exit 0
- [x] `P2-01` — profile 校验器，缺字段 / latest / caret / 坏 digest / 坏 ref / verify / container machine 都拒绝
  - **落点 / 对象**：`src/host/profile-registry.js`、`profiles/kitesurf/profile.yaml`
  - **完成判据**：拒绝路径上 `ensureImage` 次数为 0；`scope` 从 YAML 读出
  - **验证映射**：`DNLS01-T04` `DNLS01-T05` · **依赖**：`P1-03`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:20:00Z` · **证据 / 备注**：`node --test test/profile-reject.test.mjs test/profile-load.test.mjs` exit 0。`DNLS01-T23` 仍 pending，要等九条对照都在
- [x] `P2-02` — 配方搬进 profile 目录，不改 [DNK] 原文件
  - **落点 / 对象**：`profiles/kitesurf/Dockerfile`、`entrypoint.sh`、`mcp-bridge.mjs`
  - **完成判据**：`__res_init` 注释与 `node:22-bookworm-slim` 仍在；本包不 import [DNK]
  - **验证映射**：`DNLS01-T05` · **依赖**：`P2-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:20:00Z` · **证据 / 备注**：`profile-load.test.mjs` exit 0；[DNK] runtime 未改
- [x] `P2-03` — 构建 argv 只经 `ctx.sandbox.confine`；缺失则失败关闭
  - **落点 / 对象**：`src/host/build.js`
  - **完成判据**：有 confine 时裸 spawn 为 0；无 sandbox 时抛错且 spawn 仍为 0
  - **验证映射**：`DNLS01-T06` · **依赖**：`P2-02`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:20:00Z` · **证据 / 备注**：`node --test test/build-confine.test.mjs` exit 0
- [x] `P3-01` — per-instance registry；ensure 幂等；adopt/degrade 不串实例
  - **落点 / 对象**：`src/host/instance-registry.js`
  - **完成判据**：同指纹两次 ensure，id 相同且 create 次数为 1；无模块级 phase
  - **验证映射**：`DNLS01-T07` · **依赖**：`P2-03`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:22:00Z` · **证据 / 备注**：`node --test test/instance.test.mjs` exit 0
- [x] `P3-02` — policyFingerprint 四元组；不等则 policy-stale 且不 stop
  - **落点 / 对象**：`src/host/policy-adapter.js`
  - **完成判据**：改 mode 与改 workspaceRoot 的行为符合 T08；无热改挂载
  - **验证映射**：`DNLS01-T08` · **依赖**：`P3-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:22:00Z` · **证据 / 备注**：`node --test test/policy-stale.test.mjs` exit 0
- [x] `P3-03` — 每实例一份 history，无第二写者
  - **落点 / 对象**：`src/host/state-service.js`
  - **完成判据**：磁盘记录数等于写入次数；无 `history.jsonl`
  - **验证映射**：`DNLS01-T09` · **依赖**：`P3-02`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:22:00Z` · **证据 / 备注**：`node --test test/history-single.test.mjs` exit 0
- [x] `P3-04` — maxInstances 与 idle sweep；超时只从 profile 读
  - **落点 / 对象**：`src/host/instance-registry.js` 的 sweep、夹具 profile
  - **完成判据**：生产 YAML 仍含 `1800000`；夹具 50ms；达上限不分配新 id
  - **验证映射**：`DNLS01-T10` · **依赖**：`P3-03`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:22:00Z` · **证据 / 备注**：`node --test test/lifecycle.spike.test.mjs` exit 0
- [x] `P4-01` — 恰好 20 个 `sandbox_*` 工具
  - **落点 / 对象**：`src/host/mcp-sandbox.js`
  - **完成判据**：tools/list 集合差为空；诊断不依赖宿主 POST
  - **验证映射**：`DNLS01-T12` · **依赖**：`P3-04`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:26:00Z` · **证据 / 备注**：`node --test test/mcp-tools.spike.test.mjs` exit 0
- [x] `P4-02` — `/nano-local-sandbox/*` 全部经 registerRoutes，sessionBinding true
  - **落点 / 对象**：`src/host/routes.js`、`lib/route-table.js`
  - **完成判据**：未列表路由不能注册；无 requestRejection 时 register 次数为 0
  - **验证映射**：`DNLS01-T13` · **依赖**：`P4-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:26:00Z` · **证据 / 备注**：`node --test test/routes.test.mjs` exit 0
- [x] `P4-03` — per-instance CDP keeper
  - **落点 / 对象**：`src/host/cdp-keeper.js`
  - **完成判据**：OPEN 时不得 page-lost；关闭后 page-lost 或按 lastUrl 恢复，且不是旧 DOM
  - **验证映射**：`DNLS01-T14` · **依赖**：`P4-02`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:26:00Z` · **证据 / 备注**：`node --test test/cdp-keeper.spike.test.mjs` exit 0
- [x] `P4-04` — terminal 8 工具、attach.url、pong 0x0A
  - **落点 / 对象**：`src/host/terminal-driver.js`、`profiles/terminal/`
  - **完成判据**：lines/cols/rows/额外字段都拒绝；无 path 键
  - **验证映射**：`DNLS01-T15` · **依赖**：`P4-03`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:26:00Z` · **证据 / 备注**：`node --test test/terminal-contract.test.mjs` exit 0。P7 的 isolate / audit.jsonl 断言尚未跑
- [x] `P5-01` — 唯一 ERROR_CATALOG（7 个 kitesurf.* + 2 个 sandbox.*）
  - **落点 / 对象**：`src/host/error-catalog.js`
  - **完成判据**：shot.fit 为 400；技能正文由目录派生
  - **验证映射**：`DNLS01-T16` · **依赖**：`P4-04`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:40:00Z` · **证据 / 备注**：`node --test test/error-catalog.test.mjs` exit 0。全仓 `window.__dnkPick` 仍留到硬切
- [x] `P5-02` — 三道既有门禁扫到 [DNLS] 与 [DNT]，exit 0
  - **落点 / 对象**：`scripts/route-scan.mjs`、`scripts/check-clean-lib.mjs`、`scripts/check-feature-contract.mjs`、`security/*`
  - **完成判据**：去掉 [DNLS] 后路由门禁非 0；多一条路由常量时扫描器非 0
  - **验证映射**：`DNLS01-T17` · **依赖**：`P5-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:40:00Z` · **证据 / 备注**：三门禁 exit 0；`test/route-scan-coverage.test.mjs` exit 0
- [x] `P6-01` — [DNLS] 不 import [DNK]；本包 容器 CLI spawn 只在 backend-apple.js
  - **落点 / 对象**：本包运行时
  - **完成判据**：T11 在 P6 只扫本包
  - **验证映射**：`DNLS01-T11` · **依赖**：`P5-02`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:45:00Z` · **证据 / 备注**：`node --test test/container-spawn-sites.test.mjs` exit 0
- [x] `P6-02` — fork e2e 与无 agent 用例
  - **落点 / 对象**：`dsh-nano-local-sandbox/scripts/e2e-ego.mjs` 与对应测试
  - **完成判据**：23 个 record 名称为真；URL 只以新前缀开头；旧脚本退出码不算
  - **验证映射**：`DNLS01-T18` `DNLS01-T19` · **依赖**：`P6-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:45:00Z` · **证据 / 备注**：静态 fork 与 `ui-without-agent.spike.test.mjs` exit 0。本机有 `container`，但没有跑 ego 实浏览器，T18 不标全绿
- [x] `P6-03` — 快照 commit 与三包 npm pack --dry-run 存档
  - **落点 / 对象**：`dsh-nano-local-sandbox/test/artifacts/pack-manifest.json`
  - **完成判据**：存档先于 T22；T22 不得自己生成存档
  - **验证映射**：`DNLS01-T22` · **依赖**：`P6-02`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:45:00Z` · **证据 / 备注**：存档 commit `178eb35`；`test/pack-manifest.test.mjs` exit 0
- [x] `P7-01` — 删除 [DNK] 容器资产与旧路由，不留 308
  - **落点 / 对象**：`dsh-nano-kitesurf/`
  - **完成判据**：全仓 `容器 CLI spawn` / `容器 CLI execFile` 只在 `backend-apple.js`
  - **验证映射**：`DNLS01-T11` `DNLS01-T20` · **依赖**：`P6-03`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:50:00Z` · **证据 / 备注**：三门禁 exit 0；`test/residue.test.mjs` exit 0。容器 CLI 仍只在 `backend-apple.js`，因为 `T-O-9` 要求这个调用点存在
- [x] `P7-02` — [DNK] client / skill 改指新前缀；点选留在进程内存
  - **落点 / 对象**：`dsh-nano-kitesurf/src/client/`、`lib/skill.js`
  - **完成判据**：`window.__dnkPick` 为 0；技能正文逐字等于派生表
  - **验证映射**：`DNLS01-T16` `DNLS01-T20` · **依赖**：`P7-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:50:00Z` · **证据 / 备注**：`dsh-nano-kitesurf/test/*.mjs` 38 pass。`window.__nks` 已改名
- [x] `P7-03` — [DNT] attach.url、pong、去掉 isolate、审计并入 [DNLS]
  - **落点 / 对象**：`dsh-nano-terminal/`
  - **完成判据**：无 sandbox lane；local 仍能开；不调用现成 streamBase() 去拼路径
  - **验证映射**：`DNLS01-T15` · **依赖**：`P7-02`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:50:00Z` · **证据 / 备注**：`attach.url`、pong `0x0A`、源码去掉 isolate、审计改到 `term.audit`。`lib/client.js` 未重建
- [x] `P7-04` — 台账删除旧前缀与旧能力名
  - **落点 / 对象**：`security/route-sensitivity.json` 等
  - **完成判据**：三门禁再次 exit 0
  - **验证映射**：`DNLS01-T17` `DNLS01-T20` `DNLS01-T21` `DNLS01-T23` `DNLS01-T24` · **依赖**：`P7-03`
  - **执行状态**：`complete` · **执行时间**：`2026-11-14T05:50:00Z` · **证据 / 备注**：两份台账都是 56 条且三门禁 exit 0。`DNLS01-T23` `DNLS01-T24` 还没跑
- [ ] `P8-01` — 仓根清单、README、三包 AGENTS、v0.9/v1.1 状态条
  - **落点 / 对象**：`AGENTS.md`、`README.md`、各包 AGENTS
  - **完成判据**：清单含 [DNLS]；不改两份设计文的实测数据
  - **验证映射**：`DNLS01-T01` · **依赖**：`P7-04`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `P8-02` — accepted-risks.json 末尾追加四条 dnls:defer-
  - **落点 / 对象**：`security/accepted-risks.json`
  - **完成判据**：旧 fingerprint 一个不改
  - **验证映射**：`DNLS01-T25` · **依赖**：`P8-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `P9-01` — 把执行日志 append 到 action-plan 底部
  - **落点 / 对象**：`DNLS01-macos-platform-cutover.md`
  - **完成判据**：不改计划主体；每行对应 Item ID
  - **验证映射**：日志自检 · **依赖**：`P8-02`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `P9-02` — closure
  - **落点 / 对象**：`docs/specs/dsh-nano-local-sandbox/closure/DNLS01-closure.md`
  - **完成判据**：close-type 与证据四元组一致；无预先 deferred
  - **验证映射**：closure 自检 · **依赖**：`P9-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `P9-03` — 至少三路审查（真相对账 / 完成度 / 防假绿与防侧载）并修复到收口
  - **落点 / 对象**：`.anote/reviews/dsh-nano-local-sandbox/DNLS01/na/`
  - **完成判据**：每路有专用审查 prompt 与报告；核实后的问题已修或明确未勾选
  - **验证映射**：审查报告 · **依赖**：`P9-02`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`

## 4. 验收与证据

| Check ID | 验证什么 | 方法 / 命令 / 产物 | 预期 | 实际结果 | 证据引用 | 状态 |
|----------|----------|--------------------|------|----------|----------|------|
| DNLS01-T01 | 身份与 inject | `node --test dsh-nano-local-sandbox/test/identity.test.mjs` | exit 0 | exit 0，6 tests 中的身份 2 条 | `2026-11-14T05:13:00Z` | pass |
| DNLS01-T02 | backend / NVX | `test/backend.test.mjs` | exit 0 | exit 0 | `2026-11-14T05:13:00Z` | pass |
| DNLS01-T03 | 无 SandboxProvider | `test/no-sandbox-provider.test.mjs` | exit 0 | exit 0 | `2026-11-14T05:13:00Z` | pass |
| DNLS01-T04 | profile 拒绝 | `test/profile-reject.test.mjs` | exit 0 | exit 0 | `2026-11-14T05:20:00Z` | pass |
| DNLS01-T05 | profile 加载 | `test/profile-load.test.mjs` | exit 0 | exit 0 | `2026-11-14T05:20:00Z` | pass |
| DNLS01-T06 | confine | `test/build-confine.test.mjs` | exit 0 | exit 0 | `2026-11-14T05:20:00Z` | pass |
| DNLS01-T07 | ensure 幂等 | `test/instance.test.mjs` | exit 0 | exit 0 | `2026-11-14T05:22:00Z` | pass |
| DNLS01-T08 | policy-stale | `test/policy-stale.test.mjs` | exit 0 | exit 0 | `2026-11-14T05:22:00Z` | pass |
| DNLS01-T09 | 单份 history | `test/history-single.test.mjs` | exit 0 | exit 0 | `2026-11-14T05:22:00Z` | pass |
| DNLS01-T10 | 回收与上限 | `test/lifecycle.spike.test.mjs` | exit 0 | exit 0 | `2026-11-14T05:22:00Z` | pass |
| DNLS01-T11 | container 特权点 | `test/container-spawn-sites.test.mjs` | P6 只扫本包；P7 全仓 | P6 包内 exit 0 | `2026-11-14T05:45:00Z` | partial |
| DNLS01-T12 | 20 工具 | `test/mcp-tools.spike.test.mjs` | exit 0 | exit 0 | `2026-11-14T05:26:00Z` | pass |
| DNLS01-T13 | 路由 fail-closed | `test/routes.test.mjs` | exit 0 | exit 0 | `2026-11-14T05:26:00Z` | pass |
| DNLS01-T14 | CDP keeper | `test/cdp-keeper.spike.test.mjs` | 两段都断言 | exit 0 | `2026-11-14T05:26:00Z` | pass |
| DNLS01-T15 | terminal 契约 | `test/terminal-contract.test.mjs` | exit 0 | exit 0；P7 条款未跑 | `2026-11-14T05:26:00Z` | partial |
| DNLS01-T16 | 错误目录 | `test/error-catalog.test.mjs` | exit 0 | exit 0；`window.__dnkPick` 未扫 | `2026-11-14T05:40:00Z` | partial |
| DNLS01-T17 | 三门禁覆盖 | `test/route-scan-coverage.test.mjs` | 正向与负向 | 三门禁 exit 0，负向断言成立 | `2026-11-14T05:40:00Z` | pass |
| DNLS01-T18 | fork e2e | `test/e2e-fork.test.mjs` | 23 名称且 URL 采集 | 静态断言 exit 0；ego 实跑未做 | `2026-11-14T05:45:00Z` | partial |
| DNLS01-T19 | 无 agent | `test/ui-without-agent.spike.test.mjs` | 非 200 | exit 0 | `2026-11-14T05:45:00Z` | pass |
| DNLS01-T20 | 零残留 | `test/residue.test.mjs` | P6 必须失败；P7 后 PASS | - | - | pending |
| DNLS01-T21 | 测试标题超集 | `test/regression-count.test.mjs` | 超集 + 断言次数 | - | - | pending |
| DNLS01-T22 | pack 存档 | `test/pack-manifest.test.mjs` | 读事先存档 | exit 0，祖先 `178eb35` | `2026-11-14T05:45:00Z` | pass |
| DNLS01-T23 | 九条副作用 | `test/threat.spike.test.mjs` | 攻击 0 且合法 ≥ 1 | - | - | pending |
| DNLS01-T24 | 20 次 soak | `test/lifecycle.soak.test.mjs` | 与规定轨迹深相等 | - | - | pending |
| DNLS01-T25 | U10 四行 | `test/deferrals.test.mjs` | 旧 fingerprint 仍在 | - | - | pending |

- **状态词**：上表在对应 Phase 绿之前保持 `pending`。
- **可复核性**：PASS 时回写 commit、命令、exit 0、UTC。
- **真实成功**：容量用「不创建新实例且非 2xx」判定，不用新 errorId。T18 无 Apple `container` 时标 `未观察`，不得把计划标成 `executed`。

## 5. 当前状态与交接

- **当前节点 / 已完成**：`P8-01` / `P0-01` 至 `P7-04`
- **下一动作**：Phase 8 文档与 U10。`DNLS01-T18` 的 ego 实跑、`DNLS01-T23`、`DNLS01-T24` 仍未观察
- **当前阻塞**：无
- **待 owner / 外部决定**：无。真实容器 e2e 若本机无 CLI，T18 保持未观察并在 closure 写明
- **最终交接目标**：合并回 `main` 后按 AGENTS.md 删除本 worktree（收口时）

| Item / node | 当前状态 | 原因或证据 | 下一动作 | 责任 / 承接方 | 重开条件 |
|-------------|---------|------------|----------|---------------|----------|
| P0-01 | in-progress | 本文件 | 写完即勾选 | 执行者 | 发车指令被改写 |
| P1-01 | not-started | 未编码 | Phase 1 | 执行者 | P0 完成 |

## 6. 已启用插件

#### P-CTX — Context / rebaseline

- **触发理由**：接续已 reviewed 的执行计划，基线会随 commit 前移
- **本任务最低要求 / 允许写面**：只在 worktree 分支 `dnls01-macos-platform-cutover` 改代码
- **实际记录**：worktree 从 `0854d83` 拉出
- **证据 / 状态 / handoff**：每 Phase commit 回写本节与 §4

#### P-SCOPE — Scope / no-sideload

- **触发理由**：跨 [DNLS]/[DNK]/[DNT]，且有容器特权与路由边界
- **本任务最低要求 / 允许写面**：禁止 SandboxProvider、禁止新 lane、禁止插件互 import、container CLI 只在 `backend-apple.js`
- **实际记录**：随 T03 / T11 / T23 登记
- **证据 / 状态 / handoff**：越界即该 Phase 不勾选

#### P-REF — Reference-anchor

- **触发理由**：执行计划 §7 锚表
- **本任务最低要求 / 允许写面**：符号名为准；不把 v1.1 的 façade 当正例
- **实际记录**：正例是 route-guard 的 fail-closed 注册；反例是 [DNK] 把容器特权和 id 绑在一起
- **证据 / 状态 / handoff**：见各 Phase commit

#### P-TEST — Test ledger

- **触发理由**：T01–T25
- **本任务最低要求 / 允许写面**：§4 表；没有预先允许的 deferred
- **实际记录**：待跑
- **证据 / 状态 / handoff**：四元组缺一格则该项不是 PASS

#### P-EXEC — Execution log

- **触发理由**：多 Phase 执行
- **本任务最低要求 / 允许写面**：Phase commit 后回写 §3；计划底部日志在 P9-01 追加，不改计划主体
- **实际记录**：尚未有代码 commit
- **证据 / 状态 / handoff**：偏差逐条写

#### P-CLOSE — Closure / handoff

- **触发理由**：阶段收口
- **本任务最低要求 / 允许写面**：`docs/specs/dsh-nano-local-sandbox/closure/DNLS01-closure.md`
- **实际记录**：未写
- **证据 / 状态 / handoff**：P9-02

## 7. Todo 自检（提交或交接前）

- [ ] 核心脊 §§1–5 齐全
- [ ] DAG 依赖可读
- [ ] 每个 Item 都是 checkbox
- [ ] 每个 Item 都有完成判据和 Check-ID
- [ ] 适用插件已启用
- [ ] 未把计划写成实际完成
- [ ] 无未替换占位符

## 8. 发车指令（原文附件）

本 directive 于执行开始时注入。工作仓库与分支目标为 `dsh-nano / main`；编码发生在 `.agents/worktrees/dnls01-macos-platform-cutover`，收口后合并回 `main`。

```text
# 工作范围与目标
仓库与分支: dsh-nano / main
目标: 按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作

## 本次工作涉及的编号
| 工作插件 | 工作波次 | 工作项目 | 子项阶段 |
| dsh-nano-local-sandbox | N/A | DNLS01 | N/A |

## 原则
WARN#1 - 开始编码执行前, 必须保证工作树干净。如果工作树中有未保存的内容, 分析后在当前分支完成 commit
WARN#2 - 业主授权: 必须阅读 AGENTS.md 对应文档的指导下进行工作
WARN#3 - 每一个执行计划中的 Phase 完成后, 回到 todo.DNLS01.md 更新 checkbox 并登记执行状态, 不得在所有工作完成后一次性 tick 全部 boxes
INFO#1 - 必须按照执行计划中的 DAG 构建执行顺序。todo 文档必须严格进行顺序 block 限制
INFO#2 - 工作波次是可选项。本次为 N/A，忽略该层级
INFO#3 - 代码审查子代理的专用审查 PROMPT 以及审查产出的 review 报告, 落盘于 .anote/reviews/dsh-nano-local-sandbox/DNLS01/
INFO#4 - 按照执行计划, 在业主授权规范下, 有权对 workers 集群进行 live migration + rebuild + deploy, 并授权在当前工作阶段 + 工作项目的框架内完成 digest 的创建与 SSOT 建立

## 上游必读文件
最终执行计划: docs/specs/dsh-nano-local-sandbox/plan/DNLS01-macos-platform-cutover.md
真相层: docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md

## 工作方法
STEP.0 创建 todo.DNLS01.md，底部保留本发车指令
STEP.1 重新拉取上游必读并梳理代码
STEP.2 git 历史回溯
STEP.3 reference-anchor / 正例反例
STEP.4 按执行计划完整编码、静态审查、测试；每完成一个 Phase 分组 commit
STEP.5 工作日志回填至执行计划底部
STEP.6 closure 至 docs/specs/dsh-nano-local-sandbox/closure/DNLS01-closure.md
STEP.7 不少于 3 路审查子代理（真相层对账、工作完成度、防测试假绿与防业务侧载），每路先写专用审查 PROMPT
STEP.8 回收报告、核实、修复，测试与修复循环直至收口，并更新 closure

## 使用到的模板
closure模板 = .adocs/templates/closure.md
工作日志模板 = .adocs/templates/code-execution-log.md
todo计划模板 = .adocs/templates/action-todo.md
```
