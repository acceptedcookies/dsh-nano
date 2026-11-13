import assert from 'node:assert/strict'
import test from 'node:test'
import { browserSocketUrl, egressFailure, elementPacket, pageUrl, pickPoint, scrollDelta, setBrowserSettings } from '../lib/engine.js'

test('browser socket is the kitesurf CDP path', () => {
  assert.equal(browserSocketUrl('http://127.0.0.1:8787'), 'ws://127.0.0.1:8787/devtools/browser')
  assert.equal(browserSocketUrl('https://engine.example:8443'), 'wss://engine.example:8443/devtools/browser')
})

test('page urls stay credential-free http(s)', () => {
  assert.equal(pageUrl('https://example.com/a'), 'https://example.com/a')
  assert.equal(pageUrl('www.realestate.com.au'), 'https://www.realestate.com.au/')
  assert.throws(() => pageUrl('file:///tmp/x'), (error) => error.id === 'kitesurf.url.scheme')
  assert.throws(() => pageUrl('https://user:secret@example.com/'), (error) => error.id === 'kitesurf.url.credentials')
})

test('pick points are finite viewport pixels', () => {
  assert.deepEqual(pickPoint({ x: 1.5, y: 2 }), { x: 1.5, y: 2 })
  assert.throws(() => pickPoint({ x: -1, y: 0 }), /out of range/)
  assert.throws(() => pickPoint({ x: '1', y: 2 }), /finite/)
})

test('an engine egress timeout is its own error, not a blank success', () => {
  const error = egressFailure('kitesurf: egress timeout after 25000ms')
  assert.equal(error.id, 'kitesurf.navigate.egress')
  assert.equal(egressFailure('Hello'), null)
})

test('viewport preset rejects an unknown width before talking to the engine', async () => {
  await assert.rejects(
    () => setBrowserSettings('http://127.0.0.1:9', { viewport: { width: 100 } }),
    (error) => error.id === 'kitesurf.settings.viewport',
  )
})

test('screenshot scroll is a small finite step', () => {
  assert.equal(scrollDelta({}), 0)
  assert.equal(scrollDelta({ scroll: 480.2 }), 480)
  assert.throws(() => scrollDelta({ scroll: 9000 }), /out of range/)
  assert.throws(() => scrollDelta({ scroll: '480' }), /finite/)
})

test('element packets never invent a component stack', () => {
  const packet = elementPacket({
    tag: 'button',
    id: 'go',
    text: 'x'.repeat(500),
    style: { color: 'rgb(0, 0, 0)', fontSize: '16px' },
    box: { x: 1, y: 2, width: 3, height: 4 },
  })
  assert.equal(packet.componentStack, null)
  assert.equal(packet.text.length, 200)
  assert.equal(packet.style.color, 'rgb(0, 0, 0)')
  assert.equal(packet.style.display, '')
  assert.deepEqual(packet.box, { x: 1, y: 2, width: 3, height: 4 })
})

test('pickSelector accepts a selector, rejects junk', async () => {
  const { pickSelector } = await import('../lib/engine.js')
  assert.equal(pickSelector({ selector: 'div.box > p:nth-of-type(2)' }), 'div.box > p:nth-of-type(2)')
  assert.equal(pickSelector({ selector: '  a.b  ' }), 'a.b')
  assert.throws(() => pickSelector({ selector: '' }), /required/)
  assert.throws(() => pickSelector({ selector: 5 }), /required/)
  assert.throws(() => pickSelector({ selector: 'xy' }), /invalid/)
  assert.throws(() => pickSelector({}), /required/)
})

test('editBody validates selector + text', async () => {
  const { editBody } = await import('../lib/engine.js')
  assert.deepEqual(editBody({ selector: 'p.x', text: 'hi' }), { selector: 'p.x', text: 'hi' })
  assert.throws(() => editBody({ selector: 'p.x', text: '' }), /text required/)
  assert.throws(() => editBody({ selector: 'p.x', text: 5 }), /text required/)
  assert.throws(() => editBody({ text: 'x' }), /required/)
  assert.throws(() => editBody({ selector: 'p.x', text: 'a'.repeat(5000) }), /too long/)
})
