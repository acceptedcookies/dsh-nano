# dsh-nano-notepad

悬浮 Markdown 记事本 overlay 插件。笔记内容、版本历史与图片全部驻留浏览器（IndexedDB），与工作区文件系统隔离。

## 功能列表

- 浮动面板编辑 Markdown，渲染 / 源码视图切换（`defaultView`）
- 防抖自动保存（`saveDelayMs`）+ 版本历史快照（`commitIntervalSec` / `versionLimit`）
- 图片粘贴与存储，`imageLimitBytes` 上限
- 「另存为」调真系统对话框：host 路由 `/nano-notepad/save` → `osascript choose file name`
- 中英双语 locale

## 原生对比

| | dsh 原生 | dsh-nano-notepad |
|---|---|---|
| 记事本 | ❌ 无对应功能 | ✅ 浮窗 Markdown 记事 |
| 数据存放 | — | 浏览器 IndexedDB，不进工作区 |
| 版本历史 | — | ✅ 周期性快照可回看 |
| 导出文件 | — | ✅ macOS 原生保存对话框 |

## 结构

- `index.js` — host 半侧：`Config` 默认值 + 保存路由
- `src/client/` — `panel.js` / `markdown.js` / `db.js` / `i18n.js`
- `lib/client.js` — esbuild 产物；inject：layout / shortcuts / theme / locale / workspace / session
- 依赖 `dsh-nano-ui`
