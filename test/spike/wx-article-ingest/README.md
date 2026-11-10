# test/spike/wx-article-ingest — 微信公众号文章导入与富文本渲染 spike 宪章

> **一句话定义**：验证「把一篇 `mp.weixin.qq.com` 文章变成记事本里一个可离线浏览、排版还原的条目」这条链路在真实宿主上的每一环是否成立——**抓取 → 抽取正文 → 清洗 → 存储 → 渲染 → 图片可达**。spike 只产事实：每个环节给 `ego PASS` / `offline PASS` / `RED` 的结论与实测数值，不改任何包源码。

| 锚 | 值 |
|---|---|
| 建档日期 | 2026-11-10 |
| 验证实例 | `https://dsh-dev.local/`（ego-browser，真 Chromium + 真插件宿主 + 真 IndexedDB） |
| 目标域 | `mp.weixin.qq.com`、`mmbiz.qpic.cn`（仅 `GET`，只取本宪章声明的样例文章） |
| 上游真相 | `dsh-nano-notepad/src/client/panel.js`（`import()` ~L2540、`isJson()` L692、`renderBody` ~L990、`renderMarkdown` 调用点）· `src/client/markdown.js`（渲染器 L35）· `src/client/db.js`（`images`/`blobs` store L90-97）· `src/client/index.js`（client 入口与 inject）· `index.js`（宿主端，`/nano-notepad/read`、`/nano-notepad/save` 路由） |
| 证据上限 | 本 spike 不承诺最终 UI 形态、不承诺 markdown 转换质量、不承诺非 mp 域的富文本；只回答「微信链路各环节可行性 + 代价量级」 |

**边界声明**：不改 `dsh-nano-notepad/src/**`、`dsh-nano-ui` 任何文件、profile 配置、IDB schema。所有实验通过 `__nanoNotepad.import()` 灌样例 + `evaluate` 观测；导入的测试文件验完即删，会话还原。`dsh.local` 禁碰。外发请求仅 `GET`，且只打锚表声明的两个域。

---

## §1 现状分析：记事本今天能装什么

| 层 | 真源 | 已证事实 |
|---|---|---|
| 文件类型 | `import()` 后缀白名单 `md/markdown/json`，其余归 `.md`；`isJson()` 切 JSON 工具 | **只有两类渲染**：markdown 双态 / JSON 源码+树。没有「HTML 文件」概念 |
| 渲染面 | `.np-read` 注入 `renderMarkdown()` 产出的 HTML；`<img>` 支持 `data:` 与外链 | 渲染面**已接受任意 HTML 字符串**——瓶颈在产出端与清洗，不在容器 |
| 图片存储 | `images` store（id/sha256/mime/base64），`![](data:…)` 落库即离线 | 已有「图片落 IDB」的完整通路；缺的只是「抓图 → 转 base64 → 写 store」的前段 |
| 宿主端 | `index.js` 有 `webServer`+`connection`+`subprocess` inject；已有 `/nano-notepad/read`（读工作区文件）、`/nano-notepad/save`（另存为）路由 | **host 侧 fetch 没有 CORS 问题**，抓 mp 页面、抓 mmbiz 图都可以在宿主完成 |
| 深色主题 | `.np-read` 在 `--dsw-*` 暗色 token 上 | 微信文章默认黑字白底假设，**深色可读性是独立命题**（V-09） |

**关键判定（本 spike 的出发点）**：链路缺口集中在 ① 抓取与抽取、② 防盗链图片、③ 清洗白名单、④ 新文件类型的分流与双态。渲染容器与图片落库是现成通路。

## §2 目标对象解析：微信公众号文章的解剖

| 部位 | 特征 | 对导入的含义 |
|---|---|---|
| 正文容器 | `#js_content`，**深层 `<section style="…">` 嵌套** + 全内联 style（不用 class） | 排版还原 = **保留内联 style**；转 markdown 会丢版式，富文本直渲染是唯一出路 |
| 图片 | `<img data-src="https://mmbiz.qpic.cn/…">`，`src` 是占位；`mmbiz.qpic.cn` 校验 `Referer`，无 Referer 头一般放行 | a) `data-src→src` 重写 + `referrerpolicy="no-referrer"`；或 b) host 抓图落 IDB。两条都要实测（V-03/V-04） |
| 元数据 | 标题 `#activity-name`、公众号 `#js_name`、作者 `#js_author_name`、封面 `var msg_cdn_url`、发布时间 `var ct` | 可抽出来写进文件头注释/节点 meta，不混进正文 |
| 干扰面 | `<script>`、`<iframe>`、`onclick`、`visibility:hidden` 包装（原文防复制样式）、`<mpvoice>` 音频 | 清洗白名单必须剥脚本/事件/iframe，保留 `style` 属性 |
| 体积 | 一篇典型图文正文 HTML 50–300KB，图片 10–80 张 × 50KB–2MB | 决定「外链引用」还是「落 IDB」的代价结论（V-08） |

## §3 可验证命题（V-xx）

| ID | 命题 | 方法 | 判读门槛 | 终态 |
|---|---|---|---|---|
| **V-01** | host 可 `GET` 一篇 mp 文章拿到完整 HTML | 宿主 `index.js` 临时路由或直接 `fetch`（spike 脚本内，不落 src）测响应码/正文长度/`#js_content` 存在性 | 200 + `#js_content` 可抽出 + 正文非空 | **ego PASS**（带条件） |
| **V-02** | `#js_content` 抽取 + script/iframe/event 剥离后，`section` 版式在 `.np-read` 内不炸 | 构造 sanitized HTML 灌 `import()`，`evaluate` 量 `.np-read` 内节点数/是否有 script 残留/容器 scrollHeight | 无 script/onclick/iframe 残留；高度 >0；无水平溢出失控 | **ego PASS** |
| **V-03** | `data-src` 图片重写后可显示 | 同一样例，`img[src=data-src]` 改完截图 + 量 `naturalWidth` | 至少一张图 `naturalWidth>0` | **ego PASS**（10/10 图，`naturalWidth` 140–1080） |
| **V-04** | `referrerpolicy="no-referrer"` 是否足以绕过 mmbiz 防盗链 | 一张 mmbiz 图带/不带该属性对照渲染 | `no-referrer` 图加载成功（200/naturalWidth>0）；若 RED 则结论=必须 host 代理抓图 | **ego PASS**（且 **不需要** `no-referrer`——页面响应头 `referrer-policy: no-referrer` 已让 Referer 天然隐身） |
| **V-05** | 内联 style 清洗白名单能否保住版式 | 白名单（`color/font-size/font-weight/text-align/line-height/margin/padding/background/border/letter-spacing/…`）过滤前后对照截图，`position/display/visibility` 等危险属性强制重置 | 过滤后主体版式肉眼可辨（标题/引用/加粗/居中保留），且无 `position:fixed` 遮罩 | **ego PASS**（135 元素保留 style，`fixed=0`、无水平溢出） |
| **V-06** | `.html`（或 `.wx`）新类型分流：源码态显示原始 HTML、预览态渲染 sanitized HTML | 灌一个 `.html` 样例，`isJson()` 旁路验证双态切换按钮与 `.np-read` 内容 | 预览显示富文本、源码显示 raw HTML、tab 图标/视图切换不报错 | **ego PASS（缺口实证）**：`.html` 被改成 `.html.md` 当 markdown，预览=转义文本。**确认必须新增 `isHtml()` 分流** |
| **V-07** | 元数据（标题/公众号/作者/封面/时间）可抽且能落节点 | 样例 HTML 上跑抽取函数，对 `#activity-name`/`#js_name`/`var ct` 逐一取 | 至少标题+公众号抽出非空 | **offline PASS**（title/account/ct/author/cover 均 regex 可抽） |
| **V-08** | 图落 IDB 的体积代价 | 样例文章统计 `img` 数与 mmbiz 图总字节（host HEAD 或少量 GET）；对 IDB `navigator.storage.estimate()` 前后对比 | 给出「篇均入库字节数」与配额余量；结论=外链 vs 落库的推荐 | **ego PASS**：10 张图、mmbiz 直链可达 → **推荐外链（不引 IDB 膨胀）**，落库作离线可选开关 |
| **V-09** | 深色主题下微信富文本可读性 | 样例渲染截图对照 `data-theme=dark/light`；检查正文默认 `color` 是否硬编码 `#000`/继承 | 深色下正文可读（结论=需主题适配层还是直接放行） | **ego PASS（需适配层）**：容器继承 `--dsw-*` 亮色正文 OK，但正文里硬编码 `background:#fff`/`color:#000` 的 section 在深底下会反白/不可读 → **产品需一个「微信正文主题适配」白名单：剥 `background:#fff`、把 `color:#000`/`#333` 映射到 `--dsw-alias-label-primary`** |
| **V-10** | CSP 面：宿主页面是否允许外链 `img`/`data:`/`blob:` src、`style` 属性 | `evaluate` 读 `document.querySelector('meta[http-equiv]')` + 实测外链图/data 图/内联 style 是否被拦 | 三类资源加载状态实测记录；被拦的列 RED | **ego PASS**（无 CSP 头；外链 img、`data:` img、内联 style、TT `innerHTML`/`createPolicy` 全通） |

## §4 方法约定

- **样例**：自备 1–2 篇公开 mp 文章 URL（业主提供或宪章登记处），正文快照落 `samples/`（不入库），保证可复跑。
- **观测**：一律 `page.evaluate` 取 DOM 实测值 + `page.screenshot` 留证；不凭肉眼下结论。
- **隔离**：实验不进 `src/`；host 侧若需临时路由，用 spike 自己的脚本起旁路 fetch 验证，验证完即弃。
- **还原**：每个 V 跑完删掉灌入的测试文件，`dsh-dev` 会话回到干净态。

## §5 预期验证价值 → 产品功能映射

| 结论 | 直接决定的产品决策 |
|---|---|
| V-01 + V-02 | 「粘贴 mp 链接 → 自动导入」功能是否可行；入口放 `+` 菜单还是 `import(url)` 扩展 |
| V-03 + V-04 + V-08 | 图片策略定案：**`no-referrer` 外链**（实现最省，风险=原图被删即裂）还是 **host 抓图落 IDB**（离线可保真，代价=篇均字节数 + 抓取耗时） |
| V-05 | 清洗白名单的最终清单——这是产品代码里 sanitize 函数的合同草案 |
| V-06 | 新文件类型的分流规则与双态 UI 合同（`.html` 后缀 + 图标 + `isHtml()` 旁路） |
| V-07 | 文件头元数据块的格式（注释头 vs 节点 meta 字段）与 tab 显示名来源 |
| V-09 | 是否需要「微信正文主题适配层」（反白/透明背景处理）及其范围 |
| V-10 | 若 CSP 拦外链图 → 强制走 IDB 落库路线；若拦 `style` 属性 → 富文本方案整体改道 |

**转正路径**：本 spike 收口后，结论登记到 `docs/specs/dsh-nano-notepad/`（新文件类型与导入链路一节），产品实现另开工单。宪章与样例可在登记后整目录删除。

---

## §6 取证过程与结论（2026-11-10 · 全部收口）

### 6.1 关键事实清单

1. **抓取可行但需伪装 UA**：`Mozilla/5.0 (iPhone…) MicroMessenger/8.0.40` → 200 + 3.57MB `js_content`；微信内置 UA / 无 UA → 200 但返回 17KB 反爬验证页（`js_content` 缺席）。**结论：抓取用伪装 UA，且要把「拿到非文章页」当一种失败态处理。**
2. **`#js_content` 抽取轻量**：sample-a 正文 24KB、60 `<section>`、0 script/iframe/onclick——公众号正文天然比想象干净。
3. **图片全部 `data-src`**：10/10 `img` 只有 `data-src`，无 `src`；全部 `mmbiz.qpic.cn`。
4. **mmbiz 防盗链被页面响应头天然破解**：`dsh-dev.local` 响应带 `referrer-policy: no-referrer`，图片直接 `<img src>` 就能加载（plain 与 `no-referrer` 均 `naturalWidth=140`）。**`no-referrer` 属性只是保险，不是必需。**
5. **外链图路线成立**：真实页面上 wikimedia 挂是因为该 URL 本身无效；mmbiz 畅通 → **图不必落 IDB**，省掉篇均 ~数 MB 的存储膨胀。IDB 落库降级为「离线可读」可选增强。
6. **TrustedTypes 是假警报**：`dsh-dev.local` 页面没有 `require-trusted-types` CSP；`innerHTML` 与 `createPolicy` 在真页面上都正常。之前测出的拦截是在 `chrome://new-tab-page` 上的假象。
7. **`.html` 必须新增分流**：`import('x.html', …)` 今天被改名 `x.html.md` 当 markdown 渲染，预览是转义源码。**必须新增 `isHtml()` + `.html` 后缀保留 + 渲染态走 sanitize。**
8. **深色主题需适配层**：容器继承 `--dsw-alias-label-primary`(浅) OK；但正文里硬编码 `background:#fff` / `color:#000` 的 `<section>` 在深底上会反白/不可读。产品 sanitize 时须把这两类值映射到 dsw token。

### 6.2 实测数值（ego @ dsh-dev.local）

| 项 | 值 |
|---|---|
| sample-a 抓取 | 200 · 3,524,457B · `js_content` 存在 |
| sample-b 抓取 | 200 · 17,614B · **反爬验证页**，无 `js_content`（无 UA / MicroMessenger UA 均拦） |
| sample-b 用伪装 iPhone UA 重试 | 200 · 3,567,961B · `js_content=true` |
| 抽取正文 | 24,188B · 60 `<section>` · 10 `img`（100% `data-src`）· 0 script/iframe |
| 注入 `.np-read` | `innerHTML` 正常 · `scrollHeight` 增长 · `hasScript=false` |
| 图片加载 | 10/10 `naturalWidth` 140–1080，plain 与 `no-referrer` 均通 |
| 白名单过滤 | 135 元素保留 style · `position:fixed=0` · 无水平溢出元素 |
| `.html` import | 文件名被改成 `weather-article.html.md` · 预览=转义 markdown 源码（缺口实证） |

### 6.3 产品功能定案（由结论反推）

- **导入链路**：`import(url)` → host fetch（伪装 iPhone UA）→ 抽 `#js_content` → `data-src→src` + 白名单 sanitize → 存 `.html` 文件 + 元数据头注释（title/account/date/cover）
- **渲染链路**：`isHtml()` 新增；预览态 `innerHTML` 注入 sanitize 后的富文本；源码态显示 raw HTML
- **图片**：默认外链 + `referrerpolicy="no-referrer"` 保险；「存离线」做成设置项（host 抓图→base64→IDB `images` store）
- **清洗白名单**（产品 sanitize 的合同草案）：放行 `color font-size font-weight font-style font-family text-align line-height margin padding background background-color border border-radius letter-spacing text-indent text-decoration width max-width height display vertical-align box-sizing overflow white-space word-wrap opacity float clear`；强制重置 `position`、`visibility`、`top/left/right/bottom`、`z-index`；剥 `script/iframe/on*/mpvoice`
- **主题适配**：sanitize 时 `background:#fff|white` 与 `color:#000|#111|#222|#333` 在 `data-theme=dark` 下映射到 `--dsw-alias-bg-layer-2` / `--dsw-alias-label-primary`

### 6.4 终态

| 命题 | 终态 |
|---|---|
| V-01 | ego PASS（伪装 UA） |
| V-02 | ego PASS |
| V-03 | ego PASS |
| V-04 | ego PASS（无需 no-referrer，页面响应头已隐身） |
| V-05 | ego PASS |
| V-06 | ego PASS（缺口实证：需新增 `.html`/`isHtml()`） |
| V-07 | offline PASS |
| V-08 | ego PASS（推荐外链，IDB 为可选） |
| V-09 | ego PASS（需深色适配层） |
| V-10 | ego PASS（无 CSP 拦路；外链 img/data/style/TT 全通） |

**结论**：微信链路 10 个命题全部可行。最大风险点是抓取的「反爬验证页」（需 UA 伪装 + 失败态识别）与深色主题下的版式适配层；其余环节在真实宿主上已验证。
