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

// 7. OSC 7501 state protocol — program reports its own state
id = e.dnt_new(80, 24, 100)
t('state_seq starts 0', e.dnt_state_seq(id) === 0)
write(id, '\x1b]7501;state=working:app=test:progress=40\x1b\\')
t('state_seq bumps', e.dnt_state_seq(id) === 1)
const stateJson = (id) => {
  const p = e.dnt_state_json(id)
  const l = e.dnt_state_len(id)
  return JSON.parse(dec.decode(mem().subarray(p, p + l)))
}
let st = stateJson(id)
t('state working', st.records[0].state === 'working' && st.records[0].progress === 40 && st.records[0].app === 'test')
write(id, '\x1b]7501;state=blocked:kind=question:msg=cHJvY2VlZD8=\x07')
st = stateJson(id)
t('blocked kind+msg', st.records[0].state === 'blocked' && st.records[0].kind === 'question' && st.records[0].msg === 'proceed?')
write(id, '\x1b]7501;id=sub1:state=working\x1b\\')
st = stateJson(id)
t('multi-record', st.records.length === 2 && st.records[1].id === 'sub1')
write(id, '\x1b]7501;state=clear\x1b\\')
st = stateJson(id)
t('clear removes root', st.records.length === 1 && st.records[0].id === 'sub1')
write(id, '\x1b]7501;id=sub1:state=clear\x1b\\')
st = stateJson(id)
t('clear all', st.records.length === 0)
e.dnt_free(id)

// 8. dnt_dump — visible vs recent sources
id = e.dnt_new(20, 3, 50)
write(id, 'l1\nl2\nl3\nl4\nl5')
let dp = e.dnt_dump(id, 0, 10)
let dl = e.dnt_dump_len(id)
let dt = dec.decode(mem().subarray(dp, dp + dl))
t('dump visible = screen', dt.split('\n').length === 3 && dt.includes('l3') && dt.includes('l5'))
dp = e.dnt_dump(id, 1, 5)
dl = e.dnt_dump_len(id)
dt = dec.decode(mem().subarray(dp, dp + dl))
t('dump recent incl. scrollback', dt.split('\n').length === 5 && dt.includes('l1'))
e.dnt_free(id)

// 9. schema ↔ tools consistency
{
  const { readFileSync } = await import('node:fs')
  const schema = JSON.parse(readFileSync(join(root, 'schema/dnt-mcp.openrpc.json'), 'utf8'))
  const mcpSrc = readFileSync(join(root, 'src/host/mcp.js'), 'utf8')
  const cases = [...mcpSrc.matchAll(/case '([^']+)'/g)].map((m) => m[1])
  const names = schema.methods.map((m) => m.name)
  for (const n of names) t(`schema method impl: ${n}`, cases.includes(n))
  for (const c of cases) t(`impl has schema entry: ${c}`, names.includes(c))
  for (const m of schema.methods) {
    for (const e2 of m.errors ?? []) t(`error kind declared: ${e2}`, schema['x-errorKinds'].includes(e2))
  }
}

// 10. Gate draft-wait semantics
{
  const { Gate } = await import(join(root, 'src/host/gate.js'))
  const g = new Gate({ notesQuietMs: 30, draftWaitMs: 100 })
  g.humanInput(Buffer.from('ls -l'))
  t('draft counted', g.draft === 5)
  g.humanInput(Buffer.from('\x7f\x7f'))
  t('backspace decrements', g.draft === 3)
  g.humanInput(Buffer.from('\r'))
  t('enter clears draft', g.draft === 0)
  // held during busy
  g.busy = true
  const held = g.humanInput(Buffer.from('x'))
  t('human held while busy', held === null && g.held.length === 1)
  g.busy = false
  // submit waits quiet then delivers
  const g2 = new Gate({ notesQuietMs: 20, draftWaitMs: 50 })
  g2.humanInput(Buffer.from('partial'))
  const t0 = Date.now()
  await g2.submit(async () => {})
  t('draft_wait expires and delivers', Date.now() - t0 >= 45)
}

console.log(`${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
