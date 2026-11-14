/**
 * Browse history for the Kitesurf pane.
 *
 * The Kitesurf workerd has no D1/KV binding (checked: `d1_databases` and
 * `kv_namespaces` are absent from packages/engine/wrangler.jsonc), so the
 * plugin keeps its own durable store next to the plugin entry: one JSON line
 * per visit, capped and rewritten atomically. This is the single writable
 * source for history; the pane and MCP both read it through the same API.
 */
import fs from 'node:fs'
import path from 'node:path'

const CAP = 500

export function createHistory(dir) {
  const file = path.join(dir, 'history.jsonl')

  const read = () => {
    try {
      return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => {
        try { return JSON.parse(line) } catch { return null }
      }).filter(Boolean)
    } catch { return [] }
  }

  const write = (rows) => {
    fs.mkdirSync(dir, { recursive: true })
    const tmp = `${file}.tmp`
    fs.writeFileSync(tmp, rows.slice(-CAP).map((row) => JSON.stringify(row)).join('\n') + '\n')
    fs.renameSync(tmp, file)
  }

  return {
    file,
    add(entry) {
      const rows = read()
      const last = rows[rows.length - 1]
      // Collapse consecutive visits to the same URL: reloading a page twenty
      // times should not bury everything else.
      if (last && last.url === entry.url) {
        last.at = entry.at
        last.count = (last.count || 1) + 1
        write(rows)
        return last
      }
      const row = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, count: 1, ...entry }
      rows.push(row)
      write(rows)
      return row
    },
    list({ limit = 50, offset = 0, q = '' } = {}) {
      const needle = String(q).toLowerCase()
      const rows = read().filter((row) => !needle || row.url.toLowerCase().includes(needle)).reverse()
      return { total: rows.length, entries: rows.slice(offset, offset + limit) }
    },
    remove(id) {
      const rows = read()
      const next = rows.filter((row) => row.id !== id)
      write(next)
      return rows.length !== next.length
    },
    removeUrl(url) {
      const rows = read()
      const next = rows.filter((row) => row.url !== url)
      write(next)
      return rows.length !== next.length
    },
    clear() {
      write([])
      return true
    },
    stats() {
      const rows = read()
      return { total: rows.length, file, cap: CAP }
    },
  }
}
