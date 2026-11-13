import assert from 'node:assert/strict'
import test from 'node:test'
import { createArgs, ensureLocalContainer, hostPort, isLoopback, stopLocalContainer } from '../lib/container-engine.js'

test('a loopback start builds a detached container command', () => {
  assert.equal(isLoopback('http://127.0.0.1:8798'), true)
  assert.equal(isLoopback('http://10.0.0.8:8798'), false)
  assert.equal(hostPort('http://127.0.0.1:8798'), 8798)
  const args = createArgs({ checkout: '/src/kitesurf', hostEnginePort: 8798, hostMcpPort: 8799 })
  assert.deepEqual(args.slice(0, 6), ['run', '-d', '--name', 'kitesurf', '-c', '4'])
  // Published ports bind host loopback so the engine and bridge stay off the LAN.
  assert.ok(args.includes('127.0.0.1:8798:8787'))
  assert.ok(args.includes('127.0.0.1:8799:8791'))
  assert.equal(args.includes('8798:8787'), false)
  assert.ok(args.includes('type=bind,source=/src/kitesurf,target=/opt/kitesurf,readonly'))
  // wrangler mkdtemp's under .wrangler/ even with --persist-to; a tmpfs keeps
  // the scratch writable while the checkout mount stays read-only.
  const tmpfsAt = args.indexOf('--tmpfs')
  assert.ok(tmpfsAt > 0 && args[tmpfsAt + 1] === '/opt/kitesurf/packages/engine/.wrangler')
})

test('a remote origin is not started on this machine', async () => {
  let called = false
  const result = await ensureLocalContainer(
    { httpBase: 'http://10.0.0.8:8798', mcpPort: 8799 },
    { run: async () => { called = true } },
  )
  assert.equal(result.local, false)
  assert.equal(called, false)
})

const INSPECT_OK = JSON.stringify([{
  configuration: {
    publishedPorts: [
      { containerPort: 8787, hostPort: 8798, hostAddress: '127.0.0.1', proto: 'TCP' },
      { containerPort: 8791, hostPort: 8799, hostAddress: '127.0.0.1', proto: 'TCP' },
    ],
  },
}])

test('a missing local container is created, and suspend stops it', async () => {
  const commands = []
  const io = {
    inspect: async () => null,
    run: async (args) => { commands.push(args.slice(0, 2).join(' ')); return { stdout: '', stderr: '' } },
  }
  const created = await ensureLocalContainer({ httpBase: 'http://127.0.0.1:8798', mcpPort: 8799 }, { ...io, checkout: '/src/kitesurf' })
  assert.equal(created.created, true)
  // `system start` primes the apiserver before `run` — the CLI's inline
  // bootstrap ("failed to bootstrap") is unreliable on debug builds cold.
  assert.deepEqual(commands, ['system start', 'run -d'])
  await stopLocalContainer({ httpBase: 'http://127.0.0.1:8798', mcpPort: 8799 }, io)
  assert.deepEqual(commands, ['system start', 'run -d', 'stop kitesurf'])
})

test('an existing container with matching ports is started, not recreated', async () => {
  const commands = []
  const io = {
    inspect: async () => INSPECT_OK,
    run: async (args) => { commands.push(args.slice(0, 2).join(' ')); return { stdout: '', stderr: '' } },
  }
  const result = await ensureLocalContainer({ httpBase: 'http://127.0.0.1:8798', mcpPort: 8799 }, { ...io, checkout: '/src/kitesurf' })
  assert.equal(result.created, false)
  // `system start` primes the apiserver before `start` too — a stopped
  // container on a cold debug-build apiserver needs the same priming.
  assert.deepEqual(commands, ['system start', 'start kitesurf'])
})

test('a container whose published ports drifted is deleted and recreated', async () => {
  const stale = JSON.stringify([{
    configuration: {
      publishedPorts: [
        { containerPort: 8787, hostPort: 8787, hostAddress: '0.0.0.0', proto: 'TCP' },
        { containerPort: 8791, hostPort: 8791, hostAddress: '0.0.0.0', proto: 'TCP' },
      ],
    },
  }])
  const commands = []
  const io = {
    inspect: async () => stale,
    run: async (args) => { commands.push(args.slice(0, 2).join(' ')); return { stdout: '', stderr: '' } },
  }
  const result = await ensureLocalContainer({ httpBase: 'http://127.0.0.1:8798', mcpPort: 8799 }, { ...io, checkout: '/src/kitesurf' })
  assert.equal(result.created, true)
  assert.deepEqual(commands, ['system start', 'delete --force', 'run -d'])
})

test('a cold subsystem failure surfaces the system-start error, not the run', async () => {
  const io = {
    inspect: async () => null,
    run: async (args) => {
      if (args[0] === 'system') throw new Error('bootstrap broken on debug build')
      return { stdout: '', stderr: '' }
    },
  }
  await assert.rejects(
    () => ensureLocalContainer({ httpBase: 'http://127.0.0.1:8798', mcpPort: 8799 }, { ...io, checkout: '/src/kitesurf' }),
    (error) => error.id === 'kitesurf.kite.container' && /system start failed/.test(error.message),
  )
})

test('a missing checkout is a config fault, not an engine failure', async () => {
  await assert.rejects(
    () => ensureLocalContainer({ httpBase: 'http://127.0.0.1:8798', mcpPort: 8799 }, { inspect: async () => null, run: async () => ({ stdout: '', stderr: '' }) }),
    (error) => error.id === 'kitesurf.kite.checkout',
  )
})
