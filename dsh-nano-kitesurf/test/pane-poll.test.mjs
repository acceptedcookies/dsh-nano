// T-O-67 hidden-stops polling: the single gate every ambient pane loop
// rides. A hidden tab schedules nothing and loads nothing; regaining
// visibility re-arms and the immediate pass is exactly one refresh; the
// browser-wide document back-off keeps its own cadence unchanged.
import assert from 'node:assert/strict'
import test from 'node:test'
import { armPanePoll } from '../src/shared/pane-poll.js'

function fakeWindow() {
  const timers = []
  return {
    timers,
    window: {
      setInterval(fn, ms) { const t = { fn, ms, cleared: false }; timers.push(t); return t },
      clearInterval(t) { if (t) t.cleared = true },
      setTimeout(fn, ms) { const t = { fn, ms, cleared: false }; timers.push(t); return t },
      clearTimeout(t) { if (t) t.cleared = true },
    },
    fireAll() { for (const t of timers.filter((t) => !t.cleared)) t.fn() },
    live() { return timers.filter((t) => !t.cleared) },
  }
}

function fakeDocument(visibilityState = 'visible') {
  const listeners = new Map()
  return {
    visibilityState,
    addEventListener(name, fn) { listeners.set(name, [...(listeners.get(name) ?? []), fn]) },
    removeEventListener(name, fn) { listeners.set(name, (listeners.get(name) ?? []).filter((f) => f !== fn)) },
    fire(name) { for (const fn of listeners.get(name) ?? []) fn() },
    listenerCount(name) { return (listeners.get(name) ?? []).length },
  }
}

test('hidden tab: nothing loads, nothing schedules — not even the back-off', () => {
  const { window, timers } = fakeWindow()
  const document = fakeDocument()
  let loads = 0
  const disarm = armPanePoll(() => { loads += 1 }, {
    periodMs: 1500, hiddenPeriodMs: 12000, immediate: true,
    isVisible: () => false, window, document,
  })
  assert.equal(loads, 0, 'no immediate refresh while hidden')
  assert.equal(timers.length, 0, 'no timer is ever armed')
  assert.equal(document.listenerCount('visibilitychange'), 0, 'no document listener leaks')
  disarm()
})

test('visible tab: immediate refresh once, then the declared cadence', () => {
  const { window, fireAll, live } = fakeWindow()
  const document = fakeDocument()
  let loads = 0
  let visible = true
  const disarm = armPanePoll(() => { loads += 1 }, {
    periodMs: 1500, hiddenPeriodMs: 12000, immediate: true,
    isVisible: () => visible, window, document,
  })
  assert.equal(loads, 1, 'the immediate pass is exactly one refresh')
  fireAll()
  assert.equal(loads, 2)
  // Ticks issued while the flag went false never fire a request.
  visible = false
  fireAll()
  assert.equal(loads, 2, 'a tick under a false flag is vetoed')
  disarm()
  assert.equal(live().length, 0)
  assert.equal(document.listenerCount('visibilitychange'), 0)
})

test('shouldTick vetoes interval ticks but never the regain refresh', () => {
  const { window, fireAll } = fakeWindow()
  const document = fakeDocument()
  let loads = 0
  let allow = false
  const disarm = armPanePoll(() => { loads += 1 }, {
    periodMs: 3000, immediate: true,
    shouldTick: () => allow,
    isVisible: () => true, window, document,
  })
  assert.equal(loads, 1, 'immediate refresh is deliberate — shouldTick cannot veto it')
  fireAll()
  assert.equal(loads, 1, 'vetoed ticks stay silent')
  allow = true
  fireAll()
  assert.equal(loads, 2)
  disarm()
})

test('browser-hidden keeps its own slowed cadence, unchanged by the tab gate', () => {
  const { window, timers, fireAll } = fakeWindow()
  const document = fakeDocument('hidden')
  const onVis = []
  let loads = 0
  const disarm = armPanePoll(() => { loads += 1 }, {
    periodMs: 1500, hiddenPeriodMs: 12000, immediate: true,
    isVisible: () => true, window, document,
  })
  assert.equal(loads, 1)
  assert.equal(document.listenerCount('visibilitychange'), 1)
  assert.equal(timers.at(-1).ms, 12000, 'document-hidden backs off to the slow period')
  document.visibilityState = 'visible'
  document.fire('visibilitychange')
  assert.equal(timers.at(-1).ms, 1500, 're-arms at the fast period')
  assert.equal(loads, 2, 'document regain-visible refreshes once, as before')
  fireAll()
  assert.equal(loads, 3)
  disarm()
  assert.equal(document.listenerCount('visibilitychange'), 0)
  void onVis
})

test('disarm cancels the interval and drops the document listener', () => {
  const { window, live, fireAll } = fakeWindow()
  const document = fakeDocument()
  let loads = 0
  const disarm = armPanePoll(() => { loads += 1 }, {
    periodMs: 1500, hiddenPeriodMs: 12000, immediate: false,
    isVisible: () => true, window, document,
  })
  assert.equal(live().length, 1)
  disarm()
  assert.equal(live().length, 0)
  fireAll()
  assert.equal(loads, 0)
})

test('the pane wires every ambient loop through this gate', () => {
  // Structural pin lives in sandbox-reference.test.mjs (T-O-67 wiring
  // assertions); this file proves the gate itself.
})
