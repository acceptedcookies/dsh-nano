// 1117-keep-alive 对齐帧与寿命/resize 决策。
// 宿主和页面共用这一份，避免 SNAPSHOT 载荷两端各写一套。
// 不新增 lane，不新增错误码。SNAPSHOT 的 kind 仍是 7，变的只是载荷。

export const ALIGN_VERSION = 1
export const ALIGN_HEADER = 13
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: false })

/** 可见屏对齐帧。开头是版本号，不是 CSI。 */
export function encodeAlign({ seq = 0, cols = 80, rows = 24, cursorX = 0, cursorY = 0, text = '' } = {}) {
  const body = encoder.encode(String(text ?? ''))
  const out = new Uint8Array(ALIGN_HEADER + body.length)
  const view = new DataView(out.buffer)
  view.setUint8(0, ALIGN_VERSION)
  view.setUint32(1, seq >>> 0)
  view.setUint16(5, cols & 0xffff)
  view.setUint16(7, rows & 0xffff)
  view.setUint16(9, cursorX & 0xffff)
  view.setUint16(11, cursorY & 0xffff)
  out.set(body, ALIGN_HEADER)
  return out
}

/** 版本不对（例如旧的 CSI 2J 载荷）返回 null，调用方不得把它当终端字节写入。 */
export function decodeAlign(payload) {
  if (!payload || payload.length < ALIGN_HEADER) return null
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
  if (view.getUint8(0) !== ALIGN_VERSION) return null
  return {
    seq: view.getUint32(1),
    cols: view.getUint16(5),
    rows: view.getUint16(7),
    cursorX: view.getUint16(9),
    cursorY: view.getUint16(11),
    text: decoder.decode(payload.subarray(ALIGN_HEADER)),
  }
}

/** 对齐模式下 DATA 前 4 字节是序号，后面才是原样 PTY 字节。 */
export function encodeSequenced(seq, chunk) {
  const bytes = chunk instanceof Uint8Array ? chunk : Uint8Array.from(chunk)
  const out = new Uint8Array(4 + bytes.length)
  new DataView(out.buffer).setUint32(0, seq >>> 0)
  out.set(bytes, 4)
  return out
}

export function decodeSequenced(payload) {
  if (!payload || payload.length < 4) return null
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
  return { seq: view.getUint32(0), bytes: payload.subarray(4) }
}

/**
 * 序号以前的 DATA 不进 wasm。dropping 覆盖「快照还没到」的窗口，
 * 序号比较覆盖快照之后迟到的旧块。
 */
export function acceptData({ dropping = false, frameSeq = null, alignSeq = null } = {}) {
  if (dropping) return false
  if (frameSeq == null || alignSeq == null) return true
  return frameSeq > alignSeq
}

/**
 * 一帧进来之后页面该做什么。返回的 bytes 已去掉序号，可原样写入。
 * kind: 0 DATA, 7 SNAPSHOT。
 */
export function routeFrame({ kind, payload, dropping = false, alignSeq = null, alignMode = false } = {}) {
  if (kind === 7) {
    const snap = decodeAlign(payload)
    if (!snap) return { op: 'drop', reason: 'bad-snapshot', dropping, alignSeq }
    return { op: 'align', snap, dropping: false, alignSeq: snap.seq }
  }
  if (kind === 0) {
    if (alignMode) {
      const framed = decodeSequenced(payload)
      if (!framed) return { op: 'drop', reason: 'short-data', dropping, alignSeq }
      if (!acceptData({ dropping, frameSeq: framed.seq, alignSeq })) {
        return { op: 'drop', reason: 'stale', dropping, alignSeq, bytes: framed.bytes }
      }
      return { op: 'data', bytes: framed.bytes, dropping, alignSeq }
    }
    if (dropping) return { op: 'drop', reason: 'stale', dropping, alignSeq }
    return { op: 'data', bytes: payload, dropping, alignSeq }
  }
  return { op: 'ignore', dropping, alignSeq }
}

/** 能对齐的新客户端走当前屏；旧客户端仍吃 replay 环。 */
export function recoverOnAttach(alignMode) {
  return alignMode ? 'align' : 'replay'
}

/** win32 的 ConPTY 自己重画，模拟器不要再 reflow 一遍。 */
export function resizeMode(platform) {
  return platform === 'win32' ? 'box' : 'reflow'
}

/**
 * 隐藏、失焦、慢绘制都不是释放。只有关窗格和插件卸载才 release。
 * hidden / focused 留在参数里，是为了调用方把现场传进来，而决策不看它们。
 */
export function paneLifetime({ closing = false, unloading = false } = {}) {
  if (closing || unloading) return 'release'
  return 'keep'
}

/** 组件卸载时调用。hidden / 失焦永远 keep，这样测试能把这两个信号送进来。 */
export function unmountAction({ hidden = false, focused = true } = {}) {
  return paneLifetime({ hidden, focused, closing: false, unloading: false })
}

/**
 * 附着后的恢复。align 只发当前屏；replay 留给还不能对齐的客户端。
 * 两边都调用会让测试失败，所以这里只能走一条。
 */
export function recoverAttach({ alignMode, align, replay }) {
  if (recoverOnAttach(alignMode) === 'align') {
    align()
    return 'align'
  }
  replay()
  return 'replay'
}

/** 定时器缺口到这个长度，才认为页面被冻过，而不是后台节流。 */
export function freezeGap(elapsedMs, thresholdMs = 5000) {
  return elapsedMs >= thresholdMs
}

/** 重新可见或重新获得焦点时整帧重画。失焦本身不触发。 */
export function shouldRepaintNow({ becameVisible = false, becameFocused = false } = {}) {
  return !!(becameVisible || becameFocused)
}

export function createFitCoalescer() {
  return { pending: null, sent: null }
}

export function noteFit(state, cols, rows) {
  state.pending = { cols, rows }
}

/** 同一帧里多次 note，只提交最后一次；和已提交尺寸相同则不再通知 PTY。 */
export function flushFit(state) {
  const next = state.pending
  if (!next) return null
  state.pending = null
  if (state.sent && state.sent.cols === next.cols && state.sent.rows === next.rows) return null
  state.sent = { cols: next.cols, rows: next.rows }
  return { cols: next.cols, rows: next.rows }
}

/** CSS 像素宽度按当前 dpr 取整后再除回去，dpr 变化时格子宽度跟着变。 */
export function charWidthForDpr(measuredWidth, dpr) {
  const d = Math.max(1, Math.round(Number(dpr) || 1))
  const w = Number(measuredWidth)
  if (!Number.isFinite(w) || w <= 0) return 1
  return Math.max(1, Math.round(w * d) / d)
}
