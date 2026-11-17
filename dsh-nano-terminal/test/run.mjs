// Smoke test: instantiate dnt-core.wasm on Node, feed ANSI, read render output.
import { readFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
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

function cursorOf(id) {
  const ptr = e.dnt_render(id)
  const b = i32()
  const i = ptr >> 2
  return { x: b[i + 4], y: b[i + 5] - b[i + 3] }
}

function renderRowCount(id) {
  const ptr = e.dnt_render(id)
  return i32()[(ptr >> 2) + 7]
}

function replyOf(id) {
  const len = e.dnt_reply_len(id)
  const ptr = e.dnt_reply_ptr(id)
  return dec.decode(mem().subarray(ptr, ptr + len))
}

function dumpLines(id, source) {
  const p = e.dnt_dump(id, source, 50)
  const l = e.dnt_dump_len(id)
  return dec.decode(mem().subarray(p, p + l))
}

function renderRows(id) {
  e.dnt_invalidate(id)
  const ptr = e.dnt_render(id)
  const tLen = e.dnt_render_text_len(id), tPtr = e.dnt_render_text(id)
  const tb = mem().subarray(tPtr, tPtr + tLen)
  const b = i32()
  let i = (ptr >> 2) + 7
  const n = b[i++]
  const rows = []
  for (let k = 0; k < n; k++) {
    const y = b[i++]; const cols = b[i++]; const tl = b[i++]; const nr = b[i++]
    i += 3
    const runs = []
    for (let r = 0; r < nr; r++) {
      const col = b[i++], off = b[i++], blen = b[i++], attr = b[i++], fg = b[i++], bg = b[i++]
      runs.push({ col, text: dec.decode(tb.subarray(off, off + blen)), attr, fg, bg })
    }
    rows.push({ y, cols, runs })
  }
  return rows
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

// 8b. 选区：内容宽度 + 复制不夹带空白行（业主反馈：能选中空白区并复制）
id = e.dnt_new(40, 8, 100)
write(id, 'abc\r\n')
write(id, '中文ab\r\n')
write(id, '\r\n')
write(id, '   \r\n')
write(id, 'x   \r\n')
write(id, 'tail\r\n')
let vs = e.dnt_view_start(id)
t('line_cols ascii', e.dnt_line_cols(id, vs) === 3)
t('line_cols wide chars count 2 cols', e.dnt_line_cols(id, vs + 1) === 6)
t('line_cols blank line = 0', e.dnt_line_cols(id, vs + 2) === 0)
t('line_cols spaces-only = 0', e.dnt_line_cols(id, vs + 3) === 0)
t('line_cols trailing spaces ignored', e.dnt_line_cols(id, vs + 4) === 1)
t('line_cols out of range = 0', e.dnt_line_cols(id, 9999) === 0 && e.dnt_line_cols(id, -1) === 0)
// 拖到面板底部（越过内容）→ 只应拿到内容行，不带尾部空行
e.dnt_select_set(id, vs, 0, vs + 7, 30)
e.dnt_select_extract(id)
let sp = e.dnt_select_ptr(id)
let sl = e.dnt_select_len(id)
let stext = dec.decode(mem().subarray(sp, sp + sl))
t('select trims trailing blank rows', stext === 'abc\n中文ab\n\n\nx\ntail')
t('select keeps interior blank rows', stext.includes('中文ab\n\n\nx'))
// 全空白区间 → 空串
e.dnt_select_set(id, vs + 2, 0, vs + 3, 10)
e.dnt_select_extract(id)
sl = e.dnt_select_len(id)
t('select all-blank range = empty', sl === 0)
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
  const { Gate } = await import(pathToFileURL(join(root, 'src/host/gate.js')).href)
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

// 11. ws v2 channel codec + Attach credit/snapshot
{
  const { encodeChannel, parseChannel, Attach, FR_KIND, CREDIT_INIT, SNAP_LIMIT } = await import(pathToFileURL(join(root, 'src/host/ws.js')).href)
  const fr = encodeChannel(0, FR_KIND.DATA, Buffer.from('hello'))
  const p = parseChannel(fr)
  t('channel roundtrip', p.channel === 0 && p.kind === FR_KIND.DATA && p.payload.toString() === 'hello')
  // ws-frame → channel payload (server-side sends are unmasked)
  const wsPayload = (frame) => {
    let len = frame[1] & 0x7f
    let off = 2
    if (len === 126) { len = frame.readUInt16BE(2); off = 4 }
    else if (len === 127) { len = Number(frame.readBigUInt64BE(2)); off = 10 }
    return frame.subarray(off, off + len)
  }
  const sentChan = (s) => parseChannel(wsPayload(s))
  // Attach v1: raw passthrough
  const sent = []
  const sock1 = { write: (b) => sent.push(b), destroyed: false }
  const att1 = new Attach(sock1, { screenText: () => 'screen' })
  att1.data(Buffer.from('x'.repeat(10)))
  t('v1 raw send', sent.length === 1 && sent[0].toString().includes('x'.repeat(10)))
  // Attach v2: framed + credit accounting
  const sent2 = []
  const sock2 = { write: (b) => sent2.push(b), destroyed: false }
  const att2 = new Attach(sock2, { screenText: () => 'SNAP' })
  att2.v = 2
  att2.data(Buffer.from('abc'))
  t('v2 framed send', sentChan(sent2[0]).kind === FR_KIND.DATA && att2.pending === 3)
  att2.credit = 0
  att2.onCredit(2)
  t('credit consumed', att2.pending === 1)
  // 信用耗尽不再清屏：块被丢掉，等 align() 发当前屏
  att2.pending = att2.credit + SNAP_LIMIT + 1
  att2.data(Buffer.from('z'))
  t('credit stall drops chunk', att2.stalled === true && sent2.length === 2 && sent2[1].toString().includes('stalled'))
  att2.align()
  const snapFr = sentChan(sent2[sent2.length - 1])
  t('align snapshot has screen', snapFr.kind === FR_KIND.SNAPSHOT && snapFr.payload.includes(Buffer.from('SNAP')))
  t('align snapshot is not CSI 2J', !snapFr.payload.includes(Buffer.from('\x1b[2J')))
  t('stall cleared by align', att2.stalled === false && att2.pending === 0)
}

// 12. Persist roundtrip + placeholder restore
{
  const { mkdtempSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { Persist } = await import(pathToFileURL(join(root, 'src/host/persist.js')).href)
  const { SessionRegistry, SessionRecord } = await import(pathToFileURL(join(root, 'src/host/sessions.js')).href)
  const { EventBus } = await import(pathToFileURL(join(root, 'src/host/events.js')).href)
  const dir = mkdtempSync(join(tmpdir(), 'dnt-persist-'))
  const p = new Persist(dir)
  const bus = new EventBus({ audit: () => {} })
  const registry = new SessionRegistry({ ctx: { subprocess: {} }, audit: () => {}, sendBinary: () => {}, sendText: () => {}, bus, persist: p })
  // fabricate a record
  const rec = new SessionRecord({ id: 'aaaa-bbbb', lane: 'local', handle: null, owner: 't', title: 'rest', name: 'myterm', keep: true, labels: { k: 'v' }, meta: { cwd: '/tmp', cols: 90, rows: 30 }, replayBytes: 100, registry })
  rec.push(Buffer.from('old screen bytes'))
  registry.sessions.set(rec.id, rec)
  registry.names.set('myterm', rec.id)
  p.write(registry)
  const saved = p.load()
  t('persist saves terminal', saved.length === 1 && saved[0].name === 'myterm' && saved[0].keep === true)
  t('screen tail saved', p.screenFor(rec.id)?.toString() === 'old screen bytes')
  // restore into a fresh registry
  const reg2 = new SessionRegistry({ ctx: { subprocess: {} }, audit: () => {}, sendBinary: () => {}, sendText: () => {}, bus: new EventBus({ audit: () => {} }), persist: p })
  reg2.restoreSaved()
  const r2 = reg2.resolve('local/myterm')
  t('restored placeholder', r2?.pending === true && r2?.keep === true && r2?.labels?.k === 'v')
  t('preserved screen staged', r2?.preservedScreen?.toString() === 'old screen bytes')
}

// 10b. TUI 花屏两个根因：私有前缀 CSI 误执行 + 擦除继承字符属性
{
  // CSI ? u 是 kitty 键盘查询 / XTRESTORE，绝不能当成 SCO 恢复光标
  id = e.dnt_new(20, 5, 50)
  write(id, '\x1b[2;3H')          // 光标到 (2,3)
  write(id, '\x1b[s')             // SCO 保存
  write(id, '\x1b[4;5H')          // 移到别处
  write(id, '\x1b[?u')            // 私有前缀：必须忽略
  let c = cursorOf(id)
  t('CSI ? u 不动光标', c.x === 4 && c.y === 3)
  write(id, '\x1b[u')             // 无前缀：真恢复
  c = cursorOf(id)
  t('CSI u 恢复光标', c.x === 2 && c.y === 1)
  write(id, '\x1b[?s')            // XTSAVE：不该覆盖保存点
  write(id, '\x1b[1;1H')
  write(id, '\x1b[u')
  c = cursorOf(id)
  t('CSI ? s 不覆盖保存点', c.x === 2 && c.y === 1)
  // CSI > 4 ; 2 m 是 modifyOtherKeys，不是下划线+暗色
  write(id, '\x1b[>4;2m')
  write(id, 'ab')
  let row0 = renderRows(id).find((r) => r.y === 0)
  t('CSI > 4;2m 不改画笔属性', row0 && row0.runs.every((r) => r.attr === 0))
  e.dnt_free(id)

  // 擦除只继承背景色，不继承下划线/删除线/反色
  id = e.dnt_new(20, 3, 50)
  write(id, '\x1b[4mhi\x1b[K')      // 下划线画笔擦到行尾
  write(id, '\x1b[9m\x1b[2J')       // 删除线画笔清屏
  let rows = renderRows(id)
  t('擦除不继承下划线/删除线', rows.every((r) => r.runs.every((x) => x.attr === 0)))
  e.dnt_free(id)

  // 反色画笔擦除：可见背景应是前景色
  id = e.dnt_new(10, 2, 10)
  write(id, '\x1b[31;7m\x1b[2J')
  rows = renderRows(id)
  const bg = rows[0].runs[0].bg
  t('反色擦除用前景色作背景', bg !== 0 && rows[0].runs[0].attr === 0)
  e.dnt_free(id)
}

// 11. 选区裁剪（clampSelection）+ 高亮只画有内容的格子
{
  const { clampSelection } = await import(pathToFileURL(join(root, 'src/client/select.js')).href)
  const cols = 89
  const W = [26, 12, 0, 0, 0, 0]
  const cc = (l) => W[l] ?? 0
  const eq = (got, want) => JSON.stringify(got) === JSON.stringify(want)
  t('clamp: 拖到空白区收回内容行',
    eq(clampSelection({ line: 0, col: 0 }, { line: 5, col: 30 }, cc, cols), { a: { line: 0, col: 0 }, f: { line: 1, col: 11 } }))
  t('clamp: 行尾空白不算',
    eq(clampSelection({ line: 0, col: 0 }, { line: 0, col: 80 }, cc, cols), { a: { line: 0, col: 0 }, f: { line: 0, col: 25 } }))
  t('clamp: 反向拖归一化',
    eq(clampSelection({ line: 1, col: 5 }, { line: 0, col: 2 }, cc, cols), { a: { line: 0, col: 2 }, f: { line: 1, col: 5 } }))
  t('clamp: 起点列在内容之后整行不算',
    eq(clampSelection({ line: 0, col: 40 }, { line: 1, col: 3 }, cc, cols), { a: { line: 1, col: 0 }, f: { line: 1, col: 3 } }))
  t('clamp: 全空白区间 = null', clampSelection({ line: 2, col: 0 }, { line: 5, col: 10 }, cc, cols) === null)
  t('clamp: 点空白行 = null', clampSelection({ line: 2, col: 5 }, { line: 2, col: 5 }, cc, cols) === null)
  const mid = clampSelection({ line: 0, col: 0 }, { line: 5, col: 3 }, (l) => [10, 0, 0, 0, 0, 7][l] ?? 0, cols)
  t('clamp: 中间空行保留', mid?.f.line === 5 && mid?.f.col === 3)

  // paintSelection：空行不画、行尾裁到内容宽度（假 canvas，直接跑 render.js）
  const rects = []
  const ctxStub = {
    clearRect() { rects.length = 0 },
    fillRect(x, y, w, h) { rects.push({ x, y, w, h }) },
    set fillStyle(_) {}, get fillStyle() { return '' },
    set font(_) {}, get font() { return '' },
    measureText: (str) => ({ width: str.length * 10, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 }),
  }
  const canvasStub = () => ({ width: 0, height: 0, style: {}, getContext: () => ctxStub, remove() {}, parentNode: null })
  globalThis.window = { devicePixelRatio: 1 }
  globalThis.document = { createElement: canvasStub, documentElement: {} }
  const { TermCanvas } = await import(pathToFileURL(join(root, 'src/client/render.js')).href)
  const cv = new TermCanvas({ appendChild() {} }, { bg: '#000' }, { family: 'mono', size: 13 })
  cv.cols = 20; cv.rows = 5; cv.charW = 10; cv.charH = 20
  const widths = [5, 0, 12, 0, 3]
  cv.paintSelection({ line: 0, col: 0 }, { line: 4, col: 19 }, 0, (l) => widths[l] ?? 0)
  t('paint: 空行不画高亮', rects.length === 3 && rects.map((r) => r.y).join() === '0,40,80')
  t('paint: 行尾裁到内容宽度', rects[0].w === 50 && rects[1].w === 120 && rects[2].w === 30)
  rects.length = 0
  cv.paintSelection({ line: 0, col: 0 }, { line: 1, col: 19 }, 0, null)
  t('paint: 无 lineCols 退回整行（旧 wasm 兼容）', rects.length === 2 && rects.every((r) => r.w === 200))
}

// 12. 借鉴 herdr：查询要答、同步输出压帧、软折行重排、字体变更整帧
{
  id = e.dnt_new(20, 5, 20)
  write(id, '\x1b[2;4H')
  const before = cursorOf(id)
  write(id, '\x1b[?u')
  const after = cursorOf(id)
  t('kitty ?u 不移动光标', before.x === after.x && before.y === after.y)
  t('kitty ?u 应答 flags=0', replyOf(id) === '\x1b[?0u')
  write(id, '\x1b[>0q')
  t('XTVERSION 应答 dnt', replyOf(id) === '\x1bP>|dnt\x1b\\')
  write(id, '\x1b[?25$p')
  t('DECRQM set = 1', replyOf(id) === '\x1b[?25;1$y')
  write(id, '\x1b[?25l\x1b[?25$p')
  t('DECRQM reset = 2', replyOf(id) === '\x1b[?25;2$y')
  write(id, '\x1b[?2026$p')
  t('DECRQM 2026 认识且为 reset', replyOf(id) === '\x1b[?2026;2$y')
  write(id, '\x1b[?9999$p')
  t('DECRQM 不认识 = 0', replyOf(id) === '\x1b[?9999;0$y')
  e.dnt_free(id)

  id = e.dnt_new(20, 4, 10)
  write(id, 'AAA')
  renderRowCount(id)
  write(id, '\x1b[?2026hBBB')
  t('sync 期间不吐半帧', renderRowCount(id) === 0)
  write(id, '\x1b[?2026l')
  const shown = renderRows(id).map((r) => r.runs.map((x) => x.text).join('')).join('\n')
  t('sync 结束整屏含 BBB', shown.includes('AAABBB'))
  e.dnt_free(id)

  id = e.dnt_new(5, 8, 20)
  write(id, 'hello world\r\nNEXT')
  e.dnt_resize(id, 20, 8)
  const wide = dumpLines(id, 0)
  t('reflow 加宽拼回逻辑行', wide.split('\n').some((l) => l.includes('hello world')))
  t('reflow 硬换行不断开', wide.includes('NEXT') && !wide.includes('hello worldNEXT'))
  t('reflow 光标跟到 NEXT', cursorOf(id).x === 4)
  e.dnt_resize(id, 4, 8)
  // 变窄后逻辑行变高，超出屏幕的前半段进 scrollback，整段仍在
  const narrow = dumpLines(id, 1).replace(/\n/g, '')
  t('reflow 变窄仍含全部字符', narrow.includes('hello world') && narrow.includes('NEXT'))
  e.dnt_free(id)

  id = e.dnt_new(3, 4, 10)
  write(id, '中文ab')
  e.dnt_resize(id, 10, 4)
  const wideCjk = dumpLines(id, 1).replace(/\n/g, '')
  t('reflow 宽字符不插入补齐空格', wideCjk.includes('中文ab'))
  e.dnt_free(id)

  const jsx = readFileSync(join(root, 'src/client/NanoTerm.jsx'), 'utf8')
  t('字体变更走整帧 invalidate', /reconfigure = \(next\) => \{[\s\S]*?term\.invalidate\(\)/.test(jsx))
}

// 14. 1117 对齐与不重排
{
  id = e.dnt_new(8, 4, 20)
  write(id, 'OLD-TEXT')
  const nb = new TextEncoder().encode('NEW')
  const p = e.dnt_alloc(nb.length)
  mem().set(nb, p)
  e.dnt_replace_visible(id, p, nb.length, 1, 0)
  e.dnt_dealloc(p, nb.length)
  const replaced = dumpLines(id, 0)
  t('replace visible drops old text', replaced.startsWith('NEW') && !replaced.includes('OLD'))
  t('replace visible sets cursor', e.dnt_cursor_x(id) === 1 && e.dnt_cursor_y(id) === 0)
  write(id, '\x1b[?1049hALT')
  e.dnt_scroll(id, 3)
  const nb2 = new TextEncoder().encode('MAIN')
  const p2 = e.dnt_alloc(nb2.length)
  mem().set(nb2, p2)
  e.dnt_replace_visible(id, p2, nb2.length, 0, 0)
  e.dnt_dealloc(p2, nb2.length)
  const afterAlt = dumpLines(id, 0)
  t('replace leaves alt screen', (e.dnt_modes(id) & (1 << 9)) === 0 && afterAlt.startsWith('MAIN') && !afterAlt.includes('ALT'))
  t('replace pins the viewport', e.dnt_view_start(id) === e.dnt_total_lines(id) - e.dnt_rows(id))
  e.dnt_free(id)

  id = e.dnt_new(8, 4, 20)
  write(id, '01234567WRAP')
  e.dnt_resize(id, 4, 4)
  const reflowed = dumpLines(id, 0)
  e.dnt_free(id)

  id = e.dnt_new(8, 4, 20)
  write(id, '01234567WRAP')
  e.dnt_resize_box(id, 4, 4)
  const boxed = dumpLines(id, 0)
  t('resize box does not reflow', boxed !== reflowed && boxed.split('\n')[0] === '0123')
  e.dnt_free(id)

  id = e.dnt_new(20, 4, 10)
  write(id, 'keep')
  write(id, ' alive')
  t('wasm id still accepts write', dumpLines(id, 0).includes('keep alive'))
  e.dnt_free(id)
}

// 15. zsh 预提示符探针：`%` + 79 空格 + `\r \r\r ESC[J`。
//     几何正确时它自己擦掉；窄几何起步会把 `%` 滚进历史再被 reflow 拼回来。
{
  const probe = Buffer.from(
    '\x1b[1m\x1b[7m%\x1b[27m\x1b[1m\x1b[0m' + ' '.repeat(79) +
    '\r \r\r\x1b[0m\x1b[27m\x1b[24m\x1b[Jseanz@m3max host % \x1b[K\x1b[?2004h',
  )
  id = e.dnt_new(80, 6, 50)
  write(id, probe)
  const wide = dumpLines(id, 0)
  t('zsh 探针在 80 列不留孤立 %', !/^%/m.test(wide) && wide.startsWith('seanz@m3max host %'))
  e.dnt_free(id)

  // 回归样例：2×2 起步再拉宽，`%` 被空格滚走并标成软折行，reflow 把它拼回
  // 提示符行。这正是「终端里多出一个 %」的成因，客户端不能再这样起步。
  id = e.dnt_new(2, 2, 50)
  write(id, probe)
  e.dnt_resize(id, 80, 6)
  t('窄几何起步会留下孤立 %（成因样例）', /%/.test(dumpLines(id, 0).split('\n')[0]))
  e.dnt_free(id)

  const jsx = readFileSync(join(root, 'src/client/NanoTerm.jsx'), 'utf8')
  t('wasm 与 lane 共用初始几何', /new WasmTerm\(INITIAL_COLS, INITIAL_ROWS,/.test(jsx)
    && /makeLane\(laneSpec, \{ cols: INITIAL_COLS, rows: INITIAL_ROWS,/.test(jsx))
}

// 13. 合同套件：test/*.test.mjs（node:test）由本入口一起收集，
//     这样 `npm test` 一条命令同时覆盖 wasm 冒烟与迁移合同。
//     `--test-reporter=tap` 显式固定：Node ≥ 24 在部分场景改用非 TAP 默认
//     报告器，输出里没有 `# pass N`，整份合同套件会被静默记成 0 条通过而
//     退出码仍是 0。这里同时要求出现 TAP 汇总、子文件至少收集到一条用例、
//     退出码为 0，三者缺一即失败；空测试文件不再算通过。
for (const file of readdirSync(join(root, 'test')).filter((f) => f.endsWith('.test.mjs')).sort()) {
  const suite = spawnSync(process.execPath, ['--test', '--test-reporter=tap', join(root, 'test', file)], { encoding: 'utf8' })
  const out = `${suite.stdout ?? ''}${suite.stderr ?? ''}`
  const passMatch = /^# pass (\d+)\s*$/m.exec(out)
  const failMatch = /^# fail (\d+)\s*$/m.exec(out)
  if (!passMatch || !failMatch) {
    // 崩溃 / 语法错 / 报告器变更不能当成 0 条通过。
    console.error('FAIL:', `${file} exited ${suite.status} without a TAP summary`)
    fail += 1
    continue
  }
  const suitePass = Number(passMatch[1])
  const suiteFail = Number(failMatch[1])
  // Node 把「文件本身」也算成一条通过用例：空文件会输出
  // `# Subtest: <路径>` + `ok 1 - <路径>` 与 `# pass 1`。去掉这个包装条目
  // 后若一条真实用例都没有，就是空的合同文件，不能算通过。
  const suitePath = join(root, 'test', file)
  const subtests = [...out.matchAll(/^# Subtest: (.+)$/gm)]
    .map((m) => m[1].trim())
    .filter((name) => name !== suitePath && name !== file)
  if (subtests.length === 0) {
    // 空文件（或收集不到用例）不是通过。
    console.error('FAIL:', `${file} reported 0 tests`)
    fail += 1
    continue
  }
  if (suite.status !== 0 && suiteFail === 0) {
    console.error('FAIL:', `${file} exited ${suite.status} with no failing test`)
    fail += 1
    continue
  }
  console.log(`  ${file}: ${suitePass} passed, ${suiteFail} failed`)
  pass += suitePass
  fail += suiteFail
}

console.log(`${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
