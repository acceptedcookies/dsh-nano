export function profileFixture(overrides = {}) {
  return {
    id: 'kitesurf',
    version: 1,
    scope: 'session',
    build: { base: 'node:22-bookworm-slim', digest: 'sha256:' + 'ab'.repeat(32) },
    runtime: { isolation: { resources: { cpus: 4, memory: '4G' } } },
    lifecycle: { idleTimeoutMs: 1800000, maxInstances: 2, ...overrides.lifecycle },
    ...overrides,
    lifecycle: { idleTimeoutMs: 1800000, maxInstances: 2, ...overrides.lifecycle },
  }
}
