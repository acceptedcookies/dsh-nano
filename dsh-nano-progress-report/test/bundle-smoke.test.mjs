/**
 * The client bundle must load, not just pass a source check. Regression guard
 * for the missing-import class of failure. Requires `npm run build` first.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import vm from 'node:vm'

const root = join(dirname(import.meta.url.replace('file://', '')), '..')

test('lib/client.js loads in a stubbed module loader and exports a factory', () => {
  const code = readFileSync(join(root, 'lib', 'client.js'), 'utf8')
  const loaded = []
  const sandbox = {
    window: { __ModuleLoader__: { load: mod => loaded.push(mod) } },
    document: {
      querySelectorAll: () => [], querySelector: () => null,
      addEventListener: () => {}, removeEventListener: () => {},
      createElement: () => ({ dataset: {}, style: {}, remove: () => {} }),
      head: { append: () => {} },
    },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    navigator: { userAgent: 'Chrome/143' },
    console, setTimeout, clearTimeout, setInterval, clearInterval, performance,
  }
  sandbox.window.document = sandbox.document
  sandbox.window.localStorage = sandbox.localStorage
  vm.createContext(sandbox)
  vm.runInContext(code, sandbox)
  assert.equal(loaded.length, 1)
  assert.equal(loaded[0].id, 'dsh-nano-progress-report')
  assert.equal(typeof loaded[0].factory, 'function')
  const react = {
    createContext: () => ({ Provider: null, Consumer: null }),
    createElement: () => null,
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: () => {}, useMemo: fn => fn(), useRef: v => ({ current: v }),
    Fragment: Symbol.for('react.fragment'),
  }
  const primitives = new Proxy({}, { get: () => () => null })
  const exports = loaded[0].factory(id => (id === 'react' ? react : primitives))
  assert.equal(typeof exports, 'object')
  assert.equal(typeof exports.apply, 'function')
  assert.deepEqual([...exports.inject].sort(),
    ['jobs', 'locale', 'sessions', 'sidebarRight', 'sidebarRightTabs', 'slots', 'uiConversation', 'uiSession'])

  // apply() against a recording fake ctx — catches a misspelled seam name
  // before boot, not only in the live GUI.
  const calls = { effects: [], registeredTabs: [], injects: [], registerOpts: [], viewTargets: [], eventDefs: 0 }
  const fakeCtx = {
    locale: { getSnapshot: () => ({ active: 'en' }) },
    effect: (fn) => { calls.effects.push(typeof fn === 'function' ? fn() : fn) },
    slots: {
      inject: (seat, cb) => { calls.injects.push(seat); cb() },
      register: (opts, component) => { calls.registerOpts.push({ opts, hasComponent: typeof component === 'function' }); return () => {} },
    },
    sidebarRightTabs: { register: (def) => { calls.registeredTabs.push(def); return () => {} } },
    uiConversation: {
      events: { register: () => { calls.eventDefs += 1; return () => {} } },
      views: { register: (def) => { calls.viewTargets.push(def); return () => {} } },
    },
  }
  exports.apply(fakeCtx)
  assert.ok(calls.registeredTabs.some(d => d.kind === 'progress'), 'apply must register the progress tab kind')
  assert.ok(calls.injects.includes('sidebar.right.pane.tab'), 'apply must inject the pane tab seat')
  assert.ok(calls.injects.includes('sidebar.right.tab.menu.item'), 'apply must inject the tab menu seat')
  assert.ok(calls.viewTargets.some(d => d.target === 'progress'), 'apply must register the progress view target')

  // Mount contract: pane-tab register key must equal the tab registration id;
  // menu seat is a list slot (id+order); view create() returns a real builder.
  const tabDef = calls.registeredTabs.find(d => d.kind === 'progress')
  const paneReg = calls.registerOpts.find(o => o?.opts?.name === 'sidebar.right.pane.tab')
  const menuReg = calls.registerOpts.find(o => o?.opts?.name === 'sidebar.right.tab.menu.item')
  assert.equal(paneReg?.opts?.key, tabDef?.id, 'pane-tab key must match registered tab id')
  assert.equal(paneReg?.hasComponent, true, 'pane-tab seat must receive the body component')
  assert.equal(menuReg?.hasComponent, true, 'menu seat must receive the item component')
  assert.equal(typeof menuReg?.opts?.id, 'string')
  assert.equal(typeof menuReg?.opts?.order, 'number')
  assert.ok((tabDef?.guide?.length ?? 0) >= 1, 'guide entry required for + menu discovery')
  const builder = calls.viewTargets.find(d => d.target === 'progress')?.create?.()
  for (const method of ['empty', 'replace', 'apply']) {
    assert.ok(method === 'empty' ? builder?.[method] !== undefined : typeof builder?.[method] === 'function',
      `view create() must produce a builder with ${method}`)
  }
  assert.equal(calls.eventDefs, 10, 'all 10 event definitions must register')
})

test('lib/client.js keeps host externals external (spec §7.1)', () => {
  const code = readFileSync(join(root, 'lib', 'client.js'), 'utf8')
  // esbuild externalizes to te("<id>") calls routed through the loader's
  // require — the literal module id must appear, not bundled source.
  for (const external of ['react', '@deepseek-ai/dsh-client-ui-primitives']) {
    // The loader shim is minified (helper name changes per build), so assert the
    // module id is passed to a require call — not that a specific name survived.
    assert.ok(code.includes(`("${external}")`),
      `bundle must require external ${external} — it must not be bundled`)
  }
  assert.ok(!code.includes('react.element'), 'React runtime must not be bundled')
  assert.match(code, /__ModuleLoader__\.load\(/)
  assert.match(code, /__nprExport/)
  // The official chrome must survive into the artifact: these property names
  // are not mangled, so their absence means the row/task chrome was replaced.
  for (const primitive of ['DisclosureRow', 'AnimatedRows', 'StateDot', 'Menu', 'IconSearchOutlineRegular', 'IconCheckCircleFillRegular', 'relativeTime']) {
    assert.ok(code.includes(primitive), `bundle does not use host primitive ${primitive}`)
  }
})
