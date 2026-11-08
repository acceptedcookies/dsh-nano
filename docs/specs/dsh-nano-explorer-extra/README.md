# dsh-nano-explorer-extra

增强的工作区文件浏览器 overlay 插件：在侧栏文件树上叠加 Git 状态、底部状态栏和内联文件操作。

## 功能

- 文件树行内 Git 状态标记（M/A/?/D/R/U），目录含变更时整行着色
- 忽略条目（gitignore）以专用墨色弱化显示；外链软链接标记并在展开前询问
- 底部状态栏：目录统计（文件/目录计数、体积），大工作区遍历时让出事件循环
- 内联新建/重命名/删除，右键菜单集成
- host 侧 6 条 HTTP 路由（`/nano-explorer-extra/*`）：目录列举、Git 状态、统计、创建/重命名/删除，64 KB body 上限 + JSON envelope

## 结构

- `src/host/` — `routes.js`（HTTP 入口）、`listing.js`、`git.js`、`stats.js`、`mutate.js`（文件操作）、`entry.js`
- `src/client/` — `tree.js`（树集成）、`accessory.js`（行标记 seat）、`statusbar.js`、`menu.js`、`dialogs.js`、`styles.js`、`paths.js`、`format.js`
- `lib/host.js` + `lib/client.js` — esbuild 产物
- `context/spec.md` — 设计规格（不入库）

## 依赖

`dsh-nano-ui`。inject：`api-workspace-files`、`ui-sidebar-files`、`ui-sidebar-right`、`ui-session`、`ui-context-menu`、`ui-primitives`、`shortcuts`。
