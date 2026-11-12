/**
 * Minimal CDP client for the Electron desktop app's renderer.
 * ego-browser cannot attach to an external CDP endpoint, so desktop-side UI
 * assertions go through this helper: evaluate DOM state, run page JS, and
 * capture cropped screenshots. Test-only; never shipped.
 *
 * Launch the app with `--remote-debugging-port=9333` first.
 */
const CDP_PORT = process.env.DASW_CDP_PORT ?? '9333'

async function target() {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)
  const list = await res.json()
  const page = list.find(item => item.type === 'page')
  if (page === undefined) throw new Error('no desktop page target; is the app running with --remote-debugging-port?')
  return page.webSocketDebuggerUrl
}

/** One CDP session; `call()` returns each command's result. */
export async function session() {
  const url = await target()
  const ws = new WebSocket(url)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', () => reject(new Error('CDP socket failed')), { once: true })
  })
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data)
    const entry = pending.get(msg.id)
    if (entry === undefined) return
    pending.delete(msg.id)
    if (msg.error !== undefined) entry.reject(new Error(msg.error.message))
    else entry.resolve(msg.result)
  })
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    id += 1
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
  /** Evaluate an expression in the page and return its JSON value. */
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true, userGesture: true,
    })
    if (result.exceptionDetails !== undefined) {
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    }
    return result.result?.value
  }
  const close = () => ws.close()
  return { call, evaluate, close }
}

/** Screenshot a rectangle of the desktop page, written to `path`. */
export async function shot(cli, rect, path) {
  const { writeFile } = await import('node:fs/promises')
  const result = await cli.call('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: false,
    ...(rect === undefined ? {} : { clip: { ...rect, scale: 1 } }),
  })
  await writeFile(path, Buffer.from(result.data, 'base64'))
  return path
}
