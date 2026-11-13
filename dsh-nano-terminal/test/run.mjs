// Smoke test: instantiate dnt-core.wasm on Node, feed ANSI, read render output.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bytes = readFileSync(join(root, 'assets/dnt-core.wasm'))
const { instance } = await WebAssembly.instantiate(bytes, {})
const e = instance.exports

const mem = () => new Uint8Array(e.memory.buffer)
const i32 = () => new Int32Array(e.memory.buffer)
const dec = new TextDecoder()

function write(id, s) {
  const b = new TextEncoder().encode(s)
  const p = e.dnt_alloc(b.length)
  mem().set(b, p)
  e.dnt_write(id, p, b.length)
  e.dnt_dealloc(p, b.length)
}

function render(id) {
  const ptr = e.dnt_render(id)
  const len = e.dnt_render_len(id)
  const textLen = e.dnt_render_text_len(id)
  const textPtr = e.dnt_render_text(id)
  const text = dec.decode(mem().subarray(textPtr, textPtr + textLen))
  const b = i32()
  let i = (ptr >> 2) + 1
  const rows = b[i++]; i += 5
  const rowCount = b[i++]
  const lines = []
  for (let r = 0; r < rowCount; r++) {
    const y = b[i++]; i += 2
    const runCount = b[i++]; i += 3
    let line = ''
    for (let k = 0; k < runCount; k++) {
      const col = b[i++]; const off = b[i++]; const blen = b[i++]; i += 3
      const t = text.slice(off, off + blen)
      line = line.padEnd(col, ' ') + t
    }
    lines[y] = line.replace(/\s+$/, '')
  }
  return lines
}

let pass = 0, fail = 0
const t = (name, cond) => { cond ? pass++ : (fail++, console.error('FAIL:', name)) }

// 1. plain text
let id = e.dnt_new(80, 24, 100)
write(id, 'hello world')
let lines = render(id)
t('plain text', lines[0].startsWith('hello world'))
e.dnt_free(id)

// 2. colors + SGR
id = e.dnt_new(80, 24, 100)
write(id, '\x1b[1;31mRED\x1b[0m plain')
lines = render(id)
t('sgr colors', lines[0].startsWith('RED plain'))
e.dnt_free(id)

// 3. cursor positioning
id = e.dnt_new(80, 24, 100)
write(id, '\x1b[2;5HHERE')
lines = render(id)
t('cup', lines[1].startsWith('    HERE'))
e.dnt_free(id)

// 4. scroll
id = e.dnt_new(80, 4, 10)
write(id, 'a\nb\nc\nd\ne\nf')
lines = render(id)
t('scrollback keeps tail', lines[lines.length - 1].includes('f') || lines[lines.length - 2].includes('f'))
e.dnt_free(id)

// 5. reply (DA)
id = e.dnt_new(80, 24, 100)
write(id, '\x1b[c')
const rl = e.dnt_reply_len(id)
const rp = e.dnt_reply_ptr(id) // ptr drains — read len first
t('DA reply', rl > 0 && rp !== 0)
e.dnt_free(id)

// 6. title
id = e.dnt_new(80, 24, 100)
write(id, '\x1b]0;my-title\x07')
const tp = e.dnt_title(id)
const tl = e.dnt_title_len(id)
const title = dec.decode(mem().subarray(tp, tp + tl))
t('OSC title', title === 'my-title')
e.dnt_free(id)

console.log(`${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
