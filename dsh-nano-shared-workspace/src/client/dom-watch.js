/**
 * A single document.body MutationObserver, shared by every feature that needs
 * to react to sidebar DOM churn (β §9.4 P1). Before this module existed the
 * graft kept one observer and the dedupe pass kept a second, so every mutation
 * batch ran two callback chains; subscriptions also fire once per animation
 * frame instead of once per microtask flush, which caps callbacks at the
 * frame rate no matter how many mutations Chrome batches together.
 */

const subscribers = new Set()
let observer = null
let frame = 0

/** Queue one shared flush for the next animation frame. */
const schedule = () => {
  if (frame !== 0 || subscribers.size === 0) return
  frame = requestAnimationFrame(() => {
    frame = 0
    for (const fn of subscribers) {
      try { fn() } catch { /* one listener's failure never silences the rest */ }
    }
  })
}

/** Start the observer on first subscribe; attribute changes count too (graft
 *  width detection needs them), which is cheap once callbacks are per-frame. */
const ensureObserver = () => {
  if (observer !== null || subscribers.size === 0) return
  observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true, attributes: true })
}

/**
 * Subscribe to DOM churn. The callback runs at most once per animation frame,
 * after mutations have settled. Returns an unsubscribe; disconnecting the last
 * subscriber disconnects the observer entirely.
 * @param {() => void} fn
 * @returns {() => void}
 */
export const watchDom = fn => {
  subscribers.add(fn)
  ensureObserver()
  return () => {
    subscribers.delete(fn)
    if (subscribers.size === 0 && observer !== null) {
      observer.disconnect()
      observer = null
    }
  }
}
