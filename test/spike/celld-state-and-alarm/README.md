# test/spike/celld-state-and-alarm — celld 旁路运行时实证宪章

> **一句话定义**：验证「celld 作为 dsh 的旁路 durable-object 运行时，能否在本机真实承担 session-manager 的外部 actor：durable state、alarm 唤醒、跨 dsh 重启存活、可接受的常驻开销」——**先跑通 `celld dev` 单机形态，再实测 alarm/状态/重启存活/资源四条线**。spike 只产事实：每项给 `ego PASS` / `offline PASS` / `RED` / `deferred`，不改任何包源码、不动任何 dsh 实例。

| 锚 | 值 |
|---|---|
| 建档日期 | 2026-11-12 |
| 验证对象 | `context/celld`（denoland/celld，本仓 context 参考检出，sha=main 头部）；官方 v0.2.0 预编译 `celld-aarch64-apple-darwin.gz` |
| 验证环境 | 本机 macOS arm64。**只在 `test/spike/celld-state-and-alarm/tmp/` 内跑 `celld dev`**；不碰 `dsh.local` / `dsh-dev` / `dsh-desktop` 任何实例（它们仅作为「celld 必须存活于其重启之外」的假想对象，不实际重启） |
| 上游真相 | `context/celld/README.md`（架构：fleet/bucket/lease）· `docs/README.md` L267–284（`celld dev` 本地模式）· `docs/limitations.md`（Windows 不支持、生产必须 bucket）· `docs/guarantees.md` · `examples/alarm/{index.js,wrangler.jsonc}`（alarm API 参考形态）· `docs/wasm.md`（celld 运行 wasm ≠ celld 可 wasm 化） |
| 证据上限 | 不承诺 Windows 实测（本机只有 macOS，Windows 项走源码/文档判读）；不承诺多节点 fleet 实测（只验单节点 dev 形态）；不承诺 S3 桶模式实测（无外发桶凭证时不验，只读 `celld dev` 本地存储等价性）；不承诺把 celld 接进 dsh 的集成实现。只回答「celld 这个底座能不能扛起外部 actor」 |

**边界声明**：不改 `dsh-nano-*` 任何 `src/`、不改 `packages/*`、不改任何 profile 配置、不启动/重启/写入任何 dsh 实例。celld 二进制放 `tmp/bin/`、工程放 `tmp/project/`、数据落 `tmp/project/.celld/`——全部在 spike 目录内，验完可整树删除。外发仅限 `GET`（github release 下二进制、必要时 esbuild 的 npm）；不登录、不带凭证。`.env.s3` 仅作只读参考，不实际连桶。

---

## §1 已读事实（设计地基，非命题）

| # | 事实 | 出处 |
|---|---|---|
| C1 | celld 是**完整 Workers 平台**，不是轻量 isolate：Workers + DO + KV + Queues + D1 + R2 + Workflows + Cron + static assets | `README.md` |
| C2 | 单节点/开发形态 = `celld dev`：本地 object store + 单节点 + Worker listener `127.0.0.1:9876`，**无需 Docker 或云桶** | `docs/README.md` L267–275 |
| C3 | 生产形态必须 bucket（S3/GCS/Azure），bucket 是 lease 协调层；只有 `celld dev` 能用本地 SQLite object store | `docs/limitations.md` |
| C4 | 官方二进制只有 linux-x64/arm64 + darwin-arm64；**Windows 不支持** | `docs/limitations.md`、release assets |
| C5 | celld 是 Rust daemon（deno_core/V8 + SQLite + jemalloc + tokio），**不可能 wasm 化**；但 Worker bundle 可 import `.wasm` | `Cargo.toml`、`docs/wasm.md` |
| C6 | DO alarm API：`storage.setAlarm(ts)` / `getAlarm()`；`alarm(info)` handler 带 `retryCount`；DO class 在 wrangler `durable_objects.bindings` + `migrations.new_sqlite_classes` 注册 | `examples/alarm/index.js` |
| C7 | DO 状态是每对象一个 SQLite db；`storage.put/get` 持久；hibernation/eviction 由 `CELLD_*` 控制 | `README.md`、`docs/services/durable-objects.md` |
| C8 | v0.2.0 起 resident cell ~471KB/个（共享 isolate 池），isolate 在 await 时释放 | v0.2.0 release notes |
| C9 | **VM 底座合拢**：`sandbox-nano-nvx` 已论证 NVX guest 永远是 Linux、Apple container 是 macOS 原生 VM、L1 运行时管理是用户级。**celld 作为 linux-x64 负载进 VM，Windows 无需移植/WSL2**。这消解了 celld 的 Windows 硬依赖（C4） | `docs/eval/26-nov/sandbox-nano-nvx.md` §0.3/§5.8/§5.9 |

## §2 待验证命题（V-xx）

| ID | 命题 | 方法 | 判读门槛 | 终态 |
|---|---|---|---|---|
| **V-01** | 官方 darwin-arm64 二进制可在本机拉起 `celld dev`，Worker listener 起服务 | `GET` 下二进制 → `chmod` → `celld dev samples/app` → curl `127.0.0.1:<port>` | 进程起来 + HTTP 有响应 | NOT_RUN |
| **V-02** | `celld dev` 不需外部 bucket：本地 object store 自洽，DO 可部署可调用 | dev 模式下部署含 DO 的 wrangler app → `POST` 调 DO | DO fetch 返回 200；未要求 bucket | NOT_RUN |
| **V-03** | `storage.put/get` durable：写入后 **kill -9 celld 再重启**，数据仍在 | put 计数 → `kill -9` → 重启 `celld dev` → get | 计数在重启后读出，非零 | NOT_RUN |
| **V-04** | `setAlarm` 触发 `alarm()` handler，且**跨 celld 进程重启仍触发**（durable alarm） | setAlarm(+2s) → 立即 `kill -9` → 重启 → 等 → 读 fires | fires≥1，证明 alarm 不是纯内存计时器 | NOT_RUN |
| **V-05** | alarm handler 崩溃后 `retryCount` 递增重试（durable alarm 语义） | alarm() 前 N 次 throw → 读 lastRetry | retryCount>0 | NOT_RUN |
| **V-06** | celld 常驻开销可接受：dev 单节点 + 1 个 DO 的 RSS / CPU 基线 | `ps`/`vmmap` 量 celld 进程 | 记录 RSS（判读：相对 dsh 主进程是否可忽略） | NOT_RUN |
| **V-07** | celld 存活于「dsh 重启」语义之外：sidecar 进程独立，dsh 死不影响 celld | 起 celld + 起/杀一个无关 node 进程作「假 dsh」→ 断言 celld 仍响应 | 假 dsh 死后 celld 仍 200 | NOT_RUN |
| **V-08** | DO 间/Worker→DO 的 HTTP 面就是 session-manager 的对接协议：`env.X.get(id).fetch` 可达 | 默认 worker fetch → `idFromName` → DO fetch | Worker 路由到具名 DO 并返回 | NOT_RUN |
| **V-09** | `celld dev` 与生产 bucket 模式的语义差：dev 的本地 store 是否足以代表 durable 语义（即 V-03/V-04 结论可外推到生产） | 读 docs/guarantees + limitations；对照 dev 与 fleet 写路径 | 明确 dev 结论能否外推；不能则标 deferred | NOT_RUN |
| **V-10** | Windows 可行性最终判定（源码级）：celld 进程管理/信号/存储是否有 unix-only 硬依赖 | `grep` crates 里 `libc`/`nix`/`unix`/`SIGTERM`/`fork`；读 Windows 缺席原因 | 判定：可 cargo 移植 / 需 WSL2 / 需远端 celld | NOT_RUN |
| **V-11** | 资源与部署形态结论：session-manager 的 sidecar 是「celld dev」够用，还是必须 fleet+bucket | 综合 V-02/03/04/09 | 给出最小部署形态建议 | NOT_RUN |
| **V-12** | alarm 精度与持久边界：setAlarm 的最小粒度、重启后 alarm 排程是否按原定时间还是重启时漂移 | setAlarm(+60s) → kill 30s → 重启 → 观察触发时刻 | alarm 按原定时触发（存证）或漂移（记实） | NOT_RUN |
| **V-13** | celld 可在 VM 底座（NVX / Apple container）的 Linux guest 内作为 sidecar 运行——**VM 落地后的必验项**，届时 celld 交付路径定型 | （NVX 落地后）在 VM 内跑 `celld dev` + alarm DO → 验 V-03/V-04 等价结论 | celld 在 guest 内可起、DO/alarm 同义 | **deferred**（依赖 VM 底座，NVX 落地前不跑） |

## §3 取证计划（顺序）

1. `GET` v0.2.0 `celld-aarch64-apple-darwin.gz` → `tmp/bin/celld`；`--version`/`--help` 取证 V-01 前置。
2. 写 `tmp/project/wrangler.jsonc` + `index.js`（counter + alarm 合体，照 `examples/alarm` 扩展）。
3. `celld dev tmp/project --port 9876` 后台拉起 → 顺序验 V-02/V-03/V-04/V-05/V-08/V-12。
4. V-06 在 celld 稳定运行期 `ps`/`vmmap`。
5. V-07 用无关 node 进程模拟 dsh 生死。
6. V-09/V-10/V-11 走源码与文档判读，必要时 `grep` crates。
7. 每条 V 在 §4 落终态词 + 实测数值 + evidence 指针。
8. **V-13 等 VM 底座**：NVX / Apple container 落地后再补验 celld-in-guest——在那之前 V-01…V-12 的本机 `celld dev` 结论先行，session-manager 推进决策待底座回顾。

## §4 过程与结论

> 待执行。每条 V 在此落 `终态词 + 实测数值 + 证据指针`。

| ID | 终态 | 实测 |
|---|---|---|
| V-01…V-12 | NOT_RUN | — |
| V-13 | deferred | 等 NVX/VM 底座落地后再验 celld-in-guest |

## §5 收口（写死的判读规则）

- **V-03 / V-04 是一票否决级**：若 durable state 或 durable alarm 跨重启不成立，则「celld 作为外部 actor」前提崩塌，session-manager 的 sidecar 方案整体退回 node watchdog——这是本 spike 存在的核心理由。
- **V-09 是诚实边界**：若 `celld dev` 本地 store 与生产 bucket 的 durable 语义不等价，则本 spike 的 V-03/V-04 结论只能记 `offline PASS (dev-mode)`，不得写成生产已证。
- **V-10 只给判定不给实现**：Windows 移植难度是读代码的结论，不真的去编 Windows 版。
- **V-13 deferred 与节奏**：celld-in-VM 的实测**冻结到 NVX / Apple container 底座落地后**——届时 celld 的部署形态按 spec §3.5 定型，本 spike 的 celld-in-guest 等价性再补验；在此之前不投入 VM 侧实现。session-manager 的整体推进同样在底座回顾后定案。
- spike 收口时把所有 `tmp/`、`evidence/` 留在原地（gitignore），只把本 README 的 §4 结论转正；需要进合同的内容走 `docs/specs/dsh-nano-session-manager/spec.md` 的修订。
