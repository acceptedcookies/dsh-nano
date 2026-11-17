/** UI request budgets include the host's CDP work and response serialization.
 * A browser-side deadline must not expire before Page.navigate/capture does. */
export function requestTimeout(path) {
  if (path.endsWith('/open') || path.endsWith('/shot') || path.endsWith('/history')) return 60000
  return 25000
}

/** One user intent issues exactly one navigation and one capture. The host
 * waits for Page.navigate; retrying it or racing uncancelled captures resets
 * valid in-flight pages. A redirect's final URL is authoritative. */
export async function captureNavigation(post, { openPath, shotPath, url, fit }) {
  await post(openPath, { url })
  const frame = await post(shotPath, { format: 'webp', ...(fit ? { fit } : {}) })
  if (!frame?.data || !frame.url || frame.url === 'about:blank') {
    throw Object.assign(new Error('Kitesurf did not return a rendered page'), { errorId: 'kitesurf.navigate.failed' })
  }
  return frame
}
