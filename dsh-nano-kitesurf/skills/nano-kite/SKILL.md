---
name: nano-kite
description: Initialize, start, suspend, or resume Kitesurf, and point MCP at a local or remote engine. Use when the user types /nano-kite.
version: 0.1.0
date: 2026-11-14
user-invocable: true
---

# nano-kite

Session skill. `POST /nano-local-sandbox/kite` with `{ "action" }`. Live values are `GET /nano-local-sandbox/status` under `kite`. Drive pages with `/kitesurf-cdp` and `kite.cdp`. Do not launch Chrome.

- `init` checks Node ≥22 first (agent-browser needs it), then writes `$DSH_HOME/nano-kitesurf.lock.json` once; a later init returns `already: true` without rewriting. Init does not start a container. The lock is not inside the plugin directory, because a host restart replaces that directory.
- `start` — only from `idle`. Starts the local `kitesurf` container from inside DSH when the origin is loopback (publishes `127.0.0.1:<enginePort>:8787` and `127.0.0.1:<mcpPort>:8791`, mounts the checkout read-only), then waits for `/health`. Cold create first runs `container system start` to prime the debug-build apiserver (its inline bootstrap reports `failed to bootstrap`); a warm container is simply `container start`ed. A remote origin is only probed. Failure is `kitesurf.kite.start` / `kitesurf.kite.container` with the stdout tail in `error`.
- `suspend` — only from running. Closes the CDP socket and stops the local container. THIS DROPS THE PAGE TO about:blank — anything the user was viewing is gone. Warn before suspending.
- `resume` — only from suspended. Starts the same container again (or recreates it if missing); the page does not come back with it. A failure is `kitesurf.kite.resume`.
- `configure` — `{ "httpBase": "http://host:port", "mcpPort": 8799 }`. A remote engine is refused with `kitesurf.kite.remote` unless the profile sets `allowRemote: true`. Credentials in the URL are `kitesurf.url.credentials`. `mcpPort` only takes effect the next time a container is created — an existing container keeps its published ports (a changed mapping is detected on start and the container is recreated). The MCP bridge serves `GET /health` over plain HTTP too: `{ ok, mcp, conns, accepted, rejected, uptimeMs }` — use it to confirm the bridge is up before pointing agents at `ws://127.0.0.1:<mcpPort>/mcp`. When piping JSON-RPC over the WebSocket, each text frame carries one complete message — no trailing `\n` is needed (the bridge tolerates `\n` for batch frames).

Local container runs need a Kitesurf checkout: set `KITESURF_CHECKOUT` or profile `config.checkout` to a built source tree; missing/unreadable is `kitesurf.kite.checkout` (400, configuration — not an engine fault). Starting a cold container can take ~100s. If you hit it: `GET /diagnostics` → `hints` → add `- id: nano-kitesurf / config.checkout` to the profile's `cordis.patch.yml`, or export `KITESURF_CHECKOUT`, then restart the dsh host.

Wrong phase is `kitesurf.kite.state` (409). An old Node is `kitesurf.kite.node` (500) and does not write the lock. A bad port is `kitesurf.kite.mcpPort` (400). Bad JSON is `kitesurf.body.json` (400). Full table: see `/kitesurf-cdp` references/error-catalog.md or `/diagnostics` → `observability.errorCatalog`.
