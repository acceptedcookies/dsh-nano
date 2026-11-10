/** Shared fakes for node --test. No real DOM/PerformanceObserver needed. */

export function fakePerf(start = 1000) {
  const measures = []
  return {
    t: start,
    measures,
    now() { return this.t },
    advance(ms) { this.t += ms },
    measure(name, opts) { measures.push({ name, ...opts }) },
  }
}

/** Minimal Element fake: tag, attrs, parent chain, contains via ancestors. */
export function el(tag, attrs = {}, children = []) {
  const node = {
    tagName: tag.toUpperCase(),
    attrs: { ...attrs },
    parentElement: null,
    children,
    hidden: false,
    isConnected: true,
  }
  node.hasAttribute = name => name in node.attrs
  node.contains = other => {
    let current = other
    while (current != null) {
      if (current === node) return true
      current = current.parentElement
    }
    return false
  }
  for (const child of children) child.parentElement = node
  return node
}

/** Fake PerformanceObserver capturing callback + observe options per instance. */
export function fakePerformanceObserver() {
  const instances = []
  class FakePO {
    constructor(callback) {
      this.callback = callback
      this.observed = []
      instances.push(this)
    }
    observe(opts) {
      this.observed.push(opts)
      if (opts.type === 'long-animation-frame' && FakePO.failLoaf) throw new Error('loaf unsupported')
    }
    emit(entries) { this.callback({ getEntries: () => entries }) }
    disconnect() {}
  }
  FakePO.instances = instances
  FakePO.failLoaf = false
  return FakePO
}

export function fakeEnv(overrides = {}) {
  const perf = overrides.performance ?? fakePerf()
  return {
    performance: perf,
    PerformanceObserver: overrides.PerformanceObserver ?? fakePerformanceObserver(),
    navigator: { userAgent: 'Mozilla/5.0 Chrome/143.0.0.0' },
    forceEnabled: overrides.forceEnabled ?? true,
    global: {},
    ...overrides,
    performance: perf,
  }
}
