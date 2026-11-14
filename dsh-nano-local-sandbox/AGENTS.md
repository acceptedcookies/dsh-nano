# dsh-nano-local-sandbox

只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。
周围仓库、`context/`、本机手册都不在这个包里。
装好的标志：profile 的 bundles 里有本包名，插件 id 是 `nano-local-sandbox`。本包没有第二套设计界面。

## 身份

| 项 | 值 |
|---|---|
| 包名 | `dsh-nano-local-sandbox` |
| 插件 id | `nano-local-sandbox` |
| 版本 | 读 `package.json` 的 `version`，不要写死 |
| dsh 引擎 | 读 `package.json` 的 `engines.dsh` |
| 平台 | 仅 web |
| 宿主入口 | `index.js` |
| 浏览器入口 | 无。本包不是第二个产品面 |
| 宿主 inject | `webServer`、`connection`、`sandboxPolicy`、`sandbox`、`sessions` |

## 交付物

| 路径 | 角色 |
|---|---|
| `package.json` | 包名、`engines.dsh`、`files`、bundle patch |
| `cordis.patch.yml` | 插入插件 id。`name` 是包名 |
| `index.js` | 宿主。运行时必需。只经 `registerRoutes` 注册路由 |
| `src/host/backend-apple.js` | 本包唯一允许调用容器 CLI 的文件 |
| `src/host/backend-nvx.js` | 会失败的空实现。不是 Windows 后端 |
| `src/host/` | 实例、profile、CDP、terminal、错误目录 |
| `profiles/kitesurf/` | kitesurf 配方与 manifest。`linux-prefix/` 不入库 |
| `profiles/terminal/` | 终端 PTY 入口 |
| `lib/route-guard.js`、`lib/route-table.js` | 路由注册。运行时必需 |
| `icon.svg`、`locale/` | 图标与中英文案 |

特权只写在这里和 `backend-apple.js`：容器 CLI，以及构建期的 `ctx.sandbox.confine`。不写消费者的路径。

## 前置

1. `dsh --version` 落在 `package.json` 的 `engines.dsh` 内。不够或过高就停。不要自行放宽，除非操作者明确接受命令输出里的那一对版本。
2. `pnpm` 在 PATH 上。`dsh plugin` 只是把参数转给 profile 里的 pnpm。
3. 目标是已经能打开的 Web profile，默认名 `web`。不要装进 headless、sdk 或 acp。
4. 本机 Apple `container` 只在真正构建或启动 macOS 实例时需要。没有 CLI 时，夹具 backend 仍须能完成契约测试。
5. 本包构建期依赖 `dsh-host-route-guard`，声明为 `devDependencies` 的 `file:../packages/dsh-host-route-guard`。运行中的宿主不解析这个包名；`lib/route-guard.js` 是打进本包的副本。不要改这条依赖。

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

卸载用 `dsh plugin --profile web remove`，参数是「身份」里的包名。没有 HMR 时同样要重启宿主。

## 验收

按顺序。前一步失败就停，不要换一个 profile 重试。失败时先看该 profile 目录下 `.plugin-manager/logs` 里这次 `dsh plugin` 的日志。

1. profile 的 `package.json` 里，`dependencies` 和 `dsh.profile.bundles` 都有本包名。
2. 重启后宿主能加载 `index.js`。本包没有浏览器面板，不要到右侧工作区找第二个设计界面。
3. `node --test test/*.mjs` 退出码为 0。

## 初次运行

无宿主初始化命令。`apply` 不创建容器。实例只在 `ensure` 时创建。

## 使用

| 动作 | 结果 |
|---|---|
| `sandbox.instance.ensure` | 按 session 复用或创建实例 |
| 策略指纹变化 | `sandbox.instance.policy-stale`，不热改挂载 |
| 终端 attach | 只认返回的 `attach.url` |

## 配置与状态

profile 的唯一权威是 `profiles/kitesurf/profile.yaml`。实例状态在该实例自己的 `stateVolume`。没有第二份 history 文件。

## 构建

容器镜像构建必须经过 `ctx.sandbox.confine`。`ctx.sandbox` 不在时构建失败，不降级到裸 spawn。

```bash
npm test
```

## 故障

| 现象 | 原因 | 处理 |
|---|---|---|
| `dsh plugin add` 报引擎不符 | `engines.dsh` 与正在跑的 dsh 不一致 | 换符合范围的 dsh，或在操作者明确接受风险后执行命令输出里的 `allow-version`。不要改本包的 `engines` |
| 构建直接失败 | 没有 `ctx.sandbox` | 这是失败关闭，不要改成裸 spawn |
| NVX 方法拒绝 | 该后端尚未实现 | 不要把拒绝改成成功 |

## 不要

- 不要在这个包以外调用容器 CLI。
- 不要加浏览器设计界面来冒充另一个产品。
- 不要把 `context/` 或本机手册当成安装步骤。它们不在这个包里。
