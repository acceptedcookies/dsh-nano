/** Devin API chat mapping: pagination, stable event_id, no fake Agent.
 *  Reply keys: items / end_cursor / has_next_page / total. */

export async function readMessagePages(api, profile, sessionId, { first = 50, pages = 8, after: initialAfter, signal } = {}) {
  const items = []
  const seen = new Set()
  const visited = new Set()
  let after = initialAfter
  let pageCount = 0
  let cursorStuck = false
  let reachedEnd = false
  let nextCursor
  const errors = []
  while (pageCount < pages) {
    signal?.throwIfAborted?.()
    if (after != null && visited.has(after)) { cursorStuck = true; break }
    if (after != null) visited.add(after)
    pageCount += 1
    let page
    try {
      page = await api.getMessages(profile, sessionId, { first, after, signal })
    } catch (error) {
      /* Cancellation is not a read outcome — surface it, never collect it. */
      signal?.throwIfAborted?.()
      errors.push({ page: pageCount, message: error?.message ?? String(error), reason: error?.reason })
      break
    }
    signal?.throwIfAborted?.()
    const batch = page.items ?? page.messages ?? []
    for (const message of batch) {
      const id = message.event_id
      if (id == null || id === '') {
        /* No dedup key exists: every ID-less message stays its own entry. */
        items.push({ ...message, identity: 'missing-event-id' })
        continue
      }
      if (seen.has(id)) continue
      seen.add(id)
      items.push(message)
    }
    /* `has_next_page === false` is the only end-of-history signal; an empty
     * page with a live cursor must still be followed. */
    if (page.has_next_page === false) { reachedEnd = true; break }
    const next = page.end_cursor ?? page.cursor ?? page.next
    if (!next || visited.has(next)) { nextCursor = undefined; cursorStuck = true; break }
    after = next
  }
  /* nextCursor exists only when the page budget cut history short. */
  if (!reachedEnd && !cursorStuck && errors.length === 0) nextCursor = after
  /* `complete` means the reader actually observed the end of history; hitting
   * the page cap while `has_next_page` is still true is truncation. */
  signal?.throwIfAborted?.()
  return { items, pages: pageCount, cursorStuck, reachedEnd, errors, nextCursor, complete: reachedEnd && errors.length === 0 && !cursorStuck }
}

export function classifyMessage(message) {
  const content = message?.content ?? message?.message
  if (typeof content === 'string') return { kind: 'text', text: content }
  if (Array.isArray(content)) {
    const texts = content.filter(block => block?.type === 'text' && typeof block.text === 'string').map(block => block.text)
    const others = content.filter(block => !(block?.type === 'text' && typeof block.text === 'string'))
    return { kind: others.length ? 'mixed' : 'text', text: texts.join('\n'), unsupported: others.map(b => b?.type ?? 'unknown') }
  }
  return { kind: 'unsupported', text: '', unsupported: ['non-text'] }
}
