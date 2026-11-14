export const PLUGIN = 'dsh-nano-terminal'
export const ROUTE_TABLE = [
  { path: '/dsh-nano-terminal/mcp', methods: ['POST'], sensitivity: 'L2', capability: 'proc:terminal', bodyLimit: 524288, sessionBinding: true, justification: 'mcp' },
  { path: '/dsh-nano-terminal/sessions', methods: ['GET'], sensitivity: 'L1', capability: 'read:host', bodyLimit: 0, sessionBinding: true, justification: 'sessions' },
  { path: '/dsh-nano-terminal/events', methods: ['GET'], sensitivity: 'L1', capability: 'read:host', bodyLimit: 0, sessionBinding: true, justification: 'events' },
  { path: '/dsh-nano-terminal/health', methods: ['GET'], sensitivity: 'L0', capability: 'read:host', bodyLimit: 0, sessionBinding: false, justification: 'health' },
  { path: '/dsh-nano-terminal/session', methods: ['POST'], sensitivity: 'L2', capability: 'proc:terminal', bodyLimit: 0, sessionBinding: true, justification: 'session close' },
]
