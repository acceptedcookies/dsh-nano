# dsh-performance-review lab

自动化评估报告运行器（spec §6.6、§6.8、§7；执行台账 B1–B3）。

## 与 spec 的差异（如实记录）

| spec 写的 | 本机实际 | 原因 |
|---|---|---|
| Playwright + Chrome | **`ego-browser nodejs` + 同一个 Chromium** | 本机未安装 Playwright；`ego-browser` 是已登录态的真实浏览器。`page.evaluate()` / `page.goto()` / `page.keyboard.type()` 都是 ego-browser 的原生 API，未引入任何 Playwright API |
| `storageState` 登录态快照 | 不需要 | ego-browser 复用用户已登录的浏览器 profile；`config.local.json` 里不存 token/cookie |
| `--arm off` = 不带插件 | `--arm off` = **采集关闭臂**（不带 `?perf-review=1`） | 真正的「不含观测包」对照由 `--measure-footprint` 用 esbuild `--alias` 构建无 DNPR 产物并量字节差；`--arm purity` 另验观察器自身不产 LoAF |
| `--arm purity` 最小页面 | `about:blank` 注入 standalone IIFE + `createPerfReview({forceEnabled:true})` | 观测包在空白页无法靠 flag 启用，显式 force-enable 单例；仍是「只挂观察器空跑 2 s」 |

## 配置

```bash
cp lab/config.example.json lab/config.local.json
```

`config.local.json` 已 gitignore，只写 `baseUrl`、taskSpace 名、workspaceDir 等，不写凭据。

## 运行

```bash
# 1) 第一次 on 臂：写基线，不判失败（spec §7）
node lab/run.mjs --scenario all --arm on --write-baseline

# 2) 同基线复跑：判定，退出码 0
node lab/run.mjs --scenario all --arm on

# 3) 单场景 / 其他臂
node lab/run.mjs --scenario idle-10s --arm on
node lab/run.mjs --scenario all --arm off
node lab/run.mjs --scenario observer-purity --arm purity
node lab/run.mjs --measure-footprint

# 4) 判定口径回归（rev4.1 / 方案 A）
#    --repeats N：跑 N 次独立会话，各标量取中位数判定，原始每轮写 repeatRuns
node lab/run.mjs --scenario composer-type --arm on --repeats 5
node lab/run.mjs --scenario composer-type --arm on --inject-delay   # 新硬红线 -> exit 1
node lab/run.mjs --scenario idle-10s --arm on --inject-failure      # 具名失败 -> exit 1
node lab/run.mjs --scenario all --arm off
node lab/run.mjs --scenario observer-purity --arm purity
node lab/run.mjs --measure-footprint
node lab/diagnose-inp.mjs --repeats 3
```

每次运行产出 `lab/out/<stamp>-<scenario>-<arm>.json` 与 `.md`。Markdown 由
`packages/dsh-performance-review/src/markdown.js` 从同一份 JSON 渲染，外加
`## budget verdict` 段；失败时逐行列出 `pluginId | metric | value | limit | reason`。

基线落在 `lab/baseline/baseline.json`（**入库**），记 `versions` 指纹
（chromeMajor / dshVersion / observerVersion / 四个插件 version）。指纹不一致 → 退出码 2。

## 退出码

| 码 | 含义 |
|---|---|
| 0 | 全过，或第一次只写基线 |
| 1 | 预算失败（Markdown 点名 pluginId + span/track 名） |
| 2 | 版本指纹 / 报告 / 基线不一致 |

## 场景

`idle-10s`、`composer-type`、`files-expand`、`notepad-type`、`model-open`、
`shared-open`、`observer-purity`。每个场景的步骤、DOM 元信息、浏览器侧异常
都写进 JSON 的 `steps` / `notes`，失败步骤不会让整轮塌掉，但会如实记录。

宿主数据用 `GET /nano-explorer-extra/perf-review/host?mode=window` 在场景首尾
各调一次：首调排空窗口，尾调返回精确的场景内 `hostSpan`（`n` 是场景增量，
不是进程累计），再经 `report(meta, hostSnapshot)` 合并进报告。

## 诊断剩余 fail 项

```bash
node lab/diagnose-inp.mjs --repeats 3
```

把 `PerformanceEventTiming.duration` 拆成 `inputDelay` / `processing` / `presentation`
三段，并在**不加载任何 nano 插件**的 `https://dsh.local/` 上跑同样的合成打字作对照，
产出 `lab/out/inp-diagnosis.json`。只读：打字后清空 composer，不按 Enter、不新建会话。
结论与优化方案见 `docs/code-review/26-nov/performance-alpha.md` §12。

## 2026-11-10 真机执行结果

四个插件（notepad / shared-workspace / model-selector / explorer-extra）全部植入并
在 `https://dsh-dev.local/` 加载；`contributors` 4/4，`structure` 全 0。

| 项 | 结果 |
|---|---|
| DNPR 单测 | **60/60 绿**（含 L1 Event Timing 三分量测试） |
| `--measure-footprint` | NDEE client 134333 B → 无 DNPR 118830 B，精确体积 **15503 B** |
| `--arm purity` | `loafCount=0`、`observerErrors=0`、`observersMissing=0` |
| `--arm off` | `enabled:false`，track/span/usage 全空，`nano:*` measure 0 |
| 退出码 | 基线写入 0；判定复跑 0；`--inject-failure` 1；`--inject-delay` 1；版本篡改 2 |
| **L0/L1 后判定** | **7/7 场景 PASS，连续 3 次全量复跑均退出码 0**；`--repeats 5` composer-type 亦 0 |

基线用 `--scenario all --arm on --repeats 3 --write-baseline` 取 3 次中位数，
不是单次读数。报告新增 `inputDelayP95` / `processingP95` / `presentationP95`：
`composer-type` 基线为 112 / 0.8 / 5.1 / 844.3 ms（`nativeInpP75` / 三段），
说明 ~1 s 的延迟全在 presentation，主线程两段 <6 ms。

**判定分两层**（spec rev4.1 §7）：低方差 / 结构性 / 可归因指标是硬门禁；
高方差相对项（span p95、hostSpan p95、observer callbacks 相对基线倍数、页级
`nativeInpP75`）是 **audit**——仍写进报告与 D1 候选表，但不产生 exit 1。
理由与实测见 `docs/code-review/26-nov/performance-alpha.md` §12。

> 机器级前置：dev 宿主 `ai.deepseek.dsh.dev.web.plist` 加了 `DSH_PERF_REVIEW=1`
> 并重载过 LaunchAgent（备份 `.bak-perf-review`）。没有它 `hostSpan` 为空。

