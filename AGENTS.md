# AGENTS.md

本仓库开发和维护 DeepSeek Harness (dsh) 插件。这里的读者是在本仓库里改代码的 agent。

只拿到单个包去安装的 agent，读该包自己的 `AGENTS.md`，不读本文件。包内那份必须自洽：它会打进 tarball，不能依赖本文件、`docs/`、`context/` 或 `.local-dsh-setup.md`。

> **开荒手册**：[INTRODUCTION.md](INTRODUCTION.md) 面向第一次在本仓库写插件的 agent，涵盖本机三实例拓扑、dsh 插件机制、共享包与 notepad 案例、新插件模板、防踩坑清单、安全与性能机制、网络文档参考。在本仓库动手前先读它；安装侧的唯一合同仍是各包自己的 `AGENTS.md` 与 [docs/agents/TEMPLATE.md](docs/agents/TEMPLATE.md)。

## 仓库结构

| 路径 | 角色 |
|---|---|
| [INTRODUCTION.md](INTRODUCTION.md) | 插件开荒手册：本机拓扑、机制全景、两个 case study、开发模板、防踩坑、安全与性能、网络参考 |
| [dsh-nano-notepad/](dsh-nano-notepad/AGENTS.md) | 悬浮记事本。接入见包内 AGENTS.md，规格见 [docs/specs/dsh-nano-notepad/README.md](docs/specs/dsh-nano-notepad/README.md) |
| [dsh-nano-model-selector/](dsh-nano-model-selector/AGENTS.md) | 模型选择器与 `/imagine`。规格见 [docs/specs/dsh-nano-model-selector/README.md](docs/specs/dsh-nano-model-selector/README.md) |
| [dsh-nano-explorer-extra/](dsh-nano-explorer-extra/AGENTS.md) | 工作区文件浏览器增强。规格见 [docs/specs/dsh-nano-explorer-extra/README.md](docs/specs/dsh-nano-explorer-extra/README.md) |
| [dsh-nano-shared-workspace/](dsh-nano-shared-workspace/README.md) | 共享工作区。尚无包内 AGENTS.md。规格见 [docs/specs/dsh-nano-shared-workspace/spec.md](docs/specs/dsh-nano-shared-workspace/spec.md) |
| [packages/dsh-nano-ui/](docs/specs/dsh-nano-ui/README.md) | 构建期共享 UI。打进各插件的 `lib/client.js`，不单独安装 |
| [packages/dsh-performance-review/](packages/dsh-performance-review/README.md) | 构建期性能观测库。打进各插件的 `lib/client.js` / `lib/host.js`，不单独安装。规格见 [docs/specs/dsh-nano-performance-review/spec-26nov.md](docs/specs/dsh-nano-performance-review/spec-26nov.md) |
| [packages/dsh-s3-client/](packages/dsh-s3-client/README.md) | 宿主侧通用 S3 客户端（SigV4 + 令牌桶限速 + 用量账本）。notepad / shared-workspace 共用，不单独安装 |
| [docs/agents/TEMPLATE.md](docs/agents/TEMPLATE.md) | 包内 AGENTS.md 的母版 |
| [docs/specs/](docs/specs/) | 各包规格。notepad、model-selector、explorer-extra、dsh-nano-ui 根目录的 `README.md` 是指向这里的软链接 |
| [release.md](release.md) | 发布流程与安全信任链 |
| `context/` | 参考资料。git 忽略，不入库 |
| `.local-dsh-setup.md` | 本机双实例手册。git 忽略，仅存在于本机 |

## A2A onboarding 状态

三份包内 AGENTS.md 已按 [docs/agents/TEMPLATE.md](docs/agents/TEMPLATE.md) 对齐（2026-11-09）。

| 包 | 包内 AGENTS.md | 规格 | 状态 |
|---|---|---|---|
| `dsh-nano-notepad` | [AGENTS.md](dsh-nano-notepad/AGENTS.md) | [README](docs/specs/dsh-nano-notepad/README.md) | 已对齐。中文。`files` 含 `AGENTS.md`、`lib/client.js` |
| `dsh-nano-model-selector` | [AGENTS.md](dsh-nano-model-selector/AGENTS.md) | [README](docs/specs/dsh-nano-model-selector/README.md) | 已对齐。中文。`files` 含 `AGENTS.md`、`lib/client.js`、`lib/host-media.js` |
| `dsh-nano-explorer-extra` | [AGENTS.md](dsh-nano-explorer-extra/AGENTS.md) | [README](docs/specs/dsh-nano-explorer-extra/README.md) | 已对齐。中文。`files` 含 `AGENTS.md`、`lib/host.js`、`lib/client.js` |
| `dsh-nano-shared-workspace` | 无 | [spec.md](docs/specs/dsh-nano-shared-workspace/spec.md) | 未写 onboarding。要写就套母版，不要另起标题 |
| `dsh-nano-ui` | 无 | [README](docs/specs/dsh-nano-ui/README.md) | 构建期库，不是 overlay 插件，不写安装向 AGENTS.md |

共同结构：标题下三段范围，然后十一个二级标题，顺序固定：身份、交付物、前置、安装、验收、初次运行、使用、配置与状态、构建、故障、不要。安装只有 `dsh plugin --profile web add <spec>`。版本号和引擎范围指向各包 `package.json`，不写死。

不变段落以母版为准。改安装合同先改母版，再逐字抄回三个包。不要把本机的 `~/.dsh`、`~/.dsh-dev` 或 launchd 写进包内 AGENTS.md。

## 本地环境

本机已部署三套互相隔离的 dsh 环境：**日常实例** `https://dsh.local/`（数据 `~/.dsh`）、**插件开发实例** `https://dsh-dev.local/`（数据 `~/.dsh-dev`）、**桌面版** `/Applications/DeepSeek Harness.app`（数据 `~/.dsh-desktop`）。开发实例用于加载本仓库的插件。三套的端口、数据真源、启动命令与验证口径见 [INTRODUCTION.md](INTRODUCTION.md) 第 1 节。

**调试、启动、升级前请先阅读本地部署手册：[.local-dsh-setup.md](.local-dsh-setup.md)**（git 忽略，仅存在于本机）。涵盖：

- 双 web 实例的端口/数据目录/LaunchAgent 对应关系
- `dsh-local` / `dsh-dev` 管理命令
- Caddy 反代、DNS、HTTPS、token broker 配置
- 第 9 节调试手册与第 14 节「插件开发实例」

桌面版的 `DSH_HOME` 隔离、profile 独占与 `kickstart` 陷阱见 [.local-desktop-setup.md](.local-desktop-setup.md)（git 忽略）。

## 备注

- `context/` 目录（含 `context/deepseek-harness/` 参考检出）一律不入库，见 `.gitignore`。
- 改动开发实例后需在 `https://dsh-dev.local/` 验证，日常实例不受影响。
- 发布、打包和校验见 [release.md](release.md)。安装侧命令以各包 AGENTS.md 的「安装」为准。
