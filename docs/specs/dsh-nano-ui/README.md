# dsh-nano-ui

三个 overlay 插件共用的 UI 原语 package（本身非插件，无 dsh bundle 声明）。封装于 `@deepseek-ai/dsh-client-ui-primitives` 与 React 18 之上。

## 功能列表（导出）

| 导出 | 用途 |
|---|---|
| `NanoDialog` / `openNanoDialog` | 模态对话框（声明式组件 / 命令式打开） |
| `NanoMenu` / `NanoMenuItem` / `openNanoMenu` | 下拉与上下文菜单 |
| `NanoToast` | 轻提示 toast |
| `NANO_STYLES` | 共享 CSS（含 `.np-switch` N 段滑轨开关） |

## 原生对比

| | dsh 原生 `dsh-client-ui-primitives` | dsh-nano-ui |
|---|---|---|
| 定位 | 底层无样式行为原语 | 三个插件的成品样式组件 |
| 形态 | headless hooks/组件 | 声明式组件 + `open*` 命令式挂载 |
| 使用方 | 官方各 UI 包 | 本仓库插件，esbuild 打包进 `lib/` |

## 结构

- `index.js` — re-export 桶，`sideEffects: false`
- `src/` — `dialog.js` / `menu.js` / `toast.js` / `dom.js`（挂载辅助）/ `styles.js`
- 消费方式：插件 `file:../packages/dsh-nano-ui` 依赖，bundle 进各自 `lib/client.js`
- `peerDependencies`：`react`、`react-dom`、`@deepseek-ai/dsh-client-ui-primitives`
- 发布：GitHub Packages，`files` = `index.js` + `src/`
