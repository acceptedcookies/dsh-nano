# DNMS01 Closure · 异步压缩接管（dsh-nano-model-selector-compaction）

**Status**: implemented + live-verified + 拟真-tested | **Branch**: `dnms01-async-compaction` | **Date**: 2026-11-15

## 1. 交付范围（对照 STEP.0–8）

| Phase | 交付物 | 状态 |
|---|---|---|
| STEP.0–2 | `dsh-nano-model-selector@0.3.0` + `dsh-nano-model-selector-compaction@0.1.0`；`cordis.patch.yml` 4-preset 全重放互斥；`-11` state schema；`GET/PUT/POST` 三路由 | ✅ |
| STEP.3–5 | durable bracket 协议；`-18` 异步车道（B-arm→idle `runMaintenance`→同窗口 commit）；`-15` 策略文件；rail-4 面板；`-21` runtime 投影 | ✅ |
| STEP.6 | 三路对抗审（真相层对账 / 工作完成度 / 防假绿） | ✅ 报告在 `.anote/reviews/DNMS01/` |
| STEP.7 | T-FIX 收敛：durable-lock 泄漏 + P0 跨回合括号 + 13 项 review findings + idle 重入竞争 | ✅ |
| STEP.8 | 收口文档 + AP `## 12–14` 执行日志 + QNA R-16 六项裁决请求 | ✅ |

## 2. live 验收矩阵（dsh-dev，headless + web 双通道）

| 验收项 | 证据 | 判定 |
|---|---|---|
| B-line arm → maintenance commit | seq58–61 `turn:None`；`prepare→summarize→commit` 全在 `runMaintenance` 空闲窗口 | PASS |
| 异步唤醒 + adoption | seq74 `source.kind:'compaction-adoption-wake'` + `(Context compacted asynchronously; continuing.)` | PASS |
| pinned 尾部保留（内容观测） | seq60 `replace{37,45}` 保留 seq53 user + seq55 assistant | PASS |
| DC-1 fullOnly 拦截 | `pinned=40000,H=0.05` → `dcs:["DC-1"]` → 同步 FULL 不走异步 | PASS |
| S-line 0.80 FULL | seq65–68 `turn:5` 同步 FULL（over-health 二次压实） | PASS |
| L4 持久化 / resume | `session-2e5b4535` resume 无 corrupt，turn6/7 正常 | PASS |
| PUT 部分更新 + effective 重算 | `pinnedAsyncTokens`/`healthTargetAsync` 生效 | PASS |
| `ManualCompactionError` 升级桥 | `vendored-thrown instanceof upstream === true`（headless） | PASS |
| 格式律（P0 修复） | `turn/start crosses an open compaction` 不再复现 | PASS |
| `/compact` 手动命令 | `--json` 无命令面，模型 prompt 未路由；`compactNow()` 引擎层已由 S-line FULL 共享覆盖 | PARTIAL（命令面 live 未验，引擎路径已验） |
| OFF 态原生 restore | 全重放 patch 下 OFF 时 `compaction-basic` 原样，`--dump-config` 验证 | PASS |
| 前端面板 rail-4 + 水位编辑 | GUI「会话不可用」宿主 bug 阻塞交互测试；GET/PUT/switch 均 live 200 | PARTIAL（面板交互未验） |

## 3. 拟真测试（node:test）

`dsh-nano-model-selector-compaction/test/async-takeover.test.mjs` — **13/13 PASS**：arm→commit 时序、one-active、durable-lock、S-line owner、circuit 开/抑/复位、degraded vs DEFAULT_POLICY、runtime fold、surfaceOp 内容观测、abort→`end{error}`、model-switch veto。Hermetic（`DSH_DATA_DIR=mkdtemp`）。合计 compact-policy 10 用例 → **23/23 PASS**。

## 4. T-FIX 收敛清单

| # | 缺陷 | 修法 |
|---|---|---|
| P0-1 | `turn/start` 跨过开括号 → 会话 corrupt | 整条 `compactSurfaceRegion(owner:null)` 收进 `runMaintenance`（`turn:None`） |
| P0-2 | commit-failure 双写 `end{error}` | `episode.tx=null` 在 throw 前置 |
| P1 | idle 重入双 `compaction/end` | `_claimEpisodeMaintenance` 加 `running` 相位门 |
| -20 | `at` 恒 null | `event.data?.at` → `event.time`；`start→busy`/`end→completed\|failed` |
| -18⑧ | FULL 成功不复位 circuit | `_pressureGate` 成功路径复位 |
| -18 | episode 无超时 | `EPISODE_TIMEOUT_MS=120s` + `AbortSignal.any` |
| -18 | armed 饥饿 | `MAX_CLAIM_ATTEMPTS=3` → `starved` drop |
| -16 | vendored MCE `instanceof` 不命中 | 可变导出 + `upgradeManualCompactionError` 桥 |
| -11 | PUT 半空 model 过门 | 半空 → `invalid-model` 400；master 序校验 unconditional |
| -12 | `application:'failed'` 返 200 | → 500 + `switch-failed` |
| ledger | `bundle`/`degraded`/`switch-failed` 缺登记 | `feature-contract.json` 补齐 |
| -20③ | `overridden` 走 success 文案 | `compactSwitchOverridden` warn |

## 5. 诚实台账（未完全验收项）

- `/compact` 手动命令面：无 TTY 命令解析通道（`--json` 不路由），GUI composer 被宿主「会话不可用」bug 阻塞。引擎层 `compactNow()` 已由 S-line FULL 共享路径验证；命令面 live 验留 OPEN。
- 前端面板 rail-4 交互：`nms-trigger` disabled（同宿主 bug），面板 DOM 未 live 渲染。`GET/PUT/switch` 三路由已 live 200，UI 层留 PARTIAL。
- `ManualCompactionError` 升级依赖 headless `package.json` 的 `file:` dep（`@deepseek-ai/dsh-compaction` 从 dsh 全局 `node_modules` 解析）。无此 dep 的纯 link 安装下回落 vendored impl——`/compact` `instanceof` 门不命中（documented divergence，R-16.2 待裁决）。
- `session/prompt` 门（GUI「会话不可用」）：非本包缺陷，宿主侧 unresolved。

## 6. R-16 待裁决（QNA append-only）

1. `-10` 全重放 patch 机制即合同面？
2. vendored seam + `ManualCompactionError` 双轨即 `-16` 合同面？
3. `-18` adoption 改判：commit 在 maintenance 窗口而非下一 turn pre-step？
4. `agents` inject 在 `id:compaction` isolate 内经父层原型链可达是合法依赖？
5. `dsh plugin add` 默认 ON vs `-17` OFF 矛盾以哪份为准？
6. adoption-wake 用 `followup`（可见、耗一 turn）还是 `send`（静默）？

## 7. 残留治理

- `dnms01-force` 探针插件已从 headless profile `cordis.patch.yml` + `dependencies` 移除。
- `/tmp/dnms01-*` 调试日志文件与 `/tmp/dnms01-force/` 源码为临时工件，不影响交付物。
- `docs/specs/dsh-nano-model-selector/plan/DNMS01-audit-agent27.md` 应归档至 `.anote/reviews/DNMS01/`（待移动）。
