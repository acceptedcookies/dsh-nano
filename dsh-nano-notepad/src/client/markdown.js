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
