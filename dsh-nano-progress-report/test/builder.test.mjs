import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ProgressBuilder } from '../src/client/view/progress-builder.js'

const node = (key, data) => ({
  key, kind: 'progress-tool-call', id: key, target: 'progress', data,
})

const toolData = (seq, name, status, extra = {}) => ({
  row: 'tool', seq, time: 1000 + seq, callId: `c${seq}`, name,
  argsRaw: '{}', status, ...extra,
})

describe('ProgressBuilder', () => {
  it('replace builds ordered rows', () => {
    const b = new ProgressBuilder()
    const snap = b.replace({
      nodes: [
        node('k2', toolData(2, 'bash', 'ok')),
        node('k1', { row: 'prompt', seq: 1, time: 1001, text: 'go' }),
      ],
      timeline: { turnOrder: [1], turns: new Map() },
    })
    assert.equal(snap.rows.length, 2)
    assert.equal(snap.rows[0].key, 'k1')
    assert.equal(snap.rows[1].key, 'k2')
    assert.equal(snap.counts.total, 2)
  })
  it('apply upserts a single row without touching others', () => {
    const b = new ProgressBuilder()
    b.replace({ nodes: [node('k1', toolData(1, 'bash', 'running')), node('k2', toolData(2, 'read', 'ok'))], timeline: {} })
    const snap = b.apply({ upserts: [node('k1', toolData(1, 'bash', 'failed', { error: 'exit 1' }))], timeline: {} })
    assert.equal(snap.rows.length, 2)
    assert.equal(snap.rows[0].status, 'failed')
    assert.equal(snap.rows[0].detail.error, 'exit 1')
    assert.equal(snap.rows[1].status, 'ok')
    assert.equal(snap.counts.failed, 1)
  })
  it('empty snapshot is stable before activation', () => {
    const b = new ProgressBuilder()
    assert.equal(b.empty.rows.length, 0)
  })
  it('empty snapshot is frozen and never polluted by replace', () => {
    const b = new ProgressBuilder()
    assert.ok(Object.isFrozen(b.empty))
    b.replace({ nodes: [node('k1', toolData(1, 'bash', 'ok'))], timeline: {} })
    assert.equal(b.empty.rows.length, 0, 'EMPTY singleton must stay pristine')
  })
  it('revision increments per snapshot', () => {
    const b = new ProgressBuilder()
    const s1 = b.replace({ nodes: [], timeline: {} })
    const s2 = b.apply({ upserts: [], timeline: {} })
    assert.equal(s1.revision, 1)
    assert.equal(s2.revision, 2)
  })
  it('snapshot carries exactly {rows,timeline,counts,revision}', () => {
    const b = new ProgressBuilder()
    const snap = b.replace({ nodes: [], timeline: {} })
    assert.deepEqual(Object.keys(snap).sort(), ['counts', 'revision', 'rows', 'timeline'])
  })
  it('apply tolerates null upserts and last-write-wins on same key', () => {
    const b = new ProgressBuilder()
    b.replace({ nodes: [node('k1', toolData(1, 'bash', 'running'))], timeline: {} })
    const snap = b.apply({ upserts: [null, node('k1', toolData(1, 'bash', 'ok'))], timeline: {} })
    assert.equal(snap.rows.length, 1)
    assert.equal(snap.rows[0].status, 'ok')
  })
})
