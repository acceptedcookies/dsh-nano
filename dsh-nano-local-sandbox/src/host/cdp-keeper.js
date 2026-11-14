export const OPEN = 1
export const CLOSED = 3
const EVALUATE_LIMIT = 2000

export function createCdpKeeper() {
  const sockets = new Map()

  function attach(instanceId, socket, { lastUrl = null, dom = null } = {}) {
    sockets.set(instanceId, { socket, lastUrl, dom, phase: 'open' })
    return sockets.get(instanceId)
  }

  async function read(instanceId, opener) {
    const rec = sockets.get(instanceId)
    if (!rec) return { ok: false, status: 502, errorId: 'sandbox.cdp.page-lost', dom: null }
    if (rec.socket.readyState === OPEN) return { ok: true, status: 200, dom: rec.dom, errorId: null }
    let opened = null
    try {
      opened = await opener(rec.lastUrl)
    } catch {
      opened = null
    }
    if (opened?.socket?.readyState === OPEN && opened.dom != null && opened.dom !== rec.dom) {
      rec.socket = opened.socket
      rec.dom = opened.dom
      rec.lastUrl = opened.lastUrl ?? rec.lastUrl
      return { ok: true, status: 200, dom: rec.dom, errorId: null }
    }
    return { ok: false, status: 502, errorId: 'sandbox.cdp.page-lost', dom: null }
  }

  async function evaluate(instanceId, expression, executor) {
    const rec = sockets.get(instanceId)
    const previous = rec?.dom ?? null
    if (typeof expression !== 'string' || expression.length === 0 || expression.length > EVALUATE_LIMIT) {
      return { ok: false, status: 400, errorId: 'kitesurf.evaluate.toolong', dom: null, executed: false, previous }
    }
    const dom = await executor(expression)
    if (rec) rec.dom = dom
    return { ok: true, status: 200, dom, executed: true }
  }

  return { attach, read, evaluate, sockets }
}
