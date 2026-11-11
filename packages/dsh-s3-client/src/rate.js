/** Token-bucket rate limiter + concurrency gate for S3 traffic.
 *  Two independent buckets (requests/sec, upload bytes/sec) plus a semaphore.
 *  `acquire` resolves when all constraints pass; callers may race — the
 *  internal timer serializes grant order so bursts stay under the rate. */

/**
 * @param {object} limits
 * @param {number} [limits.rps] sustained requests per second (default 10).
 * @param {number} [limits.burst] request bucket capacity (default 2×rps).
 * @param {number} [limits.kbps] upload kilobytes per second (default 512).
 * @param {number} [limits.concurrency] max in-flight requests (default 2).
 */
export function createRateLimiter({ rps = 10, burst, kbps = 512, concurrency = 2 } = {}) {
  const reqCap = burst ?? Math.max(1, Math.round(rps * 2))
  const byteCap = Math.max(1, Math.round(kbps * 1024))
  let reqTokens = reqCap
  let byteTokens = byteCap
  let lastRefill = Date.now()
  let inFlight = 0
  /** @type {Array<() => void>} */
  const waiters = []

  function refill() {
    const now = Date.now()
    const secs = (now - lastRefill) / 1000
    if (secs <= 0) return
    lastRefill = now
    reqTokens = Math.min(reqCap, reqTokens + secs * rps)
    byteTokens = Math.min(byteCap, byteTokens + secs * byteCap)
  }

  function pump() {
    /* Refill first so freshly elapsed time buys tokens for queued waiters; a
       saturated concurrency slot (not an empty bucket) is what stops the loop. */
    refill()
    while (waiters.length > 0 && inFlight < concurrency && reqTokens >= 1) {
      reqTokens -= 1
      inFlight += 1
      waiters.shift()()
    }
    /* Reschedule only when tokens are the blocker; a concurrency-blocked queue
       wakes through done() instead of a timer. */
    if (waiters.length > 0 && inFlight < concurrency && reqTokens < 1) {
      const waitMs = Math.max(10, Math.ceil((1 - reqTokens) / rps * 1000))
      setTimeout(pump, waitMs).unref?.()
    }
  }

  return {
    /** Waits for a request slot. Call `done()` when the request finishes. */
    acquire() {
      return new Promise(resolve => {
        waiters.push(resolve)
        pump()
      })
    },
    /** Releases one in-flight slot and drains queued waiters. */
    done() {
      inFlight = Math.max(0, inFlight - 1)
      pump()
    },
    /** Charges upload bandwidth; returns ms to wait before sending more. */
    chargeUpload(bytes) {
      refill()
      byteTokens -= bytes
      if (byteTokens >= 0) return 0
      return Math.ceil(-byteTokens / byteCap * 1000)
    },
    /** Snapshot for status reporting. */
    stats() {
      refill()
      return { inFlight, queued: waiters.length, reqTokens: Math.floor(reqTokens), byteTokens: Math.floor(byteTokens) }
    },
  }
}
