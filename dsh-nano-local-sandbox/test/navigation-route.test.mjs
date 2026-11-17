import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { routeSpecs } from '../src/host/routes.js'

function harness(t, navigate) {
  const home = mkdtempSync(join(tmpdir(), 'dnls-nav-'))
  t.after(() => rmSync(home, { recursive: true, force: true }))
  const calls = []
  const client = { alive: true, probedAt: Date.now(), async send(method, params) {
    calls.push({ method, params })
    if (method === 'Target.getTargets') return { targetInfos: [{ type: 'page', targetId: 'p', sessionId: 's' }] }
    if (method === 'Page.navigate') return navigate(params)
    return {}
  } }
  const session = { phase: 'running', history: [], httpBase: 'http://engine.invalid', cdp: client }
  const route = routeSpecs({ session, env: { KITESURF_STATE: home } }).find(row => row.path.endsWith('/open'))
  const open = async url => {
    let body
    const res = { statusCode: 0, end(raw) { body = JSON.parse(raw) } }
    await route.handler({ method: 'POST', url: route.path, body: { url } }, res)
    return { status: res.statusCode, body }
  }
  return { open, session, calls, home }
}

test('/open normalizes a bare hostname and only records a completed navigation', async t => {
  const h = harness(t, () => ({ frameId: 'p' }))
  const result = await h.open(' archy.studio ')
  assert.equal(result.status, 200)
  assert.equal(result.body.url, 'https://archy.studio/')
  assert.equal(h.calls.find(row => row.method === 'Page.navigate').params.url, 'https://archy.studio/')
  assert.equal(h.session.history.length, 1)
  assert.equal(JSON.parse(readFileSync(join(h.home, 'last-page.json'), 'utf8')).url, 'https://archy.studio/')
})

test('/open propagates an actual CDP navigation error instead of returning ok:true', async t => {
  const h = harness(t, () => { throw new Error('Page.navigate timed out') })
  const result = await h.open('https://archy.studio')
  assert.equal(result.status, 502)
  assert.equal(result.body.ok, false)
  assert.equal(result.body.errorId, 'kitesurf.navigate.failed')
  assert.equal(h.session.history.length, 0)
  assert.equal(h.session.cdp.alive, true)
})

test('/open rejects an errorText navigation result instead of recording success', async t => {
  const h = harness(t, () => ({ errorText: 'net::ERR_NAME_NOT_RESOLVED' }))
  const result = await h.open('https://missing.invalid')
  assert.equal(result.status, 502)
  assert.equal(result.body.ok, false)
  assert.equal(h.session.history.length, 0)
})

test('/open does not issue navigation for a request already aborted by its caller', async () => {
  let commands = 0
  const session = { phase: 'running', history: [], httpBase: 'http://fixture.invalid', cdp: { alive: true, probedAt: Date.now(), send() { commands++; return {} } } }
  const route = routeSpecs({ session }).find(row => row.path.endsWith('/open'))
  const res = { destroyed: true, end() { throw new Error('response is already gone') } }
  await route.handler({ method: 'POST', url: route.path, aborted: true, body: { url: 'https://archy.studio/' } }, res)
  assert.equal(commands, 0)
  assert.equal(session.history.length, 0)
})

test('/open rejects credentials and non-HTTP URLs before touching the engine', async t => {
  const h = harness(t, () => ({}))
  for (const url of ['', 'file:///etc/passwd', 'https://user:password@example.com']) {
    assert.equal((await h.open(url)).status, 400)
  }
  assert.equal(h.calls.length, 0)
})
