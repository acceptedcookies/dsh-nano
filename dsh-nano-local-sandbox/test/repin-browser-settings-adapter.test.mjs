import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyBrowserSettings, applyBrowserSettingsToPage, applyViewport, browserSettings, effectiveViewport,
} from '../src/host/browser-settings-adapter.js'
import { statusOf } from '../src/host/error-catalog.js'

const metrics = (width = 1280, height = 720, deviceScaleFactor = 1, mobile = false) => ({ width, height, deviceScaleFactor, mobile })
const settingsError = error => error.status === 400 && error.errorId === 'kitesurf.body.json' && statusOf(error.errorId) === 400
const fitError = error => error.status === 400 && error.errorId === 'kitesurf.shot.fit'
const writes = fixture => fixture.calls.filter(row => !row.method.startsWith('Target.'))

// Pure memory driver sample: a failed command can mutate before its reply is lost.
function cdpFixture({ state = {}, onSend, attached = true, page = true } = {}) {
  const calls = []
  const engine = { viewport: metrics(), userAgent: '', media: 'screen', extraHeaders: {}, ...structuredClone(state) }
  const client = { alive: true, async send(method, params, sessionId) {
    const call = { method, params: structuredClone(params), sessionId }
    calls.push(call)
    if (method === 'Target.getTargets') return { targetInfos: page ? [{ type: 'page', targetId: 'page', ...(attached ? { sessionId: 'owner' } : {}) }] : [] }
    if (method === 'Target.attachToTarget') return { sessionId: 'owner' }
    assert.equal(sessionId, 'owner', 'settings always use the owning flattened page session')
    if (method === 'Emulation.setDeviceMetricsOverride') engine.viewport = structuredClone(params)
    else if (method === 'Network.setUserAgentOverride') engine.userAgent = params.userAgent
    else if (method === 'Emulation.setEmulatedMedia') engine.media = params.media === 'print' ? 'print' : 'screen'
    else if (method === 'Network.setExtraHTTPHeaders') engine.extraHeaders = structuredClone(params.headers)
    else assert.fail(`unexpected CDP method ${method}`)
    await onSend?.(call, calls, engine)
    return {}
  } }
  return { client, calls, engine }
}

for (const width of [390, 768, 1280]) {
  test(`DNK width-only ${width} becomes a real override with height 900`, async () => {
    const session = {}
    const fixture = cdpFixture()
    const result = await applyBrowserSettings(session, fixture.client, { viewport: { width } })
    assert.deepEqual(result.viewport, metrics(width, 900))
    assert.deepEqual(fixture.engine.viewport, metrics(width, 900))
    assert.deepEqual(session.viewport, metrics(width, 900))
    assert.equal(writes(fixture).length, 1)
  })
}

test('width-only retains the current fixed height, without coercing input values', async () => {
  const session = { viewport: metrics(768, 1024, 2, true) }
  const fixture = cdpFixture()
  await applyBrowserSettings(session, fixture.client, { viewport: { width: 390 } })
  assert.deepEqual(session.viewport, metrics(390, 1024))
  for (const viewport of [
    {}, [], '390', false, { width: '390' }, { width: 319 }, { width: 3841 }, { width: 390.5 },
    { width: NaN }, { width: Infinity }, { width: 390, height: '900' }, { width: 390, height: null },
    { width: 390, height: 239 }, { width: 390, height: 2161 }, { width: 390, height: 900.5 },
    { width: 390, deviceScaleFactor: 0 }, { width: 390, deviceScaleFactor: 4 },
    { width: 390, deviceScaleFactor: 1.5 }, { width: 390, deviceScaleFactor: '2' },
    { width: 390, mobile: 1 }, { width: 390, unsupported: true }, undefined,
  ]) {
    const beforeCalls = fixture.calls.length
    const before = structuredClone(session)
    await assert.rejects(() => applyBrowserSettings(session, fixture.client, { viewport }), settingsError)
    assert.equal(fixture.calls.length, beforeCalls)
    assert.deepEqual(session, before)
  }
})

test('viewport boundaries, all scale factors, and mobile booleans are accepted', async () => {
  for (const [width, height] of [[320, 240], [3840, 2160]]) {
    for (const deviceScaleFactor of [1, 2, 3]) {
      for (const mobile of [false, true]) {
        const session = {}
        const fixture = cdpFixture()
        const viewport = { width, height, deviceScaleFactor, mobile }
        await applyBrowserSettings(session, fixture.client, { viewport })
        assert.deepEqual(fixture.engine.viewport, viewport)
      }
    }
  }
})

test('null restores lastFit with a supported override, or the known 1280x720 fallback', async () => {
  for (const lastFit of [undefined, { width: 1111, height: 777 }]) {
    const session = { viewport: metrics(390, 900), ...(lastFit ? { lastFit } : {}) }
    const fixture = cdpFixture({ state: { viewport: session.viewport } })
    const result = await applyBrowserSettings(session, fixture.client, { viewport: null })
    assert.equal(result.viewport, null)
    assert.equal(session.viewport, null)
    assert.deepEqual(fixture.engine.viewport, lastFit ? metrics(1111, 777) : metrics())
    assert.deepEqual(writes(fixture).map(row => row.method), ['Emulation.setDeviceMetricsOverride'])
  }
})

test('effectiveViewport is a pure fixed-before-fit selector returning detached values', () => {
  const session = { viewport: metrics(390, 900, 3, true), lastFit: { width: 1000, height: 700 } }
  const before = structuredClone(session)
  const result = effectiveViewport(session, { width: 1600, height: 1000 })
  assert.deepEqual(result, session.viewport)
  result.width = 2000
  assert.deepEqual(session, before)
  assert.deepEqual(effectiveViewport({ lastFit: { width: 1000, height: 700 } }), metrics(1000, 700))
  assert.deepEqual(effectiveViewport({ lastFit: { width: 1000, height: 700 } }, { width: 1600, height: 1000 }), metrics(1600, 1000))
  assert.deepEqual(effectiveViewport({}), metrics())
})

test('shot fit cannot overwrite fixed viewport, but is remembered for returning to auto', async () => {
  const session = { viewport: metrics(390, 900, 2, true) }
  const fixture = cdpFixture()
  const fit = { width: 1600, height: 1000 }
  assert.deepEqual(await applyViewport(session, fixture.client, fit, 'owner'), session.viewport)
  assert.deepEqual(fixture.engine.viewport, session.viewport)
  assert.deepEqual(session.lastFit, fit)
  assert.deepEqual(session.viewport, metrics(390, 900, 2, true))
  await applyBrowserSettings(session, fixture.client, { viewport: null })
  assert.deepEqual(fixture.engine.viewport, metrics(1600, 1000))
  fit.width = 1800
  assert.deepEqual(session.lastFit, { width: 1600, height: 1000 })
})

test('auto shot fit stores only a successful fit and does not make it a fixed setting', async () => {
  const session = {}
  const fixture = cdpFixture({ attached: false })
  assert.deepEqual(await applyViewport(session, fixture.client, { width: 1200, height: 800 }), metrics(1200, 800))
  assert.deepEqual(session, { lastFit: { width: 1200, height: 800 } })
  assert.deepEqual(fixture.calls[1], { method: 'Target.attachToTarget', params: { targetId: 'page', flatten: true }, sessionId: undefined })
  await applyViewport(session, fixture.client)
  assert.deepEqual(fixture.engine.viewport, metrics(1200, 800))
  assert.equal(browserSettings(session).viewport, null)
})

test('malformed fit is rejected before page acquisition, including while viewport is fixed', async () => {
  const session = { viewport: metrics(390, 900) }
  const fixture = cdpFixture()
  for (const fit of [false, [], {}, { width: 400 }, { width: '400', height: 900 }, { width: 319, height: 900 },
    { width: 400, height: 2161 }, { width: 400.5, height: 900 }, { width: 400, height: 900, mobile: false }]) {
    assert.throws(() => effectiveViewport(session, fit), fitError)
    await assert.rejects(() => applyViewport(session, fixture.client, fit), fitError)
  }
  assert.deepEqual(fixture.calls, [])
})

test('invalid entire patches, UA and media are rejected instead of silently ignored', async () => {
  const session = { userAgent: 'before' }
  const fixture = cdpFixture()
  const patches = [null, [], false, 'settings', { ignored: true }, { userAgent: 1 }, { userAgent: undefined },
    { userAgent: 'a'.repeat(401) }, { userAgent: 'a\r\nb' }, { userAgent: 'a\u0000b' },
    { media: 'speech' }, { media: '' }, { media: false }, { media: undefined }]
  for (const patch of patches) await assert.rejects(() => applyBrowserSettings(session, fixture.client, patch), settingsError)
  assert.deepEqual(fixture.calls, [])
  assert.deepEqual(session, { userAgent: 'before' })
})

test('every header must be legal; forbidden/case aliases, count overflow and injection fail the whole patch', async () => {
  const session = {}
  const fixture = cdpFixture()
  const invalidHeaders = [[], false, 'headers', undefined,
    Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`X-${i}`, 'ok'])),
    { 'bad name': 'value' }, { ['a'.repeat(65)]: 'value' }, { 'X-Ok': 1 }, { 'X-Ok': 'a'.repeat(201) },
    { 'X-Ok': 'before\r\nX-Evil: injected' }, { 'X-Ok': 'nul\u0000value' }, { 'X-Case': 'a', 'x-case': 'b' },
    { 'X-Kitesurf-Policy': 'dropped by official pin' },
    ...['Cookie', 'Authorization', 'Proxy-Authorization', 'Host', 'Content-Length', 'Connection', 'Upgrade', 'TE', 'Trailer', 'Transfer-Encoding'].map(name => ({ [name]: 'forbidden' })),
  ]
  for (const extraHeaders of invalidHeaders) {
    await assert.rejects(() => applyBrowserSettings(session, fixture.client, { viewport: { width: 390 }, userAgent: 'valid', media: 'print', extraHeaders }), settingsError)
  }
  assert.deepEqual(fixture.calls, [], 'all validation finishes before the first CDP request')
  assert.deepEqual(session, {})
})

test('valid UA/media/20 headers are applied once under one attachment; null/empty values clear', async () => {
  const session = {}
  const fixture = cdpFixture({ attached: false })
  const extraHeaders = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`X-${i}`, 'a'.repeat(200)]))
  const patch = { viewport: { width: 768 }, userAgent: '  custom UA  ', media: 'print', extraHeaders }
  const result = await applyBrowserSettings(session, fixture.client, patch)
  assert.deepEqual(result, { viewport: metrics(768, 900), userAgent: 'custom UA', media: 'print', extraHeaders })
  assert.deepEqual(fixture.engine, { viewport: metrics(768, 900), userAgent: 'custom UA', media: 'print', extraHeaders })
  assert.equal(fixture.calls.filter(row => row.method === 'Target.attachToTarget').length, 1)
  patch.extraHeaders['X-0'] = 'mutated'
  result.extraHeaders['X-1'] = 'mutated'
  result.viewport.height = 1000
  assert.equal(session.extraHeaders['X-0'], 'a'.repeat(200))
  assert.equal(session.extraHeaders['X-1'], 'a'.repeat(200))
  assert.equal(session.viewport.height, 900)
  await applyBrowserSettings(session, fixture.client, { userAgent: null, media: null, extraHeaders: null })
  assert.equal(fixture.engine.userAgent, '')
  assert.equal(fixture.engine.media, 'screen')
  assert.deepEqual(fixture.engine.extraHeaders, {})
  assert.deepEqual(browserSettings(session), { viewport: metrics(768, 900), userAgent: '', media: null, extraHeaders: null })
  await applyBrowserSettings(session, fixture.client, { userAgent: '', extraHeaders: {} })
  assert.equal(fixture.engine.userAgent, '')
  assert.deepEqual(fixture.engine.extraHeaders, {})
})

test('each possible CDP failure rolls back the failed command and previous writes; session never commits early', async () => {
  const methods = ['Emulation.setDeviceMetricsOverride', 'Network.setUserAgentOverride', 'Emulation.setEmulatedMedia', 'Network.setExtraHTTPHeaders']
  for (const failedMethod of methods) {
    const session = { viewport: metrics(768, 1024, 2, true), userAgent: 'before', media: 'screen', extraHeaders: { 'X-Before': 'before' }, lastFit: { width: 1000, height: 700 } }
    const before = structuredClone(session)
    let failed = false
    const failure = new Error(`lost reply: ${failedMethod}`)
    const fixture = cdpFixture({ state: browserSettings(session), onSend(call) {
      assert.deepEqual(session, before, 'canonical settings stay unchanged throughout apply and rollback')
      if (!failed && call.method === failedMethod) { failed = true; throw failure }
    } })
    await assert.rejects(() => applyBrowserSettings(session, fixture.client, { viewport: { width: 390 }, userAgent: 'after', media: 'print', extraHeaders: { 'X-After': 'after' } }), error => error === failure)
    assert.deepEqual(session, before)
    assert.deepEqual(fixture.engine, { ...browserSettings(before), media: 'screen' })
    const count = methods.indexOf(failedMethod) + 1
    assert.deepEqual(writes(fixture).map(row => row.method), [...methods.slice(0, count), ...methods.slice(0, count).reverse()])
  }
})

test('rollback to initially unset settings uses real defaults, not unsupported clear or ghost session fields', async () => {
  const session = { lastFit: { width: 1000, height: 700 } }
  const before = structuredClone(session)
  let failed = false
  const fixture = cdpFixture({ state: { viewport: metrics(1000, 700) }, onSend(call) {
    if (!failed && call.method === 'Network.setExtraHTTPHeaders') { failed = true; throw new Error('headers rejected') }
  } })
  await assert.rejects(() => applyBrowserSettings(session, fixture.client, { viewport: { width: 390 }, userAgent: 'after', media: 'print', extraHeaders: { 'X-After': 'after' } }), /headers rejected/)
  assert.deepEqual(session, before)
  assert.deepEqual(fixture.engine, { viewport: metrics(1000, 700), userAgent: '', media: 'screen', extraHeaders: {} })
  assert.equal(fixture.calls.some(row => row.method.includes('clearDeviceMetricsOverride')), false)
})

test('rollback failures are surfaced and do not prevent attempts to restore other writes', async () => {
  const session = { viewport: metrics(768, 1024), userAgent: 'before' }
  let failed = false
  const fixture = cdpFixture({ onSend(call) {
    if (call.method === 'Network.setUserAgentOverride') {
      if (!failed) { failed = true; throw new Error('original apply failure') }
      throw new Error('restore UA failure')
    }
  } })
  await assert.rejects(() => applyBrowserSettings(session, fixture.client, { viewport: { width: 390 }, userAgent: 'after' }), error => {
    assert.equal(error.status, 502)
    assert.equal(error.errorId, 'kitesurf.engine.connect')
    assert.match(error.message, /original apply failure.*rollback failed.*restore UA failure/)
    assert.equal(error.rollbackErrors.length, 1)
    return true
  })
  assert.deepEqual(fixture.engine.viewport, session.viewport, 'viewport rollback still runs after UA rollback fails')
  assert.deepEqual(session, { viewport: metrics(768, 1024), userAgent: 'before' })
})

test('fit failure rolls back metrics and never stores a failed fit', async () => {
  const session = { lastFit: { width: 1000, height: 700 } }
  let failed = false
  const fixture = cdpFixture({ state: { viewport: metrics(1000, 700) }, onSend() {
    if (!failed) { failed = true; throw new Error('fit failed') }
  } })
  await assert.rejects(() => applyViewport(session, fixture.client, { width: 1600, height: 1000 }, 'owner'), /fit failed/)
  assert.deepEqual(session, { lastFit: { width: 1000, height: 700 } })
  assert.deepEqual(fixture.engine.viewport, metrics(1000, 700))
})

test('replay sends fixed or automatic settings on the caller-owned page and propagates errors', async () => {
  const session = { viewport: metrics(390, 900, 3, true), userAgent: 'agent', media: 'print', extraHeaders: { 'X-Device': 'phone' } }
  const fixture = cdpFixture()
  assert.deepEqual(await applyBrowserSettingsToPage(session, fixture.client, 'owner'), browserSettings(session))
  assert.deepEqual(fixture.engine, browserSettings(session))
  assert.equal(fixture.calls.some(row => row.method.startsWith('Target.')), false)
  const automatic = cdpFixture()
  await applyBrowserSettingsToPage({ lastFit: { width: 1000, height: 700 } }, automatic.client)
  assert.deepEqual(automatic.engine, { viewport: metrics(1000, 700), userAgent: '', media: 'screen', extraHeaders: {} })
  const failed = cdpFixture({ onSend() { throw new Error('replay failed') } })
  await assert.rejects(() => applyBrowserSettingsToPage(session, failed.client, 'owner'), /replay failed/)
})

test('concurrent patches and fits serialize on this session without precommitting or capturing stale height', async () => {
  const session = {}
  let release
  let entered
  const gate = new Promise(resolve => { release = resolve })
  const started = new Promise(resolve => { entered = resolve })
  let first = true
  const fixture = cdpFixture({ onSend: async () => {
    if (first) { first = false; entered(); await gate }
  } })
  const a = applyBrowserSettings(session, fixture.client, { viewport: { width: 768, height: 1024 } })
  await started
  const b = applyBrowserSettings(session, fixture.client, { viewport: { width: 390 } })
  const c = applyViewport(session, fixture.client, { width: 1600, height: 1000 }, 'owner')
  assert.deepEqual(session, {})
  assert.equal(writes(fixture).length, 1)
  release()
  await Promise.all([a, b, c])
  assert.deepEqual(session, { viewport: metrics(390, 1024), lastFit: { width: 1600, height: 1000 } })
  assert.deepEqual(fixture.engine.viewport, session.viewport)
})

test('a rejected transaction does not poison the per-session queue or another session', async () => {
  const session = {}
  let failed = false
  const fixture = cdpFixture({ onSend(call) {
    if (!failed && call.method === 'Network.setUserAgentOverride') { failed = true; throw new Error('first failed') }
  } })
  const a = applyBrowserSettings(session, fixture.client, { userAgent: 'failed' })
  const b = applyBrowserSettings(session, fixture.client, { userAgent: 'succeeded' })
  await assert.rejects(() => a, /first failed/)
  await b
  assert.equal(session.userAgent, 'succeeded')
  const independent = {}
  const other = cdpFixture()
  await applyBrowserSettings(independent, other.client, { viewport: { width: 1280 } })
  assert.equal(independent.viewport.width, 1280)
  assert.equal(session.viewport, undefined)
})

test('missing page propagates an existing driver error; empty patch and reads have no engine side effects', async () => {
  const session = { viewport: metrics(390, 900) }
  const fixture = cdpFixture({ page: false })
  await assert.rejects(() => applyBrowserSettings(session, fixture.client, { userAgent: 'not committed' }), error => error.errorId === 'kitesurf.elements.empty')
  assert.equal(session.userAgent, undefined)
  assert.equal(writes(fixture).length, 0)
  const calls = fixture.calls.length
  assert.deepEqual(await applyBrowserSettings(session, fixture.client, {}), browserSettings(session))
  assert.equal(fixture.calls.length, calls)
  const projection = browserSettings(session)
  projection.viewport.width = 2000
  assert.equal(session.viewport.width, 390)
})
