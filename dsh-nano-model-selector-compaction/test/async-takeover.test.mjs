/**
 * async-takeover.test.mjs — 拟真 (high-fidelity simulation) suite for the
 * DNMS01 async-compaction takeover.
 *
 * Drives the real NanoCompactionEngine end-to-end against fake ctx/session/
 * agent harnesses: every compaction goes through the real
 * prepare→summarize→commit transaction in compact-region.js, so the durable
 * event stream (compaction/start|summary|end, user/message surfaceOp.replace)
 * is observed exactly as a host would persist it.
 *
 * Hermetic: ASYNC_COMPACT_PATH is derived at module import time from
 * DSH_DATA_DIR/DSH_HOME, so the env var is set to a tmp dir BEFORE the engine
 * module is imported below. No real ~/.dsh-dev writes.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, renameSync as fsRenameSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

// -- hermetic policy-file root (must precede importing host-compaction.js) ----
const DATA_DIR = mkdtempSync(join(tmpdir(), 'dnms01-takeover-'))
process.env.DSH_DATA_DIR = DATA_DIR
const POLICY_PATH = join(DATA_DIR, 'plugins/nano-model-selector/async-compact.json')

// P4-03: cordis Service is not resolvable from this offline workspace, so the
// test injects a faithful real-Service stand-in through the legit loader seam —
// the engine still runs on a class with cordis semantics (provide/check/filter),
// not the retired vendored shadow. The fixture is the caller's own resolution.
const { setHostService } = await import('../lib/host-services.js')
setHostService(class {
  static init = Symbol.for('cordis.init')
  static check = Symbol.for('cordis.check')
  static config = Symbol.for('cordis.config')
  static invoke = Symbol.for('cordis.invoke')
  static extend = Symbol.for('cordis.extend')
  static tracker = Symbol.for('cordis.tracker')
  static resolveConfig = Symbol.for('cordis.resolveConfig')
  constructor(ctx, name) {
    this.ctx = ctx
    this.name = name ?? this.constructor['provide']
    ctx.reflect?.provide?.(this.name, this, this.constructor[Symbol.for('cordis.check')])
  }
})
const { default: NanoCompactionEngine } = await import('../lib/host-compaction.js')
const {
  assertNoActiveCompaction,
  inspectCompactionEntryState,
  prepareCompactionTransaction,
} = await import('../lib/compact-region.js')
const { compactRuntime } = await import('../../dsh-nano-model-selector/lib/compact-runtime.js')

test.after(() => rmSync(DATA_DIR, { recursive: true, force: true }))

const W = 100_000 // fake nominal context window

/* ------------------------------- policy file ---------------------------- */

function writePolicy(overrides = {}) {
  mkdirSync(dirname(POLICY_PATH), { recursive: true })
  writeFileSync(POLICY_PATH, JSON.stringify({
    schema: 1,
    model: { provider: '', model: '' },
    bufferSizeAsync: 0.65,   // B
    healthTargetAsync: 0.5,  // H
    bufferSizeSafety: 0.9,   // S (read-only at 0.90; no read-time restamp)
    pinnedAsyncTokens: 100,  // < floor(0.15*W)=150 → effectivePin=100, no DC-1
    pinnedFullTokens: 100,
    ...overrides,
  }))
}

function corruptPolicy() {
  mkdirSync(dirname(POLICY_PATH), { recursive: true })
  writeFileSync(POLICY_PATH, '{corrupt-json')
}

/* ------------------------------- fake ctx ------------------------------- */

function makeLogger() {
  const records = { info: [], warn: [], debug: [] }
  return {
    records,
    info: m => records.info.push(String(m)),
    warn: m => records.warn.push(String(m)),
    debug: m => records.debug.push(String(m)),
  }
}

function makeMeter() {
  return {
    /** nodes aligned 1:1 with session.surface.nodes (seq + tokens). */
    measure(session) {
      const nodes = session.surface.nodes.map(seq => {
        const tokens = session.weights.get(seq) ?? 10
        return { seq, eventSeq: seq, tokens, heuristicTokens: tokens, type: session.eventAt(seq).type }
      })
      return { nodes, totalTokens: nodes.reduce((t, n) => t + n.tokens, 0) }
    },
    /** framed checkpoint size — must stay < shadowedRouteTokenCount. */
    estimateMessage() { return 16 },
  }
}

function makeLlm({ window = W, summaryText = '## Primary Request and Intent\n- keep working' } = {}) {
  const state = {
    W,
    summaryText,
    streamCalls: [],
    failWith: [],        // errors thrown by successive stream() calls
    hangGate: null,      // {promise} — stream awaits it before yielding
    _streamStartedResolve: null,
    streamStarted: null, // resolves once a hanging stream is entered
  }
  state.resetGate = () => {
    let release
    state.hangGate = { promise: new Promise(r => { release = r }), release }
    state.streamStarted = new Promise(r => { state._streamStartedResolve = r })
  }
  return {
    state,
    async resolveModelInfo() { return { context: { contextWindow: state.W } } },
    async *stream(options) {
      state.streamCalls.push(options)
      if (state.hangGate !== null) {
        state._streamStartedResolve()
        await state.hangGate.promise
        if (options.signal?.aborted) throw options.signal.reason
      }
      const fail = state.failWith.shift()
      if (fail) throw fail
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: state.summaryText }
      yield { type: 'block-end', index: 0, block: { type: 'text', text: state.summaryText } }
      yield { type: 'usage', usage: { inputTokens: 10, outputTokens: 5 } }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
}

function makeCtx({ llm = makeLlm(), meter = makeMeter(), logger = makeLogger() } = {}) {
  const listeners = {
    'agent/pre-step': [], 'agent/status': [], 'agent/request': [],
    'agent/request-error': [], 'session/event': [],
  }
  const flushed = []
  const pruner = { calls: 0, pruneSession() { this.calls += 1 } }
  const agents = { withInitiator: (_agent, fn) => fn() }
  const services = new Map([['toolResultPruner', pruner], ['agents', agents]])
  return {
    logger, llm, tokenMeter: meter, flushed, pruner, listeners,
    sessions: { flush: async s => { flushed.push(s.id) } },
    agents,
    reflect: { provide() {} },           // cordis Service constructor hook
    get(name) { return services.get(name) },
    _services: services,
    waterfall: () => false,              // compaction/summary-error: no recovery
    on(event, handler) { listeners[event]?.push(handler) },
    async emitPreStep(agent, signal = new AbortController().signal) {
      for (const h of listeners['agent/pre-step']) await h({ agent, signal }, () => Promise.resolve())
    },
    emitStatus(agent, status) {
      for (const h of listeners['agent/status']) h({ agent, status })
    },
    /**
     * Drive one async episode to completion under the concurrent contract:
     * the summarizer runs in the background after the step boundary, and the
     * commit lands at the NEXT step boundary (or at idle if the turn ended).
     */
    async settle(agent) {
      const episode = this.engine._episode(agent.session)
      if (episode.attempt !== undefined) { try { await episode.attempt } catch { /* dropped inside */ } }
      // Commit through the engine's own boundary method: driving another
      // pre-step here would re-arm a dropped episode and start a new attempt.
      await this.engine._finishEpisode(agent, episode)
    },
    async emitRequest(agent, config, signal = new AbortController().signal) {
      let result = config
      for (const h of listeners['agent/request']) result = await h({ agent, signal }, async () => result)
      return result
    },
    emitSessionEvent(session, event) {
      for (const h of listeners['session/event']) h(session, event)
    },
  }
}

/* ------------------------------ fake session ---------------------------- */

const SURFACE_TYPES = new Set(['system/message', 'user/message', 'assistant/message', 'tool/result'])

function makeSession(id) {
  const events = []
  const bySeq = new Map()
  const session = {
    id, events, seq: 0,
    surface: { nodes: [], replaceGeneration: 0 },
    weights: new Map(),
    _header: null,
    requestHeader() { return this._header },
    setHeader(provider, model, tools = []) {
      this._header = { config: { provider, model }, tools }
      return this._header
    },
    eventAt(seq) {
      const e = bySeq.get(seq)
      if (e === undefined) throw new Error(`no event at seq ${seq}`)
      return e
    },
    append(type, data, opts) {
      const event = { seq: this.seq++, type, data, ...(opts ?? {}), time: Date.now() }
      events.push(event)
      bySeq.set(event.seq, event)
      if (opts?.surfaceOp?.op === 'replace') {
        const nodes = this.surface.nodes
        const startIdx = nodes.indexOf(opts.surfaceOp.startSeq)
        const endIdx = nodes.indexOf(opts.surfaceOp.endSeq)
        if (startIdx === -1 || endIdx === -1) {
          throw new Error(`surfaceOp range ${opts.surfaceOp.startSeq}-${opts.surfaceOp.endSeq} not on surface`)
        }
        nodes.splice(startIdx, endIdx - startIdx + 1, event.seq)
        this.surface.replaceGeneration += 1
      } else if (SURFACE_TYPES.has(type)) {
        this.surface.nodes.push(event.seq)
      }
      return event
    },
    toolHistory() { return [] },
    deriveEventMessage(event) {
      if (event.type === 'system/message' || event.type === 'user/message' || event.type === 'assistant/message') {
        const d = event.data
        return d?.role !== undefined ? d : d?.message ?? null
      }
      return null
    },
    addMessage(role, text, tokens) {
      const type = role === 'system' ? 'system/message' : role === 'assistant' ? 'assistant/message' : 'user/message'
      const e = this.append(type, { message: { role, content: [{ type: 'text', text }] } })
      this.weights.set(e.seq, tokens)
      return e
    },
    eventsOf(type) { return events.filter(e => e.type === type) },
  }
  return session
}

/** sys 150 + 6 msgs x100 → fill 0.75 ∈ [B=0.65, S=0.90). */
function makeBLineSession(id) {
  const session = makeSession(id)
  session.setHeader('prov', 'mod')
  session.addMessage('system', 'sys', 15000)
  const msgs = []
  for (let i = 0; i < 6; i += 1) msgs.push(session.addMessage('user', `msg${i}`, 10000))
  return { session, msgs }
}

/** sys 150 + 8 msgs x100 → fill 0.95 ≥ S=0.90. */
function makeSLineSession(id) {
  const session = makeSession(id)
  session.setHeader('prov', 'mod')
  session.addMessage('system', 'sys', 15000)
  const msgs = []
  for (let i = 0; i < 8; i += 1) msgs.push(session.addMessage('user', `msg${i}`, 10000))
  return { session, msgs }
}

/* ------------------------------- fake agent ----------------------------- */

function makeAgent(session, options = {}) {
  const maintenanceCalls = []
  return {
    session,
    options,
    followups: [],
    maintenanceCalls,
    maintenanceCtl: null,
    followup(msg) { this.followups.push(msg) },
    runMaintenance(fn) {
      const ctl = new AbortController()
      this.maintenanceCtl = ctl
      const promise = Promise.resolve().then(() => fn(ctl.signal))
      maintenanceCalls.push({ ctl, promise })
      return promise
    },
  }
}

function makeEngine(ctx) { return (ctx.engine = new NanoCompactionEngine(ctx)) }

function transientError(code = 'NETWORK', message = `${code.toLowerCase()} down`) {
  const e = new Error(message)
  e.code = code
  return e
}

/* ============================ 1. B-line arm ============================== */

test('B-line arm → background summarize → commit at the next step boundary, no wake turn', async () => {
  writePolicy()
  const ctx = makeCtx()
  makeEngine(ctx)
  const { session } = makeBLineSession('s-bline')
  const agent = makeAgent(session)

  // pre-step qualifies B and arms the ephemeral episode — no durable events yet.
  await ctx.emitPreStep(agent)
  assert.equal(session.eventsOf('compaction/start').length, 0)
  assert.equal(session.eventsOf('compaction/end').length, 0)

  // idle boundary: the one physical summarizer attempt runs in runMaintenance.
  await ctx.settle(agent)

  // Durable events: start → summary → checkpoint user/message → end, in order.
  const types = session.events.map(e => e.type)
  const iStart = types.indexOf('compaction/start')
  const iSummary = types.indexOf('compaction/summary')
  const iCkpt = session.events.findIndex(e => e.type === 'user/message' && e.surfaceOp?.op === 'replace')
  const iEnd = types.indexOf('compaction/end')
  assert.ok(iStart !== -1 && iSummary !== -1 && iCkpt !== -1 && iEnd !== -1,
    `missing durable events in ${JSON.stringify(types)}`)
  assert.ok(iStart < iSummary && iSummary < iCkpt && iCkpt < iEnd,
    `durable events out of order: ${iStart}<${iSummary}<${iCkpt}<${iEnd}`)

  // owner:null → lifecycle turn is null on the bracket events.
  assert.equal(session.events[iStart].data.turn, null)
  assert.equal(session.events[iEnd].data.turn, null)
  assert.equal(session.events[iEnd].data.error, undefined)
  // same compactionId correlates the whole transaction
  const compactionId = session.events[iStart].data.compactionId
  assert.equal(session.events[iSummary].data.compactionId, compactionId)
  assert.equal(session.events[iCkpt].data.source.compactionId, compactionId)
  assert.equal(session.events[iEnd].data.compactionId, compactionId)

  // No wake message: the commit lands at a step boundary, so the surface is
  // already replaced when the next request assembles. Sending a followup here
  // used to start a fresh turn on a session the user had already finished.
  assert.equal(agent.followups.length, 0, 'async compaction must not start a turn')

  // episode settled; durability checkpoint flushed.
  assert.deepEqual(ctx.flushed, ['s-bline'])
})

/* ================= 7. surfaceOp.replace content observation ============= */

test('checkpoint user/message carries surfaceOp.replace covering the shadowed range', async () => {
  writePolicy()
  const ctx = makeCtx()
  makeEngine(ctx)
  const { session, msgs } = makeBLineSession('s-ckpt')
  const agent = makeAgent(session)

  await ctx.emitPreStep(agent)
  await ctx.settle(agent)

  const summary = session.eventsOf('compaction/summary')[0]
  // retain=100 → only the last msg kept; shadowed = m0..m4.
  const shadowed = msgs.slice(0, 5).map(m => m.seq)
  assert.deepEqual(summary.data.shadowedSeqs, shadowed)
  assert.deepEqual(summary.data.shadowedRange, { start: shadowed[0], end: shadowed.at(-1) })
  assert.equal(summary.data.shadowedTokenCount, 50000)
  assert.equal(summary.data.provider, 'prov')
  assert.equal(summary.data.model, 'mod')
  assert.ok(summary.data.llmStreamCall === true)

  const ckpt = session.events.find(e => e.type === 'user/message' && e.surfaceOp)
  assert.deepEqual(ckpt.surfaceOp, {
    op: 'replace', startSeq: shadowed[0], endSeq: shadowed.at(-1),
  })
  assert.equal(ckpt.data.source.kind, 'compact-checkpoint')
  assert.deepEqual(
    ckpt.sourceEventSeqs,
    [session.eventsOf('compaction/start')[0].seq, summary.seq, ...shadowed],
  )

  // framed checkpoint content: preamble + <compacted-summary>…</compacted-summary>
  const [first, mid, last] = ckpt.data.content
  assert.match(first.text, /This is a compaction checkpoint/)
  assert.match(first.text, /compactionId: /)
  assert.match(first.text, /inspect_checkpoint/)
  assert.match(first.text, /<compacted-summary>$/)
  assert.equal(mid.text, '## Primary Request and Intent\n- keep working')
  assert.equal(last.text, '</compacted-summary>')

  // surface actually replaced: the checkpoint splices in-place where the
  // shadowed span sat → [sys, ckpt, m5] (m5 is the retained tail).
  assert.deepEqual(
    session.surface.nodes,
    [session.surface.nodes[0], ckpt.seq, msgs[5].seq],
  )
  assert.equal(session.surface.replaceGeneration, 1)
})

/* ==================== 2. one-active lock ================================ */

test('one-active: a second B-line arm does not double-start; open bracket blocks assertNoActiveCompaction', async () => {
  writePolicy()
  const ctx = makeCtx()
  const engine = makeEngine(ctx)
  const { session } = makeBLineSession('s-lock')
  const agent = makeAgent(session)

  await ctx.emitPreStep(agent)
  const episode = engine._episodes.get(session.id)
  // The summarizer is kicked at the boundary, so the phase is already running.
  assert.equal(episode.phase, 'running')

  // A second boundary must not start a second attempt, and the durable bracket
  // is still deferred (nothing is written until commit).
  await ctx.emitPreStep(agent)
  assert.equal(episode.phase, 'running')
  assert.equal(session.eventsOf('compaction/start').length, 0)
  assert.equal(agent.maintenanceCalls.length, 0)
  await episode.attempt

  // durable one-active gate: an open compaction/start bracket blocks.
  const foreign = makeSession('s-foreign')
  foreign.addMessage('user', 'a', 10)
  foreign.addMessage('user', 'b', 10)
  foreign.append('compaction/start', { compactionId: 'cx', turn: null })
  assert.throws(
    () => assertNoActiveCompaction(foreign, 'test stage'),
    e => e.code === 'busy' && /test stage/.test(e.message),
  )
  assert.notEqual(inspectCompactionEntryState(foreign).unmatchedCompactionStart, undefined)
  assert.throws(
    () => prepareCompactionTransaction(
      {}, foreign, foreign.surface.nodes[0], foreign.surface.nodes[1],
      { owner: null, stability: 'selected-span' }, agent,
    ),
    e => e.code === 'busy',
  )
  // end-seed-free close releases the lock.
  foreign.append('compaction/end', { compactionId: 'cx', turn: null })
  assert.doesNotThrow(() => assertNoActiveCompaction(foreign, 'test stage'))

  // owner:null tx on a session with an open turn is rejected as busy.
  const turned = makeSession('s-turned')
  turned.addMessage('user', 'a', 10)
  turned.addMessage('user', 'b', 10)
  turned.append('turn/start', { turn: 't-1' })
  assert.throws(
    () => prepareCompactionTransaction(
      {}, turned, turned.surface.nodes[0], turned.surface.nodes[1],
      { owner: null, stability: 'selected-span' }, agent,
    ),
    e => e.code === 'busy' && /open turn/.test(e.message),
  )
})

test('one-active: durable lock suppresses a second B-line arm while the bracket is open', async () => {
  writePolicy()
  const ctx = makeCtx()
  const engine = makeEngine(ctx)
  const { session } = makeBLineSession('s-lock2')
  const agent = makeAgent(session)

  // A foreign bracket holds the durable one-active gate.
  session.append('compaction/start', { compactionId: 'foreign', turn: null })

  await ctx.emitPreStep(agent)
  // B-line re-qualification is suppressed before arming.
  assert.ok(ctx.logger.records.info.some(m => m.includes('durable compaction lock already held')))
  assert.equal(engine._episodes.get(session.id).phase, 'none')
  assert.equal(session.eventsOf('compaction/start').length, 1)

  // Releasing the foreign bracket lets the next boundary arm and run.
  session.append('compaction/end', { compactionId: 'foreign', turn: null })
  await ctx.emitPreStep(agent)
  assert.equal(engine._episodes.get(session.id).phase, 'running')
  await ctx.settle(agent)
  assert.equal(session.eventsOf('compaction/start').length, 2)
  assert.equal(session.eventsOf('compaction/end').length, 2)
})

/* ==================== in-flight re-entry guard ========================== */

test('a second idle while an episode attempt is in-flight is a no-op: one attempt, one compaction/end', async () => {
  writePolicy()
  const ctx = makeCtx()
  const engine = makeEngine(ctx)
  const { session } = makeBLineSession('s-race')
  const agent = makeAgent(session)

  ctx.llm.state.resetGate()                        // the attempt will hang inside stream()
  await ctx.emitPreStep(agent)
  await ctx.llm.state.streamStarted

  // Re-entry guard: the boundary flips phase 'armed' → 'running' before the
  // async work, so a second boundary or a second idle is a no-op.
  const episode = engine._episodes.get(session.id)
  assert.equal(episode.phase, 'running')
  await ctx.emitPreStep(agent)
  ctx.emitStatus(agent, 'idle')
  assert.equal(episode.phase, 'running')
  assert.equal(session.eventsOf('compaction/start').length, 0)

  ctx.llm.state.hangGate.release()
  await episode.attempt
  await ctx.emitPreStep(agent)

  // Exactly one clean transaction committed — one start/summary/ckpt/end pair.
  assert.equal(session.eventsOf('compaction/start').length, 1)
  assert.equal(session.eventsOf('compaction/summary').length, 1)
  assert.ok(session.events.some(e => e.type === 'user/message' && e.surfaceOp))
  const ends = session.eventsOf('compaction/end')
  assert.equal(ends.length, 1)
  assert.equal(ends[0].data.error, undefined)
  assert.equal(
    ends[0].data.compactionId,
    session.eventsOf('compaction/start')[0].data.compactionId,
  )
  assert.equal(episode.phase, 'none')
  // No wake: a finished session must not be re-triggered by a compaction.
  assert.equal(agent.followups.length, 0)
})

/* ============================ 3. S-line FULL ============================ */

test('S-line FULL: fill ≥ 0.90 runs synchronous compactSurfaceRegion inside pre-step, turn-scoped', async () => {
  writePolicy()
  const ctx = makeCtx()
  const engine = makeEngine(ctx)
  const { session } = makeSLineSession('s-full')
  session.append('turn/start', { turn: 'turn-1' }) // open turn → owner resolves
  const agent = makeAgent(session)

  await ctx.emitPreStep(agent) // FULL happens inside this call, before next()

  const starts = session.eventsOf('compaction/start')
  const ends = session.eventsOf('compaction/end')
  assert.equal(starts.length, 1)
  assert.equal(ends.length, 1)
  assert.equal(starts[0].data.turn, 'turn-1')
  assert.equal(ends[0].data.turn, 'turn-1')
  assert.equal(session.eventsOf('compaction/summary').length, 1)
  assert.ok(session.events.some(e => e.type === 'user/message' && e.surfaceOp))
  assert.ok(ctx.logger.records.info.some(m => m.includes('safety/full')))
  assert.ok(ctx.pruner.calls >= 1)
  // FULL is synchronous — nothing was ever armed for async.
  assert.equal(engine._episodes.get(session.id).phase, 'none')
  assert.equal(agent.maintenanceCalls.length, 0)
})

/* ============================ 4. circuit ================================ */

test('circuit: two consecutive transient failures open it; next arm suppressed; S-line FULL success resets', async () => {
  writePolicy()
  const ctx = makeCtx()
  const engine = makeEngine(ctx)
  const { session } = makeBLineSession('s-circuit')
  const agent = makeAgent(session)
  const episode = engine._episode(session)

  ctx.llm.state.failWith = [transientError('NETWORK'), transientError('NETWORK')]

  // attempt 1 → transient drop. The bracket is deferred, so a summarize
  // failure writes NOTHING durable: no unmatched start to clean up.
  await ctx.emitPreStep(agent)
  await ctx.settle(agent)
  assert.equal(episode.phase, 'none')
  assert.equal(episode.circuit.transientFailures, 1)
  assert.equal(episode.circuit.open, false)
  assert.equal(session.eventsOf('compaction/start').length, 0)
  assert.equal(session.eventsOf('compaction/end').length, 0)

  // attempt 2 → transient drop → circuit opens
  await ctx.emitPreStep(agent)
  await ctx.settle(agent)
  assert.equal(episode.circuit.transientFailures, 2)
  assert.equal(episode.circuit.open, true)
  assert.ok(ctx.logger.records.warn.some(m => m.includes('circuit opened')))

  // third B-line qualification: arm suppressed, warn logged once, no new events.
  const warnCount = ctx.logger.records.warn.length
  await ctx.emitPreStep(agent)
  assert.equal(episode.phase, 'none')
  assert.equal(session.eventsOf('compaction/start').length, 0)
  assert.ok(ctx.logger.records.warn.slice(warnCount).some(m => m.includes('auto arming suppressed')))
  await ctx.emitPreStep(agent) // suppressedLogged latch: no repeat warn
  assert.equal(ctx.logger.records.warn.filter(m => m.includes('auto arming suppressed')).length, 1)

  // S-line FULL remains live under an open circuit and resets it on success.
  session.addMessage('user', 'extra1', 10000)
  session.addMessage('user', 'extra2', 10000) // 950/1000 = 0.95 ≥ S
  session.append('turn/start', { turn: 'turn-s' })
  await ctx.emitPreStep(agent)
  assert.equal(session.eventsOf('compaction/start').length, 1)
  assert.equal(session.eventsOf('compaction/summary').length, 1)
  assert.equal(episode.circuit.open, false)
  assert.equal(episode.circuit.transientFailures, 0)
})

/* ================= 5. policy missing/corrupt → safetyOnly =============== */

test('corrupt policy file → safetyOnly: B-line does not arm, S-line still FULLs', async () => {
  corruptPolicy()
  const ctx = makeCtx()
  const engine = makeEngine(ctx)

  // B-line fill: safetyOnly gates everything below S → no arm, no events.
  const below = makeBLineSession('s-deg-b')
  const agentB = makeAgent(below.session)
  await ctx.emitPreStep(agentB)
  assert.equal(engine._episodes.get(below.session.id), undefined) // episode never created
  assert.equal(below.session.eventsOf('compaction/start').length, 0)
  ctx.emitStatus(agentB, 'idle')
  assert.equal(agentB.maintenanceCalls.length, 0)

  // S-line fill: the trusted-safety FULL stays live in degraded mode.
  const above = makeSLineSession('s-deg-s')
  above.session.append('turn/start', { turn: 'turn-deg' })
  const agentS = makeAgent(above.session)
  await ctx.emitPreStep(agentS)
  assert.equal(above.session.eventsOf('compaction/start').length, 1)
  assert.equal(above.session.eventsOf('compaction/end').length, 1)
  assert.equal(above.session.eventsOf('compaction/start')[0].data.turn, 'turn-deg')
})

test('missing policy file → DEFAULT_POLICY (B-line arms) — diverges from spec wording', async () => {
  // Spec wording said "policy missing/corrupt → safetyOnly"; the implementation
  // (and readState's documented contract) yields DEFAULT_POLICY for a missing
  // file — fail-closed applies only to unreadable/corrupt state. Asserting the
  // implemented behavior; flagged here as a divergence to confirm with owners.
  rmSync(POLICY_PATH, { force: true })
  const ctx = makeCtx()
  const engine = makeEngine(ctx)
  const { session } = makeBLineSession('s-missing')
  const agent = makeAgent(session)
  await ctx.emitPreStep(agent)
  assert.equal(engine._episodes.get(session.id).phase, 'running')
  await ctx.settle(agent)
  assert.equal(session.eventsOf('compaction/end').length, 1)
})

/* ===================== 6. compact-runtime fold =========================== */

test('compact-runtime: fold start→busy, summary→busy+meta, end→completed/failed + degraded', () => {
  const ctx = makeCtx()
  const rt = compactRuntime(ctx) // no sessionProjections → per-session degraded fold
  assert.equal(rt.degradedProjection, true)

  const session = makeSession('s-rt')
  session.setHeader('prov', 'mod')
  session.addMessage('user', 'x', 50000)

  const start = session.append('compaction/start', { compactionId: 'c1', turn: null })
  ctx.emitSessionEvent(session, start)
  assert.equal(rt.runtime(session, W, null).lastCompaction.status, 'busy')

  const summary = session.append('compaction/summary', {
    compactionId: 'c1', summary: [{ type: 'text', text: 's' }],
    shadowedRange: { start: 0, end: 0 }, shadowedSeqs: [0],
    shadowedTokenCount: 500, provider: 'prov', model: 'mod', llmStreamCall: true,
  })
  ctx.emitSessionEvent(session, summary)
  let r = rt.runtime(session, W, null)
  assert.equal(r.lastCompaction.status, 'busy')
  assert.equal(r.lastCompaction.provider, 'prov')
  assert.equal(r.lastCompaction.model, 'mod')
  assert.equal(r.lastCompaction.shadowedTokenCount, 500)

  const end = session.append('compaction/end', { compactionId: 'c1', turn: null })
  ctx.emitSessionEvent(session, end)
  r = rt.runtime(session, W, null)
  assert.equal(r.lastCompaction.status, 'completed')
  assert.equal(r.lastCompaction.at, end.time)
  assert.equal(r.degraded, null)
  assert.equal(r.fill, 50000 / W)

  // failed end → status failed + degraded closed-set entry.
  const session2 = makeSession('s-rt2')
  session2.addMessage('user', 'y', 10000)
  ctx.emitSessionEvent(session2, session2.append('compaction/start', { compactionId: 'c2', turn: null }))
  ctx.emitSessionEvent(session2, session2.append('compaction/end', { compactionId: 'c2', turn: null, error: 'kaboom' }))
  const r2 = rt.runtime(session2, W, null)
  assert.equal(r2.lastCompaction.status, 'failed')
  assert.equal(r2.lastCompaction.degradedReason, 'kaboom')
  assert.equal(r2.degraded, 'last-compaction-failed')

  // meter-unavailable enters the degraded closed set.
  const ctxBad = makeCtx()
  ctxBad.tokenMeter = { measure() { throw new Error('no meter') } }
  const rtBad = compactRuntime(ctxBad)
  const r3 = rtBad.runtime(session, W, null)
  assert.equal(r3.fill, null)
  assert.equal(r3.degraded, 'meter-unavailable')
})

/* ================= 8. abort/timeout drop path =========================== */

test('abort during summarize → episode dropped with no bracket written at all', async () => {
  writePolicy()
  const ctx = makeCtx()
  const engine = makeEngine(ctx)
  const { session } = makeBLineSession('s-timeout')
  const agent = makeAgent(session)

  ctx.llm.state.resetGate()
  await ctx.emitPreStep(agent)
  await ctx.llm.state.streamStarted // summarizer is inside ctx.llm.stream, hanging

  // Deterministic abort: the agentSignal arm of AbortSignal.any fires (same
  // drop path as the EPISODE_TIMEOUT_MS arm — the test cannot patch the
  // internal constant, so it exercises the real signal plumbing instead).
  const aborted = engine._episode(session)
  aborted.attemptAbort?.abort()
  ctx.llm.state.hangGate.release()
  await aborted.attempt

  // Deferred bracket: an abort during summarize writes NOTHING durable. The
  // old contract opened compaction/start at prepare and had to close it with
  // end{error}; now there is no bracket to leak in the first place.
  assert.equal(session.eventsOf('compaction/start').length, 0)
  assert.equal(session.eventsOf('compaction/end').length, 0)
  assert.equal(engine._episode(session).phase, 'none')
  const drop = ledgerOf('s-timeout').find(r => r.kind === 'drop')
  assert.ok(drop !== undefined)
  assert.equal(drop.bracketed, false)
  // no unmatched start — the one-active gate is released.
  assert.equal(inspectCompactionEntryState(session).unmatchedCompactionStart, undefined)
  assert.equal(session.eventsOf('compaction/summary').length, 0)
  assert.equal(engine._episodes.get(session.id).phase, 'none')
  assert.equal(agent.followups.length, 0)
  assert.ok(ctx.logger.records.warn.some(m => m.includes('episode dropped')))
  // -05③: timeout/abort is a settlement, not a failure — it must NOT mark the
  // turn as debounced, or a retry later in the same turn would be suppressed.
  assert.equal(engine._blockedTurns.get(session.id), undefined,
    'settlement drops (timeout/abort) never set the turn-block marker')
})

/* ================= 9. model-switch veto ================================ */

test('model-switch veto: compaction failure throws wrapped LlmError MODEL_SWITCH_COMPACTION_FAILED', async () => {
  writePolicy()
  const ctx = makeCtx()
  makeEngine(ctx)
  const { session } = makeSLineSession('s-veto')
  session.append('turn/start', { turn: 'turn-v' }) // owner:'current-turn' needs an open turn
  const agent = makeAgent(session)

  ctx.llm.state.failWith = [new Error('summarizer exploded')]

  await assert.rejects(
    ctx.emitRequest(agent, { provider: 'prov2', model: 'mod2' }),
    e => e.name === 'LlmError'
      && e.code === 'MODEL_SWITCH_COMPACTION_FAILED'
      && e.message.includes('prov2/mod2')
      && e.cause instanceof Error,
  )
  // previous request model preserved; bracket closed with error.
  assert.equal(session.requestHeader().config.provider, 'prov')
  assert.equal(inspectCompactionEntryState(session).unmatchedCompactionStart, undefined)
  assert.match(session.eventsOf('compaction/end')[0].data.error, /summarizer exploded/)
})

test('model-switch veto: same target or empty target passes through without compaction', async () => {
  writePolicy()
  const ctx = makeCtx()
  makeEngine(ctx)
  const { session } = makeSLineSession('s-veto-ok')
  const agent = makeAgent(session)

  // identical provider+model → early return, no compaction despite fill ≥ S.
  const same = await ctx.emitRequest(agent, { provider: 'prov', model: 'mod' })
  assert.deepEqual(same, { provider: 'prov', model: 'mod' })
  assert.equal(session.eventsOf('compaction/start').length, 0)

  // empty target fields → early return.
  const empty = await ctx.emitRequest(agent, { provider: '', model: 'mod2' })
  assert.deepEqual(empty, { provider: '', model: 'mod2' })
  assert.equal(session.eventsOf('compaction/start').length, 0)
})

/* ================= 8. async-history ledger (DNMS01 observability) ======== */

/** Read the ledger the engine appended for one session id. */
function ledgerOf(sessionId) {
  const path = join(DATA_DIR, 'plugins/nano-model-selector/async-history', `${sessionId}.jsonl`)
  if (!existsSync(path)) return null
  return readFileSync(path, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line))
}

test('ledger: a committed episode records arm → claim → commit in order', async () => {
  writePolicy()
  const ctx = makeCtx()
  makeEngine(ctx)
  const { session } = makeBLineSession('s-ledger-commit')
  const agent = makeAgent(session)

  await ctx.emitPreStep(agent)
  await ctx.settle(agent)

  const records = ledgerOf('s-ledger-commit')
  assert.ok(records !== null, 'ledger file was not written')
  assert.deepEqual(records.map(r => r.kind), ['arm', 'claim', 'select', 'commit'])

  const [arm, claim, select, commit] = records
  assert.equal(select.lane, 'async')
  assert.ok(['turn', 'step', 'node'].includes(select.boundary))
  assert.equal(typeof select.retainedTokens, 'number')
  assert.equal(select.targetTokens, 100)
  // arm carries the numbers that justified the decision
  assert.ok(arm.fill >= 0.65, `arm.fill ${arm.fill} should be at or above B`)
  assert.equal(arm.window, 100000)
  assert.equal(arm.retain, 100)
  assert.equal(arm.orderOk, true)
  assert.equal(typeof arm.at, 'string')
  // claim carries the summarizer target actually used
  assert.equal(claim.retain, 100)
  // commit carries the durable compaction id so the ledger joins the journal
  const durableId = session.eventsOf('compaction/start')[0].data.compactionId
  assert.equal(commit.compactionId, durableId)
  assert.ok(commit.tokens > 0)
  // `range` is the true event span, not the seam's surface-position pair
  // (which can be inverted after a replace).
  const summary = session.eventsOf('compaction/summary')[0]
  const seqs = summary.data.shadowedSeqs
  assert.deepEqual(commit.range, { first: Math.min(...seqs), last: Math.max(...seqs) })
  assert.ok(commit.range.first <= commit.range.last)
})

test('ledger: a dropped episode is recorded with bracketed:false (the silent case)', async () => {
  writePolicy()
  const ctx = makeCtx()
  makeEngine(ctx)
  const { session } = makeBLineSession('s-ledger-degraded')
  const agent = makeAgent(session)

  // A summarize failure under the deferred-bracket contract leaves no durable
  // trace at all — exactly the case the ledger exists for.
  ctx.llm.state.failWith = [transientError('NETWORK')]
  await ctx.emitPreStep(agent)
  await ctx.settle(agent)

  const records = ledgerOf('s-ledger-degraded')
  assert.ok(records !== null)
  const drop = records.find(r => r.kind === 'drop')
  assert.ok(drop !== undefined, `expected a drop record in ${JSON.stringify(records.map(r => r.kind))}`)
  assert.equal(drop.reason, 'transient')
  // No durable bracket exists for this failure — the ledger is the only trace.
  assert.equal(drop.bracketed, false)
  assert.equal(session.eventsOf('compaction/start').length, 0)
})

test('ledger: circuit-open suppression records a skip, not a second arm', async () => {
  writePolicy()
  const ctx = makeCtx()
  makeEngine(ctx)
  const { session } = makeBLineSession('s-ledger-skip')
  const agent = makeAgent(session)

  // Two consecutive transient failures open the circuit.
  ctx.llm.state.failWith = [transientError('NETWORK'), transientError('NETWORK')]
  for (let i = 0; i < 2; i += 1) {
    await ctx.emitPreStep(agent)
    await ctx.settle(agent)
  }
  const before = ledgerOf('s-ledger-skip').length

  await ctx.emitPreStep(agent)
  const records = ledgerOf('s-ledger-skip')
  const skip = records.at(-1)
  assert.equal(records.length, before + 1)
  assert.equal(skip.kind, 'skip')
  assert.equal(skip.reason, 'circuit-open')
})

test('ledger: every decision carries the instruction version actually in force', async () => {
  writePolicy({ extraRequirements: '' })
  const ctx = makeCtx()
  makeEngine(ctx)
  const { session } = makeBLineSession('s-ledger-version')
  const agent = makeAgent(session)

  await ctx.emitPreStep(agent)
  await ctx.settle(agent)

  const { instructionVersion } = await import('../lib/compact-region.js')
  const builtin = instructionVersion({ override: '' })
  const records = ledgerOf('s-ledger-version')
  for (const record of records) {
    if (record.kind === 'select') continue // select names the cut, not the contract
    assert.equal(record.promptVersion, builtin, `${record.kind} must report the built-in version`)
  }

  // An extra requirement is a different contract and must fingerprint differently.
  writePolicy({ extraRequirements: 'Summarize tersely.' })
  const ctx2 = makeCtx()
  makeEngine(ctx2)
  const second = makeBLineSession('s-ledger-version-2')
  const agent2 = makeAgent(second.session)
  await ctx2.emitPreStep(agent2)
  await ctx2.settle(agent2)

  const custom = instructionVersion({ override: 'Summarize tersely.' })
  assert.notEqual(custom, builtin)
  const customRecords = ledgerOf('s-ledger-version-2')
  assert.equal(customRecords[0].promptVersion, custom)
})

test('ledger: an unsafe session id is never written outside the ledger dir', async () => {
  const { asyncHistoryPath } = await import('../lib/async-history.js')
  assert.equal(asyncHistoryPath('../escape'), null)
  assert.equal(asyncHistoryPath('a/b'), null)
  assert.equal(asyncHistoryPath(''), null)
  assert.ok(asyncHistoryPath('session-767f1813-91b2-4ca7-a0f8-150ae6e7b6c5')?.endsWith('.jsonl'))
})

/* ============ 9. policy changes mid-flight ============================== */

test('raising B above the current fill disarms an in-flight episode', async () => {
  writePolicy()
  const ctx = makeCtx()
  const engine = makeEngine(ctx)
  const { session } = makeBLineSession('s-disarm')
  const agent = makeAgent(session)

  ctx.llm.state.resetGate()
  await ctx.emitPreStep(agent)
  await ctx.llm.state.streamStarted          // summarizer is running
  const episode = engine._episode(session)
  assert.equal(episode.phase, 'running')

  // The owner raises the buffer line above the current fill mid-turn.
  // 0.85 keeps the strict order legal (H 0.5 < B 0.85 < S 0.90) while sitting
  // above the fixture's 0.75 fill.
  writePolicy({ bufferSizeAsync: 0.85 })
  await ctx.emitPreStep(agent)

  assert.equal(episode.phase, 'none', 'the episode must be settled')
  assert.equal(session.eventsOf('compaction/start').length, 0, 'no bracket may be written')
  const drop = ledgerOf('s-disarm').find(r => r.kind === 'drop')
  assert.ok(drop !== undefined)
  assert.equal(drop.reason, 'disarmed')
  assert.equal(drop.bracketed, false)
  // Exactly one drop record: the attempt's own catch must not add a second.
  assert.equal(ledgerOf('s-disarm').filter(r => r.kind === 'drop').length, 1)

  ctx.llm.state.hangGate.release()
  await episode.attempt
  assert.equal(session.eventsOf('compaction/start').length, 0)
})

test('lowering B below the current fill arms on the very next step boundary', async () => {
  writePolicy({ bufferSizeAsync: 0.85 })     // above the fixture's 0.75 fill, below S
  const ctx = makeCtx()
  const engine = makeEngine(ctx)
  const { session } = makeBLineSession('s-rearm')
  const agent = makeAgent(session)

  await ctx.emitPreStep(agent)
  assert.equal(engine._episode(session).phase, 'none', 'no arm above the line')

  writePolicy({ bufferSizeAsync: 0.5 })      // the owner lowers it mid-turn
  await ctx.emitPreStep(agent)
  assert.equal(engine._episode(session).phase, 'running', 'the new line applies immediately')
  await ctx.settle(agent)
  assert.equal(session.eventsOf('compaction/start').length, 1)
})

test('the instruction version is stamped where the prompt is read, not at arm time', async () => {
  // The prompt is resolved inside the summarize closure, so that is where the
  // version must be computed. Recording the arm-time version made the ledger
  // claim a contract that could differ from the one actually sent.
  writePolicy({ extraRequirements: '' })
  const ctx = makeCtx()
  const engine = makeEngine(ctx)
  const { session } = makeBLineSession('s-version-live')
  const agent = makeAgent(session)
  const episode = engine._episode(session)

  const { instructionVersion } = await import('../lib/compact-region.js')
  episode.promptVersion = instructionVersion({ override: '' }) // what arm would have stamped

  writePolicy({ extraRequirements: 'Summarize tersely.' }) // policy changes before the read
  const deps = engine._regionDependencies(undefined, episode)
  // The LLM call itself is irrelevant here; the stamp happens before it.
  await deps.summarize({}, agent, undefined).catch(() => {})

  assert.equal(episode.promptVersion, instructionVersion({ override: 'Summarize tersely.' }))
  assert.notEqual(episode.promptVersion, instructionVersion({ override: '' }))
})

/* ============ 10. inspect_checkpoint tool (ACE-1117 -09) ================= */

const {
  INSPECT_TOOL_NAME,
  INSPECT_CHECKPOINT_DEFINITION,
  sessionHasCheckpoint,
  apply: applyInspectTool,
} = await import('../lib/inspect-checkpoint.js')

/** Session carrying one plugin-marked checkpoint whose sourceEventSeqs cite the bracket + two shadowed nodes. */
function makeCheckpointSession(id) {
  const session = makeSession(id)
  session.setHeader('prov', 'mod')
  const sys = session.addMessage('system', 'sys', 15000)
  const u1 = session.addMessage('user', 'first question text ' + 'x'.repeat(2100), 400)
  const a1 = session.addMessage('assistant', 'first answer', 300)
  const u2 = session.addMessage('user', 'second question', 200)
  // A checkpoint replacing u1..a1, written by the seam (marker + compactionId).
  const bracket = session.append('compaction/start', { compactionId: 'cp-00000001', turn: 1 })
  const sum = session.append('compaction/summary', { compactionId: 'cp-00000001', turn: 1, summary: [{ type: 'text', text: 'checkpoint text' }] })
  const cp = session.append('user/message', {
    role: 'user',
    // The frame text MUST name the tool literally — that is the identification
    // marker (P2-03b): frames without it are not our checkpoints.
    content: [{ type: 'text', text: '<compacted-summary>\nsummary body\n</compacted-summary>\nTo read the replaced text, call inspect_checkpoint with this compactionId.' }],
    source: { kind: 'compact-checkpoint', compactionId: 'cp-00000001' },
  }, {
    surfaceOp: { op: 'replace', startSeq: u1.seq, endSeq: a1.seq },
    sourceEventSeqs: [bracket.seq, sum.seq, u1.seq, a1.seq],
  })
  session.append('compaction/end', { compactionId: 'cp-00000001', turn: 1 })
  return { session, cp, sys, u1, a1, u2 }
}

function runTool(session, args) {
  return INSPECT_CHECKPOINT_DEFINITION.execute(args, { agent: { session }, signal: new AbortController().signal })
}

test('inspect_checkpoint: registration shape + when gate (-09②③④, P2 ④⑥)', async () => {
  assert.equal(INSPECT_TOOL_NAME, 'inspect_checkpoint')
  assert.equal('timeoutMs' in INSPECT_CHECKPOINT_DEFINITION, false)
  assert.equal(INSPECT_CHECKPOINT_DEFINITION.isConcurrencySafe(), true)
  assert.deepEqual(INSPECT_CHECKPOINT_DEFINITION.parameters.required, ['compactionId'])

  // when gate: false without a marked checkpoint, true once one is on the surface.
  const plain = makeSession('s-inspect-none')
  plain.setHeader('prov', 'mod')
  plain.addMessage('system', 'sys', 150)
  plain.addMessage('user', 'hi', 50)
  assert.equal(sessionHasCheckpoint(plain), false)

  const { session } = makeCheckpointSession('s-inspect-gated')
  assert.equal(sessionHasCheckpoint(session), true)

  // apply() registers exactly once through the real registration seam.
  const registrations = []
  applyInspectTool({ tools: { register: (def, opts) => { registrations.push({ def, opts }) } } })
  assert.equal(registrations.length, 1)
  assert.equal(registrations[0].def.name, INSPECT_TOOL_NAME)
  assert.equal(registrations[0].opts.when({ agent: { session: plain } }), false)
  assert.equal(registrations[0].opts.when({ agent: { session } }), true)

  // An unmarked (pre-seam native) checkpoint never advertises itself (P2 ⑥):
  // the surface scan only accepts the compact-checkpoint source marker.
  const legacy = makeSession('s-inspect-legacy')
  legacy.setHeader('prov', 'mod')
  legacy.addMessage('system', 'sys', 150)
  legacy.append('user/message', {
    role: 'user',
    content: [{ type: 'text', text: 'old unmarked checkpoint' }],
    // no source marker at all
  })
  assert.equal(sessionHasCheckpoint(legacy), false)
})

test('inspect_checkpoint: happy path returns shadowed source events, not the bracket (T05)', async () => {
  const { session, u1, a1, cp } = makeCheckpointSession('s-inspect-ok')
  const out = await runTool(session, { compactionId: 'cp-00000001' })
  assert.equal(typeof out, 'string')
  assert.match(out, /compactionId: cp-00000001/)
  assert.match(out, /total: 2/)
  // Only the two shadowed surface nodes are returned — never compaction/start
  // or compaction/summary, even though they lead sourceEventSeqs.
  assert.match(out, new RegExp(`seq ${u1.seq}`))
  assert.match(out, new RegExp(`seq ${a1.seq}`))
  assert.equal(out.includes(`seq ${session.events[session.surface.nodes.indexOf(cp.seq) - 1]?.seq} [compaction`), false)
  assert.match(out, /nextOffset: null/)
  // u1 is 2100+ chars: entry truncation fired with the true length.
  assert.match(out, /truncated, \d{4,} chars total/)
  assert.equal(out.includes('x'.repeat(2100)), false)
})

test('inspect_checkpoint: pagination and total cap (T05, -09⑤)', async () => {
  const session = makeSession('s-inspect-page')
  session.setHeader('prov', 'mod')
  session.addMessage('system', 'sys', 15000)
  const seqs = []
  for (let i = 0; i < 6; i += 1) seqs.push(session.addMessage('user', `message ${i} ${'y'.repeat(5000)}`, 10000).seq)
  const bracket = session.append('compaction/start', { compactionId: 'cp-00000002', turn: 1 })
  const sum = session.append('compaction/summary', { compactionId: 'cp-00000002', turn: 1, summary: [{ type: 'text', text: 's' }] })
  session.append('user/message', {
    role: 'user', content: [{ type: 'text', text: 'checkpoint inspect_checkpoint' }],
    source: { kind: 'compact-checkpoint', compactionId: 'cp-00000002' },
  }, {
    surfaceOp: { op: 'replace', startSeq: seqs[0], endSeq: seqs[5] },
    sourceEventSeqs: [bracket.seq, sum.seq, ...seqs],
  })
  // limit honoured, nextOffset advances.
  const page1 = await runTool(session, { compactionId: 'cp-00000002', limit: 2 })
  assert.match(page1, /entries: 0-2/)
  assert.match(page1, /nextOffset: 2/)
  const page2 = await runTool(session, { compactionId: 'cp-00000002', offset: 2, limit: 2 })
  assert.match(page2, /entries: 2-4/)
  // limit boundaries (-09④): 1 and 50 are legal; >50 clamps to 50 (never a
  // rejection); <1 and non-integers are rejected.
  const l1 = await runTool(session, { compactionId: 'cp-00000002', limit: 1 })
  assert.match(l1, /entries: 0-1/)
  const l50 = await runTool(session, { compactionId: 'cp-00000002', limit: 50 })
  assert.match(l50, /entries: 0-6/)
  const clamped = await runTool(session, { compactionId: 'cp-00000002', limit: 51 })
  assert.match(clamped, /entries: 0-6/, 'limit 51 clamps to 50 and still answers')
  await assert.rejects(() => runTool(session, { compactionId: 'cp-00000002', limit: 0 }), /limit/)
  await assert.rejects(() => runTool(session, { compactionId: 'cp-00000002', offset: -1 }), /offset/)
})

test('inspect_checkpoint: threat model — wrong id, wrong session, no session (T06)', async () => {
  const { session } = makeCheckpointSession('s-inspect-attack')
  // Unknown compactionId on this surface → error naming the available ids.
  await assert.rejects(() => runTool(session, { compactionId: 'cp-99999999' }), /no checkpoint 'cp-99999999'.*Available on surface: cp-00000001/s)
  // A compactionId from ANOTHER session is invisible here: the tool only
  // scans this session's surface, so a foreign id fails identically.
  const other = makeCheckpointSession('s-inspect-other')
  const foreignId = 'cp-00000001'
  const emptySurface = makeSession('s-inspect-empty')
  emptySurface.setHeader('prov', 'mod')
  emptySurface.addMessage('system', 'sys', 150)
  emptySurface.addMessage('user', 'hi', 50)
  await assert.rejects(() => runTool(emptySurface, { compactionId: foreignId }), /no checkpoint.*No checkpoints are available here/s)
  // No agent session → fail.
  await assert.rejects(
    () => INSPECT_CHECKPOINT_DEFINITION.execute({ compactionId: foreignId }, { signal: new AbortController().signal }),
    /no session context/,
  )
  // Arguments that bypass the schema (negative offset, over-limit, missing id)
  // are rejected by the definition itself, not by trusting the model.
  await assert.rejects(() => runTool(session, { compactionId: 'cp-00000001', offset: '0' }), /offset/)
  await assert.rejects(() => runTool(session, { compactionId: 'cp-00000001', limit: 0 }), /limit/)
  await assert.rejects(() => runTool(session, {}), /compactionId|undefined/)
})

test('inspect_checkpoint: identification + off-surface journal read + read-only counts (T06)', async () => {
  const { session } = makeCheckpointSession('s-inspect-id')
  // Marker-word substitution: same source marker but a frame that does NOT
  // name the tool → identical "not ours" error as an unmarked checkpoint.
  const foreign = makeSession('s-inspect-foreign')
  foreign.setHeader('prov', 'mod')
  const fu = foreign.addMessage('user', 'shadow me', 10)
  const fb = foreign.append('compaction/start', { compactionId: 'cp-ff', turn: 1 })
  const fs = foreign.append('compaction/summary', { compactionId: 'cp-ff', turn: 1, summary: [] })
  foreign.append('user/message', {
    role: 'user',
    content: [{ type: 'text', text: 'inspect_this_checkpoint with care' }], // decoy, not the literal name
    source: { kind: 'compact-checkpoint', compactionId: 'cp-ff' },
  }, {
    surfaceOp: { op: 'replace', startSeq: fu.seq, endSeq: fu.seq },
    sourceEventSeqs: [fb.seq, fs.seq, fu.seq],
  })
  assert.equal(sessionHasCheckpoint(foreign), false, 'decoy tool-name substring must not identify')
  await assert.rejects(() => runTool(foreign, { compactionId: 'cp-ff' }), /no checkpoint 'cp-ff'/)

  // Off-surface: shadow cp-00000001 under a second compaction, then read it
  // by id — the journal scan must reach it even though it left the surface.
  const u3 = session.addMessage('user', 'after the first checkpoint', 200)
  const b2 = session.append('compaction/start', { compactionId: 'cp-00000009', turn: 2 })
  const s2 = session.append('compaction/summary', { compactionId: 'cp-00000009', turn: 2, summary: [{ type: 'text', text: 's2' }] })
  const cpSeq = session.surface.nodes.find(s => session.eventAt(s)?.data?.source?.compactionId === 'cp-00000001')
  session.append('user/message', {
    role: 'user',
    content: [{ type: 'text', text: 'second frame inspect_checkpoint' }],
    source: { kind: 'compact-checkpoint', compactionId: 'cp-00000009' },
  }, {
    surfaceOp: { op: 'replace', startSeq: cpSeq, endSeq: u3.seq },
    sourceEventSeqs: [b2.seq, s2.seq, cpSeq, u3.seq],
  })
  const out = await runTool(session, { compactionId: 'cp-00000001' })
  assert.match(out, /total: 2/, 'shadowed checkpoint still inspectable off-surface (-09④)')

  // Read-only budget: no journal append, no ledger read, no fetch, no fs write.
  const appends = session.events.length
  await runTool(session, { compactionId: 'cp-00000009' })
  assert.equal(session.events.length, appends, 'append count must not change')
})

/* ============ 11. ACE-1117 P3: lifecycle, mutex, timeout, disarm ========== */

test('T08 idle maintenance commit: turn ends mid-summarize → exactly one runMaintenance commit, no wake', async (t) => {
  writePolicy()
  const ctx = makeCtx()
  const engine = makeEngine(ctx)
  const { session } = makeBLineSession('s-p3-idle')
  const agent = makeAgent(session)
  session.append('turn/start', { turn: 't-1' })

  ctx.llm.state.resetGate()
  await ctx.emitPreStep(agent)                 // arm + kick; summarize hangs
  await ctx.llm.state.streamStarted
  const episode = engine._episodes.get(session.id)
  assert.equal(episode.phase, 'running')
  assert.equal(agent.maintenanceCalls.length, 0, 'no maintenance before idle')
  assert.equal(agent.followups.length, 0)

  // Turn ends while the summarizer is still running: the idle boundary is the
  // only commit lane left.
  ctx.emitStatus(agent, 'idle')
  ctx.llm.state.hangGate.release()
  await episode.attempt
  await new Promise(r => setImmediate(r))      // let the maintenance microtask run
  assert.equal(agent.maintenanceCalls.length, 1, 'exactly one runMaintenance commit')
  await agent.maintenanceCalls[0].promise

  const ends = session.eventsOf('compaction/end')
  assert.equal(ends.length, 1)
  assert.equal(ends[0].data.error, undefined)
  assert.equal(agent.followups.length, 0, 'idle commit must not wake the session')

  // A later pre-step must NOT re-commit or double-append the bracket.
  await ctx.emitPreStep(agent)
  assert.equal(session.eventsOf('compaction/start').length, 1)
  assert.equal(session.eventsOf('compaction/end').length, 1)
})

test('T09 four sync lanes preempt an in-flight episode; circuit untouched (T09)', async () => {
  const ledgerPath = () => join(DATA_DIR, 'plugins/nano-model-selector/async-history')
  const readLedger = (id) => readFileSync(join(ledgerPath(), `${id}.jsonl`), 'utf8')
    .trim().split('\n').map(l => JSON.parse(l))

  // Lane 1: manual compactNow
  {
    writePolicy()
    const ctx = makeCtx()
    const engine = makeEngine(ctx)
    const { session } = makeBLineSession('s-p3-manual')
    const agent = makeAgent(session)
    ctx.llm.state.resetGate()
    await ctx.emitPreStep(agent)
    await ctx.llm.state.streamStarted
    const episode = engine._episodes.get(session.id)
    assert.equal(episode.phase, 'running')
    const attemptRef = episode.attempt

    ctx.llm.state.hangGate.release()
    const m = engine.compactNow(agent, new AbortController().signal)
    assert.equal(agent.maintenanceCalls.length, 1)
    await attemptRef.catch(() => {})
    await m
    const drops = readLedger(session.id).filter(r => r.kind === 'drop')
    assert.equal(drops.at(-1).reason, 'preempted')
    assert.equal(drops.at(-1).bracketed, false)
    assert.equal(episode.circuit.transientFailures, 0)
    // The manual lane committed its OWN bracket — one clean pair, different id.
    const starts = session.eventsOf('compaction/start')
    const ends = session.eventsOf('compaction/end')
    assert.equal(starts.length, 1)
    assert.equal(ends.length, 1)
    assert.equal(ends[0].data.error, undefined)
  }

  // Lane 2: synchronous FULL (fill pushed over S mid-flight)
  {
    writePolicy()
    const ctx = makeCtx()
    const engine = makeEngine(ctx)
    const { session } = makeBLineSession('s-p3-full')
    const agent = makeAgent(session)
    session.append('turn/start', { turn: 't-1' })
    ctx.llm.state.resetGate()
    await ctx.emitPreStep(agent)
    await ctx.llm.state.streamStarted
    const episode = engine._episodes.get(session.id)
    const attemptRef = episode.attempt
    // push fill over S: 150 + 8×100 = 0.95
    session.addMessage('user', 'extra1', 10000)
    session.addMessage('user', 'extra2', 10000)
    ctx.llm.state.hangGate.release()
    await ctx.emitPreStep(agent)
    await attemptRef.catch(() => {})
    const drops = readLedger(session.id).filter(r => r.kind === 'drop')
    assert.equal(drops.at(-1).reason, 'preempted')
    assert.equal(episode.circuit.transientFailures, 0)
    assert.equal(session.eventsOf('compaction/end').length, 1)
    assert.equal(session.eventsOf('compaction/end')[0].data.error, undefined)
  }

  // Lane 3: model-switch veto lane (agent/request with a different model)
  {
    writePolicy()
    const ctx = makeCtx()
    const engine = makeEngine(ctx)
    const { session } = makeBLineSession('s-p3-switch')
    const agent = makeAgent(session)
    session.append('turn/start', { turn: 't-1' })
    ctx.llm.state.resetGate()
    await ctx.emitPreStep(agent)
    await ctx.llm.state.streamStarted
    const episode = engine._episodes.get(session.id)
    const attemptRef = episode.attempt
    ctx.llm.state.hangGate.release()
    // switch to a different model → requireBelowThreshold lane preempts
    const cfg = { provider: 'prov', model: 'other-model' }
    await ctx.emitRequest(agent, cfg)
    await attemptRef.catch(() => {})
    const drops = readLedger(session.id).filter(r => r.kind === 'drop')
    assert.equal(drops.at(-1).reason, 'preempted')
    assert.equal(episode.circuit.transientFailures, 0)
  }

  // Lane 4: overflow recovery lane (request-error CONTEXT_WINDOW_EXCEEDED)
  {
    writePolicy()
    const ctx = makeCtx()
    const engine = makeEngine(ctx)
    const { session } = makeBLineSession('s-p3-overflow')
    const agent = makeAgent(session)
    session.append('turn/start', { turn: 't-1' })
    ctx.llm.state.resetGate()
    await ctx.emitPreStep(agent)
    await ctx.llm.state.streamStarted
    const episode = engine._episodes.get(session.id)
    const attemptRef = episode.attempt
    ctx.llm.state.hangGate.release()
    const err = new Error('context window exceeded')
    err.code = 'CONTEXT_WINDOW_EXCEEDED'
    const results = []
    for (const h of ctx.listeners['agent/request-error']) {
      results.push(await h({ agent, failure: err, signal: new AbortController().signal }, () => Promise.resolve({ kind: 'next' })))
    }
    await attemptRef.catch(() => {})
    const drops = readLedger(session.id).filter(r => r.kind === 'drop')
    assert.equal(drops.at(-1).reason, 'preempted')
    assert.equal(episode.circuit.transientFailures, 0)
  }
})

test('T09b gate skips arming while a lane is active (lane-active skip)', async () => {
  writePolicy()
  const ctx = makeCtx()
  const engine = makeEngine(ctx)
  const { session } = makeBLineSession('s-p3-lane')
  const agent = makeAgent(session)
  ctx.llm.state.resetGate()
  await ctx.emitPreStep(agent)
  await ctx.llm.state.streamStarted
  const episode = engine._episodes.get(session.id)
  assert.equal(episode.phase, 'running')
  // Second boundary while the attempt is in-flight: no second arm, one skip.
  const before = session.eventsOf('compaction/start').length
  await ctx.emitPreStep(agent)
  assert.equal(session.eventsOf('compaction/start').length, before)
  const ledger = readFileSync(
    join(DATA_DIR, 'plugins/nano-model-selector/async-history', `${session.id}.jsonl`), 'utf8',
  ).trim().split('\n').map(l => JSON.parse(l))
  assert.ok(ledger.some(r => r.kind === 'skip' && r.reason === 'lane-active'),
    `expected a lane-active skip; got ${JSON.stringify(ledger.map(r => r.kind + ':' + (r.reason ?? '')))}`)
  ctx.llm.state.hangGate.release()
  await episode.attempt.catch(() => {})
})

test('T10 timeout settles without circuit; late result cannot commit; episode GC\'d', async (t) => {
  writePolicy()
  const ctx = makeCtx()
  const engine = makeEngine(ctx)
  const { session } = makeBLineSession('s-p3-timeout')
  const agent = makeAgent(session)

  t.mock.timers.enable({ apis: ['setTimeout'], now: 0 })
  try {
    ctx.llm.state.resetGate()          // summarize hangs; abort will reject it
    await ctx.emitPreStep(agent)
    await ctx.llm.state.streamStarted
    const episode = engine._episodes.get(session.id)
    const attemptRef = episode.attempt
    assert.equal(episode.phase, 'running')

    t.mock.timers.tick(120_001)        // past EPISODE_TIMEOUT_MS
    assert.equal(episode.phase, 'none', 'timeout settles the episode immediately')
    // 'timeout' is a settlement, not a transient failure: circuit untouched.
    assert.equal(episode.circuit.transientFailures, 0)
    assert.equal(episode.circuit.open, false)
    // Nothing durable: deferred bracket never opened.
    assert.equal(session.eventsOf('compaction/start').length, 0)
    assert.equal(session.eventsOf('compaction/end').length, 0)
    // Ledger: one drop{timeout, bracketed:false}.
    const ledger = readFileSync(
      join(DATA_DIR, 'plugins/nano-model-selector/async-history', `${session.id}.jsonl`), 'utf8',
    ).trim().split('\n').map(l => JSON.parse(l))
    assert.ok(ledger.some(r => r.kind === 'drop' && r.reason === 'timeout' && r.bracketed === false))
    // GC: circuit closed and phase none → the map slot is freed (-05③/d).
    assert.equal(engine._episodes.has(session.id), false)

    // The late resolve arrives AFTER settle (the fake summarize ignores the
    // abort and finishes once the gate opens): it must NOT commit, must NOT
    // record a second drop, and the GC'd slot must stay gone.
    ctx.llm.state.hangGate.release()
    await attemptRef.catch(() => {})
    await new Promise(r => setImmediate(r))
    const ledger2 = readFileSync(
      join(DATA_DIR, 'plugins/nano-model-selector/async-history', `${session.id}.jsonl`), 'utf8',
    ).trim().split('\n').map(l => JSON.parse(l))
    assert.equal(ledger2.filter(r => r.kind === 'drop').length, 1)
    assert.equal(ledger2.filter(r => r.kind === 'commit').length, 0)
    assert.equal(session.eventsOf('compaction/start').length, 0)
    assert.equal(session.eventsOf('compaction/end').length, 0)
    assert.equal(engine._episodes.has(session.id), false)
  } finally {
    t.mock.timers.reset()
  }
})

test('T10b same-turn no-range debounce + no-window skip + MAX_CLAIM_ATTEMPTS gone', async () => {
  // no-range debounce: a non-transient drop suppresses every further arm for
  // the rest of the turn (one ledger record), and clears at the next turn.
  writePolicy()
  const ctx = makeCtx()
  const engine = makeEngine(ctx)
  const { session } = makeBLineSession('s-p3-norange')
  const agent = makeAgent(session)
  session.append('turn/start', { turn: 't-1' })
  // Drive the summarize phase directly with an unreachable retain so the
  // selector deterministically returns no-range while the turn is still open.
  const episode = engine._episode(session)
  episode.phase = 'running'
  episode.retainTokens = 1e9
  episode.attempt = Promise.resolve()
  await engine._summarizeEpisode(agent, episode, new AbortController().signal)
  assert.equal(episode.phase, 'none')
  // The ledger saw the drop AND recorded the blocking turn.
  const ledgerPath = join(DATA_DIR, 'plugins/nano-model-selector/async-history', `${session.id}.jsonl`)
  const ledger = () => readFileSync(ledgerPath, 'utf8').trim().split('\n').map(l => JSON.parse(l))
  assert.ok(ledger().some(r => r.kind === 'drop' && r.reason === 'no-range'))

  // Same turn: further B-line boundaries stay suppressed — no new arm, and
  // only ONE skip record for the whole turn.
  await ctx.emitPreStep(agent)
  assert.equal(engine._episode(session).phase, 'none', 'same-turn debounce: no re-arm')
  await ctx.emitPreStep(agent)
  const skips = ledger().filter(r => r.kind === 'skip')
  assert.equal(skips.filter(r => r.reason === 'turn-blocked').length, 1)
  assert.equal(skips.length, 1, 'later boundaries in the same turn pass silently')

  // The NEXT turn clears the debounce: arming resumes.
  session.append('turn/end', { turn: 't-1' })
  session.append('turn/start', { turn: 't-2' })
  await ctx.emitPreStep(agent)
  const ep2 = engine._episode(session)
  assert.equal(ep2.phase, 'running', 'a new turn may arm again')
  await ep2.attempt.catch(() => {})

  // no-window: model reports no context budget → recorded skip, no throw.
  const ctx2 = makeCtx()
  ctx2.llm.resolveModelInfo = async () => ({})
  const engine2 = makeEngine(ctx2)
  const { session: s2 } = makeBLineSession('s-p3-nowin')
  const a2 = makeAgent(s2)
  await ctx2.emitPreStep(a2)
  const ledger2 = readFileSync(
    join(DATA_DIR, 'plugins/nano-model-selector/async-history', `${s2.id}.jsonl`), 'utf8',
  ).trim().split('\n').map(l => JSON.parse(l))
  assert.ok(ledger2.some(r => r.kind === 'skip' && r.reason === 'no-window'))
  assert.equal(engine2._episodes.get(s2.id)?.phase ?? 'none', 'none')

  // P3-03/e: the retired retry constants must not exist anywhere in the lib.
  const src = readFileSync(new URL('../lib/host-compaction.js', import.meta.url), 'utf8')
  assert.equal(src.includes('MAX_CLAIM_ATTEMPTS'), false)
  assert.equal(src.includes('claimAttempts'), false)
})

test('T11 disarm is a settlement in all three cases: raised B, bigger W, prune (T11)', async () => {
  const readDrops = (id) => readFileSync(
    join(DATA_DIR, 'plugins/nano-model-selector/async-history', `${id}.jsonl`), 'utf8',
  ).trim().split('\n').map(l => JSON.parse(l)).filter(r => r.kind === 'drop')

  // Case 1: owner raises B above current fill mid-flight → disarmed.
  {
    writePolicy()
    const ctx = makeCtx()
    const engine = makeEngine(ctx)
    const { session } = makeBLineSession('s-p3-d1')
    const agent = makeAgent(session)
    ctx.llm.state.resetGate()
    await ctx.emitPreStep(agent)
    await ctx.llm.state.streamStarted
    const episode = engine._episodes.get(session.id)
    assert.equal(episode.phase, 'running')
    const attemptRef = episode.attempt
    writePolicy({ bufferSizeAsync: 0.80 })   // fill 0.75 < new B
    ctx.llm.state.hangGate.release()
    await ctx.emitPreStep(agent)
    await attemptRef.catch(() => {})
    const drops = readDrops(session.id)
    assert.equal(drops.at(-1).reason, 'disarmed')
    assert.equal(drops.at(-1).bracketed, false)
    assert.equal(episode.circuit.transientFailures, 0)
    assert.equal(session.eventsOf('compaction/start').length, 0)
  }

  // Case 2: a bigger context window drops fill below B mid-flight → disarmed.
  {
    writePolicy()
    const ctx = makeCtx()
    const engine = makeEngine(ctx)
    const { session } = makeBLineSession('s-p3-d2')
    const agent = makeAgent(session)
    ctx.llm.state.resetGate()
    await ctx.emitPreStep(agent)
    await ctx.llm.state.streamStarted
    const episode = engine._episodes.get(session.id)
    const attemptRef = episode.attempt
    ctx.llm.state.W = 500_000                // 75000/500000 = 0.15 < B 0.65
    ctx.llm.state.hangGate.release()
    await ctx.emitPreStep(agent)
    await attemptRef.catch(() => {})
    const drops = readDrops(session.id)
    assert.equal(drops.at(-1).reason, 'disarmed')
    assert.equal(drops.at(-1).bracketed, false)
    assert.equal(episode.circuit.transientFailures, 0)
  }

  // Case 3: the free prune pass pulls fill below B → next boundary disarms.
  {
    writePolicy()
    const ctx = makeCtx()
    const engine = makeEngine(ctx)
    const { session } = makeBLineSession('s-p3-d3')
    const agent = makeAgent(session)
    ctx.llm.state.resetGate()
    await ctx.emitPreStep(agent)
    await ctx.llm.state.streamStarted
    const episode = engine._episodes.get(session.id)
    // Next boundary: the pruner empties the surface's non-system weights,
    // dropping measured fill below B; the premise check disarms.
    const origPrune = ctx.pruner.pruneSession.bind(ctx.pruner)
    ctx.pruner.pruneSession = (s) => {
      origPrune(s)
      for (const seq of s.surface.nodes) s.weights.set(seq, 1)
    }
    const attemptRef = episode.attempt
    ctx.llm.state.hangGate.release()
    await ctx.emitPreStep(agent)
    await attemptRef.catch(() => {})
    const drops = readDrops(session.id)
    assert.equal(drops.at(-1).reason, 'disarmed')
    assert.equal(drops.at(-1).bracketed, false)
    assert.equal(episode.circuit.transientFailures, 0)
    assert.equal(session.eventsOf('compaction/start').length, 0)
  }
})

/* ============ 12. ACE-1117 P4: selector, prompt/frame, select ledger ===== */

const {
  selectCompactableRange,
  CHECKPOINT_RESERVE,
  currentTurnOpeningRequest,
  COMPACTION_INSTRUCTION,
} = await import('../lib/compact-region.js')

/** Session with a two-turn two-step journal over a 7-node surface (sys+6). */
function makeLevelSession(id) {
  const session = makeSession(id)
  session.setHeader('prov', 'mod')
  const sys = session.addMessage('system', 'sys', 15000)
  session.append('turn/start', { turn: 't-1' })
  const u1 = session.addMessage('user', 'turn-one opening request text', 10000)
  session.append('step/start', { turn: 't-1', step: 1 })
  const m1 = session.addMessage('assistant', 'a1', 10000)
  session.append('step/start', { turn: 't-1', step: 2 })
  const m2 = session.addMessage('assistant', 'a2', 10000)
  session.append('turn/end', { turn: 't-1' })
  session.append('turn/start', { turn: 't-2' })
  const u2 = session.addMessage('user', 'turn-two opening request text', 6000)
  const m3 = session.addMessage('assistant', 'a3', 5000)
  const m4 = session.addMessage('assistant', 'a4', 5000)
  return { session, sys, u1, m1, m2, u2, m3, m4 }
}

test('T12 unified selector: turn > step > node level order, distance and tie rules', async () => {
  {
    // Turn cut (before u2) retains 16000; step cut (before m2) retains 26000 —
    // both in bounds, step is CLOSER to target 22000. Level wins anyway.
    const { session, u1, u2, m2 } = makeLevelSession('s-sel-turn')
    const r = selectCompactableRange(session, sessionMeter(session),
      { targetTokens: 22000, line: 0.5, window: W })
    assert.equal(r.boundary, 'turn')
    assert.equal(r.retainedTokens, 16000)
    assert.equal(r.end, m2.seq)            // shadowed span ends just before u2
    assert.ok(r.end < u2.seq)
    assert.equal(r.start, u1.seq)
  }
  {
    // Step picked when the step cut is the only LEVEL candidate in bounds:
    // cap retained below the step cut's 20000 but ≥ 10000 → node only.
    const session = makeSession('s-sel-step2')
    session.setHeader('prov', 'mod')
    session.addMessage('system', 'sys', 15000)
    session.append('turn/start', { turn: 't-1' })
    const a = session.addMessage('user', 'a', 10000)
    session.append('step/start', { turn: 't-1', step: 2 })
    const b = session.addMessage('assistant', 'b', 10000)
    const c = session.addMessage('assistant', 'c', 10000)
    // cuts: before b (step, retain 20000), before c (node, 10000). The first
    // turn's opening node is the shadow head — no turn cut exists for it.
    const r = selectCompactableRange(session, sessionMeter(session),
      { targetTokens: 20000, line: 0.5, window: W })
    assert.equal(r.boundary, 'step')
    assert.equal(r.retainedTokens, 20000)
    const r2 = selectCompactableRange(session, sessionMeter(session),
      { targetTokens: 10000, line: 0.35, window: W }) // cap 11808
    assert.equal(r2.boundary, 'node')
    assert.equal(r2.retainedTokens, 10000)
    void a; void b; void c
  }
  {
    // Same distance: the larger retained wins.
    const session = makeSession('s-sel-tie')
    session.setHeader('prov', 'mod')
    session.addMessage('system', 'sys', 15000)
    const msgs = []
    for (let i = 0; i < 6; i += 1) msgs.push(session.addMessage('user', `m${i}`, 10000))
    const r = selectCompactableRange(session, sessionMeter(session),
      { targetTokens: 15000, line: 0.5, window: W })
    // cap 26808 leaves 10000 & 20000; both sit 5000 from target 15000.
    assert.equal(r.boundary, 'node')
    assert.equal(r.retainedTokens, 20000, 'equal distance keeps the larger retained tail')
  }
  {
    // A single node over the cap yields null — never a half-kept node.
    const session = makeSession('s-sel-null')
    session.setHeader('prov', 'mod')
    session.addMessage('system', 'sys', 15000)
    session.addMessage('user', 'big', 80000)
    session.addMessage('user', 'big2', 80000)
    const r = selectCompactableRange(session, sessionMeter(session),
      { targetTokens: 0, line: 0.9, window: W }) // max = 90000-15000-8192=66808 < min 80000
    assert.equal(r, null)
    // window too small for the reserve at all → also null, not a clamped cap.
    const r2 = selectCompactableRange(session, sessionMeter(session),
      { targetTokens: 0, line: 0.1, window: W })
    assert.equal(r2, null)
  }
  {
    // The spec's constant and the old tail-accumulate loop are both locked.
    assert.equal(CHECKPOINT_RESERVE, 8192)
    const src = readFileSync(new URL('../lib/compact-region.js', import.meta.url), 'utf8')
    const selector = src.slice(src.indexOf('export function selectCompactableRange'))
    assert.equal(selector.includes('accumulated >='), false)
  }
})

function sessionMeter(session) {
  return makeMeter().measure(session)
}

test('T13 prompt + frame: 8 sections intact, :222 gone, step echo in instruction not frame', async () => {
  // Eight sections still first, in order, ahead of extras and verbatim echo.
  const sections = [
    '## Primary Request and Intent', '## Key Technical Concepts', '## Files and Code',
    '## Errors and Fixes', '## Pending Jobs', '## Current Work', '## Next Step',
    '## Critical Context',
  ]
  let idx = 0
  for (const h of sections) {
    const at = COMPACTION_INSTRUCTION.indexOf(h)
    assert.ok(at > idx, `${h} missing or out of order`)
    idx = at
  }
  assert.equal(COMPACTION_INSTRUCTION.includes('Do NOT mention'), false,
    ':222 self-reference ban must be gone')
  assert.match(COMPACTION_INSTRUCTION, /PRIOR checkpoint/)

  const { instructionText } = await import('../lib/compact-region.js')
  const text = instructionText({ override: 'EXTRA', verbatimRequest: 'opening ask verbatim' })
  assert.ok(text.indexOf('opening ask verbatim') < text.indexOf('EXTRA'),
    'verbatim echo sits between built-in and extras')

  // Step-level cut: the opening request rides inside the instruction sent to
  // the summarizer (never inside the frame / a second model message).
  writePolicy()
  const ctx = makeCtx()
  makeEngine(ctx)
  const session = makeSession('s-frame')
  session.setHeader('prov', 'mod')
  session.addMessage('system', 'sys', 15000)
  session.append('turn/start', { turn: 't-1' })
  session.addMessage('user', 'UNIQUE_OPENING_REQUEST_ABC', 10000)
  for (let i = 0; i < 4; i += 1) session.addMessage('assistant', `work ${i}`, 10000)
  session.append('step/start', { turn: 't-1', step: 2 })
  session.addMessage('assistant', 'late work', 10000)
  session.addMessage('assistant', 'later work', 10000)
  const agent = makeAgent(session)

  const instructionSent = []
  const origStream = ctx.llm.stream.bind(ctx.llm)
  ctx.llm.stream = async function* (opts) {
    const instr = opts.messages.at(-1)?.content?.[0]?.text ?? ''
    instructionSent.push(instr)
    yield* origStream(opts)
  }

  await ctx.emitPreStep(agent)
  await ctx.settle(agent)

  const episode = engine_episode(ctx, session)
  void episode
  const ckpt = session.events.find(e => e.type === 'user/message' && e.surfaceOp)
  assert.ok(ckpt !== undefined)
  const frameText = ckpt.data.content[0].text
  // Frame: closed field set — tool name + id present, no ISO timestamp,
  // no model name, no prompt version.
  assert.match(frameText, /inspect_checkpoint/)
  assert.match(frameText, /compactionId: /)
  assert.equal(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(frameText), false)
  assert.equal(frameText.includes('prov/mod'), false)
  assert.equal(frameText.includes('promptVersion'), false)
  assert.equal(frameText.includes('UNIQUE_OPENING_REQUEST_ABC'), false,
    'the opening request is never inside the frame')
  // boundary level renders 'message' for node / 'step' for step; this cut is
  // whichever the selector picked — the frame name is always a level word.
  assert.match(frameText, /retained tail starts at: (turn|step|message) level/)

  // If the selector chose a step cut, the instruction carried the verbatim
  // opening request; the frame did not.
  const boundary = ledgerBoundaryOf(session.id)
  if (boundary === 'step' && instructionSent.length > 0) {
    assert.ok(instructionSent.some(t => t.includes('UNIQUE_OPENING_REQUEST_ABC')),
      'step-level instruction must echo the opening request verbatim')
  }
  assert.equal(currentTurnOpeningRequest(session), 'UNIQUE_OPENING_REQUEST_ABC')
})

function engine_episode(ctx, session) { return ctx.engine._episodes.get(session.id) }
function ledgerBoundaryOf(sessionId) {
  const p = join(DATA_DIR, 'plugins/nano-model-selector/async-history', `${sessionId}.jsonl`)
  if (!existsSync(p)) return null
  return readFileSync(p, 'utf8').trim().split('\n').map(l => JSON.parse(l))
    .find(r => r.kind === 'select')?.boundary ?? null
}

test('T14 four lanes each write one select record; ledger failure never blocks commit', async () => {
  // async lane
  {
    writePolicy()
    const ctx = makeCtx()
    makeEngine(ctx)
    const { session } = makeBLineSession('s-lane-async')
    const agent = makeAgent(session)
    await ctx.emitPreStep(agent)
    await ctx.settle(agent)
    const selects = ledgerOf(session.id).filter(r => r.kind === 'select')
    assert.equal(selects.length, 1)
    assert.equal(selects[0].lane, 'async')
    assert.ok(['turn', 'step', 'node'].includes(selects[0].boundary))
    assert.equal(typeof selects[0].retainedTokens, 'number')
    assert.equal(selects[0].targetTokens, 100)
    assert.equal(Object.keys(selects[0]).includes('message'), false,
      'ledger boundary vocabulary never says message')
  }
  // full lane (S line)
  {
    writePolicy()
    const ctx = makeCtx()
    makeEngine(ctx)
    const { session } = makeSLineSession('s-lane-full')
    session.append('turn/start', { turn: 't-1' })
    const agent = makeAgent(session)
    await ctx.emitPreStep(agent)
    const selects = ledgerOf(session.id).filter(r => r.kind === 'select')
    assert.ok(selects.length >= 1)
    assert.equal(selects[0].lane, 'full')
  }
  // manual lane
  {
    writePolicy()
    const ctx = makeCtx()
    const engine = makeEngine(ctx)
    const { session } = makeBLineSession('s-lane-manual')
    const agent = makeAgent(session)
    await engine.compactNow(agent, new AbortController().signal)
    const selects = ledgerOf(session.id).filter(r => r.kind === 'select')
    assert.equal(selects.length, 1)
    assert.equal(selects[0].lane, 'manual')
  }
  // overflow lane (via the request-error listener)
  {
    writePolicy()
    const ctx = makeCtx()
    const engine = makeEngine(ctx)
    const { session } = makeBLineSession('s-lane-overflow')
    session.append('turn/start', { turn: 't-1' })
    const agent = makeAgent(session)
    const err = new Error('context window exceeded')
    err.code = 'CONTEXT_WINDOW_EXCEEDED'
    for (const h of ctx.listeners['agent/request-error']) {
      await h({ agent, failure: err, signal: new AbortController().signal }, () => Promise.resolve({ kind: 'next' }))
    }
    const selects = ledgerOf(session.id).filter(r => r.kind === 'select')
    assert.equal(selects.length, 1)
    assert.equal(selects[0].lane, 'overflow')
  }
  // Ledger writes swallowed: make the history dir unwritable by pre-creating
  // it as a FILE, then a whole episode still commits.
  {
    writePolicy()
    const ctx = makeCtx()
    makeEngine(ctx)
    const { session } = makeBLineSession('s-ledger-dead')
    const agent = makeAgent(session)
    const dir = join(DATA_DIR, 'plugins/nano-model-selector/async-history')
    const backup = `${dir}.bak`
    if (existsSync(dir)) fsRenameSync(dir, backup)
    writeFileSync(dir, 'not a dir')
    try {
      await ctx.emitPreStep(agent)
      await ctx.settle(agent)
      assert.equal(session.eventsOf('compaction/end').length, 1, 'commit must survive a dead ledger')
    } finally {
      rmSync(dir, { force: true })
      if (existsSync(backup)) fsRenameSync(backup, dir)
    }
  }
})
