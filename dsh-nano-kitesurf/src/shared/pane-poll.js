/**
 * Visibility-gated interval for the pane's timed requests (DNLS03 T-O-67).
 * The host tells the pane whether its tab is on screen (`tab.visible`);
 * while it is not, the pane must not issue timed requests at all — no
 * slower cadence, no "one last poll". `armPanePoll` is the single helper
 * every ambient loop uses, so the rule lives in one place:
 *
 *   - `isVisible()` false at arm time: nothing is loaded and nothing is
 *     scheduled. The owning effect re-arms when the host flips visible.
 *   - `immediate: true` performs exactly one refresh on arm — this is the
 *     "refresh once on regain" path when the effect re-arms after a hide.
 *   - `hiddenPeriodMs` (optional): while the whole browser document is
 *     hidden, the interval switches to that slower period — the existing
 *     browser-wide back-off, unchanged by the tab-visible gate. A visible
 *     tab inside a hidden document still throttles; a hidden tab always
 *     stays silent regardless of document state.
 *   - `shouldTick()` (optional): extra per-tick veto such as a consecutive
 *     failure cap. It gates interval ticks only — an immediate refresh on
 *     regain is deliberate, never vetoed.
 */

export function armPanePoll(load, {
  periodMs,
  hiddenPeriodMs = null,
  immediate = false,
  shouldTick = () => true,
  isVisible = () => true,
  window = globalThis.window,
  document = globalThis.document,
} = {}) {
  if (typeof load !== 'function') throw new TypeError('armPanePoll requires a load function')
  if (!Number.isFinite(periodMs) || periodMs <= 0) throw new TypeError('armPanePoll requires a positive periodMs')
  if (typeof window?.setInterval !== 'function') return () => {}
  // A hidden tab never schedules — not even the slowed document cadence.
  if (isVisible() !== true) return () => {}
  if (immediate === true) {
    try { load() } catch { /* the loader owns its own error surface */ }
  }
  let timer = null
  const period = () => (hiddenPeriodMs !== null && document?.visibilityState === 'hidden' ? hiddenPeriodMs : periodMs)
  const tick = () => {
    if (isVisible() !== true || shouldTick() !== true) return
    try { load() } catch { /* the loader owns its own error surface */ }
  }
  const arm = () => {
    if (timer !== null) window.clearInterval(timer)
    timer = window.setInterval(tick, period())
  }
  const onVis = () => {
    arm()
    if (document?.visibilityState !== 'hidden') tick()
  }
  if (hiddenPeriodMs !== null) document?.addEventListener?.('visibilitychange', onVis)
  arm()
  return () => {
    if (timer !== null) window.clearInterval(timer)
    timer = null
    if (hiddenPeriodMs !== null) document?.removeEventListener?.('visibilitychange', onVis)
  }
}
