import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { CLOSED, OPEN, createCdpKeeper } from '../src/host/cdp-keeper.js'
import { createInstanceRegistry } from '../src/host/instance-registry.js'
import { profileFixture } from './support/profile-fixture.mjs'

const EXPECTED = {
  idsDiffer: true,
  staleId: 'sandbox.instance.policy-stale',
  stopA: 0,
  bFingerprintSame: true,
  bRootSame: true,
  pageLost: 'sandbox.cdp.page-lost',
  domIsNotOld: true,
  bLastUrl: 'https://b.example',
  bPhase: 'idle',
}

async function oneTrace() {
  let stops = 0
  const box = createInstanceRegistry({
    backend: {
      async create() { return {} },
      async stop() { stops += 1 },
    },
    profile: profileFixture(),
    volumeFor: (id) => join(mkdtempSync(join(tmpdir(), 'dnls-soak-')), id),
  })
  const policy = { mode: 'read-only', workspaceRoot: '/work/a', extraRoots: [] }
  const a = await box.ensure({ sessionId: 'A', policy })
  const b = await box.ensure({ sessionId: 'B', policy: { ...policy, workspaceRoot: '/work/b' } })
  const bFingerprint = b.instance.policyFingerprint
  const bRoot = b.instance.workspaceRoot
  const stale = await box.ensure({ sessionId: 'A', policy: { ...policy, mode: 'workspace-write' } })
  const keeper = createCdpKeeper()
  const socket = { readyState: OPEN }
  keeper.attach(a.instance.instanceId, socket, { lastUrl: 'https://a.example', dom: 'OLD-A' })
  keeper.attach(b.instance.instanceId, { readyState: OPEN }, { lastUrl: 'https://b.example', dom: 'DOM-B' })
  socket.readyState = CLOSED
  const lost = await keeper.read(a.instance.instanceId, async () => null)
  return {
    idsDiffer: a.instance.instanceId !== b.instance.instanceId,
    staleId: stale.errorId,
    stopA: stops,
    bFingerprintSame: b.instance.policyFingerprint === bFingerprint,
    bRootSame: b.instance.workspaceRoot === bRoot,
    pageLost: lost.errorId,
    domIsNotOld: lost.dom !== 'OLD-A',
    bLastUrl: keeper.sockets.get(b.instance.instanceId).lastUrl,
    bPhase: b.instance.phase,
  }
}

test('twenty soak runs match the specified trace', async () => {
  const traces = []
  for (let i = 0; i < 20; i += 1) traces.push(await oneTrace())
  for (const trace of traces) assert.deepEqual(trace, EXPECTED)
  assert.equal(traces.length, 20)
  assert.equal(CLOSED, 3)
})
