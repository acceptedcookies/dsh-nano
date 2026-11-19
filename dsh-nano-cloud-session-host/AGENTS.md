# dsh-nano-cloud-session-host

只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。
周围仓库、`context/`、本机手册都不在这个包里。
装好的标志：宿主 `sessionController.externalSessions.nativeViewVersion` 为 `1`，`dsh-nano-cloud-session` 的会话行点击后在原生 Chat 中打开，而不是返回 503 `NATIVE_UNAVAILABLE`。

## 身份

| 项 | 值 |
|---|---|
| 包名 | `dsh-nano-cloud-session-host` |
| 插件 id | `nano-cloud-session-host`（根行）；`nano-cloud-session-host-{session-controller,terminal-controller,workspace-files,remotes}`（替换行） |
| 版本 | 读 `package.json` 的 `version`，不要写死 |
| dsh 引擎 | 读 `package.json` 的 `engines.dsh` |
| 平台 | 仅 web |
| 宿主入口 | `index.js`（根行）；`./session-controller`、`./terminal-controller`、`./workspace-files`、`./remotes` 子路径（替换行） |
| 浏览器入口 | `lib/client.js`（组合包），`lib/client.terminal.js`（按需 chunk） |
| 宿主 inject | 替换行 `typert`；其余随上游原版 |

本包是 overlay：`cordis.patch.yml` 停用原版 `session-controller`、`terminal-controller`、`workspace-files`、`api-remotes`、`ui-conversation`、`ui-sidebar-right`、`ui-sidebar-files`、`ui-sidebar-terminal` 八行，再插入本包的替换行。替换代码是上游同版本加 `upstream/native-host.patch` 后的构建产物，业务行为不在本包里。

## 交付物

| 路径 | 角色 |
|---|---|
| `package.json` | 包名、`engines.dsh`、`files`、bundle patch、`dsh.client`、`peerDependencies` |
| `cordis.patch.yml` | 停用八个原版行，插入本包五行。`name` 是包名或包名子路径 |
| `index.js` | 根行宿主入口：原版对话偏好（`busyEnter`）的宿主半边，命名空间为 `nano-cloud-session-host`。运行时必需 |
| `lib/host-*.js` | 四个替换行宿主入口。运行时必需 |
| `lib/vendor/` | 三个替换宿主包的派生构建与 `INPUTS.json`（基线、补丁与输入的 sha256）。运行时必需，安装时不重建 |
| `lib/client.js`、`lib/client.terminal.js` | 浏览器组合包与终端 chunk。运行时必需，安装时不重建 |
| `icon.svg`、`locale/`、`DETAIL.*.md` | 图标与中英文案 |
| `upstream/`、`scripts/`、`test/` | 作者树：上游基线、补丁真源、派生脚本与测试 |

## 前置

1. `dsh --version` 落在 `package.json` 的 `engines.dsh` 内。不够或过高就停。不要自行放宽，除非操作者明确接受命令输出里的那一对版本。
2. `pnpm` 在 PATH 上。`dsh plugin` 只是把参数转给 profile 里的 pnpm。
3. 目标是已经能打开的 Web profile，默认名 `web`。不要装进 headless、sdk 或 acp。
4. 无。
5. `peerDependencies` 全部是可选 peer，由运行中的 dsh 安装提供（profile 解析器把链接插件声明为 peer 的裸导入路由到安装）。不要把它们改成 `dependencies`，也不要为它们单独安装包。

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
2. 重启并刷新后，页面里能找到本包的 client 模块（`dsh-nano-cloud-session-host`）。找不到说明 client 没进页面。
3. 页面启动 graph 里不再有八个原版 client 行（`@deepseek-ai/dsh-api-session-controller` 等），本地会话的 Chat、右侧工作台的文件与终端 tab 照常可用。
4. 宿主启动日志没有失败的 fiber；装有 `dsh-nano-cloud-session` 时，点云端会话行返回原生 Chat。

## 初次运行

无宿主初始化命令。外部会话的文件与终端资源只来自操作者自备的授权文件 `${DSH_HOME}/nano-cloud-session-grants.json`：本人所有、模式 0600 的 JSON 数组，每项绑定一个精确的 `external:` 会话 id 与一组 SSH 目标和根目录。文件不存在时没有任何授权，外部会话只读消息；文件存在但权限或内容不合法时 `session-controller` 启动失败。本包不创建、不修改这个文件，卸载也不删除它。

## 使用

无用户动作。本包只替换宿主与浏览器行；云端会话的入口、设置和操作都在 `dsh-nano-cloud-session`。

## 配置与状态

替换行 `nano-cloud-session-host-session-controller` 的 `externalWorkspaceGrants` 由补丁在授权文件存在时填入其路径；省略时回落到环境变量 `DSH_EXTERNAL_WORKSPACE_GRANTS`。对话偏好（`busyEnter`）存在 `nano-cloud-session-host` 命名空间下，不继承原版 `ui-conversation` 命名空间的旧值。

## 构建

仅当「交付物」里的运行时文件缺失，或 `upstream/` 变了。

先在上游 `upstream/BASE` 指向的提交上应用 `upstream/native-host.patch` 并完成构建，然后在本包目录执行：

```bash
npm install
npm run overlay -- --source <已打补丁并构建的上游检出>
```

然后确认运行时文件非空、`lib/vendor/INPUTS.json` 的补丁 sha256 与 `upstream/native-host.patch` 一致。不要手改 `lib/` 里的派生文件。

## 故障

| 现象 | 原因 | 处理 |
|---|---|---|
| 启动时 `session-controller` 替换行失败 | 授权文件不是本人所有的 0600 普通文件，或 JSON 不合法 | 修正权限或内容；不要用软链 |
| 宿主报裸包无法解析 | dsh 版本不在 `engines.dsh` 内，或安装缺了某个 peer | 换回匹配的 dsh 版本，不要放宽引擎 |
| 对话、文件或终端 tab 消失 | 原版行被停用但本包 client 没进页面 | 查 bundles 与 `lib/client.js`，重启宿主再刷新 |

## 不要

- 不要只装本包而手动重新启用被停用的原版行：同一服务会被两行提供。
- 不要升级 dsh 后继续用旧的 `lib/vendor/`；换基线时先重做补丁与派生构建。
- 不要把授权文件放进页面、浏览器存储或任何会进 tarball 的位置。
- 不要把 `context/` 或本机手册当成安装步骤。它们不在这个包里。
