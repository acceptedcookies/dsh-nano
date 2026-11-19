import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { activeMenuTokens, filterCounts, toggleMenuToken } from '../src/client/filter-menu.js'

describe('filter menu tokens', () => {
  it('adds a token and preserves free text and other tokens', () => {
    assert.equal(toggleMenuToken('', 'type:shell'), 'type:shell')
    assert.equal(toggleMenuToken('foo -status:failed', 'type:shell'), 'foo -status:failed type:shell')
  })
  it('removes an existing token, case-insensitively', () => {
    assert.equal(toggleMenuToken('foo type:shell bar', 'type:shell'), 'foo bar')
    assert.equal(toggleMenuToken('TYPE:SHELL', 'type:shell'), '')
    assert.equal(toggleMenuToken('foo', 'type:shell'), 'foo type:shell')
  })
  it('lists only type/status tokens', () => {
    assert.deepEqual(activeMenuTokens('foo type:shell -status:failed status:ok bar'), ['type:shell', 'status:ok'])
    assert.deepEqual(activeMenuTokens(''), [])
  })
  it('counts types and statuses', () => {
    const counts = filterCounts([
      { type: 'shell', status: 'ok' },
      { type: 'shell', status: 'failed' },
      { type: 'message', status: 'ok' },
    ])
    assert.deepEqual(counts.types, { shell: 2, message: 1 })
    assert.deepEqual(counts.statuses, { ok: 2, failed: 1 })
  })
})
