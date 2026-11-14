// Event bus for dnt terminals — snapshot + seq + incremental events + missed.
// Modeled on herdr-core's subscription semantics:
//   subscribe → {snapshot, seq} immediately; then {type, seq, addr, ...} events.
//   A lagging consumer (since < oldest kept seq) gets {missed:true, snapshot}.
//   heartbeat every HEARTBEAT_MS carries the current seq.
// Event types (schema-canonical):
//   created | finished | removed | status | turn | title | labels | size
//   | restarted | heartbeat | missed

const HEARTBEAT_MS = 15_000
const RING_CAP = 2048

export class EventBus {
  constructor({ registry, audit }) {
    this.registry = registry
    this.audit = audit ?? (() => {})
    this.seq = 0
    /** @type {Array<object>} newest-last ring of events (no heartbeats) */
    this.ring = []
    this.oldestSeq = 1 // smallest seq still in ring
    /** @type {Set<(ev: object) => void>} */
    this.subs = new Set()
    this.timer = setInterval(() => this.#beat(), HEARTBEAT_MS)
    this.timer.unref?.()
  }

  /** Emit a terminal event. type/addr required; extra fields folded in. */
  emit(type, addr, data = {}) {
    const ev = { seq: ++this.seq, type, addr, t: Date.now(), ...data }
    this.ring.push(ev)
    if (this.ring.length > RING_CAP) {
      this.ring.shift()
      this.oldestSeq = this.ring[0]?.seq ?? this.seq + 1
    }
    for (const fn of [...this.subs]) {
      try { fn(ev) } catch { /* a dead consumer must not break emit */ }
    }
    return ev
  }

  #beat() {
    const ev = { seq: this.seq, type: 'heartbeat', t: Date.now() }
    for (const fn of [...this.subs]) {
      try { fn(ev) } catch { /* ignore */ }
    }
  }

  /** Full snapshot: current seq + all terminal infos. */
  snapshot() {
    return { seq: this.seq, terminals: this.registry.list() }
  }

  /**
   * Events newer than `since`. When the consumer fell behind the ring,
   * returns {missed:true, snapshot} — semantics identical to a resubscribe.
   */
  since(since) {
    const s = Number(since) || 0
    if (s < this.oldestSeq - 1 && this.ring.length) {
      return { seq: this.seq, missed: true, snapshot: this.snapshot() }
    }
    return { seq: this.seq, events: this.ring.filter((e) => e.seq > s) }
  }

  /**
   * Subscribe a consumer. It receives the snapshot first (as one synthetic
   * message), then live events. Returns unsubscribe.
   */
  subscribe(fn, { since } = {}) {
    try {
      fn({ type: 'snapshot', ...this.since(since) })
    } catch { return () => {} }
    this.subs.add(fn)
    return () => this.subs.delete(fn)
  }

  dispose() {
    clearInterval(this.timer)
    this.subs.clear()
    this.ring.length = 0
  }
}
