// Term-broker spike host: a REAL process owning the registry + terminal
// owner, routing broker RPC through the baked entry's importable functions
// against a private fixture root. Mode A owns and proves; mode B reopens
// the same registry after A's death and touches the original terminal ref.
// argv: host-client.mjs <registryRoot> <ptyRoot> <A|B> <nonce> <readyFile?>
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openControlRegistry } from '../../src/host/control-registry.js'
import { createTerminalOwner } from '../../src/host/term-bridge.js'
import { callWorker, createWorker } from '../../profiles/terminal/pty-entry.mjs'

const [registryRoot, ptyRoot, mode, nonce, readyFile] = process.argv.slice(2)
const OBS = { locator: 'box-1', generation: 'gen-1', stateVolume: '/state/box-1', state: 'running' }
const INTENT = { name: 'box', profileId: 'kitesurf', principal: 'owner', recipeRef: 'recipe@sha256:1' }
const PEER = { key: 'owner', operator: true, principal: { kind: 'owner' }, signal: { aborted: false } }
const WORKER = join(dirname(fileURLToPath(import.meta.url)), '../../profiles/terminal/pty-worker.py')

const registry = openControlRegistry({ root: registryRoot, envId: 'env-1' })
const owner = createTerminalOwner({
  registry,
  envId: 'env-1',
  observe: async () => OBS,
  resolvePrincipal: ({ peer }) => ({
    key: peer.key,
    operator: true,
    canSee: () => true,
    canUse: () => true,
  }),
  resolveCwd: async () => '/',
  terminalRpc: async (locator, verb, request) => {
    if (locator !== OBS.locator) throw new Error('wrong locator')
    return verb === 'create'
      ? createWorker({ root: ptyRoot, python: '/usr/bin/python3', workerPath: WORKER }, request)
      : callWorker(ptyRoot, request)
  },
  issueLocator: async (ref) => `ws://127.0.0.1/attach/${ref.terminalId}`,
})

const exec = (capability, args) => owner.execute({ capability, sandboxId: args.sandboxId, peer: PEER, req: {}, args })
const say = (obj) => process.stdout.write(`${JSON.stringify(obj)}\n`)

async function readUntil(sandboxId, terminalId, pattern, { seq = 0, deadline = 15000 } = {}) {
  const until = Date.now() + deadline
  let bytes = ''
  let last = null
  while (Date.now() < until) {
    const reply = await exec('term.session.read', { sandboxId, terminalId, from: seq })
    last = reply
    seq = reply.seq
    bytes += reply.bytes
    const match = pattern.exec(bytes)
    if (match) return { match, seq }
    await new Promise((resolve) => setImmediate(resolve))
  }
  throw new Error(`host ${mode} timed out on ${pattern}; saw=${bytes.slice(-200)} last=${JSON.stringify(last)}`)
}

if (mode === 'A') {
  const row = registry.adopt(INTENT, OBS)
  const created = await exec('term.session.create', { sandboxId: row.sandboxId, openId: 'open-1', paneId: 'pane-1' })
  const terminalId = created.terminalId
  const inputReply = await exec('term.session.input', {
    sandboxId: row.sandboxId, terminalId,
    data: `export DNLS_PROOF=proof-${nonce}; printf "${nonce}-%s-$$\\n" "$DNLS_PROOF"\n`,
  })
  say({ inputReply, sock: existsSync(join(ptyRoot, `${terminalId}.sock`)), dir: readdirSync(ptyRoot) })
  const proof = await readUntil(row.sandboxId, terminalId, new RegExp(`${nonce}-proof-${nonce}-(\\d+)`))
  say({ ready: true, sandboxId: row.sandboxId, terminalId, pid: Number(proof.match[1]), seq: proof.seq })
  if (readyFile) writeFileSync(readyFile, 'ready')
  // The test SIGKILLs us here: registry lock and worker must behave exactly
  // as a dead host left them. The interval keeps a live handle — a bare
  // forever-promise lets Node exit on its unsettled-await check.
  setInterval(() => {}, 60000)
  await new Promise(() => {})
} else {
  const row = registry.list().find((entry) => entry.name === INTENT.name)
  const ref = row.terminals[0]
  // No re-creation: attach on the ORIGINAL ref must reach the live worker.
  const attach = await exec('term.session.attach', { sandboxId: row.sandboxId, terminalId: ref.terminalId })
  await exec('term.session.input', {
    sandboxId: row.sandboxId, terminalId: ref.terminalId,
    data: `printf "${nonce}-%s-$$\\n" "$DNLS_PROOF"\n`,
  })
  const prior = JSON.parse(process.env.SPIKE_PRIOR ?? '{}')
  const proof = await readUntil(row.sandboxId, ref.terminalId, new RegExp(`${nonce}-proof-([A-Za-z0-9]+)-(\\d+)`), { seq: prior.seq ?? 0 })
  await exec('term.session.close', { sandboxId: row.sandboxId, terminalId: ref.terminalId })
  say({ attach: attach.attach, pid: Number(proof.match[2]), proofEnv: `proof-${proof.match[1]}`, terminalId: ref.terminalId })
  registry.close()
}
