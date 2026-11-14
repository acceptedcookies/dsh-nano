// src/host/gate.js
var PASTE_GAP_MS = 200;
var Gate = class {
  constructor({ notesQuietMs = 3e3, draftWaitMs = 6e4 } = {}) {
    this.notesQuietMs = notesQuietMs;
    this.draftWaitMs = draftWaitMs;
    this.draft = 0;
    this.lastHumanKey = 0;
    this.busy = false;
    this.held = [];
    this.queue = Promise.resolve();
  }
  /** Human input: returns bytes to write now, or '' while held. */
  humanInput(data) {
    this.#observe(data);
    if (this.busy) {
      this.held.push(data);
      return null;
    }
    return data;
  }
  /** Feed the draft estimator — mirrors hc's Gate::observe. */
  #observe(data) {
    const bytes = typeof data === "string" ? Buffer.from(data, "utf8") : data;
    let i = 0;
    this.lastHumanKey = Date.now();
    while (i < bytes.length) {
      const b = bytes[i];
      if (b === 27 && bytes[i + 1] === 91 && bytes[i + 2] === 50 && bytes[i + 3] === 48 && bytes[i + 4] === 48 && bytes[i + 5] === 126) {
        const end = findSeq(bytes, i + 6, "\x1B[201~");
        this.draft = Math.max(1, end < 0 ? this.draft + (bytes.length - i - 6) : 1);
        i = end < 0 ? bytes.length : end + 6;
        continue;
      }
      if (b === 13 || b === 3 || b === 21) this.draft = 0;
      else if (b === 127) this.draft = Math.max(0, this.draft - 1);
      else if (b === 27) {
        i = skipEscape(bytes, i);
        continue;
      } else if (b >= 32) this.draft += 1;
      i++;
    }
  }
  /**
   * Agent delivery: waits the draft window, then runs `deliver()` exclusively
   * (human bytes held meanwhile). `kind:'note'` additionally requires
   * notesQuietMs of human silence — a note never interrupts active typing.
   * Returns deliver() result.
   */
  async submit(deliver, { urgent = false, kind = "send" } = {}) {
    const run = this.queue.then(async () => {
      if (!urgent) await this.#waitWindow(kind);
      this.busy = true;
      try {
        return await deliver();
      } finally {
        this.busy = false;
        if (this.held.length) {
          const flush = this.held;
          this.held = [];
          this.flushHeld?.(flush);
        }
      }
    });
    this.queue = run.catch(() => {
    });
    return run;
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
    for (; ; ) {
      const quietFor = Date.now() - this.lastHumanKey;
      if (this.draft === 0) {
        const need = kind === "note" ? this.notesQuietMs : PASTE_GAP_MS;
        if (quietFor >= need) return;
      } else if (quietFor >= this.draftWaitMs) {
        return;
      }
      await sleep(25);
    }
  }
  /** Persistable state (draft only — queues don't survive restarts). */
  snapshot() {
    return { draft: this.draft, lastHumanKey: this.lastHumanKey, notesQuietMs: this.notesQuietMs, draftWaitMs: this.draftWaitMs };
  }
  restore(s) {
    if (!s) return;
    this.draft = s.draft ?? 0;
    this.lastHumanKey = s.lastHumanKey ?? 0;
    if (s.notesQuietMs) this.notesQuietMs = s.notesQuietMs;
    if (s.draftWaitMs) this.draftWaitMs = s.draftWaitMs;
  }
};
function findSeq(buf, from, seq) {
  const needle = Buffer.from(seq, "latin1");
  return buf.indexOf(needle, from);
}
function skipEscape(buf, i) {
  if (buf[i + 1] === 91) {
    let j = i + 2;
    while (j < buf.length && !(buf[j] >= 64 && buf[j] <= 126)) j++;
    return Math.min(j + 1, buf.length);
  }
  if (buf[i + 1] === 79) return Math.min(i + 3, buf.length);
  return Math.min(i + 2, buf.length);
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
export {
  Gate
};
