// createMcpToolset + decodeMcpReply (CF1115 / P3-01 / T14) — unit tests.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMcpToolset } from '../src/host/createMcpToolset.js'
import { decodeMcpReply } from '../src/host/decodeMcpReply.js'

const SCHEMA = {
  methods: [
    { name: 'term.echo', description: 'echo', params: { type: 'object' } },
    { name: 'term.fail', description: 'boom', params: { type: 'object' } },
  ],
  'x-events': ['exit'],
}

const toolset = createMcpToolset({
  schema: SCHEMA,
  dispatch: async (name, args) => {
    if (name === 'term.fail') { const e = new Error('nope'); e.kind = 'blocked'; throw e }
    return { echoed: args.text ?? null, attach: { url: '/stream?session=x' } }
  },
  serverInfo: { name: 'test', version: '1.0.0' },
})

test('initialize returns protocol version + serverInfo', async () => {
  const r = await toolset.handleRpc({ jsonrpc: '2.0', id: 1, method: 'initialize' })
  assert.equal(r.jsonrpc, '2.0')
  assert.equal(r.result.serverInfo.name, 'test')
  assert.equal(r.result.capabilities['dnt.events'].types[0], 'exit')
})

test('tools/list returns schema-generated tools', async () => {
  const r = await toolset.handleRpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
  assert.equal(r.result.tools.length, 2)
  assert.equal(r.result.tools[0].name, 'term.echo')
  assert.deepEqual(r.result.tools[0].inputSchema, { type: 'object' })
})

test('tools/call success → content+structuredContent', async () => {
  const r = await toolset.handleRpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'term.echo', arguments: { text: 'hi' } } })
  assert.equal(r.result.structuredContent.echoed, 'hi')
  assert.equal(r.result.structuredContent.attach.url, '/stream?session=x')
  assert.equal(r.result.content[0].type, 'text')
  // decode round-trip → ok:true
  const d = decodeMcpReply(r)
  assert.equal(d.ok, true)
  assert.equal(d.data.echoed, 'hi')
})

test('tools/call domain error → isError + structuredContent.kind', async () => {
  const r = await toolset.handleRpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'term.fail', arguments: {} } })
  assert.equal(r.result.isError, true)
  assert.equal(r.result.structuredContent.kind, 'blocked')
  const d = decodeMcpReply(r)
  assert.equal(d.ok, false)
  assert.equal(d.kind, 'tool')
  assert.equal(d.message, 'nope')
})

test('unknown tool → rpc error; unknown method → -32601', async () => {
  const r = await toolset.handleRpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope' } })
  assert.equal(r.error.code, -32602)
  const d = decodeMcpReply(r)
  assert.equal(d.ok, false); assert.equal(d.kind, 'rpc')
  const r2 = await toolset.handleRpc({ jsonrpc: '2.0', id: 5, method: 'bogus' })
  assert.equal(r2.error.code, -32601)
})

test('batch + notifications + ping', async () => {
  const r = await toolset.handleRpc([
    { jsonrpc: '2.0', id: 1, method: 'ping' },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { bad: true },
  ])
  assert.ok(Array.isArray(r))
  assert.equal(r.length, 2) // ping + invalid (notification silent)
  assert.equal(r[0].result && r[0].error === undefined ? true : false, true)
  assert.equal(r[1].error.code, -32600)
})

test('decodeMcpReply protocol violations', () => {
  assert.equal(decodeMcpReply(null).kind, 'protocol')
  assert.equal(decodeMcpReply({}).kind, 'protocol')
  const legacy = decodeMcpReply({ result: { content: [{ type: 'text', text: '{"a":1}' }] } })
  assert.equal(legacy.ok, true); assert.deepEqual(legacy.data, { a: 1 })
  const undec = decodeMcpReply({ result: { content: [] } })
  assert.equal(undec.ok, false); assert.equal(undec.kind, 'protocol')
})
