// Selection + copy-mode (herdr copy.rs / select.rs models).
//
// Selection lives on the wasm term: `select_set(anchor, focus)` /
// `select_text()` expose a plain-text range over visible + scrollback lines.
// Copy-mode is a scrollback navigator: arrow/page keys move a mark without
// touching the program (output keeps flowing — copy mode never pauses the
// pipe, unlike screen/tmux capture-pane).
//
// Client-side glue: copyMode() installs a keydown filter while active;
// selectText reads via a wasm text dump.

export const COPYMODE_HINT = '[copy-mode] ↑↓/PgUp/PgDn move · v select · y copy · q/Esc quit'

/**
 * Install copy-mode key handling on `box` (the .dnt-pane element).
 * Delegates movement to term.scrollBy; toggles selection via term.selectSet.
 * Returns a dispose() that restores normal key handling.
 */
export function copyMode({ box, term, lane, onCopy, onHint }) {
  let selAnchor = null // absolute line index, or null
  let selFocus = null
  const cursor = { y: 0 }

  const keydown = (ev) => {
    const k = ev.key
    if (k === 'Escape' || k === 'q') {
      ev.preventDefault(); ev.stopPropagation()
      term.selectClear?.()
      onHint?.(null)
      dispose()
      return
    }
    const total = term.totalLines()
    const view = term.viewStart()
    const page = Math.max(1, (term.rows?.() ?? 24) - 1)
    if (k === 'ArrowUp') cursor.y = Math.max(0, cursor.y - 1)
    else if (k === 'ArrowDown') cursor.y = Math.min(total - 1, cursor.y + 1)
    else if (k === 'PageUp') cursor.y = Math.max(0, cursor.y - page)
    else if (k === 'PageDown') cursor.y = Math.min(total - 1, cursor.y + page)
    else if (k === 'Home') cursor.y = 0
    else if (k === 'End') cursor.y = total - 1
    else if (k === 'v') { selAnchor = selAnchor == null ? cursor.y : null; selFocus = cursor.y }
    else if (k === 'y' || k === 'Enter') {
      if (selAnchor != null) {
        const [a, b] = selAnchor <= selFocus ? [selAnchor, selFocus] : [selFocus, selAnchor]
        const text = term.selectText?.(a, b) ?? ''
        onCopy?.(text)
      }
      ev.preventDefault(); ev.stopPropagation()
      onHint?.(null)
      dispose()
      return
    } else return
    // keep the mark inside the viewport while browsing
    const screen = cursor.y - view
    if (screen < 0) term.scrollBy(screen)
    else if (screen >= (term.rows?.() ?? 24)) term.scrollBy(screen - (term.rows?.() ?? 24) + 1)
    if (selAnchor != null) { selFocus = cursor.y; term.selectSet?.(selAnchor, selFocus) }
    ev.preventDefault(); ev.stopPropagation()
  }
  box.addEventListener('keydown', keydown, true)
  function dispose() {
    box.removeEventListener('keydown', keydown, true)
  }
  onHint?.(COPYMODE_HINT)
  return dispose
}

/** Mouse-drag selection → clipboard text. Row indices are absolute lines. */
export function dragText(term, aRow, aCol, bRow, bCol) {
  const [ra, rb] = aRow <= bRow ? [aRow, bRow] : [bRow, aRow]
  return term.selectText?.(ra, rb, aRow <= bRow ? aCol : bCol, aRow <= bRow ? bCol : aCol) ?? ''
}
