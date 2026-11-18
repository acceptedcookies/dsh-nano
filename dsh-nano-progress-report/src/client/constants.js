/** Shared constants for the Progress view. */

export const TARGET = 'progress'
export const TAB_KIND = 'progress'
export const TAB_ID = 'dsh-nano-progress-report.workbench'
export const ROOT_ATTR = 'nano-progress-report'

/** Row type taxonomy (filter `type:` values). */
export const TYPES = Object.freeze([
  'prompt', 'message', 'shell', 'file', 'web', 'tool',
  'todo', 'subagent', 'wait', 'turn', 'job', 'lifecycle',
])

/** Row status vocabulary (filter `status:` values). */
export const STATUSES = Object.freeze(['ok', 'failed', 'running', 'awaiting'])

const SHELL_TOOLS = new Set(['bash', 'pwsh', 'terminal'])
const FILE_TOOLS = new Set(['read', 'write', 'edit', 'glob', 'grep', 'working_directory'])
const WEB_TOOLS = new Set(['web_fetch', 'web_search'])
const SUBAGENT_TOOLS = new Set(['subagent', 'subagent_fork'])
const WAIT_TOOLS = new Set(['wait_agent', 'send_message', 'ask_user_question'])

/** Map a wire tool name to a progress row type. Unknown tools stay 'tool'. */
export function rowTypeOfTool(name) {
  if (SUBAGENT_TOOLS.has(name)) return 'subagent'
  if (SHELL_TOOLS.has(name)) return 'shell'
  if (FILE_TOOLS.has(name)) return 'file'
  if (WEB_TOOLS.has(name)) return 'web'
  if (WAIT_TOOLS.has(name)) return 'wait'
  if (name === 'todo_write') return 'todo'
  return 'tool'
}

/** Awaiting-style rows: an agent turn paused on input or approval. */
export function isWaitTool(name) {
  return WAIT_TOOLS.has(name)
}
