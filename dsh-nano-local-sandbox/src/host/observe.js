/** One observation document. Routes and MCP project this; they do not invent a second boolean. */

export const OBSERVE_V = 1

const LABELS = {
  container: '容器',
  engine: '引擎',
  page: '页面',
  dom: 'DOM',
  bridge: '桥',
}

/**
 * @param {object} input
 * @param {string} input.containerName
 * @param {string} input.containerState inspect state: running | missing | other
 * @param {boolean} input.httpUp GET /json/list succeeded
 * @param {boolean} input.cdpUp Browser.getVersion succeeded
 * @param {number} input.cdpGeneration
 * @param {{state:string, url?:string, detail?:string}} input.page none | blank | open
 * @param {{state:string, detail?:string}} input.dom skipped | ready | failed
 * @param {{state:string, detail?:string}} input.bridge up | down
 * @param {{state:string}} input.terminal absent | listening | policy-stale
 * @param {number} input.epoch
 * @param {string} input.observedAt
 * @param {string} input.buildId
 * @param {object} input.effective
 * @param {object} input.ports
 */
export function projectSnapshot(input) {
  const engineState = input.cdpUp ? 'cdp' : input.httpUp ? 'http-only' : 'down'
  const pageState = input.page?.state || 'none'
  const domState = input.dom?.state || 'failed'
  const bridgeState = input.bridge?.state || 'down'
  const terminalState = input.terminal?.state || 'absent'
  const containerRunning = input.containerState === 'running'
  const planes = {
    // 'unknown' survives as its own plane state: a backend that can't answer
    // is not 'stopped' and must not read as a clean missing either.
    container: { plane: 'container', state: containerRunning ? 'running' : input.containerState === 'missing' ? 'missing' : input.containerState === 'unknown' ? 'unknown' : 'stopped', ok: containerRunning },
    engine: { plane: 'engine', state: engineState, ok: engineState === 'cdp', httpBase: input.effective?.httpBase ?? null, cdpGeneration: input.cdpGeneration || 0 },
    page: { plane: 'page', state: pageState, ok: pageState === 'open' || pageState === 'blank', url: input.page?.url ?? null, detail: input.page?.detail ?? '' },
    dom: { plane: 'dom', state: domState, ok: domState === 'ready' || domState === 'skipped', detail: input.dom?.detail ?? '', skipped: domState === 'skipped' },
    bridge: { plane: 'bridge', state: bridgeState, ok: bridgeState === 'up', detail: input.bridge?.detail ?? '' },
    terminal: { plane: 'terminal', state: terminalState },
  }
  const ready = planes.container.ok === true
    && planes.engine.state === 'cdp'
    && planes.page.ok === true
    && planes.bridge.ok === true
    && (planes.dom.state === 'ready' || planes.dom.state === 'skipped')
  const degraded = ['container', 'engine', 'page', 'dom', 'bridge'].filter((id) => {
    if (id === 'dom' && planes.dom.skipped === true) return false
    return planes[id].ok !== true
  })
  const checks = {
    container: { ok: planes.container.ok, detail: input.containerState },
    engine: { ok: planes.engine.ok, state: engineState, detail: engineState === 'cdp' ? (input.effective?.httpBase || 'cdp') : engineState },
    page: { ok: planes.page.ok, detail: planes.page.detail || planes.page.url || pageState },
    dom: { ok: planes.dom.ok, detail: planes.dom.detail, skipped: planes.dom.skipped === true },
    bridge: { ok: planes.bridge.ok, detail: planes.bridge.detail },
  }
  const summary = ['container', 'engine', 'page', 'dom', 'bridge'].map((id) => ({
    plane: id,
    label: LABELS[id],
    ...checks[id],
  }))
  return {
    v: OBSERVE_V,
    epoch: input.epoch,
    observedAt: input.observedAt,
    subject: { containerName: input.containerName },
    planes,
    ready,
    live: planes.engine.state === 'cdp',
    degraded,
    healthy: ready,
    containerName: input.containerName,
    container: { state: input.containerState, name: input.containerName },
    effective: input.effective,
    ports: input.ports,
    engineAlive: input.httpUp === true,
    checks,
    summary,
    buildId: input.buildId,
    cdpGeneration: input.cdpGeneration || 0,
  }
}

export function bumpEpoch(session, planes) {
  const sig = ['container', 'engine', 'page', 'dom', 'bridge', 'terminal'].map((id) => planes[id]?.state ?? '').join('|')
  if (session.observeSig !== sig) {
    session.observeSig = sig
    session.epoch = (session.epoch || 0) + 1
  }
  if (!session.epoch) session.epoch = 1
  return session.epoch
}
