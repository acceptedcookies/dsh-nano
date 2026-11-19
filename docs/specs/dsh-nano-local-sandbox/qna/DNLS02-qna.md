# DNLS02 QNA · [真相层] 对账册（DNLS 中立化 · DNK 消费者硬切 · 1119 D 闸口裁决）

> **范围（scope）**：[`dsh-nano-local-sandbox-v1.2.md`](../dsh-nano-local-sandbox-v1.2.md) §9 中影响本轮落地的 Q1 / Q4 / Q5 / Q7，[`1119-loop3-closure.md`](../../dsh-nano-kitesurf/1119-loop3-closure.md) §5 的五项 D 闸口（G01 / G19 / G24 / G29 / G31），以及 `kitesurf-delivery-review` 工作树中未登记的扩约项（`/cdp` relay、G22 持久化、错误目录扩行、`/last`、`/kite configure`）。
> **qna 位点**：`post-charter（执行层补登记）`，承接 [DNLS01-qna.md](DNLS01-qna.md) 的 `T-O-1`–`T-O-18`，Truth-ID 续编为 `T-O-19` 起，不回收、不改写 DNLS01 已冻结行。
> **角色配置**：提问 `DNLS02 收口 agent（lead）` · second-opinion `waived` · 裁决 `[业主]`
> **裁决来源**：[业主] 2026-11-19 指令：「DNLS 必须保持中立、通用、不与插件耦合；工作树内所有 DNLS 耦合必须拆除，按 DNLS 原则完成 DNK 消费者侧重构；五项 closure 裁决按推荐执行；其余工作按推荐，在长期治理模型下先完成文档登记再推进」。本文所有题目均按推荐选项冻结。
> **文档状态**：`frozen`（2026-11-19）。按 `AGENTS.md`「不得擅自扩约」，本文即本轮公共合同变更的**唯一** durable 登记；其他文档（v1.2、closure、各包 `AGENTS.md`）只引用 `T-O-*`，不另写一份决定。
> **治理口径**：沿用 `T-O-8` 四原则：能硬切就不双写、能退役就不兼容、平台保持中立、不得耦合私域。

---

## 0. 题目总览

| 题 | 来源 | 焦点 | 冻结为 |
|---|---|---|---|
| Q11 | v1.2 Q1 | HTTP 命名空间：profile-scoped route 还是单一 `/nano-local-sandbox/*` | `T-O-19` |
| Q12 | v1.2 Q4 | BrowserDriver 暴露面（HTTP / MCP / 两者） | `T-O-20` |
| Q13 | v1.2 Q5 | Kitesurf driver 目录与发布形态；runtime / 镜像的归属 | `T-O-21` |
| Q14 | v1.2 Q7 | `kitesurf-delivery-review` 未合入改动的归属 | `T-O-22` |
| Q15 | v1.2 §6 / I-1 / I-4 | kernel 与 profile driver 的切割、环境变量与状态目录 | `T-O-23` |
| Q16 | v1.2 A8 / DNLS01 R-2 | 错误命名空间：kernel 不出现业务词时 errorId 如何保持 | `T-O-24` |
| Q17 | closure G01 | 同页所有权与写锁边界 | `T-O-25` |
| Q18 | closure G19 | `deviceScaleFactor` / `mobile` 支持面 | `T-O-26` |
| Q19 | closure G24 | env 共享 vs session 隔离 | `T-O-27` |
| Q20 | closure G29 | HAR 输出合同 | `T-O-28` |
| Q21 | closure G31 | `timeoutMs` 到点后的公共语义 | `T-O-29` |
| Q22 | 工作树扩约项 | `/cdp` relay、G22 持久化、错误目录扩行、`/last`、`/kite configure` | `T-O-30` |
| Q23 | closure G20 / G25 | 首装交付链与 repin | `T-O-31` |
| Q24 | v1.2 C8/C9 / T-O-10 | DNK 消费者硬切清单 | `T-O-32` |

---

## 1. ★ Truth-Gate 台账（NORMATIVE · append-only）

| Truth-ID | 子类型 | 已锁定真相 | 来源 | 下游约束 |
|---|---|---|---|---|
| `T-O-19` | `execution` | **HTTP 面只有一个命名空间 `/nano-local-sandbox/*`**（承 `T-O-9`）；**不引入** `/profiles/:profileId/instances/:instanceId/...` 第二套 route。route 以**能力名**命名（`open/shot/dom/elements/...`），实例由 `sessionBinding`（`T-O-12`）与 instance registry 决定，profile 不出现在 path 里。带业务名的 route 一次性改名或退役：`/kite` → `/nano-local-sandbox/lifecycle`（只保留 `start`/`resume`/`suspend`/`restart` 等生命周期动作），不留旧 path 别名。 | Q11（推荐 A） | `lib/bindings.js`、`security/route-sensitivity.json`、`security/feature-contract.json`、`security/perf-binding-ids.md` 同步；DNK client 一次性改指 |
| `T-O-20` | `execution` | **BrowserDriver 双线暴露、单一 owner**（承 `T-O-11`）：UI 经 HTTP route，agent 经 MCP `sandbox.*`；两者调用同一组 owner 函数（`buildOwners`），HTTP / MCP / bridge 推送从同一函数投影（v1.2 I-5）。**不新增第三个面**，不为 DNK 单独开 route。 | Q12（推荐 C） | MCP/REST 同源测试；DNK 不直连 CDP |
| `T-O-21` | `execution` | **Kitesurf driver 随 DNLS 包发布，runtime 与镜像是派生构建产物**：driver 代码在 `profiles/kitesurf/driver/`，列入 DNLS `package.json files`；`profile.yaml` 增加必填 `driver` 入口（相对 profile 目录）。runtime 由 DNLS 构建入口从官方 pin 构建到 `DSH_HOME/artifacts/<profileId>/<ref>/runtime`（带 receipt），镜像由同一入口按 profile 配方构建（经 `ctx.sandbox.confine` 或等价的 host confinement）；`linux-prefix/` 构建上下文由脚本生成，不入库、不进包。插件部署只交付代码，不交付 runtime / 镜像；缺产物时 `ensure` 失败关闭并给出构建命令，不销毁健康容器。 | Q13（推荐 A） | `pack-manifest`；首装矩阵；`T-O-31` |
| `T-O-22` | `execution` | **工作树改动转交 DNLS 作实现输入**：`kitesurf-delivery-review` 中对 DNLS 的修复按 DNLS 合同重新落位后由 DNLS 提交（同一分支、分阶段 commit）；DNK 只提交消费者侧改动。基线快照 `3ae7171` 是回滚点（`T-O-18` ③ 的快照手段），不直接合入 main。 | Q14（推荐 B） | 提交历史按包分阶段；不跨包混提交 |
| `T-O-23` | `execution` | **kernel / driver 硬切**：① `src/host` 是通用 kernel，不得出现 `kitesurf`/`workerd`/`wrangler`/`agent-browser`/`browser-settings` 任一业务词（大小写不敏感，含注释、字符串、文件名），由 `test/contracts/no-business-core.test.mjs` 静态扫描（I-1），`profiles/` 例外。② 业务实现（runtime 校验与挂载、配方漂移 reconciliation、settings / history adapter、引擎指纹、selftest 业务探针、容器内路径）迁入 `profiles/<id>/driver/`；kernel 只按 `ProfileDriver` 接口调用（`image/mounts/runtimeRoot/drift/settings/history/selftest` 等，形状由 driver 声明，kernel 不认识具体 profile）。③ 实例命名与宿主端口由 `profile.yaml` 的 `instance` 段声明（容器名前缀、按 env 的端口对），kernel 只做通用推导。④ 环境变量硬切为通用名：`DNLS_ENV`（取代 `KITESURF_ENV`）、`DNLS_PROFILES`（取代 `KITESURF_PROFILES`）、`DNLS_STATE_ROOT`（取代 `KITESURF_STATE_ROOT`）；`KITESURF_STATE`、`KITESURF_IMAGE`、`KITESURF_CHECKOUT` **直接退役**，不设别名（`T-O-13` 已退役 checkout 覆盖键，image 只认 `profile.yaml`）。⑤ 状态目录：driver 状态只落在 kernel 分配的 per-instance `stateVolume`，env 容器的卷位于 `DNLS_STATE_ROOT`（默认 `DSH_HOME/nano-local-sandbox/state/<profileId>/<instanceKey>`）；全局 `~/.dsh-kitesurf-state*` 退役。卷位置变化引起的配方漂移按既有 reconciliation 重建容器（dev 环境可接受；desktop 不在本轮交付面）。 | Q15（推荐 A） | `no-business-core` 测试；新 profile 不改 `src/host`（I-4） |
| `T-O-24` | `execution` | **错误命名空间 = 归属方命名空间**（补充 DNLS01 R-2 / R-5，不改其结论）：① kernel 生命周期错误使用固定的 `sandbox.*`（含已登记的 `sandbox.instance.policy-stale`、`sandbox.cdp.page-lost`）。② 服务某个 profile 实例的请求面错误（body / url / query / browser / backend 等）使用该 profile 声明的 `errors.namespace` 作为前缀；kitesurf profile 声明 `namespace: kitesurf`，因此**线上 errorId 全部保持原样**（R-2 的 `kitesurf.*` 前缀继续成立），只是这个前缀不再写在 kernel 源码里。③ `ERROR_CATALOG` 仍是一份：kernel 持有按「后缀 code」书写的通用行，driver 持有自己独有的行，运行时按 profile 命名空间组装成一张表；同一 id 只有一行定义。④ 不改名、不加别名、不新增枚举（除 `T-O-26`/`T-O-25` 明确列出的行）。 | Q16（推荐 A） | `catalog-parity`、`error-catalog` 测试改为扫描 code；DNK 不复制目录（`T-O-32`） |
| `T-O-25` | `execution` | **G01：人和 agent 操作同一个 page target；写锁只约束 MCP 写者**。`sandbox.control` 的 `writer`/`humanHold` 锁的域是 MCP / 桥连接：同一时刻只允许**一个 MCP 写者**；`humanHold` 生效时拒绝 agent 写（`*.control.held`）。pane 的 REST 写（`/open`、`/edit`、`/interact` 等）代表人，不受写锁约束，也不新增 REST 侧 `busy/held` 拦截分支。`sandbox.control` 的工具描述与 SKILL 正文统一写作「one MCP writer」，不再写「one writer」。 | Q17（推荐：锁仅 MCP） | 改 `mcp-bridge.mjs` 描述、DNK skill 正文；补描述一致性断言 |
| `T-O-26` | `execution` | **G19：不撒谎**。pin 无法真实改变 `devicePixelRatio` 与移动端输入特征，因此 `viewport.deviceScaleFactor` 只接受 `1`，`viewport.mobile` 只接受 `false`；其他值返回 `<ns>.settings.unsupported`（400，**本条新增一行错误目录**），不写入设置、不返回 `ok:true`。`capabilities.unsupported` 继续声明 `deviceScaleFactor`、`mobile`。将来 pin 能真实实现时另行登记扩约。 | Q18（推荐：缩约） | settings 校验与 catalog 同步；回显测试改为拒绝测试 |
| `T-O-27` | `execution` | **G24：按 `T-O-12` 的 session 语义收敛**。`ensure(profileId, sessionId, policy)` 返回 per-session 的 `instanceId` 与 `policyFingerprint`；物理容器仍是 env 容器，多个 session 实例记录可以挂在同一 env 容器上（`attached` 计数），这是 `maxInstances` 资源治理下的物理复用，不是第二种 scope。`profile.list` 的 `scope: session` 指**实例记录与策略指纹按 session 隔离**；页面、CDP socket、history 在同一 env 容器内共享，这一点在工具描述中如实写明。每 session 独立容器 / 端口不在本轮实现，作为后续扩约另行登记。 | Q19（推荐：记录隔离、物理复用并如实声明） | ensure 描述、双 session 用例断言 instanceId/fingerprint 独立 |
| `T-O-28` | `execution` | **G29：接受 HAR 子集并文档化**。`/har` 输出保留 `_format: 'har-lite'`，`log.version: '1.2'`；`headers` 恒为空数组、无 `timings`/`pages` 细项，原因是 pin 不发对应事件。工具描述、SKILL 与 `AGENTS.md` 写明「HAR 子集，headers 恒空」，不冒称完整 HAR。 | Q20（推荐：lite） | 描述/文档一致性 |
| `T-O-29` | `execution` | **G31：超时不是取消**。所有 `timeoutMs` 只决定**应答何时返回**：到点后返回超时错误（导航为 `<ns>.navigate.failed` 且 `navigation.outcome: 'in-flight'`，wait 为 `<ns>.wait.timeout`），引擎侧已发出的操作继续执行，不中止、不排队替换、不自动重放；调用方应先读 `/status` 的 `navigation.outcome` 再决定是否重发。不新增 `*.cancelled` 枚举。retry 义务沿用 `T-O-17`（仅 transport 重连一次，超时与确定性错误不重跑）。 | Q21（推荐：等待语义） | catalog `next` 文案、SKILL、描述同步 |
| `T-O-30` | `execution` | **工作树扩约项补登记**：① `/cdp` relay：属于 `T-O-16` 的 cdp-driver 面，keeper 持有唯一上游 socket，`agent-browser` 等经 relay 作为下游客户端共享同一 page；target id 的 `ks:<slot>:<id>` 形式是 profile 内部格式，不进入 L2 合同。② G22 history 持久化：写入实例 `stateVolume`（driver 自己的格式），这是 v1.2 C6 与 `T-O-12`「history 一份 canonical」的落地，不是新状态源。③ 错误目录扩行：以本次落位后 `ERROR_CATALOG` 的行集为登记清单（目录本身即真源），后续增删须另行登记。④ `/last`（lastPick）**退役**：lastPick 是 DNK 业务状态（v1.2 §6.4），由 DNK client 从 `/pick` 应答自行持有。⑤ `/kite configure`（手动 repoint `httpBase`/`mcpPort`）**退役**：端点只由 instance registry 动态返回（`T-O-14`），手动 repoint 是第二份端点真源；持久文档中的 `kite.{httpBase,mcpPort}` 一并删除。 | Q22（推荐） | bindings/台账删行；DNK UI 删除 configure |
| `T-O-31` | `execution` | **首装交付链与 repin**：① DNLS 提供唯一构建入口（`dsh-nano-local-sandbox/scripts/build-profile.mjs`），按 `profile.yaml` 做：校验 pin 为官方提交原样 → 构建 runtime 到 `DSH_HOME/artifacts/<id>/<ref>/runtime` 并写 receipt → 生成构建上下文并构建镜像 → 校验 digest。可重复执行，结果一致时不重建。② `deploy-local` 只部署插件代码；部署后检查并报告该 home 的 runtime / 镜像是否就绪，缺失时打印构建命令，不静默成功。③ repin（G25）：候选官方提交先在派生目录构建并跑兼容实验（adapter 与 selftest），通过后才改 `profile.yaml` 的 `ref/image/digest`；pin 本体不改写、不加本地补丁；不新增 release-gate。 | Q23（推荐） | 构建脚本、部署报告、repin 实验记录 |
| `T-O-32` | `execution` | **DNK 消费者硬切**（承 `T-O-10`/`T-O-11`）：DNK 删除 `lib/container-engine.js`、`lib/nano-kite.js`、`lib/engine.js` 及其测试，删除 `Config.httpBase/checkout/mcpPort`、`nano-kitesurf.lock.json` 相关代码、`lib/diagnostics.js` 中的错误目录镜像（`T-O-15` 一份目录；DNK 只按 errorId 显示 DNLS 应答里的 `error`/`cause`/`next`，或仅保留本地化 UI 文案、不复制状态码与目录行）；client 改用 `/lifecycle`、删除 configure UI 与 `/last` 读取；skill 正文只教通用 `sandbox.*` 与 `/nano-local-sandbox/*` 能力，不含私有路径。DNK 不 import DNLS 任何文件。 | Q24（推荐 A） | DNK 测试；`files` 清单 |

---

## 2. 题目详情（解读 / 选项 / 推荐理由）

### Q11 —— HTTP 命名空间（→ `T-O-19`）

- **解读**：v1.2 §9 Q1 问是否引入 `/profiles/:profileId/instances/:instanceId/...`。`T-O-9` 已冻结 `http-routes` 面为 `/nano-local-sandbox/*`，`T-O-12` 已冻结实例按 session 绑定。
- **选项**：A 保留单一命名空间、能力名 route、业务名 route 改名或退役；B 新增 profile-scoped 命名空间并保留旧面作 façade；C 只新增 profile-scoped 命名空间并硬切旧面。
- **推荐 A**：B 违反 `T-O-8`「不双写 / 不兼容」；C 把 profile 写进每条 path，等于把业务维度推给每个消费者，且当前只有一个浏览器 profile，路由维度没有收益。A 让 route 只描述能力，实例由 registry 决定，符合「平台中立」。

### Q12 —— BrowserDriver 暴露面（→ `T-O-20`）

- **选项**：A 只 HTTP；B 只 MCP；C 两者同源。
- **推荐 C**：`T-O-11` 已冻结 UI 不经模型回合、agent 经 skill + MCP；A 或 B 都会让一类主体失去入口。关键约束是同源：两面共享 owner 函数，避免 v1.2 §2.2.6 所述「MCP 是第二套实现」。

### Q13 —— driver 目录与发布形态（→ `T-O-21`）

- **选项**：A driver 随包、runtime/镜像为派生产物；B driver 与 runtime 一并独立成包；C runtime 也打进插件包。
- **推荐 A**：B 增加一个包和安装步骤，但 driver 只服务 DNLS；C 把数百 MB 构建产物塞进插件包，且违背「pin 不可改写、产物在派生目录」。A 与 `AGENTS.md`「`linux-prefix/` 不入库」一致。

### Q14 —— 工作树改动归属（→ `T-O-22`）

- **选项**：A 由 DNK 继续提交；B 转交 DNLS 作实现输入；C 丢弃重做。
- **推荐 B**：改动主体在 DNLS，DNK 提交会延续「DNK 直接改 DNLS 核心」的违规（v1.2 §5.3 P5）；C 丢掉已实测的修复。B 保留修复、恢复归属。

### Q15 —— kernel / driver 切割（→ `T-O-23`）

- **选项**：A 硬切（业务迁 driver、环境变量改通用名、旧名不留别名）；B 业务迁 driver 但保留旧环境变量别名；C 只移动文件，不改环境变量与状态目录。
- **推荐 A**：B、C 都会在 `src/host` 留下业务词，I-1 无法成立；别名违反 `T-O-8`。旧环境变量只在测试与本机脚本中出现（仓内检索），无外部消费者。

### Q16 —— 错误命名空间（→ `T-O-24`）

- **解读**：I-1 要求 kernel 源码无 `kitesurf`；R-2 冻结 `kitesurf.*` 前缀保留。两条看似冲突，实际可同时满足：前缀由 profile 声明。
- **选项**：A 前缀由 profile 声明，线上 id 不变；B 全部改名为 `sandbox.*`；C kernel 保留 `kitesurf.*` 字面量（I-1 豁免）。
- **推荐 A**：B 改动约 80 个线上 id，违反 R-2 且波及 DNK/skill；C 违反 I-1。A 同时满足两条已冻结约束。

### Q17–Q21 —— D 闸口（→ `T-O-25`–`T-O-29`）

推荐理由见 [`1119-loop3-closure.md` §5](../../dsh-nano-kitesurf/1119-loop3-closure.md) 各项「协议影响」：五项都选择**不新增公共错误面、如实描述现状**的分支（G19 是唯一新增一行 `settings.unsupported` 的情况，用于把「静默 `ok:true`」改成显式拒绝）。G24 选择与 `T-O-12` 冻结语义一致的解释，并把每 session 独立容器留作后续扩约，而不是由实现反推。

### Q22 —— 扩约项（→ `T-O-30`）

- `/cdp` relay 与 history 持久化是已冻结真相（`T-O-16`、`T-O-12`）的落地，补登记即可；`/last` 与 `configure` 与已冻结真相冲突（v1.2 §6.4、`T-O-14`），按 `T-O-8` 退役。

### Q23 —— 交付链与 repin（→ `T-O-31`）

- **解读**：closure G20（首装未验证）与 G25（repin 未做）的共同根因是 runtime / 镜像没有可重复的构建入口。
- **推荐**：一个 DNLS 构建入口 + 部署后就绪报告；repin 走「派生目录构建 → 兼容实验 → 改 manifest」三步，不新增 release-gate。

### Q24 —— DNK 硬切（→ `T-O-32`）

- **推荐 A**：`T-O-10` 已冻结删除清单，本题只把工作树遗留（engine.js、diagnostics 目录镜像、configure UI、`/last`）补入同一清单。

---

## 3. 变更控制

- 冻结后任何变更按 append-only 追加「修订注记」，不改已冻结行；与 DNLS01 冲突时，以本表中**明确写出「补充 / 承接」**的条目为补充说明，DNLS01 原行仍有效。
- 实施状态不写在本表；实施与验证记录见 [`1119-loop3-closure.md`](../../dsh-nano-kitesurf/1119-loop3-closure.md) 的后续收口段。

---

## 4. 修订注记（append-only）

| 编号 | 日期 | 关联 | 注记 |
|---|---|---|---|
| `R-1` | 2026-11-19 | `T-O-30` ③、`T-O-20` | **恢复 `/evaluate` 分段（不是新合同）**。分段读取由 [业主] 授权的 `9b2db68`（P1-2 授权解冻）引入并登记：结果超过 4000 字符时返回首段与 `token`，`{token,offset}` 或 `?token=&page=N`（offset = N×4000）拉后续分段；token 存在页内环（最近 20 条），导航即失效；未命中返回 `<ns>.evaluate.miss`（404）。DNLS 接管页面路由后该行为丢失（main 上 DNLS `/evaluate` 不分段，DNK 侧实现已成死码），DNK skill 仍承诺分段。按 [业主] 2026-11-19「保证已交付价值不 regress」的指令，在 DNLS kernel `/evaluate` 恢复原合同，`ERROR_CATALOG` 行集据此增加 `evaluate.miss` 一行。4000 字符以内的结果形状不变（原始 `value`，无 token）。 |
