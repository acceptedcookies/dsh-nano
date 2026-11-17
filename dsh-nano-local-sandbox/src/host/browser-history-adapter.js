import { createHash } from 'node:crypto'
import { CDP_TIMEOUTS, withPage } from './cdp-elements.js'

const HISTORY_LIMIT = 1000

function historyError(message) {
  return Object.assign(new Error(message), { status: 400, errorId: 'kitesurf.history.body' })
}

function idFor(url) {
  return `url-${createHash('sha256').update(url).digest('hex').slice(0, 24)}`
}

/** The session array is the only store; entries returned to clients are projections. */
export function createBrowserHistoryAdapter(session, { now = () => new Date().toISOString() } = {}) {
  const rows = () => {
    if (!Array.isArray(session.history)) session.history = []
    return session.history
  }

  function listHistory({ q = '', limit = 100 } = {}) {
    const needle = String(q).toLowerCase()
    const requested = Number(limit)
    const take = Number.isFinite(requested) && requested > 0
      ? Math.min(HISTORY_LIMIT, Math.floor(requested))
      : 100
    const byUrl = new Map()
    // Canonical visits are chronological. The latest visit supplies display
    // metadata; grouping supplies the address tabs and their stable delete id.
    for (const row of [...rows()].reverse()) {
      if (typeof row?.url !== 'string' || !row.url || !row.url.toLowerCase().includes(needle)) continue
      const count = Number.isSafeInteger(row.count) && row.count > 0 ? row.count : 1
      const previous = byUrl.get(row.url)
      if (previous) previous.count += count
      else byUrl.set(row.url, { id: idFor(row.url), url: row.url, at: String(row.at || ''), count })
    }
    return { total: byUrl.size, entries: [...byUrl.values()].slice(0, take) }
  }

  function recordHistory(url) {
    if (typeof url !== 'string' || !url) throw historyError('history url is required')
    const row = { id: idFor(url), url, at: now(), count: 1 }
    rows().push(row)
    return { ...row }
  }

  function removeHistory({ url, id } = {}) {
    if (!(typeof url === 'string' && url) && !(typeof id === 'string' && id)) {
      throw historyError('history url or id is required')
    }
    const current = rows()
    const address = typeof url === 'string' && url
      ? url
      : current.find(row => typeof row?.url === 'string' && (idFor(row.url) === id || row.id === id))?.url
    if (!address) return { removed: 0 }
    let removed = 0
    for (let i = current.length - 1; i >= 0; i--) {
      if (current[i]?.url === address) {
        current.splice(i, 1)
        removed += 1
      }
    }
    return { removed }
  }

  function clearHistory() {
    const current = rows()
    const removed = current.length
    current.splice(0)
    return { removed }
  }

  return { listHistory, recordHistory, removeHistory, clearHistory }
}

/** Cross-document browser history is CDP state, not the document's history.go shim. */
export async function navigateHistory(client, delta) {
  if (delta !== -1 && delta !== 1) throw historyError('delta must be -1 or +1')
  return withPage(client, async sessionId => {
    const history = await client.send('Page.getNavigationHistory', {}, sessionId)
    const entries = Array.isArray(history.entries) ? history.entries : []
    const currentIndex = history.currentIndex
    const nextIndex = currentIndex + delta
    const next = Number.isInteger(currentIndex) ? entries[nextIndex] : null
    if (!next || !Number.isInteger(next.id)) {
      return { moved: false, currentIndex, entries: entries.length }
    }
    await client.send('Page.navigateToHistoryEntry', { entryId: next.id }, sessionId, CDP_TIMEOUTS.navigate)
    // The official method discards Page.navigate's result.errorText. Observe
    // the owning page instead of presenting a recorded destination as arrival.
    const observed = await client.send('Runtime.evaluate', {
      expression: '({url:location.href,title:document.title})', returnByValue: true,
    }, sessionId)
    const actual = observed?.result?.value
    const sameAddress = (a, b) => { try { return new URL(a).href === new URL(b).href } catch { return a === b } }
    if (!actual?.url || actual.url === 'about:blank' || (!sameAddress(actual.url, next.url) && sameAddress(actual.url, entries[currentIndex]?.url))) {
      throw Object.assign(new Error('history navigation did not reach a new document'), { status: 502, errorId: 'kitesurf.navigate.failed' })
    }
    return { moved: true, url: actual.url, title: actual.title || '', currentIndex: nextIndex, entries: entries.length }
  })
}
