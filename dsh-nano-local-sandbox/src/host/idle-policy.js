import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'

const pending = op => ['accepted', 'running', 'indeterminate'].includes(op.state)

/**
 * Only a driver that can prove *continuous* inactivity supplies an activity epoch.
 * Broker uncertainty, a live detached terminal, and long-running service duties preclude that proof.
 */
export function createIdlePolicy({ registry, observe, profileFor, envId, uses, stop, clock = () => performance.now(), cadenceMs = 1000 }) {
  let timer, task, closed = false
  const windows = new Map()
  const touch = id => { windows.delete(id) }
  const eligible = (r, opId) => !!r?.binding.generation &&
    !r.operations.some(op => pending(op) && op.operationId !== opId) &&
    !r.terminals.some(t => t.generation === r.binding.generation && t.state !== 'ended') && !uses.list(r.sandboxId).length
  const live = (r, obs) => obs?.state === 'running' && obs.locator === r.binding.locator &&
    obs.generation === r.binding.generation && obs.stateVolume === r.stateVolume

  async function poll() {
    const rows = registry.list()
    const present = new Set(rows.map(row => row.sandboxId))
    for (const id of windows.keys()) if (!present.has(id)) touch(id)
    for (const row of rows) {
      if (closed) return
      const id = row.sandboxId
      if (!eligible(row)) { touch(id); continue }
      try {
        const p = await profileFor({ envId, profileId: row.profileId })
        const timeout = row.idleTimeoutMs ?? (row.origin === 'created' ? p.idleTimeoutMs : null)
        if (typeof p.idleEvidence !== 'function' || !(timeout > 0)) { touch(id); continue }
        const now = clock()
        let w = windows.get(id)
        if (!w || w.generation !== row.binding.generation || now < w.last || now - w.last > cadenceMs * 2 || w.timeout !== timeout) {
          w = { generation: row.binding.generation, epoch: null, timeout, since: now, last: now, requestId: `idle-${randomUUID()}` }
          windows.set(id, w)
        }
        const obs = await observe(row)
        const proof = live(row, obs) ? await p.idleEvidence(row, obs) : null
        const valid = (opId) => !closed && windows.get(id) === w && eligible(registry.get(id), opId) &&
          registry.get(id)?.binding.generation === w.generation
        if (!valid() || !proof?.idle || typeof proof.activityEpoch !== 'string' || !proof.activityEpoch) { touch(id); continue }
        if (proof.activityEpoch !== w.epoch) { w.since = now; w.epoch = proof.activityEpoch }
        w.last = now
        if (now - w.since < timeout) continue
        await stop(row, w.requestId, async opId => {
          if (!valid(opId)) return false
          const obs = await observe(row)
          const next = live(row, obs) ? await p.idleEvidence(row, obs) : null
          return valid(opId) && next?.idle === true && next.activityEpoch === w.epoch
        })
        touch(id)
      } catch { touch(id) } // no proof after any failed observation; restart the entire window
    }
  }
  function tick() {
    if (!closed && !task) task = poll().finally(() => { task = null })
    return task
  }
  function start() {
    if (!closed && !timer) timer = setInterval(() => { tick()?.catch(() => windows.clear()) }, cadenceMs).unref()
  }
  async function close() { closed = true; clearInterval(timer); windows.clear(); await task }
  return { tick, touch, start, close }
}
