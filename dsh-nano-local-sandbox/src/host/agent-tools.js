/**
 * T-O-64 / R-11 — the session agent's managed entry: four model tools.
 *
 * These are NOT a second object executor. Each tool call is projected onto
 * the SAME capability owner + dispatcher that HTTP and /mcp feed
 * (`owner.execute`), stamped `via: 'tool'` so the dispatcher can tell it
 * apart from the pane's own HTTP entry:
 *
 *   sandbox.list           → sandbox.list       (fleet projection, read)
 *   sandbox.status         → dnls.diagnostics   (phase, relay cdp, navigation, hints)
 *   sandbox.open           → dnls.open          (counts as a write; humanHold gate)
 *   sandbox.control.status → dnls.control       (GET — humanHold + relay only)
 *
 * The caller's principal is never inferred from tool args: `peerFor(exec)`
 * is supplied by the composition layer (index.js), mapping this host
 * session's agent call to the owner principal. No session → pre-dispatch
 * refusal. Object tools require an explicit `sandboxId`; results pass the
 * dispatcher's own redaction before reaching the model.
 */

import { CONTRACT_VERSION } from './control-contract.js'
import { redact } from './object-pages.js'

// Same single-segment rule the dispatcher applies to HTTP/MCP selectors.
const SAFE_SEGMENT = /^[^\x00-\x1f\x7f\s\\/?#&=%]{1,64}$/
const safeSegment = (value) => typeof value === 'string' && SAFE_SEGMENT.test(value) && value !== '.' && value !== '..'

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/** capability → { tool name, read-only, narrow result projection } */
const AGENT_TOOLS = [
  {
    capability: 'sandbox.list',
    read: true,
    present: () => '列出可见沙箱对象',
  },
  {
    capability: 'dnls.diagnostics',
    read: true,
    present: args => `读取沙箱状态 ${args?.sandboxId ?? ''}`.trimEnd(),
    // Contract surface: phase, relay address `cdp`, navigation, hints — the
    // diagnostics document carries them; lift both from the lifecycle row.
    project(body) {
      return {
        phase: body?.lifecycle?.phase ?? body?.phase ?? null,
        cdp: body?.lifecycle?.cdp ?? null,
        navigation: body?.navigation ?? null,
        hints: Array.isArray(body?.hints) ? body.hints : [],
      }
    },
  },
  {
    capability: 'dnls.open',
    read: false,
    present: args => `打开 ${args?.url ?? ''}`.trimEnd(),
  },
  {
    capability: 'dnls.control',
    read: true,
    present: args => `读取接管状态 ${args?.sandboxId ?? ''}`.trimEnd(),
    // Two-slot read: humanHold + relay — nothing else of the control doc.
    project(body) {
      return { humanHold: body?.control?.humanHold ?? null, relay: body?.control?.relay ?? null }
    },
  },
]

/** Pre-dispatch refusal in the same envelope a dispatcher answer carries. */
function refusal(status, errorId) {
  return { status, payload: { ok: false, ...(typeof errorId === 'string' ? { errorId } : {}) } }
}

/** status/body outcomes pass through; plain objects are a 200 payload. */
function outcomeOf(result) {
  if (!isPlainObject(result)) return null
  if ('status' in result || 'body' in result) {
    if (!isPlainObject(result.body)) return null
    return { status: Number.isInteger(result.status) ? result.status : 200, payload: result.body }
  }
  return { status: 200, payload: result }
}

/**
 * Build the four tool definitions.
 * `owner` is the environment owner ({capabilities, execute});
 * `peerFor(exec)` is the composition adapter exec → admission peer (null → refuse).
 */
export function makeAgentToolDefinitions({ owner, peerFor }) {
  if (typeof owner?.execute !== 'function' || !(owner.capabilities instanceof Map)) {
    throw new Error('agent tools require the managed owner ({capabilities, execute})')
  }
  if (typeof peerFor !== 'function') throw new Error('agent tools require a composition peerFor adapter')
  return AGENT_TOOLS.map(({ capability, read, present, project }) => {
    const def = owner.capabilities.get(capability)
    // A capability the provider filtered out is not advertised — same as /mcp.
    if (!def?.tool?.name) return null
    const tool = def.tool
    const objectTool = def.target === 'object'
    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
      output: {
        schema: { type: 'object' },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      },
      isConcurrencySafe: () => read === true,
      presentCall: present,
      presentResult: () => '沙箱结果',
      async execute(args, exec) {
        const params = isPlainObject(args) ? args : {}
        const peer = peerFor(exec)
        // Explicit single-object selector: never inferred, never absent —
        // exactly the dispatcher's own selector rule.
        let answer
        if (peer === null || peer === undefined) {
          answer = refusal(401, 'sandbox.params.session')
        } else if (objectTool && !safeSegment(params.sandboxId)) {
          answer = refusal(400, 'sandbox.params.sandboxId')
        } else {
          try {
            answer = outcomeOf(await owner.execute({
              capability,
              sandboxId: objectTool ? params.sandboxId : null,
              peer,
              req: null,
              args: params,
              via: 'tool',
            }))
          } catch (error) {
            answer = refusal(Number.isInteger(error?.status) ? error.status : 502,
              typeof error?.errorId === 'string' ? error.errorId : null)
          }
        }
        if (answer === null || answer === undefined) answer = refusal(502, null)
        let body = answer.payload
        // Success bodies get the narrow projection the agent contract
        // promises; failure bodies pass through unchanged (same status +
        // errorId envelope the dispatcher produced). The projection narrows
        // fields but never drops the dispatch verdict — ok:true survives.
        if (answer.status < 400 && body.ok !== false && typeof project === 'function') {
          body = { ok: body.ok ?? true, ...project(body) }
        }
        return redact({ status: answer.status, contractVersion: CONTRACT_VERSION, ...body })
      },
    }
  }).filter(Boolean)
}

/** Names of the four agent tools for tests and reports. */
export function agentToolNames(definitions) {
  return definitions.map((definition) => definition.name)
}
