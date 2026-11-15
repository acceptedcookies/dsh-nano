// Baked binding table — CF1115 web-registrar declaration for dsh-nano-terminal.
// Ledger rows only (no handlers). Replaces lib/route-table.js: the same rows
// carry the channel/match axis the registrar dispatches on.
export const PLUGIN = 'dsh-nano-terminal'
export const BINDING_TABLE = [
  { id: 'dnt.mcp',           plugin: PLUGIN, channel: 'http',    match: 'exact',  path: '/dsh-nano-terminal/mcp',      methods: ['POST'], bodyLimit: 524288, sensitivity: 'L2', capability: 'proc:terminal', sessionBinding: true,  justification: 'mcp' },
  { id: 'dnt.sessions',      plugin: PLUGIN, channel: 'http',    match: 'exact',  path: '/dsh-nano-terminal/sessions', methods: ['GET'],  bodyLimit: 0,      sensitivity: 'L1', capability: 'read:host',     sessionBinding: true,  justification: 'sessions' },
  { id: 'dnt.events',        plugin: PLUGIN, channel: 'http',    match: 'exact',  path: '/dsh-nano-terminal/events',   methods: ['GET'],  bodyLimit: 0,      sensitivity: 'L1', capability: 'read:host',     sessionBinding: true,  justification: 'events' },
  { id: 'dnt.health',        plugin: PLUGIN, channel: 'http',    match: 'exact',  path: '/dsh-nano-terminal/health',   methods: ['GET'],  bodyLimit: 0,      sensitivity: 'L0', capability: 'read:host',     sessionBinding: false, justification: 'health' },
  { id: 'dnt.session.close', plugin: PLUGIN, channel: 'http',    match: 'prefix', path: '/dsh-nano-terminal/session',  methods: ['POST'], bodyLimit: 0,      sensitivity: 'L2', capability: 'proc:terminal', sessionBinding: true,  justification: 'session close' },
  { id: 'dnt.stream',        plugin: PLUGIN, channel: 'upgrade', match: 'exact',  path: '/dsh-nano-terminal/stream',   methods: ['GET'],  bodyLimit: 0,      sensitivity: 'L2', capability: 'proc:terminal', sessionBinding: true,  justification: 'ws data plane' },
]
