// sandbox object reference consumer (DNLS03 T-O-61): canonical grammar,
// contract → targeted inspect verification, and a failed verify that never
// redirects to another object. Hermetic — a recorded fetch never touches
// the wire.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createManagedDesignClient } from '../src/shared/managed-client.js'
import { parseSandboxReference, verifySandboxReference } from '../src/shared/sandbox-reference.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = 'https://host.example'
const ENV = 'dev'
const SB = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const SB_B = 'bbbbbbbb-1111-2222-3333-444444444444'
const ADDR = `dsh-resource://sandbox/${ENV}/${SB}`

const RES = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  clone() { return this },
  json: async () => body,
})
const CONTRACT = (caps = ['sandbox.list', 'sandbox.inspect']) =>
  RES(200, { contractVersion: 'dnls.control/1', capabilities: caps }, { 'x-dnls-contract': 'dnls.control/1' })
const INSPECT = (over = {}) => RES(200,
  { contractVersion: 'dnls.control/1', sandboxId: SB, envId: ENV, name: 'box', observedState: 'running', ...over },
  { 'x-dnls-contract': 'dnls.control/1' })

function recorder(map) {
  const sent = []
  const impl = async (url, init = {}) => {
    sent.push({ url, init })
    const pathname = new URL(url).pathname
    return (map[pathname] ?? (() => RES(404, { ok: false, errorId: 'dnls.object.missing', error: 'unmapped' })))(url, init)
  }
  return { sent, impl }
}
const objectReads = (sent) => sent.filter(({ url }) => new URL(url).pathname !== '/nano-local-sandbox/contract')

test('grammar: only the canonical object reference parses', () => {
  assert.deepEqual(parseSandboxReference(ADDR), { envId: ENV, sandboxId: SB })
  const rejected = [
    undefined, null, '', 'dsh-resource://sandbox', 'dsh-resource://sandbox/',
    `dsh-resource://sandbox/${ENV}`,                                            // missing segment
    `dsh-resource://sandbox/${ENV}/${SB}/extra`,                                // extra segment
    `dsh-resource://sandbox/${ENV}/../${SB}`,
    `dsh-resource://sandbox/${ENV}/${SB}?token=abc`,                            // credential material
    `dsh-resource://sandbox/${ENV}/${SB}?sessionId=s1`,                         // session material
    `dsh-resource://sandbox/${ENV}/${SB}#frag`,
    `dsh-resource://sandbox/${ENV}/http:%2f%2f127.0.0.1:8800`,                  // encoded URL
    `dsh-resource://sandbox/${ENV}/${encodeURIComponent('http://127.0.0.1')}`,
    `dsh-resource://sandbox/${ENV}/${SB}\\`,
    `dsh-resource://user@sandbox/${ENV}/${SB}`,                                 // credentials
    `dsh-resource://sandbox:443/${ENV}/${SB}`,                                  // explicit port
    `dsh-resource://SANDBOX/${ENV}/${SB}`,                                      // type case
    `dsh-resource://sandbox/Dev/${SB}`,                                         // env case
    `dsh-resource://sandbox/${ENV}/${SB.toUpperCase()}`,                        // non-canonical uuid
    `dsh-resource://sandbox/${ENV}/${'0'.repeat(36)}`,                          // non-uuid
    `dsh-resource://sandbox-terminal/${ENV}/${SB}/${SB}`,                       // sibling type
    'dsh-resource://file/anything',
    ` http://sandbox/${ENV}/${SB}`,
  ]
  for (const value of rejected) assert.equal(parseSandboxReference(value), null, JSON.stringify(value))
})

test('verify: contract first, then one targeted inspect — nothing else', async () => {
  const { sent, impl } = recorder({
    '/nano-local-sandbox/contract': () => CONTRACT(),
    '/nano-local-sandbox/inspect': () => INSPECT(),
  })
  const verified = await verifySandboxReference(ADDR, impl, ORIGIN, { createManagedDesignClient })
  assert.equal(verified.sandboxId, SB)
  assert.equal(verified.envId, ENV)
  assert.equal(verified.name, 'box')
  assert.equal(sent.length, 2)
  assert.equal(new URL(sent[0].url).pathname, '/nano-local-sandbox/contract')
  const inspect = new URL(sent[1].url)
  assert.equal(inspect.pathname, '/nano-local-sandbox/inspect')
  assert.equal(inspect.searchParams.get('sandboxId'), SB)
  assert.equal(inspect.origin, ORIGIN)
  assert.equal(sent[1].init.credentials, 'same-origin')
  // The verified client is already bound: object reads ride the contract.
  const again = await verified.client.bind(SB)('/nano-local-sandbox/inspect')
  assert.equal(again.ok, true)
  assert.equal(new URL(sent[2].url).searchParams.get('sandboxId'), SB)
})

test('verify failure never retargets: contract mismatch sends zero object requests', async () => {
  const { sent, impl } = recorder({
    '/nano-local-sandbox/contract': () =>
      RES(200, { contractVersion: 'dnls.control/9', capabilities: [] }, { 'x-dnls-contract': 'dnls.control/9' }),
    '/nano-local-sandbox/inspect': () => INSPECT({ sandboxId: SB_B }),
  })
  await assert.rejects(() => verifySandboxReference(ADDR, impl, ORIGIN, { createManagedDesignClient }), /contract/i)
  assert.equal(sent.length, 1, 'only the contract request ran')
  assert.deepEqual(objectReads(sent), [], 'no inspect, no other object was touched')
})

test('verify failure never retargets: missing inspect capability sends zero object requests', async () => {
  const { sent, impl } = recorder({
    '/nano-local-sandbox/contract': () => CONTRACT(['sandbox.list']),
    '/nano-local-sandbox/inspect': () => INSPECT({ sandboxId: SB_B }),
  })
  await assert.rejects(() => verifySandboxReference(ADDR, impl, ORIGIN, { createManagedDesignClient }), /not announced/i)
  assert.deepEqual(objectReads(sent), [], 'capability refused locally — no second object was queried')
})

test('verify failure never retargets: inspect failure is shown, not redirected', async () => {
  const { sent, impl } = recorder({
    '/nano-local-sandbox/contract': () => CONTRACT(),
    '/nano-local-sandbox/inspect': () =>
      RES(404, { ok: false, errorId: 'dnls.object.missing', error: 'no such sandbox' }),
  })
  const cause = await verifySandboxReference(ADDR, impl, ORIGIN, { createManagedDesignClient }).then(
    () => { throw new Error('must reject') },
    (error) => error)
  assert.equal(cause.errorId, 'dnls.object.missing')
  assert.match(cause.message, /no such sandbox/)
  assert.equal(objectReads(sent).length, 1, 'exactly one object request — the referenced one')
  assert.equal(new URL(objectReads(sent)[0].url).searchParams.get('sandboxId'), SB)
})

test('verify failure never retargets: a different env in the answer is refused', async () => {
  const { sent, impl } = recorder({
    '/nano-local-sandbox/contract': () => CONTRACT(),
    '/nano-local-sandbox/inspect': () => INSPECT({ envId: 'prod' }),
  })
  await assert.rejects(() => verifySandboxReference(ADDR, impl, ORIGIN, { createManagedDesignClient }), /env|environment/i)
  assert.equal(objectReads(sent).length, 1)
  assert.equal(new URL(objectReads(sent)[0].url).searchParams.get('sandboxId'), SB)
})

test('verify: a malformed address issues zero requests', async () => {
  const { sent, impl } = recorder({})
  for (const bad of [undefined, '', 'dsh-resource://sandbox/../x', `dsh-resource://sandbox/${ENV}`]) {
    await assert.rejects(() => verifySandboxReference(bad, impl, ORIGIN, { createManagedDesignClient }), /canonical|address/i)
  }
  assert.equal(sent.length, 0)
})

test('the dnk-sandbox tab claims the resource and the empty selector stays', () => {
  const source = readFileSync(join(root, 'lib', 'client.js'), 'utf8')
  const loaded = []
  const window = { __ModuleLoader__: { load: (spec) => loaded.push(spec) } }
  new Function('window', source)(window)
  assert.equal(loaded.length, 1)
  assert.equal(loaded[0].id, 'dsh-nano-kitesurf')
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    Fragment: Symbol('fragment'),
    createContext: (value) => ({ $$context: true, defaultValue: value }),
    useContext: (ctx) => ctx?.defaultValue,
    useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: () => {},
    useLayoutEffect: () => {},
    useRef: (value) => ({ current: value }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useId: () => 'id',
  }
  react.default = react
  const modules = {
    react,
    'react-dom': {},
    'react-dom/client': {},
    '@deepseek-ai/dsh-client-ui-primitives': { Button: 'Button' },
  }
  const client = loaded[0].factory((name) => {
    assert.ok(name in modules, `unexpected external require ${name}`)
    return modules[name]
  })

  const appended = []
  const hadDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  globalThis.document = {
    createElement: () => ({ dataset: {}, textContent: '', remove() {} }),
    head: { append: (node) => appended.push(node) },
  }
  try {
    const effects = []
    const tabSpecs = []
    const slotKeys = []
    const ctx = {
      locale: { getSnapshot: () => ({ active: 'en' }) },
      theme: {},
      on: () => () => {},
      effect: (fn) => { const dispose = fn(); effects.push(dispose) },
      sidebarRightTabs: { register: (spec) => { tabSpecs.push(spec); return () => {} } },
      slots: {
        inject: (name, register) => { const d = register(); return d },
        register: (spec, component) => { slotKeys.push(spec.key); return () => {} },
      },
    }
    client.apply(ctx)
    const emptySelector = tabSpecs.find((spec) => spec.id === 'nano-kitesurf')
    assert.ok(emptySelector, 'the original kitesurf tab type stays registered')
    assert.equal(emptySelector.patterns, undefined, 'the empty selector claims no resource pattern')
    const resource = tabSpecs.find((spec) => spec.id === 'dnk-sandbox')
    assert.ok(resource, 'the sandbox resource claim is registered')
    assert.equal(resource.kind, 'dnk-sandbox')
    assert.deepEqual(resource.patterns, ['dsh-resource://sandbox/**'])
    assert.equal(typeof resource.canOpen, 'function')
    assert.equal(resource.canOpen(ADDR), true)
    assert.equal(resource.canOpen(`dsh-resource://sandbox/${ENV}`), false)
    assert.equal(resource.canOpen('dsh-resource://sandbox-terminal/dev/x/y'), false)
    assert.equal(typeof resource.title, 'function')
    assert.match(resource.title(ADDR), /aaaaaaaa/)
    assert.equal(slotKeys.filter((key) => key === 'dnk-sandbox').length, 2, 'pane body + title slots')
    for (const dispose of effects) assert.doesNotThrow(() => dispose?.())
  } finally {
    if (hadDocument) Object.defineProperty(globalThis, 'document', hadDocument)
    else delete globalThis.document
  }
})

test('the pane reads navigation.address and verifies before selecting', () => {
  const index = readFileSync(join(root, 'src', 'client', 'index.js'), 'utf8')
  assert.match(index, /useTabInfo\?\.\(\)\.tab\?\.navigation\?\.address/)
  assert.match(index, /patterns:\s*\['dsh-resource:\/\/sandbox\/\*\*'\]/)
  assert.match(index, /canOpen:\s*\(address\)\s*=>\s*parseSandboxReference\(address\)\s*!==\s*null/)
  assert.match(index, /verifySandboxReference\(address/)
  // The verified object is selected through the same bound-fetch path a
  // manual choice uses; nothing else can be reached from the failure branch.
  assert.match(index, /selectWith\(verified\.client,\s*verified\.sandboxId\)/)
})
