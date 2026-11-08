# dsh-nano-explorer-extra

工作区文件浏览器增强 overlay 插件：在侧栏文件树上叠加 Git 状态、状态栏与内联文件操作。

## 功能列表

- 行内 Git 状态字母（M/A/?/D/R/U），目录含变更时整行着色
- gitignore 条目专用墨色弱化；外链软链接标记，展开前询问
- 底部状态栏：文件/目录计数与体积，遍历让出事件循环
- 内联新建 / 重命名 / 删除 + 右键菜单
- host 侧 6 条 `/nano-explorer-extra/*` HTTP 路由（列举、状态、统计、增删改）

## 原生对比

| | dsh 原生 `ui-sidebar-files` | dsh-nano-explorer-extra |
|---|---|---|
| 文件树 | ✅ `FileNavigator` 只读浏览/定位 | ✅ + 状态标记扩展 |
| Git 状态染色 | ❌ | ✅ 文件字母 + 目录整行 |
| gitignore 弱化 | ❌ | ✅ |
| 底部统计栏 | ❌ | ✅ |
| 新建/重命名/删除 | ❌ | ✅ 内联 + 右键 |
| 变更 diff 视图 | 见 `client-ui-forge` 实验包 | ❌（不在范围） |

## 结构

- `src/host/` — `routes.js` / `listing.js` / `git.js` / `stats.js` / `mutate.js` / `entry.js`
- `src/client/` — `tree.js` / `accessory.js` / `statusbar.js` / `menu.js` / `dialogs.js` / `styles.js` 等
- `lib/host.js` + `lib/client.js` — esbuild 产物
- inject：`api-workspace-files`、`ui-sidebar-files`、`ui-sidebar-right`、`ui-session`、`ui-context-menu`、`ui-primitives`、`shortcuts`
- 依赖 `dsh-nano-ui`；规格见 `context/spec.md`（不入库）
