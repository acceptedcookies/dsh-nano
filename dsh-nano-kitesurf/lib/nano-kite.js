/**
 * /nano-kite session. Init writes one lock. Later inits return that lock.
 * start, suspend, and resume move the phase and run the host hooks
 * (onStart/onSuspend/onResume) the plugin wires in; on the loopback engine
 * those hooks do spawn and stop the local container.
 */

import { KitesurfError } from './engine.js'
import { isLoopback } from './container-engine.js'

export const PITFALLS = [
  'workerd 不能在 arm64 Alpine 上跑：__res_init 缺失。用户空间用 Debian bookworm。',
  '浏览器 WebSocket 一关，Kitesurf 会把页面打回 about:blank。open、截图、点选必须共用一条连接。',
  '顶层文档出站超过 25 秒时，页面正文是 kitesurf: egress timeout，编号 kitesurf.navigate.egress。',
  '本机 8787 可能是别的程序。这台机器上的容器引擎在 8798，MCP 桥在 8799。',
  '不要把对话 UI 再注入一次，也不要用本机 Chrome 代替 Kitesurf。',
  'init 不启动容器。容器没在听时，start 和 resume 必须是 kitesurf.kite.start / kitesurf.kite.resume，不能报成 kitesurf.engine.failed。',
  '锁不能放在插件目录里。dsh-dev restart 会覆盖那份目录，锁会消失。锁在 DSH_HOME/nano-kitesurf.lock.json。',
]

/**
 * @param {object} [options]
 * @param {string} [options.lockPath]
 * @param {{ readFile: Function, writeFile: Function, mkdir: Function }} [options.fs]
 * @param {string} [options.nodeVersion]
 * @param {string} [options.httpBase]
 * @param {number} [options.mcpPort]
 * @param {boolean} [options.allowRemote] same rule as Config: remote engine
 *   origins are refused unless the profile opted in.
 */
export function createNanoKite(options = {}) {
  const lockPath = options.lockPath || 'runtime/nano-kite.lock.json'
  const fs = options.fs
  const nodeVersion = options.nodeVersion || process.versions.node
  const allowRemote = options.allowRemote === true
  let phase = 'idle'
  let httpBase = options.httpBase || 'http://127.0.0.1:8787'
  let mcpPort = options.mcpPort ?? 8799
  /** @type {object | null} */
  let lock = null

  function snapshot() {
    return { phase, httpBase, mcpPort, cdp: browserSocket(httpBase), lock }
  }

  return {
    snapshot,
    async init() {
      if (!fs) throw new KitesurfError('kitesurf.kite.init', '初始化没有可写的锁文件')
      // The Node floor is checked before the lock, not only on first write:
      // an already:true answer must still mean agent-browser can run.
      const major = Number(String(nodeVersion).split('.')[0])
      if (!Number.isFinite(major) || major < 22) {
        throw new KitesurfError('kitesurf.kite.node', `需要 Node.js 22 或更新，当前是 ${nodeVersion}`)
      }
      const existing = await readLock(fs, lockPath)
      if (existing) {
        lock = existing
        return { ok: true, already: true, lock: existing }
      }
      const next = {
        version: 1,
        at: new Date().toISOString(),
        node: nodeVersion,
        pitfalls: PITFALLS,
      }
      await fs.mkdir(dirname(lockPath), { recursive: true })
      await fs.writeFile(lockPath, `${JSON.stringify(next, null, 2)}\n`)
      lock = next
      return { ok: true, already: false, lock: next }
    },
    async start() {
      // One path per transition: suspended engines go through resume so the
      // agent cannot skip the suspend→resume semantics by calling start.
      if (phase !== 'idle') throw new KitesurfError('kitesurf.kite.state', '只有空闲的引擎可以启动；休眠中的引擎请恢复')
      if (options.onStart) await options.onStart(snapshot())
      phase = 'running'
      return snapshot()
    },
    async suspend() {
      if (phase !== 'running') throw new KitesurfError('kitesurf.kite.state', '只有运行中的引擎可以休眠')
      if (options.onSuspend) await options.onSuspend(snapshot())
      phase = 'suspended'
      return snapshot()
    },
    async resume() {
      if (phase !== 'suspended') throw new KitesurfError('kitesurf.kite.state', '只有休眠中的引擎可以恢复')
      if (options.onResume) await options.onResume(snapshot())
      phase = 'running'
      return snapshot()
    },
    configure(patch) {
      const next = patch && typeof patch === 'object' ? patch : {}
      if (next.httpBase != null) httpBase = engineOrigin(next.httpBase, allowRemote)
      if (next.mcpPort != null) mcpPort = mcpPortOf(next.mcpPort)
      return snapshot()
    },
    /**
     * Re-adopt a live engine after a host restart: the phase was in-memory
     * only, so a running container reads as 'idle' and the pane shows
     * "start engine" while the engine is fine. The caller probes /health
     * first; adopt() just trusts that verdict instead of re-doing the check.
     */
    adopt() {
      if (phase !== 'idle') return snapshot() // already tracked — nothing to fix
      phase = 'running'
      return snapshot()
    },
  }
}

/**
 * Engine origin contract, shared by Config.validate (load time) and
 * configure (runtime): http(s), no credentials, loopback unless the profile
 * opted into remote engines. One rule, one implementation.
 * @param {string} raw
 * @param {boolean} [allowRemote]
 */
export function engineOrigin(raw, allowRemote = false) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new KitesurfError('kitesurf.kite.origin', '引擎地址是空的')
  }
  let url
  try {
    url = new URL(raw.trim())
  } catch {
    throw new KitesurfError('kitesurf.kite.origin', '引擎地址无效')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new KitesurfError('kitesurf.kite.origin', '引擎地址只支持 HTTP 和 HTTPS')
  }
  if (url.username || url.password) {
    throw new KitesurfError('kitesurf.url.credentials', '引擎地址不能包含用户名或密码')
  }
  if (!allowRemote && !isLoopback(url.origin)) {
    throw new KitesurfError('kitesurf.kite.remote', '只允许本机引擎。要指远程引擎请在 profile 里写 allowRemote: true')
  }
  return url.origin
}

export function mcpPortOf(value) {
  const port = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new KitesurfError('kitesurf.kite.mcpPort', 'MCP 端口必须是 1 到 65535 的整数')
  }
  return port
}

export function browserSocket(httpBase) {
  const url = new URL(httpBase)
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${url.host}/devtools/browser`
}

function dirname(file) {
  const index = Math.max(file.lastIndexOf('/'), file.lastIndexOf('\\'))
  return index <= 0 ? '.' : file.slice(0, index)
}

async function readLock(fs, lockPath) {
  try {
    const text = await fs.readFile(lockPath, 'utf8')
    const parsed = JSON.parse(text)
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.pitfalls)) return null
    return parsed
  } catch {
    return null
  }
}
