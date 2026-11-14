// Session persistence (herdr session.json + hc keep/restore model).
//   ${DSH_HOME}/plugins/dsh-nano-terminal/session.json
//     { version, savedAt, terminals: [ {addr,name,lane,title,parent(addr),
//        keep,labels,meta:{cwd,cols,rows},gate} ] }
//   ${DSH_HOME}/plugins/dsh-nano-terminal/screens/<id>.bin
//     raw output tail — replayed into the respawned shell so `hc read`-style
//     reads match the old screen (the program itself is never rerun).
//   session-snapshots/ keeps ≤48 rolling snapshots (≥15min apart, deduped).
//
// Restored terminals come back as *placeholders*: no process until first
// attach, then a fresh shell spawns and the saved screen replays above it.

import { writeFileSync, readFileSync, renameSync, mkdirSync, readdirSync, copyFileSync, existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const VERSION = 1
const SNAP_KEEP = 48
const SNAP_MIN_MS = 15 * 60 * 1000
const SCREEN_TAIL = 64 * 1024

export class Persist {
  constructor(dir) {
    this.dir = dir
    this.file = join(dir, 'session.json')
    this.screens = join(dir, 'screens')
    this.snaps = join(dir, 'session-snapshots')
    this.timer = null
    this.lastSnap = 0
    this.lastHash = ''
    try {
      mkdirSync(this.screens, { recursive: true })
      mkdirSync(this.snaps, { recursive: true })
    } catch { /* best-effort */ }
  }

  /** Debounced write — registry calls on every mutating event. */
  schedule(registry) {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.write(registry), 800)
    this.timer.unref?.()
  }

  write(registry) {
    const terminals = [...registry.sessions.values()].map((r) => ({
      id: r.id,
      addr: r.addr,
      name: r.name,
      lane: r.lane,
      title: r.title,
      owner: r.owner,
      parent: r.parent,
      keep: r.keep,
      labels: r.labels,
      meta: { cwd: r.meta.cwd, cols: r.meta.cols, rows: r.meta.rows, shell: r.meta.shell },
      gate: r.gate?.snapshot?.(),
      exited: !!r.exited,
    }))
    const doc = JSON.stringify({ version: VERSION, savedAt: Date.now(), terminals }, null, 1)
    try {
      // atomic: tmp + rename (hc latest-wins writer)
      writeFileSync(this.file + '.tmp', doc)
      renameSync(this.file + '.tmp', this.file)
      for (const r of registry.sessions.values()) this.saveScreen(r)
      this.#maybeSnapshot(doc)
    } catch { /* persistence is best-effort */ }
  }

  saveScreen(rec) {
    try {
      const tail = Buffer.concat(rec.replay).subarray(-SCREEN_TAIL)
      writeFileSync(join(this.screens, `${rec.id}.bin`), tail)
    } catch { /* ignore */ }
  }

  #maybeSnapshot(doc) {
    const now = Date.now()
    if (now - this.lastSnap < SNAP_MIN_MS) return
    const hash = String(simpleHash(doc))
    if (hash === this.lastHash) return
    this.lastSnap = now
    this.lastHash = hash
    try {
      copyFileSync(this.file, join(this.snaps, `session-${now}.json`))
      const all = readdirSync(this.snaps).sort()
      for (const f of all.slice(0, Math.max(0, all.length - SNAP_KEEP))) {
        try { rmFile(join(this.snaps, f)) } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }

  /** Load persisted terminal specs + a screen-tail reader. */
  load() {
    try {
      const doc = JSON.parse(readFileSync(this.file, 'utf8'))
      if (doc?.version !== VERSION) return null
      return doc.terminals ?? []
    } catch {
      return null
    }
  }

  screenFor(id) {
    try {
      const p = join(this.screens, `${id}.bin`)
      return existsSync(p) ? readFileSync(p) : null
    } catch {
      return null
    }
  }
}

function simpleHash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h >>> 0
}

function rmFile(p) {
  unlinkSync(p)
}
