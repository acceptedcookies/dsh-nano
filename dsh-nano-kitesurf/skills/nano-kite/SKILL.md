---
name: nano-kite
description: Initialize, start, suspend, or resume Kitesurf, and point MCP at a local or remote engine. Use when the user types /nano-kite.
user-invocable: true
---

# nano-kite

Session skill. `POST /nano-kitesurf/kite` with `{ "action" }`. Live values are `GET /nano-kitesurf/status` under `kite`. Drive pages with `/kitesurf-cdp` and `kite.cdp`. Do not launch Chrome.

- `init` checks Node ≥22 first (agent-browser needs it), then writes `$DSH_HOME/nano-kitesurf.lock.json` once; a later init returns `already: true` without rewriting. Init does not start a container. The lock is not inside the plugin directory, because a host restart replaces that directory.
- `start` — only from `idle`. Starts the local `kitesurf` container from inside DSH when the origin is loopback (publishes `127.0.0.1:<enginePort>:8787` and `127.0.0.1:<mcpPort>:8791`, mounts the checkout read-only), then waits for `/health`. A remote origin is only probed. Failure is `kitesurf.kite.start`.
- `suspend` — only from running. Closes the CDP socket and stops the local container. THIS DROPS THE PAGE TO about:blank — anything the user was viewing is gone. Warn before suspending.
- `resume` — only from suspended. Starts the same container again; the page does not come back with it. A failure is `kitesurf.kite.resume`.
- `configure` — `{ "httpBase": "http://host:port", "mcpPort": 8799 }`. A remote engine is refused with `kitesurf.kite.remote` unless the profile sets `allowRemote: true`. Credentials in the URL are `kitesurf.url.credentials`. `mcpPort` only takes effect the next time a container is created — an existing container keeps its published ports (a changed mapping is detected on start and the container is recreated). The MCP bridge serves `GET /health` over plain HTTP too: `{ ok, mcp, conns, accepted, rejected, uptimeMs }` — use it to confirm the bridge is up before pointing agents at `ws://127.0.0.1:<mcpPort>/mcp`.

Local container runs need a Kitesurf checkout: set `KITESURF_CHECKOUT` or profile `config.checkout` to a built source tree; missing/unreadable is `kitesurf.kite.checkout`. Starting a cold container can take ~100s.

Wrong phase is `kitesurf.kite.state`. An old Node is `kitesurf.kite.node` and does not write the lock. A bad port is `kitesurf.kite.mcpPort`. Bad JSON is `kitesurf.body.json`.
