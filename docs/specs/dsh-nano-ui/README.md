# dsh-nano-ui

本仓库三个 overlay 插件共用的 UI 原语包（非插件，无 dsh bundle 声明）。基于 `@deepseek-ai/dsh-client-ui-primitives` 与 React 18 构建。

## 导出

| 导出 | 用途 |
|---|---|
| `NanoDialog` / `openNanoDialog` | 模态对话框组件与命令式打开 |
| `NanoMenu` / `NanoMenuItem` / `openNanoMenu` | 下拉/上下文菜单 |
| `NanoToast` | 轻提示 |
| `NANO_STYLES` | 共享 CSS（`.np-switch` 滑轨开关等，支持 N 段） |

## 结构

- `index.js` — 纯 re-export 桶文件，`sideEffects: false`
- `src/` — `dialog.js`、`menu.js`、`toast.js`、`dom.js`（挂载辅助）、`styles.js`

## 使用方式

插件侧以 `file:../packages/dsh-nano-ui` 依赖引用，经各自 `esbuild` bundle 进 `lib/client.js`，运行时不再解析此包。

- `peerDependencies`：`react >=18`、`react-dom >=18`、`@deepseek-ai/dsh-client-ui-primitives`
- `publishConfig` 指向 GitHub Packages；`files` 仅发 `index.js` 与 `src/`
