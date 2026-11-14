// Input gate: serializes human and agent input per terminal (herdr-core
// input.rs model). One queue + one Gate per record.
//
//   draft      — estimated unfinished draft chars from the *human* byte
//                stream (bracketed paste counts as one whole draft chunk).
//                Cleared on Enter/^C/^U, decremented on Backspace.
//   notes_quiet— seconds of human silence required before an agent delivery.
//   draft_wait — max seconds a draft may hold agent delivery (default 60).
//   busy       — while an agent delivery is in flight, human bytes are held
//                and flushed after it; the two never interleave.
//   AUTOMATIC_INPUT — terminal auto-replies (DA/CPR/DSR) bypass the gate
//                entirely: they are not human activity, never reset quiet.
//
// The gate state is snapshotable (persisted layout restores keep draft state).

const PASTE_GAP_MS = 200

export class Gate {
  constructor({ notesQuietMs = 3000, draftWaitMs = 60_000 } = {}) {
    this.notesQuietMs = notesQuietMs
    this.draftWaitMs = draftWaitMs
    this.draft = 0
    this.lastHumanKey = 0 // epoch ms of last human byte
    this.busy = false
    this.held = [] // human bytes held during an agent delivery
    this.queue = Promise.resolve() // serializes agent deliveries
  }

  /** Human input: returns bytes to write now, or '' while held. */
  humanInput(data) {
    this.#observe(data)
    if (this.busy) {
      this.held.push(data)
      return null
    }
    return data
  }

  /** Feed the draft estimator — mirrors hc's Gate::observe. */
  #observe(data) {
    const bytes = typeof data === 'string' ? Buffer.from(data, 'utf8') : data
    let i = 0
    this.lastHumanKey = Date.now()
    while (i < bytes.length) {
      const b = bytes[i]
      // bracketed paste: \x1b[200~ … \x1b[201~ counts as one draft chunk
      if (b === 0x1b && bytes[i + 1] === 0x5b && bytes[i + 2] === 0x32 && bytes[i + 3] === 0x30 && bytes[i + 4] === 0x30 && bytes[i + 5] === 0x7e) {
        const end = findSeq(bytes, i + 6, '\x1b[201~')
        this.draft = Math.max(1, end < 0 ? this.draft + (bytes.length - i - 6) : 1)
        i = end < 0 ? bytes.length : end + 6
        continue
      }
      if (b === 0x0d || b === 0x03 || b === 0x15) this.draft = 0 // Enter, ^C, ^U
      else if (b === 0x7f) this.draft = Math.max(0, this.draft - 1)
      else if (b === 0x1b) {
        // escape sequence: skip CSI/SS3 — not draft chars
        i = skipEscape(bytes, i)
        continue
      } else if (b >= 0x20) this.draft += 1
      i++
    }
  }

  /**
   * Agent delivery: waits the draft window, then runs `deliver()` exclusively
   * (human bytes held meanwhile). `kind:'note'` additionally requires
   * notesQuietMs of human silence — a note never interrupts active typing.
   * Returns deliver() result.
   */
  async submit(deliver, { urgent = false, kind = 'send' } = {}) {
    const run = this.queue.then(async () => {
      if (!urgent) await this.#waitWindow(kind)
      this.busy = true
      try {
        return await deliver()
      } finally {
        this.busy = false
        if (this.held.length) {
          const flush = this.held
          this.held = []
          this.flushHeld?.(flush)
        }
      }
    })
    this.queue = run.catch(() => {})
    return run
  }

  /**
   * hc Gate::wait semantics:
   *   draft > 0  — hold until the human clears it (Enter/^C/^U) or
   *                draftWaitMs elapses since the last key; quiet alone does
   *                NOT release (the human may resume typing).
   *   draft == 0 — only PASTE_GAP after Enter/clear for sends; notes require
   *                notesQuietMs of silence on top.
   */
  async #waitWindow(kind) {
    for (;;) {
      const quietFor = Date.now() - this.lastHumanKey
      if (this.draft === 0) {
        const need = kind === 'note' ? this.notesQuietMs : PASTE_GAP_MS
        if (quietFor >= need) return
      } else if (quietFor >= this.draftWaitMs) {
        return // draft held its maximum — deliver anyway
      }
      await sleep(25)
    }
  }

  /** Persistable state (draft only — queues don't survive restarts). */
  snapshot() {
    return { draft: this.draft, lastHumanKey: this.lastHumanKey, notesQuietMs: this.notesQuietMs, draftWaitMs: this.draftWaitMs }
  }
  restore(s) {
    if (!s) return
    this.draft = s.draft ?? 0
    this.lastHumanKey = s.lastHumanKey ?? 0
    if (s.notesQuietMs) this.notesQuietMs = s.notesQuietMs
    if (s.draftWaitMs) this.draftWaitMs = s.draftWaitMs
  }
}

function findSeq(buf, from, seq) {
  const needle = Buffer.from(seq, 'latin1')
  return buf.indexOf(needle, from)
}

function skipEscape(buf, i) {
  // CSI: ESC [ … final(0x40-0x7e); SS3: ESC O <one>; others: ESC <one>
  if (buf[i + 1] === 0x5b) {
    let j = i + 2
    while (j < buf.length && !(buf[j] >= 0x40 && buf[j] <= 0x7e)) j++
    return Math.min(j + 1, buf.length)
  }
  if (buf[i + 1] === 0x4f) return Math.min(i + 3, buf.length)
  return Math.min(i + 2, buf.length)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
