# Kitesurf 候选 pin 评估：39feadf

评估时间：2026-11-17（Asia/Shanghai）。范围：源码、提交记录、启动配方、测试期待与现行消费者的静态兼容分析。未构建候选、未运行候选、未 repin、未切换任何实例。

## 版本与变更规模

- 候选：`39feadfb9a3e6c14b40cf170a559ce417d0fce5d`（UTC 2026-11-16 22:08:16，北京时间 11-17 06:08:16）。本次 `git ls-remote origin refs/heads/main` 与本地候选一致。
- 当前登记 pin：`5770ee1e6b1f631f20f89ea2bf384c8f753fd3b4`，它是上游 `fb4dd59971458ff10047d8e8581d078b485345e8` 加一个本地历史 KV 提交，不是纯上游 ref。
- 当前执行 checkout 与登记 pin 同 HEAD，另有 11 行未提交的按 URL 删除历史补丁。运行来源仍是旧 context checkout，尚未迁移到 manifest 要求的 pinned 路径。
- 上游共同基线 → 候选：24 个提交，65 个文件，+2,932/-235 行。其中 20 个运行时代码文件、23 个测试/期待文件、6 个 triage 工具文件、16 个构建/文档/vendor patch 文件。
- 登记 archive → 候选：67 个文件（新增20、修改47），+2,932/-257 行。额外的两个文件差异，是候选不包含本地历史路由的21行和KV binding的1行。
- 根包与 engine 的语义版本没有升级（engine 仍0.0.1）；升级身份必须按 Git SHA，而非产品版本字符串判断。

提交范围来源：https://github.com/cloudflare/kitesurf/compare/fb4dd59971458ff10047d8e8581d078b485345e8...39feadfb9a3e6c14b40cf170a559ce417d0fce5d

## 对我们最有价值的升级

### 1. 长期导航的内存回收（高相关）

退休 PageScript/renderer/dedicated-worker 的 stub/RPC promise 可能由父 worker 长时间持有。新实现于退休后、至多每秒一次调用 GC（有 gc 才执行）。源码：`packages/engine/src/eval/retired-worker-gc.ts`；调用点在 page-script-rpc-session、page-renderer、dedicated-worker。

上游 README 记录的实验：5 条并发连接加载940页，未启用 flag 时约300页后 V8 OOM；启用后全程完成、内存低于4GB。这是上游实验，不是本机复测结果，不能承诺相同峰值。

必要条件：容器直启 wrangler 时须设置 `MINIFLARE_WORKERD_V8_FLAGS=--expose-gc`。只换源码不改启动配方拿不到该收益。页面和专用 worker 中 gc 被隐藏，候选带隔离测试。

### 2. 页面启动瘦身（高相关）

传递父 worker 已编译的 WebAssembly.Module，替代每个页面/renderer重新接收并编译Wasm字节；删除启动诊断模块中HTML全文，改为 hasHtml/htmlLength，避免额外保留页面拷贝。候选注释中的core27MB是未压缩模块量级，不等于本地实际常驻节约值。

### 3. 图片解码升级不再卡住后续帧（高相关）

小尺寸mip缓存不足以满足更大绘图hint时重新请求高分辨率图；升级失败保留小图并停止miss循环；小图被逐出后允许重新请求。直接改善响应式图片、布局微变或缩放后的截图/连续帧稳定性。

### 4. 现代组件/复杂JS兼容（中高相关）

- Boa↔V8跨界Promise返回原生对象，保留身份及模块加载器写在Promise上的元数据，弱身份表避免槽位反复增长。
- 修复getter、super、包装函数的真实this receiver。
- V8观察Boa类时保留直接父类，避免跳过中间类静态元数据，Lit类组件受益。
- `in`操作使用HasProperty，不把undefined属性当不存在，不为存在性检查调用getter。

### 5. Shadow DOM、布局与SVG（中高相关）

- ShadowRoot.adoptedStyleSheets真正参与级联，支持更新/排序、替换children后保留镜像。
- 按flat tree识别inline shadow host、slot、display:contents中的块元素；百分比高度获得正确包含块基准。
- 实现alpha与纯白luminance SVG mask合成，修复图表线条变成整块矩形等错误。

保留限制：非白luminance、嵌套mask仍不完整；样式表通过真实style子节点镜像，仍影响childNodes/innerHTML/:last-child，部分CSSOM测试继续失败。

### 6. 病态输入与构建安全加固（有价值）

包括getElementsByName的CSS字符串转义、doctype前连续空注释导致指数回溯、legacy编码URL修剪的二次退化、blob URL安全随机数，以及构建命令不用shell拼接。这些是候选真实修复，但不是本轮archy无法打开的根因。

## 不变项与升级风险

- `packages/engine/src/cdp` 整目录无差异，Page.navigate/page ownership/connection协议没有发现本轮新增破坏性变更；仍每个CDP WebSocket独立会话。
- pnpm-lock、根package、rust-toolchain均与当前archive一致，没有顺手升级Wrangler/workerd版本。官方锁Wrangler4.131.2、Miniflare5.20260911.1-alpha/workerd1.20260911.1；本地DNLS配方使用Wrangler4.161.0。这是既存组合差异，候选Wasm Module直传与GC flag必须在实际容器组合验证。
- 不可只热替换engine/src：core Rust、dom-shim、page-script、page-renderer和vendor patches均变更，必须完整重建对应Wasm与bundle。候选目录当前没有node_modules/Wasm/bundle，不能把源码目录当已构建产物挂进去运行。
- 候选没有本地/history与KITESURF_HISTORY绑定。现行DNLS已用自身session.history和CDP history.go，未发现旧engineHistory*的有效调用；不能断言升级必然破坏当前历史，但应核对实际运行消费者。不要未经核对盲目携带旧补丁，也不要把旧KV数据宣告已迁移。
- 本轮超时误杀连接的修复必须保留。新pin不会自动修复我们的接入层4秒截止/错误重连策略。

## 上游测试证据的正确读法

- WPT清单11,795→11,849，新增54项，未删旧项。
- 新54项最终预期35 PASS（28隐式+7显式）、19 FAIL。不是“新增54个通过”。7项在本系列中从初始登记失败变成通过：百分比块高度、shadow host style sharing、5个SVG mask场景。
- Playwright移除1项失败pin：screenshot mask移除后的恢复。邻近其他mask测试并非全修复。
- 有对应新增JS桥/样式表/布局/SVG像素断言/GC隔离测试；本次只审源码及上游记录，没有本机执行候选测试。

## 建议

**值得升级，优先做一次小范围dev候选验证，然后再决定晋升；不建议直接替换三实例。**主要动机是多实例长时间运行的资源回收、图片帧稳定性、现代组件兼容，不是恢复已在旧引擎上验证通过的archy访问。

下一次最小验证：

1. 完整构建候选，明确源码SHA、Wasm/bundle来源；仅dev测试且保留旧构建可回退。
2. 同步GC启动flag，确认引擎可调用gc而页面/worker不可见。
3. 用现有五级页面样本跑同一接入层，比较最终URL、文档内容、截图、CDP代数和耗时，不只看HTTP200。
4. 多连接反复导航、记录RSS趋势与退休worker，确认本地确有改善；数十次导航是初筛，不宣称等同上游940页实验。
5. 专项验证图片resize、Lit/ShadowRoot样式、SVG mask与截图；检查历史/前进后退/断线重连。

这是兼容性实验，不是新增发布门禁或强制版本对账。本评估不改依赖manifest、不改pin、不部署候选。
