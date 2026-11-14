/** Indent-sensitive YAML subset: maps, lists, scalars. No anchors. */

function coerce(raw) {
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === 'null') return null
  if (/^-?\d+$/.test(raw)) return Number(raw)
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1)
  }
  return raw
}

export function parseYaml(text) {
  const lines = String(text).split(/\r?\n/)
  const root = {}
  const stack = [{ indent: -1, container: root }]
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index].replace(/\s+#.*$/, '')
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue
    const indent = rawLine.match(/^ */)[0].length
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop()
    const parent = stack[stack.length - 1].container
    const trimmed = rawLine.trim()
    if (trimmed.startsWith('- ')) {
      if (!Array.isArray(parent)) throw new Error(`yaml list item without a list at line ${index + 1}`)
      const rest = trimmed.slice(2).trim()
      const colon = rest.indexOf(':')
      if (colon === -1) {
        parent.push(coerce(rest))
        continue
      }
      const item = {}
      parent.push(item)
      const key = rest.slice(0, colon).trim()
      const value = rest.slice(colon + 1).trim()
      if (value === '') item[key] = {}
      else item[key] = coerce(value)
      stack.push({ indent, container: item })
      continue
    }
    const colon = trimmed.indexOf(':')
    if (colon === -1) throw new Error(`yaml key missing at line ${index + 1}`)
    const key = trimmed.slice(0, colon).trim()
    const value = trimmed.slice(colon + 1).trim()
    if (value !== '') {
      parent[key] = coerce(value)
      continue
    }
    let next = ''
    for (let look = index + 1; look < lines.length; look += 1) {
      const candidate = lines[look].replace(/\s+#.*$/, '')
      if (!candidate.trim() || candidate.trim().startsWith('#')) continue
      next = candidate.trim()
      break
    }
    const child = next.startsWith('- ') ? [] : {}
    parent[key] = child
    stack.push({ indent, container: child })
  }
  return root
}
