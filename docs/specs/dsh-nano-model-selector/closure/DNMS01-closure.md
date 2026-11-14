# [DNMS01 / async-compaction takeover] Closure

> 阶段: `DNMS01 — dsh-nano-model-selector 异步压缩接管`
> 范围: `P0–P6` 编码 + P7 文档同步 + T-EXEC 工作日志；T-REV/T-FIX/L2–L4 live 验收进行中。
> Close-type: `executed-on-branch-not-merged`（预期）；当前 `executing`
> 状态: `executing`（三路对抗审查进行中，未合并回 `main`）
> 分支: `dnms01-async-compaction` @ `b07ff01`（+ index.js inject 修正已入 `cbf1426`）
> 日期: `2026-11-15`

## 0. Verdict

`P0`–`P6` 全部编码与 `P7` 文档同步在分支 `dnms01-async-compaction` 上落位。`L0`（10/10 node:test）与 `L5`（clean-lib 54 / route-sensitivity 83 0-drift / pack ×2 工件齐 / diff --check）静态门禁通过。`L1` 契约在 route-table + feature-contract 静态断言层面过；`L2`/`L3`/`L4` live 验收待三路审查 → T-FIX 后现场跑。不标 `executed` 直到 L2–L4 收口。

## 1. 已落地

| 项 | 证据 | 5 态 |
|----|------|------|
| P0 实测收口 | `a8dd6e6`；T-R 台账 + QNA R-15 FAIL → R-16 vendored 裁决 | 🟢 verified |
| 两包骨架（0.3.0 + compaction@0.1.0、dsh.bundle.patch、mutex patch） | `ff74487`/`21f69f1`；`cordis.patch.yml` 633 行 4 preset 全回放，`--dump-config` 验证 | 🟢 verified（L2 静态） |
| `lib/compact-policy.js`（7 字段、master 序、DC、0.15 clamp、fail-closed tmp+rename） | `lib/compact-policy.js` ×2（字节一致）；`node test/compact-policy.test.mjs` 10/10 | 🟢 verified |
| `GET/PUT /nano-model-selector/async-compact` + `POST …/switch` | `index.js:260-370`；83 路由 0 drift；route-sensitivity L3×2 | 🟢 verified |
| `NanoCompactionEngine`（三方法 + async arm→maintenance→adoption + FULL 闭集 + overflow + circuit） | `lib/host-compaction.js`；类加载 smoke 过（dev-only cordis 链接） | 🟡 observed-OK-at-closure（live 未跑） |
| 协议复刻 `lib/compact-region.js`（bracket/六码/shrink/stability/no-cap/两相） | `compact-region.js`；逐节 mirror region.ts+summarizer.ts | 🟡 observed-OK-at-closure（live 未跑） |
| UI 四态面板 + rail 第 4 图标 + i18n ×18 + 四处条件清理 | `src/client/CompactPanel.jsx`/`compact.js`/`ModelSelector.jsx`/`icons.jsx`/`i18n.js`；`npm run build` 过，`lib/client.js` 141.2kB | 🟡 observed-OK-at-closure（live 未跑） |
| 观测面 `lib/compact-runtime.js`（sessionProjections + Map 退化 + 5s memo + degraded 闭集） | `compact-runtime.js`；GET runtime/degraded 接入 `index.js` | 🟡 observed-OK-at-closure（P0-10 未实测，两路径都实现） |
| `-20⑦` switch 唯一写入口 → `setBundleEnabled` | `index.js` `asyncCompactSwitchHandler`（1024 cap） | 🟢 verified（代码路径） |
| 文档三处同步（AGENTS 合同节/README/RELEASE matrix 四包）+ banner + AP §12 | `cbf1426`/`a725c92`/`b07ff01` | 🟢 verified |

## 2. 明确没做

- 没有合并回 `main`。
- 没有删除 worktree。
- `L2`/`L3`/`L4` live 行为验收未跑（`/compact` bracket 现场、B 线跨 turn、S 线、overflow ON/OFF 归属、dump-config 两态、持久化跨 restart）。
- T-REV 三路报告未回收，T-FIX 循环未跑。
- 没有发版、没有版本 bump、没有 tag（`-19`⑤ 权限归 [业主]）。
- 没有动 `dsh.local`、`engines.dsh`、三个 `file:` devDeps、`tool-result-pruner`。

## 3. 下游可以依赖什么

- ON/OFF canonical = `dsh.profile.bundles` 是否有 `dsh-nano-model-selector-compaction`；`install ≠ 接管`——add 后默认 ON，OFF 需显式 `set_bundle(false)`。
- 策略唯一可写真源 = `plugins/nano-model-selector/async-compact.json`（7 字段无 `enabled`，`schema:1` 无回退）。
- 面板唯一写入口 = `POST /nano-model-selector/async-compact/switch`；UI 无 `ctx.remote`。
- 运行期观测只用 `-19①` 闭集：GET `runtime`/`degraded` + `compaction/{summary,end,prune}` durable events + `pluginInventory`/`compositionInventory` + `ctx.logger`。
- 上游 preset `config.plugins` 结构变化需重跑 `scripts/gen-mutex-patch.mjs`（`-10` 已知脆性，`engines.dsh >=0.2.2-rc.1 <0.3.0` 钉住）。

## 4. 不要动

- `docs/specs/dsh-nano-model-selector/qna/DNMS01-qna.md` 全部冻结行；append-only。
- `engines.dsh`、三个 `file:` devDeps、`dsh.local`。
- `compaction` 包的 vendored `lib/compaction/`（R-16 裁决路径；改动须 `npm pack --dry-run` 复核 files）。
- `-19` 观测面闭集：不得加 `compact.notify` / 新 session event type / D1 / 新 audit 文件。

## 5. 证据口径

L0 = `node test/compact-policy.test.mjs` 10/10。L5 = `check-clean-lib` 54 工件、`check-route-sensitivity` 83 行 0 drift、`npm pack --dry-run` 两包工件齐（compaction 13 文件含 vendored 树）、`git diff --check` 干净、`node --check` 全部新文件过、`NanoCompactionEngine` 类加载 smoke 过。L1 = route-table + feature-contract responseShape 静态。L2/L3/L4 = 待 live。

## 6. 残留登记（不 silent overclaim）

| 项 | 判定 | 说明 |
|---|---|---|
| `sessionProjections` 实测注册路径 | `未观察` | `compact-runtime.js` 两路径都实现；L3 定实际路径 |
| `NanoCompactionEngine`/`compact-region.js` live 行为 | `未观察` | 协议静态复刻逐节 mirror；L3 验收定 |
| UI live 渲染/切换四分类现场 | `未观察` | 代码 + build 过；L3/L5-T04 现场定 |
| L2 dump-config ON/OFF 两态终验 | `partial` | P1 已验证一次；最终态待复验 |
| L4 跨 restart 持久化 | `未观察` | tmp+rename 代码路径已验；live 待 |
| `lib/compact-scheduler.js` 计划文件名 | `deferred` | 调度闭集内联 host-compaction.js，等价拆分差异 AP §12 已登记 |
| adoption wake `followup` 消息可见性 | `partial` | 实现权衡已登记；若 L3 判需静默改 `send()` |

## 修订历史

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| `r1` | `2026-11-15` | `DNMS01 执行 agent` | 初稿 `executing`；T-REV 三路审查进行中。 |
