# Kitesurf 心跳、DevTools 与标签悬停改造

工作树：`kitesurf-devtools-heartbeat`（基线 `main@5458db5`）。本次仅部署 dsh-dev 验证，未合并、未动 prod/desktop。

## 1. 心跳迁移到导航区

- 删除页面中心的 `.nks-load` 覆盖层；`beat` 状态现在只投影到地址栏。
- 地址栏 `[data-nks-loading="1"]` 显示动态底色（`nks-address-sheen`）、11px spinner 与 `Ns` 计时；`nks-go` 在加载时隐藏，避免重叠。
- 标签栏按钮 `[data-nks-beat="true"]` 同步播放同一底色动画，形成“标签底色动态”。
- `prefers-reduced-motion` 关闭动画但保留静态加载态。
- 验证：真实地址栏输入 `rfc2616.html` 后，DOM 出现 `data-nks-loading="1"`、计时 `1s/2s`，中心 `.nks-load` 不存在。见 `lab/out/kitesurf-devtools-heartbeat/heartbeat.png`。

## 2. DevTools Network

### 数据采集（DNLS driver）

`cdp-elements.js` 的 `recordNetworkEvent` 统一处理：

- `Network.requestWillBeSent`：`type`、`wallTime`（epoch ms `startedAt`）、`timestamp`（monotonic seconds，用于耗时）。
- `Network.responseReceived`：status、mimeType、fromDiskCache/fromServiceWorker。
- `Network.loadingFinished`：`encodedDataLength` → size，`timestamp` 差 → `durationMs`。
- `Network.loadingFailed`：errorText、failed、duration。
- 重定向保持一行，记录 `redirectCount` 并更新最终 URL。
- `/network` 支持 `limit`、`failedOnly`、`since`；`POST {clear:true}` 真正清空 ring（旧实现忽略 POST）。
- `/har` 的 `time/size/mimeType/type` 同步修正。

### 面板 UI

- 列：Method / Status / Type / URL / Size / Time / Waterfall；宽 `571px` 面板下已校正列宽，Waterfall 不再被截断。
- Type 使用 CDP resource type 的短标签（doc/js/css/img/font/xhr/fetch/…），并带颜色与完整 MIME tooltip。
- 瀑布流由真实 `startedAt`/`durationMs` 计算；pending 行显示起始处的暗色 sliver。
- 搜索支持普通关键词与 `type:script`、`status:404`、`status:4xx`、`method:GET` 组合。
- “仅失败”现在在客户端本地过滤，不再重新请求/清空 rows；切换时 iframe identity 不变。
- “禁用缓存”经源码核对：官方 pin 的 `Network.setCacheDisabled` 是空实现（no-op），因此 UI 显示为 disabled + `不支持`，并用宿主 `Tooltip` 解释，不伪造功能。

见 `lab/out/kitesurf-devtools-heartbeat/network.png`。

## 3. 标签页第一个 tab 悬停

根因：`.nks-nav-tab[data-current="true"]` 规则排在 `.nks-nav-tab:hover` 之后且同 specificity，当前 tab 的底色覆盖了 hover 底色。新增 `.nks-nav-tab[data-current="true"]:hover` 覆盖规则；实测第一个/当前 tab 和第二个 tab 的 hover 底色均为 `rgba(255,255,255,.08)`（基准分别为 `rgb(44,44,46)` 和透明）。

## 4. 验证

- DNLS：`node --test test/*.mjs` **208/208**（新增 network lifecycle + route tests）。
- DNK：`node --test test/*.mjs` **71/71**。
- `scripts/gui-smoke-kitesurf.sh`：**9/9 PASS**（新增地址栏心跳、Network 列/筛选、首个 tab hover 三项）。
- ego 实测：
  - 心跳：`data-nks-loading="1"`、`[data-nks-beat-sec]` 出现 `1s/2s`；无 `.nks-load`。
  - Network：真实页面请求显示 `doc/js/css/img/font`、size（kb）、time（ms/s）、waterfall；`type:script status:200` 搜索只命中脚本。
  - 失败开关：iframe identity 保持不变，空结果为“没有匹配的请求”。
  - cache tooltip：`引擎暂不支持禁用缓存：当前 Kitesurf 的 Network.setCacheDisabled 是空实现（no-op）…`。
  - tab hover：第一个（current）和第二个 tab 均得到 hover 背景。

## 5. 已知边界

- 引擎不提供响应体/完整 headers；Size 是 `encodedDataLength` 传输体大小，非 headers 总计。
- 瀑布流时间来自引擎 CDP 事件的 monotonic timestamp；同一批并发请求可共享起始时间片。
- `Network.setCacheDisabled` 在当前 pin 无效果，驱动侧没有用请求头伪造替代。
- 未改 pin 源码；所有新增逻辑在 DNK client 与 DNLS driver。
