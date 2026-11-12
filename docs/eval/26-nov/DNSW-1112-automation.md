# DNSW-1112 · shared-workspace 自动化测试与开发 ledger

> 本文件是本次自动化测试与开发的**唯一跟踪账本**，随分支 `dasw-1112-automation` 提交。
> 所有测试结论、发现的问题、代码升级、证据路径都登记在这里；正文里的路径相对于本 worktree。
> 工作区：仓库内 git-ignored 目录 `.worktree/DASW-1112-automation`，分支 `dasw-1112-automation`，基线 `d4eefe6`。

## 0. 目标与红线

- 目标插件：`dsh-nano-shared-workspace`（本 worktree 内源码）。
- 测试节点：`dsh-dev.local`（ego-browser 主战场）、桌面版（HTTP/其他自动化）；必要时新增 `dsh-test.local` 作为第二个 web 客户端。
- **禁止直接操作 `dsh.local`**：它是当前对话的工作区，重启会干扰本会话。不重启、不改它的 profile/凭据/插件副本。Round 1 全程未触碰 `~/.dsh` 的进程与配置。
- 版本一致：所有测试端 dsh 运行时必须同为 `0.2.2-rc.1`；插件版本同为 `0.2.0`；构建产物哈希登记在 §1.3。
- 上海节点：`.env.s3` 为唯一密钥真源，新增/轮换的密钥必须回写仓库根 `.env.s3`（worktree 内副本同步）。
- 代码改动只在本分支，不污染 `main`；完成后由业主合并。

## 1. 环境基线（Round 1 实测）

### 1.1 三实例

| 实例 | 入口 / 端口 | DSH_HOME | 活动 profile | 状态 |
|---|---|---|---|---|
| 日常（禁操作） | `https://dsh.local/` 3081（broker 3082） | `~/.dsh` | `web` | 进程 PID 47398，2026-11-12 08:41 启动；Round 2 末仍为同一进程，未重启、未改配置 |
| 开发（客户端 A） | `https://dsh-dev.local/` 3083（broker 3084） | `~/.dsh-dev` | `web` | 测试桶 `dasw-1112-shared`，身份 `dasw-a`，`backgroundSyncMs: 0` |
| 桌面版（客户端 B） | Electron host `127.0.0.1:<动态端口>` | `~/.dsh-desktop` | `desktop` | 同桶，身份 `dasw-b`，`backgroundSyncMs: 0`；已激活 NSW 路由 |

三者共用已安装 `dsh@0.2.2-rc.1` 与同一个 Caddy；其余（home、profile、插件副本、凭据、session、cookie、IndexedDB）完全隔离。
`~/.dsh/profiles/desktop`、`~/.dsh-desktop/profiles/web` 是非活动克隆 profile，不是额外实例。

**F-01 裁定（Round 2）**：不新建 `dsh-test.local`，直接把桌面版作为第二客户端：补 profile patch 的 `endpoint/region/bucket`、写入 `dasw-b` 身份、部署同一构建后重启 app。桌面版能跑通全部 NSW 路由后，再评估是否仍需第三个 web 节点。

**桌面版启动陷阱（已记入测试手册段）**：
- 直接 `open -a "DeepSeek Harness"` 会继承调用者 shell 的 `DSH_HOME`（本会话是 `~/.dsh`），导致 host 起在**日常 home**、加载 `~/.dsh/profiles/desktop`，并向 `~/.dsh` 写入 `settings.yaml`/`storages/workspace.json` 等文件（F-14）。
- 正确姿势：`env -i HOME=$HOME PATH=/usr/bin:/bin DSH_HOME=$HOME/.dsh-desktop "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"`。
- host 监听端口每次启动都变，需从 `lsof -nP -a -c DeepSeek -iTCP -sTCP:LISTEN` 读出并写入 `/tmp/dasw-desktop-port`。
- 桌面版不打印 `dsh web: …?token=`；无头访问用 `scripts/eval/desktop-auth.mjs` 自己签浏览器 cookie（见 §1.4）。

### 1.2 S3 测试资产（2026-11-12 新建，密钥存 `.env.s3`）

| 逻辑名 | 桶 | 用途 | 账户 |
|---|---|---|---|
| `S3_DASWA_*` | `dasw-1112-shared` | 客户端 A（dsh-dev）多用户协同主桶 | svcacct `dasw1112a…`，scoped policy `dasw-1112` |
| `S3_DASWB_*` | `dasw-1112-shared` | 客户端 B（第二实例 / 直接 S3 模拟）同桶 | svcacct `dasw1112b…`，同 policy |
| `S3_DASWS_*` | `dasw-1112-sandbox` | 破坏性用例：重置桶、轮换密钥、大文件、越界 | 与 A 同密钥 |
| `S3_DEV_*` / `S3_PROD_*` | `dsh-dev-local-workspace` / `dsh-local-workspace` | 原有，**不动** | 原有 |

- 端点统一 `https://nano-shared-workspace.saobao.com`，region `shv1`，path-style（nginx 单 vhost → minio 127.0.0.1:9000）。
- 通过已装 SigV4 客户端验证：`scripts/eval/lib.mjs` + 内联探针，A/B/S 三桶 PUT→GET→DEL 全 PASS；A 密钥越权写 prod 桶 403 PASS。
- 失败教训：`mc admin user svcacct add --secret-key` 长度限制 8–40；`openssl rand -hex 24`（48 字符）被拒，改为 `-hex 16`（32 字符）成功。
- 最终密钥已回写仓库根 `/Users/seanz/Documents/dsh-plugins/.env.s3`（0600），worktree 副本一致。

### 1.3 构建与部署链

- 源码真源：本 worktree `dsh-nano-shared-workspace/src/`；构建期包 `packages/dsh-nano-ui`、`dsh-performance-review`、`dsh-remote-data-schema`、`dsh-host-route-guard` 在 worktree 内以 `node_modules` 软链解析。
- 构建：`npm run build`（esbuild 0.25.0，先 bake `src/host/route-table.js`）。
- 部署到 dev：`cp lib/{client.js,host.js} ~/.dsh-dev/plugins/dsh-nano-shared-workspace/lib/` → `launchctl kickstart -k gui/$(id -u)/ai.deepseek.dsh.dev.web` → 强制刷新 `https://dsh-dev.local/`。
- **不要用 `dsh-dev restart` 部署本分支代码**：它的 `sync_plugins()` 硬编码 `$HOME/Documents/dsh-plugins`（main checkout），会把 worktree 构建覆盖掉。
- Round 1 末构建哈希：`lib/client.js` `93f2f7c7d85a20db…`、`lib/host.js` `c96f4490d736c5c4…`；dev 副本哈希已核对一致。
- dev 原配置的备份（含凭据，勿入库）移到 `/tmp/dasw-1112-dev-backup`；`docs/eval/26-nov/logs/` 已加入 `.gitignore`。

### 1.4 方法论备注

- ego-browser 局部截图用 `page.screenshot()` 全视口 + PIL 按元素 rect 裁剪。`page.cdp("Page.captureScreenshot", {clip})` 会带 2x deviceScaleFactor 与 backdrop 合成伪影，产生"对话框透明"的假象，不用于证据。
- 端到端 UI 状态同时用 `window.__nsw.store.current` 与 S3 对象双重核对。
- **双客户端无头测试**：`scripts/eval/clients.mjs` 提供 `devNsw` / `desktopNsw`。A 走 Caddy + curl cookie jar；B 走 loopback + 自签 cookie。
- **桌面 cookie 自签（`desktop-auth.mjs`）**：从 app.asar 提取到 `BrowserAuth` 实现。cookie 名 `dsh-auth-` + base64url(sha256(authority))，authority 是 **`127.0.0.1:<port>`**（不是 localhost、也不带 scheme）；值 `v1.<base64url(payload)>.<base64url(hmacSha256(secret, body))>`；签名密钥是 `~/.dsh-desktop/.credentials.yaml` 的 `client-connection/browser-session` grant。payload 的 `expiresAt - issuedAt` 必须 ≤ 该实例 `cookieMaxAgeDays`（30 天 cookie 直接 401）。
- **绝对不要**从会话环境读 `DSH_HOME` 推断桌面 home：本会话是 `~/.dsh`，两边 browser-session 密钥不同，会得到 401（F-15）。

### 1.5 云端延迟基线（Round 2 实测）

单次经 Cloudflare 到上海 MinIO 的往返约 **1.0–1.6s**（`/minio/health/live` 三次取样）。这决定了文件同步的理论下限：200 个 blob 即使并发 8，也要 ~25s。这个数字是整个性能讨论的前提，不是插件缺陷。

## 2. 测试矩阵

状态：`⬜` 未跑 / `✅` 通过 / `❌` 发现问题 / `🔧` 已修复并复测 / `⏸` 阻塞。

### A. 设置与绑定（T-Axx）

| ID | 场景 | 状态 | 证据 / 结论 |
|---|---|---|---|
| T-A01 | 两阶段设置：绑定前只有第 1 步，探测失败不前进 | ✅ | 清凭据后打开 → 「第 1 步 · 绑定文件桶」；错密钥探测失败仍停在第 1 步、`configured:false` |
| T-A02 | 真实探测成功 → 保存 → 自动进入第 2 步 | ✅ | 用 A 密钥绑定：出现「正在探测文件桶，请稍候…」→ 自动进「第 2 步」+「已绑定文件桶 dasw-1112-shared」 |
| T-A03 | 已配置时重复打开设置：不重复打 S3（60s 缓存） | ✅ | 冷 2.29s / 热 0.021s；`registered` 字段见 F-09 |
| T-A04 | 改密钥后缓存立即可见；清凭据后回到未绑定 | ✅ | `clear → configured:false`；`update → configured:true registered:true`；UI 重绑 → 第 1 步 → 重填 → 第 2 步全链路通 |
| T-A05 | 错误密钥 / 缺字段 / 桶不存在 / 端点错 的 UI 表达 | 🔧 | 错密钥：对话框内红字 + 停在第 1 步（`R3-bind-error.png`）。**修复前会把整段 S3 XML 倒进弹窗**（F-19）→ 现仅 `S3 403 InvalidAccessKeyId` |
| T-A06 | 设置弹窗 Esc / 取消 / 关闭 的幂等与焦点恢复 | ✅ | Esc 关闭后再开仍落在第 2 步（不重新探测）；取消/关闭均冪等 |

### B. 工作区生命周期（T-Bxx）

| ID | 场景 | 状态 | 证据 / 结论 |
|---|---|---|---|
| T-B01 | 创建：同名重复 | 🔧 | 修复前两次同名产生两个 marker；裁定：**同名允许**（工作区按 16-hex id 标识，不按名称唯一）。幂等按「一次创建尝试」而非名称 |
| T-B02 | 创建幂等：连点两次 / 网络重试 / 并发同请求 | 🔧 | 同一 `requestId` 顺序两次 → 同一 id + `deduplicated:true`；并发两次 → 1 个 marker |
| T-B03 | 删除：UI 入口、远端是否残留 | 🔧 | 行 hover 垃圾桶 → danger 确认；API 层 1 个 marker；非成员删除被拒。级联孤儿对象见 F-12 |
| T-B04 | 加入：第二用户加入同一 workspace、未加入会话提示 | ✅ | B（桌面版）`join` 成功；A/B 都看到 `dasw-a,dasw-b` 两个 member；未加入时 `tree/pull` 返回 `join this shared workspace before syncing files` |
| T-B05 | 空状态 / 加载态 / 绑定态 三种侧栏文案与图标 | ✅ | `screenshots/R1-sidebar-empty-crop.png`；空状态「请新建共享工作区」 |
| T-B06 | 创建竞态 / 并发 join 丢成员 | 🔧 | `race-markers.mjs`：无条件并发写丢 1 个成员；CAS 恰好 1 个 412。`join-cas.mjs`：升级后三方 member 全保留 |

### C. 会话与协同（T-Cxx）

| ID | 场景 | 状态 | 证据 / 结论 |
|---|---|---|---|
| T-C01 | 单写者租约：A 持有，B 打开只读（cool-off） | ✅ | A `claim` ok；B `claim` → `busy:true, holder:dasw-a@fba3fbd5`；`lease` 对 B 报 `mine:false` |
| T-C02 | 租约过期回收；心跳续租；过期边界 | ✅ | 心跳拉长 `expiresAt` 且 `heartbeatRev` 1→2；改成过期后 B 可重新获取；A 再心跳被拒 |
| T-C03 | 双写竞态：A/B 同时 claim 同一会话 | ✅ | 并发 claim 恰好 1 个成功；S3 上只剩单一 writerId（依赖 U-01 的弱 ETag 修复） |
| T-C04 | 多用户同步：A 写内容 → B 拉到同一代 | ✅ | A push gen1 → B pull gen1，内容 `from A` 一致 |
| T-C05 | 文件树冲突消融：同文件双改 | ✅ | A `A edit` / B `B edit` → B push 报 `conflicts:["team.md"]`，副本得 `<<<<<<< local` … `>>>>>>> remote`；A pull 同代后两侧内容均在 |
| T-C06 | 文件上传：大文件 / 二进制 / 超限 / 恶意路径 | ✅ | 1MiB 二进制 sha256 一致；>2MiB 不进 HEAD、本地保留；symlink 不跟随不上传；`../` rel 被 schema 拒绝且不写出副本；`imagine/` 类 SKIP 路径不落盘；schema 合法的远端 HEAD 正常拉取 |
| T-C07 | 负向：伪造 id、越权 | ✅ | 非法 `workspaceId`/`sessionId` → 400；非成员 marker 删除被拒 |

### F. 会话日志同步（T-Fxx，Round 3 新增）

真实 UI 路径：ego 在 A 侧展开共享工作区 → 「新建会话」→ 输入「只回复一个词：pong」。

| ID | 场景 | 状态 | 证据 / 结论 |
|---|---|---|---|
| T-F01 | 会话日志推送：本地 artifact → `sessions/{sid}/{meta.json,body/n.part}` | ✅ | `outcome: pushed:16062b`；meta `rev:3`、`committedBytes` 与 `0.part` 字节数完全相等 |
| T-F02 | 两端都能列出远端会话 | ✅ | A/B `/sessions` 均返回该行，`writerId: dasw-a@fba3fbd5` |
| T-F03 | transcript 回放完整（跨运行时） | ✅ | A/B 均为 22 事件 = `meta.eventCount`，17 种类型，含 `user/message`；B 修复前只有 1 条（F-22） |
| T-F04 | materialize 落到 B 的会话树 | ✅ | 产物 cwd 重写为 `/Users/seanz/dasw-1112-mu-b`；22/22 行完整（修复前 176B/1 行）；帧布局有效 |
| T-F05 | 外部写者不得覆盖 | ✅ | 把 meta 的 `writerId` 改成 `dasw-x@deadbeef` 后 A 返回 `skip:foreign-writer`，不写 |
| T-F06 | 未共享会话不被推送 | ✅ | 普通会话返回 `skip:not-shared`（cwd 不在本成员副本内） |

### D. 视觉与交互（T-Dxx，局部截图）

| ID | 场景 | 状态 | 证据 / 结论 |
|---|---|---|---|
| T-D01 | 侧栏 section：折叠/展开、图标列对齐、loading 旋转 | ✅ | `R1-sidebar-empty-crop.png`；spinner 右缘对齐 265 |
| T-D02 | 设置两阶段弹窗、探测中/失败态、开关 | ✅ | `R3-bind-stage1.png` / `R3-bind-error.png` / `R3-bind-success.png`；探测中有心跳点 + 「正在探测文件桶」 |
| T-D03 | 新建工作区对话框：目录浏览、新建文件夹、错误行 | ✅ | `R1-create-dialog-clean.png`；面包屑修成 `/ / Users / seanz`（F-11 / U-10） |
| T-D04 | 会话行：选中高亮、置顶/归档/重命名、hover 操作列 | ✅ | 行 hover 出现「新建会话/删除」；设置/删除均 danger 或 outline 语义正确；R1 已验置顶/归档/重命名 |
| T-D05 | 错误表达：notice 弹窗标题与正文是否矛盾 | 🔧 | 创建成功不再弹 notice（R1）；**新发现**：失败详情会倒出 S3 XML（F-19）→ U-09 |
| T-D07 | 只读回放（读者视角） | ✅ | 会话行 hover 出现「只读查看内容」；点击后 22 事件渲染成 5 条可读行（用户/助手），meta 行含写者、时间、事件数、字节数；footer 仅「关闭」（`R7-transcript-single-close.png`） |
| T-D08 | 回放弹窗的异常输入 | ✅ | 远端标题截断到 60 字，不会挤掉关闭按钮；取数期间显示「正在从共享空间读取…」；失败落 notice 而不是空白弹窗 |
| T-D06 | 窄侧栏 / 深色浅色 / 长名称截断 | ✅ | 窗口 700/600/520 宽侧栏仍是 280px 宽版（不自动切 rail）；手动收起后切 rail 图标正常；长标题 `scrollWidth 1333 > width 202` 正确省略 |

### E. 性能与监控（T-Exx）

| ID | 场景 | 状态 | 证据 / 结论 |
|---|---|---|---|
| T-E01 | `/settings` 冷/热耗时、缓存 TTL 边界 | ✅ | 冷 2.29s（含 S3）/ 热 21ms；60s TTL 未单独压边界 |
| T-E02 | 大目录 / 大量会话下列表渲染与滚动 | 🔧 | 200 文件：push **111s → 25.8s**、pull **108s → 9.6s**（U-08 有界并发）；重复 push 只传变更 blob（`uploaded:1`）；`/workspaces` 200 marker 8.3s→6.5s |
| T-E03 | perf-review instrumentation（`?perf-review=1`） | ✅ | 无页面埋点时不采集（恒等包装）；`/settings`、`/workspaces`、`/sessions`、`sync-tick` 均有 `hostSpan` 包裹点 |
| T-E04 | 后台同步 30s / 心跳 25s 的重复与节流 | ✅ | 新增 `backgroundSyncMs`（0 关闭）；实测关后 35s 内 generation 不变；开时 30s 内会主动推 |

### G. 负向与失败模式（T-Gxx，Round 5 新增）

| ID | 场景 | 状态 | 证据 / 结论 |
|---|---|---|---|
| T-G01 | 密钥被吊销后重新绑定 | ✅ | 换错误密钥：`/workspaces` → 400 `S3 403 InvalidAccessKeyId`（有界、不挂死、不回 XML）；改回真密钥后立即恢复 |
| T-G02 | 破坏性路由的畸形请求体 | ✅ | 无 id / 非 16-hex / 缺 name / 相对路径 / `../../etc` / 缺 sessionId / 短 id 共 7 种全部被拒 |
| T-G03 | 租约时钟徏移 | ✅ | 把 claim 的 `expiresAt` 设到 400 天后，A 仍能 `ok:true` 取得租约，桶内 writerId 变为 `dasw-a@…`（F-24 / U-16） |
| T-G04 | 删除与 push 交错 | ✅ | 两者同时发出：push 200、delete 200，不互相崩溃；删除后列表消失、再 push 返回 `shared workspace not found`。但竞争中的 push 仍写下了孤儿 tree 对象（F-12） |
| T-G05 | 成功后重试幂等 | ✅ | 第二次 push `generation` 不变且 `unchanged:true`，不产生新代 |
| T-G06 | 大量工作区下列表 | ✅ | 14 个工作区时 `/workspaces` 11.6s 返回（Cloudflare 单次往返 ~1.1s × 逐 marker 读取，属已知线性成本） |

### H. 性能观测（T-Hxx，Round 5 新增）

启用方式：dev LaunchAgent 已带 `DSH_PERF_REVIEW=1`；页面带 `?perf-review=1`。
证据：`logs/perf-report.json`（`window.__perfReview.report()` 原始输出）。

| 指标 | 读数 | 说明 |
|---|---|---|
| `nativeInpCount` / `p75` | 11 / 72ms | 含 presentation，属环境级，不进插件预算 |
| `inputDelayP95` / `processingP95` | 0.2ms / 11.2ms | 主线程处理很轻 |
| `presentationP95` | 79.8ms | 环境级（Electron/浏览器合成） |
| `loafCount` / `blockingMs` | 2 / 37.4ms | 全局长帧 |
| `nanoCombined.scriptMs` | 55.2ms | 仅统计 >50ms 长帧里的 >5ms 脚本条目 |
| `nanoCombined.clientJsBytes` | 864779 | 四个 nano 包 combo 合计 |
| **nano-shared-workspace `section-render` p95** | **0.2ms** | 自身渲染开销可忽略 |
| nano-shared-workspace `apply-separate` p95 | 0.5ms | 隐藏本地镜像行的 DOM 遍历 |
| nano-shared-workspace tracks | `hold` / `sidebar-dedupe` / `sidebar-graft` | 心跳、去重、graft 观察器 |

## 3. 发现登记

| ID | 严重度 | 场景 | 现象 | 裁定 | 状态 |
|---|---|---|---|---|---|
| F-01 | 中 | 桌面版 NSW 激活 | desktop profile patch 无 NSW 配置行与凭据；host 上 `/nano-shared-workspace/settings` 404 | 裁定：**不建 `dsh-test.local`**，直接把桌面版做成客户端 B（补配置 + `dasw-b` 凭据 + 同构建 + 重启） | 🔧 已激活 |
| F-02 | **严重** | 租约 / 所有 CAS | Cloudflare /nginx 对 GET 返回弱 ETag `W/"…"`；MinIO `If-Match` 只认强 validator，导致所有 CAS 写 412 `conflict:true`。租约 acquire/renew 会静默失效，单写者形同虚设 | 在 `s3.js` 的 `request` 与 `getJson(withMeta)` 统一剥掉 `W/` 前缀 | 🔧 U-01 |
| F-03 | 中 | 设置操作空间 | 两阶段设置没有「清除凭据 / 重新绑定」入口；已绑定用户无法从 UI 轮换密钥或换桶 | 第 2 步增加「重新绑定」→ 二次确认 → 清凭据回到第 1 步 | 🔧 U-04 |
| F-04 | 中 | 设置阶段 | 视图选项菜单里 `run: () => store.set({open:true})` 绕过 `onOpenSettings`，`setupStage` 未设置 → 已配置用户打开设置被带回第 1 步 | 抽出 `openSettings()`，所有入口统一走它 | 🔧 U-04 |
| F-05 | 低 | 设置可访问性 | `NanoDialog.title` 传 React 元素；Modal 用 `title` 作 `aria-label`，得到 `"[object Object]"` | 标题改字符串，图标移到 body 的 `.nsw-stage-head` | 🔧 U-04 |
| F-06 | 高 | 创建幂等 | `createWorkspace` 用随机 id、无条件 PUT；顺序/并发重复提交各产生一个 marker（实测 3 个 alpha、2 个 race-1） | 客户端按对话框会话生成 `requestId`，服务端 `hash16(memberId:requestId)` + `If-None-Match:*`，冲突时回读并返回同一 marker | 🔧 U-03 |
| F-07 | 高 | 多用户 join | `joinWorkspace` 无条件 `putJson` 覆盖 marker；两个客户端并发加入时先写者的 member 行被抹掉（`race-markers.mjs` 复现） | marker 读写加 ETag CAS（4 次重试），丢失竞态则重读 | 🔧 U-02 |
| F-08 | 中 | 删除入口 | UI 与 host 都没有删除共享工作区的能力 | 新增 `POST /workspaces/delete`（成员校验 + 删 marker + 去本地 pin）、行 hover 垃圾桶按钮、danger 确认弹窗 | 🔧 U-06 |
| F-09 | 低 | settings 缓存 | 60s 缓存与 `/workspaces` 的 `registerIdentity` 不同步：身份对象已写但 `/settings` 仍报 `registered:false` | `/workspaces` 注册新身份成功后 `dropSettingsCache()` | 🔧 U-05 |
| F-10 | 低 | i18n | `joinHint` 在中英文里各定义两次，后写的身份提示覆盖「选择本地副本位置以加入」；构建告警 | 前者改名 `joinHintPick`，修正 `index.js` 引用；构建 0 告警 | 🔧 U-07 |
| F-11 | 低 | 创建对话框视觉 | 面包屑渲染成 `// Users / seanz`（根 crumb 名 `''` 显示 `/` 再加分隔符） | 仅当首项不是根时插入分隔符 | 🔧 U-10 |
| F-12 | 中 | 删除语义 | 只删 `workspaces/{id}.json`；该 id 下 `tree/`、`sessions/` 成为孤儿，本地副本保留 | Round 6 裁定：**做级联清理**。新增 `purgeWorkspaceObjects`（递归 8 层 / 5000 键上限，跳过 MinIO 回显的自引用前缀），删除路由删 marker 后清 `workspaces/{id}/` 下全部对象，响应返回 `purged` | 🔧 U-17 |
| F-13 | — | 测试方法 | CDP clip 截图产生 2x 与 backdrop 伪影（假透明） | 改用 `page.screenshot()` + PIL 裁剪 | 已记录 |
| F-14 | **严重** | 桌面版启动 | `open -a "DeepSeek Harness"` 继承调用者 `DSH_HOME`（`~/.dsh`），host 起在日常 home 并写入 `settings.yaml`、`storages/workspace.json`、`profiles/desktop/*` | 测试一律用 `env -i … DSH_HOME=$HOME/.dsh-desktop` 启动，并用 `ps` 验证 host 路径含 `.dsh-desktop/profiles/desktop` | 已规避（仅新增文件，未改日常既有内容） |
| F-15 | 低 | 桌面无头鉴权 | 自签 cookie 一开始总是 401：误用会话 `DSH_HOME`（`~/.dsh`）的密钥；且 authority 必须是 `127.0.0.1:<port>` | `desktop-auth.mjs` 固定读 `~/.dsh-desktop`，authority 不带 scheme | 🔧 U-12 |
| F-16 | **高** | 并发 push | 两个客户端同时 `tree/push`：`generations/{n}` 有 `If-None-Match:*`，但 **HEAD 是无条件 PUT**，后写者用旧内容覆盖赢家 HEAD（实测丢 `A race`） | HEAD 改 ETag CAS（`ifMatch` / 首次 `If-None-Match:*`），3 次重试 | 🔧 U-08 |
| F-17 | 中 | 冲突落盘时机 | `materializePending` 在 CAS 之前就把合并结果写进副本；CAS 失败会留下半成品 | 合并字节先驻内存，`writePending` 在 generation + HEAD 都成功后落盘 | 🔧 U-08 |
| F-18 | 中 | 绑定竞态 | 探测成功后 `finishBind` 只置 `setupStage`，`configured/username` 要等 `refresh()`；用户立即点「新建共享工作区」会被弹回第 1 步 | `finishBind(bound)` 接受刚落库的用户名并立即置 `configured:true` | 🔧 U-11 |
| F-19 | 中 | 错误文案 | 错密钥时对话框直接展示 S3 原始 XML（几百字 `<Error><Code>…`） | `messageOf` 抽 `<Code>` + HTTP 状态，其余去标签并截断 180 字 | 🔧 U-09 |
| F-20 | 中 | 同步性能 | 200 文件 push 111s / pull 108s：blob 串行传输；且重复 push 重传所有未变文件 | 有界并发池（8）；sha 已在 HEAD/parent 则跳过上传；返回 `uploaded` 供观测 | 🔧 U-08 |
| F-25 | **高** | 只读回放不可达 | `TranscriptDialog`、`api.fetchTranscript`、`face.onCloseTranscript`、`graft` 的 portal 全部实现，但**没有任何 UI 入口调用它们**——整条只读回放是死代码。读者既不能占用租约，也就完全没有办法看到共享会话的内容 | 行操作列新增「只读查看内容」按钮（`IconDeliverDocRegular`），`onViewTranscript` 走 host 路由取数；footer 收成单一「关闭」（与 F-23 同类问题） | 🔧 U-18 |
| F-26 | 中 | 回放弹窗的健壮性 | 标题直接取远端 `meta.title`（不可信、可任意长），会挤掉关闭按钮；取数期间没有任何加载反馈 | 标题截断到 60 字；新增 `transcriptLoading` 文案与 loading 分支 | 🔧 U-18 |
| F-27 | **高** | 会话归属不确定 | 两个共享工作区声明同一个 `localPath` 时（创建对话框允许复用目录），`matchWorkspace` 的 `>` 比较无法决出胜者，结果取决于桶的列举顺序。实测同一会话在两次 `/sync` 中被匹配到不同 workspaceId（`8a77424e…` vs `9167ab8d…`），`/sessions` 与 `/tree/push` 因此指向不同 workspace | 等长前缀时用 `createdAt` 取更早的 marker 作为确定性 tie-break | 🔧 U-19 |
| F-24 | 中 | 租约可被恶意/异常预占 | claim 的 `expiresAt` 只校验是有限数字，无合理上限；写入 400 天后的 claim 会让该会话对所有合法写者永久 `busy` | Round 6 裁定：**不接受到永久阻塞**。`validClaim` 增加上限 `now + 2×TTL`，超限的 claim 视为畸形，由已有的 CAS 循环原子替换 | 🔧 U-16 |
| F-23 | 中 | cool-off 的 UI 表达 | 租约被占时弹窗标题是「无法打开」，底部同时给「取消」和「关闭」两个同义按钮；语义上是「稍后重试」而非失败 | 新增 ``noticeKind: 'busy'``，标题改「会话正在被占用」，footer 只留一个「关闭」 | 🔧 U-15 |
| F-22 | **严重** | 会话日志回放（跨运行时） | Electron 44 内置 Node 24.21 的 `zstdDecompressSync` **只解第一个帧**；DSH 会话日志是逐次追加的多帧 zstd。桌面版读到 21 事件的会话时只拿到 1 行 header，`/transcript` 返回 1 条、`/materialize` 产出 176 字节残缺副本。系统 Node 24.22 能解全部 7 帧，所以**只在桌面/Electron 端复现** | `decode()` 按 zstd magic 切帧后逐帧解码；两运行时均得 21 行 | 🔧 U-14 |

## 4. 升级记录（U-xx）

| ID | 关联 | 改动 | 复测 |
|---|---|---|---|
| U-01 | F-02 | `src/host/s3.js`：签名与发送的 `if-match` 去 `W/` 前缀；`getJson(withMeta)` 返回强 ETag | `race-markers.mjs` CAS 控制组从「全 412」变为「1 成功 1 冲突」；`join-cas.mjs` 三方 member 全保留 |
| U-02 | F-07 | `src/host/workspaces.js`：`parseMarker` 抽出、`readMarkerWithMeta`、`joinWorkspace` ETag CAS 4 次重试 | `scripts/eval/join-cas.mjs` PASS |
| U-03 | F-06 | `createWorkspace` 支持 `requestId` 幂等键；routes/api/index 透传；每次打开创建对话框生成一次 UUID | 顺序/并发相同 `requestId` 均只产生 1 个 marker；`deduplicated:true` |
| U-04 | F-03/04/05 | `index.js` 统一 `openSettings()`；`settings-dialog.js` 字符串标题 + 图标 body + 重新绑定 footer；`graft.js` 重绑确认；i18n 新键 | ego：菜单→设置直接显示第 2 步，`aria-label` 为「第 2 步 · 新建共享工作区」；重绑确认→取消→回到第 2 步 |
| U-05 | F-09 | `routes.js` `/workspaces` 注册新身份后 `dropSettingsCache()` | 删掉 `identities/dasw-a.json` → `/settings` false → `/workspaces` → `/settings` 立刻 true |
| U-06 | F-08 | 新增 `POST /workspaces/delete`（成员校验、删 marker、去 pin）；行 hover 删除按钮 + danger 确认；i18n；`security/route-sensitivity.json` / `route-inventory.md` 同步；build 重新 bake `route-table.js` | API：创建→删除→列表消失→再删 400；非成员删除被拒。UI：6→5、确认弹窗文案正确、无成功 notice |
| U-07 | F-10 | `i18n.js` 重复 `joinHint` 拆成 `joinHintPick` + `joinHint`；`index.js` 引用修正 | `npm run build` 0 warning |
| U-08 | F-16/17/20 | `tree.js`：HEAD 改 ETag CAS + 3 次重试；合并字节延迟落盘（`writePending`）；`mapLimit` 有界并发池（8）用于 blob 上传/下载；`ensureBlobs` 跳过 HEAD/parent 已引用的 sha | `multi-user-files.mjs` 并发 push 不再丢内容（`head.conflicts=[race.txt]`，两侧编辑都在）；200 文件 push 111s→25.8s、pull 108s→9.6s；重复 push `uploaded:1` |
| U-09 | F-19 | `routes.js` `messageOf`：抽 S3 `<Code>` + HTTP 状态，其余去标签并截断 | `/settings/test` 错密钥返回 `S3 403 InvalidAccessKeyId`；对话框不再倒 XML（`R3-bind-error.png`） |
| U-10 | F-11 | `create-dialog.js` 面包屑：仅当首项不是根时插分隔符 | 渲染为 `/` `/` `Users` `/` `seanz` |
| U-11 | F-18 | `index.js` `finishBind(bound)` 立即发布 `configured/username`；`graft.js` 透传 `bound` | ego 注入校验：`finishBind({username:'dasw-a'})` 后 `configured:true`、`stage:'workspace'` |
| U-12 | F-15 | 新增 `scripts/eval/desktop-auth.mjs`（自签 cookie、固定 `~/.dsh-desktop`、动态端口）；`clients.mjs` 统一 A/B 两端 | 两端 `/settings` 均 200 且分别返回 `dasw-a` / `dasw-b` |
| U-13 | F-21 | `entry.js` 新增 `Config.backgroundSyncMs` 校验；`routes.js` `startBackgroundSync` 读该值，0 时直接返回 | 关后 35s generation 不变；两个测试节点均已设 0 |
| U-18 | F-25/26 | `section.js` 会话行新增只读查看按钮；`index.js` 新增 `onViewTranscript`（loading → fetch → dialog，失败落 notice）；`transcript-dialog.js` 标题截断 + loading 分支 + 单按钮 footer；i18n 新增 `viewTranscript` / `transcriptLoading` | 桌面 UI 实测：行内出现「只读查看内容」；点击后弹窗标题「单词回复请求」、meta 行 `dasw-a · … · 22 events · 16062B`、5 条可读行（用户×4 + 助手×1）、footer 仅「关闭」（`R7-transcript-single-close.png`） |
| U-19 | F-27 | `workspaces.js` `matchWorkspace`：同长度前缀时按 `createdAt` 取更早的 marker | 修复后同一会话稳定匹配到 `9167ab8d…`；`session-sync` 17 项全绿，`multi-user-files` 全绿 |
| U-16 | F-24 | `session-io.js` 新增 `claimExpiryIsSane`：`expiresAt <= now + 2×TTL_MS`，否则 `validClaim` 返回 false，CAS 循环重新取租约 | 400 天后的幽灵 claim → A `claim` 返回 `ok:true`，桶内 writerId 变为 `dasw-a@…`；租约回归套件 14 项仍全绿 |
| U-17 | F-12 | `tree.js` 新增 `purgeWorkspaceObjects`（跳过 MinIO 回显的自引用前缀，防死循环）；`routes.js` 删除后调用并在响应里返回 `purged` | 含 tree/sessions 的 fixture 删除后报 `purged.keys:11`，桶内该 id 下 0 对象；竞争中的 push 也不会留下孤儿 |
| U-15 | F-23 | ``i18n.js`` 新增 ``noticeTitleBusy``；``index.js`` busy 分支置 ``noticeKind:'busy'``，``dismissNotice``/``onOpenSession`` 同步清理；``graft.js`` 按 kind 选标题并用单按钮 footer | 桌面 UI 实测：标题「会话正在被占用」、按钮仅「关闭」、``noticeKind: busy``（``R4-cooloff-fixed.png``） |
| U-14 | F-22 | `session-io.js` `decode()`：按 zstd frame magic 切分后逐帧 `zstdDecompressSync`，兼容只解首帧的运行时 | 系统 Node 24.22 与 Electron Node 24.21 各跑一次：均 21 行。修复后 A/B `/transcript` 都返回 21 事件 / 16 类型；B `materialize` 产物由 176B/1 帧变为 15094B/2 帧 |

## 5. 证据索引

| 路径 | 内容 |
|---|---|
| `scripts/eval/lib.mjs` | 测试脚手架：`.env.s3` 解析、已装 SigV4 客户端、往返探针、断言 |
| `scripts/eval/clients.mjs` | 双客户端封装：`devNsw`（Caddy + cookie jar）/ `desktopNsw`（loopback + 自签 cookie）、`post`、`check` |
| `scripts/eval/desktop-auth.mjs` | 桌面版浏览器会话 cookie 自签（authority / 密钥 / TTL 规则，F-15 / U-12） |
| `scripts/eval/multi-user-files.mjs` | 双客户端 join、文件同步、冲突消融、二进制、超限、symlink、恶意 HEAD、并发 push（T-B04 / T-C04 / C05 / C06） |
| `scripts/eval/multi-user-leases.mjs` | cool-off、心跳、过期回收、并发 claim、非法 id（T-C01 / C02 / C03 / C07） |
| `scripts/eval/scale-and-perf.mjs` | 200 文件规模、深层嵌套、`/workspaces` 大列表、会话路由、后台同步关闭（T-E02 / E03 / E04） |
| `scripts/eval/negative-cases.mjs` | 密钥吊销/重绑、7 种畸形请求体、租约时钟徏移、删除与 push 交错、重试幂等、大量工作区（T-G01…G06） |
| `screenshots/R7-desktop-transcript.png` | 桌面只读回放（修复前 footer 有「取消/关闭」两个同义按钮） |
| `screenshots/R7-transcript-single-close.png` | 修复后：单一「关闭」+ 完整会话内容 |
| `logs/perf-report.json` | `window.__perfReview.report()` 原始快照（T-H01） |
| `scripts/eval/session-sync.mjs` | 会话日志推送/远端列举/transcript/materialize/外部写者拒写（T-F01…F05，含 F-22 回归） |
| `scripts/eval/race-markers.mjs` | 无条件并发 join 丢成员 + CAS 控制组（F-07 / U-01 / U-02） |
| `scripts/eval/join-cas.mjs` | 三方并发 join 保留全部 member（U-02） |
| `screenshots/R1-sidebar-empty.png`、`R1-sidebar-empty-crop.png` | 空状态侧栏全视口 / 裁剪 |
| `screenshots/R1-view-options-menu.png` | 视图选项菜单（含设置入口） |
| `screenshots/R1-settings-stage2.png` | 修复前：已配置用户被带回第 1 步（F-04） |
| `screenshots/R1-create-dialog.png`、`R1-create-dialog-clean.png` | 创建对话框 CDP 伪影 vs 正确裁剪（F-13） |
| `screenshots/R2-settings-stage2-fixed.png` | 修复后第 2 步设置（整页截图） |
| `screenshots/R2-rebind-confirm.png` | 重新绑定 danger 确认 |
| `screenshots/R2-delete-confirm.png` | 删除共享工作区 danger 确认 |
| `screenshots/R3-bind-stage1.png` | 第 1 步绑定（清凭据后） |
| `screenshots/R3-bind-error.png` | 错密钥探测失败（修复前含 S3 XML，见 F-19） |
| `screenshots/R3-bind-success.png` | 绑定成功自动进入第 2 步 |
| `screenshots/R3-create-breadcrumb.png` | 创建对话框面包屑（F-11 修复后） |
| `screenshots/R3-long-title.png` | 超长标题省略（T-D06） |
| `screenshots/R3-light-theme.png` | 浅色主题（T-D06） |
| `screenshots/R3-rail-collapsed.png` | 窄侧栏 rail 模式（T-D06） |
| `/tmp/dasw-1112-dev-backup/`、`/tmp/dasw-1112-desktop-backup-*/` | 两个测试节点原始 profile/凭据/插件 lib 备份（含密钥，勿入库） |

## 6. 轮次日志

### Round 1（2026-11-12 09:16–10:00）

- 建立 git worktree `.worktree/DASW-1112-automation` + 分支 `dasw-1112-automation`（基线 `d4eefe6`），不污染 `main`；ledger 与 harness 首个提交 `b5b9698`。
- shv1 上 `mc` 新建 `dasw-1112-shared` / `dasw-1112-sandbox` + scoped policy + 两个 svcacct；密钥回写 worktree 与仓库根 `.env.s3`（0600）；SigV4 往返与越权隔离验证 PASS。
- dev profile 指向 `dasw-1112-shared`、身份换 `dasw-a`、部署 worktree 构建、`kickstart -k` 重启；`/settings` 确认新桶。
- ego-browser 任务空间 `DASW-1112-e2e`（spaceId 47）：登录、侧栏/设置/创建/重绑/删除局部截图与 DOM 诊断。
- API/脚本边缘用例：重复与并发创建、claim/marker 竞态、弱 ETag、清/改凭据缓存、删除正负向。
- 登记 F-01…F-13，完成 U-01…U-07 并逐项复测；`npm run build` 0 告警；`check-route-sensitivity.mjs` 44 routes 0 drift。
- 未触碰 `dsh.local`；dev 备份移出 worktree；eval logs 加 `.gitignore`。
- **Round 2 待办**：F-01 裁定并接入桌面版或 `dsh-test.local`（第二客户端，版本对齐）；T-A01/02/05/06、T-B04、T-C01…C06、T-D04/06、T-E02…E04；F-11/F-12 裁定；大量边缘场景与视觉回归。

### Round 2（2026-11-12 10:05–11:55）

- 裁定 F-01：不新建 `dsh-test.local`，把**桌面版做成客户端 B**（同桶、`dasw-b`、同构建、`backgroundSyncMs:0`）。
- 提取 app.asar 中的 `BrowserAuth`，写 `desktop-auth.mjs` 自签 cookie；`clients.mjs` 统一 A/B 断言接口。
- 踩到 F-14（`open -a` 继承 `DSH_HOME` 导致 host 起在日常 home），改为 `env -i … DSH_HOME=$HOME/.dsh-desktop` 启动并固化进手册；未改 `dsh.local` 进程。
- 双客户端用例全部跑通：join/两人可见、A→B 同步、冲突消融、二进制、超限、symlink、恶意 HEAD、并发 push、cool-off、心跳、过期回收、并发 claim、非法 id。
- 发现并修复 F-16（并发 push 覆盖 HEAD）、F-17（冲突先落盘）、F-18（绑定后立即创建被弹回）、F-19（S3 XML 倒进 UI）、F-20（串行传输）、F-21（同步间隔写死）、F-11（面包屑双斜杠）。
- 性能：200 文件 push 111s→25.8s、pull 108s→9.6s；重复 push 只传 1 个变更 blob。云端单次往返 ~1.1s 是下限。
- 视觉：第 1/2 步、错误态、面包屑、超长标题、浅色、rail 均截图登记。
- 未触碰 `dsh.local`（PID 47398 始终未变）。

### Round 2 末状态

- 两个测试节点哈希一致（`lib/host.js` `ef558c3a94c8…`、`lib/client.js` `3af2d8dbb85c…`），均 `backgroundSyncMs: 0`。
- `scripts/eval/` 下 7 个可重跑脚本；`docs/eval/26-nov/screenshots/` 下 14 张证据图。
- **测试编排纪律**：`multi-user-files.mjs` / `multi-user-leases.mjs` / `scale-and-perf.mjs` 共用 `/Users/seanz/dasw-1112-mu-{a,b}` 副本目录并会先清空，**必须串行执行**。并行跑会让后启动的脚本清掉前一个刚写的文件，表现为 `push generation` 断言失败（非产品缺陷，Round 2 已踩过一次）。
- 回归结果（提交态 `4f5f5e3`）：`race-markers` / `join-cas` / `multi-user-leases` / `multi-user-files` 全绿。
- 未裁定：F-12（删除是否级联清理 tree/sessions 孤儿对象）。

### Round 3（2026-11-12 11:58–12:20）

- 补齐上轮报告中最大的空白：**会话日志同步链路**。前两轮只验证了文件树，`session-io.js` 一次未跑通。
- 用 ego 走真实 UI：展开共享工作区 → 「新建会话」→ 输入消息 → 会话出现在侧栏，cwd 落在副本目录内。
- 驱动 `/sync`：`pushed:16062b`，meta `rev:3`、`committedBytes` 与 `0.part` 字节数相等；A/B 均可列出。
- **发现 F-22（严重、跨运行时）**：Electron 44 内置 Node 24.21 的 `zstdDecompressSync` 只解第一个帧，而 DSH 会话日志是多帧追加。桌面版把 22 事件读成 1 条，`materialize` 只产出 176 字节 header。系统 Node 24.22 无此问题，所以此缺陷**只在桌面端可见**。
- U-14：`decode()` 按 zstd magic 切帧逐帧解。两运行时均得完整行数；B `/transcript` 22 事件、`materialize` 15094B/2 帧。
- 新增 `scripts/eval/session-sync.mjs`（17 断言全绿），含外部写者拒写与未共享会话不推送。
- 顺手清理了累积的 16 个测试工作区与孤儿对象（F-12 未实现级联，测试侧手动枚举前缀清理）。
- 未触碰 `dsh.local`。

### Round 3 末状态

- 三端构建哈希：`lib/host.js` `6d092f312280…`；两测试节点已同步。
- 测试矩阵：A 6 / B 6 / C 7 / D 6 / E 4 / F 6 = **35 个用例**，除 F-12 裁定项外全部有结论。

### Round 5（2026-11-12 12:22–12:35）

- **真实 perf 采集**：dev 宿主已带 `DSH_PERF_REVIEW=1`，用 ego 带 `?perf-review=1` 做三轮弹窗开关 + 折叠展开，然后 `window.__perfReview.report()` 取快照存 `logs/perf-report.json`。
  关键读数：`section-render` p95 **0.2ms**、`apply-separate` p95 0.5ms、`inputDelayP95` 0.2ms、`processingP95` 11.2ms；`nanoCombined.clientJsBytes` 864779。插件自身渲染开销可忽略，主要成本在云端往返（见 §1.5）。
- **负向套件** `scripts/eval/negative-cases.mjs`（17 断言全绿）：密钥吊销后干净报错且可重绑恢复、7 种畸形请求体全部拒绝、删除与 push 交错不互崩、重试幂等、14 工作区列表 11.6s。
- **F-24（已登记为已知限制）**：claim 的 `expiresAt` 无合理上限校验，写入 400 天后的 claim 会永久阻塞该会话。属同桶协作者可写导致的可信时钟问题，裁定接受并在 ledger 明示；缓解手段是删 `claims/{id}.json`。
- 过程中修正了两处**测试断言自身**的错误（吊销密钥应返回 400 而非 200；把正常结果误判为失败），不是产品缺陷。
- 清理了累积的测试工作区，桶内只剩 `multi-user`（`9167ab8d56346228`）。
- 未触碰 `dsh.local`。

### Round 5 末状态

- 测试矩阵：A 6 / B 6 / C 7 / D 6 / E 4 / F 6 / G 6 / H 2 = **43 个用例**。
- 发现 24 项：22 项已修并复测，F-12（级联删除）与 F-24（租约上限）为已登记的待裁定/已接受项。
- 脚本 10 个（`scripts/eval/`），截图 22 张，perf 快照 1 份。

### Round 6（2026-11-12 12:36–12:58）

两个待裁定项自行裁定并完成：

- **F-24 → U-16**：claim 过期时间加合理上限（`now + 2×TTL`）。超限视为畸形，由已有 CAS 循环原子替换。400 天后的幽灵 claim 不再永久阻塞，实测 A 能正常取得租约。租约回归 14 项全绿。
- **F-12 → U-17**：删除工作区时级联清理 `workspaces/{id}/` 下全部对象。实现踩到一个 MinIO 行为：`list()` 带 delimiter 时会把**请求自身的 prefix 回显在 `<CommonPrefixes>` 里**，直接递归会原地自转直到深度上限，所以必须跳过自引用。修复后 11 个对象的 fixture 删完归零，竞争中的 push 也不留孤儿。
- 负向套件扩到 19 断言全绿（新增"幽灵 claim 被替换"与"竞争删除后无孤儿"两条）。
- 测试脚本自身的 3 处断言修正：吊销密钥应 400 而非 200、误把正常结果判失败、批量创建后立即列表有瞬时空窗需一次重试。
- 桶内清理到只剩 `multi-user:9167ab8d56346228`；这次是用新的级联删除清的，不再需要手写枚举。

### Round 6 末状态

- 构建：`lib/host.js` `06825200761a…`，`lib/client.js` `a2d195d6e088…`；dev 与 desktop 均已同步。
- 发现 24 项：**全部 24 项已修复并复测**，无待裁定项。
- 测试矩阵 43 个用例 + 负向 19 条断言 + 会话同步 17 条断言。
- `dsh.local` 全程未触碰（PID 47398）。

### Round 7（2026-11-12 13:00–13:40）

- **F-25（高）**：只读回放整条链路是**死代码**——`TranscriptDialog`、`fetchTranscript`、`onCloseTranscript`、portal 全写好了，但没有任何 UI 入口。读者不占租约，也就完全看不到共享会话内容。补上行内「只读查看内容」按钮后，桌面实测 22 事件渲染成 5 条可读行。
- **F-26**：回放标题直接取远端不可信文本（可任意长），会挤掉关闭按钮；取数期间无反馈。已截断 60 字并加 loading 文案。
- **F-27（高）**：两个共享工作区共用同一个 `localPath` 时，`matchWorkspace` 的等长前缀比较无法决出胜者，结果随桶列举顺序漂移。实测同一会话两次 `/sync` 匹配到不同 workspaceId，导致 `/sessions` 与 `/tree/push` 指向不同工作区。改为按 `createdAt` 取更早的 marker 做确定性 tie-break。
- 顺带把回放弹窗 footer 从「取消/关闭」收成单一「关闭」（与 F-23 同类语义问题）。
- 桶内清理：删掉 10 个残留测试工作区（级联生效），并确认 25 个空前缀下**无孤儿对象**（0 键）。
- 测试脚本自身修了 2 处：`fresh` 是合法新状态却被白名单漏掉；`negative-cases` 在同一条命令里连跑三次会互相干扰（与 Round 2 的并行纪律同类）。

### Round 7 末状态

- 构建：`lib/client.js` `4e1e32c55409…`、`lib/host.js` `0cef50975f93…`；dev 与 desktop 均已同步。
- 发现 27 项：**全部已修复并复测**。
- 回归：`session-sync` 17/17、`multi-user-files` 全绿、`multi-user-leases` 14/14、`negative-cases` 20/20（单次运行）。
- 桶内只剩 `multi-user:9167ab8d56346228`。
- `dsh.local` 全程未触碰（PID 47398）。
