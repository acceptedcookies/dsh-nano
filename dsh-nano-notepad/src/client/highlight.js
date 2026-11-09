/** Source-mode syntax tinting. The editor stays a plain <textarea>; a
 * non-interactive mirror layer behind it paints the SAME text with colour
 * spans. Every span only changes presentation — no glyphs are added or
 * removed — so caret, wrap and selection stay pixel-aligned with the mirror.
 */
import { escapeHtml } from './markdown.js'

const s = (cls, text) => `<span class="${cls}">${text}</span>`
/** Wrap already-built HTML (nested spans) — escaping is the caller's job. */
const sRaw = (cls, html) => `<span class="${cls}">${html}</span>`

/**
 * Inline markdown tinting. Each alternative re-escapes the FULL raw match as
 * styled spans — no character is dropped — so column positions are preserved.
 * Order matters: ** before *, image/link before bare code.
 * @param {string} text
 */
function inlineMd(text) {
  const pattern = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|~~([^~]+)~~|\*([^*]+)\*|<([^<>\n]+)>|\[([^\]\n]+)\]|\{([^{}\n]+)\}/gu
  let out = '', cursor = 0
  for (const m of text.matchAll(pattern)) {
    out += escapeHtml(text.slice(cursor, m.index))
    if (m[1] !== undefined) {
      out += s('nm-mk', '![') + escapeHtml(m[1]) + s('nm-mk', '](') + s('nm-link', escapeHtml(m[2])) + s('nm-mk', ')')
    } else if (m[3] !== undefined) {
      out += s('nm-mk', '[') + escapeHtml(m[3]) + s('nm-mk', '](') + s('nm-link', escapeHtml(m[4])) + s('nm-mk', ')')
    } else if (m[5] !== undefined) {
      /* Backticks sit inside the chip so `code` reads as one tinted segment. */
      out += s('nm-code', '`' + escapeHtml(m[5]) + '`')
    } else if (m[6] !== undefined) {
      out += s('nm-strong', '**' + escapeHtml(m[6]) + '**')
    } else if (m[7] !== undefined) {
      out += s('nm-mk', '~~') + s('nm-strike', escapeHtml(m[7])) + s('nm-mk', '~~')
    } else if (m[8] !== undefined) {
      out += s('nm-mk', '*') + s('nm-em', escapeHtml(m[8])) + s('nm-mk', '*')
    } else if (m[9] !== undefined) {
      out += s('nm-mk', '<') + s('nm-angle', escapeHtml(m[9])) + s('nm-mk', '>')
    } else if (m[10] !== undefined) {
      out += s('nm-mk', '[') + s('nm-bracket', escapeHtml(m[10])) + s('nm-mk', ']')
    } else if (m[11] !== undefined) {
      out += s('nm-mk', '{') + s('nm-brace', escapeHtml(m[11])) + s('nm-mk', '}')
    }
    cursor = m.index + m[0].length
  }
  return out + escapeHtml(text.slice(cursor))
}

/** Minimal JSON tint: strings (keys before `:` get a second colour), numbers, booleans, null. */
function inlineJson(text) {
  const pattern = /"(?:[^"\\]|\\.)*"(?=\s*:)|"(?:[^"\\]|\\.)*"|(?<![\w"-])-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false)\b|\bnull\b/gu
  let out = '', cursor = 0
  for (const m of text.matchAll(pattern)) {
    out += escapeHtml(text.slice(cursor, m.index))
    const cls = m[1] !== undefined ? 'nm-key' : m[2] !== undefined ? 'nm-str' : m[3] !== undefined ? 'nm-num' : m[4] !== undefined ? 'nm-bool' : 'nm-null'
    out += s(cls, escapeHtml(m[0]))
    cursor = m.index + m[0].length
  }
  return out + escapeHtml(text.slice(cursor))
}

/**
 * Paint one source line. JSON files take the simple token pass; everything
 * else takes the markdown pass (fences track state across lines).
 * @param {string} line @param {boolean} json @param {{ fence: boolean }} ctx
 */
function lineHtml(line, json, ctx) {
  if (json) return inlineJson(line)
  if (/^```[\w-]*\s*$/.test(line)) {
    ctx.fence = !ctx.fence
    return s('nm-mk', escapeHtml(line))
  }
  if (ctx.fence) return s('nm-code', escapeHtml(line))
  const heading = /^(#{1,6}\s+)(.*)$/.exec(line)
  if (heading) return s('nm-mk', escapeHtml(heading[1])) + s('nm-h', inlineMd(heading[2]))
  if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) return s('nm-mk', escapeHtml(line))
  const quote = /^(>\s?)(.*)$/.exec(line)
  if (quote) return s('nm-mk', escapeHtml(quote[1])) + s('nm-quote', inlineMd(quote[2]))
  const task = /^(\s*[-*]\s+\[)([ x])(\]\s+)(.*)$/.exec(line)
  if (task) {
    const checked = task[2] === 'x'
    return s('nm-mk', escapeHtml(task[1]))
      + s(checked ? 'nm-num' : 'nm-mk', escapeHtml(task[2]))
      + s('nm-mk', escapeHtml(task[3]))
      + (checked ? s('nm-strike', inlineMd(task[4])) : inlineMd(task[4]))
  }
  const bullet = /^(\s*[-*]\s+)(.*)$/.exec(line)
  if (bullet) return s('nm-mk', escapeHtml(bullet[1])) + inlineMd(bullet[2])
  const num = /^(\s*\d+\.\s+)(.*)$/.exec(line)
  if (num) return s('nm-mk', escapeHtml(num[1])) + inlineMd(num[2])
  /* Table rows: dim the pipes so the column grid reads; content still tints. */
  if (line.includes('|')) {
    return line.split('|').map(part => inlineMd(part)).join(s('nm-mk', '|'))
  }
  return inlineMd(line)
}

/**
 * @param {string} text @param {boolean} json
 * @returns {string} HTML for the mirror layer — one <div> per source line.
 */
export function highlightSource(text, json) {
  const ctx = { fence: false }
  return text.split('\n').map(line => `<div>${lineHtml(line, json, ctx) || '&#8203;'}</div>`).join('')
}
