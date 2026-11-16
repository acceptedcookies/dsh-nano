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

/**
 * 把原始拖拽区间裁到「真正有字」的范围。
 *
 * 业主反馈：能选中终端里没有内容的空白区并复制出一堆换行符。选区必须只覆盖
 * 有内容的格子，因此：
 *   - 起点行：起点列已在该行内容之后 → 整行不算，往下挪一行
 *   - 终点行：拖过内容底部 → 收回最后一个有内容的行
 *   - 每行列上限：不超过该行内容宽度（行尾空白 / 宽字符按列算）
 *   - 全空区间 → null（不画高亮、不复制）
 *
 * @param {{line:number,col:number}} a 锚点（绝对行）
 * @param {{line:number,col:number}} f 焦点（绝对行）
 * @param {(line:number)=>number} contentCols 该行内容宽度（列），0 = 空行
 * @param {number} cols 终端列数（整行选区的右边界）
 * @returns {{a:{line:number,col:number},f:{line:number,col:number}}|null}
 */
export function clampSelection(a, f, contentCols, cols) {
  if (!a || !f) return null
  const [s, t] = (a.line < f.line || (a.line === f.line && a.col <= f.col)) ? [a, f] : [f, a]
  let top = s.line
  let bot = t.line
  while (top < bot && contentCols(top) <= s.col) top += 1
  while (bot > top && contentCols(bot) === 0) bot -= 1
  const eTop = contentCols(top)
  const eBot = contentCols(bot)
  if (eTop <= 0 || eBot <= 0) return null
  const c0 = top === s.line ? Math.min(s.col, eTop - 1) : 0
  const c1 = Math.min(bot === t.line ? t.col : cols - 1, eBot - 1)
  if (bot === top && c1 < c0) return null
  return { a: { line: top, col: c0 }, f: { line: bot, col: c1 } }
}
