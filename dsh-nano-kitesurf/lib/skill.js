/**
 * Session skills. The agent drives Kitesurf through agent-browser's CDP mode.
 * Loading this skill must not launch Chrome.
 *
 * Neither body bakes an origin: both teach the agent to read the live
 * `kite.cdp` from `GET /nano-kitesurf/status`, so a later `configure` can
 * never leave the skill pointing at a dead engine.
 */

const KITESURF_CDP = `# Kitesurf CDP

The page under discussion is rendered by Kitesurf, not by Chrome.

## Get the socket — never guess it

The live endpoints are always in \`GET /nano-kitesurf/status\`:

- \`kite.cdp\` — the browser CDP socket for agent-browser's \`--cdp\` flag (also echoed top-level as \`cdp\`).
- \`kite.mcpPort\` — the host port of the MCP bridge inside the engine container: \`ws://<engine-host>:<mcpPort>/mcp\`. It is a WebSocket→\`agent-browser mcp\` bridge, not an HTTP API. It moves only when a new container is created, not on \`configure\` alone.
- \`kite.phase\` — \`idle\` / \`running\` / \`suspended\`. Attach only when \`running\`.
- \`engineMismatch: true\` means the origin answered \`/health\` but not as Kitesurf — do not attach, report it.

## Drive it

Use agent-browser, and always attach. A command without the CDP target launches Chrome, which is the wrong engine.

\`\`\`bash
agent-browser --cdp "$(curl -s .../nano-kitesurf/status | jq -r .kite.cdp)" snapshot -i
\`\`\`

Before the first agent-browser command in a session, run \`agent-browser skills get core\` and follow it. That skill is the command reference (\`open\`, \`get url\`, \`wait\`, \`click\`, \`fill\`, \`find\`, \`scroll\`, \`screenshot\`). This skill only fixes the engine.

If \`agent-browser\` is not on PATH, run it with \`npx agent-browser\` and the same \`--cdp\` flag. Do not pass \`--engine\`, and do not run \`agent-browser install\`.

## This is a shared single-page engine — read before you touch

- Kitesurf keeps exactly one page. Every attach can see — and steal — the page the human is looking at. Before driving, run \`get url\` / \`snapshot\` and confirm you are on the page you expect.
- NEVER run \`agent-browser close\` (or let the agent-browser daemon idle out holding the socket): closing the browser socket drops the page to \`about:blank\` and wipes what the user was viewing. When you finish, just stop; leave the socket alone.
- Do not use \`--pin-tab\`, sessions, or multi-target flags: there is one page and nothing to pin.
- \`suspend\`/\`resume\` and any engine restart also drop the page to \`about:blank\`. After \`nano-kite resume\`, re-check \`get url\` before assuming the old page survived.
- Coordinates in picks, boxes, and screenshots assume deviceScaleFactor 1. If a viewport emulation changed it, re-derive coordinates from the box in the note, not from memory.

## What a human pick contains

Into composer appends a short \`[kitesurf]\` note to the existing draft. It does not replace text the person already typed, and it does not attach the screenshot. The note has the page URL, one selector, at most 80 characters of the element's own text, a rounded box, and only the computed styles that carry a difference. The whole note is at most 640 characters. \`hit: page root\` means the click landed on \`html\` or \`body\`, and the note does not quote the document. \`limit: iframe script is not inspected\` means the child document was not read. A drag says \`mark: area\` and a box; an Alt-drag says \`mark: ellipse\`; a Shift-drag says \`mark: arrow\` plus \`line: x1,y1 x2,y2\`. A Shift+click while a note is open appends a second element — the note then reads \`els: N\` with numbered \`el1/el2/…\`, \`box1/box2/…\` lines, up to a 1280-char budget. Several notes in one draft are folded into one \`[kitesurf batch N]\` note of at most 1600 characters, pinned at most 8. \`stack: none\` means there is no component file. Agents pull the human's last pick without a CDP attach: \`GET /nano-kitesurf/last\` returns the open note's full element packet (elements, boxes, styles, parentSel/childSel) — the note-pull API, same shape a click produces. Notes already sent stay listed when the page changes. Numbered pin dots sit on the frame — clicking a dot drops just that note, ⌘Z pops the last, the pins strip clears all. Do not expand the note into HTML, a screenshot, or a guessed component.

Gestures on the pane (Cursor design-mode parity): click picks, Shift+click appends elements to the open note, Alt+click with no note open sends the element straight to the composer, plain drag marks a box, Alt+drag an ellipse, Shift+drag an arrow. While a note is open, Arrow Up selects the element's parent, Arrow Down its largest visible child — the packet's \`parentSel\`/\`childSel\` fields carry those selectors. Double-click turns the note input into in-place text edit (Enter writes back to the page, Esc cancels). Esc cancels drag → note → annotate in that order; ⌘/Ctrl+Shift+D toggles annotate; ⌘/Ctrl+Z removes the last pin; ⌘/Ctrl+L with a note open pushes it into the composer. While annotate is on, a dashed box previews the element under the cursor (a \`preview: true\` pick that never moves \`lastPick\`).

An authenticated Harness page can read the last raw packet with \`GET /nano-kitesurf/last\`. Every shot and pick returns the live page identity (\`url\`, \`scrollY\`, \`targetId\`); the pane compares them and auto-refresh + warns (\`页面已变化…\`) when a click lands on stale pixels — picking over a shifted page never silently hits the wrong element. A click sends \`POST /nano-kitesurf/pick\` with \`{x, y}\` in viewport pixels — plus \`preview: true\` for hover probes that skip \`lastPick\`, or \`{selector: "…"}\` to re-pick a parent/child the pane already named (Arrow Up/Down). Double-click with a note open switches the input into in-place text edit — it POSTs \`/nano-kitesurf/edit\` with \`{selector, text}\` and the page itself changes; the shot refreshes.

An authenticated Harness page can read the last raw packet with \`GET /nano-kitesurf/last\`. The pick packet's \`element\` is the hit element; \`elements\` is the same thing wrapped in a one-item list for multi-select code paths. \`parentSel\`/\`childSel\` name the parent and largest visible child for Arrow Up/Down navigation — null at the DOM boundary. \`POST /nano-kitesurf/open\` navigates; \`POST /nano-kitesurf/shot\` screenshots the current page (optional \`{"scroll": ±px}\` moves first, max 4000). \`GET /nano-kitesurf/status\` reports whether \`/health\` answered.

## Console and diagnostics

There is no dedicated console route — read the console inside the page context instead: \`agent_browser_eval\` (through the MCP bridge, or \`agent-browser --cdp … eval\`) can install a buffer (\`window.__ksLogs||=[];['log','warn','error'].forEach(k=>{const o=console[k];console[k]=(...a)=>{__ksLogs.push(k+': '+a.map(String).join(' ').slice(0,400));o.apply(console,a)}})\`) and read it back. This survives because the eval runs in the page's own world.

For bridge liveness read \`GET ws://127.0.0.1:<mcpPort>/health\` as plain HTTP (the same port): \`{ ok, mcp:'/mcp', conns, accepted, rejected, uptimeMs }\`. Host timings are in \`GET /nano-kitesurf/perf-review/host\` — route spans \`open\`/\`shot\`/\`pick\`/\`settings\`, lifecycle spans \`kite.bringUp\` → \`kite.container\` (CLI) + \`kite.warmup\` (health poll). \`POST ?mode=window\` drains; a GET never does.

## Errors

A failed call returns \`errorId\` plus \`error\`, with a real HTTP status (400 for your input, 409 for phase, 502/504 for the engine). The same pair is the toast, and \`GET /nano-kitesurf/status\` repeats it as \`lastError\`. Do not paraphrase the id.

- \`kitesurf.url.empty\` / \`kitesurf.url.invalid\` / \`kitesurf.url.scheme\` / \`kitesurf.url.credentials\` — the address. A schemeless host like \`www.realestate.com.au\` is opened as \`https://\`.
- \`kitesurf.body.json\` / \`kitesurf.body.toolarge\` — the POST body itself was bad or over the route limit.
- \`kitesurf.pick.point\` — x/y not finite viewport pixels (0–10000). \`kitesurf.pick.failed\` — the page-side probe errored.
- \`kitesurf.shot.scroll\` — scroll not finite or beyond ±4000. \`kitesurf.shot.empty\` — engine returned no image.
- \`kitesurf.settings.userAgent\` / \`kitesurf.settings.viewport\` — UA must be one line ≤400 chars; viewport width must be 390, 768, or 1280 (or \`null\` to clear).
- \`kitesurf.navigate.timeout\` — \`Page.navigate\` did not finish. \`kitesurf.navigate.failed\` — the engine refused (\`net::ERR_*\`); the page is not open. \`kitesurf.navigate.egress\` — the engine fetched for 25s and wrote \`kitesurf: egress timeout\` into the page.
- \`kitesurf.engine.connect\` — cannot reach or open the CDP socket. \`kitesurf.engine.closed\` — the socket died mid-call (page likely reset to \`about:blank\`). \`kitesurf.engine.timeout\` — a non-navigate call timed out. \`kitesurf.engine.mismatch\` — the origin answered but is not Kitesurf. \`kitesurf.engine.failed\` — any other CDP failure.
- \`kitesurf.kite.state\` — wrong phase (e.g. \`start\` on a suspended engine; use \`resume\`). \`kitesurf.kite.remote\` — remote engine needs \`allowRemote: true\` in the profile. \`kitesurf.kite.checkout\` — no KITESURF_CHECKOUT/config.checkout set. \`kitesurf.kite.origin\` / \`kitesurf.kite.mcpPort\` / \`kitesurf.kite.action\` — bad configure/start inputs.

Set the User-Agent with \`POST /nano-kitesurf/settings\` and \`{ "userAgent": "..." }\`. An empty string clears it. \`{ "viewport": { "width": 390|768|1280 } }\` sets a preset (mobile for 390/768), \`{ "viewport": null }\` clears it. Both live in memory only and apply before the next navigation.

## Do not

- Do not fall back to a local Chrome, Playwright, or Puppeteer when the engine is down. Say that Kitesurf is not answering.
- Do not invent a component file from the selector alone. Ask, or search the workspace and show the match.
- Do not deploy the engine. The container owns that process.
- Do not close the socket, restart the browser, or detach mid-session — the human's page is on it.`

const NANO_KITE = `# nano-kite

Session skill. \`POST /nano-kitesurf/kite\` with \`{ "action" }\`. Live values are \`GET /nano-kitesurf/status\` under \`kite\`. Drive pages with \`/kitesurf-cdp\` and \`kite.cdp\`. Do not launch Chrome.

- \`init\` checks Node ≥22 first (agent-browser needs it), then writes \`$DSH_HOME/nano-kitesurf.lock.json\` once; a later init returns \`already: true\` without rewriting. Init does not start a container. The lock is not inside the plugin directory, because a host restart replaces that directory.
- \`start\` — only from \`idle\`. Starts the local \`kitesurf\` container from inside DSH when the origin is loopback (publishes \`127.0.0.1:<enginePort>:8787\` and \`127.0.0.1:<mcpPort>:8791\`, mounts the checkout read-only), then waits for \`/health\`. A remote origin is only probed. Failure is \`kitesurf.kite.start\`.
- \`suspend\` — only from running. Closes the CDP socket and stops the local container. THIS DROPS THE PAGE TO about:blank — anything the user was viewing is gone. Warn before suspending.
- \`resume\` — only from suspended. Starts the same container again; the page does not come back with it. A failure is \`kitesurf.kite.resume\`.
- \`configure\` — \`{ "httpBase": "http://host:port", "mcpPort": 8799 }\`. A remote engine is refused with \`kitesurf.kite.remote\` unless the profile sets \`allowRemote: true\`. Credentials in the URL are \`kitesurf.url.credentials\`. \`mcpPort\` only takes effect the next time a container is created — an existing container keeps its published ports (a changed mapping is detected on start and the container is recreated). The MCP bridge serves \`GET /health\` over plain HTTP too: \`{ ok, mcp, conns, accepted, rejected, uptimeMs }\` — use it to confirm the bridge is up before pointing agents at \`ws://127.0.0.1:<mcpPort>/mcp\`.

Local container runs need a Kitesurf checkout: set \`KITESURF_CHECKOUT\` or profile \`config.checkout\` to a built source tree; missing/unreadable is \`kitesurf.kite.checkout\`. Starting a cold container can take ~100s.

Wrong phase is \`kitesurf.kite.state\`. An old Node is \`kitesurf.kite.node\` and does not write the lock. A bad port is \`kitesurf.kite.mcpPort\`. Bad JSON is \`kitesurf.body.json\`.`

export function nanoKiteSkill() {
  return {
    name: 'nano-kite',
    description: 'Initialize, start, suspend, or resume Kitesurf, and point MCP at a local or remote engine. Use when the user types /nano-kite.',
    content: NANO_KITE,
  }
}

export function kitesurfSkill() {
  return {
    name: 'kitesurf-cdp',
    description: 'Collaborate on a frontend through the Kitesurf CDP endpoint. Use when the user points at a page, or asks to inspect or change what Kitesurf is rendering. Do not launch Chrome.',
    content: KITESURF_CDP,
  }
}

// Body texts, exported so the build can write skills/<name>/SKILL.md from them.
export const SKILL_BODIES = { 'kitesurf-cdp': KITESURF_CDP, 'nano-kite': NANO_KITE }
