import { randomUUID } from 'node:crypto'

/** Emit only public health, on a host-owned guest channel, never on the published HTTP port. */
export function createBridgePublisher({ envId, registry, observe, publish, onError }) {
  const epoch = randomUUID()
  const bound = new Map()
  let timer, flight, closed = false
  async function pass() {
    const current = registry.list()
    const ids = new Set(current.map(row => row.sandboxId))
    for (const id of bound.keys()) if (!ids.has(id)) bound.delete(id)
    for (const row of current) {
      if (closed) break
      if (row.origin !== 'created' || !row.binding.generation || !row.ports.some(p => p.serviceId)) continue
      const obs = await observe(row)
      const fresh = registry.get(row.sandboxId)
      if (closed || !fresh || obs?.state !== 'running' || obs.locator !== row.binding.locator ||
          obs.generation !== row.binding.generation || obs.stateVolume !== row.stateVolume ||
          fresh.binding.generation !== obs.generation || fresh.operations.some(op => ['accepted', 'running', 'indeterminate'].includes(op.state))) continue
      const prev = bound.get(row.sandboxId)
      const seq = prev?.generation === obs.generation ? prev.seq + 1 : 1
      // Never retry an uncertain publish: an overflowing seq is refused here
      // rather than wrapped or replayed.
      if (!Number.isSafeInteger(seq)) { onError?.('bridge health seq overflow'); continue }
      const doc = { contractVersion: 'dnls.control/1', envId, sandboxId: row.sandboxId, generation: obs.generation,
        epoch, seq, observedAt: obs.observedAt, state: 'running', health: 'unknown' }
      await publish(obs.locator, doc)
      bound.set(row.sandboxId, { seq, generation: obs.generation })
    }
  }
  const tick = () => closed ? null : (flight ??= pass().finally(() => { flight = null }))
  function start() {
    if (!closed && !timer) timer = setInterval(() => { tick()?.catch(() => onError?.('bridge projection unavailable')) }, 30000).unref()
  }
  async function close() { closed = true; clearInterval(timer); await flight }
  return { tick, start, close }
}
