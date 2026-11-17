/**
 * 1117-keep-alive。决策函数必须自己失败，源码扫描只用来钉「调用还在」。
 * 每条「这里没有 X」都带一个会命中的正样例，避免扫错字符串还显示通过。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  acceptData, charWidthForDpr, createFitCoalescer, decodeAlign, encodeAlign,
  encodeSequenced, flushFit, freezeGap, noteFit, paneLifetime, recoverAttach,
  resizeMode, routeFrame, shouldRepaintNow, unmountAction,
} from '../src/shared/align.js'
import { Attach, FR_KIND, SNAP_LIMIT, encodeChannel } from '../src/host/ws.js'
import { handleFrame } from '../src/client/frames.js'
import { applyTerminalOutput, outputDuringGap, paintCurrent, queueFrame, watchDevicePixelRatio } from '../src/client/keep-alive.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')

test('KA-1 hidden and unfocused keep the wasm id', async () => {
  assert.equal(unmountAction({ hidden: true, focused: false }), 'keep')
  assert.equal(paneLifetime({ closing: true }), 'release')
  assert.equal(paneLifetime({ unloading: true, hidden: true }), 'release')
  const { e, write, dump } = await loadWasm()
  const id = e.dnt_new(20, 4, 10)
  write(e, id, 'keep')
  const freed = []
  const free = (termId) => { freed.push(termId); e.dnt_free(termId) }
  if (unmountAction({ hidden: true, focused: false }) === 'release') free(id)
  assert.deepEqual(freed, [])
  write(e, id, ' alive')
  assert.match(dump(e, id), /keep alive/)
  e.dnt_free(id)
})

test('KA-1 unmount cleanup does not close the pane', () => {
  const src = read('src/client/NanoTerm.jsx')
  const start = src.indexOf('unmount ≠ close')
  assert.ok(start > 0)
  const block = src.slice(start, src.indexOf('}, [paneId', start))
  assert.equal(unconditionalClose(block), false)
  assert.equal(unconditionalClose(`${block}\nclosePaneSession(rec)\n`), true)
  assert.match(block, /canvas\.detach\(\)/)
  assert.match(block, /unmountAction\(/)
  const sites = closeSites(src)
  assert.deepEqual(sites.map((s) => s.line.trim()), [
    'for (const rec of sessions.values()) closePaneSession(rec)',
    'if (rec) { closePaneSession(rec); paneSessions.current.delete(id) }',
    'function closePaneSession(rec) {',
    'closePaneSession(rec)',
    "}) === 'release') closePaneSession(rec)",
  ])
  assert.equal(sites.length, 5)
  const extra = src.replace('const schedulePaint = () => {', 'const schedulePaint = () => { closePaneSession(rec);')
  assert.equal(closeSites(extra).length, 6)
})

test('KA-1 release stays on close and plugin unload only', () => {
  const nano = read('src/client/NanoTerm.jsx')
  const entry = read('src/client/index.js')
  assert.match(nano, /function closePaneSession\(rec\)/)
  assert.match(nano, /disposeAllTerminals\(\)[\s\S]*closePaneSession\(rec\)/)
  assert.match(entry, /disposeAllTerminals\(\)/)
  assert.doesNotMatch(entry, /powerSaveBlocker|wakeLock\.request/)
  const src = read('src/host/ws.js') + read('src/client/lanes.js') + nano
  assert.doesNotMatch(src, /powerSaveBlocker|wakeLock\.request/)
  assert.match('navigator.wakeLock.request("screen")', /wakeLock\.request/)
})

test('KA-2 hidden writes land in one paint, not a replay', async () => {
  assert.equal(shouldRepaintNow({ becameVisible: false, becameFocused: false }), false)
  const { e, write, dump } = await loadWasm()
  const id = e.dnt_new(40, 4, 10)
  const paints = []
  applyTerminalOutput({ bytes: 'AA', write: (b) => write(e, id, b), after: () => {} })
  applyTerminalOutput({ bytes: 'BB', write: (b) => write(e, id, b), after: () => {} })
  assert.equal(paints.length, 0)
  if (shouldRepaintNow({ becameVisible: true })) {
    paintCurrent({
      invalidate: () => e.dnt_invalidate(id),
      paint: () => paints.push(dump(e, id)),
    })
  }
  assert.equal(paints.length, 1)
  assert.match(paints[0], /AABB/)
  e.dnt_free(id)
  const nano = read('src/client/NanoTerm.jsx')
  assert.match(nano, /outputDuringGap\(\{/)
  assert.match(nano, /paintCurrent\(\{ invalidate: \(\) => term\.invalidate\(\), paint \}\)/)
})

test('KA-3 bytes before the align seq stay out of the emulator', () => {
  assert.equal(acceptData({ dropping: true, frameSeq: 1, alignSeq: null }), false)
  assert.equal(acceptData({ dropping: false, frameSeq: 4, alignSeq: 5 }), false)
  assert.equal(acceptData({ dropping: false, frameSeq: 6, alignSeq: 5 }), true)
  const stale = encodeSequenced(4, new TextEncoder().encode('STALE'))
  const fresh = encodeSequenced(6, new TextEncoder().encode('NEXT'))
  const dropped = routeFrame({ kind: 0, payload: stale, dropping: false, alignSeq: 5, alignMode: true })
  assert.equal(dropped.op, 'drop')
  const kept = routeFrame({ kind: 0, payload: fresh, dropping: false, alignSeq: 5, alignMode: true })
  assert.equal(kept.op, 'data')
  assert.equal(new TextDecoder().decode(kept.bytes), 'NEXT')
})

test('KA-3 snapshot payload is a dump, not CSI 2J', () => {
  const payload = encodeAlign({ seq: 9, cols: 80, rows: 24, cursorX: 3, cursorY: 1, text: 'SNAP' })
  assert.equal(payload.includes(0x1b), false)
  const snap = decodeAlign(payload)
  assert.deepEqual({ seq: snap.seq, text: snap.text, cursorX: snap.cursorX }, { seq: 9, text: 'SNAP', cursorX: 3 })
  const legacy = new Uint8Array([0x1b, 0x5b, 0x32, 0x4a])
  assert.equal(routeFrame({ kind: 7, payload: legacy, alignMode: true }).op, 'drop')
  const applied = routeFrame({ kind: 7, payload, dropping: true, alignSeq: null, alignMode: true })
  assert.equal(applied.op, 'align')
  assert.equal(applied.dropping, false)
  assert.equal(applied.alignSeq, 9)
  const ws = read('src/host/ws.js')
  assert.equal(ws.includes('\\x1b[2J'), false)
  assert.equal(`${ws}\nconst clear = '\\x1b[2J'`.includes('\\x1b[2J'), true)
})

test('KA-3 credit exhaustion stalls instead of clearing', () => {
  const sent = []
  const sock = { write: (b) => sent.push(b), destroyed: false }
  const att = new Attach(sock, { screenText: () => 'NOW', outSeq: 7, meta: { cols: 40, rows: 10 } })
  att.v = 2
  att.alignMode = true
  att.pending = att.credit + SNAP_LIMIT
  att.data(Buffer.from('late'), 8)
  assert.equal(att.stalled, true)
  assert.equal(sent.length, 1)
  assert.match(sent[0].toString(), /"type":"stalled"/)
  assert.equal(sent[0].includes(Buffer.from('\x1b[2J')), false)
  att.align()
  assert.equal(att.stalled, false)
  const frame = sent[sent.length - 1]
  let len = frame[1] & 0x7f
  let off = 2
  if (len === 126) { len = frame.readUInt16BE(2); off = 4 }
  const body = frame.subarray(off, off + len)
  assert.equal(body[4], FR_KIND.SNAPSHOT)
  const payload = body.subarray(9)
  assert.equal(payload.includes(Buffer.from('\x1b[2J')), false)
  assert.equal(decodeAlign(payload).text, 'NOW')
  assert.equal(decodeAlign(payload).seq, 7)
  att.stalled = true
  att.pending = 10
  att.onCredit(10)
  assert.equal(att.stalled, false)
  assert.equal(att.pending, 0)
  const again = sent[sent.length - 1]
  let len2 = again[1] & 0x7f
  let off2 = 2
  if (len2 === 126) { len2 = again.readUInt16BE(2); off2 = 4 }
  assert.equal(again.subarray(off2, off2 + len2)[4], FR_KIND.SNAPSHOT)
})

test('KA-3 a freeze gap drops the chunk instead of writing it', () => {
  const wrote = []
  let aligns = 0
  assert.equal(outputDuringGap({
    gapMs: 5000, bytes: 'LATE', write: (b) => wrote.push(b), requestAlign: () => { aligns += 1 },
  }), 'align')
  assert.deepEqual(wrote, [])
  assert.equal(aligns, 1)
  assert.equal(outputDuringGap({
    gapMs: 1000, bytes: 'LIVE', write: (b) => wrote.push(b), requestAlign: () => { aligns += 1 },
  }), 'write')
  assert.deepEqual(wrote, ['LIVE'])
  assert.equal(aligns, 1)
})

test('KA-4 align clients skip raw replay', () => {
  let aligns = 0
  let replays = 0
  assert.equal(recoverAttach({ alignMode: true, align: () => { aligns += 1 }, replay: () => { replays += 1 } }), 'align')
  assert.equal(aligns, 1)
  assert.equal(replays, 0)
  assert.equal(recoverAttach({ alignMode: false, align: () => { aligns += 1 }, replay: () => { replays += 1 } }), 'replay')
  assert.equal(replays, 1)
  assert.equal(aligns, 1)
  const routes = read('src/host/web-routes.js')
  assert.match(routes, /recoverAttach\(\{/)
  assert.match(routes, /replay: \(\) => record\.replayInto\(/)
})

test('KA-5 one frame of resize jitter commits once', () => {
  const state = createFitCoalescer()
  noteFit(state, 80, 24)
  noteFit(state, 40, 24)
  assert.deepEqual(flushFit(state), { cols: 40, rows: 24 })
  noteFit(state, 40, 24)
  assert.equal(flushFit(state), null)
  const queue = { handle: 0 }
  const ran = []
  let size = { cols: 80, rows: 24 }
  const resizes = []
  const schedule = (fn) => { ran.push(fn); return 1 }
  queueFrame(queue, schedule, () => resizes.push({ ...size }))
  size = { cols: 40, rows: 24 }
  queueFrame(queue, schedule, () => resizes.push({ ...size }))
  assert.equal(ran.length, 1)
  ran[0]()
  assert.deepEqual(resizes, [{ cols: 40, rows: 24 }])
  assert.equal(resizeMode('win32'), 'box')
  assert.equal(resizeMode('darwin'), 'reflow')
  const nano = read('src/client/NanoTerm.jsx')
  assert.match(nano, /queueFrame\(fitQueue/)
  assert.match(nano, /flushFit\(rec\.fitState\)/)
  assert.match(nano, /lane\.resize\(commit\.cols, commit\.rows\)/)
})

test('KA-5 devicePixelRatio change remeasures charW and backing store', async () => {
  const measured = 7.4
  globalThis.window = {
    devicePixelRatio: 1,
    matchMedia() {
      const media = {
        addEventListener(_type, fn) { this.fn = fn },
        removeEventListener() { this.fn = null },
      }
      this.__dprMedia = media
      return media
    },
  }
  globalThis.document = {
    createElement() {
      return {
        style: {},
        width: 0,
        height: 0,
        getContext() {
          return {
            font: '',
            measureText() {
              return { width: measured, fontBoundingBoxAscent: 11, fontBoundingBoxDescent: 3 }
            },
            setTransform() {},
            fillRect() {},
            clearRect() {},
          }
        },
      }
    },
  }
  const { TermCanvas } = await import('../src/client/render.js')
  const canvas = new TermCanvas({ appendChild() {} }, { bg: '#111' }, { family: 'monospace', size: 13 })
  assert.equal(canvas.charW, charWidthForDpr(measured, 1))
  canvas.fit(10, 4)
  const px1 = canvas.base.width
  const char1 = canvas.charW
  window.devicePixelRatio = 2
  assert.equal(canvas.syncDpr(), true)
  assert.equal(canvas.charW, charWidthForDpr(measured, 2))
  assert.notEqual(canvas.charW, char1)
  canvas.fit(10, 4)
  assert.notEqual(canvas.base.width, px1)
  assert.equal(canvas.base.width, Math.round(10 * canvas.charW * window.devicePixelRatio))
  assert.equal(canvas.syncDpr(), false)
  let watched = 0
  const stop = watchDevicePixelRatio(() => { watched += 1 })
  window.__dprMedia.fn()
  assert.equal(watched, 1)
  stop()
})

test('KA-3 freeze gap is not a short throttle', () => {
  assert.equal(freezeGap(1000), false)
  assert.equal(freezeGap(5000), true)
  const nano = read('src/client/NanoTerm.jsx')
  assert.match(nano, /if \(freezeGap\(gap\)\) lane\.requestAlign\(\)/)
  const lanes = read('src/client/lanes.js')
  assert.match(lanes, /handleFrame\(this, buf/)
  assert.match(lanes, /requestAlign\(\)/)
})

test('KA-3 sequenced frames enter wasm without the seq prefix', async () => {
  const { e, write, dump, replace } = await loadWasm()
  const id = e.dnt_new(40, 4, 10)
  write(e, id, 'OLD')
  const state = { dropping: true, alignSeq: null, alignMode: true }
  const writes = []
  handleFrame(state, frame(7, encodeAlign({ seq: 5, cols: 40, rows: 4, cursorX: 0, cursorY: 0, text: 'NOW' })), {
    onOutput: (bytes) => writes.push(bytes),
    onAlign: (snap) => replace(e, id, snap.text, snap.cursorX, snap.cursorY),
  })
  assert.equal(writes.length, 0)
  assert.match(dump(e, id), /^NOW/)
  assert.doesNotMatch(dump(e, id), /OLD/)
  handleFrame(state, frame(0, encodeSequenced(4, new TextEncoder().encode('STALE'))), {
    onOutput: (bytes) => { writes.push(bytes); write(e, id, bytes) },
  })
  assert.equal(writes.length, 0)
  assert.doesNotMatch(dump(e, id), /STALE/)
  handleFrame(state, frame(0, encodeSequenced(6, new TextEncoder().encode('NEXT'))), {
    onOutput: (bytes) => { writes.push(new TextDecoder().decode(bytes)); write(e, id, bytes) },
  })
  assert.deepEqual(writes, ['NEXT'])
  assert.match(dump(e, id), /NEXT/)
  assert.doesNotMatch(dump(e, id), /\u0000/)
  e.dnt_free(id)
})

test('KA-3 align mode data frame is seq plus raw bytes', () => {
  const sent = []
  const att = new Attach({ write: (b) => sent.push(b), destroyed: false }, { screenText: () => '' })
  att.v = 2
  att.alignMode = true
  att.data(Buffer.from('hello'), 9)
  const body = channelPayload(sent[0])
  assert.equal(body[4], FR_KIND.DATA)
  const payload = body.subarray(9)
  assert.equal(payload.readUInt32BE(0), 9)
  assert.equal(payload.subarray(4).toString(), 'hello')
})

function unconditionalClose(block) {
  const gated = block.replace(/if \(unmountAction\([\s\S]*?\) === 'release'\) closePaneSession\(rec\)/, '')
  return /closePaneSession\(/.test(gated)
}

function closeSites(src) {
  return src.split('\n').map((line, i) => ({ line: i + 1 ? line : line })).filter((row) => row.line.includes('closePaneSession('))
}

function frame(kind, payload) {
  const body = encodeChannel(0, kind, Buffer.from(payload))
  return new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
}

function channelPayload(wsFrame) {
  let len = wsFrame[1] & 0x7f
  let off = 2
  if (len === 126) { len = wsFrame.readUInt16BE(2); off = 4 }
  return wsFrame.subarray(off, off + len)
}

async function loadWasm() {
  const { readFileSync } = await import('node:fs')
  const bytes = readFileSync(join(root, 'assets/dnt-core.wasm'))
  const { instance } = await WebAssembly.instantiate(bytes, {})
  const e = instance.exports
  const mem = () => new Uint8Array(e.memory.buffer)
  const dec = new TextDecoder()
  const write = (exp, id, s) => {
    const b = typeof s === 'string' ? new TextEncoder().encode(s) : s
    const p = exp.dnt_alloc(b.length)
    mem().set(b, p)
    exp.dnt_write(id, p, b.length)
    exp.dnt_dealloc(p, b.length)
  }
  const dump = (exp, id) => {
    const p = exp.dnt_dump(id, 0, 8)
    const n = exp.dnt_dump_len(id)
    return dec.decode(mem().subarray(p, p + n))
  }
  const replace = (exp, id, text, x, y) => {
    const b = new TextEncoder().encode(text)
    const p = exp.dnt_alloc(Math.max(b.length, 1))
    if (b.length) mem().set(b, p)
    exp.dnt_replace_visible(id, p, b.length, x, y)
    exp.dnt_dealloc(p, Math.max(b.length, 1))
  }
  return { e, write, dump, replace }
}
