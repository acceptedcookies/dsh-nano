/**
 * NanoCompactionEngine — the DNMS01 async-compaction takeover Provider.
 * A `CompactionEngine` subclass per T-O-DNMS01-16: all three methods are
 * reimplemented over the vendored seam primitives + the protocol-faithful
 * `compact-region.js`; nothing imports `compaction-basic` internals.
 *
 * Behavior contract:
 *  - -18  true async across turns: pre-step qualifies the B line and ARMS an
 *    ephemeral episode; the physical summarizer runs inside runMaintenance at
 *    the next idle boundary; the next turn's first request assembly adopts
 *    (commits the durable replace). One episode at a time per session — the
 *    durable compaction/start lock enforces one-active process-wide.
 *  - -13  FULL trigger closed set: trusted safety (fill >= S) / DC-1 structural
 *    unreachability (fullOnly policy) / post-adoption over-health on a later B
 *    crossing / owner-manual /compact. failure/degraded/unknown never create a
 *    FULL intent.
 *  - -15  fill = tokenMeter.measure(session).totalTokens / W is the only
 *    formula; W = resolveModelInfo(...).context.contextWindow.
 *  - -18⑤ read failure -> safetyOnly: only the S line at 0.90, no B arming.
 *  - -18② one typed-transient circuit: two consecutive transient failures
 *    suppress auto arming; S-line and manual remain live; adoption/manual
 *    success resets it.
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  CompactionEngine,
  ManualCompactionError,
  upgradeManualCompactionError,
} from './compaction-seam.js'

// Upgrade ManualCompactionError to the upstream class when the harness exposes
// @deepseek-ai/dsh-compaction, so compactNow()'s coded errors satisfy the
// /compact gate's instanceof check (-16 verbatim protocol). Falls back to the
// vendored impl otherwise — same shape, just a different class identity.
import('@deepseek-ai/dsh-compaction')
  .then(m => upgradeManualCompactionError(m.ManualCompactionError))
  .catch(() => {})
import {
  assertNoActiveCompaction,
  compactSurfaceRegion,
  createUserMessage,
  inspectCompactionEntryState,
  prepareCompactionTransaction,
  instructionVersion,
  selectCompactableRange,
  summarizeWithLlm,
  SurfaceChangedError,
} from './compact-region.js'
import { readState, SAFETY_RATIO, validateMasterOrder } from './compact-policy.js'
import { recordAsyncDecision } from './async-history.js'

const CONTEXT_WINDOW_EXCEEDED_CODE = 'CONTEXT_WINDOW_EXCEEDED'

/** Self-held budgets previously owned by the factory row's Config (-13). */
const COMPACTION_RETRIES = 1
const OVERFLOW_RETRIES = 1

/** Transient failure codes that feed the ephemeral circuit. */
const TRANSIENT_CODES = new Set([
  'RATE_LIMIT', 'NETWORK', 'TIMEOUT', 'SERVICE_UNAVAILABLE', 'OVERLOADED', 'ABORTED',
])

/** Episode attempt budget: a hung summarizer must not pin the arm (-18). */
const EPISODE_TIMEOUT_MS = 120_000
/** Idle-claim retries before the arm is dropped as starved (-18). */
const MAX_CLAIM_ATTEMPTS = 3

const ASYNC_COMPACT_PATH = join(
  process.env.DSH_DATA_DIR ?? process.env.DSH_HOME ?? join(homedir(), '.dsh'),
  'plugins', 'nano-model-selector', 'async-compact.json',
)

/** Resolve the exact provider/model durably routed for the latest request. */
function routedTarget(session) {
  const config = session.requestHeader()?.config
  if (config === undefined || config.provider.length === 0 || config.model.length === 0) {
    return undefined
  }
  return { provider: config.provider, model: config.model }
}

export default class NanoCompactionEngine extends CompactionEngine {
  // `agents` deliberately omitted: the id:compaction isolate only declares
  // compaction+toolResultPruner, so a static inject of 'agents' throws inside
  // preset-standard/ptc/cordis and kills preset composition ("tool-office:
  // never started" in the GUI). ctx.get('agents') resolves lazily at the
  // agent/status listener instead.
  static inject = ['llm', 'tokenMeter', 'sessions']

  constructor(ctx) {
    super(ctx)
    /** @type {Map<string, EpisodeState>} per-session ephemeral async state (-18① ephemeral) */
    this._episodes = new Map()
    this._overflowRetries = new WeakMap()
    this._overflowAgents = new WeakMap()
    this._registerListeners()
  }

  /** Load the sole writable authority. fail-closed -> safetyOnly (-18⑤). */
  _policy() {
    const state = readState(ASYNC_COMPACT_PATH)
    if (!state.ok) return { policy: null, safetyOnly: true, reason: state.reason }
    return { policy: state.policy, safetyOnly: false }
  }

  _episode(session) {
    const key = session.id
    let episode = this._episodes.get(key)
    if (episode === undefined) {
      episode = {
        phase: 'none',
        tx: null,
        prepared: null,
        summarized: null,
        adoptedAsyncOverHealth: false,
        circuit: { transientFailures: 0, open: false, suppressedLogged: false },
      }
      this._episodes.set(key, episode)
    }
    return episode
  }

  _registerListeners() {
    const { ctx } = this

    const logResult = (result, trigger) => {
      ctx.logger.info(
        `nano compaction (${trigger}): shadowed ${result.shadowedSeqs.length} surface nodes `
        + `(seqs ${result.shadowedRange.start}-${result.shadowedRange.end}, `
        + `~${result.shadowedTokenCount} tokens)`,
      )
    }

    // B-line: qualify at the step boundary, arm the async episode, and run the
    // synchronous FULL closed set. Adoption of a ready episode happens here too
    // (before the step assembles, so the request sees the compacted surface).
    ctx.on('agent/pre-step', async ({ agent, signal }, next) => {
      ctx.logger.debug(`nano-async-pre-step ${agent.session.id}`)
      if (signal.aborted) return next()
      // Commit a summary that finished while the turn was running. Doing it
      // here (before the step assembles) means the request that follows already
      // sees the compacted surface — no wake message, no extra turn.
      const pending = this._episodes.get(agent.session.id)
      if (pending !== undefined && pending.phase === 'running' && pending.attemptReady === true) {
        try {
          await this._finishEpisode(agent, pending)
        } catch (error) {
          ctx.logger.warn(`async compaction commit at step boundary failed: ${messageOf(error)}`)
        }
      }
      try {
        const result = await this.compactIfNeeded(agent, 'pressure', signal)
        if (result !== null) {
          logResult(result, 'safety/full')
          // -18⑧: a synchronous FULL success also settles the async circuit —
          // the summarizer proved healthy regardless of which lane drove it.
          const episode = this._episodes.get(agent.session.id)
          if (episode !== undefined) {
            episode.circuit.transientFailures = 0
            episode.circuit.open = false
            episode.circuit.suppressedLogged = false
          }
        }
      } catch (error) {
        ctx.logger.warn(`step compaction failed: ${messageOf(error)}; continuing the turn`)
      }
      return next()
    })

    // At the next idle boundary after an arm, the episode's one physical
    // summarizer attempt runs inside runMaintenance (-18真 async).
    ctx.on('agent/status', ({ agent, status }) => {
      if (status === 'idle') this._overflowRetries.delete(agent)
      const episode = this._episodes.get(agent.session.id)
      if (status !== 'idle' || episode === undefined || episode.phase !== 'armed') return
      // Fallback for a turn that ended before the summary was ready: wait for
      // the in-flight attempt, then commit. This is the only path that still
      // needs the idle boundary, and it never starts a new turn.
      const settle = async () => {
        try {
          await episode.attempt
        } catch { /* already dropped inside the attempt */ }
        await this._finishEpisode(agent, episode)
      }
      void settle()
    })

    // Model switch mirrors the native prepend listener: force the history under
    // the B line before the proposed header commits (-16 verbatim protocol).
    ctx.on('agent/request', async ({ agent, signal }, next) => {
      const config = await next()
      const previous = agent.session.requestHeader()
      if (signal.aborted || previous === undefined || config.provider === '' || config.model === ''
        || (previous.config.provider === config.provider && previous.config.model === config.model)) return config
      try {
        const header = { ...previous, config }
        const result = await this._compactPressure(agent, header, signal, true)
        if (result !== null) logResult(result, 'model switch')
      } catch (error) {
        signal.throwIfAborted()
        const wrapped = new Error(
          `Cannot switch to ${config.provider}/${config.model}: context compaction failed: ${messageOf(error)}. `
          + 'The previous request model is preserved; retry or select a model with a larger context window.',
          { cause: error },
        )
        wrapped.name = 'LlmError'
        wrapped.code = 'MODEL_SWITCH_COMPACTION_FAILED'
        throw wrapped
      }
      return config
    }, { prepend: true })

    ctx.on('session/event', (session, event) => {
      if (event.type !== 'assistant/message') return
      const agent = this._overflowAgents.get(session)
      if (agent !== undefined) this._overflowRetries.delete(agent)
    })

    // ON-state overflow recovery is ours; OFF stays native (R-8).
    ctx.on('agent/request-error', async ({ agent, failure, signal }, next) => {
      if (failure.code !== CONTEXT_WINDOW_EXCEEDED_CODE || signal.aborted) return next()
      this._overflowAgents.set(agent.session, agent)
      const target = routedTarget(agent.session)
      if (target === undefined) return next()
      const retries = this._overflowRetries.get(agent) ?? 0
      if (retries >= OVERFLOW_RETRIES) return next()

      const generation = agent.session.surface.replaceGeneration
      let result = null
      try {
        result = await this.compactIfNeeded(agent, 'context-overflow', signal)
      } catch (recoveryError) {
        const message = messageOf(recoveryError)
        if (!signal.aborted && agent.session.surface.replaceGeneration > generation) {
          ctx.logger.warn(
            `context-overflow compaction failed after durable surface progress: ${message}; `
            + 'retrying from the replacement surface',
          )
          this._overflowRetries.set(agent, retries + 1)
          return { kind: 'retry' }
        }
        ctx.logger.warn(`context-overflow compaction failed: ${message}; ${signal.aborted
          ? 'cancellation prevents retry'
          : 'preserving the original request error'}`)
        return next()
      }
      if (signal.aborted || agent.session.surface.replaceGeneration <= generation) return next()
      if (result !== null) logResult(result, 'context overflow recovery')
      this._overflowRetries.set(agent, retries + 1)
      return { kind: 'retry' }
    })
  }

  /* ---------------- async episode lifecycle ---------------- */

  /** Arm an async episode and schedule its physical attempt at next idle. */
  _armEpisode(agent, policy, effectivePin) {
    const episode = this._episode(agent.session)
    if (episode.phase !== 'none') return false
    if (episode.circuit.open) {
      if (!episode.circuit.suppressedLogged) {
        episode.circuit.suppressedLogged = true
        this.ctx.logger.warn('async compaction circuit open after consecutive transient failures; auto arming suppressed (S-line and /compact unaffected)')
        recordAsyncDecision(agent.session.id, {
          kind: 'skip',
          reason: 'circuit-open',
          detail: 'consecutive transient failures; auto arming suppressed',
        })
      }
      return false
    }
    episode.phase = 'armed'
    episode.tx = null
    episode.prepared = null
    episode.summarized = null
    episode.retainTokens = effectivePin
    episode.armedAt = Date.now()
    episode.claimAttempts = 0
    episode.summarizationTarget = policy.model.provider.length > 0 && policy.model.model.length > 0
      ? { provider: policy.model.provider, model: policy.model.model }
      : undefined
    // The instruction in force at arm time; the ledger and the activity line
    // report it so a summary can be traced back to the contract that made it.
    episode.promptVersion = instructionVersion(policy.summaryPrompt)
    return true
  }

  /**
   * Start the summarizer WITHOUT blocking the turn (true async, -18 revised).
   *
   * The old flow claimed the episode at `agent/status: idle`, which meant the
   * physical summarization only began after the whole turn had finished — from
   * the main task's point of view that is serial, not asynchronous. Here the
   * attempt is kicked at the step boundary and runs alongside the turn; the
   * durable bracket is deferred to commit so nothing is left open if the turn
   * outlives the summary.
   */
  _beginEpisodeAttempt(agent, episode) {
    if (episode.phase !== 'armed') return
    // Flip BEFORE the async work: a second boundary during an in-flight
    // attempt must not start a concurrent episode.
    episode.phase = 'running'
    recordAsyncDecision(agent.session.id, {
      kind: 'claim',
      attempt: (episode.claimAttempts ?? 0) + 1,
      retain: episode.retainTokens,
      target: episode.summarizationTarget ?? null,
      promptVersion: episode.promptVersion ?? null,
    })
    const controller = new AbortController()
    episode.attemptAbort = controller
    // Bound the attempt: a hung summarizer must not pin the episode forever.
    const timer = setTimeout(() => controller.abort(new Error('async compaction attempt timed out')), EPISODE_TIMEOUT_MS)
    episode.attempt = (async () => {
      try {
        await this._summarizeEpisode(agent, episode, controller.signal)
      } catch (error) {
        // A disarm settles the episode first; recording a second drop here
        // would report one failure twice.
        if (episode.phase !== 'none') this._dropEpisode(agent.session, episode, this._classifyFailure(error), error)
      } finally {
        clearTimeout(timer)
      }
    })()
  }

  /**
   * Cancel an armed or in-flight episode because the policy no longer asks for
   * it (the owner raised B above the current fill).
   *
   * Without this, raising the water line could not stop a compaction already
   * under way: the gate only ever armed, never disarmed. The abort is
   * best-effort — the episode is settled here so the attempt's own catch sees
   * `phase === 'none'` and does not record a second, misleading drop.
   */
  _disarmEpisode(agent, episode, reason) {
    if (episode.phase === 'none') return false
    try {
      episode.attemptAbort?.abort(new Error(`async compaction disarmed: ${reason}`))
    } catch { /* already aborted */ }
    if (episode.tx?.opened === true) {
      try {
        episode.tx.fail(new Error(`disarmed: ${reason}`), 'disarmed')
      } catch { /* bracket already closed */ }
    }
    this._settleEpisode(episode)
    recordAsyncDecision(agent.session.id, {
      kind: 'drop',
      reason: 'disarmed',
      detail: reason,
      bracketed: false,
    })
    this.ctx.logger.info(`async compaction disarmed: ${reason}`)
    return true
  }

  /** Prepare + summarize only. Writes no durable event: the bracket is deferred. */
  async _summarizeEpisode(agent, episode, signal) {
    const session = agent.session
    const policy = this._policy()
    if (policy.safetyOnly) {
      this._dropEpisode(session, episode, 'degraded', new Error('policy state unreadable (safetyOnly)'))
      return
    }
    const measurement = this.ctx.tokenMeter.measure(session)
    const range = selectCompactableRange(session, measurement, episode.retainTokens)
    if (range === null) {
      this._dropEpisode(session, episode, 'no-range', new Error('no compactable range for async episode'))
      return
    }
    const tx = prepareCompactionTransaction(
      this._regionDependencies(episode.summarizationTarget, episode),
      session, range.start, range.end,
      { owner: null, stability: 'selected-span', deferStart: true },
      agent,
    )
    episode.tx = tx
    const prepared = tx.prepared()
    episode.summarized = await tx.summarize(prepared, signal)
    episode.attemptReady = true
  }

  /**
   * Commit a ready attempt. Called at the next step boundary (so the request
   * that follows already sees the compacted surface) or at idle when the turn
   * ended first. The durable bracket lives only for the duration of this call.
   */
  async _finishEpisode(agent, episode) {
    if (episode.phase !== 'running' || episode.attemptReady !== true) return false
    const session = agent.session
    try {
      const outcome = episode.tx.commit(episode.summarized, undefined)
      if (outcome.failure !== undefined) {
        // commit already closed the bracket with end{error} — detach the tx so
        // the drop path does not append a second end{error}.
        episode.tx = null
        throw outcome.failure.error
      }
      try {
        await this.ctx.sessions.flush(session)
      } catch (error) {
        this.ctx.logger.warn(`async compaction durability checkpoint failed: ${messageOf(error)}`)
      }
      episode._lastResult = outcome.result
      // Over-health adoption primes the -13 FULL closed set on the next B crossing.
      try {
        const policy = this._policy()
        const W = await this._window(agent, policy)
        if (!policy.safetyOnly && W !== null) {
          const measurement = this.ctx.tokenMeter.measure(session)
          episode.adoptedAsyncOverHealth = measurement.totalTokens / W >= policy.policy.healthTargetAsync
        }
      } catch {
        episode.adoptedAsyncOverHealth = false
      }
      episode.circuit.transientFailures = 0
      episode.circuit.open = false
      episode.circuit.suppressedLogged = false
      const result = episode._lastResult
      episode._lastResult = undefined
      // `shadowedRange` comes from the seam and names the first/last SURFACE
      // positions, which are not the min/max event seqs: after a replace the
      // surface head can hold a newer checkpoint, making that pair inverted.
      // The ledger reports the true event span instead, so an operator can
      // correlate a compaction with the journal without decoding the seam.
      const shadowedSeqs = result?.shadowedSeqs ?? []
      recordAsyncDecision(session.id, {
        kind: 'commit',
        compactionId: episode.tx.compactionId,
        promptVersion: episode.promptVersion ?? null,
        tokens: result?.shadowedTokenCount ?? null,
        records: shadowedSeqs.length === 0 ? null : shadowedSeqs.length,
        range: shadowedSeqs.length === 0
          ? null
          : { first: Math.min(...shadowedSeqs), last: Math.max(...shadowedSeqs) },
      })
      this._settleEpisode(episode)
      this._logResult(result, 'async maintenance')
      return true
    } catch (error) {
      this._dropEpisode(session, episode, this._classifyFailure(error), error)
      return false
    }
  }

  _settleEpisode(episode) {
    episode.phase = 'none'
    episode.tx = null
    episode.prepared = null
    episode.summarized = null
    episode.attemptReady = false
    episode.attempt = undefined
    episode.attemptAbort = undefined
  }

  _logResult(result, trigger) {
    if (result === null || result === undefined) return
    this.ctx.logger.info(
      `nano compaction (${trigger}): shadowed ${result.shadowedSeqs.length} surface nodes `
      + `(seqs ${result.shadowedRange.start}-${result.shadowedRange.end}, `
      + `~${result.shadowedTokenCount} tokens)`,
    )
  }

  _dropEpisode(session, episode, reason, error) {
    // Captured before the tx is cleared: the ledger must say whether this drop
    // left a durable bracket behind or vanished without a trace. A deferred tx
    // exists from prepare onward but writes nothing until commit, so `tx !==
    // null` would overstate it.
    const bracketed = episode.tx?.opened === true
    // Durable-lock hygiene: if the episode already opened its compaction/start
    // bracket (tx exists), close it with end{error} BEFORE clearing, or the
    // unmatched start blocks this session's compactions until the next
    // end-seed (-18② the bracket is the one-active gate).
    if (episode.tx !== null) {
      try {
        episode.tx.fail(error ?? new Error(`episode dropped: ${reason}`), reason === 'transient' ? 'summary' : reason)
      } catch (closeError) {
        this.ctx.logger.warn(`async compaction end{error} close failed: ${messageOf(closeError)}`)
      }
    }
    episode.phase = 'none'
    episode.tx = null
    episode.prepared = null
    episode.summarized = null
    if (reason === 'transient') {
      episode.circuit.transientFailures += 1
      if (episode.circuit.transientFailures >= 2) {
        episode.circuit.open = true
        this.ctx.logger.warn('async compaction circuit opened: consecutive typed transient failures')
      }
    } else {
      episode.circuit.transientFailures = 0
    }
    this.ctx.logger.warn(
      `async compaction episode dropped (${reason})${error === undefined ? '' : `: ${messageOf(error)}`}`,
    )
    // The ledger is the only trace for a drop that never opened a bracket.
    recordAsyncDecision(session.id, {
      kind: 'drop',
      reason,
      detail: error === undefined ? null : messageOf(error),
      code: error?.code ?? null,
      bracketed,
      circuitOpen: episode.circuit.open,
    })
  }

  _classifyFailure(error) {
    if (error instanceof SurfaceChangedError) return 'transient'
    const code = error?.code
    if (code === 'busy' || code === 'cancelled') return 'busy'
    if (TRANSIENT_CODES.has(code)) return 'transient'
    if (code === 'summary' || code === 'changed' || code === 'commit' || code === 'persistence') return 'failure'
    return 'unknown'
  }

  /* ---------------- three methods (-16) ---------------- */

  /**
   * 'pressure' = the synchronous gate: adoption check aside, it runs the FULL
   * closed set (S line, DC-1 full-only, post-adoption over-health) and arms the
   * async episode at the B line. 'context-overflow' = native-equivalent forced
   * reduction owned by our overflow retry budget.
   */
  async compactIfNeeded(agent, trigger, signal) {
    const header = agent.session.requestHeader()
    if (header === undefined || routedTarget(agent.session) === undefined) return null
    switch (trigger) {
      case 'pressure':
        return this._pressureGate(agent, header, signal)
      case 'context-overflow': {
        this.ctx.get('toolResultPruner')?.pruneSession(agent.session)
        const measurement = this.ctx.tokenMeter.measure(agent.session)
        const range = selectCompactableRange(agent.session, measurement, 0)
        if (range === null) return null
        return this.compactRegion(range.start, range.end, agent, signal)
      }
      default:
        throw new Error(`unknown compaction trigger: ${trigger}`)
    }
  }

  /** Synchronous FULL for the closed trigger set plus model-switch require-below. */
  async _compactPressure(agent, header, signal, requireBelowThreshold) {
    const target = header.config
    const { policy, safetyOnly } = this._policy()
    const meter = this.ctx.tokenMeter
    let measurement = meter.measure(agent.session, header)
    const prune = this.ctx.get('toolResultPruner')
    const info = await this.ctx.llm.resolveModelInfo(target.provider, target.model, signal)
    assertNoActiveCompaction(agent.session, 'automatic pressure compaction')
    if (info.context === undefined) {
      throw new Error(`async compaction: no context capacity for ${target.provider}/${target.model}`)
    }
    const W = info.context.contextWindow
    const threshold = safetyOnly ? SAFETY_RATIO : policy.bufferSizeAsync
    if (measurement.totalTokens / W < threshold) return null

    // Model-free pass first, then remeasure (-16 prune timing).
    if (prune !== undefined) {
      prune.pruneSession(agent.session)
      measurement = meter.measure(agent.session, header)
    }
    if (measurement.totalTokens / W < threshold) return null

    const retain = safetyOnly ? 0 : policy.pinnedFullTokens
    let result = null
    for (let attempt = 0; attempt <= COMPACTION_RETRIES; attempt += 1) {
      const range = selectCompactableRange(agent.session, measurement, retain)
      if (range === null) {
        if (result === null && !requireBelowThreshold) return null
        throw new Error(
          'no safe compaction range can reduce context below threshold '
          + `(${measurement.totalTokens} estimated tokens >= ${Math.floor(threshold * W)})`,
        )
      }
      result = await this.compactRegion(range.start, range.end, agent, signal)
      measurement = meter.measure(agent.session, header)
      if (measurement.totalTokens / W < threshold) return result
    }
    throw new Error(
      `compaction still above threshold after ${COMPACTION_RETRIES + 1} compaction attempts `
      + `(${measurement.totalTokens} estimated tokens >= ${Math.floor(threshold * W)})`,
    )
  }

  /** Pre-step gate implementing the -13 closed FULL set + -18 async arming. */
  async _pressureGate(agent, header, signal) {
    const { policy, safetyOnly } = this._policy()
    const target = header.config
    const meter = this.ctx.tokenMeter
    const info = await this.ctx.llm.resolveModelInfo(target.provider, target.model, signal)
    if (info.context === undefined) return null
    const W = info.context.contextWindow
    let measurement = meter.measure(agent.session, header)
    const fillRatio = measurement.totalTokens / W

    if (safetyOnly) {
      // -18⑤: read failure -> only the S line stays live.
      if (fillRatio >= SAFETY_RATIO) return this._compactPressure(agent, header, signal, false)
      return null
    }

    const order = validateMasterOrder(policy, W)
    const fullOnly = order.ok && order.fullOnly
    const episode = this._episode(agent.session)

    // A raised B must be able to stop work that is already under way: the gate
    // used to only ever arm, so lowering the line took effect immediately while
    // raising it could not cancel anything.
    if (episode.phase !== 'none' && fillRatio < policy.bufferSizeAsync) {
      this._disarmEpisode(agent, episode, `fill ${(fillRatio * 100).toFixed(1)}% fell below B ${(policy.bufferSizeAsync * 100).toFixed(1)}%`)
    }

    // FULL closed set (-13): trusted safety / DC-1 / post-adoption over-health.
    if (fillRatio >= SAFETY_RATIO
      || (fullOnly && fillRatio >= policy.bufferSizeAsync)
      || (episode.adoptedAsyncOverHealth && fillRatio >= policy.bufferSizeAsync)) {
      episode.adoptedAsyncOverHealth = false
      return this._compactPressure(agent, header, signal, false)
    }

    if (fillRatio >= policy.bufferSizeAsync && !fullOnly) {
      // B line: arm the ephemeral async episode; durable one-active gate.
      try {
        assertNoActiveCompaction(agent.session, 'async compaction arming')
      } catch {
        this.ctx.logger.info('async compaction arm suppressed: durable compaction lock already held')
        recordAsyncDecision(agent.session.id, {
          kind: 'skip',
          reason: 'lock-held',
          detail: 'durable compaction bracket already open',
          fill: fillRatio,
          window: W,
        })
        return null
      }
      // prune + remeasure before arming (trigger qualified already; the free
      // pass may still relieve pressure below B without an episode).
      const prune = this.ctx.get('toolResultPruner')
      if (prune !== undefined) {
        prune.pruneSession(agent.session)
        measurement = meter.measure(agent.session, header)
        if (measurement.totalTokens / W < policy.bufferSizeAsync) return null
      }
      const effectivePin = order.ok ? order.effectivePin : Math.min(policy.pinnedAsyncTokens, Math.floor(0.15 * W))
      if (this._armEpisode(agent, policy, effectivePin)) {
        recordAsyncDecision(agent.session.id, {
          kind: 'arm',
          fill: fillRatio,
          window: W,
          bufferSizeAsync: policy.bufferSizeAsync,
          retain: effectivePin,
          target: policy.model.provider.length > 0 ? { provider: policy.model.provider, model: policy.model.model } : null,
          promptVersion: instructionVersion(policy.summaryPrompt),
          orderOk: order.ok,
        })
        // Kick the summarizer now: it runs alongside the turn instead of after
        // it. The commit lands at the next step boundary.
        this._beginEpisodeAttempt(agent, this._episode(agent.session))
      }
    }
    return null
  }

  async compactRegion(start, end, agent, signal) {
    return compactSurfaceRegion(
      this._regionDependencies(),
      agent.session,
      start,
      end,
      agent,
      { owner: 'current-turn', stability: 'whole-surface' },
      signal,
    )
  }

  compactNow(agent, signal, sourceCommandId) {
    signal.throwIfAborted()
    try {
      return agent.runMaintenance(async (agentSignal) => {
        const operationSignal = AbortSignal.any([agentSignal, signal])
        try {
          operationSignal.throwIfAborted()
          const entryState = inspectCompactionEntryState(agent.session)
          if (entryState.unmatchedCompactionStart !== undefined) {
            throw new ManualCompactionError('busy', 'manual compaction: an async episode already holds the compaction lock')
          }
          const range = selectCompactableRange(
            agent.session,
            this.ctx.tokenMeter.measure(agent.session),
            0,
          )
          if (range === null) return null
          return await compactSurfaceRegion(
            this._regionDependencies(),
            agent.session,
            range.start,
            range.end,
            agent,
            {
              owner: null,
              stability: 'selected-span',
              ...(sourceCommandId === undefined ? {} : { sourceCommandId }),
              flush: async () => {
                await this.ctx.sessions.flush(agent.session)
              },
            },
            operationSignal,
          )
        } catch (error) {
          if (agentSignal.aborted && operationSignal.reason === agentSignal.reason) {
            throw new ManualCompactionError('cancelled', 'manual compaction was cancelled', { cause: error })
          }
          operationSignal.throwIfAborted()
          throw error
        }
      })
    } catch (error) {
      throw new ManualCompactionError(
        'busy',
        'manual compaction requires an idle agent with no waking queued work',
        { cause: error },
      )
    }
  }

  async _window(agent, policy) {
    const target = routedTarget(agent.session)
      ?? (agent.options.provider?.length && agent.options.model?.length
        ? { provider: agent.options.provider, model: agent.options.model }
        : undefined)
      ?? (policy.policy?.model?.provider.length ? policy.policy.model : undefined)
    if (target === undefined) return null
    try {
      const info = await this.ctx.llm.resolveModelInfo(target.provider, target.model)
      return info?.context?.contextWindow ?? null
    } catch {
      return null
    }
  }

  _regionDependencies(summarizationTarget, episode) {
    return {
      meter: this.ctx.tokenMeter,
      summarize: (input, agent, abort) => {
        const target = summarizationTarget ?? this._policyTarget(agent)
        const { policy, safetyOnly } = this._policy()
        const instruction = !safetyOnly && typeof policy?.summaryPrompt === 'string' && policy.summaryPrompt.trim().length > 0
          ? policy.summaryPrompt
          : undefined
        // The prompt is read HERE, so the version recorded for this episode
        // must be computed HERE too. Recording the arm-time version made the
        // ledger claim a contract that could differ from the one actually sent
        // if the policy changed between arming and summarising.
        if (episode !== undefined) episode.promptVersion = instructionVersion(instruction)
        const configured = instruction === undefined ? target : { ...(target ?? {}), instruction }
        return summarizeWithLlm(this.ctx, input, agent, abort, configured)
      },
      recover: (error, agent, sourceEventSeqs, signal) => this.ctx.waterfall('compaction/summary-error', {
        session: agent.session,
        sourceEventSeqs,
        error,
        ...(signal === undefined ? {} : { signal }),
      }, () => false),
    }
  }

  _policyTarget(agent) {
    const { policy, safetyOnly } = this._policy()
    if (!safetyOnly && policy.model.provider.length > 0 && policy.model.model.length > 0) {
      return { provider: policy.model.provider, model: policy.model.model }
    }
    const session = agent.session
    return routedTarget(session)
      ?? (agent.options.provider?.length && agent.options.model?.length
        ? { provider: agent.options.provider, model: agent.options.model }
        : undefined)
  }
}

function messageOf(value) {
  return value instanceof Error ? value.message : String(value)
}
