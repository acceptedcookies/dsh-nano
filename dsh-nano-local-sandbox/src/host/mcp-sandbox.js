/** Q7's twenty sandbox tools. tools/list is this array and nothing else. */
export const SANDBOX_TOOL_NAMES = Object.freeze([
  'sandbox.profile.list',
  'sandbox.profile.describe',
  'sandbox.instance.ensure',
  'sandbox.instance.start',
  'sandbox.instance.stop',
  'sandbox.instance.restart',
  'sandbox.instance.status',
  'sandbox.diagnostics',
  'sandbox.console',
  'sandbox.operations',
  'sandbox.error_catalog',
  'sandbox.targets',
  'sandbox.history',
  'sandbox.dom',
  'sandbox.elements',
  'sandbox.selftest',
  'sandbox.network',
  'sandbox.ports',
  'sandbox.recovery_plan',
  'sandbox.bridge_health',
])

export function toolsList() {
  return SANDBOX_TOOL_NAMES.map((name) => ({
    name,
    description: name,
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  }))
}

/**
 * Reads the in-process registry. There is no host-snapshot POST counter.
 */
export function answerNativeTool(name, state) {
  if (!SANDBOX_TOOL_NAMES.includes(name)) return { ok: false, errorId: 'kitesurf.tool.unknown' }
  return { ok: true, name, diagnostics: state.diagnostics ?? null, pushes: state.pushes ?? 0 }
}
