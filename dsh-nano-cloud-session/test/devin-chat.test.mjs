import test from 'node:test'
import assert from 'node:assert/strict'
import { readMessagePages, classifyMessage } from '../src/providers/devin/chat.js'

function pagesOf(total, size = 100) {
  const all = Array.from({ length: total }, (_, i) => ({ event_id: `e${i}`, message: `m${i}`, source: 'devin' }))
  return async (_p, _id, { first = size, after } = {}) => {
    const start = after ? Number(String(after).slice(1)) + 1 : 0
    const items = all.slice(start, start + first)
    const last = items.at(-1)
    return { items, has_next_page: start + items.length < total, end_cursor: last ? last.event_id : null }
  }
}

test('T16 251 messages across 3 pages; duplicates skipped; errors visible', async () => {
  const api = { getMessages: pagesOf(251, 100) }
  const result = await readMessagePages(api, {}, 'devin-x', { first: 100, pages: 8 })
  assert.equal(result.items.length, 251)
  assert.equal(result.complete, true)
  const dup = {
    async getMessages(_p, _id, { after } = {}) {
      if (!after) return { items: [{ event_id: 'e1', message: 'a' }, { event_id: 'e2', message: 'b' }], has_next_page: true, end_cursor: 'e2' }
      return { items: [{ event_id: 'e2', message: 'b' }, { event_id: 'e3', message: 'c' }], has_next_page: false, end_cursor: 'e3' }
    },
  }
  const d = await readMessagePages(dup, {}, 'devin-x')
  assert.equal(d.items.length, 3)
  const fail = {
    async getMessages(_p, _id, { after } = {}) {
      if (after) throw Object.assign(new Error('page2'), { reason: 'upstream-error' })
      return { items: [{ event_id: 'e1', message: 'a' }], has_next_page: true, end_cursor: 'e1' }
    },
  }
  const f = await readMessagePages(fail, {}, 'devin-x')
  assert.equal(f.complete, false)
  assert.equal(f.errors.length, 1)
  assert.equal(classifyMessage({ content: [{ type: 'image' }] }).kind, 'mixed')
})
