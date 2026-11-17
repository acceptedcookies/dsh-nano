# nano-terminal agent skill — driving dsh-nano-terminal

You are inside (or alongside) a terminal managed by **dsh-nano-terminal**
(`dnt`). This skill name equals the slash command: everything below is
reachable through `/nano-terminal <sub>` *and* through the `term.*` MCP
tools on `POST /dsh-nano-terminal/mcp`.

Terminals are persistent objects with two addressing layers:

- **addr** = `<lane>/<name|short6>` — e.g. `local/a1b2c3`, `local/review`.
  Resolve by id, name, or addr — all equivalent.
- **ctx ref** = `[ DNT:{conv8}@{term8} ]` — conversation-scoped handle
  (notepad-style `[ DNN:{ws8}@{path} ]` convention). The Nano 终端 view's
  tab menu copies one per pane; any ref-taking tool accepts it verbatim.
  `term.ctx {ref}` resolves it back to `{id, addr, ctx, labels, …}`;
  a bare 8-hex `term8` also resolves.
- Your own addr is `$DNT_TERMINAL_ID`; the control plane is `$DNT_API`
  (`POST <DNT_API>` speaks MCP JSON-RPC `tools/call`).

## Lifecycle

```text
spawn → send → wait → report → cleanup
```

1. **Spawn** — `term.session.create {name, parent, keep, task|shell, cwd, cols, rows}`.
   `parent` = your addr: children die with you and may *note* you back.
   `keep` = respawn a shell when the program is lost — it NEVER reruns the command.
2. **Send** — `term.send {id, data, enter, force, if, wait}`.
   - Bracketed-paste + Enter is automatic.
   - Draft-wait: your text queues behind a human's unfinished draft (≤60s).
   - A `blocked` terminal refuses send → `{kind:"blocked"}` unless `force`.
   - `if:"idle"|"working"` = conditional delivery (`status_mismatch` on miss).
   - `wait:true` rides *this turn* to completion and returns `{reason, turn}`.
3. **Keys** — `term.keys {id, keys:[enter|esc|ctrl+c|f5|…]}` for TUI keys;
   `term.interrupt {id}` politely stops the foreground program and reports
   `stopped|exited|still_working|unknown`.
4. **Wait** — `term.wait {id, output?, children?, timeout?}` — event-driven,
   never poll screens in a loop. `output` matches escape-stripped screen text;
   `children:"all"|"any"` waits on child terminals; `timeout` is a check-in.
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
              | template [ref tpl k=v…] | stats <ref> | health
              | events [since] | skill
```

`send input read copy screenshot clear wait keys interrupt close keep label
note template stats` take `<ref>` = id | name | addr | `[ DNT:{conv8}@{term8} ]`
| bare 8-hex term stamp.

## Events

`term.events {since}` returns `{seq, events:[…]}` or `{missed:true, snapshot}`.
Event types: `created lost finished removed status turn title labels size
restarted heartbeat missed`. A **turn** ends when status leaves `working`.

## Errors (stable kinds)

`not_found blocked finished live unavailable spawn_failed conflict
status_mismatch name_taken needs_target incompatible limit invalid`
