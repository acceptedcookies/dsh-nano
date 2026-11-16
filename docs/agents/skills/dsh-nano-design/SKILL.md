---
name: dsh-nano-design
description: 为 [dsh-nano] 插件新增或修改浏览器 UI、评审 UI 改动、迁移手绘控件时使用。只给意见，不改代码，不阻塞发布。
---

# dsh-nano-design

面向在本仓改代码的开发 agent。不发布给会话 agent，不进任何插件的 `files`。

## 何时用

- 新增或修改某个插件 `src/client/**` 里的界面。
- 评审一个 UI 改动或迁移手绘控件。

## 输入

- 目标插件目录；可选的改动 diff。

## 步骤

1. 读 [`docs/specs/dsh-nano-ui/DESIGN.md`](../../../specs/dsh-nano-ui/DESIGN.md)。它是唯一规格。
2. 查 `packages/dsh-nano-ui/catalog/`：`primitives.json`（宿主导出）、`icons.json`（图标）、`tokens.json`（令牌，含亮暗两套值）。
3. 对每个改动按四问选型，前一问能回答就停：
   1. 宿主有没有？有就用宿主 primitive。
   2. nano-ui 有没有？有就用 nano-ui。
   3. 两个以上插件会用？先改 DESIGN.md，再在 nano-ui 里实现。
   4. 只此一处？插件内实现，只用宿主令牌，并加 `/* nano-ui-exempt: <缺口说明> */`，同时在 DESIGN.md §10 登记一行。
4. 可选：跑 `node scripts/check-ui-rules.mjs --plugin <插件目录名>`（加 `--json` 得机器可读输出）。它只给警告，退出码恒为 0。
5. 产出评审。

## 输出

直接回复，或写到 `docs/code-review/<月>/<插件>-ui-review.md`。分四栏：偏离 / 缺口候选 / 认知错误 / 建议。每条带 `file:line`，规则引用 DESIGN.md 章节号。

## 永远不做

- 嫁接宿主 DOM：`[class*=…]`、`:has()` 套宿主结构、扫描或合成宿主哈希类。
- 猜令牌名、写十六进制色值、unicode 当图标、硬编码层级数字。
- 插件之间通过 DOM 互相感知。

## 边界

不改代码，不阻塞发布，不替 [业主] 判定视觉。
