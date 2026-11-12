# dsh-nano 插件开荒手册

> 面向「第一次在本仓库里写 dsh 插件的 agent / 人」。
> 本文件位于仓库根，**读者是在本仓库里改代码的人**，因此可以引用 `docs/`、`context/`、本机手册和 git 忽略文件。
> 这与随 tarball 分发的包内 `AGENTS.md` 相反：包内那份必须自洽，不能依赖本文件（见 [AGENTS.md](AGENTS.md) 第 5 行）。
> 文档日期锚点：2026-11-11。版本、路径、实例状态都以下面的「版本锚点」为准，改环境后先更新这里。

---

## 0. 先读这里

### 0.1 一句话主线

本仓库把 **一个 npm 包** 做成 **一个 dsh 组合包（bundle）**：`package.json` 声明 `dsh.bundle.patch` 与 `dsh.client`，`cordis.patch.yml` 把自己插进宿主 Cordis 的 entry 树，宿主半侧是 `index.js` 导出的 Node ESM 插件，浏览器半侧是 `lib/client.js` 里的 `window.__ModuleLoader__.load` 工厂；`src/` 只是作者树，`npm run build` 用 esbuild 把共享包一起打进 `lib/`，`npm pack` 只带 `lib/` 与声明文件，安装侧用 `dsh plugin --profile web add` 登记进 profile，**下次启动**宿主才把 patch 层叠加生效。

四个 overlay 插件、三个构建期共享包、三套本机实例、一套分发信任链和一套性能预算，都是这条主线的变体。

### 0.2 版本锚点（pinned）

| 项 | 值 | 出处 |
|---|---|---|
| dsh 运行时 | `@deepseek-ai/dsh@0.2.2-rc.1` | 本机安装版 `package.json` |
| 对应上游 tag | `dsh-v0.2.2-rc.1`（`66491b05`） | [.local-dsh-setup.md](.local-dsh-setup.md) §0 |
| Node | `v24.22.2`（nvm，未改系统默认 Node 22） | 同上 |
| 安装位置 | `~/.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh` | 同上 |
| 四个插件的 `engines.dsh` | 全部 `>=0.2.2-rc.1 <0.3.0` | 各包 `package.json` |
| 构建工具 | `esbuild 0.25.0`（各包 `devDependencies` 锁死） | 各包 `package.json` |
| 目标 profile | `web`（不要装进 headless / sdk / acp） | [docs/agents/TEMPLATE.md](docs/agents/TEMPLATE.md) |
| 反代 | Caddy `v2.11.9`，本地 CA | [.local-dsh-setup.md](.local-dsh-setup.md) §0 |
| 桌面版 | `/Applications/DeepSeek Harness.app`，`0.2.2-rc.1` | [.local-desktop-setup.md](.local-desktop-setup.md) §0 |
| 实验室浏览器 | ego-lite / Chromium 156 | [lab/README.md](lab/README.md) |
| 插件版本 | notepad / model-selector / explorer-extra `0.1.1`；shared-workspace `0.1.0` | 各包 `package.json` |

> **真源纪律**：正在执行的 dsh 是上面那份 npm 包（只有 `lib/`，没有 `.git`、没有 `src/`）。[context/deepseek-harness/](context/deepseek-harness/AGENTS.md) 是超前于发布标签的 GitHub `master` 源码检出，**只用来查接口与文档，不参与启动、不是版本真源**。类型与接口以已安装包的 `lib/types` 为准。

### 0.3 核心焦点必读地图

| 优先级 | 读什么 | 解决什么问题 |
|---|---|---|
| **立刻** | [AGENTS.md](AGENTS.md)（55 行） | 仓库边界、包内 AGENTS.md 的自洽要求、A2A onboarding 状态 |
| **立刻** | 本文件 §0–§2 | 版本锚点、三实例拓扑、插件机制全貌 |
| **动手前** | [docs/agents/TEMPLATE.md](docs/agents/TEMPLATE.md) | 包内 `AGENTS.md` 的骨架与不变段落（改安装合同先改这里） |
| **动手前** | 目标包的 `AGENTS.md`（如 [dsh-nano-notepad/AGENTS.md](dsh-nano-notepad/AGENTS.md)） | 该包身份、交付物、前置、验收、故障 |
| **动手前** | 目标包 `package.json` + `cordis.patch.yml` + `scripts/build-client.mjs` | 声明合同与构建合同 |
| **排障** | [.local-dsh-setup.md](.local-dsh-setup.md) §9 / §14 | 双 web 实例的进程、端口、日志、`--patch` 验证 |
| **排障** | [.local-desktop-setup.md](.local-desktop-setup.md) §5 | 桌面版 home 隔离与 `kickstart` 陷阱 |
| **发布** | [release.md](release.md) | `npm pack`、SHA-256、attestation/cosign、卸载残留 |
| **性能** | [docs/specs/dsh-nano-performance-review/spec-26nov.md](docs/specs/dsh-nano-performance-review/spec-26nov.md)、[lab/README.md](lab/README.md) | 观测合同、预算、判定口径 |
| **深挖机制** | [context/deepseek-harness/docs/cordis-primer.zh.md](context/deepseek-harness/docs/cordis-primer.zh.md)、[context/deepseek-harness/docs/cookbook/extension-cookbook.zh.md](context/deepseek-harness/docs/cookbook/extension-cookbook.zh.md)、[context/deepseek-harness/docs/user/develop/basic/publish.zh.md](context/deepseek-harness/docs/user/develop/basic/publish.zh.md) | Cordis 五概念、插件形态、官方打包教程 |
| **深挖机制** | 已安装版的 [dsh-app-boot/README.zh.md](/Users/seanz/.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-app-boot/README.zh.md)、[dsh-client-modules/README.zh.md](/Users/seanz/.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/README.zh.md)、[dsh-plugin-manager/README.zh.md](/Users/seanz/.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-plugin-manager/README.zh.md) | 与本机运行版本逐字一致的权威合同 |

### 0.4 三条不可违背的红线

1. **不要把本机路径写进发布物**：`cordis.patch.yml` 的 `name` 发布时必须是包名；只有本机开发启动器才把它改写成绝对路径。绝对路径、launchd、`~/.dsh*` 一律不进包内 `AGENTS.md`。
2. **不要装一份没构建过的树**：`src/` 不进 tarball，运行时只读 `lib/`；`files` 少列一个 `lib/*.js`，发包即坏。
3. **不要在没要求时执行危险动作**：提交、拉取、切分支、删除、清空笔记、跑 `/imagine`，都要用户明确要求。

---

## 1. 本机拓扑结构：正式 / 开发 / 桌面

### 1.1 三套实例总表

| | 日常（正式） | 插件开发 | 桌面版 |
|---|---|---|---|
| 入口 | `https://dsh.local/` | `https://dsh-dev.local/` | `/Applications/DeepSeek Harness.app` |
| 形态 | CLI `dsh --profile web` | CLI `dsh --profile web --patch …` | Electron（`com.deepseek.dsh`），profile 名 `desktop` |
| dsh 进程 | `127.0.0.1:3081` | `127.0.0.1:3083` | app 自己 spawn `dsh-desktop-host` |
| token broker | `3082` | `3084` | 无（Electron 自管） |
| `DSH_HOME` | `~/.dsh` | `~/.dsh-dev` | `~/.dsh-desktop` |
| 凭据 | `~/.dsh/.credentials.yaml` | 从日常复制一份（600），**不要软链** | 首次启动自建 |
| 挂本仓库插件 | **否** | **是**（用途所在） | 是（手册 §4 标注 4 个插件） |
| 管理命令 | `dsh-local start\|stop\|restart\|status\|open\|logs -f` | `dsh-dev start\|stop\|restart\|status\|open` | Finder/Dock 启动；`launchctl setenv` 钉 home |
| LaunchAgent | `ai.deepseek.dsh.web` / `.mdns` / `.tokenbroker` | `ai.deepseek.dsh.dev.web` / `.dev.mdns` / `.dev.tokenbroker` | `ai.deepseek.dsh.env`（登录恢复 `setenv`） |
| 日志 | `~/Library/Logs/dsh-web.log` / `.err.log` | `~/Library/Logs/dsh-dev-web.log` / `.err.log` | `~/.dsh-desktop/logs/` |
| 插件副本 | 无 | `~/.dsh-dev/plugins/<插件名>/` | `~/.dsh-desktop/plugins/dsh-nano-*` |

三套共用**同一份**已安装 dsh 与**同一个** Caddy 进程；分开的是进程、端口、数据目录、日志、cookie 和 IndexedDB。`3080` 被 Cursor 占用，两个 web 实例都不用。

### 1.2 真源分层（最容易搞混的一张表）

| 你要改/查的东西 | 真源 | **不是**真源 |
|---|---|---|
| 正在执行的 dsh 本身 | npm 包 `.../@deepseek-ai/dsh/lib/`（`0.2.2-rc.1`） | `context/deepseek-harness`（超前的 master 检出） |
| 类型与接口 | 已安装包的 `lib/types` | 超前源码的 `src/` |
| 插件源码 | `/Users/seanz/Documents/dsh-plugins/<插件名>/` | 任何 `~/.dsh*` 里的副本 |
| 开发实例实际加载的插件 | `~/.dsh-dev/plugins/<插件名>/` | 仓库目录（LaunchAgent 读不到 `~/Documents`） |
| 桌面版实际加载的插件 | `~/.dsh-desktop/plugins/dsh-nano-*` | 仓库目录 |
| 浏览器里的插件数据 | 各 origin 自己的 IndexedDB / localStorage | 宿主文件系统 |
| 生效配置 | `dsh --profile web --dump-config` 的合成结果 | 单个 `cordis.patch.yml` 文件 |

> 桌面版隔离靠的是 `DSH_HOME`：`launchctl setenv DSH_HOME /Users/seanz/.dsh-desktop` 管 GUI 全局，plist `EnvironmentVariables.DSH_HOME` 把日常 web 钉回 `~/.dsh`，`/opt/homebrew/bin/dsh` wrapper 把终端 CLI 也钉回 `~/.dsh`。桌面版与 CLI 共用同一个 `resolveDshHome`（`configured` > `$DSH_HOME` > `~/.dsh`），**只在进程启动时读一次**。详见 [.local-desktop-setup.md](.local-desktop-setup.md) §1–§2。

### 1.3 网络与鉴权链路

```
Browser ──https://dsh.local/──► mDNS(dsh.local→127.0.0.1) ──► Caddy :443（本地 CA 终止 TLS）
                                      ├─ 裸 / 且无 dsh-auth-* cookie → token broker :3082
                                      │     读 dsh-web.log 最后一次 token → 302 /?token=...
                                      └─ 其余请求 → dsh web :3081
                                            token 换 30 天签名 cookie（HttpOnly/SameSite=Strict）
                                            → 303 到干净的 /
```

`dsh-dev.local` 是同一 Caddy 里的第二个站点，链路同构，端口换成 3084/3083。关键启动参数：

```text
# 日常（无 --patch）
dsh --profile web --no-open --host 127.0.0.1 --port 3081 \
  --public-url https://dsh.local/ --trusted-host dsh.local

# 开发（--patch 必须放在 --no-open 前面）
dsh --profile web \
  --patch /Users/seanz/.dsh-dev/plugins/<插件名>/cordis.patch.yml \
  --no-open --host 127.0.0.1 --port 3083 \
  --public-url https://dsh-dev.local/ --trusted-host dsh-dev.local
```

`--public-url` / `--trusted-host` 让 dsh 接受反代 authority；缺了会被 Host/Origin 围栏拒绝。token 每次重启都变，**不要收藏带 token 的 URL**，靠 broker 自动换 cookie。

### 1.4 启动说明

```sh
dsh-local start                 # 启动 mDNS + broker + dsh + Caddy，等待就绪
dsh-local status                # 全链路状态
dsh-local open                  # 打开裸地址
dsh-local restart               # 重启全部（会换 token；cookie 仍有效）
dsh-local logs -f               # 跟随日志

dsh-dev start                   # 先同步插件，再拉起 3083
dsh-dev restart                 # 改完插件后用这个
dsh-dev stop                    # 只停开发侧，日常实例继续
dsh-dev open
```

单独重启组件：`launchctl kickstart -k gui/$(id -u)/ai.deepseek.dsh.dev.web`（broker / mdns 同理），Caddy 是系统级 `sudo launchctl kickstart -k system/local.dsh.caddy`。

> **坑**：`kickstart -k` **不重读 plist**。改了 `EnvironmentVariables`（尤其 `DSH_HOME`）必须 `launchctl bootout` 再 `bootstrap`，否则进程继承 GUI 全局的 `~/.dsh-desktop`，导致 3081 拿错凭据、旧 cookie 验不过。核对方法：`lsof -nP -p <3081的PID> | grep credentials` 必须是 `~/.dsh/.credentials.yaml`。详见 [.local-dsh-setup.md](.local-dsh-setup.md) §4.3 与 [.local-desktop-setup.md](.local-desktop-setup.md) §5.8。

开机/登录自启顺序：Caddy（开机）→ mDNS → token broker → dsh web（登录）→ 浏览器裸地址自动登录。dsh web 在登录前不启动，开机未登录时 502 是正常的。

### 1.5 桌面版的数据布局与同步

```
~/.dsh-desktop/
├── settings.yaml            # llm-pi-ai providers（会被 importLegacyDocument 改名成 .imported）
├── .env                     # MAGPIE_GATEWAY_KEY
├── .credentials.yaml
├── plugins/dsh-nano-*       # 4 个插件副本（只拷 lib/）
├── sessions/  storages/
└── profiles/desktop/
    ├── package.json         # dependencies + dsh.profile.bundles
    ├── cordis.patch.yml     # llm-pi-ai providers + agent-default-model + UI 偏好
    └── node_modules/dsh-nano-* -> ../../../plugins/dsh-nano-*   # 手动符号链接
```

`desktop` profile 被 Electron 独占，`dsh --profile desktop --dump-config` 会拒绝；要 dry-run 就克隆成 `profiles/test/` 再 dump（[.local-desktop-setup.md](.local-desktop-setup.md) §5.4）。`node_modules` 是手动链接，可能被 app 自己的 pnpm bootstrap 重整，插件消失时先查链接。

同步单个插件到桌面版（手册 §6 的配方）：

```sh
cd /Users/seanz/Documents/dsh-plugins/dsh-nano-notepad && node scripts/build-client.mjs
rm -rf ~/.dsh-desktop/plugins/dsh-nano-notepad && mkdir -p ~/.dsh-desktop/plugins/dsh-nano-notepad
cp package.json index.js cordis.patch.yml lib/ ~/.dsh-desktop/plugins/dsh-nano-notepad/
# 之后：patch 绝对路径重写 + package.json 剥掉构建期 file: 依赖 + 重启桌面版
```

「剥掉 `dsh-nano-ui` / `dsh-performance-review`」是因为那边不拷 `node_modules`：运行时只认 `lib/` 里已 bundle 的产物，`package.json` 里留着 `file:` 依赖反而解析不到。

### 1.6 开发循环（本仓库日常工作模式）

1. 改 `/Users/seanz/Documents/dsh-plugins/<插件名>/src/` 里的源码。
2. 在该目录 `npm run build`（重写 `lib/client.js` 及宿主侧产物）。
3. `dsh-dev restart`：把 `package.json`、`index.js`、`cordis.patch.yml`、`lib/` 同步到 `~/.dsh-dev/plugins/`，并把 patch 的 `name:` 改写成这份副本的绝对路径，重启 3083。
4. 刷新 `https://dsh-dev.local/`。**不要刷新 `dsh.local` 看插件，那边没有这份 overlay。**

`--patch` 只在开发进程启动时读一次；只改副本会被下次 restart 覆盖，只改仓库不 restart 正在跑的页面不会变。新增插件时，在仓库根下建一个含 `cordis.patch.yml` 的目录，下次 restart 会按目录名排序给每个这样的目录加一条 `--patch`。

### 1.7 验证口径

```sh
ps -ax -o command | grep 'port 3083' | grep -v grep          # 必须能看到 --patch，路径在 ~/.dsh-dev/plugins 下
curl -sS -c /tmp/dev-jar -b /tmp/dev-jar -o /tmp/dev.html -L \
  -w 'code=%{http_code} url=%{url_effective} redirects=%{num_redirects}\n' \
  https://dsh-dev.local/                                      # 期望 200 / 裸地址 / 两次跳转
grep -o 'dsh-nano-notepad' /tmp/dev.html | head               # 启动图里应有插件名
grep -c 'dsh-nano-notepad' /tmp/daily.html                  # 日常站应为 0
```

插件包地址写在页面 `__DSH_BOOT__` 里，形如 `/plugins/??dsh-nano-notepad/client.js&rev=…`，带同一次 cookie 访问应返回 200。插件启动失败先看 `~/Library/Logs/dsh-dev-web.err.log`，再看 `~/.dsh-dev/logs/startup-*.log`。

---

## 2. deepseek-harness 插件机制

### 2.1 底座：everything is a plugin

dsh 是 **all-plugin Cordis agent harness**。[context/deepseek-harness/docs/cordis-primer.zh.md](context/deepseek-harness/docs/cordis-primer.zh.md) 的五个核心概念：

- 插件是带可选 `inject` 与 `apply(ctx)` 的对象；
- 上下文是服务容器，服务占据稳定的 `ctx.<key>`（`ctx.webServer`、`ctx.llm`、`ctx.sessions`…）；
- `inject` 声明服务依赖，服务就绪后插件才启动，加载顺序由依赖表达；
- 事件用 `emit` / `waterfall` / `parallel` / `serial` / `bail` 分发；
- **注册是可逆副作用**：一切通过 `ctx.effect()` / `ctx.on()` 安装，reload 与 teardown 会撤销。

[context/deepseek-harness/docs/cookbook/extension-cookbook.zh.md](context/deepseek-harness/docs/cookbook/extension-cookbook.zh.md) 的「功能→机制映射」表说明产品功能全部落在文档化扩展点上，**没有任何一行修改 agent 主循环**。

### 2.2 profile = 有序 patch 叠加

profile 位于 `$DSH_HOME/profiles/<name>`，根目录是一张空 entry 列表。生效配置按以下顺序逐层叠加（后应用的层按行胜出）：

1. `dsh.profile.bundles` 里各组合包的 patch，按列表顺序；
2. profile 自己的 `cordis.patch.yml`；
3. home 级 `$DSH_HOME/cordis.patch.yml`（机器本地偏好，优先级高于 profile 层）；
4. 每个 `--patch <path>` overlay，按 argv 顺序；
5. telemetry 开关。

可用 `dsh --profile web --dump-config` 预览合成后的树，`--dump-config-schema` 看配置 schema（`--dump-config-schema` 会导入插件模块，只对已信任的 profile 跑）。安装/启停 bundle 会改写有序的 `dsh.profile.bundles`，**开启追加到末尾，可能改变配置优先级**。

### 2.3 三个词：bundle / overlay / patch

| 词 | 含义 |
|---|---|
| **组合包（bundle）** | 声明了 `dsh.bundle.patch` 的 npm 包，贡献一层配置。实体就是 patch 文件。没有 `dsh.bundle` 的包也能装，但只是普通依赖，不激活任何层 |
| **overlay 插件** | 本仓库对自身插件的定位：不改核心，靠 patch 插入自己的宿主行，靠 `ctx.slots.inject` 接管/遮蔽 Web GUI 已有座位 |
| **patch / overlay 文件** | `cordis.patch.yml` 是 `cordis-plugin-include` 的 `PatchOptions` 数组；`--patch` 是启动时叠加的一次性覆盖层（开发实例就靠它） |

官方权威教程：[打包与安装插件](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)（本地副本 [context/deepseek-harness/docs/user/develop/basic/publish.zh.md](context/deepseek-harness/docs/user/develop/basic/publish.zh.md)）。

### 2.4 `package.json` 合同

以 [dsh-nano-notepad/package.json](dsh-nano-notepad/package.json) 为蓝本：

| 字段 | 约定 |
|---|---|
| `name` / `version` | 包名；`version` = git tag 去掉 `v`，CI 断言一致 |
| `type` / `main` | `"module"` / `./index.js`（宿主入口） |
| `engines.dsh` | `>=0.2.2-rc.1 <0.3.0`。安装前预检 + 启动侧第二道闸，不满足不 import；豁免写 `compatibility.json`，**不要改本包的 engines** |
| `exports."./client"` | `./lib/client.js`。client-modules 强制要求，缺失则激活失败 |
| `exports."./icon"` / `"./locale/*.json"` | 图标与中英文案；宿主用 `meta` 读标题/描述/详情文档 |
| `files` | tarball 白名单：`index.js`、`AGENTS.md`、`cordis.patch.yml`、`icon.svg`、`locale`、各 `lib/*.js`。**`src/` 不进包** |
| `dsh.bundle.patch` | `./cordis.patch.yml`（也接受有序文件数组） |
| `dsh.client.platform` | `web`；非 web 会被 client-modules 跳过 |
| `dsh.client.inject` | 包级模块图依赖边（官方客户端包 id），宿主据此让动态提供方先于消费方加载、做 preflight 与 HMR diff |
| `dsh.client.external` | 基座之外的精确请求才需要声明；本仓库的 external 全在冻结的 `PLATFORM_MODULES` 里，无需声明 |
| `dependencies` | 三个 `file:../packages/...` 的构建期源码依赖（见 §3） |

### 2.5 `cordis.patch.yml` 语义

```yaml
# 最简：向根 entry 列表追加一行
- insert:
    - id: nano-notepad
      name: dsh-nano-notepad

# 覆盖已有行：整块替换 config，不深合并
- id: ui-context-menu
  config:
    resolutionTimeoutMs: 4000
```

规则（源码 [context/deepseek-harness/vendor/include/src/patch.ts](context/deepseek-harness/vendor/include/src/patch.ts):47-109）：

- `- insert: [...]` 不带外层 `id` → 追加到根 entry 列表；带 `id` 且目标是 group → 插入该 group 的 config 数组。
- `- id: X / config:` → 按 id 找已有行，**逐字段覆盖整块 config**；`name` 在 override 行里只是匹配断言，在 `insert` 行里才是模块名。
- `name` 可以是**包名、绝对文件路径或 file URL**：`insert` 行里的绝对/相对路径会被 `anchorInsertedPluginNames` 转成 `file://` URL（[context/deepseek-harness/packages/boot/app-boot/src/index.ts](context/deepseek-harness/packages/boot/app-boot/src/index.ts):546-556）。发布用包名，开发启动器用绝对路径，就是这条规则的两端。
- patch 支持 `!!js` 表达式（**不是 `!js`**）用于 `config` 与 `disabled`。

### 2.6 宿主半侧：Node ESM 插件

```js
export const name = 'nano-notepad'
export const inject = ['webServer', 'connection', 'subprocess']
export const Config = { '~standard': { version: 1, vendor: '...', validate(value) { /* 返回 { value } 或 { issues } */ } } }
export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: '/nano-notepad/read', handler }), 'label')
}
```

- **只能用具名导出，禁止 `export default`**：`unwrapExports` 优先取 `.default`，写了 default 会丢掉 `name` / `inject` / `Config`（事故全文 [context/deepseek-harness/docs/postmortem/0001-acp-default-export-drops-inject.md](context/deepseek-harness/docs/postmortem/0001-acp-default-export-drops-inject.md)）。
- `inject` 两种失败机制：用 `ctx.foo` 却没声明 → 属性代理抛 `cannot get property "foo" without inject`；声明了但没有提供者 → fiber 停在 `PENDING`，命中 required 启动条目才让整个应用退出。本仓库刻意把所有服务列进 `inject` 作为启动期护栏（见 [dsh-nano-explorer-extra/src/host/entry.js](dsh-nano-explorer-extra/src/host/entry.js) 注释）。可选服务用 `ctx.get(name)` 软读取。
- `Config` 用 `~standard` schema，越界值拒绝；配置来自 patch 层，不写在包里。
- 所有注册走 `ctx.effect(() => disposer, label)`；`ctx.webServer.register` / `ctx.skills.register` 返回 disposer。
- 服务提供者都是 `extends Service + super(ctx,'<name>')`：`webServer`（[packages/host/webserver/src/index.ts](context/deepseek-harness/packages/host/webserver/src/index.ts)）、`skills`（[packages/skill/skill/src/index.ts](context/deepseek-harness/packages/skill/skill/src/index.ts)）、`connection`（[packages/client/connection/src/rpc-host.ts](context/deepseek-harness/packages/client/connection/src/rpc-host.ts)）。

### 2.7 浏览器半侧：`__ModuleLoader__` 工厂

四个 `lib/client.js` 的头完全相同：

```js
window.__ModuleLoader__.load({
  id: "dsh-nano-notepad",
  factory: (require) => {
    /* esbuild IIFE，赋值给 __notepadExport */
    return __notepadExport;
  }
});
```

链路（权威说明 [dsh-client-modules/README.zh.md](/Users/seanz/.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/README.zh.md)）：

1. 宿主扫描已启用的 Loader entry，把声明 `dsh.client` 的包组成浏览器启动图，注入 `window.__DSH_BOOT__`；所以 `cordis.patch.yml` 里插一行包名，浏览器侧就自动有一行。
2. 页面以 combo 脚本 `/plugins/??<pkg>/client.js&rev=…` 懒加载；**执行 bundle 只注册 factory**，模块副作用在首次物化时运行。
3. 外壳初始化冻结的 `PLATFORM_MODULES` 共享表（react / react-dom / cordis / primitives…），factory 的同步 `require` 先查这张表。本仓库把 `react`、`react-dom`、`react-dom/client`、`@deepseek-ai/dsh-client-ui-primitives` 设为 esbuild `--external`，产物里变成 `require("react")` 等，由 shell 提供同一份实例。
4. **两层 `inject` 必须分清**：`package.json` 的 `dsh.client.inject` 是包级模块图依赖边；`lib/client.js` 里 `export const inject = ['slots','theme','locale',…]` 才是 Cordis 服务级激活门禁。
5. `apply(ctx)` 用 `ctx.slots.inject(seat, () => ctx.slots.register(...))` 接管座位；单座位靠注册顺序选举，没有 `priority` 覆盖旋钮（见 [dsh-nano-model-selector/src/client/index.jsx](dsh-nano-model-selector/src/client/index.jsx) 注释）。

### 2.8 构建：`npm run build` 是契约的一部分

四个 `scripts/build-client.mjs` 同构：宿主侧 `esbuild --bundle --format=esm --platform=node`（**不加** `--packages=external`，因为开发实例只拷 `lib/` 不拷 `node_modules`，所有裸 import 必须被打进产物，只剩 `node:*` 外置）；浏览器侧 `--format=iife --global-name=__xxxExport --minify --platform=browser` 加四个 external；最后把 IIFE 文本原样嵌进 `window.__ModuleLoader__.load({ id, factory })` 并删中间文件。

`--global-name` 是必需的：让产物把导出赋给一个命名全局，而不是去猜被 minify 改名的内部绑定（构建脚本注释里记录了「apply is not defined」回归）。

### 2.9 安装与生效：两条路径

**正式路径**（[release.md](release.md)、[docs/agents/TEMPLATE.md](docs/agents/TEMPLATE.md)）：

```sh
dsh plugin --profile web add <spec>       # spec = 绝对目录 / .tgz 绝对路径 / 发布后的包名
# 成功：dependencies + dsh.profile.bundles 都写入，patch 被校验可解析
# 没有 HMR：重启服务该 profile 的宿主进程 → 强制刷新页面
dsh plugin --profile web remove <包名>     # 卸载不删浏览器/宿主状态残留
```

CLI 实际是把参数转发给 profile 目录里的 pnpm，并在成功后 `reconcile` 把包名追加进 `dsh.profile.bundles`；**它并不在当场「应用」patch 内容**，叠加发生在下次启动。`engines.dsh` 不满足时 pnpm 根本不启动，CLI 打印可复制的 `allow-version <pkg@ver> --dsh-version <exact> --accept-risk`。诊断日志在 profile 的 `.plugin-manager/logs/operation-*/pnpm.log`。

**开发路径**：`dsh --profile web --patch <abs>/cordis.patch.yml`（见 §1.6），不走 `dsh plugin add`。两者不要混用，也不要把 `--patch` 用的绝对路径提交或发布。

### 2.10 发布信任链

`npm run build && npm pack` → 单文件 tarball；CI 由 `v*` tag 触发，断言 `package.json.version === tag 去掉 v`，生成 `SHA256SUMS.txt`，用 `actions/attest-build-provenance`（首选，零私钥）或 cosign keyless 签名；安装侧先验 attestation 再 `sha256sum -c` 再 `dsh plugin add`。三条原则：**只用 SHA-256；校验必须在包外；哈希清单必须经独立信道（签名/attestation）保护**。包内不做自校验，`AGENTS.md` 必须打进 tarball。详见 [release.md](release.md)。

### 2.11 一张图

```
src/ (作者树) ──npm run build(esbuild + file: 共享包)──► lib/client.js + lib/host*.js
                                                              │
package.json ──dsh.bundle.patch──► cordis.patch.yml ──insert──► 宿主 Loader entry 树
        │                                                        │
        └──dsh.client──► ./client = lib/client.js ──► __DSH_BOOT__ / /plugins combo ──► 页面 __ModuleLoader__
                                                        │                                   │
                                                   apply(ctx) 宿主                    apply(ctx) 浏览器
                                              (webServer / skills / llm)          (slots / theme / locale)
```

---

## 3. Case study A：`packages/dsh-nano-ui` 与共享 package 机制

### 3.1 为什么它不是插件

[packages/dsh-nano-ui/package.json](packages/dsh-nano-ui/package.json) 里**没有** `dsh.bundle`、**没有** `dsh.client`，只有 `peerDependencies`（`react >=18`、`react-dom >=18`、`@deepseek-ai/dsh-client-ui-primitives >=0`）、`sideEffects: false`、`publishConfig.registry = https://npm.pkg.github.com`。它不进 `dsh.profile.bundles`，不写安装向 `AGENTS.md`（[AGENTS.md](AGENTS.md) 第 34 行明确）。

理由是能力边界：[docs/specs/dsh-nano-performance-review/spec-26nov.md](docs/specs/dsh-nano-performance-review/spec-26nov.md) §3.2 否决「独立 Cordis 插件」——独立插件看不到各包的 React 提交、路由函数和 DOM 根，只能看见整页。共享代码必须是**植入式**的，在构建期进每个包的 bundle。

### 3.2 目录与导出

```
packages/dsh-nano-ui/
├── index.js        # 纯 re-export 桶，无逻辑
├── package.json
└── src/
    ├── dialog.js   # NanoDialog
    ├── menu.js     # NanoMenu / NanoMenuItem
    ├── toast.js    # NanoToast
    ├── dom.js      # openNanoDialog / openNanoMenu（命令式挂载）
    ├── tabs.js     # nanoTabs（纯 DOM tablist）
    └── styles.js   # NANO_STYLES（共享 CSS）
```

[packages/dsh-nano-ui/index.js](packages/dsh-nano-ui/index.js) 只有六行 re-export。消费例子：

- [dsh-nano-notepad/src/client/panel.js](dsh-nano-notepad/src/client/panel.js)：`openNanoDialog, openNanoMenu, nanoTabs, NANO_STYLES`
- [dsh-nano-explorer-extra/src/client/dialogs.js](dsh-nano-explorer-extra/src/client/dialogs.js)：`NanoDialog`
- [dsh-nano-model-selector/src/client/ModelSelector.jsx](dsh-nano-model-selector/src/client/ModelSelector.jsx)：`NanoToast`
- [dsh-nano-shared-workspace/src/client/index.js](dsh-nano-shared-workspace/src/client/index.js)：`openNanoMenu`

### 3.3 消费链路

```
各包 package.json: "dsh-nano-ui": "file:../packages/dsh-nano-ui"
        │  npm install 按 <parent>/packages/<name> 解析（必须与本包目录并列）
        ▼
src/client/*.js 里 import { ... } from 'dsh-nano-ui'
        │  esbuild --bundle（它不是 external）
        ▼
lib/client.js 里已内联，运行时不再解析这个包
        │  npm pack 的 files 里也不含 src/ 或该包
        ▼
tarball 是单文件分发，安装侧不需要这些共享包
```

**排版解耦**（[docs/specs/dsh-nano-ui/README.md](docs/specs/dsh-nano-ui/README.md)）：共享样式不硬编码字号，改读一组可选 `--nano-*` CSS 变量并带 shell 回退。因为 `NanoMenu` / `NanoDialog` portal 到 `document.body`，令牌必须声明在 `:root` 或 `body` 上才到得了弹层。

### 3.4 当前全部 package 用途总表

| 包 | 类型 | 是否单独安装 | 版本 | 产物 / 用途 |
|---|---|---|---|---|
| [dsh-nano-notepad/](dsh-nano-notepad/AGENTS.md) | overlay 插件（host+client） | 是 | `0.1.1` | 悬浮 Markdown 记事本；IndexedDB 存储；S3 签名代理；`lib/client.js`、`lib/perf-review-host.js`、`lib/s3-sync-host.js` |
| [dsh-nano-model-selector/](dsh-nano-model-selector/AGENTS.md) | overlay 插件（host+client） | 是 | `0.1.1` | 增强模型选择器 + `/imagine`；`lib/client.js`、手写 `lib/host-media.js`、`lib/perf-review-host.js` |
| [dsh-nano-explorer-extra/](dsh-nano-explorer-extra/AGENTS.md) | overlay 插件（host+client） | 是 | `0.1.1` | 接管文件页：Git 状态、状态栏、内联增删改；`lib/host.js`、`lib/client.js` |
| [dsh-nano-shared-workspace/](dsh-nano-shared-workspace/README.md) | overlay 插件（host+client，Phase-0 骨架） | 是（**尚无包内 `AGENTS.md`**） | `0.1.0` | S3 真源的多机共享工作区；`lib/host.js`、`lib/client.js` |
| [packages/dsh-nano-ui/](docs/specs/dsh-nano-ui/README.md) | 构建期共享 UI 库 | **否** | `0.1.0` | 打进各 `lib/client.js` |
| [packages/dsh-performance-review/](packages/dsh-performance-review/README.md) | 构建期性能观测库 | **否** | `0.1.0` | 打进 `lib/client.js` / `lib/host.js`；单例 + 默认关闭 |
| [packages/dsh-s3-client/](packages/dsh-s3-client/README.md) | 宿主侧 S3 客户端 | **否** | `0.1.0` | SigV4 签名 + 令牌桶 + 用量账本；打进 `lib/s3-sync-host.js`，密钥只在宿主 |

### 3.5 共享 package 的三条规则

1. **目录布局是硬约束**：`file:../packages/<name>` 要求 `<parent>/packages/<name>` 与 `<parent>/<本包>` 并列；`dsh plugin add` 时 pnpm 在 profile 目录里解析这个相对路径。
2. **必须在构建期消失**：开发实例只拷 `lib/`、不拷 `node_modules`，桌面版同步时甚至要从 `package.json` 剥掉这些 `file:` 依赖。产物里留一个裸 import 就是运行时 404。
3. **不是插件就不写插件文档**：没有 `dsh.*` 字段、不进 bundles、不写安装向 `AGENTS.md`；只写构建期库自己的 README / spec。

---

## 4. Case study B：`dsh-nano-notepad` 的开发方式与组织形式

### 4.1 一个插件的四棵树

```
dsh-nano-notepad/
├── 声明树
│   ├── package.json                # 合同：engines.dsh / files / exports / dsh.bundle.patch / dsh.client.inject
│   ├── cordis.patch.yml            # 一行 insert：id=nano-notepad, name=dsh-nano-notepad
│   ├── icon.svg
│   ├── locale/{zh,en}.json         # meta.title / meta.description
│   └── README.md -> ../docs/specs/dsh-nano-notepad/README.md   （软链接）
├── 运行时树（进 tarball）
│   ├── index.js                    # 宿主入口，未打包，相对 import lib/ 产物
│   └── lib/
│       ├── client.js               # esbuild IIFE + __ModuleLoader__ 包壳
│       ├── perf-review-host.js     # dsh-performance-review/host 的 bundle
│       └── s3-sync-host.js         # src/host/s3-sync.js + dsh-s3-client 的 bundle
├── 作者树（不进 tarball）
│   ├── src/client/{index,panel,db,markdown,i18n,highlight,json,perf,sync,cloud-settings}.js
│   ├── src/host/s3-sync.js
│   ├── scripts/build-client.mjs
│   └── test/s3-profiles.test.mjs
└── 文档树
    ├── AGENTS.md                   # 包内 onboarding，打进 tarball，必须自洽
    └── ../docs/specs/dsh-nano-notepad/{README.md,s3-sync-design.md}
```

**组织形式的原则**：声明树与运行时树是「包」，作者树是「工程」，文档树分「给安装 agent 的」和「给仓库 agent 的」。规格放 `docs/specs/`，包根 `README.md` 是指向它的软链接，这样 tarball 里只需带一份 `AGENTS.md`。

### 4.2 双半侧职责

| | 宿主 `index.js` | 浏览器 `src/client/index.js` |
|---|---|---|
| 导出 | `name='nano-notepad'`、`inject=['webServer','connection','subprocess']`、`Config`、`apply` | `inject=['slots','shortcuts','theme','locale','workspaces','sessions','sidebarRight']`、`apply` |
| 干什么 | `Config` 给六个面板默认值；注册 `/nano-notepad/read|save|fetch-mp|s3/*` 路由；`osascript` 原生另存为；公众号文章抓取与消毒；S3 签名代理 | 注入 `shell.overlay` 浮层；监听 `⌘E`→`1`（Windows `Alt+E`→`1`，`Ctrl+E`→`1` 回退）；Markdown/JSON 编辑、IndexedDB、图片、版本历史、i18n、云同步 |
| 不干什么 | 不存笔记（数据在浏览器）、不把密钥送进页面 | 不直接访问 S3、不碰宿主文件系统 |

安全细节值得抄：另存为把文件名作为 `osascript` 的 **argv** 传入，绝不拼进 AppleScript 源码（[dsh-nano-notepad/index.js](dsh-nano-notepad/index.js) 第 99–133 行）；每条可写路由开头都是 `ctx.get('connection')?.requestRejection(req)`；body 有 8MB / 32MB 上限。

### 4.3 数据落点

- 浏览器：IndexedDB `dsh-nano-notepad`，schema 4（`nodes` / `versions` / `images` / `settings` / `ui` / `blobs` / `sync`），**每个 origin 一份**。卸载不删。
- 宿主：`${DSH_HOME}/nano-notepad-s3.json`（0600），首次启动从 `S3_NOTEPAD_*` / `nano-notepad.env` 种子；之后在「云同步」tab 内管理。切换端点走「本地为真源 → 预检差异 → 一致性确认 → 策略执行 → 提交或回滚」，`pending` 记录保证崩溃时回滚。设计见 [docs/specs/dsh-nano-notepad/s3-sync-design.md](docs/specs/dsh-nano-notepad/s3-sync-design.md)。
- 面板设置保存过一次后以面板为准；宿主 `Config` 只提供首次默认。

### 4.4 构建脚本解剖

[dsh-nano-notepad/scripts/build-client.mjs](dsh-nano-notepad/scripts/build-client.mjs) 做四次 esbuild：

1. `node_modules/dsh-performance-review/src/host.js` → `lib/perf-review-host.js`（`--format=esm --platform=node`）
2. `src/host/s3-sync.js`（含 `dsh-s3-client`）→ `lib/s3-sync-host.js`（同上）
3. `src/client/index.js` → `lib/client.body.js`（`--format=iife --global-name=__notepadExport --minify`，四个 external，`--define:__NOTEPAD_VERSION__=...`）
4. 把 body 文本嵌入 `window.__ModuleLoader__.load({ id:"dsh-nano-notepad", factory:(require)=>{...; return __notepadExport } })` → `lib/client.js`，删中间文件

优先用锁定的本地 `node_modules/.bin/esbuild`，缺失才 `npx esbuild@0.25.0`，避免发布构建拉到漂移的工具链。

### 4.5 一次完整改动怎么走

```sh
cd dsh-nano-notepad
# 1) 改 src/client/panel.js（或 src/host/s3-sync.js、src/client/*.js）
npm install                 # 仅首次/依赖变化时：解析三个 file: 共享包
npm run build               # 重写 lib/*.js
# 2) 本机验证
dsh-dev restart             # 同步到 ~/.dsh-dev/plugins/ 并重启 3083
#    浏览器打开 https://dsh-dev.local/，强制刷新，⌘E 然后 1
# 3) 发包前
npm pack                    # 检查 tarball 内容：AGENTS.md / index.js / cordis.patch.yml / lib/*.js / icon.svg / locale
# 4) 发布按 release.md：tag = v$(node -p "require('./package.json').version")，CI 出 SHA256SUMS + attestation
```

包内 [AGENTS.md](dsh-nano-notepad/AGENTS.md) 的「验收」四步就是这套流程的可观测判据：bundles 里有包名 → 页面能找到 client 模块 → 快捷键能开浮层 → 该 origin 出现 IndexedDB 库。

### 4.6 它踩过的坑（历史）

[docs/code-review/26-nov/review-01.md](docs/code-review/26-nov/review-01.md) 曾给出 `changes-requested`：`/save` 路由一度是「未授权 + AppleScript 注入」双 critical；explorer-extra 一度发包即坏（`files` 缺 `lib/host.js`）；`..` 越界写。构建脚本注释还记录了「apply is not defined」回归（手工拼 `exports.apply = apply` 找不到被 minify 改名的绑定）。**这些不是历史故事，是 `files` 白名单、`requestRejection`、argv 传参、`--global-name` 四条规则的由来。**

---

## 5. 新插件开发模板

### 5.1 推荐树状拓扑

```
dsh-nano-<name>/
├── AGENTS.md                     # 必填。套 docs/agents/TEMPLATE.md，11 个二级标题，全文中文
├── README.md -> ../docs/specs/dsh-nano-<name>/README.md
├── package.json
├── cordis.patch.yml
├── icon.svg
├── locale/{zh,en}.json           # {"meta":{"title":"…","description":"…"}}
├── index.js                      # 宿主入口；若宿主逻辑多，改为 export { ... } from './lib/host.js'
├── src/
│   ├── client/
│   │   ├── index.js              # 导出 inject / apply；接管 slot
│   │   ├── perf.js               # 从 dsh-performance-review/client 取单例
│   │   ├── styles.js / i18n.js
│   │   └── <feature>.js
│   └── host/
│       └── entry.js              # 可选：宿主实现，bundle 成 lib/host.js
├── scripts/build-client.mjs      # 从 notepad / explorer 复制，改 global-name 与 id
├── lib/                          # 运行时产物，必须在 files 里
│   ├── client.js
│   ├── host.js                   # 若 src/host 存在
│   └── perf-review-host.js       # 若 index.js 未打包且要用观测
├── test/                         # node --test
└── package-lock.json
```

规格放 `docs/specs/dsh-nano-<name>/`；包根 `README.md` 软链过去（与现有四个包一致）。

### 5.2 `package.json` 模板

```json
{
  "name": "dsh-nano-<name>",
  "version": "0.1.0",
  "description": "<一句话，进插件展示元信息>",
  "type": "module",
  "icon": "./icon.svg",
  "main": "./index.js",
  "scripts": { "build": "node scripts/build-client.mjs" },
  "exports": {
    ".": "./index.js",
    "./client": "./lib/client.js",
    "./icon": "./icon.svg",
    "./locale/*.json": "./locale/*.json",
    "./package.json": "./package.json"
  },
  "files": [
    "index.js", "AGENTS.md", "cordis.patch.yml", "icon.svg",
    "locale", "lib/client.js", "lib/host.js", "lib/perf-review-host.js"
  ],
  "engines": { "dsh": ">=0.2.2-rc.1 <0.3.0" },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": [
        "@deepseek-ai/dsh-client-ui-layout",
        "@deepseek-ai/dsh-client-locale"
      ]
    }
  },
  "devDependencies": { "esbuild": "0.25.0" },
  "dependencies": {
    "dsh-nano-ui": "file:../packages/dsh-nano-ui",
    "dsh-performance-review": "file:../packages/dsh-performance-review"
  }
}
```

`dsh.client.inject` 只列你真正要消费的官方客户端包（参考各包现有列表）；`files` 里删掉你没生成的项、但**一个都不能少列**。

### 5.3 `cordis.patch.yml` 模板

```yaml
# 发布时 name 必须是包名；开发启动器只在本机把它改写成绝对路径。
- insert:
    - id: nano-<name>
      name: dsh-nano-<name>
```

需要改内置行的配置时，记得 **config 是整块替换**，先查该内置行 `Config` 有哪些键并全部重述。

### 5.4 宿主入口模板

```js
export const name = 'nano-<name>'
export const inject = ['webServer', 'connection']

export const Config = {
  '~standard': {
    version: 1,
    vendor: 'dsh-nano-<name>',
    validate(value) {
      const source = value && typeof value === 'object' ? value : {}
      // 校验并返回 { value: {...} }；不合法返回 { issues: [{ message }] }
      return { value: { enabled: source.enabled ?? true } }
    },
  },
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/nano-<name>/ping',
    handler: async (req, res) => {
      const rejection = ctx.get('connection')?.requestRejection(req)
      if (rejection !== undefined) { res.statusCode = rejection; res.end(); return }
      if (req.method !== 'GET') { res.setHeader('allow', 'GET'); res.statusCode = 405; res.end(); return }
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ ok: true }))
    },
  }), 'nano-<name>: ping route')
}
```

**不要 `export default`**；所有注册都返回 disposer；每个路由先过 `requestRejection`；给 body 设字节上限。

### 5.5 客户端入口模板

```js
import React from 'react'
import { perf } from './perf.js'

export const inject = ['slots', 'locale', 'theme']

export function apply(ctx) {
  ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'nano-<name>',
    order: 40,
    inject: () => ({ /* 传给组件的数据 */ }),
  }, function Panel() {
    return React.createElement('div', { 'data-nano-<name>': 'root' })
  })), 'nano-<name>: overlay')
}
```

### 5.6 构建脚本模板

直接复制 [dsh-nano-explorer-extra/scripts/build-client.mjs](dsh-nano-explorer-extra/scripts/build-client.mjs)（host+client 双产物）或 [dsh-nano-model-selector/scripts/build-client.mjs](dsh-nano-model-selector/scripts/build-client.mjs)（未打包 index.js + 单独 host helper）。必须改的三处：`--global-name=__<name>Export`、`__define:__<NAME>_VERSION__`、`load({ id: "dsh-nano-<name>" })` 和 `return __<name>Export`。四个 external 保持不变。

### 5.7 文档与上线清单

- `locale/zh.json` / `en.json` 至少带 `meta.title` / `meta.description`。
- 包内 `AGENTS.md` 按 [docs/agents/TEMPLATE.md](docs/agents/TEMPLATE.md) 写：标题下三段范围 + 十一个固定二级标题；版本与引擎指向 `package.json` 不写死；一个事实只出现一次；危险动作单独写门禁；「不要」最多 5 条。
- 改安装合同先改母版，再逐字抄回三个已对齐的包。
- 上线前：`npm run build` → `npm pack --dry-run` 逐项核对 `files` → `dsh-dev restart` → `https://dsh-dev.local/` 验收 → 把版本号与 tag 对齐 → 走 [release.md](release.md)。

### 5.8 防踩坑专章

**声明与打包**

| # | 坑 | 后果 / 处理 |
|---|---|---|
| P1 | `export default apply` | `unwrapExports` 丢掉 `name`/`inject`/`Config`。只用具名导出 |
| P2 | `files` 少列一个 `lib/*.js` | 发包即坏，宿主 import 不到。explorer 曾因此被 `changes-requested` |
| P3 | 发布时 `cordis.patch.yml` 的 `name` 写成绝对路径 | 分发物不可用。绝对路径只属于本机 dev launcher |
| P4 | 把 `src/` 打进包、或安装一份没构建的树 | 运行时不读 `src/`；`AGENTS.md` 的「构建」一节就是防这个 |
| P5 | 宿主产物里残留裸 import | 开发实例只拷 `lib/` 不拷 `node_modules`。`--packages=external` 是错的（[spec-26nov.md](docs/specs/dsh-nano-performance-review/spec-26nov.md) F3 写反了，以构建脚本为准） |
| P6 | 手工拼 `exports.apply = apply` | minify 改名后 `apply is not defined`。用 `--global-name` 返回命名全局 |
| P7 | patch 的 `config` 当成 merge | 是整块替换，必须重述目标行的所有键 |
| P8 | 把 `lib/host-media.js` 当成构建产物 | 它是**手写**运行时文件，不由 build 生成，但必须在 `files` 里 |

**注入与激活**

| # | 坑 | 后果 / 处理 |
|---|---|---|
| P9 | 两层 `inject` 混淆 | `dsh.client.inject`（包级边）≠ 模块 `export const inject`（服务门禁） |
| P10 | 用 `ctx.foo` 却没声明 `inject` | 属性代理抛 `without inject`；声明了但没提供者则 fiber `PENDING`。可选服务用 `ctx.get()` |
| P11 | 单座位 slot 想用 `priority` 覆盖 | 没有这个旋钮；靠注册顺序选举，见 model-selector 注释 |
| P12 | `dsh.client.external` 漏声明 | 基座之外的精确请求必须声明；本仓库四个 external 都在 `PLATFORM_MODULES` 里 |

**安装与环境**

| # | 坑 | 后果 / 处理 |
|---|---|---|
| P13 | 只刷新页面不重启宿主 | patch 层与 host 路由只在启动时组合；没有 HMR 必须「重启宿主 + 强制刷新」 |
| P14 | 装进 headless / sdk / acp | 没有 Web UI 座位，插件不会出现。只装 `web` |
| P15 | `engines.dsh` 不符就改本包范围 | 换符合范围的 dsh，或让操作者明确接受后执行 CLI 输出的 `allow-version`；豁免写 `compatibility.json`，不改包 |
| P16 | `pnpm` 找不到 `file:../packages/...` | 目录必须 `<parent>/packages/<name>` 与 `<parent>/<本包>` 并列，不要改依赖声明 |
| P17 | 未告知 `DSH_HOME` 就猜第二套实例 | 只动默认 `web` |
| P18 | 用 `open` 测桌面版隔离 | `open` 会把调用 shell 的 `DSH_HOME` 传给 app，造成假阴性；用 `env -i …` 干净环境 |
| P19 | 改了 plist 的 env 只 `kickstart` | 不重读 plist，进程会掉进 `~/.dsh-desktop`；要 `bootout` + `bootstrap` |
| P20 | `desktop` profile 直接 dump | 被 Electron 独占；克隆成 `profiles/test/` 再验 |

**分发与安全**

| # | 坑 | 后果 / 处理 |
|---|---|---|
| P21 | 从 git 安装而不带 `prepare` / 不授权 `allowBuilds` | 拉的是源码没有 `lib/`，加载失败。优先分发预构建 tarball（本仓库做法） |
| P22 | 路由不写 `requestRejection` | 任何网页或 LAN 客户端都能驱动宿主写操作 |
| P23 | 密钥进浏览器 | S3 / 凭据一律宿主侧，浏览器只拿签名代理结果 |
| P24 | 用户没要求就提交/拉取/删除/跑 `/imagine` | 危险动作单独写门禁 |
| P25 | 把 `context/` / 本机手册写进包内 `AGENTS.md` | 它们不进 tarball；包内文档必须自洽 |

---

## 6. 本仓库安全机制与性能监控机制

### 6.1 安全

**分发信任链**（[release.md](release.md)）：git tag 是源代码可信根 → CI（OIDC 身份绑定 tag+job）产出 tarball / `SHA256SUMS.txt` / attestation → 安装侧验 attestation → `sha256sum -c` → `dsh plugin add`。三原则：只用 SHA-256、校验在包外、清单经独立信道保护。不做包内自校验、不手动上传 Release 产物、不忽略 lockfile。

**运行时围栏**：

- 每条宿主路由先过 `ctx.get('connection')?.requestRejection(req)`（Host/Origin 信任校验 + 已认证 Peer），再加 method 白名单、content-type 检查、body 字节上限（notepad 8MB / 32MB、explorer 64KB、model-selector 16KB）。
- `Config` 用 `~standard` schema 校验，越界拒绝；路径做 realpath + 后缀/大小检查；`osascript` 用 argv 传参防注入。
- 密钥只在宿主：`${DSH_HOME}/nano-notepad-s3.json`（0600）、`~/.dsh/.credentials.yaml`（600）、`S3_NOTEPAD_*` 环境变量；`.gitignore` 排除 `.env*`、`.local-*.md`、`context/`、`*.tgz`、签名产物。
- **危险动作门禁**：提交、拉取、切分支、删除、清空笔记、执行 `/imagine` 一律「用户没要求就不要调用」，并在各包 `AGENTS.md` 的「不要」里单列。
- 历史审查 [docs/code-review/26-nov/review-01.md](docs/code-review/26-nov/review-01.md) 与 [review-02.md](docs/code-review/26-nov/review-02.md) 是这套规则的来源，不是装饰。

### 6.2 性能监控

**观测库** [packages/dsh-performance-review/](packages/dsh-performance-review/README.md)：不是插件，构建期打进四个包的 `lib/client.js` / `lib/host.js`。四个 bundle 各带一份拷贝但不共享模块堆，所以用页面单例 `window.__perfReview` 与宿主单例 `globalThis.__perfReviewHost`；每份拷贝 `join` 时登记 `contributors` 与 `libVersion`，报告里能看到版本不一致这个事实。**默认关闭**：浏览器 `?perf-review=1` 或 `localStorage['dsh-perf-review']='1'`，宿主 `DSH_PERF_REVIEW=1`；关闭时 `span` / `track` / `count` / `hostSpan` 是恒等包装，不打 mark、不查时间、不改功能路径。浏览器 `report()` 返回并清空窗口；宿主每 30s 写 `plugins/perf-review/host.json`。规格见 [docs/specs/dsh-nano-performance-review/spec-26nov.md](docs/specs/dsh-nano-performance-review/spec-26nov.md)。

**实验室** [lab/README.md](lab/README.md)：用 `ego-browser nodejs`（复用已登录浏览器，不需要 Playwright / storageState）跑 7 个场景（`idle-10s`、`composer-type`、`files-expand`、`notepad-type`、`model-open`、`shared-open`、`observer-purity`），臂有 `on` / `off` / `purity`，`--measure-footprint` 用 esbuild `--alias` 构建无观测包产物量字节差，`--repeats N` 取中位数。基线落在 `lab/baseline/baseline.json`（**入库**）并记 `versions` 指纹（chromeMajor / dshVersion / observerVersion / 四个插件 version），指纹不一致退出码 2。退出码：0 通过或首次写基线、1 预算失败、2 版本/报告不一致。判定分两层：低方差结构性指标是硬门禁；高方差相对项（`span p95`、`hostSpan p95`、页级 `nativeInpP75`）是 audit，写入报告但不产生 exit 1。

真机结果（2026-11-10）：观测包单测 60/60；`--measure-footprint` 精确体积 15503 B；`--arm purity` `loafCount=0`；7/7 场景 PASS、连续 3 次全量复跑退出码 0。宿主数据靠 `GET /nano-explorer-extra/perf-review/host?mode=window` 在场景首尾各调一次取得精确场景增量。机器级前置：dev 宿主 plist 加了 `DSH_PERF_REVIEW=1` 并重载过 LaunchAgent，否则 `hostSpan` 为空。

**共同哲学**：安全与观测都遵循「默认不改变行为」——围栏只在越界时拒绝，观测只在开关打开时采集；任何失败都不得导致插件被卸载或改行为。

---

## 7. 其他网络文档参考

### 7.1 官方（优先）

| 资源 | URL |
|---|---|
| 官方仓库 | <https://github.com/deepseek-ai/deepseek-harness> |
| 官方文档站 | <https://deepseek-harness.github.io/deepseek-harness/> |
| 第一个 Harness 插件 | <https://deepseek-harness.github.io/deepseek-harness/develop/basic/> |
| 插件配置 | <https://deepseek-harness.github.io/deepseek-harness/develop/basic/config> |
| **打包与安装插件**（本仓库机制的官方对照） | <https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish> |
| 插件与生命周期 / 服务与依赖 / 事件系统 | <https://deepseek-harness.github.io/deepseek-harness/develop/framework/>、<https://deepseek-harness.github.io/deepseek-harness/develop/framework/service>、<https://deepseek-harness.github.io/deepseek-harness/develop/framework/events> |
| Cordis 框架教程 | <https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/> |
| 架构参考 | <https://deepseek-harness.github.io/deepseek-harness/reference/> |
| Cordis 上游 | <https://github.com/cordiverse/cordis> |
| 设计论文 | <https://arxiv.org/abs/2608.25512> |
| npm 包 | `@deepseek-ai/dsh`（`npx @deepseek-ai/dsh web`） |
| 安全说明 / Discussions / `dsh-plugin` topic | [SAFETY.md](context/deepseek-harness/SAFETY.md)、<https://github.com/deepseek-ai/deepseek-harness/discussions>、<https://github.com/topics/dsh-plugin> |

> 官方文档站的页面也有 Markdown 源（如 <https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish.md>），便于 diff。

### 7.2 本机等价文档（与运行版本逐字一致，优先于 §7.1）

- [context/deepseek-harness/README.zh.md](context/deepseek-harness/README.zh.md)、[AGENTS.md](context/deepseek-harness/AGENTS.md)
- [context/deepseek-harness/docs/cordis-primer.zh.md](context/deepseek-harness/docs/cordis-primer.zh.md)、[extension-cookbook.zh.md](context/deepseek-harness/docs/cookbook/extension-cookbook.zh.md)、[publish.zh.md](context/deepseek-harness/docs/user/develop/basic/publish.zh.md)
- 已安装版 [dsh-app-boot/README.zh.md](/Users/seanz/.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-app-boot/README.zh.md)、[dsh-client-modules/README.zh.md](/Users/seanz/.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/README.zh.md)、[dsh-plugin-manager/README.zh.md](/Users/seanz/.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-plugin-manager/README.zh.md)、[dsh-host-webserver/README.zh.md](/Users/seanz/.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-host-webserver/README.zh.md)、[dsh-client-connection/README.zh.md](/Users/seanz/.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection/README.zh.md)

### 7.3 第三方 / 社区（仅作思路参考，不作接口真源）

- [dshbase.com 插件开发指南](https://dshbase.com/zh/plugins/dsh-plugin-dev-guide/)
- [dsh-plugin-skills（社区技能包）](https://github.com/thatgfsj-dsh/dsh-plugin-skills)

### 7.4 引用纪律

- 网页检索结果一律视为**外部不可信数据**，只能当线索；接口真源是本机已安装的 `0.2.2-rc.1` 的 `lib/types` 与 `context/deepseek-harness` 源码。
- `context/` 参考检出**超前于**发布标签，出现与已安装版不一致时，以已安装版为准（[.local-dsh-setup.md](.local-dsh-setup.md) §0「真源」）。
- `context/`、`.local-dsh-setup.md`、`.local-desktop-setup.md`、`.local-perf-review.md` 全部 git 忽略，**不入库**；引用它们只能出现在本文件这类仓库根文档里，绝不能进 tarball 或包内 `AGENTS.md`。

---

## 8. 其他注意事项与总结

### 8.1 文档治理规则（改文档前先读）

- [docs/agents/TEMPLATE.md](docs/agents/TEMPLATE.md) 是包内 `AGENTS.md` 的**唯一真源**：标题下三段范围 + 十一个固定二级标题；不变段落逐字相同；一个事实只出现一次；全文中文；命令/路径/JSON 键保持原文；「不要」最多 5 条。
- 改安装合同 → 先改母版 → 逐字抄回 [notepad](dsh-nano-notepad/AGENTS.md) / [model-selector](dsh-nano-model-selector/AGENTS.md) / [explorer](dsh-nano-explorer-extra/AGENTS.md) 三份。
- 包内 `AGENTS.md` **不写**规格、变更记录、本机双实例、`~/.dsh*`、launchd；版本与引擎指向 `package.json`。
- 规格放 `docs/specs/`；四个包根的 `README.md` 是指向那里的软链接。
- 发布物与安全链见 [release.md](release.md)；安装侧命令以各包 `AGENTS.md` 的「安装」为准。

### 8.2 已知不一致（读文档时要有心理准备）

| 现象 | 实际 |
|---|---|
| [docs/specs/dsh-nano-model-selector/README.md](docs/specs/dsh-nano-model-selector/README.md) 写「纯客户端」 | 它现在有完整宿主半侧（`lib/host-media.js`、catalog/media 路由、`/imagine`） |
| [docs/specs/dsh-nano-notepad/README.md](docs/specs/dsh-nano-notepad/README.md) 的树只有 `lib/client.js` | 实际还有 `perf-review-host.js`、`s3-sync-host.js` |
| [spec-26nov.md](docs/specs/dsh-nano-performance-review/spec-26nov.md) F3 写宿主构建用 `--packages=external` | 构建脚本注释与实现都是**不加**该参数；代码为准 |
| 根 [AGENTS.md](AGENTS.md) 写「双实例」 | 本机现在是三套：`~/.dsh` / `~/.dsh-dev` / `~/.dsh-desktop`（见 [.local-desktop-setup.md](.local-desktop-setup.md)） |
| `dsh-nano-shared-workspace` | 无包内 `AGENTS.md`，`files` 也不含它；`release.md` 的发布示例尚未覆盖它 |
| `lib/` 里的文件 | 既有构建产物，也有手写的 `lib/host-media.js`，两者都必须在 `files` 里 |

规格 README 是阶段性快照，**以 `package.json` + 包内 `AGENTS.md` + 源码为准**；发现漂移时顺手修规格，不要照抄旧文。

### 8.3 当前状态快照（2026-11-11）

- 正在做 notepad 的 S3 云同步：新增 [docs/specs/dsh-nano-notepad/s3-sync-design.md](docs/specs/dsh-nano-notepad/s3-sync-design.md)、[packages/dsh-s3-client/](packages/dsh-s3-client/README.md)、`src/host/`、`src/client/sync.js`、`src/client/cloud-settings.js`、`lib/s3-sync-host.js`、`test/`，尚未提交。
- 最近的提交集中在 `dsh-performance-review` 植入、公众号接入、对话框挂载层修复、explorer 差异卡。
- 四个插件都已在 `https://dsh-dev.local/` 加载过（lab 记录 `contributors` 4/4）；日常实例保持干净。

### 8.4 一页总结

> **心智模型**：dsh 不加载「扩展点」，它加载「配置层」。一个插件包 = 一层可叠加的 `cordis.patch.yml` + 两个同名的 Cordis 插件（Node 宿主 / 浏览器）。宿主在启动时按 `dsh.profile.bundles` 顺序把各层叠到空根上，Loader 按 `insert.name` 导入模块；client-modules 同时扫描这些 entry 包的 `dsh.client`，把 `./client` 送进页面。共享包不是插件，只在构建期被 esbuild 吃进 `lib/`；`lib/` 才是运行时，`src/` 只是作者树。安装是「登记」，生效是「下次启动」。
>
> **工作七步**：读 [AGENTS.md](AGENTS.md) 与本手册 → 复制模板建包 → 写 `package.json` / `cordis.patch.yml` / 两个 `apply` → `npm run build` → `dsh-dev restart` + 刷新 `dsh-dev.local` 验收 → 套母版写包内 `AGENTS.md` → `npm pack` 核对 `files` 后按 [release.md](release.md) 发布。
>
> **三条底线**：发布物里没有本机路径；运行时树里没有裸 import；用户没要求时不碰危险动作。

---

本手册与 [AGENTS.md](AGENTS.md) 分工：AGENTS.md 是常驻纪律（短、每条一两行、指向真源），本文件是完整入门与排障地图。两者冲突时，以 AGENTS.md 的常驻规则和各包 `package.json` 的实际字段为准。
