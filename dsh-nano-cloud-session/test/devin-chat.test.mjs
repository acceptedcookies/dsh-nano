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

test('page-cap truncation is not complete; reaching the end is', async () => {
  const capped = await readMessagePages({ getMessages: pagesOf(300, 100) }, {}, 'devin-x', { first: 100, pages: 2 })
  assert.equal(capped.items.length, 200)
  assert.equal(capped.pages, 2)
  assert.equal(capped.reachedEnd, false)
  assert.equal(capped.complete, false)
  const ended = await readMessagePages({ getMessages: pagesOf(150, 100) }, {}, 'devin-x', { first: 100, pages: 8 })
  assert.equal(ended.reachedEnd, true)
  assert.equal(ended.complete, true)
})

test('empty first page with a live cursor is followed, not treated as the end', async () => {
  const api = {
    async getMessages(_p, _id, { after } = {}) {
      if (!after) return { items: [], has_next_page: true, end_cursor: 'c1' }
      return { items: [{ event_id: 'e1', message: 'hello', role: 'user' }], has_next_page: false, end_cursor: 'e1' }
    },
  }
  const r = await readMessagePages(api, {}, 'devin-x')
  assert.equal(r.items.length, 1)
  assert.equal(r.items[0].message, 'hello')
  assert.equal(r.reachedEnd, true)
  assert.equal(r.complete, true)
  assert.equal(r.cursorStuck, false)
})

test('a/b/a cursor cycles report cursorStuck and never complete', async () => {
  const api = {
    async getMessages(_p, _id, { after } = {}) {
      if (!after) return { items: [{ event_id: 'e1' }], has_next_page: true, end_cursor: 'a' }
      if (after === 'a') return { items: [{ event_id: 'e2' }], has_next_page: true, end_cursor: 'b' }
      return { items: [{ event_id: 'e3' }], has_next_page: true, end_cursor: 'a' }
    },
  }
  const r = await readMessagePages(api, {}, 'devin-x', { pages: 10 })
  assert.equal(r.cursorStuck, true)
  assert.equal(r.complete, false)
  assert.equal(r.items.length, 3)
})

test('budget exhaustion returns nextCursor; resuming from it continues', async () => {
  const api = { getMessages: pagesOf(300, 100) }
  const first = await readMessagePages(api, {}, 'devin-x', { first: 100, pages: 1 })
  assert.equal(first.complete, false)
  assert.equal(first.nextCursor, 'e99')
  const rest = await readMessagePages(api, {}, 'devin-x', { first: 100, pages: 8, after: first.nextCursor })
  assert.equal(rest.items.length, 200)
  assert.equal(rest.items[0].event_id, 'e100')
  assert.equal(rest.complete, true)
})

test('abort before the call rejects; in-flight abort is not a success result', async () => {
  const api = { getMessages: async () => ({ items: [{ event_id: 'e1' }], has_next_page: false, end_cursor: 'e1' }) }
  const pre = new AbortController()
  pre.abort()
  await assert.rejects(() => readMessagePages(api, {}, 'devin-x', { signal: pre.signal }), /aborted/i)

  const ctl = new AbortController()
  const slow = {
    getMessages: async (_p, _id, { signal } = {}) => {
      await new Promise(resolve => setTimeout(resolve, 5))
      signal?.throwIfAborted?.()
      return { items: [{ event_id: 'e1' }], has_next_page: false, end_cursor: 'e1' }
    },
  }
  const pending = readMessagePages(slow, {}, 'devin-x', { signal: ctl.signal })
  ctl.abort()
  await assert.rejects(pending, /aborted/i)
})

test('classifyMessage survives null/malformed blocks and keeps unknown out of text', () => {
  const mixed = classifyMessage({ content: [{ type: 'text', text: 'hi' }, null, { nope: 1 }] })
  assert.equal(mixed.kind, 'mixed')
  assert.equal(mixed.text, 'hi')
  assert.deepEqual(mixed.unsupported, ['unknown', 'unknown'])
  const badText = classifyMessage({ content: [{ type: 'text', text: null }] })
  assert.equal(badText.text, '')
  assert.equal(classifyMessage({ content: null }).kind, 'unsupported')
  assert.equal(classifyMessage({ content: { type: 'image' } }).kind, 'unsupported')
  assert.equal(classifyMessage({ content: [{ type: 'image' }] }).kind, 'mixed')
})

test('nextCursor is undefined on a completed read and on a stuck cursor', async () => {
  const ended = await readMessagePages({ getMessages: pagesOf(50, 100) }, {}, 'devin-x', { pages: 4 })
  assert.equal(ended.nextCursor, undefined)
  const loop = {
    async getMessages(_p, _id, { after } = {}) {
      return after
        ? { items: [{ event_id: 'e2' }], has_next_page: true, end_cursor: 'a' }
        : { items: [{ event_id: 'e1' }], has_next_page: true, end_cursor: 'a' }
    },
  }
  const stuck = await readMessagePages(loop, {}, 'devin-x')
  assert.equal(stuck.cursorStuck, true)
  assert.equal(stuck.nextCursor, undefined)
})
