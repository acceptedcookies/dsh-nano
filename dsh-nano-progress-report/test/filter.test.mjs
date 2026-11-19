import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyFilter, isEmptyFilter, parseFilter, RESULT_HAYSTACK_MAX, rowHaystack } from '../src/client/filter.js'

const row = over => ({
  key: 'k', kind: 'k', id: 'i', seq: 1, time: 0, turn: 0,
  type: 'shell', status: 'ok', summary: '', tool: '', expandable: false,
  detail: undefined, ...over,
})

describe('parseFilter', () => {
  it('parses type/status/tool tokens', () => {
    const f = parseFilter('type:shell -status:failed tool:bash fix login')
    assert.deepEqual([...f.types], ['shell'])
    assert.deepEqual([...f.notStatuses], ['failed'])
    assert.equal(f.tool, 'bash')
    assert.equal(f.text, 'fix login')
  })
  it('unknown tokens degrade to free text', () => {
    const f = parseFilter('type:bogus key:x')
    assert.equal(f.types.size, 0)
    assert.equal(f.text, 'type:bogus key:x')
  })
  it('empty query yields empty filter', () => {
    assert.equal(isEmptyFilter(parseFilter('')), true)
    assert.equal(isEmptyFilter(parseFilter('  ')), true)
  })
  it('negation on type', () => {
    const f = parseFilter('-type:shell')
    assert.deepEqual([...f.notTypes], ['shell'])
  })
  it('-tool: parses as notTool', () => {
    const f = parseFilter('-tool:bash')
    assert.equal(f.notTool, 'bash')
    assert.equal(f.tool, null)
    assert.equal(isEmptyFilter(f), false)
  })
  it('status:bogus degrades to free text', () => {
    const f = parseFilter('status:bogus')
    assert.equal(f.statuses.size, 0)
    assert.equal(f.text, 'status:bogus')
  })
})

describe('applyFilter', () => {
  const rows = [
    row({ type: 'shell', status: 'ok', tool: 'bash', summary: 'cd /tmp && ls' }),
    row({ type: 'file', status: 'failed', tool: 'write', summary: 'Write a.txt' }),
    row({ type: 'prompt', status: 'ok', summary: 'please fix the build' }),
  ]
  it('type: filters rows', () => {
    const f = parseFilter('type:shell')
    assert.equal(applyFilter(rows, f).length, 1)
    assert.equal(applyFilter(rows, f)[0].type, 'shell')
  })
  it('-status: excludes rows', () => {
    const f = parseFilter('-status:failed')
    assert.equal(applyFilter(rows, f).length, 2)
  })
  it('status: includes only matching', () => {
    const f = parseFilter('status:failed')
    assert.equal(applyFilter(rows, f).length, 1)
  })
  it('tool: matches exact wire name', () => {
    const f = parseFilter('tool:bash')
    assert.equal(applyFilter(rows, f).length, 1)
  })
  it('-tool: excludes the named tool', () => {
    const f = parseFilter('-tool:bash')
    const out = applyFilter(rows, f)
    assert.equal(out.length, 2)
    assert.ok(out.every(r => r.tool !== 'bash'))
  })
  it('free text matches summary (case-insensitive)', () => {
    const f = parseFilter('BUILD')
    assert.equal(applyFilter(rows, f).length, 1)
  })
  it('tokens compose with AND', () => {
    const f = parseFilter('type:file status:failed')
    assert.equal(applyFilter(rows, f).length, 1)
    const f2 = parseFilter('type:file status:ok')
    assert.equal(applyFilter(rows, f2).length, 0)
  })
  it('rowHaystack searches only the head of a tool result', () => {
    const tail = row({ summary: 's', tool: 'bash', detail: { resultText: `${'x'.repeat(RESULT_HAYSTACK_MAX)}NEEDLE` } })
    assert.equal(rowHaystack(tail).includes('needle'), false)
  })
  it('rowHaystack includes detail text', () => {
    const r = row({ summary: 's', tool: 'bash', detail: { resultText: 'ENOENT inside' } })
    assert.equal(rowHaystack(r).includes('enoent'), true)
  })
  it('free text searches raw args (spec §4: summary/参数原文)', () => {
    const r = row({ summary: 'bash', tool: 'bash', detail: { argsRaw: '{"command":"grep -rn needle src/"}' } })
    const f = parseFilter('needle')
    assert.equal(applyFilter([r], f).length, 1)
  })
})
