/**
 * NanoCompactionEngine — the DNMS01 async-compaction takeover Provider.
 * A `CompactionEngine` subclass per T-O-DNMS01-16: all three methods are
 * reimplemented over the vendored seam primitives + the protocol-faithful
 * `compact-region.js`; nothing imports `compaction-basic` internals.
 *
 * Behavior contract:
 *  - -18/ACE-1117-05  true async, arm-implies-run: crossing the B line in
 *    pre-step both arms the ephemeral episode AND kicks the summarizer in the
 *    same step boundary — the summary runs alongside the turn, it is NOT
 *    deferred to idle. A ready summary commits at the NEXT step boundary
 *    (before the request assembles); if the turn ends first, the
 *    agent/status:idle path commits through agent.runMaintenance once the
 *    attempt resolves. One episode at a time per session — the durable
 *    compaction/start lock enforces one-active process-wide; an ephemeral
 *    lane-active marker (-05②) keeps sync lanes from interleaving.
 *  - -13  FULL trigger closed set: trusted safety (fill >= S) / DC-1 structural
 *    unreachability (fullOnly policy) / post-adoption over-health on a later B
 *    crossing / owner-manual /compact. failure/degraded/unknown never create a
 *    FULL intent.
 *  - -15  fill = tokenMeter.measure(session).totalTokens / W is the only
 *    formula; W = resolveModelInfo(...).context.contextWindow.
 *  - -18⑤ read failure -> safetyOnly: only the S line at 0.90, no B arming.
 *  - -18② one typed-transient circuit: two consecutive transient failures
 *    suppress auto arming; S-line and manual remain live; adoption/manual
 *    success resets it. Preemption, disarm, and timeout settle WITHOUT feeding
 *    the circuit (ACE-1117 CORR-1, -05②③).
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
  currentTurnOpeningRequest,
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
    /**
     * Session-level lane-active marker (-05②): a synchronous lane
     * (manual/FULL/model-switch/overflow) is mid-flight, so the async gate
     * must not arm or interleave. Ephemeral only — no process lock, no
     * durable state. The durable compaction/start bracket remains the
     * one-active authority.
     */
    this._lanes = new Set()
    /**
     * Session ids whose LAST adoption left fill >= H (post-adoption over-health,
     * -13): session-level, not episode-level — the episode map slot is GC'd on
     * settle but this flag must survive until the next B crossing consumes it.
     */
    this._overHealth = new Set()
    /**
     * Session-level same-turn debounce marker (-05③/b): the openTurn that a
     * non-transient drop produced plus whether the suppression was already
     * recorded. Lives outside the episode map — the map slot is GC'd on
     * settle, but the debounce must survive until the turn ends.
     */
    this._blockedTurns = new Map()
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
        circuit: { transientFailures: 0, open: false, suppressedLogged: false },
      }
      this._episodes.set(key, episode)
    }
    return episode
  }

  /**
   * Whether any compaction lane is active on this session (-05②): an async
   * episode whose phase is not `none`, or a synchronous lane currently
   * executing. The gate consults this before arming; entry points consult it
   * before deciding to preempt.
   */
  _laneActive(session) {
    return this._lanes.has(session.id) || (this._episodes.get(session.id)?.phase ?? 'none') !== 'none'
  }

  /**
   * Free the episode map slot once the session is fully settled and the
   * circuit is closed (-05③/d): nothing left to observe or suppress.
   * Called from every settle path that knows the session.
   */
  _maybeGCEpisode(session, episode) {
    // The slot is alive while ANY live state remains: an in-flight phase, an
    // open circuit, or a transient-failure streak that must survive into the
    // next boundary (dropping it here would reset the breaker to zero).
    if (episode.phase === 'none' && !episode.circuit.open && episode.circuit.transientFailures === 0) {
      this._episodes.delete(session.id)
    }
  }

  /**
   * Same-turn debounce (-05③/b): a non-transient drop records the turn that
   * produced it; the gate suppresses further arms while that same turn is
   * still open and clears the marker as soon as a different (or no) turn is
   * observed. Returns 'turn-blocked' on the first suppressed boundary so the
   * ledger sees the gate once, then nulls (silent) for the rest of the turn.
   * `openTurn` null means "not inside a turn" — never blocked, marker cleared.
   */
  _turnBlocked(session, episode, openTurn) {
    const blocked = this._blockedTurns.get(session.id)
    if (blocked === undefined) return null
    if (openTurn === null || openTurn !== blocked.turn) {
      // A different (or no) turn: the debounce is spent.
      this._blockedTurns.delete(session.id)
      return null
    }
    // Same turn: suppressed for the REST of it. The first suppressed boundary
    // is the only one the ledger sees; the rest pass silently.
    if (blocked.logged) return 'turn-blocked-silent'
    blocked.logged = true
    return 'turn-blocked'
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

    // Fallback for a turn that ended before the summary was ready: the turn
    // is over, so committing at the next step boundary is impossible. The
    // idle boundary is the last chance — wait for the in-flight attempt, then
    // commit through runMaintenance (the sanctioned after-turn lane). The
    // phase is `running` here, never `armed`: the attempt began at arm time.
    ctx.on('agent/status', ({ agent, status }) => {
      if (status === 'idle') this._overflowRetries.delete(agent)
      const episode = this._episodes.get(agent.session.id)
      if (status !== 'idle' || episode === undefined || episode.phase !== 'running') return
      const settle = async () => {
        try {
          await episode.attempt
        } catch { /* already dropped inside the attempt */ }
        if (episode.phase !== 'running' || episode.attemptReady !== true) return
        await agent.runMaintenance(async () => {
          await this._finishEpisode(agent, episode)
        }).catch(error => {
          ctx.logger.warn(`async compaction idle maintenance commit failed: ${messageOf(error)}`)
        })
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
  _armEpisode(agent, policy, effectivePin, selectSpec) {
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
    // -08②: the selector contract freezes at arm (same class as retainTokens /
    // summarizationTarget): the target the tail should land near, the 回落线,
    // and the window it was computed against.
    episode.selectSpec = selectSpec ?? null
    episode.armedAt = Date.now()
    episode.summarizationTarget = policy.model.provider.length > 0 && policy.model.model.length > 0
      ? { provider: policy.model.provider, model: policy.model.model }
      : undefined
    // The instruction in force at arm time; the ledger and the activity line
    // report it so a summary can be traced back to the contract that made it.
    episode.promptVersion = instructionVersion({ override: policy.extraRequirements })
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
      attempt: 1,
      retain: episode.retainTokens,
      target: episode.summarizationTarget ?? null,
      promptVersion: episode.promptVersion ?? null,
    })
    const controller = new AbortController()
    episode.attemptAbort = controller
    // Bound the attempt: a hung summarizer must not pin the episode. Timeout is
    // a SETTLEMENT, not a failure (-05③): drop with reason 'timeout' (never a
    // circuit input), then abort so a late-resolving summarizer's result is
    // discarded instead of committing a stale bracket.
    const timer = setTimeout(() => {
      if (episode.phase === 'none') return
      this._dropEpisode(agent.session, episode, 'timeout', new Error('async compaction attempt timed out'))
      try { controller.abort(new Error('async compaction attempt timed out')) } catch { /* raced */ }
    }, EPISODE_TIMEOUT_MS)
    episode.attempt = (async () => {
      try {
        await this._summarizeEpisode(agent, episode, controller.signal)
      } catch (error) {
        // A settle (disarm/preempt/timeout) closes the episode first; recording
        // a second drop here would report one outcome twice.
        if (episode.phase !== 'none') this._dropEpisode(agent.session, episode, this._classifyFailure(error), error)
      } finally {
        clearTimeout(timer)
      }
    })()
  }

  /**
   * Cancel an armed or in-flight episode because the arming condition is gone
   * (CORR-1: the B line's "should still compact" premise lapsed — raised B,
   * a bigger window, or a prune that pulled fill back under B; NOT a failure
   * and never a circuit input, same settlement class as `preempted`).
   *
   * Without this, raising the water line could not stop a compaction already
   * under way: the gate only ever armed, never disarmed. The abort is
   * best-effort — the episode is settled here so the attempt's own catch sees
   * `phase === 'none'` and does not record a second, misleading drop.
   */
  _disarmEpisode(agent, episode, reason) {
    return this._settleInFlight(agent, episode, 'disarmed', reason)
  }

  /**
   * Preempt an in-flight episode so a synchronous lane (manual /compact, FULL,
   * model-switch veto, overflow) can run (-05②, CORR-1 same class): identical
   * settlement to a disarm — abort, close an opened bracket, drop with
   * `bracketed:false`, never touch the circuit.
   */
  _preemptEpisode(agent, episode, lane) {
    return this._settleInFlight(agent, episode, 'preempted', `preempted by ${lane}`)
  }

  /** Shared settle-in-flight body for disarm/preempt: abort + settle + drop. */
  _settleInFlight(agent, episode, kind, detail) {
    if (episode.phase === 'none') return false
    try {
      episode.attemptAbort?.abort(new Error(`async compaction ${kind}: ${detail}`))
    } catch { /* already aborted */ }
    if (episode.tx?.opened === true) {
      try {
        episode.tx.fail(new Error(`${kind}: ${detail}`), kind)
      } catch { /* bracket already closed */ }
    }
    this._settleEpisode(agent.session, episode)
    recordAsyncDecision(agent.session.id, {
      kind: 'drop',
      reason: kind,
      detail,
      bracketed: false,
    })
    this.ctx.logger.info(`async compaction ${kind}: ${detail}`)
    return true
  }

  /**
   * Run a synchronous lane under the session marker (-05②): preempts any
   * in-flight episode FIRST, marks the lane, and always unmarks. The durable
   * bracket keeps being the one-active authority; the marker only protects
   * the ephemeral gate.
   */
  async _runLane(agent, lane, fn) {
    const session = agent.session
    const episode = this._episodes.get(session.id)
    if (episode !== undefined && episode.phase !== 'none') {
      this._preemptEpisode(agent, episode, lane)
    }
    this._lanes.add(session.id)
    try {
      return await fn()
    } finally {
      this._lanes.delete(session.id)
    }
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
    const spec = episode.selectSpec
      ?? { targetTokens: episode.retainTokens, line: policy.healthTargetAsync ?? 0.5, window: 0 }
    const range = spec.window > 0
      ? selectCompactableRange(session, measurement, spec)
      : null
    if (range === null) {
      this._dropEpisode(session, episode, 'no-range', new Error('no compactable range for async episode'))
      return
    }
    // -08⑤: the select record is written BEFORE the summarize starts — the
    // async lane can sit between claim and commit for a long time.
    recordAsyncDecision(session.id, {
      kind: 'select',
      lane: 'async',
      boundary: range.boundary,
      retainedTokens: range.retainedTokens,
      targetTokens: spec.targetTokens,
    })
    // A step-level cut preserves the current turn's opening request in the
    // retained tail; the instruction must echo it verbatim (-03⑤/P4-02c).
    if (range.boundary === 'step') {
      episode.verbatimRequest = currentTurnOpeningRequest(session)
    }
    const tx = prepareCompactionTransaction(
      this._regionDependencies(episode.summarizationTarget, episode),
      session, range.start, range.end,
      { owner: null, stability: 'selected-span', deferStart: true, boundary: range.boundary },
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
      const tx = episode.tx
      const outcome = tx.commit(episode.summarized, undefined)
      if (outcome.failure !== undefined) {
        // commit already closed the bracket with end{error} — detach the tx so
        // the drop path does not append a second end{error}.
        episode.tx = null
        throw outcome.failure.error
      }
      // The durable write is done the moment commit returns: settle BEFORE the
      // first await so neither a second boundary nor a sync lane can re-enter
      // (phase 'none' closes both the _finishEpisode guard and preempt). The
      // bookkeeping below uses captured locals (tx + outcome), which is safe
      // after settle; the over-health flag lives session-level so the GC'd
      // slot cannot swallow it.
      this._settleEpisode(session, episode)
      const adoptedOverHealth = await this._adoptedOverHealth(agent)
      const result = outcome.result
      try {
        await this.ctx.sessions.flush(session)
      } catch (error) {
        this.ctx.logger.warn(`async compaction durability checkpoint failed: ${messageOf(error)}`)
      }
      // `shadowedRange` comes from the seam and names the first/last SURFACE
      // positions, which are not the min/max event seqs: after a replace the
      // surface head can hold a newer checkpoint, making that pair inverted.
      // The ledger reports the true event span instead, so an operator can
      // correlate a compaction with the journal without decoding the seam.
      const shadowedSeqs = result?.shadowedSeqs ?? []
      recordAsyncDecision(session.id, {
        kind: 'commit',
        compactionId: tx.compactionId,
        promptVersion: episode.promptVersion ?? null,
        tokens: result?.shadowedTokenCount ?? null,
        records: shadowedSeqs.length === 0 ? null : shadowedSeqs.length,
        range: shadowedSeqs.length === 0
          ? null
          : { first: Math.min(...shadowedSeqs), last: Math.max(...shadowedSeqs) },
      })
      if (adoptedOverHealth === true) this._overHealth.add(session.id)
      this._logResult(result, 'async maintenance')
      return true
    } catch (error) {
      this._dropEpisode(session, episode, this._classifyFailure(error), error)
      return false
    }
  }

  /**
   * Post-commit over-health probe (-13): whether the adoption left fill still
   * >= H, which primes the FULL closed set at the next B crossing. Session-
   * level side channel; a probe failure reports false (never primes).
   */
  async _adoptedOverHealth(agent) {
    try {
      const policy = this._policy()
      const W = await this._window(agent, policy)
      if (policy.safetyOnly || W === null) return false
      const measurement = this.ctx.tokenMeter.measure(agent.session)
      return measurement.totalTokens / W >= policy.policy.healthTargetAsync
    } catch {
      return false
    }
  }

  _settleEpisode(session, episode) {
    episode.phase = 'none'
    episode.tx = null
    episode.prepared = null
    episode.summarized = null
    episode.attemptReady = false
    episode.attempt = undefined
    episode.attemptAbort = undefined
    episode.verbatimRequest = undefined
    episode.selectSpec = null
    if (session !== undefined) this._maybeGCEpisode(session, episode)
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
    // Non-transient drops debounce the gate for the REST of this turn (-05③):
    // the selector's null-range, a committed-then-failed summarize, or an
    // unknown error is not transient, so it is almost certainly about to fail
    // again. The next turn may retry. Settlement-class drops (disarm,
    // preempt, timeout) are NOT failures and must not suppress re-arming.
    const SETTLEMENT = new Set(['disarmed', 'preempted', 'timeout'])
    if (reason !== 'transient' && !SETTLEMENT.has(reason)) {
      const openTurn = inspectCompactionEntryState(session).openTurn
      if (openTurn !== null) {
        // Session-level marker: survives the GC'd episode slot below.
        this._blockedTurns.set(session.id, { turn: openTurn, logged: false })
      }
    }
    this._maybeGCEpisode(session, episode)
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
        return this._runLane(agent, 'overflow', async () => {
          this.ctx.get('toolResultPruner')?.pruneSession(agent.session)
          const measurement = this.ctx.tokenMeter.measure(agent.session)
          // -08②: 回落线 = safetyOnly ? S : B; 目标 = safetyOnly ? 0 : pinnedFullTokens.
          const { policy, safetyOnly } = this._policy()
          const targetTokens = safetyOnly ? 0 : policy.pinnedFullTokens
          const range = selectCompactableRange(agent.session, measurement, {
            targetTokens,
            line: safetyOnly ? SAFETY_RATIO : policy.bufferSizeAsync,
            window: await this._window(agent, { policy, safetyOnly }) ?? Number.POSITIVE_INFINITY,
          })
          if (range === null) return null
          recordAsyncDecision(agent.session.id, {
            kind: 'select',
            lane: 'overflow',
            boundary: range.boundary,
            retainedTokens: range.retainedTokens,
            targetTokens,
          })
          return this._compactRegionRange(agent, range, signal)
        })
      }
      default:
        throw new Error(`unknown compaction trigger: ${trigger}`)
    }
  }

  /** Synchronous FULL for the closed trigger set plus model-switch require-below. */
  async _compactPressure(agent, header, signal, requireBelowThreshold) {
    // A sync lane preempts any in-flight async episode BEFORE the durable
    // bracket check (-05②): the episode owns nothing yet, so it drops
    // cleanly instead of this lane reporting a false lock contention.
    return this._runLane(agent, requireBelowThreshold ? 'model-switch' : 'full', async () => {
      return this._compactPressureBody(agent, header, signal, requireBelowThreshold)
    })
  }

  async _compactPressureBody(agent, header, signal, requireBelowThreshold) {
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
    // -08②: the same selector contract as the async lane — target
    // pinnedFullTokens (0 under safety), 回落线 = S under safety else B.
    const selectSpec = {
      targetTokens: retain,
      line: safetyOnly ? SAFETY_RATIO : policy.bufferSizeAsync,
      window: W,
    }
    // lane enum is fixed (-06①): model-switch is the require-below variant of
    // the synchronous FULL lane, not a fifth lane.
    const lane = 'full'
    let result = null
    for (let attempt = 0; attempt <= COMPACTION_RETRIES; attempt += 1) {
      const range = selectCompactableRange(agent.session, measurement, selectSpec)
      if (range === null) {
        if (result === null && !requireBelowThreshold) return null
        throw new Error(
          'no safe compaction range can reduce context below threshold '
          + `(${measurement.totalTokens} estimated tokens >= ${Math.floor(threshold * W)})`,
        )
      }
      recordAsyncDecision(agent.session.id, {
        kind: 'select',
        lane,
        boundary: range.boundary,
        retainedTokens: range.retainedTokens,
        targetTokens: retain,
      })
      result = await this._compactRegionRange(agent, range, signal)
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
    if (info.context === undefined) {
      // -05⑥: no window → no fill → no gate at all. Recorded so a session whose
      // model reports no context budget is not a silent dead lane.
      recordAsyncDecision(agent.session.id, {
        kind: 'skip',
        reason: 'no-window',
        detail: `${target.provider}/${target.model} reports no context window`,
      })
      return null
    }
    const W = info.context.contextWindow
    let measurement = meter.measure(agent.session, header)
    let fillRatio = measurement.totalTokens / W

    if (safetyOnly) {
      // -18⑤: read failure -> only the S line stays live.
      if (fillRatio >= SAFETY_RATIO) return this._compactPressure(agent, header, signal, false)
      return null
    }

    const order = validateMasterOrder(policy, W)
    const fullOnly = order.ok && order.fullOnly
    const episode = this._episode(agent.session)

    // Free pass before the disarm comparison (P3-04a/-05④): the prune is a
    // model-free reduction, so the boundary premise check must compare against
    // post-prune fill — otherwise an in-flight episode survives on stale
    // pressure the pruner already relieved.
    const pruner = this.ctx.get('toolResultPruner')
    if (pruner !== undefined && fillRatio >= policy.bufferSizeAsync) {
      pruner.pruneSession(agent.session)
      measurement = meter.measure(agent.session, header)
      const prunedFill = measurement.totalTokens / W
      if (prunedFill !== fillRatio) {
        // Re-derive the trigger on the cheaper surface: disarm, FULL, and arm
        // all consult the same post-prune fill from here on.
        fillRatio = prunedFill
      }
    }

    // A raised B must be able to stop work that is already under way: the gate
    // used to only ever arm, so lowering the line took effect immediately while
    // raising it could not cancel anything. Post-prune fill is what counts —
    // a prune that relieved pressure below B disarms too (CORR-1/-05④).
    if (episode.phase !== 'none' && fillRatio < policy.bufferSizeAsync) {
      this._disarmEpisode(agent, episode, `fill ${(fillRatio * 100).toFixed(1)}% fell below B ${(policy.bufferSizeAsync * 100).toFixed(1)}%`)
    }

    // FULL closed set (-13): trusted safety / DC-1 / post-adoption over-health.
    // These are NOT lane-gated: a FULL trigger outranks an in-flight async
    // episode and preempts it inside _compactPressure's lane (-05②).
    if (fillRatio >= SAFETY_RATIO
      || (fullOnly && fillRatio >= policy.bufferSizeAsync)
      || (this._overHealth.has(agent.session.id) && fillRatio >= policy.bufferSizeAsync)) {
      this._overHealth.delete(agent.session.id)
      return this._compactPressure(agent, header, signal, false)
    }

    if (fillRatio >= policy.bufferSizeAsync && !fullOnly) {
      // -05②: another lane (in-flight episode or a synchronous lane
      // mid-flight) owns this session — the gate must not arm. Suppression is
      // recorded so a busy session is not a silent pass. FULL above already
      // returned before reaching here.
      if (this._laneActive(agent.session)) {
        recordAsyncDecision(agent.session.id, {
          kind: 'skip',
          reason: 'lane-active',
          fill: fillRatio,
          window: W,
        })
        return null
      }
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
      // Same-turn debounce (-05③/b): a non-transient drop earlier in this turn
      // suppressed further arms until the next turn. One ledger record per
      // turn at most — later boundaries in the same turn pass silently.
      const blocked = this._turnBlocked(agent.session, episode, inspectCompactionEntryState(agent.session).openTurn)
      if (blocked !== null) {
        if (blocked === 'turn-blocked') {
          recordAsyncDecision(agent.session.id, {
            kind: 'skip',
            reason: 'turn-blocked',
            fill: fillRatio,
            window: W,
          })
        }
        return null
      }
      // The prune + remeasure pass already ran above the disarm check (the
      // premise comparison needs post-prune fill); nothing to repeat here.
      const effectivePin = order.ok ? order.effectivePin : Math.min(policy.pinnedAsyncTokens, Math.floor(0.15 * W))
      const selectSpec = {
        targetTokens: effectivePin,          // -08②: async aims at the frozen pin
        line: policy.healthTargetAsync,  // 回落线 = H
        window: W,
      }
      if (this._armEpisode(agent, policy, effectivePin, selectSpec)) {
        recordAsyncDecision(agent.session.id, {
          kind: 'arm',
          fill: fillRatio,
          window: W,
          bufferSizeAsync: policy.bufferSizeAsync,
          retain: effectivePin,
          target: policy.model.provider.length > 0 ? { provider: policy.model.provider, model: policy.model.model } : null,
          promptVersion: instructionVersion({ override: policy.extraRequirements }),
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

  /**
   * Internal lane path: compact a selector-produced range, threading the
   * boundary level into the tx (frame + ledger) and, for step-level cuts, the
   * current turn's opening request into the instruction (-03⑤).
   */
  async _compactRegionRange(agent, range, signal) {
    return compactSurfaceRegion(
      this._regionDependencies(undefined, undefined, {
        verbatimRequest: range.boundary === 'step'
          ? currentTurnOpeningRequest(agent.session)
          : undefined,
      }),
      agent.session,
      range.start,
      range.end,
      agent,
      { owner: 'current-turn', stability: 'whole-surface', boundary: range.boundary },
      signal,
    )
  }

  compactNow(agent, signal, sourceCommandId) {
    signal.throwIfAborted()
    // -05②: the manual lane preempts an in-flight async episode before the
    // durable one-active check — a held bracket then means a FOREIGN lane,
    // never our own in-flight attempt.
    const episode = this._episodes.get(agent.session.id)
    if (episode !== undefined && episode.phase !== 'none') {
      this._preemptEpisode(agent, episode, 'manual')
    }
    try {
      return agent.runMaintenance(async (agentSignal) => {
        const operationSignal = AbortSignal.any([agentSignal, signal])
        this._lanes.add(agent.session.id)
        try {
          operationSignal.throwIfAborted()
          const entryState = inspectCompactionEntryState(agent.session)
          if (entryState.unmatchedCompactionStart !== undefined) {
            throw new ManualCompactionError('busy', 'manual compaction: an async episode already holds the compaction lock')
          }
          const { policy, safetyOnly } = this._policy()
          const measurement = this.ctx.tokenMeter.measure(agent.session)
          const targetTokens = safetyOnly ? 0 : policy.pinnedFullTokens
          const range = selectCompactableRange(
            agent.session,
            measurement,
            {
              targetTokens,
              line: safetyOnly ? SAFETY_RATIO : policy.bufferSizeAsync,
              window: await this._window(agent, { policy, safetyOnly }) ?? Number.POSITIVE_INFINITY,
            },
          )
          if (range === null) return null
          recordAsyncDecision(agent.session.id, {
            kind: 'select',
            lane: 'manual',
            boundary: range.boundary,
            retainedTokens: range.retainedTokens,
            targetTokens,
          })
          return await compactSurfaceRegion(
            this._regionDependencies(undefined, undefined, {
              verbatimRequest: range.boundary === 'step'
                ? currentTurnOpeningRequest(agent.session)
                : undefined,
            }),
            agent.session,
            range.start,
            range.end,
            agent,
            {
              owner: null,
              stability: 'selected-span',
              boundary: range.boundary,
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
        } finally {
          this._lanes.delete(agent.session.id)
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

  _regionDependencies(summarizationTarget, episode, laneOpts) {
    const verbatimRequest = episode?.verbatimRequest ?? laneOpts?.verbatimRequest
    return {
      meter: this.ctx.tokenMeter,
      summarize: (input, agent, abort) => {
        const target = summarizationTarget ?? this._policyTarget(agent)
        const { policy, safetyOnly } = this._policy()
        const instruction = !safetyOnly && typeof policy?.extraRequirements === 'string' && policy.extraRequirements.trim().length > 0
          ? { override: policy.extraRequirements, verbatimRequest }
          : (verbatimRequest !== undefined ? { verbatimRequest } : undefined)
        // The prompt is read HERE, so the version recorded for this episode
        // must be computed HERE too. Recording the arm-time version made the
        // ledger claim a contract that could differ from the one actually sent
        // if the policy changed between arming and summarising.
        if (episode !== undefined) episode.promptVersion = instructionVersion(instruction ?? {})
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
