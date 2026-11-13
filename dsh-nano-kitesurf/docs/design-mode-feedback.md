# Cursor Design Mode 反馈记录

检索日期：2026-11-13。只记这次实际读到的来源，不补写没打开的帖子。

## 来源

1. [Annotations (former Design mode) doesn't make it well](https://forum.cursor.com/t/annotations-former-design-mode-doesnt-make-it-well/174869) — Martin_Hardoy，约 2026-10。
   - 旧 Design Mode：Ctrl/Cmd+L 把选中元素和批注放进聊天输入框，Ctrl/Cmd+Enter 直接发给 agent。换页面时已经写下的文字还在，或被放进输入框。
   - 改名 Annotations 之后这些做不到。Batch edits 写了 7 条，一切页面，列表消失。
   - Cursor 员工 Colin：Return 的行为是有意改的。

2. [Bring back the Design Sidebar](https://forum.cursor.com/t/bring-back-the-design-sidebar-why-design-mode-feels-like-a-step-backward/158818) — islam，约 2026-04。
   - 旧侧栏可以先改 margin、颜色、字体，看效果再写进代码。
   - 现在的 Design Mode 只是选中后交给 agent，不能自己试。作者认为 agent 不够，因为不能先看再提交。

3. [Cursor Design Mode in 2026](https://www.totalum.app/blog/cursor-design-mode-totalum) — 2026-06。
   - 点选是对 Lovable、Bolt、v0 的回应。
   - 同一篇更强调上下文用量：长会话会顶满窗口，skill 和 MCP 工具定义本身就能占掉大量 token。

4. [superset-sh/superset d7e4385](https://github.com/superset-sh/superset/commit/d7e4385e1e2698613aa1279d1615282644fee96b) — 2025-10。
   - 他们模仿 Cursor，把 fiber props 放进上下文，但做了限额：浅层、脱敏、一行、8 项、500 字符。函数和对象只记类型。

## 对照和落地

| 吐槽 | 我们怎么处理 | 验证 |
|---|---|---|
| 选中内容进不了输入框 | dock 的 Into composer 追加到 `[data-composer-input]`，不覆盖已有草稿 | ego-browser 看输入框出现 `[kitesurf]` |
| 换页丢掉正在写的话 | 批注输入框不随 Open 清空 | 单测不覆盖 UI 状态；页面上 Open 之后 ask 还在 |
| 整页截图和 DOM 撑爆上下文 | 回传短笔记，不把 PNG 或 outerHTML 放进 composer。文本 80 字，整条不超过 640 字。空的 computed style 不写 | `test/note.test.mjs` |
| fiber props 又大又不稳定 | Kitesurf 没有组件栈。笔记写 `stack: none`，不编造文件名 | 笔记里有这行 |
| 只选中不能先试样式 | 不做可视化改 CSS。Kitesurf 的 `DOM.highlightNode` 是空的，盒子也不是真的 margin/padding。先试样式会假装改到了页面 | 不实现 |
| 点到页面背景时把整页文字塞进上下文 | `html` / `body` 只记 `hit: page root`，不引用 innerText。透明背景和 `position: static` 不写。截图用 object-fit 时，点在留白上不换算成页面坐标 | `test/note.test.mjs`、`test/shot-point.test.mjs` |
