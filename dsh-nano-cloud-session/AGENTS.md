# dsh-nano-cloud-session

只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。
周围仓库、`context/`、本机手册都不在这个包里。
装好的标志：侧栏「工作区」上方出现「云端工作区」小节，右侧有刷新 / 设置 / 新建三个原生图标按钮。

## 身份

| 项 | 值 |
|---|---|
| 包名 | `dsh-nano-cloud-session` |
| 插件 id | `nano-cloud-session` |
| 版本 | 读 `package.json` 的 `version`，不要写死 |
| dsh 引擎 | 读 `package.json` 的 `engines.dsh` |
| 平台 | 仅 web |
| 宿主入口 | `index.js` |
| 浏览器入口 | `lib/client.js` |
| 宿主 inject | `webServer`、`connection`、`sessions`、`agents`（native Chat projection） |

## 交付物

| 路径 | 角色 |
|---|---|
| `package.json` | 包名、`engines.dsh`、`files`、bundle patch、`dsh.client.inject` |
| `cordis.patch.yml` | 插入插件 id。`name` 是包名 |
| `index.js` | 宿主入口，再导出 `lib/host.js`。运行时必需 |
| `lib/host.js` | 宿主装配（family / scope / SSH / routes）。运行时必需 |
| `lib/client.js` | 浏览器包。运行时必需。安装时不重建 |
| `lib/remote/devin-workspace.mjs` | 上传到 Devin VM 的资源 MCP bridge。无 PAT、无 Chat |
| `lib/devin-api.js` | devin REST v3 客户端 bundle（测试与兼容） |
| `lib/profiles-store.js` | 凭证 profile 存储 bundle |
| `lib/route-guard.js` | 路由注册 guard bundle |
| `lib/bindings.js` | 从仓根账本按 id 烘焙的绑定表。运行时必需（`index.js` 相对 import） |
| `lib/perf-review-host.js` | 宿主 perf-review bundle。运行时必需（`index.js` 相对 import） |
| `icon.svg`、`locale/` | 图标与中英文案 |
| `src/` | 作者树。已有 `lib/` 产物时安装不需要它 |

## 前置

1. `dsh --version` 落在 `package.json` 的 `engines.dsh` 内。不够或过高就停。不要自行放宽，除非操作者明确接受命令输出里的那一对版本。
2. `pnpm` 在 PATH 上。`dsh plugin` 只是把参数转给 profile 里的 pnpm。
3. 目标是已经能打开的 Web profile，默认名 `web`。不要装进 headless、sdk 或 acp。
4. 出站打 profile 的 `baseUrl`（默认 `https://api.devin.ai`）。SSH 资源面需要本机 `ssh`/`scp` 与已 enroll 的密钥；目标固定 `ssh.devin.ai`。
5. 本包构建期依赖 `dsh-nano-ui`、`dsh-host-route-guard` 与 `dsh-performance-review`，声明为 `devDependencies` 的 `file:../packages/...`，构建时打进 `lib/`。运行中的页面不单独加载它们。不要改这条依赖。

未被告知 `DSH_HOME` 或 profile 名时，只动默认的 `web`。不要猜第二套实例。

## 安装

唯一命令：

```bash
dsh plugin --profile web add <spec>
```

`<spec>` 是本目录的绝对路径、`.tgz` 的绝对路径，或发布后的包名。

成功时写入该 profile 的 `dependencies` 和 `dsh.profile.bundles`，并应用本包的 `cordis.patch.yml`。其中 `name` 必须是包名，不能是绝对路径。

不要手改 profile 的 `package.json`。

没有 HMR 时，重启正在服务该 profile 的宿主进程，再强制刷新页面。只刷新页面不会换宿主路由。

卸载用 `dsh plugin --profile web remove`，参数是「身份」里的包名。没有 HMR 时同样要重启宿主。卸载不删除「配置与状态」里的浏览器数据或宿主状态文件。

## 验收

按顺序。前一步失败就停，不要换一个 profile 重试。失败时先看该 profile 目录下 `.plugin-manager/logs` 里这次 `dsh plugin` 的日志。

1. profile 的 `package.json` 里，`dependencies` 和 `dsh.profile.bundles` 都有本包名。
2. 重启并刷新后，页面里能找到本包的 client 模块（`dsh-nano-cloud-session`）。找不到说明 client 没进页面。
3. 侧栏「工作区」上方出现「云端工作区」。无 profile 时小节显示「尚未配置云端工作区」；点右侧齿轮打开设置弹窗。
4. 设置弹窗有「接入 / 会话 / 安全 / SSH」四个 tab；在「接入」新增 profile（label + `org-…` + `cog_` token），点「连接测试」返回 `principal_type` 即为链路打通。无反应时先确认 `lib/client.js` 存在，再重启一次宿主。不要另找一条安装路径。

## 初次运行

无宿主初始化命令。侧栏「云端工作区」小节挂载即生效；无 profile 时显示引导行。

- profile 存 `${DSH_HOME}/nano-cloud-session.json`（0600），token 只写不读，列表只回 `hasSecret`；新 token 必须是 `cog_` 前缀形态。
- 空 store 首次启动会从 `DEVIN_API_TOKEN` / `DEVIN_ORG_ID` / `DEVIN_API_BASE` 环境变量或 `${DSH_HOME}/nano-cloud-session.env` 种子一个 profile。
- 会话的 canonical 状态在 carrier（Devin 云），侧栏小节只做轮询视窗；插件不复制会话数据。
- 浏览器默认值存 `localStorage['dsh-nano-cloud-session:defaults.v1']`，只含新建偏好，不含 token。

宿主 `Config` 只提供默认：`requestTimeoutMs` 20000、`defaultFirst` 50、`pollIntervalMs` 5000。越界值被拒绝。

## 使用

| 动作 | 结果 |
|---|---|
| 侧栏「云端工作区」→ 设置（齿轮） | 打开「接入 / 会话 / 安全 / SSH」原生设置弹窗；Devin 的 token/Org/Base URL/连接测试/权限清单都在「接入」tab。删除某个 profile 是不可逆的（token 只写不读），须在宿主 `RiskConfirmation` 里勾选确认才能点删除 |
| 侧栏「云端工作区」→ 新建（文件夹+） | 打开新建云会话弹窗（上传附件 → 创建后会在右侧原生工作台的附件 tab 可见） |
| 云端工作区 → 展开 → 点会话行 | 有 H-CHAT 时打开原生 Chat；否则 mint 一个无 Agent 的 workbench 宿主会话。工作台展示 API 对话、三面健康度、附件/tags/insights。禁止本地终端回退 |
| 新建 | prompt（必填）+ 全量 create 字段：title/tags/repos/devin_mode/max_acu_limit/resumable/playbook/knowledge/secrets/attachments/platform/structured output/security profile 等 → `POST /v3/organizations/{org}/sessions` |
| 休眠 | `POST /v3/organizations/{org}/sessions/{id}/sleep`，保留 VM 快照 |
| 归档 / 取消归档 | 对应 upstream archive / unarchive；归档前弹 `NanoDialog` 危险确认，取消不发请求 |
| 中止 | `DELETE` upstream——存活 session → suspended；**不是硬删除、不自动归档**，收尾需再点归档。中止前必须在 `RiskConfirmation` 里勾选确认，未勾选时确认键禁用、Enter 不触发 |
| SSH 命令 | 设置弹窗「SSH」tab 生成/显示专用密钥对（`${DSH_HOME}/nano-cloud-session-ssh`，0600），复制 `ssh -i <key> devin-<id>@ssh.devin.ai`；公钥粘到 Devin 后台 SSH keys 一次性 enroll（账号级） |

宿主路由（全部 POST、全部走 route-guard）：`/nano-cloud-session/{status,config,sessions,session,create,message,archive,unarchive,terminate,ssh,catalog,upload,workspace,resources}`。`session` op 含 native_open/workspace_shell/get/messages/attachments/insights/generate_insights/tags/set_tags/append_tags/sleep。`native_open` 仅在正式 H-CHAT（`ctx.externalChat` 且 `externalProjection`）存在时投影；否则 503 `NATIVE_UNAVAILABLE`，不造 fake Agent。无 profile 且 H-CHAT 存在→`NATIVE_UNSUPPORTED` 422。`workspace_shell` 只 mint 工作台宿主会话。`/workspace` op：connect/status/disconnect/inspect。`/resources` 投影 workspace family 的 fs/process 操作。`/ssh` 仍是信息路由。错误面区分 `httpStatus` 与 `providerStatus`；403 表示「无权或不可见」。

## 配置与状态

宿主配置可整段省略。profile 文件 `${DSH_HOME}/nano-cloud-session.json`（0600）。浏览器侧不持久化任何凭证；新建偏好与轮询偏好存 `localStorage['dsh-nano-cloud-session:defaults.v1']`。

## 构建

仅当「交付物」里的运行时文件缺失，或你刚改了 `src/`。

在本包目录执行：

```bash
npm install
npm run build
```

然后确认运行时文件非空。不要安装一份缺少这些文件、又不是你刚刚构建的树。

## 故障

| 现象 | 原因 | 处理 |
|---|---|---|
| 侧栏没有「云端工作区」 | client 没进页面、宿主没重启，或工作区小节尚未渲染 | 查 bundles 与 `lib/client.js`，重启宿主再刷新 |
| 连接测试 `unreachable` | 出站被拦或 baseUrl 错 | 查 `baseUrl` 是否 `https://api.devin.ai`、网络是否可达 |
| 列表/详情 403 | token 失效、org 不配、或 session 对调用者不可见（上游 fail-closed） | 换 token / 核 orgId；403 不等于「不存在」 |
| 429 | 上游限速 | 降轮询频率，稍后重试 |
| profile 存不了 | `DSH_HOME` 不可写或 JSON 损坏 | 查文件权限；坏了先备份再删重建 |

## 不要

- 不要把 token 写进 `src/`、`lib/`、浏览器存储、远端 bridge 或任何会进 tarball/页面的位置——token 只在 `${DSH_HOME}/nano-cloud-session.json`（0600）和请求头里。
- 不要把云工作区终端/文件回退到本机 cwd；H-EXEC/H-CHAT 缺失时显式 unavailable。
- 不要开放浏览器 `/mcp` 入口，不要 `StrictHostKeyChecking=no`。
- 不要把「中止」当成删除记录或归档；upstream DELETE 只中止，session 仍可读。
- 不要把 403 渲染成「会话不存在」。
- 不要装进非 web profile 后期待出现云端工作区。
- 不要恢复悬浮启动器或右下角浮动入口；侧栏「云端工作区」是唯一入口。
- 不要用 `[class*=…]`、`:has()` 或宿主列表几何变量去读侧栏 / composer 的内部结构。小节只按 `data-slot="sidebar.workspaces"` 的 slot 属性插在自己那一格，标题行、会话行、折叠态一律用宿主 primitive（`Button`、`DisclosureRow`、`StateDot`、`Tag`、`Icon*`）加令牌自绘；原生外壳的像素对齐是 DESIGN.md §8 已登记的宿主缺口。
- 不要把 Devin 标签搬回 composer 或另找挂载点；宿主没有会话来源标识的挂载点（DESIGN.md §8）。
- 不要把 `context/` 或本机手册当成安装步骤。它们不在这个包里。
