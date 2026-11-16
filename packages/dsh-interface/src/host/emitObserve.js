/**
 * Facade-local observe emission (T-O-PRE1116-06).
 * Not a second closed set — callers build a plain object and tests run it
 * through `assertObserveEvent`. No clock read and no object when `observe`
 * is omitted. The callback is not awaited; a thrown callback is swallowed.
 */

export function observeStamp(observe) {
  if (typeof observe !== 'function') return null
  return globalThis.performance.now()
}

export function emitObserve(observe, event) {
  if (typeof observe !== 'function') return
  try {
    const ret = observe(event)
    if (ret != null && typeof ret.then === 'function') ret.then(() => {}, () => {})
  } catch {
    /* callback failure must not change the response */
  }
}
