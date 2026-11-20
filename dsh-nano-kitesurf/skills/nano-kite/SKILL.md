---
name: nano-kite
description: Start, stop, or restart the Kitesurf engine through the sandbox host. Use when the user types /nano-kite.
version: 0.1.0
date: 2026-11-20
user-invocable: true
---

# nano-kite

Session skill: engine lifecycle through the sandbox host. `POST /nano-local-sandbox/lifecycle` with `{ "action" }`; live values are `GET /nano-local-sandbox/status` under `lifecycle`. Drive pages with `/kitesurf-cdp` and the top-level `cdp` from `/status`. Do not launch Chrome.

- `start` — create/start the env container and bring the engine up. Idempotent; a healthy instance is adopted, not recreated.
- `stop` — only while running (this is the old `suspend`). THIS DROPS THE PAGE TO about:blank — anything the user was viewing is gone. Warn before stopping.
- a `suspended` sandbox comes back with `start` (the old `resume`). The page does not come back with it; re-open after.
- `restart` — restart the instance. Same page-loss warning.

The endpoint is reported by the instance registry as `lifecycle.httpBase`/`lifecycle.mcpPort` and is read-only for the pane. The engine must already be running — this package never launches it. Bring-up/repair lives in dsh-nano-local-sandbox: every object request needs `?sandboxId=<uuid>` plus the `X-DNLS-Contract: dnls.control/1` header; an explicit restart is `POST /nano-local-sandbox/lifecycle` with `{action:'restart',requestId:'<fresh uuid>'}`, then poll `GET /nano-local-sandbox/operations?sandboxId=<id>&operationId=<returned>` until it leaves accepted/running — never retry an unsettled operation and never POST a bare `{}` repair.

A wrong phase or action is a 409 from the host: read `lifecycle.phase` and choose an action that fits. MCP bridge: `ws://<host>:<lifecycle.mcpPort>/mcp`; each text frame carries one complete JSON-RPC message — no trailing `\n` is needed (the bridge tolerates `\n` for batch frames). Full route/error detail: see `/kitesurf-cdp` references and `GET /nano-local-sandbox/diagnostics`.
