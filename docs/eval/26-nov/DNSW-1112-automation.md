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
| 日常（禁操作） | `https://dsh.local/` 3081（broker 3082） | `~/.dsh` | `web` | 进程 2026-11-12 08:41 启动；`/settings` = `dsh-local-workspace`；Round 1 未改动 |
| 开发（主测试） | `https://dsh-dev.local/` 3083（broker 3084） | `~/.dsh-dev` | `web` | 进程多次 `launchctl kickstart -k …dev.web` 重启；已指向测试桶 `dasw-1112-shared` |
| 桌面版（第二客户端候选） | `/Applications/DeepSeek Harness.app`，host `127.0.0.1:54585` | `~/.dsh-desktop` | `desktop` | 进程 08:40 启动；NSW 路由 404（缺必填配置，见 F-01） |

三者共用已安装 `dsh@0.2.2-rc.1` 与同一个 Caddy；其余（home、profile、插件副本、凭据、session、cookie、IndexedDB）完全隔离。
`~/.dsh/profiles/desktop`、`~/.dsh-desktop/profiles/web` 是非活动克隆 profile，不是额外实例。
09:52 重启 dev 时发现其 LaunchAgent 已带 `--patch …/dsh-fx-spike-scaffold/cordis.patch.yml`（非本任务添加，只插入一行 id，无 NSW 影响）；记录以免后续误判。

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

## 2. 测试矩阵

状态：`⬜` 未跑 / `✅` 通过 / `❌` 发现问题 / `🔧` 已修复并复测 / `⏸` 阻塞。

### A. 设置与绑定（T-Axx）

| ID | 场景 | 状态 | 证据 / 结论 |
|---|---|---|---|
| T-A01 | 两阶段设置：绑定前只有第 1 步，探测失败不前进 | ⬜ | Round 2 |
| T-A02 | 真实探测成功 → 保存 → 自动进入第 2 步 | ⬜ | Round 2（需清空凭据后走完整两阶段） |
| T-A03 | 已配置时重复打开设置：不重复打 S3（60s 缓存） | ✅ | 冷 2.29s / 热 0.021s；`registered` 字段见 F-09 |
| T-A04 | 改密钥后缓存立即可见；清凭据后回到未绑定 | ✅ | `clear → configured:false`；`update → configured:true registered:true` |
| T-A05 | 错误密钥 / 缺字段 / 桶不存在 / 端点错 的 UI 表达 | ⬜ | Round 2 |
| T-A06 | 设置弹窗 Esc / 取消 / 关闭 的幂等与焦点恢复 | ⬜ | Round 2 |

### B. 工作区生命周期（T-Bxx）

| ID | 场景 | 状态 | 证据 / 结论 |
|---|---|---|---|
| T-B01 | 创建：同名重复 | 🔧 | 修复前两次同名产生两个 marker；裁定：**同名允许**（工作区按 16-hex id 标识，不按名称唯一）。幂等按「一次创建尝试」而非名称 |
| T-B02 | 创建幂等：连点两次 / 网络重试 / 并发同请求 | 🔧 | 同一 `requestId` 顺序两次 → 同一 id + `deduplicated:true`；并发两次 → 1 个 marker（`scripts/eval` + curl） |
| T-B03 | 删除：UI 入口、远端是否残留 | 🔧 | 新增带确认的删除；UI 删除后 store 6→5、S3 marker 消失、无成功 notice；非成员删除被拒 |
| T-B04 | 加入：第二用户加入同一 workspace、未加入会话提示 | ⬜ | Round 2（需第二实例） |
| T-B05 | 空状态 / 加载态 / 绑定态 三种侧栏文案与图标 | ✅ | `screenshots/R1-sidebar-empty-crop.png`；空状态「请新建共享工作区」 |
| T-B06 | 创建竞态 / 并发 join 丢成员 | 🔧 | `scripts/eval/race-markers.mjs`：无条件并发写丢 1 个成员；CAS 恰好 1 个 412。`scripts/eval/join-cas.mjs`：升级后三方 member 全保留 |

### C. 会话与协同（T-Cxx）

| ID | 场景 | 状态 | 证据 / 结论 |
|---|---|---|---|
| T-C01 | 单写者租约：A 持有，B 打开只读（cool-off） | ⬜ | Round 2 |
| T-C02 | 租约过期回收；心跳续租；过期边界 | ⬜ | Round 2 |
| T-C03 | 双写竞态：A/B 同时 claim 同一会话 | ⬜ | Round 2（claim 已有 ETag CAS，见 F-02 根因） |
| T-C04 | 多用户同步：A 写内容 → B 拉到同一代 | ⬜ | Round 2 |
| T-C05 | 文件树冲突消融：同文件双改 | ⬜ | Round 2 |
| T-C06 | 文件上传：大文件 / 二进制 / 超限 / 恶意路径 | ⬜ | Round 2 |
| T-C07 | 负向：伪造 id、越权 | ✅ | 非法 `workspaceId` → 400；非成员 marker 删除 → `only members can delete` |

### D. 视觉与交互（T-Dxx，局部截图）

| ID | 场景 | 状态 | 证据 / 结论 |
|---|---|---|---|
| T-D01 | 侧栏 section：折叠/展开、图标列对齐、loading 旋转 | ✅ | `R1-sidebar-empty-crop.png`；spinner 右缘已对齐 265（上一轮修复） |
| T-D02 | 设置两阶段弹窗、探测中/失败态、开关 | ✅ | `R1-settings-stage2.png`（修复前误入第 1 步）、`R2-settings-stage2-fixed.png`、`R2-rebind-confirm.png` |
| T-D03 | 新建工作区对话框：目录浏览、新建文件夹、错误行 | ✅ | `R1-create-dialog-clean.png`；UI 新建文件夹 `dasw-1112-replica-a` 成功 |
| T-D04 | 会话行：选中高亮、置顶/归档/重命名、hover 操作列 | ⬜ | Round 2 |
| T-D05 | 错误表达：notice 弹窗标题与正文是否矛盾 | ✅ | 创建成功不再弹 notice（上一轮修复）；`R2-delete-confirm.png` 文案一致 |
| T-D06 | 窄侧栏 / 深浅色 / 长名称截断 | ⬜ | Round 2 |

### E. 性能与监控（T-Exx）

| ID | 场景 | 状态 | 证据 / 结论 |
|---|---|---|---|
| T-E01 | `/settings` 冷/热耗时、缓存 TTL 边界 | ✅ | 冷 2.29s（含 S3）/ 热 21ms；60s TTL 未单独压边界 |
| T-E02 | 大目录 / 大量会话下列表渲染与滚动 | ⬜ | Round 2 |
| T-E03 | perf-review instrumentation（`?perf-review=1`） | ⬜ | Round 2 |
| T-E04 | 后台同步 30s / 心跳 25s 的重复与节流 | ⬜ | Round 2 |

## 3. 发现登记

| ID | 严重度 | 场景 | 现象 | 裁定 | 状态 |
|---|---|---|---|---|---|
| F-01 | 中 | 桌面版 NSW 激活 | desktop profile patch 无 `nano-shared-workspace` 的 `endpoint/region/bucket` 覆盖行，凭据无 `DSH_NSW_IDENTITY`；host 上 `/nano-shared-workspace/settings` 404（对照 notepad `/nano-notepad/read` 401 已注册）。`Config` 三项必填、缺失即加载失败 | Round 2 决定：给桌面版补配置 + 凭据 + 重启 app，或改用 `dsh-test.local` 作为第二 web 客户端 | 待裁定 |
| F-02 | **严重** | 租约 / 所有 CAS | Cloudflare /nginx 对 GET 返回弱 ETag `W/"…"`；MinIO `If-Match` 只认强 validator，导致所有 CAS 写 412 `conflict:true`。租约 acquire/renew 会静默失效，单写者形同虚设 | 在 `s3.js` 的 `request` 与 `getJson(withMeta)` 统一剥掉 `W/` 前缀 | 🔧 U-01 |
| F-03 | 中 | 设置操作空间 | 两阶段设置没有「清除凭据 / 重新绑定」入口；已绑定用户无法从 UI 轮换密钥或换桶 | 第 2 步增加「重新绑定」→ 二次确认 → 清凭据回到第 1 步 | 🔧 U-04 |
| F-04 | 中 | 设置阶段 | 视图选项菜单里 `run: () => store.set({open:true})` 绕过 `onOpenSettings`，`setupStage` 未设置 → 已配置用户打开设置被带回第 1 步 | 抽出 `openSettings()`，所有入口统一走它 | 🔧 U-04 |
| F-05 | 低 | 设置可访问性 | `NanoDialog.title` 传 React 元素；Modal 用 `title` 作 `aria-label`，得到 `"[object Object]"` | 标题改字符串，图标移到 body 的 `.nsw-stage-head` | 🔧 U-04 |
| F-06 | 高 | 创建幂等 | `createWorkspace` 用随机 id、无条件 PUT；顺序/并发重复提交各产生一个 marker（实测 3 个 alpha、2 个 race-1） | 客户端按对话框会话生成 `requestId`，服务端 `hash16(memberId:requestId)` + `If-None-Match:*`，冲突时回读并返回同一 marker | 🔧 U-03 |
| F-07 | 高 | 多用户 join | `joinWorkspace` 无条件 `putJson` 覆盖 marker；两个客户端并发加入时先写者的 member 行被抹掉（`race-markers.mjs` 复现） | marker 读写加 ETag CAS（4 次重试），丢失竞态则重读 | 🔧 U-02 |
| F-08 | 中 | 删除入口 | UI 与 host 都没有删除共享工作区的能力 | 新增 `POST /workspaces/delete`（成员校验 + 删 marker + 去本地 pin）、行 hover 垃圾桶按钮、danger 确认弹窗 | 🔧 U-06 |
| F-09 | 低 | settings 缓存 | 60s 缓存与 `/workspaces` 的 `registerIdentity` 不同步：身份对象已写但 `/settings` 仍报 `registered:false` | `/workspaces` 注册新身份成功后 `dropSettingsCache()` | 🔧 U-05 |
| F-10 | 低 | i18n | `joinHint` 在中英文里各定义两次，后写的身份提示覆盖「选择本地副本位置以加入」；构建告警 | 前者改名 `joinHintPick`，修正 `index.js` 引用；构建 0 告警 | 🔧 U-07 |
| F-11 | 低 | 创建对话框视觉 | 面包屑首项渲染成 `// Users / seanz`（根 crumb 名 `''` 显示为 `/`，再加分隔符） | Round 2 裁定 | 待处理 |
| F-12 | 中 | 删除语义 | 当前只删 `workspaces/{id}.json`；该 id 下的 `tree/`、`sessions/` 对象成为孤儿，本地副本目录保留 | 已在确认弹窗文案明示；是否级联清理待业主裁定 | 待裁定 |
| F-13 | — | 测试方法 | CDP clip 截图产生 deviceScaleFactor 2x 与 backdrop 伪影（假透明） | 改用 `page.screenshot()` + PIL 裁剪；非产品缺陷 | 已记录 |

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

## 5. 证据索引

| 路径 | 内容 |
|---|---|
| `scripts/eval/lib.mjs` | 测试脚手架：`.env.s3` 解析、已装 SigV4 客户端、往返探针、断言 |
| `scripts/eval/race-markers.mjs` | 无条件并发 join 丢成员 + CAS 控制组（F-07 / U-01 / U-02） |
| `scripts/eval/join-cas.mjs` | 三方并发 join 保留全部 member（U-02） |
| `screenshots/R1-sidebar-empty.png`、`R1-sidebar-empty-crop.png` | 空状态侧栏全视口 / 裁剪 |
| `screenshots/R1-view-options-menu.png` | 视图选项菜单（含设置入口） |
| `screenshots/R1-settings-stage2.png` | 修复前：已配置用户被带回第 1 步（F-04） |
| `screenshots/R1-create-dialog.png`、`R1-create-dialog-clean.png` | 创建对话框 CDP 伪影 vs 正确裁剪（F-13） |
| `screenshots/R2-settings-stage2-fixed.png` | 修复后第 2 步设置（整页截图） |
| `screenshots/R2-rebind-confirm.png` | 重新绑定 danger 确认 |
| `screenshots/R2-delete-confirm.png` | 删除共享工作区 danger 确认 |
| `/tmp/dasw-1112-dev-backup/` | dev 原始 profile/凭据/插件 lib 备份（含密钥，勿入库） |

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

### Round 2 开局检查清单

1. 确认 `~/.dsh-dev/plugins/dsh-nano-shared-workspace/lib/{client,host}.js` 仍等于本分支构建（若有人 `dsh-dev restart` 会覆盖）。
2. 决定第二客户端：桌面版补 `endpoint/region/bucket` + `DSH_NSW_IDENTITY` + 重启 app；或新建 `dsh-test.local`（端口 3085/3086、Caddy 站点、hosts、broker、同版本 `0.2.2-rc.1`）。
3. 双实例同桶不同用户名 → 跑 T-B04 / T-C01…C06。
