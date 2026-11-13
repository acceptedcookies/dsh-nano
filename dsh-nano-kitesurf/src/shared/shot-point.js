/**
 * Map a click on an img that uses object-fit: contain and object-position:
 * center back to screenshot pixels. Clicks in the letterbox (top/bottom or
 * left/right) are not on the page and must not be sent to the engine.
 *
 * The old implementation pinned content to `top center` (offsetY = 0) while
 * claiming a generic contain mapping: on a tall narrow pane ~80% of the
 * frame was black below the picture, and any pick below the drawn band was
 * silently mis-mapped. Both axes are now centered and both helpers agree.
 *
 * @param {{ x: number, y: number, width: number, height: number }} box element box
 * @param {{ width: number, height: number }} natural screenshot size
 * @param {{ x: number, y: number }} click position inside the element box
 * @returns {{ x: number, y: number } | null}
 */
export function shotPoint(box, natural, click) {
  if (!box || !natural || !click) return null
  if (box.width <= 0 || box.height <= 0 || natural.width <= 0 || natural.height <= 0) return null
  const scale = Math.min(box.width / natural.width, box.height / natural.height)
  const drawnWidth = natural.width * scale
  const drawnHeight = natural.height * scale
  const offsetX = (box.width - drawnWidth) / 2
  const offsetY = (box.height - drawnHeight) / 2
  const x = (click.x - offsetX) / scale
  const y = (click.y - offsetY) / scale
  if (x < 0 || y < 0 || x >= natural.width || y >= natural.height) return null
  return { x: Math.round(x), y: Math.round(y) }
}

/** Where the contained screenshot sits inside the img element. Matches object-position: center. */
export function contentFrame(element, natural) {
  if (!element || !natural || element.width <= 0 || element.height <= 0 || natural.width <= 0 || natural.height <= 0) return null
  const scale = Math.min(element.width / natural.width, element.height / natural.height)
  const width = natural.width * scale
  const height = natural.height * scale
  return {
    left: (element.width - width) / 2,
    top: (element.height - height) / 2,
    width,
    height,
    scale,
  }
}
