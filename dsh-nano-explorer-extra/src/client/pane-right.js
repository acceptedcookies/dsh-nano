/** Which open workbench pane sits immediately to the right of this one. */

/** Divider width we still treat as "starts at this pane's right edge". */
const RIGHT_EDGE_SLACK = 12

/**
 * The nearest pane whose box sits to the right of `self` and overlaps it
 * vertically. A pane below or to the left is not "the right workbench".
 *
 * @param {{ top: number, right: number, bottom: number }} self - the current pane's box.
 * @param {Array<{ id: string, left: number, top: number, bottom: number, width: number, height: number }>} panes
 * @returns {string | undefined} the chosen pane id.
 */
export function pickPaneToTheRight(self, panes) {
  let best
  let bestLeft = Infinity
  const selfHeight = self.bottom - self.top
  for (const pane of panes) {
    if (pane.width < 8 || pane.height < 8) continue
    const overlap = Math.min(self.bottom, pane.bottom) - Math.max(self.top, pane.top)
    if (overlap < Math.min(selfHeight, pane.bottom - pane.top) * 0.5) continue
    if (pane.left < self.right - RIGHT_EDGE_SLACK) continue
    if (pane.left < bestLeft) { bestLeft = pane.left; best = pane.id }
  }
  return best
}

/**
 * The dock or floating pane immediately to the right of `panelId`, if one is open.
 * Hidden and zero-size panes (a collapsed sidebar, another session) do not count.
 * @param {string} panelId - the files pane this menu was opened from.
 * @returns {string | undefined}
 */
export function paneToTheRightOf(panelId) {
  if (typeof document === 'undefined' || typeof panelId !== 'string' || panelId === '') return undefined
  const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(panelId)
    : panelId.replace(/["\\]/g, '\\$&')
  const self = document.querySelector(`[data-dockkit-pane="${escaped}"], [data-dockkit-float="${escaped}"]`)
  if (!(self instanceof HTMLElement)) return undefined
  const box = self.getBoundingClientRect()
  if (box.width < 1 || box.height < 1) return undefined
  const panes = []
  for (const node of document.querySelectorAll('[data-dockkit-pane], [data-dockkit-float]')) {
    if (!(node instanceof HTMLElement) || node === self) continue
    if (node.closest('[hidden]') !== null) continue
    const id = node.dataset.dockkitPane ?? node.dataset.dockkitFloat
    if (id === undefined || id === panelId) continue
    const rect = node.getBoundingClientRect()
    panes.push({
      id, left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height,
    })
  }
  return pickPaneToTheRight(box, panes)
}
