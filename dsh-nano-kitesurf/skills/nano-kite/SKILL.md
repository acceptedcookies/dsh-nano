---
name: nano-kite
description: Guide the user to run Kitesurf engine lifecycle actions in the workbench sandbox controls. Use when the user types /nano-kite.
version: 0.1.0
date: 2026-11-21
user-invocable: true
---

# nano-kite

Session skill: the Kitesurf engine lifecycle is a **user action in the workbench** — agents have no lifecycle write tool. When the user types /nano-kite, do not drive the engine yourself; read the object's state and guide the user. Do not launch Chrome.

## How to handle /nano-kite

1. **对象**：用户没指明对象就用宿主的列表工具列出可见对象并询问——即使只有一个候选也要问。
2. **读状态**：对用户确认的 `sandboxId` 调状态工具，读 `phase`（以及 relay 地址 `cdp`）。phase 不是可用态或引擎不应答，就是生命周期动作的时机。
3. **指引用户在工作台操作**：告诉用户在 [dsh工作台] 沙箱控件对所选对象执行相应生命周期动作（起/停/重启）。agent 没有生命周期写工具——不要借人的 cookie 调宿主路由、不要自己凑参数代做。停/重启会把页面打回 about:blank——提醒用户正在看的内容会丢。
4. **动作之后**：再用状态工具确认 phase 与 `cdp` 就绪，然后才按 `/kitesurf-cdp` 开页与 attach。

MCP bridge framing (if you ever open the bridge socket yourself): each text frame carries one complete JSON-RPC message — no trailing `\n` is needed (the bridge tolerates `\n` for batch frames). Full route/error detail: see `/kitesurf-cdp` references and `GET /nano-local-sandbox/diagnostics`.
