# sandbox-nano-nvx 可行性评估

> 评估对象：DSH 原生进程沙箱（`context/deepseek-harness`）与 NVX microVM（`context/nvx`），以及用 NVX 替换原生后端构建 `sandbox-nano-nvx` 的可行性
> 评估类型：架构登记 + 本机实证 + 前瞻可行性
> 评估时间：`2026-11-12`
> DSH 基准：commit `e8f7b93a344964de3dca1ace9e72b6e4d6de87cb`，版本 `0.2.2-rc.2`（`dsh-v0.2.2-rc.2-166-ge8f7b93a34`）；本机运行实例为 `0.2.2-rc.1`
> NVX 基准：commit `fc59c9065ceb2a939874123f9cdc856ad7784cf6`，`VERSION = 0.1.0`，openvmm 子模块 pin `90f87319d30d8c35bc3526f12fc7b6529c882cf0`（本 checkout 未初始化）
> 探查平台：macOS 26.5.2 / Darwin 25.5.0 / arm64（`m3max.local`）
> 执行边界：**本机只读探查 + 本地有界复现 + 远端受限实测**。未重启、未部署、未修改三个生产实例。远端实测仅在 `frd1`（Linux x86_64）与 `spark`（Linux aarch64）两台授权主机，测后已彻底清理
> 文档状态：`complete`

---

## 0. 结论摘要

### 0.1 为什么做 sandbox

**nano-sandbox v1 的唯一目标是隔离 `/imagine`。**

`/imagine` 今天在**宿主上**执行第三方 CLI（grok / codex）。它把真实凭据复制进会话工作区、以宿主用户身份运行、拥有完整网络与读取权限。本仓库的安全审查已把其中两条列为 **HIGH**：

| 编号 | 问题 | 严重度 |
|---|---|---|
| `hunter-e:grok-creds-workspace-copy` | 把 `$HOME/.grok/{auth.json,config.toml}` 复制进工作区 → 可被 agent 读、可提交、可被 S3 同步 | **高** |
| `hunter-e:imagine-template-shell-injection` | 模板把 `{prompt}/{out}/{cwd}` 字面替换进双引号 shell → 任意命令执行（**已修复**） | **高** |

详见 [security-audit.md](../../code-review/26-nov/security-audit.md) 第 60–61、89–98 行。

**v1 的解法**：把 grok/codex 放进一个**独立执行环境**（VM），在环境内跑**自建 MCP 服务器**，由 MCP 完成 agentic 工具调用——宿主不再执行这些工具，也不承载它们的凭据。

这带来两个 v1 必须兑现的能力：

| 能力 | 含义 |
|---|---|
| **远程执行** | 环境不必在宿主上：NVX / Apple container 都可以跑在另一台机器 |
| **环境隔离** | 宿主与沙箱使用**完全不同的 env**，宿主装没装 grok/codex 与沙箱无关 |

### 0.2 为什么不能靠 DSH 原生沙箱

**DSH 的沙箱是一个「文件写入围栏」，不是隔离运行环境。** `SandboxMode` 三档只覆盖文件*效果*；网络、进程、信号、syscall、设备、凭证读取全部放行。本机实测：`workspace-write` 下 `curl` 返回 200、`~/.ssh` 可列、`~/.dsh` 可列、同用户宿主进程可被 `SIGTERM` 击杀。详见 §3。

对 `/imagine` 这个场景，原生沙箱**恰好漏掉最关键的三项**：凭据可读、网络开放、进程可触。

### 0.3 v1 的两个包

| 平台 | 架构 | 运行时 | 是否自建运行时 |
|---|---|---|---|
| **Windows** | x86_64 | NVX 官方包 | ❌ 否 |
| **macOS** | arm64 | Apple `container` 官方包 | ❌ 否 |

**Linux 不在 v1**（已有 bwrap/Landlock 原生沙箱）；**arm NVX 永久不做**（无 v1 用例，且需自建 guest 二进制 → 责任转移）。详见 §8B。

### 0.4 责任边界

**nano-sandbox 不打包运行时。** 它做四件事：检测宿主状态、注册构建技能、映射 DSH policy、适配审计链。运行时与工具都由上游提供，我们只提供**确定性配方**。

这条边界是 v1 的核心决策：**我们产出配方，不产出二进制。** 详见 §8B.4。

### 0.5 关键事实（含实测）

| 事实 | 依据 |
|---|---|
| NVX x86_64 可跑，隔离剖面达标 | 远端实测：`uid=65534` / `CapEff=0` / `NoNewPrivs=1` / 独立 PID ns（§5.5） |
| NVX 的 guest 永远是 Linux，Windows 是默认宿主 | `--guest` 默认 `alpine`；Windows quickstart 即 `nvx-rs.exe run`（§5.8） |
| NVX **无任何稳定版** | 15 个 release 全部 `prerelease=True`，均为 `v0.1.0-dev.<commit>`（§8B.5） |
| NVX arm 卡在 6 个 guest stub | `nvx-init`/`nvx-time`/`nvx-exit` 实测静默 `exit 0`（§8.6） |
| NVX 在 macOS 不可行 | 七条独立证据，含本机无 `/dev/kvm`、无 `/dev/mshv`（§5.7） |
| **Apple container 是 macOS 的更优解** | 每容器一 VM，Virtualization.framework 原生；本机满足全部前置（§5.9） |
| Apple container 有稳定版 | 8 个 release 全部 `prerelease=False`，semver（§8B.5） |
| 两者都不能实现 `SandboxProvider` | `confine(argv)` 预设命令在宿主 spawn（§7.1） |
| 审计四字段中两个需构造 | `denied` 无 typed 通道、`enforcement` 无字段（§8A） |

### 0.6 需业主拍板的一件事

**升级语义。** 两个运行时的策略都在创建时固定，DSH 的「被拒 → 申请更宽 → 重试」（`sandbox_permissions`）无法映射。两个选项见 §8B.6。

---

## 1. DSH sandbox 现状登记

### 1.1 包清单

| 包 | 路径 | 角色 | ctx key |
|---|---|---|---|
| `dsh-sandbox` | [packages/sandbox/sandbox](../../../context/deepseek-harness/packages/sandbox/sandbox) | 隔离服务契约：模式、策略、升级词汇、诊断分类 | `ctx.sandbox` |
| `dsh-sandbox-local` | [packages/sandbox/sandbox-local](../../../context/deepseek-harness/packages/sandbox/sandbox-local) | 三平台后端链（bwrap→Landlock / Seatbelt / windows-acl） | 注册到 `ctx.sandbox` |
| `dsh-sandbox-policy` | [packages/sandbox/sandbox-policy](../../../context/deepseek-harness/packages/sandbox/sandbox-policy) | 部署默认 + 每会话覆盖的唯一住所 | `ctx.sandboxPolicy` |
| `dsh-sandbox-windows-acl` | [packages/sandbox/sandbox-windows-acl](../../../context/deepseek-harness/packages/sandbox/sandbox-windows-acl) | Windows 受限令牌 + capability SID | win32 后端 |
| `dsh-fs-sandbox` | [packages/fs/fs-sandbox](../../../context/deepseek-harness/packages/fs/fs-sandbox) | 模型文件工具的策略围栏（进程内） | `ctx.fs` |
| `dsh-bash-sandbox` | [packages/shell/bash-sandbox](../../../context/deepseek-harness/packages/shell/bash-sandbox) | 受控 bash 执行器 | `ctx.shell` |
| `dsh-pwsh-sandbox` | [packages/shell/pwsh-sandbox](../../../context/deepseek-harness/packages/shell/pwsh-sandbox) | 受控 pwsh 执行器 | `ctx.shell` |
| `dsh-sandbox-ssh` | [packages/ssh/sandbox-ssh](../../../context/deepseek-harness/packages/ssh/sandbox-ssh) | 远程 `ctx.sandbox`（远端自选后端） | `ctx.sandbox` |

### 1.2 词汇与语义

```ts
type SandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access'
type SandboxEnforcement = 'full' | 'partial'
```

| 模式 | 文件写 | 文件读 | 网络 | 进程 |
|---|---|---|---|---|
| `read-only` | 仅 `/dev/null` 等必要 sink | 全开 | 全开 | 全开 |
| `workspace-write` | 工作区 + `/tmp` + `os.tmpdir()` | 全开 | 全开 | 全开 |
| `danger-full-access` | 不调用 `ctx.sandbox`，直接 spawn | 全开 | 全开 | 全开 |

`enforcement` 是**上报事实**而非承诺：`full` 表示后端治理了该模式承诺的每一个文件效果；`partial` 表示只有子集（老 Landlock ABI、Windows ACL 硬链接/非受限读/AppContainer-ACL 三类边界）。

### 1.3 执行链拓扑

```
                         ┌──────────────────────────────────────┐
                         │  session log (sandbox/mode event)     │
                         │  ← per-session override (durable)     │
                         └───────────────┬──────────────────────┘
                                         │ fold → sandboxMode projection
                                         ▼
┌──────────────┐  resolve({session})  ┌──────────────────────────┐
│ tool-bash    │──────────────────────▶│ ctx.sandboxPolicy        │
│ tool-fs      │                      │  mode = override         │
│ tool-pwsh    │                      │      ?? deploymentMode   │
└──────┬───────┘                      │  workspaceRoot = sess.cwd│
       │ per-call SandboxExecutionPolicy  ?? configRoot          │
       ▼                              │  additionalWritableRoots │
┌──────────────┐                      └──────────────────────────┘
│ ctx.shell    │── confinement ──┐
│ (bash-sandbox)│                │
└──────┬───────┘                ▼
       │                  ┌─────────────────────┐
       │                  │ ctx.sandbox          │
       │                  │  .confine(argv,pol)  │
       │                  └──────────┬───────────┘
       │                             │ 后端链（platform 优先，probe 仲裁）
       │              ┌──────────────┴───────────────┐
       │              ▼                              ▼
       │      linux: bwrap → landlock        darwin: seatbelt
       │      win32: windows-acl
       │                             │
       ▼                             ▼
  spawn(wrapped argv)  ◀──── ConfinedArgv { argv, enforcement,
                                             denialSignatures,
                                             runnerFailureRules }
       │
       ▼
  结果归属：classifyRunnerFailure（命令没跑）vs matchesSignature（沙箱正常拦截）
```

### 1.4 组合拓扑（`dsh-base` bundle）

[packages/bundle/base/cordis.patch.yml](../../../context/deepseek-harness/packages/bundle/base/cordis.patch.yml) 第 238–300、537–540 行：

```yaml
- id: sandbox
  name: '@deepseek-ai/dsh-sandbox-local'
- id: sandbox-policy
  name: '@deepseek-ai/dsh-sandbox-policy'
  config:
    mode: !!js process.env.DSH_PERMISSION_MODE ?? 'workspace-write'
    workspaceRoot: !!js process.cwd()
- id: bash-sandbox
  name: '@deepseek-ai/dsh-bash-sandbox'
  disabled: !!js process.platform === 'win32'
  config: { timeoutMs: 60000 }
- id: pwsh-sandbox
  name: '@deepseek-ai/dsh-pwsh-sandbox'
  disabled: !!js process.platform !== 'win32'
- id: approval
  name: '@deepseek-ai/dsh-user-approval'
  config:
    policy: !!js "(process.env.DSH_PERMISSION_MODE ?? 'workspace-write') === 'danger-full-access' ? 'never' : 'ask'"
- id: permission
  name: '@deepseek-ai/dsh-permission-presets'
  config:
    presets:
      read-only:          { sandbox: read-only,          approval: ask }
      workspace-write:    { sandbox: workspace-write,    approval: ask }
      danger-full-access: { sandbox: danger-full-access, approval: never }
# ... 工具层 ...
- id: fs-sandbox
  name: '@deepseek-ai/dsh-fs-sandbox'
```

**要点**：`sandbox-policy` 自身的 Config 默认是 `mode: 'read-only'`（fail-safe），但 base bundle 显式改成 `workspace-write`。也就是说**出厂默认不是最严格的**。

### 1.5 消费者清单

`ctx.sandbox.confine` 的直接消费者 10 个：

| 消费者 | 路径 |
|---|---|
| `bash-sandbox` | [packages/shell/bash-sandbox/src/index.ts](../../../context/deepseek-harness/packages/shell/bash-sandbox/src/index.ts) |
| `pwsh-sandbox` | [packages/shell/pwsh-sandbox/src/index.ts](../../../context/deepseek-harness/packages/shell/pwsh-sandbox/src/index.ts) |
| `pwsh-local` | [packages/shell/pwsh-local/src/index.ts](../../../context/deepseek-harness/packages/shell/pwsh-local/src/index.ts) |
| `terminal-bash` | [packages/terminal/terminal-bash/src/index.ts](../../../context/deepseek-harness/packages/terminal/terminal-bash/src/index.ts) |
| `ptc-runtime-node` | [packages/ptc-runtime/ptc-runtime-node/src/worker.ts](../../../context/deepseek-harness/packages/ptc-runtime/ptc-runtime-node/src/worker.ts) |
| `sandbox-ssh` | [packages/ssh/ssh/src/helper.ts](../../../context/deepseek-harness/packages/ssh/ssh/src/helper.ts) |
| `api-terminal-controller` | [packages/api/terminal-controller/src/index.ts](../../../context/deepseek-harness/packages/api/terminal-controller/src/index.ts) |
| `experimental/client-ui-forge` | [packages/experimental/client-ui-forge/src/git.ts](../../../context/deepseek-harness/packages/experimental/client-ui-forge/src/git.ts) |
| `experimental/worktree` | [packages/experimental/worktree/src/process.ts](../../../context/deepseek-harness/packages/experimental/worktree/src/process.ts) |
| `experimental/ptc-runtime-python` | [packages/experimental/ptc-runtime-python/src/index.ts](../../../context/deepseek-harness/packages/experimental/ptc-runtime-python/src/index.ts) |

读取 `ctx.sandboxPolicy.resolve()` 的包共 16 个（含上一组大部分，外加 `liveshare`、`plugin-manager`、`workflow-ptc`、`fs-ssh`、`fs-sandbox`、`terminal-panel`）。

### 1.6 未接入沙箱的 spawn 路径（重要）

| 路径 | 事实 |
|---|---|
| **MCP stdio 服务器** | [mcp-client/src/transport.ts](../../../context/deepseek-harness/packages/mcp/mcp-client/src/transport.ts) 用 MCP SDK 自己的 `StdioClientTransport` 直接 spawn。注释明写：`The MCP SDK owns the actual spawn, so this transport shares the scrub definition rather than the spawn path.` **只借用了 `scrubbedParentEnv()` 做凭证擦洗** |
| **外部子代理 CLI** | `subagent-claude-code` / `subagent-codex` / `subagent-oar` 都是原生进程；codex 的 `sandbox` 字段是 **Codex 自己的**沙箱 |
| **OAR** | [subagent-oar/README.md](../../../context/deepseek-harness/packages/experimental/subagent-oar/README.md) 第 163 行：`DSH does not apply its subprocess sandbox or managed descendant cleanup to those processes.` |
| **PTC Node `isolation`** | [ptc-runtime-node/src/index.ts](../../../context/deepseek-harness/packages/ptc-runtime/ptc-runtime-node/src/index.ts) 第 28 行 `isolation = 'process'` 指「新进程」，不是安全隔离；scoped REPL 注释：`it is not isolation` |
| **LiveShare PTC** | [liveshare/README.md](../../../context/deepseek-harness/packages/experimental/liveshare/README.md) 第 93 行：`Shared PTC programs are not sandboxed to the share.` |

---

## 2. Policy 与协议层深度分析（焦点代码区域）

### 2.1 焦点区域索引

| # | 文件 | 行数 | 职责 | 回顾优先级 |
|---|---|---|---|---|
| F1 | [sandbox/src/index.ts](../../../context/deepseek-harness/packages/sandbox/sandbox/src/index.ts) | 230 | seam 契约、`SandboxMode`、`SandboxExecutionPolicy`、`ConfinedArgv`、`SandboxUnavailableError` | ★★★ |
| F2 | [sandbox/src/escalation.ts](../../../context/deepseek-harness/packages/sandbox/sandbox/src/escalation.ts) | 263 | 严格更宽表、`approveEscalation`、模型侧措辞 | ★★★ |
| F3 | [sandbox/src/roots.ts](../../../context/deepseek-harness/packages/sandbox/sandbox/src/roots.ts) | 106 | 可写根唯一推导（Seatbelt profile 与 fs 围栏共享） | ★★★ |
| F4 | [sandbox/src/diagnostics.ts](../../../context/deepseek-harness/packages/sandbox/sandbox/src/diagnostics.ts) | 100 | `classifyRunnerFailure` / `matchesSignature` / `isRunnerSpawnFailure` | ★★★ |
| F5 | [sandbox-local/src/index.ts](../../../context/deepseek-harness/packages/sandbox/sandbox-local/src/index.ts) | 626 | 平台链、probe、`confine`、Windows ACL 授权 | ★★★ |
| F6 | [sandbox-local/src/profiles.ts](../../../context/deepseek-harness/packages/sandbox/sandbox-local/src/profiles.ts) | 60 | 三种 runner 的 argv/profile 构造 | ★★★ |
| F7 | [sandbox-policy/src/index.ts](../../../context/deepseek-harness/packages/sandbox/sandbox-policy/src/index.ts) | 273 | 优先序解析、根回退、`registerWritableRoot`、runtime-context 渲染 | ★★★ |
| F8 | [sandbox-policy/src/session-mode.ts](../../../context/deepseek-harness/packages/sandbox/sandbox-policy/src/session-mode.ts) | 55 | `sandbox/mode` 事件（唯一写路径） | ★★★ |
| F9 | [fs-sandbox/src/index.ts](../../../context/deepseek-harness/packages/fs/fs-sandbox/src/index.ts) | 181 | `checkedTarget` 围栏 | ★★★ |
| F10 | [fs-sandbox/src/containment.ts](../../../context/deepseek-harness/packages/fs/fs-sandbox/src/containment.ts) | 76 | `isPathUnder` 词法快路径 + 身份回退 | ★★ |
| F11 | [bash-sandbox/src/index.ts](../../../context/deepseek-harness/packages/shell/bash-sandbox/src/index.ts) | — | 结果归属：runner failure 优先于 denial | ★★★ |
| F12 | [tool-bash/src/index.ts](../../../context/deepseek-harness/packages/shell/tool-bash/src/index.ts) | — | `sandbox_permissions` schema、`approveBashEscalation` | ★★ |

### 2.2 策略解析优先序

[sandbox-policy/src/index.ts](../../../context/deepseek-harness/packages/sandbox/sandbox-policy/src/index.ts) 第 215 行：

```ts
mode: request.mode ?? (session === undefined ? undefined : this.overrideOf(session)) ?? this.defaultMode
```

即：**升级授权 > 会话日志覆盖 > 部署默认**。

`workspaceRoot` 来自 `sessionWorkspaceRoot(session)`（会话不可变 cwd），回退到配置的 `workspaceRoot`（base bundle 给的是 `process.cwd()`）。

### 2.3 会话覆盖是日志事件

`setSandboxMode(session, mode)` 只做一件事：`session.append('sandbox/mode', { mode })`。这是**唯一写路径**，因此：

- 重启后靠 replay 重建
- 两个会话永不串味
- 没有外部配置存储
- 该事件 log-only，**不进模型 transcript**

### 2.4 可写根的单一推导（防漂移设计）

[sandbox/src/roots.ts](../../../context/deepseek-harness/packages/sandbox/sandbox/src/roots.ts)：

```ts
export function workspaceWritableRoots(policy): string[] {
  if (policy.mode !== 'workspace-write') return []
  const additional = (policy.additionalWritableRoots ?? []).map(additionalRoot)
  return [...new Set([canonicalPath(policy.workspaceRoot), ...additional])]
}

export function writableRoots(policy): string[] {
  if (policy.mode !== 'workspace-write') return []
  return [...new Set([...workspaceWritableRoots(policy), canonicalPath('/tmp'), canonicalPath(tmpdir())])]
}
```

设计意图正确且重要：**Seatbelt profile 和 fs 围栏吃的是同一份可写集**，不可能漂移。

额外的根在 `additionalRoot()` 中被拒绝三类：相对的、不能读的、**realpath 与字面路径不一致的（即符号链接别名）**。

### 2.5 升级机制

[escalation.ts](../../../context/deepseek-harness/packages/sandbox/sandbox/src/escalation.ts) 第 64 行：

```ts
export const WIDER_MODES = {
  'read-only': ['workspace-write', 'danger-full-access'],
  'workspace-write': ['danger-full-access'],
}
export const ESCALATION_TARGETS = ['workspace-write', 'danger-full-access']
```

设计要点：

1. **严格更宽在执行期检查**，不烘焙进 schema（schema 是 registry-global，有效模式是 per-call 真相）
2. `justification` 缺失或空白 → `SANDBOX_ESCALATION_INVALID_ARGUMENT`
3. 审批链缺失 / agent 缺失 → `SANDBOX_ESCALATION_UNAVAILABLE`
4. `allowed-once` 才算通过；`rejected` → `SANDBOX_ESCALATION_REJECTED`，`cancelled` → `SANDBOX_ESCALATION_CANCELLED`
5. `never` 策略下审批链**根本不 dispatch**，确定性返回 `rejected`

模型侧看到的措辞（实测打印）：

```
[sandbox: file access denied under workspace-write mode]
[sandbox: escalation available — retry this exact command once with sandbox_permissions
 (the narrowest wider mode that suffices) + justification; the approval prompt asks the user]
```

### 2.6 结果归属：两套方言的分离（设计得最精细的一处）

[sandbox-local/src/index.ts](../../../context/deepseek-harness/packages/sandbox/sandbox-local/src/index.ts) 第 216–256 行：

| runner | `denialSignatures` | `runnerFailureRules` |
|---|---|---|
| bwrap | `['read-only file system']` | `[{ fatalSignatures: ['bwrap: '] }]` |
| landlock | `['permission denied']` | `[{ allowedExitCodes: [125], fatalSignatures: ['landlock-run: '], informationalLines: ['landlock-run: partial enforcement (older Landlock ABI)'] }]` |
| seatbelt | `['operation not permitted']` | `[{ fatalSignatures: ['sandbox-exec: '] }]` |
| windows-acl | `['access is denied', 'access to the path', 'permission denied', 'operation not permitted']` | `[{ allowedExitCodes: [127], fatalSignatures: ['windows-acl-run: '] }]` |

语义区分：

- **runner failure** = 命令**根本没跑** → 抛 `SandboxUnavailableError`（基础设施故障）
- **denial** = 沙箱正常工作并拦截了 → 返回 `sandbox.denied = true`（策略拒绝）

[bash-sandbox/src/index.ts](../../../context/deepseek-harness/packages/shell/bash-sandbox/src/index.ts) 第 120 行注释写明优先序：`Runner failure outranks denial because the command did not run.`

### 2.7 协议层：无独立线上协议

**DSH 的沙箱侧没有自己的线上协议。** 所谓「协议」只有三样东西：

1. **`ConfinedArgv`**（进程内数据结构，非线格式）
2. **stderr 文本方言**（`denialSignatures` / `runnerFailureRules`）
3. **会话日志事件**（`sandbox/mode`、`approval/asked`、`approval/decided`）

**这是一个设计上的弱点**（DSH 自己也承认）：`Denial reporting is a stderr dialect — the seam returns backend signatures instead of a typed runtime denial channel`。

### 2.8 已知的结构性缺口（逐条登记）

| 缺口 | 出处 | 影响 |
|---|---|---|
| 策略词汇只管文件效果 | [sandbox/README.md](../../../context/deepseek-harness/packages/sandbox/sandbox/README.md) 第 166 行 | 网络/进程/syscall/设备/凭证全部不管 |
| same-world only | 同上第 167 行 | 容器/microVM/远程需替换整个能力实现 |
| 拒绝靠 stderr 方言 | 同上第 168 行 | 无类型化拒绝通道 |
| runner 诊断带内 | 同上第 169 行 | 子进程模仿 runner 可造成错误归因（**无法绕过隔离**） |
| 每 context 一个 provider | 同上第 170 行 | 不能同时挂多种沙箱机制 |
| fs 围栏不是内核边界 | [fs-sandbox/README.md](../../../context/deepseek-harness/packages/fs/fs-sandbox/README.md) 第 125 行 | 残余 resolve→syscall TOCTOU |
| Windows 额外根只对文件工具有效 | [sandbox-local/README.md](../../../context/deepseek-harness/packages/sandbox/sandbox-local/README.md) 第 133 行 | PowerShell/终端/PTC 拿不到额外根 |
| Windows 强制 partial | 同上第 134 行 | 硬链接、非受限读、AppContainer-ACL |
| Landlock 可能 partial | 同上第 135 行 | 老 ABI 只治理其暴露的访问类 |
| Seatbelt 依赖废弃 API | 同上第 136 行 | Apple 移除即失效 |
| runner 选择被 provider 生命周期缓存 | 同上第 137 行 | 装/卸 runner 需重载插件 |
| `runnerCommand` 是运维断言 | 同上第 138 行 | 配置的自定义 runner 跳过 probe，被假定诚实 |
| 网络策略未决 | [2026-07-06-sandbox.md](../../../context/deepseek-harness/.agents/notes/archived/feature/2026-07-06-sandbox.md) 第 60 行 | `network_mode` vs 并入 `sandbox_mode` 未定 |
| 环境一致能力组未决 | [sandbox-local/README.md](../../../context/deepseek-harness/packages/sandbox/sandbox-local/README.md) 第 150 行 | 「remains undecided」 |
| 单接口跨容器/VM 已被否决 | [2026-07-06-sandbox.md](../../../context/deepseek-harness/.agents/notes/archived/feature/2026-07-06-sandbox.md) 第 149 行 | `confine(argv)` 预设共享文件系统 |

---

## 3. macOS 本机实证（验证口径与结果）

### 3.1 环境

```
ProductName:    macOS
ProductVersion: 26.5.2
BuildVersion:   25F84
Darwin 25.5.0 (RELEASE_ARM64_T6031) arm64
sandbox-exec:   /usr/bin/sandbox-exec（存在）
bwrap:          不存在（macOS 无）
```

macOS 链只有 `seatbelt` 一个候选，**不做 probe**（`PLATFORM_CHAINS.darwin = ['seatbelt']`，单候选直接选中）。

### 3.2 验证方法（可复现）

不启动 dsh 实例，直接调用**已安装的 `dsh-sandbox` 真实导出**构造 profile，再用真实 `sandbox-exec` 执行：

```js
const sb = await import('.../dsh-sandbox/lib/index.js');
const roots = sb.writableRoots({ mode, workspaceRoot: WS });   // ← 真实推导
const forms = ['(version 1)', '(allow default)', '(deny file-write*)',
  `(allow file-write* (literal "/dev/null"))`];
if (roots.length) forms.push(`(allow file-write* ${roots.map(r => `(subpath "${r}")`).join(' ')}`);
execFileSync('/usr/bin/sandbox-exec', ['-p', forms.join(' '), '--', ...argv]);
```

这与 [profiles.ts](../../../context/deepseek-harness/packages/sandbox/sandbox-local/src/profiles.ts) 第 53–58 行的 `seatbeltProfileArgs()` 逐字一致（已比对安装版 `lib/index.js` 的 `seatbeltProfileArgs` 源码确认）。

### 3.3 生成的 profile 原文

`read-only`：

```scheme
(version 1)(allow default)(deny file-write*) (allow file-write* (literal "/dev/null"))
```

`workspace-write`（工作区 `/Users/seanz/nvx-eval/ws`）：

```scheme
(version 1)(allow default)(deny file-write*)
(allow file-write* (literal "/dev/null"))
(allow file-write* (subpath "/Users/seanz/nvx-eval/ws")
                   (subpath "/private/tmp")
                   (subpath "/private/var/folders/vg/sjg5n6857zl4jvrz1cpdywhm0000gn/T"))
```

**注意 `(allow default)` 打底** —— 这是黑名单式构造：只拦 `file-write*`，其余一律放行。

### 3.4 实测结果矩阵

| # | 探测项 | `read-only` | `workspace-write` | 判定 |
|---|---|---|---|---|
| 1 | 写工作区 | ❌ `Operation not permitted` | ✅ rc=0 | 符合设计 |
| 2 | 写工作区外 | ❌ | ❌ | 符合设计 |
| 3 | 写 `~/.ssh` | ❌ | ❌ | 符合设计 |
| 4 | 写 `/dev/null` | ✅ | ✅ | 符合设计 |
| 5 | **读 `~/.ssh`（列表）** | ✅ **`agent`** | ✅ **`agent`** | ⚠️ **无读隔离** |
| 6 | **读 `~/.dsh`（列表）** | ✅ **`attachments`** | ✅ **`attachments`** | ⚠️ **无读隔离** |
| 7 | **读工作区外秘密文件** | ✅ **`host-secret-value`** | ✅ **`host-secret-value`** | ⚠️ **无读隔离** |
| 8 | 读 `/etc/passwd` | ✅ | ✅ | 无读隔离 |
| 9 | **`curl https://example.com`** | ✅ **`code:200`** | ✅ **`code:200`** | ⚠️ **无网络隔离** |
| 10 | `ps ax` | ❌（`/bin/ps` denied） | ❌ | 偶然受限 |
| 11 | **`kill -TERM` 同用户宿主进程** | ✅ **SUCCESS，进程被杀** | ✅ **SUCCESS** | ⚠️ **无信号隔离** |
| 12 | `kill -0` 跨用户（pid 1） | ❌ | ❌ | POSIX 正常 |
| 13 | 硬链接工作区外文件进工作区 | ❌ | ❌ | 符合设计 |
| 14 | 符号链接逃逸写 | ❌ | ❌ | 符合设计 |
| 15 | `chmod` 工作区外文件 | ❌ | ❌ | 符合设计 |
| 16 | `rename` 工作区外文件 | ❌ | ❌ | 符合设计 |
| 17 | `mknod` 字符设备 | ❌ | ❌ | 符合设计 |

### 3.5 关键实证：`/tmp` 与 `TMPDIR` 是整目录授权

`writableRoots(workspace-write)` 实测输出：

```json
["/Users/seanz/nvx-eval/ws",
 "/private/tmp",
 "/private/var/folders/vg/sjg5n6857zl4jvrz1cpdywhm0000gn/T"]
```

这意味着**任意两个会话共享 `/tmp` 与整个 per-user TMPDIR 的写权限**。实测：

```
=== 会话 A 能否写进会话 B 的工作区（因为 /tmp 被整目录授权）？===
  -> exit=0
  content now: compromised          ← B 的私密文件被改写

=== 能否写 per-user TMPDIR 下的任意文件？===
  content now: tampered             ← 被篡改

=== 能否在 TMPDIR 创建别的进程会信任的文件？===
  created: /private/var/folders/.../T/dsh-trust-me.lock   ← 可创建
```

**这是 `workspace-write` 语义的真实边界：它不是「工作区可写」，而是「工作区 + 全机 `/tmp` + 全机 per-user TMPDIR 可写」。** 代码注释对 `/tmp` 的解释是「mkstemp 家族工具需要」——理由成立，但代价是跨会话隔离为零。

### 3.6 关键实证：`(allow default)` 的实际含义

`ps` 失败但 `kill` 成功，揭示了 `(allow default)` 黑名单模型的形状：

- `ps` 需要读内核进程表（`sysctl`/`kvm`），Seatbelt 的 `deny file-write*` 之外还有隐式限制 → 意外失败
- `kill(2)` 是信号投递，不受 `file-write*` 约束 → **畅通**

结论：**DSH 在 macOS 上的进程域隔离是「偶然的、不对称的」** —— 你看不见进程，但你可以杀它们。这不是设计出来的边界，是黑名单模型的副产品。

### 3.7 关键实证：诊断方言的正确性与已知缺陷

| 场景 | `classifyRunnerFailure` | `matchesSignature` | 判定 |
|---|---|---|---|
| 策略拒绝（`Operation not permitted`，exit 1） | `undefined` ✅ | `true` ✅ | **分类正确** |
| 真 runner 失败（profile 语法错，exit 65） | `{ detail: "sandbox-exec: syntax error: ..." }` ✅ | — | **分类正确** |
| **子进程自己打印 `sandbox-exec: ` 且 exit≠0** | `{ detail: "sandbox-exec: boom" }` ❌ | — | **误判为基础设施故障** |

第三行是 DSH 自己登记的 in-band 限制，本机实测确认其可复现。注意：**此缺陷无法绕过隔离**，只会导致错误的可用性/诊断归因。

### 3.8 关键实证：额外根的三类拒绝

`additionalWritableRoots` 传入非法值时实测：

| 输入 | 结果 |
|---|---|
| `relative/path` | `SANDBOX_INVALID_ROOT`（不能读） |
| `~/nvx-eval/link-to-outside`（符号链接） | `SANDBOX_INVALID_ROOT`（realpath ≠ 字面路径） |
| `/nope/missing` | `SANDBOX_INVALID_ROOT`（不能读） |

`canonicalPath('/nope/x')` 返回 `'/nope/x'`（realpath 失败时原样返回）—— 这是有意的宽松行为，注释说明「不发明回退」。

### 3.9 `/tmp` 符号链接的验证

`canonicalPath('/tmp')` = `/private/tmp`。DSH 正确地做了 canonicalization：

```json
["/Users/seanz/nvx-eval/ws", "/private/tmp",
 "/private/var/folders/vg/sjg5n6857zl4jvrz1cpdywhm0000gn/T"]
```

我最初用未 canonical 的 `/tmp` 构造 profile 时，`workspace-write` 下写工作区**也被拒绝** —— 因为 `/tmp` 是指向 `/private/tmp` 的符号链接，`(subpath "/tmp")` 永不匹配。**这反证了 DSH canonicalization 的必要性：没有它，`workspace-write` 会完全失效。**

### 3.10 本机三实例的实际配置（只读查证）

| 实例 | 数据目录 | 运行版本 | `defaultPreset` | 实际效果 |
|---|---|---|---|---|
| **dsh.local**（生产） | `~/.dsh` | 0.2.2-rc.1 | **`danger-full-access`** | **沙箱对新会话等于关闭** |
| **dsh-dev**（开发） | `~/.dsh-dev` | 0.2.2-rc.1 | 未覆盖 → base 默认 | `workspace-write` + `ask` |
| 桌面版 | `~/.dsh-desktop` | — | — | Electron 层 `nodeIntegration:false` / `contextIsolation:true` / `sandbox:true` |

`dsh.local` 的 `~/.dsh/profiles/web/cordis.patch.yml` 第 221–237 行显式写了 `defaultPreset: danger-full-access`，且 `DSH_PERMISSION_MODE` 环境变量未设置（LaunchAgent 只有 `DSH_HOME` 与 `DSH_PERF_REVIEW`）。

**这意味着：生产实例上新会话的 bash 跑在完全无约束状态下，approval 策略是 `never`。** 这不是 DSH 的缺陷，是部署选择——但必须登记为事实。

---

## 4. NVX 仓库功能与意图（pin 状态）

### 4.1 身份

| 项 | 值 |
|---|---|
| 仓库 | `microsoft/nvx`（MSR Systems Research + Azure Research，基于 Nanvix 研究成果） |
| 版本 | `0.1.0` |
| HEAD | `fc59c9065ceb2a939874123f9cdc856ad7784cf6`（2026-11-12 00:06:44 +0000） |
| 最新 tag | `v0.1.0-dev.fc59c9065ceb`（dev 系列，每次 push 打一个） |
| 许可 | MIT |
| openvmm 子模块 | `90f87319d30d8c35bc3526f12fc7b6529c882cf0`（**本 checkout 未初始化**） |

### 4.2 意图

[README.md](../../../context/nvx/README.md) 第 3–5 行：

> NVX is an ultra-light micro-VM sandbox for running untrusted workloads with hardware-enforced isolation. It is built on top of OpenVMM and runs Linux as a guest.

一句话：**把「跑一个不可信 Linux 负载」压缩到 290ms 冷启动 / 35–75 MiB 常驻，用硬件虚拟化做边界。**

### 4.3 七个目标

[nvx/doc/design/1.1-goals.md](../../../context/nvx/doc/design/1.1-goals.md)：

1. 同一未压缩 Linux-direct kernel 在 Linux 与 Windows 主机上启动
2. guest 可见机器与所选 hypervisor 无关（machine profile 拥有）
3. 只暴露固定白名单设备
4. 快照可跨进程恢复，不序列化原生宿主句柄
5. 一 microVM 一 workload
6. 分层文件系统：不可变镜像层 + 私有可写 upper + 可选实时宿主共享
7. workload 策略与宿主资源附件归宿主控制

### 4.4 明确不做（关键约束）

[nvx/doc/design/1.2-non-goals.md](../../../context/nvx/doc/design/1.2-non-goals.md)：

- 固件启动、自定义 ACPI/SMBIOS/DT、PCI、vPCI、VMBus、任意设备
- **SMT、多 NUMA、非 x86 guest、嵌套虚拟化**
- readiness 后的 CPU/内存热插拔
- 跨 hypervisor/跨 CPU 代际恢复、live migration、capture-and-continue
- TSC 缩放、RDTSC 陷入、半虚拟化时钟（kvmclock / Hyper-V reference TSC / VMClock）、虚拟 PMU
- 实时网络流 / 原生句柄 / 实时 fs 导出内容的序列化
- 多容器编排（pod infra、pause 容器、动态 rootfs 注入）
- **机密计算**（宿主被信任持有镜像与 guest 内存）
- VMM 内租户授权

### 4.5 信任边界

[nvx/doc/design/1.4-trust-boundaries.md](../../../context/nvx/doc/design/1.4-trust-boundaries.md)：

> the host and its orchestrator are trusted with guest memory, image contents, and attachment policy, while **the workload is untrusted**.

单租户设计：**VM 边界即 workload 边界**。

### 4.6 仓库布局

```
nvx/
├── azurelinux/ ubuntu/   guest userland 构建配方
├── data/                 基准数据 CSV（各平台 p50）
├── doc/                  设计、使用、CI、分发文档
├── docker/Dockerfile     可重现的 guest 构建环境
├── guest/                guest 源文件
├── kernel/               kernel 配置与补丁
├── nvx-rs/               ← 核心 Rust crate + CLI + guest 二进制
├── openvmm/              ← 子模块（本 checkout 为空）
├── scripts/              nvx.py 及各平台 setup/benchmark 脚本
└── tests/
```

### 4.7 `nvx-rs` crate 结构

| 模块 | 职责 |
|---|---|
| `protocol/` | NVXS 会话、NVXC 帧、EXEC/MAPS 载荷、guest features、kernel cmdline token、share 目标限制；**无依赖**，宿主与 guest 共享 |
| `activation/` | 分层根的激活记录、规范编码、`Ready` 上报 |
| `contract.rs` | 控制契约版本、release manifest 兼容性、快照恢复契约版本 |
| `net/` | CIDR 解析与减法、主机名、guest 网络形态 |
| `gpt/` | GPT 盘严格读取（首分区配置 adapter，其余分区放只读层） |
| `uuid.rs` | UUID 的规范文本与 GPT 布局 |
| `hypervisor.rs` | KVM / MSHV / WHP |
| `error.rs` | `Error`、`ErrorKind`、稳定 `ErrorCode` |
| `exec/` | 执行引擎：两侧的流、credit、outcome；**无 I/O / 无线程 / 无 feature** |
| `host/` | artifacts、launch、network+egress policy、filesystem、NVXS 连接、session、process、platform、instance、sandbox store、template、seal、supervisor、CLI |
| `testing/` | fake OpenVMM |
| `guest/` | guest 程序：NVXS 连接、terminal、spawn、entry、process、cgroup、exec、time、clone、reseed、root、gpt |
| `bin/` | `nvx-rs`、`nvx-fake-openvmm`、guest 二进制 |

### 4.8 两种生命周期

| 模式 | 行为 | 控制台 |
|---|---|---|
| **one-shot `run`** | 启动 VM → 跑一个 workload → 退出 | boot console 直连 |
| **managed** `provision/start/exec/stop/deprovision` | guest agent 常驻，按请求**顺序**跑多个 workload | 认证 control console |

managed 的 guest agent 是 `/sbin/nvx-managed-agent CONTROL_TTY ROOTFS HOSTNAME UID GID USER HOME`。

### 4.9 实测基准数字（`data/linux-kvm-virtual-machine-microvm-v2-1vcpu.csv`，1 vCPU p50）

| 指标 | p50 |
|---|---|
| `cold_start_base` | **291.5 ms** |
| `shell_snapshot_restore_64_mib` | 50.9 ms |
| `shell_snapshot_restore_128_mib` | 61.6 ms |
| `shell_snapshot_restore_256_mib` | 60.9 ms |
| `shell_snapshot_restore_512_mib` | **53.9 ms** |
| `openvmm_snapshot_restore` | 56.6 ms |
| `openvmm_cold_start_peak_rss` | 74.8 MiB |
| `openvmm_snapshot_restore_peak_rss` | **34.0 MiB** |
| `network_snapshot_restore` | 80.1 ms |

**重要特征：恢复时间不随内存增长**（512 MiB 比 64 MiB 还快，惰性页恢复）。这使「模板一次、每会话克隆」在经济上可行。

### 4.10 快照语义（与 DSH 差异极大）

[nvx/doc/design/5.3-snapshot-protocol.md](../../../context/nvx/doc/design/5.3-snapshot-protocol.md) 第 6–10 行：

> A snapshot is **guest-initiated** and it **terminates the source virtual machine** if it succeeds. A snapshot is **not** a host-side memory dump or a capture-and-continue operation.

即：不是「边跑边存」，而是「存了就死」。这对 DSH 的「会话持续」模型是一个直接冲突点（见 §7.5）。

---

## 5. NVX 三平台机制分别说明

### 5.1 Linux

| 后端 | 设备/前提 | 说明 |
|---|---|---|
| **KVM** | `/dev/kvm` 可读写，用户在 `kvm` 组 | 默认（`platform_default()` 返回 `Kvm`） |
| **MSHV** | Microsoft Hypervisor root partition + `/dev/mshv`；模块名 `mshv_root` | 需要专门内核；Azure Linux 3 是参考平台；CI 用 `10.0.26100.9444` hypervisor + `6.18.34.mshv3-1.azl3` kernel |

链选择：[nvx-rs/src/hypervisor.rs](../../../context/nvx/nvx-rs/src/hypervisor.rs)

```rust
pub fn platform_default() -> Option<Self> {
    if cfg!(target_os = "linux") { Some(Self::Kvm) }
    else if cfg!(windows) { Some(Self::Whp) }
    else { None }
}
```

Linux 特有优势：

- `--mount-owner caller` **仅 Linux** —— share 的文件操作可以以 workload 的 UID/GID 执行，guest root 被 squash 到共享目录属主
- 盘镜像以 `/proc/self/fd/N` 交给 OpenVMM（而非路径），消除替换窗口
- `mount-owner caller` 持久化在 `provision` 记录中

### 5.2 Windows

| 项 | 值 |
|---|---|
| 后端 | WHP（Windows Hypervisor Platform） |
| 开启 | `Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -All` + 重启 |
| 构建依赖 | rustup + Visual Studio 2022 C++ build tools + Windows SDK + **Docker Desktop（Linux 容器）** |

平台模块：[nvx-rs/src/host/platform/windows/](../../../context/nvx/nvx-rs/src/host/platform/windows/)（`endpoint.rs` / `identity.rs` / `interrupt.rs` / `log_claim.rs` / `private.rs` / `process.rs` / `spawn.rs`）

Windows 特有差异：

| 差异 | 细节 |
|---|---|
| 控制端点传输 | 命名管道 `//./pipe/openvmm-microvm-<suffix>`（Linux 是 Unix socket，mode 0600） |
| 端点 ACL | 受保护 DACL 只允许 LocalSystem 与 VMM 用户 |
| 对端身份 | 管道客户端 token 的 user SID（Linux 是 peer effective UID） |
| 盘镜像交接 | 按最终路径（`\\?\` 无链接路径），Linux 是 `/proc/self/fd/N` |
| **`--mount-owner caller`** | **不支持**（仅 Linux） |
| 路径约束 | 最终路径不能含 `,` `;` 或不配对括号，不能以 `.vhd/.vhdx/.vmgs/.iso` 结尾 |
| 块几何 | 物理块固定 4096 字节（Linux 取文件系统 I/O block size） |

**Windows 上 `--mount-owner caller` 缺失的实际后果**：DSH 的工作区文件会以 OpenVMM 进程身份写入，而不是用户身份——权限位、属主、`umask` 效果全部偏离。

### 5.3 macOS

**不支持，且是架构性的。** 四条独立证据：

**证据 1 —— `Hypervisor` 枚举只有三个变体**（[hypervisor.rs:17-23](../../../context/nvx/nvx-rs/src/hypervisor.rs)）：

```rust
pub enum Hypervisor {
    /// Linux KVM through `/dev/kvm`.
    Kvm,
    /// Linux Microsoft Hypervisor through `/dev/mshv`.
    Mshv,
    /// Windows Hypervisor Platform.
    Whp,
}
```

**证据 2 —— `platform_default()` 在 macOS 返回 `None`**：

```rust
pub fn platform_default() -> Option<Self> {
    if cfg!(target_os = "linux") { Some(Self::Kvm) }
    else if cfg!(windows) { Some(Self::Whp) }
    else { None }          // ← macOS
}
```

且 `supported_on_host()` 对三个变体全部返回 false（Kvm/Mshv → linux，Whp → windows），**即使强行设 `NVX_HYPERVISOR` 也会被拒**。

**证据 3 —— 平台模块硬编码**（[platform/other.rs:15](../../../context/nvx/nvx-rs/src/host/platform/other.rs)）：

```rust
/// Whether this host can run NVX microVMs.
pub const SUPPORTED: bool = false;
```

对比 [linux/mod.rs:40](../../../context/nvx/nvx-rs/src/host/platform/linux/mod.rs) 与 [windows/mod.rs:50](../../../context/nvx/nvx-rs/src/host/platform/windows/mod.rs) 都是 `true`。该模块的错误信息：`the openvmm backend supports Linux and Windows hosts only`。

**证据 4 —— 发布工件只有三个**（[artifacts.json](../../../context/nvx/nvx-rs/artifacts.json)）：`linux-kvm`、`linux-mshv`、`windows-whp`。

**证据 5 —— 架构不符**：guest 二进制是 `x86_64-unknown-linux-musl` 静态 ELF（[lib.rs:126](../../../context/nvx/nvx-rs/src/lib.rs)、[distribution.md:12](../../../context/nvx/doc/distribution.md)），kernel 也是 x86_64，non-goals 明写 `non-x86 guests`。本机是 `arm64`。

**关于 CI 里的 macOS**：唯一出现处是 [ci.md:2353](../../../context/nvx/doc/ci.md) 的 `macOS cross-check` 与 [contribute.md:95](../../../context/nvx/doc/contribute.md) 的 `a macOS check`。这是**编译期 clippy/check**，用于防止代码无意引入只能在 Linux 编译的东西。它证明「能在 macOS 上编译」，恰好反证「不能在 macOS 上运行」。

**关于 roadmap 里的 `virt_hvf`**：[openvmm-upstream-roadmap.md:697](../../../context/nvx/doc/openvmm-upstream-roadmap.md) 出现 `virt_hvf: name the ID register type in the policy test`。这是**上游 OpenVMM 有 HVF 后端**的事实，不是 NVX 用了它。同表 `#314 gate the microVM's x86_64-only items for aarch64 guests`、`#312 query the TSC frequency for the aarch64 hv1 emulator` 说明 aarch64 支持在微VM路径上是**新增中的、面向 guest 的**，不是面向 macOS 宿主的。

### 5.4 三端裁决

| 平台 | 本机 microVM | 结论 |
|---|---|---|
| Linux x86_64 | ✅ KVM / MSHV | **原生支持（已实测，见 §5.5）** |
| Windows x86_64 | ⚠️ WHP | **支持，有缺口**（`mount-owner caller` 缺失、路径约束更严） |
| Linux aarch64 | ❌ | **无预构建包；需上游工程（见 §5.6）** |
| Windows ARM64 | ❌ | **无预构建包** |
| macOS Intel | ❌ | **不支持**（且业主已排除此组合） |
| macOS Apple Silicon | ❌ | **NVX 不支持**（无 HVF 后端）；但 **Apple container 可替代**，见 §5.9 |

**macOS 的 v1 选择**：**改用 Apple container**（§5.9）——同为每容器一 VM，原生支持 macOS。远程接入 NVX 主机降级为可选备选。

---

### 5.5 x86_64 实测（远端验证，已清理）

在 `frd1`（Linux x86_64 / kernel 7.0.0-34-generic / `/dev/kvm` 可读写）上下载并运行了官方发布的 `nvx-0.1.0-linux-kvm.tar.gz`（271,292,609 B，tag `v0.1.0-dev.fc59c9065ceb`）。

**包内自带 Ubuntu guest 资产**：

```
guest/ubuntu-distro.erofs              ← EROFS distro 层（uuid 899f8737-0d1e-d20b-9802-fe3c69397de9）
guest/ubuntu-smoke-scratch.ext4        ← 预格式化 ext4 scratch
guest/vmlinux                          ← Linux 6.18.38
```

**二进制架构实测（关键）**：

| 文件 | `file` 输出 |
|---|---|
| `bin/nvx-rs` | ELF 64-bit **x86-64**, static-pie linked |
| `bin/openvmm` | ELF 64-bit **x86-64**, dynamically linked |
| `guest/vmlinux` | ELF 64-bit **x86-64**, statically linked |

**冷启动实测**：`nvx-rs run --guest ubuntu --memory-mib 512` → kernel 6.18.38 boot 成功，`Hypervisor detected: Microsoft Hyper-V`（宿主本身是 Azure VM），`Intel MultiProcessor Specification v1.4`。

**Managed sandbox 隔离实测**（`provision` → `start` → `exec`）：

| 探测项 | 实测输出 |
|---|---|
| 身份 | `uid=65534(nobody) gid=65534(nogroup) groups=65534(nogroup)` |
| capability | `CapEff: 0000000000000000` ← **全清** |
| `no_new_privs` | `NoNewPrivs: 1` |
| PID 命名空间 | `pid:[4026532146]` ← 独立于 guest 初始 ns |

**失败关闭实证**：`sandbox provision` 在 store 目录为 `mode 755` 时直接拒绝：

```
error[io]: the sandbox store /tmp/nvx-spike-sb is accessible to other users (mode 755)
```

改为 `chmod 700` 后成功。这是一个真实可用的 fail-closed 约束。

**清理**：停止 sandbox、`deprovision`、删除 `/tmp/nvx-spike*` 与 `~/.local/state/openvmm`（共 989 MB）。复查：`nvx dirs: 0`、`state: 0`、`procs: 0`，`/tmp` 使用率回到 1%。

---

### 5.6 aarch64 真实工作量（已量化）

业主提出「fork 后做一个最小 arm alpine」与「分发 arm prebuild 包」。核实结论：**当前 pin 不是“缺一个 arm 构建”，而是“整个 guest 栈写死 x86_64”。**证据如下。

**① 三个 distro 的架构常量全部硬编码**（[scripts/nvx_tools/build_constants.py](../../../context/nvx/scripts/nvx_tools/build_constants.py)）：

| 行 | 类 | `ARCHITECTURE` |
|---|---|---|
| 212 | `AlpineBuildConstants` | `"x86_64"` |
| 254 | `UbuntuBuildConstants` | `"amd64"` |
| 388 | `AzureLinuxBuildConstants` | `"x86_64"` |

**② Ubuntu 包锁显式拒绝 arm64**（[scripts/nvx_tools/ubuntu.py:189](../../../context/nvx/scripts/nvx_tools/ubuntu.py#L189)）：

```python
if package["architecture"] not in (UbuntuBuildConstants.ARCHITECTURE, "all"):
    raise ... f"unsupported architecture {package['architecture']}"
```

且有对应测试断言（[test_nvx_tools.py:16299](../../../context/nvx/scripts/test_nvx_tools.py#L16299)）：`assertRaisesRegex(common.ScriptError, "unsupported architecture arm64")`。

**③ kernel 构建显式假定 x86**（[scripts/nvx_tools/kernel_features.py:42](../../../context/nvx/scripts/nvx_tools/kernel_features.py#L42)）：

> The kernel build runs `make` without `ARCH`, so ARCH is x86 and 64BIT is a prompt…

`kernel/config-microvm.derived` 实测：**43 行 `CONFIG_X86*`/`CONFIG_64BIT`，0 行 `CONFIG_ARM64`**。

**④ 六个 guest 二进制全部 arch 门禁**：`nvx-init`、`nvx-exit`、`nvx-time`、`nvx-time-probe`、`nvx-mmio-write`、`nvx-device-io` 均以 `#[cfg(all(target_os = "linux", target_arch = "x86_64"))]` 开头，非 x86 走 stub。其中 `nvx-exit` 写死 OpenVMM 控制端口 `0x604`（x86 端口 I/O 语义）。

**⑤ CI 的 aarch64 只是主机侧编译检查**（[.github/actions/check-nvx-rs/action.yml:142](../../../context/nvx/.github/actions/check-nvx-rs/action.yml#L142)）：

```yaml
rustup target add --toolchain "…" aarch64-apple-darwin
cargo check --locked --all-targets --all-features --target aarch64-apple-darwin
# The guest binaries are static x86_64-unknown-linux-musl executables
```

即「保证代码能在 arm 主机上编译」，不是「产出 arm guest」。

**⑥ CI 注释直接说明缺 arm 资产**（[scripts/nvx_tools/ci.py:557](../../../context/nvx/scripts/nvx_tools/ci.py#L557)）：

> The Linux runners support neither nested virtualization nor **the aarch64-unknown-linux-musl archive of aarch64 hosts**.

**⑦ openvmm 侧 arm 支持在推进但不是 NVX 的**：roadmap 里有 `virt_whp: query the TSC frequency for the aarch64 hv1 emulator`、`openvmm_core: gate the microVM's x86_64-only items for aarch64 guests`——这是**上游 OpenVMM 的 microVM 路径**在补 aarch64，NVX 尚未采用。

**⑦ 发布工件矩阵固定为三个**：`linux-kvm` / `linux-mshv` / `windows-whp`，每个 release 重复如此（已查最近 10 个 release，arm 资产数 = 0）。

**⚠️ 本节估计已被 §8.6 的实测修正。** 下表是仅读源码时的判断；实测发现 **openvmm 与 nvx-rs 的 aarch64 构建都是现成的**（均编译并运行成功），真正缺的只是 6 个 x86-gated 的 guest 二进制。请以 §8.6.3 为准。

**结论（仅源码层面的工作量分级，已被修正）**：

| 层级 | 改动 | 原估量级 | 实测修正 |
|---|---|---|---|
| L1 最小可跑 | fork 改 `ARCHITECTURE`、加 arm guest 二进制、arm kernel config、`nvx-exit` 换 PSCI | 中 | **中**（openvmm/nvx-rs 免费，只剩 3 个必需 guest 二进制 + kernel config） |
| L2 可用（加 Ubuntu） | 上述 + `UbuntuBuildConstants`、`ubuntu.py` 允许列表、arm 包锁 | 大 | 大（未变） |
| L3 三 distro 齐备 | 上述 + AzureLinux arm 仓库 | 很大 | 很大（未变） |

**这不是配置项，是新增一个平台**——但比预估的轻：宿主侧已有 aarch64 支持，改造集中在 guest 用户态。

---

### 5.7 NVX 在 macOS 的可执行性（明确不可行）

业主最终目标是「测试 NVX 在 macOS 下的可执行性」。本次用**实际条件核实**而非仅读源码：

| 检查项 | 本机实测 |
|---|---|
| `/dev/kvm` | 不存在 |
| `/dev/mshv` | 不存在 |
| `/usr/bin/sandbox-exec` | 存在（但那是 Seatbelt，不是 hypervisor） |
| `kern.hv_support` | `1`（Hypervisor.framework 存在，但 NVX 不走它） |
| `nvx-rs/src` 中 `target_os = "macos"` 出现次数 | **0** |
| `Hypervisor` 枚举可用值 | KVM / MSHV / WHP（**无 HVF**） |
| `host/platform/other.rs` 的 `SUPPORTED` | **`false`**（macOS 落在此分支） |

**七条独立证据（含本次新增的实测）**：

1. `Hypervisor` 枚举只有三个变体，无 HVF；2. `platform_default()` 在 macOS 返回 `None`；3. `supported_on_host()` 对三变体在 macOS 全返 false；4. `other.rs` 硬编码 `SUPPORTED = false` 并报 `the openvmm backend supports Linux and Windows hosts only`；5. 发布工件无 darwin；6. 零 darwin 源码分支；7. 本机无任何 KVM/MSHV 设备。

**即使解决 arm guest，macOS 仍缺 hypervisor 后端（HVF）。** 这是两层独立障碍。

**macOS 的唯一现实路径**：作为客户端远程接入 Linux/Windows NVX 主机（复用 `ssh` / `fs-ssh` / `subprocess-ssh` 家族）。隔离强度与本地 NVX 相同，只是 VM 不在本机。

---

### 5.8 Windows 主机 + Linux guest（NVX 的核心用途）

业主问：Windows 主机上跑 DSH，NVX 里能否挂一个 x86 alpine 作为 VM guest，用来运行 Linux 软件？

**答案：可以，且这是 NVX 在 Windows 上的默认路径，不是特例。**

五条证据：

| # | 证据 | 出处 |
|---|---|---|
| 1 | **guest 永远是 Linux**，host 才是 Windows/Linux | [README.md:3-4](../../../context/nvx/README.md)：`runs Linux as a guest` |
| 2 | **Windows quickstart 就是跑 alpine** | [README.md:64-73](../../../context/nvx/README.md)：`nvx-rs.exe run`，无 `--guest` |
| 3 | **`--guest` 默认值 = `alpine`** | [doc/usage.md:159](../../../context/nvx/doc/usage.md)：`{alpine,ubuntu,azurelinux}`，默认 `alpine` |
| 4 | **Windows 包内含全部 guest 镜像** | [package-platform.yml:72](../../../context/nvx/.github/workflows/package-platform.yml) 注释：`The package ships every guest image`，且不分平台下载 alpine/ubuntu/azurelinux |
| 5 | **alpine guest 是完整 minirootfs** | [build_constants.py:213](../../../context/nvx/scripts/nvx_tools/build_constants.py)：`alpine-minirootfs-3.24.1-x86_64.tar.gz` |

执行链：

```
Windows 主机（x86_64）
  └─ WHP (Windows Hypervisor Platform)
       └─ nvx-rs.exe  ──►  openvmm  ──►  alpine 3.24.1 (x86_64 Linux VM)
                                            └─ 业务 Linux 软件
```

**alpine guest 组成**（[build_constants.py](../../../context/nvx/scripts/nvx_tools/build_constants.py)）：`alpine-minirootfs 3.24.1` + `blkid` / `busybox-extras` / `e2fsprogs` / `util-linux` / `util-linux-misc`。含 `apk`。root 为 tmpfs——**可写但重启即失**。

**运行 Linux 软件的三种方式**：

| 方式 | 命令 | 特点 |
|---|---|---|
| A. 交互 + `apk add` | `nvx-rs.exe run --guest alpine --net 10.0.0.2/24` | 最简单；**必须显式给 `--net`**（默认 `none`，否则无网络） |
| B. 烘焙进自定义 initramfs | 改 `build-initramfs` 的 `PACKAGES` | 持久、可分发；需重建 |
| C. Ubuntu EROFS 分层根 | `nvx-rs.exe sandbox --layer distro,ubuntu-distro.erofs,<uuid> --scratch …` | 完整 Ubuntu userland + 持久 upper；包内已带 `ubuntu-distro.erofs` |

**对 DSH 的意义超出「沙箱」范畴**：DSH 的 base 组合里 `bash-sandbox` 在 win32 上 `disabled: true`，只有 `pwsh-sandbox`——**Windows 上的 DSH 今天没有 bash**。接上 `sandbox-nvx-windows` 之后，Windows 首次获得真 Linux bash（`grep`/`sed`/`awk`/`find` 全可用），且运行在 VM 边界内。这是**能力补齐**，不只是隔离升级。

**三个前置约束**：

| 约束 | 说明 |
|---|---|
| guest 是 x86_64 | Windows 主机也须 x86_64（WHP 跑 x86_64 guest） |
| `--net` 必须显式给 | 否则 alpine 无网络，`apk` 不可用 |
| alpine 是临时根 | 要持久化走方式 B 或 C |

**验证状态**：文档与源码层面确认；**未在本机实测**（当前两台授权主机均为 Linux，无 Windows x86_64 环境）。

---

### 5.9 Apple container —— macOS 的第三条路

前文 §5.7 判定 NVX 在 macOS 上不可行。业主追问「苹果新发布的 macOS container 能否在 DSH policy 下唤醒与运行」，调查后发现**这是 macOS 端的更优解**，且与 NVX 的隔离模型同构。

#### 5.9.1 身份

| 项 | 值 |
|---|---|
| 仓库 | [`apple/container`](https://github.com/apple/container) |
| 版本 | **1.7.1**（2026-11-06 发布） |
| 许可 | Apache-2.0 |
| 语言 | Swift |
| 底层 | [`apple/containerization`](https://github.com/apple/containerization) Swift 包 |
| 要求 | **Apple Silicon + macOS 26** |

核心设计（[technical-overview](https://github.com/apple/container/blob/main/docs/technical-overview.md)）：

> `container` runs a lightweight VM **for each container** that you create.

**这不是 Docker Desktop 那种「一个共享 Linux VM 跑所有容器」，而是每容器一个独立 VM**，走 Virtualization.framework。Apple 自列三条理由：Security（每容器具 full VM 隔离）、Privacy（只把必要数据挂进**各自的** VM）、Performance（内存低于完整 VM，启动时间与共享 VM 容器相当）。

**与 NVX 的模型几乎同构**——只是 Apple 用 Virtualization.framework，NVX 用 KVM/WHP。

#### 5.9.2 本机兼容性（实测）

| 要求 | 本机 |
|---|---|
| Apple Silicon | ✅ arm64 |
| macOS 26 | ✅ 26.5.2 (25F84) |
| Virtualization.framework | ✅ 存在 |
| vmnet.framework | ✅ 存在 |
| Swift 工具链 | ✅ 6.2.3，target `arm64-apple-macosx26.0` |
| `container` 已安装 | ❌ 未安装 |

README 明写 macOS 26 是支持目标；macOS 15 能跑但网络隔离、多网络、容器 IP 三处受限，且「maintainers typically will not address issues that cannot be reproduced on macOS 26」。

#### 5.9.3 架构

```
container CLI
   └─ container-apiserver (launch agent)
        ├─ container-core-images   (XPC, 镜像存储)
        ├─ container-core-clusters (XPC, K8s 集群记录)
        ├─ machine-apiserver       (XPC, 容器机管理)
        ├─ container-network-vmnet (XPC, 虚拟网络)
        └─ container-runtime-linux (每容器一个)
```

集成 macOS 原生设施：Virtualization.framework、vmnet、XPC、launchd、Keychain、统一日志。

#### 5.9.4 隔离能力

**默认 capability 仅 14 项**（无 `SYS_ADMIN`）：

```
AUDIT_WRITE CHOWN DAC_OVERRIDE FOWNER FSETID KILL MKNOD NET_BIND_SERVICE
NET_RAW SETFCAP SETGID SETPCAP SETUID SYS_CHROOT
```

可用旋钮：

| 旋钮 | 作用 |
|---|---|
| `--read-only` | rootfs 只读 |
| `--cap-drop ALL` / `--cap-add` | capability 全清/精确加 |
| `--mount type=…,source=…,target=…,readonly` | 只读挂载 |
| `--volume host:container` | 绑定挂载 |
| `--tmpfs` | 内存挂载 |
| `--network <name>` | 命名网络（vmnet），可隔离 |
| `--masked-path` / `--read-only-path` | 隐藏/只读路径（**实验性**，默认已按 OCI 标准） |
| `--cpus` / `--memory` | 资源上限（默认 1 GB / 4 CPU） |
| `--uid` / `--gid` / `--ulimit` | 身份与限制 |

#### 5.9.5 ⚠️ `container machine` 是反隔离模式

`container machine` 支持「停止后自动唤醒」：

> `container machine run` … If the container machine is stopped, `run` boots it first.

**但它不能用于 DSH 沙箱。** [container-machine.md](https://github.com/apple/container/blob/main/docs/container-machine.md) 用 WARNING 明写：

| 行为 | 后果 |
|---|---|
| 自动把 `$HOME` **读写挂载到相同路径** | 等价 `-v "${HOME}:${HOME}"` |
| 转发 `SSH_AUTH_SOCK` | 容器内可代用户执行 git/ssh |
| **`--cap-add ALL`**，不清空 masked/read-only 路径 | 绕过常规容器的访问控制 |
| **免密 sudo（`NOPASSWD:ALL`）** | 映射到宿主 UID/GID |
| 跑镜像自己的 `/sbin/init` 作为 PID 1 | 可起任意服务 |

> A container machine trades away much of the isolation that makes a regular Apple container safer for running untrusted code. Only create container machines from images you trust.

**结论：只用 `container run` / `container exec`，禁用 `container machine`。**

#### 5.9.6 CLI 面与 shell 语义

完整命令面（[command-reference](https://github.com/apple/container/blob/main/docs/command-reference.md)）：

```
run build create start stop kill delete list exec commit export clean
logs inspect stats copy prune
image {list,pull,push,save,load,tag,delete,prune,inspect}
builder {start,status,stop,delete}
network {create,delete,prune,list,inspect}
volume {create,delete,prune,list}
```

**`container exec` 支持 `-i`（stdin）、`-t`（TTY）、`-d`（detach）**——完整 docker-exec 语义。

这与 NVX 形成关键差异：

| 能力 | NVX | Apple container |
|---|---|---|
| stdin | ❌ `EXEC` 无输入字段，stdin 接 `/dev/null` | ✅ `-i/--interactive` |
| TTY | ❌ | ✅ `-t/--tty` |
| detach | ❌ 同步阻塞 | ✅ `-d/--detach` |
| exec 进运行中容器 | ❌ 每次独立进程 | ✅ `container exec` |
| 输出上限 | ❌ **1 MiB**，超出杀进程 | 未记载上限 |

**Apple container 的 shell 语义实际上比 NVX 更贴合 DSH。** macOS 包不是降级移植，可能是两个包里体验最好的。

#### 5.9.7 集成路径

| 路径 | 说明 |
|---|---|
| **CLI** | 直接 shell out，最简单 |
| `container-apiserver` 客户端库 | Swift，DSH 是 TypeScript，不适用 |
| **[`socktainer`](https://socktainer.github.io)** | **Docker 兼容 REST API**（brew 有，Apache-2.0，依赖 container）——对 DSH 最友好 |

审计面：`container inspect`（JSON，含 mounts/resources/id）、`container stats`（JSON/YAML/TOML）、`container logs`、统一日志系统。

#### 5.9.8 验证状态（诚实登记）

| 项 | 状态 |
|---|---|
| 规格调查 | ✅ **完整**（technical-overview / command-reference / container-machine / runtime-configuration / networking / volumes / resource-usage / cluster / inspection / system-config） |
| 本机兼容性 | ✅ 确认（macOS 26.5.2 + arm64 + 两个 framework 都在） |
| **本机实跑** | ❌ **未完成** |

实跑失败的两个原因，都不是能力问题：

1. **`.pkg` 安装需管理员密码**——本会话无法非交互提供
2. **网络不可靠**：brew 走 ghcr.io 两次在 ~140 MB 处 `HTTP/2 PROTOCOL_ERROR`；GitHub releases 直连断续且服务端不支持断点续传（卡在 15.5 MB）

**另一件需业主授权的事**：`container system start` 会在日常机器上创建 launch agent 并下载 Kata kernel（`vmlinuz-6.18.56-208-debug`）。这是系统级改动，未经许可不执行。

#### 5.9.9 对 macOS 端结论的修正

§5.7 判定「macOS 不可行，只能远程接入」。Apple container 提供了**第三条路**：

| 障碍 | NVX on macOS | Apple container |
|---|---|---|
| 缺 hypervisor 后端 | ❌ HVF 未接入 | ✅ Virtualization.framework 原生 |
| arm guest | ❌ 6 个 stub | ✅ 官方 arm64 镜像 |
| 分发 | 需自建 | ✅ brew / 官方 pkg |

**在 macOS 上，Apple container 比 NVX 更现实——不是替代品，是更优解。**

---

## 6. NVX 协议层完整登记

NVX 有**真实的两层线上协议**，这是它与 DSH 最大的结构差异。

### 6.1 协议栈总览

```
┌─────────────────────────────────────────────────────────────┐
│ L3  应用载荷：EXEC / MAPS / FEATURES                          │
│     文件：[protocol/exec.rs] 515 行、[protocol/maps.rs]       │
├─────────────────────────────────────────────────────────────┤
│ L2  NVXC 应用帧（magic "NVXC"，24 字节头）                     │
│     Ping/Exec/Stop/Cancel/Features/Maps                       │
│     响应：Ready/Stdout/Stderr/Exit/Stopped/Error              │
│     文件：[protocol/app.rs] 159 行                            │
├─────────────────────────────────────────────────────────────┤
│ L1  NVXS 外层记录（magic "NVXS"，44 字节头）                   │
│     GuestAttach/HostAttach/Reset/Ack/Data/Wait/Ready/         │
│     Error/Credit + credit 流控                                │
│     文件：[protocol/outer.rs] 183 行、[protocol/nvxs/*] 1219 行│
├─────────────────────────────────────────────────────────────┤
│ L0  传输：Unix socket 0600（Linux）/ 命名管道（Windows）        │
│     三层保护：私有端点 → 对端身份 → 32 字节 capability         │
│     文件：[host/platform/{linux,windows}/endpoint.rs]          │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 L1 — NVXS 外层记录

常量（[protocol/outer.rs](../../../context/nvx/nvx-rs/src/protocol/outer.rs)）：

| 常量 | 值 |
|---|---|
| `OUTER_MAGIC` | `b"NVXS"` |
| `OUTER_VERSION` | 1 |
| `OUTER_HEADER_LEN` | **44** 字节 |
| `OUTER_MAX_PAYLOAD` | **65 536** 字节 |
| `OUTER_RECEIVE_WINDOW` | 1 048 576（1 MiB） |
| `OUTER_MIN_RECEIVE_WINDOW` | 65 536 |
| `OUTER_MAX_RECEIVE_WINDOW` | 4 194 314（4 MiB + 10） |
| `CAPABILITY_LEN` | **32** 字节 |

头布局（`OuterHeader`）：

| 偏移 | 字段 | 宽度 |
|---|---|---|
| 0 | magic `NVXS` | 4 |
| 4 | version | 2 |
| 6 | record type | 1 |
| 7 | flags（必须 0） | 1 |
| 8 | instance_id | 16 |
| 24 | epoch（u64） | 8 |
| 32 | sequence（u64） | 8 |
| 40 | payload length（u32） | 4 |

记录类型：

| code | 名称 | 方向 | 载荷 |
|---|---|---|---|
| 1 | `GuestAttach` | guest→broker | 空（身份全零） |
| 2 | `HostAttach` | host→broker | 32 字节 capability |
| 3 | `Reset` | broker→guest | 空（epoch 非零） |
| 4 | `Ack` | guest→broker | 初始接收窗口（LE u32） |
| 5 | `Data` | 双向 | 应用帧字节 |
| 6 | `Wait` | broker→host | 空（等 guest ack） |
| 7 | `Ready` | broker→host | 空（带实例 ID 与 epoch） |
| 8 | `Error` | broker→host | `ErrorCode`（LE u32） |
| 9 | `Credit` | guest→broker | 归还字节数（LE u32） |

握手时序（[outer.rs](../../../context/nvx/nvx-rs/src/protocol/outer.rs) 头部注释）：

```
guest  → broker : GUEST_ATTACH（身份零）
broker → guest  : RESET（epoch 非零）
guest  → broker : ACK @ seq 0（携带 receive window）
guest  → broker : DATA @ seq 1...
guest  → broker : CREDIT（消费后归还窗口）
后续 RESET 开启新 epoch，放弃旧 epoch 工作
```

### 6.3 L2 — NVXC 应用帧

常量（[protocol/app.rs](../../../context/nvx/nvx-rs/src/protocol/app.rs)）：

| 常量 | 值 |
|---|---|
| `APP_MAGIC` | `b"NVXC"` |
| `APP_VERSION` | 1 |
| `APP_HEADER_LEN` | **24** 字节 |

头布局：

| 偏移 | 字段 | 宽度 |
|---|---|---|
| 0 | magic `NVXC` | 4 |
| 4 | version | 1 |
| 5 | kind | 1 |
| 6 | flags（必须 0） | 2 |
| 8 | request_id | 8 |
| 16 | status（i32，请求中为 0） | 4 |
| 20 | payload length | 4 |

帧种类：

| code | 名称 | 类别 |
|---|---|---|
| `0x01` | `APP_PING` | 请求 |
| `0x02` | `APP_EXEC` | 请求 |
| `0x03` | `APP_STOP` | 请求 |
| `0x04` | `APP_CANCEL` | 请求 |
| `0x05` | `APP_FEATURES` | 请求 |
| `0x06` | `APP_MAPS` | 请求 |
| `0x81` | `APP_READY` | 响应 |
| `0x82` | `APP_STDOUT` | 响应 |
| `0x83` | `APP_STDERR` | 响应 |
| `0x84` | `APP_EXIT` | 响应 |
| `0x85` | `APP_STOPPED` | 响应 |
| `0xFF` | `APP_ERROR` | 响应 |

**注意：没有 `APP_STDIN`。** 请求侧只有 Exec/Stop/Cancel/Features/Maps/Ping。

### 6.4 L3 — EXEC 载荷与硬限制

[protocol/exec.rs](../../../context/nvx/nvx-rs/src/protocol/exec.rs) 第 168–180 行：

```rust
pub struct ExecPayload {
    pub timeout_ms: u32,
    pub argv: Vec<String>,
    pub cwd: Option<String>,
    pub environment: Option<Vec<String>>,
    pub inherit_default_env: bool,
}
```

| 限制 | 值 | 出处 |
|---|---|---|
| `MAX_ARGUMENTS` | **64** | exec.rs:16 |
| `MAX_ARGUMENT_BYTES` | **4096** | exec.rs:18 |
| `MAX_CWD_BYTES` | 4095 | exec.rs:21 |
| `MAX_ENVIRONMENT` | **256** 条 | exec.rs:26 |
| 单次 exec 合并输出 | **1 MiB** | 4.4 控制接口 |
| 每次 exec 后 cgroup | 每次执行独立 cgroup | `EXEC_CGROUP` feature |

**guest managed agent 把 workload 的 stdin 接到 `/dev/null`**（[guest/managed_agent/launch.rs:71](../../../context/nvx/nvx-rs/src/guest/managed_agent/launch.rs)）：`.stdin(null_device(paths)?)`

而 `nvx::exec` 引擎在**引擎层支持输入**（[exec/mod.rs:27-34](../../../context/nvx/nvx-rs/src/exec/mod.rs) 有 `Input` / `InputEnd` / `InputClosed` 消息）—— **协议层有能力，控制台帧没暴露**。

### 6.5 退出类别

| 类别 | 含义 | 状态码 |
|---|---|---|
| `exit` | workload 自己退出 | 其退出码 |
| `timeout` | 超时被 kill | — |
| `cancel` | 被 CANCEL 请求杀死 | — |
| `output-limit` | 合并输出超 1 MiB，guest agent 杀掉 | **125** |
| `mapping-failed` | host 映射无法应用 | guest errno |

### 6.6 Feature 协商

[protocol/features.rs](../../../context/nvx/nvx-rs/src/protocol/features.rs)：

| bit | 名称 | 含义 |
|---|---|---|
| 0 | `CANCEL` | 支持取消 |
| 1 | — | 保留，永不置位 |
| 2 | `WORKLOAD_ACCOUNT` | 可创建 workload 账号 |
| 3 | `EXEC_CGROUP` | 每次执行独立 cgroup |
| 4 | `EXEC_ENVIRONMENT` | 每次执行独立环境 |
| 5 | `EXEC_CWD` | 工作目录拒绝语义 |
| 6 | `HOST_MAPPING_TABLE` | host 映射表 |

组合：

| 组合 | 位 |
|---|---|
| `DIRECT_AGENT` | — |
| `REQUIRED` | `DIRECT_AGENT` |
| `SANDBOX_AGENT` | — |
| `LAYERED_SANDBOX` | `EXEC_ENVIRONMENT \| HOST_MAPPING_TABLE` |

分层沙箱根只提供 cancellation + per-execution env + host mapping table（**不创建账号**，workload 用镜像已有账号）；blockless managed root 提供全部六位。

协商规则：宿主忽略未知位与尾部字节；`unsupported-operation` 的拒绝等于「无 feature」；缺少所需 feature 的 guest 会被终止。

### 6.7 传输层三层保护

[nvx/doc/design/3.3-consoles.md](../../../context/nvx/doc/design/3.3-consoles.md) 第 70–90 行：

1. **私有端点**：Linux 是 owner-only 非符号链接目录内的 `0600` Unix socket；Windows 是受保护 DACL 的命名管道（只许 LocalSystem + VMM 用户）。**其他 backend kind 一律拒绝**，且 boot 与 control 端点必须不同
2. **对端身份**：broker 只留一个 host 槽位给「OS 身份等于 VMM 用户」的对端（Unix effective UID / 管道 token user SID）。其他对端**在读字节之前就被断开**
3. **Capability**：launcher 通过**单向管道**传 32 字节随机 capability（writer 在 VMM 启动前关闭）。首个 host 记录必须在**有界认证超时（默认 5 秒）**内呈现。disconnected control console 使用无人能呈现的随机 capability

### 6.8 焦点代码区域（NVX 侧）

| # | 文件 | 行数 | 职责 | 优先级 |
|---|---|---|---|---|
| N1 | [protocol/outer.rs](../../../context/nvx/nvx-rs/src/protocol/outer.rs) | 183 | NVXS 头、记录类型、编码 | ★★★ |
| N2 | [protocol/nvxs/record.rs](../../../context/nvx/nvx-rs/src/protocol/nvxs/record.rs) | 560 | 记录解析状态机、`ErrorCode` | ★★★ |
| N3 | [protocol/nvxs/host.rs](../../../context/nvx/nvx-rs/src/protocol/nvxs/host.rs) | 232 | 宿主侧会话状态机 | ★★★ |
| N4 | [protocol/nvxs/guest.rs](../../../context/nvx/nvx-rs/src/protocol/nvxs/guest.rs) | 284 | guest 侧会话状态机 | ★★★ |
| N5 | [protocol/app.rs](../../../context/nvx/nvx-rs/src/protocol/app.rs) | 159 | NVXC 帧编解码 | ★★★ |
| N6 | [protocol/exec.rs](../../../context/nvx/nvx-rs/src/protocol/exec.rs) | 515 | EXEC 载荷与全部硬限制 | ★★★ |
| N7 | [protocol/features.rs](../../../context/nvx/nvx-rs/src/protocol/features.rs) | 124 | feature 位与组合 | ★★ |
| N8 | [exec/mod.rs](../../../context/nvx/nvx-rs/src/exec/mod.rs) | 722 | 执行引擎（credit 流控、输入、终止） | ★★★ |
| N9 | [hypervisor.rs](../../../context/nvx/nvx-rs/src/hypervisor.rs) | 107 | 三后端 + 平台默认 | ★★★ |
| N10 | [host/platform/mod.rs](../../../context/nvx/nvx-rs/src/host/platform/mod.rs) | 191 | 平台分发 | ★★★ |
| N11 | [host/platform/other.rs](../../../context/nvx/nvx-rs/src/host/platform/other.rs) | 287 | **macOS 落这里，`SUPPORTED=false`** | ★★★ |
| N12 | [host/platform/linux/endpoint.rs](../../../context/nvx/nvx-rs/src/host/platform/linux/endpoint.rs) | — | Unix socket 0600 | ★★ |
| N13 | [host/platform/windows/endpoint.rs](../../../context/nvx/nvx-rs/src/host/platform/windows/endpoint.rs) | — | 命名管道 + DACL | ★★ |
| N14 | [host/sandbox/](../../../context/nvx/nvx-rs/src/host/sandbox/) | — | `SandboxPlan`、mount 计划、选项检查 | ★★★ |
| N15 | [host/network/policy/mod.rs](../../../context/nvx/nvx-rs/src/host/network/policy/mod.rs) | — | egress 策略编译（`compile_policy_file` / `compile_policy_bytes` / `compile_policy`） | ★★ |
| N16 | [guest/managed_agent/launch.rs](../../../context/nvx/nvx-rs/src/guest/managed_agent/launch.rs) | — | **stdin → /dev/null 的位置** | ★★★ |
| N17 | [guest/entry.rs](../../../context/nvx/nvx-rs/src/guest/entry.rs) | — | 命名空间/root/身份施加 | ★★★ |

### 6.9 guest 二进制（兼容契约）

| 二进制 | 职责 |
|---|---|
| `nvx-managed-agent CONTROL_TTY ROOTFS HOSTNAME UID GID USER HOME` | 服务托管控制会话，顺序监督 workload |
| `nvx-init TIME_DAEMON [ANNOUNCER]` | 接管 PID 1；OOM score -1000、nice -10；收全部子进程状态；`sync` 后以 125/0 结束 VM |
| `nvx-exit [CODE]` | 通过 OpenVMM 控制端口 `0x604`（x86_64）以 8 位退出码停 VM |
| `nvx-time [--report-only] COMMAND` | 强制 NVX time ABI v1，恢复后修墙钟，发布时间状态 |
| `nvx-time-probe latency\|warp\|clock ...` | 诊断时钟延迟、跨 CPU TSC warp、CPUID、MSR |
| `nvx-reseed [--generation-only] SEED_FILE [PREVIOUS]` | 从种子文件重播种内核 RNG，校验 VM generation ID |
| `nvx-ingress [inherit\|start] GATEWAY_IPV4` | 向 gateway 宣告可达 TCP 监听器与已 settle 的 UDP socket |
| `nvx-console-pending DEVICE` | 打印设备待读字节数 |
| `nvx-mmio-write ADDRESS VALUE` | 经 `/dev/mem` 写 32 位值（x86_64） |
| `nvx-device-io file\|network\|map ...` | 基准 helper，测文件与 UDP 往返 I/O |

全部是**静态 `x86_64-unknown-linux-musl` ELF**，命令行、退出状态、字节输出都是兼容契约。

### 6.10 隔离机制（guest 内，与 DSH 逐条对照）

[nvx/doc/design/4.3-isolation-and-resource-model.md](../../../context/nvx/doc/design/4.3-isolation-and-resource-model.md)：

| 维度 | NVX | DSH（macOS 实测） |
|---|---|---|
| 身份 | 非 root 数值 UID/GID，首次启动固定 | 宿主用户本身 |
| 权限 | 全部 capability 集清空 + 补充组清空 + `no_new_privs` | 宿主全部权限 |
| 命名空间 | 私有 mount / PID / UTS，workload 是 PID 1 | 无 |
| `/proc` | 私有 | 宿主 `/proc`（macOS 无） |
| `/sys` | 只读 | 宿主 |
| `/dev` | 受限 tmpfs，12 个白名单节点 + 独立 devpts | 宿主 |
| root | overlay（EROFS lower + 私有 upper），mount 命名空间 move | 宿主 root |
| `mknod` | 拒绝 | 拒绝（Seatbelt 副产品） |
| 端口 I/O | workload 无法执行（capability 全清） | 宿主权限 |
| 资源 | agent 拥有的 cgroup v2（memory + pids） | 无 |
| **文件读** | **只有声明的 share 可见** | ❌ **全盘可读** |
| **网络** | **egress/ingress 策略，可 deny-all** | ❌ **完全开放** |
| **进程** | **独立 PID 命名空间** | ❌ **可 signal 同用户进程** |

CI 的 `/sbin/nvx-sandbox-smoke` 会把上述每条实测一遍（[run.md:872](../../../context/nvx/doc/run.md) 起的完整清单），包括「读端口而不带权限 → SIGSEGV」、「写 `file-ro` share → EROFS」、「硬链接只读文件进可写区 → 拒绝」。

---

## 7. `sandbox-nano-nvx` 可行性分析

### 7.1 先决约束：DSH 已明确把 microVM 排除在 `ctx.sandbox` 之外

这是设计的地基，必须先对齐：

[sandbox/README.md](../../../context/deepseek-harness/packages/sandbox/README.md) 第 12 行：

> **Confinement is same-world only**: it shares the host kernel and filesystem, while **containers, microVMs, and remote executors replace whole capabilities instead of registering here.**

[sandbox/src/index.ts](../../../context/deepseek-harness/packages/sandbox/sandbox/src/index.ts) 第 3–5 行：

> Containers, microVMs, and remote execution **replace the surrounding capability seam instead**; this service shares the host kernel and filesystem.

[2026-07-06-sandbox.md](../../../context/deepseek-harness/.agents/notes/archived/feature/2026-07-06-sandbox.md) 第 149 行：

> **One interface spanning containers/VMs too** — rejected: `confine(argv)` presupposes a shared filesystem; environment isolation is **capability-sibling backends deployed as coherent groups**.

以及待办（[sandbox-local/README.md](../../../context/deepseek-harness/packages/sandbox/sandbox-local/README.md) 第 150 行）：

> #### Future: environment-coherent groups
> An environment-coherent capability group example, such as bash plus fs against one container, **remains undecided**.

**结论：`sandbox-nano-nvx` 不是「新 provider」。**

它在架构上属于 DSH 已预留但未做的 **environment-coherent capability group** 类别——但 **v1 只用了这个类别里最轻的一种形态**：不替换 shell/fs/subprocess，只新增一个 MCP 工具入口（§8C）。完整的能力组替换（shell + fs + subprocess）保留为未来扩展（§7.3、§8A.4）。

### 7.2 现成先例：SSH 家族

| 包 | seam |
|---|---|
| `dsh-ssh` | 连接与 helper 生命周期 |
| `dsh-fs-ssh` | `ctx.fs` |
| `dsh-subprocess-ssh` | `ctx.subprocess` |
| `dsh-sandbox-ssh` | `ctx.sandbox`（远端自选后端） |

`sandbox-nano-nvx` 应逐字照抄这个家族形状。

### 7.3 seam 替换矩阵

> **适用范围**：本节描述的是「把 NVX 当作 `ctx.shell`/`ctx.fs` 的替代实现」这条路径。**v1 不走这条路径**——v1 只在 VM 内跑 MCP 服务器，不替换 DSH 的 shell/fs（见 §8C）。本节保留作为**未来扩展的评估**，其中的难度与冲突不构成 v1 的阻碍。

| DSH seam | 现实现 | NVX 实现 | 难度 |
|---|---|---|---|
| `ctx.shell` | `SandboxBashExecutor extends LocalBashExecutor` | `NvxBashExecutor extends ShellExecutor`，`execute()` → `nvx-rs sandbox exec` | 中 |
| `ctx.subprocess` | `subprocess-local` | `spawn()` → `EXEC` 帧 | **高**（无 stdin、1 MiB 上限） |
| `ctx.fs`（17 个抽象方法） | `fs-local` / `fs-sandbox` | 映射到 virtio-fs share | 中高 |
| `ctx.sandbox` | `sandbox-local` | **不实现**。`SandboxProvider` 从组合移除；或提供只读「事实报告」实现让 `sandbox_permissions` 字段仍出现 | 高（语义不匹配） |
| `ctx.terminals` / `terminal-bash` | `subprocess` + PTY | 只能「半持久」：文件系统保留，进程/cwd 不保留 | **高** |
| `ctx.jobs` | 本地后台进程 | `exec` 同步阻塞，无后台句柄 | 高 |

**关键取舍**：`ctx.sandbox.confine(argv)` 的契约是「返回一个要 spawn 的 argv」（[index.ts:225](../../../context/deepseek-harness/packages/sandbox/sandbox/src/index.ts)）。NVX 没有这个概念——要跑的命令不是宿主 spawn 的，是发给已在运行的 VM 的。

### 7.4 Policy 映射

| DSH `SandboxMode` | NVX provision 参数 | 实际强度 |
|---|---|---|
| `read-only` | `--mount <ws>,ro --upper ram --network-egress deny --host-loopback deny` | **远超**：无网络，写入进 RAM 上限，VM 停即消失 |
| `workspace-write` | `--mount <ws>,rw --mount-write <ws> --network-egress allow`（或 CIDR 白名单）+ `--upper scratch` | **远超**：文件效果 + VM 边界 + 命名空间 + capability 清零 |
| `danger-full-access` | 不启用 NVX，走 `bash-local` + `fs-local` | 语义保持 |

`additionalWritableRoots` → 额外 `--mount TARGET,PATH,rw --mount-write PATH`，**语义直接对得上**。

`enforcement` 应报 **`'full'`** —— 且这是 DSH 史上第一个真正配得上 `full` 的后端（现有三个 POSIX 后端报 full 但都只保文件效果）。

NVX 独有、DSH 词汇里**没有对应物**的能力：

| NVX 能力 | 价值 |
|---|---|
| `--mount-deny` / `--mount-allow` | 在 share 内隐藏然后精确重开子路径 |
| `--mount-write` | rw share 内只有子集可写，其余 `EROFS` |
| `--network-egress-allow CIDR[:PROTO:PORT]` | 端口级出站白名单 |
| `--network-proxy` | 唯一出口是宿主代理 |
| `--host-loopback {allow,deny}` | workload ↔ 宿主 loopback 双向控制 |
| `--hostname` | UTS 命名空间 hostname |
| `--workload-user UID:GID` | 固定非 root 身份 |
| `--memory-mib` | 硬内存上限 |
| `--upper ram` | 写入在内存里，VM 停即丢 |

### 7.5 四个硬冲突（仅适用于 shell/fs 替换路径）

> **重要**：这四条冲突**只在你把 NVX 当作 `ctx.shell` 替代实现时**才成立。v1 的架构是「VM 内跑 MCP 服务器」，DSH 不通过 `ctx.shell` 调用 VM，因此：
>
> | 冲突 | 在 v1 中是否成立 |
> |---|---|
> | 无 stdin | ❌ 不成立——MCP 走自己的协议，不需要 shell stdin |
> | 1 MiB 输出上限 | ❌ 不成立——MCP 响应是结构化小消息 |
> | 无持久 shell | ❌ 不成立——MCP 服务器本身就是 VM 内的常驻进程 |
> | 升级语义冲突 | ⚠️ **部分成立**——见 §8B.6，仍需业主决策 |
>
> 换句话说：**v1 的架构选择恰好绕开了前三条冲突。** 这是 MCP 方案相对 shell 替换方案的核心优势。

#### 冲突 1：没有 stdin

`EXEC` 载荷无输入字段；managed agent 显式把 stdin 接到 `/dev/null`（[launch.rs:71](../../../context/nvx/nvx-rs/src/guest/managed_agent/launch.rs)）。

而 DSH 的 `SubprocessSpawnSpec` 有 `stdio` 逐流配置（[subprocess/src/types.ts:83](../../../context/deepseek-harness/packages/subprocess/subprocess/src/types.ts)），`bash` 工具常用 `cat <<EOF`、`python - <<'PY'`、管道喂数据。

**绕过方案**：把 stdin 写成 VM 内临时文件，`--arg` 传路径。可行但要改 tool 层，破坏「argv 原样传递」契约。

**根因**：`nvx::exec` 引擎层**支持**输入（有 `Input`/`InputEnd`/`InputClosed` 消息），但 NVXC 控制台帧没暴露。这是**协议层暴露不足，不是能力缺失** —— 可修，但需改 NVX 的帧定义。

#### 冲突 2：输出上限 1 MiB

单次 exec 合并输出上限 1 MiB，超出 workload 被杀（`output-limit`，125）。

DSH 的 `SubprocessOutputReader` 支持流式读取和 spill 文件，`bash` 工具默认就有截断策略。1 MiB 对 `npm install`、`pytest`、`cargo build` 会**频繁触发**。

**绕过方案**：guest 内 `tee` + 尾部读取；或改 NVX 的 credit window 与上限。

#### 冲突 3：无持久 shell / 无后台任务

DSH 的 `terminal-bash` 要求 cwd、环境变量、函数、运行中的交互子进程跨调用存活（[terminal-bash/README.md:30](../../../context/deepseek-harness/packages/terminal/terminal-bash/README.md)）。NVX 的 managed exec 每次是**独立进程**（共享 warm VM，文件系统保留，进程状态不保留）。

`ctx.jobs` 的后台句柄也没有对应物 —— `exec` 同步阻塞到结束。

**绕过方案**：managed exec 里 spawn `nohup` + 重定向到文件 + 后续 exec 读文件。**把后台语义降级成文件轮询**，能跑但语义不等价。

#### 冲突 4：升级机制语义错配

DSH 的 `esc` 机制假设「同一次调用带 `sandbox_permissions` 重试一次」（[escalation.ts](../../../context/deepseek-harness/packages/sandbox/sandbox/src/escalation.ts)）。

而 NVX 的**网络策略和 share 集合是 provision 时固定的**（[usage.md:280](../../../context/nvx/doc/usage.md)）：

> Network policy and live-share options configure only the `run` and `provision` launches

所以：

- 文件级放宽（新增 `--mount-write`）需要 **deprovision → provision → start**
- 网络放宽同理
- 这意味着 290ms 冷启动 + 模板恢复的代价在升级路径上要付一次

#### 冲突 5（附加）：快照终止源 VM

NVX 快照「guest 发起、成功即终止源 VM」。而 DSH 的会话模型假设长期存活的执行世界。若要用模板池，**模板必须专门构造一次（capture 后模板 VM 死亡）**，不能「边跑边存」。

### 7.6 与 DSH 原生沙箱的能力对比

| 能力 | `sandbox-local`（现在，本机实测） | `sandbox-nvx`（提案） |
|---|---|---|
| 文件写隔离 | ✅ 内核级 | ✅ VM 边界 |
| **文件读隔离** | ❌ 全盘可读（`~/.ssh`、`~/.dsh` 实测可读） | ✅ 只有声明 share 可见 |
| **网络隔离** | ❌ `curl` 实测 200 | ✅ egress/ingress 策略，可 deny-all |
| **跨会话隔离** | ❌ `/tmp` 与 TMPDIR 整目录共享（实测可跨会话写） | ✅ 独立 VM + 独立 upper |
| **进程可见性** | ❌ 可 signal 同用户宿主进程（实测 kill 成功） | ✅ 独立 PID 命名空间 |
| **syscall/设备** | ❌ 无 seccomp | ✅ 虚拟设备白名单 |
| **凭证读取** | ❌ `~/.ssh`、`~/.dsh` 可读 | ✅ 宿主凭证不在 guest 里 |
| **升级机制** | ✅ 同调用重试 + 审批 | ❌ 需重建 VM |
| **stdin / 后台任务** | ✅ | ❌ |
| **冷启动** | ~10ms | 290ms（或 55ms 模板恢复） |
| **常驻内存** | ~0 | 34–75 MiB / VM |
| **macOS** | ✅ Seatbelt | ❌ |

**这张表说明：两者不是替代关系，是不同威胁模型。** `sandbox-local` 防「模型误写文件」，`sandbox-nvx` 防「不可信代码拿到宿主任何东西」。

### 7.7 包结构（v1 实际形态）

> 本节原描述的是「替换 shell/subprocess/fs 三个 seam」的结构。**v1 不采用该结构**（见 §8C），实际形态如下。

```
dsh-nano-sandbox-nvx/              # Windows 包
  index.js                         # 宿主检测 + 运行时生命周期 + policy 映射
  lib/skill.js                     # 构建技能正文（确定性配方）
  lib/mcp-bridge.js                # streamable-http 接入点
dsh-nano-sandbox-apple-container/  # macOS 包
  index.js                         # 同上（container CLI）
  lib/skill.js
  lib/mcp-bridge.js
```

**没有 `shell-*` / `fs-*` / `subprocess-*` 子包**——v1 不替换这些 seam。

### 7.8 模板池：NVX 唯一比现方案强一个维度的地方

NVX 的 snapshot → clone 是 55ms / 34 MiB。这可以给 DSH 一个现在完全没有的东西：

```
启动时：provision 模板 → start → snapshot → 得到 immutable artifacts
每会话：restore 一个 clone（~55ms）→ 该会话独占一个 VM
会话结束：VM 丢弃，scratch/RAM upper 回收
```

对应 DSH 的 `SandboxPolicy.sessionId`：每 live session 一个 VM，`workspaceRoot` 对应一个 rw share。这是**真正的 per-session 隔离**，而不是现在的「per-session 策略、共享宿主」。

`--upper ram` 进一步意味着「session 所有写入在 VM 内存里，VM 停就没了」—— 这比「写被拒」更贴近 `read-only` 的意图。

### 7.9 macOS 的第三端方案

| 方案 | 可行性 | 说明 |
|---|---|---|
| **A. macOS → SSH → Linux/Windows NVX 主机** | ✅ **现实可行** | 复用 `ssh` + `fs-ssh` + `subprocess-ssh` 家族；远端起 `nvx-rs`。`sandbox-ssh` 已证明这条路（`the remote host selects its installed local sandbox backend`），需要一个 nvx 版本的远端选择 |
| B. macOS 里跑 Linux VM 再跑 NVX | ❌ | 嵌套虚拟化，non-goals 明确排除 |
| C. 给 NVX 加 HVF 后端 + aarch64 guest | ❌ | 需重做 guest 工具链、kernel 配置、time ABI、CPU profile 体系；本机是 arm64 而 NVX guest 是 x86_64 |

**方案 A 是唯一现实答案**，且顺手解决「三端共用」：三端都作为**客户端**接入同一套 NVX 基础设施。macOS 用户拿到的隔离强度与 Linux 用户完全一样 —— 只是 VM 不在本机。

这符合 DSH 的设计哲学：`remote executors` 与 containers/microVMs 并列为「replace whole capabilities」的同类。

---

## 8. 测试计划

### 8.1 P0 — 探测与状态（不接 seam）

| # | 用例 | 期望 | 阻断条件 |
|---|---|---|---|
| P0-1 | 本机 `nvx-rs` 存在且可执行 | 打印版本与后端 | 不存在 → 停 |
| P0-2 | `Hypervisor::platform_default()` 在本机 | macOS 返回 `None` | 若返回 Some → 重新评估 |
| P0-3 | `nvx-rs sandbox --dry-run` 生成 OpenVMM 命令行 | 完整 argv，无实际启动 | 失败 → 查 artifacts |
| P0-4 | `nvx-rs run` 冷启动 Alpine | 打印 `NVX-GUEST-BOOT-OK: alpine`，进 root shell | 失败 → 记录错误码 |
| P0-5 | 冷启动耗时测量（10 次 p50） | 与基准 291.5ms 同量级 | 偏差 >3x → 记录宿主差异 |
| P0-6 | `nvx-rs sandbox run`（EROFS layer + scratch） | workload 执行，退出码透传 | — |
| P0-7 | `/sbin/nvx-sandbox-smoke` 安全剖面 | 全部检查通过 | 任一失败 → 阻断 |

**P0 不修改 DSH 任何代码**，用独立脚本在 `~/nvx-eval/` 内跑。

### 8.2 P1 — MCP 接入（v1 主路径）

> 原 P1 假设「替换 `ctx.shell`」。v1 改用 MCP，故本节重写。

| # | 用例 | 期望 | 备注 |
|---|---|---|---|
| P1-1 | VM 内起 MCP 服务器，暴露一个 `echo` 工具 | DSH 通过 `streamable-http` 调用成功 | 验证 `url` 接入 |
| P1-2 | 宿主不装 grok/codex，VM 内装上 | 工具可用 | **验证 env 隔离** |
| P1-3 | MCP 服务器改到另一台机器 | 只改 `url` 即通 | **验证远程执行** |
| P1-4 | `read-only` 下 MCP 工具尝试写 | 拒绝，`sandbox.denied=true` | 验证 policy 映射 |
| P1-5 | VM 内读宿主 `~/.ssh` | **拒绝**（关键改进） | 对比原生沙箱的可读 |
| P1-6 | VM 内 `curl` 在 egress deny 下 | **拒绝**（关键改进） | — |
| P1-5 | 读 `~/.ssh` | **拒绝**（关键改进） | 对比原生沙箱的可读 |
| P1-6 | `curl` 在 `--network-egress deny` 下 | **拒绝**（关键改进） | — |
| P1-7 | 输出 >1 MiB | 记录实际行为与 `output-limit` 触发点 | **预期会失败**，登记为已知限制 |
| P1-8 | stdin 管道（`cat <<EOF`） | 记录实际行为 | **预期会失败** |
| P1-9 | `sandbox_permissions` 升级请求 | 记录当前（预期不可用） | 登记为冲突 4 |
| P1-10 | 会话模式切换（`sandbox/mode` 事件） | 下一次调用生效 | 验证需要重建 VM 的延迟 |

### 8.3 P2 — 模板池与 per-session VM（未来，非 v1）

> v1 是「一个环境 + MCP」，不需要 per-session VM。本节保留作为规模化的验证计划。

| # | 用例 | 期望 |
|---|---|---|
| P2-1 | 模板 provision + start + snapshot | 产出 artifacts，模板 VM 终止 |
| P2-2 | 连续 restore 10 个 clone | 每个 <100ms，RSS <50 MiB |
| P2-3 | 两个 clone 各自写工作区 | 互不可见（**关键：跨会话隔离**） |
| P2-4 | clone 读另一个 clone 的 share | 拒绝 |
| P2-5 | `--upper ram` clone 写入后 stop | 写入消失 |
| P2-6 | 50 个并发 clone 的内存水位 | 记录实际峰值 |
| P2-7 | VM 泄漏检测（异常退出后） | 无残留 OpenVMM 进程 |
| P2-8 | scratch 独占锁 | 第二个 sandbox 用同一 image 被拒 |

### 8.4 P3 — `ctx.subprocess` 与降级语义（未来，非 v1）

> v1 不替换 `ctx.subprocess`（§8C）。本节保留作为未来扩展的验证计划。

| # | 用例 | 期望 |
|---|---|---|
| P3-1 | `subprocess-nvx` 基本 spawn | 可用 |
| P3-2 | 逐流 stdio 配置 | 记录哪些支持、哪些降级 |
| P3-3 | 后台任务（`run_in_background`） | 记录降级实现（文件轮询） |
| P3-4 | 终端（`terminal-bash`） | 记录不支持项与错误信息 |
| P3-5 | `jobs` 的 `job_output` / `job_kill` | 记录语义差异 |

### 8.5 P4 — macOS 本地（Apple container，v1 主路径）

> 原 P4 假设「macOS 只能远程接入 NVX」。Apple container 改变了这一点：macOS 有本地 VM 方案（§5.9），远程降级为可选。

| # | 用例 | 期望 |
|---|---|---|
| P4-1 | 安装 Apple container 并 `container system start` | 服务起来，`container list` 可用 |
| P4-2 | `container run --rm alpine echo hi` | 输出 hi |
| P4-3 | VM 内 MCP 服务器可被 DSH 通过 `streamable-http` 接入 | 工具可调用 |
| P4-4 | 宿主不装 grok，VM 内装上 | 工具可用（env 隔离） |
| P4-5 | **（可选）** 把 `url` 指向另一台机器 | 远程执行成立 |
| P4-6 | `container machine` **不**被使用 | 配置里无 machine 子命令 |

### 8.6 P0.5 — arm 实证（已执行，2026-11-12）

业主指定「fork 后尝试使用一个最小的 arm alpine 进行测试」。实测环境：**spark**（Linux aarch64 / kernel 6.17.0-1021-nvidia / 20 核 / 121 GB RAM / `/dev/kvm` 可读写 / 455 GB 可用）。

**方法**：不先做 distro 层，而是把问题拆到最小——按依赖顺序逐层编译并执行，每层失败都能定性。

#### 8.6.1 执行日志

| # | 步骤 | 结果 | 关键输出 |
|---|---|---|---|
| A1 | 在 arm 上下载 x86 包并执行 | ❌ **`可执行文件格式错误`** | 三个 ELF 均为 `x86-64`；排除“换个包就能用” |
| A2 | 装 rustup 1.29.3 + pinned 1.97.1 + `aarch64-unknown-linux-musl` | ✅ 成功（全部在 `/tmp` 内，可整体删除） | — |
| A3 | 编译 `nvx-rs`（host CLI，`--features cli`）到 aarch64 | ✅ **8.5 秒，EXIT=0** | 产出 2,790,176 B ARM aarch64 ELF，**可直接运行** |
| A4 | 编译 guest 二进制到 `aarch64-unknown-linux-musl` | ✅ 全部编出 | 见 8.6.2 的 stub 分析 |
| A5 | 克隆 openvmm @ pin `90f87319`（`feature/microvm/dev` 分支） | ✅ 成功 | 提交信息：`openvmm: run restored VM time from the instant the TSCs resume` |
| A6 | 编译 openvmm 到 aarch64（第 1 次） | ❌ 缺 openssl | `openssl-sys` 找不到 |
| A7 | 第 2 次（装 libssl-dev） | ❌ 路径错 | `OpenSSL libdir at ["/usr/lib"] does not contain …` |
| A8 | 第 3 次（`OPENSSL_LIB_DIR` 改为 `/usr/lib/aarch64-linux-gnu`） | ❌ 缺 protoc | `failed to invoke protoc` |
| A9 | 第 4 次（装 protoc 3.21.12） | ✅ **EXIT=0，1 分 00 秒** | 产出 496,180,808 B ARM aarch64 ELF |
| A10 | 验证 arm openvmm 有 microVM 模式 | ✅ | `--machine microvm` 在 `--help` 中列出 |
| A11 | 用 arm guest 资产组装最小 rootfs | 部分 | 宿主 `vmlinux` 解出 `ARM64 boot executable Image`（66 MB） |
| A12 | `nvx-rs run` 完整启动 | ❌ **卡在 initramfs** | `error[artifact-missing]: Alpine Linux initramfs not found` |

#### 8.6.2 决定性发现：`nvx-init` 在 arm 上是 stub

这是整条链路的真正断点。以 `target_arch = "x86_64"` 门禁枚举 `nvx-rs/src/bin/`：

| guest 二进制 | arm 状态 | 说明 |
|---|---|---|
| `nvx-init` | **STUB** | **PID 1 入口**。源码：`Elsewhere this stub fails`。它 stub 了，VM 就没有 init |
| `nvx-exit` | **STUB** | 写死 x86 端口 `0x604`，arm 需 PSCI |
| `nvx-time` | **STUB** | NVX time ABI v1 实现，arm 需重做 |
| `nvx-time-probe` | **STUB** | 同上 |
| `nvx-mmio-write` | **STUB** | 走 `/dev/mem` 写 MMIO，x86 语义 |
| `nvx-device-io` | **STUB** | 基准 helper，x86 语义 |
| `nvx-managed-agent` | ✅ 真实实现 | 1,007,448 B，可运行 |
| `nvx-console-pending` | ✅ 真实实现 | 644,432 B |
| `nvx-ingress` | ✅ 真实实现 | 753,664 B |
| `nvx-reseed` | ✅ 真实实现 | 655,192 B，报真实错误 `open --help: No such file` |

**实测行为验证**：`nvx-init`、`nvx-exit`、`nvx-time` 在 arm 上均**静默 exit 0**（空 `main` 的典型表现）；`nvx-reseed` 则报真实文件错误。两者对比确认了 stub 判定。

源码门禁统计：**6 个 x86-gated / 5 个 portable**。

#### 8.6.3 判定

| 命题 | 结论 |
|---|---|
| arm 主机能运行 `nvx-rs` 吗 | **能**（自编，8.5s） |
| arm 主机能运行 `openvmm` 吗 | **能**（自编，1m00s，496 MB） |
| openvmm 有 aarch64 microVM 模式吗 | **有**（`--machine microvm` 存在） |
| 能启动 arm guest 吗 | **不能（当前 pin）** |
| 真正的断点 | **`nvx-init` 等 6 个 guest 二进制是 stub**，不是架构不支持 |

**这与之前的判断不同，必须纠正**：不是「上游未就绪」，而是 **NVX 自己把 guest 用户态限定在 x86_64**。openvmm 侧反而是就绪的（能编能跑，microvm 模式存在）。

**v1 决定：arm NVX 永久不做。** 理由不是「做不了」，而是「没有用例 + 责任最重」——macOS 由 Apple container 覆盖、Windows arm64 已排除、Linux 不在 v1（§8B.2）。本节实测的价值在于：它把「arm 到底卡在哪」从推测变成了事实，供未来需要时直接引用。

**所以 arm 改造的真实范围比 §5.6 估计的小得多**：

| 层 | 工作量 |
|---|---|
| openvmm aarch64 | ✅ **已就绪**（本次实测编译+运行） |
| `nvx-rs` host | ✅ **已就绪**（编译+运行） |
| **6 个 x86-gated guest 二进制** | **真正要做的事**：`nvx-init`（PID1 接管）、`nvx-time`（time ABI）、`nvx-exit`（PSCI 替代 `0x604`）是必需；其余 3 个可延后 |
| arm distro 层（alpine/ubuntu） | 需重做包锁，但这是 build_constants 的常量 + 依赖集 |
| kernel config | `CONFIG_ARM64` 系列需补（现 43:0） |

**改造分级修正**：

| 层级 | 内容 | 量级 |
|---|---|---|
| L1 可启动（只求 boot） | `nvx-init` + `nvx-exit` + `nvx-time` 三个 arm 实现 + arm kernel config + 最小 alpine initramfs | **中**（不是很大） |
| L2 可用 | L1 + `nvx-mmio-write`/`nvx-device-io` + arm distro 层 | 中高 |
| L3 三 distro | L2 + AzureLinux arm 仓库 | 大 |

#### 8.6.4 未验证项（诚实登记）

本次**未**做到完整 arm 启动，原因不是能力不足而是设计选择：

- 未重建 arm initramfs（需先把 6 个 guest 二进制做成真实现，否则 initramfs 仍是 stub）
- 未产出 arm distro 层（alpine minirootfs 拉取 + mkfs.erofs）
- 未验证 arm guest 内的隔离剖面（`uid=65534` / `CapEff=0` / PID ns）

这三项需在真正的 fork 里做，属于 L1 的实现工作。

#### 8.6.5 环境清理

spark 上全部制品（6.0 GB：rustup/cargo/target/源码/openvmm/x86 包）已删除。复查：`nvx dirs: 0`、`state: 0`、`/tmp` 归零。

### 8.7 回归与验收门槛

| 门槛 | 标准 | 对应用例 |
|---|---|---|
| **隔离强度**（一票否决） | 读宿主凭证与网络必须**拒绝**，否则 v1 无意义 | P1-5、P1-6 |
| **env 隔离**（一票否决） | 宿主不装工具时沙箱仍可用 | P1-2、P4-4 |
| **远程执行** | 改 `url` 即通，无需重装 | P1-3、P4-5 |
| 功能性 | MCP 接入与 policy 映射可用 | P1-1、P1-4 |
| 无泄漏 | 异常退出后无残留 VM 进程 | P2-7 |
| 成本可接受（未来） | 模板池内存水位 | P2-2、P2-6 |

---

## 8A. Policy 合规性与可审计接入（业主第 2 点专项）

业主的核心预期不是「NVX 能不能跑」，而是「**如果增加 nano-nvx 作为后端，能不能持续稳定地在 dsh 架构内声明接入，并完成审计**」。这一节只做合规性文档分析（业主选择），不做代码实测。

### 8A.1 审计通道的真实形状

DSH 的审计不是独立日志系统，而是**会话日志的追加事件流**。与沙箱相关的可审计面有四个：

| 审计面 | 事件 / 字段 | 真源 |
|---|---|---|
| 策略切换 | `sandbox/mode`（log-only，不进模型 transcript） | [session-mode.ts:52](../../../context/deepseek-harness/packages/sandbox/sandbox-policy/src/session-mode.ts) |
| 预设切换 | `permission/preset` | `known-event-types.ts:39` |
| 升级审批 | `approval/asked` + `approval/decided`（成对，turn 封闭） | [user-approval/src/index.ts:252](../../../context/deepseek-harness/packages/interaction/user-approval/src/index.ts) |
| 单次执行事实 | `tool/result` 内的 `sandbox: { mode, denied, enforcement?, runnerFailed? }` | [shell/src/types.ts:35](../../../context/deepseek-harness/packages/shell/shell/src/types.ts) |

**关键约束**：`approval/asked` + `approval/decided` **必须是 turn 封闭的成对事件**（[user-approval/src/index.ts:246](../../../context/deepseek-harness/packages/interaction/user-approval/src/index.ts) 明确拒绝「bare event between turns」）。任何后端要接入审批链，必须能在 turn 内同步拿到审批结果。

### 8A.2 合规性逐条判定

以 `ShellSandboxInfo` 的四个字段为合同基准，比较 DSH 原生后端与 NVX 能提供什么：

| 字段 | 原生后端（sandbox-local） | NVX 能提供什么 | 合规判定 |
|---|---|---|---|
| `mode` | 直接就是 `SandboxMode` | 需从 provision 参数反推（`--mount ro` → `read-only`） | ✅ **可满足**（适配器自行维护） |
| `denied` | stderr 方言匹配（`operation not permitted` 等） | **无对应概念**。写入被拒会表现为 workload 非零退出，但 `ExitCategory` 只有 `Exit/Timeout/OutputLimit/Signal/Failed/Cancelled` | ⚠️ **需构造**（见 8A.3） |
| `enforcement` | 后端自报 `full`/`partial` | **无字段**（源码搜 `enforcement` 只在测试里出现） | ⚠️ **需映射**（NVX 应为 `full`，但要能证明） |
| `runnerFailed` | `runnerFailureRules` 结构化匹配 | **有对应概念**：`provision`/`start` 失敗、`error[CODE]:` 错误码、`nvx-rs` 退出码 1/2/130 | ✅ **可满足**（且比原生更强：有稳定 error code） |

**净结论**：四个字段里**两个可直接满足，两个需要适配器构造**。这不是不可行，但必须明确「构造」不是「伪造」——每一处都要有可验证的映射规则。

### 8A.3 `denied` 的构造方案与风险

NVX 的 `EXEC` 协议**没有 typed denial 通道**。可选方案：

| 方案 | 做法 | 风险 |
|---|---|---|
| A. 退出码启发 | workload 非零退出时，用与原生相同的 stderr 方言（`EACCES`/`EPERM`/`EROFS` 文本）判断 | 与原生同一弱点（in-band，可被模仿）；但 NVX 内 workload 已在 VM 内，模仿只能骗自己 |
| B. guest agent 主动报告 | 修改 nvx 的 `ExitCategory`，加 `PolicyDenied` 变体 | 需**上游改造**；这是最干净的方案 |
| C. 预检 + 后验 | 先查 share 挂载模式，再对照退出码 | 只能覆盖文件写，覆盖不了 workload 自己 fork 的子进程 |

**建议**：短期用 A（与原生同等强度），中期推 B（上游加 typed denial）。**不要在文档上把 A 说成 B 的保证。**

### 8A.4 声明接入的架构可行性

DSH 对「新执行世界」有明确预留（[sandbox/README.md:167](../../../context/deepseek-harness/packages/sandbox/sandbox/README.md)）：

> containers, microVMs, and remote executors **replace whole capabilities instead of registering here**

以及 deferred 项（[sandbox-local/README.md:150](../../../context/deepseek-harness/packages/sandbox/sandbox-local/README.md)）：

> **Future: environment-coherent groups** — An environment-coherent capability group example, such as bash plus fs against one container, **remains undecided**.

**所以「持续稳定地声明接入」在架构上是成立的，但路径不是实现 `SandboxProvider`。**

> **v1 的实际路径是 MCP（§8C），不是下面这组 sibling provider。** 下面描述的是「若未来要把 VM 当作 shell/fs 替代」的形态，保留作为扩展评估。

```
ctx.shell     → NvxBashExecutor      (extends ShellExecutor)      ← 未来，非 v1
ctx.subprocess → NvxSubprocessRuntime (extends SubprocessRuntime)  ← 未来，非 v1
ctx.fs        → NvxFileSystem        (extends FileSystem)          ← 未来，非 v1
ctx.sandbox   → 不挂载（或只挂 facts-only provider）
ctx.mcp       → VM 内 MCP 服务器（streamable-http）                ← v1 走这条
```

**为什么不能实现 `SandboxProvider`**：那个抽象方法的签名是 `confine(argv, policy) → ConfinedArgv`——预设「命令在宿主上 spawn，只是被包一层」。NVX 的模型是「命令发给已在运行的 VM」，`argv` 根本不在宿主 spawn。强行实现会造成语义污染。

### 8A.5 审计完整性：会比原生更好还是更差？

| 维度 | 原生 | NVX + 适配器 |
|---|---|---|
| 策略切换审计 | ✅ `sandbox/mode` 事件 | ✅ 同（适配器只改 enforcement 实现，不改事件） |
| 审批链 | ✅ `approval/asked`+`decided` | ✅ 同 |
| 单次执行事实 | ⚠️ `denied` 靠 stderr 方言 | ⚠️ 同样靠方言，但 VM 边界让伪造无利可图 |
| **实际隔离强度** | ❌ 写入面之外无隔离 | ✅ VM 边界 |
| **可验证性** | 低（无隔离，审计只是记录） | **高**（审计记录对应真实边界） |

**核心判断：审计的「形式完整性」两者相当，但「审计的意义」NVX 远高一原生审计记录的是「我们拦住了一次写」，NVX 审计记录的是「我们拦住了一次跨 VM 边界」。后者的价值大得多。**

### 8A.6 合规性的三个未解风险

| 风险 | 说明 | 建议 |
|---|---|---|
| R1：`enforcement` 无法自证 | NVX 不报 enforcement 强度；适配器只能声明 `full` | 接受「声明 + 测试证明」，并在文档里写清这是声明而非后端自报 |
| R2：`denied` 可能漏报 | 方案 A 依赖 stderr；workload 若静默失败则不报 | 在适配器里对「非零退出且 stderr 无方言」的情形标 `denied: false, runnerFailed: false`，并记录 raw stderr 供人工审计 |
| R3：provision 时固定策略 | NVX 的网络/share 策略在 provision 时锁定；DSH 的升级是「同调用重试」 | 升级需 `deprovision → provision → start`（~290ms + 模板恢复）；这会破坏 `sandbox_permissions` 的「同调用」语义 |

**R3 是三者中最严重的**——它不是「精度」问题，是「契约形状」问题。DSH 的 `ESCALATION_TARGETS` 预设「同一次调用带 sandbox_permissions 重试一次」（[escalation.ts:209](../../../context/deepseek-harness/packages/sandbox/sandbox/src/escalation.ts)），而 NVX 的策略是启动时固定的。

**绕开方式**：不在 NVX 后端适配 `sandbox_permissions`，而是把升级建模为「换一个更宽的 VM」。这也意味着该后端不应广告 `sandbox_permissions` 字段（`escalationModes.length === 0` 分支已支持这种情形）。

### 8A.7 本节结论

| 问题 | 判定 |
|---|---|
| 能持续稳定地声明接入吗 | **能**，但要走 capability-group，不是 `SandboxProvider` |
| 能完成审计吗 | **能**，但 `denied` 与 `enforcement` 两个字段需要适配器构造，且必须写清构造依据 |
| 审计质量比原生好吗 | **形式相当，意义更好**（记录的是真实边界） |
| 最大合规风险 | **R3：策略启动时固定与「同调用重试」契约的冲突**——建议不广告 `sandbox_permissions` |
| 需要进一步 spike 吗 | **需要**，但业主选择先做文档分析；下一步应是一个「假 NVX provider 走完整审计链」的适配器原型（P1，见 §8） |

---

## 8B. v1 范围与责任边界

### 8B.1 v1 的两个包

| 平台 | 架构 | 运行时 | 来源 | 是否自建运行时 |
|---|---|---|---|---|
| **Windows** | x86_64 | NVX | 官方 `windows-whp.zip` | ❌ 否 |
| **macOS** | arm64 | Apple `container` | 官方 pkg / brew | ❌ 否 |

**Linux 不在 v1**：DSH 已有 bwrap/Landlock 原生沙箱，且 v1 的目标（隔离 `/imagine`）在 Linux 上可用现有沙箱 + 进程隔离先验证，无需引入 VM。

**arm NVX 永久不做**（不只是 v1 推迟）。理由见 8B.2。

### 8B.2 为什么 arm NVX 永久不做

| 目标组合 | 谁覆盖 | 需要 arm NVX |
|---|---|---|
| macOS arm64 | Apple container | ❌ |
| Windows arm64 | 业主已排除（绝大部分 Windows 在 x86） | ❌ |
| Linux arm64 | 不在 v1 | ❌ |

**arm NVX 在任何目标组合里都没有用武之地，而它恰好是责任最重的那条路**——需要为 `nvx-init`（PID 1）、`nvx-time`（time ABI）、`nvx-exit`（端口 `0x604` → PSCI）写 arm 实现。一旦由我们产出，运行时安全责任就在我们头上。

实测已确认这是纯代码工作而非配置（§8.6）：宿主侧 `nvx-rs` 8.5 秒、`openvmm` 1 分钟均可编出运行，**卡点全在 guest 用户态**。

**结论**：不做。

### 8B.3 两种「打包」——责任的分水岭

这是 v1 最重要的概念区分：

| 含义 | 做什么 | 我们承担 |
|---|---|---|
| **打包运行时** | 重编译 openvmm / kernel / guest 镜像，或为 arm 实现 guest 二进制 | **运行时本身的安全** |
| **打包插件** | 写 DSH 插件，下载 + 驱动官方运行时 | **只有适配器正确性** |

**v1 只做第二种。** 这是免责的关键——我们不重新编译任何运行时。

### 8B.4 我们产出什么 / 不产出什么

| 我们产出 | 我们不产出 |
|---|---|
| 宿主状态检测逻辑 | 运行时二进制（openvmm / container） |
| 构建技能正文（确定性配方） | guest 镜像 / kernel |
| DSH policy → 运行时参数的映射 | 第三方工具本体（grok / codex / blender） |
| 审计链四字段的适配与声明 | 上游工具的安全状态 |

**残留责任**（无法转移，只能流程管理）：

| 责任 | 说明 |
|---|---|
| **版本 pin 的选择** | 我们选了哪个 NVX dev tag / 哪个 container 版本 |
| **policy 映射的正确性** | 若把 `read-only` 映射成实际可写的配置，那是我们的 bug |
| **审计声明的诚实性** | 若声明 `enforcement: full` 而实际不是，那是我们的声明 |
| **工具安装脚本** | 脚本由我们维护，必须 pin 版本 + 校验 SHA256 + 失败关闭 |

### 8B.5 供应链风险：两个运行时的成熟度差异巨大

| 项目 | 发布情况 | 风险 |
|---|---|---|
| **Apple container** | 8 个版本，**全部 `prerelease=False`**，semver（1.2.2 → 1.7.1），约 2–3 周一个 | 低 |
| **NVX** | 15 个版本，**全部 `prerelease=True`**，均为 `v0.1.0-dev.<commit>` | **中高** |

NVX 的 crate 文档明写：

> published on crates.io as a **preview**, whose API **can change in any release**

**所以「用官方包免责」在 Windows 侧是不完整的**：官方包存在，但它是 dev 预发布。我们把 v1 押在一个 0.1.0-dev 上。

**缓解措施**：

| 措施 | 做法 |
|---|---|
| 精确 pin | 锁死 `v0.1.0-dev.fc59c9065ceb`，不跟 latest |
| 校验 | 包内有 `SHA256SUMS` 与 `provenance/*.json`，安装时验证 |
| 记录 | 插件内写明「使用 NVX dev 预发布，pin 于 <tag>，SHA256 为 <hash>」 |
| 跟踪 | 订阅 release，0.1.0 稳定版出现即升级 |
| 兜底 | vendored 副本，防上游删除 tag |

**vendoring 取舍**：塞进插件 → 包大但可追溯；安装时下载 → 包小但依赖上游。**建议 vendoring + SHA256**，因为「可追溯」本身是免责的一部分。

### 8B.6 需业主拍板：升级语义

DSH 的 `sandbox_permissions` 假设「同一次调用带更宽模式重试一次」。两个运行时的策略都在**创建时固定**，无法映射。

| 选项 | 含义 | 代价 |
|---|---|---|
| **A. 接受「一次配置定终身」** | 不广告 `sandbox_permissions`；被拒即终态，模型需换策略而非申请 | 失去升级交互 |
| **B. 在 nano-sandbox 之上做「换 VM 重试」** | 把升级建模为「销毁当前 VM，以更宽策略重建」 | ~290ms 冷启动或模板恢复时间 |

**这不是可行性问题，是产品语义决策。**

### 8B.7 三档 policy 映射

| DSH `SandboxMode` | NVX（Windows） | Apple container（macOS） |
|---|---|---|
| `read-only` | `--mount <ws>,ro` + `--upper ram` + `--network-egress deny` | `--read-only` + `--cap-drop ALL` + `--mount …,readonly` |
| `workspace-write` | `--mount <ws>,rw` + `--mount-write <ws>` | `--cap-drop ALL` + `--mount source=<ws>,target=<ws>` |
| `danger-full-access` | 绕过，宿主直跑 | 绕过，宿主直跑 |

两侧原语一一对应：capability 集合、只读挂载、网络策略、内存/CPU 上限、UID/GID。**同一套降级逻辑可驱动两者。**

### 8B.8 审计链四字段

| `ShellSandboxInfo` 字段 | NVX | Apple container | 同构 |
|---|---|---|---|
| `mode` | 适配器维护 | 适配器维护 | ✅ |
| `denied` | stderr 方言 | stderr 方言 | ✅ **形状相同** |
| `enforcement` | 声明 `full` | 声明 `full` | ✅ **形状相同** |
| `runnerFailed` | 稳定 error code | 退出码 + 结构化错误 | ✅ |

**两个需构造的字段在两个后端里形状完全一致**，所以**一套适配器模式覆盖两个包**。

### 8B.9 对外措辞

> nano-sandbox v1 提供 2 个包：`nvx-windows`（x86_64）与 `apple-container-macos`（arm64），用于隔离 `/imagine` 等第三方 CLI 工具。两者隔离模型同构（每负载一 VM），可在 DSH `SandboxMode` 三档下统一映射；审计链四字段中 `mode`/`runnerFailed` 直接满足，`denied`/`enforcement` 由适配器构造并登记依据。**不打包运行时**，只提供确定性构建配方。**不支持 `sandbox_permissions` 升级**（策略创建时固定）。

---

## 8C. v1 架构：MCP 承载的隔离执行环境

### 8C.1 架构总览

```
DSH 宿主（Windows / macOS）
  │
  ├─ nano-sandbox 插件
  │    ├─ 宿主检测：NVX 在不在？Apple container 在不在？
  │    ├─ 注册构建技能（确定性配方）
  │    └─ policy 映射 + 审计适配
  │
  └─ ctx.mcp（streamable-http 传输，url 指向 VM）
       │
       ▼  HTTP
  ┌─────────────────────────────────────────┐
  │ 独立执行环境（VM）                        │
  │  ├─ 自建 MCP 服务器（常驻）               │
  │  ├─ grok CLI / codex CLI（注入）          │
  │  ├─ 凭据（仅存于 VM 内）                  │
  │  └─ 与宿主完全不同的 env                  │
  └─────────────────────────────────────────┘
```

**关键点：DSH 不通过 `ctx.shell` 调用 VM，而是通过 MCP 协议。** 这让 v1 绕开了 §7.5 的前三条冲突。

### 8C.2 为什么 MCP 而不是 shell 替换

DSH 的 MCP 客户端支持两种传输（[mcp-client/src/transport.ts](../../../context/deepseek-harness/packages/mcp/mcp-client/src/transport.ts)）：

| 传输 | 行为 | 对 v1 的意义 |
|---|---|---|
| `stdio` | **由 MCP SDK 自己 spawn 子进程**，不受 `ctx.sandbox` 约束 | ❌ 不适用——这正是要避免的「宿主执行」 |
| **`streamable-http`** | 只连 `url`，**不 spawn 任何本地进程** | ✅ **v1 用这个** |

`streamable-http` 的配置只有 `url` 字段（[mcp-client/src/index.ts:110-118](../../../context/deepseek-harness/packages/mcp/mcp-client/src/index.ts)）。

**这带来三个结构性优势**：

| 优势 | 说明 |
|---|---|
| **绕开未受控 spawn** | 现有 MCP `stdio` 服务器是裸 spawn（前文 §1.6 已登记），HTTP 传输没有这个问题 |
| **绕开 shell 语义冲突** | 不需要 stdin、不需要 1 MiB 输出、不需要持久 shell——MCP 是自己的协议 |
| **远程执行天然成立** | 「换一台机器」= 换一个 `url` |

### 8C.3 v1 必须兑现的两个能力

#### 能力 1：远程执行

**VM 不必在宿主上。** 因为接入点是 `url`，所以：

| 部署 | 做法 |
|---|---|
| 本地 | `url = http://127.0.0.1:<port>/mcp` |
| 远端 | `url = http://<另一台机器>:<port>/mcp` |
| 隧道 | `url` 走 SSH 端口转发 |

**这是 NVX 与 Apple container 都能满足的**——两者的 VM 都可以跑在别处。

#### 能力 2：环境隔离

**宿主与沙箱使用完全不同的 env。** 具体含义：

| 项 | 宿主 | 沙箱 |
|---|---|---|
| grok / codex 二进制 | 装没装都无影响 | 由配方注入 |
| 凭据 | 不复制到工作区 | 只存于 VM 内 |
| 网络 | 宿主网络 | VM 的 egress 策略 |
| 文件系统 | 宿主全盘 | 只有声明的 share |

**这直接消解了安全审查的两条 HIGH**：

| 审查编号 | 现状 | v1 后 |
|---|---|---|
| `hunter-e:grok-creds-workspace-copy` | 凭据复制进工作区，可提交/同步 | 凭据不出 VM，工作区无副本 |
| `hunter-e:imagine-template-shell-injection` | 已修复（无占位符模板） | 保持，且执行面移出宿主 |

### 8C.4 技能引导模式：继承 `/imagine` 的边界纪律

v1 的构建由**技能引导 agent 执行**，不是插件自己打包。这个模式在本仓库已有成熟先例——`/imagine` 本身。

其边界纪律（[lib/host-media.js:9-30](../../../dsh-nano-model-selector/lib/host-media.js) 原文注释）：

> The template below therefore carries **NO placeholders**: untrusted text never becomes shell syntax again.
> - prompt and out-name travel as **DATA** in `imagine/.prompt.txt` / `imagine/.out.txt` and are read back with `$(cat)`/`$(tr)` — file bytes are never re-parsed as shell;
> - the out name is validated **twice**: here and inside the template by a `grep -Eq` gate that exits 64 BEFORE the CLI runs;
> - an injection attempt is a **boundary violation, never silently sanitized**.

**sandbox 构建技能必须继承这四条**：

| 纪律 | 在 sandbox 技能中的形式 |
|---|---|
| 无占位符 | 工具清单、版本号硬编码在技能正文，或经文件传递并校验 |
| 参数当数据 | 版本/路径走文件，不做 shell 拼接 |
| 双重校验 | 宿主侧校验 + 技能内 `grep -Eq` 门禁，失败 exit 64 |
| 失败关闭 | 检测不到运行时 → 拒绝，**不降级到无约束** |

### 8C.5 构建阶段不能无约束（bootstrap 悖论）

**建沙箱必须在沙箱外执行**——你无法从沙箱内部创建沙箱。这是 v1 唯一一个模型拥有宿主权限的时刻。

| 要求 | 说明 |
|---|---|
| 构建跑在**现有**沙箱里 | Linux 用 bwrap、macOS 用 Seatbelt，**不是 `danger-full-access`** |
| Windows 是弱点 | 只有 pwsh-sandbox（`partial`），构建阶段约束较弱——**必须登记** |
| 技能必须声明 | 「本步骤在宿主沙箱内执行，非无约束」 |

**这一条不写进技能，v1 就有一个未登记的提权窗口。**

### 8C.6 工具安装脚本契约

「按我们自己的脚本完成包内组件构建」——**这个脚本是残留责任点**，必须满足：

| 要求 | 反例 |
|---|---|
| 锁精确版本 | ❌ `curl -L https://x/latest` |
| 校验 SHA256 | ❌ 直接 `curl \| sh` |
| 失败关闭 | ❌ 校验失败仍继续 |
| 记录安装内容 | ❌ 静默安装 |

**否则「我们不打包」只是把责任从二进制挪到了脚本。**

### 8C.7 与现有 `/imagine` 的迁移路径

| 阶段 | 状态 |
|---|---|
| 现状 | `/imagine` 在宿主执行 grok/codex，凭据复制进工作区（HIGH） |
| 步骤 1 | 保持现有技能，先把凭据复制改为 VM 内持有 |
| 步骤 2 | VM 内起 MCP 服务器，暴露 `imagine` 工具 |
| 步骤 3 | DSH 通过 `streamable-http` 接入，宿主不再执行 CLI |
| 步骤 4 | 删除宿主侧的凭据复制逻辑 |

**迁移可以分步，不必一次切换。**

### 8C.8 构建能力的不对称（必须知道）

| 运行时 | 有构建命令吗 | 技能引导构建的难度 |
|---|---|---|
| **Apple container** | ✅ `container build`（支持 Dockerfile、`--arch` 多平台） | **低**——标准 `docker build` 流程 |
| **NVX** | ❌ 无。只有 `artifacts/download/egress/run/sandbox` | **高** |

NVX 要加自定义工具，只有三条路：

| 方式 | 代价 |
|---|---|
| 运行时 `apk add` | 临时，重启即失；需 `--net` |
| `--mount` 挂宿主工具目录 | 简单，但工具在宿主上（隔离边界外） |
| `nvx.py build-distro-layer` / `build-initramfs` | **需 NVX 源码树 + 构建工具链** → 又把我们拉回「构建运行时」的责任区 |

**建议**：Windows v1 用第二条（`--mount` 只读挂载工具目录），避免任何镜像构建。代价是工具在宿主可见，但换来零构建责任。

---

## 9. Verdict

### 9.1 从 `/imagine` 看：需要什么、得到了什么

v1 的起点是一个具体的、已被安全审查确认的问题：

| 需求 | DSH 原生沙箱 | v1（VM + MCP） |
|---|---|---|
| 凭据不出宿主 | ❌ `~/.grok` 被复制进工作区（HIGH） | ✅ 凭据只存 VM 内 |
| 第三方 CLI 不在宿主执行 | ❌ 以宿主用户身份跑 | ✅ 在 VM 内跑 |
| 网络可控 | ❌ 全开 | ✅ egress 策略 |
| 宿主文件不可读 | ❌ 全盘可读 | ✅ 只有 share 可见 |
| 与宿主 env 隔离 | ❌ 共享宿主 env | ✅ 完全不同 env |
| 可远程 | ❌ | ✅ 换 `url` 即可 |

**结论：v1 的架构恰好覆盖了原生沙箱漏掉的全部四项（凭据、执行位置、网络、读取）。** 这不是巧合——VM 边界本来就覆盖这些，而原生沙箱的词汇只管文件写入。

### 9.2 为什么是「VM + MCP」而不是「VM + shell」

这是 v1 最重要的架构选择，值得单独说明：

| 路径 | 需要解决 | 结论 |
|---|---|---|
| VM + `ctx.shell` 替换 | 无 stdin、1 MiB 输出、无持久 shell、升级语义（§7.5） | 四个硬冲突，工程量大 |
| **VM + MCP（streamable-http）** | 只需一个 `url` | **绕开前三条冲突** |

因为 DSH 的 MCP 客户端支持 `streamable-http`（只连 URL，不 spawn 本地进程），**VM 内的 MCP 服务器天然可被接入，且不触碰 DSH 的 shell/fs 契约**。

**这个选择让 v1 从「替换三个 seam」缩小到「新增一个工具入口 + 一个运行时管理器」。**

### 9.3 两个包的价值判断

| 包 | 价值 | 风险 |
|---|---|---|
| `apple-container-macos` | **高**——原生 VM 隔离、稳定 semver、`exec` 有 stdin/TTY/detach | 低（我们只驱动官方稳定版） |
| `nvx-windows` | **高**——Windows 上首次有 Linux 环境 | **中高**（NVX 无稳定版，全是 dev 预发布） |

**两者风险等级不同，不应混为一谈。** macOS 侧我们真的只是驱动 Apple 的稳定版；Windows 侧我们驱动的是 Microsoft 的 dev 预发布。

### 9.4 责任边界的最终表述

| 我们负责 | 我们不负责 |
|---|---|
| 宿主状态检测 | 运行时二进制 |
| 确定性构建配方 | guest 镜像 / kernel |
| policy 映射正确性 | 第三方工具本体 |
| 审计声明诚实性 | 上游工具的安全状态 |
| 工具安装脚本的 pin 与校验 | — |

**残留责任**（无法转移）：版本 pin 的选择、映射的正确性、声明的诚实性、脚本的校验。这四项是流程问题，不是架构问题。

### 9.5 总体裁决

| 问题 | 裁决 |
|---|---|
| v1 需要 sandbox 吗 | **需要**——`/imagine` 的两条 HIGH 无法用原生沙箱解决 |
| 用 VM 还是 native sandbox | **VM**——原生沙箱只管文件写入，漏掉凭据/网络/读取 |
| 用 MCP 还是 shell | **MCP**——绕开三个硬冲突，且远程执行天然成立 |
| 两个包够吗 | **够**——Windows x86_64 + macOS arm64 覆盖 v1 全部目标 |
| Linux 呢 | **不在 v1**——已有 bwrap，且 v1 目标可在其上先验证 |
| arm NVX 呢 | **永久不做**——无用例 + 责任最重 |
| 要自建运行时吗 | **不要**——只提供配方，不产出二进制 |
| 能审计吗 | **能**——四字段中两个直接满足、两个同构可共用适配器 |
| 最大风险 | **NVX 无稳定版**（Windows 侧）+ **构建阶段约束较弱**（Windows 只有 pwsh-sandbox） |
| 需业主拍板 | **升级语义**（§8B.6） |

### 9.6 v1 的四个待办

| # | 事项 | 阻塞什么 |
|---|---|---|
| 1 | 拍板升级语义（A 一次定终身 / B 换 VM 重试） | `sandbox_permissions` 是否出现 |
| 2 | 授权 macOS 安装 Apple container（需管理员密码 + 系统服务） | macOS 侧从「规格确认」到「实测确认」 |
| 3 | 提供 Windows x86_64 主机 | Windows 侧从「文档确认」到「实测确认」 |
| 4 | 确定 MCP 服务器的工具面（imagine 之外还有哪些） | 配方与脚本的范围 |

### 9.7 一句话

**nano-sandbox v1 不是「给 DSH 换个更强的沙箱」，而是「把 `/imagine` 这类第三方 CLI 从宿主搬到受控 VM 里，用 MCP 重新接线」。** 它用 2 个薄适配器 + 1 套确定性配方，换掉两条 HIGH 级安全问题，且不承担运行时打包责任。

---

## 附录 A：复现方法（内联）

本文档不附带任何脚件。下面是 §3 全部实测的完整复现方法：只**读取**已安装的 dsh 包以导入其真实导出（`writableRoots`、`canonicalPath`、`classifyRunnerFailure`、`matchesSignature`、`sandboxDenialMarker`、`escalationHintMarker`），再直接调用 `/usr/bin/sandbox-exec`。不启动、不重启、不修改任何 dsh 实例。

### A.1 前置：必须用非符号链接的工作区

macOS 的 `/tmp` 是 `/private/tmp` 的符号链接。用未 canonical 的 `/tmp` 构造 profile 时 `(subpath "/tmp")` 永不匹配，`workspace-write` 会完全失效（见 §3.9）。

```bash
mkdir -p ~/nvx-eval/ws ~/nvx-eval/outside
echo 'host-secret-value' > ~/nvx-eval/outside/credential.txt
```

### A.2 逐字复现 `seatbeltProfileArgs()`

与 [sandbox-local/src/profiles.ts](../../../context/deepseek-harness/packages/sandbox/sandbox-local/src/profiles.ts) 第 53–58 行逐字一致（已比对安装版 `lib/index.js` 源码确认）。

```js
import { execFileSync } from 'node:child_process';

const base = execSync('npm root -g', { encoding: 'utf8' }).trim()
  + '/@deepseek-ai/dsh/node_modules/@deepseek-ai/';
const sb = await import(base + 'dsh-sandbox/lib/index.js');

const WS  = `${process.env.HOME}/nvx-eval/ws`;
const OUT = `${process.env.HOME}/nvx-eval/outside`;
const q = (p) => `"${p.replaceAll('\\\\', '\\\\\\\\').replaceAll('"', '\\\\"')}"`;

const argvFor = (mode) => {
  const forms = ['(version 1)', '(allow default)', '(deny file-write*)',
    `(allow file-write* (literal ${q('/dev/null')}))`];
  const roots = sb.writableRoots({ mode, workspaceRoot: WS });   // ← 真实推导
  if (roots.length > 0) {
    forms.push(`(allow file-write* ${roots.map((r) => `(subpath ${q(r)})`).join(' ')})`);
  }
  return ['/usr/bin/sandbox-exec', '-p', forms.join(' '), '--'];
};

const run = (argv, cmd) => {
  try {
    return { rc: 0, out: execFileSync(argv[0], [...argv.slice(1), 'sh', '-c', cmd],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() };
  } catch (e) {
    return { rc: e.status ?? '?', out: String(e.stderr ?? '').trim().split('\n')[0] };
  }
};

const CASES = [
  ['write WS',            `echo x > '${WS}/probe.txt'`],
  ['write OUTSIDE',       `echo x > '${OUT}/pwned.txt'`],
  ['write ~/.ssh',        'echo x > "$HOME/.ssh/pwned"'],
  ['write /dev/null',     'echo x > /dev/null'],
  ['READ ~/.ssh',         'ls "$HOME/.ssh" | head -1'],
  ['READ ~/.dsh',         'ls "$HOME/.dsh" | head -1'],
  ['READ outside secret', `cat '${OUT}/credential.txt'`],
  ['READ /etc/passwd',    'head -1 /etc/passwd'],
  ['network curl',        'curl -s -m 5 -o /dev/null -w code:%{http_code} https://example.com'],
  ['ps ax',               'ps ax 2>&1 | wc -l'],
  ['chmod OUTSIDE',       `chmod 600 '${OUT}/credential.txt'`],
  ['rename OUTSIDE',      `mv '${OUT}/credential.txt' '${OUT}/moved.txt'`],
  ['hardlink OUTSIDE',    `ln '${OUT}/credential.txt' '${WS}/hard.txt'`],
  ['symlink escape',      `ln -sfn '${OUT}' '${WS}/link'; echo y > '${WS}/link/e.txt'`],
  ['mknod char dev',      `mknod '${WS}/dev' c 1 3`],
];

for (const mode of ['read-only', 'workspace-write']) {
  const argv = argvFor(mode);
  console.log(`\n##### ${mode} #####`);
  console.log('profile:', argv[2]);
  for (const [label, cmd] of CASES) {
    const r = run(argv, cmd);
    console.log(`  ${label.padEnd(22)} rc=${String(r.rc).padEnd(3)} ${r.out.slice(0, 80)}`);
  }
}
```

### A.3 方言与升级措辞（§3.7、§2.5）

```js
const RULE   = { fatalSignatures: ['sandbox-exec: '] };
const DENIAL = ['operation not permitted'];

sb.classifyRunnerFailure(1, 'sh: /x: Operation not permitted', [RULE]);  // undefined
sb.matchesSignature(1, 'sh: /x: Operation not permitted', DENIAL);       // true
sb.classifyRunnerFailure(7, 'sandbox-exec: boom', [RULE]);               // { detail } ← 误判

console.log(sb.sandboxDenialMarker('workspace-write'));
console.log(sb.escalationHintMarker('command'));
console.log(JSON.stringify(sb.WIDER_MODES));
```

### A.4 可写根与额外根校验（§2.4、§3.8）

```js
sb.writableRoots({ mode: 'workspace-write', workspaceRoot: WS });
// -> [WS, '/private/tmp', '/private/var/folders/.../T']

sb.writableRoots({ mode: 'workspace-write', workspaceRoot: WS,
                   additionalWritableRoots: ['relative/path'] });   // SANDBOX_INVALID_ROOT
sb.canonicalPath('/tmp');     // '/private/tmp'
sb.canonicalPath('/nope/x');  // '/nope/x'  ← 不发明回退
```

### A.5 `/tmp` 跨会话泄漏与进程信号（§3.5、§3.6）

```js
// 会话 A 的 profile 能否改写会话 B 的工作区？
const other = sb.canonicalPath('/tmp') + '/other-session-ws';
fs.mkdirSync(other, { recursive: true });
fs.writeFileSync(other + '/private.txt', 'other-session-secret');
run(argvFor('workspace-write'), `echo compromised > '${other}/private.txt'`);
fs.readFileSync(other + '/private.txt', 'utf8');   // 'compromised'  ← 泄漏

// 能否 signal 同用户宿主进程？
const victim = spawn('sleep', ['600']);
run(argvFor('workspace-write'), `kill -TERM ${victim.pid}`);   // 成功，进程死去
```

### A.6 清理

```bash
rm -rf ~/nvx-eval /private/tmp/other-session-ws
```

## 附录 B：本机环境快照

```
macOS 26.5.2 (25F84)
Darwin 25.5.0 RELEASE_ARM64_T6031 arm64
/usr/bin/sandbox-exec   存在
bwrap                    不存在
node v24.22.2
dsh (运行中)              0.2.2-rc.1
dsh (checkout)           0.2.2-rc.2
nvx VERSION              0.1.0
nvx openvmm 子模块        未初始化
Virtualization.framework 存在
vmnet.framework          存在
Swift                    6.2.3 (arm64-apple-macosx26.0)
container (Apple)        未安装（brew 有 1.7.1；安装被网络/密码阻断）
```

远端授权主机（仅本次用于 NVX 实测，已清理）：

```
frd1    Linux x86_64   kernel 7.0.0-34-generic    /dev/kvm 可读写   31 GB RAM
spark   Linux aarch64  kernel 6.17.0-1021-nvidia  /dev/kvm 可读写  121 GB RAM
```

## 附录 C：未纳入本评估的范围

### C.1 平台与架构

| 项 | 状态 |
|---|---|
| Linux x86_64 | ✅ 已实测（§5.5） |
| Linux aarch64 | ✅ 已分层实测（§8.6） |
| Windows x86_64 | ❌ 未实测（无 Windows 主机）；文档与源码已确认 |
| **Windows aarch64** | **移出范围**（业主：绝大部分 Windows 在 x86） |
| **macOS x86_64 / Intel Mac** | **移出范围**（业主：macOS 只支持 arm） |
| macOS arm64 | ⚠️ 规格完整 + 本机兼容性已确认，**未实跑**（§5.9.8） |

### C.2 运行时与构建

- 未从源码构建 NVX（openvmm 子模块未初始化）；实测用官方预构建包
- 未在本机运行 `nvx-rs`（macOS 不支持）；远端 x86_64 已运行
- 未实测 NVX 的 Windows WHP / ACL 表现（仅源码阅读：3874 行平台层）
- 未实测 Apple container（安装被 sudo 密码与网络阻断）

### C.3 架构与集成

- **未实现 MCP 服务器**（§8C 是架构设计，非实现）
- 未验证 `streamable-http` 在 VM 内的实际连通性
- 未评估远程执行的实际延迟与带宽
- 未评估构建阶段（bootstrap）在 Windows `pwsh-sandbox` 下的实际约束强度

### C.4 环境边界

- 未修改或重启任何 dsh 实例（`dsh.local` / `dsh-dev` / `dsh-desktop` 全程只读）
- 未评估 LiveShare、CUA、browser-use 等实验性插件的沙箱交互
- 未评估 `/imagine` 之外的第三方 CLI（blender 等）的可行性

---

## 附录 D：文档修订记录

| 日期 | 变更 |
|---|---|
| 2026-11-12（初版） | DSH 原生沙箱边界实测 + NVX 三平台评估 |
| 2026-11-12（arm 实测） | §8.6 分层实证；修正「上游未就绪」为「guest 用户态写死 x86_64」 |
| 2026-11-12（Apple container） | §5.9 新增；macOS 结论从「不可行」改为「有更优解」 |
| 2026-11-12（v1 收尾） | **重构为 v1 设计文档**：§0 以 `/imagine` 隔离立论；新增 §8B（范围与责任边界）、§8C（MCP 架构）；§7 加适用范围说明；§8 测试计划改为 MCP 主路径；§9 重写为 `/imagine` 视角；arm NVX 定为永久不做 |
