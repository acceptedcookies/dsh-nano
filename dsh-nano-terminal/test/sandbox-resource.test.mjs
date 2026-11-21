// sandbox-terminal resource consumer: canonical grammar, verified resolve.
// Hermetic — a recorded fetch answers contract+inspect; no wire, no lane.
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { parseSandboxResource, resolveSandboxResource } from '../src/client/sandbox-resource.js'
import { makeLane, McpLane } from '../src/client/lanes.js'

const ORIGIN = 'https://host.example'
const ENV = 'dev'
const SB = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const TM = '11111111-2222-3333-4444-555555555555'
const ADDR = `dsh-resource://sandbox-terminal/${ENV}/${SB}/${TM}`

const RES = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => body,
})
const CONTRACT = RES(200, { contractVersion: 'dnls.control/1', capabilities: ['sandbox.inspect', 'sandbox.list'] },
  { 'x-dnls-contract': 'dnls.control/1' })
const INSPECT = (over = {}) => RES(200,
  { contractVersion: 'dnls.control/1', sandboxId: SB, envId: ENV, observedState: 'running', ...over },
  { 'x-dnls-contract': 'dnls.control/1' })

function recorder(map) {
  const sent = []
  const impl = async (url, init = {}) => {
    sent.push({ url, init })
    const pathname = new URL(url).pathname
    return (map[pathname] ?? (() => RES(404, { ok: false, error: 'unmapped' })))(url, init)
  }
  return { sent, impl }
}

test('grammar: only the canonical address parses', () => {
  assert.deepEqual(parseSandboxResource(ADDR), { envId: ENV, sandboxId: SB, terminalId: TM })
  const rejected = [
    undefined, null, '', 'dsh-resource://sandbox-terminal/',
    `dsh-resource://sandbox-terminal/${ENV}/${SB}`,                       // missing terminal
    `dsh-resource://sandbox-terminal/${ENV}/${SB}/${TM}/extra`,           // extra segment
    `dsh-resource://sandbox-terminal/${ENV}/../${TM}`,                    // ..
    `dsh-resource://sandbox-terminal/${ENV}/${SB}/${TM}?x=1`,             // query
    `dsh-resource://sandbox-terminal/${ENV}/${SB}/${TM}#frag`,            // fragment
    `dsh-resource://sandbox-terminal/${ENV}/${SB.slice(0, 20)}%2f${TM}`,  // encoded variant
    `dsh-resource://sandbox-terminal/${ENV}/${SB}/${TM}\\`,               // backslash
    `dsh-resource://user@sandbox-terminal/${ENV}/${SB}/${TM}`,            // credentials
    `dsh-resource://sandbox-terminal:443/${ENV}/${SB}/${TM}`,             // explicit port
    `dsh-resource://SANDBOX-TERMINAL/${ENV}/${SB}/${TM}`,                 // host case
    `dsh-resource://sandbox-terminal/Dev/${SB}/${TM}`,                    // env case
    `dsh-resource://sandbox-terminal/${ENV}/${SB.toUpperCase()}/${TM}`,   // non-canonical uuid
    `dsh-resource://sandbox-terminal/${ENV}/${SB}/${'0'.repeat(36)}`,     // non-uuid
    ` http://sandbox-terminal/${ENV}/${SB}/${TM}`,
    'dsh-resource://file/anything',
  ]
  for (const value of rejected) assert.equal(parseSandboxResource(value), null, JSON.stringify(value))
})

test('resolve: contract → targeted inspect → mcp lane coordinates', async () => {
  const { sent, impl } = recorder({
    '/nano-local-sandbox/contract': () => CONTRACT,
    '/nano-local-sandbox/inspect': () => INSPECT(),
  })
  const spec = await resolveSandboxResource(ADDR, impl, ORIGIN)
  assert.deepEqual(spec, {
    lane: 'mcp',
    url: `${ORIGIN}/nano-local-sandbox/mcp`,
    contractVersion: 'dnls.control/1',
    sandboxId: SB,
    terminalId: TM,
  })
  assert.equal(sent.length, 2)
  assert.equal(new URL(sent[0].url).pathname, '/nano-local-sandbox/contract')
  const inspect = new URL(sent[1].url)
  assert.equal(inspect.pathname, '/nano-local-sandbox/inspect')
  assert.equal(inspect.searchParams.get('sandboxId'), SB)
  assert.equal(inspect.origin, ORIGIN)
  assert.equal(sent[1].init.credentials, 'same-origin')
  assert.equal(sent[1].init.headers['x-dnls-contract'], 'dnls.control/1')
})

test('resolve: same-environment mismatch and foreign sandbox fail before any attach', async () => {
  const { sent, impl } = recorder({
    '/nano-local-sandbox/contract': () => CONTRACT,
    '/nano-local-sandbox/inspect': () => INSPECT({ envId: 'prod' }),
  })
  await assert.rejects(() => resolveSandboxResource(ADDR, impl, ORIGIN), /env|environment/i)
  // contract + inspect only — no mcp, no attach, no create
  assert.equal(sent.length, 2)
  assert.ok(sent.every(({ url }) => new URL(url).pathname !== '/nano-local-sandbox/mcp'))

  const wrongObject = recorder({
    '/nano-local-sandbox/contract': () => CONTRACT,
    '/nano-local-sandbox/inspect': () => INSPECT({ sandboxId: 'bbbbbbbb-1111-2222-3333-444444444444' }),
  })
  await assert.rejects(() => resolveSandboxResource(ADDR, wrongObject.impl, ORIGIN), /different sandbox/i)

  const badContract = recorder({
    '/nano-local-sandbox/contract': () => RES(200, { contractVersion: 'dnls.control/9', capabilities: [] },
      { 'x-dnls-contract': 'dnls.control/9' }),
  })
  await assert.rejects(() => resolveSandboxResource(ADDR, badContract.impl, ORIGIN), /contract/i)
  assert.equal(badContract.sent.length, 1)

  const noInspect = recorder({
    '/nano-local-sandbox/contract': () => RES(200,
      { contractVersion: 'dnls.control/1', capabilities: ['sandbox.list'] },
      { 'x-dnls-contract': 'dnls.control/1' }),
  })
  await assert.rejects(() => resolveSandboxResource(ADDR, noInspect.impl, ORIGIN), /sandbox\.inspect/i)
  assert.equal(noInspect.sent.length, 1) // inspect capability missing → zero object reads
})

test('resolve: malformed address issues zero requests', async () => {
  const { sent, impl } = recorder({})
  await assert.rejects(() => resolveSandboxResource('dsh-resource://sandbox-terminal/../x/y', impl, ORIGIN))
  assert.equal(sent.length, 0)
})

test('makeLane: a recovered managed spec rebuilds the endpoint, never a legacy lane', (t) => {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', { value: { origin: ORIGIN }, configurable: true })
  t.after(() => {
    if (had) Object.defineProperty(globalThis, 'location', had)
    else delete globalThis.location
  })
  const spec = { lane: 'mcp', contractVersion: 'dnls.control/1', sandboxId: SB, terminalId: TM }
  const lane = makeLane(spec, { cols: 80, rows: 24, sessionId: 's1' })
  assert.ok(lane instanceof McpLane)
  assert.equal(lane.sandbox.sandboxId, SB)
  assert.equal(lane.sandbox.terminalId, TM)
  assert.equal(lane.url, `${ORIGIN}/nano-local-sandbox/mcp`)
})

test('resource pane loads the wasm core and stylesheet itself', () => {
  // The tab can open while the Nano 终端 view (their usual owner) is unmounted;
  // a TermPane before loadCore() throws "dnt-core not loaded".
  const src = readFileSync(new URL('../src/client/NanoTerm.jsx', import.meta.url), 'utf8')
  const pane = src.slice(src.indexOf('export function SandboxResourcePane'))
  assert.match(pane, /Promise\.all\(\[resolveSandboxResource\([^)]*\), loadCore\(\)\]\)/)
  assert.match(pane, /style\.textContent = STYLE/)
  assert.ok(pane.indexOf('loadCore()') < pane.indexOf('<TermPane'))
})
