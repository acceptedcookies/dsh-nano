---
name: nano-kite
description: Initialize, start, suspend, or resume Kitesurf, and point MCP at a local or remote engine. Use when the user types /nano-kite.
user-invocable: true
---

# nano-kite

Session skill. `POST /nano-local-sandbox/kite` with `{ "action" }`. Live values are `GET /nano-local-sandbox/status` under `kite`. Drive pages with `/kitesurf-cdp` and `kite.cdp`. Do not launch Chrome.

- `init` does not start a container and does not write a lock file in this package.
- `start` does not run here. Ask the local sandbox host for `sandbox.instance.ensure`, then read `GET /nano-local-sandbox/status`.
- `suspend` — only from running. Closes the CDP socket and stops the local container. THIS DROPS THE PAGE TO about:blank — anything the user was viewing is gone. Warn before suspending.
- `resume` — only from suspended. Starts the same container again (or recreates it if missing); the page does not come back with it. A failure is `kitesurf.kite.resume`.
- `configure` — `{ "httpBase": "http://host:port", "mcpPort": 8799 }`. A remote engine is refused with `kitesurf.kite.remote` unless the profile sets `allowRemote: true`. Credentials in the URL are `kitesurf.url.credentials`. `mcpPort` only takes effect the next time a container is created — an existing container keeps its published ports (a changed mapping is detected on start and the container is recreated). The MCP bridge serves `GET /health` over plain HTTP too: `{ ok, mcp, conns, accepted, rejected, uptimeMs }` — use it to confirm the bridge is up before pointing agents at `ws://127.0.0.1:<mcpPort>/mcp`. When piping JSON-RPC over the WebSocket, frames must end with `\n` — a raw JSON frame without a trailing newline is silently dropped.

This package does not read a checkout path and does not start a container. If status is down, stop and report that. Do not export a checkout variable.

Wrong phase is `kitesurf.kite.state` (409). An old Node is `kitesurf.kite.node` (500) and does not write the lock. A bad port is `kitesurf.kite.mcpPort` (400). Bad JSON is `kitesurf.body.json` (400). Full table: see `/kitesurf-cdp` §5 or `/diagnostics` → `observability.errorCatalog`.
