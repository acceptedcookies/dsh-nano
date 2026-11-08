# dsh-nano-notepad

一个悬浮 Markdown 记事本 overlay 插件。笔记文件、版本历史和图片全部保存在浏览器内（IndexedDB），不落服务端工作区。

## 功能

- 悬浮面板内编辑 Markdown，支持渲染/源码视图切换（`defaultView`）
- 自动保存（`saveDelayMs` 防抖）+ 版本历史（`commitIntervalSec` / `versionLimit` 控制快照频率与上限）
- 图片粘贴/插入（`imageLimitBytes` 上限），随笔记存在浏览器数据库
- 「另存为」走真系统对话框：host 端 `/nano-notepad/save` 调 `osascript choose file name`
- 中英双语 locale（`locale/zh.json`、`locale/en.json`）

## 结构

- `index.js` — host 半侧。数据全在浏览器端，host 只提供配置默认值（`Config`）与保存路由
- `src/client/` — 面板 UI：`panel.js`（布局）、`markdown.js`（渲染）、`db.js`（IndexedDB 持久层）、`i18n.js`
- `lib/client.js` — `npm run build`（esbuild）产物，浏览器加载
- `cordis.patch.yml` — bundle patch，注入点见 `package.json` 的 `dsh.client.inject`（ui-layout / shortcuts / theme / locale / workspace / session controller）

## 依赖

`dsh-nano-ui`（共享 dialog/menu/toast 原语）。
