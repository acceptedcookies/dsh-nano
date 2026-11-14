/** Per-session CDP reader. The socket hangs off the session object, not a module global. */

export async function withPage(client, fn) {
  const targets = await client.send('Target.getTargets')
  const page = (targets.targetInfos || []).find((row) => row.type === 'page')
  if (!page) {
    const error = new Error('no document')
    error.status = 502
    error.errorId = 'kitesurf.elements.empty'
    throw error
  }
  const attached = page.sessionId
    ? { sessionId: page.sessionId }
    : await client.send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
  return fn(attached.sessionId)
}

export async function evaluatePage(client, expression) {
  return withPage(client, async (sessionId) => {
    const result = await client.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    }, sessionId)
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails
      const error = new Error(String(detail.exception?.description || detail.text || 'evaluate failed').slice(0, 240))
      error.status = 400
      error.errorId = 'kitesurf.evaluate.exception'
      throw error
    }
    return result.result?.value
  })
}

export async function readElements(client, options = {}) {
  const targets = await client.send('Target.getTargets')
  const page = (targets.targetInfos || []).find((row) => row.type === 'page')
  if (!page) {
    const error = new Error('no document')
    error.status = 502
    error.errorId = 'kitesurf.elements.empty'
    throw error
  }
  const attached = page.sessionId
    ? { sessionId: page.sessionId }
    : await client.send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
  const sessionId = attached.sessionId
  await client.send('DOM.enable', {}, sessionId)
  await client.send('CSS.enable', {}, sessionId)
  const depth = Math.max(1, Math.min(Number(options.depth) || 4, 8))
  const doc = await client.send('DOM.getDocument', { depth, pierce: false }, sessionId)
  const root = doc.root
  if (!root) {
    const error = new Error('no document')
    error.status = 502
    error.errorId = 'kitesurf.elements.empty'
    throw error
  }
  const nodes = []
  const flatten = (node, level) => {
    if (!node || nodes.length >= 220) return
    nodes.push({ nodeId: node.nodeId, level, tag: String(node.localName || node.nodeName || '').toLowerCase() })
    for (const child of node.children || []) flatten(child, level + 1)
  }
  flatten(root, 0)
  let matched = null
  let computed = null
  const selector = typeof options.selector === 'string' ? options.selector.trim() : ''
  if (selector) {
    const found = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector }, sessionId)
    const nodeId = Number(found.nodeId) || 0
    if (nodeId) {
      const rules = await client.send('CSS.getMatchedStylesForNode', { nodeId }, sessionId)
      matched = {
        matched: (rules.matchedCSSRules || []).slice(0, 40).map((row) => ({
          selector: (row.rule?.selectorList?.selectors || []).map((item) => item.text).join(', '),
        })),
      }
      const styles = await client.send('CSS.getComputedStyleForNode', { nodeId }, sessionId)
      computed = {}
      for (const row of (styles.computedStyle || []).slice(0, 80)) computed[row.name] = row.value
    }
  }
  return { depth, count: nodes.length, nodes, selector, matched, computed }
}

export async function navigate(session, httpBase, url, connect = connectCdp) {
  const client = await ensureClient(session, httpBase, connect)
  const targets = await client.send('Target.getTargets')
  const page = (targets.targetInfos || []).find((row) => row.type === 'page')
  if (!page) return { ok: false }
  const attached = page.sessionId
    ? { sessionId: page.sessionId }
    : await client.send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
  await client.send('Page.enable', {}, attached.sessionId)
  await client.send('Page.navigate', { url }, attached.sessionId)
  return { ok: true, url }
}

export async function ensureClient(session, httpBase, connect = connectCdp) {
  if (session.cdp) return session.cdp
  session.console = session.console || []
  session.network = session.network || []
  session.cdp = await connect(httpBase)
  if (typeof session.cdp.listen === 'function') {
    session.cdp.listen((message) => {
      const params = message.params || {}
      if (message.method === 'Runtime.consoleAPICalled') {
        const text = (params.args || []).map((arg) => arg.value ?? arg.description ?? '').join(' ').slice(0, 200)
        session.console.push({ level: params.type || 'log', text, at: new Date().toISOString() })
        if (session.console.length > 200) session.console.shift()
      }
      if (message.method === 'Network.requestWillBeSent') {
        session.network.push({
          id: params.requestId,
          url: params.request?.url || '',
          method: params.request?.method || 'GET',
          at: new Date().toISOString(),
        })
        if (session.network.length > 200) session.network.shift()
      }
      if (message.method === 'Network.responseReceived') {
        const row = [...session.network].reverse().find((item) => item.id === params.requestId)
        if (row) row.status = params.response?.status
      }
    })
  }
  try {
    await session.cdp.send('Network.enable')
    await session.cdp.send('Runtime.enable')
  } catch { /* page-session events still arrive after a later enable */ }
  return session.cdp
}

export function connectCdp(httpBase) {
  const wsUrl = `${String(httpBase).replace(/^http/, 'ws')}/devtools/browser`
  const ws = new WebSocket(wsUrl)
  let next = 1
  const pending = new Map()
  const listeners = new Set()
  ws.addEventListener('message', (event) => {
    let message
    try { message = JSON.parse(String(event.data)) } catch { return }
    if (typeof message.id === 'number' && pending.has(message.id)) {
      pending.get(message.id)(message)
      pending.delete(message.id)
      return
    }
    if (message.method) {
      for (const listener of listeners) listener(message)
    }
  })
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve(), { once: true })
    ws.addEventListener('error', () => reject(new Error('cdp connect failed')), { once: true })
  })
  return ready.then(() => ({
    send(method, params = {}, sessionId) {
      const id = next
      next += 1
      const frame = { id, method, params }
      if (sessionId) frame.sessionId = sessionId
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error(`${method} timed out`))
        }, 4000)
        pending.set(id, (message) => {
          clearTimeout(timer)
          if (message.error) reject(new Error(message.error.message || method))
          else resolve(message.result ?? {})
        })
        ws.send(JSON.stringify(frame))
      })
    },
    listen(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }))
}
