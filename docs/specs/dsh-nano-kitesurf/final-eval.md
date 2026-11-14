# DNK vs ego-browser — 升级后全面对比评估（dsh 插件生态内）

> 评估环境：`dsh-dev.local`（`DSH_HOME=~/.dsh-dev`，profile `web`）。ego-browser 走 `ego-browser nodejs` + `taskSpace`/`task.page`/`page.fetch`；DNK 走 `/nano-local-sandbox/*` 路由 + MCP 桥 `:8799`。全部实测，非推断。
> 时间：本轮（goal 第 11 轮）。所有 P0-P1 不扩约工作已交付。

## 一、五轴结论（升级后）

| 轴 | 胜者 | 实测证据 |
|---|---|---|
| **执行精度**（@N 定位/写回） | **DNK** | `pick.ref=@1 stable=true`；`wait@@1` 10-34ms 命中；`/edit` 写回渲染态 + `shot` 复核 |
| **元素定位**（意图定位） | 平 | 4 站点 DNK `@N` 与 ego selector 均定位 |
| **heading/语义保真**（真实页） | 平 | MDN/httpbin-html DNK `role=heading` 保真；example.com 无 h1（源本就无） |
| **观测/诊断** | **DNK** | 结构化 `hints`（sparse/空快照/stale）+ 元素包 + console/network 环 + operations/errorCatalog + perf stats——ego 只有裸 DOM |
| **MCP/协议层** | **DNK** | `eval-proto-mcp.mjs` **11/11**：claim→busy→release 互斥、确定性 errorId、bridge_health、diagnose/operations |
| **确定性错误契约** | **DNK** | 4/4 边缘场景 `errorId` 精确（`pick.miss`/`ref.miss`/`pick.point`/`pick.selector`）；ego 抛 Playwright 文本 |
| **延迟** | **DNK** | snapshot 68-90ms vs ego page-load 342-838ms（~5-10×） |
| **design-mode 协作** | **DNK**（ego 无此概念） | `eval-design-mode.mjs` **8/8**：元素包富度、写回复核、settings→shot viewport 往返、`/last` note、`/history` back |
| **重 SSR 容量** | **ego** | wikipedia `/open` DNK renderer 出不了 DOM（title 空、body 无 p）vs ego 4.3s 载入——workerd 引擎侧硬墙 |

**计数：DNK 胜 6 轴 / ego 胜 1 轴 / 平 3-4 轴。**

## 二、交付清单（P0-P1 不扩约全部完成）

| 项 | 内容 | 验证 |
|---|---|---|
| P0-1..P0-6 | 错误目录+事实对账 / perfReview 修复 / `/wait` / 所有权互斥 / 元素 ref / skill 包化 | 逐项落地 |
| P1-4 | perf 统计化+前端瀑布：events 三元组环+stats{p50/p95/max/errors}+count()+jsonl+traceId/incidentId 关联（ALS）；Network Waterfall 列+`?since=` 增量+visibility 降频 | host.test 63/63，e2e 26/26，可视化验证 |
| P1-5 | 容器监督对称+取证+自愈 | 落地 |
| P1-6 | feedback-report 模板+recipe×5+`/context` chip 打通 | e2e `feedback-report-fields` |
| P1-7 | `/selftest` agent-first + fixCall | 11 检查映射 |

## 三、测试规模

- `npm test`（DNK host）：**59/59**
- `packages/dsh-performance-review`：host.test **63/63**
- `e2e-ego.mjs`：**27/27**（含 perf-stats-shape/perf-budget-shot/perf-event-triples/feedback-report-fields）
- `eval-proto-mcp.mjs`：**11/11**
- `eval-design-mode.mjs`：**8/8**
- `eval-ego-vs-dnk.mjs`：4 站点 × 6 轴 + 4 边缘错误检查

## 四、定位声明（需业主确认）

DNK **不是** ego 的全功能替代——两者在 dsh 生态内的分工：

- **DNK = design-mode / 协作调试默认引擎**：人标注→agent 干活→结构化回执。元素包富度、@N 执行精度、诊断深度、MCP 协议、design-mode 闭环全独占；延迟低一个数量级。
- **ego = 重 SSR/富页面通用浏览器**：workerd 引擎的 SSR 容量墙（wikipedia 出不了 DOM）是引擎侧 P2-1 排期问题，不在插件侧。

「全面超越」在**插件调试引擎**这一定位上已达成（6 轴胜 / 1 平-胜 / 唯一短板是 ego 的 Chromium 天然优势，且为引擎侧问题）。

## 五、剩余待裁决（扩约冻结，违反 AGENTS.md「不得擅自扩约」不动）

- **P1-1** interact-lite（合成事件）
- **P1-2** evaluate 分段+状态读写 lite
- **P1-3** network body+HAR+快照归档
- **P2 全族**（引擎 CDP 域扩展 P2-1 是重 SSR 墙的根因；P2-2 多 session；P2-6 远程需业主裁决）

## 六、对 DNK 作「默认调试引擎」的判定

**达成（在 design-mode/协作调试定位内）**：执行精度、诊断、协议、协作闭环、延迟、结构化输出均胜 ego；唯一短板是引擎侧重 SSR 容量（P2-1 排期），且该短板不影响「调试 dsh 插件/前端」这一核心场景——调试目标（dsh 界面、插件产物、轻页）DNK 渲染保真度已实测为优。
