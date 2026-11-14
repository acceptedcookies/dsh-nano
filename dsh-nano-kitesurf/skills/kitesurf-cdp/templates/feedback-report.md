# Kitesurf 反馈报告（模板）

<!-- 把一次排障/点选/交互的结构化结果填进来，交给业主或记录。 -->

## 元信息
- 时间：
- 插件 `buildId`（`/status`）：
- `storePath`（确认在跟哪份代码说话）：
- 引擎 `phase` / `engineAlive`：

## 做了什么
- 路由调用序列（route → status → errorId → 耗时）：从 `/operations` 摘

## 观察到的问题
- 现象：
- 期望 vs 实际：

## 诊断摘录
- `/diagnostics` 的 `hints`：
- `/console?level=error,exception` 尾部：
- `/operations?errorsOnly=true`：

## 元素上下文（若涉及点选）
- `GET /last` 元素包摘要（selector / ref / box / stack）：
- `GET /context?id=` 若引用了 composer ref：

## 结论 / 下一步
- errorId 对照 `references/error-catalog.md`：
- 建议动作（recover / settings / evaluate / 请人介入）：
