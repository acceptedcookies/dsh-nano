import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const pkg = new URL('../../', import.meta.url)
const read = path => readFileSync(new URL(path, pkg), 'utf8')
const h = 'src/host/'
const reg = h + 'instance-registry.js', term = h + 'term-bridge.js', routes = h + 'routes.js'
const backend = h + 'backend-apple.js', tests = 'test/'
const anchors = [
  [reg, 'const instances = new Map()'],
  [reg, 'row.profileId === profile.id && row.sessionId === tuple.sessionId'],
  [reg, 'instances.size >= profile.lifecycle.maxInstances'],
  [reg, 'await backend.stop(instance.containerName)', 'instances.delete(instance.instanceId)'],
  [h + 'profile-drivers.js', 'export function stateRootFor'],
  [term, 'One active PTY per dsh sessionId', 'const active = new Map()'],
  [term, 'active.get(sessionId)', "attach: { protocol: 'dnt-ws-v1', url: existing.url }"],
  [term, 'listTermSessions()', "attach: { protocol: 'dnt-ws-v1', url: row.url }"],
  ['profiles/terminal/pty-entry.mjs', "export const PTY_ENTRY = 'profiles/terminal/pty-entry.mjs'"],
  [backend, "['stats', '--no-stream', '--format', 'json', name]"],
  [backend, "['container', 'exec', '-it', String(containerName), '/bin/sh']"],
  [routes, 'function bridgeControlBase(session)', 'const port = portNum + 1'],
  [routes, 'const engineRow = info?.ports?.find', 'const bridgeRow = info?.ports?.find', 'bridgeControlBase({ httpBase })'],
  [routes, "res.destroyed) op.status = 'cancelled'"],
  [h + 'error-catalog.js', 'let activeNamespace', 'activeNamespace = namespace'],
  [h + 'mcp-sandbox.js', 'inputSchema: TOOL_DEFS[name].schema', 'const def = TOOL_DEFS[name]'],
  ['lib/bindings.js', '"id":"dnls.control"', '"path":"/nano-local-sandbox/control"'],
  ['src/perf/declaration.json', '"dnls.control"'],
  ['package.json', '"main": "./index.js"'],
  ['profiles/kitesurf/profile.yaml', 'scope: session', '- id: engine', '- id: mcp-bridge', 'idleTimeoutMs:', 'maxInstances: 2'],
  [h + 'observe.js', 'export function projectSnapshot'],
  [h + 'terminal-driver.js', 'export const TERM_TOOL_NAMES', "'term.session.create'"],
  [null, 'admit(request: ConnectionTrustRequest): PeerAdmission'],
  [tests + 'lifecycle.spike.test.mjs', 'assert.equal(registry.instances.has(created.instance.instanceId), false)'],
  [tests + 'term-bridge.test.mjs', "decoded.data.attach.protocol, 'dnt-ws-v1'", "forged.searchParams.delete('token')", 'assert.equal(refusedOpen, false', 'assert.equal(first.data.attach.url, second.data.attach.url)'],
  [tests + 'terminal-contract.test.mjs', "created.attach.protocol, 'dnt-ws-v1'", 'assert.equal(created.attach.url,'],
  [tests + 'instances-ensure.test.mjs', 'assert.equal(a.data.containerName, b.data.containerName)', 'assert.notEqual(a.data.instanceId, b.data.instanceId)'],
]
for (const [index, [path, ...terms]] of anchors.entries()) {
  test(`DNLS03-T00 A-${index + 1}`, () => {
    const source = path ? read(path) : readFileSync(resolve(process.env.DNLS_MEASURE_HOST_PIN, 'packages/client/connection/src/rpc.ts'), 'utf8')
    for (const term of terms) assert.ok(source.includes(term), `${path ?? 'host pin'}: ${term}`)
    if (index === 8) assert.equal(source.trim().split('\n').filter(line => !line.startsWith('/**')).length, 1)
    if (index === 18) {
      const manifest = JSON.parse(source)
      assert.equal(manifest.exports['./client'], undefined)
      assert.equal(manifest.dsh.client, undefined)
    }
  })
}
