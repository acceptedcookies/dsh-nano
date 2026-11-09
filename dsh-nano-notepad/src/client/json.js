/** Strict JSON support: validation with precise error position, format/minify/
 * escape helpers, and a collapsible tree renderer for the notepad's second
 * document type.
 */

/** @param {string} ch */
function isDigit(ch) { return ch >= '0' && ch <= '9' }

/**
 * Recursively validate `text` as strict JSON. Returns the deepest failure
 * position so caret jumps land at the exact offending character.
 * @param {string} text
 * @returns {{ ok: true, value: unknown } | { ok: false, pos: number, message: string }}
 */
export function validateJson(text) {
  let pos = 0
  const len = text.length
  const fail = (message, at = pos) => ({ ok: false, pos: at, message })
  const ws = () => { while (pos < len && ' \t\n\r'.includes(text[pos])) pos += 1 }

  function parseString() {
    const start = pos
    pos += 1 // opening quote
    let out = ''
    while (pos < len) {
      const ch = text[pos]
      if (ch === '"') { pos += 1; return out }
      if (ch === '\\') {
        pos += 1
        if (pos >= len) return fail('unterminated escape sequence', pos)
        const esc = text[pos]
        const table = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' }
        if (esc === 'u') {
          const hex = text.slice(pos + 1, pos + 5)
          if (hex.length < 4 || !/^[0-9a-fA-F]{4}$/.test(hex)) return fail('invalid \\u escape', pos)
          out += String.fromCharCode(parseInt(hex, 16))
          pos += 5
          continue
        }
        if (table[esc] === undefined) return fail(`invalid escape \\${esc}`, pos)
        out += table[esc]
        pos += 1
        continue
      }
      if (ch < ' ') return fail('unescaped control character in string', pos)
      out += ch
      pos += 1
    }
    return fail('unterminated string', start)
  }

  function parseNumber() {
    const start = pos
    if (text[pos] === '-') pos += 1
    if (text[pos] === '0') pos += 1
    else if (isDigit(text[pos])) { while (pos < len && isDigit(text[pos])) pos += 1 }
    else return fail('expected a number', start)
    if (text[pos] === '.') {
      pos += 1
      if (!isDigit(text[pos])) return fail('digits required after decimal point', pos)
      while (pos < len && isDigit(text[pos])) pos += 1
    }
    if (text[pos] === 'e' || text[pos] === 'E') {
      pos += 1
      if (text[pos] === '+' || text[pos] === '-') pos += 1
      if (!isDigit(text[pos])) return fail('digits required in exponent', pos)
      while (pos < len && isDigit(text[pos])) pos += 1
    }
    return Number(text.slice(start, pos))
  }

  function parseValue() {
    ws()
    if (pos >= len) return fail('expected a value', pos)
    const ch = text[pos]
    if (ch === '{') {
      const object = {}
      pos += 1
      ws()
      if (text[pos] === '}') { pos += 1; return object }
      while (true) {
        ws()
        if (text[pos] !== '"') return fail('object keys must be strings', pos)
        const key = parseString()
        if (typeof key !== 'string') return key
        ws()
        if (text[pos] !== ':') return fail('expected ":" after object key', pos)
        pos += 1
        const value = parseValue()
        if (value && typeof value === 'object' && 'ok' in value && value.ok === false) return value
        object[key] = value
        ws()
        if (text[pos] === ',') { pos += 1; continue }
        if (text[pos] === '}') { pos += 1; return object }
        return fail('expected "," or "}" in object', pos)
      }
    }
    if (ch === '[') {
      const array = []
      pos += 1
      ws()
      if (text[pos] === ']') { pos += 1; return array }
      while (true) {
        const value = parseValue()
        if (value && typeof value === 'object' && 'ok' in value && value.ok === false) return value
        array.push(value)
        ws()
        if (text[pos] === ',') { pos += 1; continue }
        if (text[pos] === ']') { pos += 1; return array }
        return fail('expected "," or "]" in array', pos)
      }
    }
    if (ch === '"') return parseString()
    if (ch === 't') { if (text.startsWith('true', pos)) { pos += 4; return true } return fail('unexpected token, did you mean true?', pos) }
    if (ch === 'f') { if (text.startsWith('false', pos)) { pos += 5; return false } return fail('unexpected token, did you mean false?', pos) }
    if (ch === 'n') { if (text.startsWith('null', pos)) { pos += 4; return null } return fail('unexpected token, did you mean null?', pos) }
    if (ch === '-' || isDigit(ch)) return parseNumber()
    return fail(`unexpected character "${ch}"`, pos)
  }

  const value = parseValue()
  if (value && typeof value === 'object' && 'ok' in value && value.ok === false) return value
  ws()
  if (pos < len) return fail('unexpected trailing content', pos)
  return { ok: true, value }
}

/**
 * Convert a failure offset into 1-based line/column for the lint readout.
 * @param {string} text @param {number} pos
 */
export function positionOf(text, pos) {
  let line = 1, col = 1
  for (let i = 0; i < pos && i < text.length; i += 1) {
    if (text[i] === '\n') { line += 1; col = 1 } else col += 1
  }
  return { line, col }
}

/** Pretty-print with 2-space indent; returns undefined when input is invalid. */
export function formatJson(text) {
  const result = validateJson(text)
  return result.ok ? JSON.stringify(result.value, null, 2) : undefined
}

/** Compact output; returns undefined when input is invalid. */
export function minifyJson(text) {
  const result = validateJson(text)
  return result.ok ? JSON.stringify(result.value) : undefined
}

/** Escape arbitrary text into a JSON-safe payload (quoted as a string body). */
export function escapeJson(text) {
  return JSON.stringify(text)
}

/**
 * Reverse of {@link escapeJson}: when the buffer is a JSON string literal,
 * unwrap it back to raw text; otherwise decode escape sequences in place so
 * the action is still useful on partially-escaped content.
 */
export function unescapeJson(text) {
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed === 'string') return parsed
  } catch { /* fall through to inline decoding */ }
  return decodeEscapes(text)
}

/**
 * Decode JSON escape sequences in place without requiring valid JSON:
 * \n \t \r \b \f \/ \\ \" and \uXXXX become their literal characters.
 */
export function decodeEscapes(text) {
  return text.replace(/\\u([0-9a-fA-F]{4})|\\([ntrbf"'\\/])/g, (match, hex, single) => {
    if (hex !== undefined) return String.fromCharCode(parseInt(hex, 16))
    const table = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '"': '"', "'": "'", '\\': '\\', '/': '/' }
    return table[single] ?? match
  })
}

/** @param {unknown} value */
function typeOf(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value === 'object' ? 'object' : typeof value
}

/** Collapsed-preview for a container node: `{"a":1, …}` / `[1, 2, …]`. */
function previewOf(value, esc) {
  const type = typeOf(value)
  if (type === 'object') {
    const keys = Object.keys(value)
    const head = keys.slice(0, 3).map(k => `"${esc(k)}"`).join(', ')
    return `{ ${head}${keys.length > 3 ? ', …' : ''} }`
  }
  if (type === 'array') {
    const head = value.slice(0, 3).map(v => typeOf(v) === 'object' || typeOf(v) === 'array' ? '…' : esc(JSON.stringify(v))).join(', ')
    return `[ ${head}${value.length > 3 ? ', …' : ''} ]`
  }
  return ''
}

/**
 * Render a parsed JSON value as nested <details>/<summary>. `collapsed` is a
 * Set of dot-joined paths ("" = root); the panel owns it so expand/collapse
 * survive re-renders.
 * @param {unknown} value @param {Set<string>} collapsed @param {(s:string)=>string} esc
 */
export function renderJsonTree(value, collapsed, esc) {
  const node = (v, path, key) => {
    const type = typeOf(v)
    if (type !== 'object' && type !== 'array') {
      const cls = type === 'string' ? 'nj-str' : type === 'number' ? 'nj-num' : type === 'boolean' ? 'nj-bool' : 'nj-null'
      const display = type === 'string' ? `"${esc(v)}"` : String(v)
      return `<div class="nj-leaf">${key !== undefined ? `<span class="nj-key">"${esc(String(key))}"</span><span class="nj-p">: </span>` : ''}<span class="${cls}">${display}</span></div>`
    }
    const open = collapsed.has(path) ? '' : ' open'
    const entries = type === 'object' ? Object.entries(v) : v.map((item, i) => [i, item])
    const count = entries.length
    const label = type === 'object'
      ? (count === 0 ? '{}' : `{ <span class="nj-count">${count}</span> }`)
      : (count === 0 ? '[]' : `[ <span class="nj-count">${count}</span> ]`)
    const head = key !== undefined ? `<span class="nj-key">${typeof key === 'number' ? key : `"${esc(String(key))}"`}</span><span class="nj-p">: </span>` : ''
    const children = entries.map(([k, child]) => node(child, `${path}/${String(k).replace(/~/g, '~0').replace(/\//g, '~1')}`, type === 'object' ? k : k)).join('')
    return `<details${open} data-nj-path="${esc(path)}"><summary class="nj-node"><span class="nj-caret"></span>${head}<span class="nj-type">${label}</span><span class="nj-preview">${previewOf(v, esc)}</span></summary><div class="nj-children">${children || '<div class="nj-leaf nj-empty"></div>'}</div></details>`
  }
  return `<div class="nj-tree">${node(value, '', undefined)}</div>`
}
