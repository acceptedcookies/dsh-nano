# dsh-nano-ui

三个 overlay 插件共用的 UI 原语 package（**非插件**，无 dsh bundle 声明）。封装于 `@deepseek-ai/dsh-client-ui-primitives` 与 React 18 之上，提供成品样式组件。

| 元信息 | 值 |
|---|---|
| 版本 | `0.1.0` |
| 类型 | 共享 package（npm，GitHub Packages 发布） |
| sideEffects | `false`（纯桶文件，可 tree-shake） |
| 文档更新 | 2026-11-09 |

## 树状结构

```
packages/dsh-nano-ui/
├── index.js                  # re-export 桶，无逻辑
├── package.json              # 包名/版本/peer/files/publishConfig
└── src/
    ├── dialog.js             # NanoDialog：声明式模态框组件
    ├── menu.js               # NanoMenu / NanoMenuItem：下拉与上下文菜单
    ├── toast.js              # NanoToast：轻提示
    ├── dom.js                # openNanoDialog / openNanoMenu：命令式挂载辅助
    └── styles.js             # NANO_STYLES：共享 CSS（含 .np-switch N 段滑轨）
```

## 详细说明

- **消费方式**：插件以 `file:../packages/dsh-nano-ui` 依赖，经各自 esbuild bundle 进 `lib/client.js`；运行时不单独解析此包。
- **导出全览**：

| 导出 | 形态 | 用途 |
|---|---|---|
| `NanoDialog` | React 组件 | 模态对话框 |
| `openNanoDialog` | 命令式 | 手动挂载对话框 |
| `NanoMenu` / `NanoMenuItem` | React 组件 | 菜单渲染 |
| `openNanoMenu` | 命令式 | 手动挂载菜单 |
| `NanoToast` | React 组件 | toast |
| `NANO_STYLES` | CSS 字符串 | 共享样式（`.np-switch` 等） |

- **发布**：`publishConfig.registry = https://npm.pkg.github.com`；`files` 仅 `index.js` + `src/`；`private: false`。

## 依赖

| 类别 | 包 | 版本 |
|---|---|---|
| dependencies | （无） | — |
| devDependencies | （无） | — |
| peerDependencies | `react` | `>=18` |
| peerDependencies | `react-dom` | `>=18` |
| peerDependencies | `@deepseek-ai/dsh-client-ui-primitives` | `>=0` |

## 原生对比

| | dsh 原生 `dsh-client-ui-primitives` | dsh-nano-ui |
|---|---|---|
| 定位 | headless 无样式行为原语 | 成品样式组件 |
| 形态 | hooks/基础组件 | 声明式 + `open*` 命令式 |
| 使用方 | 官方 UI 包 | 本仓库三个插件 |
