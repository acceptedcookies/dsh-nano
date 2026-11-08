# AGENTS.md

本仓库用于开发和维护 DeepSeek Harness (dsh) 插件。

## 仓库结构

- `dsh-nano-notepad/` — dsh overlay 插件（cordis.patch 插件），源码位于 `src/`、`lib/`、`index.js`
- `context/` — 各目录下的参考资料（git 忽略，不入库）
- `AGENTS.md` — 本文件

## 本地环境

本机已部署双实例 dsh 环境：**日常实例** `https://dsh.local/`（数据 `~/.dsh`）与**插件开发实例** `https://dsh-dev.local/`（数据 `~/.dsh-dev`），开发实例用于加载本仓库的插件。

**调试、启动、升级前请先阅读本地部署手册：[.local-dsh-setup.md](.local-dsh-setup.md)**（git 忽略，仅存在于本机）。涵盖：

- 双实例的端口/数据目录/LaunchAgent 对应关系
- `dsh-local` / `dsh-dev` 管理命令
- Caddy 反代、DNS、HTTPS、token broker 配置
- 第 9 节调试手册与第 14 节「插件开发实例」

## 备注

- `context/` 目录（含 `context/deepseek-harness/` 参考检出）一律不入库，见 `.gitignore`。
- 改动开发实例后需在 `https://dsh-dev.local/` 验证，日常实例不受影响。
