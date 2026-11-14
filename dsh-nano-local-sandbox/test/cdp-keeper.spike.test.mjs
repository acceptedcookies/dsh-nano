import assert from 'node:assert/strict'
import test from 'node:test'
import { CLOSED, OPEN, createCdpKeeper } from '../src/host/cdp-keeper.js'

test('an open socket is not page-lost, and a closed socket is either page-lost or a new page', async () => {
  const keeper = createCdpKeeper()
  const socketA = { readyState: OPEN }
  keeper.attach('A', socketA, { lastUrl: 'https://a.example', dom: 'OLD-A' })
  keeper.attach('B', { readyState: OPEN }, { lastUrl: 'https://b.example', dom: 'DOM-B' })
  const open = await keeper.read('A', async () => { throw new Error('opener while open') })
  assert.notEqual(open.errorId, 'sandbox.cdp.page-lost')
  assert.equal(open.dom, 'OLD-A')

  socketA.readyState = CLOSED
  const lost = await keeper.read('A', async () => null)
  assert.equal(lost.errorId, 'sandbox.cdp.page-lost')
  assert.equal(lost.status, 502)
  assert.notEqual(lost.dom, 'OLD-A')
  assert.equal(keeper.sockets.get('B').lastUrl, 'https://b.example')
  assert.equal(keeper.sockets.get('B').socket.readyState, OPEN)

  keeper.attach('C', { readyState: CLOSED }, { lastUrl: 'https://c.example', dom: 'OLD-C' })
  const recovered = await keeper.read('C', async (url) => ({ socket: { readyState: OPEN }, dom: 'NEW-C', lastUrl: url }))
  assert.equal(recovered.dom, 'NEW-C')
  assert.notEqual(recovered.dom, 'OLD-C')
  assert.equal(recovered.errorId, null)
  assert.equal(keeper.sockets.get('B').lastUrl, 'https://b.example')
})

test('evaluate over 2000 characters does not run and does not return the previous DOM', async () => {
  const keeper = createCdpKeeper()
  keeper.attach('A', { readyState: OPEN }, { dom: 'PREVIOUS' })
  let ran = 0
  const blocked = await keeper.evaluate('A', 'x'.repeat(2001), () => { ran += 1; return 'NEXT' })
  assert.equal(ran, 0)
  assert.equal(blocked.executed, false)
  assert.notEqual(blocked.dom, 'PREVIOUS')
  const legal = await keeper.evaluate('A', 'document.title', () => { ran += 1; return 'TITLE' })
  assert.equal(ran, 1)
  assert.equal(legal.dom, 'TITLE')
})
