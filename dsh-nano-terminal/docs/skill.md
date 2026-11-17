# nano-terminal agent skill — driving dsh-nano-terminal

You are inside (or alongside) a terminal managed by **dsh-nano-terminal**
(`dnt`). This skill name equals the slash command: everything below is
reachable through `/nano-terminal <sub>` *and* through the `term.*` MCP
tools on `POST /dsh-nano-terminal/mcp`.

Terminals are persistent objects with two addressing layers:

- **addr** = `<lane>/<name|short6>` — e.g. `local/a1b2c3`, `local/review`.
  Resolve by id, name, or addr — all equivalent.
- **ctx ref** = `[ DNT:{conv8}@{term8} ]` — conversation-scoped handle
  (notepad-style `[ DNN:{ws8}@{path} ]` convention). `conv8` = the pane's
  conversation stamp (`stamp8` of its sessionId), `term8` = the pane uuid's
  first 8, both recorded as reserved labels `conv`/`t` on the session.
  The Nano 终端 view's tab menu copies one per pane; any ref-taking tool
  accepts it verbatim (brackets/space/case tolerant). `term.ctx {ref}`
  resolves it back to `{id, addr, ctx, labels, …}`; a bare 8-hex `term8`
  also resolves. "Conversation-scoped" is a *discovery* scope, not an
  access fence: resolution is a global label match, so a known `term8`
  addresses any session — `t`/`conv` are grafted by panes at attach and
  cannot be rewritten via `term.session.label`.
- Your own addr is `$DNT_TERMINAL_ID`; the control plane is `$DNT_API`
  (a *relative* path — `POST <host origin><DNT_API>` speaks MCP JSON-RPC
  `tools/call`).

## Lifecycle

```text
spawn → send → wait → report → cleanup
```

1. **Spawn** — `term.session.create {name, parent, keep, labels, shell, args,
   cwd, cols, rows, title, sessionId}`. `parent` = your addr: children die
   with you and may *note* you back. `keep` = respawn a shell when the
   program is lost — it NEVER reruns the command. `labels` may carry the
   ctx anchors `{t, conv}` at create time only. `lane` other than `local`
   → `incompatible` (connect that lane's own MCP endpoint).
2. **Send** — `term.send {id, data, enter, force, if, wait, timeout}`.
   - Bracketed-paste + Enter is automatic; multi-line `data` sends as-is
     with `\n`→`\r` translation.
   - Draft-wait: your text queues behind a human's unfinished draft
     (up to 60s after their last keystroke — no absolute cap).
   - A `blocked` terminal refuses send → `{kind:"blocked"}` unless `force`.
   - `if:"idle"|"working"` = conditional delivery (`status_mismatch` on
     miss). `if:"idle"` only matches programs that actively report
     `state=idle` via OSC 7501 — a plain shell reports no state and fails
     the check, so don't gate unconditional sends on it.
   - `wait:true` rides *this turn* to completion and returns
     `{reason, turn}`.
3. **Keys** — `term.keys {id, keys:[enter|esc|ctrl+c|f5|…], force}` for
   TUI keys; `term.interrupt {id}` politely stops the foreground program
   and reports `stopped|exited|still_working|unknown`.
4. **Wait** — `term.wait {id, output?, children?, timeout?}` — event-driven,
   never poll screens in a loop. `output` matches escape-stripped screen text;
   `children:"all"|"any"` waits on child terminals; `timeout` is a check-in.
   For "run a command and confirm its output", prefer one call:
   `term.send {id, data, wait:true}` rides the turn to completion, then a single
   `read` — that beats `send` + a read/re-read poll loop every time.
5. **Read** — `term.session.read {id, lines, source}` —
   `visible` live screen | `recent` incl. scrollback | `detection`
   bottom-buffer snapshot. `complete:false` means the program still works.
   - `term.session.copy {id, lines, source}` — plain-text clipboard form.
   - `term.session.screenshot {id}` — structured capture: seq + cols/rows +
     cursor + the visible grid (the agent's screenshot).
   - `term.session.clear {id}` — send the terminal's own ^L repaint.
6. **Locate** — `term.ctx {ref}` maps a `[ DNT:{conv8}@{term8} ]` (or any
   legacy ref) to the live `{id, addr, labels}`; `term.session.list` rows
   carry `ctx` and `labels` so one call can inventory a whole session's
   panes. `/nano-terminal ctx <ref>` prints the same resolution.
7. **Probe** — `term.session.stats {id}`: `{pid, processes:[{pid,ppid,pcpu,
   rssKb,stat,etime,command}], foreground, activity}` — the descendant tree
   of the shell; `processes:null` on win32/probe failure. `term.health`:
   lane status + session rollup (`total/alive/exited/working/blocked`) +
   compact per-session list.
8. **Report** — announce state via OSC 7501 from inside the pane:

   ```sh
   printf '\033]7501;state=working:progress=40\033\\'
   printf '\033]7501;state=blocked:kind=question:msg=%s\033\\' "$(printf 'proceed?'|base64)"
   printf '\033]7501;state=done\033\\'        # or state=clear
   ```

   `blocked` with `kind=permission|question|auth` surfaces to the user's UI.
9. **Cleanup** — `term.session.close {id}`; `--rm`-style flows read exit first.

## Slash form

```text
/nano-terminal new | list | ctx <ref> | attach <ref> | send <ref> <text>
              | input <ref> <data> | read <ref> [n] | copy <ref> [n]
              | screenshot <ref> | clear <ref> | wait <ref> [pattern]
              | keys <ref> <keys…> | interrupt <ref> | close <ref>
              | keep <ref> [on|off] | label <ref> k=v|-k | note <ref> <text>
              | template [ref tpl k=v…] | stats <ref> | resize <ref> cxr
              | health | audit [n] | lane | events [since] | skill
```

`send input read copy screenshot clear wait keys interrupt close keep label
note template stats` take `<ref>` = id | name | addr | `[ DNT:{conv8}@{term8} ]`
| `[ DNT:@{term8} ]` (conv-less — pane never bound a conversation stamp, or
the host only echoes `t`) | bare 8-hex term stamp.

**Busy**: `term.session.list`/`stats`/`GET /sessions` carry `busy` — true when
a foreground program owns the pty or OSC 7501 reports working/blocked. A busy
terminal refuses `term.session.close` with `conflict`; pass `confirm:true`
(the same second-confirm the UI shows on pinned/busy tabs).

Slash flags: `send <ref> <text> [--force] [--if=idle|working] [--wait]
[--timeout s]`, `wait <ref> [pattern…] [--children all|any] [--timeout s]`,
`keys <ref> <keys…> [--force]`, `new [name] [--parent ref] [--keep] [--cwd
dir] [--shell sh] [--cols n] [--rows n]`, `resize <ref> 80x24 | 80 24`.
Flag values go either as `--k=v` or `--k v` (value flags only); `--` ends
flag parsing, so `send <ref> -- git push --force` delivers the command
literally. Only the listed flags parse — `--amend` inside data stays data —
but a bare `--` token is still consumed; quote it by prefixing with `--`.
Flag values cannot contain spaces (no quoting convention — prefer `--k=v`
with an unspaced value or absolute paths without spaces).

`attach` returns the *client* ws attach URL — agents do not open it; the
agentic path is the `term.*` tools. `list` shows addr/status/attached/
exited/keep; full ctx/labels come from `term.session.list` or `term.ctx`.
Slash-created sessions carry no ctx ref until a pane attaches and grafts
anchors — mint refs at create via `term.session.create {labels:{t,conv}}`.

## Events

`term.events {since}` returns `{seq, events:[…]}` or `{missed:true, snapshot}`.
Event types: `created lost finished removed status turn title labels size
restarted message heartbeat missed`. A **turn** ends when status leaves
`working`. `message` fires on agentSend/note delivery to a pane.
`term.wait` resolves with reason `exit | status | message | children |
output | timeout`.

## Errors (stable kinds)

`not_found blocked finished live unavailable spawn_failed conflict
status_mismatch name_taken needs_target incompatible limit invalid`

Recovery: `not_found` → `term.session.list` / `term.ctx` to re-derive refs.
`blocked` → retry with `force` (or `interrupt` first). `status_mismatch` →
`term.health`/read then re-check. `finished` → read the tail for exit text,
then spawn a new session. `unavailable`/`spawn_failed` → restored
placeholders wake automatically on send/input/keys/interrupt/clear; a
`spawn_failed` after that is a real spawn error — check `term.health` for
lane status. `conflict` → the term stamp is already bound elsewhere — pick
a different `t`. `needs_target` → a bare stamp is ambiguous (shared `t`
across sessions, or stamp vs id-prefix collision) — re-resolve by addr or
full id.
