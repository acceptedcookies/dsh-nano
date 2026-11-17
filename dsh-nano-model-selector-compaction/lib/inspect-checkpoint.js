/**
 * `inspect_checkpoint` — the first model-facing tool of the workspace
 * (ACE-1117 -04③/-09).
 *
 * Read-only. Session-local. Stateless: every answer is derived from the
 * session journal's own `sourceEventSeqs` recorded at commit time
 * (compact-region.js commitCompactionBody) — no index, no copy, no durable
 * state. OFF state removes the whole row, so the tool can never outlive the
 * takeover that minted the checkpoints it reads.
 *
 * Registration is a literal ToolDefinition rather than defineTool(...): the
 * profile tree does not necessarily resolve @deepseek-ai/dsh-tools from a
 * plugin row's module domain, and the registration contract is the resulting
 * definition object — parameters JSON schema, output schema/render,
 * isConcurrencySafe, execute — which this file owns completely.
 */

import { isCompactCheckpointSource } from './compaction-seam.js'

/** -09② tool name — also the literal name the checkpoint frame advertises. */
export const INSPECT_TOOL_NAME = 'inspect_checkpoint'

/** -09⑤ single-entry truncation cap (chars); the entry keeps its true length. */
const ENTRY_MAX_CHARS = 2000
/** -09⑤ total page cap (chars); beyond it the page stops and reports nextOffset. */
const PAGE_MAX_CHARS = 24000
/** -09④ pagination: limit defaults to 20 and may never exceed 50. */
const LIMIT_MAX = 50
const LIMIT_DEFAULT = 20

/** True when the surface node seq points at a checkpoint user/message. */
function checkpointEventAt(session, seq) {
  let event
  try {
    event = session.eventAt(seq)
  } catch {
    return undefined
  }
  if (event?.type !== 'user/message') return undefined
  const source = event.data?.source
  return typeof source === 'object' && source !== null && isCompactCheckpointSource(source) ? event : undefined
}

/**
 * -09③ exposure rule: the tool is declared to the model only while the current
 * surface actually holds a checkpoint carrying the compact-checkpoint marker.
 * Checkpoints written before this seam existed have no marker, so they never
 * advertise themselves (unlisted, never readable through this tool).
 */
export function sessionHasCheckpoint(session) {
  try {
    return session.surface.nodes.some(seq => checkpointEventAt(session, seq) !== undefined)
  } catch {
    return false
  }
}

/** All compactionIds the model may name on this session, in surface order. */
function surfaceCheckpointIds(session) {
  const ids = []
  for (const seq of session.surface.nodes) {
    const event = checkpointEventAt(session, seq)
    if (event !== undefined) ids.push(event.data.source.compactionId)
  }
  return ids
}

/**
 * Shadowed source events of one checkpoint, excluding the durable bracket.
 * `sourceEventSeqs` = [compaction/start seq, compaction/summary seq, ...shadowed
 * surface seqs]; the tool reads by TYPE, not position, so a journal layout that
 * grows extra bracket entries cannot leak bookkeeping into the model's page.
 */
function sourceEntries(session, checkpointEvent) {
  const seqs = Array.isArray(checkpointEvent.sourceEventSeqs) ? checkpointEvent.sourceEventSeqs : []
  return seqs
    .map(seq => {
      try {
        return session.eventAt(seq)
      } catch {
        return undefined
      }
    })
    .filter(event => event !== undefined
      && event.type !== 'compaction/start'
      && event.type !== 'compaction/summary')
}

/** Render one event to plain text via the session's own projection. */
function eventText(session, event) {
  if (event.type === 'compaction/end') return `[compaction ${event.data?.error === undefined ? 'completed' : 'failed'}]`
  const message = session.deriveEventMessage(event)
  if (message === null || message === undefined) return `[${event.type}]`
  const parts = []
  for (const block of message.content ?? []) {
    if (block.type === 'text') parts.push(block.text)
    else if (block.type === 'tool-call') parts.push(`[tool-call ${block.name ?? ''} ${block.arguments ?? ''}]`)
    else if (block.type === 'tool-result') parts.push(`[tool-result ${typeof block.content === 'string' ? block.content : JSON.stringify(block.content ?? '')}]`)
  }
  return parts.length === 0 ? `[${message.role ?? event.type}]` : parts.join('\n')
}

function fail(message) {
  const error = new Error(message)
  error.name = 'InspectCheckpointError'
  return error
}

/**
 * The registered definition. `parameters` is the projected JSON schema the
 * executor validates against; execute re-checks the two numeric bounds and the
 * required string so a hand-dispatched call cannot bypass them.
 */
export const INSPECT_CHECKPOINT_DEFINITION = Object.freeze({
  name: INSPECT_TOOL_NAME,
  description:
    'Read the original conversation content that one compaction checkpoint replaced. ' +
    'Pass the compactionId shown in the checkpoint header. Read-only, this session only.',
  parameters: {
    type: 'object',
    properties: {
      compactionId: { type: 'string', description: 'Checkpoint id shown in the checkpoint frame (required).' },
      offset: { type: 'integer', description: 'Entry index to start from (default 0).' },
      limit: { type: 'integer', description: `Entries per page, 1-${LIMIT_MAX} (default ${LIMIT_DEFAULT}).` },
    },
    required: ['compactionId'],
    additionalProperties: false,
  },
  output: {
    schema: { type: 'string' },
    render: (_args, value) => [{ type: 'text', text: value }],
  },
  isConcurrencySafe: () => true,
  async execute(args, exec) {
    const session = exec.agent?.session
    if (session === undefined) {
      throw fail('inspect_checkpoint: no session context for this call')
    }
    const { compactionId } = args
    if (typeof compactionId !== 'string' || compactionId.length === 0) {
      throw fail(`inspect_checkpoint: compactionId is required, got ${JSON.stringify(args.compactionId)}`)
    }
    const offset = args.offset ?? 0
    const limit = args.limit ?? LIMIT_DEFAULT
    if (typeof offset !== 'number' || !Number.isInteger(offset) || offset < 0) {
      throw fail(`inspect_checkpoint: offset must be an integer >= 0, got ${JSON.stringify(args.offset)}`)
    }
    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > LIMIT_MAX) {
      throw fail(`inspect_checkpoint: limit must be an integer 1-${LIMIT_MAX}, got ${JSON.stringify(args.limit)}`)
    }
    const checkpoint = session.surface.nodes
      .map(seq => checkpointEventAt(session, seq))
      .find(event => event !== undefined && event.data.source.compactionId === compactionId)
    if (checkpoint === undefined) {
      const available = surfaceCheckpointIds(session)
      throw fail(
        `inspect_checkpoint: no checkpoint '${compactionId}' on this session's surface. `
        + (available.length === 0
          ? 'No checkpoints are available here.'
          : `Available: ${available.join(', ')}`),
      )
    }
    const entries = sourceEntries(session, checkpoint)
    const total = entries.length
    const page = entries.slice(offset, offset + limit)
    const lines = [
      `compactionId: ${compactionId}`,
      `total: ${total}`,
      `entries: ${total === 0 ? 0 : Math.min(offset, total)}-${Math.min(offset + page.length, total)}`,
    ]
    let used = lines.join('\n').length + 1
    let included = 0
    for (const event of page) {
      let text = eventText(session, event)
      const original = text.length
      if (original > ENTRY_MAX_CHARS) {
        text = `${text.slice(0, ENTRY_MAX_CHARS)}\n[…truncated, ${original} chars total]`
      }
      const block = `--- seq ${event.seq} [${event.type}] (${original} chars) ---\n${text}\n`
      if (used + block.length > PAGE_MAX_CHARS && included > 0) break
      used += block.length
      lines.push(block.trimEnd())
      included += 1
    }
    const consumed = offset + included
    lines.push(`nextOffset: ${consumed < total ? consumed : 'null'}`)
    return lines.join('\n')
  },
})

/**
 * Mount point for the `./tools` subpath row (-09①). The row lives at preset
 * top level — outside the id:compaction isolate — so `ctx.tools` is a plain
 * inject. `when` re-checks the surface at every step: the tool is never
 * advertised while no checkpoint is visible.
 */
export function apply(ctx) {
  ctx.tools.register(INSPECT_CHECKPOINT_DEFINITION, {
    when: ({ agent }) => sessionHasCheckpoint(agent.session),
  })
}

export const name = 'inspect-checkpoint'
export const inject = ['tools']
export default apply
