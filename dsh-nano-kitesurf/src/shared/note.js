/**
 * Compact design note. Cursor's design mode is criticized for dumping
 * screenshots, fiber props, and whole DOM trees into the prompt. This note
 * keeps one element: selector, a short text quote, a rounded box, and only
 * the computed styles that are actually set.
 */

const STYLE_ORDER = ['color', 'backgroundColor', 'fontSize', 'fontFamily', 'display', 'position']
const NOTE_BUDGET = 1100
const TEXT_BUDGET = 80

/**
 * @param {object} element
 * @param {{ url?: string, comment?: string }} [extra]
 * @returns {string}
 */
export function designNote(element, extra = {}) {
  const source = element && typeof element === 'object' ? element : {}
  const refId = cleanLine(extra.ref, 32) || 'k0'
  // Explicit, machine-checkable enclosure: the agent can tell where one
  // injection starts and ends even when several are pasted back to back.
  const lines = [`<kitesurf ref="${refId}" n="1">`]
  const url = cleanLine(extra.url, 180)
  if (url) lines.push(`url: ${url}`)
  if (source.tag === 'area') lines.push('mark: area')
  else if (source.tag === 'ellipse') lines.push('mark: ellipse')
  else if (source.tag === 'arrow') lines.push('mark: arrow')
  else {
    const selector = cleanLine(source.selector || source.tag, 160)
    if (selector) lines.push(`el: ${selector}`)
  }
  const pageRoot = source.tag === 'html' || source.tag === 'body'
  if (pageRoot) lines.push('hit: page root')
  const isMark = source.tag === 'area' || source.tag === 'ellipse' || source.tag === 'arrow'
  const text = pageRoot || isMark ? '' : cleanLine(source.text, TEXT_BUDGET)
  if (text) lines.push(`text: ${text}`)
  const alt = pageRoot ? '' : cleanLine(source.alt, 80)
  if (alt) lines.push(`alt: ${alt}`)
  const src = cleanLine(source.src, 120)
  if (src && !src.startsWith('data:')) lines.push(`src: ${src}`)
  const line = source.tag === 'arrow' ? lineOf(source) : ''
  if (line) lines.push(`line: ${line}`)
  const box = source.tag === 'arrow' ? '' : boxLine(source.box)
  if (box) lines.push(`box: ${box}`)
  const css = cssLine(source.style)
  if (css) lines.push(`css: ${css}`)
  if (source.tag === 'iframe') lines.push('limit: iframe script is not inspected')
  const attrs = source.attrs && typeof source.attrs === 'object' ? source.attrs : {}
  const keep = ['role', 'aria-label', 'href', 'type', 'name', 'alt', 'title', 'placeholder']
  const attrLine = keep.filter((k) => typeof attrs[k] === 'string' && attrs[k]).map((k) => `${k}=${String(attrs[k]).slice(0, 60)}`).join('; ')
  if (attrLine) lines.push(`attrs: ${attrLine}`)
  const ancestors = Array.isArray(source.ancestors) ? source.ancestors.filter(Boolean).slice(0, 5) : []
  if (ancestors.length) lines.push(`anc: ${ancestors.join(' < ')}`)
  if (Array.isArray(source.componentStack) && source.componentStack.length) {
    lines.push(`stack: ${source.componentStack.slice(-4).join(' → ')}`)
  } else {
    lines.push('stack: none')
  }
  const comment = cleanLine(extra.comment, 160)
  if (comment) lines.push(`ask: ${comment}`)
  lines.push('</kitesurf>')
  let note = lines.join('\n')
  if (note.length > NOTE_BUDGET) note = `${note.slice(0, NOTE_BUDGET - 1)}…`
  return note
}

/**
 * One note over several picked elements (Shift+click multi-select). Renders
 * each element's identity under its own el/text/css lines, separated so the
 * reader can map element → note; the budget still holds.
 * @param {object[]} elements
 * @param {{ url?: string, comment?: string }} [extra]
 */
export function multiNote(elements, extra = {}) {
  const list = (Array.isArray(elements) ? elements : []).filter((item) => item && typeof item === 'object')
  if (list.length <= 1) return designNote(list[0], extra)
  const refId = cleanLine(extra.ref, 32) || 'k0'
  const lines = [`<kitesurf ref="${refId}" n="${list.length}">`]
  const url = cleanLine(extra.url, 180)
  if (url) lines.push(`url: ${url}`)
  for (let index = 0; index < list.length; index += 1) {
    const source = list[index]
    const selector = cleanLine(source.selector || source.tag, 140)
    if (selector) lines.push(`el${index + 1}: ${selector}`)
    const text = cleanLine(source.text, 60)
    if (text) lines.push(`text${index + 1}: ${text}`)
    const box = boxLine(source.box)
    if (box) lines.push(`box${index + 1}: ${box}`)
  }
  const comment = cleanLine(extra.comment, 160)
  if (comment) lines.push(`ask: ${comment}`)
  lines.push('</kitesurf>')
  let note = lines.join('\n')
  if (note.length > NOTE_BUDGET * 2) note = `${note.slice(0, NOTE_BUDGET * 2 - 1)}…`
  return note
}

/** One composer message for several notes. A single note is unchanged. */
export function batchNote(notes) {
  const items = (Array.isArray(notes) ? notes : []).filter((item) => typeof item === 'string' && item.startsWith('<kitesurf')).slice(0, 8)
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  let body = `<kitesurf-batch n="${items.length}">\n` + items.map((item, index) => `#${index + 1}\n${item}`).join('\n') + '\n</kitesurf-batch>'
  if (body.length > 1600) body = `${body.slice(0, 1599)}…`
  return body
}

function cleanLine(value, max) {
  if (typeof value !== 'string') return ''
  const text = value.replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function lineOf(source) {
  const from = source.from
  const to = source.to
  if (!from || !to) return ''
  const ax = Math.round(Number(from.x) || 0)
  const ay = Math.round(Number(from.y) || 0)
  const bx = Math.round(Number(to.x) || 0)
  const by = Math.round(Number(to.y) || 0)
  return `${ax},${ay} ${bx},${by}`
}

function boxLine(box) {
  if (!box || typeof box !== 'object') return ''
  const x = Math.round(Number(box.x) || 0)
  const y = Math.round(Number(box.y) || 0)
  const w = Math.round(Number(box.width) || 0)
  const h = Math.round(Number(box.height) || 0)
  if (w <= 0 || h <= 0) return `${x},${y} empty`
  return `${x},${y} ${w}x${h}`
}

function cssLine(style) {
  if (!style || typeof style !== 'object') return ''
  const parts = []
  for (const key of STYLE_ORDER) {
    const value = style[key]
    if (typeof value !== 'string' || value.trim() === '') continue
    const compact = value.replace(/\s+/g, ' ').trim()
    if (key === 'position' && compact === 'static') continue
    if (key === 'backgroundColor' && /^(transparent|rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))$/.test(compact)) continue
    parts.push(`${key}=${compact}`)
  }
  return parts.join('; ')
}
