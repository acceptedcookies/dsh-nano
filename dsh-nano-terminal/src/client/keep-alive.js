// 页面侧保活辅助。协议决策在 src/shared/align.js，这里只留 DOM 监听。

import { freezeGap } from '../shared/align.js'

export {
  paneLifetime,
  unmountAction,
  freezeGap,
  shouldRepaintNow,
  createFitCoalescer,
  noteFit,
  flushFit,
  resizeMode,
  cellWidth,
  backingSize,
} from '../shared/align.js'

/**
 * 冻结缺口里来的字节不要写。先请求对齐，等快照盖掉可见区。
 * 返回 'align' 表示这块被丢掉。
 */
export function outputDuringGap({ gapMs, write, requestAlign, bytes, after }) {
  if (freezeGap(gapMs)) {
    requestAlign?.()
    return 'align'
  }
  applyTerminalOutput({ write, after, bytes })
  return 'write'
}

/** 输出先写入，绘制另说。这个函数自己不画。 */
export function applyTerminalOutput({ write, after, bytes }) {
  write(bytes)
  after?.()
}

/** 重新可见：作废脏区，然后只画当前这一帧。 */
export function paintCurrent({ invalidate, paint }) {
  invalidate()
  paint()
}

/** 同一帧里多次请求只排一次。回调执行时读的是当时的最新值。 */
export function queueFrame(state, schedule, run) {
  if (state.handle) return
  state.handle = schedule(() => {
    state.handle = 0
    run()
  })
}

/** devicePixelRatio 变化时回调。返回解除函数。 */
export function watchDevicePixelRatio(onChange) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  let media = null
  const onMedia = () => {
    onChange()
    arm()
  }
  const arm = () => {
    media?.removeEventListener?.('change', onMedia)
    const dpr = window.devicePixelRatio || 1
    media = window.matchMedia(`(resolution: ${dpr}dppx)`)
    media.addEventListener?.('change', onMedia)
  }
  arm()
  return () => media?.removeEventListener?.('change', onMedia)
}
