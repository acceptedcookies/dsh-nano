/** The only numeric stacking values in nano-ui. The host ships no layer tokens, so each value is
 * anchored on an observed host layer (DESIGN.md §4); every other source reads the generated
 * `--nano-layer-*` custom properties instead of writing numbers. `local1`…`local7` only order
 * siblings inside one owner-made stacking context and never compete with host layers. */

export const NANO_LAYER = Object.freeze({
  shellSlot: 20,
  hostModal: 1000,
  hostPortal: 1100,
  menu: 1100,
  window: 1200,
  windowRaised: 1210,
  overlay: 10,
  local1: 1,
  local2: 2,
  local3: 3,
  local4: 4,
  local5: 5,
  local6: 6,
  local7: 7,
})

/** Spacing scale in px; the host has no spacing tokens. Emitted as `--nano-space-1` … `--nano-space-6`. */
export const NANO_SPACE = Object.freeze([4, 8, 12, 16, 20, 24])

const kebab = name => name.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)

export const LAYER_CSS = `:root {
${Object.entries(NANO_LAYER).map(([name, value]) => `  --nano-layer-${kebab(name)}: ${value};`).join('\n')}
${NANO_SPACE.map((value, index) => `  --nano-space-${index + 1}: ${value}px;`).join('\n')}
}`
