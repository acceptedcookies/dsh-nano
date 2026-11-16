/** Which open workbench pane sits immediately to the right of this one. */

/**
 * The nearest pane to the right of `self`.
 *
 * Column index wins when dockkit stamped one (`data-dockkit-column`): the pane
 * in the next column is the right workbench even if the two border boxes
 * overlap. Otherwise a pane counts when its horizontal center is to the right
 * of ours and the two overlap vertically — a box that is wider than the column
 * it paints in must not hide the neighbor sitting inside that box.
 *
 * @param {{ left: number, right: number, top: number, bottom: number, column?: number }} self
 * @param {Array<{ id: string, left: number, right: number, top: number, bottom: number, width: number, height: number, column?: number }>} panes
 * @returns {string | undefined}
 */
export function pickPaneToTheRight(self, panes) {
  const selfHeight = self.bottom - self.top
  const visible = panes.filter(pane => {
    if (pane.width < 8 || pane.height < 8) return false
    const overlap = Math.min(self.bottom, pane.bottom) - Math.max(self.top, pane.top)
    return overlap >= Math.min(selfHeight, pane.bottom - pane.top) * 0.5
  })
  if (Number.isInteger(self.column)) {
    let best
    let bestColumn = Infinity
    for (const pane of visible) {
      if (!Number.isInteger(pane.column) || pane.column <= self.column) continue
      if (pane.column < bestColumn) { bestColumn = pane.column; best = pane.id }
    }
    if (best !== undefined) return best
  }
  const mid = (self.left + self.right) / 2
  let best
  let bestCenter = Infinity
  for (const pane of visible) {
    const center = (pane.left + pane.right) / 2
    if (center <= mid + 8) continue
    if (center < bestCenter) { bestCenter = center; best = pane.id }
  }
  return best
}

/**
 * The dock or floating pane immediately to the right of the workbench that
 * contains `anchor`.
 *
 * Pane ids (`pane1`, `pane2`, …) are minted per session and repeat. A document-wide
 * query by id hits another session's hidden copy first; that copy has a zero rect,
 * and bailing there hides the item even though this session's right pane is open.
 * Starting from the file tree itself stays in the session the reader is looking at.
 *
 * @param {Element | null | undefined} anchor - any node inside the files page.
 * @returns {string | undefined}
 */
export function paneToTheRightOf(anchor) {
  if (typeof document === 'undefined' || !(anchor instanceof Element)) return undefined
  const self = anchor.closest('[data-dockkit-pane], [data-dockkit-float]')
  if (!(self instanceof HTMLElement)) return undefined
  const box = self.getBoundingClientRect()
  if (box.width < 1 || box.height < 1) return undefined
  const session = self.closest('[data-sidebar-right-session]')
  const scope = session instanceof HTMLElement ? session : document
  const selfId = self.dataset.dockkitPane ?? self.dataset.dockkitFloat
  const selfColumn = columnOf(self)
  const panes = []
  for (const node of scope.querySelectorAll('[data-dockkit-pane], [data-dockkit-float]')) {
    if (!(node instanceof HTMLElement) || node === self) continue
    if (node.closest('[hidden]') !== null) continue
    const id = node.dataset.dockkitPane ?? node.dataset.dockkitFloat
    if (id === undefined || id === selfId) continue
    const rect = node.getBoundingClientRect()
    panes.push({
      id,
      left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
      width: rect.width, height: rect.height,
      column: columnOf(node),
    })
  }
  return pickPaneToTheRight({
    left: box.left, right: box.right, top: box.top, bottom: box.bottom, column: selfColumn,
  }, panes)
}

/** @param {HTMLElement} node @returns {number | undefined} */
function columnOf(node) {
  const raw = node.dataset.dockkitColumn
  if (raw === undefined || raw === '') return undefined
  const value = Number(raw)
  return Number.isInteger(value) ? value : undefined
}
