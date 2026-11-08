# dsh-nano-explorer-extra

工作区文件浏览器增强 overlay 插件：在侧栏文件树上叠加 Git 状态、底部状态栏与内联文件操作。是唯一带 host 半侧的插件。

| 元信息 | 值 |
|---|---|
| 版本 | `0.1.1` |
| 类型 | dsh overlay 插件（host + client 双端） |
| dsh 引擎 | `>=0.2.2-rc.1 <0.3.0` |
| 构建 | `node scripts/build-client.mjs`（esbuild 0.25.0） |
| 文档更新 | 2026-11-09 |

## 树状结构

```
dsh-nano-explorer-extra/
├── index.js                  # 入口 + inject 声明
├── cordis.patch.yml          # bundle patch 声明
├── package.json
├── package-lock.json
├── icon.svg
├── locale/
│   ├── zh.json
│   └── en.json
├── src/
│   ├── host/                 # host 半侧：HTTP 路由与工作区操作
│   │   ├── routes.js         # /nano-explorer-extra/* 路由入口（64KB body 上限）
│   │   ├── listing.js        # 目录列举、路径解析、越界检查
│   │   ├── git.js            # git status 读取与解析
│   │   ├── stats.js          # 目录统计（计数/体积，遍历让出事件循环）
│   │   ├── mutate.js         # 创建/重命名/删除
│   │   └── entry.js          # host 装配
│   └── client/               # 客户端 UI
│       ├── index.js          # 挂载点
│       ├── tree.js           # 文件树集成
│       ├── accessory.js      # 行末标记 seat（git 字母/目录点/忽略 flag）
│       ├── statusbar.js      # 底部状态栏
│       ├── menu.js           # 右键菜单
│       ├── dialogs.js        # 新建/重命名对话框
│       ├── settings.js       # 插件设置卡
│       ├── prefs.js          # 偏好持久化
│       ├── body.js           # 面板主体
│       ├── paths.js          # 路径工具
│       ├── names.js          # 命名/展示工具
│       ├── format.js         # 数字/体积格式化
│       ├── styles.js         # 行染色/标记/忽略墨色 CSS
│       └── i18n.js
├── lib/
│   ├── host.js               # host 打包产物
│   └── client.js             # client 打包产物
├── scripts/build-client.mjs
├── context/spec.md           # 设计规格（git 忽略）
└── node_modules/
```

## 详细说明

- **Git 状态**：文件行末字母标（M/A/?/D/R/U）；目录含变更时整行着色（名称+图标）。
- **忽略条目**：gitignore 命中的行用 `--nxe-ignored-ink` 专用墨色弱化（比半透明在暗色下更可读）。
- **软链接**：外链目标标记，展开前询问一次。
- **状态栏**：统计文件/目录数与体积；`stats.js` 每 200 项 `setImmediate` 让出事件循环，防阻塞 SSE/WS 载体重连。
- **文件操作**：内联新建/重命名/删除，右键菜单驱动，经 host mutate 路由落盘。
- **inject**：`api-workspace-files`、`ui-sidebar-files`、`ui-sidebar-right`、`ui-session`、`ui-context-menu`、`ui-primitives`、`client-shortcuts`。

## 依赖

| 类别 | 包 | 版本 |
|---|---|---|
| dependencies | `dsh-nano-ui` | `file:../packages/dsh-nano-ui` |
| devDependencies | `esbuild` | `0.25.0` |
| peer | （无） | — |

## 原生对比

| | dsh 原生 `ui-sidebar-files` | dsh-nano-explorer-extra |
|---|---|---|
| 文件树 | ✅ `FileNavigator` 只读浏览 | ✅ + 状态标记扩展 |
| Git 染色 | ❌ | ✅ 文件字母 + 目录整行 |
| gitignore 弱化 | ❌ | ✅ 专用墨色 |
| 底部统计栏 | ❌ | ✅ |
| 新建/重命名/删除 | ❌ | ✅ 内联 + 右键 |
| 变更 diff | 见实验包 `client-ui-forge` | ❌ 不在范围 |
