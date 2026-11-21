import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { terminalAddress, terminalGesture, sandboxAddress, parseSandboxAddress, openResourceAddress } from '../src/host/terminal-resource.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('T71: retrying host navigation reuses the one created terminal', async () => {
  const intent = { envId: 'dev', sandboxId: randomUUID(), terminalId: randomUUID(), paneId: randomUUID(), openId: randomUUID() }
  const calls = [], visits = []
  let handler = false
  const gesture = terminalGesture(intent, {
    canOpen: () => handler,
    create: args => { calls.push(args); handler = false; return { sandboxId: intent.sandboxId, terminalId: intent.terminalId } },
    navigate(address) { visits.push(address) },
  })
  assert.deepEqual(await gesture.open(), { state: 'handler-unavailable' })
  assert.equal(calls.length, 0)
  handler = true
  const address = `dsh-resource://sandbox-terminal/dev/${intent.sandboxId}/${intent.terminalId}`
  assert.deepEqual(await gesture.open(), { state: 'created-not-connected', address })
  handler = true
  assert.deepEqual(await gesture.open(), { state: 'navigation-requested', address })
  assert.deepEqual(calls, [{ sandboxId: intent.sandboxId, paneId: intent.paneId, openId: intent.openId }])
  assert.deepEqual(visits, [address])
  for (const field of ['sandboxId', 'terminalId', 'envId']) {
    for (const bad of ['', 'a/b', 'x?token=bad', '../x']) assert.throws(() => terminalAddress({ ...intent, [field]: bad }))
  }
})

// T-O-61: the sandbox object reference shares the terminal address's env/uuid
// grammar and encodes nothing else — construction of an invalid id throws.
test('sandbox object address: canonical ids construct, everything else throws', () => {
  const envId = 'dev'
  const sandboxId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
  const address = sandboxAddress({ envId, sandboxId })
  assert.equal(address, `dsh-resource://sandbox/${envId}/${sandboxId}`)
  assert.deepEqual(parseSandboxAddress(address), { envId, sandboxId })

  const badEnv = ['', 'DEV', 'dev_1', 'a'.repeat(17), '1dev', '../x', 'env space', 'dev/token', 'dev?token=x']
  const badSandbox = ['', 'not-a-uuid', sandboxId.toUpperCase(), sandboxId.slice(0, -1),
    `${sandboxId}x`, '0'.repeat(36), sandboxId.replace(/-/g, ''), `${sandboxId}?token=x`, `${sandboxId}/extra`]
  for (const env of badEnv) assert.throws(() => sandboxAddress({ envId: env, sandboxId }), TypeError)
  for (const id of badSandbox) assert.throws(() => sandboxAddress({ envId, sandboxId: id }), TypeError)
  assert.throws(() => sandboxAddress({ envId: undefined, sandboxId }), TypeError)
  assert.throws(() => sandboxAddress({ envId, sandboxId: undefined }), TypeError)
  assert.throws(() => sandboxAddress({ envId: null, sandboxId: 42 }), TypeError)
  assert.throws(() => sandboxAddress({}), TypeError)
})

test('sandbox object address: non-canonical strings never parse', () => {
  const envId = 'dev'
  const sandboxId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
  const rejected = [
    undefined, null, '', 'dsh-resource://sandbox/', 'dsh-resource://sandbox',
    `dsh-resource://sandbox/${envId}`,                                           // missing segment
    `dsh-resource://sandbox/${envId}/${sandboxId}/extra`,                       // extra segment
    `dsh-resource://sandbox/${envId}/${sandboxId}/`,                            // trailing empty segment
    `dsh-resource://sandbox/${envId}/${sandboxId}?token=abc`,                    // credential material
    `dsh-resource://sandbox/${envId}/${sandboxId}?sessionId=s1`,                 // session material
    `dsh-resource://sandbox/${envId}/${sandboxId}#frag`,
    `dsh-resource://sandbox/${envId}/${encodeURIComponent('http://127.0.0.1:8800')}`, // embedded URL
    `dsh-resource://sandbox/${envId}/http:%2f%2f127.0.0.1:8800`,                 // encoded URL segment
    `dsh-resource://sandbox/Prod/${sandboxId}`,                                  // env case
    `dsh-resource://sandbox/${envId}/${sandboxId.toUpperCase()}`,                // uuid case
    `dsh-resource://sandbox/${envId}/../${sandboxId}`,
    `dsh-resource://SANDBOX/${envId}/${sandboxId}`,                              // type case
    `dsh-resource://sandbox-terminal/${envId}/${sandboxId}/11111111-2222-4333-8444-555555555555`, // sibling type
    `dsh-resource://file/${envId}/${sandboxId}`,
    ` http://sandbox/${envId}/${sandboxId}`,
    `dsh-resource://user@sandbox/${envId}/${sandboxId}`,
    `dsh-resource://sandbox:443/${envId}/${sandboxId}`,
    `dsh-resource://sandbox//${envId}/${sandboxId}`,
    `dsh-resource://sandbox/${envId}/${sandboxId}\\`,
  ]
  for (const value of rejected) assert.equal(parseSandboxAddress(value), null, JSON.stringify(value))
})

// candidates() is the only selector: zero handlers refuse, one or many hand
// the address to openResource untouched — this plugin never picks a kind.
test('openResourceAddress: zero candidates never hands off', () => {
  const calls = []
  const opened = openResourceAddress({
    candidates: () => [],
    openResource: (address) => { calls.push(address) },
    address: 'dsh-resource://sandbox/dev/11111111-2222-4333-8444-555555555555',
  })
  assert.equal(opened, false)
  assert.deepEqual(calls, [])
})

test('openResourceAddress: one candidate hands the untouched address over', () => {
  const calls = []
  const address = 'dsh-resource://sandbox/dev/11111111-2222-4333-8444-555555555555'
  const opened = openResourceAddress({
    candidates: (value) => { assert.equal(value, address); return [{ kind: 'any-handler' }] },
    openResource: (value) => calls.push(value),
    address,
  })
  assert.equal(opened, true)
  assert.deepEqual(calls, [address])
})

test('openResourceAddress: multiple candidates are the host\'s choice, not ours', () => {
  const calls = []
  const address = 'dsh-resource://sandbox/dev/11111111-2222-4333-8444-555555555555'
  const handlers = [{ kind: 'handler-a' }, { kind: 'handler-b' }, { kind: 'handler-c' }]
  const opened = openResourceAddress({
    candidates: () => handlers.slice(),
    openResource: (value) => calls.push(value),
    address,
  })
  assert.equal(opened, true)
  assert.deepEqual(calls, [address], 'the address goes to the host exactly once, unmodified')
  assert.deepEqual(handlers, [{ kind: 'handler-a' }, { kind: 'handler-b' }, { kind: 'handler-c' }],
    'candidate order is never inspected or reordered by this plugin')
})

test('openResourceAddress: a host refusal is reported, not retried', () => {
  const calls = []
  const opened = openResourceAddress({
    candidates: () => [{ kind: 'any-handler' }],
    openResource: (value) => { calls.push(value); return false },
    address: 'dsh-resource://sandbox/dev/11111111-2222-4333-8444-555555555555',
  })
  assert.equal(opened, false)
  assert.equal(calls.length, 1)
  assert.equal(openResourceAddress({ candidates: () => [{ kind: 'x' }], address: 'a' }), false, 'no openResource → refused')
  assert.equal(openResourceAddress({ openResource: () => {}, address: 'a' }), false, 'no candidates → refused')
})

test('the client lost every private entry — source scan is empty', () => {
  const dir = join(root, 'src', 'client')
  const files = []
  const walk = (path) => {
    for (const name of readdirSync(path)) {
      const file = join(path, name)
      if (statSync(file).isDirectory()) walk(file)
      else if (/\.(jsx?|mjs)$/.test(name)) files.push(file)
    }
  }
  walk(dir)
  assert.ok(files.length >= 3, `expected the client author tree, walked ${files.length}`)
  const forbidden = [
    /openKitesurf/,
    /\bkitesurf\s*\(\s*\)/,
    /'dnt-sandbox-terminal'/,
    /"dnt-sandbox-terminal"/,
    /workspaceMissing/,
    /openWorkspaceHint/,
  ]
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const pattern of forbidden) {
      assert.equal(pattern.test(text), false, `${pattern} still present in ${file}`)
    }
  }
  // The handoff keeps its shape: candidates then openResource, and the plugin
  // never reads a candidate's kind (lifecycle `confirm.kind` is unrelated).
  const index = readFileSync(join(dir, 'index.jsx'), 'utf8')
  assert.match(index, /candidates/)
  assert.match(index, /openResourceAddress/)
  assert.doesNotMatch(index, /candidates(?:[^)]*)\)[^;]*\.kind/)
  assert.doesNotMatch(index, /candidate\w*\??\.\s*kind/)
  // The published bundle was rebuilt from the same sources.
  const bundle = readFileSync(join(root, 'lib', 'client.js'), 'utf8')
  for (const pattern of forbidden) {
    assert.equal(pattern.test(bundle), false, `${pattern} still present in lib/client.js`)
  }
})
