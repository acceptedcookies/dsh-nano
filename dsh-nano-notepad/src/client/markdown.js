/** Minimal Markdown used by the notepad. It renders only its own image links. */

const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

/** @param {string} value */
export function escapeHtml(value) {
  return value.replace(/[&<>"]/gu, char => ESCAPE[char])
}

/** @param {string} line */
const FENCE = /^```([\w-]*)\s*$/
/** @param {string} line */
const TABLE_SEP = /^\s*\|?[\s:|-]*-[\s:|-]*-[\s:|-]*\|?\s*$/
/** A separator row only marks a table when it carries at least one pipe. */
function isTableSep(line) { return line.includes('|') && TABLE_SEP.test(line) }
/** @param {string} line */
const HR = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/

/** Split a `|`-row into cells, honouring escaped \|. Leading/trailing pipes are optional. */
function tableCells(row) {
  const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells = []
  let cell = '', escaped = false
  for (const ch of trimmed) {
    if (escaped) { cell += ch === '|' ? '|' : `\\${ch}`; escaped = false; continue }
    if (ch === '\\') { escaped = true; continue }
    if (ch === '|') { cells.push(cell); cell = ''; continue }
    cell += ch
  }
  cells.push(cell)
  return cells.map(item => item.trim())
}

/** @param {string} markdown @param {Map<string, { mime: string, base64: string }>} images */
export function renderMarkdown(markdown, images) {
  const lines = markdown.replace(/\r\n/gu, '\n').split('\n')
  const html = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (line.trim() === '') {
      index += 1
      continue
    }
    /* Fenced code block: ```lang … ``` — verbatim, escaped, language class. */
    const fence = FENCE.exec(line)
    if (fence) {
      const body = []
      index += 1
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        body.push(lines[index])
        index += 1
      }
      index += 1 // consume the closing ```
      const lang = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : ''
      html.push(`<pre class="np-fence"><code${lang}>${escapeHtml(body.join('\n'))}</code></pre>`)
      continue
    }
    /* GFM table: a |row whose next line is a ---|--- separator. */
    if (line.includes('|') && index + 1 < lines.length && isTableSep(lines[index + 1])) {
      const header = tableCells(line)
      const align = tableCells(lines[index + 1]).map(cell =>
        cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : 'left')
      index += 2
      const rows = []
      while (index < lines.length && lines[index].includes('|') && lines[index].trim() !== '') {
        rows.push(tableCells(lines[index]))
        index += 1
      }
      const head = `<tr>${header.map((cell, i) => `<th style="text-align:${align[i] ?? 'left'}">${inline(cell, images)}</th>`).join('')}</tr>`
      const bodyRows = rows.map(row =>
        `<tr>${header.map((_, i) => `<td style="text-align:${align[i] ?? 'left'}">${inline(row[i] ?? '', images)}</td>`).join('')}</tr>`).join('')
      html.push(`<table><thead>${head}</thead><tbody>${bodyRows}</tbody></table>`)
      continue
    }
    if (HR.test(line)) {
      html.push('<hr>')
      index += 1
      continue
    }
    const heading = /^(#{1,6})\s+(.+)$/u.exec(line)
    if (heading) {
      const level = heading[1].length
      html.push(`<h${level}>${inline(heading[2], images)}</h${level}>`)
      index += 1
      continue
    }
    if (/^>\s?/.test(line)) {
      const quoted = []
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoted.push(lines[index].replace(/^>\s?/, ''))
        index += 1
      }
      html.push(`<blockquote><p>${quoted.map(item => inline(item, images)).join('<br>')}</p></blockquote>`)
      continue
    }
    if (/^[-*]\s+/u.test(line)) {
      const items = []
      while (index < lines.length && /^[-*]\s+/u.test(lines[index])) {
        const checked = /^[-*]\s+\[( |x)\]\s+(.*)$/u.exec(lines[index])
        if (checked) {
          const mark = checked[1] === 'x' ? 'checked' : ''
          items.push(`<li><input type="checkbox" disabled ${mark}>${inline(checked[2], images)}</li>`)
        } else {
          items.push(`<li>${inline(lines[index].replace(/^[-*]\s+/u, ''), images)}</li>`)
        }
        index += 1
      }
      html.push(`<ul>${items.join('')}</ul>`)
      continue
    }
    if (/^\d+\.\s+/u.test(line)) {
      const items = []
      while (index < lines.length && /^\d+\.\s+/u.test(lines[index])) {
        items.push(`<li>${inline(lines[index].replace(/^\d+\.\s+/u, ''), images)}</li>`)
        index += 1
      }
      html.push(`<ol>${items.join('')}</ol>`)
      continue
    }
    const paragraph = []
    while (index < lines.length && lines[index].trim() !== '' && !blockStart(lines[index], lines[index + 1])) {
      paragraph.push(lines[index])
      index += 1
    }
    html.push(`<p>${paragraph.map(item => inline(item, images)).join('<br>')}</p>`)
  }
  return html.join('')
}

/** @param {string} line @param {string} [next] */
function blockStart(line, next) {
  if (FENCE.test(line) || HR.test(line)) return true
  if (line.includes('|') && typeof next === 'string' && isTableSep(next)) return true
  return /^(#{1,6})\s+/u.test(line) || /^>\s?/.test(line) || /^[-*]\s+/u.test(line) || /^\d+\.\s+/u.test(line)
}

/** @param {string} text @param {Map<string, { mime: string, base64: string }>} images */
function inline(text, images) {
  const pattern = /!\[([^\]]*)\]\(notepad-image:([0-9a-f-]{36})\)|!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|~~([^~]+)~~|\*([^*]+)\*/gu
  let result = ''
  let cursor = 0
  for (const match of text.matchAll(pattern)) {
    result += escapeHtml(text.slice(cursor, match.index))
    if (match[2]) {
      const image = images.get(match[2])
      result += image
        ? `<img alt="${escapeHtml(match[1])}" src="data:${image.mime};base64,${image.base64}">`
        : `<span class="missing-image">${escapeHtml(match[2])}</span>`
    } else if (match[4]) {
      const src = escapeHtml(match[4])
      result += `<img alt="${escapeHtml(match[3])}" src="${src}">`
    } else if (match[6]) {
      const href = escapeHtml(match[6])
      result += `<a href="${href}" target="_blank" rel="noreferrer">${escapeHtml(match[5])}</a>`
    } else if (match[7]) {
      result += `<code>${escapeHtml(match[7])}</code>`
    } else if (match[8]) {
      result += `<strong>${escapeHtml(match[8])}</strong>`
    } else if (match[9]) {
      result += `<del>${escapeHtml(match[9])}</del>`
    } else if (match[10]) {
      result += `<em>${escapeHtml(match[10])}</em>`
    }
    cursor = match.index + match[0].length
  }
  return result + escapeHtml(text.slice(cursor))
}

/**
 * Sanitize a rich-text HTML fragment (e.g. a WeChat article body) for direct
 * injection into `.np-read`: promote `data-src`, strip scripts/iframes/event
 * handlers, keep only layout-relevant style declarations, neutralize
 * positioning and lazy-reveal `visibility:hidden`. `dark` remaps the
 * white-background / black-text values WeChat hardcodes onto dsw tokens.
 * @param {string} html
 * @param {{ dark?: boolean }} [opts]
 */
export function sanitizeRichHtml(html, opts = {}) {
  const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html')
  for (const bad of doc.querySelectorAll('script, iframe, mpvoice, [onclick], [onload], [onerror]')) bad.remove()
  for (const el of doc.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name)
    }
  }
  for (const img of doc.querySelectorAll('img')) {
    const src = img.getAttribute('data-src') || img.getAttribute('src') || ''
    if (src) img.setAttribute('src', src)
    img.removeAttribute('data-src')
    img.setAttribute('referrerpolicy', 'no-referrer')
    img.style.maxWidth = '100%'
    img.style.height = 'auto'
  }
  const dark = opts.dark === true
  for (const el of doc.querySelectorAll('[style]')) {
    const kept = []
    for (const decl of el.getAttribute('style').split(';')) {
      const [prop, ...rest] = decl.split(':')
      const name = prop.trim().toLowerCase()
      let value = rest.join(':').trim()
      if (!name || !MP_SAFE_STYLE.test(name)) continue
      if (dark) {
        if (/^background(-color)?$/.test(name) && /^(#fff|#ffffff|white|rgb\(255,\s*255,\s*255\))$/i.test(value)) continue
        if (name === 'color' && /^(#000|#111|#222|#333|#444|black|rgb\(0,\s*0,\s*0\))$/i.test(value)) continue
      }
      kept.push(`${prop.trim()}: ${value}`)
    }
    /* The host pass already appends `position: static` — do not stack a
       second copy when the draft came through /fetch-mp. */
    if (!kept.some(d => /^position\s*:/i.test(d))) kept.push('position: static')
    if (kept.length) el.setAttribute('style', kept.join('; '))
    else el.removeAttribute('style')
  }
  return doc.body.innerHTML
}

const MP_SAFE_STYLE = /^(color|font-size|font-weight|font-style|font-family|text-align|line-height|margin(-(top|right|bottom|left))?|padding(-(top|right|bottom|left))?|background(-color|-image)?|border(-(top|right|bottom|left)(-(width|style|color))?)?|border-radius|letter-spacing|text-indent|text-decoration(-line)?|width|max-width|height|display|vertical-align|box-sizing|overflow(-x|-y)?|white-space|word-(wrap|break)|opacity|float|clear)$/

/* ---------- Source-view HTML utilities (work on the draft string) ---------- */

const HTML_VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i
const HTML_INLINE = /^(a|abbr|b|bdi|bdo|br|cite|code|data|dfn|em|i|img|kbd|mark|q|s|samp|small|span|strong|sub|sup|time|u|var)$/i

/** Pretty-print an HTML fragment: block tags on their own lines, indented. */
export function formatHtml(html) {
  const src = String(html ?? '').replace(/>\s+</g, '><').trim()
  if (!src) return ''
  const lines = []
  let depth = 0
  const chunk = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g
  let m
  while ((m = chunk.exec(src)) !== null) {
    const tok = m[0]
    if (tok.startsWith('</')) {
      depth = Math.max(0, depth - 1)
      lines.push(`${'  '.repeat(depth)}${tok}`)
    } else if (tok.startsWith('<!--')) {
      lines.push(`${'  '.repeat(depth)}${tok}`)
    } else if (tok.startsWith('<')) {
      const name = tok.match(/^<([a-zA-Z][\w-]*)/)?.[1] ?? ''
      const selfClose = /\/\s*>$/.test(tok) || HTML_VOID.test(name)
      lines.push(`${'  '.repeat(depth)}${tok}`)
      if (!selfClose && !HTML_INLINE.test(name)) depth += 1
      else if (!selfClose && HTML_INLINE.test(name)) { /* inline stays same line */ }
    } else {
      const text = tok.trim()
      if (text) lines.push(`${'  '.repeat(depth)}${text}`)
    }
  }
  return lines.join('\n')
}

/** Collapse inter-tag whitespace and line breaks: a compact one-liner draft. */
export function minifyHtml(html) {
  return String(html ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Remove every `style`/`class` attribute: keep only the semantic skeleton. */
export function stripHtmlStyles(html) {
  return String(html ?? '')
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\sclass\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
}

/** Ordered unique image src list from a fragment. */
export function extractImageUrls(html) {
  const urls = []
  const re = /<img\b[^>]*\bsrc\s*=\s*"([^"]+)"/gi
  let m
  while ((m = re.exec(String(html ?? ''))) !== null) {
    if (!urls.includes(m[1])) urls.push(m[1])
  }
  return urls
}

/** Rendered text of a fragment: blocks separated by blank lines. */
export function htmlToText(html) {
  const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html')
  for (const br of doc.querySelectorAll('br')) br.replaceWith('\n')
  for (const el of doc.querySelectorAll('p,section,div,h1,h2,h3,h4,li,blockquote,tr')) {
    el.append('\n')
  }
  return doc.body.textContent.replace(/\n{3,}/g, '\n\n').trim()
}

/** @param {string} markdown @param {number} start @param {number} end @param {string} kind */
export function applyFormat(markdown, start, end, kind) {
  const selected = markdown.slice(start, end)
  const wrap = (before, after = before) => ({
    text: markdown.slice(0, start) + before + (selected || 'text') + after + markdown.slice(end),
    cursor: start + before.length,
  })
  if (kind === 'bold') return wrap('**')
  if (kind === 'italic') return wrap('*')
  if (kind === 'strike') return wrap('~~')
  if (kind === 'code') return wrap('`')
  if (kind === 'link') return wrap('[', '](https://)')
  const lineStart = markdown.lastIndexOf('\n', start - 1) + 1
  const prefix = {
    paragraph: '',
    h1: '# ',
    h2: '## ',
    h3: '### ',
    bullet: '- ',
    numbered: '1. ',
    task: '- [ ] ',
    quote: '> ',
  }[kind]
  if (prefix === undefined) return { text: markdown, cursor: start }
  return {
    text: markdown.slice(0, lineStart) + prefix + markdown.slice(lineStart),
    cursor: start + prefix.length,
  }
}
