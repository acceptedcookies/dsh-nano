// dnt-core WASM loader + raw ABI wrapper.
// The .wasm is embedded into the client bundle as base64 by build-client.mjs
// (assets/dnt-core.wasm -> lib/wasm-b64.js). No fetch, no wasm-bindgen.

import wasmB64 from './wasm-b64.js'

const decoder = new TextDecoder('utf-8', { fatal: false })
const encoder = new TextEncoder()

let _instance = null
let _memory = null
let _exp = null

function b64ToBytes(b64) {
  const bin = atob(b64)
  const len = bin.length
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function loadCore() {
  if (_instance) return _exp
  const bytes = b64ToBytes(wasmB64)
  const { instance } = await WebAssembly.instantiate(bytes, {})
  _instance = instance
  _exp = instance.exports
  _memory = _exp.memory
  return _exp
}

export function coreExports() {
  if (!_exp) throw new Error('dnt-core not loaded')
  return _exp
}

function memU8() {
  return new Uint8Array(_memory.buffer)
}

function memI32() {
  return new Int32Array(_memory.buffer)
}

/** One terminal instance bound to a wasm term id. */
export class WasmTerm {
  /**
   * @param {number} cols
   * @param {number} rows
   * @param {number} scrollback
   */
  constructor(cols, rows, scrollback = 2000) {
    const e = coreExports()
    this.id = e.dnt_new(cols, rows, scrollback)
    this.cols = cols
    this.rows = rows
  }

  dispose() {
    if (this.id) coreExports().dnt_free(this.id)
    this.id = 0
  }

  /** Feed raw output bytes (Uint8Array or string). */
  write(data) {
    const e = coreExports()
    const bytes = typeof data === 'string' ? encoder.encode(data) : data
    if (!bytes.length) return
    const ptr = e.dnt_alloc(bytes.length)
    memU8().set(bytes, ptr)
    e.dnt_write(this.id, ptr, bytes.length)
    e.dnt_dealloc(ptr, bytes.length)
  }

  /** Drain emulator → pty replies; returns Uint8Array copy (possibly empty). */
  drainReply() {
    const e = coreExports()
    const len = e.dnt_reply_len(this.id)
    if (!len) return EMPTY
    const ptr = e.dnt_reply_ptr(this.id)
    return memU8().slice(ptr, ptr + len)
  }

  resize(cols, rows) {
    if (cols === this.cols && rows === this.rows) return
    this.cols = cols
    this.rows = rows
    coreExports().dnt_resize(this.id, cols, rows)
  }

  scroll(deltaLines) {
    coreExports().dnt_scroll(this.id, deltaLines)
  }

  scrollBottom() {
    coreExports().dnt_scroll_bottom(this.id)
  }

  modes() {
    return coreExports().dnt_modes(this.id) >>> 0
  }

  dead() {
    coreExports().dnt_dead(this.id)
  }

  /** Title string, or null when unchanged since last poll. */
  title() {
    const e = coreExports()
    const len = e.dnt_title_len(this.id)
    if (!len) return null
    const ptr = e.dnt_title(this.id)
    if (!ptr) return null
    return decoder.decode(memU8().subarray(ptr, ptr + len))
  }

  totalLines() {
    return coreExports().dnt_total_lines(this.id)
  }

  /**
   * Consume the packed dirty-row buffer.
   * Returns { rowsVisible, totalLines, viewStart, cursorX, cursorAbsY, modes,
   *           rows: [{y, cols, cursorInRow, cursorX, runs:[{col,text,attr,fg,bg}]}] }
   * or null when nothing changed / term gone.
   */
  render() {
    const e = coreExports()
    const ptr = e.dnt_render(this.id) // packs first; pointer stays valid until next call
    const n = e.dnt_render_len(this.id)
    if (!ptr || !n) return null
    const buf = memI32()
    if (buf[ptr >> 2] !== 0x444e5401) return null

    const textLen = e.dnt_render_text_len(this.id)
    const textPtr = e.dnt_render_text(this.id)
    const textBytes = memU8().subarray(textPtr, textPtr + textLen)
    // decode once per render; runs hold byte offsets into this string
    const textAll = decoder.decode(textBytes)

    let i = (ptr >> 2) + 1
    const rowsVisible = buf[i++]
    const totalLines = buf[i++]
    const viewStart = buf[i++]
    const cursorX = buf[i++]
    const cursorAbsY = buf[i++]
    const modes = buf[i++] >>> 0
    const rowCount = buf[i++]
    const rows = []
    // byte offsets are into the raw utf8 buffer; we map through a code-unit
    // index so slicing the decoded JS string stays cheap.
    let byteToJs = null
    const jsIndexFor = (byteOff) => {
      if (!byteToJs) {
        // Map every byte offset to the index in the decoded JS string of the
        // codepoint containing it. Run boundaries are always char boundaries,
        // so continuation bytes only need a "nearby" mapping.
        byteToJs = new Uint32Array(textBytes.length + 1)
        let js = 0
        let b = 0
        while (b < textBytes.length) {
          byteToJs[b] = js
          const c = textBytes[b]
          if ((c & 0xc0) === 0x80) { b += 1; continue }
          if (c < 0x80) { js += 1; b += 1 }
          else if (c < 0xe0) { js += 1; b += 2 }
          else if (c < 0xf0) { js += 1; b += 3 }
          else { js += 2; b += 4 }
        }
        byteToJs[textBytes.length] = textAll.length
      }
      return byteToJs[Math.min(byteOff, textBytes.length)]
    }

    for (let r = 0; r < rowCount; r++) {
      const y = buf[i++]
      const cols = buf[i++]
      const lineTextLen = buf[i++]
      const runCount = buf[i++]
      const cursorInRow = buf[i++]
      const curX = buf[i++]
      i++ // reserved
      const runs = []
      for (let k = 0; k < runCount; k++) {
        const col = buf[i++]
        const byteOff = buf[i++]
        const byteLen = buf[i++]
        const attr = buf[i++] >>> 0
        const fg = buf[i++] >>> 0
        const bg = buf[i++] >>> 0
        runs.push({
          col,
          text: textAll.slice(jsIndexFor(byteOff), jsIndexFor(byteOff + byteLen)),
          attr,
          fg,
          bg,
        })
      }
      rows.push({ y, cols, cursorInRow, cursorX: curX, runs })
    }
    return { rowsVisible, totalLines, viewStart, cursorX, cursorAbsY, modes, rows }
  }
}

const EMPTY = new Uint8Array(0)

/** Mode bits mirrored from dnt-core lib.rs. */
export const MODES = {
  CURSOR_VISIBLE: 1 << 0,
  APP_CURSOR: 1 << 1,
  APP_KEYPAD: 1 << 2,
  BRACKETED_PASTE: 1 << 3,
  MOUSE_CLICK: 1 << 4,
  MOUSE_BTN_MOTION: 1 << 5,
  MOUSE_ANY_MOTION: 1 << 6,
  MOUSE_SGR: 1 << 7,
  FOCUS_EVENTS: 1 << 8,
  ALT_SCREEN: 1 << 9,
  ALT_SCROLL: 1 << 10,
  MOUSE_UTF8: 1 << 11,
  WRAPAROUND: 1 << 12,
}
