// src/host/events.js
var HEARTBEAT_MS = 15e3;
var RING_CAP = 2048;
var EventBus = class {
  constructor({ registry, audit }) {
    this.registry = registry;
    this.audit = audit ?? (() => {
    });
    this.seq = 0;
    this.ring = [];
    this.oldestSeq = 1;
    this.subs = /* @__PURE__ */ new Set();
    this.timer = setInterval(() => this.#beat(), HEARTBEAT_MS);
    this.timer.unref?.();
  }
  /** Emit a terminal event. type/addr required; extra fields folded in. */
  emit(type, addr, data = {}) {
    const ev = { seq: ++this.seq, type, addr, t: Date.now(), ...data };
    this.ring.push(ev);
    if (this.ring.length > RING_CAP) {
      this.ring.shift();
      this.oldestSeq = this.ring[0]?.seq ?? this.seq + 1;
    }
    for (const fn of [...this.subs]) {
      try {
        fn(ev);
      } catch {
      }
    }
    return ev;
  }
  #beat() {
    const ev = { seq: this.seq, type: "heartbeat", t: Date.now() };
    for (const fn of [...this.subs]) {
      try {
        fn(ev);
      } catch {
      }
    }
  }
  /** Full snapshot: current seq + all terminal infos. */
  snapshot() {
    return { seq: this.seq, terminals: this.registry.list() };
  }
  /**
   * Events newer than `since`. When the consumer fell behind the ring,
   * returns {missed:true, snapshot} — semantics identical to a resubscribe.
   */
  since(since) {
    const s = Number(since) || 0;
    if (s < this.oldestSeq - 1 && this.ring.length) {
      return { seq: this.seq, missed: true, snapshot: this.snapshot() };
    }
    return { seq: this.seq, events: this.ring.filter((e) => e.seq > s) };
  }
  /**
   * Subscribe a consumer. It receives the snapshot first (as one synthetic
   * message), then live events. Returns unsubscribe.
   */
  subscribe(fn, { since } = {}) {
    try {
      fn({ type: "snapshot", ...this.since(since) });
    } catch {
      return () => {
      };
    }
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }
  dispose() {
    clearInterval(this.timer);
    this.subs.clear();
    this.ring.length = 0;
  }
};
export {
  EventBus
};
