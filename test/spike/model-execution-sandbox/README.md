# test/spike/model-execution-sandbox — DSH 宿主进程沙箱边界 spike 宪章

> **一句话定义**：验证「DSH 当前的 `SandboxMode` 三档策略在真实宿主上到底挡住了什么、漏掉了什么」——**策略推导 → 可写集 → Seatbelt 剖面 → 写入面 → 读取面 → 网络面 → 进程面 → 诊断方言 → 后端链 → 组合面 → 部署姿态**。spike 只产事实：每环给 `ego PASS` / `offline PASS` / `RED` 的结论与实测数值，不改任何包源码。

| 锚 | 值 |
|---|---|
| 建档日期 | 2026-11-12 |
| 验证实例 | 宿主包本体：已安装的 `@deepseek-ai/dsh@0.2.2-rc.1`（经 `npm root -g` 解析）。**不启动、不重启、不写入任何 dsh 实例**；`dsh.local` / `dsh-dev` / `dsh-desktop` 三实例仅只读查证配置面 |
| 目标域 | 无外发。唯一的网络请求是 `GET https://example.com`（状态码探测，不上传、不登录、不带凭证），用于判定网络域是否受控 |
| 上游真相 | `context/deepseek-harness/packages/sandbox/sandbox/src/index.ts`（`SandboxMode` L32、`SandboxExecutionPolicy` L40、`ConfinedArgv` L106、`confine` L225）· `sandbox/src/roots.ts`（`workspaceWritableRoots` L87、`writableRoots` L103、`canonicalPath` L66）· `sandbox/src/escalation.ts`（`WIDER_MODES` L64、`ESCALATION_TARGETS` L77、`approveEscalation` L209）· `sandbox/src/diagnostics.ts`（`classifyRunnerFailure` L65、`matchesSignature` L96）· `sandbox-policy/src/index.ts`（解析优先序 L215、`Config.mode` 默认 L96）· `sandbox-policy/src/session-mode.ts`（`setSandboxMode` L52）· `sandbox-local/src/profiles.ts`（三种 runner 剖面 L16 / L30 / L53）· `sandbox-local/src/index.ts`（`PLATFORM_CHAINS` L178、`STATIC_ENFORCEMENT` L196、`DENIAL_SIGNATURES` L216、`RUNNER_FAILURE_RULES` L243、`chainVerdict` L553）· `fs/fs-sandbox/src/index.ts`（`checkedTarget` L162）· `bundle/base/cordis.patch.yml`（L238–300、L537–540） |
| 证据上限 | 不承诺跨平台实测（本机只有 macOS）、不承诺 NVX 侧实测（NVX 不支持 macOS）、不承诺真实 `bash` 工具调用链（需启动实例，越出边界）、不承诺任何缺口的修复方案。只回答「现三档策略的实际边界在哪里」 |

**边界声明**：不改 `dsh-nano-*` 任何 `src/`、不改 `packages/*` 任何文件、不改任何 profile 配置、不启动/重启/写入任何 dsh 实例。全部实验在 `~/.nvx-sandbox-spike/` 临时目录内，验完即删。`dsh.local` **禁重启、禁写**，本 spike 对它的访问仅限 `readFileSync` 读 patch 文件。

---

## §1 现状分析：DSH 沙箱今天承诺什么、实际挡什么

| 层 | 真源 | 已证事实 |
|---|---|---|
| 策略词汇 | `sandbox/src/index.ts:32` | **只有三个值**：`read-only` / `workspace-write` / `danger-full-access`。`SandboxExecutionPolicy` 的 JSDoc 明写「Network and process visibility are outside this vocabulary」 |
| 可写集推导 | `sandbox/src/roots.ts:103` | `writableRoots()` 是唯一推导：workspace + `additionalWritableRoots` + **`/tmp` + `os.tmpdir()`**。注释给的理由是 mkstemp 家族工具需要 |
| Profile 构造 | `sandbox-local/src/profiles.ts:53` | Seatbelt 是**黑名单式**：`(allow default)(deny file-write*)` + 白名单 `/dev/null` + 可写根 `subpath` |
| 后端链 | `sandbox-local/src/index.ts:178` | `linux:['bwrap','landlock']` · `darwin:['seatbelt']` · `win32:['windows-acl']`。**平台优先、probe 次之**；单候选不 probe |
| 强制报告 | `sandbox-local/src/index.ts:196` | bwrap / landlock / seatbelt 报 `full`；**windows-acl 报 `partial`**（硬链接、非受限读、AppContainer-ACL） |
| 结果归属 | `sandbox/src/diagnostics.ts:65` | 两套方言：`denialSignatures`（沙箱正常拦截）vs `runnerFailureRules`（命令根本没跑） |
| 升级 | `sandbox/src/escalation.ts:64` | `read-only → [workspace-write, danger-full-access]`；`workspace-write → [danger-full-access]`；严格更宽在**执行期**检查 |
| 会话覆盖 | `sandbox-policy/src/session-mode.ts:52` | 唯一写路径是 `session.append('sandbox/mode', {mode})`——日志即状态，无外部配置存储 |
| fs 围栏 | `fs/fs-sandbox/src/index.ts:162` | `checkedTarget` 是**进程内可信代码检查**，不是内核边界；README 自述「narrows but does not eliminate the TOCTOU」 |
| 组合 | `bundle/base/cordis.patch.yml:238` | `sandbox-policy` 自身 fail-safe 默认是 `read-only`，但 base bundle **显式改成 `workspace-write`** |

**关键判定（本 spike 的出发点）**：DSH 的沙箱是一道**文件写入围栏**，不是隔离运行环境。三档模式的全部语义只覆盖文件*效果*；读取、网络、进程、信号、syscall、设备、凭证全部在三档下畅通。这个判断需要实测支撑，因为文档只在 `Known Limitations` 里提了一句，容易被读成「边缘情况」而不是「根本边界」。

## §2 目标对象解析：三道防线各自的位置

| 防线 | 机制 | 内核级？ | 覆盖面 |
|---|---|---|---|
| `ctx.sandbox` + `sandbox-local` | 把 argv 包成 `sandbox-exec -p <profile> -- <argv>` | ✅ 是 | 仅文件写入效果 |
| `ctx.fs` + `fs-sandbox` | 写入前在 Node 进程内检查目标路径是否在可写根下 | ❌ 否（可信代码） | 仅文件写入，且只对有 TOCTOU 残余的路径检查 |
| `ctx.approval` + `permission-presets` | 三档预设写入 `sandbox/mode` 事件 | — | 只管「用哪档」+ 是否要问人 |

**三者叠加后的实际边界**：「在 `workspace-write` 下，模型不能*写*工作区外的文件（`/tmp` excepted）。它*能*读任何宿主文件、能访问网络、能 signal 同用户进程。」

## §3 可验证命题（V-xx）

| ID | 命题 | 方法 | 判读门槛 | 终态 |
|---|---|---|---|---|
| **V-01** | 策略词汇确为三值，且 `writableRoots` 是可写集的唯一拥有者（`read-only`/`danger-full-access` 返回空集） | 调真实 `writableRoots({mode,workspaceRoot})` 三档各一次；读 `ESCALATION_TARGETS`/`WIDER_MODES` | `read-only`=[] 且 `danger-full-access`=[] 且 `workspace-write` 含工作区；升级词汇闭合 | **offline PASS** |
| **V-02** | `workspace-write` 给的不是「工作区」，而是「工作区 + 全机 `/tmp` + 全机 per-user TMPDIR」 | 打印 `writableRoots` 全量；再用 A 会话的 profile 改写 `/tmp` 下 B 会话的工作区文件 | 可写集含 ≥1 个非工作区路径，且跨会话改写实测成功 | **offline PASS**（跨会话泄漏确认） |
| **V-03** | canonicalization 是承重的：非 canonical 拼写的 `subpath` 永不匹配，会让 `workspace-write` 在自家工作区里也拒绝写入 | 工作区置于符号链接前缀下（`/tmp/...`），对照 canonical 与 literal 两种 profile | canonical→rc=0 且 literal→rc≠0 | **offline PASS** |
| **V-04** | `additionalWritableRoots` 能扩展可写集；相对/符号链接/不存在三类一律 `SANDBOX_INVALID_ROOT` | 三档非法输入各跑一次 + 一个合法外部根 | 合法根进集合；三类全拒；`canonicalPath` 对缺失路径不发明回退 | **offline PASS** |
| **V-05** | 文件**写入**效果确实受控：write/rename/chmod/hardlink/symlink-escape/mknod 全部被拒 | 七类写操作各一次，全部在 `workspace-write` 下跑 | 7/7 全拒 | **offline PASS** |
| **V-06** | 文件**读取**不受控：宿主秘密文件在两档 confined 模式下都可读 | 植入带标记的秘密文件；读 `~/.ssh`、`~/.dsh`、秘密文件、`/etc/passwd` | 秘密文件内容原样可见；`~/.ssh`/`~/.dsh` 可列 | **offline PASS**（无读隔离） |
| **V-07** | **网络**与**进程**域不受控：confined 子进程能上外网、能 signal 同用户宿主进程 | 两档各 curl 一次；起一个同用户 victim 进程，从沙箱内 `kill -0` / `kill -TERM` | curl 返回 2xx/3xx；victim 被成功 TERM 且死亡 | **offline PASS**（无网络/进程隔离） |
| **V-08** | 拒绝方言分类正确；且文档登记的 in-band runner-failure 误判可复现 | 三场景：真实策略拒绝 / 真实 runner 失败 / 子进程自己打印 `sandbox-exec: ` 后失败 | 拒绝→`runnerFailure=undefined, denial=true`；真失败→`detail` 有值；模仿→**被误判** | **offline PASS** |
| **V-09** | 后端链平台优先、probe 次之；无可用后端时 fail closed（`SANDBOX_UNAVAILABLE`），绝不静默放行 | 从源码读 `PLATFORM_CHAINS` 三行 + 确认 `'unavailable'` 分支抛 `SandboxUnavailableError` | 三平台链与文档一致；存在 fail-closed 终止 | **offline PASS** |
| **V-10** | 出厂组合把整族一起挂上，且 base 把 policy 的 fail-safe 默认覆盖成 `workspace-write` | 读 `dsh-base` patch：七行是否齐；对比 policy 包内默认 | 七行全在；policy 包默认 `read-only` 而 base 覆盖为 `workspace-write` | **offline PASS** |
| **V-11** | 本机三实例的实际部署姿态（只读查证） | `readFileSync` 各实例 `profiles/web/cordis.patch.yml` 取 `defaultPreset` + `plutil` 读 launchd 环境的 `DSH_PERMISSION_MODE` | 记下每实例的真实预设与是否被环境覆盖 | **offline PASS**（生产实例为 `danger-full-access`） |
| **V-12** | `ConfinedArgv` 契约面完整：每个后端都带 enforcement + 自己的拒绝方言 + runner 失败规则 | 枚举已安装 `dsh-sandbox` 导出；从源码读四个 runner 的 `DENIAL_SIGNATURES`/`RUNNER_FAILURE_RULES` | 13 项契约导出全在；四后端方言可读出 | **offline PASS** |

## §4 测试需求

| 需求 | 说明 |
|---|---|
| 环境 | macOS + `/usr/bin/sandbox-exec`（darwin 链唯一候选）；Node ≥ 20；全局安装的 `@deepseek-ai/dsh` |
| 为什么不用 ego-browser | 本 spike 的命题全部是**宿主层**行为（argv 包装、profile 语义、可写集推导），不需要页面渲染。改用真实包导出 + 直接调 `sandbox-exec` 能拿到更干净的因果 |
| 为什么不启动实例 | `dsh-dev` 的 bash 工具调用链要经过模型回合，引入非确定性；直接调 provider 的 profile 构造可隔离变量。**代价**：本 spike 不覆盖 `ctx.shell.execute()` 的装饰与结果归属接线，只覆盖它调用的 `confine()` 产物 |
| 灌入数据 | 仅 `~/.nvx-sandbox-spike/` 下的临时工作区、外部目录、一个带标记的秘密文件 |
| 安全边界 | 网络仅 `GET https://example.com`（状态码）；不登录、不带凭证、不上传；不向 `dsh.local` 写入；victim 进程是本 spike 自己起的 `sleep` |
| 还原 | 每个探针 `removeProbeDirs()` 删 `~/.nvx-sandbox-spike/`；跨会话泄漏探针额外删 `/private/tmp/spike-sibling-ws`；victim 进程被 `SIGKILL` 收尾 |

## §5 测试文件树

```text
test/spike/model-execution-sandbox/
├── README.md                      本宪章（唯一进库文件）
├── .gitignore                     evidence/ samples/ tmp/
├── evidence/                      实测日志（.gitignore，不进库）
│   ├── v01-04-policy.mjs.log      V-01..V-04 可写集与 canonicalization
│   ├── v05-08-boundaries.mjs.log  V-05..V-08 写/读/网/进程面 + 诊断方言
│   └── v09-12-composition.mjs.log V-09..V-12 后端链/组合/部署姿态/契约面
├── samples/                       构造样例（本 spike 未使用，.gitignore）
└── tmp/                           probe 脚本（.gitignore，不进库）
    ├── lib.mjs                    共享 harness：包解析 + profile 逐字复现 + 表格输出
    ├── v01-04-policy.mjs          V-01..V-04
    ├── v05-08-boundaries.mjs      V-05..V-08
    └── v09-12-composition.mjs     V-09..V-12
```

**`lib.mjs` 的两个关键实现细节（踩过的坑，写入宪章以免重犯）**：

1. **必须用 `execFileSync`，不能用 `execSync`**。后者经 shell，会把 SBPL profile 里的括号和引号吃掉，`sandbox-exec` 拿到残缺参数返回 `rc=64`。探针会把它误读成「策略拒绝」，实际是「参数被 shell 吃了」——**一个会静静撒谎的探针**。
2. **必须用非符号链接的工作区**（`$HOME/...`）。macOS 的 `/tmp` 是 `/private/tmp` 的符号链接；拿未 canonical 的路径构造 profile 会让 `workspace-write` 在自家工作区也拒写（V-03 正是拿这个当正命题）。

## §6 预期测试结果登记位置

| 登记项 | 位置 |
|---|---|
| 每条 V 的终态词 + 关键实测值 | §3 表格「终态」列 + §7 过程/结论 |
| 原始日志 | `test/spike/model-execution-sandbox/evidence/*.log`（`.gitignore`，不入库；README 只写指针与数字） |
| 能力/缺口对照表 | §7.2，供后续 dsh-nano-local-sandbox-v0.9 设计直接引用 |
| 部署姿态事实 | §7.4 |
| 风险与决策建议 | §8 |
| 收口状态 | §7.5 |

**转正路径**：本 spike 收口后，结论进 `docs/specs/dsh-nano-local-sandbox/dsh-nano-local-sandbox-v0.9.md`（已在 §3 引用本 spike 的数值）；若要改产品行为，走对应包的 `docs/specs/**`。宪章可在转正后整目录删除。

---

## §7 取证过程与结论

### 7.1 前置检查清单

- [x] 宿主平台 darwin / arm64 / Node v24.22.2 / `/usr/bin/sandbox-exec` 存在 / `bwrap` 不存在
- [x] 全局安装的 dsh 为 `0.2.2-rc.1`，`dsh-sandbox` 导出可加载
- [x] `context/deepseek-harness` checkout 可读（源码层探针用）
- [x] 三个探针全部 `node --check` 通过、`exit=0`

### 7.2 关键事实清单

1. **可写集不是工作区，是「工作区 + 全机 `/tmp` + 全机 TMPDIR」**。实测 `workspace-write` 返回 3 个根；A 会话的 confined 子进程成功把 B 会话在 `/tmp` 下的工作区文件改写为 `overwritten`。**跨会话隔离为零。**
2. **canonicalization 是承重的**。工作区置于 `/tmp/spike-ws-under-tmp` 时，canonical profile 写入 `rc=0`，保留 `/tmp` 字面拼写的 profile 写入 `rc=1`（`Operation not permitted`）。没有 `canonicalPath`，`workspace-write` 会失效。
3. **写入面 7/7 全拒**：write outside、write `~/.ssh`、rename、chmod、hardlink、symlink escape、mknod 全部 `rc≠0`。这块做对了。
4. **读取面 10/10 全通**：带标记的秘密文件 `spike-host-secret-do-not-exfiltrate` 在两档 confined 模式下都原样读出；`~/.ssh` 返回 `agent`、`~/.dsh` 返回 `attachments`、`/etc/passwd` 正常读。**无读隔离。**
5. **网络面开放**：两档 curl 均返回 `http=200`。**无网络隔离。**
6. **进程面开放且不对称**：confined 子进程 `ps` 看不见 victim（意外受限），但 `kill -0` 和 `kill -TERM` 都成功，victim 被杀。**看不见 ≠ 碰不到。**
7. **诊断方言分类正确**：策略拒绝 → `runnerFailure=undefined, denial=true`；真 runner 失败（profile 语法错，rc=65）→ `detail="sandbox-exec: syntax error: expecting ')'"`。
8. **in-band 误判可复现**：子进程打印 `sandbox-exec: impersonated` 后 `exit 7` → 被判为 runner 失败。这与文档登记的「Runner diagnostics are in-band」一致；**无法绕过隔离，只会错归因**。
9. **后端链与文档一致**：`linux=['bwrap','landlock']`、`darwin=['seatbelt']`、`win32=['windows-acl']`；无可用后端返回 `'unavailable'` 并抛 `SandboxUnavailableError`。
10. **出厂默认不是最严的**：`sandbox-policy` 包自身默认 `read-only`，但 `dsh-base` 把 `mode` 覆盖为 `workspace-write`。
11. **生产实例实际上无约束**：`~/.dsh/profiles/web/cordis.patch.yml` 的 `defaultPreset` 是 `danger-full-access`，且 `DSH_PERMISSION_MODE` 未设置。新会话 bash 直接 spawn，approval 为 `never`。
12. **契约面完整**：13 项 `dsh-sandbox` 导出全在；四后端方言可读出（bwrap→`read-only file system`、landlock→`permission denied`、seatbelt→`operation not permitted`、windows-acl→四条并集）。

### 7.3 实测数值

| 项 | 值 |
|---|---|
| `writableRoots(read-only)` | `[]` |
| `writableRoots(workspace-write)` | `[<ws>, /private/tmp, /private/var/folders/.../T]`（3 个） |
| `writableRoots(danger-full-access)` | `[]` |
| 跨会话 `/tmp` 改写 | `rc=0`，文件变为 `overwritten` |
| per-user TMPDIR 写入 | `rc=0` |
| canonical profile 写工作区（工作区在 `/tmp` 下） | `rc=0` |
| literal `/tmp` profile 同写入 | `rc=1` `Operation not permitted` |
| 额外根非法输入 | relative / symlink / missing → 均 `SANDBOX_INVALID_ROOT` |
| 写入面 | 7/7 拒绝 |
| 读取面 | 10/10 可读（含秘密文件、`~/.ssh`、`~/.dsh`） |
| 网络 | `curl` 两档均 `http=200` |
| 进程 | `kill -0`=yes、`kill -TERM`=yes、victim 死亡 |
| 策略拒绝分类 | `runnerFailure=undefined`、`denial=true` |
| 真 runner 失败 | `rc=65`、`detail="sandbox-exec: syntax error: expecting ')'"` |
| 模仿签名 | `rc=7`、`detail="sandbox-exec: impersonated"`（误判） |
| 契约导出 | 13/13 present |
| 后端方言条数 | 8 条（4 拒绝 + 4 runner 失败规则） |

### 7.4 本机三实例部署姿态（只读查证）

| 实例 | `defaultPreset` | `DSH_PERMISSION_MODE` | 实际效果 |
|---|---|---|---|
| **dsh.local**（生产） | `danger-full-access` | `unset` | **新会话 bash 无约束**，approval `never` |
| dsh-dev（开发） | `(unset)` | `unset` | 走 base 默认 `workspace-write` + `ask` |
| dsh-desktop | `(unset)` | `unset` | 同上 |

> 这是部署选择，不是缺陷。但必须登记为事实：**生产实例上的「沙箱」今天不存在。**

### 7.5 终态表

| 命题 | 终态 |
|---|---|
| V-01 | **offline PASS** |
| V-02 | **offline PASS**（跨会话泄漏确认） |
| V-03 | **offline PASS** |
| V-04 | **offline PASS** |
| V-05 | **offline PASS** |
| V-06 | **offline PASS**（无读隔离） |
| V-07 | **offline PASS**（无网络/进程隔离） |
| V-08 | **offline PASS** |
| V-09 | **offline PASS** |
| V-10 | **offline PASS** |
| V-11 | **offline PASS** |
| V-12 | **offline PASS** |

## §8 结论与决策建议

**结论：DSH 当前的沙箱是一道可靠的「文件写入围栏」，不是隔离运行环境。写入面 7/7 全拒说明这一层做得对；但读取、网络、进程三个域完全没有覆盖，且 `/tmp` 的整目录授权让跨会话隔离归零。**

| 缺口 | 后果 | 建议 |
|---|---|---|
| 无读隔离（V-06） | 模型可读 `~/.ssh`、`~/.dsh`、任意宿主文件 | 短期：把「读」纳入 `SandboxMode` 词汇，或至少在 read-only 下限制到工作区；长期：NVX 类 VM 边界 |
| 无网络隔离（V-07） | 数据外泄路径完全开放 | 短期：文档明确「本沙箱不防外泄」；长期：等后端能强制 `--unshare-net`（Linux）后再入词汇 |
| 无进程隔离（V-07） | confined 子进程可 signal 同用户宿主进程 | 短期：文档明示；长期：PID 命名空间 |
| `/tmp` 整目录授权（V-02） | 跨会话隔离为零 | 改为**每会话私有 tmp 子目录**而非整机 `/tmp`；mkstemp 需求可用 `$TMPDIR/<session>` 满足 |
| 生产实例 `danger-full-access`（V-11） | 生产上沙箱等于关闭 | 业主决策；本 spike 只登记事实，不改配置 |
| 无独立线上协议（V-12） | 拒绝靠 stderr 方言，in-band 可被模仿（V-08） | 与 NVX 的 NVXS/NVXC 双栈对比：后者有带类型的帧与 capability 认证 |

**与 NVX 的关系**：本 spike 实测的六项缺口（读 / 网络 / 进程 / 跨会话 / syscall / 凭证）恰好是 NVX 的硬件虚拟化边界所覆盖的面。详见 `docs/specs/dsh-nano-local-sandbox/dsh-nano-local-sandbox-v0.9.md`。

**转正路径**：本 spike 只产事实。若要改行为，最小切入点是 `/tmp` 整目录授权（V-02）——它改动面小、收益明确（恢复跨会话隔离），不需要新词汇也不需要新后端。读 / 网络 / 进程三域需要词汇层决策，建议与 NVX 评估一并决策。

## §9 终态

**结论：边界已测清（RECORDED）。** DSH 当前 `SandboxMode` 三档的全部语义只覆盖文件*效果*：写入面 7/7 全拒（可靠），读取面 10/10 全通、网络 `http=200`、同用户进程可被 `SIGTERM`（三个域零覆盖）。`/tmp` 与 per-user TMPDIR 的整目录授权让**跨会话隔离为零**（实测会话 A 改写了会话 B 在 `/tmp` 下的工作区文件）。canonicalization 是承重的——去掉它，`workspace-write` 在符号链接工作区下会失效。诊断层两套方言分离正确，但 in-band runner-failure 误判可复现（无法绕过隔离，只能错归因）。

**最大风险点**：生产实例 `dsh.local` 的 `defaultPreset` 为 `danger-full-access`，新会话 bash 直接 spawn、approval 为 `never`——**生产上的「沙箱」今天不存在**。这是部署选择而非缺陷，但必须登记。

**最小可行动项**：`/tmp` 整目录授权（V-02）。改每会话私有 tmp 子目录即可恢复跨会话隔离，不动词汇、不动后端。读 / 网络 / 进程三域需要词汇层决策，建议与 `dsh-nano-local-sandbox-v0.9` 的 NVX 边界评估一并定案。

**下一步**：本宪章的 12 项数值作为 `docs/specs/dsh-nano-local-sandbox/dsh-nano-local-sandbox-v0.9.md` 的基线证据；若要追 NVX 侧的对应能力，见该文档 §6.10 的逐条隔离对照表。

---

## §10 后续：远端 NVX 实测（2026-11-12，已清理）

本宪章的 V-01–V-12 只覆盖 **DSH 原生沙箱**。业主后续要求验证 NVX 作为后端的可行性，实测在授权主机上完成，完整日志见 [`docs/specs/dsh-nano-local-sandbox/dsh-nano-local-sandbox-v0.9.md`](../../../docs/specs/dsh-nano-local-sandbox/dsh-nano-local-sandbox-v0.9.md)。此处只登记与本宪章直接相关的对照结论。

### 10.1 NVX 隔离剖面 vs 原生（同一威胁模型下）

在 `frd1`（Linux x86_64）上跑官方 `nvx-0.1.0-linux-kvm` 的 managed sandbox，`exec` 实测：

```
uid=65534(nobody) gid=65534(nogroup)
CapEff: 0000000000000000
NoNewPrivs: 1
NS=pid:[4026532146]
```

对照本宪章 V-06/V-07 列出的三个零覆盖域：

| 域 | 原生（本宪章实测） | NVX（远端实测） |
|---|---|---|
| 文件读 | ❌ `~/.ssh`、`~/.dsh`、任意宿主文件可读 | ✅ 只有声明的 share 可见 |
| 网络 | ❌ `curl` 返回 200 | ✅ egress/ingress 策略，可 deny-all |
| 进程 | ❌ 可 `SIGTERM` 同用户宿主进程 | ✅ 独立 PID 命名空间 |
| 跨会话 | ❌ `/tmp` 整目录共享 | ✅ 独立 VM + 独立 upper |

**结论：本宪章 V-02/V-06/V-07 记录的三个缺口，恰好是 NVX 硬件虚拟化边界的覆盖范围。**

### 10.2 NVX 侧的 fail-closed 实证

`nvx-rs sandbox provision` 在 store 目录为 `mode 755` 时直接拒绝：

```
error[io]: the sandbox store /tmp/nvx-spike-sb is accessible to other users (mode 755)
```

与本宪章 V-09 验证的 `SANDBOX_UNAVAILABLE` 同类——两个系统都把「无法保障」当成失败而非降级。

### 10.3 与本 spike 的方法论一致之处

| 项 | 本宪章 | NVX 实测 |
|---|---|---|
| 不启动生产实例 | ✅ | ✅ 只在授权远端主机 |
| 证据形态 | 实测数值 + 日志指针 | 同 |
| 清理 | `~/.nvx-sandbox-spike` 删 | 远端 989 MB + 6.0 GB 两轮均清至 0 |
| 终态词 | `PASS`/`RED`/`NOT_RUN` | 同 |

### 10.4 终态补充

| 命题 | 终态 |
|---|---|
| NVX x86_64 可运行 | **offline PASS**（远端实测） |
| NVX 隔离剖面达标 | **offline PASS** |
| NVX arm 宿主侧可构建 | **offline PASS**（`nvx-rs` 8.5s / `openvmm` 1m00s） |
| NVX arm guest 可启动 | **RED**（6 个 guest 二进制为 x86-gated stub） |
| NVX macOS 可运行 | **RED**（七条独立证据，含本机无 `/dev/kvm`、无 `/dev/mshv`） |
