# dnt agent skill — driving dsh-nano-terminal

You are inside (or alongside) a terminal managed by **dsh-nano-terminal**
(`dnt`). Terminals are persistent objects with a single address space:

- **addr** = `<lane>/<name|short6>` — e.g. `local/a1b2c3`, `local/review`.
  Resolve by id, name, or addr — all equivalent.
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
6. **Report** — announce state via OSC 7501 from inside the pane:

   ```sh
   printf '\033]7501;state=working:progress=40\033\\'
   printf '\033]7501;state=blocked:kind=question:msg=%s\033\\' "$(printf 'proceed?'|base64)"
   printf '\033]7501;state=done\033\\'        # or state=clear
   ```

   `blocked` with `kind=permission|question|auth` surfaces to the user's UI.
7. **Cleanup** — `term.session.close {id}`; `--rm`-style flows read exit first.

## Events

`term.events {since}` returns `{seq, events:[…]}` or `{missed:true, snapshot}`.
Event types: `created lost finished removed status turn title labels size
restarted heartbeat missed`. A **turn** ends when status leaves `working`.

## Errors (stable kinds)

`not_found blocked finished live unavailable spawn_failed conflict
status_mismatch name_taken needs_target incompatible limit invalid`
