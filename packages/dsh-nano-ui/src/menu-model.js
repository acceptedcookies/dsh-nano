/** React-free half of the menu wrapper: row mapping and sizing. */

/** Estimated popup height in px: 28 per row, 9 per separator, 8 of padding. */
export function menuHeight(items) {
  let height = 8
  for (const item of items) height += item?.separator === true ? 9 : 28
  return height
}

/** Max-height presets (px) for the list; a cap picks the largest preset not above it. */
export const MENU_CAPS = Object.freeze([120, 160, 200, 240, 320, 400, 480])

export function capClass(maxHeight) {
  if (typeof maxHeight !== 'number' || !Number.isFinite(maxHeight)) return undefined
  const cap = [...MENU_CAPS].reverse().find(step => step <= maxHeight) ?? MENU_CAPS[0]
  return `nano-cap-${cap}`
}

/** nano action rows → host Menu items. */
export function toHostItems(actions) {
  return actions.map(action => action?.separator === true
    ? { type: 'separator', id: action.id }
    : { id: action.id, label: action.label, icon: action.icon, danger: action.tone === 'danger', disabled: action.disabled === true })
}
