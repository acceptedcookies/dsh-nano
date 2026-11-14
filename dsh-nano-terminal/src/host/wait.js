// Event-driven wait semantics (herdr-core wait.rs model).
//   wait(rec, {output, children, timeout}) resolves with {reason, turn}.
//   reason: 'status' (left working) | 'exit' | 'output' | 'children'
//         | 'message' (a note/message arrived for this terminal) | 'timeout'
//   Timeout is a check-in, not a failure — callers may wait again.
//   `output` matches on escape-stripped screen text (dump), polled lazily
//   alongside the event-driven paths.

const POLL_MS = 200

export function waitFor(rec, registry, bus, { output = null, children = null, timeoutMs = 180_000 } = {}) {
  return new Promise((resolve) => {
    let done = false
    const seen = new Set()
    const finish = (reason, extra = {}) => {
      if (done) return
      done = true
      clearTimeout(timer)
      clearInterval(poll)
      unsub()
      resolve({ reason, turn: rec.turn, ...extra })
    }

    // exit ends every kind of wait
    const unsub = bus.subscribe((ev) => {
      if (ev.type !== 'snapshot') {
        if (ev.addr === rec.addr && ev.type === 'finished') return finish('exit')
        if (ev.addr === rec.addr && ev.type === 'status') {
          if (ev.status?.state !== 'working' && rec.status?.state !== 'working') return finish('status')
          if (ev.status?.state !== 'working') return finish('status')
        }
        if (ev.addr === rec.addr && ev.type === 'message') return finish('message')
        if (children && (ev.type === 'status' || ev.type === 'finished' || ev.type === 'message')) {
          checkChildren()
        }
        return
      }
    })

    const checkChildren = () => {
      if (!children) return
      const kids = registry.childrenOf(rec)
      if (children === 'all') {
        if (kids.length && kids.every((k) => k.exited || k.status?.state !== 'working')) finish('children')
      } else if (children === 'any') {
        for (const k of kids) {
          if (seen.has(k.id)) continue
          if (k.exited || (k.status?.state && k.status.state !== 'working')) {
            seen.add(k.id)
            finish('children', { child: k.addr })
          }
        }
      }
    }

    const poll = setInterval(() => {
      if (done) return
      // status fallback for mirrors that missed a transition event
      if (rec.exited) return finish('exit')
      if (rec.status && rec.status.state !== 'working') return finish('status')
      if (output) {
        const text = rec.screenText(60, 'detection')
        if (text.includes(output)) return finish('output')
      }
      checkChildren()
    }, POLL_MS)
    poll.unref?.()

    const timer = setTimeout(() => finish('timeout'), timeoutMs)
    timer.unref?.()

    // immediate resolution for already-satisfied conditions
    if (rec.exited) return finish('exit')
    if (rec.status && rec.status.state !== 'working') return finish('status')
    checkChildren()
  })
}

/** Map a key name to bytes (term.keys contract). */
export const NAMED_KEYS = {
  enter: '\r', esc: '\x1b', tab: '\t', backspace: '\x7f',
  'ctrl+c': '\x03', 'ctrl+d': '\x04', 'ctrl+z': '\x1a', 'ctrl+u': '\x15',
  up: '\x1b[A', down: '\x1b[B', right: '\x1b[C', left: '\x1b[D',
  f1: '\x1bOP', f2: '\x1bOQ', f3: '\x1bOR', f4: '\x1bOS',
  f5: '\x1b[15~', f6: '\x1b[17~', f7: '\x1b[18~', f8: '\x1b[19~',
  f9: '\x1b[20~', f10: '\x1b[21~', f11: '\x1b[23~', f12: '\x1b[24~',
}
