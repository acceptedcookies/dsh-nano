// 页面入帧。lanes 和测试都走这里，避免 #onFrame 被改成把序号或 CSI 写进 wasm 而测试仍绿。

import { routeFrame } from '../shared/align.js'

export function handleFrame(state, buf, hooks) {
  if (!buf || buf.length < 9) return
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const kind = view.getUint8(4)
  const len = view.getUint32(5)
  const payload = buf.subarray(9, Math.min(buf.length, 9 + len))
  const decision = routeFrame({
    kind,
    payload,
    dropping: state.dropping,
    alignSeq: state.alignSeq,
    alignMode: state.alignMode,
  })
  state.dropping = decision.dropping
  state.alignSeq = decision.alignSeq
  if (decision.op === 'align') {
    hooks.onAlign?.(decision.snap)
    hooks.credit?.(payload.length)
    return
  }
  if (decision.op === 'data') {
    hooks.onOutput?.(decision.bytes)
    hooks.credit?.(payload.length)
    return
  }
  if (decision.op === 'drop' && (kind === 0 || kind === 7)) hooks.credit?.(payload.length)
}
