---
name: nano-kite
description: Initialize, start, suspend, or resume Kitesurf, and point MCP at a local or remote engine. Use when the user types /nano-kite.
version: 0.1.0
date: 2026-11-17
user-invocable: true
---

# nano-kite

Session skill. `POST /nano-local-sandbox/kite` with `{ "action" }`. Live values are `GET /nano-local-sandbox/status` under `kite`. Drive pages with `/kitesurf-cdp` and `kite.cdp`. Do not launch Chrome.

- `init` checks Node ≥22 first (agent-browser needs it), then writes `$DSH_HOME/nano-kitesurf.lock.json` once; a later init returns `already: true` without rewriting. Init does not start a container. The lock is not inside the plugin directory, because a host restart replaces that directory.
- `start` — only from `idle`. Checks that the engine at the configured origin (`httpBase`) answers CDP; this package does not start a container — the engine must be brought up by the sandbox host (dsh-nano-local-sandbox, which owns the container lane). A remote origin is only probed, never managed. Failure is `kitesurf.kite.start` (engine never answered within the retry budget).
- `suspend` — only from running. Closes the CDP socket. THIS DROPS THE PAGE TO about:blank — anything the user was viewing is gone. Warn before suspending.
- `resume` — only from suspended. Re-probes the engine; the page does not come back with it. A failure is `kitesurf.kite.resume`.
- `configure` — `{ "httpBase": "http://host:port", "mcpPort": 8799 }`. A remote engine is refused with `kitesurf.kite.remote` unless the profile sets `allowRemote: true`. Credentials in the URL are `kitesurf.url.credentials`. `mcpPort` points the next probe at the MCP bridge port. The MCP bridge (served by the sandbox host) exposes `GET /health` over plain HTTP too: `{ ok, mcp, conns, accepted, rejected, uptimeMs }` — use it to confirm the bridge is up before pointing agents at `ws://127.0.0.1:<mcpPort>/mcp`. When piping JSON-RPC over the WebSocket, each text frame carries one complete message — no trailing `\n` is needed (the bridge tolerates `\n` for batch frames).

The engine must already be running — this package never launches it. Bring-up/repair lives in dsh-nano-local-sandbox (`POST /nano-local-sandbox/recover`).

Wrong phase is `kitesurf.kite.state` (409). An old Node is `kitesurf.kite.node` (500) and does not write the lock. A bad port is `kitesurf.kite.mcpPort` (400). Bad JSON is `kitesurf.body.json` (400). Full table: see `/kitesurf-cdp` references/error-catalog.md or `/diagnostics` → `observability.errorCatalog`.
