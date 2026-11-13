// Host-side screen mirror: the same dnt-core wasm that renders in the browser,
// instantiated once on Node for term.session.read (MCP audit/read tools).
// Reads lib/dnt-core.wasm — built by scripts/build-rust.sh before packaging.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
let exports_ = null
let memory = null

const decoder = new TextDecoder('utf-8', { fatal: false })

export function loadMirror() {
  if (exports_) return exports_
  const path = join(here, '..', 'lib', 'dnt-core.wasm')
  const bytes = readFileSync(path)
  const instance = new WebAssembly.Instance(new WebAssembly.Module(bytes), {})
  exports_ = instance.exports
  memory = exports_.memory
  return exports_
}

function memI32() {
  return new Int32Array(memory.buffer)
}
function memU8() {
  return new Uint8Array(memory.buffer)
}

export class ScreenMirror {
  constructor(cols, rows, scrollback = 2000) {
    const e = loadMirror()
    this.id = e.dnt_new(cols, rows, scrollback)
    this.e = e
  }
  free() {
    if (this.id) this.e.dnt_free(this.id)
    this.id = 0
  }
  write(bytes) {
    const e = this.e
    const ptr = e.dnt_alloc(bytes.length)
    memU8().set(bytes, ptr)
    e.dnt_write(this.id, ptr, bytes.length)
    e.dnt_dealloc(ptr, bytes.length)
  }
  resize(cols, rows) {
    this.e.dnt_resize(this.id, cols, rows)
  }
  /** Last `n` rendered screen rows as joined text (trailing blanks trimmed). */
  screenText(n = 50) {
    const e = this.e
    const ptr = e.dnt_render(this.id)
    const len = e.dnt_render_len(this.id)
    if (!ptr || !len) return ''
    const buf = memI32()
    const textLen = e.dnt_render_text_len(this.id)
    const textPtr = e.dnt_render_text(this.id)
    const textAll = decoder.decode(memU8().subarray(textPtr, textPtr + textLen))
    // byte→js index map
    const textBytes = memU8().subarray(textPtr, textPtr + textLen)
    const map = new Uint32Array(textBytes.length + 1)
    let js = 0
    let b = 0
    while (b < textBytes.length) {
      map[b] = js
      const c = textBytes[b]
      if ((c & 0xc0) === 0x80) { b += 1; continue }
      if (c < 0x80) { js += 1; b += 1 }
      else if (c < 0xe0) { js += 1; b += 2 }
      else if (c < 0xf0) { js += 1; b += 3 }
      else { js += 2; b += 4 }
    }
    map[textBytes.length] = textAll.length

    let i = (ptr >> 2) + 1
    const rowsVisible = buf[i++]
    i += 4 // totalLines, viewStart, cursorX, cursorAbsY
    i++ // modes
    const rowCount = buf[i++]
    const lines = new Array(rowsVisible).fill('')
    for (let r = 0; r < rowCount; r++) {
      const y = buf[i++]
      i += 2 // cols, lineTextLen
      const runCount = buf[i++]
      i += 3 // cursorInRow, curX, reserved
      let line = ''
      for (let k = 0; k < runCount; k++) {
        const col = buf[i++]
        const byteOff = buf[i++]
        const byteLen = buf[i++]
        i += 3 // attr, fg, bg
        const t = textAll.slice(map[byteOff], map[byteOff + byteLen])
        line = line.padEnd(col, ' ') + t
      }
      if (y >= 0 && y < rowsVisible) lines[y] = line.replace(/\s+$/, '')
    }
    // a fresh screen writes at the top — trailing blank rows carry nothing,
    // so trim them before taking the tail window
    let end = lines.length
    while (end > 0 && lines[end - 1] === '') end--
    return lines.slice(Math.max(0, end - n), end).join('\n')
  }
}
