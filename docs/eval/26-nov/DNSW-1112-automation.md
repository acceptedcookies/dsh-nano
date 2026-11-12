# DNSW-1112 · shared-workspace 自动化测试与开发 ledger

> 本文件是本次自动化测试与开发的**唯一跟踪账本**，随分支 `dasw-1112-automation` 提交。
> 所有测试结论、发现的问题、代码升级、证据路径都登记在这里；正文里的路径相对于本 worktree。
> 工作区：仓库内 git-ignored 目录 `.worktree/DASW-1112-automation`，分支 `dasw-1112-automation`，基线 `d4eefe6`。

## 0. 目标与红线

- 目标插件：`dsh-nano-shared-workspace`（本 worktree 内源码）。
- 测试节点：`dsh-dev.local`（ego-browser 主战场）、桌面版（HTTP/其他自动化）；必要时新增 `dsh-test.local` 作为第二个 web 客户端。
- **禁止直接操作 `dsh.local`**：它是当前对话的工作区，重启会干扰本会话。不重启、不改它的 profile/凭据/插件副本。
- 版本一致：所有测试端 dsh 运行时必须同为 `0.2.2-rc.1`；插件版本同为 `0.2.0`；构建产物哈希登记在 §1.3。
- 上海节点：`.env.s3` 为唯一密钥真源，新增/轮换的密钥必须回写仓库根 `.env.s3`（worktree 内副本同步）。
- 代码改动只在本分支，不污染 `main`；完成后由业主合并。

## 1. 环境基线（Round 1 实测）

### 1.1 三实例

| 实例 | 入口 / 端口 | DSH_HOME | 活动 profile | 状态 |
|---|---|---|---|---|
| 日常（禁操作） | `https://dsh.local/` 3081（broker 3082） | `~/.dsh` | `web` | 进程 2026-11-12 08:41 启动；`/settings` = `dsh-local-workspace` |
| 开发（主测试） | `https://dsh-dev.local/` 3083（broker 3084） | `~/.dsh-dev` | `web` | 进程 08:30 启动；可 `dsh-dev restart` / `launchctl kickstart -k …dev.web` |
| 桌面版（第二客户端候选） | `/Applications/DeepSeek Harness.app`，host `127.0.0.1:54585` | `~/.dsh-desktop` | `desktop` | 进程 08:40 启动；NSW 路由当前 404（缺必填配置，见 F-01） |

三者共用已安装 `dsh@0.2.2-rc.1` 与同一个 Caddy；其余（home、profile、插件副本、凭据、session、cookie、IndexedDB）完全隔离。
`~/.dsh/profiles/desktop`、`~/.dsh-desktop/profiles/web` 是非活动克隆 profile，不是额外实例。

### 1.2 S3 测试资产（2026-11-12 新建，密钥存 `.env.s3`）

| 逻辑名 | 桶 | 用途 | 账户 |
|---|---|---|---|
| `S3_DASWA_*` | `dasw-1112-shared` | 客户端 A（dsh-dev）多用户协同主桶 | svcacct `dasw1112a…`，scoped policy `dasw-1112` |
| `S3_DASWB_*` | `dasw-1112-shared` | 客户端 B（第二实例 / 直接 S3 模拟）同桶 | svcacct `dasw1112b…`，同 policy |
| `S3_DASWS_*` | `dasw-1112-sandbox` | 破坏性用例：重置桶、轮换密钥、大文件、越界 | 与 A 同密钥 |
| `S3_DEV_*` / `S3_PROD_*` | `dsh-dev-local-workspace` / `dsh-local-workspace` | 原有，**不动** | 原有 |

- 端点统一 `https://nano-shared-workspace.saobao.com`，region `shv1`，path-style（nginx 单 vhost → minio 127.0.0.1:9000）。
- 通过已装 SigV4 客户端验证：`scripts/eval/lib.mjs` + 内联探针，A/B/S 三桶 PUT→GET→DEL 全 PASS；A 密钥写 prod 桶被 403 `AccessDenied`/`InvalidAccessKeyId` PASS。
- 失败教训：`mc admin user svcacct add --secret-key` 长度限制 8–40；`openssl rand -hex 24`（48 字符）被拒，改为 `-hex 16`（32 字符）成功。

### 1.3 构建与部署链

- 源码真源：本 worktree `dsh-nano-shared-workspace/src/`。
- 构建：`npm run build`（esbuild 0.25.0）→ `lib/client.js` + `lib/host.js`。
- 部署到 dev：`cp lib/{client.js,host.js} ~/.dsh-dev/plugins/dsh-nano-shared-workspace/lib/` → `launchctl kickstart -k gui/$(id -u)/ai.deepseek.dsh.dev.web` → 强制刷新 `https://dsh-dev.local/`。
- **不要用 `dsh-dev restart` 部署本分支代码**：它的 `sync_plugins()` 硬编码 `$HOME/Documents/dsh-plugins`（main checkout），会把 worktree 构建覆盖掉。
- 基线哈希（worktree HEAD，Round 1 初）：`lib/host.js` / `lib/client.js` 见 §6 轮次日志首条记录。

## 2. 测试矩阵

状态：`⬜` 未跑 / `✅` 通过 / `❌` 发现问题 / `🔧` 已修复待复测 / `⏸` 阻塞。

### A. 设置与绑定（T-Axx）

| ID | 场景 | 状态 |
|---|---|---|
| T-A01 | 两阶段设置：绑定前只有第 1 步，探测失败不前进 | ⬜ |
| T-A02 | 真实探测成功 → 保存 → 自动进入第 2 步 | ⬜ |
| T-A03 | 已配置时重复打开设置：不重复打 S3（60s 缓存） | ⬜ |
| T-A04 | 改密钥后缓存立即可见；清凭据后回到未绑定 | ⬜ |
| T-A05 | 错误密钥 / 缺字段 / 桶不存在 / 端点错 的 UI 表达 | ⬜ |
| T-A06 | 设置弹窗 Esc / 取消 / 关闭 的幂等与焦点恢复 | ⬜ |

### B. 工作区生命周期（T-Bxx）

| ID | 场景 | 状态 |
|---|---|---|
| T-B01 | 创建：名称、空名、超长名、特殊字符、同名重复 | ⬜ |
| T-B02 | 创建幂等：连点两次「创建」/ 网络重试 | ⬜ |
| T-B03 | 删除：UI 是否存在删除入口、删除后远端是否残留 | ⬜ |
| T-B04 | 加入：第二用户加入同一 workspace、未加入会话提示 | ⬜ |
| T-B05 | 空状态 / 加载态 / 绑定态 三种侧栏文案与图标 | ⬜ |
| T-B06 | 创建竞态：两个客户端同时创建同名 workspace | ⬜ |

### C. 会话与协同（T-Cxx）

| ID | 场景 | 状态 |
|---|---|---|
| T-C01 | 单写者租约：A 持有，B 打开只读（cool-off） | ⬜ |
| T-C02 | 租约过期回收；心跳续租；过期边界 | ⬜ |
| T-C03 | 双写竞态：A/B 同时 claim 同一会话 | ⬜ |
| T-C04 | 多用户同步：A 写内容 → B 拉到同一代 | ⬜ |
| T-C05 | 文件树冲突消融：同文件双改 → `<<<<<<< local` | ⬜ |
| T-C06 | 文件上传：大文件 / 二进制 / 超限 / 恶意路径 | ⬜ |
| T-C07 | 负向：伪造 workspaceId/sessionId、越权、脏 JSON | ⬜ |

### D. 视觉与交互（T-Dxx，局部截图）

| ID | 场景 | 状态 |
|---|---|---|
| T-D01 | 侧栏 section：折叠/展开、图标列对齐、loading 旋转 | ⬜ |
| T-D02 | 设置两阶段弹窗、探测中/失败态、开关 | ⬜ |
| T-D03 | 新建工作区对话框：目录浏览、新建文件夹、错误行 | ⬜ |
| T-D04 | 会话行：选中高亮、置顶/归档/重命名、hover 操作列 | ⬜ |
| T-D05 | 错误表达：notice 弹窗标题与正文是否矛盾 | ⬜ |
| T-D06 | 窄侧栏 / 深色浅色 / 长名称截断 | ⬜ |

### E. 性能与监控（T-Exx）

| ID | 场景 | 状态 |
|---|---|---|
| T-E01 | `/settings` 冷/热耗时、缓存 TTL 边界 | ⬜ |
| T-E02 | 大目录 / 大量会话下列表渲染与滚动 | ⬜ |
| T-E03 | perf-review  instrumentation 是否可用（`?perf-review=1`） | ⬜ |
| T-E04 | 后台同步 30s / 心跳 25s 的重复与节流 | ⬜ |

## 3. 发现登记

| ID | 严重度 | 场景 | 现象 | 裁定 | 状态 |
|---|---|---|---|---|---|
| F-01 | 中 | 桌面版 NSW 激活 | `~/.dsh-desktop/profiles/desktop/cordis.patch.yml` 无 `nano-shared-workspace` 的 `endpoint/region/bucket` 覆盖行，凭据无 `DSH_NSW_IDENTITY`；host 上 `/nano-shared-workspace/settings` 返回 404（对照 notepad `/nano-notepad/read` 返回 401 已注册）。`Config` 三项必填、缺失即加载失败 | 若桌面版作为第二客户端，需补配置 + 凭据 + 重启 app；或改用 `dsh-test.local` | 待裁定 |

## 4. 升级记录（U-xx）

| ID | 关联 | 改动 | 提交 | 复测 |
|---|---|---|---|---|
| — | — | Round 1 尚无代码升级 | — | — |

## 5. 证据索引

| 路径 | 内容 |
|---|---|
| `scripts/eval/lib.mjs` | 测试脚手架：`.env.s3` 解析、已装 SigV4 客户端、往返探针、断言 |
| `docs/eval/26-nov/screenshots/` | ego-browser 局部截图（待生成） |
| `docs/eval/26-nov/logs/` | 关键命令输出（待生成） |

## 6. 轮次日志

### Round 1（2026-11-12 09:16 起）

- 建立 git worktree `.worktree/DASW-1112-automation` + 分支 `dasw-1112-automation`（基线 `d4eefe6`），不污染 `main`。
- 读取 `.env.s3`，确认 Shanghai 端点/region/bucket 与现网 dev/prod 隔离策略。
- shv1 上 `mc` 新建 `dasw-1112-shared`、`dasw-1112-sandbox`，scoped policy `dasw-1112`，两个 svcacct；密钥回写 worktree 与仓库根 `.env.s3`（0600）。
- 用已装 `src/host/s3.js` 做 SigV4 往返：A/B/S 三桶 PASS；A 密钥越权写 prod 桶 403 PASS。
- 登记 F-01（桌面版 NSW 未激活）。
- 待办：把 dev profile 指向 shared 桶、用 ego 跑 T-A/T-B/T-D 基线、裁定第二客户端方案。
