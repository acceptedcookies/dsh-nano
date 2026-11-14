# element-packets — 人点选的包、ref 语言、手势语义

## 元素 ref `@N`（人=agent 同一语言）

`GET /nano-kitesurf/snapshot` 的 a11y-lite walker 给每个可交互元素一个 `@N`，并返回该元素的 selector。`GET /nano-kitesurf/refs?ref=@N` 反查 selector。**人点选** `/pick` 返回 `element.ref:"@N"`——宿主在页内用 `querySelector` identity probe 把 pick 的 `html > body > a` 与 walker 的 `a` 归一到同一 `@N`。**同一次点选，人和 agent 引用的是同一个节点。** `@N` 直接可作 `wait`/`pick`/`edit` 的 `selector` 值；`@N` 不在当前表 = `kitesurf.ref.miss`（404，先 `/snapshot` 重建表）。

注意：pick 的 `element.selector` 是绝对路径（`html > body > a`），walker 的 `refs[@N].selector` 是简洁式（`a`）——**不要字符串比较**，用 `element.ref` 或 `GET /refs` 的 `@N` 作交接键。

## 人点选进 composer

Into composer 追加一条 `[kitesurf]` 短注到现有草稿，不替换人已打的字、不附截图。含页面 URL、一个 selector、≤80 字符元素文本、圆整 box、仅有差异的 computed style，≤640 字符。`hit: page root` = 点落在 `html`/`body`；`limit: iframe script is not inspected` = 子文档未读。拖画 `mark: area`+box；Alt+拖 `mark: ellipse`；Shift+拖 `mark: arrow`+`line: x1,y1 x2,y2`。note 开着时 Shift+click 追加第二个元素 → `els: N`+编号 `el1/el2`/`box1/box2`，≤1280 字符。多条 note 折成 `[kitesurf batch N]`，≤1600 字符，至多 8 pin。`stack: none` = 无组件解析；有 React fiber 时 `stack: Child → Parent → …`（组件显示名，最后=最近祖先）。

agent 不 attach CDP 也能拿人的最后点选：`GET /nano-kitesurf/last` 返回开着 note 的完整元素包（elements/boxes/styles/parentSel/childSel/`element.ref`）——note-pull API，与点选同构。已发的 note 页面变了仍列出。pin 点在画面上，点一个 dot 只丢那条，⌘Z 弹最后，pins strip 清空。**不要把 note 展开成 HTML/截图/猜的组件。**

## 手势（Cursor design-mode parity）

click 点选；Shift+click 向开着的 note 追加元素；Alt+click（无 note）直送 composer；普通拖画 box；Alt+拖 ellipse；Shift+拖 arrow。note 开着时 ↑ 选父、↓ 选最大可见子，`parentSel`/`childSel` 携带这些 selector。点选后气泡三按钮：**箭头=把元素上下文注入 composer（无需文字）**、**复制=同上下文写剪贴板**、**铅笔=展开输入框补备注**（展开后箭头/回车注入，Shift+回车入队）。**任何按钮都不自动发送 composer 给模型**——只注入、等人决定。双击元素就地改字（写回页面）。Esc 依次关拖/note/annotate；⌘⇧D 开关 annotate；⌘Z 撤最后 pin；⌘L note 开着时推入 composer。annotate 开着时虚线框预览光标下元素（`preview:true` pick，不动 `lastPick`）。

## shot / open / history / pick 请求细节

`POST /nano-kitesurf/open` 导航；`POST /nano-kitesurf/shot` 截图——可选 `{"scroll":±px}`（≤4000）、`{"format":"webp"|"png"|"jpeg","quality":1..100}`、`{"fit":{"width":W,"height":H}}`。默认 webp q82（example.com 帧 61KB vs PNG 226KB），响应带 `mimeType`+`format`。**`fit` 是默认**：pane `ResizeObserver` 量自身内容区、把引擎视口设同尺寸再截，图与面板 1:1 无黑边（旧 1280×720 在竖长面板浪费 55%~80% 像素）。要固定视口做响应式对比才传 `/settings viewport`。`POST /nano-kitesurf/history {"delta":-1|1}` 是真浏览器进退（引擎 navigationHistory），非滚动。

已登录 Harness 页 `GET /nano-kitesurf/last` 读最后裸包。每次 shot/pick 返回页面身份（`url`/`scrollY`/`targetId`/`viewport`）；pane 比对、漂移时自动重截并警告（`页面已变化…`），点在位移过的画面上不会静默命中错元素。`POST /pick` 用 `{x,y}`（视口像素）或 `{selector}`（↑↓ 父子重选或 `@N`）。双击 note 开着时切就地改字，`POST /edit {selector,text}` 写回页面。

坐标假定 deviceScaleFactor 1；若 viewport 仿真改过，从 note 里的 box 重导坐标。截图 `<img>` 是 `object-fit:contain`：letterbox 带内的点合法地打空，用 `GET /console?level=navigation` 或重 `/shot` 再怪引擎。
