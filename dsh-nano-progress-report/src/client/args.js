/** Tool-call argument handling. `tool/call.data.arguments` arrives as a raw
 *  JSON string (possibly partial while streaming); never import PartialArguments. */

/**
 * Parse a raw arguments payload into a plain object.
 * @param {unknown} raw - arguments string or already-parsed value.
 * @returns {Record<string, unknown> | null} parsed object, or null.
 */
export function parseArgs(raw) {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'object') return raw
  if (typeof raw !== 'string' || raw === '') return null
  try {
    const value = JSON.parse(raw)
    return value !== null && typeof value === 'object' ? value : null
  } catch {
    // Streaming partial JSON: keep the raw text for display, no object.
    return null
  }
}

/** First string field of a parsed args object, for summary building. */
export function argString(args, ...keys) {
  if (args === null) return ''
  for (const key of keys) {
    const value = args[key]
    if (typeof value === 'string' && value !== '') return value
  }
  return ''
}

/** Single-line, bounded summary text. */
export function oneLine(text, max = 160) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

/** Text content of a message-like `content` block array, bounded. */
export function blocksText(content, max = 4000) {
  if (!Array.isArray(content)) return typeof content === 'string' ? oneLine(content, max) : ''
  const parts = []
  for (const block of content) {
    if (block && typeof block.text === 'string') parts.push(block.text)
    else if (typeof block === 'string') parts.push(block)
  }
  const text = parts.join('\n')
  return text.length > max ? `${text.slice(0, max)}…` : text
}
