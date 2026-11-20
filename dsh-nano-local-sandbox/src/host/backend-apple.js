import { spawn, execFile } from 'node:child_process'
import { assertPublicSpec, capabilityReport } from './backend.js'
import { errorCode } from './error-catalog.js'

/**
 * Container-CLI errors need shape, not just a stderr blob. Classify into
 * not-found / not-running / conflict / timeout / generic so callers (and the
 * audit trail) can tell "container missing" from "daemon broken" — an inspect
 * that fails used to be indistinguishable from a missing container.
 */
function cliError(args, { code, stderr = '', cause = null, timedOut = false } = {}) {
  const verb = args[0] || 'cli'
  const name = args[args.length - 1] || ''
  // execFile surfaces the child's stderr on error.cause.message (wrapped as
  // "Command failed: …"), not always on error.stderr — read both so kind
  // classification and messages see the real CLI output.
  const raw = stderr || cause?.stderr || cause?.message || ''
  const text = String(raw).split('\n').filter((line) => line && !/^Command failed:/.test(line)).join(' ').trim()
  let kind = 'failed'
  if (timedOut) kind = 'timeout'
  else if (/no such container|not found|does not exist/i.test(text)) kind = 'not-found'
  else if (/not running|is stopped|already stopped/i.test(text)) kind = 'not-running'
  else if (/already exists|in use|conflict|address already/i.test(text)) kind = 'conflict'
  const error = new Error(`container ${verb} ${name}: ${timedOut ? 'timed out' : `exit ${code}`}`)
  error.code = code
  error.cliKind = kind
  error.errorId = timedOut ? errorCode('backend.timeout') : errorCode('backend.cli')
  // The raw native stderr lines are kept privately for missing-proof
  // matching; they never go into a public message or JSON payload. Only the
  // real stderr stream counts — a wrapped "Command failed: …" message must
  // never be mistaken for it.
  Object.defineProperty(error, 'nativeStderr', { value: String(stderr || cause?.stderr || '').trim(), enumerable: false })
  if (cause) error.cause = cause
  return error
}

/**
 * Documented absence diagnostics from the Apple container CLI
 * (ContainerInspect / ContainerLookup). `inspect` treats only a single
 * diagnostic equal to one of these — for the exact requested name — as
 * "missing"; everything else is an unknown fault, never an absence.
 */
const missingDiagnosticsFor = (name) => [
  `container not found: ${name}`,
  `container with ID ${name} not found`,
]

/** The debug-build banner the installed CLI prints on stderr before the
 * real diagnostic. Only this exact fixed line at the very start is
 * informational; anything else — extra lines, reordering, look-alikes —
 * keeps the verdict fail-closed. */
const DEBUG_BANNER = 'Warning! Running debug build. Performance may be degraded.'

function isMissingContainer(error, name) {
  if (error?.code === 'ENOENT' || error?.cliKind === 'timeout') return false
  const source = typeof error?.nativeStderr === 'string' && error.nativeStderr !== ''
    ? error.nativeStderr
    : (typeof error?.stderr === 'string' ? error.stderr : '')
  const native = source.trim()
  if (native === '') return false
  const lines = native.split('\n')
  if (lines[0] === DEBUG_BANNER) lines.shift()
  if (lines.length !== 1) return false
  const diagnostic = lines[0].replace(/^(?:Error|error|notFound)(?::| )/, '').trim()
  return missingDiagnosticsFor(name).includes(diagnostic)
}

const CLI_TIMEOUT_MS = Number(process.env.DNLS_CLI_TIMEOUT_MS || 15000)
const SESSION_OUTPUT_MAX = 1 << 20

/**
 * The constant guest probe behind backend.processes (P7). A single fixed
 * `-c` program: enumerate numeric /proc entries, take pid/comm/state/ppid
 * from stat (comm may contain spaces or parens — split on the last `)`)
 * and VmRSS from status. Anything unreadable is skipped, never faked.
 * Output is pid-sorted `pid\tppid\tstate\tname\trssBytes`, capped before
 * it ever reaches the CLI. No caller input reaches this string.
 */
const PROCESSES_MAX = 201
// Deployment identity serialized into the guest as env vars: only these
// two values, validated before they ever touch argv.
const ENV_ID = /^[a-z0-9][a-z0-9-]{0,31}$/
const SANDBOX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PROCESSES_PROGRAM = `import os
rows=[]
for e in os.listdir("/proc"):
 if not e.isdigit():continue
 try:
  s=open("/proc/"+e+"/stat").read()
  r=s.rfind(")")
  t=s[r+2:].split()
  rss=0
  for l in open("/proc/"+e+"/status"):
   if l.startswith("VmRSS:"):rss=int(l.split()[1])*1024;break
  rows.append((int(s[:s.find("(")]),int(t[1]),t[0],s[s.find("(")+1:r].replace("\\t"," ").replace("\\n"," "),rss))
 except Exception:pass
rows.sort()
for x in rows[:${PROCESSES_MAX}]:print("%d\\t%d\\t%s\\t%s\\t%d"%x)`

/**
 * Interactive `container exec -i`: the request goes over stdin, the answer
 * over stdout — typed input never rides argv or CLI logs. `io.execSession`
 * is the test seam.
 */
function runSession(io, args, { input = '', timeoutMs = CLI_TIMEOUT_MS } = {}) {
  io.calls.spawn += 1
  if (io.execSession) return io.execSession('container', args, input)
  return new Promise((resolve, reject) => {
    const child = spawn('container', args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let capped = false
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL') } catch { /* gone */ }
      reject(cliError(args, { timedOut: true }))
    }, timeoutMs)
    child.stdout?.on('data', (chunk) => {
      stdout += chunk
      if (!capped && Buffer.byteLength(stdout) > SESSION_OUTPUT_MAX) {
        capped = true
        try { child.kill('SIGKILL') } catch { /* gone */ }
      }
    })
    child.stderr?.on('data', (chunk) => { stderr += chunk })
    child.on('error', (cause) => { clearTimeout(timer); reject(cliError(args, { cause })) })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0 && !capped) resolve(stdout)
      else reject(cliError(args, { code: code ?? 1, stderr }))
    })
    child.stdin.end(input)
  })
}

/** Terminal broker verbs the managed owner may invoke through entry. */
const TERM_ENTRY_VERBS = new Set(['create', 'rpc'])

function run(io, args, { timeoutMs = CLI_TIMEOUT_MS, command = 'container' } = {}) {
  io.calls.spawn += 1
  if (io.spawn) return io.spawn(command, args)
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      try { child.kill('SIGKILL') } catch { /* gone */ }
    }, timeoutMs)
    child.stderr?.on('data', (chunk) => { stderr = (stderr + chunk).slice(-8192) })
    child.on('error', (cause) => { clearTimeout(timer); reject(cliError(args, { cause })) })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (timedOut) reject(cliError(args, { timedOut: true }))
      else if (code === 0) resolve({ code })
      else reject(cliError(args, { code, stderr }))
    })
  })
}

function runFile(io, args, { timeoutMs = CLI_TIMEOUT_MS } = {}) {
  io.calls.spawn += 1
  if (io.execFile) return io.execFile('container', args)
  return new Promise((resolve, reject) => {
    const child = execFile('container', args, { encoding: 'utf8', timeout: timeoutMs, killSignal: 'SIGKILL' }, (error, stdout, stderr) => {
      if (error) {
        reject(cliError(args, { code: error.code, stderr, cause: error.killed ? null : error, timedOut: error.killed === true }))
      }
      else resolve(stdout)
    })
    void child
  })
}

/**
 * The only file in this package allowed to call the container CLI.
 * Public constructor arguments stay free of platform nouns.
 */
export function publishedHttpBase(raw, containerPort = 8787) {
  const text = String(raw ?? '')
  const start = text.indexOf('[')
  const objectStart = text.indexOf('{')
  const at = start >= 0 ? start : objectStart
  if (at < 0) return null
  let data
  try { data = JSON.parse(text.slice(at)) } catch { return null }
  const item = Array.isArray(data) ? data[0] : data
  const ports = item?.configuration?.publishedPorts ?? item?.publishedPorts ?? []
  const hit = ports.find((row) => Number(row.containerPort) === Number(containerPort) && row.hostPort)
  if (!hit) return null
  const host = hit.hostAddress && hit.hostAddress !== '0.0.0.0' ? hit.hostAddress : '127.0.0.1'
  return `http://${host}:${hit.hostPort}`
}

export function createAppleBackend(spec = {}, io = {}) {
  assertPublicSpec(spec)
  const calls = {
    ensureImage: 0,
    create: 0,
    start: 0,
    stop: 0,
    restart: 0,
    inspect: 0,
    exec: 0,
    publish: 0,
    mount: [],
    networkPolicy: 0,
    identity: 0,
    stateVolume: 0,
    spawn: 0,
    logs: 0,
    remove: 0,
  }
  const bound = { ...io, calls }

  return {
    calls,
    async ensureImage(image) {
      calls.ensureImage += 1
      assertPublicSpec(image?.publicSpec ?? {})
      const tag = image?.tag ?? spec.image ?? null
      if (!tag) throw new Error('a pinned image is required')
      // Inspect only: a missing build must fail before a healthy container is
      // stopped/deleted, rather than leaving it gone after a failed run.
      await runFile(bound, ['image', 'inspect', tag])
      return { ok: true, image: tag }
    },
    /**
     * Image creation remains privileged here, after host confinement wraps argv.
     * `buildArgs` are the profile Dockerfile's own ARG names/values; the kernel
     * only passes them through.
     */
    async build({ ctx, contextDir, dockerfile, image, buildArgs = [] }) {
      if (typeof ctx?.sandbox?.confine !== 'function') throw new Error('ctx.sandbox.confine is required')
      const args = ['container', 'build', '--tag', image, '--file', dockerfile]
      for (const arg of buildArgs) args.push('--build-arg', String(arg))
      args.push(contextDir)
      const confined = await ctx.sandbox.confine(args)
      if (!Array.isArray(confined?.argv) || confined.argv.length === 0) throw new Error('sandbox did not return a confined build command')
      return new Promise((resolve, reject) => {
        const child = (io.spawnProcess || spawn)(confined.argv[0], confined.argv.slice(1), { stdio: 'inherit' })
        child.on('error', reject)
        child.on('close', code => code === 0 ? resolve({ ok: true, image }) : reject(new Error(`confined image build exited ${code}`)))
      })
    },
    async create(instance) {
      calls.create += 1
      const args = ['run', '-d', '--name', instance.containerName]
      if (instance.resources?.cpus != null) args.push('-c', String(instance.resources.cpus))
      if (instance.resources?.memory != null) args.push('-m', String(instance.resources.memory))
      for (const mount of instance.mounts ?? []) {
        calls.mount.push(mount)
        args.push('--mount', mount.arg)
      }
      for (const port of instance.ports ?? []) args.push('-p', port.publish)
      if (instance.managedIdentity != null) {
        const { envId, sandboxId } = instance.managedIdentity
        if (typeof envId !== 'string' || !ENV_ID.test(envId) ||
            typeof sandboxId !== 'string' || !SANDBOX_UUID.test(sandboxId)) {
          throw new Error('invalid managed identity')
        }
        args.push('--env', `DNLS_ENV_ID=${envId}`, '--env', `DNLS_SANDBOX_ID=${sandboxId}`)
      }
      args.push(instance.image)
      if (typeof io.confine !== 'function') throw Object.assign(new Error('host confinement unavailable'), { status: 503 })
      const confined = await io.confine(['container', ...args])
      if (!Array.isArray(confined?.argv) || !confined.argv.length || confined.argv[0] === 'container') {
        throw Object.assign(new Error('host did not confine container creation'), { status: 503 })
      }
      await run(bound, confined.argv.slice(1), { command: confined.argv[0] })
      return { id: instance.containerName, started: true }
    },
    async start(name) {
      calls.start += 1
      await run(bound, ['start', name])
      return { ok: true }
    },
    async stop(name) {
      calls.stop += 1
      await run(bound, ['stop', name])
      return { ok: true }
    },
    async restart(name) {
      calls.restart += 1
      // Apple's `container` CLI has no `restart` subcommand (exit 64). A
      // restart is stop + start on the same container: mounts, ports and the
      // state volume survive, only the processes are replaced.
      await run(bound, ['stop', name])
      await run(bound, ['start', name])
      return { ok: true }
    },
    async inspect(name) {
      calls.inspect += 1
      try {
        const stdout = await runFile(bound, ['inspect', name])
        return { raw: stdout ?? '' }
      } catch (error) {
        // A missing container is a state, not a fault — but only the
        // documented absence diagnostic for this exact name is proof.
        // Anything else (daemon broken, ENOENT, ambiguous output) is an
        // unknown fault, never an absence.
        if (isMissingContainer(error, name)) return null
        throw error
      }
    },
    /**
     * Read-only image proof: `container image inspect <tag>` must yield
     * exactly one ImageResource; its `configuration.descriptor.digest` is
     * the only digest evidence — a tag or repo hash is never equated.
     */
    async imageEvidence(tag) {
      const text = await runFile(bound, ['image', 'inspect', tag])
      let data
      try { data = JSON.parse(text) } catch { data = null }
      if (!Array.isArray(data) || data.length !== 1) return null
      const digest = data[0]?.configuration?.descriptor?.digest
      if (typeof digest !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(digest)) return null
      return { tag: String(tag), digest }
    },
    async exec(name, argv) {
      calls.exec += 1
      await run(bound, ['exec', name, ...argv])
      return { ok: true }
    },
    /** Driver diagnostics retain output without adding another container CLI site. */
    async execOutput(name, argv) {
      const text = await runFile(bound, ['exec', name, ...argv])
      return { ok: true, text: String(text ?? '') }
    },
    async stats(name) {
      const text = await runFile(bound, ['stats', '--no-stream', '--format', 'json', name])
      return JSON.parse(text)
    },
    /**
     * Read-only guest process table (P7): one constant program reads
     * /proc/[0-9]+/stat and /status — never argv, env or caller options.
     * Returns pid-sorted `{pid,ppid,name,state,rssBytes}` entries, bounded
     * at PROCESSES_MAX so a caller can still see the table was truncated.
     */
    async processes(name) {
      const text = await runFile(bound, ['exec', name, '/usr/bin/python3', '-I', '-c', PROCESSES_PROGRAM])
      const out = []
      for (const line of String(text ?? '').split('\n')) {
        if (!line.trim()) continue
        const [pid, ppid, state, pname, rss] = line.split('\t')
        const entry = {
          pid: Number(pid), ppid: Number(ppid),
          state: typeof state === 'string' && state.length === 1 ? state : null,
          name: typeof pname === 'string' && pname.length > 0 && pname.length <= 64 && !pname.includes('\0') ? pname : null,
          rssBytes: Number(rss),
        }
        if (!Number.isInteger(entry.pid) || entry.pid < 1 || !Number.isInteger(entry.ppid) || entry.ppid < 0 ||
            entry.state === null || entry.name === null || !Number.isInteger(entry.rssBytes) || entry.rssBytes < 0) {
          throw cliError(['exec', name], { code: 1, stderr: 'malformed process table row' })
        }
        out.push(entry)
      }
      out.sort((a, b) => a.pid - b.pid)
      return out.slice(0, PROCESSES_MAX)
    },
    /**
     * Managed terminal broker control: one JSON request to the baked
     * `pty-entry.mjs` inside the named container, over stdin/stdout — never
     * argv, never a shell. `create` spawns the guest worker explicitly;
     * `rpc` only forwards to an existing socket. This remains the only CLI
     * call site; no host inputs or credentials reach argv/env/logs.
     */
    async terminalRpc(locator, verb, request) {
      if (!TERM_ENTRY_VERBS.has(verb)) throw new Error(`terminalRpc rejects verb: ${String(verb)}`)
      const args = [
        'exec', '-i', '--user', '0:0', '--workdir', '/', locator,
        '/usr/bin/env', '-i', 'PATH=/usr/local/bin:/usr/bin:/bin',
        '/usr/local/bin/node', '/opt/dnls/pty-entry.mjs', verb,
      ]
      const text = await runSession(bound, args, { input: JSON.stringify(request ?? {}) })
      const line = String(text).split('\n').find((row) => row.trim())
      let reply
      try {
        reply = JSON.parse(line ?? '{}')
      } catch {
        reply = null
      }
      // Blank, malformed, or non-{ok:true} replies are never success —
      // a create must also echo the exact terminalId it was asked for.
      const bad = () => {
        const error = new Error(`terminalRpc ${verb}: ${typeof reply?.error === 'string' ? reply.error : 'invalid reply'}`)
        error.term = reply && typeof reply === 'object' ? reply : undefined
        return error
      }
      if (reply?.ok !== true) throw bad()
      if (verb === 'create' && reply.terminalId !== request?.terminalId) throw bad()
      return reply
    },
    /**
     * Authenticated bridge health publication (dnls.control/1): the doc goes
     * over stdin to the root-baked /opt/dnls/public-health.mjs helper —
     * never argv, never the published HTTP port, and never the node-writable
     * /mcp-bridge.mjs path. `env -i` strips the guest environment so Node
     * options cannot be smuggled in; the guest verifies the deployment IDs
     * against /proc/1/environ itself. A missing helper is an honest error.
     */
    async publishHealth(locator, doc) {
      const args = [
        'exec', '-i', '--user', '0:0', '--workdir', '/', locator,
        '/usr/bin/env', '-i', 'PATH=/usr/local/bin:/usr/bin:/bin',
        '/usr/local/bin/node', '/opt/dnls/public-health.mjs',
      ]
      const text = await runSession(bound, args, { input: JSON.stringify(doc ?? {}) })
      const line = String(text).split('\n').find((row) => row.trim())
      let reply
      try {
        reply = JSON.parse(line ?? '{}')
      } catch {
        reply = null
      }
      if (reply?.ok !== true) throw new Error(`publishHealth ${locator}: refused`)
      return reply
    },
    /** Remove a container so it can be recreated at a different size. */
    async remove(name) {
      calls.remove += 1
      await run(bound, ['delete', name])
      return { ok: true }
    },
    /** Engine-side log tail. The container is the only place the renderer's
     *  own output exists, so diagnosis has to read it from here. */
    async logs(name, { tail = 200 } = {}) {
      calls.logs += 1
      // Apple's CLI spells the flag `-n`; `--tail` is rejected outright.
      const stdout = await runFile(bound, ['logs', '-n', String(tail), name])
      return { ok: true, container: name, text: String(stdout ?? '') }
    },
    async publish(ports) {
      calls.publish += 1
      assertPublicSpec({ ports })
      return { ports }
    },
    async mount(mountSpec) {
      calls.mount.push(mountSpec)
      assertPublicSpec({ mounts: [mountSpec] })
      return { ok: true }
    },
    async networkPolicy(policy) {
      calls.networkPolicy += 1
      assertPublicSpec({ network: policy })
      return { ok: true }
    },
    async identity(who) {
      calls.identity += 1
      assertPublicSpec({ identity: who })
      return { ok: true }
    },
    async stateVolume(volume) {
      calls.stateVolume += 1
      return { path: volume }
    },
    capabilities() {
      return capabilityReport()
    },
    openPty(containerName, opts = {}) {
      return spawnContainerPty(containerName, opts, bound)
    },
  }
}

const PTY_PY = `
import os, pty, select, sys, struct, fcntl, termios
cmd = sys.argv[1:]
cols = int(os.environ.get("DNLS_COLS", "80"))
rows = int(os.environ.get("DNLS_ROWS", "24"))
pid, fd = pty.fork()
if pid == 0:
    os.execvp(cmd[0], cmd)
fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
# fd 3 carries "rows cols\\n" resize lines; the kernel sends SIGWINCH on change.
ctl = os.fdopen(3, "rb", buffering=0)
pending = b""
watch = [fd, sys.stdin, ctl]
while True:
    ready, _, _ = select.select(watch, [], [])
    if ctl in ready:
        chunk = os.read(3, 256)
        if not chunk:
            watch.remove(ctl)
        pending += chunk
        while b"\\n" in pending:
            line, pending = pending.split(b"\\n", 1)
            try:
                r, c = (int(x) for x in line.split())
                fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", r, c, 0, 0))
            except (ValueError, OSError):
                pass
    if fd in ready:
        try:
            data = os.read(fd, 4096)
        except OSError:
            break
        if not data:
            break
        os.write(sys.stdout.fileno(), data)
    if sys.stdin in ready:
        data = os.read(sys.stdin.fileno(), 4096)
        if not data:
            break
        os.write(fd, data)
`

/** PTY inside the named container. `io.spawnPty` is the test seam. */
export function spawnContainerPty(containerName, { cols = 80, rows = 24 } = {}, io = {}) {
  const argv = ['container', 'exec', '-it', String(containerName), '/bin/sh']
  if (typeof io.spawnPty === 'function') return io.spawnPty(argv, { cols, rows })
  if (io.calls) io.calls.spawn += 1
  return spawnPtyProcess(argv, { cols, rows })
}

/** Runs argv under a local pty; `resize(cols, rows)` reaches it through fd 3. */
export function spawnPtyProcess(argv, { cols = 80, rows = 24 } = {}) {
  const child = spawn('python3', ['-c', PTY_PY, ...argv], {
    stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
    env: { ...process.env, DNLS_COLS: String(cols), DNLS_ROWS: String(rows) },
  })
  child.resize = (nextCols, nextRows) => {
    const c = Math.trunc(Number(nextCols))
    const r = Math.trunc(Number(nextRows))
    if (!(c >= 2 && c <= 512 && r >= 2 && r <= 512)) return
    try { child.stdio[3]?.write(`${r} ${c}\n`) } catch { /* pty exiting */ }
  }
  return child
}
