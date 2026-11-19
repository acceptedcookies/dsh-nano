import test from 'node:test'
import assert from 'node:assert/strict'
import { createDevinView } from '../src/providers/devin/native-view.js'

/** Wire-contract tests for the Devin native projection: upstream rows map to
 *  contiguous wire events, follow emits snapshot + suffix only, and prompt
 *  writes once against the frozen identity. */

const profile = { id: 'p1', orgId: 'org-t', baseUrl: 'https://x', secret: 'cog_x' }
const DETAIL = { session_id: 'abc', title: 'fixture', created_at: 1700000000, updated_at: 1700000001 }

const apiOf = (batches, posted = []) => ({
  getSession: async () => ({ session_id: 'abc', status: 'exit', status_detail: 'finished', updated_at: 1700000001 }),
  getMessages: async (_p, _id, { signal } = {}) => {
    signal?.throwIfAborted?.()
    const batch = batches.length > 1 ? batches.shift() : batches[0]
    if (batch instanceof Error) throw batch
    return batch
  },
  postMessage: async (_p, id, message, { signal } = {}) => {
    signal?.throwIfAborted?.()
    posted.push([id, message])
    return { session_id: id }
  },
})

const rows = (...specs) => specs.map(([event_id, role, message, at]) => ({ event_id, role, message, created_at: at }))
const page = (items, more = false, end_cursor = null) => ({ items, has_next_page: more, end_cursor })

const collect = async (iterable, count, signal) => {
  const frames = []
  for await (const frame of iterable) {
    frames.push(frame)
    if (frames.length >= count) break
  }
  return frames
}

test('normalize: contiguous seq from 0, exact ids, user/assistant wire shapes, epoch-ms times', async () => {
  const api = apiOf([page(rows(['u1', 'user', 'hi', 100], ['d1', 'devin', 'yo', 200], ['u2', 'user', 'again', 300]))])
  const view = createDevinView({ api, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL })
  const out = await view.events({})
  assert.equal(out.records.length, 3)
  assert.deepEqual(out.records.map(r => r.event.seq), [0, 1, 2])
  const [u, d] = out.records.map(r => r.event)
  assert.equal(u.type, 'user/message')
  assert.equal(u.surfaceOp, 'append')
  assert.deepEqual(u.data, { id: 'u1', role: 'user', content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } })
  assert.equal(u.time, 100000)
  /* Assistant rows are display-only external events: no turn, step, usage,
   * stream, or surfaceOp exists to fabricate. */
  assert.equal(d.type, 'external/assistant-message')
  assert.equal(d.ignorable, true)
  assert.equal(d.surfaceOp, undefined)
  assert.deepEqual(d.data, { id: 'd1', text: 'yo' })
})

test('events: throughSeq inclusive, beforeSeq exclusive, maxMessages tail bound', async () => {
  const api = apiOf([page(rows(['a', 'user', '1', 1], ['b', 'devin', '2', 2], ['c', 'user', '3', 3], ['d', 'devin', '4', 4]))])
  const view = createDevinView({ api, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL })
  const w = await view.events({ beforeSeq: 3, maxMessages: 2 })
  assert.deepEqual(w.records.map(r => r.event.seq), [1, 2])
  assert.equal(w.hasMore, true)
  assert.equal(w.cursor, 2)
  const t = await view.events({ throughSeq: 1 })
  assert.deepEqual(t.records.map(r => r.event.seq), [0, 1])
  assert.equal(t.hasMore, false)
})

test('follow: snapshot carries header/cursor/records/projections/stream baselines', async () => {
  const api = apiOf([page(rows(['u1', 'user', 'hi', 5]))])
  const view = createDevinView({ api, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL, pollIntervalMs: 10 })
  const ctl = new AbortController()
  const it = view.follow(ctl.signal)
  const snap = (await it.next()).value
  assert.equal(snap.type, 'snapshot')
  assert.deepEqual(snap.header, { version: 4, id: 'external:x', createdAt: 1700000000000, isSeeded: false })
  assert.equal(snap.cursor, 0)
  assert.equal(snap.records.length, 1)
  assert.equal(snap.hasMore, false)
  assert.deepEqual(snap.projections, { asOfSeq: 0, values: { title: 'fixture' } })
  assert.deepEqual(snap.assistantStream, { revision: 0 })
  ctl.abort()
})

test('follow: emits only the strict suffix; prefix change fails the stream', async () => {
  const first = rows(['u1', 'user', 'hi', 1])
  const grown = rows(['u1', 'user', 'hi', 1], ['d1', 'devin', 'new', 2])
  const changed = rows(['uX', 'user', 'rewritten', 1], ['d1', 'devin', 'new', 2])
  const api = apiOf([page(first), page(grown), page(changed)])
  const view = createDevinView({ api, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL, pollIntervalMs: 5 })
  const it = view.follow(new AbortController().signal)
  assert.equal((await it.next()).value.type, 'snapshot')
  /* Non-durable status frames interleave freely; skip to the first event. */
  let inc
  do { inc = (await it.next()).value } while (inc.type === 'external-status')
  assert.equal(inc.type, 'event')
  assert.equal(inc.event.seq, 1)
  assert.equal(inc.event.data.id, 'd1')
  await assert.rejects(() => it.next(), /history-changed|upstream history changed/)
})

test('follow: abort during poll settles the generator', async () => {
  const api = apiOf([page(rows(['u1', 'user', 'hi', 1]))])
  const view = createDevinView({ api, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL, pollIntervalMs: 60000 })
  const ctl = new AbortController()
  const it = view.follow(ctl.signal)
  await it.next()
  await it.next()
  const pending = it.next()
  ctl.abort()
  await assert.rejects(() => pending, /abort/i)
})

test('prompt: text-only, one postMessage against the frozen bare id', async () => {
  const posted = []
  const api = apiOf([page([])], posted)
  const view = createDevinView({ api, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL })
  const out = await view.prompt({ requestId: 'r1', sessionId: 'external:x', mode: 'queue', content: [{ type: 'text', text: 'go' }] }, new AbortController().signal)
  assert.deepEqual(out, { accepted: true })
  assert.deepEqual(posted, [['abc', 'go']])
  await assert.rejects(() => view.prompt({ content: [{ type: 'text', text: '  ' }] }, new AbortController().signal))
  await assert.rejects(() => view.prompt({ content: [{ type: 'image' }] }, new AbortController().signal))
  assert.equal(posted.length, 1)
})

test('prompt: upstream identity mismatch refuses acceptance', async () => {
  const api = {
    getMessages: async () => page([]),
    postMessage: async () => ({ session_id: 'different' }),
  }
  const view = createDevinView({ api, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL })
  await assert.rejects(
    () => view.prompt({ content: [{ type: 'text', text: 'go' }] }, new AbortController().signal),
    cause => cause.reason === 'upstream-unknown',
  )
})

test('open: truncated history is an explicit failure, never a settled view', async () => {
  let calls = 0
  const api = { getMessages: async () => { calls += 1; return page([], true, `c${calls}`) } }
  const view = createDevinView({ api, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL })
  await assert.rejects(() => view.events({}, new AbortController().signal), { reason: 'history-incomplete' })
})

test('normalize: same event_id with drifted content still fails the stream', async () => {
  const first = rows(['u1', 'user', 'hi', 1])
  const drifted = rows(['u1', 'user', 'hi edited', 1], ['d1', 'devin', 'new', 2])
  const api = apiOf([page(first), page(drifted)])
  const view = createDevinView({ api, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL, pollIntervalMs: 5 })
  const it = view.follow(new AbortController().signal)
  await it.next()
  /* Status frames interleave: drain them until the history check runs. */
  await it.next()
  await it.next()
  await assert.rejects(() => it.next(), /history-changed|upstream history changed/)
})

test('normalize: unknown or empty rows refuse with history-incomplete', async () => {
  const withUnknown = { getMessages: async () => page([{ event_id: 'x', role: 'system', message: 'k' }]) }
  const view1 = createDevinView({ api: withUnknown, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL })
  await assert.rejects(() => view1.events({}), { reason: 'history-incomplete' })
  const withEmpty = { getMessages: async () => page([{ event_id: 'x', role: 'user', message: '   ' }]) }
  const view2 = createDevinView({ api: withEmpty, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL })
  await assert.rejects(() => view2.events({}), { reason: 'history-incomplete' })
})

test('summary.running follows upstream status/status_detail', async () => {
  const api = apiOf([page([])])
  const running = createDevinView({ api, profile, remoteId: 'abc', id: 'external:x', detail: { ...DETAIL, status: 'running', status_detail: 'working' } })
  assert.equal(running.summary.running, true)
  /* A finished session is never running, whatever the detail field says. */
  const finished = createDevinView({ api, profile, remoteId: 'abc', id: 'external:x', detail: { ...DETAIL, status: 'exit', status_detail: 'finished' } })
  assert.equal(finished.summary.running, false)
  const sleeping = createDevinView({ api, profile, remoteId: 'abc', id: 'external:x', detail: { ...DETAIL, status: 'suspended', status_detail: 'waiting_for_user' } })
  assert.equal(sleeping.summary.running, false)
})

test('phaseOf: every upstream status/status_detail combination maps to the agreed phase', async () => {
  const { phaseOf } = await import('../src/providers/devin/native-view.js')
  for (const status of ['new', 'claimed', 'resuming']) {
    assert.equal(phaseOf({ status }), 'pending', status)
  }
  assert.equal(phaseOf({ status: 'running', status_detail: 'working' }), 'working')
  assert.equal(phaseOf({ status: 'running', status_detail: 'finished' }), 'completed')
  assert.equal(phaseOf({ status: 'running', status_detail: 'waiting_for_user' }), 'awaiting-input')
  assert.equal(phaseOf({ status: 'running', status_detail: 'waiting_for_approval' }), 'awaiting-input')
  assert.equal(phaseOf({ status: 'suspended' }), 'suspended')
  assert.equal(phaseOf({ status: 'error' }), 'failed')
  assert.equal(phaseOf({ status: 'exit' }), 'stopped')
  assert.equal(phaseOf({ status: 'running' }), 'unknown')
  assert.equal(phaseOf({ status: 'running', status_detail: 'bogus' }), 'unknown')
  assert.equal(phaseOf({ status: 'mystery' }), 'unknown')
  assert.equal(phaseOf({}), 'unknown')
})

test('follow: initial + changed external-status frames are non-durable and consume no seq', async () => {
  const statuses = [
    { session_id: 'abc', status: 'running', status_detail: 'working', updated_at: 2 },
    { session_id: 'abc', status: 'running', status_detail: 'waiting_for_user', updated_at: 3 },
  ]
  const api = {
    getSession: async () => statuses.length > 1 ? statuses.shift() : statuses[0],
    getMessages: async () => page(rows(['u1', 'user', 'hi', 100])),
  }
  const ctl = new AbortController()
  const frames = await collect(createDevinView({
    api, profile, remoteId: 'abc', id: 'external:x',
    detail: { ...DETAIL, status: 'new' }, pollIntervalMs: 1,
  }).follow(ctl.signal), 3, ctl.signal)
  ctl.abort()
  /* snapshot, initial status, then the changed status on the first poll. */
  assert.equal(frames[0].type, 'snapshot')
  assert.equal(frames[1].type, 'external-status')
  assert.equal(frames[1].phase, 'pending')
  assert.equal(frames[2].type, 'external-status')
  assert.equal(frames[2].phase, 'working')
  assert.equal(frames[2].seq, undefined)
  assert.equal(frames[2].ignorable, undefined)
})

test('follow: a failed getSession read reports unknown, never stale working', async () => {
  const api = {
    getSession: async () => { throw new Error('upstream down') },
    getMessages: async () => page(rows(['u1', 'user', 'hi', 100])),
  }
  const ctl = new AbortController()
  const frames = await collect(createDevinView({
    api, profile, remoteId: 'abc', id: 'external:x',
    detail: { ...DETAIL, status: 'running', status_detail: 'working' }, pollIntervalMs: 1,
  }).follow(ctl.signal), 3, ctl.signal)
  ctl.abort()
  assert.equal(frames[1].phase, 'working')
  assert.equal(frames[2].type, 'external-status')
  assert.equal(frames[2].phase, 'unknown')
})

test('prompt: network and 5xx failures become upstream-unknown; 403/422/429 keep their own reason', async () => {
  const cases = [
    [{ reason: 'unreachable', status: 0 }, 'upstream-unknown'],
    [{ reason: 'timeout', status: 0 }, 'upstream-unknown'],
    [{ reason: 'upstream-error', status: 502 }, 'upstream-unknown'],
    [{ reason: 'forbidden-or-invisible', status: 403 }, 'forbidden-or-invisible'],
    [{ reason: 'invalid-request', status: 422 }, 'invalid-request'],
    [{ reason: 'rate-limited', status: 429 }, 'rate-limited'],
  ]
  for (const [{ reason, status }, expected] of cases) {
    const { CarrierError } = await import('../src/providers/devin/api.js')
    const api = {
      getMessages: async () => page(rows(['u1', 'user', 'hi', 100])),
      postMessage: async () => { throw new CarrierError(reason, `devin ${status || 'net'}`, { status }) },
    }
    const view = createDevinView({ api, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL })
    const ctl = new AbortController()
    await assert.rejects(() => view.prompt({ content: [{ type: 'text', text: 'again' }] }, ctl.signal),
      cause => cause.reason === expected)
  }
})

test('fixture replay: the two approved cloud events project once per open and survive reopen', async () => {
  /* Real read-back rows from the one authorized send on fixture session
   * d445d3e4a63b4646b0c9d7335704fafa. No further write is issued. */
  const history = rows(
    ['event-01a1f24711847ed9b174b12ad40a74e2', 'user', 'DNCS native projection probe', 1700000000],
    ['event-01a1f2471bef71b3830253ba5cde3942', 'devin', 'DNCS-NATIVE-OK', 1700000001],
  )
  const open = () => createDevinView({
    api: apiOf([page(history)]), profile, remoteId: 'd445d3e4a63b4646b0c9d7335704fafa',
    id: 'external:fixture', detail: DETAIL,
  })
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const out = await open().events({})
    const ids = out.records.map(r => r.event.data.id)
    assert.equal(ids.filter(id => id === 'event-01a1f24711847ed9b174b12ad40a74e2').length, 1)
    assert.equal(ids.filter(id => id === 'event-01a1f2471bef71b3830253ba5cde3942').length, 1)
    const reply = out.records.filter(r => r.event.type === 'external/assistant-message')
    assert.equal(reply.length, 1)
    assert.equal(reply[0].event.data.text, 'DNCS-NATIVE-OK')
  }
})

test('prompt: pre-cancelled signal posts nothing; abort and bad receipts after dispatch are unknown', async () => {
  /* Pre-dispatch abort: the carrier is never touched. */
  let posts = 0
  const api = {
    getMessages: async () => page(rows(['u1', 'user', 'hi', 1])),
    postMessage: async () => { posts += 1; return { session_id: 'abc' } },
  }
  const view = createDevinView({ api, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL })
  const cancelled = new AbortController()
  cancelled.abort()
  await assert.rejects(() => view.prompt({ content: [{ type: 'text', text: 'x' }] }, cancelled.signal))
  assert.equal(posts, 0)

  /* Abort landing after dispatch: outcome unknown, not a clean cancel —
   * the request may already be upstream. */
  const abortMid = new AbortController()
  const apiAbort = {
    getMessages: async () => page(rows(['u1', 'user', 'hi', 1])),
    postMessage: async () => {
      posts += 1
      abortMid.abort()
      throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    },
  }
  await assert.rejects(() => createDevinView({ api: apiAbort, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL })
    .prompt({ content: [{ type: 'text', text: 'x' }] }, abortMid.signal),
    cause => cause.reason === 'upstream-unknown')

  /* Unreadable and mismatched receipts share the same unknown outcome and
   * never echo receipt data into the error. */
  for (const reply of [null, {}, { session_id: {} }, { session_id: 'other-id' }]) {
    const apiBad = {
      getMessages: async () => page(rows(['u1', 'user', 'hi', 1])),
      postMessage: async () => reply,
    }
    await assert.rejects(() => createDevinView({ api: apiBad, profile, remoteId: 'abc', id: 'external:x', detail: DETAIL })
      .prompt({ content: [{ type: 'text', text: 'x' }] }, new AbortController().signal),
      cause => cause.reason === 'upstream-unknown' && cause.message.includes('history') && !cause.message.includes('other-id'))
  }
})
