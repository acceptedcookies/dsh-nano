/** Devin API chat mapping: pagination, stable event_id, no fake Agent. */

export async function readMessagePages(api, profile, sessionId, { first = 50, pages = 8 } = {}) {
  const items = []
  const seen = new Set()
  let after
  let pageCount = 0
  let cursorStuck = false
  const errors = []
  while (pageCount < pages) {
    pageCount += 1
    let page
    try {
      page = await api.getMessages(profile, sessionId, { first, after })
    } catch (error) {
      errors.push({ page: pageCount, message: error?.message ?? String(error), reason: error?.reason })
      break
    }
    const batch = page.items ?? page.messages ?? []
    if (batch.length === 0) break
    const startSize = items.length
    for (const message of batch) {
      const id = message.event_id
      if (id == null || id === '') {
        items.push({ ...message, identity: 'missing-event-id' })
        continue
      }
      if (seen.has(id)) continue
      seen.add(id)
      items.push(message)
    }
    const next = page.end_cursor ?? page.cursor ?? page.next
    if (page.has_next_page === false) break
    if (!next || next === after) {
      cursorStuck = true
      break
    }
    if (items.length === startSize && batch.length > 0) {
      /* page of duplicates */
    }
    after = next
  }
  return { items, pages: pageCount, cursorStuck, errors, complete: errors.length === 0 && !cursorStuck }
}

export function classifyMessage(message) {
  const content = message.content ?? message.message
  if (typeof content === 'string') return { kind: 'text', text: content }
  if (Array.isArray(content)) {
    const texts = content.filter(block => block?.type === 'text').map(block => block.text)
    const others = content.filter(block => block?.type !== 'text')
    return { kind: others.length ? 'mixed' : 'text', text: texts.join('\n'), unsupported: others.map(b => b.type) }
  }
  return { kind: 'unsupported', text: '', unsupported: ['non-text'] }
}
