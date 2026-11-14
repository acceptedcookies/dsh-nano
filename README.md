# dsh-nano

> **DEPRECATED（2026-11-12）**：`dsh-nano-shared-workspace` 已由 [业主] 裁决退役，整体移至 [`deprecated/dsh-nano-shared-workspace/`](deprecated/README.md)。本仓库现行活跃插件是仓根 `AGENTS.md` 清单里的 **六个**；下文凡是「三个插件」「四个插件」的历史表述、以及 `docs/eval`、`docs/code-review`、`docs/specs` 里的历史路径，都按退役当时理解。发布/打包/门禁已不再包含该退役插件，详见 [`deprecated/README.md`](deprecated/README.md)。

> DeepSeek Harness（dsh）Web 的 overlay 插件仓库：六个活跃插件，加三个只在构建期打进 `lib/` 的共享包。面向在本仓库改插件、做交接或巡检的人；能力面包括悬浮文本记事本、模型选择与 `/imagine`、工作区文件树、Kitesurf 设计面、终端，以及 macOS 本地沙箱宿主。运行底座是 `@deepseek-ai/dsh@0.2.2-rc.1` 的 **web** profile，不是独立网站。

> **维护者**：Sean.Z
> **最后核对（against HEAD）**：2026-11-11 @ `350c6c8`（`main`）
> **对外地址**：<https://github.com/acceptedcookies/dsh-nano>（源码。没有公开运行站点，也没有 git tag / GitHub Release）
> **总体状态**：三个活跃插件 + 三个共享包的源码在 `main`，另有一个已退役插件归档在 `deprecated/`；记事本文件名、S3 配置存储、`dsh-s3-client` 与 `dsh-performance-review` 的单元测试在本次核对时通过。发布信任链未接线。2026-11-11 安全审查的 24 条 confirmed 仍是 `findings-open`，修复决策已冻结、代码未改。
> **文档状态**：`draft`

---

## 1. 项目综述

`dsh-nano` 把 **一个 npm 包做成一个 dsh 组合包（bundle）**。`package.json` 声明 `dsh.bundle.patch` 与 `dsh.client`，`cordis.patch.yml` 把插件 id 插进宿主 Cordis 的 entry 树。宿主半侧是 `index.js` 导出的 Node ESM（注册 HTTP 路由、调用 git / 文件系统 / S3 签名）。浏览器半侧是构建产物 `lib/client.js` 里的 `window.__ModuleLoader__.load` 工厂。`src/` 只是作者树，不进 tarball；`npm run build` 用 esbuild 把共享包打进 `lib/`。安装侧把包登记进 **web** profile，下次启动宿主才让 patch 生效。机制与本机三实例怎么挂这些插件，见 [INTRODUCTION.md](INTRODUCTION.md)。

浏览器不持有 S3 密钥，也不直接对桶签名。页面只请求插件自己注册在 dsh `webServer` 上的路径；宿主进程做 SigV4、git 与本机 CLI。这层不是独立的 Cloudflare Pages Functions 或 Express BFF，就是同一个 dsh 宿主进程（详见 §9）。

**核心能力**：

- **悬浮记事本**：任意后缀的文本留在该浏览器源的 IndexedDB；Markdown 只是 `.md` / `.markdown` 的视图。可选 S3 同步默认关闭。
- **模型选择器**：composer 上的提供商 rail、收藏、effort，以及 `/imagine` 媒体技能。
- **文件树增强**：会话工作区的目录、Git 状态、提交 / 拉取 / 切换分支；有改动的文件可打开实验性 forge 差异 tab。
- ~~**共享工作区**：经 S3 兼容端点列出、加入、同步会话与副本目录~~ —— **已 DEPRECATED（2026-11-12）**，源码归档在 [`deprecated/dsh-nano-shared-workspace/`](deprecated/README.md)，不再维护、不发布。
- **构建期共享包**：对话框 / 菜单 / tab、性能观测（默认关）、宿主侧 S3 客户端。三者都不单独安装。

> **当前状态（对账诚实）**：`已落地` 只表示 HEAD 里有对应源码，且下表证据锚能定位到实现或一次本地测试。它不等于「已上线」或「安全审查已关闭」。没有公开部署，故本表不使用 `live`。

| 能力 / 链路 | 状态 | 证据锚（`path:line` / test / 部署链接） |
|------------|------|------------------------------------------|
| 记事本：原名保存任意文本，IndexedDB schema 4 | `已落地` | [`dsh-nano-notepad/src/client/db.js:6`](dsh-nano-notepad/src/client/db.js#L6)（`DB_VERSION`）、[`db.js:143`](dsh-nano-notepad/src/client/db.js#L143)（`fileName` 不改后缀）；`node --test dsh-nano-notepad/test/file-names.test.mjs` 本次 4 通过 |
| 记事本：S3 云同步（默认关）与端点切换 | `已落地` | 默认 [`db.js:23`](dsh-nano-notepad/src/client/db.js#L23) `s3Enabled: false`；路由 [`index.js:63`](dsh-nano-notepad/index.js#L63)；存储 [`src/host/s3-sync.js:8`](dsh-nano-notepad/src/host/s3-sync.js#L8)；`s3-profiles.test.mjs` 本次 5 通过。仓库内没有对真实桶的验收 |
| 记事本：公众号抓取 | `已落地`（默认关） | 路由 [`index.js:62`](dsh-nano-notepad/index.js#L62) `POST /nano-notepad/fetch-mp`；设置仅在 `mpEnabled === true` 时打开（[`db.js:62`](dsh-nano-notepad/src/client/db.js#L62)） |
| 模型选择器 + `/imagine` | `已落地` | 目录路由 [`dsh-nano-model-selector/index.js:28`](dsh-nano-model-selector/index.js#L28)；引擎探测 [`lib/host-media.js:14`](dsh-nano-model-selector/lib/host-media.js#L14)。本次未做真实出图 |
| 文件树与 Git 卡片 | `已落地` | 前缀 [`dsh-nano-explorer-extra/src/host/routes.js:11`](dsh-nano-explorer-extra/src/host/routes.js#L11)。无本包单元测试 |
| ~~共享工作区路由（含 tree pull/push、materialize）~~ | **已退役** | 2026-11-12 由 [业主] 裁决 deprecated，整体移至 [`deprecated/dsh-nano-shared-workspace/`](deprecated/README.md)。本表不再把它列为现行能力，历史证据见归档目录与 `docs/eval/26-nov/DNSW-1112-automation.md` |
| `dsh-s3-client`（SigV4、限速、账本） | `已落地` | [`packages/dsh-s3-client/package.json`](packages/dsh-s3-client/package.json)；`node --test packages/dsh-s3-client/test/*.mjs` 本次 16 通过 |
| `dsh-performance-review`（默认不采集） | `已落地` | 宿主开关 [`packages/dsh-performance-review/src/host.js:121`](packages/dsh-performance-review/src/host.js#L121) 仅 `DSH_PERF_REVIEW=1`；`node --test packages/dsh-performance-review/test/*.mjs` 本次 60 通过 |
| `dsh-nano-ui`（构建期 UI） | `已落地` | [`packages/dsh-nano-ui/package.json`](packages/dsh-nano-ui/package.json)、[`src/tabs.js`](packages/dsh-nano-ui/src/tabs.js)。无测试脚本 |
| 发布信任链（tag → Actions → attestation → Release） | `计划中` | 流程写在 [RELEASE.md](RELEASE.md)，仓库没有 `.github/workflows/`，`git tag -l` 为空 |
| 安全修复（24 条 confirmed） | `计划中` | 审查 [`docs/code-review/26-nov/security-audit.md`](docs/code-review/26-nov/security-audit.md) 状态 `findings-open`；执行口径已冻结在 [`pre-security-fix-qna.md`](docs/code-review/26-nov/pre-security-fix-qna.md)，HEAD 未按该文改路由 |

---

## 2. 技术栈

| 层级 | 技术 / 库 | 说明 |
|------|-----------|------|
| 宿主平台 | `@deepseek-ai/dsh@0.2.2-rc.1`，Cordis | `engines.dsh` 三个活跃插件都是 `>=0.2.2-rc.1 <0.3.0`（如 [`dsh-nano-notepad/package.json:28`](dsh-nano-notepad/package.json#L28)）。只装 **web** profile，不装 headless / sdk / acp |
| 语言 | JavaScript（Node ESM + 浏览器 IIFE） | 无 TypeScript 编译步骤，无根级 `package.json` |
| 构建 | esbuild `0.25.0`（各包 `devDependencies` 锁死） | `npm run build` → `node scripts/build-client.mjs`。共享包被打进 `lib/`，运行中的页面不单独加载它们 |
| UI | `dsh-nano-ui`，peer：`react >=18`、`@deepseek-ai/dsh-client-ui-primitives` | 对话框、菜单、toast、分段 tab。`publishConfig.registry` 指向 GitHub npm，本仓库没有发布记录 |
| 浏览器存储 | IndexedDB（记事本）、`localStorage`（各插件偏好） | 笔记不在宿主文件系统。库名 `dsh-nano-notepad`，schema 4 |
| 宿主集成 | dsh `webServer` + `connection.requestRejection` | 插件路由的唯一准入是 Host/Origin 围栏加已认证会话。没有按路由的二次授权（§11、§12） |
| 第三方 | S3 兼容端点（SigV4）、本机 `git`、本机图片 CLI、`mp.weixin.qq.com` | 没有 UnifyEstate / 独立 BFF 进程 |
| 测试 | `node --test` | 只覆盖三个目录，见 §10.3。没有仓库级 lint / typecheck 脚本 |
| 性能观测 | `dsh-performance-review` | 默认恒等包装。页面 `?perf-review=1` 或 `localStorage['dsh-perf-review']='1'`，宿主 `DSH_PERF_REVIEW=1` |

> 运行依赖刻意留在 dsh 与 Node 内置模块上。共享包用 `file:` 指向 `packages/`，不发布到公共 npm。

---

## 3. 模块总览

### 3.1 Overlay 插件

三个目录各自是一个可 `dsh plugin --profile web add` 的包，版本以各包 `package.json` 为准（notepad / model-selector / explorer-extra 均为 `0.1.1`）。

| 包 | 插件 id | 浏览器里做什么 | 规格 |
|----|---------|----------------|------|
| [`dsh-nano-notepad/`](dsh-nano-notepad/) | `nano-notepad` | 悬浮文本记事本 | [docs/specs/dsh-nano-notepad/README.md](docs/specs/dsh-nano-notepad/README.md)、[s3-sync-design.md](docs/specs/dsh-nano-notepad/s3-sync-design.md) |
| [`dsh-nano-model-selector/`](dsh-nano-model-selector/) | `nano-model-selector` | 模型面板与 `/imagine` | [docs/specs/dsh-nano-model-selector/README.md](docs/specs/dsh-nano-model-selector/README.md) |
| [`dsh-nano-explorer-extra/`](dsh-nano-explorer-extra/) | `nano-explorer-extra` | 接管「文件」页 | [docs/specs/dsh-nano-explorer-extra/README.md](docs/specs/dsh-nano-explorer-extra/README.md) |

> **已退役**：`dsh-nano-shared-workspace`（`nano-shared-workspace`，侧栏共享工作区）于 2026-11-12 deprecated，源码移至 [`deprecated/dsh-nano-shared-workspace/`](deprecated/README.md)，**不再安装、不打包、不发布**。历史规格草案仍在 `docs/specs/dsh-nano-shared-workspace/spec.md`，仅作回溯。

每个插件的 `cordis.patch.yml` 在仓库里写包名，不写绝对路径。记事本的例子：[`dsh-nano-notepad/cordis.patch.yml:5`](dsh-nano-notepad/cordis.patch.yml#L5) `name: dsh-nano-notepad`。开发启动器可以在副本上改写这一行；提交进仓库的必须仍是包名。

### 3.2 构建期共享包

[`packages/`](packages/) 不单独安装。改它们之后要在消费方目录重新 `npm run build`，否则 `lib/` 仍是旧包。

- [`packages/dsh-nano-ui/`](packages/dsh-nano-ui/)：打进各插件 `lib/client.js`。规格 [docs/specs/dsh-nano-ui/README.md](docs/specs/dsh-nano-ui/README.md)。
- [`packages/dsh-performance-review/`](packages/dsh-performance-review/)：客户端打进 `lib/client.js`，宿主侧打进 `lib/host.js` 或 `lib/perf-review-host.js`。规格 [docs/specs/dsh-nano-performance-review/spec-26nov.md](docs/specs/dsh-nano-performance-review/spec-26nov.md)。
- [`packages/dsh-s3-client/`](packages/dsh-s3-client/)：目前由记事本宿主 bundle 成 [`dsh-nano-notepad/lib/s3-sync-host.js`](dsh-nano-notepad/lib/s3-sync-host.js)。`private: true`。说明见 [packages/dsh-s3-client/README.md](packages/dsh-s3-client/README.md)。

### 3.3 宿主路由层

见 §9。页面脚本能调用的能力，就是这些已注册路由加上 dsh 自己暴露给页面的会话 / 工作区 API。

### 3.4 文档、规格与性能实验室

- [INTRODUCTION.md](INTRODUCTION.md)：开荒手册（版本锚点、三套本机实例、插件机制、开发循环）。本机端口与 LaunchAgent 写在 git 忽略的手册里，克隆仓库得不到那两份文件。
- [RELEASE.md](RELEASE.md)：打算使用的打包与信任链。它描述流程，不是已经跑起来的 CI。
- [docs/agents/TEMPLATE.md](docs/agents/TEMPLATE.md)：包内安装合同的母版。安装命令以它和 [RELEASE.md](RELEASE.md) 为准：`dsh plugin --profile web add <spec>`。
- [docs/specs/](docs/specs/)：各包规格。
- [docs/code-review/26-nov/](docs/code-review/26-nov/)：安全审查与修复前 QNA。审查结论还开着。
- [lab/](lab/)：性能观测的本机手动跑法，见 [lab/README.md](lab/README.md)。`lab/config.local.json` 与 `lab/out/` 不入库。

`context/` 被 git 忽略，不是本仓库的源码真源。正在执行的 dsh 是本机安装的 npm 包，不是这份检出。

---

## 4. 目录结构

```text
dsh-plugins/
├── INTRODUCTION.md                          # 开荒手册：拓扑、机制、开发循环
├── RELEASE.md                               # 发布信任链（文档；CI 未接线）
├── README.md                                # 本文件
│
├── docs/
│   ├── agents/TEMPLATE.md                   # 包内安装合同母版
│   ├── specs/                               # 各包规格（含 notepad S3 设计、性能观测）
│   └── code-review/26-nov/                  # 安全审查 + 修复前 QNA（findings 仍开）
│
├── dsh-nano-notepad/                        # 悬浮记事本 0.1.1
│   ├── index.js                             # 宿主：另存为 / 读文本 / 公众号 / S3 代理
│   ├── cordis.patch.yml                     # id nano-notepad，name 为包名
│   ├── src/client/                          # 作者树：面板、IndexedDB、同步 UI
│   ├── src/host/s3-sync.js                  # 端点存储与签名代理（构建进 lib/）
│   ├── lib/                                 # 运行时：client.js、s3-sync-host.js、perf-review-host.js
│   ├── locale/                              # 插件市场用的 zh / en 标题
│   └── test/                                # 文件名与 S3 profile 存储
│
├── dsh-nano-model-selector/                 # 模型选择器 0.1.1
│   ├── index.js                             # catalog、媒体引擎、imagine 技能
│   └── lib/host-media.js                    # 引擎探测与技能正文
│
├── dsh-nano-explorer-extra/                 # 文件树 0.1.1
│   ├── src/host/routes.js                   # /nano-explorer-extra/* 
│   └── lib/host.js、lib/client.js           # 两份都是构建产物，缺一不可
│
├── deprecated/                               # 已退役插件归档（不参与构建/发布）
│   └── dsh-nano-shared-workspace/            # ⛔ DEPRECATED 2026-11-12，见 deprecated/README.md
│
├── packages/
│   ├── dsh-nano-ui/                         # 构建期 UI（含 nanoTabs）
│   ├── dsh-performance-review/              # 构建期观测，默认关闭
│   └── dsh-s3-client/                       # 构建期 SigV4 + 限速 + 账本
│
└── lab/                                     # 性能实验室（手动；本地配置不入库）
```

`src/` 不进 `npm pack`。`package.json` 的 `files` 少列一个 `lib/*.js`，装上去的宿主就会缺模块。记事本必须带上 `lib/s3-sync-host.js`（[`package.json:26`](dsh-nano-notepad/package.json#L26)），因为开发实例只拷 `lib/`，不拷 `node_modules`。

---

## 5. 翻译机制 / i18n

插件 UI 有中英两套文案。没有站点 URL、没有 locale 前缀、没有 sitemap。

### 5.1 Locale 与 URL 策略

- 语言集：`zh`、`en`。宿主 `client-locale` 传入的语言名以 `zh` 开头则用中文，否则英文。
- 策略：不改 URL。记事本的解析在 [`dsh-nano-notepad/src/client/i18n.js:520`](dsh-nano-notepad/src/client/i18n.js#L520) `languageOf`。
- 插件市场标题另有 `locale/zh.json` 与 `locale/en.json`（记事本目前只有 `meta.title` / `meta.description`）。

### 5.2 翻译数据模型

浏览器界面是源码里的 `COPY` 字典，不是后端按字段返回的翻译，也不是一套 i18n 框架。

```json
{ "zh": { "files": "文件" }, "en": { "files": "Files" } }
```

- 回退规则：非 `zh*` 全部落到 `en`，没有第三语言，也没有字段级缺译回退。
- 不参与翻译的：路由、IndexedDB id、文件名、S3 key、配置数值。

### 5.3 解析机制与 UI 文案

- 记事本界面：[`dsh-nano-notepad/src/client/i18n.js`](dsh-nano-notepad/src/client/i18n.js) 的 `COPY`，构建后进入 `lib/client.js`。
- 选择器与文件树各自有 `src/client/i18n.js`，模式相同。
- 插件列表上的名字：各包 `locale/*.json`。

### 5.5 新增语言步骤

1. 在该包 `src/client/i18n.js` 的 `COPY` 下加一整份语言对象（缺键不会按字段回退）。
2. 改 `languageOf`：今天只有「`zh` 前缀 → `zh`，否则 `en`」。
3. 若插件市场卡片也要新语言，加 `locale/<code>.json`。
4. `npm run build`，确认 `lib/client.js` 含新文案后再安装。
5. 没有独立的 i18n 测试；记事本现有测试不覆盖文案。

---

## 8. 特色能力子系统

### 8.1 它做什么

记事本把草稿、历史版本和图片放在**这个浏览器源**的 IndexedDB 里，宿主不保存笔记正文。需要离开浏览器时，macOS「另存为」走 `POST /nano-notepad/save`（只弹系统对话框，不是存储）。需要跨设备时，设置里的「云同步」默认关闭；打开后浏览器把对象操作交给宿主，宿主用 `dsh-s3-client` 签名。设计写在 [docs/specs/dsh-nano-notepad/s3-sync-design.md](docs/specs/dsh-nano-notepad/s3-sync-design.md)。

### 8.2 核心不变量 / 数据模型

- 文件名原样保存。`fileName()` 只拒绝空名和斜杠，不追加 `.md`（[`db.js:137`](dsh-nano-notepad/src/client/db.js#L137)）。重名只加 `-2` 这类序号。
- Markdown 预览、JSON 树、公众号富文本是视图，不是存储格式。公众号与云同步都是显式打开。
- Schema 4 增加 `sync` store。升级只建新 store，不删已有笔记（[`db.js:6`](dsh-nano-notepad/src/client/db.js#L6)）。
- 端点切换期间本地是真源：自动同步暂停，宿主用 `pending` 记录，下次启动回滚未完成的切换（`s3-profiles.test.mjs` 覆盖 abort 与重启回滚）。
- 密钥不回浏览器。`list` 只给 `hasSecret`。编辑时 secret 留空表示保留原值。

### 8.3 鉴权 / 信任边界

- 密钥文件：`${DSH_HOME}/nano-notepad-s3.json`，写入时 `mode: 0o600`（[`s3-sync.js:139`](dsh-nano-notepad/src/host/s3-sync.js#L139)）。首次可从 `S3_NOTEPAD_*` 或 `${DSH_HOME}/nano-notepad.env` 播种。
- 四条 S3 路由与另存为、读文件、公众号抓取一样，只挂 `connection.requestRejection`（[`index.js:301`](dsh-nano-notepad/index.js#L301)）。
- 这道围栏**不是**按操作的授权。已登录页面里的脚本可以调用这些路由，包括改端点并用宿主保存的密钥去签名。2026-11-11 审查把这条当成高危，修复尚未落地（§12）。不要把「密钥不进浏览器」读成「页面不能驱使宿主拿密钥出站」。

### 8.4 如何新增 / 扩展

新插件沿用同一骨架，而不是往记事本里堆功能：`package.json` 的 `dsh.bundle.patch`、`cordis.patch.yml` 的包名、`src/` + `scripts/build-client.mjs`、`files` 里列出全部运行时 `lib/`。安装合同的不变段落以 [docs/agents/TEMPLATE.md](docs/agents/TEMPLATE.md) 为准。共享 UI 或 S3 客户端用 `file:../packages/...`，并打进 `lib/`。步骤与本机开发循环见 [INTRODUCTION.md](INTRODUCTION.md)。

---

## 9. BFF 层与第三方集成

### 9.1 定位与隔离边界

BFF 就是 dsh 宿主进程里的插件 `apply(ctx)`。浏览器请求 `https://<本机 dsh 源>/<插件前缀>/...`，不直接拿 `appSecret` 去签 S3，也不在页面里跑 `git`。密钥与子进程留在宿主。

隔离目前只有两层：

1. dsh 的 `connection.requestRejection`：Host/Origin 围栏 + 已认证会话。裸 curl 被拒是鉴权，不是没装上。
2. 各路由自己的路径检查（工作区前缀、文件大小、JSON 体积）。检查并不一致，有的会被请求体开关绕开（§11.3）。

没有独立的 CORS 中间件、没有写接口 Origin 二次门、没有「密钥缺失则路由不注册」的失败关闭。S3 未配置时，记事本同步停在未连接；路由本身仍然注册。

### 9.2 API 路由表

前缀后的路径都要求已登录页面。方法以源码为准。

| 路由 | 方法 | 说明 |
|------|------|------|
| `/nano-notepad/save` | POST | macOS 原生另存为。正文上限 8MB。不是笔记库 |
| `/nano-notepad/read` | POST | 读一个文本文件。用 NUL 字节拒绝二进制，**不**再按扩展名限制，也**不**限制在会话工作区里（[`index.js:219`](dsh-nano-notepad/index.js#L219)） |
| `/nano-notepad/fetch-mp` | POST | 抓取 `https://mp.weixin.qq.com/s/`。默认关 |
| `/nano-notepad/s3/status` | POST | 同步状态。不返回密钥 |
| `/nano-notepad/s3/test` | POST | 探测当前端点 |
| `/nano-notepad/s3/object` | POST | 签名后的对象读写。正文上限 32MB |
| `/nano-notepad/s3/config` | POST | 端点的增删改与切换。secret 只写不回 |
| `/nano-model-selector/catalog` | GET | 模型目录。进程内缓存 15s（[`index.js:39`](dsh-nano-model-selector/index.js#L39) `CATALOG_TTL_MS`） |
| `/nano-model-selector/media-engines` | GET | 本机 grok / codex 探测结果 |
| `/nano-model-selector/media-engine` | GET, PUT | 读或写入显式引擎并重注册 `imagine` |
| `/nano-explorer-extra/status` | GET | 整仓 Git 状态。`only=stats` 只返回体积 |
| `/nano-explorer-extra/list` | POST | 列一个目录 |
| `/nano-explorer-extra/read` | POST | 读不超过 1MB 的 UTF-8。`allowOutsideWorkspace: true` 时跳过工作区围栏（[`routes.js:419`](dsh-nano-explorer-extra/src/host/routes.js#L419)） |
| `/nano-explorer-extra/ignored` | POST | 这些路径是否被 gitignore |
| `/nano-explorer-extra/create-file` | POST | 新建文件 |
| `/nano-explorer-extra/create-folder` | POST | 新建目录 |
| `/nano-explorer-extra/rename` | POST | 重命名 |
| `/nano-explorer-extra/delete` | POST | 删除。不能删工作区根 |
| `/nano-explorer-extra/commit` | POST | `git add --all` 后提交。没有「只提交已暂存」 |
| `/nano-explorer-extra/pull` | POST | `git pull --ff-only` |
| `/nano-explorer-extra/checkout` | POST | 切换当前工作树的分支 |
| `/nano-explorer-extra/perf-review/host` | GET | 观测快照。默认关闭时仍返回 200，`enabled` 为 false |
> **`/nano-shared-workspace/*` 的 20+ 条路由已从本表移除** —— 该插件 2026-11-12 deprecated，源码归档在 [`deprecated/dsh-nano-shared-workspace/`](deprecated/README.md)。历史路由清单见 `security/route-inventory.md`（已标注 deprecated）与归档包内 `src/host/routes.js`。现行门禁 `security/route-sensitivity.json` / `security/feature-contract.json` 已不再收录这些路由。

文件树另有右键「查看差异」：不走本插件的 diff 路由（该路由已删），而是打开 forge 面板的本地差异 tab。profile 没装「变更请求与工作树」时，界面只提示不可用。

### 9.3 中间件与 CORS

没有插件级 CORS 中间件。准入是 dsh `connection.requestRejection`，在 [`dsh-nano-explorer-extra/src/host/routes.js:458`](dsh-nano-explorer-extra/src/host/routes.js#L458)、[`dsh-nano-notepad/index.js:301`](dsh-nano-notepad/index.js#L301) 各写一份（退役的 shared-workspace 曾写第三份，见归档）。跨站请求会被拒；同页脚本不会。

### 9.4 第三方配置 / token / 客户端 / 缓存

- **记事本 S3**（[`s3-sync.js`](dsh-nano-notepad/src/host/s3-sync.js) + [`packages/dsh-s3-client`](packages/dsh-s3-client/)）：多端点 JSON 存在 `DSH_HOME`。限速常量 `rps: 10, burst: 20, kbps: 512, concurrency: 2`（[`s3-sync.js:17`](dsh-nano-notepad/src/host/s3-sync.js#L17)）。用量账本在客户端库内，不在浏览器。
- ~~**共享工作区**：身份走 dsh credentials（`DSH_NSW_*` 环境变量可兜底），端点来自插件 Config~~ —— **已 DEPRECATED**，见 [`deprecated/README.md`](deprecated/README.md)；现存实例需自行移除配置行。
- **模型目录**：宿主内存缓存 15 秒，不是磁盘缓存。
- **媒体引擎状态**：`$DSH_DATA_DIR` 或 `$DSH_HOME` 下 `plugins/nano-model-selector/media-engine.json`。卸载不删。
- **git**：文件树调用宿主机器 PATH 上的 `git`，超时默认 30 秒。

### 9.5 第三方接口配置表

仓库不保存任何真值。下表的「当前值」是代码里的缺省或「不入库」，不是某台机器的密钥。

| 变量 | 当前值 | 含义 |
|------|--------|------|
| `S3_NOTEPAD_ENDPOINT` | 不入库 | 记事本首次播种用的端点，须带 `http://` 或 `https://` |
| `S3_NOTEPAD_REGION` | 缺省 `shv1`（[`s3-sync.js:48`](dsh-nano-notepad/src/host/s3-sync.js#L48)） | 区域 |
| `S3_NOTEPAD_BUCKET` | 不入库 | 桶名 |
| `S3_NOTEPAD_ACCESS_KEY` | 不入库 | Access Key。进程里没有它时才读 `nano-notepad.env` |
| `S3_NOTEPAD_SECRET_KEY` | 不入库 | Secret。只应出现在宿主文件 |
| `S3_NOTEPAD_PREFIX` | 缺省 `notepad/` | 对象键前缀 |
| `S3_NOTEPAD_PATH_STYLE` | 缺省 `true` | path-style（MinIO 一类） |
| `DSH_NP_S3_ENV` | 不入库 | 覆盖 `nano-notepad.env` 的路径 |
| `DSH_PERF_REVIEW` | 缺省未设置（关闭） | `=1` 才让宿主观测写样本 |
| `DSH_NSW_IDENTITY` / `DSH_NSW_USERNAME` | 不入库 | 共享工作区身份的环境兜底 |

> 这些名字出现在源码里，不代表本机已经配过。正式使用前由操作者写到 `DSH_HOME` 下的 0600 文件或环境变量，不要写进仓库。

---

## 10. 构建、测试与部署

### 10.1 命令

仓库根没有 `npm install`。在**每个要改的包**里单独做。共享包没有 `build`，记事本 / 选择器 / 文件树 / 共享工作区有。

```bash
cd dsh-nano-notepad          # 或另一个插件目录
npm install                  # 解析 file:../packages/*
npm run build                # esbuild → lib/

node --test test/*.mjs       # 仅记事本有 test/；共享包见 §10.3
```

安装到本机 web profile（合同见 [RELEASE.md](RELEASE.md) 与 [docs/agents/TEMPLATE.md](docs/agents/TEMPLATE.md)）：

```bash
dsh plugin --profile web add <spec>
```

`<spec>` 是该插件目录的绝对路径、`.tgz` 的绝对路径，或将来发布后的包名。没有 HMR 时要重启宿主再刷新；只刷新页面不会换宿主路由。本机开发实例怎么同步 `lib/`，见 [INTRODUCTION.md](INTRODUCTION.md) 的开发循环。不要把仓库目录当成日常实例已经加载的那一份。

没有根级 `lint`、`typecheck`、`preview` 或 `deploy` 脚本。

### 10.2 构建产物特性

- 浏览器包是包进 `window.__ModuleLoader__.load` 的 IIFE。`dsh-nano-ui` 与 `dsh-performance-review/client` 在里面，不外置。
- 记事本另外产出 `lib/perf-review-host.js` 与 `lib/s3-sync-host.js`（Node ESM，只把 `node:*` 留成 external）。
- 文件树与共享工作区把宿主实现打进 `lib/host.js`。选择器的 `lib/host-media.js` 被 `index.js` 直接 import，必须出现在 `files` 里。
- `npm pack` 不含 `src/`。改了源却没构建，tarball 里仍是旧行为。

### 10.3 测试分层

| 套件 / 层 | 跑法 | 覆盖 |
|-----------|------|------|
| `dsh-s3-client` | `node --test packages/dsh-s3-client/test/*.mjs` | URL 拼接、分页、ETag、限速、签名、账本。本次核对 16 通过。用 AWS 文档示例密钥，不访问网络 |
| `dsh-performance-review` | `node --test packages/dsh-performance-review/test/*.mjs` | 默认关闭、开关、INP 聚合、宿主快照。本次核对 60 通过 |
| notepad 文件名与 S3 profile | `node --test dsh-nano-notepad/test/*.mjs` | 后缀保持、重名、secret 不回显、切换回滚。本次核对 9 通过。不覆盖面板 DOM、不打真实桶 |
| explorer / model-selector / dsh-nano-ui | 无 | 没有 `test/` 或 `npm test`。（shared-workspace 已退役，不在此列） |
| 性能实验室 | `node lab/run.mjs …`（见 [lab/README.md](lab/README.md)） | 本机手动。不在本次核对里运行，也不能当成 CI |
| 安全审查复现 | 见审查报告自述 | 2026-11-11 的有界本地复现，不是本仓库的回归套件 |

> 上表「通过」只描述 2026-11-11 在 `350c6c8` 上的一次 `node --test`。没有 CI 会在下次提交时重跑。不要把这三个套件说成仓库「全绿」。

### 10.4 部署

没有生产部署。分发单位按 [RELEASE.md](RELEASE.md) 设计为每个插件一个 `npm pack` tarball，再附 SHA-256 与 GitHub artifact attestation 或 cosign。该文档里的 workflow YAML **没有**对应的 `.github/workflows/` 文件，也没有 `v*` tag。

本机三套 dsh（日常、插件开发、桌面）如何加载副本，写在 [INTRODUCTION.md](INTRODUCTION.md)。那些地址是操作者机器上的，不是本仓库的对外地址。

---

## 11. 安全与配置策略

### 11.1 环境变量：构建时 vs 运行时

| 变量 | 时机 | 暴露面 | 说明 |
|------|------|--------|------|
| `S3_NOTEPAD_*`、`DSH_NP_S3_ENV` | 运行时 | 仅宿主进程 | 只用于第一次播种。之后以 `nano-notepad-s3.json` 为准 |
| `DSH_HOME` / `DSH_DATA_DIR` | 运行时 | 仅宿主进程 | 决定状态文件放哪。浏览器看不到 |
| `DSH_NSW_IDENTITY` / `DSH_NSW_USERNAME` | 运行时 | 仅宿主进程 | 共享工作区身份兜底 |
| `DSH_PERF_REVIEW` | 运行时 | 仅宿主进程 | 不在页面 bundle 里打开宿主采集 |
| `?perf-review=1`、`localStorage['dsh-perf-review']` | 运行时 | 浏览器 | 只影响已经打进 `lib/client.js` 的观测包装 |

构建不读取这些变量。esbuild 不把 `.env` 打进 `lib/client.js`。

### 11.2 密钥政策

- 仓库策略：密钥、桶真值、本机手册、`context/`、实验室输出都不入库（见根 `.gitignore`）。
- 记事本 S3：`nano-notepad-s3.json` 模式 `0600`；API 不回 secret。这是已实现的存储政策，不是审查闭环。
- 共享工作区：身份进 dsh credentials 文件，同样不入库。
- 选择器：`/imagine` 的 grok 模板把 `GROK_HOME` 指到会话工作区里的 `imagine/.grok`，并会把 `~/.grok` 的文件拷进去。审查把「真实凭据进入工作区」标为高危，代码仍是这个行为（§12）。
- [RELEASE.md](RELEASE.md) 要求 SHA-256、校验在包外、清单用 attestation 或 cosign 绑定 CI。这条是目标政策。流水线不存在，所以今天的 tarball 没有这条保护。

此处不新冻结决策。修复执行层的既定口径在 [`docs/code-review/26-nov/pre-security-fix-qna.md`](docs/code-review/26-nov/pre-security-fix-qna.md)（`frozen`，Q1–Q10 / T-O-1–T-O-14）。那份文档冻结的是「怎么修」，不是「已经修好」。

### 11.3 BFF 隔离与接口防护

已做到的：

- 路由统一先问 `requestRejection`。
- 记事本 S3 secret 不出现在 `list` 响应里（有测试）。
- 文件树 POST 正文上限 64KB；记事本另存为与 S3 对象路由各有自己的上限。
- `osascript` 另存为走参数数组，不拼进脚本字符串。

没有做到、且审查已确认的：

- 页面内脚本与宿主被当成同一信任主体。
- `POST /nano-explorer-extra/read` 在 `allowOutsideWorkspace: true` 时不做工作区围栏。源码注释写「symlink 不能靠 allow flag 带出去」（[`routes.js:409`](dsh-nano-explorer-extra/src/host/routes.js#L409)），紧接着的条件与注释相反（[`routes.js:419`](dsh-nano-explorer-extra/src/host/routes.js#L419)）。以代码为准。
- 记事本 `/read` 不按工作区或扩展名收口。
- 共享工作区 `/ls`、`/mkdir` 接受本机绝对路径。
- 富文本与远端 manifest / 图片 MIME 的清洗不足以挡住存储型 XSS。细节与复现边界只维护在审查报告里，这里不重写步骤。

### 11.4 响应头

插件响应走 dsh `webServer`，不是本仓库的 `_headers` / CSP 文件。本仓库没有配置 HSTS、`X-Frame-Options` 或 `connect-src`。那些属于 dsh 与本机反代，不在这个 git 里。

---

## 12. 已知事项与设计取舍

### 设计亮点

- **作者树与运行时分离**：`src/` 可以依赖 `packages/`，发出去的只有 `lib/`。开发实例不拷 `node_modules` 也能加载。
- **观测默认是恒等函数**：关掉时不打点、不计时，功能路径与植入前一致。预算与实验室口径在规格和 [lab/README.md](lab/README.md)，不在热路径上常开。
- **记事本数据留在浏览器**：卸载插件不删 IndexedDB。云同步是后加的 opt-in，不是把笔记搬进宿主的前提。
- **端点切换可回滚**：未完成的切换在下次启动时回到原端点，并有单元测试。
- **共享 UI 只维护一份**：tab、固定高度对话框和菜单在 `dsh-nano-ui`，三个插件的 `lib/client.js` 各自带上一份构建结果。

### 待办 / 需复核

| 编号 | 事项 | 严重 / 时机 | reopen / 修复触发器 |
|------|------|-------------|----------------------|
| 1 | 安全审查 24 条 confirmed（16 高 / 6 中 / 2 低）仍是 `findings-open`。页面脚本可驱使宿主做文件、git、出站与 S3 签名；富文本与同步数据有存储型 XSS。审查基准写的是脏工作区上的 `8a70166`，不是本 HEAD | 上线前 / 给不可信页面用之前 | 按已冻结的 [`pre-security-fix-qna.md`](docs/code-review/26-nov/pre-security-fix-qna.md) 执行 `26-nov-security-fix`，并用 `350c6c8` 之后的树复验。修完前不要把任一插件标成可对不可信内容开放 |
| 2 | [RELEASE.md](RELEASE.md) 的 GitHub Actions、attestation、tag 与包版本对齐都未落地。本地 `npm pack` 可以打出 tarball，但没有包外校验 | 对外发包前 | 提交 `.github/workflows/` 并打第一个 `v*` tag 后，把本节改成有运行链接的证据 |
| 3 | ~~共享工作区规格与包内 README 落后于源码~~ | **已关闭（退役）** | 2026-11-12 由 [业主] 裁决 deprecated，不再维护规格与 README；源码归档在 [`deprecated/dsh-nano-shared-workspace/`](deprecated/README.md)，无需再补跨机验收 |
| 4 | 记事本 [`package.json:4`](dsh-nano-notepad/package.json#L4) 仍写 “Floating Markdown notepad”。行为已是任意文本（[`db.js:137`](dsh-nano-notepad/src/client/db.js#L137)）。`locale/zh.json` 的市场描述同样偏 Markdown | 下次发包前 | 改描述并与规格 [README](docs/specs/dsh-nano-notepad/README.md) 对齐 |
| 5 | 文件树、选择器、`dsh-nano-ui` 没有自动化测试。记事本测试不覆盖 XSS、路由围栏或真实 S3（shared-workspace 已退役，不再计入） | 长期 | 给 §11.3 的围栏和记事本清洗各加失败即红的测试，再声称回归 |
| 6 | `dsh-nano-ui` 的 `publishConfig` 指向 `https://npm.pkg.github.com`，本仓库看不到发布记录。插件用 `file:` 依赖，不依赖那次发布 | 长期 | 若不再打算发布，改掉 `publishConfig`，避免读者以为 GitHub npm 上有可用版本 |
| 7 | 性能实验室依赖本机已登录浏览器与 git 忽略的 `lab/config.local.json`。规格与 [lab/README.md](lab/README.md) 已经记录和 Playwright 设想的差异 | 不挡开发 | 没有把 lab 接进 CI 的决定；接之前不要在状态表写实验室全绿 |
| 8 | 选择器同时探测 grok 与 codex（[`lib/host-media.js:14`](dsh-nano-model-selector/lib/host-media.js#L14)）。本次核对没有对任一 CLI 做真实出图 | 使用 `/imagine` 前 | 在目标机器上各跑一次并记下引擎版本 |

> **诚实闸**：§1 与 §10 没有宣称 CI 全绿或公开 `live`。§10.3 的「通过」若过期，以当时的 `node --test` 输出为准，不要沿用本表的日期。

---

## 13. 总体评价

这是一个结构清楚的 dsh overlay 单仓：插件边界、构建期共享包、`src/` 与 `lib/` 的分工都已经能让后来的人按图改一个包。记事本的本地优先和可选 S3、文件树的 Git 卡片、选择器的 rail，在源码层是连着的，而不是空目录。

它还不是一个可以对外宣称「已加固、已发布」的交付物。信任链停在 [RELEASE.md](RELEASE.md) 的设计，安全审查停在「已确认、未修」。共享工作区的路由已经超过它自己的规格和包内说明。接下来若只做一件事，应是按已冻结的修复口径处理审查里的高危项，并让规格文本跟上 `src/host`；在那之前，本仓库的准确描述是「可在操作者自己的 dsh web 上加载的插件源码」，不是「已上线的服务」。

---

## 附录

### C. 修订历史

| 版本 | 日期 | 作者 | 主要变更 |
|------|------|------|----------|
| v0.1 | 2026-11-11 | Sean.Z | 初稿。对照 `350c6c8` 写档 A 架构 README：能力状态、路由、测试范围、未接线的发布链与仍开放的安全审查 |
