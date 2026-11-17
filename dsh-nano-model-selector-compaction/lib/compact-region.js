/**
 * DNMS01 durable compaction transaction — protocol-faithful JS reimplementation
 * of `compaction-basic/src/region.ts` + `summarizer.ts` (T-O-DNMS01-16).
 *
 * The frozen truth forbids importing non-exported `compaction-basic` internals
 * and profile packages cannot resolve `@deepseek-ai/dsh-llm`/`dsh-session` at
 * all, so the few private primitives those modules use are re-derived here with
 * byte-identical wire semantics, each tagged with its upstream origin:
 *   - errorChain / createUserMessage / BlockAssembler / LlmError-fromFailure /
 *     contentHasImage / COMPACTION_INSTRUCTION / CHECKPOINT_PREAMBLE /
 *     frameSummary  <- @deepseek-ai/dsh-llm + compaction-basic/src/summarizer.ts
 * Everything else (compaction/start|summary|end bracket, compactionId,
 * sourceCommandId correlation, surfaceOp:{op:'replace'}, shrink check,
 * stability assertions, six failure codes) mirrors region.ts line-for-line.
 */

import { createHash, randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import {
  CompactionId,
  ManualCompactionError,
  compactCheckpointSource,
  toolPairingBalancedAfter,
  toolPairingBalancedBefore,
} from './compaction-seam.js'

/* ---- minimal re-derivations of dsh-llm private primitives ---- */

/** Port of `dsh-util-values` deepFreeze (recursive Object.freeze). */
function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key])
    Object.freeze(value)
  }
  return value
}

/** Port of `@deepseek-ai/dsh-llm` createMessage/createUserMessage. */
export function createUserMessage(input) {
  return deepFreeze(structuredClone({ ...input, role: 'user', id: randomUUID() }))
}

/** Port of `@deepseek-ai/dsh-llm` errorChain (verbatim semantics). */
function errorChain(value) {
  const path = new Set()
  const render = current => {
    if (path.has(current)) return '<circular cause>'
    path.add(current)
    try {
      if (!(current instanceof Error)) {
        if (typeof current === 'object' && current !== null) {
          const descriptor = Object.getOwnPropertyDescriptor(current, 'message')
          if (descriptor !== undefined && 'value' in descriptor && typeof descriptor.value === 'string') return descriptor.value
        }
        return String(current)
      }
      const message = current.message === '' ? current.name : current.message
      const members = current instanceof AggregateError && current.errors.length > 0
        ? ` [${current.errors.map(render).join('; ')}]`
        : ''
      const causeText = current.cause === undefined || current.cause === null ? '' : render(current.cause)
      return `${message}${members}${causeText === '' || causeText === message ? '' : `: ${causeText}`}`
    } finally {
      path.delete(current)
    }
  }
  return render(value)
}

/** Port of `@deepseek-ai/dsh-llm` contentHasImage. */
function contentHasImage(content) {
  return content.some(block => block.type === 'image')
}

/**
 * Port of `@deepseek-ai/dsh-llm` BlockAssembler restricted to the chunk types
 * a summarization stream can carry (block-start/text-delta/reasoning-delta/
 * tool-call-delta/block-end/usage/finish). Same keep/drop semantics.
 */
class BlockAssembler {
  constructor() {
    this.partials = new Map()
    this.order = []
    this._usage = undefined
    this._finish = undefined
  }
  push(chunk) {
    switch (chunk.type) {
      case 'block-start':
        if (!this.partials.has(chunk.index)) {
          this.order.push(chunk.index)
          this.partials.set(chunk.index, { blockType: chunk.blockType, text: '', toolCallArguments: '' })
        }
        return
      case 'text-delta':
      case 'reasoning-delta': {
        const partial = this.ensure(chunk.index, chunk.type === 'text-delta' ? 'text' : 'reasoning')
        if (partial.block) return
        partial.text += chunk.text
        return
      }
      case 'tool-call-delta': {
        const partial = this.ensure(chunk.index, 'tool-call')
        if (partial.block) return
        partial.toolCallId = chunk.id
        if (chunk.name) partial.toolCallName = chunk.name
        partial.toolCallArguments += chunk.argumentsDelta
        return
      }
      case 'block-end': {
        const partial = this.ensure(chunk.index, chunk.block.type)
        if (partial.block) return
        partial.block = chunk.block
        return
      }
      case 'usage': this._usage = chunk.usage; return
      case 'finish': this._finish = chunk.reason; return
      default: return
    }
  }
  ensure(index, blockType) {
    let partial = this.partials.get(index)
    if (!partial) {
      partial = { blockType, text: '', toolCallArguments: '' }
      this.partials.set(index, partial)
      this.order.push(index)
    }
    return partial
  }
  assemble(partial, index) {
    if (partial.block) return partial.block
    switch (partial.blockType) {
      case 'text': return { type: 'text', text: partial.text }
      case 'reasoning': return { type: 'reasoning', text: partial.text }
      case 'tool-call': return {
        type: 'tool-call',
        id: partial.toolCallId ?? `call-${index}`,
        name: partial.toolCallName ?? '',
        arguments: partial.toolCallArguments,
      }
      default: throw new Error(`cannot assemble incomplete block of type "${partial.blockType}"`)
    }
  }
  get finish() {
    return this._finish ?? { kind: 'unknown' }
  }
  get usage() { return this._usage }
  blocks() {
    return this.order.map(index => this.assemble(this.partials.get(index), index))
  }
}

/** Port of `LlmError.fromFailure`: re-raise a serializable failure with its own code. */
function llmErrorFromFailure(failure, options) {
  const error = new Error(failure.message, options)
  error.name = 'LlmError'
  error.code = failure.code
  error.failure = Object.freeze({
    message: failure.message,
    code: failure.code,
    ...(failure.status === undefined ? {} : { status: failure.status }),
    ...(failure.providerRetryAfterMs === undefined ? {} : { providerRetryAfterMs: failure.providerRetryAfterMs }),
    ...(failure.requestId === undefined ? {} : { requestId: failure.requestId }),
    ...(failure.offloadImages === undefined ? {} : { offloadImages: failure.offloadImages }),
  })
  return error
}

/** New LlmError-shaped error (name + code + failure), mirroring the constructor contract. */
function newLlmError(message, code, options) {
  const error = new Error(message, options)
  error.name = 'LlmError'
  error.code = code
  error.failure = Object.freeze({
    message,
    code,
    ...(options?.status === undefined ? {} : { status: options.status }),
    ...(options?.providerRetryAfterMs === undefined ? {} : { providerRetryAfterMs: options.providerRetryAfterMs }),
    ...(options?.requestId === undefined ? {} : { requestId: options.requestId }),
    ...(options?.offloadImages === undefined ? {} : { offloadImages: options.offloadImages }),
  })
  return error
}

/* ---- compaction-basic/src/summarizer.ts constants (verbatim) ---- */

const SUMMARY_OPEN_TAG = '<compacted-summary>'
const SUMMARY_CLOSE_TAG = '</compacted-summary>'

export const COMPACTION_INSTRUCTION = [
  'You are now acting as a compaction engine for this AI coding assistant. Condense the conversation ABOVE into a structured checkpoint that lets another model resume the work with no loss of essential context.',
  '',
  'Output EXACTLY the Markdown structure below: keep every section, in order. Use terse bullets, not prose paragraphs. Write "(none)" for an empty section — never drop a section.',
  '',
  '## Primary Request and Intent',
  "- [the user's original and evolving goals; quote verbatim where the exact wording matters]",
  '',
  '## Key Technical Concepts',
  '- [technologies, frameworks, patterns, and conventions in play]',
  '',
  '## Files and Code',
  '- [exact path: why it matters, key changes or snippets]',
  '',
  '## Errors and Fixes',
  '- [error: how it was resolved, plus any related user feedback]',
  '',
  '## Pending Jobs',
  '- [explicitly requested work not yet completed]',
  '',
  '## Current Work',
  '- [precisely what was in progress at this checkpoint]',
  '',
  '## Next Step',
  '- [the single next action, directly in line with the most recent request, or "(none)"]',
  '',
  '## Critical Context',
  '- [decisions and their rationale, constraints, user preferences, open questions, data needed to continue]',
  '',
  'Rules:',
  '- Write concise English engineering prose. Preserve exact file paths, commands, error strings, identifiers, numeric values, function signatures, and syntax fragments.',
  '- Capture user feedback and explicit instructions faithfully, especially corrections.',
  '- Do NOT mention this summarization request or that the context was compacted.',
  '- Output only the checkpoint text: do not call any tool or take any other action.',
  `- If the conversation already contains a ${SUMMARY_OPEN_TAG} block, it is a PRIOR checkpoint. Do not copy it forward verbatim: preserve still-true facts, drop stale ones, and merge newer information into a single consolidated summary under the same structure.`,
].join('\n')

/**
 * The instruction actually sent (-07①②③): always the built-in
 * COMPACTION_INSTRUCTION, optionally followed by a fixed
 * `Additional requirements:` paragraph carrying `policy.extraRequirements`
 * (`override`). A non-empty extra never replaces the built-in body — the
 * retired `summaryPrompt` wholesale override is gone for good.
 * `verbatimRequest` appends the step-level compensation section
 * (-03⑤/-07①): the current turn's opening user request, which the unified
 * selector preserves in the retained tail, is echoed here verbatim so the
 * summarizer knows it survives un-summarized.
 * @param {{override?: string, verbatimRequest?: string}|string|undefined} options
 *   `override` = `policy.extraRequirements`; a bare string is read as `override`.
 * @returns {string} the instruction actually sent.
 */
export function instructionText(options) {
  const override = typeof options === 'string' ? options : options?.override
  const verbatim = typeof options === 'object' && options !== null ? options.verbatimRequest : undefined
  const parts = [COMPACTION_INSTRUCTION]
  if (typeof verbatim === 'string' && verbatim.length > 0) {
    parts.push(`Current-turn opening request, preserved verbatim:\n${verbatim}`)
  }
  if (typeof override === 'string' && override.length > 0) {
    parts.push(`Additional requirements:\n${override}`)
  }
  return parts.join('\n\n')
}

/**
 * Short, stable fingerprint of the instruction that will actually be sent.
 *
 * "Which summarizer contract produced this summary?" is unanswerable from the
 * model name alone — the same model summarises differently under the built-in
 * instruction and under an addendum, and an addendum edited between two
 * compactions is a different contract too. Eight hex characters is enough to
 * tell versions apart by eye and to correlate a summary with the policy that
 * produced it, without putting the prompt itself into an event or a log.
 * @param {{override?: string, verbatimRequest?: string}|string|undefined} options
 * @returns {string} 8 lowercase hex characters.
 */
export function instructionVersion(options) {
  return createHash('sha256').update(instructionText(options), 'utf8').digest('hex').slice(0, 8)
}

const CHECKPOINT_PREAMBLE =
  'This is an automatically generated checkpoint condensing an earlier span of the conversation to free up context. Treat the captured context as established background and build on it without restating it. Continue the task directly from the messages that follow, without acknowledging this checkpoint.'

/** Port of summarizer.ts frameSummary. */
export function frameSummary(summary) {
  return [
    { type: 'text', text: `${CHECKPOINT_PREAMBLE}\n\n${SUMMARY_OPEN_TAG}` },
    ...summary,
    { type: 'text', text: SUMMARY_CLOSE_TAG },
  ]
}

/** Port of summarizer.ts finishError. */
function finishError(finish) {
  switch (finish.kind) {
    case 'error':
    case 'aborted': {
      return llmErrorFromFailure(finish.failure)
    }
    case 'max-tokens': {
      const error = new Error('summarization truncated at the token cap (incomplete checkpoint)')
      error.code = 'MAX_TOKENS'
      return error
    }
    default:
      return undefined
  }
}

/** Port of summarizer.ts summaryText — reject visual output, keep text blocks. */
function summaryText(blocks) {
  if (contentHasImage(blocks)) {
    throw newLlmError('compaction summary cannot contain image output', 'UNSUPPORTED_CONTENT')
  }
  return blocks.filter(block => block.type === 'text')
}

/**
 * Port of summarizer.ts summarizeWithLlm minus the config fields DNMS01 bans:
 * no `maxTokens` is ever sent (no-cap, -16), and the summary model resolves
 * `configured ?? latest logged request target ?? AgentOptions` verbatim.
 */
export async function summarizeWithLlm(ctx, input, agent, signal, configuredTarget) {
  const latest = agent.session.requestHeader()?.config
  const configured = configuredTarget?.provider && configuredTarget?.model
    ? { provider: configuredTarget.provider, model: configuredTarget.model }
    : undefined
  const agentTarget = agent.options.provider !== undefined
    && agent.options.provider.length > 0
    && agent.options.model !== undefined
    && agent.options.model.length > 0
    ? { provider: agent.options.provider, model: agent.options.model }
    : undefined
  const target = configured ?? latest ?? agentTarget
  if (target === undefined) {
    throw new Error(
      'no provider/model available for summarization: set the async-compact.json model pair, route one request, or set both AgentOptions fields',
    )
  }

  const assembler = new BlockAssembler()
  const messages = [
    ...input.messages,
    deepFreeze({
      role: 'user',
      content: [{ type: 'text', text: instructionText(configuredTarget?.instruction) }],
    }),
  ]
  const options = {
    provider: target.provider,
    model: target.model,
    messages,
    toolHistory: agent.session.toolHistory(),
    ...(input.tools === undefined ? {} : { tools: [...input.tools] }),
    // no-cap (-16): maxTokens and every alias equivalent is deliberately absent.
    sessionId: agent.session.id,
    purpose: 'compaction',
    ...(signal === undefined ? {} : { signal }),
  }
  for await (const chunk of ctx.llm.stream(options)) assembler.push(chunk)
  const error = finishError(assembler.finish)
  if (error !== undefined) throw error

  const rawOutput = assembler.blocks()
  const summary = summaryText(rawOutput)
  if (!summary.some(block => block.text.trim().length > 0)) {
    throw new Error('summarization produced no text summary content')
  }
  return {
    summary,
    rawOutput,
    llmStreamCall: true,
    provider: options.provider,
    model: options.model,
    ...(assembler.usage === undefined ? {} : { usage: assembler.usage }),
  }
}

/* ---- region.ts (verbatim port) ---- */

class SurfaceChangedError extends Error {}
export { SurfaceChangedError }

function systemHead(session, headSeq) {
  const head = session.eventAt(headSeq)
  return head.type === 'system/message' ? head : undefined
}

/** Port of region.ts selectCompactableRange. */
export function selectCompactableRange(session, measurement, retainTokens) {
  const pricedNodes = measurement.nodes
  if (pricedNodes.length === 0) return null

  const surfaceNodes = session.surface.nodes
  if (surfaceNodes.length !== pricedNodes.length
    || surfaceNodes.some((seq, index) => seq !== pricedNodes[index]?.seq)) {
    throw new Error('compaction: token-meter surface does not match the current session surface')
  }
  const firstIdx = systemHead(session, surfaceNodes[0]) === undefined ? 0 : 1

  let accumulated = 0
  let keepFromIdx = pricedNodes.length
  for (let index = pricedNodes.length - 1; index >= 0; index -= 1) {
    accumulated += pricedNodes[index].tokens
    keepFromIdx = index
    if (accumulated >= retainTokens) break
  }
  if (keepFromIdx <= firstIdx) return null

  while (keepFromIdx > firstIdx) {
    if (toolPairingBalancedBefore(session, surfaceNodes[keepFromIdx])) break
    keepFromIdx -= 1
  }
  if (keepFromIdx <= firstIdx) return null

  const first = surfaceNodes[firstIdx]
  const cutoff = surfaceNodes[keepFromIdx - 1]
  return { start: first, end: cutoff }
}

function validateSurfaceRegion(session, start, end) {
  const nodes = session.surface.nodes
  const startIdx = nodes.indexOf(start)
  const endIdx = nodes.indexOf(end)
  if (startIdx === -1) throw new Error(`compactRegion: start seq ${start} not found in surface`)
  if (endIdx === -1) throw new Error(`compactRegion: end seq ${end} not found in surface`)
  if (startIdx > endIdx) {
    throw new Error(
      `compactRegion: start seq ${start} (position ${startIdx}) is after end seq ${end} (position ${endIdx}) on the surface`,
    )
  }
  if (!toolPairingBalancedBefore(session, nodes[startIdx])) {
    throw new Error(`compactRegion: start seq ${start} is not a balanced boundary (would split a step's tool-call/result pair)`)
  }
  if (!toolPairingBalancedAfter(session, nodes[endIdx])) {
    throw new Error(`compactRegion: end seq ${end} is not a balanced boundary (would split a step, or the step is still open)`)
  }
  return { start, end, startIdx, endIdx, shadowedSeqs: nodes.slice(startIdx, endIdx + 1) }
}

function prepareCompaction(dependencies, session, selection) {
  const measurement = dependencies.meter.measure(session)
  const selectedNodes = measurement.nodes.slice(selection.startIdx, selection.endIdx + 1)
  if (selectedNodes.length !== selection.shadowedSeqs.length
    || selectedNodes.some((node, index) => node.seq !== selection.shadowedSeqs[index])) {
    throw new SurfaceChangedError('compaction: selected surface changed before summarization began')
  }
  return {
    ...selection,
    measurement,
    selectedNodes,
    shadowedTokenCount: selectedNodes.reduce((total, node) => total + node.heuristicTokens, 0),
    shadowedRouteTokenCount: selectedNodes.reduce((total, node) => total + node.tokens, 0),
    input: buildSummarizationInput(session, selection.shadowedSeqs),
  }
}

async function summarizeCompaction(
  dependencies, prepared, agent, compactionId, sourceCommandId, assertStable, signal,
) {
  let summaryResult
  for (;;) {
    signal?.throwIfAborted()
    try {
      summaryResult = await dependencies.summarize(prepared.input, agent, signal)
      break
    } catch (error) {
      if (signal?.aborted === true) throw error
      assertStable(dependencies, agent.session, prepared)
      if (!dependencies.recover(error, agent, prepared.shadowedSeqs, signal)) throw error
      prepared = prepareCompaction(dependencies, agent.session,
        validateSurfaceRegion(agent.session, prepared.start, prepared.end))
    }
  }
  const checkpointMessage = createUserMessage({
    content: frameSummary(summaryResult.summary),
    source: compactCheckpointSource(compactionId, sourceCommandId),
  })
  const framedSummaryTokenCount = dependencies.meter.estimateMessage(checkpointMessage)
  if (framedSummaryTokenCount >= prepared.shadowedRouteTokenCount) {
    throw new Error(
      `summary is not smaller than the shadowed content (${framedSummaryTokenCount} estimated framed tokens >= ${prepared.shadowedRouteTokenCount})`,
    )
  }
  return { ...prepared, ...summaryResult, checkpointMessage }
}

function assertWholeSurfaceUnchanged(dependencies, session, prepared) {
  const current = dependencies.meter.measure(session)
  if (!isDeepStrictEqual(current.nodes, prepared.measurement.nodes)) {
    throw new SurfaceChangedError('compaction: session surface changed during summarization')
  }
}

function assertSelectedSpanStable(dependencies, session, prepared) {
  let current
  try {
    current = validateSurfaceRegion(session, prepared.start, prepared.end)
  } catch (error) {
    throw new SurfaceChangedError(
      'compaction: the selected span is no longer a valid replacement target',
      { cause: error },
    )
  }
  if (!isDeepStrictEqual([...current.shadowedSeqs], [...prepared.shadowedSeqs])) {
    throw new SurfaceChangedError('compaction: the selected span changed during summarization')
  }
  const measured = dependencies.meter.measure(session).nodes.slice(current.startIdx, current.endIdx + 1)
  if (!isDeepStrictEqual(measured, prepared.selectedNodes)) {
    throw new SurfaceChangedError('compaction: the selected span was rewritten during summarization')
  }
}

function commitCompactionBody(session, startEvent, summarized) {
  const {
    start, end, shadowedSeqs, shadowedTokenCount,
    summary, provider, model, maxTokens, usage, checkpointMessage,
  } = summarized
  const callRecord = summarized.llmStreamCall === true
    ? { rawOutput: summarized.rawOutput, llmStreamCall: true }
    : summarized.rawOutput === undefined ? {} : { rawOutput: summarized.rawOutput }
  const summaryEvent = session.append('compaction/summary', {
    compactionId: startEvent.data.compactionId,
    ...(startEvent.data.sourceCommandId === undefined
      ? {}
      : { sourceCommandId: startEvent.data.sourceCommandId }),
    summary,
    ...callRecord,
    shadowedRange: { start, end },
    shadowedSeqs: [...shadowedSeqs],
    shadowedTokenCount,
    provider,
    model,
    ...(maxTokens === undefined ? {} : { maxTokens }),
    ...(usage === undefined ? {} : { usage }),
  })
  session.append('user/message', checkpointMessage, {
    surfaceOp: { op: 'replace', startSeq: start, endSeq: end },
    sourceEventSeqs: [startEvent.seq, summaryEvent.seq, ...shadowedSeqs],
  })
  return {
    compactionId: startEvent.data.compactionId,
    ...(startEvent.data.sourceCommandId === undefined
      ? {}
      : { sourceCommandId: startEvent.data.sourceCommandId }),
    startSeq: startEvent.seq,
    summarySeq: summaryEvent.seq,
    summary,
    shadowedRange: { start, end },
    shadowedSeqs: [...shadowedSeqs],
    shadowedTokenCount,
  }
}

function completeCompaction(pending, endEvent) {
  return { ...pending, endSeq: endEvent.seq }
}

function buildSummarizationInput(session, shadowedSeqs) {
  const header = session.requestHeader()
  const head = systemHead(session, session.surface.nodes[0])
  const system = head === undefined ? null : session.deriveEventMessage(head)
  const regionMessages = shadowedSeqs
    .map(seq => session.deriveEventMessage(session.eventAt(seq)))
    .filter(message => message !== null)
  return {
    ...(header?.tools === undefined ? {} : { tools: header.tools }),
    messages: system === null ? regionMessages : [system, ...regionMessages],
  }
}

export function inspectCompactionEntryState(session) {
  let openTurn = null
  let openTurnStateKnown = false
  let unmatchedCompactionStart = undefined
  let compactionEntryStateKnown = false
  let latestEndSeedSeq = undefined
  for (let seq = session.seq - 1; seq >= 0; seq -= 1) {
    const event = session.eventAt(seq)
    if (latestEndSeedSeq === undefined && event.type === 'session/end-seed') {
      latestEndSeedSeq = event.seq
    }
    if (!compactionEntryStateKnown) {
      if (event.type === 'compaction/start') {
        unmatchedCompactionStart = event
        compactionEntryStateKnown = true
      } else if (event.type === 'compaction/end') {
        compactionEntryStateKnown = true
      }
    }
    if (!openTurnStateKnown) {
      if (event.type === 'turn/start') {
        openTurn = event.data.turn
        openTurnStateKnown = true
      } else if (event.type === 'turn/end') {
        openTurnStateKnown = true
      }
    }
    if (openTurnStateKnown && compactionEntryStateKnown && latestEndSeedSeq !== undefined) break
  }
  return { openTurn, unmatchedCompactionStart, latestEndSeedSeq }
}

function assertCompactionInactive(unmatchedCompactionStart, latestEndSeedSeq, stage) {
  if (unmatchedCompactionStart === undefined
    || (latestEndSeedSeq !== undefined
      && latestEndSeedSeq > unmatchedCompactionStart.seq)) return
  throw new ManualCompactionError(
    'busy',
    `${stage}: compaction already in progress; the session compaction lock is already active`,
  )
}

/** Port of region.ts assertNoActiveCompaction. */
export function assertNoActiveCompaction(session, stage) {
  const entryState = inspectCompactionEntryState(session)
  assertCompactionInactive(entryState.unmatchedCompactionStart, entryState.latestEndSeedSeq, stage)
}

/**
 * Split-phase compaction transaction. `prepare` runs under the caller's
 * synchronization; `commit` is invoked at the durable adoption boundary the
 * caller chooses (-18 async: prepare in maintenance, commit at next request
 * assembly; -16 manual/full: prepare and commit in one episode).
 *
 * The bracket spans BOTH phases: `compaction/start` opens at prepare and the
 * matching `compaction/end` closes only at commit (or error). That keeps the
 * one-active lock durable across the async gap (-18②).
 */
export function prepareCompactionTransaction(
  dependencies, session, start, end, options, agent,
) {
  const selection = validateSurfaceRegion(session, start, end)
  const entryState = inspectCompactionEntryState(session)
  assertCompactionInactive(entryState.unmatchedCompactionStart, entryState.latestEndSeedSeq, 'compaction')

  // `deferStart` splits the expensive half (summarize) from the durable half
  // (the bracket). Without it the bracket opens at prepare time, which forces
  // the async lane to wait for an idle session: `owner: null` refuses to open
  // while a turn is running. With it the summarizer can run WHILE the turn
  // continues and the bracket is written only at commit, microseconds wide.
  const deferStart = options.deferStart === true
  let owner
  if (deferStart) {
    // Resolved at commit: a turn-scoped bracket if a turn is open then, a
    // maintenance bracket otherwise.
    owner = entryState.openTurn
  } else if (options.owner === null) {
    if (entryState.openTurn !== null) {
      throw new ManualCompactionError('busy', 'manual compaction: the session already has an open turn')
    }
    owner = null
  } else {
    if (entryState.openTurn === null) {
      throw new Error('compactRegion: no open turn — automatic compaction events must be enclosed in a turn')
    }
    owner = entryState.openTurn
  }

  const compactionId = CompactionId(randomUUID())
  const lifecycle = {
    compactionId,
    ...(options.sourceCommandId === undefined ? {} : { sourceCommandId: options.sourceCommandId }),
    turn: owner,
  }
  let startEvent = deferStart ? undefined : session.append('compaction/start', lifecycle)

  /**
   * Open the bracket (deferred mode) or return the one opened at prepare.
   * Re-checks the one-active gate because time has passed since prepare.
   */
  const openBracket = () => {
    if (startEvent !== undefined) return startEvent
    const state = inspectCompactionEntryState(session)
    assertCompactionInactive(state.unmatchedCompactionStart, state.latestEndSeedSeq, 'compaction')
    startEvent = session.append('compaction/start', { ...lifecycle, turn: state.openTurn })
    return startEvent
  }
  const assertStable = options.stability === 'whole-surface'
    ? assertWholeSurfaceUnchanged
    : assertSelectedSpanStable

  return {
    compactionId,
    lifecycle,
    startEvent,
    /** Whether the durable bracket has actually been written yet. */
    get opened() { return startEvent !== undefined },
    assertStable,
    prepared: () => prepareCompaction(dependencies, session, selection),
    summarize: async (prepared, signal) =>
      summarizeCompaction(dependencies, prepared, agent, compactionId, options.sourceCommandId, assertStable, signal),
    commit: (summarized, signal) => {
      try {
        signal?.throwIfAborted()
        assertStable(dependencies, session, summarized)
        const opened = openBracket()
        const pending = commitCompactionBody(session, opened, summarized)
        const endEvent = session.append('compaction/end', { ...lifecycle, turn: opened.data.turn })
        return { result: completeCompaction(pending, endEvent), failure: undefined }
      } catch (error) {
        let closed = false
        // A deferred bracket that never opened has nothing to close: appending
        // an unmatched end would corrupt the one-active gate.
        if (startEvent !== undefined) {
          try {
            session.append('compaction/end', { ...lifecycle, turn: startEvent.data.turn, error: errorChain(error) })
            closed = true
          } catch (closeError) {
            return { result: undefined, failure: { error: closeError, stage: 'commit' } }
          }
        }
        return { result: undefined, failure: { error, stage: 'commit' }, closed }
      }
    },
    fail: (error, stage) => {
      if (startEvent === undefined) return
      try {
        session.append('compaction/end', { ...lifecycle, turn: startEvent.data.turn, error: errorChain(error) })
      } catch (closeError) {
        return { error: closeError, stage: 'commit' }
      }
      return { error, stage }
    },
  }
}

/**
 * Full single-episode compaction (manual `compactNow` / synchronous FULL).
 * Mirrors region.ts compactSurfaceRegion with the prepare/commit split above;
 * the two phases run back-to-back inside one call.
 */
export async function compactSurfaceRegion(
  dependencies, session, start, end, agent, options, signal,
) {
  if (options.owner === null) signal?.throwIfAborted()
  const tx = prepareCompactionTransaction(dependencies, session, start, end, options, agent)
  let failure
  let result
  let summarized
  try {
    const prepared = tx.prepared()
    summarized = await tx.summarize(prepared, signal)
  } catch (error) {
    failure = tx.fail(error, 'summary')
  }
  if (failure === undefined) {
    if (options.owner === null) signal?.throwIfAborted()
    const outcome = tx.commit(summarized, signal)
    result = outcome.result
    failure = outcome.failure
  }

  if (options.flush !== undefined && (result !== undefined || failure?.closed === true)) {
    try {
      await options.flush()
    } catch (error) {
      if (options.owner === null) {
        throw new ManualCompactionError(
          'persistence',
          'manual compaction durability checkpoint failed',
          { cause: error },
        )
      }
      throw error
    }
  }

  if (options.owner === null) signal?.throwIfAborted()
  if (failure !== undefined) {
    if (options.owner === null) throwManualFailure(failure)
    throw failure.error
  }
  if (result === undefined) throw new Error('compaction committed without a result')
  return result
}

function throwManualFailure(failure) {
  if (failure.stage === 'commit') {
    throw new ManualCompactionError('commit', 'manual compaction did not commit cleanly', { cause: failure.error })
  }
  if (failure.error instanceof SurfaceChangedError) {
    throw new ManualCompactionError('changed', 'the compacted history changed during manual compaction', { cause: failure.error })
  }
  throw new ManualCompactionError('summary', 'manual compaction could not produce a smaller summary', { cause: failure.error })
}
