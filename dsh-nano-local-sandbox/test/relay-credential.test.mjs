import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { publishRelayCredential, runPublishRelayCredential } from '../profiles/terminal/relay-credential.mjs'
import { createBridgeCredentialVault } from '../src/host/bridge-credential.js'
import { createAppleBackend } from '../src/host/backend-apple.js'
import { connectCdp } from '../src/host/cdp-elements.js'
import { ensureBridgeCredential } from '../src/host/routes.js'

const TOKEN = 'a'.repeat(43)
const tmp = (prefix) => mkdtempSync(join(tmpdir(), prefix))

test('guest helper writes the credential root→node 0400 and never echoes it', async () => {
  const dir = tmp('dnls-cred-')
  try {
    assert.deepEqual(publishRelayCredential({ v: 1, token: TOKEN }, { dir, uid: process.getuid(), gid: process.getgid() }), { ok: true })
    const path = join(dir, 'dnls-relay-credential.json')
    assert.equal(statSync(path).mode & 0o777, 0o400, 'only the owner (bridge user) may read it')
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { v: 1, token: TOKEN })

    // Malformed docs fail closed and keep the previous credential.
    for (const bad of [null, { v: 2, token: TOKEN }, { v: 1, token: 'short' }, { v: 1, token: TOKEN, extra: 1 }, 'x']) {
      assert.throws(() => publishRelayCredential(bad, { dir, uid: process.getuid(), gid: process.getgid() }))
      assert.equal(JSON.parse(readFileSync(path, 'utf8')).token, TOKEN)
    }

    // The run wrapper replies one bounded {ok} line — the token never echoes.
    const lines = []
    const input = new PassThrough()
    input.end(JSON.stringify({ v: 1, token: 'b'.repeat(43) }))
    const result = await runPublishRelayCredential({ dir, input, out: (line) => lines.push(line), uid: process.getuid(), gid: process.getgid() })
    assert.equal(result.ok, true)
    assert.deepEqual(lines, ['{"ok":true}'])
    assert.equal(lines.join('').includes('b'.repeat(43)), false, 'credential must never echo on the helper channel')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('vault mints one token per generation, retries only on failure, never logs the token', async () => {
  const deliveries = []
  const vault = createBridgeCredentialVault({
    deliver: async (locator, token) => { deliveries.push({ locator, token }) },
  })
  const a = await vault.tokenFor({ locator: 'dnls-a', generation: 'gen-1' })
  const again = await vault.tokenFor({ locator: 'dnls-a', generation: 'gen-1' })
  assert.equal(a, again, 'same generation reuses one delivered token')
  assert.match(a, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(deliveries.length, 1, 'delivered once per (locator,generation)')

  const next = await vault.tokenFor({ locator: 'dnls-a', generation: 'gen-2' })
  assert.notEqual(next, a, 'a new generation gets a new token — the old one dies')
  assert.equal(deliveries.length, 2)

  // Concurrent first uses share one delivery (single flight).
  const vault2 = createBridgeCredentialVault({ deliver: async () => {} })
  const [x, y] = await Promise.all([
    vault2.tokenFor({ locator: 'l', generation: 'g' }),
    vault2.tokenFor({ locator: 'l', generation: 'g' }),
  ])
  assert.equal(x, y)

  // Delivery failure: 503, nothing cached, a retry may succeed.
  let failures = 0
  const vault3 = createBridgeCredentialVault({
    deliver: async () => { failures += 1; if (failures === 1) throw new Error('refused') },
  })
  await assert.rejects(() => vault3.tokenFor({ locator: 'l', generation: 'g' }), (e) => e.status === 503)
  assert.equal(typeof await vault3.tokenFor({ locator: 'l', generation: 'g' }), 'string')

  // A backend without the guest channel fails closed, still 503.
  const vault4 = createBridgeCredentialVault({ deliver: null })
  await assert.rejects(() => vault4.tokenFor({ locator: 'l', generation: 'g' }), (e) => e.status === 503)

  // Missing binding halves fail closed.
  await assert.rejects(() => vault.tokenFor({ locator: 'l' }), (e) => e.status === 503)
})

test('backend deliverBridgeCredential rides the same env -i / root-helper / stdin exec pattern', async () => {
  const sessions = []
  const io = {
    execSession: async (cmd, args, input) => {
      sessions.push({ cmd, args, input })
      return '{"ok":true}\n'
    },
  }
  const backend = createAppleBackend({}, io)
  await backend.deliverBridgeCredential('dnls-loc', TOKEN)
  const { cmd, args, input } = sessions[0]
  assert.equal(cmd, 'container')
  assert.deepEqual(args, [
    'exec', '-i', '--user', '0:0', '--workdir', '/', 'dnls-loc',
    '/usr/bin/env', '-i', 'PATH=/usr/local/bin:/usr/bin:/bin',
    '/usr/local/bin/node', '/opt/dnls/relay-credential.mjs',
  ])
  assert.equal(args.some((a) => a.includes(TOKEN)), false, 'credential never rides argv')
  assert.deepEqual(JSON.parse(input), { v: 1, token: TOKEN })

  // A refused helper surfaces an honest error — never a silent success.
  const io2 = { execSession: async () => '{"ok":false}\n' }
  const backend2 = createAppleBackend({}, io2)
  await assert.rejects(() => backend2.deliverBridgeCredential('dnls-loc', TOKEN), /refused/)
})

test('connectCdp presents the generation credential as a dnls-relay subprotocol only', async () => {
  const seen = []
  class FakeSocket {
    constructor(url, protocols) { seen.push({ url, protocols }); this.readyState = 0 }
    addEventListener() {}
  }
  // Never opens: we only need the constructor arguments.
  connectCdp('http://127.0.0.1:8787', { WebSocket: FakeSocket, relayUrl: 'ws://127.0.0.1:8791/cdp', relayToken: TOKEN }).catch(() => {})
  await new Promise((r) => setTimeout(r, 10))
  assert.equal(seen[0].url, 'ws://127.0.0.1:8791/cdp')
  assert.deepEqual(seen[0].protocols, [`dnls-relay.${TOKEN}`])
  assert.equal(seen[0].url.includes(TOKEN), false, 'credential never rides the URL')

  // No token → no protocols offer (agent-class connection).
  const seen2 = []
  class FakeSocket2 {
    constructor(url, protocols) { seen2.push({ url, protocols }); this.readyState = 0 }
    addEventListener() {}
  }
  connectCdp('http://127.0.0.1:8787', { WebSocket: FakeSocket2, relayUrl: 'ws://127.0.0.1:8791/cdp' }).catch(() => {})
  await new Promise((r) => setTimeout(r, 10))
  assert.equal(seen2[0].protocols, undefined)
})

test('ensureBridgeCredential: managed sessions get the token, delivery failure is 503', async () => {
  const vault = createBridgeCredentialVault({ deliver: async () => {} })
  const session = { containerName: 'dnls-a', generation: 'gen-1' }
  const token = await ensureBridgeCredential(session, { relayCredentials: vault })
  assert.match(token, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(session.relayToken, token)
  assert.equal(await ensureBridgeCredential(session, { relayCredentials: vault }), token, 'memoized on the session')

  // No vault or no binding → agent-class (null), never a fabricated token.
  const plain = {}
  assert.equal(await ensureBridgeCredential(plain, {}), null)
  assert.equal(plain.relayToken, null)

  // Delivery failure propagates a 503 — the object page must not connect.
  const broken = createBridgeCredentialVault({ deliver: async () => { throw new Error('refused') } })
  const failSession = { containerName: 'dnls-b', generation: 'gen-9' }
  await assert.rejects(() => ensureBridgeCredential(failSession, { relayCredentials: broken }), (e) => e.status === 503)
  assert.equal(failSession.relayToken, null)
})
