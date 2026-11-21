# Kitesurf 反馈报告（模板）

<!-- 把一次排障/点选/交互的结构化结果填进来，交给业主或记录。 -->

## 元信息
- 时间：
- 插件 `buildId`（`/status`）：
- 引擎 `lifecycle.phase` / `engineAlive`：

## 做了什么
- 路由调用序列（route → status → errorId → 耗时）：从 `/operations` 摘

## 观察到的问题
- 现象：
- 期望 vs 实际：

## 诊断摘录
- `/diagnostics` 的 `hints`：
- `/console?level=error,exception` 尾部：
- `/diagnostics` 的 `errorCatalog` 对照：

## 元素上下文（若涉及点选）
- `/pick` 应答元素包摘要（selector / ref / box / stack）：

## 结论 / 下一步
- errorId 对照 `GET /nano-local-sandbox/diagnostics?catalog=1`（DNLS 目录）：
- 建议动作（recover / lifecycle / settings / evaluate / 请人介入）：
