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

/** Profile-local ids: emitted by the host or the bridge under this namespace. */
const ERROR_ROWS = [
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

export default function createDriver(api) {
  settings.configure(api)
  history.configure(api)
  return {
    id: 'kitesurf',
    validateManifest: runtime.validateManifest,
    buildArgs: runtime.buildArgs,
    build: runtime.build,
    image: runtime.image,
    runtimeRoot: runtime.runtimeRoot,
    assertRuntime: runtime.assertRuntime,
    mounts: runtime.mounts,
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
      probes: { 'bridge-writer-free': bridgeWriterFree },
    },
    errors: { namespace: 'kitesurf', rows: ERROR_ROWS },
  }
}
