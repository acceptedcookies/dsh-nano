/**
 * Profile driver for the kitesurf browser engine.
 *
 * The kernel (`src/host`) owns the neutral surfaces — profile registry,
 * instance registry, backend, observation, routes — and calls the returned
 * object through the `ProfileDriver` shape. Nothing here is known by the
 * kernel, and nothing here imports the kernel: the loader injects the few
 * services the driver needs (`errorCode`, CDP helpers).
 */
import * as runtime from './runtime.js'
import * as reconciliation from './reconciliation.js'
import * as settings from './settings.js'
import * as history from './history.js'

const ENGINE_FINGERPRINT = /@?kitesurf/i

/**
 * Known public tunnel domain suffixes (T-O-66): a CONSTANT, not a security
 * boundary. Tunnels come and go and can be self-hosted, so this list can never
 * be exhaustive — it only drives the visible /open hint. Matching is exact
 * host or any subdomain suffix; it never blocks, never changes a status.
 */
const PUBLIC_TUNNEL_SUFFIXES = Object.freeze([
  'trycloudflare.com',
  'ngrok.io', 'ngrok-free.app', 'ngrok-free.dev', 'ngrok.app', 'ngrok.dev',
  'loca.lt',
  'serveo.net',
  'zrok.io',
  'bore.pub',
  'localhost.run',
])

/**
 * The /open tunnel hint: same hint on success and failure bodies, never a
 * refusal. The code is a catalog row (ERROR_ROWS, hint:true), not an errorId —
 * DNK01 T-O-6. `api.errorCode` supplies the live profile namespace.
 */
function openTunnelHint(url, api) {
  let host = ''
  try { host = new URL(String(url || '')).hostname.toLowerCase() } catch { return null }
  if (!host) return null
  const suffix = PUBLIC_TUNNEL_SUFFIXES.find((item) => host === item || host.endsWith(`.${item}`))
  if (!suffix) return null
  return `${api.errorCode('navigate.public-tunnel')}：目标主机 ${host} 命中已知公网隧道域（常量清单，非安全边界）。隧道会绕过本部署的拓扑与鉴权；本地服务请改用容器宿主网关 networking.hostGateway 直接打开。`
}

/** Profile-local ids: emitted by the host or the bridge under this namespace. */
const ERROR_ROWS = [
  // Hint code (hint:true), not an error enum row: /open attaches it on
  // tunnel-domain hits without touching the status (T-O-66; DNK01 T-O-6).
  { code: 'navigate.public-tunnel', status: 200, hint: true, cause: '目标主机命中已知公网隧道域常量清单', next: '隧道会绕过部署拓扑；本地服务改用 networking.hostGateway 直接打开' },
  { code: 'control.busy', status: 409, cause: '写所有权被另一个 MCP writer 占着', next: 'sandbox.control {action:status} 看持有者；等其 release 或 claim' },
  { code: 'control.held', status: 409, cause: 'humanHold 生效中：人工接管了页面，agent 写类调用被拒', next: '人工点击「停止写入/释放」后重试；或等待人工完成' },
  { code: 'engine.mismatch', status: 409, cause: '该 origin 的 /health 不是本 profile 引擎', next: '不要 attach；报告后 POST /nano-local-sandbox/recover' },
  { code: 'dom.stale', status: 502, cause: '该实例尚未捕获过 DOM', next: '先 GET /dom 或 POST /open' },
  { code: 'elements.stale', status: 502, cause: '桥侧尚未收到 elements 推送', next: '先 GET /nano-local-sandbox/elements' },
  { code: 'history.stale', status: 502, cause: '桥侧尚未收到 history 推送', next: '打开页面后重试' },
  { code: 'selftest.stale', status: 502, cause: '尚未跑过 selftest', next: 'GET /nano-local-sandbox/selftest' },
]

const SELFTEST_IDS = Object.freeze([
  'container-exists',
  'container-running',
  'engine-cdp-reachable',
  'engine-version',
  'page-target',
  'page-not-blank',
  'dom-renderable',
  'shot-capturable',
  'bridge-health',
  'bridge-writer-free',
  'history-consistent',
])

async function bridgeWriterFree({ bridge }) {
  if (!bridge?.base) return { ok: false, detail: 'no bridge port' }
  let data = null
  try { data = (await bridge.json('/health', 900))?.data ?? null } catch { data = null }
  if (!data) return { ok: false, detail: 'bridge unreachable' }
  let writer = data?.control?.writer ?? null
  // The bridge reports `writer:false` when free; only a truthy id is a holder.
  if (writer === false) writer = null
  return { ok: writer === null, detail: writer === null ? 'no writer held' : `held by ${writer}` }
}

/** Visits live in the instance state as one chronological list of {url, at}. */
function historyConsistent({ session }) {
  const rows = session?.history
  if (rows === undefined) return { ok: true, detail: '0 entries' }
  if (!Array.isArray(rows)) return { ok: false, detail: 'history is not a list' }
  const broken = rows.filter((row) => typeof row?.url !== 'string' || !row.url).length
  return { ok: broken === 0, detail: broken ? `${broken} of ${rows.length} entries without url` : `${rows.length} entries` }
}

export default function createDriver(api) {
  settings.configure(api)
  history.configure(api)
  return {
    id: 'kitesurf',
    // Trusted guest target of the writable state bind; the backend proves
    // the state volume only from a mount at exactly this path.
    stateTarget: '/var/lib/kitesurf-state',
    // Trusted guest target of the read-only runtime bind — the only mount
    // whose source may be reported as runtime evidence.
    runtimeTarget: '/opt/kitesurf',
    validateManifest: runtime.validateManifest,
    buildArgs: runtime.buildArgs,
    build: runtime.build,
    image: runtime.image,
    runtimeRoot: runtime.runtimeRoot,
    assertRuntime: runtime.assertRuntime,
    mounts: runtime.mounts,
    managedMounts: runtime.managedMounts,
    inspectedRecipe: reconciliation.inspectedRecipe,
    drift: reconciliation.recipeDrift,
    recreatePorts: reconciliation.recreatePorts,
    engineFingerprint: ENGINE_FINGERPRINT,
    settings: {
      apply: settings.applyBrowserSettings,
      viewport: settings.applyViewport,
      read: settings.browserSettings,
      capabilityNotes: settings.capabilityNotes,
      applyToPage: settings.applyBrowserSettingsToPage,
      /**
       * The pin consumes ks_color_scheme before the page sees the URL and
       * applies it as the document's prefers-color-scheme — a driver-level
       * navigation parameter, not a modification to the pinned engine.
       */
      decorateUrl(url, session) {
        if (session?.colorScheme !== 'light' && session?.colorScheme !== 'dark') return url
        try {
          const parsed = new URL(url)
          parsed.searchParams.set('ks_color_scheme', session.colorScheme)
          return parsed.toString()
        } catch { return url /* an invalid URL is reported by Page.navigate */ }
      },
    },
    history: {
      create: (session, options) => history.createBrowserHistoryAdapter(session, options),
      navigate: history.navigateHistory,
    },
    selftest: {
      ids: SELFTEST_IDS,
      probes: { 'bridge-writer-free': bridgeWriterFree, 'history-consistent': historyConsistent },
    },
    errors: { namespace: 'kitesurf', rows: ERROR_ROWS },
    /**
     * /open target hint: null, or a single hint string carrying its registered
     * code when the target host matches PUBLIC_TUNNEL_SUFFIXES. Same hint on
     * success and failure bodies; advisory only (T-O-66).
     */
    navigationHint(url) {
      return openTunnelHint(url, api)
    },
    /**
     * The engine marks its egress refusals two ways: an
     * `x-kitesurf-blocked:<reason>` header on the synthetic 403 (visible in the
     * recorded network ring's responseHeaders), and a `kitesurf: …` body inside
     * the wrapped <pre>. Either is proof this "successful" commit is actually a
     * refused egress. These marker strings are engine-specific — they belong
     * in the driver, never in the kernel.
     */
    blockedDocument({ landed, url, network }) {
      const rows = Array.isArray(network) ? network.slice(-12) : []
      const stripHash = (value) => String(value || '').split('#')[0]
      for (const row of rows) {
        const headers = row?.responseHeaders || {}
        const reason = Object.entries(headers).find(([key]) => key.toLowerCase() === 'x-kitesurf-blocked')?.[1]
        if (!reason) continue
        const rowUrl = stripHash(row.url)
        if (rowUrl === stripHash(landed?.url) || rowUrl === stripHash(url)) return String(reason)
      }
      const bodyText = String(landed?.bodyText || '')
      if (/^kitesurf:\s/i.test(bodyText)) {
        if (/egress timeout/i.test(bodyText)) return 'egress-timeout'
        if (/may not reach/i.test(bodyText)) return 'private-network'
        return 'kitesurf-blocked'
      }
      return null
    },
  }
}
