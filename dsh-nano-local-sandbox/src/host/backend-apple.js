import { spawn, execFile } from 'node:child_process'
import { assertPublicSpec, capabilityReport } from './backend.js'

function run(io, args) {
  io.calls.spawn += 1
  if (io.spawn) return io.spawn('container', args)
  return new Promise((resolve, reject) => {
    const child = spawn('container', args, { stdio: 'pipe' })
    let stderr = ''
    child.stderr?.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve({ code })
      else reject(new Error(stderr || `container exit ${code}`))
    })
  })
}

function runFile(io, args) {
  io.calls.spawn += 1
  if (io.execFile) return io.execFile('container', args)
  return new Promise((resolve, reject) => {
    execFile('container', args, { encoding: 'utf8' }, (error, stdout) => {
      if (error) reject(error)
      else resolve(stdout)
    })
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
    /** Image creation remains privileged here, after host confinement wraps argv. */
    async build({ ctx, contextDir, dockerfile, image, base }) {
      if (typeof ctx?.sandbox?.confine !== 'function') throw new Error('ctx.sandbox.confine is required')
      const args = ['container', 'build', '--tag', image, '--file', dockerfile, '--build-arg', `KITESURF_BASE_IMAGE=${base}`, contextDir]
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
      args.push(instance.image)
      await run(bound, args)
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
      const stdout = await runFile(bound, ['inspect', name])
      return { raw: stdout ?? '' }
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
